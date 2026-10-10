import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, ClipboardList, Fingerprint, BookHeart, Stethoscope, 
  Pill, ActivitySquare, ShieldCheck, FileText, Bell, Heart, Shield, Settings, ChevronRight 
} from 'lucide-react';

export const MenuHubPage: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    { title: "Erken Farkındalık Sağlanan 9 Klinik Durum", icon: Activity, path: "/menu/clinical-conditions" },
    { title: "Anksiyete & Depresyon Riski Anketi", icon: ClipboardList, path: "/menu/clinical-survey" },
    { title: "Dijital Biyobelirteçler Tablosu", icon: Fingerprint, path: "/menu/biomarker-bridge" },
    { title: "Günlük", icon: BookHeart, path: "/menu/journal-history" },
    { title: "Doktorumla Paylaş", icon: Stethoscope, path: "/menu/doctor-share" },
    { title: "Günlük İlaç Kullanım Tablosu", icon: Pill, path: "/menu/medication-tracker" },
    { title: "Sayısal Göstergeler & EWMA", icon: ActivitySquare, path: "/menu/ewma-deviations" },
    { title: "Etik ve Güven Temelli Bir Platform", icon: ShieldCheck, path: "/menu/ethics-and-science" },
    { title: "Önemli Bilgilendirme ve Yasal Feragatnameler", icon: FileText, path: "/menu/legal-disclaimers" },
    { title: "Huzur & İlham Bildirimleri", icon: Bell, path: "/menu/inspiration-notifications" },
    { title: "Apple Sağlık (HealthKit)", icon: Heart, path: "/menu/healthkit-sync" },
    { title: "Finansal Huzur ve Dürtü Kalkanı", icon: Shield, path: "/menu/impulse-shield" },
    { title: "Ayarlar", icon: Settings, path: "/menu/settings" },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-comus-navy mb-2">Menü</h1>
        <p className="text-comus-sand-dark">Tüm özelliklere ve ayarlara buradan ulaşabilirsiniz.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-comus-sand-light/30 hover:bg-comus-sand-light/10 transition-colors w-full text-left"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-comus-navy font-medium">{item.title}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-comus-sand-dark" />
          </button>
        ))}
      </div>
    </div>
  );
};
