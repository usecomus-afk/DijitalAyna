export type SensorType = 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice' | 'sleep';

export type DataProvenanceSource = 'native-sensor' | 'web-api' | 'missing' | 'screen-brightness-proxy';

export interface DataProvenance {
  source: DataProvenanceSource;
  confidence: number; // 0 to 1
  timestamp: number;
}

export interface SensorEvent {
  id?: number;
  type: SensorType;
  timestamp: number; // Unix timestamp ms
  payload: Record<string, number>; // Strictly numeric metadata - privacy-by-design
  provenance?: DataProvenance;
}

export type MetricKey =
  | 'mobility_index'
  | 'tremor_variance'
  | 'typing_wpm'
  | 'typing_iki'
  | 'typing_backspace_rate'
  | 'typing_pause_count'
  | 'typing_hold_time'
  | 'touch_scroll_velocity'
  | 'touch_interaction_frequency'
  | 'session_duration'
  | 'night_usage_minutes'
  | 'screen_on_time'
  | 'light_ambient_lux'
  | 'night_light_violations'
  | 'battery_level'
  | 'is_charging'
  | 'network_online'
  | 'voice_pitch_variance'
  | 'voice_speech_rate'
  | 'cognitive_fatigue_score'
  | 'impulse_risk_index'
  | 'homestay_ratio'
  | 'mobility_radius'
  | 'sleep_efficiency'
  | 'sleep_duration'
  | 'sleep_sol'
  | 'sleep_waso';

export interface MetricDefinition {
  isSecondaryContext?: boolean;
  key: MetricKey;
  label: string;
  unit: string;
  category: 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice' | 'sleep';
  description: string;
  healthyTrend: 'higher' | 'lower' | 'balanced';
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  mobility_index: {
    key: 'mobility_index',
    label: 'Hareketlilik Endeksi',
    unit: 'puan',
    category: 'motion',
    description: 'GÃ¼n iÃ§indeki fiziksel mikro ve makro hareket Ã§eÅŸitliliÄŸi.',
    healthyTrend: 'higher',
  },
  tremor_variance: {
    key: 'tremor_variance',
    label: 'El Titremesi VaryansÄ±',
    unit: 'm/sÂ²',
    category: 'motion',
    description: 'Cihaz tutuÅŸundaki mikro-stabilite ve kas gerilimi.',
    healthyTrend: 'lower',
  },
  typing_wpm: {
    key: 'typing_wpm',
    label: 'YazÄ±m HÄ±zÄ±',
    unit: 'WPM',
    category: 'typing',
    description: 'TuÅŸ vuruÅŸ sÄ±klÄ±ÄŸÄ±na dayalÄ± tahmini yazÄ±m akÄ±cÄ±lÄ±ÄŸÄ±.',
    healthyTrend: 'balanced',
  },
  typing_iki: {
    key: 'typing_iki',
    label: 'TuÅŸ VuruÅŸ AralÄ±ÄŸÄ±',
    unit: 'ms',
    category: 'typing',
    description: 'Ä°ki tuÅŸ basÄ±mÄ± arasÄ±ndaki ortalama gecikme sÃ¼resi.',
    healthyTrend: 'balanced',
  },
  typing_backspace_rate: {
    key: 'typing_backspace_rate',
    label: 'DÃ¼zeltme & Hata OranÄ±',
    unit: '%',
    category: 'typing',
    description: 'Yazarken yapÄ±lan silme ve geriye dÃ¶nÃ¼ÅŸ yÃ¼zdesi.',
    healthyTrend: 'lower',
  },
  typing_pause_count: {
    key: 'typing_pause_count',
    label: 'YazÄ±m Ä°Ã§i Duraksama',
    unit: 'adet',
    category: 'typing',
    description: 'YazÄ±m sÄ±rasÄ±nda 1.5 sn Ã¼zeri tereddÃ¼t/duraksama sayÄ±sÄ±.',
    healthyTrend: 'lower',
  },
  touch_scroll_velocity: {
    key: 'touch_scroll_velocity',
    label: 'KaydÄ±rma HÄ±zÄ±',
    unit: 'px/sn',
    category: 'touch',
    description: 'Ekranda gezinme ve kaydÄ±rma hÄ±z dinamikleri.',
    healthyTrend: 'balanced',
  },
  touch_interaction_frequency: {
    key: 'touch_interaction_frequency',
    label: 'EtkileÅŸim YoÄŸunluÄŸu',
    unit: 'dokunma/dk',
    category: 'touch',
    description: 'Aktif dakikalardaki toplam dokunma ve tÄ±klama sÄ±klÄ±ÄŸÄ±.',
    healthyTrend: 'balanced',
  },
  session_duration: {
    key: 'session_duration',
    label: 'Ortalama Oturum SÃ¼resi',
    unit: 'dk',
    category: 'session',
    description: 'Tek seferde uygulamada geÃ§irilen kesintisiz sÃ¼re.',
    healthyTrend: 'balanced',
  },
  night_usage_minutes: {
    key: 'night_usage_minutes',
    label: 'Gece KullanÄ±mÄ± (02:00â€“04:00)',
    unit: 'dk',
    category: 'session',
    description: 'Biyolojik dinlenme penceresindeki ekran aktivitesi.',
    healthyTrend: 'lower',
  },
  screen_on_time: {
    key: 'screen_on_time',
    label: 'GÃ¼nlÃ¼k Ekran SÃ¼resi',
    unit: 'dk',
    category: 'session',
    description: 'GÃ¼n iÃ§inde aktif olarak geÃ§en toplam kullanÄ±m sÃ¼resi.',
    healthyTrend: 'balanced',
  },
  light_ambient_lux: {
    key: 'light_ambient_lux',
    label: 'Ortam IÅŸÄ±ÄŸÄ± / AydÄ±nlÄ±k',
    unit: 'lux',
    category: 'light',
    description: 'KullanÄ±m sÄ±rasÄ±ndaki tahmini veya Ã¶lÃ§Ã¼len ortam aydÄ±nlÄ±ÄŸÄ±.',
    healthyTrend: 'higher',
  },
  night_light_violations: {
    key: 'night_light_violations',
    label: 'Gece YÃ¼ksek IÅŸÄ±k (Sirkadiyen)',
    unit: 'kez',
    category: 'light',
    description: 'Gece (23:00-06:00) saatlerinde ekran/ortam Ä±ÅŸÄ±ÄŸÄ±nÄ±n yÃ¼ksek olmasÄ± durumu.',
    healthyTrend: 'lower',
  },
  battery_level: {    key: 'battery_level',    isSecondaryContext: true,
    label: 'Pil Seviyesi',
    unit: '%',
    category: 'battery',
    description: 'Cihaz pil seviyesi (dÃ¼ÅŸÃ¼k pil kullanÄ±m stresi tespiti).',
    healthyTrend: 'higher',
  },
  is_charging: {    key: 'is_charging',    isSecondaryContext: true,
    label: 'Åarj Durumu',
    unit: 'durum',
    category: 'battery',
    description: 'Gece ÅŸarj alÄ±ÅŸkanlÄ±klarÄ± ve dÃ¼zenli dinlenme korelasyonu.',
    healthyTrend: 'balanced',
  },
  network_online: {    key: 'network_online',    isSecondaryContext: true,
    label: 'AÄŸ Durumu',
    unit: 'durum',
    category: 'network',
    description: 'Ã‡evrimdÄ±ÅŸÄ±/Ã§evrimiÃ§i baÄŸlantÄ± istikrarÄ±.',
    healthyTrend: 'higher',
  },
  voice_pitch_variance: {
    key: 'voice_pitch_variance',
    label: 'Ses Ton DinamiÄŸi & VaryansÄ±',
    unit: 'HzÂ²',
    category: 'voice',
    description: 'KonuÅŸma tonundaki perde dalgalanmasÄ± (dÃ¼ÅŸÃ¼k deÄŸer: monoton konuÅŸma / majÃ¶r depresyon sinyali).',
    healthyTrend: 'higher',
  },
  voice_speech_rate: {
    key: 'voice_speech_rate',
    label: 'KonuÅŸma HÄ±zÄ± & AkÄ±cÄ±lÄ±ÄŸÄ±',
    unit: 'kelime/dk',
    category: 'voice',
    description: 'OnaylÄ± ses ritminde konuÅŸma temposu ve duraksama oranÄ±.',
    healthyTrend: 'balanced',
  },
  cognitive_fatigue_score: {
    key: 'cognitive_fatigue_score',
    label: 'BiliÅŸsel Yorgunluk KalkanÄ±',
    unit: 'puan',
    category: 'session',
    description: 'YazÄ±m yavaÅŸlamasÄ± ve ekran maruziyetiyle hesaplanan karar yorgunluÄŸu seviyesi.',
    healthyTrend: 'lower',
  },
  impulse_risk_index: {
    key: 'impulse_risk_index',
    label: 'DÃ¼rtÃ¼sel DavranÄ±ÅŸ Riski',
    unit: 'puan',
    category: 'session',
    description: 'Gece yarÄ±sÄ± ani iÅŸlem ve agresif ekran dÃ¶ngÃ¼lerinde hesaplanan dÃ¼rtÃ¼sellik skoru.',
    healthyTrend: 'lower',
  },
  sleep_efficiency: {
    key: 'sleep_efficiency',
    label: 'Uyku VerimliliÄŸi',
    unit: 'puan',
    category: 'sleep',
    description: 'Apple SaÄŸlÄ±k Ã¼zerinden alÄ±nan TST ve WASO analizlerine dayalÄ± uyku kalitesi.',
    healthyTrend: 'higher',
  },
  typing_hold_time: {
    key: 'typing_hold_time',
    label: 'TuÅŸ BasÄ±lÄ± Tutma SÃ¼resi',
    unit: 'ms',
    category: 'typing',
    description: 'TuÅŸlarÄ±n ne kadar sÃ¼re basÄ±lÄ± tutulduÄŸu.',
    healthyTrend: 'balanced',
  },
  homestay_ratio: {
    key: 'homestay_ratio',
    label: 'Evde Kalma OranÄ±',
    unit: '%',
    category: 'motion',
    description: 'Evde geÃ§irilen sÃ¼renin yÃ¼zdesi.',
    healthyTrend: 'balanced',
  },
  mobility_radius: {
    key: 'mobility_radius',
    label: 'Hareketlilik YarÄ±Ã§apÄ±',
    unit: 'km',
    category: 'motion',
    description: 'GÃ¼nlÃ¼k hareket edilen coÄŸrafi alanÄ±n yarÄ±Ã§apÄ±.',
    healthyTrend: 'higher',
  },
  sleep_duration: {
    key: 'sleep_duration',
    label: 'Toplam Uyku SÃ¼resi',
    unit: 'dk',
    category: 'sleep',
    description: 'Toplam uyunan sÃ¼re.',
    healthyTrend: 'higher',
  },
  sleep_sol: {
    key: 'sleep_sol',
    label: 'Uykuya Dalma SÃ¼resi',
    unit: 'dk',
    category: 'sleep',
    description: 'YataÄŸa giriÅŸten uykuya dalana kadar geÃ§en sÃ¼re.',
    healthyTrend: 'lower',
  },
  sleep_waso: {
    key: 'sleep_waso',
    label: 'Gece UyanÄ±klÄ±ÄŸÄ±',
    unit: 'dk',
    category: 'sleep',
    description: 'Uyku baÅŸladÄ±ktan sonra uyanÄ±k kalÄ±nan sÃ¼re.',
    healthyTrend: 'lower',
  },
};

export function isPrimaryMentalBiomarker(key: MetricKey): boolean {
  const def = METRIC_DEFINITIONS[key];
  if (!def) return false;
  return !def.isSecondaryContext;
}
