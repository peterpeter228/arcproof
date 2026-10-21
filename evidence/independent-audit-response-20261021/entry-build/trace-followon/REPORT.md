# TRACE follow-on, 2026-10-21

## Independently assessed model comments

Confirmed: the initial source snapshot omitted two JSON fixtures actually imported by the test tree: `evidence/g1/ArcProofInvoices.artifact.json` and `evidence/g3-native-verifier/observed-browser-evidence.json`. The fix includes precisely these required paths. It does not hash all evidence or docs, avoiding generated-report/build-log feedback loops. Missing required fixture bytes fail the snapshot/build rather than producing an incomplete identity silently.

Confirmed limitation, not an undisclosed initial claim: the first output manifest enumerated only Rollup bundle keys and expressly excluded copied public assets. The new implementation enumerates every actual output file, including copied public assets and nested paths. Only the root `build-provenance.json` is excluded to avoid circular identity. No Git identity, dependency binary, remote host, chain, or wallet proof is inferred.

Not adopted: changing strict trailing-slash parsing or treating a bare `#` return link as a functional routing defect. It already routes safely to verification. No route trust expansion was needed.

## Changes

- New `scripts/buildProvenance.ts`: source snapshot and final-output hashing helpers.
- `vite.config.ts`: delegates to helpers, updates disclosed scope.
- New `src/arcproof/__tests__/buildProvenance.test.ts`: temporary-tree regression coverage.
- `docs/BUILD_IDENTITY_AND_READONLY_ROUTES.md`: updated scope and limits.

## Checks and retained evidence

- `node_modules/.bin/vitest run src/arcproof/__tests__/buildProvenance.test.ts src/arcproof/__tests__/buildIdentity.test.ts`: exit 0, six tests across two files; tests.log.
- `node_modules/.bin/tsc --noEmit`: exit 0; typecheck.log is empty.
- `node_modules/.bin/oxlint --type-aware scripts/buildProvenance.ts src/arcproof/__tests__/buildProvenance.test.ts`: exit 0; lint.log is empty.
- Actual Vite Node API `build({publicDir, build:{outDir, emptyOutDir:true}})` with a temporary external public directory containing `nested/probe.txt` and a separate temporary output directory: exit 0, copied asset included, all 85 actual output hashes match. Full build output and per-file expected/actual digests are retained. Temporary directories were removed after the check; repository public files and production dist were not mutated by this probe.

The API override probe tests real public-asset copying/output coverage, not a final-release artifact: its external publicDir is deliberately outside the repository's declared source snapshot. Parent final integrated build must use its frozen declared repository inputs. Previous 84-file verification and first external-review packet are preserved unchanged.

The six-test count overlaps the prior three identity tests and must not be summed into a unique project total. Model review was a static suggestion source; these findings were verified locally and are not certification.
