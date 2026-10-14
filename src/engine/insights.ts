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

    // Send early awareness notification for critical threshold
    notificationService.sendClinicalEarlyAwarenessAlert(clinAlert).catch(() => {});
  }

  for (const bio of biomarkers) {
    if (addedBiomarkerTypes.has(bio.type)) continue;

    if (bio.type === 'healthy_balance') {
      if (generatedInsights.length > 0) continue; // Do not add healthy_balance if a clinical alert is active
      const mobEv = await buildEvidence('mobility_index');
      const wpmEv = await buildEvidence('typing_wpm');
      const evidenceList = [mobEv, wpmEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'low',
        biomarkerType: 'healthy_balance',
        title: isLearning ? `Kişisel Baz Hattı Oluşturuluyor (${sampleDays}/14 Gün)` : 'Dengeli ve Kararlı Davranışsal Ritim',
        body: isLearning
          ? 'Cihaz kullanım ritminiz ve biyobelirteçleriniz kaydediliyor. 14 günlük stabil baz hattınız oluştuktan sonra kişiselleştirilmiş içgörüler ve anomali analizleri üretilecektir.'
          : 'Yazım akıcılığın, hareketlilik seviyen ve oturum düzenin kişisel baz hattınla son derece uyumlu ve dengeli seyrediyor.',
        suggestedAction: isLearning
          ? 'Cihazınızı her zamanki gibi doğal akışında kullanımaya devam edebilirsiniz.'
          : 'Bu dingin ve sürdürülebilir ritmini korumak için günün keyfini çıkarabilirsin.',
        evidence: evidenceList,
        dismissed: false,
        provisional: !isFinalized,
        finalized: isFinalized,
      });
    } else {
      const ruleKey = Object.keys(PHENOTYPE_RULES).find(k => PHENOTYPE_RULES[k].id === bio.type);
      const rule = ruleKey ? PHENOTYPE_RULES[ruleKey] : null;

      if (rule) {
        const validMetrics = [...rule.requiredMetrics, ...rule.requiredZMetrics]
          .filter(m => METRIC_DEFINITIONS[m as MetricKey]);
        const evidencePromises = validMetrics.map(metric => buildEvidence(metric as MetricKey));
        const resolvedEvidence = await Promise.all(evidencePromises);
        const evidenceList = resolvedEvidence.filter(Boolean) as EvidenceItem[];

        generatedInsights.push({
          createdAt: Date.now(),
          date: latestDate,
          severity: rule.severity,
          biomarkerType: bio.type,
          title: `Potansiyel ${rule.title} Olasılığı`,
          body: rule.personalizedDeviationStatement,
          suggestedAction: rule.ethicalDisclaimer,
          evidence: evidenceList,
          dismissed: false,
          provisional: !isFinalized,
          finalized: isFinalized,
        });
      }
    }
  }

  if (generatedInsights.length === 0) {
    const mobEv = await buildEvidence('mobility_index');
    const wpmEv = await buildEvidence('typing_wpm');
    generatedInsights.push({
      createdAt: Date.now(),
      date: latestDate,
      severity: 'low',
      biomarkerType: 'healthy_balance',
      title: isLearning ? `Kişisel Baz Hattı Oluşturuluyor (${sampleDays}/14 Gün)` : 'Kişisel Baz Hattı ve Günlük Değerlendirme',
      body: isLearning
        ? 'Cihaz kullanım ritminiz ve biyobelirteçleriniz kaydediliyor. 14 günlük stabil baz hattınız oluştuktan sonra kişiselleştirilmiş içgörüler ve anomali analizleri üretilecektir.'
        : 'Cihaz içi etkileşimleriniz, yazım akıcılığınız ve sirkadiyen oturum ritminiz başarıyla incelendi. Belirgin bir risk faktörü veya tükenmişlik sapması tespit edilmedi.',
      suggestedAction: isLearning
        ? 'Cihazınızı her zamanki gibi doğal akışında kullanımaya devam edebilirsiniz.'
        : 'Doğal ritminizi korumak için gününüze dengeli molalar eklemeye devam edebilirsiniz.',
      evidence: [mobEv, wpmEv].filter(Boolean) as EvidenceItem[],
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
