> Dated reconciliation — 2026-10-21: the native-verifier candidate was subsequently delivered to private GitHub at `d34138b19a3878fd095413822c48d28fea6a4c58`, now freshly hash-checked and retested. This documentation revision is based on that verified baseline; delivery is confirmed only by a subsequent remote commit/readback receipt. Studio was last verified at the earlier `8588d80` checkpoint, not freshly inspected or updated here. Browser acceptance, genuine raw RPC/finality capture and two-wallet T25/T26 acceptance remain incomplete. No new wallet action, mainnet action or public publication occurred. See [current STATUS](../STATUS.md) and [fresh baseline evidence](../evidence/g4-baseline-20261021/baseline-report.json). Statements below about no GitHub update describe the original local implementation task, not its later private delivery.

# Native settlement verifier candidate

Scope: local candidate based on private repository source commit `8588d80dd08a5ee819efc0d2f723ed50655f8b9d`. No GitHub update, Studio integration, new transaction, mainnet action, or publication is performed by this work.

## Implemented policy

The immutable Arc Testnet deployment selects `arc-testnet-native-eip7708-finalized-v1`. Unsupported or absent policy stays `UNVERIFIED_ARC_EVIDENCE`. The production/mainnet manifest remains empty. Runtime bytecode and all pre-existing transaction, invoice, InvoicePaid and block checks remain required. Transaction block hash/number/index must also be preserved and match the receipt; pending or missing inclusion metadata cannot verify. Zero/contract payer or merchant and payment at or after expiry are rejected as inconsistent evidence. Calldata is now also required to have its exact canonical length.

The native emitter is `0xfffffffffffffffffffffffffffffffffffffffe`, using 18 decimals. Native `Transfer` decoding requires exactly three topics, canonical zero-padded indexed addresses, and one complete uint256 data word. There must be precisely one payer-to-contract transfer and one contract-to-fixed-merchant transfer for the full invoice amount, with distinct source log indices and no other transfer involving the contract. Their causal log ordering must precede InvoicePaid; neither array positions nor fixed observed indices are used. The verifier never sums logs. ERC-20 six-decimal logs from `0x3600000000000000000000000000000000000000` cannot satisfy these checks, and gas is not transfer revenue.

Every receipt log must retain its original transaction hash/index, block hash/number, log index and explicit `removed: false`. Missing, removed, conflicting or duplicate log identity fails closed. The adapter does not synthesize these fields from its enclosing receipt.

Arc provides finality on commit, not after an Ethereum-style confirmation window. This application conservatively requests the RPC `finalized` block tag. Its number/hash/timestamp must be valid, at or beyond the payment height, and consistent with an independent numbered lookup. The payment height is re-read after observing the finalized header and must still match the receipt and invoice timestamp. Missing/unsupported/null/stale/conflicting evidence stays `UNVERIFIED_FINALITY`; there is no `latest`, `safe`, elapsed-time or confirmation-count fallback. This verifies RPC-provided evidence, not a BFT consensus certificate or an independent light client.

A successful result and receipt exports record the policy ID, native emitter/decimals, both native source log indices, finalized number/hash and same-wallet `controlled_demo`. JSON/CSV also include schemaVersion 1.1, contractAddress/txHash aliases, blockNumber, verifiedAt (milliseconds), and gasFeeNative as an integer string computed from supplied receipt gasUsed × effectiveGasPrice. Missing gas fields produce null rather than an invented zero; gas does not alter the invoice amount. Imported verification flags remain untrusted. A self-demo is not a two-wallet acceptance test, customer payment, revenue, tax invoice or delivery proof.

## Evidence and acceptance limits

The already-mined self-demo is transaction `0x0987c87540b6701be5fe047c55a7ac1b9277fda7dd989f31c8ea3ccd25350ace`, on Arc Testnet 5042002. Its browser observation is retained unchanged in `evidence/g3-native-verifier/observed-browser-evidence.json`. That file explicitly identifies itself as normalized browser observation, not a raw RPC receipt.

`src/arcproof/__tests__/fixtures/observedPayment.ts` reconstructs the observed transaction and native log contents. Its per-log provenance, complete invoice state and finalized responses are synthesized for tests and prominently labeled. Positive mock tests validate the implementation, not the live endpoint or the real transaction's finality. No raw RPC capture or real post-integration verified output is claimed. T25/T26 full acceptance and the separate two-wallet requirement remain incomplete. Existing Studio code is unchanged until parent review and an authorized integration step.

## Reproduce local checks

Use Bun 1.3.14, matching `.bun-version`, and the existing frozen lockfile. No dependency/lockfile/Solidity changes were made.

```sh
bun install --frozen-lockfile
bun run typecheck
bun run oxlint --type-aware src scripts
bun run oxlint src scripts
bun run test
bun run vitest run --config qa/new-independent-review/vitest.config.ts
bun run vite build
```

Whole-repository read-only lint (`bun run oxlint .`) currently fails on pre-existing diagnostics in unchanged archived files under `qa/new-independent-review`, `reviewer-tests`, and `tools/g1-review`. Production source lint and type-aware source lint are separate passing checks. The aggregate `bun run check` is not claimed green because its lint command includes this directory and uses `--fix`; unrelated historical review artifacts were deliberately not rewritten. Production build retains existing third-party annotation and chunk-size warnings. Contract tests were not rerun because Solidity, ABI and the compiled artifact are unchanged.

The executor clock is approximately nine hours ahead of authoritative UTC. Raw test logs carry executor timestamps; the candidate report separately records authoritative task time.

## Primary sources reviewed

- https://docs.arc.io/arc/references/usdc-system-events
- https://docs.arc.io/arc/concepts/deterministic-finality
- https://docs.arc.io/integrate/wallets/transaction-lifecycle
- https://github.com/circlefin/arc-node/blob/main/crates/eth-engine/src/rpc/engine_rpc.rs
- https://github.com/circlefin/arc-node/blob/main/crates/eth-engine/src/ipc/engine_ipc.rs

Arc node's forkchoice implementation sets head, safe and finalized to the committed head. This supports the selected RPC evidence policy; it does not substitute for observing the actual endpoint response. No restricted direct-RPC route was retried or bypassed.
