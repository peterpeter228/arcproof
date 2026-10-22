import { describe, expect, it } from 'vitest';
import { receiptCurrencyLabel } from '../receiptCurrency';

describe('receipt currency wording follows the record chain, never a caller mode alone', () => {
  it('labels Arc Testnet and offline fixture records as test USDC', () => {
    expect(receiptCurrencyLabel({ chainId: 5042002, mode: 'testnet' })).toBe('test USDC');
    expect(receiptCurrencyLabel({ chainId: 5042002, mode: 'fixture' })).toBe('test USDC');
    expect(receiptCurrencyLabel({ chainId: 5042002, mode: 'mainnet' })).toBe('test USDC');
  });
  it('uses plain USDC only for a classified mainnet record on Arc Mainnet', () => {
    expect(receiptCurrencyLabel({ chainId: 5042, mode: 'mainnet' })).toBe('USDC');
    expect(receiptCurrencyLabel({ chainId: 5042, mode: 'unknown' })).toBe('USDC (untrusted deployment)');
  });
  it('flags any other chain instead of borrowing a known label', () => {
    expect(receiptCurrencyLabel({ chainId: 1, mode: 'mainnet' })).toBe('USDC (unrecognized network)');
  });
});
