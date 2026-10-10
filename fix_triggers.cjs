const fs = require('fs');

let trig = fs.readFileSync('src/pages/TriggersPage.tsx', 'utf8');

// 1. Remove Recent Mood Journal Entries
const journalRegex = /\{\/\* Recent Mood Journal Entries \*\/\}[\s\S]*?(?=\{\/\* Micro Disclaimer \*\/)/;
trig = trig.replace(journalRegex, '');

// 2. Extract QuickMoodWidget and move to top
const qmwRegex = /\{\/\* Quick Mood Log Widget \*\/\}[\s\S]*?<QuickMoodWidget \/>/;
trig = trig.replace(qmwRegex, '');

// 3. Add Clinical Tests Card
const clinicalTestsCard = `
      {/* Psikolojik Testler */}
      <div className="bg-white rounded-3xl p-5 border border-comus-sand-light/30 shadow-soft">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-comus-navy">Klinik Deðerlendirme</h3>
            <p className="text-xs text-comus-sand-dark">Anksiyete (GAD-7) ve Depresyon (PHQ-9) Testleri</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/assessment')}
          className="w-full py-3 bg-comus-navy text-white text-sm font-semibold rounded-xl hover:bg-comus-navy-light transition-colors flex items-center justify-center gap-2"
        >
          <span>Testi Baþlat</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
`;

// Add imports
trig = trig.replace("import { LineChart, Calendar, Tag, Pill, Sparkles } from 'lucide-react';", "import { LineChart, Calendar, Tag, Pill, Sparkles, ClipboardList, ArrowRight } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';");

// Add useNavigate
trig = trig.replace("const avatarMap = getAvatarMap();", "const navigate = useNavigate();\n  const avatarMap = getAvatarMap();");

// Put QuickMoodWidget and ClinicalTestsCard right below the header
trig = trig.replace(
  "      {activeTab === 'mood' ? (",
  "      {/* Quick Mood Log Widget */}\n      <QuickMoodWidget />\n\n" + clinicalTestsCard + "\n\n      {activeTab === 'mood' ? ("
);

fs.writeFileSync('src/pages/TriggersPage.tsx', trig);
console.log('Fixed Triggers!');
