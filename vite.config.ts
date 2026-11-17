import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// base './' so the build works from any folder (preview artifact, Cloudflare Pages, a USB stick).
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  plugins: [
    react(),
    // PWA (ui worker): offline after the first load. Voice clips and model files are cached as they are used.
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'الراشد روبوت السلامة المدرسية',
        short_name: 'الراشد',
        description: 'الراشد روبوت السلامة المدرسية',
        lang: 'ar',
        dir: 'rtl',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#14B8A6',
        background_color: '#FFF8EC',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff,woff2,ttf,json,wasm,ktx2,glb}'],
        globIgnores: ['**/audio/voice/**', '**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/voice/') || url.pathname.startsWith('/api/tts'),
            handler: 'CacheFirst',
            options: { cacheName: 'voice', expiration: { maxEntries: 4000 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => /(^|\.)huggingface\.co$|(^|\.)hf\.co$/.test(url.hostname) || url.hostname.includes('cdn-lfs'),
            handler: 'CacheFirst',
            options: { cacheName: 'models', expiration: { maxEntries: 60 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
  // Pre-bundle heavy deps up front so the dev server never reloads mid-screenshot.
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'three', '@react-three/fiber', '@react-three/drei',
      'zustand', 'xstate', '@xstate/react', 'howler', 'lucide-react', 'chart.js', 'chart.js/auto',
    ],
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
