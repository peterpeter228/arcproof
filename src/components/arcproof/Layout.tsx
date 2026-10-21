/**
 * Layout.tsx — App shell with header nav and prototype banner.
 * Arc Light aesthetic: ivory background, dark readable type, teal accent.
 * No emojis, no invented data, no marketing copy.
 */
import React, { useState } from 'react';
import { useSubmissions, useSubmissionRequests, type Submission } from '../../arcproof/submissions';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, explorerTx } from '../../arcproof/testnet';
import { useWalletIntents, type WalletIntent } from '../../arcproof/walletIntents';
import { isBytes32 } from '../../arcproof/testnet';
import { recoverUnknownSubmission, reconcileSubmission, errorMessage, testnetClient } from '../../arcproof/testnetClient';
import { ConnectKitButton } from 'connectkit';
import { StudioAttribution } from './StudioAttribution';

type NavTab = 'dashboard' | 'verify' | 'evidence' | 'demo';

interface LayoutProps {
  hideWallet?: boolean;
  hideSavedActivity?: boolean;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export function PrototypeBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
      <p className="text-sm font-medium text-amber-900">
        Arc Testnet (5042002) · test USDC, no monetary value · mainnet disabled · not audited
      </p>
    </div>
  );
}

export function AtomicForwardingWarning() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 leading-relaxed">
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
  { id: 'demo', label: 'Offline demo' },
];

function SavedTransactions() {
  const submissions = useSubmissions();
  const requests = useSubmissionRequests();
  const pending = submissions.filter((item) => item.state === 'submitted');
  const history = submissions.filter((item) => item.state !== 'submitted');
  const intents = useWalletIntents().filter((item) => ['requesting', 'uncertain', 'submitted'].includes(item.state));
  const [recoveryHashes, setRecoveryHashes] = useState<Record<string, string>>({});
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
  async function recover(intent: WalletIntent) {
    const hash = recoveryHashes[intent.operationId] ?? intent.hash ?? '';
    if (!isBytes32(hash)) { setMessage('Enter the full transaction hash from wallet history.'); return; }
    if (busy) return;
    setBusy(intent.operationId); setMessage('');
    try { const state = await recoverUnknownSubmission(testnetClient, intent.operationId, hash); setMessage(`Known saved hash status: ${state}. This is not verified settlement; no transaction was sent.`); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(null); }
  }
  if (!submissions.length && !requests.length && !intents.length) return null;
  return <aside className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" aria-label="Saved wallet transactions">
    {requests.length > 0 && intents.length === 0 && <p role="status">A wallet request is outstanding or its outcome is uncertain. Do not refresh this page or submit again until you have checked your wallet activity. The request lock does not survive a reload or coordinate other tabs; no automatic resend will occur.</p>}
    {intents.length > 0 && <p role="status">A saved wallet request is unresolved. Do not submit again. Its durable guard survives reload in this browser and coordinates same-origin tabs while storage remains available. Only a known saved hash can be recovered below; hashless requests remain unresolved; no automatic resend or timeout release occurs.</p>}
    {intents.map((intent) => <div key={intent.operationId} className="my-2 border border-amber-300 p-2">
      <p className="break-all">{intent.kind} · {intent.state} · {intent.account}</p>
      {(intent.hash || intent.kind === 'pay') && <label className="block">{intent.hash ? 'Original saved transaction hash' : 'Candidate payment hash for independent verification (optional)'}
        <input autoCapitalize="none" spellCheck={false} aria-describedby={message ? 'recovery-message' : undefined} className="block w-full border p-1" value={recoveryHashes[intent.operationId] ?? intent.hash ?? ''} onChange={(event) => setRecoveryHashes((old) => ({ ...old, [intent.operationId]: event.target.value }))} />
      </label>}
      {intent.hash ? <button type="button" className="underline disabled:opacity-50" disabled={busy !== null} onClick={() => { void recover(intent); }}>Recover known hash (read only)</button> : <>
        <p>This hashless request remains unresolved. A matching payment, successful or reverted, does not identify or resolve this original request. Do not resend or clear storage.</p>
        {intent.kind === 'pay' && intent.invoiceId && <a className="underline" href={`#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${intent.invoiceId}${isBytes32(recoveryHashes[intent.operationId] ?? '') ? `?tx=${recoveryHashes[intent.operationId]}` : ''}`}>Verify invoice payment separately (read only)</a>}
      </>}
      <p>Replacement/cancellation and cross-device recovery are unsupported. Original request identity requires manual investigation; no automatic resend or timeout release occurs.</p>
    </div>)}
    <p>Saved hashes are unverified locators. Check status before another request. Browser storage is best-effort.</p>
    {pending.length > 0 && <section aria-label="Unresolved saved transactions"><p>Unresolved saved transactions ({pending.length})</p>{pending.map(row)}</section>}
    {history.length > 0 && <details><summary className="cursor-pointer py-2">Completed transaction history ({history.length}) · not verified settlement</summary>{history.map(row)}</details>}
    {message && <p id="recovery-message" role="status" className="mt-2">{message}</p>}
  </aside>;
}

export function Layout({ activeTab, onTabChange, children, hideWallet = false, hideSavedActivity = false }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-stone-50 font-sans">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to main content</a>
      <PrototypeBanner />

      {/* Header */}
      <header className="bg-white border-b border-stone-200 ">
        <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:h-14 sm:py-0 sm:flex sm:justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-teal-600" aria-hidden />
            <h1 className="font-display font-semibold text-stone-900 tracking-tight text-lg">
              ArcProof
            </h1>
          </div>

          {/* Nav */}
          <nav aria-label="Main navigation" className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-1 sm:justify-start">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
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
          {!hideWallet && <div className="col-start-2 row-start-1 justify-self-end shrink-0">
            <ConnectKitButton />
          </div>}
        </div>
      </header>

      {/* Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 max-w-5xl mx-auto w-full px-4 py-6">
        {!hideSavedActivity && <SavedTransactions />}
        {children}
      </main>

      {/* Footer */}
      <footer className="app-footer border-t border-stone-200 bg-white">
        <div className="footer-metadata max-w-5xl mx-auto px-4 py-3 text-sm text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>ArcProof prototype &mdash; G1 reviewed, not audited</span>
          <span>Grant eligibility: HOLD</span>
          <a className="underline" href="#/evidence">Build identity and evidence</a>
          <span>Checked testnet deployment · live payment acceptance pending</span>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-4"><StudioAttribution /></div>
      </footer>
    </div>
  );
}
