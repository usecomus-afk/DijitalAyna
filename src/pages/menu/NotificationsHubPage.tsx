import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  Bell,
  Pill,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { db } from '../../db';

export type NotificationSubSection =
  | 'inspiration'
  | 'medication'
  | 'awareness';

const FREQUENCIES: { value: number; label: string; hint: string }[] = [
  { value: 1, label: 'Günde 1 Kez', hint: '(Sabah 09:00)' },
  { value: 2, label: 'Günde 2 Kez', hint: '(Sabah & Akşam)' },
  { value: 3, label: 'Günde 3 Kez', hint: '(Sabah, Öğle, Akşam)' },
];

export const NotificationsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('section') as NotificationSubSection | null;

  const {
    settings,
    setInspirationSettings,
    setMedicationNotificationsEnabled,
    setNotificationsEnabled,
    sendTestNotification,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<NotificationSubSection | null>(
    initialParam && ['inspiration', 'medication', 'awareness'].includes(initialParam)
      ? initialParam
      : null
  );
  const [testToast, setTestToast] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get('section') as NotificationSubSection | null;
    if (param && ['inspiration', 'medication', 'awareness'].includes(param)) {
      setActiveSection(param);
    }
  }, [searchParams]);

  const medications = useLiveQuery(() => db.medications.toArray()) || [];

  const inspirationEnabled = Boolean(settings.inspirationNotificationsEnabled);
  const medicationEnabled = settings.medicationNotificationsEnabled !== false;
  const awarenessEnabled = Boolean(settings.notificationsEnabled);

  const handleToggleSection = (id: NotificationSubSection) => {
    const next = activeSection === id ? null : id;
    setActiveSection(next);
    if (next) {
      setSearchParams({ section: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSendTest = async () => {
    const ok = await sendTestNotification();
    setTestToast(
      ok
        ? 'Test bildirimi başarıyla gönderildi!'
        : 'Bildirim izni kapalı veya tarayıcı tarafından engellendi.'
    );
    setTimeout(() => setTestToast(null), 3500);
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center space-x-3 mb-2">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-comus-navy">
            Bildirimler
          </h1>
          <p className="text-xs text-comus-sand-dark mt-0.5">
            Huzur, ilaç hatırlatma ve erken farkındalık bildirimlerinizi yönetin.
          </p>
        </div>
      </div>

      {testToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{testToast}</span>
        </div>
      )}

      <div className="space-y-3">
        {/* 1. Huzur & İlham Bildirimleri */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${
            activeSection === 'inspiration'
              ? 'bg-stone-50/70 border-comus-copper/40 shadow-soft'
              : 'bg-white border-comus-sand-light/30 shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={() => handleToggleSection('inspiration')}
            aria-expanded={activeSection === 'inspiration'}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-comus-sand-light/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeSection === 'inspiration'
                    ? 'bg-comus-navy text-white'
                    : 'bg-comus-copper-subtle text-comus-copper'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-comus-navy">
                    Huzur &amp; İlham Bildirimleri
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      inspirationEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {inspirationEnabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="text-xs text-comus-sand-dark mt-0.5">
                  Gün içinde stresinizi azaltacak ve anı fark etmenizi sağlayacak şefkatli hatırlatıcılar
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-comus-sand-dark flex items-center justify-center shrink-0">
              {activeSection === 'inspiration' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {activeSection === 'inspiration' && (
            <div className="p-4 sm:p-5 pt-3 border-t border-comus-sand-light/25 animate-fadeIn">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-comus-sand-light/30 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-comus-navy">
                      Günlük Huzur &amp; İlham Mesajları
                    </div>
                    <p className="text-xs text-comus-sand-dark mt-0.5">
                      Sabah, öğle veya akşam saatlerinde kısa farkındalık ve içsel denge notları gönderilir.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={inspirationEnabled}
                      onChange={(e) =>
                        setInspirationSettings(
                          e.target.checked,
                          settings.inspirationFrequency || 1
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {inspirationEnabled && (
                  <div className="pt-3 border-t border-comus-sand-light/20">
                    <label className="block text-xs font-semibold text-comus-navy mb-2">
                      Bildirim Sıklığı
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {FREQUENCIES.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setInspirationSettings(true, f.value)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
                            settings.inspirationFrequency === f.value
                              ? 'bg-comus-navy text-white border-comus-navy'
                              : 'bg-white text-comus-sand-dark border-comus-sand-light/40 hover:bg-comus-surface'
                          }`}
                        >
                          {f.label}
                          <br />
                          <span className="text-[10px] font-normal opacity-80">
                            {f.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. İlaç Hatırlatma Bildirimleri */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${
            activeSection === 'medication'
              ? 'bg-stone-50/70 border-comus-copper/40 shadow-soft'
              : 'bg-white border-comus-sand-light/30 shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={() => handleToggleSection('medication')}
            aria-expanded={activeSection === 'medication'}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-comus-sand-light/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeSection === 'medication'
                    ? 'bg-comus-navy text-white'
                    : 'bg-comus-copper-subtle text-comus-copper'
                }`}
              >
                <Pill className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-comus-navy">
                    İlaç Hatırlatma Bildirimleri
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      medicationEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {medicationEnabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="text-xs text-comus-sand-dark mt-0.5">
                  Kayıtlı ilaçlarınız için belirlediğiniz saatlerde düzenli doz hatırlatıcıları
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-comus-sand-dark flex items-center justify-center shrink-0">
              {activeSection === 'medication' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {activeSection === 'medication' && (
            <div className="p-4 sm:p-5 pt-3 border-t border-comus-sand-light/25 animate-fadeIn">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-comus-sand-light/30 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-comus-navy">
                      İlaç Saatlerinde Otomatik Hatırlatma
                    </div>
                    <p className="text-xs text-comus-sand-dark mt-0.5">
                      Günlük İlaç Kullanım Tablosu’na eklediğiniz ilaçların saatlerinde bildirim gönderilir.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={medicationEnabled}
                      onChange={(e) =>
                        setMedicationNotificationsEnabled(e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="pt-3 border-t border-comus-sand-light/20 space-y-2.5">
                  <div className="text-xs font-semibold text-comus-navy">
                    Kayıtlı İlaç Hatırlatma Saatleri ({medications.length})
                  </div>
                  {medications.length > 0 ? (
                    <div className="space-y-2">
                      {medications.map((med) => (
                        <div
                          key={med.id}
                          className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-comus-navy">
                              {med.name}{' '}
                              {med.dosage && (
                                <span className="font-normal text-comus-sand-dark">
                                  ({med.dosage})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {med.customTimes && med.customTimes.length > 0
                                ? med.customTimes.filter(Boolean).join(', ')
                                : 'Saat seçilmedi'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-comus-sand-dark">
                      Henüz kayıtlı bir ilacınız bulunmuyor. İlaç ve hatırlatma saati eklemek için aşağıdaki butonu kullanabilirsiniz.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/menu/medication-tracker')}
                    className="w-full py-2.5 px-4 rounded-xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Günlük İlaç Kullanım Tablosu’nu Aç &amp; Saatleri Düzenle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Farkındalık Bildirimleri */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden ${
            activeSection === 'awareness'
              ? 'bg-stone-50/70 border-comus-copper/40 shadow-soft'
              : 'bg-white border-comus-sand-light/30 shadow-sm'
          }`}
        >
          <button
            type="button"
            onClick={() => handleToggleSection('awareness')}
            aria-expanded={activeSection === 'awareness'}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-comus-sand-light/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeSection === 'awareness'
                    ? 'bg-comus-navy text-white'
                    : 'bg-comus-copper-subtle text-comus-copper'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-comus-navy">
                    Farkındalık Bildirimleri
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      awarenessEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {awarenessEnabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="text-xs text-comus-sand-dark mt-0.5">
                  Sabah/akşam ritim yoklamaları ve davranışsal sapma erken farkındalık uyarıları
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-comus-sand-dark flex items-center justify-center shrink-0">
              {activeSection === 'awareness' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {activeSection === 'awareness' && (
            <div className="p-4 sm:p-5 pt-3 border-t border-comus-sand-light/25 animate-fadeIn">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-comus-sand-light/30 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-comus-navy">
                      Erken Farkındalık &amp; Günlük Ritim Yoklaması
                    </div>
                    <p className="text-xs text-comus-sand-dark mt-0.5">
                      Sabah (09:00) ve akşam (21:00) duygu yoklamaları ile kişisel baz hattınızdan belirgin sapma olduğunda nazik farkındalık bildirimleri gönderilir.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={awarenessEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="pt-3 border-t border-comus-sand-light/20 flex items-center justify-between gap-3">
                  <span className="text-xs text-comus-sand-dark">
                    Cihazınızın bildirim izinlerini ve ses/başlık görünümünü test edin:
                  </span>
                  <button
                    type="button"
                    onClick={handleSendTest}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-comus-surface hover:bg-stone-100 text-comus-navy border border-comus-sand-light/40 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-comus-copper" />
                    <span>Test Bildirimi Gönder</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
