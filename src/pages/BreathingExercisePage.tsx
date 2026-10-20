import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type BreathPhase = 'inhale' | 'hold' | 'exhale';

interface BreathingPattern {
  id: string;
  name: string;
  subtitle: string;
  inhale: number;
  hold: number;
  exhale: number;
}

const BREATHING_PATTERNS: BreathingPattern[] = [
  {
    id: '4-7-8',
    name: '4-7-8 Derin Huzur',
    subtitle: 'Parasempatik sinir sistemini yatıştırır',
    inhale: 4,
    hold: 7,
    exhale: 8,
  },
  {
    id: '4-4-6',
    name: '4-4-6 Dengeli Ritim',
    subtitle: 'Kalp hızı değişkenliğini (HRV) dengeler',
    inhale: 4,
    hold: 4,
    exhale: 6,
  },
  {
    id: '4-4-4',
    name: '4-4-4 Odak Nefesi',
    subtitle: 'Zihinsel berraklık ve anlık sakinlik sağlar',
    inhale: 4,
    hold: 4,
    exhale: 4,
  },
];

export const BreathingExercisePage: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>(BREATHING_PATTERNS[0]);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState<number>(BREATHING_PATTERNS[0].inhale);
  const [completedCycles, setCompletedCycles] = useState<number>(0);

  // Track whether the inhale scale animation has kicked in after mount/phase switch
  const [orbScale, setOrbScale] = useState<number>(1);
  const [transitionDurationSec, setTransitionDurationSec] = useState<number>(BREATHING_PATTERNS[0].inhale);

  const phaseRef = useRef<BreathPhase>(phase);
  phaseRef.current = phase;

  const triggerGentleHaptic = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
  };

  // Drive smooth orb scaling whenever phase or running state changes
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (phase === 'inhale') {
      // Start from base scale and smoothly expand to max scale over inhale duration
      setTransitionDurationSec(selectedPattern.inhale);
      const raf = requestAnimationFrame(() => {
        setOrbScale(1.58);
      });
      return () => cancelAnimationFrame(raf);
    } else if (phase === 'hold') {
      // Remain suspended at maximum size while zero-gravity float continues
      setTransitionDurationSec(0.35);
      setOrbScale(1.58);
    } else if (phase === 'exhale') {
      // Smoothly shrink back to original size over exhale duration
      setTransitionDurationSec(selectedPattern.exhale);
      const raf = requestAnimationFrame(() => {
        setOrbScale(1);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [phase, isRunning, selectedPattern]);

  // 1-second countdown & phase transition engine
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Transition to next phase
        const currentPhase = phaseRef.current;
        if (currentPhase === 'inhale') {
          setPhase('hold');
          triggerGentleHaptic();
          return selectedPattern.hold;
        } else if (currentPhase === 'hold') {
          setPhase('exhale');
          triggerGentleHaptic();
          return selectedPattern.exhale;
        } else {
          setPhase('inhale');
          setCompletedCycles((c) => c + 1);
          triggerGentleHaptic();
          return selectedPattern.inhale;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, selectedPattern]);

  const handleSelectPattern = (pattern: BreathingPattern) => {
    setSelectedPattern(pattern);
    setPhase('inhale');
    setSecondsLeft(pattern.inhale);
    setTransitionDurationSec(0.3);
    setOrbScale(1);
    setIsRunning(true);
    setTimeout(() => {
      setTransitionDurationSec(pattern.inhale);
      setOrbScale(1.58);
    }, 50);
  };

  // Lock vertical page scrolling while BreathingExercisePage is mounted
  useEffect(() => {
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    const preventTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setPhase('inhale');
    setSecondsLeft(selectedPattern.inhale);
    setTransitionDurationSec(0.4);
    setOrbScale(1);
  };

  const handleTogglePlay = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  const phaseLabel =
    phase === 'inhale'
      ? 'Nefes Al...'
      : phase === 'hold'
      ? 'Nefes Tut...'
      : 'Nefes Ver...';

  const phaseSubtext =
    phase === 'inhale'
      ? 'Burnundan yavaş ve derin bir nefesle küreyi büyüt'
      : phase === 'hold'
      ? 'Nefesini nazikçe tut, küre boşlukta süzülürken dinginliği hisset'
      : 'Ağzından yavaşça nefes vererek tüm gerginliği bırak';

  return (
    <div
      className="fixed left-0 right-0 z-30 max-w-4xl mx-auto px-4 sm:px-6 flex flex-col gap-3 overflow-hidden touch-none select-none animate-fadeIn"
      style={{
        top: 'calc(max(env(safe-area-inset-top, 24px), 24px) + 56px)',
        bottom: 'calc(max(env(safe-area-inset-bottom, 12px), 12px) + 68px)',
      }}
    >
      {/* Inline Keyframes for Zero-Gravity Floating & Organic Morphing */}
      <style>{`
        @keyframes zeroGravityFloat {
          0% {
            transform: translateY(10px) rotate(0deg);
          }
          50% {
            transform: translateY(-12px) rotate(1.5deg);
          }
          100% {
            transform: translateY(10px) rotate(0deg);
          }
        }
        @keyframes auraShimmer {
          0%, 100% {
            border-radius: 52% 48% 50% 50% / 48% 52% 48% 52%;
          }
          33% {
            border-radius: 48% 52% 47% 53% / 52% 47% 53% 48%;
          }
          66% {
            border-radius: 50% 50% 53% 47% / 49% 51% 49% 51%;
          }
        }
        .zero-gravity-float {
          animation: zeroGravityFloat 5.2s ease-in-out infinite;
        }
        .organic-sphere {
          animation: auraShimmer 9s ease-in-out infinite;
        }
      `}</style>

      {/* Top Pattern Selector */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {BREATHING_PATTERNS.map((pat) => {
          const active = pat.id === selectedPattern.id;
          return (
            <button
              key={pat.id}
              type="button"
              onClick={() => handleSelectPattern(pat)}
              className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                active
                  ? 'bg-comus-navy text-white border-comus-navy shadow-sm'
                  : 'bg-white text-comus-navy border-comus-sand-light/40 hover:bg-comus-surface'
              }`}
            >
              <div className="text-xs font-bold tracking-tight">{pat.name}</div>
              <div
                className={`text-[10px] mt-0.5 truncate ${
                  active ? 'text-indigo-200' : 'text-comus-sand-dark'
                }`}
              >
                {pat.inhale}-{pat.hold}-{pat.exhale} sn
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Zero-Gravity Breathing Chamber */}
      <div className="relative flex-1 min-h-0 rounded-[2.25rem] bg-gradient-to-br from-[#FFF9F5] via-[#FDF3EC] to-[#F5E6DA] p-5 sm:p-7 flex flex-col items-center justify-between overflow-hidden shadow-soft-lg border-2 border-comus-copper/25">
        {/* Ambient Deep Space Background Glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-comus-copper/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-comus-sage/15 blur-3xl" />
        </div>

        {/* Top Status Pill */}
        <div className="relative z-10 w-full flex items-center justify-between gap-2 text-xs text-comus-navy/80 shrink-0 font-medium">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs">
            <Wind className="w-3.5 h-3.5 text-comus-copper shrink-0" />
            <span className="leading-tight text-comus-navy">{selectedPattern.subtitle}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs font-semibold text-comus-navy shrink-0">
            <Sparkles className="w-3 h-3 text-comus-copper shrink-0" />
            <span>{completedCycles} Döngü</span>
          </span>
        </div>

        {/* Center Zero-Gravity Floating Sphere */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center w-64">
          {/* Continuous Zero-Gravity Vertical Float Container */}
          <div className="zero-gravity-float relative flex items-center justify-center w-full h-full">
            {/* Scaling Sphere & Aura Layers */}
            <div
              style={{
                transform: `scale(${orbScale})`,
                transitionProperty: 'transform',
                transitionDuration: `${transitionDurationSec}s`,
                transitionTimingFunction:
                  phase === 'hold' ? 'ease-out' : 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              className="relative w-36 h-36 flex items-center justify-center"
            >
              {/* Outer Soft Halo */}
              <div
                className={`absolute -inset-6 rounded-full blur-2xl transition-colors duration-1000 ${
                  phase === 'inhale'
                    ? 'bg-comus-sage/40'
                    : phase === 'hold'
                    ? 'bg-comus-copper/45'
                    : 'bg-teal-400/35'
                }`}
              />

              {/* Secondary Translucent Ring */}
              <div
                className={`organic-sphere absolute -inset-2.5 border transition-colors duration-1000 ${
                  phase === 'inhale'
                    ? 'border-comus-sage/40 bg-comus-sage/15'
                    : phase === 'hold'
                    ? 'border-comus-copper/45 bg-comus-copper/15'
                    : 'border-teal-400/40 bg-teal-300/15'
                }`}
              />

              {/* Core Glowing Sphere */}
              <div
                className={`organic-sphere w-full h-full shadow-[0_12px_45px_rgba(192,103,79,0.3)] border-2 border-white/70 backdrop-blur-md transition-colors duration-1000 ${
                  phase === 'inhale'
                    ? 'bg-gradient-to-br from-[#7DA690] via-[#5A826D] to-[#3E5C4C]'
                    : phase === 'hold'
                    ? 'bg-gradient-to-br from-[#D4836E] via-[#C0674F] to-[#9E4F39]'
                    : 'bg-gradient-to-br from-[#5A826D] via-[#2E5380] to-[#1E3A5F]'
                }`}
              >
                {/* Specular 3D Highlight */}
                <div className="absolute top-3 left-5 w-12 h-6 rounded-full bg-white/35 blur-xs -rotate-12" />
              </div>
            </div>

            {/* Counter Overlaid Inside the Center of the Floating Sphere */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                {secondsLeft}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/85 mt-0.5 drop-shadow">
                saniye
              </span>
            </div>
          </div>
        </div>

        {/* Calming Phase Command Text & Controls */}
        <div className="relative z-10 w-full flex flex-col items-center text-center space-y-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-comus-navy tracking-wide transition-all duration-500">
              {phaseLabel}
            </h2>
            <p className="text-xs sm:text-sm text-comus-navy/70 mt-1.5 max-w-xs mx-auto leading-relaxed font-medium">
              {phaseSubtext}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-6 py-2.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Duraklat</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Başlat</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 rounded-2xl bg-white hover:bg-comus-surface text-comus-navy border border-comus-sand-light/40 shadow-xs transition-all cursor-pointer"
              title="Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
