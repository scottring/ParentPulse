import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./__tests__/setup/vitest.setup.ts'],
    include: [
      '__tests__/**/*.test.{ts,tsx}',
      'firestore-rules/**/*.test.ts'
    ],
    exclude: [
      'node_modules',
      '__e2e__/**/*',
      'functions/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '__tests__/setup/**',
        '__tests__/**/*.test.{ts,tsx}',
        '**/*.d.ts',
        'functions/**',
        '__e2e__/**'
      ],
      include: [
        'src/**/*.{ts,tsx}'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
