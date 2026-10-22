import { BUILD_NETWORK, TESTNET_CONTEXT } from '../../arcproof/networkPolicy';

/** No provider, storage, RPC or wallet hooks: unconfigured mainnet is inert. */
export function NetworkUnavailable({ routeChainId, routeDeploymentId }: { routeChainId?: number; routeDeploymentId?: string }) {
  const knownTestnetLink = TESTNET_CONTEXT.manifest.some(row => row.chainId === routeChainId && row.deploymentId === routeDeploymentId);
  return <section className="ap-card mx-auto max-w-2xl space-y-4 border-amber-200 p-6" aria-labelledby="network-unavailable-title">
    <p className="ap-chip-caution">Private readiness preview · read only</p>
    <h2 id="network-unavailable-title" className="text-2xl font-semibold text-stone-900">Mainnet unavailable: no trusted deployment</h2>
    {knownTestnetLink && <p role="status">This link identifies a known Arc Testnet deployment, but this build is locked to Arc Mainnet. It cannot change networks or verify testnet receipts here.</p>}
    <p>{BUILD_NETWORK.label} ({BUILD_NETWORK.chain.id}) uses real USDC. This private build has no accepted mainnet contract. Creation, payment, wallet connection and receipt verification are disabled.</p>
    <p>Choosing a network does not prove deployment or settlement. A testnet address, imported receipt or URL cannot enable mainnet operations.</p>
    <p className="text-sm text-stone-600">Saved testnet requests are left untouched. Reopen the testnet build to inspect them; do not clear storage or resend an uncertain request.</p>
    <div className="flex flex-wrap gap-3"><a className="ap-btn-primary" href="#/demo">Try the isolated offline demo</a><a className="ap-btn-secondary" href="#/">What ArcProof does</a></div>
    <p className="text-sm text-stone-600">Not deployed, not audited, not production-ready. No real funds were moved by this preview.</p>
  </section>;
}
