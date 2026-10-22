/** Offline example only. Never reads a wallet, RPC, or trusted deployment. */
import { useEffect, useRef } from 'react';
import { OFFLINE_FIXTURE, OFFLINE_FIXTURE_DEPLOYMENT } from '../../arcproof/offlineFixture';
import { formatAmountDisplay } from '../../arcproof/amountParser';
import { buildReceiptExport } from '../../arcproof/exportUtils';
import { ReceiptExportActions } from './ReceiptExportActions';

// The same checks a real receipt needs; in the demo none of them can run.
const REAL_RECEIPT_CHECKS = [
  'Contract code at the trusted address',
  'Invoice marked paid on chain',
  'Payment event matches invoice, payer, merchant, amount',
  'USDC transfers payer → contract → merchant',
  'Finalized block covers the payment',
] as const;

export function DemoReceipt({invoiceId, amount, onClose}: {invoiceId: string; amount: bigint; onClose: () => void}) {
 const record = buildReceiptExport(OFFLINE_FIXTURE_DEPLOYMENT, invoiceId as `0x${string}`, null,
  null, null, null, null, null,
  { status: 'PENDING', verified: false, message: 'Offline fixture; no chain read was made.',
    paymentLogIndex: null, blockHash: null, verifiedAt: 0 }, true);
 // Move keyboard and screen-reader focus to the receipt that just opened.
 const section = useRef<HTMLElement>(null);
 useEffect(() => { section.current?.focus(); }, []);
 return <section ref={section} tabIndex={-1} aria-label="Simulated receipt" className="ap-card space-y-4 border-2 border-dashed border-amber-300 p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="ap-kicker text-amber-900">Receipt preview</p>
    <h3 className="mt-1 font-semibold text-stone-900">DEMO — simulated receipt, not payment proof</h3>
   </div>
   <span className="ap-stamp">Simulated</span>
  </div>
  <p className="text-stone-900"><span className="ap-field-label">Example amount:</span> <span className="receipt-amount block font-semibold tabular">{formatAmountDisplay(amount)} test USDC</span></p>
  <dl className="grid gap-3 text-sm">
   <div><dt className="ap-field-label">Invoice ID (derived from the fixture)</dt><dd className="font-mono break-all">Invoice fixture: {invoiceId}</dd></div>
   <div><dt className="ap-field-label">Merchant (fixture, not a real address owner)</dt><dd className="font-mono break-all">Fixture merchant: {OFFLINE_FIXTURE.merchant}</dd></div>
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
  <p className="text-sm text-stone-700">All exported payment facts, including amount and merchant: unavailable (null). Example values above are display-only. Verification: <span className="font-mono font-semibold">SIMULATED_NOT_VERIFIED</span>.</p>
  <ReceiptExportActions record={record} filename={`arcproof-SIMULATED-${invoiceId.slice(0,10)}`} label="simulated" />
  <div className="flex flex-wrap gap-3">
   <button type="button" className="ap-btn-secondary" onClick={onClose}>Close example</button>
  </div>
 </section>;
}
