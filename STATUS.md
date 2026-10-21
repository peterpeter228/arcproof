## 2026-10-21 UTC 独立审查实施候选（最新）

针对 94a84c44 基线完整恢复并验证 476 文件后，已修补 hashless 请求归因、分享异步状态，加入稳定只读入口、事实优先收据与真实构建身份。Argon 本次实际 HTTP200 返回；其建议已独立复核，部分错误判断未采纳。当前主套件 441 项 /26 文件，check 与构建通过；新鲜基线合约73项通过。后续私有提交与回读需以交付记录为准，不将本段当远端提交成功证明。

真实浏览器的最终生产预览、模拟导出与有界响应式/缩放检查已取得证据，PDF/完整钱包验收仍缺；当前 RPC 读取被403阻止。主网、当前 Studio 同版本（已只读看到旧预览未匹配）、真实两钱包、公开许可与比赛提交尚未完成。本轮规则已读到：主网交易及 Studio 来源均为硬门槛，测试网完成不等于参赛就绪。历史18小时累计工时 unknown。

详见 [实施记录](docs/INDEPENDENT_AUDIT_RESPONSE_20261021.md)、[Argon逐项处理](docs/ARGON_AUDIT_RESPONSE_TRIAGE_20261021.md)、[主网私有准备设计](docs/NET01_PRIVATE_READINESS_DESIGN.md)。下方旧记录为历史，数量与 NOT_RUN 不能替代本轮分层证据。

---

> 2026-10-21 UTC 交付记录：本轮源码、测试及文档已提交至私有 main：[648acc3](https://github.com/peterpeter228/arcproof/commit/648acc3cc1678fa682bc5833161e66ace1ff2603)。完整475文件树及215个变更文件内容已回读匹配。下方“尚未推送”等文字属于交付前历史快照，不是当前发布状态。本次补记仅修改 README 与 STATUS，运行代码、依赖和测试内容不变，未重新运行测试，也未更新 Studio、部署或启用 CI。

## 2026-10-21 Argon follow-on verification (current candidate, not yet pushed)

Argon returned a substantive review. Independently reproduced and fixed the successful-creation durable-intent lifecycle gap, caller-supplied receipt provenance labels, and malformed supplied-hash validation order. Strict known-hash recovery gates, unknown-state locks, inclusion identity and persistence-failure behavior remain fail-closed. Standalone invoice inspection remains read-only.

Current local project tests:391; adversarial137; current UI24; exact intent regression1; migrated service114; legacy safety26; legacy UI6; security10. Source/type-aware/whole-repository lint and typechecks pass. No real-browser, wallet, RPC, Studio, deployment or remote-CI acceptance is claimed. Dependency advisory and large-chunk residuals remain. See evidence/argon-followon-20261021/REPORT.json. Earlier status paragraphs below are historical snapshots, not the current count. Four optional historical bookkeeping updates are excluded from delivery: effort-ledger.json, gate.json, test-results.json and artifact-index.json. Their exact remote versions are preserved. Current results are in this dated report; DOC-01 remains partial.

# Current checkpoint — 2026-10-21 UTC, second bounded follow-up

Stage: PRIVATE_LOCAL_QUALITY_EXPORT_UI_CANDIDATE. Parent-verified continuation baseline: 42e9ac9d46f7769b9fa428e27511edd66e76c1c9. This next batch is NOT pushed. Mainnet HOLD.

Fresh combined checks: 375 project tests, 137 independent adversarial, 24 current jsdom UI/wallet, one exact intent-poison regression, 114 standalone service probes (zero global fetch attempts), 26 low-level safety checks and six migrated legacy UI cases passed. TypeScript, archived-helper TypeScript, whole-repository lint (zero diagnostics), non-mutating bun run check, production build and 10 local security HTTP/HMR/graph checks pass. These overlapping counts are not independent coverage totals. Historical 124/122 lint failures and probe failures are preserved, not retroactively called passing.

Dependency workflow uses pinned Vitest4.1.12/Vite6.4.4, no unused Vitest UI or seven unused Circle SDK families, and narrow Buffer/process globals. Independent clean-node_modules frozen install passed with install scripts disabled. No test assertions changed for Vitest migration. Audit remains NOT clean: five package-advisory records (one high, three moderate, one low), optional TypeScript7/Solana5 peer mismatch and broad wallet chunks remain. See dependency scope report; no production exploit or vulnerability-free claim.

Schema1.2 exports separate strict identity-bound RPC observations from verified settlement evidence; preserve reason/check/source/read timing and known fee when finality/native evidence fails. Scope mismatch exports no observations; foreign/malformed provenance cannot supply trusted-looking facts. JSON remains machine evidence; spreadsheet CSV text-import roundtrip is NOT_RUN. Source label does not export an endpoint or credentials.

A genuinely reproduced availability defect is fixed: malformed new intent input is rejected before persistence, preventing cancelled invalid records from poisoning later sends. Eight independent cases and a separate exact regression pass. Existing corrupt storage still fails closed. Unknown/hashless operations have no expiry/retry; replacement/cancellation and cross-device recovery remain unsupported.

UI improvements add semantic headings, keyboard preparation-only form handling, focus targets, diagnostics and normal-flow Studio attribution. Actual browser responsive/200% zoom/keyboard/contrast/print/download/two-tab acceptance remains BLOCKED/NOT_RUN after the prior normal Chromium launch was denied by the environment; no bypass or retry occurred.

Correction: the earlier outer txHash route key was defense-in-depth, not a reproduced stale-input bug: the existing inner fields already remounted by full invoice/tx identity. The dated correction is in evidence/quality-integration-20261021/dated-correction.json; historical raw logs are unchanged.

This pass did not push, call an external model, use live RPC, sign a wallet action, spend funds, alter contracts, inspect/update Studio, activate CI, deploy, publish or submit. The prior model request failedHTTP403 and produced no review. Historical audit RPC success is reviewer-reported only; raw logs unavailable here. Mainnet, genuine two-wallet acceptance, deployed-version consistency, licensing/eligibility and cumulative18-hour effort remain unresolved. Foundry unavailable and unchanged contracts not rerun. A CI example is inactive under docs/ci; no remote CI-green claim.

See evidence/quality-integration-20261021/report.json and docs/AUDIT_CLOSURE_MATRIX.md. Runner wall-clock labels are not canonical UTC. Prior checkpoints below are historical.

---

# Current checkpoint — 2026-10-21 UTC

Stage: PRIVATE_LOCAL_INTEGRATED_REVIEW_CANDIDATE. Mainnet HOLD.

This isolated candidate integrates security, receipt clarity, and bounded wallet-recovery fixes against the parent-verified remote baseline 86ae2539bcdf15ca10029245bab52a3c59816e6d. The copied local git label is not that remote identity. No push, Studio update, deployment, real RPC, wallet action, funds, public publication, or grant submission occurred in this pass.

Fresh integrated results: 320 project tests, 137 independent adversarial tests, 24 jsdom UI/wallet tests, TypeScript, source lint/type-aware lint, production build, and 10 security HTTP/HMR/production-graph checks passed. Whole-repository lint remains FAILED: historical baseline 124 diagnostics; current 122 after two diagnostics disappeared with deleted capture modules. Aggregate mutating check was not run. Contracts unchanged; Foundry unavailable, not rerun. Build retains large-chunk warnings.

Production tracing/console capture removed; loopback-only Vite defaults, Host restriction and no CORS grant tested. Durable intent is stored before wallet dispatch and guarded by Web Locks. Missing primitives fail closed; ambiguous/hashless requests have no expiry or automatic retry. Exact known hash recovery binds chain/account/target/calldata/value/inclusion metadata; hashless creation and hashless reverted payment cannot unlock unknown requests. FLOW-01 remains PARTIAL: replacement/cancellation, cross-device recovery and actual two-tab browser acceptance are incomplete. Browser storage deletion is not a safe recovery mechanism.

Receipts now expose amount, parties, UTC time, precise separate fee, settlement/finality details and controlled_demo labeling. Trusted receipt links auto-verify read-only; malformed links fail immediately; edits/navigation invalidate old results and exports. Full tx-hash route identity and legacy inclusion recovery received independent additional regression tests. Printing preserves non-fixed Studio attribution.

Real browser QA is BLOCKED: installed Playwright/Chromium's one sandbox-enabled launch failed before a page with socket() Operation not permitted and crashpad error. No security bypass attempted. Responsive/zoom/print rendering, actual downloads and actual two-tab mock-wallet send counts are NOT_RUN. jsdom/shared-lock models are not browser acceptance.

The independent audit reports a successful historical same-wallet testnet RPC verification (controlled_demo); its raw logs are unavailable here, so this is REVIEWER-REPORTED, not independently rerun. This pass's real RPC is NOT_RUN. Genuine current two-wallet T25/T26, deployment consistency, mainnet and professional audit remain unaccepted. Grant eligibility and cumulative 18-hour effort reconciliation remain unresolved; cap compliance is not claimed.

External model review was attempted once and failed with provider HTTP 403; no review/model/usage result and no automatic retry. This candidate has internal checks only, not external-model approval.

See evidence/integrated-review-20261021/report.json and adjacent fresh logs. Runner wall-clock labels are not canonical UTC. Prior checkpoints below are history, not current acceptance.

---

# Current checkpoint — 2026-10-21 UTC

Stage: PRIVATE_GITHUB_BASELINE_VERIFIED / DOCUMENTATION_RECONCILIATION.

Private GitHub `main` was freshly read at `d34138b19a3878fd095413822c48d28fea6a4c58`. All 240 repository files matched the retrieved remote tree before and after the baseline checks. The source backup ZIP and all 325 backup-manifest entries also matched their recorded hashes. The private upload occurred on 2026-10-20; its receipt is preserved in `evidence/g4-baseline-20261021/github-delivery-receipt-20261020.json`. This dated documentation revision is based on that verified baseline; its delivery is confirmed only by a subsequent remote commit/readback receipt, not by this text. It is not a new deployment.

Fresh baseline checks: 253 project tests, 137 independent adversarial tests and 24 jsdom UI/wallet tests passed. TypeScript, read-only source lint, type-aware source lint and Vite production build passed. Whole-repository read-only lint still fails with 124 existing diagnostics in archived reviewer/helper files. The mutating aggregate `check` was not run and is not claimed green. Foundry was unavailable and unchanged contracts were not rerun. See `evidence/g4-baseline-20261021/baseline-report.json` and adjacent logs. Test-runner wall-clock labels are not canonical UTC timestamps.

Studio's last verified version remains the earlier `8588d80` checkpoint; Studio was not freshly inspected or updated by this baseline task. The known testnet deployment and observed same-wallet demo are historical evidence, not acceptance of the current verifier. No current real-browser rendering, genuine raw RPC/finality capture, post-integration verification or two-wallet T25/T26 acceptance is claimed. The 24 jsdom tests are not browser-layout tests. Mainnet remains unconfigured; no new wallet transaction, signing, deployment, public publication or grant submission occurred. Same-wallet evidence stays `controlled_demo`, never customer revenue. Grant eligibility and total project effort reconciliation remain unresolved.

## Historical checkpoints below

The following text records earlier stages in their original scope. Statements such as “No GitHub update” describe those earlier tasks, not the later private delivery confirmed above. Historical logs and reports have not been rewritten as fresh results.

---

# Native settlement candidate (local, pending parent review)

Stage: NATIVE_SETTLEMENT_CANDIDATE_LOCAL_REVIEW.

The missing native-USDC verification and explicit finality policy are implemented locally. Both exact transfer legs, strict ABI, per-log provenance and finalized-header consistency are required before VERIFIED. Same-wallet exports remain controlled_demo. Mainnet remains unconfigured. No GitHub or Studio update and no new wallet action occurred.

Project tests: 253/253 passed, including 56 new focused verifier tests; new independent adversarial tests: 137/137 passed; existing independent UI/wallet regressions: 24/24 passed. TypeScript, source lint/type-aware lint and Vite build passed. Whole-repository read-only lint fails only in unchanged archived review/helper files; aggregate check is not claimed green. New independent verifier review is recorded in the candidate report. Solidity tests were not rerun because Solidity/ABI/artifact are unchanged.

The observed self-demo was already mined, but archived data is normalized explorer observation, not a raw receipt. Tests reconstruct missing provenance/finality and are not live acceptance. Real post-integration RPC verification, raw capture and the two-wallet T25/T26 acceptance remain incomplete. Current Studio code is unchanged; do not describe the local candidate as deployed or the actual receipt as newly VERIFIED.

See docs/NATIVE_SETTLEMENT_VERIFIER.md and evidence/g3-native-verifier/candidate-report.json for exact evidence and limits. All earlier checkpoint text below is historical.

---

# ArcProof current checkpoint

Stage: REBUILT_TESTNET_CANDIDATE_FROZEN.

The user-signed Arc Testnet deployment and complete runtime were independently checked. A dedicated testnet adapter/UI has been reconstructed after the previous temporary local handoff was lost before persistence. This is a new candidate with fresh testing; previous candidate QA is not inherited.

197 fresh project tests, 26 legacy adversarial probes and six legacy DOM checks passed. TypeScript and read-only lint passed. Fresh independent review: 138/138 passed; 22 recovered probes freshly rerun; production build passed. Exact evidence is in evidence/g3-rebuilt-testnet/checkpoint.json. Actual browser rendering is still blocked/pending supported Studio preview. No live RPC or real wallet transaction was performed by this implementation task.

Mainnet is unconfigured and rejected. Offline simulation is separate. The real receipt verifier remains verified=false / UNVERIFIED_ARC_EVIDENCE after standard checks. Genuine payment receipt/native transfer/finality acceptance remains not run. Grant qualification, income and professional audit are not claimed.

See docs/TESTNET_INTEGRATION.md. Root owns final review, private integration, actual Studio QA and effort aggregation against the unchanged 18-hour cap.

## Historical offline checkpoint

The original checkpoint below is preserved as history, not current deployment state.

# ArcProof technical checkpoint

Stage: LOCAL_OFFLINE_PROTOTYPE_ACCEPTED / G3_BLOCKED_WALLET.

## Verified local scope

G1 local contract review: 73 passed, 0 failed, 0 skipped (69 exported plus four independent supplemental tests). Exact reviewed Solidity, ABI, creation and runtime bytecode coherence evidence is preserved under evidence/g1.

Final2 local interface prototype: 132 project tests plus six independent DOM tests, 138/138 passed; 26/26 adversarial probes passed. TypeScript, read-only lint and Vite production build passed. Source hashes for all30 reviewed files match the native final tree and Studio integrated export 2026-10-20 05:27:20 UTC. Original Studio generation and later attributed native patches are kept distinct.

Actual browser core flows passed: amount precision error/recovery, keyboard no-wallet simulated creation, explicitly simulated receipts, unknown deployment Pending, and truthful evidence page. Responsive retest measured mobile375/scroll375 and desktop1138/scroll1138 without overflow. Exact390/1280 widths were not tested. JSON/CSV clicks were observed; completed browser downloads remain unconfirmed, with payload correctness covered by executable tests. Captured console sample had no app-origin errors, but extension-origin errors were present; no global clean-console claim.

## Not complete

This accepts the local offline prototype only, not full real-chain G2/T18–T24 acceptance or a professional audit. Production deployment manifest is empty; live signing remains disabled. No testnet/mainnet deployment, real payment, grant submission or income evidence is claimed. G3 is blocked on a usable wallet/testnet workflow; no real-network acceptance test has run.

Next stage is scoped testnet workflow validation only after its prerequisites are established. Browser lifecycle races, replacement/recovery, paidBlockNumber hash recovery, secondary-RPC conflict handling and real Arc USDC logs/finality still require evidence. Unknown grant qualification is not an implementation success claim.

## Run and evidence

Start with RUN_中文.md for actual commands and supported limits. The package.json build entry is the Vite CLI (bun run vite build), not a nonexistent build script. Evidence is under evidence/g1 and evidence/g2. Reviewer-only files under reviewer-tests reproduce the additional six DOM checks and 26 probes without altering canonical source.

Original docs/source are unchanged; root AGENTS.md is preserved. Node dependencies, secrets, accounts, logs containing private data, caches and deployment scripts are excluded. This source checkpoint is not a public deployment.
