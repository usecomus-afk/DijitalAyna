const fs = require('fs');
const dashPath = 'src/pages/DashboardPage.tsx';
const insPath = 'src/pages/InsightsPage.tsx';
const setPath = 'src/pages/SettingsPage.tsx';

let dash = fs.readFileSync(dashPath, 'utf8');
let ins = fs.readFileSync(insPath, 'utf8');
let set = fs.readFileSync(setPath, 'utf8');

// Extract MetricCards
const mcStart = dash.indexOf('{/* 4 Core Metric Cards */}');
const mcEnd = dash.indexOf('{/* Micro Disclaimer */}');
const metricCardsContent = dash.substring(mcStart, mcEnd);
dash = dash.substring(0, mcStart) + dash.substring(mcEnd);

// Extract useMemo
const umStart = dash.indexOf('  // Group metrics by key and find latest date');
const umEnd = dash.indexOf('}, [dailyMetrics, baselines]);') + '}, [dailyMetrics, baselines]);'.length;
const useMemoLogic = dash.substring(umStart, umEnd);

// Extract HelperVars
const hvStart = dash.indexOf('  // Helper to safely get metric info without mocking');
const hvEnd = dash.indexOf(']', dash.indexOf('const battery = getMetricData(')) + 2;
const helperVarsContent = dash.substring(hvStart, hvEnd);
dash = dash.substring(0, hvStart) + dash.substring(hvEnd);

// Add to InsightsPage
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

// Move Live Sensor to Settings
const lsStart = dash.indexOf('{/* Live Sensors & Real-Time Evaluation Control Bar */}');
const lsEnd = dash.indexOf('{/* Predictive Alert Banner (if active) */}');
const liveSensorContent = dash.substring(lsStart, lsEnd);
dash = dash.substring(0, lsStart) + dash.substring(lsEnd);

const hmeStart = dash.indexOf('  const handleManualEvaluate = async () => {');
const hmeEnd = dash.indexOf('  };', hmeStart) + 4;
const handleManualFunc = dash.substring(hmeStart, hmeEnd);
dash = dash.substring(0, hmeStart) + dash.substring(hmeEnd);

dash = dash.replace("  const [evalToast, setEvalToast] = useState<string | null>(null);\n", '');

// Add imports to SettingsPage
set = set.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useMemo } from 'react';\nimport { useLiveQuery } from 'dexie-react-hooks';\nimport { db } from '../db';\nimport { calculateZScore } from '../engine/anomaly';\nimport { AnomalyResult } from '../types/engine';"
);

set = set.replace(
  "  Sun,",
  "  Sun, Battery, CheckCircle2, Activity, Keyboard," // I am just injecting all possible missing icons
);

// Add state to Settings
set = set.replace(
  "  const {\\n    userProfile,",
  "  const {\\n    userProfile,\\n    runAnalysisPipeline,\\n    isAnalyzing,\\n    baselineDayCount,\\n"
);
// In case Windows EOL:
set = set.replace(
  "  const {\r\n    userProfile,",
  "  const {\r\n    userProfile,\r\n    runAnalysisPipeline,\r\n    isAnalyzing,\r\n    baselineDayCount,\r\n"
);


set = set.replace(
  "  const [isEditingName, setIsEditingName] = useState(false);",
  "  const [evalToast, setEvalToast] = useState<string | null>(null);\n\n  const dailyMetrics = useLiveQuery(() => db.dailyMetrics.toArray()) || [];\n  const baselines = useLiveQuery(() => db.baselines.toArray()) || [];\n\n" + useMemoLogic + "\n\n" + helperVarsContent + "\n\n" + handleManualFunc + "\n\n  const [isEditingName, setIsEditingName] = useState(false);"
);

// Add the UI to Settings
set = set.replace(
  "      {/* 1. KULLANICI PROFÝLÝ & GOOGLE HESABI */}",
  liveSensorContent + "\n\n      {/* 1. KULLANICI PROFÝLÝ & GOOGLE HESABI */}"
);

// Clean up Dashboard unused variables
dash = dash.replace(/const \{ isAnalyzing, activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount, runAnalysisPipeline \} = useAppStore\(\);/, 
  'const { activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount } = useAppStore();');
dash = dash.replace(/const \{ historyByKey, latestMetricsByKey, anomalies, baselineMap \} = useMemo/,
  'const { anomalies } = useMemo');
dash = dash.replace(/import \{ MetricCard \} from '\.\.\/components\/dashboard\/MetricCard';\r?\n/, '');
dash = dash.replace(/  Activity,\r?\n  Keyboard,\r?\n  Moon,\r?\n  Smartphone,\r?\n  RefreshCw,\r?\n  CheckCircle2,\r?\n  Battery,\r?\n  Wifi,\r?\n/, '');
dash = dash.replace(/import \{ healthService \} from '\.\.\/services\/native\/healthService';\r?\n/, '');

// Clean up InsightsPage unused variables
ins = ins.replace(/const \{ historyByKey, latestMetricsByKey, anomalies, baselineMap \} = useMemo/,
  'const { historyByKey, latestMetricsByKey, baselineMap } = useMemo');
ins = ins.replace(/const battery = [^\n]*;\r?\n/, ''); // remove battery usage

fs.writeFileSync(dashPath, dash);
fs.writeFileSync(insPath, ins);
fs.writeFileSync(setPath, set);
console.log('Done!');
