// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise the real wagmi config, not a mocked App or ConnectKit component.
vi.mock('../networkPolicy', async () => {
  const actual = await vi.importActual<typeof import('../networkPolicy')>('../networkPolicy');
  return { ...actual, BUILD_NETWORK: actual.MAINNET_CONTEXT };
});

beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('Actual mainnet wallet bootstrap remains inert', () => {
  it('ignores EIP-6963 discovery, provider announcements and wallet connect events', async () => {
    const account = `0x${'1'.repeat(40)}`;
    const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
    const request = vi.fn(({ method }: { method: string }) => Promise.resolve(method === 'eth_chainId' ? '0x13b2' : [account]));
    const provider = {
      request,
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const listeners = handlers.get(event) ?? new Set();
        listeners.add(listener); handlers.set(event, listeners);
      }),
      removeListener: vi.fn((event: string, listener: (...args: unknown[]) => void) => { handlers.get(event)?.delete(listener); }),
    };
    const detail = {
      info: { uuid: '11111111-1111-4111-8111-111111111111', name: 'Offline test provider', icon: 'data:image/svg+xml,<svg/>', rdns: 'review.invalid' },
      provider,
    };
    const announce = () => { window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail })); };
    const discovery = vi.fn(announce);
    window.addEventListener('eip6963:requestProvider', discovery);
    try {
      const { config } = await import('../../config');
      announce(); // Late discovery must remain disabled too.
      await Promise.resolve();
      for (const handler of handlers.get('connect') ?? []) handler({ chainId: '0x13b2' });
      for (const handler of handlers.get('accountsChanged') ?? []) handler([account]);
      await Promise.resolve(); await Promise.resolve();

      expect(config.chains.map((chain) => chain.id)).toEqual([5042]);
      expect(config.connectors).toEqual([]);
      expect(config.state.status).toBe('disconnected');
      expect(config.state.connections.size).toBe(0);
      expect(discovery).not.toHaveBeenCalled();
      expect(provider.on).not.toHaveBeenCalled();
      expect(request).not.toHaveBeenCalled();
    } finally { window.removeEventListener('eip6963:requestProvider', discovery); }
  });

  it('does not read, replace or clear the shared historical wagmi wallet store', async () => {
    const previous = JSON.stringify({ state: { chainId: 5042002, current: 'historical-testnet-connector' }, version: 2 });
    localStorage.setItem('wagmi.store', previous);
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    const { config } = await import('../../config');
    await Promise.resolve();

    expect(config.storage).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(localStorage.getItem('wagmi.store')).toBe(previous);
  });
});
