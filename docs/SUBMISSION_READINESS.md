# ArcProof 参赛材料就绪表

核对时间：2026-10-22 02:27 UTC 重新读取官方详情页（提取 ID `extract_4b7e63fe57952242b12dc59776e5e7bb`，原文锚点存于 `evidence/final-review/<run>/official-rules/round2-detail-extraction.json`）。
对应代码：分支 `final-review-20261022`（基于 `8f748d3`）。最终提交 SHA 见 `docs/FINAL_REVIEW_AND_IMPROVEMENT_REPORT.md`。

> 结论先行：**目前不满足参赛硬门槛。** 官方要求提交时合约已部署到 Arc Mainnet、应用公开上线，且至少有一笔真实 USDC 交易经过合约和应用。这三项都不存在，而且每一项都需要用户本人另行批准和签名。本表不授权、也不代办任何部署、签名、公开或提交。

## 1. 官方规则快照（只记原文含义，不代表我们的得分）

| 规则 | 原文锚点（短） | 对 ArcProof 的含义 |
|---|---|---|
| 评分权重 | “Real USDC moving on Arc mainnet … (30%)”“Use of Arc Studio across the build … (25%)”“A working product (25%)”“Potential to go further (20%)” | 官方评审权重，不是分数或胜率 |
| 交付物 | “Smart contracts written and tested in Arc Studio and deployed to Arc mainnet”“A working app built in Arc Studio … live at a public link”“At least one Arc mainnet transaction that moves USDC through your contract and app” | 私有构建、测试网、模拟都不能代替 |
| 不合格 | “projects built outside Arc Studio, testnet-only builds, design mockups, slide decks, and work already funded by a Circle or Arc program” | 混合工具链是否算 “built in Arc Studio” 需要组织方解释，见 §4 |
| 截止 | 时间轴（标注 UTC）“Deadline 2026/11/02 04:59”；正文 “Submissions close November 1, 2026” | 两者冲突，原样保留。UTC 截止换算北京时间为 2026-11-02 12:59。正文还写 “Earlier submissions get earlier answers”。提交前必须重查 |
| 奖励 | “Eight microgrants of $500 USDC each, from a $4,000 USDC pool” | 不保证；付款日期未公布 |
| 打磨 | “Experiments are welcome, and polish is optional.” | UI 改进服务于可理解性和“可工作的产品”，不能替代主网证据 |
| 资格 | 全球开放，受制裁和限制地区筛查；可匿名，入选后才私下验证；“The work must be yours, or you must have the right to submit it.”；“You keep full ownership … No equity, no IP assignment, no exclusivity.” | 个人资格、筛查结果均为 UNKNOWN，不做推测 |

链参数（2026-10-22 从 docs.arc.io 检索结果核对）：Arc Mainnet chain ID `5042`，RPC `https://rpc.mainnet.arc.io`，浏览器 `https://explorer.arc.io`；Testnet `5042002`。与代码中 `src/arcproof/networkPolicy.ts`、`src/arcproof/testnet.ts` 一致。原生 USDC 为 18 位小数，ERC-20 接口为 6 位。

## 2. 要求 → 当前证据 → 缺口 → 修复/待批准动作 → 验收方法

| # | 要求 | 当前证据 | 缺口 | 可执行修复 / 待批准动作 | 验收方法 | 状态 | 责任人 |
|---|---|---|---|---|---|---|---|
| R1 | 合约在 Studio 中编写并测试 | G1：Studio 导出的合约和 69 项 Forge 测试，另有 4 项补充测试，共 73 项历史通过（`evidence/g1`）；Studio 项目 `https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753` | 本轮没有 Foundry，未重跑合约测试；合约源码自 G1 以来未改动 | 用户在 Studio 中重跑合约测试并截图/录屏 | Studio 测试输出与 `contracts/` 哈希一致 | PARTIAL（历史证据） | 用户 |
| R2 | 应用在 Studio 中构建 | Studio 原始脚手架和生成来源已保留；后续修改在 Ubuntu 上完成，并按白名单同步回 Studio（2026-10-21：87 个白名单输入哈希一致） | 本轮 UI 和修复产生了新快照，旧同步证据只代表旧版本 | 用户批准后，按 §5 清单把新快照同步到**既有** Studio 项目并回读 | 重新下载代码，白名单输入哈希与本地快照一致 | NOT DONE（本轮未同步） | 用户批准；同步可由代理在授权会话内执行 |
| R3 | 合约部署到 Arc Mainnet | 无。`PRODUCTION_MANIFEST` 为空，主网构建中所有写操作关闭 | 需要真实部署 | 单独的主网阶段：重查规则和资格 → 确认预算/金额/收款方 → 用户在可信钱包中亲自签名部署 → 只读核对运行时代码哈希 → 写入可信清单 → 全量重测 | explorer.arc.io 上的合约地址；运行时 keccak256 与审查产物一致 | NOT DONE | 用户签名 |
| R4 | 应用公开上线并调用合约 | 只有 localhost 和私有 Studio 预览 | 需要公开托管 | 主网清单写入后，用户批准公开发布（Studio 发布或其它托管） | 公网 URL 打开后显示主网清单身份，并通过只读核验 | NOT DONE | 用户批准 |
| R5 | 至少一笔真实 USDC 主网交易经过合约和应用 | 无。只有历史测试网同钱包自付（`controlled_demo`）和离线模拟 | 需要真实交易，最好用两个钱包 | 用户用小额（≤1 USDC 上限）在应用中创建并支付发票；ArcProof 收据显示 VERIFIED | explorer 交易链接；应用收据 VERIFIED；导出 JSON 中 `mode=mainnet` | NOT DONE | 用户签名 |
| R6 | 公开仓库 | 私有仓库 `peterpeter228/arcproof` | 需要公开，并先确定许可证 | 先做 §3 的许可和内容审查，再由用户决定是否改为公开或另建公开仓库 | 匿名访问可读；不含 `.env`、密钥或私人资料 | NOT DONE | 用户 |
| R7 | 视频：展示 Studio 构建和主网交易 | 无 | 依赖 R3–R5 | 按 `docs/JUDGE_DEMO_GUIDE.md` 录制；主网镜头必须是真实操作 | 视频中的交易哈希与 explorer 一致 | NOT DONE | 用户 |
| R8 | 简介：做什么、怎样用 Studio | 产品故事已在首页和演示指南中写定 | 需要如实写出混合工具链 | 见 §6 草稿 | 与仓库实际历史一致 | DRAFT | 用户确认 |
| R9 | 公开 builder profile（GitHub/X/Farcaster） | UNKNOWN | — | 用户提供 | 链接可公开访问 | UNKNOWN | 用户 |
| R10 | 作品权利 / 未获 Circle·Arc 资助 | 未发现资助记录；许可边界见 `docs/LICENSING_BOUNDARY.md` | 用户确认；平台内容许可另需阅读 | 用户确认资助史；阅读 DoraHacks、Studio、Circle 开发者条款 | 书面确认 | UNKNOWN | 用户 |
| R11 | 个人资格、制裁筛查 | UNKNOWN | 不推测国籍或居住地 | 用户自行判断；入选后由组织方私下验证 | — | UNKNOWN | 用户 |
| R12 | 可工作的产品 | 本轮：485 项本地测试、lint、类型检查、两种网络构建、真实 Chrome（沙箱开启）在 375/768/1440 下的浏览器检查 | 没有真实钱包 / 主网验收 | 主网阶段完成后补充两钱包实测 | `docs/FINAL_REVIEW_AND_IMPROVEMENT_REPORT.md` 的测试矩阵 | PARTIAL | — |

## 3. 公开前必须先完成的许可与内容审查

- 仓库目前没有根目录 LICENSE。用户需要决定许可范围，并排除 Studio/Circle/Arc 的品牌素材（`docs/LICENSING_BOUNDARY.md`）。
- 公开前删除或确认的内容：`docs/source` 原始资料包、`evidence/` 中的截图和日志（已脱敏，但仍需逐项确认）、Argon 审查原文、内部授权说明。
- 已知依赖安全公告（5 条记录）和较大的钱包依赖包仍需在公开说明中披露，不能写成“无漏洞”。
- DoraHacks 条款对平台上发布的内容有宽泛许可（历史提取记录见 `evidence/independent-audit-response-20261021/official-rules/`）。“You keep full ownership” 不等于平台没有使用许可。

## 4. Studio 起源：如实说明，不重建假项目

事实链：合约和 69 项测试最初由 Arc Studio 生成并在 Studio 中测试 → 导出后在外部做独立审查、补充测试和前端加固（Claude Code / 其它模型辅助）→ 按路径白名单和旧文件哈希把修改同步回**同一个** Studio 项目 → 重新下载回读核对（这一步最近一次完成于 2026-10-21，对应快照 `8df6b66d…1432`；本轮 2026-10-22 的修改尚未同步）。Studio 中保留了独有的生成文件，所以不能声称整个工作区逐字相同；预览的 source/base commit 显示 Unknown。

风险：官方把 “projects built outside Arc Studio” 列为不合格，但没有说明“在 Studio 中开始、外部审查修改后同步回 Studio”算不算。公开 Q&A 中有一条非组织方的回复说不能混用 VS Code，不能当作组织方裁决。**此项为 资格待确认。**

可由用户自行发出的询问草稿（代理不会代发）：

> Hi Arc team — our project's contracts and initial app were generated and tested in Arc Studio (project URL provided). We then reviewed and hardened the code with external tools and synced those changes back into the same Studio project, where the app's tests were re-run (most recently for our 2026-10-21 snapshot; later changes are still to be synced). Does this mixed workflow meet "built in Arc Studio" for Microgrants Round 2, provided the Studio project URL, tests and the mainnet transaction are all from that same project?

（发出前须核对：届时最新快照是否已同步回读并在 Studio 中重跑测试；若没有，删掉相应说法。）

## 5. Studio 同步清单（本轮新快照，待批准后执行）

- 旧快照（2026-10-21 已同步并回读）：`8df6b66d77c12e99b268a19c0ed6f88f33336b24c177fb0fdda88834ba631432`。
- 新快照：见最终报告与 `evidence/final-review/<run>/source-snapshot.json`。
- 白名单：`scripts/buildProvenance.ts` 声明的源码输入（`src/**`、`index.html`、`tailwind.config.js`、`vite.config.ts` 等）。本轮变化文件列在最终报告中。
- 排除：`.env*`、`node_modules`、`dist`、`evidence/`、`docs/`、Studio 独有文件、任何凭据。
- 步骤：导出当前 Studio 代码备份 → 比对旧哈希 → 只对白名单路径应用补丁 → 在 Studio 中运行测试和类型检查 → 普通刷新 → 重新下载并逐文件比对哈希 → 记录“文件一致 / 预览一致 / 工作区一致”分别是否成立。
- 不使用 Studio AI 生成、部署或发布功能来完成同步；不复制 cookie 或会话令牌。

## 6. 简介草稿（英文，待用户确认，不代表已提交）

> ArcProof turns a USDC payment request into a fixed on-chain invoice on Arc. The payer pays it exactly once; the contract forwards the USDC to the merchant in the same transaction and does not retain invoice principal; any pre-existing or forcibly sent balance remains locked and cannot be recovered. Anyone with the receipt link can re-check the payment against Arc chain data — contract code, invoice state, the InvoicePaid event, both native USDC transfer legs and finality — instead of trusting a screenshot. Contracts and the initial app were generated and tested in Arc Studio; we then reviewed and hardened them with external tools and synced the changes back into the same Studio project. Prototype, not audited; invoices are capped at 1 USDC.

（使用前须满足：最新快照已同步回 Studio 并回读一致，否则“synced the changes back”这句不成立，必须改写。只有当 R3–R5 真实完成后，才能加上主网合约地址和交易链接。当前状态：本轮修改**尚未**同步。）

## 7. 获奖与付款仍未知

是否入选、批次时间、付款时间、验证所需材料、名额是否调整都未知。`cash_fast_pass=false`。
