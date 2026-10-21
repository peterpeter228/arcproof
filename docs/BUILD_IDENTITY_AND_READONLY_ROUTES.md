# Read-only entry and candidate build provenance

## Routes

- Empty hash and `#/verify`: read-only receipt entry, no automatic business RPC until a complete receipt locator is provided or the user requests verification.
- `#/evidence`: historical records, current build provenance, and limits.
- `#/demo`: isolated offline fixtures; no live payment links, wallet requirement, or business chain request. Fixture exports remain `SIMULATED_NOT_VERIFIED`.
- `#/invoices`: explicit live-testnet invoice workspace. Wallet requests still require user review and action.
- Existing `#/pay/:chain/:deployment/:invoice` and `#/receipt/:chain/:deployment/:invoice?tx=...` retain exact deployment and identifier validation plus component identity keys. Duplicate transaction parameters, extra path segments, unsupported identities, and unknown paths fail closed.

Navigation is derived from the URL, including refresh and hashchange history traversal. Unresolved real-wallet warnings remain available on verification/evidence pages; the offline demo hides saved activity to avoid mixing real and fixture context.

## Provenance model

`vite.config.ts` injects a build UTC timestamp and SHA-256 of a canonical sorted JSON list of declared source/config input paths and per-file SHA-256 values. The explicit roots are `src`, `public`, `contracts`, and `scripts`, plus the configuration/lock files listed in that config and the two evidence fixture JSON files directly imported by tests (`evidence/g1/ArcProofInvoices.artifact.json` and `evidence/g3-native-verifier/observed-browser-evidence.json`). These two inputs are required; missing files fail the build. Generated evidence logs and documentation are deliberately excluded to avoid circular or continually changing identities. The input hash is not a Git commit, compiled artifact hash, dependency-tree hash, or reproducible-build attestation.

Current source commit is deliberately `Unknown`. This workspace can be materialized from a verified repository baseline and then changed without creating a genuine repository commit. No local `git HEAD` is consulted. An optional `ARCPROOF_VERIFIED_BASE_SHA` may be supplied only after the baseline has been independently verified; it is labeled as the base, never the changed candidate's source commit. Missing or malformed metadata remains `Unknown`.

A production build emits `build-provenance.json` containing these inputs and hashes of all actual written output files, including copied public assets. Only the root manifest itself is excluded from the output list to avoid a circular hash; installed dependency bytes and toolchain binaries remain outside this source/output identity. Independent hashing of the final output files and remote-host readback are separate acceptance steps. A development server does not serve the generated production manifest. Restart the development server after source changes to refresh its injected snapshot; use a fresh build for any final candidate evidence.

## Evidence interpretation

The evidence screen labels repository records of 73 Forge tests and 391 project tests as historical. They overlap with other suites and must not be added. It does not silently update current acceptance from prior reports, model review, old controlled chain observations, or deployment records. Current results need external logs bound to the same final candidate hash; changing source or test files changes that identity.

The new route regression tests render the actual root component in jsdom with live business clients/wallet functions mocked. They check deep-link/remount behavior, hashchange navigation, malformed links, fixture isolation, and stale receipt-route result suppression. They do not prove real browser navigation, absence of all provider-infrastructure traffic, real wallet behavior, chain settlement, or remote deployment identity. Those require separately recorded acceptance.

No deployment, publication, new wallet interaction, runtime trust expansion, or external model call is introduced by this patch.

## Bootstrap and local checks (2026-10-21)

The installed Wagmi implementation defaults `reconnectOnMount` to true; its core hydration code calls `reconnect(config)` in that branch. `main.tsx` now explicitly sets `reconnectOnMount={false}` while retaining the manual ConnectKit provider. A static source regression guard protects that explicit option; real-wallet and previously authorized connector behavior still require browser acceptance.

The focused run passed 20 tests across three files: `readonlyRoutes.test.tsx`, `buildIdentity.test.ts`, and `walletBootstrap.test.ts`. TypeScript checking passed. A production build completed with the existing large-chunk warning. Independent rehashing confirmed all 84 listed emitted output files matched the generated provenance manifest. The initial intermediate generateBundle hashes did not match later-transformed bytes; the implementation now rehashes actual written files in writeBundle, and the successful check applies to that correction. The development candidate remains mutable, so final evidence must rerun against the final frozen source rather than inheriting these counts or hashes.

## TRACE follow-on verification

Independent review confirmed the two imported evidence fixtures were absent from the initial declared snapshot. They are now narrowly included, without walking reports or all evidence/docs. Output enumeration now walks the final output directory, including copied public assets, rather than relying on Rollup bundle keys. Temporary-tree regression tests cover both fixture changes, missing required fixtures, public-input changes, copied/nested output coverage, and root-manifest exclusion. Prior 84-output evidence is retained as historical scope evidence and is not rewritten.
