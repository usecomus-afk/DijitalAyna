import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { getAvatarByScore } from '../../constants/avatars';

export const Header: React.FC = () => {
  const { userProfile, setEmergencyModalOpen } = useAppStore();
  const latestMood = useLiveQuery(() => db.moodReports.orderBy('timestamp').reverse().first());

  // Determine indicator color based on emotion score
  const moodScore = latestMood?.score || 3;
  const avatarThumb = getAvatarByScore(moodScore);
  const moodDotColor =
    moodScore <= 2
      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
      : moodScore === 3
      ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)]'
      : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';

  return (
    <header className="sticky top-0 z-40 bg-comus-bg/90 backdrop-blur-md border-b border-comus-sand-light/20 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand with New Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 border border-comus-sand-light/30 shadow-soft group-hover:scale-105 transition-transform">
            <img src="/logo.png" alt="ComusAI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg text-comus-navy tracking-tight">Dijital Ayna</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-comus-copper/15 text-comus-copper-dark">
                AI
              </span>
            </div>
            <p className="text-[11px] text-comus-sand-dark flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              <span>Cihaz İçi Gizlilik (IndexedDB)</span>
            </p>
          </div>
        </NavLink>

        {/* Actions & Real User Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Profile Link */}
          <NavLink
            to="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-comus-sand-light/30 shadow-soft hover:bg-comus-surface transition-all text-xs font-medium text-comus-navy"
          >
            {userProfile.picture ? (
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-comus-navy-subtle flex items-center justify-center text-comus-navy text-[10px] font-bold">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold max-w-[100px] truncate">{userProfile.name}</span>
            {userProfile.isGoogleConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Google ile Bağlı" />
            )}
          </NavLink>

          {/* Digital Mental Twin 3D Avatar Button */}
          <button
            onClick={() => setEmergencyModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-comus-surface border border-comus-sand-light/40 text-xs font-semibold text-comus-navy shadow-soft hover:shadow-soft-lg transition-all group relative"
            title="Dijital Mental İkiz Avatarı"
          >
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-comus-sand-light/40 group-hover:scale-110 transition-transform">
              <img
                src={avatarThumb}
                alt="Mental İkiz"
                className="w-full h-full object-cover"
              />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white animate-pulse ${moodDotColor}`} />
            </div>
            <span className="hidden xs:inline text-comus-navy font-medium">Mental İkiz</span>
          </button>
        </div>
      </div>
    </header>
  );
};
