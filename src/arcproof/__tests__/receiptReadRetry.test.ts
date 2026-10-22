import { describe, expect, it, vi } from 'vitest';
import { observedPaymentFixture } from './fixtures/observedPayment';
import { verifyReceipt } from '../receiptVerifier';

describe('bounded finality rereads preserve strict receipt validation', () => {
  it('recovers temporary finalized-header absence', async () => {
    const f = observedPaymentFixture();
    const get = f.rpc.getFinalizedBlock!.bind(f.rpc);
    const readFinalized = vi.fn().mockResolvedValueOnce(null).mockImplementation(get);
    f.rpc.getFinalizedBlock = readFinalized;
    const r = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, f.rpc, { delayMs: 0 });
    expect(r.status).toBe('VERIFIED');
    expect(readFinalized).toHaveBeenCalledTimes(2);
  });
  it('does not retry contradictory finality to fish for a passing result', async () => {
    const f = observedPaymentFixture();
    const original = await f.rpc.getFinalizedBlock!();
    const readFinalized = vi.fn().mockResolvedValueOnce({ ...original, hash: `0x${'ab'.repeat(32)}` }).mockResolvedValue(original);
    f.rpc.getFinalizedBlock = readFinalized;
    expect((await verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, f.rpc, { delayMs: 0 })).status).toBe('UNVERIFIED_FINALITY');
    expect(readFinalized).toHaveBeenCalledTimes(1);
  });
  it('persistent missing finality remains unverified', async () => {
    const f = observedPaymentFixture();
    const readFinalized = vi.fn().mockResolvedValue(null);
    f.rpc.getFinalizedBlock = readFinalized;
    expect((await verifyReceipt(f.txHash, f.invoiceId, f.deployment, 5042002, f.rpc, { delayMs: 0 })).status).toBe('UNVERIFIED_FINALITY');
    expect(readFinalized).toHaveBeenCalledTimes(3);
  });
});
