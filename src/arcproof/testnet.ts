import { defineChain } from 'viem';
import type { DeploymentRecord } from './manifest';

/** This build never accepts another network, even if a wallet or URL requests it. */
export const ARC_TESTNET = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'Test USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.io'] } },
  blockExplorers: { default: { name: 'Arc Testnet Explorer', url: 'https://explorer.testnet.arc.io' } },
  testnet: true,
});

/**
 * Deployment receipt and all 2,296 runtime bytes independently checked against the
 * reviewed artifact on 2026-10-20. This is NOT payment, source-publication, or audit evidence.
 * ID = keccak256(abi.encode(uint256(5042002), address(contract))).
 */
export const TESTNET_DEPLOYMENT: DeploymentRecord = Object.freeze({
  deploymentId: '0xdba9a4da8a5b2a834b451f595653dd3cb4c3e51addb2d8df8e0b18312f382d2d',
  chainId: ARC_TESTNET.id,
  contractAddress: '0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30',
  runtimeCodeHash: '0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c',
  label: 'ArcProof testnet prototype',
  deployedAt: '2026-10-20T09:48:47Z',
});
export const TESTNET_MANIFEST = Object.freeze([TESTNET_DEPLOYMENT]);
export const DEPLOYMENT_TX = '0x2e43459e213e993b2290749e5549f993d63db1af6e1d8feab2fcca94917db535' as const;
export const DEPLOYMENT_BLOCK = 68161841n;
export const ZERO_TERMS: `0x${string}` = `0x${'0'.repeat(64)}`;
export const isBytes32 = (value: string): value is `0x${string}` => /^0x[0-9a-fA-F]{64}$/.test(value);
export const explorerTx = (hash: `0x${string}`) => `${ARC_TESTNET.blockExplorers.default.url}/tx/${hash}`;

export function assertTestnetDeployment(deployment: DeploymentRecord): void {
  const trusted = TESTNET_MANIFEST.find((item) =>
    item.deploymentId === deployment.deploymentId && item.chainId === deployment.chainId);
  if (!trusted || trusted.chainId !== ARC_TESTNET.id ||
      trusted.contractAddress.toLowerCase() !== deployment.contractAddress.toLowerCase() ||
      trusted.runtimeCodeHash.toLowerCase() !== deployment.runtimeCodeHash.toLowerCase()) {
    throw new Error('Untrusted deployment. This app supports only the checked Arc Testnet deployment.');
  }
}
