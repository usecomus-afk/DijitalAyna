import { registerPlugin } from '@capacitor/core';
const FamilyControls = registerPlugin('FamilyControls', {
    web: () => ({
        requestAuthorization: async () => ({ granted: false, fallback: true }),
        selectApps: async () => ({ success: false, fallback: true, selectedCount: 0 }),
        setShield: async () => ({ success: true, fallback: true, selectedCount: 0 }),
        clearShield: async () => ({ success: true, fallback: true }),
        getStatus: async () => ({ authorized: false, fallback: true, selectedCount: 0 }),
    }),
});
export * from './definitions';
export { FamilyControls };
