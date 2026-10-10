const fs = require('fs');

// Fix DashboardPage
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace(/const \{ isAnalyzing, activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount, runAnalysisPipeline \} = useAppStore\(\);/, 
  'const { activePredictiveAlertDismissed, dismissPredictiveAlert, baselineDayCount } = useAppStore();');
dash = dash.replace(/const \{ historyByKey, latestMetricsByKey, anomalies, baselineMap \} = useMemo/,
  'const { anomalies } = useMemo');

// Fix InsightsPage
let ins = fs.readFileSync('src/pages/InsightsPage.tsx', 'utf8');
ins = ins.replace(/const \{ historyByKey, latestMetricsByKey, anomalies, baselineMap \} = useMemo/,
  'const { historyByKey, latestMetricsByKey, baselineMap } = useMemo');
ins = ins.replace(/const battery = [^\n]*;\n/, ''); // remove battery usage

fs.writeFileSync('src/pages/DashboardPage.tsx', dash);
fs.writeFileSync('src/pages/InsightsPage.tsx', ins);
