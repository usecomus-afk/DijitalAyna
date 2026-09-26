import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png', 'pwa-192x192.png', 'pwa-512x512.png', 'robots.txt', 'version.json'],
      manifest: {
        name: 'Dijital Mental İkizim',
        short_name: 'Dijital Mental İkizim',
        description: 'Dijital Mental İkizim — Dijital fenotipleme ile kişisel baz hattı ve davranışsal farkındalık platformu',
        theme_color: '#F2F0EB',
        background_color: '#F2F0EB',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png?v=2',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png?v=2',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo.png?v=2',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
