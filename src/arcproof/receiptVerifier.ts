import { receiptStatus } from './receiptStatus';
/**
 * receiptVerifier.ts
 * Pure/injectable receipt verifier. Takes an RPC provider function (injected)
 * so it can be tested with controlled mocks without a real network.
 *
 * VERIFIED requires the deployment's supported native settlement policy, two
 * exact native-system Transfer legs and explicit finalized-header evidence.
 * Injected mock/reconstructed fixtures test logic, never prove live settlement.
 *
 * Selectors and topics are derived from the frozen ABI via viem; no hardcoded hex.
 */

import { encodeEventTopics, encodeFunctionData, keccak256 } from 'viem';
import { ARCPROOF_ABI } from './arcproofAbi';
import type { DeploymentRecord } from './manifest';
import { isSupportedSettlementPolicy, NATIVE_TRANSFER_ABI } from './arcSettlement';

export interface RawReceipt {
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
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
  /** Optional in the transport type to diagnose incomplete sources; required to verify. */
  blockHash?: `0x${string}`;
  blockNumber?: bigint;
  removed?: boolean;
  transactionIndex?: number;
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
  /** Preserve original inclusion metadata; pending/missing values cannot verify. */
  blockHash?: `0x${string}` | null;
  blockNumber?: bigint | null;
  transactionIndex?: number | null;
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
  /** Non-secret source label, never an authenticated URL or credential. */
  sourceLabel?: string;
  getTransactionReceipt(hash: `0x${string}`): Promise<RawReceipt | null>;
  getTransaction(hash: `0x${string}`): Promise<RawTransaction | null>;
  getBlock(blockNumber: bigint): Promise<RawBlock | null>;
  /** Never substitute latest/safe or synthesize from elapsed confirmations. */
  getFinalizedBlock?(): Promise<RawBlock | null>;
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
  | 'UNVERIFIED_ARC_EVIDENCE'  // unsupported/missing trusted settlement policy
  | 'TRANSACTION_INCLUSION_MISMATCH' // transaction inclusion must match receipt
  | 'INVALID_LOG_PROVENANCE'   // removed, missing, conflicting or duplicate log identity
  | 'INVALID_NATIVE_TRANSFER'  // missing/ambiguous/malformed/incorrect native legs
  | 'UNVERIFIED_FINALITY';     // absent/unsupported/stale/conflicting finality evidence

export interface VerificationCheck {
  id: string;
  status: 'passed' | 'failed' | 'unavailable' | 'not_run';
  reasonCode: VerificationStatus | null;
  message: string | null;
}

/** Identity-bound RPC observations, NOT a settlement/finality endorsement. */
export interface ObservedReceipt {
  transactionHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  status: 'success';
  transactionIndex: number;
  blockNumber: string;
  blockHash: `0x${string}`;
  blockTimestamp: string;
  paymentLogIndex: number;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  gasFeeNative: string | null;
}

export interface ObservedInvoice {
  amountNative: string;
  payer: `0x${string}`;
  merchant: `0x${string}`;
  paidAt: string;
  paidBlockNumber: string;
}

export interface VerificationDiagnostics {
  reasonCode: VerificationStatus;
  checks: VerificationCheck[];
  readStartedAt: number;
  readCompletedAt: number;
  source: { kind: 'rpc'; label: string };
  observationScope: { chainId: number; deploymentId: string; contract: `0x${string}`; invoiceId: `0x${string}`; transactionHash: `0x${string}` };
  observedReceipt: ObservedReceipt | null;
  observedInvoice: ObservedInvoice | null;
}

export interface VerificationResult extends Partial<VerificationDiagnostics> {
  status: VerificationStatus;
  message: string;
  paymentLogIndex: number | null;
  blockHash: `0x${string}` | null;
  verifiedAt: number; // ms
  blockNumber?: string;
  gasFeeNative?: string | null;
  /**
   * true ONLY when status === 'VERIFIED'.
   * NEVER trust an imported verified flag from JSON/localStorage.
   */
  verified: boolean;
  settlementEvidence?: {
    policyId: string;
    nativeEmitter: `0x${string}`;
    decimals: 18;
    payerToContractLogIndex: number;
    contractToMerchantLogIndex: number;
    finalizedBlockNumber: string;
    finalizedBlockHash: `0x${string}`;
    controlled_demo: boolean;
  };
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
const NATIVE_TRANSFER_TOPIC = encodeEventTopics({ abi: NATIVE_TRANSFER_ABI, eventName: 'Transfer' })[0];

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

  const checkIds = ['chain', 'runtime_code', 'receipt_identity', 'transaction_identity',
    'payment_event', 'invoice_state', 'event_and_value', 'payment_block',
    'settlement_policy', 'provenance', 'native_transfers', 'finality'] as const;
  let stage = 0;
  let observedReceipt: ObservedReceipt | null = null;
  let observedInvoice: ObservedInvoice | null = null;
  function enter(id: typeof checkIds[number]) { stage = checkIds.indexOf(id); }
  function diagnostics(status: VerificationStatus, message: string): VerificationDiagnostics {
    return {
      reasonCode: status,
      checks: checkIds.map((id, index) => ({ id,
        status: status === 'VERIFIED' || index < stage ? 'passed' : index > stage ? 'not_run' :
          status === 'PENDING' || status === 'UNVERIFIED_FINALITY' || status === 'UNVERIFIED_ARC_EVIDENCE' ? 'unavailable' : 'failed',
        reasonCode: index === stage && status !== 'VERIFIED' ? status : null,
        message: index === stage && status !== 'VERIFIED' ? message : null,
      })),
      readStartedAt: now, readCompletedAt: Date.now(),
      source: { kind: 'rpc', label: rpc.sourceLabel ?? 'Injected RPC provider (endpoint unspecified)' },
      observationScope: { chainId: expectedChainId, deploymentId: deployment.deploymentId,
        contract: deployment.contractAddress, invoiceId, transactionHash: txHash },
      observedReceipt, observedInvoice,
    };
  }
  function fail(status: VerificationStatus, message: string): VerificationResult {
    return { status, message, paymentLogIndex: null, blockHash: null, verifiedAt: now, verified: false,
      ...diagnostics(status, message) };
  }

  if (deployment.chainId !== expectedChainId) return fail('WRONG_CHAIN', 'Deployment chain does not match expected chain');

  // 1. Chain ID — RPC must serve the expected chain
  const chainId = await rpc.getChainId().catch(() => null);
  if (chainId === null) return fail('PENDING', 'Could not determine chain ID from RPC');
  if (chainId !== expectedChainId)
    return fail('WRONG_CHAIN', `RPC chain ${chainId} != expected ${expectedChainId}`);

  enter('runtime_code');
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

  enter('receipt_identity');
  // 3. Fetch receipt — must be committed and successful
  const receipt = await rpc.getTransactionReceipt(txHash).catch(() => null);
  if (!receipt) return fail('PENDING', 'Transaction receipt not found or not yet committed');

  // 4. Bind: receipt.transactionHash must match input txHash
  if (receipt.transactionHash.toLowerCase() !== txHash.toLowerCase())
    return fail('WRONG_TX_TARGET', `receipt.transactionHash mismatch`);

  // 5. tx.to — must be the contract
  if (!addrEq(receipt.to, deployment.contractAddress))
    return fail('WRONG_TX_TARGET', `tx.to ${receipt.to} != contract ${deployment.contractAddress}`);

  if (receiptStatus(receipt.status) === 'unknown') return fail('PENDING', 'Receipt status is missing or unsupported; outcome remains unknown');

  enter('transaction_identity');
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
  if (!/^0x[0-9a-fA-F]{72}$/.test(tx.input) || !tx.input.toLowerCase().startsWith(PAY_INVOICE_SELECTOR.toLowerCase()))
    return fail('WRONG_SELECTOR',
      `tx.input selector ${tx.input.slice(0, 10)} != ${PAY_INVOICE_SELECTOR}`);

  // tx.input: first argument (bytes32 invoiceId) must match
  const txInvoiceId = ('0x' + tx.input.slice(10, 74)) as `0x${string}`;
  if (txInvoiceId.toLowerCase() !== invoiceId.toLowerCase())
    return fail('WRONG_SELECTOR', `tx invoiceId arg ${txInvoiceId} != expected ${invoiceId}`);

  if (!addrEq(receipt.from, tx.from)) return fail('WRONG_TX_TARGET', 'Receipt sender does not match transaction');
  if (receiptStatus(receipt.status) === 'reverted') return fail('FAILED', 'Transaction reverted on chain');

  enter('payment_event');
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

  enter('invoice_state');
  // 8. Current invoice state from chain — must be paid
  const onchain = await rpc.getInvoice(deployment.contractAddress, invoiceId).catch(() => null);
  if (!onchain) return fail('PENDING', 'Could not read current invoice state from chain');
  if (!onchain.paid) return fail('INVOICE_NOT_PAID', 'Invoice reports unpaid on chain');

  if (!addrEq(tx.from, onchain.payer) || !addrEq(receipt.from, onchain.payer))
    return fail('WRONG_TX_FROM', 'Transaction and receipt sender must equal the recorded payer');

  enter('event_and_value');
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

  enter('payment_block');
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

  enter('settlement_policy');
  // 12. A supported policy must be part of the trusted deployment, never a URL
  // or imported receipt flag. Legacy/unknown networks remain unverified.
  const policy = deployment.settlementPolicy;
  if (!policy || !isSupportedSettlementPolicy(policy, expectedChainId)) return {
    ...fail('UNVERIFIED_ARC_EVIDENCE', 'No supported trusted Arc native settlement policy for this deployment.'),
    paymentLogIndex, blockHash: receipt.blockHash,
  };

  enter('provenance');
  const isHash = (value: unknown): value is `0x${string}` =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) && !/^0x0{64}$/.test(value);
  const validBlock = (value: RawBlock): boolean =>
    typeof value.number === 'bigint' && value.number >= 0n && isHash(value.hash) &&
    typeof value.timestamp === 'bigint' && value.timestamp > 0n;
  if (!validBlock(block) || !isHash(receipt.transactionHash) ||
      !Number.isSafeInteger(receipt.transactionIndex) || receipt.transactionIndex < 0)
    return fail('INVALID_LOG_PROVENANCE', 'Malformed committed receipt/block identity.');

  if (!isHash(tx.blockHash) || !addrEq(tx.blockHash, receipt.blockHash) ||
      tx.blockNumber !== receipt.blockNumber || tx.transactionIndex !== receipt.transactionIndex)
    return fail('TRANSACTION_INCLUSION_MISMATCH', 'Transaction inclusion metadata is absent, pending or conflicts with the receipt.');

  const zeroAddress = '0x0000000000000000000000000000000000000000';
  if (!/^0x[0-9a-fA-F]{40}$/.test(onchain.payer) || !/^0x[0-9a-fA-F]{40}$/.test(onchain.merchant) ||
      addrEq(onchain.payer, zeroAddress) || addrEq(onchain.merchant, zeroAddress) ||
      addrEq(onchain.payer, deployment.contractAddress) || addrEq(onchain.merchant, deployment.contractAddress) ||
      onchain.paidAt >= onchain.expiresAt)
    return fail('WRONG_EVENT_DATA', 'Paid invoice has an impossible sender, recipient or expiry relationship.');

  // Bind EVERY raw log to this receipt, including ignored emitters. Do not erase
  // removed/blockHash/blockNumber/txHash at the adapter boundary. Unique indices
  // prevent one log from being reused for two evidence legs or invoice payment.
  const indices = new Set<number>();
  for (const log of receipt.logs) {
    if (log.removed !== false || log.blockNumber !== receipt.blockNumber ||
        !isHash(log.blockHash) || !addrEq(log.blockHash, receipt.blockHash) ||
        !addrEq(log.transactionHash, receipt.transactionHash) ||
        log.transactionIndex !== receipt.transactionIndex ||
        !Number.isSafeInteger(log.logIndex) || log.logIndex < 0 || indices.has(log.logIndex))
      return fail('INVALID_LOG_PROVENANCE', 'Receipt log provenance is missing, removed, duplicated or inconsistent.');
    indices.add(log.logIndex);
  }

  if (onchain.amountNative <= 0n || onchain.amountNative > 10n ** 18n || onchain.amountNative % (10n ** 12n) !== 0n)
    return fail('WRONG_EVENT_DATA', 'Invoice amount is outside the native P0 amount/precision policy.');

  // Publish observations only after all identity/inclusion/log provenance gates.
  // Gas is independent of settlement: missing finality must not erase a known fee.
  const gasUsed = typeof receipt.gasUsed === 'bigint' && receipt.gasUsed >= 0n ? receipt.gasUsed : null;
  const gasPrice = typeof receipt.effectiveGasPrice === 'bigint' && receipt.effectiveGasPrice >= 0n ? receipt.effectiveGasPrice : null;
  observedReceipt = {
    transactionHash: receipt.transactionHash, from: receipt.from, to: deployment.contractAddress,
    status: 'success', transactionIndex: receipt.transactionIndex,
    blockNumber: receipt.blockNumber.toString(), blockHash: receipt.blockHash,
    blockTimestamp: block.timestamp.toString(), paymentLogIndex,
    gasUsed: gasUsed?.toString() ?? null, effectiveGasPrice: gasPrice?.toString() ?? null,
    gasFeeNative: gasUsed !== null && gasPrice !== null ? (gasUsed * gasPrice).toString() : null,
  };
  observedInvoice = { amountNative: onchain.amountNative.toString(), payer: onchain.payer,
    merchant: onchain.merchant, paidAt: onchain.paidAt.toString(), paidBlockNumber: onchain.paidBlockNumber.toString() };

  enter('native_transfers');
  // Decode only the official native emitter at 18 decimals. ERC-20 6-decimal
  // logs, same-named logs elsewhere and gas fees cannot satisfy either leg.
  const nativeLogs = receipt.logs.filter((log) => addrEq(log.address, policy.emitter));
  const transfers: { log: RawLog; from: `0x${string}`; to: `0x${string}`; amount: bigint }[] = [];
  for (const log of nativeLogs) {
    if (log.topics.length !== 3 || !addrEq(log.topics[0], NATIVE_TRANSFER_TOPIC) ||
        !/^0x0{24}[0-9a-fA-F]{40}$/.test(log.topics[1]) ||
        !/^0x0{24}[0-9a-fA-F]{40}$/.test(log.topics[2]) ||
        !/^0x[0-9a-fA-F]{64}$/.test(log.data))
      return fail('INVALID_NATIVE_TRANSFER', 'Malformed native-system Transfer ABI encoding.');
    transfers.push({ log, from: topicToAddress(log.topics[1]), to: topicToAddress(log.topics[2]), amount: dataToUint256(log.data) });
  }
  const involvingContract = transfers.filter((t) =>
    addrEq(t.from, deployment.contractAddress) || addrEq(t.to, deployment.contractAddress));
  const incoming = involvingContract.filter((t) => addrEq(t.from, onchain.payer) && addrEq(t.to, deployment.contractAddress));
  const outgoing = involvingContract.filter((t) => addrEq(t.from, deployment.contractAddress) && addrEq(t.to, onchain.merchant));
  if (involvingContract.length !== 2 || incoming.length !== 1 || outgoing.length !== 1 ||
      incoming[0].log.logIndex === outgoing[0].log.logIndex ||
      incoming[0].amount !== onchain.amountNative || outgoing[0].amount !== onchain.amountNative ||
      incoming[0].log.logIndex >= outgoing[0].log.logIndex || outgoing[0].log.logIndex >= paymentLogIndex)
    return fail('INVALID_NATIVE_TRANSFER', 'Require two distinct, unambiguous, exact native transfer legs: payer → contract → merchant, before InvoicePaid.');

  enter('finality');
  // 13. Arc is final on commit. This application additionally requires the RPC
  // finalized header as explicit evidence; it does not add an Ethereum wait.
  // Unsupported/null/older/conflicting responses fail closed, without fallback.
  if (!rpc.getFinalizedBlock)
    return fail('UNVERIFIED_FINALITY', 'RPC finalized-header evidence is unavailable.');
  const finalized = await rpc.getFinalizedBlock().catch(() => null);
  if (!finalized || !validBlock(finalized) || finalized.number < receipt.blockNumber || finalized.timestamp < block.timestamp)
    return fail('UNVERIFIED_FINALITY', 'RPC finalized-header evidence is missing, malformed or behind the payment block.');
  if (finalized.number === receipt.blockNumber &&
      (!addrEq(finalized.hash, receipt.blockHash) || finalized.timestamp !== block.timestamp))
    return fail('UNVERIFIED_FINALITY', 'Finalized header conflicts with the payment block.');
  if (finalized.number > receipt.blockNumber && addrEq(finalized.hash, receipt.blockHash))
    return fail('UNVERIFIED_FINALITY', 'Different finalized heights cannot share the payment block hash.');
  const finalizedByNumber = finalized.number === receipt.blockNumber ? null :
    await rpc.getBlock(finalized.number).catch(() => null);
  if (finalized.number !== receipt.blockNumber &&
      (!finalizedByNumber || !validBlock(finalizedByNumber) || finalizedByNumber.number !== finalized.number ||
       !addrEq(finalizedByNumber.hash, finalized.hash) || finalizedByNumber.timestamp !== finalized.timestamp))
    return fail('UNVERIFIED_FINALITY', 'Finalized-tag header conflicts with the same height read by number.');
  // Read the payment height again AFTER observing finality to detect inconsistent
  // provider snapshots. This is RPC-trusted verification, not a BFT light client.
  const canonical = await rpc.getBlock(receipt.blockNumber).catch(() => null);
  if (!canonical || !validBlock(canonical) || canonical.number !== receipt.blockNumber ||
      !addrEq(canonical.hash, receipt.blockHash) || canonical.timestamp !== block.timestamp)
    return fail('UNVERIFIED_FINALITY', 'Payment block is unavailable or conflicts after finalized-header observation.');

  return {
    ...diagnostics('VERIFIED', 'All verification checks passed.'),
    status: 'VERIFIED',
    message: 'Arc Testnet payment verified against RPC data: exact native 18-decimal transfer legs, InvoicePaid, ' +
      'transaction/state/block binding and finalized-header policy passed. Not an independent consensus proof, revenue or proof of delivery.',
    paymentLogIndex, blockHash: receipt.blockHash, verifiedAt: now, verified: true,
    blockNumber: receipt.blockNumber.toString(),
    gasFeeNative: typeof receipt.gasUsed === 'bigint' && receipt.gasUsed >= 0n &&
      typeof receipt.effectiveGasPrice === 'bigint' && receipt.effectiveGasPrice >= 0n
      ? (receipt.gasUsed * receipt.effectiveGasPrice).toString() : null,
    settlementEvidence: {
      policyId: policy.id, nativeEmitter: policy.emitter, decimals: 18,
      payerToContractLogIndex: incoming[0].log.logIndex,
      contractToMerchantLogIndex: outgoing[0].log.logIndex,
      finalizedBlockNumber: finalized.number.toString(), finalizedBlockHash: finalized.hash,
      controlled_demo: addrEq(onchain.payer, onchain.merchant),
    },
  };
}
