/**
 * RECONSTRUCTED TEST FIXTURE, NOT A RAW RPC RECEIPT OR LIVE FINALITY EVIDENCE.
 * Transaction, log content/indices and block identity come from the archived
 * explorer observation. Per-log provenance, current invoice state, and finalized
 * RPC responses below are synthesized for unit tests. Never export as real proof.
 */
import { encodeEventTopics, toHex, type Hex } from 'viem';
import observation from '../../../../evidence/g3-native-verifier/observed-browser-evidence.json';
import artifact from '../../../../evidence/g1/ArcProofInvoices.artifact.json';
import { ARCPROOF_ABI } from '../../arcproofAbi';
import { NATIVE_TRANSFER_ABI } from '../../arcSettlement';
import { TESTNET_DEPLOYMENT, ZERO_TERMS } from '../../testnet';
import type { OnchainInvoiceState, RawBlock, RawLog, RawReceipt, RawTransaction, RpcProvider } from '../../receiptVerifier';

export function observedPaymentFixture() {
  const txHash = observation.transaction.hash as Hex;
  const invoiceId = observation.transaction.invoice_id as Hex;
  const payer = observation.transaction.from as Hex;
  const contract = TESTNET_DEPLOYMENT.contractAddress;
  const amount = BigInt(observation.transaction.value_native18);
  const block: RawBlock = {
    number: BigInt(observation.transaction.block_number),
    hash: observation.transaction.block_hash_explorer as Hex,
    timestamp: BigInt(Date.parse(observation.transaction.timestamp_utc) / 1000),
  };
  const provenance = { blockNumber: block.number, blockHash: block.hash, transactionHash: txHash, transactionIndex: 1, removed: false };
  const transfer = (from: Hex, to: Hex, logIndex: number): RawLog => ({
    ...provenance, address: observation.events_displayed[0].emitter as Hex,
    topics: encodeEventTopics({ abi: NATIVE_TRANSFER_ABI, eventName: 'Transfer', args: { from, to } }) as Hex[],
    data: toHex(amount, { size: 32 }), logIndex,
  });
  const invoiceLog: RawLog = {
    ...provenance, address: contract, logIndex: observation.events_displayed[2].log_index,
    topics: encodeEventTopics({ abi: ARCPROOF_ABI, eventName: 'InvoicePaid', args: { invoiceId, payer, merchant: payer } }) as Hex[],
    data: toHex(amount, { size: 32 }),
  };
  const receipt: RawReceipt = { ...provenance, status: 'success', from: payer, to: contract,
    logs: [transfer(payer, contract, 6), transfer(contract, payer, 7), invoiceLog] };
  const tx: RawTransaction = { blockHash: block.hash, blockNumber: block.number, transactionIndex: 1, hash: txHash, chainId: observation.chain_id, from: payer, to: contract,
    input: observation.transaction.input as Hex, value: amount };
  const invoice: OnchainInvoiceState = { merchant: payer, amountNative: amount, expiresAt: block.timestamp + 3600n,
    termsHash: ZERO_TERMS, paid: true, payer, paidAt: block.timestamp, paidBlockNumber: block.number };
  const rpc: RpcProvider = {
    getChainId: () => Promise.resolve(observation.chain_id),
    getContractCode: () => Promise.resolve(artifact.deployedBytecode.object as Hex),
    getTransactionReceipt: () => Promise.resolve(receipt),
    getTransaction: () => Promise.resolve(tx), getInvoice: () => Promise.resolve(invoice),
    getBlock: () => Promise.resolve(block), getFinalizedBlock: () => Promise.resolve(block),
  };
  return { txHash, invoiceId, payer, contract, amount, block, receipt, tx, invoice, rpc,
    deployment: structuredClone(TESTNET_DEPLOYMENT), classification: 'reconstructed_fixture_not_raw_rpc' as const };
}
