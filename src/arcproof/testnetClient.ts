import {
  createPublicClient, http, keccak256, encodeFunctionData, decodeEventLog, decodeFunctionData, toHex,
  type PublicClient, type Address, type Hex,
} from 'viem';
import { ARCPROOF_ABI } from './arcproofAbi';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS, assertTestnetDeployment, isBytes32 } from './testnet';
import type { DeploymentRecord } from './manifest';
import { invoiceCacheKey } from './manifest';
import { deriveInvoiceId, deriveInvoiceIds } from './invoiceId';
import { parseInvoiceAmount } from './amountParser';
import { preparePayment, isPrepareError, validatePaymentContext, type PreparedPayment } from './preparedPayment';
import { verifyReceipt, type RpcProvider, type OnchainInvoiceState, type VerificationResult } from './receiptVerifier';
import { receiptStatus } from './receiptStatus';
import { runWalletIntent, recoverWalletIntent, findUnresolvedWalletIntent } from './walletIntents';
import { beginSubmission, recordSubmission, updateSubmission, releaseRecoveredRequest, type Submission } from './submissions';

export const testnetClient = createPublicClient({
  chain: ARC_TESTNET,
  transport: http(ARC_TESTNET.rpcUrls.default.http[0], { retryCount: 0, timeout: 15_000 }),
});

export type LoadedInvoice = OnchainInvoiceState & { invoiceId: Hex };
export interface Session { account: Address; chainId: number; connectionVersion: number }
export interface WalletRequest {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
}
export interface PreparedAction {
  kind: 'create' | 'pay';
  session: Session;
  deployment: DeploymentRecord;
  to: Address;
  data: Hex;
  value: bigint;
  gas: bigint;
  gasPrice: bigint;
  feeEstimate: bigint;
  preparedAt: number;
  amountNative: bigint;
  expiresAt: bigint;
  payment?: PreparedPayment;
}

export function assertSameSession(expected: Session, actual: Session | null): void {
  if (!actual || actual.account.toLowerCase() !== expected.account.toLowerCase() ||
      actual.chainId !== ARC_TESTNET.id || actual.chainId !== expected.chainId ||
      actual.connectionVersion !== expected.connectionVersion) {
    throw new Error('Wallet context changed. Review a fresh request before signing.');
  }
}

export async function checkDeployment(client: PublicClient, deployment = TESTNET_DEPLOYMENT): Promise<void> {
  assertTestnetDeployment(deployment);
  if (await client.getChainId() !== ARC_TESTNET.id) throw new Error('RPC returned the wrong chain. No signing is allowed.');
  const code = await client.getCode({ address: deployment.contractAddress });
  if (!code || code === '0x' || keccak256(code).toLowerCase() !== deployment.runtimeCodeHash.toLowerCase()) {
    throw new Error('Runtime bytecode does not match the reviewed deployment. No signing is allowed.');
  }
}

export async function readInvoice(client: PublicClient, invoiceId: Hex, deployment = TESTNET_DEPLOYMENT): Promise<LoadedInvoice> {
  assertTestnetDeployment(deployment);
  if (!isBytes32(invoiceId)) throw new Error('Invoice ID must be a 32-byte hexadecimal value.');
  const invoice = await client.readContract({
    address: deployment.contractAddress, abi: ARCPROOF_ABI, functionName: 'getInvoice', args: [invoiceId],
  });
  if (/^0x0{40}$/i.test(invoice.merchant) || invoice.amountNative <= 0n ||
      invoice.amountNative > 10n ** 18n || invoice.amountNative % 10n ** 12n !== 0n) {
    throw new Error('Invalid invoice returned by RPC.');
  }
  return { ...invoice, invoiceId };
}

export async function loadInvoice(client: PublicClient, invoiceId: Hex, deployment = TESTNET_DEPLOYMENT): Promise<LoadedInvoice> {
  await checkDeployment(client, deployment);
  return readInvoice(client, invoiceId, deployment);
}

export async function loadHistory(client: PublicClient, merchant: Address, page = 0) {
  await checkDeployment(client);
  const nextNonce = await client.readContract({
    address: TESTNET_DEPLOYMENT.contractAddress, abi: ARCPROOF_ABI, functionName: 'nextNonce', args: [merchant],
  });
  const ids = deriveInvoiceIds(ARC_TESTNET.id, TESTNET_DEPLOYMENT.contractAddress, merchant, nextNonce, 20, page);
  const invoices = await Promise.all(ids.map(async ({ invoiceId }) => readInvoice(client, invoiceId)));
  if (invoices.some((invoice) => invoice.merchant.toLowerCase() !== merchant.toLowerCase())) {
    throw new Error('Invoice history merchant mismatch.');
  }
  return { nextNonce, invoices };
}

async function estimateAction(client: PublicClient, action: Omit<PreparedAction, 'gas' | 'gasPrice' | 'feeEstimate'>): Promise<PreparedAction> {
  if (action.session.chainId !== ARC_TESTNET.id) throw new Error('Switch your wallet to Arc Testnet first.');
  // EOA-only support. No smart-wallet calls or delegation-code assumptions.
  const accountCode = await client.getCode({ address: action.session.account });
  if (accountCode && accountCode !== '0x') throw new Error('Only ordinary EOA wallets are supported in this prototype.');
  await client.call({ account: action.session.account, to: action.to, data: action.data, value: action.value });
  const estimatedGas = await client.estimateGas({ account: action.session.account, to: action.to, data: action.data, value: action.value });
  const gas = estimatedGas * 120n / 100n;
  const gasPrice = await client.getGasPrice();
  const feeEstimate = gas * gasPrice;
  const balance = await client.getBalance({ address: action.session.account });
  if (balance < action.value + feeEstimate) throw new Error('Insufficient test USDC for the value plus estimated network fee.');
  return { ...action, gas, gasPrice, feeEstimate };
}

export async function prepareCreate(client: PublicClient, session: Session, amount: string, hours: number): Promise<PreparedAction> {
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new Error('Expiry must be 1–168 whole hours.');
  const amountNative = parseInvoiceAmount(amount);
  await checkDeployment(client);
  const block = await client.getBlock({ blockTag: 'latest' });
  const expiresAt = block.timestamp + BigInt(hours) * 3600n;
  const data = encodeFunctionData({
    abi: ARCPROOF_ABI, functionName: 'createInvoice', args: [amountNative, expiresAt, ZERO_TERMS],
  });
  return estimateAction(client, {
    kind: 'create', session: { ...session }, deployment: TESTNET_DEPLOYMENT,
    to: TESTNET_DEPLOYMENT.contractAddress, data, value: 0n, preparedAt: Date.now(), amountNative, expiresAt,
  });
}

export async function preparePay(client: PublicClient, session: Session, invoiceId: Hex): Promise<PreparedAction> {
  const invoice = await loadInvoice(client, invoiceId);
  const block = await client.getBlock({ blockTag: 'latest' });
  const payment = preparePayment(TESTNET_DEPLOYMENT, session.account, invoice, session.connectionVersion, Number(block.timestamp));
  if (isPrepareError(payment)) throw new Error(payment.message);
  const merchantCode = await client.getCode({ address: invoice.merchant });
  if (merchantCode && merchantCode !== '0x') throw new Error('Only ordinary EOA merchants are supported in this prototype.');
  return estimateAction(client, {
    kind: 'pay', session: { ...session }, deployment: TESTNET_DEPLOYMENT,
    to: payment.contract, data: payment.calldata, value: payment.value,
    preparedAt: Date.now(), amountNative: invoice.amountNative, expiresAt: invoice.expiresAt, payment,
  });
}

/**
 * Called ONLY by the confirmation button. Rechecks fresh chain, code, wallet,
 * invoice, simulation and balance. Exactly one send request, with explicit chain
 * and sender. Never retries a rejected/ambiguous submission automatically.
 */
export async function sendPreparedAction(
  client: PublicClient, wallet: WalletRequest, action: PreparedAction,
  getCurrentSession: () => Session | null,
): Promise<Hex> {
  return runWalletIntent({
    chainId: ARC_TESTNET.id, deploymentId: action.deployment.deploymentId,
    kind: action.kind, account: action.session.account, invoiceId: action.payment?.invoiceId,
    to: action.to, data: action.data, value: action.value.toString(),
  }, async (markRequested, markRejected) => {
    const lease = beginSubmission(action.kind, action.session.account, action.payment?.invoiceId);
    let attempted = false;
    let rejected = false;
    try {
      const hash = await sendPreparedActionOnce(client, wallet, action, getCurrentSession,
        () => { markRequested(); attempted = true; },
        () => { rejected = true; markRejected(); });
      recordSubmission({ hash, kind: action.kind, account: action.session.account, invoiceId: action.payment?.invoiceId, state: 'submitted' });
      lease.finish();
      return hash;
    } catch (error) {
      if (attempted && !rejected) lease.uncertain(); else lease.finish();
      throw error;
    }
  });
}

async function sendPreparedActionOnce(
  client: PublicClient, wallet: WalletRequest, action: PreparedAction,
  getCurrentSession: () => Session | null, onSend: () => void, onRejected: () => void,
): Promise<Hex> {
  const assertCurrent = () => assertSameSession(action.session, getCurrentSession());
  assertCurrent();
  if (Date.now() - action.preparedAt > 120_000) throw new Error('Review expired. Prepare a fresh request.');
  await checkDeployment(client, action.deployment);
  if (action.to.toLowerCase() !== TESTNET_DEPLOYMENT.contractAddress.toLowerCase()) throw new Error('Transaction target changed.');
  const block = await client.getBlock({ blockTag: 'latest' });
  if (action.kind === 'pay') {
    if (!action.payment) throw new Error('Missing payment preparation.');
    const freshInvoice = await readInvoice(client, action.payment.invoiceId);
    const merchantCode = await client.getCode({ address: freshInvoice.merchant });
    if (merchantCode && merchantCode !== '0x') throw new Error('Merchant is no longer an ordinary EOA. Prepare and review again.');
    const error = validatePaymentContext(action.payment, ARC_TESTNET.id, action.session.account,
      action.session.connectionVersion, TESTNET_DEPLOYMENT.deploymentId, TESTNET_DEPLOYMENT.contractAddress,
      freshInvoice, Number(block.timestamp));
    if (error) throw new Error(error);
    if (action.data !== action.payment.calldata || action.value !== freshInvoice.amountNative) throw new Error('Payment request changed.');
  } else {
    if (action.value !== 0n || action.expiresAt <= block.timestamp || action.expiresAt > block.timestamp + 604800n) throw new Error('Invalid creation request or expiry.');
    const expected = encodeFunctionData({ abi: ARCPROOF_ABI, functionName: 'createInvoice',
      args: [parseInvoiceAmount(formatExactAmount(action.amountNative)), action.expiresAt, ZERO_TERMS] });
    if (action.data !== expected) throw new Error('Creation request changed.');
  }
  const refreshed = await estimateAction(client, action);
  // Require another review if the estimated upper bound increased, never silently
  // replace the displayed fee with a higher one.
  if (refreshed.feeEstimate > action.feeEstimate || refreshed.gas > action.gas || refreshed.gasPrice > action.gasPrice) {
    throw new Error('Network gas or fee estimate increased. Prepare and review again.');
  }
  const [chainHex, accounts] = await Promise.all([
    wallet.request({ method: 'eth_chainId' }),
    wallet.request({ method: 'eth_accounts' }),
  ]);
  if (typeof chainHex !== 'string' || BigInt(chainHex) !== BigInt(ARC_TESTNET.id) ||
      !Array.isArray(accounts) || typeof accounts[0] !== 'string' ||
      accounts[0].toLowerCase() !== action.session.account.toLowerCase()) throw new Error('Wallet account or chain changed.');
  assertCurrent();
  if (Date.now() - action.preparedAt > 120_000) throw new Error('Review expired during preflight. Prepare a fresh request.');
  onSend();
  let hash: unknown;
  try { hash = await wallet.request({
    method: 'eth_sendTransaction',
    params: [{ from: action.session.account, chainId: toHex(ARC_TESTNET.id), to: action.to,
      data: action.data, value: toHex(action.value), gas: toHex(refreshed.gas), gasPrice: toHex(refreshed.gasPrice) }],
  }); } catch (error) {
    // Only a direct 4001 rejection of this exact send request releases its intent.
    if (error && typeof error === 'object' && 'code' in error && error.code === 4001) onRejected();
    throw error;
  }
  if (typeof hash !== 'string' || !isBytes32(hash)) throw new Error('Wallet returned no usable transaction hash. Check your wallet history; do not resend automatically.');
  return hash;
}

function formatExactAmount(native: bigint): string {
  if (native <= 0n || native > 10n ** 18n || native % 10n ** 12n !== 0n) throw new Error('Invalid amount.');
  const micro = native / 10n ** 12n;
  return `${micro / 1_000_000n}.${(micro % 1_000_000n).toString().padStart(6, '0')}`;
}

/** Bind the actual broadcast transaction before treating a receipt as its result. */
export async function checkBroadcast(client: PublicClient, action: PreparedAction, hash: Hex) {
  const tx = await client.getTransaction({ hash });
  if (tx.hash.toLowerCase() !== hash.toLowerCase() ||
      tx.from.toLowerCase() !== action.session.account.toLowerCase() ||
      tx.to?.toLowerCase() !== action.to.toLowerCase() || tx.input.toLowerCase() !== action.data.toLowerCase() ||
      tx.value !== action.value || tx.chainId !== ARC_TESTNET.id) {
    throw new Error('Broadcast transaction differs from the reviewed request. Do not resend; inspect wallet history.');
  }
}

export async function readCreatedInvoice(client: PublicClient, action: PreparedAction, hash: Hex): Promise<LoadedInvoice> {
  await checkBroadcast(client, action, hash);
  const receipt = await client.getTransactionReceipt({ hash });
  assertReceiptMatches(action, hash, receipt);
  if (receiptStatus(receipt.status) === 'unknown') throw new Error('Creation receipt status is unknown. Keep the request unresolved; do not resend.');
  if (receiptStatus(receipt.status) === 'reverted') throw new Error('Creation transaction reverted. Gas may have been spent.');
  const events = receipt.logs.filter((log) => log.address.toLowerCase() === action.to.toLowerCase()).flatMap((log) => {
    try {
      if (log.removed || log.transactionHash.toLowerCase() !== hash.toLowerCase() || log.blockHash !== receipt.blockHash ||
          log.blockNumber !== receipt.blockNumber) return [];
      const event = decodeEventLog({ abi: ARCPROOF_ABI, eventName: 'InvoiceCreated', data: log.data, topics: log.topics, strict: true });
      return [event.args];
    } catch { return []; }
  });
  if (events.length !== 1) throw new Error('Could not identify exactly one creation event.');
  const event = events[0];
  const expectedId = deriveInvoiceId(ARC_TESTNET.id, action.to, action.session.account, event.merchantNonce);
  if (event.invoiceId !== expectedId || event.merchant.toLowerCase() !== action.session.account.toLowerCase() ||
      event.amountNative !== action.amountNative || event.expiresAt !== action.expiresAt || event.termsHash !== ZERO_TERMS) {
    throw new Error('Created invoice event differs from reviewed terms.');
  }
  const invoice = await loadInvoice(client, event.invoiceId);
  if (invoice.merchant.toLowerCase() !== action.session.account.toLowerCase() ||
      invoice.amountNative !== action.amountNative || invoice.expiresAt !== action.expiresAt || invoice.termsHash !== ZERO_TERMS) {
    throw new Error('Read-back invoice differs from reviewed terms.');
  }
  return invoice;
}

export function assertReceiptMatches(
  action: PreparedAction, hash: Hex,
  receipt: { transactionHash: Hex; from: Address; to: Address | null },
): void {
  if (receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      receipt.from.toLowerCase() !== action.session.account.toLowerCase() ||
      receipt.to?.toLowerCase() !== action.to.toLowerCase()) {
    throw new Error(`Receipt differs from submitted transaction; a replacement may exist (${receipt.transactionHash}). Inspect wallet history; do not resend.`);
  }
}

export function receiptRpc(client: PublicClient, onInvoiceRead?: (invoice: LoadedInvoice) => void): RpcProvider {
  return {
    sourceLabel: 'Configured viem PublicClient (endpoint not exported)',
    getChainId: () => client.getChainId(),
    getContractCode: async (address) => (await client.getCode({ address })) ?? null,
    getInvoice: async (address, invoiceId) => {
      if (address.toLowerCase() !== TESTNET_DEPLOYMENT.contractAddress.toLowerCase()) throw new Error('Unknown contract');
      const invoice = await readInvoice(client, invoiceId);
      onInvoiceRead?.(invoice);
      return invoice;
    },
    getTransaction: async (hash) => {
      const tx = await client.getTransaction({ hash });
      return { hash: tx.hash, from: tx.from, to: tx.to, input: tx.input, value: tx.value, chainId: tx.chainId,
        blockHash: tx.blockHash, blockNumber: tx.blockNumber, transactionIndex: tx.transactionIndex };
    },
    getBlock: async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      return { number: block.number, hash: block.hash, timestamp: block.timestamp };
    },
    getFinalizedBlock: async () => {
      // Fail closed if this endpoint does not implement the finalized tag.
      const block = await client.getBlock({ blockTag: 'finalized' });
      return { number: block.number, hash: block.hash, timestamp: block.timestamp };
    },
    getTransactionReceipt: async (hash) => {
      const receipt = await client.getTransactionReceipt({ hash });
      // Do not discard inconsistent/reverted log provenance at the adapter boundary.
      // A receipt log must belong to this exact committed receipt before standard
      // verification can describe its event binding as passed.
      if (receipt.logs.some((log) => log.removed || log.blockHash !== receipt.blockHash ||
          log.blockNumber !== receipt.blockNumber || log.transactionHash.toLowerCase() !== receipt.transactionHash.toLowerCase())) {
        throw new Error('Receipt log provenance conflicts with the enclosing receipt. Verification is inconclusive.');
      }
      return { ...receipt, logs: receipt.logs.map((log) => ({
        address: log.address, topics: log.topics, data: log.data,
        logIndex: log.logIndex, transactionHash: log.transactionHash,
        blockHash: log.blockHash, blockNumber: log.blockNumber, removed: log.removed,
        transactionIndex: log.transactionIndex,
      })) };
    },
  };
}

/** No whole-chain scan: recover only the recorded paid block and exact invoice. */
export async function recoverPaymentHash(client: PublicClient, invoice: LoadedInvoice): Promise<Hex> {
  if (!invoice.paid || invoice.paidBlockNumber <= 0n) throw new Error('Invoice is not recorded as paid.');
  const logs = await client.getContractEvents({
    address: TESTNET_DEPLOYMENT.contractAddress, abi: ARCPROOF_ABI, eventName: 'InvoicePaid',
    args: { invoiceId: invoice.invoiceId }, fromBlock: invoice.paidBlockNumber, toBlock: invoice.paidBlockNumber, strict: true,
  });
  if (logs.length !== 1 || !logs[0].transactionHash) throw new Error('Payment recovery is inconclusive. Exactly one matching event is required.');
  return logs[0].transactionHash;
}

export async function verifyTestnetReceipt(client: PublicClient, invoiceId: Hex, suppliedHash?: Hex) {
  if (suppliedHash !== undefined && !isBytes32(suppliedHash)) throw new Error('Transaction hash must be a 32-byte hexadecimal value.');
  const invoice = await loadInvoice(client, invoiceId);
  const hash = suppliedHash || await recoverPaymentHash(client, invoice);
  let checkedInvoice: LoadedInvoice | undefined;
  const rpc = receiptRpc(client, (snapshot) => { checkedInvoice = snapshot; });
  const result = await verifyReceipt(hash, invoiceId, TESTNET_DEPLOYMENT, ARC_TESTNET.id, rpc);
  return { invoice: checkedInvoice ?? invoice, hash, result };
}

export function pendingVerification(message: string): VerificationResult {
  return { status: 'PENDING', message, verified: false, paymentLogIndex: null, blockHash: null, verifiedAt: Date.now() };
}

export function paymentCacheKey(invoiceId: Hex) {
  return invoiceCacheKey(ARC_TESTNET.id, TESTNET_DEPLOYMENT.deploymentId, invoiceId);
}

/** Storage is only a locator, never proof. Storage failures must not lose a shown hash. */
export function rememberPaymentHash(invoiceId: Hex, hash: Hex): void {
  try { localStorage.setItem(paymentCacheKey(invoiceId), hash); } catch { /* The visible hash remains available. */ }
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === 4001) return 'Wallet request rejected. No new transaction hash was returned.';
  if (error instanceof Error) return error.message.slice(0, 700);
  return 'Request failed. Check the network and wallet history before retrying.';
}

/** Read-only recovery for saved hashes. Never submits or retries a transaction. */
export async function reconcileSubmission(client: PublicClient, row: Submission): Promise<Submission['state']> {
  const intent = findUnresolvedWalletIntent(row.hash);
  if (intent) return recoverUnknownSubmission(client, intent.operationId, row.hash);
  await checkDeployment(client);
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: row.hash }), client.getTransactionReceipt({ hash: row.hash }),
  ]);
  if (tx.hash.toLowerCase() !== row.hash.toLowerCase() || receipt.transactionHash.toLowerCase() !== row.hash.toLowerCase() ||
      tx.chainId !== ARC_TESTNET.id || tx.from.toLowerCase() !== row.account.toLowerCase() ||
      receipt.from.toLowerCase() !== row.account.toLowerCase() ||
      tx.to?.toLowerCase() !== TESTNET_DEPLOYMENT.contractAddress.toLowerCase() ||
      receipt.to?.toLowerCase() !== TESTNET_DEPLOYMENT.contractAddress.toLowerCase()) {
    throw new Error('Saved transaction locator could not be bound to the checked deployment and wallet.');
  }
  const call = decodeFunctionData({ abi: ARCPROOF_ABI, data: tx.input });
  if ((row.kind === 'create' && call.functionName !== 'createInvoice') ||
      (row.kind === 'pay' && (call.functionName !== 'payInvoice' || call.args[0].toLowerCase() !== row.invoiceId?.toLowerCase()))) {
    throw new Error('Saved transaction function or invoice does not match.');
  }
  if (!tx.blockHash || tx.blockHash !== receipt.blockHash ||
      tx.blockNumber === null || tx.blockNumber === undefined || tx.blockNumber !== receipt.blockNumber ||
      tx.transactionIndex === null || tx.transactionIndex === undefined || tx.transactionIndex !== receipt.transactionIndex) {
    throw new Error('Saved transaction inclusion identity is missing or conflicting. Request stays unresolved.');
  }
  if (receiptStatus(receipt.status) === 'unknown') throw new Error('Receipt status is unknown. The saved request remains unresolved.');
  const state = receiptStatus(receipt.status) === 'reverted' ? 'reverted' : 'included';
  updateSubmission(row.hash, state);
  return state;
}

/** Recover only the exact saved call. Replacement/cancellation and cross-device recovery are deliberately unsupported. */
export async function recoverUnknownSubmission(client: PublicClient, operationId: string, hash: Hex, expectedState?: 'included' | 'reverted') {
  let matchedIntent: import('./walletIntents').WalletIntent | undefined;
  const state = await recoverWalletIntent(operationId, hash, async (intent) => {
    await checkDeployment(client);
    const [tx, receipt] = await Promise.all([client.getTransaction({ hash }), client.getTransactionReceipt({ hash })]);
    if (tx.hash.toLowerCase() !== hash.toLowerCase() || receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
        tx.chainId !== intent.chainId || tx.from.toLowerCase() !== intent.account.toLowerCase() ||
        receipt.from.toLowerCase() !== intent.account.toLowerCase() || tx.to?.toLowerCase() !== intent.to.toLowerCase() ||
        receipt.to?.toLowerCase() !== intent.to.toLowerCase() || tx.input.toLowerCase() !== intent.data.toLowerCase() ||
        tx.value.toString() !== intent.value || !tx.blockHash || tx.blockHash !== receipt.blockHash ||
        tx.blockNumber === null || tx.blockNumber === undefined || tx.blockNumber !== receipt.blockNumber ||
        tx.transactionIndex === null || tx.transactionIndex === undefined || tx.transactionIndex !== receipt.transactionIndex) {
      throw new Error('Hash does not match the saved call and committed transaction identity. Request stays unresolved.');
    }
    const status = receiptStatus(receipt.status);
    if (status === 'unknown') throw new Error('Receipt status is unknown. Request stays unresolved.');
    const state = status === 'success' ? 'included' : 'reverted';
    if (expectedState && state !== expectedState) throw new Error('Receipt outcome changed during confirmation. Request stays unresolved.');
    matchedIntent = intent;
    return state;
  });
  if (matchedIntent) {
    recordSubmission({ hash, kind: matchedIntent.kind, account: matchedIntent.account, invoiceId: matchedIntent.invoiceId, state });
    releaseRecoveredRequest(matchedIntent.kind, matchedIntent.account, matchedIntent.invoiceId);
  }
  return state;
}

/** Settle a returned hash only through the same strict read-only recovery gates. */
export async function confirmSubmittedOutcome(client: PublicClient, hash: Hex, expectedState: 'included' | 'reverted') {
  const intent = findUnresolvedWalletIntent(hash);
  if (!intent) throw new Error('No unresolved saved intent matches this returned hash. Inspect wallet history.');
  return recoverUnknownSubmission(client, intent.operationId, hash, expectedState);
}

/** Confirm this UI submission; standalone invoice inspection remains read-only. */
export async function confirmCreatedInvoice(client: PublicClient, action: PreparedAction, hash: Hex): Promise<LoadedInvoice> {
  const invoice = await readCreatedInvoice(client, action, hash);
  await confirmSubmittedOutcome(client, hash, 'included');
  return invoice;
}
