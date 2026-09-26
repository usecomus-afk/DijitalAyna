import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck, RotateCw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useMentalTwinAvatar } from '../../hooks/useMentalTwinAvatar';
import { forceAppUpdate } from '../../utils/updateManager';
import logoImg from '../../assets/logo.png';

export const Header: React.FC = () => {
  const { setEmergencyModalOpen } = useAppStore();
  const { avatarSrc, colorClass, avatarAlt } = useMentalTwinAvatar();
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
            <img src={logoImg} alt="Dijital Mental İkizim Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-comus-navy tracking-tight">Dijital Mental İkizim</span>
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

          {/* Digital Mental Twin 3D Avatar Button */}
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-comus-surface border border-comus-sand-light/40 text-xs font-semibold text-comus-navy shadow-soft hover:shadow-soft-lg transition-all group relative cursor-pointer"
            title="Dijital Mental İkiz Avatarı"
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-comus-sand-light/40 group-hover:scale-110 transition-transform">
              <img
                src={avatarSrc}
                alt={avatarAlt}
                className="w-full h-full object-cover"
              />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white animate-pulse ${colorClass}`} />
            </div>
            <span className="hidden xs:inline text-comus-navy font-medium">Mental İkiz</span>
          </button>
        </div>
      </div>
    </header>
  );
};
