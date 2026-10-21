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

import type { VerificationResult, VerificationDiagnostics } from './receiptVerifier';
import type { DeploymentRecord } from './manifest';
import { formatAmountDisplay } from './amountParser';
import { classifyDeployment } from './networkPolicy';

export interface ReceiptExportRecord {
  /** New builders emit these; optional only for compatibility with legacy records. */
  schemaVersion?: '1.1' | '1.2';
  /** 1.2 separates observations from fully verified settlement evidence. */
  reasonCode?: string;
  message?: string;
  checks?: VerificationDiagnostics['checks'];
  readStartedAt?: number | null;
  readCompletedAt?: number | null;
  source?: VerificationDiagnostics['source'] | null;
  observationScope?: VerificationDiagnostics['observationScope'] | null;
  observedReceipt?: VerificationDiagnostics['observedReceipt'];
  observedInvoice?: VerificationDiagnostics['observedInvoice'];
  verifiedEvidence?: VerificationResult['settlementEvidence'] | null;
  verificationVerified?: boolean;
  factsBasis?: 'identity_bound_rpc_observation' | 'legacy_caller_supplied' | 'unavailable';
  contractAddress?: string;
  txHash?: string | null;
  blockNumber?: string | null;
  gasFeeNative?: string | null;
  verifiedAt?: number;
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
  /** Network identity requires the application's exact trusted deployment record. */
  mode: 'fixture' | 'testnet' | 'mainnet' | 'unknown';
  amountDisplay: string | null;
  controlled_demo?: boolean;
  settlementEvidence?: VerificationResult['settlementEvidence'];
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
 * prefixed by this serializer. Import these columns as TEXT, not spreadsheet numbers.
 * CSV byte preservation does not guarantee spreadsheet precision. Use JSON for evidence.
 * All other textual cells use csvCell which prefixes dangerous leading chars.
 */

/**
 * Sanitise a textual CSV cell to prevent formula injection.
 * Cells starting with = + - @ | \t are prefixed with \t (tab) as a formula-injection
 * mitigation. Spreadsheet behavior varies; explicitly import cells as text.
 * The cell is also quoted if it contains commas, newlines, or double-quotes.
 * MUST NOT be used for pure integer/numeric strings — use csvNumericCell.
 */
function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Prefix cells that could be interpreted as formulas.
  // Preserve the existing escape; do not replace it with ="..." formulas.
  // Quoting alone is not a formula-injection defense. Actual application
  // round-trip behavior must be tested separately; import as text.
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
  'settlementPolicy', 'nativeEmitter', 'nativeDecimals', 'payerToContractLogIndex', 'contractToMerchantLogIndex',
  'finalizedBlockNumber', 'finalizedBlockHash',
  'schemaVersion', 'contractAddress', 'txHash', 'blockNumber', 'gasFeeNative', 'verifiedAt',
  'reasonCode', 'message', 'factsBasis', 'verificationVerified', 'source', 'readStartedAt', 'readCompletedAt',
  'observedReceiptStatus', 'observedGasUsed', 'observedEffectiveGasPrice', 'observedBlockTimestamp', 'checks',
];

/** Human-readable interchange, not canonical machine evidence. See docs/RECEIPT_EXPORT_FORMAT.md. */
export const RECEIPT_CSV_IMPORT_NOTICE = 'JSON is the machine-evidence format. CSV is for reading: import all columns as Text, disable automatic numeric/date conversion, and verify raw integers after re-export. Excel/Sheets round-trip acceptance: NOT_RUN.';

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
      csvCell(r.settlementEvidence?.policyId),
      csvCell(r.settlementEvidence?.nativeEmitter),
      csvCell(r.settlementEvidence?.decimals),
      csvCell(r.settlementEvidence?.payerToContractLogIndex),
      csvCell(r.settlementEvidence?.contractToMerchantLogIndex),
      csvNumericCell(r.settlementEvidence?.finalizedBlockNumber),
      csvCell(r.settlementEvidence?.finalizedBlockHash),
      csvCell(r.schemaVersion), csvCell(r.contractAddress), csvCell(r.txHash),
      csvNumericCell(r.blockNumber), csvNumericCell(r.gasFeeNative), csvCell(r.verifiedAt),
      csvCell(r.reasonCode), csvCell(r.message), csvCell(r.factsBasis), csvCell(r.verificationVerified),
      csvCell(r.source?.label), csvCell(r.readStartedAt), csvCell(r.readCompletedAt),
      csvCell(r.observedReceipt?.status), csvNumericCell(r.observedReceipt?.gasUsed),
      csvNumericCell(r.observedReceipt?.effectiveGasPrice), csvNumericCell(r.observedReceipt?.blockTimestamp),
      csvCell(r.checks ? JSON.stringify(r.checks) : null),
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
  // A v1.2 verifier supplies its own identity-bound snapshot. Never mix it with
  // a later UI invoice read, a cached result for another route, or imported flags.
  const hasDiagnostics = result.observationScope !== undefined;
  const scope = result.observationScope;
  const same = (a: string | null | undefined, b: string | null | undefined) =>
    typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
  const scopeMatches = !hasDiagnostics || !!scope && scope.chainId === deployment.chainId &&
    scope.deploymentId === deployment.deploymentId && same(scope.contract, deployment.contractAddress) &&
    same(scope.invoiceId, invoiceId) && same(scope.transactionHash, txHash);
  const classified = classifyDeployment(deployment);
  const mode = !scopeMatches ? 'unknown' : classified === 'fixture' ? (isFixture ? 'fixture' : 'unknown')
    : classified === 'mainnet' ? (hasDiagnostics && result.status === 'VERIFIED' && result.verified ? 'mainnet' : 'unknown') : classified;
  const observedReceipt = scopeMatches ? result.observedReceipt ?? null : null;
  const observedInvoice = scopeMatches ? result.observedInvoice ?? null : null;
  const verified = scopeMatches && result.status === 'VERIFIED' && result.verified;
  const evidence = verified ? result.settlementEvidence ?? null : null;
  const status = scopeMatches ? result.status : 'PENDING';
  const message = scopeMatches ? result.message : 'Verification result belongs to another request; no observations exported.';
  const amount = hasDiagnostics ? observedInvoice?.amountNative ?? null : amountNative?.toString() ?? null;
  const factPayer = hasDiagnostics ? observedInvoice?.payer ?? null : payer;
  const factMerchant = hasDiagnostics ? observedInvoice?.merchant ?? null : merchant;
  return {
    schemaVersion: '1.2',
    reasonCode: scopeMatches ? result.reasonCode ?? result.status : 'PENDING',
    message,
    checks: scopeMatches ? result.checks ?? [] : [{ id: 'export_scope', status: 'failed', reasonCode: 'PENDING', message }],
    readStartedAt: scopeMatches ? result.readStartedAt ?? null : null,
    readCompletedAt: scopeMatches ? result.readCompletedAt ?? null : null,
    source: scopeMatches ? result.source ?? null : null,
    observationScope: scopeMatches ? scope ?? null : null,
    observedReceipt, observedInvoice, verifiedEvidence: evidence,
    verificationVerified: verified,
    factsBasis: hasDiagnostics ? observedReceipt ? 'identity_bound_rpc_observation' : 'unavailable' : 'legacy_caller_supplied',
    contractAddress: deployment.contractAddress,
    txHash,
    blockNumber: hasDiagnostics ? observedReceipt?.blockNumber ?? null : result.blockNumber ?? null,
    gasFeeNative: hasDiagnostics ? observedReceipt?.gasFeeNative ?? null : result.gasFeeNative ?? null,
    verifiedAt: scopeMatches ? result.verifiedAt : undefined,
    chainId: deployment.chainId,
    deploymentId: deployment.deploymentId,
    contract: deployment.contractAddress,
    invoiceId,
    transactionHash: txHash,
    paymentLogIndex: hasDiagnostics ? observedReceipt?.paymentLogIndex ?? null : result.paymentLogIndex,
    amountNative: amount,
    payer: factPayer ?? null,
    merchant: factMerchant ?? null,
    paidAt: hasDiagnostics ? observedInvoice?.paidAt ?? null : paidAt?.toString() ?? null,
    paidBlockNumber: hasDiagnostics ? observedInvoice?.paidBlockNumber ?? null : paidBlockNumber?.toString() ?? null,
    blockHash: hasDiagnostics ? observedReceipt?.blockHash ?? null : result.blockHash,
    verificationStatus: status,
    ...(evidence ? { settlementEvidence: evidence } : {}),
    mode,
    controlled_demo: !!factPayer && !!factMerchant && factPayer.toLowerCase() === factMerchant.toLowerCase(),
    amountDisplay: amount === null ? null : formatAmountDisplay(BigInt(amount)),
  };
}
