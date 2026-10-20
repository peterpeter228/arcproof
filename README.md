# ArcProof 项目评估与 dot 开发包

本包把 2026 年 10 月 20 日 Gemini 报告中的候选逐项核实，并将唯一条件主选收敛为 ArcProof 发票直付与付款凭证工具。它用于让 dot 开展有门槛、有上限、可核验的开发；尚未包含应用实现或已通过的测试。

**当前开始方式：执行 START_HERE.txt 和 prompts/ARC_STUDIO_PROTOTYPE_BUILD.txt。** 用户已于 2026-10-20 03:37:56 UTC 授权免费 Studio 原型构建与测试，独立于尚未闭合的 Grant G0。不要把资格、支付日或个人胜率当作已知。原包保存在 docs/source；当前工作状态以 STATUS.md 为准。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| START_HERE.txt | 可直接交给 dot 的完整启动指令 |
| AGENTS.md | 执行约束、固定范围、授权与证据规则 |
| STATUS.md | 初始状态和恢复入口 |
| docs/01_VERIFIED_REVIEW.md | 逐项核实、选择理由与现金经济 |
| docs/02_PRODUCT_PRD.md | 详细功能、交互、架构、数据和阶段计划 |
| docs/CONTRACT_SPEC.md | 合约函数、事件、状态、不变量和收据验证 |
| docs/TEST_MATRIX.md | 28 项分层验收要求，尚未运行 |
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
| evidence/test-results.json | 28项测试初始not_run状态 |
| evidence/receipt.example.json | 未执行收据模板，不能用作实际付款证明 |
| evidence/effort-ledger.json | 工时、费用及收入分账模板 |
| evidence/artifact-index.json | 本包文件哈希和用途，不证明应用已经运行 |

完整顺序阅读版本另附 ArcProof_Complete_PRD_2026-10-20.md，便于审阅；实施时本目录中的模块化文档为修改对象。不要同时修改两份产生分叉，完整版本由模块文件重建。

## 明确的选择

主选 ArcProof 是 Grant 与支付集成作品实验。当前没有证据把它称为最高概率赚钱项目；若目标严格是10天内到账，本轮未核实到合格的fast_cash开发机会。Grant G0 未闭合不阻止用户后续已授权的免费原型；真钱、公开发布、提交及其他未授权动作仍受限。

P0原子转付会触及资金，但不保管待释放用户本金；单张上限1USDC，没有owner、升级、提款、抽成、退款或仲裁。它不是可直接用来处理大额商户资金的已审计服务。
