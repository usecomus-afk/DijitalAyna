const fs = require('fs');

// Fix sensor.ts
let c = fs.readFileSync('src/types/sensor.ts', 'utf8');
c = c.replace(
  "export type SensorType = 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice';", 
  "export type SensorType = 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice' | 'sleep';"
);
c = c.replace(
  "category: 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice';", 
  "category: 'motion' | 'typing' | 'touch' | 'session' | 'light' | 'battery' | 'network' | 'voice' | 'sleep';"
);
c = c.replace(
  "| 'camera_interaction_count';", 
  "| 'camera_interaction_count'\n  | 'sleep_efficiency';"
);

if (!c.includes('sleep_efficiency: {')) {
  c = c.replace(
    "camera_interaction_count: {", 
    "sleep_efficiency: {\n    key: 'sleep_efficiency',\n    label: 'Uyku Verimliliği',\n    unit: 'puan',\n    category: 'sleep',\n    description: 'Apple Sağlık üzerinden alınan TST ve WASO analizlerine dayalı uyku kalitesi.',\n    healthyTrend: 'higher',\n  },\n  camera_interaction_count: {"
  );
}

fs.writeFileSync('src/types/sensor.ts', c, 'utf8');

// Fix healthService.ts
let h = fs.readFileSync('src/services/native/healthService.ts', 'utf8');
h = h.replace(
  "tst_minutes: sleepRes.tst,",
  "tst_minutes: sleepRes.tst || 0,"
);
h = h.replace(
  "waso_minutes: sleepRes.waso,",
  "waso_minutes: sleepRes.waso || 0,"
);
fs.writeFileSync('src/services/native/healthService.ts', h, 'utf8');
