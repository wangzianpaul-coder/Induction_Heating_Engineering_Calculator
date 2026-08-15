# ADR-0005：v1 三级材料体系与 Material Comparison

- 状态：**Accepted — Approved for v1 architecture**
- 日期：2026-08-14
- 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`
- 对应用户决定：8

## 决策

材料系统分为三层：

1. `preset_common`：版本化常用工程材料预置库；
2. `project_material`：厂家、标准、试验或项目确认数据，可覆盖预置记录；
3. `user_defined`：用户自行输入并保存，必须保留来源和质量标签。

材料数据质量独立记录为 `approved_reference | engineering_reference | generic_typical | project_specific | user_defined`。`generic_typical` 只用于初步估算和材料比较，不得与已确认项目材料显示相同置信度。

属性支持 `constant | table | approved_function`，按材料类型至少容纳 `rho_e(T)`、`mu_r(T,H,f)` 或 B-H/损耗数据、`k(T)`、`cp(T)`、`rho_m(T)`、Curie/相变区、发射率，以及保温材料的 `k(T,state)`、密度和最高使用温度。每条属性必须带来源、状态、有效域、插值、外推、版本、质量等级和不确定度。

缺失关键物性时返回 `insufficient_data`，或由用户明确选择有来源的工程近似；禁止静默借用其他材料常数。实际项目材料存在时优先于 generic/default。

`Material Comparison` 在同一几何、频率、目标温度、边界、方法版本和求解设置下只替换候选材料快照，比较相关结果和缺失数据状态。比较服务不得修改其他输入来“帮助”某材料。

具体首批牌号、产品型号和温变数据点不由本 ADR 固定，必须在独立材料数据审查后逐条批准；该内容是发布门禁，不阻止数据层和计算接口实施。
