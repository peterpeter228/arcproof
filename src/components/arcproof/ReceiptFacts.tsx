import { formatUnits } from 'viem';
import { RECEIPT_CSV_IMPORT_NOTICE, type ReceiptExportRecord } from '../../arcproof/exportUtils';
import { receiptCurrencyLabel } from '../../arcproof/receiptCurrency';

function readTime(milliseconds: number | null | undefined): string {
  if (milliseconds == null || !Number.isSafeInteger(milliseconds)) return 'Unknown';
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? 'Unknown' : date.toISOString();
}

/** Display and downloads share this exact record. Unknown is not zero. */
export function ReceiptFacts({ record }: { record: ReceiptExportRecord }) {
  const currency = receiptCurrencyLabel(record);
  let paidAt = 'Unknown';
  if (record.paidAt && /^\d+$/.test(record.paidAt)) {
    const milliseconds = Number(record.paidAt) * 1000;
    if (Number.isSafeInteger(milliseconds) && !Number.isNaN(new Date(milliseconds).valueOf())) {
      paidAt = new Date(milliseconds).toISOString();
    }
  }
  const fee = record.gasFeeNative != null && /^\d+$/.test(record.gasFeeNative)
    ? `${formatUnits(BigInt(record.gasFeeNative), 18)} ${currency}` : 'Unknown (not available from this receipt)';
  const evidence = record.verificationVerified === false ? undefined : record.verifiedEvidence ?? record.settlementEvidence;
  const hasDiagnostics = record.schemaVersion === '1.2';
  // Schema version describes the envelope, not how its values were obtained.
  const observedFacts = record.factsBasis === 'identity_bound_rpc_observation';
  const legacyFacts = record.factsBasis === 'legacy_caller_supplied';
  const identityIds = ['chain', 'runtime_code', 'receipt_identity', 'transaction_identity', 'payment_event', 'invoice_state', 'event_and_value', 'payment_block'];
  const identityChecks = identityIds.map(id => record.checks?.find(check => check.id === id));
  const identitySummary = identityChecks.every(check => check?.status === 'passed') ? 'Passed' :
    identityIds.flatMap((id, index) => {
      const check = identityChecks[index];
      return check?.status === 'passed' ? [] : [`${id.replace(/_/g, ' ')}: ${check ? check.status.replace(/_/g, ' ') : 'not recorded'}`];
    }).join('; ');
  const factLabel = observedFacts ? 'Observed' : legacyFacts ? 'Legacy caller-supplied' : 'Unattributed';
  return <>
    {!observedFacts && <p className="text-sm text-amber-900" data-receipt-field="factsBasis">
      {legacyFacts ? 'Legacy caller-supplied values: provenance is not established by an identity-bound RPC snapshot.' : 'Provenance unavailable: these values have no established identity-bound RPC observation basis.'}
    </p>}
    {hasDiagnostics && <p className="text-sm font-semibold">{factLabel} invoice amount</p>}
    <p className={`receipt-amount font-semibold break-words tabular ${evidence ? 'text-stone-900' : 'receipt-amount-unverified'}`} data-receipt-field="amountDisplay">{record.amountDisplay === null ? 'Unknown amount' : `${record.amountDisplay} ${currency}`}</p>
    <dl className="space-y-3 text-sm">
      <div><dt className="font-semibold">Merchant</dt><dd className="font-mono break-all" data-receipt-field="merchant">{record.merchant ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">Payer</dt><dd className="font-mono break-all" data-receipt-field="payer">{record.payer ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">Payment time (UTC)</dt><dd data-receipt-field="paidAt">{paidAt}</dd></div>
      <div><dt className="font-semibold">{factLabel} transaction fee (separate from invoice amount; not settlement proof)</dt><dd data-receipt-field="gasFeeNative">{fee}</dd></div>
    </dl>
    {record.controlled_demo && <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">controlled_demo · Controlled self-demo: payer and merchant are the same wallet. Not customer revenue or a two-wallet acceptance test.</p>}
    <section className="text-sm space-y-2" aria-label="Evidence summary">
      <h4 className="font-semibold">Evidence checked</h4>
      <p>Invoice and transaction match: {identitySummary}</p>
    <div className="text-sm space-y-1">
      <p>Native settlement: {evidence ? `payer → contract (log ${evidence.payerToContractLogIndex}); contract → merchant (log ${evidence.contractToMerchantLogIndex})` : 'Not verified; two transfer legs are not established.'}</p>
      <p>Finality: {evidence ? `checked finalized block ${evidence.finalizedBlockNumber}` : 'Not established by this result.'}</p>
    </div>
    </section>
    <div className="text-sm space-y-2" aria-label="Next step">
      <h4 className="font-semibold">Next step</h4>
      <p>{evidence ? 'Share the verification link or export this record for independent checking. This verifies on-chain payment only, not delivery, legal identity, refunds, or revenue.' : 'Payment is not verified. Review the missing or failed checks below, check wallet history, and verify again when evidence is available. Do not resend an unresolved payment.'}</p>
      {!evidence && record.message && <p className="text-amber-900">{record.message}</p>}
    </div>
    <p className="text-sm text-stone-600" data-receipt-field="csvImportNotice">{RECEIPT_CSV_IMPORT_NOTICE}</p>
    <details className="text-sm break-all space-y-3 receipt-details">
      <summary className="cursor-pointer py-2 font-semibold">Evidence details and raw receipt</summary>
    {hasDiagnostics && <section className="space-y-2 text-sm" aria-label="Verification diagnostics">
      <p className="font-semibold">Verification reason: <span data-receipt-field="reasonCode">{record.reasonCode ?? record.verificationStatus}</span></p>
      <p data-receipt-field="message">{record.message ?? 'No diagnostic message available.'}</p>
      <dl className="space-y-1 break-words">
        <div><dt className="font-semibold">Evidence source</dt><dd data-receipt-field="source">{record.source?.label ?? 'Unknown'}</dd></div>
        <div><dt>Read started (UTC)</dt><dd data-receipt-field="readStartedAt">{readTime(record.readStartedAt)}</dd></div>
        <div><dt>Read completed (UTC)</dt><dd data-receipt-field="readCompletedAt">{readTime(record.readCompletedAt)}</dd></div>
      </dl>
      <p>{observedFacts ? 'RPC observations are not settlement or finality proof.' : 'These supplied fields are not identity-bound RPC observations.'} A successful transaction status alone does not verify the payment.</p>
      {record.checks && record.checks.length > 0 && <details>
        <summary className="cursor-pointer font-semibold py-2">Individual verification checks</summary>
        <ul className="space-y-2">
          {record.checks.map((check) => <li key={check.id} className="break-words">
            <span className="font-semibold">{check.id.replace(/_/g, ' ')}: {check.status.replace(/_/g, ' ')}</span>
            {check.reasonCode && <span> · {check.reasonCode}</span>}
            {check.message && <p>{check.message}</p>}
          </li>)}
        </ul>
      </details>}
    </section>}
    {hasDiagnostics && <dl className="space-y-2 text-sm break-all" aria-label={`${factLabel} receipt inclusion`}>
      <div><dt className="font-semibold">{factLabel} transaction block</dt><dd data-receipt-field="observedBlockNumber">{record.observedReceipt?.blockNumber ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">{factLabel} block hash</dt><dd data-receipt-field="observedBlockHash">{record.observedReceipt?.blockHash ?? 'Unknown'}</dd></div>
      <div><dt className="font-semibold">Fact provenance</dt><dd>{record.factsBasis?.replace(/_/g, ' ') ?? 'Unknown'}</dd></div>
    </dl>}
      <dl className="space-y-2">
        <div><dt>Chain / deployment</dt><dd>{record.chainId} / {record.deploymentId}</dd></div>
        <div><dt>Contract</dt><dd>{record.contract}</dd></div>
        <div><dt>Invoice ID</dt><dd>{record.invoiceId}</dd></div>
        <div><dt>Amount (native units, 18 decimals)</dt><dd>{record.amountNative ?? 'Unknown'}</dd></div>
        <div><dt>Payment time (Unix seconds)</dt><dd>{record.paidAt ?? 'Unknown'}</dd></div>
        <div><dt>{factLabel} fee (native units)</dt><dd>{record.gasFeeNative ?? 'Unknown'}</dd></div>
        <div><dt>Payment block / InvoicePaid log index</dt><dd>{record.paidBlockNumber ?? 'Unknown'} / {record.paymentLogIndex ?? 'Unknown'}</dd></div>
        <div><dt>{factLabel} block hash</dt><dd>{record.blockHash ?? 'Unknown'}</dd></div>
        <div><dt>Settlement policy</dt><dd>{evidence?.policyId ?? 'Not established'}</dd></div>
        <div><dt>Finalized block hash</dt><dd>{evidence?.finalizedBlockHash ?? 'Not established'}</dd></div>
      </dl>
    </details>
  </>;
}
