# Suggested root README integration

This is a prepared section for the root README maintainer, not an applied root-file edit. Replace old lead paragraphs with a single current, version-bound status rather than rewriting historical evidence. Use the actual latest engineering results from STATUS, not the baseline numbers in older reports.

## Proposed opening

ArcProof is a small native-USDC invoice prototype: create fixed terms, pay once through an atomic forwarding contract, and share a receipt that anyone can re-verify against Arc without connecting a wallet.

Unaudited prototype. Maximum 1 USDC per invoice. No escrow, refund mechanism, platform fee or autonomous spending.

| Link | Status |
| --- | --- |
| Live application | Not yet evidenced for the final candidate |
| Re-verify a mainnet sample | Not yet evidenced; never substitute a fixture |
| Arc Studio project (owner-held reference) | Same project; final synchronization/access must be checked |
| Mainnet contract and payment | Not yet evidenced |
| Walkthrough video | Outline prepared; real footage and public URL pending |
| [Repository](https://github.com/peterpeter228/arcproof) | Link the actual final commit after publication is verified |
| [Round 2 materials](README.md) | Draft, not a submission receipt |

When integrating at repository root, change the relative materials link to `docs/final-delivery-20261022/README.md`. Preserve clear links to `STATUS.md`, `RUN_中文.md`, contract/receipt specifications and licensing boundaries. Keep the old reports available as dated history rather than presenting their counts or private/public status as current.

## Reproducible local commands

From the repository root, use the pinned toolchain and lockfile:

```sh
bun install --frozen-lockfile
bun run check
bun run test
forge test
VITE_ARCPROOF_NETWORK=testnet bun x vite build
VITE_ARCPROOF_NETWORK=mainnet bun x vite build
```

These commands are an intended verification sequence, not a claim they have run for the final candidate. Report each actual result separately. A successful mainnet-targeted build is not deployment evidence or permission to enable writes. The package has no `build` script. Studio-only deployment script aliases must not be presented as working clean-checkout commands unless their files have actually been supplied and reviewed.
