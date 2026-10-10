const fs = require('fs');

let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace(');\n\n\n\n  return (', '\n\n  return (');
dash = dash.replace(');\r\n\r\n\r\n\r\n  return (', '\n\n  return (');
dash = dash.replace(/\n\);\n/, '\n'); // catch all
dash = dash.replace(/\r\n\);\r\n/, '\r\n');
fs.writeFileSync('src/pages/DashboardPage.tsx', dash);

let ins = fs.readFileSync('src/pages/InsightsPage.tsx', 'utf8');
ins = ins.replace(/(const battery = getMetricData\('battery_level', .*?\]')\n/g, '\);\n');
ins = ins.replace(/(const battery = getMetricData\('battery_level', .*?\]')\r\n/g, '\);\r\n');
fs.writeFileSync('src/pages/InsightsPage.tsx', ins);

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');
set = set.replace(/(const battery = getMetricData\('battery_level', .*?\]')\n/g, '\);\n');
set = set.replace(/(const battery = getMetricData\('battery_level', .*?\]')\r\n/g, '\);\r\n');
fs.writeFileSync('src/pages/SettingsPage.tsx', set);

console.log('Fixed parens!');
