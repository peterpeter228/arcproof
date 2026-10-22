import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReceiptFacts } from '../../components/arcproof/ReceiptFacts';
import { DemoReceipt } from '../../components/arcproof/DemoReceipt';
import { buildReceiptExport } from '../exportUtils';
import { TESTNET_DEPLOYMENT } from '../testnet';
import type { VerificationResult } from '../receiptVerifier';
const ids = ['chain', 'runtime_code', 'receipt_identity', 'transaction_identity', 'payment_event', 'invoice_state', 'event_and_value', 'payment_block', 'settlement_policy', 'provenance', 'native_transfers', 'finality'];
const hash = `0x${'a'.repeat(64)}` as const;
function html(status: 'passed' | 'unavailable', incomplete = false) {
  const result: VerificationResult = { status: 'UNVERIFIED_FINALITY', verified: false, verifiedAt: 0, message: 'Not verified', blockHash: null, paymentLogIndex: null,
    checks: ids.filter(id => !incomplete || id !== 'runtime_code').map(id => ({ id, status: id === 'finality' ? status : 'passed', reasonCode: null, message: null })) };
  return renderToStaticMarkup(<ReceiptFacts record={buildReceiptExport(TESTNET_DEPLOYMENT, hash, hash, null, null, null, null, null, result, false)} />);
}
describe('five visible fact groups are diagnostic-derived, never preset green ticks', () => {
  it('shows all five groups outside the single full-details fold', () => {
    const rendered = html('unavailable');
    for (const title of ['Contract code match', 'Invoice paid state', 'Payment event binding', 'Native USDC transfer legs', 'Finality and payment block']) expect(rendered).toContain(title);
    expect((rendered.match(/data-verification-fact=/g) ?? []).length).toBe(5);
    expect(rendered.indexOf('Contract code match')).toBeLessThan(rendered.indexOf('<details'));
    expect(rendered).not.toContain('<details><summary');
  });
  it('does not promote missing or unavailable checks to passed or apply green success styling', () => {
    const rendered = html('unavailable', true);
    expect(rendered).toContain('Not recorded'); expect(rendered).toContain('Unavailable');
    expect(rendered).not.toContain('text-teal');
  });
  it('simulation presents five explicitly not-run checks instead of a verified sample', () => {
    const rendered = renderToStaticMarkup(<DemoReceipt invoiceId={hash} amount={200000000000000000n} onClose={() => {}} />);
    expect(rendered.match(/Not run \(simulation\)/g)).toHaveLength(5);
  });
});
