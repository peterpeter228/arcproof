/**
 * manifest.ts
 * Trusted deployment manifest. Production manifest is EMPTY until a real deployment occurs.
 * A deploymentId is an immutable opaque string derived from chainId+contractAddress at
 * deploy time. Old deployments are preserved; addresses are never overwritten.
 *
 * SECURITY: URL params and localStorage may locate an invoiceId, never override
 * the contract address, chainId, or merchant for that deployment.
 */

export interface DeploymentRecord {
  /** Opaque stable ID. Derived from keccak256(chainId || contractAddress) at deploy time. */
  readonly deploymentId: string;
  /** Chain ID as number */
  readonly chainId: number;
  /** Checksummed contract address */
  readonly contractAddress: `0x${string}`;
  /** keccak256 of the deployed runtime bytecode. Used by receipt verifier. */
  readonly runtimeCodeHash: `0x${string}`;
  /** Human-readable label, never trusted for security */
  readonly label: string;
  /** ISO-8601 deploy timestamp, or null if not yet deployed */
  readonly deployedAt: string | null;
}

/**
 * Production manifest: EMPTY. No trusted deployment exists yet.
 * DO NOT add entries here without an actual on-chain deployment with verified runtimeCodeHash.
 */
export const PRODUCTION_MANIFEST: readonly DeploymentRecord[] = [];

/**
 * Fixture manifest: used ONLY in tests and clearly-labelled demo mode.
 * These are synthetic records; they MUST NEVER appear in production or be
 * serialised as real proof.
 */
export const FIXTURE_MANIFEST: readonly DeploymentRecord[] = [
  {
    deploymentId: 'fixture-arc-testnet-001',
    chainId: 2482601649, // Arc Testnet chain ID from onchain-facts
    contractAddress: '0x0000000000000000000000000000000000000001',
    runtimeCodeHash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    label: 'ArcProof fixture (DEMO ONLY — not deployed)',
    deployedAt: null,
  },
];

/** Resolve a deployment by (chainId, deploymentId) from a given manifest. Returns null if not found. */
export function resolveDeployment(
  manifest: readonly DeploymentRecord[],
  chainId: number,
  deploymentId: string,
): DeploymentRecord | null {
  return (
    manifest.find(
      (d) => d.chainId === chainId && d.deploymentId === deploymentId,
    ) ?? null
  );
}

/** All deployments for a given chainId, newest-first by deployedAt. */
export function deploymentsForChain(
  manifest: readonly DeploymentRecord[],
  chainId: number,
): DeploymentRecord[] {
  return manifest
    .filter((d) => d.chainId === chainId)
    .sort((a, b) => {
      if (!a.deployedAt) return 1;
      if (!b.deployedAt) return -1;
      return b.deployedAt.localeCompare(a.deployedAt);
    });
}

/**
 * Derive a cache key that binds chainId + deploymentId + invoiceId.
 * URL/localStorage may use this key to persist pending tx hash, never to resolve addresses.
 */
export function invoiceCacheKey(
  chainId: number,
  deploymentId: string,
  invoiceId: `0x${string}`,
): string {
  return `arcproof:${chainId}:${deploymentId}:${invoiceId}`;
}
