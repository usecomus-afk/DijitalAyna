import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker with active update checking
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Immediately check if an updated service worker is available
        registration.update().catch(() => {});

        // Check on window focus (when returning to the app on iOS/Android)
        window.addEventListener('focus', () => {
          registration.update().catch(() => {});
        });

        // Periodically check every 60 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);
      })
      .catch((err) => {
        console.log('SW registration error:', err);
      });
  });

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
