import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Fingerprint,
  ActivitySquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClinicalConditionsPage } from './ClinicalConditionsPage';
import { BiomarkerBridgeTable } from '../../components/biomarkers/BiomarkerBridgeTable';
import { EWMADeviationsPage } from './EWMADeviationsPage';

export type DigitalBiomarkerSubSection =
  | 'clinical-conditions'
  | 'biomarker-table'
  | 'ewma';

interface SubMenuItem {
  id: DigitalBiomarkerSubSection;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}

const SUB_MENU_ITEMS: SubMenuItem[] = [
  {
    id: 'clinical-conditions',
    title: 'Erken Farkındalık Sağlanan 9 Klinik Durum',
    subtitle: 'Davranışsal örüntüler ve erken farkındalık eşikleri',
    icon: Activity,
  },
  {
    id: 'biomarker-table',
    title: 'Dijital Biyobelirteçler Tablosu',
    subtitle: 'Cihaz etkileşimlerinizin duygusal ritim karşılıkları',
    icon: Fingerprint,
  },
  {
    id: 'ewma',
    title: 'Sayısal Göstergeler & EWMA',
    subtitle: 'Kişisel baz hattınız ve standart sapma (σ) analizleri',
    icon: ActivitySquare,
  },
];

export const DigitalBiomarkersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get('section') as DigitalBiomarkerSubSection | null;

  const [activeSection, setActiveSection] = useState<DigitalBiomarkerSubSection | null>(
    initialParam && ['clinical-conditions', 'biomarker-table', 'ewma'].includes(initialParam)
      ? initialParam
      : null
  );

  useEffect(() => {
    const param = searchParams.get('section') as DigitalBiomarkerSubSection | null;
    if (param && ['clinical-conditions', 'biomarker-table', 'ewma'].includes(param)) {
      setActiveSection(param);
    }
  }, [searchParams]);

  const handleToggleSection = (id: DigitalBiomarkerSubSection) => {
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
      {/* Page Header */}
      <div className="flex items-center space-x-3 mb-2">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 -ml-2 text-comus-sand-dark hover:text-comus-navy transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-comus-navy">
            Dijital Biyobelirteçler
          </h1>
          <p className="text-xs text-comus-sand-dark mt-0.5">
            İncelemek istediğiniz alt başlığı seçerek açabilirsiniz.
          </p>
        </div>
      </div>

      {/* Sayfa İçi Seçilerek Açılan İç Menü (Alt Başlıklar) */}
      <div className="space-y-3">
        {SUB_MENU_ITEMS.map((item) => {
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
                  {item.id === 'clinical-conditions' && <ClinicalConditionsPage embedded />}
                  {item.id === 'biomarker-table' && <BiomarkerBridgeTable />}
                  {item.id === 'ewma' && <EWMADeviationsPage embedded />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
