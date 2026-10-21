### 1. Executive Summary & Scope Alignment
This is an **advisory initial design review** of `docs/NET01_PRIVATE_READINESS_DESIGN.md` against the supplied source code. No code has been executed, modified, deployed, or synced.

* **Hard Facts (Observed in Inputs):**
  * **Baseline Discrepancy:** The prompt specifies baseline `4deb74cce889ca122ef33903d27c2be10a1c437e`, whereas `docs/NET01_PRIVATE_READINESS_DESIGN.md` references `94a84c44b02d52a827bed42fc9f9a5d414619b7d` and `STATUS.md` references `8588d80dd08a5ee819efc0d2f723ed50655f8b9d`.
  * **Hardcoded Testnet Singletons:** `ARC_TESTNET` (`5042002`) and `TESTNET_DEPLOYMENT` are hardcoded across `arcSettlement.ts`, `testnet.ts`, `testnetClient.ts`, `walletIntents.ts`, `config.ts`, `App.tsx`, `TestnetScreens.tsx`, `receiptVerifier.ts`, and `exportUtils.ts`.
  * **Missing Module Visibility:** `src/arcproof/submissions.ts`, `src/components/arcproof/Layout.tsx`, `PayScreen.tsx`, `ReceiptScreen.tsx`, and `ReceiptFacts.tsx` are imported by the supplied files and mentioned in the design, but their source was not provided in this prompt.
* **Assumptions (To Be Independently Verified by You):**
  * `src/arcproof/submissions.ts` uses `localStorage` or in-memory state that is currently unscoped or hardcoded to testnet (given call sites like `beginSubmission(action.kind, action.session.account, action.payment?.invoiceId)` lack `chainId` and `deploymentId`).
  * Arc Mainnet (`5042`) supports `eth_getBlockByNumber('finalized', false)` and uses the identical EIP-7708 native USDC transfer emitter (`0xfffffffffffffffffffffffffffffffffffffffe` at 18 decimals) as testnet.

---

### 2. Concrete Design Defects (P0 / P1)

#### P0-1: Unscoped `submissions.ts` State and Lease Collision Across Networks
* **Defect:** The design’s Exact Change Map covers `walletIntents.ts` (`arcproof:5042002:<deploymentId>:intent:`), but **completely omits `src/arcproof/submissions.ts`**. In `testnetClient.ts`, `beginSubmission`, `recordSubmission`, `updateSubmission`, and `releaseRecoveredRequest` are called with only `(kind, account, invoiceId)` or `(hash, state)`. In `TestnetScreens.tsx`, `useSubmissions()` filters only by `row.kind === 'pay' && row.invoiceId === invoiceId`.
* **Impact:** Because Mainnet (`PRODUCTION_MANIFEST = []`) and Testnet share the same browser origin in local/staging tests—or if a user views saved activity—unscoped submission records and in-memory leases in `submissions.ts` will bleed across networks or collide if not keyed by `chainId` + `deploymentId`.
* **Required Fix:** Add `src/arcproof/submissions.ts` to the Exact Change Map. Scope its storage prefix, in-memory leases, and `useSubmissions` hook to `(chainId, deploymentId)` while preserving legacy testnet rows in place.

#### P0-2: Null-Deployment Type Conflict vs. Empty `PRODUCTION_MANIFEST`
* **Defect:** Scope requires `PRODUCTION_MANIFEST = []` and all mainnet sends disabled, while `networkPolicy.ts` centralizes the build-selected context. However, `testnetClient.ts`, `walletIntents.ts`, and `TestnetScreens.tsx` assume a non-null `DeploymentRecord` exists at module load time (e.g., `const prefix = arcproof:${chainId}:${deployment.deploymentId}:intent:`, `action.deployment.deploymentId`, `TESTNET_DEPLOYMENT.contractAddress`).
* **Impact:** If the build is configured for `mainnet` with an empty `PRODUCTION_MANIFEST`, resolving the active deployment returns `null`. Any eager initialization of `walletIntents.ts`, `submissions.ts`, route helpers, or client wrappers that dereferences `deployment.deploymentId` or `deployment.contractAddress` will throw a runtime `TypeError` on app boot, breaking read-only / unsupported-network screens.
* **Required Fix:** Define `NetworkContext` in `networkPolicy.ts` with `deployment: DeploymentRecord | null` and `sendEnabled: false` when `deployment === null` (or on mainnet during this phase). Make `walletIntents.ts` and `submissions.ts` return an empty immutable snapshot (`[]`) and fail-closed on `runWalletIntent` when `deployment === null` or `!context.sendEnabled`, rather than constructing a storage prefix with `undefined`.

#### P0-3: `App.tsx` Route Resolution Contradicts Fixed-Build Isolation
* **Defect:** The design table for `src/App.tsx` says: *"Resolve hash route chain+deployment through trusted records and select matching context. Fixed-build unknown/other-network links show explicit read-only unsupported-network state..."*
* **Impact:** If the build is a **fixed build-selected network** (`config.ts` only configures transport for the build-selected chain), `App.tsx` cannot dynamically switch active RPC/wagmi contexts at runtime from a URL hash without violating the single-network build invariant. Furthermore, in current `App.tsx`, when `resolveDeployment` returns `null`, it falls back to `<PayScreen>` / `<ReceiptScreen>` (the legacy/demo screens), which may not clearly distinguish "valid other-network link unsupported by this build" from "untrusted/unknown deployment".
* **Required Fix:** Specify that `App.tsx` checks the route’s `(chainId, deploymentId)` against:
  1. The **active build context's** trusted manifest (`deployment` match $\rightarrow$ render live screen; if `!context.sendEnabled`, `Pay` screen must be strictly read-only with wallet actions disabled).
  2. Known **other-network** trusted manifests in the static registry (match on non-active chain $\rightarrow$ render explicit read-only "Valid link for [Network], but this build is locked to [Active Network]" banner, with `hideWallet = true`).
  3. Everything else $\rightarrow$ untrusted/unavailable route state (`hideWallet = true`).

#### P1-1: Hardcoded Testnet Strings and Explorer Helpers Inside `receiptVerifier.ts` and `TestnetScreens.tsx`
* **Defect:** The design table does not list `src/arcproof/receiptVerifier.ts`. However, line 409 of `receiptVerifier.ts` hardcodes `'Arc Testnet payment verified against RPC data...'` in the returned `VERIFIED` message. Additionally, `TestnetScreens.tsx` hardcodes `' test USDC'`, `'Arc Testnet (5042002)'`, `arcproof-testnet-${record.invoiceId}.${kind}`, and `explorerTx(hash)` (which is hardcoded to `ARC_TESTNET` in `testnet.ts`).
* **Impact:** A mainnet verification result or export would mislabel verified mainnet evidence as `"Arc Testnet payment verified..."` or link to the testnet explorer.
* **Required Fix:** Add `receiptVerifier.ts` to the change map so the `VERIFIED` message uses a policy- or chain-derived label (or neutral `"Arc native payment verified..."`). Bind `explorerTx` and download filenames to the trusted `NetworkContext` / `DeploymentRecord`.

#### P1-2: Unconditional `mode: isFixture ? 'fixture' : 'testnet'` in `exportUtils.ts`
* **Defect:** In `exportUtils.ts`, `ReceiptExportRecord['mode']` is typed as `'fixture' | 'testnet' | 'unknown'`, and `buildReceiptExport` sets `mode: isFixture ? 'fixture' : 'testnet'` without checking `deployment.chainId`, `deployment.settlementPolicy`, or whether `result` is actually bound to a trusted manifest record.
* **Impact:** Any non-fixture call to `buildReceiptExport` (even for an unverified, unknown, or mainnet deployment) is unconditionally labeled `'testnet'`.
* **Required Fix:** As noted in your design prose, update `ReceiptExportRecord['mode']` to `'fixture' | 'testnet' | 'mainnet' | 'unknown'`, and derive `mode` strictly by looking up `(deployment.chainId, deployment.deploymentId)` in the immutable trusted registry (`FIXTURE_MANIFEST` $\rightarrow$ `'fixture'`, trusted testnet manifest $\rightarrow$ `'testnet'`, trusted mainnet manifest with identity-bound observation $\rightarrow$ `'mainnet'`, otherwise `'unknown'`).

#### P1-3: `Session` and `useTestnetWallet` Lack `deploymentId` / `networkKey` Binding
* **Defect:** The design states for `useTestnetWallet.ts`: *"Bind sessions/prepared actions to chain+deployment+account+connection generation"*. Currently, `Session` in `testnetClient.ts` only contains `{ account: Address; chainId: number; connectionVersion: number }`, and `assertSameSession` hardcodes `actual.chainId !== ARC_TESTNET.id`.
* **Impact:** `Session` does not carry `deploymentId: string | null` or `networkKey: 'testnet' | 'mainnet'`, so `assertSameSession` cannot verify deployment/context continuity by inspecting `Session` alone.
* **Required Fix:** Extend `Session` to `{ networkKey: NetworkKey; chainId: number; deploymentId: string | null; account: Address; connectionVersion: number }` and pass the build’s `NetworkContext` into `useTestnetWallet(context)` and `assertSameSession(context, expected, actual)`.

#### P1-4: Baseline Commit Hash Mismatch in Design Document
* **Defect:** `docs/NET01_PRIVATE_READINESS_DESIGN.md` line 3 states `Baseline 94a84c44b02d52a827bed42fc9f9a5d414619b7d`, while the review prompt specifies baseline `4deb74cce889ca122ef33903d27c2be10a1c437e`.
* **Required Fix:** Reconcile the baseline SHA in `docs/NET01_PRIVATE_READINESS_DESIGN.md` and the provenance delta ledger so evidence bindings do not conflict.

---

### 3. Implementable Minimum Architecture (No Code Execution)

To achieve the least-cost safe private adaptation without breaking any testnet invariant:

1. **`src/arcproof/arcSettlement.ts`**
   * Widen `ArcSettlementPolicy` type union:
     * `id: 'arc-testnet-native-eip7708-finalized-v1' | 'arc-mainnet-native-eip7708-finalized-v1'`
     * `chainId: 5042002 | 5042`
   * Export frozen `ARC_MAINNET_SETTLEMENT_POLICY` (`chainId: 5042`, `emitter: '0xfffffffffffffffffffffffffffffffffffffffe'`, `decimals: 18`, `finality: 'rpc-finalized-header'`).
   * Store policies in a closed `Map` or frozen array `SUPPORTED_SETTLEMENT_POLICIES` and update `isSupportedSettlementPolicy(policy, chainId)` to match exact `(id, chainId, emitter, decimals, finality)` against that closed registry.

2. **`src/arcproof/networkPolicy.ts` (New File)**
   * Define `ARC_MAINNET = defineChain({ id: 5042, name: 'Arc Mainnet', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } }, blockExplorers: { default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' } }, testnet: false })`.
   * Define closed `NetworkKey = 'testnet' | 'mainnet'`.
   * Define `NetworkContext`:
     * `key: NetworkKey`
     * `chain: Chain` (`ARC_TESTNET` or `ARC_MAINNET`)
     * `currencyLabel: 'test USDC' | 'USDC'`
     * `settlementPolicy: ArcSettlementPolicy`
     * `manifest: readonly DeploymentRecord[]` (`TESTNET_MANIFEST` vs `PRODUCTION_MANIFEST` which is `[]`)
     * `activeDeployment: DeploymentRecord | null` (`TESTNET_DEPLOYMENT` for testnet; `null` for mainnet)
     * `sendEnabled: boolean` (`true` for testnet; **`false` hardcoded for mainnet** until a verified deployment exists and owner gates close).
   * Select active context at build time via strict allowlist check on `import.meta.env?.VITE_ARCPROOF_NETWORK` (defaulting to `'testnet'` when unset/empty, and **throwing a fatal error** if set to any value other than `'testnet'` or `'mainnet'`). Never read network config from URL or `localStorage`.

3. **`src/arcproof/testnet.ts` & `src/arcproof/manifest.ts`**
   * Keep `ARC_TESTNET`, `TESTNET_DEPLOYMENT`, `TESTNET_MANIFEST`, and `assertTestnetDeployment` intact for backward compatibility.
   * Add `assertTrustedDeployment(context: NetworkContext, deployment: DeploymentRecord | null): asserts deployment is DeploymentRecord` that verifies `deployment` is in `context.manifest`, matches `context.chain.id`, has valid `runtimeCodeHash`, and passes `isSupportedSettlementPolicy`.
   * Add `classifyTrustedDeployment(chainId: number, deploymentId: string): 'fixture' | 'testnet' | 'mainnet' | 'unknown'` in `manifest.ts` or `networkPolicy.ts`.

4. **`src/arcproof/walletIntents.ts` & `src/arcproof/submissions.ts`**
   * Parameterize storage prefix and Web Lock name by `(chainId, deploymentId)`:
     * Testnet resolves to the exact existing string: `arcproof:5042002:${TESTNET_DEPLOYMENT.deploymentId}:intent:` (preserving all existing testnet rows in place).
     * When `activeDeployment === null` (mainnet with empty manifest), `getWalletIntents()` returns `[]` without reading/mutating `localStorage`, and `runWalletIntent()` immediately throws `'No trusted deployment is active. Wallet sends are disabled.'`.

5. **`src/arcproof/testnetClient.ts`**
   * Create `createArcProofClient(context: NetworkContext)` binding `PublicClient` and all methods to `context`.
   * Enforce `if (!context.sendEnabled || !context.activeDeployment) throw new Error(...)` at the top of `prepareCreate`, `preparePay`, and `sendPreparedAction`.
   * Export existing testnet functions (`testnetClient`, `loadInvoice`, `prepareCreate`, etc.) bound to `TESTNET_CONTEXT` so existing testnet tests pass with zero signature changes.

---

### 4. Specific Verification Tests & Acceptance Boundaries

#### Required Unit & Integration Tests (To Implement Next Phase)
1. **Build Selector & Policy Gate (`networkPolicy.test.ts`):**
   * Unset env $\rightarrow$ selects `testnet` (`5042002`), `activeDeployment === TESTNET_DEPLOYMENT`, `sendEnabled === true`.
   * `VITE_ARCPROOF_NETWORK='mainnet'` $\rightarrow$ selects `mainnet` (`5042`), `PRODUCTION_MANIFEST` is empty (`length === 0`), `activeDeployment === null`, `sendEnabled === false`.
   * `VITE_ARCPROOF_NETWORK='arbitrary'` or URL/localStorage injection attempts $\rightarrow$ throws fatal configuration error.
   * Cross-paired policies (`chainId: 5042` with `arc-testnet-native-eip7708-finalized-v1` or vice versa) $\rightarrow$ `isSupportedSettlementPolicy` returns `false` and `verifyReceipt` fails with `UNVERIFIED_ARC_EVIDENCE`.
2. **Mainnet Send-Disabled & Empty Manifest Fail-Closed (`mainnetDisabled.test.ts`):**
   * Calling `prepareCreate`, `preparePay`, `sendPreparedAction`, or `runWalletIntent` under `MAINNET_CONTEXT` rejects before any RPC write or `eth_sendTransaction` call, and writes nothing to `localStorage`.
   * Rendering Dashboard, Pay, and Verify screens under `MAINNET_CONTEXT` shows explicit `"Arc Mainnet (5042) — No production deployment active (Read-Only)"` state, hides/disables wallet send buttons, and does not crash on `null` deployment.
3. **Cross-Network Intent & Submission Isolation (`intentIsolation.test.ts`):**
   * Seed `localStorage` with an unresolved `requesting` or `uncertain` testnet intent (`arcproof:5042002:<id>:intent:<uuid>`).
   * Initialize store with `MAINNET_CONTEXT` (or a mock mainnet deployment ID): verify the testnet intent is **not** deleted, migrated, cancelled, or returned in the mainnet snapshot, and remains intact when switching back to `TESTNET_CONTEXT`.
   * Verify hashless `requesting`/`uncertain` intents still cannot be settled via `recoverWalletIntent` even if a matching paid invoice exists on-chain.
4. **Cross-Network Route & Export Classification (`routeAndExport.test.ts`):**
   * In a `testnet` build, navigating to `#/pay/5042/<id>/<invoiceId>` or `#/receipt/5042/<id>/<invoiceId>` renders a read-only unsupported-network notice with `hideWallet === true`.
   * `buildReceiptExport` outputs `mode: 'testnet'` only for `TESTNET_DEPLOYMENT`, `mode: 'fixture'` only for `FIXTURE_MANIFEST`, `mode: 'unknown'` for any unlisted deployment or mismatched `observationScope`, and `mode: 'mainnet'` only when given a registered mainnet deployment with a `VERIFIED` identity-bound observation.

#### Acceptance Boundaries (Hard Stop Gates)
* **In Scope for Private Adaptation Phase:** Code refactoring for `NetworkContext`, unit/integration test suite execution in local environment, static typecheck/lint/build verification, and reconciliation of baseline SHA in design docs.
* **Strictly Out of Scope (Requires Separate Explicit Owner Authorization):**
  * Any live contract deployment to Arc Mainnet (`5042`) or Testnet (`5042002`).
  * Populating `PRODUCTION_MANIFEST` with any real or placeholder address, or setting mainnet `sendEnabled = true`.
  * Signing any transaction, connecting a funded wallet, or spending real USDC/gas.
  * Logging into Arc Studio, syncing workspace files, changing repository visibility, or submitting to DoraHacks.