# Induction Heating Engineering Calculator

首个可运行网页计算器版本：`0.2.0-mvp.1`。技术冻结 ID 仍为
`IH-EC-V1-G0-2026-08-14-01`；Calculation Basis、Calculation Contracts、ADR、
受控来源和 Gate 0 决策均未被放宽。

## 立即启动

在 PowerShell 中进入仓库，然后运行：

```powershell
pnpm install --frozen-lockfile --offline
pnpm run dev:ui
```

浏览器打开 `http://127.0.0.1:5173/`。生产构建与完整 MVP 门禁：

```powershell
pnpm run build:ui:standard
pnpm run build:ui:portable
pnpm run verify:mvp
```

构建产物：

- Standard Web：`dist/phase5-ui-standard-static/index.html`
- Portable Offline：`dist/phase5-ui-portable-offline/index.html`

Portable 版本使用本地 classic IIFE、CSS 和 HTML，不需要运行时网络或模块加载。

## 当前真实可计算方法

| 模块 | 方法 | 当前可用边界 |
|---|---|---|
| Coil geometry | `B-02` axial fill factor | 均匀、相同截面、单层且轴向投影不重叠 |
| Coil geometry | `D-01` conductor path length | 明确的机械/CAD 圆柱螺旋路径；未知 lead/bus 会保留 lower-bound 警告 |
| Coil electrical | `D-03` DC resistance | 用户显式提供同材料/同温度电阻率及来源；没有默认铜物性 |
| Coil electrical | `D-07` series-port parameters | 用户已有同端口、同状态的 R、L、I、f；计算 X、Z、Q 和分量电压 |
| Cooling | `H-01` cooling heat load | 单一完整冷却回路、热源枚举和不重叠证据齐全；不计算设计裕量 |
| Cooling | `H-03` branch flow geometry | 单支路流量与真实 D-02 上游几何证据齐全；不作 OEM/安全合格判定 |

这六条路线通过受控 Phase-5B application adapter 调用已验证 evaluator。正式 MethodRegistry
仍保持 `52 specifications / 0 formally runtime-executable`；MVP 不伪装为最终 registry 激活。

## 主界面流程

1. 打开 **Calculator**，输入稳定 Case ID 与名称。
2. 选择一个或多个当前可用方法。
3. 按表单填写 canonical-SI 输入、确认项、状态和来源；空白保持 unknown。
4. 点击 **Calculate**。
5. 查看数值、单位、状态、警告、适用范围、假设和方法来源。
6. 点击 **Save case JSON** 下载内容寻址的当前版本 Case。
7. 使用 **Open case** 重新打开并编辑；重新计算会产生当前结果快照。

多选方法会并排显示结果，但只有工程含义和边界相同的输出才可人工比较。目前没有满足
正式 comparison contract 的同量多方法对，因此不发布 Recommended、排名或归一化差值。

## 明确保留的门禁

- 电感族、完整交流电阻、自然对流/保温设计、完整水物性与网络求解等仍因来源钉扎、
  child split、property provider、warning ID、参数对齐或验证门未闭而 Disabled。
- released material catalog 仍为空；软件不提供材料默认值或插值。
- 正式 CalculationResult/Trace、工程报告、3D/FEM、最终 Phase-7 验收仍是后续工作，
  但不阻止当前 MVP 的本地计算闭环。
- 方法输入保存在权威 CaseSnapshot 的受控 provenance marker 中。由于 UI 尚未保存原始
  数字文本的有效位语义，MVP 不把这些输入伪装成精度已知的通用 Quantity。
- 不允许用旧软件输出、截图、工作簿或聊天数值作默认值、校准目标或科学验证目标。

详细边界见 `docs/development/RUNNABLE_MVP.md` 和
`docs/development/PHASE_5_PROGRESS.md`。

## Source of Truth

发生冲突时按以下顺序处理，不得由实现自行择一：

1. `GATE_0_REVIEW.md`、`docs/decisions/V1_DECISION_REGISTER.md` 和 Accepted ADR；
2. `CALCULATION_BASIS.md` 与 `CALCULATION_CONTRACTS.md`；
3. 数据字典、材料数据模型、`FORMULA_SOURCE_REGISTER.md` 和 `VALIDATION_CASES.md`；
4. `APPLICATION_ARCHITECTURE.md` 与 `HANDOFF_TO_CODEX.md`；
5. `PROJECT_AUDIT.md`；
6. `working/`、`archive/`、legacy 原型和同步材料仅作只读历史研究。

