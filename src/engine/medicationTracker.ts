import { DailyMetric, BaselineState } from '../types/engine';
import { Medication, MedicationEffectDelta } from '../types/medication';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';

export interface MedicationIntervention {
  medicationId: number;
  medicationName: string;
  t0Date: string; // YYYY-MM-DD (T_0)
  interventionType: 'start' | 'dosage_increase' | 'dosage_decrease' | 'discontinuation';
  dosageMg: number;
  previousDosageMg?: number;
  assignedAt: number;
  notes?: string;
}

export interface ClinicianMedicationReport {
  intervention: MedicationIntervention;
  evaluationDate: string;
  preWindowLabel: string; // e.g., "T-14 (YYYY-MM-DD -> YYYY-MM-DD)"
  postWindowLabel: string; // e.g., "T+14 (YYYY-MM-DD -> YYYY-MM-DD)"
  preDaysCount: number;
  postDaysCount: number;
  biomarkerDeltas: MedicationEffectDelta[];
  sedationIndex: {
    label: string;
    preAvg: number;
    postAvg: number;
    changePercent: number;
    direction: 'improved' | 'declined' | 'stable';
    clinicalNote: string;
  };
  sleepCircadianImpact: {
    label: string;
    preNightMinutes: number;
    postNightMinutes: number;
    changePercent: number;
    clinicalNote: string;
  };
  mobilityImpact: {
    label: string;
    preMobility: number;
    postMobility: number;
    changePercent: number;
    clinicalNote: string;
  };
  clinicianSummary: string;
}

/**
 * Creates and records a T_0 intervention timestamp for medication initiation or dosage change.
 */
export function assignMedicationIntervention(
  medication: Medication,
  interventionType: MedicationIntervention['interventionType'] = 'start',
  t0Date = medication.startDate,
  previousDosageMg?: number
): MedicationIntervention {
  return {
    medicationId: medication.id || 0,
    medicationName: medication.name,
    t0Date,
    interventionType,
    dosageMg: medication.dosageMg,
    previousDosageMg,
    assignedAt: Date.now(),
    notes: medication.notes,
  };
}

/**
 * Helper to compute date offset in YYYY-MM-DD
 */
function offsetDate(baseDateStr: string, days: number): string {
  const d = new Date(baseDateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Generates a structured clinician report comparing T_-14 baseline vs T_+14 (or T_+30)
 * post-intervention biomarkers: sedation (hold time/WPM), sleep efficiency (night usage),
 * and mobility radius.
 */
export function generateClinicianMedicationReport(
  medication: Medication,
  dailyMetrics: DailyMetric[],
  baselines: BaselineState[],
  interventionType: MedicationIntervention['interventionType'] = 'start',
  daysWindow: 14 | 30 = 14
): ClinicianMedicationReport {
  const t0Date = medication.startDate;
  const preStartDate = offsetDate(t0Date, -daysWindow);
  const postEndDate = offsetDate(t0Date, daysWindow);

  const intervention = assignMedicationIntervention(
    medication,
    interventionType,
    t0Date
  );

  // Filter metrics for T_-window and T_+window
  const preMetrics = dailyMetrics.filter(m => m.date >= preStartDate && m.date < t0Date);
  const postMetrics = dailyMetrics.filter(m => m.date >= t0Date && m.date <= postEndDate);

  const baselineMap = new Map(baselines.map(b => [b.metricKey, b]));

  const metricsToEvaluate: MetricKey[] = [
    'typing_wpm',
    'typing_backspace_rate',
    'night_usage_minutes',
    'mobility_index',
    'touch_interaction_frequency',
  ];

  const biomarkerDeltas: MedicationEffectDelta[] = [];

  for (const key of metricsToEvaluate) {
    const def = METRIC_DEFINITIONS[key];
    const base = baselineMap.get(key);

    const preVals = preMetrics.filter(m => m.metricKey === key).map(m => m.value);
    const postVals = postMetrics.filter(m => m.metricKey === key).map(m => m.value);

    const preAvg = preVals.length > 0
      ? preVals.reduce((a, b) => a + b, 0) / preVals.length
      : (base?.ewmaMean ?? 0);

    const postAvg = postVals.length > 0
      ? postVals.reduce((a, b) => a + b, 0) / postVals.length
      : preAvg;

    const diff = postAvg - preAvg;
    const changePercent = preAvg !== 0 ? Math.round((diff / preAvg) * 100) : 0;
    const std = base?.ewmaStd && base.ewmaStd > 0 ? base.ewmaStd : 1;
    const zScoreDelta = Math.round(((postAvg - preAvg) / std) * 10) / 10;

    let direction: 'improved' | 'declined' | 'stable' = 'stable';
    let interpretation = 'Stabil seyir izliyor.';

    if (key === 'night_usage_minutes') {
      if (changePercent <= -15) {
        direction = 'improved';
        interpretation = `Gece ekran kullanımında %${Math.abs(changePercent)} azalma tespit edildi. Sirkadiyen uyku penceresinde toparlanma.`;
      } else if (changePercent >= 20) {
        direction = 'declined';
        interpretation = `Gece uyanıklığında %${changePercent} artış gözlendi (sedasyon yetersizliği veya uyku bölünmesi).`;
      }
    } else if (key === 'typing_wpm') {
      if (changePercent >= 10) {
        direction = 'improved';
        interpretation = `Psikomotor hızlanma ve zihinsel icra akıcılığında %${changePercent} artış.`;
      } else if (changePercent <= -15) {
        direction = 'declined';
        interpretation = `Psikomotor yavaşlama (%${Math.abs(changePercent)} düşüş; sedatif yan etki göstergesi).`;
      }
    } else if (key === 'mobility_index') {
      if (changePercent >= 12) {
        direction = 'improved';
        interpretation = `Coğrafi hareketlilik ve dış aktivitede %${changePercent} artış (davranışsal aktivasyon).`;
      } else if (changePercent <= -15) {
        direction = 'declined';
        interpretation = `Fiziksel mobilitede %${Math.abs(changePercent)} azalma (eve kapanma veya apati eğilimi).`;
      }
    }

    biomarkerDeltas.push({
      metricKey: key,
      label: def?.label || key,
      unit: def?.unit || '',
      preAvg: Math.round(preAvg * 10) / 10,
      postAvg: Math.round(postAvg * 10) / 10,
      changePercent,
      zScoreDelta,
      direction,
      interpretation,
    });
  }

  // 1. Sedation / Psychomotor analysis
  const wpmDelta = biomarkerDeltas.find(d => d.metricKey === 'typing_wpm');
  const sedationDirection = (wpmDelta?.changePercent ?? 0) <= -15 ? 'declined' : (wpmDelta?.changePercent ?? 0) >= 10 ? 'improved' : 'stable';
  const sedationNote = sedationDirection === 'declined'
    ? 'Yazım hızında belirgin yavaşlama saptandı; hekim tarafından sedasyon ve bilişsel ağırlık yönünden incelenmesi önerilir.'
    : sedationDirection === 'improved'
    ? 'Psikomotor hızlanma ve bilişsel tempo olumlu yönde ilerliyor.'
    : 'Psikomotor icra temposu kararlı seyrediyor.';

  // 2. Sleep / Circadian analysis
  const nightDelta = biomarkerDeltas.find(d => d.metricKey === 'night_usage_minutes');
  const preNight = nightDelta?.preAvg ?? 0;
  const postNight = nightDelta?.postAvg ?? 0;
  const nightPct = nightDelta?.changePercent ?? 0;
  const sleepNote = nightPct <= -15
    ? '02:00-04:00 gece penceresi uyanıklık süresinde belirgin düşüş; sirkadiyen konsolidasyon başarılı.'
    : nightPct >= 20
    ? 'Gece ekran aktivitesinde artış; uyku hijyeni veya ilacın uyku latansı üzerindeki etkisi izlenmeli.'
    : 'Sirkadiyen uyku göstergesi olağan aralıkta.';

  // 3. Mobility analysis
  const mobDelta = biomarkerDeltas.find(d => d.metricKey === 'mobility_index');
  const preMob = mobDelta?.preAvg ?? 0;
  const postMob = mobDelta?.postAvg ?? 0;
  const mobPct = mobDelta?.changePercent ?? 0;
  const mobilityNote = mobPct >= 12
    ? 'Günlük hareketlilik yarıçapında artış saptandı; anhedoni ve psikomotor inhibisyonda gerileme ile uyumlu.'
    : mobPct <= -15
    ? 'Mobilite alanında daralma gözlemlendi; sosyal çekilme riski göz önünde bulundurulmalı.'
    : 'Fiziksel dolaşım alanı stabil.';

  const clinicianSummary = `T_0 (${t0Date}) tarihinde başlayan ${medication.name} (${medication.dosageMg}mg) tedavisinin T_${-daysWindow} vs T_+${daysWindow} karşılaştırmasında: Gece dinlenme süresinde %${Math.abs(nightPct)} ${nightPct <= 0 ? 'iyileşme' : 'sapma'}, psikomotor tempoda %${Math.abs(wpmDelta?.changePercent ?? 0)} değişim kaydedildi.`;

  return {
    intervention,
    evaluationDate: new Date().toISOString().split('T')[0],
    preWindowLabel: `T-${daysWindow} (${preStartDate} -> ${t0Date})`,
    postWindowLabel: `T+${daysWindow} (${t0Date} -> ${postEndDate})`,
    preDaysCount: preMetrics.length,
    postDaysCount: postMetrics.length,
    biomarkerDeltas,
    sedationIndex: {
      label: 'Sedasyon & Psikomotor Yavaşlama',
      preAvg: wpmDelta?.preAvg ?? 0,
      postAvg: wpmDelta?.postAvg ?? 0,
      changePercent: wpmDelta?.changePercent ?? 0,
      direction: sedationDirection,
      clinicalNote: sedationNote,
    },
    sleepCircadianImpact: {
      label: 'Sirkadiyen Uyku Etkinliği',
      preNightMinutes: preNight,
      postNightMinutes: postNight,
      changePercent: nightPct,
      clinicalNote: sleepNote,
    },
    mobilityImpact: {
      label: 'Fiziksel Aktivasyon & Hareketlilik',
      preMobility: preMob,
      postMobility: postMob,
      changePercent: mobPct,
      clinicalNote: mobilityNote,
    },
    clinicianSummary,
  };
}
