/**
 * PayScreen.tsx — Public payment page for hash route /#/pay/:chainId/:deploymentId/:invoiceId
 * Signing is DISABLED: no trusted deployment exists. Shows PreparedPayment fields
 * and explains why signing is blocked.
 */
import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ShieldOff } from 'lucide-react';
import { PRODUCTION_MANIFEST, resolveDeployment } from '../../arcproof/manifest';

interface PayScreenProps {
  chainId: number;
  deploymentId: string;
  invoiceId: `0x${string}`;
}

function AddressDisplay({ address, label }: { address: string; label: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</p>
      <p className="font-mono text-sm text-stone-900 break-all">{address}</p>
    </div>
  );
}

export function PayScreen({ chainId, deploymentId, invoiceId }: PayScreenProps) {
  const { isConnected, chainId: walletChainId } = useAccount();

  const deployment = useMemo(
    () => resolveDeployment(PRODUCTION_MANIFEST, chainId, deploymentId),
    [chainId, deploymentId],
  );

  const wrongChain = isConnected && walletChainId !== chainId;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* No deployment banner */}
      {!deployment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
          <ShieldOff size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>No trusted deployment found.</strong> The deployment ID in this URL is not
            in the trusted manifest. This page cannot be used to pay an invoice until a verified
            deployment is registered. Only checked-in manifest entries are trusted.
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-stone-200 p-5 space-y-3" aria-label="Unavailable invoice">
        <AddressDisplay address={invoiceId} label="Requested invoice ID (not verified)" />
        <p className="text-sm text-stone-700">Amount, recipient, expiry, and terms are unavailable. No invoice has been loaded from a trusted deployment.</p>
        <p className="text-sm text-stone-700">Requested chain: {chainId}. Requested deployment: {deploymentId}.</p>
      </section>

      {/* Chain warning */}
      {wrongChain && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your wallet is on chain {walletChainId}, but this invoice is for chain {chainId}. Switch networks before paying.
        </div>
      )}

      {/* Pay button — disabled, no deployment */}
      <button
        disabled
        className="w-full bg-stone-200 text-stone-400 rounded-lg py-3 text-sm font-medium cursor-not-allowed"
      >
        {!isConnected
          ? 'Connect wallet to pay'
          : !deployment
          ? 'No trusted deployment — signing disabled'
          : 'Pay invoice (deployment required)'}
      </button>

      <p className="text-xs text-stone-400 text-center leading-relaxed">
        Signing is disabled until a trusted deployment is registered in the manifest.
        No automatic rebroadcast. Once submitted, cancellation is not guaranteed.
      </p>
    </div>
  );
}
