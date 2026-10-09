const fs = require('fs');
let c = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

const importStr = "import { FamilyControls } from 'comus-family-controls';";
if (!c.includes("comus-family-controls")) {
  c = c.replace("import { healthService } from '../services/native/healthService';", "import { healthService } from '../services/native/healthService';\nimport { FamilyControls } from 'comus-family-controls';");
}

if (!c.includes(" Shield,")) {
  c = c.replace("} from 'lucide-react';", "  Shield,\n} from 'lucide-react';");
}

const uiBlock = `
        {/* 3. FINANSAL HUZUR VE DÜRTÜ KALKANI */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-soft border border-comus-sand-light/20 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif font-bold text-base sm:text-lg text-comus-navy tracking-tight leading-snug">
                  Finansal Huzur ve Dürtü Kalkanı
                </h3>
                <p className="text-xs text-comus-sand-dark mt-1 leading-relaxed">
                  Gece uykusuz kaldığın kırılgan anlarda seçtiğin uygulamaların önüne 60 saniyelik sakinleştirici bir nefes perdesi koyar.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={async () => {
                try {
                  const authRes = await FamilyControls.requestAuthorization();
                  if (authRes.granted) {
                    await FamilyControls.selectApps();
                  } else {
                    alert("Apple Family Controls izni reddedildi.");
                  }
                } catch(e: any) {
                  alert("Hata: " + e.message);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-center cursor-pointer"
            >
              Korunacak Uygulamaları Seç
            </button>
            <div className="flex gap-2">
               <button onClick={async () => { await FamilyControls.setShield(); alert('Kalkan Aktif!'); }} className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700">Test: Kalkanı Kur</button>
               <button onClick={async () => { await FamilyControls.clearShield(); alert('Kalkan Kaldırıldı!'); }} className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-semibold hover:bg-slate-200 cursor-pointer text-slate-700">Test: Kalkanı İndir</button>
            </div>
          </div>
        </div>
`;

if (!c.includes("FINANSAL HUZUR VE DÜRTÜ KALKANI")) {
  // Try to find the Apple HealthKit comment, wait, I can just append it before the final closing div.
  // Actually replacing "{/* 2. APPLE SA" worked last time. Let me check if it exists exactly as that.
  c = c.replace("{/* 2. APPLE SA", uiBlock + "\n\n        {/* 2. APPLE SA");
}

fs.writeFileSync('src/pages/SettingsPage.tsx', c, 'utf8');
