import { ARC_TESTNET, TESTNET_MANIFEST, isBytes32 } from '../../arcproof/testnet';
import { resolveDeployment } from '../../arcproof/manifest';

export interface UnavailableRequestProps {
  chainId?: number;
  deploymentId?: string;
  invoiceId?: string;
  txHash?: string;
}

/** Immediate read-only fallback. Never attempts RPC, wallet connection or signing. */
export function UnavailableRequest({ chainId, deploymentId, invoiceId, txHash }: UnavailableRequestProps) {
  const reason = chainId !== ARC_TESTNET.id
    ? 'Unsupported network. Only the checked Arc Testnet deployment is available.'
    : !deploymentId || !resolveDeployment(TESTNET_MANIFEST, chainId, deploymentId)
      ? 'Unsupported deployment. This link is not in the trusted manifest.'
      : !invoiceId ? 'Missing invoice ID. Ask the sender for the complete link.'
        : !isBytes32(invoiceId) ? 'Invalid invoice ID. It must contain exactly 32 bytes.'
          : txHash !== undefined && !isBytes32(txHash) ? 'Invalid transaction hash. It must contain exactly 32 bytes.'
            : 'Unsupported request. No verification or payment has been attempted.';
  return <section className="ap-card max-w-xl mx-auto border-amber-200 p-5 space-y-3" aria-label="Unavailable request">
    <h2 className="font-semibold text-lg">Request unavailable</h2>
    <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{reason}</p>
    <p className="text-sm">No wallet is needed. Nothing is being submitted or awaited. URL parameters cannot authorize a new contract.</p>
    <dl className="text-sm break-all space-y-2">
      <div><dt className="ap-field-label">Requested chain</dt><dd>{Number.isSafeInteger(chainId) ? chainId : 'Missing or invalid'}</dd></div>
      <div><dt className="ap-field-label">Requested deployment (not verified)</dt><dd className="font-mono">{deploymentId || 'Missing'}</dd></div>
      <div><dt className="ap-field-label">Requested invoice (not verified)</dt><dd className="font-mono">{invoiceId || 'Missing'}</dd></div>
    </dl>
    <a className="ap-btn-secondary" href="#">Return to ArcProof</a>
  </section>;
}
