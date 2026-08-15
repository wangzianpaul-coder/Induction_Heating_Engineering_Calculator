# v1 最终冻结复核：线圈几何、电磁参数与材料体系

**日期：** 2026-08-14  
**文档性质：** 独立工程复核 / 正式文档合并前工作报告  
**作用域：** 线圈几何、空载电感、导体长度与电阻、线圈—工件等效负载、三级材料系统  
**不在本报告内：** 网站、UI 或源代码实现；历史截图复现；旧工作簿系数再利用  

## 0. 复核结论

用户已经批准的几何语义总体可作为 v1 基础，但必须同时冻结五项实现约束，否则即使字段名正确，仍可能算错：

1. `g` 只允许表示匝间轴向净间隙；热工径向空气隙必须使用 `g_rad` / `thermal.radial_gap`。两者继续共用 `g` 是 **blocking**。
2. 对均匀单层线圈，Lundin/Nagaoka、长螺线管和 Wheeler 的项目映射统一采用 `D_c` 与 `b_env`；这是本项目对实体绕组到原公式几何的受控映射。离散圆环法不用一个标量轴向长度，而直接用每匝 `z_i`。
3. 导体长度不得使用 `b_cc`、`b_env` 或 `Np` 猜测。它使用机械中心路径 `D_m`、`N_rev`、实际螺旋轴向前进量 `delta_z_helix`，再单独加 `lead_length`。
4. `D_c=D_m` 只是 v1 的电流路径一阶近似，不是高频电流质心的物理结论。覆盖 `D_c` 必须带方法、频率、温度、工件状态和来源；禁止通过倒算电感静默调 `D_c`。
5. v1 若不增加逐层/逐匝三维几何 schema，应明确只支持**均匀、单层、同轴圆柱绕组**的自动解析计算。多层或非均匀绕组不能沿用单层恒等式。

空载电感方面：无匹配实测值时，规则单层多匝线圈的推荐科学基线为 **Lundin 1985 对 Nagaoka/Lorenz 圆柱电流片的近似**；Wheeler 1928 式 (2) 作快速对照，长螺线管作极限检查。少匝、粗管、大节距时，不能把电流片结果称为实际线圈真值；若当前离散模型仅支持细实心圆线，则空心圆管或矩形水冷管应优先建议实测/FEM，而不是强行推荐一个“更精确”的解析值。

`Req/Leq` 和 `Rac` 可以在 v1 输出，但必须分成 **estimate** 与 **measurement_identified** 两条路径。估算需要用户提供有来源的等效参数或明确选择受限表面电阻近似；测量值只有在参考面、频率、温度、空载/带载状态一致时才可覆盖估算。旧截图、旧工作簿、历史 `Kq` 或反推系数均不得进入运行时。

三级材料体系的架构可批准；具体预置数值包尚未达到批准门槛。没有逐属性来源、状态、有效域和温变数据时，材料记录只能是 `generic_typical` 或 `insufficient_data`，不能因材料名称常见而升级置信度。

## 1. 依据与证据边界

### 1.1 本轮服从的正式决定

- `docs/decisions/ADR-0002-v1-product-boundary-and-evidence.md`：历史截图、旧工作簿和旧聊天只作档案与审计，不作 v1 模型依据。
- `docs/decisions/ADR-0003-v1-coil-geometry.md`：几何符号、单层关系式、`D_c` 警告和热工间隙改名。
- `docs/decisions/ADR-0004-v1-method-selection-and-measurement.md`：多方法并列、唯一推荐、估算与实测覆盖。
- `docs/decisions/ADR-0005-v1-material-system.md`：三级材料架构和 Material Comparison。
- `docs/decisions/ADR-0008-v1-validation-and-sealed-holdout.md`：新实测/FEM验证和历史数据隔离。

### 1.2 已核查的一手/原始工程来源

页码均为 PDF 页码；印刷页和公式号按原件记录。

| ID | 文件 | 已核查位置 | 本报告采用内容 |
|---|---|---|---|
| W28 | `wheeler1928.pdf` | PDF 1（印刷 1398，式 1）；PDF 2（印刷 1399，式 2）；PDF 3（印刷 1400，式 3） | 多层式、单层式、原始变量及误差声明；式 (2) 的原文条件是 `b>0.8a` |
| N09 | `导出页面自 journalofcollege27toky.pdf` | PDF 20–21（印刷 19–20，式 15–18），PDF 32–34（表） | 有限长圆柱电流片系数与椭圆积分基准；原式为 CGS，不能直接照抄为 SI |
| L85 | `lundin_Proc_IEEE_1985.pdf` | PDF 3–4（印刷 1428–1429，式 1–12、表 1） | Nagaoka/Lorenz 电流片电感的稳定分段近似；论文误差只针对精确电流片值 |
| RG12 | `nbsbulletinv8n1p1_A2b.pdf`，Rosa & Grover | PDF 6–10（同轴圆环互感）；PDF 116–135，尤其 PDF 123 式 81；PDF 172–187（高频导线） | 逐匝自感+互感结构、同轴丝状圆环互感、导线/节距修正和高频内阻候选 |
| DHT | `Design-and-Fab-of-Inductors-for-HT-1.pdf` | PDF 8；PDF 17–18 | 引线/母排邻近效应；在实际频率、装工件状态下测量阻抗和电阻的工程优先级 |
| S89 | `The mathematical model of induction heating of ferromagnetic pipes - Magnetics, IEEE Transactions on.pdf` | PDF 1–6（印刷 2745–2750） | 铁磁工件的温度、场强、频率依赖及 Curie 附近电磁—热耦合；个案拟合不可泛化 |
| L13 | `low-frequency-modelling-of-induction-heaters-using-series-45fwnep0l3.pdf` | PDF 2–6（式 1–20、表 IV–IX） | 闭式 SEC/TEC 只能作设计指南；FEA/测量对具体装置更可靠 |

原始页面已通过本地渲染视觉核验，并与文本提取交叉检查。历史聊天、截图和工作簿没有参与本报告的公式批准或参数选择。

## 2. 几何语义最终冻结

### 2.1 参数字典

内部长度单位均为 m；`N`、`N_rev` 无量纲。建议运行时使用完整 `parameter_id`，公式显示层才使用短符号。

| parameter_id | 符号 | 冻结物理定义 | 使用规则 | 状态 |
|---|---|---|---|---|
| `coil.inner_diameter` | `D_i` | 线圈导体内表面形成的机械内径 | 机械布置/间隙；不得直接代替电流路径直径 | Approved |
| `coil.outer_diameter` | `D_o` | 线圈导体外表面形成的机械外径 | 机械包络；不得直接代替电流路径直径 | Approved |
| `coil.mean_diameter` | `D_m` | 导体几何中心线直径 | 实际铜材中心路径长度；单层关系见下 | Approved |
| `coil.current_path_diameter` | `D_c` | 指定电磁方法使用的实际或等效电流路径直径 | 电感/互感方法；v1 可显式默认 `D_m` 并发警告 | Approved with limitation |
| `conductor.radial_size` | `d_rad` | 导体外截面沿线圈径向的尺寸 | 圆管时等于管外径；矩形截面必须按安装方向给值 | Approved |
| `conductor.axial_size` | `d_ax` | 导体外截面沿线圈轴向的尺寸 | 用于包络和轴向填充；不能用 `d_rad` 代替 | Approved |
| `coil.pitch_center` | `p` | 相邻匝中心线的轴向节距 | 仅 `N>=2` 才有物理意义；`N=1` 为 `not_applicable` | Approved with limitation |
| `coil.turn_clearance_axial` | `g` | 相邻匝轴向净间隙，`g=p-d_ax` | 只允许用于线圈匝间；`N=1` 为 `not_applicable` | Approved with limitation |
| `coil.first_last_center_span` | `b_cc` | 第一匝到最后一匝中心线的轴向距离 | 布局报告/一致性检查；不作电流片或 Wheeler 的默认 `b` | Approved |
| `coil.winding_envelope_length` | `b_env` | 完整绕组外包络轴向长度 | 机械包络；v1 映射为电流片/Wheeler 的 `b_method` | Approved |
| `coil.electrical_turn_count` | `N` | 电气匝数，正整数 | 安匝和解析电感式；不得静默代替 `N_rev` | Approved |
| `coil.helix_revolution_count` | `N_rev` | 实际螺旋中心路径的转数，可含部分转 | 只用于路径长度/三维几何；来自图纸/CAD | Approved |
| `coil.helix_axial_advance` | `delta_z_helix` | 被建模螺旋段从起点到终点的实际轴向前进量 | 导体长度必需；不得由 `b_cc` 或 `b_env` 暗猜 | Approved |
| `coil.lead_length` | `lead_length` | 有效绕组以外、但位于所选电气/热边界内的全部引线/母排中心线长度之和 | 与主动螺旋长度分项；未知时总电阻不完整 | Approved with limitation |
| `thermal.radial_gap` | `g_rad` | 线圈机械内表面到保温外表面的单边径向间隙 | `g_rad=(D_i-D_ins,o)/2`；禁止写成直径差或复用 `g` | Approved |

### 2.2 允许的单层恒等式

只对**均匀单层、各匝截面方向一致、同轴圆柱绕组**：

`D_o = D_i + 2 d_rad`

`D_m = (D_i + D_o)/2 = D_i + d_rad`

`b_cc = (N-1)p`

`b_env = b_cc + d_ax`

`k_fill,axial = N d_ax / b_env`

其中 `k_fill,axial` 只表示轴向投影覆盖率，不是磁耦合系数。`N=1` 时 `b_cc=0`、`b_env=d_ax`，而 `p` 与 `g` 应返回 `not_applicable`，不能伪设为 0。

对非均匀节距，应保存 `z_i`、`p_i=z_(i+1)-z_i`、`g_i=p_i-(d_ax,i+d_ax,i+1)/2`；不得用平均 `p` 抹掉局部导体相交。对多层，应保存每层/每匝半径、轴向位置和截面；上述 `D_o-D_i=2d_rad` 不再成立。

### 2.3 高频电流路径的受控处理

`D_m` 是机械几何量，`D_c` 是方法输入，两者不能合并成同一个不可追踪字段。v1 规则：

1. 若无实测/FEM/经批准截面电流模型，建立 `D_c := D_m` 的显式派生记录；
2. 返回 `COIL_CURRENT_CENTROID_UNRESOLVED`，说明趋肤、邻近、工件和回流路径可使有效电流质心偏离几何中心；
3. `D_c` 覆盖值必须绑定 `method_id,f,T,workpiece_state,return_path,source_id`；
4. 覆盖只影响对应电磁方法，不改写 `D_i,D_o,D_m`；
5. 禁止把测得电感倒算为 `D_c` 后再把同一测量称作独立验证。

单个 `D_c` 本身不能描述导体周向高度非均匀的表面电流；强邻近场下应升级到有限截面/FEM或实测，不用一个“等效直径”伪装局部电流分布。

## 3. 各方法轴向长度与直径映射

| 计算/用途 | 径向几何 | 轴向几何 | 明确排除 | 冻结解释 |
|---|---|---|---|---|
| 机械内外包络 | `D_i,D_o` | `b_env` | `D_c,b_cc,Np` | 实体边界 |
| 轴向填充率 | — | 分母固定 `b_env` | `b_cc,Np` | `N d_ax/b_env` |
| 理想长螺线管 | `a=D_c/2` | `b_method=b_env` | `b_cc,Np` | 只作无限长极限/量级检查 |
| Nagaoka/Lundin 电流片 | `a=D_c/2` | `b_sheet=b_env` | `b_cc,Np` | 项目对实体包络到圆柱电流片长度的受控映射 |
| Wheeler 1928 单层式 (2)/(3) | `a=D_c/2` | `b_W=b_env` | 机械内径直接代半径；`b_cc,Np` | 原文 `b` 是线圈轴向长度；v1 采用完整绕组包络 |
| Wheeler 1928 多层式 (1) | 平均层半径 `a_layer,mean` | `b_W=b_env`，另需径向绕组厚度 `c` | 单根导体 `d_rad` 代整个多层厚度 | 只有真实多层 schema 才可用 |
| 离散同轴圆环互感 | 每匝 `a_i=D_c,i/2` | 每匝 `z_i` | 任一标量 `b` 替代 `z_i` | `b_cc` 仅作报告/一致性检查 |
| 单匝圆环自感 | `a=D_c/2` 和匹配截面参数 | 无 `b` | `b_env=d_ax` 代公式长度 | 需匹配实心/空心/矩形截面模型 |
| 实际导体长度 | 机械中心线 `D_m` 或 CAD 中心线 | `delta_z_helix` | `D_c,b_cc,b_env,Np` 暗猜 | 铜材路径，不是电磁等效路径 |
| 端口实测电感/电阻 | 由试件定义 | 由参考面内全部导体定义 | 与 active-winding 解析值不加说明地等同 | 必须记录参考面和去嵌入 |

选择 `b_env` 是 v1 的**项目几何映射约定**，不是声称原始电流片包含实体导体截面细节。它的优势是：物理边界清楚、`N=1` 不退化为零、不会因 `Np` 的端点惯例变化。少匝或大间隙导致实体线圈明显偏离电流片时，应降低方法适用性，而不是偷偷换成 `b_cc` 追结果。

### 3.1 导体长度冻结式

对圆柱上的均匀螺旋中心线：

`ell_helix = sqrt[(pi D_m N_rev)^2 + delta_z_helix^2]`

若图纸明确每一实际路径转数的轴向前进均为 `p_path`，才可写：

`delta_z_helix = N_rev p_path`

`ell_helix = N_rev sqrt[(pi D_m)^2 + p_path^2]`

总长度分项为（各段必须互斥）：

`ell_terminal = ell_helix + ell_nonhelical_active + lead_length`

其中 `ell_nonhelical_active` 只容纳主动绕组内不属于均匀螺旋的过渡段，`lead_length` 只容纳主动绕组外的引线/母排；同一实体段不得重复登记。`N_rev=N` 只能作为已核对起止路径后的显式工况假设，不能作为默认恒等式。若只有 `N,p,b_cc,b_env` 而没有实际起止路径/`delta_z_helix`，可输出周长下界 `pi D_m N_rev`，但端口总长度和电阻应标 `insufficient_data`。非圆、变径、多层或带成形引线时优先使用 CAD/折线/样条中心线积分。

## 4. 电感方法最终评价与推荐策略

### 4.1 方法状态矩阵

| method_id / 方法 | 状态 | v1 角色 | 限制与决定 |
|---|---|---|---|
| `long_solenoid_limit` | Approved with limitation | 极限/量级检查 | `L=mu0 N^2 pi(D_c/2)^2/b_env`；不是普通有限长线圈默认结果 |
| `nagaoka_exact_current_sheet` | Deferred | 独立黄金实现候选 | 一手理论成立，但 CGS→SI、椭圆积分实现、分支和黄金数据尚需独立签字；不阻碍 Lundin 作为数值实现 |
| `lundin1985_current_sheet` | Approved with limitation | 规则单层多匝的推荐解析基线 | 对精确圆柱电流片近似误差很小；不代表粗管、少匝、真实螺旋或引线的实际误差 |
| `wheeler1928_single_eq2` | Approved with limitation | 快速交叉比较 | `L[uH]=a_in^2 N^2/(9a_in+10b_in)`；原文约 1% 声明只在 `b>0.8a`，且少匝、大间距、趋肤/分布电容会降低精度 |
| `wheeler1928_short_eq3` | Approved with limitation | 高级短线圈比较 | 原文约 5% 级，`2a>b>0.2a`；不自动替代式 (2)，不作推荐默认 |
| `wheeler1928_multilayer_eq1` | Deferred | 未来多层快速估算 | 原式已核查；当前 v1 若无真实层数、平均半径、轴长和径向绕组厚度 schema 则不能运行 |
| `coaxial_filament_mutual` | Approved with limitation | 离散匝互感子方法 | 完全椭圆积分适用于同轴丝状平面圆环；`i=j` 禁止调用，不能给自感 |
| `discrete_ring_sum_thin_solid_round` | Approved with limitation | 少匝/大节距高级比较 | 仅在有限截面自感式与细实心圆线几何匹配时；真实螺旋、空心/矩形管、引线未计 |
| `discrete_ring_sum_hollow_or_rectangular` | Insufficient evidence | 不运行 | 当前没有经过冻结和验证的空心圆管/矩形管有限截面自感；不能套实心圆线常数 `-7/4` |
| `finite_section_helical_neumann` | Deferred | 未来高阶数值解析 | 需真实螺旋路径、截面电流分布、奇异积分处理与独立验证 |
| `simpson_elliptic_integration` | Deferred | 数值工具/教学复核 | Simpson 只是求积器，不是新的电感物理模型；优先经验证的椭圆积分/Carlson算法 |
| `empty_coil_impedance_measurement` | Approved with limitation | 实物空载/端口推荐值 | 必须同频同温、参考面明确、去嵌入；结果含参考面内引线等，不等同 active-winding 电流片值 |
| `validated_em_fem_inductance` | Approved with limitation | 验证/复杂几何参考 | 材料、边界、网格、端口和实验锚定完整才可提升可用性；不是可泛化解析公式 |

### 4.2 唯一 Recommended policy

推荐引擎必须基于适用性，而不是按一个长径比硬切换：

1. **存在匹配状态的空线圈端口实测：** `recommended_method_id=empty_coil_impedance_measurement`。同时保留解析 active-winding 结果作解释，不能混成一个值。
2. **无实测，均匀单层、同轴、`N>=2`，且电流片近似未触发严重警告：** `recommended_method_id=lundin1985_current_sheet`；同时运行 Wheeler 式 (2) 和长线圈极限。
3. **少匝/大节距，且导体确为受支持的细实心圆线、每匝 `z_i` 完整：** `recommended_method_id=discrete_ring_sum_thin_solid_round`；Lundin/Wheeler降为比较值。
4. **少匝粗空心圆管或矩形水冷导体：** 若无受验证有限截面模型，则不强行推荐解析数值；返回 `no_approved_recommended_result`，推荐实测或 2D/3D EM FEM。Lundin/Wheeler可显示为受限基线，但明确未建模项。
5. **`N=1`：** 电流片、长螺线管和 Wheeler 的多匝使用均不得自动运行；只有截面匹配的单匝自感方法或实测可成为推荐。
6. **多层/非同轴/变径/显著引线：** 没有相应 schema 和验证时，相关解析法 `not_applicable`；优先实测/FEM。

不设置 `b/D=0.4` 的 Lundin/Wheeler自动切换。该数值只来自 Wheeler 式 (2) 原文 `b>0.8a` 在 `D=2a` 下的等价改写，表示其约 1% 声明域，不是所有电感方法的物理分界。

所有方法结果至少携带：`method_id,method_version,geometry_snapshot,method_geometry_mapping,applicability_status,scientific_confidence,unmodeled_effects,validation_status,suggested_significant_digits`。不得平均多个方法作为默认答案。

## 5. 工件电磁、透入深度与频率

### 5.1 SI 皮深公式

对均匀、线性、各向同性良导体的正弦稳态局部平面场，幅值 `1/e` 透入深度为：

`delta = sqrt[rho_e(T)/(pi f mu0 mu_r(T,H,f))]`

且场/电流幅值沿深度的复数形式为：

`J(y)=J_surface exp[-(1+j)y/delta]`

输入必须是 `rho_e`（Ω·m）、`f`（Hz）、无量纲 `mu_r` 和明确材料状态。`mu=mu0 mu_r` 才具有 H/m 单位。指数正号、把 `mu0` 当无量纲相对磁导率、或混用 Ω·cm/mm 而不在边界换算，均应作为公式错误阻断。

**状态：Approved with limitation。** 它是局部电磁长度尺度，不直接给总加热效率、功率分布或实际热影响深度。圆柱半径/壁厚与 `delta` 同量级、端部显著、非线性铁磁、饱和、强温度梯度或多层材料时，简单式不足。

### 5.2 铁磁温度、场强和 Curie 限制

铁磁工件不得把 `mu_r` 视为只随材料名称确定的常数。查询至少需要与使用情景匹配的 `T,H,f`，并记录是初始、增量、割线还是复磁导定义。Curie附近应使用材料特定的转变区数据和分段状态，不采用全钢固定温度或从高 `mu_r` 数值瞬间跳为 1 的无来源阶跃。

- 有匹配 `rho_e(T)` 和 `mu_r(T,H,f)` 数据：可计算命名清楚的 `skin_depth_scenario`，状态 Approved with limitation。
- 只有 `rho_e(T)`、没有相应磁性状态：非磁材料可在有依据时取 `mu_r≈1`；铁磁材料返回 `insufficient_data` 或由用户显式选择高不确定度工程情景。
- Curie/相变区跨域插值、固定 `mu_r` 穿越整个升温过程：Insufficient evidence。
- 非线性磁热耦合、局部功率密度：规则轴对称可用经验证 2D FEM，复杂端部/引线再用 3D；状态 Approved with limitation 作为验证/参考，不转为通式。

### 5.3 “临界/参考频率”只作设计情景

若明确采用经验设计条件 `D_workpiece/(2 delta)=2`，即 `delta=D_workpiece/4`，则：

`f_ref = 16 rho_e/(pi mu0 mu_r D_workpiece^2)`  （SI：Ω·m、m、Hz）

单位变式必须写清：

- `f_ref[Hz] ≈ 4.05285e8 rho_e[ohm cm]/[mu_r D_cm^2]`；
- `f_ref[Hz] ≈ 405.285 rho_e[micro-ohm cm]/[mu_r D_cm^2]`。

系数 `4e8` **不对应** `rho_e` 以 `micro-ohm cm` 输入。相关二手论文正文单位标签与算例代入曾不一致，因此实现只保留 SI 主式，非 SI 式仅用于可追溯显示和单位测试。

**状态：Approved with limitation / engineering reference。** 它回答的是给定透入比的参考频率，不是普适最佳频率。真实频率选择还受目标温度均匀性、功率密度、热传导、Curie过程、电源/谐振拓扑和几何约束影响；自动输出“最佳频率”目前为 Insufficient evidence。

### 5.4 工件电磁方法状态

| 方法 | 状态 | 决定 |
|---|---|---|
| 线性良导体 SI 皮深 | Approved with limitation | 可作材料/频率/温度情景；不直接等于热影响深度 |
| 经验 `D/(2delta)=2` 参考频率 | Approved with limitation | 仅命名为 reference/critical scenario，不能称普适推荐 |
| 固定 `mu_r` 的窄状态情景 | Approved with limitation | 必须有状态与来源，显示高敏感性；不得跨 Curie |
| 通用 `mu_r(T,H,f)` 数据查询接口 | Approved | 材料架构层；具体数据包另行批准 |
| 首批钢种完整磁热数据 | Insufficient evidence | 当前阻断具体铁磁数值预置和全温程预测 |
| 无限长圆柱/管 Bessel 场模型 | Deferred | 需一手推导、边界、SI实现和实验/FEM黄金案例 |
| 从皮深直接推总效率/`Req`/加热功率 | Insufficient evidence | 缺场幅、边界、几何和损耗积分；不得补经验系数 |
| 通用自动“最佳频率” | Insufficient evidence | 必须联立热过程、电源和验证；不能由单一皮深准则决定 |

## 6. `Req/Leq` 与耦合：v1 可输出路径

### 6.1 先冻结名称，避免一个 `Req` 表示三种量

| 输出 | 冻结定义 |
|---|---|
| `R_terminal_empty,L_terminal_empty` | 空线圈、指定端口参考面、频率和温度下的串联等效量 |
| `R_terminal_loaded,L_terminal_loaded` | 带工件、其余参考状态一致时的串联等效量 |
| `delta_R_loaded_empty` | `R_terminal_loaded-R_terminal_empty`；是端口增量，不自动等同纯工件有功吸收 |
| `delta_L_loaded_empty` | `L_terminal_loaded-L_terminal_empty`；带工件时常为负，但不设无来源硬符号规则 |
| `R_reflected_model` | 已定义双绕组模型计算的反射电阻 |
| `L_terminal_model` | 同一双绕组模型的一次端口串联等效电感 |
| `k_mutual` | `M/sqrt(Lp Ls)`；只在 `M,Lp,Ls` 定义一致时成立，不得用 `Leq/L0` 代替 |

带工件后铜导体的邻近损耗也可能改变，因此 `delta_R_loaded_empty` 通常包含“工件吸收 + 铜损改变 + 测量差异”。没有量热/FEM损耗分解时，不得把它全部标为 useful workpiece power。

### 6.2 推荐：端口复阻抗测量辨识

冻结输入：

- 参考面和夹具/引线去嵌入定义；
- `f,T_coil,T_workpiece,workpiece_state`，几何和安装间隙；
- 空载/带载状态；
- 基波相量 `V,I` 或直接复阻抗 `Z`；
- 仪器、校准、时间窗与不确定度；
- 若端口含变压器、谐振电容或母排，必须先去嵌入，或把结果改名为对应网络输入阻抗。

若直接测得 `Z=R+jX`：

`R_eq = Re(Z)`

`L_eq = Im(Z)/(2 pi f)`，仅当该端口在所选串联等效下为感性。

若只有 `P,I_rms`，只能得到 `R_eq=P/I_rms^2`；没有电压幅值和无功符号/相位时，`L_eq=insufficient_data`。空载和带载相减必须同频、同温、同参考面，并传播两次测量的不确定度。

**状态：Approved with limitation。** 对匹配的实际工况，测量优先级高于解析估算；但它只代表该状态/参考面，不成为普适几何公式。

### 6.3 估算：线性双绕组反射阻抗

在同频串联参数 `R1,Lp,R2,Ls,M` 已知时：

`Z_in = R1 + j omega Lp + omega^2 M^2/(R2 + j omega Ls)`

`R_reflected = omega^2 M^2 R2 / [R2^2 + (omega Ls)^2]`

`L_terminal = Lp - omega^2 M^2 Ls / [R2^2 + (omega Ls)^2]`

`M = k sqrt(Lp Ls)`，且被动线性模型要求 `abs(k)<=1`。

最少输入：`f,R1,Lp,R2,Ls` 和 `M` 或 `k`；每个量必须绑定来源 `measurement | validated_fem | approved_limited_model | explicit_design_assumption`、频率、温度和几何状态。若 `k,R2,Ls` 是范围而非定值，应输出范围/敏感性，不给虚假的单点精度。

**状态：Approved with limitation。** 批准的是给定参数后的电路代数，不是几何自动生成 `M,R2,Ls` 的能力。

### 6.4 不能在 v1 无依据自动补齐的量

| 项目 | 状态 | 原因/允许的后续路径 |
|---|---|---|
| 一般铁磁管件几何 → `k` | Insufficient evidence | `mu_r(T,H,f)`、端部、壁厚、气隙和电流分布强耦合；用新实测或验证 FEM |
| 一般工件几何 → `R2,Ls` | Insufficient evidence | 等效二次拓扑本身非唯一；同一端口阻抗不能唯一分解全部内部参数 |
| 长同轴圆柱/Bessel受限模型 | Deferred | 可作为独立轴对称方法研究，但需原始来源、SI推导、极限与实测验证 |
| 单一短路圆环工件模型 | Approved with limitation | 只适合物理上确实可等效为独立圆环且参数有来源的对象；连续管件不得无验证折成一匝 |
| 从一个端口测量唯一反推 `k,R2,Ls` | Insufficient evidence | 参数不可辨识；需要第二端可访问、扫频约束或受控模型 |
| 旧截图/旧工作簿 `Kq`、气隙经验式 | Insufficient evidence | 按 ADR-0002/0004 不进入 v1；不作估算默认 |
| 历史合同 `F-03` 成熟软件黑箱标定 | Insufficient evidence / product-prohibited | 按已接受决定仅保留 archive/audit；未来新项目实测经验模型须另建方法、校准域和独立验证，不复用 `F-03` 历史系数 |

v1 输出应并列 `estimated` 和 `measurement_identified`，由用户明确选择 `value_used`；系统可按状态优先测量，但不得用实测值反向静默校准估算模型。

## 7. `Rac`：v1 可输出路径

### 7.1 共同前置：长度、截面和 `Rdc`

对均匀材料/温度段：

`Rdc = rho_e(T) ell_terminal / A_metal`

非均匀温度、截面或材料应分段积分。`A_metal` 与冷却孔水力面积必须分开；空心圆管、空心矩形管的金属截面按实际外/内尺寸计算。接头、焊口和母排若未包含在材料段中，应作为显式串联项。

**状态：Approved。** 前提是 `rho_e(T)`、实际路径长度、截面和参考边界完整。

### 7.2 v1 强集肤表面电阻基线

良导体局部平面、正弦稳态的表面电阻：

`delta = sqrt[rho_e(T)/(pi f mu)]`

`R_s = sqrt[pi f mu rho_e(T)] = rho_e(T)/delta`

若切向场沿选定参与表面近似均匀：

`Rac_surface_est = R_s ell / P_eff = rho_e(T) ell/[delta P_eff]`

其中 `P_eff` 是**明确选择的参与外周长**，不是金属全部内外周长的自动总和。孤立实心圆导体可用 `P_eff=pi d_outer`。空心圆管在内部没有相应磁场时不能自动把水道内周计入；矩形管和线圈邻近场下表面电流强烈不均匀，均匀周长式只能是受限基线。

运行条件必须同时报告 `wall_thickness/delta`、局部曲率尺度/`delta`、截面形状、工件和回流路径。没有经批准的自动阈值前，不声称固定比例保证某个百分比精度；若壁厚与 `delta` 同量级、曲率不再局部平面或邻近场显著，则返回 `out_of_applicability`，不能用 `max(Rdc,Rac_surface_est)` 掩盖模型失效。

**状态：Approved with limitation。** 只作为强集肤、均匀表面场的估算基线；不输出局部峰值电流密度或热点。

### 7.3 实测覆盖

推荐空线圈在实际频率、温度、连接和冷却状态下测量去嵌入端口复阻抗：

`Rac_measured = Re(Z_empty,deembedded)`

或在能确认损耗边界只含线圈铜损时：

`Rac_measured = P_cu/I_rms^2`

若参考面内含接头/母排，应命名为 `R_terminal_ac_measured` 并保留分项未知；若用带工件端口 `Re(Z_loaded)`，其中包含反射负载，不能称线圈 `Rac`。量热交叉检查只能在热平衡边界闭合时使用。

**状态：Approved with limitation。** 同状态实测优先于估算，且必须保存不确定度、频率、温度和参考面。

### 7.4 AC 子方法判定

| 方法 | 状态 | 决定 |
|---|---|---|
| `Rdc` | Approved | v1 基础与 AC 下界/量级参照 |
| 强集肤均匀表面电阻式 | Approved with limitation | v1 可选 estimate；显示全部未计项 |
| 孤立实心圆导体 Kelvin/Bessel 内阻 | Deferred | 原典支持候选，但现代 SI 公式、复数支路和黄金数值尚未冻结 |
| 空心圆管精确 Bessel 模型 | Deferred | 需内外边界条件、回流路径和数值验证 |
| 矩形/空心矩形导体解析 `Rac` | Insufficient evidence | 当前没有适合本线圈几何且已验证的通式 |
| Dowell 类层绕组邻近修正直接套水冷螺旋管 | Insufficient evidence | 几何和场边界不匹配，不能借用变压器箔/层绕组经验式 |
| 任意常数 `F_skin*F_prox` | Insufficient evidence | 没有来源、几何域和验证时拒用 |
| 2D 轴对称 EM FEM | Approved with limitation | 规则线圈截面和工件的电流分布/损耗参考；引线、馈电和非轴对称需 3D |
| 空线圈同频阻抗/量热实测 | Approved with limitation | v1 推荐覆盖路径；状态和边界匹配才有效 |

最终铜损：`P_cu=I_rms^2 Rac_used`。结果必须指出 `Rac_used` 来自估算、FEM还是实测，且不能将端口总有功电阻重复加入反射负载。

## 8. 三级材料体系冻结建议

### 8.1 三层数据归属与覆盖顺序

| library_tier | 用途 | 覆盖规则 |
|---|---|---|
| `preset_common` | 版本化通用预置；高导铜、碳钢/低合金钢/不锈钢/耐热钢、铝/铜等非铁材料、陶瓷纤维/硅酸铝、硅酸钙、气凝胶等保温材料 | 只读版本；具体牌号/产品必须逐条审查，generic 只能初算 |
| `project_material` | 当前项目的厂家、标准、试验、炉批/产品状态数据 | 用户明确选中时优先；通过版本化属性覆盖/继承，不修改 preset 原记录 |
| `user_defined` | 用户自行输入并保存的材料或情景数据 | 必须保留输入者、来源、日期和质量标签；不能因“用户保存”自动变为 approved |

三层是**数据归属/优先级**，不是科学质量。为避免把 `project_specific` 或 `user_defined` 误当高/低质量，建议冻结为三个正交字段：

- `library_tier = preset_common | project_material | user_defined`
- `evidence_quality = approved_reference | engineering_reference | generic_typical`
- `record_origin = published | manufacturer | project_specific | user_defined | measured | derived`

另设生命周期 `approval_status = draft | under_review | approved | retired`。这样仍完整容纳用户批准的五类标签，但不会把来源类别和证据质量混成一个枚举。

项目材料“覆盖”必须是可追踪的 property-level overlay。若项目铜只覆盖 `rho_e(T)`，其余 `k(T),cp(T)` 从预置继承，则每个属性保留各自来源，并标记 `mixed_provenance`；禁止复制后丢失血缘或静默借用近似牌号。

### 8.2 材料与属性记录字段

材料身份最少包括：

- `material_id,revision,name,material_family,grade,standard,composition`；
- `product_form,condition,heat_treatment,phase,batch_or_heat,manufacturer`；
- `surface_condition,coating,oxidation_state`（发射率必须与表面状态绑定）；
- `valid_from,approved_by,change_reason,source_package_hash`。

每一条属性独立记录：

- `property_id`，`constant | table | approved_function | tensor | curve_family`；
- SI 单位和值，同时保存原值、原单位和单位转换版本；
- 自变量及状态：`T,f,H,B,pressure,moisture,density,aging,orientation` 等；
- 数据点/函数、有效域、相态/Curie分段、插值法和外推政策；
- 不确定度、试验方法、样品状态、数据质量；
- 精确来源文件、页/表/图/公式号、数字化误差和修订版本。

按对象的最低字段：

| 对象 | 最低物性 |
|---|---|
| 线圈导体 | `rho_e(T),k(T),cp(T),rho_m(T),alpha_thermal(T),mu_r`；需要时表面状态/接触电阻 |
| 铁磁工件 | `rho_e(T),k(T),cp(T),rho_m(T),alpha_thermal(T),Curie/phase_transition`，以及与 `T,H,f` 匹配的 `mu_r`、B-H 或复磁导/损耗数据 |
| 非磁工件 | `rho_e(T),k(T),cp(T),rho_m(T),alpha_thermal(T),emissivity(surface,T)` |
| 保温材料 | `k(T,density,moisture,aging)`、`cp(T),rho_m,T_max,shrinkage/expansion`；外表面发射率另绑表面状态 |
| 冷却流体 | `rho(T,p),cp(T,p),mu(T,p),k(T,p),T_sat(p)`；水优先经批准 IAPWS 实现而非材料表常数 |

`mu_r` 不能只存一个无条件标量。若数据只在特定 `H,f,T` 下有效，查询缺少任一必要状态量时返回 `insufficient_data`。Curie 温度应记录材料特定的转变区/数据来源，不能让所有钢共用固定 760 °C；跨相变时还可能需要潜热或焓表。

### 8.3 插值、外推和冲突规则

1. 计算核心只接收 SI；温度内部 K，UI 可显示 °C。
2. 默认只在同一来源、材料状态和相区内做逐段线性插值；数据节点必须精确回返。
3. 来源若明确规定其他相关式/插值方式，可注册版本化 `approved_interpolation_id`；不得由模块临时选择样条。
4. 禁止跨 Curie 转变、相变、热处理状态或不连续点平滑插值；必须分段，并在边界返回警告或多情景。
5. 多维 `mu_r(T,H,f)`、B-H 和复磁导数据没有经批准的插值策略时返回 `insufficient_data`，不能把缺失的 `H/f` 维度视为常数。
6. 默认禁止外推。若工程审批允许特定属性在明确窄域外推，必须保存外推方法、距离、不确定度放大和高等级警告；不得写回原材料记录。
7. 多来源冲突分别存档和比较，不静默平均；选择哪一条必须由材料包审批记录决定。
8. 缺属性不得从相似材料静默借用。若用户显式选择近似材料/继承关系，结果标 `explicit_approximation` 和 `mixed_provenance`。
9. 每次求解使用不可变 `material_snapshot`，保存材料和各属性版本，保证案例可重放。

### 8.4 Material Comparison 冻结

比较时冻结：几何、频率、初始/目标温度、边界条件、质量/体积基准、线圈/工件角色、方法版本、数值容差和非材料输入；每次只替换一个材料槽位。

必须先选择比较基准：

- `fixed_geometry_volume`：同一运行几何，质量由各材料 `rho_m(T_ref)` 计算；这是用户要求“同一几何”的默认；
- `fixed_measured_mass`：同一质量，几何不因密度重算；作为独立模式。

两者不能同时暗中生效。严格材料对比默认关闭热膨胀导致的几何变化；若启用热膨胀，应另称耦合几何情景，而非“同一几何”比较。

可比较输出包括：电阻率、磁导率数据覆盖、皮深/参考频率、单位体积或总有效加热能、估算热需求、热导率、保温厚度、热损失和表面温度。只有各候选材料都满足相同方法的输入与适用域时才排序；缺失关键属性显示覆盖矩阵和 `insufficient_data`，不以 generic 值填洞。

每列同时显示 `material_revision,evidence_quality,valid_domain,interpolation/extrapolation,scientific_confidence`。实际项目材料被明确选中时优先于 generic 预置，但系统不得凭相同名称自动覆盖。

### 8.5 材料体系状态

| 项目 | 状态 | 说明 |
|---|---|---|
| 三级库架构与不可变快照 | Approved | 可进入计算接口设计 |
| 逐属性来源/有效域/版本 schema | Approved | 是所有模块共享的唯一物性入口 |
| 区间内同相逐段线性插值 | Approved with limitation | 仅在记录未指定其他批准方法时；不得跨相变/Curie |
| 受控外推机制 | Deferred | 默认阻止；日后按属性逐项批准 |
| 多维磁性数据通用插值器 | Deferred | 需数据结构、物理约束和验证集 |
| generic typical 初步估算 | Approved with limitation | 必须显著标识，不能用于最终材料确认 |
| 首批具体铜/钢/保温数值预置包 | Insufficient evidence | 当前仍缺完整逐属性审查；这是发布数值预置的门禁 |
| Material Comparison 接口与缺失数据行为 | Approved | 比较逻辑可冻结；具体结果受各材料属性批准状态约束 |

## 9. 仍会导致错误的 blocking 点

按严重度排序：

1. **`g` 符号冲突：** 匝间轴向间隙和热工径向间隙仍若共用 `g`，会直接产生错误直径/长度。正式参数字典、公式和导入模板必须统一改为 `g` 与 `g_rad`。
2. **方法轴向长度尚未逐项落入正式合同：** 任一实现若仍接受含糊 `b` 并自行选择 `b_cc`,`b_env` 或 `Np`，结果不可审计。本报告冻结电流片/Wheeler为 `b_env`、离散法为 `z_i`、路径长度为 `delta_z_helix`。
3. **路径端点不足：** `N,N_rev,p,b_cc,b_env` 不能唯一决定真实螺旋起止路径。缺 `delta_z_helix` 或 CAD 中心线时，导体总长、`Rdc/Rac` 和铜损不得标完整。
4. **`N` 与 `N_rev` 无显式映射：** 如果输入/导入层继续静默令两者相等，会在部分转、端部和引线定义上出错。每个案例必须保存映射来源。
5. **active winding 与 terminal 参考面未分开：** Lundin/Wheeler不含引线；端口测量可能包含引线、母排、接头甚至谐振网络。没有 reference plane/de-embedding，电感和 `Rac/Req` 无法正确比较或覆盖。
6. **多层/非均匀几何未建模：** 若 v1 不明确限制单层，却启用 Wheeler 多层或单层恒等式，会直接误算。必须限制范围或先补逐层/逐匝 schema。
7. **空心/矩形水冷管离散自感缺模型：** 当前实心圆线自感常数不能迁移。少匝粗管若承诺“高精度离散电感”属于错误功能，必须 Deferred。
8. **一般几何到 `k,R2,Ls` 未闭合：** v1 只能在这些量有独立来源时估算反射阻抗；缺值必须 `insufficient_data`，不能从间隙或历史系数补齐。
9. **`Rac` 参与表面与强集肤适用性未由输入确定：** `P_eff`、壁厚、回流/工件状态不清时，表面式不能自动运行。任意邻近系数仍应阻断。
10. **首批材料数值包未批准：** 三级架构可实施，但若没有至少一套逐属性可追溯数据，常用材料不能以“approved preset”输出数值。
11. **Material Comparison 的质量/体积基准未显式：** 同几何与同质量会给不同能量比较结论；必须让案例冻结一个基准。

上述 1–5 是几何和端口结果正确性的基础门禁；6–11 是相应高级方法/数值预置的发布门禁。它们不是继续研究历史截图的理由。

## 10. 统一方法判定汇总

| 对象 | 判定 |
|---|---|
| 已批准的单层几何语义及恒等式 | Approved |
| `D_c=D_m` 默认 | Approved with limitation |
| `b_env` 映射到 Lundin/Wheeler/current-sheet `b` | Approved with limitation |
| Lundin 1985 电流片实现 | Approved with limitation / Recommended analytical baseline |
| Wheeler 1928 单层式 (2)/(3) | Approved with limitation / comparison |
| 理想长螺线管 | Approved with limitation / limiting check |
| 离散细实心圆环求和 | Approved with limitation |
| 空心/矩形导体离散自感 | Insufficient evidence |
| 真实螺旋有限截面 Neumann 数值法 | Deferred |
| 端口复阻抗测量辨识 | Approved with limitation / Recommended actual-state path |
| 给定 `M/k,R2,Ls` 的双绕组反射代数 | Approved with limitation |
| 通用几何自动预测 `k,R2,Ls` | Insufficient evidence |
| `Rdc` | Approved |
| 强集肤均匀表面 `Rac` 基线 | Approved with limitation |
| 通用空心/矩形/邻近 `Rac` 解析式 | Insufficient evidence |
| SI 皮深与指定透入比参考频率 | Approved with limitation |
| 铁磁全温程自动最佳频率/功率预测 | Insufficient evidence |
| F-01 给定参数后的双绕组反射代数 | Approved with limitation |
| F-02 同状态端口测量辨识 | Approved with limitation |
| F-03 历史黑箱/旧系数运行时方法 | Insufficient evidence；产品中禁止 |
| 2D轴对称/必要时3D FEM参考 | Approved with limitation |
| 三级材料库架构、属性级血缘、Material Comparison行为 | Approved |
| 首批具体温变材料数值包 | Insufficient evidence |
| 历史截图/旧系数作为产品模型依据 | Insufficient evidence；按正式决定禁止进入 v1 |

### 10.1 最小冻结验证集

| case_id | 验证内容 | 冻结期望 |
|---|---|---|
| `GEO-FREEZE-001` | `D_i=0.200 m,d_rad=0.010 m,N=4,p=0.020 m,d_ax=0.012 m` | `D_o=0.220 m,D_m=0.210 m,b_cc=0.060 m,b_env=0.072 m,g=0.008 m,k_fill=2/3` |
| `GEO-FREEZE-002` | 上例另给 `N_rev=4,delta_z_helix=0.080 m,lead_length=0.500 m` | `ell_helix=2.64015015963272 m,ell_terminal=3.14015015963272 m`；特意验证 `delta_z_helix != b_cc` |
| `GEO-FREEZE-003` | `N=1` | `b_cc=0,b_env=d_ax,p/g=not_applicable`；所有需要 `b>0` 的多匝电流片方法不运行 |
| `EM-L-FREEZE-001` | Lundin 原文表 1 和分支点 | 节点结果不优于原文最后位；两分支差满足论文近似声明，不把该容差转成实物精度 |
| `EM-L-FREEZE-002` | Wheeler 式 (2) 英寸原式与 SI 包装 | 机器精度一致；`b=0.8a` 两侧只改变声明域状态，不触发改用 Lundin/式 (3) 的隐藏开关 |
| `EM-L-FREEZE-003` | Rosa/Grover Example 57 与单匝极限 | CGS→SI全链经独立复算；`i=j` 互感调用必须失败；空心/矩形截面必须拒绝实心圆线自感常数 |
| `EM-Z-FREEZE-001` | 合成被动 `R1,Lp,R2,Ls,M` | 复数直接计算与分解式机器精度一致，`M=0` 和开/短路极限正确，`abs(k)>1` 阻断 |
| `EM-SKIN-FREEZE-001` | SI、Ω·cm、µΩ·cm 三种边界换算 | 三者回到同一 SI 结果；`4.05285e8` 只配 Ω·cm，`405.285` 只配 µΩ·cm |
| `ELEC-RAC-FREEZE-001` | 表面式频率/长度缩放 | `Rac_surface proportional sqrt(f)`、与 `ell` 成正比、与 `P_eff` 成反比；域外不得钳为 `Rdc` 冒充有效结果 |
| `MAT-FREEZE-001` | 材料节点、区间、Curie和域外查询 | 节点精确回返、同相区间按已登记方法插值、跨区/域外为 `insufficient_data` |
| `MAT-CMP-FREEZE-001` | 两材料比较 | 除指定材料槽位外输入快照逐字段相同；缺属性不排名、不用 generic 静默补齐 |

## 11. Gate 0 建议

| Gate 0 子域 | 建议 | 放行条件/阻断边界 |
|---|---|---|
| B/C 几何与空载电感计算依据 | **Conditional pass for documentation freeze** | 把 `g/g_rad`、`b_env/z_i/delta_z_helix` 映射和 `N/N_rev` 写入正式合同；只放行表中 Approved/Approved with limitation 方法 |
| D-05 `Rac` | **Conditional pass for limited v1 contract** | 只放行强集肤表面基线和同状态实测覆盖；通用空心/矩形/邻近解析仍 No-Go |
| E 工件电磁 | **Conditional pass for skin-depth/reference-frequency scenarios** | 皮深与参考频率可冻结；铁磁全温程数值结果受材料数据包阻断，自动最佳频率 No-Go |
| F-01/F-02 等效负载 | **Conditional pass** | 给定独立参数的反射代数和端口测量可冻结；几何自动生成 `k,R2,Ls` No-Go |
| F-03 历史标定 | **No-Go for product/runtime** | 仅 archive/audit；不得进入产品方法注册、黄金数据或推荐逻辑 |
| 三级材料系统架构 | **Pass for architecture/specification** | schema、快照、插值/缺失行为可冻结 |
| 首批材料数值预置 | **No-Go for approved numeric release** | 至少完成实际铜、项目钢、保温材料逐属性来源与查询验证；缺包不阻断架构，但阻断依赖它的数值结果 |
| 总体网站/最终计算器实现 | **Hold / No-Go** | 用户已明确本阶段只做文档冻结；正式计算依据经逐式审批后再开实现 Gate |

因此，本子域建议不是“全面通过”，而是：**允许合并和审批计算合同；禁止启动网站；禁止把未闭合的耦合、通用 `Rac` 或材料预置包装成已批准功能。**

## 12. 正式文档合并前的最小动作

1. 将本报告第 2 节的参数字典合并到正式 `PARAMETER_DICTIONARY.md` / `CALCULATION_CONTRACTS.md`，特别补入 `delta_z_helix`、`g_rad`、`N=1` 时 `p/g=not_applicable`。
2. 将第 3 节方法映射逐方法写入合同，不再保留无语义 `b` 输入。
3. 在电感方法注册表实施第 4.2 节推荐策略；允许返回“没有批准的推荐数值”，不为了 UI 完整性强选方法。
4. 将 `Req/Leq` 拆成端口量、加载增量和双绕组反射量，冻结测量参考面。
5. 将 `Rac` 拆成 `surface_estimate` 与 `measurement_identified`，禁止未审查的 `F_prox`。
6. 按第 8 节把材料归属、证据质量、记录来源和审批状态拆成正交字段；建立逐属性不可变快照。
7. 在任何具体 common preset 标为 approved 前，完成至少一套铜、一套项目钢和一套保温材料的逐属性来源审查与黄金查询测试。
8. 所有相关验证只使用新实测、经锚定 FEM、原始出版例或独立 SI 极限；历史截图/工作簿保持 archive-only。

---

**本报告结论：** 几何与材料架构可以冻结；Lundin/Wheeler/长线圈极限、受限离散法、测量辨识和给定参数的反射阻抗代数可按上述限制进入 v1 计算合同。一般粗空心/矩形导体的高精度电感、通用几何耦合与通用邻近 `Rac` 仍缺充分证据，必须保持 Deferred/Insufficient evidence，不能由历史截图或系数补齐。
