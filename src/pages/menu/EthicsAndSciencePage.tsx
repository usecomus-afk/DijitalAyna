import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';

const PRINCIPLES = [
  {
    title: '1. Şeffaflık',
    text: 'Hangi verinin neden toplandığını her zaman bilirsiniz. Gizli arka plan telemetrisi bulunmaz.',
  },
  {
    title: '2. Kullanıcı Kontrolü',
    text: 'Verilerinizin sahibi sizsiniz. İstediğiniz an silebilir, durdurabilir veya dışa aktarabilirsiniz.',
  },
  {
    title: '3. KVKK / GDPR Uyumu',
    text: "Veriler en yüksek güvenlik standartlarıyla sadece yerel IndexedDB'de korunur ve yasalara uygun işlenir.",
  },
  {
    title: "4. 'Tanı Koymaz' Prensibi",
    text: 'Amacımız tıbbi teşhis koymak değil, erken istatistiksel farkındalık sunup profesyonel yardıma yönlendirmektir.',
  },
  {
    title: '5. Gizlilik Odaklı Tasarım (Zero-Raw Content)',
    text: 'Analizlerimiz tamamen davranışsaldır. Yazdığınız metinler, mesajlar, e-postalar veya ses kayıtları ASLA okunmaz ve kaydedilmez.',
  },
];

export const EthicsAndSciencePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Etik ve Güven</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Etik ve Güven Temelli Bir Platform
            </h3>
            <p className="text-xs text-comus-sand-dark">
              Kullanıcı mahremiyeti ve veri egemenliğini koruyan 5 temel prensibimiz
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="p-3.5 rounded-2xl bg-comus-surface border border-comus-sand-light/30 space-y-1 text-xs">
              <div className="font-bold text-comus-navy flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>{p.title}</span>
              </div>
              <p className="text-comus-sand-dark leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
