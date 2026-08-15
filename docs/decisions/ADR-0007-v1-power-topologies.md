# ADR-0007：v1 电源、谐振与匹配拓扑分离

- 状态：**Accepted**
- 日期：2026-08-14
- 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`
- 对应用户决定：12

## 决策

用户必须选择稳定 `topology_id` 和端口定义。v1 至少区分：

- `series_rlc_single_loop`；
- `parallel_ideal_r_l_c_branches`；
- `parallel_c_with_series_rl_load`；
- `ideal_transformer`；
- `llc_zjl_fig2_6_fundamental_equivalent`（高级、默认禁用，待专项验证）。

相量采用 RMS、`exp(j omega t)`，电流正方向进入被动端口。端口、线圈空载/带载状态、基波/全波、串联/并联等效必须显式。

Series RLC、两类 Parallel 基础网络和理想变压器代数进入 v1 限定实施范围。实际变压器的磁化、漏感、绕组损耗、铁损、饱和与寄生另建方法。LLC 不存在通用公式；只有与完整网表、变量和 FHA/高 Q 假设绑定的方法可启用。

拓扑未知时不输出唯一补偿电容、端口电压/电流、Q、器件应力或变比，返回 `insufficient_data`。
