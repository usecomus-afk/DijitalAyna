import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { MoodTimelineChart } from '../components/trigger/MoodTimelineChart';
import { MedicationTracker } from '../components/medication/MedicationTracker';
import { MedicationImpactChart } from '../components/charts/MedicationImpactChart';
import { QuickMoodWidget } from '../components/dashboard/QuickMoodWidget';
import { Disclaimer } from '../components/common/Disclaimer';
import { LineChart, Calendar, Tag, Pill, Sparkles } from 'lucide-react';

export const TriggersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mood' | 'medication'>('mood');

  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];
  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];
  const moodReports = useLiveQuery(() => db.moodReports.orderBy('timestamp').reverse().toArray()) || [];
  const medications = useLiveQuery(() => db.medications.toArray()) || [];

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
              <LineChart className="w-4 h-4" />
            </div>
            <h1 className="font-serif font-bold text-2xl text-comus-navy">
              Tetikleyici & Tedavi Analizi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-comus-sand-dark mt-1">
            Öznel hissiyat bildirimleriniz ve reçeteli ilaçlarınızın dijital fenotip korelasyonu
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-comus-surface p-1 rounded-2xl border border-comus-sand-light/30 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('mood')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'mood'
                ? 'bg-comus-navy text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-comus-navy'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ruh Hali Çizelgesi</span>
          </button>

          <button
            onClick={() => setActiveTab('medication')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-medium transition-all ${
              activeTab === 'medication'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-comus-sand-dark hover:text-teal-700'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>İlaç & Tedavi ({medications.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'mood' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Dual-Axis Timeline Chart */}
          <MoodTimelineChart metrics={dailyMetrics} moods={moodReports} />

          {/* Tetikleyici Analizi (PDF Sayfa 9) */}
          <div className="bg-white rounded-3xl p-6 border border-comus-sand-light/30 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-comus-navy">
                    Tetikleyici Analizi: Modu Yükselten & Düşüren Faktörler
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-comus-copper-subtle text-comus-copper-dark border border-comus-copper/20">
                    Slide 9
                  </span>
                </div>
                <p className="text-xs text-comus-sand-dark mt-0.5">
                  Hangi aktivitelerin ruh halinizi düşürdüğünü, hangilerinin yükselttiğini net bir şekilde görün
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Uplifting triggers */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Pozitif Katalizörler (Modu Yükseltenler)
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="font-medium text-emerald-950">🎵 Energetic Playlist (Müzik)</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">+0.8 Puan</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-100">
                    <span className="font-medium text-emerald-950">🚶 Açık Hava / Temiz Hava Molası</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">+0.7 Puan</span>
                  </div>
                </div>
              </div>

              {/* Depressing / stressful triggers */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Negatif Tetikleyiciler (Modu Düşürenler)
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-rose-100">
                    <span className="font-medium text-rose-950">📱 Sosyal Medyada Pasif Gezinme</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">-0.9 Puan</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-rose-100">
                    <span className="font-medium text-rose-950">🌙 Gece 02:00 Sonrası Ekran Kullanımı</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">-0.8 Puan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Mood Log Widget */}
          <QuickMoodWidget />

          {/* Recent Mood Journal Entries */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-lg text-comus-navy flex items-center gap-2">
                <Calendar className="w-4 h-4 text-comus-copper" />
                <span>Geçmiş Ruh Hali Kayıtları</span>
              </h3>
              <span className="text-xs text-comus-sand-dark">
                Toplam {moodReports.length} Giriş
              </span>
            </div>

            {moodReports.length > 0 ? (
              <div className="space-y-3">
                {moodReports.slice(0, 8).map((mood) => {
                  const moodLabels: Record<number, { emoji: string; text: string; color: string }> = {
                    1: { emoji: '😔', text: 'Zorlu', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                    2: { emoji: '😕', text: 'Düşük', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                    3: { emoji: '😐', text: 'Normal', color: 'bg-stone-50 text-stone-700 border-stone-200' },
                    4: { emoji: '🙂', text: 'İyi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    5: { emoji: '✨', text: 'Harika', color: 'bg-teal-50 text-teal-700 border-teal-200' },
                  };

                  const currentLabel = moodLabels[mood.score] || moodLabels[3];

                  return (
                    <div
                      key={mood.id || mood.timestamp}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/20 hover:border-comus-copper/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{currentLabel.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${currentLabel.color}`}>
                              {currentLabel.text}
                            </span>
                            <span className="text-xs text-comus-sand-dark">{mood.date}</span>
                          </div>
                          {mood.note && (
                            <p className="text-xs text-comus-navy/80 italic mt-1">
                              "{mood.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      {mood.tags && mood.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mood.tags.map((t, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-comus-sand-light/30 text-comus-sand-dark flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5 text-comus-copper" />
                              <span>{t}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-comus-sand-dark">
                Henüz ruh hali kaydı girilmedi. Yukarıdaki emojilere dokunarak ilk kaydınızı oluşturabilirsiniz.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          {/* Medication Tracker Form & Daily List */}
          <MedicationTracker />

          {/* Time Series Impact Overlay Chart */}
          {medications.length > 0 && (
            <MedicationImpactChart
              medications={medications}
              metrics={dailyMetrics}
              baselines={baselines}
              moods={moodReports}
            />
          )}
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
};
