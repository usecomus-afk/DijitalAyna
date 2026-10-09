const fs = require('fs');
let c = fs.readFileSync('src/safety/crisisDetector.ts', 'utf8');

const importStr = "import { FamilyControls } from 'comus-family-controls';";
if (!c.includes(importStr)) {
  c = "import { FamilyControls } from 'comus-family-controls';\n" + c;
}

const functionCode = `

/**
 * Checks if the user is in a vulnerable window (02:00 - 05:00) with aggressive digital behavior.
 * Activates the Financial Peace Shield (Family Controls) if conditions are met.
 */
export async function checkVulnerableWindowForShield(
  anomalies: AnomalyResult[]
): Promise<void> {
  const currentHour = new Date().getHours();
  // Gece saat 02:00 – 05:00 arasında cihaz uyanıklığı saptandığında
  const isVulnerableTime = currentHour >= 2 && currentHour < 5;
  
  if (isVulnerableTime) {
    // Son oturumda agresif/hızlı dokunma veya yüksek yazım ritmi tespit edildiğinde
    const hasAggressiveTyping = anomalies.some(a => 
      a.isAnomaly && (a.sensorType === 'keyboard' || a.sensorType === 'screen_touch') && a.zScore > 2.5
    );
    
    if (hasAggressiveTyping) {
      console.log('[CrisisDetector] Vulnerability Mode Active! Activating Shield...');
      try {
        await FamilyControls.setShield();
      } catch (e) {
        console.error('[CrisisDetector] Failed to activate shield', e);
      }
    }
  }
}
`;

if (!c.includes("checkVulnerableWindowForShield")) {
  c += functionCode;
}

fs.writeFileSync('src/safety/crisisDetector.ts', c, 'utf8');
