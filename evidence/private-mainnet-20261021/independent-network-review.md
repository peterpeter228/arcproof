# Independent private-network isolation review

Session date: 2026-10-21 UTC. Scope: the private NET-01 candidate against `docs/NET01_PRIVATE_READINESS_DESIGN.md`, with baseline file identity checked against the supplied remote tree metadata (commit SHA `4deb74cce889ca122ef33903d27c2be10a1c437e`, underlying Git tree `3ff61a198c8c719a8defc6619d7457c6ab4fdab7`). This is a targeted code review and offline regression exercise, not a professional audit or mainnet acceptance.

## Result

The concrete issues found below have been fixed and independently rechecked. No remaining exploitable mainnet-send or trusted-deployment classification bypass was found through the current application and context-bound service surfaces. The production manifest remains empty, mainnet writes remain disabled, and historical testnet deployment identifiers and contract source remain unchanged.

Candidate declared-source snapshot at the focused recheck: `e8f83ed0b8fc9b4f621f9cef4839e5b739e529693fd925e962247dd5c3e3c626`. This is a source snapshot, not a Git commit, deployment, or live-host attestation.

## Findings and verified fixes

1. P2: Mainnet's empty connector list did not disable wallet discovery.
   - Original reproduction used the actual wagmi configuration in jsdom with the mainnet build selector. Announcing an EIP-6963 provider created an injected connector despite `connectors: []`. A provider `accountsChanged` event then made wagmi connected and invoked `eth_chainId` and `eth_accounts`.
   - No transaction-send bypass was found, but this violated the empty-manifest preview's disabled-wallet-connection claim.
   - Fixed in `src/config.ts` by disabling multi-injected-provider discovery and persistent wagmi storage when writes are disabled.
   - Added `src/arcproof/__tests__/mainnetWalletBootstrap.test.ts`: actual config import, initial and late provider announcements, zero connectors/provider calls/connections, and no read/write/removal of historical `wagmi.store`. Both tests pass.

2. P2: Corrupt submission persistence could remove the unresolved-payment guard.
   - Original reproduction stored one valid unresolved legacy payment and one unrelated malformed per-hash JSON row. The whole read returned an empty list, and beginning the same payment was allowed. Legacy rows without a durable intent were therefore unguarded.
   - A second reproduction showed that a submitted payment missing `invoiceId` was accepted as valid and did not block a new payment for that account.
   - Fixed in `src/arcproof/submissions.ts`: unreadable storage now prevents new submission leases, and payment rows require a valid invoice identity. Existing records are not deleted or migrated. Independent reproduction now blocks with an unreadable-storage error and preserves the legacy row.
   - Regression coverage is in `networkPolicy.test.ts`; existing submission-registry tests now supply explicit offline storage rather than relying on unavailable node-local storage. The fail-closed production behavior was not weakened.

3. P3: Duplicate transaction parameters on a payment URL could mount wallet controls.
   - The route parser represented duplicate `tx` parameters as an invalid empty hash, but the payment branch originally ignored that field. Receipt routes already rejected it.
   - Fixed in `src/App.tsx`: the payment route checks transaction-hash shape before mounting the pay screen or exposing wallet controls and passes invalid hashes to the read-only unavailable view.
   - The new `readonlyRoutes.test.tsx` regression verifies that a trusted payment path with duplicate transaction parameters invokes no wallet or transaction actions.

## Independent checks

- Initial targeted run: 7 test files, 122 tests passed. It missed the defects above, which were demonstrated separately.
- After wallet-discovery and persistence fixes: full Vitest run passed 29 files and 460 tests. This run preceded the final payment-route regression; it is not the final candidate acceptance count.
- Focused recheck after the last fixes: 5 files, 46 tests passed, covering read-only routes, actual mainnet wallet bootstrap, network policy/persistence isolation, hashless unknown-request identity, and submission leases.
- Separate final route-only rerun: `bun run test src/arcproof/__tests__/readonlyRoutes.test.tsx`, 17 tests passed, exit code 0.
- TypeScript typecheck completed with exit code 0 after the new bootstrap tests. Final integrated typecheck/lint/build and suite evidence belongs to the parent pipeline.
- No real browser, wallet, RPC, deployment, transfer, signing, Argon invocation, or GitHub write was performed by this reviewer. Mock-provider tests used only synthetic offline events and storage.

## Coverage limits and retained release gates

- The trusted manifest is empty for mainnet. Positive mainnet deployment/read/payment acceptance cannot be established and remains NOT_RUN.
- Mainnet build labels and the closed registry are not on-chain proof. Actual source/runtime/deployment receipt, raw native-transfer logs, finalized block evidence, and public release identity remain separate acceptance work.
- The current UI deliberately does not mount a mainnet payment or receipt workflow. Generic verifier helpers are exercised through trusted context-bound service entry points in the application; no imported-data verification workflow was introduced.
- Browser tests here use jsdom and synthetic EIP-6963 providers. Real-browser wallet-extension behavior, viewport/print/download acceptance and Studio synchronization are outside this review.
- Hashless requests remain unresolved. Successful independent invoice verification does not settle them, clear their guards, or authorize a resend. Unknown testnet intents are not migrated into mainnet storage.
- Recheck if the source snapshot changes. No statement here certifies absence of all defects or permits release, deployment, signing, payment, or publication.
