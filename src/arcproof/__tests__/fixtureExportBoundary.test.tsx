import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Hex } from 'viem';
import { buildReceiptExport, exportReceiptsJson, exportReceiptsCsv, type ReceiptExportRecord } from '../exportUtils';
import { FIXTURE_MANIFEST, type DeploymentRecord } from '../manifest';
import { TESTNET_DEPLOYMENT } from '../testnet';
import { verifyReceipt, type VerificationResult } from '../receiptVerifier';
import { observedPaymentFixture } from './fixtures/observedPayment';
import { HomeScreen } from '../../components/arcproof/HomeScreen';

// Synthetic adversarial inputs, not live settlement or deployment evidence.
const id: Hex = `0x${'a'.repeat(64)}`;
const tx: Hex = `0x${'b'.repeat(64)}`;
const evidence: NonNullable<VerificationResult['settlementEvidence']> = {
  policyId: 'synthetic-only', nativeEmitter: `0x${'c'.repeat(40)}`,
  decimals: 18, payerToContractLogIndex: 0, contractToMerchantLogIndex: 1,
  finalizedBlockNumber: '10', finalizedBlockHash: `0x${'d'.repeat(64)}`, controlled_demo: true,
};
const success: VerificationResult = {
  status: 'VERIFIED', verified: true, message: 'Synthetic caller success', paymentLogIndex: 2,
  blockHash: `0x${'e'.repeat(64)}`, verifiedAt: 1, settlementEvidence: evidence,
};
const unknown: DeploymentRecord = { ...TESTNET_DEPLOYMENT, contractAddress: `0x${'9'.repeat(40)}` };
const mainnetClaim: DeploymentRecord = { ...TESTNET_DEPLOYMENT, chainId: 5042 };
function record(deployment: DeploymentRecord, isFixture: boolean, result = success) {
  return buildReceiptExport(deployment, id, tx, 200000000000000000n, null, null, 1n, 10n, result, isFixture);
}
function boundResult(deployment: DeploymentRecord): VerificationResult {
  return { ...success, reasonCode: 'VERIFIED', checks: [], readStartedAt: 1, readCompletedAt: 2,
    source: { kind: 'rpc', label: 'Synthetic test provider, not live RPC' }, observedReceipt: null, observedInvoice: null,
    observationScope: { chainId: deployment.chainId, deploymentId: deployment.deploymentId,
      contract: deployment.contractAddress, invoiceId: id, transactionHash: tx } };
}

/** Parse the actual CSV serialization, including quoted diagnostics/messages. */
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n')) {
      row.push(value); value = '';
      if (character === '\n') { rows.push(row); row = []; }
    } else value += character;
  }
  row.push(value); rows.push(row);
  return rows;
}
function expectSynthetic(r: ReceiptExportRecord, mode: ReceiptExportRecord['mode']) {
  expect(r).toMatchObject({ mode, verificationVerified: false, verificationStatus: 'SIMULATED_NOT_VERIFIED',
    reasonCode: 'SIMULATED_NOT_VERIFIED', verifiedEvidence: null });
  expect(r.settlementEvidence).toBeUndefined();
  expect(r.verifiedAt).toBeUndefined();
  expect(r.message).toContain('not live payment proof');
  const json = (JSON.parse(exportReceiptsJson([r])) as ReceiptExportRecord[])[0];
  expect(json).toMatchObject({ mode, verificationVerified: false, verificationStatus: 'SIMULATED_NOT_VERIFIED',
    reasonCode: 'SIMULATED_NOT_VERIFIED', verifiedEvidence: null });
  expect(json).not.toHaveProperty('settlementEvidence');
  expect(json).not.toHaveProperty('verifiedAt');
  const [headers, values] = csvRows(exportReceiptsCsv([r]));
  expect(values).toHaveLength(headers.length);
  const cells = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  expect(cells).toMatchObject({ mode, verificationVerified: 'false', verificationStatus: 'SIMULATED_NOT_VERIFIED',
    reasonCode: 'SIMULATED_NOT_VERIFIED', verifiedAt: '', settlementPolicy: '', nativeEmitter: '', nativeDecimals: '',
    payerToContractLogIndex: '', contractToMerchantLogIndex: '', finalizedBlockNumber: '', finalizedBlockHash: '' });
}

describe('Fixture provenance cannot be exported as real verified payment proof', () => {
  it('downgrades legacy caller success for an explicitly registered fixture', () => {
    expectSynthetic(record(FIXTURE_MANIFEST[0], true), 'fixture');
  });
  it('downgrades a registered fixture even when it has identity-bound diagnostic fields', () => {
    expectSynthetic(record(FIXTURE_MANIFEST[0], true, boundResult(FIXTURE_MANIFEST[0])), 'fixture');
  });
  it('cannot promote a registered fixture by passing isFixture=false', () => {
    expectSynthetic(record(FIXTURE_MANIFEST[0], false), 'unknown');
  });
  it('cannot promote a real testnet deployment identity when the caller declares synthetic data', () => {
    expectSynthetic(record(TESTNET_DEPLOYMENT, true, boundResult(TESTNET_DEPLOYMENT)), 'unknown');
  });
  it('cannot bless an unknown deployment using the synthetic flag', () => {
    expectSynthetic(record(unknown, true), 'unknown');
  });
  it('cannot label a synthetic mainnet claim as mainnet proof', () => {
    expectSynthetic(record(mainnetClaim, true, boundResult(mainnetClaim)), 'unknown');
  });
  it('labels non-success fixture results as synthetic rather than live observations', () => {
    expectSynthetic(record(FIXTURE_MANIFEST[0], true, { ...success, status: 'PENDING', verified: false }), 'fixture');
  });
  it('preserves scope-mismatch rejection and exports no observations', () => {
    const result = boundResult(TESTNET_DEPLOYMENT);
    result.observationScope = { ...result.observationScope!, invoiceId: `0x${'f'.repeat(64)}` };
    const r = record(TESTNET_DEPLOYMENT, true, result);
    expect(r).toMatchObject({ mode: 'unknown', verificationStatus: 'PENDING', reasonCode: 'PENDING',
      verificationVerified: false, observedReceipt: null, observedInvoice: null, verifiedEvidence: null });
    expect(r.settlementEvidence).toBeUndefined(); expect(r.verifiedAt).toBeUndefined();
  });
  it('retains unknown-deployment rejection without a synthetic flag', () => {
    const r = record(unknown, false);
    expect(r).toMatchObject({ mode: 'unknown', verificationVerified: false, verificationStatus: 'UNKNOWN_DEPLOYMENT', verifiedEvidence: null });
    expect(r.settlementEvidence).toBeUndefined();
  });
  it('preserves trusted identity-bound verification in the non-fixture path (mocked RPC control only)', async () => {
    const f = observedPaymentFixture();
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    const r = buildReceiptExport(f.deployment, f.invoiceId, f.txHash, f.amount, f.payer, f.payer,
      f.block.timestamp, f.block.number, result, false);
    expect(result.verified).toBe(true);
    expect(r).toMatchObject({ mode: 'testnet', verificationVerified: true, verificationStatus: 'VERIFIED',
      verifiedEvidence: result.settlementEvidence, settlementEvidence: result.settlementEvidence, verifiedAt: result.verifiedAt });
  });
});

describe('Home page accurately describes the contract balance invariant', () => {
  it('distinguishes invoice principal from locked pre-existing or forced balances', () => {
    const html = renderToStaticMarkup(<HomeScreen />);
    expect(html).not.toContain('keeps no balance');
    expect(html).toContain('without retaining it');
    expect(html).toContain('Any pre-existing or forcibly sent balance remains locked and cannot be recovered.');
  });
});
