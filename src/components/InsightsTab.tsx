import React from 'react';
import { Brain, FileText, AlertCircle, BookOpen } from 'lucide-react';

export const InsightsTab: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-soft relative overflow-hidden mt-4">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Brain className="w-24 h-24 text-amber-600" />
      </div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">
              Bilişsel İcra ve Ritim Farkındalığı
            </h3>
            <p className="text-sm font-medium text-amber-700">
              Hafıza Takibi, Dilsel Akıcılık ve Sirkadiyen Uyum
            </p>
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-2">
          <div className="text-xs font-semibold text-amber-800">Eşik Özeti:</div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Eşzamanlı dilsel duraksama (pause &gt;2000ms), sirkadiyen düzensizlik (SRI &lt;%60) ve rutin atlama sapması saptandığında.
          </p>
        </div>

        <p className="text-sm text-comus-sand-dark leading-relaxed">
          "Son haftalarda hatırlatıcı takibi, yazım duraksamaları ve günlük ritim düzenliliğinde kişisel bazal ortalamanızdan farklılaşan bir eğilim tespit edildi. Modern dijital fenotipleme literatüründe bu göstergeler zihinsel yorgunluk, metabolik etkenler veya bilişsel icra yavaşlaması ihtimaline işaret edebilir. Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir."
        </p>

        <div className="flex items-start gap-2 text-xs text-comus-sand-dark italic border-t border-comus-sand-light/20 pt-3 mt-1">
          <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
          <span>Kaynak: McKenna et al. (2025); Al-Hindawi et al. (2025); Boyle et al. (2025); Moon et al. (2025).</span>
        </div>

        <div className="pt-2">
          <button className="w-full flex items-center justify-center gap-2 bg-comus-navy text-white py-3 rounded-2xl font-medium text-sm transition-transform active:scale-95 hover:bg-comus-navy/90">
            <FileText className="w-4 h-4" />
            Hekim Paylaşım Raporuna Ekle (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};
