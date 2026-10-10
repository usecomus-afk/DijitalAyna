const fs = require('fs');

let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
let set = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// I will just copy the Live Sensor Block directly from Dashboard (wait, I already deleted it from Dashboard)
// Let me get it from git HEAD
const { execSync } = require('child_process');
const originalDash = execSync('git show HEAD:src/pages/DashboardPage.tsx').toString();

const liveSensorRegex = /\{\/\* Live Sensors & Real-Time Evaluation Control Bar \*\/\}[\s\S]*?(?=\{\/\* Predictive Alert Banner \(if active\) \*\/)/;
const liveSensorMatch = originalDash.match(liveSensorRegex);
const liveSensorContent = liveSensorMatch[0];

const useMemoLogicRegex = /  \/\/ Group metrics by key and find latest date[\s\S]*?\}, \[dailyMetrics, baselines\]\);/;
const useMemoLogicMatch = originalDash.match(useMemoLogicRegex);
const useMemoLogic = useMemoLogicMatch[0];

const helperVarsRegex = /  \/\/ Helper to safely get metric info without mocking[\s\S]*?const battery = [^\n]*;\n/;
const helperVarsMatch = originalDash.match(helperVarsRegex);
const helperVarsContent = helperVarsMatch[0];

const handleManualFuncRegex = /  const handleManualEvaluate = async \(\) => \{[\s\S]*?\};\n\n/;
const handleManualFuncMatch = originalDash.match(handleManualFuncRegex);
const handleManualFunc = handleManualFuncMatch[0];

set = set.replace(
  "export const SettingsPage: React.FC = () => {\\n",
  "import { useLiveQuery } from 'dexie-react-hooks';\\nimport { db } from '../db';\\nimport { calculateZScore } from '../engine/anomaly';\\nimport { AnomalyResult } from '../types/engine';\\n\\nexport const SettingsPage: React.FC = () => {\\n"
);

set = set.replace(
  "  const {\\n    userProfile,\\n",
  "  const {\\n    userProfile,\\n    runAnalysisPipeline,\\n    isAnalyzing,\\n    baselineDayCount,\\n"
);

set = set.replace(
  "  const [isEditingName, setIsEditingName] = useState(false);",
  "  const [evalToast, setEvalToast] = useState<string | null>(null);\\n\\n  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];\\n  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];\\n\\n" + useMemoLogic + "\\n\\n" + helperVarsContent + "\\n\\n" + handleManualFunc + "\\n\\n  const [isEditingName, setIsEditingName] = useState(false);"
);

set = set.replace(
  "{/* 1. KULLANICI PROFÝLÝ & GOOGLE HESABI */}",
  liveSensorContent + "\\n\\n      {/* 1. KULLANICI PROFÝLÝ & GOOGLE HESABI */}"
);

fs.writeFileSync('src/pages/SettingsPage.tsx', set);
console.log('Fixed SettingsPage');
