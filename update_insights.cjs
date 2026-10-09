const fs = require('fs');
let c = fs.readFileSync('src/engine/insights.ts', 'utf8');

if (!c.includes("checkVulnerableWindowForShield")) {
  c = c.replace(/import \{ checkAndTriggerCrisisIfNeeded \} from '\.\.\/safety\/crisisDetector';/, "import { checkAndTriggerCrisisIfNeeded, checkVulnerableWindowForShield } from '../safety/crisisDetector';");
  
  c = c.replace(/checkAndTriggerCrisisIfNeeded\(anomalies, recentMoods\);/g, "checkAndTriggerCrisisIfNeeded(anomalies, recentMoods);\n      checkVulnerableWindowForShield(anomalies);");
}

fs.writeFileSync('src/engine/insights.ts', c, 'utf8');
