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
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}

const PRIMARY_PAGES: readonly PageDefinition[] = [
  {
    id: "calculator",
    label: "Calculator",
    shortLabel: "Σ",
    description: "Create, calculate, save, and reopen cases",
  },
  {
    id: "parameters",
    label: "Parameters",
    shortLabel: "P",
    description: "Controlled definitions and units",
  },
  {
    id: "methods",
    label: "Method Readiness",
    shortLabel: "M",
    description: "Contracts, evidence, and release gates",
  },
  {
    id: "case",
    label: "Case Inspector",
    shortLabel: "C",
    description: "Validate and inspect a case file",
  },
  {
    id: "about",
    label: "About / Versions",
    shortLabel: "V",
    description: "Frozen software identity",
  },
] as const;

interface AppProps {
  readonly application: EngineeringUiApplication;
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
  if (parameter === undefined) {
    return (
      <aside className="detail-panel" aria-label="Parameter details">
        <EmptyState title="No parameter selected">
          Select a row to inspect its controlled definition, units, applicability, and source references.
        </EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="parameter-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">Parameter detail</p>
          <h2 id="parameter-detail-title">{parameter.id}</h2>
        </div>
        <span className="module-badge">Module {parameter.module}</span>
      </div>
      <p className="detail-panel__name">
        <span className="parameter-symbol">{parameter.symbol}</span>
        {parameter.name}
      </p>
      <p className="localized-name" lang="zh-Hans">{parameter.localizedName}</p>
      <DefinitionList>
        <DefinitionItem term="Definition">{parameter.definition}</DefinitionItem>
        <DefinitionItem term="Applicability">{parameter.applicability}</DefinitionItem>
        <DefinitionItem term="Physical range"><code>{parameter.physicalRange}</code></DefinitionItem>
        <DefinitionItem term="Dimension">{humanize(parameter.dimension)}</DefinitionItem>
        <DefinitionItem term="Canonical SI unit"><code>{parameter.canonicalUnit}</code></DefinitionItem>
        <DefinitionItem term="Display units">
          {parameter.displayUnits.length === 0 ? "None declared" : parameter.displayUnits.join(", ")}
        </DefinitionItem>
        <DefinitionItem term="Role / requirement">
          {humanize(parameter.role)} / {humanize(parameter.requirement)}
        </DefinitionItem>
        <DefinitionItem term="Default policy">{parameter.defaultPolicy}</DefinitionItem>
        <DefinitionItem term="Consuming methods">
          {parameter.consumingMethods.length === 0 ? "None declared" : parameter.consumingMethods.join(", ")}
        </DefinitionItem>
        <DefinitionItem term="Source references">
          {parameter.sourceReferences.length === 0 ? "None declared" : parameter.sourceReferences.join(", ")}
        </DefinitionItem>
      </DefinitionList>
      <div className="detail-note">
        <strong>Controlled help</strong>
        <p>{parameter.help}</p>
      </div>
    </aside>
  );
}

function ParametersPage({ model }: { readonly model: UiReferenceModel }) {
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
      <PageHeader eyebrow="Controlled metadata" title="Parameter Definition" titleId="parameters-title">
        Search the frozen parameter dictionary. This metadata page remains read-only; calculations are performed only in the controlled Calculator workspace.
      </PageHeader>
      <div className="scope-banner" role="note">
        <strong>Metadata only</strong>
        <span>No input values are accepted here, and no engineering result is calculated.</span>
      </div>
      <div className="summary-grid summary-grid--three" aria-label="Parameter summary">
        <SummaryCard label="Controlled records" value={model.parameters.length} note="Public application view" />
        <SummaryCard label="Owner modules" value={modules.length} note="Available in this registry" />
        <SummaryCard label="Selected module" value={moduleFilter === "all" ? "All" : moduleFilter} note={`${filtered.length.toString()} visible records`} />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label="Parameter registry">
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>Search parameters</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder="ID, symbol, name, unit, method…"
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>Module</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">All modules</option>
                {modules.map((module) => <option key={module} value={module}>Module {module}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={requirementId}>Requirement</label>
              <select id={requirementId} onChange={(event) => setRequirementFilter(event.currentTarget.value)} value={requirementFilter}>
                <option value="all">All requirements</option>
                {requirements.map((requirement) => (
                  <option key={requirement} value={requirement}>{humanize(requirement)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-caption" aria-live="polite">
            <strong>{filtered.length}</strong> of {model.parameters.length} parameters
          </div>
          <div className="table-scroll" tabIndex={0} aria-label="Scrollable parameter table">
            <table>
              <caption className="sr-only">Controlled engineering parameters</caption>
              <thead>
                <tr>
                  <th scope="col">Parameter ID</th>
                  <th scope="col">Symbol</th>
                  <th scope="col">Engineering name</th>
                  <th scope="col">Module</th>
                  <th scope="col">SI unit</th>
                  <th scope="col">Requirement</th>
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
                      <span className="cell-primary">{parameter.name}</span>
                      <span className="cell-secondary" lang="zh-Hans">{parameter.localizedName}</span>
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
            <EmptyState title="No matching parameters">Clear or broaden the current search and filters.</EmptyState>
          ) : null}
        </section>
        <ParameterDetail parameter={selected} />
      </div>
    </section>
  );
}

function MethodDetail({ method }: { readonly method: UiMethodRecord | undefined }) {
  if (method === undefined) {
    return (
      <aside className="detail-panel" aria-label="Method details">
        <EmptyState title="No method selected">Select a method to inspect its contract and release gate.</EmptyState>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-labelledby="method-detail-title">
      <div className="detail-panel__header">
        <div>
          <p className="eyebrow">Method contract</p>
          <h2 id="method-detail-title">{method.id}</h2>
        </div>
        <span className="module-badge">Module {method.module}</span>
      </div>
      <p className="detail-panel__name">{method.name}</p>
      <p className="localized-name" lang="zh-Hans">{method.localizedName}</p>
      <p className="method-purpose">{method.purpose}</p>
      <div className="gate-callout">
        <StatusPill enabled={method.executionEnabled}>{method.executionStatus}</StatusPill>
        <p>{method.executionReason}</p>
      </div>
      <DefinitionList>
        <DefinitionItem term="Method version"><code>{method.methodVersion}</code></DefinitionItem>
        <DefinitionItem term="Approval">{humanize(method.approvalStatus)}</DefinitionItem>
        <DefinitionItem term="Lifecycle">{humanize(method.lifecycleStatus)}</DefinitionItem>
        <DefinitionItem term="Method type">{humanize(method.methodType)}</DefinitionItem>
        <DefinitionItem term="Scientific confidence">{method.scientificConfidence}</DefinitionItem>
        <DefinitionItem term="Recommendation">{method.recommendation}</DefinitionItem>
        <DefinitionItem term="Submethod split required">{method.requiresSubmethodSplit ? "Yes" : "No"}</DefinitionItem>
        <DefinitionItem term="Implementation available">{method.implementationAvailable ? "Yes" : "No"}</DefinitionItem>
        <DefinitionItem term="Inputs">{method.inputs.length === 0 ? "None declared" : method.inputs.join(", ")}</DefinitionItem>
        <DefinitionItem term="Outputs">{method.outputs.length === 0 ? "None declared" : method.outputs.join(", ")}</DefinitionItem>
      </DefinitionList>
    </aside>
  );
}

function MethodsPage({ model }: { readonly model: UiReferenceModel }) {
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
      <PageHeader eyebrow="Release evidence" title="Method Readiness" titleId="methods-title">
        Inspect frozen contracts, lifecycle state, and explicit runtime release gates. Readiness is never inferred by the UI.
      </PageHeader>
      <div className="summary-grid summary-grid--three" aria-label="Method readiness summary">
        <SummaryCard label="Catalogued methods" value={model.methods.length} note="Controlled top-level IDs" />
        <SummaryCard label="Runtime enabled" value={executableCount} note="Reported by the application boundary" />
        <SummaryCard label="Release gated" value={model.methods.length - executableCount} note="Reason retained per method" />
      </div>
      <div className="workspace-grid">
        <section className="data-panel" aria-label="Method readiness registry">
          <div className="toolbar" role="search">
            <div className="field field--search">
              <label htmlFor={searchId}>Search methods</label>
              <input
                id={searchId}
                onChange={(event) => setSearchText(event.currentTarget.value)}
                placeholder="ID, name, purpose, gate reason…"
                type="search"
                value={searchText}
              />
            </div>
            <div className="field">
              <label htmlFor={moduleId}>Module</label>
              <select id={moduleId} onChange={(event) => setModuleFilter(event.currentTarget.value)} value={moduleFilter}>
                <option value="all">All modules</option>
                {modules.map((module) => <option key={module} value={module}>Module {module}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor={readinessId}>Runtime state</label>
              <select id={readinessId} onChange={(event) => setReadinessFilter(event.currentTarget.value)} value={readinessFilter}>
                <option value="all">All states</option>
                <option value="ready">Enabled</option>
                <option value="gated">Release gated</option>
              </select>
            </div>
          </div>
          <div className="table-caption" aria-live="polite"><strong>{filtered.length}</strong> of {model.methods.length} methods</div>
          <div className="table-scroll" tabIndex={0} aria-label="Scrollable method readiness table">
            <table>
              <caption className="sr-only">Method readiness and release status</caption>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Engineering name</th>
                  <th scope="col">Module</th>
                  <th scope="col">Approval</th>
                  <th scope="col">Runtime status</th>
                  <th scope="col">Confidence</th>
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
                      <span className="cell-primary">{method.name}</span>
                      <span className="cell-secondary" lang="zh-Hans">{method.localizedName}</span>
                    </td>
                    <td><span className="module-badge">{method.module}</span></td>
                    <td>{humanize(method.approvalStatus)}</td>
                    <td><StatusPill enabled={method.executionEnabled}>{method.executionStatus}</StatusPill></td>
                    <td>{method.scientificConfidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 ? <EmptyState title="No matching methods">Clear or broaden the current search and filters.</EmptyState> : null}
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
      setFailure({ code: "file_read_failed", message: "The selected file could not be read as text." });
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
              Print input record
            </button>
            <button
              className="button button--primary"
              disabled={importedCase === null}
              onClick={() => { if (importedCase !== null) downloadValidatedJson(importedCase); }}
              type="button"
            >
              Download validated JSON
            </button>
          </>
        }
        eyebrow="Strict case-file boundary"
        title="Case Inspector"
        titleId="case-title"
      >
        Validate an existing case file without editing it or running a calculation.
      </PageHeader>
      <div className="record-label">Case Input Record — No Calculation Result</div>
      <section className="import-panel" aria-labelledby="import-heading">
        <div>
          <p className="eyebrow">Local file</p>
          <h2 id="import-heading">Import a case JSON file</h2>
          <p>The public application boundary checks schema, versions, freeze identity, and content fingerprints before any details are shown.</p>
        </div>
        <input
          accept=".json,application/json"
          aria-label="Case JSON file"
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
          {pending ? "Validating…" : "Choose case JSON"}
        </button>
      </section>
      {failure === null ? null : (
        <div className="message message--error" role="alert">
          <strong>Import rejected · {failure.code}</strong>
          <p>{failure.message}</p>
        </div>
      )}
      {importedCase === null ? (
        <EmptyState title="No validated case loaded">
          Choose an existing case JSON file. This inspector accepts no edits and remains strictly read-only.
        </EmptyState>
      ) : (
        <div className="case-grid">
          <section className="data-panel case-summary" aria-labelledby="case-summary-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Validated input</p>
                <h2 id="case-summary-title">{importedCase.inspection.caseId}</h2>
              </div>
              <StatusPill enabled={true}>validated</StatusPill>
            </div>
            <DefinitionList>
              <DefinitionItem term="Source file">{importedCase.fileName}</DefinitionItem>
              <DefinitionItem term="Snapshot identity"><code className="fingerprint">{importedCase.inspection.snapshotId}</code></DefinitionItem>
              {importedCase.inspection.fields.map((field) => (
                <DefinitionItem key={field.label} term={field.label}>{field.value}</DefinitionItem>
              ))}
            </DefinitionList>
          </section>
          <section className="data-panel json-panel" aria-labelledby="json-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Read-only source</p>
                <h2 id="json-title">Canonical validated JSON</h2>
              </div>
              <span className="text-badge">validated</span>
            </div>
            <pre tabIndex={0}>{importedCase.validatedJson}</pre>
          </section>
        </div>
      )}
    </section>
  );
}

function AboutPage({ model }: { readonly model: UiReferenceModel }) {
  return (
    <section className="page about-page" aria-labelledby="about-title">
      <PageHeader eyebrow="Software identity" title="About / Versions" titleId="about-title">
        Confirm the independent application, calculation-model, material-database, schema, and technical-freeze identities.
      </PageHeader>
      <div className="identity-card">
        <div className="identity-mark" aria-hidden="true">IH</div>
        <div>
          <p className="eyebrow">Professional engineering workspace</p>
          <h2>{model.productName}</h2>
          <p>{model.phaseLabel}</p>
        </div>
        <div className="freeze-stamp">
          <span>Technical freeze</span>
          <code>{model.technicalFreezeId}</code>
        </div>
      </div>
      <div className="about-grid">
        <section className="data-panel" aria-labelledby="versions-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Reproducibility</p>
              <h2 id="versions-title">Version registry</h2>
            </div>
          </div>
          <table className="version-table">
            <caption className="sr-only">Application and engineering data versions</caption>
            <thead><tr><th scope="col">Component</th><th scope="col">Version</th></tr></thead>
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
              <p className="eyebrow">Current boundary</p>
              <h2 id="scope-title">Feature availability</h2>
            </div>
          </div>
          <ul className="capability-list">
            {model.capabilities.map((capability) => (
              <li key={capability.id}>
                <StatusPill enabled={capability.available}>{capability.available ? "available" : "unavailable"}</StatusPill>
                <div><strong>{capability.label}</strong><p>{capability.reason}</p></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="scope-banner" role="note">
        <strong>UI boundary</strong>
        <span>This interface consumes the stable application API. Engineering formulas, release decisions, and hidden defaults do not live in UI code.</span>
      </div>
    </section>
  );
}

function GatedNavigationItem({ capability }: { readonly capability: UiCapability }) {
  return (
    <li>
      <div aria-disabled="true" className="nav-item nav-item--disabled" title={capability.reason}>
        <span aria-hidden="true" className="nav-item__icon">×</span>
        <span className="nav-item__copy">
          <strong>{capability.label}</strong>
          <small>{capability.reason}</small>
        </span>
        <span className="nav-item__state">Unavailable</span>
      </div>
    </li>
  );
}

export function EngineeringApp({ application }: AppProps) {
  const [activePage, setActivePage] = useState<PageId>("calculator");
  const activeDefinition = PRIMARY_PAGES.find((page) => page.id === activePage) ?? PRIMARY_PAGES[0]!;
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${activeDefinition.label} · ${application.reference.productShortName}`;
  }, [activeDefinition.label, application.reference.productShortName]);

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
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="brand-block">
          <span aria-hidden="true" className="brand-mark">IH</span>
          <div>
            <strong>{application.reference.productShortName}</strong>
            <span>{application.reference.phaseLabel}</span>
          </div>
        </div>
        <div className="topbar__context">
          <span className="context-label">Workspace</span>
          <strong>{activeDefinition.label}</strong>
          <span>{activeDefinition.description}</span>
        </div>
        <div className="freeze-chip">
          <span>Freeze</span>
          <code>{application.reference.technicalFreezeId}</code>
        </div>
      </header>
      <aside className="sidebar">
        <nav aria-label="Engineering workspace">
          <p className="nav-heading">Workspace</p>
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
                  <span className="nav-item__copy"><strong>{page.label}</strong><small>{page.description}</small></span>
                </button>
              </li>
            ))}
          </ul>
          <p className="nav-heading nav-heading--secondary">Release gated</p>
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
        <span><span aria-hidden="true" className="status-dot" /> Public application API connected</span>
        <span>Controlled MVP adapter · canonical-SI inputs</span>
        <span>{application.reference.technicalFreezeId}</span>
      </footer>
    </div>
  );
}
