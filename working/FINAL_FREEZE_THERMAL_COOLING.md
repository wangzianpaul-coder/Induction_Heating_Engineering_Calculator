# Final Freeze Research — Cooling, Insulation and Annulus Heat Transfer

> 项目：Induction Heating Engineering Calculator / 电磁感应加热工程计算器  
> 日期：2026-08-14  
> 文档性质：最终冻结前专项工程研究；只供正式文档修订和工程审批使用  
> 写入边界：仅创建本 `working/` 报告；未修改 `CALCULATION_BASIS.md`、`CALCULATION_CONTRACTS.md`、`VALIDATION_CASES.md`、`src/` 或 `tests/`  
> 本报告范围：用户决定 9、10、11，以及这些决定对 Gate 0 的影响  
> 重要限制：本报告中的 `Approved` 等标签是“建议冻结状态”，不是本报告自行授予的工程批准。

## 0. 结论先行

1. **冷却链可以冻结成完整的、会失败关闭的工程合同**：

   \[
   P_{Cu,AC}+\dot Q_{pickup\to coil}+\dot Q_{other}
   \rightarrow \dot Q_{cool,design}
   \rightarrow \dot m,\dot V
   \rightarrow v,Re,Pr
   \rightarrow Nu,h_i
   \rightarrow \Delta p,p(z),T_b(z),T_w(z)
   \rightarrow 沸腾裕量、泵空化裕量和数据充分性状态.
   \]

   其中守恒式、SI 定义、直圆管的层流极限、Gnielinski 湍流基线以及 Darcy–Weisbach/Colebrook 压降可作为 v1 候选；实际螺旋线圈的曲率、非圆水道、局部 AC 热源峰值和两相沸腾不能被这些直管式静默覆盖。

2. **不采用任何历史冷却总功率、总流量或其比值作为输入默认、系数校准或科学验证**。它们只保留在历史暴露资料中。新的冷却验证须使用公式恒等案例、IAPWS 校核点、NIST 直铜管数据，以及冻结模型后取得的独立线圈量热/压降/壁温试验。

3. **不能从平均水量直接声称“线圈不会沸腾”**。至少要有局部入水热流 `q'_cool(z,theta)`、局部静压 `p_abs(z)`、局部水温、内部换热模型、内壁温度和经 OEM/工程批准的裕量。只知道总热负荷时，最多给平均筛选结果。

4. **双目标保温采用完整径向圆筒能量平衡**：温度相关圆筒 Fourier 导热、外表面对流和辐射必须闭合；端部、支撑和热桥单列。GB/T 8175—2025 中现阶段存疑的印刷式不得作为求厚公式，继续采用独立 Fourier 推导。

5. **双目标的通用解不是无条件的 `max(delta_T,delta_Q)`**。由于圆筒临界绝热半径以及 `h_c(T_s,D)`、辐射、变导热率会造成非单调性，通用算法应求“表温约束可行区间”和“热损约束可行区间”的交集，再取最小可制造厚度。只有证明两个可行集在所选设计分支上都是向上闭合区间时，才可退化为取两根的最大值。

6. **环隙必须按五类物理路径分流，不设通用默认式**。水平封闭连续同心圆筒和竖直封闭连续同心环隙各有受限候选；开口烟囱、轴向热流腔以及离散螺旋线圈边界不能套用封闭连续圆筒式。外表面自由对流应路由到 J-02，而不是伪装成 J-05 环隙方法。

7. **真实径向环隙统一建议命名为 `s_ann`，不得再使用裸 `g` 或 `gap`**。匝间轴向净间距保留已批准的 `g_turn=p-d_ax`；重力加速度写 `g0`。对同心连续边界：

   \[
   s_{ann}=\frac{D_i-D_{ins,o}}{2},
   \qquad D_{ins,o}=D_{wp,o}+2\delta_{ins}.
   \]

8. **本专项没有理由把所有热工功能永久阻断，但当前项目 Gate 0 仍不能通过**。可冻结的受限方法已经足以消除“完全没有候选式”的空白；真正剩余的项目级阻断是：正式合同尚未同步、首版材料数据包和外表面对流方法未批准、高风险实际线圈试验/FEM未执行、验证基础设施未落盘、技术冻结尚未签字。若某个 Deferred 方法明确从 v1 普通结果中排除并返回 `insufficient_data`，它本身不应成为无限期 Gate 0 阻断。

---

## 1. 状态语义与共同约束

### 1.1 本报告使用的四类冻结建议

| 标签 | 本报告中的含义 | 允许的 v1 行为 |
|---|---|---|
| **Approved** | 定义式、守恒式或可独立推导的关系；来源、单位和边界无实质争议 | 可进入正式合同，仍需项目签字 |
| **Approved with limitation** | 有可追溯方法，但只在明确几何、边界和有效域内可防御 | 域内计算；域外 `not_applicable` 或 `insufficient_data`，不能静默外推 |
| **Deferred** | 已知道要解决什么，但 v1 暂不承诺该物理模型 | 从 v1 正常计算路径排除，可保留接口或人工输入 |
| **Insufficient evidence** | 当前案例或方法缺关键几何、物性、原始数据、OEM门槛或验证 | 必须返回缺失项；不得给“安全/合格”结论 |

### 1.2 内部单位与符号原则

- 内部只使用 SI：m、kg、s、K、Pa、W、J、kg/s、m3/s、W/(m2·K)。
- 所有压力用于相态和 NPSH 时必须是**绝对压力**；表压只能在入口层转换。
- 所有辐射温度必须是 K。
- `f_D` 始终表示 Darcy 摩擦因子；不得与 Fanning 因子混用。
- `g0` 表示重力加速度，避免与任一几何间隙重名。
- 流量必须带状态基准：`Vdot_in`、`Vdot_out` 或 `Vdot_at_state`，因为密度随温压变化。
- 数值求解收敛容差只表示算法残差，不代表工程模型精度；显示有效数字必须另按模型不确定度处理。

---

## 2. 冷却系统完整计算合同

## 2.1 控制体和热负荷

### 2.1.1 目的

回答“实际进入某个水冷回路的设计热负荷是多少”，而不是把整套设备所有能量都塞进水路。

### 2.1.2 推荐方程

对冷却控制体 `cv`：

\[
\dot Q_{cool,raw}
=P_{Cu,AC}
+\dot Q_{pickup\to coil}
+P_{mag\to cooled}
+\dot Q_{other\to cooled}.
\]

设计裕量必须是显式、可追踪的场景项，例如：

\[
\dot Q_{cool,design}
=(1+M_Q)\dot Q_{cool,raw}+\dot Q_{unknown,allowance},
\]

其中 `M_Q` 和绝对余量均**无通用默认**，且不能与上游已含裕量的输入重复计算。

若采用电气估算：

\[
P_{Cu,AC}=I_{rms}^{2}R_{ac}(T_{Cu},f,geometry).
\]

若已有同一边界、同一时段的量热或经校准损耗测量，应保留模型值与测量值并列，并允许测量值覆盖设计工况；不得通过修改无来源系数强行让两者相等。

### 2.1.3 外部入热的边界

`Qdot_pickup_to_coil` 只包括被水冷部件实际吸收的净热量，例如：

\[
\dot Q_{pickup\to coil}
=\int_{A_{coil,ext}}
\left(q''_{rad,net}+q''_{conv,net}+q''_{contact}\right)dA.
\]

以下量**不能自动加入**：

- 工件有用升温功率；
- 工件或保温层向整个环境的总热损；
- 无功功率；
- 电源柜、变压器或未接入本回路的损耗；
- 已包含在测得 `P_Cu` 或量热值中的重复项。

### 2.1.4 周期工况

- 稳态水量可用最不利连续负荷或经热容量证明的周期平均负荷，两者必须标明。
- 局部壁温与热疲劳通常受周期峰值和空间热源分布控制；不能用周期平均 `Qdot` 代替瞬态局部温度。
- v1 的本链是单相、准稳态筛选；完整周期热容模型列为 Deferred。

**冻结建议：** H-01 控制体恒等式 **Approved**；外部入热模型 **Approved with limitation**，因为其数值依赖 J-05/J-06、测量或 FEM。

## 2.2 水物性和状态

### 2.2.1 推荐数据源

纯水/蒸汽的 v1 属性建议统一由以下正式公式族提供：

- `rho, cp, h, Tsat`：IAPWS-IF97 工业公式；
- `mu`：IAPWS R12-08 水黏度公式；
- `k_f`：IAPWS R15-11 水导热率公式。

对高精度科学验证可使用 IAPWS-95；普通工程运行使用 IF97 更合适。IAPWS 官方说明 IF97 可给密度、比热、焓等热力性质，并含 Region 4 饱和曲线；黏度和导热率需调用各自 Release，不能从 `cp` 或经验常数猜取。

### 2.2.2 属性查询点

每个轴向单元使用局部体平均状态 `(p_b,T_b)`：

\[
\rho_b=\rho(p_b,T_b),\quad
\mu_b=\mu(p_b,T_b),\quad
k_b=k(p_b,T_b),\quad
c_{p,b}=c_p(p_b,T_b).
\]

若加入防冻液、缓蚀剂或其他添加剂，纯水 IAPWS 属性立即失效；必须切换到有浓度、温度、压力范围的混合液物性包。

**冻结建议：** 物性公式来源 **Approved with limitation**；项目仍需把具体库、版本、校核点和插值/失败语义写入 A-02 正式数据包。

## 2.3 热负荷到质量流量和体积流量

### 2.3.1 严格单相焓差形式

忽略控制体内轴功、动能和位能变化时：

\[
\dot Q_{cool,design}
=\dot m\,[h(p_{out},T_{out})-h(p_{in},T_{in})].
\]

因此：

\[
\dot m=
\frac{\dot Q_{cool,design}}
{h(p_{out},T_{out})-h(p_{in},T_{in})}.
\]

小压降、窄温区的简化式为：

\[
\dot m\approx
\frac{\dot Q_{cool,design}}
{\bar c_p(T_{out}-T_{in})},
\qquad
\bar c_p=\frac{h_{out}-h_{in}}{T_{out}-T_{in}}.
\]

体积流量应按声明的状态计算：

\[
\dot V_{in}=\frac{\dot m}{\rho(p_{in},T_{in})},
\qquad
\dot V_{out}=\frac{\dot m}{\rho(p_{out},T_{out})}.
\]

### 2.3.2 与压降的耦合

若只给入口压力和允许出口温度，`p_out` 又由流量决定，则应迭代：

1. 以焓差估计 `mdot`；
2. 由管网计算 `Delta p(mdot)` 和 `p_out`；
3. 用新 `p_out` 重算焓差与 `mdot`；
4. 直至能量残差和压力残差同时满足容差。

不能把不收敛的流量当作“保守值”输出。

### 2.3.3 并联支路

\[
\dot m_{total}=\sum_j\dot m_j,
\qquad
\Delta p_j(\dot m_j)=\Delta p_{common}.
\]

只有几何、粗糙度、局部阻力、热状态和阀位均可视为相同的支路，才可采用均分；否则必须解管网。每个支路还要满足自己的能量式：

\[
\dot Q_j=\dot m_j(h_{out,j}-h_{in,j}).
\]

**冻结建议：** H-02 **Approved with limitation**，限单相、稳态、控制体清楚；H-03 的支路守恒 **Approved**。

## 2.4 水道几何、速度和无量纲数

通用定义：

\[
A_h=\text{流通面积},\qquad
P_w=\text{润湿周长},\qquad
D_h=\frac{4A_h}{P_w},
\]

\[
v=\frac{\dot m}{\rho A_h},\qquad
Re=\frac{\rho vD_h}{\mu},\qquad
Pr=\frac{c_p\mu}{k_f}.
\]

对圆形内孔：

\[
A_h=\frac{\pi d_i^2}{4},\qquad
P_w=\pi d_i,\qquad
D_h=d_i.
\]

`D_h` 是定义，不是把任意非圆、弯曲、带角水道自动变成圆管的许可证。特别是矩形内孔的角区、周向非均匀热流和螺旋曲率可能使仅用 `D_h` 的 Nu 相关式失效。

**冻结建议：** 几何、`v/Re/Pr` 定义 **Approved**；用圆管相关式处理其他截面 **Deferred/Insufficient evidence**。

## 2.5 v1 水侧 Nu/h 候选

### 2.5.1 候选 A：充分发展层流、直圆管

对恒物性、充分发展的圆管层流：

\[
Nu_D=3.656\quad\text{恒壁温},
\]

\[
Nu_D=4.364\quad\text{恒周向、恒轴向壁面热流密度}.
\]

\[
h_i=\frac{Nu_D k_b}{d_i}.
\]

强制条件：

- `Re<2300`；
- 直圆管；
- 水动力和热力均充分发展；
- 明确选择恒壁温或恒热流边界；
- 恒物性近似、无显著浮力混合、无相变、无强曲率二次流。

若入口发展长度、边界条件或曲率未证明，不能只在 3.656 与 4.364 中挑一个“更接近截图”的值；应返回 `insufficient_data` 或采用单独的 Graetz/数值模型。

### 2.5.2 候选 B：Gnielinski 直圆管湍流基线

v1 建议采用保守子域 `1e4 <= Re <= 5e6`、`0.5 <= Pr <= 2000`：

\[
f_G=\left(1.82\log_{10}Re-1.64\right)^{-2}
=\left(0.79\ln Re-1.64\right)^{-2},
\]

\[
Nu_D=
\frac{(f_G/8)(Re-1000)Pr}
{1+12.7\sqrt{f_G/8}\left(Pr^{2/3}-1\right)},
\]

\[
h_i=\frac{Nu_Dk_b}{d_i}.
\]

说明：

- INL/MOOSE 的官方实现给出原式计算和 `2300 <= Re <= 5e6`、`0.5 <= Pr <= 2000` 警告域；本项目将正常批准域收窄到 `Re>=1e4`，把过渡流不确定性留在警告/Deferred 分支。
- 此处 `f_G` 是该光滑管 Nu 相关式内部的摩擦表达，不等同于压降模块用实际粗糙度求得的 `f_D`。不得用沉积严重管路的 Colebrook 因子直接替代而声称仍在原验证域。
- 要求直、圆、液相单相、近似充分发展和液压光滑；入口、急弯、连续螺旋曲率、强物性变化和周向热流峰值均不在此基线内。
- INL 的另一官方说明明确指出其基础实现未考虑管长发展和物性变化；因此大壁温差下不应仅凭该式给局部安全结论。

### 2.5.3 流态分派

| 条件 | v1 处置 |
|---|---|
| `Re<2300` 且层流候选全部边界满足 | 计算对应 `Nu=3.656` 或 `4.364`，`success_with_warnings` 或批准后的 `success` |
| `2300<=Re<1e4` | `Deferred`；不线性插值、不钳制到 1e4、不自动调用湍流式 |
| `1e4<=Re<=5e6` 且 Gnielinski 条件满足 | `Approved with limitation` |
| `Re>5e6` 或 `Pr` 越界 | `not_applicable`；需要其他相关式/试验 |
| 弯曲螺旋、矩形/复杂水道、显著沉积 | 直管值只能作 reference screening；实际 `h_i` 为 `Insufficient evidence` |

### 2.5.4 为什么实际线圈仍需验证

感应线圈水道沿螺旋中心线弯曲，存在由曲率驱动的二次流；水道还可能是方管、矩形管或机加工通道。直圆管相关式并不包含曲率比、螺距、弯头、接头、角区和周向 AC 热源集中。建议保存：

\[
\chi_c=\frac{D_h}{2R_c},
\qquad
De=Re\sqrt{\frac{D_h}{2R_c}},
\]

仅作为曲率严重程度描述量；本报告不冻结无来源的 Dean 阈值或修正系数。实际螺旋/非圆水道的 Nu 与压降相关式列为 Deferred，最小试验见第 6 节。

**冻结建议：** H-04 的 `Re/Pr/h` 框架 **Approved**；上述两个直圆管方法 **Approved with limitation**；过渡流、螺旋曲率、非圆水道和两相换热 **Deferred**。

## 2.6 压降和泵工作点

### 2.6.1 直管与局部损失

采用 Darcy–Weisbach：

\[
\Delta p_{straight}
=f_D\frac{L}{D_h}\frac{\rho v^2}{2},
\]

\[
\Delta p_{local}
=\sum K_j\frac{\rho v_j^2}{2},
\]

\[
\Delta p_{elev}=\rho g_0\Delta z,
\qquad
\Delta p_{system}=\Delta p_{straight}+\Delta p_{local}+\Delta p_{elev}.
\]

直圆管层流：

\[
f_D=\frac{64}{Re}.
\]

湍流候选采用 Colebrook 隐式式：

\[
\frac{1}{\sqrt{f_D}}
=-2\log_{10}\left(
\frac{\varepsilon}{3.7D_h}
+\frac{2.51}{Re\sqrt{f_D}}
\right).
\]

### 2.6.2 强制适用规则

- `f_D` 是 Darcy 因子；若外部数据给 Fanning 因子，必须显式乘 4 转换。
- `epsilon` 是该实际内表面的等效绝对粗糙度，必须有材料/状态来源或测量。NIST 直铜管试验采用的 `0.0015 mm` 只能用于其新铜管验证案例，不能作为所有老化感应线圈默认。
- `2300<Re<4000` 的压降按过渡流返回 `insufficient_data`；不自动插值。
- 每个 `K_j` 必须对应具体接头、弯头、缩扩、阀门和 Reynolds 范围；缺失时报告未计局部损失，不能把 `K=0` 当“已验证”。
- 连续螺旋弯曲不是一串任意 90° 弯头，也不是直管；未批准曲率模型时，直管结果只作下层基线，不作泵选型终值。

### 2.6.3 管网和泵曲线

对全部支路建立节点连续方程和支路压降方程，再与厂家泵曲线求交：

\[
H_{pump}(\dot V,n)=H_{system}(\dot V).
\]

并联支路共享节点压差但流量不必相同。没有泵曲线、转速、阀位和支路阻力时，只能报告“给定流量所需压差”，不能宣称泵能实现该流量。

NIST TN 2294 对内径 `20.11 mm` 的 Type L 直铜管试验表明，测得 Darcy 摩擦因子与 Colebrook 相关式在该试验范围内约 `±3%` 一致；这是很好的独立直管验证，但不能验证螺旋线圈、接头或沉积管。

**冻结建议：** H-05 直圆管 Darcy/Colebrook **Approved with limitation**；已知 `K` 的局部损失守恒 **Approved with limitation**；过渡流、螺旋修正和缺数据管网 **Deferred/Insufficient evidence**。

## 2.7 轴向水温、局部壁温与铜温

### 2.7.1 分段能量方程

对每条支路，把局部进入水的线热流定义为：

\[
q'_{cool}(z)
=q'_{Cu,AC}(z)+q'_{pickup}(z)+q'_{other}(z)
\quad[W/m].
\]

液相单相、质量流量恒定时：

\[
\frac{dh_b}{dz}=\frac{q'_{cool}(z)}{\dot m},
\]

再由 IAPWS 反解 `T_b(z)=T[p(z),h_b(z)]`。这比用一个全长平均 `cp` 更适合高温升或压力变化。

### 2.7.2 内壁平均温度

若圆管内周热流可近似均匀：

\[
q''_i(z)=\frac{q'_{cool}(z)}{P_i},
\qquad P_i=\pi d_i,
\]

\[
T_{w,i}(z)
=T_b(z)+q''_i(z)
\left(\frac{1}{h_i(z)}+R''_f\right),
\]

其中 `R''_f [m2·K/W]` 是内壁沉积/污垢热阻，无证据时不能把“长期运行”默认成零污垢安全状态。

### 2.7.3 铜外壁筛选温度

对直、圆、轴对称、外表面施加均匀热流、恒 `k_Cu` 的理想壁：

\[
T_{w,o}-T_{w,i}
=q'\frac{\ln(r_o/r_i)}{2\pi k_{Cu}}.
\]

但 AC 铜损是在铜壁中并且受集肤/邻近效应驱动，通常空间不均匀；矩形管角部和靠工件面尤其不能用轴对称式描述。v1 可提供一个明确命名的**一维径向筛选值**：把非负的局部入热全部等效放在外表面，计算 `T_w,o,screen`。该假设可用于比较壁厚/流量趋势，但不是周向或轴向局部热点上界。

若只有总功率并假设全长均匀，则输出必须叫 `average_wall_temperature_screening`；要输出 `T_w,max`，至少需下列之一：

- 经验证的 `q'_max(z,theta)`/热源分布；
- 经测量的热点系数及其有效工况包络；
- 电磁-热耦合 FEM；
- 局部温度试验。

ASM Handbook 的感应器案例明确指出铜涡流损耗、磁通集中器损耗以及工件辐射/对流都会造成过热，且铜温度分布不均；其案例所用换热相关式只到约 `250 °C` 的铜壁/水界面才被作者认为适用。这个温度是**该案例相关式的有效性上限**，不是本项目通用“安全壁温”。

**冻结建议：** 分段焓方程 **Approved**；直圆管平均内壁温度 **Approved with limitation**；真实最大铜温/热点 **Insufficient evidence**，直到有局部热源或试验/FEM。

## 2.8 沸腾裕量、局部相态和空化

### 2.8.1 线圈内局部单相裕量

由压降模型得到局部绝对静压 `p_abs(z)`，由 IAPWS 饱和曲线得到：

\[
\Delta T_{sub,bulk}(z)
=T_{sat}[p_{abs}(z)]-T_b(z),
\]

\[
\Delta T_{sub,wall}(z)
=T_{sat}[p_{abs}(z)]-T_{w,i}(z).
\]

执行规则：

- `Delta T_sub,bulk<=0`：局部体相单相假设失败；
- `Delta T_sub,wall<=0`：壁面可能进入沸腾，单相 Nu/h 模型失效；
- 两者为正只表示原始热力学余量为正。要给“设计通过”，仍需 `M_bulk,req`、`M_wall,req` 等经 OEM/工程批准的正裕量；本报告不设通用数值。
- 只比较 `T_out` 与常压沸点是错误做法；压力沿程下降且热点可能不在出口。
- 一旦进入亚冷核态沸腾、膜态沸腾或临界热流问题，应切换两相模型/试验；不得钳制壁温或继续外推 Gnielinski。

### 2.8.2 泵 NPSH 与线圈沸腾不是同一门禁

泵入口的可用净正吸入压头按“绝对总吸入压头减饱和蒸汽压头”定义，可写为：

\[
NPSH_A
=\frac{p_{suction,abs}}{\rho g_0}
+\frac{v_s^2}{2g_0}
-\frac{p_{sat}(T_s)}{\rho g_0},
\]

其中 `p_suction,abs` 是泵基准面处的静压；若输入已经是总压，不得再次加入速度头。高程必须相对于厂家泵基准面正确计入。需要厂家在对应流量、转速、液体条件下给出的 `NPSH_R`：

\[
NPSH_A>NPSH_R
\]

只是必要比较，实际裕量应按现行 ANSI/HI 9.6.1 和泵厂家要求确定。Hydraulic Institute 2024 版说明 `NPSH_A` 是系统特性、`NPSH_R` 是厂家泵特性，并要求考虑工况、液体、老化、瞬态和运行区间；因此不冻结一个跨泵通用百分比。

### 2.8.3 水质、结垢与腐蚀

- ASM 建议纯净去离子水用于感应线圈，并指出矿物沉积会缩小流道、增加热阻、提高铜温直至失效；见该章印刷 pp. 598–600 / PDF pp. 10–12。
- Ambrell 的官方冷却说明同样建议独立清洁闭式回路，并指出溶解矿物沉积可使设备过热、腐蚀和堵塞。
- 这些来源支持“必须设置水质门禁”，但不支持一个通用的 pH、硬度、电导率或添加剂浓度默认。具体阈值以所选电源、工作头、线圈和冷却机组手册为准。
- 任何添加剂都会改变 `rho,cp,mu,k`；未提供混合液物性时不得继续使用纯水结果。

**冻结建议：** 原始饱和裕量和 NPSH 定义 **Approved with limitation**；“安全/无沸腾/无空化”布尔结论在缺 OEM 门槛、局部热流、绝对压力或泵曲线时为 **Insufficient evidence**。

## 2.9 完整执行顺序和收敛条件

1. 冻结冷却控制体和工况时间基准。
2. 汇总 `P_Cu,AC`、外部入热、磁性材料和其他实际入水热量；检查重复项和来源。
3. 选择纯水或已验证混合液物性包；输入 `T_in,p_in` 和允许 `T_out`/温升。
4. 由焓差求初始 `mdot`。
5. 按管网分配支路，计算 `A_h,D_h,v,Re,Pr`。
6. 按流态、截面、曲率和方法域选择 Nu/h；无匹配方法即失败关闭。
7. 由 Darcy/Colebrook、局部阻力和高程求各支路 `Delta p`、节点压力和泵工作点。
8. 分段积分 `h_b(z),T_b(z),p(z)`，更新物性和 Re/Pr/Nu/h。
9. 由局部 `q'` 求内壁平均温度；有热源分布时再求铜热点，否则只给 screening。
10. 计算全路径最小体相/壁面饱和裕量、压力等级、铜材料温限、水质和 NPSH 门禁。
11. 若 `R_ac` 又依赖铜温，外层迭代 `T_Cu -> R_ac -> P_Cu -> T_Cu`；仅当电气、热量和温度残差同时满足批准容差才收敛。
12. 输出每一项的来源、域状态、未计热量和不确定性；不得只输出一个流量。

建议残差形式，不预设物理精度：

\[
|R_E|\le \epsilon_{E,abs}
+\epsilon_{E,rel}\max(|\dot Q_{load}|,|\dot m\Delta h|),
\]

\[
|R_p|\le \epsilon_{p,abs}
+\epsilon_{p,rel}\max(|\Delta p_{pump}|,|\Delta p_{system}|),
\]

并要求相邻外层迭代的 `mdot`、`T_w,max/screen` 和 `P_Cu` 变化均低于批准容差。达到迭代次数上限时返回 `non_converged`，不能保留最后一次“看起来合理”的数值。

## 2.10 必需输入与失败语义

| 输入组 | 必需量 | 缺失时的正确行为 |
|---|---|---|
| 热源 | `P_Cu,AC` 或其可追踪输入；`Qpickup`; 其他入水热量；时间基准 | 热负荷/流量 `insufficient_data` |
| 水状态 | 流体配方、`T_in,p_in_abs`、允许 `T_out` 或 `Delta T` | 不计算流量或相态 |
| 支路 | 每支路截面、长度、并联拓扑、流量/泵边界 | 不假设均分 |
| 压降 | 实际粗糙度、接头 `K`、高程、泵曲线、阀位 | 只报告已知直管项；泵实现性不足 |
| Nu/h | 水道形状、直/弯、曲率、入口长度、热边界、Re/Pr | 无匹配域则 `not_applicable` |
| 壁温 | 局部 `q'(z,theta)` 或已批准热点因子、`R''_f`、铜壁几何与 `k(T)` | 只给平均筛选，安全状态不足 |
| 沸腾 | 全程绝对压力、局部内壁温、OEM所需裕量 | 不输出“不会沸腾” |
| 空化 | 泵吸入口状态、`NPSH_R(Q,n)`、适用裕量规则 | 不输出“不会空化” |
| 水质 | OEM 水质范围、实测水质、添加剂及其物性 | 定性警告；纯水属性不可用于混合液 |

## 2.11 非历史的验证案例

### COOL-ENTH-IDENTITY-001 — 常物性守恒

人工单元测试：`Q=10,000 W`、`cp=4,182 J/(kg·K)`、`Delta T=5 K`，应有：

\[
\dot m=0.478240\ kg/s.
\]

这只验证能量恒等式，不验证实际水属性或设计水量。

### COOL-GNIELINSKI-001 — 公式回归点

`Re=100,000`、`Pr=7` 时：

\[
f_G=0.0179920,\qquad Nu=599.066.
\]

若另取 `k=0.6 W/(m·K)`、`d_i=0.01 m`，则 `h=35,944 W/(m2·K)`。这是实现回归点，不是实验准确度声明。

### COOL-COLEBROOK-001 — 公式与 NIST 直铜管交叉核对

以 NIST TN 2294 的直铜管几何基准 `D=0.02011 m`、其试验采用的 `epsilon=1.5e-6 m`，在人工 `Re=100,000` 下，Colebrook 根为：

\[
f_D=0.0183840.
\]

实施时还应数字化/录入 NIST Figure 18 的测点，按报告给出的约 `±3%` 一致性进行独立曲线验证；当前状态 `specified_not_run`。

### COOL-WALL-LIMIT-001 — 壁温恒等极限

- `q'->0` 时，`T_b,T_wi,T_wo` 的差值均应趋于零；
- `h_i->infinity` 时，内壁膜温差趋于零；
- `R''_f` 增大时壁温不能降低；
- 在同一流量和密度下，缩小内径应提高速度并显著增大压降。

### EXP-COOL-001 — 冻结前最低实物试验

同一稳态工况同步测量：线圈端口有功、进/出水温、质量/体积流量、进/出口及关键节点绝对压力、泵转速/曲线、至少一个预期热点铜温；记录水质和环境。用水侧焓升与电气/热源清单闭合，不用任何历史总量作目标值。至少覆盖两个流量和两个功率，使 `h`、压降和热点趋势可区分。

---

## 3. 双目标圆筒保温完整规范

## 3.1 几何和问题边界

令：

- `r_0=r_i`：保温层热侧半径；
- `r_n=r_o`：保温外半径；
- `delta=r_o-r_i`：总保温厚度；
- `L`：有效轴向长度；
- `T_0=T_i`：**保温热侧表面温度**，不是未经换算的工件芯部或流体体温；
- `T_n=T_s`：保温外表面温度。

若输入是工件体温、炉内气温或管内流体温度，必须另建内侧膜阻、壁阻和接触阻，先求 `T_i`。v1 不得把这些温度静默视为同一个量。

## 3.2 完整径向圆筒 Fourier 导热

### 3.2.1 常导热率多层

\[
R_{cond}=
\sum_{j=1}^{n}
\frac{\ln(r_j/r_{j-1})}{2\pi L k_j},
\qquad
\dot Q_{side}=\frac{T_i-T_s}{R_{cond}}.
\]

### 3.2.2 温度相关导热率

对每层 `j`，稳态无体热源的严格积分式为：

\[
\frac{\dot Q_{side}}{2\pi L}
\ln\left(\frac{r_j}{r_{j-1}}\right)
=\int_{T_j}^{T_{j-1}}k_j(T)\,dT.
\]

所有层共享同一 `Qdot_side`，联立求界面温度。该式优于把高温跨度内的 `k(T)` 任意取成一个常数；若用平均导热率，必须定义：

\[
\bar k_j=
\frac{1}{T_{j-1}-T_j}
\int_{T_j}^{T_{j-1}}k_j(T)dT.
\]

接触热阻可作为单独项加入，且要有单位和来源；不能通过修改材料 `k` 隐藏接缝、压缩或湿度效应。

## 3.3 外表面对流与辐射

侧表面积：

\[
A_o=2\pi r_oL.
\]

外表面对流：

\[
\dot Q_{conv}=A_o h_c
(T_s-T_a).
\]

对大等温周围、视因数近似 1 的漫灰表面：

\[
\dot Q_{rad}=A_o\varepsilon\sigma
(T_s^4-T_{sur}^4).
\]

完整径向侧壁能量平衡：

\[
F_s(T_s,r_o)=
\dot Q_{cond}(T_i,T_s,r_o)
-\dot Q_{conv}(T_s,r_o)
-\dot Q_{rad}(T_s,r_o)=0.
\]

`h_c` 必须由与姿态、外径、长度、自然/强制风和有效域匹配的 J-02 方法得到，或作为有来源/测量的输入。复杂周围表面必须用视因数/辐射网络，不能默认 `F=1`。

### 3.3.1 J-02 共同定义与路由条件

自然对流的共同定义为：

\[
T_f=\frac{T_s+T_a}{2},\qquad
Ra_X=\frac{g_0\beta_f|T_s-T_a|X^3}{\nu_f\alpha_f}
=Gr_XPr_f,
\]

\[
h_c=\frac{Nu_X k_f}{X},\qquad
\dot Q_{conv}=h_cA(T_s-T_a).
\]

除非选定相关式另有规定，空气物性在膜温 `T_f` 和声明的绝对压力下求取。`Ra` 使用温差绝对值以选相关式，热流式保留 `T_s-T_a` 的符号。应用必须先取得：真实外表面几何、轴向与重力方向、是否有连续外壳/遮挡、特征长度、表面热边界、远场温度、风速和风向。J-02 只处理暴露于大环境的外表面；连续封闭环隙应路由 J-05。

### 3.3.2 候选 A：无约束竖直平面自然对流

Churchill–Chu 的全域平均相关式：

\[
\overline{Nu}_L=
\left[
0.825+
\frac{0.387Ra_L^{1/6}}
{\left[1+(0.492/Pr)^{9/16}\right]^{8/27}}
\right]^2,
\qquad h_c=\frac{\overline{Nu}_L k_f}{L}.
\]

其中 `L` 是沿重力方向的受热高度。原论文把一般式构造成覆盖全 `Ra/Pr` 的渐近相关式；首版实现仍采用保守上限 `Ra_L<=10^12`，并把更高 `Ra`、强变物性、非牛顿、受限通道、强环境流和明显混合对流拒绝出本方法。该方法适用于无约束大环境中的竖直平面、等温或均匀加热边界。将其用于竖直圆筒必须另有曲率可忽略的项目判据；当前没有批准判据时，竖直圆筒返回 `insufficient_data`，不能仅因“看起来很长”就当平板。

来源为 Churchill and Chu, *International Journal of Heat and Mass Transfer* 18 (1975), pp. 1323–1329, DOI `10.1016/0017-9310(75)90243-4`。美国 DOE/Argonne 官方报告 OSTI 1756317 的 PDF p. 8、式 (2)–(3) 原样列出该式及 `Ra_L` 定义，可用于转录交叉核对。

**冻结建议：** `J02_NATURAL_CC75_VERTICAL_PLATE` **Approved with limitation**；竖直圆筒曲率扩展 **Deferred/Insufficient evidence**。

### 3.3.3 候选 B：无约束长水平圆柱自然对流

Churchill–Chu 圆柱平均相关式：

\[
\overline{Nu}_D=
\left[
0.60+
\frac{0.387Ra_D^{1/6}}
{\left[1+(0.559/Pr)^{9/16}\right]^{8/27}}
\right]^2,
\qquad h_c=\frac{\overline{Nu}_D k_f}{D_o}.
\]

特征长度是暴露圆柱外径 `D_o`。首版保守域取 `10^-5<=Ra_D<=10^12`；几何是孤立、无约束、足够长的水平圆柱，端部可忽略，边界为均匀壁温或均匀加热。相邻线圈、护罩、墙面、地面或保温外壳造成的阻塞/羽流相互作用均不在该式内。

来源为 Churchill and Chu, *International Journal of Heat and Mass Transfer* 18 (1975), pp. 1049–1053, DOI `10.1016/0017-9310(75)90222-7`；DOE/Argonne OSTI 1756317，PDF p. 8、式 (1) 与 (3) 可作公式转录交叉核对。

**冻结建议：** `J02_NATURAL_CC75_HORIZONTAL_CYLINDER` **Approved with limitation**。

### 3.3.4 候选 C：圆柱均匀横掠强制对流

当已知远场风速且风向为圆柱横掠时，Churchill–Bernstein 相关式为：

\[
\overline{Nu}_D=0.3+
\frac{0.62Re_D^{1/2}Pr^{1/3}}
{\left[1+(0.4/Pr)^{2/3}\right]^{1/4}}
\left[1+\left(\frac{Re_D}{282000}\right)^{5/8}\right]^{4/5},
\]

\[
Re_D=\frac{\rho_fU_\infty D_o}{\mu_f},\qquad
h_c=\frac{\overline{Nu}_Dk_f}{D_o}.
\]

门禁为 `Re_D Pr>=0.2`，流体物性取膜温；几何为单根圆柱的均匀横掠外流。原论文明确说明该式在数据范围内是一个下界式，而自由来流湍流、端部、通道阻塞和自然对流等会改变或提高换热。因此它不能静默覆盖圆柱阵列、离散螺旋、非横掠风或混合对流。

来源为 Churchill and Bernstein, *Journal of Heat Transfer* 99(2) (1977), pp. 300–306, DOI `10.1115/1.3450685`。

**冻结建议：** `J02_FORCED_CB77_CYLINDER_CROSSFLOW` **Approved with limitation**。

### 3.3.5 J-02 不得隐含处理的工况

- 自然与强制对流同时不可忽略时，若没有批准的混合对流组合规则，不得取两者最大值或任意幂和；返回 `mixed_convection_method_required`。
- 水平平板、倾斜表面、竖直小曲率圆柱、圆柱阵列、线圈遮挡、有限端部、开口烟囱和受限外流各需自己的方法；首版均 **Deferred**。
- `Nu=0.59Ra^(1/4)` 不作为任意外表面的总默认；只有完整匹配其原始几何、边界和有效域时才可作为单独 method，当前未冻结。
- 固定 `h_c` 仅可作为有量测、OEM 或项目批准来源的输入，并必须保存来源、工况和不确定度。

### 3.3.6 J-02 公式回归点

以下只验证公式转录和实现，不替代实验精度验证：

| ID | 输入 | 预期平均 Nu | 用途 |
|---|---|---:|---|
| `J02-CC75-VP-001` | `Ra_L=1.0e6, Pr=0.7` | `16.5303668764` | 竖直平面式回归 |
| `J02-CC75-HC-001` | `Ra_D=1.0e6, Pr=0.7` | `14.5101908474` | 水平圆柱式回归 |
| `J02-CB77-XC-001` | `Re_D=1.0e4, Pr=0.7` | `53.3277886702` | 横掠圆柱式回归 |

实现还应检验：`Ra->0` 时两条 Churchill–Chu 式分别趋于 `0.825^2=0.680625` 与 `0.60^2=0.36`；`T_s=T_a` 时虽然 `h_c` 的相关式极限可能为有限值，带符号的 `Qconv` 必须严格为零。

## 3.4 端部、支撑和“总热损”口径

上述式是**完整的径向圆筒侧壁平衡**，不是有限长度设备的 3D 总热损。设备级总量应写：

\[
\dot Q_{total}
=\dot Q_{side}
+\dot Q_{end}
+\dot Q_{bridge}
+\dot Q_{penetration}.
\]

- 端盖、支撑、法兰、导线、保温缝和穿透件没有批准模型时，`Q_total` 必须返回 `insufficient_data`，或明确标成 `sidewall_only`。
- 不能把所有端部损失折进一个无来源的表面对流系数。
- 当轴向梯度显著、`L` 不足以忽略端部或几何非圆时，推荐 2D/3D 热 FEM 或实验。

## 3.5 目标一：限制外表面温度

给定 `T_s,max`，直接边界方程为：

\[
F_T(r_o)=
\dot Q_{cond}(T_i,T_{s,max},r_o)
-A_o\left[
h_c(T_{s,max},r_o)(T_{s,max}-T_a)
+\varepsilon\sigma(T_{s,max}^4-T_{sur}^4)
\right]=0.
\]

但“等式根”不自动等于“最小可行厚度”。通用执行方式：

1. 在有限 `delta in [delta_min,delta_max]` 上，对每个厚度先解表面平衡 `F_s=0` 得 `T_s(delta)`；
2. 构造约束 `C_T(delta)=T_s(delta)-T_s,max`；
3. 找出所有 `C_T<=0` 的可行区间；
4. 取满足材料温限、几何和制造规则的最小厚度。

若在 `delta_min` 已满足，不应强行返回一个正等式根。若 `T_i<=T_s,max` 或热流方向与模型不符，应给明确边界状态而非继续求根。

## 3.6 目标二：限制热损

给定允许热损后，对每个 `delta` 先解：

\[
F_s[T_s(delta),r_o]=0,
\]

再计算：

\[
C_Q(delta)=\dot Q_{total}(delta)-\dot Q_{limit}.
\]

找出全部 `C_Q<=0` 的厚度区间，而不是在一个任意“大半径”区间只做一次二分。

允许损失的输入类型必须互斥且口径明确：

| 输入 | 转换规则 |
|---|---|
| 总热损 `Qdot_limit [W]` | 直接使用，但须声明是否含端部/热桥 |
| 线热损 `q'_limit [W/m]` | 对侧壁 `Qdot_limit=q'_limit L` |
| 面热流 `q''_limit [W/m2]` | 必须指定面积基准 |

若 `q''_limit` 以设计外面积为基准，则：

\[
\dot Q_{limit}(r_o)=q''_{limit}(2\pi r_oL),
\]

它随待求厚度变化；不能先用裸管面积换算后隐藏该选择。

## 3.7 双目标的严格可行域算法

定义：

\[
\mathcal F_T=\{\delta:C_T(\delta)\le0\},
\qquad
\mathcal F_Q=\{\delta:C_Q(\delta)\le0\},
\]

并加入材料、几何和工艺可行集 `F_M`：

\[
\delta^*=
\min\left(\mathcal F_T\cap\mathcal F_Q\cap\mathcal F_M\right).
\]

常见的简化：

\[
\delta^*=\max(\delta_T,\delta_Q)
\]

只有在所选设计域上已经证明 `F_T=[delta_T,infinity)`、`F_Q=[delta_Q,infinity)` 时成立。圆筒临界绝热半径会使热损随厚度先增后减；自然对流 `h_c` 和辐射还会增强非线性。因此建议正式 I-03 把“取最大值”改为：

> 先求并验证两个可行区间；若二者在批准域内均为向上闭合区间，可用最大根快捷求解，否则求区间交集的最小可行厚度。

商业规格向上圆整：

\[
\delta_{design}=ceil_{available}(\delta^*).
\]

圆整后必须重算 `T_s`、`Qdot_total`、全部界面温度和材料温限；若失败，选择下一档厚度。圆整前通过不能替代圆整后验证。

## 3.8 数值求解与收敛条件

### 3.8.1 每一厚度的内层温度解

对正常保温工况 `T_i>max(T_a,T_sur)`，在物理区间内对 `F_s(T_s,r_o)=0` 使用括区求根。要求：

- `0<T_s<T_i`，净热流向外；
- 所有 `k_j(T)>0` 且查询温度在材料数据域内；
- `0<=epsilon<=1`；
- `h_c` 方法在当前 `Ra/Pr/geometry` 域内且连续；
- 各层界面温度严格位于相邻边界温度之间；
- 各层导热量和表面散热量的残差同时满足批准容差。

残差形式：

\[
|F_s|\le\epsilon_{Q,abs}
+\epsilon_{Q,rel}\max(
|\dot Q_{cond}|,
|\dot Q_{conv}+\dot Q_{rad}|).
\]

若相关式在某个 `Ra` 边界跳变，应按方法域分段求根，不得跨不连续点二分。

### 3.8.2 外层厚度搜索

1. `delta_max` 必须有限且由空间、材料或设计输入给出；
2. 在整个区间扫描 `T_s(delta)`、`Qdot(delta)`，捕获所有符号变化和可行区间；
3. 用 Brent 等括区法细化每个边界；
4. 检查可能的切触根/局部极值，不能只依赖一次符号变号；
5. 在全部可行区间中选择最小制造厚度；
6. 区分：
   - 求解器残差未达标：`non_converged`；
   - 在 `delta_max` 内确实无可行解：建议新增 `no_feasible_solution`，不要与数值不收敛混淆；
   - 缺物性或 `h_c`：`insufficient_data`；
   - 方法域越界：`not_applicable`。

当前统一结果枚举没有 `no_feasible_solution`，这是正式数据合同需要补的一处语义缺口。

## 3.9 适用性、警告和拒绝项

### 可采用的假设

- 稳态、1D 径向侧壁导热；
- 各层连续、同心、无体热源；
- 热侧表面温度已知；
- 材料 `k(T)`、发射率和最高使用温度有来源；
- 外部对流/辐射边界已定义。

### 必须警告/升级的情况

- 端部、支撑或穿透热桥占比不可忽略；
- 非圆、偏心、层间大缝隙、压缩或开裂；
- 材料含湿、老化、烧结或 `k(T)` 外推；
- 外表面有强制风、局部遮挡或复杂辐射周围；
- 目标接近材料极限或求解对发射率/`h_c` 高敏感；
- 瞬态升温时间与保温热容量不可忽略。

### 拒绝/隔离

- 平壁 `Q=kA Delta T/delta` 不得替代一般圆筒导热；
- `r_crit=k/h` 只用于恒 `k/h` 的筛选，不能替代含辐射、变 `h` 的完整曲线；
- GB/T 8175—2025 当前存疑印刷式 (20) 以及多层式中疑似重复内径项，在来源澄清前不进入实现；
- 历史工作簿反算厚度不作为科学验证目标。

## 3.10 非历史验证案例

### INS-FOURIER-001 — 精确圆筒恒等式

`r_i=0.05 m`、`r_o=0.10 m`、`L=1 m`、`k=0.1 W/(m·K)`、`T_i=400 K`、`T_s=300 K`：

\[
\dot Q=\frac{2\pi Lk(T_i-T_s)}{\ln(r_o/r_i)}
=90.6472\ W.
\]

取 `epsilon=0`、`T_a=290 K`，若令：

\[
h=\frac{\dot Q}{2\pi r_oL(T_s-T_a)}
=14.4282\ W/(m^2K),
\]

则表面平衡残差应为零。该案例验证圆筒、面积和单位，不验证真实自然对流。

### INS-VARK-001 — 变导热率积分

设置线性 `k(T)=a+bT`，用解析积分：

\[
\int k(T)dT=aT+\frac{bT^2}{2}
\]

作为数值积分和多层界面求解的独立校核。

### INS-DUAL-NONMONO-001 — 非单调门禁

构造恒 `k,h`、无辐射且裸半径低于 `r_crit=k/h` 的案例，验证 `Qdot(delta)` 先增加后降低；测试简单 `max(delta_T,delta_Q)` 可能落入不可行区，而可行域交集算法能选择正确分支。

### INS-ROUND-001 — 向上圆整

连续解位于两档商业厚度之间时，必须选择较厚档并重算全部边界；测试圆整后约束失败时自动升级下一档。

**冻结建议：** J-01 Fourier 圆筒导热 **Approved**；变 `k` 多层和完整侧壁平衡 **Approved with limitation**；I-01/I-02/I-03 求解架构 **Approved with limitation**，但正式 I-03 的无条件 `max` 语义应先改成可行域算法；端部/热桥总量在无模型时 **Insufficient evidence**。

---

## 4. 环隙五类路径与几何语义冻结

## 4.1 不再重名的真实径向间隙

项目已批准线圈几何语义：`D_i,D_o,D_m,D_c,d_rad,d_ax,p,g_turn,b_cc,b_env,N,N_rev,lead_length`。在此基础上：

\[
g_{turn}=p-d_{ax}
\]

只表示相邻匝之间的轴向净间距。

建议为线圈—保温层真实径向净隙新增：

\[
D_{ins,o}=D_{wp,o}+2\delta_{ins},
\]

\[
s_{ann}=\frac{D_i-D_{ins,o}}{2}.
\]

若从导体中心直径导出，且为单层、径向尺寸恒定：

\[
D_i=D_c-d_{rad},
\]

\[
s_{ann}=
\frac{D_c-d_{rad}-D_{wp,o}-2\delta_{ins}}{2}.
\]

偏心量 `e_ann` 已知时：

\[
s_{ann,min}=s_{ann}-e_{ann},
\qquad
s_{ann,max}=s_{ann}+e_{ann}.
\]

硬门禁：`s_ann,min>0`。若外边界是有节距的螺旋铜管，`s_ann` 只是保温外表面到线圈内包络面的径向净距，不意味着存在连续封闭冷圆筒。

为避免方法文献中的 `D_i/D_o` 与项目线圈 `D_i/D_o` 冲突，环隙方法内部统一用：

- `D_hot`：热内圆筒外径，通常等于 `D_ins,o`；
- `D_cold`：连续冷外圆筒内径，只有连续外壁时才可等于线圈内包络；
- `s_ann=(D_cold-D_hot)/2`；
- `g0`：重力加速度。

历史表中任何 mm/cm 标注冲突都不能决定 `s_ann`；必须由核实后的实物几何或图纸决定。

## 4.2 五类物理路径和冻结状态

| 路径枚举 | 物理边界 | 候选/路由 | 冻结建议 | 关键缺失或限制 |
|---|---|---|---|---|
| `horizontal_closed_radial` | 水平轴、封闭、连续、同心、内热外冷、端部可忽略 | Raithby–Hollands 等效导热率 | **Approved with limitation** | 必须连续冷外壁、足够长、域内 `Pr/F_cyl Ra/K`；离散螺旋失效 |
| `vertical_closed_radial` | 竖直轴、上下封闭、端面近似绝热、内外壁等温 | Thomas–de Vahl Davis 分区式 | **Approved with limitation** | 严格 `Ra/Pr/K/H` 域；`1<H<5` 分区边界未批准；高 Ra/多胞流不保证热点 |
| `vertical_open_chimney` | 上下开口/与环境连通，有净质量流量 | 浮升压头+摩擦+进出口损失+能量联立 | **Deferred**；当前案例通常 **Insufficient evidence** | 需开口、阻力、环境、轴向热边界；封闭 Nu 式禁用 |
| `external_unconfined_surface` | 没有连续外圆筒，表面暴露于大环境 | 路由 J-02 外表面自然/强制对流 | J-05 中 **not applicable**；J-02 可 **Approved with limitation** | 必须选真实板/圆筒方向和特征长度；`0.59Ra^1/4` 不是环隙默认 |
| `closed_axial_heat_flux_cavity` | 热/冷端盖形成轴向热流，封闭圆环腔 | Rayleigh–Bénard/环形腔专用模型 | **Deferred/Insufficient evidence** | 热面在上/下会改变稳定性；不能套径向热流式 |

独立几何完整性标志：

- `outer_boundary=continuous_cylinder | discrete_helix | perforated | unknown`；
- `concentricity=e_ann/s_ann`；
- `end_condition=closed | open | partial | unknown`；
- `axis_orientation`；
- `heat_flow_direction=radial | axial | mixed`。

只要 `outer_boundary!=continuous_cylinder`，前两条连续圆筒相关式应返回 `not_applicable`。真实离散螺旋线圈可进入 FEM/实验或单独标定方法，但不能通过“覆盖率系数”无来源补齐。

## 4.3 路径 1：水平封闭连续同心圆筒

定义：

\[
s_{ann}=\frac{D_{cold}-D_{hot}}{2},
\]

\[
F_{cyl}=
\frac{[\ln(D_{cold}/D_{hot})]^4}
{s_{ann}^3
\left(D_{hot}^{-3/5}+D_{cold}^{-3/5}\right)^5},
\]

\[
Ra_s=\frac{g_0\beta(T_h-T_c)s_{ann}^3}{\nu\alpha},
\qquad
Pr=\frac{\nu}{\alpha}.
\]

Raithby–Hollands 候选：

\[
\frac{k_{eff}}{k_f}
=\max\left[
1,
0.386
\left(\frac{Pr}{0.861+Pr}\right)^{1/4}
(F_{cyl}Ra_s)^{1/4}
\right].
\]

单位长度气体传热：

\[
q'_{gas}
=\frac{2\pi k_{eff}(T_h-T_c)}
{\ln(D_{cold}/D_{hot})}.
\]

保守方法域采用已有权威转录：

- `0.7<=Pr<=6000`；
- `100<=F_cyl Ra_s<=1e7`；
- `1.15<=D_cold/D_hot<=8`；
- `F_cyl Ra_s<100` 时回到静止气体导热 `k_eff=k_f`，不得让 Nu 给出比导热更小的热量。

该式没有长度项，意味着“端部可忽略”，不是任意短筒都适用。

## 4.4 路径 2：竖直封闭连续同心环隙

\[
K=\frac{r_o}{r_i},
\qquad
H=\frac{L_z}{s_{ann}},
\qquad
Nu_s=\frac{h_s s_{ann}}{k_f}.
\]

Thomas–de Vahl Davis 分区式：

\[
Nu_s=0.595Ra_s^{0.101}Pr^{0.024}H^{-0.052}K^{0.505}
\quad\text{导热区},
\]

\[
Nu_s=0.202Ra_s^{0.294}Pr^{0.09}H^{-0.246}K^{0.423}
\quad\text{过渡区},
\]

\[
Nu_s=0.286Ra_s^{0.258}Pr^{0.006}H^{-0.238}K^{0.442}
\quad\text{边界层区}.
\]

原始数值数据保守域：

- `Ra_s<=2e5`；
- `0.5<=Pr<=5`；
- `1<=K<=4`；
- `1<=H<=20`。

已报告的分区边界：

- `H>=5, Pr=1`：`Ra_s/H<400` 为导热区，`Ra_s/H>3000` 为边界层区；中间为过渡；
- `H=1`：`Ra_s/H<1000` 为导热区，`Ra_s/H>8000` 为边界层区。

`1<H<5` 不得自行插值分区。后续报告虽扩大到 `K<=10,H<=33`，v1 高置信域仍建议采用上面的原始交叉域；扩大域只作比较/验证。

## 4.5 路径 3：开口竖直烟囱

至少联立：

\[
\Delta p_{buoy}
=\int_0^{L_z}g_0
[\rho_{amb}(z)-\rho_{gap}(z)]dz,
\]

\[
\Delta p_{buoy}
=\Delta p_{friction}
+\Delta p_{inlet}
+\Delta p_{outlet}
+\Delta p_{other},
\]

以及质量和能量方程求诱导流量、轴向温度和壁面热流。当前证据没有开口尺寸、端部、阻力、环境连通性或温度分布，因此不给一个简化 Nu 默认。此路径可以冻结接口和失败语义，但物理模型保持 Deferred。

## 4.6 辐射始终独立并联

对两个完整、同心、漫灰、不透明圆筒：

\[
\dot Q_{rad}=
\frac{\sigma A_h(T_h^4-T_c^4)}
{\frac{1}{\varepsilon_h}
+\frac{A_h}{A_c}
\left(\frac{1}{\varepsilon_c}-1\right)}.
\]

\[
\dot Q_{gap}=\dot Q_{gas}+\dot Q_{rad}.
\]

离散螺旋线圈的视因数、透过匝间开口看环境的份额和冷表面积与完整外圆筒不同；应使用表面辐射网络、射线法、FEM 或实验。不得把辐射隐藏进一个无来源 `h_gap`。

## 4.7 `Nu=0.59Ra^(1/4)` 的最终处置

师傅版增加 `Ra -> Nu -> h` 的计算链是正确且有价值的；问题只在 `Nu=f(...)` 与当前未知几何不匹配。

`Nu=0.59Ra_H^(1/4)` 属于开放竖直外表面/平板型自然对流的传统分段幂律，特征长度是竖直高度，并不包含：

- 半径比；
- 环隙高宽比；
- 封闭端部；
- 开口烟囱净流量；
- 连续外壁或离散螺旋边界。

因此：

- 在 J-05 中状态为 **Not applicable / Insufficient evidence**；
- 在 J-02 中也不作为任意外表面默认，必须按真实外部板/圆筒、方向和有效域选方法；
- 不以修改常数或长度来贴合任何历史截图。

## 4.8 环隙必须由用户/图纸确认的输入

1. 轴线水平、竖直或倾斜；
2. 端部密封、部分开放或完全开放；
3. 外边界是连续套筒还是有节距螺旋线圈；
4. `D_wp,o,delta_ins,D_i,D_c,d_rad` 的核实尺寸与来源；
5. `s_ann` 和偏心 `e_ann`；
6. 有效轴向长度、端部几何和线圈填充/开口状态；
7. 热内表面和冷外表面的温度或求解方式；
8. 气体种类、压力和温度相关物性；
9. 两表面发射率、氧化和视因数；
10. 外部风、排风或其他强制流；
11. 是否有实测的水侧附加入热、表面温度和环境热平衡。

没有这些输入时，正确结果是 `insufficient_data`，不是选择“最常见姿态”。

---

## 5. 逐项冻结建议矩阵

### 5.1 冷却

| 项目 | 建议状态 | 可以冻结的内容 | 仍不得声称 |
|---|---|---|---|
| H-01 热负荷控制体 | **Approved** | 热源分项、来源、去重、显式裕量 | 未知外部入热为零 |
| H-02 流量 | **Approved with limitation** | 单相焓差；`cpbar Delta T` 简化 | 跨相态/混合液仍用纯水 |
| H-03 支路速度/Dh | **Approved** | 面积、润湿周长、速度、Re | 非同阻支路均分 |
| H-04 层流直圆管 | **Approved with limitation** | `Nu=3.656/4.364` 且边界明确 | 入口、弯曲、非圆仍准确 |
| H-04 Gnielinski | **Approved with limitation** | 光滑、直圆管、充分发展、严格 Re/Pr 域 | 实际螺旋/热点安全 |
| H-04 过渡流、螺旋、非圆 | **Deferred** | 保存几何和 method 接口 | 通过插值或 Dh 偷换 |
| H-05 Darcy/Colebrook | **Approved with limitation** | 直圆管和有来源粗糙度 | 老化管、螺旋、缺 K 的终值 |
| H-05 并联网 | **Approved with limitation** | 有完整拓扑/泵曲线时数值求解 | 缺数据仍报可实现流量 |
| H-06 局部相态原始裕量 | **Approved with limitation** | `Tsat(p)-Tb/Twi` | 无 OEM 裕量仍判“安全” |
| H-06 NPSH | **Approved with limitation** | `NPSHA` 与厂家 `NPSHR` 比较 | 通用百分比或缺曲线判定 |
| H-06 水质/结垢数值阈值 | **Insufficient evidence** | 定性门禁和 OEM 覆盖机制 | 通用 pH/硬度/电导率默认 |
| H-07 能量守恒 | **Approved** | 同控制体、同时段正反算和残差 | 用历史总量校准公式 |
| 最大铜壁温/寿命 | **Insufficient evidence** | 平均圆管 screening | 无局部热源/FEM/试验的热点与寿命 |
| 两相沸腾/CHF | **Deferred** | 识别并切断单相模型 | Gnielinski 外推 |

### 5.2 保温与热损

| 项目 | 建议状态 | 说明 |
|---|---|---|
| J-01 圆筒 Fourier 常 `k` | **Approved** | 基本解析式和单位无争议 |
| J-01 多层变 `k(T)` | **Approved with limitation** | 需批准数据域、积分和界面求解 |
| J-02 Churchill–Chu 竖直平面 | **Approved with limitation** | `Ra_L<=10^12`，无约束大环境；竖直圆筒曲率扩展未批准 |
| J-02 Churchill–Chu 水平圆柱 | **Approved with limitation** | `10^-5<=Ra_D<=10^12`，孤立长圆柱，端部/遮挡忽略 |
| J-02 Churchill–Bernstein 横掠圆柱 | **Approved with limitation** | `Re_D Pr>=0.2`，单圆柱均匀横掠；不是混合对流式 |
| J-02 其余姿态/混合/受限外流 | **Deferred** | 无批准 method 时 fail closed，不取任意最大值或幂和 |
| J-03 表面辐射 | **Approved with limitation** | 直接辐射式可冻结；复杂周围必须视因数/辐射网络 |
| I-01 表温目标 | **Approved with limitation** | 完整表面平衡、有限域扫描、圆整回算 |
| I-02 热损目标 | **Approved with limitation** | 明确 W/W·m⁻¹/W·m⁻²面积基准，扫描全部可行分支 |
| I-03 双目标 | **Approved with limitation after contract correction** | 通用解为可行域交集；单调时才退化为 `max` |
| I-04 临界半径 | **Approved with limitation** | 只作筛选；完整模型仍求 `Q(delta)` |
| 端部/支撑/穿透总热损 | **Insufficient evidence** | 无几何和模型时只能标 `sidewall_only` |
| GB/T 8175 存疑印刷式 | **Deferred / not recommended** | 澄清前继续独立 Fourier，不进入实现 |

### 5.3 环隙

| 路径 | 建议状态 |
|---|---|
| 水平封闭连续同心圆筒 | **Approved with limitation** |
| 竖直封闭连续同心环隙 | **Approved with limitation** |
| 竖直开口烟囱 | **Deferred；当前案例通常 Insufficient evidence** |
| 外表面无约束自由对流 | **J-05 not applicable；路由 J-02 后 Approved with limitation** |
| 轴向热流封闭环形腔 | **Deferred / Insufficient evidence** |
| 离散螺旋或显著偏心覆盖前两路径 | **Insufficient evidence；FEM/实验推荐** |

---

## 6. 最小试验/FEM闭合计划

## 6.1 冷却

### EXP-COOL-001 — 量热、压降、温度联合试验

最少仪器：

- 可追溯流量计；
- 进/出水温度配对传感器及不确定度；
- 进/出口和关键低压点绝对压力；
- 泵转速与厂家曲线；
- 同频端口有功或经验证的线圈损耗；
- 热点铜温测量；
- 水质和环境温度记录。

试验矩阵至少两个流量 × 两个功率；若几何可换，至少一个直管/大曲率比基线和一个实际螺旋线圈。输出：水侧焓升、压降、热点温升、模型残差和不确定度。不得用已暴露历史总量作验收目标。

### FEM-TH-COIL-001 — 局部热点重叠

输入实际铜截面、内水道、频率、电流、AC 损耗密度、外部辐射/对流热流和实测 `h/flow`；输出 `q'(z,theta)`、内/外壁温度与试验测点映射。FEM 用于验证局部源和 2D/3D 传热，不反写成无域通用系数。

## 6.2 保温

### EXP-THERM-001 — 双目标热平衡

对至少两种厚度，在稳态测：热侧温度、外表面多点温度、环境/辐射周围温度、输入净热功率；记录材料批次、密度、含湿、发射率和风速。用未参与拟合的一档厚度验证 `T_s` 和 `Qdot`，并检查端部/热桥占比。

### FEM-INS-001 — 端部和热桥

2D 轴对称或 3D 模型只用于量化 1D 侧壁模型遗漏的端部、支撑、法兰和穿透热桥；输出一个明确几何包络内的修正/不确定度，不生成普适“端损系数”。

## 6.3 环隙

### EXP-ANN-001 — 拓扑辨识

先以照片/图纸和实测确认姿态、封闭性、`s_ann/e_ann`、连续/离散外边界；再测热内表面、线圈/外边界温度、水侧附加吸热和环境温度。若实际是离散螺旋，至少改变一次匝距或径向间隙以区分“封闭环隙”与“开放环境捕获”。

### FEM-ANN-001 — 非理想环隙

仅对显著偏心、短腔、离散螺旋、开口烟囱或复杂辐射视因数启用 CFD/共轭传热。验证输出是总跨隙热量、局部温度和流动拓扑；不把单一 CFD 工况拟合成通用 Nu。

---

## 7. Gate 0：真正 blocking 与非 blocking

## 7.1 不应成为永久阻断的事项

以下事项只要在 v1 中明确返回 `Deferred/insufficient_data`，不应无限期阻止低风险模块冻结：

- 开口烟囱环隙没有简式；
- 轴向热流圆环腔未实现；
- 两相沸腾/CHF 未实现；
- 任意非圆/螺旋水道没有通用 Nu；
- 端部热桥没有通用系数。

Gate 0 的目标是冻结“做什么、怎么算、何时拒绝”，不是假装所有物理都有解析公式。

## 7.2 本专项当前的真正阻断

### G0-TC-1 — 正式合同尚未同步

本报告只在 `working/`。正式 H-04/H-05/J-05 仍写“无批准方法”，I-03 仍把双目标无条件写成取最大值。正式文档、来源注册、验证 IDs 和状态表未同步前，Gate 0 不能称通过。

### G0-TC-2 — 实际线圈高风险方法未闭合

若 v1 要把实际螺旋/非圆水道的 `h`、压降、最大铜温或“无沸腾”作为正常工程结果，则 EXP-COOL-001/FEM-TH-COIL-001 及预注册阈值是硬阻断。若 v1 只给直圆管 screening，并对实际几何返回不足，这一项可从“项目阻断”降为“功能排除”。

### G0-TC-3 — 数据包与方法依赖未批准

- IAPWS 后端版本和校核点尚未落入正式 A-02 数据包；
- 铜、空气、保温材料 `k(T)`、发射率、最高使用温度尚需首版批准数据；
- I-01/I-02 所依赖的外表面对流 `h_c` 仍需按姿态冻结方法或要求测量输入。

这些方法若要进入 v1 正常计算，就是 Gate 0 阻断；若相关结果排除，则必须明确。

### G0-TC-4 — 安全门槛不是公式默认

泵 `NPSH_R`、允许压力/水温、最小饱和裕量、铜/钎焊/软管温限和水质范围必须来自选定设备/OEM或项目批准。缺失时 H-06 可以计算原始裕量，但不能输出“安全”。这阻断安全签字，不阻断守恒计算器本身。

### G0-TC-5 — 验证和技术冻结签字未完成

公式回归点只能证明实现一致；高风险冷却/保温/环隙的独立试验/FEM仍未执行。`data/validation/`、协议、容差、签字和 freeze manifest 完成前，遵循用户决定 15：网站开发不启动。

## 7.3 本专项 Gate 0 判定

- **计算基础研究：** 冷却、双目标保温以及两类封闭环隙已经有可冻结的受限候选；“完全没有方程”的研究空白已缩小。
- **实际设备安全判断：** 仍被局部热源、实际流道、压力/泵曲线、OEM门槛、材料数据和试验阻断。
- **项目 Gate 0：** 当前仍为 `blocked`，原因是正式合同/数据/验证/签字未闭合，而不是必须继续寻找一条覆盖所有几何的万能 Nu 式。
- **开发授权：** `website_implementation_authorized=false`。

---

## 8. 可直接并入正式文档的建议措辞

### 8.1 冷却

> 冷却水计算采用显式控制体：进入水路的设计热负荷由 AC 铜损、被水冷组件实际吸收的外部热量、磁性材料及其他入水热量分项组成；工件有用热、无功功率和未进入该回路的环境损失不得加入。纯水流量优先由 IAPWS 焓差求取，`mdot=Qdot/[h_out-h_in]`，再与支路管网、Darcy 压降、泵曲线和局部温压场迭代。直圆管层流极限和 Gnielinski 湍流式只在各自边界和有效域内作为 v1 候选；螺旋曲率、非圆水道、周向 AC 热源峰值及两相沸腾需试验/FEM或专用相关式。应用不得用出口水温代替局部铜-水界面温度；只有在局部绝对压力、内壁温度、OEM 饱和裕量、泵 NPSH 和水质门槛均具备时，才可给冷却安全判定。历史冷却总量不参与本模型的输入默认、系数校准或验证。

### 8.2 保温

> 圆筒保温厚度采用温度相关 Fourier 径向导热与外表面对流、辐射的完整侧壁能量平衡。目标表面温度与目标热损分别形成约束，通用设计厚度取两约束可行区间及材料/制造可行区间交集中的最小值；只有证明两约束在设计分支上随厚度单调改善时，才可简化为两个根取最大值。商业厚度向上圆整后必须重算表面温度、总热损和界面温度。端部、支撑和穿透热桥单列；没有模型时结果标为 sidewall-only。GB/T 8175—2025 中当前存疑印刷式澄清前不进入实现，继续采用独立 Fourier 推导。

### 8.3 外表面对流

> J-02 不设跨几何通用 `h_c`。无约束竖直平面自然对流采用 Churchill–Chu 竖直平面式；无约束长水平圆柱采用 Churchill–Chu 水平圆柱式；已知均匀横掠风的单圆柱采用 Churchill–Bernstein 式。每条方法均绑定真实姿态、特征长度、膜温物性和有效域。竖直圆筒曲率、水平/倾斜平板、混合对流、阵列遮挡、有限端部和受限外流在没有专用方法时返回不足；不得用固定 `h`、`0.59Ra^(1/4)`、自然/强制结果取最大值或任意幂和来隐藏方法缺口。连续封闭环隙不属于 J-02，应路由 J-05。

### 8.4 环隙

> 匝间净距使用 `g_turn=p-d_ax`；保温外表面至线圈内包络的真实径向净隙使用 `s_ann=(D_i-D_ins,o)/2`，不得重名。环隙按水平封闭径向、竖直封闭径向、竖直开口烟囱、外表面无约束对流和封闭轴向热流腔五类路由。Raithby–Hollands 与 Thomas–de Vahl Davis 只分别用于连续、封闭且满足有效域的水平/竖直同心圆筒；开口、偏心、短腔和离散螺旋边界返回不足或转 FEM/实验。`Nu=0.59Ra^(1/4)` 属外表面自然对流传统式，不是通用环隙式。辐射按视因数/辐射电阻单独求取后与气体传热并联相加。

---

## 9. 来源与精确定位

### 9.1 水物性、管内换热和压降

1. IAPWS, **R7-97(2012), Revised Release on the IAPWS Industrial Formulation 1997**, official PDF and description: https://iapws.org/relguide/IF97-Rev.pdf. 参见公式分区、Region 4 饱和曲线及计算校核表；官方页面说明可求密度、比热、焓等热力性质。
2. IAPWS, **R12-08, Release on the IAPWS Formulation 2008 for the Viscosity of Ordinary Water Substance**, https://iapws.org/documents/release/viscosity.download. 参见 PDF pp. 2–8；官方范围和工业实现说明。
3. IAPWS, **R15-11, Release on the IAPWS Formulation 2011 for the Thermal Conductivity of Ordinary Water Substance**, https://iapws.org/documents/release/ThCond.download. 参见 PDF pp. 2–13，尤其有效域、工业式和校核值。
4. V. Gnielinski, **Neue Gleichungen für den Wärme- und den Stoffübergang in turbulent durchströmten Rohren und Kanälen**, Forschung im Ingenieurwesen 41(1), 1975, pp. 8–16, DOI: https://doi.org/10.1007/BF02559682.
5. Idaho National Laboratory, MOOSE Thermal Hydraulics, **ADWallHeatTransferCoefficientGnielinskiMaterial.C**, source lines 63–77：给出 `Pr/Re` 范围、`f=(1.82log10Re-1.64)^-2`、Nu 式及 `h=Nu k/Dh`; https://mooseframework.inl.gov/docs/doxygen/modules/ADWallHeatTransferCoefficientGnielinskiMaterial_8C_source.html.
6. NASA contractor report, NTRS document 19830022277, pipe-flow section 6.1.2.1：引用充分发展直圆管恒壁温 `Nu=3.656`; https://ntrs.nasa.gov/api/citations/19830022277/downloads/19830022277.pdf. 恒热流 `Nu=4.36` 的政府技术资料交叉核对见 IAEA course paper archived by OSTI, section 3.1.1: https://www.osti.gov/bridge/servlets/purl/836896-HyQF4x/native/836896.pdf.
7. C. F. Colebrook, **Turbulent Flow in Pipes, with Particular Reference to the Transition Region Between the Smooth and Rough Pipe Laws**, Journal of the Institution of Civil Engineers 11(4), 1939, pp. 133–156, DOI: https://doi.org/10.1680/ijoti.1939.13150.
8. L. Lin, N. Milesi-Ferretti, G. Glaeser, **Test Facility for Pressure Losses in Plumbing Pipes and Fittings**, NIST TN 2294, 2024, DOI: https://doi.org/10.6028/NIST.TN.2294. 参见 PDF pp. 27–30，特别是 p. 29 / report p. 23 Figure 18：内径 20.11 mm 直铜管、粗糙度估计 0.0015 mm、测量与 Colebrook 在约 ±3% 内一致。
9. U.S. DOE, **Improving Pumping System Performance: A Sourcebook for Industry, 2nd ed.**, pp. 38–41：泵/系统工作点与 NPSH；https://www1.eere.energy.gov/manufacturing/tech_assistance/pdfs/pump.pdf.
10. Hydraulic Institute, **ANSI/HI 9.6.1 Rotodynamic Pumps — Guideline for NPSH Margin**, current edition overview and 2024 update: https://www.pumps.org/product/ansi-hi-9-6-1-rotodynamic-pumps-guideline-for-npsh-margin/ and https://www.pumps.org/2025/03/18/understanding-the-2024-updates-to-ansi-hi-9-6-1-rotodynamic-pumps-guideline-for-npsh-margin/. 官方说明 `NPSHA` 为系统特性、`NPSHR` 为厂家泵特性，裕量按应用评估。
11. U.S. DOE, **DOE-HDBK-1012/3-92, Thermodynamics, Heat Transfer, and Fluid Flow, Vol. 3**, PDF pp. 69–73，尤其 pp. 69–70 对局部压力低于饱和压力、空化及 NPSH 的说明；https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1012-92_VOL3.pdf.

### 9.2 感应线圈 OEM/手册证据

12. ASM Handbook chapter, **Design and Fabrication of Inductors for Induction Heat Treating**, local file `references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf`, printed pp. 598–600 / PDF pp. 10–12：热源、非均匀铜温、强制水冷、案例相关式约 250 °C 界面有效性，以及去离子水/矿物沉积风险。该案例不提供通用安全温度。
13. Ambrell, **Water Cooling Systems**, official OEM page，clean closed loop、mineral deposits、overheating/corrosion/clogging: https://www.ambrell.com/products/cooling-systems.
14. Ambrell, **EKOHEAT 25/35/50 kW Systems**, official product data，水流、压力和温度按具体产品列出，并注明 workhead/coil flow varies by application: https://www.ambrell.com/products/ekoheat-50-25. 仅用于证明 OEM 限值是产品/应用特定，不移作项目默认。
15. Ambrell, **Preventive maintenance**, official knowledge base，水质、温度、固体和添加剂对冷却能力的影响，并要求参照设备手册: https://www.ambrell.com/knowledge/what-kind-of-predictive-maintenance-speaker-3-should-we-do-on-the-ambro-induction-machine.

### 9.3 圆筒保温

16. GB/T 8175—2025, **设备及管道绝热设计导则**, local file `references/external_sources/GBT+8175-2025.pdf`：PDF pp. 5–16；外表面换热候选见附录 A，当前疑式见审计记录。本项目仅采用其问题框架和经独立复核部分，不采用未澄清印刷式。
17. MIT, **Introduction to Engineering Heat Transfer**, project local reference used in `THERMAL_SYSTEM_LITERATURE_AUDIT.md`, PDF pp. 15–18 / 29–30：Fourier 定律、圆筒热阻、平壁近似和临界绝热半径。正式合并时应在 source manifest 补文件名、hash 和确切式号。

### 9.4 J-02 外表面对流

18. S. W. Churchill, H. H. S. Chu, **Correlating Equations for Laminar and Turbulent Free Convection From a Vertical Plate**, *International Journal of Heat and Mass Transfer* 18, 1975, pp. 1323–1329, DOI: https://doi.org/10.1016/0017-9310(75)90243-4. 原论文给出竖直平面一般式及其构造依据。
19. S. W. Churchill, H. H. S. Chu, **Correlating Equations for Laminar and Turbulent Free Convection From a Horizontal Cylinder**, *International Journal of Heat and Mass Transfer* 18, 1975, pp. 1049–1053, DOI: https://doi.org/10.1016/0017-9310(75)90222-7.
20. S. W. Churchill, M. Bernstein, **A Correlating Equation for Forced Convection From Gases and Liquids to a Circular Cylinder in Crossflow**, *Journal of Heat Transfer* 99(2), 1977, pp. 300–306, DOI: https://doi.org/10.1115/1.3450685. 原文摘要明确 `Re Pr<0.2` 的例外及自由来流湍流、端部、阻塞和自然对流的影响。
21. R. Hu et al., **Benchmark Simulation of the Natural Convection Shutdown Heat Removal Test**, U.S. DOE/Argonne, OSTI 1756317, PDF p. 8, eqs. (1)–(3): https://www.osti.gov/servlets/purl/1756317. 用于独立核对两条 Churchill–Chu 公式和 `Ra_X` 转录，不用其后续圆筒导热写法替代本报告的独立 Fourier 推导。

### 9.5 环隙

22. G. D. Raithby, K. G. T. Hollands, **A General Method of Obtaining Approximate Solutions to Laminar and Turbulent Free Convection Problems**, Advances in Heat Transfer 11, 1975, pp. 265–315, DOI: https://doi.org/10.1016/S0065-2717(08)70076-5.
23. T. H. Kuehn, R. J. Goldstein, **Correlating Equations for Natural Convection Heat Transfer Between Horizontal Circular Cylinders**, IJHMT 19(10), 1976, pp. 1127–1134, DOI: https://doi.org/10.1016/0017-9310(76)90145-9.
24. N. D. Francis, **CFD Calculation of Internal Natural Convection in the Annulus Between Horizontal Concentric Cylinders**, SAND2002-4119, U.S. DOE/Sandia, https://www.osti.gov/servlets/purl/805831. 参见报告 pp. 11–21，特别 pp. 18–21 对相关式、几何和实验尺度的汇总。
25. G. de Vahl Davis, R. W. Thomas, **Natural Convection Between Concentric Vertical Cylinders**, Physics of Fluids 12, 1969, pp. II-198–II-207, DOI: https://doi.org/10.1063/1.1692437.
26. R. W. Thomas, G. de Vahl Davis, **Natural Convection in Annular and Rectangular Cavities — A Numerical Study**, Fourth International Heat Transfer Conference, 1970, paper NC 2.4.
27. M. Keyhani et al., **Convective Heat Transfer Within Spent Fuel Canisters**, ONWI-229, U.S. DOE, https://www.osti.gov/servlets/purl/12184828. 参见 PDF pp. 24–28 / report pp. 13–17，对竖直封闭环隙边界、分区式和范围的可追踪转录。

---

## 10. 正式合并前的最短行动清单

1. 将本报告的 H-04/H-05/J-02/J-05 受限候选拆成唯一 `method_id`，并把曲率/非圆/过渡/混合对流/两相失败语义写入正式合同。
2. 修改 I-03：从无条件 `max(delta_T,delta_Q)` 改为可行域交集；在证明单调后允许快捷退化。
3. 在数据字典新增 `s_ann,e_ann,D_hot,D_cold`，保留 `g_turn`，禁止裸 `g/gap`。
4. 为 IAPWS、Gnielinski、Colebrook、Churchill–Chu、Churchill–Bernstein、Raithby–Hollands、Thomas–de Vahl Davis 登记版次、页码/式号、hash 和实现回归点。
5. 从 scientific validation 清单移除所有历史冷却总量；注册本报告第 2.11、3.10 和第 6 节的新验证 IDs。
6. 用户/图纸确认环隙五类路径所需几何；不确认就不选默认。
7. 获取实际水道截面、曲率、支路、泵曲线、绝对压力、水质/OEM门槛和局部热源；缺项保持 `insufficient_data`。
8. 执行最低冷却量热/压降/壁温和保温双目标试验；在模型冻结后保留新工况为独立验证。
9. 完成正式文档同步、独立 QA、技术冻结 ID 和签字后，才重新评估 Gate 0；在此之前保持 `src/`、`tests/` 和网站实现空置。
