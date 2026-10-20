# Independent review of NEW reconstructed testnet candidate

## Outcome

Fresh execution against the post-fix candidate: **138/138 focused checks passed**: 114 standalone service/registry probes plus 16 jsdom UI lifecycle tests and 8 direct wallet-hook tests. Both final command exit statuses were 0. The standalone service probe attempted zero global fetch calls; every client and wallet operation in the suites was injected/mock-only.

Final run window from authoritative conversation/tool clock: **2026-10-20 11:35:20–11:35:49 UTC**. The executor wall clock printed approximately nine hours ahead. Raw logs and Vitest timestamps are retained as executor-clock output and must not be represented as authoritative UTC.

This is a **new candidate**, based on the parent-specified pinned baseline `89fc2c3ba931253e0b97ae582611baa5d8c4db4e`, not a recovery of prior acceptance. The directory has no `.git`, so no candidate commit is asserted. This review did not inherit old test claims, rerun old Foundry evidence, execute a real browser/wallet/RPC, publish source, or make any external writes or paid-resource actions. It is not an audit or real-chain acceptance.

The final revision also includes one copy-only change in `Layout.tsx`: an outstanding or uncertain request now explicitly warns not to refresh or submit again before checking wallet activity, and discloses that request locks do not survive reloads or coordinate tabs. The exact visible text was asserted in both requesting and uncertain states. This disclosure does not implement reload or cross-tab locking. All 114 service probes were rerun as well as all 24 UI/hook tests.

## Findings and fixes verified

1. **Receipt log provenance loss (fixed):** the initial adapter stripped `blockHash`, `blockNumber`, and `removed` before the pure verifier could inspect them. Inconsistent/removed payment logs still produced `UNVERIFIED_ARC_EVIDENCE` with “all standard checks passed.” The verified flag stayed false, but that intermediate claim was too strong. Three independently written assertions initially failed. Parent patched the real adapter boundary to reject removed logs and receipt/log block and transaction mismatches. All three now pass unchanged.
2. **Removed creation log accepted (fixed):** `readCreatedInvoice` originally checked transaction/block fields but accepted a creation log marked removed. An independently added assertion reproduced acceptance. Parent added `log.removed` rejection to the existing event predicate; that assertion now passes unchanged.

Original failures are retained in `service-probes-initial-results.json`/`.log` (98 passed, 3 failed) and `service-probes-creation-gap-results.json`/`.log` (113 passed, 1 failed). Initial files have their then-current source hashes. The current results record the final source hashes, not the historical candidate.

## Coverage established by these probes

- Trusted testnet identity, full artifact runtime hash, frozen testnet manifest, and empty production manifest.
- Create/pay action-time account, chain, connection version, disconnection, runtime, deployment, target, expiry, EOA, balance, amount cap/quantum, terms, and calldata/value checks.
- Wallet-reported account/chain recheck immediately before send; context loss during preflight; review expiration during preflight.
- Refreshed lower gas and gas price used in the actual send request. Increases in either component or total fee require review, including cases where a component rises but total fee falls.
- One send during concurrent clicks; same-invoice locks across different payer identities; normalized casing and hash deduplication; ambiguous wallet errors or missing hash do not automatically resend. Explicit 4001 rejection releases the request lease.
- Returned hash preserved through context loss, UI unmount, and mocked localStorage quota failure while the document lives. All unresolved hashes survive completed-history pruning and remain reachable in rendered DOM.
- Receipt/transaction/hash/sender/target/chain/value/invoice/log-index/ABI/amount/block/time binding. Replaced receipt is not mistaken for the original. Coherent fixture still yields `UNVERIFIED_ARC_EVIDENCE`, `verified=false`.
- Recovery queries exactly one recorded paid block, one deployment and one invoice; multiple events fail closed.
- Export uses the invoice snapshot actually checked by the verifier. JSON contains exact integer strings, testnet mode and `importedVerified=false`; editing receipt fields removes stale export availability.
- Saved receipt reconciliation is read-only; exact identity/function/invoice mismatches remain submitted, while a matching explicitly reverted receipt releases a lock without sending.
- Creation transaction/event/derived-invoice-ID/read-back binding, including duplicates, replacements and removed events.
- React stale session/route loads and preparations cannot populate the replacement screen. Same-tick review/confirm/verify clicks are suppressed, receipt inputs lock during verification, and stale receipt results cannot appear after prop changes.
- Direct wallet hook event handling invalidates synchronously before a React render, increments context generation, rejects stale getAccount snapshots, detaches obsolete listeners, and ignores late old-provider promises.

## Remaining limitations / acceptance boundaries

- The submission-request/uncertain-result locks live in memory. They survive navigation, not a full page reload. Returned hashes persist only best-effort; when browser storage fails, their retention is limited to the live document lifetime. No automatic resend exists, but manual wallet-history reconciliation remains necessary for unknown outcomes. Cross-tab coordination was not established.
- No actual browser behavior, completed downloads, real injected-wallet compatibility, RPC availability, real signing, test payment, native-USDC system transfer emitter/log evidence, Arc finality, or second-RPC conflict handling was established. UI tests are jsdom with mocked services, not browser QA.
- Mainnet remains unconfigured and the production manifest empty. Native Arc receipt evidence remains unverified; this work must not turn `verified` true or claim settlement, revenue, grant eligibility/submission, deployment publication, or audit acceptance.
- The runtime check is against the local full artifact and fixed trusted record. No new on-chain deployment evidence was obtained in this review.

## Reproduce

Run from the repository root:

```sh
/tmp/arcproof-tools/node_modules/@oven/bun-linux-x64/bin/bun qa/new-independent-review/service-probes.ts
/tmp/arcproof-tools/node_modules/@oven/bun-linux-x64/bin/bun run vitest run --config qa/new-independent-review/vitest.config.ts --reporter=default --reporter=json --outputFile=qa/new-independent-review/ui-probes-results.json
```

Primary evidence: `service-probes-results.json`, `service-probes.log`, `ui-probes-results.json`, `ui-probes.log`, and `reviewed-source-sha256.json` in this folder. All review edits are restricted to `qa/new-independent-review/`; application fixes were made by the parent integration task.

## Exact reviewed files (SHA-256)

- `src/arcproof/testnetClient.ts`: `5a21b765d06099bcdd2b1da8049104fa067fd7072a6b49919d69440f0f53837b`
- `src/components/arcproof/TestnetScreens.tsx`: `b517453ee167546771ffe5a24dd5bd5170d31335745ff8529322115203a6f858`
- `src/arcproof/useTestnetWallet.ts`: `d512b3bcb1512604eaa9d5dd516b774807bcf82e54cebdcac15b23c80b61a1b6`
- `src/arcproof/submissions.ts`: `9e3005a30250de9dae106dcad7a59f03fc2bb30ae799f5ae1b8285100e2e2ead`
- `src/arcproof/testnet.ts`: `b9f996002cb6de07eef0019c1a1882a967c897bd9c88cffad13fb6c63d22a320`
- `src/components/arcproof/Layout.tsx`: `3166030bdb7cbeb4105e6e136abb0c92f676e6d09d9f742b285fa61fc5b0ada3`
- `src/App.tsx`: `61de46475e187a40c8f7f91607f32e528fa28e9a3749071543326afbc2da2de1`
- `src/config.ts`: `aabd8a86455cc4e492b51cc68a3a15b5e588981d7b404663d1fee454fa311fac`
- `src/arcproof/receiptVerifier.ts`: `6936db78b9d1df9d1aaebdcb54c7bf62a68ee24d225f4be6c0a10e0ee16ba450`
- `src/arcproof/preparedPayment.ts`: `ed79c737cb2b4f503ec79aaeac1e659c86ca4144bc0343ebdd1e8a54a69421b5`
- `src/arcproof/exportUtils.ts`: `2ca48b27b2ec3b3e1c7bb7baa11b2db31e70f56f3a30c22fc18eeff6c640537e`
- `src/arcproof/manifest.ts`: `8168c682c1fe6e6c65d01205ee4f0c5827fdb7a0b820ff3ccdf7b3bd3138e0b2`
- `evidence/g1/ArcProofInvoices.artifact.json`: `278fe52ed5901c6ebf054a42275dd11917dcc8edebd992bbd1fd24ef09bec53b`

The complete current `src/` tree plus package/lock/artifact hashes is in `reviewed-source-sha256.json`. A source change requires rerunning affected checks; these results do not automatically extend to a later tree.
