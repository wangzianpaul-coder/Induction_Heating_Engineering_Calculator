# Induction Heating Engineering Calculator

可运行网页计算器 0.9 测试版：`0.9.0-beta.1`。技术冻结 ID 仍为
`IH-EC-V1-G0-2026-08-14-01`；Calculation Basis、Calculation Contracts、ADR、
受控来源和 Gate 0 决策均未被放宽。

当前网页包含两个彼此隔离的计算入口：**基础计算器**完整兼容整合用户提供的
三文件单方案网页，用于快速复现其输入、公式和结果；**高级计算**继续使用项目的
受控输入合同与已验证计算适配器。基础方案不会写入高级工程 Case，高级 Case 也不会
反向填充或修改基础计算器。

## 立即启动

在 PowerShell 中进入仓库，然后运行：

```powershell
pnpm install --frozen-lockfile
pnpm run dev:ui
```

浏览器打开 `http://127.0.0.1:5173/`。生产构建与完整 MVP 门禁：

界面默认使用简体中文。右上角可将应用外壳和已翻译的工程页面切换为 English；为保持
用户提供三文件网页的内容一致，兼容基础计算器当前保留完整中文内容，不宣称已完成
英文翻译。语言偏好只保存在本机 UI，不会改变或污染 Case JSON。当前版同时放大了
正文、说明文字和表单控件字号。

```powershell
pnpm run build:ui:standard
pnpm run build:ui:portable
pnpm run verify:release:0.9
```

构建产物：

- Standard Web：`dist/v0.9-ui-standard-static/index.html`
- Portable Offline：`dist/v0.9-ui-portable-offline/index.html`

Portable 版本使用本地 classic IIFE、CSS 和 HTML，不需要运行时网络或模块加载。
请将 Portable 整个目录一起分发，然后可直接打开其 `index.html`。Standard
版本应通过静态 Web 服务器发布。两种产物均包含可校验的发布清单和
`V0_9_KNOWN_LIMITATIONS.md`。

## 基础计算器（三文件兼容整合）

基础计算器现已替换为“感应线圈匹配与电感综合计算器”，保留原三文件网页的完整内容
和行为，并统一使用当前工程计算器的界面风格。它包含 9 个页面和 26 个主输入：

- 主计算、Wheeler 公式、Nagaoka 公式、系数查表、积分迭代；
- 几何与材料、电气匹配、损耗与冷却、工程场景；
- 理想螺线管、Wheeler 单层/多层和 Nagaoka 电感同步计算与比较；
- Nagaoka 查表线性插值、Simpson 积分、收敛检查和线圈几何示意；
- 铜管与炉料肌肤深度、电流与目标等效电感反推、线圈电压、铜损和冷却水流量；
- 原网页示例默认值、输入后实时更新、每项问号说明、方案保存/打开、CSV 导出和打印。

“恢复默认值”会恢复三文件网页随附的整套示例输入。这些值是**可见的兼容示例值**，
不是高级受控计算的材料数据库、推荐设计值或校准目标。基础计算结果用于快速估算和
原页面行为复现；需要可追溯证据边界时，应在高级计算中重新建立输入。

## 高级受控计算：当前可计算方法

| 模块 | 方法 | 当前可用边界 |
|---|---|---|
| Coil geometry | `B-02` axial fill factor | 均匀、相同截面、单层且轴向投影不重叠 |
| Inductance | `B-03` ideal long-solenoid limit | 空心或显式均匀线性介质；只发布长螺线管解析极限，不作为有限线圈 Recommended |
| Coil geometry | `D-01` conductor path length | 明确的机械/CAD 圆柱螺旋路径；未知 lead/bus 会保留 lower-bound 警告 |
| Coil electrical | `D-03` DC resistance | 用户显式提供同材料/同温度电阻率及来源；没有默认铜物性 |
| Coil electrical | `D-04` copper skin depth | 用户显式提供同状态电阻率和相对磁导率；不把电磁肤深度解释为热影响深度 |
| Coil electrical | `D-07` series-port parameters | 用户已有同端口、同状态的 R、L、I、f；计算 X、Z、Q 和分量电压 |
| Coupled circuit | `F-01` reflected impedance | 显式同状态 R1/Lp/R2/Ls/M/f 与来源；输出 Zin、Req、Rref、Leq、k，结果为 estimated 且不作 Recommended |
| Cooling | `H-01` cooling heat load | 单一完整冷却回路、热源枚举和不重叠证据齐全；不计算设计裕量 |
| Cooling | `H-03` branch flow geometry | 单支路流量与真实 D-02 上游几何证据齐全；不作 OEM/安全合格判定 |
| Thermal | `J-03` gray-body radiation | 仅支持已审查的大环境或长同心双表面边界；温度、发射率、面积和几何证据必须明确 |

这些路线通过受控应用适配器调用已验证的计算内核。内部正式方法目录仍保持
`52 specifications / 0 formally runtime-executable`；0.9 测试版不会把窄应用适配器伪装为已完成的全产品运行激活。

## 主界面流程

首次试用建议使用 **基础计算器**：

1. 打开“主计算”，检查或修改 26 个输入；页面会随输入实时重新计算，无需另按计算键；
2. 查看推荐空芯电感、电流、目标等效电感和冷却水流量，以及全部几何、电感、材料、
   电气和冷却结果；
3. 使用其余 8 个页面查看公式、查表、Simpson 积分过程、收敛性、场景和当前输入结果；
4. 使用 **保存基础方案 / 打开基础方案** 保存或恢复 26 个表单输入，也可导出 CSV 或
   打印。基础方案文件不含计算结果，不属于高级计算使用的正式工程 Case。

需要保存完整证据边界时使用 **高级计算**：

1. 输入方案编号和名称，选择一个或多个当前可用功能；
2. 按表单所示规范 SI 单位填写数据、确认项、工况和来源；空白表示未知；
3. 点击 **计算**，查看结果、单位、状态、警告、适用范围、假设和方法来源；
4. 使用 **保存方案 / 打开方案** 下载或重新打开当前版本的内容寻址 Case JSON；
   重新计算会产生与当前输入一致的新结果。

基础方案与高级 Case 使用不同的文件种类、字段语义和计算边界，不能互换，也不会互相
写入。基础计算器中的经验等效电阻、交流电阻、冷却系数或示例材料值不会自动进入高级
计算；高级计算结果同样不会覆盖基础页的输入。

多选方法会并排显示结果，但只有工程含义和边界相同的输出才可人工比较。目前没有满足
正式 comparison contract 的同量多方法对，因此不发布 Recommended、排名或归一化差值。

## 明确保留的门禁

- 基础兼容页可以按原三文件网页显示 Wheeler、Nagaoka 和冷却流量估算，但这不会
  激活或替代高级计算中的相应受控路线。
- 高级计算中的 B-04/B-05 有限单层电感、完整交流电阻、H-02 自动冷却流量、自然对流/保温设计和
  网络求解等仍因来源交叉核验、child split、property provider、warning ID、参数对齐或
  验证门未闭而 Disabled。H-02 尤其不能把任意 `cp/rho` 冒充已批准水物性。
- released material catalog 仍为空；软件不提供材料默认值或插值。
- 参数化 3D 示意已经可在网页中使用；外部 FEM 的严格清单与接纳逻辑作为代码交换
  边界提供，当前网页不上传求解器文件、不绘制导入场，也不内置 FEM 求解器。
- 正式 CalculationResult/Trace、签署工程报告和独立全新 Windows 电脑验收仍需后续证据，
  但不阻止 0.9 测试版的本地计算、方案交换、3D 查看和双构建交付。
- 方法输入保存在权威 CaseSnapshot 的受控 provenance marker 中。由于 UI 尚未保存原始
  数字文本的有效位语义，MVP 不把这些输入伪装成精度已知的通用 Quantity。
- 旧软件输出、截图、工作簿或聊天数值不得进入高级受控默认值、校准目标或科学验证
  目标。兼容基础页只可显示所提供三文件网页自带的可编辑示例默认值，并以其输出锁定
  兼容行为；这些数值不会进入高级 Case 或充当工程正确性的独立证据。

详细边界见 `docs/development/RUNNABLE_MVP.md`、
`docs/development/PHASE_5_PROGRESS.md`、`docs/development/PHASE_6_PROGRESS.md`
和 `docs/development/PHASE_7_ACCEPTANCE.md`。

中文操作、参数和结果说明以及与早期 Excel 的逐项对照见
`docs/user/V0_9_中文使用说明.md`，其中列出基础页全部 26 个输入和 9 个页面；高级受控
计算及三维字段附录见 `docs/user/V0_9_参数与结果附录.md`；0.9 里程碑与 Phase 0–7 的状态说明见
`docs/development/V0_9_TEST_RELEASE.md`。

## Source of Truth

发生冲突时按以下顺序处理，不得由实现自行择一：

1. `GATE_0_REVIEW.md`、`docs/decisions/V1_DECISION_REGISTER.md` 和 Accepted ADR；
2. `CALCULATION_BASIS.md` 与 `CALCULATION_CONTRACTS.md`；
3. 数据字典、材料数据模型、`FORMULA_SOURCE_REGISTER.md` 和 `VALIDATION_CASES.md`；
4. `APPLICATION_ARCHITECTURE.md` 与 `HANDOFF_TO_CODEX.md`；
5. `PROJECT_AUDIT.md`；
6. `working/`、`archive/`、legacy 原型和同步材料仅作只读历史研究。
