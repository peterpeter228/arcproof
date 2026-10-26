# Freeze submission candidate

- Package date: 2026-10-26 Asia/Shanghai (CST)
- In-repo procedure adapted from the 2026-10-26 no-sign pack
- Script: `scripts/freeze-candidate.sh`
- Log (written only when the script runs): `evidence/freeze-<YYYYMMDD>-<shortsha>/freeze-log.txt`
- Aligns with `evidence/release-status.json` milestones `C1_freeze`, `C2_public_app`, `C3_submission`

---

## Purpose

Produce an immutable **candidate identity** (git tag + file hashes) that later Studio sync, mainnet deploy, public App, and DoraHacks submission can cite. Freezing is **not** mainnet acceptance, a completed license NOTICE, or contest submission.

The 2026-10-26 owner authorization covers cutting one annotated tag on the Microgrants materials commit. It does not authorize deploy, wallet signing, Studio Publish, or DoraHacks submit.

---

## Suggested git tag naming

| Pattern | Example | Meaning |
| --- | --- | --- |
| `candidate/YYYYMMDD-<shortsha>` | `candidate/20261026-<shortsha>` | Local functional freeze before mainnet |
| `candidate/pre-mainnet-<shortsha>` | `candidate/pre-mainnet-<shortsha>` | Explicit: no mainnet fields filled |
| `submission/YYYYMMDD-<shortsha>` | *(later)* | Only after mainnet evidence + video URL exist |

Annotated tag message should include: baseline commit full SHA, `source_snapshot_sha256` if computed (otherwise `not_recomputed`), network stage (`U0` until deploy), and “no mainnet claim”.

**Do not** retag or force-move a published candidate tag. New evidence → new tag.

Phase baseline for this path: `5ef3a8c75f8a09393783e66694d2c510313bd232`. The tag short SHA is the commit the script actually tags, which includes the license, judge README, and these docs when they are already committed.

---

## Files to snapshot (hash + freeze log)

The script hashes these paths. It does not copy source trees. The hash log is the manifest.

| Path | Why |
| --- | --- |
| `contracts/ArcProofInvoices.sol` | Deployable source |
| `ArcProofInvoices.abi.json` | Root ABI artifact |
| `src/arcproof/arcproofAbi.ts` | Frontend ABI binding |
| `src/arcproof/manifest.ts` | `PRODUCTION_MANIFEST` shape (expect `[]` pre-mainnet) |
| `src/arcproof/networkReleasePolicy.ts` | `writesAccepted` / `activeDeploymentId` |
| `src/arcproof/mainnetSample.ts` | Expect `MAINNET_SAMPLE=null` pre-pay |
| `src/arcproof/testnet.ts` | Known testnet deployment identity |
| `src/arcproof/networkPolicy.ts` / `arcSettlement.ts` | Chain + settlement policy |
| `foundry.toml` / `remappings.txt` / `.foundry-version` | Compiler pin |
| `package.json` / `bun.lock` | JS lock identity |
| `evidence/release-status.json` | Milestone honesty |
| `evidence/deployments.json` | Network deployment registry |
| `docs/final-delivery-20261022/submission-state.json` | Contest worksheet (null mainnet fields) |
| `docs/JUDGE_DEMO_GUIDE.md` / `VIDEO_OUTLINE.md` / `SUBMISSION_DRAFT.md` | Judge-facing narrative freeze |
| `README.md` / `STATUS.md` / `LICENSE` | Public surface and first-party MIT grant |

Also record: `git rev-parse HEAD`, `git status --porcelain` (must be empty for a clean freeze). A historical source-input snapshot hash is not reused unless recomputed for this tree.

---

## What NOT to change after freeze

Until a **new** candidate tag is cut:

1. Contract source / optimizer / solc / EVM version that would change runtime bytecode
2. ABI used by the App for create/pay
3. Settlement policy IDs / emitter / decimals
4. Filling `PRODUCTION_MANIFEST` with anything other than the **actual** post-deploy verified record
5. Flipping `writesAccepted` without matching trusted `activeDeploymentId`
6. Rewriting historical evidence files to invent mainnet txs
7. Quietly amending the tagged commit (`git commit --amend` / force-push of the tagged SHA)
8. Claiming C1_freeze / C2 / C3 complete in `release-status.json` without corresponding evidence

Allowed after freeze without retagging: the freeze hash log itself (it cannot exist inside the commit it describes); owner-signed mainnet txs recorded as **new** evidence files; README placeholder fills that point at those evidence files; video edit that does not fabricate chain facts. If App code that initiates payment changes after the payment, record `payment_initiating_app_commit` vs showcase commit separately (per SUBMISSION_DRAFT).

---

## Procedure

1. Confirm a clean tree on the commit that should be frozen.
2. Local gates are optional and are not implied by the tag.
3. Dry-run, then real:

```sh
./scripts/freeze-candidate.sh
ARCPROOF_FREEZE_EXECUTE=1 ./scripts/freeze-candidate.sh
```

4. Commit the generated `evidence/freeze-…/freeze-log.txt` in a **follow-up** commit. Do not move the tag onto that follow-up commit.
5. Push the branch and the tag without force: `git push origin <branch> <tag>`.
6. Worksheet mainnet fields stay null. `current_candidate.source_commit` may later cite the tagged SHA; that citation is not a mainnet deploy.

---

## Relation to blocked steps

Freeze can happen before Studio final sync / mainnet deploy, but submission materials must state that sync and mainnet evidence remain pending. Prefer freezing the exact tree that will be Studio-synced and mainnet-built so payment-initiating identity matches.

Next gates after this candidate tag:

1. Studio final-candidate sync (and export compare) — `not_run`
2. Arc mainnet deploy (chain `5042`) — not deployed
3. Public App — no URL
4. Real USDC transaction via that App — null
5. Video — no URL
