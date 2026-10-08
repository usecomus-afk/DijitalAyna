import React from 'react';
import { AlertTriangle, X, Calendar, Bell } from 'lucide-react';
interface ProactivePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProactivePredictionModal: React.FC<ProactivePredictionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleAddReminder = async () => {
    // Hatırlatma Ekle (sabah yürüyüşü)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    // Capacitor push/local notification service might be used. We'll use simple alert for web or local notif 
    // Usually handled by notificationService.
    alert('Sabah 09:00 için yürüyüş hatırlatıcısı eklendi!');
    onClose();
  };

  const handlePlanMake = () => {
    // Plan yap (kullanıcıyı takvim/hedefler sekmesine yönlendirebiliriz, şimdilik kapatıyoruz)
    alert('Takvime yönlendiriliyorsunuz...');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-comus-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border-2 border-indigo-100">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h2 className="font-serif font-bold text-xl text-comus-navy mb-2">
          Öngörü Uyarısı
        </h2>
        
        <p className="text-sm text-comus-sand-dark leading-relaxed mb-6">
          Son 3 gündür uyku saatin düzensizleşti ve ekran/oyun süren arttı. Bu örüntü genellikle sende dalgalı veya düşük bir hafta sonu öncesinde görülüyor. Yarın sabah için hafif bir yürüyüş planı yapmaya ne dersin?
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handlePlanMake}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-comus-navy text-white text-sm font-semibold hover:bg-comus-navy-light transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Plan Yap
          </button>
          
          <button 
            onClick={handleAddReminder}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Hatırlatma Ekle
          </button>
        </div>
      </div>
    </div>
  );
};
