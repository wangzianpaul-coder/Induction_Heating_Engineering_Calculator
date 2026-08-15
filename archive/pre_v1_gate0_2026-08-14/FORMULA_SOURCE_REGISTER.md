# Formula Source Register — 逐公式来源注册表

> 对应规范：`CALCULATION_BASIS.md` v0.1（2026-08-13）  
> 状态：正式配套审查草案；52/52 方法已建立来源状态，但未获工程批准，不是实现清单  
> 注意：本表同时登记“候选/缺口来源”；列入本表不等于成为正式依据。只有已进入受控 `references/`、有哈希/定位且科学状态获批的来源才可支持实施。
> 证据原则：Excel、旧聊天、截图与论文中的现成表格只作为候选证据。科学状态由原始来源定位、独立推导、SI 量纲、边界条件和验证共同决定；数值贴合截图不等于物理模型成立。

## 1. 字段、状态与定位规则

- `source_type`：`primary_paper`、`standard`、`official_property_model`、`independent_derivation`、`definition/project_contract`、`measurement_method`、`calibrated_black_box`、`legacy_workbook`、`secondary_case`。
- `location` 中 `PDF n` 是电子 PDF 页；`print n` 是印刷页；无原页时明确写 `page unavailable`，绝不反推页码。
- `visual`：`V` = 本轮已看原页渲染；`T` = 仅文本/结构检查；`N/A` = 独立推导、定义或算法契约；`R0` = 只有工作簿/截图，未恢复原始书页。
- `scientific_status`：`A` = 适用域内可作为工程计算依据；`C` = 可暂用但有限制；`R` = 仅参考；`VFY` = 待核查；`X` = 拒绝/已取代。
- 独立推导编号：`ID-EM-01` 皮深与临界频率；`ID-Z-01` 双绕组反射阻抗；`ID-MEAS-01` 端口阻抗辨识；`ID-TH-01` 功率/能量控制体；`ID-HYD-01` 冷却能量与水力链；`ID-HT-01` 圆筒传导-表面对流-辐射闭合；`ID-RAD-01` 灰体辐射网络；`ID-NUM-01` 数值求根/积分守则。

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
| MIT-HT | `working/tmp_pdf_audit/mit_insulation.pdf` | `bf64eb1e5c8ec46662fd5364ddf3a895ceb277f9c5de4e64cd91d2204fe085c3` |
| ANNULUS-CASE | `working/tmp_pdf_audit/natural_convection.pdf` | `b5597e4c24be65996cbfbb12235ce2ceecfb0e81e10af18c703dbe31d7b3b224` |

`MIT-HT` 与 `ANNULUS-CASE` 目前只存在 `working/`，没有进入 `SOURCE_MANIFEST.csv` 的受控 `references/`。如后续成为正式依据，必须先复制只读原件到 `references/external_sources/` 并重建清单。IAPWS-95/IF97 与 CODATA 本轮只有官方在线依据，尚无本地固化文件和 SHA256；对应条目不能宣称完成文件级追溯。

## 3. A-C：物性、几何、电感与比较

| equation_id | 方程/方法 | source_type | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status |
|---|---|---|---|---|---|---|---|
| A-01 | 温变表格插值 | definition/project_contract | `ID-DATA-01`; no external page | 无统一原式 | `y=y_i+(y_{i+1}-y_i)(T-T_i)/(T_{i+1}-T_i)` | N/A | A（仅限原数据包络；材料数据本身逐条另审） |
| A-02 | 水物性查询 | official_property_model | IAPWS-95/IF97 official online; local file/hash unavailable | IAPWS 状态方程，未在本文转录 | `ρ,cp,μ,k,Tsat = property_model(T,p)` | N/A | C/VFY（方法正确；本地版本、实现与数值回归未固化） |
| B-01 | 几何规范化 | definition/project_contract | `ID-GEO-01`; WB-FINAL cells `B8:B14,J9` 仅作冲突证据 | 工作簿混用 mm/cm；无可靠原式 | `Dmean=Dinner+d_rad=(Dinner+Douter)/2`; `b_cc=(N-1)p`; `b_env=b_cc+d_ax` | R0/N/A | A（定义获批后）；工作簿原链 X |
| B-02 | 轴向填充率 | independent_derivation + black-box identity | WB-FINAL `J5`; SCREEN-1/2 | 工作簿按 mm 代入，输出无量纲 | `k_fill=N d_ax/L1` | R0 | A（几何定义）；不是耦合系数 |
| B-03 | 理想长螺线管 | primary_paper + analytical limit | N09 PDF 20-21 (print 19-20, eqs.15-18) 支持电流片极限；RG12 PDF 116-135；原页已核查 | N09/RG12 为 electromagnetic CGS | `L_inf=μ0N²πa²/b` [H] | V | A（只作长线圈极限） |
| B-04 | Nagaoka/Lundin 有限长电流片 | primary_paper | L85 PDF 3-4 (print 1428-1429, eqs.9-12, table 1); N09 PDF 20-21 (print 19-20, eqs.15-18), PDF 32-34 tables | N09 为 CGS；L85 已给 SI/H 形式 | 规范中两分支 Lundin eqs.9-12 | V | A（圆柱电流片；六位数不等于实物精度） |
| B-05 | Wheeler 1928 单层式 | primary_paper | W28 PDF 2 (print 1399, eq.2), PDF 3 (print 1400, eq.3) | `L[µH]=a_in²N²/(9a_in+10b_in)` | 仅在 UI 边界 m→inch，输出 µH→H | V | C（工程近似；eq.2 的 1% 声明只在 `b>0.8a`） |
| B-06 | Wheeler 多层式 | primary-paper attribution, page gap | W28 文件；当前审计未记录多层式原页/式号 | `L[µH]=0.8a_in²N²/(6a_in+9b_in+10t_in)` | SI 仅作显式单位包装 | **VFY** | VFY（页码/式号必须补核；禁止由单层导体厚度触发） |
| B-07 | 离散同轴圆环求和 | primary_paper | RG12 PDF 6 eq.1（互感）；PDF 123 eq.81（等匝距求和）；PDF 126-128 Example 57；均为已核查页 | 原文 CGS，外因子 `4π`；导线修正也为 CGS | `L=ΣLi+2ΣMij`; `M=μ0√(aiaj){[(2/k)-k]K-(2/k)E}` [H] | V | A/C（丝状互感 A；有限截面单匝近似只对细圆实心线 C） |
| B-08 | Simpson 求椭圆积分 | numerical algorithm | `ID-NUM-01`; 项目 `长冈系数与Wheeler公式计算表.xlsx` 仅作实现线索，原数学教材页未固化 | 通用求积公式 | 偶数分段、`n,2n,4n` 收敛并与 AGM/Carlson/库交叉检查 | N/A | C（数值复核器；不是物理模型） |
| C-01 | 电感方法比较与警告 | definition/project_contract | `ID-QA-01`; `VALIDATION_CASES.md`; 无外部页 | 无 | `spread=(Lmax-Lmin)/Lreference`；各方法残差分列 | N/A | C（框架 A；`N≤10,p/d>2,3%` 阈值待批准） |

## 4. D-F：线圈电气、工件电磁与等效负载

| equation_id | 方程/方法 | source_type | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status |
|---|---|---|---|---|---|---|---|
| D-01 | 螺旋导体长度 | independent_derivation | `ID-GEO-02`; external source page unavailable | 无 | `ell=Nrev sqrt[(2πa)²+p²]+ell_leads+ell_bus` [m] | N/A | A（端点/匝数约定必须明确） |
| D-02 | 导体金属截面积 | independent_geometry | `ID-GEO-03`; no external page | 无 | 实心圆、圆管、实心矩形、矩形管标准面积差 [m²] | N/A | A |
| D-03 | DC 电阻 | independent_derivation/classical law | `ID-OHM-01`; material source separately required | 常见 `R=ρl/A`，单位随来源 | `Rdc(T)=ρe(T)ell/Ametal` [Ω] | N/A | A |
| D-04 | 铜趋肤深度 | independent_derivation + theory reference | `ID-EM-01`; JM95 PDF 1-4 仅理论旁证，OCR 差；WB-FINAL/SCREEN 只作数值复现 | 历史项目常用 Ω·cm、mm | `δ=sqrt[ρ/(πfμ0μr)]` [m] | JM95 VFY; equation N/A | A（线性半无限良导体） |
| D-05 | AC 电阻分级 | primary reference + approximation | RG12 PDF 172-187（Kelvin/Bessel/高频导线）；DHT PDF 8、17-18（邻近与实测）；WU PDF 3-5 是 FEM 个案 | RG12 为 CGS/旧式导线参数 | 严格模型待 SI 注册；临时高频外表面 `Aeff≈2πrδ` | V | C/VFY（孤立圆线模型须完成 SI 单测；邻近效应测量/FEM） |
| D-06 | 电流密度与铜损 | independent_derivation | `ID-OHM-02`; WB-FINAL `J14:J16`/截图只作恒等式复现 | 工作簿 kA、mm²、kW | `J=Irms/A`; `Pcu=Irms²Rac` | R0/N/A | A（RMS、截面和 Rac 来源明确时） |
| D-07 | 串联端口参数 | independent circuit algebra | `ID-AC-01`; WB-FINAL/SCREEN 仅作一致性证据 | 工作簿 kHz/µH/kV/kA | `X=ωL`; `Z=R+jX`; `Q=ωL/R`; `U=I|Z|` | R0/N/A | A（同频同端口）；`U≈IωL` 仅 C |
| E-01 | 工件参考透入深度 | independent derivation + theory reference | `ID-EM-01`; JM95 PDF 1-4；M04 PDF 2 eq.1 为工程单位旁证；LIAO 的正指数/50300 式已拒绝 | M04: `δ[cm]=(1/2π)sqrt(ρ[Ω·cm]10^9/(μr f))`，正文误把 μr 标 H/m | `δ=sqrt[ρ/(πfμ0μr)]`; `J=Js exp[-(1+j)y/δ]` | V（M04/JM95关键页审计） | A（线性半无限）；薄壁/Curie/异形只作参考 |
| E-02 | Curie/温度扫描 | primary model-scope evidence + project method | S89 PDF 1-5 (print 2745-2749); 姜滔/P92/CTP 仅材料个案 | 各文献的特定拟合，禁止转录成通用式 | 在批准节点查询 `ρ(T),μr(T,H,f)` 后逐点求 δ；过渡区加密 | V/T | C（方法 A；具体数据逐材料 VFY） |
| E-03 | 参考临界频率 | secondary empirical criterion + independent derivation | M04 PDF 2-3 (print 72-73, eqs.1-5); `ID-EM-01` | M04 取 `D/(2δ)=2`；`4e8ρ/(μrD²)` 的电阻率单位标注不一致 | `f=16ρ/(πμ0μrD²)` [Hz]; 工程式 `4.05285e8ρ[Ωcm]/(μrD[cm]²)` | V | C（实体圆柱经验参考；非最佳频率） |
| F-01 | 理想变压器反射阻抗 | independent derivation + reference-only model evidence | `ID-Z-01`; J08 PDF 2-3 图4-6 与 L13 PDF 1-6 仅支持等效模型边界；WB-FINAL 多个反射式为错误对照 | 文献符号/等效拓扑各异 | `Zin=R1+jωL1+ω²M²/(R2+jωL2)` 及 `Rref,Leq`; `k=M/sqrt(L1L2)` | V/N/A | A（给定线性集中参数）；不能据几何自动得到参数 |
| F-02 | 端口阻抗测量辨识 | measurement_method + independent algebra | `ID-MEAS-01`; DHT PDF 17-18 支持在工作频率、装工件状态实测 | 仪器可报告 V/I/P/PF/相位 | `|Z|=V/I`; `R=P/I²`; `X=sign(Q)sqrt(|Z|²-R²)`; `L=X/ω` | V | A（测量定义/去嵌入/不确定度齐全） |
| F-03 | 成熟软件黑箱标定 | calibrated_black_box | WB-FINAL; SCREEN-1/2; 主线程导出；无物理原页 | 工作簿各自混合单位/校准常数 | 物理约束最少参数拟合 + calibration/holdout 残差 | R0 | R/C（当前 `holdout-failed`，不得标 predicted） |

## 5. G：加热与系统电气

| equation_id | 方程/方法 | source_type | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status |
|---|---|---|---|---|---|---|---|
| G-01 | 批次有用热量 | independent thermodynamic balance | `ID-TH-01`; project material papers only support temperature dependence | 文献/表格单位不统一 | `E=m∫cp(T)dT+mΣΔh+Ereaction` [J] | N/A | A（控制体和焓数据明确） |
| G-02 | 连续有用功率 | independent thermodynamic balance | `ID-TH-01`; no external page | 无 | `P=mdot[∫cpdT+ΣΔh+Δhreaction]` [W] | N/A | A |
| G-03 | 加热时间/瞬态温度 | independent first-law ODE | `ID-TH-01`; specific FEM papers are validation-only | 无 | `mcp(T)dT/dt=Pabs-Qloss-Pphase/reaction` | N/A | A/C（集总模型须检查适用性） |
| G-04 | 功率边界与效率 | definition/project_contract | `ID-TH-01`; REPORT-2026-03 只作控制体冲突证据 | 历史文件混用总损失/效率 | 各效率按明确分子分母定义 | N/A | A（定义）；历史总效率只作校准输入 |
| G-05 | 所需输入功率 | independent control-volume balance | `ID-TH-01` | 无 | `Pwp=Puseful+Qloss`; `Pcoil=Pwp+Pcu+Pstray`; `Pgrid=Pcoil/Πη` | N/A | A（不得重复计效率/损失） |
| G-06 | 视在功率/PF | standard AC definitions, local primary page unavailable | `ID-AC-02`; page unavailable | 单/三相常见式 | `S=VI`; balanced 3φ `S=sqrt(3)ULLIL`; `PF=P/S` | N/A | A（定义）；规范来源需正式固化 |
| G-07 | 普通串联谐振 | independent circuit algebra | `ID-RLC-01`; primary textbook page unavailable | 无 | `Z=R+j(ωL-1/ωC)`; `f0=1/(2πsqrt(LC))` | N/A | A（仅明确串联单谐振） |
| G-08 | 普通并联谐振 | independent circuit algebra | `ID-RLC-02`; primary textbook page unavailable | 无 | `Y=1/R+j(ωC-1/ωL)` | N/A | A（仅所示理想并联拓扑） |
| G-09 | LLC/多谐振 | secondary thesis, topology-specific | LLC-ZJL PDF 24-33、64-65；关键页 V；图2.6，式2.13、2.16及高Q后续式 | 论文按其 FHA/特定变量 | 必须逐拓扑重建；本规范不转录一个通用 LLC 式 | V | C（仅同拓扑/同假设）；高Q式不能低Q用 |
| G-10 | 匹配变压器 | independent ideal-transformer algebra + black-box caveat | `ID-Z-02`; WB-FINAL `J20/M20` 是特定反推，原拓扑页缺失 | 历史含 380 V、整流系数、kV/kA | `Zp=n²Zs`; 电压/电流比依明确端口 | R0/N/A | A（理想变换）；工作簿整流关系 R/VFY |

## 6. H：冷却水

| equation_id | 方程/方法 | source_type | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status |
|---|---|---|---|---|---|---|---|
| H-01 | 冷却热负荷分解 | independent control-volume balance | `ID-HYD-01`; DHT PDF 10-12 支持热源/热点范围；WB-FINAL 仅作错误证据 | 历史以 kW 和未经定义取热量混合 | `Qcool=Pcu+Qpickup+Pmagnetic+Pother` [W] | V/N/A | A（每项来源和回路明确） |
| H-02 | 水质量/体积流量 | independent first-law balance + property model | `ID-HYD-01`; IAPWS online（本地 hash 缺口） | 工作簿常用 kW、L/min、℃ | `mdot=Q/(cpΔT)`; `Vdot=mdot/ρ` in SI | N/A | A（单相、热边界明确）；固定 `kcool` X |
| H-03 | 支路面积与速度 | independent continuity | `ID-HYD-01`; WB-FINAL `J27:J29` 为错误/局部恒等式证据 | 工作簿把 kg/s 标 m/s | `Ah=πdi²/4`; `v=Vdotbranch/Ah`; `Dh=4Ah/Pwet` | N/A | A；工作簿 J27/J28 X |
| H-04 | Reynolds/Pr/Nu/h | standard + definitions | GB8175 PDF 14-16, Annex A table A.2: `Nu=0.0214(Re^0.80-100)Pr^0.4` and `0.012(Re^0.87-280)Pr^0.4`; DHT PDF 11 限制局部热点 | 标准式为无量纲，h 用 SI | `Re=ρvDh/μ`; `Pr=cpμ/k`; `h=Nu k/Dh` | V | C（几何与声明域匹配；不能预测线圈局部沸腾） |
| H-05 | 压降与并联管网 | independent momentum balance/classical relation | `ID-HYD-02`; primary hydraulics page unavailable | 无 | Darcy-Weisbach + local K + elevation；层流圆管 `fD=64/Re` | N/A | C/VFY（基本式 A；湍流摩阻/粗糙度/局阻来源尚未批准） |
| H-06 | 沸腾/结垢/腐蚀/空化警告 | engineering safety logic | DHT PDF 11-12、17；IAPWS Tsat 在线来源未固化；OEM/水质规范缺失 | 定性要求 | 仅警告逻辑，无单一计算式 | V | C/VFY（原则保留；阈值必须由 OEM/规范批准） |
| H-07 | 项目能量守恒验证 | independent calculation + project evidence | REPORT-2026-03 相邻页（电子页精确编号未登记）；`ID-HYD-01` | `783 kW`, `135 L/min`, `35→55°C` | 统一 SI 复算：783 kW/20 K≈562 L/min；135 L/min/20 K≈188 kW | T | A（条件算术）；项目控制体仍 VFY |

## 7. J-I：热损失与绝热厚度

| equation_id | 方程/方法 | source_type | source_refs + location | 原单位式 | SI 归一式/项目式 | visual | scientific_status |
|---|---|---|---|---|---|---|---|
| J-01 | 单/多层圆筒径向导热 | independent derivation + textbook + standard conflict | `ID-HT-01`; MIT-HT PDF 15-18（视觉核查 p.17）；GB8175 PDF 7 (print 3), eq.7 视觉确认存在 `ln(Di/D0)` 风险 | GB8175 式7为单位长度热阻；疑似重复内层 | `Q=2πLkΔT/ln(ro/ri)`; `R'Σ=Σln(ri/r{i-1})/(2πki)` | V | A（Fourier 推导）；GB8175 原印式7 X/VFY勘误 |
| J-02 | 外表面对流 | analytical identity + correlation selection | `ID-HT-01`; GB8175 PDF 14-16 Annex A/table A.1；精确式号依几何而异 | 标准按 Gr/Re 和姿态分类 | `Qconv=hcA(Ts-Ta)` [W] | V | A（基本式）；`hc` 相关式逐域 C |
| J-03 | 辐射 | independent radiation-network derivation + standard | `ID-RAD-01`; GB8175 PDF 14-16 Annex A eq.A.2 支持线性化；WB-FINAL image10 只有无页码截图 | 截图 `εeff=1/(1/ε1+1/ε2-1)` 仅等面积近似 | `Q=εσA(Ts⁴-Tsur⁴)`；同心灰圆筒含 `A1/A2` 的辐射电阻 | V/R0 | A（边界/视因数明确）；工作簿等面积式仅 C |
| J-04 | 线性化表面换热系数 | standard + algebra | GB8175 Annex A eq.A.2, PDF 14-16；`ID-RAD-01` | 标准温度单位须为 K | `hr=εσ(Ts⁴-Tsur⁴)/(Ts-Tsur)`; equal-T limit `4εσT³`; `hs=hc+hr` | V | A（同一面积/边界） |
| J-05 | 线圈-保温同心环隙 | engineering correlation candidates, no default | `ANNULUS_CONVECTION_RESEARCH.md`; Raithby–Hollands 1975 DOI `10.1016/S0065-2717(08)70076-5`; de Vahl Davis–Thomas 1969 DOI `10.1063/1.1692437`; ONWI-229 PDF 24-28（报告13-17）；WB-FINAL images12-14 无原页 | 工作簿 `Ra=gβΔTgap³/(να)`, `Nu=0.59Ra^1/4` 属开放竖直外表面，不是环隙通式 | `Ra=gβ|ΔT|Lc³/(να)`; `Nu=hLc/k`; 水平封闭候选 Raithby–Hollands、竖直封闭候选 Thomas–de Vahl Davis；开口须流动-能量联立 | V/T/R0 | C/VFY（候选仅限原域且项目边界未确认；师傅当前关联式 X） |
| J-06 | 总稳态热损 | independent control-volume sum | `ID-HT-01`; no external page | 无 | `Qtotal=Qconv+Qrad+Qends+Qbridges+Qopenings` [W] | N/A | A（同一控制体且无重复）；端部模型未定 |
| J-07 | 瞬态热损/Biot 筛查 | independent energy method; primary page unavailable | `ID-HT-02`; no frozen textbook page | 无 | 时间步调用当前损失；`Bi=hLc/ksolid` | N/A | C/VFY（方法正确；集总阈值/几何定义待来源批准） |
| I-01 | 目标外表面温度厚度 | independent coupled derivation + standard check | `ID-HT-01`; GB8175 PDF 10 (print 6) eq.24 为固定 `αs` 单层退化式；MIT-HT 圆筒热阻 | 标准式 `D1 ln(D1/D0)=2λ(T0-Ts)/[αs(Ts-Ta)]` | 完整 `F(ro)=Qcond-2πroL[hcΔT+εσ(Ts⁴-Tsur⁴)]=0` | V | A（闭合模型）；相关式/物性逐项限域 |
| I-02 | 目标允许热损厚度 | independent coupled derivation + rejected standard print | `ID-HT-01`; GB8175 PDF 10 (print 6) eq.20 视觉确认量纲不成立 | 原印 `D1ln(D1/D0)=2π[(T0-Ta)/qp-1/αs]`（拒绝） | 直接联立 `Qlimit=Qcond=Qsurface`; 单层代数退化应含 `2λ[...]` | V | A（完整联立）；GB8175 eq.20 X，待勘误 |
| I-03 | 双重约束 | independent optimization logic | `ID-HT-01`; WB-FINAL `B40/G40` 为不闭合反例 | 工作簿同时固定 Ts/Q，不能闭合 | 分别求 `δTs,δQ`，取最大并重新校核 | N/A/R0 | A（算法）；工作簿原式 X |
| I-04 | 平壁近似/临界绝热半径 | textbook + project warning policy | MIT-HT PDF 18（曲率误差）、PDF 30 eq.3.25（`rcrit=k/h`）；均视觉核查 | 教材 SI | `rcrit=k/h`; `δ/ri` 警告区间 | V | C（筛查）；含辐射/变 h 时非精确结论 |

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
  A-02: [IAPWS-95, IF97, LOCAL-COPY-REQUIRED]
  B-01: [ID-GEO-01, WB-FINAL:X-WB-03]
  B-02: [ID-GEO-01, WB-FINAL:J5, SCREEN-1, SCREEN-2]
  B-03: [N09:PDF20-21:eq15-18, RG12:PDF116-135]
  B-04: [L85:PDF3-4:eq9-12:table1, N09:PDF20-21:eq15-18]
  B-05: [W28:PDF2:eq2, W28:PDF3:eq3]
  B-06: [W28:PAGE-EQ-REQUIRES-VERIFICATION]
  B-07: [RG12:PDF6:eq1, RG12:PDF123:eq81, RG12:PDF126-128:example57]
  B-08: [ID-NUM-01]
  C-01: [ID-QA-01, VALIDATION_CASES]
  D-01: [ID-GEO-02]
  D-02: [ID-GEO-03]
  D-03: [ID-OHM-01]
  D-04: [ID-EM-01, JM95:PDF1-4]
  D-05: [RG12:PDF172-187, DHT:PDF8, DHT:PDF17-18]
  D-06: [ID-OHM-02]
  D-07: [ID-AC-01]
  E-01: [ID-EM-01, M04:PDF2:eq1, JM95:PDF1-4]
  E-02: [S89:PDF1-5, MATERIAL-DATA-REQUIRED]
  E-03: [M04:PDF2-3:eq1-5, ID-EM-01]
  F-01: [ID-Z-01, L13:PDF1-6, J08:PDF2-3]
  F-02: [ID-MEAS-01, DHT:PDF17-18]
  F-03: [WB-FINAL, SCREEN-1, SCREEN-2, PRIMARY-THREAD]
  G-01: [ID-TH-01]
  G-02: [ID-TH-01]
  G-03: [ID-TH-01]
  G-04: [ID-TH-01, REPORT-2026-03]
  G-05: [ID-TH-01]
  G-06: [ID-AC-02, PRIMARY-STANDARD-COPY-REQUIRED]
  G-07: [ID-RLC-01, PRIMARY-TEXTBOOK-COPY-REQUIRED]
  G-08: [ID-RLC-02, PRIMARY-TEXTBOOK-COPY-REQUIRED]
  G-09: [LLC-ZJL:PDF24-33, LLC-ZJL:PDF64-65]
  G-10: [ID-Z-02, WB-FINAL:REFERENCE-ONLY]
  H-01: [ID-HYD-01, DHT:PDF10-12]
  H-02: [ID-HYD-01, IAPWS-95, LOCAL-COPY-REQUIRED]
  H-03: [ID-HYD-01, WB-FINAL:X-WB-04]
  H-04: [GB8175:PDF14-16:tableA2, DHT:PDF11]
  H-05: [ID-HYD-02, HYDRAULICS-SOURCE-REQUIRED]
  H-06: [DHT:PDF11-12, DHT:PDF17, OEM-SPEC-REQUIRED]
  H-07: [ID-HYD-01, REPORT-2026-03:PAGE-REQUIRES-REGISTRATION]
  J-01: [ID-HT-01, MIT-HT:PDF15-18, GB8175:PDF7:eq7:REJECTED-AS-PRINTED]
  J-02: [ID-HT-01, GB8175:PDF14-16:tableA1]
  J-03: [ID-RAD-01, GB8175:PDF14-16:eqA2]
  J-04: [ID-RAD-01, GB8175:PDF14-16:eqA2]
  J-05: [ID-ANN-01, ANNULUS-CASE:LIMITED, WB-FINAL:IMAGE12-14:REFERENCE-ONLY]
  J-06: [ID-HT-01]
  J-07: [ID-HT-02, PRIMARY-TEXTBOOK-COPY-REQUIRED]
  I-01: [ID-HT-01, GB8175:PDF10:eq24, MIT-HT:PDF15-18]
  I-02: [ID-HT-01, GB8175:PDF10:eq20:REJECTED-AS-PRINTED]
  I-03: [ID-HT-01, WB-FINAL:B40-G40:COUNTEREXAMPLE]
  I-04: [MIT-HT:PDF18, MIT-HT:PDF30:eq3.25]
```

## 10. 注册表完成度与阻塞项

- 52 个正式编号（A-01 至 I/J-xx）均已映射；其中并非 52 项都已批准。
- 尚未完成页级正式追溯：B-06 Wheeler 多层式、IAPWS/CODATA 本地固化、G-06 至 G-08 的正式教材/标准原页、H-05 湍流摩阻与局部阻力、H-06 OEM 水质/流速/沸腾要求、H-07 项目汇报精确幻灯片号、J-07 Biot/集总阈值。
- `MIT-HT` 和 `ANNULUS-CASE` 尚在 `working/`，要成为正式来源必须进入 `references/` 和 `SOURCE_MANIFEST.csv`。
- 工作簿 15 张图片中无图像来源元数据；因此只能引用 `WB-FINAL:imageN:R0`，不能写成原论文来源。师傅新增的 Rayleigh/Nusselt 链被完整保留为研究问题，但当前关联式仍是 `reference-only/rejected for annulus`。
- 本注册表不把“表格出现过”“截图贴合”“旧模型说过”升级为科学依据；它们只影响黑箱复现轨和待核查清单。
