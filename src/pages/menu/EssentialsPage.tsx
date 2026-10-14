import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EthicsAndSciencePage } from './EthicsAndSciencePage';
import { LegalDisclaimerPage } from './LegalDisclaimerPage';

export type EssentialsSubSection = 'ethics' | 'legal';

interface EssentialsSubItem {
  id: EssentialsSubSection;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}

const ESSENTIALS_ITEMS: EssentialsSubItem[] = [
  {
    id: 'ethics',
    title: 'Etik ve Güven Temelli Bir Platform',
    subtitle: 'Kullanıcı mahremiyeti ve veri egemenliğini koruyan 5 temel prensibimiz',
    icon: ShieldCheck,
  },
  {
    id: 'legal',
    title: 'Önemli Bilgilendirme ve Yasal Feragatnameler',
    subtitle: 'Hukuki sorumluluk sınırları, acil durum kanalları ve ilişki beyanı',
    icon: FileText,
  },
];

export const EssentialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('section') as EssentialsSubSection | null;

  const [activeSection, setActiveSection] = useState<EssentialsSubSection | null>(
    initialParam && ['ethics', 'legal'].includes(initialParam)
      ? initialParam
      : null
  );

  useEffect(() => {
    const param = searchParams.get('section') as EssentialsSubSection | null;
    if (param && ['ethics', 'legal'].includes(param)) {
      setActiveSection(param);
    }
  }, [searchParams]);

  const handleToggleSection = (id: EssentialsSubSection) => {
    const next = activeSection === id ? null : id;
    setActiveSection(next);
    if (next) {
      setSearchParams({ section: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fadeIn">
      <div className="flex items-center space-x-3 mb-2">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-comus-navy">
            Bilinmesi Gerekenler
          </h1>
          <p className="text-xs text-comus-sand-dark mt-0.5">
            Etik ilkelerimizi ve yasal feragatnameleri alt başlıklardan inceleyebilirsiniz.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {ESSENTIALS_ITEMS.map((item) => {
          const isOpen = activeSection === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className={`rounded-3xl border transition-all overflow-hidden ${
                isOpen
                  ? 'bg-stone-50/70 border-comus-copper/40 shadow-soft'
                  : 'bg-white border-comus-sand-light/30 shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleSection(item.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-comus-sand-light/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isOpen
                        ? 'bg-comus-navy text-white'
                        : 'bg-comus-copper-subtle text-comus-copper'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-bold text-comus-navy">
                      {item.title}
                    </div>
                    <div className="text-xs text-comus-sand-dark mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isOpen
                      ? 'bg-comus-copper/15 text-comus-copper-dark'
                      : 'bg-stone-100 text-comus-sand-dark'
                  }`}
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 sm:p-5 pt-2 border-t border-comus-sand-light/25 animate-fadeIn">
                  {item.id === 'ethics' && <EthicsAndSciencePage embedded />}
                  {item.id === 'legal' && <LegalDisclaimerPage embedded />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
