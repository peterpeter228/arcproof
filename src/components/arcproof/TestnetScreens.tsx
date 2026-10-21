import { receiptStatus } from '../../arcproof/receiptStatus';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatUnits, type Hex } from 'viem';
import { ConnectKitButton } from 'connectkit';
import { ReceiptFacts } from './ReceiptFacts';
import { AtomicForwardingWarning } from './Layout';
import { formatAmountDisplay } from '../../arcproof/amountParser';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS, explorerTx, isBytes32 } from '../../arcproof/testnet';
import {
  testnetClient, loadHistory, loadInvoice, prepareCreate, preparePay, sendPreparedAction,
  confirmCreatedInvoice, confirmSubmittedOutcome, checkBroadcast, rememberPaymentHash, errorMessage, verifyTestnetReceipt,
  assertReceiptMatches,
  type PreparedAction, type LoadedInvoice,
} from '../../arcproof/testnetClient';
import { useTestnetWallet } from '../../arcproof/useTestnetWallet';
import { recordSubmission, updateSubmission, useSubmissions } from '../../arcproof/submissions';
import { buildReceiptExport, exportReceiptsJson, exportReceiptsCsv } from '../../arcproof/exportUtils';

const panel = 'arcproof-panel bg-white border border-stone-200 rounded-xl p-5 space-y-3';
const button = 'rounded-lg px-4 py-2 bg-teal-700 text-white disabled:bg-stone-200 disabled:text-stone-500';
const input = 'w-full rounded-lg border border-stone-500 px-3 py-2 font-mono text-base';
const route = (kind: 'pay' | 'receipt', id: Hex, tx?: Hex) =>
  `#/${kind}/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${id}${tx ? `?tx=${tx}` : ''}`;

function TransactionNotice({ hash }: { hash: Hex }) {
  return <div className="rounded-lg bg-amber-50 p-3 text-sm break-words" role="status">
    Transaction submitted. A hash is not payment proof. Do not automatically resend.
    <a className="block font-mono underline break-all mt-1" href={explorerTx(hash)} target="_blank" rel="noreferrer">{hash}</a>
  </div>;
}
function Review({ action, busy, confirm, cancel }: {
  action: PreparedAction; busy: boolean; confirm: () => void; cancel: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const restoreOnCancel = useRef(false);
  useEffect(() => {
    // StrictMode replays this effect while the heading already owns focus.
    if (document.activeElement !== title.current) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    title.current?.focus();
    return () => {
      // Passive cleanup runs after the trigger is re-enabled by cancellation.
      if (restoreOnCancel.current && returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, []);
  function cancelReview() { restoreOnCancel.current = true; cancel(); }
  return <section className={`${panel} border-teal-300`} aria-label="Review testnet transaction">
    <h3 ref={title} tabIndex={-1} className="font-semibold">Review {action.kind === 'create' ? 'invoice creation' : 'test payment'}</h3>
    <p>Network: Arc Testnet (5042002)</p>
    <p>Invoice amount: {formatAmountDisplay(action.amountNative)} test USDC</p>
    <p className="break-all">From: <span className="font-mono">{action.session.account}</span></p>
    {action.payment && <p className="break-all">Merchant: <span className="font-mono">{action.payment.invoiceSnapshot.merchant}</span></p>}
    <p className="break-all">Contract: <span className="font-mono">{action.to}</span></p>
    <p>Transaction value: {formatUnits(action.value, 18)} test USDC</p>
    <p>Estimated fee allowance: {formatUnits(action.feeEstimate, 18)} test USDC. The wallet shows final fee details.</p>
    <p>Expiry: {new Date(Number(action.expiresAt) * 1000).toISOString()} (UTC) · No attached terms.</p>
    {action.payment && action.session.account.toLowerCase() === action.payment.invoiceSnapshot.merchant.toLowerCase() &&
      <p className="text-amber-800">Payer and merchant are the same wallet. This is a controlled self-demo, not revenue or a two-wallet acceptance test.</p>}
    <AtomicForwardingWarning />
    <p className="text-sm text-stone-600">Only click below when you are ready to inspect and approve in your wallet. A submitted transaction cannot be cancelled here.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} disabled={busy} onClick={confirm}>{busy ? 'Waiting for wallet / network…' : 'Open wallet to approve'}</button>
      <button type="button" className="border rounded-lg px-4 py-2" disabled={busy} onClick={cancelReview}>Cancel review</button>
    </div>
  </section>;
}

function useSafeOperation(sessionKey: string) {
  const sequence = useRef(0);
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    sequence.current += 1;
    return () => { sequence.current += 1; };
  }, [sessionKey]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; sequence.current += 1; };
  }, []);
  return {
    start: () => {
      if (locked.current) return null;
      locked.current = true;
      const token = ++sequence.current;
      return { current: () => alive.current && token === sequence.current,
        finish: () => { locked.current = false; } };
    },
  };
}

export function TestnetDashboard() {
  const wallet = useTestnetWallet();
  return <TestnetDashboardSession key={wallet.sessionKey} wallet={wallet} />;
}

function TestnetDashboardSession({ wallet }: { wallet: ReturnType<typeof useTestnetWallet> }) {
  const operation = useSafeOperation(wallet.sessionKey);
  const [amount, setAmount] = useState('0.20');
  const [hours, setHours] = useState(24);
  const [action, setAction] = useState<PreparedAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<LoadedInvoice | null>(null);
  const [history, setHistory] = useState<LoadedInvoice[]>([]);
  const [nextNonce, setNextNonce] = useState(0n);
  const [page, setPage] = useState(0);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<Hex | null>(null);
  const copyVersion = useRef(0);
  const currentInvoiceId = useRef<Hex | null>(null);
  useEffect(() => () => { copyVersion.current += 1; currentInvoiceId.current = null; }, []);
  function invalidateCopy() {
    copyVersion.current += 1;
    currentInvoiceId.current = null;
    setCopiedInvoiceId(null);
  }
  const canUseWallet = wallet.session?.chainId === ARC_TESTNET.id;

  async function refreshHistory(targetPage = page) {
    const op = operation.start();
    if (!op || !wallet.session) { op?.finish(); return; }
    setBusy(true); setError('');
    try {
      const result = await loadHistory(testnetClient, wallet.session.account, targetPage);
      if (op.current()) { setHistory(result.invoices); setNextNonce(result.nextNonce); setPage(targetPage); }
    } catch (e) { if (op.current()) setError(errorMessage(e)); }
    finally { op.finish(); if (op.current()) setBusy(false); }
  }

  async function review() {
    const op = operation.start();
    if (!op || !wallet.session) { op?.finish(); return; }
    invalidateCopy();
    setBusy(true); setError(''); setAction(null); setCreated(null);
    try {
      const prepared = await prepareCreate(testnetClient, wallet.session, amount, hours);
      if (op.current()) setAction(prepared);
    } catch (e) { if (op.current()) setError(errorMessage(e)); }
    finally { op.finish(); if (op.current()) setBusy(false); }
  }

  async function confirm() {
    if (!action) return;
    const op = operation.start(); if (!op) return;
    setBusy(true); setError('');
    let hash: Hex | undefined;
    try {
      const provider = await wallet.getProvider();
      hash = await sendPreparedAction(testnetClient, provider, action, wallet.getSession);
      recordSubmission({ hash, kind: 'create', account: action.session.account, state: 'submitted' });
      if (op.current()) setAction(null);
      // Read-only waiting. Never broadcast again on timeout or replacement.
      const receipt = await testnetClient.waitForTransactionReceipt({ hash, timeout: 90_000, pollingInterval: 2_000 });
      assertReceiptMatches(action, hash, receipt);
      if (receiptStatus(receipt.status) === 'unknown') throw new Error('Receipt status is unknown. Keep the saved request unresolved; do not resend.');
      if (receiptStatus(receipt.status) === 'reverted') {
        await confirmSubmittedOutcome(testnetClient, hash, 'reverted');
        throw new Error('Creation transaction reverted. Gas may have been spent.');
      }
      const invoice = await confirmCreatedInvoice(testnetClient, action, hash);
      updateSubmission(hash, 'included');
      if (op.current()) { invalidateCopy(); currentInvoiceId.current = invoice.invoiceId; setCreated(invoice); setHistory((old) => [invoice, ...old.filter((x) => x.invoiceId !== invoice.invoiceId)]); }
    } catch (e) {
      if (op.current()) { setAction(null); setError(`${errorMessage(e)}${hash ? ' The submitted hash is saved. Inspect it before any new action.' : ' If your wallet may have submitted a transaction, inspect its history before trying again.'}`); }
    } finally { op.finish(); if (op.current()) setBusy(false); }
  }

  async function copyLink(id: Hex) {
    if (currentInvoiceId.current !== id) return;
    const token = ++copyVersion.current;
    setCopiedInvoiceId(null); setError('');
    const current = () => copyVersion.current === token && currentInvoiceId.current === id;
    try {
      const link = new URL(window.location.href);
      link.search = ''; link.hash = route('pay', id);
      await navigator.clipboard.writeText(link.href);
      if (current()) setCopiedInvoiceId(id);
    } catch {
      if (current()) setError('Clipboard access was unavailable. Open the payment link and copy its browser address.');
    }
  }

  return <div className="max-w-2xl mx-auto space-y-5">
    <form className={panel} aria-label="Create testnet invoice" aria-busy={busy} onSubmit={(event) => {
      event.preventDefault();
      if (!busy && canUseWallet && !action) void review();
    }}>
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h2 className="font-semibold text-lg">Create a testnet invoice</h2>
        <a className="underline text-sm" href="#/demo">Use offline simulation instead</a>
      </div>
      {!wallet.session && <p>Connect an ordinary EOA wallet using the button above. No signature is needed to read invoices.</p>}
      {wallet.session && !canUseWallet && <p className="text-amber-800">Switch to Arc Testnet (5042002) in your wallet. Mainnet and other networks cannot create or pay here.</p>}
      <label className="block text-sm" htmlFor="testnet-amount">Amount (test USDC, maximum 1)</label>
      <input id="testnet-amount" inputMode="decimal" aria-describedby={error ? 'create-error create-context' : 'create-context'} className={input} value={amount} disabled={busy || !!action} onChange={(e) => setAmount(e.target.value)} />
      <label className="block text-sm" htmlFor="testnet-expiry">Expires in (whole hours, 1–168)</label>
      <input id="testnet-expiry" inputMode="numeric" aria-describedby={error ? 'create-error' : undefined} type="number" min={1} max={168} className={input} value={hours} disabled={busy || !!action} onChange={(e) => setHours(Number(e.target.value))} />
      <p id="create-context" className="text-sm text-stone-600">The connected wallet is the merchant. Terms hash is always zero. No customer information is written on chain.</p>
      <button type="submit" className={button} disabled={busy || !canUseWallet || !!action}>{busy ? 'Checking…' : 'Review invoice creation'}</button>
      {busy && <p role="status" className="text-sm">Checking invoice creation. No automatic resubmission.</p>}
    </form>
    {action && <Review action={action} busy={busy} confirm={() => void confirm()} cancel={() => setAction(null)} />}
    {error && <p id="create-error" role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 break-words">{error}</p>}
    {created && <section className={panel}>
      <h3 className="font-semibold" role="status">Invoice created on Arc Testnet</h3>
      <p className="font-mono break-all text-xs">{created.invoiceId}</p>
      <p>{formatAmountDisplay(created.amountNative)} test USDC · unpaid unless the chain now reports otherwise</p>
      <div className="flex gap-3 flex-wrap">
        <a className="underline" href={route('pay', created.invoiceId)}>Open payment page</a>
        <button className="underline" onClick={() => void copyLink(created.invoiceId)}>{copiedInvoiceId === created.invoiceId ? `Link copied for invoice …${created.invoiceId.slice(-4)}` : 'Copy payment link'}</button>
      </div>
    </section>}
    <section className={panel}>
      <div className="flex justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">On-chain invoice history</h3>
        <button className="underline text-sm" disabled={busy || !canUseWallet} onClick={() => void refreshHistory()}>Load / refresh history</button>
      </div>
      <p className="text-sm text-stone-600">Loaded from merchant nonce and read-back state, not local demo data. This also recovers invoices after refresh.</p>
      {history.length === 0 && <p className="text-sm text-stone-500">No invoices loaded. Connect the merchant wallet, then load history.</p>}
      {history.map((invoice) => <div key={invoice.invoiceId} className="border-t pt-3 space-y-1">
        <p className="text-xs font-mono break-all">{invoice.invoiceId}</p>
        <p>{formatAmountDisplay(invoice.amountNative)} test USDC · {invoice.paid ? 'Paid according to contract; verify receipt' : 'Unpaid according to contract'}</p>
        <a className="underline text-sm" href={route(invoice.paid ? 'receipt' : 'pay', invoice.invoiceId)}>{invoice.paid ? 'Verify payment receipt' : 'Open payment page'}</a>
      </div>)}
      <div className="flex gap-3 text-sm">
        <button disabled={busy || page === 0} className="underline disabled:text-stone-300" onClick={() => void refreshHistory(page - 1)}>Previous</button>
        <span>Page {page + 1}</span>
        <button disabled={busy || BigInt((page + 1) * 20) >= nextNonce} className="underline disabled:text-stone-300" onClick={() => void refreshHistory(page + 1)}>Next</button>
      </div>
    </section>
  </div>;
}

export function TestnetPayScreen({ invoiceId }: { invoiceId: Hex }) {
  const wallet = useTestnetWallet();
  return <TestnetPaySession key={`${invoiceId}:${wallet.sessionKey}`} invoiceId={invoiceId} wallet={wallet} />;
}

function TestnetPaySession({ invoiceId, wallet }: { invoiceId: Hex; wallet: ReturnType<typeof useTestnetWallet> }) {
  const operation = useSafeOperation(`${wallet.sessionKey}:${invoiceId}`);
  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null);
  const [action, setAction] = useState<PreparedAction | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const submissions = useSubmissions();
  const pending = submissions.find((row) => row.kind === 'pay' && row.invoiceId?.toLowerCase() === invoiceId.toLowerCase() && row.state !== 'reverted');
  const hash = pending?.hash ?? null;

  useEffect(() => {
    let active = true;
    void loadInvoice(testnetClient, invoiceId).then((value) => { if (active) setInvoice(value); })
      .catch((e: unknown) => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [invoiceId]);

  async function review() {
    const op = operation.start(); if (!op || !wallet.session) { op?.finish(); return; }
    setBusy(true); setAction(null); setError('');
    try {
      const prepared = await preparePay(testnetClient, wallet.session, invoiceId);
      if (op.current()) setAction(prepared);
    } catch (e) { if (op.current()) setError(errorMessage(e)); }
    finally { op.finish(); if (op.current()) setBusy(false); }
  }
  async function confirm() {
    if (!action) return;
    const op = operation.start(); if (!op) return;
    setBusy(true); setError('');
    let sent: Hex | undefined;
    try {
      const provider = await wallet.getProvider();
      sent = await sendPreparedAction(testnetClient, provider, action, wallet.getSession);
      rememberPaymentHash(invoiceId, sent);
      recordSubmission({ hash: sent, kind: 'pay', invoiceId, account: action.session.account, state: 'submitted' });
      if (op.current()) setAction(null);
      const receipt = await testnetClient.waitForTransactionReceipt({ hash: sent, timeout: 90_000, pollingInterval: 2_000 });
      assertReceiptMatches(action, sent, receipt);
      await checkBroadcast(testnetClient, action, sent);
      if (receiptStatus(receipt.status) === 'unknown') throw new Error('Receipt status is unknown. Keep the saved request unresolved; do not resend.');
      if (receiptStatus(receipt.status) === 'reverted') {
        await confirmSubmittedOutcome(testnetClient, sent, 'reverted');
        throw new Error('Payment transaction reverted. Gas may have been spent; no payment is confirmed.');
      }
      const fresh = await loadInvoice(testnetClient, invoiceId);
      await confirmSubmittedOutcome(testnetClient, sent, 'included');
      if (op.current()) setInvoice(fresh);
    } catch (e) {
      if (op.current()) { setAction(null); setError(`${errorMessage(e)}${sent ? ' The submitted hash is saved; verify it instead of resending.' : ' Check wallet history if submission is uncertain.'}`); }
    } finally { op.finish(); if (op.current()) setBusy(false); }
  }

  const canPay = !!invoice && !invoice.paid && invoice.termsHash === ZERO_TERMS &&
    wallet.session?.chainId === ARC_TESTNET.id && !pending;
  return <div className="max-w-2xl mx-auto space-y-4">
    <section className={panel}>
      <p className="text-sm font-semibold text-stone-600">Arc Testnet · test USDC only</p>
      <h2 className="font-semibold text-lg">Testnet payment request</h2>
      <p className="text-xs font-mono break-all">{invoiceId}</p>
      {invoice ? <>
        <p className="receipt-amount font-semibold">{formatAmountDisplay(invoice.amountNative)} test USDC</p>
        <p className="break-all">Merchant: <span className="font-mono text-sm">{invoice.merchant}</span></p>
        <p>Expires: {new Date(Number(invoice.expiresAt) * 1000).toISOString()} (UTC)</p>
        <p role="status">{invoice.paid ? 'Paid according to contract state. Verify the receipt independently below.' : 'Unpaid according to contract state. Fresh block time and terms are checked before signing.'}</p>
        {invoice.termsHash !== ZERO_TERMS && <p className="text-amber-800">Unsupported attached terms. This page is read-only and will not request a payment.</p>}
      </> : <p>Invoice amount, recipient and expiry are unavailable until trusted chain data loads.</p>}
      {!wallet.session && <ConnectKitButton />}
      {wallet.session && wallet.session.chainId !== ARC_TESTNET.id && <p className="text-amber-800">Switch your wallet to Arc Testnet (5042002). No other network is supported.</p>}
      <button type="button" aria-describedby={error ? 'pay-error' : undefined} className={button} disabled={busy || !canPay || !!action} onClick={() => void review()}>{busy ? 'Checking…' : 'Review test payment'}</button>
      {(invoice?.paid || hash) && <a className="block underline text-sm" href={route('receipt', invoiceId, hash ?? undefined)}>Verify receipt from chain data</a>}
    </section>
    {action && <Review action={action} busy={busy} confirm={() => void confirm()} cancel={() => setAction(null)} />}
    {hash && <TransactionNotice hash={hash} />}
    {error && <p id="pay-error" role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 break-words">{error}</p>}
  </div>;
}

export function TestnetReceiptScreen({ invoiceId, txHash }: { invoiceId?: Hex; txHash?: string }) {
  return <TestnetReceiptFields key={`${invoiceId ?? ''}:${txHash ?? ''}`} invoiceId={invoiceId} txHash={txHash} />;
}

function TestnetReceiptFields({ invoiceId, txHash }: { invoiceId?: Hex; txHash?: string }) {
  const [id, setId] = useState(invoiceId ?? '');
  const [tx, setTx] = useState(txHash ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState<Awaited<ReturnType<typeof verifyTestnetReceipt>> | null>(null);
  const sequence = useRef(0);
  const receiptCopyVersion = useRef(0);
  const activeRequest = useRef<number | null>(null);
  function edit(field: 'id' | 'tx', value: string) {
    sequence.current += 1; activeRequest.current = null;
    setBusy(false); setVerified(null); setError(''); setCopied(false);
    if (field === 'id') setId(value); else setTx(value);
  }
  const runVerification = useCallback(async (targetId: string, targetTx: string) => {
    if (activeRequest.current !== null) return;
    const token = ++sequence.current;
    activeRequest.current = token; setBusy(true); setError(''); setVerified(null); setCopied(false);
    try {
      if (!isBytes32(targetId) || (targetTx && !isBytes32(targetTx))) throw new Error('Invoice ID and optional transaction hash must each contain 32 bytes.');
      const result = await verifyTestnetReceipt(testnetClient, targetId, (targetTx || undefined) as Hex | undefined);
      if (sequence.current === token) setVerified(result);
    } catch (e) { if (sequence.current === token) setError(errorMessage(e)); }
    finally {
      if (activeRequest.current === token) activeRequest.current = null;
      if (sequence.current === token) setBusy(false);
    }
  }, []);
  function verify() { return runVerification(id, tx); }
  useEffect(() => {
    // Defer only to the microtask queue: StrictMode's first setup is cancelled,
    // so its replay makes exactly one read-only call, not two RPC sequences.
    let active = true;
    void Promise.resolve().then(() => {
      if (active && invoiceId && isBytes32(invoiceId) && (txHash === undefined || isBytes32(txHash))) void runVerification(invoiceId, txHash ?? '');
    });
    return () => { active = false; sequence.current += 1; activeRequest.current = null; };
  }, [invoiceId, txHash, runVerification]);
  const record = verified ? buildReceiptExport(TESTNET_DEPLOYMENT, verified.invoice.invoiceId, verified.hash,
    verified.invoice.amountNative,
    verified.invoice.paid && verified.invoice.payer !== '0x0000000000000000000000000000000000000000' ? verified.invoice.payer : null,
    verified.invoice.merchant, verified.invoice.paid && verified.invoice.paidAt > 0n ? verified.invoice.paidAt : null,
    verified.invoice.paid && verified.invoice.paidBlockNumber > 0n ? verified.invoice.paidBlockNumber : null,
    verified.result, false) : null;
  const success = verified?.result.status === 'VERIFIED' && verified.result.verified && !!record?.settlementEvidence;
  function download(kind: 'json' | 'csv') {
    if (!record) return;
    const output = kind === 'json' ? exportReceiptsJson([record]) : exportReceiptsCsv([record]);
    const blob = new Blob([output], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `arcproof-testnet-${record.invoiceId}.${kind}`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyVerificationLink() {
    if (!verified || !isBytes32(verified.invoice.invoiceId) || !isBytes32(verified.hash)) return;
    const token = sequence.current;
    const copyToken = ++receiptCopyVersion.current;
    setCopied(false); setError('');
    const base = new URL(window.location.href);
    base.search = ''; base.hash = route('receipt', verified.invoice.invoiceId, verified.hash);
    try {
      await navigator.clipboard.writeText(base.href);
      if (sequence.current === token && receiptCopyVersion.current === copyToken) setCopied(true);
    } catch {
      if (sequence.current === token && receiptCopyVersion.current === copyToken) setError('Clipboard access was unavailable. Use the verification link below and copy its browser address.');
    }
  }
  return <div className="max-w-2xl mx-auto space-y-4 receipt-page">
    <form className={`${panel} print:hidden`} onSubmit={(event) => { event.preventDefault(); void verify(); }}>
      <h2 className="font-semibold text-lg">Verify a testnet receipt</h2>
      <p className="text-sm">Read-only verification: no wallet or signature required. Network and contract come only from the checked manifest, never from imported receipt flags.</p>
      <p className="text-xs font-mono break-all">{TESTNET_DEPLOYMENT.contractAddress}</p>
      <label htmlFor="live-receipt-id" className="block text-sm">Invoice ID</label>
      <input id="live-receipt-id" aria-invalid={!!error && !isBytes32(id)} autoCapitalize="none" spellCheck={false} className={input} value={id} aria-describedby={error ? 'receipt-error' : undefined} onChange={(e) => edit('id', e.target.value)} />
      <label htmlFor="live-receipt-tx" className="block text-sm">Payment transaction hash (optional)</label>
      <input id="live-receipt-tx" aria-invalid={!!error && !!tx && !isBytes32(tx)} autoCapitalize="none" spellCheck={false} className={input} value={tx} aria-describedby={error ? 'receipt-error' : undefined} onChange={(e) => edit('tx', e.target.value)} />
      <p className="text-sm text-stone-600">Without a hash, recovery searches only the invoice’s recorded paid block. Ambiguous evidence stays unverified.</p>
      <button type="submit" className={button} disabled={busy || !id}>{busy ? 'Verifying…' : 'Verify from chain data'}</button>
      {busy && <p role="status" className="text-sm">Reading chain evidence. No transaction will be sent.</p>}
    </form>
    {error && <p id="receipt-error" role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 break-words">{error}</p>}
    {verified && record && <section className={panel} aria-label="Receipt result">
      <p className="text-sm font-semibold text-stone-600">Arc Testnet · test USDC only · Not mainnet</p>
      <div role="status" aria-live="polite">
        <h3 className={`font-semibold ${success ? 'text-teal-800' : 'text-amber-900'}`}>{success ? 'Verified testnet payment' : verified.result.status === 'UNVERIFIED_ARC_EVIDENCE' ? 'Standard checks passed; settlement evidence incomplete' : `Not verified: ${verified.result.status}`}</h3>
      </div>
      {!success && <p className="text-sm text-amber-900">The following are observed invoice/receipt fields, not verified payment proof.</p>}
      <ReceiptFacts record={record} />
      <p className="text-sm">Testnet evidence only, not revenue, a tax invoice, or proof of delivery. Imported verification flags are never trusted.</p>
      <a className="block font-mono text-xs break-all underline" href={explorerTx(verified.hash)} target="_blank" rel="noreferrer">Transaction: {verified.hash}</a>
      <div className="flex flex-wrap gap-3 text-sm print:hidden">
        <button className="underline py-2" onClick={() => void copyVerificationLink()}>{copied ? 'Verification link copied' : 'Copy verification link'}</button>
        <a className="underline py-2" href={route('receipt', verified.invoice.invoiceId, verified.hash)}>Open verification link</a>
        <button className="underline py-2" onClick={() => download('json')}>Export testnet JSON</button>
        <button className="underline py-2" onClick={() => download('csv')}>Export testnet CSV</button>
        <button className="underline py-2" onClick={() => window.print()}>Print</button>
      </div>
    </section>}
  </div>;
}
