# ArcProof 独立复审（阶段 A）

复审开始：2026-10-22 03:15 UTC。固定受审 HEAD：`34eb952411a5d12ddba5550185593dc6df3e5584`；比较基线：`8f748d3052be163f2c039790a73a4238c25b5869`。独立修复分支：`dot-independent-review-20261022`。用户原分支与 main 不作修改。本次没有部署、签名、转账、公开、提交、外联、Studio 同步或付费模型调用。

## 结论

原分支不建议原样合并：复核发现一个可复现的低严重度导出不变量缺口和一处资金行为文案夸大，已在独立候选中修复。合并推荐只适用于本报告所记录的修复候选，且仅是私有、主网写入关闭的原型。不是上线许可、专业审计、资格保证或获奖保证。阶段 B 的 PR 合并与 Studio 同步仍需用户批准。

## 可复现证据

- 从远端 tree 恢复 269 个所需文本/源码/本轮日志文件并逐一验证 Git blob SHA。首次恢复漏掉两个历史 JSON 输入，导致 check/test 启动失败；补齐并验 SHA 后重新运行。保留失败日志，不将恢复失误当产品缺陷。
- `bun install --frozen-lockfile --ignore-scripts`：697 包，退出 0；Bun 1.3.14。无升级锁文件、无安装脚本执行。
- 原始受审快照：check 退出 0；Vitest **485/485，31 文件**；testnet/mainnet 构建均退出 0；每包 84 输出；92 输入快照 `b3bf6b038298d53619329600a084986de9e5eb386c48802513c8ff557ecd8a67` 与先前报告一致。
- 空字符串、`devnet`、`mainnet `、`TESTNET` 四种网络参数构建均退出 1。
- 独立隔离变异：FR-01…FR-07 各撤去关键修复后，对应断言均失败，随后恢复文件。不是编译失败冒充红测。FR-05 用旧常量标签行为替换 helper，不冒称历史 checkout。FR-06 撤回后仍被后续 guard 拒绝，说明这是提前识别/防御加固，不证明存在可利用的签名漏洞。
- 修复新增 11 项测试：对原源码运行 **8 失败 / 3 通过**；修复后全量 **496/496，32 文件**，check 退出 0。没有删除或弱化已有断言；既有文案断言随实际界面语义更新的情况已检查。
- 独立 solc 0.8.28 编译：使用实际 Solidity/OZ 文件、metadata 中 remapping、paris EVM、optimizer 200、IPFS metadata。输入 keccak 与归档 metadata 一致；运行时 2296 字节，逐字节等于归档 artifact，keccak=`0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c`。这是实际编译，不是凭无 constructor/immutable 推断。**本次未跑 Forge，也没有验证任何主网部署**。
- 终端原始日志显示 KST（UTC+9）；报告时间采用 UTC，避免混淆测试时钟。

修复候选两种网络构建均退出 0；各 84 个输出，93 个输入，最终源码快照 `d647cc2f5249f256e944ac217a057ba0d094614913e65a25bea6721c634f2941`。使用新建输出目录，避免重复构建遗留旧 chunk 干扰产物清单。

## 发现与修复

### IR-01：模拟输入可导出“已验证”证明（低严重度）

位置：原 `src/arcproof/exportUtils.ts:218–225`。

复现：给 `buildReceiptExport` 传注册 FIXTURE_MANIFEST、`isFixture=true` 与合成 VERIFIED result，输出 `verificationVerified=true`、VERIFIED 状态及结算证据；可信测试网部署搭配 `isFixture=true` 同样可输出真测试网模式。JSON/CSV 两种序列化都保留该错误。当前 DemoReceipt 不走这一不安全组合，其直接生成的模拟记录已正确标注；因此这是 helper 不变量漏洞，**不是已证实的钱包/真实付款攻击路径**。

修复：fixture 身份或显式 synthetic 标志都禁止验证成功标志、结算证据和 verifiedAt；返回 SIMULATED_NOT_VERIFIED。仅精确注册且显式 fixture 保留 fixture 模式；真实部署被标 synthetic 时为 unknown，未知 ID 不会被标志白名单化。跨请求 scope 不匹配仍优先 PENDING 并清空观察。11 项新增测试含 JSON/CSV、未知部署、伪主网、跨请求、实际 verifier 的离线正对照和首页文案。

### IR-02：无余额描述过度（低严重度）

位置：原 `src/components/arcproof/HomeScreen.tsx:17`，`docs/SUBMISSION_READINESS.md` §6。

“keeps no balance” 不准确：规范与合约保留强送/预先存在余额且无取回函数。改为正常付款本金原子转发、不保留该本金；明确意外余额锁定且不能取回。没有改动合约资金逻辑。

### IR-03：测试注释夸大历史证据（文档）

`finalReviewRegressions.test.tsx` 原注释称每项都在历史基线上复现，与报告已纠正的 FR05–07 不符。改为指向逐项证据说明；不改断言。

## 主网与可信声明

PRODUCTION_MANIFEST 仍为空，writesEnabled=false，mainnet connectors/discovery/reconnect 均关闭且 storage=null；不会借测试网清单、会话或存储开启主网动作。首页的 runtime、invoice、event、两条 native transfer、finalized header 检查均可对应 verifier 逻辑。其结果是对固定 RPC 数据的交叉核验，不是独立共识证明、交付证明、收入或税务证明。

CSV 前缀中和与字符串/整数序列化测试通过，但真实 Excel/Sheets 导入再导出 **NOT_RUN**，不能称完整公式安全验收。历史依赖安全公告、无生产 CSP、无哈希未知创建请求锁定、hash 保存失败后的恢复按钮可用性限制仍未消失。

## 官方规则与上线 go/no-go

官方详情读取：2026-10-22 03:18–03:20 UTC，https://dorahacks.io/hackathon/arc-microgrants-2/detail 。机器字段 endDate=`2026-11-02T04:59:00.000Z`，timelineEnd=1793595540，isExtended=false，与前次一致。正文 November 1 与显示时区标签不能直接替代机器截止；北京时间为 **11 月 2 日 12:59**。

- 规则复核：PASS。权重真实 USDC 30%、Studio 25%、产品 25%、潜力 20%。UI 精修不是单独评分保证。
- 混合 Studio 起源资格：BLOCKED。规则排除 outside-Studio 项目，未明确 Studio 起源后外部审查再同步的豁免。应如实询问；不得伪造起源。
- 当前 Studio 与 CLI 文档只支持测试网部署：PASS（已核对能力限制），不能假设有主网发布按钮。https://docs.arc.io/ai/arc-studio ，https://docs.arc.io/ai/arc-studio-cli 。
- Mainnet 5042、RPC https://rpc.mainnet.arc.io 、explorer https://explorer.arc.io 、native18/ERC20-interface6、native emitter 0xff…fe：官方文档 PASS；实际 mainnet receipt/finalized-tag 验收 NOT_RUN。https://docs.arc.io/arc/references/rpc-endpoints ，https://docs.arc.io/arc/references/usdc-system-events 。
- 最终 Studio 同步/回读+Forge：NOT_RUN（本阶段未获准同步）。
- 个人资格/资助史/制裁自查：BLOCKED，未由工程代判。
- 主网实际合约 runtime、两钱包真实付款 VERIFIED、公开应用/仓库/视频、提交回执：NOT_RUN。预算、钱包签名及任何资金操作均待具体用户动作。
- 主网启用仍需上下文驱动页面/存储/链接改造与真实部署核验，不能只填 manifest 一行。部署和付款签名由用户本人完成。

**唯一下一步**：用户确认是否进入阶段 B，只合并这份修复候选并同步同一个 Studio 项目，运行 Forge/Vitest 并重新下载校验；仍不部署、不签名、不转账、不公开、不提交。若不批准，不执行阶段 B。

## 实际浏览器复核

使用 dot 云浏览器，在隔离 localhost 上查看实际构建，不接真实钱包，不访问 Studio。原始包与修复包分别读回 build identity；修复包快照精确为 d647cc2f…f2941。

PASS：原始包精确金额 0.123456 创建与实际 JSON/CSV 下载回读，付款 hash/payer/time/block/log 均 null、fixture/SIMULATED_NOT_VERIFIED；0/负数/指数/7位小数/超过1被拒，最小/最大金额可用；关闭/重开/导航重置；重复点击不伪造付款；skip link/键盘 CTA/前进后退；格式错误、非规范链ID、重复tx、未知部署路由失败关闭；主网创建、核验及旧测试网收据路径均禁用。修复包实际回归：首页本金/强送余额描述准确；离线创建、JSON/CSV回读保持模拟且付款字段null；主网创建门禁保持关闭。

窄屏 PASS 的范围：普通浏览器300%缩放，CSS宽度388px，原Overview/Demo/Evidence与修复Demo无横向溢出。不是320/375设备仿真，不冒充上轮23项脚本全部复跑。缩放下fullPage截图会裁切，所以窄屏证据使用native截图。未发现应用console error/warn；扩展metadata噪声不算应用失败。

限制：chrome://sandbox 与原生DevTools受浏览器组织策略限制，已停止对应动作，未绕过。默认受支持浏览器运行；未声称重新证明其sandbox诊断。主网测试服务器加了connect-src 'none'保护，未出现CSP违规，但这既不是生产CSP，也不是完整网络请求trace。真实钱包、RPC全链路、移动设备、Excel/Sheets导入、公开主网完整业务都NOT_RUN。浏览器通过不能替代这些门槛。
