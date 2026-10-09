import { registerPlugin } from '@capacitor/core';

export interface ComusSleepPlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  getSleepData(options: { startDate: string; endDate: string }): Promise<{
    samples: {
      value: number; // 0=inBed, 1=asleep, 2=awake
      startDate: string;
      endDate: string;
      source: string;
    }[];
  }>;
}

const ComusSleep = registerPlugin<ComusSleepPlugin>('ComusSleep');

export { ComusSleep };
