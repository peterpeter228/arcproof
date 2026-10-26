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
- Judge-facing `README.md`. Placeholders stay literal: `{{PUBLIC_APP_URL}}`, `{{MAINNET_CONTRACT}}`, `{{TX_HASH}}`, `{{VIDEO_URL}}`.
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
