# ArcProof fresh read-only verification

Status: blocked. Observed 2026-10-21 16:02–16:03 UTC.

Current official Arc RPC, finality, native USDC system-event and EVM-difference documentation was retrieved successfully. The documented primary and dRPC public testnet RPCs returned HTTP 403 (Cloudflare error 1010). No fresh chain ID, transaction, receipt, runtime bytecode or finalized header was obtained.

The existing production receipt verifier was executed offline against the captured chain-read failure. It correctly returned PENDING and verified=false; downstream checks remain not_run. This replay is explicitly not live settlement evidence.

The previous 0.20 test USDC same-wallet transaction remains controlled_demo, not two-wallet acceptance or revenue. No source/runtime edits, signing, wallet operations, deployment or transaction broadcasts were performed.

REPORT.json includes source URLs, exact request scope, limits, failures and evidence hashes. Individual JSON captures preserve source and observation timestamps. Full documentation captures are research evidence, not project runtime inputs.
