import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment:'jsdom', include:['qa/new-independent-review/*.test.tsx'], globals:false }, esbuild: { jsx:'automatic' } });
