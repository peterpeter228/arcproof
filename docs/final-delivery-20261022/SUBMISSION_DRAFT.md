# ArcProof submission draft

Status: **NOT SUBMITTED**. This is a local draft. Do not paste incomplete evidence or conditional claims into a completed submission. [Current rules](RULES_AND_ELIGIBILITY.md) and [unresolved values](submission-state.json) remain authoritative for this draft's limits.

## Product copy

**Name:** ArcProof

**Tagline:** Fixed USDC invoices with receipts anyone can re-verify on Arc.

**Short description:** ArcProof connects a fixed on-chain invoice to a one-time native-USDC payment, then lets anyone check its settlement evidence without connecting a wallet.

**Main description, subject to final candidate verification:**

ArcProof helps a payer, merchant or developer answer a specific question: did this invoice receive the expected USDC payment through the expected contract, with settlement finalized on Arc?

A merchant creates an invoice with a fixed amount and expiry. The payer reviews the terms and pays once. The contract forwards the principal to the merchant within the same transaction and rejects incorrect amounts, expired invoices and repeat payments. It does not retain invoice principal between transactions.

The receipt verifier checks the trusted deployment's code, invoice state, payment transaction and event, both native-USDC transfer legs, and finalized block evidence. A shared receipt can be checked without a wallet. JSON and CSV preserve the distinction between observed data and verified settlement; imported JSON alone never proves a payment.

This is an unaudited prototype with a 1 USDC per-invoice cap and ordinary externally owned wallets as its supported wallet scope. It has no escrow, refunds, platform fees, backend signer or autonomous spending. Accidental pre-existing or forcibly sent balances cannot be recovered by this contract.

## Studio provenance disclosure

The contract and initial app were generated and tested in Arc Studio. Exported code was then independently reviewed and improved using external tools. The exact existing project reference is intentionally omitted from this public draft; the owner must supply it in the submission form after final synchronization.

The historical Stage B synchronization record is separate from this final candidate. Before submission, append the final synchronized source identity, same-project test records and export comparison. Do not say that final synchronization has occurred until those records exist. External review and editing must remain disclosed; no organizer approval of this workflow is currently evidenced. [Stage B record](../DOT_STAGE_B_COMPLETION_20261022.md), [current interpretation](RULES_AND_ELIGIBILITY.md)

## Mainnet paragraph: blocked until genuine evidence exists

Record the live application URL, transaction-initiating application version, contract address, deployment transaction, invoice ID, creation transaction, payment transaction, receipt URL, fresh verification time and video URL in [submission-state.json](submission-state.json).

Only after verification, write one factual paragraph giving the actual amount and links. If controlled by the project's operator, call it an operator-controlled mainnet demonstration, not customer activity or revenue. Distinct addresses alone do not establish independent control. Do not force a legacy `controlled_demo` flag to false to conceal this distinction.

## Why Arc and next step

The project uses Arc's native USDC value path and its published settlement events. Native values use 18 decimals; the ERC-20 representation uses six and must not be double counted. [Arc USDC events](https://docs.arc.io/arc/references/usdc-system-events)

The proposed next step is to make the verifier and documented receipt format easier to integrate into services that need payment confirmation before fulfillment. This is a roadmap, not an implemented SDK or a commitment to autonomous payments.

## Answers not supplied by code

- Public name/alias: confirm the intended public identity; `peterpeter228` is only the repository-profile candidate.
- Prior Circle/Arc funding: owner must answer Yes or No for this project.
- Rights and eligibility: confirm accurately without placing identity documents in the public submission.
- No score forecast, award probability, professional audit claim, customer count or revenue claim is included.

## Final submission acceptance

Check for an existing BUIDL before creating one. Confirm event 2444, recheck deadline and visible required fields, verify each link anonymously, and review the complete text before the authorized submit action. Afterwards retain the BUIDL ID/URL, event association, submitted state, UTC time and field readback. A draft, registration, success toast alone, or completed text worksheet is insufficient.
