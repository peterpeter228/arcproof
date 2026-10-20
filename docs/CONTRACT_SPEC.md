# ArcProof P0 原子发票直付合约规范

版本：2026-10-20，实施规格。本文规定接口、行为和验收要求，**不包含可部署 Solidity 实现**。

## 1. 决策与执行前提

P0 是在 Arc Studio 中构建的、小额原生 USDC 发票付款原型。付款人确认不可修改的发票条款后，调用一次付款函数；该交易把付款金额全额转给固定商户，并记录一次性付款状态。应用没有等待验收、等待裁决或等待解锁的本金余额。

该设计会执行真实资金转移。原子性和不保留正常付款余额降低了复杂度，**不代表代码无风险、获得审计认证或保证获奖**。用户已有“零自建资金托管合约”约束继续生效；不得把本规格扩展成 escrow、vault 或资金池。

Grant 资格 G0 需核实：本期官方完整规则、提交入口、申请人资格、Arc Studio 可用性及额度、截止时区、Studio 项目证据要求、原子直付方案与本期要求的适配。用户于 2026-10-20 03:37:56 UTC 已另行授权免费 Studio 原型与自动测试，因此 Grant G0 未通过不阻止该原型合约实现。安全规范与实际资金操作门槛不变。主网部署、真钱支付和对外提交还须处于当前有效授权范围内；本 PRD 本身不授予签名、消费或发布权限。

整个工程上限为 18 小时。这个上限限制范围，不能成为省略资金安全验收的理由；安全门槛未通过则不进行主网步骤。

## 2. P0 明确范围

允许的持久状态只有发票条款、商户 nonce 和付款完成事实。没有用户资金账户，也没有平台代管私钥。

| 项目 | P0 决策 |
| --- | --- |
| 钱种 | Arc 原生 USDC；调用 `payInvoice` 的 `msg.value` 使用 18 位小数 |
| 商户 | 创建发票的 `msg.sender`，不可另填或修改 |
| 付款金额 | 固定、精确、一次性；最小 0.000001 USDC，最大 1 USDC |
| 发票期限 | 创建时设置，创建后不变；到期只能阻止新付款 |
| 条款摘要 | 合约保留字段；P0 界面创建时始终传零，只支持付款零摘要请求；非零摘要请求仍可只读查看及核实既有付款 |
| 取消 | 不做；用短有效期控制过时请求 |
| 付款 | 一笔交易内全部转给固定商户；接收失败则全部回滚 |
| 退款 | 不做；商户如需退钱，另行主动付款，与本发票状态分离 |
| 收费 | 不抽取平台费；付款人另外承担网络 Gas |
| 正式支持的钱包 | UI 首版支持普通 EOA；合约恶意接收方必须作为测试对象 |
| 后台 | 不加服务器、数据库、登录系统、付款代理或后台自动签名 |
| 禁止功能 | owner/admin、升级代理、deposit、escrow、vault、withdraw、rescue、退款池、定时释放、AI 验收、x402、ERC-8183、自动交易 |

P0 的 1 USDC 上限是**单张发票**上限，不是账户、项目或全部交易的累计风险上限。部署费与 Gas 也不包括在发票金额中。后续更大金额版本需要单独的需求、评审和部署决定，不能通过配置或管理函数放开本部署的上限。

## 3. 金额和网络规范

### 3.1 金额唯一表示

- 合约参数、存储、事件和 `msg.value` 统一为 `uint256 amountNative`，1 USDC = `10^18` 单位。
- `MAX_INVOICE_AMOUNT = 1_000_000_000_000_000_000`。
- `AMOUNT_QUANTUM = 1_000_000_000_000`，即一 microUSDC。
- 合约检查 `amountNative > 0`、`amountNative <= MAX_INVOICE_AMOUNT`、`amountNative % AMOUNT_QUANTUM == 0`。
- UI 只接受最多六位小数的十进制字符串。先解析成整数 microUSDC，再乘 `10^12`。不得先转 JavaScript `Number`、使用浮点四舍五入或把 ERC-20 的六位单位直接塞进 `value`。
- 不静默把七位小数截断成六位；不接受科学计数法、负号、NaN 或 Infinity。
- 金额显示用同一整数工具函数。Gas 使用原生 18 位单位单独显示，不能记作商户收款。

### 3.2 网络参数

| 参数 | Arc Testnet | Arc Mainnet |
| --- | --- | --- |
| chainId | 5042002 | 5042 |
| RPC | `https://rpc.testnet.arc.io` | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` | `https://explorer.arc.io` |
| 原生资产 | 测试 USDC | USDC |

以上是核实日官方文档值。运行时必须查询 RPC `eth_chainId`，检查连接钱包的 chainId 和部署 manifest；不得仅相信 UI 网络标签。测试网与主网的部署地址、交易、收据、缓存分开保存。

### 3.3 部署身份

每个实际部署分配不可变的 `deploymentId`，由受信 manifest 固定映射到 `chainId`、项目合约地址及已核实的代码记录。重新部署必须创建新 ID，并保留旧部署记录，不能把旧 ID 重新指向新地址。

分享路由、读取接口、凭证核验和缓存键统一使用 `chainId + deploymentId + invoiceId`。付款链接形式为 `/#/pay/:chainId/:deploymentId/:invoiceId`；收据链接形式为 `/#/receipt/:chainId/:deploymentId/:invoiceId?tx=...`。URL 只提供查找标识，不提供可信合约配置。未知部署或链与 manifest 不一致时拒绝签名；不得根据 URL 任意地址自动建立白名单。既有发票和收据始终使用原部署，不随“当前部署”变化迁移。

## 4. 数据结构与接口约束

以下是接口契约，不是实现。名称可在实现前做一次统一调整；不得在不同模块中为同一字段使用互不兼容的含义。

### 4.1 只读发票数据

| 字段 | 建议类型 | 不变量 |
| --- | --- | --- |
| `merchant` | `address` | 创建交易的调用者；不可改变；非零 |
| `amountNative` | `uint256` | 满足金额边界，创建后不可改 |
| `expiresAt` | `uint64` | Unix 秒；创建后不可改 |
| `termsHash` | `bytes32` | 可选条款摘要；零值表示无摘要；创建后不可改 |
| `paid` | `bool` | 初值 false，只能成功付款时变 true |
| `payer` | `address` | 未付款为零；成功付款时固定为付款调用者 |
| `paidAt` | `uint64` | 未付款为零；成功付款时记录区块时间 |
| `paidBlockNumber` | `uint256` | 未付款为零；成功付款时记录 `block.number`，用于限定付款事件的查询区块 |

未找到的发票必须有独立返回状态或明确错误，不能被前端解释为“零金额已付款发票”。建议 `getInvoice` 对未知 ID 抛 `UnknownInvoice`，客户端明确显示“未找到”。

### 4.2 函数接口

| 函数 | 可见性与付费性 | 作用 |
| --- | --- | --- |
| `createInvoice(uint256 amountNative, uint64 expiresAt, bytes32 termsHash) returns (bytes32 invoiceId)` | `external`、非 payable、统一 nonReentrant | 创建不可变条款；商户强制等于 `msg.sender` |
| `payInvoice(bytes32 invoiceId)` | `external payable`、统一 nonReentrant | 校验发票、精确金额、时间和状态，再完成原子转付 |
| `getInvoice(bytes32 invoiceId)` | `external view` | 返回完整发票及付款事实 |
| `nextNonce(address merchant)` | `external view` | 返回该商户下一次创建发票使用的 nonce |
| `MAX_INVOICE_AMOUNT()` | `external view` 或常量 getter | 向前端公开不可调整的小额上限 |

禁止在 `createInvoice` 增加可任意指定的 `merchant`、`recipient` 或后续改收款地址函数。禁止在 `payInvoice` 传入一个可以覆盖链上金额或收款人的参数。

### 4.3 发票 ID

唯一派生规范：

`invoiceId = keccak256(abi.encode(uint256 chainId, address contractAddress, address merchant, uint256 merchantNonce))`

上述表达式规定 ABI 编码的类型和顺序：四个值分别是 `block.chainid`、`address(this)`、`msg.sender` 和商户当前 nonce。不是 `abi.encodePacked`，也不是字符串拼接。前端必须使用完全相同的四种类型、顺序和值。

每个商户初始 `nextNonce = 0`。`nextNonce` 表示下一个尚未使用的 nonce；成功创建后恰好递增一次，失败不递增。读取值为 N 时，已创建 nonce 范围为 `[0, N)`；最近一页从 `N - 1` 向前读取，N 为零时返回空列表。链、部署、商户的变化必须隔离分页游标和缓存。对按 nonce 重建的每个 ID 仍须调用该部署的 `getInvoice`，不能把推导结果本身当存在证明。

这可防止别人使用相同外部订单号抢占另一个商户的发票空间，并隔离不同部署和网络。前端不得自行生成一个“随机 ID”就声称已创建链上发票；必须解析已确认的创建事件，并读回条款。

### 4.4 事件接口

```solidity
// 接口示意，不含实现。
event InvoiceCreated(
    bytes32 indexed invoiceId,
    address indexed merchant,
    uint256 merchantNonce,
    uint256 amountNative,
    uint64 expiresAt,
    bytes32 termsHash
);

event InvoicePaid(
    bytes32 indexed invoiceId,
    address indexed payer,
    address indexed merchant,
    uint256 amountNative
);
```

事件用于检索和对账，不能脱离成功 receipt、正确链与合约地址独立充当到账证明。发票内容正文、客户姓名、邮箱、聊天记录、交付文件不得写入事件或存储。

### 4.5 建议错误语义

`InvalidAmount`、`AmountAboveAlphaCap`、`UnsupportedAmountPrecision`、`InvalidExpiry`、`UnknownInvoice`、`InvoiceExpired`、`InvoiceAlreadyPaid`、`IncorrectPaymentAmount`、`MerchantTransferFailed`、`UnexpectedBalanceChange`。

实现可采用 custom errors。错误必须映射成用户可理解的信息；不得把未知 RPC 错误一律显示成“余额不足”。

## 5. 状态与交易行为

### 5.1 状态推导

| 状态 | 判断 | 可执行行为 |
| --- | --- | --- |
| 不存在 | 没有发票记录 | 不能付款 |
| 待付款 | 存在、`paid=false`、当前区块时间 `< expiresAt` | 可付款 |
| 已过期 | 存在、`paid=false`、当前区块时间 `>= expiresAt` | 只读 |
| 已付款 | `paid=true` | 只读；期限过去也仍为已付款 |

无需链上写入 `expired`。日期到来不会自动执行交易、退款或资金释放，因为没有待解锁本金。

### 5.2 创建

1. 校验金额、精度及 `block.timestamp < expiresAt <= block.timestamp + 7 days`；termsHash 可以为零，表示没有附加条款摘要。
2. 从当前调用者的 nonce 计算 ID。
3. 写入不可变发票数据，推进 nonce，发出 `InvoiceCreated`。
4. 不调用外部合约，不收取发票本金。创建者支付网络 Gas。

### 5.3 付款

1. 进入成熟库的重入保护。
2. 校验发票存在、尚未付款、未过期，以及 `msg.value` 精确等于固定金额。
3. 记录 `balanceBefore = address(this).balance - msg.value`，并在任何外部调用之前标记 `paid`、`payer`、`paidAt` 和 `paidBlockNumber = block.number`。
4. 向固定商户转出**本次 `msg.value`**。不得使用 `address(this).balance` 作为转出金额。
5. 商户接收失败时 revert，连同付款状态与金额变动全部回滚。
6. 转付返回后检查 `address(this).balance == balanceBefore`；若接收方在回调中强塞了额外余额或出现其他意外余额变化，整笔 revert，保持“所有成功付款余额净增零”的严格不变量。
7. 全部检查成功后发出 `InvoicePaid`。

不要用仅 2300 Gas 的 `transfer` 来替代经过测试的调用模式。外部接收方可执行代码，所以检查—更新—交互和重入保护均必要。依赖使用明确锁定的成熟库版本；不自行拼凑“防重入”布尔锁替代已复用的库。

`payInvoice` 的重入锁必须覆盖所有发票，不能只锁当前 ID。本版 createInvoice 与 payInvoice 两个变更入口统一使用同一成熟 nonReentrant 保护；回调中重入创建也拒绝，以保持实现和测试口径唯一。

### 5.4 接收范围

不提供收钱的 `receive` 或 `fallback` 入口。只允许通过合法 `payInvoice` 转付正常付款。合约仍可能在独立交易或其他外生路径后处于具有意外余额的状态；不得以“常规入口不收钱”推导绝对零余额。付款函数的前后余额检查只约束这次成功调用，不授权取走之前的意外余额。

P0 UI 只正式支持经过验证的 EOA 商户与付款钱包。UI 限制不是安全边界，合约必须能够安全拒绝/回滚恶意合约接收方的行为。

## 6. 安全不变量

| 编号 | 必须成立 |
| --- | --- |
| I-01 条款不可变 | 创建后 merchant、amountNative、expiresAt、termsHash 始终不变 |
| I-02 精确付款 | 只有 `msg.value == amountNative` 的合法未过期付款可能成功 |
| I-03 单次完成 | 一张发票最多出现一次成功付款，不因重入或重复提交再次成功 |
| I-04 全额转付 | 正常成功付款将当笔金额全额转给固定商户；没有平台抽成 |
| I-05 无正常资金留存 | 成功付款后合约余额等于该调用前余额，不新增正常业务余额 |
| I-06 回滚一致性 | 接收失败或校验失败时，状态、事件和本次资金转移均不生效；失败交易的 Gas 仍可能消耗 |
| I-07 意外余额隔离 | 预先存在的意外余额不被任何付款带走，也不补足错误 `msg.value` |
| I-08 无特权 | 不存在改变条款、提走余额、升级实现、任意调用或扣划授权的管理员路径 |
| I-09 ID 隔离 | 不同商户、nonce、链和部署具有独立发票命名空间 |
| I-10 隐私最小化 | 链上仅存随机业务标识和条款摘要，不记录客户正文资料 |

I-04 的收款余额核验必须扣除收款人自己同时承担的 Gas 或复杂回调行为。正式主网演示用不同的 EOA 付款人与商户，以获得可清楚解释的资金证据。

## 7. 前端必须遵守的签名前检查

从可信 RPC 读 `getInvoice`，对照当前网络、固定部署地址和该部署的代码校验记录。UI 展示完整可复制的商户地址、网络、固定金额、到期时间、是否已付款及预估 Gas。签名请求的目标必须是该部署、函数必须是 `payInvoice(id)`、`value` 必须是读回金额。

URL 和本地存储都是不可信输入。它们可以帮助定位 ID，不能覆盖链上的收款人或金额。P0 界面创建时始终发送零 `termsHash`，并显示“无附加条款摘要”。可选标题只作为未签名、未绑定的纯文本展示，不写成已上链或已验证的条款。

读取到非零 `termsHash` 时，P0 付款准备返回 `UNSUPPORTED_TERMS`，禁止发起付款；不因链接提供了正文或某个摘要看起来匹配就放行。合约本身仍保留非零摘要字段与既有支付能力，这个前端支持范围不能被描述成合约会拒绝所有非零摘要。非零摘要发票可以只读查看；已有付款可按资金证据核实，但界面必须说明附加条款未受本版验证支持。一个条款 hash 不证明商户真实身份或交付质量。

### 7.1 PreparedPayment 与签名时效

`PreparedPayment` 必须绑定 `chainId`、`deploymentId`、`contract`、`payer`、`invoiceId`、`value`、`calldata` 和 `connectionVersion`。`value` 使用原生18位整数。模拟与估费结果只能用于生成它的这组上下文，不能作为可跨账户、跨网络或跨发票重用的缓存请求。

监听账户、网络、发票和部署变化；任一变化都递增连接/请求版本，废弃旧 PreparedPayment，并忽略随后到达的旧异步结果。即使旧 RPC 模拟较晚成功返回，也不得重新启用旧付款请求。

实际调用钱包前再次比较绑定上下文并重读必要链上状态。广播请求显式固定 `from`、`chainId`、`to`、`data`、`value`；不在最后一刻从不同的“当前账户”变量补入字段。上下文变化时重新准备，不悄悄改写用户刚核对过的请求。

请求已经交给钱包后，应用不能保证撤销它。发票可能在等待钱包确认期间被另一人支付，后续交易会由合约拒绝且可能消耗 Gas。广播后必须核实实际交易字段，不把 PreparedPayment 中的预期付款人当成真实 `tx.from`。

不能自动重复广播付款。超时后保留原交易 hash，先检查 receipt、发票链上状态、钱包 nonce 和可能的替换交易。页面刷新不得把“未查询到 receipt”变成“确定未付款”。

## 8. 收据验证规范

### 8.1 必须核实的原始证据

- RPC 返回的 chainId 与部署 manifest 一致。
- 交易确实存在；`to` 是项目合约；`from` 与记载付款人一致。
- 交易 input 解码为 `payInvoice(expectedInvoiceId)`，不能只看方法名字符串。
- 交易 `value` 等于链上固定金额，单位为原生 18 位。
- `receipt.status` 为成功，receipt 的交易 hash 与查询目标相同。
- 正确合约 emitter 的 `InvoicePaid` 与 ID、payer、merchant、amount 全部匹配；排除其他合约伪造的同名事件。
- `getInvoice` 读回结果为已付款，付款人、金额和条款一致。
- `paidBlockNumber` 与 receipt 区块号一致，`paidAt` 与该区块时间一致；缓存和链接中的区块信息不能覆盖读回结果。
- receipt 的 blockHash 与按高度读取的区块 hash 一致，网络有可用的最终性证据。Arc 具有确定性最终性，不把“再等 N 个 Ethereum 确认”伪装成协议要求。
- RPC 返回不一致、区块 hash 不一致、receipt 消失或最终性无法判断时，状态为“待核实”，不发已验证收据；必要时用第二个已核实的 RPC 交叉读取。

### 8.1.1 没有 txHash 时恢复收据

清空本地存储或换浏览器后，先在原 `chainId + deploymentId` 下读取发票。若已付款且没有 txHash，使用 `paidBlockNumber` 将 `eth_getLogs` 的起止区块限定为同一个区块，按项目合约 emitter、`InvoicePaid` 事件签名和 indexed `invoiceId` 查询。恰好一个匹配事件时取其 `transactionHash` 与 `logIndex`，再运行上面的完整凭证核验；查询得到事件本身不等于已验证付款。

零匹配、多匹配、RPC 无法返回指定区块或与链上字段冲突时标记待核实，不伪造 hash、不从创世区块开始扫描、不用时间戳猜交易。项目无需后端索引或在合约中存储当前交易 hash。手工提供 txHash 时也执行同一验证路径。

### 8.2 Arc 原生资金事件

本方案用原生 USDC，不用 ERC-20 approve 或 transferFrom。Arc 系统 Transfer 日志 emitter 为 `0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE`，金额使用18位。

在真正的 Arc 测试网先实证、记录该支付路径的日志，然后验证付款人至项目合约、项目合约至固定商户的资金移动与事件金额相符。不要未经实际测试就锁死系统日志在 receipt 中的位置或把所有同名日志相加。对账按 emitter、from、to、金额和交易上下文识别，Gas 另从 receipt 计算。

若将来接入 ERC-20 路径，要重新设计去重：Arc 的一次 ERC-20 转账可能同时发出6位 ERC-20 Transfer和18位系统 Transfer。同一笔钱不能算两遍。P0 不实现这个扩展。

### 8.3 收据含义与导出

导出的 JSON/CSV 至少有 schemaVersion、chainId、deploymentId、contractAddress、invoiceId、txHash、paymentLogIndex、blockNumber、paidBlockNumber、blockHash、paidAt、payer、merchant、amountNative 字符串、amountDisplay、gasFeeNative 字符串、verifiedAt、verificationStatus。`paymentLogIndex` 来自已核实 receipt 中本项目的 `InvoicePaid` 事件，必须是非负整数；金额和区块号大整数使用十进制字符串，不得作为 JSON Number。

付款业务事实使用 `chainId + deploymentId + invoiceId` 标识，交易事件使用 `chainId + txHash + paymentLogIndex` 标识。导入 JSON 中的 verified 状态只作缓存，不作为证明；重新读链核验后才显示已验证。重复读取、导入和导出同一事实不能记为另一笔收入。

收据声明“某次支付已在指定链和指定商户地址核实”，不声明法币到账、法定税务发票、商品已交付、无欺诈或用户盈利。主网自测另标 `controlled_demo`，不能纳入付费客户或收入证据。

## 9. 构建、来源与部署门槛

- 保留 Arc Studio 原始 project URL、提示文件、测试输出、生成时间及代码导出记录。
- 合约和 app 应真实在 Studio 中创建及测试；不能先在外部写完整项目再补生成截图冒充。
- 保留 Studio 的 Vite React TypeScript + Foundry scaffold；在根执行环境独立审阅并测试拉回的代码。必要修正记录差异及复核，不把 Studio 的自述当部署事实。
- 使用本地 Foundry 测资金与状态正确性；一般 Anvil 不实现 Arc 全部特殊行为，不能替代 Arc 测试网验证。
- 部署 manifest 记录 chainId、地址、编译器、依赖锁定信息、源代码 commit、构造参数、部署 tx、字节码 hash、验证时间及 Explorer URL。P0 不应有可调整资金行为的构造参数。
- 主网前全部资金安全用例必须通过；完成 RPC、Gas 实时估算、地址与代码核验、钱包签名材料，以及 Studio 本身不代部署主网的交接。
- 没有外部审计时写“未接受独立专业审计”，不能把两个 LLM 的审查或测试通过写成“已审计”。

## 10. 一手技术来源

访问核实日期：2026-10-20。实施当天重新读取涉及部署的参数；来源内容本身与可运行行为不一致时，以阻断和实测记录处理，不静默猜测。

1. Arc Studio：<https://docs.arc.io/ai/arc-studio> — Studio 的测试网范围及导出能力。
2. Arc Studio CLI：<https://docs.arc.io/ai/arc-studio-cli> — coding-agent 编排、结构化结果、Vite/Foundry workspace、pull。
3. 网络配置：<https://docs.arc.io/arc/references/connect-to-arc>。
4. 原生资产与 ERC-20 精度：<https://docs.arc.io/arc/references/contract-addresses>。
5. 系统日志：<https://docs.arc.io/arc/references/usdc-system-events>。
6. Gas：<https://docs.arc.io/arc/references/gas-and-fees> — 设计目标不是实际交易价格承诺，需运行时估算。
7. 确定性最终性：<https://docs.arc.io/arc/concepts/deterministic-finality>。
8. 官方 Memo 复用路径及 EOA 限制：<https://docs.arc.io/arc/concepts/transaction-memos>。该路径可作独立产品备选，但未证明能替代本轮“Studio 项目合约”要求。
9. Arc Studio Group：<https://community.arc.io/pages/arc-studio-xm3qwi> — 本轮8份500 USDC及11月1日日期的官方摘要；完整参赛资格仍以当期 DoraHacks 规则为准。
10. OpenZeppelin Contracts 工具 API：<https://docs.openzeppelin.com/contracts/5.x/api/utils> — ReentrancyGuard、发送原生资产的 Gas/重入注意事项；实施时锁定并核对具体安装版本。

