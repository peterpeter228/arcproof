/** One domain for offline ID generation and exports. Never a deployed contract. */
export const OFFLINE_FIXTURE = Object.freeze({
  chainId: 5042002,
  deploymentId: 'offline-fixture',
  contract: '0x0000000000000000000000000000000000000001' as const,
  merchant: '0x0000000000000000000000000000000000000002' as const,
});
