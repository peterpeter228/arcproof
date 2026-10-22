/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { BUILD_NETWORK, canWriteContext } from './arcproof/networkPolicy'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [BUILD_NETWORK.chain], // Fixed allowlisted build network; no URL-selected transport.
  connectors: canWriteContext(BUILD_NETWORK) ? [injected()] : [],
  multiInjectedProviderDiscovery: canWriteContext(BUILD_NETWORK),
  storage: canWriteContext(BUILD_NETWORK) ? undefined : null,
  transports: {
    [BUILD_NETWORK.chain.id]: http(BUILD_NETWORK.chain.rpcUrls.default.http[0], { retryCount: 0, timeout: 15_000 }),
  },
})
