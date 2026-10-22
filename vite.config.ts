/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { sourceSnapshot, outputSnapshot, buildProvenanceScopes } from './scripts/buildProvenance'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Network selection is a strict build input, not runtime URL/storage configuration.
const networkKey = process.env.VITE_ARCPROOF_NETWORK ?? 'testnet';
if (networkKey !== 'testnet' && networkKey !== 'mainnet') throw new Error('Unsupported VITE_ARCPROOF_NETWORK; use testnet or mainnet.');

// Declared inputs include the two evidence fixtures imported by tests, not logs.
const snapshot = sourceSnapshot(__dirname);
const provenanceScopes = buildProvenanceScopes(__dirname);
const buildIdentity = {
  networkKey,
  sourceCommit: null,
  verifiedBaseCommit: /^[0-9a-f]{40}$/.test(process.env.ARCPROOF_VERIFIED_BASE_SHA ?? '') ? process.env.ARCPROOF_VERIFIED_BASE_SHA : null,
  sourceSnapshotSha256: snapshot.sha256,
  builtAtUTC: new Date().toISOString(),
  sourceState: 'candidate',
};

export default defineConfig({
  define: { __ARCPROOF_BUILD_IDENTITY__: JSON.stringify(buildIdentity), 'import.meta.env.VITE_ARCPROOF_NETWORK': JSON.stringify(networkKey) },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
  plugins: [{
    name: 'arcproof-build-provenance',
    // Some Vite plugins still transform outputs after generateBundle. Re-hash the
    // actual written bytes, not an intermediate chunk, before declaring identity.
    writeBundle(options) {
      const directory = path.resolve(__dirname, options.dir ?? 'dist');
      const manifestPath = path.join(directory, 'build-provenance.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      manifest.outputs = outputSnapshot(directory);
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
    generateBundle(_options, bundle) {
      const outputs = Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b)).map(([file, output]) => ({
        path: file,
        sha256: createHash('sha256').update(output.type === 'chunk' ? output.code : output.source).digest('hex'),
      }));
      this.emitFile({ type: 'asset', fileName: 'build-provenance.json', source: JSON.stringify({
        ...buildIdentity, schema: 'arcproof-build-provenance-v2', sourceInputs: snapshot.records, ...provenanceScopes, outputs,
        limits: 'Scoped declared-input and final output-file hashes, including checked-in forge-std, dependency locks, ABI and reference artifact. Installed artifact-referenced contract dependencies are separately fingerprinted, not all installed packages. Excludes root manifest self-hash and toolchain binaries. Not a Git commit, Studio equivalence, fresh compilation, live host readback, test result, or chain attestation.',
      }, null, 2) });
    },
  }, react(), nodePolyfills({
    // Bundle inspection needs only the existing browser Buffer/process globals.
    // Do not alias every Node core module (crypto/fs/stream/etc.) by default.
    include: ['buffer', 'process'],
    globals: { Buffer: true, global: true, process: true },
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'connectkit',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
  },
  server: {
    // Keep source/HMR local. Cross-origin Studio previews need a separately
    // verified, exact allowlist; never restore blanket Host/CORS access.
    host: '127.0.0.1',
    allowedHosts: [],
    cors: false,
  },
  preview: {
    host: '127.0.0.1',
    allowedHosts: [],
    cors: false,
  },
})
