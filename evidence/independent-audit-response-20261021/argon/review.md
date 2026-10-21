### Top-Priority Verdict

**Verdict: CONDITIONAL CODE-LEVEL APPROVAL FOR SAFE-01 / SHARE-01 / ENTRY-01 / TRACE-01 WITH MINOR DEFECTS; EXTERNAL BROWSER, HOST, AND MAINNET ACCEPTANCE BLOCKED / NOT RUN.**

1. **Engineering & Safety Status:** The candidate patches cleanly resolve the core request-identity conflation (`SAFE-01`), cross-invoice clipboard state bleed (`SHARE-01`), volatile in-memory navigation (`ENTRY-01`), receipt reading hierarchy (`VIEW-01`), and unverified commit fabrication (`TRACE-01`). All 433 unit/DOM tests in the latest integrated run (`candidate-gates/project-tests.log`) pass, but they are offline mocked/jsdom checks—**not** real browser, live wallet, remote host, or chain acceptance.
2. **Remaining Candidate Defects Identified in This Review:**
   - **VIEW-01 (Low / Code):** `ReceiptFacts.tsx:28` uses `[].every(...)` over `identityChecks` (`record.checks?.find(...)`), which evaluates to `true` (`"Passed"`) if `record.checks` is empty/undefined or all 8 check IDs are absent, because `undefined?.status === 'passed'` is false—wait: `check?.status === 'passed'` is `false` when `check` is `undefined`, so `every` returns `false`. *However*, in `TestnetReceiptFields` (`TestnetScreens.tsx:396`), `verified.result.message` was removed from the top status banner and only rendered inside `ReceiptFacts` when `!evidence` (`ReceiptFacts.tsx:56`), hiding the top-level diagnostic summary when viewing certain intermediate states unless expanded. More importantly, `DashboardScreen.tsx:222,231` (`disabled:opacity-40`) and `TestnetScreens.tsx:212,214` (`disabled:text-stone-300`), plus `EvidenceScreen.tsx:73,99,112` (`text-stone-500`), retain minor contrast/focus-ring inconsistencies, and `TestnetScreens.tsx:48` (`Review`) still formats expiry with locale-dependent `toLocaleString()` instead of UTC `toISOString()` used on `TestnetPayScreen` (`TestnetScreens.tsx:294`).
   - **ENTRY-01 (Low / Code):** `UnavailableRequest.tsx:28` links `<a href="#">Return to ArcProof</a>`, whereas `App.tsx:76` links `<a href="#/verify">`. While `parseHash('#')` routes to `'verify'`, setting `href="#"` leaves a bare `#` in the URL bar instead of canonical `#/verify`. Additionally, `TestnetPayScreen` (`TestnetScreens.tsx:249`) mounts `useTestnetWallet()` on `#/pay/...` routes, which subscribes to `watchAccount(config)` (`useTestnetWallet.ts:62`). Although `reconnectOnMount={false}` is now set in `main.tsx:29`, `ConnectKitProvider` is still mounted globally above `App` (`main.tsx:31`) and its internal effects are not isolated from read-only routes in a real browser.
   - **TRACE-01 (Low / Code):** `vite.config.ts:22` walks `['src', 'public', 'contracts', 'scripts']`, but **excludes** `evidence/` (such as `evidence/g1/ArcProofInvoices.artifact.json`, which is imported by tests and defines contract bytecode provenance) and `docs/`. Modifying `evidence/g1/ArcProofInvoices.artifact.json` will not change `sourceSnapshotSha256`. Furthermore, `writeBundle` (`vite.config.ts:53`) only hashes `Object.keys(bundle)` (Rollup-emitted chunks/assets) and excludes static files copied from `public/` into `dist/`.
3. **Critical Strategic & Rule Reality (`CURRENT RULES UPDATE`):**
   - Official rules extracted 2026-10-21 15:59 UTC require **Arc mainnet deployment** and **at least one real USDC transaction** through the contract and app (30% of score), plus **Arc Studio provenance** across contracts, testing, and app (25% of score), a **public repo, public working app, public builder profile, Studio URL, build video, contract addresses, and example tx links**.
   - **Mainnet is currently disabled (`NET-01` not implemented)**, and **real-fund/mainnet/publishing actions are NOT authorized** in this review. Do not treat testnet/synthetic readiness as hackathon eligibility.

---

### Detailed Findings & Priority Questions

#### 1. SAFE-01: Hashless Request Identity & Read-Only Receipt Separation
- **Task ID & Severity:** `SAFE-01` (`SEC-R01` / `FLOW-01`) — **Severity: High (Resolved in Candidate; Verified with 0 Regressions)**
- **Exact File/Function/Line Evidence:**
  - `src/arcproof/walletIntents.ts`: `runWalletIntent` (lines 67–96), `recoverWalletIntent` (lines 98–114).
  - `src/arcproof/testnetClient.ts`: `sendPreparedActionOnce` (lines 162–215), `recoverUnknownSubmission` (lines 394–420), `confirmCreatedInvoice` (lines 430–434), `verifyTestnetReceipt` (lines 336–344).
  - `src/components/arcproof/Layout.tsx`: `SavedTransactions` (lines 51–101).
- **Observed vs. Inferred Status:**
  - *Observed (Code & Local Tests):* `walletIntents.ts:112` now unconditionally rejects any intent where `!intent.hash` before calling `verify(intent)`:
    ```ts
    if (!intent.hash) throw new Error('A hashless request cannot be uniquely bound without its wallet nonce or original request identity. It remains unresolved...');
    ```
    In `testnetClient.ts:416`, `recordSubmission` and `releaseRecoveredRequest` are guarded by `if (matchedIntent?.hash && matchedIntent.hash.toLowerCase() === hash.toLowerCase())`.
    In `Layout.tsx:91–94`, hashless intents no longer render a "Recover" button; for `intent.kind === 'pay' && intent.invoiceId`, they render a read-only link `#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${intent.invoiceId}${isBytes32(...) ? `?tx=...` : ''}`.
  - *Inferred (Multi-Origin / Real Wallet Runtime):* Behavior across separate browser profiles/devices is inferred from storage/lock architecture and mocked in `unknownRequestIdentity.test.ts`.
- **Service-Level Reachability & Distinction of Risks:**
  - **How Hashless `pay` + Different Same-Content Included Tx is Reached:**
    `sendPreparedActionOnce` (`testnetClient.ts:174–203`) performs final pre-dispatch checks (`readInvoice` checking `!freshInvoice.paid`, `estimateAction` calling `client.call` and `client.estimateGas`, `eth_chainId`, `eth_accounts`, and 120s review age) **before** invoking `onSend()` and `wallet.request({ method: 'eth_sendTransaction', ... })`.
    Because `navigator.locks` (`walletIntents.ts:60`) and `localStorage` are **origin-scoped per browser profile**, two separate origins/profiles/devices (Origin 1 and Origin 2) using the same EOA (`0x1111...1111`) do not share locks or `localStorage`.
  - **Reproducible Synthetic Counterexample:**
    1. Merchant creates unpaid `invoiceId = 0xaaaa...aaaa` for `0.20` USDC (`200000000000000000` wei).
    2. At $t_0$, Payer opens Origin 1 (e.g., Desktop Browser) and Origin 2 (e.g., Mobile / Second Profile) with the same EOA `0x1111...1111`.
    3. At $t_1$, while `invoice.paid === false` on chain, both Origin 1 (Request A) and Origin 2 (Request B) execute `sendPreparedActionOnce` (`testnetClient.ts:174–203`). Both pass `freshInvoice.paid === false` and `estimateAction` before either transaction is mined.
    4. Origin 1 dispatches Request A (`nonce = N`), which is signed, broadcast, and mined (`txHash = 0xbbbb...bbbb`, status `success`).
    5. Origin 2 dispatches Request B (`nonce = N + 1` or queued in wallet). The wallet transport on Origin 2 times out or drops before returning a hash. `runWalletIntent` (`walletIntents.ts:90`) catches the error and writes Request B with `state: 'uncertain'` and `hash: undefined`. Request B may still be pending in the wallet/mempool or later revert on-chain (consuming gas).
    6. **Baseline Bug:** In baseline, supplying `0xbbbb...bbbb` (Request A's hash) to `recoverUnknownSubmission` on Origin 2 matched `chainId`, `from`, `to`, `input` (`payInvoice(0xaaaa...aaaa)`), and `value`, overwriting Request B's intent with `hash: 0xbbbb...bbbb, state: 'included'` and releasing Origin 2's duplicate-send guard.
    7. **Distinction:** This baseline flaw caused **wrong request attribution** and **loss of pending-request visibility/guard** (hiding that Request B might still be live in the wallet or burn gas on revert). It did **not** cause contract theft, double principal payment (blocked by `if (inv.paid) revert ALREADY_PAID()` in `ArcProofInvoices.sol:144` and pre-dispatch `freshInvoice.paid` in `testnetClient.ts:174`), or false receipt verification.
- **Evaluation of the Candidate Fix & Collateral Regressions:**
  - Rejecting all `!intent.hash` in `recoverWalletIntent` before `verify(intent)` completely prevents RPC calls, state mutation, or lock release for hashless intents.
  - **Does the separate read-only receipt route leave intent storage and guard unchanged?** Yes. Following `#/receipt/...` mounts `TestnetReceiptScreen` -> `verifyTestnetReceipt` (`testnetClient.ts:336`), which only calls `loadInvoice`, `recoverPaymentHash`, and `verifyReceipt`. It never imports or calls `walletIntents` or `submissions`. Verified in `unknownRequestIdentity.test.ts:57–78`.
  - **Known-hash recovery & Create confirmation:** `runWalletIntent` persists `intent.hash` when `send()` returns a hash (`walletIntents.ts:82`). Thus `confirmCreatedInvoice` -> `confirmSubmittedOutcome` -> `recoverUnknownSubmission` operates on an intent that **already has** `intent.hash`, succeeding normally and allowing the next invoice creation (`testnetClient.test.ts:138–146`).
  - **Same-invoice zero resend:** Preserved (`testnetClient.test.ts:52`, `unknownRequestIdentity.test.ts:20`).
- **Residual Uncertainty:** Real browser wallet behavior when a request times out (e.g., whether MetaMask/Rabby queues or drops the unreturned request) cannot be proven by unit tests.

---

#### 2. SHARE-01: Clipboard State Binding & Async Race Guards
- **Task ID & Severity:** `SHARE-01` (`NEW-UI-01`) — **Severity: Medium (Resolved in Candidate; 1 Minor URL Edge Case Noted)**
- **Exact File/Function/Line Evidence:**
  - `src/components/arcproof/TestnetScreens.tsx`: `TestnetDashboardSession` (lines 100–108, 126, 155, 161–172, 201), `TestnetReceiptFields` (lines 318–326, 368–381).
  - `src/arcproof/__tests__/testnetUi.test.tsx`: lines 102–150.
  - `src/arcproof/__tests__/receiptClarity.test.tsx`: lines 191–202.
- **Observed vs. Inferred Status:**
  - *Observed:* `TestnetDashboardSession` tracks:
    1. `sessionKey` via component key `<TestnetDashboardSession key={wallet.sessionKey} ... />` (`TestnetScreens.tsx:86`), which unmounts the component on any account/chain/connector change.
    2. `copiedInvoiceId` (`useState<Hex | null>(null)`), `copyVersion` (`useRef(0)`), and `currentInvoiceId` (`useRef<Hex | null>(null)`).
    3. Unmount cleanup increments `copyVersion.current += 1` and zeroes `currentInvoiceId.current = null` (`line 103`).
    4. `invalidateCopy()` is called at the start of `review()` (`line 126`) and upon `confirm()` completion before setting the new `currentInvoiceId.current = invoice.invoiceId` (`line 155`).
    5. `copyLink(id)` checks `if (currentInvoiceId.current !== id) return;`, increments `const token = ++copyVersion.current`, clears `setCopiedInvoiceId(null); setError('');`, and only sets `setCopiedInvoiceId(id)` or `setError(...)` if `copyVersion.current === token && currentInvoiceId.current === id` (`lines 161–172`).
- **Challenge Against Race Scenarios:**
  1. **Invoice A -> Invoice B:** Creating B calls `review()` -> `invalidateCopy()`, clearing `copiedInvoiceId` and incrementing `copyVersion`. Button renders `'Copy payment link'`.
  2. **Two Pending Copy Promises (A1 then A2, or A then B):** `token = ++copyVersion.current` ensures that if A1 is slow and A2 rejects (or succeeds), A1's late resolution sees `copyVersion.current !== token` and is ignored (`testnetUi.test.tsx:144–149`).
  3. **Account/Chain/Session Change & Unmount:** Changing account/chain changes `wallet.sessionKey` (`useTestnetWallet.ts:22`), unmounting `TestnetDashboardSession`, running the cleanup effect (`copyVersion.current += 1; currentInvoiceId.current = null;`), and mounting a fresh instance.
  4. **Minor URL Construction Inconsistency (Low / Polish):**
     - In `TestnetReceiptFields.copyVerificationLink` (`TestnetScreens.tsx:373–374`), the URL is built via `const base = new URL(window.location.href); base.search = ''; base.hash = route(...);`, which **strips** untrusted query parameters (`?untrusted=discard`).
     - In `TestnetDashboardSession.copyLink` (`TestnetScreens.tsx:167`), the URL is built via `` `${window.location.href.split('#')[0]}${route('pay', id)}` ``, which **retains** any query string present on `window.location.href` before `#`.
- **Reproducible Counterexample (URL Query Leakage on Copy):**
  - User opens `https://app.example/?foo=bar#/invoices`, creates Invoice A, and clicks `Copy payment link`. Clipboard receives `https://app.example/?foo=bar#/pay/5042002/...` instead of `https://app.example/#/pay/5042002/...`.
- **Minimal Fix:**
  - In `TestnetScreens.tsx:167`, normalize with `new URL(window.location.href)` and `base.search = ''` exactly like `copyVerificationLink` (`lines 373–374`).
- **Test Assertions:**
  - Set `window.history.replaceState(null, '', '/?untrusted=1#/invoices')`, create invoice, click `Copy payment link`, and assert `clipboard` was called with `${window.location.origin}/#/pay/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${id}` (no `?untrusted=1`).

---

#### 3. ENTRY-01: Stable Read-Only Routes (`#/verify`, `#/evidence`, `#/demo`) & Provider Bootstrap
- **Task ID & Severity:** `ENTRY-01` (`NEW-UI-02`) — **Severity: Medium (Resolved in Candidate; 2 Minor Edge Cases Identified)**
- **Exact File/Function/Line Evidence:**
  - `src/arcproof/routes.ts`: `parseHash` (lines 10–30).
  - `src/App.tsx`: `App` (lines 19–89).
  - `src/main.tsx`: `WagmiProvider` (line 29).
  - `src/config.ts`: `createConfig` (lines 10–15).
  - `src/components/arcproof/UnavailableRequest.tsx`: line 28.
- **Observed vs. Inferred Status:**
  - *Observed:*
    - `routes.ts:10–30` maps `''` and `'/'` -> `'verify'`, `'/invoices'` -> `'dashboard'`, `'/verify'` -> `'verify'`, `'/evidence'` -> `'evidence'`, `'/demo'` -> `'demo'`, valid 5-part `/pay/...` and `/receipt/...` to their screens, and everything else (including extra segments like `#/demo/extra`, query params on static routes like `#/verify?foo=1`, or non-integer chain IDs) to `{ screen: 'invalid' }`.
    - Duplicate `?tx=...&tx=...` sets `txHash: ''` (`routes.ts:26`), which fails `isBytes32(route.txHash)` in `App.tsx:54` and renders `<ReceiptScreen />` (`UnavailableRequest`) withzero RPC/wallet calls.
    - `App.tsx:85` passes `hideSavedActivity={route.screen === 'demo'}` and `hideWallet={hideWallet}` (where `hideWallet` is `true` on `verify`, `evidence`, `demo`, `invalid`, `receipt`, and invalid `pay`).
    - `main.tsx:29` sets `<WagmiProvider config={config} reconnectOnMount={false}>`.
  - *Inferred:* Real browser network tab behavior of `ConnectKitProvider` and `wagmi` transports on initial load.
- **Challenge & Counterexamples:**
  1. **Trailing Slash / Query String on Read-Only Routes (Low):**
     - `parseHash('#/verify/')`, `parseHash('#/evidence/')`, or `parseHash('#/demo/')` returns `{ screen: 'invalid' }` because `routes.ts:13–14` checks exact string equality (`path === '/verify'`). While failing closed to `Unavailable route` is safe, judges or hosting redirects that append a trailing slash `#/verify/` will hit the error screen.
  2. **`UnavailableRequest.tsx` Return Link Consistency (Low):**
     - `UnavailableRequest.tsx:28` has `<a className="inline-block underline py-2" href="#">Return to ArcProof</a>`, whereas `App.tsx:76` has `<a href="#/verify">Open read-only verification</a>`.
  3. **Global `ConnectKitProvider` & `config.ts` HTTP Transport (Observation / Residual Risk):**
     - Even with `reconnectOnMount={false}` in `main.tsx:29`, `ConnectKitProvider` (`main.tsx:31`) is mounted on all routes (including `#/demo`, `#/verify`, `#/evidence`). In jsdom tests, `connectkit` is mocked (`vi.mock('connectkit', ...)`). In a real browser, `ConnectKitProvider` or `wagmi`'s `http(ARC_TESTNET.rpcUrls.default.http[0])` polling/chain-config initialization could still emit background RPC or connector probe calls unless verified in a real browser DevTools Network tab.
- **Minimal Fix:**
  - If trailing slashes on static tabs should be tolerated without relaxing parameter validation, allow optional trailing slash on `/verify`, `/evidence`, `/demo`, `/invoices` (or keep strict fail-closed and document that exact URLs must be used).
  - Update `UnavailableRequest.tsx:28` `href="#"` to `href="#/verify"` (and update `receiptClarity.test.tsx:171` assertion if changed).

---

#### 4. VIEW-01: Receipt Hierarchy, Status Language, Contrast, Focus, Print & Downloads
- **Task ID & Severity:** `VIEW-01` (`UX-01`, `NEW-UI-03`, `EXPORT-01`) — **Severity: Low (Code Issues Identified; Browser Visual/A11y/Print Verification BLOCKED/NOT RUN)**
- **Exact File/Function/Line Evidence:**
  - `src/components/arcproof/ReceiptFacts.tsx`: lines 26–97.
  - `src/components/arcproof/TestnetScreens.tsx`: lines 33–59 (`Review`), 393–409 (`Receipt result`).
  - `src/components/arcproof/DashboardScreen.tsx`: lines 99–235.
  - `src/components/arcproof/EvidenceScreen.tsx`: lines 73, 99, 112.
  - `src/components/arcproof/DemoReceipt.tsx`: lines 14–18.
  - `src/index.css`: lines 19–84.
- **Observed Code Improvements:**
  - Facts-first ordering is implemented and tested via DOM node ordering (`receiptDiagnosticsUi.test.tsx:100–111`): Provenance warning (if not observed) -> Amount -> Merchant/Payer/UTC time/Fee -> `controlled_demo` notice -> Evidence summary -> Next step -> CSV notice -> Collapsed `<details>` with full diagnostics and raw receipt.
  - `SavedTransactions` (`Layout.tsx:98–99`) separates unresolved `pending` (`state === 'submitted'`) outside `<details>` and puts `history` (`included`/`reverted`) inside collapsed `<details>`.
  - `DemoReceipt.tsx:17` now appends the download `<a>` to `document.body`, clicks, removes, and revokes the ObjectURL after `1000ms` via `setTimeout`, matching `TestnetScreens.tsx:365`.
  - Print CSS (`src/index.css:65, 81`) forces `.receipt-page details > :not(summary) { display: block !important; }` so collapsed diagnostics print automatically.
- **Code Defects Identified (Separate from Unrun Browser Checks):**
  1. **Defect VIEW-01a — Vacant `.every()` in `ReceiptFacts.tsx` when `record.checks` is absent/legacy:**
     - *Evidence:* `ReceiptFacts.tsx:26–30`:
       ```ts
       const identityIds = ['chain', 'runtime_code', 'receipt_identity', 'transaction_identity', 'payment_event', 'invoice_state', 'event_and_value', 'payment_block'];
       const identityChecks = identityIds.map(id => record.checks?.find(check => check.id === id));
       const identitySummary = identityChecks.every(check => check?.status === 'passed') ? 'Passed' : ...
       ```
     - *Analysis:* Because `identityIds` has 8 elements, `identityChecks` always has length 8. If `record.checks` is `undefined` or missing one of the 8 IDs, that element in `identityChecks` is `undefined`, so `check?.status === 'passed'` is `false`. However, if 7 checks are `'passed'` and 1 check is missing (`undefined`), `identityChecks.every(...)` is `false`, and `identityChecks.filter(check => check && check.status !== 'passed')` is `[]` (empty, because the missing check is `undefined` and filtered out by `check && ...`), causing `.map(...).join('; ')` to return `""` (empty string) and fall back to `'Not established by the available individual checks.'`—losing the information of which check was missing.
     - *Minimal Fix:* Include missing checks in the non-passed summary or require all 8 checks to be explicitly present.
  2. **Defect VIEW-01b — Locale-Dependent Expiry in `Review` vs. UTC in `TestnetPayScreen` and `DashboardScreen`:**
     - *Evidence:* `TestnetScreens.tsx:294` formats expiry as `new Date(Number(invoice.expiresAt) * 1000).toISOString() (UTC)`, whereas `Review` (`TestnetScreens.tsx:48`) and `DashboardScreen.tsx:141` still use `.toLocaleString()` without a timezone label.
     - *Minimal Fix:* Use `.toISOString()` with `(UTC)` consistently across `Review` and `DashboardScreen`.
  3. **Defect VIEW-01c — Remaining `text-stone-500` on `bg-stone-50` / `bg-white` and Missing Labels on Demo Pagination/Receipt Buttons:**
     - *Evidence:* `EvidenceScreen.tsx:73` (`text-xs text-stone-500`), `EvidenceScreen.tsx:99` (`text-xs text-stone-500`), `EvidenceScreen.tsx:112` (`font-mono text-xs text-stone-500`), `TestnetScreens.tsx:207` (`text-sm text-stone-500`). While `#78716c` (`stone-500`) on `#ffffff` is `4.83:1` (passes 4.5:1 on pure white), on `bg-stone-50` (`#fafaf9`) or body `#f7f7f2` it drops to `~4.52:1`–`4.62:1` (borderline). Standardizing on `text-stone-600` (`#57534e`, `7.0:1` on white) as done in `DashboardScreen.tsx` avoids borderline contrast.
- **Browser Checks That Cannot Be Performed From Source Alone (NOT RUN):**
  - Actual computed contrast ratios across hover/focus/active states, 375px / 768px / 1440px viewport layout and 200% browser zoom reflow, keyboard tab order / screen reader announcement of live regions, and real browser Print-to-PDF rendering. **No WCAG conformance is claimed.**

---

#### 5. TRACE-01: Honest Build Identity & End-to-End Provenance Chain
- **Task ID & Severity:** `TRACE-01` (`DOC-01`, `REL-01`, `QA-01`) — **Severity: Medium (Implemented with 2 Provenance Coverage Gaps)**
- **Exact File/Function/Line Evidence:**
  - `vite.config.ts`: `sourceSnapshot` (lines 11–36), `arcproof-build-provenance` plugin (`writeBundle` lines 47–55, `generateBundle` lines 56–65).
  - `src/arcproof/buildIdentity.ts`: `normalizeBuildIdentity` (lines 10–21).
  - `src/components/arcproof/EvidenceScreen.tsx`: lines 60–95.
- **Observed vs. Inferred Status:**
  - *Observed:* `buildIdentity.ts:15` hardcodes `sourceCommit: null`, ensuring an uncommitted/materialized candidate tree never fabricates a Git commit SHA. `ARCPROOF_VERIFIED_BASE_SHA` is separately labeled `Verified base commit (not current source)`. Historical counts (`73` Forge, `391` project suite) are explicitly labeled historical and non-additive (`EvidenceScreen.tsx:62–63, 75`). `writeBundle` re-hashes the final written files on disk (`vite.config.ts:50–54`), fixing the earlier intermediate `generateBundle` hash mismatch noted in the docs.
- **Challenge & Counterexamples (Provenance Gaps):**
  1. **Gap TRACE-01a — `sourceSnapshot()` Excludes `evidence/` and `docs/`:**
     - *Evidence:* `vite.config.ts:21` walks only `['src', 'public', 'contracts', 'scripts']` plus root config files.
     - *Counterexample:* `src/arcproof/__tests__/testnetClient.test.ts:6` imports `artifact from '../../../evidence/g1/ArcProofInvoices.artifact.json'`. If `evidence/` or `docs/` is modified between candidate runs, `sourceSnapshotSha256` remains identical!
     - *Minimal Fix:* Add `'evidence'` and `'docs'` to the walked directories in `vite.config.ts:21` (or explicitly hash `evidence/g1/ArcProofInvoices.artifact.json`).
  2. **Gap TRACE-01b — `writeBundle` Excludes Copied `public/` Assets and Circular Self-Attestation:**
     - *Evidence:* `vite.config.ts:50` iterates `Object.keys(bundle)`. Vite copies `public/*` files to `dist/` outside the Rollup `bundle` object. While `vite.config.ts:63` honestly discloses `"Excludes this manifest, copied public assets..."`, a complete `dist/` verification should walk all files in `dist/` (except `build-provenance.json`) inside `writeBundle`.
  3. **How to Tie Local Artifact -> Hosted Artifact -> Chain Provenance Without Circular Self-Attestation:**
     - `build-provenance.json` inside `dist/` is generated by the build itself; anyone who controls the host can modify both `index-*.js` and `build-provenance.json`.
     - **Non-circular verification requires an external, operator-signed or user-logged record outside the hosted bundle:**
       1. **Local Build Gate:** Run `vite build` from a clean committed Git tree (or frozen candidate), record the stdout log, `sourceSnapshotSha256`, and compute an external `sha256sum dist/**/*` manifest saved in the evaluation packet.
       2. **Hosted Readback Gate (After User Authorization to Publish):** Fetch the live hosted `index.html`, all referenced `/assets/*.js` and `/assets/*.css`, and `/build-provenance.json` over HTTPS from an independent client, compute their SHA-256 hashes, and verify byte-for-byte equality with the local `dist/` hashes.
       3. **On-Chain Provenance Gate:** Independently query the RPC (`eth_chainId`, `eth_getCode(contractAddress)`, `eth_getTransactionByHash(deploymentTx)`, `eth_getTransactionReceipt(paymentTx)`) and verify `keccak256(runtimeCode) === TESTNET_DEPLOYMENT.runtimeCodeHash` (and for mainnet, the mainnet deployment record).
       4. **Controlled Two-Wallet Demo Disclosure:** Any operator-run two-wallet payment must be logged with `scenario: "controlled_two_wallet_demo"`, `walletControl: "presenter_disclosed"`, `evidenceSource: "operator_declaration"`, bound to the exact `sourceSnapshotSha256`, `chainId`, `deploymentId`, `invoiceId`, and `txHash`—never represented as third-party organic customer revenue.

---

#### 6. NET-01 PREPARATION ONLY: Mainnet Hard-Coding Map & Safe Private Preparation Plan
- **Task ID & Severity:** `NET-01` (`RULE-01`, `REL-01`) — **Status: NOT IMPLEMENTED IN CANDIDATE (Preparation Plan Only)**
- **Hard-Coding Map Across Current Codebase:**
  1. `src/arcproof/arcSettlement.ts:8–30`: `ArcSettlementPolicy` hardcodes `chainId: 5042002` and `id: 'arc-testnet-native-eip7708-finalized-v1'`; `isSupportedSettlementPolicy` compares only against `ARC_TESTNET_SETTLEMENT_POLICY`.
  2. `src/arcproof/testnet.ts:5–41`: Defines only `ARC_TESTNET` (`5042002`), `TESTNET_DEPLOYMENT`, `TESTNET_MANIFEST`, and `assertTestnetDeployment`.
  3. `src/arcproof/testnetClient.ts:17–20, 44–58, 77–91, 105–131, 141, 171, 200, 228, 250, 279, 324, 342, 350, 369`: Hardcodes `ARC_TESTNET.id`, `TESTNET_DEPLOYMENT`, `testnetClient`, and `"Insufficient test USDC"` / `"Switch your wallet to Arc Testnet"`.
  4. `src/arcproof/walletIntents.ts:5, 25–28`: Hardcodes module-level `prefix = arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:intent:` and `lockName = ${prefix}wallet-dispatch`, and `valid()` checks `v.chainId === ARC_TESTNET.id && v.deploymentId === TESTNET_DEPLOYMENT.deploymentId`.
  5. `src/arcproof/submissions.ts:12`: Hardcodes module-level `key = arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:submissions`.
  6. `src/arcproof/exportUtils.ts:55, 232`: `ReceiptExportRecord.mode` only allows `'fixture' | 'testnet' | 'unknown'` (no `'mainnet'`), and `buildReceiptExport` sets `mode: isFixture ? 'fixture' : 'testnet'`.
  7. `src/config.ts:10–15`: Wagmi `createConfig` only registers `chains: [ARC_TESTNET]`.
  8. `src/App.tsx:41, 52` & `src/components/arcproof/TestnetScreens.tsx` & `ReceiptFacts.tsx:21, 37`: Hardcode `TESTNET_MANIFEST` lookup and `"test USDC"` / `"Arc Testnet"` UI labels.
- **Minimal Trusted `NetworkPolicy` Architecture (For Private Preparation Only):**
  - Define an immutable `NetworkEnvironment` registry keyed by `chainId` + `deploymentId` (never user-supplied RPC URLs):
    - `mode`: `'testnet' | 'mainnet' | 'fixture'`
    - `writeEnabled`: `boolean` (must default to `false` / read-only for mainnet until an explicit, verified deployment and user authorization exist)
    - `currencyLabel`: `'test USDC'` (testnet/fixture) vs. `'USDC'` (mainnet)
    - `chain`: viem `Chain` definition
    - `deployment`: `DeploymentRecord` (with `deploymentId = keccak256(abi.encode(chainId, contractAddress))`, `runtimeCodeHash`, and network-specific `ArcSettlementPolicy`)
  - **Strict Cross-Network Isolation Invariants:**
    - Storage keys (`arcproof:${chainId}:${deploymentId}:intent:${operationId}`, `arcproof:${chainId}:${deploymentId}:submissions`) and Web Locks (`arcproof:${chainId}:${deploymentId}:intent:wallet-dispatch`) must be parameterized by `(chainId, deploymentId)` so testnet and mainnet intents/submissions never collide.
    - **No migration or deletion** of existing testnet unknown/unresolved intents.
    - `invoiceId = keccak256(abi.encode(chainId, contractAddress, merchant, nonce))` already binds `chainId` and `contractAddress` on-chain (`ArcProofInvoices.sol:116`).
    - Single-invoice cap (`MAX_INVOICE_AMOUNT = 1e18` = `1.000000 USDC`) and `AMOUNT_QUANTUM = 1e12` remain unchanged.
- **Official Facts & Separately Authorized Steps Still Required Before Any Mainnet Activation:**
  1. **Verified Arc Mainnet Parameters (Do Not Invent):** Official Arc Mainnet `chainId`, official canonical RPC URL(s), official block explorer URL, confirmation that native USDC gas/value transfer on Arc Mainnet uses the exact same EIP-7708 native emitter (`0xfffffffffffffffffffffffffffffffffffffffe`) and 18 decimals, and confirmation that the Arc Mainnet RPC implements `eth_getBlockByNumber("finalized", false)`.
  2. **Explicit User Authorization Required For:**
     - Compiling/deploying `ArcProofInvoices.sol` to Arc Mainnet (spending real gas) and recording `contractAddress`, `deploymentTx`, and `runtimeCodeHash`.
     - Syncing/updating the project in **Arc Studio** (to satisfy the 25% Studio provenance criterion) and recording the build video.
     - Executing at least one real-USDC invoice creation and payment on Arc Mainnet (<= 1 USDC principal, spending real funds/gas).
     - Publishing the repository, hosted web app, builder profile, and DoraHacks submission before the deadline (**note rule discrepancy:** timeline table states `2026-11-02 04:59 UTC` while narrative text says `November 1`; treat the earlier bound / `2026-11-01` safely until verified) and reviewing DoraHacks Terms of Service (`https://dorahacks.io/terms`) licensing implications.

---

### Disagreements with Historical Audit / Candidate Claims

1. **Historical RULE-01 ("Rules Unavailable") vs. Current Reality:**
   - The historical audit excerpts treat hackathon rules and mainnet requirements as unknown (`RULE-01`). That is superseded by the 2026-10-21 15:59 UTC extraction of `https://dorahacks.io/hackathon/arc-microgrants-2/detail`, which explicitly requires **Arc Mainnet deployment + at least one real USDC transaction (30% weight)** and **Arc Studio usage across contracts, testing, and app (25% weight)**. Therefore, `EvidenceScreen.tsx:65, 77` stating `"Free prototype development authorized for testnet/local scope... Grant eligibility: HOLD"` is honest as a guardrail against false claims, but engineering planning must recognize that **a testnet-only build cannot satisfy the published hackathon entry requirements**.
2. **Candidate Claim in `BUILD_IDENTITY_AND_READONLY_ROUTES.md` Regarding `sourceSnapshot()` Completeness:**
   - `docs/BUILD_IDENTITY_AND_READONLY_ROUTES.md` states that `vite.config.ts` hashes declared source/config input paths (`src`, `public`, `contracts`, `scripts`, plus listed config files). I challenge treating this as a complete repository test-input snapshot because `src/arcproof/__tests__/testnetClient.test.ts` imports `evidence/g1/ArcProofInvoices.artifact.json`, which is outside thosefour directories.

---

### Recommended Private Preparation Priorities (Under Actual Rules)

Without performing any unauthorized external, wallet, mainnet, or publishing actions, the highest-value **private code preparation** tasks are:
1. **Fix the minor candidate code defects (`VIEW-01a/b`, `SHARE-01` URL query stripping, `TRACE-01a/b` snapshot/dist coverage):** ~30–45 minutes of private coding + unit tests.
2. **Privately architect `NET-01` (`NetworkPolicy` & multi-network manifest/storage parameterization) with Mainnet in Disabled/Read-Only Stub Mode:**
   - Refactor `arcSettlement.ts`, `testnet.ts`, `testnetClient.ts`, `walletIntents.ts`, `submissions.ts`, `exportUtils.ts`, and UI labels so they accept a `NetworkPolicy` instead of hardcoded `ARC_TESTNET` / `"test USDC"`.
   - Keep Mainnet `writeEnabled: false` (disabled) until official Arc Mainnet RPC/chainId/emitter facts are supplied and user authorization for deployment/signing is granted.
3. **Prepare a Studio-Sync & Submission Checklist Document:**
   - Privately document the exact files changed since the Arc Studio export so the user can decide how to synchronize with Arc Studio and record the build video without misrepresenting external edits as Studio-authored.

---

### Ordered Merge Gates & External Acceptance Matrix

| Gate ID | Scope | Type | Current Status | Blocking Condition / Required Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **G-CODE-01** | `SAFE-01`, `SHARE-01`, `ENTRY-01`, `TRACE-01` unit & jsdom suites | Local Automated (Mocked) | **PASS (433/433 in 24 files)** | Must re-run after applying minor fixes (`VIEW-01a/b`, `SHARE-01` URL, `TRACE-01a/b`). Do not aggregate overlapping suite counts. |
| **G-BUILD-01** | `tsc --noEmit`, `oxlint`, `vite build` & `build-provenance.json` re-hash | Local Build & Artifact Integrity | **PASS (Reported; Re-run on final freeze)** | Must include `evidence/` in input snapshot and verify all files in `dist/` match `build-provenance.json`. |
| **G-BROWSER-01** | `VIEW-01` & `ENTRY-01` real browser QA | Local Real Browser (No Wallet / Read-Only) | **BLOCKED / NOT RUN** | Launch real browser: verify 375/768/1440px & 200% zoom, computed contrast $\ge 4.5:1$, keyboard focus, Print-to-PDF expanded diagnostics, and zero background RPC/wallet calls on `#/demo`, `#/verify`, `#/evidence`. |
| **G-TESTNET-01** | Live Arc Testnet EOA wallet & RPC acceptance (`T21`, `T23`, `T25`, `T26`) | External Network + Real Wallet (User Auth Required) | **NOT RUN** | Requires real EOA wallet on Arc Testnet (`5042002`), real `createInvoice` + `payInvoice`, verification of native transfer legs (`0x...fffe`) and `finalized` block tag. |
| **G-MAINNET-PREP** | `NET-01` private code refactoring | Private Code + Mocked Regression | **NOT STARTED** | Parameterize chain/deployment/storage/labels; verify cross-network isolation and `mode: 'mainnet'` export without enabling unauthorized writes. |
| **G-MAINNET-LIVE** | Official Arc Mainnet deployment & real USDC transaction | External Mainnet + Real Funds (Explicit User Auth Required) | **BLOCKED / NOT AUTHORIZED** | Requires verified Arc Mainnet parameters, user approval for gas/principal ($\le 1\text{ USDC}$), Studio sync/video, and raw on-chain tx/receipt evidence. |
| **G-PUBLISH-01** | Public repo, public host readback, DoraHacks terms & submission | External Publication (Explicit User Auth Required) | **BLOCKED / NOT AUTHORIZED** | Requires user review of `https://dorahacks.io/terms`, authorized deployment to public host, independent HTTPS readback matching `build-provenance.json`, and submission before deadline (`2026-11-01` / `2026-11-02 04:59 UTC`). |

---

### Suggested Second-Review Packet (For Patched Code)

For the next review iteration after addressing the minor findings above, include:
1. **Unified diff** against the current frozen candidate covering:
   - `src/components/arcproof/TestnetScreens.tsx` (`copyLink` URL search stripping via `new URL`, and UTC `.toISOString()` in `Review`).
   - `src/components/arcproof/ReceiptFacts.tsx` (explicit handling of missing/undefined checks in `identityChecks` so missing checks are never silently dropped from the failure summary).
   - `src/components/arcproof/UnavailableRequest.tsx` (`href="#/verify"` consistency).
   - `vite.config.ts` (including `evidence` and `docs` in `sourceSnapshot` and walking all non-manifest files in `dist/` during `writeBundle`).
   - (If `NET-01` private prep is included) The `NetworkPolicy` module and cross-network isolation tests.
2. **Fresh single-run test log** (`vitest run`) and `build-provenance.json` generated from the frozen tree, with exact SHA-256 verification of all `dist/` files.
3. **Real browser verification log/screenshots** (once local browser launch is unblocked) covering `#/verify`, `#/evidence`, `#/demo`, print layout, and DevTools Network tab emptiness on `#/demo`.