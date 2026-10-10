import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const LegalDisclaimerPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Yasal Feragatnameler</h1>
      </div>

      <div className="bg-amber-50/70 rounded-3xl p-6 sm:p-7 shadow-soft border border-amber-200/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-900">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-amber-950">
              Önemli Bilgilendirme ve Yasal Feragatnameler
            </h3>
            <p className="text-xs text-amber-800">
              Hukuki sorumluluk sınırları, acil durum kanalları ve ilişki beyanı
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-amber-950 leading-relaxed">
          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>Temel Feragatname:</strong> Dijital Mental İkizim, tıbbi tavsiye, teşhis veya tedavi sunmaz. Uygulama içindeki analizler istatistiksel verilere dayanır ve hata payı içerebilir.
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <strong>Acil Durumlar:</strong>
              <div className="flex items-center gap-2">
                <a href="tel:112" className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                  112 Acil
                </a>
                <a href="tel:182" className="px-2 py-0.5 rounded bg-indigo-700 text-white font-bold text-[10px]">
                  Alo 182 Ruh Sağlığı
                </a>
              </div>
            </div>
            <span>Herhangi bir ruhsal sorun veya acil durumda derhal bir uzmana başvurulmalıdır. Acil durumlar için: 112 Acil veya Alo 182 Ruh Sağlığı Hattı.</span>
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>Sorumluluk Reddi:</strong> Uygulamanın kullanımından doğabilecek riskler kullanıcıya aittir.
          </div>

          <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1">
            <strong>İlişki Beyanı:</strong> Uygulama kullanımı, Dijital Mental İkizim ile kullanıcı arasında 'doktor-hasta' veya 'terapist-danışan' ilişkisi kurmaz.
          </div>
        </div>
      </div>
    </div>
  );
};
