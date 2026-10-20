/**
 * preparedPayment.ts
 * PreparedPayment binds all context needed for a payInvoice call.
 * Any change to account/chain/invoice/deployment/contract/connectionVersion
 * invalidates the binding.
 *
 * This module is pure logic (no React hooks). UI adapters handle wagmi integration.
 * Actual signing is DISABLED until a trusted deployment exists in the manifest.
 */
import { encodeFunctionData } from 'viem';
import { ARCPROOF_ABI } from './arcproofAbi';
import type { DeploymentRecord } from './manifest';

export interface InvoiceSnapshot {
  invoiceId: `0x${string}`;
  merchant: `0x${string}`;
  amountNative: bigint;
  expiresAt: bigint;
  termsHash: `0x${string}`;
  paid: boolean;
}

export interface PreparedPayment {
  /** All context fields — if any change, this object must be discarded */
  chainId: number;
  deploymentId: string;
  contract: `0x${string}`;
  payer: `0x${string}`;
  invoiceId: `0x${string}`;
  value: bigint;
  calldata: `0x${string}`;
  /** Monotone version — increment on every wallet reconnect to invalidate stale async results */
  connectionVersion: number;
  /** Snapshot of invoice state at preparation time */
  invoiceSnapshot: InvoiceSnapshot;
  /** Unix ms when this was prepared */
  preparedAt: number;
}

export type PrepareError =
  | { code: 'NOT_DEPLOYED'; message: string }
  | { code: 'NONZERO_TERMS'; message: string }
  | { code: 'ALREADY_PAID'; message: string }
  | { code: 'EXPIRED'; message: string }
  | { code: 'NO_DEPLOYMENT'; message: string };

/**
 * Prepare a payment. Returns PrepareError if preconditions fail.
 * SIGNING IS DISABLED: this only produces the prepared structure for UI display
 * and simulation — actual wallet request requires a non-null trusted deployment.
 *
 * calldata and value are derived from the trusted deployment and fresh invoice;
 * no caller-supplied calldata or value is accepted.
 */
export function preparePayment(
  deployment: DeploymentRecord | null,
  payer: `0x${string}`,
  invoice: InvoiceSnapshot,
  connectionVersion: number,
  nowSeconds: number,
): PreparedPayment | PrepareError {
  if (!deployment) {
    return { code: 'NO_DEPLOYMENT', message: 'No trusted deployment found for this chain/deploymentId' };
  }
  if (invoice.paid) {
    return { code: 'ALREADY_PAID', message: 'This invoice has already been paid' };
  }
  if (Number(invoice.expiresAt) <= nowSeconds) {
    return { code: 'EXPIRED', message: 'This invoice has expired' };
  }
  // P0: UI-layer gate for nonzero termsHash (contract allows it; P0 UI blocks it)
  if (invoice.termsHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return {
      code: 'NONZERO_TERMS',
      message: 'UNSUPPORTED_TERMS: This invoice has attached terms that this UI version does not support',
    };
  }

  // Derive calldata from the frozen ABI — no caller-supplied data
  const calldata = encodeFunctionData({
    abi: ARCPROOF_ABI,
    functionName: 'payInvoice',
    args: [invoice.invoiceId],
  });

  return {
    chainId: deployment.chainId,
    deploymentId: deployment.deploymentId,
    contract: deployment.contractAddress,
    payer,
    invoiceId: invoice.invoiceId,
    // value is derived only from the trusted fresh invoice — not from URL or localStorage
    value: invoice.amountNative,
    calldata,
    connectionVersion,
    invoiceSnapshot: { ...invoice },
    preparedAt: Date.now(),
  };
}

export function isPrepareError(x: PreparedPayment | PrepareError): x is PrepareError {
  return 'code' in x && !('calldata' in x);
}

/**
 * Validate that a PreparedPayment is still consistent with the current context.
 * Returns null if valid, or a string describing what changed.
 *
 * Checks all seven binding fields:
 *   chainId, deploymentId, contract, payer, invoiceId, connectionVersion,
 *   plus invoice liveness (not paid, not expired, amount unchanged).
 *
 * currentDeploymentId and currentContract come from the currently active
 * DeploymentRecord, not from the prepared object itself.
 */
export function validatePaymentContext(
  prepared: PreparedPayment,
  currentChainId: number,
  currentPayer: `0x${string}`,
  currentConnectionVersion: number,
  currentDeploymentId: string,
  currentContract: `0x${string}`,
  freshInvoice: InvoiceSnapshot,
  nowSeconds: number,
): string | null {
  if (prepared.chainId !== currentChainId)
    return 'Chain has changed since payment was prepared';
  if (prepared.payer.toLowerCase() !== currentPayer.toLowerCase())
    return 'Connected account has changed since payment was prepared';
  if (prepared.connectionVersion !== currentConnectionVersion)
    return 'Wallet connection has changed since payment was prepared';
  // Compare prepared.deploymentId to the CURRENT deploymentId — not to itself
  if (prepared.deploymentId !== currentDeploymentId)
    return 'Deployment has changed since payment was prepared';
  // Compare prepared.contract to the CURRENT trusted contract address
  if (prepared.contract.toLowerCase() !== currentContract.toLowerCase())
    return 'Contract address has changed since payment was prepared';
  if (prepared.invoiceId !== freshInvoice.invoiceId)
    return 'Invoice ID has changed';
  if (freshInvoice.termsHash !== '0x' + '0'.repeat(64))
    return 'UNSUPPORTED_TERMS: Fresh invoice has nonzero terms';
  if (freshInvoice.paid)
    return 'Invoice was paid between preparation and confirmation';
  if (Number(freshInvoice.expiresAt) <= nowSeconds)
    return 'Invoice expired between preparation and confirmation';
  if (freshInvoice.merchant.toLowerCase() !== prepared.invoiceSnapshot.merchant.toLowerCase() ||
      freshInvoice.expiresAt !== prepared.invoiceSnapshot.expiresAt ||
      freshInvoice.termsHash !== prepared.invoiceSnapshot.termsHash)
    return 'Immutable invoice terms changed';
  if (freshInvoice.amountNative !== prepared.invoiceSnapshot.amountNative)
    return 'Invoice amount changed (should be impossible for immutable contract)';
  // Re-derive calldata from fresh invoice and verify it matches the prepared calldata
  const expectedCalldata = encodeFunctionData({
    abi: ARCPROOF_ABI,
    functionName: 'payInvoice',
    args: [freshInvoice.invoiceId],
  });
  if (prepared.calldata.toLowerCase() !== expectedCalldata.toLowerCase())
    return 'Prepared calldata does not match re-derived calldata for fresh invoice';
  // Re-verify value matches fresh invoice amount
  if (prepared.value !== freshInvoice.amountNative)
    return 'Prepared value does not match fresh invoice amount';
  return null;
}
