import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initVersionWatcher } from './utils/versionCheck';

// Initialize autonomous OTA version watcher
initVersionWatcher();



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
