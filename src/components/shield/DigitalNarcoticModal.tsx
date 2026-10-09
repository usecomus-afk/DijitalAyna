import { useState, useEffect } from 'react';
import { Wind } from 'lucide-react';
import { FamilyControls } from 'comus-family-controls';

interface DigitalNarcoticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DigitalNarcoticModal({ isOpen, onClose }: DigitalNarcoticModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [breathingPhase, setBreathingPhase] = useState<'Nefes Al (4s)' | 'Tut (7s)' | 'Nefes Ver (8s)'>('Nefes Al (4s)');
  
  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(60);
      return;
    }
    
    // 60-second countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
    // Keep shield active
    onClose();
  };
  
  const handleYinedeAc = async () => {
    // Temporary unlock for 15 minutes
    try {
      await FamilyControls.clearShield();
      // Re-enable after 15 mins (900000 ms) in background
      setTimeout(async () => {
        await FamilyControls.setShield();
      }, 900000);
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/95 backdrop-blur-xl p-6">
      <div className="bg-indigo-900/50 border border-indigo-500/30 w-full max-w-sm rounded-[2rem] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none flex items-center justify-center">
          <div className={`w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl transition-transform duration-1000 ease-in-out ${breathingPhase.includes('Al') ? 'scale-150' : breathingPhase.includes('Tut') ? 'scale-150 opacity-70' : 'scale-50 opacity-30'}`} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center mb-6">
            <Wind className="w-8 h-8 text-indigo-300" />
          </div>
          
          <h2 className="text-2xl font-serif font-bold text-white mb-3">
            Zihnini Dinlendiriyoruz...
          </h2>
          
          <p className="text-sm text-indigo-200/80 mb-8 leading-relaxed">
            Bu harcama bir ihtiyaç mı, yoksa anlık bir rahatlama arayışı mı? Dürtü dalgasının yatışması için 60 saniyelik bir nefes molası veriyoruz.
          </p>
          
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
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
              <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider mt-1">{breathingPhase}</span>
            </div>
          </div>
          
          <div className="w-full flex flex-col gap-3">
            {timeLeft > 0 ? (
              <button disabled className="w-full py-3.5 rounded-xl bg-indigo-800/50 text-indigo-400 font-semibold cursor-not-allowed">
                Lütfen {timeLeft} saniye bekleyin
              </button>
            ) : (
              <>
                <button 
                  onClick={handleVazgec}
                  className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Vazgeç ve Uyu
                </button>
                <button 
                  onClick={handleYinedeAc}
                  className="w-full py-3.5 rounded-xl bg-transparent border-2 border-indigo-500/30 text-indigo-300 font-semibold hover:bg-indigo-800/30 transition-colors"
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
