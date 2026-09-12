// vitest.config.ts
//
// Vitest config for the P0 tests-infrastructure sprint. Scope:
//   - jsdom environment (DOM globals for any utils that touch window/document)
//   - `src/**`, `utils/**`, `services/**`, `store/**`, `hooks/**` are
//     included so frontend-side helpers get coverage. React
//     components under `components/**` are intentionally NOT
//     included in P0 — adding @testing-library/react here would
//     pull in a heavy runtime + the components have their own
//     shape. Phase 5 follow-up will revisit.
//   - `coverage/` excluded from git via .gitignore.
//
// Run with: `npm test` (CI), `npm run test:watch` (dev), or
// `npm run test:ui` (browser UI). Coverage: `npm run test:coverage`.

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    minWorkers: 1,
    maxWorkers: 2,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'utils/**/*.{test,spec}.{ts,tsx}',
      'services/**/*.{test,spec}.{ts,tsx}',
      'store/**/*.{test,spec}.{ts,tsx}',
      'hooks/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: [
        'node_modules',
        'dist',
        'coverage',
        'legacy',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types.ts',
      ],
    },
  },
});
