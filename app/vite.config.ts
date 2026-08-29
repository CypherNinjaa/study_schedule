/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/study_schedule/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Study Schedule',
        short_name: 'StudySchedule',
        description: 'Personal Study Schedule & Productivity OS',
        theme_color: '#4f46e5',
        background_color: '#0c0e14',
        display: 'standalone',
        scope: '/study_schedule/',
        start_url: '/study_schedule/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Honour a PORT assigned by the environment (e.g. the preview harness);
    // fall back to Vite's default when unset.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        // Charts are heavy and only needed on Analytics, so they get their
        // own chunk instead of blocking first paint.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('three') || id.includes('@react-three')) return 'three';
          if (id.includes('pdfjs-dist')) return 'pdf-reader';
          if (id.includes('epubjs')) return 'epub-reader';
          if (id.includes('dexie')) return 'dexie';
          if (id.includes('react') || id.includes('zustand') || id.includes('date-fns')) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
