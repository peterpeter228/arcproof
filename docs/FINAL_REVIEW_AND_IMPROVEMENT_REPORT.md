# ArcProof 最终审查、修复与界面完善报告

运行编号：`final-review-20261022T022241Z`（开始于 2026-10-22 02:22 UTC）
分支：`final-review-20261022`，基于 `8f748d3`（开始时与 origin/main 一致，工作区干净）
代码提交：`49253ea`（修复）、`faed3c4`（界面与产品）；本报告与证据另起文档提交。
机器可读结果：`evidence/final-review/final-review-20261022T022241Z/REPORT.json`

> 本报告不是审计结论，也不是参赛资格证明。本轮**没有**部署、签名、转账、公开、提交，没有修改 Studio，没有调用 Argon 或其它付费外部模型。两个只读审查子任务由本会话内的 Claude 子代理执行；官方规则和 Arc 文档通过 Parallel 只读检索获取。

## 1. 实际版本与环境

| 项 | 值 |
|---|---|
| 主机 | Ubuntu 24.04.3 LTS，x86_64，内核 6.8.0-51 |
| 工具 | bun 1.3.14，node v22.22.0，Google Chrome 144.0.7559.132；**没有 Foundry** |
| 依赖 | `bun install --frozen-lockfile --ignore-scripts`，697 个包，退出码 0 |
| 浏览器沙箱 | 以 root 身份启动时 Chrome 会拒绝沙箱，因此改为以非特权用户 `ubuntu` 运行。`chrome://sandbox` 报告 “You are adequately sandboxed”，没有使用 `--no-sandbox` |
| 合约 | `contracts/ArcProofInvoices.sol` sha256 `8699071d…e25b`，与 G1 清单一致，本轮未改动 |
| 源码快照 | 上一阶段（已同步 Studio）`8df6b66d…1432`，87 个输入 → 本轮 `b3bf6b03…8a67`，92 个输入（改 21 个，增 5 个，删 0 个），见 `build/source-snapshot.json` |

## 2. 初判（执行前）

在本轮开始时独立建立的基线：462 项测试/29 个文件、lint/类型检查、两种网络构建全部通过。

- **P0（资格阻断，工程无法单方面解决）**：没有主网部署、没有真实 USDC 交易、没有公开应用/仓库/视频。三项均需用户本人批准和签名。
- **P1（评委理解）**：根路径直接是空的“Verify a testnet receipt”表单。首屏没有一句话说明产品做什么；唯一免钱包的演示入口排在导航最后；页脚满是 G1、HOLD 之类的内部术语。
- **P2（安全，均为低危）**：独立审查确认 5 个低危问题，我另外复现了 2 个（见 §4）。没有发现可复现的高危或资金风险问题。
- **P2（可访问性）**：演示表单输入框的焦点环对比度约 1.2:1；正文中的链接被 44px 规则撑开导致断行；共有 12 处对比度不达标、18 个小于 44px 的点击目标。

## 3. 规则矩阵

完整矩阵（要求 → 当前证据 → 缺口 → 修复/待批准动作 → 验收方法）见 [`docs/SUBMISSION_READINESS.md`](SUBMISSION_READINESS.md)。要点：

- 2026-10-22 02:27 UTC 重新读取官方详情页，内容与委托文件一致：权重 30/25/25/20；时间轴（UTC）截止为 `2026/11/02 04:59`，正文写 November 1，冲突原样保留（北京时间 11 月 2 日 12:59）；提交时必须已在主网部署并有真实 USDC 交易；“polish is optional”。
- 链参数已用 docs.arc.io 核对：Mainnet `5042`、`https://rpc.mainnet.arc.io`、`https://explorer.arc.io`，与代码一致。
- 混合工具链能否算 “built in Arc Studio”：**资格待确认**，已备好询问草稿，但不会代为发出。

## 4. 已修复的问题（每项都先写了失败的测试再修复）

复现记录：`logs/05-regressions-red.log`（12 项中 7 项失败）→ `logs/06-regressions-green.log`（12/12 通过）。修复提交 `49253ea` 在独立 git worktree 中单独验证：480 项测试和 check 全部通过。

| ID | 位置 | 复现 | 影响 | 修复 | 回归测试 |
|---|---|---|---|---|---|
| FR-01 | `networkPolicy.ts` `assertWritesEnabled` | 审查探针：把构建网络设为 mainnet 后，`assertWritesEnabled(TESTNET_CONTEXT)` 不抛错，`runWalletIntent` 写入了 `arcproof:5042002:…intent` | 低。目前只靠路由拦截；以后任何代码路径一旦触达测试网服务，主网包就可能写入测试网请求记录 | 新增 `assertWritesEnabledFor(context, build)`，要求 context 必须就是本构建网络 | `finalReviewRegressions` FR-01 |
| FR-02 | `exportUtils.ts` `buildReceiptExport` | 对不在注册表里的合约，用 VERIFIED 结果构造导出：`mode=unknown`，但 `verificationVerified=true` 且保留了证据 | 低（UI 只传可信部署，现有界面触达不到）。但它违反“不可信目标不能产出已验证证据”的不变量 | `mode=unknown` 时不导出证据，状态改为 `UNKNOWN_DEPLOYMENT` | FR-02（含可信部署对照用例） |
| FR-03 | `routes.ts` | `#/pay/0005042002/<dep>/<id>` 渲染出可付款页面 | 低。同一条链，没有身份混淆，但违反“非规范输入拒绝”规则 | 链 ID 只接受 `/^[1-9][0-9]*$/` | FR-03 + 路由级 UI 用例 + 浏览器 A7 |
| FR-04 | `receiptVerifier.ts` / `testnetClient.ts` | 回执日志带 `removed:true` 时，结果为 `PENDING`，提示“not found or not yet committed” | 低。用户可能误以为交易没上链（不会自动重发） | 新增 `ReceiptProvenanceError`，映射为 `INVALID_LOG_PROVENANCE`；真正找不到时仍为 PENDING | FR-04 两个用例 |
| FR-05 | `ReceiptFacts.tsx` | chainId 5042、mode mainnet 的记录渲染出 2 处 “test USDC” | 低。只有将来启用主网才会出现文案错误；本轮没有为此开启主网 | 新增 `receiptCurrencyLabel`：测试网为 test USDC；只有已分类的主网记录才是 USDC；其它情况加“untrusted / unrecognized”标注 | `receiptCurrency.test.ts`、FR-05 |
| FR-06 | `testnetClient.ts` 付款预检 | `validatePaymentContext` 拿 action 自己的 session 和自己比较，这两项检查形同虚设 | 加固（最后的 `assertCurrent` 仍会拦截，审查未发现可利用路径） | 改为与当前钱包 session 比较 | `testnetClient.test.ts` FR-06：有修复时通过，撤掉修复时失败 |
| FR-07 | `testnetClient.ts` 读取发票 | RPC 返回的超大 `expiresAt` 会让 `toISOString` 抛出 RangeError，整页崩溃 | 低（RPC 固定；合约本身限制 7 天） | 读取时拒绝 `expiresAt ≤ 0` 或超出 JS Date 范围的值 | FR-07 |

仍未解决或未验证（不夸大）：

- CSV 公式中和使用 tab 前缀，真实表格软件里的行为未测试（NOT_RUN）。
- 保存交易哈希失败时，内存中出现的“Recover known hash”按钮无法成功。它是失败关闭的，但会误导用户。
- 无哈希的创建请求会让该浏览器中该账户永久不能再创建。这是有意的失败关闭设计，代价是可用性。
- 依赖公告：本轮 `bun audit` 120 秒超时，npm 公告接口 15 秒无响应，记为 BLOCKED。沿用历史记录中的 5 条公告，不声称依赖无漏洞。
- 没有 CSP（静态托管尚未确定）。本轮移除了 Google Fonts，浏览器检查中外部请求为 0。

## 5. 产品与 UI

### 5.1 主故事（定位候选，不是已验证的市场事实）

**谁、什么麻烦**：用 USDC 收小额款的独立开发者或小团队，事后要向付款方、合伙人或会计证明“这一笔确实按这张发票付清了”。
**已有工具解决了什么**：区块浏览器能证明“发生过一笔转账”；钱包能付款；普通发票工具能开单。
**ArcProof 增加的价值**：把固定金额、到期时间和收款人的发票写到链上，只能按原额付一次；收据可以由任何人重新读链核验。核验内容包括合约代码、发票状态、事件、两段原生 USDC 转账和最终块，缺一项就不说“已验证”。
**为什么需要 Arc**：USDC 是原生资产，金额、手续费、结算是同一种币；最终性是确定的；收据来自公开数据，双方不需要共享数据库。
**不说的话**：不是托管、仲裁、退款、税务发票，也不是合规证明。

### 5.2 两个视觉方向，选择了 A

- **A “账本纸”**（采用）：暖白纸色背景、墨色文字、一个强调色（teal-700），收据撕边、编号和印章作为品牌细节，系统字体，数字使用等宽数码。优点是像金融工具、可信、克制；成本是视觉冲击力较弱。
- **B “深色控制台”**（放弃）：深色、霓虹强调、终端风格。更“加密”，但正是委托要求避免的模板感，而且会削弱“模拟/未验证”的琥珀色警示。

### 5.3 具体改动（`faed3c4`）

- 新增 **Overview**（`#/`，不挂钱包、不发链上请求）：一句话用途、本构建能做什么（网络、合约、钱包、演示数据、安全）、免钱包主按钮、三步流程、“已验证”的必要条件和不证明的事、为什么用 Arc。主网构建显示同样的故事，并如实写“未启用”。
- 导航按免钱包程度排序：Overview → Try demo → Verify receipt → Create invoice → Evidence。路由切换时更新页面标题，焦点移到主内容区。
- 设计 token：纸色、墨色、强调色；统一卡片、按钮、chip、印章样式；原创品牌标识和内联 favicon；不再请求 Google Fonts。
- 离线演示：创建后自动在旁边打开对应的模拟收据，并把焦点移过去；“SIMULATED · NOT VERIFIED”印章；列出真实收据必须通过的 5 项检查，均标为“Not run (simulation)”；付款字段明确为空。
- 真实收据：结论用状态框显示（已验证为 teal 并带图标，其余为 amber），未验证时金额降级显示；复制、打开、导出、打印改为 44px 按钮；核验错误会指明是哪一个字段。
- Evidence 页：分为“Recorded so far”和“Not yet shown”，历史测试矩阵折叠，局限说明改成正常字号。页脚去掉内部术语。主网构建横幅加深颜色，并带 “Mainnet preview” 标识。
- 可访问性：演示输入框改用全局 3px 焦点轮廓；标签独占一行；句中链接保持文字流；支持 reduced motion；分页禁用态对比度达标。

### 5.4 前后证据

截图在 `evidence/final-review/<run>/screenshots/{before,after}/`，同名对照。“改造前”来自 HEAD `8f748d3` 的构建（由独立 UI 审查子任务截取），“改造后”来自最终构建。

| 指标（375/768/1440 下所有截图页面合计） | 改造前 | 改造后 |
|---|---|---|
| 对比度不达标 | 12 | 0 |
| 小于 44px 的点击目标 | 18 | 3（均为第三方 ConnectKit 的 40px 按钮，满足 WCAG 2.2 AA 的 24px） |
| 横向溢出 | 0 | 0 |
| 标题层级跳级 | 0 | 0 |
| 首屏 h2 | “Verify a testnet receipt” | “Get paid in USDC. Let anyone verify it from one link.” |
| Evidence 页 ≤12px 文字占比（375） | 76.2% | 43.5% |
| 首页请求数 / 外部请求 / 传输量（冷缓存，本机，5 次中位数） | 7 / 4 / 546 KB | 3 / 0 / 461 KB |
| FCP / CLS（本机） | ~144 ms / 0 | ~140–148 ms / 0 |
| 主 JS 包（原始 / gzip） | 1,483 / 461 KB | 1,499 / 465 KB |

5 秒和 30 秒只是内部体验目标，不是用户测试结论。演示路径在浏览器中的实际操作为：首页按主按钮 → 输入金额 → 创建 → 看到收据，键盘全程可完成（A2、A3）。本机加载时间几乎没有差异；主包里仍包含钱包依赖，按需加载 provider 有破坏会话的风险，本轮暂缓。

### 5.5 与官方评分维度的对应

| 改动 | 对应维度 | 性质 |
|---|---|---|
| FR-01…07 修复、真实浏览器验收 | 可工作的产品（25%） | 有证据支撑 |
| Overview、演示改造、收据结论框 | 可工作的产品（25%）、发展潜力（20%）中“评委能否理解” | 个人产品判断；官方没有单列 UI 分数 |
| Evidence 页、就绪表、演示指南 | 为主网 USDC（30%）和 Studio 使用（25%）准备如实呈现的材料 | 不改变这两项目前为 0 的事实 |
| 视觉方向、字体、印章 | 无直接对应 | 个人判断（“polish is optional”） |

## 6. 测试矩阵（本轮）

| 项 | 结果 | 证据 |
|---|---|---|
| 锁定安装 | PASS | `logs/01-install.log` |
| lint（oxlint type-aware + 全仓库）+ tsc | PASS | `logs/02`（基线）、`logs/12`（最终） |
| 单元/集成（vitest） | PASS 485/485，31 个文件（基线 462/29） | `logs/03`、`logs/13` |
| 回归红→绿 | 7 项失败 → 12/12 通过 | `logs/05`、`logs/06` |
| testnet / mainnet 构建 | PASS | `logs/10-*`、`build/build-provenance-*.json`（各 84 个产物哈希） |
| 非法网络选择（`''`、`' '`、`Mainnet`、`devnet`） | PASS（全部退出码 1） | `logs/11-invalid-selectors.log` |
| 真实浏览器验收 | PASS 23/23 | `browser/browser-acceptance.json` |
| — 首访免钱包、键盘跳转链接/主按钮 | PASS | A1、A2 |
| — 演示键盘创建、JSON/CSV 真实下载并回读 | PASS | A3、A4、`browser/downloads/` |
| — 非法金额、非法核验输入（无请求）、前导零/重复 tx/未知路由/未知部署 | PASS | A5–A7 |
| — 返回导航、320/375 与 200% 缩放等效视口、reduced motion | PASS | A8–A10（视口模拟，不是真机） |
| — 主网构建：首页如实未启用、钱包路由只读、旧测试网链接、构建身份 | PASS | A11 |
| — 外部请求 0、未捕获异常 0 | PASS | A12、A13 |
| 375/768/1440 截图与指标 | PASS | `ui-metrics/` |
| 依赖公告审计 | BLOCKED（网络超时） | `logs/07-bun-audit.err` |
| Forge 合约测试 | NOT_RUN（本机无 Foundry；合约哈希与 G1 一致） | — |
| CSV 表格软件往返、打印/PDF、浏览器内真实剪贴板、真实多标签页 | NOT_RUN | 只有 jsdom 测试覆盖 |
| 真实钱包、测试网 RPC、主网部署/交易 | NOT_RUN（未授权） | — |
| Studio 同步 | NOT_RUN（新快照待批准后同步） | `docs/SUBMISSION_READINESS.md` §5 |
| CI | NOT_RUN（仓库没有启用的 workflow） | — |

各项计数有重叠，不能相加。

## 7. 风险、授权与费用

- **参赛硬门槛未满足**：主网部署、真实 USDC 交易、公开应用/仓库、视频。
- **资格未知**：混合工具链的解释、个人资格与筛查、过往资助、平台内容许可。
- **安全**：合约未经专业审计；单张发票上限 1 USDC；原子转付会经手资金。
- **费用**：本轮没有新增付费服务。主网阶段需要用户自备少量 USDC 支付 gas 和测试付款，金额由用户决定。
- **获奖与付款**：是否入选、批次和付款时间都未知，`cash_fast_pass=false`。

## 8. 唯一下一步

**由用户决定是否进入单独的“主网启用”阶段。** 先把本轮快照 `b3bf6b03…` 同步到既有 Studio 项目并回读（就绪表 §5），再在可信钱包中亲自签名部署合约。之后的只读核验、写入可信清单、全量重测和两钱包小额付款，都按 `docs/SUBMISSION_READINESS.md` 中 R3–R5 的验收方法逐项执行。

## 附：Studio 同步清单（待批准）

改动（21 个）：`index.html`、`tailwind.config.js`、`src/index.css`、`src/App.tsx`、`src/arcproof/{routes,networkPolicy,exportUtils,receiptVerifier,testnetClient}.ts`、`src/components/arcproof/{DashboardScreen,DemoReceipt,EvidenceScreen,Layout,NetworkUnavailable,ReceiptFacts,TestnetScreens,UnavailableRequest}.tsx`，以及测试 `mainnetReadonlyUi`、`offlineDemo`、`readonlyRoutes`、`testnetClient`。
新增（5 个）：`src/arcproof/receiptCurrency.ts`、`src/components/arcproof/{BrandMark,HomeScreen}.tsx`、`src/arcproof/__tests__/{finalReviewRegressions.test.tsx,receiptCurrency.test.ts}`。
逐文件哈希见 `evidence/final-review/<run>/build/source-snapshot.json`。
