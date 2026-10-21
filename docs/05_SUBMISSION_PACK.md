# 资格核验与提交材料

本文件是准备清单与草稿，尚未提交，不是最终交稿包。当前源码/Studio/测试范围与未关闭项见 [审查关闭矩阵](AUDIT_CLOSURE_MATRIX.md) 和根目录 STATUS.md。方括号占位符只能由实际证据替换；不能用本地fixture、测试网或未完成的步骤替代主网事实。

## 1 G0 必须填写的字段

| 字段 | 本包已有证据 | dot需要完成 |
| --- | --- | --- |
| 本期活动 | 官方Arc Studio社区页确认第二期基础活动 | 打开本期DoraHacks原页，核对期号与正文 |
| 奖励 | 最多可能8份，各500USDC | 确认条件、收款网络、是否保证发满及是否仍有资格 |
| 截止 | 官方给出2026-11-01日期 | 具体时刻、时区、UTC及本人上海时间换算 |
| 提交状态 | 本次未完整取得提交页 | 确认当前可提交，不把抓取失败判为关闭 |
| 本人资格 | 未核实 | 按正式地区/身份/团队/既往资助条件核对，不推断国籍 |
| Studio来源 | 已有历史项目/生成导出记录；当前运行构建未知 | 核对当前 project/preview URL、实际运行源码版本和制作/测试证据，不以历史记录代替当前验收 |
| 主网证据 | 本项目尚无 | 明确要求的交易、合约、应用和视频；真实产生后逐一核验 |
| 付款日期 | 未核实 | 分清决定日与付款日；未有承诺继续null |
| 公开及IP | 完整第二期原文待核 | 源码许可、既有代码权利、团队署名、作品复用、曾获资助限制 |
| 主网审查要求 | 官方社区风险说明建议先测试网并接受独立专业审计 | 核对完整本期条款是否有硬性审计要求；若有且成本或时间不支持则停止，不以LLM审查替代 |
| 支出与操作 | 本轮零预算；历史20美元建议不构成消费授权 | 不购买、不升级、不触发付费 CI/服务；签名、主网、公开发布与提交均另行处理 |

全项目许可尚未由所有者选择。合约的 MIT SPDX 不覆盖整个项目、文档、品牌或素材；保留第三方版权及其现有许可证。参见 [许可边界](LICENSING_BOUNDARY.md)，在所有者确定范围、权利来源与条款前，不新增 blanket MIT 或公开源码授权。

关键适格字段未知时G0不通过。官方未承诺限期付款时cash_fast_pass=false。用于Grant实验的技术准备和严格十天现金筛选是两次判断，不能互相覆盖。

## 2 主网操作前的可审查摘要

每次计划操作记录：用途、chainId、合约/收款地址、调用与参数、金额native整数和USDC显示、gas估计、最大实际支出、源码commit、预期事件及失败行为。列表在本人签名前生成。

以下仅为未授权、未执行的历史方案，不是本轮待自动执行的任务。计划演示：部署一次；由商户钱包创建3张0.20USDC发票；由另一个本人控制的钱包分别付款3次。共约7笔成功链上交易，其中3笔为付款。无锁仓、验收和释放动作。失败测试在本地与测试网完成。

本人签名后保存真实原始receipt和链上读回结果；不要因UI显示成功跳过校验。所有演示记录标controlled_demo，不表示三名客户、三笔商业收入或产品牵引力。

## 3 最终交稿证据清单

- [ ] 当期规则已复核，个人资格有依据，尚在受理。
- [ ] Studio项目URL可打开，生成和测试历史能追溯。
- [ ] 原始导出与dot后续修改记录完整。
- [ ] GitHub仓库公开可读，或满足本期实际源码公开要求。
- [ ] 安装、测试、构建命令真实存在且从干净环境验证。
- [ ] Live Demo无需评委拥有作者账号即可打开关键页面。
- [ ] 主网部署地址、bytecode hash、commit、构建产物关联一致。
- [ ] 实际主网付款receipt验证成功，测试网和fixture单列。
- [ ] 视频展示真实Studio过程、应用和链上记录。
- [ ] README准确声明1USDC上限、普通EOA支持、无专业审计、资金原子转付。
- [ ] 应用未声称AI验收、退款保障、收入保证或官方背书。
- [ ] 最终提交内容处于本人当前授权范围。
- [ ] 实际提交后保存确认页/提交ID和时间，再将状态改为SUBMITTED。

## 4 英文项目描述草稿

以下文本只能在相应功能和证据完成后使用。尚未完成时改用planned/implemented locally/testnet verified等准确阶段。

### Title

ArcProof — Invoice-bound USDC payments and verifiable receipts

### Short description

ArcProof links a USDC payment to immutable invoice terms on Arc. A payer reviews the merchant, amount and expiry, then makes one atomic payment. The invoice can be paid successfully only once. A separate verification page checks the transaction and receipt against onchain state.

### Problem

A transfer screenshot does not reliably identify which invoice was paid. When several invoices have the same amount, matching payments by amount alone is ambiguous. ArcProof makes the invoice identifier, fixed recipient and exact amount part of the payment operation, then exposes the evidence for independent verification.

### What works

[Replace this paragraph with the actual verified feature scope.] The capped prototype creates invoices, processes exact native-USDC payments, rejects duplicates and expired requests, and exports machine-readable receipts. Its static frontend has no custody backend or server-side signer. Payment is forwarded to the merchant within the same transaction; it is not held for later approval or withdrawal.

### How Arc and Arc Studio are used

The contract and frontend were built and tested in Arc Studio at [STUDIO_PROJECT_URL]. Exported source was independently reviewed and tested at commit [COMMIT_SHA]. Mainnet deployment was performed outside Studio using the builder's wallet. The app uses native USDC and verifies Arc's native payment evidence.

[Use this paragraph only after those statements are true; otherwise state precisely what is incomplete.]

### Evidence

- Live application: [LIVE_URL]
- Source and reproducible instructions: [REPOSITORY_URL]
- Arc Studio project: [STUDIO_PROJECT_URL]
- Reviewed source commit: [COMMIT_SHA]
- Mainnet contract: [VERIFIED_CONTRACT_EXPLORER_URL]
- Verified controlled demonstration payments: [TX_URL_1], [TX_URL_2], [TX_URL_3]
- Build and test evidence: [TEST_REPORT_URL]
- Demonstration video: [VIDEO_URL]

### Limitations

This is an unaudited prototype capped at 1 USDC per invoice. It has no escrow, arbitration, refunds, admin withdrawal, upgrade mechanism or platform fee. The demo uses builder-controlled wallets and does not represent customer traction or revenue. Receipts prove a payment to an address, not delivery of goods, legal invoice validity or the resolution of a dispute.

### Next validation

The next step is to test whether a small number of existing Arc teams will pay for integration into one real payment workflow. Production use and higher transaction limits require separately scoped review and validation. Grant funding would support that validation; no future revenue or adoption is claimed.

## 5 README 首屏模板

```text
ArcProof
Live demo: [LIVE_URL]
Studio project: [STUDIO_PROJECT_URL]
Network: Arc Mainnet / or actual current stage
Contract: [VERIFIED_CONTRACT_URL_OR_NOT_DEPLOYED]
Source commit: [COMMIT]
Verification evidence: [EVIDENCE_URL]
Status: [ACTUAL_STATUS]

Invoice-bound native-USDC payment demo. Maximum 1 USDC per invoice.
Not professionally audited. Demonstration payments use controlled wallets.
```

后续必须包含实际工具版本、安装/测试/构建命令、合约接口、单位换算、静态部署方法、收据独立重算、源码许可、已知限制和真实演示步骤。不要把shell占位符当成可运行脚本。

## 6 视频分镜

建议2–3分钟，是本项目表达建议，不是已核实的官方时长要求。

| 段落 | 时长目标 | 画面与证据 |
| --- | ---: | --- |
| 问题 | 15秒 | 两张同金额发票，说明为什么付款截图难对账 |
| Studio来源 | 30秒 | 真实项目URL、合约/前端、生成与测试过程，遮蔽登录信息 |
| 创建与核对 | 25秒 | 创建0.20USDC发票，显示固定收款人、金额和网络 |
| 实际付款 | 30秒 | 本人钱包完成真实签名；如使用录制回放标明演示时间 |
| 独立验证 | 30秒 | 新页面重读链上数据，查看正确invoiceId、事件与收据 |
| 限制与下一步 | 20秒 | 1USDC原型、无专业审计、自测不算用户、验证付费集成需求 |

不要在录屏中展示私钥、助记词、访问token或身份材料。钱包自测只能在相应授权内进行；不能为连贯视频伪造签名、交易结果或正式提交确认。

## 7 状态词典

PRD_READY、G0_VERIFIED、LOCAL_VERIFIED、TESTNET_VERIFIED、READY_FOR_MAINNET_REVIEW、MAINNET_DEMO_VERIFIED、READY_TO_SUBMIT、SUBMITTED、AWARDED_AWAITING_PAYMENT、PAID、STOPPED是不同事实阶段。没有对应证据不能前移状态。
