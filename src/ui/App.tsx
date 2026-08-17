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
import {
  UiLanguageProvider,
  capabilityLabel,
  capabilityReason,
  caseFieldLabel,
  controlledValueLabel,
  methodGateReason,
  uiText,
  useUiLanguage,
  yesNoLabel,
  type UiLanguage,
} from "./i18n.js";

import type {
  EngineeringUiApplication,
  UiCapability,
  UiCaseInspection,
  UiMethodRecord,
  UiParameterRecord,
  UiReferenceModel,
} from "./ui-model.js";

type PageId = "calculator" | "parameters" | "methods" | "case" | "about";

interface PageDefinition {
  readonly id: PageId;
  readonly label: Readonly<{ readonly zh: string; readonly en: string }>;
  readonly shortLabel: string;
  readonly description: Readonly<{ readonly zh: string; readonly en: string }>;
}

const PRIMARY_PAGES: readonly PageDefinition[] = [
  {
    id: "calculator",
    label: { zh: "工程计算器", en: "Calculator" },
    shortLabel: "Σ",
    description: { zh: "创建、计算、保存并重新打开 Case", en: "Create, calculate, save, and reopen cases" },
  },
  {
    id: "parameters",
    label: { zh: "参数定义", en: "Parameters" },
    shortLabel: "P",
    description: { zh: "受控定义与单位", en: "Controlled definitions and units" },
  },
  {
    id: "methods",
    label: { zh: "方法就绪状态", en: "Method Readiness" },
    shortLabel: "M",
    description: { zh: "合同、证据和发布门禁", en: "Contracts, evidence, and release gates" },
  },
  {
    id: "case",
    label: { zh: "Case 检查器", en: "Case Inspector" },
    shortLabel: "C",
    description: { zh: "验证并检查 Case 文件", en: "Validate and inspect a case file" },
  },
  {
    id: "about",
    label: { zh: "关于 / 版本", en: "About / Versions" },
    shortLabel: "V",
    description: { zh: "冻结的软件与工程数据标识", en: "Frozen software identity" },
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

function humanize(value: string): string {
  return value.replaceAll("_", " ");
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
          {text("请选择一行以查看受控定义、单位、适用范围和来源引用。", "Select a row to inspect its controlled definition, units, applicability, and source references.")}
        </EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="parameter-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">{text("参数详情", "Parameter detail")}</p>
          <h2 id="parameter-detail-title">{parameter.id}</h2>
        </div>
        <span className="module-badge">{text("模块", "Module")} {parameter.module}</span>
      </div>
      <p className="detail-panel__name">
        <span className="parameter-symbol">{parameter.symbol}</span>
        {language === "zh-CN" ? parameter.localizedName : parameter.name}
      </p>
      <p className="localized-name" lang={language === "zh-CN" ? "en" : "zh-Hans"}>
        {language === "zh-CN" ? parameter.name : parameter.localizedName}
      </p>
      <DefinitionList>
        <DefinitionItem term={text("定义（受控英文原文）", "Definition")}>{parameter.definition}</DefinitionItem>
        <DefinitionItem term={text("适用范围（受控英文原文）", "Applicability")}>{parameter.applicability}</DefinitionItem>
        <DefinitionItem term={text("物理范围", "Physical range")}><code>{parameter.physicalRange}</code></DefinitionItem>
        <DefinitionItem term={text("量纲", "Dimension")}>{humanize(parameter.dimension)}</DefinitionItem>
        <DefinitionItem term={text("规范 SI 单位", "Canonical SI unit")}><code>{parameter.canonicalUnit}</code></DefinitionItem>
        <DefinitionItem term={text("显示单位", "Display units")}>
          {parameter.displayUnits.length === 0 ? text("未声明", "None declared") : parameter.displayUnits.join(", ")}
        </DefinitionItem>
        <DefinitionItem term={text("角色 / 要求", "Role / requirement")}>
          {humanize(parameter.role)} / {humanize(parameter.requirement)}
        </DefinitionItem>
        <DefinitionItem term={text("默认值策略", "Default policy")}>{parameter.defaultPolicy}</DefinitionItem>
        <DefinitionItem term={text("使用此参数的方法", "Consuming methods")}>
          {parameter.consumingMethods.length === 0 ? text("未声明", "None declared") : parameter.consumingMethods.join(", ")}
        </DefinitionItem>
        <DefinitionItem term={text("来源引用", "Source references")}>
          {parameter.sourceReferences.length === 0 ? text("未声明", "None declared") : parameter.sourceReferences.join(", ")}
        </DefinitionItem>
      </DefinitionList>
      <div className="detail-note">
        <strong>{text("受控帮助（英文原文）", "Controlled help")}</strong>
        <p>{parameter.help}</p>
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
      <PageHeader eyebrow={text("受控元数据", "Controlled metadata")} title={text("参数定义", "Parameter Definition")} titleId="parameters-title">
        {text("查询冻结的参数字典。本页仅提供只读元数据；工程计算只能在受控计算器工作区中执行。", "Search the frozen parameter dictionary. This metadata page remains read-only; calculations are performed only in the controlled Calculator workspace.")}
      </PageHeader>
      <div className="scope-banner" role="note">
        <strong>{text("仅元数据", "Metadata only")}</strong>
        <span>{text("此处不接收输入值，也不会生成工程计算结果。", "No input values are accepted here, and no engineering result is calculated.")}</span>
      </div>
      <div className="summary-grid summary-grid--three" aria-label={text("参数摘要", "Parameter summary")}>
        <SummaryCard label={text("受控记录", "Controlled records")} value={model.parameters.length} note={text("公开应用视图", "Public application view")} />
        <SummaryCard label={text("所属模块", "Owner modules")} value={modules.length} note={text("当前注册表可用", "Available in this registry")} />
        <SummaryCard label={text("所选模块", "Selected module")} value={moduleFilter === "all" ? text("全部", "All") : moduleFilter} note={text(`${filtered.length.toString()} 条可见记录`, `${filtered.length.toString()} visible records`)} />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label={text("参数注册表", "Parameter registry")}>
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>{text("搜索参数", "Search parameters")}</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder={text("ID、符号、名称、单位、方法…", "ID, symbol, name, unit, method…")}
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>{text("模块", "Module")}</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">{text("全部模块", "All modules")}</option>
                {modules.map((module) => <option key={module} value={module}>{text("模块", "Module")} {module}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={requirementId}>{text("要求", "Requirement")}</label>
              <select id={requirementId} onChange={(event) => setRequirementFilter(event.currentTarget.value)} value={requirementFilter}>
                <option value="all">{text("全部要求", "All requirements")}</option>
                {requirements.map((requirement) => (
                  <option key={requirement} value={requirement}>{humanize(requirement)}</option>
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
                  <th scope="col">{text("参数 ID", "Parameter ID")}</th>
                  <th scope="col">{text("符号", "Symbol")}</th>
                  <th scope="col">{text("工程名称", "Engineering name")}</th>
                  <th scope="col">{text("模块", "Module")}</th>
                  <th scope="col">{text("SI 单位", "SI unit")}</th>
                  <th scope="col">{text("要求", "Requirement")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((parameter) => (
                  <tr className={selectedId === parameter.id ? "is-selected" : undefined} key={parameter.id}>
                    <th scope="row">
                      <button
                        aria-pressed={selectedId === parameter.id}
                        className="table-link"
                        onClick={() => setSelectedId(parameter.id)}
                        type="button"
                      >
                        {parameter.id}
                      </button>
                    </th>
                    <td><span className="parameter-symbol">{parameter.symbol}</span></td>
                    <td>
                      <span className="cell-primary">{language === "zh-CN" ? parameter.localizedName : parameter.name}</span>
                      <span className="cell-secondary" lang={language === "zh-CN" ? "en" : "zh-Hans"}>{language === "zh-CN" ? parameter.name : parameter.localizedName}</span>
                    </td>
                    <td><span className="module-badge">{parameter.module}</span></td>
                    <td><code>{parameter.canonicalUnit}</code></td>
                    <td>{humanize(parameter.requirement)}</td>
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

function MethodDetail({ method }: { readonly method: UiMethodRecord | undefined }) {
  const { language, text } = useUiLanguage();
  if (method === undefined) {
    return (
      <aside className="detail-panel" aria-label={text("方法详情", "Method details")}>
        <EmptyState title={text("尚未选择方法", "No method selected")}>{text("请选择一个方法以查看其合同和发布门禁。", "Select a method to inspect its contract and release gate.")}</EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="method-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">{text("方法合同", "Method contract")}</p>
          <h2 id="method-detail-title">{method.id}</h2>
        </div>
        <span className="module-badge">{text("模块", "Module")} {method.module}</span>
      </div>
      <p className="detail-panel__name">{language === "zh-CN" ? method.localizedName : method.name}</p>
      <p className="localized-name" lang={language === "zh-CN" ? "en" : "zh-Hans"}>{language === "zh-CN" ? method.name : method.localizedName}</p>
      <p className="method-purpose">{method.purpose}</p>
      <div className="gate-callout">
        <StatusPill enabled={method.executionEnabled}>{controlledValueLabel(method.executionStatus.replaceAll(" ", "_"), language)}</StatusPill>
        <p>{methodGateReason(method.id, method.executionReason, language)}</p>
      </div>
      <DefinitionList>
        <DefinitionItem term={text("方法版本", "Method version")}><code>{method.methodVersion}</code></DefinitionItem>
        <DefinitionItem term={text("批准状态", "Approval")}>{controlledValueLabel(method.approvalStatus, language)}</DefinitionItem>
        <DefinitionItem term={text("生命周期", "Lifecycle")}>{controlledValueLabel(method.lifecycleStatus, language)}</DefinitionItem>
        <DefinitionItem term={text("方法类型", "Method type")}>{controlledValueLabel(method.methodType, language)}</DefinitionItem>
        <DefinitionItem term={text("科学可信度", "Scientific confidence")}>{controlledValueLabel(method.scientificConfidence, language)}</DefinitionItem>
        <DefinitionItem term={text("推荐资格", "Recommendation")}>{controlledValueLabel(method.recommendation, language)}</DefinitionItem>
        <DefinitionItem term={text("需要拆分子方法", "Submethod split required")}>{yesNoLabel(method.requiresSubmethodSplit, language)}</DefinitionItem>
        <DefinitionItem term={text("已有实现", "Implementation available")}>{yesNoLabel(method.implementationAvailable, language)}</DefinitionItem>
        <DefinitionItem term={text("输入", "Inputs")}>{method.inputs.length === 0 ? text("未声明", "None declared") : method.inputs.join(", ")}</DefinitionItem>
        <DefinitionItem term={text("输出", "Outputs")}>{method.outputs.length === 0 ? text("未声明", "None declared") : method.outputs.join(", ")}</DefinitionItem>
      </DefinitionList>
    </aside>
  );
}

function MethodsPage({ model }: { readonly model: UiReferenceModel }) {
  const { language, text } = useUiLanguage();
  const searchId = useId();
  const moduleId = useId();
  const readinessId = useId();
  const [searchText, setSearchText] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(model.methods[0]?.id ?? null);
  const deferredSearch = useDeferredValue(searchText);
  const modules = useMemo(() => uniqueSorted(model.methods.map((method) => method.module)), [model.methods]);
  const filtered = useMemo(() => {
    const search = normalizeSearch(deferredSearch);
    return model.methods.filter((method) =>
      (moduleFilter === "all" || method.module === moduleFilter) &&
      (readinessFilter === "all" || (readinessFilter === "ready") === method.executionEnabled) &&
      includesSearch(
        [method.id, method.name, method.localizedName, method.purpose, method.executionStatus, method.executionReason],
        search,
      ),
    );
  }, [deferredSearch, model.methods, moduleFilter, readinessFilter]);
  const selected = filtered.find((method) => method.id === selectedId);
  const executableCount = model.methods.filter((method) => method.executionEnabled).length;

  return (
    <section className="page" aria-labelledby="methods-title">
      <PageHeader eyebrow={text("发布证据", "Release evidence")} title={text("方法就绪状态", "Method Readiness")} titleId="methods-title">
        {text("查看冻结的方法合同、生命周期状态和明确的运行门禁。UI 不会自行推断方法是否就绪。", "Inspect frozen contracts, lifecycle state, and explicit runtime release gates. Readiness is never inferred by the UI.")}
      </PageHeader>
      <div className="summary-grid summary-grid--three" aria-label={text("方法就绪状态摘要", "Method readiness summary")}>
        <SummaryCard label={text("已编目方法", "Catalogued methods")} value={model.methods.length} note={text("受控顶层 ID", "Controlled top-level IDs")} />
        <SummaryCard label={text("运行时已启用", "Runtime enabled")} value={executableCount} note={text("由应用边界报告", "Reported by the application boundary")} />
        <SummaryCard label={text("受发布门禁限制", "Release gated")} value={model.methods.length - executableCount} note={text("每个方法均保留原因", "Reason retained per method")} />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label={text("方法就绪状态注册表", "Method readiness registry")}>
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>{text("搜索方法", "Search methods")}</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder={text("ID、名称、用途、门禁原因…", "ID, name, purpose, gate reason…")}
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>{text("模块", "Module")}</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">{text("全部模块", "All modules")}</option>
                {modules.map((module) => <option key={module} value={module}>{text("模块", "Module")} {module}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={readinessId}>{text("运行状态", "Runtime state")}</label>
              <select id={readinessId} onChange={(event) => setReadinessFilter(event.currentTarget.value)} value={readinessFilter}>
                <option value="all">{text("全部状态", "All states")}</option>
                <option value="ready">{text("已启用", "Enabled")}</option>
                <option value="gated">{text("受发布门禁限制", "Release gated")}</option>
              </select>
            </div>
          </div>
          <div className="table-caption" aria-live="polite"><strong>{filtered.length}</strong> {text(`／共 ${model.methods.length.toString()} 个方法`, `of ${model.methods.length.toString()} methods`)}</div>
          <div className="table-scroll" tabIndex={0} aria-label={text("可滚动方法就绪状态表", "Scrollable method readiness table")}>
            <table>
              <caption className="sr-only">{text("方法就绪和发布状态", "Method readiness and release status")}</caption>
              <thead>
                <tr>
                  <th scope="col">{text("方法", "Method")}</th>
                  <th scope="col">{text("工程名称", "Engineering name")}</th>
                  <th scope="col">{text("模块", "Module")}</th>
                  <th scope="col">{text("批准状态", "Approval")}</th>
                  <th scope="col">{text("运行状态", "Runtime status")}</th>
                  <th scope="col">{text("可信度", "Confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((method) => (
                  <tr className={selectedId === method.id ? "is-selected" : undefined} key={method.id}>
                    <th scope="row">
                      <button
                        aria-pressed={selectedId === method.id}
                        className="table-link table-link--method"
                        onClick={() => setSelectedId(method.id)}
                        type="button"
                      >
                        {method.id}
                      </button>
                    </th>
                    <td>
                      <span className="cell-primary">{language === "zh-CN" ? method.localizedName : method.name}</span>
                      <span className="cell-secondary" lang={language === "zh-CN" ? "en" : "zh-Hans"}>{language === "zh-CN" ? method.name : method.localizedName}</span>
                    </td>
                    <td><span className="module-badge">{method.module}</span></td>
                    <td>{controlledValueLabel(method.approvalStatus, language)}</td>
                    <td><StatusPill enabled={method.executionEnabled}>{controlledValueLabel(method.executionStatus.replaceAll(" ", "_"), language)}</StatusPill></td>
                    <td>{controlledValueLabel(method.scientificConfidence, language)}</td>
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
              {text("下载已验证 JSON", "Download validated JSON")}
            </button>
          </>
        }
        eyebrow={text("严格 Case 文件边界", "Strict case-file boundary")}
        title={text("Case 检查器", "Case Inspector")}
        titleId="case-title"
      >
        {text("验证现有 Case 文件，但不编辑文件，也不执行计算。", "Validate an existing case file without editing it or running a calculation.")}
      </PageHeader>
      <div className="record-label">{text("Case 输入记录 — 不含计算结果", "Case Input Record — No Calculation Result")}</div>
      <section className="import-panel" aria-labelledby="import-heading">
        <div>
          <p className="eyebrow">{text("本地文件", "Local file")}</p>
          <h2 id="import-heading">{text("导入 Case JSON 文件", "Import a case JSON file")}</h2>
          <p>{text("显示任何详情前，公开应用边界会检查模式版本、软件版本、冻结标识和内容指纹。", "The public application boundary checks schema, versions, freeze identity, and content fingerprints before any details are shown.")}</p>
        </div>
        <input
          accept=".json,application/json"
          aria-label={text("Case JSON 文件", "Case JSON file")}
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
          {pending ? text("正在验证…", "Validating…") : text("选择 Case JSON", "Choose case JSON")}
        </button>
      </section>
      {failure === null ? null : (
        <div className="message message--error" role="alert">
          <strong>{text("导入被拒绝", "Import rejected")} · {failure.code}</strong>
          <p>{failure.message}</p>
        </div>
      )}
      {importedCase === null ? (
        <EmptyState title={text("尚未加载已验证 Case", "No validated case loaded")}>
          {text("请选择现有 Case JSON 文件。此检查器不接受编辑，并严格保持只读。", "Choose an existing case JSON file. This inspector accepts no edits and remains strictly read-only.")}
        </EmptyState>
      ) : (
        <div className="case-grid">
          <section className="data-panel case-summary" aria-labelledby="case-summary-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{text("已验证输入", "Validated input")}</p>
                <h2 id="case-summary-title">{importedCase.inspection.caseId}</h2>
              </div>
              <StatusPill enabled={true}>{text("已验证", "validated")}</StatusPill>
            </div>
            <DefinitionList>
              <DefinitionItem term={text("来源文件", "Source file")}>{importedCase.fileName}</DefinitionItem>
              <DefinitionItem term={text("快照标识", "Snapshot identity")}><code className="fingerprint">{importedCase.inspection.snapshotId}</code></DefinitionItem>
              {importedCase.inspection.fields.map((field) => (
                <DefinitionItem key={field.label} term={caseFieldLabel(field.label, language)}>{field.value}</DefinitionItem>
              ))}
            </DefinitionList>
          </section>
          <section className="data-panel json-panel" aria-labelledby="json-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{text("只读源数据", "Read-only source")}</p>
                <h2 id="json-title">{text("规范化已验证 JSON", "Canonical validated JSON")}</h2>
              </div>
              <span className="text-badge">{text("已验证", "validated")}</span>
            </div>
            <pre tabIndex={0}>{importedCase.validatedJson}</pre>
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
          <p>{text("Phase 5B 受控可运行 MVP 工作区", model.phaseLabel)}</p>
        </div>
        <div className="freeze-stamp">
          <span>{text("技术冻结", "Technical freeze")}</span>
          <code>{model.technicalFreezeId}</code>
        </div>
      </div>
      <div className="about-grid">
        <section className="data-panel" aria-labelledby="versions-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{text("可复现性", "Reproducibility")}</p>
              <h2 id="versions-title">{text("版本注册表", "Version registry")}</h2>
            </div>
          </div>
          <table className="version-table">
            <caption className="sr-only">{text("应用和工程数据版本", "Application and engineering data versions")}</caption>
            <thead><tr><th scope="col">{text("组件", "Component")}</th><th scope="col">{text("版本", "Version")}</th></tr></thead>
            <tbody>
              {model.versions.map((version) => (
                <tr key={version.id}><th scope="row">{version.label}</th><td><code>{version.value}</code></td></tr>
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
            {model.capabilities.map((capability) => (
              <li key={capability.id}>
                <StatusPill enabled={capability.available}>{text(capability.available ? "可用" : "不可用", capability.available ? "available" : "unavailable")}</StatusPill>
                <div><strong>{capabilityLabel(capability.id, capability.label, language)}</strong><p>{capabilityReason(capability.id, capability.reason, language)}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="scope-banner" role="note">
        <strong>{text("UI 边界", "UI boundary")}</strong>
        <span>{text("此界面仅使用稳定的应用 API。工程公式、发布决策和隐藏默认值均不位于 UI 代码中。", "This interface consumes the stable application API. Engineering formulas, release decisions, and hidden defaults do not live in UI code.")}</span>
      </div>
    </section>
  );
}

function GatedNavigationItem({ capability }: { readonly capability: UiCapability }) {
  const { language, text } = useUiLanguage();
  const reason = capabilityReason(capability.id, capability.reason, language);
  return (
    <li>
      <div aria-disabled="true" className="nav-item nav-item--disabled" title={reason}>
        <span aria-hidden="true" className="nav-item__icon">×</span>
        <span className="nav-item__copy">
          <strong>{capabilityLabel(capability.id, capability.label, language)}</strong>
          <small>{reason}</small>
        </span>
        <span className="nav-item__state">{text("不可用", "Unavailable")}</span>
      </div>
    </li>
  );
}

function EngineeringAppShell({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, setLanguage, text } = useUiLanguage();
  const [activePage, setActivePage] = useState<PageId>("calculator");
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
            <span>{text("Phase 5B 受控可运行 MVP", application.reference.phaseLabel)}</span>
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
          <div className="freeze-chip">
            <span>{text("冻结", "Freeze")}</span>
            <code>{application.reference.technicalFreezeId}</code>
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
          <p className="nav-heading nav-heading--secondary">{text("受发布门禁限制", "Release gated")}</p>
          <ul className="nav-list nav-list--gated">
            {application.reference.capabilities.filter((capability) => !capability.available).map((capability) => (
              <GatedNavigationItem capability={capability} key={capability.id} />
            ))}
          </ul>
        </nav>
      </aside>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {activePage === "calculator" ? <CalculatorPage application={application} /> : null}
        {activePage === "parameters" ? <ParametersPage model={application.reference} /> : null}
        {activePage === "methods" ? <MethodsPage model={application.reference} /> : null}
        {activePage === "case" ? <CasePage application={application} /> : null}
        {activePage === "about" ? <AboutPage model={application.reference} /> : null}
      </main>
      <footer className="statusbar">
        <span><span aria-hidden="true" className="status-dot" /> {text("公开应用 API 已连接", "Public application API connected")}</span>
        <span>{text("受控 MVP 适配器 · 规范 SI 输入", "Controlled MVP adapter · canonical-SI inputs")}</span>
        <span>{application.reference.technicalFreezeId}</span>
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
