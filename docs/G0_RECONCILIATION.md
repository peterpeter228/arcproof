# G0 reconciliation against original imported PRD

Reviewed 2026-10-20 03:31 UTC. This is a recommendation, not a gate.json mutation. Original source: docs/source/ArcProof_Dot_Pack_2026-10-20/evidence/gate.json and PRD section 18. The original makes all checks except payout_due_date engineering-blocking when unknown. Do not silently remove those flags.

## Corrections to prior assessment

### atomic_payment_fit_and_ip_terms: recommend PASSED (published-rule fit assessment)

Original asks for atomic-payment fit, Studio requirements, and open-source/reuse terms to be checked against this round's rules. It does NOT require a personal organizer ruling. Published rules require a transaction moving real USDC through contract and app; the ArcProof design receives and atomically forwards the exact amount through its contract. Published examples are starting points, not an exhaustive list or mandatory delayed escrow. Thus design fits the textual requirement. This is not evidence of an implemented transaction, guaranteed acceptance, or award.

Round-two rules require a public repo, not a specified open-source license. Ownership remains with builder, with no equity/IP assignment/exclusivity; builder must own/rightfully submit work. Actual Studio provenance and public/mainnet evidence are later deliverables, not artifacts that must already exist to pass a pre-development requirements check.

Source: https://dorahacks.io/hackathon/arc-microgrants-2/detail

### mainnet_review_or_audit_requirement: recommend PASSED (requirement identified, NOT audit performed)

Original specifically asks whether this round imposes a HARD professional-audit requirement. No such requirement appears in the round-two listing or Studio Terms. Listing asks testing/review and small amounts and discloses organizer submissions are not audited. Studio Terms sections 1.2, 4.1 and 4.2 require independent review, testing, validation and evaluation before deployment/use; they do not say professional audit. The Arc introductory blog says builders should obtain an independent professional audit before mainnet. Preserve that recommendation and residual risk, but do not silently elevate it to a grant admission condition.

Actual review/testing is not complete. Original G3/G4 requirements and financial-action approval remain unchanged. Do not equate LLM review with a professional audit.

Sources: https://studio.arc.io/terms-of-use ; https://www.arc.io/blog/introducing-arc-studio-the-onchain-coding-agent ; round-two listing above.

## Remaining original checks

- full_round_2_rules: PASSED, official complete listing read.
- round_2_studio_provenance_requirements: PASSED, requirement established. No fabrication of actual project URL/build history.
- submission_entry_open: depends on current browser worker evidence. Public active Submit Build and a functioning current entry route establish advertised entry availability; successful final submission is NOT required for G0. If route only reaches a functioning login gate, record that boundary and don't claim authenticated eligibility. Merely seeing a button in stale extraction is insufficient.
- personal_entry_eligibility: PARTIAL/BLOCKED in current schema. Basic entrant facts provided privately resolve identity-category/age/purpose questions. Worldwide + sanctions/jurisdiction caveat does not positively establish applicable country-specific legality/eligibility; login success does not establish award eligibility. Do not ask age/purpose again.
- personal_award_eligibility: BLOCKED. Original explicitly asks personal award/necessary identity-verification conditions. Sponsor publishes conditional private verification but not applicable country/payout clearance or exact requirements. Do NOT demand already completed KYC before selection; instead distinguish eligibility-in-principle from eventual screening outcome. No guarantee of eventual screening is obtainable or necessary. Current gap is applicable conditions/ability to meet them, not absence of a completed screening.
- payout_conditions: PARTIAL/BLOCKED. Currency/network and private recipient verification established. Original additionally requires reward personally receivable; wallet feasibility and applicable country conditions remain unresolved. Exact payout date belongs only to payout_due_date, not this check.
- deadline_time_and_timezone: PARTIAL. Official UI 2026-11-02 13:59 in a verified KST UTC+9 environment and independent extraction04:59 consistently imply 2026-11-02T04:59Z (Shanghai12:59, EST Nov1 23:59). That is a transparent derivation, not a date guessed from prose. For strict original gate, ask browser worker to confirm UI uses browser-local timezone or inspect underlying official datetime/epoch. Once confirmed, record derived UTC plus environment evidence and avoid an invented organizer timezone label. Explicit printed timezone text is not uniquely required if official instant can be independently established.
- studio_account_and_quota: recommend PASSED based on parent live evidence: authenticated usable empty New Project and usage 24h 0%, 30d 0%. Original asks login, available quota and account status, not an exact numerical token ceiling. Record numerical cap as undisclosed; stop at any payment request or quota exhaustion rather than inventing a remaining token count. No funds code was needed for this check.
- dot_runtime_and_wallet_handoff: PARTIAL until actual runtime and a feasible user-controlled signing handoff are checked. A real mainnet signature/transaction is NOT necessary for G0. Do not ask for private keys or make a funded demo merely to check feasibility.
- payout_due_date: BLOCKED for fast_cash only, not engineering. Date is not published; both cash flags stay false.

## Minimal next step

Complete independent read-only technical checks: live entry route, official deadline instant/localization, remaining Studio quota, runtime and prospective wallet handoff. For personal country/award conditions, seek an applicable published official answer if available; do not repeatedly ask the user for ID or facts they already provided. If that evidence cannot be found, report the exact gap and ask whether the user wants to authorize a narrow organizer inquiry, or explicitly change the original engineering gate to permit testnet-only development while eligibility remains unresolved. Neither decision has been authorized by this memo; no contact made. Until remaining original engineering-blocking checks are closed or the user expressly revises the plan, retain G0_HOLD.

## Follow-through checkpoint

A bounded official public Q&A inquiry about applicable participation/payout conditions and deadline, plus prospective wallet type, has been proposed to the user. Permission/details remain pending. No external inquiry has been sent. No project or application code has been generated.
