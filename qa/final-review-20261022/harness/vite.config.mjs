import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
const here = new URL('.', import.meta.url).pathname;
// HARNESS_ROOT is the repository checkout to build; HARNESS_OUT is a scratch output directory. Both are required.
const root = process.env.HARNESS_ROOT;
const out = process.env.HARNESS_OUT;
if (!root || !out) throw new Error('Set HARNESS_ROOT (repo checkout) and HARNESS_OUT (scratch dir).');
export default defineConfig({
  root,
  define: {
    'import.meta.env.VITE_ARCPROOF_NETWORK': '"testnet"',
    __ARCPROOF_BUILD_IDENTITY__: JSON.stringify({ networkKey: 'testnet', sourceCommit: null, verifiedBaseCommit: null, sourceSnapshotSha256: 'a'.repeat(64), builtAtUTC: '2026-10-22T00:00:00.000Z', sourceState: 'candidate' }),
  },
  plugins: [react(), nodePolyfills({ include: ['buffer', 'process'], globals: { Buffer: true, global: true, process: true } })],
  resolve: {
    alias: [
      { find: /^\.\.\/\.\.\/arcproof\/testnetClient$/, replacement: here + 'stub-testnetClient.ts' },
      { find: '@real-client', replacement: root + '/src/arcproof/testnetClient.ts' },
      { find: '@real-testnet', replacement: root + '/src/arcproof/testnet.ts' },
    ],
    dedupe: ['react', 'react-dom'],
  },
  build: { outDir: out, emptyOutDir: true },
});
