const fs = require('fs');
let c = fs.readFileSync('src/pages/BreathingExercisePage.tsx', 'utf8');

// Replace top pattern selector active/inactive subtitle styling
c = c.replace(
  ": 'text-indigo-200' : 'text-comus-sand-dark'",
  ": 'text-comus-copper-subtle' : 'text-comus-sand-dark'"
);

// Replace main container background and border
c = c.replace(
  'bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-5 sm:p-7 flex flex-col items-center justify-between overflow-hidden shadow-2xl border border-indigo-500/20',
  'bg-gradient-to-br from-[#FFF9F5] via-[#FDF3EC] to-[#F5E6DA] p-5 sm:p-7 flex flex-col items-center justify-between overflow-hidden shadow-soft-lg border-2 border-comus-copper/25'
);

// Replace ambient space background glows
c = c.replace(
  'bg-indigo-500/15 blur-3xl',
  'bg-comus-copper/15 blur-3xl'
);
c = c.replace(
  'bg-teal-400/10 blur-3xl',
  'bg-comus-sage/15 blur-3xl'
);

// Replace Top Status Pill
c = c.replace(
  'text-indigo-200/80 shrink-0',
  'text-comus-navy/80 shrink-0 font-medium'
);
c = c.replace(
  'bg-white/10 backdrop-blur-md border border-white/10">\r\n            <Wind className="w-3.5 h-3.5 text-teal-300',
  'bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs">\r\n            <Wind className="w-3.5 h-3.5 text-comus-copper'
);
c = c.replace(
  'bg-white/10 backdrop-blur-md border border-white/10">\n            <Wind className="w-3.5 h-3.5 text-teal-300',
  'bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs">\n            <Wind className="w-3.5 h-3.5 text-comus-copper'
);
c = c.replace(
  'bg-white/10 backdrop-blur-md border border-white/10 font-medium shrink-0">\r\n            <Sparkles className="w-3 h-3 text-amber-300',
  'bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs font-semibold text-comus-navy shrink-0">\r\n            <Sparkles className="w-3 h-3 text-comus-copper'
);
c = c.replace(
  'bg-white/10 backdrop-blur-md border border-white/10 font-medium shrink-0">\n            <Sparkles className="w-3 h-3 text-amber-300',
  'bg-white/85 backdrop-blur-md border border-comus-copper/20 shadow-xs font-semibold text-comus-navy shrink-0">\n            <Sparkles className="w-3 h-3 text-comus-copper'
);
c = c.replace(
  '<span className="leading-tight">{selectedPattern.subtitle}</span>',
  '<span className="leading-tight text-comus-navy">{selectedPattern.subtitle}</span>'
);

// Halo colors
c = c.replace(
  "phase === 'inhale'\r\n                    ? 'bg-teal-400/35'\r\n                    : phase === 'hold'\r\n                    ? 'bg-indigo-400/45'\r\n                    : 'bg-sky-400/25'",
  "phase === 'inhale'\r\n                    ? 'bg-comus-sage/40'\r\n                    : phase === 'hold'\r\n                    ? 'bg-comus-copper/45'\r\n                    : 'bg-teal-400/35'"
);
c = c.replace(
  "phase === 'inhale'\n                    ? 'bg-teal-400/35'\n                    : phase === 'hold'\n                    ? 'bg-indigo-400/45'\n                    : 'bg-sky-400/25'",
  "phase === 'inhale'\n                    ? 'bg-comus-sage/40'\n                    : phase === 'hold'\n                    ? 'bg-comus-copper/45'\n                    : 'bg-teal-400/35'"
);

// Secondary ring
c = c.replace(
  "phase === 'inhale'\r\n                    ? 'border-teal-300/40 bg-teal-400/10'\r\n                    : phase === 'hold'\r\n                    ? 'border-indigo-300/50 bg-indigo-400/15'\r\n                    : 'border-sky-300/30 bg-sky-400/10'",
  "phase === 'inhale'\r\n                    ? 'border-comus-sage/40 bg-comus-sage/15'\r\n                    : phase === 'hold'\r\n                    ? 'border-comus-copper/45 bg-comus-copper/15'\r\n                    : 'border-teal-400/40 bg-teal-300/15'"
);
c = c.replace(
  "phase === 'inhale'\n                    ? 'border-teal-300/40 bg-teal-400/10'\n                    : phase === 'hold'\n                    ? 'border-indigo-300/50 bg-indigo-400/15'\n                    : 'border-sky-300/30 bg-sky-400/10'",
  "phase === 'inhale'\n                    ? 'border-comus-sage/40 bg-comus-sage/15'\n                    : phase === 'hold'\n                    ? 'border-comus-copper/45 bg-comus-copper/15'\n                    : 'border-teal-400/40 bg-teal-300/15'"
);

// Core sphere shadow and gradients:
c = c.replace(
  "shadow-[0_0_60px_rgba(99,102,241,0.55)] border border-white/30 backdrop-blur-md transition-colors duration-1000",
  "shadow-[0_12px_45px_rgba(192,103,79,0.3)] border-2 border-white/70 backdrop-blur-md transition-colors duration-1000"
);
c = c.replace(
  "phase === 'inhale'\r\n                    ? 'bg-gradient-to-br from-teal-300/80 via-cyan-500/75 to-indigo-600/85'\r\n                    : phase === 'hold'\r\n                    ? 'bg-gradient-to-br from-indigo-300/85 via-violet-500/80 to-teal-500/85'\r\n                    : 'bg-gradient-to-br from-sky-400/70 via-indigo-600/75 to-slate-800/85'",
  "phase === 'inhale'\r\n                    ? 'bg-gradient-to-br from-[#7DA690] via-[#5A826D] to-[#3E5C4C]'\r\n                    : phase === 'hold'\r\n                    ? 'bg-gradient-to-br from-[#D4836E] via-[#C0674F] to-[#9E4F39]'\r\n                    : 'bg-gradient-to-br from-[#5A826D] via-[#2E5380] to-[#1E3A5F]'"
);
c = c.replace(
  "phase === 'inhale'\n                    ? 'bg-gradient-to-br from-teal-300/80 via-cyan-500/75 to-indigo-600/85'\n                    : phase === 'hold'\n                    ? 'bg-gradient-to-br from-indigo-300/85 via-violet-500/80 to-teal-500/85'\n                    : 'bg-gradient-to-br from-sky-400/70 via-indigo-600/75 to-slate-800/85'",
  "phase === 'inhale'\n                    ? 'bg-gradient-to-br from-[#7DA690] via-[#5A826D] to-[#3E5C4C]'\n                    : phase === 'hold'\n                    ? 'bg-gradient-to-br from-[#D4836E] via-[#C0674F] to-[#9E4F39]'\n                    : 'bg-gradient-to-br from-[#5A826D] via-[#2E5380] to-[#1E3A5F]'"
);

// Typography and controls
c = c.replace(
  'text-white tracking-wide transition-all duration-500',
  'text-comus-navy tracking-wide transition-all duration-500'
);
c = c.replace(
  'text-indigo-200/80 mt-1.5 max-w-xs mx-auto leading-relaxed',
  'text-comus-navy/70 mt-1.5 max-w-xs mx-auto leading-relaxed font-medium'
);

// Buttons
c = c.replace(
  'className="px-6 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"',
  'className="px-6 py-2.5 rounded-2xl bg-comus-navy hover:bg-comus-navy-light text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all cursor-pointer"'
);

c = c.replace(
  'className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-indigo-200 border border-white/15 backdrop-blur-md transition-all cursor-pointer"',
  'className="p-2.5 rounded-2xl bg-white hover:bg-comus-surface text-comus-navy border border-comus-sand-light/40 shadow-xs transition-all cursor-pointer"'
);

fs.writeFileSync('src/pages/BreathingExercisePage.tsx', c, 'utf8');
console.log('BreathingExercisePage harmonized successfully!');
