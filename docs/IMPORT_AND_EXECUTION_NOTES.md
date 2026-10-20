# 导入与执行口径

原始 Library 开发包完整保留在 docs/source/ArcProof_Dot_Pack_2026-10-20，不对该目录做执行更新。根目录是当前工作副本；evidence/import-verification.json 记录原包哈希验证与完整 PRD 对比。原始 README 的“未开始”描述属于交付时点，不代替 STATUS.md 当前执行状态。

原始 docs/04_BUSINESS_VALIDATION.md 的 confirmed / unknown / failed 与 AGENTS.md、验收和 JSON 模板不同。执行时统一使用 not_run / passed / failed / blocked；未知值保留 null。原文不改写，不将 unknown 映射为 passed。

原包 G0 的 12 个检查中，除 payout_due_date 外其余 11 项原本会阻断工程；当前用户授权免费原型独立执行，这些原始标记保留用于 Grant 资格路径，不阻止免费原型。付款日期单独阻断快速现金判断。只读文档准备不构成实现，也不得将先在其他工具生成完整应用再导入 Studio 作为真实 Studio 来源。

当前仅授权创建私有仓库及执行项目准备。不由开发包推导消费、真实资金操作、签名、公开仓库/发布、报名、提交或对外联系许可。不得添加应用安装/启动/构建命令，直到相应源码及配置真实存在。
