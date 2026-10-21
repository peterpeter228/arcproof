/**
 * T22 — Receipt verifier: forged receipt detection.
 * T23 — Inconsistent blockhash, RPC conflict, missing receipt, duplicate events, uncommitted.
 * All RPC calls are injected mocks — no network.
 *
 * FIXTURE NOTE: all receipts here are test fixtures, clearly not real proof.
 * This legacy fixture has no trusted native settlement policy, so paths that pass
 * standard checks still return UNVERIFIED_ARC_EVIDENCE (verified: false).
 * Anvil does not prove Arc log behaviour.
 *
 * Topic and selector values are derived from the ABI by the production module;
 * these tests use the same constants imported from there to avoid divergence.
 */
import { describe, it, expect } from 'vitest';
import { encodeEventTopics, encodeFunctionData, keccak256 } from 'viem';
import { verifyReceipt } from '../receiptVerifier';
import type { RpcProvider, RawReceipt, RawTransaction, RawBlock, OnchainInvoiceState } from '../receiptVerifier';
import type { DeploymentRecord } from '../manifest';
import { ARCPROOF_ABI } from '../arcproofAbi';

const CHAIN_ID = 2482601649;
const CONTRACT = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as `0x${string}`;
const TX_HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000001' as `0x${string}`;
const INVOICE_ID = '0x1234000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
const PAYER = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const MERCHANT = '0x2222222222222222222222222222222222222222' as `0x${string}`;
const AMOUNT = 200_000_000_000_000_000n;
const BLOCK_NUM = 1000n;
const BLOCK_HASH = '0xblockhash0000000000000000000000000000000000000000000000000000001' as `0x${string}`;
const BLOCK_TS = 1729382400n;

// Derive topic and selector from ABI — mirrors production module; no hardcoded hex
const INVOICE_PAID_TOPIC = (encodeEventTopics({ abi: ARCPROOF_ABI, eventName: 'InvoicePaid' })[0]);
const PAY_INVOICE_SELECTOR = (encodeFunctionData({
  abi: ARCPROOF_ABI,
  functionName: 'payInvoice',
  args: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
}).slice(0, 10)) as `0x${string}`;

// A valid (but fictional) runtime bytecode — keccak256 used for manifest runtimeCodeHash
const MOCK_BYTECODE = '0x6080604052' as `0x${string}`;
const MOCK_CODE_HASH = keccak256(MOCK_BYTECODE);

// pad32 helper
function pad32(hex: string): `0x${string}` {
  return ('0x' + hex.replace('0x', '').padStart(64, '0')) as `0x${string}`;
}

const DEP: DeploymentRecord = {
  deploymentId: 'dep-001',
  chainId: CHAIN_ID,
  contractAddress: CONTRACT,
  runtimeCodeHash: MOCK_CODE_HASH, // keccak256 of MOCK_BYTECODE — required, not TODO
  label: 'Test',
  deployedAt: '2026-10-20T00:00:00Z',
};

// Good log: InvoicePaid(invoiceId, payer, merchant, amountNative)
// topics[0] = event topic, topics[1] = invoiceId, topics[2] = payer, topics[3] = merchant
// data = abi.encode(amountNative)
const GOOD_LOG = {
  address: CONTRACT,
  topics: [
    INVOICE_PAID_TOPIC,
    pad32(INVOICE_ID.slice(2)),
    pad32(PAYER.slice(2)),
    pad32(MERCHANT.slice(2)),
  ] as `0x${string}`[],
  data: pad32(AMOUNT.toString(16)),
  logIndex: 0,
  transactionHash: TX_HASH,
};

const GOOD_RECEIPT: RawReceipt = {
  blockNumber: BLOCK_NUM,
  blockHash: BLOCK_HASH,
  transactionHash: TX_HASH,
  transactionIndex: 0,
  status: 'success',
  from: PAYER,
  to: CONTRACT,
  logs: [GOOD_LOG],
};

const GOOD_TX: RawTransaction = {
  hash: TX_HASH,
  from: PAYER,
  to: CONTRACT,
  input: (PAY_INVOICE_SELECTOR + INVOICE_ID.slice(2).padStart(64, '0')) as `0x${string}`,
  value: AMOUNT,
  chainId: CHAIN_ID,
};

const GOOD_BLOCK: RawBlock = {
  number: BLOCK_NUM,
  hash: BLOCK_HASH,
  timestamp: BLOCK_TS,
};

const GOOD_ONCHAIN: OnchainInvoiceState = {
  merchant: MERCHANT,
  amountNative: AMOUNT,
  expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
  termsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  paid: true,
  payer: PAYER,
  paidAt: BLOCK_TS,
  paidBlockNumber: BLOCK_NUM,
};

function makeRpc(overrides: Partial<RpcProvider> = {}): RpcProvider {
  return {
    getChainId: () => Promise.resolve(CHAIN_ID),
    getTransactionReceipt: () => Promise.resolve(GOOD_RECEIPT),
    getTransaction: () => Promise.resolve(GOOD_TX),
    getBlock: () => Promise.resolve(GOOD_BLOCK),
    getContractCode: () => Promise.resolve(MOCK_BYTECODE),
    getInvoice: () => Promise.resolve(GOOD_ONCHAIN),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T22 — Happy path
// ---------------------------------------------------------------------------
describe('T22 — Legacy fixture without settlement policy -> UNVERIFIED_ARC_EVIDENCE', () => {
  it('returns UNVERIFIED_ARC_EVIDENCE (never VERIFIED) for a well-formed fixture', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID, makeRpc());
    // REGRESSION: must NOT return VERIFIED without the trusted settlement policy
    expect(r.status).toBe('UNVERIFIED_ARC_EVIDENCE');
    expect(r.verified).toBe(false);
    expect(r.paymentLogIndex).toBe(0);
    expect(r.blockHash).toBe(BLOCK_HASH);
  });

  it('verified remains false for this unconfigured fixture', async () => {
    // This unconfigured legacy fixture cannot return verified: true.
    // This is the regression guard for the original bug where VERIFIED was returned
    // after passing chain/receipt checks while Arc system Transfer was unverified.
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID, makeRpc());
    expect(r.verified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T22 — Forged receipt detection
// ---------------------------------------------------------------------------
describe('T22 — Forged receipt detection', () => {
  it('wrong chain ID -> WRONG_CHAIN, verified=false', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getChainId: () => Promise.resolve(1) }));
    expect(r.status).toBe('WRONG_CHAIN');
    expect(r.verified).toBe(false);
  });

  it('no bytecode (unknown deployment) -> UNKNOWN_DEPLOYMENT', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getContractCode: () => Promise.resolve('0x') }));
    expect(r.status).toBe('UNKNOWN_DEPLOYMENT');
    expect(r.verified).toBe(false);
  });

  it('REGRESSION: runtimeCodeHash mismatch -> WRONG_BYTECODE (not silently skipped)', async () => {
    // Bug: original code had a TODO for this check and skipped it, returning VERIFIED.
    // Fix: keccak256(code) must equal deployment.runtimeCodeHash; mismatch -> WRONG_BYTECODE.
    const wrongDep = { ...DEP, runtimeCodeHash: '0x' + 'dead'.repeat(16) as `0x${string}` };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, wrongDep, CHAIN_ID, makeRpc());
    expect(r.status).toBe('WRONG_BYTECODE');
    expect(r.verified).toBe(false);
  });

  it('missing runtimeCodeHash in manifest -> WRONG_BYTECODE', async () => {
    const nohashDep = { ...DEP, runtimeCodeHash: '0x' as `0x${string}` };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, nohashDep, CHAIN_ID, makeRpc());
    expect(r.status).toBe('WRONG_BYTECODE');
  });

  it.each([undefined, '0x2', 'invalid'])('unsupported receipt status %s is PENDING, never FAILED', async (status) => {
    const badReceipt = { ...GOOD_RECEIPT, status } as unknown as RawReceipt;
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID, makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('PENDING'); expect(r.verified).toBe(false);
  });

  it('reverted receipt -> FAILED', async () => {
    const badReceipt = { ...GOOD_RECEIPT, status: 'reverted' as const };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('FAILED');
  });

  it('wrong tx.to (different contract) -> WRONG_TX_TARGET', async () => {
    const badReceipt = { ...GOOD_RECEIPT, to: '0xDEAD000000000000000000000000000000000001' as `0x${string}` };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('WRONG_TX_TARGET');
  });

  it('tx.chainId mismatch -> WRONG_TX_CHAINID', async () => {
    const badTx = { ...GOOD_TX, chainId: 999 };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransaction: () => Promise.resolve(badTx) }));
    expect(r.status).toBe('WRONG_TX_CHAINID');
  });

  it('wrong selector -> WRONG_SELECTOR', async () => {
    const badTx = { ...GOOD_TX, input: ('0xdeadbeef' + INVOICE_ID.slice(2).padStart(64, '0')) as `0x${string}` };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransaction: () => Promise.resolve(badTx) }));
    expect(r.status).toBe('WRONG_SELECTOR');
  });

  it('wrong invoiceId in calldata -> WRONG_SELECTOR', async () => {
    const wrongId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as `0x${string}`;
    const badTx = { ...GOOD_TX, input: (PAY_INVOICE_SELECTOR + wrongId.slice(2).padStart(64, '0')) as `0x${string}` };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransaction: () => Promise.resolve(badTx) }));
    expect(r.status).toBe('WRONG_SELECTOR');
  });

  it('wrong value -> WRONG_VALUE', async () => {
    const badTx = { ...GOOD_TX, value: AMOUNT + 1n };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransaction: () => Promise.resolve(badTx) }));
    expect(r.status).toBe('WRONG_VALUE');
  });

  it('no matching InvoicePaid event -> NO_MATCHING_EVENT', async () => {
    const badReceipt = { ...GOOD_RECEIPT, logs: [] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('NO_MATCHING_EVENT');
  });

  it('event from different emitter address -> NO_MATCHING_EVENT', async () => {
    const fakeLog = { ...GOOD_LOG, address: '0xBADBADBADBADBADBADBADBADBADBADBADBADBADB' as `0x${string}` };
    const badReceipt = { ...GOOD_RECEIPT, logs: [fakeLog] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('NO_MATCHING_EVENT');
  });

  it('invoice not paid on chain -> INVOICE_NOT_PAID', async () => {
    const unpaid = { ...GOOD_ONCHAIN, paid: false };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getInvoice: () => Promise.resolve(unpaid) }));
    expect(r.status).toBe('INVOICE_NOT_PAID');
  });

  it('REGRESSION: wrong event payer in topics[2] -> WRONG_EVENT_DATA', async () => {
    // Bug: original code did not decode/verify topics[2] (payer) or topics[3] (merchant).
    // Fix: all indexed event fields must be checked against on-chain invoice state.
    const wrongPayerLog = {
      ...GOOD_LOG,
      topics: [
        INVOICE_PAID_TOPIC,
        pad32(INVOICE_ID.slice(2)),
        pad32('0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead'.slice(2)), // wrong payer
        pad32(MERCHANT.slice(2)),
      ] as `0x${string}`[],
    };
    const badReceipt = { ...GOOD_RECEIPT, logs: [wrongPayerLog] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('WRONG_EVENT_DATA');
    expect(r.verified).toBe(false);
  });

  it('REGRESSION: wrong event merchant in topics[3] -> WRONG_EVENT_DATA', async () => {
    const wrongMerchantLog = {
      ...GOOD_LOG,
      topics: [
        INVOICE_PAID_TOPIC,
        pad32(INVOICE_ID.slice(2)),
        pad32(PAYER.slice(2)),
        pad32('0xbababababababababababababababababababababababab'.slice(2)), // wrong merchant
      ] as `0x${string}`[],
    };
    const badReceipt = { ...GOOD_RECEIPT, logs: [wrongMerchantLog] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('WRONG_EVENT_DATA');
    expect(r.verified).toBe(false);
  });

  it('REGRESSION: wrong amountNative in event data -> WRONG_EVENT_DATA', async () => {
    // Bug: original code did not decode or verify event data (amountNative).
    // The event has no paidAt — the spec field is invoiceId,payer,merchant,amountNative.
    const wrongAmountLog = {
      ...GOOD_LOG,
      data: pad32('1'), // 1 wei instead of AMOUNT
    };
    const badReceipt = { ...GOOD_RECEIPT, logs: [wrongAmountLog] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(badReceipt) }));
    expect(r.status).toBe('WRONG_EVENT_DATA');
    expect(r.verified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T23 — Inconsistent block / RPC conflicts / uncommitted
// ---------------------------------------------------------------------------
describe('T23 — Inconsistent block / RPC conflicts / uncommitted', () => {
  it('receipt not found -> PENDING', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(null) }));
    expect(r.status).toBe('PENDING');
  });

  it('block not found -> PENDING', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getBlock: () => Promise.resolve(null) }));
    expect(r.status).toBe('PENDING');
  });

  it('block mismatch: receipt.blockNumber != paidBlockNumber -> BLOCK_MISMATCH', async () => {
    const badOnchain = { ...GOOD_ONCHAIN, paidBlockNumber: 9999n };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getInvoice: () => Promise.resolve(badOnchain) }));
    expect(r.status).toBe('BLOCK_MISMATCH');
  });

  it('timestamp mismatch -> TIMESTAMP_MISMATCH', async () => {
    const badOnchain = { ...GOOD_ONCHAIN, paidAt: 9999n };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getInvoice: () => Promise.resolve(badOnchain) }));
    expect(r.status).toBe('TIMESTAMP_MISMATCH');
  });

  it('blockhash mismatch: receipt.blockHash != block.hash -> BLOCKHASH_MISMATCH', async () => {
    const badBlock = {
      ...GOOD_BLOCK,
      hash: '0xdifferenthash000000000000000000000000000000000000000000000000001' as `0x${string}`,
    };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getBlock: () => Promise.resolve(badBlock) }));
    expect(r.status).toBe('BLOCKHASH_MISMATCH');
  });

  it('duplicate InvoicePaid events -> NO_MATCHING_EVENT', async () => {
    const dup = { ...GOOD_RECEIPT, logs: [GOOD_LOG, { ...GOOD_LOG, logIndex: 1 }] };
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(dup) }));
    expect(r.status).toBe('NO_MATCHING_EVENT');
  });

  it('RPC throws -> PENDING (not a crash)', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID, makeRpc({
      getTransactionReceipt: () => Promise.reject(new Error('network error')),
    }));
    expect(r.status).toBe('PENDING');
  });

  it('verified=false on any non-UNVERIFIED_ARC_EVIDENCE status', async () => {
    const r = await verifyReceipt(TX_HASH, INVOICE_ID, DEP, CHAIN_ID,
      makeRpc({ getTransactionReceipt: () => Promise.resolve(null) }));
    expect(r.verified).toBe(false);
  });
});
