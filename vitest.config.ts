import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      exclude: [
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/chart-utils.ts',
        '**/utils.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
