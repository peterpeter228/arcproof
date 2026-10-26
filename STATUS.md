## 2026-10-26 16:35 Asia/Shanghai public App and mainnet sample recorded

Anonymous GET `200` of https://zippy-narwhal-31f5db.netlify.app on `2026-10-26T08:35:03Z`. It is a Studio→Netlify public App (`data-nf-variant="public"`), not a Studio preview. The served module is Arc Mainnet chain `5042`, contract `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`, deployment id `0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa`, `deployedAt` `2026-10-26T07:44:36Z`.

`MAINNET_SAMPLE` is `{ chainId: 5042, deploymentId, invoiceId: 0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae, txHash: 0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce }`. That pay transaction succeeded on `https://rpc.mainnet.arc.io` in block `27936503` at `2026-10-26T08:28:30Z`. Payer `0x54145b97d5CeCf72b9900C702a02774171574171`. Merchant `0xf22c752EBeB09d3eD8C6b8ba04c7F299D1C9C960`. Amount `0.20` USDC (`200000000000000000`). InvoicePaid log index `6`. Create transaction `0x496b6a29441cd2c7af201c301d3860f34e329fb7d9ab4f7706cab74d7aa22c45` was re-read on the same RPC and matches that invoice. Receipt: https://zippy-narwhal-31f5db.netlify.app/#/receipt/5042/0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa/0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae?tx=0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce

`PRODUCTION_MANIFEST` settlement and contract fields were not changed. `{{VIDEO_URL}}` stays unset. DoraHacks was not submitted. This locator is not an in-app VERIFIED badge, an audit, or customer revenue. Studio Deploy misclick testnet `0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018` is not a mainnet field.

Next gate: video.

Evidence: [public-app-20261026](evidence/public-app-20261026/).

## 2026-10-26 07:50 UTC Arc mainnet U1 recorded (W2 policy, no payment)

Independently read from `https://rpc.mainnet.arc.io` (chain id `5042`):

- Contract `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`
- Creation tx `0x3e94bdb67dcf28a12c224ab693b863220a2744766607136a0d88c7683124d503` (success, `to` null), block `27931307`, timestamp `2026-10-26T07:44:36Z`
- Deployer `0xf22c752EBeB09d3eD8C6b8ba04c7F299D1C9C960`
- Runtime bytecode equals `evidence/g1/ArcProofInvoices.artifact.json` (2296 bytes). keccak256 `0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`
- `deploymentId` `0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa` = `keccak256(abi.encode(uint256(5042), address))`

`PRODUCTION_MANIFEST` has that one record. `settlementPolicy` is `ARC_MAINNET_SETTLEMENT_POLICY`. `MAINNET_RELEASE_POLICY.activeDeploymentId` is that id and `writesAccepted` is true, so a mainnet build is stage **W2**. At this checkpoint `MAINNET_SAMPLE`, `payment_transaction`, the public App URL, and `{{VIDEO_URL}}` were still null. DoraHacks was not submitted. Studio Publish was not done. The public App and sample payment recorded above came later the same day.

Studio Deploy misclick testnet `0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018` is not this mainnet contract and is not written into any mainnet field. Historical testnet `0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30` stays testnet-only. The shared runtime hash is the same bytecode, not a second network.

Next gates: public App → `createInvoice(0.20 USDC)` → `payInvoice` → video.

Evidence: [mainnet-u1-20261026](evidence/mainnet-u1-20261026/).

## 2026-10-26 12:12 Asia/Shanghai Studio final-candidate sync recorded

Studio project `https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753`. Freeze tag `candidate/20261026-1603f9a` points at `1603f9aa077915a1da95daa71fd4a2a0e0ab588a`. Base main is `fdce4a759552b71e141f1b97ea607da63295f374`.

`studio.final_candidate_sync` is `done`. `export_comparison` is `done` for the operator focus compare: same 107, modified 0, only_freeze 0, only_studio 15. Post-sync export zip SHA-256 is `0381f5ff2c706c610808a106f6b7b9de3dfacd3c51d107b7a4b911c7aae6eddd` (5146996 bytes, `oqpnex.zip`). `export_tree_sha256` stays null. This checkout did not have the zip and did not recompute that hash. Studio tests stay operator-reported: bun 559 and forge 73, exit 0. They were not re-run here.

`scripts/buildProvenance.ts` SHA-256 `af241da0bad9d79dc33dfcf8e1780db1eb6fd3b0ca2d8096f778e7b3a7a25e1d` matches GitHub main and the freeze commit. The operator final JSON marks that path absent from the freeze tree and also lists `.oxlintrc.json`, `AGENTS.md`, and `scripts/check.sh` as Studio-only. Those four paths are in the freeze commit and match main. Eleven other listed paths, including `src/console-capture.ts` and `src/tracing.ts`, are absent from both the freeze commit and main.

A Studio preview opened on the testnet overview with no wallet. That is not a public App URL. Deploy and Publish were not done. DoraHacks was not submitted. Mainnet stage remains U0. Writes stay disabled. Contract, deployment transaction, payment transaction, public app URL, and video URL stay null.

Next: Arc mainnet deploy 5042 (owner-signed) → public App → real USDC → video.

Evidence: [studio-sync-20261026](evidence/studio-sync-20261026/).

## 2026-10-26 03:46 UTC Microgrants 最短路径（候选冻结，不是主网验收）

Owner authorized the shortest Arc Microgrants path from baseline `5ef3a8c75f8a09393783e66694d2c510313bd232` (current `main` at the start of this change).

Recorded in this change:

- Root MIT `LICENSE`. Copyright line is `Copyright (c) 2026 peterpeter228`. Solidity `SPDX-License-Identifier: MIT` is unchanged. `NOTICE` for Studio / Arc / Circle brands is still deferred.
- Judge-facing `README.md`. At this checkpoint the public App URL, `{{MAINNET_CONTRACT}}`, `{{TX_HASH}}`, and `{{VIDEO_URL}}` stayed literal.
- Candidate freeze procedure: `scripts/freeze-candidate.sh`, `docs/freeze/FREEZE-CANDIDATE.md`. The annotated tag is cut on the commit that contains these materials. The hash log is a follow-up evidence file and does not move the tag.
- Docs only: `docs/mainnet/PRODUCTION_MANIFEST.template.json`, `PRODUCTION_MANIFEST.README.md`, `MAINNET-THREE-STEPS.md`. Runtime `PRODUCTION_MANIFEST` stays `[]`.

Next gates, in order. None of these are done:

1. Studio final-candidate sync and export compare — `not_run`
2. Arc mainnet deploy (chain `5042`) — contract and deployment tx remain null
3. Public App — no URL
4. Real USDC transaction through that App — `payment_transaction` null
5. Walkthrough video — no URL

Mainnet stage remains **U0**. `writesAccepted` remains false. This change does not deploy, sign a wallet, Studio Publish, or submit to DoraHacks. Historical testnet identity is not mainnet evidence.

## 2026-10-22 16:39 UTC 最终交接本地候选（尚未发布、未达 C1 冻结）

基于 main `cd579e567457ff8acf0fe041a5cff3df07c344c0` 完成网络上下文、模拟导出、来源范围、只读重试和已知哈希持久化失败修复。当前本地源码快照 `54f45d85f8453dee7c7af415647f74a00d2bdd9daaab5729ff1f46a1c68e6e43`（148 个声明输入）；候选提交仍为 null，不用基线冒充新提交。

559 项 Vitest、73 项 Forge、lint/typecheck、双网络构建通过；两个构建各 84 个输出逐一回读无差异。真实浏览器完成模拟 JSON/CSV 下载、剪贴板/完整文本一致性、375/768/1440 iframe 布局、非法输入及主网 U0 禁用路径。响应式 iframe 不是手机设备验收，R1/W2 与钱包故障是合成测试，不是真实主网/双钱包验收。

本轮依赖审计仍有与基线相同的 5 个包公告，已逐项核对；未发现本候选新增的依赖变更或已证明的严重运行时利用路径，但不宣称安全问题清零。当前 Argon 调用没有可验证的返回结果，未当作审查完成。Studio 最终同步/回导、双钱包测试网、资格澄清、许可证决定、真实主网支付、公开应用与视频、最终提交仍未完成。已获新公开审查分支写入授权，合并与自动部署不在范围；主网清单为空，写入关闭。

详见 [最终交接报告](docs/final-delivery-20261022/ENGINEERING_REPORT.md)、[机器状态](evidence/release-status.json) 和 [本轮证据](evidence/final-handoff-20261022/)。以下为历史记录。

历史状态保留在 [基线 STATUS](https://github.com/peterpeter228/arcproof/blob/cd579e567457ff8acf0fe041a5cff3df07c344c0/STATUS.md)，本文件不重刊原始项目访问链接或对话内容。
