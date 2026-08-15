# Calculation Contracts — 全计算条目逐项契约

> 文档角色：`CALCULATION_BASIS.md` 是总计算技术规范；本文件是其 52 个计算 ID 的逐项输入、输出、方法域、警告、验证与来源配套契约。  
> 覆盖范围：现有全部 52 个 `A-01` 至 `I/J-xx` ID。  
> 状态：**v1 Gate 0 受控计算契约**，2026-08-14。  
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`。  
> 边界：本轮不实施网站或计算代码；下阶段只可实现本文件标为 `approved` 或 `approved_with_limitation` 的方法。历史资料不进入运行时或验证。若与 `CALCULATION_BASIS.md` 冲突，按 `HANDOFF_TO_CODEX.md` 的 source-of-truth 顺序处理并提交规范变更，不得静默择一。

## 0. 合并规则与统一枚举

### 0.1 唯一方法类别机器值

本文件与正式状态字典统一采用以下机器值；中文显示名不参与存储和比较：

| `method_type` | 含义 |
|---|---|
| `analytical` | 闭式解析、定义式、守恒式或经复核代数推导 |
| `engineering_correlation` | 有来源、试验范围和误差说明的工程相关式 |
| `empirical_calibrated` | 只对新项目校准数据建立、经独立验证且仅在冻结包络内使用 |
| `numerical` | 数值积分、求根、ODE、离散求和；物理模型与数值算法分别追溯 |
| `measurement_identified` | 由同频端口或热工测量辨识 |
| `fem_or_experiment_reference` | 外部 FEM/实验验证数据；本应用不内置通用 FEM |

一个可运行 `method_id` 只取一个 `method_type`。本文件中包含多个子方法的“计算族”必须在实施前拆成独立 `method_id`，不可新增含糊的 `hybrid` 类别。

### 0.2 生命周期、执行结果和验证状态

- 规范处置：`draft | approved | approved_with_limitation | deferred | insufficient_evidence | reference_only | rejected | superseded`。
- 规范完整度：`missing | partial | complete`；生命周期：`active | deprecated | retired`。
- 运行结果：`success | success_with_warnings | not_applicable | insufficient_data | non_converged | no_feasible_solution | invalid_input | inconsistent_measurement`。
- 验证状态：`not_defined | specified | blocked | running | executed_pass | executed_fail | executed_unjudged | not_required`；阻断原因另存 `validation_block_reason`。来源复核另存 `source_review_status=not_required | pending_release_cross_check | reviewed_pass | reviewed_fail`，禁止用斜杠拼接枚举。
- 数据集角色：`development | calibration | validation | sealed_holdout | external_validation | audit_only`。历史资料只能是 `audit_only`；sealed holdout 必须在方法、特征、参数、阈值和 manifest 冻结后新取得，并禁止反向调参。
- 适用域状态：`in_domain | at_boundary | out_of_domain | not_evaluated`。
- 结果来源：`predicted | estimated | identified_from_measurement | project_calibrated | imported_fem_reference | identity_only`；验证通过与否只写入 `validation_status`，不能另造 `holdout_validated` 等 provenance。
- 科学置信度：`high | engineering_approximation | needs_verification | fem_or_experiment_recommended | rejected`。
- 数据质量：`approved_reference | engineering_reference | generic_typical | project_specific | user_defined | measured | fem_reference | unknown`。若其他规范字段名写作 `input_data_quality`，其取值仍只能来自本枚举。
- Warning 严重度：`info | caution | warning | blocking | fatal`；`blocking/fatal` 只返回诊断，不生成普通数值。

以上枚举逐字服从 `docs/METHOD_STATUS_DICTIONARY.md`；显示层可本地化，存储值不得改写、复合或增补。

### 0.3 验证标识的两个命名空间

- `validation_case_id`：中央验证案例标识，必须逐字解析到 `VALIDATION_CASES.md` 的一个 `###` 标题；案例状态、容差和阻断原因以中央文件为唯一裁决，本契约不得另造不同状态。
- `method_check_id`：方法契约内的确定性单元、量纲、缩放、极限、域检查或失败语义检查。它必须在本方法的 Validation 字段中给出目的、容差和状态，但不要求成为中央案例标题。
- 本文件当前引用的中央 `validation_case_id` 为：`GEO-001,GEO-002,EM-L-001,EM-L-002,EM-L-003,EM-L-004,EM-L-005,EM-L-006,ELEC-RDC-001,EM-Z-001,EM-Z-002,EXP-RAC-001,PWR-PAR-IDEAL-001,PWR-PAR-RL-001,PWR-XFMR-001,PWR-LLC-ZJL-001,COOL-ENERGY-001,EXP-COOL-001`。Validation 字段中的其他检查标识均属于 `method_check_id`，除非以后同时更新本清单和中央案例。
- 同一显示字符串不得同时代表两个命名空间。中央案例未执行不妨碍方法本地 check 执行，但二者必须分别记录，不能把本地 check 的通过状态写回中央案例。

#### v1 权威处置覆盖表

| disposition | method IDs |
|---|---|
| `approved` | A-01, B-01, B-02, B-08, C-01, D-01, D-02, D-03, D-06, D-07, G-01, G-02, G-04, G-05, G-06, H-01, H-03, H-07, J-01, J-03, J-06 |
| `approved_with_limitation` | A-02, B-03, B-04, B-05, B-06, B-07, D-04, D-05, E-01, E-02, E-03, F-01, F-02, G-03, G-07, G-08, G-10, H-02, H-04, H-05, H-06, J-02, J-04, J-05, J-07, I-01, I-02, I-03, I-04 |
| `deferred` | F-03, G-09 |

父条目的可用状态不会自动批准其所有子方法；每个子方法仍须匹配下文明确的几何、物性、公式和适用域。

### 0.4 输入表和范围语义

- `physical range` 是硬物理/数据约束；违反即 `invalid_input`。
- `method range` 是该模型可防御的范围；超出时返回 `not_applicable` 或 `success_with_warnings`，不能静默外推。
- “无默认”表示缺值不得猜测。温度均为 K，温差为 K；所有计算入口只接受 SI。
- 表中 `source basis=case` 表示工况实测/设计输入，不是默认常数；`A` 表示共享物性模块；`DER-*` 表示本项目独立 SI 推导记录，**待工程签字，不冒充外部文献**。

### 0.5 共享容差基线

| ID | 建议容差 | 用途 |
|---|---|---|
| `TOL-ID` | `abs_err ≤ 1e-12·max(1,|reference_SI|)` | 纯代数、单位往返和合成输入 identity |
| `TOL-NUM` | 求根能量残差 `≤max(1 W,1e-6·Qscale)`；几何根区间 `≤1e-6 m` | 热平衡等数值求解的草案门槛 |
| `TOL-PROP` | 数据节点精确回返；区间插值 `rtol≤1e-12` 相对指定插值算法 | 物性查询算法，不代表原数据准确度 |
| `TOL-PUB` | 不优于原文最后一位、扫描/OCR分辨率和原作者误差声明 | 文献黄金值 |

若模型不确定度远大于数值容差，显示精度由模型/输入不确定度控制，不能引用 `TOL-ID/TOL-NUM` 增加有效数字。

### 0.6 来源缩写

`CODATA22`、`IAPWS95/IF97`、`W28`、`N09`、`L85`、`RG12`、`GB8175`、`GN75`、`C39`、`CC75-V/H`、`CB77`、`RH75`、`DT69` 沿用正式来源注册。`DER-GEO`、`DER-EM`、`DER-CIRCUIT`、`DER-ENERGY`、`DER-HYD`、`DER-THERM` 是受控 SI 推导记录。历史来源只存在于 `PROJECT_AUDIT.md` 与 archive，不作为本文件公式来源。

---

## A — Shared Material & Physical Properties

### A-01 — 温变物性查询与插值

- **Status / method type:** `approved`; `numerical`。
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
- **Validation:** `MAT-P-001` 节点回返及中点线性插值，`TOL-PROP`，`specified`（首批数据集未建立）；`MAT-P-002` 域外必须阻断，精确状态匹配，`specified`。
- **Source refs:** 各属性记录自己的页/表/式；契约来自 `DER-ENERGY` 与正式 A-01；没有统一数值来源可替代逐属性来源。

### A-02 — 水物性

- **Status / method type:** `approved_with_limitation`（IAPWS 方法已选；实现库须固定版本并跑官方节点）；`numerical`。
- **Purpose:** 由水温和绝对压力返回冷却所需 `rho,cp,mu,k,h,Tsat`，避免固定常温常数跨域。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `water.temperature` | `T` | K | 是 | 无 | `T>0` | 所选 IAPWS release 有效区 |
| `water.pressure_abs` | `p` | Pa | 是 | 无 | `p>0` | 所选 region 有效区 | case |
| `phase_requirement` | — | 1 | 否 | `single_phase_liquid` | 已注册相态 | 液态冷却模型 | design |

- **Outputs:** `rho[kg/m3],cp[J/(kg*K)],mu[Pa*s],k[W/(m*K)],h[J/kg],Tsat[K]` 和 region/status；数量级仅用于诊断，不作为默认。
- **Equation:** `rho,cp,h,Tsat` 由固定 release/version 的 IAPWS-95 或 IF97 查询；`mu` 由 IAPWS R12-08 查询；`k` 由 IAPWS R15-11 查询。IAPWS SR6-08(2011) 只能作为 0.1 MPa 附近、原温度域内的显式简化子方法。常温常物性值只能作为显式 `generic_typical` 敏感性情景，不是此方法默认。
- **Assumptions / applicability:** 已知绝对压力、单相水；混合物/乙二醇不适用。
- **Sequence:** 校验 `T,p` → 判相区 → 查询属性 → 比较 `T` 与 `Tsat` → 返回快照。
- **Dependencies:** A-01 数据封装、热力学与输运性质各自固定版本的 IAPWS 实现。
- **Warning predicates:** 压力未知；两相/超出 release；接近饱和；显式常物性近似超出声明窗口。
- **Validation:** `MAT-W-001` 分别对照 IAPWS-95/IF97、R12-08、R15-11 的官方节点，容差按各 release，`blocked`（实现未选）；`MAT-W-002` 饱和边界状态，`blocked`；若启用 SR6 简化法，另做其温度/压力域与全模型差异测试。
- **Source refs:** `IAPWS-95` 或 `IAPWS-IF97`、`IAPWS-R12-08`、`IAPWS-R15-11`；可选 `IAPWS-SR6-08(2011)`。发布前固定本地副本、官方节点和软件依赖 hash。

---

## B — Coil Geometry & Inductance

### B-01 — 几何规范化

- **Status / method type:** `approved`; `analytical`。
- **Purpose:** 将机械包络、匝中心、导体截面和真实路径转换为冻结几何语义；禁止 `Np`、`(N-1)p`、中心距和包络长度混用。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.electrical_turn_count` | `N` | 1 | 是 | 无 | 整数 `N>=1` | 所有几何 |
| `coil.turn_center_z[]` | `z_i` | m | 推荐 | 无 | 有限、单调可排序 | 离散方法直接使用 | drawing/measurement |
| `coil.helix_revolution_count` | `N_rev` | 1 | 路径法必填 | 无 | `N_rev>0`，可含部分周 | 圆柱螺旋段 | drawing |
| `coil.helix_axial_advance` | `delta_z_helix` | m | 路径法必填 | 无 | 有限；符号表方向 | 均匀螺旋段 | drawing |
| `coil.inner_diameter` | `D_i` | m | 机械/间隙必填 | 无 | `>0` | 机械内表面 | case |
| `coil.outer_diameter` | `D_o` | m | 机械必填 | 无 | `D_o>D_i` | 机械外表面 | case |
| `coil.mean_diameter` | `D_m` | m | 可派生 | `(D_i+D_o)/2` | `D_i<D_m<D_o` | 几何中心路径 | derived |
| `coil.current_path_diameter` | `D_c` | m | 电感必填 | 显式派生 `D_m` | `>0` | 绑定方法/状态 | method/input |
| `conductor.radial_size` | `d_rad` | m | 是 | 无 | `>0` | 实际安装方向 | case |
| `conductor.axial_size` | `d_ax` | m | 是 | 无 | `>0` | 实际安装方向 | case |
| `coil.pitch_center` | `p` | m | `N>=2` | 无 | `>0` | 均匀单层 | drawing |
| `coil.lead_length` | `lead_length` | m | 总端口量条件必填 | 无 | `>=0` | 参考面内 | drawing |

- **Outputs:** `D_i,D_o,D_m,D_c,d_rad,d_ax,p,g,b_cc,b_env,N,N_rev,delta_z_helix,lead_length,z_i` 及明确分母的无量纲比。
- **Equation:** `D_o=D_i+2d_rad`；`D_m=(D_i+D_o)/2=D_i+d_rad`；`g=p-d_ax`；均匀 `N>1` 时 `b_cc=(N-1)p`、`b_env=b_cc+d_ax`。默认 `D_c:=D_m` 必须生成派生记录和高频电流质心警告；不得倒算后静默覆盖。
- **Assumptions / applicability:** 圆柱轴线和截面方向定义明确；测量基准一致。
- **Sequence:** 单位归一 → 几何一致性方程 → 建立匝中心/路径 → 派生长度和无量纲比 → 输出歧义清单。
- **Dependencies:** 单位层、案例字段映射；无物性依赖。
- **Warning predicates:** `N=1` 却调用需要 `b>0` 的电流片；`Np` 被当轴向长度；几何恒等残差超不确定度；`g<0`；多层误标单层；电流质心未知。
- **Validation:** `validation_case_id=GEO-001` 验证全部单层恒等，`specified`；`validation_case_id=GEO-002` 验证 `N_rev/delta_z_helix` 路径端点与 `N=1` 状态，`specified`。
- **Source refs:** `ADR-0003`, `DER-GEO`, `ENGINEERING_PARAMETER_DICTIONARY`。

### B-02 — 轴向填充系数

- **Status / method type:** `approved`; `analytical`。
- **Purpose:** 计算均匀单层绕组相对于明确包络的轴向投影覆盖率，避免把它称作电磁耦合系数。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.electrical_turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 同尺寸单层匝 |
| `conductor.axial_size` | `d_ax` | m | 是 | 无 | `>0` | 截面方向明确 |
| `coil.winding_envelope_length` | `b_env` | m | 是 | 无 | `>0` | 均匀单层 |

- **Outputs:** `k_fill_axial`，无量纲，物理覆盖率期望 `0<k≤1`；解释为投影覆盖，不是体积填充或 `k=M/√(L1L2)`。
- **Equation:** `k_fill_axial=N d_ax/b_env`。
- **Assumptions / applicability:** 匝在轴向无重叠，所有匝相同；对倾斜/异形截面只作投影定义。
- **Sequence:** 取 B-01 已确认长度语义 → 计算 → 范围检查。
- **Dependencies:** B-01。
- **Warning predicates:** `k>1 -> invalid_input`；`b_env` 未按 ADR-0003 定义；不同截面/多层却直接调用。
- **Validation:** `GEO-FILL-001` 使用新合成几何验证恒等、单位不变性和 `k=1` 边界，`executed_pass`。
- **Source refs:** `ADR-0003`, `DER-GEO`。

### B-03 — 理想长螺线管

- **Status / method type:** `approved_with_limitation`; `analytical`。
- **Purpose:** 提供无限长电流片极限和量级检查，不作普通有限长实物默认。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_diameter` | `D_c` | m | 是 | 无 | `D_c>0` | 圆柱电流片；方法内派生 `a=D_c/2` |
| `coil.winding_envelope_length` | `b_sheet=b_env` | m | 是 | 无 | `b_env>0` | v1 电流片轴向映射；只在 `b_env/D_c` 足够大时近似实物 |
| `coil.electrical_turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 连续均匀安匝 |
| `core.relative_permeability` | `μr` | 1 | 否 | `1`（仅空气芯显式） | `μr>0` | 当前仅均匀线性介质 |

- **Outputs:** `L_inf[H]>0`，项目案例通常为 µH 级但不设通用范围；仅解释为长线圈极限。
- **Equation:** `a=D_c/2`、`b=b_env`、`A=πa²`；`Linf=μ0 μr N²A/b`。
- **Assumptions / applicability:** 无限长、均匀电流片、均匀线性芯、无引线/工件/截面/漏磁端部。
- **Sequence:** B-01 几何 → A 常数/介质 → 计算 → 与有限长法作极限比。
- **Dependencies:** B-01、A-01/CODATA22。
- **Warning predicates:** `b=0`；`N=1,b_cc=0`；有限长却作为主结果；铁磁非线性。
- **Validation:** `validation_case_id=EM-L-001` 扫描 `b_env/D_c=2,5,10,20`，要求 B-04 `L/Linf` 单调趋近 1，具体物理容差以 L85 对照，`specified`；`method_check_id=EM-L-LONG-SCALE-001` 以 `TOL-ID` 检查 `L∝N²a²/b`，`specified`。
- **Source refs:** `N09`（长线圈基准关系）、`DER-EM`。

### B-04 — Nagaoka/Lundin 有限长电流片

- **Status / method type:** `approved_with_limitation`; `analytical`（Lundin 闭式近似）。
- **Purpose:** 给单层圆柱均匀电流片的有限长空芯电感科学基线。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_diameter` | `D_c` | m | 是 | 无 | `D_c>0` | 圆柱薄电流片；方法内派生 `a=D_c/2` |
| `coil.winding_envelope_length` | `b_sheet=b_env` | m | 是 | 无 | `b_env>0` | v1 电流片轴向映射；无批准的硬 `N,p/d_ax` 阈值 |
| `coil.electrical_turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | `N=1` 实物不适用，返回 `not_applicable` |

- **Outputs:** `L_sheet[H]>0`,`K_N=L_sheet/Linf`，通常 `0<K_N<1`；解释为电流片，不代表粗管螺旋精度。
- **Equation:** 先映射 `a=D_c/2,b=b_env`，再完整使用正式 B-04 的 Lundin 式(9)–(12)，按 `2a≤b`/`2a>b` 分支；不得再乘第二次 Nagaoka 系数。
- **Assumptions / applicability:** 无限薄、均匀圆柱面安匝；无节距、引线、有限截面、邻近、工件和分布电容。
- **Sequence:** B-01 → 检查电流片适用性 → 分支计算 → `0<K≤1`/长极限 → 与 B-05/B-07 比较。
- **Dependencies:** B-01、B-03、CODATA22。
- **Warning predicates:** 少匝/大节距/粗管；平均电流路径不确定；分支结果差超过论文近似误差；被再次乘 `K_N`。
- **Validation:** `validation_case_id=EM-L-003` 对 `x=0,0.25,1` 的 `f1/f2` 按 L85 最后位容差，`executed_pass`，另记 `source_review_status=pending_release_cross_check`；`validation_case_id=EM-L-006` 四几何比较矩阵，`specified`；`method_check_id=EM-L-BRANCH-001` 分支点示例差约 `2.58 ppm`、容差 `≤3e-6 relative`，`executed_pass`；`validation_case_id=EM-L-001` 极限，`specified`。
- **Source refs:** [FORMULA_SOURCE_REGISTER.md](FORMULA_SOURCE_REGISTER.md) 的 B-04 条目：`L85` PDF 3–4（印刷页 1428–1429，式(9)–(12)、Table 1）及 `N09` PDF 20–21（印刷页 19–20，式(15)–(18)）；`CODATA22`。

### B-05 — Wheeler 1928 单层快速式

- **Status / method type:** `approved_with_limitation`; `engineering_correlation`。
- **Purpose:** 在 Wheeler 原几何与声明域内对单层线圈作快速工程对照。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.current_path_diameter` | `D_c` | m | 是 | 无 | `D_c>0` | 单层圆线圈；方法内派生 `a=D_c/2` |
| `coil.winding_envelope_length` | `b_winding=b_env` | m | 是 | 无 | `b_env>0` | 式(2) 1%声明：`b_env>0.8(D_c/2)` |
| `coil.electrical_turn_count` | `N` | 1 | 是 | 无 | 整数 `≥1` | 少匝/大节距精度下降 |

- **Outputs:** `L_Wheeler[H]>0`；预期与电流片同量级，误差以原文和方法比较显示。
- **Equation:** 先映射 `a=D_c/2,b=b_env`，边界显式换算到 inch 后 `L[µH]=a_in²N²/(9a_in+10b_in)`；历史短式 `a²N²/(8a+11b)` 只能作为独立 `reference_only` 方法记录，不自动切换。
- **Assumptions / applicability:** Wheeler 原文单层几何；`b>0.8a` 只是式(2) 约1%声明域，不是 Wheeler/Nagaoka 开关。
- **Sequence:** B-01 → SI→inch → 公式 → µH→H → 域检查 → 并列比较。
- **Dependencies:** B-01、单位注册表。
- **Warning predicates:** 直径代入半径式；mm 直接代英寸式；`b≤0.8a`；少匝/大节距/粗管；结果再乘 Nagaoka。
- **Validation:** `validation_case_id=EM-L-002` 英寸原式与 SI 包装 `TOL-ID`，`specified`；`validation_case_id=EM-L-006` 方法比较矩阵，`specified`；`method_check_id=EM-L-W28-DOMAIN-001` 检查 W28 声明域，`specified`。
- **Source refs:** `W28` PDF 2 式(2)、PDF 3 式(3)。

### B-06 — Wheeler 多层式

- **Status / method type:** `approved_with_limitation`; `engineering_correlation`。
- **Purpose:** 仅为真正均匀多层绕组提供历史快速估算；不把单层导体厚度误判为多层。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.multilayer_mean_radius` | `a_ml`（原文 `a`） | m | 是 | 无 | `a_ml>0` | 整个多层绕组截面的机械平均半径；均匀多层 |
| `coil.multilayer_axial_length` | `b_ml`（原文 `b`） | m | 是 | 无 | `b_ml>0` | 整个多层绕组的轴向长度；原式几何定义 |
| `coil.multilayer_radial_build` | `c_ml`（原文 `c`） | m | 是 | 无 | `c_ml>0` | 所有层合计径向厚度；不是单根导体 `d_rad` |
| `coil.electrical_turn_count` | `N`（原文 `n`） | 1 | 是 | 无 | 整数 `N≥1` | 全部层合计电气匝数；匝分布近似均匀 |
| `coil.layer_count` | `N_layer` | 1 | 是 | 无 | 整数 `N_layer≥2` | 证明几何确为多层 |

- **Outputs:** `L_Wheeler_multilayer[H]>0`，仅快速估算；无通用批准精度。
- **Equation:** 方法边界先将 `a_ml,b_ml,c_ml` 从 m 显式换算为 inch，再按 Wheeler 1928 Eq. (1) 计算 `L[µH]=0.8 a_ml,in² N²/(6a_ml,in+9b_ml,in+10c_ml,in)`，最后换算为 H；历史符号 `t` 只可作为 `c_ml` 的迁移别名。
- **Assumptions / applicability:** 绕组形状近似 Wheeler Fig. 1，匝在多层截面内近似均匀；原文约 1% 声明仅在 `6a_ml`、`9b_ml`、`10c_ml` 数量级大致相当时保留。粗单层铜管不适用，且不得用 `D_m/2`、`D_c/2` 或单根 `d_rad` 静默代入。
- **Sequence:** B-01 层结构 → 单位换算 → 公式 → 域/层数检查。
- **Dependencies:** B-01、单位注册表。
- **Warning predicates:** `N_layer<2→not_applicable`；把单根径向尺寸当 `c_ml`；把单层 `D_c` 当 `a_ml`；层间半径/匝数极不均匀；离开上述形状条件仍宣称约 1%。
- **Validation:** `method_check_id=EM-L-ML-001` 检查原 inch/µH 式与 SI 包装、变量迁移和 `N_layer≥2` 门禁，`TOL-ID`，`specified`；`specification_completeness=complete`、`lifecycle_status=active`。
- **Source refs:** [FORMULA_SOURCE_REGISTER.md](FORMULA_SOURCE_REGISTER.md) 的 B-06 条目；`W28` PDF 1（印刷页 1398）、Figure 1、Equation (1)，本地一手原页已核查。

### B-07 — 离散同轴圆环求和

- **Status / method type:** `approved_with_limitation`; `numerical`。
- **Purpose:** 为少匝、大节距提供逐匝自感和互感基线，避免把连续电流片当真实离散绕组。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `turn.radius[]` | `a_i` | m | 是 | 无 | 全部 `>0` | 同轴平面圆环 |
| `turn.axial_position[]` | `z_i` | m | 是 | 无 | 有限 | 同轴、互不重合 |
| `conductor.round_radius` | `r_c` | m | 自感式必填 | 无 | `0<r_c<a_i` | 仅薄圆实心导体且所选截面电流/自感常数成立；不设无来源通用硬阈值 |
| `current_distribution` | — | 1 | 是 | 无 | 枚举 | 当前仅均匀截面自感常数 |

- **Outputs:** `L_total,Lself_i,Mij[H]`，应有限且总电感正；项目矩阵为 µH 级。
- **Equation:** `L=ΣLi+2ΣMij`；`Mij` 使用完全椭圆积分式；当前细实心圆线 `Li≈μ0a[ln(8a/rc)-7/4]`。`i=j` 禁止调用互感式。
- **Assumptions / applicability:** 每匝平面同轴圆环；当前自感常数不适用于空心粗管、矩形管、强趋肤或真实连续螺旋。
- **Sequence:** B-01 匝数组 → 截面方法选择 → 各自感 → 各互感 → 对称求和 → 正定/收敛检查。
- **Dependencies:** B-01、椭圆积分数值库、截面自感子方法。
- **Warning predicates:** `i=j` 互感奇点；`r_c/a` 不小；匝相交；空心/矩形截面却使用 `-7/4`；引线缺失。
- **Validation:** `validation_case_id=EM-L-005` 单匝有限/不 NaN，`specified`；`validation_case_id=EM-L-006` 方法比较矩阵，`specified`；`validation_case_id=EM-L-004` Rosa/Grover Example 57，`TOL-PUB`，`blocked`（CGS→SI 全链未签字）；独立 Simpson 复算另记为 B-08 的 `method_check_id`。
- **Source refs:** `RG12` PDF 6 式(1)、PDF 123/126–128；`DER-EM` SI 归一化待签字。

### B-08 — Simpson 数值积分

- **Status / method type:** `approved`；`numerical`。
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
- **Validation:** `NUM-SIMP-001` 多项式三次以内机器精度，`TOL-ID`，`specified`；`NUM-SIMP-002` 椭圆积分对权威库 `rtol≤1e-10`（远离 `k=1`），`specified`。
- **Source refs:** `ID-NUM-01` 与标准复合 Simpson 推导；具体教材原页仍待来源登记。B-08 是已批准的数值复核工具，不因待补教材定位而改写成 `reference_only`，也不升级任何电感物理模型的批准或验证状态。

---

## C — Inductance Comparison & Validation

### C-01 — 电感方法比较

- **Status / method type:** `approved`; `numerical`（编排/统计）。
- **Purpose:** 在同一冻结几何上并列所有适用方法、Recommended method、适用域和差异，不指定无证据的“真值”。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `normalized_geometry` | — | SI | 是 | 无 | B-01 有效 | 所选方法公共输入 |
| `method_ids[]` | — | 1 | 是 | 无 | 至少 2 个已注册方法 | 同一输出语义 |
| `reference_result` | `Lref` | H | 否 | 无 | `>0` | 只允许公开参考、独立测量/FEM并标类型 |

- **Outputs:** 每法 `L/status/domain/source`、`delta_L`,`relative_difference`,`spread`；预期差异可从 ppm 到数十%，不得预设接近。
- **Equation:** `spread=(Lmax-Lmin)/Lreference`；参考缺失时只给 pairwise 差，不伪造分母。
- **Assumptions / applicability:** 完全相同几何、物性、单位和方法映射；外部参考只用于独立验证。
- **Sequence:** 冻结输入 → 运行全部已批准且有完整输入的方法并保留失败状态 → 按下列 Recommended policy 路由 → 计算差异 → 应用警告 → 输出方法、来源和选择理由。
- **Dependencies:** B-01、B-03–B-07、方法注册和证据注册。
- **Warning predicates:** 输入映射不同；参考参与拟合；把 `N`、节距比或方法差百分比诊断量当通用硬切换阈值；把方法接近称为验证。
- **Recommended policy:** 对空气芯、均匀单层且电流片假设成立的工况推荐 B-04；B-03 只作长线圈极限，B-05 只作原适用域内快速比较。少匝/稀疏工况只有在 B-07 的同轴平面圆环、完整 `z_i/D_c,i`、受支持薄圆实心截面和电流分布前提全部成立时才可推荐 B-07。B-04 与 B-07 均不适用时返回 `recommended_method_id=null`：仍有可展示比较结果时用 `result_status=success_with_warnings` 并发出 `no_approved_recommended_result` warning；没有任何方法可运行时按原因返回 `not_applicable` 或 `insufficient_data`。不得按 `N`、节距比、方法差阈值、结果接近或平均值强行选法；B-06 仅由独立多层几何路由。
- **Validation:** `validation_case_id=EM-L-006` 方法比较矩阵按中央案例，`specified`；`method_check_id=CMP-001` 验证一个方法 `not_applicable` 时其他适用方法及状态仍完整，`specified`。
- **Source refs:** 各被调用方法来源；`DER-EM` 比较指标。

---

## D — Coil Electrical Parameters

### D-01 — 机械/CAD 导体中心路径长度

- **Status / method type:** `approved`; `analytical`。
- **Purpose:** 由真实螺旋和引线/母排路径得到电阻、质量及压降使用的导体总长，解决 `N` 周与 `(N-1)p` 端点矛盾。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `coil.mean_diameter` | `D_m` | m | 是 | 无 | `D_m>0` | 机械/CAD 导体中心路径；不得用 `D_c` 代替 | B-01/drawing |
| `coil.helix_revolution_count` | `N_rev` | 1 | 是 | 无 | `N_rev>0` | 可含端部部分周 | drawing/B-01 |
| `coil.helix_axial_advance` | `delta_z_helix` | m | 是 | 无 | 有限 | 均匀螺距 | drawing/B-01 |
| `lead/bus.segment_lengths[]` | `ℓj` | m | 否 | 无 | 每段 `≥0` | 未给时只输出线圈段下界 | drawing/measurement |

- **Outputs:** `ℓhelix,ℓlead,ℓbus,ℓtotal[m]`，设备常为 m–百 m 级但无通用范围；解释为机械/CAD 导体中心路径长度，不是电磁等效电流路径直径 `D_c` 所定义的长度。
- **Equation:** `ℓhelix=√[(πD_m N_rev)²+delta_z_helix²]=N_rev√[(πD_m)²+(delta_z_helix/N_rev)²]`；`ℓtotal=ℓhelix+Σℓj`。只有明确 `N_rev=N` 且每周轴向前进为 `p` 时，才可写 `N√[(πD_m)²+p²]`。非圆路径使用 CAD/分段中心线积分。
- **Assumptions / applicability:** 圆柱均匀螺旋；非圆/多层按逐段 3D 路径积分。
- **Sequence:** B-01 路径 → 每段长度 → 汇总 → 与 `NπD` 下界/近似差比较。
- **Dependencies:** B-01。
- **Warning predicates:** `N_rev` 由 `N` 暗猜；把 `D_c` 当机械路径；引线未知；`delta_z_helix` 与匝中心跨度不一致；多层/异形却调用单段式。
- **Validation:** `GEO-LEN-001` 合成螺旋与三维端点距离，`TOL-ID`，`specified`；`delta_z_helix→0` 应得 `πD_mN_rev`，`TOL-ID`，`specified`。
- **Source refs:** `DER-GEO`。

### D-02 — 金属截面积与水力面积分离

- **Status / method type:** `approved`; `analytical`。
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
- **Validation:** `GEO-AREA-001` 四种截面使用独立合成尺寸手算，`TOL-ID`，`specified`。
- **Source refs:** `DER-GEO`。

### D-03 — DC 电阻

- **Status / method type:** `approved`; `analytical`。
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
- **Validation:** `validation_case_id=ELEC-RDC-001` 检查 `R∝ℓ/A` 缩放和分项和式，`TOL-ID`，`specified`；标准件四线测量另记 `method_check_id=ELEC-RDC-MEAS-001`，`blocked`。
- **Source refs:** `DER-CIRCUIT`；铜物性逐属性来源待 A 数据包。

### D-04 — 铜导体趋肤深度

- **Status / method type:** `approved_with_limitation`; `analytical`。
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
- **Validation:** `method_check_id=EM-S-001` 使用独立 SI 输入验证绝对值和单位往返，`TOL-ID`，`executed_pass`；`method_check_id=EM-S-002` 验证 `sqrt(rho/(f mu))` 缩放，`TOL-ID`，`executed_pass`。
- **Source refs:** `DER-EM`, `CODATA22`。

### D-05 — AC 电阻分级

- **Status / method type:** `approved_with_limitation`；这是计算族，须拆子方法。
- **Purpose:** 在导体截面、频率和外场条件明确时估算/辨识 `Rac`；没有匹配模型时拒绝伪造邻近修正。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `Rdc/geometry/length` | — | Ω,SI | 是 | 无 | 有效 | 与子方法匹配 | D-01–D-04 |
| `frequency/material_state` | `f,T` | Hz,K | 是 | 无 | `f>0,T>0` | 子方法原域 | case/A |
| `field_exposed_surfaces` | — | 1 | 工程近似必填 | 无 | 非空 | 回流/邻近方向已知 | field model |
| `method_id` | — | 1 | 是 | 无 | 注册值 | 见下 | approved registry |

- **Outputs:** `Rac[Ω]`,`Rac/Rdc≥1`（被动均匀导体常见检查，不作所有测量硬律）、`Aeff[m²]`、未计邻近项；量级不可预设。
- **Equation:** `surface_skin_screening_round`：`Aeff=2*pi*ro*delta`、`Rac_surface=rho*l/Aeff`。孤立实心圆要求 `ro/delta>=10`、近似均匀表面场、邻近可忽略；空心圆管仅在 `t_wall/delta>=3` 且已声明电流主要位于外表面时用同一外周长筛选。实测端口 AC 电阻走 `measurement_identified` 子方法并优先。
- **Assumptions / applicability:** 一阶式是强集肤均匀表面 screening；不可默认圆管内外周都导电，也不预测局部拥挤。
- **Sequence:** shape/δ 比 → 子方法域匹配 → 无批准方法则 `insufficient_data` → 计算/辨识 → 与 Rdc/测量比较。
- **Dependencies:** A-01、D-01–D-04、回流/工件几何；邻近时需 FEM/测量。
- **Warning predicates:** 矩形/复杂截面调用圆式；`ro/delta<10`；空心管 `t_wall/delta<3`；外场/回流未知；邻近显著；无来源 `Fprox`；带工件端口有功电阻被称线圈 Rac。
- **Validation:** `method_check_id=ELEC-RAC-FREEZE-001` 验证 `Rac proportional l*sqrt(f)/ro` 和域外失败，`specified`；`validation_case_id=EXP-RAC-001` 新线圈同状态测量计划按中央案例，`specified`（尚未执行）。
- **Source refs:** `DER-EM`; `RG12` 仅用于后续全频方法候选；实测协议见 `validation/protocols/MINIMUM_VALIDATION_PLAN.md`。

### D-06 — 电流密度与铜损

- **Status / method type:** `approved`; `analytical`。
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
- **Validation:** `method_check_id=ELEC-PCU-001` 合成 `I,R` identity `TOL-ID`，`specified`；独立 Rac 测量由 `validation_case_id=EXP-RAC-001` 验证，中央状态 `specified`。
- **Source refs:** `ID-OHM-02`；`Rac_used` 的数值来源必须逐结果指向 D-05 估算或 F-02 同状态测量，不接受历史资料作为计算血缘。

### D-07 — 线圈串联端口参数

- **Status / method type:** `approved`; `analytical`。
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
- **Validation:** `ELEC-ZS-001` 合成 R/L 机器精度、被动性和 `R<<omegaL` 近似误差，`TOL-ID`，`specified`。
- **Source refs:** `DER-CIRCUIT`。

---

## E — Workpiece Electromagnetic & Heating Parameters

### E-01 — 工件参考透入深度

- **Status / method type:** `approved_with_limitation`; `analytical`。
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
- **Validation:** `EM-S-004` 使用独立 SI 输入的绝对值，`executed_pass`；`EM-S-003` 在同 `rho,f` 下 `mu_r:100->1` 比值 10，`TOL-ID`，`executed_pass`。
- **Source refs:** `DER-EM`；材料数据逐属性来源；二手论文错号不采用。

### E-02 — Curie 与温度扫描

- **Status / method type:** `approved_with_limitation`; `numerical`。
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
- **Validation:** `EM-S-003` 固定ρ下理论比例，`executed_pass`；真实牌号曲线 `blocked`（材料数据包缺失）；在此之前运行返回 `insufficient_data`。
- **Source refs:** `S89` 模型范围证据；实际材料表来源待定。

### E-03 — 参考临界频率与穿透比

- **Status / method type:** `approved_with_limitation`; `engineering_correlation`。
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
- **Validation:** `method_check_id=EM-F-001` SI 与两工程单位包装 `TOL-ID`，`executed_pass`（示例换算）；历史 image8 上/下限不是验证案例，固定为 `dataset_role=audit_only`，不得赋予数值验证状态或方法批准状态。
- **Source refs:** `M04` 经验点及单位冲突；`DER-EM` SI 反推。

---

## F — Coil–Workpiece / Equivalent Load

### F-01 — 理想变压器反射阻抗

- **Status / method type:** `approved_with_limitation`; `analytical`。
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
- **Validation:** `validation_case_id=EM-Z-001` 合成值与复数直接计算 `TOL-ID`、零互感/开路极限，`specified`；被动性属性使用 `method_check_id=EM-Z-PASSIVITY-001`，`specified`。
- **Source refs:** `DER-CIRCUIT` 标准双绕组推导，需独立签字；项目小图 image3/4 不作为该式来源。

### F-02 — 端口阻抗测量辨识

- **Status / method type:** `approved_with_limitation`; `measurement_identified`。
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
- **Validation:** `validation_case_id=EM-Z-002` 合成 `R,L` 恢复，数值 `TOL-ID`，`specified`；`method_check_id=EM-Z-LOWQ-001` 检查低 Q 噪声边界，`specified`；真实空载/冷/热态检查另记 `method_check_id=EM-Z-ACTUAL-001`，`blocked`。
- **Source refs:** `DER-CIRCUIT`；`DHT` 实际频率/装工件测量建议。

### F-03 — 项目专用经验负载模型

- **Status / method type:** `deferred`; `empirical_calibrated`。
- **Purpose:** 未来只用新取得的项目校准数据，为固定设备族建立域受限 `Req/Leq` 响应面；不是通用几何公式。

| parameter_id | 符号 | SI | 必填 | 默认 | physical range | method range | source basis |
|---|---|---:|---|---|---|---|---|
| `equipment_family_id` | — | 1 | 是 | 无 | 非空 | 固定设备族 | project |
| `cases_calibration[]` | — | SI | 是 | 无 | 新取得、边界和不确定度完整 | 冻结校准集 | new measurement/FEM |
| `cases_validation[]` | — | SI | 是 | 无 | 未参与拟合 | 输入包络覆盖 | new independent data |
| `feature/model_spec` | — | 1 | 是 | 无 | 物理约束/单位完整 | 冻结后不可看留出调参 | approved protocol |

- **Outputs:** 每输出估算、带符号误差、MAE/RMSE/max relative error、样本数、多维校准域和模型不确定度。
- **Equation:** 不预先编造。允许最少参数、量纲正确、被动/单调约束候选；identity 派生列不计独立目标。
- **Assumptions / applicability:** 设备族、参考面和测量状态稳定；域外直接 `not_applicable`。
- **Sequence:** 冻结协议/特征/数据角色 → 锁定模型 → 校准 → 独立验证 → 版本冻结。
- **Dependencies:** B–G 科学特征、证据/案例注册、统计误差工具。
- **Warning predicates:** 同案拟合又验证；单案例修正；历史资料进入数据集；参考面/设备族混合；域外外推；恒等式被算独立命中。
- **Validation:** 尚未分配中央 `validation_case_id`；未来必须先在 `VALIDATION_CASES.md` 建立逐字唯一的校准、独立验证和 sealed-holdout 案例，不能使用通配占位 ID。当前因数据及案例均未建立而返回 `insufficient_data`；历史资料明确不可用于本方法。
- **Source refs:** `ADR-0002`, `ADR-0004`, `ADR-0008`；未来模型公式另行注册。

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

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Method checks / linked validation cases | Sources |
|---|---|---|---|---|---|---|---|---|
| **G-01** | `approved`; `numerical`；批次工件从 `Ti` 到 `Tf` 的有用热 | `mass(m)[kg]{req;m>0;case}`; `Ti,Tf[K]{req;>0;Tf>Ti;case}`; `cp(T)[J/kg/K]{req;>0;A域;A-01}`; `phase/reaction_enthalpy[J/kg or J]{conditional;case/A}` | `Esens,Euseful[J]{≥0;case-scaled;控制体目标热}` | `Esens=m∫Ti^Tf cp(T)dT`; `Euseful=Esens+mΣΔhphase+Ereaction`；均匀批次、控制体明确；常cp仅批准窄温域 | 冻结物料/温程→A快照/焓积分→相变/反应→和式；Deps A-01、数值积分 | `Tf≤Ti invalid_input`; 跨相变无焓；cp外推；炉体/流体边界混合 | `TH-E-001` 常cp解析积分 `TOL-ID`, `specified`; 温变表积分/相变节点 `TOL-NUM`, `specified` | `DER-ENERGY pending sign-off`; 物性逐项来源 |
| **G-02** | `approved`; `numerical`；连续流工艺有用功率 | `mass_flow(ṁ)[kg/s]{req;>0;case}`; `hin,hout[J/kg]{preferred;hout≥hin;A/process}` 或 `T+cp+Δh{req}` | `Puseful[W]{≥0;case-scaled;物流焓增率}` | `Puseful=ṁ(hout-hin)=ṁ[∫cpdT+ΣΔhphase+Δhreaction]`；稳态单物流或显式多物流求和 | 各物流焓差→乘质量流→汇总；Deps A-01、G-01焓工具 | kg当kg/s；反应热符号/基准态不明；把启动炉体升温计稳态流功率 | `TH-E-002` 合成焓差 `TOL-ID`, `specified`; 裂解实际焓数据 `blocked` | `DER-ENERGY`; 工艺数据待定 |
| **G-03** | `approved_with_limitation`; `numerical`；加热时间/温度轨迹 | `thermal_mass/cp(T){req;positive;A/case}`; `Pabs(T,t),Qloss(T,t),Pphase(T)[W]{req;来源明确}`; `T0,target[K]{req;>0}`; solver settings `{req}` | `T(t)[K],time_to_target[s],energy_residual[J]{case-scaled}` | `mcp(T)dT/dt=Pabs-Qloss-Pphase`；集总热容仅 Biot 通过；恒净功率才 `t=E/Pnet` | 建状态/事件→ODE→每步A/J/F负载更新→能量残差；Deps A,F,G-01,J | `Pnet≤0 target_unreachable`; Bi过大；跨Curie/相变仍单步常数；非收敛 | 常净功率解析对照 `rtol≤1e-6`, `specified`; 实测温升 `blocked` | `DER-ENERGY`; 实验数据缺 |
| **G-04** | `approved`; `analytical`；冻结功率边界和效率定义 | `Pgrid,Pinv,Pcoil,Pwp,Puseful,Pcu,Qloss[W]{conditional;≥0;同时间基准;measurement/model}` | `ηinv,ηcoil_wp,ηthermal,ηoverall[1]{0..1 被动}` 与缺失边界 | `ηinv=Pinv/Pgrid`; `ηcoil_wp=Pwp/Pcoil`; `ηthermal=Puseful/Pwp`; `ηoverall=Puseful/Pgrid`；仅边界一致时 | 选控制体→量命名→比值→守恒交叉检查；Deps F,G-01/02,J,D-06 | 分母0；效率>1超不确定度；总效率与分级效率重复乘；无功当损失 | `SYS-P-001` 合成链 `TOL-ID`, `specified`; 守恒属性 `specified` | `DER-ENERGY/CIRCUIT` |
| **G-05** | `approved`; `analytical`；由工件需求和损耗求网侧输入功率 | `Puseful,Qloss_wp,Pcu,Pstray[W]{req/conditional;≥0}`; `ηmatching,ηinv,ηrect,ηother[1]{conditional;0<η≤1;measured/vendor}` | `Pwp_abs,Pcoil_terminal,Pgrid[W]{≥0;case-scaled}`；未知项清单 | `Pwp=Puseful+Qloss`; `Pcoil=Pwp+Pcu+Pstray`; `Pgrid=Pcoil/Πη` | 分边界求和→效率链→守恒；Deps G-04,J,D-06 | 未知损耗静默置0；效率边界重叠；`η=0`; 峰值/平均混合 | `SYS-P-002` 合成功率链 `TOL-ID`, `specified` | `DER-ENERGY`; 效率来源逐设备 |
| **G-06** | `approved`; `analytical`；视在功率与真实 PF | `Vrms,Irms,P[SI]{req;≥0;同端口}`; `phase_count/topology{req}`; `ULL[V]{三相条件}` | `S[VA],PF[1]{0..1 被动}` | 单相/等效 `S=VI,PF=P/S`; 平衡三相 `S=√3 ULL IL`; 含谐波 PF仍用P/S | 端口/相制→S→PF→不确定度；Deps measurement/G topology | `P>S`超不确定度；cosφ冒充真PF；线圈端和网侧混用 | `ELEC-PF-001` 合成单/三相 `TOL-ID`, `specified` | `DER-CIRCUIT` |
| **G-07** | `approved_with_limitation`; `analytical`；普通串联 RLC | `R[Ω]{req;≥0}`; `L[H],C[F],f[Hz]{req;>0}`; `port/RMS definition{req}` | `Zs[Ω],f0[Hz],C_for_f[F]{positive}` | `Z=R+j(ωL-1/ωC)`; `f0=1/(2π√LC)`；理想集中串联网络 | 拓扑验证→加载工作点L→Z/f0→元件应力另算；Deps F/D-07 | 未知拓扑；空载L代热态加载L不警告；并联/LLC误用；寄生忽略 | `ELEC-RLC-S-001` 谐振虚部 `≤1e-12 Ω` 合成例，`specified` | `DER-CIRCUIT` |
| **G-08** | `approved_with_limitation`; `analytical`；两类普通并联拓扑 | `topology{R_parallel_L_parallel_C or series_RL_parallel_C;req}`; `R,L,C,f{positive}` | `Yin[S],Zin[ohm],f0[Hz],branch V/I` | 理想 `Y=1/Rp+j(wC-1/wL)`；实际线圈支路 `Y=1/(Rs+jwL)+jwC`，`w0^2=1/(LC)-(Rs/L)^2`，`C=L/[Rs^2+(w0L)^2]`，谐振 `Zin=L/(CRs)` | 明确电路/端口→支路导纳→求和→正根/被动检查；Deps F/D | 把串联损耗R当并联R；根非正仍报谐振；复用串联应力；寄生未计 | `validation_case_id=PWR-PAR-IDEAL-001`, `specified`; `validation_case_id=PWR-PAR-RL-001`, `specified` | `DER-CIRCUIT`; ADR-0007 |
| **G-09** | `deferred`; `analytical` 或 `numerical`（须按拓扑拆法）；LLC/多谐振 | `complete_netlist,ports,Ls,Lm/Leq,Cs/Cp,Req,drive_harmonics{all req}` | `Zin,gain,branch stresses,characteristic frequencies` | 不设通用式；张金龙论文仅其图2.6、FHA、高Q条件的特定候选 | 识别拓扑→精确复阻抗→选择FHA/谐波→域检查；Deps F,D,G-06 | 无电路图；低Q调用高Q式；把论文特定值通用化；FHA无标签 | `validation_case_id=PWR-LLC-ZJL-001`, `specified`；该案例不改变本方法 `deferred`，未批准前返回 `insufficient_data` | `LLC-ZJL` PDF 24–33、64–65；精确定位见 `FORMULA_SOURCE_REGISTER.md` G-09；无通用 LLC 来源 |
| **G-10** | `approved_with_limitation`; `analytical`；理想匹配变压器 | `Zs[ohm],n=Np/Ns{req;>0}`; `port/RMS/fundamental definitions{req}` | `Zp=n^2Zs,Vp/Vs=n,Is/Ip=n` | 理想无损变压器；漏感、励磁、绕组/磁芯损耗和饱和另建模型 | 端口/变比方向→理想换算→功率恒等→列未计项；Deps F/G topology | n方向混淆；整流系数跨拓扑；端口基波/全波混用；磁芯饱和不计 | `validation_case_id=PWR-XFMR-001` 功率/阻抗恒等 `TOL-ID`, `specified` | `DER-CIRCUIT`; ADR-0007 |

### H — Cooling Water

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Method checks / linked validation cases | Sources |
|---|---|---|---|---|---|---|---|---|
| **H-01** | `approved`; `analytical`；定义水冷线圈控制体热源 | `Pcu,Qpickup_to_coil,Pmag,Pother[W]{req/conditional;>=0;source}`; `design_margin{optional;explicit}` | `Qcool[W]` 与逐项来源/未计项 | `Qcool=Pcu+Qpickup+Pmag+Pother`；裕量作为显式情景 | 画控制体→分项→去重→汇总；Deps D-06,J-05/06,measurement | 工件有用热、无功、整厂损耗或未知拾取被静默加入/置0 | `COOL-CONTROL-001`, `specified` | `DER-ENERGY`; ADR-0006 |
| **H-02** | `approved_with_limitation`; `analytical`；单相焓差求流量 | `Qcool[W],Tin,Tout[K],pin,pout[Pa abs]{req}`; `h,rho{A-02}` | `mdot[kg/s],Vdot[m3/s]` | `mdot=Q/[h_out-h_in]`; 常物性窄域才 `Q/(cp_bar DeltaT)`；`Vdot=mdot/rho` | IAPWS状态→焓差→流量→相态检查；Deps H-01,A-02 | 焓差非正；表压；跨相；固定常物性跨域；通用倍数 | `validation_case_id=COOL-ENERGY-001`, `specified` | `DER-ENERGY`; `IAPWS` |
| **H-03** | `approved`; `analytical`；支路面积、速度和水力直径 | `Vdot_branch[m3/s],Ah[m2],Pwetted[m]{req}`; `network split{conditional}` | `v[m/s],Dh[m]` | `v=Vdot/Ah`; `Dh=4Ah/Pwetted`；只对同阻力支路允许均分 | 管网→支路→几何→v/Dh；Deps D-02,H-02/H-05 | 总流量进单支路；质量流标速度；不对称仍均分 | `COOL-GEO-001`, `specified` | `DER-HYD` |
| **H-04** | `approved_with_limitation`; `engineering_correlation`；管内 Re/Pr/Nu/h | `rho,v,Dh,mu,cp,kf[SI]{req}`; `geometry,development,heat_bc,method_id{req}` | `Re,Pr,Nu,h` | 公共定义；层流 CWT `Nu=3.656`、CWF `Nu=4.364`；Gnielinski 式见总依据，域 `1e4<=Re<=5e6,0.5<=Pr<=2000` | 状态物性→无量纲→方法/域→h；Deps A-02,H-03 | 过渡流插值；螺旋/入口/非圆/两相套直管；平均h称热点安全 | `method_check_id=COOL-GNIELINSKI-001`, `specified`; `validation_case_id=EXP-COOL-001`, `specified` | `GN75`; NASA NTRS 19830022277; OSTI 836896 |
| **H-05** | `approved_with_limitation`; `numerical`；Darcy压降和管网（摩阻相关式作为注册子方法） | `L,Dh,rho,v,epsilon,sumK,Deltaz[SI]{conditional}`; `network,pump_curve{conditional}` | `Delta p components[Pa],branch flows,workpoint` | Darcy-Weisbach；层流 `64/Re`；Colebrook 正根且 `Re>=1e4`；节点连续+同节点压差+泵曲线 | 单支路→管网→泵交点；Deps A-02,H-03 | Darcy/Fanning；未知粗糙度/K；过渡流；螺旋终值；缺泵曲线仍判可达 | `COOL-COLEBROOK-001`, `specified`; 实测压降 `blocked` | `C39`; NIST TN 2294 |
| **H-06** | `approved_with_limitation`; `analytical`；局部相态/NPSH/数据门禁 | `Tb,Twi,pabs,Tsat,water_quality,NPSHA/NPSHR{conditional}` | `DeltaT_sub_bulk/wall,NPSH comparison,missing data` | `DeltaTsub=Tsat(pabs)-T`; 分段 `dh/dz=q'/mdot`; `Twi=Tb+q''(1/h+Rf'')`; NPSHA按同基准 | 分段温压→IAPWS饱和→壁温→NPSH/OEM；Deps A-02,H-03–05 | 正裕量称安全；出口温代热点；无OEM/泵曲线；表压 | `COOL-WARN-001`, `specified`; 局部热点试验 `blocked` | IAPWS IF97; ANSI/HI 9.6.1; OEM/project data |
| **H-07** | `approved`; `analytical`；新测同控制体水侧能量守恒 | `mdot,Tin,Tout,pin,pout,Qmodel,time_basis,control_volume{req}` | `Qwater,residual,uncertainty` | `Qwater=mdot(hout-hin)`；同控制体/同时段正反算 | 数据边界→物性→能量→残差/不确定度；Deps A-02,H-02 | 不同回路/时段强比；自动改测量；平均量称局部峰值 | `validation_case_id=COOL-ENERGY-001`, `specified`; `validation_case_id=EXP-COOL-001`, `specified` | `DER-ENERGY`; ADR-0006/0008 |

### J — Reusable Thermal-Loss Components

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Method checks / linked validation cases | Sources |
|---|---|---|---|---|---|---|---|---|
| **J-01** | `approved`; `numerical`；圆筒径向导热（常 k 闭式作为注册子方法） | `ri,ro,L,Ti,To,k or k(T),layer radii{req;SI}` | `Rcond,Qcond,interface T` | 单层 `Q=2piLk(Ti-To)/ln(ro/ri)`；多层 `R=sum ln(r_i/r_i-1)/(2pi k_i L)`；变k积分/界面迭代 | 层序→物性→热阻/积分→Q/界面；Deps A-01 | 半径/直径混；k外推/湿态缺；端桥未计；疑义标准印文直编 | `INS-FOURIER-001`, `INS-VARK-001`, `specified` | Fourier/`DER-THERM`; GB8175仅对照 |
| **J-02** | `approved_with_limitation`; `engineering_correlation`；外表面对流路由 | `geometry,orientation,Lc,Ts,Tinf,fluid props,U/wind{req by method}`; `method_id{req}` | `Ra/Re,Pr,Nu,hc,Qconv,domain` | 公共 `h=Nu*k/Lc`；CC75竖直板、CC75水平圆柱、CB77圆柱横掠式见总依据；严格按原特征长度/项目域 | 分类→膜温物性→无量纲→方法/域→Q；Deps A-01, geometry | 任意倾角/混合/阵列/遮挡；固定h无来源；max/幂和混合 | `method_check_id=CONV-CC75-V-001`, `specified`; `method_check_id=CONV-CC75-H-001`, `specified`; `method_check_id=CONV-CB77-001`, `specified` | `CC75-V`; `CC75-H`; `CB77` |
| **J-03** | `approved`; `analytical`；辐射到大环境/同心两灰面 | `T1,T2,epsilon1/2,A1/2,view/configuration{req}` | `Qrad,network factor` | 大环境 `epsilon sigma A(Ts^4-Tsur^4)`；长同心两灰面按面积比网络 | 网络选择→K温标→Q→极限；Deps A表面,geometry,CODATA | 摄氏四次方；等面积简式滥用；视因数/开口忽略 | `RAD-001` 零温差/黑体/互易，`specified` | Stefan-Boltzmann/`DER-THERM` |
| **J-04** | `approved_with_limitation`; `analytical`；线性化辐射与同面积表面系数 | `ε,Ts,Tsur,hc{req;域同J-02/03}` | `hr,hs[W/m²/K]` | `hr=εσ(Ts⁴-Tsur⁴)/(Ts-Tsur)`；等温极限 `4εσT³`; `hs=hc+hr` 仅同面积/边界 | J-02/03结果→极限保护→相加；Deps J-02,J-03 | `0/0`; 不同面积/边界系数相加；用线性hr跨大温区却不更新 | 等温极限与直接辐射 `rtol≤1e-10`, `specified` | `GB8175 A.2` + `DER-THERM` |
| **J-05** | `approved_with_limitation`; `engineering_correlation`；多路径环隙 | `L,orientation,closure,outer_continuity,T_hot,T_cold,gas props{req}`; gap geometry is either `D_i+D_ins_o{preferred derived path}` or measured `s_ann+geometry_mapping_id+uncertainty{conditional}`; `e_ann{optional; 只有明确声明同心时可取0}`; `view{conditional for radiation}`; `path_id{req}` | `classification,s_ann,geometry_residual,Ra,Pr,Nu/keff,hgap,Qgas,Qrad,domain` | 优先由 `s_ann=(D_i-D_ins_o)/2` 派生；受控直接测量路径保存 mapping/不确定度；两种数据同时存在时执行残差校验且测量不得静默覆盖机械直径；水平封闭连续：Raithby-Hollands；竖直封闭连续：Thomas-de Vahl Davis | 几何来源/残差→真实单边间隙→边界分类→物性→方法/域→气体+J-03辐射；Deps A,B,J-03 | 把直径差直接当单边隙；无 mapping 的裸 `s_ann`；测量静默覆盖直径；未知偏心却默认0；`g`重名；开口/离散螺旋/偏心套封闭式；水温代铜温 | `method_check_id=ANN-H-001`, `specified`; `method_check_id=ANN-V-001`, `specified`; `method_check_id=ANN-GEOMETRY-RESIDUAL-001`, `specified`; `method_check_id=ANN-OPEN-FAIL-001`, `specified` | `RH75`; `DT69`; ADR-0006 |
| **J-06** | `approved`; `analytical`；同一控制体总稳态热损 | `Qconv,Qrad,Qends,Qbridges,Qopenings[W]{conditional}`; `control_volume{req}` | `Qloss_total,missing_items,boundary` | `Qtotal=sum Qi`，禁止重叠面积/路径重复 | 控制体→路径/面积→去重→和式；Deps J-01–05 | 串联路径热流相加；热桥/端损未知当0；拾取与环境损失混同 | `THERM-BAL-001`, `specified` | `DER-THERM/ENERGY` |
| **J-07** | `approved_with_limitation`; `numerical`；瞬态热损调用与集总判据 | `T(t),geometry,h,k,ε,thermal mass[SI]{req}` | `Qloss(t)[W],Bi[1]` | 每时步调用J-组件；`Bi=hLc/ksolid` 筛查集总；无批准阈值前不自动判精确 | 状态→A物性→Bi→J损失→交G-03；Deps A,J-01–06,G-03 | Bi大仍集总；h/k不更新；端/热桥时间变化缺；阈值无来源 | 一阶集总解析冷却 `rtol≤1e-6`, `specified`; 分布温度案例 `blocked` | `DER-THERM`; Bi阈值/教材页待登记 |

### I — Thermal Insulation Thickness

| ID | Status / type；Purpose | Inputs | Outputs | Equation；A/A域 | Seq / Deps | Warn | Method checks / linked validation cases | Sources |
|---|---|---|---|---|---|---|---|---|
| **I-01** | `approved_with_limitation`; `numerical`；目标外表面温度最小厚度 | `ri,L,Ti,Ts_target,Ta,Tsur,k(T),epsilon,hc_method,delta_domain,rounding{req}` | `ro,delta,Q,interface T,residual,feasible_intervals` | 每个厚度先解完整侧壁平衡，再求 `Ts(delta)<=target` 可行区；1D径向侧壁 | 有限域扫描→全部物理解/区间→最小可行→向上圆整→重算；Deps A,J-01–04 | 无根/无可行解区分；材料超温；域外对流；端桥缺；圆整不复核 | `method_check_id=INS-FOURIER-001`, `specified`; `method_check_id=INS-ROUND-001`, `specified` | `DER-THERM`; GB8175问题框架 |
| **I-02** | `approved_with_limitation`; `numerical`；目标总/线/面热损最小厚度 | `ri,L,Ti,Ta,Tsur,k(T),epsilon,hc_method{req}`; exactly one of `Qlimit,q'_limit,q''_limit` with area basis; design domain | `ro,delta,Ts,Qactual,all_physical_roots,feasible_intervals,residual` | 每个厚度先解完整表面平衡；再求 `Qtotal(delta)<=limit`；不直编当前存疑标准印文 | 有限域扫描→全部物理解/可行区→最小可行→圆整回算；Deps A,J-01–04 | 负K根；多根静默取错；q''面积基准不明；临界半径非单调；端热损未知 | `INS-DUAL-NONMONO-001`, `specified` | `DER-THERM`; GB8175仅对照/待澄清 |
| **I-03** | `approved_with_limitation`; `numerical`；表温+热损双约束 | I-01完整输入 + I-02损失限值 `{req}` | `delta_design,Ts,Q,pass_flags,feasible_intersection` | `F=F_T intersect F_Q intersect F_M`; 取非空交集最小值；只有证明两个约束向上闭合才可用 `max(delta_T,delta_Q)` | 分别求可行区→交集→最小值→圆整→完整回算；Deps I-01,I-02 | 无交集却报非收敛；无条件max；未回算；端/桥口径不同 | `method_check_id=INS-DUAL-NONMONO-001`, `specified`; `method_check_id=INS-ROUND-001`, `specified` | `DER-THERM`; ADR-0006 |
| **I-04** | `approved_with_limitation`; `numerical`；平壁误差与临界绝热半径筛查（固定 h 闭式为子方法） | `ri,delta,k,h(or nonlinear surface model)[SI]{req}` | `delta/ri,rcrit[m],screening status`, 非线性损失曲线可选 | 固定h圆柱 `rcrit=k/h`；平壁误差由同输入圆筒/平壁热阻比直接计算 | 无量纲比→固定h适用检查→筛查→必要时完整曲线；Deps J-01/J-02 | 含辐射/变h仍把rcrit当精确；项目QA阈值称标准；以筛查替I求根 | `INS-SCREEN-001` rcrit解析 `TOL-ID`, `specified`; 平壁比曲线 `specified` | `DER-THERM`; 受控热传导来源 |

### 保温求解器附录 — 目标热损物理解强制规范

本附录适用于方法 I-02。该方法不允许简单地在“很大的 `ro` 区间”对消元式做一次二分。推荐可直接实现的物理解流程：

1. 输入硬约束：`ro>ri>0`、所有绝对温度 `>0 K`、`Qlimit>0`、`Ti>max(Ta,Tsur)`、材料/相关式数据有效。
2. 建立工程厚度上限 `δmax`，它是必填设计约束或经批准配置，不用无限大默认。
3. 对候选 `ro∈(ri,ri+δmax]`，先在物理温度区间 `Tlow≤Ts<Ti` 内求表面热流平衡；建议 `Tlow=max(Ta,Tsur)`。若过程允许表面低于其中之一，必须另立反向热流场景，而不是放宽同一方法。
4. 或由导热式对给定 `Qlimit` 计算 `Ts(ro)`，但任何 `Ts≤0 K`、`Ts≥Ti` 或不符合外向净热流方向的点立即标无效，绝不把 `Ts^4` 的数学回升当第二个工程根。
5. 仅在物理有效点上构造 `G(ro)=Qsurface(ro,Ts(ro))-Qlimit`，扫描全部变号区间；每个区间用 Brent/二分，保存所有物理解和残差。
6. 若自然对流/临界绝热半径使关系非单调，选择满足全部约束的**最小厚度**，而不是默认“第一个数值根”；同时报告其他物理解及选择理由。
7. 以 `TOL-NUM` 验证导热、对流+辐射和目标热损三者残差；迭代失败返回 `non_converged`，设计域内不存在满足约束的物理解返回 `no_feasible_solution`，方法本身不适用才返回 `not_applicable`。
8. 厚度按批准规格向上圆整后，重新求实际 `Ts,Q`、层间温度、材料温限和相关式适用域。圆整前根不得直接作为最终设计通过值。

---

## 52-ID 覆盖、自洽与实施门禁

### 覆盖清单

`A-01,A-02; B-01,B-02,B-03,B-04,B-05,B-06,B-07,B-08; C-01; D-01,D-02,D-03,D-04,D-05,D-06,D-07; E-01,E-02,E-03; F-01,F-02,F-03; G-01,G-02,G-03,G-04,G-05,G-06,G-07,G-08,G-09,G-10; H-01,H-02,H-03,H-04,H-05,H-06,H-07; J-01,J-02,J-03,J-04,J-05,J-06,J-07; I-01,I-02,I-03,I-04`。

### 实施时必须满足

1. 只实现第 0.2 节为 `approved` 或 `approved_with_limitation` 的方法；受限子方法的每个域检查必须可测试且失败关闭。
2. 几何始终使用 ADR-0003 语义：`g` 只表示匝间净距，热工径向间隙的规范符号为 `s_ann`（`g_rad` 仅为旧文档迁移别名）；真实导体路径缺 `N_rev/delta_z_helix` 时不输出完整端口电阻。
3. 历史/working/archive 数据不得进入运行时、方法注册、默认值、校准、黄金测试或 UI；sealed holdout 依 ADR-0008 管理。
4. A-02 的具体库、首批材料数据、OEM 安全阈值和项目测量是方法/数据发布门；缺失时返回明确状态，不允许相似材料或“常用值”静默补洞。
5. 每个 `DER-*` 保存可复核推导；外部公式保存版次、页/式、原单位与来源状态。公式注册以 `FORMULA_SOURCE_REGISTER.md` 为准。
6. 验证状态和阻断原因分字段；数值求解容差不得冒充模型/试验精度。
7. Series、Parallel、LLC 和变压器按独立拓扑与端口执行。F-03 和 G-09 保持 Deferred，直到独立规范变更。
8. 本轮不实现网站；下一阶段入口和 Definition of Done 见 `HANDOFF_TO_CODEX.md` 与 `GATE_0_REVIEW.md`。
