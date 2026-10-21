/**
 * Reviewed application policy, not user/imported receipt configuration.
 * Native system Transfer: https://docs.arc.io/arc/references/usdc-system-events
 * Arc commits are final: https://docs.arc.io/arc/concepts/deterministic-finality
 * Requiring the RPC finalized tag is our conservative evidence policy, NOT an
 * extra Arc confirmation window or an independently validated BFT certificate.
 * No latest/safe/confirmation-count fallback is permitted when unsupported.
 */
export interface ArcSettlementPolicy {
  readonly id: 'arc-testnet-native-eip7708-finalized-v1' | 'arc-mainnet-native-eip7708-finalized-v1';
  readonly chainId: 5042002 | 5042;
  readonly emitter: `0x${string}`;
  readonly decimals: 18;
  readonly finality: 'rpc-finalized-header';
}

export const ARC_TESTNET_SETTLEMENT_POLICY: ArcSettlementPolicy = Object.freeze({
  id: 'arc-testnet-native-eip7708-finalized-v1',
  chainId: 5042002,
  emitter: '0xfffffffffffffffffffffffffffffffffffffffe',
  decimals: 18,
  finality: 'rpc-finalized-header',
});

/** Published network policy only, not a deployed contract or observed mainnet proof. */
export const ARC_MAINNET_SETTLEMENT_POLICY: ArcSettlementPolicy = Object.freeze({
  id: 'arc-mainnet-native-eip7708-finalized-v1',
  chainId: 5042,
  emitter: '0xfffffffffffffffffffffffffffffffffffffffe',
  decimals: 18,
  finality: 'rpc-finalized-header',
});

export function isSupportedSettlementPolicy(policy: ArcSettlementPolicy | undefined, chainId: number): boolean {
  const supported = chainId === 5042002 ? ARC_TESTNET_SETTLEMENT_POLICY : chainId === 5042 ? ARC_MAINNET_SETTLEMENT_POLICY : undefined;
  if (!supported) return false;
  return !!policy && chainId === supported.chainId && policy.chainId === supported.chainId &&
    policy.id === supported.id && typeof policy.emitter === 'string' && policy.emitter.toLowerCase() === supported.emitter &&
    policy.decimals === supported.decimals && policy.finality === supported.finality;
}

export const NATIVE_TRANSFER_ABI = [{
  type: 'event', name: 'Transfer', anonymous: false,
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
}] as const;
