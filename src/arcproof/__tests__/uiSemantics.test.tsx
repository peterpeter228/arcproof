// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- Promise-based offline mocks. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import mainSource from '../../main.tsx?raw';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS } from '../testnet';
import type { Session, PreparedAction } from '../testnetClient';
const mocks = vi.hoisted(() => ({ session: null as Session | null, prepare: vi.fn(), send: vi.fn(), provider: vi.fn(), requests: [] as unknown[], load: vi.fn() }));
vi.mock('connectkit', () => ({ ConnectKitButton: () => <button>Connect wallet</button> }));
vi.mock('../useTestnetWallet', () => ({ useTestnetWallet: () => ({ session: mocks.session, sessionKey: 'test', getSession: () => mocks.session, getProvider: mocks.provider }) }));
vi.mock('../submissions', async () => ({ ...await vi.importActual<typeof import('../submissions')>('../submissions'), useSubmissions: () => [], useSubmissionRequests: () => mocks.requests }));
vi.mock('../walletIntents', async () => ({ ...await vi.importActual<typeof import('../walletIntents')>('../walletIntents'), useWalletIntents: () => [] }));
vi.mock('../testnetClient', async () => ({ ...await vi.importActual<typeof import('../testnetClient')>('../testnetClient'), prepareCreate: mocks.prepare, sendPreparedAction: mocks.send, loadInvoice: mocks.load }));
import { Layout } from '../../components/arcproof/Layout';
import { TestnetDashboard, TestnetPayScreen, TestnetReceiptScreen } from '../../components/arcproof/TestnetScreens';
const session: Session = { account: '0x8888888888888888888888888888888888888888', chainId: ARC_TESTNET.id, connectionVersion: 1 };
const action: PreparedAction = { kind: 'create', session, deployment: TESTNET_DEPLOYMENT, to: TESTNET_DEPLOYMENT.contractAddress,
  data: '0x', value: 0n, gas: 100n, gasPrice: 1n, feeEstimate: 100n, preparedAt: 0, amountNative: 200000000000000000n, expiresAt: 2000000000n };
let host: HTMLDivElement, root: Root;
const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.includes(label))!;
async function render(node: React.ReactNode) { await act(async () => { root.render(node); }); }
async function submit() { await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); mocks.requests = []; mocks.session = null; mocks.prepare.mockResolvedValue(action);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
it('has one h1, one current navigation item, and a keyboard skip target', async () => {
  const change = vi.fn(); await render(<Layout activeTab="verify" onTabChange={change} hideWallet><p>Receipt</p></Layout>);
  expect(host.querySelectorAll('h1')).toHaveLength(1); expect(host.querySelector('h1')?.textContent).toContain('ArcProof');
  const current = host.querySelectorAll('nav [aria-current="page"]'); expect(current).toHaveLength(1); expect(current[0].textContent).toBe('Verify receipt');
  const originalHash = window.location.hash;
  await act(async () => { host.querySelector<HTMLAnchorElement>('.skip-link')!.click(); });
  expect(document.activeElement).toBe(host.querySelector('main')); expect(window.location.hash).toBe(originalHash);
  await act(async () => { button('Evidence').click(); }); expect(change).toHaveBeenCalledWith('evidence');
  expect(host.textContent).not.toContain('Connect wallet');
});
it('retains the original Studio link and logo in a flow footer without inline positioning', async () => {
  await render(<Layout activeTab="dashboard" onTabChange={() => {}}><p>Invoice</p></Layout>);
  const attribution = host.querySelector<HTMLAnchorElement>('footer .studio-attribution')!;
  expect(attribution.href).toBe('https://studio.arc.io/'); expect(attribution.textContent).toContain('Built with Arc Studio');
  expect(attribution.querySelector('svg path')).not.toBeNull(); expect(attribution.style.position).toBe('');
  expect(mainSource).not.toContain('StudioWatermark'); expect(mainSource).not.toContain("position: 'fixed'");
});
it('places the task first, condenses duplicate warnings, and keeps testnet truth visible', async () => {
  await render(<Layout activeTab="dashboard" onTabChange={() => {}}><TestnetDashboard /></Layout>);
  expect(host.textContent?.match(/no monetary value/g)).toHaveLength(1);
  expect(host.textContent).toContain('mainnet disabled'); expect(host.textContent).toContain('not audited');
  expect(host.querySelector('main form h2')?.textContent).toBe('Create a testnet invoice');
  expect(host.querySelector('main')?.textContent).not.toContain('This contract uses atomic forwarding');
  expect(host.querySelector('#testnet-amount')?.getAttribute('inputmode')).toBe('decimal');
  expect(host.querySelector('#testnet-expiry')?.getAttribute('inputmode')).toBe('numeric');
});
it('form submit cannot bypass disconnected/disabled guards and never directly sends', async () => {
  await render(<TestnetDashboard />); await submit(); expect(mocks.prepare).not.toHaveBeenCalled();
  mocks.session = session; await render(<TestnetDashboard />); await submit();
  expect(mocks.prepare).toHaveBeenCalledTimes(1); expect(mocks.provider).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  expect(host.querySelector('[aria-label="Review testnet transaction"]')?.textContent).toContain('This contract uses atomic forwarding');
  expect(host.textContent).toContain('does touch funds'); expect(host.textContent).toContain('no escrow, delivery proof, or refund mechanism');
  await submit(); expect(mocks.prepare).toHaveBeenCalledTimes(1);
  expect(button('Open wallet').type).toBe('button'); expect(button('Cancel review').type).toBe('button');
});
it('connects create errors to both inputs without converting errors to success', async () => {
  mocks.session = session; mocks.prepare.mockRejectedValue(Error('Amount has too many decimals'));
  await render(<TestnetDashboard />); await submit();
  const error = host.querySelector('#create-error'); expect(error?.getAttribute('role')).toBe('alert');
  for (const id of ['testnet-amount', 'testnet-expiry']) expect(host.querySelector(`#${id}`)?.getAttribute('aria-describedby')).toContain('create-error');
  expect(host.textContent).not.toContain('Invoice created on Arc Testnet'); expect(mocks.send).not.toHaveBeenCalled();
});
it('keeps unresolved request warnings visible and read-only receipt validation associated', async () => {
  mocks.requests = [{}];
  await render(<Layout activeTab="verify" onTabChange={() => {}} hideWallet><TestnetReceiptScreen /></Layout>);
  expect(host.querySelector('aside [role="status"]')?.textContent).toContain('Do not refresh this page or submit again');
  await submit();
  expect(host.querySelector('#receipt-error')?.textContent).toContain('32 bytes');
  expect(host.querySelector('#live-receipt-id')?.getAttribute('aria-describedby')).toBe('receipt-error');
  expect(host.querySelector('#live-receipt-id')?.getAttribute('aria-invalid')).toBe('true');
  expect(mocks.send).not.toHaveBeenCalled();
});
it('keeps payment state live and links its error to the review control', async () => {
  mocks.load.mockRejectedValue(Error('Chain unavailable'));
  await render(<TestnetPayScreen invoiceId={`0x${'a'.repeat(64)}`} />);
  expect(button('Review test payment').getAttribute('aria-describedby')).toBe('pay-error');
  expect(host.querySelector('#pay-error')?.getAttribute('role')).toBe('alert'); expect(button('Review test payment').disabled).toBe(true);
  mocks.load.mockResolvedValue({ invoiceId: `0x${'b'.repeat(64)}`, merchant: session.account, amountNative: action.amountNative, expiresAt: action.expiresAt, termsHash: ZERO_TERMS, paid: false, payer: session.account, paidAt: 0n, paidBlockNumber: 0n });
  await render(<TestnetPayScreen invoiceId={`0x${'b'.repeat(64)}`} />);
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Unpaid according to contract state');
});
it('defines focus, minimum control height, wrapping and attribution print rules (CSS inspection only)', () => {
  const css = process.getBuiltinModule('fs').readFileSync(`${process.cwd()}/src/index.css`, 'utf8');
  expect(css).toContain(':focus-visible'); expect(css).toContain('outline: 3px solid #0f766e'); expect(css).toContain('min-height: 2.75rem');
  expect(css).toContain('input { min-width: 0; max-width: 100%; }'); expect(css).toContain('overflow-wrap: anywhere');
  expect(css).toContain('.app-footer { display: block !important'); expect(css).toContain('.footer-metadata { display: none !important');
  const attributionRule = css.slice(css.indexOf('.studio-attribution {\n'), css.indexOf('.studio-attribution svg'));
  expect(attributionRule).not.toContain('position: fixed'); expect(attributionRule).not.toContain('z-index');
});
it('explicit key foreground/background pairs exceed 4.5:1 (not full WCAG certification)', () => {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [foreground, background] of [['#57534e', '#ffffff'], ['#1b3158', '#ffffff'], ['#78350f', '#fffbeb'], ['#ffffff', '#0f766e']]) {
    const a = luminance(foreground), b = luminance(background); expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
