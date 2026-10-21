# Reproducible quality gates and evidence boundaries

This document describes local, synthetic checks. It does not authorize CI execution, spending, deployment, RPC access, wallet signing, public publication, or a submission. Current integrated results belong in `STATUS.md` and its dated evidence report; older reports remain historical.

## Separate claims

- **Source typecheck**: `bun run typecheck` covers the application's existing `src` and `scripts` scope.
- **Whole-repository lint**: `bun run oxlint .` includes archived reviewer/helper code. No new lint ignore or rule suppression was added. The quality patch removes the 122 diagnostics observed in its input snapshot.
- **Archived helper typecheck**: `bun run tsc -p qa/new-independent-review/tsconfig.quality.json --noEmit` additionally checks the affected reviewer files, typed fixture transport and quality regression. It does not claim that historical expectations remain current product requirements.
- **Current executable suites**: project tests, native-settlement adversarial tests, current independent UI/wallet tests, the input-poison regression, and local security HTTP/HMR/build checks below. A passing mock or jsdom test is not real-browser, real-wallet or Arc acceptance.
- **Historical executable probes**: retained without deleting assertions. Their pre-migration failures and exact expectation migrations are recorded below. Every original probe name and safety property remains represented; no tests are skipped or deleted.
- **Remote CI**: not run by this task. A local exit code, an inactive workflow example, or a pushed commit is not a remote CI record.

## Read-only code checks and local build

Install a reviewed lockfile in a fresh disposable environment first, using `bun install --frozen-lockfile --ignore-scripts`. Installation fetches packages; it is not an air-gapped action. The following checks use installed tools, not package-manager commands that download a missing executable:

```sh
bun run oxlint --type-aware src scripts
bun run oxlint .
bun run typecheck
bun run tsc -p qa/new-independent-review/tsconfig.quality.json --noEmit
bun run vitest run
bun run vitest run --config qa/native-settlement-review/vitest.config.ts
bun run vitest run --config qa/new-independent-review/vitest.config.ts
bun run vitest run --config qa/quality-gates/vitest.config.ts
bun run vite build
ARCPROOF_SECURITY_OUTPUT="$TMPDIR/arcproof-security-check" node --test qa/debug-security/boundary.test.mjs
```

Set `TMPDIR` to a fresh writable temporary directory if absent. Build/security checks create local output; they do not publish it. The security harness opens loopback HTTP/WebSocket endpoints only. No deploy/self-deploy/compass script, wallet, chain fork, network provider, API server, signing key or real RPC is part of these gates. `bun run check` is only lint plus source typecheck, not the full list above; it must use the non-mutating lint script from the dependency patch before being called read-only.

## Migrated reviewer assertions and immutable historical failures

```sh
bun qa/new-independent-review/service-probes.ts
bun reviewer-tests/reviewer-safety.ts
bun run vitest run --config qa/quality-gates/vitest.legacy.config.ts
```

Standalone service output now defaults to `evidence/quality-gates-20261021/service-probes-results.json`; set `ARCPROOF_PROBE_OUTPUT` to a fresh file on each later rerun. The old `qa/new-independent-review/service-probes-results.json` is never overwritten. The typed service harness uses a real viem client with a custom, in-process RPC transport: unsupported methods fail, and global fetch is forbidden. It includes deterministic storage/Web Locks prerequisites, not actual tabs.

In the pre-integration quality investigation:

- Original versus lint-cleaned harness, with the same deterministic browser prerequisites and unchanged production code: the same 114 named probes, 104 passed / 10 failed, with identical pass/fail names. No failed assertion was changed to the observed value.
- A new independent regression found a real defect: rejecting an invalid preflight target could persist an invalid cancelled intent and block later valid sends. The regression fails before validation-before-write and passes against the integrator's focused input-validation patch. Already-corrupt stored data still fails closed; the fix does not delete or ignore it.
- With that focused fix plus correct mock cleanup and canonical fixture addresses, service probes give 108 passed / 6 failed. Remaining historical expectations are: the old duplicate-request error wording; sending despite storage already failing before dispatch; two old generic receipt-status expectations using transactions without required inclusion metadata; and two recovery expectations missing that metadata. These are not six new successful wallet/network tests. See fresh logs for exact names and reasons.
- Historical low-level safety probes retain all 26 result checks. The migrated script now counts failures and returns nonzero for any false result; the prior script’s process exit alone was insufficient. All 26 checks pass in the fresh rerun.
- Before semantic migration, historical UI probes gave four passed/two failed because unsupported routes no longer contain a disabled wallet button or fake-wait button. Their six original test names remain; current assertions require immediate unavailability, no wallet calls, no fetch, no fake pending state, and no proof exports. All six now pass; the earlier failure log remains unchanged.

After the explicit [semantic migration](QUALITY_PROBE_MIGRATION.md), all **114 service probes and six reviewer UI tests pass** against the focused input-validation fix; all original names are retained. Full merged dependency/export/UI reruns are still the integration coordinator’s responsibility. Original source snapshots, the initial 104/10 and intermediate 108/6 results, and the old UI 4/2 result remain immutable evidence. QA-01 remains partial until current remote CI exists; no local pass is a CI claim.

## CI activation and cost boundary

No `.github/workflows` directory existed in the inspected input. `docs/ci/quality-gates.yml.example` is an **inactive, unexecuted proposal**, deliberately outside GitHub's workflow directory. It has only manual dispatch, read-only contents permission, default-branch-only execution, no PR/ref input, no secrets, no cache, no publish/upload/deploy step and a bounded timeout. It must not be copied into `.github/workflows` or dispatched until the owner confirms runner entitlement and that no charge can occur under the zero-budget constraint.

The example's install phase needs GitHub/package-registry access; “offline” refers to the application's test inputs, not a promise of enforced OS-level network isolation. It is not approval to run untrusted PR code. Installation and CLI compatibility must be rechecked before activation. Solidity/Foundry and actual browser acceptance remain separate gates, with their own prerequisites; they are not claimed by this example.

Pinned official action identities were checked against the maintainers' release/commit pages:
- [checkout v4.2.2](https://github.com/actions/checkout/commit/11bd71901bbe5b1630ceea73d27597364c9af683)
- [setup-node v4.4.0](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020)

These are explicit reproducibility pins, not a claim that they are the latest releases or have been remotely executed here.
