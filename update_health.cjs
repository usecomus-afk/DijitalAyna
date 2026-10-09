const fs = require('fs');
let c = fs.readFileSync('src/services/native/healthService.ts', 'utf8');

c = c.replace(/read:\s*\['steps'\]/, "read: ['steps', 'heartRate', 'calories']");

fs.writeFileSync('src/services/native/healthService.ts', c, 'utf8');
