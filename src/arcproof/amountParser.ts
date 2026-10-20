/**
 * amountParser.ts
 * Pure amount string -> native bigint converter. No floats, no parseFloat.
 * Arc native USDC: 18 decimals. microUSDC = 6 decimals. QUANTUM = 1e12.
 *
 * Rules:
 *  - Accepts decimal strings with 0-6 fractional digits.
 *  - Rejects: empty, negative, scientific notation, >6 fractional digits,
 *             zero, >1 USDC (1e18 native units), leading zeros in integer part.
 *  - Returns native bigint (integer * 1e12) or throws ParseAmountError.
 */

export class ParseAmountError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ParseAmountError';
  }
}

/** Smallest representable unit: 1 microUSDC = 1e12 native units */
export const AMOUNT_QUANTUM = 1_000_000_000_000n; // 1e12
/** Maximum allowed: 1 USDC = 1e18 native units */
export const MAX_INVOICE_AMOUNT = 1_000_000_000_000_000_000n; // 1e18

/**
 * Parse a user-supplied decimal string into native bigint.
 * "0.20" -> 200_000_000_000_000_000n
 * "1"    -> 1_000_000_000_000_000_000n (max)
 */
export function parseInvoiceAmount(input: string): bigint {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new ParseAmountError('EMPTY', 'Amount must not be empty');
  }
  const s = input.trim();

  // Reject scientific notation
  if (/[eE]/.test(s)) {
    throw new ParseAmountError('SCIENTIFIC', 'Scientific notation is not accepted');
  }
  // Reject negative
  if (s.startsWith('-')) {
    throw new ParseAmountError('NEGATIVE', 'Amount must be positive');
  }
  // Reject anything that isn't digits and at most one dot
  if (!/^\d+(\.\d*)?$/.test(s)) {
    throw new ParseAmountError('INVALID_FORMAT', 'Invalid amount format');
  }

  const [intPart, fracPart = ''] = s.split('.');

  // Reject leading zeros in integer part (e.g. "007") except bare "0"
  if (intPart.length > 1 && intPart.startsWith('0')) {
    throw new ParseAmountError('LEADING_ZERO', 'Invalid amount format');
  }

  // Reject >6 fractional digits
  if (fracPart.length > 6) {
    throw new ParseAmountError('EXCESS_PRECISION', 'At most 6 fractional digits allowed');
  }

  // Pad fractional part to 6 digits (microUSDC level)
  const fracPadded = fracPart.padEnd(6, '0');

  // microUSDC = integer part * 1e6 + fracPart as integer
  const microUsdc = BigInt(intPart) * 1_000_000n + BigInt(fracPadded);

  // Convert to native (18-decimal): microUSDC * 1e12
  const native = microUsdc * AMOUNT_QUANTUM;

  if (native === 0n) {
    throw new ParseAmountError('ZERO', 'Amount must be greater than zero');
  }
  if (native > MAX_INVOICE_AMOUNT) {
    throw new ParseAmountError('TOO_LARGE', 'Amount must not exceed 1 USDC');
  }

  return native;
}

/**
 * Format a native bigint back to a human-readable decimal string.
 * 200_000_000_000_000_000n -> "0.200000" (always 6 fractional digits)
 */
export function formatInvoiceAmount(native: bigint): string {
  const micro = native / AMOUNT_QUANTUM;
  const intPart = micro / 1_000_000n;
  const fracPart = micro % 1_000_000n;
  return `${intPart}.${fracPart.toString().padStart(6, '0')}`;
}

/**
 * Format for display: trim trailing zeros, e.g. "0.200000" -> "0.20"
 */
export function formatAmountDisplay(native: bigint): string {
  const full = formatInvoiceAmount(native);
  const [i, f] = full.split('.');
  const trimmed = f === '000000' ? '0' : f.replace(/0+$/, '').padEnd(2, '0');
  return `${i}.${trimmed}`;
}
