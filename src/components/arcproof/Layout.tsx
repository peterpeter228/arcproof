/**
 * Layout.tsx — App shell with header nav and prototype banner.
 * Arc Light aesthetic: ivory background, dark readable type, teal accent.
 * No emojis, no invented data, no marketing copy.
 */
import React from 'react';
import { ConnectKitButton } from 'connectkit';

type NavTab = 'dashboard' | 'verify' | 'evidence';

interface LayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export function PrototypeBanner() {
  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
      <p className="text-xs font-medium text-amber-800 tracking-wide">
        Prototype &bull; not deployed &bull; test assets only &bull; no real funds
      </p>
    </div>
  );
}

export function AtomicForwardingWarning() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
      <strong>Notice:</strong> This contract uses atomic forwarding — funds are passed directly
      to the merchant in the same transaction. The contract is not a custodian, escrow, or
      intermediary, but it does touch funds. It is not audited, not production-ready, and
      provides no escrow, delivery proof, or refund mechanism.
    </div>
  );
}

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'dashboard', label: 'Invoices' },
  { id: 'verify', label: 'Verify receipt' },
  { id: 'evidence', label: 'Evidence' },
];

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-stone-50 font-sans">
      <PrototypeBanner />

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:h-14 sm:py-0 sm:flex sm:justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded bg-teal-600" aria-hidden />
            <span className="font-display font-semibold text-stone-900 tracking-tight text-sm">
              ArcProof
            </span>
          </div>

          {/* Nav */}
          <nav className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-1 sm:justify-start">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === item.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Wallet */}
          <div className="col-start-2 row-start-1 justify-self-end shrink-0">
            <ConnectKitButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 text-xs text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>ArcProof prototype &mdash; G1 reviewed, not audited</span>
          <span>Grant eligibility: HOLD</span>
          <span>No real deployment</span>
        </div>
      </footer>
    </div>
  );
}
