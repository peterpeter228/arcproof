import { describe, it, expect } from 'vitest';
import { deriveInvoiceId, deriveInvoiceIds } from '../invoiceId';
import { buildReceiptExport, exportReceiptsCsv, exportReceiptsJson } from '../exportUtils';
import { preparePayment, validatePaymentContext, isPrepareError } from '../preparedPayment';
const contract = '0x3333333333333333333333333333333333333333';
const merchant = '0x7777777777777777777777777777777777777777';
const deployment = { chainId: 5042002, deploymentId: 'local-fixture', contractAddress: contract, runtimeCodeHash: '0x', label: 'Fixture', deployedAt: null } as const;
const invoice = { invoiceId: ('0x' + '2'.repeat(64)) as `0x${string}`, merchant, amountNative: 200000000000000000n, expiresAt: 2000n, termsHash: ('0x' + '0'.repeat(64)) as `0x${string}`, paid: false } as const;
const result = { status: 'PENDING', message: 'No chain data', paymentLogIndex: null, blockHash: null, verifiedAt: 0, verified: false } as const;
describe('Native targeted regressions', () => {
 it('keeps pagination exact above Number safe integer range', () => {
  const next = 9007199254740993n;
  const rows = deriveInvoiceIds(5042002, contract, merchant, next, 2, 1);
  expect(rows.map(r => r.nonce)).toEqual([next - 3n, next - 4n]);
  expect(rows[0].invoiceId).toBe(deriveInvoiceId(5042002, contract, merchant, next - 3n));
 });
 it.each(['\r=1+1', '\n=1+1', '\t=1+1', '  =1+1', '\u0000=1+1'])('neutralizes control or whitespace-prefixed CSV formulas %j', value => {
  const record = buildReceiptExport({...deployment, deploymentId: value}, invoice.invoiceId, null, null, null, null, null, null, result, false);
  const csv = exportReceiptsCsv([record]);
  expect(csv).toContain('\t' + value);
  if (/[\r\n]/.test(value)) expect(csv).toContain('"\t' + value + '"');
 });
 it('unknown amount exports null rather than fabricated zero', () => {
  const record = buildReceiptExport(deployment, invoice.invoiceId, null, null, null, null, null, null, result, false);
  expect((JSON.parse(exportReceiptsJson([record])) as Record<string, unknown>[])[0]).toMatchObject({ amountNative: null, amountDisplay: null, importedVerified: false });
 });
 it('rejects fresh nonzero terms and changed recipient before confirmation', () => {
  const prepared = preparePayment(deployment, merchant, invoice, 1, 1000);
  if (isPrepareError(prepared)) throw Error(prepared.message);
  const validate = (fresh: typeof invoice) => validatePaymentContext(prepared, 5042002, merchant, 1, deployment.deploymentId, contract, fresh, 1000);
  expect(validate({...invoice, termsHash: ('0x' + '1'.repeat(64)) as `0x${string}`})).toContain('UNSUPPORTED_TERMS');
  expect(validate({...invoice, merchant: contract} as unknown as typeof invoice)).not.toBeNull();
 });
});
