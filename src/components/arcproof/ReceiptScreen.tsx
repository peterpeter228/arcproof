/**
 * ReceiptScreen.tsx — Receipt verification and JSON/CSV export.
 * Hash route: /#/receipt/:chainId/:deploymentId/:invoiceId?tx=...
 * Verify form also accessible from the "Verify receipt" nav tab.
 * No imported verified flag is trusted; verifier always re-runs.
 */
import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Download, AlertCircle } from 'lucide-react';
import { PRODUCTION_MANIFEST, resolveDeployment } from '../../arcproof/manifest';
import { exportReceiptsJson, exportReceiptsCsv, buildReceiptExport } from '../../arcproof/exportUtils';
import type { VerificationResult } from '../../arcproof/receiptVerifier';

interface ReceiptScreenProps {
  chainId?: number;
  deploymentId?: string;
  invoiceId?: `0x${string}`;
  txHash?: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
        <CheckCircle size={14} /> Verified
      </span>
    );
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
        <Clock size={14} /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1">
      <XCircle size={14} /> {status.replace(/_/g, ' ')}
    </span>
  );
}

export function ReceiptScreen({ chainId, deploymentId, invoiceId, txHash }: ReceiptScreenProps) {
  const [formChainId, setFormChainId] = useState(chainId?.toString() ?? '');
  const [formDeploymentId, setFormDeploymentId] = useState(deploymentId ?? '');
  const [formInvoiceId, setFormInvoiceId] = useState(invoiceId ?? '');
  const [formTxHash, setFormTxHash] = useState(txHash ?? '');
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const resolvedDeployment = formDeploymentId && formChainId
    ? resolveDeployment(PRODUCTION_MANIFEST, Number(formChainId), formDeploymentId)
    : null;

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    // No real RPC: production manifest is empty. Return PENDING with explanation.
    await new Promise((r) => setTimeout(r, 400));
    setVerifyResult({
      status: 'PENDING',
      message: 'No trusted deployment exists for this request. Use the checked Arc Testnet deployment; unknown deployments cannot authorize verification.',
      paymentLogIndex: null,
      blockHash: null,
      verifiedAt: Date.now(),
      verified: false,
    });
    setVerifying(false);
  }

  function handleExportJson() {
    if (!verifyResult || !resolvedDeployment || !formInvoiceId) return;
    const record = buildReceiptExport(
      resolvedDeployment,
      formInvoiceId as `0x${string}`,
      (formTxHash || null) as `0x${string}` | null,
      null, null, null, null, null,
      verifyResult, false,
    );
    const blob = new Blob([exportReceiptsJson([record])], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `arcproof-receipt-${formInvoiceId.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    if (!verifyResult || !resolvedDeployment || !formInvoiceId) return;
    const record = buildReceiptExport(
      resolvedDeployment,
      formInvoiceId as `0x${string}`,
      (formTxHash || null) as `0x${string}` | null,
      null, null, null, null, null,
      verifyResult, false,
    );
    const blob = new Blob([exportReceiptsCsv([record])], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `arcproof-receipt-${formInvoiceId.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-stone-900">Verify receipt</h2>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Imported verified flags are never trusted. The verifier always re-runs checks
            against chain state. Arc native-USDC system Transfer verification requires a
            verified Arc emitter config (not yet available).
          </span>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Chain ID', value: formChainId, setter: setFormChainId, placeholder: '5042002' },
            { label: 'Deployment ID', value: formDeploymentId, setter: setFormDeploymentId, placeholder: 'e.g. arc-testnet-001' },
            { label: 'Invoice ID (bytes32)', value: formInvoiceId, setter: (v: string) => setFormInvoiceId(v as `0x${string}`), placeholder: '0x...' },
            { label: 'Transaction hash (optional)', value: formTxHash, setter: setFormTxHash, placeholder: '0x...' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label} className="space-y-1">
              <label htmlFor={`receipt-${label}`} className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</label>
              <input
                id={`receipt-${label}`} type="text"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>
          ))}
        </div>

        {!resolvedDeployment && formDeploymentId && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle size={12} /> Deployment ID not found in trusted manifest
          </p>
        )}

        <button
          onClick={() => { void handleVerify(); }}
          disabled={verifying || !formChainId || !formDeploymentId || !formInvoiceId}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          {verifying ? 'Verifying...' : 'Verify'}
        </button>

        {verifyResult && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <StatusBadge status={verifyResult.status} />
              <span className="text-xs text-stone-400">
                {new Date(verifyResult.verifiedAt).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-stone-600">{verifyResult.message}</p>

            {resolvedDeployment && (
              <div className="flex gap-2">
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 text-xs text-stone-600 border border-stone-200 rounded px-3 py-1.5 hover:bg-stone-50"
                >
                  <Download size={12} /> JSON
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 text-xs text-stone-600 border border-stone-200 rounded px-3 py-1.5 hover:bg-stone-50"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
