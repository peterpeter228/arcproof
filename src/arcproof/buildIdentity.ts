/** Build labels are provenance, never a settlement or deployment attestation. */
export interface BuildIdentity {
  networkKey: 'testnet' | 'mainnet' | null;
  sourceCommit: string | null;
  verifiedBaseCommit: string | null;
  sourceSnapshotSha256: string | null;
  builtAtUTC: string | null;
  sourceState: 'candidate' | 'unknown';
}
declare const __ARCPROOF_BUILD_IDENTITY__: unknown;
export function normalizeBuildIdentity(value: unknown): BuildIdentity {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hex = (value: unknown, length: number) => typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value) ? value : null;
  return {
    // A materialized or modified source tree cannot prove a commit identity.
    networkKey: raw.networkKey === 'testnet' || raw.networkKey === 'mainnet' ? raw.networkKey : null,
    sourceCommit: null,
    verifiedBaseCommit: hex(raw.verifiedBaseCommit, 40),
    sourceSnapshotSha256: hex(raw.sourceSnapshotSha256, 64),
    builtAtUTC: typeof raw.builtAtUTC === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.builtAtUTC) && Number.isFinite(Date.parse(raw.builtAtUTC)) ? raw.builtAtUTC : null,
    sourceState: hex(raw.sourceSnapshotSha256, 64) ? 'candidate' : 'unknown',
  };
}
export const BUILD_IDENTITY = normalizeBuildIdentity(typeof __ARCPROOF_BUILD_IDENTITY__ === 'undefined' ? null : __ARCPROOF_BUILD_IDENTITY__);
export const identityLabel = (value: string | null) => value ?? 'Unknown';
