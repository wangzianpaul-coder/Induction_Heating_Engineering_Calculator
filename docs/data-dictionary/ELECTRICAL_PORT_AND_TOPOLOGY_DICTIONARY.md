# Electrical Port and Topology Dictionary — v1

> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`

> 状态：Frozen architecture / formulas approved with stated limits，2026-08-14。

## 1. 相量和端口约定

- 正弦稳态使用 RMS 相量和 `Re{V exp(j omega t)}`。
- 电流正方向进入被动网络；`Z_L=j omega L`，`Z_C=1/(j omega C)`。
- 复功率 `S=V I*=P+jQ`；正 `P` 表示网络吸收有功。
- `fundamental_rms`、全波 RMS、峰值和 DC bus 量分字段。
- 每个端口记录 `port_id`、正/负端、坐标/接线图、quantity basis、加载状态和频率。

## 2. topology_id

### `series_rlc_single_loop`

`Z_in=R_s+j(omega L-1/(omega C))`

`omega_0=1/sqrt(LC)`

`Q_s=omega_0 L/R_s=1/(omega_0 C R_s)`

输出端口阻抗、RMS 电流、各元件电压和失谐量。`L/R_s` 必须属于同一加载状态和串联等效端口。

### `parallel_ideal_r_l_c_branches`

`Y_in=1/R_p+j(omega C-1/(omega L))`

`omega_0=1/sqrt(LC)`，谐振时 `Z_in=R_p`。

`R_p` 是独立并联电阻支路，不是线圈串联损耗。该拓扑只作明确电路的基础模型。

### `parallel_c_with_series_rl_load`

`Y_in=1/(R_s+j omega L)+j omega C`

`=R_s/[R_s^2+(omega L)^2]+j{omega C-omega L/[R_s^2+(omega L)^2]}`

端口 susceptance 为零时：

`omega_0^2=1/(LC)-(R_s/L)^2`

仅当右侧大于 0 才存在正频率。指定目标频率时：

`C=L/[R_s^2+(omega_0 L)^2]`

该点 `Z_in=L/(C R_s)`。电容 ESR、变压器和开关器件未计时只作线性基波估算。

### `ideal_transformer`

定义 `n=N_p/N_s=V_p/V_s=I_s/I_p`：

`Z_p=n^2 Z_s`，`V_p=n V_s`，`I_p=I_s/n`。

不含磁化、漏感、铜损、铁损、饱和、寄生、绝缘或整流系数。

### `llc_zjl_fig2_6_fundamental_equivalent`

项目来源图 2.6 的基波网络：

`Z_w=R_eq+j omega L_Req`

`Y_p=j omega C+1/Z_w`

`Z_p=1/Y_p`

`Z_in=j omega L_s+Z_p`

此 topology 的 `approval_status=deferred`；现有论文只登记为 `evidence_role=reference_only`，两个字段不得拼接。FHA、高 Q 简式和器件应力须完成专项验证后启用；不得把它称为通用 LLC。

## 3. 加载状态

`loaded_state = empty | workpiece_cold | workpiece_hot | measured_state | user_defined_state`

补偿电容和变比设计必须绑定 `design_state_id`。运行时负载变化只报告失谐，不自动重新设计 C 或 n。

## 4. 阻断规则

缺 `topology_id`、端口、RMS/基波、`R/L/C` 状态或变比方向时，电容、Q、端口应力和变比返回 `insufficient_data`。UI 不得根据文字“串联/并联/LLC”自动猜 netlist。
