# SAFE-01 / SEC-R01: original unknown request identity

Recorded 2026-10-21 UTC. Baseline: 94a84c44b02d52a827bed42fc9f9a5d414619b7d, restored and independently hash-checked by the workspace recovery worker. This is targeted implementation/testing evidence, not a professional audit or live wallet acceptance.

## Findings and correction

Previously a hashless payment intent could become included when a candidate transaction had equal sender, target, calldata, value and successful receipt. That identifies a matching call, not the original wallet request: no original transaction hash or unique request/nonce binding exists.

The durable recovery gate now rejects every hashless intent before its verifier callback runs, leaving the entire persisted requesting/uncertain row unchanged. No candidate hash is assigned. The service only records/releases recovery when the intent already carries the exact matching hash. Known-hash success/revert recovery and strict receipt identity gates remain intact. No nonce control, retry, time unlock, storage deletion, wallet send, or contract change was added.

## UI meaning reviewed

- A hashless payment provides a separate read-only receipt route bound to the same chain, deployment and invoice. A valid optional candidate hash is added to that route. Independent receipt verification cannot settle the original request, record it as submitted, or release its duplicate-send guard.
- The text explicitly says a matching successful/reverted payment does not identify or resolve the original request. There is no recovery button for a hashless request. Hashless creation also has no candidate input.
- Known-hash recovery says “Known saved hash status” and “not verified settlement”, not an independent settlement claim.
- Every unresolved saved transaction stays visible outside collapsed history. Completed history explicitly says “not verified settlement”.
- Existing unresolved guards remain visible when wallet connection is hidden. A separate optional hideSavedActivity prop is reserved for the explicitly synthetic offline demo, coordinated with the entry-route worker.

## Red/green evidence

1. red-before-fix.log: unedited copy of original run, 8 failures / 3 passes across 11 new regression cases, before production edits. This reproduces unsafe candidate success and misleading/hidden UI behavior. Some red cases intentionally fail on missing rejection before callback or obsolete messaging, rather than claiming every failure is a separate vulnerability.
2. green-initial-11.log: original 11 cases all passed after source fix.
3. green-targeted-95.log: 95 tests across 5 files passed, including an additional successful synthetic invoice verification proving the original unknown intent and duplicate guard remain unchanged. Existing known-hash identity and next-created-invoice tests are included.
4. toolchain-and-static-checks.log: tool versions, current UTC timestamp, targeted type-aware lint and full typecheck exit codes.

The Vitest “Start at” fields were emitted in the process timezone (01:00–01:03). They are preserved verbatim and are not UTC timestamps. Exact original run UTC start was not separately recorded in the shell log; conversation tool timestamps bracket the red run at approximately 16:00:38–16:00:47 UTC. Do not reinterpret those local-time fields as dates or wall-clock durations. The final static-check timestamp is explicitly UTC.

## Semantic assertion changes, not test weakening

walletIntents.test.ts previously explicitly expected hashless matching successful payment recovery to resolve included. It now requires rejection before verification for both successful and reverted candidates, with exact original intent retained. The older hashless creation test remains fail-closed.

testnetClient.test.ts previously expected a matching candidate after a timeout to resolve included. It now requires both mismatched and matching candidates to reject as hashless, retaining uncertain state, no hash, and no extra wallet calls. Separate existing known-hash mismatch/success/revert tests remain unchanged. New independent tests establish the intended security invariant rather than merely modifying old expectations.

## Reproduction commands

From project root with its frozen-lock dependencies available:

    node node_modules/vitest/vitest.mjs run src/arcproof/__tests__/unknownRequestIdentity.test.ts src/arcproof/__tests__/unknownRequestUi.test.tsx

For the 95-case targeted run:

    node node_modules/vitest/vitest.mjs run src/arcproof/__tests__/unknownRequestIdentity.test.ts src/arcproof/__tests__/unknownRequestUi.test.tsx src/arcproof/__tests__/walletIntents.test.ts src/arcproof/__tests__/testnetClient.test.ts src/arcproof/__tests__/uiSemantics.test.tsx

For the exact original red probes, use an isolated checkout of baseline commit 94a84c44b02d52a827bed42fc9f9a5d414619b7d. Copy red-probe-unknownRequestIdentity.test.ts.txt and red-probe-unknownRequestUi.test.tsx.txt into src/arcproof/__tests__/ using their original names without the red-probe prefix or .txt suffix, then run the first command. The frozen probe files reconstruct the initial source: the later independent-verification test and lint-only comment are excluded. Their hashes are recorded. Never roll back the working tree merely to reproduce the red state.

Source/test/evidence SHA-256 hashes and baseline source hashes are in source-test-evidence-sha256.json. They bind this targeted snapshot only; concurrent unrelated project work and later integrated build identity are owned by the parent.

## Limits

RPC/wallet outcomes are offline mocks; independent payment success uses a clearly labeled reconstructed synthetic fixture. No live wallet signature, chain mutation, public publication, Argon request, or remote commit occurred in this task. Integrated browser QA is assigned separately to the UI worker.
