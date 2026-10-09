const fs = require('fs');
let c = fs.readFileSync('src/components/shield/DigitalNarcoticModal.tsx', 'utf8');

c = c.replace(/className=\{\\\`w-64/g, "className={`w-64");
c = c.replace(/ease-in-out \\\$\{breathingPhase/g, "ease-in-out ${breathingPhase");
c = c.replace(/opacity-30'\}\\\`\}/g, "opacity-30'}`}");

fs.writeFileSync('src/components/shield/DigitalNarcoticModal.tsx', c, 'utf8');
