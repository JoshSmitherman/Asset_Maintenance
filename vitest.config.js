import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Unit tests for src/lib/** run in Node; component tests under src/components/**
// need a DOM, so they run in jsdom. E2E (Playwright) lives in ./e2e and is
// excluded here so `npm test` stays fast and offline.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    environmentMatchGlobs: [['src/components/**', 'jsdom']],
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**']
  }
});
