# Engineering Parameter Dictionary — v1

> 状态：Frozen semantic baseline，2026-08-14。计算核心只接受 `value_si`；显示单位只在边界转换。各方法的完整必填性和适用域见 `CALCULATION_CONTRACTS.md`。
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`

## 1. 通用量值

每个量值至少包含：

| 字段 | 定义 |
|---|---|
| `parameter_id` | 稳定机器标识；不使用页面标题作为键 |
| `value_si` | SI 数值、复数或数组 |
| `dimension` | 维度标识，如 length、temperature、resistance |
| `display_value/display_unit` | 用户输入或显示值，仅用于边界和回显 |
| `basis` | `rms | peak | fundamental_rms | dc | average | local | total` 等 |
| `source_kind/source_ref` | user、derived、material、measurement、fem、approved_default |
| `uncertainty` | 标准/扩展不确定度及覆盖因子；未知时显式 `unknown` |
| `data_quality` | 材料/测量/模型数据等级 |
| `status` | `known | estimated | measured | missing | not_applicable` |

公式节点不得接收没有单位、维度或基准的裸 `number`。

## 2. 线圈几何

| parameter_id | 符号 | SI | 定义与硬约束 |
|---|---|---:|---|
| `coil.inner_diameter` | `D_i` | m | 导体内表面形成的机械内径；`D_i>0` |
| `coil.outer_diameter` | `D_o` | m | 导体外表面形成的机械外径；`D_o>D_i` |
| `coil.mean_diameter` | `D_m` | m | 导体几何中心线直径；均匀单层 `(D_i+D_o)/2` |
| `coil.current_path_diameter` | `D_c` | m | 电磁实际/等效电流路径直径；默认 `D_m`，高频/邻近显著时带 warning |
| `conductor.radial_size` | `d_rad` | m | 导体外形沿线圈径向尺寸；均匀单层 `D_o-D_i=2d_rad` |
| `conductor.axial_size` | `d_ax` | m | 导体外形沿轴向尺寸 |
| `coil.pitch_center` | `p` | m | 相邻匝中心线轴向节距；`N=1` 时为 `not_applicable` |
| `coil.turn_clearance_axial` | `g` | m | 匝间轴向净间隙 `p-d_ax`；与径向空气隙不同；`N=1` 时为 `not_applicable` |
| `coil.first_last_center_span` | `b_cc` | m | 第一匝到最后一匝中心线距离；均匀单层 `(N-1)p` |
| `coil.winding_envelope_length` | `b_env` | m | 绕组完整轴向外包络；均匀单层 `b_cc+d_ax` |
| `coil.electrical_turn_count` | `N` | 1 | 电气匝数；正整数 |
| `coil.helix_revolution_count` | `N_rev` | 1 | 实际螺旋中心路径转数；可含部分转且不由 `N` 静默推断 |
| `coil.helix_axial_advance` | `delta_z_helix` | m | 被计算螺旋路径起点到终点的轴向前进量 |
| `coil.lead_length` | `lead_length` | m | 有效绕组外引线/母排中心路径长度；非负 |
| `coil.turn_center_z[]` | `z_i` | m | 离散匝中心轴向坐标数组；坐标系和顺序固定 |

`D_i/D_o/D_m/D_c` 均指直径，不接受半径值。`d_rad/d_ax` 是导体截面尺寸，不是线圈直径。

### 2.1 Wheeler B-06 多层几何

B-06 使用完整多层绕组截面的独立机械几何，不复用单层导体尺寸：

| parameter_id | 符号 | SI | Wheeler 原符号 | 定义与硬约束 |
|---|---|---:|---|---|
| `coil.multilayer_mean_radius` | `a_ml` | m | `a` | 完整多层绕组截面的机械平均半径；不得取 `D_c/2`，也不得无条件取单层 `D_m/2` |
| `coil.multilayer_axial_length` | `b_ml` | m | `b` | 多层绕组完整轴向长度 |
| `coil.multilayer_radial_build` | `c_ml` | m | `c` | 所有绕组层合计径向厚度；不是单根导体 `d_rad` |
| `coil.layer_count` | `N_layer` | 1 | — | 整数 `>=2`，用于证明几何确为多层 |
| `coil.electrical_turn_count` | `N` | 1 | `n` | 所有层合计电气匝数 |

Wheeler 1928 原式为：

`L[µH]=0.8 a_in² N²/(6a_in+9b_in+10c_in)`。

`a_in,b_in,c_in` 均为 inch，输出 µH；计算核心先保存 SI，再在方法边界显式转换。来源为 `references/external_sources/wheeler1928.pdf`，PDF 1、印刷页 1398、Figure 1、Equation (1)。原文约 1% 声明只附着于近似 Figure 1 且 `6a`、`9b`、`10c` 数量级大致相当的绕组形状，不据此制造通用数值阈值。

单层导体 `d_rad>0`、空心管壁厚或矩形截面厚度均不能证明 `N_layer>=2`，不得触发 B-06。

### 2.2 方法几何映射

| 方法 | 径向量 | 轴向量 | 说明 |
|---|---|---|---|
| 机械布局/3D | `D_i,D_o` | `b_env` | 外包络与碰撞检查 |
| B-03 长螺线管 | `D_c` | `b_sheet=b_env` | v1 的实物到电流片映射；不是把所有长度同义化 |
| B-04 Nagaoka/Lundin | `D_c` | `b_sheet=b_env` | 电流片基线；离散匝误差另警告 |
| B-05 Wheeler 单层 | `D_c` 对应半径 `a=D_c/2` | `b_winding=b_env` | 先映射几何，再在单位边界换 inch/µH |
| B-06 Wheeler 多层 | `a=a_ml` | `b=b_ml`，径向厚度 `c=c_ml` | 独立多层路由；还需 `N_layer>=2,N`；不得静默使用 `D_m,D_c,d_rad` |
| B-07 离散圆环 | 每匝 `D_c,i` | `z_i` | 不使用单一 `b` 取代实际匝位 |
| D-01 导体长度 | 机械中心路径 `D_m` 或 CAD 分段中心线 | `delta_z_helix` | `l_helix=sqrt[(pi D_m N_rev)^2+delta_z_helix^2]`；不使用电磁等效 `D_c` |
| B-02 轴向填充 | — | `b_env` | `k_fill=N d_ax/b_env` |
| J-05 环隙 | 机械 `D_i,D_ins,o` | `s_ann=(D_i-D_ins,o)/2` | `s_ann` 为派生量或带一致性残差的独立测量；不得由 `D_c` 反推机械边界 |

若来源案例对 `b` 有不同且明确的原始定义，必须用独立 `geometry_mapping_id` 运行；不得改写 v1 参数定义。

B-03/B-04/B-05 的项目映射明确为 `b:=b_env`；这不表示 `b_cc`、`b_env`、`Np` 或螺旋路径端点前进量同义。D-01 独立消费 `D_m,N_rev,delta_z_helix,lead_length`。

### 2.3 旧命名迁移

旧名称只允许由导入层迁移；转换后不得作为第二个运行时字段继续存在。

| 旧名称 | 规范目标/派生 | 迁移规则 |
|---|---|---|
| `coil.turn_count` | `coil.electrical_turn_count` | 改名；新旧同时存在且不一致时拒绝 |
| `coil.revolution_count`,`Nrev` | `coil.helix_revolution_count`,`N_rev` | 改名；不得由 `N` 静默推断 |
| `Delta z`,`Δz` | `coil.helix_axial_advance`,`delta_z_helix` | 单位核验后改名 |
| B-03/04/05 的 `coil.current_path_radius`,`a` | `coil.current_path_diameter/2` | 只生成方法局部派生量，不存第二套几何 |
| B-03/B-04 的 `coil.sheet_length` | `coil.winding_envelope_length` | 本项目方法映射固定 `b:=b_env` |
| B-05 的 `coil.winding_length` | `coil.winding_envelope_length` | 本项目方法映射固定 `b:=b_env` |
| B-06 的 `coil.mean_radius` | `coil.multilayer_mean_radius` | 只限 B-06；不得映射到 `D_c/2` |
| B-06 的 `coil.axial_length` | `coil.multilayer_axial_length` | 只限 B-06 |
| B-06 的 `coil.radial_build`,`t` | `coil.multilayer_radial_build`，原符号 `c` | `t` 只是旧项目别名；来源追踪保留 `c` |
| `coil.turn_count/layers` | 拆为 `coil.electrical_turn_count` 与 `coil.layer_count` | 无法拆分时拒绝 |
| `Dmean`,`D_mean` | `coil.mean_diameter` | 机械 `D_m`；不得静默迁移为 `D_c` |
| `g_turn` | `coil.turn_clearance_axial` | 显示/导入别名；新 schema 不输出 |
| `g_rad` | `thermal.radial_gap` | 显示/导入别名；规范符号为 `s_ann` |
| 含糊 `b`,`L1`,`coil_length` | 不自动迁移 | 必须依据来源映射到 `b_cc`、`b_env`、`delta_z_helix` 或 `b_ml` |
| 线圈几何中的含糊 `Np` | 不自动迁移 | 除非来源明确表示 `N*p`；变压器 `N_p` 是独立拓扑参数 |

### 2.4 C-01 诊断比与方法选择边界

C-01 只统一显示 `b_env/D_c`、`p/d_ax`、`d_rad/D_c`、`N` 和 `k_fill,axial=N d_ax/b_env`。`N=1` 时 `p/d_ax` 为 `not_applicable`。

这些量只用于解释几何与方法分歧，不产生通用硬阈值或自动切换。空气芯且电流片假设成立时 B-04 是解析 Recommended，B-03/B-05 为比较；稀疏/少匝时只有 B-07 自身薄圆实心、同轴平面圆环、匝位和截面电流前提全部成立才可推荐，否则不提供解析 Recommended，并建议测量或 EM FEM。

### 2.5 必须失败的几何映射

- D-01 消费 `D_c` 而不是 `D_m` 或 CAD 机械中心线：`invalid_geometry_mapping`。
- 由 `D_c` 派生机械 `D_i` 或 `s_ann`：`invalid_geometry_mapping`。
- B-03/B-04/B-05 的局部 `b` 无法追踪到 `b_env`：`invalid_geometry_mapping`。
- B-06 用单根导体 `d_rad` 充当总径向绕组厚度，或没有 `N_layer>=2`：`not_applicable`。
- 静默互换 `Np`、`(N-1)p`、`b_cc`、`b_env`、`delta_z_helix`：`invalid_geometry_mapping`。
- 同一派生量的多个输入超出合成不确定度仍不一致：`inconsistent_input`。

## 3. 工件、保温与空气隙几何

| parameter_id | 符号 | SI | 定义 |
|---|---|---:|---|
| `workpiece.outer_diameter` | `D_w,o` | m | 被加热实体/炉管外径 |
| `workpiece.inner_diameter` | `D_w,i` | m | 空心工件内径；实心时为 0 或 not_applicable，不用缺失冒充 0 |
| `workpiece.active_length` | `L_w,act` | m | 进入当前电磁/热控制体的轴向有效长度 |
| `insulation.inner_diameter` | `D_ins,i` | m | 保温层内表面直径 |
| `insulation.outer_diameter` | `D_ins,o` | m | 保温层外表面直径 |
| `thermal.radial_gap` | `s_ann` | m | 单边径向空气隙 `(D_i-D_ins,o)/2`；必须大于等于 0；默认由机械直径派生；`g_rad` 只为文档迁移别名，不得与匝间 `g` 共用字段 |
| `thermal.effective_length` | `L_th` | m | 当前侧壁传热模型覆盖的轴向长度；端部另计 |
| `thermal.orientation` | — | 1 | `horizontal_axis | vertical_axis | inclined` |
| `thermal.gap_boundary` | — | 1 | `sealed_continuous | sealed_near_concentric | open_top_bottom | discrete_helix_open | complex_3d` |

空气隙相关式的 `L_c` 不是统一参数；它由所选方法定义，运行记录必须保存实际公式和数值。

若直接测量 `s_ann`，记录必须保存独立 `geometry_mapping_id` 和测量不确定度；当 `D_i,D_ins,o` 同时存在时执行残差检查，不得把三者当作互不相关的自由输入。机械内径只能由 `D_m-d_rad` 或真实机械/CAD几何得到，不得由频率/状态相关的 `D_c` 反推。

## 4. 导体与流道

| parameter_id | SI | 定义 |
|---|---:|---|
| `conductor.shape` | 1 | `solid_round | hollow_round | solid_rectangular | hollow_rectangular | custom` |
| `conductor.outer_diameter` | m | 圆导体外径，不是线圈 `D_o` |
| `conductor.inner_diameter` | m | 圆管内径；实心为 not_applicable |
| `conductor.wall_thickness` | m | 圆管 `(d_o-d_i)/2` |
| `conductor.metal_area` | m² | 真实金属截面积 |
| `coolant.flow_area` | m² | 内部流通面积；不得与 metal area 混用 |
| `coolant.wetted_perimeter` | m | 水力直径用润湿周长 |
| `coolant.hydraulic_diameter` | m | `4 A_flow/P_wetted` |
| `coolant.branch_count` | 1 | 并联支路数；不默认均分 |

## 5. 电磁与端口量

| parameter_id | SI | 定义 |
|---|---:|---|
| `frequency` | Hz | 基本频率；角频率 `omega=2pi f` |
| `resistivity` | Ω·m | 电阻率；不得以 Ω·cm 裸值进入核心 |
| `relative_permeability` | 1 | 与 `T,H/B,f,state` 绑定的有效值 |
| `skin_depth` | m | `sqrt[rho/(pi f mu0 mur)]` 的参考皮深 |
| `port.impedance` | Ω | 指定端口、频率和状态的复数 `Z=R+jX` |
| `port.req_series` | Ω | 串联等效实部 `Re(Z)` |
| `port.leq_series` | H | 感性时 `Im(Z)/omega`；容性状态不得强称电感 |
| `port.voltage_rms` | V | 指定端口 RMS 相量/幅值 |
| `port.current_rms` | A | 指定端口 RMS 相量/幅值 |
| `port.active_power` | W | 同端口、同时间基准吸收有功 |
| `port.reactive_power` | var | 同端口无功，正负号随冻结约定 |

## 6. 功率与热控制体

`P_grid`、`P_inverter_out`、`P_coil_terminal`、`P_workpiece_absorbed`、`P_useful`、`P_cu`、`Q_loss_environment`、`Q_pickup_to_coil`、`Q_coolant` 是不同参数，禁止只写 `P` 或在模块间换义。

冷却控制体只接收真实进入指定水路的 `P_cu + Q_pickup_to_coil + P_other_cooled`。无功、工件有用热、整厂损耗和未进入该回路的热损不属于该和式。

## 7. 温度与流体

- 所有绝对温度核心值为 K；温差为 K。
- `water.pressure_abs` 使用 Pa absolute，不接受表压冒充绝压。
- `water.mass_flow` 为 kg/s；`water.volume_flow` 为 m³/s；`water.velocity` 为 m/s，三者不得共用字段。
- `water.bulk_temperature`、`tube.inner_wall_temperature`、`tube.outer_wall_temperature` 和 `coil.mean_temperature` 分开。
- `saturation_margin_wall=Tsat(p_local)-T_wall_inner_est` 只表示热力学温差；正值不自动证明无成核沸腾。

## 8. 结果与失败状态

`result_status` 固定为：

`success | success_with_warnings | not_applicable | insufficient_data | non_converged | no_feasible_solution | invalid_input | inconsistent_measurement`

正常数值不得用 0、空白、NaN 或占位常数替代后三类状态。每个结果必须携带 `method_id/version`、物性快照、适用域、warning、来源、验证状态和建议有效数字。
