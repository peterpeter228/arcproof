import { formatUnits } from 'viem';
import type { ReceiptExportRecord } from '../../arcproof/exportUtils';

/** Display and downloads share this exact record. Unknown is not zero. */
export function ReceiptFacts({ record }: { record: ReceiptExportRecord }) {
  let paidAt = 'Unknown';
  if (record.paidAt && /^\d+$/.test(record.paidAt)) {
    const milliseconds = Number(record.paidAt) * 1000;
    if (Number.isSafeInteger(milliseconds) && !Number.isNaN(new Date(milliseconds).valueOf())) {
      paidAt = new Date(milliseconds).toISOString();
    }
  }
  const fee = record.gasFeeNative != null && /^\d+$/.test(record.gasFeeNative)
    ? `${formatUnits(BigInt(record.gasFeeNative), 18)} test USDC` : 'Unknown (not available from this receipt)';
  const evidence = record.settlementEvidence;
  return <>
    <p className="text-2xl font-semibold break-words" data-receipt-field="amountDisplay">{record.amountDisplay === null ? 'Unknown amount' : `${record.amountDisplay} test USDC`}</p>
    <dl className="space-y-3 text-sm">
      <div><dt className="font-semibold">Merchant</dt><dd className="font-mono break-all" data-receipt-field="merchant">{record.merchant ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">Payer</dt><dd className="font-mono break-all" data-receipt-field="payer">{record.payer ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">Payment time (UTC)</dt><dd data-receipt-field="paidAt">{paidAt}</dd></div>
      <div><dt className="font-semibold">Actual transaction fee (separate from invoice amount)</dt><dd data-receipt-field="gasFeeNative">{fee}</dd></div>
    </dl>
    {record.controlled_demo && <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">controlled_demo · Controlled self-demo: payer and merchant are the same wallet. Not customer revenue or a two-wallet acceptance test.</p>}
    <div className="text-sm space-y-1">
      <p>Native settlement: {evidence ? `payer → contract (log ${evidence.payerToContractLogIndex}); contract → merchant (log ${evidence.contractToMerchantLogIndex})` : 'Not verified; two transfer legs are not established.'}</p>
      <p>Finality: {evidence ? `checked finalized block ${evidence.finalizedBlockNumber}` : 'Not established by this result.'}</p>
    </div>
    <details className="text-xs break-all space-y-2 receipt-details">
      <summary className="cursor-pointer py-2 font-semibold">Raw receipt details</summary>
      <dl className="space-y-2">
        <div><dt>Chain / deployment</dt><dd>{record.chainId} / {record.deploymentId}</dd></div>
        <div><dt>Contract</dt><dd>{record.contract}</dd></div>
        <div><dt>Invoice ID</dt><dd>{record.invoiceId}</dd></div>
        <div><dt>Amount (native units, 18 decimals)</dt><dd>{record.amountNative ?? 'Unknown'}</dd></div>
        <div><dt>Payment time (Unix seconds)</dt><dd>{record.paidAt ?? 'Unknown'}</dd></div>
        <div><dt>Actual fee (native units)</dt><dd>{record.gasFeeNative ?? 'Unknown'}</dd></div>
        <div><dt>Payment block / InvoicePaid log index</dt><dd>{record.paidBlockNumber ?? 'Unknown'} / {record.paymentLogIndex ?? 'Unknown'}</dd></div>
        <div><dt>Block hash</dt><dd>{record.blockHash ?? 'Unknown'}</dd></div>
        <div><dt>Settlement policy</dt><dd>{evidence?.policyId ?? 'Not established'}</dd></div>
        <div><dt>Finalized block hash</dt><dd>{evidence?.finalizedBlockHash ?? 'Not established'}</dd></div>
      </dl>
    </details>
  </>;
}
