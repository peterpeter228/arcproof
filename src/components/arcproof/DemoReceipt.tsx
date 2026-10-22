/** Offline example only. Never reads a wallet, RPC, or trusted deployment. */
import { useEffect, useRef } from 'react';
import { OFFLINE_FIXTURE } from '../../arcproof/offlineFixture';
import { formatAmountDisplay } from '../../arcproof/amountParser';
import { exportReceiptsJson, exportReceiptsCsv, type ReceiptExportRecord } from '../../arcproof/exportUtils';

// The same checks a real receipt needs; in the demo none of them can run.
const REAL_RECEIPT_CHECKS = [
  'Contract code at the trusted address',
  'Invoice marked paid on chain',
  'Payment event matches invoice, payer, merchant, amount',
  'USDC transfers payer → contract → merchant',
  'Finalized block covers the payment',
] as const;

export function DemoReceipt({invoiceId, amount, onClose}: {invoiceId: string; amount: bigint; onClose: () => void}) {
 const record: ReceiptExportRecord = {
  ...OFFLINE_FIXTURE, invoiceId,
  transactionHash: null, paymentLogIndex: null, amountNative: amount.toString(),
  amountDisplay: formatAmountDisplay(amount),
  payer: null,
  paidAt: null, paidBlockNumber: null, blockHash: null,
  verificationStatus: 'SIMULATED_NOT_VERIFIED', mode: 'fixture',
 };
 // Move keyboard and screen-reader focus to the receipt that just opened.
 const section = useRef<HTMLElement>(null);
 useEffect(() => { section.current?.focus(); }, []);
 function download(kind: 'json' | 'csv') {
  const data = kind === 'json' ? exportReceiptsJson([record]) : exportReceiptsCsv([record]);
  const url = URL.createObjectURL(new Blob([data], {type: kind === 'json' ? 'application/json' : 'text/csv'}));
  const link = document.createElement('a'); link.href = url; link.download = `arcproof-SIMULATED-${invoiceId.slice(0,10)}.${kind}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <section ref={section} tabIndex={-1} aria-label="Simulated receipt" className="ap-card space-y-4 border-2 border-dashed border-amber-300 p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="ap-kicker text-amber-900">Receipt preview</p>
    <h3 className="mt-1 font-semibold text-stone-900">DEMO — simulated receipt, not payment proof</h3>
   </div>
   <span className="ap-stamp">Simulated</span>
  </div>
  <p className="text-stone-900"><span className="ap-field-label">Example amount:</span> <span className="receipt-amount block font-semibold tabular">{record.amountDisplay} test USDC</span></p>
  <dl className="grid gap-3 text-sm">
   <div><dt className="ap-field-label">Invoice ID (derived from the fixture)</dt><dd className="font-mono break-all">Invoice fixture: {invoiceId}</dd></div>
   <div><dt className="ap-field-label">Merchant (fixture, not a real address owner)</dt><dd className="font-mono break-all">Fixture merchant: {record.merchant}</dd></div>
   <div><dt className="ap-field-label">Payer · transaction · payment time</dt><dd>None — no payment happens in the demo</dd></div>
  </dl>
  <div className="ap-tear" aria-hidden />
  <div className="space-y-2">
   <h4 className="text-sm font-semibold text-stone-900">Checks a real receipt must pass</h4>
   <ul className="space-y-1.5 text-sm">
    {REAL_RECEIPT_CHECKS.map((check) => <li key={check} className="flex flex-wrap items-baseline justify-between gap-x-3"><span>{check}</span><span className="text-xs font-semibold uppercase tracking-wide text-stone-600">Not run (simulation)</span></li>)}
   </ul>
  </div>
  <p className="text-sm text-stone-700">Offline fixture only. No payment occurred, no wallet was connected, and no transaction was sent. This is not a tax invoice.</p>
  <p className="text-sm text-stone-700">Payer, transaction, payment time, block, and event index: unavailable (null). Verification: <span className="font-mono font-semibold">SIMULATED_NOT_VERIFIED</span>.</p>
  <div className="flex flex-wrap gap-3">
   <button type="button" className="ap-btn-secondary" onClick={()=>download('json')}>Export simulated JSON</button>
   <button type="button" className="ap-btn-secondary" onClick={()=>download('csv')}>Export simulated CSV</button>
   <button type="button" className="ap-btn-secondary" onClick={onClose}>Close example</button>
  </div>
 </section>;
}
