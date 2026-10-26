# Studio sync evidence — 2026-10-26

Operator record time: `2026-10-26T12:12:32+08:00`.

Studio project: `https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753`

Freeze tag `candidate/20261026-1603f9a` → `1603f9aa077915a1da95daa71fd4a2a0e0ab588a`.

Main merge this record is based on: `fdce4a759552b71e141f1b97ea607da63295f374`.

`studio.final_candidate_sync` is `done`. `export_comparison` is `done`. Deploy and Studio Publish were not done. DoraHacks was not submitted. Mainnet stage remains U0. No mainnet contract, deployment transaction, public App URL, payment transaction, or video URL is claimed. A Studio preview of the testnet overview with no wallet is not a public App URL.

## Files

| File | What it is |
| --- | --- |
| `studio-sync-evidence-interim.json` | Operator interim upload, copied verbatim. Pre-sync zip, upload delta, and the in-progress post-sync export. |
| `studio-sync-evidence-final.json` | Operator final upload, copied verbatim. Post-sync zip hash and focus counts. |
| `checkout-git-check.json` | Hashes this checkout computed with `git show <rev>:<path>` against the freeze commit and main. |

The zip files named in the operator JSON are not in this checkout. Their SHA-256 values were not recomputed here.

## Hashes recorded from the operator JSON

| Field | Value |
| --- | --- |
| `pre_sync_export_zip` sha256 | `e395ec713ebe711c3a799f74f0ab7396c133bf6cbeb8c08b0e36c2440d6ef597` (5071360 bytes) |
| pre-sync vs freeze (superseded) | same 65, modified 28, only_freeze 14, only_studio 15 |
| `upload_delta_zip` sha256 | `36b746a494bdda70b28b01703d7f74ab0c58001d031d95c3cb64954db8f1cfd6` (42 files) |
| `buildProvenance_fix_zip` sha256 | `dfc1dcc15277d02f68299750c13811c174ed54aad74e6372eb3dd78c26fc15ee` |
| `post_sync_export_zip` sha256 | `0381f5ff2c706c610808a106f6b7b9de3dfacd3c51d107b7a4b911c7aae6eddd` (5146996 bytes, `oqpnex.zip`) |
| `export_tree_sha256` | null. No git tree hash was supplied. |
| `scripts/buildProvenance.ts` sha256 | `af241da0bad9d79dc33dfcf8e1780db1eb6fd3b0ca2d8096f778e7b3a7a25e1d` |

Operator focus compare versus the freeze tag: same 107, modified 0, only_freeze 0, only_studio 15 (`studio_focus` 122, `freeze_focus` 107).

## Checkout correction

The operator final JSON sets `scripts/buildProvenance.ts` `in_freeze` to false and lists these paths as Studio-only:

- `.oxlintrc.json`
- `AGENTS.md`
- `scripts/buildProvenance.ts`
- `scripts/check.sh`

This checkout found all four in freeze commit `1603f9aa077915a1da95daa71fd4a2a0e0ab588a` and on main `fdce4a759552b71e141f1b97ea607da63295f374`, with matching SHA-256. `scripts/buildProvenance.ts` is `af241da0bad9d79dc33dfcf8e1780db1eb6fd3b0ca2d8096f778e7b3a7a25e1d` in both. The verbatim operator JSON is unchanged. `evidence/release-status.json` does not repeat `in_freeze: false` as fact.

These eleven operator-listed paths are absent from both the freeze commit and main:

- `contracts/contract-metadata/.gitkeep`
- `contracts/script/Create2Factory.sol`
- `contracts/script/DeployCreate2.s.sol`
- `contracts/test-integration/.gitkeep`
- `contracts/test/.gitkeep`
- `scripts/compass-deploy-helpers.ts`
- `scripts/compass-deploy.ts`
- `scripts/fetch-abi.ts`
- `scripts/self-deploy.ts`
- `src/console-capture.ts`
- `src/tracing.ts`

`src/console-capture.ts` and `src/tracing.ts` are among the paths kept only in the Studio project.

## Tests

Operator-reported, not re-run in this checkout: `bun test` 559 and `forge test` 73, exit 0. `studio_vitest` and `studio_forge` are `operator_reported_not_reverified_here`.

## Still not done

Next gates: Arc mainnet deploy 5042 (owner-signed) → public App → real USDC → video.

No follow-up is required to fill `post_sync_export_sha256`. It is the value above. A later commit would be needed only if a new export zip replaces `oqpnex.zip`, or if someone recomputes the zip hash and it differs. That commit must keep mainnet fields null until an owner-signed deploy actually exists.
