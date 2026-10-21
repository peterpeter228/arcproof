### 1. Actionable P0 / P1 / P2 Defects

**None.**

An independent line-by-line inspection of the frozen source (`8df6b66d77c12e99b268a19c0ed6f88f33336b24c177fb0fdda88834ba631432`) and the three patches applied during the independent review cycle confirms that no concrete, reproducible P0, P1, or P2 defects remain within the scoped private readiness boundaries:

* **Network Registry & Fail-Closed Mainnet State (`src/arcproof/networkPolicy.ts`, `src/arcproof/manifest.ts`):** `PRODUCTION_MANIFEST` is empty (`[]`), `MAINNET_CONTEXT.deployment` is `null`, and `MAINNET_CONTEXT.writesEnabled` is `false`. Both `TESTNET_CONTEXT` and `MAINNET_CONTEXT` are recursively frozen (`deepFreeze`) and validated by object reference identity (`assertTrustedContext`), preventing structural forgery. `requireTrustedDeployment` and `assertWritesEnabled` fail closed before any RPC call, wallet interaction, or storage mutation can occur.
* **EIP-6963 Wallet Bootstrap Isolation (`src/config.ts`, `src/main.tsx`):** The fix in `src/config.ts` (`connectors: BUILD_NETWORK.writesEnabled ? [injected()] : []`, `multiInjectedProviderDiscovery: BUILD_NETWORK.writesEnabled`, `storage: BUILD_NETWORK.writesEnabled ? undefined : null`) alongside `reconnectOnMount={false}` in `src/main.tsx` properly prevents automatic EIP-6963 provider discovery, background account attachment, and reads/writes/clears of historical `wagmi.store` state when running the mainnet build.
* **Corrupt / Identity-less Legacy Submission Guard (`src/arcproof/submissions.ts`):** The fix in `fromStorage()` and `beginSubmission()` is sound. If `localStorage` contains malformed JSON or a legacy `pay` submission missing a valid 32-byte `invoiceId` (`valid.length !== value.length`), `fromStorage()` sets `storageReadError` without deleting or overwriting the corrupt keys, and `beginSubmission()` throws `storageReadError` before issuing a lease. Furthermore, `fromStorage()` short-circuits (`if (!context.deployment) return [];`) on unconfigured mainnet, and `storage` event listeners / initial loads are gated by `BUILD_NETWORK === context`, ensuring old testnet records are left untouched.
* **Unknown-Request Re-send Prevention (`src/arcproof/walletIntents.ts`, `src/arcproof/testnetClient.ts`):** Durable `WalletIntent` records are written to `localStorage` under an exclusive Web Lock (`navigator.locks.request`) prior to `eth_sendTransaction`. Only an explicit EIP-1193 `4001` user rejection transitions a hashless intent to `cancelled`; any other transport failure or ambiguity transitions it to `uncertain`, permanently blocking same-scope retries. `recoverWalletIntent` strictly rejects hashless intents (`if (!intent.hash) throw ...`), ensuring independent invoice verification (`verifyTestnetReceipt`) never settles an unknown wallet request or releases its duplicate-send guard.
* **Duplicate `tx` Query Parameter & Route Isolation (`src/arcproof/routes.ts`, `src/App.tsx`):** `parseHash` maps duplicate `tx` query parameters (`params.getAll('tx').length !== 1`) to `''`, and `src/App.tsx` now enforces `route.txHash === undefined || isBytes32(route.txHash)` before mounting `TestnetPayScreen` or enabling the header wallet button. On mainnet builds (`BUILD_NETWORK.key === 'mainnet'`), `src/App.tsx` intercepts all routes except `demo`, `evidence`, and `invalid` to render the static `NetworkUnavailable` component with `hideWallet={true}` and `hideSavedActivity={true}`.
* **Evidence Classification (`src/arcproof/exportUtils.ts`, `src/arcproof/networkPolicy.ts`):** `classifyDeployment` requires exact field matches against `FIXTURE_MANIFEST`, `TESTNET_CONTEXT`, or `MAINNET_CONTEXT`. Because `PRODUCTION_MANIFEST` is empty, `classifyDeployment` can never return `'mainnet'`, and `buildReceiptExport` strips observations and `settlementEvidence` if `observationScope` does not match the caller's target deployment, invoice, and transaction hash.

---

### 2. Lower Priority (P3 / Informational) Observations

These items do not affect runtime safety, state isolation, or readiness for this private phase, and do not require source modifications before committing:

1. **Testnet-Hardcoded Copy in Shared `ReceiptFacts` & `Layout` Footer (`src/components/arcproof/ReceiptFacts.tsx`, `src/components/arcproof/Layout.tsx`):**
   * *Observation:* `ReceiptFacts.tsx` (lines 20 and 38) formats `gasFeeNative` and `amountDisplay` with the literal suffix `"test USDC"` rather than deriving the currency label from `record.chainId` or `record.mode`. Similarly, `Layout.tsx` (line 146) renders the static footer text `"Checked testnet deployment · live payment acceptance pending"` across all build targets, and `EvidenceScreen.tsx` (line 113) states `"Only the checked Arc Testnet deployment is configured."`
   * *Impact:* Cosmetic/informational only. In the current phase, `ReceiptFacts` is unreachable on mainnet builds because live verification routes render `NetworkUnavailable`, and `DemoReceipt` is a separate component. If mainnet receipt verification is enabled in a future phase after a real deployment, `ReceiptFacts` should parameterize the unit label (`USDC` vs `test USDC`) based on the verified network context.

2. **Unused Public Client Instantiation on Module Load (`src/arcproof/testnetClient.ts`):**
   * *Observation:* `testnetClient.ts` exports `const testnetService = createNetworkService(TESTNET_CONTEXT)` at module evaluation time, which calls `createPublicClient({ chain: ARC_TESTNET, transport: http(...) })` even when bundled into a mainnet build (via `App.tsx` -> `Layout.tsx` -> `testnetClient.ts`).
   * *Impact:* None at runtime. Viem's `http()` transport is lazy and performs zero network I/O until an action method is invoked, and `walletIntents.ts` / `submissions.ts` gate their initial `localStorage` reads and `window.addEventListener('storage', ...)` registration behind `if (BUILD_NETWORK === context)`.

---

### 3. Scoped Private Readiness Status

**Scoped private mainnet readiness is NOT BLOCKED by any code or test defect.**

* **Code & Test Verification:** All 462 unit/integration tests across 29 files, `oxlint --type-aware`, `tsc --noEmit`, both `testnet` and `mainnet` production builds (with all 84 output file hashes verified per build), 4 invalid `VITE_ARCPROOF_NETWORK` build-selector rejection checks, Studio 87-file allowlist synchronization readback, and bounded local headless-browser UI checks on the mainnet build have passed against frozen source snapshot `8df6b66d77c12e99b268a19c0ed6f88f33336b24c177fb0fdda88834ba631432`.
* **Remaining Operational Step Within This Phase:** Per `evidence/private-mainnet-20261021/REPORT.json`:
  1. Recording the completion of this final Argon review (`argon.final` is currently `"PENDING"`).
  2. Performing the non-force `expected_sha` remote Git commit and readback verification (`remotePersistence` is currently `"PENDING"`), plus any accompanying final status update in `REPORT.json` / `docs/PRIVATE_MAINNET_PHASE_20261021.md`.

---

### 4. Unexecuted Release & Mainnet Gates (Intentionally Outside Scope)

The following gates remain `NOT_RUN` / `PENDING` by design and must not be claimed as completed by this candidate:

1. **Mainnet Contract Deployment & Manifest Population:** No Arc Mainnet (`5042`) contract has been deployed, verified, or added to `PRODUCTION_MANIFEST`. Mainnet remains completely read-only and inert (`writesEnabled: false`, `deployment: null`).
2. **Live Mainnet Native USDC Settlement & Finality Acceptance (T25 / T26):** No live mainnet (or fresh candidate-bound testnet) payment transaction has been executed to observe real 18-decimal native USDC system `Transfer` logs at emitter `0xfffffffffffffffffffffffffffffffffffffffe` or live RPC `finalized` block-tag behavior.
3. **Real Browser-Wallet & Two-Wallet End-to-End Acceptance (T21 / T23):** Real wallet extension signing, user rejection (`4001`), pending/uncertain request recovery, distinct merchant/payer two-wallet flows, and multi-RPC conflict handling have only been exercised via offline mocks/jsdom, not against a live wallet extension and chain.
4. **Fresh Foundry Contract Suite Rerun:** The Solidity contract (`contracts/ArcProofInvoices.sol`) is unchanged from the verified base (`8699071d250c834cd1166ece0d4001b7de95af7562796e19305ce2812635e25b`), and the 73 Forge tests remain historical evidence rather than a fresh run in this phase.
5. **External Security Audit & Dependency/Bundle Remediation:** The smart contract and frontend have not undergone a formal third-party security audit, CSV spreadsheet round-trip acceptance (`RECEIPT_CSV_IMPORT_NOTICE`) is `NOT_RUN`, and pre-existing dependency advisories / bundle size warnings remain disclosed as known limitations.
6. **Public Release, Licensing & Competition Submission:** Grant eligibility remains on `HOLD`, and no public deployment, open-source license publication, or competition submission is authorized or performed.