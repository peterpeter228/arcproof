// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- React act uses promise callbacks. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { WalletIntent } from '../walletIntents';
import type { Submission } from '../submissions';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../testnet';
const mocks = vi.hoisted(() => ({ intents: [] as WalletIntent[], submissions: [] as Submission[], recover: vi.fn() }));
vi.mock('connectkit', () => ({ ConnectKitButton: () => null }));
vi.mock('../testnetClient', () => ({ getNetworkService: () => ({ recoverUnknownSubmission: mocks.recover, reconcileSubmission: vi.fn(), errorMessage: (e: Error) => e.message, client: {}, submissions: { useSubmissions: () => mocks.submissions, useSubmissionRequests: () => [] }, intents: { useWalletIntents: () => mocks.intents } }) }));
import { Layout } from '../../components/arcproof/Layout';
const hash = `0x${'a'.repeat(64)}` as const;
const intent: WalletIntent = { operationId: '11111111-1111-4111-8111-111111111111', chainId: ARC_TESTNET.id, deploymentId: TESTNET_DEPLOYMENT.deploymentId, kind: 'pay', invoiceId: hash, account: `0x${'1'.repeat(40)}`, to: TESTNET_DEPLOYMENT.contractAddress, data: '0x12345678', value: '1', state: 'uncertain' };
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.intents = []; mocks.submissions = []; vi.clearAllMocks();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
async function render() { await act(async () => { root.render(<Layout activeTab="verify" hideWallet onTabChange={() => {}}><p>Receipt</p></Layout>); }); }
it('hashless payment offers separate receipt verification, never a request recovery claim', async () => {
  mocks.intents = [intent]; await render();
  const aside = host.querySelector('aside')!;
  expect(aside.textContent).toContain('does not identify or resolve this original request');
  expect([...aside.querySelectorAll('button')].some(b => b.textContent?.includes('Recover'))).toBe(false);
  const link = aside.querySelector<HTMLAnchorElement>('a[href^="#/receipt/"]')!;
  expect(link.getAttribute('href')).toBe(`#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${hash}`);
  expect(mocks.recover).not.toHaveBeenCalled();
});
it('hashless creation has no candidate recovery control', async () => {
  mocks.intents = [{ ...intent, kind: 'create', invoiceId: undefined }]; await render();
  expect(host.querySelector('aside input')).toBeNull();
  expect(host.querySelector('aside')?.textContent).toContain('remains unresolved');
});
it('known saved hash recovery retains an explicit non-settlement message', async () => {
  mocks.intents = [{ ...intent, hash, state: 'submitted' }]; mocks.recover.mockResolvedValue('included'); await render();
  const button = [...host.querySelectorAll('aside button')].find(b => b.textContent?.includes('Recover')) as HTMLButtonElement;
  await act(async () => { button.click(); });
  expect(mocks.recover).toHaveBeenCalledWith({}, intent.operationId, hash);
  expect(host.textContent).toContain('Known saved hash status: included');
  expect(host.textContent).toContain('not verified settlement');
});
it('shows every unresolved saved transaction outside collapsed completed history', async () => {
  mocks.submissions = [
    { hash, kind: 'pay', account: intent.account, state: 'included' },
    { hash: `0x${'b'.repeat(64)}`, kind: 'pay', account: intent.account, state: 'submitted' },
    { hash: `0x${'c'.repeat(64)}`, kind: 'create', account: intent.account, state: 'submitted' },
  ];
  await render();
  const aside = host.querySelector('aside')!;
  const submitted = [...aside.querySelectorAll('a')].filter(a => a.textContent !== hash);
  expect(submitted).toHaveLength(2);
  for (const link of submitted) expect(link.closest('details')).toBeNull();
  const history = aside.querySelector('details')!;
  expect(history.textContent).toContain(hash); expect(history.open).toBe(false);
});

it('memory-only callback hash has copy, Explorer and independent verification but never offers doomed recovery', async () => {
  mocks.intents = [{ ...intent, hash, state: 'submitted', hashPersistence: 'memory-only' }];
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await render();
  const aside = host.querySelector('aside')!;
  expect(aside.textContent).toContain('saving it failed');
  expect([...aside.querySelectorAll('button')].some(b => b.textContent?.includes('Recover'))).toBe(false);
  const copy = [...aside.querySelectorAll('button')].find(b => b.textContent?.includes('Copy original'))!;
  await act(async () => { copy.click(); });
  expect(writeText).toHaveBeenCalledExactlyOnceWith(hash);
  expect(aside.querySelector('a[href^="https://explorer.testnet.arc.io/tx/"]')?.getAttribute('href')).toBe(`https://explorer.testnet.arc.io/tx/${hash}`);
  expect(aside.querySelector('a[href^="#/receipt/"]')?.getAttribute('href')).toContain(`?tx=${hash}`);
  expect(mocks.recover).not.toHaveBeenCalled();
});
