# Material Data Model — v1

> 状态：Architecture approved；具体牌号和数值仍逐数据集审批。
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`

## 1. 材料层级

- `preset_common`：受控常用材料预置库；
- `project_material`：项目标准、厂家或试验确认数据；
- `user_defined`：用户输入并保存的数据。

项目材料可显式覆盖预置属性，但必须形成新 material revision；不在原预置记录上静默改值。

## 2. 数据质量

`approved_reference | engineering_reference | generic_typical | project_specific | user_defined`

该字段描述数据来源/适用性，不替代方法的 `scientific_confidence`。`generic_typical` 结果必须显示“典型材料初估”，不可假装实际牌号。

材料记录发布状态统一为 `draft | reviewed | approved | rejected | superseded`。只有 `approved` 记录可作为发布版预置；其他状态只能用于数据整理或显式用户输入，不能静默成为默认。

## 3. material record

```text
material_id, revision, library_tier, data_quality
name, grade_or_product, standard, composition, condition, batch
category, manufacturer_optional, notes
property_records[]
source_records[], approval_status, approved_by, approved_at
```

每个 property record：

```text
property_id
value_kind: constant | table | approved_function
unit_si
independent_variables: T, f, H, B, phase, pressure, density, moisture, aging
data_points_or_equation
valid_range
interpolation_method
extrapolation_policy
uncertainty
source_id, document, edition, page_table_figure_equation, file_sha256
test_condition, surface_state
revision, approval_status
```

## 4. 最低属性集合

- 铜导体：`rho_e(T),k(T),cp(T),rho_m(T),thermal_expansion(T)`；
- 工件金属：`rho_e(T),k(T),cp(T),rho_m(T),mu_r(T,H,f)` 或 B-H/损耗数据、Curie/相变区；
- 保温：`k(T,density,moisture,aging),rho_m,cp,Tmax,shrinkage`，必要时表面发射率；
- 水：`rho(T,p),cp(T,p),mu(T,p),k(T,p),Tsat(p)`；
- 空气/气体：`rho,cp,mu,k,beta,alpha,Pr` 随膜温和压力；
- 表面：`emissivity(T,oxidation,coating,roughness)`。

## 5. 插值和外推

默认分段线性且只在数据包络内。跨 Curie、相变、状态或产品温限必须分段。外推默认 `forbid`；若数据负责人批准工程外推，返回外推距离和高等级 warning。不同来源冲突不静默平均。

## 6. Material Comparison

比较运行锁定同一几何、频率、热目标、边界、方法和 solver，仅替换 material snapshot。每个候选返回实际物性、缺失字段、数据质量、适用域、结果和 warning。缺关键属性的候选显示 `insufficient_data`，不借用其他材料数值。
