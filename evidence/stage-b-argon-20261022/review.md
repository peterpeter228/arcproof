### Independent Adversarial Technical Review — Frozen ArcProof Candidate (`d97cc2b1b9abe79e06427ab91dd7ab983ee698dd`)

This review evaluates the frozen candidate (`d647cc2f5249f256e944ac217a057ba0d094614913e65a25bea6721c634f2941`) strictly for a **PRIVATE MAINNET-DISABLED prototype merge**.

---

### 1. Reachable Defects & Adversarial Findings

#### [ADV-01] Non-verified results on untrusted deployments leak RPC observations and original reason codes in `buildReceiptExport`
* **Category:** Reachable Flaw (Boundary Bypass / Information & Status Leakage)
* **Severity:** **Medium** (Does not forge `VERIFIED` status, `verificationVerified: true`, or `settlementEvidence`, which are gated by `mode === 'testnet' || mode === 'mainnet'`, but violates the untrusted-deployment boundary for all non-`VERIFIED` results).
* **Challenge to Previous Reviewer:** The previous reviewer’s `FR-02` fix and regression test (`finalReviewRegressions.test.tsx`) only tested an untrusted deployment when `result.status === 'VERIFIED'`. Because `untrustedTarget` was defined as `scopeMatches && mode === 'unknown' && result.status === 'VERIFIED'`, any non-`VERIFIED` result (`UNVERIFIED_FINALITY`, `INVOICE_NOT_PAID`, `FAILED`, `PENDING`, etc.) on an untrusted deployment bypasses `untrustedTarget`. Furthermore, `observedReceipt` and `observedInvoice` are gated only on `scopeMatches`, not `!syntheticTarget && !untrustedTarget`, so RPC observations, `amountNative`, `payer`, `merchant`, `blockHash`, and `gasFeeNative` are still exported even when `untrustedTarget` is true!
* **Exact Location:** `src/arcproof/exportUtils.ts` in `buildReceiptExport` (lines 193–221).
* **Evidence:**
  ```ts
  const observedReceipt = scopeMatches ? result.observedReceipt ?? null : null;
  const observedInvoice = scopeMatches ? result.observedInvoice ?? null : null;
  // A verifier result can only certify a deployment the application itself trusts.
  const untrustedTarget = scopeMatches && mode === 'unknown' && result.status === 'VERIFIED';
  ```
  When `deployment` is not in `TESTNET_MANIFEST` / `PRODUCTION_MANIFEST` (so `classified === 'unknown'` and `mode === 'unknown'`):
  1. Even when `result.status === 'VERIFIED'`, `observedReceipt`, `observedInvoice`, `amountNative`, `payer`, `merchant`, `paidAt`, `paidBlockNumber`, `blockNumber`, `blockHash`, `paymentLogIndex`, `gasFeeNative`, and `verifiedAt` remain populated from `result`.
  2. When `result.status === 'UNVERIFIED_FINALITY'` (e.g., all checks up to stage 12 passed on an untrusted deployment), `untrustedTarget` is `false`, so `verificationStatus` exports as `'UNVERIFIED_FINALITY'` instead of `'UNKNOWN_DEPLOYMENT'`.
* **Reproduction / Minimal Failing Test:**
  ```ts
  it('redacts RPC observations and forces UNKNOWN_DEPLOYMENT for any untrusted deployment result', () => {
    const untrusted: DeploymentRecord = { ...TESTNET_DEPLOYMENT, contractAddress: `0x${'9'.repeat(40)}` };
    const partialResult: VerificationResult = {
      status: 'UNVERIFIED_FINALITY',
      reasonCode: 'UNVERIFIED_FINALITY',
      verified: false,
      message: 'Finality missing',
      paymentLogIndex: 2,
      blockHash: `0x${'d'.repeat(64)}`,
      verifiedAt: 1000,
      observationScope: {
        chainId: untrusted.chainId,
        deploymentId: untrusted.deploymentId,
        contract: untrusted.contractAddress,
        invoiceId: `0x${'a'.repeat(64)}`,
        transactionHash: `0x${'b'.repeat(64)}`,
      },
      observedReceipt: {
        transactionHash: `0x${'b'.repeat(64)}`,
        from: `0x${'1'.repeat(40)}`,
        to: untrusted.contractAddress,
        status: 'success',
        transactionIndex: 0,
        blockNumber: '55',
        blockHash: `0x${'d'.repeat(64)}`,
        blockTimestamp: '1700000000',
        paymentLogIndex: 2,
        gasUsed: '21000',
        effectiveGasPrice: '1',
        gasFeeNative: '21000',
      },
      observedInvoice: {
        amountNative: '200000000000000000',
        payer: `0x${'1'.repeat(40)}`,
        merchant: `0x${'2'.repeat(40)}`,
        paidAt: '1700000000',
        paidBlockNumber: '55',
      },
    };
    const r = buildReceiptExport(untrusted, `0x${'a'.repeat(64)}`, `0x${'b'.repeat(64)}`, null, null, null, null, null, partialResult, false);
    expect(r.verificationStatus).toBe('UNKNOWN_DEPLOYMENT');
    expect(r.reasonCode).toBe('UNKNOWN_DEPLOYMENT');
    expect(r.observedReceipt).toBeNull();
    expect(r.observedInvoice).toBeNull();
    expect(r.amountNative).toBeNull();
    expect(r.verifiedAt).toBeUndefined();
  });
  ```
* **Fix:**
  In `src/arcproof/exportUtils.ts` (`buildReceiptExport`):
  ```ts
  const untrustedTarget = scopeMatches && !syntheticTarget && classified === 'unknown';
  const allowObservations = scopeMatches && !syntheticTarget && !untrustedTarget;
  const observedReceipt = allowObservations ? result.observedReceipt ?? null : null;
  const observedInvoice = allowObservations ? result.observedInvoice ?? null : null;
  ```
  And gate `verifiedAt` on `allowObservations ? result.verifiedAt : undefined`, and `checks` on `allowObservations`.

---

#### [ADV-02] Synthetic fixture with `hasDiagnostics` still exports `observedReceipt` and `observedInvoice` in `buildReceiptExport`
* **Category:** Reachable Flaw (Fixture / Synthetic Export Boundary)
* **Severity:** **Low / Medium** (Status is properly forced to `SIMULATED_NOT_VERIFIED` and `verificationVerified` is `false`, but synthetic `observedReceipt` and `observedInvoice` snapshots are exported as `factsBasis: 'identity_bound_rpc_observation'`).
* **Challenge to Previous Reviewer:** In `fixtureExportBoundary.test.tsx`, `boundResult` set `observedReceipt: null, observedInvoice: null`. It never tested a synthetic fixture where `result.observedReceipt` and `result.observedInvoice` were non-null! When `isFixture` is `true` and `result.observedReceipt` is populated, `buildReceiptExport` sets `factsBasis: 'identity_bound_rpc_observation'` and exports the synthetic `observedReceipt`, `observedInvoice`, `amountNative`, `payer`, `merchant`, `blockNumber`, and `blockHash` despite the message saying *"Synthetic fixture only. This record is not live payment proof; verification evidence is not exported."*
* **Exact Location:** `src/arcproof/exportUtils.ts` in `buildReceiptExport` (lines 193–220).
* **Evidence:**
  ```ts
  const observedReceipt = scopeMatches ? result.observedReceipt ?? null : null;
  const observedInvoice = scopeMatches ? result.observedInvoice ?? null : null;
  ...
  factsBasis: hasDiagnostics ? observedReceipt ? 'identity_bound_rpc_observation' : 'unavailable' : 'legacy_caller_supplied',
  ```
* **Reproduction / Minimal Failing Test:**
  ```ts
  it('never exports identity_bound_rpc_observation or observedReceipt when isFixture is true', async () => {
    const f = observedPaymentFixture();
    const result = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, f.rpc);
    const r = buildReceiptExport(f.deployment, f.invoiceId, f.txHash, f.amount, f.payer, f.payer, f.block.timestamp, f.block.number, result, true);
    expect(r.verificationStatus).toBe('SIMULATED_NOT_VERIFIED');
    expect(r.factsBasis).not.toBe('identity_bound_rpc_observation');
    expect(r.observedReceipt).toBeNull();
    expect(r.observedInvoice).toBeNull();
  });
  ```
* **Fix:** Apply the same `allowObservations = scopeMatches && !syntheticTarget && !untrustedTarget` guard from `ADV-01` so synthetic fixtures never export `observedReceipt`, `observedInvoice`, or `factsBasis: 'identity_bound_rpc_observation'`.

---

#### [ADV-03] `verifyReceipt` rejects valid payments for `0x0000000000000000000000000000000000000001` (`ecrecover`) instead of `0x0000000000000000000000000000000000000000`
* **Category:** Defense-in-Depth Defect (Typo in zero-address constant)
* **Severity:** **Low** (In `contracts/ArcProofInvoices.sol`, `address(0)` is already rejected for `merchant` on creation, and `0x...0000` vs `0x...0001` cannot sign an EOA transaction in practice, but the verifier checks the wrong address for `zeroAddress`).
* **Exact Location:** `src/arcproof/receiptVerifier.ts` in `verifyReceipt` (line 364).
* **Evidence:**
  ```ts
  const zeroAddress = '0x0000000000000000000000000000000000000001';
  if (!/^0x[0-9a-fA-F]{40}$/.test(onchain.payer) || !/^0x[0-9a-fA-F]{40}$/.test(onchain.merchant) ||
      addrEq(onchain.payer, zeroAddress) || addrEq(onchain.merchant, zeroAddress) ||
  ```
  `zeroAddress` is literally hardcoded to `0x...0001` instead of `0x...0000`. If a mocked/corrupted RPC returns `payer: '0x0000000000000000000000000000000000000000'` (with matching `tx.from` and `receipt.from`), `addrEq(onchain.payer, zeroAddress)` evaluates to `false` and passes!
* **Reproduction / Minimal Failing Test:**
  ```ts
  it('rejects 0x0000000000000000000000000000000000000000 as payer or merchant in verifyReceipt', async () => {
    const f = observedPaymentFixture();
    const zero = '0x0000000000000000000000000000000000000000' as const;
    // If RPC returns zero address for payer across tx/receipt/invoice/logs:
    const fZero = observedPaymentFixture({ payer: zero });
    const res = await verifyReceipt(fZero.txHash, fZero.invoiceId, fZero.deployment, fZero.deployment.chainId, fZero.rpc);
    expect(res.status).toBe('WRONG_EVENT_DATA');
  });
  ```
* **Fix:**
  In `src/arcproof/receiptVerifier.ts` (line 364):
  ```ts
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  ```
  (Or reject both `0x0{40}` and `0x0{39}1` if precompile exclusion was intended).

---

#### [ADV-04] `verifyReceipt` does not verify `onchain.expiresAt <= MAX_DATE_SECONDS` or `onchain.paidAt <= block.timestamp` when called directly
* **Category:** Defense-in-Depth (Direct verifier boundary vs `testnetClient.readInvoiceUnchecked`)
* **Severity:** **Low** (`testnetClient.readInvoiceUnchecked` enforces `invoice.expiresAt <= MAX_DATE_SECONDS`, and `verifyReceipt` enforces `block.timestamp === onchain.paidAt` and `onchain.paidAt < onchain.expiresAt`, so `paidAt` and `expiresAt` are bound when using `testnetService.receiptRpc`, but direct callers of `verifyReceipt` with a custom `RpcProvider` are not protected against `expiresAt > MAX_DATE_SECONDS`).
* **Exact Location:** `src/arcproof/receiptVerifier.ts` in `verifyReceipt` (lines 365–369).
* **Reproduction / Minimal Failing Test:**
  ```ts
  it('rejects out-of-range expiresAt in verifyReceipt when called directly', async () => {
    const f = observedPaymentFixture();
    const rpc = {
      ...f.rpc,
      getInvoice: async (addr: `0x${string}`, id: `0x${string}`) => {
        const inv = await f.rpc.getInvoice(addr, id);
        return inv ? { ...inv, expiresAt: 8_640_000_000_001n } : null;
      },
    };
    const res = await verifyReceipt(f.txHash, f.invoiceId, f.deployment, f.deployment.chainId, rpc);
    expect(res.verified).toBe(false);
    expect(res.status).toBe('WRONG_EVENT_DATA');
  });
  ```
* **Fix:** Add `onchain.expiresAt > 8_640_000_000_000n` to the `WRONG_EVENT_DATA` check in `src/arcproof/receiptVerifier.ts`.

---

#### [ADV-05] `buildReceiptExport` throws an unhandled `SyntaxError` if a caller supplies a malformed `observedInvoice.amountNative` string
* **Category:** Defense-in-Depth (Input Validation in Export Serializer)
* **Severity:** **Low**
* **Exact Location:** `src/arcproof/exportUtils.ts` in `buildReceiptExport` (line 228):
  ```ts
  amountDisplay: amount === null ? null : formatAmountDisplay(BigInt(amount)),
  ```
* **Evidence:** If `result.observedInvoice.amountNative` is not a valid decimal integer string (e.g. `""` or `"0.20"`), `BigInt(amount)` throws synchronously instead of failing closed to `null`.
* **Reproduction / Minimal Failing Test:**
  ```ts
  it('does not throw if observedInvoice.amountNative is non-integer', () => {
    const res: VerificationResult = {
      ...boundResult(TESTNET_DEPLOYMENT),
      observedInvoice: { amountNative: 'invalid', payer: `0x${'1'.repeat(40)}`, merchant: `0x${'2'.repeat(40)}`, paidAt: '1', paidBlockNumber: '1' },
    };
    expect(() => buildReceiptExport(TESTNET_DEPLOYMENT, id, tx, null, null, null, null, null, res, false)).not.toThrow();
  });
  ```
* **Fix:** Validate `/^\d+$/.test(amount)` before calling `BigInt(amount)`.

---

### 2. Audit of Required Security Invariants (Verified Sound in Frozen Snapshot)

1. **Fixed-Invoice Atomic Payment Invariants (`contracts/ArcProofInvoices.sol`):**
   * `createInvoice` enforces `0 < amountNative <= 1e18`, `amountNative % 1e12 == 0`, `block.timestamp < expiresAt <= block.timestamp + 7 days`, derives `invoiceId = keccak256(abi.encode(block.chainid, address(this), msg.sender, nonce))`, and increments `nextNonce[msg.sender]`.
   * `payInvoice` is `nonReentrant`, checks `inv.merchant != address(0)`, `!inv.paid`, `block.timestamp < inv.expiresAt`, `msg.value == inv.amountNative`, records `balanceBefore = address(this).balance - msg.value`, updates state before external call (CEI), forwards `msg.value` via `merchant.call{value: msg.value}("")`, verifies `address(this).balance == balanceBefore`, and emits `InvoicePaid`.
   * No `receive()` or `fallback()` exists.

2. **Chain / Session Identity & Wallet Intent Binding (`src/arcproof/testnetClient.ts`, `src/arcproof/networkPolicy.ts`):**
   * `assertSameSession` checks `account`, `chainId`, `connectionVersion`, `networkKey`, and `deploymentId`.
   * `sendPreparedActionOnce` re-verifies `getCurrentSession()` before and after async RPC preflights, checks `eth_chainId` and `eth_accounts` directly from the wallet provider, enforces a 120s TTL on `preparedAt`, and aborts if `refreshed.feeEstimate > action.feeEstimate || refreshed.gas > action.gas || refreshed.gasPrice > action.gasPrice`.
   * Only EIP-1193 error `code === 4001` releases a wallet intent (`onRejected()`); ambiguous errors keep the lease in `uncertain` state to prevent automatic double-sends.

3. **Mainnet-Disabled Bootstrap (`src/arcproof/networkPolicy.ts`, `src/config.ts`, `src/arcproof/manifest.ts`):**
   * `PRODUCTION_MANIFEST` is `[]`; `MAINNET_CONTEXT` has `deployment: null` and `writesEnabled: false`.
   * `src/config.ts` sets `connectors: []`, `multiInjectedProviderDiscovery: false`, and `storage: null` when `BUILD_NETWORK.writesEnabled` is `false`.
   * `assertWritesEnabledFor` requires both `context.writesEnabled` and `context === build`, plus `requireTrustedDeployment(context)`.

4. **UI Truthful Claims (`src/components/arcproof/HomeScreen.tsx`, `src/arcproof/receiptCurrency.ts`):**
   * `HomeScreen.tsx` accurately states that invoice principal is forwarded without retaining it while pre-existing/forced balances remain locked, and clearly states what verification does and does not prove.
   * `receiptCurrencyLabel` properly distinguishes `test USDC` (5042002), `USDC` (verified 5042), `USDC (untrusted deployment)` (unverified 5042), and `USDC (unrecognized network)`.

---

### 3. Known Non-Launch / External Blockers (Unchanged, Excluded from Private Prototype Scope)
* Real mainnet deployment (`PRODUCTION_MANIFEST` is intentionally empty) and live wallet/mainnet acceptance: `NOT_RUN`.
* Foundry (`forge test`) execution and Arc Studio synchronization: `NOT_RUN`.
* Mixed Studio grant eligibility: `HOLD` / unresolved.
* Production HTTP CSP header (beyond test-only guard), public license, dependency advisories, Excel/Sheets CSV round-trip acceptance, and hash-unknown cross-device/replacement tx recovery: `NOT_RUN` / documented prototype limitations.

---

### 4. Merge Verdict (PRIVATE MAINNET-DISABLED Prototype Only)

* **Verdict:** **CONDITIONAL APPROVE for PRIVATE MAINNET-DISABLED prototype branch merge** (recommended to apply the small 4-line `allowObservations` / `untrustedTarget` fix in `exportUtils.ts` for **ADV-01 / ADV-02** and the `zeroAddress` typo fix in `receiptVerifier.ts` for **ADV-03** prior to or immediately upon merge; neither issue allows forging a `VERIFIED` status or `settlementEvidence` on an untrusted or fixture deployment, nor enables mainnet writes).