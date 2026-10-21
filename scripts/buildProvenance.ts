/** Local build identity helpers. No Git assumptions, network, or environment secrets. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

export const EVIDENCE_INPUTS = [
  'evidence/g1/ArcProofInvoices.artifact.json',
  'evidence/g3-native-verifier/observed-browser-evidence.json',
] as const;

function walkFiles(root: string, relative = ''): string[] {
  const absolute = path.resolve(root, relative);
  if (!existsSync(absolute)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Provenance input symlink not supported: ${child}`);
    if (entry.isDirectory()) files.push(...walkFiles(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
function hashFiles(root: string, files: string[]) {
  return [...new Set(files)].sort().map(file => ({
    path: file, sha256: createHash('sha256').update(readFileSync(path.resolve(root, file))).digest('hex'),
  }));
}
export function sourceSnapshot(root: string) {
  const files = ['src', 'public', 'contracts', 'scripts'].flatMap(directory => walkFiles(root, directory));
  for (const file of ['package.json', 'bun.lock', 'index.html', 'vite.config.ts', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js', 'tailwind.config.ts', 'foundry.toml', 'remappings.txt']) {
    if (existsSync(path.resolve(root, file))) files.push(file);
  }
  // Only fixture dependencies actually imported by the test tree. Never walk
  // all evidence/docs: generated logs would create circular, unstable identity.
  files.push(...EVIDENCE_INPUTS);
  const records = hashFiles(root, files);
  return { records, sha256: createHash('sha256').update(JSON.stringify(records)).digest('hex') };
}
export function outputSnapshot(directory: string) {
  // Includes copied public assets and nested files, excludes only our root
  // manifest to avoid a self-referential hash. Reads actual final disk bytes.
  return hashFiles(directory, walkFiles(directory).filter(file => file !== 'build-provenance.json'));
}
