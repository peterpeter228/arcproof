# Independent export review triage

Scope: private, mainnet-disabled prototype only. No production deployment, wallet signing, transfer, Studio change, API call, or Git write performed by this worker.

## ADV01 and ADV02: reproduced and fixed

Unknown deployment results previously retained RPC observations and payment facts regardless of verified status. Nonverified statuses also retained their original reason instead of UNKNOWN_DEPLOYMENT. Synthetic results with populated diagnostic snapshots likewise retained factsBasis identity_bound_rpc_observation, source/checks and payment fields despite their synthetic status. Legacy caller-supplied fallbacks could restore these fields even if snapshots were gated.

The fix derives observation permission from matching request scope, non-synthetic provenance, and registry classification. It gates both diagnostic snapshots and legacy payment fallback fields, checks, source, read timing, observationScope and verifiedAt. Known trusted nonverified observations intentionally remain diagnostic and are retained. Scope mismatches continue to take precedence with PENDING and export_scope failure. Synthetic inputs continue SIMULATED_NOT_VERIFIED. Unknown non-synthetic inputs are UNKNOWN_DEPLOYMENT.

These are export boundary/claim-hardening defects; they did not establish a bypass of verificationVerified or settlementEvidence certification on unknown/synthetic deployments.

## ADV05: reproduced with correction and fixed defensively

Malformed amount strings such as invalid and 0.20 throw during BigInt conversion. The review's claim that empty string throws is inaccurate: BigInt('') yields zero; whitespace and hexadecimal also coerce unexpectedly. The verifier's ordinary bigint.toString generation is not affected; this is defensive caller-boundary hardening.

The exporter now checks for decimal-digit representation before conversion. A malformed observed invoice amount produces WRONG_EVENT_DATA, a specific export_amount diagnostic, no payment facts or evidence, no verifiedAt, and verificationVerified false. It does not merely suppress the exception while retaining a VERIFIED claim. Registry/synthetic/scope rejection remains higher priority. No new numeric range policy was added. If a future trusted mainnet diagnostic amount is malformed, output mode also downgrades to unknown.

## Test evidence

- New argonExportDiagnostics.test.ts: 22 tests, run against original source BEFORE implementation edits. Original: 19 failed, 3 passed. Log: export-original-red.log.
- Coverage includes unknown VERIFIED/UNVERIFIED_FINALITY/INVOICE_NOT_PAID/FAILED/PENDING, fixture with and without synthetic flag, trusted identity marked synthetic, unknown synthetic, legacy fallbacks, scope mismatch priority, trusted nonverified diagnostics and full trusted mocked positive verifier path.
- Malformed representations: invalid, 0.20, empty, whitespace, -1, 0x10, +1.
- Targeted suite after fixes: 4 files, 92 tests passed. Log: export-fixed-green.log.
- TypeScript check passed with no output. Log: export-typecheck.log.
- Full suite: 34 files, 521 tests passed. Log: export-full-suite.log. This run preceded the final one-line future-mainnet mode downgrade; parent is rerunning overall acceptance.

T24 formatting tests formerly used an unknown deployment but expected retained integer strings. With parent permission, formatting controls now use TESTNET_DEPLOYMENT; original assertions, numeric precision and CSV formula protections are preserved. Unknown-target rejection has dedicated new negative coverage. The transitional failures are retained in export-legacy-formatting-fixture-failures.log.

Only production file changed: src/arcproof/exportUtils.ts. Tests changed: src/arcproof/__tests__/argonExportDiagnostics.test.ts (new), src/arcproof/__tests__/T24_exportUtils.test.ts (trusted formatting fixtures).

Final validation after mainnet mode downgrade and explicit JSON parse test typing: bash scripts/check.sh passed (type-aware lint, repository lint, tsc); export-full-check.log. New regression file rerun: all 22 passed; export-final-targeted.log. Initial full-check test-only implicit-any issue fixed with ReceiptExportRecord[] type annotation, no lint suppression.
