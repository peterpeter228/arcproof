/**
 * Layout.tsx — App shell with header nav and prototype banner.
 * Arc Light aesthetic: ivory background, dark readable type, teal accent.
 * No emojis, no invented data, no marketing copy.
 */
import React, { useState } from 'react';
import { BUILD_NETWORK, canWriteContext, networkStage, networkExplorerTx, type NetworkContext } from '../../arcproof/networkPolicy';
import type { Submission } from '../../arcproof/submissions';
import type { WalletIntent } from '../../arcproof/walletIntents';
import { isBytes32 } from '../../arcproof/testnet';
import { getNetworkService } from '../../arcproof/testnetClient';
import { ConnectKitButton } from 'connectkit';
import { StudioAttribution } from './StudioAttribution';
import { BrandMark } from './BrandMark';

type NavTab = 'home' | 'dashboard' | 'verify' | 'evidence' | 'demo';

interface LayoutProps {
  context?: NetworkContext;
  hideWallet?: boolean;
  hideSavedActivity?: boolean;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export function PrototypeBanner({ context }: { context: NetworkContext }) {
  const testnet = context.key === 'testnet';
  return (
    <div className={`w-full border-b px-4 py-2 ${testnet ? 'border-amber-200 bg-amber-50' : 'border-amber-400 bg-amber-200'}`}>
      <p className="mx-auto flex max-w-page flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm font-medium text-amber-900">
        <span className="inline-flex items-center gap-1.5">{testnet ? <span aria-hidden className="h-2 w-2 rounded-full bg-amber-600" /> : <span className="rounded bg-amber-900 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-50">Mainnet preview</span>}{testnet ? 'Arc Testnet (5042002)' : 'Arc Mainnet (5042)'}</span>
        <span>{testnet ? '· test USDC, no monetary value · mainnet disabled · not audited' : !context.deployment ? '· real USDC · no trusted deployment · all sends disabled · not audited' : context.writesEnabled ? '· real USDC · accepted release · not audited' : '· real USDC · read-only deployment · all sends disabled · not audited'}</span>
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

// Ordered by what a first-time visitor can do without a wallet.
const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'home', label: 'Overview' },
  { id: 'demo', label: 'Try demo' },
  { id: 'verify', label: 'Verify receipt' },
  { id: 'dashboard', label: 'Create invoice' },
  { id: 'evidence', label: 'Evidence' },
];

function SavedTransactions({ context }: { context: NetworkContext }) {
  const service = getNetworkService(context);
  const { client: testnetClient, reconcileSubmission, recoverUnknownSubmission, errorMessage } = service;
  const { useSubmissions, useSubmissionRequests } = service.submissions;
  const { useWalletIntents } = service.intents;
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
    try { await reconcileSubmission(testnetClient, row); setMessage(`Saved transaction status refreshed from ${context.label}. This is not verified settlement.`); }
    catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(null); }
  }
  const row = (item: Submission) => <div key={item.hash} className="space-y-1 border-b border-amber-200 py-2 last:border-0">
    <p className="break-all"><strong>{item.kind} · {item.state}</strong>: <a className="underline" href={networkExplorerTx(context, item.hash)} target="_blank" rel="noreferrer">{item.hash}</a></p>
    {!intents.some(intent => intent.hash === item.hash && intent.hashPersistence === 'memory-only') && <button type="button" className="underline disabled:opacity-50" disabled={busy !== null} onClick={() => { void refresh(item); }}>Refresh saved status</button>}
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
  async function copyHash(hash: string) {
    try { await navigator.clipboard.writeText(hash); setMessage('Transaction hash copied. The original request remains unresolved.'); }
    catch { setMessage('Clipboard unavailable. Select and copy the complete hash shown above; do not reload or resend.'); }
  }
  if (!submissions.length && !requests.length && !intents.length) return null;
  return <aside className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" aria-label="Saved wallet transactions">
    {requests.length > 0 && intents.length === 0 && <p role="status">A wallet request is outstanding or its outcome is uncertain. Do not refresh this page or submit again until you have checked your wallet activity. The request lock does not survive a reload or coordinate other tabs; no automatic resend will occur.</p>}
    {intents.length > 0 && <p role="status">A saved wallet request is unresolved. Do not submit again. Its durable guard survives reload in this browser and coordinates same-origin tabs while storage remains available. Only a known saved hash can be recovered below; hashless requests remain unresolved; no automatic resend or timeout release occurs.</p>}
    {intents.map((intent) => <div key={intent.operationId} className="my-2 border border-amber-300 p-2">
      <p className="break-all">{intent.kind} · {intent.state} · {intent.account}</p>
      {(intent.hash || intent.kind === 'pay') && <label className="block">{intent.hash ? intent.hashPersistence === 'memory-only' ? 'Original callback hash (memory only)' : 'Original saved transaction hash' : 'Candidate payment hash for independent verification (optional)'}
        <input autoCapitalize="none" spellCheck={false} aria-describedby={message ? 'recovery-message' : undefined} className="block w-full border p-1" value={recoveryHashes[intent.operationId] ?? intent.hash ?? ''} onChange={(event) => setRecoveryHashes((old) => ({ ...old, [intent.operationId]: event.target.value }))} />
      </label>}
      {intent.hash && intent.hashPersistence !== 'memory-only' ? <button type="button" className="underline disabled:opacity-50" disabled={busy !== null} onClick={() => { void recover(intent); }}>Recover known hash (read only)</button> : <>
        {intent.hashPersistence === 'memory-only' ? <><p>This callback hash is available only in this tab's memory because saving it failed. Save it now. The durable original request remains unresolved; this is not payment proof. Do not reload, clear storage or resend.</p><a className="underline break-all" href={networkExplorerTx(context, intent.hash!)} target="_blank" rel="noreferrer">Inspect original hash in Explorer (read only)</a><button type="button" className="block underline" onClick={() => { void copyHash(intent.hash!); }}>Copy original transaction hash</button></> : <p>This hashless request remains unresolved. A matching payment, successful or reverted, does not identify or resolve this original request. Do not resend or clear storage.</p>}
        {intent.kind === 'pay' && intent.invoiceId && <a className="underline" href={`#/receipt/${context.chain.id}/${intent.deploymentId}/${intent.invoiceId}${isBytes32(recoveryHashes[intent.operationId] ?? intent.hash ?? '') ? `?tx=${recoveryHashes[intent.operationId] ?? intent.hash}` : ''}`}>Verify invoice payment separately (read only)</a>}
      </>}
      <p>Replacement/cancellation and cross-device recovery are unsupported. Original request identity requires manual investigation; no automatic resend or timeout release occurs.</p>
    </div>)}
    <p>Saved hashes are unverified locators. Check status before another request. Browser storage is best-effort.</p>
    {pending.length > 0 && <section aria-label="Unresolved saved transactions"><p>Unresolved saved transactions ({pending.length})</p>{pending.map(row)}</section>}
    {history.length > 0 && <details><summary className="cursor-pointer py-2">Completed transaction history ({history.length}) · not verified settlement</summary>{history.map(row)}</details>}
    {message && <p id="recovery-message" role="status" className="mt-2">{message}</p>}
  </aside>;
}

export function Layout({ context = BUILD_NETWORK, activeTab, onTabChange, children, hideWallet = false, hideSavedActivity = false }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-paper font-sans text-stone-900">
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to main content</a>
      <PrototypeBanner context={context} />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:flex md:min-h-16 md:justify-between md:py-2">
          <a href="#/" className="flex min-h-11 min-w-0 items-center gap-2.5 no-underline">
            <BrandMark />
            <span className="min-w-0">
              <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-stone-900">ArcProof</h1>
              <span className="hidden text-xs text-stone-600 sm:block">Verifiable USDC invoices</span>
            </span>
          </a>

          <nav aria-label="Main navigation" className="col-span-2 row-start-2 -mx-1 flex flex-wrap items-center gap-1 md:col-span-1 md:row-start-auto md:mx-0">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
                onClick={() => onTabChange(item.id)}
                className={[
                  'rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3',
                  activeTab === item.id
                    ? 'bg-teal-50 text-teal-800 shadow-[inset_0_-2px_0_#0f766e]'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {!hideWallet && canWriteContext(context) && <div className="col-start-2 row-start-1 shrink-0 justify-self-end">
            <ConnectKitButton />
          </div>}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-page flex-1 px-4 py-6 sm:py-8">
        {!hideSavedActivity && context.deployment && <SavedTransactions key={`${context.key}:${context.deployment.deploymentId}`} context={context} />}
        {children}
      </main>

      <footer className="app-footer border-t border-stone-200 bg-white">
        <div className="footer-metadata mx-auto flex max-w-page flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-stone-600">
          <span>ArcProof prototype &mdash; not audited, 1 USDC cap per invoice</span>
          <span>{context.key === 'testnet' ? 'Testnet only · mainnet not enabled' : networkStage(context) === 'U0' ? 'Mainnet: no trusted deployment · sends disabled' : canWriteContext(context) ? 'Mainnet · real USDC' : 'Mainnet · read-only · sends disabled'}</span>
          <a className="underline" href="#/evidence">Build identity and evidence</a>
        </div>
        <div className="mx-auto max-w-page px-4 pb-4"><StudioAttribution /></div>
      </footer>
    </div>
  );
}
