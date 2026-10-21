/** Offline example only. Never reads a wallet, RPC, or trusted deployment. */
import { OFFLINE_FIXTURE } from '../../arcproof/offlineFixture';
import { formatAmountDisplay } from '../../arcproof/amountParser';
import { exportReceiptsJson, exportReceiptsCsv, type ReceiptExportRecord } from '../../arcproof/exportUtils';
export function DemoReceipt({invoiceId, amount, onClose}: {invoiceId: string; amount: bigint; onClose: () => void}) {
 const record: ReceiptExportRecord = {
  ...OFFLINE_FIXTURE, invoiceId,
  transactionHash: null, paymentLogIndex: null, amountNative: amount.toString(),
  amountDisplay: formatAmountDisplay(amount),
  payer: null,
  paidAt: null, paidBlockNumber: null, blockHash: null,
  verificationStatus: 'SIMULATED_NOT_VERIFIED', mode: 'fixture',
 };
 function download(kind: 'json' | 'csv') {
  const data = kind === 'json' ? exportReceiptsJson([record]) : exportReceiptsCsv([record]);
  const url = URL.createObjectURL(new Blob([data], {type: kind === 'json' ? 'application/json' : 'text/csv'}));
  const link = document.createElement('a'); link.href = url; link.download = `arcproof-SIMULATED-${invoiceId.slice(0,10)}.${kind}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <section aria-label="Simulated receipt" className="rounded-xl border border-dashed border-stone-500 bg-stone-50 text-stone-700 p-5 space-y-3">
  <h3 className="font-semibold">DEMO — simulated receipt, not payment proof</h3>
  <p className="text-sm">Offline fixture only. No payment occurred, no wallet was connected, and no transaction was sent. This is not a tax invoice.</p>
  <p className="font-mono break-all text-sm">Invoice fixture: {invoiceId}</p>
  <p className="text-sm">Example amount: {record.amountDisplay} test USDC</p>
  <p className="font-mono break-all text-sm">Fixture merchant: {record.merchant}</p>
  <p className="text-sm">Payer, transaction, payment time, block, and event index: unavailable (null). Verification: SIMULATED_NOT_VERIFIED.</p>
  <div className="flex flex-wrap gap-3">
   <button className="border rounded px-3 py-2" onClick={()=>download('json')}>Export simulated JSON</button>
   <button className="border rounded px-3 py-2" onClick={()=>download('csv')}>Export simulated CSV</button>
   <button className="border rounded px-3 py-2" onClick={onClose}>Close example</button>
  </div>
 </section>;
}
