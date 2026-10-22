# ArcProof final-handoff engineering report

Observed 2026-10-22 16:41 UTC. This is a local functional candidate, not C1 release freeze, a deployed product or an award/eligibility claim.

## Identity and completed work

- Baseline main: `cd579e567457ff8acf0fe041a5cff3df07c344c0`, re-read unchanged from origin.
- Candidate Git commit at validation time: **null** while uncommitted. Do not label its results with the baseline commit.
- Declared source snapshot: `54f45d85f8453dee7c7af415647f74a00d2bdd9daaab5729ff1f46a1c68e6e43`, 148 declared inputs.
- T01: only the exact archived CommonJS compiler helper receives the no-require-imports exception. Historical evidence bytes are unchanged; clean lint/typecheck now pass.
- T02: closed immutable application-owned U0/R1/W2 contexts carry selected deployment identity through routing, reads, wallet gates, cache, saved requests and recovery. Old deployments remain read-only. Caller-built copies are rejected. Production registry remains empty, release writes false.
- T03: offline receipt exports use the shared Schema 1.2 builder. Synthetic payment facts stay null; JSON/CSV download, copy and selectable fallback use the same serialized text.
- T04: provenance separates application, contract/tests, tools and imported reference evidence. Generated paths are excluded explicitly; legitimate source folders and Studio runtime/deployment inputs are retained. Fresh output hashes are separate from historical reference metadata. Dirty builds do not invent a source commit.
- T05: block/finalized-block reads have a request-local 15-second budget, up to three attempts, four-second per-read timeout and 150 ms spacing. Only null/recognized temporary failures retry. Explicit contradictory headers return immediately to strict validation. Abort stops acceptance; underlying already-started transport may complete but cannot promote stale evidence. No wallet action uses this retry.
- T06: a callback transaction hash that cannot be persisted is retained in memory with a warning, copy/Explorer/read-only actions. The durable hashless guard remains; no recovery or resend unlock is inferred.
- T07: home and verification explicitly show mainnet sample unavailable. Receipt five-fact summary and one detail fold remain evidence-driven. A simulated receipt is never a payment certificate.
- T08: concise root README, current-state record (with baseline history linked rather than republished), official-rule worksheet, submission/video/action-card drafts and license review are prepared. First-party license and legal/eligibility answers remain undecided.

## Reproduced results

| Check | Result | Evidence |
|---|---|---|
| Full Vitest | 559 passed, 41 files | [log](../../evidence/final-handoff-20261022/vitest-full.log) |
| Fresh Forge | 73 passed, 5 suites | [log](../../evidence/final-handoff-20261022/forge.log) |
| Type-aware lint, lint, TypeScript | Pass | [log](../../evidence/final-handoff-20261022/check.log) |
| Testnet + mainnet-disabled production builds | Pass | [testnet](../../evidence/final-handoff-20261022/build-testnet.log), [mainnet](../../evidence/final-handoff-20261022/build-mainnet.log) |
| Final output SHA256 readback | 84 files per build, zero mismatch | [testnet manifest](../../evidence/final-handoff-20261022/build-testnet-provenance.json), [mainnet manifest](../../evidence/final-handoff-20261022/build-mainnet-provenance.json) |
| Fresh runtime rebuild | 2,296 bytes, expected keccak matches | [record](../../evidence/final-handoff-20261022/runtime-rebuild.json) |
| Browser download/copy/fallback | Actual JSON and CSV downloaded and bytes compared | [record](../../evidence/final-handoff-20261022/browser-acceptance.json) |
| Dependency audit | Five known package advisories remain | [triage](DEPENDENCY_REVIEW.md) |

The compiler was official npm solc 0.8.28+commit.7893614a, Paris, optimizer 200. Contract source is unchanged. Runtime hash is `0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`. Fresh compilation is not live deployment verification.

## Actual browser acceptance and limits

Cloud Chrome exercised the frozen local production artifact, not merely a DOM test. Home/demo, simulated invoice, JSON/CSV download, clipboard and complete-text fallback passed. Downloaded Schema 1.2 payment amount/merchant/payer/time/transaction/evidence fields were null. Final matching-snapshot JSON export was rerun and compared separately.

Receipt layout was checked in actual fixed-width 375, 768 and 1440 px iframes. Internal client/scroll widths were 360/360, 753/753 and 1440/1440 respectively (scrollbars reduce the first two). This is CSS viewport testing, not native phone/touch acceptance. Screenshots are in the evidence directory. Invalid invoice input and unknown route fail closed; real mainnet U0 verify/create screens have zero wallet buttons and explain missing deployment.

Clipboard/download denial paths, R1/W2 deployment scenarios and storage-failure wallet cases are automated synthetic tests, not actual wallet/mainnet acceptance. Initial development-preview download was interrupted by HMR and not counted; frozen production downloads subsequently passed. Final testnet/mainnet manifests share one source snapshot. Earlier responsive screenshots differ only by a test assertion file, not runtime source. The seven screenshots are retained locally and are not included in this public branch; the public evidence contains the textual browser record and synthetic exported files.

The bundle still warns about a roughly 1.51 MB main chunk (about 470 kB gzip). No performance score or full accessibility conformance is claimed. This pass does not establish customer demand, independent customer revenue, professional audit clearance or winning odds.

## Unresolved gates

1. A new public review branch was authorized at 2026-10-22 16:45:27 UTC; merge and automatic deployment remain excluded. Publication receipt must identify the actual final commit separately.
2. Final candidate Studio sync/export comparison and real two-wallet testnet create/pay/verify acceptance are not run. Therefore **C1 is not frozen/accepted**.
3. The current Argon request has no verifiable response/HTTP/usage record. Its outcome is uncertain; it was not retried and is not counted as a completed review.
4. Direct read-only mainnet RPC returned HTTP 403 and testnet RPC HTTP 503 in this environment. Cause is unknown, not proof the chain failed. No restriction was bypassed.
5. Mixed Studio/external workflow interpretation still has no observed organizer approval. Official deadline reverified as 2026-11-02 04:59 UTC / 12:59 China time. See [rules](RULES_AND_ELIGIBILITY.md).
6. License/copyright holder, personal eligibility and prior-funding answers require genuine owner facts. No license was granted on their behalf.
7. Mainnet contract/payment, public app/receipt URL, video, anonymous-host acceptance and event submission are all absent. Do not fill them with examples, testnet or synthetic values.

## Next gate

With bounded public-branch permission received, re-read origin main, reconcile any changes, publish only code/synthetic tests/sanitized evidence to a new review branch, and verify exact committed bytes. Do not merge or deploy merely because local tests pass. Continue with Studio comparison and two-wallet owner acceptance before considering C1; later financial/public/submission steps require their own authority.

No private conversation transcript, secret key, real customer record or ledger is included in this report or its evidence. Machine status: [release-status.json](../../evidence/release-status.json).
