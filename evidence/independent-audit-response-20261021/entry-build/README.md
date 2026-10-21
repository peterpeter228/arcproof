# ENTRY-01 / TRACE-01 scope evidence, 2026-10-21

These files preserve local evidence for this implementation scope, not a final integrated acceptance report.

- focused-tests.log: `node_modules/.bin/vitest run src/arcproof/__tests__/readonlyRoutes.test.tsx src/arcproof/__tests__/buildIdentity.test.ts src/arcproof/__tests__/walletBootstrap.test.ts`; exit 0, 20 tests in 3 files. The runner's `Start at` is its displayed local time and is not relabeled UTC.
- targeted-lint.log: `node_modules/.bin/oxlint --type-aware src/arcproof/routes.ts src/arcproof/buildIdentity.ts src/arcproof/__tests__/readonlyRoutes.test.tsx src/arcproof/__tests__/buildIdentity.test.ts src/arcproof/__tests__/walletBootstrap.test.ts src/App.tsx src/main.tsx src/components/arcproof/EvidenceScreen.tsx`; exit 0, empty stdout/stderr.
- production-build.log: `node_modules/.bin/vite build`; exit 0 with existing large-chunk warning. Build metadata records 2026-10-21T16:05:58.182Z.
- build-provenance.snapshot.json: exact generated manifest retained before the parent integrated rebuild.
- source-input-hashes.json: the same build's declared source input paths and hashes, extracted without edits.
- output-hash-verification.json: independent SHA-256 readback of every listed dist file, all 84 matching, with UTC check time. This does not include the manifest itself or copied public assets, installed dependency bytes, or toolchain binaries.
- initial-hash-mismatch-and-correction.md: observed failed preliminary hash check and corrective action, retained rather than silently replacing the failure.
- typecheck.log / typecheck-run.json: additional persisted typecheck after scope completion. Other workers may have changed their own source files by this point; no claim that this is a frozen integrated baseline.

The candidate source snapshot identifies declared inputs, not a Git source commit. Source commit and verified base are null in this particular build. The parent may supply an independently verified base SHA in a later final build; it remains a baseline label, not the modified candidate commit.

These tests use mocked business wallet/RPC clients and jsdom, plus a static bootstrap wiring guard. They do not prove real-wallet behavior, zero provider-infrastructure traffic, real browser history behavior, chain settlement, remote host identity, production/mainnet readiness, or eligibility. Browser and integrated evidence are separate.
