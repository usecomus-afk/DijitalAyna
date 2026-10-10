import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const FREQUENCIES: { value: number; label: string; hint: string }[] = [
  { value: 1, label: 'Günde 1 Kez', hint: '(Sabah)' },
  { value: 2, label: 'Günde 2 Kez', hint: '(Sabah & Akşam)' },
  { value: 3, label: 'Günde 3 Kez', hint: '(Sabah, Öğle, Akşam)' },
];

export const InspirationNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, setInspirationSettings } = useAppStore();
  const enabled = settings.inspirationNotificationsEnabled || false;

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Huzur &amp; İlham Bildirimleri</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
              enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
                Huzur &amp; İlham Bildirimleri
              </h3>
              <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                Günün belirli saatlerinde stresinizi azaltacak ve anı fark etmenizi sağlayacak şefkatli hatırlatıcılar
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
              enabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}>
              {enabled ? 'Aktif' : 'Pasif'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setInspirationSettings(e.target.checked, settings.inspirationFrequency || 1)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {enabled && (
          <div className="pt-3 border-t border-comus-sand-light/20">
            <label className="block text-xs font-semibold text-comus-navy mb-2">Bildirim Sıklığı</label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setInspirationSettings(true, f.value)}
                  className={`py-2 rounded-xl text-xs font-medium transition-colors border ${
                    settings.inspirationFrequency === f.value
                      ? 'bg-comus-navy text-white border-comus-navy'
                      : 'bg-white text-comus-sand-dark border-comus-sand-light/40 hover:bg-comus-surface'
                  }`}
                >
                  {f.label}<br /><span className="text-[10px] font-normal opacity-80">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
