import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'jsdom', include: ['reviewer-tests/*.test.tsx'] }, esbuild: { jsx: 'automatic' } });
