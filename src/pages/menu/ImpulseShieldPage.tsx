import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { FamilyControls } from 'comus-family-controls';
import { DigitalNarcoticModal } from '../../components/shield/DigitalNarcoticModal';

export const ImpulseShieldPage: React.FC = () => {
  const navigate = useNavigate();
  const [showNarcoticModal, setShowNarcoticModal] = useState(false);

  const handleSelectApps = async () => {
    try {
      const authRes = await FamilyControls.requestAuthorization();
      if (authRes.granted) {
        await FamilyControls.selectApps();
      } else {
        alert('Apple Family Controls izni reddedildi.');
      }
    } catch (e: any) {
      alert('Hata: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Finansal Huzur ve Dürtü Kalkanı</h1>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
              Finansal Huzur ve Dürtü Kalkanı
            </h3>
            <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
              Gece uykusuz kaldığın kırılgan anlarda seçtiğin uygulamaların önüne 60 saniyelik sakinleştirici bir nefes perdesi koyar.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleSelectApps}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-center cursor-pointer"
          >
            Korunacak Uygulamaları Seç
          </button>
          <div className="flex gap-2">
            <button
              onClick={async () => { await FamilyControls.setShield(); alert('Kalkan Aktif!'); }}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700"
            >
              Test: Kalkanı Kur
            </button>
            <button
              onClick={async () => { await FamilyControls.clearShield(); alert('Kalkan Kaldırıldı!'); }}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700"
            >
              Test: Kalkanı İndir
            </button>
            <button
              onClick={() => setShowNarcoticModal(true)}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700"
            >
              Test: Kalkan Arayüzü
            </button>
          </div>
        </div>
      </div>

      <DigitalNarcoticModal isOpen={showNarcoticModal} onClose={() => setShowNarcoticModal(false)} />
    </div>
  );
};
