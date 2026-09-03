import { db } from '../db';
import { METRIC_DEFINITIONS, MetricKey } from '../types/sensor';
import { EvidenceItem, Insight, PredictiveAlert } from '../types/engine';
import { detectAnomaliesForDay } from './anomaly';
import { synthesizeBiomarkers } from './biomarkers';
import { evaluatePredictivePatterns } from './prediction';
import { notificationService } from '../services/notificationService';

/**
 * Main Insight and Alert Generation Pipeline
 */
export async function generateInsightsAndAlerts(): Promise<{
  insights: Insight[];
  alerts: PredictiveAlert[];
}> {
  // 1. Get latest date in the database
  const latestMetric = await db.dailyMetrics.orderBy('date').last();
  if (!latestMetric) {
    return { insights: [], alerts: [] };
  }
  const latestDate = latestMetric.date;

  // 2. Detect anomalies for the latest date
  const anomalies = await detectAnomaliesForDay(latestDate);
  const biomarkers = synthesizeBiomarkers(anomalies);
  const alerts = evaluatePredictivePatterns(anomalies);

  // 3. Prepare evidence history for each metric (last 7-14 days)
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

  for (const bio of biomarkers) {
    if (bio.type === 'emotional_burnout') {
      const wpmEv = await buildEvidence('typing_wpm');
      const errEv = await buildEvidence('typing_backspace_rate');
      const nightEv = await buildEvidence('night_usage_minutes');
      const evidenceList = [wpmEv, errEv, nightEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'high',
        biomarkerType: 'emotional_burnout',
        title: 'Yazım Ritmin ve Bilişsel Tempon Hakkında Bir Gözlem',
        body: 'Son birkaç gündür klavye yazım hızında sakin bir yavaşlama ve geriye dönüp düzeltme sıklığında belirgin bir artış fark ettik. Bu davranış örüntüsü genellikle yoğun zihinsel yorgunluk ve tükenmişlik evrelerinde gözlemlenebilir.',
        suggestedAction: 'Şu an üst üste binen sorumluluklar arasında küçük bir nefes alanı açmak ve bugün zihnini dinlendirecek 20 dakikalık ekransız bir mola vermek nasıl hissettirirdi?',
        evidence: evidenceList,
        dismissed: false,
      });
    } else if (bio.type === 'circadian_disruption') {
      const nightEv = await buildEvidence('night_usage_minutes');
      const screenEv = await buildEvidence('screen_on_time');
      const evidenceList = [nightEv, screenEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now() - 1000,
        date: latestDate,
        severity: 'medium',
        biomarkerType: 'circadian_disruption',
        title: 'Gece Dinlenme Penceresi ve Sirkadiyen Ritim',
        body: 'Son 3 gecedir biyolojik onarım penceresi olan 02:00–04:00 saatleri arasında cihaz etkileşiminde artış tespit edildi. Gece ışığı ve geç saat uyanıklığı, sonraki günün bilişsel dayanıklılığını etkileyebilir.',
        suggestedAction: 'Yatmadan 45 dakika önce telefonunu yatak başucundan uzağa bırakıp uyku öncesi sakinleştirici bir rutin oluşturmayı denemek ister misin?',
        evidence: evidenceList,
        dismissed: false,
      });
    } else if (bio.type === 'social_withdrawal') {
      const mobEv = await buildEvidence('mobility_index');
      const touchEv = await buildEvidence('touch_interaction_frequency');
      const evidenceList = [mobEv, touchEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'high',
        biomarkerType: 'social_withdrawal',
        title: 'Hareketlilik ve Etkileşim Dinamiklerinde Değişim',
        body: 'Günlük fiziksel hareketlilik seviyende ve cihaz içi aktif etkileşim sıklığında kişisel baz hattına kıyasla belirgin bir geri çekilme görülüyor. Bu örüntü çoğu zaman sosyal enerjinin azaldığı dönemlerde öne çıkar.',
        suggestedAction: 'Bugün dışarıda kısa bir hava alma yürüyüşü yapmayı ya da seni anlayan bir dostunla kısa bir merhaba paylaşmayı planlamak iyi gelebilir mi?',
        evidence: evidenceList,
        dismissed: false,
      });
    } else if (bio.type === 'high_stress') {
      const scrollEv = await buildEvidence('touch_scroll_velocity');
      const tremorEv = await buildEvidence('tremor_variance');
      const evidenceList = [scrollEv, tremorEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'medium',
        biomarkerType: 'high_stress',
        title: 'Dokunmatik Gezinme Hızında Stres Yansıması',
        body: 'Ekranda kaydırma hızının normalinden %40 daha yüksek olduğu ve oturumların sık bölündüğü fark ediliyor. Bu hızlı geçişler genellikle zihinsel telaş ve baskı anlarında ortaya çıkar.',
        suggestedAction: 'Birkaç derin diyafram nefesi alıp omuzlarını serbest bırakmayı ve ritmini yavaşlatmayı denemek ister misin?',
        evidence: evidenceList,
        dismissed: false,
      });
    } else if (bio.type === 'healthy_balance') {
      const mobEv = await buildEvidence('mobility_index');
      const wpmEv = await buildEvidence('typing_wpm');
      const evidenceList = [mobEv, wpmEv].filter(Boolean) as EvidenceItem[];

      generatedInsights.push({
        createdAt: Date.now(),
        date: latestDate,
        severity: 'low',
        biomarkerType: 'healthy_balance',
        title: 'Dengeli ve Kararlı Davranışsal Ritim',
        body: 'Yazım akıcılığın, hareketlilik seviyen ve oturum düzenin kişisel baz hattınla son derece uyumlu ve dengeli seyrediyor.',
        suggestedAction: 'Bu dingin ve sürdürülebilir ritmini korumak için günün keyfini çıkarabilirsin.',
        evidence: evidenceList,
        dismissed: false,
      });
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
      title: 'Kişisel Baz Hattı ve Günlük Değerlendirme',
      body: 'Cihaz içi etkileşimleriniz, yazım akıcılığınız ve sirkadiyen oturum ritminiz başarıyla incelendi. Belirgin bir risk faktörü veya tükenmişlik sapması tespit edilmedi.',
      suggestedAction: 'Doğal ritminizi korumak için gününüze dengeli molalar eklemeye devam edebilirsiniz.',
      evidence: [mobEv, wpmEv].filter(Boolean) as EvidenceItem[],
      dismissed: false,
    });
  }

  // Clear previous insights & alerts and insert new ones
  await db.insights.clear();
  await db.predictiveAlerts.clear();

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
