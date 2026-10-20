# Muse 扫描器核实规则建议

核实日期：2026-10-20（Asia/Shanghai）。本文件是规则建议，没有修改 Muse、运行扫描任务、提交申请或执行链上交易。

## 一、独立核实摘要

Solana 租金机会有真实依据。官方 2026-09-18 Changelog 已在 Mainnet feature gates 下列出 5080 lamports/byte；SIMD-0437 提案规定五步降租。165 字节账户按该参数的最低余额为 `(165+128)×5080=1,488,440 lamports`，较旧标准少 550,840 lamports。但固定差额只有在当前正确主网集群的 RPC 实证该尺寸最低余额仍对应 5080 参数、账户仍持有旧标准 2,039,280 lamports、且提款权限及支持类型均满足时才成立。不能根据九月公告假定十月参数未继续变化，也不能认定每个老账户都能领取相同金额。官方 Token 文档和源码已有 `WithdrawExcessLamports`，由对应授权人签名，只提当前最低余额以上的 SOL；wrapped SOL 不支持，Token-2022 扩展尺寸、所属程序、历史提款和权限均须分别检查。关闭空账户返还实际剩余余额；不得再把该账户超额租金加一次。官方升级总览仍把第二步写作 testnet，与较新的 Changelog 不同步，程序必须实时读取 RPC，失败时显示未知。本次公开 RPC 查询因执行环境网络代理不可达，未成功完成当日链上核验。

Axiom 官方确有一级 30%、二级 3%、三级 2% 及推荐注册用户 10% 手续费折扣，但分成基于实际净手续费，部分 token 不计奖。该页没有证明所有地区、所有身份、即时提现或绝无资格条件。若实际净费率为 0.9%，一级有效分成为交易量的 0.27%，获取 500 美元需约 18.52 万美元有效归因交易量；这是条件算例，不是收入预测。粘贴地址查询已由 Overfunded 等产品提供，租金查询用户转成交易用户的需求链条尚未验证。

Phantom 官方区分新域名提醒和交易模拟警告。新域名提醒通常审核数日后消失，超过一周可联系审核；模拟警告来自无法可靠预测交易结果。二者不能合并成“新域名必被红色阻断、转化归零”。Backpack 当前是否采用报告所称同一引擎及相同行为未获一手证实。上线必须记录真实钱包表现，不能用推测替代测试。

### 精确来源

- Solana 主网更新：https://solana.com/news/solana-changelog-september-18-2026
- SIMD 原文：https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0437-incremental-rent-reduction.md
- 官方提款说明：https://solana.com/docs/tokens/advanced/withdraw-excess-lamports
- 官方处理器源码：https://github.com/solana-program/token/blob/main/pinocchio/program/src/processor/withdraw_excess_lamports.rs
- RPC 方法：https://solana.com/docs/rpc/http/getminimumbalanceforrentexemption
- 状态更新不同步的官方总览：https://solana.com/upgrades/reduced-rent
- 用户引用的运营方观测：https://sol-incinerator.com/blog/solana-rent-reduction-2026
- Axiom 返佣：https://docs.axiom.trade/getting-started/referral-program
- Phantom 警告：https://docs.phantom.com/developer-powertools/domain-and-transaction-warnings
- 已有不连钱包查询产品：https://overfunded.app/

## 二、建议写入 Muse 的规则

| 规则 | 扫描器应执行的判断 |
|---|---|
| 奖励类型 | 现金、稳定币、平台积分、服务额度、抵扣券、投资分别记录。服务抵扣不算现金奖金；可放入独立资源机会列表，不称其“假奖金”或欺诈。只有快速现金列表将服务抵扣排除。 |
| 金额口径 | 区分总奖池、单个名额上限、保证付款额、可竞争奖金；不能将总池记为自己的可能首款。“Up to”不是保证发满。 |
| 地区资格 | `Regional Listing` 可能按居住地、当前所在地、社区资格或其他定义限制，不等于国籍；不能根据语言、IP、账号所在地推断合格。官方条件与用户可核实资格不完整时设为 `UNKNOWN`，不标 `PASS`。 |
| 日期 | 分别记录报名截止、作品提交截止、评审结果日、付款预计日；开奖不等于到账。保留原时区和 UTC 转换；原文无时区则不能自行赋值。 |
| 活动期号 | 每期使用独立 ID 和规则快照。Round 1 的付款、资格、匿名、部署要求不能自动继承给 Round 2。缺少第二期正文时保持未知。 |
| 申请状态 | 列表 `Open` 与详情 `Applications Paused` 冲突时停止推荐提交，以当前详情交互状态和主办方有效公告进一步核实，不用旧索引证明仍开放。 |
| 来源与冲突 | 记录来源角色、原文发布时间、最后更新时间、抓取时间、关键短摘录或正文哈希。旧官方页与新官方公告冲突须列明；主网事实最终用正确集群链上读取验证，网页预测不视为激活证明。 |
| 人数与概率 | 报名人数、提交人数、有效作品数是不同指标，各自附时间戳。禁止凭“名额÷人数”输出个人获奖概率；缺少可比历史数据与模型校准时概率保持 `null`。 |
| 净收益 | 用户转入、代收款、待付商户款、平台补贴、测试钱包互转分别记账。负债及用户资金不能算平台收入；净收益须扣补贴、Gas、主机/API、推广、退款和其他直接成本。赠送本金不是收入。 |
| 本金与风险 | 预测市场下注、做市、流动性投入不能默认可退。分别记录投入本金、可用流动性、解锁/结算条件、最大可能损失；未证实的可退金额设 `null`。 |
| 先承诺后投入 | 若是有选聘或签约流程的 `project/commissioned work`，先准备申请和最小能力证明，获选且付款/里程碑书面明确后再完整开发。开放竞赛型 bounty 与按已完成原型评估的 grant 单列，不能机械套用“先中标”；为其设置可损失工时上限。 |
| 商业证据 | 技术可行、主办方有钱、奖池大、社媒热度，不等于付款概率或产品需求。至少分别评估：资格、规则匹配、可完成性、可兑现性、客户获取路径。 |
| 未知值 | 缺失数值、日期、概率、地域、退款条件保持 JSON `null`，附待证实原因。不能用 0、100%、空字符串或自行估计的时间填充未知。 |
| 规则有效期 | 规则快照的内部有效期最长 24 小时；提交前、付费前、主网操作前再次核实关键规则与状态。此 24 小时是扫描器内部策略，不能写成主办方规定。 |
| 决策门槛 | 资格或现金属性未知时只进入 `VERIFY`；明确不合格或非现金则从快速现金队列排除；技术依赖未证实则停止为该前提投入完整开发。用明确原因代替虚构精确评分。 |

### 既有 Muse 七维权重：保留，不改成获奖率

以下沿用用户既有 Muse 规则，总权重 100；本次不重新发明评分体系。分数只用于证据完整候选之间的排序，不是百分比获奖率，不可替代硬门槛，也不能用高分覆盖未知资格或付款日期。

| 字段 | 权重 | 所评估证据 |
| --- | ---: | --- |
| sponsor_payment | 25 | 赞助方与付款条件、既往可核实付款证据 |
| deadline_buffer | 20 | 正式截止与完成必要工作的时间余量 |
| competition | 20 | 附时间戳的参与与有效提交情况 |
| acceptance | 15 | 明确的验收、评审及交付要求 |
| skill_time | 15 | 现有技能匹配与实际投入上限 |
| reuse_terms | 3 | 代码、作品及商业复用条款 |
| follow_on | 2 | 有证据的后续付费或合作路径 |

各维采用既有 Muse 评分尺度；未知字段保留 null，不以自行估值补分。本文件不新增评分阈值或重标定量表。只有保存评分依据后才输出总分；个人获奖概率另留 null，除非另有可比数据和校准证据。

### fast_cash：全部条件通过才加标记

fast_cash 沿用更严格的现金加速规则，必须同时满足：

1. 本期正式规则、当前受理状态、本人地域及领奖条件已经核实；所需 KYC、交付和付款路径可满足。
2. 奖励为实际可收的现金或可兑现稳定币，非服务额度、积分、投资额度；本人适用的第一笔付款至少 150 美元等值。总奖池、未确定归属的最高名次和未解锁后续款不能充当本人首款。稳定币须记录币种和名义面额，不把 150 USDC 自动写成扣费后净得 150 美元法币。
3. 从本次实际核实时间 `checked_at` 起十天内可到账，有明确支付条件和时间证据。开奖、评审决定、提交截止和申请平均响应时间不能替代付款日；不从获奖日重新起算，也不放宽为本项目十四天观察期。
4. 本次快照可核实的平台提交数小于15，有来源和采集时间，沿用既有提交数门槛。公开报名、公开提交与已审定有效作品分开记录；不得自行估算“有效成品更少”来放行。Daejin本次可见24个提交，因此未通过此门槛；是否全部有效未知，不得把未知有效数当成低竞争证据。
5. 其余既有门槛全部满足：交付范围和验收明确、技能与剩余工时可完成、预期支出及本金风险已识别并处于实际授权内、无用户既有安全边界冲突、规则快照未过期。预测头寸或流动性本金不能假设可退，不以主体知名度替代这些证据。

任一必要字段未知时，决策为 `VERIFY` 且 `cash_fast_pass=false`；明确不符合任一硬门槛时不进入快速现金队列，保留具体排除原因。全部核实通过才可设 `cash_fast_pass=true`。分数再高也不能绕过该判断；复核产生新的时间快照时，不得把已错过的原定付款日向后滚动以维持合格。fast_cash 是候选排序标签，不授予对外联络、报名、付款或签名权限。

## 三、建议证据对象示例

以下是空白模板。`null` 表示尚未取得证据，不表示活动没有截止时间、不限制资格或不需 KYC。示例没有填写虚构的官方日期。

```json
{
  "opportunity_id": null,
  "organizer": null,
  "official_url": null,
  "round_id": null,
  "engagement_type": null,
  "decision": "VERIFY",
  "award": {
    "kind": null,
    "currency": null,
    "pool_amount": null,
    "per_recipient_max": null,
    "guaranteed_payment": null,
    "payment_terms_verified": null
  },
  "eligibility": {
    "geographic_rule": null,
    "residency_required": null,
    "citizenship_required": null,
    "kyc_required": null,
    "user_match": null
  },
  "dates": {
    "registration_deadline": null,
    "submission_deadline": null,
    "results_at": null,
    "payment_due_at": null,
    "official_timezone": null
  },
  "application_status": null,
  "competition_snapshot": {
    "registered_count": null,
    "submitted_count": null,
    "eligible_submission_count": null,
    "observed_at": null,
    "estimated_win_probability": null
  },
  "economics": {
    "cash_cost": null,
    "principal_at_risk": null,
    "refundable_principal": null,
    "subsidy_cost": null,
    "customer_funds_liability": null,
    "expected_net_cash": null
  },
  "verification": {
    "checked_at": null,
    "rule_snapshot_sha256": null,
    "internal_max_age_hours": 24,
    "expires_at": null,
    "official_sources": [],
    "conflicts": [],
    "unresolved": ["尚未读取本期官方规则并确认申请人资格"],
    "must_recheck_before_submission": true
  }
}
```

`checked_at` 由实际成功核实产生；`expires_at` 再按内部 24 小时策略计算。该字段不是活动官方截止时间。官方不承诺付款日期时，`payment_due_at` 继续为 `null`，另存原文的预计或附条件付款表述。

## 四、ArcProof 原子转付与用户既有边界的核对

- 原子转付若使用成熟标准支付功能、资金由付款钱包直达收款钱包、系统不留余额、不设释放权限，通常符合“零自建资金托管”的方向。不能仅因它有后端或链上程序就认定违规。
- 不应把先收款后转付、任意延迟释放、平台持有可操作资金、可升级管理员转走资金，命名成“原子”后视为合格；须通过完整交易执行路径和失败回滚验证。
- 若自建合约同时存证与转账，即使交易结束余额为零，仍增加用户资金路径上的自建执行逻辑。优先已有标准转账配合独立收据/证明；若采用原子路由，应让主 PRD 明确为何必须、依赖来源、授权范围及失败行为，不能用“非 Escrow”替代审查。
- 链上自转测试证明的是支付通路，不是有真实付费客户或新增营业收入；必须在提交材料中明确为自有测试钱包。
- `approve`、Permit 或代签如被采用，要限制资产、数额、收款人、链、时效与重放，不需要长期无限额度。无代理私钥/后台签名不是自动代表交易构造安全。
- 真实 USDC 转移、公开部署、提交参赛、外部通信应遵循当前用户授权。开发包可以先完成可审查成果；不得把研究/PRD请求解释为本轮已授权实际转账。
- 如果保留“原子收据”承诺，必须定义原子性的准确范围；链上转账成功而数据库落库失败需能从链上恢复。不能声称数据库与区块链天然构成单一原子事务。

