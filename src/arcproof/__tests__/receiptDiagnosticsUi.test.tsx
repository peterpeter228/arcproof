// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { formatUnits, type Hex } from 'viem';
import { ReceiptFacts } from '../../components/arcproof/ReceiptFacts';
import { buildReceiptExport, exportReceiptsJson, RECEIPT_CSV_IMPORT_NOTICE, type ReceiptExportRecord } from '../exportUtils';
import { TESTNET_DEPLOYMENT } from '../testnet';
import type { VerificationResult } from '../receiptVerifier';
const id: Hex = `0x${'a'.repeat(64)}`, hash: Hex = `0x${'b'.repeat(64)}`;
const merchant: Hex = '0x7777777777777777777777777777777777777777', payer: Hex = '0x8888888888888888888888888888888888888888';
function diagnostic(status: 'INVALID_NATIVE_TRANSFER' | 'UNVERIFIED_FINALITY' | 'PENDING' | 'WRONG_CHAIN' = 'UNVERIFIED_FINALITY'): VerificationResult {
  return {
    status, verified: false, message: 'Finalized header unavailable; payment not verified.', reasonCode: status,
    paymentLogIndex: null, blockHash: null, verifiedAt: 1792500001000, readStartedAt: 1792500000000, readCompletedAt: 1792500001000,
    source: { kind: 'rpc', label: 'Injected offline fixture RPC' },
    observationScope: { chainId: TESTNET_DEPLOYMENT.chainId, deploymentId: TESTNET_DEPLOYMENT.deploymentId, contract: TESTNET_DEPLOYMENT.contractAddress, invoiceId: id, transactionHash: hash },
    checks: [{ id: 'standard_identity', status: 'passed', reasonCode: null, message: 'Identity-bound receipt fields agree.' },
      { id: 'finality', status: 'unavailable', reasonCode: status, message: 'No matching finalized header.' }],
    observedReceipt: { transactionHash: hash, from: payer, to: TESTNET_DEPLOYMENT.contractAddress, status: 'success', transactionIndex: 0,
      blockNumber: '9007199254740993', blockHash: hash, blockTimestamp: '1792500000', paymentLogIndex: 2,
      gasUsed: '21000', effectiveGasPrice: '123456789', gasFeeNative: '2592592569000' },
    observedInvoice: { amountNative: '200000000000000000', payer, merchant, paidAt: '1792500000', paidBlockNumber: '9007199254740993' },
  };
}
function recordFor(result: VerificationResult) {
  return buildReceiptExport(TESTNET_DEPLOYMENT, id, hash, 1n, merchant, payer, 1n, 1n, result, false);
}
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div'); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); });
function render(record: ReceiptExportRecord) { act(() => root.render(<ReceiptFacts record={record} />)); }
function field(name: string) { return host.querySelector(`[data-receipt-field="${name}"]`)?.textContent; }
it.each(['INVALID_NATIVE_TRANSFER', 'UNVERIFIED_FINALITY', 'PENDING'] as const)('renders %s observations exactly as JSON without claiming settlement', status => {
  const record = recordFor(diagnostic(status));
  const [exported] = JSON.parse(exportReceiptsJson([record])) as ReceiptExportRecord[];
  render(record);
  expect(field('amountDisplay')).toBe(`${exported.amountDisplay} test USDC`);
  expect(field('merchant')).toBe(exported.merchant); expect(field('payer')).toBe(exported.payer);
  expect(field('gasFeeNative')).toBe(`${formatUnits(BigInt(exported.gasFeeNative!), 18)} test USDC`);
  expect(field('observedBlockNumber')).toBe(exported.observedReceipt?.blockNumber); expect(field('observedBlockHash')).toBe(exported.observedReceipt?.blockHash);
  expect(field('reasonCode')).toBe(exported.reasonCode); expect(field('message')).toBe(exported.message);
  expect(field('source')).toBe(exported.source?.label); expect(field('readStartedAt')).toBe(new Date(exported.readStartedAt!).toISOString());
  expect(field('readCompletedAt')).toBe(new Date(exported.readCompletedAt!).toISOString());
  expect(field('observedBlockNumber')).toBe('9007199254740993');
  expect(host.textContent).toContain('not settlement or finality proof'); expect(host.textContent).toContain('not settlement proof');
  expect(host.textContent).toContain('Finality: Not established'); expect(host.textContent).toContain('finality: unavailable');
  expect(host.querySelector('[class*="text-teal"]')).toBeNull(); expect(exported.verificationVerified).toBe(false);
});
it('keeps wrong-chain early failure observations unknown rather than using caller amounts', () => {
  const result = { ...diagnostic('WRONG_CHAIN'), observedReceipt: null, observedInvoice: null };
  render(recordFor(result));
  expect(field('amountDisplay')).toBe('Unknown amount'); expect(field('merchant')).toBe('Unknown');
  expect(field('observedBlockNumber')).toBe('Unknown'); expect(field('gasFeeNative')).toContain('Unknown');
  expect(host.textContent).not.toContain('1970-01-01'); expect(field('reasonCode')).toBe('WRONG_CHAIN');
});
it('shows the canonical CSV text-import warning and truthful untested spreadsheet status', () => {
  render(recordFor(diagnostic()));
  expect(field('csvImportNotice')).toBe(RECEIPT_CSV_IMPORT_NOTICE);
  expect(field('csvImportNotice')).toContain('import all columns as Text');
  expect(field('csvImportNotice')).toContain('NOT_RUN');
});
it('renders absent and invalid read times as Unknown rather than inventing dates', () => {
  render({ ...recordFor(diagnostic()), readStartedAt: null, readCompletedAt: Number.NaN, source: null });
  expect(field('readStartedAt')).toBe('Unknown'); expect(field('readCompletedAt')).toBe('Unknown'); expect(field('source')).toBe('Unknown');
});
it('does not promote legacy caller-supplied schema 1.2 values to RPC observations', () => {
  const legacy: VerificationResult = {
    status: 'PENDING', verified: false, message: 'Legacy result without identity-bound observations.',
    paymentLogIndex: null, blockHash: hash, verifiedAt: 1792500001000,
    blockNumber: '9007199254740993', gasFeeNative: '2592592569000',
  };
  const record = buildReceiptExport(TESTNET_DEPLOYMENT, id, hash, 200000000000000000n, payer, merchant, 1792500000n, 9007199254740993n, legacy, false);
  expect(record.schemaVersion).toBe('1.2'); expect(record.factsBasis).toBe('legacy_caller_supplied');
  const [exported] = JSON.parse(exportReceiptsJson([record])) as ReceiptExportRecord[];
  render(record);
  expect(host.textContent).toContain('Legacy caller-supplied invoice amount');
  expect(host.textContent).toContain('Legacy caller-supplied transaction fee');
  expect(host.textContent).toContain('not identity-bound RPC observations');
  expect(host.textContent).not.toContain('Observed invoice amount');
  expect(host.textContent).not.toContain('Observed transaction fee');
  expect(host.textContent).not.toContain('Observed block hash');
  expect(field('amountDisplay')).toBe(`${exported.amountDisplay} test USDC`);
  expect(field('gasFeeNative')).toBe(`${formatUnits(BigInt(exported.gasFeeNative!), 18)} test USDC`);
  expect(host.querySelector('[class*="text-teal"]')).toBeNull();
});
it('uses neutral provenance labels when a schema 1.2 observation basis is unavailable', () => {
  const record = recordFor({ ...diagnostic('WRONG_CHAIN'), observedReceipt: null, observedInvoice: null });
  expect(record.factsBasis).toBe('unavailable'); render(record);
  expect(host.textContent).toContain('Provenance unavailable');
  expect(host.textContent).not.toContain('Observed invoice amount');
  expect(field('amountDisplay')).toBe('Unknown amount'); expect(field('observedBlockNumber')).toBe('Unknown');
});
it('does not invent an RPC observation basis for an older record without provenance', () => {
  const record = { ...recordFor(diagnostic()), schemaVersion: '1.1' as const, factsBasis: undefined };
  render(record);
  expect(host.textContent).toContain('Provenance unavailable');
  expect(host.textContent).toContain('Unattributed transaction fee');
  expect(host.textContent).not.toContain('Observed transaction fee');
  expect(field('amountDisplay')).toBe(`${record.amountDisplay} test USDC`);
});

it('places amount and parties before evidence, next step, and collapsed full diagnostics', () => {
  render(recordFor(diagnostic()));
  const amount = host.querySelector('[data-receipt-field="amountDisplay"]')!;
  const merchant = host.querySelector('[data-receipt-field="merchant"]')!;
  const evidence = host.querySelector('[aria-label="Evidence summary"]')!;
  const next = host.querySelector('[aria-label="Next step"]')!;
  const details = host.querySelector('details.receipt-details')!;
  for (const [before, after] of [[amount, merchant], [merchant, evidence], [evidence, next], [next, details]]) {
    expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(details.hasAttribute('open')).toBe(false);
  expect(details.querySelector('[data-receipt-field="reasonCode"]')?.textContent).toBe('UNVERIFIED_FINALITY');
  expect(next.textContent).toContain('Do not resend');
});
it.each(['unavailable', 'not_run', 'failed'] as const)('preserves %s identity checks without promotion in the summary', status => {
  const record = recordFor(diagnostic());
  record.checks = [{ id: 'receipt_identity', status, reasonCode: null, message: 'Incomplete identity evidence' }];
  render(record);
  expect(host.querySelector('[aria-label="Evidence summary"]')?.textContent).toContain(status.replace(/_/g, ' '));
  expect(host.querySelector('[aria-label="Evidence summary"]')?.textContent).not.toContain('passed');
});

it('names missing identity checks without converting a partial list to passed', () => {
 const record = recordFor(diagnostic());
 record.checks = [{ id: 'receipt_identity', status: 'passed', reasonCode: null, message: null }];
 render(record);
 const summary = host.querySelector('[aria-label="Evidence summary"]')?.textContent;
 expect(summary).toContain('chain: not recorded'); expect(summary).toContain('invoice state: not recorded');
 expect(summary).not.toContain('Invoice and transaction match: Passed');
});
