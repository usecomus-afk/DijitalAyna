import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker with active update checking
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const initServiceWorker = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Immediately check if an updated service worker is available
        registration.update().catch(() => {});

        // Check on window focus and visibility change (when user returns to app on iOS/Android)
        window.addEventListener('focus', () => {
          registration.update().catch(() => {});
        });

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        // Periodically check every 30 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 1000);
      })
      .catch((err) => {
        console.log('SW registration error:', err);
      });
  };

  if (document.readyState === 'complete') {
    initServiceWorker();
  } else {
    window.addEventListener('load', initServiceWorker);
  }

  // When new service worker activates, reload seamlessly to apply new assets
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
