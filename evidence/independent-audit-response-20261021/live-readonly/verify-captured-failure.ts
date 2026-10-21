import { readFileSync, writeFileSync } from 'node:fs';
import { verifyReceipt } from '../../arcproof-current/src/arcproof/receiptVerifier';
import { TESTNET_DEPLOYMENT } from '../../arcproof-current/src/arcproof/testnet';
import type { RpcProvider } from '../../arcproof-current/src/arcproof/receiptVerifier';
const captured = JSON.parse(readFileSync(new URL('./chain-id.json', import.meta.url), 'utf8'));
const unavailable = async (): Promise<never> => { throw new Error(captured.error); };
const rpc: RpcProvider = {
  sourceLabel: 'Offline replay of captured HTTP403 from https://rpc.testnet.arc.io, not a fresh successful RPC read',
  getChainId: unavailable, getContractCode: unavailable, getInvoice: unavailable,
  getTransaction: unavailable, getBlock: unavailable, getFinalizedBlock: unavailable,
  getTransactionReceipt: unavailable,
};
const result = await verifyReceipt('0x0987c87540b6701be5fe047c55a7ac1b9277fda7dd989f31c8ea3ccd25350ace',
  '0x7d20865f026a9e1e2477c203c1d7e9170b0c095b903b9ff27c15c624ec1c985e',
  TESTNET_DEPLOYMENT, 5042002, rpc);
const evidence = { kind: 'actual_verifier_offline_captured_transport_failure_replay', classification: 'controlled_demo', liveVerificationStatus: 'blocked', result };
writeFileSync(new URL('./verifier-failure-replay.json', import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence,null,2));
if (result.verified || result.status !== 'PENDING') process.exitCode = 1;
