# Narrow UI assertion migration, 2026-10-21 UTC

Initial current-ui.log (23/24) and legacy-ui.log (5/6), with initial commands.json, remain unchanged. Two obsolete presentation expectations were migrated after parent review; no production file changed.

- qa/new-independent-review/ui-probes.test.tsx: all27 unresolved hash anchors must still exist. Additionally, each must belong to the named unresolved section and neither the section nor any anchor may be within hidden content or closed details. Removed only the requirement for a details element when there is no completed history. This strengthens visibility checks rather than allowing loss of saved hashes.
- reviewer-tests/reviewer-ui.test.tsx: exact amount text now expects0.20 test USDC instead of0.20 USDC, matching explicit test-asset labeling. Existing SIMULATED_NOT_VERIFIED, no-payment-proof, and no-wallet assertions are unchanged.

Both changes have dated inline audit comments. No test was removed, skipped, or marked expected-to-fail. Fresh migrated results and UTC command timing are in migration-commands.json; original failures are retained as historical evidence.
