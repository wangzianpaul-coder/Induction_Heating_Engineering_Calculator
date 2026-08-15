# ADR-0008：v1 独立验证、密封留出与最小试验/FEM

- 状态：**Accepted**
- 日期：2026-08-14
- 技术冻结 ID：`IH-EC-V1-G0-2026-08-14-01`
- 对应用户决定：13、14

## 决策

验证数据角色统一为 `development | calibration | validation | sealed_holdout | external_validation | audit_only`，且目标可见性与角色分离。模型、特征、参数、方法版本、输入 schema、warning 和验收指标冻结后，方可取得 sealed holdout。

科学验证优先使用新取得的实测数据，或由实测锚定、边界/网格/材料完整且未参与调参的 FEM。历史聊天、截图、工作簿、旧输出和同一组派生恒等式不得充当校准或验证。

若冻结后另取成熟软件新工况，只能在离线评估环境登记为 `dataset_role=sealed_holdout`、`evidence_use=external_comparison_audit_only`：模型负责人不可见目标、只评分一次、不得反向调参；其结果不提升 `scientific_confidence`，也不进入产品 runtime、测试或 UI。`external_validation` 保留给独立第三方实测或经批准的外部 FEM/CFD 验证数据。

最小计划覆盖：

- 空线圈/带工件、频率和温度明确的复阻抗测量；
- `Rdc -> estimated Rac -> measured Rac`，含端口去嵌入和量热交叉检查；
- 逐支路流量、进出口温度/压力、运行状态、壁温和水侧能量平衡；
- 热源、保温表面、环境、线圈温度、厚度、空气隙及热流；
- 规则轴对称优先 2D EM FEM，复杂引线/非轴对称再用 3D；复杂环隙用 CFD/热流体试验。

校准数据与验证数据物理隔离。修改公式、特征、阈值或参数后，旧 holdout 对新版本立即变为 exposed。
