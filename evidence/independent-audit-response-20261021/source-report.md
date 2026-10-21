# ArcProof 全面独立审查与参赛改进方案

**报告日期：2026-10-21。审查对象：peterpeter228/arcproof 私有仓库。**

**固定审查 SHA：94a84c44b02d52a827bed42fc9f9a5d414619b7d。** 本文代码行号均绑定此 SHA；后续 main 变化不自动继承本文结论。远端compare/CI复读窗口为 **2026-10-21 09:39:16–09:39:17 UTC / 北京时间 17:39:16–17:39:17**；最终交付前于 **10:02:48 UTC / 北京时间18:02:48** 再次读取main，HEAD仍未变。

本报告是独立研究、静态审查和有限本地探针的结果，不是安全审计认证、参赛资格证明、获奖保证或实施授权。本轮没有修改远端仓库、部署、公开发布、报名、签名、转账、联系他人、购买服务、调用项目付费模型或读取凭据。所有需要签名、资金、发布或新权限的步骤均留作后续明确批准的动作。

## 阅读导航

- A：执行摘要与唯一下一步
- B：范围、版本、证据和执行记录
- C：主办方合规矩阵与 Arc 协议事实
- D：安全模型、问题登记、依赖及旧 16 项复核
- E：产品、替代品、UI 与可实施设计
- F：可交给 dot 的批次 backlog、4 小时及 1 天方案
- G：验收与证据收集清单
- H：参赛材料、演示、评委质疑与备用路径
- I：可独立复制的 dot 交接指令
- 附录：固定源码索引、官方来源、探针证据和最小补充材料

---

# A. 执行摘要

## A1. 一句话判定

**ArcProof 已有一套范围克制、原子直付和严格核验逻辑较完整的 Arc Testnet 小额付款证据原型；本轮尚不能证明它已满足当前比赛资格、已在评委可访问的同版本页面闭环运行，或已完成主网与真实双钱包验收。**

它不只是静态 mock：合约、钱包预审、持久请求、链上发票读取、付款及核验服务确实存在。但是“代码存在”“历史日志通过”“旧测试网交易存在”“当前 UI 可运行”“本届可参赛”是五件事。本轮能确认前两类的部分事实，无法把它们扩展成后三类通过。

单张发票本金上限为 **1 测试USDC（10^18原生单位）**，gas另付；这不是总支出或累计风险上限。运行配置绑定测试网，界面首版支持普通 EOA，创建零 termsHash。这决定当前主用例应是 **Arc 支付集成开发者/复核者的小额受控验证演示**，不是成熟商户日常收款、税务发票系统或已验证商业需求。[C01][C02][C03]

## A2. 最重要的五个问题

| 顺序 | 结论 | 类型与意义 |
|---|---|---|
| 1 | 第二轮官方详情正文未取得；截止完整时刻、时区、资格、源码公开与主网要求仍待确认 | **资格硬门槛未证实**，不是已判不合格。DoraHacks 返回 405；社区候选页只显示登录外壳。不得把旧轮、搜索摘要或 Studio 产品页当现行条款。 |
| 2 | production manifest 为空，网络策略多处绑定测试网；Studio/评委页面与当前 SHA 未建立身份链 | **运行与交付缺口**。如果本轮确须主网，现状不足；主网改造不是替换一个地址。 |
| 3 | 无 hash 付款 intent 可以接受另一笔内容相同的成功交易并声称原请求已恢复 | **SEC-R01，P2 请求身份语义缺陷**。模块层反例已复现，完整 service 可达性为静态推断；没有证明盗币、重复本金支付或伪造 VERIFIED 结算。 |
| 4 | 分享成功状态没有绑定当前发票；核验信息层级和首访路径妨碍理解 | **NEW-UI-01/02/03 与 UX-01**。新发票可能继承旧“Link copied”；核验金额排在诊断信息之后；静态颜色存在低对比。没有真实视觉验收。 |
| 5 | 当前完整套件、干净构建、浏览器、raw RPC、两钱包与远端 CI 尚无本轮证据，发布许可未闭合 | **验收与证据缺口**。391 是仓库历史项目套件记录，不能说本轮重跑通过；Argon 的历史结果不能给后续修改自动背书。 |

## A3. 最值得投入的三个改动

1. **把资格、版本和交付证据做成一条可追溯记录。** 取得当前官方规则完整快照；让运行页面显示 build SHA/网络/manifest 身份；把同一版本的测试、原始链上读回、导出和演示对应起来。它直接回答“为什么这份作品可参赛、评委看到的是什么版本”。
2. **修复请求恢复的身份语义和分享状态。** 无 hash 请求保留 uncertain；允许单独核验找到的付款，但不能冒认原请求。复制反馈只属于当前 invoice。改动集中、可逆，不需要改变资金流。
3. **把收据改成评委能在 30 秒理解的页面。** 环境、结论、金额、双方、尚缺证据、下一步依次出现；工程细节可展开；无钱包即可进入核验/明确模拟入口。用实际浏览器、真实下载和打印检验，而不是以截图审美推断安全。

## A4. 应停止的三类投入

- 继续叠加 AI 代理、多链、托管、退款、订阅、后台、收入仪表盘，或为演示提高 1 USDC 上限。这些均扩大范围和风险，不能补资格与当前闭环证据。
- 把多个重叠套件数量相加、反复追求更多“通过项”、或将模型审核文字当安全认证。优先反例质量、真实调用边界和可复查日志。
- 用自转、两个受控钱包、测试网、fixture、旧录屏或未绑定版本的 Studio 页面包装“真实客户/收入/当前主网成功”；为方便演示清缓存、自动重发未知交易或降低核验条件。

## A5. 六个维度的独立判定

不使用百分制或获奖概率。这里“已证实”只适用于明确范围，“未验收”不等于发现失败。

| 维度 | 当前判定 | 置信度与限制 |
|---|---|---|
| 资格就绪 | **HOLD / 未能确认** | 对访问失败和缺口高置信；对本轮实质资格不作推断。 |
| 演示就绪 | **尚未验收** | 有真实代码及历史测试网记录；本轮没看到 Studio DOM/截图，没完成浏览器/两钱包/同版本证据链。 |
| 代码质量 | **有较好防护结构，当前全量门禁待补** | 157 个文件字节与固定 Git blob 一致；源码和历史日志可查。依赖恢复失败使当前 build/lint/typecheck/完整套件不可执行。 |
| 安全边界 | **保守设计值得保留，有一项恢复归因需修** | 金额、一次性支付、绑定核验、unknown fail-closed 较清楚；不是完整专业审计或生产安全保证。 |
| UI | **静态方案可实施，视觉/交互未验收** | 发现具体复制状态和对比问题；375/768/1440、200%缩放、移动钱包和打印均未实测。 |
| 证据完整度 | **源码身份强，运行及资格证据弱** | 精确 SHA、字节校验和有限本地日志已取得；历史 raw RPC、当前部署/Studio/评委访问证明不足。 |

## A6. 首先执行的唯一下一步与停止条件

**先做 GATE-01：用最多 20 分钟取得第二轮官方详情、时间栏及附属条款的完整可读快照，并记录页面时区。**

目的不是等待一切规则清楚才修代码，而是先决定“本轮参赛”是否值得继续投入主网与公开交付。若仍取不到，记录 RULE-01 未关闭，继续既有范围内的可逆安全/文档修补；**停止资格通过声明、主网发布/资金、公开源码与提交动作**。若规则明确不允许当前主体/作品，或要求的公开/主网动作无法在既有授权和剩余工时内完成，则把本轮目标降为私有技术展示，停止扩功能。不要自行补截止时区或猜身份要求。

---

# B. 审查范围和证据索引

## B1. 固定版本与差异

| 项目 | 本轮实际结果 |
|---|---|
| 私有仓库访问 | 通过已连接 GitHub 只读接口成功读取，不使用公开搜索冒充源码 |
| 执行时 main | 94a84c44b02d52a827bed42fc9f9a5d414619b7d |
| 提交时间 | 2026-10-21 08:16:47 UTC / 北京时间 16:16:47 |
| 对用户给定 ab62f58cbaff5eefab751186277438afd66947af | 新增一份 233 行审查委托文档 docs/ARCPROOF_GPT6_PRO_REVIEW_PROMPT_20261021.md；不构成产品代码变化 |
| 对运行代码提交 648acc3cc1678fa682bc5833161e66ace1ff2603 | ahead 2；README +2、STATUS +2、审查委托 +233，未见运行/测试文件变化 |
| 远端复读 | 09:39:16–09:39:17 UTC比较/CI；最终10:02:48 UTC / 北京时间18:02:48再读main，SHA仍未变 |
| 完整树 | 524 项、476 个 blob，返回未截断 |
| 本地物化与字节校验 | 157 个文件、其中 src 54 个；157/157 与树中 Git blob 匹配，非整个仓库完整 clone |
| CI | 树中没有 .github/workflows；仓库 Actions runs 查询 total_count=0；HEAD 无 combined status 成功记录。不得写 CI green |

所有代码链接使用固定 SHA；本文不对下一次 main 自动下结论。远端 compare 结果和逐文件校验清单在本轮执行记录中保存。

## B2. 实际阅读材料

按委托顺序先读取 README.md、STATUS.md、RUN_中文.md、docs/AUDIT_CLOSURE_MATRIX.md、docs/QUALITY_GATES.md、docs/LICENSING_BOUNDARY.md，再查 AGENTS.md、实际 PRD/规格、源码、锁文件及测试。

主要内容包括：

- docs/02_PRODUCT_PRD.md、docs/CONTRACT_SPEC.md、docs/TESTNET_INTEGRATION.md；提交及质量门禁文档。
- contracts/ArcProofInvoices.sol 和五份合约测试；src/arcproof 内金额、manifest、网络、prepared action、wallet intent、testnet client、receipt verifier、settlement、export、wallet hook 及对应测试。
- src/App.tsx、Layout、TestnetScreens、ReceiptFacts、EvidenceScreen、DashboardScreen、DemoReceipt、样式/构建配置；package.json、bun.lock、foundry.toml、工具版本文件。
- 独立初判后对照 evidence/argon-followon-20261021/REPORT.json、project.log、exits.txt、回归前后日志、quality-integration 报告及 dated-correction、集成报告、G1 artifact-coherence/Foundry 日志、G2/G3 独立审查、native verifier 的观察记录与 fixture。
- dependency-review 报告、归档 advisory 与 bundle 分析；四份保留旧版本的 bookkeeping 文件。

**读取或执行缺口：**

- 没有取得仓库之外“原 16 项外部完整独立报告”的单独原件；对照使用仓库 closure matrix 和现有独立复核材料，不补写原报告未见内容。
- Argon follow-on REPORT.json 有“HTTP 200”等记载；本轮未取得足以独立重演外部模型调用的完整原始响应链，且未调用外部付费模型。
- 历史同钱包测试网核验的完整 raw transaction/receipt/finalized 日志未取得；normalized explorer observation 和重建 fixture 不能补成 raw RPC。
- 远端树没有 PNG/JPEG/WebP 页面截图；本轮没有可查看的运行页面截图。
- Studio 入口只完成浏览器选取；创建页面和标签查询均超时，没有 DOM/截图。**不是已观测到登录墙，也不是页面不可用的定论**。没有自行登录、更新部署或把当前源码认作 Studio 版本。
- 第二轮 DoraHacks 官方详情 405；Arc 社区候选页仅登录壳；当前完整比赛条款、提交状态和时区未取得。

## B3. 证据分级

| 标签 | 含义 | 例子 |
|---|---|---|
| DYN-LOCAL | 本轮直接执行，注明模拟范围 | 实际 walletIntents 模块 + 人工 verify 回调反例；三项纯模块探针 |
| STATIC | 固定 SHA 静态读取与推断 | copied 跨发票、路由、主网绑定、核验字段与合约保护 |
| HISTORICAL | 仓库已有报告/日志或旧链观察 | 391 项日志、73 项 Forge、旧同钱包测试网记录、Argon 跟进 |
| OFFICIAL | 本轮读到的官方正文 | Arc 双精度模型、系统事件、网络参数、Studio 使用条款、竞品官方功能 |
| LEAD-ONLY | 官方索引或第三方摘要线索 | 11/1、第二轮奖金、主网与公开源码要求，均不能裁定资格 |
| NOT_RUN / BLOCKED | 未执行或环境阻塞 | 本轮完整套件、浏览器、钱包、raw RPC、Excel/Sheets、当前编译 |

证据优先级：**本轮同 SHA 可复现原始结果 > 同 SHA 明确命令日志 > 日期/版本清楚的历史日志 > 报告结论 > UI 标签/摘要**。较新报告不自动覆盖较旧原始失败；应说明哪一次修复解决哪个失败。来源不匹配时并列保留，不取最乐观者。

## B4. 实际环境与命令

环境：Linux 沙盒；Node v24.19.0、npm 11.9.0；初始 Bun/Forge 不存在。仓库固定 Bun 1.3.14、Foundry v1.7.1。Playwright 库可用，但其预期浏览器可执行文件不存在；没有下载浏览器或伪称浏览器测试。

| 动作 | UTC / 北京时间 | 耗时、退出/结果 | 结论范围 |
|---|---|---|---|
| 公共 RPC eth_chainId 只读请求 | 09:23:37 / 17:23:37 | 约0.004秒；Operation not permitted，网络未发出 | 无实时链上结果；不能据此判 RPC/链正常或异常 |
| Bun 临时安装首次尝试 | 本轮日志保留 | 因 user/global npm config 同指 /dev/null 导致加载错误 | 审查环境配置错误，已改成两个空文件；不计项目失败 |
| Bun 1.3.14 临时安装重试 | 09:31:20 / 17:31:20 | 0.342秒；exit 1，EAI_AGAIN registry.npmjs.org | 未恢复 Bun；未进入项目 frozen install；没有读取凭据 |
| hashless-pay-identity-probe | 09:32:18 / 17:32:18 | 0.088秒；exit 0 | 成功建立当前模块反例，不表示缺陷已修复 |
| pure-module-boundary-probe | 09:40:56 / 17:40:56 | 0.129秒；exit 0 | 选定金额/状态/导出边界符合预期；非全项目测试 |
| GitHub HEAD/compare/Actions 复读 | 09:39:16–17 / 17:39:16–17 | 读取成功 | 版本与 CI 事实，非构建验证 |
| 交付前main再读 | 10:02:48 / 18:02:48 | 同一SHA | 仅HEAD身份，未另跑构建 |
| 云浏览器页面/标签 | 本轮两次调用 | 每次工具报告300秒超时，没有页面状态 | 浏览器验收 NOT_RUN；不再重复无收益等待 |

临时安装先检查脚本/工作流，使用忽略 lifecycle scripts、空 npm 配置、审查专用 cache，不调用 .env、第三方 Key、部署脚本或付费 API。准确安装命令为：

~~~sh
npm install   --prefix /workspace/scratch/ba2f18486b44/arcproof-audit-work/audit-tools   --cache /workspace/scratch/ba2f18486b44/arcproof-audit-work/npm-cache   --userconfig=/workspace/scratch/ba2f18486b44/arcproof-audit-work/npm-empty-user   --globalconfig=/workspace/scratch/ba2f18486b44/arcproof-audit-work/npm-empty-global   --ignore-scripts --no-audit --no-fund   --fetch-retries=0 --fetch-timeout=15000   --registry=https://registry.npmjs.org/ bun@1.3.14
~~~

探针命令，工作目录 arcproof-audit-work：

~~~sh
node --experimental-vm-modules security-evidence/hashless-pay-identity-probe.mjs
/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node   --experimental-vm-modules security-evidence/pure-module-boundary-probe.mjs
~~~

实际探针加载前逐文件核对 Git blob；Node 内存擦除 TypeScript 类型，不改源码。第一个使用惰性 React/defineChain 适配、模拟 storage/Web Locks 和人工核验回调；第二个直接执行 amountParser、receiptStatus、exportUtils，没有第三方依赖替身或伪造密码学。导出用的是合成数据，不能充当链上交易证据。

## B5. 测试结果应怎样解读

本轮 **没有**执行项目391项套件、Bun frozen install、build、lint、typecheck、Forge、浏览器、Excel/Sheets、两钱包或当前实际部署验收。原因与失败日志已保留。

仓库 project.log 显示历史19个文件391项测试，运行约4.04秒；日志本地时钟不能擅自解释为 UTC。137 adversarial、24 UI、114 service、26 safety、6 legacy UI 等可能与项目套件重叠，**不求和**。[C12]

三个纯模块探针分别确认：

- 金额最小0.000001、最大1.000000和选定中间值的精确 bigint/格式化往返；零、超精度、超上限、科学计数、前导零、负值拒绝。不是所有输入域或超长字符串资源上限证明。
- success/reverted 以外选择的异常 status 保留 unknown。没有执行整个 provider 规范化流程。
- 导出 scope 不匹配清空结算背书；finality 未证实保留观察而不给 verifiedEvidence；大整数 JSON 字符串和 CSV 原始字节/转义保持。**CSV 字节正确不等于 Excel 自动打开精度正确或公式防护已验收。**

独立复制状态 jsdom 回归文件已写于审查目录，但依赖不可用，状态为 **NOT_RUN**。不把预期失败写成实际复现。

---

# C. 主办方合规矩阵

## C1. 当前能够确认什么

初始官方规则检索窗口为 **2026-10-21 09:20–09:23 UTC / 北京时间17:20–17:23**；09:38 UTC后补查官方 newsletter/Q&A，再对关键官方产品和协议页面复读。

- [第二轮 DoraHacks 详情][R01]：405，无法读取完整正文。官方域索引帮助定位候选活动，不足以确认提交状态、资格或评分。
- [Arc 社区候选页][R02]：仅登录外壳。没有自行登录。
- [Arc Studio 产品介绍][R03]：可读，介绍导出到自己的仓库和外部工具；这不等于当前活动允许任意外部重写。
- [旧轮官方活动][R04]：明确旧轮10月14日23:59 ET截止，20×500/总10,000 USDC且要求 public repo。**不得把这些数字、资格、奖励或公开要求移植到本轮。**
- 官方 Q&A 索引出现“2026/11/01 20:59”，没有时区和正文上下文[R25]；其他索引/二手摘要有11月1日线索。本文 **不采用该时刻为正式截止、不转换时区、不补成午夜**。
- 二手摘要给出的名额/总池及评分百分比不纳入官方结论。当前无法确认每位奖励、总池、支付日或奖金到账速度；不支持任何“短期必回款”判断。

这是一项**规则证据不足**，不是活动关闭或用户被排除的证据。

## C2. “官方要求 → 现有证据 → 差距 → 动作”逐项矩阵

责任人“dot”表示后续核实/整理；“用户”只承担本人信息、协议选择或需新授权动作，本报告不替其执行。

| 项 | 本轮官方状态/来源定位 | 当前项目证据 | 差距与责任动作 | 提交前客观验收 |
|---|---|---|---|---|
| 活动/主办方/轮次 | R01候选第二轮；R04是不同旧轮 | 仓库材料指向 Arc Microgrants | dot取得详情全页、标题、slug、组织方 | 规则与实际提交表属于同一轮 |
| 当前开放 | 未读到表单当前状态 | 没有已提交证明 | dot只读查看开放/关闭状态 | 带URL/UTC截图或导出 |
| 截止 | 日期/时刻仅索引线索 | 旧材料写11/1 | 取得原文及时区/页面转换设置 | 精确时间可追溯；若只有日期继续标未知 |
| 修改截止 | 本轮未取得可核的官方正文 | 未见对应证据 | 读取Timeline/FAQ | 独立记录，不默认等于提交截止 |
| 评审与发奖日 | 未取得本轮正文 | 没有支付承诺 | dot记录评审、确认、KYC、付款条件 | 不拿旧轮10/21决定日当本轮日期 |
| 个人/团队 | 本轮未知 | 用户自述个人 | 规则确认形式后核对 | 表单主体与规则一致 |
| 地区/居住地/国籍 | 本轮未知；网络条款另有适用法律/限制[R07] | 自述“中国”不明确居住地 | 只问规则确实需要的字段 | 用户在官方核验流程确认；不上传证件给agent |
| 年龄/法律能力 | R07 §1要求18及居住国可缔约；比赛额外条件未知 | 自述已18 | 无需重复索要生日；有额外规则再核 | 用户自核当地能力与官方要求 |
| 关联/员工/既往资助 | 本轮未核实 | 未有足够声明 | 查排除条款与既往资助/重复申请 | 保存真实声明，不继承旧轮禁项 |
| Studio开发要求 | 索引提示必须，完整范围未知 | 有Studio URL；历史版本记录 | 保存真实Studio构建轨迹及外部修改说明 | 轨迹能映射实际代码；不补拍成虚假全程 |
| 导出外部开发 | R03产品允许导出；R05主网责任在工具外 | 当前GitHub有外部审查/修补 | 规则确认外部修补边界，dot标注来源 | 不因产品允许就声称比赛全部允许 |
| AI及披露 | Studio是AI工具；比赛披露条件未知 | 已有多轮模型/人工审阅记录 | 如实写AI辅助与人工核验 | 不用“Argon认证/专业审计通过” |
| 开始日期/旧项目复用 | 本轮未知 | 可从提交历史整理真实起点 | dot核活动起算和复用规则 | 不重写历史、不伪造新建日期 |
| 公开源码/可见性 | 二手说public repo，官方未核 | 本仓库私有，可供此次授权审查 | 先确认硬要求；若需公开，由用户决定范围/授权 | 评委实际能读规定范围；本报告不要求现在公开 |
| 开源许可/第三方组件 | 产品条款与各依赖许可分别适用[R06] | LICENSING_BOUNDARY明确未选根许可证 | dot做文件/资产清单，用户决定一方许可 | 保留第三方NOTICE/许可，禁止一刀切MIT |
| 品牌/署名 | R06 §5/§6保留工具和品牌权利 | 现有Studio attribution | 保留必要署名，核Logo政策 | 不暗示Circle/Arc背书 |
| 指定链/网络 | 比赛主网要求未取得全文；网络参数已确认[R08] | 全路径目前测试网5042002 | 若主网必需→NET-01；否则如实标testnet | 规则要求的chain与部署/交易/界面一致 |
| 真实USDC/支付方式 | 索引提示real USDC；详情待证 | 历史只有受控测试网记录 | 实际资金步骤须用户另批 | 原始tx/receipt及对应链；不以测试资产冒充真钱 |
| 合约源码验证 | 本轮是否强制未知 | 有归档编译/部署身份 | dot准备可验证artifact；用户批准发布/验证动作 | 地址、源码、solc/optimizer/evm、runtime一致 |
| 最低提交材料 | 二手列app/Studio/repo/视频/contract+tx/profile | 现有私有文档和Studio入口，不足完整交付 | 先做私有清单，按官方正文调整 | 无特殊账号的评委访问检查；必要链接非占位符 |
| 评审维度/权重 | 官方正文未取得 | 无可采信官方分值 | 不采用二手百分比；以代理指标排计划 | 若补到原文再改排序，保留版本日期 |
| 奖励及支付条件 | 本轮每人/总池/时间未知 | 无收入或领奖事实 | 用户确认币种、链、KYC、税务与收款主体 | 区分个人奖与总池；不保证付款时间 |
| IP/提交授权 | R06保留Your Service但工具/品牌例外；比赛提交条款未知 | 本轮没接受条款 | 读取当时Terms；用户决定是否接受 | 发布范围、第三方权限和提交许可可追溯 |
| 评委无需特殊账号 | 是否硬要求待全文确认；是可用性必要目标 | Studio页面未观测，私库访问不代表评委访问 | 同版本独立访客测试，准备访问说明 | 新会话可打开app/收据/证据，钱包只用于付款 |

## C3. 产品条款与比赛条款分开

Studio Terms §1.2、§4.1、§4.8明确工具不代托管应用、主网审核部署由用户承担，preview 不证明实际主网运行。[R05] 少量原文定位：“does not host Apps”；“preview is not a live mainnet deployment or interaction”。

因此，Studio初建、外部审查修补、外部主网部署在产品责任划分上可以相容；**本届如何认定 Studio 开发仍要比赛正文与真实历史共同证明**。不得仅打开一次Studio或重新导入最终代码就声称满足全过程要求。

Circle Developer Terms §6.2对Your Service的权利保留与§6.1工具/品牌归属、§4提交内容许可并存。[R06] 它不是整仓MIT授权。当前IP问题是发布范围和来源未闭合，不是已认定侵权。

## C4. Arc 技术事实及实际必要性

| 项目 | 本轮官方正文 | 对当前代码/证据的意义 |
|---|---|---|
| 主网/测试网 | 主网5042；测试网5042002，各有独立RPC/Explorer[R08] | 不能给testnet结果换mainnet标签 |
| 原生USDC | native balance、msg.value、gas采用18位[R09] | 0.20 native USDC = 200000000000000000；代码整数路径合理 |
| ERC-20接口 | USDC接口0x3600000000000000000000000000000000000000，6位[R09][R10] | 两接口指向同余额，不相加、不把6位直接当msg.value |
| 原生系统日志 | emitter 0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE，18位[R10] | topic相同不足；需发射地址/唯一logIndex/上下文 |
| ERC-20日志 | 上述0x3600…接口，6位[R10] | 不与原生日志双计；必须区分结算政策 |
| gas | receipt.gasUsed × effectiveGasPrice，原生18位；无独立gas Transfer事件[R10] | 费用与付款金额分列，保留原始整数；不能算收入 |

**官方示例冲突：** Gas and fees 页的 native-send 示例使用 parseUnits("1",6) 并注释1USDC，与其原生18位模型不一致。[R11][R09] 不能机械照抄示例改坏现有18位金额路径；应交叉核对模型、事件文档及后续真实只读证据。此处不执行示例、不读取其环境变量、不联系维护者。

ArcProof 值得保留的 Arc 专属性，是原生USDC精度与两段转付日志的绑定、费用和付款同计价、最终性证据解释。普通“链接+钱包按钮”没有这层价值。它的差异化应通过一张具体收据可复查的字段体现，不能仅靠宣传“稳定币原生”或“可信”。

---

# D. 安全与协议审查、问题登记表

## D1. 轻量威胁模型

| 资产/信任边界 | 攻击者或故障 | 当前控制 | 残余边界/应验证证据 |
|---|---|---|---|
| 付款本金、gas、收款人 | 篡改链接、重复付款、错链/错部署 | 合约固定商户/金额/expiry，一次性paid；manifest与runtime核对 | 钱包实际显示与raw receipt；恶意前端仍可替换整个请求 |
| 浏览器原点/持久请求 | 双标签、刷新、损坏storage、组件卸载、迟到结果 | Web Locks、发送前持久化、scope/key隔离、unknown不自动失效 | 真实扩展/双标签、存储拒写/无Locks未验收；跨设备不共享锁 |
| 钱包/provider | 拒签、错误包装、延迟hash、账户/链切换、替换/取消 | 账户/链/连接版本重核对；单次send；直接4001与unknown分开 | 不识别所有替换/取消；不能靠相同调用内容识别未知请求 |
| 合约外部调用 | 商户重入/拒收/强塞余额/returndata | CEI、同一ReentrancyGuard、精确value、余额不变量、失败回滚 | UI限制普通EOA；Arc特有运行需真实网络另验 |
| RPC → 核验器 | 缺字段、矛盾tx/receipt、重复/乱序log、重组、恶意一致数据 | 字段/来源绑定、严格状态、两腿转付、finalized及按高重读 | **依赖所用RPC的真实性**，不是light client或独立共识证明 |
| 前端托管/依赖 | 构建替换、供应链注入、错误版本/路由 | 静态manifest与安全代码；Vite开发面已收窄 | 真实托管headers、构建身份、依赖生产可达性需另验 |
| JSON/CSV/打印 | 伪造verified、公式注入、大整数舍入、旧数据混入 | scope绑定、事实/结算分层、字符串整数、CSV字节防护 | 真实下载/Excel/Sheets/PDF未验收；导出不是数字签名证书 |

## D2. 应保留的实现及本轮未认定的问题

- **金额与收款绑定：** createInvoice以msg.sender为商户；ID绑定chain/contract/merchant/nonce；输入先microUSDC再乘10^12；0<amount≤10^18，量子10^12，msg.value精确相等。[C01][C02]
- **原子转付：** payInvoice检查paid，先置状态再外调，同一成熟重入锁，失败全回滚。无owner、升级、提款、平台抽成或refund函数；正常成功付款在同一交易内转付本次msg.value，不保留待释放的客户本金。意外强塞的旧余额不可救回是既有权衡，不能为“修好”添加管理员rescue。[C01]
- **请求前置保护：** persistent intent先于钱包请求；storage坏/拒写、无Web Locks失败关闭；120秒review和账户/链切换需重审。已成功创建的确认包装器会结清对应intent，不能沿用旧“永远锁住下一张”的结论。[C04][C05]
- **核验范围：** chain/from/to/calldata/value、receipt状态、tx/receipt包含关系、invoice/金额/双方、日志地址/index、当前状态与付款区块、两条原生转付、finalized头和按高度重读都有绑定路径。[C06]
- **termsHash：** 合约将其视为不透明承诺；UI只创建/支付支持的零摘要。已有非零摘要付款可核验资金事实，不能因陌生hash拒绝全部合法付款，也不能把资金核验称法律条款核验。[C01][C07]
- **观察与成功：** 导出scope错配不保留验证背书；ReceiptFacts区分RPC观察、legacy caller-supplied、unattributed；live成功同时要求VERIFIED、verified、settlementEvidence。[C08][C09]
- **注入/导航：** 本轮未定位到当前可达的任意部署信任入口、活跃postMessage日志转发或源码中的具体XSS利用路径。此为有限静态结论；不等于所有依赖、真实托管或浏览器已验收。

合约源码当前8249字节，Git blob 0ff25b92632458c8e528fa87a27c6af9a4710aaa，SHA-256 8699071d250c834cd1166ece0d4001b7de95af7562796e19305ce2812635e25b，与归档artifact-coherence一致。这证明源码与旧材料相同，**不能替代本轮编译和链上runtime复核**。[C13]

## D3. 优先级定义与登记总览

P0：已证实的严重资金/权限风险或必须立即停用的可达破坏；本轮未建立此类结论。P1：资格、公开交付或核心演示未闭合。P2：具体正确性、证据语义、交互/可访问性问题。P3：局部文档/维护/未来边界。未验证项不能只因未知就称安全漏洞。

| ID | 标题 | 优先级 | 类型/置信度 | 当前状态 |
|---|---|---|---|---|
| RULE-01 | 当前轮规则/资格/时区未闭合 | P1 | 资格证据缺口，高 | 证据不足 |
| REL-01 | 主网与同版本评委交付未闭合 | P1，主网部分条件性 | 运行交付，高 | 证据不足：实现存在，运行版本未验 |
| SEC-R01 | 无hash付款可错误归因成原请求已恢复 | P2；恢复卖点演示前阻断 | 恢复身份语义；模块动态高、全链静态 | 新发现 |
| NEW-UI-01 | 已复制反馈跨发票/迟到结果污染 | P2 | 交互正确性，静态高 | 新发现，jsdom未跑 |
| NEW-UI-02 | 空核验/证据/模拟入口不能深链重开 | P2 | 评委可达性，静态高 | 新发现 |
| NEW-UI-03 | 正常文字/启用按钮低对比 | P2 | 可访问性，token计算高 | 新发现，渲染待验 |
| UX-01 | 收据先诊断后金额，状态下一步不聚焦 | P2 | 产品理解，静态中高 | 部分修复 |
| DOC-01 | 当前/历史结果及运行身份容易混读 | P2 | 证据质量，高 | 部分修复 |
| QA-01 | 当前全套/浏览器/部署验收缺口 | P1演示、P2工程 | 未验证，高 | 部分修复 |
| DEP-02 | 锁定依赖仍命中当前advisory | P2分路径处理 | 依赖风险，版本高、实际利用不一 | 部分修复 |
| IP-01 | 整仓/资产发布许可未定 | P1公开交付条件 | 发布边界，高 | 证据不足/未关闭 |
| QA-S01 | 合约测试注释与版本断言名误导 | P3 | 质量说明，高 | 新发现 |

## D4. 逐项详细登记

### RULE-01：当前活动规则仍未被直接核验

**角色/条件：** 个人参赛者准备发布、投入主网或提交时；依据旧轮或索引决定资格。

**反例/复现：** 打开R01得到405，R02仅登录壳；R04能读到的旧轮截止与总池不同。因此旧轮“可读”不能补足新轮规则。当前行为是规则线索存在、正文不足；期望是每项门槛有本轮来源和抓取时间。

**证据：** C14的RULE-01、STATUS现行HOLD；C2矩阵与R01/R02/R04。**最小修复：** 取得完整官方快照及附属Terms，填每项未知；只在实际规则需要时核本人信息。不做向主办方发信、报名、推断中国居民/国籍或领奖资格。

**回归/验收：** 第二轮、开放状态、完整截止及时区、源码可见性、Studio/主网、奖励/KYC/IP逐项有正文定位；未明继续unknown。**依赖/授权：** 只读整理可做；登录、本人信息核验、协议接受/提交需用户相应操作。**估计：** 20–45分钟人工核对，外部材料等待未知。**回退：** 保存版本化快照，不改历史。**停止：** 资格不符/无法取证时停止资格声明和受限动作；剩余可逆代码工作继续。

### REL-01：生产网络和运行版本身份未闭合

**角色/条件：** 评委打开页面，或把测试网证据当主网能力。**证据：** manifest.ts:34–35 production空；arcSettlement.ts:9–29、testnet.ts:18–45、testnetClient.ts:43–57/168–232、walletIntents.ts:5/27–33、config.ts:10–15均有测试网约束；STATUS:61记Studio最后核验是旧8588d80，当前未看页面。[C03][C05][C15]

**复核步骤：** 对照源码网络、钱包chain、持久命名空间、manifest和导出mode；再要求app显示构建SHA并比对。现状只能证明测试网代码，不证明当前Studio或主网运行。**最小修复：** 先加只读build identity、固定当前artifact和评委入口；若官方确认主网，另做独立network policy/manifest/intent namespace，保留测试网，不覆盖旧deploymentId。不重写合约或取消白名单。

**回归/验收：** 跨链/跨部署/旧storage不能混用；代码/包/页面/manifest/runtime同一证据链；独立访客实际打开。主网验收另需正式部署和raw证据。**授权：** 私有代码可在后续委托内准备；更新Studio、托管/公开发布、部署签名/资金另批。**估计：** build identity与证据1–2小时；主网代码和回归6–10小时，部署/人类验收另计且可能超过一天。**回退：** 网络模式开关只回只读，保留未知记录和旧manifest。**残余/停止：** runtime或chain不匹配、预算不足、主网授权缺失即停发送/发布。

### SEC-R01：内容相同不足以恢复某次无hash请求

**角色/条件：** 付款人或复核者；同EOA对同invoice曾发出不同请求，其中一个没有hash。跨设备/独立origin可形成相同内容的两个请求；界面本已说明跨设备不支持，所以本项不是承诺跨设备功能失效，而是现有接受分支的身份说法过度。

**固定证据：** walletIntents.ts:102–112的recoverWalletIntent仅禁止无hash create/无hash reverted，允许pay+included写原intent；testnetClient.ts:395–420比较chain/from/to/calldata/value与inclusion，不持有原请求唯一证据；Layout.tsx:69–88称“Exact saved request recovered”。[C04][C05][C10]

**故障步骤：**

1. A、B为同EOA、同invoice/金额的两个不同钱包请求；在发票尚未paid时，两者都完成最终发送前重核并进入wallet dispatch，位于不共享原点锁的环境，并获得不同nonce。仅提前预审不足：若B在A已付后才到最终重核，会被当前代码阻止。
2. A成功；B钱包请求超时没有hash，B仍pending或后来revert。
3. 在B恢复界面填A的成功hash；现有比较字段相同。
4. B的operationId被赋A的hash并标included，尽管未证明B已结束。

**本轮直接证据：** 实际walletIntents模块、合成storage/Locks、人工included回调使uncertain→included；同invoice重发仍被阻止。未动态执行真实testnetClient回调、真实钱包或跨设备网络。**影响：** 错误恢复记录、未知请求从待处理视野消失，原请求仍可能花gas。没有证明重复本金、盗币、突破合约paid或伪造核验成功。

**最小修复：** 无hash的任何intent不凭匹配付款自动结清；“找到发票付款”与“识别原请求”分开。可以给独立收据链接，原intent仍uncertain。已知hash的严格绑定及成功create确认包装器保持。

**明确不做：** 不接管nonce、不自动重发/替换/取消、不超时解锁、不清缓存、不改合约或finality断言。

**回归/验收：** 无hash pay+另一匹配tx仍uncertain；无hash create/revert拒绝；已知hash成功/失败正确结清；已知hash不符拒绝；同invoice重发0次；只读核验不写intent；正常create确认后下一张仍能准备。测试中原本期待hashless included的断言必须按请求身份语义重新审查，不能只换文案继续误归因。

**授权/工时/回退：** 后续私有代码委托1–2小时含针对回归；真实签名另批。独立提交，回退安全方式是隐藏无hash“精确恢复”入口并保留unknown，而非恢复错误归因。残余是无唯一证据时确实无法自动恢复，诚实未知是允许的结果。

### NEW-UI-01：复制状态没有绑定当前发票

**角色/条件：** 商户在同一session连续创建A、B；曾复制A。**证据：** TestnetScreens.tsx:96的copied布尔；review:110–118未清copied；confirm:141更新created；copyLink:147–151；按钮:186。[C09]

**步骤/当前行为：** 创建A→复制成功→创建B→尚未复制B，按钮可能仍“Link copied”，剪贴板实际为A。异步A复制迟到或B复制失败也可能保留旧成功。**实际影响：** 误分享旧/已付/不同金额请求；不是合约篡改或自动盗款。静态高置信；独立jsdom回归已准备但NOT_RUN。

**最小修复：** copiedInvoiceId+复制操作版本；review/created/session变化失效；promise返回时确认当前identity；异常显示可操作错误。仅改展示，不碰preparedPayment、intent、nonce。**测试：** A→B、迟到A、B拒绝、账号切换。B未复制成功始终Copy payment link，剪贴板与当前URL一致。**授权/估计：** 私有展示修补20–40分钟，验证15–30分钟。**回退：** 独立展示提交，必要时去掉持续成功标志，保留按钮。**残余：** 剪贴板成功不保证用户贴给正确收件人。

### NEW-UI-02：通用核验/证据/模拟入口不能重开

**证据：** App.tsx:26–43仅pay/receipt解析，48默认dashboard，58–64 tab为内存状态；TestnetScreens.tsx:86/154–166 offline也是内存布尔。[C16][C09]

**角色/步骤：** 评委进入Evidence、空Verify或Offline simulation→复制URL/刷新/新会话→回创建入口。已有指定invoice的pay/receipt深链正常设计，不泛化成全站路由坏。**影响：** 无钱包首次理解和文档演示入口不稳定。

**最小修复：** 新增明确只读#/verify、#/evidence、#/demo路由；保留当前链/部署/invoice/tx校验；导航从route派生，不引React Router。**验收：** 直开、刷新、前后退正确；非法pay仍不发wallet/RPC；模拟业务不请求钱包/RPC、不发送交易且标签保留；receipt旧结果隔离不退化。**授权/估计：** 私有代码45–90分钟，浏览器20–40分钟。**回退：** 路由提交可单回退，材料暂不使用不可达链接。**停止：** 不为深链便利允许unknown部署或自动切链签名。发布可访问性仍由REL-01单独验收。

### NEW-UI-03：低对比文字与主按钮

**证据/条件：** DashboardScreen.tsx:172启用按钮白字text-sm/bg-teal-600；113/121/140/158/165辅助正文stone400，tailwind没有颜色override。[C17] 按默认sRGB计算，白/teal600 #0D9488=3.744:1；stone400 #A8A29E/白=2.522:1、对stone50=2.415:1。对应14px/12px正常文字低于WCAG 4.5:1；停用控件不纳入此判断。[R15]

**修复：** action改#0F766E，白字5.473:1；有意义muted改#57534E；状态颜色配文字/图标，保留focus。**验收：** 实际computed style、正常/hover/focus及375/768/1440和200%缩放；正常文字≥4.5，重要非文字控件≥3，不能只检查token后宣布整站WCAG通过。**范围/工时：** 15–30分钟样式，20–40分钟视觉键盘；无新增依赖。**回退：** 样式独立；若主题覆盖使计算不成立，先取实际颜色再裁定。当前是源码token证据，不是截图验收。

### UX-01：收据诊断先于用户需要的付款事实

**证据：** ReceiptFacts.tsx:28–47先reason/source/timestamps/checks，51–67才amount/merchant/payer/time/fee；SavedTransactions在Layout:79–94对已有hash持续用amber。[C08][C10]

**条件/影响：** 新复核者先读工程诊断，难在30秒回答金额/收款方/是否已结算；已完成记录像未解决警报。不是资金核验缺失。**最小修复：** E章阅读结构；只有unresolved醒目，included/reverted留中性历史；不删除记录、不改状态。**验收：** 用户无需钱包在30秒正确回答金额/网络/收款方/结论及一个限制；unknown无绿勾；诊断和失败原因可展开/打印。**测试：** 所有状态表、长地址/金额、读屏/键盘。**工时：** 1.5–3小时展示与验证；不改核验器。**回退/风险：** 组件提交独立；聚合check若把not_run变passed立即停，保留原详细视图。

### DOC-01：新旧结果与运行身份混读

**证据：** README/STATUS已声明391及旧文档保留；AUDIT_CLOSURE_MATRIX尾部仍375/local only；EvidenceScreen:18–45/64–82固定G1/73/in progress，缺运行SHA；四份bookkeeping保持旧版。[C11][C12][C14][C18]

**影响：** 评委误以为73与391冲突、旧local only证明没推送、或current code自动获得旧Argon背书。**最小修复：** 增当前证据索引（日期、SHA、环境、命令、scope、原日志链接），旧材料前加历史说明并链接current；不把历史73改成391，不擦掉失败。**验收：** 最新结论只有一个入口；每个计数可落到日志与版本；UI显示实际build identity或Unknown。**工时：** 45–90分钟；无需发布。**回退：** 新索引/dated correction独立；不用回写旧原始日志。**残余：** 版本标签由构建产生仍需host一致性证据，不能自证代码真的被托管。

### QA-01：代码门禁与运行门禁未同版本闭合

**证据：** B4/B5实测阻塞；无workflow/runs；STATUS明确真实浏览器、RPC、Studio、部署等未验收；QUALITY_GATES:55–57的CI仅inactive example。[C12][C18]

**影响角色：** 实施者/评委；容易拿jsdom代替真实浏览器、通用EVM代替Arc，或历史计数代当前构建。**最小修复：** 在获准零费环境按锁恢复，跑最小针对回归+必要全门禁；真实浏览器、raw RPC和双钱包分别记录。不要因环境问题改锁/降断言。**验收：** G章各层有PASS/FAIL/BLOCKED且绑定同SHA；原命令/环境/时间/exit/log可复查。**授权：** 本地无副作用工作在后续私有任务内；收费CI、实际签名/部署需另批，不自动启用Actions。**估计：** 可用环境自动门禁1–2小时；浏览器/导出1.5–3小时；人类钱包30–60分钟另计，不保证外部等待。**回退：** 保留可验证补丁与BLOCKED日志；若失败不能解释，停止发布/演示通过声明。

### DEP-02：剩余advisory要按路径处理

具体包见D5。**前提/影响：** 漏洞包版本确实存在；攻击输入是否到相应函数/生产bundle/签名路径尚未全部证明。不能把npm audit数量当已可利用漏洞。

**最小修复：** 先核runtime import graph与调用参数，再做父依赖兼容更新/移除不使用钱包链路或限定开发暴露；有补丁的按上游兼容版本更新，无补丁保留明确残余。**不做：** 不为清audit一键major override，不降viem/Vite，不改nonce，不随意polyfill crypto。**回归/验收：** frozen安装、构建、钱包连接/审阅/只读核验、production chunk diff；记录advisory→路径→输入→措施。**估计：** 1–3小时有界检查；若触发大SDK迁移另开任务，超额则仅缓解与披露。**回退：** 锁/父依赖小提交；不以恢复漏洞版本作为发布默认。**残余：** 无补丁和未知调用条件持续列明。

### IP-01：许可与公开范围尚未决定

**证据：** LICENSING_BOUNDARY:3–17明确无根LICENSE/NOTICE授权；合约MIT头不覆盖前端、Studio素材、品牌和其他依赖。[C19] **条件/影响：** 如果规则要求公开源码或要发布产品，现有私有审查权限不等于发布权；当前不能宣称整仓MIT。未发现侵权事实，问题是权利清单和选择未完成。

**修复：** 首方/Studio来源/外部代码/图标/字体/文档逐类盘点，保留原许可；用户决定自己的文件许可、署名、品牌排除和公开范围，再形成release包。**不做：** agent不接受条款、不默认全MIT、不删Studio署名。**验收：** 每项来源与许可/NOTICE可追溯；未核内容不进入公开包；规则要求的评委可见性已满足。**估计：** 45–90分钟清单，用户决定/外部权利确认另计且不可估时。**回退/停止：** 保持私有；权利/规则冲突未解即不公开或提交。

### QA-S01：测试注释/命名把有限断言说得过满

**证据：** contracts/test/ArcProofInvoices.t.sol:964–969称Paris selfdestruct不随外层revert回滚，表述错误；IndependentBalanceReview.t.sol:12–29的测试源码已包含完整余额/状态回滚断言；本轮未运行该Forge测试。1059–1071的test_T17_ozVersionPinned只验证guard storage初值，不是精确OZ版本证明。[C20][R16]

**影响：** 误导后续维护和审查，不是已证实资金漏洞，也不是缺少全部回滚测试。**最小修复：** 更正当前注释/测试名，引用已有独立回归；版本身份由锁文件/安装包/编译input证明。保留历史日志。**验收：** 安全断言不变；不再用slot0==1宣称5.1.0被鉴定。**工时/授权：** 15–30分钟私有质量修补。**回退：** 独立文档/名称提交；不扩大成合约重写。

## D5. 当前依赖advisory与真实可达性

本轮重新读取官方GHSA并对照bun.lock；没有成功重新安装，因而这不是新npm audit结果，也不是动态exploit。锁文件证据：braces L682、decode-uri-component L802、elliptic L838、postcss-selector-parser L1204、uuid L1424/L1530，Vite L1430、Vitest L1434。[C21]

| 锁定包 | 当前官方公告 | 影响条件/范围 | 本项目证据与行动 |
|---|---|---|---|
| braces 3.0.3 | GHSA-vfj7-8cjw-p6xm，≤3.0.3，无已列补丁[R20] | 深度glob触发栈/资源耗尽 | Tailwind/chokidar/micromatch开发构建路径；未证明付款URL可达。约束非可信构建输入，等父依赖可用升级 |
| decode-uri-component 0.2.2 | GHSA-vcc3-ghjq-m6fr，≤0.4.2，补丁0.5.0[R21] | 恶意URI造成CPU耗尽 | WalletConnect/query-string相关依赖；当前注入钱包配置不自动证明该输入可达。父依赖升级优先，不盲目0.5.0 override |
| elliptic 6.6.1 | GHSA-848j-6mx2-7j84，≤6.6.1，无已列补丁[R22] | 特定ECDSA使用条件的密钥风险 | 历史crypto-browserify图存在；当前配置无该crypto alias，归档bundle分析未发出该路径。不等于钱包私钥已可被页面读取 |
| postcss-selector-parser 6.1.4 | GHSA-rj75-hqrm-r3gf，<7.1.6，补丁7.1.6[R23] | 特制CSS selector资源耗尽 | CSS开发路径；核父级兼容后更新，不把开发DoS等同线上本金风险 |
| uuid 8.3.2/9.0.1等 | GHSA-w5hq-g745-h8pq，相关旧分支受影响；修复11.1.1/12.0.1/13.0.1[R24] | 特定v3/v5/v6且提供buffer等条件 | 不等于所有uuid函数；需定位函数与参数。无调用证据则列残余，不能声称已利用 |

依赖整改应保存package/lock diff和生产bundle before/after。历史WalletConnect/Reown图计数不证明运行时执行，也不能证明无风险。DEP-01中已确认的Vite 6.4.4/Vitest 4.1.12锁定版本迁移与这些残余分开，不能用旧审查重复指认已移除版本。

## D6. 原16问题逐个复核

下表“已复核关闭”只关闭原问题定义中的明确子范围，不表示全产品/真实部署通过；原完整外部报告未单独取得，边界依据仓库可见matrix和对应材料。没有继承旧优先级。

| 原ID | 本轮分类 | 实际复核与关闭条件 |
|---|---|---|
| RULE-01 | **证据不足** | 规则正文/时区/主体/发布要求未齐；按C矩阵补官方快照后判定 |
| REL-01 | **证据不足** | 测试网实现存在；当前Studio/评委运行版本与源码一致性未证明，主网部分按规则另定 |
| FLOW-01 | **部分修复** | 发送前持久化、锁、成功create结清、已知hash恢复存在；SEC-R01独立新缺陷及浏览器生命周期仍待验 |
| SEC-01 | **已复核关闭：源码所指旧日志/消息转发路径** | 当前src未见活跃旧postMessage/console捕获；部署网络/headers/运行无泄漏仍待实测，不扩大关闭范围 |
| DEV-01 | **已复核关闭：开发服务器配置子项** | host收窄loopback、CORS false；不代表真实公网托管或所有依赖已安全 |
| UX-01 | **部分修复** | loading/error/unknown及事实来源已有区分；人类阅读顺序/无钱包入口/视觉验收仍不足 |
| DOC-01 | **部分修复** | 当前README/STATUS有最新计数与历史边界；尾部旧计数及四文件保留、规则与版本材料还需统一索引 |
| DEP-01 | **部分修复：锁定版本迁移已确认** | Vite6.4.4/Vitest4.1.12在lock中；当前安装/完整回归未完成，不宣称整体依赖安全；残余见DEP-02 |
| STATE-01 | **已复核关闭：非success/reverted误归类子项** | receiptStatus实际纯模块异常输入保留unknown；不能延伸为恢复身份已正确 |
| EXPORT-01 | **部分修复** | scope绑定、facts来源、精确字符串已验证部分；下载/Excel/Sheets/打印NOT_RUN |
| UI-02 | **部分修复** | 已有正常流署名、语义、焦点和打印样式；375/768/1440px、200%缩放、真实键盘/对比/打印/下载仍未验收；静态class不能代替浏览器 |
| UI-03 | **已复核关闭：非法/不支持链接立即只读拒绝子项** | 静态入口与既有回归支持；尚未在浏览器验收，不能允许trust anyway |
| DEMO-01 | **已复核关闭：fixture一致性/模式标记子项** | fixture身份/数据路径与live分开；重建观察明确注释；不证明实时RPC或主网 |
| DEP-02 | **部分修复** | advisory路径说明改善，仍有当前锁版本命中；按D5逐路径处置 |
| QA-01 | **部分修复** | 有历史lint/type/service/UI日志和纠错说明；本轮完整环境blocked、无remoteCI、浏览器/钱包未验 |
| IP-01 | **仍存在：许可决策未闭合** | 明确许可边界是进步，但不等于权利/许可已选择；用户决定和release清单必需；不是认定侵权 |

**原结论不成立的独立纠正：** 外层txHash key曾被说成修复了已复现的旧stale-input漏洞；有日期的纠正已撤回该说法。原内层TestnetReceiptFields key已按invoiceId/txHash重挂载；当前外层key属纵深防御。定位TestnetScreens.tsx:293–294、dated-correction.json:3–5、STATUS.md:23。[C09][C24][C12] 原外部完整报告未取得，不擅把这个叙述归入旧UI-02；也不因此关闭其他异步/用户体验验收。

**不升级的问题：** deduplicateReceipts对null tx/log的潜在碰撞未发现生产调用，应放未来批量导出前的P3；demo detached anchor立即revoke有浏览器兼容待验，不说已证实下载失败；无静态证据说当前打印必被截断；single-RPC信任已披露，不能伪装成新发现漏洞。


---

# E. 产品与 UI 完整方案

## E1. 目标用户、唯一主任务和价值边界

**目标用户：** 集成Arc原生USDC付款的开发者，以及需要复核某一发票资金证据的人。尚未证明普通商户愿意付费、需要更换现有工具或能把它用于生产账务。

**一个具体任务：** 在受控测试中创建0.20 test USDC的固定请求，交给第二个受控EOA付款，再由不连钱包的第三个浏览器会话打开收据，判断金额、双方、原生转付和最终性是否都匹配，并导出原始整数与证据范围。真实两钱包步骤尚未本轮验收；必须标待验，不能把脚本当完成录像。

| 角色 | 困难 | 本轮应交付的价值 | 不应承诺 |
|---|---|---|---|
| 收款方 | 金额/收款人容易在聊天中混淆，付款hash难与请求对应 | 固定链上发票、准确分享链接、已付状态和证据入口 | 完整商业发票、税务、客户管理、自动退款 |
| 付款方 | 钱包弹窗难说明业务意图，不知道重试是否安全 | 签名前明确网络/金额/完整商户/费用，未知时禁止重发 | 法律收款人身份、退款保证、所有智能钱包兼容 |
| 复核者 | Explorer要人工连接调用、日志、发票与finality | 无钱包阅读、明确通过/缺失检查、精确JSON与可复查链接 | 商业交付、真实客户、营收、独立共识证书 |

**为何Explorer不够：** Explorer是底层数据入口；ArcProof应减少“这条交易对应哪张发票、是否到了这个收款人、两个原生腿是否齐、最终性来自哪里”的人工推理。它仍依赖RPC数据，不能宣称比链本身更权威。仅编码收款地址和金额的链接，通常不能单独提供发票、调用、转付日志与最终性的完整绑定；成熟支付平台的链接另含状态与财务功能，见E2。ArcProof当前应避开全面替代它们。

## E2. 三个相关替代品的当前官方比较

检索日均为2026-10-21；未登录/实付竞品。以下只陈述可读官方功能；没找到某功能不等于不存在。

| 替代品 | 当前官方功能证据 | ArcProof必须承认的差距 | 可选择的窄定位 |
|---|---|---|---|
| Request Finance | 发票/客户及付款字段、链上request、付款自动匹配并更新状态；官网也明确双付检测[R12] | 链上请求、付款关联、状态更新和双付检测/防范均已有成熟产品；本轮未比较其合约级单次付款或未知请求恢复保证 | 专注某一Arc发票的底层证据解释和轻量复核 |
| Stripe稳定币支付 | 官方支持Payment Links、Invoicing、Checkout/Elements、退款及订阅等，商户支持范围有限定[R13] | “能收USDC/发链接/给收据”不足差异化，不能说对方无退款 | 直接商户转付、无账户只读核验作为本项目设计目标，不声称全球合规可用 |
| Coinbase Business Checkouts | 官方提供单次checkout URL、webhook、全额/部分退款，需要Business账户[R14] | 链接、一次性付款、通知都不是独有；没有理由本届补齐平台 | 聚焦可解释协议证据；不补账户系统/退款后台 |

本轮没有完整核对三个产品的Arc链支持矩阵，**不写“竞品都不支持Arc”**。ArcProof的机会是一个清楚可复现的小工具，而非在没有用户证据时宣称更适合所有商户。

## E3. 两种策略与明确选择

| 策略 | 收益 | 成本/新增风险 | 选择 |
|---|---|---|---|
| 完善原有原子闭环与证据解释 | 评委能看到真实代码的价值、确认限制、重开链接复核 | 局部状态/UI/证据/验收工作；无需新资金流 | **主方案** |
| 增加“导入JSON并重新读链核验” | 复核者可携文件继续工作，形成有限差异化 | 外部文件/schema、恶意字符串、跨部署、错误信任verified字段新边界；现有ID/hash入口已能完成核心任务 | **本届暂缓**；所有门禁通过后才另立任务 |

不要把两套全叠加。若官方主网硬要求确认，主网适配与证据优先于可选新功能和UI精修。若授权/工时不够，停止本轮参赛而保留技术展示，不通过提高风险“赶完”。

## E4. 保留、删减、增强

| 分类 | 项目 | 对应用户痛点/标准 |
|---|---|---|
| A 必须解决 | RULE/REL/QA/IP的实际提交门槛；SEC-R01；分享误反馈 | 资格、准确付款/恢复、可演示可信度 |
| B 低成本高感知 | 收据结论优先、copy scope、对比度、只读深链、build identity | 首访理解、可复查性、完成任务；没有编造官方UI分值 |
| C 本届不做 | JSON导入复核、第二RPC一致性、更多钱包、商户研究/账务集成 | 有价值但扩大输入/维护范围；尚无验证需求 |
| D 删除/收缩/停止 | 无输出的demo Title；首屏工程计数堆叠；“trusted receipt=收入/交付”表述；已完成记录持续警报 | 减少误导和操作噪声 |
| 保留 | 精确整数、manifest/runtime、严格finality、unknown锁、只读核验、历史原始失败、Studio attribution | 核心安全与来源可信度 |
| 禁止本轮新增 | escrow/vault/rescue/owner/升级/平台抽成/自动退款/Agent花钱/随意提高限额 | 超出既定资金与授权边界 |

## E5. 八步闭环与必须出现的状态

| 阶段 | 当前源码支持/缺口 | 改后用户可理解的结果 |
|---|---|---|
| 创建 | 有金额、有效期、review、持久intent、确认及历史 | “创建请求”与“收款成功”分开；无钱包可转只读核验 |
| 分享 | 可信链/部署/ID进入链接；copy反馈缺scope | 每次复制属于当前invoice；失败可打开链接手动复制 |
| 打开 | 非法/不支持链或部署立即只读拒绝 | 金额/网络/商户先出现；无“Trust anyway” |
| 理解风险 | 支持预审、费用准备、EOA/terms限制 | 完整收款地址、金额、expiry、fee、无退款含义紧邻钱包前确认 |
| 支付 | 单次发送、上下文失效检测 | review不等于签名；明确“Open wallet”才触发请求 |
| 等待 | hash/unknown分离 | 实际步骤文本，无百分比/伪倒计时；只读重查可重试，写入不自动重试 |
| 核验 | 较完整字段/结算/finality绑定 | 结论+观察金额+已通过/缺失事项；unknown不绿勾 |
| 导出/复核 | scope及精度代码存在，应用层未验 | JSON/CSV/PDF状态与金额一致，第二会话重新读链，不信缓存背书 |

建议显示状态（是展示规范，不能替代当前底层状态机）：

| 状态 | 首要文案 | 主动作 | 禁止行为 |
|---|---|---|---|
| 无钱包 | “Connect to create or pay. Verification does not require a wallet.” | Verify a receipt | 强迫读收据者连接 |
| 未付款 | “Unpaid payment request” | Review test payment | 看见invoice即显示paid |
| 已付款 | “Payment recorded — verify evidence” | Verify receipt | 再次付款按钮 |
| 钱包待响应 | “Waiting for your wallet” | 查看已保存请求 | 虚构上链进度 |
| 已有hash待核验 | “Transaction submitted; payment not yet verified” | Read evidence | hash=success |
| hash未知 | “Outcome unknown. Do not send again.” | 查看钱包历史/只读帮助 | 超时解锁、清缓存建议 |
| 确定revert | “Transaction reverted. Network fees may have been spent.” | 查看交易与原因 | 说费用也已全退 |
| RPC/finality缺失 | “Not verified — evidence is incomplete.” | Retry read | 自动补字段/变绿 |
| 链/部署无效 | “Unsupported network / Unknown deployment” | 要求完整链接 | 自动信任任意合约 |
| 离线模拟 | “OFFLINE SIMULATION — no payment occurred” | 查看模拟数据结构 | 与live统一绿色证明标签 |

## E6. 视觉方向与设计tokens

**方向：清楚、可复核的付款凭证。** 延续米白、深色文字和青绿色，以阅读顺序建立可信感：环境→结论→金额→双方→证据→下一步。不要新增无意义渐变、多层卡片或醒目的工程术语墙；完整诊断保留在可展开区域。

| Token | 具体值/规则 |
|---|---|
| Canvas / surface | #F7F7F2 / #FFFFFF |
| Text / muted | #1C1917 / #57534E |
| Border / input border | #D6D3D1 / #78716C；真实渲染校验非文字对比 |
| Primary | #0F766E；hover #115E59；白字 |
| Verified | text #115E59、surface #F0FDFA；只在完整结算成功条件满足时用勾号 |
| Unknown / pending | text #78350F、surface #FFFBEB；必须写具体未证事实 |
| Failed | text #991B1B、surface #FEF2F2；区分revert与未读到证据 |
| Fixture | text #57534E、虚线边界#78716C、持续SIMULATION标记 |
| 字级 | body16/24；label14/20；caption12/18；h1 28/36；金额40/48，手机32/40；原始字段13/20 monospace |
| 间距 | 4/8/12/16/24/32/48；面板padding24，手机16；主模块间24–32 |
| 圆角 | input/button8；panel12；status6 |
| 栅格/宽度 | app shell1040；付款/收据640；证据页960；不为了填满桌面铺四列 |
| 响应式 | 375边距16；768边距24；1440边距32；<640主按钮全宽，按钮组可换行 |
| 控件 | 高度至少44px；长地址可换行且可复制；完整商户地址在签名前可见 |
| Focus | 3px #0F766E，offset3；不得用outline:none掩掉 |
| 字体 | 保留系统fallback/已有字体；断网字体失败不溢出；不为装饰添在线依赖 |

200%缩放必须用浏览器真实缩放而非只改viewport。按钮、状态和金额不能横向溢出；不可用颜色代替文本。普通文本对比至少4.5:1、关键控件/焦点对比按3:1检查，是可访问性验收尺度，不是竞赛权重。[R15]

## E7. 逐页实施结构、模块和验收

### 创建页

**当前问题：** 默认直接进入需要钱包的创建路径；termsHash等工程信息与主要操作竞争；连续创建复制状态不正确。

**改后结构：**

1. Create a testnet payment request + 单句用途。
2. Arc Testnet · test USDC 环境条；“single request up to 1 test USDC”。
3. Amount、Expiry；完整merchant只读字段；金额/有效期即时错误与aria-invalid。
4. Review；预审区域出现时焦点到标题，Cancel返回触发按钮。
5. 创建成功摘要→当前invoice的Copy payment link→历史请求。
6. 无钱包说明和Verify a receipt / Offline simulation入口。

**文件/边界：** TestnetScreens.tsx、现有共享样式；只改展示、复制scope、聚焦。保留prepareCreate/sendPreparedAction/confirmCreatedInvoice。**验收：** 0、7位小数、>1、空、有效期边界；过期review不可直接发送；创建A/B复制正确；创建成功不称收款成功。

### 付款页

**当前问题：** 原始ID/错误容易盖过金额、收款方和下一步；预审与钱包请求阶段不够直观。

**改后结构：** 环境→Payment request→大金额→完整收款方→expiry UTC→状态→Review test payment；review列network/recipient/amount/estimated fee/资金准备，最后Open wallet。已付只给核验，过期不付款，未知不给重发。

**文件：** TestnetScreens.tsx的TestnetPaySession/Review；不改service验证。**验收：** 切链/切账户使review失效；拒签、晚返回、RPC失败只显示事实；一个有效点击只触发一次发送；无虚假倒计时或隐藏费用。

### 收据/核验页

**当前问题：** ReceiptFacts工程诊断先于金额。**改后结构：**

1. 环境和最终结论：Verified testnet payment / Not verified。
2. 金额、merchant、payer、付款UTC时间、单列fee。
3. 三组摘要：Invoice and transaction match / Native transfer legs / Finality。
4. 未通过的具体事实及安全下一步；成功也保留范围限制。
5. Copy verification link、Export JSON；CSV/Print为次级。
6. Evidence details：完整checks、reasonCode、RPC来源/读取时间、block/hash/logIndex、policy。
7. “Covers on-chain payment only; not delivery, legal identity, refunds, or revenue.”

**文件：** ReceiptFacts.tsx、TestnetReceiptFields、exportUtils只在确需展示辅助时读取现有字段；如抽内部StatusSummary/EvidenceCheckList/AddressValue，它们是**建议新增组件名称**，不是声称现有文件。不要另读invoice拼接旧record金额。

**验收：** 成功predicate完全保留；not_run/unavailable不能汇总成passed；scope切换不导出旧数据；同record在JSON/CSV/PDF金额和状态一致。打印展开必要诊断，不用整页break-inside:avoid；长字段自然分页。

### 无效/错误页

**现有值得保留：** 不支持链/部署/ID立即进入只读拒绝。**改后：** 第一行具体原因；主要动作Request the complete link from the sender；参数在details。**文件：** App.tsx/UnavailableRequest。**验收：** 无钱包请求、无任意部署信任入口、键盘可离开、URL文本不作为HTML执行。

### Evidence页

**问题：** 历史73/G1标签不表示正在运行的版本。**结构：** 当前build identity→本轮已验/历史/未验表→日志和rules source→已知限制→技术细节。**文件：** EvidenceScreen.tsx及建议新增build/evidence manifest（路径由dot按项目结构决定）。

**验收：** 运行SHA、build UTC、chain、deploymentId、artifact/runtime预期值可复制；unknown不填假值；73合约与391前端不同套件不相加不互改。规则HOLD在Evidence说明；普通付款页仅保留相关风险信息。

### 模拟页

**结构：** 独立#/demo入口；每屏持续模拟标签；已有金额/状态演示保留，删除无实际输出的Title或明确仅本地标签。**文件：** App.tsx、DashboardScreen.tsx、DemoReceipt.tsx。**验收：** 模拟业务不触发RPC/钱包或交易；现有Google Fonts等资源加载不等于业务链上调用，不能宣称零总网络；导出名/内容/打印都标fixture；统一真实download helper后用浏览器验证；不移除Studio attribution。

## E8. 优先三个界面细节与精确文案

1. **收据首屏：** “Not verified”下直接写“Finality could not be established. Observed amount: 0.20 test USDC.” 观察金额不能用已结算绿色样式。不要把reason code当主标题。
2. **分享反馈：** 初始“Copy payment link”；仅当前复制成功“Link copied for invoice …4A2C”；失败“Copy unavailable. Open the payment page and copy its address.” 新invoice立即回初始状态。
3. **未知请求：** “A matching payment was found for this invoice. The original wallet request is still unidentified. Do not resend it; check wallet history.” 只给独立查看该付款按钮，不能把原intent称recovered。已结清历史收在中性details，未知保留amber。

英文为评委默认稿；中文文档可完整解释，避免界面一句塞双语。日期显式UTC，可附本地时区；币种必须区分test USDC与USDC，原始整数和显示金额都保留。

## E9. 成熟组件复用、许可与体积

本轮优先现有React/Tailwind/Lucide和原生button/label/details，不换整套框架。以后需要真正modal才按需引入Radix Dialog；可参考shadcn少量组件，但复制后维护责任留在项目。Radix和shadcn官方许可证是MIT；Lucide是ISC，部分Feather来源另含MIT条件。[R17][R18][R19] 保留原声明，不将这些许可推成整仓许可。

不虚构“新增x kB”。建议展示层新增生产gzip JS预算≤10 KiB，超出给出实际bundle diff和原因；这是工程控制，不是官方要求。当前基础包较大，减少未使用钱包生态链路比堆组件更有价值，但SDK重构不能挤占本轮核心安全验收。

---

# F. 可直接交给 dot 的实施 backlog

## F1. 计划规则、依赖和授权边界

**本轮只交方案，未实施下列项目。** dot必须先核实结论、重新读取main；用户后续给出的私有代码/文档实施委托可覆盖相应可逆工作。此报告本身不扩大其授权，不允许部署、签名、资金、公开发布、提交、接受协议或外部联络。

仓库AGENTS/STATUS保留**总工程18小时上限且累计尚未对账**。[C22][C12] 下列“4小时+1天”是可选择的估算包，不是新的12小时授权，也不表示已有剩余额度。先核累计；不足则裁掉可选路由/美化/依赖迁移，不能通过重置账本绕过上限。

依赖顺序：GATE-01→SAFE-01/SHARE-01→局部验证；ENTRY-01/VIEW-01可以在安全补丁稳定后并行；QA-01与TRACE-01证明候选版本；只有规则确需主网且预算足够才走NET-01；RELEASE-01完成许可与材料后仍停在受限动作之前。

每批独立提交前都固定base、复核diff、运行针对性回归，记录候选SHA。后续若已有推送授权，使用**expected_sha的非强制更新**并回读远端；expected_sha过期则取新main合并/重验，禁止覆盖他人改动。工具没有比较交换/非强制保护时不能用无条件覆盖替代。

## F2. 任务卡

### GATE-01 — 规则、基线与剩余额度

~~~yaml
task_id: GATE-01
linked_finding_ids: [RULE-01, REL-01, IP-01, QA-01]
priority: P1
objective: 确定本轮参赛路径和实际可用工程预算
scope_in: 当前main差异、官方完整规则快照、时间/时区、个人适用字段、累计工时核对
scope_out: 登录代办、协议接受、主办方联络、发布、提交、签名
files_or_modules: [STATUS.md, docs/AUDIT_CLOSURE_MATRIX.md, docs/LICENSING_BOUNDARY.md, evidence/effort-ledger.json]
implementation_steps:
  - 读取main完整SHA并对照本报告基线，不套用旧行号
  - 取得规则全文及时间栏，按C矩阵记录来源/未知
  - 只根据实际规则确定需要本人补充的信息
  - 对账18小时累计，记录剩余；不回填虚构工时
regression_tests: 规则轮次/URL/日期一致性检查；历史日志与当前结论链接检查
acceptance_criteria: 每项门槛有原文或unknown；形成可参赛/技术展示/待证三选一结论及停止条件
dependencies: 无
permission_needed: 只读与私有整理在后续委托内；本人身份/条款决定由用户；任何发布/资金另批
estimate_range: 20–45分钟人工；外部材料等待不确定
rollback: 新增dated decision，保留旧规则快照与原始工时记录
stop_condition: 规则禁止、公开范围不能满足、累计超限则停止参赛路径；继续允许的可逆收尾
~~~

### SAFE-01 — 无hash请求身份修复

~~~yaml
task_id: SAFE-01
linked_finding_ids: [SEC-R01, FLOW-01]
priority: P1_before_recovery_demo
objective: 不把另一笔匹配交易归因为原未知请求完成
scope_in: hashless恢复分支、只读匹配付款展示、对应状态文案与回归
scope_out: 合约、nonce管理、自动重发、替换/取消、存储清空、主网
files_or_modules:
  - src/arcproof/walletIntents.ts
  - src/arcproof/testnetClient.ts
  - src/components/arcproof/Layout.tsx
  - src/arcproof/__tests__/walletIntents.test.ts
  - src/arcproof/__tests__/testnetClient.test.ts
implementation_steps:
  - 在新基线用实际模块反例确认现状并保留before日志
  - 无hash请求保持uncertain，不将候选付款hash写为原请求hash
  - 将匹配付款单独送只读核验页面
  - 保留已知hash严格恢复和成功create确认结清
regression_tests: hashless匹配仍unknown；known hash成功/revert；hash不符拒绝；同invoice零重发；只读核验不写intent；下一张创建可继续
acceptance_criteria: 没有唯一原请求证据就没有recovered声明或未知锁释放
dependencies: [GATE-01, 可执行的针对测试环境]
permission_needed: 后续私有代码委托即可；真实钱包/资金另批
estimate_range: 编码及针对回归1–2小时；真实钱包人工另计
rollback: 独立提交；安全回退为隐藏hashless恢复入口并保留unknown
stop_condition: 方案需要清缓存、自动重发、控制nonce或降低身份/finality断言则停止该方案
~~~

### SHARE-01 — 复制反馈绑定发票

~~~yaml
task_id: SHARE-01
linked_finding_ids: [NEW-UI-01]
priority: P2
objective: 用户看到的复制成功只属于当前链接
scope_in: copiedInvoiceId、异步操作版本、失效和错误反馈
scope_out: 付款参数、prepared action、持久意图、合约和SDK
files_or_modules: [src/components/arcproof/TestnetScreens.tsx, 对应现有组件测试]
implementation_steps:
  - review/created/session变化使复制结果失效
  - 复制前捕获当前invoice和版本，成功回调重新核对
  - 失败清除旧成功并给安全替代操作
regression_tests: A复制后B创建；迟到A；B拒绝；账号切换；卸载
acceptance_criteria: B未复制成功前绝不显示Link copied；实际clipboard文本等于B的URL
dependencies: [GATE-01]
permission_needed: 后续私有代码委托即可
estimate_range: 编码20–40分钟，验证15–30分钟
rollback: 单独展示提交；暂取消持久成功标志也可，不能保留假成功
stop_condition: 修复影响wallet send或请求身份时拆回展示层
~~~

### ENTRY-01 — 可重开的只读入口

~~~yaml
task_id: ENTRY-01
linked_finding_ids: [NEW-UI-02, UX-01]
priority: P2
objective: 评委可直接进入核验、证据或明确模拟，无需钱包
scope_in: verify/evidence/demo路由及导航一致性
scope_out: 新路由框架、任意部署信任、自动连接钱包、后端
files_or_modules: [src/App.tsx, src/components/arcproof/TestnetScreens.tsx, 导航相关组件]
implementation_steps:
  - 在现有hash parser中定义只读路由
  - 导航状态从route派生并支持刷新/前后退
  - 保留pay/receipt全部身份检查与内层key
regression_tests: 三路由新会话/刷新/前后退；invalid pay无RPC/wallet；模拟业务无钱包/RPC/交易调用，浏览器核查无业务链上请求；receipt切换旧结果隔离
acceptance_criteria: 三个稳定URL进入正确页面且无自动签名行为
dependencies: [GATE-01, SAFE-01稳定后的候选版本]
permission_needed: 私有代码；外部host/Studio更新另批
estimate_range: 编码45–90分钟，浏览器20–40分钟
rollback: 路由独立提交；材料撤回不可用深链
stop_condition: 为演示放宽chain/deployment/invoice判断时停止
~~~

### VIEW-01 — 收据层级、对比、焦点与打印

~~~yaml
task_id: VIEW-01
linked_finding_ids: [UX-01, NEW-UI-03, EXPORT-01]
priority: P2
objective: 无钱包访客30秒看懂结果和限制
scope_in: E章tokens、事实优先、状态文案、未解决/历史分区、可访问性、打印
scope_out: 证据算法、成功predicate、资金路径、新UI框架、品牌重做
files_or_modules:
  - src/components/arcproof/ReceiptFacts.tsx
  - src/components/arcproof/Layout.tsx
  - src/components/arcproof/TestnetScreens.tsx
  - src/components/arcproof/DashboardScreen.tsx
  - src/components/arcproof/DemoReceipt.tsx
  - src/index.css
implementation_steps:
  - 先修action/muted对比，不改业务状态
  - 按环境/结论/金额/双方/证据/下一步重排
  - unresolved警报与结清历史分开但不删除
  - 补label、焦点、aria状态；打印展开必要诊断
  - 真下载共用安全helper，保留fixture标记
regression_tests: 375/768/1440、200%缩放、键盘/读屏、长字段、全状态、JSON/CSV/PDF一致
acceptance_criteria: 普通文字4.5:1；无横向溢出/遮焦点；未知无绿勾；重要证据打印不丢
dependencies: [SAFE-01, SHARE-01]
permission_needed: 私有代码及本地浏览器即可；真实钱包额外批准
estimate_range: 编码1.5–3小时，浏览器/打印1–2小时；可拆最小对比子批次
rollback: 展示/样式独立提交，保留原始诊断视图
stop_condition: 聚合检查把not_run/unavailable变passed、金额丢精度、成功条件变化立即停止
~~~

### QA-01 — 可复现候选版本验收

~~~yaml
task_id: QA-01
linked_finding_ids: [QA-01, EXPORT-01, FLOW-01, REL-01]
priority: P1
objective: 对同一候选SHA取得分层门禁证据
scope_in: 固定工具/锁、脚本副作用检查、针对回归、build/lint/typecheck、必要全套、浏览器/raw只读验证
scope_out: 调用付费模型/Key、盲目lifecycle脚本、收费CI、主网写入
files_or_modules: [package.json, bun.lock, foundry.toml, docs/QUALITY_GATES.md, 现有测试与审查证据目录]
implementation_steps:
  - 固定Bun/Foundry版本；检查脚本和依赖生命周期再安装
  - 先跑受改动影响的有意义反例；再满足发布门禁
  - 截图/录屏、下载/PDF和raw RPC分别保存，不合并成一个通过
  - 记录命令、工具版本、开始结束UTC、exit、原日志、SHA及缺口
regression_tests: G章清单；服务旧suite需核断言语义，不能只改expected使变绿
acceptance_criteria: 每层PASS/FAIL/BLOCKED可复查；不将历史结果或jsdom升级为运行验收
dependencies: [SAFE-01, SHARE-01, 选定的ENTRY-01/VIEW-01]
permission_needed: 获准无费本地环境；任何CI收费、钱包签名、真实资金须另外批准
estimate_range: 自动门禁1–2小时；浏览器/导出1.5–3小时；人类钱包30–60分钟另计
rollback: 保留失败与NOT_RUN；可退候选补丁但不删除原日志
stop_condition: 无干净安装或关键回归失败时停止发布/完成声明；只保留补丁与阻塞原因
~~~

### TRACE-01 — 构建身份和当前证据索引

~~~yaml
task_id: TRACE-01
linked_finding_ids: [DOC-01, REL-01, QA-01]
priority: P1_before_demo
objective: 让评委页面、代码和证据指向同一版本
scope_in: build SHA/UTC/chain/manifest/artifact字段、current索引、历史注释
scope_out: 伪造缺失hash/测试结果、改写原始失败、远端部署
files_or_modules:
  - src/components/arcproof/EvidenceScreen.tsx
  - README.md
  - STATUS.md
  - docs/AUDIT_CLOSURE_MATRIX.md
  - docs/QUALITY_GATES.md
  - 建议新增的build/evidence identity模块
implementation_steps:
  - 构建时注入真实来源SHA与manifest版本，未知保留Unknown
  - 区分历史73合约、历史391项目、本轮候选测试和真实网络验收
  - 最新索引链接到原始日志；旧bookkeeping标历史不抹除
  - 生成artifact hash，后续用户批准部署后独立访问核对
  - 两受控钱包演示另记scenario=controlled_two_wallet_demo、walletControl=presenter_disclosed、evidenceSource=operator_declaration并绑定SHA/chain/invoice/tx；这是操作者披露，不是链上验证结果
regression_tests: 无git身份构建不显示假SHA；fixture/testnet/mainnet标签隔离；旧链接有效
acceptance_criteria: 任一界面结论能追到同SHA日志；host与包一致性单独记录
dependencies: [GATE-01, QA-01部分结果]
permission_needed: 私有代码/文档；host或Studio同步另批
estimate_range: 1–2小时；独立托管读回15–30分钟另计
rollback: 移除错误新索引而保留历史；缺身份时显示Unknown
stop_condition: 无法证明运行版本时只给候选源码结论，不宣传已部署
~~~

### NET-01 — 条件性主网适配

~~~yaml
task_id: NET-01
linked_finding_ids: [RULE-01, REL-01]
priority: P1_if_official_mainnet_required
objective: 在不混用测试网身份的前提下准备主网候选
scope_in: 独立网络policy、trusted manifest、wallet chain、intent命名空间、导出/路由标记、只读身份校验
scope_out: 合约功能扩张、nonce接管、取消白名单、提高金额、自动迁移unknown、实际部署/资金
files_or_modules: [src/arcproof/arcSettlement.ts, src/arcproof/manifest.ts, src/arcproof/testnet.ts, src/arcproof/testnetClient.ts, src/arcproof/walletIntents.ts, src/config.ts, 页面网络/模式展示]
implementation_steps:
  - 官方规则确认必需并核剩余18小时额度；不足停止参赛路径
  - 以受信NetworkPolicy传递主网/测试网各自身份，不做随意URL RPC
  - 给主网新deploymentId与编译/runtime记录，保留旧测试网
  - 针对cross-network/storage/manifest/calldata/finality重跑回归
  - 准备可审查部署摘要和两钱包步骤，停在用户签名前
regression_tests: 主测试链互拒；旧intent不被迁移/清除；金额18位；runtime不符只读；原testnet回归无退化
acceptance_criteria: 私有候选能通过绑定回归；真实主网完成需用户批准后另附raw证据，不提前标PASS
dependencies: [GATE-01确认规则, SAFE-01, QA-01, 用户批准受限动作后方可实链]
permission_needed: 私有准备在后续委托内；主网部署/签名/费用/发布必须明确新授权
estimate_range: 编码与针对回归6–10小时；人工部署/钱包验收1–2小时及外部等待另计
rollback: 主网保持禁用/只读，保留旧测试网和所有intent；链上已部署不可声称可撤销
stop_condition: 剩余额度不足、规则仍未知、源字节/链/日志政策矛盾、资金未批准即停主网发送
~~~

### DEP-01 — 依赖可达性与有界整改

~~~yaml
task_id: DEP-01
linked_finding_ids: [DEP-01, DEP-02]
priority: P2
objective: 降低具体可达依赖风险而不破坏钱包/金额路径
scope_in: D5公告复读、锁版本、import/bundle/callgraph、父依赖兼容修复
scope_out: audit fix force、无差别major override、钱包架构重写、crypto随意polyfill
files_or_modules: [package.json, bun.lock, src/config.ts, vite.config.ts, evidence/dependency-review-20261021]
implementation_steps:
  - 逐公告记录版本/函数/攻击输入/生产或开发路径
  - 先修可达且有兼容补丁路径，未使用SDK链路有证据再裁剪
  - 保存bundle与lock before/after和许可证变化
regression_tests: frozen install、生产构建、钱包连接/review、只读核验、金额/导出
acceptance_criteria: 每个残余有明确原因/缓解；不以数量减少或无包名证明安全
dependencies: [QA-01可用环境, 核心安全补丁稳定]
permission_needed: 私有依赖修补；新增付费/外部服务不得自行启用
estimate_range: 1–3小时有界；大迁移另立计划并优先延期
rollback: 每个父依赖小提交回退；不默默恢复已知可达漏洞后发布
stop_condition: 影响安全断言/连接语义或超过预算则停止升级路径，保留残余说明
~~~

### RELEASE-01 — 许可、材料和审查交付

~~~yaml
task_id: RELEASE-01
linked_finding_ids: [IP-01, DOC-01, RULE-01, REL-01, QA-S01]
priority: P1_before_public_release
objective: 把可证明的作品整理成用户可审核的提交包
scope_in: 来源许可清单、README重排、150–250字介绍、3分钟脚本、截图清单、正确历史声明、测试注释修正
scope_out: 实际公开、报名、接受条款、对外通信、虚构客户/收入/专业审计
files_or_modules: [docs/LICENSING_BOUNDARY.md, README.md, STATUS.md, 提交文档, contracts/test/ArcProofInvoices.t.sol]
implementation_steps:
  - 首方/Studio/第三方/字体图标/品牌分别盘点
  - 用户决定待公开范围与许可后准备草案，不默认整仓MIT
  - 只填G章实证过的链接与能力；占位符阻止发布
  - 修QA-S01注释/测试名，保留历史日志
  - 独立访客按H章路径检查，再交用户批准受限动作
regression_tests: 链接/版本/标签/许可证一致；图片视频无敏感资料；每个成功声明有原始证据
acceptance_criteria: 无虚假完成/占位必填项；当前规则与交付物对应；两钱包录像/文案/证据页统一标受控，controlled_demo=false不解释成客户收入；用户可具体审核
dependencies: [GATE-01, TRACE-01, QA-01, NET-01若规则必需]
permission_needed: 草案整理可做；许可选择/公开/提交/签名资金由用户另批
estimate_range: 私有整理1–2小时；用户决定及外部等待不计入编码估算
rollback: 保留私有版本；撤回未证声明，不删除历史证据
stop_condition: 许可/规则/链接/证据任一硬条件未闭合即不公开提交
~~~

## F3. 最小4小时修补包：严格240分钟上限

这是可用环境下的规划上限，不是假称已投入工时。先确认累计剩余额度至少4小时；不足按顺序缩减，不把上限当必须用完。

| 时间盒 | 工作 | 输出/裁剪条件 |
|---:|---|---|
| 20分钟 | GATE-01快速规则/版本/额度核对 | 无正文仍unknown；不因等待停全部私有工作 |
| 80分钟 | SAFE-01最小身份修复及核心反例 | 若需要架构/nonce变更，停止该设计，改为隐藏hashless精确恢复入口 |
| 30分钟 | SHARE-01 | 当前invoice绑定及迟到/失败回归 |
| 25分钟 | VIEW-01仅颜色/关键文案子集 | 不改布局/引新组件 |
| 50分钟 | 针对测试、必要类型/构建检查 | 安装blocked则记录阻塞，不能宣布补丁通过；保留失败 |
| 35分钟 | diff复核、证据记录、当前索引及缓冲 | 未通过项不合并为完成，准备下一批 |

**本包不含：** 主网、部署、钱包签名、公开、完整视觉重做、通用路由、新功能、全依赖迁移。实际人类签名时间为0，外部规则/下载等待不纳入虚构编码完成；等待超过时间盒就停对应门禁。

## F4. 后续1天强化包：最多8小时，先作分支决定

**默认主方案：继续现有闭环。** 适用于资格仍待证或规则允许先做该技术展示、且累计额度允许：

| 时间盒 | 工作 |
|---:|---|
| 45分钟 | 环境恢复、锁/版本、目标用例确认 |
| 90分钟 | ENTRY-01与收据阅读顺序 |
| 45分钟 | TRACE-01运行身份和证据索引 |
| 120分钟 | 375/768/1440、200%、键盘、状态、真下载/PDF |
| 60分钟 | 原始RPC只读复核和当前完整必要门禁 |
| 60分钟 | README/脚本/许可清单/缺口整理 |
| 60分钟 | 风险缓冲、review、版本/链接回读 |

如果规则明确要求主网、用户希望继续参赛且剩余预算充足，**本日优先改为NET-01私有适配和回归**，撤掉大部分美化，而不是两包叠加。6–10小时的NET-01不保证一天完成；8小时到点仍不满足则停止本届提交路径，留下技术展示。主网部署、两钱包签名和费用需用户另批，**不能把它们藏在8小时编码包里**。

真实钱包操作人类时间另预留30–60分钟（主网首次部署总人类流程可达1–2小时），外部RPC、合约验证、资格/许可答复等待不可保证。任何授权/费用缺口不通过省略验收补足。

## F5. 截止前顺序与缓冲

截止完整时区未知，不能伪造倒排日历。使用门槛顺序：

1. 规则与额度→核心身份/分享修复。
2. 选定候选SHA→必要自动门禁。
3. 同版本真实浏览器/原始链上证据→独立会话复核。
4. 规则要求的网络/材料全部满足后→许可与可访问链接。
5. 最后预留至少一轮“修复后重新验收”窗口和20%可用工程时间作缓冲；这是规划建议，不是官方时间要求。
6. 用户审核具体发布/签名/提交动作；批准后再执行并保存回执。

没有缓冲时不添加功能；关键证据仍失败时不能用预录或fixture假装实时通过。可以交付带限制的技术展示，但必须明示不满足本轮参赛条件。


---

# G. 验收与证据收集清单

## G1. 验收原则及记录格式

每个案例使用固定candidate SHA、工具版本、网络/manifest、UTC时间、预期、实际、PASS/FAIL/BLOCKED、原始证据路径和脱敏说明。**NOT_RUN不算PASS，无法访问不算没有问题，历史结果不算本轮结果。** 前端/合约/链/钱包/表格分别记录，不用一个“391 passed”替代。

下表为下一轮验收计划，除B章明确探针外，**均不表示本轮已执行**。建议新增 evidence/review-<UTC>-<shortSHA>/，目录名只是方案，不声称远端已存在。

~~~json
{
  "caseId": "WALLET-UNKNOWN-NOHASH",
  "sourceSha": "<full candidate SHA>",
  "buildArtifactSha256": "<actual hash or null>",
  "environment": {
    "browser": "<name/version or NOT_RUN>",
    "viewport": "<actual>",
    "chainId": "<actual or null>",
    "deploymentId": "<actual or null>"
  },
  "startedAtUtc": "<actual>",
  "finishedAtUtc": "<actual>",
  "commandOrSteps": ["<exact command or human action>"],
  "expected": "<objective condition>",
  "actual": "<observed only>",
  "result": "BLOCKED",
  "exitCode": null,
  "evidence": [],
  "limitations": ["<what was not proven>"]
}
~~~

此为schema示例，不填假时间或交易；sourceSha应由执行时读取，不能复制本报告SHA后测试不同代码。保留stdout/stderr、下载原字节、截图、PDF和失败日志，截图不是替代原始JSON的证据。

## G2. 自动与纯逻辑层

| case_id | 路径/输入 | 明确预期 | 证据 |
|---|---|---|---|
| ENV-LOCK | 按固定Bun/Foundry及lock安装，先审script | 无隐式部署/credential/付费行为；lock不漂移；失败如实BLOCKED | 版本、完整命令、安装exit/log、lock hash |
| AMOUNT-BOUNDARY | 0、负、7位小数、科学计数、逗号、本地化格式、前导零、超上限、最小/最大 | 不使用float；拒绝非法；合法值精确native18；显示往返不变 | 单元/属性反例和种子 |
| AMOUNT-LONG | 超长数字字符串/空白/Unicode相似字符 | 有界资源使用/清晰拒绝，不能超时阻塞页面 | 边界测试时间/输出；不虚构当前有洞 |
| CREATE-STATE | 重复nonce/创建、expiry临界、相同商户历史 | 合约ID/nonce/事件一致；失败不消耗状态；无重复创建假成功 | Forge及服务回归 |
| PAY-ATOMIC | 0/少/多value、已付、过期、拒收/重入/强塞余额 | 不正确本金转付；失败状态与日志回滚；余额不变量 | 本地合约trace/断言；与Arc实链分开 |
| INTENT-PERSIST | 双击、storage损坏/拒写、无Web Locks | 持久成功前wallet send=0；同scope仅一次；不靠过期解除unknown | service调用计数及原始intent |
| INTENT-HASHLESS | 同内容另一tx、无hashcreate/revert | 原intent仍unknown；可独立看付款；不写假hash | before/after状态与回归日志 |
| INTENT-KNOWN | exacthash成功/revert、不同hash/nonce替换 | 只有已知原请求身份通过才结清；替换不凭内容猜 | tx/receipt fixture与状态 |
| STATUS-UNKNOWN | 缺status/非success与reverted | unknown/PENDING；不能failed或verified | helper/完整service分别测试 |
| VERIFY-BIND | chain/from/to/calldata/value/invoice/amount/parties任一错 | 核验失败或未证实，无成功/导出背书 | 每维独立反例 |
| VERIFY-LOGS | 地址错、重复index、乱序、缺腿、别交易日志、事件与state冲突 | 不重复计算；不单凭一条事件成功；必要条件缺失失败关闭 | 合成日志明确fixture |
| VERIFY-INCLUSION | receipt和tx不同block/hash/number，finalized缺失或冲突，按高度重读变化 | 不给VERIFIED，保留具体原因与已观察数据 | 故障RPC适配器/日志 |
| TERMS-SCOPE | 非零terms已付款/未付款 | 新付款不受支持而只读；既有资金事实可核，明确未核法律条款 | prepared/receipt两侧回归 |
| EXPORT-SCOPE | 旧input/迟到结果、不同invoice/tx/deployment | 当前record不继承旧verified/金额；source标签正确 | 组件与export反例 |
| DEMO-DOMAIN | 同fixture创建/ID/导出 | 同domain；hash/payer/paidtime真实缺失保持null；SIMULATED_NOT_VERIFIED | 现有fixture回归 |
| SECURITY-GRAPH | 构建产物/模块图/捕获marker、Host/CORS | 旧capture不在运行graph；恶意Host拒绝；无多余CORS | 原始build graph/HTTP结果 |
| BUILD | lint/typecheck/production build/必要完整套件 | 全部exit0或明确BLOCKED；禁止以降低断言或忽略规则求绿 | 命令/版本/SHA/原日志 |

按当前package.json，项目没有名为build的npm script；不要编造“bun run build已通过”。可用环境下在审查完脚本后使用实际存在的bun run typecheck、bun run lint、bun run test、bun run contracts:test，以及本地已安装的 ./node_modules/.bin/vite build。不盲跑deploy:self、compass:deploy、fetch:abi或把scripts/check.sh当全部门禁；check.sh仅覆盖其真实执行内容。[C21][C23]

## G3. 真实浏览器、桌面手机与钱包

| case_id | 场景 | 预期 | 文件类型/授权 |
|---|---|---|---|
| UI-ENTRY | 新会话无钱包打开app/verify/evidence/demo | 30秒内看懂用途并进入只读；没有自动连接/签名 | 录屏、DOM摘要、截图；只读 |
| UI-RESP | 375/768/1440，全状态、长地址/金额 | 无横向溢出；主要操作/金额/限制可读 | 每宽度截图+computed尺寸 |
| UI-ZOOM | 实际200%浏览器缩放 | 不丢按钮、标签、状态或焦点；header可换行 | 缩放设置与截图 |
| UI-KEYBOARD | Tab/ShiftTab/Enter/Space、review出现/关闭 | 焦点顺序合理/可见，无trap；取消返来源；错误被读屏识别 | 操作视频/无障碍树 |
| UI-CONTRAST | 正常/hover/focus/disabled、unknown/verified | 普通有意义文字4.5:1；关键非文字3:1；颜色不单独传意 | 实际色值及计算记录 |
| SHARE-A-B | 连续创建/复制A再B，迟到A、B拒绝 | 当前invoice独有复制反馈；失败不保留成功 | clipboard实际文本+交互日志 |
| WALLET-PRE | 切链/账户/连接版本、120秒review失效 | dispatch前重新核对；失效不得直接发送 | provider事件/调用计数 |
| WALLET-POST | dispatch后切页面/账户/输入或卸载 | 原请求保留原scope；迟到结果不污染当前页/导出；不声称取消链请求 | 原始intent+浏览器录屏 |
| WALLET-REJECT | 用户直接拒签、包装错误/超时 | 只有确证拒签安全结清；未知继续禁止重发 | 人类钱包步骤；**签名相关交互需另批** |
| WALLET-TABS | 两标签同发票同时操作 | 同origin发送最多一次；第二页显示已有请求 | 录屏+send计数；合成provider先做 |
| WALLET-REFRESH | requesting/submitted/unknown时刷新重开 | 持久记录存在；knownhash可核；nohash不自动重发/清除 | before/after storage与状态 |
| WALLET-REPLACED | 相同nonce替换/取消、不同nonce同内容 | 不凭匹配内容清原请求；不承诺自动跨设备恢复 | 可先模拟；真实替换/取消**另批** |
| WALLET-NEXT | 一次成功创建确认后创建下一张 | 原请求结清且下一张可准备，未知其他scope不被误清 | intent日志+真实流程 |
| HOST-VERSION | 独立访客访问实际judgelink | build SHA/artifact/manifest匹配，无特殊账号，Studio归属真实 | 链接/页面截图/产物hash；部署另批 |

**两钱包验收定义：** 两个不同普通EOA，一个创建并收款，一个付款；记录控制关系并标controlled demo，不能因payer≠merchant就称真实客户。当前自动标签主要识别同钱包情况（receiptVerifier.ts:554、exportUtils.ts:257），false只表示未命中同址，不能解释成商业收入。TRACE-01在证据manifest另记操作者披露的controlled_two_wallet_demo并绑定SHA/chain/invoice/tx；这不是链上认证，不改资金逻辑或4小时包的导出schema。

真实钱包与测试资产操作也属于用户本轮未授权动作，本轮没有执行。下轮先完成可审查的网络、金额、费用上限、接收地址、步骤和回退/unknown处理，再请求相应批准；不要先要空泛授权。

## G4. 真实只读链上证据

对一笔待核验付款，在同一时间窗口保存以下原始响应，所有大整数按原始hex/string保留：

1. eth_chainId与部署地址eth_getCode；匹配manifest的chain/runtime。
2. eth_getTransactionByHash：hash/from/to/input/value、区块包含字段。
3. eth_getTransactionReceipt：status、gasUsed/effectiveGasPrice、block、全部原始logs。
4. 合约发票读回：merchant/amount/expiry/terms/paid/paidBlock等实际ABI字段。
5. 付款高度区块、finalized-tag区块、finalized高度区块、付款高度再次读回。
6. 当前verifier消费上述真实输入的完整结果：checks/reason/source/readAt、observationScope、settlementEvidence、policy。
7. 构建SHA/编译artifact/manifest及对应Explorer URL。

每个文件注明公开endpoint标签、方法/参数、retrievedAtUTC、超时/错误；不保存credential或带secret的URL。不用normalized explorer摘要替代raw，不用fixture补缺失字段。provider缺finalized/字段时保留UNVERIFIED_FINALITY或相应未证状态，不降验证条件。

历史部署记录（仅作读回起点，**本轮未重新确认链上**）：

- Arc Testnet chainId：5042002。
- 合约：0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30。
- deploymentId：0xdba9a4da8a5b2a834b451f595653dd3cb4c3e51addb2d8df8e0b18312f382d2d。
- 预期runtime hash：0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c。
- 归档部署交易：0x2e43459e213e993b2290749e5549f993d63db1af6e1d8feab2fcca94917db535。
- 历史同钱包0.20 test USDC交易：0x0987c87540b6701be5fe047c55a7ac1b9277fda7dd989f31c8ea3ccd25350ace。
- 这些不是本轮实时成功、主网或收入证明；不要根据字段长度和历史报告假造当前receipt。

## G5. 导出、打印与离线复核

| 场景 | 验收要求 |
|---|---|
| JSON真实下载 | 等浏览器download完成，保存bytes与SHA-256；invoice、chain、deployment、tx、原始金额、fee、UTC、mode、status、factsBasis、checks、限制齐全 |
| CSV真实下载 | 大整数原字节不改成科学计数；字符串正确引号转义；公式样本用无外部副作用的=1+1、+1、@SUM(1,1)等验证惰性 |
| Excel/Sheets | 明确按Text导入；再导出核原始整数/日期/字段；未经真实应用验证不能写“Excel安全/无精度损失” |
| A4/Letter | 两尺寸打印PDF逐页看；closed/expanded details都能保留关键诊断、环境、限制、署名；长字段不裁切 |
| 第二会话复核 | 不连钱包打开收据链接，重新读链；不相信JSON中的verified布尔；离线文件只能展示记录，不能自动背书 |
| 失败/未知导出 | 保留失败原因、已观察字段及未证范围；不能导出绿色成功模板 |
| Fixture导出 | 文件名、内容、打印都有simulation；不存在的真实hash/时间保持null |
| 商业口径 | 自转或两受控钱包都标受控测试；fee不计收入；不把付款证明称交付/法律身份/退款权利证明 |

如果需要在Google Sheets中创建测试表，这属于后续明确委托范围内的外部文件操作；本轮没有创建或上传任何客户资料。优先用合成值，不采集真实客户信息。

## G6. 通过/暂停标准

**可标“候选技术演示就绪”**需要：同SHA自动门禁可复现、无钱包入口/核心页浏览器验收、已修SEC-R01/分享、真实下载/打印、完整证据范围标签；真实付款如果尚未做，只能展示明确录制/fixture，并在材料中说明未验。

**可标“本轮参赛就绪”**还需要：当前官方规则/资格/时间/材料全部闭合，要求的网络和真实交互已验，许可/公开范围获批准，所有必备链接可独立访问且版本一致。最终实际提交仍由用户明确批准。

任何unknown交易、错chain/runtime、缺finality、身份矛盾、未批准资金或费用超限，停止对应写入/发布；保留记录继续只读诊断。不要通过删除失败、清storage或重复发送来制造成功演示。

---

# H. 参赛材料与演示包方案

## H1. 一句话介绍与30秒表达

当前可用的中文一句话：

> ArcProof 是一个用于检查 Arc 测试网小额发票付款证据的原型，把请求、交易、原生 USDC 转付和最终性放在同一条可复核流程中。

英文一句话：

> ArcProof makes the evidence behind a small Arc Testnet payment easier to inspect.

30秒英文稿（目前只能介绍已存在实现及边界，不能口头暗示本轮实链验收已通过）：

> ArcProof binds an invoice to its transaction, recipient, native USDC transfer legs and finality checks, then explains what is verified and what remains unknown. Verification is designed to work without connecting a wallet. This prototype currently targets Arc Testnet. Its test payments are controlled demonstrations, not customer revenue or proof of delivery. The accompanying evidence page distinguishes source review, historical checks and acceptance still to be completed.

主网、实际两钱包、公开运行链接未验收前，不把“currently targets Arc Testnet”换成“live on mainnet”。

## H2. 150–250字中文介绍草稿

ArcProof 是一个面向 Arc 支付集成开发者与复核者的小额付款证据原型。它把固定金额发票、付款交易、收款地址、原生 USDC 转付与最终性检查放在同一流程中。收款方创建请求，付款方在钱包签名前核对金额与收款人，复核者可通过只读入口检查证据。JSON 导出保留精确金额、来源和未通过原因。当前实现面向 Arc Testnet，并保留明确标注的离线模拟；主网、真实双钱包及当前部署验收仍待完成。它不提供托管、退款、商业交付或法律身份保证，受控测试付款不代表客户收入。

这是私有材料草稿。实际提交前按当时验收更新“待完成”，不能只删去限制而不补证据。没有虚构用户数、收入、交易量、满意度或推荐语。

## H3. 三分钟逐段演示

下表是**未来候选版本**演示方案。没有获准真实写入时使用已经核实的录像或fixture并标明，不能临时签名。真实交易hash仅填实际记录。

| 时间 | 画面/动作 | 旁白重点 | 成功所需证据 |
|---|---|---|---|
| 0:00–0:20 | 开场任务与网络条 | “一条交易hash还不足以说明这张发票付给了谁。” | 当前build SHA/网络可见 |
| 0:20–0:45 | 创建0.20 test USDC请求与review | 金额、商户、expiry；创建不等于收款 | 完整创建步骤记录；若录屏注明日期/SHA |
| 0:45–1:05 | 复制当前链接，第二钱包打开 | 同一invoice、完整收款人、金额/网络；两钱包都受控 | SHARE-01已验；链/部署一致 |
| 1:05–1:30 | 钱包前预审及实际等待/已录制付款 | fee另付、无托管退款；hash只是提交 | 获批签名或明确历史录屏；不伪造进度 |
| 1:30–2:05 | 复核者新会话无钱包打开收据 | 金额、双方、两原生转付、finality、已通过和缺失检查 | 当前raw tx/receipt/blocks与verifier输出 |
| 2:05–2:30 | 导出JSON；对照Explorer/原始值 | 精确整数和证据范围，不是商业交付证明 | 实际文件下载及hash |
| 2:30–2:50 | 一个错误/unknown案例 | 缺finality不变绿；原请求不明不重发；相同付款≠原请求恢复 | fixture必须明显标签；不能对真实部署发攻击 |
| 2:50–3:00 | Evidence页和限制 | 同SHA、测试范围、Studio构建轨迹；下一步是验证需求 | 可访问链接及真实材料，不报虚假营收 |

实际等待超时不填假成功；在屏幕上保留unknown，转只读历史证据并说明时间/版本。这比隐瞒超时更能显示产品诚实边界。

## H4. 截图/视频清单及定位

本轮没有提供当前页面定位截图，因为实际页面未看到。下一轮至少采集：

| 截图ID | 视口/状态 | 要看见什么 |
|---|---|---|
| SHOT-01 | 1440无钱包首访 | 价值句、网络、只读入口、Studio署名 |
| SHOT-02 | 375创建review | 金额、完整收款人、expiry、费用与按钮 |
| SHOT-03 | 375付款未付 | 当前invoice、0.20 test USDC、网络、风险/下一步 |
| SHOT-04 | 1440完整收据 | 结论、金额、双方、fee、finality和范围 |
| SHOT-05 | 768 finality未知 | Not verified、具体缺失、无绿勾/重发 |
| SHOT-06 | 375无hash未知请求 | 原intent保留、匹配付款独立展示 |
| SHOT-07 | 200%缩放键盘focus | 无遮挡、focus可见、标签可读 |
| SHOT-08 | Evidence页 | 真实SHA、当前/历史/未验分类 |
| SHOT-09 | PDF两页长字段 | 完整金额/状态/限制/署名、不裁切 |
| SHOT-10 | 独立模拟入口 | 持续OFFLINE SIMULATION，模拟导出标签 |

视频使用3分钟主片和一段不剪掉关键状态的原始流程记录。录屏可剪短等待但必须注明；不要把不同网络或版本拼成一条“实时完成”录像。钱包画面不暴露助记词、账户隐私或无关资产。

## H5. README建议重排

1. 一句话用途、当前网络/状态、明确非生产/非审计认证。
2. 三个评委动作：Open demo、Verify a receipt、View evidence；没有可访问链接时显示未提供，不编地址。
3. 一个真实任务和30秒价值；单张本金上限与费用另付。
4. 当前实现/本轮已验/历史/未验四列能力表。
5. Architecture和范围：直接转付、严格核验、单RPC信任、非零terms处理、EOA限制。
6. 本地恢复环境与实际命令；不要用不存在的build script。
7. 当前SHA/manifest/合约/runtime/原始证据；历史报告放后面。
8. Studio构建来源、外部修补与测试边界。
9. 许可/品牌/已知限制；完整submission资料链接。

首页只保留能解释作品的少量数字；391/73等在Evidence带日期/版本，不能当价值主张。原始PRD的业务收费假设不进入已完成能力或收入展示。

## H6. 评委复核路径与必备链接

推荐路径：**无钱包打开app → 查看一张已标网络的收据 → 展开具体检查 → 下载JSON → 点击对应Explorer → 查看同SHA源码/证据 → 看Studio构建轨迹。**

材料表（均在正式规则确认后再裁定“必需”）：

| 条目 | 现在可提供/状态 | 发布前处理 |
|---|---|---|
| 固定源码SHA | 本报告已读取的私有GitHub SHA | 仅当前授权者可读；若规则需公开由用户另批范围/许可 |
| Studio入口 | 用户提供URL，本轮未看到内容 | 证明真实开发轨迹与版本；不冒充当前部署 |
| 评委app URL | **[待实际可访问链接]** | 无特殊账号测试；build identity匹配 |
| 核验URL | **[待同版本真实invoice/tx链接]** | 二次会话只读重核验 |
| 合约Explorer | 历史测试网地址有记录 | 重新只读验证；若必须mainnet另获批部署 |
| 原始交易/receipt/finality | **[待本轮采集]** | raw文件/参数/UTC完整，不用fixture补 |
| 视频 | **[待录制/可访问链接]** | SHA/网络/控制钱包/录制时间准确 |
| builder profile/团队信息 | **[按本轮规则最小填写]** | 用户确认，不推断身份 |
| 许可证/NOTICE | **[待用户决定与清单]** | 不把合约MIT扩至整仓 |
| 官方规则快照 | **[待完整正文/时区]** | 满足C矩阵、保存修订时间 |

方括号是发布阻断占位符，不是能复制去提交的成品链接。

## H7. 评委最可能问的十个问题与可证据化回答

| 质疑 | 当前诚实回答 | 后续应展示什么 |
|---|---|---|
| 为什么不用Explorer？ | 我们针对一张发票把调用、双方、金额、原生转付和finality组织成明确检查；仍依赖RPC | 同一tx在Explorer和ArcProof的字段对应，不说更权威 |
| 和Request/Stripe/Coinbase有什么区别？ | 不竞争完整财务/处理商平台；探索轻量、可解释的Arc付款证据 | E2官方对照与一个具体复核任务 |
| 为什么必须用Arc？ | 当前核验特别处理原生USDC18位、两段系统转付和费用/最终性；只是钱包按钮不够 | 原生结算policy、同一系统emitter下两段转付日志及logIndex、精确整数；另明确ERC-20事件的精度/去重边界 |
| 真正在主网运行了吗？ | 当前源码配置是testnet，production manifest空；本轮未完成主网验收 | 如果后来完成，给真实chain5042/合约/tx/raw，不用测试网替代 |
| 是否真的用Studio开发？ | 有项目入口和仓库历史，但本轮未验证Studio当前页面 | 真实初建轨迹、外部修补说明、版本映射；不伪造全过程 |
| 有用户/收入吗？ | 本轮没有已核实客户或营收；自转/两受控钱包是受控演示 | 若以后研究，给真实匿名化任务反馈和授权，不刷量 |
| VERIFIED究竟证明什么？ | 在所用RPC可信假设下，指定发票付款/包含/结算/finality检查通过 | 字段和checks；不证明交付、法律身份、退款或收入 |
| 丢hash能不能安全重试？ | 不能自动重试；无唯一身份保持unknown，匹配付款不等于原请求 | SAFE-01反例及修后结果 |
| 为什么只有1USDC、没有退款？ | 这是小额原型和固定范围；正常付款同交易转付，没有托管释放逻辑 | 合约上限、费用另付与无refund函数；不宣传日常商用 |
| 测试多就安全了吗？ | 不。391是历史套件记录，本轮有限探针和真实验收分开；没有专业审计认证 | 当前命令/exit/raw、失败保留、浏览器/钱包/链上独立证据 |

## H8. 备用演示与发布前检查

**备用一：已核实的同SHA录屏。** 明确日期、网络、录像非实时；留原始交易/收据供评委只读复核。网络当场不可用时，说明当前无法重读，不让页面显示新成功。

**备用二：离线fixture。** 持续显示SIMULATION、无真实交易hash/付款人/时间；只说明界面和数据结构，不能满足真实主网交互要求。若规则要求真实部署而只有fixture，就暂缓参赛。

正式发布前逐项确认：规则完整、资格有据、时间及时区明确、许可范围用户决定、受限动作已批准、同SHA所有门禁有日志、必备链接可访问、没有占位符、没有未验主网/用户/营收/审计声明、Studio署名和第三方许可保留。失败或unknown记录不可删除来改善观感。

---

# I. 最终回传给 dot 的执行说明

以下段落可独立复制。它是工作说明，不自动赋予受限动作权限。

> **ArcProof下一轮执行交接**
>
> 先独立核实本报告，不盲从本报告、旧matrix或模型。审查基线为94a84c44b02d52a827bed42fc9f9a5d414619b7d；主审于2026-10-21 09:39:16–09:39:17 UTC（北京时间17:39:16–17:39:17）复读main未变，交付前10:02:48 UTC（北京时间18:02:48）再次确认相同SHA。与用户原ab62f58相比只多审查委托文档，与648acc3相比仅README/STATUS及委托文档；不要把它当产品改版或Studio部署。
>
> 执行时重新读取main完整SHA、UTC/北京时间和diff，核AGENTS/STATUS的累计18小时余额。首批按GATE-01→SAFE-01→SHARE-01→最小VIEW-01对比/文案→针对QA执行。GATE-01先取当前第二轮官方完整规则、时间栏及时区；未知继续HOLD，不自行用旧轮/索引替代。
>
> SAFE-01涉及src/arcproof/walletIntents.ts、testnetClient.ts、src/components/arcproof/Layout.tsx及对应测试：无hash付款不能凭另一笔相同内容的成功交易结清原intent；原请求仍uncertain，匹配付款只作独立只读核验。先重现，再修复。保留已知hash严格恢复、成功create确认后下一张可继续、同invoice阻止重发。主审直接实测只覆盖实际walletIntents+人工included回调，真实service/钱包可达性是静态推断；请补完整回归。
>
> SHARE-01只改TestnetScreens.tsx的复制状态：按当前invoice/session/操作版本归属；A成功不得污染B，迟到A/复制失败/切账户不能显示B已复制。不要触碰send、nonce和合约。
>
> 不得降低：金额整数/精确value、chain/runtime/manifest绑定、receipt与tx/log/invoice/finality一致、unknown失败关闭、发送前持久化、Web Locks/storage拒写保护、fixture/testnet/受控演示标签。不得通过清缓存、自动重发、过期解锁、nonce管理、放宽部署、降低断言或改测试期望来获得绿色结果。
>
> 当前未闭合：官方本轮完整资格/截止时区/主网和公开要求，Studio及评委同版本页面，完整raw RPC/finality，两钱包，真实浏览器/下载/打印/Excel，当前干净安装与全门禁，许可发布范围，累计工时。391等是历史记录；不得相加或称本轮通过。外层key旧“已复现污染”的结论已有撤回；保留纵深防御，不再用它虚报漏洞修复。
>
> 后续如果用户已经委托私有代码/文档实施，可做小提交、无费本地测试、只读公开RPC和材料准备。本报告**不是新的部署、资金、签名、公开发布、Studio更新、报名、协议接受、联系主办方或收费CI授权**。把具体部署摘要、网络、接收地址、金额/费用上限、发布范围和验收材料先准备好，停在用户应批准的动作前。
>
> 4小时包不包含主网或新功能。若官方硬要求主网，现有代码需要独立network policy/manifest/wallet/intent namespace/导出标签适配，不是一行地址替换；NET-01预计6–10小时代码回归，真实部署/人类签名另计。额度不足或规则无法满足就停止本轮参赛，保留技术展示。
>
> 每批固定base、审diff、跑针对回归并保存真实命令、版本、UTC、exit/stdout/stderr、结果scope和失败。源码/包/页面/manifest/证据SHA须可互相核对；未运行标NOT_RUN/BLOCKED。若后续已有推送授权，使用expected_sha非强制更新、回读远端确认；冲突先拉取合并再验证，不覆盖他人提交。
>
> 停手条件：资格不符/未知却要声明通过；重要身份/金额/finality回归失败；实际chain/runtime不符；需要清未知状态或降低安全断言；累计超限；新费用、资金或发布权限未获批。保留已完成补丁和失败证据，说明具体阻塞，不伪装完成。

## I2. 如果下一轮只做三件事

| 选择 | 为什么 | 客观验收 |
|---|---|---|
| **1. 关闭本轮资格/网络/公开要求的决策缺口** | 决定项目究竟需要什么才能参赛，避免把有限时间花在无法提交的作品上 | 当前官方全页/Terms/时间栏带URL与UTC；时区明确或保留unknown；逐条矩阵、剩余18小时额度、参赛或技术展示停止条件 |
| **2. 修复恢复身份与分享正确性，并取得同候选SHA的针对回归** | 两处都直接影响用户对“这次请求/这张发票”的理解，改动小且不扩资金流 | hashless匹配不结清原intent；knownhash与下一张创建仍正常；A复制不污染B；失败前/后日志、版本和零重发断言 |
| **3. 完成同版本、无钱包可复查的演示证据包** | 将已有技术变成评委能理解并自己核对的作品，UI改善服务于此 | 真实build identity；375/768/1440/200%与下载PDF验收；一张当前原始证据绑定的收据；3分钟准确演示；若主网是硬要求，必须另获批完成，否则明确不提交 |

这三件事优先于新增功能。第三项若缺环境或新授权，可以完成私有准备并明确阻塞，不能用fixture、旧录屏或自付“收入”代替相应硬要求。

---

# 附录一：固定SHA代码与仓库证据索引

以下链接全部固定为本轮基线；私有仓库是否能被其他读者访问取决于现有授权，本报告不要求改变可见性。每项正文引用[Cxx]指这里；行号是此版本的定位。

| 引用 | 文件/函数/行 | 主要用途 |
|---|---|---|
| C01 | contracts/ArcProofInvoices.sol:30–36、109–187；createInvoice/payInvoice | 上限、精度、商户/nonce、一次性、原子转付/重入 |
| C02 | amountParser.ts:25–76 | 整数解析、格式化边界 |
| C03 | manifest.ts:30–35；testnet.ts:5–45；arcSettlement.ts:9–29 | production空、测试网、trusted runtime/settlement policy |
| C04 | walletIntents.ts:60–112；withDispatchLock/runWalletIntent/recoverWalletIntent | 持久化、锁、无hash恢复问题 |
| C05 | testnetClient.ts:43–58、168–232、364–435 | 预审发送、tx绑定、恢复与create确认 |
| C06 | receiptVerifier.ts:270–547；verifyReceipt | 核验全过程、RPC信任与范围 |
| C07 | preparedPayment.ts:66–73、136–137 | terms支持范围 |
| C08 | ReceiptFacts.tsx:20–69；exportUtils.ts:91–125、195–258 | 事实来源、精确导出、观察与结算 |
| C09 | TestnetScreens.tsx:86–186、293–391 | 复制、模拟、内层key、UI成功、导出 |
| C10 | Layout.tsx:69–94、100–154 | 恢复文案、警报、focus/署名 |
| C11 | EvidenceScreen.tsx:18–82、117–123 | 历史计数和已知限制 |
| C12 | STATUS.md:1–7、23–25、45、61；REPORT.json/project.log | 当前文档与历史套件/未验收 |
| C13 | evidence/g1/independent/artifact-coherence.json | 历史合约字节一致性；非本轮编译 |
| C14 | docs/AUDIT_CLOSURE_MATRIX.md:9–24、37 | 16项历史定义与dated纠正 |
| C15 | src/config.ts:6–16；useTestnetWallet.ts:11–79 | 网络/钱包配置 |
| C16 | App.tsx:26–104 | 路由、非法入口、外层key |
| C17 | DashboardScreen.tsx:69–88、113–172；tailwind.config.js | 模拟域、颜色/按钮 |
| C18 | docs/QUALITY_GATES.md:7–12、43–57；ci草案例 | 门禁、无remoteCI与未启用草案 |
| C19 | docs/LICENSING_BOUNDARY.md:3–17 | 许可和发布权利边界 |
| C20 | 合约测试:964–969、1059–1071；IndependentBalanceReview:12–29 | 注释/版本断言范围 |
| C21 | package.json:6–50；bun.lock各上述行 | 真实脚本、固定依赖 |
| C22 | AGENTS.md:5–8、16、22、28、36、42、58–68 | 18小时/金额/范围记录；不扩大当前授权 |
| C23 | scripts/check.sh:53–56；DEBUG_SECURITY.md；vite.config.ts:48–59 | 实际门禁与开发边界 |
| C24 | evidence/quality-integration-20261021/dated-correction.json:3–5 | outer key旧结论撤回 |
| C25 | observed-browser-evidence.json；fixtures/observedPayment.ts:1–48 | 归档规范化观察与重建fixture，不是raw |
| C26 | docs/RECEIPT_EXPORT_FORMAT.md:3–30 | CSV/JSON/表格应用边界 |

[C01]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/contracts/ArcProofInvoices.sol#L109-L187
[C02]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/amountParser.ts#L25-L76
[C03]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/manifest.ts#L30-L35
[C04]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/walletIntents.ts#L60-L112
[C05]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/testnetClient.ts#L168-L435
[C06]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/receiptVerifier.ts#L270-L547
[C07]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/arcproof/preparedPayment.ts#L66-L137
[C08]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/components/arcproof/ReceiptFacts.tsx#L20-L69
[C09]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/components/arcproof/TestnetScreens.tsx#L86-L391
[C10]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/components/arcproof/Layout.tsx#L69-L154
[C11]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/components/arcproof/EvidenceScreen.tsx#L18-L123
[C12]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/STATUS.md#L1-L61
[C13]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/evidence/g1/independent/artifact-coherence.json
[C14]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/docs/AUDIT_CLOSURE_MATRIX.md#L9-L37
[C15]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/config.ts#L6-L16
[C16]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/App.tsx#L26-L104
[C17]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/src/components/arcproof/DashboardScreen.tsx#L69-L172
[C18]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/docs/QUALITY_GATES.md#L7-L57
[C19]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/docs/LICENSING_BOUNDARY.md#L3-L17
[C20]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/contracts/test/ArcProofInvoices.t.sol#L964-L1071
[C21]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/package.json#L6-L50
[C22]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/AGENTS.md#L5-L68
[C23]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/scripts/check.sh#L53-L56
[C24]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/evidence/quality-integration-20261021/dated-correction.json#L3-L5
[C25]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/evidence/g3-native-verifier/observed-browser-evidence.json
[C26]: https://github.com/peterpeter228/arcproof/blob/94a84c44b02d52a827bed42fc9f9a5d414619b7d/docs/RECEIPT_EXPORT_FORMAT.md#L3-L30

# 附录二：公开来源与读取边界

检索日期均为2026-10-21；产品功能、法律条款、advisory可能之后变化，正式提交前应回读。以下为官方/上游第一方链接，除明确标注的线索页。没有使用搜索摘要裁定资格；小段引文不代替完整上下文。

| 引用 | 来源及定位 | 结果/使用范围 |
|---|---|---|
| R01 | DoraHacks arc-microgrants-2/detail | 405；规则缺口，不以摘要定资格 |
| R02 | Arc House Studio候选页面 | 登录壳；无完整规则 |
| R03 | Arc Studio介绍，2026-09-17，导出/自有工具段 | 产品功能，不是比赛条款 |
| R04 | 旧Arc Microgrants官方页，What your submission needs/Eligibility/截止 | 可读，但明确旧轮不可继承 |
| R05 | Studio Terms，§1.2/4.1/4.8 | preview和主网责任边界 |
| R06 | Circle Developer Terms，§4/5/6 | 内容许可、品牌与Your Service边界 |
| R07 | Arc Network Terms，§1 | 成年、可缔约和适用限制；不是获奖资格 |
| R08 | Connect to Arc，Mainnet/Testnet | chainId/RPC/Explorer |
| R09 | Stablecoin native model，Two interfaces, one balance | native18/ERC206与同余额 |
| R10 | USDC system events，Two event streams/Out of scope | emitter、精度、gas |
| R11 | Gas and fees，Submitting transactions | parseUnits示例冲突，不能照抄 |
| R12 | Request Finance Invoices及当前官网Double payment detection | API/产品能力，不作实际使用体验判断 |
| R13 | Stripe Stablecoin payments，Other payment products/Refunds/Billing/locations | 当前官方支持范围 |
| R14 | Coinbase Business Checkouts overview，Key Features/Prerequisites | 一次性checkout、通知/退款/账户 |
| R15 | W3C WCAG2.2 Understanding SC1.4.3 | 对比门槛；非比赛权重 |
| R16 | EIP-140，Specification | revert回滚语义 |
| R17–19 | Radix、shadcn、Lucide LICENSE | 上游许可，非整仓许可 |
| R20–24 | GitHub官方GHSA公告 | 锁版本受影响范围及条件；不代表实际利用 |
| R25 | DoraHacks newsletter/Q&A索引 | 正文405，仅日期/活动线索 |
| R26 | CompeteHub当前轮摘要 | 二手线索，不作为资格/评分依据 |

[R01]: https://dorahacks.io/hackathon/arc-microgrants-2/detail
[R02]: https://community.arc.io/pages/arc-studio-xm3qwi
[R03]: https://www.arc.io/blog/introducing-arc-studio-the-onchain-coding-agent
[R04]: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq
[R05]: https://studio.arc.io/terms-of-use
[R06]: https://console.circle.com/legal/developer-terms
[R07]: https://docs.arc.io/terms
[R08]: https://docs.arc.io/arc/references/connect-to-arc
[R09]: https://docs.arc.io/arc/concepts/stablecoin-native-model
[R10]: https://docs.arc.io/arc/references/usdc-system-events
[R11]: https://docs.arc.io/arc/references/gas-and-fees
[R12]: https://docs.request.finance/invoices
[R13]: https://docs.stripe.com/payments/stablecoin-payments
[R14]: https://docs.cdp.coinbase.com/coinbase-business/checkout-apis/overview
[R15]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[R16]: https://eips.ethereum.org/EIPS/eip-140
[R17]: https://github.com/radix-ui/primitives/blob/main/LICENSE
[R18]: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md
[R19]: https://github.com/lucide-icons/lucide/blob/main/LICENSE
[R20]: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
[R21]: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
[R22]: https://github.com/advisories/GHSA-848j-6mx2-7j84
[R23]: https://github.com/advisories/GHSA-rj75-hqrm-r3gf
[R24]: https://github.com/advisories/GHSA-w5hq-g745-h8pq
[R25]: https://dorahacks.io/hackathon/arc-microgrants-2/qa
[R26]: https://www.competehub.dev/en/competitions/dorahacksarc-microgrants-2

补充第一方定位：[Request Finance当前官网的双付检测](https://www.requestfinance.com/)；[DoraHacks官方newsletter（本轮读取405）](https://dorahacks.io/blog/news/dora-hackathons)。

# 附录三：本轮可复查证据索引与原始摘要

执行工作目录为 /workspace/scratch/ba2f18486b44/arcproof-audit-work。本报告作为完整交接文本，下面同时附本轮关键结果与复现代码；不要只凭文件名假定dot已经获得其他文件。

| 证据文件 | 实际内容 |
|---|---|
| materialization-manifest.json | 157个物化文件的expected/actual Git blob、bytes、SHA-256；全部匹配 |
| repo-tree.json | 固定SHA的524项树；476 blobs |
| execution-evidence/github-readback.json | 复读UTC窗口、main、compare三文件diff、Actions total_count=0 |
| execution-evidence/bun-install*.log / *.meta.json | 首次配置错误与重试EAI_AGAIN、真实参数/时间/exit |
| security-evidence/rpc-chain-id.json | eth_chainId请求与环境Operation not permitted；没有链响应 |
| security-evidence/hashless-pay-identity-probe.mjs/.log/-meta.json | 实际walletIntents模块的合成回调反例 |
| security-evidence/pure-module-boundary-probe.mjs/.log/-meta.json | 三个原模块的精度/状态/导出探针 |
| security-evidence/pure-module-synthetic-export.json/.csv | 明确合成样本，不是链上证据 |
| ui-probes/copied-state.test.tsx / vitest.config.ts | 独立复制状态回归草案，NOT_RUN |
| legacy-status-check.md | 原16项逐行只读交叉复核，非新测试 |
| rules.md / contract-security.md / ui-product.md | 分领域工作底稿；以本报告已收紧范围为准 |

源字节关键指纹：

| 文件 | bytes | Git blob | SHA-256 |
|---|---:|---|---|
| contracts/ArcProofInvoices.sol | 8249 | 0ff25b92632458c8e528fa87a27c6af9a4710aaa | 8699071d250c834cd1166ece0d4001b7de95af7562796e19305ce2812635e25b |
| amountParser.ts | 3413 | 5a4f228ca11d050f143b4900037a53e5bd5727ef | af1b21797cecb5dbbb8dbfd31ee4d407cbda64c48a3daddcb22cec8fa1214796 |
| receiptStatus.ts | 263 | ca3eda8fdf9f1a75af037fd1403fea3b89f0ffac | 73d96ac7761e4824978a6399de2b9dcab4bb8d8e552c76f0e5bd08ab292a5906 |
| exportUtils.ts | 12705 | 3fb53c1fc0afc79e719975a3463a1c35f578529f | 0417715ac3657d718bd106a450e9cd65b55ca3e731de6bc3670646ed0f270552 |

哈希只用于身份/完整性，不证明功能正确。物化过程中发现工具额外添加末尾换行后，仅在删除一个换行能恢复expected Git blob时纠正，并重新执行探针。最终157/157匹配；这是审查取证过程纠正，不是项目缺陷或源修改提交。

# 附录四：最少补充材料与后续受限动作

**立即所需只有一组资格材料：** 本轮DoraHacks详情完整快照（URL、抓取UTC、实际时间栏及时区/页面时区设置、展开的Eligibility/Submission/Judging/Terms，以及附属条款）。可以脱敏截图或PDF；不需要仓库公开、密钥、助记词、身份证或真实客户资料。

为了关闭运行验收，后续需要同候选SHA在获准环境生成的build/测试日志、实际页面及独立访客链接、原始公开RPC数据和浏览器下载/打印证据。这些应由dot在可用环境实际生成，不让用户手工捏造或代填成功。

真实两钱包、主网部署、资金、公开源码/托管、Studio更新、提交及协议接受均需具体用户批准。应先备好可审核产物、地址、网络、金额/费率上限、公开文件范围和步骤再处理批准，不能把本报告当新授权。


# 附录五：本轮实际探针代码、元数据和输出

以下为本轮执行的审查脚本原文，位于仓库之外。依赖固定SHA物化的repo目录及repo-tree.json；路径在另一环境重放前须按实际位置调整，并重新核Git blob。附录末提供这两个探针所需的最小tree身份表，不需要把全仓库交给其他人。不要把脚本的合成hash、地址、区块或金额当实链证据。Node实验特性警告保留。

## 请求身份反例

### 实际脚本

~~~javascript
// Review-only probe: executes unchanged walletIntents.ts through Node's TS erasure.
// React hook and viem.defineChain are inert adapters; no wallet, RPC, or filesystem
// write occurs in the application module. This is NOT full-service/browser acceptance.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';

const root=path.resolve(import.meta.dirname,'../repo/src/arcproof');
const repoRoot=path.resolve(import.meta.dirname,'../repo');
const tree=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../repo-tree.json'),'utf8'));
const sourceHashes={};
const entries=new Map();
const localStorage={get length(){return entries.size;},key:(i)=>[...entries.keys()][i]??null,getItem:(k)=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:(k)=>entries.delete(k)};
const context=vm.createContext({localStorage,navigator:{locks:{request:async(_n,_o,fn)=>fn({name:'review-only-lock'})}},crypto:webcrypto,console});
const cache=new Map();
async function load(filename){
 if(cache.has(filename))return cache.get(filename);
 const bytes=fs.readFileSync(filename); const relative=path.relative(repoRoot,filename);
 const blobSha=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');
 assert.equal(blobSha,tree.tree.find(x=>x.path===relative)?.sha,'source identity '+relative);
 sourceHashes[relative]=blobSha;
 const source=bytes.toString('utf8');
 const m=new vm.SourceTextModule(stripTypeScriptTypes(source,{mode:'strip'}),{context,identifier:filename});
 cache.set(filename,m);
 await m.link(async(spec,from)=>{
  if(spec==='react')return new vm.SyntheticModule(['useSyncExternalStore'],function(){this.setExport('useSyncExternalStore',()=>{throw Error('UI hook not part of this probe');});},{context});
  if(spec==='viem')return new vm.SyntheticModule(['defineChain'],function(){this.setExport('defineChain',(x)=>x);},{context});
  return load(path.resolve(path.dirname(from.identifier),spec+'.ts'));
 });
 return m;
}
const m=await load(path.join(root,'walletIntents.ts'));await m.evaluate();
const tn=cache.get(path.join(root,'testnet.ts')).namespace;
const account='0x1111111111111111111111111111111111111111';
const invoiceId='0x'+'a'.repeat(64);
const amount='200000000000000000';
const input={chainId:tn.ARC_TESTNET.id,deploymentId:tn.TESTNET_DEPLOYMENT.deploymentId,kind:'pay',account,invoiceId,to:tn.TESTNET_DEPLOYMENT.contractAddress,data:'0x222ab347'+invoiceId.slice(2),value:amount};
await assert.rejects(m.namespace.runWalletIntent(input,async(mark)=>{mark();throw Error('unknown request B: wallet transport lost hash');}));
const uncertain=m.namespace.getWalletIntents()[0];
assert.equal(uncertain.state,'uncertain');assert.equal(uncertain.hash,undefined);
// A and B can share invoice/from/to/calldata/value while having distinct wallet
// nonces, e.g. a concurrent second device. Only A succeeds; B stays unresolved.
const transactionA={hash:'0x'+'b'.repeat(64),nonce:9,...input,status:'success'};
const recovered=await m.namespace.recoverWalletIntent(uncertain.operationId,transactionA.hash,async(saved)=>{
 for(const f of ['chainId','account','to','data','value','invoiceId']) assert.equal(saved[f],transactionA[f]);
 return 'included';
});
const after=m.namespace.getWalletIntents()[0];
assert.equal(recovered,'included');assert.equal(after.hash,transactionA.hash);assert.equal(after.state,'included');
let sends=0;
await assert.rejects(m.namespace.runWalletIntent(input,async()=>{sends++;return transactionA.hash;}),/unresolved/);
assert.equal(sends,0);
console.log(JSON.stringify({probe:'hashless-pay-request-identity',appSourceUnmodified:true,sourceHashes,executionScope:'walletIntents actual source; dependency adapters; synthetic recovery callback',before:{operationId:uncertain.operationId,state:uncertain.state,hash:uncertain.hash??null},recoveredFrom:{transactionHash:transactionA.hash,assumedDistinctRequestNonce:transactionA.nonce},after:{operationId:after.operationId,state:after.state,hash:after.hash},sameInvoiceRetryBlocked:true,principalDoublePaymentNotDemonstrated:true,conclusion:'A matching successful invoice call resolves the hashless intent without evidence that it is the particular unknown wallet request.'},null,2));

~~~

### 实际命令与元数据

~~~json
{
  "command": [
    "node",
    "--experimental-vm-modules",
    "security-evidence/hashless-pay-identity-probe.mjs"
  ],
  "startedAtUtc": "2026-10-21T09:32:18.909571+00:00",
  "elapsedSeconds": 0.08807346999674337,
  "exitCode": 0,
  "node": "v24.19.0",
  "scope": "git-blob-verified walletIntents.ts source through built-in type erasure; inert React/defineChain adapters, synthetic verifier callback; not full-service test"
}
~~~

### 实际stdout/stderr

~~~text
{
  "probe": "hashless-pay-request-identity",
  "appSourceUnmodified": true,
  "sourceHashes": {
    "src/arcproof/walletIntents.ts": "0e0c49d58e47d8be07baa5177aca247dce5e8483",
    "src/arcproof/testnet.ts": "5214ff0016dcde6e6e8a590eaed0fb14a351ccbc",
    "src/arcproof/arcSettlement.ts": "7158de92a308a9802d866d31ec562951268d1cdb"
  },
  "executionScope": "walletIntents actual source; dependency adapters; synthetic recovery callback",
  "before": {
    "operationId": "bc7e5161-6702-43db-9025-f26ac6f91765",
    "state": "uncertain",
    "hash": null
  },
  "recoveredFrom": {
    "transactionHash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "assumedDistinctRequestNonce": 9
  },
  "after": {
    "operationId": "bc7e5161-6702-43db-9025-f26ac6f91765",
    "state": "included",
    "hash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "sameInvoiceRetryBlocked": true,
  "principalDoublePaymentNotDemonstrated": true,
  "conclusion": "A matching successful invoice call resolves the hashless intent without evidence that it is the particular unknown wallet request."
}
(node:6) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6) ExperimentalWarning: VM Modules is an experimental feature and might change at any time

~~~

## 三项纯模块边界

### 实际脚本

~~~javascript
// Review-only execution of unchanged source modules. No third-party adapters,
// RPC, wallet, browser, or Solidity execution. Synthetic inputs are NOT chain evidence.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';

const repoRoot = path.resolve(import.meta.dirname, '../repo');
const tree = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../repo-tree.json'), 'utf8'));
const context = vm.createContext({});
const sourceHashes = {};
const cache = new Map();
async function load(relative) {
  const filename = path.resolve(repoRoot, relative);
  if (cache.has(filename)) return cache.get(filename);
  assert.ok(filename.startsWith(repoRoot + path.sep));
  const bytes = fs.readFileSync(filename);
  const blobSha = createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
  const repoPath = path.relative(repoRoot, filename);
  assert.equal(blobSha, tree.tree.find(item => item.path === repoPath)?.sha, 'unchanged Git blob: ' + repoPath);
  sourceHashes[repoPath] = { gitBlob: blobSha, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  const source = stripTypeScriptTypes(bytes.toString('utf8'), { mode: 'transform' });
  const mod = new vm.SourceTextModule(source, { context, identifier: filename });
  cache.set(filename, mod);
  await mod.link(async (specifier, from) => {
    assert.ok(specifier.startsWith('./'), 'No dependency stubs are allowed: ' + specifier);
    return load(path.relative(repoRoot, path.resolve(path.dirname(from.identifier), specifier + '.ts')));
  });
  return mod;
}
async function namespace(relative) {
  const module = await load(relative);
  if (module.status !== 'evaluated') await module.evaluate();
  return module.namespace;
}

const amount = await namespace('src/arcproof/amountParser.ts');
const receipt = await namespace('src/arcproof/receiptStatus.ts');
const exports = await namespace('src/arcproof/exportUtils.ts');
const findings = [];

// Independent endpoint values and legal-domain round trips; no copied parser.
const accepted = [
  ['0.000001', 1000000000000n],
  ['0.123456', 123456000000000000n],
  ['0.999999', 999999000000000000n],
  ['1.000000', 1000000000000000000n],
];
for (const [input, expected] of accepted) {
  const actual = amount.parseInvoiceAmount(input);
  assert.equal(actual, expected, input);
  assert.equal(amount.parseInvoiceAmount(amount.formatInvoiceAmount(actual)), actual);
  assert.equal(amount.parseInvoiceAmount(amount.formatAmountDisplay(actual)), actual);
}
const rejected = [
  ['0', 'ZERO'], ['0.0000001', 'EXCESS_PRECISION'],
  ['1.000001', 'TOO_LARGE'], ['1e-6', 'SCIENTIFIC'],
  ['00.1', 'LEADING_ZERO'], ['-0.1', 'NEGATIVE'],
];
for (const [input, code] of rejected) {
  assert.throws(() => amount.parseInvoiceAmount(input), error => error.code === code, input);
}
findings.push({ id: 'PURE-AMOUNT', result: 'PASS', scope: 'actual amountParser.ts; legal min/max and exact bigint round trips; selected invalid boundaries', accepted: accepted.map(([input, native]) => ({ input, native: native.toString() })), rejected: rejected.map(([input, code]) => ({ input, code })), limits: 'No wallet formatting, contract compile, huge-input resource test, or Arc RPC execution.' });

assert.equal(receipt.receiptStatus('success'), 'success');
assert.equal(receipt.receiptStatus('reverted'), 'reverted');
const malformed = [undefined, null, '0x1', '0x0', 1, 0, true, 'Success', {}];
for (const value of malformed) assert.equal(receipt.receiptStatus(value), 'unknown');
findings.push({ id: 'PURE-STATUS', result: 'PASS', scope: 'actual receiptStatus.ts only', malformedStayUnknown: malformed.map(value => typeof value === 'undefined' ? 'undefined' : JSON.stringify(value)), limits: 'Does not execute receiptVerifier, RPC normalization, or service state transitions.' });

// Clearly synthetic domain objects exercise export purity, not verifier authenticity.
const address = '0x' + 'a'.repeat(40);
const payer = '0x' + '1'.repeat(40);
const merchant = '0x' + '2'.repeat(40);
const invoiceA = '0x' + '3'.repeat(64);
const invoiceB = '0x' + '4'.repeat(64);
const txA = '0x' + '5'.repeat(64);
const txB = '0x' + '6'.repeat(64);
const blockHash = '0x' + '7'.repeat(64);
const deployment = { chainId: 5042002, deploymentId: 'synthetic-review-only', contractAddress: address };
const syntheticResult = {
  status: 'VERIFIED', verified: true, reasonCode: 'VERIFIED',
  message: 'synthetic result for serialization tests only', paymentLogIndex: 7, blockHash,
  verifiedAt: 1792577000000, readStartedAt: 1792576990000, readCompletedAt: 1792577000000,
  checks: [{ id: 'synthetic', status: 'passed', reasonCode: null, message: 'not chain evidence' }],
  source: { kind: 'rpc', label: 'synthetic-review-only' },
  observationScope: { chainId: deployment.chainId, deploymentId: deployment.deploymentId, contract: address, invoiceId: invoiceA, transactionHash: txA },
  observedReceipt: { transactionHash: txA, from: payer, to: address, status: 'success', transactionIndex: 2, blockNumber: '9007199254740993', blockHash, blockTimestamp: '1792577000', paymentLogIndex: 7, gasUsed: '21000', effectiveGasPrice: '9007199254740993', gasFeeNative: '189151184349560853000' },
  observedInvoice: { amountNative: '1000000000000000000', payer, merchant, paidAt: '1792577000', paidBlockNumber: '9007199254740993' },
  settlementEvidence: { policyId: 'synthetic-review-only', nativeEmitter: '0x' + '8'.repeat(40), decimals: 18, payerToContractLogIndex: 5, contractToMerchantLogIndex: 6, finalizedBlockNumber: '9007199254741000', finalizedBlockHash: blockHash, controlled_demo: false },
};
const mismatched = exports.buildReceiptExport(deployment, invoiceB, txB, 999n, merchant, payer, 1n, 2n, syntheticResult, true);
assert.equal(mismatched.verificationStatus, 'PENDING');
assert.equal(mismatched.verificationVerified, false);
assert.equal(mismatched.factsBasis, 'unavailable');
for (const field of ['amountNative', 'amountDisplay', 'payer', 'merchant', 'paidAt', 'paidBlockNumber', 'blockNumber', 'gasFeeNative', 'blockHash', 'paymentLogIndex', 'source', 'observationScope', 'observedReceipt', 'observedInvoice', 'verifiedEvidence', 'readStartedAt', 'readCompletedAt']) assert.equal(mismatched[field], null, field);
assert.equal(mismatched.settlementEvidence, undefined);
assert.equal(mismatched.verifiedAt, undefined);
assert.equal(mismatched.invoiceId, invoiceB);
assert.equal(mismatched.transactionHash, txB);
assert.equal(mismatched.checks[0].id, 'export_scope');

// Same request with finality unavailable retains precise observations without a
// verified settlement endorsement; stale caller-supplied facts must not win.
const message = ' =SUM(1,2)\r\n"review-only"';
const notFinal = { ...syntheticResult, status: 'UNVERIFIED_FINALITY', verified: false, reasonCode: 'UNVERIFIED_FINALITY', message, source: { kind: 'rpc', label: '@review-only' }, settlementEvidence: undefined };
const observation = exports.buildReceiptExport(deployment, invoiceA, txA, 999n, merchant, payer, 1n, 2n, notFinal, true);
assert.equal(observation.amountNative, '1000000000000000000');
assert.equal(observation.paidBlockNumber, '9007199254740993');
assert.equal(observation.payer, payer);
assert.equal(observation.merchant, merchant);
assert.equal(observation.verificationStatus, 'UNVERIFIED_FINALITY');
assert.equal(observation.verificationVerified, false);
assert.equal(observation.verifiedEvidence, null);
assert.equal(observation.settlementEvidence, undefined);
assert.equal(observation.factsBasis, 'identity_bound_rpc_observation');
const json = exports.exportReceiptsJson([{ ...observation, importedVerified: true }]);
const decoded = JSON.parse(json)[0];
assert.equal(decoded.importedVerified, false);
for (const field of ['amountNative', 'paidBlockNumber', 'gasFeeNative']) {
  assert.equal(typeof decoded[field], 'string', field);
  assert.equal(decoded[field], observation[field], field);
}
assert.equal(decoded.message, message);
const csv = exports.exportReceiptsCsv([observation]);
assert.ok(csv.includes(',1000000000000000000,'), '18-decimal amount bytes intact');
assert.ok(csv.includes(',9007199254740993,'), 'integer beyond Number.MAX_SAFE_INTEGER bytes intact');
assert.ok(csv.includes(',189151184349560853000,'), 'gas integer bytes intact');
assert.ok(csv.includes('"\t =SUM(1,2)\r\n""review-only"""'), 'formula/control text gets tab prefix, quoting and doubled quotes');
assert.ok(csv.includes(',\t@review-only,'), 'at-sign source label gets prefix');
assert.ok(exports.RECEIPT_CSV_IMPORT_NOTICE.includes('NOT_RUN'));
findings.push({ id: 'PURE-EXPORT', result: 'PASS', scope: 'actual exportUtils.ts + amountParser.ts; mismatched-request suppression; observations vs settlement; JSON parse round trip; CSV literal bytes', mismatch: { status: mismatched.verificationStatus, verified: mismatched.verificationVerified, factsBasis: mismatched.factsBasis }, observation: { status: observation.verificationStatus, verified: observation.verificationVerified, amountNative: observation.amountNative, paidBlockNumber: observation.paidBlockNumber, gasFeeNative: observation.gasFeeNative }, formulaTextExpectedPrefixCodePoint: 9, csvUtf8Bytes: Buffer.byteLength(csv), csvSha256: createHash('sha256').update(csv).digest('hex'), limits: 'Synthetic VerificationResult input; does not execute verifier/viem, prove chain settlement, download in a browser, or test Excel/Sheets formula behavior or round trip.' });

// Saving review fixtures does not modify source or emit them as real evidence.
fs.writeFileSync(path.join(import.meta.dirname, 'pure-module-synthetic-export.json'), json + '\n');
fs.writeFileSync(path.join(import.meta.dirname, 'pure-module-synthetic-export.csv'), csv);
console.log(JSON.stringify({ baseline: '94a84c44b02d52a827bed42fc9f9a5d414619b7d', scope: 'Three targeted pure-module probes. Not a project test-suite run.', transform: 'node:module.stripTypeScriptTypes({mode:transform}) in memory only', noDependencyAdapters: true, sourceHashes, findings }, null, 2));

~~~

### 实际命令与元数据

~~~json
{
  "command": [
    "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node",
    "--experimental-vm-modules",
    "security-evidence/pure-module-boundary-probe.mjs"
  ],
  "cwd": "/workspace/scratch/ba2f18486b44/arcproof-audit-work",
  "startedAtUTC": "2026-10-21T09:40:56.447296+00:00",
  "completedAtUTC": "2026-10-21T09:40:56.576620+00:00",
  "elapsedSeconds": 0.12935186699905898,
  "exitCode": 0,
  "nodeVersion": "v24.19.0",
  "baseline": "94a84c44b02d52a827bed42fc9f9a5d414619b7d",
  "limits": "Only actual amountParser, receiptStatus, exportUtils modules; synthetic inputs; no service, browser, wallet, RPC, Solidity, viem, or spreadsheet application execution."
}

~~~

### 实际stdout/stderr

~~~text
{
  "baseline": "94a84c44b02d52a827bed42fc9f9a5d414619b7d",
  "scope": "Three targeted pure-module probes. Not a project test-suite run.",
  "transform": "node:module.stripTypeScriptTypes({mode:transform}) in memory only",
  "noDependencyAdapters": true,
  "sourceHashes": {
    "src/arcproof/amountParser.ts": {
      "gitBlob": "5a4f228ca11d050f143b4900037a53e5bd5727ef",
      "bytes": 3413,
      "sha256": "af1b21797cecb5dbbb8dbfd31ee4d407cbda64c48a3daddcb22cec8fa1214796"
    },
    "src/arcproof/receiptStatus.ts": {
      "gitBlob": "ca3eda8fdf9f1a75af037fd1403fea3b89f0ffac",
      "bytes": 263,
      "sha256": "73d96ac7761e4824978a6399de2b9dcab4bb8d8e552c76f0e5bd08ab292a5906"
    },
    "src/arcproof/exportUtils.ts": {
      "gitBlob": "3fb53c1fc0afc79e719975a3463a1c35f578529f",
      "bytes": 12705,
      "sha256": "0417715ac3657d718bd106a450e9cd65b55ca3e731de6bc3670646ed0f270552"
    }
  },
  "findings": [
    {
      "id": "PURE-AMOUNT",
      "result": "PASS",
      "scope": "actual amountParser.ts; legal min/max and exact bigint round trips; selected invalid boundaries",
      "accepted": [
        {
          "input": "0.000001",
          "native": "1000000000000"
        },
        {
          "input": "0.123456",
          "native": "123456000000000000"
        },
        {
          "input": "0.999999",
          "native": "999999000000000000"
        },
        {
          "input": "1.000000",
          "native": "1000000000000000000"
        }
      ],
      "rejected": [
        {
          "input": "0",
          "code": "ZERO"
        },
        {
          "input": "0.0000001",
          "code": "EXCESS_PRECISION"
        },
        {
          "input": "1.000001",
          "code": "TOO_LARGE"
        },
        {
          "input": "1e-6",
          "code": "SCIENTIFIC"
        },
        {
          "input": "00.1",
          "code": "LEADING_ZERO"
        },
        {
          "input": "-0.1",
          "code": "NEGATIVE"
        }
      ],
      "limits": "No wallet formatting, contract compile, huge-input resource test, or Arc RPC execution."
    },
    {
      "id": "PURE-STATUS",
      "result": "PASS",
      "scope": "actual receiptStatus.ts only",
      "malformedStayUnknown": [
        "undefined",
        "null",
        "\"0x1\"",
        "\"0x0\"",
        "1",
        "0",
        "true",
        "\"Success\"",
        "{}"
      ],
      "limits": "Does not execute receiptVerifier, RPC normalization, or service state transitions."
    },
    {
      "id": "PURE-EXPORT",
      "result": "PASS",
      "scope": "actual exportUtils.ts + amountParser.ts; mismatched-request suppression; observations vs settlement; JSON parse round trip; CSV literal bytes",
      "mismatch": {
        "status": "PENDING",
        "verified": false,
        "factsBasis": "unavailable"
      },
      "observation": {
        "status": "UNVERIFIED_FINALITY",
        "verified": false,
        "amountNative": "1000000000000000000",
        "paidBlockNumber": "9007199254740993",
        "gasFeeNative": "189151184349560853000"
      },
      "formulaTextExpectedPrefixCodePoint": 9,
      "csvUtf8Bytes": 1476,
      "csvSha256": "3f48eaac9a571f29c6fa75fa0fc158f4f279d83e0df4fffe4c482cde1f1886e2",
      "limits": "Synthetic VerificationResult input; does not execute verifier/viem, prove chain settlement, download in a browser, or test Excel/Sheets formula behavior or round trip."
    }
  ]
}

STDERR:
(node:6) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:6) ExperimentalWarning: VM Modules is an experimental feature and might change at any time

~~~

**附录解释：** 第一项exit 0说明反例成立，没有修复源码；第二项PASS仅说明所列选定边界。它们不证明完整service、密码学、浏览器、钱包、Excel/Sheets、链或主网已经验收。

## 探针复现的最小tree身份表

按脚本相对路径保存为repo-tree.json；实际源码须从固定SHA读取并保持原字节。此表只包含探针要加载的6个文件，不代表全仓库树。

~~~json
{
  "tree": [
    {
      "path": "src/arcproof/amountParser.ts",
      "sha": "5a4f228ca11d050f143b4900037a53e5bd5727ef",
      "type": "blob"
    },
    {
      "path": "src/arcproof/arcSettlement.ts",
      "sha": "7158de92a308a9802d866d31ec562951268d1cdb",
      "type": "blob"
    },
    {
      "path": "src/arcproof/exportUtils.ts",
      "sha": "3fb53c1fc0afc79e719975a3463a1c35f578529f",
      "type": "blob"
    },
    {
      "path": "src/arcproof/receiptStatus.ts",
      "sha": "ca3eda8fdf9f1a75af037fd1403fea3b89f0ffac",
      "type": "blob"
    },
    {
      "path": "src/arcproof/testnet.ts",
      "sha": "5214ff0016dcde6e6e8a590eaed0fb14a351ccbc",
      "type": "blob"
    },
    {
      "path": "src/arcproof/walletIntents.ts",
      "sha": "0e0c49d58e47d8be07baa5177aca247dce5e8483",
      "type": "blob"
    }
  ]
}
~~~

## 交付前main最终读回

~~~json
{
  "repository": "peterpeter228/arcproof",
  "method": "GitHub GET git/ref/heads/main",
  "read_at_utc": "2026-10-21 10:02:48 UTC",
  "read_at_beijing": "2026-10-21 18:02:48 UTC+08:00",
  "sha": "94a84c44b02d52a827bed42fc9f9a5d414619b7d",
  "unchanged_from_audit_baseline": true,
  "does_not_prove_runtime_deployment": true
}
~~~
