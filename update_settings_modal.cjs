const fs = require('fs');
let c = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

if (!c.includes("import { DigitalNarcoticModal }")) {
  c = c.replace("import { FamilyControls } from 'comus-family-controls';", "import { FamilyControls } from 'comus-family-controls';\nimport { DigitalNarcoticModal } from '../components/shield/DigitalNarcoticModal';");
}

if (!c.includes("const [showNarcoticModal")) {
  c = c.replace("const [age, setAge] = useState", "const [showNarcoticModal, setShowNarcoticModal] = useState(false);\n  const [age, setAge] = useState");
}

const previewBtn = `
               <button onClick={() => setShowNarcoticModal(true)} className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700">Test: Kalkan Arayüzü</button>
            </div>
`;
c = c.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* 2\. APPLE SA/m, (match) => {
  return previewBtn + `</div>
        </div>

        <DigitalNarcoticModal isOpen={showNarcoticModal} onClose={() => setShowNarcoticModal(false)} />

        {/* 2. APPLE SA`;
});

// Since replace might fail depending on how it was structured, let me be precise:
c = c.replace(/Test: Kalkanı İndir<\/button>\s*<\/div>/, "Test: Kalkanı İndir</button>\n               <button onClick={() => setShowNarcoticModal(true)} className=\"flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700\">UI Test</button>\n            </div>");

if(!c.includes("<DigitalNarcoticModal")) {
  c = c.replace(/\{\/\* 2\. APPLE SA/, "<DigitalNarcoticModal isOpen={showNarcoticModal} onClose={() => setShowNarcoticModal(false)} />\n\n        {/* 2. APPLE SA");
}

fs.writeFileSync('src/pages/SettingsPage.tsx', c, 'utf8');
