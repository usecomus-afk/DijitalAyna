/**
 * Completely clears service worker caches and forces a hard reload
 * to ensure mobile PWA and native webview users get the latest version immediately.
 */
export async function forceAppUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (e) {
    console.error('[UpdateManager] Error clearing cache:', e);
  }

  // Force hard reload bypassing browser cache with cache buster param
  const url = new URL(window.location.href);
  url.searchParams.set('v', Date.now().toString());
  window.location.replace(url.toString());
}
