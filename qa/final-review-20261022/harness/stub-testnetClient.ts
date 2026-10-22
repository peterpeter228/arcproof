// HARNESS ONLY (not part of ArcProof): replaces verifyTestnetReceipt with canned fixtures so the real
// receipt UI can be screenshotted offline. Everything else is re-exported from the real module.
export * from '@real-client';
import { TESTNET_DEPLOYMENT } from '@real-testnet';

const HASH = '0x9f2c41d7a8e03b65c1d4f7a92be8036d5a1c7e49b02f8d63a5c1e7094b3d2a68';
const BLOCKHASH = '0x4be1a7d93c05f268e1b4a9d7c3052f68b1e47a90d3c5f8216be4a7d09c3f1e52';
const PAYER = '0xA11ce00000000000000000000000000000c0ffee';
const MERCHANT = '0x5E1ler0000000000000000000000000000bEEf01'.replace('0x5E1ler', '0x5E11e7');
const ids = ['chain', 'runtime_code', 'receipt_identity', 'transaction_identity', 'payment_event', 'invoice_state', 'event_and_value', 'payment_block', 'native_settlement', 'finality'];

export async function verifyTestnetReceipt(_client: unknown, invoiceId: `0x${string}`, txHash?: `0x${string}`) {
  const state = new URLSearchParams(location.search).get('state') ?? 'verified';
  const hash = (txHash ?? HASH) as `0x${string}`;
  const payer = state === 'selfdemo' ? MERCHANT : PAYER;
  const dep = TESTNET_DEPLOYMENT;
  const invoice = { invoiceId, merchant: MERCHANT, amountNative: 200000000000000000n, expiresAt: 1792600000n, termsHash: `0x${'0'.repeat(64)}`, paid: true, payer, paidAt: 1792500000n, paidBlockNumber: 68170012n };
  const failedId = state === 'mismatch' ? 'event_and_value' : state === 'incomplete' ? 'native_settlement' : null;
  const checks = ids.map((id) => id === failedId
    ? { id, status: state === 'mismatch' ? 'failed' : 'unavailable', reasonCode: state === 'mismatch' ? 'WRONG_VALUE' : 'UNVERIFIED_ARC_EVIDENCE', message: state === 'mismatch' ? 'Transaction value does not equal the invoice amount.' : 'No supported native settlement evidence was found.' }
    : (state === 'incomplete' && id === 'finality') ? { id, status: 'not_run', reasonCode: null, message: null } : { id, status: 'passed', reasonCode: null, message: null });
  const ok = state === 'verified' || state === 'selfdemo';
  const status = ok ? 'VERIFIED' : state === 'incomplete' ? 'UNVERIFIED_ARC_EVIDENCE' : 'WRONG_VALUE';
  const result = {
    status, verified: ok, message: ok ? 'All chain checks passed.' : state === 'incomplete' ? 'Standard checks passed but native settlement evidence is incomplete.' : 'Transaction value does not equal the invoice amount.',
    reasonCode: status, paymentLogIndex: 2, blockHash: BLOCKHASH, verifiedAt: 1792500100000, blockNumber: '68170012', gasFeeNative: '1234500000000000',
    checks, readStartedAt: 1792500090000, readCompletedAt: 1792500100000, source: { kind: 'rpc', label: 'Arc Testnet public RPC (harness fixture)' },
    observationScope: { chainId: dep.chainId, deploymentId: dep.deploymentId, contract: dep.contractAddress, invoiceId, transactionHash: hash },
    observedReceipt: { transactionHash: hash, from: payer, to: dep.contractAddress, status: 'success', transactionIndex: 1, blockNumber: '68170012', blockHash: BLOCKHASH, blockTimestamp: '1792500000', paymentLogIndex: 2, gasUsed: '61730', effectiveGasPrice: '20000000000', gasFeeNative: '1234500000000000' },
    observedInvoice: { amountNative: state === 'mismatch' ? '200000000000000000' : '200000000000000000', payer, merchant: MERCHANT, paidAt: '1792500000', paidBlockNumber: '68170012' },
    ...(ok ? { settlementEvidence: { policyId: 'arc-testnet-native-usdc-v1', nativeEmitter: '0xfffffffffffffffffffffffffffffffffffffffe', decimals: 18, payerToContractLogIndex: 0, contractToMerchantLogIndex: 1, finalizedBlockNumber: '68170020', finalizedBlockHash: '0x1d2c3b4a59687766554433221100ffeeddccbbaa99887766554433221100abcd', controlled_demo: state === 'selfdemo' } } : {}),
  };
  return { invoice, hash, result };
}
