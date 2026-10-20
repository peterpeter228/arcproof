import { useEffect, useState, useSyncExternalStore } from 'react';
import { useConfig } from 'wagmi';
import { getAccount, watchAccount } from '@wagmi/core';
import type { Session, WalletRequest } from './testnetClient';

interface ObservableProvider extends WalletRequest {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

/** External store makes invalidation synchronous, including before React rerenders. */
function sessionStore() {
  let snapshot: { session: Session | null; key: string } = { session: null, key: 'disconnected:0' };
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update: (account: ReturnType<typeof getAccount>) => {
      version += 1;
      snapshot = {
        session: account.isConnected && account.address && account.chainId
          ? { account: account.address, chainId: account.chainId, connectionVersion: version } : null,
        key: `${account.status}:${account.address ?? ''}:${account.chainId ?? ''}:${account.connector?.uid ?? ''}:${version}`,
      };
      listeners.forEach((listener) => listener());
    },
    invalidate: () => {
      version += 1;
      snapshot = { session: null, key: `invalidated:${version}` };
      listeners.forEach((listener) => listener());
    },
  };
}

export function useTestnetWallet() {
  const config = useConfig();
  const [store] = useState(sessionStore);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    let provider: ObservableProvider | undefined;
    let generation = 0;
    const invalidate = () => {
      store.invalidate();
      queueMicrotask(() => store.update(getAccount(config)));
    };
    const detach = () => {
      for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) provider?.removeListener?.(event, invalidate);
      provider = undefined;
    };
    const update = (account: ReturnType<typeof getAccount>) => {
      const token = ++generation;
      detach();
      store.update(account);
      if (account.connector) {
        void account.connector.getProvider().then((value) => {
          if (token !== generation) return;
          provider = value as ObservableProvider;
          provider.on?.('accountsChanged', invalidate);
          provider.on?.('chainChanged', invalidate);
          provider.on?.('disconnect', invalidate);
        }).catch(() => { /* Never request wallet access as recovery. */ });
      }
    };
    update(getAccount(config));
    const stop = watchAccount(config, { onChange: update });
    return () => { generation += 1; detach(); stop(); store.invalidate(); };
  }, [config, store]);

  return {
    session: state.session,
    sessionKey: state.key,
    getSession: () => {
      const session = store.getSnapshot().session;
      const account = getAccount(config);
      return session && account.isConnected && account.address?.toLowerCase() === session.account.toLowerCase() &&
        account.chainId === session.chainId ? session : null;
    },
    getProvider: async (): Promise<WalletRequest> => {
      const account = getAccount(config);
      if (!account.connector || !store.getSnapshot().session) throw new Error('Connect an ordinary EOA wallet first.');
      return await account.connector.getProvider() as WalletRequest;
    },
  };
}
