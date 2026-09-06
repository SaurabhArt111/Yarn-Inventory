import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA notes (kept here so the config is self-explanatory for whoever
// touches it next):
//
// - registerType: 'prompt' -- a new service worker installs in the
//   background but does NOT activate itself. The app is a multi-tenant
//   ERP with in-progress forms (stock entries, beam production), so we
//   never want to silently reload out from under someone mid-edit.
//   src/pwa/registerSW.js listens for the "new version ready" event and
//   shows a dismissible in-app toast; activation only happens once the
//   user clicks "Reload". That toast IS the "automatic update handling"
//   requested -- the app checks for and downloads updates automatically
//   (including a periodic background check), the person just confirms
//   the swap so nothing mid-edit gets lost.
// - injectRegister: false -- registration is done by hand in
//   src/pwa/registerSW.js via the `virtual:pwa-register` module, so we
//   can wire it into the existing ToastContext instead of the plugin's
//   default (silent) auto-injected snippet.
// - API calls (/api/**) are only ever handled with NetworkFirst and only
//   for GET requests (Workbox's registerRoute defaults to GET), so
//   writes (POST/PUT/PATCH/DELETE) always go straight to the network,
//   untouched by the service worker -- exactly as before this change.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'browserconfig.xml',
      ],
      manifest: {
        id: '/',
        name: 'Yarn ERP — Inventory & Production',
        short_name: 'Yarn ERP',
        description:
          'Multi-tenant yarn manufacturing ERP: stock, beam production, inventory ledgers, analytics and reports.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        orientation: 'any',
        background_color: '#f5f3ef',
        theme_color: '#1f2a44',
        categories: ['business', 'productivity', 'utilities'],
        lang: 'en',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Dashboard', url: '/?source=pwa-shortcut', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Stock Entries', url: '/stock?source=pwa-shortcut', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Beam Production', url: '/beams/new?source=pwa-shortcut', icons: [{ src: '/icons/pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        globIgnores: ['splash/**', 'icons/mstile-*.png'],
        runtimeCaching: [
          {
            // App data: always try the network first so numbers on screen
            // are never stale; fall back to the last-seen response only
            // when the network genuinely isn't reachable. GET only, so
            // creating/editing/deleting stock, beams, etc. is never
            // served from cache.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-get-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Off by default: the dev server already proxies /api to the
        // Express backend, and running a service worker on top of that
        // during development just adds a layer of caching confusion.
        // Flip to `true` locally only if you specifically need to debug
        // the service worker itself (`npm run dev`, then check
        // chrome://inspect/#service-workers).
        enabled: false,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
