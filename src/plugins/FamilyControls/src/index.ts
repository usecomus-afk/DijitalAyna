import { registerPlugin } from '@capacitor/core';
import type { FamilyControlsPlugin } from './definitions';

const FamilyControls = registerPlugin<FamilyControlsPlugin>('FamilyControls', {});

export * from './definitions';
export { FamilyControls };
