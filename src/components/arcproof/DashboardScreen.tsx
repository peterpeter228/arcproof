/**
 * DashboardScreen.tsx — Merchant invoice creation + paginated history.
 * Offline simulation only. This screen never invokes the live testnet adapter.
 * Paginated history derived from nextNonce, 20 per page, newest-first.
 */
import React, { useState, useMemo } from 'react';
import { parseInvoiceAmount, ParseAmountError } from '../../arcproof/amountParser';
import { DemoReceipt } from './DemoReceipt';
import { deriveInvoiceIds } from '../../arcproof/invoiceId';
import { AtomicForwardingWarning } from './Layout';
import { AlertCircle, FileText } from 'lucide-react';

const DEMO_CHAIN_ID = 5042002; // Arc Testnet fixture domain; these addresses are not the live deployment
const DEMO_MERCHANT = '0x0000000000000000000000000000000000000002' as `0x${string}`;
const DEMO_CONTRACT = '0x0000000000000000000000000000000000000001' as `0x${string}`;

const MAX_TITLE_CODEPOINTS = 80;

function countCodepoints(s: string): number {
  return [...s].length;
}

export function DashboardScreen() {

  // Create form state
  const [amountStr, setAmountStr] = useState('0.20');
  const [lifetimeHours, setLifetimeHours] = useState(24);
  const [title, setTitle] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Simulated nonce for demo (no real contract call)
  const [demoNonce, setDemoNonce] = useState(0n);
  const [demoAmounts, setDemoAmounts] = useState<bigint[]>([]);
  const [exampleReceipt, setExampleReceipt] = useState<{ invoiceId: string; amount: bigint } | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const parsedAmount = useMemo(() => {
    try {
      return parseInvoiceAmount(amountStr);
    } catch {
      return null;
    }
  }, [amountStr]);

  const [baseTs] = React.useState(() => Math.floor(Date.now() / 1000));
  const expirySeconds = baseTs + lifetimeHours * 3600;

  function handleAmountChange(v: string) {
    setAmountStr(v);
    try {
      parseInvoiceAmount(v);
      setAmountError(null);
    } catch (e) {
      setAmountError(e instanceof ParseAmountError ? e.message : 'Invalid amount');
    }
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (countCodepoints(v) > MAX_TITLE_CODEPOINTS) {
      setTitleError(`Title must be at most ${MAX_TITLE_CODEPOINTS} Unicode code points`);
    } else {
      setTitleError(null);
    }
  }

  function handleCreate() {
    // Demo mode: increment nonce and show in list. No wallet signing.
    if (!parsedAmount || amountError || titleError) return;
    setDemoAmounts((amounts) => [...amounts, parsedAmount]);
    setDemoNonce((n) => n + 1n);
    setPage(0);
  }

  const invoiceIds = useMemo(() => {
    return deriveInvoiceIds(DEMO_CHAIN_ID, DEMO_CONTRACT, DEMO_MERCHANT, demoNonce, PAGE_SIZE, page);
  }, [demoNonce, page]);

  const totalPages = Math.ceil(Number(demoNonce) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Demo mode notice */}
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
        <strong>Offline demo mode</strong> &mdash; separate from the live testnet deployment. Invoice creation below
        demonstrates the ID derivation and UI flow only; no transaction is sent. No wallet is needed. The fixed demo merchant and contract are fixtures, not deployed addresses.
      </div>

      <AtomicForwardingWarning />

      {/* Create form */}
      <section className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-stone-900 text-base">Create invoice</h2>

        {/* Amount */}
        <div className="space-y-1">
          <label htmlFor="invoice-amount" className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Amount (USDC, max 1.000000)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="invoice-amount" type="text"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.20"
              className={[
                'flex-1 border rounded-lg px-3 py-2 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-2',
                amountError ? 'border-red-300 focus:ring-red-200' : 'border-stone-200 focus:ring-teal-200',
              ].join(' ')}
            />
            <span className="text-sm text-stone-400 shrink-0">USDC</span>
          </div>
          {amountError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={12} /> {amountError}
            </p>
          )}
          {parsedAmount !== null && !amountError && (
            <p className="text-xs text-stone-400 font-mono">
              {parsedAmount.toString()} native units (18 dec)
            </p>
          )}
        </div>

        {/* Expiry */}
        <div className="space-y-1">
          <label htmlFor="invoice-expiry" className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Expires in (hours, max 168)
          </label>
          <input
            id="invoice-expiry" type="number"
            min={1}
            max={168}
            value={lifetimeHours}
            onChange={(e) => setLifetimeHours(Math.min(168, Math.max(1, Number(e.target.value))))}
            className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
          <p className="text-xs text-stone-400">
            Expires: {new Date(expirySeconds * 1000).toLocaleString()}
          </p>
        </div>

        {/* Title (optional, unbound) */}
        <div className="space-y-1">
          <label htmlFor="invoice-title" className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Title (optional, unbound plain text &mdash; not stored on chain)
          </label>
          <input
            type="text"
            id="invoice-title" value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            maxLength={240}
            placeholder="e.g. Design consultation"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
          />
          <p className="text-xs text-stone-400">
            {countCodepoints(title)}/{MAX_TITLE_CODEPOINTS} code points. Not proof; not stored onchain. No customer PII.
          </p>
          {titleError && <p className="text-xs text-red-600">{titleError}</p>}
        </div>

        {/* termsHash fixed */}
        <p className="text-xs text-stone-400">
          Terms hash: <span className="font-mono">bytes32(0)</span> (P0 only; nonzero hash protocol not implemented)
        </p>

        <button
          onClick={handleCreate}
          disabled={!parsedAmount || !!amountError || !!titleError}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          Create invoice (offline demo — no signing)
        </button>
      </section>

      {exampleReceipt && <DemoReceipt invoiceId={exampleReceipt.invoiceId} amount={exampleReceipt.amount} onClose={() => setExampleReceipt(null)} />}

      {/* Invoice list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-stone-900 text-base">
            Invoice history
            {Number(demoNonce) > 0 && (
              <span className="ml-2 text-xs font-normal text-stone-400">
                {demoNonce.toString()} invoices (demo)
              </span>
            )}
          </h2>
        </div>

        {Number(demoNonce) === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
            <FileText size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">No invoices yet.</p>
            <p className="text-stone-400 text-xs mt-1">Create your first invoice above.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {invoiceIds.map(({ nonce, invoiceId }) => (
                <div key={invoiceId} className="bg-white rounded-lg border border-stone-200 px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 font-mono truncate">{invoiceId}</p>
                    <p className="text-xs text-stone-500 mt-0.5">Nonce {nonce.toString()}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-500">
                    demo
                  </span>
                  <button className="text-sm border rounded px-2 py-1" onClick={() => setExampleReceipt({ invoiceId, amount: demoAmounts[Number(nonce)] })}>View simulated receipt</button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm rounded border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
                >
                  Previous
                </button>
                <span className="text-xs text-stone-400">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-sm rounded border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
