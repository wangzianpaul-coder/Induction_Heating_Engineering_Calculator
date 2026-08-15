# ADR-0002：v1 产品边界、单位裁决与历史证据隔离

- 状态：**Accepted**
- 日期：2026-08-14
- 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`
- 对应用户决定：1、2、6、13 的产品边界部分

## 决策

1. v1 是独立的感应加热工程计算器，不是验证其他软件对错或复现截图的软件。
2. 最终 Web UI、正常结果包、产品导出、方法推荐和科学置信中不得出现“截图复现、黑箱贴合、旧软件残差、历史系数复现”等字段或叙事。
3. 历史聊天、截图、工作簿、师傅批注和历史反推系数仅保存在 `references/`、`working/`、`archive/` 和 `PROJECT_AUDIT.md`，用途限定为 archive / audit / traceability。
4. 不为贴合任何历史输出修改公式、参数、物性、阈值或方法选择。历史数据不得作为 v1 计算输入、校准目标、科学验证目标或黄金数据。
5. 冻结后取得的新成熟软件工况可作为隔离的 sealed external comparison，一次性评估模型外部差异；不得用于调参、改式或建立经验系数，也不得进入最终 UI。
6. 内部一律使用 SI。原始文献若使用 mm、cm、inch、Ω·cm 等，来源注册表保留原式和原单位，方法边界显式换算为 SI。历史表格中某字段写成 mm 或 cm 不裁决新方法单位；单位由原始来源、量纲和受控推导决定。
7. 无法闭合时返回 `not_applicable`、`insufficient_data` 或 `non_converged`，不通过单位猜测、默认系数或结果反推填空。

## 后果

- 运行时结果仅保留 `scientific_confidence`、`data_quality`、`validation_status`、`applicability_status` 和 `result_provenance` 等工程字段。
- 旧 `black_box_reproduction_confidence` 只允许存在于历史档案 schema，不属于 v1 运行时 schema。
- `VALIDATION_CASES.md` 不再保存旧截图或 783 kW / 135 L/min 作为科学验证案例。
