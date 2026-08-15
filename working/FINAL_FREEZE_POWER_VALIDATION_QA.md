# Final Freeze QA — Power Topologies, Validation and Gate 0

> 日期：2026-08-14  
> 性质：独立工程/文档 QA；仅供正式冻结修订使用，**本文件本身不批准公式，也不授权实施**。  
> 审查范围：用户最新 15 项范围决定、全部现有正式 Markdown/CSV、正式目录中的数据与验证占位状态。重点复核决定 12–15、电源拓扑、密封留出、最小试验/FEM、隐藏循环和 Gate 0。  
> 写入边界：只创建本 `working/` 报告；未修改正式文档、`src/` 或 `tests/`。

## 0. 结论先行

正式资料仍是**可审查但未冻结**的计算依据，不能进入网站开发。`src/`、`tests/`、`data/validation/`、`validation/cases/` 和 `validation/benchmarks/` 当前均为空，因此没有误开始最终网站或计算核心。

同时，以下问题会阻断技术冻结：

| 严重度 | 编号 | 结论 | 可执行修订 |
|---|---|---|---|
| **P0** | FF-01 | 用户最新 15 项范围决定没有正式 ADR；`CALCULATION_BASIS.md`、`PROJECT_AUDIT.md`、`APPLICATION_ARCHITECTURE.md` 仍把其中多项列为“待批准”。 | 新建决策 ADR，逐条记录决定、适用范围、被取代段落和生效日期；旧待定清单改为“已决/仍待方法批准”两栏。 |
| **P0** | FF-02 | 正式架构仍要求未来 UI 并列显示“成熟软件截图复现”，并建议冻结后获取“新截图密封留出”；这与决定 1、6、13 的“最终 UI 不出现截图校对、不得为截图调模、sealed holdout 不留截图反推叙事”冲突。 | 将截图/工作簿永久隔离为只读研究历史；最终产品契约删除截图比较字段和展示要求；科学 sealed holdout 改用独立实测及经试验锚定的 FEM 数值数据。 |
| **P0** | FF-03 | 多拓扑范围已由用户批准，但 G-07～G-10 尚未形成可冻结的共同端口语义：实际并联型最常见的 `(R_s+jωL) || C` 未列正式方程，LLC 只写“不得通用化”而未写本项目参考拓扑的基础复阻抗。 | 建立电源拓扑 ADR/数据字典；采用本报告第 3 节的明确 topology ID、RMS 相量约定和逐拓扑方程；未知 topology ID 必须 `insufficient_data`。 |
| **P0** | FF-04 | `VALIDATION_CASES.md` 只有一段真实验证设想，没有可机读 schema、冻结清单、数据托管、目标隐藏、预注册阈值或已执行的阻抗/Rac/冷却/热工验证。 | 建立第 4～5 节协议与 schema；阈值在采集前签字；对首版要批准的方法执行最小计划，或把该方法从首版范围排除。 |
| **P0** | FF-05 | 52 项契约目前均未获方法批准；多个关键数据/相关式仍 `not_approved/insufficient_data`。决定 15 要求“技术冻结后才开发”，所以不能以“范围已批准”替代公式、数据和验证批准。 | 形成 v1 方法清单；每项必须为 `approved` 或 `approved_with_limits`，否则明确排除；签署技术冻结 manifest 后才允许开始开发。 |
| **P1** | FF-06 | `VALIDATION_CASES.md` 仍把历史 `783 kW/135 L/min` 列为已执行冷却验证案例 TH-C-002；决定 9 明确禁止两数参与冷却模型的输入校准或验证。 | 从正式验证集移出，保留在 `PROJECT_AUDIT.md` 的“控制体未定义历史冲突”中；不得生成黄金目标或验收残差。 |
| **P1** | FF-07 | 3D 工程可视化和未来 FEM 导入只有笼统的“外部 FEM 参考”方向，没有坐标、单位、几何版本、场量、网格、材料和数据完整性契约。 | 新建可视化/FEM 导入 ADR 和数据字典；明确“可视化不是 FEM”，导入结果不反向改写通用公式。 |

这里必须区分两种批准：

- **用户已批准的是产品/工程范围决定**，例如“支持多拓扑”“测量优先”“技术冻结后再开发”。
- **具体方法仍未获工程计算批准**。本 QA 无权把当前 `not_approved` 直接改成 `approved`；只能指出哪些代数已经具备进入 `approved_with_limits` 评审的条件，以及还缺什么。

## 1. 用户 15 项决定落实矩阵

| # | 用户决定 | 当前正式落实 | QA 判定与必须动作 |
|---:|---|---|---|
| 1 | 最终 UI 不出现截图校对 | 架构 6.3 仍要求并列显示成熟软件兼容结果和差值 | **冲突/P0**。历史截图只留审计档案和内部研究报告；删除最终 UI/结果包的截图轨要求。 |
| 2 | mm/cm 由核实公式和来源裁决，历史表不裁决 | 计算依据已要求 SI 内部制和原单位可追踪 | 基本一致；在正式 ADR 中记录“历史间隙单位不再是冻结阻断项，未知时只降级该历史案例”。 |
| 3 | 批准几何语义及 `D_c` 默认 `D_m` 并给高频警告 | 契约已有部分字段，但正式决策和完整默认规则尚未登记 | 部分落实；补几何数据字典、`N_rev/lead_length` 路径语义及 `D_c=D_m` 的适用条件/警告。 |
| 4 | 所有合适方法均可计算并标 Recommended | 电感比较架构存在；多数方法仍未批准 | 范围一致、状态未闭合；Recommended 必须由适用域规则产生，不能靠 UI 硬编码。 |
| 5 | `Req/Leq` 给估算，同时声明实测更准 | F-02 推荐实测；几何正向估算尚不闭合 | 原则一致；没有证据时仍须 `insufficient_data`，不得为“必须给估算”发明关系。可批准的估算法需独立 method ID 和不确定度。 |
| 6 | 继续研究历史系数，但禁止为截图调模；若保留仅限实际工况校准域且不进入最终截图叙事 | ADR-0001/架构仍允许“成熟软件截图校准模型”进入未来结果包 | **冲突/P0**。历史系数可作为研究假设；可部署的校准只能绑定实际测量工况，不得以截图贴合为工程验收。 |
| 7 | `Rac` 给估算并允许实测覆盖 | D-05 明确一般模型未批准，建议实测 | 部分落实；需批准至少一个限定几何估算法、测量覆盖优先级、去嵌入和温度/频率状态键。 |
| 8 | 三级材料库并可比较 | 只有候选数据要求文件，没有批准数据包 | 未闭合；三级含义、比较规则和数据冲突处理需正式字典，不能用无来源默认值填库。 |
| 9 | 冷却完全重建；历史 783/135 不参与输入校准或验证 | H 链已重建，但 TH-C-002 仍在正式验证文档 | **部分冲突/P1**。保留审计算术，不得留在 validation case 或 calibration dataset。 |
| 10 | 双目标保温；完整圆筒平衡；GB 疑式澄清前用独立 Fourier | I 模块和验证例已经按此方向编写 | 范围基本一致；方法仍待来源/容差批准。 |
| 11 | 环隙多工况架构 | 架构已区分边界，但无批准相关式 | 方向一致；每种方向、开闭、偏心/强制流工况须独立 method ID，未闭合时推荐 CFD/FEM/实验。 |
| 12 | 电源支持多拓扑 | G-07～G-10 分开列出，但只有串联和理想并联基础式完整 | **范围已批、方法未冻结/P0**。按第 3 节补完端口、实际并联、变压器和特定 LLC；不得使用“parallel/LLC”文字标签代替 netlist。 |
| 13 | 模型冻结后取得新的 sealed holdout；不出现截图反推痕迹 | 架构要求“冻结后另取新截图”作留出 | **直接冲突/P0**。sealed scientific holdout 只接受独立实测/经试验锚定 FEM；截图兼容研究若保留，必须是隔离的非产品历史研究集。 |
| 14 | 批准最小试验/FEM计划 | EM-Z-003 只有一段计划，无 schema、阈值、托管、运行结果 | **未落实/P0**。采用第 4～5 节最小协议，预注册阈值并执行。 |
| 15 | 技术冻结后才开发；未来含 3D 工程可视化和 FEM 导入 | 架构明确 UI 最后；`src/tests` 为空；3D/FEM 导入契约缺失 | “未开发”已遵守；冻结和 3D/FEM 数据边界仍须 ADR。 |

## 2. 审批语义和统一枚举

正式 `docs/METHOD_STATUS_DICTIONARY.md` 的批准枚举可以保留：

`draft | not_approved | approved_with_limits | approved | reference_only | rejected_current_form`

但当前跨文档有三类漂移：

1. `CALCULATION_CONTRACTS.md` 使用 `specification_candidate`、`partial_specification` 等未定义后缀；
2. `APPLICATION_ARCHITECTURE.md` 又使用 `reviewed/deprecated/retired/rejected` 作为另一套生命周期；
3. `VALIDATION_CASES.md` 使用 `executed_formula_check`、`historical_exposed_workbook`、`not_established`、`planned_trend_check` 等未登记状态。

建议把字段分开，禁止用斜杠把不同概念拼成一个字符串：

| 字段 | 推荐枚举/含义 |
|---|---|
| `approval_status` | 使用正式方法批准枚举；决定能否作为正常结果 |
| `specification_completeness` | `missing | partial | complete` |
| `method_type` | 使用现有 method type 枚举 |
| `validation_status` | `not_defined | specified_not_run | running | executed_pass | executed_fail | blocked` |
| `dataset_role` | `development | calibration | sealed_holdout | external_validation` |
| `result_provenance` | 使用现有结果血缘枚举；不得代替批准状态 |
| `lifecycle_status` | `active | deprecated | retired`；只描述版本寿命 |

用户决定可记录为 `decision_status=approved`，但不得自动提升任何 `approval_status`。

## 3. 电源多拓扑冻结审查

### 3.1 全局端口与相量约定（所有拓扑的硬前置条件）

正式数据字典至少应冻结：

- 正弦稳态相量采用 **RMS**，时间约定 `Re{V exp(jωt)}`；
- 电流正方向进入被动网络，`Z_L=jωL`，`Z_C=1/(jωC)=-j/(ωC)`；
- 复功率 `S=V I* = P+jQ`，正 `P` 表示网络吸收有功；
- `port_id`、正负端、变压器变比方向、线圈端/槽路端/逆变桥端/网侧端必须显式；
- `fundamental_rms`、`switching_waveform_rms`、峰值和直流母线量不得互换；
- `R,L,Req,Leq` 必须绑定同一 `f`、温度、工件状态、间隙和等效形式；
- `loaded_state = empty | workpiece_cold | workpiece_hot | user_identified`；
- 未给 `topology_id + port_definition + quantity_basis` 时，电容、变比、端口电压、电流和器件应力均返回 `insufficient_data`。

建议的最低 topology ID：

- `series_rlc_single_loop`
- `parallel_ideal_r_l_c_branches`
- `parallel_c_with_series_rl_load`
- `ideal_transformer`
- `llc_zjl_fig2_6_fundamental_equivalent`

“Series LC”“Parallel LC”“LLC”只能是显示名称，不能作为可执行 topology ID。

### 3.2 Series RLC：可进入限定批准评审的基础模型

端口直接看到串联 `R_s,L,C`：

`Z_in(ω)=R_s+j(ωL-1/(ωC))`

`ω0=1/sqrt(LC)`，`f0=ω0/(2π)`，在该理想集中网络中 `Z_in(ω0)=R_s`。

RMS 端口量：

`I=V_in/Z_in`，`V_R=I R_s`，`V_L=jωLI`，`V_C=I/(jωC)`。

串联品质因数仅在上述定义下：

`Q_s=ω0L/R_s=1/(ω0 C R_s)`。

适用域：线性、集中参数、单频正弦稳态，`R_s` 为同一端口串联总损耗，`L` 为明确设计状态的串联等效。它不覆盖器件 ESR/ESL、母排寄生、开关谐波、磁性非线性和随温度变化的运行轨迹。

**QA 分类：**当前正式状态保持 `not_approved`；独立代数科学置信可为 `high`。补齐一手来源页/受控推导、执行 PWR-SER-001/002 后，可提交 `approved_with_limits`，不能直接提交无条件 `approved`。

### 3.3 Parallel：必须拆成两种不同网络

#### A. 独立理想并联 `R || L || C`

`Y_in=1/R_p+j(ωC-1/(ωL))`，`Z_in=1/Y_in`。

`ω0=1/sqrt(LC)` 时 `Im(Y_in)=0` 且 `Z_in=R_p`。这里的 `R_p` 是**单独的并联电阻支路**，不能拿线圈串联损耗 `R_s` 直接代入。

#### B. 实际常见候选：串联损耗线圈支路 `(R_s+jωL)` 与 `C` 并联

`Y_in=1/(R_s+jωL)+jωC`

`=R_s/[R_s²+(ωL)²] + j{ωC-ωL/[R_s²+(ωL)²]}`。

令端口 susceptance 为零时：

`ω0²=1/(LC)-(R_s/L)²`

只有 `1/(LC)>(R_s/L)²` 时存在正的该特征频率。在该点：

`Z_in(ω0)=L/(C R_s)`（纯实数，理想元件假设）。

这说明实际并联补偿的频率和端口阻抗与理想 `R||L||C` 不同。还必须另外计入电容 ESR、引线、变压器和电流源/换流边界，器件选型不能只靠 susceptance 为零。

**QA 分类：**理想 `R||L||C` 当前为 `not_approved/partial`，可在明确电路图后申请 `approved_with_limits` 作为极限/教学基线；`(R_s+jωL)||C` 虽是可复核代数，但当前未出现在正式 G-08 合同、来源注册或验证案例中，必须保持 `not_approved`，补规格后再评审。

### 3.4 理想匹配变压器：只批准代数身份，不批准真实器件设计

定义 `n=N_p/N_s=V_p/V_s=I_s/I_p`，所有量为同一基波 RMS 相量，则：

`Z_in,p=n² Z_load,s`

`V_p=nV_s`，`I_p=I_s/n`，理想复功率 `V_p I_p* = V_s I_s*`。

该模型不含磁化支路、漏感、绕组 `Rac`、铁损、饱和、寄生电容、绝缘、温升、伏秒和整流/逆变关系。因此工作簿中的 `1.35`、`1.414`、`π` 或 `n≈k_rect U_LL/(I Req)` 不能并入理想变压器公式。

**QA 分类：**当前 `not_approved/partial`；代数可在端口方向和 PWR-XFMR-001 通过后申请 `approved_with_limits`。实际变压器选型仍为 `insufficient_data`，除非另建并批准完整高频变压器方法。

### 3.5 LLC：只允许拓扑绑定的基波模型

现有可追溯项目参考是张金龙论文图 2.6：源端先串联 `L_s`，之后为 `C` 与串联负载 `(R_eq+jωL_Req)` 的并联节点。对单一正弦频率，其基础网络方程应直接写为：

`Z_w=R_eq+jωL_Req`

`Y_p=jωC+1/Z_w`

`Z_p=1/Y_p`

`Z_in=jωL_s+Z_p`。

这组方程是指定线性等效网络的相量代数。若输入来自逆变方波，把电源映射到基波幅值已经是 FHA；若要覆盖谐波、开关换流和非线性，须另建全波/时域模型，不能把本式称为完整逆变器模型。

论文还定义：

`L_bar=(L_s L_Req)/(L_s+L_Req)`，`β=L_s/L_Req`，`Q=sqrt(L_bar/C)/R_eq`

`f1=1/[2πsqrt(L_Req C)]`，`f0=1/[2πsqrt(L_bar C)]`，且在 `ω0` 有 `arg Z_in=atan(β/Q)`。

这两个是该论文拓扑的特征频率，不应统称唯一“LLC 谐振频率”。论文后续 `Q>>1` 的功率/增益简式只能在相同定义和高 Q 域中使用。

**QA 分类：**广义 LLC 仍 `not_approved/insufficient_data`；上述图 2.6 基波网络可作为 `reference_only` 的拓扑绑定候选。完成原页二人转录核对、独立电路求解器交叉验证和实验端口对照前，不提升。高 Q 简式继续 `reference_only`，绝不用于低 Q。

### 3.6 必须新增的解析验证案例

以下容差只用于双精度代数身份/实现忠实，不是工程测量精度：

| ID | 输入 | 预期结果 | 建议数值容差 |
|---|---|---|---|
| PWR-SER-001 | `R=0.05 Ω,L=10 µH,f=10 kHz,C=25.33029591 µF` | `Im Z≈0`，`Re Z=0.05 Ω`，`Q_s=12.56637061`，`V_L` 与 `V_C` 相消 | 复数式 `rtol≤1e-12`，零量 `atol≤1e-12 Ω` |
| PWR-SER-002 | 同一 R/L/C，频率为 `0.8f0` 与 `1.2f0` | 虚部符号分别为容性/感性；直接复数计算与展开式一致 | `rtol≤1e-12` |
| PWR-PAR-IDEAL-001 | `R_p=5 Ω,L=10 µH,C=25.33029591 µF,f=10 kHz` | `Im Y≈0`，`Z_in=5 Ω` | `rtol≤1e-12` |
| PWR-PAR-RL-001 | `R_s=0.05 Ω,L=10 µH,f=10 kHz,C=25.17089933 µF` | `Im Y≈0`，`Z_in=7.945683521 Ω`；不得误报为理想并联 5 Ω 或串联 0.05 Ω | `rtol≤1e-11` |
| PWR-XFMR-001 | `n=2,Z_s=0.1+j0.2 Ω` | `Z_p=0.4+j0.8 Ω`；给定任意兼容 RMS 端口时复功率守恒 | `rtol≤1e-12` |
| PWR-LLC-ZJL-001 | `L_s=300 µH,L_Req=100 µH,C=0.4 µF,R_eq=1.5 Ω` | `f1=25.164606 kHz`，`f0=29.057584 kHz`；在 `f0`，直接相量计算 `Z_in≈12.18412+j4.00411 Ω`、相角 `18.19226°=atan(β/Q)` | `rtol≤1e-8`；先完成原页/变量核对 |
| PWR-PORT-NEG-001 | 混合峰值/RMS、未给端口方向或拓扑未知 | `insufficient_data`，不输出补偿 C/变比/器件应力 | 状态精确匹配 |

数值复算结果独立通过不等于 LLC 的工程适用性通过；它只证明方程转录和代数一致。

## 4. Sealed holdout 与模型冻结

### 4.1 数据角色和禁止混用

每个 case 只能有一个主要 `dataset_role`：

- `development`：探索公式、选择特征和诊断；目标完全暴露；
- `calibration`：估计模型参数；目标对模型负责人可见；
- `sealed_holdout`：冻结后取得，目标对模型开发者不可见，由独立托管人运行一次；
- `external_validation`：由独立机构/项目提供、模型未接触的复核集。

现有聊天、工作簿、截图及其派生值全部为 `historical_exposed_reference`，不得改名为 `sealed_holdout`。若它们曾影响特征、公式、阈值或参数，冻结 manifest 必须声明该影响。

决定 13 下的科学 sealed holdout 应来自：

1. 独立仪器实测；或
2. 已由独立实测锚定、网格/边界/材料完整且未参与模型拟合的 FEM 数值输出。

截图反推、OCR 数字、同一 Excel 派生列、由待验证模型生成的合成数据均不得充当科学 sealed target。若项目继续内部研究成熟软件兼容性，应放在与产品/科学验证物理隔离的研究数据集中，最终 UI、工程置信和产品导出不出现该轨。

### 4.2 冻结 manifest（缺一项不得打开 holdout）

| 字段 | 类型/要求 |
|---|---|
| `freeze_id`, `frozen_at_utc` | 唯一字符串、ISO-8601 |
| `model_id`, `model_version`, `approval_status` | 必填；批准状态不能由本次 holdout 结果预先填充 |
| `source_artifact_sha256` | 公式规格、实现包或可执行 artifact 的不可变哈希 |
| `method_ids`, `formula_revision_ids` | 完整列表 |
| `input_schema_version`, `unit_system` | 必填；内部固定 SI |
| `feature_list`, `preprocessing`, `derived_inputs` | 完整、顺序固定；不得在开封后增删 |
| `calibration_dataset_ids` | 全部开发/校准数据及哈希 |
| `parameter_values`, `solver_settings`, `random_seed` | 无随机项也显式 `not_applicable` |
| `applicability_domain`, `warning_predicates` | 冻结输入包络和阻断规则 |
| `metrics`, `acceptance_thresholds` | 每个输出预注册，不能看结果后调整 |
| `software_runtime`, `library_versions` | 可重现环境 |
| `developer_signoff`, `independent_reviewer`, `data_custodian` | 三角色分离；姓名/时间/签名 |

### 4.3 通用 case 数据 schema

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `schema_version`, `dataset_id`, `case_id`, `record_id` | string | 是 | 不可复用 ID |
| `dataset_role` | enum | 是 | 四种角色之一 |
| `target_visibility` | `open/developer_blind/custodian_only` | 是 | sealed 必须 `custodian_only` |
| `acquired_at_utc`, `operator_id`, `facility_id` | string | 是 | 采集血缘 |
| `raw_artifacts[]` | `{path,sha256,media_type}` | 是 | 原始文件不可覆盖 |
| `geometry_snapshot_id`, `material_snapshot_id` | string | 是 | 指向冻结几何/物性 |
| `state` | object | 是 | 温度、频率、间隙、位置、表面/相态等 |
| `quantities[]` | `{parameter_id,value_si,unit_si,u_standard,coverage_factor,basis}` | 是 | 原始量优先；派生量另记公式版本 |
| `instrument_records[]` | object | 实测必填 | 型号、序列号、量程、校准日期、采样设置 |
| `software_records[]` | object | FEM必填 | 求解器/版本、模型/网格/边界/材料版本 |
| `repeat_index`, `quality_flags[]` | integer/list | 是 | 不以静默删除替代异常说明 |
| `derivation_records[]` | object | 有派生量必填 | 原始字段、method/version、结果和不确定度传播 |
| `review_status`, `reviewer_signoff` | enum/object | 是 | `pending/accepted/rejected_with_reason` |

### 4.4 模态专用字段

| 数据集 | 最低原始字段（均带 SI 单位和不确定度） | 禁止做法 |
|---|---|---|
| 阻抗 | 线圈/工件 ID、间隙/轴向位置、铜/工件/水温、`f,V_rms,I_rms,P,Q,phase,Z_re,Z_im`、基波/全波标签、扫频点、开短载/夹具去嵌入、重复测量 | 只存 `Req/Leq` 派生值；用 `P/I²` 与 `Q/(ωI²)` 再验证同一 P/Q |
| `Rac` | 四线 DC 电阻及铜温、空载 AC 复阻抗、已知母排/接头/夹具损耗、频率、电流幅值、安装状态、热稳定判据、量热交叉检查 | 以工作簿铜损反算 Rac 后再声称 Rac 预测通过 |
| 冷却 | 每支路质量流量、`T_in/T_out`、`p_in/p_out`、水质/压力、铜/壁温、热源电功率或量热、环境温度、时间序列、稳态判据 | 用总系统损耗自动当线圈水路热负荷；使用 783/135 作校准/验收 |
| 热工/保温/环隙 | 几何与层厚、材料批次/k/ε来源、内外表面多点温度、热流/输入功率、环境/围护温度、空气速度、方向、开闭/偏心状态、端部边界、时间序列 | 只测一个表面温度就同时宣称总热损和局部热点准确 |
| FEM | 求解器/版本、CAD hash、2D/3D、坐标/单位、激励端口、频率/相量基准、边界、材料曲线、网格统计和至少三档加密、非线性收敛、功率/能量闭合、字段导出 hash | 把单个 FEM 图或网格未收敛结果当通用公式真值 |

### 4.5 密封隔离规则

1. 模型负责人签署 freeze manifest 后，数据托管人才创建/接收 sealed case；创建时间必须晚于冻结时间。
2. 开发者不得看到目标值、派生目标、带目标暗示的文件名或汇总图。由独立 evaluator 将冻结 artifact 运行在 sealed inputs 上。
3. 原始数据、manifest、预测文件和评分报告分别哈希并写入只增不改的 registry；失败也不得删除。
4. 每个 freeze ID 原则上只允许一次正式评分。诊断后任何公式、特征、参数、阈值或预处理变化都产生新 model version；旧 holdout 自此对新版本属于 `exposed`，必须取得新 sealed set。
5. 容差、排除规则和异常值政策必须在采集/开封前批准；不得看残差后改阈值或删 case。
6. sealed 通过只对 manifest 中的工况包络和输出有效；不自动批准材料外推、其他拓扑、局部热点或 FEM 未覆盖边界。

## 5. 最小试验与 FEM 验证计划

下面是可执行的**最小建议**；具体频率、温度、间隙、安全上限和数值验收阈值必须由项目工程负责人在试验前批准，不能由本 QA 臆造。

| 协议 ID | 最小矩阵 | 原始观测 | 主要输出/判据 |
|---|---|---|---|
| EXP-Z-001 端口阻抗 | 实际目标线圈；空载、冷工件、至少 3 个运行温度平台；设计频率及其上下各一档；名义间隙及上下扰动；每点独立重复 ≥3。铁磁材料若跨 Curie 运行，须含过渡前/附近/后安全平台。 | 同步 `V,I,P,Q,phase` 或原始波形、端口/夹具、各温度和位置 | `Z_re,Z_im,Req,Leq` 及不确定度；被动性；扫频连续性；加载差值 |
| EXP-RAC-001 线圈 Rac | 四线 DC：至少 3 个铜温；AC 空载与实际安装状态：设计频率上下各一档、至少 3 个电流水平；每点 ≥3；另做量热损耗交叉检查 | DC V/I、AC 复阻抗、去嵌入母排/接头、铜温、冷却状态、输入功率和量热 | 估算模型偏差、温升/频率/电流依赖；实测覆盖值及包络 |
| EXP-COOL-001 冷却 | 最小/名义/最大设计流量，各配至少低/名义/高三档可控热负荷；逐支路测量；稳态和至少一次升温瞬态 | 质量流量、Tin/Tout、Pin/Pout、铜/壁温、环境、热源边界、水质、时间序列 | 水侧量热、压降、局部壁温、能量闭合、沸腾/空化/冲蚀裕量（依据待批准） |
| EXP-THERM-001 保温与热损 | 无保温基线、至少两种厚度（含拟采用厚度）；分别覆盖“目标表温”和“目标热损”；实际方向/端部/环境；环隙按开闭/偏心实际边界另案 | 内外表面空间温度、热流/输入功率、环境/围护温度、空气速度、时间序列、材料批次 | 稳态热损、表温、瞬态曲线、端损份额；两目标不得用同一观测互相循环验证 |
| FEM-EM-001 电磁 | 与 EXP-Z/RAC 相同几何/状态；轴对称主区域先做 2D；引线、螺旋、偏心、非轴对称集中器用 3D；每案至少三档网格加密 | 端口激励、材料复数/非线性曲线、网格、边界、场积分、能量闭合 | `Z,Req,Leq,Pcu,Pworkpiece`；网格收敛；与独立实测比较 |
| FEM-TH-001 热流体 | 与 EXP-COOL/THERM 相同几何、流量和边界；共轭换热/辐射若启用须分别列模型 | 材料/湍流/辐射模型、边界、网格、时间步、残差、热平衡 | Δp、温度场、局部壁温、热损；先通过实验锚定再作外推参考 |

FEM 只能成为 `fem_or_experiment_reference`，不能因网格收敛就升格为物理真值。至少应满足：三档网格的积分输出按预注册阈值收敛、总输入功率与各域损耗/边界热流闭合、材料和边界可追踪，并在一个重叠工况上与独立试验不确定度带比较。

### 5.1 验收指标必须预注册

每个输出 `q` 至少预注册：

- 有符号偏差、MAE、RMSE、最大绝对误差；
- 当目标不接近零时的相对误差；接近零时只用绝对误差；
- 重复性、仪器标准不确定度、覆盖因子和合成扩展不确定度；
- 残差随频率、温度、间隙、流量/厚度的系统趋势；
- 工程接受上限 `A_q`、相对上限 `R_q`、允许的域外策略和失效动作。

建议判据形式为：`abs(error) <= max(A_q, R_q*abs(reference))`，同时要求不存在超出不确定度解释的系统性偏差。但 `A_q/R_q` 的数值必须由测量能力、设计裕量和风险分析决定；本报告不编造“5%/10%”之类通用阈值。阈值空白时，验证状态只能为 `specified_not_run` 或 `executed_unjudged`，不能是 `executed_pass`。

## 6. 隐藏循环依赖和求解所有权

| 循环 | 风险 | 必须冻结的解法 |
|---|---|---|
| `Req/Leq(T,f,gap)` → 电流/功率 → 工件温度 → `Req/Leq` | 用同一目标反算并回代会得到假闭合；谐振点随热态变化 | 设计点计算与运行瞬态分开。运行由外层 electrothermal solver 在每个时间步更新状态并报告残差；F 模块只消费冻结状态，不回调 G。 |
| `Rac(Tcu,f,I,state)` → `Pcu=I²Rac` → 水流/铜温 → `Rac` | 冷却和电阻相互隐式调用可能“碰巧收敛” | 外层求 `Tcu/Twater/Rac`；测量覆盖值按状态查表，禁止 H 模块自行改 Rac。 |
| `C` 设计 → `f0` → 加载 `L(T,f)` → 新 `C` | 不声明设计状态会无限重选电容或误用空载 L | 补偿 C 绑定 `design_state_id`；运行模型只报告偏谐振，不自动重设计。 |
| 变比 `n` → 端口阻抗/电流 → 加热状态 → 负载变化 → 新 `n` | 把选型和运行求解混为一体 | 变比选型是冻结设计变量；运行求解不自动修改 n。实际器件限制另做校核。 |
| 工件辐射/对流拾取 → 冷却负荷 → 线圈/水温 → 拾取 | 外部热拾取若既由 J 算又作为 H 的固定输入会重复或循环 | 由系统求解器拥有跨模块控制体；每项热流只登记一次 provenance 和目标控制体。 |
| 校准特征/阈值 → holdout 结果 → 改特征/阈值 | 验证集泄漏 | 采用第 4 节一次性冻结/托管；修改即新版本、新 holdout。 |

外层求解器至少记录迭代变量、初值、更新顺序、收敛范数、能量残差、最大迭代数和非收敛状态；普通公式模块保持无副作用、无彼此回调。

## 7. 正式文档逐项落实审查

| 正式对象 | 已做到 | 冲突/缺口 | 优先级与修订 |
|---|---|---|---|
| `README.md` | 明确文档阶段、`src/tests` 空、历史资料非真值 | 尚未列 15 项决定及 freeze ID | P1：在 ADR 完成后链接正式决定和冻结状态。 |
| `CALCULATION_BASIS.md` | 52 项骨架、SI、适用域、截图不裁决物理真值 | 第 19 节仍把已决定事项列待批；G-08 未含实际 `(R+jωL)||C`；G-09 无基础 `Zin`；仍保留截图双轨产品叙事 | **P0**：更新决定状态和第 3 节电源合同；截图轨降为历史研究。 |
| `CALCULATION_CONTRACTS.md` | 52/52 输入/输出/警告/验证占位完整 | 所有方法仍未批准；G-08/G-09 不完整；状态后缀不在字典；电源验证未运行 | **P0**：按 topology ID 拆 G-08/G-09；分离 approval/spec/validation 字段。 |
| `FORMULA_SOURCE_REGISTER.md` | 52/52 映射；LLC 页码和 hash 已登记 | G-07/G-08/G-10 的正式教材/标准原页缺；实际并联模型无条目；LLC 基础 `Zin` 未逐式登记 | P1：登记受控推导或一手原页、式号、端口定义和视觉核验人。 |
| `PROJECT_AUDIT.md` | 历史取证、错误和不确定度清楚；未把表格当真值 | 第 13 节仍有旧 20 项待定；第 12 节要求新增截图和 20% 截图留出，违反决定 13 | **P0**：保存历史事实，但把产品方向改为实测/FEM sealed；旧决定标 superseded。 |
| `VALIDATION_CASES.md` | 明确 exposed 不是 holdout；若干数值复算 | 无 PWR 系列案例；EM-Z-003 不可执行；TH-C-002 违反决定 9；“截图校准/留出”仍是产品验证语义；无阈值依据 | **P0**：采用本报告第 3～5 节；TH-C-002 移回 audit-only。 |
| `APPLICATION_ARCHITECTURE.md` | 计算逻辑/UI 分离、显式求解器、FEM 非内置求解器、UI 最后 | 6.3 最终结果包显示截图兼容轨、23.6 新截图 sealed，与决定冲突；状态枚举漂移；无 3D/FEM import schema | **P0/P1**：修订证据架构、冻结流程和未来导入边界。 |
| `docs/decisions/ADR-0001-dual-track-evidence.md` | 正确声明截图不裁决科学真实性 | 状态仍“拟议”；允许截图标定进入产品结果，与最新决定不兼容 | **P0**：修订或由新 ADR 明确 supersede；内部历史研究与产品科学验证分离。 |
| `docs/METHOD_STATUS_DICTIONARY.md` | 有审批/血缘/置信枚举 | 等待批准；与架构、契约、验证状态不一致；黑箱字段是否只限内部未定义 | P1：按第 2 节统一字段并批准。 |
| `data/materials/CANDIDATE_PROPERTY_DATA_REQUIREMENTS.md` | 不填未经核实默认值 | 只有候选要求，无三级材料语义或批准数据 | P0（若 v1 需要实际材料计算）：建立三级 schema/数据包；否则相关方法排除。 |
| `SOURCE_MANIFEST.csv` | 原始资料有 hash | 不承担模型/验证 dataset freeze registry | P1：另建不可变 validation/model registry，不混用来源清单。 |
| `data/validation/`, `validation/*` | 目录已预留 | 当前为空，无可机读 case、协议、结果或签字 | **P0**：在技术冻结前填入已批准 schema、protocol、manifest 和执行报告。 |
| `src/`, `tests/` | 为空，符合“未开始实现” | 无冲突 | 保持空置，直到 Gate 0 决议通过。 |

此前 `PROJECT_AUDIT.md` 写“文档 QA P0=0”只能解释为当时版本没有把截图当物理真值、没有写网站。用户随后批准的 15 项决定使正式文档产生了新的状态/方向不一致；因此本报告中的 P0 是**冻结一致性阻断**，不是推翻此前的物理真值结论。

## 8. 缺失的 ADR、数据字典和验证案例

最低新增正式记录：

1. `ADR-0002-user-decisions-and-product-boundary.md`：15 项决定、final UI 无截图轨、历史研究隔离、旧待定项 superseded；
2. `ADR-0003-power-topologies-and-port-conventions.md`：本报告第 3 节 topology ID、RMS/相量/端口、串联/两类并联/理想变压器/特定 LLC 范围；
3. `ADR-0004-model-freeze-and-sealed-holdout.md`：角色、hash、托管、一次评估、泄漏处理和重新取样；
4. `ADR-0005-minimum-experiment-and-fem-validation.md`：第 5 节矩阵、阈值审批权和 FEM 的证据等级；
5. `ADR-0006-development-gate-3d-and-fem-import.md`：技术冻结后才开发；3D 工程可视化不是 FEM；导入只作版本化参考。

最低数据字典：

- `parameter_geometry_dictionary`（含用户批准的全部几何符号）；
- `electrical_port_and_phasor_dictionary`；
- `power_topology_schema`；
- `method_status_and_validation_status_dictionary`；
- `measurement_case_schema`、`fem_case_schema`；
- `model_freeze_manifest_schema`、`dataset_registry_schema`；
- `3d_geometry_and_fem_import_schema`（坐标系、单位、变换、component ID、CAD/mesh hash、复场相量基准、时间/频率、材料/边界、插值和来源）。

最低新增验证 IDs：本报告 PWR-SER-001/002、PWR-PAR-IDEAL-001、PWR-PAR-RL-001、PWR-XFMR-001、PWR-LLC-ZJL-001、PWR-PORT-NEG-001，以及 EXP-Z-001、EXP-RAC-001、EXP-COOL-001、EXP-THERM-001、FEM-EM-001、FEM-TH-001。

## 9. Gate 0 最小 blocking issue 建议

为了避免把 Gate 0 扩成无限清单，建议只设五个项目级硬阻断；每个阻断内部用 method-level 状态细分：

### G0-B1 决策与范围冻结

- 15 项用户决定进入批准 ADR；
- 所有旧“待批准”列表逐项标 `resolved/superseded/still_open`；
- final UI/产品导出不含截图比较，历史系数只在隔离研究档案中；
- 明确 v1 纳入/排除的 52 方法清单。

### G0-B2 计算合同和数据语义冻结

- 每个 v1 方法的输入、输出、SI、适用域、warnings、来源、验证和 method version 完整；
- 用户批准的几何、材料层级、电源 topology/port/phasor、功率控制体和状态枚举进入唯一数据字典；
- v1 正常结果只允许 `approved` 或 `approved_with_limits`。`not_approved/reference_only` 可以留文档比较，但不得授权实现为普通计算结果。

### G0-B3 验证/冻结基础设施冻结

- 第 4 节 schema、freeze manifest、dataset role、托管/盲测/泄漏处理和预注册阈值获批；
- 历史截图及 783/135 排除出 scientific calibration/holdout；
- `data/validation/` 和 `validation/protocols/` 至少有可机读 schema、批准 protocol 和签字模板。

### G0-B4 高风险方法证据闭合

- 执行全部基础电源解析案例；
- 对 v1 拟启用的 `Req/Leq`、Rac、冷却和热工方法执行最小试验/FEM重叠案例并按预注册阈值判定；
- 未执行或失败的方法从 v1 普通结果中排除，不用 warning 代替阻断；
- 首版实际材料数据包获批，或所有依赖它的方法返回 `insufficient_data` 并排除默认路径。

### G0-B5 技术冻结签字

- 生成唯一 `technical_freeze_id`，记录方法、数据、schema、warnings、solver、验证报告和 hash；
- 计算依据负责人、数据/来源复核人、独立验证人和项目批准人签字；
- 3D 可视化/FEM 导入的边界契约获批，明确不会伪造场结果或反写公式；
- 只有该 freeze ID 生效后，才可另开网站/框架/UI 实施阶段。

## 10. 最终 QA 判定

- **工作簿/截图是否被当物理真值：**没有；正式文档的科学裁决原则是正确的。但截图复现仍被设计为未来产品轨，已与最新决定冲突，必须移出产品契约。
- **多拓扑是否已经可以冻结：**不能。Series 基础式较完整；理想 Parallel 仅是一个特殊网络；实际 `(R_s+jωL)||C` 缺正式合同；理想变压器只覆盖代数；LLC 仍是特定论文/FHA参考。
- **sealed holdout 是否已经存在：**没有。所有历史数据均已暴露；当前没有冻结 manifest、盲测托管或新独立目标。
- **最小试验/FEM计划是否已经可执行：**现有正式文档不足；本报告给出了最低 schema、矩阵和隔离规则，仍需工程审批和实际执行。
- **网站是否已经开始：**没有，且应继续保持 `src/tests` 空置，直到 G0-B1～B5 全部通过。

因此当前总状态应保持：`technical_freeze = blocked`，`website_implementation_authorized = false`。这不是因为研究方向不足，而是因为用户已经把产品边界和验证标准提高到了正确的工程级别；正式文件必须先把这些决定和证据链同步闭合。
