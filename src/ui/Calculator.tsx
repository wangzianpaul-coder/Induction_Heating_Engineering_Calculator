import {
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  buildUiMvpWorkspaceInput,
  createEmptyMvpFormState,
  restoreMvpFormState,
  type UiMvpFormState,
  type UiMvpRawFieldValue,
} from "./mvp-form.js";
import {
  capabilityLabel,
  capabilityReason,
  controlledValueLabel,
  fieldDescription,
  fieldLabel,
  limitationText,
  methodPurpose,
  optionLabel,
  useUiLanguage,
  type UiLanguage,
} from "./i18n.js";
import type {
  EngineeringUiApplication,
  UiMvpCalculationResult,
  UiMvpFailure,
  UiMvpInputFieldDefinition,
  UiMvpMethodResult,
  UiMvpRunnableMethodDefinition,
  UiMvpRunnableMethodId,
} from "./ui-model.js";

interface CalculatorPageProps {
  readonly application: EngineeringUiApplication;
}

interface UiNotice {
  readonly tone: "success" | "error" | "info";
  readonly title: string;
  readonly detail: string;
}

function resultStatusLabel(status: UiMvpMethodResult["status"], language: UiLanguage): string {
  return controlledValueLabel(status, language);
}

function methodLabel(method: UiMvpRunnableMethodDefinition, language: UiLanguage): string {
  return `${method.methodId} · ${language === "zh-CN" ? method.name.zh : method.name.en}`;
}

function outputValue(value: UiMvpMethodResult["outputs"][number]["value"], language: UiLanguage): string {
  if (value === null) return language === "zh-CN" ? "不可用" : "Unavailable";
  const locale = language === "zh-CN" ? "zh-CN" : "en-US";
  if (typeof value === "number") {
    return new Intl.NumberFormat(locale, { maximumSignificantDigits: 10 }).format(value);
  }
  const numberFormat = new Intl.NumberFormat(locale, { maximumSignificantDigits: 10 });
  return `${numberFormat.format(value.real)} + j${numberFormat.format(value.imaginary)}`;
}

function downloadCanonicalCase(caseId: string, canonicalJson: string): void {
  const blob = new Blob([canonicalJson], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${caseId.length === 0 ? "ih-engineering-case" : caseId}.mvp.json`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function FieldControl({
  field,
  methodId,
  value,
  onChange,
}: {
  readonly field: UiMvpInputFieldDefinition;
  readonly methodId: UiMvpRunnableMethodId;
  readonly value: UiMvpRawFieldValue;
  readonly onChange: (value: UiMvpRawFieldValue) => void;
}) {
  const { language, text } = useUiLanguage();
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const label = fieldLabel(field.id, field.label, language);
  const description = fieldDescription(field.id, field.description, language);
  if (field.kind === "boolean") {
    return (
      <div className="calculator-field calculator-field--boolean">
        <label htmlFor={inputId}>
          <input
            aria-describedby={descriptionId}
            checked={value === true}
            id={inputId}
            onChange={(event) => onChange(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>{label}</span>
        </label>
        <p id={descriptionId}>{description} {text("未勾选表示尚未确认。", "Unchecked means not confirmed.")}</p>
      </div>
    );
  }

  return (
    <div className="calculator-field">
      <label htmlFor={inputId}>
        <span>{label}{field.required ? <span aria-label={text("必填", "required")} className="required-mark"> *</span> : null}</span>
        {field.unit === null ? null : <code>{field.unit}</code>}
      </label>
      {field.kind === "select" ? (
        <select
          aria-describedby={descriptionId}
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={typeof value === "string" ? value : ""}
        >
          <option value="">{text("未确认", "Not confirmed")}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>{optionLabel(option.value, option.label, language)}</option>
          ))}
        </select>
      ) : (
        <input
          aria-describedby={descriptionId}
          id={inputId}
          inputMode={field.kind === "number_list_optional" ? "decimal" : undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={field.placeholder}
          step={field.kind === "number" ? "any" : undefined}
          type={field.kind === "number" ? "number" : "text"}
          value={typeof value === "string" ? value : ""}
        />
      )}
      <p id={descriptionId}>
        {description}
        {field.kind === "number_list_optional" ? text(" 使用逗号分隔的规范 SI 数值；[] 表示确认没有；留空表示明确未知。", " Use comma-separated canonical-SI values, [] for confirmed none, or leave blank for explicit unknown.") : ""}
      </p>
      <span className="field-boundary">{methodId} {text("受控输入 · 不推断默认值", "controlled input · no inferred default")}</span>
    </div>
  );
}

function MethodInputPanel({
  method,
  values,
  onFieldChange,
}: {
  readonly method: UiMvpRunnableMethodDefinition;
  readonly values: Readonly<Record<string, UiMvpRawFieldValue>>;
  readonly onFieldChange: (fieldId: string, value: UiMvpRawFieldValue) => void;
}) {
  const { language, text } = useUiLanguage();
  return (
    <details className="method-input-panel" open>
      <summary>
        <span>
          <strong>{methodLabel(method, language)}</strong>
          <small lang={language === "zh-CN" ? "en" : "zh-Hans"}>{language === "zh-CN" ? method.name.en : method.name.zh}</small>
        </span>
        <span className="module-badge">{text("模块", "Module")} {method.moduleId}</span>
      </summary>
      <div className="method-input-panel__context">
        <p>{methodPurpose(method.methodId, method.purpose, language)}</p>
        <span>{controlledValueLabel(method.approvalStatus, language)} · {text("适配器", "adapter")} {method.methodVersion}</span>
      </div>
      <div className="calculator-fields">
        {method.fields.map((field) => (
          <FieldControl
            field={field}
            key={field.id}
            methodId={method.methodId}
            onChange={(value) => onFieldChange(field.id, value)}
            value={values[field.id] ?? (field.kind === "boolean" ? false : "")}
          />
        ))}
      </div>
      <div className="method-limitations">
        <strong>{text("保留的适用限制", "Applicability limits retained")}</strong>
        <ul>{method.limitations.map((item) => <li key={item}>{limitationText(item, language)}</li>)}</ul>
      </div>
    </details>
  );
}

function FailureBlock({ failure }: { readonly failure: UiMvpFailure }) {
  const { text } = useUiLanguage();
  return (
    <div className="result-failure" role="alert">
      <strong>{text("计算未完成", "Calculation not completed")} · {failure.code}</strong>
      <p><b>{text("受控详情：", "Details:")}</b> {failure.message}</p>
      <p><b>{text("建议操作：", "Action:")}</b> {failure.action}</p>
    </div>
  );
}

function ResultCard({ result }: { readonly result: UiMvpMethodResult }) {
  const { language, text } = useUiLanguage();
  return (
    <article className="calculation-result-card">
      <header>
        <div>
          <p className="eyebrow">{text("受控方法结果", "Controlled method result")}</p>
          <h3>{result.methodId}</h3>
        </div>
        <span className={`result-status result-status--${result.status}`}>{resultStatusLabel(result.status, language)}</span>
      </header>
      <p className="registry-boundary-note">
        {text("受控 MVP 适配器结果 · 正式方法注册表激活状态仍为", "Controlled MVP adapter result · formal registry activation remains")} <strong>false</strong>.
      </p>
      {result.failure === null ? null : <FailureBlock failure={result.failure} />}
      <section aria-label={`${result.methodId} ${text("输出", "outputs")}`} className="result-output-grid">
        {result.outputs.map((output) => (
          <div className={output.status === "available" ? "result-output" : "result-output result-output--unavailable"} key={output.outputId}>
            <span>{language === "zh-CN" ? output.label.zh : output.label.en}</span>
            <strong>{outputValue(output.value, language)}</strong>
            <code>{output.canonicalUnitId ?? text("无量纲", "unitless")}</code>
            {output.reason === null ? null : <p>{output.reason}</p>}
          </div>
        ))}
      </section>
      <dl className="result-evidence">
        <div><dt>{text("适用性", "Applicability")}</dt><dd><strong>{controlledValueLabel(result.applicability.status, language)}</strong> · {result.applicability.scope}</dd></div>
        <div><dt>{text("批准状态", "Approval")}</dt><dd>{controlledValueLabel(result.approvalStatus, language)} · {result.methodVersion}</dd></div>
      </dl>
      {result.warnings.length === 0 ? null : (
        <section className="result-list result-list--warning">
          <strong>{text("警告（受控原文）", "Warnings")}</strong>
          <ul>{result.warnings.map((warning, index) => (
            <li key={`${warning.code ?? "warning"}-${String(index)}`}>
              {warning.code === null ? null : <code>{warning.code}</code>} {warning.message}
              {warning.predicate === null ? null : <small>{text("判定条件", "Predicate")}: {warning.predicate}</small>}
            </li>
          ))}</ul>
        </section>
      )}
      <section className="result-list">
        <strong>{text("适用限制", "Applicability limits")}</strong>
        <ul>{result.applicability.limitations.map((item) => <li key={item}>{limitationText(item, language)}</li>)}</ul>
      </section>
      <section className="result-list">
        <strong>{text("假设", "Assumptions")}</strong>
        {result.assumptions.length === 0 ? <p>{text("未报告假设。", "None reported.")}</p> : <ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>
      <section className="result-list result-list--sources">
        <strong>{text("方法来源", "Method sources")}</strong>
        {result.sources.length === 0 ? <p>{text("未报告结果来源。", "No result source was reported.")}</p> : <ul>{result.sources.map((item) => <li key={item}><code>{item}</code></li>)}</ul>}
      </section>
    </article>
  );
}

export function CalculatorPage({ application }: CalculatorPageProps) {
  const { language, text } = useUiLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const methods = application.mvp.methods;
  const [caseId, setCaseId] = useState("");
  const [caseName, setCaseName] = useState("");
  const [selectedMethodIds, setSelectedMethodIds] = useState<readonly UiMvpRunnableMethodId[]>([]);
  const [formState, setFormState] = useState<UiMvpFormState>(() => createEmptyMvpFormState(methods));
  const [calculation, setCalculation] = useState<UiMvpCalculationResult | null>(null);
  const [notice, setNotice] = useState<UiNotice | null>(null);
  const [opening, setOpening] = useState(false);
  const selectedMethods = useMemo(
    () => methods.filter((method) => selectedMethodIds.includes(method.methodId)),
    [methods, selectedMethodIds],
  );

  function clearOutcome(): void {
    setCalculation(null);
    setNotice(null);
  }

  function resetCase(): void {
    setCaseId("");
    setCaseName("");
    setSelectedMethodIds([]);
    setFormState(createEmptyMvpFormState(methods));
    clearOutcome();
  }

  function toggleMethod(methodId: UiMvpRunnableMethodId): void {
    setSelectedMethodIds((current) => current.includes(methodId)
      ? current.filter((id) => id !== methodId)
      : methods.filter((method) => current.includes(method.methodId) || method.methodId === methodId).map((method) => method.methodId));
    clearOutcome();
  }

  function updateField(methodId: UiMvpRunnableMethodId, fieldId: string, value: UiMvpRawFieldValue): void {
    setFormState((current) => ({
      ...current,
      [methodId]: { ...current[methodId], [fieldId]: value },
    }));
    clearOutcome();
  }

  function workspace() {
    return buildUiMvpWorkspaceInput(caseId, caseName, selectedMethodIds, formState, methods);
  }

  function calculate(): void {
    const built = workspace();
    if (built.status !== "success") {
      setCalculation({ status: "invalid_input", failure: built.failure });
      setNotice(null);
      return;
    }
    const result = application.mvp.calculate(built.workspace, new Date());
    setCalculation(result);
    setNotice(result.status === "success"
      ? {
          tone: "success",
          title: text("计算完成", "Calculation completed"),
          detail: text(
            `快照 ${result.snapshotId} 已生成 ${result.results.length.toString()} 个受控方法结果。`,
            `${result.results.length.toString()} controlled method result(s) produced for snapshot ${result.snapshotId}.`,
          ),
        }
      : null);
  }

  function save(): void {
    const built = workspace();
    if (built.status !== "success") {
      setNotice({ tone: "error", title: built.failure.code, detail: `${built.failure.message} ${built.failure.action}` });
      return;
    }
    const result = application.mvp.save(built.workspace, new Date());
    if (result.status !== "success") {
      setNotice({ tone: "error", title: result.failure.code, detail: `${result.failure.message} ${result.failure.action}` });
      return;
    }
    downloadCanonicalCase(caseId, result.canonicalJson);
    setNotice({
      tone: "success",
      title: text("规范 Case 已保存", "Canonical case saved"),
      detail: text(`快照 ${result.snapshotId} 已下载为本地 JSON。`, `Snapshot ${result.snapshotId} was downloaded as local JSON.`),
    });
  }

  async function openCase(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;
    setOpening(true);
    setNotice(null);
    try {
      const result = application.mvp.load(await file.text());
      if (result.status !== "success") {
        setNotice({ tone: "error", title: `${text("打开被拒绝", "Open rejected")} · ${result.code}`, detail: result.message });
        return;
      }
      setCaseId(result.workspace.caseId);
      setCaseName(result.workspace.caseName);
      setSelectedMethodIds(result.workspace.selectedMethodIds);
      setFormState(restoreMvpFormState(methods, result.workspace.methodInputs));
      setCalculation(null);
      setNotice({
        tone: "success",
        title: text("规范 Case 已打开", "Canonical case opened"),
        detail: text(
          `${file.name} 已恢复快照 ${result.snapshotId}。请重新计算以生成当前结果。`,
          `${file.name} restored snapshot ${result.snapshotId}. Recalculate to produce current results.`,
        ),
      });
    } catch {
      setNotice({ tone: "error", title: text("打开失败", "Open failed"), detail: text("无法以文本方式读取所选本地文件。", "The selected local file could not be read as text.") });
    } finally {
      setOpening(false);
    }
  }

  const successfulCalculation = calculation?.status === "success" ? calculation : null;

  return (
    <section aria-labelledby="calculator-title" className="page calculator-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{text("可运行 MVP · 受控适配器", "Runnable MVP · controlled adapter")}</p>
          <h1 id="calculator-title">{text("感应加热工程计算器", "Engineering Calculator")}</h1>
          <p className="page-header__description">
            {text("创建 Case，输入明确的规范 SI 参数，选择已批准路线并计算；所有警告、限制、假设和来源都会完整保留。", "Create a case, enter explicit canonical-SI inputs, select approved routes, calculate, and retain every warning, limit, assumption, and source.")}
          </p>
        </div>
        <div className="page-header__actions">
          <input
            accept=".json,application/json"
            aria-label={text("打开规范 MVP Case JSON", "Open canonical MVP case JSON")}
            className="sr-only"
            onChange={(event) => { void openCase(event); }}
            ref={fileInputRef}
            type="file"
          />
          <button className="button button--secondary" disabled={opening} onClick={() => fileInputRef.current?.click()} type="button">
            {opening ? text("正在打开…", "Opening…") : text("打开 Case", "Open case")}
          </button>
          <button className="button button--secondary" onClick={resetCase} type="button">{text("新建 / 重置", "New / reset")}</button>
          <button className="button button--secondary" onClick={save} type="button">{text("保存 Case JSON", "Save case JSON")}</button>
          <button className="button button--primary" onClick={calculate} type="button">{text("计算", "Calculate")}</button>
        </div>
      </header>

      <div className="scope-banner scope-banner--mvp" role="note">
        <strong>{text("安全边界", "Safety boundary")}</strong>
        <span>{text("当前可调用路线通过受控 MVP 适配器执行。正式方法注册表激活状态仍为 false；UI 不提供任何公式、材料属性、阈值或输入默认值。", "The callable routes execute through the controlled MVP adapter. Formal method-registry activation remains false; no formula, material property, threshold, or input value is supplied by the UI.")}</span>
      </div>

      {notice === null ? null : (
        <div className={`message message--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <strong>{notice.title}</strong><p>{notice.detail}</p>
        </div>
      )}

      <section aria-labelledby="case-identity-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">{text("步骤 1", "Step 1")}</p><h2 id="case-identity-title">{text("Case 标识", "Case identity")}</h2></div>
          <span className="text-badge">{text("本地 Case", "local case")}</span>
        </div>
        <div className="case-identity-fields">
          <div className="calculator-field">
            <label htmlFor="mvp-case-id"><span>Case ID<span aria-label={text("必填", "required")} className="required-mark"> *</span></span></label>
            <input id="mvp-case-id" onChange={(event) => { setCaseId(event.currentTarget.value); clearOutcome(); }} placeholder={text("使用字母、数字、点、下划线或连字符的稳定标识", "Stable letters, digits, dot, underscore, or hyphen")} type="text" value={caseId} />
            <p>{text("规范 Case 快照使用的稳定标识。", "Stable identity used by the canonical case snapshot.")}</p>
          </div>
          <div className="calculator-field">
            <label htmlFor="mvp-case-name"><span>{text("Case 名称", "Case name")}<span aria-label={text("必填", "required")} className="required-mark"> *</span></span></label>
            <input id="mvp-case-name" onChange={(event) => { setCaseName(event.currentTarget.value); clearOutcome(); }} placeholder={text("描述性的工程 Case 名称", "Descriptive engineering case name")} type="text" value={caseName} />
            <p>{text("便于阅读的名称，不能为空。", "Human-readable name; it must not be blank.")}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="method-selection-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">{text("步骤 2", "Step 2")}</p><h2 id="method-selection-title">{text("选择受控方法", "Select controlled methods")}</h2></div>
          <span className="selection-count">{text(`已选择 ${selectedMethodIds.length.toString()} 个`, `${selectedMethodIds.length.toString()} selected`)}</span>
        </div>
        <div className="method-selection-grid">
          {methods.map((method) => (
            <label className={selectedMethodIds.includes(method.methodId) ? "method-choice is-selected" : "method-choice"} key={method.methodId}>
              <input checked={selectedMethodIds.includes(method.methodId)} onChange={() => toggleMethod(method.methodId)} type="checkbox" />
              <span className="method-choice__identity"><strong>{method.methodId}</strong><span>{text("模块", "Module")} {method.moduleId}</span></span>
              <span className="method-choice__copy">
                <strong>{language === "zh-CN" ? method.name.zh : method.name.en}</strong>
                <small lang={language === "zh-CN" ? "en" : "zh-Hans"}>{language === "zh-CN" ? method.name.en : method.name.zh}</small>
                <small>{controlledValueLabel(method.approvalStatus, language)}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="method-inputs-title" className="calculator-inputs-section">
        <div className="calculator-section-heading">
          <div><p className="eyebrow">{text("步骤 3", "Step 3")}</p><h2 id="method-inputs-title">{text("工程输入", "Engineering inputs")}</h2></div>
          <p>{text("所有数值字段均使用所示规范单位。留空或未勾选的字段保持未知或未确认状态。", "All numeric fields use the canonical unit shown. Blank and unchecked fields remain unknown or unconfirmed.")}</p>
        </div>
        {selectedMethods.length === 0 ? (
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>{text("尚未选择方法", "No method selected")}</strong><p>{text("请至少选择一个受控方法以显示其准确输入合同。", "Select at least one controlled method to expose its exact input contract.")}</p></div></div>
        ) : selectedMethods.map((method) => (
          <MethodInputPanel
            key={method.methodId}
            method={method}
            onFieldChange={(fieldId, value) => updateField(method.methodId, fieldId, value)}
            values={formState[method.methodId] ?? {}}
          />
        ))}
        <div className="calculator-action-row">
          <span>{text("只有点击“计算”后才会生成结果。", "Results are computed only when you press Calculate.")}</span>
          <button className="button button--primary button--calculate" onClick={calculate} type="button">{text("计算所选方法", "Calculate selected methods")}</button>
        </div>
      </section>

      <section aria-labelledby="calculation-results-title" className="calculator-results-section">
        <div className="calculator-section-heading">
          <div><p className="eyebrow">{text("步骤 4", "Step 4")}</p><h2 id="calculation-results-title">{text("计算结果", "Calculation results")}</h2></div>
          <p>{successfulCalculation === null ? text("当前没有结果快照。", "No current result snapshot.") : `${text("快照", "Snapshot")} ${successfulCalculation.snapshotId}`}</p>
        </div>
        {calculation === null ? (
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>{text("尚未执行计算", "No calculation run")}</strong><p>{text("请完成明确输入并点击“计算”。缺失证据会被报告，绝不会被猜测或补默认值。", "Complete the explicit inputs and press Calculate. Missing evidence is reported, never guessed.")}</p></div></div>
        ) : calculation.status === "invalid_input" ? (
          <FailureBlock failure={calculation.failure} />
        ) : (
          <>
            {calculation.results.length > 1 ? <div className="comparison-note">{text("方法并排查看 · 所选结果共享同一个 Case 快照；仅可比较工程含义和边界等价的输出。", "Method comparison view · all selected results share this case snapshot; compare only outputs with equivalent engineering meaning and boundaries.")}</div> : null}
            <div className="calculation-results-grid">{calculation.results.map((result) => <ResultCard key={result.methodId} result={result} />)}</div>
          </>
        )}
      </section>

      <section aria-labelledby="remaining-gates-title" className="data-panel calculator-section remaining-gates">
        <div className="panel-heading"><div><p className="eyebrow">{text("保留的发布门禁", "Preserved release gates")}</p><h2 id="remaining-gates-title">{text("此 MVP 中仍不可用", "Still unavailable in this MVP")}</h2></div></div>
        <ul className="capability-list">
          {application.reference.capabilities.filter((capability) => !capability.available).map((capability) => (
            <li key={capability.id}><span className="status-pill status-pill--gated">{text("不可用", "Unavailable")}</span><div><strong>{capabilityLabel(capability.id, capability.label, language)}</strong><p>{capabilityReason(capability.id, capability.reason, language)}</p></div></li>
          ))}
        </ul>
        <p className="remaining-gates__note">{text("请在“方法就绪状态”中查看每个不可调用方法及其正式运行阻断原因。", "See Method Readiness for every non-callable method and its formal runtime block reason.")}</p>
      </section>
    </section>
  );
}
