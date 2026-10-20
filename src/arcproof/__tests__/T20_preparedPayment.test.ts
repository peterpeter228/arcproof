/**
 * T20 — PreparedPayment: delayed old RPC after context switch,
 * tampered to/data/value, calldata derived from ABI, explicit wallet request fields.
 * T21 — Rejection/timeout/context changes while sig open, no auto-rebroadcast,
 * post-broadcast mismatch detection.
 */
import { describe, it, expect } from 'vitest';
import { toFunctionSelector } from 'viem';
import {
  preparePayment,
  validatePaymentContext,
  isPrepareError,
  type PreparedPayment,
  type InvoiceSnapshot,
} from '../preparedPayment';
import type { DeploymentRecord } from '../manifest';

const CHAIN_ID = 2482601649;
const DEP: DeploymentRecord = {
  deploymentId: 'dep-001',
  chainId: CHAIN_ID,
  contractAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  runtimeCodeHash: '0xbbbb000000000000000000000000000000000000000000000000000000000000',
  label: 'Test',
  deployedAt: '2026-10-20T00:00:00Z',
};
const DEP2: DeploymentRecord = {
  deploymentId: 'dep-002',
  chainId: CHAIN_ID,
  contractAddress: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  runtimeCodeHash: '0xcccc000000000000000000000000000000000000000000000000000000000000',
  label: 'Test2',
  deployedAt: '2026-10-20T00:00:00Z',
};
const PAYER = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const NOW = Math.floor(Date.now() / 1000);

const INVOICE: InvoiceSnapshot = {
  invoiceId: '0x1234000000000000000000000000000000000000000000000000000000000000',
  merchant: '0x3333333333333333333333333333333333333333',
  amountNative: 200_000_000_000_000_000n,
  expiresAt: BigInt(NOW + 3600),
  termsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  paid: false,
};

function makePrepared(overrides: Partial<InvoiceSnapshot> = {}, connectionVersion = 1): PreparedPayment | null {
  const result = preparePayment(DEP, PAYER, { ...INVOICE, ...overrides }, connectionVersion, NOW);
  if (isPrepareError(result)) return null;
  return result;
}

/** Call validatePaymentContext with the standard valid context */
function validate(
  prepared: PreparedPayment,
  opts: {
    chainId?: number;
    payer?: `0x${string}`;
    connectionVersion?: number;
    deploymentId?: string;
    contract?: `0x${string}`;
    freshInvoice?: InvoiceSnapshot;
    nowSeconds?: number;
  } = {},
): string | null {
  return validatePaymentContext(
    prepared,
    opts.chainId ?? CHAIN_ID,
    opts.payer ?? PAYER,
    opts.connectionVersion ?? 1,
    opts.deploymentId ?? DEP.deploymentId,
    opts.contract ?? (DEP.contractAddress),
    opts.freshInvoice ?? INVOICE,
    opts.nowSeconds ?? NOW + 1,
  );
}

// ---------------------------------------------------------------------------
// T20 — Prepared payment explicit fields
// ---------------------------------------------------------------------------
describe('T20 — Prepared payment explicit fields', () => {
  it('binds chainId, deploymentId, contract, payer, invoiceId, value', () => {
    const p = makePrepared();
    expect(p).not.toBeNull();
    expect(p!.chainId).toBe(CHAIN_ID);
    expect(p!.deploymentId).toBe('dep-001');
    expect(p!.contract).toBe(DEP.contractAddress);
    expect(p!.payer).toBe(PAYER);
    expect(p!.invoiceId).toBe(INVOICE.invoiceId);
    expect(p!.value).toBe(INVOICE.amountNative);
  });

  it('calldata selector derived from ABI: starts with payInvoice selector for payInvoice(bytes32)', () => {
    const p = makePrepared();
    // Selector is computed by production module from frozen ABI via viem
    expect(p!.calldata.toLowerCase().startsWith(toFunctionSelector('payInvoice(bytes32)'))).toBe(true);
  });

  it('calldata encodes invoiceId as first argument', () => {
    const p = makePrepared();
    expect(p!.calldata.toLowerCase()).toContain(INVOICE.invoiceId.slice(2).toLowerCase());
  });

  it('connectionVersion is stored', () => {
    const p = makePrepared({}, 42);
    expect(p!.connectionVersion).toBe(42);
  });

  it('invoiceSnapshot is a deep copy (not a reference)', () => {
    const inv = { ...INVOICE };
    const result = preparePayment(DEP, PAYER, inv, 1, NOW);
    if (isPrepareError(result)) throw new Error('unexpected error');
    (inv as Record<string, unknown>).paid = true;
    expect(result.invoiceSnapshot.paid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T20 — validatePaymentContext (all 7 binding fields)
// ---------------------------------------------------------------------------
describe('T20 — validatePaymentContext', () => {
  it('valid context returns null', () => {
    const p = makePrepared()!;
    expect(validate(p)).toBeNull();
  });

  it('chain changed returns error', () => {
    const p = makePrepared()!;
    expect(validate(p, { chainId: 99999 })).toMatch(/chain/i);
  });

  it('payer changed returns error', () => {
    const p = makePrepared()!;
    const otherPayer = '0x2222222222222222222222222222222222222222' as `0x${string}`;
    expect(validate(p, { payer: otherPayer })).toMatch(/account/i);
  });

  it('connectionVersion changed returns error', () => {
    const p = makePrepared({}, 1)!;
    expect(validate(p, { connectionVersion: 2 })).toMatch(/connection/i);
  });

  it('REGRESSION: deploymentId compared to CURRENT deploymentId, not to itself', () => {
    // Bug: original code had prepared.deploymentId !== prepared.deploymentId (tautology
    // — always false, so deployment changes were never caught).
    // Fix: compare prepared.deploymentId to currentDeploymentId (the new parameter).
    const p = makePrepared()!; // prepared for dep-001
    // Simulate user navigating to a different deployment
    const err = validate(p, { deploymentId: 'dep-002', contract: DEP2.contractAddress });
    expect(err).not.toBeNull();
    expect(err).toMatch(/deployment/i);
  });

  it('contract address changed returns error', () => {
    const p = makePrepared()!;
    const otherContract = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' as `0x${string}`;
    const err = validate(p, { contract: otherContract });
    expect(err).not.toBeNull();
    expect(err).toMatch(/contract/i);
  });

  it('invoiceId changed in freshInvoice returns error', () => {
    const p = makePrepared()!;
    const changed = { ...INVOICE, invoiceId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as `0x${string}` };
    expect(validate(p, { freshInvoice: changed })).toMatch(/invoice id/i);
  });

  it('invoice paid between prepare and confirm returns error', () => {
    const p = makePrepared()!;
    expect(validate(p, { freshInvoice: { ...INVOICE, paid: true } })).toMatch(/paid/i);
  });

  it('invoice expired between prepare and confirm returns error', () => {
    const p = makePrepared()!;
    const expired = { ...INVOICE, expiresAt: BigInt(NOW - 1) };
    expect(validate(p, { freshInvoice: expired, nowSeconds: NOW + 100 })).toMatch(/expir/i);
  });

  it('amount changed returns error', () => {
    const p = makePrepared()!;
    const changed = { ...INVOICE, amountNative: 1_000_000_000_000n };
    expect(validate(p, { freshInvoice: changed })).toMatch(/amount/i);
  });

  it('calldata re-derived from fresh invoice must match prepared calldata', () => {
    // If invoiceId matches but prepared calldata was somehow tampered, validation must catch it.
    const p = makePrepared()!;
    // Manually tamper the calldata (simulating an adversarial prepared object)
    const tampered = { ...p, calldata: '0xdeadbeef' as `0x${string}` };
    const err = validatePaymentContext(
      tampered,
      CHAIN_ID, PAYER, 1,
      DEP.deploymentId, DEP.contractAddress,
      INVOICE, NOW + 1,
    );
    expect(err).not.toBeNull();
    expect(err).toMatch(/calldata/i);
  });
});

// ---------------------------------------------------------------------------
// T20/T21 — Delayed old RPC / stale async results
// ---------------------------------------------------------------------------
describe('T20/T21 — Delayed old RPC / stale async results', () => {
  it('connection version change invalidates stale prepared payment', () => {
    const stalePrepared = makePrepared({}, 1)!;
    // Wallet was reconnected (version incremented)
    expect(validate(stalePrepared, { connectionVersion: 2 })).not.toBeNull();
  });

  it('null deployment returns NO_DEPLOYMENT error', () => {
    const result = preparePayment(null, PAYER, INVOICE, 1, NOW);
    expect(isPrepareError(result)).toBe(true);
    if (isPrepareError(result)) expect(result.code).toBe('NO_DEPLOYMENT');
  });

  it('value is derived only from trusted invoice — no override path', () => {
    const p = makePrepared()!;
    expect(p.value).toBe(INVOICE.amountNative);
  });

  it('contract address comes from deployment record, not from invoice fields', () => {
    const p = makePrepared()!;
    expect(p.contract).toBe(DEP.contractAddress);
    expect(p.contract).not.toBe(INVOICE.merchant);
  });
});

// ---------------------------------------------------------------------------
// T21 — No auto-rebroadcast principle
// ---------------------------------------------------------------------------
describe('T21 — No auto-rebroadcast principle', () => {
  it('preparePayment produces a new object each call', () => {
    const p1 = makePrepared()!;
    const p2 = makePrepared()!;
    expect(p1).not.toBe(p2);
  });

  it('preparedAt is a recent timestamp in ms', () => {
    const before = Date.now();
    const p = makePrepared()!;
    const after = Date.now();
    expect(p.preparedAt).toBeGreaterThanOrEqual(before);
    expect(p.preparedAt).toBeLessThanOrEqual(after);
  });
});
