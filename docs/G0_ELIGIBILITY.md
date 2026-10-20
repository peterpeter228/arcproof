# ArcProof G0: program eligibility

Checked: 2026-10-20 UTC. Outcome: **HOLD, not a full G0 pass**. Read-only research only; no account, application, funds, signature, or organizer contact actions.

## Verified program facts

Official round-two entry: [Arc Microgrants: Built with Arc Studio](https://dorahacks.io/hackathon/arc-microgrants-2/detail), organizer Circle. Eight 500-USDC awards; 4,000-USDC pool. Public page includes Submit Build/Register; authenticated submission was not tested. Its relative countdown appears stale, so it does not prove current acceptance.

Listing says November 1, 2026; timeline displays November 2, 04:59 without a timezone in extracted content. Exact deadline timezone remains unverified. Do not borrow round-one October 14 deadline.

Contracts must originate and be tested in Studio; app must be Studio-built, publicly live, and invoke those contracts on Arc mainnet with an actual USDC transaction. Submission needs Studio project URL, app URL, public repository, explorer-linked contract/transaction, build-and-transaction video, description, public builder profile. Excludes outside-Studio/testnet-only builds and already-funded work.

Worldwide participation is subject to sanctions/jurisdiction screening; pseudonyms allowed until private recipient verification. Rights to work required. One submission per project, one award per project; prior-round projects may enter if otherwise eligible. Payout requires an Arc USDC wallet; no equity/IP assignment/exclusivity. Dates/counts may change. Specific verification documents and payout timing are not stated.

## Studio deployment boundary

[Official Studio](https://studio.arc.io/) advertises one-click deployment to nine testnets, including Arc. It explicitly does not deploy, sign, fund, or submit mainnet transactions for users. [Official Arc introduction](https://www.arc.io/blog/introducing-arc-studio-the-onchain-coding-agent) allows exporting code into personal repositories and independently deploying with personal infrastructure, but calls for independent review, testing, validation and a professional audit before mainnet. Therefore Studio provenance and deployment outside Studio are compatible, not contradictory. There is no evidence that importing an independently built implementation retroactively satisfies provenance.

## ArcProof fit: inference, not organizer approval

A fixed-request contract which receives USDC and atomically forwards exactly the requested amount to the merchant plausibly meets the transaction-through-contract criterion. The listing does not explicitly require time-delayed custody/escrow. But it does not expressly bless atomic forwarding, and no organizer clarification was visible at [Q&A](https://dorahacks.io/hackathon/arc-microgrants-2/qa). Do not claim guaranteed eligibility. Receipts alone with a direct wallet transfer would not establish this contract/app requirement.

## Remaining G0 gates and safe next work

1. Verify deadline timezone and current form availability through an official live view, without submitting.
2. Establish the user's private eligibility and payout feasibility without collecting identity documents in this repository.
3. Obtain/verify actual Studio access and project provenance before implementation. Planning/docs can proceed outside Studio; avoid Codex-only funds contracts or app.
4. Resolve whether strict G0 requires explicit organizer confirmation of atomic forwarding; contact only with user authorization.
5. Audit, deployment, gas/funding, production transaction, and submission remain separate authorized milestones, not implied by a GitHub repository request.

## Retrieval limitations

Web open failed on DoraHacks; Exa returned HTTP 405. Parallel Search extracted the official round-two listing and Q&A successfully. Page content is evidence of published rules, not an authenticated submission test. Independent search found a third-party timestamp matching 04:59 UTC, but it is deliberately NOT accepted as official timezone verification.

## Studio access checkpoint

Live browser inspection reported at 2026-10-20 03:09 UTC: Studio is signed out. Its sign-in page has an explicit unchecked Terms/Privacy acceptance gate; email and Google login are disabled before acceptance. No checkbox was accepted and no login started. Public FAQ describes a complimentary daily allowance but does not expose the exact available account quota. Account/quota gate remains blocked. This does not authorize accepting the agreement or starting a login.
