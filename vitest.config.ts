import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    // I test dei componenti (.test.tsx) girano in jsdom con setup comune.
    environmentMatchGlobs: [['src/__tests__/**/*.test.tsx', 'jsdom']],
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
