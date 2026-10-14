import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Sparkles, Wind, HeartPulse, Menu } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    {
      to: '/ayna',
      label: 'Ayna',
      icon: Activity,
    },
    {
      to: '/icgoru',
      label: 'İçgörü',
      icon: Sparkles,
    },
    {
      to: '/nefes-egzersizi',
      label: 'Nefes Egzersizi',
      icon: Wind,
    },
    {
      to: '/nasil-hissediyorsun',
      label: 'Nasıl hissediyorsun?',
      icon: HeartPulse,
    },
    {
      to: '/menu',
      label: 'Menü',
      icon: Menu,
    },
  ];

  return (
    <nav
      className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-comus-sand-light/30 shadow-[0_-4px_20px_rgba(30,58,95,0.04)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      <div className="max-w-xl mx-auto grid grid-cols-5 h-16 items-center px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center justify-center h-full w-full py-1 rounded-2xl relative transition-colors duration-150 ${
                isActive
                  ? 'text-comus-copper font-semibold'
                  : 'text-comus-sand-dark hover:text-comus-navy'
              }`
            }
          >
            {({ isActive }) => (
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-comus-copper-subtle text-comus-copper shadow-2xs scale-105'
                    : 'hover:bg-comus-surface/70'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.3px]' : 'stroke-[1.9px]'
                  }`}
                />
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

