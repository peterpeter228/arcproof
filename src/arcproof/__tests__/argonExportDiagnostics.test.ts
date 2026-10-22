import { describe, expect, it } from 'vitest';
import { buildReceiptExport, exportReceiptsJson, exportReceiptsCsv, type ReceiptExportRecord } from '../exportUtils';
import { FIXTURE_MANIFEST, type DeploymentRecord } from '../manifest';
import { TESTNET_DEPLOYMENT } from '../testnet';
import { verifyReceipt, type VerificationResult, type VerificationStatus } from '../receiptVerifier';
import { observedPaymentFixture } from './fixtures/observedPayment';

// Adversarial synthetic inputs and mocked RPC only. No live payment evidence.
const id = `0x${'a'.repeat(64)}` as const;
const tx = `0x${'b'.repeat(64)}` as const;
const address = `0x${'1'.repeat(40)}` as const;
const blockHash = `0x${'d'.repeat(64)}` as const;
const unknown: DeploymentRecord = { ...TESTNET_DEPLOYMENT, contractAddress: `0x${'9'.repeat(40)}` };
function resultFor(deployment: DeploymentRecord, status: VerificationStatus = 'VERIFIED'): VerificationResult {
  return {
    status, verified: status === 'VERIFIED', reasonCode: status, message: 'Synthetic diagnostic result',
    paymentLogIndex: 2, blockHash, blockNumber: '55', gasFeeNative: '21000', verifiedAt: 1000,
    checks: [{ id: 'identity', status: 'passed', reasonCode: null, message: null }],
    readStartedAt: 900, readCompletedAt: 1000, source: { kind: 'rpc', label: 'Synthetic diagnostic source' },
    observationScope: { chainId: deployment.chainId, deploymentId: deployment.deploymentId,
      contract: deployment.contractAddress, invoiceId: id, transactionHash: tx },
    observedReceipt: { transactionHash: tx, from: address, to: deployment.contractAddress, status: 'success',
      transactionIndex: 0, blockNumber: '55', blockHash, blockTimestamp: '1700000000', paymentLogIndex: 2,
      gasUsed: '21000', effectiveGasPrice: '1', gasFeeNative: '21000' },
    observedInvoice: { amountNative: '200000000000000000', payer: address, merchant: address,
      paidAt: '1700000000', paidBlockNumber: '55' },
  };
}
function exported(deployment: DeploymentRecord, result = resultFor(deployment), synthetic = false) {
  return buildReceiptExport(deployment, id, tx, 200000000000000000n, address, address, 1700000000n, 55n, result, synthetic);
}
function expectNoFacts(record: ReceiptExportRecord) {
  expect(record).toMatchObject({ verificationVerified: false, verifiedEvidence: null, factsBasis: 'unavailable',
    observedReceipt: null, observedInvoice: null, amountNative: null, amountDisplay: null, payer: null, merchant: null,
    paidAt: null, paidBlockNumber: null, blockNumber: null, blockHash: null, paymentLogIndex: null, gasFeeNative: null,
    source: null, readStartedAt: null, readCompletedAt: null, observationScope: null, controlled_demo: false });
  expect(record.verifiedAt).toBeUndefined();
  expect(record.settlementEvidence).toBeUndefined();
  expect(record.checks?.some(check => check.status === 'passed')).toBe(false);
  const json = (JSON.parse(exportReceiptsJson([record])) as ReceiptExportRecord[])[0];
  expect(json.verifiedAt).toBeUndefined();
  expect(json.amountNative).toBeNull();
  expect(exportReceiptsCsv([record])).not.toContain('Synthetic diagnostic source');
}

describe('Argon ADV01/02: export trust boundaries cover populated diagnostics and legacy inputs', () => {
  it.each<VerificationStatus>(['VERIFIED', 'UNVERIFIED_FINALITY', 'INVOICE_NOT_PAID', 'FAILED', 'PENDING'])('unknown deployment redacts %s', status => {
    const record = exported(unknown, resultFor(unknown, status));
    expect(record.verificationStatus).toBe('UNKNOWN_DEPLOYMENT');
    expect(record.reasonCode).toBe('UNKNOWN_DEPLOYMENT');
    expectNoFacts(record);
  });
  it.each([
    ['registered fixture', FIXTURE_MANIFEST[0], true],
    ['fixture without flag', FIXTURE_MANIFEST[0], false],
    ['trusted identity marked synthetic', TESTNET_DEPLOYMENT, true],
    ['unknown synthetic', unknown, true],
  ] as const)('%s redacts populated diagnostics', (_label, deployment, synthetic) => {
    const record = exported(deployment, resultFor(deployment), synthetic);
    expect(record.verificationStatus).toBe('SIMULATED_NOT_VERIFIED');
    expectNoFacts(record);
  });
  it.each([[unknown, false], [FIXTURE_MANIFEST[0], true], [TESTNET_DEPLOYMENT, true]] as const)('legacy fallback cannot restore blocked payment facts (%j, %s)', (deployment, synthetic) => {
    const result = resultFor(deployment);
    delete result.observationScope; delete result.observedInvoice; delete result.observedReceipt;
    expectNoFacts(exported(deployment, result, synthetic));
  });
  it('scope mismatch takes precedence over untrusted and synthetic status', () => {
    const result = resultFor(unknown);
    result.observationScope!.invoiceId = `0x${'f'.repeat(64)}`;
    for (const synthetic of [true, false]) {
      const record = exported(unknown, result, synthetic);
      expect(record.verificationStatus).toBe('PENDING'); expect(record.reasonCode).toBe('PENDING');
      expectNoFacts(record);
      expect(record.checks?.[0].id).toBe('export_scope');
    }
  });
  it('keeps trusted nonverified observations and diagnostics', () => {
    const result = resultFor(TESTNET_DEPLOYMENT, 'UNVERIFIED_FINALITY');
    const record = exported(TESTNET_DEPLOYMENT, result);
    expect(record).toMatchObject({ verificationStatus: 'UNVERIFIED_FINALITY', verificationVerified: false,
      observedReceipt: result.observedReceipt, observedInvoice: result.observedInvoice, checks: result.checks,
      source: result.source, verifiedAt: result.verifiedAt, factsBasis: 'identity_bound_rpc_observation',
      amountNative: result.observedInvoice!.amountNative });
  });
  it('preserves the trusted full positive verifier path (mocked RPC only)', async () => {
    const f = observedPaymentFixture();
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    const record = buildReceiptExport(f.deployment, f.invoiceId, f.txHash, null, null, null, null, null, result, false);
    expect(result.verified).toBe(true);
    expect(record).toMatchObject({ verificationVerified: true, verificationStatus: 'VERIFIED',
      verifiedEvidence: result.settlementEvidence, settlementEvidence: result.settlementEvidence,
      observedReceipt: result.observedReceipt, observedInvoice: result.observedInvoice });
  });
});

describe('Argon ADV05: malformed diagnostic amounts fail closed without BigInt coercion', () => {
  it.each(['invalid', '0.20', '', ' ', '-1', '0x10', '+1'])('rejects %j rather than throwing or certifying it', amount => {
    const result = resultFor(TESTNET_DEPLOYMENT);
    result.observedInvoice!.amountNative = amount;
    const record = exported(TESTNET_DEPLOYMENT, result);
    expect(record.verificationStatus).toBe('WRONG_EVENT_DATA');
    expect(record.verificationVerified).toBe(false);
    expect(record.amountNative).toBeNull(); expect(record.amountDisplay).toBeNull();
    expect(record.observedInvoice).toBeNull();
    expect(record.verifiedEvidence).toBeNull(); expect(record.settlementEvidence).toBeUndefined();
    expect(record.verifiedAt).toBeUndefined();
  });
});
