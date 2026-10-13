import { useState, useEffect } from 'react';
import { Wind, ShieldAlert, Lock } from 'lucide-react';
import { FamilyControls } from 'comus-family-controls';

export const SHIELD_UNLOCK_UNTIL_KEY = 'comus_impulse_shield_unlock_until';
export const SHIELD_SAVED_COUNT_KEY = 'comus_impulse_shield_saved_count';

interface DigitalNarcoticModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLabel?: string | null;
  protectedNames?: string[];
  onSavedImpulse?: () => void;
  onTemporaryUnlock?: (unlockUntilMs: number) => void;
}

export function DigitalNarcoticModal({
  isOpen,
  onClose,
  targetLabel,
  protectedNames = [],
  onSavedImpulse,
  onTemporaryUnlock,
}: DigitalNarcoticModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [breathingPhase, setBreathingPhase] = useState<'Nefes Al (4s)' | 'Tut (7s)' | 'Nefes Ver (8s)'>('Nefes Al (4s)');

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(60);
      setBreathingPhase('Nefes Al (4s)');
      return;
    }

    // 60-second countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 4-7-8 Breathing Cycle (19 seconds total per cycle)
    let cycleTime = 0;
    const breathTimer = setInterval(() => {
      cycleTime = (cycleTime + 1) % 19;
      if (cycleTime < 4) {
        setBreathingPhase('Nefes Al (4s)');
      } else if (cycleTime < 11) {
        setBreathingPhase('Tut (7s)');
      } else {
        setBreathingPhase('Nefes Ver (8s)');
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(breathTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVazgec = () => {
    try {
      const prev = parseInt(localStorage.getItem(SHIELD_SAVED_COUNT_KEY) || '0', 10);
      localStorage.setItem(SHIELD_SAVED_COUNT_KEY, String((Number.isNaN(prev) ? 0 : prev) + 1));
      localStorage.removeItem(SHIELD_UNLOCK_UNTIL_KEY);
    } catch {}
    onSavedImpulse?.();
    onClose();
  };

  const handleYinedeAc = async () => {
    const unlockUntil = Date.now() + 15 * 60 * 1000;
    try {
      localStorage.setItem(SHIELD_UNLOCK_UNTIL_KEY, String(unlockUntil));
    } catch {}
    try {
      await FamilyControls.clearShield();
      setTimeout(async () => {
        try {
          localStorage.removeItem(SHIELD_UNLOCK_UNTIL_KEY);
          await FamilyControls.setShield();
        } catch {
          // Fallback to in-app shield mode when native helper is unavailable
        }
      }, 15 * 60 * 1000);
    } catch {
      // Fallback to in-app shield mode when native helper is unavailable
    }
    onTemporaryUnlock?.(unlockUntil);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/95 backdrop-blur-xl p-6 animate-fadeIn">
      <div className="bg-indigo-900/50 border border-indigo-500/30 w-full max-w-sm rounded-[2rem] p-7 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl transition-transform duration-1000 ease-in-out ${
              breathingPhase.includes('Al')
                ? 'scale-150'
                : breathingPhase.includes('Tut')
                ? 'scale-150 opacity-70'
                : 'scale-50 opacity-30'
            }`}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold mb-4">
            <Lock className="w-3 h-3 text-indigo-300" />
            <span>{targetLabel ? `${targetLabel} Kalkanı` : 'Dürtü Kalkanı Devrede'}</span>
          </div>

          <div className="w-14 h-14 rounded-3xl bg-indigo-500/20 flex items-center justify-center mb-4">
            <Wind className="w-7 h-7 text-indigo-300" />
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
            Zihnini Dinlendiriyoruz...
          </h2>

          <p className="text-xs sm:text-sm text-indigo-200/80 mb-5 leading-relaxed">
            Bu işlem gerçek bir ihtiyaç mı, yoksa anlık bir dürtü veya rahatlama arayışı mı? Dürtü dalgasının yatışması için 60 saniyelik 4-7-8 nefes molası veriyoruz.
          </p>

          {protectedNames.length > 0 && (
            <div className="w-full mb-5 p-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/20 flex flex-wrap items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              {protectedNames.slice(0, 3).map((name) => (
                <span
                  key={name}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-indigo-800/60 text-indigo-200"
                >
                  {name}
                </span>
              ))}
              {protectedNames.length > 3 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-indigo-800/60 text-indigo-200">
                  +{protectedNames.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="rgba(99, 102, 241, 0.2)"
                strokeWidth="6"
              />
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="#818cf8"
                strokeWidth="6"
                strokeDasharray="377"
                strokeDashoffset={377 - (377 * timeLeft) / 60}
                className="transition-all duration-1000 linear"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-white">{timeLeft}</span>
              <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mt-1">
                {breathingPhase}
              </span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {timeLeft > 0 ? (
              <>
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl bg-indigo-800/50 text-indigo-300 text-xs sm:text-sm font-semibold cursor-not-allowed"
                >
                  Kalkan Açılış Kilidi: {timeLeft} saniye
                </button>
                <button
                  type="button"
                  onClick={handleVazgec}
                  className="w-full py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Dürtüden Şimdi Vazgeç ve Kalkanı Koru
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleVazgec}
                  className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  Vazgeç ve Uyu
                </button>
                <button
                  type="button"
                  onClick={handleYinedeAc}
                  className="w-full py-3.5 rounded-xl bg-transparent border-2 border-indigo-500/30 text-indigo-300 font-semibold hover:bg-indigo-800/30 transition-colors cursor-pointer"
                >
                  Yine de Aç (15 Dk İzin)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

