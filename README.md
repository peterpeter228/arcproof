# ArcProof

**Fixed USDC invoices. Pay once. Re-verify the receipt without a wallet.**

ArcProof creates immutable invoice terms on Arc, forwards the exact payment to the merchant in the same transaction, and lets anyone check the receipt against chain data rather than trusting a screenshot.

**Unaudited prototype · maximum 1 USDC per invoice · no escrow, refunds or platform fee.** Unexpected pre-existing contract balances cannot be recovered. A verified payment is not proof of delivery, legal identity, customer revenue or a tax invoice.

## Try and inspect (judge-facing)

| Material | Current state |
| --- | --- |
| Arc Studio project | https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753 — origin project; **final-candidate Studio sync pending** |
| Public repository | https://github.com/peterpeter228/arcproof |
| Live public App URL | `{{PUBLIC_APP_URL}}` — **not yet published** |
| Arc Mainnet contract (chain `5042`) | `{{MAINNET_CONTRACT}}` — **not deployed for this candidate** |
| Mainnet deployment tx | `{{TX_HASH}}` (deploy) — null until signed deploy |
| Mainnet sample payment tx | `{{TX_HASH}}` (pay) — null until real USDC via App |
| Walkthrough video | `{{VIDEO_URL}}` — outline only: [VIDEO_OUTLINE.md](docs/final-delivery-20261022/VIDEO_OUTLINE.md) |
| Judge demo path (honest) | [JUDGE_DEMO_GUIDE.md](docs/JUDGE_DEMO_GUIDE.md) |
| Engineering / release state | [STATUS.md](STATUS.md), [release-status.json](evidence/release-status.json) |

### Hard-gate status (honest — Arc Microgrants)

| # | Gate | Status |
| --- | --- | --- |
| 1 | Built in Arc Studio (`studio.arc.io/app/<uuid>`) | **Partial** — Studio UUID present; contract + initial app originated in Studio; later external hardening disclosed; **final candidate sync = not_run** |
| 2 | Contracts tested + deployed on Arc **mainnet** | **Partial / blocked** — Forge tests historically green; **testnet** deployed (`0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30`, chain `5042002`); **mainnet `5042` not deployed** |
| 3 | Public Studio/App calling those contracts | **Missing** — no public App URL; localhost / private Studio preview only |
| 4 | ≥1 real Arc mainnet USDC flow via contract + App | **Missing** — `payment_transaction=null`; offline/testnet are not substitutes |
| 5 | Submit: Studio URL + public repo + video + short description | **Partial** — Studio URL + public repo ready; short desc in draft; **video missing**; DoraHacks form **not submitted** |

The production manifest is empty (`PRODUCTION_MANIFEST=[]`). Mainnet wallet writes stay disabled (`MAINNET_RELEASE_POLICY.writesAccepted=false`, stage **U0**). Supporting U0/R1/W2 in code is **not** authorization to deploy or move funds.

### Testnet vs mainnet

| Network | chainId | Contract | App writes | Role for judges |
| --- | --- | --- | --- | --- |
| Arc Testnet | `5042002` | `0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30` | Enabled in testnet builds | Historical / optional demo with **test USDC only** — does **not** satisfy mainnet gates |
| Arc Mainnet | `5042` | `{{MAINNET_CONTRACT}}` | Disabled until trusted deployment + release acceptance | Required for eligibility; currently **unavailable** |

Testnet deploy tx (historical): `0x2e43459e213e993b2290749e5549f993d63db1af6e1d8feab2fcca94917db535`. Explorer: https://explorer.testnet.arc.io/

### Judge walkthrough (shortest honest path)

1. Read this table — do not expect a live mainnet App until `{{PUBLIC_APP_URL}}` is filled.
2. Follow [docs/JUDGE_DEMO_GUIDE.md](docs/JUDGE_DEMO_GUIDE.md) §1 (30s, no wallet) and §2 (2–3 min). Sections marked **待真实执行** require owner-signed mainnet actions.
3. Optional testnet wallet flow: JUDGE_DEMO_GUIDE §3 — label test USDC; never claim mainnet acceptance.
4. Do **not** treat offline `SIMULATED_NOT_VERIFIED` exports or fixture manifests as payment evidence.

### What we will not claim

- “Live on Arc mainnet”, “audited”, “zero vulnerabilities”, escrow/refunds, tax invoices, customer revenue, or award probability.
- Filling `{{MAINNET_CONTRACT}}`, `{{PUBLIC_APP_URL}}`, `{{VIDEO_URL}}`, or `{{TX_HASH}}` with projected or testnet values.

## What a verified receipt checks

1. Trusted deployment and reviewed runtime code.
2. Paid invoice state and identity.
3. Exact transaction and `InvoicePaid` event binding.
4. Native USDC payer → contract → merchant transfer legs, at 18 decimals.
5. Finalized and canonical block consistency.

Missing or contradictory evidence stays unverified. RPC checks are not an independent consensus proof. Imported JSON cannot confer verification. Offline JSON/CSV explicitly retain null payment facts, even when the page shows example inputs.

## Run locally (no wallet required for offline demo)

```sh
bun install --frozen-lockfile
bun run check
bun run test
forge test
VITE_ARCPROOF_NETWORK=testnet bun run dev
# Offline path: open #/ → “Try the demo — no wallet” (SIMULATED receipts only)
VITE_ARCPROOF_NETWORK=testnet bun x vite build
VITE_ARCPROOF_NETWORK=mainnet bun x vite build   # builds U0 UI; does not invent a deployment
```

Use the checked-in lockfile. Foundry requires solc 0.8.28, Paris EVM and optimizer 200 as recorded in `foundry.toml`. There is no `bun run build` alias. The scaffold aliases `deploy:self`, `compass:deploy` and `fetch:abi` refer to Studio-environment scripts that are absent from a clean checkout; they are **not supported deployment commands here**. No private key belongs in the app or repository.

## Scope and provenance

Contracts and the initial app originated in Arc Studio, with external review and hardening subsequently synchronized back to the same project. Latest candidate synchronization must be separately verified. Mixed Studio/external workflow eligibility remains unresolved; product documentation is not organizer approval. See [current rules](docs/final-delivery-20261022/RULES_AND_ELIGIBILITY.md).

First-party code and original project documentation in this repository are released under the MIT License. Copyright holder: peterpeter228. See [LICENSE](LICENSE). Solidity sources keep their existing `SPDX-License-Identifier: MIT` headers. A `NOTICE` for Arc, Circle, and Studio brands, plus third-party attribution beyond upstream license files, is still deferred. See [licensing boundary](docs/LICENSING_BOUNDARY.md) and [release license review](docs/final-delivery-20261022/LICENSE_REVIEW.md).

- [中文运行说明](RUN_中文.md)
- [Contract specification](docs/CONTRACT_SPEC.md)
- [Receipt export format](docs/RECEIPT_EXPORT_FORMAT.md)
- [Submission readiness](docs/SUBMISSION_READINESS.md)
- [Candidate freeze procedure](docs/freeze/FREEZE-CANDIDATE.md)
- [Production manifest template](docs/mainnet/PRODUCTION_MANIFEST.README.md)
- [Mainnet three steps](docs/mainnet/MAINNET-THREE-STEPS.md)
- [Dated engineering history](https://github.com/peterpeter228/arcproof/blob/cd579e567457ff8acf0fe041a5cff3df07c344c0/README.md)

Engineering readiness, actual network acceptance, public availability and competition submission are separate milestones. No award probability or payment date is promised.

Next owner gates, in order: Studio final-candidate sync → Arc mainnet deploy (chain `5042`) → public App → real USDC transaction → video. Placeholders above stay literal until that evidence exists.
