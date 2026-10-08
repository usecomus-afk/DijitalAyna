import { db } from '../db';

export const checkProactivePrediction = async (): Promise<boolean> => {
  try {
    const allMetrics = await db.dailyMetrics.orderBy('date').reverse().toArray();
    if (allMetrics.length < 3) return false; // Need 3 days of data

    const dates = Array.from(new Set(allMetrics.map(m => m.date))).slice(0, 3);
    if (dates.length < 3) return false;

    // Check night usage / sleep disruption (Proxy for SOL/WASO)
    const recentNightUsage = allMetrics.filter(m => dates.includes(m.date) && m.metricKey === 'night_usage_minutes');
    const sleepIrregular = recentNightUsage.some(m => m.value > 60);

    // Check screen session increasing
    const recentSessions = allMetrics.filter(m => dates.includes(m.date) && m.metricKey === 'session_duration');
    const screenTimeHigh = recentSessions.some(m => m.value > 120);

    return sleepIrregular && screenTimeHigh;
  } catch (error) {
    console.error('[ProactiveAdvisor] Error checking prediction:', error);
    return false;
  }
};
