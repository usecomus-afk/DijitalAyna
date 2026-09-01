export type SensorType = 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice';

export interface SensorEvent {
  id?: number;
  type: SensorType;
  timestamp: number; // Unix timestamp ms
  payload: Record<string, number>; // Strictly numeric metadata - privacy-by-design
}

export type MetricKey =
  | 'mobility_index'
  | 'tremor_variance'
  | 'typing_wpm'
  | 'typing_iki'
  | 'typing_backspace_rate'
  | 'typing_pause_count'
  | 'touch_scroll_velocity'
  | 'touch_interaction_frequency'
  | 'session_duration'
  | 'night_usage_minutes'
  | 'screen_on_time'
  | 'light_ambient_lux'
  | 'battery_level'
  | 'is_charging'
  | 'network_online'
  | 'voice_pitch_variance'
  | 'voice_speech_rate'
  | 'cognitive_fatigue_score'
  | 'impulse_risk_index';

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
  category: 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice';
  description: string;
  healthyTrend: 'higher' | 'lower' | 'balanced';
}

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  mobility_index: {
    key: 'mobility_index',
    label: 'Hareketlilik Endeksi',
    unit: 'puan',
    category: 'motion',
    description: 'Gün içindeki fiziksel mikro ve makro hareket çeşitliliği.',
    healthyTrend: 'higher',
  },
  tremor_variance: {
    key: 'tremor_variance',
    label: 'El Titremesi Varyansı',
    unit: 'm/s²',
    category: 'motion',
    description: 'Cihaz tutuşundaki mikro-stabilite ve kas gerilimi.',
    healthyTrend: 'lower',
  },
  typing_wpm: {
    key: 'typing_wpm',
    label: 'Yazım Hızı',
    unit: 'WPM',
    category: 'typing',
    description: 'Tuş vuruş sıklığına dayalı tahmini yazım akıcılığı.',
    healthyTrend: 'balanced',
  },
  typing_iki: {
    key: 'typing_iki',
    label: 'Tuş Vuruş Aralığı',
    unit: 'ms',
    category: 'typing',
    description: 'İki tuş basımı arasındaki ortalama gecikme süresi.',
    healthyTrend: 'balanced',
  },
  typing_backspace_rate: {
    key: 'typing_backspace_rate',
    label: 'Düzeltme & Hata Oranı',
    unit: '%',
    category: 'typing',
    description: 'Yazarken yapılan silme ve geriye dönüş yüzdesi.',
    healthyTrend: 'lower',
  },
  typing_pause_count: {
    key: 'typing_pause_count',
    label: 'Yazım İçi Duraksama',
    unit: 'adet',
    category: 'typing',
    description: 'Yazım sırasında 1.5 sn üzeri tereddüt/duraksama sayısı.',
    healthyTrend: 'lower',
  },
  touch_scroll_velocity: {
    key: 'touch_scroll_velocity',
    label: 'Kaydırma Hızı',
    unit: 'px/sn',
    category: 'touch',
    description: 'Ekranda gezinme ve kaydırma hız dinamikleri.',
    healthyTrend: 'balanced',
  },
  touch_interaction_frequency: {
    key: 'touch_interaction_frequency',
    label: 'Etkileşim Yoğunluğu',
    unit: 'dokunma/dk',
    category: 'touch',
    description: 'Aktif dakikalardaki toplam dokunma ve tıklama sıklığı.',
    healthyTrend: 'balanced',
  },
  session_duration: {
    key: 'session_duration',
    label: 'Ortalama Oturum Süresi',
    unit: 'dk',
    category: 'session',
    description: 'Tek seferde uygulamada geçirilen kesintisiz süre.',
    healthyTrend: 'balanced',
  },
  night_usage_minutes: {
    key: 'night_usage_minutes',
    label: 'Gece Kullanımı (02:00–04:00)',
    unit: 'dk',
    category: 'session',
    description: 'Biyolojik dinlenme penceresindeki ekran aktivitesi.',
    healthyTrend: 'lower',
  },
  screen_on_time: {
    key: 'screen_on_time',
    label: 'Günlük Ekran Süresi',
    unit: 'dk',
    category: 'session',
    description: 'Gün içinde aktif olarak geçen toplam kullanım süresi.',
    healthyTrend: 'balanced',
  },
  light_ambient_lux: {
    key: 'light_ambient_lux',
    label: 'Ortam Işığı / Aydınlık',
    unit: 'lux',
    category: 'light',
    description: 'Kullanım sırasındaki tahmini veya ölçülen ortam aydınlığı.',
    healthyTrend: 'higher',
  },
  battery_level: {
    key: 'battery_level',
    label: 'Pil Seviyesi',
    unit: '%',
    category: 'battery',
    description: 'Cihaz pil seviyesi (düşük pil kullanım stresi tespiti).',
    healthyTrend: 'higher',
  },
  is_charging: {
    key: 'is_charging',
    label: 'Şarj Durumu',
    unit: 'durum',
    category: 'battery',
    description: 'Gece şarj alışkanlıkları ve düzenli dinlenme korelasyonu.',
    healthyTrend: 'balanced',
  },
  network_online: {
    key: 'network_online',
    label: 'Ağ Durumu',
    unit: 'durum',
    category: 'network',
    description: 'Çevrimdışı/çevrimiçi bağlantı istikrarı.',
    healthyTrend: 'higher',
  },
  voice_pitch_variance: {
    key: 'voice_pitch_variance',
    label: 'Ses Ton Dinamiği & Varyansı',
    unit: 'Hz²',
    category: 'voice',
    description: 'Konuşma tonundaki perde dalgalanması (düşük değer: monoton konuşma / majör depresyon sinyali).',
    healthyTrend: 'higher',
  },
  voice_speech_rate: {
    key: 'voice_speech_rate',
    label: 'Konuşma Hızı & Akıcılığı',
    unit: 'kelime/dk',
    category: 'voice',
    description: 'Onaylı ses ritminde konuşma temposu ve duraksama oranı.',
    healthyTrend: 'balanced',
  },
  cognitive_fatigue_score: {
    key: 'cognitive_fatigue_score',
    label: 'Bilişsel Yorgunluk Kalkanı',
    unit: 'puan',
    category: 'session',
    description: 'Yazım yavaşlaması ve ekran maruziyetiyle hesaplanan karar yorgunluğu seviyesi.',
    healthyTrend: 'lower',
  },
  impulse_risk_index: {
    key: 'impulse_risk_index',
    label: 'Dürtüsel Davranış Riski',
    unit: 'puan',
    category: 'session',
    description: 'Gece yarısı ani işlem ve agresif ekran döngülerinde hesaplanan dürtüsellik skoru.',
    healthyTrend: 'lower',
  },
};
