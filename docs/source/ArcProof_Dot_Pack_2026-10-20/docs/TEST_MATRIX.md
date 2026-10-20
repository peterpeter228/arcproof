# ArcProof P0 验收矩阵

版本：2026-10-20。此处定义待执行测试，不表示任何测试已经运行或通过。总计28个验收条目；每条可以包含必要的参数化子用例。测试实现以 `CONTRACT_SPEC.md` 为准。

## 1. 分层与通过规则

| 层级 | 环境 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| L1 | 本地 Foundry/EVM | 发票状态、资金守恒、重入、回滚、边界、命名空间 | Arc 真实系统事件、实际费用、真实钱包/网络兼容性 |
| L2 | 本地前端与受控钱包/RPC fixture | 金额解析、签名参数、状态恢复、错误处理、收据核验器拒绝伪造输入 | 真实链可用性和主网成功 |
| L3 | Arc Testnet + EOA 测试钱包 | Arc 原生USDC单位、系统日志、钱包签名、最终性及真实网络流程 | 主网资金、主网领取资格或真实用户需求 |
| L4 | 主网，须处于有效授权范围 | 小额自测的真实主网交易证据 | 奖金获批、商业收入、用户牵引力或专业审计 |
| L5 | 只读发布/提交材料检查 | source→Studio→build→deployment→receipt证据链完整 | 未实际执行的动作已经完成 |

Foundry 的 `anvil`/普通 EVM 不等于 Arc 节点。L1 全绿不能替代 L3。Arc 特殊日志不能通过在本地 fixture 里手写一个期望事件就声称“已主网兼容”。

每条记录 `not_run / passed / failed / blocked`，附命令或操作、执行日期、代码commit、环境、实际结果和证据路径。失败与阻塞不能改名为“基本通过”。

## 2. 合约与本地金额/状态测试（T01–T17）

| ID | 场景及输入 | 预期结果 | 层级/证据 |
| --- | --- | --- | --- |
| T01 | 普通EOA创建有效发票；金额0.20 USDC，未来到期、零termsHash | 固定merchant=创建者；nonce递增一次；读回条款一致；paidAt/paidBlockNumber为零；正确InvoiceCreated；不接收本金 | L1：Foundry断言、事件解码 |
| T02 | 金额边界参数化：0、1微USDC、1USDC、1USDC+1微、1wei、不满足1e12整数倍 | 仅非零、≤1USDC且符合六位精度者可创建；无静默舍入；失败不耗nonce、不留记录 | L1：参数化边界结果 |
| T03 | 到期和条款边界：过去、恰等于当前时间、未来；零/非零termsHash | 创建要求当前区块时间<expiresAt≤当前时间+7天；零termsHash表示无摘要，非零摘要原样存储；覆盖7天及超7天边界 | L1：warp固定区块时间 |
| T04 | 商户A/B使用相同nonce；nonce0首张、20条分页边界、N=0；同链两部署与不同chainId | 固定ABI编码(uint256,address,address,uint256)并keccak256；nextNonce为下一未用，已有范围[0,N)；B不能占A空间；部署及分页缓存隔离，旧deploymentId不改指向 | L1+L2：派生固定向量、多部署、分页与manifest测试 |
| T05 | 创建者企图通过接口指定他人merchant、改金额/期限/terms；校验ABI | 不存在改写或任意recipient入口；合法付款前后原条款不变 | L1+L5：接口及状态差异 |
| T06 | 为不存在的随机ID付款、只读未知ID | 付款revert；没有InvoicePaid；没有资金转出；UI能区分“不存在” | L1：未知ID与余额断言 |
| T07 | 不同EOA付款人向有效发票精确付款；固定区块号和时间 | paid/payer/paidAt正确，paidBlockNumber=实际block.number；商户收到固定金额；合约本次余额净增0；恰有一次匹配InvoicePaid | L1：vm.deal/prank/roll/warp、双方余额、event |
| T08 | 少付、多付、零付；即使合约已有意外余额也少付 | 全部revert；不能用意外余额补差，也不接受超付款留存 | L1：状态和余额快照 |
| T09 | 付款时间为expiresAt−1、expiresAt、expiresAt+1 | 前者可成功；后两者拒绝；已付款发票过期后仍显示已付款 | L1：warp边界 |
| T10 | 同一张已付款发票再次付款，换一个付款人再次付款 | 每次后续付款均拒绝；不会重复给商户转钱；不能覆盖原payer/paidAt | L1：多调用、历史字段断言 |
| T11 | 恶意商户接收回调重入同一发票；分别捕获和不捕获重入失败 | 重入付款不能成功；若商户捕获失败则外层最多成功一次，若不捕获则外层全部回滚 | L1：恶意receiver fixture |
| T12 | 恶意商户在发票A回调中尝试付款发票B，含同/不同商户B | 统一重入锁生效；不能在回调成功执行另一张发票付款或创建；原条款不被改写 | L1：跨发票receiver fixture |
| T13 | 商户收款回调主动revert，或耗尽可用Gas导致转付失败 | 外层付款revert；paid/payer/paidAt/paidBlockNumber恢复未付款；没有成功事件；本金未锁在项目合约；不声称失败交易免Gas | L1：reverter/gas fixture；L3另测实际Gas |
| T14 | 向合约直接发原生USDC、错误selector、调用nonpayable创建时附value | 默认拒收，无正常收款fallback；不能绕过payInvoice进入业务资金留存状态 | L1：低级调用结果 |
| T15 | 用vm.deal模拟已存在意外余额，再成功/失败付款；另用恶意receiver模拟回调期间强塞新余额 | 预先余额不被取走；普通成功付款只转当笔msg.value；回调期间新余额破坏等式时整笔revert；无withdraw/rescue入口 | L1：余额不变量和回调fixture；模拟不证明Arc上特定强塞手法可用 |
| T16 | fuzz有效amount、expiresAt、不同payer/merchant与付款序列 | 始终满足I-01至I-09；一invoice最多一次成功；contract正常付款净增0；失败不改变状态 | L1：保留seed、cases/计数、失败复现；不得只镜像实现 |
| T17 | 依赖和可调用面检查：owner/admin/proxy/delegatecall/arbitrarycall/fee/deposit/withdraw/rescue/approve/transferFrom | 不存在这些额外业务路径；锁定成熟ReentrancyGuard版本；无可放开1USDC上限的管理/构造配置 | L1+L5：ABI、源码人工审查、依赖lock及字节码记录 |

## 3. 前端与证据核验测试（T18–T24）

| ID | 场景及输入 | 预期结果 | 层级/证据 |
| --- | --- | --- | --- |
| T18 | 金额字符串：0.000001、0.2、1、1.000001、0.0000001、1e−6、负数、空值、超长整数 | 合法输入按整数microUSDC×1e12处理；超上限/过精度/科学计数法等明确拒绝；展示与签名value完全一致 | L2：独立预期金额fixture及签名参数截图 |
| T19 | URL/缓存篡改merchant、金额、标题、chainId、deploymentId、合约地址及invoiceId；遇非零termsHash，正文有/无/伪造；导入历史非零摘要付款 | 受信manifest与链上条款为准，未知部署拒签；P0创建恒传零摘要，标题标未签/未绑定纯文本；所有非零摘要付款准备返回UNSUPPORTED_TERMS；既有付款仍可只读核实并提示条款不受支持 | L2：签名请求拦截、manifest及浏览器交互记录 |
| T20 | PreparedPayment生成后切换账户、网络、发票或部署；旧RPC模拟故意延迟返回；篡改to/selector/ID/value；余额不足 | 绑定chainId/deploymentId/contract/payer/invoiceId/value/calldata/connectionVersion；变化废弃旧请求及旧异步结果；钱包调用前重新比对；显式固定from/chainId/to/data/value；错误或余额不足不发送 | L2：异步竞态fixture与实际钱包请求拦截记录 |
| T21 | 钱包拒签、RPC限流/超时、广播后刷新、替换/取消、旧hash未查到；请求已交钱包后再切换上下文或被他人抢先付款 | 拒签不伪造付款；保留已广播hash并先查链；忽略旧UI异步结果，不自动重发；不声称一定能撤销钱包已有请求；广播后核对实际from/chainId/to/data/value，失败可能耗Gas | L2：故障注入、延迟签名、刷新及状态轨迹 |
| T22 | 给核验器伪造成功：错chain/contract/emitter/selector/from/value/merchant/amount/ID；receipt.status失败；仅有同名事件 | 全部不能生成verified收据；明确指出证据不匹配；不以“能打开Explorer链接”替代解析 | L2：正反收据fixture，每种错误断言 |
| T23 | receipt的blockHash与区块不符、两RPC冲突、receipt消失/未最终确定；重复系统/同名事件输入 | 状态待核实而非已付确认；不重复累计金额；链最终性不明时不得导出verified；不硬编码Ethereum多确认数为Arc协议要求 | L2：一致性故障fixture；L3再验证正常最终性路径 |
| T24 | 创建→复制含chainId/deploymentId/invoiceId链接→另一浏览器付款；清空全部缓存后由商户列表或无txHash链接恢复；同链第二部署并存；事件零/多匹配；重复导入导出 | 按原部署nextNonce恢复发票，凭paidBlockNumber查询单一区块的本部署InvoicePaid取txHash/logIndex，再完整核验；不扫全链；缺失/多匹配待核实；JSON含deploymentId/paymentLogIndex，大整数为字符串；重复导入不增收入；标题未绑定，自测标controlled_demo | L2+L3：干净浏览器、单区块RPC查询、原始receipt及脱敏JSON/CSV |

## 4. Arc 特有行为及发布门槛（T25–T28）

| ID | 场景及输入 | 预期结果 | 层级/证据 |
| --- | --- | --- | --- |
| T25 | 在Arc Testnet真实部署；由两个EOA以0.20测试USDC执行创建与支付 | RPC chainId=5042002；实际msg.value=0.2×1e18；成功receipt、项目event、商户余额/系统Transfer对应；固定条款读回一致；记录真实Gas与最终性 | L3：真实deploy/create/pay hash、原始receipt、区块与只读校验输出 |
| T26 | 用T25真实receipt核验Arc原生USDC系统event及对账；另外确认错误单位/错误emitter会失败 | emitter使用官方系统地址、单位18位；确认本原子转付路径的付款人→contract与contract→merchant资金证据；不混入ERC20六位流或Gas；实际日志结构与解析器一致 | L3：未经伪造的完整receipt+解析结果；普通Anvil日志不能替代 |
| T27 | 主网前检查并在有效授权后运行不超过单发票1USDC的小额受控演示 | L1/L2/L3全部资金门槛通过；chainId=5042；bytecode与manifest匹配；真实钱包核对地址/金额/Gas后签名；receipt独立验证；未授权则blocked，绝不伪造hash | L4：版本commit、manifest、授权记录引用、真实主网证据；Gas与总预算另行限制 |
| T28 | 检查交付与grant材料：Studio URL、实际生成/测试轨迹、live URL、开源repo、视频、部署、收据、规则与资格 | 每项有可打开的真实来源；构建环境与部署commit一致；视频包含Studio过程与已验证主网步骤；明确未专业审计、受控自测、本期资格状态；没有占位符冒充已完成 | L5：evidence索引、提交检查表；不自动提交对外申请 |

## 5. 最小测试实现指南

### 5.1 Foundry 测试应从不变量出发

至少包含合法EOA商户、接收revert的商户、同发票/跨发票重入商户、可捕获重入失败的商户。用 `vm.prank` 隔离身份、`vm.deal` 设置受控初始余额、`vm.warp` 覆盖期限边界。为余额变动保留前后快照，不只断言paid位。

Fuzz 的参数范围应覆盖有效最小/最大金额及多次调用序列。使用成熟库不免除真实集成的重入测试。测试不能把“看到任意InvoicePaid事件”当成全额到账断言。

本地测试中的余额预置属于模拟，不意味着某种 `SELFDESTRUCT` 或强塞路径已在Arc通过验证。Arc EVM差异需要独立记录，不能引用普通EVM测试替代。

### 5.2 交易证据的分层

保留真实RPC响应的脱敏 JSON 文件及确定性核验器输出。截图用于展示体验，不能单独证明交易状态。不得把本地fixture、测试网交易、Studio agent文字或待部署地址写进主网证据栏。

若提供公共JSON样本，标注 `fixture` 或 `testnet`，并与真实主网manifest分开。未执行主网步骤时交付状态是“待主网签名/验证”，不是“已完成上线”。

### 5.3 18小时内的范围取舍

先做一张发票和一笔支付的安全闭环，再做必要的复制链接、收据与状态恢复。删除钱包覆盖面、品牌复杂动效、后台、支付统计和附加协议，都优先于删减T02/T07–T17/T22/T25–T27。安全门槛仍失败、Studio额度耗尽或关键Arc行为无法证实时，保存检查点并停止主网步骤。

## 6. 执行记录模板

```text
Test ID:
Status: not_run | passed | failed | blocked
Executed at (UTC):
Code commit:
Environment: local-foundry | local-ui | arc-testnet | arc-mainnet | document-review
Command / interaction:
Expected result:
Actual result:
Evidence paths / verified transaction URLs:
Remaining limitation:
```

可在本地报告中加入执行时长与复现命令。不要为了提高通过率修改测试期望以适应错误实现；规范变更须记录原因并复核其安全影响。

## 7. 一手来源

- Arc 网络配置：<https://docs.arc.io/arc/references/connect-to-arc>。
- 原生/ ERC-20 USDC精度：<https://docs.arc.io/arc/references/contract-addresses>。
- Arc USDC系统事件：<https://docs.arc.io/arc/references/usdc-system-events>。
- Arc最终性：<https://docs.arc.io/arc/concepts/deterministic-finality>。
- Arc Studio及测试网边界：<https://docs.arc.io/ai/arc-studio>。
- CLI结构化输出与独立核验责任：<https://docs.arc.io/ai/arc-studio-cli>。
- 成熟重入保护与原生转付注意事项：<https://docs.openzeppelin.com/contracts/5.x/api/utils>。

以上来源支持技术背景，不表示本项目已被Circle、Arc或其他第三方审计、认证或接受参赛。
