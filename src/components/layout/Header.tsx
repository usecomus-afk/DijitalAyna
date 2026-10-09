import React, { useState } from 'react';
import { ShieldCheck, RotateCw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { forceAppUpdate } from '../../utils/updateManager';
import logoImg from '../../assets/logo.png';

export const Header: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRefreshApp = async () => {
    setIsUpdating(true);
    await forceAppUpdate();
  };

  return (
    <header className="sticky top-0 z-40 bg-comus-bg/95 backdrop-blur-md border-b border-comus-sand-light/20 px-4 pb-3 sm:px-6" style={{ paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)' }}>
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand with New Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-comus-sand-light/30 shadow-soft group-hover:scale-105 transition-transform">
            <img src={logoImg} alt="Dijital Mental İİkizim Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-comus-navy tracking-tight">Dijital Mental İİkizim</span>
            </div>
            <p className="text-[11px] text-comus-sand-dark flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>Cihaz İçi Biyobelirteçler</span>
            </p>
          </div>
        </NavLink>

        {/* Actions & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Refresh / Clear Cache Button */}
          <button
            onClick={handleRefreshApp}
            disabled={isUpdating}
            className="p-2 rounded-xl bg-white border border-comus-sand-light/30 shadow-soft hover:bg-comus-surface text-comus-sand-dark hover:text-comus-navy transition-all cursor-pointer"
            title="Uygulamayı Yenile ve Son Sürümü Al"
            aria-label="Uygulamayı Yenile"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-comus-copper' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
