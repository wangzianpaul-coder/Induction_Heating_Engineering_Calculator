# ADR-0003：v1 线圈几何参数统一定义

- 状态：**Accepted — Approved for v1 implementation**
- 日期：2026-08-14
- 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`
- 对应用户决定：3

## 决策

线圈几何采用以下唯一语义，内部单位均为 m，除 `N`、`N_rev` 外不得存裸数字：

| parameter_id | 符号 | 冻结定义 |
|---|---|---|
| `coil.inner_diameter` | `D_i` | 线圈导体内表面形成的机械内径 |
| `coil.outer_diameter` | `D_o` | 线圈导体外表面形成的机械外径 |
| `coil.mean_diameter` | `D_m` | 导体几何中心线直径；均匀单层时 `(D_i+D_o)/2` |
| `coil.current_path_diameter` | `D_c` | 电磁方法采用的实际/等效电流路径直径；v1 默认 `D_c=D_m` |
| `conductor.radial_size` | `d_rad` | 导体截面沿线圈径向的外形尺寸 |
| `conductor.axial_size` | `d_ax` | 导体截面沿线圈轴向的外形尺寸 |
| `coil.pitch_center` | `p` | 相邻匝导体中心线的轴向节距 |
| `coil.turn_clearance_axial` | `g` | 相邻匝轴向净间隙，`g=p-d_ax` |
| `coil.first_last_center_span` | `b_cc` | 第一匝中心线到最后一匝中心线的轴向距离 |
| `coil.winding_envelope_length` | `b_env` | 完整绕组轴向外包络长度 |
| `coil.electrical_turn_count` | `N` | 电气匝数，正整数 |
| `coil.helix_revolution_count` | `N_rev` | 实际螺旋导体路径转数，可与 `N` 分开 |
| `coil.lead_length` | `lead_length` | 有效绕组范围之外的引线/母排有效长度 |

均匀单层绕组且定义成立时：

`b_cc=(N-1)p`

`b_env=b_cc+d_ax`

`D_o=D_i+2d_rad`

`D_m=(D_i+D_o)/2=D_i+d_rad`

`N=1` 时 `b_cc=0`、`b_env=d_ax`。禁止将 `Np`、`(N-1)p`、`b_cc`、`b_env` 或含糊的“线圈长度”互换。

## 方法映射

- 机械布置和 3D 外包络：`D_i,D_o,b_env`。
- v1 电流片、长螺线管和 Wheeler 映射：采用 `D_c` 与方法合同明确的 `b_method`；默认物理映射为 `b_env`，同时保存原始几何，不允许方法内部自行换成 `b_cc` 或 `Np`。
- 离散圆环：直接使用每匝中心坐标 `z_i` 和 `D_c,i`，不由一个含糊长度替代。
- 导体长度：使用真实螺旋中心路径、`N_rev`、显式轴向前进量 `delta_z_helix` 和 `lead_length`；不得由 `N` 静默猜 `N_rev`。
- 轴向填充系数：v1 定义 `k_fill=N d_ax/b_env`，只表示轴向投影覆盖率。
- 高频或强邻近情况下 `D_c=D_m` 只是一阶近似，必须返回 `COIL_CURRENT_CENTROID_UNRESOLVED`；实测/FEM 可提供覆盖值，但不得静默改写机械几何。

## 命名冲突处理

`g` 已冻结为匝间轴向净间隙。线圈与保温层之间的单边径向空气隙使用独立参数 `thermal.radial_gap`、规范符号 `s_ann`：

`s_ann=(D_i-D_ins,o)/2`

禁止把直径差直接当 `s_ann`，也禁止让热工模块复用 `g`。`g_rad` 只作为旧文档迁移别名，不得进入新运行时 schema。
