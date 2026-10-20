# Dedicated Arc Testnet integration: reconstructed candidate

Base: private peterpeter228/arcproof commit 89fc2c3ba931253e0b97ae582611baa5d8c4db4e. Preserve Studio origin and all unaffected repository files. This increment is native implementation/reconstruction, not Studio-generated. A former temporary local candidate was lost before external persistence. Some files were recovered byte-for-byte against recorded SHA-256; the remaining files are a new candidate with fresh verification. Do not reuse former ZIP hashes or prior test acceptance.

## Scope and file map

Only Arc Testnet 5042002 and 0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30 are trusted. Deployment receipt and all 2,296 runtime bytes were independently checked against evidence/g1/ArcProofInvoices.artifact.json. Before every action the adapter validates chain and exact runtime keccak. PRODUCTION_MANIFEST remains empty; there is no mainnet transport.

- testnet.ts: immutable identity, official RPC and explorer.
- testnetClient.ts: trusted invoice/history reads, EOA/balance/simulation/fee checks, exact preparation and one explicit user-wallet request boundary, transaction/receipt/event binding, paid-block recovery, read-only saved-hash reconciliation.
- useTestnetWallet.ts: synchronous provider event invalidation and stale-session rejection. No implicit permission/network requests.
- submissions.ts: invoice/account-scoped in-flight leases, case-normalized observable hashes, all unresolved hashes retained; completed history capped at 20.
- TestnetScreens.tsx: creation/review/history, payment review, no-wallet receipt verification and JSON/CSV export. App/config/Layout route only known testnet identities and show saved hashes across navigation.
- DashboardScreen/ReceiptScreen: offline simulation and unknown deployments remain separate and cannot sign. EvidenceScreen does not claim real payment acceptance.
- exportUtils.ts: controlled_demo flag for same payer/merchant. arcproofAbi.ts: paidAt corrected to uint64 to match exact artifact. Solidity/bytecode/dependencies unchanged.

P0 rules remain: six-decimal input parsed as integers then mapped to 18-decimal native value, 0 < amount <= 1 USDC, zero terms, integer 1–168 hour creation lifetime, ordinary EOA payer/merchant scope. Before dispatch, recheck session, target, calldata, value, deployment, invoice state, expiry, merchant code, simulation, fee and balance. Fresh gas, gas price and total fee may not exceed displayed bounds. Recheck two-minute review age after asynchronous preflight. A request lease spans wallet resolution. Explicit rejection unlocks; uncertain outcome never auto-resends. Late hashes are recorded centrally before a caller can discard them.

Receipt logs must match enclosing transaction/block and not be removed; creation events must also be nonremoved and bound exactly before read-back is accepted. Export uses the exact snapshot checked by the verifier, not an earlier unpaid state.

## Fresh local checks and reproduction

See evidence/g3-rebuilt-testnet/checkpoint.json and the fresh independent report. All service/wallet requests in these checks are injected mocks; JSDOM is not a real browser or wallet test. The runner wall clock is approximately nine hours ahead of authoritative UTC, so raw log timestamps are labeled accordingly. Contract tests were not rerun because Solidity was unchanged; historical G1 evidence is retained.

    bun install --frozen-lockfile --ignore-scripts
    bun run typecheck
    bun run oxlint --type-aware src scripts
    bun run oxlint src scripts
    bun run test
    bun run vite build

The local runner is official @oven Bun 1.4.3; repository .bun-version remains the prior 1.3.14. No application dependency or lockfile changed. Vite emits existing vendor annotation and chunk-size warnings.

## Limits and next step

Actual new UI rendering is NOT accepted yet. Isolated Vite localhost was not reachable from native Chromium and file preview was blocked by organization policy; no bypass was attempted. Use the existing authorized Studio preview. Verify desktop/mobile layout, keyboard, disconnected/wrong-chain gating, unknown request fail-closed behavior, review cancellation, stale route handling, pending saved history and offline/live distinction before giving the app to the user.

Storage is best-effort. Returned hashes survive route/account changes in memory and persist if browser storage works. In-flight/no-hash uncertain locks are memory-only; a full reload cannot promise restoration. The visible unresolved-request banner explicitly warns not to refresh or submit again before wallet-history reconciliation; cross-tab locking is not provided. No automatic resend exists.

The user can then connect an EOA on Arc Testnet, review and personally approve invoice creation, and open/copy the generated payment link. No new manual Remix coding is needed. Payment is a separate user-controlled action after exact merchant/amount/fee review, using test assets only. This task performs no wallet transaction.

Real receipt status remains UNVERIFIED_ARC_EVIDENCE/verified=false until genuine receipt and native settlement/finality evidence is validated. Current native Transfer emitter is 0xfffffffffffffffffffffffffffffffffffffffe, 18 decimals, including both successful forwarding legs. ERC-20 0x3600... uses 6 decimals. Source evidence is not a payment receipt. Committed-block finality is RPC-observed, not an independently checked certificate. Sources: https://docs.arc.io/arc/references/usdc-system-events and https://github.com/circlefin/arc-node/blob/6e764023ee6515fe70573e123ed2db912a7207b4/crates/execution-e2e/tests/e2e/eip7708_native_transfer.rs#L732-L775 .

No public publication, new credentials, paid services, mainnet, grant submission, professional audit or revenue is implied. Historical plans/evidence are retained as snapshots rather than silently relabeled as passed.
