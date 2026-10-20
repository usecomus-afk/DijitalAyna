import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricKey, METRIC_DEFINITIONS } from '../types/sensor';

export interface MetricTrendPresentation {
  TrendIcon: LucideIcon;
  arrowDirection: 'up' | 'down' | 'flat';
  arrowSymbol: '↑' | '↓' | '—';
  badgeColorClass: string;
  textColorClass: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'warning';
  deviationLabel: string;
  plainDeviationText: string;
  contextualInsight?: string;
}

/**
 * Human-Centric Translation Layer
 * Replaces raw Greek sigma (σ) with plain clinical Turkish language.
 */
export function formatModifiedZScorePlain(modZ: number | null): string {
  if (modZ === null || isNaN(modZ)) return 'Veri Bekleniyor';
  const absZ = Math.abs(modZ);
  if (absZ < 1.0) return 'Olağan seyrinde';
  if (absZ < 2.0) return modZ > 0 ? 'Belirgin artış' : 'Belirgin azalış';
  return modZ > 0 ? 'Önemli sapma' : 'Önemli sapma';
}

/**
 * Decouples mathematical arrow direction from clinical sentiment color coding.
 *
 * Rules:
 * 1. Mathematical Arrow Direction:
 *    - Value increased (Delta > 0): Arrow MUST point UP (↑ / TrendingUp)
 *    - Value decreased (Delta < 0): Arrow MUST point DOWN (↓ / TrendingDown)
 *    - Value unchanged (Delta == 0): Horizontal dash (— / Minus)
 *
 * 2. Sentiment Color Coding (Independent of Arrow):
 *    - For beneficial metrics (healthyTrend === 'higher'): UP = Green, DOWN = Orange/Red
 *    - For risk metrics (healthyTrend === 'lower'): UP = Red/Orange, DOWN = Green
 *    - For balanced metrics (healthyTrend === 'balanced'): Small change = Green, Large deviation = Amber/Orange
 *
 * Never invert the visual arrow geometry just because a metric has negative health impact!
 */
export function getMetricTrendPresentation(
  metricKey: MetricKey,
  deltaPercent: number | null,
  modZ: number | null = null,
  sampleCount = 14
): MetricTrendPresentation {
  const def = METRIC_DEFINITIONS[metricKey];
  const healthyTrend = def?.healthyTrend ?? 'balanced';
  const hasData = deltaPercent !== null && !isNaN(deltaPercent);

  // Cold start check: if sampleCount < 3, suppress variance deviation alarm
  const isColdStart = sampleCount < 3;

  // 1. Strictly Mathematical Arrow Direction
  let TrendIcon: LucideIcon = Minus;
  let arrowDirection: 'up' | 'down' | 'flat' = 'flat';
  let arrowSymbol: '↑' | '↓' | '—' = '—';

  if (hasData && deltaPercent > 0) {
    TrendIcon = TrendingUp;
    arrowDirection = 'up';
    arrowSymbol = '↑';
  } else if (hasData && deltaPercent < 0) {
    TrendIcon = TrendingDown;
    arrowDirection = 'down';
    arrowSymbol = '↓';
  }

  // 2. Clinical Sentiment Color Coding
  let sentiment: 'positive' | 'negative' | 'neutral' | 'warning' = 'neutral';
  let badgeColorClass = 'bg-stone-100 text-stone-700 border-stone-200';
  let textColorClass = 'text-stone-700';

  if (!hasData) {
    return {
      TrendIcon: Minus,
      arrowDirection: 'flat',
      arrowSymbol: '—',
      badgeColorClass: 'bg-stone-100 text-stone-600 border-stone-200',
      textColorClass: 'text-stone-500',
      sentiment: 'neutral',
      deviationLabel: 'Veri Bekleniyor',
      plainDeviationText: 'Veri Bekleniyor',
    };
  }

  if (isColdStart) {
    return {
      TrendIcon,
      arrowDirection,
      arrowSymbol,
      badgeColorClass: 'bg-blue-50 text-blue-800 border-blue-200',
      textColorClass: 'text-blue-800',
      sentiment: 'neutral',
      deviationLabel: 'Öğreniliyor',
      plainDeviationText: 'Kişisel baz hattı öğreniliyor',
    };
  }

  const absDelta = Math.abs(deltaPercent);
  const isSubstantial = absDelta >= 10;
  const isSignificant = (modZ !== null && Math.abs(modZ) >= 2.0) || absDelta >= 25;

  if (healthyTrend === 'higher') {
    // Beneficial metrics (mobility, sleep efficiency)
    if (deltaPercent > 0) {
      sentiment = 'positive';
      badgeColorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      textColorClass = 'text-emerald-700';
    } else if (isSignificant) {
      sentiment = 'negative';
      badgeColorClass = 'bg-rose-50 text-rose-800 border-rose-200';
      textColorClass = 'text-rose-700';
    } else if (isSubstantial) {
      sentiment = 'warning';
      badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
      textColorClass = 'text-amber-700';
    } else {
      sentiment = 'neutral';
      badgeColorClass = 'bg-emerald-50/50 text-emerald-800 border-emerald-200';
      textColorClass = 'text-emerald-700';
    }
  } else if (healthyTrend === 'lower') {
    // Risk metrics (night usage, tremor, error rate, WASO, SOL)
    if (deltaPercent > 0) {
      // Metric increased -> risk increased! Red/Orange
      sentiment = isSignificant ? 'negative' : 'warning';
      badgeColorClass = isSignificant
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-amber-50 text-amber-800 border-amber-200';
      textColorClass = isSignificant ? 'text-rose-700' : 'text-amber-700';
    } else if (deltaPercent < 0) {
      // Metric decreased -> risk reduced! Beneficial Green
      sentiment = 'positive';
      badgeColorClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      textColorClass = 'text-emerald-700';
    } else {
      sentiment = 'neutral';
      badgeColorClass = 'bg-emerald-50/50 text-emerald-800 border-emerald-200';
      textColorClass = 'text-emerald-700';
    }
  } else {
    // Balanced metrics (typing wpm, session duration, scroll velocity)
    if (isSignificant) {
      sentiment = 'warning';
      badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
      textColorClass = 'text-amber-700';
    } else {
      sentiment = 'positive';
      badgeColorClass = 'bg-emerald-50/60 text-emerald-800 border-emerald-200';
      textColorClass = 'text-emerald-700';
    }
  }

  const sign = deltaPercent > 0 ? '+' : '';
  const deviationLabel = `${sign}${deltaPercent.toFixed(0)}%`;
  const plainDeviationText = formatModifiedZScorePlain(modZ);

  // 3. Human-Centric Contextual Insights
  let contextualInsight: string | undefined;
  if (metricKey === 'touch_scroll_velocity' && absDelta >= 20) {
    contextualInsight = deltaPercent > 0
      ? `Normalinden %${absDelta.toFixed(0)} daha hızlı kaydırma (Huzursuzluk/Acelecilik işareti olabilir)`
      : `Normalinden %${absDelta.toFixed(0)} daha sakin kaydırma`;
  } else if (metricKey === 'typing_wpm' && deltaPercent < -15) {
    contextualInsight = `Normalinden %${absDelta.toFixed(0)} daha yavaş yazım (Bilişsel yorgunluk/duraksama işareti olabilir)`;
  } else if (metricKey === 'night_usage_minutes' && deltaPercent > 15) {
    contextualInsight = `Gece dinlenme penceresinde %${absDelta.toFixed(0)} artış (Sirkadiyen uyku bölünmesi)`;
  } else if (metricKey === 'typing_backspace_rate' && deltaPercent > 20) {
    contextualInsight = `Düzeltme ve hata oranında %${absDelta.toFixed(0)} artış (Zihinsel odak dağılması)`;
  }

  return {
    TrendIcon,
    arrowDirection,
    arrowSymbol,
    badgeColorClass,
    textColorClass,
    sentiment,
    deviationLabel,
    plainDeviationText,
    contextualInsight,
  };
}
