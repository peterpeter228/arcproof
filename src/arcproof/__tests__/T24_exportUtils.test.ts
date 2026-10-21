/**
 * T24 — Nonce pagination, clean-browser recovery, integer strings/logIndex,
 * export/import dedupe + untrusted imported flags.
 */
import { describe, it, expect } from 'vitest';
import {
  exportReceiptsJson,
  exportReceiptsCsv,
  deduplicateReceipts,
  buildReceiptExport,
  type ReceiptExportRecord,
} from '../exportUtils';
import { deriveInvoiceIds } from '../invoiceId';
import { FIXTURE_MANIFEST, type DeploymentRecord } from '../manifest';
import type { VerificationResult } from '../receiptVerifier';

const CHAIN_ID = 2482601649;
const CONTRACT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const DEP: DeploymentRecord = {
  deploymentId: 'dep-001',
  chainId: CHAIN_ID,
  contractAddress: CONTRACT,
  runtimeCodeHash: '0xbbbb000000000000000000000000000000000000000000000000000000000000',
  label: 'Test',
  deployedAt: null,
};
const RESULT_OK: VerificationResult = {
  status: 'VERIFIED',
  message: 'ok',
  paymentLogIndex: 5,
  blockHash: '0xblockhash0000000000000000000000000000000000000000000000000000001',
  verifiedAt: 1729382400000,
  verified: true,
};

describe('T24 — nonce pagination', () => {
  it('N=0: no invoices -> empty array', () => {
    const ids = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 0n);
    expect(ids).toHaveLength(0);
  });
  it('N=1: page 0 has 1 entry at nonce 0', () => {
    const ids = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 1n);
    expect(ids).toHaveLength(1);
    expect(ids[0].nonce).toBe(0n);
  });
  it('N=20: page 0 has 20 entries, newest first (nonce 19 down to 0)', () => {
    const ids = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 20n);
    expect(ids).toHaveLength(20);
    expect(ids[0].nonce).toBe(19n);
    expect(ids[19].nonce).toBe(0n);
  });
  it('N=21: page 0 has 20 entries (nonce 20..1), page 1 has 1 entry (nonce 0)', () => {
    const p0 = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 21n, 20, 0);
    const p1 = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 21n, 20, 1);
    expect(p0).toHaveLength(20);
    expect(p0[0].nonce).toBe(20n);
    expect(p1).toHaveLength(1);
    expect(p1[0].nonce).toBe(0n);
  });
  it('invoice IDs are deterministic: same inputs produce same ID', () => {
    const a = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 5n);
    const b = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 5n);
    expect(a.map((x) => x.invoiceId)).toEqual(b.map((x) => x.invoiceId));
  });
  it('different merchant produces different IDs at same nonce', () => {
    const a = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x1111111111111111111111111111111111111111', 1n);
    const b = deriveInvoiceIds(CHAIN_ID, CONTRACT, '0x2222222222222222222222222222222222222222', 1n);
    expect(a[0].invoiceId).not.toBe(b[0].invoiceId);
  });
});

describe('T24 — buildReceiptExport integer strings', () => {
  it('amountNative is a string, not a number', () => {
    const r = buildReceiptExport(
      DEP, '0xabc', '0xdeadbeef',
      200_000_000_000_000_000n,
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      1729382400n, 1000n,
      RESULT_OK, false,
    );
    expect(typeof r.amountNative).toBe('string');
    expect(r.amountNative).toBe('200000000000000000');
  });
  it('paidAt is a string', () => {
    const r = buildReceiptExport(DEP, '0xabc', '0xdeadbeef',
      200_000_000_000_000_000n, '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      1729382400n, 1000n, RESULT_OK, false);
    expect(typeof r.paidAt).toBe('string');
    expect(r.paidAt).toBe('1729382400');
  });
  it('paidBlockNumber is a string', () => {
    const r = buildReceiptExport(DEP, '0xabc', '0xdeadbeef',
      200_000_000_000_000_000n, '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      1729382400n, 1000n, RESULT_OK, false);
    expect(typeof r.paidBlockNumber).toBe('string');
    expect(r.paidBlockNumber).toBe('1000');
  });
  it('paymentLogIndex is stored as number', () => {
    const r = buildReceiptExport(DEP, '0xabc', '0xdeadbeef',
      200_000_000_000_000_000n, '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      1729382400n, 1000n, RESULT_OK, false);
    expect(r.paymentLogIndex).toBe(5);
  });
  it('fixture flag cannot bless an unregistered deployment', () => {
    const fixture = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null, { ...RESULT_OK, status: 'PENDING', verified: false }, true);
    expect(fixture.mode).toBe('unknown');
    const trustedFixture = buildReceiptExport(FIXTURE_MANIFEST[0], '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null, { ...RESULT_OK, status: 'PENDING', verified: false }, true);
    expect(trustedFixture.mode).toBe('fixture');
  });
});

describe('T24 — exportReceiptsJson', () => {
  it('produces valid JSON', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const json = exportReceiptsJson([r]);
    let parsed: unknown;
    expect(() => { parsed = JSON.parse(json) as unknown; }).not.toThrow();
    expect(parsed).toBeDefined();
  });
  it('importedVerified is always false in export', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const json = exportReceiptsJson([r]);
    const parsed = JSON.parse(json) as { importedVerified: boolean }[];
    expect(parsed[0].importedVerified).toBe(false);
  });
  it('amountNative remains a string in JSON (no number coercion)', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const json = exportReceiptsJson([r]);
    const parsed = JSON.parse(json) as { amountNative: unknown }[];
    expect(typeof parsed[0].amountNative).toBe('string');
  });
});

function makeFormulaRecord(deploymentId: string): ReceiptExportRecord {
  return {
    chainId: CHAIN_ID,
    deploymentId,
    contract: CONTRACT,
    invoiceId: '0xabc',
    transactionHash: null,
    paymentLogIndex: null,
    amountNative: '200000000000000000',
    amountDisplay: '0.20',
    payer: null,
    merchant: null,
    paidAt: null,
    paidBlockNumber: null,
    blockHash: null,
    verificationStatus: 'PENDING',
    mode: 'fixture',
  };
}

describe('T24 — exportReceiptsCsv', () => {
  it('first row is headers', () => {
    const csv = exportReceiptsCsv([]);
    expect(csv.startsWith('chainId,')).toBe(true);
  });

  it('REGRESSION: formula injection — = prefixed cell gets tab prefix, not just quotes', () => {
    // Bug: original csvCell only quoted cells starting with =; quoting alone does not
    // neutralise formula injection in all spreadsheet applications.
    // Fix: prefix with \t (tab), which forces text interpretation in Excel/Sheets/LibreOffice.
    const csv = exportReceiptsCsv([makeFormulaRecord('=EVIL_FORMULA()')]);
    // Must contain tab-prefixed version in the CSV
    expect(csv).toContain('\t=EVIL_FORMULA()');
    // Must NOT appear as bare =EVIL_FORMULA() (without tab prefix) in any cell position
    // (allowing for the tab-prefixed version which is correct)
    const lines = csv.split('\n');
    const dataLine = lines[1];
    // Verify no cell starts with bare = (without tab)
    const cells = dataLine.split(',');
    for (const cell of cells) {
      const raw = cell.replace(/^"/, '').replace(/"$/, '');
      if (raw.startsWith('=')) {
        // A cell starting with literal = (no tab) is the bug
        expect(raw).toMatch(/^\t=/); // must have tab before =
      }
    }
  });

  it('REGRESSION: + prefixed cells get tab prefix', () => {
    const csv = exportReceiptsCsv([makeFormulaRecord('+1+1')]);
    expect(csv).toContain('\t+1+1');
  });

  it('REGRESSION: - prefixed cells get tab prefix', () => {
    const csv = exportReceiptsCsv([makeFormulaRecord('-1+SUM(A1)')]);
    expect(csv).toContain('\t-1+SUM(A1)');
  });

  it('REGRESSION: @ prefixed cells get tab prefix', () => {
    const csv = exportReceiptsCsv([makeFormulaRecord('@SUM(A1)')]);
    expect(csv).toContain('\t@SUM(A1)');
  });

  it('REGRESSION: amountNative integer string is NOT tab-prefixed', () => {
    // Bug: if csvCell were used for amountNative, a value like '2e+17' or a tab-prefixed
    // string would corrupt the numeric export. Fix: csvNumericCell emits pure digits verbatim.
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const csv = exportReceiptsCsv([r]);
    // Must contain the exact integer string
    expect(csv).toContain('200000000000000000');
    // Must NOT contain a tab before the integer
    expect(csv).not.toContain('\t200000000000000000');
    // Must NOT contain exponential notation
    expect(csv).not.toContain('2e+17');
    expect(csv).not.toContain('2E+17');
  });

  it('paidAt integer string is NOT tab-prefixed', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, 1729382400n, 1000n,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const csv = exportReceiptsCsv([r]);
    expect(csv).toContain('1729382400');
    expect(csv).not.toContain('\t1729382400');
  });

  it('paidBlockNumber integer string is NOT tab-prefixed', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, 1729382400n, 1000n,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const csv = exportReceiptsCsv([r]);
    expect(csv).toContain('1000');
    expect(csv).not.toContain('\t1000');
  });

  it('large integer in amountNative stays as exact string (no exponential notation)', () => {
    const r = buildReceiptExport(DEP, '0xabc', null,
      200_000_000_000_000_000n, null, null, null, null,
      { ...RESULT_OK, paymentLogIndex: null, blockHash: null }, false);
    const csv = exportReceiptsCsv([r]);
    expect(csv).toContain('200000000000000000');
    expect(csv).not.toContain('2e+17');
  });
});

describe('T24 — deduplicateReceipts', () => {
  it('removes exact duplicates (same chain/deployment/tx/logIndex)', () => {
    const r: ReceiptExportRecord = {
      chainId: CHAIN_ID, deploymentId: 'dep', contract: CONTRACT,
      invoiceId: '0xabc', transactionHash: '0xdeadbeef', paymentLogIndex: 0,
      amountNative: '200000000000000000', amountDisplay: '0.20',
      payer: null, merchant: null, paidAt: null, paidBlockNumber: null,
      blockHash: null, verificationStatus: 'VERIFIED', mode: 'testnet',
    };
    const deduped = deduplicateReceipts([r, r]);
    expect(deduped).toHaveLength(1);
  });
  it('preserves records with different logIndex', () => {
    const base: ReceiptExportRecord = {
      chainId: CHAIN_ID, deploymentId: 'dep', contract: CONTRACT,
      invoiceId: '0xabc', transactionHash: '0xdeadbeef', paymentLogIndex: 0,
      amountNative: '200000000000000000', amountDisplay: '0.20',
      payer: null, merchant: null, paidAt: null, paidBlockNumber: null,
      blockHash: null, verificationStatus: 'VERIFIED', mode: 'testnet',
    };
    const r2 = { ...base, paymentLogIndex: 1 };
    expect(deduplicateReceipts([base, r2])).toHaveLength(2);
  });
  it('preserves records from different deployments', () => {
    const r1: ReceiptExportRecord = {
      chainId: CHAIN_ID, deploymentId: 'dep-1', contract: CONTRACT,
      invoiceId: '0xabc', transactionHash: '0xdeadbeef', paymentLogIndex: 0,
      amountNative: '200000000000000000', amountDisplay: '0.20',
      payer: null, merchant: null, paidAt: null, paidBlockNumber: null,
      blockHash: null, verificationStatus: 'VERIFIED', mode: 'testnet',
    };
    const r2 = { ...r1, deploymentId: 'dep-2' };
    expect(deduplicateReceipts([r1, r2])).toHaveLength(2);
  });
  it('later entry wins on duplicate key', () => {
    const r1: ReceiptExportRecord = {
      chainId: CHAIN_ID, deploymentId: 'dep', contract: CONTRACT,
      invoiceId: '0xabc', transactionHash: '0xdeadbeef', paymentLogIndex: 0,
      amountNative: '200000000000000000', amountDisplay: '0.20',
      payer: null, merchant: null, paidAt: null, paidBlockNumber: null,
      blockHash: null, verificationStatus: 'PENDING', mode: 'testnet',
    };
    const r2 = { ...r1, verificationStatus: 'VERIFIED' };
    const result = deduplicateReceipts([r1, r2]);
    expect(result[0].verificationStatus).toBe('VERIFIED');
  });
});
