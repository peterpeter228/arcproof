/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { ARC_TESTNET } from './arcproof/testnet'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [ARC_TESTNET], // Dedicated testnet build. No mainnet/ENS transport.
  connectors: [injected()],
  transports: {
    [ARC_TESTNET.id]: http(ARC_TESTNET.rpcUrls.default.http[0]),
  },
})
