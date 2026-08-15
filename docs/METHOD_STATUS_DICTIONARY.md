# Method and Result Status Dictionary — v1

> 状态：**Approved architecture，2026-08-14**。此文件冻结机器枚举，供计算依据、架构、案例交换和未来测试统一引用；不是网站实现。
> 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`

## 1. Method type

| 机器值 | 含义 |
|---|---|
| `analytical` | 从明确边界条件得到的解析/闭式模型 |
| `engineering_correlation` | 有实验/文献适用域的工程相关式 |
| `empirical_calibrated` | 由新的项目校准数据建立、经独立验证的有界经验模型；历史资料不得进入该模型 |
| `numerical` | 数值积分、求根、ODE或其他数值求解 |
| `measurement_identified` | 由端口或试验测量辨识的等效量 |
| `fem_or_experiment_reference` | FEM/试验验证或参考结果，不冒充通用解析式 |

## 2. Engineering approval status

| 机器值 | 含义 |
|---|---|
| `draft` | 已有规格草案，尚未处置 |
| `approved` | 计算契约和验证门禁已通过 |
| `approved_with_limitation` | 仅在记录的适用域内获批，域外失败关闭 |
| `deferred` | 当前版本明确暂缓，不进入普通方法注册 |
| `insufficient_evidence` | 证据不足，禁止输出普通数值 |
| `reference_only` | 只供历史/教学/比较 |
| `rejected` | 当前公式/实现不可使用 |
| `superseded` | 已被新规范取代，仅保留追溯 |

## 3. Specification and validation status

| 字段 | 机器值 |
|---|---|
| `specification_completeness` | `missing | partial | complete` |
| `validation_status` | `not_defined | specified | blocked | running | executed_pass | executed_fail | executed_unjudged | not_required` |
| `source_review_status` | `not_required | pending_release_cross_check | reviewed_pass | reviewed_fail` |
| `dataset_role` | `development | calibration | validation | sealed_holdout | external_validation | audit_only` |
| `lifecycle_status` | `active | deprecated | retired` |

这些字段不得与 `approval_status` 用斜杠拼成一个字符串。

## 4. Result provenance status

| 机器值 | 含义 |
|---|---|
| `predicted` | 由未使用该目标输出标定的正向模型计算 |
| `estimated` | 由明确受限的工程近似计算 |
| `identified_from_measurement` | 由同状态独立测量直接得到或辨识 |
| `project_calibrated` | 只在新项目校准数据和已登记校准域内成立 |
| `imported_fem_reference` | 从带完整 manifest 的外部 FEM/CFD 结果导入 |
| `identity_only` | 仅由同组输出恒等回代 |

验证是否通过只写入 `validation_status`；`planned`/未执行不生成数值 provenance。`insufficient_data` 是 `result_status`，`known_error` 只允许作为 `audit_only` 历史记录，二者均不是数值来源。

## 5. Scientific confidence

机器值统一为 `high | engineering_approximation | needs_verification | fem_or_experiment_recommended | rejected`。它只描述来源、量纲、边界和独立验证，不吸收成熟软件贴合程度。

## 6. Data quality

机器值统一为：

`approved_reference | engineering_reference | generic_typical | project_specific | user_defined | measured | fem_reference | unknown`

它描述材料、测量或外部参考数据质量，不与 `scientific_confidence` 合并。

旧 `black_box_reproduction_confidence` 和所有历史复现状态由 ADR-0002 退出产品 schema，只能在 archive/audit 中保留。运行时 `dataset_role` 不接收历史资料。

## 7. Warning severity

机器值统一为 `info | caution | warning | blocking | fatal`。`blocking/fatal` 时不生成普通数值结果；可返回诊断和所需输入。

## 8. 显示名称

中文/英文标签是机器值的本地化映射，不能另造枚举。例如 `approved_with_limitation` 可显示“限定批准 / Approved with limitation”，但保存案例永远写机器值。
