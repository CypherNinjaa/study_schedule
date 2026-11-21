/// <reference types="vitest/config" />
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Emit `/studyos/index.html` and `/404.html` into `dist/` after Vite builds
 * so GitHub Pages serves `https://study.vikashin.tech/studyos` with HTTP 200
 * and handles direct refreshes on SPA routes cleanly.
 */
function emitStaticRoutes(): Plugin {
  return {
    name: 'emit-static-routes',
    closeBundle() {
      const distDir = fileURLToPath(new URL('./dist', import.meta.url));
      const indexHtml = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtml)) return;
      const html = fs.readFileSync(indexHtml, 'utf-8');
      const studyosDir = path.join(distDir, 'studyos');
      fs.mkdirSync(studyosDir, { recursive: true });
      fs.writeFileSync(path.join(studyosDir, 'index.html'), html);
      fs.writeFileSync(path.join(distDir, '404.html'), html);
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    emitStaticRoutes(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Study Schedule',
        short_name: 'StudySchedule',
        description: 'Personal Study Schedule & Productivity OS',
        theme_color: '#e58b4a',
        background_color: '#131416',
        display: 'standalone',
        scope: '/',
        start_url: '/studyos',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/docs\//, /^\/launch\.html/],
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
        // Heavy engines stay in dedicated chunks so `/` and `/studyos` stay fast.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('framer-motion') || id.includes('lenis')) return 'motion';
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
