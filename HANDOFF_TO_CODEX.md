# Handoff to Codex — Induction Heating Engineering Calculator

> 当前状态：Gate 0 **PASS**；`IH-EC-V1-G0-2026-08-14-01` 已生效，下一开发阶段 Ready for Codex implementation  
> 当前轮次边界：只同步交接文档，不实现网站、src、3D 或 FEM 连接器  
> 架构依据：[APPLICATION_ARCHITECTURE.md](APPLICATION_ARCHITECTURE.md)  
> 首次进入：[CODEX_START_HERE.md](CODEX_START_HERE.md)  
> 下一阶段可直接复制的执行 Prompt：[CODEX_IMPLEMENTATION_PROMPT.md](CODEX_IMPLEMENTATION_PROMPT.md)

## 1. 给后续 Codex 的一句话任务

从已通过 Gate 0 的冻结基线开始，在下一开发阶段只实现 `approved` 或 `approved_with_limitation` 方法及共同基础设施；所有 Deferred、数据不足、域外和安全声明分支失败关闭，并保持工程内核与 UI、历史审计和外部 FEM 的边界。

## 2. 硬停止规则

出现以下任一情况，后续 Codex 必须停止对应方法或依赖功能；只有冻结基线整体失效时才停止整个开发阶段：

- 当前文件集的 technical_freeze_id 与 `IH-EC-V1-G0-2026-08-14-01` 不一致，或冻结语义已变化而没有 ADR/spec revision 与回归复审；
- 方法仍为 `draft`、`insufficient_evidence` 或 `reference_only`，却被要求进入普通产品结果；
- 参数、单位、材料状态、端口或 topology ID 不明确；
- 关键来源、适用域、warnings 或验证容差未闭合；
- 请求恢复截图复现、黑箱校准、旧软件兼容模式；
- 要用历史 783 kW/135 L/min 作为冷却输入、校准或验证；
- 要让 3D/FEM 导入反向更改计算公式或材料默认值；
- sealed holdout 已被开发者看到目标，或模型在开封后发生变化。

Gate 0 PASS 已授权下一 Codex 开发阶段执行本交接路线图。本轮仍是 documentation-only；不要在本轮提前写代码。

## 3. 必读顺序

1. [CODEX_START_HERE.md](CODEX_START_HERE.md)
2. [GATE_0_REVIEW.md](GATE_0_REVIEW.md)
3. [docs/decisions/V1_DECISION_REGISTER.md](docs/decisions/V1_DECISION_REGISTER.md)
4. [APPLICATION_ARCHITECTURE.md](APPLICATION_ARCHITECTURE.md)
5. [CALCULATION_BASIS.md](CALCULATION_BASIS.md)
6. [CALCULATION_CONTRACTS.md](CALCULATION_CONTRACTS.md)
7. [docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md](docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md)
8. [docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md](docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md)
9. [docs/METHOD_STATUS_DICTIONARY.md](docs/METHOD_STATUS_DICTIONARY.md)
10. [data/materials/MATERIAL_DATA_MODEL.md](data/materials/MATERIAL_DATA_MODEL.md)
11. [docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md](docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md)
12. [validation/protocols/MINIMUM_VALIDATION_PLAN.md](validation/protocols/MINIMUM_VALIDATION_PLAN.md)
13. [FORMULA_SOURCE_REGISTER.md](FORMULA_SOURCE_REGISTER.md)
14. [VALIDATION_CASES.md](VALIDATION_CASES.md)
15. [PROJECT_AUDIT.md](PROJECT_AUDIT.md)
16. [SOURCE_MANIFEST.csv](SOURCE_MANIFEST.csv)

working 中的 QA、提取和研究只能辅助定位问题，不能覆盖正式文件。受控一手技术来源通过 references 和 FORMULA_SOURCE_REGISTER 使用；旧工作簿、截图、旧聊天和旧原型只具有 archive/audit 角色。

## 4. Source of Truth

| 顺序 | 权威对象 | 后续动作 |
|---:|---|---|
| 1 | 用户正式决定、批准 ADR | 必须服从；有冲突时更新下游文档 |
| 2 | 已批准 calculation basis/contracts | 实现只能逐项忠实执行 |
| 3 | 已批准参数、单位、材料、方法、状态、topology 字典、受控一手来源和来源注册 | 所有机器字段和公式来源来自这里 |
| 4 | 已批准验证协议、数据和签字结果 | 决定方法能否升级 |
| 5 | 应用架构和本交接 | 决定模块、依赖和门禁 |
| 6 | audit/working/history | 只解释来历、错误和缺口 |

若两个同级来源冲突，不自行选“看起来更合理”的值；创建/更新 ADR，或保持 `insufficient_evidence` 并失败关闭。

## 5. 用户已确定的 15 项产品决定

1. 最终 UI 不出现截图校对或成熟软件复现轨。
2. mm/cm 由核实公式、原始来源和参数语义裁决，历史表不裁决。
3. 几何语义采用 D_i、D_o、D_m、D_c、d_rad、d_ax、p、g、b_cc、b_env、N、N_rev、lead_length；g 的参数 ID 为 coil.turn_clearance_axial，若显示 g_turn 只能作为别名；D_c 默认 D_m 时给高频 warning。
4. 所有适用且获批的方法都可计算，并给 Recommended 与理由。
5. Req/Leq 提供有边界估算；同工况实测辨识更准确并可作为 Recommended。
6. 历史系数可继续研究，但不得为截图调模；任何可用标定只绑定实际工况测量域，最终产品无截图叙事。
7. Rac 提供限定估算，并允许同状态实测覆盖。
8. 材料采用三级系统并支持 Material Comparison。
9. 冷却完全从控制体重建；历史 783/135 不参与输入、校准或验证。
10. 保温分目标表温和目标热损；用完整圆筒平衡，GB 疑式澄清前采用独立 Fourier。
11. 环隙采用多工况架构，不用一个开放表面关联式覆盖所有边界。
12. 电源支持独立多拓扑，不共享一个谐振函数。
13. 模型冻结后取得新的 sealed holdout；产品和验证叙事不出现截图反推。
14. 阻抗、Rac、冷却、热工和 FEM 必须有最小可执行验证计划。
15. 技术冻结后才开发；未来包含参数化 3D 与 FEM 导入接口。

这些决定批准的是范围和方向，不自动批准任何具体公式。

## 6. 当前项目状态

### 已完成

- 权威 D 盘工作区和只读 references 已建立；
- 主线程、重点工作簿、旧原型和项目来源已审计；
- CALCULATION_BASIS 有 52 个方法编号；
- CALCULATION_CONTRACTS 覆盖 52/52；
- FORMULA_SOURCE_REGISTER 映射 52/52；
- ADR-0002 至 ADR-0009 与 V1_DECISION_REGISTER 已 Accepted；
- 参数、端口/topology、状态、材料和验证/3D 数据字典已形成冻结或批准架构基线；
- MINIMUM_VALIDATION_PLAN 已成为批准协议基线；
- CALCULATION_BASIS 已声明 IH-EC-V1-G0-2026-08-14-01；
- GATE_0_REVIEW 已裁决 PASS，下一开发阶段已获受控实现入口；
- 架构已更新为 A–L、三级材料、独立拓扑和 3D/FEM 边界；
- src 与 tests 仍空，符合当前阶段。

### 依赖功能的数据与发布门（不阻断基础内核）

- 具体 project_material、preset_common 数据集与项目安全阈值尚未逐项发布；
- 多个高风险方法仍受适用域、来源或验证限制，G-09 LLC 保持 deferred；
- 历史 BB/工作簿/截图案例仅允许 `audit_only`，不得进入产品验证、方法推荐或 runtime；
- 阻抗、Rac、冷却、热工和 FEM 验证未按正式协议执行；
- sealed holdout、托管人、冻结 manifest 和阈值尚未建立；
- 参数化 3D/FEM import 只有接口边界和数据契约，尚无真实导入样本与验收结果。

## 7. A–L 模块交接

### A — Shared Material & Physical Properties

**目的：**唯一材料真值服务、三级材料、Material Comparison 和 MaterialSnapshot。

**输入：**material records、T、f、H、压力、相态、表面/湿度/批次状态。

**输出：**经域检查的物性、uncertainty、source、warnings、snapshot ID、比较结果。

**当前缺口：**

- preset_common、project_material、user_defined 的具体数据集与版本；
- 首批铜、钢、绝热、水、空气和表面属性记录；
- 插值、外推、Curie/相变分段验证。

**完成定义：**

- 三等级记录和推荐规则获批；
- 不同来源不静默平均；
- 每个属性有 SI、有效域、来源 hash、不确定度和审批；
- Material Comparison 能在同状态比较并生成新的 snapshot。

### B — Coil Geometry & Inductance

**目的：**canonical GeometrySnapshot、导体路径和空芯电感。

**输入：**D_i、D_o、D_m、D_c、d_rad、d_ax、p、g、b_cc、b_env、N、N_rev、lead_length。

**输出：**几何派生量、导体路径、各电感方法结果、3D geometry payload。

**当前缺口：**

- 依照已冻结参数字典同步仍使用旧别名的合同/验证文字；
- D_c 默认 warning、N/N_rev 和 b_cc/b_env 的执行测试；
- 少匝/粗管/引线的验证。

**完成定义：**

- 所有几何参数无歧义且带示意；
- 方法只消费 GeometrySnapshot；
- 解析、Wheeler、Nagaoka/Lundin、离散圆环均有独立 method ID；
- 3D 和计算结果使用同一 geometry hash。

### C — Inductance Method Comparison & Validation

**目的：**所有适用方法并算、Recommended、扫描和方法差。

**输入：**同一个 GeometrySnapshot、method registry 和批准参考。

**输出：**逐方法结果、not_applicable、warnings、差异、Recommended 与理由。

**冻结的 Recommended 规则：**符合空气芯有限长电流片假设时以 B-04 Nagaoka/Lundin 为分析基线，B-03/B-05 仅作限域比较；稀疏或少匝结构仅在 B-07 自身薄圆实心导体假设全部成立时可推荐 B-07，否则不强选解析法并建议 FEM/同状态测量。不得自行添加通用匝数、节距或百分差硬阈值。

**完成定义：**没有合格方法时返回 insufficient_data；不得把方法接近称为独立验证。

### D — Coil Electrical Parameters

**目的：**长度、截面、DC/AC 电阻、铜损、皮深、电流密度、阻抗和 Q。

**输入：**B 几何、A 物性、f/T/I、安装和工件状态、可选实测。

**输出：**估算与实测分列的 Rac、Pcu、阻抗、warnings 和 Recommended。

**当前缺口：**空心圆管/实心/矩形的批准 Rac 方法、邻近效应边界、去嵌入协议。

**完成定义：**估算仅在来源范围内；实测覆盖绑定完整状态；不得用历史铜损反算后再验证。

### E — Workpiece EM & Heating Parameters

**目的：**工件皮深、温变电磁属性、Curie 处理和频率权衡。

**输入：**A 材料、工件几何、f、T、H/state。

**输出：**δ、适用域、材料 warnings、限定频率指标。

**当前缺口：**实际钢牌号的 μr(T,H,f)、ρe(T) 与 Curie 数据。

**完成定义：**缺状态数据时阻止伪精确结果；频率相关式不冒充普适最佳频率。

### F — Coil–Workpiece / Equivalent Load

**目的：**统一端口 Req/Leq、标准反射代数、测量辨识和限定估算。

**输入：**B/D/E、端口定义、实际阻抗、可选 FEM reference。

**输出：**analytical estimate、measurement_identified、empirical_calibrated 或 fem_or_experiment_reference 结果及 uncertainty。

**当前缺口：**可批准的几何估算方法、实测/FEM校准包络、measurement override 规则。

**完成定义：**实测优先；估算仍可比较；无数据不发明 k、Kq、间隙公式。

### G — Heating & System Electrical

**目的：**有用热、加热时间、效率、输入功率和独立电源拓扑。

**输入：**F 端口量、D 损耗、J 热损、topology/port/phasor、功率边界。

**输出：**功率链、阻抗、PF、补偿参数、变比和器件应力（仅相应模型批准时）。

**独立 topology IDs：**

- series_rlc_single_loop；
- parallel_ideal_r_l_c_branches；
- parallel_c_with_series_rl_load；
- ideal_transformer；
- llc_zjl_fig2_6_fundamental_equivalent（保留研究 ID；G-09 当前 `deferred`，不进入 v1 runtime registry）。

**当前缺口：**实际并联/Series/理想变压器的执行验证、LLC 基波网络专项验证、真实变压器非理想模型边界。

**完成定义：**未知拓扑/端口/RMS 基准时返回 insufficient_data 并触发 blocking warning；串联、并联不共用公式；选择 LLC 时按本冻结直接返回 Deferred/insufficient_data，直到后续 ADR 批准某个完整拓扑。

### H — Cooling Water

**目的：**水侧热负荷、流量、支路速度、Re、压降和安全边界。

**输入：**Pcu、实际热拾取、Tin/Tout、几何、物性、支路和泵边界。

**输出：**质量/体积流量、速度、Re、Δp、壁温风险和 warnings。

**当前缺口：**实际控制体、各支路测量、Nu/摩阻/局部阻力/OEM范围。

**完成定义：**历史 783/135 永不进入产品数据；热负荷未知时不静默为零；量热和压降台架通过。

### I — Thermal Insulation Thickness

**目的：**分别求目标表温和目标热损的圆筒绝热厚度。

**输入：**层几何、k(T)、Ti/Ta/Tsur、h、ε、目标和端部边界。

**输出：**两个独立厚度、同时满足厚度、回算表温/热损和 solver report。

**当前缺口：**实际绝热材料数据、端损边界和实验。

**完成定义：**完整圆筒能量平衡求根；GB 疑式不执行；双目标不混成一个闭式。

### J — Reusable Thermal Loss Components

**目的：**传导、对流、辐射、端损和环隙组件。

**输入：**A 物性、几何、环境、方向、开闭/偏心/强制流状态。

**输出：**分项与总热损、h/Nu/Ra、适用域 warnings。

**当前缺口：**各环隙工况批准相关式与验证域。

**完成定义：**每种边界独立 method ID；没有匹配相关式时只给传导/辐射基线和 FEM/实验建议。

### K — Integrated Case Orchestration & Balance

**目的：**CaseSnapshot、依赖 DAG、外层迭代、控制体和 trace。

**输入：**A–J 的纯方法与冻结状态。

**输出：**收敛的 ResultPackage，或按冻结枚举明确返回 `not_applicable`、`insufficient_data`、`non_converged`、`no_feasible_solution`、`invalid_input`、`inconsistent_measurement` 与相应 blocking warning。

**所有权：**

- Req/Leq—温度—功率循环；
- Rac—铜损—冷却—铜温循环；
- 保温—表温—h/辐射循环；
- 总功率/能量/流量守恒。

**完成定义：**模块不互相递归；K 记录初值、更新顺序、松弛、残差、迭代数和能量闭合。

### L — Parametric 3D & FEM Interchange

**目的：**参数化工程 3D 和未来外部 FEM 数据交换。

**输入：**GeometrySnapshot、ResultPackage、FEM manifest/fields。

**输出：**可追踪 3D geometry、尺寸、标量叠加、FEM reference 和差异报告。

**v1 engineering visualization 必含对象与交互：**

- 工件/炉管、每一层保温、真实径向空气隙、螺旋空心水冷铜管线圈、内部冷却路径、引线/母排及可选支撑；
- 管径/壁厚、工件直径、保温厚度、`D_i/D_o/D_m`、匝数、节距、轴向长度和引线变化后，由同一 GeometrySnapshot 实时重建，3D 不另存一套几何真值；
- rotate、zoom、pan、section/cut、layer visibility、透明度、组件拾取和尺寸标注；
- 可叠加温度标量、penetration/skin depth、冷却水方向、热流方向和电磁作用示意。凡不是导入 FEM/CFD 的空间场，必须明确写 `schematic_or_illustrative`，并使用与 FEM 云图明显不同的图例/水印；
- 为 ANSYS Maxwell、ANSYS Thermal、COMSOL 等外部结果预留 temperature、magnetic flux density、current density、volumetric heat generation 及时间序列字段，并支持剖切、旋转、缩放和时间步浏览；
- v1 不在浏览器内求解完整 FEM/CFD。

**当前缺口：**批准数据字典的机器可读 schema、真实导入样本以及映射/网格验收结果。

**完成定义：**

- 3D 不生成伪物理场；
- imported FEM 有 solver、hash、坐标、材料、边界、网格、收敛和能量证据；
- L 不反向改公式、材料或 case；
- FEM 只能是 fem_or_experiment_reference。

## 8. 全局数据契约交接

### ParameterRegistry

必须覆盖 symbol、工程名、module owner、dimension、SI/display units、required/default、physical/method ranges、state、provenance、dependencies、warnings 和 precision。

### MaterialRegistry

必须覆盖 preset_common/project_material/user_defined、属性曲线、data_quality、状态、来源、不确定度、插值/外推和审批。

### MethodRegistry

必须覆盖 method ID/version/type、approval、confidence、inputs/outputs、equations、domain、warnings、validation IDs 和 Recommended eligibility。

### CaseSnapshot

必须锁定 parameter/material/geometry/topology/method/warning/solver/schema 版本。

### ResultPackage

必须包含值、SI、uncertainty、provenance、method/material/case versions、warnings、trace、solver report 和 Recommended。

### WarningRecord

必须有稳定 warning ID、severity、predicate、observed values、consequence、action、source 和 blocks_result。

产品 schema 禁止出现 screenshot residual、black-box reproduction confidence 或 screenshot-calibrated provenance。

## 9. 参数定义页交接

未来 Parameter Definition Page 由 ParameterRegistry 自动生成，至少展示：

- A–L 分类和全文检索；
- symbol、中英文名、SI/显示单位；
- required/default 与来源；
- physical/method range；
- 当前案例值与 provenance；
- geometry、topology、port、RMS/peak 和 series/parallel equivalent 语义；
- 方法消费者、派生来源、warnings；
- calculation contract、source register 和 validation IDs。

不得在页面组件中维护第二套参数定义、默认值或公式。

### UI / UX 页面与结果规则

产品信息架构至少包括：项目/案例管理；参数定义；几何与 3D；材料选择与 Material Comparison；A–J 分模块计算；K 集成工况与能量平衡；方法比较；warnings/缺失数据；公式来源与 calculation trace；验证/FEM import；保存案例和导入导出。页面分组可在实现阶段优化，但不能改变模块和参数语义。

- 输入控件由 ParameterRegistry 生成，显示工程定义、SI/显示单位、必填性、范围、默认值来源和当前数据质量；单位转换只在 UI 边界，隐藏默认值禁止。
- 结果必须显示 method/version、输入快照、显示单位与 SI 值、provenance、scientific confidence、material data quality、applicability、uncertainty/有效数字、未计入项和 solver status。
- 方法比较对同一不可变输入运行所有适用方法，明确 Recommended 与理由；`not_applicable`、`insufficient_data`、`non_converged` 和被排除方法不得从列表中消失。
- blocking warning 必须在结果旁可见并阻止普通数值；warning 应给出触发值、工程后果、所需补充输入或测量/FEM建议。
- calculation trace 展示公式、方法局部变量映射、逐步代入、来源页/式、适用域检查、数值残差和依赖 DAG；UI 只渲染 trace，不自行重算工程公式。
- `generic_typical` 与 `project_specific` 等数据等级必须视觉区分；缺关键物性返回 `insufficient_data`，不得借用其他材料常数。

## 10. 三级材料和 Material Comparison 交接

默认选择逻辑：

1. 过滤状态域不覆盖当前 case 的记录；
2. 同状态有效的 project_material 优先；
3. 用户在当前设计明确选择的 user_defined 生成带来源和质量标签的新项目快照；
4. 否则使用域内 preset_common，并按 approved_reference、engineering_reference、generic_typical 显示数据质量；
5. 每次选择生成不可变 MaterialSnapshot，不回写原记录。

Material Comparison 必须显示来源、等级、状态域、数据点、插值、外推、不确定度和下游敏感性。冲突值分列，不静默平均。

## 11. 独立拓扑交接

共同电气语义：

- RMS 相量；
- 时间约定和被动符号；
- port ID 和电流方向；
- coil/tank/inverter/grid 边界；
- loaded state、f、T、gap；
- fundamental 与 switching waveform 分开。

每个 topology 独立 netlist、输入合同、方程、warnings 和验证：

- Series RLC；
- ideal R||L||C；
- series-loss RL branch || C；
- ideal transformer；
- Zhang Jinlong Figure 2.6 fundamental equivalent LLC（仅作 G-09 后续研究/参考验证候选，不是当前 v1 runtime 方法）。

未知 topology、端口或 quantity basis 时返回 insufficient_data。

## 12. 验证和 sealed holdout 交接

模型冻结前：

- 固定 formulas/features/preprocessing/parameters/domain/warnings/metrics/thresholds；
- 记录 code/spec/data hash 和负责人签字；
- 所有用于开发或校准的数据列入 manifest 并与 holdout 隔离；`dataset_role` 只使用冻结枚举 `development | calibration | validation | sealed_holdout | external_validation | audit_only`，历史资料永远是 `audit_only`。

冻结后：

- 由独立托管人取得新的实测或经实测锚定 FEM 数据；
- 开发者不看 targets；
- evaluator 对冻结 artifact 运行一次；
- 原始、预测和评分分别 hash；
- 修改模型或阈值即新版本、新 holdout。

最低协议：

- EXP-Z-001：空载/冷/多温点端口阻抗；
- EXP-RAC-001：DC/AC Rac 与量热交叉；
- EXP-COOL-001：多流量/热负荷、温升、压降、壁温；
- EXP-THERM-001：无保温/多厚度、表温、热流和瞬态；
- FEM-EM-001：2D/3D、三档网格、能量闭合、实测重叠；
- FEM-TH-001：热流体网格/时间步/能量闭合、实测重叠。

## 13. 最终产品与发布合同

以下为下一开发阶段必须满足的正式产品要求。它们约束实现、交互、构建和验收，但不改变任何已冻结计算公式、参数语义、方法状态或验证结论。

### 13.1 产品定位

最终成品是桌面优先的专业 **Induction Heating Engineering Calculator**，不是简单表格网页、营销页或展示 Demo。产品应覆盖专业工程计算、多方法比较、三级材料数据库、参数化几何、电气/电磁/冷却/热工/保温/谐振及系统计算、适用域和 warning、calculation trace、参数化 3D 工程可视化、参数与方法定义说明，以及未来 FEM result visualization 接口。

视觉和工作流应接近 CAE、electrical engineering 或 process engineering 软件：专业、工业、技术、克制、信息密集但可读。不得使用卡通、霓虹游戏风、过度圆角/渐变/玻璃拟态、大量无意义动画、巨型卡片或手机 App 式布局。

### 13.2 源码技术方向与分层

首选 TypeScript、React、Vite、Three.js、Vitest；只有经过记录的架构理由才能替换。框架选择不得破坏以下单向依赖：

```text
calculation-core / materials / solvers
        -> application orchestration
        -> presentation adapters
        -> React UI / charts / Three.js viewer
```

- calculation core 必须是可独立测试的纯 TypeScript，不启动 React 也能运行；
- 工程公式、参数定义、单位转换规则、适用域和 warning predicate 不得散落在 React component、chart 或 3D viewer；
- UI 只消费 application/domain API 和 trace，不自行重算工程量；
- 3D 只消费 canonical GeometrySnapshot/ResultPackage，不维护第二套几何真值；
- 开发依赖不得泄漏为最终用户运行依赖。

### 13.3 两类正式发布产物

同一套源码必须生成并测试：

1. **Portable Offline Build**：发布目录复制到普通 Windows PC 后，在没有 Node.js、npm、Python、数据库、Web Server、开发环境、命令行和互联网的条件下，用户直接以 Chrome/Edge 打开入口 HTML 即可使用；
2. **Standard Static Web Build**：可部署到 Cloudflare Pages、GitHub Pages、企业静态服务器或普通 HTTPS 网站。

Portable build 必须针对 `file://` 设计，而不是把普通开发构建目录改名：

- 所有 JavaScript、CSS、字体、图标、shader、图片和必要资源随发布包提供，禁止 CDN；
- 材料数据、公式元数据、参数字典、单位信息、默认配置和帮助内容在构建时打包/嵌入，禁止依赖运行时 `fetch()` 本地 JSON；
- 入口和资源路径必须相对且可移动，不能依赖站点根路径、localhost、service worker 或 secure-context-only API；
- 若浏览器对 `file://` 的 ES module/CORS 策略与源码模块化冲突，必须由独立 portable 构建过程消解，例如生成无需运行时模块抓取的自包含 bundle；不得降低源码分层质量；
- 3D 几何优先程序化生成，纹理/环境资源必须本地打包；
- 案例导入使用文件选择与 FileReader 等可离线路径，导出使用下载/Blob 等普通浏览器能力；File System Access API 只能作为可选增强，不能成为唯一通道。

### 13.4 Portable Offline 验收

发布前必须形成可重复的验收记录，并至少完成：

1. 构建机断网运行 portable 入口；
2. 将发布目录复制到另一台普通 Windows PC；
3. 该电脑不安装 Node.js、Python、开发环境或 Web Server；
4. 以 Chrome 和 Edge 直接打开入口文件；
5. 验证核心计算、材料查询/比较、参数与方法帮助、3D Viewer、图表、案例导入导出和打印均正常；
6. 检查开发者工具没有因本地资源、CORS、模块、字体、shader 或数据加载导致的阻断错误；
7. 完全断网仍能重复上述操作。

自动化 `file://` smoke test 可以补充，但不能替代至少一次干净 Windows 环境的人工验收。Standard build 必须另有 HTTPS/static-host smoke test。

## 14. 桌面工程 UI / UX 合同

### 14.1 目标显示环境

主目标是 Windows、Chrome/Edge、1920×1080、100%–125% display scaling；必须同时检查 1366×768 最低兼容观察和 2560×1440。1920×1080 应是最佳信息密度，不能因 3D Viewer 挤压主要计算操作空间。

建立统一 typography/token system。初始设计目标：正文和主要输入约 14–16 px，参数名称和单位约 13–14 px，辅助说明保持正常可读；一级标题克制，数值结果突出但不夸张，公式、上下标以及中英文数字单位混排清晰。最终数值由三种目标分辨率的实际截图和交互检查调整。

### 14.2 页面信息架构

推荐但不强制的桌面布局：

- 左侧：persistent module/project/case navigation、模块状态、完成度和 warning count；
- 中间：工程输入、方法/材料选择、结果和主要工作流；
- 右侧：可折叠/可调整尺寸的 3D Viewer、几何或选中结果可视化；
- 底部或切换区：Results、Method Comparison、Warnings、Calculation Trace、References / Method Basis。

支持 collapsible/resizable panels、sticky navigation 和恢复合理布局。普通数值录入不应依赖 modal；不要以巨大卡片和留白分割本可在同屏比较的信息。

### 14.3 参数输入与定义

每个输入尽可能展示或快速访问：工程名称、symbol、值、display unit、canonical SI、定义、合法范围、方法适用范围、required/optional、来源/默认来源、数据质量和 tooltip/help。`D_i/D_o/D_m/D_c` 等易混字段必须明确，不能退化为含糊的 “Coil Diameter”。

- 参数控件由 ParameterRegistry 驱动；参数定义页支持 A–L 分类、搜索和消费者追踪；
- 用户友好地转换显示单位，但 calculation core 只接收 canonical SI；
- invalid input 指出具体参数、原因、合理范围和因此不可用的方法；
- 支持键盘 Tab、输入快速跳转、copy result、reset section、受保护的 reset case，以及关键破坏操作的确认/撤销；
- 颜色不能是状态的唯一表达方式。

### 14.4 结果、状态与追踪

关键结果不是裸数字，至少提供 Value、Unit、Method/Version、Applicability、Data Quality、Warnings、Assumptions、Material Source、Calculation Status 和合理有效数字。支持 normal/scientific notation、显示单位切换和 comparison view。

状态必须独立表达 `valid result`、`warning`、`not_applicable`、`insufficient_data`、`non_converged`、`no_feasible_solution`、`invalid_input` 和其他冻结枚举；不能全部变成红色 Error，也不能以 NaN/0 冒充失败结果。

重要结果必须能展开追溯：

```text
result -> method/version -> input snapshot -> material properties
       -> equations/substitutions -> source -> assumptions
       -> applicability checks -> warnings -> solver report
```

Method Comparison 在同一不可变输入上运行所有适用且获批方法，突出 Recommended 与理由，同时保留不适用/数据不足方法及原因。UI 不得出现截图复现、旧软件残差、黑箱校准或历史工作簿叙事。

## 15. 材料、案例、导出与版本合同

### 15.1 材料系统

Common Preset Materials、Project Materials、User Defined Materials 是正式一级功能。用户选择材料后必须看到本次实际采用的关键物性、状态点、来源、数据等级、插值/外推和 warning；温变物性提供 property-vs-temperature 小型图表。Material Comparison 必须在同一 GeometrySnapshot、工况和方法版本下并行比较，不得静默借用其他材料常数或平均冲突来源。

### 15.2 本地案例管理

无后端和账号仍必须提供 New、Save、Load、Export、Import Case。localStorage/IndexedDB 可用于自动恢复和偏好，但不能是唯一保存通道。可交换的 JSON 案例文件至少记录：

- schema、application、calculation-model 和 material-database versions；
- geometry、materials、operating conditions、topology/ports；
- user inputs、display units、method selections 和 explicit overrides；
- provenance、warnings acknowledgement 和必要的 solver settings；
- 创建/修改时间、case ID，以及兼容性/migration 信息。

另一位工程师在离线 portable build 中导入后，应能复现同一输入快照和模型版本；缺少旧版本材料或方法时必须给出 migration/insufficient_data，而非静默替换。

### 15.3 结果导出

至少支持 Export JSON、Export CSV、print-friendly report 和 Browser Print / Save as PDF。导出内容保留 inputs、outputs、units、methods/versions、materials/versions、warnings、status、assumptions、trace 摘要和 application/model/database versions。正式 Engineering Calculation Report 可后续增强，但基础导出不能依赖后端。

### 15.4 软件和模型版本

主界面、About/Help、案例文件和导出报告必须明确显示：

- Application Version；
- Calculation Model Version；
- Material Database Version；
- technical_freeze_id 或其可追溯映射。

应用发布版本、计算模型版本和材料数据版本分别升级，不能用一个 UI 版本掩盖公式或数据变化。

## 16. 3D、可靠性、性能与可用性合同

### 16.1 参数化 3D

v1 3D 必须程序化显示炉管/工件、各保温层、insulation-coil air gap、螺旋空心水冷铜管线圈和主要尺寸关系，并随 canonical GeometrySnapshot 更新。至少支持 rotate、zoom、pan、reset view、component visibility、transparency；条件允许时支持 cutaway/section 和适度的 engineering dimensions/labels。

3D 风格专业克制，几何判断优先于装饰。temperature、skin depth、cooling flow、heat-flow 和 electromagnetic effect 可做结果映射；非导入 FEM/CFD 的空间场必须持续标记 **Schematic / Illustrative**，并与真实求解场使用不同图例/水印。

为 ANSYS Maxwell、ANSYS Thermal、COMSOL 外部结果预留版本化 importer/adapter 和统一 FieldDataset，但 v1 不实现浏览器 FEM solver。未来导入需携带 solver、units、coordinates、mesh、boundary conditions、convergence、energy balance、time axis 和 source hash。

### 16.2 数值可靠性与错误处理

所有迭代求解器记录 convergence criteria、maximum iterations、termination status、residuals 和必要 trace。失败必须解释原因和可采取动作，不输出 NaN、Infinity、0 或最后一次迭代值作为普通结果。warning severity、status 和 blocks_result 遵守冻结字典。

### 16.3 性能

- 普通解析/工程计算应接近即时响应；
- 输入编辑与焦点移动无明显卡顿，昂贵链路使用明确 Apply/Calculate、debounce、memoization 或 worker，而不是每个按键重算；
- 3D 更新与大型图表调度不阻塞普通输入；
- FEM 大数据可视化采用独立性能预算、流式/分块或降采样策略，不拖慢无 FEM 的 calculation workflow；
- 在普通办公 Windows PC 上验证首屏、交互、常用计算和 3D 帧率/内存。

### 16.4 基础可用性

支持键盘导航、可见焦点、合理 hover/focus help、语义标签、状态文本/图标双表达和足够对比度。关键清空/覆盖操作防误触；普通输入避免 modal。国际化架构至少不阻碍中英文参数名、数字、公式和单位的稳定混排。

## 17. 开发质量、交付物与产品验收

每个正式 calculation module 的最低 DoD：isolated implementation、TypeScript types、contract mapping、unit tests、applicability/domain tests、invalid-input/failure tests、trace、source/method/version metadata 和文档。测试必须直接调用 calculation core，不能只通过 React 点击测试。

最终至少交付：

1. 完整、可维护源码；
2. 自动化单元、属性/量纲、集成、UI 和构建验收测试；
3. Standard Static Web Build；
4. Portable Offline Build；
5. 用户使用说明和参数/方法帮助；
6. developer / architecture documentation；
7. application/calculation/material version information；
8. 不使用历史输出作为真值的示例案例；
9. reproducible build instructions；
10. static deployment instructions；
11. portable clean-PC/offline acceptance record；
12. 已知限制、Deferred 功能和后续验证/FEM门清单。

软件 v1 只有在核心模块按 allowlist 完成、测试通过、两种构建产物可复现、portable build 在无开发环境且断网的普通 Windows PC 直接打开通过、1080p 工程工作流验收通过、版本和追溯完整、用户工程验收完成后，才可称为完成。

## 18. 实施边界

本轮仍只允许修订文档。下一开发阶段允许：

- 实现 SI Quantity、registries、warnings/status、schema、trace 和测试基础；
- 实现冻结规范中 `approved` 与 `approved_with_limitation` 方法，并强制其 applicability/warning predicates；
- 建立独立拓扑、三级材料、参数定义页、参数化 3D 与未来 FEM import 的受控接口；
- 在缺少项目材料、OEM限制、实测/FEM或 sealed holdout 时，只阻断依赖结果或置信度升级。

任何阶段都不允许：

- 执行 `deferred`、`insufficient_evidence` 或 `reference_only` 方法为普通结果；
- 将历史资料转成 runtime calibration/validation data；
- 创建没有批准依据的默认材料、系数、安全阈值或拓扑假设；
- 让 UI、3D 或 FEM 导入重定义公式、参数语义或材料真值。

## 19. 下一开发阶段执行顺序（Gate 0 已 PASS）

### Step 1 — Freeze verification

- 读取 technical_freeze_id；
- 验证所有文件/data hash；
- 确认 v1 method allowlist；
- 确认没有未处理 blocked item。

### Step 2 — Foundation

- SI Quantity、registries、warnings/status、schema 和 trace；
- 纯函数和测试，仍不做 UI。

### Step 3 — A–E/I/J

- 先实现低耦合且已批准方法；
- 每个 method 与 contract/source/validation 一一对应。

### Step 4 — F–H/K

- 实测 override、独立拓扑、功率/冷却、外层迭代和守恒。

### Step 5 — L

- parameterized 3D；
- measurement/FEM import；
- provenance 和 comparison。

### Step 6 — UI

- 参数定义、Material Comparison、方法比较、warnings、trace 和 3D；
- UI 不含工程公式或历史复现轨。

### Step 7 — Dual build and release acceptance

- 生成并持续测试 Standard Static Web Build 与 Portable Offline Build；
- 完成 file://、断网、干净 Windows PC、三种目标分辨率、案例交换、导出和打印验收；
- 冻结 application/model/material versions，生成 release manifest 和已知限制。

按冻结 allowlist 和各阶段 DoD 推进；某项数据或验证未就绪时失败关闭该依赖功能，不把它扩大为无关基础模块的全局阻断。

## 20. Definition of Done

### Documentation DoD（当前阶段）

- 15 项决定保持与 Accepted ADR/V1_DECISION_REGISTER 一致；
- APPLICATION_ARCHITECTURE、CALCULATION_BASIS、CONTRACTS、VALIDATION、SOURCE REGISTER 术语一致；
- A–L module owners、inputs、outputs、dependencies、warnings、validation 完整；
- Parameter/Material/Method/Topology/Status/Warning schema 获批；
- preset_common/project_material/user_defined 和 Material Comparison 获批；
- runtime/UI 产品 schema 无截图/黑箱轨；
- 3D/FEM manifest 和失败语义获批；
- Gate 0 checklist 已签字 PASS。

### Method DoD

- approval_status 为 approved 或 approved_with_limitation；
- source/derivation、SI、domain、warnings 和 contract 完整；
- validation IDs 有预注册阈值和 executed_pass；
- Recommended 规则和 failure semantics 已测试；
- 域外不返回普通结果。

### Gate 0 Technical Freeze DoD（已满足）

- v1 allowlist 与排除表签字；
- basis、contracts、schema、warnings 和 validation protocol 版本已固定；代码、solver 与执行数据 hash 在下一阶段相应 model freeze 时补入 manifest；
- 高风险阻抗、Rac、冷却、热工/FEM已定义可执行协议；未执行项保留为对应方法/置信度/发布门；
- sealed holdout 的隔离、托管、manifest 和阈值规则已定义，实际数据在模型冻结后建立；
- technical_freeze_id 与 GATE_0_REVIEW PASS 齐备，下一开发阶段入口生效；

### Future Software DoD

- 计算逻辑与 UI 分离；
- 全部方法与冻结 contract 一一对应；
- SI、warnings、status、trace 和版本可重现；
- A–L 测试、守恒和 migration 通过；
- 3D/FEM provenance 清楚；
- Standard Web 与 Portable Offline 两种发布产物均通过验收；
- portable build 在无 Node.js、无开发环境、无互联网的普通 Windows PC 通过 `file://` 入口运行；
- 1920×1080 为最佳桌面体验，1366×768 和 2560×1440 完成兼容检查；
- 本地案例 JSON、导入导出、版本迁移和打印报告可复现；
- 无 screenshot/black-box runtime 字段、代码路径、页面或测试；
- 用户完成工程验收。

## 21. 最终交接状态

当前结论：

- documentation_handoff_ready=true；
- technical_freeze_id=IH-EC-V1-G0-2026-08-14-01；
- gate_0=PASS；
- current_turn=documentation_only；
- next_stage=ready_for_codex_implementation；
- next_stage_source_code_allowed=approved_allowlist_only。

下一位 Codex 应先校验 freeze ID 和方法 allowlist，再从 Foundation 开始；不重做 Gate 0，也不以空 UI 骨架替代工程内核和测试。
