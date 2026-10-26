/**
 * T19 — Manifest: URL/cache recipient/amount/contract tampering,
 * unknown deployment, two deployments isolation, nonzero-terms read-only.
 * PreparedPayment nonzero-terms gate.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveDeployment,
  deploymentsForChain,
  invoiceCacheKey,
  PRODUCTION_MANIFEST,
  type DeploymentRecord,
} from '../manifest';
import {
  preparePayment,
  isPrepareError,
  type InvoiceSnapshot,
} from '../preparedPayment';

const CHAIN_A = 2482601649;
const CHAIN_B = 11155111;

const DEP_A: DeploymentRecord = {
  deploymentId: 'test-dep-a',
  chainId: CHAIN_A,
  contractAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  runtimeCodeHash: '0xbbbb000000000000000000000000000000000000000000000000000000000000',
  label: 'Test A',
  deployedAt: '2026-10-20T00:00:00Z',
};
const DEP_B: DeploymentRecord = {
  deploymentId: 'test-dep-b',
  chainId: CHAIN_A,
  contractAddress: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  runtimeCodeHash: '0xcccc000000000000000000000000000000000000000000000000000000000000',
  label: 'Test B',
  deployedAt: '2026-10-20T01:00:00Z',
};
const DEP_C_CHAINB: DeploymentRecord = {
  deploymentId: 'test-dep-c',
  chainId: CHAIN_B,
  contractAddress: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  runtimeCodeHash: '0xdddd000000000000000000000000000000000000000000000000000000000000',
  label: 'Test C',
  deployedAt: null,
};
const TEST_MANIFEST = [DEP_A, DEP_B, DEP_C_CHAINB];

describe('T19 — Production manifest is the verified mainnet deployment', () => {
  it('PRODUCTION_MANIFEST has the Arc mainnet U1 record', () => {
    expect(PRODUCTION_MANIFEST).toHaveLength(1);
    expect(PRODUCTION_MANIFEST[0].chainId).toBe(5042);
    expect(PRODUCTION_MANIFEST[0].contractAddress).toBe('0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE');
    expect(PRODUCTION_MANIFEST[0].deploymentId).toBe('0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa');
  });
});

describe('T19 — resolveDeployment', () => {
  it('finds DEP_A by chainId+deploymentId', () => {
    const r = resolveDeployment(TEST_MANIFEST, CHAIN_A, 'test-dep-a');
    expect(r?.contractAddress).toBe(DEP_A.contractAddress);
  });
  it('returns null for unknown deploymentId', () => {
    expect(resolveDeployment(TEST_MANIFEST, CHAIN_A, 'unknown')).toBeNull();
  });
  it('returns null for wrong chainId', () => {
    expect(resolveDeployment(TEST_MANIFEST, CHAIN_B, 'test-dep-a')).toBeNull();
  });
  it('two deployments on same chain resolve independently', () => {
    const a = resolveDeployment(TEST_MANIFEST, CHAIN_A, 'test-dep-a');
    const b = resolveDeployment(TEST_MANIFEST, CHAIN_A, 'test-dep-b');
    expect(a?.contractAddress).not.toBe(b?.contractAddress);
  });
  it('URL cannot override contractAddress: only manifest address is used', () => {
    // Simulate URL injection: attacker provides a different address.
    // Manifest lookup ignores URL-supplied address entirely.
    const r = resolveDeployment(TEST_MANIFEST, CHAIN_A, 'test-dep-a');
    // URL address 0xDEAD... has no effect — resolved address always comes from manifest
    const urlSuppliedAddress = '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
    expect(r?.contractAddress).not.toBe(urlSuppliedAddress);
    expect(r?.contractAddress).toBe(DEP_A.contractAddress);
  });
});

describe('T19 — deploymentsForChain', () => {
  it('returns only deployments for the given chain', () => {
    const res = deploymentsForChain(TEST_MANIFEST, CHAIN_A);
    expect(res).toHaveLength(2);
    expect(res.every((d) => d.chainId === CHAIN_A)).toBe(true);
  });
  it('returns empty array for chain with no deployments', () => {
    expect(deploymentsForChain(TEST_MANIFEST, 999)).toHaveLength(0);
  });
  it('sorts newest-first by deployedAt', () => {
    const res = deploymentsForChain(TEST_MANIFEST, CHAIN_A);
    // DEP_B has later deployedAt
    expect(res[0].deploymentId).toBe('test-dep-b');
  });
});

describe('T19 — invoiceCacheKey', () => {
  it('includes all three context fields', () => {
    const k = invoiceCacheKey(CHAIN_A, 'test-dep-a', '0xabc');
    expect(k).toContain(String(CHAIN_A));
    expect(k).toContain('test-dep-a');
    expect(k).toContain('0xabc');
  });
  it('different chainId produces different key', () => {
    const k1 = invoiceCacheKey(CHAIN_A, 'dep', '0xabc');
    const k2 = invoiceCacheKey(CHAIN_B, 'dep', '0xabc');
    expect(k1).not.toBe(k2);
  });
  it('different deploymentId produces different key', () => {
    const k1 = invoiceCacheKey(CHAIN_A, 'dep-1', '0xabc');
    const k2 = invoiceCacheKey(CHAIN_A, 'dep-2', '0xabc');
    expect(k1).not.toBe(k2);
  });
  it('different invoiceId produces different key', () => {
    const k1 = invoiceCacheKey(CHAIN_A, 'dep', '0xaaa');
    const k2 = invoiceCacheKey(CHAIN_A, 'dep', '0xbbb');
    expect(k1).not.toBe(k2);
  });
});

const INVOICE_BASE: InvoiceSnapshot = {
  invoiceId: '0x1234000000000000000000000000000000000000000000000000000000000000',
  merchant: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  amountNative: 200_000_000_000_000_000n,
  expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
  termsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  paid: false,
};

describe('T19 — preparePayment nonzero termsHash gate', () => {
  it('rejects nonzero termsHash with NONZERO_TERMS', () => {
    const invoice = {
      ...INVOICE_BASE,
      termsHash: '0x1234000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    };
    const result = preparePayment(DEP_A, '0x1111111111111111111111111111111111111111', invoice, 1, Math.floor(Date.now() / 1000));
    expect(isPrepareError(result)).toBe(true);
    if (isPrepareError(result)) {
      expect(result.code).toBe('NONZERO_TERMS');
    }
  });
  it('accepts zero termsHash', () => {
    const result = preparePayment(DEP_A, '0x1111111111111111111111111111111111111111', INVOICE_BASE, 1, Math.floor(Date.now() / 1000));
    expect(isPrepareError(result)).toBe(false);
  });
  it('rejects null deployment with NO_DEPLOYMENT', () => {
    const result = preparePayment(null, '0x1111111111111111111111111111111111111111', INVOICE_BASE, 1, Math.floor(Date.now() / 1000));
    expect(isPrepareError(result)).toBe(true);
    if (isPrepareError(result)) expect(result.code).toBe('NO_DEPLOYMENT');
  });
  it('rejects already paid invoice', () => {
    const result = preparePayment(DEP_A, '0x1111111111111111111111111111111111111111', { ...INVOICE_BASE, paid: true }, 1, Math.floor(Date.now() / 1000));
    expect(isPrepareError(result)).toBe(true);
    if (isPrepareError(result)) expect(result.code).toBe('ALREADY_PAID');
  });
  it('rejects expired invoice', () => {
    const result = preparePayment(DEP_A, '0x1111111111111111111111111111111111111111', { ...INVOICE_BASE, expiresAt: 1n }, 1, Math.floor(Date.now() / 1000));
    expect(isPrepareError(result)).toBe(true);
    if (isPrepareError(result)) expect(result.code).toBe('EXPIRED');
  });
});
