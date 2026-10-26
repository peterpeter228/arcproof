import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const sample = { chainId: 5042, deploymentId: 'closed-mainnet-fixture', invoiceId: `0x${'a'.repeat(64)}`, txHash: `0x${'b'.repeat(64)}` } as const;
const published = {
  chainId: 5042 as const,
  deploymentId: '0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa',
  invoiceId: '0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae' as const,
  txHash: '0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce' as const,
};
const publishedHref = `#/receipt/5042/${published.deploymentId}/${published.invoiceId}?tx=${published.txHash}`;
beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_ARCPROOF_NETWORK', 'mainnet'); });
afterEach(() => { vi.doUnmock('../manifest'); vi.doUnmock('../networkReleasePolicy'); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function closedRegistry() {
  vi.doMock('../manifest', async () => {
    const actual = await vi.importActual<typeof import('../manifest')>('../manifest');
    const { ARC_MAINNET_SETTLEMENT_POLICY } = await vi.importActual<typeof import('../arcSettlement')>('../arcSettlement');
    return { ...actual, PRODUCTION_MANIFEST: [{ chainId: 5042, deploymentId: sample.deploymentId,
      contractAddress: `0x${'c'.repeat(40)}`, runtimeCodeHash: `0x${'d'.repeat(64)}`,
      label: 'Synthetic registry test, not mainnet evidence', deployedAt: '2026-10-22T00:00:00Z', settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY }] };
  });
  vi.doMock('../networkReleasePolicy', () => ({ MAINNET_RELEASE_POLICY: { activeDeploymentId: sample.deploymentId, writesAccepted: false } }));
  return import('../mainnetSample');
}
describe('mainnet sample is a locator requiring fresh route verification', () => {
  it('publishes the paid mainnet locator and a receipt link, never an unknown deployment', async () => {
    const m = await import('../mainnetSample'); const { MainnetSampleEntry } = await import('../../components/arcproof/MainnetSampleEntry');
    expect(m.MAINNET_SAMPLE).toEqual(published); expect(m.mainnetSampleHref()).toBe(publishedHref); expect(m.mainnetSampleHref(sample)).toBeNull();
    const html = renderToStaticMarkup(<MainnetSampleEntry />);
    expect(html).toContain(`href="${publishedHref}"`); expect(html).toContain('Re-verify a mainnet sample'); expect(html).toContain('read-only verification');
    expect(html).not.toContain('disabled'); expect(html).not.toContain('no actual mainnet application payment');
  });
  it('a closed trusted synthetic registry produces only a receipt locator, never an RPC override or verified result', async () => {
    const m = await closedRegistry();
    expect(m.mainnetSampleHref(sample)).toBe(`#/receipt/5042/${sample.deploymentId}/${sample.invoiceId}?tx=${sample.txHash}`);
    expect(m.mainnetSampleHref({ ...sample, deploymentId: 'unknown' })).toBeNull();
    expect(m.mainnetSampleHref({ ...sample, txHash: '0xbad' })).toBeNull();
    expect(m.mainnetSampleHref(Object.assign({}, sample, { rpc: 'https://untrusted.invalid', verified: true }))).toBeNull();
    expect(m.mainnetSampleHref()).toBeNull();
    expect(m.MAINNET_SAMPLE).toEqual(published);
  });
});
