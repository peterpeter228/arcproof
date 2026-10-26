// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_ARCPROOF_NETWORK', 'mainnet'); localStorage.clear(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Mainnet wallet bootstrap matches the accepted W2 release', () => {
  it('uses an injected connector for Arc mainnet 5042 and does not send a transaction', async () => {
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
      announce();
      await Promise.resolve(); await Promise.resolve();
      expect(config.chains.map((chain) => chain.id)).toEqual([5042]);
      expect(config.connectors.length).toBeGreaterThan(0);
      expect(config.state.status).toBe('disconnected');
      expect(config.state.connections.size).toBe(0);
      expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'eth_sendTransaction' }));
    } finally { window.removeEventListener('eip6963:requestProvider', discovery); }
  });

  it('keeps the fixed chain on 5042 when a historical testnet wagmi store is present', async () => {
    const previous = JSON.stringify({ state: { chainId: 5042002, current: 'historical-testnet-connector' }, version: 2 });
    localStorage.setItem('wagmi.store', previous);
    const { config } = await import('../../config');
    await Promise.resolve();
    expect(config.chains.map((chain) => chain.id)).toEqual([5042]);
    expect(config.state.connections.size).toBe(0);
    expect(config.state.chainId).not.toBe(5042002);
  });
});
