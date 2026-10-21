# Independent candidate safety review — 2026-10-21

## Result
No new concrete counterexample found in the scoped patch review. This is a bounded offline review, not certification or live-wallet/chain acceptance. Compared runtime changes with frozen `arcproof-baseline`; source hashes bind the files inspected at completion. Any later modification needs a delta review.

## Directly executed

- Targeted existing suite: **7 files, 122 tests passed**. Modules: unknownRequestIdentity, walletIntents, testnetClient, testnetUi, readonlyRoutes, walletBootstrap, buildIdentity. `targeted-tests.log` records the exact command. These overlap project tests and must not be added to the project total as distinct coverage.
- Independent `state-probe.ts`: **20 cases passed** using actual project modules, synthetic storage and Web Locks. All pay/create × requesting/uncertain/submitted hashless intents reject recovery before verification and retain stored state. Duplicate guards remain, including cross-account payment attempts and invoice-ID casing. Known exact hashes remain unchanged on verifier error and support included/reverted outcomes; case-only hash changes are accepted. Twelve malformed chain representations cannot resolve the checked testnet deployment.
- Independent `bootstrap.test.tsx`: **1 test passed**, running actual main.tsx and installed Wagmi/ConnectKit in jsdom. With a synthetic injected provider and prior injected.connected flag, read-only entry renders with zero provider RPC and zero fetch during a 500ms observation window. Explicit library reconnect is a positive control and does call the synthetic provider's eth_accounts. This demonstrates the observation is instrumented, not merely a hidden wallet button. `bootstrap-attempt1.log` is the simpler fresh-store pass; `bootstrap-attempt2.log` includes remembered-provider flag and positive control. No failed probes occurred in these runs.

All requests in the provider probe are synthetic. No actual wallet, remote provider, paid model, external write, or network transaction was used. The bootstrap probe is not real-browser or extension acceptance and does not establish absence of all possible delayed provider behavior. Read-only receipt deep links intentionally perform public chain reads; the zero-fetch assertion covers the empty verify entry.

## Static findings and scope

1. SEC-R01 fix is at the durable-intent boundary, not merely UI hiding. Every hashless recovery rejects before the strict verifier callback. Service recording and in-memory guard release remain restricted to original saved hashes. Independent invoice verification does not invoke recovery or release the original intent.
2. Known-hash recovery and all three unresolved states retain their existing strict boundaries. Unknown hashes are not overwritten. There is no timer-based unlock, automatic resend, or persistent-state clearing in the patch.
3. Dashboard copied feedback uses full invoice identity plus monotonically increasing request token. New review, new created invoice, component unmount, and keyed wallet-session changes invalidate stale success/failure. The existing targeted UI tests exercise late results, repeat-copy races, and session/unmount changes. Receipt copying also has a distinct per-copy token and verification-sequence guard.
4. URL navigation is the authority, empty entry is read-only, malformed identities go to unavailable components, and valid receipt route identity remounts the receipt fields. Parser never silently replaces a malformed chain with testnet. Duplicate transaction query values are rejected. Offline simulation does not produce live payment links.
5. `reconnectOnMount={false}` is explicit. Actual-provider bootstrap probe supports the intended read-only entry behavior beyond the existing static source test.
6. Build identity never promotes local/materialized files to a current Git SHA: sourceCommit is always null. Source snapshot and generated output hashes are integrity locators, not provenance authenticity, remote deployment readback, wallet success, or chain settlement. The source hash manifest intentionally excludes installed dependency bytes/toolchain binaries and copied public outputs and says so. verifiedBaseCommit is supplied metadata rather than independently proven by the build script; the caller must retain the baseline verification evidence. Concurrent root build prevented treating the current dist folder as an immutable review target; no independent output-hash claim is made here.

## Reproduction

From candidate root:

    /tmp/arcproof-tools/bin/bun evidence/independent-audit-response-20261021/independent-check/state-probe.ts
    /tmp/arcproof-tools/bin/bun x --no-install vitest run --config evidence/independent-audit-response-20261021/independent-check/vitest.config.ts

No production files were edited by this review. Review files live only in this evidence directory. The vitest override imports the project configuration but selects only the independent bootstrap test.

## Not established

Not a new full project/Foundry run, actual browser clipboard/printing acceptance, wallet extension/physical wallet validation, public RPC truth, deployed runtime identity, professional audit, production readiness, mainnet acceptance, or competition eligibility. New source changes after the recorded hashes are outside this conclusion.
