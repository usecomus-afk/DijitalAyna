import React, { useState } from 'react';
import { X, CheckCircle, ChevronRight, Share, Download, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DoctorShareWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockChartData = [
  { day: 'Pzt', subjective: 6, objective: 3 },
  { day: 'Sal', subjective: 5, objective: 4 },
  { day: 'Çar', subjective: 4, objective: 2 },
  { day: 'Per', subjective: 6, objective: 5 },
  { day: 'Cum', subjective: 7, objective: 4 },
];

export const DoctorShareWizard: React.FC<DoctorShareWizardProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [selectedData, setSelectedData] = useState({
    sleep: true,
    motion: true,
    typing: false,
    medication: true
  });

  if (!isOpen) return null;

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const toggleSelection = (key: keyof typeof selectedData) => {
    setSelectedData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">1. Adım: Veri Seçimi</h3>
            <p className="text-xs text-comus-sand-dark">
              Hekiminizle paylaşmak istediğiniz objektif veri türlerini seçin.
            </p>
            <div className="space-y-2">
              {Object.entries({
                sleep: 'Uyku Süresi ve Sirkadiyen Ritim',
                motion: 'Fiziksel Hareketlilik Endeksi',
                typing: 'Yazım Hızı ve Dinamiği',
                medication: 'İlaç Kullanım Takibi'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-comus-sand-light/40 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-comus-copper" 
                    checked={selectedData[key as keyof typeof selectedData]}
                    onChange={() => toggleSelection(key as keyof typeof selectedData)}
                  />
                  <span className="text-xs font-semibold text-comus-navy">{label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">2. Adım: Nesnel Karşılaştırma Grafiği</h3>
            <p className="text-[11px] text-comus-sand-dark">
              Öznel beyanınız (hatırladığınız) ile nesnel ölçümler (sensörler) arasındaki uyumsuzluk:
            </p>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-800">
              <strong>İçgörü:</strong> "Çok az uyudum" veya "Çok uyudum" hissine rağmen, Pzt-Çar günleri ekran aktiviteniz 03:00'e kadar sürdü. Toplam derin uyku: 4 saat.
            </div>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 10]} />
                  <Tooltip labelStyle={{ fontSize: '10px' }} itemStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="subjective" name="Öznel Algı (Saat)" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={2} />
                  <Line type="monotone" dataKey="objective" name="Nesnel Ölçüm (Saat)" stroke="#0f172a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-[10px] justify-center text-comus-sand-dark">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Öznel Algı</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-900"></div> Nesnel Ölçüm</span>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-comus-navy">3. Adım: Rapor Önizleme</h3>
            <div className="p-4 bg-comus-surface rounded-2xl border border-comus-sand-light/50 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div className="font-serif font-bold text-sm text-comus-navy flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Klinik Özet Raporu
                </div>
                <span className="text-[10px] text-stone-500">14-20 Ekim 2026</span>
              </div>
              <ul className="space-y-2 text-xs text-comus-sand-dark">
                <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-500" /> Hareketlilik: <strong>%15 Düştü</strong></li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-500" /> Uyku Düzeni: <strong>Bozuldu (SOL gecikmesi)</strong></li>
                <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-500" /> Gece Ekran: <strong>Artış (Ort. 45dk)</strong></li>
              </ul>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-comus-navy">Rapor Hazır</h3>
              <p className="text-xs text-comus-sand-dark">
                Raporunuz hekiminize iletilmek üzere hazırlandı. Güvenli bir şekilde paylaşabilirsiniz.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors">
                <Share className="w-5 h-5" />
                <span className="text-xs font-semibold">Uygulama ile Paylaş</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors">
                <Download className="w-5 h-5" />
                <span className="text-xs font-semibold">PDF İndir</span>
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative flex flex-col min-h-[400px]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-1 mb-6 pr-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-comus-copper' : 'bg-stone-100'}`} />
          ))}
        </div>

        <div className="flex-1">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-100">
          <button 
            onClick={handlePrev} 
            disabled={step === 1}
            className="px-4 py-2 text-xs font-semibold text-stone-500 disabled:opacity-30"
          >
            Geri
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="px-6 py-2 bg-comus-navy text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-soft hover:bg-comus-navy-light"
            >
              Devam Et <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-comus-copper text-white rounded-xl text-xs font-semibold shadow-soft hover:bg-comus-copper-dark"
            >
              Tamamla
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
