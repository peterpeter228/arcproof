/**
 * T18 — Amount parser: exact boundaries and invalid string rejection.
 * No floats, no parseFloat anywhere in this module.
 */
import { describe, it, expect } from 'vitest';
import {
  parseInvoiceAmount,
  formatInvoiceAmount,
  formatAmountDisplay,
  ParseAmountError,
  AMOUNT_QUANTUM,
  MAX_INVOICE_AMOUNT,
} from '../amountParser';

describe('T18 — parseInvoiceAmount', () => {
  // Valid cases
  it('parses 0.20 -> 200_000_000_000_000_000n', () => {
    expect(parseInvoiceAmount('0.20')).toBe(200_000_000_000_000_000n);
  });
  it('parses 1 (max) -> 1e18', () => {
    expect(parseInvoiceAmount('1')).toBe(1_000_000_000_000_000_000n);
  });
  it('parses 1.000000 (max with trailing zeros)', () => {
    expect(parseInvoiceAmount('1.000000')).toBe(1_000_000_000_000_000_000n);
  });
  it('parses 0.000001 (min = 1 microUSDC)', () => {
    expect(parseInvoiceAmount('0.000001')).toBe(AMOUNT_QUANTUM);
    expect(parseInvoiceAmount('0.000001')).toBe(1_000_000_000_000n);
  });
  it('parses 0.500000', () => {
    expect(parseInvoiceAmount('0.500000')).toBe(500_000_000_000_000_000n);
  });
  it('parses integer string "1" without decimal', () => {
    expect(parseInvoiceAmount('1')).toBe(MAX_INVOICE_AMOUNT);
  });
  it('parses "0.1" correctly', () => {
    expect(parseInvoiceAmount('0.1')).toBe(100_000_000_000_000_000n);
  });
  it('parses "0.010000"', () => {
    expect(parseInvoiceAmount('0.010000')).toBe(10_000_000_000_000_000n);
  });

  // Zero / below minimum
  it('rejects "0" -> ZERO', () => {
    const err = (() => { try { parseInvoiceAmount('0'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('ZERO');
  });
  it('rejects "0.000000" -> ZERO', () => {
    const err = (() => { try { parseInvoiceAmount('0.000000'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('ZERO');
  });

  // Over maximum
  it('rejects "1.000001" (over 1 USDC) -> TOO_LARGE', () => {
    const err = (() => { try { parseInvoiceAmount('1.000001'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('TOO_LARGE');
  });
  it('rejects "2" -> TOO_LARGE', () => {
    const err = (() => { try { parseInvoiceAmount('2'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('TOO_LARGE');
  });

  // Excess precision
  it('rejects "0.0000001" (7 fractional digits) -> EXCESS_PRECISION', () => {
    const err = (() => { try { parseInvoiceAmount('0.0000001'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('EXCESS_PRECISION');
  });
  it('rejects "0.1234567" (7 fractional digits)', () => {
    const err = (() => { try { parseInvoiceAmount('0.1234567'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('EXCESS_PRECISION');
  });

  // Scientific notation
  it('rejects "1e6" -> SCIENTIFIC', () => {
    const err = (() => { try { parseInvoiceAmount('1e6'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('SCIENTIFIC');
  });
  it('rejects "1E-6" -> SCIENTIFIC', () => {
    const err = (() => { try { parseInvoiceAmount('1E-6'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('SCIENTIFIC');
  });

  // Negative
  it('rejects "-0.5" -> NEGATIVE', () => {
    const err = (() => { try { parseInvoiceAmount('-0.5'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('NEGATIVE');
  });

  // Empty / whitespace
  it('rejects empty string -> EMPTY', () => {
    const err = (() => { try { parseInvoiceAmount(''); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('EMPTY');
  });
  it('rejects "   " (whitespace) -> EMPTY', () => {
    const err = (() => { try { parseInvoiceAmount('   '); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('EMPTY');
  });

  // Invalid format
  it('rejects "abc" -> INVALID_FORMAT', () => {
    const err = (() => { try { parseInvoiceAmount('abc'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('INVALID_FORMAT');
  });
  it('rejects "0x1a" -> INVALID_FORMAT', () => {
    const err = (() => { try { parseInvoiceAmount('0x1a'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('INVALID_FORMAT');
  });
  it('rejects "1,000" (comma) -> INVALID_FORMAT', () => {
    const err = (() => { try { parseInvoiceAmount('1,000'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
  });

  // Leading zeros in integer part
  it('rejects "007" -> LEADING_ZERO', () => {
    const err = (() => { try { parseInvoiceAmount('007'); } catch(e) { return e; } })();
    expect(err).toBeInstanceOf(ParseAmountError);
    expect((err as ParseAmountError).code).toBe('LEADING_ZERO');
  });
  it('accepts "0.5" (leading zero OK when integer part is exactly "0")', () => {
    expect(parseInvoiceAmount('0.5')).toBe(500_000_000_000_000_000n);
  });
});

describe('T18 — formatInvoiceAmount', () => {
  it('200_000_000_000_000_000n -> "0.200000"', () => {
    expect(formatInvoiceAmount(200_000_000_000_000_000n)).toBe('0.200000');
  });
  it('1_000_000_000_000n -> "0.000001"', () => {
    expect(formatInvoiceAmount(1_000_000_000_000n)).toBe('0.000001');
  });
  it('1e18n -> "1.000000"', () => {
    expect(formatInvoiceAmount(1_000_000_000_000_000_000n)).toBe('1.000000');
  });
});

describe('T18 — formatAmountDisplay', () => {
  it('trims trailing zeros: 200e15n -> "0.20"', () => {
    expect(formatAmountDisplay(200_000_000_000_000_000n)).toBe('0.20');
  });
  it('minimum displays as "0.000001"', () => {
    expect(formatAmountDisplay(1_000_000_000_000n)).toBe('0.000001');
  });
  it('whole USDC displays as "1.0"', () => {
    expect(formatAmountDisplay(1_000_000_000_000_000_000n)).toBe('1.0');
  });
});
