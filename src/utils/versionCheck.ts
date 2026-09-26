/**
 * Autonomous Over-the-Air (OTA) Version Detection & Synchronization
 * Guarantees that mobile PWA / Web Clip users receive the latest build
 * seamlessly simply by closing and reopening or returning to the app.
 */
import { forceAppUpdate } from './updateManager';

declare const __APP_BUILD_TIME__: number;

let isUpdating = false;

export async function checkRemoteVersion(): Promise<void> {
  if (isUpdating) return;
  try {
    const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data && data.buildTime && data.buildTime > currentBuild) {
      console.log(`[VersionCheck] Newer build detected on server: ${data.buildTime} > ${currentBuild}. Updating app now...`);
      isUpdating = true;
      await forceAppUpdate();
    }
  } catch (err) {
    // Offline or network error; skip quietly
  }
}

export function initVersionWatcher(): void {
  // Check immediately upon startup
  checkRemoteVersion();

  // Check on focus / resume
  window.addEventListener('focus', () => {
    checkRemoteVersion();
  });

  // Check when user unlocks phone or switches back to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkRemoteVersion();
    }
  });

  // Check on iOS Safari page cache restore (pageshow)
  window.addEventListener('pageshow', () => {
    checkRemoteVersion();
  });

  // Periodic background check every 20 seconds
  setInterval(() => {
    checkRemoteVersion();
  }, 20 * 1000);
}
