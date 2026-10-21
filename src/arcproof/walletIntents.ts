import { useSyncExternalStore } from 'react';
import type { Address, Hex } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, isBytes32 } from './testnet';

const prefix = `arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:intent:`;
const lockName = `${prefix}wallet-dispatch`;
export interface WalletIntent {
  operationId: string;
  chainId: number;
  deploymentId: string;
  kind: 'create' | 'pay';
  account: Address;
  invoiceId?: Hex;
  to: Address;
  data: Hex;
  value: string;
  state: 'requesting' | 'uncertain' | 'submitted' | 'included' | 'reverted' | 'cancelled';
  hash?: Hex;
}
export type IntentInput = Omit<WalletIntent, 'operationId' | 'state' | 'hash'>;
const listeners = new Set<() => void>();
let snapshot: readonly WalletIntent[] = [];
function valid(value: unknown): value is WalletIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<WalletIntent>;
  return typeof v.operationId === 'string' && /^[a-f0-9-]{36}$/i.test(v.operationId) &&
    v.chainId === ARC_TESTNET.id && v.deploymentId === TESTNET_DEPLOYMENT.deploymentId &&
    (v.kind === 'create' || v.kind === 'pay') && typeof v.account === 'string' && /^0x[\da-f]{40}$/i.test(v.account) &&
    typeof v.to === 'string' && v.to.toLowerCase() === TESTNET_DEPLOYMENT.contractAddress.toLowerCase() &&
    typeof v.data === 'string' && /^0x(?:[\da-f]{2})+$/i.test(v.data) && typeof v.value === 'string' && /^\d+$/.test(v.value) &&
    (v.kind !== 'pay' || (typeof v.invoiceId === 'string' && isBytes32(v.invoiceId))) &&
    ['requesting', 'uncertain', 'submitted', 'included', 'reverted', 'cancelled'].includes(String(v.state)) &&
    (v.hash === undefined || isBytes32(v.hash));
}
function readAll(): WalletIntent[] {
  const rows: WalletIntent[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const row: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!valid(row) || key !== prefix + row.operationId) throw new Error('Saved wallet intent is unreadable. New sends are disabled; inspect wallet history.');
    rows.push(row);
  }
  return rows;
}
function notify(rows: readonly WalletIntent[]) { snapshot = rows; listeners.forEach((listener) => listener()); }
function refresh() { try { notify(readAll()); } catch { /* Read-only UI remains usable; dispatch performs a strict read. */ } }
function write(row: WalletIntent) {
  const serialized = JSON.stringify(row);
  localStorage.setItem(prefix + row.operationId, serialized);
  if (localStorage.getItem(prefix + row.operationId) !== serialized) throw new Error('Wallet intent could not be persisted. No safe retry is available; inspect wallet history.');
  refresh();
}
function unresolved(row: WalletIntent) { return row.state === 'requesting' || row.state === 'uncertain' || row.state === 'submitted'; }
function sameScope(row: WalletIntent, input: IntentInput) {
  return row.kind === input.kind && (input.kind === 'pay'
    ? row.invoiceId?.toLowerCase() === input.invoiceId?.toLowerCase()
    : row.account.toLowerCase() === input.account.toLowerCase());
}
async function withDispatchLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request || typeof localStorage === 'undefined') {
    throw new Error('Safe wallet submission requires browser Web Locks and writable storage. New sends are disabled; read-only verification remains available.');
  }
  return navigator.locks.request(lockName, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error('Another tab has a wallet operation in progress. Check that request; do not resend.');
    readAll(); // Fail closed on unavailable or corrupt persistence before creating a new intent.
    return work();
  });
}
/** Durable intent and origin-wide atomic dispatch. No timer or lease expiration releases an unknown request. */
export async function runWalletIntent(input: IntentInput, send: (markRequested: () => void, markRejected: () => void) => Promise<Hex>): Promise<Hex> {
  return withDispatchLock(async () => {
    const intent: WalletIntent = { ...input, operationId: crypto.randomUUID(), state: 'requesting' };
    // Reject malformed new input before persistence: even a cancelled invalid
    // row would poison strict reads and prevent every later legitimate send.
    // Already-persisted corrupt rows still fail closed in withDispatchLock.
    if (!valid(intent)) throw new Error('Invalid wallet intent. Nothing was stored or sent.');
    if (readAll().some((row) => sameScope(row, input) && (unresolved(row) || (input.kind === 'pay' && row.state === 'included')))) {
      throw new Error('An earlier wallet request is unresolved. Recover that request from wallet history before trying again.');
    }
    write(intent); // Must succeed before any wallet dispatch.
    let attempted = false;
    let explicitlyRejected = false;
    try {
      const hash = await send(() => { write(intent); attempted = true; }, () => { explicitlyRejected = true; });
      intent.hash = hash; intent.state = 'submitted';
      try { write(intent); } catch {
        notify([...snapshot.filter((row) => row.operationId !== intent.operationId), intent]);
        throw new Error(`Transaction hash ${hash} returned but persistence failed. Save this hash and recover the outstanding intent; do not resend.`);
      }
      return hash;
    } catch (error) {
      if (!intent.hash) {
        intent.state = !attempted || explicitlyRejected ? 'cancelled' : 'uncertain';
        try { write(intent); } catch { /* Existing persisted requesting intent remains a fail-closed guard. */ }
      }
      throw error;
    }
  });
}
/** The callback must perform strict read-only identity/status validation. No wallet method is available here. */
export async function recoverWalletIntent(operationId: string, hash: Hex, verify: (intent: WalletIntent) => Promise<'included' | 'reverted'>) {
  if (!isBytes32(hash)) throw new Error('Enter the full transaction hash from wallet history.');
  return withDispatchLock(async () => {
    const intent = readAll().find((row) => row.operationId === operationId);
    if (!intent || !unresolved(intent)) throw new Error('No unresolved saved intent found.');
    if (intent.hash && intent.hash.toLowerCase() !== hash.toLowerCase()) throw new Error('This intent already has a different hash. Replacement recovery is not supported here.');
    // Equal sender, calldata, value and receipt status identify a call, not the
    // original wallet request. Without its returned hash (or unique request
    // evidence we do not collect), even a successful matching payment is not
    // authority to settle this intent or release its duplicate-send guard.
    if (!intent.hash) throw new Error('A hashless request cannot be uniquely bound without its wallet nonce or original request identity. It remains unresolved. Verify a matching invoice payment separately; that does not resolve this request.');
    const state = await verify(intent);
    write({ ...intent, hash, state });
    return state;
  });
}
export function findUnresolvedWalletIntent(hash: Hex) {
  if (typeof localStorage === 'undefined') return undefined;
  return readAll().find((row) => unresolved(row) && row.hash?.toLowerCase() === hash.toLowerCase());
}
export function getWalletIntents() { return snapshot; }
export function useWalletIntents() { return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getWalletIntents, getWalletIntents); }
if (typeof window !== 'undefined') window.addEventListener('storage', refresh);
refresh();
