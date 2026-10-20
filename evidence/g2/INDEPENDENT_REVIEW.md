# ArcProof independent G2 executable review

Status: local executable checks passed, including canonical lint. Scoped actual-browser validation passed at 375px mobile and 1138px desktop; see final retest below. This is not full G2 acceptance, a security audit, or Arc network validation.

## Reviewed source
- Final candidate: arcproof-native-reconciled, based on Studio export 050638 plus attributed native corrective changes.
- Correction patch SHA-256: 1197b674362cabba796f8ebf9925dff12f4a614748dd330704417bcdcb1fecf3.
- All 30 files in evidence/native-repair/source-sha256.json match the independently tested copy. One separate reviewer DOM test file was added only to the isolated review copy, not canonical source.
- No canonical implementation was modified by this reviewer. An earlier four-file reference patch was explicitly identified as reviewer-authored.

## Executed checks
| Check | Result | Evidence |
|---|---|---|
| Frozen dependency install | Passed; official npm bun 1.4.3, bun.lock, lifecycle scripts ignored | dependency-install.log |
| TypeScript | Passed | final-microfix-typecheck.log |
| Project regression tests | 132 passed | final-microfix-tests.log |
| Additional rendered DOM tests | 6 passed; total 138/138 with project tests | final-microfix-tests.log, reviewer-ui-final.test.tsx |
| Independent adversarial probes | 26/26 passed | reconciled-independent-results.jsonl, safety-workspace/reviewer-safety.ts |
| Vite production build | Passed in 34.98 seconds; bundle-size warnings only | reconciled-build.log |
| Read-only canonical lint | Passed, both type-aware and general checks | final-microfix-lint.log |
| Actual browser responsive/core flows | Scoped pass at 375px / 1138px; exact 390px / 1280px not tested | Final responsive retest below; screenshots not included |

Final test-only microfix removes the three earlier lint typing diagnostics. Independent comparison found changes only to nativeRepair.test.ts and offlineDemo.test.tsx; runtime files are unchanged from the successful production build. Updated source hashes all match; tests and lint were rerun after this microfix.

## Interaction proof (jsdom, not a layout engine)
1. Unknown deployment payment route shows unavailable values, not invented amount/merchant; real payment button stays disabled.
2. Amount 0.0000001 shows a precision error; correcting to 0.000001 shows exact 1000000000000 native units.
3. No-wallet offline fixture creation produces a labelled simulated receipt; no payment proof is claimed.
4. JSON export is fixture/SIMULATED_NOT_VERIFIED, with transaction hash, log index, payer, paid time, paid block, and block hash all null. Amount remains an integer string and importedVerified is false.
5. Unknown receipt verification ends Pending, explains the missing trusted deployment, and offers no proof export.
6. Form fields have programmatic labels.

## Safety corrections independently retested
- Legitimate selector/event topic now derived from the actual ABI; the earlier hardcoded values were wrong.
- Receipt runtime bytecode, transaction/receipt/log hashes, target, chain, payer, merchant, amount, paid block, timestamp and block hash bindings reject mismatches.
- Malformed event data/topics, negative log index and non-success receipt status fail closed rather than being accepted or crashing in the reproduced cases.
- No Arc-system evidence means UNVERIFIED_ARC_EVIDENCE and verified=false, never a verified payment claim.
- Prepared payment rejects deployment, contract, calldata and value mutation; fresh unsupported terms also block validation.
- Amount precision, large-nonce pagination, CSV leading-control handling and truthful unknown export values have regression coverage.

## Boundaries and remaining risks
- Production deployment manifest is empty. Real signing is disabled; no real wallet, testnet, mainnet, funding or external publication was used.
- Async wallet lifecycle/race cancellation, wallet rejection, transaction replacement/recovery, paidBlockNumber single-block hash recovery, secondary-RPC conflict resolution and real Arc native-USDC logs/finality are not demonstrated. Sync helper tests do not establish these features.
- The fixture is an offline demo, not a chain-backed end-to-end flow. Full T18–T24 acceptance must not be inferred from the unit totals.
- Actual core flows and responsive layout were tested at 375px/1138px. Exact 390px/1280px and completed browser downloads remain unverified.
- Spreadsheet formula execution was not tested in Excel/Sheets; tests cover serialized neutralization and integer preservation.

## Reproduction
Use the official pinned Bun binary and the checked-in lockfile in an isolated copy:
- bun install --frozen-lockfile --ignore-scripts
- bun run typecheck
- bun run test
- bun reviewer-safety.ts
- bun run vite build
- oxlint --type-aware src scripts (read-only; no --fix)

Supplemental reviewer files and full logs accompany this report. Do not combine historical failed snapshots with the final passing counts.

## Actual cloud browser QA, 2026-10-20 05:20–05:26 UTC
Independent reviewer operated authorized embedded Studio preview directly. No login, wallet, signing, payment, publication or browser permission changes.
- Desktop: amount `0.0000001` rejected with six-decimal error; corrected `0.20` displayed exact 200000000000000000 native units. Keyboard Tab traversed expiry/title/create; Return created offline fixture without wallet.
- Simulated receipt: clearly labelled not payment proof, amount0.20, fixed fixture merchant, real transaction/block/payer fields unavailable(null).
- JSON and CSV buttons clicked. Browser download event timed out; completed download/file contents NOT confirmed in browser. Export payload content separately covered by executable tests. No download success claim.
- Unknown deployment receipt: synthetic chain5042002/deploymentunknown-demo/invoice0x11… showed trusted-manifest warning; Verify produced Pending, no proof export.
- Evidence screen explicitly marks T21/T23/T25/T26 not run and states no deployment/all signing disabled.
- Captured browser warning/error log query returned empty. This is scoped to observed run, not proof of absence of all runtime errors.
- Studio Mobile preset measured375 CSS px, not390. Actual body/document scrollWidth498, header wallet control clipped horizontally. This initial defect was corrected and retested successfully as recorded below.

### Final responsive retest, 05:28–05:29 UTC
Minimal three-class Layout patch integrated in Studio, source coherence confirmed by builder. Independent retest: mobile375 CSS clientWidth=documentScrollWidth=375 (previously498); wallet button and all navigation now visibly fit two-row header, no horizontal scrollbar. Desktop1138 CSS clientWidth=scrollWidth1138, single-row header retained. App-only cropped screenshots inspected directly. Exact390/1280 widths were not tested; Studio presets/available viewport provided375/1138.
Final captured console sample showed browser-extension metadata errors only (chrome-extension origin), no app-origin entry in that sample. Do not claim global console clean.
Independent final2 executable rerun138/138 passed, source manifest30/30 hashes match. Security probes26/26 and prior build/TS/lint passed before CSS-only change; fixer independently reran final2 build/TS/lint/132 project tests successfully. Full G2/real-chain acceptance remains not run.
