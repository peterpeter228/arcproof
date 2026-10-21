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
import { isBytes32 } from './arcproof/testnet';
import { BUILD_NETWORK } from './arcproof/networkPolicy';
import { NetworkUnavailable } from './components/arcproof/NetworkUnavailable';
import { resolveDeployment } from './arcproof/manifest';

import { DashboardScreen } from './components/arcproof/DashboardScreen';
import { parseHash, type HashRoute, type NavTab } from './arcproof/routes';

export default function App() {
  const [route, setRoute] = useState<HashRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleTabChange(tab: NavTab) {
    window.location.hash = tab === 'dashboard' ? '/invoices' : `/${tab}`;
    setRoute(parseHash(window.location.hash));
  }

  // Determine what to render
  let content: React.ReactNode;
  let effectiveTab: NavTab = route.screen === 'dashboard' ? 'dashboard' : route.screen === 'demo' ? 'demo' : route.screen === 'evidence' ? 'evidence' : 'verify';
  let hideWallet = true;

  if (BUILD_NETWORK.key === 'mainnet' && route.screen !== 'demo' && route.screen !== 'evidence' && route.screen !== 'invalid') {
    content = <NetworkUnavailable routeChainId={route.chainId} routeDeploymentId={route.deploymentId} />;
    hideWallet = true;
  } else if (route.screen === 'pay') {
    const deployment = resolveDeployment(BUILD_NETWORK.manifest, route.chainId!, route.deploymentId!);
    const validPay = deployment && route.invoiceId && isBytes32(route.invoiceId) && (route.txHash === undefined || isBytes32(route.txHash));
    hideWallet = !validPay;
    content = (
      validPay ? <TestnetPayScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}`} invoiceId={route.invoiceId!} /> : <PayScreen
        chainId={route.chainId}
        deploymentId={route.deploymentId}
        invoiceId={route.invoiceId}
        txHash={route.txHash}
      />
    );
    effectiveTab = 'dashboard'; // no specific tab
  } else if (route.screen === 'receipt') {
    const deployment = resolveDeployment(BUILD_NETWORK.manifest, route.chainId!, route.deploymentId!);
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
    switch (route.screen) {
      case 'dashboard':
        hideWallet = false;
        content = <TestnetDashboard />;
        break;
      case 'verify':
        content = <TestnetReceiptScreen />;
        break;
      case 'demo':
        content = <DashboardScreen />;
        break;
      case 'invalid':
        content = <section role="alert"><h2>Unavailable route</h2><p>This link is not recognized. No wallet action or chain request was made.</p><a href="#/verify">Open read-only verification</a></section>;
        break;
      case 'evidence':
        content = <EvidenceScreen />;
        break;
    }
  }

  return (
    <Layout activeTab={effectiveTab} onTabChange={handleTabChange} hideWallet={hideWallet} hideSavedActivity={route.screen === 'demo' || BUILD_NETWORK.key === 'mainnet'}>
      {content}
    </Layout>
  );
}
