import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface DisclaimerProps {
  className?: string;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-start gap-2 py-3 px-4 rounded-xl bg-comus-sand-subtle border border-comus-sand-light/30 text-xs text-comus-sand-dark leading-relaxed ${className}`}>
      <ShieldCheck className="w-4 h-4 text-comus-navy/60 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-comus-navy">Önemli Hatırlatma:</span> ComusAI bir tıbbi teşhis aracı değildir. Sunulan tüm analizler, kişisel dijital baz hattınızdan istatistiksel sapmaları gösteren farkındalık içgörüleridir.
      </div>
    </div>
  );
};
