# Formula Source Register — 逐公式来源注册表

> 对应规范：`CALCULATION_BASIS.md` v1.0（2026-08-14）  
> 状态：**v1 Gate 0 受控公式来源注册表**；52/52 方法均有来源与处置状态  
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`  
> 注意：列入本表不等于批准。只有 `CALCULATION_BASIS.md`/`CALCULATION_CONTRACTS.md` 处置为 `approved` 或 `approved_with_limitation`，且本表给出可核来源/推导的方法才可实现。历史资料只允许作为表内明确标注的 `audit_only` 冲突备注或第 8 节拒用式追踪，不进入第 9 节实施 `source_refs`、运行时、默认、校准或验证。

## 1. 字段、状态与定位规则

- `source_basis` 是下列表格中的**人工审计摘要**，可用自然语言组合多个来源角色；它不是机器枚举，也不得由实现代码解析。单条规范化来源记录的 `source_type` 才使用：`primary_paper`、`standard`、`official_property_model`、`independent_derivation`、`definition/project_contract`、`measurement_method`、`empirical_calibrated`、`audit_only`。
- `location` 中 `PDF n` 是电子 PDF 页；`print n` 是印刷页；无原页时明确写 `page unavailable`，绝不反推页码。
- `visual`：`V` = 已看原页渲染；`T` = 仅文本/结构检查；`N/A` = 独立推导、定义或算法契约；`R0` = 仅审计材料。
- `scientific_status` 同样是**人工审计摘要**，允许用 `A/C`、`C/VFY` 或附注表达同一计算族内不同子方法的判断，绝不作为机器字段读取。审计缩写到冻结字典 `scientific_confidence` 的归一映射为：`A -> high`；`C -> engineering_approximation`；`R -> needs_verification` 且仅作 reference/audit，不进入运行时；`VFY -> needs_verification`；`X -> rejected`。若需 `fem_or_experiment_recommended`，应对具体可执行子方法单独赋值，不能由 `R` 自动推断。组合摘要必须先拆到逐子方法记录，再各取一个机器值。
- 机器实现只读取第 9 节 `source_refs`、`docs/METHOD_STATUS_DICTIONARY.md` 的冻结机器值及其受控来源记录；不得从本表的 `source_basis`、`scientific_status` 或中文附注反推枚举、批准状态或运行逻辑。
- 独立推导编号的完整冻结清单：`ID-DATA-01`；`ID-GEO-01/02/03`；`ID-EM-01`；`ID-OHM-01/02`；`ID-AC-01/02`；`ID-Z-01/02`；`ID-MEAS-01`；`ID-RLC-01/02`；`ID-TH-01`；`ID-HYD-01/02`；`ID-HT-01/02`；`ID-RAD-01`；`ID-ANN-01`；`ID-NUM-01`；`ID-QA-01`。正文与同名锚点均登记于 `docs/derivations/V1_CONTROLLED_DERIVATIONS.md`；实现必须按同名锚点解析，不得回退到历史资料。

## 2. 文件级来源哈希

| source_id | 相对路径 | SHA256 |
|---|---|---|
| W28 | `references/external_sources/wheeler1928.pdf` | `1a17fef7ab82d4bcd33f030451cf9b63b8c173ee88741a1ace8a12c1239c90f1` |
| N09 | `references/external_sources/导出页面自 journalofcollege27toky.pdf` | `542a6d5614ce866da7984cda9170397ad108fe46c1f8acb0592895f30c1f0a45` |
| L85 | `references/external_sources/lundin_Proc_IEEE_1985.pdf` | `353de18db55db4ea63e42790d9af8937ebac510b69ffa62674914af450cfe028` |
| RG12 | `references/external_sources/nbsbulletinv8n1p1_A2b.pdf` | `73ec4b101d78494bb4d6d10312bc04df5313e678a27b008bd27e6bdadf85ff82` |
| S89 | `references/external_sources/The mathematical model of induction heating of ferromagnetic pipes - Magnetics, IEEE Transactions on.pdf` | `0be84ab4a77b47af733c3952069f779a35a8eb9d3c3a949d99bd5753757c87f6` |
| M04 | `references/project_uploads/电源频率和功率在透热感应加热中的选择_马建平.pdf` | `441b880074454c5a06da76c1ea8f599ea923e55c668a48d636cb5ef6264dfdcb` |
| L13 | `references/external_sources/low-frequency-modelling-of-induction-heaters-using-series-45fwnep0l3.pdf` | `638861b11bfd0d26be937e77ad2631a5c6816c93c80619369c26932a7c8ca85d` |
| J08 | `references/project_uploads/高频感应加热过程的负载电气特性分析_焦俊生.pdf` | `43a033d1bce2178910098ee16eca8cf9768e2862eb9a37ac41917e4ca3fd7226` |
| DHT | `references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf` | `33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98` |
| GB8175 | `references/external_sources/GBT+8175-2025.pdf` | `d49b00ea888f4d73365d28ac3325ad6c2782d1796a760e1fde697135c67737ae` |
| LLC-ZJL | `references/project_uploads/LLC谐振负载感应加热电源的研究与设计_张金龙.pdf` | `8e9e949962ae830858a712baa693f6d54d7692a683ff645321d6c52a4f0babaa` |
| JM95 | `references/project_uploads/感应加热技术中的趋肤效应_金晓昌.pdf` | `c654226fc9897385197996a8a07e292b83521db02578534a9eb9c7269e32d5e9` |
| WU | `references/project_uploads/大功率电磁炉趋肤及邻近效应分析_吴胜.pdf` | `5c73d076cbda835b2f2e8ba6b9f38ff9c20b83beda95a103ec1171ae57cc5819` |
| CTP | `references/project_uploads/钢管连续热处理中感应加热技术应用的数值模拟研究_陈天翔.pdf` | `5c4316fb5cd8ae9e95556c525ac4235b243bf8bb4d279f1b6c0496b7f24afa95` |
| WB-FINAL | `references/workbooks/感应线圈匹配_单方案反推计算器_最终版.xlsx` | `eeae12cfff254d826f604a376f46a902e65f8f773396b733cfb68a6f5dbcf13e` |
| SCREEN-1 | `references/project_uploads/方案一计算.png` | `f4e9213e13870244c703e9f15d16bfbb85f349a2e5e997006a9f5f0ad018e0ab` |
| SCREEN-2 | `references/project_uploads/方案二计算.png` | `d972a19af1733d6aaafcf31e2aaf23d079a22c7153fc8cdaf734215d72fce444` |
| REPORT-2026-03 | `references/project_uploads/电磁感应加热裂解炉工作汇报2026.3.pptx` | `d18b5fdc135dd5128980c110e6ca5d0314f50e7c47badd0cc4d3dc564d9e841c` |
IAPWS 官方 releases 与 CODATA 本轮只有官方在线依据，尚无本地固化文件和 SHA256；对应条目不能宣称完成文件级追溯。`working/` 中的临时 PDF 不属于受控来源，不在本注册表中承担公式依据。

### 2.1 已核原始/官方在线来源（待后续固化本地副本）

| source_id | 来源与定位 | 用途 | 核查状态 |
|---|---|---|---|
| IAPWS-95 | IAPWS R6-95(2018), <https://iapws.org/relguide/IAPWS95-2018.pdf> | 水的通用热力学性质 | official, version pin required in implementation |
| IAPWS-IF97 | IAPWS R7-97(2012), <https://iapws.org/relguide/IF97-Rev.pdf> | 工业热力学性质、Region 4 饱和线 | official, version pin required in implementation |
| IAPWS-R12-08 | IAPWS 2008 ordinary-water viscosity release, <https://iapws.org/documents/release/viscosity> | 动力黏度 | official transport-property formulation |
| IAPWS-R15-11 | IAPWS 2011 ordinary-water thermal-conductivity release, <https://www.iapws.org/relguide/ThCond.pdf> | 导热系数 | official transport-property formulation |
| IAPWS-SR6-08 | IAPWS SR6-08(2011), <https://www.iapws.org/relguide/LiquidWater.pdf> | 0.1 MPa 附近的简化热力学/输运性质 | official supplementary release; strict domain only |
| CODATA22 | NIST 2022 CODATA recommended values, Web Version 9.0, <https://physics.nist.gov/cuu/Constants/index.html>；正式论文 PDF <https://physics.nist.gov/cuu/pdf/JPCRD2022CODATA.pdf> | `mu0`、Stefan–Boltzmann 常数及共享物理常数 | official, 2022 adjustment; local copy/version pin required |
| GN75 | Gnielinski, 1975, pp. 8–16, DOI <https://doi.org/10.1007/BF02559682>；INL/MOOSE implementation lines 63–77 | 直光滑圆管湍流 Nu | primary + official implementation cross-check |
| NASA-NTRS-19830022277 | NASA-CR-172827 / NTRS Document ID 19830022277, §6.1.2.1, <https://ntrs.nasa.gov/citations/19830022277> | 充分发展直圆管层流恒壁温 Nu 的原页交叉核对 | official NTRS record; local copy/version pin required |
| OSTI-836896 | OSTI record 836896, §3.1.1, <https://www.osti.gov/biblio/836896> | 充分发展直圆管层流恒热流 Nu 的原页交叉核对 | official OSTI record; local copy/version pin required |
| C39 | Colebrook, 1939, pp. 133–156, DOI <https://doi.org/10.1680/ijoti.1939.13150> | 直圆管湍流摩阻 | primary |
| NIST-TN2294 | NIST TN 2294, report p. 23 / PDF p. 29, DOI <https://doi.org/10.6028/NIST.TN.2294> | 直铜管 Colebrook 独立交叉核对 | official experiment |
| CC75-V | Churchill & Chu, 1975, pp. 1323–1329, DOI <https://doi.org/10.1016/0017-9310(75)90243-4> | 竖直平面自然对流 | primary |
| CC75-H | Churchill & Chu, 1975, pp. 1049–1053, DOI <https://doi.org/10.1016/0017-9310(75)90222-7> | 水平圆柱自然对流 | primary |
| CB77 | Churchill & Bernstein, 1977, pp. 300–306, DOI <https://doi.org/10.1115/1.3450685> | 圆柱横掠强制对流 | primary |
| RH75 | Raithby & Hollands, 1975, pp. 265–315, DOI <https://doi.org/10.1016/S0065-2717(08)70076-5> | 水平封闭同心圆筒环隙 | primary |
| DT69 | de Vahl Davis & Thomas, 1969, pp. II-198–II-207, DOI <https://doi.org/10.1063/1.1692437> | 竖直封闭同心环隙 | primary |
| HI-961 | Hydraulic Institute ANSI/HI 9.6.1, current official landing page <https://www.pumps.org/product/ansi-hi-9-6-1-rotodynamic-pumps-guideline-for-npsh-margin/> | NPSH 厂家门禁框架 | official; edition pin and OEM numeric margin still required |

在线来源可支撑方法审查，但实现依赖管理必须固定版本、访问日期和回归点；没有本地哈希不等于允许公式漂移。

## 3. A-C：物性、几何、电感与比较

| equation_id | 方程/方法 | source_basis（人工审计摘要） | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status（人工审计摘要） |
|---|---|---|---|---|---|---|---|
| A-01 | 温变表格插值 | definition/project_contract | `ID-DATA-01`; no external page | 无统一原式 | `y=y_i+(y_{i+1}-y_i)(T-T_i)/(T_{i+1}-T_i)` | N/A | A（仅限原数据包络；材料数据本身逐条另审） |
| A-02 | 水物性查询 | official_property_model | IAPWS-95 或 IF97（热力学）；IAPWS-R12-08（`mu`）；IAPWS-R15-11（`k`）；SR6-08 仅作 0.1 MPa 附近限域简化 | 各 release 原式，未在本文转录 | `rho,cp,h,Tsat=thermodynamic_model(T,p)`；`mu=viscosity_model(T,rho)`；`k=conductivity_model(T,rho)` | N/A | C/VFY（方法来源已分离；本地版本、实现与官方节点回归未固化） |
| B-01 | 几何规范化 | definition/project_contract | `ID-GEO-01`; WB-FINAL cells `B8:B14,J9` 仅作冲突证据 | 工作簿混用 mm/cm；无可靠原式 | `Dmean=Dinner+d_rad=(Dinner+Douter)/2`; `b_cc=(N-1)p`; `b_env=b_cc+d_ax` | R0/N/A | A（定义获批后）；工作簿原链 X |
| B-02 | 轴向填充率 | independent_derivation | `ID-GEO-01`；历史工作簿/截图仅在审计档案解释字段谱系，不是实现来源 | 无 | `k_fill,axial=N d_ax/b_env` | N/A | A（获批几何定义）；不是耦合系数 |
| B-03 | 理想长螺线管 | primary_paper + analytical limit | N09 PDF 20-21 (print 19-20, eqs.15-18) 支持电流片极限；RG12 PDF 116-135；原页已核查 | N09/RG12 为 electromagnetic CGS | `L_inf=μ0N²πa²/b` [H] | V | A（只作长线圈极限） |
| B-04 | Nagaoka/Lundin 有限长电流片 | primary_paper | L85 PDF 3-4 (print 1428-1429, eqs.9-12, table 1); N09 PDF 20-21 (print 19-20, eqs.15-18), PDF 32-34 tables | N09 为 CGS；L85 已给 SI/H 形式 | 规范中两分支 Lundin eqs.9-12 | V | A（圆柱电流片；六位数不等于实物精度） |
| B-05 | Wheeler 1928 单层式 | primary_paper | W28 PDF 2 (print 1399, eq.2), PDF 3 (print 1400, eq.3) | `L[µH]=a_in²N²/(9a_in+10b_in)` | 仅在 UI 边界 m→inch，输出 µH→H | V | C（工程近似；eq.2 的 1% 声明只在 `b>0.8a`） |
| B-06 | Wheeler 1928 多层式 | primary_paper | W28 PDF 1（print 1398），Fig. 1，eq. (1)；本地原页已视觉核验 | `L[µH]=0.8 a_in² n²/(6a_in+9b_in+10c_in)`；`a` 为均匀绕组平均半径、`b` 为轴向长度、`c` 为径向绕组厚度，三者均用 inch，`n` 为总匝数 | UI 边界将 `a,b,c` 由 m 转 inch、`n` 保持无量纲，原式输出 µH 后转 H；不得把单层导体径向尺寸当作 `c` | V | C（已完成本地一手核验；仅真正均匀多层绕组的工程近似；W28 的 about 1% 声明只适用于近似 Fig. 1 形状且分母三项约相等） |
| B-07 | 离散同轴圆环求和 | primary_paper | RG12 PDF 6 eq.1（互感）；PDF 123 eq.81（等匝距求和）；PDF 126-128 Example 57；均为已核查页 | 原文 CGS，外因子 `4π`；导线修正也为 CGS | `L=ΣLi+2ΣMij`; `M=μ0√(aiaj){[(2/k)-k]K-(2/k)E}` [H] | V | A/C（丝状互感 A；有限截面单匝近似只对细圆实心线 C） |
| B-08 | Simpson 求椭圆积分 | numerical algorithm | `ID-NUM-01`; 项目 `长冈系数与Wheeler公式计算表.xlsx` 仅作实现线索，原数学教材页未固化 | 通用求积公式 | 偶数分段、`n,2n,4n` 收敛并与 AGM/Carlson/库交叉检查 | N/A | C（数值复核器；不是物理模型） |
| C-01 | 电感方法比较与警告 | definition/project_contract | `ID-QA-01`; `VALIDATION_CASES.md`; 无外部页 | 无 | `spread=(Lmax-Lmin)/Lreference`；各方法残差分列 | N/A | A（按各方法冻结适用域逐项比较；无来源不设通用 `N`、`p/d` 或偏差百分比硬阈值） |

## 4. D-F：线圈电气、工件电磁与等效负载

| equation_id | 方程/方法 | source_basis（人工审计摘要） | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status（人工审计摘要） |
|---|---|---|---|---|---|---|---|
| D-01 | 螺旋导体长度 | independent_derivation | `ID-GEO-02` | 无 | `ell_helix=sqrt[(πD_m N_rev)^2+delta_z_helix^2]`; 再显式加引线/母排 [m] | N/A | A（使用机械/CAD 中心路径，不使用 `D_c`；端点约定必须明确） |
| D-02 | 导体金属截面积 | independent_geometry | `ID-GEO-03`; no external page | 无 | 实心圆、圆管、实心矩形、矩形管标准面积差 [m²] | N/A | A |
| D-03 | DC 电阻 | independent_derivation/classical law | `ID-OHM-01`; material source separately required | 常见 `R=ρl/A`，单位随来源 | `Rdc(T)=ρe(T)ell/Ametal` [Ω] | N/A | A |
| D-04 | 铜趋肤深度 | independent_derivation + theory reference | `ID-EM-01`; JM95 PDF 1-4 仅理论旁证 | 文献单位需边界转 SI | `delta=sqrt[rho/(pi f mu0 mur)]` [m] | N/A | A（线性半无限良导体；不等于热影响深度） |
| D-05 | AC 电阻分级 | independent surface-impedance limit + measurement method | `ID-EM-01`; RG12 PDF 172-187 为后续全频候选；DHT PDF 8,17-18 支持邻近/实测升级 | RG12 为旧式单位 | `Aeff=2pi ro delta`; `Rac_surface=rho l/Aeff`，限 `ro/delta>=10`；空心外表面还需 `t/delta>=3` | V/N/A | C（强集肤均匀表面 screening；实测优先；通用邻近 Deferred） |
| D-06 | 电流密度与铜损 | independent_derivation | `ID-OHM-02` | 无 | `J=Irms/A`; `Pcu=Irms^2 Rac_used` | N/A | A（RMS、截面、参考面和 Rac 来源明确时） |
| D-07 | 串联端口参数 | independent circuit algebra | `ID-AC-01`; WB-FINAL/SCREEN 仅作一致性证据 | 工作簿 kHz/µH/kV/kA | `X=ωL`; `Z=R+jX`; `Q=ωL/R`; `U=I|Z|` | R0/N/A | A（同频同端口）；`U≈IωL` 仅 C |
| E-01 | 工件参考透入深度 | independent derivation + theory reference | `ID-EM-01`; JM95 PDF 1-4；M04 PDF 2 eq.1 为工程单位旁证；LIAO 的正指数/50300 式已拒绝 | M04: `δ[cm]=(1/2π)sqrt(ρ[Ω·cm]10^9/(μr f))`，正文误把 μr 标 H/m | `δ=sqrt[ρ/(πfμ0μr)]`; `J=Js exp[-(1+j)y/δ]` | V（M04/JM95关键页审计） | A（线性半无限）；薄壁/Curie/异形只作参考 |
| E-02 | Curie/温度扫描 | primary model-scope evidence + project method | S89 PDF 1-5 (print 2745-2749); 姜滔/P92/CTP 仅材料个案 | 各文献的特定拟合，禁止转录成通用式 | 在批准节点查询 `ρ(T),μr(T,H,f)` 后逐点求 δ；过渡区加密 | V/T | C（方法 A；具体数据逐材料 VFY） |
| E-03 | 参考临界频率 | secondary empirical criterion + independent derivation | M04 PDF 2-3 (print 72-73, eqs.1-5); `ID-EM-01` | M04 取 `D/(2δ)=2`；`4e8ρ/(μrD²)` 的电阻率单位标注不一致 | `f=16ρ/(πμ0μrD²)` [Hz]; 工程式 `4.05285e8ρ[Ωcm]/(μrD[cm]²)` | V | C（实体圆柱经验参考；非最佳频率） |
| F-01 | 理想变压器反射阻抗 | independent derivation + reference-only model evidence | `ID-Z-01`; J08 PDF 2-3 图4-6 与 L13 PDF 1-6 仅支持等效模型边界；WB-FINAL 多个反射式为错误对照 | 文献符号/等效拓扑各异 | `Zin=R1+jωL1+ω²M²/(R2+jωL2)` 及 `Rref,Leq`; `k=M/sqrt(L1L2)` | V/N/A | A（给定线性集中参数）；不能据几何自动得到参数 |
| F-02 | 端口阻抗测量辨识 | measurement_method + independent algebra | `ID-MEAS-01`; DHT PDF 17-18 支持在工作频率、装工件状态实测 | 仪器可报告 V/I/P/PF/相位 | `|Z|=V/I`; `R=P/I²`; `X=sign(Q)sqrt(|Z|²-R²)`; `L=X/ω` | V | A（测量定义/去嵌入/不确定度齐全） |
| F-03 | 项目专用经验负载模型 | empirical_calibrated | ADR-0002/0004/0008；当前没有合格的新校准/验证数据 | 无 | 不预设公式；未来须量纲/被动约束、冻结校准域和独立验证 | N/A | Deferred；历史数据产品禁用 |

## 5. G：加热与系统电气

| equation_id | 方程/方法 | source_basis（人工审计摘要） | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status（人工审计摘要） |
|---|---|---|---|---|---|---|---|
| G-01 | 批次有用热量 | independent thermodynamic balance | `ID-TH-01`; project material papers only support temperature dependence | 文献/表格单位不统一 | `E=m∫cp(T)dT+mΣΔh+Ereaction` [J] | N/A | A（控制体和焓数据明确） |
| G-02 | 连续有用功率 | independent thermodynamic balance | `ID-TH-01`; no external page | 无 | `P=mdot[∫cpdT+ΣΔh+Δhreaction]` [W] | N/A | A |
| G-03 | 加热时间/瞬态温度 | independent first-law ODE | `ID-TH-01`; specific FEM papers are validation-only | 无 | `mcp(T)dT/dt=Pabs-Qloss-Pphase/reaction` | N/A | A/C（集总模型须检查适用性） |
| G-04 | 功率边界与效率 | definition/project_contract | `ID-TH-01`; REPORT-2026-03 只作控制体冲突证据 | 历史文件混用总损失/效率 | 各效率按明确分子分母定义 | N/A | A（定义）；历史总效率仅 `audit_only`，禁止作为输入、默认、校准或验证 |
| G-05 | 所需输入功率 | independent control-volume balance | `ID-TH-01` | 无 | `Pwp=Puseful+Qloss`; `Pcoil=Pwp+Pcu+Pstray`; `Pgrid=Pcoil/Πη` | N/A | A（不得重复计效率/损失） |
| G-06 | 视在功率/PF | standard AC definitions, local primary page unavailable | `ID-AC-02`; page unavailable | 单/三相常见式 | `S=VI`; balanced 3φ `S=sqrt(3)ULLIL`; `PF=P/S` | N/A | A（定义）；规范来源需正式固化 |
| G-07 | 普通串联谐振 | independent circuit algebra | `ID-RLC-01`; primary textbook page unavailable | 无 | `Z=R+j(ωL-1/ωC)`; `f0=1/(2πsqrt(LC))` | N/A | A（仅明确串联单谐振） |
| G-08 | 普通并联谐振 | independent circuit algebra | `ID-RLC-02`; ADR-0007 | 无 | 理想 `Y=1/Rp+j(wC-1/wL)`；实际线圈支路 `Y=1/(Rs+jwL)+jwC`，`w0^2=1/(LC)-(Rs/L)^2` | N/A | A/C（仅明确对应拓扑、正根和端口） |
| G-09 | LLC/多谐振 | secondary thesis, topology-specific | LLC-ZJL PDF 24-33、64-65；关键页 V；图2.6，式2.13、2.16及高Q后续式 | 论文按其 FHA/特定变量 | 必须逐拓扑重建；本规范不转录一个通用 LLC 式 | V | C（仅同拓扑/同假设）；高Q式不能低Q用 |
| G-10 | 匹配变压器 | independent ideal-transformer algebra | `ID-Z-02`; ADR-0007 | 无 | `n=Np/Ns=Vp/Vs=Is/Ip`; `Zp=n^2 Zs` | N/A | A（理想无损、端口/RMS定义明确） |

## 6. H：冷却水

| equation_id | 方程/方法 | source_basis（人工审计摘要） | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status（人工审计摘要） |
|---|---|---|---|---|---|---|---|
| H-01 | 冷却热负荷分解 | independent control-volume balance | `ID-HYD-01`; DHT PDF 10-12 支持热源/热点范围；WB-FINAL 仅作错误证据 | 历史以 kW 和未经定义取热量混合 | `Qcool=Pcu+Qpickup+Pmagnetic+Pother` [W] | V/N/A | A（每项来源和回路明确） |
| H-02 | 水质量/体积流量 | independent first-law balance + property model | `ID-HYD-01`; IAPWS-95/IF97 online（本地 hash 缺口） | 工作簿常用 kW、L/min、℃ | 首选 `mdot=Q/[h(Tout,pout)-h(Tin,pin)]`; `Vdot=mdot/rho`；`Q/(cp_bar DeltaT)` 仅作物性变化可忽略时的显式近似 | N/A | A（单相、热边界明确）；固定 `kcool` X |
| H-03 | 支路面积与速度 | independent continuity | `ID-HYD-01`; WB-FINAL `J27:J29` 为错误/局部恒等式证据 | 工作簿把 kg/s 标 m/s | `Ah=πdi²/4`; `v=Vdotbranch/Ah`; `Dh=4Ah/Pwet` | N/A | A；工作簿 J27/J28 X |
| H-04 | Reynolds/Pr/Nu/h | primary correlations + definitions | `ID-HYD-01`; GN75 pp.8-16；NASA NTRS 19830022277 §6.1.2.1；OSTI 836896 §3.1.1 | 无量纲 | `Re=rho v Dh/mu`; `Pr=cp mu/k`; 层流 `Nu=3.656/4.364`; Gnielinski 公式见规范 | T/N/A | C（直圆管严格域；螺旋/入口/非圆/两相 Deferred） |
| H-05 | 压降与并联管网 | primary paper + independent momentum balance | `ID-HYD-02`; C39 pp.133-156；NIST-TN2294 report p.23 | 无量纲+SI压降 | Darcy-Weisbach；`fD=64/Re`；Colebrook 正根；节点连续/同节点压差 | T/N/A | C（直圆管/已知粗糙度；过渡与螺旋 Deferred） |
| H-06 | 局部相态/NPSH/水质门禁 | official property/safety framework | IAPWS-IF97 Region 4；HI-961；DHT PDF 11-12,17 | 各来源定义 | `DeltaTsub=Tsat(pabs)-T`; `dh/dz=q'/mdot`; NPSHA同基准比较 | V/T | C（原始裕量可算；安全阈值须 OEM/项目数据） |
| H-07 | 同控制体水侧能量守恒 | independent thermodynamic balance | `ID-HYD-01`; ADR-0006/0008 | 无 | `Qwater=mdot[hout-hin]`；同时间/同回路与模型残差 | N/A | A；历史冷却量不进入输入/校准/验证 |

## 7. J-I：热损失与绝热厚度

| equation_id | 方程/方法 | source_basis（人工审计摘要） | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status（人工审计摘要） |
|---|---|---|---|---|---|---|---|
| J-01 | 单/多层圆筒径向导热 | verified independent derivation + standard conflict | `ID-HT-01`; GB8175 PDF 7 (print 3), eq.7 视觉确认存在 `ln(Di/D0)` 风险 | GB8175 式7为单位长度热阻；疑似重复内层 | `Q=2πLkΔT/ln(ro/ri)`; `R'Σ=Σln(ri/r{i-1})/(2πki)` | V | A（Fourier 控制推导）；GB8175 原印式7 X/VFY勘误 |
| J-02 | 外表面对流 | primary correlations + analytical identity | `ID-HT-01`; CC75-V pp.1323-1329；CC75-H pp.1049-1053；CB77 pp.300-306 | 无量纲 | `Qconv=hA(Ts-Tinf)`；三子方法公式/域见规范 | T/N/A | A（恒等）；C（仅匹配竖直板/水平圆柱/横掠圆柱） |
| J-03 | 辐射 | independent radiation-network derivation + standard | `ID-RAD-01`; GB8175 PDF 14-16 Annex A eq.A.2 支持线性化 | 原单位按标准；实现 SI/K | `Q=epsilon sigma A(Ts^4-Tsur^4)`；同心灰圆筒含 `A1/A2` 的辐射电阻 | V/N/A | A（边界、面积和视因数明确） |
| J-04 | 线性化表面换热系数 | standard + algebra | GB8175 Annex A eq.A.2, PDF 14-16；`ID-RAD-01` | 标准温度单位须为 K | `hr=εσ(Ts⁴-Tsur⁴)/(Ts-Tsur)`; equal-T limit `4εσT³`; `hs=hc+hr` | V | A（同一面积/边界） |
| J-05 | 线圈-保温环隙多路径 | primary correlations + dispatcher contract | RH75；Kuehn-Goldstein 1976 DOI `10.1016/0017-9310(76)90145-9`；DT69；ONWI-229 PDF24-28；ADR-0006 | 无量纲 | `s_ann=(D_i-D_ins,o)/2`；水平 RH75 与竖直 DT69 公式/域见规范；辐射独立 | T/N/A | C（两类连续封闭环隙）；开口/离散/偏心复杂 Deferred |
| J-06 | 总稳态热损 | independent control-volume sum | `ID-HT-01`; no external page | 无 | `Qtotal=Qconv+Qrad+Qends+Qbridges+Qopenings` [W] | N/A | A（同一控制体且无重复）；端部模型未定 |
| J-07 | 瞬态热损/Biot 筛查 | independent energy method; primary page unavailable | `ID-HT-02`; no frozen textbook page | 无 | 时间步调用当前损失；`Bi=hLc/ksolid` | N/A | C/VFY（方法正确；集总阈值/几何定义待来源批准） |
| I-01 | 目标外表面温度厚度 | verified independent coupled derivation + standard check | `ID-HT-01`; GB8175 PDF 10 (print 6) eq.24 为固定 `αs` 单层退化式 | 标准式 `D1 ln(D1/D0)=2λ(T0-Ts)/[αs(Ts-Ta)]` | 完整 `F(ro)=Qcond-2πroL[hcΔT+εσ(Ts⁴-Tsur⁴)]=0` | V | A（闭合模型）；相关式/物性逐项限域 |
| I-02 | 目标允许热损厚度 | independent coupled derivation + rejected standard print | `ID-HT-01`; GB8175 PDF 10 (print 6) eq.20 视觉确认量纲不成立 | 原印 `D1ln(D1/D0)=2π[(T0-Ta)/qp-1/αs]`（拒绝） | 直接联立 `Qlimit=Qcond=Qsurface`; 单层代数退化应含 `2λ[...]` | V | A（完整联立）；GB8175 eq.20 X，待勘误 |
| I-03 | 双重约束 | independent constrained optimization | `ID-HT-01`; ADR-0006 | 无 | `delta*=min(F_T intersect F_Q intersect F_M)`；只有证明向上闭合才可退化 `max` | N/A | A/C（算法与有限域求解；依赖 J 方法/物性域） |
| I-04 | 平壁近似/临界绝热半径 | verified independent derivation + project warning policy | `ID-HT-01`; `docs/derivations/V1_CONTROLLED_DERIVATIONS.md` | 无 | 固定 `h,k` 圆柱 `rcrit=k/h`; `delta/ri` 只报告同输入圆筒/平壁热阻差 | N/A | C（筛查）；含辐射、变 `h` 或变 `k` 时非精确结论 |

## 8. 已明确拒绝但必须保留追溯的历史式

| rejected_id | 历史来源 | 判定 |
|---|---|---|
| X-WB-01 | WB-FINAL `J10=B9/B8`，标签 `l/Dm` | 比值方向和直径均错；正确当前几何约 `l/Dm=5.48673`。 |
| X-WB-02 | WB-FINAL `J12=Lideal*KN`; `J13=KN*J12` | Nagaoka 系数重复相乘；不得进入 B-04。 |
| X-WB-03 | WB-FINAL `B9` 把标为 cm 的 `B30` 与 mm 相加 | 单位错误虽在 `B45` 自我抵消，仍须拒绝。 |
| X-WB-04 | WB-FINAL `J27/J28/J30` | kg/s 冒充 m/s；功率/每分钟能量混加。H-02/H-03 必须从 SI 重建。 |
| X-WB-05 | WB-FINAL `K25=0.07B6` | 功率乘常数不能得到谐振电容；拓扑/频率/L 均缺失。 |
| X-WB-06 | WB-FINAL `F54=F51N²B32²+C49` 且 `B32` 已为平方衰减 | 实际四次衰减，无一手来源；只能另立 F-03 校准候选。 |
| X-WB-07 | WB-FINAL `Nu=0.59Ra^(1/4)` 用于线圈-保温环隙 | 几何不匹配；保留 Ra→Nu→h 思路，不保留此相关式。 |
| X-WB-08 | WB-FINAL `C70/C71` | 下限大于上限，原单位制/常数缺失；整组停用。 |
| X-GB-01 | GB8175 提供正文 eq.7 | 多层时 `ln(Di/D0)` 疑似重复累计；采用独立 Fourier 分层，等官方澄清。 |
| X-GB-02 | GB8175 提供正文 eq.20 | 量纲不成立；不以直觉补字，直接使用完整能量平衡。 |
| X-CHAT-01 | 主线程把 eq.20 改成 `2πλ[...]` | 既不同于原印，也不同于独立推导 `2λ[...]`；拒绝。 |

## 9. 可直接并入 `CALCULATION_BASIS.md` 的最小 `source_refs` 映射

```yaml
source_refs:
  A-01: [ID-DATA-01]
  A-02: [IAPWS-95, IAPWS-IF97, IAPWS-R12-08, IAPWS-R15-11, IAPWS-SR6-08:OPTIONAL-STRICT-DOMAIN, LOCAL-COPY-REQUIRED]
  B-01: [ID-GEO-01]
  B-02: [ID-GEO-01]
  B-03: [N09:PDF20-21:eq15-18, RG12:PDF116-135, CODATA22]
  B-04: [L85:PDF3-4:eq9-12:table1, N09:PDF20-21:eq15-18, CODATA22]
  B-05: [W28:PDF2:eq2, W28:PDF3:eq3]
  B-06: [W28:PDF1:PRINT1398:FIG1:eq1]
  B-07: [RG12:PDF6:eq1, RG12:PDF123:eq81, RG12:PDF126-128:example57, CODATA22]
  B-08: [ID-NUM-01]
  C-01: [ID-QA-01, VALIDATION_CASES]
  D-01: [ID-GEO-02]
  D-02: [ID-GEO-03]
  D-03: [ID-OHM-01]
  D-04: [ID-EM-01, JM95:PDF1-4, CODATA22]
  D-05: [RG12:PDF172-187, DHT:PDF8, DHT:PDF17-18]
  D-06: [ID-OHM-02]
  D-07: [ID-AC-01]
  E-01: [ID-EM-01, M04:PDF2:eq1, JM95:PDF1-4, CODATA22]
  E-02: [S89:PDF1-5, MATERIAL-DATA-REQUIRED]
  E-03: [M04:PDF2-3:eq1-5, ID-EM-01, CODATA22]
  F-01: [ID-Z-01, L13:PDF1-6, J08:PDF2-3]
  F-02: [ID-MEAS-01, DHT:PDF17-18]
  F-03: [ADR-0002, ADR-0004, ADR-0008, NEW-PROJECT-DATA-REQUIRED]
  G-01: [ID-TH-01]
  G-02: [ID-TH-01]
  G-03: [ID-TH-01]
  G-04: [ID-TH-01]
  G-05: [ID-TH-01]
  G-06: [ID-AC-02, PRIMARY-STANDARD-COPY-REQUIRED]
  G-07: [ID-RLC-01, PRIMARY-TEXTBOOK-COPY-REQUIRED]
  G-08: [ID-RLC-02, ADR-0007]
  G-09: [LLC-ZJL:PDF24-33, LLC-ZJL:PDF64-65]
  G-10: [ID-Z-02]
  H-01: [ID-HYD-01, DHT:PDF10-12]
  H-02: [ID-HYD-01, IAPWS-95, IAPWS-IF97, LOCAL-COPY-REQUIRED]
  H-03: [ID-HYD-01]
  H-04: [GN75:PP8-16, NASA-NTRS-19830022277:S6.1.2.1, OSTI-836896:S3.1.1]
  H-05: [ID-HYD-02, C39:PP133-156, NIST-TN2294:REPORT-P23]
  H-06: [ID-HYD-01, ID-HYD-02, IAPWS-IF97:REGION4, HI-961, DHT:PDF11-12, OEM-SPEC-REQUIRED]
  H-07: [ID-HYD-01, ADR-0006, ADR-0008]
  J-01: [ID-HT-01, GB8175:PDF7:eq7:REJECTED-AS-PRINTED]
  J-02: [ID-HT-01, CC75-V:PP1323-1329, CC75-H:PP1049-1053, CB77:PP300-306]
  J-03: [ID-RAD-01, GB8175:PDF14-16:eqA2, CODATA22]
  J-04: [ID-RAD-01, GB8175:PDF14-16:eqA2, CODATA22]
  J-05: [ID-ANN-01, RH75:PP265-315, DT69:PP-II198-II207, ADR-0006]
  J-06: [ID-HT-01]
  J-07: [ID-HT-02, PRIMARY-TEXTBOOK-COPY-REQUIRED]
  I-01: [ID-HT-01, GB8175:PDF10:eq24]
  I-02: [ID-HT-01, GB8175:PDF10:eq20:REJECTED-AS-PRINTED]
  I-03: [ID-HT-01, ADR-0006]
  I-04: [ID-HT-01]
```

## 10. 注册表完成度与阻塞项

- 52 个正式编号（A-01 至 I/J-xx）均已映射；其中并非 52 项都已批准。
- B-06 Wheeler 多层式已在本地 W28 PDF 1（print 1398）、Fig. 1、eq. (1) 完成一手视觉核验，来源追溯闭合，可按已声明限制实施。
- 尚未完成的发布级追溯：IAPWS/CODATA/NASA NTRS/OSTI/HI 等在线一手来源的本地固化与版本钉扎、H-06 OEM 水质/速度/相态安全阈值、J-07 Biot/集总判据原页。缺口对应子方法必须失败关闭；不阻止其他已批准方法实现。
- IAPWS、CODATA 及其他仅在线的一手来源须在发布实现前固定本地只读副本、访问日期和 SHA256，并登记到 `SOURCE_MANIFEST.csv`。
- 工作簿 15 张图片中无图像来源元数据；因此只能引用 `WB-FINAL:imageN:R0`，不能写成原论文来源。师傅新增的 Rayleigh/Nusselt 链被完整保留为研究问题，但当前关联式仍是 `reference-only/rejected for annulus`。
- 历史资料仅在第 8 节和 `PROJECT_AUDIT.md` 保留拒用/谱系记录，不影响产品方法、参数、校准、验证或 UI。
