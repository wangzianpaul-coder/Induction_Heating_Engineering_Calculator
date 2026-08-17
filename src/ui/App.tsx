import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { CalculatorPage } from "./Calculator.js";
import { BasicCalculatorPage } from "./BasicCalculator.js";
import { ThreeDVisualizationPage } from "./ThreeDVisualization.js";
import {
  UiLanguageProvider,
  capabilityLabel,
  capabilityReason,
  caseFieldLabel,
  fieldLabel,
  limitationText,
  methodApplicabilityScope,
  methodDisplayName,
  methodPurpose,
  methodSourceSummary,
  moduleLabel,
  parameterApplicabilityText,
  parameterDefinitionText,
  parameterDimensionLabel,
  parameterHelpText,
  parameterRoleLabel,
  publicFacingText,
  uiText,
  useUiLanguage,
  type UiLanguage,
} from "./i18n.js";

import type {
  EngineeringUiApplication,
  UiCaseInspection,
  UiMvpRunnableMethodDefinition,
  UiParameterRecord,
  UiReferenceModel,
} from "./ui-model.js";

type PageId = "basic" | "calculator" | "visualization" | "parameters" | "methods" | "case" | "about";

interface PageDefinition {
  readonly id: PageId;
  readonly label: Readonly<{ readonly zh: string; readonly en: string }>;
  readonly shortLabel: string;
  readonly description: Readonly<{ readonly zh: string; readonly en: string }>;
}

const PRIMARY_PAGES: readonly PageDefinition[] = [
  {
    id: "basic",
    label: { zh: "基础计算器", en: "Basic Calculator" },
    shortLabel: "◎",
    description: { zh: "单方案快速计算线圈、电感与电气量", en: "Guided coil, inductance, and electrical calculation" },
  },
  {
    id: "calculator",
    label: { zh: "高级计算", en: "Advanced Calculator" },
    shortLabel: "Σ",
    description: { zh: "创建、计算、保存并重新打开方案", en: "Create, calculate, save, and reopen cases" },
  },
  {
    id: "visualization",
    label: { zh: "3D 示意 / FEM", en: "3D Schematic / FEM" },
    shortLabel: "3D",
    description: { zh: "交互查看机械几何与外部分析边界", en: "Inspect mechanical geometry and external-analysis boundaries" },
  },
  {
    id: "parameters",
    label: { zh: "参数定义", en: "Parameters" },
    shortLabel: "P",
    description: { zh: "受控定义与单位", en: "Controlled definitions and units" },
  },
  {
    id: "methods",
    label: { zh: "计算功能说明", en: "Calculation Guide" },
    shortLabel: "M",
    description: { zh: "查看当前可用计算及适用范围", en: "Review available calculations and their scope" },
  },
  {
    id: "case",
    label: { zh: "方案文件", en: "Case Files" },
    shortLabel: "C",
    description: { zh: "验证并检查已保存的方案", en: "Validate and inspect a saved case" },
  },
  {
    id: "about",
    label: { zh: "关于 / 版本", en: "About / Versions" },
    shortLabel: "V",
    description: { zh: "软件版本与可用功能", en: "Software version and available features" },
  },
] as const;

interface AppProps {
  readonly application: EngineeringUiApplication;
  readonly initialLanguage?: UiLanguage;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function includesSearch(values: readonly string[], search: string): boolean {
  if (search.length === 0) {
    return true;
  }
  return values.some((value) => value.toLocaleLowerCase("en-US").includes(search));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function StatusPill({ enabled, children }: { readonly enabled: boolean; readonly children: ReactNode }) {
  return (
    <span className={enabled ? "status-pill status-pill--ready" : "status-pill status-pill--gated"}>
      <span aria-hidden="true" className="status-pill__mark">
        {enabled ? "✓" : "—"}
      </span>
      {children}
    </span>
  );
}

function DefinitionList({ children }: { readonly children: ReactNode }) {
  return <dl className="definition-list">{children}</dl>;
}

function DefinitionItem({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div className="definition-list__item">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function EmptyState({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="empty-state" role="status">
      <span aria-hidden="true" className="empty-state__glyph">
        i
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, titleId, children, actions }: {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleId: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        <p className="page-header__description">{children}</p>
      </div>
      {actions === undefined ? null : <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

function SummaryCard({ label, value, note }: {
  readonly label: string;
  readonly value: string | number;
  readonly note: string;
}) {
  return (
    <div className="summary-card">
      <span className="summary-card__label">{label}</span>
      <strong className="summary-card__value">{value}</strong>
      <span className="summary-card__note">{note}</span>
    </div>
  );
}

function ParameterDetail({ parameter }: { readonly parameter: UiParameterRecord | undefined }) {
  const { language, text } = useUiLanguage();
  if (parameter === undefined) {
    return (
      <aside className="detail-panel" aria-label={text("参数详情", "Parameter details")}>
        <EmptyState title={text("尚未选择参数", "No parameter selected")}>
          {text("请选择一行以查看中文定义、单位、适用范围和填写建议。", "Select a row to inspect its definition, units, applicability, and input guidance.")}
        </EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="parameter-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">{text("参数详情", "Parameter detail")}</p>
          <h2 id="parameter-detail-title">{language === "zh-CN" ? parameter.localizedName : parameter.name}</h2>
        </div>
        <span className="module-badge">{moduleLabel(parameter.module, language)}</span>
      </div>
      <p className="detail-panel__name">
        <span className="parameter-symbol">{parameter.symbol}</span>
        {language === "zh-CN" ? parameter.localizedName : parameter.name}
      </p>
      {language === "en" ? <p className="localized-name" lang="zh-Hans">{parameter.localizedName}</p> : null}
      <DefinitionList>
        <DefinitionItem term={text("定义", "Definition")}>{parameterDefinitionText(language === "zh-CN" ? parameter.localizedName : parameter.name, language)}</DefinitionItem>
        <DefinitionItem term={text("适用范围", "Applicability")}>{parameterApplicabilityText(language === "zh-CN" ? parameter.localizedName : parameter.name, language)}</DefinitionItem>
        <DefinitionItem term={text("数值要求", "Value requirements")}>{language === "zh-CN" ? "必须是有限、物理上合理并与当前工况一致的数值；具体上下限由所选计算功能检查。" : publicFacingText(parameter.physicalRange, language)}</DefinitionItem>
        <DefinitionItem term={text("物理类型", "Dimension")}>{parameterDimensionLabel(parameter.dimension, language)}</DefinitionItem>
        <DefinitionItem term={text("计算单位", "Calculation unit")}><code>{parameter.canonicalUnit}</code></DefinitionItem>
        <DefinitionItem term={text("显示单位", "Display units")}>
          {parameter.displayUnits.length === 0 ? text("无其他显示单位", "No additional display units") : parameter.displayUnits.map((unit) => unit.replace(/\s*\[[^\]]+\]$/u, "")).join(", ")}
        </DefinitionItem>
        <DefinitionItem term={text("用途 / 是否必需", "Role / requirement")}>{parameterRoleLabel(parameter.role, parameter.requirement, language)}</DefinitionItem>
        <DefinitionItem term={text("默认值", "Default value")}>{text("不自动猜测；由用户按当前设备和工况提供。", "No value is guessed; provide it for the current equipment and operating condition.")}</DefinitionItem>
      </DefinitionList>
      <div className="detail-note">
        <strong>{text("填写建议", "How to provide it")}</strong>
        <p>{parameterHelpText(language === "zh-CN" ? parameter.localizedName : parameter.name, language)}</p>
      </div>
    </aside>
  );
}

function ParametersPage({ model }: { readonly model: UiReferenceModel }) {
  const { language, text } = useUiLanguage();
  const searchId = useId();
  const moduleId = useId();
  const requirementId = useId();
  const [searchText, setSearchText] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [requirementFilter, setRequirementFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(model.parameters[0]?.id ?? null);
  const deferredSearch = useDeferredValue(searchText);
  const modules = useMemo(
    () => uniqueSorted(model.parameters.map((parameter) => parameter.module)),
    [model.parameters],
  );
  const requirements = useMemo(
    () => uniqueSorted(model.parameters.map((parameter) => parameter.requirement)),
    [model.parameters],
  );
  const filtered = useMemo(() => {
    const search = normalizeSearch(deferredSearch);
    return model.parameters.filter((parameter) =>
      (moduleFilter === "all" || parameter.module === moduleFilter) &&
      (requirementFilter === "all" || parameter.requirement === requirementFilter) &&
      includesSearch(
        [
          parameter.id,
          parameter.symbol,
          parameter.name,
          parameter.localizedName,
          parameter.definition,
          parameter.canonicalUnit,
          ...parameter.consumingMethods,
        ],
        search,
      ),
    );
  }, [deferredSearch, model.parameters, moduleFilter, requirementFilter]);
  const selected = filtered.find((parameter) => parameter.id === selectedId);

  return (
    <section className="page" aria-labelledby="parameters-title">
      <PageHeader eyebrow={text("工程参数词典", "Engineering parameter guide")} title={text("参数定义", "Parameter Definition")} titleId="parameters-title">
        {text("查询参数的中文含义、单位、填写原则和适用范围。实际数值请在“工程计算器”中填写。", "Review parameter meanings, units, input guidance, and applicability. Enter values in the Calculator.")}
      </PageHeader>
      <div className="scope-banner" role="note">
        <strong>{text("只读说明", "Read-only guide")}</strong>
        <span>{text("此处不接收输入值，也不会生成工程计算结果。", "No input values are accepted here, and no engineering result is calculated.")}</span>
      </div>
      <div className="summary-grid summary-grid--three" aria-label={text("参数摘要", "Parameter summary")}>
        <SummaryCard label={text("参数数量", "Parameters")} value={model.parameters.length} note={text("工程参数说明", "Engineering parameter guide")} />
        <SummaryCard label={text("功能类别", "Categories")} value={modules.length} note={text("按工程用途分类", "Grouped by engineering purpose")} />
        <SummaryCard label={text("当前类别", "Selected category")} value={moduleFilter === "all" ? text("全部", "All") : moduleLabel(moduleFilter, language)} note={text(`${filtered.length.toString()} 条可见记录`, `${filtered.length.toString()} visible records`)} />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label={text("参数说明列表", "Parameter guide")}>
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>{text("搜索参数", "Search parameters")}</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder={text("名称、符号或单位…", "Name, symbol, or unit…")}
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>{text("功能类别", "Category")}</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">{text("全部模块", "All modules")}</option>
                {modules.map((module) => <option key={module} value={module}>{moduleLabel(module, language)}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={requirementId}>{text("要求", "Requirement")}</label>
              <select id={requirementId} onChange={(event) => setRequirementFilter(event.currentTarget.value)} value={requirementFilter}>
                <option value="all">{text("全部要求", "All requirements")}</option>
                {requirements.map((requirement) => (
                  <option key={requirement} value={requirement}>{parameterRoleLabel("input", requirement, language)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-caption" aria-live="polite">
            <strong>{filtered.length}</strong> {text(`／共 ${model.parameters.length.toString()} 个参数`, `of ${model.parameters.length.toString()} parameters`)}
          </div>
          <div className="table-scroll" tabIndex={0} aria-label={text("可滚动参数表", "Scrollable parameter table")}>
            <table>
              <caption className="sr-only">{text("受控工程参数", "Controlled engineering parameters")}</caption>
              <thead>
                <tr>
                  <th scope="col">{text("符号", "Symbol")}</th>
                  <th scope="col">{text("工程名称", "Engineering name")}</th>
                  <th scope="col">{text("功能类别", "Category")}</th>
                  <th scope="col">{text("SI 单位", "SI unit")}</th>
                  <th scope="col">{text("用途", "Use")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((parameter) => (
                  <tr className={selectedId === parameter.id ? "is-selected" : undefined} key={parameter.id}>
                    <td><span className="parameter-symbol">{parameter.symbol}</span></td>
                    <th scope="row">
                      <button
                        aria-pressed={selectedId === parameter.id}
                        className="table-link"
                        onClick={() => setSelectedId(parameter.id)}
                        type="button"
                      >
                        {language === "zh-CN" ? parameter.localizedName : parameter.name}
                      </button>
                    </th>
                    <td><span className="module-badge">{moduleLabel(parameter.module, language)}</span></td>
                    <td><code>{parameter.canonicalUnit}</code></td>
                    <td>{parameterRoleLabel(parameter.role, parameter.requirement, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title={text("没有匹配的参数", "No matching parameters")}>{text("请清除或放宽当前搜索条件和筛选项。", "Clear or broaden the current search and filters.")}</EmptyState>
          ) : null}
        </section>
        <ParameterDetail parameter={selected} />
      </div>
    </section>
  );
}

function resultSummary(methodId: string, language: UiLanguage): string {
  const zh: Readonly<Record<string, string>> = {
    "B-02": "轴向填充系数",
    "B-03": "理想螺线管电感",
    "D-01": "螺旋段、引线段、母排段及导体总长度",
    "D-03": "导体直流电阻",
    "D-04": "电磁场幅值衰减到 1/e 的铜导体趋肤深度",
    "D-07": "感抗、复阻抗、阻抗幅值、品质因数和电压分量",
    "F-01": "输入阻抗、反射电阻、等效电阻、等效电感和耦合系数",
    "H-01": "单一冷却回路总热负荷",
    "H-03": "支路平均流速和水力直径",
    "J-03": "净辐射换热量和辐射网络系数",
  };
  if (language === "zh-CN") return zh[methodId] ?? "工程计算结果";
  return publicFacingText(zh[methodId] ?? "Engineering calculation results", language);
}

function MethodDetail({ method }: { readonly method: UiMvpRunnableMethodDefinition | undefined }) {
  const { language, text } = useUiLanguage();
  if (method === undefined) {
    return (
      <aside className="detail-panel" aria-label={text("方法详情", "Method details")}>
        <EmptyState title={text("尚未选择计算功能", "No calculation selected")}>{text("请选择一个功能以查看用途、输入、结果和适用范围。", "Select a calculation to review its purpose, inputs, results, and applicability.")}</EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="method-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">{text("计算功能详情", "Calculation details")}</p>
          <h2 id="method-detail-title">{methodDisplayName(method.methodId, method.name, language)}</h2>
        </div>
        <span className="module-badge">{moduleLabel(method.moduleId, language)}</span>
      </div>
      {language === "en" ? <p className="localized-name" lang="zh-Hans">{method.name.zh}</p> : null}
      <p className="method-purpose">{methodPurpose(method.methodId, method.purpose, language)}</p>
      <div className="gate-callout">
        <StatusPill enabled={true}>{text("可计算", "Available")}</StatusPill>
        <p>{text("此功能已经接入网页计算流程。请按提示提供真实工程数据。", "This calculation is available in the web workflow. Provide real engineering data as prompted.")}</p>
      </div>
      <DefinitionList>
        <DefinitionItem term={text("主要输入", "Main inputs")}>{method.fields.map((field) => fieldLabel(field.id, field.label, language)).join("、")}</DefinitionItem>
        <DefinitionItem term={text("计算结果", "Results")}>{resultSummary(method.methodId, language)}</DefinitionItem>
        <DefinitionItem term={text("适用范围", "Applicability")}>{methodApplicabilityScope(method.methodId, language)}</DefinitionItem>
        <DefinitionItem term={text("计算依据", "Calculation basis")}>{methodSourceSummary(method.methodId, language)}</DefinitionItem>
      </DefinitionList>
      <div className="detail-note">
        <strong>{text("使用限制", "Limitations")}</strong>
        <ul>{method.limitations.map((item) => <li key={item}>{publicFacingText(limitationText(item, language), language)}</li>)}</ul>
      </div>
    </aside>
  );
}

function MethodsPage({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, text } = useUiLanguage();
  const searchId = useId();
  const moduleId = useId();
  const [searchText, setSearchText] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const methods = application.mvp.methods;
  const [selectedId, setSelectedId] = useState<string | null>(methods[0]?.methodId ?? null);
  const deferredSearch = useDeferredValue(searchText);
  const modules = useMemo(() => uniqueSorted(methods.map((method) => method.moduleId)), [methods]);
  const filtered = useMemo(() => {
    const search = normalizeSearch(deferredSearch);
    return methods.filter((method) =>
      (moduleFilter === "all" || method.moduleId === moduleFilter) &&
      includesSearch(
        [method.name.en, method.name.zh, methodPurpose(method.methodId, method.purpose, language)],
        search,
      ),
    );
  }, [deferredSearch, language, methods, moduleFilter]);
  const selected = filtered.find((method) => method.methodId === selectedId);

  return (
    <section className="page" aria-labelledby="methods-title">
      <PageHeader eyebrow={text("当前可用功能", "Available calculations")} title={text("计算功能说明", "Calculation Guide")} titleId="methods-title">
        {text("这里仅列出已经接入网页并能实际计算的功能，说明其输入、结果、依据和适用范围。", "This page lists only calculations currently available in the web app, with inputs, results, basis, and applicability.")}
      </PageHeader>
      <div className="summary-grid summary-grid--three" aria-label={text("计算功能摘要", "Calculation summary")}>
        <SummaryCard label={text("可计算功能", "Available calculations")} value={methods.length} note={text("均可在工程计算器中选择", "Selectable in the Calculator")} />
        <SummaryCard label={text("功能类别", "Categories")} value={modules.length} note={text("覆盖几何、电气、耦合和冷却", "Geometry, electrical, coupling, and cooling")} />
        <SummaryCard label={text("当前显示", "Currently shown")} value={filtered.length} note={text("可按名称和类别筛选", "Filter by name and category")} />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label={text("可用计算功能", "Available calculations")}>
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>{text("搜索计算功能", "Search calculations")}</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder={text("名称或用途…", "Name or purpose…")}
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>{text("功能类别", "Category")}</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">{text("全部模块", "All modules")}</option>
                {modules.map((module) => <option key={module} value={module}>{moduleLabel(module, language)}</option>)}
              </select>
            </div>
          </div>
          <div className="table-caption" aria-live="polite"><strong>{filtered.length}</strong> {text(`／共 ${methods.length.toString()} 个功能`, `of ${methods.length.toString()} calculations`)}</div>
          <div className="table-scroll" tabIndex={0} aria-label={text("可滚动计算功能表", "Scrollable calculation table")}>
            <table>
              <caption className="sr-only">{text("当前可用计算功能", "Currently available calculations")}</caption>
              <thead>
                <tr>
                  <th scope="col">{text("计算功能", "Calculation")}</th>
                  <th scope="col">{text("功能类别", "Category")}</th>
                  <th scope="col">{text("主要结果", "Main results")}</th>
                  <th scope="col">{text("状态", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((method) => (
                  <tr className={selectedId === method.methodId ? "is-selected" : undefined} key={method.methodId}>
                    <th scope="row">
                      <button
                        aria-pressed={selectedId === method.methodId}
                        className="table-link table-link--method"
                        onClick={() => setSelectedId(method.methodId)}
                        type="button"
                      >
                        {methodDisplayName(method.methodId, method.name, language)}
                      </button>
                    </th>
                    <td><span className="module-badge">{moduleLabel(method.moduleId, language)}</span></td>
                    <td>{resultSummary(method.methodId, language)}</td>
                    <td><StatusPill enabled={true}>{text("可计算", "Available")}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <EmptyState title={text("没有匹配的方法", "No matching methods")}>{text("请清除或放宽当前搜索条件和筛选项。", "Clear or broaden the current search and filters.")}</EmptyState> : null}
        </section>
        <MethodDetail method={selected} />
      </div>
    </section>
  );
}

interface ImportedCaseState {
  readonly fileName: string;
  readonly validatedJson: string;
  readonly inspection: UiCaseInspection;
}

function downloadValidatedJson(importedCase: ImportedCaseState): void {
  const blob = new Blob([importedCase.validatedJson], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  const baseName = importedCase.fileName.toLocaleLowerCase("en-US").endsWith(".json")
    ? importedCase.fileName.slice(0, -5)
    : importedCase.fileName;
  anchor.download = `${baseName}.validated.json`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function CasePage({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, text } = useUiLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [importedCase, setImportedCase] = useState<ImportedCaseState | null>(null);
  const [failure, setFailure] = useState<{ readonly code: string; readonly message: string } | null>(null);
  const visibleCaseFields = importedCase?.inspection.fields.filter((field) =>
    field.label !== "Technical freeze" &&
    field.label !== "Material IDs" &&
    field.label !== "Selected method IDs" &&
    !field.label.startsWith("Version · "),
  ) ?? [];
  const caseDisplayName = visibleCaseFields.find((field) => field.label === "Case name")?.value
    ?? text("已验证方案", "Validated case");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) {
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      const text = await file.text();
      const result = application.inspectCaseJson(text);
      if (result.status === "success") {
        setImportedCase({ fileName: file.name, validatedJson: result.validatedJson, inspection: result.inspection });
      } else {
        setImportedCase(null);
        setFailure({ code: result.code, message: result.message });
      }
    } catch {
      setImportedCase(null);
      setFailure({ code: "file_read_failed", message: text("无法以文本方式读取所选文件。", "The selected file could not be read as text.") });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page case-record" aria-labelledby="case-title">
      <PageHeader
        actions={
          <>
            <button
              className="button button--secondary"
              disabled={importedCase === null}
              onClick={() => window.print()}
              type="button"
            >
              {text("打印输入记录", "Print input record")}
            </button>
            <button
              className="button button--primary"
              disabled={importedCase === null}
              onClick={() => { if (importedCase !== null) downloadValidatedJson(importedCase); }}
              type="button"
            >
              {text("下载校验后的方案文件", "Download validated case file")}
            </button>
          </>
        }
        eyebrow={text("本地方案文件", "Local case file")}
        title={text("方案文件检查", "Case File Check")}
        titleId="case-title"
      >
        {text("验证已经保存的方案文件，但不修改文件，也不执行计算。", "Validate an existing case file without editing it or running a calculation.")}
      </PageHeader>
      <div className="record-label">{text("方案输入记录 — 不含计算结果", "Case Input Record — No Calculation Result")}</div>
      <section className="import-panel" aria-labelledby="import-heading">
        <div>
          <p className="eyebrow">{text("本地文件", "Local file")}</p>
          <h2 id="import-heading">{text("导入已保存的方案文件", "Import a saved case file")}</h2>
          <p>{text("显示内容前，软件会检查文件格式和完整性；检查不会上传或修改本地文件。", "The app checks file format and integrity before showing its contents; the local file is neither uploaded nor modified.")}</p>
        </div>
        <input
          accept=".json,application/json"
          aria-label={text("方案文件", "Case file")}
          className="sr-only"
          onChange={(event) => { void handleFileChange(event); }}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="button button--primary"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {pending ? text("正在验证…", "Validating…") : text("选择方案文件", "Choose case file")}
        </button>
      </section>
      {failure === null ? null : (
        <div className="message message--error" role="alert">
          <strong>{text("导入被拒绝", "Import rejected")} · {failure.code}</strong>
          <p>{language === "zh-CN" ? "文件格式或内容未通过校验。请确认该文件由本软件保存且未被手工修改。" : publicFacingText(failure.message, language)}</p>
        </div>
      )}
      {importedCase === null ? (
        <EmptyState title={text("尚未加载方案", "No validated case loaded")}>
          {text("请选择现有方案文件。本页不接受编辑，并保持只读。", "Choose an existing case file. This inspector accepts no edits and remains read-only.")}
        </EmptyState>
      ) : (
        <div className="case-grid">
          <section className="data-panel case-summary" aria-labelledby="case-summary-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{text("已验证输入", "Validated input")}</p>
                <h2 id="case-summary-title">{caseDisplayName}</h2>
              </div>
              <StatusPill enabled={true}>{text("已验证", "validated")}</StatusPill>
            </div>
            <DefinitionList>
              <DefinitionItem term={text("来源文件", "Source file")}>{importedCase.fileName}</DefinitionItem>
              {visibleCaseFields.map((field) => (
                <DefinitionItem key={field.label} term={caseFieldLabel(field.label, language)}>{field.value}</DefinitionItem>
              ))}
            </DefinitionList>
          </section>
        </div>
      )}
    </section>
  );
}

function AboutPage({ model }: { readonly model: UiReferenceModel }) {
  const { language, text } = useUiLanguage();
  return (
    <section className="page about-page" aria-labelledby="about-title">
      <PageHeader eyebrow={text("软件标识", "Software identity")} title={text("关于 / 版本", "About / Versions")} titleId="about-title">
        {text("确认应用、计算模型、材料数据库、模式和技术冻结各自独立的版本标识。", "Confirm the independent application, calculation-model, material-database, schema, and technical-freeze identities.")}
      </PageHeader>
      <div className="identity-card">
        <div className="identity-mark" aria-hidden="true">IH</div>
        <div>
          <p className="eyebrow">{text("专业工程计算工作区", "Professional engineering workspace")}</p>
          <h2>{text("感应加热工程计算器", model.productName)}</h2>
          <p>{text("面向感应加热线圈设计与校核的工程计算工具", "Engineering calculations for induction-heating coil design and checking")}</p>
        </div>
      </div>
      <div className="about-grid">
        <section className="data-panel" aria-labelledby="versions-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{text("软件信息", "Software information")}</p>
              <h2 id="versions-title">{text("当前版本", "Current version")}</h2>
            </div>
          </div>
          <table className="version-table">
            <caption className="sr-only">{text("软件版本", "Software version")}</caption>
            <thead><tr><th scope="col">{text("组件", "Component")}</th><th scope="col">{text("版本", "Version")}</th></tr></thead>
            <tbody>
              {model.versions.filter((version) => version.id === "application").map((version) => (
                <tr key={version.id}><th scope="row">{text("软件版本", "Application version")}</th><td><code>{publicFacingText(version.value, language)}</code></td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="data-panel" aria-labelledby="scope-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{text("当前边界", "Current boundary")}</p>
              <h2 id="scope-title">{text("功能可用性", "Feature availability")}</h2>
            </div>
          </div>
          <ul className="capability-list">
            {model.capabilities.filter((capability) => capability.available).map((capability) => (
              <li key={capability.id}>
                <StatusPill enabled={capability.available}>{text(capability.available ? "可用" : "不可用", capability.available ? "available" : "unavailable")}</StatusPill>
                <div><strong>{capabilityLabel(capability.id, capability.label, language)}</strong><p>{capabilityReason(capability.id, capability.reason, language)}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="scope-banner" role="note">
        <strong>{text("计算原则", "Calculation principle")}</strong>
        <span>{text("页面不会隐藏警告、适用范围或假设，也不会为缺失的工程数据自动编造默认值。", "The interface retains warnings, applicability, and assumptions and never invents missing engineering data.")}</span>
      </div>
    </section>
  );
}

function EngineeringAppShell({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, setLanguage, text } = useUiLanguage();
  const [activePage, setActivePage] = useState<PageId>("basic");
  const activeDefinition = PRIMARY_PAGES.find((page) => page.id === activePage) ?? PRIMARY_PAGES[0]!;
  const mainRef = useRef<HTMLElement>(null);
  const activeLabel = uiText(language, activeDefinition.label.zh, activeDefinition.label.en);
  const activeDescription = uiText(language, activeDefinition.description.zh, activeDefinition.description.en);

  useEffect(() => {
    document.title = `${activeLabel} · ${text("感应加热工程计算器", application.reference.productShortName)}`;
  }, [activeLabel, application.reference.productShortName, text]);

  function activatePage(page: PageId): void {
    setActivePage(page);
    window.requestAnimationFrame(() => mainRef.current?.focus());
  }

  function handleNavKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const currentIndex = PRIMARY_PAGES.findIndex((page) => page.id === activePage);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + delta + PRIMARY_PAGES.length) % PRIMARY_PAGES.length;
    const nextPage = PRIMARY_PAGES[nextIndex];
    if (nextPage !== undefined) {
      activatePage(nextPage.id);
      document.querySelector<HTMLButtonElement>(`[data-nav-page="${nextPage.id}"]`)?.focus();
    }
  }

  return (
    <div className="app-shell" lang={language === "zh-CN" ? "zh-Hans" : "en"}>
      <a className="skip-link" href="#main-content">{text("跳到主要内容", "Skip to main content")}</a>
      <header className="topbar">
        <div className="brand-block">
          <span aria-hidden="true" className="brand-mark">IH</span>
          <div>
            <strong>{text("感应加热工程计算器", application.reference.productShortName)}</strong>
            <span>{text("0.9 测试版工程计算工具", "Version 0.9 engineering calculator")}</span>
          </div>
        </div>
        <div className="topbar__context">
          <span className="context-label">{text("工作区", "Workspace")}</span>
          <strong>{activeLabel}</strong>
          <span>{activeDescription}</span>
        </div>
        <div className="topbar__controls">
          <div aria-label={text("界面语言", "Interface language")} className="language-switch" role="group">
            <button aria-pressed={language === "zh-CN"} onClick={() => setLanguage("zh-CN")} type="button">简体中文</button>
            <button aria-pressed={language === "en"} onClick={() => setLanguage("en")} type="button">English</button>
          </div>
        </div>
      </header>
      <aside className="sidebar">
        <nav aria-label={text("工程计算工作区", "Engineering workspace")}>
          <p className="nav-heading">{text("工作区", "Workspace")}</p>
          <ul className="nav-list" onKeyDown={handleNavKeyDown}>
            {PRIMARY_PAGES.map((page) => (
              <li key={page.id}>
                <button
                  aria-current={activePage === page.id ? "page" : undefined}
                  className="nav-item"
                  data-nav-page={page.id}
                  onClick={() => activatePage(page.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="nav-item__icon">{page.shortLabel}</span>
                  <span className="nav-item__copy"><strong>{uiText(language, page.label.zh, page.label.en)}</strong><small>{uiText(language, page.description.zh, page.description.en)}</small></span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {activePage === "basic" ? <BasicCalculatorPage application={application} /> : null}
        {activePage === "calculator" ? <CalculatorPage application={application} /> : null}
        {activePage === "visualization" ? <ThreeDVisualizationPage application={application} /> : null}
        {activePage === "parameters" ? <ParametersPage model={application.reference} /> : null}
        {activePage === "methods" ? <MethodsPage application={application} /> : null}
        {activePage === "case" ? <CasePage application={application} /> : null}
        {activePage === "about" ? <AboutPage model={application.reference} /> : null}
      </main>
      <footer className="statusbar">
        <span><span aria-hidden="true" className="status-dot" /> {text("计算功能已就绪", "Calculations ready")}</span>
        <span>{text("本地计算 · 国际单位制输入", "Local calculation · SI inputs")}</span>
        <span>{text("简体中文为默认语言", "Simplified Chinese default")}</span>
      </footer>
    </div>
  );
}

export function EngineeringApp({ application, initialLanguage }: AppProps) {
  return (
    <UiLanguageProvider {...(initialLanguage === undefined ? {} : { initialLanguage })}>
      <EngineeringAppShell application={application} />
    </UiLanguageProvider>
  );
}
