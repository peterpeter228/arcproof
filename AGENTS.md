# 2026-10-26 07:50 UTC 已核对的 Arc 主网部署

`PRODUCTION_MANIFEST` 现为已核对的 chain `5042` 合约 `0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE`，`writesAccepted=true`（代码阶段 W2 / 操作者阶段 U2_paid）。`MAINNET_SAMPLE` 是付款 `0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce`（发票 `0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae`，0.20 USDC）。公开 App 是 https://zippy-narwhal-31f5db.netlify.app 。走查视频是 https://youtu.be/fRGUjTdF3nk（YouTube Unlisted）。DoraHacks 提交仍未进行。下方“production manifest 保持空、主网钱包动作关闭”是该部署之前的口径，不再描述当前清单。仍不由此推导新的签名、转账、Studio Publish 或 DoraHacks 提交。Studio Deploy 误点的测试网 `0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018` 不是主网合约。

# 2026-10-21 22:42:43 UTC 当前阶段授权（优先于下方历史 18 小时限制）

用户明确同意：本阶段不再沿用无法核对的 18 小时工程上限，同步既有 Arc Studio 项目并继续私有主网适配；安排初审、最终复审各一次 Argon 调用。仍不部署、不签名、不转账、不公开。本调整不是无限投入承诺，不扩大付费服务、凭据、资金或比赛提交权限。按可验证里程碑推进，安全阻塞不得以工期理由跳过。

本阶段基线为 `4deb74cce889ca122ef33903d27c2be10a1c437e`。下方旧授权及旧文档的 18 小时记载属于历史，不作为本阶段熔断；其它安全约束继续生效。主网配置不等于主网验收；production manifest 保持空、所有主网钱包动作关闭。详见 `docs/PRIVATE_MAINNET_PHASE_20261021.md`。

---

# 当前用户授权调整：免费原型路径

2026-10-20 03:37:56 UTC，用户要求直接执行，不再纠结国籍。本调整仅覆盖免费 Arc Studio 原型构建和测试，独立于尚未通过的 Grant 资格 G0。不要继续把国籍、领奖资格、截止时区或未来钱包交接作为免费非真钱原型工作的前置阻塞。

Grant 资格仍未知，G0 不伪标通过，fast_cash=false。原始规格中的金额/状态/重入/收据/来源与全部安全验收继续生效，总工时仍上限 18 小时。使用 prompts/ARC_STUDIO_PROTOTYPE_BUILD.txt，它只调整构建启动门槛，不放宽安全规范。

允许：已授权账号内的免费 Studio 原型生成、本地/Studio 自动测试、源码导出和私有仓库工作。测试网仅限测试资产及既有授权内操作；遇需真实钱包签名或新权限则停在该动作前继续独立工作。
禁止由本次简短指令推导：真钱或主网操作、付费/额度升级、公开发布或公开仓库、Grant 报名/提交、外部 Q&A 或通信、新持久访问授权。遇支付/额度上限先保存结果并停，不自动购买。该调整不证明项目参赛合格或实际审计通过。

以下工作规格已与该有限授权协调。原始包仅在 docs/source 中按原样保存，不作为当前启动指令。

# ArcProof 执行约束

## 目标

实施 docs/02_PRODUCT_PRD.md 中的唯一条件主选，免费原型立即按既定安全范围逐段推进；Grant 资格 G0 独立保持未通过，不能据此宣称参赛适格。不要重新发散选项目。18 小时是总工程熔断上限，不是必须消耗的预算；没有获奖概率或短期回款保证。

## 阅读顺序和唯一口径

读取 START_HERE.txt、docs/01_VERIFIED_REVIEW.md、docs/02_PRODUCT_PRD.md、docs/CONTRACT_SPEC.md、docs/TEST_MATRIX.md、docs/03_DOT_EXECUTION.md 和 STATUS.md。发现冲突先修正文档口径，不凭自己喜欢的一版继续。明确的用户新指令和当前工具权限优先；本文不绕过它们。

固定接口和口径：合约事件为 InvoiceCreated / InvoicePaid；P0界面始终创建零 termsHash，非零摘要请求只读、不可从本界面付款；有效期在创建时大于区块时间且最多7天，默认24小时；两个状态修改函数统一使用同一个成熟 nonReentrant 保护；单张上限1USDC。99美元诊断费抵扣升级总价299美元；余额200美元按开始前100、验收后100收取，不重复计收入。

部署身份不可变：所有链接、缓存和读取含chainId/deploymentId/invoiceId，manifest保留旧部署。ID固定为keccak256(abi.encode(uint256 chainId,address contract,address merchant,uint256 nonce))，nextNonce从0开始表示下一未用。成功付款保存paidBlockNumber，缺txHash时只查询该区块特定InvoicePaid并完整复核；导出paymentLogIndex。PreparedPayment绑定钱包和部署上下文，账户/链/发票/部署切换废弃旧对象及旧异步结果。

## G0

以本期 DoraHacks 正式条款及官方 Arc 社区页确认资格、提交状态、Studio 证据要求和精确截止。第一期规则不得自动继承。关键资格未知阻止资格通过声明，但不阻止用户已授权的免费 Studio 原型合约、界面和自动测试。真钱、主网、外部发布/提交仍独立受限。付款日期未知时 cash_fast_pass=false，即使其他条件允许把项目作为 Grant 实验。

只在确实需要本人信息或缺少具体动作授权时提出集中、具体的问题；先做完可独立完成的部分。不要为颜色、目录名、代码分层或普通依赖选择请求确认。

## 固定实现范围

Vite + React + TypeScript + viem/wagmi + Foundry + OpenZeppelin ReentrancyGuard。保留 Studio scaffold 和生成来源。静态前端、链上发票、浏览器钱包，P0 不加服务器、数据库、账号、AI API。依赖版本由当前官方文档与实际环境核对后锁定。

只实现创建固定发票、一次性原子转付、独立收据验证和导出。不得加 escrow、vault、deposit、withdraw、rescue、owner、升级代理、任意外部调用、平台抽成、x402、ERC-8183、自动退款、超时释放或 Agent 自主支出。普通 EOA 是首版明确支持范围，不承诺所有账户抽象钱包。

本次自建代码只执行同交易原子转付，不允许跨交易保管待释放本金。它会接触资金，不得写零风险、已审计或官方认证。任何违反这条边界的需求立即从本轮删除。

## 金额与安全

输入最多 6 位小数，先解析整数 microUSDC，再乘 10^12 得 native18。禁止浮点。0.20 USDC 的 value 是 200000000000000000。系统事件18位与 ERC-20 事件6位不得混算。余额/Gas 不重复计入收入。

收款地址为发票创建者；条款不可改；同一发票只能成功一次；付款失败状态和资金转移一起回滚。严格付款前后余额检查与重入保护按 CONTRACT_SPEC 执行。预先存在的意外余额既不能被提取也不能用于补款。

测试、测试网、主网和提交是不同验收级别。普通 Anvil 不替代 Arc 系统事件和最终性实测。测试不通过不部署，时间不够不删必要验证。

## 工具与协作

dot 为唯一 Root，负责决策、时间账、状态和合并。最多同时委派合约、界面、独立验收三个明确任务；没有并行工具就顺序做。不要新建“多 Agent 框架”。共享同一仓库时使用独立分支/worktree和清楚文件归属，禁止多人改同一文件。

优先现成连接器、官方 CLI 与可复現命令。Studio 只自动部署测试网。使用 prompt-file，保存 session/app/project URL；拉回代码先看 diff，不用 --force 覆盖本地修改。结构化输出、模型自述、部署地址都须独立核验。

外部 Gemini 监督若已有连接及授权，可用于独立代码意见；没有则使用另一个独立审查任务，不为本项目购买新模型服务或泄露源码与密钥。LLM 审查不等于专业审计。

## 授权与秘密

遵守当前会话已经给出的有效授权，已有授权不重复询问。不能仅凭这份 PRD 推断有主网签名、买币、桥接、付费服务、公开仓库、公开发布、报名或对外发信许可。先把代码、测试、部署摘要、公开范围和提交文本做成可审查结果，再处理具体受限动作。

私钥、助记词、API key、登录 token、KYC 身份材料不进入聊天、源码、截图、日志或开发包。登录用正规的私密登录流程。部署和付款由本人钱包签名；本轮没有后台代签器。建议 20 美元成本上限不等于 agent 获得消费授权。

## 状态、证据和停止

每阶段更新 STATUS.md、evidence/gate.json、evidence/test-results.json、evidence/artifact-index.json 和工时账。长任务中保留 commit、下一步、阻塞原因；恢复时先读状态而非重新开始。

只用 not_run / passed / failed / blocked 记录验证。还没部署的地址、hash、URL保持null。源码、Studio、构建、部署和receipt绑定同一版本。自转标controlled_demo，fixture永远不填入主网证据。

不伪造客户、收入、获奖、视频、访问量、截图或提交状态。规则失效、资格不符、资金风险无法解决或时间/成本超限时停止相关路径，保存可复用结果和明确原因。不能为了交“完成”修改测试期望、扩大授权或绕过平台限制。
