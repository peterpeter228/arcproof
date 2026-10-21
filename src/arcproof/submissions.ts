import { useSyncExternalStore } from 'react';
import type { Hex, Address } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, isBytes32 } from './testnet';

export interface Submission {
  hash: Hex;
  kind: 'create' | 'pay';
  invoiceId?: Hex;
  account: Address;
  state: 'submitted' | 'included' | 'reverted';
}
const key = `arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:submissions`;
function normalize(row: Submission): Submission {
  return { ...row, hash: row.hash.toLowerCase() as Hex, invoiceId: row.invoiceId?.toLowerCase() as Hex | undefined };
}
function retain(rows: readonly Submission[]): Submission[] {
  let completed = 0;
  return rows.filter((row) => row.state === 'submitted' || completed++ < 20);
}
function fromStorage(): Submission[] {
  try {
    const legacy: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    const value: unknown[] = Array.isArray(legacy) ? [...(legacy as unknown[])] : [];
    for (let i = 0; i < localStorage.length; i++) {
      const entryKey = localStorage.key(i);
      if (entryKey?.startsWith(key + ':hash:')) value.push(JSON.parse(localStorage.getItem(entryKey) ?? 'null'));
    }
    const valid = value.filter((row: unknown): row is Submission =>
      !!row && typeof row === 'object' && 'hash' in row && typeof row.hash === 'string' && isBytes32(row.hash) &&
      'kind' in row && 'account' in row && 'state' in row &&
      (row.kind === 'create' || row.kind === 'pay') && /^0x[0-9a-fA-F]{40}$/.test(String(row.account)) &&
      (!('invoiceId' in row) || (typeof row.invoiceId === 'string' && isBytes32(row.invoiceId))) &&
      ['submitted', 'included', 'reverted'].includes(String(row.state))).map(normalize);
    const byHash = new Map<string, Submission>();
    for (const row of valid) byHash.set(row.hash, row);
    return retain([...byHash.values()].reverse());
  } catch { return []; }
}
// Storage is a locator only. Restored records remain visibly unverified and never
// authorize signing. Memory survives navigation even when persistence is denied.
let snapshot: readonly Submission[] = fromStorage();
const listeners = new Set<() => void>();
interface WalletSubmissionRequest { scope: string; state: 'requesting' | 'uncertain' }
let requests: readonly WalletSubmissionRequest[] = [];
function emitRequests(next: readonly WalletSubmissionRequest[]) {
  requests = next;
  listeners.forEach((listener) => listener());
}
export function beginSubmission(kind: Submission['kind'], account: Address, invoiceId?: Hex) {
  refreshFromStorage();
  const normalizedId = invoiceId?.toLowerCase();
  const scope = kind === 'pay' ? `pay:${normalizedId ?? ''}` : `create:${account.toLowerCase()}`;
  const pending = snapshot.some((row) => kind === 'pay'
    ? row.kind === 'pay' && row.invoiceId?.toLowerCase() === normalizedId && row.state !== 'reverted'
    : row.kind === 'create' && row.account.toLowerCase() === account.toLowerCase() && row.state === 'submitted');
  if (pending || requests.some((row) => row.scope === scope)) {
    throw new Error('An earlier wallet request for this invoice or account is unresolved. Check its transaction before trying again.');
  }
  emitRequests([...requests, { scope, state: 'requesting' }]);
  return {
    finish: () => emitRequests(requests.filter((row) => row.scope !== scope)),
    uncertain: () => emitRequests(requests.map((row) => row.scope === scope ? { ...row, state: 'uncertain' } : row)),
  };
}
export function recordSubmission(row: Submission): void {
  const normalized = normalize(row);
  refreshFromStorage();
  snapshot = retain([normalized, ...snapshot.filter((previous) => previous.hash !== normalized.hash)]);
  try { localStorage.setItem(key + ':hash:' + normalized.hash, JSON.stringify(normalized)); } catch { /* Do not discard in-memory evidence. */ }
  listeners.forEach((listener) => listener());
}
export function updateSubmission(hash: Hex, state: Submission['state']): void {
  const previous = snapshot.find((row) => row.hash.toLowerCase() === hash.toLowerCase());
  if (previous) recordSubmission({ ...previous, state });
}
function refreshFromStorage() {
  const merged = new Map(snapshot.map((row) => [row.hash, row]));
  for (const row of fromStorage()) merged.set(row.hash, row);
  snapshot = retain([...merged.values()]);
}
export function releaseRecoveredRequest(kind: Submission['kind'], account: Address, invoiceId?: Hex) {
  const scope = kind === 'pay' ? `pay:${invoiceId?.toLowerCase() ?? ''}` : `create:${account.toLowerCase()}`;
  emitRequests(requests.filter((row) => row.scope !== scope));
}
if (typeof window !== 'undefined') window.addEventListener('storage', () => { refreshFromStorage(); listeners.forEach((listener) => listener()); });
export function getSubmissions() { return snapshot; }
export function useSubmissions() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSubmissions, getSubmissions,
  );
}
export function useSubmissionRequests() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => requests, () => requests,
  );
}
