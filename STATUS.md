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
