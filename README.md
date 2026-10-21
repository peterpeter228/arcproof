# ArcProof 发票直付原型与核验证据

本仓库现在包含 ArcProof 合约、React 界面、原生 USDC 收据核验器和测试，不再只是初始开发规格。2026-10-21 已重新核对私有 GitHub main 的 `d34138b19a3878fd095413822c48d28fea6a4c58`，240 个文件与远端一致；本次文档修订基于该已核实版本；是否交付以随后远端提交及回读收据为准，不由本文自行声明。

**恢复入口：[STATUS.md](STATUS.md)；运行入口：[RUN_中文.md](RUN_中文.md)。** 新一轮本地复验为 253 项项目测试、137 项独立对抗测试和 24 项 jsdom UI/钱包测试通过；类型检查、源码 lint 和构建通过，全仓库 lint 仍有 124 项历史诊断，不能宣称整体全绿。当前真实浏览器、原始 RPC/最终性和双钱包验收尚未完成；Studio 仅沿用上次核实的旧版本记录，本次未重查或更新。

原始规划和生成来源仍保留。免费原型工作独立于未闭合的 Grant G0；测试网自测不是主网、收入、审计或参赛资格证明。以下索引包含历史规划，具体当前状态以 STATUS.md 和有日期的证据为准。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| START_HERE.txt | 可直接交给 dot 的完整启动指令 |
| AGENTS.md | 执行约束、固定范围、授权与证据规则 |
| STATUS.md | 当前状态、版本边界和历史检查点 |
| docs/01_VERIFIED_REVIEW.md | 逐项核实、选择理由与现金经济 |
| docs/02_PRODUCT_PRD.md | 详细功能、交互、架构、数据和阶段计划 |
| docs/CONTRACT_SPEC.md | 合约函数、事件、状态、不变量和收据验证 |
| docs/TEST_MATRIX.md | 28 项分层验收要求，不以本地测试数替代真实链路验收 |
| docs/03_DOT_EXECUTION.md | 云端/本地、Studio、并行任务、恢复和交接 |
| docs/04_BUSINESS_VALIDATION.md | 99/299 美元报价试验、付费信号与停止条件 |
| docs/05_SUBMISSION_PACK.md | G0检查表、英文材料模板与视频分镜 |
| docs/06_SCANNER_RULES.md | 供 Muse 采用的核实规则建议，未实际同步 |
| docs/SOURCES.md | 来源、证据范围与未闭合事实 |
| prompts/ARC_STUDIO_PROTOTYPE_BUILD.txt | 当前有效的免费 Studio 原型构建提示 |
| prompts/ARC_STUDIO_BUILD.txt | 旧启动提示归档，不用于当前构建 |
| prompts/ARC_STUDIO_REVIEW.txt | 独立审查提示，禁止以生成者自述代替证据 |
| evidence/gate.json | G0与现金筛选状态，未知值保留null |
| evidence/deployments.json | 测试网/主网部署记录模板，无虚构地址 |
| evidence/test-results.json | 历史分层测试记录；最新基线见 evidence/g4-baseline-20261021 |
| evidence/receipt.example.json | 未执行收据模板，不能用作实际付款证明 |
| evidence/effort-ledger.json | 工时、费用及收入分账模板 |
| evidence/artifact-index.json | 本包文件哈希和用途，不证明应用已经运行 |

完整顺序阅读版本另附 ArcProof_Complete_PRD_2026-10-20.md，便于审阅；实施时本目录中的模块化文档为修改对象。不要同时修改两份产生分叉，完整版本由模块文件重建。

## 明确的选择

主选 ArcProof 是 Grant 与支付集成作品实验。当前没有证据把它称为最高概率赚钱项目；若目标严格是10天内到账，本轮未核实到合格的fast_cash开发机会。Grant G0 未闭合不阻止用户后续已授权的免费原型；真钱、公开发布、提交及其他未授权动作仍受限。

P0原子转付会触及资金，但不保管待释放用户本金；单张上限1USDC，没有owner、升级、提款、抽成、退款或仲裁。它不是可直接用来处理大额商户资金的已审计服务。
