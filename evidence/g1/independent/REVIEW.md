# ArcProof G1 independent local review

Date: 2026-10-20 04:29 UTC. Scope: exported Solidity, ABI and local contract tests only. This is an engineering review, not a professional security audit or certification.

## Result

PASS for the narrow local contract gate and proceeding to G2 development. No unresolved P0/P1 implementation issue identified within this review. No deployment, Arc testnet behavior, wallet integration, frontend payment preparation, receipt verification or mainnet claim is implied.

Reviewed export: `/workspace/shared/arcproof-studio-g1-042755`.
Contract SHA256: `8699071d250c834cd1166ece0d4001b7de95af7562796e19305ce2812635e25b`.
Exported main test SHA256: `389e730e3bdd10a77680955ac51aae32437eb2545946273eb97e18da4019563a`.
Source Keccak256: `0x9e8a352f07941c1ddc285d1a008b8dd94159617e021beb033e2fdf43c82b5074`.

## Executed evidence

Independent toolchain: official npm @foundry-rs/forge-linux-amd64 1.7.1 (commit4072e48705af9d93e3c0f6e29e93b5e9a40caed8), solc npm0.8.28 via a small standard-JSON stdin/stdout adapter, OpenZeppelin Contracts5.1.0 from npm, exported forge-std. Installed in isolated review-tools with package lifecycle scripts disabled. No keys or deployment used.

Working directory: `/workspace/shared/arcproof-review-final`.
Command: `/workspace/shared/arcproof-review-tools/node_modules/@foundry-rs/forge-linux-amd64/bin/forge test --offline --use /workspace/shared/arcproof-review-tools/solc-wrapper --fuzz-seed 0x1234 -vv`.
Clean compilation first performed with `--force`. Final run: 73 passed, 0 failed, 0 skipped across5 suites; fuzz256 cases per fuzz test. `final-forge.log` and `final-forge.exit` retain output and actual process exit0.

73 comprises69 exported tests (including prior native balance regression incorporated into Studio),2 native bounded64KiB return/revert-data tests, and2 native strict reentrancy tests. Supplementary files must be preserved in the eventual repository to reproduce73 rather than69.

`artifact-coherence.json`: independent clean build ABI, creation bytecode and deployed bytecode equal exported artifact exactly. Exported root ABI equals artifact. Metadata source hash equals exact Solidity file. Compiler0.8.28, Paris target, optimizer200. Callable functions: AMOUNT_QUANTUM, MAX_INVOICE_AMOUNT, MAX_LIFETIME, createInvoice, getInvoice, nextNonce, payInvoice; no receive/fallback.

## Static review

Contract amounts are integer native18, with quantum1e12 and immutable per-invoice1e18 cap (lines29–35,114–116). Creation is nonpayable, fixed merchant=caller, future expiry at most7days, canonical ABI-encoded chain/deployment/merchant/nonce ID, nonce increments once (lines108–144). Both mutating entries share imported OZ nonReentrant. Payment checks existence, replay, expiry and exact value; saves paid/time/block before call; forwards only current msg.value; reverts on transfer failure or changed prior balance; emits only after success (lines154–187). getInvoice throws for unknown IDs (198–202). No privileged withdrawal, ownership, upgrade, custody or arbitrary recipient entrypoint found.

## Findings and resolution

- P1, initial export ABI/artifact stale: earlier artifact retained old getters, terms rejection and receive/fallback. CLOSED in final export by independent clean-build byte-for-byte comparison, not merely a claimed rebuild.
- P1, initial T15 accepted either success or revert: CLOSED by final strict test and native independent exact BALANCE_MISMATCH regression, including preexisting7ether and all relevant balances/state rollback.
- Required coverage gap, actual uncaught same-invoice reentry: final Studio test at ArcProofInvoices.t.sol603–636 still calls a swallowing receiver, so its name and description remain misleading. Contract behavior independently CLOSED by supplementary IndependentReentrancyReview.test_actualUncaughtSameInvoiceFullRollback. Keep that test in repository; rename misleading Studio test with a small later edit, not a wholesale rewrite.
- Exact shared-guard errors: native IndependentReentrancyReview verifies ReentrancyGuardReentrantCall selector for same-invoice, different-invoice and create reentry. Existing exported tests cover same/different merchant cross-invoice paths, rejecting/exhausting merchant, prefunding and actor/sequence fuzz.
- Initial wrong-amount fuzz assumed inequality before bounding; corrected to bound before assume in final export.
- Low-severity test documentation remains imprecise: caught/uncaught labels for create are reversed; ArcProofAcceptance header references EIP6780 'deferral', although it concerns deletion semantics, not deferred balance transfer. Not a demonstrated contract flaw.
- OZ pin is verified from package+lock and independent dependency build. A tautological test name is not itself evidence of installed version.

## Remaining boundaries

Paris is compiler/local-EVM setting, not Arc protocol emulation. Official Arc EVM differences docs state Osaka baseline and additional native USDC transfer/blocklist rules; ordinary Foundry results cannot establish system Transfer logs, Arc finality, actual gas or wallet compatibility. Real network L3 remains not_run. Source: https://docs.arc.io/arc/references/evm-differences .

paidBlockNumber storage is locally verified; hash recovery, receipt event matching, deployment isolation and money parser UI remain G2/L2 work. Do not mark entire T04/T17 mixed L1+L2+L5 items fully passed solely from these contract tests. Contract may retain involuntarily preexisting funds; it does not offer a recovery method. No claims of zero risk, grant eligibility, mainnet operation or professional audit.
