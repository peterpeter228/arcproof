import { describe, expect, it } from 'vitest';
import type { Hex } from 'viem';
import { observedPaymentFixture } from './fixtures/observedPayment';
import { verifyReceipt, type VerificationResult } from '../receiptVerifier';
import { buildReceiptExport, exportReceiptsJson, exportReceiptsCsv, RECEIPT_CSV_IMPORT_NOTICE, type ReceiptExportRecord } from '../exportUtils';

type Fixture = ReturnType<typeof observedPaymentFixture>;
const otherHash: Hex = `0x${'ab'.repeat(32)}`;
const otherAddress: Hex = `0x${'ab'.repeat(20)}`;
const verify = (f: Fixture) => verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
function exported(f: Fixture, result: VerificationResult) {
  // Deliberately supply unrelated caller state: v1.2 must ignore it entirely.
  return buildReceiptExport(f.deployment, f.invoiceId, f.txHash, 999n, otherAddress, otherAddress, 999n, 999n, result, false);
}
function fixture() {
  const f = observedPaymentFixture();
  f.receipt.gasUsed = 84487n; f.receipt.effectiveGasPrice = 25000000001n;
  f.rpc.sourceLabel = 'Reconstructed fixture, not live RPC';
  return f;
}

describe('EXPORT-01: observed RPC facts are not verified settlement', () => {
  it.each(['null', 'throw', 'missing method', 'conflicting header', 'canonical block changed'])('retains identity-bound observations when finality is %s', async mode => {
    const f = fixture();
    if (mode === 'missing method') delete f.rpc.getFinalizedBlock;
    else if (mode === 'throw') f.rpc.getFinalizedBlock = () => Promise.reject(new Error('synthetic unavailable'));
    else if (mode === 'conflicting header') f.rpc.getFinalizedBlock = () => Promise.resolve({ ...f.block, hash: otherHash });
    else if (mode === 'canonical block changed') {
      let reads = 0;
      f.rpc.getBlock = () => Promise.resolve(++reads === 1 ? f.block : { ...f.block, hash: otherHash });
    } else f.rpc.getFinalizedBlock = () => Promise.resolve(null);
    const result = await verify(f), record = exported(f, result);
    const parsed = (JSON.parse(exportReceiptsJson([record])) as (ReceiptExportRecord & { importedVerified: boolean })[])[0];
    expect(result.status).toBe('UNVERIFIED_FINALITY'); expect(result.verified).toBe(false);
    expect(parsed).toMatchObject({ schemaVersion: '1.2', reasonCode: result.status, message: result.message,
      verificationStatus: 'UNVERIFIED_FINALITY', verificationVerified: false, importedVerified: false,
      factsBasis: 'identity_bound_rpc_observation', verifiedEvidence: null,
      blockNumber: f.block.number.toString(), blockHash: f.block.hash, gasFeeNative: '2112175000084487',
      amountNative: f.amount.toString(), payer: f.payer, merchant: f.payer,
      observedReceipt: { transactionHash: f.txHash, gasUsed: '84487', effectiveGasPrice: '25000000001',
        gasFeeNative: '2112175000084487', status: 'success', blockTimestamp: f.block.timestamp.toString() },
      source: { kind: 'rpc', label: 'Reconstructed fixture, not live RPC' },
    });
    expect(parsed.settlementEvidence).toBeUndefined();
    expect(parsed.checks?.[parsed.checks.length - 1]).toMatchObject({ id: 'finality', status: 'unavailable', reasonCode: 'UNVERIFIED_FINALITY', message: result.message });
    expect(parsed.checks?.slice(0, -1).every((check: {status: string}) => check.status === 'passed')).toBe(true);
    expect(parsed.readCompletedAt).toBeGreaterThanOrEqual(parsed.readStartedAt!);
    expect(BigInt(parsed.observedReceipt!.gasUsed!) * BigInt(parsed.observedReceipt!.effectiveGasPrice!)).toBe(BigInt(parsed.gasFeeNative!));
  });

  it.each([
    ['receipt hash', (f: Fixture) => { f.receipt.transactionHash = otherHash; }],
    ['receipt target', (f: Fixture) => { f.receipt.to = otherAddress; }],
    ['receipt sender', (f: Fixture) => { f.receipt.from = otherAddress; }],
    ['transaction hash', (f: Fixture) => { f.tx.hash = otherHash; }],
    ['transaction target', (f: Fixture) => { f.tx.to = otherAddress; }],
    ['transaction chain', (f: Fixture) => { f.tx.chainId = 1; }],
    ['transaction inclusion', (f: Fixture) => { f.tx.blockHash = otherHash; }],
    ['transaction selector', (f: Fixture) => { f.tx.input = '0xdeadbeef'; }],
    ['transaction value', (f: Fixture) => { f.tx.value++; }],
    ['block identity', (f: Fixture) => { f.rpc.getBlock = () => Promise.resolve({ ...f.block, hash: otherHash }); }],
    ['foreign native log', (f: Fixture) => { f.receipt.logs[0].transactionHash = otherHash; }],
    ['foreign invoice log', (f: Fixture) => { f.receipt.logs[2].transactionHash = otherHash; }],
    ['removed log', (f: Fixture) => { f.receipt.logs[0].removed = true; }],
    ['unknown log provenance', (f: Fixture) => { delete f.receipt.logs[0].blockHash; }],
    ['duplicate log index', (f: Fixture) => { f.receipt.logs[0].logIndex = f.receipt.logs[2].logIndex; }],
  ])('exports no transaction facts on %s failure', async (_label, mutate) => {
    const f = fixture(); mutate(f);
    const result = await verify(f), record = exported(f, result);
    expect(result.verified).toBe(false);
    expect(record).toMatchObject({ verificationVerified: false, observedReceipt: null, observedInvoice: null,
      verifiedEvidence: null, amountNative: null, payer: null, merchant: null, paidAt: null,
      paidBlockNumber: null, paymentLogIndex: null, blockNumber: null, blockHash: null, gasFeeNative: null,
      factsBasis: 'unavailable' });
    expect(record.checks?.some(check => check.status === 'not_run')).toBe(true);
    expect(record.message).toBe(result.message);
    expect(record.reasonCode).toBe(result.status);
  });

  it.each(['gas missing', 'price missing', 'negative gas', 'negative price'])('exports unknown fee as null: %s', async mode => {
    const f = fixture(); f.rpc.getFinalizedBlock = () => Promise.resolve(null);
    if (mode === 'gas missing') delete f.receipt.gasUsed;
    if (mode === 'price missing') delete f.receipt.effectiveGasPrice;
    if (mode === 'negative gas') f.receipt.gasUsed = -1n;
    if (mode === 'negative price') f.receipt.effectiveGasPrice = -1n;
    const record = exported(f, await verify(f));
    expect(record.gasFeeNative).toBeNull(); expect(record.observedReceipt?.gasFeeNative).toBeNull();
    expect(record.observedReceipt?.blockNumber).toBe(f.block.number.toString());
  });

  it('retains exact huge integer fee round trip with no Number coercion', async () => {
    const f = fixture(); f.receipt.gasUsed = (1n << 200n) + 1n;
    f.receipt.effectiveGasPrice = (1n << 55n) + 3n;
    const record = exported(f, await verify(f));
    const parsed = (JSON.parse(exportReceiptsJson([record])) as (ReceiptExportRecord & { importedVerified: boolean })[])[0];
    expect(BigInt(parsed.gasFeeNative!)).toBe(f.receipt.gasUsed * f.receipt.effectiveGasPrice);
    expect(parsed.observedReceipt!.gasFeeNative).toBe(parsed.gasFeeNative);
  });

  it('does not export settlement evidence for invalid native legs, although receipt identity is bound', async () => {
    const f = fixture(); f.receipt.logs[0].data = otherHash;
    const record = exported(f, await verify(f));
    expect(record.verificationStatus).toBe('INVALID_NATIVE_TRANSFER');
    expect(record.observedReceipt?.gasFeeNative).toBe('2112175000084487');
    expect(record.verifiedEvidence).toBeNull(); expect(record.settlementEvidence).toBeUndefined();
    expect(record.checks?.[record.checks.length - 1]?.status).toBe('not_run');
  });

  it('keeps checks and diagnostic reason stable across repeated RPC errors', async () => {
    const f = fixture(); f.rpc.getTransactionReceipt = () => Promise.reject(Error('private transport detail'));
    const a = await verify(f), b = await verify(f);
    expect(a).toMatchObject({ reasonCode: 'PENDING', observedReceipt: null });
    expect(a.checks).toEqual(b.checks); expect(a.message).toBe(b.message);
    expect(exportReceiptsJson([exported(f, a)])).not.toContain('private transport detail');
  });

  it('rejects mixing a valid result into a different export request', async () => {
    const f = fixture(), result = await verify(f);
    for (const patch of [{ tx: otherHash }, { invoice: otherHash }, { deployment: { ...f.deployment, deploymentId: 'other' } },
      { deployment: { ...f.deployment, chainId: 1 } }, { deployment: { ...f.deployment, contractAddress: otherAddress } }]) {
      const record = buildReceiptExport(patch.deployment ?? f.deployment, patch.invoice ?? f.invoiceId, patch.tx ?? f.txHash,
        f.amount, f.payer, f.payer, f.block.timestamp, f.block.number, result, false);
      expect(record).toMatchObject({ verificationStatus: 'PENDING', verificationVerified: false,
        observedReceipt: null, observedInvoice: null, verifiedEvidence: null, amountNative: null, gasFeeNative: null });
    }
  });

  it('only successful verification supplies explicit verifiedEvidence; aliases use same observation', async () => {
    const f = fixture(), result = await verify(f), record = exported(f, result);
    expect(record.verificationVerified).toBe(true);
    expect(record.verifiedEvidence).toEqual(result.settlementEvidence);
    expect(record.gasFeeNative).toBe(record.observedReceipt?.gasFeeNative);
    expect(record.blockHash).toBe(record.observedReceipt?.blockHash);
    expect(record.amountNative).toBe(record.observedInvoice?.amountNative);
    expect(record.checks?.every(check => check.status === 'passed')).toBe(true);
  });

  it('keeps legacy caller inputs explicit without inventing RPC observations', () => {
    const f = fixture();
    const legacy: VerificationResult = { status: 'PENDING', verified: false, message: 'Legacy fixture',
      paymentLogIndex: null, blockHash: null, verifiedAt: 123 };
    const record = exported(f, legacy);
    expect(record).toMatchObject({ schemaVersion: '1.2', factsBasis: 'legacy_caller_supplied', observedReceipt: null,
      observedInvoice: null, verifiedEvidence: null, source: null, readStartedAt: null, readCompletedAt: null,
      amountNative: '999', verificationVerified: false });
  });

  it('still serializes genuine legacy 1.1 records without silently upgrading their basis', () => {
    const f = fixture();
    const legacyResult: VerificationResult = { status: 'PENDING', verified: false, message: 'Legacy', paymentLogIndex: null, blockHash: null, verifiedAt: 123 };
    const legacy = { ...exported(f, legacyResult), schemaVersion: '1.1' as const };
    delete legacy.observedReceipt; delete legacy.observedInvoice; delete legacy.factsBasis;
    const parsed = (JSON.parse(exportReceiptsJson([legacy])) as (ReceiptExportRecord & { importedVerified: boolean })[])[0];
    expect(parsed.schemaVersion).toBe('1.1'); expect(parsed.importedVerified).toBe(false);
    expect(parsed.amountNative).toBe('999'); expect(parsed.observedReceipt).toBeUndefined();
    expect(exportReceiptsCsv([legacy])).toContain('1.1');
  });

  it('CSV preserves bytes and formula escaping without claiming spreadsheet round-trip acceptance', async () => {
    const f = fixture(), record = exported(f, await verify(f));
    const csv = exportReceiptsCsv([{ ...record, message: '=HYPERLINK("evil")' }]);
    expect(csv).toContain('2112175000084487'); expect(csv).toContain('\t=HYPERLINK(');
    expect(csv).not.toContain('="2112175000084487"');
    expect(RECEIPT_CSV_IMPORT_NOTICE).toContain('all columns as Text');
    expect(RECEIPT_CSV_IMPORT_NOTICE).toContain('NOT_RUN');
  });
});
