import React, { useState } from 'react';
import { Sparkles, CalendarCheck, Clock, Check, ArrowRight } from 'lucide-react';
import { PredictiveAlert } from '../../types/engine';
import { db } from '../../db';

interface PredictiveAlertModalProps {
  alert: PredictiveAlert;
  onClose: () => void;
}

export const PredictiveAlertModal: React.FC<PredictiveAlertModalProps> = ({ alert, onClose }) => {
  const [planned, setPlanned] = useState(alert.actionPlanned);
  const [customNote, setCustomNote] = useState('');
  const [showPlanInput, setShowPlanInput] = useState(false);

  const handlePlanAction = async () => {
    if (alert.id) {
      await db.predictiveAlerts.update(alert.id, {
        actionPlanned: true,
        planNotes: customNote || 'Kişisel dinlenme ve ekran molası planlandı.',
      });
    }
    setPlanned(true);
    setShowPlanInput(false);
  };

  const handleDismiss = async () => {
    if (alert.id) {
      await db.predictiveAlerts.update(alert.id, { dismissed: true });
    }
    onClose();
  };

  return (
    <div className="bg-gradient-to-br from-comus-surface to-comus-copper-subtle/40 border-2 border-comus-copper/30 rounded-3xl p-6 sm:p-7 shadow-soft-lg relative overflow-hidden my-4">
      {/* Badge & Lead time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-comus-copper text-white text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Öngörü Uyarısı</span>
          </span>
          <span className="text-xs font-medium text-comus-copper-dark bg-white/80 px-2.5 py-1 rounded-full border border-comus-copper/20">
            %{Math.round(alert.similarityScore * 100)} Örüntü Eşleşmesi
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-comus-sand-dark">
          <Clock className="w-3.5 h-3.5" />
          <span>{alert.leadDays} Gün Öncü Tespit</span>
        </div>
      </div>

      {/* Title & Body */}
      <h3 className="text-lg sm:text-xl font-serif font-bold text-comus-navy mb-2 leading-snug">
        {alert.title}
      </h3>
      <p className="text-sm text-comus-sand-dark leading-relaxed mb-4">
        {alert.explanation}
      </p>

      {/* Suggested Action Box */}
      <div className="p-4 rounded-2xl bg-white/90 border border-comus-copper/20 mb-5">
        <div className="text-xs font-bold uppercase tracking-wider text-comus-copper mb-1">
          Önerilen Eylem Adımı
        </div>
        <p className="text-sm text-comus-navy font-medium leading-relaxed">
          {alert.recommendedAction}
        </p>
      </div>

      {/* Action Buttons */}
      {planned ? (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Hatırlatıcı ve Eylem Planı Takvime Eklendi</span>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-700 hover:text-emerald-900 underline font-medium"
          >
            Kapat
          </button>
        </div>
      ) : showPlanInput ? (
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-comus-sand-light/30">
          <label className="block text-xs font-medium text-comus-navy">
            Plan Notun (isteğe bağlı):
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Örn: Bu akşam 22:30'da telefonu bırakıp yürüyüşe çıkacağım"
            className="w-full text-xs p-3 rounded-xl bg-comus-surface border border-comus-sand-light/40 focus:outline-none focus:border-comus-copper"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPlanInput(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-comus-sand-dark hover:bg-comus-surface"
            >
              Vazgeç
            </button>
            <button
              onClick={handlePlanAction}
              className="px-4 py-1.5 rounded-xl bg-comus-copper text-white text-xs font-semibold hover:bg-comus-copper-dark transition-colors flex items-center gap-1"
            >
              <span>Planı Kaydet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-comus-sand-dark hover:text-comus-navy hover:bg-white/60 transition-colors"
          >
            Şimdi Değil
          </button>

          <button
            onClick={() => setShowPlanInput(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-comus-copper hover:bg-comus-copper-dark text-white text-xs sm:text-sm font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-200"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Plan Yap & Hatırlatıcı Oluştur</span>
          </button>
        </div>
      )}
    </div>
  );
};
