const fs = require('fs');

let ins = fs.readFileSync('src/pages/InsightsPage.tsx', 'utf8');
ins = ins.replace(/  \);\r?\n\r?\n  const sampleDays = useMemo/g, '\n\n  const sampleDays = useMemo');
fs.writeFileSync('src/pages/InsightsPage.tsx', ins);

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
set = set.replace(/  \);\r?\n\r?\n  const handleManualEvaluate = async/g, '\n\n  const handleManualEvaluate = async');
fs.writeFileSync('src/pages/SettingsPage.tsx', set);

console.log('Fixed orphans!');
