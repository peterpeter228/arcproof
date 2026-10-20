/**
 * exportUtils.ts
 * JSON and CSV export for receipts and invoice lists.
 * Rules:
 * - Large integers (amountNative, paidBlockNumber, paidAt) exported as strings.
 * - importedVerified flags from JSON are always ignored; verifier must re-run.
 * - CSV neutralizes formula/control prefixes before quoting.
 * - Receipts deduplicated by chain+deployment+tx+logIndex.
 * - Unknown real values are null in JSON, empty cells in CSV.
 */

import type { VerificationResult } from './receiptVerifier';
import type { DeploymentRecord } from './manifest';
import { formatAmountDisplay } from './amountParser';

export interface ReceiptExportRecord {
  chainId: number;
  deploymentId: string;
  contract: string;
  invoiceId: string;
  transactionHash: string | null;
  paymentLogIndex: number | null;
  /** Native bigint as decimal string */
  amountNative: string | null;
  payer: string | null;
  merchant: string | null;
  /** Unix seconds as decimal string */
  paidAt: string | null;
  /** Block number as decimal string */
  paidBlockNumber: string | null;
  blockHash: string | null;
  verificationStatus: string;
  /** 'fixture' | 'testnet' | 'unknown' */
  mode: 'fixture' | 'testnet' | 'unknown';
  amountDisplay: string | null;
  controlled_demo?: boolean;
}

export interface InvoiceExportRow {
  chainId: number;
  deploymentId: string;
  contract: string;
  invoiceId: string;
  merchant: string;
  amountNative: string | null;
  amountDisplay: string | null;
  expiresAt: string;
  termsHash: string;
  paid: boolean;
  payer: string | null;
  paidAt: string | null;
  paidBlockNumber: string | null;
  title: string | null;
}

/**
 * Pure-integer strings (amountNative, paidAt, paidBlockNumber) must NOT be
 * prefixed — they are numeric data, not text. Use csvNumericCell for those.
 * All other textual cells use csvCell which prefixes dangerous leading chars.
 */

/**
 * Sanitise a textual CSV cell to prevent formula injection.
 * Cells starting with = + - @ | \t are prefixed with \t (tab) so spreadsheet
 * applications treat the content as text, not a formula.
 * The cell is also quoted if it contains commas, newlines, or double-quotes.
 * MUST NOT be used for pure integer/numeric strings — use csvNumericCell.
 */
function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Prefix cells that could be interpreted as formulas.
  // Tab prefix is recognised by Excel, LibreOffice, and Google Sheets as a
  // text-force marker. Quoting alone does not neutralise formula injection in
  // all spreadsheet applications.
  const dangerous = /^[\s\u0000-\u001f]*[=+\-@|]|^[\t\r\n]/.test(s);
  const prefixed = dangerous ? '\t' + s : s;
  if (prefixed.includes(',') || prefixed.includes('\n') || prefixed.includes('\r') || prefixed.includes('"')) {
    return `"${prefixed.replace(/"/g, '""')}"`;
  }
  return prefixed;
}

/**
 * Emit a pure numeric string verbatim — no quoting, no prefixing.
 * Use for amountNative, paidAt, paidBlockNumber: these are integer strings
 * that must not be altered (no tab prefix, no quote wrapping).
 * They always start with a digit or are empty; no formula risk.
 */
function csvNumericCell(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  // Safety: only emit if the value is a pure decimal integer string.
  // A non-numeric value here is a programming error; fall back to csvCell.
  if (/^\d+$/.test(v)) return v;
  return csvCell(v);
}


/** Export a list of receipt records as JSON string. */
export function exportReceiptsJson(records: ReceiptExportRecord[]): string {
  // Never export imported verified: true — always set it to false in export
  const safe = records.map((r) => ({ ...r, importedVerified: false }));
  return JSON.stringify(safe, null, 2);
}

const RECEIPT_CSV_HEADERS = [
  'chainId', 'deploymentId', 'contract', 'invoiceId', 'transactionHash',
  'paymentLogIndex', 'amountNative', 'amountDisplay', 'payer', 'merchant',
  'paidAt', 'paidBlockNumber', 'blockHash', 'verificationStatus', 'mode', 'controlled_demo',
];

/** Export a list of receipt records as CSV string. */
export function exportReceiptsCsv(records: ReceiptExportRecord[]): string {
  const rows = [RECEIPT_CSV_HEADERS.join(',')];
  for (const r of records) {
    // amountNative, paidAt, paidBlockNumber are pure integer strings — use
    // csvNumericCell to preserve them verbatim without tab-prefix or quoting.
    // All other textual fields use csvCell (formula-injection safe).
    rows.push([
      csvCell(r.chainId),
      csvCell(r.deploymentId),
      csvCell(r.contract),
      csvCell(r.invoiceId),
      csvCell(r.transactionHash),
      csvCell(r.paymentLogIndex),
      csvNumericCell(r.amountNative),   // integer string — no prefix
      csvCell(r.amountDisplay),
      csvCell(r.payer),
      csvCell(r.merchant),
      csvNumericCell(r.paidAt),         // integer string — no prefix
      csvNumericCell(r.paidBlockNumber),// integer string — no prefix
      csvCell(r.blockHash),
      csvCell(r.verificationStatus),
      csvCell(r.mode),
      csvCell(r.controlled_demo),
    ].join(','));
  }
  return rows.join('\n');
}

/** Deduplicate receipts by chain+deployment+tx+logIndex. Later entries win. */
export function deduplicateReceipts(records: ReceiptExportRecord[]): ReceiptExportRecord[] {
  const seen = new Map<string, ReceiptExportRecord>();
  for (const r of records) {
    const key = `${r.chainId}:${r.deploymentId}:${r.transactionHash ?? 'null'}:${r.paymentLogIndex ?? 'null'}`;
    seen.set(key, r);
  }
  return Array.from(seen.values());
}

/** Build a ReceiptExportRecord from a verification result and invoice state. */
export function buildReceiptExport(
  deployment: DeploymentRecord,
  invoiceId: `0x${string}`,
  txHash: `0x${string}` | null,
  amountNative: bigint | null,
  payer: `0x${string}` | null,
  merchant: `0x${string}` | null,
  paidAt: bigint | null,
  paidBlockNumber: bigint | null,
  result: VerificationResult,
  isFixture: boolean,
): ReceiptExportRecord {
  return {
    chainId: deployment.chainId,
    deploymentId: deployment.deploymentId,
    contract: deployment.contractAddress,
    invoiceId,
    transactionHash: txHash,
    paymentLogIndex: result.paymentLogIndex,
    amountNative: amountNative?.toString() ?? null,
    payer: payer ?? null,
    merchant: merchant ?? null,
    paidAt: paidAt !== null ? paidAt.toString() : null,
    paidBlockNumber: paidBlockNumber !== null ? paidBlockNumber.toString() : null,
    blockHash: result.blockHash,
    verificationStatus: result.status,
    mode: isFixture ? 'fixture' : 'testnet',
    controlled_demo: !!payer && !!merchant && payer.toLowerCase() === merchant.toLowerCase(),
    amountDisplay: amountNative === null ? null : formatAmountDisplay(amountNative),
  };
}
