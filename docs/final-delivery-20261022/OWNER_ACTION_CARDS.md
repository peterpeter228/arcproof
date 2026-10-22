# Proposed owner action cards

These are preparation worksheets, not executable transactions, granted permissions or approved budgets. Finish independent engineering, Studio synchronization, current testnet acceptance and read-only parameter checks first. The final handoff should show concrete values rather than asking the owner to approve blank fields.

Mainnet transactions use real funds and are irreversible. No secret, private key or recovery phrase is needed in this document. A local test result, the 1 USDC per-invoice cap, or the proposed 0.20 USDC example is not spending approval.

## 1. Candidate and public release

| Parameter | Current worksheet value |
| --- | --- |
| Final source commit and source snapshot | `null`; record after the final candidate is frozen |
| Approved compiler / artifact / initcode identity | `null`; final artifact must be independently checked |
| Reference baseline runtime hash | `0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`; not approval of a later artifact |
| Same Studio app | `2dbdda0d-1b70-408b-ae23-cccb8a4b8753` |
| Current candidate Studio sync and tests | `null`; attach final evidence |
| Current two-address Arc testnet acceptance | `null`; attach actual transactions and receipt/export verification |
| Static hosting target | Candidate: existing owner-controlled host, otherwise Render Static Site after connection/free-tier verification |
| Publishable content | Reviewed static `dist` only; source/transaction/video links separately checked |
| Final hosting URL, free-tier terms, release authorization | `null`; creating a site may immediately publish it |
| Owner's license decision | `null`; [MIT scope proposal](LICENSE_REVIEW.md), not a grant |

Before publishing, verify the exact release contents and build network. Do not expose environment files, unreviewed logs, wallet/account secrets or private history. A public repository's existence does not automatically approve a new site, license, video, transaction disclosure or competition submission.

## 2. Wallet roles and bounded proposal

- Chain: Arc mainnet `5042`; primary RPC `https://rpc.mainnet.arc.io`; Explorer `https://explorer.arc.io`. Recheck the actual RPC and wallet chain before signing. [Official network parameters](https://docs.arc.io/arc/references/connect-to-arc)
- Wallet A / deployer and merchant address: `null`.
- Wallet B / payer address: `null`.
- Whether these wallets share an operator: `null`, supplied by the operator rather than inferred from different addresses.
- Proposed invoice principal: **0.20 USDC**, represented as integer native value `200000000000000000`. Not yet approved.
- Proposed lifetime: **24 hours**, with the absolute expiry calculated near creation and checked against the current block. Not yet approved.
- Required actual funding availability, gas estimates and maximum gas budget: `null`. Testnet funds are not mainnet funding. No purchase, bridge or transfer is implied.

## 3. Three distinct operations

| Operation | Immutable intent to verify | Still required |
| --- | --- | --- |
| Deploy contract | Chain 5042; Wallet A; contract creation with `to` omitted; reviewed fixed initcode; `value=0`; no constructor arguments for the current contract | Final initcode/hash, sender, gas estimate/max, owner review and signature |
| Create invoice | Chain 5042; Wallet A; actual verified deployed address; `createInvoice(200000000000000000, expiresAt, zeroTermsHash)`; `value=0` | Actual address, absolute expiry, calldata, gas estimate/max, final agreed amount and signature |
| Pay invoice | Chain 5042; Wallet B; same contract; `payInvoice(actualInvoiceId)`; exact on-chain native value | Actual invoice ID, prepared transaction, fresh invoice state/code checks, gas estimate/max, signature |

The 0.20 value is only a proposed parameter until explicitly accepted. Copy the actual ABI order and complete calldata from the frozen artifact, not this human summary. `zeroTermsHash` means the 32-byte zero value. Each transaction needs its own intent and result record.

Record returned hashes immediately. If a wallet request has an uncertain result or no hash, investigate read-only; do not retry, clear the durable guard, or deploy/pay again to obtain a cleaner record. No independent invoice counter can prove an old wallet request will never broadcast.

## 4. Evidence and final submit handoff

After actual signatures, independently verify deployment runtime, create/pay inputs, receipt status, invoice state, event identity, both native-USDC transfer legs and finalized/canonical blocks. Then verify the public receipt without a wallet, read back exports, record the payment-initiating build and any later showcase changes, and finish the real video.

The final review card must include usable app/receipt/Explorer/video/repository/profile links, the exact intended public name, truthful earlier-funding answer, complete form text, and the unresolved mixed-workflow interpretation. If authenticated history establishes an applicable written-guidance prerequisite, satisfy it before dependent mainnet/submission steps. No such authorization is inferred from the public question.

The final submit action is separate from preparation. After the permitted final action, retain the correct event/BUIDL identity, submitted state and timestamp, and read the fields back. Until then the submission state remains unconfirmed.
