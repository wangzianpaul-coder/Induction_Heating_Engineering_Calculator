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
  controlledValueLabel,
  fieldDescription,
  fieldHelp,
  fieldLabel,
  limitationText,
  methodApplicabilityScope,
  methodDisplayName,
  methodPurpose,
  methodSourceSummary,
  moduleLabel,
  optionLabel,
  publicFacingText,
  resultOutputLabel,
  unitSymbol,
  userResultText,
  useUiLanguage,
  type UiLanguage,
} from "./i18n.js";
import { HelpTooltip } from "./HelpTooltip.js";
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
  return methodDisplayName(method.methodId, method.name, language);
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
  value,
  onChange,
}: {
  readonly field: UiMvpInputFieldDefinition;
  readonly value: UiMvpRawFieldValue;
  readonly onChange: (value: UiMvpRawFieldValue) => void;
}) {
  const { language, text } = useUiLanguage();
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const label = fieldLabel(field.id, field.label, language);
  const description = fieldDescription(field.id, field.description, language);
  const help = fieldHelp(field.id, field.description, field.kind, language);
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
          <span className="calculator-field__label-copy">{label}<HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={label} /></span>
        </label>
        <p>{description} {text("未勾选表示尚未确认。", "Unchecked means not confirmed.")}</p>
      </div>
    );
  }

  return (
    <div className="calculator-field">
      <label htmlFor={inputId}>
        <span className="calculator-field__label-copy">
          {label}{field.required ? <span aria-label={text("必填", "required")} className="required-mark"> *</span> : null}
          <HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={label} />
        </span>
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
          placeholder={field.kind === "number_list_optional" ? text("例如：0.25, 0.25", "Example: 0.25, 0.25") : ""}
          step={field.kind === "number" ? "any" : undefined}
          type={field.kind === "number" ? "number" : "text"}
          value={typeof value === "string" ? value : ""}
        />
      )}
      <p>
        {description}
        {field.kind === "number_list_optional" ? text(" 使用逗号分隔的规范 SI 数值；[] 表示确认没有；留空表示明确未知。", " Use comma-separated canonical-SI values, [] for confirmed none, or leave blank for explicit unknown.") : ""}
      </p>
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
          {language === "en" ? <small lang="zh-Hans">{method.name.zh}</small> : null}
        </span>
        <span className="module-badge">{moduleLabel(method.moduleId, language)}</span>
      </summary>
      <div className="method-input-panel__context">
        <p>{methodPurpose(method.methodId, method.purpose, language)}</p>
        <span>{text("已通过当前版本的计算校验", "Validated for calculation in this release")}</span>
      </div>
      <div className="calculator-fields">
        {method.fields.map((field) => (
          <FieldControl
            field={field}
            key={field.id}
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
  const { language, text } = useUiLanguage();
  return (
    <div className="result-failure" role="alert">
      <strong>{text("计算未完成", "Calculation not completed")} · {text("错误代码", "Error code")}: {failure.code}</strong>
      <p>{language === "zh-CN" ? "请检查必填项、单位、数据来源和确认项，修正后重新计算。" : failure.message}</p>
      {language === "zh-CN" ? null : <p><b>Action:</b> {failure.action}</p>}
    </div>
  );
}

function ResultCard({ result, method }: {
  readonly result: UiMvpMethodResult;
  readonly method: UiMvpRunnableMethodDefinition | undefined;
}) {
  const { language, text } = useUiLanguage();
  const resultName = method === undefined
    ? text("工程计算结果", "Engineering calculation result")
    : methodLabel(method, language);
  return (
    <article className="calculation-result-card">
      <header>
        <div>
          <p className="eyebrow">{text("工程计算结果", "Engineering result")}</p>
          <h3>{resultName}</h3>
        </div>
        <span className={`result-status result-status--${result.status}`}>{resultStatusLabel(result.status, language)}</span>
      </header>
      {result.failure === null ? null : <FailureBlock failure={result.failure} />}
      <section aria-label={`${resultName} ${text("输出", "outputs")}`} className="result-output-grid">
        {result.outputs.map((output) => (
          <div className={output.status === "available" ? "result-output" : "result-output result-output--unavailable"} key={output.outputId}>
            <span>{resultOutputLabel(output.outputId, output.label, language)}</span>
            <strong>{outputValue(output.value, language)}</strong>
            <code>{unitSymbol(output.canonicalUnitId, language)}</code>
            {output.reason === null ? null : <p>{userResultText(output.reason, language)}</p>}
          </div>
        ))}
      </section>
      <dl className="result-evidence">
        <div><dt>{text("适用性", "Applicability")}</dt><dd><strong>{controlledValueLabel(result.applicability.status, language)}</strong> · {methodApplicabilityScope(result.methodId, language)}</dd></div>
        <div><dt>{text("结果状态", "Result status")}</dt><dd>{text("已按当前输入完成计算", "Calculated from the current inputs")}</dd></div>
      </dl>
      {result.warnings.length === 0 ? null : (
        <section className="result-list result-list--warning">
          <strong>{text("注意事项", "Warnings")}</strong>
          <ul>{result.warnings.map((warning, index) => (
            <li key={`${warning.code ?? "warning"}-${String(index)}`}>
              {userResultText(warning.message, language)}
            </li>
          ))}</ul>
        </section>
      )}
      <section className="result-list">
        <strong>{text("适用限制", "Applicability limits")}</strong>
        <ul>{result.applicability.limitations.map((item) => <li key={item}>{publicFacingText(limitationText(item, language), language)}</li>)}</ul>
      </section>
      <section className="result-list">
        <strong>{text("假设", "Assumptions")}</strong>
        {result.assumptions.length === 0
          ? <p>{text("没有额外假设。", "No additional assumptions were reported.")}</p>
          : <ul>{result.assumptions.map((item) => <li key={item}>{userResultText(item, language)}</li>)}</ul>}
      </section>
      <section className="result-list result-list--sources">
        <strong>{text("计算依据", "Calculation basis")}</strong>
        <p>{methodSourceSummary(result.methodId, language)}</p>
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
            `已生成 ${result.results.length.toString()} 组工程计算结果。`,
            `${result.results.length.toString()} engineering result(s) were produced.`,
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
      title: text("方案已保存", "Case saved"),
      detail: text("方案文件已下载到本地。", "The case file was downloaded locally."),
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
        title: text("方案已打开", "Case opened"),
        detail: text(
          `${file.name} 已恢复。请重新计算以生成当前结果。`,
          `${file.name} was restored. Recalculate to produce current results.`,
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
          <p className="eyebrow">{text("0.9 测试版", "Version 0.9 test release")}</p>
          <h1 id="calculator-title">{text("感应加热工程计算器", "Engineering Calculator")}</h1>
          <p className="page-header__description">
            {text("创建方案，填写工程参数并选择计算功能；结果会同时显示单位、注意事项、适用范围和计算依据。", "Create a case, enter engineering inputs, select calculations, and review units, warnings, applicability, and calculation basis.")}
          </p>
        </div>
        <div className="page-header__actions">
          <input
            accept=".json,application/json"
            aria-label={text("打开方案文件", "Open case file")}
            className="sr-only"
            onChange={(event) => { void openCase(event); }}
            ref={fileInputRef}
            type="file"
          />
          <button className="button button--secondary" disabled={opening} onClick={() => fileInputRef.current?.click()} type="button">
            {opening ? text("正在打开…", "Opening…") : text("打开方案", "Open case")}
          </button>
          <button className="button button--secondary" onClick={resetCase} type="button">{text("新建 / 重置", "New / reset")}</button>
          <button className="button button--secondary" onClick={save} type="button">{text("保存方案", "Save case")}</button>
          <button className="button button--primary" onClick={calculate} type="button">{text("计算", "Calculate")}</button>
        </div>
      </header>

      <div className="scope-banner scope-banner--mvp" role="note">
        <strong>{text("填写原则", "Input principle")}</strong>
        <span>{text("软件不会猜测材料物性、工况或缺失尺寸。请使用与当前设备一致的图纸、实测或经确认的工程资料。", "The software does not guess material properties, operating conditions, or missing dimensions. Use drawings, measurements, or reviewed engineering records for the current equipment.")}</span>
      </div>

      {notice === null ? null : (
        <div className={`message message--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <strong>{notice.title}</strong><p>{notice.detail}</p>
        </div>
      )}

      <section aria-labelledby="case-identity-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">{text("步骤 1", "Step 1")}</p><h2 id="case-identity-title">{text("方案信息", "Case information")}</h2></div>
          <span className="text-badge">{text("本地保存", "saved locally")}</span>
        </div>
        <div className="case-identity-fields">
          <div className="calculator-field">
            <label htmlFor="mvp-case-id"><span className="calculator-field__label-copy">{text("方案编号", "Case number")}<span aria-label={text("必填", "required")} className="required-mark"> *</span><HelpTooltip content={{ what: text("用于区分不同计算方案的简短编号。", "A short number used to distinguish this case."), how: text("可填写项目号加方案序号，例如 coil-test-01。", "Use a project number and case sequence, for example coil-test-01."), impact: text("只影响方案保存和重新打开，不参与工程公式。", "It affects saving and reopening only, not engineering equations.") }} descriptionId="mvp-case-id-description" fieldLabel={text("方案编号", "Case number")} /></span></label>
            <input aria-describedby="mvp-case-id-description" id="mvp-case-id" onChange={(event) => { setCaseId(event.currentTarget.value); clearOutcome(); }} placeholder={text("例如：coil-test-01", "Example: coil-test-01")} type="text" value={caseId} />
            <p>{text("用于保存和重新打开方案，不参与计算。", "Used to save and reopen the case; it is not part of the calculation.")}</p>
          </div>
          <div className="calculator-field">
            <label htmlFor="mvp-case-name"><span className="calculator-field__label-copy">{text("方案名称", "Case name")}<span aria-label={text("必填", "required")} className="required-mark"> *</span><HelpTooltip content={{ what: text("便于人阅读的方案名称。", "A human-readable case name."), how: text("写明设备、线圈或工况，例如“中频炉三匝线圈试算”。", "Describe the equipment, coil, or operating condition."), impact: text("只用于识别和保存方案，不改变计算结果。", "It identifies the saved case and does not change results.") }} descriptionId="mvp-case-name-description" fieldLabel={text("方案名称", "Case name")} /></span></label>
            <input aria-describedby="mvp-case-name-description" id="mvp-case-name" onChange={(event) => { setCaseName(event.currentTarget.value); clearOutcome(); }} placeholder={text("例如：中频炉三匝线圈试算", "Example: three-turn induction-coil trial")} type="text" value={caseName} />
            <p>{text("便于阅读的名称，不能为空。", "Human-readable name; it must not be blank.")}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="method-selection-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">{text("步骤 2", "Step 2")}</p><h2 id="method-selection-title">{text("选择计算功能", "Select calculations")}</h2></div>
          <span className="selection-count">{text(`已选择 ${selectedMethodIds.length.toString()} 个`, `${selectedMethodIds.length.toString()} selected`)}</span>
        </div>
        <div className="method-selection-grid">
          {methods.map((method) => (
            <label className={selectedMethodIds.includes(method.methodId) ? "method-choice is-selected" : "method-choice"} key={method.methodId}>
              <input checked={selectedMethodIds.includes(method.methodId)} onChange={() => toggleMethod(method.methodId)} type="checkbox" />
              <span className="method-choice__copy">
                <strong>{methodDisplayName(method.methodId, method.name, language)}</strong>
                <small>{moduleLabel(method.moduleId, language)}</small>
                <small>{text("可计算", "Available")}</small>
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
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>{text("尚未选择计算功能", "No calculation selected")}</strong><p>{text("请至少选择一个计算功能，以显示需要填写的工程参数。", "Select at least one calculation to show its required engineering inputs.")}</p></div></div>
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
          <p>{successfulCalculation === null ? text("当前没有计算结果。", "No current calculation result.") : text("已生成当前方案的计算结果。", "Results are available for the current case.")}</p>
        </div>
        {calculation === null ? (
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>{text("尚未执行计算", "No calculation run")}</strong><p>{text("请完成明确输入并点击“计算”。缺失证据会被报告，绝不会被猜测或补默认值。", "Complete the explicit inputs and press Calculate. Missing evidence is reported, never guessed.")}</p></div></div>
        ) : calculation.status === "invalid_input" ? (
          <FailureBlock failure={calculation.failure} />
        ) : (
          <>
            {calculation.results.length > 1 ? <div className="comparison-note">{text("并排查看 · 这些结果来自同一份方案输入；只有含义和边界相同的结果才可以直接比较。", "Side-by-side view · these results share the same case inputs; directly compare only outputs with equivalent meaning and boundaries.")}</div> : null}
            <div className="calculation-results-grid">{calculation.results.map((result) => <ResultCard key={result.methodId} method={methods.find((method) => method.methodId === result.methodId)} result={result} />)}</div>
          </>
        )}
      </section>

    </section>
  );
}
