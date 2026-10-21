# 当前补充：2026-10-21 第二轮候选

当前依赖为Bun1.4.3、Node24.19.0、Vitest4.1.12、Vite6.4.4；使用 bun install --frozen-lockfile --ignore-scripts。bun run lint 和 bun run check 已改为非自动修复，不再带 --fix；check 只包含lint与源码类型检查，不包含完整测试。

完整现行命令及旧测试迁移依据见[质量门槛](docs/QUALITY_GATES.md)。最新结果以STATUS和argon-followon证据为准；下方旧版本/计数是历史说明。实际浏览器、钱包、RPC及主网不由本地通过推出。

---

# ArcProof 当前运行与复验说明（2026-10-21）

当前源码基线是私有 GitHub `d34138b19a3878fd095413822c48d28fea6a4c58`；本次文档修订的交付仅以随后远端提交及回读收据确认。应用包含 Offline Demo 与既有测试网路径，不能再把整份源码描述为“从未部署测试网”或“所有签名始终禁用”。已有测试网部署并不证明当前核验器已在 Studio 集成或通过真实链路验收。Studio 仅有上次核实为旧 `8588d80` 的记录，本次未重查；主网仍未配置。本次复验没有连接钱包、签名、部署或发交易。

## 当前可复现命令

从项目根目录使用 Bun 1.4.3（本次 Node 为 24.19.0）：

1. `bun install --frozen-lockfile --ignore-scripts`
2. `bun run dev --host 127.0.0.1`，按终端地址打开，仅使用无需钱包的 Offline Demo 检查本地演示。
3. `bun run test`：253 项项目测试。
4. `bun run vitest run --config qa/native-settlement-review/vitest.config.ts`：137 项独立对抗测试。
5. `bun run vitest run --config qa/new-independent-review/vitest.config.ts`：24 项 jsdom UI/钱包测试，不是浏览器布局验收。
6. `bun run typecheck`
7. `bun run oxlint src scripts` 和 `bun run oxlint --type-aware src scripts`：只读源码检查。
8. `bun run vite build`：构建通过，有依赖 PURE 注释及大于 500 kB 分块警告。
9. `bun run oxlint .`：本次仍失败，124 项诊断来自六个历史 reviewer/helper 文件，不能当成全仓库通过。

`bun run lint` / `bun run check` 包含 `--fix`，会修改文件，不适用于原样复验。本次未运行它们。Foundry 当前不可用，未重跑未改动的合约；历史 73 项结果不是本轮新结果。`deploy:self`、`compass:deploy`、`fetch:abi` 不是本包支持的运行入口，不要执行。

详见 [STATUS.md](STATUS.md) 和 [本轮基线报告](evidence/g4-baseline-20261021/baseline-report.json)。全部 240 个基线文件在安装和测试后仍与远端一致。历史浏览器通过记录不继承给当前测试网界面；真实 raw receipt、finalized 响应、双钱包 T25/T26 和当前浏览器验收仍未闭合。不要把本地测试或自转 `controlled_demo` 当成客户收入、主网完成或专业审计。

## 历史离线版本说明（原文保留，非当前整体状态）

下文中的“未部署”“真实签名禁用”“132 项”“尚未执行测试网操作”和“此包交付不代表 GitHub 已推送”只描述当时的离线包。当前交付状态以上文及 STATUS.md 为准；历史补丁、日志与来源未重写。

---

# ArcProof 离线原型运行说明

这是无需钱包的模拟演示与源码包，不是已上线支付服务。模拟发票、收据和导出均不是付款证明。未部署到测试网或主网，真实签名禁用，生产部署清单为空；参赛资格与奖励未知。本地离线原型已通过限定范围浏览器验收，但不等于真实链路的完整 G2 验收通过。

## 本地打开

需要 Node.js 支持的开发环境和 Bun。独立核验使用 Bun 1.4.3；保留的 Studio .bun-version 为 1.3.14，这是原始版本记录，非独立测试使用版本。请使用官方来源安装 Bun 1.4.3，然后在解压目录执行：

1. bun install --frozen-lockfile --ignore-scripts
2. bun run dev --host 127.0.0.1
3. 打开终端实际显示的本机地址（默认通常是 http://127.0.0.1:5173）。无需连接钱包，用 Offline Demo 路径创建模拟发票并查看模拟收据。

首次安装依赖需要联网；这里“离线”指业务流程不需要钱包/链上交易，不表示首次安装完全不联网。不要把开发服务器暴露到公网。源码中保留 Studio 开发配置，不是生产安全部署配置。

## 已执行的可复现检查

- bun run typecheck
- bun run test：原项目 132 项；不包含补充 reviewer-tests 目录中的 6 项。
- bun run vite build：实际 Vite CLI 构建入口。package.json 没有 build 脚本，勿运行不存在的 bun run build。
- bun run oxlint --type-aware src scripts 与 bun run oxlint src scripts：只读 lint。package.json 的 lint/check 带 --fix，会修改文件，不用于原样复验。

复现总计 138 项时，先把 reviewer-tests/reviewer-ui.test.tsx 复制到 src/arcproof/__tests__/reviewer-ui.test.tsx，再运行 bun run test。这是独立补充测试，不是原始业务源码改动。

复现 26 项独立对抗探针时，把 reviewer-tests/reviewer-safety.ts 复制到项目根目录 reviewer-safety.ts，执行 bun reviewer-safety.ts。探针包含仅测试用 any，不要把该根文件加入业务源码全目录 lint；结束可移走该副本。

合约使用 Foundry 1.7.1、Solidity 0.8.28、OpenZeppelin 5.1.0；依赖安装完成后执行 forge test --fuzz-seed 0x1234 -vv。包含五组测试共 73 项。编译器首次下载可能需要联网。Paris 本地 EVM 设置不模拟 Arc 的全部协议特性。

## 证据与剩余限制

evidence/g1 记录本地合约 73/73，evidence/g2 记录 132 项项目测试加 6 项 jsdom 交互测试、26/26 对抗探针、TypeScript、lint 与 Vite 构建结果。jsdom 不是布局引擎。实际浏览器已通过精度错误恢复、键盘无钱包开票、模拟收据、未知部署 Pending 与诚实证据页检查。响应式修正后手机 clientWidth/scrollWidth 为375/375，桌面为1138/1138，无横向溢出；精确390/1280未测。观察到的控制台样本没有应用来源错误，但有浏览器扩展错误，不作全局无错误承诺。JSON/CSV 按钮点击已观察，实际下载完成未确认；导出内容由自动测试覆盖。最终 CSS-only 响应式修正后，独立测试138/138，项目132项、TypeScript、lint、构建重跑通过；26项安全探针对应此前未改变的安全代码。

真实钱包生命周期与竞态、拒签/替换交易、paidBlockNumber 单区块恢复、第二 RPC 冲突以及 Arc USDC 系统日志/最终性仍未实测。不要把本地测试数当成全部 28 条分层验收通过。无专业审计或安全保证。

package.json 保留原始 Studio 记录，其中 deploy:self、compass:deploy、fetch:abi 指向未收录的部署辅助脚本，这些不是本包支持的运行入口，请勿执行。node_modules、dist、缓存、环境变量、账号资料、私钥与部署脚本均未打包。

## 来源

原始工程由 Arc Studio 构建；随后以原生修正补丁纠正安全和交互问题，不把这些修正伪装为全部由 Studio 生成。补丁 SHA-256：1197b674362cabba796f8ebf9925dff12f4a614748dd330704417bcdcb1fecf3。

Studio 项目：https://studio.arc.io/app/2dbdda0d-1b70-408b-ae23-cccb8a4b8753?thread=12185290-60f7-4446-9e99-5ca51e8c30b0

此包交付不代表 GitHub 源码已推送、已公开发布或已提交参赛。文件内容校验见 SHA256SUMS.json。

## 最终响应式版本
增量补丁 SHA-256：95e04b41742de63ef4dd7911a40afd08153003f0f8d6ad246f1663600308db09。全部30个源码文件与独立检查清单及 Studio 05:27:20 导出一致。下一阶段测试网流程仅待只读检查，尚未执行测试网操作。


## 当前质量门禁范围

参见 [QUALITY_GATES.md](docs/QUALITY_GATES.md)：源码 typecheck、整仓 lint、归档辅助代码 typecheck、当前合成测试、归档语义失败和远端 CI 是不同结论。没有创建或运行有效 GitHub workflow；手动工作流只是 docs/ci 下的未启用草稿，零预算下需先确认不会产生费用。
