import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: ['favicon.ico', 'favicon.svg', 'favicon-96x96.png', 'apple-touch-icon.png', 'web-app-manifest-192x192.png', 'web-app-manifest-512x512.png'],
        manifest: {
          name: "Scholar's Dungeon",
          short_name: "Scholar's Dungeon",
          description: 'A gamified productivity app',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          gcm_sender_id: '103953800507',
          icons: [
            {
              src: '/web-app-manifest-192x192.png?v=20260510',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/web-app-manifest-512x512.png?v=20260510',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/web-app-manifest-192x192.png?v=20260510',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/web-app-manifest-512x512.png?v=20260510',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        } as any
      })
    ],
    define: {
      'process.env.VAPID_PUBLIC_KEY': JSON.stringify(env.VAPID_PUBLIC_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443 },
    },
  };
});
