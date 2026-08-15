# Codex Implementation Prompt — Induction Heating Engineering Calculator

你是接手本项目正式软件开发的 Codex 开发代理。你没有参与此前 ChatGPT Work 阶段，也不需要依赖任何历史聊天。所有实施依据都在本地项目目录：

`D:\Induction_Heating_Engineering_Calculator\`

当前技术冻结状态：

- `technical_freeze_id = IH-EC-V1-G0-2026-08-14-01`
- `Gate 0 = PASS`
- 当前 Prompt 是实施入口，不是新的公式来源；它不得覆盖受控计算依据、契约、字典、ADR 或验证规范。

你的任务是：从冻结的工程基线出发，开发一个专业、桌面优先、可维护、可测试、真正支持离线便携发布的 **Induction Heating Engineering Calculator** Web Application。

## 1. 开始开发前的强制动作

在创建框架、修改 `src/`、设计 UI 或实现任何计算公式前，完整阅读并理解以下文件。不要只读摘要或标题：

1. `CODEX_START_HERE.md`
2. `GATE_0_REVIEW.md`
3. `docs/decisions/V1_DECISION_REGISTER.md` 及其指向的 Accepted ADR
4. `HANDOFF_TO_CODEX.md`
5. `APPLICATION_ARCHITECTURE.md`
6. `CALCULATION_BASIS.md`
7. `CALCULATION_CONTRACTS.md`
8. `docs/data-dictionary/ENGINEERING_PARAMETER_DICTIONARY.md`
9. `docs/data-dictionary/ELECTRICAL_PORT_AND_TOPOLOGY_DICTIONARY.md`
10. `docs/METHOD_STATUS_DICTIONARY.md`
11. `data/materials/MATERIAL_DATA_MODEL.md`
12. `docs/data-dictionary/VALIDATION_AND_VISUALIZATION_DATA_DICTIONARY.md`
13. `validation/protocols/MINIMUM_VALIDATION_PLAN.md`
14. `FORMULA_SOURCE_REGISTER.md`
15. `docs/derivations/V1_CONTROLLED_DERIVATIONS.md`
16. `VALIDATION_CASES.md`
17. `PROJECT_AUDIT.md`
18. `README.md`
19. `SOURCE_MANIFEST.csv`

阅读完成后，先完成以下只读检查并记录结果：

- freeze ID、Gate 0 状态和 v1 method allowlist；
- 52 个 method ID 在 Basis、Contracts 和 Source Register 中是否一致；
- 参数、单位、几何、材料、状态、warning、端口和 topology 枚举；
- `SOURCE_MANIFEST.csv` 中受控来源的存在性和 hash；
- 当前 `approved`、`approved_with_limitation`、`deferred` 方法列表；
- feature/data release gates；
- 当前工作树已有内容，避免覆盖用户文件。

然后给出分阶段实施计划，从 Foundation 开始。不要以空 UI、首页或 3D 场景替代 calculation core 和测试。

如果同级受控文件真的冲突，停止受影响部分并明确报告冲突位置；不得静默选择、自行合并或猜测。只有冻结参数语义、公式、适用域、Recommended 规则或 failure status 真正变化时，才需要 ADR/spec revision 和回归复审；不要无理由重做 Gate 0。

## 2. Source of Truth 与禁止重新发明公式

权威顺序：

1. 用户正式决定和 Accepted ADR；
2. `CALCULATION_BASIS.md` 与 `CALCULATION_CONTRACTS.md`；
3. 冻结参数/材料/方法/状态/端口/topology 字典、受控推导和 `FORMULA_SOURCE_REGISTER.md`；
4. 批准的验证协议、案例、不可变数据和签字结果；
5. `APPLICATION_ARCHITECTURE.md` 与 `HANDOFF_TO_CODEX.md`；
6. `PROJECT_AUDIT.md`、`working/`、`archive/` 和历史资料。

严格遵守：

- 不得脱离冻结文件重新发明、简化、猜测、补齐或校准工程公式；
- 不得修改公式、常数、单位或 warning 以让测试、截图、旧软件或旧 Excel 数值通过；
- 不得把旧工作簿、旧 ChatGPT 输出、旧截图、旧原型或历史反推系数作为计算依据、默认值、调参目标、科学验证或黄金测试；
- 历史资料只能是 `audit_only`，不能进入 runtime、UI、MethodRegistry、MaterialRegistry、calibration、validation 或 Recommended 逻辑；
- 历史 783 kW / 135 L/min 及相关冷却结果永不进入产品输入、校准或验证；
- `deferred`、`insufficient_evidence`、`reference_only` 或缺少必要数据的方法不得返回普通工程数值；
- 无可靠结果时返回冻结状态，例如 `not_applicable`、`insufficient_data`、`non_converged`、`no_feasible_solution` 或 `invalid_input`，不得用 NaN、0、最后迭代值或隐藏默认值替代；
- 不得产生假精度。

仅实现 `approved` 和 `approved_with_limitation` allowlist。对后者必须同时实现适用域、warning、失败关闭和验证。G-09/LLC 当前保持 Deferred，不进入 v1 runtime registry。

`references/` 中同步/受控来源按项目规则只读；不要编辑、重命名、移动或删除。`working/` 和 `archive/` 不能覆盖正式规范。

## 3. 产品使命与 v1 边界

最终产品是专业的 **Induction Heating Engineering Calculator**，定位为 desktop-first 工程计算 Web Application，不是简单表格网页、消费级网页或展示 Demo。

v1 必须形成统一工程工作流，覆盖：

- shared material / temperature-dependent property service；
- coil geometry、inductance 和 method comparison；
- coil electrical parameters、Rdc/Rac 分级、loss 和 impedance；
- workpiece electromagnetic / penetration-depth calculations；
- coil-workpiece equivalent load 的批准估算与测量识别路径；
- heating energy、power balance、independent resonant topologies 和 transformer；
- cooling control volume、flow、Re/Nu/h、pressure loss 和状态/风险门禁；
- reusable thermal loss、annulus dispatch 和 dual-target insulation；
- warnings、applicability、Recommended method、calculation trace；
- Common Preset / Project / User Defined materials 和 Material Comparison；
- parameterized 3D engineering visualization；
- local case save/import/export 和 result export；
- future external FEM result visualization interface；
- 所有参数与计算方法的定义、解释、来源和适用范围。

v1 不是浏览器 FEM/CFD solver，不是通用 LLC solver，不承诺复杂开放/偏心环隙、两相冷却、任意几何耦合或实际设备安全认证。未获批能力失败关闭并清楚解释。

## 4. 技术方向与强制分层

除非在阅读最终架构后发现并记录更强理由，优先采用：

- TypeScript
- React
- Vite
- Three.js
- Vitest

可以增加必要且合理的测试、图表、状态管理或构建工具，但不要为了框架便利牺牲工程结构和 portable offline 要求。

强制分层：

```text
Calculation Core
Material / Property Layer
Numerical Solvers
Application Orchestration
Presentation Adapters
React UI / Charts / Three.js Viewer
```

要求：

- calculation core 是纯 TypeScript，可在不启动 React 的情况下测试；
- 公式实现按 method ID 隔离，并可追溯到 contract/source/validation IDs；
- canonical SI 只在 UI/import/export 边界转换；
- MaterialSnapshot、GeometrySnapshot、CaseSnapshot 和 ResultPackage 不可变且版本化；
- outer orchestration 拥有电磁—温度—功率、Rac—铜损—冷却温度和保温—表温—换热等迭代；模块之间不得隐藏递归；
- React component、3D viewer、chart、report 和 import adapter 不得包含真实工程公式或第二套参数定义；
- 3D 消费与计算相同的 GeometrySnapshot/hash；
- 每个 warning 和 status 使用稳定 ID，不用自由文本代替机器语义。

## 5. 两种正式构建产物

同一套源码必须同时支持：

### A. Portable Offline Build

用户获得发布文件夹后，在普通 Windows PC 上不安装 Node.js、npm、Python、数据库、开发环境或 Web Server，不使用命令行，不连接互联网，直接用 Chrome/Edge 打开入口 HTML 即可使用。

Portable build 必须专门针对 `file://` 设计和验证：

- 禁止 CDN JavaScript、CSS、字体、图标、shader、图片或模型；
- 禁止运行时从网络获取任何核心数据；
- 禁止依赖运行时 `fetch()` 本地 JSON；材料库、公式元数据、参数/单位字典、默认配置和帮助在构建期打包或嵌入；
- 所有资源路径相对、可移动，不依赖站点根路径或 localhost；
- 不依赖 service worker 或 secure-context-only API 才能运行核心功能；
- 处理 Chromium `file://` 下的 module/CORS 约束，必要时输出自包含或无需运行时模块加载的 portable bundle；
- 程序化生成 3D 几何，任何纹理/环境/字体随包提供；
- 案例导入基于文件选择/FileReader，导出基于下载/Blob；File System Access API 仅可作为增强；
- 入口、计算、材料、图表、3D、帮助、导入导出和打印全部离线可用。

### B. Standard Static Web Build

保留标准静态构建，可方便部署至 Cloudflare Pages、GitHub Pages、企业内部静态服务器和普通 HTTPS 网站。不得为 portable build 破坏正常源码模块化或标准部署；通过构建配置解决两种目标差异。

为两种构建分别建立可重复命令、产物目录、manifest、smoke test 和说明。

## 6. Portable Offline 的真实验收

最终发布前必须实际完成并记录：

1. 完全断网测试；
2. 把 portable 发布目录复制到另一台普通 Windows PC；
3. 目标电脑不安装 Node.js、Python、开发环境、数据库或 Web Server；
4. Chrome 和 Edge 分别直接打开入口文件；
5. 验证所有核心计算、材料数据/比较、参数/方法帮助、3D Viewer、图表、本地案例导入导出、结果导出和打印；
6. 检查资源、CORS、module、字体、shader、worker 和本地数据无阻断错误；
7. 关闭再打开并导入同一 JSON case，确认可复现；
8. 形成 `Portable Offline Acceptance` 记录，包含应用/模型/材料版本、浏览器和操作系统版本、测试机状态、结果和已知限制。

自动化 `file://` smoke test 是必要补充，但不能完全替代干净 Windows PC 人工验收。

## 7. 1080p 专业工程界面

目标环境：1920×1080、Windows、Chrome/Edge、100%–125% scaling。还要实际检查 1366×768 和 2560×1440，重点保证 1920×1080 最佳。

界面风格：Professional、Industrial、Engineering、Technical、Clean、Dense but readable、Modern but restrained。

不要使用卡通、过度圆角、大面积渐变、霓虹/游戏风、玻璃拟态、过度动画、巨型卡片、手机 App 大按钮或大量无意义留白。3D 可以美观，但主 UI 以工程效率和几何判断为先。

建立统一 typography/design token system。初始目标：

- 正文/主要输入约 14–16 px；
- 参数名称和单位约 13–14 px；
- 辅助信息保持正常可读；
- 一级标题克制；
- 结果突出但不夸张；
- 公式/上下标和中英文数字单位混排清晰。

推荐桌面布局：

- 左侧：模块、Project、Case、Calculation Sections、完成度、状态和 warning count；
- 中间：工程输入、方法/材料选择、主要结果和工作流；
- 右侧：可折叠/可调整的 3D Viewer、Geometry 或 selected-result visualization；
- 底部/切换区：Results、Method Comparison、Warnings、Calculation Trace、References / Method Basis。

支持 collapsible/resizable panels、sticky/persistent navigation、模块状态、输入完成度和 calculation status。3D Viewer 不能挤压正常计算空间。

## 8. 参数输入、定义与帮助

每个工程参数应展示或一键查看：

- 参数名称和 symbol；
- 当前值和 display unit；
- canonical SI；
- 工程定义；
- required/optional；
- 合法范围和方法适用范围；
- 默认值及其来源；
- material/data quality 和 provenance；
- tooltip/help；
- 消费该参数的方法。

例如不能只显示 “Coil Diameter”，必须明确是 `D_i`、`D_o`、`D_m` 或 `D_c`。参数定义页由 ParameterRegistry 生成，支持 A–L 分类、搜索、来源、公式消费者和 validation ID；页面组件不得维护第二份定义。

错误输入必须指出哪个参数、为什么错误、合理范围和哪些方法因此不可用。支持 Tab 导航、快速跳转、copy result、reset section、受保护的 reset case 和关键操作撤销/确认。普通数值输入避免大量 modal。

## 9. 结果、状态、方法比较与 Traceability

关键结果至少包含：

- Value / Unit；
- Method / Method Version；
- Recommended 状态及理由；
- Applicability；
- Data Quality / Material Source；
- Assumptions / omitted effects；
- Warnings；
- Calculation / Solver Status；
- uncertainty 或工程有效数字；
- input/material/case/model versions。

支持普通显示、scientific notation、显示单位切换和 comparison view。禁止假精度。

清楚区分 `valid result`、`warning`、`not_applicable`、`insufficient_data`、`non_converged`、`no_feasible_solution`、`invalid_input` 等状态；不能都显示成红色 Error，颜色也不能是唯一表达。

所有重要结果可展开追溯：

```text
Result
 -> Method and version
 -> Input snapshot
 -> Material properties and state
 -> Equation and substituted values
 -> Source/page/equation or controlled derivation
 -> Assumptions and applicability checks
 -> Warnings and solver residuals
```

Method Comparison 必须对同一不可变输入运行所有适用且批准的方法，显示差异和 Recommended；不适用/数据不足/被拒方法保留原因，不从 UI 静默消失。

## 10. 材料系统与 Material Comparison

正式支持：

1. Common Preset Materials
2. Project Materials
3. User Defined Materials

材料选择后显示本次实际采用的关键物性、状态、温度/频率/场强域、来源、质量等级、插值、外推和 uncertainty/warning。温变物性支持 property-vs-temperature 小图表。

Material Comparison 是正式功能：保持几何、频率、温度、目标和方法版本一致，并行替换候选材料，比较冻结规范允许的电磁、热量、保温和热损结果。缺关键物性返回 `insufficient_data` 或明确批准的降级估算；禁止静默借用其他材料常数或平均冲突来源。

不要为了让页面有内容而编造材料记录。具体 preset 数据必须经过 property-level 来源审查和版本发布门。

## 11. 参数化 3D 与未来 FEM 可视化

v1 3D 至少程序化显示：

- workpiece / furnace tube；
- insulation layers；
- insulation-coil air gap；
- hollow water-cooled helical copper coil；
- cooling passage、leads/busbars 和主要尺寸关系。

几何参数变化后，通过同一 GeometrySnapshot 实时更新。至少支持 rotate、zoom、pan、reset view、component visibility、transparency；条件允许时支持 cutaway/section 和适量 engineering labels/dimensions。

视觉专业、克制，不做游戏场景。允许显示 temperature、skin depth、cooling flow、heat-flow 和 electromagnetic effect；任何不是导入 FEM/CFD 结果的空间分布必须明确标记 **Schematic / Illustrative**，并与真实场图使用不同图例/水印。

预留版本化外部结果接口：ANSYS Maxwell、ANSYS Thermal、COMSOL。统一 FieldDataset/manifest 至少能表达 temperature、magnetic flux density、current density、volumetric heat generation、units、coordinate system、mesh、time steps、solver/version、materials、boundary conditions、convergence、energy evidence 和 source hash。v1 不实现完整 browser FEM solver。

## 12. 本地案例管理与交换

v1 无后端/账号，必须支持 New、Save、Load、Export、Import Case。localStorage/IndexedDB 可自动恢复，但不能是唯一保存方式。

可读 JSON case 至少保存：

- schema version；
- Application Version；
- Calculation Model Version；
- Material Database Version；
- technical freeze mapping；
- geometry、materials、operating conditions；
- topology/ports、method selections；
- user inputs、display units、explicit overrides；
- provenance、warnings acknowledgement、solver settings；
- case ID、timestamps 和 migration metadata。

另一位工程师在离线 portable build 中导入后，应能复现同一输入快照和模型版本。版本缺失或不兼容时执行显式 migration 或返回清晰状态，不静默替换材料、方法或默认值。

## 13. 结果导出

至少支持：

- Export JSON；
- Export CSV；
- print-friendly report；
- Browser Print / Save as PDF。

导出保留 inputs、outputs、methods/versions、materials/versions、units、warnings、assumptions、calculation status、trace 摘要、software/model/database versions。可以后续增加正式 Engineering Calculation Report，但基础导出必须纯前端、离线可用。

## 14. 可靠性、数值求解和错误处理

每个 solver 明确 convergence criteria、maximum iterations、termination status、residuals 和必要 trace。失败必须解释原因、触发条件和建议动作；不允许把 NaN、Infinity、0 或最后迭代值显示为普通结果。

warning/status 使用冻结字典和稳定 ID。blocking warning 阻止普通结果，非 blocking warning 与结果并列。安全结论只有在 OEM/project limits 和所需数据满足时才能发布。

## 15. 性能与基础可用性

- 普通解析/工程计算接近即时响应；
- 输入无明显卡顿；昂贵计算使用 Apply/Calculate、debounce、memoization、worker 或合理调度，不随每个按键完整重算；
- 3D 和大型图表更新不阻塞输入；
- FEM 数据显示使用独立性能预算、分块/降采样，不拖慢普通工作流；
- 在普通办公 Windows PC 上记录首屏、常用计算、3D 交互和内存表现。

同时考虑键盘 Tab、可见焦点、合理 hover/focus help、copy result、reset section、受保护的 reset case、关键操作撤销/确认、足够对比度和非颜色状态表达。

## 16. 软件、模型与材料版本

主界面、About/Help、case 和报告明确记录并显示：

- Application Version
- Calculation Model Version
- Material Database Version
- technical_freeze_id 或可追溯映射

三类版本独立管理。任何公式、适用域或 Recommended 变化升级 model version；材料记录变化升级 material database version；UI/功能变化升级 application version。保存/导入时执行兼容性检查。

## 17. 测试与验证要求

每个正式 calculation module 至少具备：

- isolated implementation；
- TypeScript types；
- contract/method/source mapping；
- unit tests；
- analytical limits 和 dimensional consistency tests；
- applicability/domain tests；
- invalid-input 和 failure-status tests；
- engineering trace tests；
- documentation。

Calculation Core 必须不启动 React 即可完整测试。测试数据遵守 `dataset_role`；历史资料永远 `audit_only`。不得使用旧 Excel/截图/旧软件输出作为黄金值。

按 `VALIDATION_CASES.md` 和 `MINIMUM_VALIDATION_PLAN.md` 实施解析、来源、合成、新测量和 FEM 对照。sealed holdout 只在模型和阈值冻结后由独立托管人取得；不得在看过目标后调参。若需校准，calibration 与 validation/holdout 数据严格隔离。

还要建立：

- schema/serialization round-trip tests；
- standard-build smoke tests；
- portable `file://` smoke tests；
- offline asset/network-denial tests；
- UI interaction/accessibility tests；
- 1920×1080、1366×768、2560×1440 visual/interaction checks；
- 3D GeometrySnapshot consistency tests；
- case version/migration/import/export tests；
- print/report tests。

## 18. 推荐实施路线

不要一次把所有模块堆进 UI。按受控里程碑推进，每阶段保持可测试、可回退、文档同步：

### Phase 0 — Freeze verification

- 完整阅读必读文件；
- 核对 freeze、allowlist、hash、schema 和 release gates；
- 输出实现矩阵：method ID -> code module -> contract -> source -> validation -> status；
- 只在真实冲突时报告 blocker。

### Phase 1 — Foundation

- TypeScript 项目、测试和双构建骨架；
- Quantity/canonical SI；
- Parameter/Method/Material registries；
- warning/status/result/trace schema；
- immutable snapshots、serialization 和 versioning；
- 不先做业务 UI。

### Phase 2 — Low-coupling calculation modules

- 按 allowlist 实现 A、B、C、D、E、I、J 中已批准且依赖较少的方法；
- 每个方法完成 contract、source、domain、warning、trace 和 tests 后才进入 registry。

### Phase 3 — System modules and orchestration

- F、G、H、K；
- 独立 Series/Parallel/Transformer topology；
- measurement override、功率/能量/流量守恒和外层迭代；
- G-09/LLC 保持 disabled/deferred。

### Phase 4 — Material data and comparison

- 三级材料 UI 与 snapshot；
- 只发布来源审查通过的数据；
- property curves、quality、comparison 和 missing-data behavior。

### Phase 5 — Desktop engineering UI

- 项目/案例、模块输入、参数定义、结果、warnings、trace、方法比较和报告；
- 先保证 1920×1080 工程效率，再兼容其他目标分辨率。

### Phase 6 — Parametric 3D and FEM interchange boundary

- 程序化几何与 GeometrySnapshot 同步；
- 交互、剖切/可见性和 schematic 标签；
- 外部 FEM manifest/FieldDataset adapter，不实现 browser FEM solver。

### Phase 7 — Dual build, integration and release

- Standard Static Web Build；
- Portable Offline Build；
- clean-PC/offline/file://、案例交换、打印、性能和三分辨率验收；
- release manifest、版本、用户/开发文档、示例案例和已知限制。

每个 Phase 完成时报告：实现范围、方法 ID、测试、失败关闭分支、文档变化、仍有的 feature/data gate 和下一阶段。不要将局部数据缺失扩大成无关模块的全局阻断。

## 19. 最终交付物

至少交付：

1. 完整可维护源码；
2. 自动化测试和测试报告；
3. Standard Static Web Build；
4. Portable Offline Build；
5. 用户使用说明；
6. developer / architecture documentation；
7. calculation model、material database 和 application version information；
8. 不以历史输出为真值的示例案例；
9. reproducible build instructions；
10. static deployment instructions；
11. clean Windows PC / offline / file:// acceptance record；
12. 已知限制、Deferred 功能和未来 measurement/FEM gates。

## 20. Definition of Done

一个 calculation method 只有在以下全部满足时才完成：

- 状态为 `approved` 或 `approved_with_limitation`；
- 代码与 method ID、contract、equation/source 和 SI 参数一一对应；
- domain、warnings、failure status 和 Recommended eligibility 已实现；
- trace、版本和 provenance 完整；
- 单元、量纲、极限、适用域、无效输入和验证案例通过；
- 域外不返回普通数值；
- UI/3D/report 没有重复计算逻辑。

整个 v1 只有在以下全部满足时才完成：

- approved allowlist 的计划范围完成且测试通过；
- 三级材料、方法比较、warnings、trace、本地案例、导出和版本系统可用；
- 1080p desktop-first 工程工作流通过，其他两种目标分辨率已检查；
- 3D 与 GeometrySnapshot 一致，schematic 与 FEM 结果清楚区分；
- Standard 和 Portable 两种构建可重复生成；
- Portable build 在无 Node.js、无开发环境、无互联网的普通 Windows PC 通过 Chrome/Edge `file://` 验收；
- 用户、开发、构建、部署和已知限制文档齐全；
- 没有历史截图/旧软件/旧工作簿依赖或验证污染；
- 用户完成工程验收。

## 21. 开始执行

现在先进入项目目录，完整阅读强制文件，核对冻结基线并给出分阶段计划。确认无真实规范冲突后，从 **Phase 1 — Foundation** 开始实现；不要先搭一个没有工程内核和测试的展示页面。

在整个开发过程中，遇到无法可靠计算的情况应失败关闭并说明原因。不要为了“页面完整”或“测试通过”发明工程结论。
