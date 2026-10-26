# Current official rules and unresolved eligibility

Observed on 2026-10-22, with live event/discussion retrieval completed by 16:19:45 UTC. This is an evidence summary, not legal advice or an organizer ruling. The [structured observation](official-rules.json) preserves the exact current custom field labels and machine timestamps without account/session data.

## Correct event and deadline

The target is [Arc Microgrants: Built with Arc Studio, Round 2](https://dorahacks.io/hackathon/arc-microgrants-2/detail), event ID `2444`, slug `arc-microgrants-2`.

- `timelineEnd`: `1793595540`.
- JSON-LD `endDate`: `2026-11-02T04:59:00.000Z`.
- Beijing deadline: **2026-11-02 12:59 (UTC+08:00)**.
- Internal safety target: **before 2026-11-01 07:59 Beijing**. This is not the official deadline.

The page body says November 1. Its rendered timeline uses a client timezone; use the machine timestamp rather than a current daylight-saving offset. The source says dates and award counts can change. Recheck before final submission. [Official event](https://dorahacks.io/hackathon/arc-microgrants-2/detail)

## Requirements versus suggestions

The current round requires Studio-built/tested contracts deployed on Arc mainnet, a public working Studio-built app calling them, and at least one real USDC mainnet transaction through that app and contract. Submit the Studio, app, repository, builder-profile and video links plus contract/transaction evidence. The video must show Studio work and the mainnet transaction. Eight awards are listed at 500 USDC each; rolling review does not guarantee selection or payment timing. [Official event](https://dorahacks.io/hackathon/arc-microgrants-2/detail)

Scoring is 30% mainnet movement, 25% Studio use, 25% working product and 20% potential. One project gets one submission; already Circle/Arc-funded work is excluded. Rights to the work, prior funding and personal screening must be truthfully resolved. Pseudonyms are allowed, with payout verification after conditional selection. No finding here establishes an individual's eligibility. [Official event](https://dorahacks.io/hackathon/arc-microgrants-2/detail)

Two wallets, a 0.20 USDC example, a 60–90 second video and MIT licensing are project proposals, not additional contest requirements.

## Current custom form fields

All eight are `required: true`. Short labels below summarize the exact field text retained in [official-rules.json](official-rules.json).

| ID | Field | Remaining evidence |
| --- | --- | --- |
| 2 | Public name / alias / team | Owner's chosen public identity |
| 5 | Studio project URL | Same project, final source sync and reviewer access |
| 6 | Live app | Anonymous working HTTPS app |
| 7 | Contract and example transaction | Actual mainnet address/hash and Explorer links |
| 8 | Public repository | Correct final source version |
| 9 | Studio and mainnet video | https://youtu.be/fRGUjTdF3nk (YouTube Unlisted) |
| 10 | Product and Studio use | Evidence-matched explanation |
| 11 | Earlier Circle/Arc grant, bounty or prize for this project | Owner-supplied Yes/No |

`mandatoryVideoLink=false` is a global flag; event-specific field 9 is still mandatory. Public builder profile is an additional body requirement. This was anonymous page-data inspection, not an authenticated final-form acceptance test. [Official event](https://dorahacks.io/hackathon/arc-microgrants-2/detail)

## Mixed Studio/external workflow remains unresolved

The existing [workflow question #1562181](https://dorahacks.io/discussion/1562181) belongs to event 2444. Fresh public data shows `commentsCount=0`, `answered=false`, and no organizer reply. It describes Studio generation, external hardening and synchronization back to the same Studio project. Public authorship alone does not establish who authorized or posted it. The question contains a commitment to obtain written guidance before mainnet deployment/submission; determine whether that commitment governs this project from authenticated history, not the public display name.

The [official Studio CLI documentation](https://docs.arc.io/ai/arc-studio-cli) supports external coding-agent use, file round-trips and targeting an existing app with `--app`; `run --app` creates a new conversation while preserving that app's files. It cautions that generated deployment/results text needs independent verification.

The [official Studio introduction](https://www.arc.io/blog/introducing-arc-studio-the-onchain-coding-agent) supports exporting code for review and requires user-operated mainnet review, deployment and operation outside Studio. Studio does not sign, fund or execute mainnet transactions for the user.

Those product capabilities do not decide this contest's interpretation of Studio-built work. Disclose external edits accurately; do not imply synchronization recreates original Studio authorship or that eligibility has been approved. No duplicate question, outreach or submission was performed for this review.
