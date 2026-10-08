export interface ClinicalSurveyResult {
  id?: number;
  timestamp: number;
  date: string; // YYYY-MM-DD
  gad7Score: number;
  gad7Risk: 'Minimum' | 'Hafif' | 'Orta' | 'Ağır';
  phq9Score: number;
  phq9Risk: 'Minimum' | 'Hafif' | 'Orta' | 'Orta-Ağır' | 'Ağır';
  crisisRisk: boolean;
  responses: number[];
}

export const GAD7_QUESTIONS = [
  "Gergin, kaygılı veya sinirli hissetmek",
  "Endişelenmeyi bırakamamak veya kontrol edememek",
  "Farklı şeyler hakkında çok fazla endişelenmek",
  "Gevşemede güçlük çekmek",
  "Sakince oturamayacak kadar kendini huzursuz hissetmek",
  "Kolayca kızmak ve asabileşmek",
  "Sanki çok kötü bir şey olacakmış gibi bir korku duymak"
];

export const PHQ9_QUESTIONS = [
  "Bir şeyleri yapmaya karşı az ilgi veya zevk duymak",
  "Üzgün, depresif veya umutsuz hissetmek",
  "Uykuya dalmada veya uykuda kalmada güçlük çekmek ya da çok fazla uyumak",
  "Kendini yorgun veya enerjisi tükenmiş hissetmek",
  "İştahsızlık veya aşırı yeme",
  "Kendinizi kötü hissetmek ya da kendinizi veya ailenizi hayal kırıklığına uğrattığınızı düşünmek",
  "Gazete okumak veya televizyon izlemek gibi aktivitelerde konsantre olmakta güçlük çekmek",
  "Hareketlerinizin/konuşmanızın başkalarınca fark edilecek kadar yavaşlaması ya da aşırı huzursuz/kıpır kıpır hissetmek",
  "Ölmenin daha iyi olacağına dair düşünceler ya da kendinize bir şekilde zarar verme düşünceleri"
];

export const SURVEY_OPTIONS = [
  { label: "Hiçbir zaman", value: 0 },
  { label: "Bazı günler", value: 1 },
  { label: "Günlerin yarıdan fazlasında", value: 2 },
  { label: "Hemen hemen her gün", value: 3 }
];

export function calculateGAD7Risk(score: number): 'Minimum' | 'Hafif' | 'Orta' | 'Ağır' {
  if (score <= 4) return 'Minimum';
  if (score <= 9) return 'Hafif';
  if (score <= 14) return 'Orta';
  return 'Ağır';
}

export function calculatePHQ9Risk(score: number): 'Minimum' | 'Hafif' | 'Orta' | 'Orta-Ağır' | 'Ağır' {
  if (score <= 4) return 'Minimum';
  if (score <= 9) return 'Hafif';
  if (score <= 14) return 'Orta';
  if (score <= 19) return 'Orta-Ağır';
  return 'Ağır';
}
