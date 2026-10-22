/** One domain for offline ID generation and exports. Never a deployed contract. */
export const OFFLINE_FIXTURE = Object.freeze({
  chainId: 5042002,
  deploymentId: 'offline-fixture',
  contract: '0x0000000000000000000000000000000000000001' as const,
  merchant: '0x0000000000000000000000000000000000000002' as const,
});

/** Registered synthetic identity shared by ID generation and the public export builder. */
export const OFFLINE_FIXTURE_DEPLOYMENT = Object.freeze({
  chainId: OFFLINE_FIXTURE.chainId,
  deploymentId: OFFLINE_FIXTURE.deploymentId,
  contractAddress: OFFLINE_FIXTURE.contract,
  runtimeCodeHash: '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
  label: 'ArcProof offline fixture (DEMO ONLY — not deployed)',
  deployedAt: null,
});
