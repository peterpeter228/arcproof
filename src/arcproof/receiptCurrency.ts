/** Currency wording for receipt amounts. A label, never verification evidence. */
import type { ReceiptExportRecord } from './exportUtils';
import { ARC_TESTNET } from './testnet';
import { ARC_MAINNET } from './networkPolicy';

export function receiptCurrencyLabel(record: Pick<ReceiptExportRecord, 'chainId' | 'mode'>): string {
  if (record.chainId === ARC_TESTNET.id) return 'test USDC';
  if (record.chainId === ARC_MAINNET.id) return record.mode === 'mainnet' ? 'USDC' : 'USDC (untrusted deployment)';
  return 'USDC (unrecognized network)';
}
