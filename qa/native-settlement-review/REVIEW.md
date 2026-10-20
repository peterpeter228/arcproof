# Independent native settlement candidate review

Review date: 2026-10-20 UTC. Local tests only. No RPC, wallet, transaction, network write, Studio write, or production-source modification was performed by the reviewer.

## Final result

PASS for the targeted local candidate review: 137/137 independent adversarial tests passed after the implementer repaired all 11 initial failing cases and the reported export schema gaps. No remaining incorrect VERIFIED result was found in the scoped checks. This is not full live-network acceptance or professional audit. Exact final run: final-run.log. Exact final six-file source manifest: final-source-sha256.txt.

Research began at 2026-10-20T17:17:17Z. Targeted implementation review began at 2026-10-20T17:21:56Z and finished at approximately 2026-10-20T17:28:50Z. Active effort estimate: approximately 9.5 minutes across research and implementation review, excluding the gap between assignments.

## Initial result

The initial candidate was blocked on 11 false-VERIFIED regression cases, across two finding families. Independent test suite: 117 cases, 106 passed, 11 failed. These are behavioral failures (expected verified=false, observed true), not test infrastructure failures. The test harness uses its own fully synthetic invoice, transaction, logs, and finality response. It does not import the implementer's reconstructed explorer-observation fixture.

Reproduce from repository root:

    node_modules/.bin/vitest run --config qa/native-settlement-review/vitest.config.ts --reporter=verbose

Exact initial run logs: first-run.log (112 cases; 6 failures), second-run.log (117 cases; 11 failures). initial-source-sha256.txt records an intermediate source snapshot; remediation was occurring concurrently, so it must not be treated as the precise failing revision. The failure logs and reproductions establish initial behavior. final-source-sha256.txt identifies the final reviewed bytes. The log timestamps are runner-local and should not be interpreted as the canonical UTC review time.

## Finding 1: contradictory transaction inclusion identity discarded

Blocking. receiptRpc.getTransaction in src/arcproof/testnetClient.ts returned hash/from/to/input/value/chainId but discarded transaction blockHash, blockNumber, and transactionIndex. RawTransaction did not represent these fields, so verification could not compare them with the successful receipt.

Six tests showed verified=true despite the actual transaction object explicitly identifying another block hash, another block height, another transaction index, or null pending inclusion metadata for each field. The receipt, logs, and finalized header were otherwise valid synthetic controls. This violates fail-closed behavior on inconsistent provider responses. It is not a demonstration that a malicious RPC can be made trustworthy.

Required fix: preserve the original three fields, require non-null valid values matching the receipt, and never fill them from receipt metadata.

## Finding 2: impossible paid invoice / native path accepted

Blocking for this strict candidate. Five cases produced verified=true:

- paidAt exactly equals expiresAt.
- paidAt exceeds expiresAt.
- Merchant is zero, with other event fields consistently changed.
- Payer is zero, with other event/transaction fields consistently changed.
- Merchant equals the invoice contract, with a claimed contract-to-itself native system Transfer.

The frozen contract cannot successfully pay at/after expiry or create a zero merchant; the intended ordinary EOA path cannot originate from zero. Arc documents that native self-transfers emit no log and direct native transfers to/from zero revert. Hence these are detectably impossible source records and should not produce an affirmative receipt. The production readInvoice wrapper already rejects zero merchant, but the pure verifier and the other cases require protection.

Required fix: reject zero payer/merchant, payer/merchant equal invoice contract, and paidAt >= expiresAt. Keep allowed payer==merchant self-demo distinct from forbidden participant==invoice-contract.

## Passed adversarial coverage

Exact native amounts and 18-decimal units; wrong emitters; direct or reversed paths; missing legs; duplicate exact and wrong-amount legs; split transfers; unexpected contract movements; malformed ABI signatures/topics/padding/data; duplicate business event; unique raw source indices; every required log provenance field on all three evidence logs; provenance on ignored emitters; explicit finalized tag; malformed/null/unsupported/stale/conflicting finality; numbered finalized-header check; payment-header re-read; CSV injection guarding; numeric-string JSON fields; fixture mode; importedVerified normalization; failed result dropping stale settlement evidence.

## Additional export completeness note

At initial review buildReceiptExport did not include the minimum schemaVersion, blockNumber, gasFeeNative and verifiedAt fields specified in CONTRACT_SPEC section 8.3. This is partly pre-existing and independent of the false-VERIFIED findings. Passing the new evidence tests does not establish complete T24 export compliance. Unknown real gas must not be invented; preserve available receipt gas fields or state the gap honestly.

## Evidence / release boundary

The existing explorer observation is not raw RPC data. Reconstructing log provenance, invoice state, transaction inclusion metadata, or finality headers creates only test fixtures. A green local suite does not establish real Arc RPC acceptance, T25/T26, a two-wallet test, mainnet safety, professional audit, revenue, publication, or grant qualification.

## Sources

- https://docs.arc.io/arc/references/usdc-system-events
- https://docs.arc.io/arc/concepts/deterministic-finality
- https://docs.arc.io/integrate/wallets/transaction-lifecycle
- https://github.com/circlefin/arc-node/blob/main/crates/eth-engine/src/rpc/engine_rpc.rs
- https://github.com/circlefin/arc-node/blob/main/crates/eth-engine/src/ipc/engine_ipc.rs


## Remediation verification

- Transaction blockHash, blockNumber, and transactionIndex are now preserved from the original RPC transaction and compared against the receipt. All six original contradictory/pending cases and three omitted-field cases are rejected.
- Zero or invoice-contract payer/merchant and paidAt >= expiresAt are rejected. Legitimate same-wallet payer/merchant remains accepted and marked controlled_demo. A one-second-before-expiry control remains valid.
- Valid 0.000001 and 1 USDC boundaries pass; invalid zero, sub-quantum, and over-cap amounts fail even when other records agree.
- Export schema 1.1 now contains schemaVersion, contractAddress/txHash aliases, blockNumber, gasFeeNative and verifiedAt. Exact receipt gas multiplication remains separate from principal; missing, wrongly typed or negative gas metadata exports null. JSON and CSV checks passed.
- Staged independent runs: 117/117 after blocker fixes, 129/129 after extra boundaries, and 137/137 after export additions.

The only remaining release/acceptance blockers in this scope are the already-known missing genuine raw RPC/finality capture and real post-integration acceptance. They are not replaced by these synthetic tests.

Final reviewer-only lint cleanup: removed unused import and used explicit unknown-valued mutation helpers for deliberately malformed fixtures. Read-only oxlint qa/native-settlement-review exits 0 with no diagnostics (lint-final.log); 137/137 tests reran green afterward. Production source hashes remained unchanged.
