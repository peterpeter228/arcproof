# 给 dot 的委托：ArcProof 独立复审 + 主网上线与参赛提交协助

> 使用方法：把本文件和私有仓库访问权限交给 dot，并说：“按此文件先复审、再协助我上线和提交。凡是需要签名、花钱、公开或提交的动作，都先停下来问我。”
> 编制：2026-10-22 UTC，由上一轮 Claude Code 执行者编写。文中所有数字都是**待你复核的线索**，不是结论。

## 0. 你的角色与边界

你是独立复审人兼上线副驾。目标有两个：

1. 独立确认分支 `final-review-20261022` 能否合并进 `main`。
2. 协助我（仓库所有者）把 ArcProof 真实上线到 Arc Mainnet，并满足 Arc Microgrants Round 2 的提交要求。

**你不得自行执行以下动作**：签名、转账、部署、充值、改动仓库可见性、公开发布、提交参赛表单、对外发消息、接受条款或 KYC。对每一个这样的动作，你都要给我：

- 具体目标；
- 准确的命令或点击路径；
- 涉及的数据和金额；
- 风险；
- 执行后怎样只读核对。

然后**等我明确说“执行”**，再进入下一步。私钥、助记词、cookie、API key 不得出现在对话、代码、截图或日志里。

不要承诺获奖、奖金、付款时间或“零漏洞”。模型意见（包括你的）不是审计。

## 1. 先核对，不要相信本文的数字

仓库 `https://github.com/peterpeter228/arcproof`（私有）：

- 分支 `final-review-20261022`，基于 `main@8f748d3`。
- 本轮提交：`49253ea`（修复）、`faed3c4`（界面）、`7c1f0e5`（文档与证据），以及其后的 QA 脚本与本文件提交。以 `git log` 为准。
- 声称的结果：
  - 485 项 vitest 测试、31 个文件、`bun run check`、testnet/mainnet 两种构建通过；
  - 4 种非法网络参数被拒绝；
  - 沙箱 Chrome 浏览器验收 23/23 通过；
  - 源码快照 `b3bf6b038298d53619329600a084986de9e5eb386c48802513c8ff557ecd8a67`（92 个输入）；
  - 合约 `contracts/ArcProofInvoices.sol` sha256 `8699071d250c834cd1166ece0d4001b7de95af7562796e19305ce2812635e25b`，自 G1 起未改动；
  - 本轮没有运行 Forge。
- 先读：
  - `docs/FINAL_REVIEW_AND_IMPROVEMENT_REPORT.md`
  - `docs/SUBMISSION_READINESS.md`
  - `docs/JUDGE_DEMO_GUIDE.md`
  - `evidence/final-review/final-review-20261022T022241Z/REPORT.json`
  - `AGENTS.md`
  - `docs/CONTRACT_SPEC.md`

官方规则：`https://dorahacks.io/hackathon/arc-microgrants-2/detail`。上一轮在 2026-10-22 02:27 UTC 读取，时间轴（UTC）截止为 `2026/11/02 04:59`，正文写 “November 1, 2026”。**每次做不可逆动作前都要重新读取**，记录读取时间、URL、原文短锚点和与上次的差异。普通用户在 Q&A 里的回复不算组织方裁决。

链参数以 `https://docs.arc.io` 为准，并与 `src/arcproof/networkPolicy.ts` 对照：Mainnet `5042`、`https://rpc.mainnet.arc.io`、`https://explorer.arc.io`。原生 USDC 为 18 位小数，ERC-20 接口为 6 位，绝不能混算。

## 2. 阶段 A：独立复审（只读，先做）

从原始材料出发，不要只读报告：

1. `git diff 8f748d3..origin/final-review-20261022 -- src contracts index.html tailwind.config.js vite.config.ts`：逐个文件阅读。
2. 在干净环境中复现：
   - `bun install --frozen-lockfile --ignore-scripts`
   - `bun run check`
   - `bun x vitest run`
   - `VITE_ARCPROOF_NETWORK=testnet bun x vite build`
   - `VITE_ARCPROOF_NETWORK=mainnet bun x vite build`
   - 用空字符串、`devnet` 等非法值构建，应当失败。

   记录退出码、计数和耗时。如果你无法运行命令，就标 NOT_RUN，不要沿用报告里的数字。
3. 重点检查：
   - FR-01…FR-07 每项修复是否真的修了，回归测试在撤掉修复后是否会失败。
   - 主网构建是否仍然完全不能写入：`PRODUCTION_MANIFEST` 为空、`writesEnabled=false`、不发现钱包、不自动重连、不读写测试网请求记录。
   - 新首页 `HomeScreen.tsx` 上每一句关于“已验证”的说法，是否都能在 `receiptVerifier.ts` 中找到对应检查。有任何夸大，就列为缺陷。
   - 离线演示是否始终标为 SIMULATED / NOT VERIFIED；付款字段是否为空；有没有编造交易哈希、金额、客户或时间。
   - 导出：不可信部署不得导出“已验证”证据；CSV 是否有公式注入。
   - 有没有为了让测试通过而删除或弱化断言。
4. 输出：发现列表（文件:行、复现步骤、影响、修复建议，严重度以能否复现为准），以及“合并 / 不合并”的结论和理由。如需改代码，请在独立分支上做小改动并附测试，不要强推，不要直接改 `main`。

## 3. 阶段 B：合并与 Studio 同步（需要我批准）

1. 经我批准后，通过 PR 把分支合入 `main`。不要 force push，也不要自动合并。
2. Studio 起源是硬门槛，也是资格风险：合约和最初的应用由 Arc Studio 生成并测试，之后在外部审查和修改，再同步回同一个 Studio 项目 `https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753`。官方写明 “projects built outside Arc Studio” 不合格，但没有说明这种混合流程是否可以。请：
   - 重新判断风险；
   - 帮我决定是否用 `docs/SUBMISSION_READINESS.md` §4 的草稿向组织方询问（由我发出）；
   - 不得建议重建一个“看起来来自 Studio”的假项目，也不得伪造生成历史。
3. 同步清单见最终报告附录：改 21 个文件、增 5 个文件，逐文件哈希在 `evidence/final-review/.../build/source-snapshot.json`。步骤：
   1. 先导出 Studio 备份；
   2. 只对白名单路径应用改动，不覆盖 `.env` 和 Studio 独有文件；
   3. 在 Studio 中运行测试，**并运行 Forge 合约测试**；
   4. 普通刷新后重新下载代码，逐文件比对哈希。

   分别报告三件事是否成立：文件一致、预览一致、整个工作区一致。不使用 Studio AI 的部署或发布功能来完成同步。

## 4. 阶段 C：主网上线计划（逐步停下等我确认）

先给我一张 **go/no-go 表**，列出前提、证据和停止条件：

- 规则已重读，且截止时间还来得及；
- 我已自查个人资格、制裁筛查和过往 Circle/Arc 资助；
- Studio 已同步，Forge 和 vitest 测试都通过；
- 预算已定（gas 加测试付款；单张发票上限 1 USDC，建议 0.20 USDC）；
- 准备了三个角色的普通 EOA：部署者、商户、付款方。付款方必须和商户不同，否则只能算 `controlled_demo`。

然后按顺序进行：

1. **部署**：确认当前 Studio 是否支持主网部署，以及部署由谁签名。`AGENTS.md` 记录 Studio 只自动部署测试网，请核实现状。你给出部署方式和参数，由我在可信钱包中签名。合约没有 constructor 参数和 immutable，因此链上运行时代码的 keccak256 应当等于已审查产物的 `0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`。请用 `cast code <addr> --rpc-url https://rpc.mainnet.arc.io | cast keccak` 或等价的只读方法核对；不一致就停止。
2. **应用改造（代码工作，需要测试）**：现在的在线页面（`TestnetScreens.tsx`、`useTestnetWallet.ts`、`Layout.tsx` 中的已保存请求等）硬编码为测试网常量，主网启用**不能只往清单里填一行**。要求：
   - 让这些页面由 `BUILD_NETWORK` 上下文驱动，测试网行为保持不变；
   - 在 `PRODUCTION_MANIFEST` 中加入真实部署：`deploymentId = keccak256(abi.encode(uint256(5042), address))`，地址、运行时哈希和 `deployedAt` 都来自链上核对；`settlementPolicy = ARC_MAINNET_SETTLEMENT_POLICY`；
   - 主网 `writesEnabled` 只在上述核对完成后开启；
   - 核实主网原生 USDC 转账事件的发射地址和最终性（当前策略沿用 `0xff…fe` 和 RPC finalized 标签），依据是官方文档加一笔真实交易的日志；
   - 币种文案、explorer 链接、下载文件名、分享链接都要按主网来；
   - 补充测试：主网清单身份、写入门禁、文案、导出 `mode=mainnet` 只在 VERIFIED 时出现。全量测试和两种构建都必须通过。
   - **改造完成后必须重新同步 Studio**：按阶段 B 的步骤，把这个最终快照（包含主网清单和改造）同步到同一个 Studio 项目，在 Studio 中重跑 vitest 和 Forge，重新下载并逐文件核对哈希。阶段 B 的同步结果只代表改造前的版本，不能用来验收最终版本。记下最终快照的 `sourceSnapshotSha256` 和 Git 提交 SHA。
3. **真实交易**：在主网构建的应用里，由商户钱包创建一张小额发票，再由另一个付款钱包通过应用付款。之后在应用中核验，收据必须显示 VERIFIED（两段原生转账加最终块）。在 explorer.arc.io 打开同一笔交易，金额、合约和商户必须一致。任何一项不一致都不能对外宣称完成。
4. **公开**：
   - 先确定许可证，排除品牌素材，并审查要公开的内容：去掉内部授权文本、原始资料包，不放秘密；
   - 公开托管的应用必须由上一步记录的最终快照构建。上线后读取公网的 `/build-provenance.json`，其中 `networkKey=mainnet`，`sourceSnapshotSha256` 必须等于记录值。真实交易、视频和公开仓库都必须对应同一版本；如果之后又改了代码，就要重新同步、重新构建、重新核对。
   - 再决定把仓库改为公开还是另建公开仓库；
   - 托管公开应用后，用无痕窗口验证主网身份和只读核验；
   - 阅读 DoraHacks、Studio、Circle 开发者条款中关于内容许可的部分。
5. **材料**：
   - 视频必须真实展示 Studio 构建和这笔主网交易，可参考 `docs/JUDGE_DEMO_GUIDE.md`，但不得用测试网或模拟画面冒充；
   - 简介草稿在就绪表 §6，必须如实写出混合工具链；
   - 公开 builder profile；
   - 准备好合约地址、交易哈希和 explorer 链接。
6. **提交**：由我本人在 DoraHacks 页面提交。你只做提交前清单核对，把每一项对照原文锚点。

## 5. 停止条件

出现以下任何情况都要停下来报告，不要绕过：

- 规则变化，或资格明显不符；
- 链上运行时哈希与审查产物不一致；
- 测试失败；
- 应用核验不是 VERIFIED；
- 需要购买付费服务或扩大权限；
- Studio 会隐式部署或公开；
- 发现资金风险。

## 6. 你每次回复的格式

- **Verified**：每项都附证据（命令输出、文件路径、链上或页面链接、读取时间）。
- **Inferred**：原因推断、时间关联、“全部 / 完成”之类的范围词、近似值。
- 本步需要我做的**唯一一个动作**：给出命令或点击路径、金额、风险和只读回查方法。
- 状态只用 `PASS / FAIL / BLOCKED / NOT_RUN`。地址、哈希、URL 没有真实值时写 null，不能编造。
- 最后的外部验收标准是：
  1. **最终版本**（含主网改造）已同步到 Studio，测试通过，重新下载的代码哈希一致；公网应用的 `build-provenance.json` 快照与之相同，公开仓库对应同一个 Git SHA；
  2. 链上运行时 keccak 与 `0xa36ede95…344c` 一致；
  3. 第二个钱包付款后，应用得到 VERIFIED，且与 explorer 显示的是同一笔交易；
  4. 公网应用和公开仓库能在无痕窗口打开；
  5. 提交表单受理的截图。

  五项全部满足才算完成；任何一项缺失，都要标出缺哪一项，不得写“已完成”。
