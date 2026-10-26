/**
 * manifest.ts
 * Trusted deployment manifest. Production contains the verified Arc mainnet deployment.
 * Old deployments are preserved; addresses are never overwritten.
 * A deploymentId is an immutable opaque string derived from chainId+contractAddress at
 * deploy time. Old deployments are preserved; addresses are never overwritten.
 *
 * SECURITY: URL params and localStorage may locate an invoiceId, never override
 * the contract address, chainId, or merchant for that deployment.
 */

import { ARC_MAINNET_SETTLEMENT_POLICY, type ArcSettlementPolicy } from './arcSettlement';
import { OFFLINE_FIXTURE_DEPLOYMENT } from './offlineFixture';

export interface DeploymentRecord {
  /** Trusted application settlement policy. Absent/unsupported policies fail closed. */
  readonly settlementPolicy?: ArcSettlementPolicy;
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
 * Production manifest: the verified Arc mainnet deployment only.
 * deploymentId = keccak256(abi.encode(uint256(5042), contractAddress)).
 * Runtime bytecode matches the reviewed artifact (same keccak as the historical
 * testnet deployment). This record is not a payment, public App, or audit.
 * Studio Deploy misclick testnet 0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018 is not an entry.
 */
export const MAINNET_DEPLOYMENT: DeploymentRecord = Object.freeze({
  settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY,
  deploymentId: '0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa',
  chainId: 5042,
  contractAddress: '0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE',
  runtimeCodeHash: '0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c',
  label: 'ArcProof mainnet U1',
  deployedAt: '2026-10-26T07:44:36Z',
});
export const PRODUCTION_MANIFEST: readonly DeploymentRecord[] = Object.freeze([MAINNET_DEPLOYMENT]);

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
  OFFLINE_FIXTURE_DEPLOYMENT,
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
