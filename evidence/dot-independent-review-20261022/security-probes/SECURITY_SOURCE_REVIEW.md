# ArcProof Stage A independent source/security review

Reviewed remote HEAD `34eb952411a5d12ddba5550185593dc6df3e5584` against `8f748d3052be163f2c039790a73a4238c25b5869`, using the restored source snapshot and full compare patches. References below are to the original `source/` unless stated otherwise. This is a source review and offline regression exercise, not an audit, live-chain acceptance, deployment approval, or permission to enable mainnet.

## Findings and repairs

### S1 — Low: synthetic export records could carry a verified badge and settlement evidence

- Location: `src/arcproof/exportUtils.ts:218–225` (original); repaired in `fixed/src/arcproof/exportUtils.ts:218–238,252`.
- The existing FR-02 fix rejected unknown deployments but accepted `mode === 'fixture'` as a verified-evidence target. A caller-supplied successful result for `FIXTURE_MANIFEST[0]`, with `isFixture=true`, exported `verificationVerified=true`, `verificationStatus=VERIFIED`, settlement evidence, and a verification timestamp in both JSON and CSV.
- `isFixture=true` also failed to downgrade a trusted testnet deployment identity: that synthetic input retained `mode=testnet` and the success fields.
- This contradicts the explicit fixture boundary in `src/arcproof/manifest.ts:37–39`. Current `DemoReceipt` constructs a separately labelled non-verified export directly, so no current demo route exploit or wallet-send consequence was established. It is a reusable-export safety invariant gap, not a funds-loss finding.
- Minimal repair: fixture-related data is never verified, gets an explicit `SIMULATED_NOT_VERIFIED` reason/message, loses both evidence fields and `verifiedAt`, and cannot retain a real-network mode. Only an explicitly requested registered fixture gets `mode=fixture`; unknown/untrusted identities remain `mode=unknown`. A mismatched observation scope retains the earlier `PENDING` rejection and null observations.
- New tests: `fixed/src/arcproof/__tests__/fixtureExportBoundary.test.tsx:72–115`. Cover registered fixture, false fixture flag, trusted identity plus synthetic flag, unknown identity, untrusted mainnet claim, legacy/identity-bound inputs, non-success synthetic input, scope mismatch, and the genuine trusted non-fixture verifier path using a mocked RPC control. All synthetic cases assert JSON and parsed CSV, not only the in-memory object.

### S2 — Low: absolute “keeps no balance” claim was incorrect

- Locations: `src/components/arcproof/HomeScreen.tsx:17`; `docs/SUBMISSION_READINESS.md:69`.
- Contract behavior preserves the pre-existing balance (`contracts/ArcProofInvoices.sol:168–171,184–185`) rather than asserting a zero balance. Forced/pre-existing funds have no recovery mechanism.
- Repaired narrowly: invoice principal is forwarded in the same transaction without retention; pre-existing or forcibly sent balance remains locked and cannot be recovered. Added a static rendering regression at `fixtureExportBoundary.test.tsx:118–124`.

### S3 — Informational: test provenance comment overstated baseline reproduction

- Location: `src/arcproof/__tests__/finalReviewRegressions.test.tsx:3`.
- “Each case reproduced on 8f748d3” contradicts the corrected per-finding provenance in the report, including FR-05/FR-06 classifications.
- Changed only the comment to refer to the report's per-finding reproduction provenance. No existing assertions changed.

## Runtime review conclusions

- **FR-01, fixed-build write restriction:** `networkPolicy.ts:65–74` now checks trusted context identity, fixed build identity, write enablement, and trusted deployment. URL inputs cannot provide another writable context.
- **FR-02, unknown export identity:** existing downgrade remains intact; S1 adds the missing synthetic boundary. No general imported receipt is promoted to live proof by the changed UI.
- **FR-03, canonical routes:** `routes.ts:22–28` uses canonical nonzero decimal plus safe-integer validation; duplicate tx values and noncanonical path depth do not pass the valid receipt/pay branch. `App.tsx:59–74` resolves from the build manifest and checks identifiers before mounting live screens. Unknown unrelated query parameters are ignored, not used for chain/address selection.
- **FR-04, receipt conflict truthfulness:** `testnetClient.ts:345–347` raises a typed provenance conflict and `receiptVerifier.ts:300–307` maps it to `INVALID_LOG_PROVENANCE`. Missing receipts remain `PENDING`. Other malformed RPC data fail closed later; this is more truthful diagnostic classification, not a new verification capability.
- **FR-05, currency wording:** network-specific labels and unavailable-mode wording do not certify a deployment. Mainnet currency wording tests are synthetic render tests, not evidence that a live mainnet record exists.
- **FR-06, live wallet session:** `testnetClient.ts:213–217` now compares the prepared payment to the current account/session version. The later provider chain/account checks and `assertCurrent()` remain at `232–239`. This is early-failure hardening, not proof of a previously exploitable send bypass.
- **FR-07, renderable expiry:** `testnetClient.ts:81–85` rejects nonpositive and JavaScript-Date-unrenderable expiry values before UI formatting. Contract amount/state rules remain unchanged.
- **Mainnet disabled:** `config.ts:12–14` disables connectors, EIP-6963 discovery, and wagmi storage when writes are disabled; `main.tsx:29` disables reconnect on mount; `networkPolicy.ts:35–38` keeps deployment null and writes disabled; `manifest.ts:34` keeps production empty. `App.tsx:55–57` does not mount business screens on mainnet. The changed UI does not alter these bootstrap gates.
- **Wallet storage/recovery:** no runtime wallet persistence changes in this comparison. Existing fail-closed behavior remains. A known availability limitation persists at `walletIntents.ts:99–103,120–127`: a returned hash that cannot be persisted is shown in memory, but subsequent recovery re-reads a hashless persisted row and refuses to settle it. Do not describe that as recovered or safe to resend; it is intentionally unresolved and already disclosed.
- **Verifier/source binding:** changed receipt display and exports continue to distinguish observation scope from verified settlement. The demo's deliberately synthetic manual record remains separate from live verifier evidence. Actual fixture-built tests cannot establish RPC finality, current deployment status, or mainnet acceptance.

No high-severity or funds-loss defect was established in the changed runtime code. All changed runtime files, changed tests, bootstrap policy, manifest classification, and related wallet/recovery boundaries were read. This statement is bounded to the reviewed snapshot and these checks.

## Test sufficiency and remaining gaps

- The new 11-case regression suite run against the untouched original source produces **8 assertion failures / 3 passes**, including the Home wording failure; no import/compilation failure accounts for those red results. The original narrower export probe also produced two intended failures.
- Original FR-02 covered unknown deployment rejection, not registered fixture or synthetic-flag reuse of a trusted identity. S1's regression suite closes that gap for the builder and JSON/CSV serialization.
- FR-04's added adapter regression exercises `removed=true`, not independently mismatched log block hash, block number, or transaction hash. Those variants would be useful diagnostic-branch tests.
- FR-06's added test exercises a changed connection version. Independent mid-read account switch and disconnect variants would improve coverage, even though the final safety guards already exist.
- FR-07 tests huge and zero expiry; exact max-Date seconds, max+1, and negative values would strengthen boundary coverage.
- The synthetic mainnet export test intentionally uses an untrusted mainnet claim because the production manifest is empty. It is not a positive trusted-mainnet control and must not be represented as mainnet acceptance.
- CSV cell sanitization is string-level tested. The acknowledged Excel/LibreOffice import behavior remains NOT_RUN; neither this patch nor these tests establish spreadsheet behavior.
- Current mocked-RPC genuine-path control proves regression preservation only. Live chain re-verification, browser behavior, RPC endpoint freshness, deployment provenance, and external rule checks belong to the separately scoped parent checks.

## Validation of the final fixed snapshot

- `bun run check`: PASS (lint + TypeScript), exit 0.
- Focused tests (fixture boundary, FR regressions, T24 export, export observations): **82 / 82 PASS**, 4 files.
- Full Vitest suite after the final test annotation edit: **496 / 496 PASS**, 32 files, exit 0.
- During the first check, two unnecessary test-only Hex assertions failed lint. They were replaced with a typed evidence declaration; the final check and full suite above are after that correction.
- Baseline restoration/source files were not edited. Only the five authorized candidate paths below changed in `fixed/`; test/cache/build artifacts and report/log files are separate.

## Deliverables

- `security-probes/review-fixes.patch`: clean unified patch for the five paths.
- `security-probes/review-fixes-sha256.json`: SHA-256 of each modified candidate file.
- `security-probes/full-boundary-red.log`: new regressions against original source, 8 fail / 3 pass.
- `security-probes/export-boundary.log`: original two-case bug probe, 2 fail.
- `security-probes/fixed-focused.log`: 82-pass focused run.
- `security-probes/fixed-check.log`: final passing check.
- `security-probes/fixed-full-tests.log`: final 496-pass full suite.

Authorized candidate paths:
1. `src/arcproof/exportUtils.ts`
2. `src/components/arcproof/HomeScreen.tsx`
3. `docs/SUBMISSION_READINESS.md`
4. `src/arcproof/__tests__/finalReviewRegressions.test.tsx` (comment only)
5. `src/arcproof/__tests__/fixtureExportBoundary.test.tsx` (new)

No external write, deployment, transaction/signature, production activation, main-branch update, Studio change, or external model call was performed.
