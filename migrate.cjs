const fs = require('fs');

const dashPath = 'src/pages/DashboardPage.tsx';
let dash = fs.readFileSync(dashPath, 'utf8');

const insPath = 'src/pages/InsightsPage.tsx';
let ins = fs.readFileSync(insPath, 'utf8');

const setPath = 'src/pages/SettingsPage.tsx';
let set = fs.readFileSync(setPath, 'utf8');

// 1. Move MetricCards to InsightsPage
const metricCardsRegex = /\{\/\* 4 Core Metric Cards \*\/\}[\s\S]*?(?=\{\/\* Micro Disclaimer \*\/)/;
const metricCardsMatch = dash.match(metricCardsRegex);
const metricCardsContent = metricCardsMatch[0];
dash = dash.replace(metricCardsRegex, '');

// The logic needed for MetricCards:
const useMemoLogicRegex = /  \/\/ Group metrics by key and find latest date[\s\S]*?\}, \[dailyMetrics, baselines\]\);/;
const useMemoLogicMatch = dash.match(useMemoLogicRegex);
const useMemoLogic = useMemoLogicMatch[0];

const helperVarsRegex = /  \/\/ Helper to safely get metric info without mocking[\s\S]*?const battery = [^\n]*;\n/;
const helperVarsMatch = dash.match(helperVarsRegex);
const helperVarsContent = helperVarsMatch[0];
dash = dash.replace(helperVarsRegex, ''); 

ins = ins.replace(
  "import { Sparkles, CheckCircle2 } from 'lucide-react';",
  "import { Sparkles, CheckCircle2, Activity, Keyboard, Moon, Smartphone } from 'lucide-react';"
);

ins = ins.replace(
  "import { InsightCard } from '../components/insights/InsightCard';",
  "import { InsightCard } from '../components/insights/InsightCard';\nimport { MetricCard } from '../components/dashboard/MetricCard';\nimport { calculateZScore } from '../engine/anomaly';\nimport { AnomalyResult } from '../types/engine';\nimport { healthService } from '../services/native/healthService';"
);

ins = ins.replace(
  "  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];",
  "  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];\n  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];"
);

ins = ins.replace(
  "  const sampleDays = useMemo",
  useMemoLogic + "\n\n" + helperVarsContent + "\n\n  const sampleDays = useMemo"
);

ins = ins.replace(
  "      {/* Tetikleyici Analizi (Yeni) */}",
  "      <div className=\"pt-6\">\n        <h2 className=\"font-serif font-bold text-xl text-comus-navy mb-4\">Anlýk Fenotip Verileri</h2>\n" + metricCardsContent + "\n      </div>\n\n      {/* Tetikleyici Analizi (Yeni) */}"
);

// 2. Move Live Sensor to Settings
const liveSensorRegex = /\{\/\* Live Sensors & Real-Time Evaluation Control Bar \*\/\}[\s\S]*?(?=\{\/\* Predictive Alert Banner \(if active\) \*\/)/;
const liveSensorMatch = dash.match(liveSensorRegex);
const liveSensorContent = liveSensorMatch[0];
dash = dash.replace(liveSensorRegex, '');

// Add state to Settings
const handleManualFuncRegex = /  const handleManualEvaluate = async \(\) => \{[\s\S]*?\};\n\n/;
const handleManualFuncMatch = dash.match(handleManualFuncRegex);
const handleManualFunc = handleManualFuncMatch[0];
dash = dash.replace(handleManualFuncRegex, '');
dash = dash.replace("  const [evalToast, setEvalToast] = useState<string | null>(null);\n", '');

set = set.replace(
  "  const [\n    isCloudBackupEnabled,\n",
  "  const { isAnalyzing, runAnalysisPipeline, baselineDayCount, anomalies } = useAppStore();\n  const [evalToast, setEvalToast] = useState<string | null>(null);\n\n" + helperVarsContent + "\n\n" + handleManualFunc + "\n\n  const [\n    isCloudBackupEnabled,\n"
);

set = set.replace(
  "      {/* Header */}",
  "      {/* Header */}"
);
set = set.replace(
  "      </div>\n\n      {/* Profil Yonetimi */}",
  "      </div>\n\n      " + liveSensorContent + "\n\n      {/* Profil Yonetimi */}"
);

set = set.replace(
  "export const SettingsPage: React.FC = () => {\n",
  "import { useLiveQuery } from 'dexie-react-hooks';\nimport { db } from '../db';\nimport { calculateZScore } from '../engine/anomaly';\nimport { AnomalyResult } from '../types/engine';\n\nexport const SettingsPage: React.FC = () => {\n  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];\n  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];\n\n" + useMemoLogic + "\n\n"
);

fs.writeFileSync(dashPath, dash);
fs.writeFileSync(insPath, ins);
fs.writeFileSync(setPath, set);
console.log('Migration OK');
