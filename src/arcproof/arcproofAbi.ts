/**
 * arcproofAbi.ts
 * ABI derived from contracts/out/ArcProofInvoices.sol/ArcProofInvoices.json.
 * Methods: createInvoice, payInvoice, getInvoice, nextNonce,
 *          MAX_INVOICE_AMOUNT, AMOUNT_QUANTUM, MAX_LIFETIME
 * Events:  InvoiceCreated, InvoicePaid
 * Errors:  ALREADY_PAID, AMOUNT_NOT_DIVISIBLE, AMOUNT_TOO_LARGE, BALANCE_MISMATCH,
 *          EXPIRED, EXPIRY_IN_PAST, EXPIRY_TOO_FAR, MERCHANT_CALL_FAILED,
 *          UNKNOWN_INVOICE, WRONG_AMOUNT, ZERO_AMOUNT, ReentrancyGuardReentrantCall
 *
 * NO stale MAX_AMOUNT, receive/fallback, or UNSUPPORTED_TERMS entries.
 */
export const ARCPROOF_ABI = [
  // ---- State-changing functions ----
  {
    type: 'function',
    name: 'createInvoice',
    inputs: [
      { name: 'amountNative', type: 'uint256' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'termsHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'invoiceId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'payInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
  // ---- View functions ----
  {
    type: 'function',
    name: 'getInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'merchant', type: 'address' },
          { name: 'amountNative', type: 'uint256' },
          { name: 'expiresAt', type: 'uint64' },
          { name: 'termsHash', type: 'bytes32' },
          { name: 'paid', type: 'bool' },
          { name: 'payer', type: 'address' },
          { name: 'paidAt', type: 'uint256' },
          { name: 'paidBlockNumber', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextNonce',
    inputs: [{ name: 'merchant', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_INVOICE_AMOUNT',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'AMOUNT_QUANTUM',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_LIFETIME',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
  },
  // ---- Events ----
  {
    type: 'event',
    name: 'InvoiceCreated',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'merchant', type: 'address', indexed: true },
      { name: 'merchantNonce', type: 'uint256', indexed: false },
      { name: 'amountNative', type: 'uint256', indexed: false },
      { name: 'expiresAt', type: 'uint64', indexed: false },
      { name: 'termsHash', type: 'bytes32', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'InvoicePaid',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'merchant', type: 'address', indexed: true },
      { name: 'amountNative', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
  // ---- Custom errors ----
  { type: 'error', name: 'ALREADY_PAID', inputs: [] },
  { type: 'error', name: 'AMOUNT_NOT_DIVISIBLE', inputs: [] },
  { type: 'error', name: 'AMOUNT_TOO_LARGE', inputs: [] },
  { type: 'error', name: 'BALANCE_MISMATCH', inputs: [] },
  { type: 'error', name: 'EXPIRED', inputs: [] },
  { type: 'error', name: 'EXPIRY_IN_PAST', inputs: [] },
  { type: 'error', name: 'EXPIRY_TOO_FAR', inputs: [] },
  { type: 'error', name: 'MERCHANT_CALL_FAILED', inputs: [] },
  { type: 'error', name: 'UNKNOWN_INVOICE', inputs: [] },
  { type: 'error', name: 'WRONG_AMOUNT', inputs: [] },
  { type: 'error', name: 'ZERO_AMOUNT', inputs: [] },
  { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
] as const;

export type ArcProofAbi = typeof ARCPROOF_ABI;
