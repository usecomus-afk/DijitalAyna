const fs = require('fs');

let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

set = set.replace(
  "import React, { useState, useMemo } from 'react';",
  "import React, { useState, useMemo } from 'react';\nimport { useLiveQuery } from 'dexie-react-hooks';\nimport { db } from '../db';\nimport { calculateZScore } from '../engine/anomaly';\nimport { AnomalyResult } from '../types/engine';"
);

set = set.replace(
  "  const {\\n    userProfile,\\n    settings,",
  "  const {\\n    userProfile,\\n    settings,\\n    runAnalysisPipeline,\\n    isAnalyzing,\\n"
);

// We need to actually inject the LiveSensor block. Let's see if we can get it.
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// The Live Sensor block doesn't exist in DashboardPage anymore!
// I need to fetch it from git again or use the one I have.
const { execSync } = require('child_process');
const originalDash = execSync('git show HEAD:src/pages/DashboardPage.tsx').toString();

const liveSensorRegex = /\{\/\* Live Sensors & Real-Time Evaluation Control Bar \*\/\}[\s\S]*?(?=\{\/\* Predictive Alert Banner \(if active\) \*\/)/;
const liveSensorMatch = originalDash.match(liveSensorRegex);
const liveSensorContent = liveSensorMatch[0];

// I will insert it after "Kullanýcý profili, Google kimliði, sensör tercihleri ve yerel veri yönetimi"
const insertAfter = "</p>\\n      </div>\\n\\n      {wipeConfirmed";
set = set.replace(
  insertAfter,
  "</p>\\n      </div>\\n\\n      " + liveSensorContent.replace(/\\n/g, '\\n') + "\\n\\n      {wipeConfirmed"
);

fs.writeFileSync('src/pages/SettingsPage.tsx', set);
