import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fingerprint,
  Stethoscope,
  Pill,
  ShieldCheck,
  FileText,
  Bell,
  Heart,
  Shield,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useViewportScrollLock } from '../../hooks/useViewportScrollLock';

interface SubMenuEntry {
  title: string;
  icon: React.FC<{ className?: string }>;
  path: string;
}

interface MenuEntry {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.FC<{ className?: string }>;
  path?: string;
  subItems?: SubMenuEntry[];
}

export const MenuHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [isMenuExpanded, setIsMenuExpanded] = useState<boolean>(false);

  // Lock vertical scrolling until "İncele" is clicked (or a sub-menu expands the page)
  useViewportScrollLock(!isMenuExpanded && openGroupId === null);

  const primaryMenuItems: MenuEntry[] = [
    {
      id: 'digital-biomarkers',
      title: 'Dijital Biyobelirteçler',
      subtitle: '9 Klinik Durum, Biyobelirteçler Tablosu, Sayısal Göstergeler & EWMA',
      icon: Fingerprint,
      path: '/menu/digital-biomarkers',
    },
    {
      id: 'doctor-share',
      title: 'Doktorumla Paylaş',
      icon: Stethoscope,
      path: '/menu/doctor-share',
    },
    {
      id: 'medication-tracker',
      title: 'Günlük İlaç Kullanım Tablosu',
      icon: Pill,
      path: '/menu/medication-tracker',
    },
    {
      id: 'notifications',
      title: 'Bildirimler',
      subtitle: 'Huzur & İlham, İlaç Hatırlatma ve Farkındalık Bildirimleri',
      icon: Bell,
      subItems: [
        {
          title: 'Huzur & İlham Bildirimleri',
          icon: Sparkles,
          path: '/menu/notifications?section=inspiration',
        },
        {
          title: 'İlaç Hatırlatma Bildirimleri',
          icon: Pill,
          path: '/menu/notifications?section=medication',
        },
        {
          title: 'Farkındalık Bildirimleri',
          icon: Bell,
          path: '/menu/notifications?section=awareness',
        },
      ],
    },
    {
      id: 'essentials',
      title: 'Bilinmesi Gerekenler',
      subtitle: 'Etik İlkeler, Önemli Bilgilendirme ve Yasal Feragatnameler',
      icon: BookOpen,
      subItems: [
        {
          title: 'Etik ve Güven Temelli Bir Platform',
          icon: ShieldCheck,
          path: '/menu/essentials?section=ethics',
        },
        {
          title: 'Önemli Bilgilendirme ve Yasal Feragatnameler',
          icon: FileText,
          path: '/menu/essentials?section=legal',
        },
      ],
    },
  ];

  const secondaryMenuItems: MenuEntry[] = [
    {
      id: 'healthkit-sync',
      title: 'Apple Sağlık (HealthKit)',
      icon: Heart,
      path: '/menu/healthkit-sync',
    },
    {
      id: 'impulse-shield',
      title: 'Finansal Kontrol & Dürtü Kalkanı',
      icon: Shield,
      path: '/menu/impulse-shield',
    },
    {
      id: 'settings',
      title: 'Ayarlar',
      icon: Settings,
      path: '/menu/settings',
    },
  ];

  const visibleItems = isMenuExpanded
    ? [...primaryMenuItems, ...secondaryMenuItems]
    : primaryMenuItems;

  const handleGroupToggle = (id: string) => {
    setOpenGroupId((prev) => {
      const next = prev === id ? null : id;
      if (next !== null) {
        setIsMenuExpanded(true);
      }
      return next;
    });
  };

  return (
    <div className={`space-y-3 animate-fadeIn ${isMenuExpanded ? 'pb-20' : ''}`}>
      <div className="grid grid-cols-1 gap-2.5">
        {visibleItems.map((item) => {
          const hasSubMenu = Boolean(item.subItems && item.subItems.length > 0);
          const isOpen = openGroupId === item.id;
          const Icon = item.icon;

          if (!hasSubMenu) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => item.path && navigate(item.path)}
                className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-sm border border-comus-sand-light/30 hover:bg-comus-sand-light/10 transition-colors w-full text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-comus-copper-subtle flex items-center justify-center text-comus-copper shrink-0">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base text-comus-navy font-medium block truncate">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[11px] text-comus-sand-dark block mt-0.5 truncate">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-comus-sand-dark shrink-0" />
              </button>
            );
          }

          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isOpen
                  ? 'bg-stone-50/70 border-comus-copper/40 shadow-soft'
                  : 'bg-white border-comus-sand-light/30 shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => handleGroupToggle(item.id)}
                aria-expanded={isOpen}
                className="flex items-center justify-between p-3.5 hover:bg-comus-sand-light/10 transition-colors w-full text-left cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isOpen
                        ? 'bg-comus-navy text-white'
                        : 'bg-comus-copper-subtle text-comus-copper'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base text-comus-navy font-medium block truncate">
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span className="text-[11px] text-comus-sand-dark block mt-0.5 truncate">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-comus-copper shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-comus-sand-dark shrink-0" />
                )}
              </button>

              {isOpen && item.subItems && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-comus-sand-light/25 animate-fadeIn">
                  {item.subItems.map((sub, subIdx) => {
                    const SubIcon = sub.icon;
                    return (
                      <button
                        key={subIdx}
                        type="button"
                        onClick={() => navigate(sub.path)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-comus-surface border border-comus-sand-light/30 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-comus-copper-subtle/70 text-comus-copper flex items-center justify-center shrink-0">
                            <SubIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-comus-navy">
                            {sub.title}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-comus-sand-dark shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* İncele Toggle Button */}
      <div className="pt-1 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setIsMenuExpanded((prev) => {
              const next = !prev;
              if (!next) setOpenGroupId(null);
              return next;
            });
          }}
          aria-expanded={isMenuExpanded}
          className="w-full sm:w-auto min-w-[200px] py-2.5 px-5 rounded-2xl bg-comus-navy text-white hover:bg-comus-navy-light font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-soft cursor-pointer"
        >
          <span>{isMenuExpanded ? 'Ayrıntıları Gizle' : 'İncele'}</span>
          {isMenuExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
