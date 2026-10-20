/**
 * receiptVerifier.ts
 * Pure/injectable receipt verifier. Takes an RPC provider function (injected)
 * so it can be tested with controlled mocks without a real network.
 *
 * ARC-SPECIFIC LIMITATION: Arc native-USDC system Transfer events require the
 * official 18-decimal emitter address and real Arc Testnet evidence. This verifier
 * never returns VERIFIED — it returns UNVERIFIED_ARC_EVIDENCE once all other checks
 * pass. DO NOT invent the emitter address or claim Anvil validates Arc-specific logs.
 *
 * Selectors and topics are derived from the frozen ABI via viem; no hardcoded hex.
 */

import { encodeEventTopics, encodeFunctionData, keccak256 } from 'viem';
import { ARCPROOF_ABI } from './arcproofAbi';
import type { DeploymentRecord } from './manifest';

export interface RawReceipt {
  blockNumber: bigint;
  blockHash: `0x${string}`;
  transactionHash: `0x${string}`;
  transactionIndex: number;
  status: 'success' | 'reverted';
  from: `0x${string}`;
  to: `0x${string}` | null;
  logs: RawLog[];
}

export interface RawLog {
  address: `0x${string}`;
  topics: `0x${string}`[];
  data: `0x${string}`;
  logIndex: number;
  transactionHash: `0x${string}`;
}

export interface RawBlock {
  number: bigint;
  hash: `0x${string}`;
  timestamp: bigint;
}

export interface RawTransaction {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}` | null;
  input: `0x${string}`;
  value: bigint;
  chainId?: number;
}

export interface OnchainInvoiceState {
  merchant: `0x${string}`;
  amountNative: bigint;
  expiresAt: bigint;
  termsHash: `0x${string}`;
  paid: boolean;
  payer: `0x${string}`;
  paidAt: bigint;
  paidBlockNumber: bigint;
}

/** Injected RPC provider interface — keeps verifier pure/testable */
export interface RpcProvider {
  getTransactionReceipt(hash: `0x${string}`): Promise<RawReceipt | null>;
  getTransaction(hash: `0x${string}`): Promise<RawTransaction | null>;
  getBlock(blockNumber: bigint): Promise<RawBlock | null>;
  getContractCode(address: `0x${string}`): Promise<`0x${string}` | null>;
  getInvoice(contractAddress: `0x${string}`, invoiceId: `0x${string}`): Promise<OnchainInvoiceState | null>;
  getChainId(): Promise<number>;
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'PENDING'                  // RPC missing/uncommitted
  | 'FAILED'                   // Receipt status reverted
  | 'WRONG_CHAIN'
  | 'UNKNOWN_DEPLOYMENT'       // contract not in allowlist or no bytecode
  | 'WRONG_BYTECODE'           // runtime code hash mismatch
  | 'WRONG_TX_TARGET'          // tx.to != contract
  | 'WRONG_TX_FROM'            // tx.from != expected payer (if checked)
  | 'WRONG_TX_CHAINID'         // tx.chainId != expected
  | 'WRONG_SELECTOR'           // tx.input selector mismatch
  | 'WRONG_VALUE'              // tx value != invoice amount
  | 'NO_MATCHING_EVENT'        // 0 or >1 InvoicePaid for this invoiceId
  | 'WRONG_EVENT_DATA'         // event fields mismatch invoice
  | 'BLOCK_MISMATCH'           // receipt.blockNumber != invoice.paidBlockNumber
  | 'TIMESTAMP_MISMATCH'       // block.timestamp != invoice.paidAt
  | 'BLOCKHASH_MISMATCH'       // receipt block hash conflict
  | 'INVOICE_NOT_PAID'         // getInvoice().paid == false
  | 'UNVERIFIED_ARC_EVIDENCE'; // all chain checks passed, but Arc system Transfer not verified

export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  paymentLogIndex: number | null;
  blockHash: `0x${string}` | null;
  verifiedAt: number; // ms
  /**
   * true ONLY when status === 'VERIFIED'.
   * This verifier never returns VERIFIED — it returns UNVERIFIED_ARC_EVIDENCE once
   * all standard checks pass, because Arc native-USDC system Transfer validation
   * requires a verified emitter config that does not yet exist.
   * NEVER trust an imported verified flag from JSON/localStorage.
   */
  verified: boolean;
}

// ---------------------------------------------------------------------------
// Derive selector and topic from frozen ABI via viem — no hardcoded hex.
// ---------------------------------------------------------------------------

/** payInvoice(bytes32) selector — derived from ABI, not hardcoded. */
function getPayInvoiceSelector(): `0x${string}` {
  const data = encodeFunctionData({
    abi: ARCPROOF_ABI,
    functionName: 'payInvoice',
    args: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
  });
  // First 4 bytes (10 hex chars including 0x prefix)
  return data.slice(0, 10) as `0x${string}`;
}

/** InvoicePaid event topic0 — derived from ABI, not hardcoded. */
function getInvoicePaidTopic(): `0x${string}` {
  const topics = encodeEventTopics({
    abi: ARCPROOF_ABI,
    eventName: 'InvoicePaid',
  });
  return topics[0];
}

// Compute once at module load — pure, no side-effects
const PAY_INVOICE_SELECTOR: `0x${string}` = getPayInvoiceSelector();
const INVOICE_PAID_TOPIC: `0x${string}` = getInvoicePaidTopic();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise address to lowercase 0x-prefixed for comparison */
function addrEq(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/** Decode an indexed address from a topic (last 20 bytes) */
function topicToAddress(topic: `0x${string}`): `0x${string}` {
  return ('0x' + topic.slice(-40)) as `0x${string}`;
}

/** Decode a uint256 from a 32-byte data field */
function dataToUint256(data: `0x${string}`): bigint {
  return BigInt(data);
}

// ---------------------------------------------------------------------------
// Main verifier
// ---------------------------------------------------------------------------

export async function verifyReceipt(
  txHash: `0x${string}`,
  invoiceId: `0x${string}`,
  deployment: DeploymentRecord,
  expectedChainId: number,
  rpc: RpcProvider,
): Promise<VerificationResult> {
  const now = Date.now();

  function fail(status: VerificationStatus, message: string): VerificationResult {
    return { status, message, paymentLogIndex: null, blockHash: null, verifiedAt: now, verified: false };
  }

  if (deployment.chainId !== expectedChainId) return fail('WRONG_CHAIN', 'Deployment chain does not match expected chain');

  // 1. Chain ID — RPC must serve the expected chain
  const chainId = await rpc.getChainId().catch(() => null);
  if (chainId === null) return fail('PENDING', 'Could not determine chain ID from RPC');
  if (chainId !== expectedChainId)
    return fail('WRONG_CHAIN', `RPC chain ${chainId} != expected ${expectedChainId}`);

  // 2. Runtime code hash — required, not optional
  //    Fetches the bytecode at deployment.contractAddress and checks its keccak256
  //    against the manifest's runtimeCodeHash. An empty or absent runtimeCodeHash
  //    in the manifest causes WRONG_BYTECODE (safe default: fail closed).
  const code = await rpc.getContractCode(deployment.contractAddress).catch(() => null);
  if (!code || code === '0x')
    return fail('UNKNOWN_DEPLOYMENT', 'No bytecode at deployment address');
  const codeHash = keccak256(code);
  if (!deployment.runtimeCodeHash || deployment.runtimeCodeHash === '0x') {
    return fail('WRONG_BYTECODE', 'Deployment manifest has no runtimeCodeHash — cannot verify bytecode');
  }
  if (codeHash.toLowerCase() !== deployment.runtimeCodeHash.toLowerCase()) {
    return fail('WRONG_BYTECODE',
      `Runtime code hash ${codeHash} != manifest ${deployment.runtimeCodeHash}`);
  }

  // 3. Fetch receipt — must be committed and successful
  const receipt = await rpc.getTransactionReceipt(txHash).catch(() => null);
  if (!receipt) return fail('PENDING', 'Transaction receipt not found or not yet committed');
  if (receipt.status !== 'success') return fail('FAILED', 'Transaction reverted on chain');

  // 4. Bind: receipt.transactionHash must match input txHash
  if (receipt.transactionHash.toLowerCase() !== txHash.toLowerCase())
    return fail('WRONG_TX_TARGET', `receipt.transactionHash mismatch`);

  // 5. tx.to — must be the contract
  if (!addrEq(receipt.to, deployment.contractAddress))
    return fail('WRONG_TX_TARGET', `tx.to ${receipt.to} != contract ${deployment.contractAddress}`);

  // 6. Fetch transaction — bind from/to/chainId/input/value
  const tx = await rpc.getTransaction(txHash).catch(() => null);
  if (!tx) return fail('PENDING', 'Transaction data not found');

  // tx.hash must match
  if (tx.hash.toLowerCase() !== txHash.toLowerCase())
    return fail('WRONG_TX_TARGET', 'tx.hash mismatch');

  // tx.to must be the contract (belt-and-suspenders beyond receipt.to)
  if (!addrEq(tx.to, deployment.contractAddress))
    return fail('WRONG_TX_TARGET', `tx.to ${tx.to} != contract ${deployment.contractAddress}`);

  // tx.chainId must match if present (some RPCs omit on legacy txs)
  if (tx.chainId !== undefined && tx.chainId !== expectedChainId)
    return fail('WRONG_TX_CHAINID', `tx.chainId ${tx.chainId} != expected ${expectedChainId}`);

  // tx.input: first 4 bytes must be payInvoice selector (derived from ABI)
  if (!tx.input.toLowerCase().startsWith(PAY_INVOICE_SELECTOR.toLowerCase()))
    return fail('WRONG_SELECTOR',
      `tx.input selector ${tx.input.slice(0, 10)} != ${PAY_INVOICE_SELECTOR}`);

  // tx.input: first argument (bytes32 invoiceId) must match
  const txInvoiceId = ('0x' + tx.input.slice(10, 74)) as `0x${string}`;
  if (txInvoiceId.toLowerCase() !== invoiceId.toLowerCase())
    return fail('WRONG_SELECTOR', `tx invoiceId arg ${txInvoiceId} != expected ${invoiceId}`);

  // 7. Find exactly one InvoicePaid event from this contract for this invoiceId
  //    InvoicePaid(bytes32 indexed invoiceId, address indexed payer,
  //                address indexed merchant, uint256 amountNative)
  //    topics[0] = event topic (derived from ABI)
  //    topics[1] = invoiceId (indexed bytes32)
  //    topics[2] = payer    (indexed address, padded to 32 bytes)
  //    topics[3] = merchant (indexed address, padded to 32 bytes)
  //    data      = abi.encode(amountNative)
  const matchingLogs = receipt.logs.filter(
    (log) =>
      addrEq(log.address, deployment.contractAddress) &&
      log.topics[0]?.toLowerCase() === INVOICE_PAID_TOPIC.toLowerCase() &&
      log.topics[1]?.toLowerCase() === invoiceId.toLowerCase(),
  );

  if (matchingLogs.length === 0)
    return fail('NO_MATCHING_EVENT', 'No InvoicePaid event found for this invoiceId');
  if (matchingLogs.length > 1)
    return fail('NO_MATCHING_EVENT', 'Multiple InvoicePaid events for this invoiceId');

  const eventLog = matchingLogs[0];
  const paymentLogIndex = eventLog.logIndex;
  if (!Number.isSafeInteger(paymentLogIndex) || paymentLogIndex < 0)
    return fail('WRONG_EVENT_DATA', 'Invalid event log index');
  if (eventLog.topics.length !== 4 ||
      !eventLog.topics.every((topic) => /^0x[0-9a-fA-F]{64}$/.test(topic)) ||
      !/^0x0{24}[0-9a-fA-F]{40}$/.test(eventLog.topics[2]) ||
      !/^0x0{24}[0-9a-fA-F]{40}$/.test(eventLog.topics[3]) ||
      !/^0x[0-9a-fA-F]{64}$/.test(eventLog.data))
    return fail('WRONG_EVENT_DATA', 'Malformed InvoicePaid ABI encoding');

  // 7a. Bind receipt.blockHash to the log's parent tx
  if (eventLog.transactionHash.toLowerCase() !== txHash.toLowerCase())
    return fail('NO_MATCHING_EVENT', 'InvoicePaid log transactionHash mismatch');

  // 8. Current invoice state from chain — must be paid
  const onchain = await rpc.getInvoice(deployment.contractAddress, invoiceId).catch(() => null);
  if (!onchain) return fail('PENDING', 'Could not read current invoice state from chain');
  if (!onchain.paid) return fail('INVOICE_NOT_PAID', 'Invoice reports unpaid on chain');

  if (!addrEq(tx.from, onchain.payer) || !addrEq(receipt.from, onchain.payer))
    return fail('WRONG_TX_FROM', 'Transaction and receipt sender must equal the recorded payer');

  // 9. Decode and verify all event fields against on-chain state
  //    topic[2] = payer (indexed address)
  //    topic[3] = merchant (indexed address)
  //    data     = abi.encode(amountNative) — 32-byte big-endian uint256
  if (!eventLog.topics[2] || !eventLog.topics[3])
    return fail('WRONG_EVENT_DATA', 'InvoicePaid event missing indexed payer/merchant topics');

  const eventPayer    = topicToAddress(eventLog.topics[2]);
  const eventMerchant = topicToAddress(eventLog.topics[3]);
  const eventAmount   = dataToUint256(eventLog.data);

  if (!addrEq(eventPayer, onchain.payer))
    return fail('WRONG_EVENT_DATA',
      `event payer ${eventPayer} != onchain payer ${onchain.payer}`);
  if (!addrEq(eventMerchant, onchain.merchant))
    return fail('WRONG_EVENT_DATA',
      `event merchant ${eventMerchant} != onchain merchant ${onchain.merchant}`);
  if (eventAmount !== onchain.amountNative)
    return fail('WRONG_EVENT_DATA',
      `event amountNative ${eventAmount} != onchain amount ${onchain.amountNative}`);

  // 10. tx.value must equal invoice amount
  if (tx.value !== onchain.amountNative)
    return fail('WRONG_VALUE', `tx.value ${tx.value} != invoice amount ${onchain.amountNative}`);

  // 11. Block: number, timestamp, and blockhash consistency
  const block = await rpc.getBlock(receipt.blockNumber).catch(() => null);
  if (!block) return fail('PENDING', 'Block not found or not yet committed');

  if (block.number !== receipt.blockNumber) return fail('BLOCK_MISMATCH', 'Fetched block number differs from receipt');
  if (receipt.blockNumber !== onchain.paidBlockNumber)
    return fail('BLOCK_MISMATCH',
      `receipt.blockNumber ${receipt.blockNumber} != stored paidBlockNumber ${onchain.paidBlockNumber}`);
  if (block.timestamp !== onchain.paidAt)
    return fail('TIMESTAMP_MISMATCH',
      `block.timestamp ${block.timestamp} != stored paidAt ${onchain.paidAt}`);
  if (receipt.blockHash.toLowerCase() !== block.hash.toLowerCase())
    return fail('BLOCKHASH_MISMATCH',
      `receipt.blockHash ${receipt.blockHash} != block.hash ${block.hash}`);

  // 12. Arc system Transfer event — NOT verifiable without official Arc emitter config.
  //     All standard checks above have passed. We return UNVERIFIED_ARC_EVIDENCE
  //     (verified: false) rather than VERIFIED (verified: true), because the Arc
  //     native-USDC 18-decimal system Transfer at the official emitter has not been
  //     validated. This is not a check that can be satisfied in this environment.
  //     A future version may add this when the verified emitter address is available.
  return {
    status: 'UNVERIFIED_ARC_EVIDENCE',
    message:
      'All standard on-chain checks passed (chain, bytecode, receipt, tx binding, event fields, ' +
      'block consistency). However, Arc native-USDC system Transfer event validation requires ' +
      'a verified Arc emitter config that is not yet available. ' +
      'verified=false; do not treat this as proof of final settlement.',
    paymentLogIndex,
    blockHash: receipt.blockHash,
    verifiedAt: now,
    verified: false,
  };
}
