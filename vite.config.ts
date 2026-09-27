import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const buildTimestamp = Date.now();

// Ensure version.json is generated in public/ before build
fs.writeFileSync(
  path.resolve(__dirname, 'public/version.json'),
  JSON.stringify({ buildTime: buildTimestamp, version: '0.1.0' }, null, 2)
);

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
