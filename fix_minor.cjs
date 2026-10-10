const fs = require('fs');

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// 1. Remove baselineDayCount from useAppStore
set = set.replace(/    baselineDayCount,\r?\n/, '');

// 2. Remove anomalies from useMemo
set = set.replace(/const \{ historyByKey, latestMetricsByKey, anomalies, baselineMap \} = useMemo/, 'const { historyByKey, latestMetricsByKey, baselineMap } = useMemo');

// 3. Remove unused backspace, night, touch
set = set.replace(/  const backspace = getMetricData\('typing_backspace_rate', .*?\);\r?\n/, '');
set = set.replace(/  const night = getMetricData\('night_usage_minutes', .*?\);\r?\n/, '');
set = set.replace(/  const touch = getMetricData\('touch_interaction_frequency', .*?\);\r?\n/, '');

// 4. Add missing battery
set = set.replace(/  const handleManualEvaluate = async/, "  const battery = getMetricData('battery_level', '[Veri Alýnamýyor / Ýzin Bekleniyor]');\n\n  const handleManualEvaluate = async");

fs.writeFileSync('src/pages/SettingsPage.tsx', set);
console.log('Fixed minor!');
