# 同心/近同心圆筒空气隙自然对流专项核查

**文档属性：** 工作级研究记录，供正式计算依据审批时引用；不是已批准的默认方法。  
**研究日期：** 2026-08-13  
**结论级别：** 现况“不选默认”；水平封闭环隙有可实施候选，竖直封闭环隙有有限域候选，开口环隙须单独建模。

## 1. 执行结论

1. 师傅版 `Ra → Nu → h` 的**建模骨架正确且有价值**：

   \[
   Ra_{L_c}=\frac{g\beta |T_h-T_c|L_c^3}{\nu\alpha},\qquad
   Nu_{L_c}=f(Ra,Pr,几何,边界),\qquad
   h=\frac{Nu_{L_c}k_f}{L_c}.
   \]

   不能保留的是当前 `f` 的选取，而不是这三步结构。

2. 师傅版 `Nu=0.59Ra^(1/4)` **不可用于当前未定义的线圈-保温层环隙**。它是 McAdams 类“自由环境中竖直平板/外表面边界层”的分段幂律，典型有效域为 `10^4 < Ra_H < 10^9`，特征长度是竖直高度 `H`。封闭环隙则是内部循环，依赖半径比、高宽比、端部条件和壁面边界；开口竖直环隙又可能形成净质量流量的烟囱流。

3. 在尚未确认实物轴线姿态、端部封闭性、真实间隙和线圈是连续壁还是疏松绕组之前，**不应为计算器选定任何环隙自然对流默认式**。

4. 若确认为“轴线水平、足够长、封闭、同心、内热外冷、两壁近似等温”，Raithby-Hollands 的等效导热率关联式是第一候选。

5. 若确认为“轴线竖直、上下封闭、内热外冷、端板近似绝热”，Thomas-de Vahl Davis 分区关联式可作为受限候选；不得越过其 `Ra/Pr/K/H` 范围静默外推。

6. 若上下开口，不能把封闭环隙关联式当答案。需要入口/出口损失、热壁边界和诱导流量的开口烟囱模型，或 CFD/实验标定。

7. 辐射应与气体对流/导热**并联叠加热量**，不应把辐射隐藏进一个未标明的 `Nu`。对高温保温表面这是不可省略的边界。

## 2. 为什么不能共用一条 `Nu-Ra`

| 类别 | 重力相对几何 | 端部 | 主要热流/流动 | 必需几何比 | 本项目处置 |
|---|---|---|---|---|---|
| 水平轴同心圆筒 | 重力沿截面直径 | 通常端部封闭并忽略长度影响 | 截面内两个对称循环，径向净热流 | `Do/Di`、`gap/Di`；有限长度时加 `L/gap` | Raithby-Hollands 或 Kuehn-Goldstein 候选 |
| 竖直轴封闭环隙 | 重力平行轴线 | 上下封闭，端板绝热/导热条件很重要 | 热内壁上升、冷外壁下降，径向传热但流动主向轴向 | `K=ro/ri`、`H=L/gap` | Thomas-de Vahl Davis 分区候选 |
| 竖直轴开口环隙 | 重力平行轴线 | 上下与环境连通 | 存在净质量流量和烟囱压头，非封闭循环 | `L/Dh`、面积比、进出口损失、开口位置 | 必须单独建模；封闭式禁用 |
| 外表面自由对流 | 单壁面临大环境 | 无外壁封闭 | 外部边界层 | 竖直高度、外径或曲率条件 | `0.59Ra^1/4` 属此类，不是环隙式 |
| 轴向热流封闭圆环腔 | 热端盖/冷端盖 | 封闭 | 类 Rayleigh-Benard，热面在上/下定性相反 | 端面间距与半径比 | 不能套径向热流环隙式 |

现有线圈是有节距、有空隙的螺旋管，并非连续冷外圆筒。因此即使内外半径“近同心”，流体边界也可能更接近“部分开放绕组 + 环境捕获”，而非完整冷壁环隙。

## 3. 公共定义与 SI 实现

### 3.1 几何

- `ri` [m]：热内壁外半径（例如保温层外表面）。
- `ro` [m]：冷外壁内半径；只有在线圈可合理等效为连续外壁时才有这个量。
- `Di=2ri`, `Do=2ro` [m]。
- `s=ro-ri=(Do-Di)/2` [m]：径向间隙。
- `Lz` [m]：环隙的轴向有效高度/长度。
- `K=ro/ri=Do/Di` [-]：半径比。
- `A=Lz/s` [-]：竖直封闭环隙高宽比。
- `e/s` [-]：偏心率；实物不同心时不得默认为零。

### 3.2 流体和无量纲数

在第一版候选中，对小至中等温差以膜温 `Tf=(Th+Tc)/2` 评估 `k_f, rho, mu, cp, beta`：

\[
\nu=\frac{\mu}{\rho},\qquad
\alpha=\frac{k_f}{\rho c_p},\qquad
Pr=\frac{\nu}{\alpha},\qquad
Ra_s=\frac{g\beta|T_h-T_c|s^3}{\nu\alpha}.
\]

空气在理想气体近似下 `beta≈1/Tf` [K^-1]。当 `beta*|Th-Tc|` 不小、温差导致物性跨度显著，不应继续将 Boussinesq+单一膜温值当高置信度结果。

### 3.3 `Nu` 基准不得混用

有两种常见输出：

1. 以间隙为长度的对流换热系数：`Nu_s=h s/k_f`。
2. 把整个圆筒隙总热量写成圆筒导热形式的“等效导热率比”：`k_eff/k_f`。

两者的面积基准和特征长度不同，数值不能直接对比。任何软件实现都必须把 `Nu_basis` 写入方法元数据。

## 4. 候选 A：水平轴封闭同心圆筒（Raithby-Hollands）

### 4.1 边界条件

- 水平轴，同心圆筒；
- 内圆筒热、外圆筒冷，两圆筒表面近似等温；
- 封闭气体，长度足够大使二维截面模型可用；
- 宏观尺度连续介质，无外加强制流。

### 4.2 方程

\[
s=\frac{D_o-D_i}{2},
\]

\[
F_{cyl}=\frac{[\ln(D_o/D_i)]^4}
{s^3\left(D_i^{-3/5}+D_o^{-3/5}\right)^5},
\]

\[
Ra_s=\frac{g\beta(T_i-T_o)s^3}{\nu\alpha},
\]

\[
\frac{k_{eff}}{k_f}=
\max\left[1,
0.386\left(\frac{Pr}{0.861+Pr}\right)^{1/4}
\left(F_{cyl}Ra_s\right)^{1/4}
\right].
\]

单位长度热量为

\[
q'_{gas}=\frac{2\pi k_{eff}(T_i-T_o)}{\ln(D_o/D_i)}\quad [\mathrm{W/m}],
\]

有效长度 `Lz` 上

\[
Q_{gas}=q'_{gas}L_z.
\]

### 4.3 适用域与警告

- 常用权威手册转录范围：`0.7 <= Pr <= 6000`，`100 <= F_cyl Ra_s <= 10^7`，`1.15 <= Do/Di <= 8`，与原 Raithby-Hollands 工作的 `Ra < 8e7`、`0.125 < ri/ro < 0.87` 表述相容。
- `F_cyl Ra_s < 100` 时，以 `k_eff=k_f` 处理，即当作纯导热；不得接受幂律给出的 `k_eff/k_f<1`。
- 该关联式不含 `Lz/s`，这是“端部可忽略”的前提，不是说任意短圆筒都不受端部影响。
- 不用于竖直轴封闭腔、上下开口通道、明显偏心、外壁为离散线圈的未标定情形。

### 4.4 来源与信心

- 原始方法：G. D. Raithby & K. G. T. Hollands, *A General Method of Obtaining Approximate Solutions to Laminar and Turbulent Free Convection Problems*, Advances in Heat Transfer 11 (1975), 265-315, DOI `10.1016/S0065-2717(08)70076-5`。
- 独立横向验证：Kuehn & Goldstein 的水平圆筒理论/实验工作，DOI `10.1016/0017-9310(76)90145-9`。
- 权威应用核查：SAND2002-4119 以数值模型对 Kuehn-Goldstein 关联式/实验作对比，明确几何是水平封闭同心圆筒，并提醒原实验多为几厘米间隙。
- **工程信心：** 若几何和边界确实匹配，中-高；对现有离散线圈边界，低。

## 5. 候选 B：竖直轴封闭同心环隙（Thomas-de Vahl Davis）

### 5.1 边界条件

- 轴线竖直；
- 上下端闭合，原研究中水平端面为绝热；
- 内竖直壁等温热、外竖直壁等温冷；
- Boussinesq、层流、轴对称；
- `s=ro-ri`, `K=ro/ri`, `H=Lz/s`, `Nu_s=h s/k_f`。

### 5.2 分区方程

\[
Nu_s=0.595Ra_s^{0.101}Pr^{0.024}H^{-0.052}K^{0.505}
\quad\text{(导热区)},
\]

\[
Nu_s=0.202Ra_s^{0.294}Pr^{0.09}H^{-0.246}K^{0.423}
\quad\text{(过渡区)},
\]

\[
Nu_s=0.286Ra_s^{0.258}Pr^{0.006}H^{-0.238}K^{0.442}
\quad\text{(边界层区)}.
\]

分区判据在原汇总中为：

- `H >= 5, Pr=1`：`Ra_s/H < 400` 为导热区，`Ra_s/H > 3000` 为边界层区；中间为过渡区。
- `H=1`：`Ra_s/H < 1000` 为导热区，`Ra_s/H > 8000` 为边界层区。

初步代码不应对 `1<H<5` 自行发明分界插值；应先作方法比较/数值验证。

### 5.3 适用域

- 数值数据的原始范围：`Ra_s <= 2e5`, `0.5 <= Pr <= 5`, `1 <= K <= 4`, `1 <= H <= 20`。
- 后续 Thomas-de Vahl Davis 分区拟合的几何范围被报告为 `1 <= K <= 10`, `1 <= H <= 33`。由于相关工作的主数据仍有上述范围，本项目应取两者交叉作保守的高置信度域，越界显示警告。
- 它是封闭等温壁模型，不用于开口烟囱流，不用于线圈冷表面温度高度非均匀的未校准实物。
- 高 `Ra` 下会出现多胞流动和失稳；简单稳态幂律不提供局部热点保证。

### 5.4 来源与信心

- G. de Vahl Davis & R. W. Thomas, *Natural Convection Between Concentric Vertical Cylinders*, Physics of Fluids 12 (1969), II-198-II-207, DOI `10.1063/1.1692437`。
- R. W. Thomas & G. de Vahl Davis, *Natural Convection in Annular and Rectangular Cavities - A Numerical Study*, Fourth International Heat Transfer Conference (1970), paper NC 2.4。
- 公开政府报告 ONWI-229, *Convective Heat Transfer Within Spent Fuel Canisters* (1982), pp. 13-17，给出上述边界、分区式和有效域的可追溯转录。
- **工程信心：** 在所述封闭竖直环隙和有效域内中等；对本项目实物目前低，因几何未定。

## 6. 开口竖直环隙：为什么本阶段不给简式

上下开口时，热端产生浮升压头并在通道中建立净流量。需要至少同时求：

\[
\Delta p_{buoy}
=\int_0^{L_z}g[\rho_{ambient}(z)-\rho_{gap}(z)]\,dz,
\]

\[
\Delta p_{buoy}=\Delta p_{friction}+\Delta p_{inlet}+\Delta p_{outlet}+其他局部损失,
\]

再由质量、动量和能量方程得出诱导流量与局部壁温。这与封闭腔中“入口质量流量=0”的循环本质不同。

现有项目证据没有进/出口面积、端部结构、流道阻力、环境连通性或温度分布，因此此时选一条“开口环隙 Nu 式”会造成假确定性。实施前应以实验热平衡或 CFD 标定。

## 7. 师傅版实例的数值诊断

重点工作簿的环隙链为：

- `s=10 mm` （但原输入 `B30` 标成 `10 cm`，单位尚待确认）；
- `Ra_s=1483.90`，用常数空气物性；
- `Nu=0.59Ra^0.25=3.66187`；
- `h=Nu*k/s=10.2532 W/(m2 K)`。

这一数值不是“计算错”，而是**把不匹配的几何关联式代入得到的算术正确数值**。

仅作敏感性演示，若临时把它理想化为水平封闭同心圆筒，并取现表的 `Di=0.1911274 m`, `Do=0.2111274 m`, `Pr=1.8e-5/2.6e-5=0.6923`，则：

\[
F_{cyl}Ra_s\approx36.8<100,
\]

因而 Raithby-Hollands 候选会返回 `k_eff/k=1`，即近似纯导热。以内圆筒面积为基准的精确圆筒等效系数是

\[
h_i=\frac{2k}{D_i\ln(D_o/D_i)}\approx2.95\ \mathrm{W/(m^2K)},
\]

以外圆筒面积为基准则约 `2.67 W/(m2 K)`；只在薄隙平板近似下才可简写为 `k/s≈2.8 W/(m2 K)`。这些都明显低于工作簿的 `10.25 W/(m2 K)`。注意此演示所用 `Pr=0.6923` 还比常用转录有效域下限 `0.7` 低约 1.1%，也证明它只是数量级诊断，不是可批准的新案例。

若临时理想化为长 `1.323 m`、竖直封闭环隙，则 `H=132.3`, 已超过 Thomas-de Vahl Davis 拟合的 `H<=33` 范围，仍不能得出可批准结果。

因此，当前工作簿的 `10.2532 W/(m2 K)` 只能保留为 **legacy mentor black-box/reference-only**，不能作物理计算验证值。更不能把上述约 `2.7-3.0 W/(m2 K)` 当新结论，因为水平封闭几何也未经用户确认。

## 8. 辐射、端部与离散线圈

### 8.1 两个完整同心灰体圆筒的辐射候选

若两壁均为连续、漫灰、不透明表面，内表面完全看见外表面，可写：

\[
Q_{rad}=\frac{\sigma A_i(T_i^4-T_o^4)}
{\frac{1}{\varepsilon_i}+\frac{A_i}{A_o}\left(\frac{1}{\varepsilon_o}-1\right)}.
\]

总跨隙热量：

\[
Q_{gap}=Q_{gas}+Q_{rad}.
\]

若外边界是管式螺旋线圈，`Ao`、视因数和透过绕组间隙看见环境的份额都不等于完整外圆筒。此时应用表面网络/视因数法，或 Monte Carlo ray tracing/FEM。

### 8.2 端部和热桥

同心环隙关联式主要给径向侧壁热量。炉管端部、支撑、管路引出、保温接缝、线圈端部泄漏不在其内。有限长度或 `Lz/s` 小时，这些热量不得用“侧壁面积×h”隐藏处理。

## 9. 实施前必须向用户/师傅确认的输入

1. 炉管/线圈轴线是水平、竖直还是倾斜？倾角多少？
2. 环隙上下/左右端是密封、半开放还是完全与环境连通？
3. 外冷边界是连续套筒，还是当前的有节距螺旋铜管？节距、填充率和开口面积是多少？
4. 真实径向间隙是 `10 mm` 还是工作簿标注的 `10 cm`？
5. `ri`, `ro`, `Lz`，以及轴线偏心量 `e`是多少？
6. 保温外表面温度是给定、计算还是测量值？轴向/周向均匀性如何？
7. 线圈铜外表面温度的设计/测量值是多少？不得用冷却水出口温度无条件替代。
8. 环隙中是空气、保护气、负压还是其他介质？压力是多少？
9. 两表面材料、氧化/表面状态及发射率？
10. 周围是否有风扇、排风、线圈水路泄露的强制流或设备振动？
11. 端部、支撑、导线和保温缝的几何？
12. 是否有多工况测得的铜温、进/出水温、流量和功率，可用于等效环隙模型标定？

## 10. 验证点与警告规则

### 10.1 极限验证

- `Th -> Tc`：`Qgas -> 0`, `Qrad -> 0`。
- 水平封闭关联式在 `F_cyl Ra_s < 100`：`k_eff/k=1`。
- 任何封闭环隙法若返回比静止气体导热还小的等效传热，应拒绝结果或回到导热极限。
- `epsilon_i` 或 `epsilon_o -> 0`：`Qrad -> 0`。
- 开口状态不得调用封闭模型而不报错。

### 10.2 范围警告

- 姿态、封闭性或特征长度未定义：“不可计算”而不是返回默认 `h`。
- 半径比、高宽比、`Ra/Pr` 越界：显示外推幅度，结果降级为“需验证”。
- `beta*DeltaT > 0.1` 可作属性变化/Boussinesq 适用性复核的早期警告，不把这一单值当普适分界。
- 线圈填充率显著小于 1、偏心、多层保温接缝、端部开口、有强制通风：推荐 CFD/实验。
- 对流+辐射总热量与冷却水实测吸热不闭合：不得通过修改无来源常数强行贴合；应拆分视因数、环境泄漏、端损和铜壁-水侧热阻。

## 11. 来源清单（仅列本专项实际使用）

### 原始论文/原始方法

1. Raithby, G. D.; Hollands, K. G. T. (1975). *A General Method of Obtaining Approximate Solutions to Laminar and Turbulent Free Convection Problems*. Advances in Heat Transfer, 11, 265-315. DOI: https://doi.org/10.1016/S0065-2717(08)70076-5.
2. Kuehn, T. H.; Goldstein, R. J. (1976). *Correlating Equations for Natural Convection Heat Transfer Between Horizontal Circular Cylinders*. International Journal of Heat and Mass Transfer, 19(10), 1127-1134. DOI: https://doi.org/10.1016/0017-9310(76)90145-9.
3. de Vahl Davis, G.; Thomas, R. W. (1969). *Natural Convection Between Concentric Vertical Cylinders*. Physics of Fluids, 12, II-198-II-207. DOI: https://doi.org/10.1063/1.1692437.
4. Thomas, R. W.; de Vahl Davis, G. (1970). *Natural Convection in Annular and Rectangular Cavities - A Numerical Study*. Fourth International Heat Transfer Conference, NC 2.4.
5. Nagendra, H. R.; Tirunarayanan, M. A.; Ramachandran, A. (1970). *Free Convection Heat Transfer in Vertical Annuli*. Chemical Engineering Science, 25(4), 605-610. DOI: https://doi.org/10.1016/0009-2509(70)85092-8.
6. Sparrow, E. M.; Charmchi, M. (1983). *Natural Convection Experiments in an Enclosure Between Eccentric or Concentric Vertical Cylinders of Different Height and Diameter*. International Journal of Heat and Mass Transfer, 26(1), 133-143. DOI: https://doi.org/10.1016/S0017-9310(83)80015-5.
7. Churchill, S. W.; Chu, H. H. S. (1975). *Correlating Equations for Laminar and Turbulent Free Convection From a Vertical Plate*. International Journal of Heat and Mass Transfer, 18, 1323-1329. DOI: https://doi.org/10.1016/0017-9310(75)90243-4.

### 权威报告/手册级交叉核对

8. Francis, N. D. (2002). *CFD Calculation of Internal Natural Convection in the Annulus Between Horizontal Concentric Cylinders*, SAND2002-4119. U.S. DOE/Sandia. https://www.osti.gov/servlets/purl/805831. 参见 pp. 11-21，特别是 pp. 18-21 对 Kuehn-Goldstein 关联式的条件与式 (14)-(22) 的汇总。
9. Keyhani, M. et al. (1982). *Convective Heat Transfer Within Spent Fuel Canisters*, ONWI-229, U.S. DOE. https://www.osti.gov/servlets/purl/12184828. 参见 PDF pp. 24-28（报告页 13-17）对竖直环隙边界、分区式和范围的汇总。
10. NIST GCR 18-016, *Best Practice Guidelines for Structural Fire Resistance Design of Concrete and Steel Buildings* 的自然对流部分仅用于交叉确认外部垂直面/圆筒关联式的几何语义，不用于选环隙默认。 https://doi.org/10.6028/NIST.GCR.18-016.

## 12. 可直接写入正式文档的措辞

> 师傅版新增的 `Ra→Nu→h` 链保留为正确的建模骨架，但 `Nu=0.59Ra^(1/4)` 是开放垂直外表面的 McAdams 类关联式，不是封闭或开口同心环隙的通用关联式。本项目尚未确认设备轴线姿态、端部封闭性、外边界是连续套筒还是离散螺旋线圈，且真实间隙在 10 mm/10 cm 间存在单位冲突，因此本阶段不选环隙自然对流默认式。若后续确认为水平轴、封闭、足够长、同心且两壁近似等温，优先验证 Raithby-Hollands 等效导热率模型；若确认为竖直轴且上下封闭，在其 `Ra/Pr/K/H` 域内比较 Thomas-de Vahl Davis 分区关联式；若上下开口，必须改用含烟囱压头和进出口损失的流动-能量联立模型，或 CFD/实验标定。高温下辐射热量应单独按视因数/辐射电阻求取，再与气体导热-对流并联相加。
