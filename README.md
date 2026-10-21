# ArcProof 发票直付原型与核验证据

当前第二轮私有本地候选基于已回读的 main 提交42e9ac9d46f7769b9fa428e27511edd66e76c1c9；本轮尚未推送、更新 Studio 或部署。恢复入口：[STATUS.md](STATUS.md)，运行入口：[RUN_中文.md](RUN_中文.md)。

Argon 复审及独立复现修复后391项项目、137项对抗、24项现行UI、114项服务、26项底层安全、6项旧版UI及1项独立存储缺陷回归通过；计数有重叠，不相加当覆盖率。全仓库lint已为0，类型检查、只读check、构建和10项安全边界检查通过。历史124/122项诊断及旧失败日志保留。

已修复确认成功后持久请求状态未自动结清、旧调用方数据来源标签及无效哈希读取顺序；外部模型意见不等于正式审计。schema1.2区分观察数据和已核验结算；工具依赖更新且移除未使用SDK。依赖审计仍有5条记录、可选peer冲突和较宽的钱包包；没有宣称依赖全无漏洞。真实浏览器、CSV表格往返、双钱包及主网验收仍未完成，Studio当前版本未知。全部16项审查问题及边界见[闭环矩阵](docs/AUDIT_CLOSURE_MATRIX.md)。

原始规划和生成来源仍保留。免费原型工作独立于未闭合的 Grant G0；测试网自测不是主网、收入、审计或参赛资格证明。以下索引包含历史规划，具体当前状态以 STATUS.md 和有日期的证据为准。

## 修复与证据边界索引

[16 项审查关闭矩阵](docs/AUDIT_CLOSURE_MATRIX.md) · [质量门禁与历史失败范围](docs/QUALITY_GATES.md) · [源码与素材许可边界](docs/LICENSING_BOUNDARY.md)。具体当前计数和合并版本以最新 STATUS 检查点及对应报告为准；历史计数不升级为当前结果。

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
