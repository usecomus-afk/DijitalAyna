import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Smartphone, Cloud, Activity, User, Trash2, 
  ToggleLeft, ToggleRight, Download, Upload 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock states for toggles
  const [toggles, setToggles] = useState({
    motion: true,
    location: false,
    ambientLight: true,
    battery: true,
    network: true,
    localNotifications: true
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleItem = ({ label, toggleKey }: { label: string, toggleKey: keyof typeof toggles }) => (
    <div className="flex items-center justify-between py-3 border-b border-comus-sand-light/20 last:border-0">
      <span className="text-comus-navy font-medium">{label}</span>
      <button onClick={() => handleToggle(toggleKey)} className="text-comus-copper transition-colors">
        {toggles[toggleKey] ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-comus-sand-dark" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate('/menu')} className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-comus-navy">Ayarlar</h1>
      </div>

      {/* 1. Cihaz Sensör & Bildirim Ayarları */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <div className="flex items-center space-x-3 mb-4">
          <Smartphone className="w-6 h-6 text-comus-copper" />
          <h2 className="text-lg font-semibold text-comus-navy">Cihaz Sensör & Bildirim Ayarları</h2>
        </div>
        <div className="flex flex-col">
          <ToggleItem label="Hareketlilik (Motion)" toggleKey="motion" />
          <ToggleItem label="Konum (Location)" toggleKey="location" />
          <ToggleItem label="Ortam Işığı (Ambient Light)" toggleKey="ambientLight" />
          <ToggleItem label="Pil (Battery)" toggleKey="battery" />
          <ToggleItem label="Ağ (Network)" toggleKey="network" />
          <ToggleItem label="Yerel Bildirimler" toggleKey="localNotifications" />
        </div>
      </section>

      {/* 2. Bulut Senkronizasyonu & Yedekleme */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <div className="flex items-center space-x-3 mb-4">
          <Cloud className="w-6 h-6 text-comus-copper" />
          <h2 className="text-lg font-semibold text-comus-navy">Bulut Senkronizasyonu & Yedekleme</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-comus-navy font-medium">Bulut Yedekleme Aktif</span>
          </div>
          <p className="text-xs text-comus-sand-dark">Son yedekleme: 12 Ekim 2026, 14:32</p>
          <div className="flex space-x-3 mt-4">
            <button className="flex-1 bg-comus-copper text-white py-2 rounded-xl text-sm font-semibold hover:bg-comus-copper-dark transition-colors">
              Şimdi Yedekle
            </button>
          </div>
          <div className="flex space-x-3 pt-2">
            <button className="flex-1 flex items-center justify-center space-x-2 bg-comus-sand-light/20 text-comus-navy py-2 rounded-xl text-xs font-semibold hover:bg-comus-sand-light/40 transition-colors">
              <Download className="w-4 h-4" /> <span>Dışa Aktar (JSON)</span>
            </button>
            <button className="flex-1 flex items-center justify-center space-x-2 bg-comus-sand-light/20 text-comus-navy py-2 rounded-xl text-xs font-semibold hover:bg-comus-sand-light/40 transition-colors">
              <Upload className="w-4 h-4" /> <span>İçe Aktar (JSON)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Cihaz İçi Baz Hattı Durumu */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-comus-copper" />
          <h2 className="text-lg font-semibold text-comus-navy">Cihaz İçi Baz Hattı Durumu</h2>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-comus-navy">EWMA Öğrenme İlerlemesi (10/14 Gün)</p>
          <div className="w-full bg-comus-sand-light/30 rounded-full h-3">
            <div className="bg-comus-copper h-3 rounded-full" style={{ width: '71%' }}></div>
          </div>
          <p className="text-xs text-comus-sand-dark">Bazal kalibrasyon durumu: Öğreniyor...</p>
        </div>
      </section>

      {/* 4. Profil Yönetimi */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-comus-sand-light/30">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-6 h-6 text-comus-copper" />
          <h2 className="text-lg font-semibold text-comus-navy">Profil Yönetimi</h2>
        </div>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-comus-sand-dark">Ad</label>
              <input type="text" className="w-full p-2 border border-comus-sand-light rounded-lg bg-comus-sand-light/10" defaultValue="Kullanıcı" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-comus-sand-dark">Soyad</label>
              <input type="text" className="w-full p-2 border border-comus-sand-light rounded-lg bg-comus-sand-light/10" defaultValue="Test" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-comus-sand-dark">Yaş</label>
              <input type="number" className="w-full p-2 border border-comus-sand-light rounded-lg bg-comus-sand-light/10" defaultValue={30} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-comus-sand-dark">Cinsiyet</label>
              <select className="w-full p-2 border border-comus-sand-light rounded-lg bg-comus-sand-light/10">
                <option>Belirtilmemiş</option>
                <option>Kadın</option>
                <option>Erkek</option>
              </select>
            </div>
          </div>
          <div className="space-y-1 pt-2">
            <label className="text-xs text-comus-sand-dark">E-posta Adresi</label>
            <input type="email" className="w-full p-2 border border-comus-sand-light rounded-lg bg-comus-sand-light/10" defaultValue="kullanici@example.com" disabled />
          </div>
          <button className="text-comus-copper text-xs font-semibold hover:underline">Şifre Değiştir / Güvenlik Ayarları</button>
        </div>
      </section>

      {/* 5. Veri Yönetimi & Kalıcı Sıfırlama */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-red-100">
        <div className="flex items-center space-x-3 mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-semibold text-red-600">Veri Yönetimi & Kalıcı Sıfırlama</h2>
        </div>
        <div className="space-y-3">
          <button className="w-full bg-red-50 text-red-600 py-3 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200">
            Cihazdaki Tüm Geçmiş Verileri Temizle
          </button>
          <button className="w-full bg-red-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            Hesabı ve Verileri Kalıcı Olarak Sil
          </button>
        </div>
      </section>
      
      <div className="h-4"></div>
    </div>
  );
};
