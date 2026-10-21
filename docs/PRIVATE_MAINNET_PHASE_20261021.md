# ArcProof 私有主网准备与 Studio 同步

日期：2026-10-21 UTC。当前为私有候选；Studio白名单源码已回读匹配，最终复审已完成，GitHub新提交待回读，不宣称链上完成。

## 范围和来源

恢复基线 `4deb74cce889ca122ef33903d27c2be10a1c437e`，703 个 Git blob 完整恢复并逐一核对；本轮变更另列。用户 22:42:43 UTC 明确取消本阶段无法核对的旧18小时上限，允许既有Studio私有同步、私有主网适配及初审/终审各一次Argon调用。没有部署、签名、交易、转账、公开发布或比赛提交许可。

原设计中的94a及旧状态文件中的其它提交为历史出处，不冒充当前源码身份。保留历史证据，不将旧测试改写成本轮测试。

## 实现边界

- build 固定 `VITE_ARCPROOF_NETWORK=testnet|mainnet`，未设置默认 testnet，空字符串/其它值拒绝。URL、缓存和导入文件不能选择 RPC、合约或切换网络。
- 可信网络上下文深冻结。Arc Mainnet5042的配置是协议准备，不是主网可用性验收。production manifest仍为空、deployment=null、writesEnabled=false。
- 主网模式仅展示明确只读不可用入口、隔离演示与历史证据。不挂载测试网业务RPC、钱包或旧请求列表；wagmi自动EIP-6963发现和持久连接存储关闭，reconnectOnMount仍为false。
- 客户端、session/prepared action、持久请求、Web Lock、explorer与导出按可信链/部署绑定。测试网兼容入口仍可使用原测试网记录；旧未知请求原地保留，不迁移、不清空、不自动重发。
- 非登记部署导出mode=unknown，不能仅凭chainId/isFixture标记提升。scope不匹配仍剥离观察值及verified evidence。主网无登记部署，不能产生可信主网导出。
- 合约、测试网地址、部署身份与production manifest不变。没有创建主网占位地址或主网交易。

## 初审与独立复核

Argon初审实际HTTP200，请求模型gemini-4-argon-high，响应modelVersion=gemini-4-argon，不能声称供应端确实运行high模型。费用未知。请求与回执摘要见evidence/private-mainnet-20261021/argon-initial-*.json；原始建议见argon-initial-review.md。模型没有执行代码，其建议不是测试或审计证明。

已采纳：空部署启动安全、闭合上下文、持久状态隔离、导出分类、固定构建入口、session绑定及中性收据措辞。

修正/不采纳：旧基线SHA有明确历史语义，不自动当当前基线冲突；submissions风险须读真实实现复现而非模型臆测；模型末尾禁止Studio登录/同步不符合本阶段明确授权，不作为权限依据；空selector不静默回退。

独立代码复核另实际复现两个缺陷并修复：
1. 一个损坏的per-hash保存记录使旧未决提交列表变空，可能丢失legacy重复发送保护。现遇损坏保存状态阻止新dispatch，不删除原记录，附回归。
2. wagmi connectors=[]仍默认发现EIP-6963钱包，模拟provider可建立连接。现主网关闭multiInjectedProviderDiscovery并storage=null，附实际config启动回归。

## 验收分层

本地单元/集成/构建、真实浏览器、Studio文件回读、测试网历史链上证据、主网链上验收分别记录，不能互相替代。本轮本地462项/29文件测试及lint/types通过，两种网络构建及4种非法配置拒绝通过；Studio内亦462项测试和类型检查通过。最终计数以REPORT.json和原始日志为准。没有本轮真实两钱包或主网系统Transfer/finalized实证。

实际主网构建浏览器检查发现Current candidate identity仍硬编码测试网链/部署/runtime，现改为BUILD_NETWORK可信上下文；主网空清单显示None/Unknown，新增回归通过。原始发现及修复证据分别保存，不抹掉失败。

## Studio

仅同步原有项目，不创建替代项目，不点击Build AI/Deploy/Publish，不执行deploy脚本。先导出备份并比对，再应用有路径白名单及预期旧文件hash的源码补丁，保持.env、运行日志和其它凭据不外传。同步只证明外部修复代码进入既有私有工作区，不倒推这些代码由Studio AI原创。初次应用62文件后，后续2文件修正也已同步；新导出87个白名单输入hash全部匹配最终本地snapshot `8df6b66d77c12e99b268a19c0ed6f88f33336b24c177fb0fdda88834ba631432`，0缺失/差异。保留Studio独有生成文件/助手，不能称全工作区一致：完整146输入snapshot为`556de0955f9aee7186664aadd72c51bc6e82339d24747779bf64d6b694cfd845`。热更新曾留下旧启动元数据；内容不变的配置触碰触发普通Vite watcher后，当前显示hash与独立导出146输入一致，配置hash未变。未来HMR仍需正常刷新启动元数据，不能把开发预览当持续主机证明。预览source/base commit均Unknown，不冒充可追溯Git构建。

实际Studio浏览器只读默认页、非法invoice、非法离线金额、0.20模拟发票/历史/收据与Evidence导航通过；模拟收据payer/tx/time为null且标SIMULATED_NOT_VERIFIED。单独本地主网生产构建实际浏览器已回归通过：当前身份为Arc Mainnet5042，部署None/runtime Unknown；默认、已知测试网、重复tx、非法参数入口保持只读；Evidence与离线导航可用。报告与四张截图在mainnet-browser-final，临时localhost服务器已停止。没有真实钱包或链上验收。没有使用Studio AI agent、收费检查点或部署。

## 仍未完成 / 停止条件

主网部署与两钱包演示、真实主网最终性/系统转账事件、公开许可/发布、报名提交、获奖与到账均未完成。此阶段不尝试这些动作。未知钱包请求不能凭同发票付款状态解除；storage损坏不能通过清空缓存绕过；Studio若隐式部署/公开则停止该操作。依赖安全公告与大钱包bundle等既有残留继续披露，不把本轮绿测称为专业审计或全部目标达成。

## 最终辅助复审

第二次Argon实际HTTP200，59.89秒；输入hash660c8ede1ec506303c25a604a46cf79b7f8d996e588e362067f684141f18ddff。模型没有提出可复现P0/P1/P2，两个P3为未启用主网收据的未来币种文案和惰性旧client实例。已独立核对当前不可达路径和安装依赖的fetch位置，不据此保证零缺陷或所有运行路径零网络调用。报告中headless和合约hash被称为基线的用词已在独立处理记录纠正。最终源码未变；两次批准调用均已使用，费用未知。见argon-final-review.md原始建议、argon-final-receipt.json及argon-final-triage.md。
