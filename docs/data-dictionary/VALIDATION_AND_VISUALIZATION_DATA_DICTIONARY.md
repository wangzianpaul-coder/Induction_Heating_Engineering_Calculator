# Validation, Freeze, Measurement, FEM and 3D Data Dictionary

> 状态：Approved architecture，2026-08-14。该 schema 不代表已有验证结果。
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`

## 1. 冻结清单

每个 `technical_freeze_id` 至少记录：冻结时间、方法/公式版本、输入 schema、单位集、材料/常数数据版本、warning 规则、求解器设置、验证协议/阈值、全部源文件 SHA-256、适用域、负责人/独立复核人/数据托管人签字。

模型冻结后修改任何公式、特征、阈值、默认物性、预处理或参数，必须生成新 freeze ID。

## 2. validation case

| 字段 | 要求 |
|---|---|
| `dataset_role` | `development | calibration | validation | sealed_holdout | external_validation | audit_only` |
| `visibility` | `project | evaluator_only | custodian_only | audit_only` |
| `evidence_use` | `development_only | calibration_only | engineering_validation | scientific_validation | external_comparison_audit_only` |
| `target_visibility` | sealed 数据必须 `custodian_only` |
| `geometry_snapshot_id/material_snapshot_id` | 指向不可变几何和物性 |
| `quantities[]` | `parameter_id,value_si,unit_si,uncertainty,basis` |
| `raw_artifacts[]` | 路径、媒体类型、SHA-256；原始文件不可覆盖 |
| `instrument_records[]` | 型号、序列号、量程、校准、采样设置 |
| `software_records[]` | FEM/CFD 软件、版本、模型、网格、边界、材料 |
| `derivation_records[]` | 派生量公式、版本、输入和不确定度传播 |
| `review_status/signoff` | pending/accepted/rejected_with_reason |

成熟软件冻结后外部比较若执行，必须使用 `dataset_role=sealed_holdout`、`evidence_use=external_comparison_audit_only`、`visibility=audit_only`；`external_validation` 只用于独立第三方实测或经批准的外部 FEM/CFD。历史聊天、工作簿、旧截图和 783 kW / 135 L/min 不得进入 scientific validation dataset。

## 3. measurement minimum fields

- 阻抗：`f,V_rms,I_rms,P,Q,phase,Z_re,Z_im`、端口、夹具/引线去嵌入、线圈/工件/水温、间隙、位置、重复测量和不确定度。
- Rac：四线 `Rdc(T)`、空载/装机 AC 复阻抗、母排/接头去嵌入、频率、电流、铜温、量热交叉检查。
- 冷却：每支路质量流量、`Tin/Tout`、`Pin/Pout`、壁温、热源控制体、水质、时间序列和稳态判据。
- 热工：几何、材料批次、厚度、内外表面多点温度、环境/围护温度、空气速度、热流/功率、姿态、开闭/偏心和端部边界。

## 4. FEM/CFD import

每个导入包包含：

- `solver_name/version`、分析类型、2D/3D；
- `coordinate_system`、长度单位、轴方向和变换矩阵；
- CAD/几何/网格/材料/边界/激励的 ID 与哈希；
- 频率、时间、相量约定、RMS/peak basis；
- 网格统计、至少三档加密记录、非线性和能量收敛；
- 字段名、单位、位置（node/cell/face）、复数表示和时间序列；
- 允许字段：temperature、magnetic_flux_density、current_density、volumetric_heat_generation 等；
- 与实验重叠工况、验证状态和不确定度。

导入数据是 `fem_or_experiment_reference`，不自动改写材料库、公式或推荐方法。

## 5. 3D engineering visualization

组件 ID 固定为 `workpiece_or_tube | insulation_layer[n] | radial_air_gap | coil_conductor | coolant_path | lead_or_bus | support_optional`。几何由 SI 参数生成并保存 `geometry_snapshot_id`。

viewer 至少支持 rotate、zoom、section、layer visibility 和组件拾取。温度/皮深/流向/热流/电磁示意若不是导入 FEM/CFD 字段，必须写入：

`visualization_provenance=schematic_or_illustrative`

并采用不能与 FEM 等值云图区分不清的图例和水印。
