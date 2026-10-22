# ArcProof 合并前 Argon 意见独立核验

2026-10-22 04:45–04:54 UTC。受审冻结版本 d97cc2b1b9abe79e06427ab91dd7ab983ee698dd，原快照 d647cc2f5249f256e944ac217a057ba0d094614913e65a25bea6721c634f2941。用户要求先 Argon 评审再合并；PR #1 保持草稿，尚未合并或同步 Studio。

## 调用范围和限制

单次调用 api.xiaoyiapi.xyz，请求模型 gemini-4-argon-high，响应 model_version 为 gemini-4-argon；HTTP 200，60.319 秒，报告 token 总数 39168，实际费用未知。没有重试，没有第二次调用。发送13个脱敏源码/测试文件和历史测试摘要，3处地址一致替换为合成值。没有客户、账簿、密钥、钱包资料。原文是外部模型建议，不是审计结论；见 evidence/stage-b-argon-20261022/review.md。

## 独立结论

- ADV-01 / ADV-02：采纳为低严重度导出真实性边界加固。未知部署与 synthetic helper 输入能携带诊断或旧调用者付款字段，并误标 identity_bound_rpc_observation；并未伪造 VERIFIED 布尔、结算证据或展示可利用真实付款路径。已统一清空不可信/模拟付款事实、RPC检查/来源/时刻、verifiedAt及旧参数回退。已知可信部署的未验证诊断仍保留，不把失败诊断本身当漏洞。跨请求继续优先 PENDING。
- ADV-03：拒绝，脱敏假阳性。真实 receiptVerifier.ts 的 zeroAddress 是正确的40个零；发送包替换为 ...0001，模型虽然被告知脱敏仍据此误报。没有修改正确零地址常量。未来审查包应保留协议常量语义，只脱敏真实标识。
- ADV-04：部分采纳，低严重度直接 RpcProvider 防御加固。自定义 provider 返回 expiresAt=8640000000001 时原 verifier 返回 VERIFIED；应用真实适配器此前已有限制，不是当前 UI 可利用绕过。现在 verifier 也采用相同日期上限。paidAt 与块时间不一致此前已经被 TIMESTAMP_MISMATCH 拒绝，模型该部分建议不成立。
- ADV-05：采纳为防御性序列化健壮性。invalid/小数等非整数字符串确实可能抛错；空字符串不抛而被 BigInt 转为0，模型例证不准确。现在 malformed 诊断金额显式 WRONG_EVENT_DATA，清空付款事实与证据，不能保留 VERIFIED；未来主网模式同步降为 unknown。不声称修复了已证实的外部攻击。

## 测试证据与改动边界

导出新增22项：原实现19失败/3通过，修复22通过；覆盖有内容的观察、legacy回退、未知状态、synthetic、跨请求、可信失败诊断及可信mock正对照。原 T24 的整数格式测试使用了不受信任部署并期待保留付款事实，改用已注册测试网部署作为格式正对照，原精度和CSV断言未删；新增独立负例覆盖不可信清空。

verifier新增3项：原实现1失败/2通过，修复3通过。最终全量 Vitest521/521、34文件，check通过。首次check发现新测试JSON.parse隐式any，已加明确类型，没有关lint。测试日志时间为容器KST，本文统一UTC。所有失败日志保留。

合约源未改；主网清单仍空，钱包写入仍关闭。当前95输入源码快照8752073c7c83c227fc642c71deafd6583c9e69e82d490e3d43b7ed340a1a50a7。两种网络构建和最终Studio/Forge结果须以阶段B完成报告为准；此报告不把本地检查冒充Studio验收。最终模型意见未覆盖修复后快照，修复由dot独立红绿测试复核，没有额外调用。

尚未部署、签名、转账、公开、外联或参赛提交。混合Studio起源资格、主网实际交易、许可证、公开应用和提交仍是未完成门槛。私有合并许可不等于上线许可。
