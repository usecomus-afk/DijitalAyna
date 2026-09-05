import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Sparkles, LineChart, User, Sliders } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export const Navbar: React.FC = () => {
  const unreadInsights = useLiveQuery(() => db.insights.where('dismissed').equals(0).count()) || 0;

  const navItems = [
    {
      to: '/',
      label: 'Ayna',
      fullName: 'Duty Dijital Ayna',
      icon: Activity,
    },
    {
      to: '/insights',
      label: 'İçgörü',
      fullName: 'İçgörüler',
      icon: Sparkles,
      badge: unreadInsights > 0 ? unreadInsights : undefined,
    },
    {
      to: '/triggers',
      label: 'Günlük',
      fullName: 'Ruh Hali & Günlük',
      icon: LineChart,
    },
    {
      to: '/profile',
      label: 'Profil',
      fullName: 'Kullanıcı Profili',
      icon: User,
    },
    {
      to: '/settings',
      label: 'Ayarlar',
      fullName: 'Cihaz Ayarları',
      icon: Sliders,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-comus-sand-light/30 shadow-[0_-4px_20px_rgba(30,58,95,0.04)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      <div className="max-w-xl mx-auto grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.fullName}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center h-full w-full py-1 rounded-2xl relative transition-colors duration-150 ${
                isActive
                  ? 'text-comus-copper font-semibold'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-9 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-comus-copper-subtle text-comus-copper' : ''
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 transition-transform ${
                        isActive ? 'stroke-[2.2px]' : 'stroke-[1.8px]'
                      }`}
                    />
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-comus-copper text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10.5px] tracking-tight leading-none mt-1 text-center truncate max-w-[90%]">
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
