// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoReceipt } from '../../components/arcproof/DemoReceipt';
import { OFFLINE_FIXTURE } from '../offlineFixture';
import { classifyDeployment } from '../networkPolicy';
import type { ReceiptExportRecord } from '../exportUtils';
import { FIXTURE_MANIFEST, PRODUCTION_MANIFEST } from '../manifest';

const id = `0x${'a'.repeat(64)}`;
let host: HTMLDivElement, root: Root, blobs: Blob[];
const clipboard = vi.fn<(value: string) => Promise<void>>();
function button(text: string) { return [...host.querySelectorAll('button')].find(b => b.textContent === text)!; }
function readBlob(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : ''); r.onerror = reject; r.readAsText(blob); }); }
// Real CSV parsing, including quoted multiline fields, rather than split(',').
function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = '', quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quote && text[i + 1] === '"') { cell += '"'; i++; } else quote = !quote; }
    else if (!quote && (c === ',' || c === '\n')) { row.push(cell); cell = ''; if (c === '\n') { rows.push(row); row = []; } }
    else cell += c;
  }
  row.push(cell); rows.push(row); return rows;
}
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  blobs = []; clipboard.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:test'; }) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(<DemoReceipt invoiceId={id} amount={200000000000000000n} onClose={() => {}} />));
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
describe('Actual DemoReceipt export actions preserve the Schema 1.2 synthetic boundary', () => {
  it('registers the same offline identity without creating a production deployment', () => {
    const fixture = FIXTURE_MANIFEST.find(row => row.deploymentId === OFFLINE_FIXTURE.deploymentId);
    expect(fixture).toBeDefined(); expect(classifyDeployment(fixture!)).toBe('fixture');
    expect(PRODUCTION_MANIFEST.some(row => row.deploymentId === OFFLINE_FIXTURE.deploymentId)).toBe(false);
  });
  it('downloads the public builder record with all observed fact fields null, not UI sample values', async () => {
    act(() => button('Export simulated JSON').click());
    const [record] = JSON.parse(await readBlob(blobs[0])) as (ReceiptExportRecord & Record<string, unknown>)[];
    expect(record).toMatchObject({ schemaVersion: '1.2', mode: 'fixture', chainId: OFFLINE_FIXTURE.chainId,
      deploymentId: OFFLINE_FIXTURE.deploymentId, invoiceId: id, contractAddress: OFFLINE_FIXTURE.contract,
      verificationVerified: false, verificationStatus: 'SIMULATED_NOT_VERIFIED', verifiedEvidence: null, importedVerified: false });
    for (const key of ['amountNative', 'amountDisplay', 'payer', 'merchant', 'txHash', 'transactionHash', 'paidAt',
      'paidBlockNumber', 'blockNumber', 'blockHash', 'paymentLogIndex', 'gasFeeNative', 'observedReceipt', 'observedInvoice',
      'readStartedAt', 'readCompletedAt', 'source', 'observationScope']) expect(record[key], key).toBeNull();
    expect(record).not.toHaveProperty('settlementEvidence');
    expect(host.textContent).toContain('Example amount: 0.20 test USDC');
    expect(host.textContent).toContain(OFFLINE_FIXTURE.merchant);
    expect(host.textContent).toContain('Download requested'); expect(host.textContent).not.toContain('saved successfully');
  });
  it('uses byte-identical JSON/CSV in download, clipboard and selectable readonly fallback', async () => {
    for (const kind of ['JSON', 'CSV']) {
      act(() => button(`Export simulated ${kind}`).click());
      const downloaded = await readBlob(blobs[blobs.length - 1]);
      await act(async () => { button(`Copy ${kind}`).click(); await Promise.resolve(); });
      expect(clipboard).toHaveBeenLastCalledWith(downloaded);
      expect(host.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${kind} export text"]`)?.value).toBe(downloaded);
      expect(host.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${kind} export text"]`)?.readOnly).toBe(true);
      if (kind === 'CSV') { const [headers, cells] = parseCsv(downloaded); expect(headers).toHaveLength(41); expect(cells).toHaveLength(41); const values = Object.fromEntries(headers.map((name, i) => [name, cells[i]])); expect(values).toMatchObject({ schemaVersion: '1.2', mode: 'fixture', amountNative: '', merchant: '', verificationVerified: 'false' }); }
    }
  });
  it('keeps all export text selectable when both download and Clipboard API fail', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('sandbox'); });
    clipboard.mockRejectedValue(new Error('denied'));
    act(() => button('Export simulated JSON').click());
    await act(async () => { button('Copy JSON').click(); await Promise.resolve(); });
    expect(host.textContent).toContain('select');
    const text = host.querySelector<HTMLTextAreaElement>('textarea[aria-label="JSON export text"]')!;
    expect(text.closest('details')?.open).toBe(true); expect((JSON.parse(text.value) as ReceiptExportRecord[])[0].mode).toBe('fixture');
    act(() => { text.focus(); text.select(); }); expect(text.selectionEnd).toBe(text.value.length);
  });
});
