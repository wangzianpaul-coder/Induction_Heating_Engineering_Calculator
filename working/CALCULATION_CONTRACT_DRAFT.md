# Calculation Contract Draft — 全计算条目合并稿

> 目标文件：未来可合并入 `CALCULATION_BASIS.md` 的逐计算契约草稿  
> 覆盖范围：现有全部 52 个 `A-01` 至 `I/J-xx` ID  
> 状态：**working draft / 全部未获工程批准**，2026-08-13  
> 边界：本文件只补规范，不实现计算器，不选择技术栈，不把工作簿或成熟软件截图当物理真值。

## 0. 合并规则与统一枚举

### 0.1 唯一方法类别机器值

建议两份正式文档统一采用以下机器值；中文显示名不参与存储和比较：

| `method_type` | 含义 |
|---|---|
| `analytical` | 闭式解析、定义式、守恒式或经复核代数推导 |
| `engineering_correlation` | 有来源、试验范围和误差说明的工程相关式 |
| `calibrated_engineering_model` | 对成熟软件或项目测量标定且仅在冻结包络内使用 |
| `numerical` | 数值积分、求根、ODE、离散求和；物理模型与数值算法分别追溯 |
| `measurement_identified` | 由同频端口或热工测量辨识 |
| `fem_or_experiment_reference` | 外部 FEM/实验验证数据；本应用不内置通用 FEM |

一个可运行 `method_id` 只取一个 `method_type`。本文件中包含多个子方法的“计算族”必须在实施前拆成独立 `method_id`，不可新增含糊的 `hybrid` 类别。

### 0.2 生命周期、执行结果和验证状态

- 本文件所有条目的最高生命周期均为 `not_approved`。细分备注可为 `specification_candidate`、`partial_specification`、`insufficient_data`、`reference_only` 或 `rejected_current_form`。
- 运行结果统一为：`success | success_with_warnings | not_applicable | insufficient_data | non_converged | invalid_input`。
- 验证运行状态统一为：`executed_pass | executed_fail | specified_not_run | planned_blocked | historical_exposed_reference`。
- `historical_exposed_reference` 不是留出验证。BB-01、BB-02、BB-03 以及主线程中所有已见过的成熟软件工况均属已暴露数据，最多用于候选模型校准或回归；只有在模型、特征和误差阈值冻结后取得的新工况才能成为 `sealed_holdout`。

### 0.3 输入表和范围语义

- `physical range` 是硬物理/数据约束；违反即 `invalid_input`。
- `method range` 是该模型可防御的范围；超出时返回 `not_applicable` 或 `success_with_warnings`，不能静默外推。
- “无默认”表示缺值不得猜测。温度均为 K，温差为 K；所有计算入口只接受 SI。
- 表中 `source basis=case` 表示工况实测/设计输入，不是默认常数；`A` 表示共享物性模块；`DER-*` 表示本项目独立 SI 推导记录，**待工程签字，不冒充外部文献**。

### 0.4 共享容差基线

| ID | 建议容差 | 用途 |
|---|---|---|
| `TOL-ID` | `abs_err ≤ 1e-12·max(1,|reference_SI|)` | 纯代数、单位往返和合成输入 identity |
| `TOL-NUM` | 求根能量残差 `≤max(1 W,1e-6·Qscale)`；几何根区间 `≤1e-6 m` | 热平衡等数值求解的草案门槛 |
| `TOL-PROP` | 数据节点精确回返；区间插值 `rtol≤1e-12` 相对指定插值算法 | 物性查询算法，不代表原数据准确度 |
| `TOL-PUB` | 不优于原文最后一位、扫描/OCR分辨率和原作者误差声明 | 文献黄金值 |
| `TOL-BB` | 数字化误差至少为显示末位的半个单位；模型验收阈值尚待批准 | 成熟软件复现；不得转作科学容差 |

若模型不确定度远大于数值容差，显示精度由模型/输入不确定度控制，不能引用 `TOL-ID/TOL-NUM` 增加有效数字。

### 0.5 本草稿使用的来源缩写

`CODATA22`、`IAPWS95/IF97`、`W28`、`N09`、`L85`、`RG12`、`GB8175`、`CHAT`、`WB-FINAL`、`SCREEN-1/2` 沿用正式计算依据和审计报告的来源 ID。`DER-GEO`、`DER-EM`、`DER-CIRCUIT`、`DER-ENERGY`、`DER-HYD`、`DER-THERM` 是需要保存推导页并独立签字的项目推导占位 ID；在签字前科学状态不高于 `needs_verification`。

---

## A — Shared Material & Physical Properties

### A-01 — 温变物性查询与插值

- **Status / method type:** `not_approved / specification_candidate`; `numerical`。
- **Purpose:** 在已选材料、状态和数据版本内返回统一 SI 物性及其来源、不确定度和插值血缘。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `material_id` | — | 1 | 是 | 无 | 已存在记录 | 牌号/状态完全匹配 | approved/candidate dataset |
| `property_id` | `y` | 依属性 | 是 | 无 | 该物性维度正确 | 数据表已定义 | dataset |
| `state.temperature` | `T` | K | 是 | 无 | `T>0` | 数据节点包络内 | case |
| `state.frequency/field/pressure/...` | `f,H,p,...` | SI | 条件 | 无 | 各自物理有效 | 数据声明依赖时必须给 | case/dataset |
| `interpolation_id` | — | 1 | 否 | `piecewise_linear` | 已注册枚举 | 与属性记录一致 | approved config |

- **Outputs:** `property_snapshot`：SI 值、实际邻点、数据版本、有效域、插值法、不确定度、外推距离；量级由材料决定，不设跨材料通用范围。
- **Equation:** 区间内 `y=y_i+(y_{i+1}-y_i)(T-T_i)/(T_{i+1}-T_i)`；其他自变量按经批准的分段策略。正值属性的对数插值须另立方法版本。
- **Assumptions / applicability:** 数据点、材料状态和自变量充分；不跨 Curie、相变或数据分段做无审查平滑。
- **Sequence:** 解析记录 → 校验维度/状态 → 定位区间 → 调用记录指定插值 → 传播不确定度/血缘 → 返回不可变快照。
- **Dependencies:** 版本化材料数据、单位注册表、外推政策。
- **Warning predicates:** `outside_domain→insufficient_data`；缺 `H/f/p`；跨相变；状态/牌号不匹配；表中非物理负值；数据版本未批准。
- **Validation:** `MAT-P-001` 节点回返及中点线性插值，`TOL-PROP`，`specified_not_run`（首批数据集未建立）；`MAT-P-002` 域外必须阻断，精确状态匹配，`specified_not_run`。
- **Source refs:** 各属性记录自己的页/表/式；契约来自 `DER-ENERGY` 与正式 A-01；没有统一数值来源可替代逐属性来源。

### A-02 — 水物性

- **Status / method type:** `not_approved / insufficient_data`（接口已闭合，具体库未选型验证）；`numerical`。
- **Purpose:** 由水温和绝对压力返回冷却所需 `ρ,cp,μ,k,Tsat`，避免固定常温常数跨域。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `water.temperature` | `T` | K | 是 | 无 | `T>0` | 所选 IAPWS release 有效区 |
| `water.pressure_abs` | `p` | Pa | 是 | 无 | `p>0` | 所选 region 有效区 | case |
| `phase_requirement` | — | 1 | 否 | `single_phase_liquid` | 已注册相态 | 液态冷却模型 | design |

- **Outputs:** `ρ[kg/m³],cp[J/(kg·K)],μ[Pa·s],k[W/(m·K)],Tsat[K]` 和 region/status；常温液水数量级分别约 `10³,10³,10⁻³,10⁰`，只作数量级检查。
- **Equation:** 由批准的 IAPWS-95/IF97 实现查询；`cp=4180,ρ=1000` 只能是显式 `legacy_constant_profile`，不是此方法默认。
- **Assumptions / applicability:** 已知绝对压力、单相水；混合物/乙二醇不适用。
- **Sequence:** 校验 `T,p` → 判相区 → 查询属性 → 比较 `T` 与 `Tsat` → 返回快照。
- **Dependencies:** A-01 数据封装、IAPWS 实现和版本。
- **Warning predicates:** 压力未知；两相/超出 release；接近饱和；使用 legacy 常数超过批准常温窗口。
- **Validation:** `MAT-W-001` IAPWS 官方节点对照，容差按官方 release，`planned_blocked`（实现未选）；`MAT-W-002` 饱和边界状态，`planned_blocked`。
- **Source refs:** `IAPWS95/IF97`，具体 release/表格/软件版本待登记。

---

## B — Coil Geometry & Inductance

### B-01 — 几何规范化

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 将原始内外径、匝中心、截面和引线定义转换为唯一电流路径几何；消除 `N p`、`(N-1)p`、包络高度和 `L1` 一符多义。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.turn_count` | `N` | 1 | 是 | 无 | 整数 `N≥1` | 所有几何 |
| `coil.turn_center_z[]` | `z_i` | m | 推荐 | 无 | 有限、单调可排序 | 离散方法直接使用 | drawing/measurement |
| `coil.revolution_count` | `Nrev` | 1 | 路径法必填 | 无 | `Nrev>0`，可含端部部分周 | 圆柱螺旋段 | drawing |
| `coil.helix_axial_advance` | `Δz` | m | 路径法必填 | 无 | 有限；符号表方向 | 均匀螺旋段 | drawing |
| `coil.inner/outer_diameter` | `Di,Do` | m | 至少一组充分 | 无 | `Do>Di>0` | 圆柱单/多层 | case |
| `conductor.radial/axial_size` | `d_rad,d_ax` | m | 是 | 无 | `>0` | 对应实际截面 | case |
| `lead/bus_geometry` | — | m | 可选 | 无 | 非负长度 | 若省略只给下界 | drawing |

- **Outputs:** `a,D,b_cc,b_env,p_i,Nrev,Δz,d_rad,d_ax,t_layer,z_i` 及 `b/D,p/dc,dc/D`；长度数量级依设备，不设通用默认。
- **Equation:** 若只给均匀匝中心且 `N>1`，`p=(z_N-z_1)/(N-1)`、`b_cc=z_N-z_1`、`b_env=b_cc+d_ax`。几何中心候选 `Dmean=Di+d_rad=(Di+Do)/2`，但高频电流质心另标未知。`Nrev` 与 `N` 不强制相等；必须由实际起止路径映射。
- **Assumptions / applicability:** 圆柱轴线和截面方向定义明确；测量基准一致。
- **Sequence:** 单位归一 → 几何一致性方程 → 建立匝中心/路径 → 派生长度和无量纲比 → 输出歧义清单。
- **Dependencies:** 单位层、案例字段映射；无物性依赖。
- **Warning predicates:** `N=1` 却调用需要 `b>0` 的电流片；`Np` 与匝中心包络冲突；`Di+d_rad≠(Di+Do)/2` 超测量容差；多层误标单层；导体相交；电流中心未知。
- **Validation:** `GEO-001` 均匀 23 匝中心数组验证 `b_cc=(N-1)p`，`TOL-ID`，`specified_not_run`；`GEO-002` `Nrev/Δz` 螺旋端点闭合，位置误差 `≤1e-12 m`，`specified_not_run`；BB 字段映射均为 `historical_exposed_reference`。
- **Source refs:** `DER-GEO`；截图字段映射 `SCREEN-1/2,WB-FINAL` 仅作案例来源。

### B-02 — 轴向填充系数

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 复现并清楚命名成熟软件的轴向几何覆盖率，避免把它称作电磁耦合系数。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 同尺寸单层匝 |
| `conductor.axial_size` | `d_ax` | m | 是 | 无 | `>0` | 截面方向明确 |
| `coil.fill_reference_length` | `Lfill` | m | 是 | 无 | `>0` | 必须记录 `b_env` 或软件字段定义 |

- **Outputs:** `k_fill_axial`，无量纲，物理覆盖率期望 `0<k≤1`；解释为投影覆盖，不是体积填充或 `k=M/√(L1L2)`。
- **Equation:** `k_fill_axial=N d_ax/Lfill`。
- **Assumptions / applicability:** 匝在轴向无重叠，所有匝相同；对倾斜/异形截面只作投影定义。
- **Sequence:** 取 B-01 已确认长度语义 → 计算 → 范围检查。
- **Dependencies:** B-01。
- **Warning predicates:** `k>1→invalid_input`；`Lfill` 语义未知；不同截面/多层却直接调用。
- **Validation:** BB-01 `0.8`、BB-02 `0.695389`，误差不超过目标显示末位半单位，`executed_pass/historical_exposed_reference`。
- **Source refs:** `SCREEN-1/2`（字段复现）；`DER-GEO`（定义）。

### B-03 — 理想长螺线管

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 提供无限长电流片极限和量级检查，不作普通有限长实物默认。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_radius` | `a` | m | 是 | 无 | `a>0` | 圆柱电流片 |
| `coil.sheet_length` | `b` | m | 是 | 无 | `b>0` | 只在 `b/D` 足够大时近似实物；阈值待批准 |
| `coil.turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 连续均匀安匝 |
| `core.relative_permeability` | `μr` | 1 | 否 | `1`（仅空气芯显式） | `μr>0` | 当前仅均匀线性介质 |

- **Outputs:** `L_inf[H]>0`，项目案例通常为 µH 级但不设通用范围；仅解释为长线圈极限。
- **Equation:** `A=πa²`；`Linf=μ0 μr N²A/b`。
- **Assumptions / applicability:** 无限长、均匀电流片、均匀线性芯、无引线/工件/截面/漏磁端部。
- **Sequence:** B-01 几何 → A 常数/介质 → 计算 → 与有限长法作极限比。
- **Dependencies:** B-01、A-01/CODATA22。
- **Warning predicates:** `b=0`；`N=1,b_cc=0`；有限长却作为主结果；铁磁非线性。
- **Validation:** `EM-L-001` 扫描 `b/D=2,5,10,20`，要求 B-04 `L/Linf` 单调趋近 1，具体物理容差以 L85 对照；`specified_not_run`。量纲/缩放 `L∝N²a²/b` 用 `TOL-ID`，`specified_not_run`。
- **Source refs:** `N09`（长线圈基准关系）、`DER-EM`。

### B-04 — Nagaoka/Lundin 有限长电流片

- **Status / method type:** `not_approved / specification_candidate`; `analytical`（Lundin 闭式近似）。
- **Purpose:** 给单层圆柱均匀电流片的有限长空芯电感科学基线。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_radius` | `a` | m | 是 | 无 | `a>0` | 圆柱薄电流片 |
| `coil.sheet_length` | `b` | m | 是 | 无 | `b>0` | 密绕/多匝基线；无批准的硬 `N,p/d` 阈值 |
| `coil.turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | `N=1` 实物不适用，返回 `not_applicable` |

- **Outputs:** `L_sheet[H]>0`,`K_N=L_sheet/Linf`，通常 `0<K_N<1`；解释为电流片，不代表粗管螺旋精度。
- **Equation:** 完整使用正式 B-04 的 Lundin 式(9)–(12)，按 `2a≤b`/`2a>b` 分支；不得再乘第二次 Nagaoka 系数。
- **Assumptions / applicability:** 无限薄、均匀圆柱面安匝；无节距、引线、有限截面、邻近、工件和分布电容。
- **Sequence:** B-01 → 检查电流片适用性 → 分支计算 → `0<K≤1`/长极限 → 与 B-05/B-07 比较。
- **Dependencies:** B-01、B-03、CODATA22。
- **Warning predicates:** 少匝/大节距/粗管；平均电流路径不确定；分支结果差超过论文近似误差；被再次乘 `K_N`。
- **Validation:** `EM-L-003` `x=0,0.25,1` 的 `f1/f2` 按 L85 最后位容差，`executed_pass_numeric/source_rounding_pending`；`EM-L-006` 四几何值绝对容差 `5e-12 H`，`executed_pass`；分支点示例差约 `2.58 ppm`，容差 `≤3e-6 relative`，`executed_pass`；`EM-L-001` 极限 `specified_not_run`。
- **Source refs:** `N09`、`L85` PDF/式(9)–(12)，页码沿 `EM_LITERATURE_AUDIT.md`；`CODATA22`。

### B-05 — Wheeler 1928 单层快速式

- **Status / method type:** `not_approved / specification_candidate`; `engineering_correlation`。
- **Purpose:** 对原几何范围的单层线圈作快速工程对照和黑箱候选比较。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_radius` | `a` | m | 是 | 无 | `a>0` | 单层圆线圈 |
| `coil.winding_length` | `b` | m | 是 | 无 | `b>0` | 式(2) 1%声明：`b>0.8a` |
| `coil.turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 少匝/大节距精度下降 |

- **Outputs:** `L_Wheeler[H]>0`；预期与电流片同量级，误差以原文和方法比较显示。
- **Equation:** 边界显式换算到 inch 后 `L[µH]=a_in²N²/(9a_in+10b_in)`；历史短式 `a²N²/(8a+11b)` 另立 reference-only 子方法，不自动切换。
- **Assumptions / applicability:** Wheeler 原文单层几何；`b>0.8a` 只是式(2) 约1%声明域，不是 Wheeler/Nagaoka 开关。
- **Sequence:** B-01 → SI→inch → 公式 → µH→H → 域检查 → 并列比较。
- **Dependencies:** B-01、单位注册表。
- **Warning predicates:** 直径代入半径式；mm 直接代英寸式；`b≤0.8a`；少匝/大节距/粗管；结果再乘 Nagaoka。
- **Validation:** `EM-L-002` 英寸原式与 SI 包装 `TOL-ID`，`specified_not_run`；`EM-L-006` 四值绝对容差 `5e-12 H`，`executed_pass`；W28 声明域比对 `specified_not_run`。
- **Source refs:** `W28` PDF 2 式(2)、PDF 3 式(3)。

### B-06 — Wheeler 多层式

- **Status / method type:** `not_approved / partial_specification`; `engineering_correlation`。
- **Purpose:** 仅为真正均匀多层绕组提供历史快速估算；不把单层导体厚度误判为多层。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.mean_radius` | `a` | m | 是 | 无 | `a>0` | 均匀多层 |
| `coil.axial_length` | `b` | m | 是 | 无 | `b>0` | 原式几何定义 |
| `coil.radial_build` | `t` | m | 是 | 无 | `t>0` | `layer_count≥2` |
| `coil.turn_count/layers` | `N,nlayer` | 1 | 是 | 无 | 整数 `N≥1,nlayer≥2` | 匝分布近似均匀 |

- **Outputs:** `L_Wheeler_multilayer[H]>0`，仅快速估算；无通用批准精度。
- **Equation:** inch/µH 原式 `L=0.8a²N²/(6a+9b+10t)`，边界双向换算。
- **Assumptions / applicability:** 多层均匀绕组、原式定义匹配；粗单层铜管不适用。
- **Sequence:** B-01 层结构 → 单位换算 → 公式 → 域/层数检查。
- **Dependencies:** B-01、单位注册表。
- **Warning predicates:** `nlayer<2→not_applicable`；径向导体厚度误作 `t`；层间半径/匝数极不均匀。
- **Validation:** `EM-L-ML-001` 原单位包装 `TOL-ID`，`specified_not_run`；原文黄金例尚未登记，故生命周期保持 partial。
- **Source refs:** `W28` 多层出处页/式尚需在主来源注册中精确登记；当前不得仅引二手公式。

### B-07 — 离散同轴圆环求和

- **Status / method type:** `not_approved / specification_candidate`; `numerical`。
- **Purpose:** 为少匝、大节距提供逐匝自感和互感基线，避免把连续电流片当真实离散绕组。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `turn.radius[]` | `a_i` | m | 是 | 无 | 全部 `>0` | 同轴平面圆环 |
| `turn.axial_position[]` | `z_i` | m | 是 | 无 | 有限 | 同轴、互不重合 |
| `conductor.round_radius` | `r_c` | m | 自感式必填 | 无 | `0<r_c<a_i` | 细实心圆线、`r_c/a≪1`；硬阈值待批准 |
| `current_distribution` | — | 1 | 是 | 无 | 枚举 | 当前仅均匀截面自感常数 |

- **Outputs:** `L_total,Lself_i,Mij[H]`，应有限且总电感正；项目矩阵为 µH 级。
- **Equation:** `L=ΣLi+2ΣMij`；`Mij` 使用完全椭圆积分式；当前细实心圆线 `Li≈μ0a[ln(8a/rc)-7/4]`。`i=j` 禁止调用互感式。
- **Assumptions / applicability:** 每匝平面同轴圆环；当前自感常数不适用于空心粗管、矩形管、强趋肤或真实连续螺旋。
- **Sequence:** B-01 匝数组 → 截面方法选择 → 各自感 → 各互感 → 对称求和 → 正定/收敛检查。
- **Dependencies:** B-01、椭圆积分数值库、截面自感子方法。
- **Warning predicates:** `i=j` 互感奇点；`r_c/a` 不小；匝相交；空心/矩形截面却使用 `-7/4`；引线缺失。
- **Validation:** `EM-L-005` 单匝有限/不 NaN，`specified_not_run`；`EM-L-006` 四值绝对容差 `5e-12 H`，`executed_pass`（独立 Simpson 复算）；`EM-L-004` Rosa/Grover Example 57，`TOL-PUB`，`planned_blocked`（CGS→SI 全链未签字）。
- **Source refs:** `RG12` PDF 6 式(1)、PDF 123/126–128；`DER-EM` SI 归一化待签字。

### B-08 — Simpson 数值积分

- **Status / method type:** `not_approved / reference_only`；`numerical`。
- **Purpose:** 教学/独立复核完全椭圆积分或其他批准积分，不作为独立电感物理模型。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `integrand_id` | — | 1 | 是 | 无 | 已注册可积函数 | 当前仅批准复核函数 |
| `limits` | `a,b` | 依变量 | 是 | 无 | `b>a` | 有限区间；端点奇异另处理 |
| `segment_count` | `n` | 1 | 是 | 无 | 偶整数 `n≥2` | 必须做 `n,2n,4n` |

- **Outputs:** 积分值、加密差、函数评估数；量级随被积函数。
- **Equation:** 复合 Simpson `h/3[f0+fn+4Σfodd+2Σfeven]`。
- **Assumptions / applicability:** 被积函数满足算法平滑性；`k→1` 的椭圆积分需变换或权威库。
- **Sequence:** 校验偶数 → `n,2n,4n` → 与库/高精度参考比较 → 报收敛，不升级物理置信。
- **Dependencies:** 数值工具、批准 integrand。
- **Warning predicates:** `n` 奇数；端点奇异；仅一次网格；数值收敛被表述成物理准确。
- **Validation:** `NUM-SIMP-001` 多项式三次以内机器精度，`TOL-ID`，`specified_not_run`；`NUM-SIMP-002` 椭圆积分对权威库 `rtol≤1e-10`（远离 `k=1`），`specified_not_run`。
- **Source refs:** 标准数值分析方法；具体教材来源尚未登记，故 reference-only。

---

## C — Inductance Comparison & Validation

### C-01 — 电感方法比较

- **Status / method type:** `not_approved / specification_candidate`; `numerical`（编排/统计）。
- **Purpose:** 在同一冻结几何上并列方法结果、方法域、差异和黑箱残差，不指定无证据的“真值”。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `normalized_geometry` | — | SI | 是 | 无 | B-01 有效 | 所选方法公共输入 |
| `method_ids[]` | — | 1 | 是 | 无 | 至少 2 个已注册方法 | 同一输出语义 |
| `reference_result` | `Lref` | H | 否 | 无 | `>0` | 只允许批准文献/测量/FEM/黑箱目标并标类型 |

- **Outputs:** 每法 `L/status/domain`、`ΔL`,`relative_difference`,`spread`、截图残差；预期差异可从 ppm 到数十%，不得预设接近。
- **Equation:** `spread=(Lmax-Lmin)/Lreference`；参考缺失时只给 pairwise 差，不伪造分母。
- **Assumptions / applicability:** 完全相同几何/物性/单位；黑箱残差与科学差异分栏。
- **Sequence:** 冻结输入 → 运行每法 → 保留失败状态 → 计算差异 → 应用草案警告 → 输出两轨证据。
- **Dependencies:** B-01、B-03–B-07、方法注册和证据注册。
- **Warning predicates:** 输入映射不同；参考参与拟合；`N≤10,p/dc>2,spread>3%` 目前只能标“项目阈值待批准”；把方法接近称为验证。
- **Validation:** `EM-L-006` 表中 12 个方法数值绝对容差 `5e-12 H`，`executed_pass`；`CMP-001` 一个方法 `not_applicable` 时仍保留状态，`specified_not_run`；所有 BB 残差案例状态为 `historical_exposed_reference`，无 sealed holdout。
- **Source refs:** 各被调用方法来源；`DER-EM` 比较指标；`SCREEN-1/2` 仅黑箱目标。

---

## D — Coil Electrical Parameters

### D-01 — 导体中心线长度

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 由真实螺旋和引线/母排路径得到电阻、质量及压降使用的导体总长，解决 `N` 周与 `(N-1)p` 端点矛盾。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_radius` | `a` | m | 是 | 无 | `a>0` | 圆柱均匀螺旋段 | B-01 |
| `coil.revolution_count` | `Nrev` | 1 | 是 | 无 | `Nrev>0` | 可含端部部分周 | drawing/B-01 |
| `coil.helix_axial_advance` | `Δz` | m | 是 | 无 | 有限 | 均匀螺距 | drawing/B-01 |
| `lead/bus.segment_lengths[]` | `ℓj` | m | 否 | 无 | 每段 `≥0` | 未给时只输出线圈段下界 | drawing/measurement |

- **Outputs:** `ℓhelix,ℓlead,ℓbus,ℓtotal[m]`，设备常为 m–百 m 级但无通用范围；解释为电流中心路径长度。
- **Equation:** `ℓhelix=√[(2πaNrev)²+Δz²]=Nrev√[(2πa)²+(Δz/Nrev)²]`；`ℓtotal=ℓhelix+Σℓj`。只有明确 `Nrev=N` 时才可写旧式 `N√[(2πa)²+p²]`。
- **Assumptions / applicability:** 圆柱均匀螺旋；非圆/多层按逐段 3D 路径积分。
- **Sequence:** B-01 路径 → 每段长度 → 汇总 → 与 `NπD` 下界/近似差比较。
- **Dependencies:** B-01。
- **Warning predicates:** `Nrev` 由 `N` 暗猜；引线未知；`Δz` 与匝中心跨度不一致；多层/异形却调用单段式。
- **Validation:** `GEO-LEN-001` 合成螺旋与三维端点距离，`TOL-ID`，`specified_not_run`；`Δz→0` 应得 `2πaNrev`，`TOL-ID`，`specified_not_run`。
- **Source refs:** `DER-GEO`。

### D-02 — 金属截面积与水力面积分离

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 计算 DC 导电截面积，并与冷却孔的水力面积/湿周严格分开。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `conductor.shape` | — | 1 | 是 | 无 | 注册枚举 | `solid_round,hollow_round,solid_rect,hollow_rect` | drawing |
| `outer_dimensions` | `do` 或 `w,t` | m | 是 | 无 | 全部 `>0` | 与 shape 匹配 | drawing/measurement |
| `inner_dimensions` | `di` 或 `wi,ti` | m | 空心必填 | 无 | `0<inner<outer` | 孔居中；偏心另建几何 | drawing |

- **Outputs:** `Ametal,Ahydraulic,Pwetted,Dh[m²,m,m]`；全部正；解释分别为导电金属和流道几何。
- **Equation:** 圆实心 `A=πdo²/4`；圆管 `Ametal=π(do²-di²)/4,Ah=πdi²/4,Dh=di`；矩形实心 `wt`；矩形管 `Ametal=wt-witi,Ah=witi,Dh=4Ah/Pwetted`。
- **Assumptions / applicability:** 理想截面、尺寸沿长度恒定；圆角/偏心/沉积须用实际 CAD 面积。
- **Sequence:** shape 分派 → 尺寸/嵌套校验 → 面积/湿周 → 正值检查。
- **Dependencies:** B-01 截面方向语义。
- **Warning predicates:** 内尺寸≥外尺寸；把 `Ah` 当 `Ametal`；壁厚不一致却用居中孔；未知圆角影响显著。
- **Validation:** `GEO-AREA-001` 四形状手算，`TOL-ID`，`specified_not_run`；WB-FINAL 矩形孔 `0.000704 m²` 为 `historical_exposed_reference/executed_pass`。
- **Source refs:** `DER-GEO`；`WB-FINAL` 仅案例。

### D-03 — DC 电阻

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 得到指定温度下导体本体及完整端口 DC 电阻，明确接头/母排是否计入。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `conductor.length` | `ℓ` | m | 是 | 无 | `ℓ>0` | 截面/材料沿程均匀；否则分段 | D-01 |
| `conductor.metal_area` | `A` | m² | 是 | 无 | `A>0` | D-02 有效 | D-02 |
| `material.resistivity_snapshot` | `ρe(T)` | Ω·m | 是 | 无 | `ρe>0` | 材料/温度匹配 | A-01 |
| `series_extra_resistances[]` | `Rj` | Ω | 否 | 空数组 | 每项 `≥0` | 已测/有来源 | measurement/case |

- **Outputs:** `Rconductor_dc=ρℓ/A`、`Rterminal_dc=Rconductor+ΣRj[Ω]`，项目常为 µΩ–mΩ/更高，实际由几何决定；分项解释避免重复损耗。
- **Equation:** 如上；非均匀温度/截面使用 `R=∫ρ[T(s)]/A(s) ds` 的另立数值子方法。
- **Assumptions / applicability:** 均匀温度、材料和截面；接头均为串联。
- **Sequence:** D-01/D-02/A 快照 → 本体电阻 → 加显式附加项 → 记录端口边界。
- **Dependencies:** A-01、D-01、D-02。
- **Warning predicates:** 用20 ℃电阻率算热态；接头未知；`Rj` 被同时纳入长度/测量；截面沿程变化。
- **Validation:** `ELEC-RDC-001` `R∝ℓ/A` 缩放和分项和式，`TOL-ID`，`specified_not_run`；标准件四线测量为 `planned_blocked`。
- **Source refs:** `DER-CIRCUIT`；铜物性逐属性来源待 A 数据包。

### D-04 — 铜导体趋肤深度

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 计算线性正弦稳态铜中的 `1/e` 场幅参考深度，为 AC 模型域判断服务。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `frequency` | `f` | Hz | 是 | 无 | `f>0` | 正弦稳态 | case |
| `copper.resistivity_snapshot` | `ρCu(T)` | Ω·m | 是 | 无 | `>0` | 状态匹配 | A-01 |
| `copper.relative_permeability` | `μr` | 1 | 是 | 无 | `>0` | 铜通常近1但不得隐藏 | A-01 |

- **Outputs:** `δCu[m]>0`；10 kHz 铜约 `10^-3 m` 数量级；解释为电磁幅值尺度，不是有效壁厚硬截断。
- **Equation:** `δ=√[ρ/(πfμ0μr)]`。
- **Assumptions / applicability:** 线性、均匀、良导体、正弦稳态、局部平面。
- **Sequence:** A 快照 → SI 校验 → 公式 → 与截面尺寸比 `t/δ,r/δ`。
- **Dependencies:** A-01、CODATA22。
- **Warning predicates:** `f≤0`；电阻率单位疑似 Ω·cm 未转换；热态用冷态ρ；把δ称热影响深度。
- **Validation:** `EM-S-001` `0.660828496 mm`、绝对容差 `1e-9 m`，`executed_pass`；`EM-S-002` SI 值 `0.711762543 mm` 同容差，`executed_pass`；截图 `0.711349 mm` 仅 `historical_exposed_reference`。
- **Source refs:** `DER-EM`，`CODATA22`；`SCREEN-1/2` 仅黑箱目标。

### D-05 — AC 电阻分级

- **Status / method type:** `not_approved / insufficient_data`；这是计算族，须拆子方法。
- **Purpose:** 在导体截面、频率和外场条件明确时估算/辨识 `Rac`；没有匹配模型时拒绝伪造邻近修正。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `Rdc/geometry/length` | — | Ω,SI | 是 | 无 | 有效 | 与子方法匹配 | D-01–D-04 |
| `frequency/material_state` | `f,T` | Hz,K | 是 | 无 | `f>0,T>0` | 子方法原域 | case/A |
| `field_exposed_surfaces` | — | 1 | 工程近似必填 | 无 | 非空 | 回流/邻近方向已知 | field model |
| `method_id` | — | 1 | 是 | 无 | 注册值 | 见下 | approved registry |

- **Outputs:** `Rac[Ω]`,`Rac/Rdc≥1`（被动均匀导体常见检查，不作所有测量硬律）、`Aeff[m²]`、未计邻近项；量级不可预设。
- **Equation:** 只有高频一阶候选 `Aeff≈2πroδ`、`Rac≈ρℓ/Aeff` 可记录为 `engineering_correlation`；孤立实心圆 Bessel/Kelvin、空心管、矩形管和 proximity 尚无批准方程。实测端口 AC 电阻应走 `measurement_identified` 子方法。
- **Assumptions / applicability:** 一阶式要求 `δ≪ro` 且作用表面明确；不可默认圆管内外周都导电。
- **Sequence:** shape/δ 比 → 子方法域匹配 → 无批准方法则 `insufficient_data` → 计算/辨识 → 与 Rdc/测量比较。
- **Dependencies:** A-01、D-01–D-04、回流/工件几何；邻近时需 FEM/测量。
- **Warning predicates:** 空心/矩形却调用实心圆；`δ` 与壁厚同量级；外场面未知；无来源 `Fprox`；将 `P/I²` 反算值标“预测”。
- **Validation:** `ELEC-RAC-001` Bessel/Kelvin 标准值 `planned_blocked`（方程/库未批准）；`ELEC-RAC-002` 高频极限趋于表面面积式 `planned_blocked`；真实线圈冷/热阻抗 `planned_blocked`。在完成前默认运行结果为 `insufficient_data`。
- **Source refs:** `RG12` PDF 172–187 候选；`DHT` 工程测量建议；`WB-FINAL image5/9` 只作恢复线索。

### D-06 — 电流密度与铜损

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 在明确 RMS 端口和电阻来源下输出 DC/有效表面电流密度与铜损。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `current_rms` | `I` | A | 是 | 无 | `I≥0` | 同一频率/端口 | case/solver |
| `Ametal` | `A` | m² | DC密度必填 | 无 | `>0` | D-02 | D-02 |
| `Aeff` | `Aeff` | m² | 高频密度条件 | 无 | `>0` | 仅 D-05 成功时 | D-05 |
| `Rac` | `Rac` | Ω | 铜损必填 | 无 | `≥0` | 同温度/频率/端口 | D-05/measurement |

- **Outputs:** `Jdc,J_eff[A/m²]`,`Pcu[W]`；通常大电流设备可很高，不设通用允许值；解释为平均量，不是局部热点。
- **Equation:** `Jdc=I/Ametal`；`Jeff=I/Aeff`；`Pcu=I²Rac`。
- **Assumptions / applicability:** RMS 正弦/等效基波定义；电阻包含的物理边界明确。
- **Sequence:** 端口/RMS 校验 → 面积/电阻血缘 → 计算 → 将 `Pcu` 传 H-01。
- **Dependencies:** D-02、D-05、F/G 端口电流。
- **Warning predicates:** 峰值当 RMS；Aeff 未批准；Rac 由同一 `Pcu` 反算造成循环；局部峰值被称平均值。
- **Validation:** `ELEC-PCU-001` 合成 `I,R` identity `TOL-ID`，`specified_not_run`；BB 铜损为 `historical_exposed_reference`，不得升级 Rac 模型。
- **Source refs:** `DER-CIRCUIT`；BB/工作簿只作输出血缘。

### D-07 — 线圈串联端口参数

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 对同一串联等效端口计算电抗、阻抗、Q 和分量电压，不混用网侧或谐振器件电压。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `series_resistance` | `Rs` | Ω | 是 | 无 | `Rs≥0` | 同频串联等效 | D/F/measurement |
| `series_inductance` | `Ls` | H | 是 | 无 | `Ls≥0` | 感性集中参数 | B/F/measurement |
| `frequency` | `f` | Hz | 是 | 无 | `f>0` | 正弦基波 | case |
| `current_rms` | `I` | A | 电压输出必填 | 无 | `I≥0` | 同端口 | case/solver |

- **Outputs:** `XL[Ω],Zcomplex[Ω],|Z|[Ω],Qs,UR,UX,Uterminal[V]`；解释为线圈串联端口。
- **Equation:** `ω=2πf`; `Z=Rs+jωLs`; `|Z|=√(Rs²+(ωLs)²)`; `Qs=ωLs/Rs`（`Rs=0` 时无穷/不定义）；`UR=IRs,UX=IωLs,U=I|Z|`。
- **Assumptions / applicability:** 线性正弦串联等效、RMS 同频。
- **Sequence:** 验证端口 → 复阻抗 → Q/电压分量 → 与拓扑层区别显示。
- **Dependencies:** B/F 的 `Ls`、D-05 的 `Rs`、G 的端口状态。
- **Warning predicates:** `Rs=0` 却输出有限 Q；峰值/RMS混用；把 `UX` 当网侧电压；谐振槽端口未定义。
- **Validation:** `ELEC-ZS-001` 合成 R/L 机器精度，`TOL-ID`，`specified_not_run`；BB-01/02 `I,Q,U≈IωL` 为 `executed_pass/historical_exposed_reference`。
- **Source refs:** `DER-CIRCUIT`。

---

## E — Workpiece Electromagnetic & Heating Parameters

### E-01 — 工件参考透入深度

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 给工件正弦稳态下的 `1/e` 电磁幅值尺度并保留温度/场强物性状态。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `frequency` | `f` | Hz | 是 | 无 | `f>0` | 正弦稳态 | case |
| `workpiece.resistivity_snapshot` | `ρw` | Ω·m | 是 | 无 | `>0` | 均匀材料 | A-01 |
| `workpiece.relative_permeability_snapshot` | `μr` | 1 | 是 | 无 | `>0` | 线性有效值并记录 `T,H,f` | A-01 |
| `characteristic_thickness/radius` | `t/R` | m | 警告判断必填 | 无 | `>0` | 几何可映射 | geometry |

- **Outputs:** `δw[m]`, `t/δ,R/δ` 和物性血缘；量级依材料/频率。
- **Equation:** `δ=√[ρ/(πfμ0μr)]`；半无限平面一皮深内焦耳功率比例 `1-e^-2`。
- **Assumptions / applicability:** 线性、均匀、各向同性良导体；正弦；局部半无限平面；忽略位移电流。
- **Sequence:** A 快照 → δ → 几何比 → Curie/薄壁/边缘警告。
- **Dependencies:** A-01、工件几何、CODATA22。
- **Warning predicates:** `t` 或 `R` 与数倍δ同量级；磁饱和/Curie；薄壁双面场；异形/端部；把δ称热影响深度。
- **Validation:** `EM-S-004` `8.717275e-3 m`、绝对容差 `1e-9 m`，`executed_pass`；`EM-S-003` μr 100→1 比值10、`TOL-ID`，`executed_pass`；截图为 `historical_exposed_reference`。
- **Source refs:** `DER-EM`；材料数据逐属性来源；二手论文错号不采用。

### E-02 — Curie 与温度扫描

- **Status / method type:** `not_approved / insufficient_data`; `numerical`。
- **Purpose:** 在加热温度节点更新 `ρ(T)`、`μr(T,H,f)` 和 δ，显式呈现 Curie 附近变化及不确定性。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `temperature_grid` | `Ti[]` | K | 是 | 无 | 全部 `>0`、有序 | 属性表包络内，Curie区加密 | case/solver |
| `frequency/field_state` | `f,H` | Hz,A/m | 是 | 无 | `f>0` | 磁数据对应条件 | case |
| `rho/mu datasets` | — | SI | 是 | 无 | 正值 | 同牌号/状态，有 Curie 区数据 | A-01 |

- **Outputs:** `ρ(Ti),μr(Ti),δ(Ti)` 曲线及情景带；不输出无数据支撑的高精度单曲线。
- **Equation:** 每节点调用 A-01 与 E-01；情景带分别运行 `μlow/nominal/high`，不平均成伪材料曲线。
- **Assumptions / applicability:** 数据为所选材料、场强和频率有效磁导率；温度节点足以解析过渡。
- **Sequence:** 取 Curie/相变分段 → 生成/校验网格 → 查询属性 → E-01 → 汇总不确定度。
- **Dependencies:** A-01、E-01、材料 Curie 数据。
- **Warning predicates:** 只有冷态单点；固定 μr 跨 Curie；材料 Curie 温度用通用700/760 ℃；数据外推；缺 H/f。
- **Validation:** `EM-S-003` 固定ρ下理论比例，`executed_pass`；真实牌号曲线 `planned_blocked`（材料数据包缺失）；在此之前运行返回 `insufficient_data`。
- **Source refs:** `S89` 模型范围证据；实际材料表来源待定。

### E-03 — 参考临界频率与穿透比

- **Status / method type:** `not_approved / partial_specification`; `engineering_correlation`。
- **Purpose:** 对实体圆柱按明确经验点 `δ=D/4` 给参考频率，而不宣称普适最优频率。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `workpiece.diameter` | `D` | m | 是 | 无 | `D>0` | 实体圆柱 |
| `rho_at_target_state` | `ρ` | Ω·m | 是 | 无 | `>0` | 目标温度/状态 | A-01 |
| `mu_r_at_target_state` | `μr` | 1 | 是 | 无 | `>0` | 有效线性值 | A-01 |
| `penetration_criterion` | `ΠD` | 1 | 否 | `2`（必须显式选择历史准则） | `>0` | 仅准则比较 | design |

- **Outputs:** `ΠD=D/(2δ)` 或在 `ΠD=2` 时 `fref[Hz]`；解释为经验参考点。
- **Equation:** 通用由 E-01 反解；`δ=D/4` 时 `fref=16ρ/(πμ0μrD²)`。工程单位只作边界显示：`4.05285e8 ρ[Ω·cm]/(μrD[cm]²)` 或 `405.285 ρ[µΩ·cm]/...`。
- **Assumptions / applicability:** 实体圆柱、目标状态物性；薄壁管不适用。
- **Sequence:** 锁定准则/物性温度 → SI 反解 → 频率/皮深互验 → 显示“非最佳频率”。
- **Dependencies:** A-01、E-01、工件几何。
- **Warning predicates:** Ω·cm 与 µΩ·cm 常数混用；薄壁；冷态物性用于热态；显示“推荐/最佳”而无工艺优化。
- **Validation:** `EM-F-001` SI 与两工程单位包装 `TOL-ID`，`executed_pass`（示例换算）；历史 image8 上/下限不是此方法，保持 `planned_blocked/reference_only`。
- **Source refs:** `M04` 经验点及单位冲突；`DER-EM` SI 反推。

---

## F — Coil–Workpiece / Equivalent Load

### F-01 — 理想变压器反射阻抗

- **Status / method type:** `not_approved / specification_candidate`; `analytical`。
- **Purpose:** 在 `R2,L2,M` 已知且线性集中参数成立时计算被动负载的反射电阻/电感。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `primary.resistance/inductance` | `R1,Lp` | Ω,H | 是 | 无 | `R1≥0,Lp>0` | 同频串联参数 | measurement/model |
| `secondary.resistance/inductance` | `R2,Ls` | Ω,H | 是 | 无 | `R2≥0,Ls>0` | 等效二次定义完整 | model/measurement |
| `mutual_inductance` | `M` | H | 是 | 无 | `|M|≤√(LpLs)` | 线性互感 | model/measurement |
| `frequency` | `f` | Hz | 是 | 无 | `f>0` | 正弦稳态 | case |

- **Outputs:** `Zin,Req,Rref,Leq,k`，其中被动模型 `Rref≥0,0≤|k|≤1`；量级由端口决定。
- **Equation:** `Zin=R1+jωLp+ω²M²/(R2+jωLs)`；`Rref=ω²M²R2/(R2²+(ωLs)²)`；`Leq=Lp-ω²M²Ls/(R2²+(ωLs)²)`；`k=M/√(LpLs)`。
- **Assumptions / applicability:** 线性、集中、正弦、二次等效可解释；公式不提供几何→`M,R2,Ls`。
- **Sequence:** 参数同频/被动检查 → k 范围 → 复数式 → 实虚部分解 → 极限/能量检查。
- **Dependencies:** B/D 的一次参数；二次/互感来自测量、限定解析或 FEM。
- **Warning predicates:** `|k|>1`；`Rref<0`；参数不同频/温度；将 `Leq/L0` 叫 k；几何参数缺失却猜 M。
- **Validation:** `EM-Z-001` 合成值与复数直接计算 `TOL-ID`、零互感/开路极限，`specified_not_run`；被动性属性测试 `specified_not_run`。
- **Source refs:** `DER-CIRCUIT` 标准双绕组推导，需独立签字；项目小图 image3/4 不作为该式来源。

### F-02 — 端口阻抗测量辨识

- **Status / method type:** `not_approved / specification_candidate`; `measurement_identified`。
- **Purpose:** 从同频 RMS 端口测量辨识串联 `Req,Leq`，并正确处理信息不足与测量不一致。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `voltage/current_rms` | `V,I` | V,A | 是 | 无 | `V≥0,I>0` | 同端口/同频 | measurement |
| `active_power` | `P` | W | 是 | 无 | 被动时 `0≤P≤VI`（考虑不确定度） | 同时间窗 | measurement |
| `frequency` | `f` | Hz | Leq必填 | 无 | `f>0` | 基波参数 | measurement |
| `reactive_sign/phase` | `sgnX/φ/Qr` | 1/rad/var | Leq必填 | 无 | 测量一致 | 区分感/容性 | measurement |
| `measurement_uncertainty` | `uV,uI,uP,uφ` | SI | 是 | 无 | `≥0` | 仪器/夹具完整 | calibration cert |

- **Outputs:** `|Z|,Req,X,Leq,Qs` 与不确定度；只有 `P,I` 时只输出 Req、Leq=`insufficient_data`。
- **Equation:** `|Z|=V/I`；`Req=P/I²`；`x2=|Z|²-Req²`；若 `x2` 在传播不确定度内小负，可钳0并警告，否则 `inconsistent_measurement`；`X=sgnX√x2`，感性 `Leq=X/ω`。
- **Assumptions / applicability:** 近正弦基波或明确全波定义；夹具/引线去嵌入；稳态同温度。
- **Sequence:** 元数据/不确定度 → 一致性 `P≤VI` → Req → X 信息充分性 → 传播不确定度 → 去嵌入/状态封装。
- **Dependencies:** 仪器、夹具模型、D-07 定义。
- **Warning predicates:** `P>VI` 超不确定度；`x2<0` 超容差；只有 P/I 却给 L；真实 PF 与 cosφ 混用；温度漂移。
- **Validation:** `EM-Z-002` 合成 `R,L` 恢复，数值 `TOL-ID`，`specified_not_run`；低Q噪声边界 `specified_not_run`；真实空载/冷/热态 `planned_blocked`。
- **Source refs:** `DER-CIRCUIT`；`DHT` 实际频率/装工件测量建议。

### F-03 — 成熟软件黑箱标定

- **Status / method type:** `not_approved / insufficient_data`; `calibrated_engineering_model`。
- **Purpose:** 在无法获得专有内部模型时建立版本化、域受限的软件兼容模型；不改变科学方法结果。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `software_id/version` | — | 1 | 是 | 无 | 非空 | 版本/配置已知 | screenshot metadata |
| `cases_calibration[]` | — | SI | 是 | 无 | 字段映射完整 | 已暴露案例只作校准候选 | SCREEN/CHAT/WB |
| `cases_sealed_holdout[]` | — | SI | 验证必填 | 无 | 模型冻结后新取得 | 输入包络覆盖 | future data |
| `feature/model_spec` | — | 1 | 是 | 无 | 物理约束/单位完整 | 冻结后不可看留出调参 | approved protocol |

- **Outputs:** 每输出预测、带符号误差、MAE/MAPE/max error、样本数、输入凸包/包络和 `reproduction_confidence`；不输出 `scientific_confidence=high` 因复现好。
- **Equation:** 不预先编造。允许最少参数、量纲正确、被动/单调约束候选；identity 派生列不计独立目标。
- **Assumptions / applicability:** 字段和软件版本稳定；域外直接 `out_of_domain`。
- **Sequence:** 冻结字段/案例暴露状态 → 分校准/密封留出 → 锁定模型 → 校准 → 一次性留出评估 → 版本冻结。
- **Dependencies:** B–G 科学特征、证据/案例注册、统计误差工具。
- **Warning predicates:** 同案拟合又验证；逐图魔法系数；软件版本未知；输入包络外；恒等式被算独立命中。
- **Validation:** BB-01/02/03 全为 `historical_exposed_reference`，不得标 sealed holdout；`BB-HOLDOUT-*` 为 `planned_blocked`（需要未来新截图）。在此之前最高状态只可 `multi_case_calibration`，当前无批准模型故运行 `insufficient_data`。
- **Source refs:** `CHAT,WB-FINAL,SCREEN-1/2` 仅数据；ADR-0001 双轨原则；模型公式待未来注册。

---

## G–J/I — 紧凑完整契约矩阵

以下 28 个 ID 使用本文件第 0 节的全局契约。为控制重复，列内按固定顺序表达：

- `Inputs`：`parameter_id(symbol)[SI]{required/default; physical range; method range; source basis}`；未写默认即无默认。
- `Outputs`：`parameter_id[SI]{expected magnitude / interpretation}`；“case-scaled”表示无通用量级，不允许据此设硬范围。
- `A/A域`：Assumptions / applicability。
- `Seq/Deps`：执行顺序；直接依赖。
- `Warn`：稳定 warning predicate 和失败状态。
- `Validation`：案例 ID；具体容差；运行状态。
- `Sources`：来源状态。`DER-* pending sign-off` 表示独立推导可审但尚未工程签字；绝不等同外部权威。

### G — Heating & System Electrical

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Validation / tolerance / status | Sources |
|---|---|---|---|---|---|---|---|---|
| **G-01** | `not_approved/specification_candidate`; `numerical`；批次工件从 `Ti` 到 `Tf` 的有用热 | `mass(m)[kg]{req;m>0;case}`; `Ti,Tf[K]{req;>0;Tf>Ti;case}`; `cp(T)[J/kg/K]{req;>0;A域;A-01}`; `phase/reaction_enthalpy[J/kg or J]{conditional;case/A}` | `Esens,Euseful[J]{≥0;case-scaled;控制体目标热}` | `Esens=m∫Ti^Tf cp(T)dT`; `Euseful=Esens+mΣΔhphase+Ereaction`；均匀批次、控制体明确；常cp仅批准窄温域 | 冻结物料/温程→A快照/焓积分→相变/反应→和式；Deps A-01、数值积分 | `Tf≤Ti invalid_input`; 跨相变无焓；cp外推；炉体/流体边界混合 | `TH-E-001` 常cp解析积分 `TOL-ID`, `specified_not_run`; 温变表积分/相变节点 `TOL-NUM`, `specified_not_run` | `DER-ENERGY pending sign-off`; 物性逐项来源 |
| **G-02** | `not_approved/specification_candidate`; `numerical`；连续流工艺有用功率 | `mass_flow(ṁ)[kg/s]{req;>0;case}`; `hin,hout[J/kg]{preferred;hout≥hin;A/process}` 或 `T+cp+Δh{req}` | `Puseful[W]{≥0;case-scaled;物流焓增率}` | `Puseful=ṁ(hout-hin)=ṁ[∫cpdT+ΣΔhphase+Δhreaction]`；稳态单物流或显式多物流求和 | 各物流焓差→乘质量流→汇总；Deps A-01、G-01焓工具 | kg当kg/s；反应热符号/基准态不明；把启动炉体升温计稳态流功率 | `TH-E-002` 合成焓差 `TOL-ID`, `specified_not_run`; 裂解实际焓数据 `planned_blocked` | `DER-ENERGY`; 工艺数据待定 |
| **G-03** | `not_approved/partial_specification`; `numerical`；加热时间/温度轨迹 | `thermal_mass/cp(T){req;positive;A/case}`; `Pabs(T,t),Qloss(T,t),Pphase(T)[W]{req;来源明确}`; `T0,target[K]{req;>0}`; solver settings `{req}` | `T(t)[K],time_to_target[s],energy_residual[J]{case-scaled}` | `mcp(T)dT/dt=Pabs-Qloss-Pphase`；集总热容仅 Biot 通过；恒净功率才 `t=E/Pnet` | 建状态/事件→ODE→每步A/J/F负载更新→能量残差；Deps A,F,G-01,J | `Pnet≤0 target_unreachable`; Bi过大；跨Curie/相变仍单步常数；非收敛 | 常净功率解析对照 `rtol≤1e-6`, `specified_not_run`; 实测温升 `planned_blocked` | `DER-ENERGY`; 实验数据缺 |
| **G-04** | `not_approved/specification_candidate`; `analytical`；冻结功率边界和效率定义 | `Pgrid,Pinv,Pcoil,Pwp,Puseful,Pcu,Qloss[W]{conditional;≥0;同时间基准;measurement/model}` | `ηinv,ηcoil_wp,ηthermal,ηoverall[1]{0..1 被动}` 与缺失边界 | `ηinv=Pinv/Pgrid`; `ηcoil_wp=Pwp/Pcoil`; `ηthermal=Puseful/Pwp`; `ηoverall=Puseful/Pgrid`；仅边界一致时 | 选控制体→量命名→比值→守恒交叉检查；Deps F,G-01/02,J,D-06 | 分母0；效率>1超不确定度；总效率与分级效率重复乘；无功当损失 | `SYS-P-001` 合成链 `TOL-ID`, `specified_not_run`; 守恒属性 `specified_not_run` | `DER-ENERGY/CIRCUIT` |
| **G-05** | `not_approved/specification_candidate`; `analytical`；由工件需求和损耗求网侧输入功率 | `Puseful,Qloss_wp,Pcu,Pstray[W]{req/conditional;≥0}`; `ηmatching,ηinv,ηrect,ηother[1]{conditional;0<η≤1;measured/vendor}` | `Pwp_abs,Pcoil_terminal,Pgrid[W]{≥0;case-scaled}`；未知项清单 | `Pwp=Puseful+Qloss`; `Pcoil=Pwp+Pcu+Pstray`; `Pgrid=Pcoil/Πη` | 分边界求和→效率链→守恒；Deps G-04,J,D-06 | 未知损耗静默置0；效率边界重叠；`η=0`; 峰值/平均混合 | `SYS-P-002` 合成功率链 `TOL-ID`, `specified_not_run` | `DER-ENERGY`; 效率来源逐设备 |
| **G-06** | `not_approved/specification_candidate`; `analytical`；视在功率与真实 PF | `Vrms,Irms,P[SI]{req;≥0;同端口}`; `phase_count/topology{req}`; `ULL[V]{三相条件}` | `S[VA],PF[1]{0..1 被动}` | 单相/等效 `S=VI,PF=P/S`; 平衡三相 `S=√3 ULL IL`; 含谐波 PF仍用P/S | 端口/相制→S→PF→不确定度；Deps measurement/G topology | `P>S`超不确定度；cosφ冒充真PF；线圈端和网侧混用 | `ELEC-PF-001` 合成单/三相 `TOL-ID`, `specified_not_run` | `DER-CIRCUIT` |
| **G-07** | `not_approved/specification_candidate`; `analytical`；普通串联 RLC | `R[Ω]{req;≥0}`; `L[H],C[F],f[Hz]{req;>0}`; `port/RMS definition{req}` | `Zs[Ω],f0[Hz],C_for_f[F]{positive}` | `Z=R+j(ωL-1/ωC)`; `f0=1/(2π√LC)`；理想集中串联网络 | 拓扑验证→加载工作点L→Z/f0→元件应力另算；Deps F/D-07 | 未知拓扑；空载L代热态加载L不警告；并联/LLC误用；寄生忽略 | `ELEC-RLC-S-001` 谐振虚部 `≤1e-12 Ω` 合成例，`specified_not_run` | `DER-CIRCUIT` |
| **G-08** | `not_approved/partial_specification`; `analytical`；理想并联支路基线 | `R,L,C,f{req;positive}`; `branch topology{req}` | `Yp[S],Zp[Ω],f_characteristic[Hz]` | 当前仅理想并联 `Y=1/R+j(ωC-1/ωL)`；实际串联线圈损耗并联等效须另法 | 电路图→支路导纳→求和→特征频率；Deps F/D | 把串联损耗R直接当并联R；复用串联电流/电压；拓扑未知 | `ELEC-RLC-P-001` 理想虚部零 `TOL-ID`, `specified_not_run`; 实际电源 `insufficient_data` | `DER-CIRCUIT`; 当前仅理想基线 |
| **G-09** | `not_approved/insufficient_data`; `analytical` 或 `numerical`（须按拓扑拆法）；LLC/多谐振 | `complete_netlist,ports,Ls,Lm/Leq,Cs/Cp,Req,drive_harmonics{all req}` | `Zin,gain,branch stresses,characteristic frequencies` | 不设通用式；张金龙论文仅其图2.6、FHA、高Q条件的特定候选 | 识别拓扑→精确复阻抗→选择FHA/谐波→域检查；Deps F,D,G-06 | 无电路图；低Q调用高Q式；把论文水杯值通用化；FHA无标签 | 论文原例复算 `planned_blocked`; 未批准前返回 `insufficient_data` | 特定论文页/式待注册；无通用来源 |
| **G-10** | `not_approved/partial_specification`; `analytical`；匹配变压器理想阻抗变换 | `Zsecondary[Ω]{req}`; `turns_ratio(n)[1]{req或待求;>0}`; `port voltage/current/RMS/topology{req}` | `Zprimary=n²Zsecondary`, `Vp/Vs,Ip/Is` | 理想变压器；实际铜损、漏感、磁化和整流系数另建模型 | 端口/变比方向→理想换算→实际未计项；Deps F/G topology | n方向混淆；1.35/1.414跨拓扑；工作簿式当通用；磁芯饱和不计 | `ELEC-XFMR-001` 功率/阻抗恒等 `TOL-ID`, `specified_not_run`; BB变比 `historical_exposed_reference` | `DER-CIRCUIT`; 工作簿只作黑箱 |

### H — Cooling Water

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Validation / tolerance / status | Sources |
|---|---|---|---|---|---|---|---|---|
| **H-01** | `not_approved/specification_candidate`; `analytical`；定义进入水冷控制体的热负荷 | `Pcu,Qpickup_to_coil,Pmag,Pother[W]{req/conditional;≥0;measurement/model}`; `design_margin{optional;无默认;来源}` | `Qcool[W]{≥0;case-scaled}` 与逐项来源/未计项 | `Qcool=Pcu+Qpickup_to_coil+Pmag+Pother`；裕量须作为显式项/场景，不能重复 | 选水路控制体→分项→去重→汇总；Deps D-06,J-05/06,measurement | 把全部炉体环境热损、工件有用热、无功或整厂损耗加入；未知拾取当0 | `TH-CONTROL-001` 分项和式 `TOL-ID`, `specified_not_run`; 项目边界 `planned_blocked` | `DER-ENERGY`; 实际负荷来源待测 |
| **H-02** | `not_approved/specification_candidate`; `analytical`；由负荷和允许温升求水质量/体积流量 | `Qcool[W]{req;≥0}`; `Tin,Tout[K]{req;>0;Tout>Tin}`; `cp,ρ{req;>0;A-02}`; `pabs[Pa]{req;>0}` | `ṁ[kg/s],Vdot[m³/s]{≥0;case-scaled}` | `ṁ=Q/(cpΔT)`; `Vdot=ṁ/ρ`；单相稳态平均能量平衡 | A-02平均状态→质量流→体积流→饱和检查；Deps H-01,A-02 | `ΔT≤0`; 压力未知；近饱和；固定4180/1000跨域；校准倍数伪装理论 | `TH-C-001` `35.4662 L/min` 绝对 `≤0.01 L/min`, `executed_pass`; `TH-C-002` 三数绝对 `≤0.2%`, `executed_pass`; BB水量均 exposed | `DER-ENERGY`; `IAPWS` |
| **H-03** | `not_approved/specification_candidate`; `analytical`；支路面积、速度和水力直径 | `Vdot_branch[m³/s]{req;≥0}`; `Ah[m²],Pwetted[m]{req;>0;D-02}`; `branch_count/split{conditional;有依据}` | `v[m/s],Dh[m]{≥0}` | `v=Vdot/Ah`; `Dh=4Ah/Pwetted`；均分仅同阻力平衡支路 | 管网分流→每支路面积→v,Dh；Deps D-02,H-02/H-05 | 总流量直接进单支路；kg/s标m/s；支路不对称仍均分；速度合格带无来源 | `TH-C-001` `1.88154 m/s` `≤0.002`, `executed_pass`; WB J27纠错 `0.7023 m/s` exposed/error regression | `DER-HYD`; `WB-FINAL` 仅错误回归 |
| **H-04** | `not_approved/insufficient_data`; `engineering_correlation`；Re/Pr及经批准水侧 Nu/h | `ρ,v,Dh,μ,cp,kf[SI]{req;positive;A/H}`; `geometry,entry_length,heat_bc,curvature{req}`; `Nu_method_id{req}` | `Re,Pr,Nu[1],h[W/m²/K]` | `Re=ρvDh/μ`; `Pr=cpμ/k`; `h=Nu k/Dh`；**尚无批准通用Nu相关式** | 无量纲量→匹配 method/domain→无方法则不足→h；Deps A-02,H-03 | Re≤2300调用湍流；弯管/入口/高热流超域；平均h宣称局部壁温安全 | Re/Pr identity `TOL-ID`, `specified_not_run`; GB8175候选原例 `planned_blocked`; 当前 h 返回 `insufficient_data` | `GB8175`候选表A.2；高热流适用仍需试验 |
| **H-05** | `not_approved/insufficient_data`; `engineering_correlation/numerical`（须拆）；压降和并联管网 | `L,Dh,ρ,v,εrough,ΣK,Δz[SI]{req/conditional}`; `friction_method,pump_curve,network{req}` | `Δp_friction,local,elevation,total[Pa]`, branch flows | `Δp=f_D(L/Dh)ρv²/2+ΣKρv²/2+ρgΔz`；明确 **Darcy** 因子；因子算法/过渡区未批准 | 单支路因子→各压降→并联同端压差求解→泵交点；Deps A-02,H-03 | Darcy/Fanning混淆4倍；粗糙度/K/泵曲线缺；过渡区暗选；无数据仍报压降 | `TH-C-004` `planned_blocked`（需冻结摩擦算法/标准例）；缺参必须 `insufficient_data` 的测试 `specified_not_run` | `DER-HYD pending`; 摩擦因子权威来源待选 |
| **H-06** | `not_approved/partial_specification`; `analytical`（警告编排）；沸腾/结垢/腐蚀/空化门禁 | `Tin,Tout,wall_temp,pabs,Tsat,water_quality,NPSHa/NPSHr,velocity{conditional;SI}` | 风险状态/缺失数据，不输出“安全”标量 | 比较和数据充分性规则；具体裕量/水质/OEM阈值未批准 | 收集状态→A-02饱和→水质/OEM/NPSH→严重度；Deps A-02,H-03–05 | 壁温/压力/NPSH未知却判安全；Tout代局部壁温；固定水速带当标准 | `COOL-WARN-001` 缺数据应 warning/insufficient `specified_not_run`; 饱和边界 `planned_blocked` | IAPWS + OEM/水质/泵资料待取得 |
| **H-07** | `not_approved/specification_candidate`; `analytical`；跨报告/回路能量守恒 | `Qclaimed[W],Vdot[m³/s],Tin,Tout,ρ,cp{req}`; `control_volume/time_basis{req}` | `Q_from_water[W],ΔT_required[K],residual[W/%]` | `Qwater=ρVdot cpΔT`; 反解各变量；同一控制体/稳态 | 字段边界→A属性→正算/反算→残差→冲突说明；Deps A-02,H-02 | 不同回路/时段强比；把不一致自动修正；局部热峰当平均 | `TH-C-002`: `561.962 L/min,188.1 kW,83.2536 K`, `≤0.2%`, `executed_pass` | `DER-ENERGY`; 历史报告只作冲突案例 |

### J — Reusable Thermal-Loss Components

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Validation / tolerance / status | Sources |
|---|---|---|---|---|---|---|---|---|
| **J-01** | `not_approved/specification_candidate`; `analytical/numerical`（常k/变k拆法）；圆筒径向导热 | `ri,ro,L[m]{req;ro>ri>0,L>0}`; `Ti,To[K]{req;>0}`; `k or k(T)[W/m/K]{req;>0;A}`; multilayer radii | `Rcond[K/W],Qcond[W],interface T[K]` | 单层 `Q=2πLk(Ti-To)/ln(ro/ri)`；多层 `R=Σln(ri/r{i-1})/(2πkiL)`；1D稳态 | 几何层序→A k→热阻→Q/界面→温限；Deps A-01 | GB式(7)重复用D0；半径/直径混；k外推/湿态缺；端桥未计 | `TH-I-004` 两层和式 `TOL-ID`, `specified_not_run`; 单层历史三案纳入I-01/02 | Fourier/`DER-THERM`; `GB8175`疑点保留 |
| **J-02** | `not_approved/insufficient_data`; `engineering_correlation`；外表面对流 | `geometry,orientation,Lc,Ts,Ta,fluid props,wind vector[SI]{req}`; `hc_method_id{req}` | `hc[W/m²/K],Qconv[W]` | `Q=hc A(Ts-Ta)`；**hc相关式尚未按所有几何冻结** | 状态/无量纲→相关式匹配→域检查→Q；Deps A-01, geometry | 固定h无来源；姿态/风向缺；Gr/Re域外；当前师傅外表面式用于环隙 | 牛顿骨架 `TOL-ID`, `specified_not_run`; GB相关式原例 `planned_blocked`; 无method返回不足 | `GB8175`表A.1候选；具体方法待批准 |
| **J-03** | `not_approved/specification_candidate`; `analytical`；辐射到大环境/同心两灰面 | `T1,T2[K]{req;>0}`; `ε1,ε2[1]{req;0<ε≤1}`; `A1,A2[m²]{req;>0}`; `view/configuration{req}` | `Qrad[W]{符号随温差}`, `ε/network factor` | 大环境 `εσA(Ts⁴-Tsur⁴)`；长同心 `σA1(T1⁴-T2⁴)/[1/ε1+(A1/A2)(1/ε2-1)]` | 几何网络选择→K温标→Q→极限；Deps A表面、geometry,CODATA | ℃四次方；等面积εeff用于面积比不同；视因数/开口忽略 | `TH-J-001` Ts=Tsur零/黑体极限 `TOL-ID`, `specified_not_run`; 历史保温数值随I执行 | Stefan–Boltzmann/`DER-THERM`; 精确辐射网络来源待页码登记 |
| **J-04** | `not_approved/specification_candidate`; `analytical`；线性化辐射与同面积表面系数 | `ε,Ts,Tsur,hc{req;域同J-02/03}` | `hr,hs[W/m²/K]` | `hr=εσ(Ts⁴-Tsur⁴)/(Ts-Tsur)`；等温极限 `4εσT³`; `hs=hc+hr` 仅同面积/边界 | J-02/03结果→极限保护→相加；Deps J-02,J-03 | `0/0`; 不同面积/边界系数相加；用线性hr跨大温区却不更新 | 等温极限与直接辐射 `rtol≤1e-10`, `specified_not_run` | `GB8175 A.2` + `DER-THERM` |
| **J-05** | `not_approved/insufficient_data`; `engineering_correlation`；线圈—保温同心/近同心环隙换热 | `Dinner,Douter,L,gap,orientation,open/closed,T1,T2,gas props,ε,coverage/view[SI]{all req}`; `annulus_Nu_method{req}` | `Ra,Nu,hgap,Qconv,Qrad[SI]`, domain status | `Ra=gβ|ΔT|Lc³/(να)`; `h=Nu k/Lc`; 辐射J-03；**匹配的同心圆柱 Nu 尚待专门审定** | 几何/膜温物性→Ra/Pr→method/domain→h/Q→辐射→拾取；Deps A,J-03 | `Nu=.59Ra^.25`外表面式直用；冷却水温当铜表温；开口烟囱流；固定物性/视因数 | `TH-J-002` 师傅值只 `historical_exposed_reference`; 科学 annulus 例 `planned_blocked`; 当前 h返回不足 | `WB-FINAL image12-14`仅历史；匹配文献待研究/批准 |
| **J-06** | `not_approved/specification_candidate`; `analytical`；同一控制体总稳态热损 | `Qconv,Qrad,Qends,Qbridges,Qopenings[W]{req/conditional;可为有符号但方向统一}`; `control_volume{req}` | `Qloss_total[W]`, missing-items | `Qtotal=ΣQi`，禁止重叠面积/路径重复 | 画控制体→列路径/面积→去重→和式/守恒；Deps J-01–05 | 同一路径串联却相加热流；热桥/端损未知当0；Qpickup与环境损失混同 | `THERM-BAL-001` 合成网络和式 `TOL-ID`, `specified_not_run`; WB 102 vs9.972kW exposed conflict | `DER-THERM/ENERGY` |
| **J-07** | `not_approved/partial_specification`; `numerical`；瞬态热损调用与集总判据 | `T(t),geometry,h,k,ε,thermal mass[SI]{req}` | `Qloss(t)[W],Bi[1]` | 每时步调用J-组件；`Bi=hLc/ksolid` 筛查集总；无批准阈值前不自动判精确 | 状态→A物性→Bi→J损失→交G-03；Deps A,J-01–06,G-03 | Bi大仍集总；h/k不更新；端/热桥时间变化缺；阈值无来源 | 一阶集总解析冷却 `rtol≤1e-6`, `specified_not_run`; 分布温度案例 `planned_blocked` | `DER-THERM`; Bi阈值/教材页待登记 |

### I — Thermal Insulation Thickness

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Validation / tolerance / status | Sources |
|---|---|---|---|---|---|---|---|---|
| **I-01** | `not_approved/specification_candidate`; `numerical`；目标外表面温度最小厚度 | `ri,L,Ti,Ts_target,Ta,Tsur[K/m]{req;positive;Ti>Ts}`; `k(T),ε,hc_method,δmax,rounding[SI]{req;无默认除批准配置}` | `ro,δ[m],Q[W],interface T,residual` | `F(ro)=Qcond(ro,Ti,Ts_target)-2πroL[hc(Ts-Ta)+εσ(Ts⁴-Tsur⁴)]=0`；1D侧壁稳态 | 小于δmax扫描物理区→找所有变号→Brent→最小可行→向上圆整→重算；Deps A,J-01–04 | 无根；材料超温；相关式超域；平壁误用；圆整不复核 | `TH-I-001`: `δ=105.0418mm,Q=1072.645W`; 容差 `δ≤0.1mm,Q≤2W`, `executed_pass` | `DER-THERM`; `GB8175`框架 |
| **I-02** | `not_approved/specification_candidate`; `numerical`；目标总/线/面热损最小厚度 | `ri,L,Ti,Ta,Tsur,k(T),ε,hc_method{req}`; `Qlimit[W]` 或 `q' [W/m]` 或 `q'' [W/m²]{exactly one;>0;面积基准必填}`; `δmax,rounding{req}` | `ro,δ,Ts,Qactual,all_physical_roots,residual` | 联立 `Qlimit=Qcond(ro,Ti,Ts)=2πroL[hc(Ts-Ta)+εσ(Ts⁴-Tsur⁴)]`；不用GB式(20)印文 | **物理解算法见下节**；Deps A,J-01–04 | 负绝对温度根；多根静默取错；q''面积基准不明；临界半径非单调；材料超温 | `TH-I-002`: `δ=19.14661mm,Ts=246.347℃`; 容差 `δ≤0.05mm,Ts≤0.2K,Q残差≤1W`, `executed_pass`; GB量纲门禁 `executed_pass` | `DER-THERM`; `GB8175式20 rejected/pending clarification` |
| **I-03** | `not_approved/specification_candidate`; `numerical`；表温+热损双约束 | I-01完整输入 + I-02损失限值 `{req}` | `δdesign=max(δTs,δQ)` 向上圆整后的 `Ts,Q,pass flags` | 分别求解，不把两个目标塞进一个闭式；圆整后完整回算 | I-01→I-02→取较大→圆整→两约束/温限复核；Deps I-01,I-02 | 只用混合式；未回算；两案例输入边界不同却比较 | `TH-I-003`: `25.52mm→210.640℃,2490.81W`; 容差 `Ts≤0.2K,Q≤2W`, `executed_pass`; 双约束选择应≈I-01, `specified_not_run` | `DER-THERM`; 历史工作簿仅反证 |
| **I-04** | `not_approved/partial_specification`; `analytical/numerical`；平壁误差与临界绝热半径筛查 | `ri,δ,k,h(or nonlinear surface model)[SI]{req}` | `δ/ri,rcrit[m],screening status`, 非线性损失曲线可选 | 固定h圆柱 `rcrit=k/h`；平壁误差须由圆筒/平壁热阻比计算，0.2/0.5阈值目前项目草案 | 无量纲比→固定h适用检查→筛查→必要时完整曲线；Deps J-01/J-02 | 含辐射/变h仍把rcrit当精确；草案阈值称标准；以筛查替I求根 | `INS-SCREEN-001` rcrit解析 `TOL-ID`, `specified_not_run`; 平壁比曲线 `specified_not_run` | `DER-THERM`; MIT/教材页码须进主来源注册 |

### I-02 物理解与求解器强制规范

I-02 不允许简单地在“很大的 `ro` 区间”对消元式做一次二分。推荐可直接实现的物理解流程：

1. 输入硬约束：`ro>ri>0`、所有绝对温度 `>0 K`、`Qlimit>0`、`Ti>max(Ta,Tsur)`、材料/相关式数据有效。
2. 建立工程厚度上限 `δmax`，它是必填设计约束或经批准配置，不用无限大默认。
3. 对候选 `ro∈(ri,ri+δmax]`，先在物理温度区间 `Tlow≤Ts<Ti` 内求表面热流平衡；建议 `Tlow=max(Ta,Tsur)`。若过程允许表面低于其中之一，必须另立反向热流场景，而不是放宽同一方法。
4. 或由导热式对给定 `Qlimit` 计算 `Ts(ro)`，但任何 `Ts≤0 K`、`Ts≥Ti` 或不符合外向净热流方向的点立即标无效，绝不把 `Ts^4` 的数学回升当第二个工程根。
5. 仅在物理有效点上构造 `G(ro)=Qsurface(ro,Ts(ro))-Qlimit`，扫描全部变号区间；每个区间用 Brent/二分，保存所有物理解和残差。
6. 若自然对流/临界绝热半径使关系非单调，选择满足全部约束的**最小厚度**，而不是默认“第一个数值根”；同时报告其他物理解及选择理由。
7. 以 `TOL-NUM` 验证导热、对流+辐射和目标热损三者残差；求根失败返回 `non_converged`，无物理解返回 `not_applicable`。
8. 厚度按批准规格向上圆整后，重新求实际 `Ts,Q`、层间温度、材料温限和相关式适用域。圆整前根不得直接作为最终设计通过值。

---

## 52-ID 覆盖、自洽与合并门禁

### 覆盖清单

`A-01,A-02; B-01,B-02,B-03,B-04,B-05,B-06,B-07,B-08; C-01; D-01,D-02,D-03,D-04,D-05,D-06,D-07; E-01,E-02,E-03; F-01,F-02,F-03; G-01,G-02,G-03,G-04,G-05,G-06,G-07,G-08,G-09,G-10; H-01,H-02,H-03,H-04,H-05,H-06,H-07; J-01,J-02,J-03,J-04,J-05,J-06,J-07; I-01,I-02,I-03,I-04`。

### 合并前必须满足

1. 用唯一机器枚举替换 `CALCULATION_BASIS.md` 与 `APPLICATION_ARCHITECTURE.md` 当前漂移的六类方法名。
2. 把本草稿的 `Nrev/Δz/z_i` 路径语义并入 B-01/D-01，正式禁止由 `N` 静默猜路径周数。
3. 全部 BB/工作簿案例登记为 `historical_exposed_reference`；现阶段没有 `sealed_holdout`，成熟软件复现不能标 `holdout_validated`。
4. 将 `insufficient_data` 条目（A-02具体库、D-05、E-02、F-03、G-09、H-04/H-05、J-02/J-05）保持阻断，直到其一手方法、适用域和验证完成；不为了“功能齐全”填无来源公式。
5. 每个 `DER-*` 形成独立推导页，由非实现者复核后才可提升来源状态；每个外部公式补文件哈希、版次、PDF/印刷页、式号和原单位。
6. 将所有 `specified_not_run/planned_blocked` 与 `executed_pass` 分栏。执行过的代表性数值复算只证明该方程/案例可复现，不自动批准上游材料或几何模型。
7. 对 `TOL-*` 数值门槛逐项工程批准；统计黑箱阈值不得沿用数值求解容差。
8. 只有本契约与 `VALIDATION_CASES.md` 同步、Gate 0 复审通过、用户批准正式决策后，才可合并为冻结计算依据；在此之前继续不实施网站。
