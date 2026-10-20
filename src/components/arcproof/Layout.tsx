/**
 * Layout.tsx — App shell with header nav and prototype banner.
 * Arc Light aesthetic: ivory background, dark readable type, teal accent.
 * No emojis, no invented data, no marketing copy.
 */
import React, { useState } from 'react';
import { useSubmissions, useSubmissionRequests, type Submission } from '../../arcproof/submissions';
import { explorerTx } from '../../arcproof/testnet';
import { reconcileSubmission, errorMessage, testnetClient } from '../../arcproof/testnetClient';
import { ConnectKitButton } from 'connectkit';

type NavTab = 'dashboard' | 'verify' | 'evidence';

interface LayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export function PrototypeBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
      <p className="text-xs font-medium text-amber-800 tracking-wide">
        Arc Testnet prototype &bull; test assets only &bull; mainnet disabled
      </p>
    </div>
  );
}

export function AtomicForwardingWarning() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
      <strong>Notice:</strong> This contract uses atomic forwarding — funds are passed directly
      to the merchant in the same transaction. The contract is not a custodian, escrow, or
      intermediary, but it does touch funds. It is not audited, not production-ready, and
      provides no escrow, delivery proof, or refund mechanism.
    </div>
  );
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'dashboard', label: 'Invoices' },
  { id: 'verify', label: 'Verify receipt' },
  { id: 'evidence', label: 'Evidence' },
];

function SavedTransactions() {
  const submissions = useSubmissions();
  const requests = useSubmissionRequests();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  async function refresh(row: Submission) {
    if (busy) return;
    setBusy(row.hash); setMessage('');
    try { await reconcileSubmission(testnetClient, row); setMessage('Saved transaction status refreshed from Arc Testnet. This is not verified settlement.'); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(null); }
  }
  const row = (item: Submission) => <div key={item.hash} className="space-y-1 border-b border-amber-200 py-2 last:border-0">
    <p className="break-all"><strong>{item.kind} · {item.state}</strong>: <a className="underline" href={explorerTx(item.hash)} target="_blank" rel="noreferrer">{item.hash}</a></p>
    <button type="button" className="underline disabled:opacity-50" disabled={busy !== null} onClick={() => { void refresh(item); }}>Refresh saved status</button>
  </div>;
  if (!submissions.length && !requests.length) return null;
  return <aside className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" aria-label="Saved wallet transactions">
    {requests.length > 0 && <p role="status">A wallet request is outstanding or its outcome is uncertain. Do not refresh this page or submit again until you have checked your wallet activity. The request lock does not survive a reload or coordinate other tabs; no automatic resend will occur.</p>}
    <p>Saved hashes are unverified locators. Check status before another request. Browser storage is best-effort.</p>
    {submissions[0] && row(submissions[0])}
    {submissions.length > 1 && <details><summary className="cursor-pointer py-2">Older saved transactions ({submissions.length - 1})</summary>{submissions.slice(1).map(row)}</details>}
    {message && <p role="status" className="mt-2">{message}</p>}
  </aside>;
}

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-stone-50 font-sans">
      <PrototypeBanner />

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:h-14 sm:py-0 sm:flex sm:justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-teal-600" aria-hidden />
            <span className="font-display font-semibold text-stone-900 tracking-tight text-sm">
              ArcProof
            </span>
          </div>

          {/* Nav */}
          <nav className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-1 sm:justify-start">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === item.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Wallet */}
          <div className="col-start-2 row-start-1 justify-self-end shrink-0">
            <ConnectKitButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <SavedTransactions />
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 text-xs text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>ArcProof prototype &mdash; G1 reviewed, not audited</span>
          <span>Grant eligibility: HOLD</span>
          <span>Checked testnet deployment · live payment acceptance pending</span>
        </div>
      </footer>
    </div>
  );
}
