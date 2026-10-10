const fs = require('fs');

// 1. DashboardPage
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace(
  /sampleDays=\{baselineDayCount\}\r?\n\s*\/>/,
  "sampleDays={baselineDayCount}\n      />\n\n      <MentalTwinPanel />"
);
fs.writeFileSync('src/pages/DashboardPage.tsx', dash);

// 2. MentalTwinPanel
let panel = fs.readFileSync('src/components/avatar/MentalTwinPanel.tsx', 'utf8');
panel = panel.replace(/X,\r?\n/, '');
panel = panel.replace(/<button[^>]*setEmergencyModalOpen[\s\S]*?<\/button>/g, '');
// just in case there are any other setEmergencyModalOpen
panel = panel.replace(/setEmergencyModalOpen\([^)]*\)/g, 'null');
fs.writeFileSync('src/components/avatar/MentalTwinPanel.tsx', panel);

// 3. DigitalTwinMirror
let mirror = fs.readFileSync('src/components/dashboard/DigitalTwinMirror.tsx', 'utf8');
mirror = mirror.replace(/ArrowUpRight\s*,?/, '');
mirror = mirror.replace(/setEmergencyModalOpen\s*,?/, '');
fs.writeFileSync('src/components/dashboard/DigitalTwinMirror.tsx', mirror);

console.log("Fixed compilation errors");
