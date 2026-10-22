/** Declared byte scopes. No implicit Git identity, secrets, or whole-workspace equivalence claim. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const EVIDENCE_INPUTS = [
  'evidence/g1/ArcProofInvoices.artifact.json',
  'evidence/g3-native-verifier/observed-browser-evidence.json',
] as const;
export const GENERATED_DIRECTORIES = new Set(['out', 'cache', 'dist', 'contracts/out', 'contracts/cache']);
const NON_SOURCE_DIRECTORY_NAMES = new Set(['node_modules', '.git', '.vite']);
const FRONTEND_CONFIG = ['package.json', 'bun.lock', 'index.html', 'vite.config.ts', 'tsconfig.json',
  'postcss.config.js', 'tailwind.config.js', 'tailwind.config.ts', '.oxlintrc.json'];
const CONTRACT_CONFIG = ['foundry.toml', 'remappings.txt', 'ArcProofInvoices.abi.json'];
export interface FileDigest { path: string; sha256: string }
function walkFiles(root: string, relative = '', excludeGenerated = true): string[] {
  const absolute = path.resolve(root, relative);
  if (!existsSync(absolute)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (excludeGenerated && entry.isDirectory() && (GENERATED_DIRECTORIES.has(child) || NON_SOURCE_DIRECTORY_NAMES.has(entry.name))) continue;
    if (entry.isSymbolicLink()) throw new Error(`Provenance input symlink not supported: ${child}`);
    if (entry.isDirectory()) files.push(...walkFiles(root, child, excludeGenerated));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
function hashFiles(root: string, files: string[]): FileDigest[] {
  return [...new Set(files)].sort().map(file => ({
    path: file, sha256: createHash('sha256').update(readFileSync(path.resolve(root, file))).digest('hex'),
  }));
}
function scope(root: string, files: string[]) {
  const records = hashFiles(root, files);
  return { records, sha256: createHash('sha256').update(JSON.stringify(records)).digest('hex') };
}
const existing = (root: string, files: readonly string[]) => files.filter(file => existsSync(path.resolve(root, file)));

/** Scoped lists remain independently comparable; no fixed file count is required. */
export function declaredInputScopes(root: string) {
  return {
    application: scope(root, [...walkFiles(root, 'src'), ...walkFiles(root, 'public'), ...existing(root, FRONTEND_CONFIG)]),
    contractBuildAndTests: scope(root, [...walkFiles(root, 'contracts'), ...walkFiles(root, 'lib/forge-std'), ...existing(root, CONTRACT_CONFIG)]),
    buildAndDeploymentTools: scope(root, [...walkFiles(root, 'scripts'), ...walkFiles(root, 'tools')]),
    importedTestEvidence: scope(root, [...EVIDENCE_INPUTS]),
  };
}
export function sourceSnapshot(root: string) {
  const scopes = declaredInputScopes(root);
  return scope(root, Object.values(scopes).flatMap(value => value.records.map(record => record.path)));
}
/** Exact approved-input comparison for later Studio/export readback, not an implicit assertion. */
export function compareInputRecords(approved: readonly FileDigest[], observed: readonly FileDigest[]) {
  const expected = new Map(approved.map(file => [file.path, file.sha256]));
  const actual = new Map(observed.map(file => [file.path, file.sha256]));
  return {
    missing: approved.filter(file => !actual.has(file.path)).map(file => file.path),
    modified: approved.filter(file => actual.has(file.path) && actual.get(file.path) !== file.sha256).map(file => file.path),
    additional: observed.filter(file => !expected.has(file.path)).map(file => file.path),
  };
}
function version(command: string, args = ['--version']): string | null {
  try { return execFileSync(command, args, { encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; }
  catch { return null; }
}
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function parseObject(text: string): Record<string, unknown> { return asObject(JSON.parse(text) as unknown); }
function packageVersion(root: string, file: string): string | null {
  if (!existsSync(path.resolve(root, file))) return null;
  const value = parseObject(readFileSync(path.resolve(root, file), 'utf8')).version;
  return typeof value === 'string' ? value : null;
}
export function buildProvenanceScopes(root: string) {
  const scopes = declaredInputScopes(root);
  const artifact = parseObject(readFileSync(path.resolve(root, EVIDENCE_INPUTS[0]), 'utf8'));
  const metadata = artifact.metadata ? asObject(artifact.metadata) : typeof artifact.rawMetadata === 'string' ? parseObject(artifact.rawMetadata) : {};
  const compiler = asObject(metadata.compiler);
  const referencedPaths = Object.keys(asObject(metadata.sources));
  const installedPaths = referencedPaths.filter(file => file.startsWith('node_modules/'));
  const packagePaths = ['node_modules/@openzeppelin/contracts/package.json'];
  return {
    scopes,
    inputRules: {
      generatedPathsExcluded: [...GENERATED_DIRECTORIES].sort(),
      nonSourceDirectoryNamesExcluded: [...NON_SOURCE_DIRECTORY_NAMES].sort(),
      studioRuntimeFiles: 'src/console-capture.ts and src/tracing.ts are application inputs whenever present; never excluded as cache.',
      studioDeploymentFiles: 'contracts/script and scripts deployment helpers are included whenever present, even when not invoked by this build.',
      workspaceComparison: 'NOT_RUN. Additional Studio files must be classified and approved or recorded as differences; this manifest does not establish whole-workspace equivalence.',
    },
    toolchain: {
      node: process.version, bun: version('bun'), forge: version('forge'),
      vite: packageVersion(root, 'node_modules/vite/package.json'),
      installedSolcJs: packageVersion(root, 'tools/g1-review/node_modules/solc/package.json'),
      limits: 'Locally observed versions, not binary attestations. Null means unavailable; contract compilation is not performed by Vite.',
    },
    contractArtifactReference: {
      path: EVIDENCE_INPUTS[0],
      purpose: 'Checked-in historical/reference artifact imported by tests. Not proof of a fresh compilation or deployment.',
      compilerFullVersion: typeof compiler.version === 'string' ? compiler.version : null,
      settings: metadata.settings ? asObject(metadata.settings) : null,
      metadataSourcePaths: referencedPaths.sort(),
      currentReferencedSourceBytes: hashFiles(root, existing(root, referencedPaths)),
      missingReferencedSources: referencedPaths.filter(file => !existsSync(path.resolve(root, file))),
      installedDependencies: hashFiles(root, existing(root, [...installedPaths, ...packagePaths])),
      missingInstalledDependencies: [...installedPaths, ...packagePaths].filter(file => !existsSync(path.resolve(root, file))),
      metadataComparison: 'NOT_RUN. Paths and settings are copied from reference metadata; fresh compiler-input/runtime comparison requires separately recorded compilation evidence.',
    },
  };
}
export function outputSnapshot(directory: string) {
  // Hash all real final output bytes, including nested assets named out/cache/dist.
  // Exclude only the root manifest to avoid self-reference.
  return hashFiles(directory, walkFiles(directory, '', false).filter(file => file !== 'build-provenance.json'));
}
