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
import { TESTNET_MANIFEST } from './arcproof/testnet';
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

  if (parts[0] === 'pay' && parts[1] && parts[2] && parts[3]) {
    return {
      screen: 'pay',
      chainId: Number(parts[1]),
      deploymentId: parts[2],
      invoiceId: parts[3] as `0x${string}`,
    };
  }
  if (parts[0] === 'receipt' && parts[1] && parts[2] && parts[3]) {
    return {
      screen: 'receipt',
      chainId: Number(parts[1]),
      deploymentId: parts[2],
      invoiceId: parts[3] as `0x${string}`,
      txHash: params.get('tx') ?? undefined,
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

  if (route.screen === 'pay') {
    const deployment = resolveDeployment(TESTNET_MANIFEST, route.chainId!, route.deploymentId!);
    content = (
      deployment ? <TestnetPayScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}`} invoiceId={route.invoiceId!} /> : <PayScreen
        chainId={route.chainId!}
        deploymentId={route.deploymentId!}
        invoiceId={route.invoiceId!}
      />
    );
    effectiveTab = 'dashboard'; // no specific tab
  } else if (route.screen === 'receipt') {
    const deployment = resolveDeployment(TESTNET_MANIFEST, route.chainId!, route.deploymentId!);
    content = (
      deployment ? <TestnetReceiptScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}`} invoiceId={route.invoiceId} txHash={route.txHash} /> : <ReceiptScreen
        chainId={route.chainId}
        deploymentId={route.deploymentId}
        invoiceId={route.invoiceId}
        txHash={route.txHash}
      />
    );
    effectiveTab = 'verify';
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
    <Layout activeTab={effectiveTab} onTabChange={handleTabChange}>
      {content}
    </Layout>
  );
}
