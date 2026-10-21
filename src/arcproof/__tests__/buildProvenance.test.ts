import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EVIDENCE_INPUTS, sourceSnapshot, outputSnapshot } from '../../../scripts/buildProvenance';
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
