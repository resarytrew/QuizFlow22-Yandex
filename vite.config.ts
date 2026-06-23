import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { quizEnginePlugin } from './vite-plugin-quiz-engine';
import { replaceInlineScriptCspMarker } from './utils/viteCsp';

function reactRefreshCspPlugin(): Plugin {
  return {
    name: 'potok-react-refresh-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return replaceInlineScriptCspMarker(
          html,
          '__VITE_REACT_REFRESH_CSP__',
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        // host intentionally omitted: do NOT bind 0.0.0.0 by default in
        // production builds. Pass --host 0.0.0.0 explicitly only when
        // running behind a trusted reverse proxy in a private network.
        // Allowing LAN-wide binding by default exposes the dev server
        // (with HMR websocket) to anyone on the same network.
      },
      plugins: [react(), reactRefreshCspPlugin(), quizEnginePlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        // Не вставлять inline-полифилл modulePreload, чтобы CSP мог запретить
        // inline-скрипты (script-src без 'unsafe-inline'). Современные браузеры
        // поддерживают modulepreload нативно.
        modulePreload: { polyfill: false },
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            play: path.resolve(__dirname, 'play.html'),
          },
          output: {
            // Split heavy vendor bundles so the main bundle stays small.
            // First-paint critical code is unchanged; only the cache
            // granularity improves. Long-tail deps land in their own
            // chunks that can be loaded in parallel.
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-flow': [
                'reactflow',
                'dagre',
              ],
              'vendor-supabase': [
                '@supabase/supabase-js',
              ],
              'vendor-utils': [
                'clsx',
                'canvas-confetti',
                'zustand',
              ],
            },
          },
        },
      },
    };
});
