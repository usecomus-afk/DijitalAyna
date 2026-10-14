import { db } from '../db';
import { METRIC_DEFINITIONS, MetricKey } from '../types/sensor';
import { EvidenceItem, Insight, PredictiveAlert } from '../types/engine';
import { detectAnomaliesForDay } from './anomaly';
import { synthesizeBiomarkers } from './biomarkers';
import { evaluatePredictivePatterns } from './prediction';
import { checkAndTriggerCrisisIfNeeded, checkVulnerableWindowForShield } from '../safety/crisisDetector';
import { notificationService } from '../services/notificationService';
import { calculateRecentMoodScore, calculateEmotionalBalanceIndex } from './avatarNarrative';
import { ClinicalPhenotypeClassifier } from '../classifier/ClinicalPhenotypeClassifier';
import { resolveDailyState, applyDailyStateToInsight } from './dailyState';
import { PHENOTYPE_RULES } from '../classifier/phenotypeRules.config';

/**
 * Upserts a daily insight record by primary date (YYYY-MM-DD), preserving historical records.
 */
export async function saveDailyInsight(
  date: string,
  insightData: Partial<Insight>
): Promise<number> {
  const existing = await db.insights.where('date').equals(date).first();
  if (existing && existing.id) {
    await db.insights.update(existing.id, {
      ...insightData,
      date,
      provisional: insightData.provisional ?? existing.provisional ?? true,
      finalized: insightData.finalized ?? existing.finalized ?? false,
    });
    return existing.id;
  } else {
    const newId = await db.insights.add({
      createdAt: Date.now(),
      date,
      severity: insightData.severity || 'low',
      biomarkerType: insightData.biomarkerType || 'healthy_balance',
      title: insightData.title || '',
      body: insightData.body || '',
      suggestedAction: insightData.suggestedAction || '',
      evidence: insightData.evidence || [],
      dismissed: false,
      provisional: insightData.provisional ?? true,
      finalized: insightData.finalized ?? false,
      ...insightData,
    });
    return newId;
  }
}

/**
 * Main Insight and Alert Generation Pipeline.
 * STRICT: Preserves historical records, does NOT call db.insights.clear().
 * Supports provisional (daytime) and finalized (day-closing) lifecycle states.
 */
export async function generateInsightsAndAlerts(isFinalized = false): Promise<{
  insights: Insight[];
  alerts: PredictiveAlert[];
}> {
  // 1. Get latest date in the database
  const latestMetric = await db.dailyMetrics.orderBy('date').last();
  if (!latestMetric) {
    return { insights: [], alerts: [] };
  }
  const latestDate = latestMetric.date;
  let sampleDays = 0;
  try {
    const metrics = await db.dailyMetrics.toArray();
    const distinctDates = new Set(metrics.map(m => m.date));
    sampleDays = distinctDates.size;
  } catch {}
  const isLearning = sampleDays < 14;

  // 2. Detect anomalies for the latest date & evaluate longitudinal 9 clinical conditions
  const anomalies = await detectAnomaliesForDay(latestDate);
  const biomarkers = synthesizeBiomarkers(anomalies);
  const alerts = evaluatePredictivePatterns(anomalies);

  let allMetrics: any[] = [];
  let allBaselines: any[] = [];
  let recentMoods: any[] = [];
  try {
    allMetrics = await db.dailyMetrics.toArray();
  } catch {}
  try {
    allBaselines = await db.baselines.toArray();
  } catch {}
  try {
    recentMoods = await db.moodReports.orderBy('date').reverse().limit(5).toArray();
  } catch {}

  const longitudinalClinicalAlerts = ClinicalPhenotypeClassifier.evaluateLongitudinalClinicalAlerts(
    allMetrics,
    allBaselines,
    recentMoods
  );

  // 3. Automated crisis evaluation connected to daily aggregation & recent EMA mood reports
  try {
    if (!isLearning) {
      checkAndTriggerCrisisIfNeeded(anomalies, recentMoods);
      checkVulnerableWindowForShield(anomalies);
    }
  } catch {
    // Graceful fallback in environments where moodReports may be empty
  }

  // 4. Prepare evidence history for each metric (last 7-14 days)
  async function buildEvidence(metricKey: MetricKey): Promise<EvidenceItem | null> {
    const def = METRIC_DEFINITIONS[metricKey];
    if (!def) return null;

    const base = await db.baselines.get(metricKey);
    const historyData = await db.dailyMetrics
      .where('metricKey')
      .equals(metricKey)
      .sortBy('date');

    const recentHistory = historyData.slice(-14);
    if (recentHistory.length === 0 || !base) return null;

    const currentVal = recentHistory[recentHistory.length - 1].value;
    const baseVal = base.ewmaMean;
    const changePercent = baseVal !== 0 ? Math.round(((currentVal - baseVal) / baseVal) * 100) : 0;
    const anom = anomalies.find(a => a.metricKey === metricKey);

    return {
      metricKey,
      metricLabel: def.label,
      unit: def.unit,
      currentValue: currentVal,
      baselineValue: baseVal,
      changePercent,
      zScore: anom?.zScore || 0,
      history: recentHistory.map(h => ({
        date: h.date.slice(5), // MM-DD
        value: h.value,
        baseline: baseVal,
      })),
    };
  }

  const generatedInsights: Insight[] = [];
  const addedBiomarkerTypes = new Set<string>();

  const BIOMARKER_TO_RULE_KEY: Record<string, string> = {
    emotional_burnout: 'burnout',
    social_withdrawal: 'depressionIsolation',
    circadian_disruption: 'anxietySleep',
    gaming_avoidance: 'gamingAvoidance',
    appearance_sensitivity: 'appearanceSensitivityCamera',
  };

  // Helper to build a real-telemetry summary string for latestDate
  const todaysRealMetrics = allMetrics.filter(
    (m) => m.date === latestDate && m.metricKey !== 'gaming_duration' && m.metricKey !== 'camera_interaction_count'
  );
  const formatRealSnapshotSummary = (): string => {
    if (todaysRealMetrics.length === 0) return '';
    const priorityKeys: MetricKey[] = [
      'screen_on_time',
      'session_duration',
      'touch_interaction_frequency',
      'typing_wpm',
      'mobility_index',
      'night_usage_minutes',
      'cognitive_fatigue_score',
      'impulse_risk_index',
      'battery_level',
    ];
    const items: string[] = [];
    for (const k of priorityKeys) {
      const m = todaysRealMetrics.find((x) => x.metricKey === k);
      const def = METRIC_DEFINITIONS[k];
      if (m && def) {
        items.push(`${def.label}: ${m.value} ${def.unit}`);
      }
      if (items.length >= 4) break;
    }
    if (items.length === 0) {
      for (const m of todaysRealMetrics.slice(0, 3)) {
        const def = METRIC_DEFINITIONS[m.metricKey as MetricKey];
        if (def) items.push(`${def.label}: ${m.value} ${def.unit}`);
      }
    }
    return items.length > 0
      ? ` Gerçek Cihaz Ölçümleri (${todaysRealMetrics.length} aktif gösterge): ${items.join(' • ')}.`
      : '';
  };

  // First, include any longitudinal multi-day critical threshold alerts (9 Clinical Conditions)
  for (const clinAlert of longitudinalClinicalAlerts) {
    const ruleKey = Object.keys(PHENOTYPE_RULES).find(k => PHENOTYPE_RULES[k].id === clinAlert.id);
    const rule = ruleKey ? PHENOTYPE_RULES[ruleKey] : null;
    const validMetrics = rule
      ? [...rule.requiredMetrics, ...rule.requiredZMetrics].filter(m => METRIC_DEFINITIONS[m as MetricKey])
      : [];
    const evidencePromises = validMetrics.map(metric => buildEvidence(metric as MetricKey));
    const resolvedEvidence = await Promise.all(evidencePromises);
    const evidenceList = resolvedEvidence.filter(Boolean) as EvidenceItem[];

    generatedInsights.push({
      createdAt: Date.now(),
      date: latestDate,
      severity: clinAlert.severity,
      biomarkerType: clinAlert.id,
      badgeLabel: `Kritik Eşik • ${clinAlert.consecutiveDays || clinAlert.requiredDays || 3} Gün`,
      title: clinAlert.potentialStateLabel || `Potansiyel ${clinAlert.title} Olasılığı`,
      body: `${clinAlert.personalizedDeviationStatement}${clinAlert.statisticalSummary ? ` (${clinAlert.statisticalSummary})` : ''}`,
      suggestedAction: clinAlert.ethicalDisclaimer,
      evidence: evidenceList,
      dismissed: false,
      provisional: !isFinalized,
      finalized: isFinalized,
    });
    addedBiomarkerTypes.add(clinAlert.id);
    if (ruleKey) addedBiomarkerTypes.add(ruleKey);

    // Send early awareness notification for critical threshold
    notificationService.sendClinicalEarlyAwarenessAlert(clinAlert).catch(() => {});
  }

  for (const bio of biomarkers) {
    const mappedRuleKey =
      BIOMARKER_TO_RULE_KEY[bio.type] ||
      Object.keys(PHENOTYPE_RULES).find(
        (k) => PHENOTYPE_RULES[k].id === bio.type || PHENOTYPE_RULES[k].insightType === bio.type || k === bio.type
      );

    if (addedBiomarkerTypes.has(bio.type) || (mappedRuleKey && addedBiomarkerTypes.has(mappedRuleKey))) {
      continue;
    }

    if (bio.type === 'healthy_balance') {
      if (generatedInsights.length > 0) continue; // Do not add healthy_balance if a clinical alert is active
      const candidateEvidenceKeys: MetricKey[] = [
        'mobility_index',
        'typing_wpm',
        'screen_on_time',
        'session_duration',
        'touch_interaction_frequency',
        'cognitive_fatigue_score',
      ];
      const evResults = await Promise.all(candidateEvidenceKeys.map((k) => buildEvidence(k)));
      const evidenceList = evResults.filter(Boolean).slice(0, 4) as EvidenceItem[];
      const realSnap = formatRealSnapshotSummary();

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'low',
        biomarkerType: 'healthy_balance',
        title: isLearning ? `Kişisel Baz Hattı Oluşturuluyor (${sampleDays}/14 Gün)` : 'Dengeli ve Kararlı Davranışsal Ritim',
        body: isLearning
          ? `Cihaz kullanım ritminiz ve biyobelirteçleriniz kaydediliyor (${sampleDays}/14 gün).${realSnap} 14 günlük stabil baz hattınız tamamlandığında sapma analizleri derinleşecektir.`
          : `Yazım akıcılığın, hareketlilik seviyen ve oturum düzenin kişisel EWMA baz hattınla uyumlu ve dengeli seyrediyor.${realSnap}`,
        suggestedAction: isLearning
          ? 'Cihazınızı her zamanki gibi doğal akışında kullanmaya devam edebilirsiniz.'
          : 'Bu dingin ve sürdürülebilir ritmini korumak için günün keyfini çıkarabilirsin.',
        evidence: evidenceList,
        dismissed: false,
        provisional: !isFinalized,
        finalized: isFinalized,
      });
    } else {
      const rule = mappedRuleKey ? PHENOTYPE_RULES[mappedRuleKey] : null;

      if (rule) {
        const triggerKeys = (bio.triggerAnomalies || []).map((a) => a.metricKey);
        const ruleKeys = [...rule.requiredMetrics, ...rule.requiredZMetrics].filter(
          (m) => METRIC_DEFINITIONS[m as MetricKey]
        ) as MetricKey[];
        const uniqueMetricKeys = Array.from(new Set<MetricKey>([...triggerKeys, ...ruleKeys]));
        const evidencePromises = uniqueMetricKeys.map((metric) => buildEvidence(metric));
        const resolvedEvidence = await Promise.all(evidencePromises);
        const evidenceList = resolvedEvidence.filter(Boolean) as EvidenceItem[];

        const triggerStatParts = evidenceList.map((ev) => {
          const sign = ev.changePercent > 0 ? '+' : '';
          const zSign = ev.zScore > 0 ? '+' : '';
          return `${ev.metricLabel}: ${ev.currentValue} ${ev.unit} (Baz: ${ev.baselineValue} ${ev.unit}, ${sign}${ev.changePercent}%, Z=${zSign}${ev.zScore}σ)`;
        });
        const realEvidenceSuffix =
          triggerStatParts.length > 0 ? ` Gerçek Ölçüm Kanıtı: ${triggerStatParts.join(' • ')}.` : '';

        generatedInsights.push({
          createdAt: Date.now(),
          date: latestDate,
          severity: rule.severity,
          biomarkerType: rule.id,
          title: `Potansiyel ${rule.title} Olasılığı`,
          body: `${rule.personalizedDeviationStatement}${realEvidenceSuffix}`,
          suggestedAction: rule.ethicalDisclaimer,
          evidence: evidenceList,
          dismissed: false,
          provisional: !isFinalized,
          finalized: isFinalized,
        });
        addedBiomarkerTypes.add(rule.id);
        if (mappedRuleKey) addedBiomarkerTypes.add(mappedRuleKey);
      }
    }
  }

  if (generatedInsights.length === 0) {
    const candidateEvidenceKeys: MetricKey[] = [
      'mobility_index',
      'typing_wpm',
      'screen_on_time',
      'session_duration',
      'touch_interaction_frequency',
      'cognitive_fatigue_score',
    ];
    const evResults = await Promise.all(candidateEvidenceKeys.map((k) => buildEvidence(k)));
    const evidenceList = evResults.filter(Boolean).slice(0, 4) as EvidenceItem[];
    const realSnap = formatRealSnapshotSummary();

    generatedInsights.push({
      createdAt: Date.now(),
      date: latestDate,
      severity: 'low',
      biomarkerType: 'healthy_balance',
      title: isLearning ? `Kişisel Baz Hattı Oluşturuluyor (${sampleDays}/14 Gün)` : 'Kişisel Baz Hattı ve Günlük Değerlendirme',
      body: isLearning
        ? `Cihaz kullanım ritminiz ve biyobelirteçleriniz kaydediliyor (${sampleDays}/14 gün).${realSnap} 14 günlük stabil baz hattınız tamamlandığında sapma analizleri derinleşecektir.`
        : `Cihaz içi etkileşimleriniz, yazım akıcılığınız ve sirkadiyen oturum ritminiz incelendi. Belirgin bir kritik eşik sapması tespit edilmedi.${realSnap}`,
      suggestedAction: isLearning
        ? 'Cihazınızı her zamanki gibi doğal akışında kullanmaya devam edebilirsiniz.'
        : 'Doğal ritminizi korumak için gününüze dengeli molalar eklemeye devam edebilirsiniz.',
      evidence: evidenceList,
      dismissed: false,
      provisional: !isFinalized,
      finalized: isFinalized,
    });
  }

  // Unified Daily State: a "balanced" card must never be stored on a strained day
  // (active mood / hybrid index low) — keeps the feed consistent with the mirror.
  try {
    const moodReports = await db.moodReports.orderBy('timestamp').reverse().toArray();
    const { score: recentMoodScore } = calculateRecentMoodScore(moodReports);
    const zScores: Record<string, number> = {};
    for (const a of anomalies) zScores[a.metricKey] = a.zScore;
    const passiveScore = !isLearning ? ClinicalPhenotypeClassifier.calculateAffectiveStateIndex(zScores) : null;
    const balanceIndex = calculateEmotionalBalanceIndex({ recentMoodScore, passiveScore, isEstablished: !isLearning });
    const dailyState = resolveDailyState({ balanceIndex, recentMoodScore });
    for (let i = 0; i < generatedInsights.length; i++) {
      generatedInsights[i] = applyDailyStateToInsight(generatedInsights[i], dailyState);
    }
  } catch {
    // Mood data unavailable: keep generated insights as-is.
  }

  // STRICT: Do NOT clear past insights! Replace only today's (latestDate) insights.
  const existingToday = await db.insights.where('date').equals(latestDate).toArray();
  if (existingToday.length > 0) {
    await db.insights.bulkDelete(existingToday.map(i => i.id!).filter(Boolean));
  }
  if (generatedInsights.length > 0) {
    await db.insights.bulkAdd(generatedInsights);
  }

  if (alerts.length > 0) {
    await db.predictiveAlerts.bulkAdd(alerts);
    const topAlert = alerts[0];
    if (topAlert && (topAlert.riskLevel === 'elevated' || topAlert.riskLevel === 'high')) {
      notificationService.sendPredictiveAlert(topAlert.title, topAlert.explanation).catch(() => {});
    }
  }

  return { insights: generatedInsights, alerts };
}
