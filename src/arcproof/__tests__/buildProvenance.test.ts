import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EVIDENCE_INPUTS, sourceSnapshot, outputSnapshot, compareInputRecords, buildProvenanceScopes } from '../../../scripts/buildProvenance';
function temporaryTree(run: (root: string, put: (file: string, content: string) => void) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'arcproof-provenance-test-'));
  const put = (file: string, content: string) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), content); };
  try { run(root, put); } finally { rmSync(root, { recursive: true, force: true }); }
}
describe('narrow source dependency and complete output snapshots', () => {
  it('changes identity when either imported evidence fixture changes, not when reports/logs change', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    put('src/main.ts', 'test source');
    const initial = sourceSnapshot(root);
    put('evidence/new-result.log', 'new result'); put('docs/review.md', 'changed prose');
    expect(sourceSnapshot(root).sha256).toBe(initial.sha256);
    for (const file of EVIDENCE_INPUTS) {
      const before = sourceSnapshot(root).sha256;
      put(file, '{"changed":true}'); expect(sourceSnapshot(root).sha256).not.toBe(before);
    }
  }));
  it('fails closed when a required imported evidence fixture is missing', () => temporaryTree((root, put) => {
    put(EVIDENCE_INPUTS[0], '{}'); expect(() => sourceSnapshot(root)).toThrow();
  }));
  it('tracks public input bytes and copied output assets while excluding only the root manifest', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    put('public/nested/probe.txt', 'temporary public asset');
    const initial = sourceSnapshot(root).sha256;
    put('public/nested/probe.txt', 'changed public asset');
    expect(sourceSnapshot(root).sha256).not.toBe(initial);
    put('dist/nested/probe.txt', 'changed public asset'); put('dist/assets/main.js', 'code');
    put('dist/build-provenance.json', 'root manifest'); put('dist/nested/build-provenance.json', 'ordinary nested asset');
    const outputs = outputSnapshot(path.join(root, 'dist'));
    expect(outputs.map(x => x.path)).toEqual(['assets/main.js', 'nested/build-provenance.json', 'nested/probe.txt']);
    expect(outputs.find(x => x.path === 'nested/probe.txt')?.sha256).toBe(createHash('sha256').update('changed public asset').digest('hex'));
    put('dist/build-provenance.json', 'new manifest'); expect(outputSnapshot(path.join(root, 'dist'))).toEqual(outputs);
  }));
});

describe('declared source scopes exclude generated files, not executable inputs', () => {
  it('ignores root and nested Foundry/Vite generated outputs', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    put('contracts/Main.sol', 'contract Main {}'); const initial = sourceSnapshot(root).sha256;
    for (const file of ['contracts/out/Main.sol/Main.json', 'contracts/cache/solidity-files-cache.json', 'out/build-info.json', 'cache/x', 'dist/index.html']) put(file, 'generated');
    expect(sourceSnapshot(root).sha256).toBe(initial);
  }));
  it('includes Studio runtime instrumentation and deployment scripts rather than dismissing extras as cache', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    for (const file of ['src/console-capture.ts', 'src/tracing.ts', 'contracts/script/Deploy.s.sol', 'scripts/self-deploy.ts']) {
      const before = sourceSnapshot(root).sha256; put(file, 'runtime or deployment input'); expect(sourceSnapshot(root).sha256).not.toBe(before);
    }
  }));
  it('binds checked-in contract test dependencies and the root ABI', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    for (const file of ['lib/forge-std/src/Test.sol', 'lib/forge-std/package.json', 'ArcProofInvoices.abi.json', 'tools/solc-wrapper.sh']) {
      const before = sourceSnapshot(root).sha256; put(file, 'declared dependency input'); expect(sourceSnapshot(root).sha256).not.toBe(before);
    }
  }));
});


describe('scope comparison and reference compiler metadata remain bounded claims', () => {
  it('does not discard source or public assets just because a folder is named cache or dist', () => temporaryTree((root, put) => {
    for (const file of EVIDENCE_INPUTS) put(file, '{}');
    for (const file of ['src/cache/runtime.ts', 'public/dist/asset.json']) {
      const before = sourceSnapshot(root).sha256; put(file, 'real input'); expect(sourceSnapshot(root).sha256).not.toBe(before);
    }
  }));
  it('reports missing, modified and additional files instead of declaring whole-workspace identity', () => {
    expect(compareInputRecords([{ path: 'src/a', sha256: '1' }, { path: 'src/b', sha256: '2' }],
      [{ path: 'src/a', sha256: '3' }, { path: 'src/extra', sha256: '4' }])).toEqual({ missing: ['src/b'], modified: ['src/a'], additional: ['src/extra'] });
  });
  it('records full reference compiler/settings and missing dependencies without calling them a fresh build', () => temporaryTree((root, put) => {
    put(EVIDENCE_INPUTS[0], JSON.stringify({ metadata: { compiler: { version: '0.8.28+commit.7893614a' }, settings: { evmVersion: 'paris', optimizer: { enabled: true, runs: 200 }, metadata: { bytecodeHash: 'ipfs' } }, sources: { 'node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol': {} } } }));
    put(EVIDENCE_INPUTS[1], '{}');
    const { contractArtifactReference, inputRules } = buildProvenanceScopes(root);
    expect(contractArtifactReference.compilerFullVersion).toBe('0.8.28+commit.7893614a');
    expect(contractArtifactReference.settings).toMatchObject({ evmVersion: 'paris', optimizer: { runs: 200 }, metadata: { bytecodeHash: 'ipfs' } });
    expect(contractArtifactReference.missingInstalledDependencies).toContain('node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol');
    expect(contractArtifactReference.purpose).toContain('Not proof of a fresh compilation');
    expect(inputRules.workspaceComparison).toContain('NOT_RUN');
  }));
});
