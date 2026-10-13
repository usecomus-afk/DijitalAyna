import { registerPlugin } from '@capacitor/core';
import type { FamilyControlsPlugin } from './definitions';

const FamilyControls = registerPlugin<FamilyControlsPlugin>('FamilyControls', {
  web: () => ({
    requestAuthorization: async () => ({ granted: false, fallback: true }),
    selectApps: async () => ({ success: false, fallback: true }),
    setShield: async () => ({ success: true, fallback: true }),
    clearShield: async () => ({ success: true, fallback: true }),
  }),
});

export * from './definitions';
export { FamilyControls };

