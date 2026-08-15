# Validation Cases — v1

> 版本：1.0 technical baseline，2026-08-14  
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`  
> 范围：解析极限、原始文献例、制造解、单位/量纲、独立测量、FEM/CFD 和密封留出。历史截图、旧工作簿、旧模型输出以及 783 kW / 135 L/min 不属于本验证集。

## 1. 验证原则

本文件每个 `###` 案例标题定义一个中央 `validation_case_id`。每个案例保存：`validation_case_id`、来源/推导、输入 SI、原单位、几何/材料/方法版本、目标、容差及依据、执行状态、原始数据哈希、适用域和复核签字。

方法契约内部的确定性单元、量纲、缩放、极限、域检查或失败语义检查使用独立的 `method_check_id`；它们可以只在 `CALCULATION_CONTRACTS.md` 中定义，不必在本文件重复建立标题。凡在契约中标为 `validation_case_id` 的标识必须逐字解析到本文件一个且仅一个 `###` 标题，其 `validation_status`、容差和阻断原因以本文件为准。本地 method check 的执行结果不得提升同名或相关中央案例的状态。

验证层级分开：

1. `identity_or_dimension`：代数、单位和量纲；
2. `manufactured_solution`：人为构造可精确回算的方程/求解器测试；
3. `published_reference`：一手论文、标准或官方物性验证点；
4. `independent_measurement`：新项目实测；
5. `validated_fem_or_cfd`：材料、边界、网格和能量闭合完整且由实验锚定；
6. `sealed_holdout`：模型冻结后取得且目标对开发者不可见。

纯代数通过只证明实现忠实；制造解通过只证明数值链正确；FEM 网格收敛也不自动证明物理模型真实。

`validation_status` 使用：`not_defined | specified | blocked | running | executed_pass | executed_fail | executed_unjudged | not_required`。阻断原因另存 `validation_block_reason`；没有预注册验收阈值时只能是 `executed_unjudged`，不能事后挑阈值判通过。

验证数据的 `dataset_role` 只可为 `development | calibration | validation | sealed_holdout | external_validation | audit_only`；历史资料只能是 `audit_only`。数值结果来源只可为 `predicted | estimated | identified_from_measurement | project_calibrated | imported_fem_reference | identity_only`，且不得用 provenance 代替 `validation_status`。方法处置、规范完整度、生命周期、运行结果、适用域、科学置信度、数据质量和 warning 严重度的完整机器值逐字服从 `docs/METHOD_STATUS_DICTIONARY.md` 与 `CALCULATION_CONTRACTS.md` 第 0.2 节，不在案例标题或“状态”字符串中另造复合枚举。

## 2. 几何与单位

### GEO-001 — 均匀单层几何语义

输入：`N=5,D_i=0.200 m,d_rad=0.010 m,d_ax=0.010 m,p=0.015 m`。

预期：

- `D_o=0.220 m`；
- `D_m=D_c(default)=0.210 m`；
- `g=0.005 m`；
- `b_cc=0.060 m`；
- `b_env=0.070 m`。

必须同时验证 `thermal.radial_gap` 不会读取 `g`。容差 `TOL-ID`。状态：`specified`。

### GEO-002 — 单匝与路径长度

`N=1` 时要求 `b_cc=0,b_env=d_ax`。导体长度只有在给定 `N_rev` 和 `delta_z_helix` 后才计算；若只有 `N`，返回 `insufficient_data`，不得猜路径端点。状态：`specified`。

### UNIT-001 — 文献原单位往返

分别对 mm、cm、inch、µH、Ω·cm、µΩ·cm 和 L/min 做 `原值 -> SI -> 原单位` 往返；不能把“历史表中疑似 mm”作为单位裁决。对精确换算要求 `TOL-ID`。状态：`specified`。

## 3. 电感

### EM-L-001 — 长螺线管极限

固定 `D_c,N`，扫描 `b_env/D_c=2,5,10,20,50`。要求 Lundin/Nagaoka 电流片 `L/L_inf` 随长径比趋近 1；容差按 Lundin/Nagaoka 原文数值精度而不是 UI 小数位。状态：`specified`。

### EM-L-002 — Wheeler 原单位包装

用 Wheeler 1928 原文单层式的 inch/µH 输入计算，再由 SI wrapper 计算相同几何；两个实现只允许单位换算差。检查半径/直径错误和 `b<=0.8a` 适用域警告。状态：`specified`。

### EM-L-003 — Lundin 表与分支点

复算 Lundin 1985 表 1 及 `2a=b` 两侧，目标精度不优于原文末位；两个数值分支在切换处连续到注册表声明的近似误差。状态：`executed_pass`；`source_review_status=pending_release_cross_check`，发布实现前再做原页双人复核。

### EM-L-004 — Rosa/Grover 离散圆环

完成 Example 57 的 CGS 到 SI 全链、逐匝自感/互感和原文舍入复核。目标容差 `TOL-PUB`。状态：`blocked`，直至完整原单位推导签字。

### EM-L-005 — 单匝/少匝限制

单匝不得调用 `b=0` 的电流片公式。离散圆环在截面模型适用时必须给有限正值；空心粗管或邻近显著时返回限定警告或建议实测/FEM。状态：`specified`。

### EM-L-006 — 方法比较矩阵

至少覆盖长、中、短、单匝和少匝大节距几何。所有方法消费同一个 `D_c,b_env,z_i` 映射和材料快照；失败方法保留状态，不能从比较图中删除。状态：`specified`。

## 4. 线圈电气、皮深与 AC 电阻

### ELEC-SKIN-001 — 皮深缩放

对正输入验证 `delta=sqrt[rho/(pi f mu)]`：频率乘 4 时皮深减半，电阻率乘 4 时皮深加倍，`mu_r` 乘 100 时皮深为原 1/10。该案例不固定任何材料默认值。状态：`specified`。

### ELEC-RDC-001 — 导体长度、截面和温度

制造分段导体，逐段 `sum rho(T_i) l_i/A_i` 与单段等温极限对照；金属面积与水力面积互换必须触发维度/语义失败。状态：`specified`。

### ELEC-RAC-HF-001 — 强集肤表面电阻估算

制造输入：`rho=1.8e-8 Ω·m,f=10 kHz,mu_r=1,r_o=0.010 m,wall=0.003 m,l=5 m`。按受限方法：

`delta=0.675237237 mm`

`Rac_skin≈rho l/(2 pi r_o delta)=2.121320343 mΩ`

该值仅验证公式实现；案例必须同时输出“未计 proximity/helix/leads/joints/workpiece”并标 `engineering_approximation`。如果方法前置条件未满足，状态必须 `not_applicable`。状态：`specified`。

### EXP-RAC-001 — 新线圈 AC 电阻验证

四线 `Rdc` 覆盖至少三个铜温；空载和实际安装状态在设计频率上下各一档、至少三个电流等级，每点重复至少三次，并记录母排/接头/夹具去嵌入及量热交叉检查。预注册偏差阈值后方可判定估算方法。状态：`specified`。

## 5. 线圈—工件等效负载

### EM-Z-001 — 被动双绕组合成例

输入：`Lp=20 µH,Ls=1 µH,R2=0.01 Ω,k=0.5,f=10 kHz`，`M=k sqrt(Lp Ls)=2.236067978 µH`。

`Zref=omega^2 M^2/(R2+j omega Ls)`。

预期：`Zref=0.04876477385-j0.3063981106 Ω`，故不含线圈铜阻时 `Req=0.04876477385 Ω`、`Leq=15.12352262 µH`。检查 `Rref>=0`、`|k|<=1` 及功率被动性。容差 `rtol<=1e-10`。状态：`specified`。

### EM-Z-002 — 端口辨识信息充分性

给同频 `V,I,P` 但不给相位/无功时，只能得到 `Req=P/I²`，`Leq` 必须为 `insufficient_data`。加入相位或完整复阻抗后才能得到 `X` 和感性 `Leq=X/omega`。状态：`specified`。

### EXP-Z-001 — 新端口阻抗数据

覆盖空线圈、冷工件和至少三个运行温度平台；设计频率及上下各一档；名义间隙及上下扰动；每点独立重复至少三次。记录 `V,I,P,Q,phase,Z_re,Z_im`、基波/全波、去嵌入、几何、材料和温度。状态：`specified`。

### FEM-EM-001 — 独立电磁对照

规则轴对称结构先用 2D，螺旋引线/偏心/非轴对称再用 3D。至少三档网格，检查 `Req,Leq,Pcu,Pworkpiece` 和能量闭合，并与 EXP-Z/RAC 重叠工况比较。状态：`specified`。

## 6. 电源与谐振

以下只验证明确 topology 的相量代数；不代表开关电源、器件应力或控制稳定性已验证。

### PWR-SER-001

`R=0.05 Ω,L=10 µH,f=10 kHz,C=25.33029591 µF`。预期 `Im(Z)=0,Re(Z)=0.05 Ω,Q_s=12.56637061`，`V_L` 与 `V_C` 相消。`rtol<=1e-12`，零量 `atol<=1e-12 Ω`。状态：`specified`。

### PWR-SER-002

同一网络在 `0.8f0` 和 `1.2f0`，虚部分别为容性和感性；复数直接式与展开式一致。状态：`specified`。

### PWR-PAR-IDEAL-001

`R_p=5 Ω,L=10 µH,C=25.33029591 µF,f=10 kHz`。预期 `Im(Y)=0,Z=5 Ω`。状态：`specified`。

### PWR-PAR-RL-001

`R_s=0.05 Ω,L=10 µH,f=10 kHz,C=25.17089933 µF`。预期 `Im(Y)=0,Z=7.945683521 Ω`；不得误报为理想并联 5 Ω 或串联 0.05 Ω。状态：`specified`。

### PWR-XFMR-001

`n=2,Z_s=0.1+j0.2 Ω`。预期 `Z_p=0.4+j0.8 Ω`，任意兼容 RMS 端口满足理想复功率守恒。状态：`specified`。

### PWR-LLC-ZJL-001

`L_s=300 µH,L_Req=100 µH,C=0.4 µF,R_eq=1.5 Ω`。按图 2.6 topology：`f1=25.164606 kHz,f0=29.057584 kHz`；在 `f0`，`Z_in≈12.18412+j4.00411 Ω`、相角约 `18.19226°`。仅作 `reference_only` 转录/代数测试，完成原页双人核对前不能启用 LLC。状态：`specified`。

### PWR-PORT-NEG-001

拓扑、端口方向、RMS/peak 或加载状态缺失时，必须 `insufficient_data`，不输出补偿 C、变比或器件应力。状态：`specified`。

## 7. 冷却水

### COOL-ENERGY-001 — 新制造热平衡

制造输入：`Qcool=50 kW,cp=4180 J/(kg·K),rho=997 kg/m³,Tout-Tin=10 K`。

预期 `mdot=1.196172249 kg/s,Vdot=1.199771563e-3 m³/s=71.98629381 L/min`。仅验证控制体能量式和单位转换，不代表项目设计流量。状态：`specified`。

### COOL-DP-LAM-001 — 层流 Darcy 基线

`Re=1000,mu=0.001 Pa·s,rho=997 kg/m³,D=0.01 m,L=5 m`，无局部/高度项。预期 `v=0.1003009027 m/s,f_D=0.064,delta_p=160.4814443 Pa`。状态：`specified`。

### COOL-HT-001 — 水侧相关式域检查

层流充分发展直圆管应分别返回 CWT `Nu=3.656`、CWF `Nu=4.364`。Gnielinski 回归点取 `Re=100000,Pr=7`，预期 `f_G=0.0179920,Nu=599.066`；若 `k=0.6 W/(m*K),D=0.01 m`，`h=35944 W/(m2*K)`。`2300<=Re<10000` 不得插值；弯管、入口、非圆水道、局部热点和两相信息应返回 warning/`not_applicable`。状态：`specified`。

### COOL-DP-TURB-001 — Colebrook 直铜管回归

取 `D=0.02011 m,epsilon=1.5e-6 m,Re=100000`，Colebrook 正根应为 `f_D=0.0183840`。另以 NIST TN 2294 Figure 18 数据做发布前独立曲线核对；数值根回归状态 `specified`，图中实测点数字化状态 `blocked`，原因 `source_data_digitization_pending`。

### COOL-WALL-001 — 壁温与饱和裕量

制造均匀热流案例检查：`q''=Qheated/(pi d_i Lheated)`、`Twall,i≈Tbulk,local+q''/h_i` 及铜壁圆筒导热。若 `Twall,i>=Tsat(p_local)`，单相模型必须阻断；正的饱和温差不得自动显示“无沸腾”。状态：`specified`。

### EXP-COOL-001 — 新线圈冷却试验

最小/名义/最大流量与低/名义/高三档可控热负荷，逐支路测质量流、进出口温度和压力、壁温、控制体功率、水质与时间序列；用水侧能量平衡和压降验证模型。历史 783/135 数据禁止使用。状态：`specified`。

## 8. 热损、保温与空气隙

### TH-CYL-001 — 单层圆筒制造解

指定 `ri,ro,L,k,Ti,To`，用 `Q=2pi Lk(Ti-To)/ln(ro/ri)` 生成目标；反算任一输入应在 `TOL-ID/TOL-NUM` 内闭合。状态：`specified`。

### TH-CYL-002 — 多层相邻半径

至少两层，验证 `sum ln(r_i/r_{i-1})/(2pi k_i L)`；故意使用 `ln(r_i/r_0)` 的实现必须失败。状态：`specified`。

### TH-RAD-001 — 辐射极限

`T1=T2` 时热流为 0；黑体、等面积及同心圆筒面积比极限与辐射网络一致；绝对温度用 K。状态：`specified`。

### TH-CONV-001 — 外表面对流方法回归

使用直接无量纲输入检查公式实现：`Ra=1e6,Pr=0.7` 时，Churchill–Chu 竖直板 `Nu_L=16.5303668764`，水平圆柱 `Nu_D=14.5101908474`；`Re=1e4,Pr=0.7` 时 Churchill–Bernstein 横掠圆柱 `Nu_D=53.3277886702`。容差 `rtol<=1e-10`，同时检查特征长度、姿态和域外失败。状态：`specified`。

### TH-INS-001 — 目标表温制造解

预先选定 `ri,ro,L,Ti,Ts,Ta,Tsur,k,epsilon,h_method`，由完整圆筒导热和表面对流+辐射共同生成闭合目标；求解器应恢复 `ro`。不从旧工作簿厚度取目标。状态：`specified`。

### TH-INS-002 — 目标热损制造解

从同一完整能量平衡制造 `Qlimit`，检查全部物理解、最小可行厚度、向上圆整后复核和无根/多根状态。GB/T 式(20)印文不得进入实现。状态：`specified`。

### TH-INS-003 — 双目标可行域与非单调门禁

构造包含临界绝热半径效应的厚度域，使 `Q(delta)` 非单调；分别生成 `F_T`、`F_Q` 和材料/制造 `F_M`。求解必须返回其全部可行区间和 `min(F_T intersect F_Q intersect F_M)`，不得无条件返回 `max(delta_T,delta_Q)`。交集为空时返回 `no_feasible_solution`，迭代失败才返回 `non_converged`。状态：`specified`。

### TH-GAP-HC-001 — 水平封闭环隙

制造回归点取 `Pr=0.7,F_cyl*Ra_s=1e4`，预期 `k_eff/k=3.15871969948`；小于 100 时必须回到 `k_eff/k=1`。另检查半径比与所有项目域门禁。公式回归状态 `specified`；原文/独立实验点的发布级交叉验证状态 `blocked`，原因 `independent_source_point_pending`。

### TH-GAP-VC-001 — 竖直封闭环隙

制造回归点取 `Ra_s=1e4,Pr=1,K=2,H=10`，按 `Ra_s/H=1000` 进入过渡区，预期 `Nu_s=2.30508559968`。`1<H<5` 不得自行插值分区；所有原数据域逐项测试。公式回归状态 `specified`；原文数值点发布级交叉验证状态 `blocked`，原因 `independent_source_point_pending`。

### TH-GAP-NEG-001 — 边界信息不足

未给姿态、端部开闭、连续外壁/离散螺旋或真实 `s_ann` 时返回 `insufficient_data`。上下开口、明显偏心或三维支撑不得调用封闭同心相关式。状态：`specified`。

### EXP-THERM-001 — 热工与保温独立试验

新试验覆盖无保温基线及至少两种厚度，记录内外表面多点温度、热流/输入功率、环境、空气速度、线圈温度、真实空气隙、方向、端部和时间序列。状态：`specified`。

### FEM-TH-001 — 热工 FEM/CFD 外部验证参考

复杂开放环隙使用经实验锚定的 FEM/CFD；记录材料、边界、坐标/单位、求解器设置，至少三档网格并检查热量闭合。FEM/CFD 结果仅作外部验证参考，不替代 EXP-THERM-001。状态：`specified`。

## 9. 材料与 Material Comparison

### MAT-001 — 插值、分段和禁止外推

用合成表验证节点精确回返、区间线性、单位往返、Curie/相变分段和域外 `insufficient_data`。合成值不得发布为材料默认。状态：`specified`。

### MAT-002 — 数据质量传播

同一方法分别使用 `generic_typical` 与 `project_specific` 快照；数值可相同，但结果数据质量和 UI 标签必须不同。状态：`specified`。

### MAT-COMP-001 — 只替换材料

锁定几何、频率、目标温度、方法和 solver，运行两个完整材料快照。比较服务必须证明除 material snapshot 外输入哈希相同；缺关键属性的候选返回 `insufficient_data`。状态：`specified`。

## 10. 密封留出与数据隔离

1. 在获取 target 前冻结 `technical_freeze_id`、方法/特征/参数、输入 schema、材料/常数、warning、solver、指标、阈值和 artifact hash。
2. 开发者不可见 sealed target；独立 evaluator 只运行一次。任何调式后旧 holdout 对新版本立即 exposed。
3. 科学 holdout 使用新实测或由实测锚定且未参与拟合的 FEM/CFD。
4. 冻结后若做隔离的成熟软件外部比较，登记为 `dataset_role=sealed_holdout`、`evidence_use=external_comparison_audit_only`、`visibility=audit_only`；不用于调参、不提升科学置信、不进入产品 runtime、测试或 UI。`external_validation` 仅用于独立第三方实测或经批准的外部 FEM/CFD 数据。
5. 旧聊天、工作簿、截图、历史 Excel 派生列和 783/135 永久排除。

详细 schema 见 `docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md`，最小协议见 `validation/protocols/MINIMUM_VALIDATION_PLAN.md`。
