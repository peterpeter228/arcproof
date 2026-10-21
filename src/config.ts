/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { BUILD_NETWORK } from './arcproof/networkPolicy'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [BUILD_NETWORK.chain], // Fixed allowlisted build network; no URL-selected transport.
  connectors: BUILD_NETWORK.writesEnabled ? [injected()] : [],
  multiInjectedProviderDiscovery: BUILD_NETWORK.writesEnabled,
  storage: BUILD_NETWORK.writesEnabled ? undefined : null,
  transports: {
    [BUILD_NETWORK.chain.id]: http(BUILD_NETWORK.chain.rpcUrls.default.http[0], { retryCount: 0, timeout: 15_000 }),
  },
})
