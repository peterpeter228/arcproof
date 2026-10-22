import { describe, expect, it } from 'vitest';
import { verifyReceipt } from '../receiptVerifier';
import { observedPaymentFixture } from './fixtures/observedPayment';

// Reconstructed RPC fixtures only; these are not live-chain acceptance evidence.
describe('Independent Argon verifier-bound triage', () => {
  it('rejects direct-provider expiry beyond the supported date bound', async () => {
    const f = observedPaymentFixture();
    f.invoice.expiresAt = 8_640_000_000_001n;
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    expect(result.status).toBe('WRONG_EVENT_DATA');
    expect(result.verified).toBe(false);
  });
  it('already rejects a paidAt inconsistent with the payment block timestamp', async () => {
    const f = observedPaymentFixture();
    f.invoice.paidAt = f.block.timestamp + 1n;
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    expect(result.status).toBe('TIMESTAMP_MISMATCH');
    expect(result.verified).toBe(false);
  });
  it('retains the reconstructed valid direct-provider control', async () => {
    const f = observedPaymentFixture();
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    expect(result.status).toBe('VERIFIED');
    expect(result.verified).toBe(true);
  });
});
