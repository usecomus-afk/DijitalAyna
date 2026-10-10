import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import { healthService } from '../../services/native/healthService';

export const HealthKitSyncPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRequest = async () => {
    const res = await healthService.requestHealthPermissions();
    if (res.granted) {
      alert('Apple Sağlık izinleri başarıyla tanımlandı. Artık Ayarlar -> Sağlık -> Veri Erişimi ve Aygıtlar sekmesinde uygulamayı görebilirsiniz.');
    } else {
      alert(res.error || 'İzin reddedildi veya donanım desteklemiyor.');
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-comus-navy">Apple Sağlık (HealthKit)</h1>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
              Apple Sağlık (HealthKit)
            </h3>
            <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
              Adım, uyku ve fiziksel aktivite verileriniz için iOS Sağlık uygulaması ile eşitleme
            </p>
          </div>
        </div>

        <p className="text-xs text-comus-sand-dark leading-relaxed">
          Dijital Mental İkizim'in Apple Sağlık veri kaynakları (Data Sources &amp; Access) listesinde görünebilmesi ve uyku/hareket analizleri yapabilmesi için aşağıdaki butona tıklayarak izin verin.
        </p>

        <button
          onClick={handleRequest}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          Sağlık İzinlerini İste / Güncelle
        </button>
      </div>
    </div>
  );
};
