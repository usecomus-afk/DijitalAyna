const fs = require('fs');

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// 1. Add runAnalysisPipeline, isAnalyzing, baselineDayCount to useAppStore
set = set.replace(
  /const \{\s*userProfile,\s*settings,/g,
  'const { userProfile, settings, runAnalysisPipeline, isAnalyzing, baselineDayCount,'
);

// 2. Remove unused anomalies and evalToast, mobility, typing, backspace, night, touch, battery, handleManualEvaluate
// No wait! IF I add the UI block, they WILL BE USED!

// 3. Inject the UI block
const { execSync } = require('child_process');
const originalDash = execSync('git show HEAD:src/pages/DashboardPage.tsx').toString();

const liveSensorRegex = /\{\/\* Live Sensors & Real-Time Evaluation Control Bar \*\/\}[\s\S]*?(?=\{\/\* Predictive Alert Banner \(if active\) \*\/)/;
const liveSensorMatch = originalDash.match(liveSensorRegex);
const liveSensorContent = liveSensorMatch[0];

// Insert right after <div className="space-y-6 pb-24 animate-fadeIn">
set = set.replace(
  /<div className="space-y-6 pb-24 animate-fadeIn">\s*\{\/\* Header \*\/\}/g,
  '<div className="space-y-6 pb-24 animate-fadeIn">\n\n' + liveSensorContent + '\n\n      {/* Header */}'
);

fs.writeFileSync('src/pages/SettingsPage.tsx', set);
