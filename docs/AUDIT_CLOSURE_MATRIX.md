# Audit closure matrix: all 16 original issue IDs

Local quality follow-up, 2026-10-21 UTC. This matrix covers the independent audit's fixed source baseline `d34138b19a3878fd095413822c48d28fea6a4c58` and the subsequent private candidate work. The coordinator reports remote continuation baseline `42e9ac9d46f7769b9fa428e27511edd66e76c1c9`; this quality task did not read GitHub or prove that its local copy is that remote commit. Final combined source identity and check results must come from the integration readback/report, not this table.

**Fixed** means the described defect is fixed within the local code/check scope stated. **Partial** means meaningful local work exists but at least one acceptance requirement remains. **Blocked** means completion needs missing evidence or a separate owner decision/authorization. These issue statuses are not gate-test statuses and do not imply eligibility, deployment, professional audit or production readiness.

| ID | Status | Local evidence / remaining completion requirement |
| --- | --- | --- |
| RULE-01 | blocked | Testnet and fixtures do not meet the audit-reported mainnet/real-USDC requirement. Current complete official rules, deadline/timezone and eligibility remain unverified here. No funds, mainnet action or submission is authorized by this table. |
| REL-01 | blocked | Private source work is not a proven running Studio/judge build. Current Studio build is unknown; historical version records are not current inspection. Need authorized same-version runtime, accessible artifact links and actual acceptance. |
| FLOW-01 | partial | Durable intents, Web Locks, exact known-hash recovery and fail-closed unknown outcomes have local regression evidence. Newly reproduced malformed-preflight persistence poisoning is fixed before write, with eight malformed-input cases and the exact independent regression passing in final integration. Actual two-tab/browser, replacement/cancellation and cross-device recovery remain incomplete. |
| SEC-01 | fixed | Local production capture modules removed; synthetic parent-origin/source attempts and bundle checks pass in the prior integration. Actual deployed hosting headers/runtime are not inspected or certified by this local fix. |
| DEV-01 | fixed | Local loopback defaults, Host/CORS restrictions and legitimate HMR checks pass in the prior integration. Actual Studio/hosting access policy remains unverified; no wildcard exception is authorized. |
| UX-01 | partial | Local fact-rich receipt, read-only deep-link verification and stale-result invalidation implemented. Current browser responsive/print/download and independent second-session acceptance remain unproved. |
| DOC-01 | partial | Current-vs-historical evidence boundaries, all 16 issue IDs, explicit submission draft and licensing boundary now documented. Final merged counts and baseline identity are reconciled in README/STATUS and dated report. Four optional historical evidence-index/gate/effort documents retain their remote versions; this is not complete gate-document synchronization. Official-rule source snapshot, accessible Studio/judge links and actual final materials remain missing. |
| DEP-01 | fixed | Headless test workflow migrated to patched Vitest4.1.12 with Vite6.4.4; unchanged business/adversarial assertions and clean frozen install pass. The separate optional TypeScript/Solana peer debt and five audit records remain disclosed under DEP-02. |
| STATE-01 | fixed | Local verifier/recovery distinguish explicit success/revert from missing/invalid status; current source regressions cover fail-closed unknown state. This is synthetic boundary validation, not a real provider incident or live acceptance. |
| EXPORT-01 | partial | Final integrated tests pass for identity-bound observations, reason/check/source fields, scope mismatch and no false success. Excel/Sheets text-import roundtrip remains unverified. |
| UI-02 | partial | Semantic/layout/print source changes and synthetic tests pass in the final integration. Real 375px/200% zoom/keyboard/contrast/print acceptance remains blocked or not run. jsdom does not close those checks. |
| UI-03 | fixed | Local unsupported/invalid routes fail immediately without fake wait or wallet call-to-action; current regressions cover malformed route/deployment handling. Historical source and failure evidence are retained; migrated six-case reviewer suite asserts immediate no-wallet/no-fetch behavior. |
| DEMO-01 | fixed | Offline creation/export share a coherent fixture domain; ID recomputation and simulated/unverified labels have local regression coverage. A fixture is never real payment or revenue. |
| DEP-02 | partial | Unused-SDK/tooling cleanup, clean frozen installation, bundle inspection and feature regressions pass. Five advisory records, TypeScript optional-peer debt and broad wallet chunks remain. Remaining dependency advisories need reachable-entry analysis, not audit-count dismissal. |
| QA-01 | partial | All 122 whole-repository lint diagnostics are removed without ignores or broad casts; affected archived helpers also typecheck. Current UI/wallet tests pass. All 114 service and six reviewer-UI names are retained and pass after documented semantic migration plus the focused input fix; their earlier failures stay preserved. No remote CI run exists. Manual CI remains an inactive proposal under zero-budget approval. |
| IP-01 | blocked | No blanket MIT license selected. Existing per-file/upstream licenses remain intact. Owner decision and release-specific source/asset rights review are required before licensing or public release. |

## Evidence that must not be upgraded by inference

- The independent audit **reports** successful read-only RPC verification of one historical same-wallet testnet transaction (`controlled_demo`). Its raw RPC files are not available in this task. This is reviewer-reported evidence, not a fresh rerun or independently inspected raw capture here.
- Studio's current build is **unknown**. Older recorded checkpoints, project/source records or screenshots do not prove the currently running SHA. This task did not sign in, inspect or update Studio.
- Fresh local/mock tests do not prove two-wallet T25/T26, real-wallet rejection/replacement/cancellation, live finality, public availability, revenue, grant eligibility, mainnet suitability or professional security audit.
- Historical reports/logs are retained unchanged. Read the latest dated integrated report for combined results; do not add counts from overlapping suites as independent coverage.

See [quality gates](QUALITY_GATES.md), [license boundary](LICENSING_BOUNDARY.md), `STATUS.md`, and the dated evidence directories. Remaining items require evidence or explicit decisions; they are not automatically authorized next actions.

## Final local integration note

Combined baseline287 Git blobs were independently matched to remote42e9ac before edits. Current result:375 project,137 adversarial,24 UI,114 service,26 safety,6 legacy UI,1 exact poison regression, zero whole-repository lint diagnostics and10 security boundary checks passed. These counts overlap and are not independent coverage totals. The new batch remains local only; no CI activation or push. Outer txHash route key is defense-in-depth, not a confirmed previous bug; see dated correction.
