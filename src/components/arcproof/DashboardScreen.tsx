/**
 * DashboardScreen.tsx — Merchant invoice creation + paginated history.
 * Offline simulation only. This screen never invokes the live testnet adapter.
 * Paginated history derived from nextNonce, 20 per page, newest-first.
 */
import React, { useState, useMemo } from 'react';
import { parseInvoiceAmount, ParseAmountError } from '../../arcproof/amountParser';
import { DemoReceipt } from './DemoReceipt';
import { deriveInvoiceId, deriveInvoiceIds } from '../../arcproof/invoiceId';
import { AtomicForwardingWarning } from './Layout';
import { AlertCircle, FileText } from 'lucide-react';

import { OFFLINE_FIXTURE } from '../../arcproof/offlineFixture';
import { BUILD_NETWORK } from '../../arcproof/networkPolicy';

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
    const createdId = deriveInvoiceId(OFFLINE_FIXTURE.chainId, OFFLINE_FIXTURE.contract, OFFLINE_FIXTURE.merchant, demoNonce);
    setDemoAmounts((amounts) => [...amounts, parsedAmount]);
    setDemoNonce((n) => n + 1n);
    setPage(0);
    setExampleReceipt({ invoiceId: createdId, amount: parsedAmount });
  }

  const invoiceIds = useMemo(() => {
    return deriveInvoiceIds(OFFLINE_FIXTURE.chainId, OFFLINE_FIXTURE.contract, OFFLINE_FIXTURE.merchant, demoNonce, PAGE_SIZE, page);
  }, [demoNonce, page]);

  const totalPages = Math.ceil(Number(demoNonce) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="ap-kicker">Offline demo mode</p>
          <span className="ap-stamp">Simulated · not verified</span>
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-900">See an invoice and its receipt in 30 seconds</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-700">
          Separate from the live testnet deployment. Creating an invoice here only runs the real ID derivation and amount checks;
          no transaction is sent. No wallet is needed. The demo merchant and contract are fixtures, not deployed addresses.
        </p>
        {BUILD_NETWORK.key === 'mainnet' && <p className="text-sm text-amber-900">This offline demo stays on the fixture. Amounts here are simulated, not a mainnet USDC payment, even when this build has a trusted deployment.</p>}
        <ol className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-700" aria-label="Demo steps">
          <li><span className="ap-serial">01</span> Set an amount</li>
          <li><span className="ap-serial">02</span> Create the simulated invoice</li>
          <li><span className="ap-serial">03</span> Inspect what a receipt would prove</li>
        </ol>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
      <AtomicForwardingWarning />

      {/* Create form */}
      <section className="ap-card p-5 space-y-4" aria-labelledby="demo-create-title">
        <h3 id="demo-create-title" className="font-semibold text-stone-900 text-base">Create invoice</h3>

        {/* Amount */}
        <div className="space-y-1">
          <label htmlFor="invoice-amount" className="block text-xs font-medium text-stone-600 uppercase tracking-wider">
            Amount (test USDC, max 1.000000)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="invoice-amount" type="text"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.20"
              inputMode="decimal"
              aria-invalid={!!amountError}
              aria-describedby={amountError ? 'invoice-amount-error' : 'invoice-amount-units'}
              className={[
                'flex-1 border rounded-lg px-3 py-2 text-base font-mono bg-white placeholder:text-stone-500',
                amountError ? 'border-red-600' : 'border-stone-500',
              ].join(' ')}
            />
            <span className="text-sm text-stone-600 shrink-0">test USDC</span>
          </div>
          {amountError && (
            <p id="invoice-amount-error" role="alert" className="text-xs text-red-700 flex items-center gap-1">
              <AlertCircle size={12} /> {amountError}
            </p>
          )}
          {parsedAmount !== null && !amountError && (
            <p id="invoice-amount-units" className="text-xs text-stone-600">
              Exact on-chain value: <span className="font-mono tabular">{parsedAmount.toString()}</span> native units (Arc USDC uses 18 decimals)
            </p>
          )}
        </div>

        {/* Expiry */}
        <div className="space-y-1">
          <label htmlFor="invoice-expiry" className="block text-xs font-medium text-stone-600 uppercase tracking-wider">
            Expires in (hours, max 168)
          </label>
          <input
            id="invoice-expiry" type="number"
            min={1}
            max={168}
            value={lifetimeHours}
            onChange={(e) => setLifetimeHours(Math.min(168, Math.max(1, Number(e.target.value))))}
            className="w-32 border border-stone-500 rounded-lg px-3 py-2 text-base bg-white"
          />
          <p className="text-xs text-stone-600 tabular">
            Expires: {new Date(expirySeconds * 1000).toISOString()} (UTC)
          </p>
        </div>

        {/* Title (optional, unbound) */}
        <div className="space-y-1">
          <label htmlFor="invoice-title" className="block text-xs font-medium text-stone-600 uppercase tracking-wider">
            Title (optional, unbound plain text &mdash; not stored on chain)
          </label>
          <input
            type="text"
            id="invoice-title" value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            maxLength={240}
            placeholder="e.g. Design consultation"
            className="w-full border border-stone-500 rounded-lg px-3 py-2 text-base bg-white placeholder:text-stone-500"
          />
          <p className="text-xs text-stone-600">
            {countCodepoints(title)}/{MAX_TITLE_CODEPOINTS} code points. Not proof; not stored onchain. No customer PII.
          </p>
          {titleError && <p role="alert" className="text-xs text-red-700">{titleError}</p>}
        </div>

        {/* termsHash fixed */}
        <p className="text-xs text-stone-600">
          Attached terms: none (terms hash <span className="font-mono">bytes32(0)</span>; attaching documents is not supported in this prototype)
        </p>

        <button
          onClick={handleCreate}
          disabled={!parsedAmount || !!amountError || !!titleError}
          className="ap-btn-primary w-full"
        >
          Create invoice (offline demo — no signing)
        </button>
      </section>
      </div>

      <div className="space-y-4">
      {exampleReceipt ? <DemoReceipt key={exampleReceipt.invoiceId} invoiceId={exampleReceipt.invoiceId} amount={exampleReceipt.amount} onClose={() => setExampleReceipt(null)} /> :
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-6 text-sm text-stone-600">
          <p className="font-semibold text-stone-800">The simulated receipt appears here</p>
          <p className="mt-1">It shows which fields a real receipt binds together and which checks would run. Payment fields stay empty because no payment happens in the demo.</p>
        </div>}
      </div>
      </div>

      {/* Invoice list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900 text-base">
            Invoice history
            {Number(demoNonce) > 0 && (
              <span className="ml-2 text-xs font-normal text-stone-600">
                {' '}{demoNonce.toString()} {demoNonce === 1n ? 'invoice' : 'invoices'} (demo)
              </span>
            )}
          </h3>
        </div>

        {Number(demoNonce) === 0 ? (
          <div className="ap-card p-8 text-center">
            <FileText size={32} className="mx-auto text-stone-400 mb-3" aria-hidden />
            <p className="text-stone-600 text-sm">No invoices yet.</p>
            <p className="text-stone-600 text-xs mt-1">Create your first invoice above.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {invoiceIds.map(({ nonce, invoiceId }) => (
                <div key={invoiceId} className="ap-card px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-stone-600 font-mono break-all">{invoiceId}</p>
                    <p className="text-xs text-stone-600 mt-0.5">Nonce {nonce.toString()}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600">
                    demo
                  </span>
                  <button type="button" className="ap-btn-secondary" onClick={() => setExampleReceipt({ invoiceId, amount: demoAmounts[Number(nonce)] })}>View simulated receipt</button>
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
                <span className="text-xs text-stone-600">
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
