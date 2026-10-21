/**
 * App.tsx — ArcProof root component.
 * Hash-based routing: /#/pay/:chainId/:deploymentId/:invoiceId
 *                     /#/receipt/:chainId/:deploymentId/:invoiceId?tx=...
 * No React Router dependency — plain window.location.hash parsing.
 */
import { useState, useEffect } from 'react';
import { Layout } from './components/arcproof/Layout';
import { PayScreen } from './components/arcproof/PayScreen';
import { ReceiptScreen } from './components/arcproof/ReceiptScreen';
import { EvidenceScreen } from './components/arcproof/EvidenceScreen';
import { TestnetDashboard, TestnetPayScreen, TestnetReceiptScreen } from './components/arcproof/TestnetScreens';
import { TESTNET_MANIFEST, isBytes32 } from './arcproof/testnet';
import { resolveDeployment } from './arcproof/manifest';

type NavTab = 'dashboard' | 'verify' | 'evidence';

interface HashRoute {
  screen: 'pay' | 'receipt' | null;
  chainId?: number;
  deploymentId?: string;
  invoiceId?: `0x${string}`;
  txHash?: string;
}

function parseHash(hash: string): HashRoute {
  // Remove leading #
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search ?? '');
  const parts = pathname.split('/').filter(Boolean);

  // Keep malformed payment/receipt routes on a read-only error page, not the wallet dashboard.
  if (parts[0] === 'pay' || parts[0] === 'receipt') {
    return {
      screen: parts[0],
      chainId: parts[1] && /^[0-9]+$/.test(parts[1]) ? Number(parts[1]) : undefined,
      deploymentId: parts[2],
      invoiceId: (parts.length === 4 ? parts[3] : undefined) as `0x${string}` | undefined,
      txHash: params.has('tx') ? (params.getAll('tx').length === 1 ? params.get('tx')! : '') : undefined,
    };
  }
  return { screen: null };
}

export default function App() {
  const [route, setRoute] = useState<HashRoute>(() => parseHash(window.location.hash));
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleTabChange(tab: NavTab) {
    setActiveTab(tab);
    // Clear hash route when navigating via tab
    if (route.screen) {
      window.location.hash = '';
      setRoute({ screen: null });
    }
  }

  // Determine what to render
  let content: React.ReactNode;
  let effectiveTab: NavTab = activeTab;
  let hideWallet = activeTab === 'verify';

  if (route.screen === 'pay') {
    const deployment = resolveDeployment(TESTNET_MANIFEST, route.chainId!, route.deploymentId!);
    hideWallet = !(deployment && route.invoiceId && isBytes32(route.invoiceId));
    content = (
      deployment && route.invoiceId && isBytes32(route.invoiceId) ? <TestnetPayScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}`} invoiceId={route.invoiceId} /> : <PayScreen
        chainId={route.chainId}
        deploymentId={route.deploymentId}
        invoiceId={route.invoiceId}
      />
    );
    effectiveTab = 'dashboard'; // no specific tab
  } else if (route.screen === 'receipt') {
    const deployment = resolveDeployment(TESTNET_MANIFEST, route.chainId!, route.deploymentId!);
    content = (
      deployment && route.invoiceId && isBytes32(route.invoiceId) && (route.txHash === undefined || isBytes32(route.txHash)) ? <TestnetReceiptScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}:${route.txHash ?? ""}`} invoiceId={route.invoiceId} txHash={route.txHash} /> : <ReceiptScreen
        chainId={route.chainId}
        deploymentId={route.deploymentId}
        invoiceId={route.invoiceId}
        txHash={route.txHash}
      />
    );
    effectiveTab = 'verify';
    hideWallet = true;
  } else {
    switch (activeTab) {
      case 'dashboard':
        content = <TestnetDashboard />;
        break;
      case 'verify':
        content = <TestnetReceiptScreen />;
        break;
      case 'evidence':
        content = <EvidenceScreen />;
        break;
    }
  }

  return (
    <Layout activeTab={effectiveTab} onTabChange={handleTabChange} hideWallet={hideWallet}>
      {content}
    </Layout>
  );
}
