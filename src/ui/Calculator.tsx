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

function resultStatusLabel(status: UiMvpMethodResult["status"]): string {
  return status.replaceAll("_", " ");
}

function methodLabel(method: UiMvpRunnableMethodDefinition): string {
  return `${method.methodId} · ${method.name.en}`;
}

function outputValue(value: UiMvpMethodResult["outputs"][number]["value"]): string {
  if (value === null) return "Unavailable";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 10 }).format(value);
  }
  const numberFormat = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 10 });
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
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
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
          <span>{field.label}</span>
        </label>
        <p id={descriptionId}>{field.description} Unchecked means not confirmed.</p>
      </div>
    );
  }

  return (
    <div className="calculator-field">
      <label htmlFor={inputId}>
        <span>{field.label}{field.required ? <span aria-label="required" className="required-mark"> *</span> : null}</span>
        {field.unit === null ? null : <code>{field.unit}</code>}
      </label>
      {field.kind === "select" ? (
        <select
          aria-describedby={descriptionId}
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={typeof value === "string" ? value : ""}
        >
          <option value="">Not confirmed</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
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
        {field.description}
        {field.kind === "number_list_optional" ? " Use comma-separated canonical-SI values, [] for confirmed none, or leave blank for explicit unknown." : ""}
      </p>
      <span className="field-boundary">{methodId} controlled input · no inferred default</span>
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
  return (
    <details className="method-input-panel" open>
      <summary>
        <span><strong>{methodLabel(method)}</strong><small lang="zh-Hans">{method.name.zh}</small></span>
        <span className="module-badge">Module {method.moduleId}</span>
      </summary>
      <div className="method-input-panel__context">
        <p>{method.purpose}</p>
        <span>{method.approvalStatus.replaceAll("_", " ")} · adapter {method.methodVersion}</span>
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
        <strong>Applicability limits retained</strong>
        <ul>{method.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </details>
  );
}

function FailureBlock({ failure }: { readonly failure: UiMvpFailure }) {
  return (
    <div className="result-failure" role="alert">
      <strong>{failure.code}</strong>
      <p>{failure.message}</p>
      <p><b>Action:</b> {failure.action}</p>
    </div>
  );
}

function ResultCard({ result }: { readonly result: UiMvpMethodResult }) {
  return (
    <article className="calculation-result-card">
      <header>
        <div>
          <p className="eyebrow">Controlled method result</p>
          <h3>{result.methodId}</h3>
        </div>
        <span className={`result-status result-status--${result.status}`}>{resultStatusLabel(result.status)}</span>
      </header>
      <p className="registry-boundary-note">
        Controlled MVP adapter result · formal registry activation remains <strong>false</strong>.
      </p>
      {result.failure === null ? null : <FailureBlock failure={result.failure} />}
      <section aria-label={`${result.methodId} outputs`} className="result-output-grid">
        {result.outputs.map((output) => (
          <div className={output.status === "available" ? "result-output" : "result-output result-output--unavailable"} key={output.outputId}>
            <span>{output.label.en}</span>
            <strong>{outputValue(output.value)}</strong>
            <code>{output.canonicalUnitId ?? "unitless"}</code>
            {output.reason === null ? null : <p>{output.reason}</p>}
          </div>
        ))}
      </section>
      <dl className="result-evidence">
        <div><dt>Applicability</dt><dd><strong>{result.applicability.status.replaceAll("_", " ")}</strong> · {result.applicability.scope}</dd></div>
        <div><dt>Approval</dt><dd>{result.approvalStatus.replaceAll("_", " ")} · {result.methodVersion}</dd></div>
      </dl>
      {result.warnings.length === 0 ? null : (
        <section className="result-list result-list--warning">
          <strong>Warnings</strong>
          <ul>{result.warnings.map((warning, index) => (
            <li key={`${warning.code ?? "warning"}-${String(index)}`}>
              {warning.code === null ? null : <code>{warning.code}</code>} {warning.message}
              {warning.predicate === null ? null : <small>Predicate: {warning.predicate}</small>}
            </li>
          ))}</ul>
        </section>
      )}
      <section className="result-list">
        <strong>Applicability limits</strong>
        <ul>{result.applicability.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="result-list">
        <strong>Assumptions</strong>
        {result.assumptions.length === 0 ? <p>None reported.</p> : <ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>
      <section className="result-list result-list--sources">
        <strong>Method sources</strong>
        {result.sources.length === 0 ? <p>No result source was reported.</p> : <ul>{result.sources.map((item) => <li key={item}><code>{item}</code></li>)}</ul>}
      </section>
    </article>
  );
}

export function CalculatorPage({ application }: CalculatorPageProps) {
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
      ? { tone: "success", title: "Calculation completed", detail: `${result.results.length.toString()} controlled method result(s) produced for snapshot ${result.snapshotId}.` }
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
    setNotice({ tone: "success", title: "Canonical case saved", detail: `Snapshot ${result.snapshotId} was downloaded as local JSON.` });
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
        setNotice({ tone: "error", title: `Open rejected · ${result.code}`, detail: result.message });
        return;
      }
      setCaseId(result.workspace.caseId);
      setCaseName(result.workspace.caseName);
      setSelectedMethodIds(result.workspace.selectedMethodIds);
      setFormState(restoreMvpFormState(methods, result.workspace.methodInputs));
      setCalculation(null);
      setNotice({ tone: "success", title: "Canonical case opened", detail: `${file.name} restored snapshot ${result.snapshotId}. Recalculate to produce current results.` });
    } catch {
      setNotice({ tone: "error", title: "Open failed", detail: "The selected local file could not be read as text." });
    } finally {
      setOpening(false);
    }
  }

  const successfulCalculation = calculation?.status === "success" ? calculation : null;

  return (
    <section aria-labelledby="calculator-title" className="page calculator-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Runnable MVP · controlled adapter</p>
          <h1 id="calculator-title">Engineering Calculator</h1>
          <p className="page-header__description">
            Create a case, enter explicit canonical-SI inputs, select approved routes, calculate, and retain every warning, limit, assumption, and source.
          </p>
        </div>
        <div className="page-header__actions">
          <input
            accept=".json,application/json"
            aria-label="Open canonical MVP case JSON"
            className="sr-only"
            onChange={(event) => { void openCase(event); }}
            ref={fileInputRef}
            type="file"
          />
          <button className="button button--secondary" disabled={opening} onClick={() => fileInputRef.current?.click()} type="button">
            {opening ? "Opening…" : "Open case"}
          </button>
          <button className="button button--secondary" onClick={resetCase} type="button">New / reset</button>
          <button className="button button--secondary" onClick={save} type="button">Save case JSON</button>
          <button className="button button--primary" onClick={calculate} type="button">Calculate</button>
        </div>
      </header>

      <div className="scope-banner scope-banner--mvp" role="note">
        <strong>Safety boundary</strong>
        <span>These six callable routes execute through the Phase 5B controlled MVP adapter. Formal method-registry activation remains false; no formula, material property, threshold, or input value is supplied by the UI.</span>
      </div>

      {notice === null ? null : (
        <div className={`message message--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <strong>{notice.title}</strong><p>{notice.detail}</p>
        </div>
      )}

      <section aria-labelledby="case-identity-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">Step 1</p><h2 id="case-identity-title">Case identity</h2></div>
          <span className="text-badge">local case</span>
        </div>
        <div className="case-identity-fields">
          <div className="calculator-field">
            <label htmlFor="mvp-case-id"><span>Case ID<span aria-label="required" className="required-mark"> *</span></span></label>
            <input id="mvp-case-id" onChange={(event) => { setCaseId(event.currentTarget.value); clearOutcome(); }} placeholder="Stable letters, digits, dot, underscore, or hyphen" type="text" value={caseId} />
            <p>Stable identity used by the canonical case snapshot.</p>
          </div>
          <div className="calculator-field">
            <label htmlFor="mvp-case-name"><span>Case name<span aria-label="required" className="required-mark"> *</span></span></label>
            <input id="mvp-case-name" onChange={(event) => { setCaseName(event.currentTarget.value); clearOutcome(); }} placeholder="Descriptive engineering case name" type="text" value={caseName} />
            <p>Human-readable name; it must not be blank.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="method-selection-title" className="data-panel calculator-section">
        <div className="panel-heading">
          <div><p className="eyebrow">Step 2</p><h2 id="method-selection-title">Select controlled methods</h2></div>
          <span className="selection-count">{selectedMethodIds.length} selected</span>
        </div>
        <div className="method-selection-grid">
          {methods.map((method) => (
            <label className={selectedMethodIds.includes(method.methodId) ? "method-choice is-selected" : "method-choice"} key={method.methodId}>
              <input checked={selectedMethodIds.includes(method.methodId)} onChange={() => toggleMethod(method.methodId)} type="checkbox" />
              <span className="method-choice__identity"><strong>{method.methodId}</strong><span>Module {method.moduleId}</span></span>
              <span className="method-choice__copy"><strong>{method.name.en}</strong><small lang="zh-Hans">{method.name.zh}</small><small>{method.approvalStatus.replaceAll("_", " ")}</small></span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="method-inputs-title" className="calculator-inputs-section">
        <div className="calculator-section-heading">
          <div><p className="eyebrow">Step 3</p><h2 id="method-inputs-title">Engineering inputs</h2></div>
          <p>All numeric fields use the canonical unit shown. Blank and unchecked fields remain unknown or unconfirmed.</p>
        </div>
        {selectedMethods.length === 0 ? (
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>No method selected</strong><p>Select at least one controlled method to expose its exact input contract.</p></div></div>
        ) : selectedMethods.map((method) => (
          <MethodInputPanel
            key={method.methodId}
            method={method}
            onFieldChange={(fieldId, value) => updateField(method.methodId, fieldId, value)}
            values={formState[method.methodId] ?? {}}
          />
        ))}
        <div className="calculator-action-row">
          <span>Results are computed only when you press Calculate.</span>
          <button className="button button--primary button--calculate" onClick={calculate} type="button">Calculate selected methods</button>
        </div>
      </section>

      <section aria-labelledby="calculation-results-title" className="calculator-results-section">
        <div className="calculator-section-heading">
          <div><p className="eyebrow">Step 4</p><h2 id="calculation-results-title">Calculation results</h2></div>
          <p>{successfulCalculation === null ? "No current result snapshot." : `Snapshot ${successfulCalculation.snapshotId}`}</p>
        </div>
        {calculation === null ? (
          <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>No calculation run</strong><p>Complete the explicit inputs and press Calculate. Missing evidence is reported, never guessed.</p></div></div>
        ) : calculation.status === "invalid_input" ? (
          <FailureBlock failure={calculation.failure} />
        ) : (
          <>
            {calculation.results.length > 1 ? <div className="comparison-note">Method comparison view · all selected results share this case snapshot; compare only outputs with equivalent engineering meaning and boundaries.</div> : null}
            <div className="calculation-results-grid">{calculation.results.map((result) => <ResultCard key={result.methodId} result={result} />)}</div>
          </>
        )}
      </section>

      <section aria-labelledby="remaining-gates-title" className="data-panel calculator-section remaining-gates">
        <div className="panel-heading"><div><p className="eyebrow">Preserved release gates</p><h2 id="remaining-gates-title">Still unavailable in this MVP</h2></div></div>
        <ul className="capability-list">
          {application.reference.capabilities.filter((capability) => !capability.available).map((capability) => (
            <li key={capability.id}><span className="status-pill status-pill--gated">Unavailable</span><div><strong>{capability.label}</strong><p>{capability.reason}</p></div></li>
          ))}
        </ul>
        <p className="remaining-gates__note">See Method Readiness for every non-callable method and its formal runtime block reason.</p>
      </section>
    </section>
  );
}
