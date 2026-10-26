# ArcProof 评委演示指南

编制：2026-10-22 UTC，对应分支 `final-review-20261022`。
用途：给评委或录制视频的人一条最短、诚实的理解路径。这里写的每个镜头，都标明了它现在是真实可演示、仅为模拟，还是待人工执行。

> 边界：Arc Mainnet 合约和一笔 0.20 USDC 样本付款已经记录。公开 App 是 https://zippy-narwhal-31f5db.netlify.app 。本指南不提供、也不允许伪造录像、客户、收入或到账时间。下面仍标为 **待真实执行** 的镜头，是还没有录下来的画面，不能用测试网或模拟画面代替。

## 1. 30 秒理解路径（无需钱包）

| 秒 | 评委看到什么 | 说明要点 | 状态 |
|---|---|---|---|
| 0–5 | 打开 https://zippy-narwhal-31f5db.netlify.app 的 `#/`。首屏是 **Overview**：标题 “Get paid in USDC. Let anyone verify it from one link.”，顶部网络条，右侧 “What this build can do” 状态卡 | 这是 Arc Mainnet（5042）公开 App，可信部署日期 2026-10-26；未审计 | 真实可演示 |
| 5–15 | 点主按钮 **Try the demo — no wallet**，进入离线演示 | 金额用整数 microUSDC 解析再换算成 18 位原生单位；不连钱包、不发交易 | 真实可演示，数据为 **SIMULATED** |
| 15–25 | 点 **Create invoice (offline demo — no signing)**，右侧自动出现虚线边框的模拟收据，带 “Simulated” 印章 | 收据绑定哪些字段；付款方/交易/时间为空，因为演示里没有付款 | 模拟，`SIMULATED_NOT_VERIFIED` |
| 25–30 | 收据下方 “Checks a real receipt must pass” 列出 5 项检查，每项标 “Not run (simulation)” | “已验证”需要合约代码、发票状态、事件、两段原生 USDC 转账和最终性同时成立 | 模拟（检查项真实存在于代码，演示中不运行） |

## 2. 约 2–3 分钟演示脚本

| 时间 | 画面 | 口播（可直接念） | 证据 / 状态 |
|---|---|---|---|
| 0:00–0:15 | Overview 首屏 | “ArcProof 把一次 USDC 收款变成一张链上固定发票。付款方只能按原金额付一次，钱在同一笔交易里直接转给商户。之后双方用同一个链接，对着 Arc 链上数据复核收据，而不是互相发截图。” | 真实 UI |
| 0:15–0:35 | 下拉到 “How it works” 三步和 “Verified requires all of these” | “‘已验证’不是看到交易成功就算。要同时核对合约运行时代码、发票已付状态、InvoicePaid 事件、付款方到合约再到商户的两段原生 USDC 转账，以及 RPC 报告的最终块。缺任何一项都保持未验证。” | 真实 UI；检查逻辑在 `src/arcproof/receiptVerifier.ts` |
| 0:35–1:05 | 离线演示：输入 `0.20`，显示精确原生值 `200000000000000000`；创建；查看模拟收据；导出 JSON | “这是离线模拟，不碰钱包和链。注意它明确标着 SIMULATED / NOT VERIFIED，付款字段是空的，我们不会编造交易。” | 模拟；导出的 JSON 中 `verificationStatus` 为 `SIMULATED_NOT_VERIFIED`，payer/tx/time 为 null |
| 1:05–1:25 | **Verify receipt**：输入 `0x1234`，点击验证 | “核验页不需要钱包。格式不对的输入在发任何链上请求之前就被拒绝。” | 真实 UI，只读，不发请求 |
| 1:25–1:45 | **Evidence** 页：“Recorded so far / Not yet shown”和构建身份 | “这里列出已有证据和缺口：主网合约、公开 App 和 0.20 USDC 样本付款已记录。视频、DoraHacks 提交和审计还没有。历史测试不等于本页重跑。” | 真实 UI；历史记录不等于本构建重跑 |
| 1:45–2:20 | Arc Studio 项目页：合约、测试、应用 | 说明 Studio 起源、外部审查与同步链条（见 `docs/SUBMISSION_READINESS.md` 的 Studio 一节） | **待真实执行**：需用户在 Studio 中录屏；当前 Studio 同步对应的是旧快照 |
| 2:20–2:50 | 打开样本收据 https://zippy-narwhal-31f5db.netlify.app/#/receipt/5042/0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa/0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae?tx=0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce ，再在 explorer.arc.io 打开同一笔付款 | “这是主网上的一笔 0.20 USDC。页面上的 Verified 必须来自当次链上读取，不能靠这份文档代替。” | 付款已在链上。把当次核验结果录成视频仍是 **待真实执行** |

## 3. 可选：测试网钱包流程（仅限测试资产）

只有在用户本人用测试网钱包操作时才可录制，且必须口头说明是 test USDC：

1. `#/invoices` 连接普通 EOA 钱包，创建发票，先看 Review 卡片（金额、合约、手续费上限、原子转发说明），再在钱包中批准。
2. 用另一个钱包打开付款链接付款。同一钱包自付会被标记为 `controlled_demo`，不能说成收入或两钱包验收。
3. 打开收据链接，核验结果须来自真实链上读取。

测试网结果不满足比赛的主网硬门槛。

## 4. 不能说的话

- 不说“已上线主网”“已审计”“零漏洞”“托管/退款/仲裁”“税务发票”“合规证明”。
- 不把模拟收据、测试网自付或历史日志说成真实收入或当前构建的实测。
- 不承诺获奖、奖金或付款时间。
