const fs = require('fs');

// 1. DashboardPage: Add MentalTwinPanel
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace(
  "import { DigitalTwinMirror } from '../components/dashboard/DigitalTwinMirror';",
  "import { DigitalTwinMirror } from '../components/dashboard/DigitalTwinMirror';\nimport { MentalTwinPanel } from '../components/avatar/MentalTwinPanel';"
);

dash = dash.replace(
  "      <DigitalTwinMirror\n        anomalies={anomalies}\n        sampleDays={baselineDayCount}\n      />",
  "      <DigitalTwinMirror\n        anomalies={anomalies}\n        sampleDays={baselineDayCount}\n      />\n\n      {/* Kiþisel Zihin Yansýmasý Paneli */}\n      <MentalTwinPanel />"
);
fs.writeFileSync('src/pages/DashboardPage.tsx', dash);

// 2. DigitalTwinMirror: Remove button
let mirror = fs.readFileSync('src/components/dashboard/DigitalTwinMirror.tsx', 'utf8');
mirror = mirror.replace(/<button[\s\S]*?<\/button>/, '');
fs.writeFileSync('src/components/dashboard/DigitalTwinMirror.tsx', mirror);

// 3. App.tsx: Remove MentalTwinModal
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace("import { MentalTwinModal } from './components/avatar/MentalTwinModal';\n", "");
app = app.replace("        <MentalTwinModal />\n", "");
fs.writeFileSync('src/App.tsx', app);

console.log('Done integrating panel');
