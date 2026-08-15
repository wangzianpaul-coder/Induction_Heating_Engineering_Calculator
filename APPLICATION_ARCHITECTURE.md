# 电磁感应加热工程计算器：未来应用架构

> 文档状态：v1 受控架构基线；Gate 0 已 PASS，下一开发阶段 Ready for Codex handoff  
> 版本：0.2，2026-08-14  
> 当前轮次边界：仅完成文档同步，不实现网站、计算逻辑、3D 或 FEM 连接器  
> 技术冻结：`IH-EC-V1-G0-2026-08-14-01`；[GATE_0_REVIEW.md](GATE_0_REVIEW.md) 已批准下一开发阶段按受控 allowlist 实现  
> 正式决定：[V1_DECISION_REGISTER.md](docs/decisions/V1_DECISION_REGISTER.md)  
> 配套入口：[CODEX_START_HERE.md](CODEX_START_HERE.md) · [HANDOFF_TO_CODEX.md](HANDOFF_TO_CODEX.md)

## 1. 架构结论

未来应用应采用“工程计算内核与产品界面彻底分离”的模块化架构。本轮只同步冻结规则，不实现语言、框架、网页、三维渲染器或 FEM 连接器；下一开发阶段可依 Gate 0 的方法 allowlist 开始实现。

十五项用户决定在本架构中的核心后果如下：

1. 最终产品、运行时结果包和 UI 不包含截图校对、成熟软件复现置信、截图残差或黑箱校准轨。
2. 旧聊天、截图、工作簿、师傅批注和旧原型只具有 archive/audit 角色；不得成为运行时依赖或产品数据集。受控一手技术来源可保存在 references，但必须经来源注册引用。
3. 所有科学结果由经批准的方法、SI 数据、材料快照、明确拓扑、适用域、warnings 和验证状态共同决定。
4. 实际工况测量可以用于参数辨识或有边界的工程标定；实测值优先于一般估算，但二者必须分开保存和显示。
5. 材料系统采用三级数据模型，并提供 Material Comparison；不同来源不得静默平均。
6. 普通串联、两种并联网络、理想匹配变压器和任何未来拓扑绑定 LLC 必须是独立方法族；本冻结的 G-09/LLC 仍为 Deferred，未知拓扑不计算电容、变比或器件应力。
7. 冷却、保温、热损和环隙换热使用重建后的控制体与边界；历史 783 kW/135 L/min 不进入输入校准或验证。
8. 技术冻结后才允许开发；参数化 3D 和未来 FEM 导入属于后续受控能力，不是本阶段的实现任务。

## 2. 产品边界

### 2.1 目标

- 让工程师逐公式复核输入、输出、方程、单位、来源、假设、适用域和验证状态。
- 统一 A–L 工程模块的参数、物性、单位、warnings、结果血缘和依赖关系。
- 支持多方法并行计算与 Recommended 选择，同时保留不适用和数据不足结果。
- 支持三级材料数据与同状态 Material Comparison。
- 支持温变物性、插值、数值积分、求根、ODE 和显式多物理耦合。
- 支持参数化工程 3D 预览；所有几何来自同一 canonical GeometrySnapshot。
- 为未来外部 Maxwell、ANSYS、COMSOL 或其他 FEM 数据导入保留求解器无关接口。
- 支持设计案例保存、版本锁定、可重算、验证数据导入和工程报告导出。

### 2.2 非目标

- 不内置通用电磁、热流体或结构 FEM 求解器。
- 不根据理想解析几何伪精确预测复杂耦合、热态负载、邻近效应或局部热点。
- 不把外部 FEM 场图转化为普适解析公式。
- 不让 3D 图形对象成为几何真值；真值始终是经验证的参数快照。
- 不在本阶段确定 JavaScript 框架、数据库、渲染库、部署平台或页面布局。
- 不在产品中保留截图复现、黑箱校准或旧软件兼容模式。

## 3. Source of Truth 优先级

当文件、历史记录或模型结论冲突时，按以下顺序裁决：

| 优先级 | 对象 | 权限 |
|---:|---|---|
| 1 | 用户正式决定和已批准 ADR | 决定产品边界、范围、责任和取舍 |
| 2 | 已批准的 CALCULATION_BASIS.md 与 CALCULATION_CONTRACTS.md | 决定公式、参数、适用域、warnings 和执行顺序 |
| 3 | 已批准的数据字典、方法注册、材料数据包、受控一手技术来源和 FORMULA_SOURCE_REGISTER.md | 决定机器语义、公式来源、单位、状态和数据版本 |
| 4 | 已批准验证协议、原始测量、sealed holdout、FEM manifest 和签字结果 | 决定方法能否提升批准状态 |
| 5 | APPLICATION_ARCHITECTURE.md 与交接文件 | 决定系统分层、依赖、接口和开发门禁 |
| 6 | PROJECT_AUDIT.md | 保存冲突、错误、历史谱系和未决问题 |
| 7 | archive/audit 中的旧聊天、工作簿、截图和旧原型 | 只读历史证据，不能直接裁决产品结果 |
| 8 | working | 临时研究和 QA，不是批准依据 |

若上游对象仍为 `draft` 或 `insufficient_evidence`，下游不得自行推断“已经批准”。冲突尚未正式解决时采用更严格的工程处置，并以 `insufficient_data` 或 `blocked` 失败关闭。

### 3.1 受控语义文件

- 决定：[V1_DECISION_REGISTER.md](docs/decisions/V1_DECISION_REGISTER.md)
- 参数：[ENGINEERING_PARAMETER_DICTIONARY.md](docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md)
- 端口与拓扑：[ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md](docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md)
- 方法/状态：[METHOD_STATUS_DICTIONARY.md](docs/METHOD_STATUS_DICTIONARY.md)
- 材料：[MATERIAL_DATA_MODEL.md](data/materials/MATERIAL_DATA_MODEL.md)
- 验证与 3D/FEM：[VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md](docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md)
- 最小协议：[MINIMUM_VALIDATION_PLAN.md](validation/protocols/MINIMUM_VALIDATION_PLAN.md)

## 4. 总体分层

| 层 | 责任 | 明确禁止 |
|---|---|---|
| UI/报告层 | 参数输入、参数定义页、方法比较、3D 预览、warnings 和追踪展示 | 含工程公式、私有单位转换、隐藏默认值 |
| Application 层 | 案例生命周期、模块编排、方法选择、Recommended、导入导出 | 自己实现物理公式 |
| Domain 层 | Quantity、Parameter、MaterialSnapshot、GeometrySnapshot、Topology、Result 等稳定对象 | 依赖具体网页或数据库 |
| Method 层 | 纯计算方法、适用域、warnings、验证绑定 | 静默读取全局状态、调用 UI |
| Property 层 | 三级材料查询、插值、比较和快照 | 各模块复制材料常数 |
| Numerics 层 | 积分、求根、ODE、收敛和误差报告 | 隐藏失败或返回伪收敛 |
| Orchestration 层 | DAG、外层电热/水热迭代、控制体守恒 | 模块互相递归直到碰巧收敛 |
| Validation 层 | schema、协议、黄金数据、sealed holdout、差异报告 | 用被测实现生成黄金值 |
| Interchange 层 | 案例、测量、FEM 和未来 3D 数据交换 | 将导入文件自动提升为真值 |
| Audit/Archive 层 | 历史只读保全、hash 和调查报告 | 被 runtime 或 UI 查询为计算输入 |

数据流必须是单向的：

参数字典与批准数据 → CaseSnapshot → A–J 方法 → K 编排/守恒 → ResultPackage → UI/报告与 L 可视化。

L 模块不得反向修改 A–K 结果。3D 交互若将来允许修改参数，也必须先回到参数校验层生成新的 CaseSnapshot。

## 5. A–L 工程模块

| 模块 | 名称 | 核心责任 | 主要上游 | 主要下游 |
|---|---|---|---|---|
| A | Shared Material & Physical Properties | 三级材料、物性查询、插值、比较、快照 | 批准数据包、用户场景 | B–K |
| B | Coil Geometry & Inductance | canonical 几何、导体路径、空芯电感方法 | A、参数字典 | C、D、F、L |
| C | Inductance Method Comparison & Validation | 多方法并算、Recommended、无量纲扫描 | B、方法注册 | UI、验证、K |
| D | Coil Electrical Parameters | 长度、DC/AC 电阻、皮深、损耗、阻抗、Q | A、B、测量 | F、G、H、K |
| E | Workpiece EM & Heating Parameters | 工件皮深、温变电磁属性、频率权衡、Curie warnings | A、工件几何 | F、G、K |
| F | Coil–Workpiece / Equivalent Load | Req/Leq、反射项、测量辨识、限定估算 | B、D、E、测量/FEM | G、K |
| G | Heating & System Electrical | 能量、功率、效率、独立电源拓扑、变压器 | A、D、F、J | H、K |
| H | Cooling Water | 热负荷、流量、速度、Re、压降和安全 warnings | A、D、G、J | K、L |
| I | Thermal Insulation Thickness | 目标表温、目标热损、圆筒多层求根 | A、J、几何 | K、L |
| J | Reusable Thermal Loss Components | 圆筒传导、对流、辐射、端损、环隙边界 | A、几何、环境 | G、H、I、K |
| K | Integrated Case Orchestration & Balance | CaseSnapshot、DAG、外层迭代、守恒、trace | A–J | ResultPackage、L |
| L | Parametric 3D & FEM Interchange | 参数化 3D、标量叠加、FEM manifest/import/reference | B、H、I、K、外部 FEM | UI、验证、报告 |

### 5.1 A — Shared Material & Physical Properties

材料只能通过共享 MaterialService 取得。每次计算先冻结 MaterialSnapshot，后续模块引用 snapshot ID，禁止重新查“最新值”。

最低物性：

- 线圈材料：电阻率/电导率、热导率、比热、密度、热膨胀；
- 工件：上述热物性，以及相对磁导率、B-H/损耗、Curie/相变信息；
- 绝热材料：导热率、比热、密度、发射率、最高使用温度和状态；
- 水/冷却介质：密度、比热、黏度、热导率、饱和温度；
- 空气/环隙气体：密度、比热、黏度、热导率、体膨胀系数、Pr；
- 辐射表面：发射率及氧化、涂层、粗糙度和温度状态。

跨 Curie、相变、数据段断点或来源有效域时，默认阻止外推。

### 5.2 B — Coil Geometry & Inductance

canonical 几何必须使用用户批准的语义：

| 参数 | 含义 |
|---|---|
| D_i / D_o / D_m | 线圈内径、外径、几何平均直径 |
| D_c | 电流中心路径直径；缺少更可靠模型时默认 D_m，并触发高频/粗管 warning |
| d_rad / d_ax | 导体径向、轴向尺寸 |
| p / g | 节距、匝间轴向净距；参数 ID 为 coil.turn_clearance_axial，若 UI 保留 g_turn 仅作显示别名 |
| b_cc / b_env | 首末匝中心距、外包络高度 |
| N / N_rev | 电气匝数、导体路径实际回转数 |
| lead_length | 引线/母排显式附加长度 |

B 模块同时管理工件、绝热层、环隙和冷却通道几何的稳定 ID。L 模块只能消费这些定义。

空芯电感方法至少分开：理想长螺线管、Wheeler、Nagaoka/Lundin 电流片、离散圆环/互感、数值积分。所有适用方法均可执行；Recommended 根据几何、方法状态和 warnings 产生，不按历史硬切换。

### 5.3 C — Inductance Method Comparison & Validation

C 模块用同一个 GeometrySnapshot 和 MaterialSnapshot 运行所有适用方法，输出：

- 各方法结果、method version、approval status、scientific confidence；
- 对批准参考的绝对/相对误差；
- 方法间极差，但不得把“方法互相接近”称为独立验证；
- `b_env/D_c`、`p/d_ax`、`d_rad/D_c`、`N`、`k_fill,axial` 等明确语义的无量纲扫描；
- Recommended 及选择理由；
- not_applicable、insufficient_data 和 out_of_domain 不得从比较中隐藏。

### 5.4 D — Coil Electrical Parameters

固体圆线、空心圆管、矩形导体必须是独立几何策略。D 模块分开输出导体本体、引线/母排、接头和端口总量。

Rac 路径分为：

1. approved_with_limitation 的解析/工程估算；
2. actual-condition measurement identified；
3. empirical_calibrated；
4. FEM reference。

当同状态实测 Rac 存在时，默认 Recommended 为实测辨识；估算结果仍保留作比较。任何覆盖必须记录 f、T、I、安装状态、工件状态和去嵌入边界。

### 5.5 E — Workpiece EM & Heating Parameters

E 模块负责 SI 皮深、频率—透入权衡、材料温变、Curie warnings 和解析模型适用性。μr 必须绑定 T、H、f 和材料状态；没有可靠状态数据时不生成伪精确加热深度或“最佳频率”。

推荐/临界频率只能作为有来源、几何受限的方法，不得成为材料常数。

### 5.6 F — Coil–Workpiece / Equivalent Load

F 模块输出统一串联端口的 Req、Leq 和来源：

- measurement_identified：首选高可信路径；
- analytical_estimate：只有明确 M、R2、L2 或获批几何模型时；
- empirical_calibrated：仅由新的实际项目测量或批准数据建立，并绑定校准域；
- fem_reference：外部数据，不冒充解析公式。

每个结果必须显示 predicted/identified/reference、输入包络、不确定度和 measurement override 状态。不得为填满功能发明耦合系数、Kq 或间隙公式。

### 5.7 G — Heating & System Electrical

有用热、加热时间、损失、效率和所需电源功率按明确控制体计算。网侧、整流端、逆变桥、槽路、线圈端和工件吸收功率必须分别命名。

电源 topology ID 至少包括：

- series_rlc_single_loop；
- parallel_ideal_r_l_c_branches；
- parallel_c_with_series_rl_load；
- ideal_transformer；
- llc_zjl_fig2_6_fundamental_equivalent（仅保留命名与研究槽位；G-09 在本冻结中 `deferred`）。

全局采用 RMS 相量、被动符号约定和明确 port ID。普通串联、两类并联和任何未来 LLC 都不得共享一个“谐振电容”函数。本冻结只运行前三类补偿网络和理想变压器；LLC 选择必须返回 `insufficient_data`/Deferred 诊断。只有后续 ADR、完整 netlist、端口、基波/全波假设、参数、来源与验证全部批准后，才能启用某个拓扑绑定 LLC 方法。

### 5.8 H — Cooling Water

批准的计算链：

热负荷控制体 → 允许温升 → 质量/体积流量 → 支路速度 → Re → 摩擦/局部压降 → 泵与安全 warnings。

铜损、工件/环境热拾取和其他冷却负荷分列；未知热负荷不得静默为零。历史 783 kW/135 L/min 只留 PROJECT_AUDIT 的控制体冲突，不进入任何产品输入、默认、校准、黄金值或验证。

### 5.9 I — Thermal Insulation Thickness

I 模块必须把两个问题分开：

1. 达到目标外表面温度的厚度；
2. 达到目标总热损上限的厚度。

采用多层圆筒 Fourier 热阻、外表面对流/辐射和完整能量平衡求根。双约束时分别求解，选择满足两者的厚度并回算。GB/T 疑式澄清前不进入执行路径。

### 5.10 J — Reusable Thermal Loss Components

J 模块提供可复用的圆筒传导、外部自然/强制对流、辐射、端部近似、未保温/保温表面损失和环隙换热组件。

环隙按方向、开闭、同心/偏心、自然/强制流和相关式验证域建不同 method ID。边界未确认时只允许传导/辐射基线与 FEM/实验建议。

### 5.11 K — Integrated Case Orchestration & Balance

K 模块拥有所有跨模块循环：

- Req/Leq ↔ 电流/功率 ↔ 工件温度；
- Rac ↔ 铜损 ↔ 水温/铜温；
- 绝热厚度 ↔ 表面温度 ↔ h/辐射；
- 冷却热拾取 ↔ 线圈/水温。

A–J 方法保持无副作用，不互相递归。K 记录状态向量、迭代顺序、松弛、残差、最大迭代数、能量闭合和非收敛状态。

### 5.12 L — Parametric 3D & FEM Interchange

L 有两个明确子域：

**参数化工程 3D**

- 从 GeometrySnapshot 生成工件/炉管、逐层绝热、真实径向空气隙、螺旋空心水冷铜管线圈、内部冷却路径、引线/母排、可选支撑、端口和坐标轴；
- 管径/壁厚、工件直径、保温厚度、线圈机械直径、匝数、节距、轴向长度或引线变化时实时重建；
- 支持 rotate、zoom、pan、section/cut、layer visibility、透明度、组件拾取和尺寸标注；
- 可显示批准的温度标量、skin/penetration depth、冷却流向、热流方向和电磁作用示意；非导入 FEM/CFD 空间场必须标 `schematic_or_illustrative` 并使用不同图例/水印；
- 非实物细节必须标 simplified，例如离散平面圆环与真实螺旋的差异；
- 没有 FEM 场数据时不得生成貌似电磁/温度场的伪彩云图。

**未来 FEM 导入**

- 求解器无关 manifest：solver/version、model hash、CAD/mesh hash、2D/3D、坐标系、长度单位；
- 材料数据版本、边界、激励 port、频率、RMS/peak/phasor 基准；
- 网格统计、收敛、能量闭合和原始导出 hash；
- 标量积分 Req、Leq、Pcu、Pworkpiece、热流、压降及其定义；
- 可选场数据的 component、location、time/frequency、complex convention 和插值规则；
- 至少预留 ANSYS Maxwell、ANSYS Thermal、COMSOL 的 temperature、magnetic flux density、current density、volumetric heat generation 和时间序列导入；viewer 支持这些导入场的剖切、旋转、缩放和时间步浏览；
- 导入映射失败、单位未知或坐标不一致时返回 invalid_input/insufficient_data；网格不收敛时返回 non_converged，并触发 blocking warning。

外部 FEM 结果只能作为 fem_or_experiment_reference。导入不得更改批准公式、材料默认值或 GeometrySnapshot。

## 6. 三级材料与 Material Comparison

### 6.1 三个等级

| 等级 | machine value | 定义 | 允许用途 |
|---|---|---|---|
| 1 | preset_common | 版本化常用工程材料预置库；每条属性仍有 data_quality | 初步设计、材料比较和项目材料缺失时的限定计算 |
| 2 | project_material | 厂家、标准、试验或项目确认的实际材料数据 | 同状态覆盖时默认 Recommended |
| 3 | user_defined | 用户明确输入并保存的常数、表格或曲线 | 明确项目场景/灵敏度；保留来源与质量标签 |

Recommended 不是简单按编号选取：候选数据必须覆盖当前 T、f、H、压力、相态和表面状态。有效的 project_material 优先；用户在当前设计中明确选择的 user_defined 可形成新的项目快照；否则才使用域内 preset_common。任何覆盖都生成新 revision，不静默改写原记录。

### 6.2 MaterialRecord

最低字段：

- material_id、display_name、grade、batch/heat-treatment/state；
- material_level、approval_status、dataset_version；
- property_id、dimension、SI unit、constant/table/function；
- independent variables 与 data points；
- valid domain、interpolation、extrapolation policy；
- uncertainty、test condition、surface condition；
- source hash、页/表/图、reviewer 和 approval date。

### 6.3 Material Comparison

Material Comparison 使用同一个状态网格比较多个 MaterialRecord：

- 叠加 ρe、μr、k、cp、ε 等曲线和不确定度带；
- 明示 preset_common/project_material/user_defined、data_quality、来源、数据覆盖、插值和外推；
- 显示差值对皮深、Rac、热量、热损和冷却的敏感性；
- 不平均冲突来源，不把曲线接缝隐藏为平滑真值；
- 用户选择只生成新的 MaterialSnapshot，不回写原始记录。

## 7. 方法注册与 Recommended

每个方法必须在 MethodRegistry 中具有稳定记录：

| 类别 | 必填字段 |
|---|---|
| 身份 | method_id、method_version、module_id、engineering_name |
| 分类 | method_type、approval_status、scientific_confidence、lifecycle_status |
| 契约 | purpose、input/output parameter IDs、equations、sequence、dependencies |
| 范围 | physical range、method range、assumptions、applicability predicates |
| 安全 | warning predicates、blocking predicates、failure semantics |
| 证据 | source refs、derivation revision、validation IDs、executed status、tolerances |
| 展示 | Recommended eligibility、precision policy、trace template |

产品允许的方法类型：

- analytical；
- engineering_correlation；
- numerical；
- measurement_identified；
- empirical_calibrated，仅由新的项目实测或批准数据建立；
- fem_or_experiment_reference。

禁止在产品 registry 中出现 screenshot reproduction、black-box confidence、legacy screenshot profile 或截图标定 method type。旧记录若保留，必须只在 archive/audit registry。

Recommended 选择顺序：

1. 过滤 approval_status 非 approved/approved_with_limitation；
2. 运行 applicability predicates；
3. 优先同状态独立实测辨识；
4. 在可用方法中按科学证据、状态覆盖和不确定度选择；
5. 返回选择理由和被排除方法；
6. 若无合格方法，返回 insufficient_data，不降级到历史或未批准公式。

空芯线圈电感的 v1 专项规则已经冻结：对满足有限长电流片假设的空气芯单层线圈，B-04 Nagaoka/Lundin 为 Recommended 分析基线；B-03 长螺线管和 B-05 Wheeler 单层式只作限域比较。稀疏或少匝线圈仅当 B-07 离散圆环模型自身的薄、圆、实心导体及几何假设全部成立时，才可把 B-07 选为 Recommended；否则不得强选解析法，输出 FEM/同状态测量建议。不得添加无一手依据的通用匝数、节距或百分差硬阈值。

## 8. 参数字典与参数定义页

### 8.1 ParameterRecord

每个输入/输出必须有唯一 parameter_id：

| 字段 | 要求 |
|---|---|
| identity | parameter_id、symbol、Chinese/English name、module owner |
| dimension | dimension vector、canonical SI unit、allowed display units |
| role | input/output/derived/state/solver setting |
| requirement | required/optional、条件必填表达式 |
| default | 默认值、来源、是否允许；无依据则 none |
| ranges | physical range、method-specific range |
| state | T/f/H/pressure/phase/port/geometry basis |
| provenance | user/material/measurement/derived/fem reference |
| dependencies | upstream parameter IDs、derivation method ID |
| warnings | range、domain、unit、ambiguity predicates |
| precision | input resolution、display significant digits、uncertainty |

### 8.2 参数定义页逻辑要求

未来 Parameter Definition Page 必须由 ParameterRegistry 自动生成，而不是手写另一套说明。它至少支持：

- 按 A–L、输入/输出、符号和工程名称检索；
- 显示 SI、可选显示单位、范围、默认来源和必填条件；
- 显示参数被哪些方法消费、由哪些结果产生；
- 显示几何示意与 D_i/D_o/D_m/D_c、b_cc/b_env 等差异；
- 显示端口、RMS/peak、series/parallel equivalent 语义；
- 显示当前案例值的 provenance、warnings 和 MaterialSnapshot；
- 链接 CALCULATION_CONTRACTS、FORMULA_SOURCE_REGISTER 和验证案例。

参数定义页只读 registry；不得在页面代码中重定义公式或默认值。

## 9. 单位、量值与状态

### 9.1 SI 边界

- 所有方法只接收 canonical SI；
- UI/导入边界把原值和原单位转换为 SI，同时保存原始表示；
- 温度与温差分开，内部绝对温度为 K；
- Ω·cm、µΩ·cm、mm、inch 等只在边界转换；
- 公式中禁止隐藏 10、1000、60、1.35 等单位/拓扑常数；
- 每个转换有 round-trip 和 dimension test。

### 9.2 Quantity

最低字段：parameter_id、value_si、unit_si、display value/unit、uncertainty、source kind/ref、state key、valid digits。

### 9.3 状态分离

| 字段 | 用途 |
|---|---|
| approval_status | 方法能否进入正常产品结果 |
| specification_completeness | missing/partial/complete |
| validation_status | not_defined/specified/blocked/running/executed_pass/executed_fail/executed_unjudged/not_required |
| result_status | success/success_with_warnings/not_applicable/insufficient_data/non_converged/no_feasible_solution/invalid_input/inconsistent_measurement |
| applicability_status | in_domain/at_boundary/out_of_domain/not_evaluated |
| scientific_confidence | high/engineering_approximation/needs_verification/fem_or_experiment_recommended/rejected |
| lifecycle_status | active/deprecated/retired |

不得把用户范围批准、方法批准、数据血缘、验证执行和运行成功拼成一个状态字符串。

## 10. Warnings 与失败安全

稳定 WarningRecord：

- warning_id、severity、module/method、parameter IDs；
- predicate 和 observed values；
- message、engineering consequence、recommended action；
- source/decision reference；
- blocks_result 布尔值。

severity：info、caution、warning、blocking、fatal。

最低 warnings：

- 物理无效输入、单位歧义、半径/直径混淆；
- 材料域外、跨 Curie/相变、M3 场景值；
- 方法几何/频率/流态/拓扑域外；
- D_c 默认 D_m、高频粗管、少匝/大节距；
- 实测状态与当前状态不匹配；
- 拓扑未知、端口混用、RMS/peak 混用；
- 控制体热负荷未闭合、重复计损失；
- 数值非收敛、能量残差超限；
- FEM 单位/坐标/边界/网格证据不足。

blocking/fatal 时只返回诊断，不生成普通数值或绿色状态。

## 11. CaseSnapshot、ResultPackage 与计算追踪

CaseSnapshot 锁定：

- schema、decision、basis、method registry 和 warning rules 版本；
- 原始输入与 SI 输入；
- GeometrySnapshot、MaterialSnapshot；
- topology/port/phasor 定义；
- 方法选择、measurement override 和 FEM reference IDs；
- solver settings；
- 附件 hash，但历史审计附件不成为运行时输入。

ResultPackage 至少包含：

- value、unit、uncertainty/precision；
- method/version、approval、scientific confidence；
- material/geometry/case versions；
- applicability 和 warnings；
- result_provenance：只采用 METHOD_STATUS_DICTIONARY 当前冻结枚举；FEM/实测质量另记 data_quality，sealed holdout 的通过与否记录在 validation_status，不混入 provenance；
- trace DAG 和每步公式/代入值；
- solver report、energy residual；
- 推荐方法和比较结果。

产品 schema 不包含 screenshot residual、black-box reproduction confidence 或 screenshot-calibrated provenance。

## 12. 验证、sealed holdout 与门禁

### 12.1 数据角色

产品与验证交接只使用冻结的 `dataset_role` 六值枚举：

- `development`：方法开发数据，不得作为独立验证；
- `calibration`：仅供新项目有界经验模型校准，与验证/留出物理隔离；
- `validation`：按预注册协议执行的普通验证数据；
- `sealed_holdout`：冻结后取得、目标对开发者隐藏且由独立 evaluator 开封的数据；
- `external_validation`：独立第三方实测或经批准的外部 FEM/CFD 验证数据；
- `audit_only`：只能解释历史、来源或审计谱系，不得进入模型拟合、推荐、验证评分、runtime 或 UI。

历史截图、工作簿、旧聊天和旧原型永远是 `audit_only`。

### 12.2 Freeze 规则

模型冻结 manifest 必须记录公式/实现 hash、特征、预处理、参数、校准数据、输入域、warnings、solver、metrics、阈值、运行环境和签字角色。冻结后取得 sealed 数据，由独立 evaluator 运行一次。任何模型或阈值变化产生新版本和新 holdout。

### 12.3 Gate

| Gate | 要求 |
|---|---|
| Gate 0 技术依据 | 15 决定入 ADR；A–L 合同、参数/材料/拓扑/状态字典、来源和验证协议完整；v1 方法获批或明确排除 |
| Gate 1 实现忠实 | 仅在 Gate 0 后；SI、公式、端口、警告和失败语义测试通过 |
| Gate 2 科学验证 | 解析极限、文献/推导、独立复算、实际测量/FEM重叠案例通过 |
| Gate 3 Sealed validation | empirical_calibrated 按冻结协议通过新独立 holdout |
| Gate 4 系统一致性 | 功率、能量、流量、拓扑和外层耦合残差通过 |
| Gate 5 产品安全 | 域外、数据不足、非收敛和导入错误均失败安全 |
| Gate 6 可重现/迁移 | 版本锁定、保存重算、schema migration 和不可变验证数据通过 |

Gate 0 已由 [GATE_0_REVIEW.md](GATE_0_REVIEW.md) 裁决为 **PASS**。本轮仍保持 documentation-only；下一开发阶段可实现 `approved` 与 `approved_with_limitation` 方法。其余 Gate 是实现、科学验证、数据和发布门，不否定基础计算内核的开发入口。

## 13. 测量和 FEM 证据边界

最低实测族：

- 空载/冷工件/多温点端口阻抗；
- DC/AC 线圈电阻与量热交叉检查；
- 冷却流量、温升、压降、壁温和控制体热平衡；
- 保温外表温度、热流、瞬态和环隙边界。

最低 FEM 族：

- 与实测同几何/材料/边界的 2D axisymmetric 基准；
- 引线、真实螺旋、偏心和非轴对称结构的 3D 案例；
- 至少三档网格、能量闭合、求解器/材料/边界版本；
- FEM 未经实验锚定时只能 reference，不决定 method approval。

## 14. 导入、导出和历史隔离

### 14.1 产品允许导入

- 规范 CaseSnapshot；
- preset_common/project_material/user_defined MaterialRecord；
- 批准测量 protocol 的原始记录；
- 完整 manifest 的 FEM 数据；
- 已批准验证 case。

### 14.2 历史导入

旧 Excel、截图、聊天导出和旧网页只能由离线审计工具读取，输出到 archive/audit 报告。它们不得：

- 进入产品案例；
- 创建 MaterialSnapshot；
- 注册 runtime method；
- 生成 Recommended；
- 充当 calibration 或 sealed holdout；
- 在最终 UI/报告显示“复现误差”。

### 14.3 导出

- 可重算案例包；
- 工程审阅报告；
- 方法/材料比较表；
- 验证包；
- 参数化 3D 几何包；
- FEM reference manifest 与差异报告。

导出必须注明方法、材料、case、warnings、适用域、是否实测/FEM reference 和未计入项。

## 15. 建议目录结构（未来，当前不创建）

    docs/
      decisions/
      methods/
      data-dictionary/
      validation-protocols/
    data/
      constants/
      materials/
        preset_common/
        project_material/
        user_defined/
      measurements/
      validation/
      fem-reference/
      schemas/
    validation/
      protocols/
      sealed/
      results/
      review/
    references/
      primary_sources/
    archive/
      audit/
      legacy/
    src/
      domain/
      units/
      properties/
      methods/
      modules/A_to_L/
      numerics/
      orchestration/
      validation/
      interchange/
      ui-adapter/
    tests/
      dimensions/
      formulas/
      materials/
      applicability/
      topology/
      numerics/
      balances/
      measurement-fem/
      serialization/

这只是逻辑建议。当前不得据此创建代码或选择框架。

## 16. 参数化 3D 与未来 FEM 导入的产品约束

未来 3D 视图至少提供：

- canonical 几何与尺寸标注；
- 输入变化前后 GeometrySnapshot diff；
- 方法适用域相关尺寸比；
- 冷却支路和端口标识；
- 标量结果的明确 provenance；
- imported FEM field 与工程估算颜色/图例严格分开。

3D Definition of Done：

1. 同一参数快照计算与 3D 使用相同几何；
2. D_i/D_o/D_m/D_c、b_cc/b_env、N/N_rev 无歧义；
3. 几何 hash 可重现；
4. 视图不能生成不存在的物理场；
5. 修改参数必须重新校验并生成新 case。

FEM Import Definition of Done：

1. 单位、坐标、网格、材料、边界、激励、相量和 solver version 完整；
2. 原始文件与 manifest hash 匹配；
3. 积分量定义可追踪；
4. 网格/能量证据通过批准阈值；
5. 数据只进入 fem_reference，不改公式或默认材料；
6. 缺字段时返回 insufficient_data 和 blocking warning，而不是猜测。

## 17. 禁止事项

- 在本轮文档同步中实现网站、src 计算逻辑、3D 渲染或 FEM 连接器；下一开发阶段必须按 Gate 0 allowlist 和后续门禁实施。
- 在 runtime、UI、结果包、方法 registry 或产品测试中出现截图复现/黑箱校准轨。
- 从历史表格或截图输出反调方法常数。
- 在 UI、导入映射或报告模板中实现工程公式。
- 不经参数字典传递裸 number 或隐藏单位换算。
- 各模块私有定义铜、水、钢、绝热或发射率默认值。
- 材料来源冲突时静默平均，或跨 Curie/相变静默外推。
- 用方法间接近、数值收敛或 FEM 单案例冒充物理验证。
- 混用串联、并联、LLC、网侧/线圈端、RMS/peak 或 series/parallel equivalent。
- 用一个效率重复覆盖电源、电磁、热损多个边界。
- 让 L/3D/FEM 导入反向改写 GeometrySnapshot、MaterialSnapshot 或公式。
- 验证失败后无审批更新黄金值、阈值或 sealed 数据。
- 对 insufficient_data 返回伪精确数字。

## 18. 路线图（Gate 0 已通过；从下一开发阶段执行）

### Phase 0 — Technical Freeze（已完成）

- 以 ADR-0002 至 ADR-0009 和 V1_DECISION_REGISTER 作为已 Accepted 的决定基线；
- 已移除产品架构中的旧截图/黑箱语义并统一冻结枚举；
- 冻结 A–L 计算合同、参数字典、三级材料、拓扑和状态；
- 补齐方法来源和验证协议；
- 已定义高风险最小试验/FEM协议；其执行状态作为对应功能的验证/发布门；
- [GATE_0_REVIEW.md](GATE_0_REVIEW.md) 已签署 PASS，技术冻结 ID 已生效。

### Phase 1 — Foundation

- 下一开发阶段从本 Phase 开始；
- SI Quantity、ParameterRegistry、MethodRegistry、MaterialService、warnings/status；
- 单位、量纲、schema 和 trace；
- 不连接 UI。

### Phase 2 — Low-coupling Modules

- A、B、C、D 中已批准方法；
- E、I、J 的高置信基础方法；
- 公式/极限/材料测试。

### Phase 3 — System Modules

- F、G、H 与 K；
- 独立电源拓扑；
- 测量 override、外层耦合和守恒。

### Phase 4 — L and Interchange

- 参数化 3D；
- 测量和 FEM manifest/import；
- 参考结果叠加与验证报告。

### Phase 5 — Product UI

- 参数定义页、材料比较、方法比较、warnings、trace、3D；
- UI 只消费稳定 application/domain API；
- 不引入截图复现或历史校准模式。

## 19. Architecture Definition of Done

本架构只有满足以下条件才可标记 approved：

- 15 项正式决定均映射到 ADR、模块和测试门禁；
- A–L 每个模块有 owner、输入、输出、method IDs、依赖、warnings 和验证；
- 三级材料及 Material Comparison schema 获批；
- 几何、参数、SI、状态、端口和电源 topology 字典唯一；
- MethodRegistry 和 Recommended 规则获批；
- CaseSnapshot、ResultPackage、trace、warning schema 获批；
- 实际测量 calibration 与 sealed holdout 规则获批；
- 参数化 3D/FEM import 边界和 manifest 获批；
- 产品/runtime/UI 无截图复现、黑箱校准和历史工作簿依赖；
- Gate 0 签字且 technical_freeze_id 已生成；
- CODEX_START_HERE.md 与 HANDOFF_TO_CODEX.md 链接和术语同步。

## 20. 当前状态与已知同步项

已具备的正式基线：

- ADR-0002 至 ADR-0009 和 V1_DECISION_REGISTER 已 Accepted；
- ENGINEERING_PARAMETER_DICTIONARY 为 Frozen semantic baseline；
- ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY 已冻结端口和五个 topology ID；
- METHOD_STATUS_DICTIONARY 与 VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY 为 Approved architecture；
- MATERIAL_DATA_MODEL 与 MINIMUM_VALIDATION_PLAN 已批准架构/协议基线；
- CALCULATION_BASIS 已形成 v1 Gate 0 受控技术基线并声明 freeze ID。

[GATE_0_REVIEW.md](GATE_0_REVIEW.md) 已裁决 **PASS**，`IH-EC-V1-G0-2026-08-14-01` 为下一开发阶段的有效冻结基线；全局 blocking issue 为零。

仍保留的都是依赖功能的数据/发布门，不是基础内核开发阻断：

- preset_common 的属性级来源审查、具体 project_material 和 OEM/项目安全阈值；
- 实际机器 Req/Leq、邻近效应主导 Rac、局部热点和复杂开放环隙所需的实测/FEM；
- `empirical_calibrated` 所需的新项目校准数据及冻结后 `sealed_holdout`；
- G-09 通用 LLC、复杂环隙、两相冷却、通用几何耦合等 Deferred 能力。

本轮只允许修订文档，不写代码。下一开发阶段允许按 Gate 0 allowlist 实现基础设施和获批方法；`deferred`、`insufficient_evidence`、缺少必要项目数据或域外分支必须失败关闭，不能用隐藏默认值补齐。

后续 Codex 必须先阅读 [CODEX_START_HERE.md](CODEX_START_HERE.md)，再按 [HANDOFF_TO_CODEX.md](HANDOFF_TO_CODEX.md) 执行；冻结语义发生变化时通过 ADR/spec revision 和回归复审，而不是静默修改。

## 21. Desktop-first 产品壳与信息架构

产品是专业工程计算应用，不是表格网页或展示 Demo。主目标为 Windows、Chrome/Edge、1920×1080、100%–125% scaling，并检查 1366×768 与 2560×1440。

建议桌面 shell：左侧 persistent module/project/case navigation；中间工程输入、方法、材料和结果；右侧可折叠/可调整 3D/Geometry 区；底部或 tab 区承载 Results、Method Comparison、Warnings、Calculation Trace 和 References。布局组件可以调整，但不得改变 A–L owner、参数语义、结果状态或 trace 来源。

UI 由 ParameterRegistry、MethodRegistry、MaterialSnapshot、ResultPackage 和 WarningRecord 驱动。参数定义页、输入控件、结果视图、报告和 3D 不得维护第二套公式、默认值或单位规则。界面采用统一 typography/design tokens，专业、克制、信息密集但可读，禁止手机 App 式巨型卡片、过度装饰和以颜色作为唯一状态表达。

## 22. 双构建与 Portable Offline 架构

同一 TypeScript/React 源码必须输出：

1. `standard-static`：面向 HTTPS/static hosting 的普通静态 Web build；
2. `portable-offline`：面向 `file://` 直接打开的自包含发布目录。

两者共享 calculation core、材料数据、schema、UI 和测试，只在 packaging/asset-loading/runtime-capability adapter 层分叉。Portable build 的核心约束：

- 无 CDN、网络字体、网络图标或远程模型；
- 材料/公式/参数/单位/帮助和默认配置在构建期打包或嵌入，不在运行时 `fetch` 本地 JSON；
- 相对且可移动的资源路径；
- 不依赖 localhost、service worker、后端、数据库或 secure-context-only API；
- 构建过程消解 `file://` 下 ES module/CORS 风险，源码仍保持模块化；
- case import/export 使用普通浏览器文件选择、FileReader 和 Blob/download，增强 API 不得成为唯一实现；
- programmatic 3D 与所有 shader/font/asset 随包发布。

构建系统必须提供独立命令、输出目录、release manifest 和 smoke tests。Portable acceptance 还必须在断网、无开发环境的另一台普通 Windows PC 上用 Chrome/Edge 直接打开验证；自动化测试不能完全替代该人工记录。

## 23. 本地案例、导出和版本架构

v1 不依赖账号或后端。Case service 提供 New、Save、Load、Export、Import；localStorage/IndexedDB 只作恢复和偏好缓存，不是唯一数据源。可交换 JSON 包含 schema、geometry/material/topology/method/input/solver/warning snapshots 以及 application、calculation-model、material-database 和 freeze mapping versions。

导入必须先校验 schema 和版本，再显式 migrate 或失败关闭；禁止静默替换材料、方法或默认值。结果导出至少提供 JSON、CSV、print-friendly report 和 Browser Print / Save as PDF，并保留 inputs、outputs、units、methods、materials、warnings、status、versions 和 trace 摘要。

Application Version、Calculation Model Version 和 Material Database Version 独立管理并显示在 UI、case 和报告中。公式/域/Recommended 变化升级 model version；材料记录变化升级 database version；应用功能变化升级 application version。

## 24. 非功能验收与发布 DoD

- calculation core 可脱离 React 运行全部单元、量纲、极限、适用域、无效输入和 trace 测试；
- 普通计算接近即时响应，昂贵链路由 Apply/debounce/worker 等调度，不随每个按键完整重算；
- 3D/大型图表不阻塞输入，FEM 大数据有独立性能预算；
- 键盘导航、可见焦点、非颜色状态表达、关键清空保护和正常可读字号通过检查；
- 1920×1080 为最佳体验，1366×768 和 2560×1440 通过兼容观察；
- `standard-static` 与 `portable-offline` 均可重复构建并通过各自 smoke test；
- portable 发布目录在无 Node.js、Python、Web Server、开发环境和互联网的普通 Windows PC 上，以 Chrome/Edge `file://` 入口完成核心计算、材料、3D、图表、帮助、案例交换和打印验收；
- 发布包包含用户说明、开发/架构文档、构建/部署说明、示例案例、版本/manifest、已知限制和 portable acceptance record。

下一阶段的可复制执行说明见 [CODEX_IMPLEMENTATION_PROMPT.md](CODEX_IMPLEMENTATION_PROMPT.md)。该 Prompt 是实施入口，不得覆盖本架构或更高优先级的冻结计算依据。
