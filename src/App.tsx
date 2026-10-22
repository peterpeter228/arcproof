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
import { BUILD_NETWORK, canWriteContext, getDeploymentContext } from './arcproof/networkPolicy';
import { NetworkUnavailable } from './components/arcproof/NetworkUnavailable';


import { DashboardScreen } from './components/arcproof/DashboardScreen';
import { HomeScreen } from './components/arcproof/HomeScreen';
import { parseHash, type HashRoute, type NavTab } from './arcproof/routes';

const ROUTE_TITLES: Record<HashRoute['screen'], string> = {
  home: 'Verifiable USDC invoices', demo: 'Offline demo', verify: 'Verify receipt', dashboard: 'Create invoice',
  evidence: 'Evidence', pay: 'Payment request', receipt: 'Receipt', invalid: 'Unavailable route',
};

export default function App() {
  const [route, setRoute] = useState<HashRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    document.title = `${ROUTE_TITLES[route.screen]} · ArcProof`;
  }, [route.screen]);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleTabChange(tab: NavTab) {
    window.location.hash = tab === 'dashboard' ? '/invoices' : tab === 'home' ? '/' : `/${tab}`;
    setRoute(parseHash(window.location.hash));
    // Announce the new page to keyboard and screen-reader users instead of leaving focus on the tab.
    setTimeout(() => document.getElementById('main-content')?.focus(), 0);
  }

  // Determine what to render
  let content: React.ReactNode;
  let effectiveTab: NavTab = route.screen === 'dashboard' || route.screen === 'demo' || route.screen === 'evidence' || route.screen === 'home' ? route.screen : 'verify';
  let hideWallet = true;

  // Mainnet keeps only static, offline or historical surfaces until a trusted deployment exists.
  if (!BUILD_NETWORK.deployment && route.screen !== 'home' && route.screen !== 'demo' && route.screen !== 'evidence' && route.screen !== 'invalid') {
    content = <NetworkUnavailable routeChainId={route.chainId} routeDeploymentId={route.deploymentId} />;
    hideWallet = true;
  } else if (route.screen === 'pay') {
    const context = getDeploymentContext(BUILD_NETWORK, route.chainId!, route.deploymentId!);
    const validPay = context && route.invoiceId && isBytes32(route.invoiceId) && (route.txHash === undefined || isBytes32(route.txHash));
    hideWallet = !validPay || !canWriteContext(context);
    content = (
      validPay ? <TestnetPayScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}`} invoiceId={route.invoiceId!} context={context} /> : <PayScreen
        chainId={route.chainId}
        deploymentId={route.deploymentId}
        invoiceId={route.invoiceId}
        txHash={route.txHash}
      />
    );
    effectiveTab = 'dashboard'; // no specific tab
  } else if (route.screen === 'receipt') {
    const context = getDeploymentContext(BUILD_NETWORK, route.chainId!, route.deploymentId!);
    content = (
      context && route.invoiceId && isBytes32(route.invoiceId) && (route.txHash === undefined || isBytes32(route.txHash)) ? <TestnetReceiptScreen key={`${route.chainId}:${route.deploymentId}:${route.invoiceId}:${route.txHash ?? ""}`} invoiceId={route.invoiceId} txHash={route.txHash} context={context} /> : <ReceiptScreen
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
      case 'home':
        content = <HomeScreen />;
        break;
      case 'dashboard':
        hideWallet = !canWriteContext(BUILD_NETWORK);
        content = <TestnetDashboard context={BUILD_NETWORK} />;
        break;
      case 'verify':
        content = <TestnetReceiptScreen context={BUILD_NETWORK} />;
        break;
      case 'demo':
        content = <DashboardScreen />;
        break;
      case 'invalid':
        content = <section role="alert" className="ap-card mx-auto max-w-xl space-y-3 p-5"><h2 className="text-lg font-semibold">Unavailable route</h2><p>This link is not recognized. No wallet action or chain request was made.</p><a className="ap-link" href="#/">Go to the overview</a></section>;
        break;
      case 'evidence':
        content = <EvidenceScreen />;
        break;
    }
  }

  const activityContext = route.chainId && route.deploymentId ? getDeploymentContext(BUILD_NETWORK, route.chainId, route.deploymentId) ?? BUILD_NETWORK : BUILD_NETWORK;
  return (
    <Layout context={activityContext} activeTab={effectiveTab} onTabChange={handleTabChange} hideWallet={hideWallet} hideSavedActivity={route.screen === 'demo' || !BUILD_NETWORK.deployment}>
      {content}
    </Layout>
  );
}
