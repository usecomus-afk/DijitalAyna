const fs = require('fs');
let c = fs.readFileSync('src/safety/crisisDetector.ts', 'utf8');
c = c.replace(/a\.sensorType === 'keyboard' \|\| a\.sensorType === 'screen_touch'/g, "a.metricKey.startsWith('typing_') || a.metricKey === 'tremor_variance'");
fs.writeFileSync('src/safety/crisisDetector.ts', c, 'utf8');
