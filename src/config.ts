/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { ARC_TESTNET } from './arcproof/testnet'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(ARC_TESTNET.id, ARC_TESTNET.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [ARC_TESTNET], // Dedicated testnet build. No mainnet/ENS transport.
  connectors: [injected()],
  transports: {
    [ARC_TESTNET.id]: http(ARC_TESTNET.rpcUrls.default.http[0]),
  },
})
