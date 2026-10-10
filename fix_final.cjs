const fs = require('fs');

let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace(/  const \[evalToast, setEvalToast\] = useState<string \| null>\(null\);\r?\n/, '');
fs.writeFileSync('src/pages/DashboardPage.tsx', dash);

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
set = set.replace(/, Battery, CheckCircle2, Activity, Keyboard/g, ''); // remove dupe imports
set = set.replace(/  Battery,\r?\n/, '');
set = set.replace(/  CheckCircle2,\r?\n/, '');
set = set.replace(/  Activity,\r?\n/, '');
set = set.replace(/  Keyboard,\r?\n/, '');

// Find the UI block in original DashboardPage to inject it using non-Turkish string matching
const originalDash = require('child_process').execSync('git show HEAD:src/pages/DashboardPage.tsx', { encoding: 'utf8' });
const lsStart = originalDash.indexOf('{/* Live Sensors & Real-Time Evaluation Control Bar */}');
const lsEnd = originalDash.indexOf('{/* Predictive Alert Banner (if active) */}');
const liveSensorContent = originalDash.substring(lsStart, lsEnd);

// Inject into SettingsPage by matching the first div
const anchor = '{/* 1. KULLANICI PROF';
const anchorIdx = set.indexOf(anchor);
if (anchorIdx !== -1) {
    set = set.substring(0, anchorIdx) + liveSensorContent + '\n\n      ' + set.substring(anchorIdx);
} else {
    // try matching the section start
    const secStart = set.indexOf('<div className="space-y-6 pb-24 animate-fadeIn">');
    if (secStart !== -1) {
        set = set.substring(0, secStart + 50) + '\n\n' + liveSensorContent + '\n\n' + set.substring(secStart + 50);
    }
}
fs.writeFileSync('src/pages/SettingsPage.tsx', set);

console.log('Fixed everything!');
