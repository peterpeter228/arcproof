# ArcProof

**Fixed USDC invoices. Pay once. Re-verify the receipt without a wallet.**

ArcProof creates immutable invoice terms on Arc, forwards the exact payment to the merchant in the same transaction, and lets anyone check the receipt against chain data rather than trusting a screenshot.

**Unaudited prototype · maximum 1 USDC per invoice · no escrow, refunds or platform fee.** Unexpected pre-existing contract balances cannot be recovered. A verified payment is not proof of delivery, legal identity, customer revenue or a tax invoice.

## Try and inspect

| Material | Current state |
| --- | --- |
| Live mainnet application | Not yet available |
| Re-verify a mainnet sample | Not yet available; offline fixtures are not payment evidence |
| Arc Studio project (owner-held reference) | Original project; final-candidate synchronization pending |
| Mainnet contract and transaction | Not deployed for this candidate |
| Walkthrough video | [Real-footage outline](docs/final-delivery-20261022/VIDEO_OUTLINE.md); recording pending |
| Engineering status | [STATUS.md](STATUS.md) and [release status](evidence/release-status.json) |
| Contest materials | [Draft delivery pack](docs/final-delivery-20261022/README.md), not a submission receipt |

The current mainnet registry is empty and mainnet wallet actions remain disabled. The code distinguishes unconfigured (U0), trusted read-only (R1), and explicitly enabled (W2) contexts; supporting those states is not authorization to deploy or move funds.

## What a verified receipt checks

1. Trusted deployment and reviewed runtime code.
2. Paid invoice state and identity.
3. Exact transaction and `InvoicePaid` event binding.
4. Native USDC payer → contract → merchant transfer legs, at 18 decimals.
5. Finalized and canonical block consistency.

Missing or contradictory evidence stays unverified. RPC checks are not an independent consensus proof. Imported JSON cannot confer verification. Offline JSON/CSV explicitly retain null payment facts, even when the page shows example inputs.

## Run locally

```sh
bun install --frozen-lockfile
bun run check
bun run test
forge test
VITE_ARCPROOF_NETWORK=testnet bun run dev
VITE_ARCPROOF_NETWORK=testnet bun x vite build
VITE_ARCPROOF_NETWORK=mainnet bun x vite build
```

Use the checked-in lockfile. Foundry requires solc 0.8.28, Paris EVM and optimizer 200 as recorded in `foundry.toml`. There is no `bun run build` alias. The scaffold aliases `deploy:self`, `compass:deploy` and `fetch:abi` refer to Studio-environment scripts that are absent from a clean checkout; they are **not supported deployment commands here**. No private key belongs in the app or repository.

## Scope and provenance

Contracts and the initial app originated in Arc Studio, with external review and hardening subsequently synchronized back to the same project. Latest candidate synchronization must be separately verified. Mixed Studio/external workflow eligibility remains unresolved; product documentation is not organizer approval. See [current rules](docs/final-delivery-20261022/RULES_AND_ELIGIBILITY.md).

A repository-wide license has not been granted. See [licensing boundary](docs/LICENSING_BOUNDARY.md) and [release license review](docs/final-delivery-20261022/LICENSE_REVIEW.md).

- [中文运行说明](RUN_中文.md)
- [Contract specification](docs/CONTRACT_SPEC.md)
- [Receipt export format](docs/RECEIPT_EXPORT_FORMAT.md)
- [Submission readiness](docs/SUBMISSION_READINESS.md)
- [Dated engineering history](https://github.com/peterpeter228/arcproof/blob/cd579e567457ff8acf0fe041a5cff3df07c344c0/README.md)

Engineering readiness, actual network acceptance, public availability and competition submission are separate milestones. No award probability or payment date is promised.
