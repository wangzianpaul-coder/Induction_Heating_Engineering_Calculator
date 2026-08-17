import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import { HelpTooltip } from "./HelpTooltip.js";
import {
  controlledValueLabel,
  fieldHelp,
  useUiLanguage,
  type UiLanguage,
} from "./i18n.js";
import type {
  EngineeringUiApplication,
  UiBasicCalculatorInput,
  UiBasicCalculatorResult,
  UiBasicCalculatorSectionResult,
  UiBasicLocalizedText,
  UiBasicSeriesElectricalInput,
} from "./ui-model.js";

type BasicRawValue = string | boolean;

export interface BasicCalculatorFormState {
  readonly includeCoil: boolean;
  readonly includeSeriesElectrical: boolean;
  readonly electricalTurnCount: string;
  readonly conductorAxialSizeMm: string;
  readonly windingLengthMm: string;
  readonly currentPathDiameterMm: string;
  readonly windingConstruction: string;
  readonly fullPhysicalWindingLengthConfirmed: boolean;
  readonly nonOverlappingTurnsConfirmed: boolean;
  readonly magneticMedium: string;
  readonly relativePermeability: string;
  readonly resistanceOhm: string;
  readonly inductanceMicrohenry: string;
  readonly currentA: string;
  readonly frequencyKhz: string;
  readonly portName: string;
  readonly referencePlaneName: string;
  readonly loadedState: string;
  readonly equivalentStateName: string;
  readonly currentBasis: string;
  readonly coilSeriesPortConfirmed: boolean;
  readonly linearSinusoidalStateConfirmed: boolean;
}

export const EMPTY_BASIC_CALCULATOR_FORM: BasicCalculatorFormState = Object.freeze({
  includeCoil: true,
  includeSeriesElectrical: false,
  electricalTurnCount: "",
  conductorAxialSizeMm: "",
  windingLengthMm: "",
  currentPathDiameterMm: "",
  windingConstruction: "",
  fullPhysicalWindingLengthConfirmed: false,
  nonOverlappingTurnsConfirmed: false,
  magneticMedium: "",
  relativePermeability: "",
  resistanceOhm: "",
  inductanceMicrohenry: "",
  currentA: "",
  frequencyKhz: "",
  portName: "",
  referencePlaneName: "",
  loadedState: "",
  equivalentStateName: "",
  currentBasis: "",
  coilSeriesPortConfirmed: false,
  linearSinusoidalStateConfirmed: false,
});

export const BASIC_FORM_FILE_SCHEMA_VERSION = "0.9.0" as const;
const BASIC_FORM_FILE_KIND = "induction-heating-basic-form" as const;
const BASIC_FORM_KEYS = Object.freeze([
  "includeCoil",
  "includeSeriesElectrical",
  "electricalTurnCount",
  "conductorAxialSizeMm",
  "windingLengthMm",
  "currentPathDiameterMm",
  "windingConstruction",
  "fullPhysicalWindingLengthConfirmed",
  "nonOverlappingTurnsConfirmed",
  "magneticMedium",
  "relativePermeability",
  "resistanceOhm",
  "inductanceMicrohenry",
  "currentA",
  "frequencyKhz",
  "portName",
  "referencePlaneName",
  "loadedState",
  "equivalentStateName",
  "currentBasis",
  "coilSeriesPortConfirmed",
  "linearSinusoidalStateConfirmed",
] as const satisfies readonly (keyof BasicCalculatorFormState)[]);
const BASIC_BOOLEAN_KEYS = new Set<keyof BasicCalculatorFormState>([
  "includeCoil",
  "includeSeriesElectrical",
  "fullPhysicalWindingLengthConfirmed",
  "nonOverlappingTurnsConfirmed",
  "coilSeriesPortConfirmed",
  "linearSinusoidalStateConfirmed",
]);
const BASIC_NUMERIC_TEXT_KEYS = new Set<keyof BasicCalculatorFormState>([
  "electricalTurnCount",
  "conductorAxialSizeMm",
  "windingLengthMm",
  "currentPathDiameterMm",
  "relativePermeability",
  "resistanceOhm",
  "inductanceMicrohenry",
  "currentA",
  "frequencyKhz",
]);
const BASIC_SELECT_VALUES: Readonly<Partial<Record<keyof BasicCalculatorFormState, readonly string[]>>> = Object.freeze({
  windingConstruction: ["", "uniform_identical_single_layer", "other_or_unknown"],
  magneticMedium: ["", "air", "uniform_linear"],
  loadedState: ["", "empty", "workpiece_cold", "workpiece_hot", "measured_state", "user_defined_state"],
  currentBasis: ["", "rms", "fundamental_rms"],
});

interface BasicFormFile {
  readonly kind: typeof BASIC_FORM_FILE_KIND;
  readonly schemaVersion: typeof BASIC_FORM_FILE_SCHEMA_VERSION;
  readonly savedAt: string;
  readonly form: BasicCalculatorFormState;
}

export type BasicFormFileParseResult =
  | { readonly status: "success"; readonly form: BasicCalculatorFormState }
  | { readonly status: "invalid_input"; readonly message: UiBasicLocalizedText };

function exactObjectKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function isCanonicalUtcTime(value: string): boolean {
  try {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  } catch {
    return false;
  }
}

export function serializeBasicCalculatorForm(
  form: BasicCalculatorFormState,
  savedAt: string,
): string {
  if (!isCanonicalUtcTime(savedAt)) {
    throw new TypeError("Basic form savedAt must be canonical UTC ISO text.");
  }
  const file: BasicFormFile = {
    kind: BASIC_FORM_FILE_KIND,
    schemaVersion: BASIC_FORM_FILE_SCHEMA_VERSION,
    savedAt,
    form: Object.fromEntries(BASIC_FORM_KEYS.map((key) => [key, form[key]])) as unknown as BasicCalculatorFormState,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseBasicCalculatorForm(text: string): BasicFormFileParseResult {
  if (text.length > 128 * 1024) {
    return { status: "invalid_input", message: { zh: "基础方案文件过大，已拒绝打开。", en: "The basic form file is too large and was rejected." } };
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    return { status: "invalid_input", message: { zh: "所选文件不是有效的基础方案文件。", en: "The selected file is not a valid basic form file." } };
  }
  if (!exactObjectKeys(candidate, ["kind", "schemaVersion", "savedAt", "form"]) ||
    candidate.kind !== BASIC_FORM_FILE_KIND || candidate.schemaVersion !== BASIC_FORM_FILE_SCHEMA_VERSION ||
    typeof candidate.savedAt !== "string" || !isCanonicalUtcTime(candidate.savedAt) ||
    !exactObjectKeys(candidate.form, BASIC_FORM_KEYS)) {
    return { status: "invalid_input", message: { zh: "基础方案文件版本、时间或字段结构不匹配，未加载任何数据。", en: "The basic form version, timestamp, or exact field structure does not match; nothing was loaded." } };
  }
  const restored: Record<string, string | boolean> = {};
  for (const key of BASIC_FORM_KEYS) {
    const value = candidate.form[key];
    if (BASIC_BOOLEAN_KEYS.has(key)) {
      if (typeof value !== "boolean") return { status: "invalid_input", message: { zh: "基础方案中的确认项格式不正确。", en: "A confirmation field in the basic form is invalid." } };
      restored[key] = value;
      continue;
    }
    if (typeof value !== "string" || value.length > 1_000) {
      return { status: "invalid_input", message: { zh: "基础方案中的文本或数值字段格式不正确。", en: "A text or numeric field in the basic form is invalid." } };
    }
    if (BASIC_NUMERIC_TEXT_KEYS.has(key) && value.trim().length > 0 && !Number.isFinite(Number(value))) {
      return { status: "invalid_input", message: { zh: "基础方案包含无法识别的数值。", en: "The basic form contains an unrecognized numeric value." } };
    }
    const allowed = BASIC_SELECT_VALUES[key];
    if (allowed !== undefined && !allowed.includes(value)) {
      return { status: "invalid_input", message: { zh: "基础方案包含当前版本不支持的选择项。", en: "The basic form contains an option unsupported by this version." } };
    }
    restored[key] = value;
  }
  return { status: "success", form: Object.freeze(restored) as unknown as BasicCalculatorFormState };
}

export type BasicInputBuildResult =
  | { readonly status: "success"; readonly input: UiBasicCalculatorInput }
  | { readonly status: "invalid_input"; readonly message: Readonly<{ readonly zh: string; readonly en: string }> };

function numberValue(value: string): number | null {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function missing(zh: string, en: string): BasicInputBuildResult {
  return {
    status: "invalid_input",
    message: {
      zh: `请完整填写${zh}，并检查所示单位。`,
      en: `Complete ${en} and check the displayed units.`,
    },
  };
}

export function buildBasicCalculatorInput(
  state: BasicCalculatorFormState,
): BasicInputBuildResult {
  let coil: UiBasicCalculatorInput["coil"] = null;
  if (state.includeCoil) {
    const turns = numberValue(state.electricalTurnCount);
    const conductorSize = numberValue(state.conductorAxialSizeMm);
    const windingLength = numberValue(state.windingLengthMm);
    const diameter = numberValue(state.currentPathDiameterMm);
    if (turns === null || conductorSize === null || windingLength === null || diameter === null ||
      (state.windingConstruction !== "uniform_identical_single_layer" && state.windingConstruction !== "other_or_unknown") ||
      (state.magneticMedium !== "air" && state.magneticMedium !== "uniform_linear")) {
      return missing("线圈几何和磁介质参数", "the coil geometry and magnetic-medium inputs");
    }
    const permeability = numberValue(state.relativePermeability);
    if (state.magneticMedium === "uniform_linear" && permeability === null) {
      return missing("均匀磁介质的相对磁导率", "relative permeability for the uniform magnetic medium");
    }
    if (state.magneticMedium === "air" && state.relativePermeability.trim().length > 0) {
      return {
        status: "invalid_input",
        message: {
          zh: "选择空气时不要另填相对磁导率；请清空该字段后重试。",
          en: "Do not enter relative permeability for air; clear that field and try again.",
        },
      };
    }
    coil = {
      electricalTurnCount: turns,
      conductorAxialSizeMm: conductorSize,
      windingLengthMm: windingLength,
      currentPathDiameterMm: diameter,
      windingConstruction: state.windingConstruction,
      fullPhysicalWindingLengthConfirmed: state.fullPhysicalWindingLengthConfirmed,
      nonOverlappingTurnsConfirmed: state.nonOverlappingTurnsConfirmed,
      magneticMedium: state.magneticMedium,
      relativePermeability: state.magneticMedium === "air" ? null : permeability,
    };
  }

  let seriesElectrical: UiBasicCalculatorInput["seriesElectrical"] = null;
  if (state.includeSeriesElectrical) {
    const resistance = numberValue(state.resistanceOhm);
    const inductance = numberValue(state.inductanceMicrohenry);
    const current = numberValue(state.currentA);
    const frequency = numberValue(state.frequencyKhz);
    const loadedStates = ["empty", "workpiece_cold", "workpiece_hot", "measured_state", "user_defined_state"] as const;
    if (resistance === null || inductance === null || current === null || frequency === null ||
      state.portName.trim().length === 0 || state.referencePlaneName.trim().length === 0 ||
      state.equivalentStateName.trim().length === 0 || !loadedStates.some((value) => value === state.loadedState) ||
      (state.currentBasis !== "rms" && state.currentBasis !== "fundamental_rms")) {
      return missing("串联电气参数和工况说明", "the series electrical inputs and operating-condition descriptions");
    }
    seriesElectrical = {
      resistanceOhm: resistance,
      inductanceMicrohenry: inductance,
      currentA: current,
      frequencyKhz: frequency,
      portName: state.portName.trim(),
      referencePlaneName: state.referencePlaneName.trim(),
      loadedState: state.loadedState as UiBasicSeriesElectricalInput["loadedState"],
      equivalentStateName: state.equivalentStateName.trim(),
      currentBasis: state.currentBasis,
      coilSeriesPortConfirmed: state.coilSeriesPortConfirmed,
      linearSinusoidalStateConfirmed: state.linearSinusoidalStateConfirmed,
    };
  }

  return {
    status: "success",
    input: { schemaVersion: "0.9.0", coil, seriesElectrical },
  };
}

interface BasicFieldSpec {
  readonly id: keyof BasicCalculatorFormState;
  readonly label: UiBasicLocalizedText;
  readonly description: UiBasicLocalizedText;
  readonly kind: "number" | "text" | "select" | "boolean";
  readonly unit?: string;
  readonly options?: readonly Readonly<{ readonly value: string; readonly label: UiBasicLocalizedText }>[];
}

const COIL_FIELDS: readonly BasicFieldSpec[] = [
  { id: "electricalTurnCount", label: { zh: "电气匝数", en: "Electrical turn count" }, description: { zh: "线圈中实际参与电气作用的完整匝数。", en: "The complete electrical turns in the coil." }, kind: "number", unit: "匝" },
  { id: "conductorAxialSizeMm", label: { zh: "导体轴向尺寸", en: "Conductor axial size" }, description: { zh: "单根导体沿线圈轴线方向占用的尺寸。", en: "The size occupied by one conductor along the coil axis." }, kind: "number", unit: "mm" },
  { id: "windingLengthMm", label: { zh: "绕组总长度", en: "Full winding length" }, description: { zh: "从第一匝最外侧边缘到最后一匝最外侧边缘的轴向距离。", en: "Axial distance from the outer edge of the first turn to the outer edge of the last turn." }, kind: "number", unit: "mm" },
  { id: "currentPathDiameterMm", label: { zh: "导体中心线直径", en: "Conductor centre-line diameter" }, description: { zh: "线圈相对两侧导体中心线之间的直径。", en: "Diameter between conductor centre lines on opposite sides of the coil." }, kind: "number", unit: "mm" },
  { id: "windingConstruction", label: { zh: "绕组结构", en: "Winding construction" }, description: { zh: "说明线圈是否为相同截面的均匀单层结构。", en: "Whether the coil is a uniform single layer with identical turn sections." }, kind: "select", options: [
    { value: "uniform_identical_single_layer", label: { zh: "均匀单层且各匝截面相同", en: "Uniform identical single layer" } },
    { value: "other_or_unknown", label: { zh: "其他结构或暂不确定", en: "Other or uncertain" } },
  ] },
  { id: "fullPhysicalWindingLengthConfirmed", label: { zh: "确认绕组总长度按两端外缘测量", en: "Full physical winding length confirmed" }, description: { zh: "确认长度包含首末匝的完整轴向占用范围。", en: "Confirms that the length covers the complete first-to-last-turn envelope." }, kind: "boolean" },
  { id: "nonOverlappingTurnsConfirmed", label: { zh: "确认各匝轴向不重叠", en: "Non-overlapping turns confirmed" }, description: { zh: "确认相邻导体在轴向投影上没有互相覆盖。", en: "Confirms that adjacent conductor projections do not overlap axially." }, kind: "boolean" },
  { id: "magneticMedium", label: { zh: "线圈内部磁介质", en: "Magnetic medium inside the coil" }, description: { zh: "选择线圈内部为空气，或为已知的均匀线性磁介质。", en: "Choose air or a known uniform linear magnetic medium." }, kind: "select", options: [
    { value: "air", label: { zh: "空气", en: "Air" } },
    { value: "uniform_linear", label: { zh: "均匀线性磁介质", en: "Uniform linear magnetic medium" } },
  ] },
  { id: "relativePermeability", label: { zh: "相对磁导率", en: "Relative permeability" }, description: { zh: "非空气均匀介质相对于真空的磁导率倍数。", en: "Permeability of the non-air uniform medium relative to vacuum." }, kind: "number", unit: "—" },
];

const SERIES_FIELDS: readonly BasicFieldSpec[] = [
  { id: "resistanceOhm", label: { zh: "线圈串联电阻", en: "Coil series resistance" }, description: { zh: "当前工况下、指定接线位置处的实际串联电阻。", en: "Actual series resistance at the stated connection and operating condition." }, kind: "number", unit: "Ω" },
  { id: "inductanceMicrohenry", label: { zh: "线圈串联电感", en: "Coil series inductance" }, description: { zh: "与电阻同一工况、同一接线位置下得到的实际串联电感。", en: "Actual series inductance at the same state and connection as resistance." }, kind: "number", unit: "µH" },
  { id: "currentA", label: { zh: "线圈电流", en: "Coil current" }, description: { zh: "指定接线位置处的有效值电流。", en: "RMS current at the stated coil connection." }, kind: "number", unit: "A" },
  { id: "frequencyKhz", label: { zh: "工作频率", en: "Operating frequency" }, description: { zh: "本次运行、测量或仿真共同采用的正弦频率。", en: "Common sinusoidal frequency for this operation, measurement, or simulation." }, kind: "number", unit: "kHz" },
  { id: "portName", label: { zh: "线圈接线位置名称", en: "Coil connection name" }, description: { zh: "电阻、电感和电流共同对应的实际线圈接线位置。", en: "Physical coil connection shared by resistance, inductance, and current." }, kind: "text" },
  { id: "referencePlaneName", label: { zh: "参数测量位置", en: "Parameter measurement location" }, description: { zh: "电阻和电感共同采用的测量或折算位置。", en: "Measurement or reduction location shared by resistance and inductance." }, kind: "text" },
  { id: "loadedState", label: { zh: "负载状态", en: "Loaded state" }, description: { zh: "电阻、电感和电流共同对应的线圈与工件状态。", en: "Coil and workpiece state shared by resistance, inductance, and current." }, kind: "select", options: [
    { value: "empty", label: { zh: "空载线圈", en: "Empty coil" } },
    { value: "workpiece_cold", label: { zh: "冷态工件", en: "Cold workpiece" } },
    { value: "workpiece_hot", label: { zh: "热态工件", en: "Hot workpiece" } },
    { value: "measured_state", label: { zh: "已记录的实测状态", en: "Recorded measured state" } },
    { value: "user_defined_state", label: { zh: "用户明确说明的状态", en: "Explicit user-defined state" } },
  ] },
  { id: "equivalentStateName", label: { zh: "电气参数工况名称", en: "Electrical-parameter condition name" }, description: { zh: "为这一组电阻、电感、电流和频率填写便于识别的工况名称。", en: "Human-readable condition name shared by this resistance, inductance, current, and frequency set." }, kind: "text" },
  { id: "currentBasis", label: { zh: "电流数值口径", en: "Current basis" }, description: { zh: "说明输入电流是总有效值还是基波有效值。", en: "Whether current is total RMS or fundamental RMS." }, kind: "select", options: [
    { value: "rms", label: { zh: "总有效值", en: "RMS" } },
    { value: "fundamental_rms", label: { zh: "基波有效值", en: "Fundamental RMS" } },
  ] },
  { id: "coilSeriesPortConfirmed", label: { zh: "确认参数属于线圈串联接线端", en: "Coil series connection confirmed" }, description: { zh: "确认这些参数不是电网侧数据，也不是整套谐振回路数据。", en: "Confirms these are neither grid-side nor whole-resonant-circuit values." }, kind: "boolean" },
  { id: "linearSinusoidalStateConfirmed", label: { zh: "确认处于线性正弦稳态", en: "Linear sinusoidal steady state confirmed" }, description: { zh: "确认当前数据可用线性正弦稳态串联电路关系处理。", en: "Confirms that linear sinusoidal steady-state series-circuit relations apply." }, kind: "boolean" },
];

function local(value: UiBasicLocalizedText, language: UiLanguage): string {
  return language === "zh-CN" ? value.zh : value.en;
}

function BasicField({ field, value, onChange }: {
  readonly field: BasicFieldSpec;
  readonly value: BasicRawValue;
  readonly onChange: (value: BasicRawValue) => void;
}) {
  const { language, text } = useUiLanguage();
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const label = local(field.label, language);
  const description = local(field.description, language);
  const help = fieldHelp(String(field.id), description, field.kind, language);
  return (
    <div className={field.kind === "boolean" ? "calculator-field calculator-field--boolean" : "calculator-field"}>
      <label htmlFor={inputId}>
        {field.kind === "boolean" ? (
          <input aria-describedby={descriptionId} checked={value === true} id={inputId} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
        ) : null}
        <span className="calculator-field__label-copy">{label}<HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={label} /></span>
        {field.unit === undefined ? null : <code>{field.unit}</code>}
      </label>
      {field.kind === "select" ? (
        <select aria-describedby={descriptionId} id={inputId} onChange={(event) => onChange(event.currentTarget.value)} value={typeof value === "string" ? value : ""}>
          <option value="">{text("请选择…", "Select…")}</option>
          {(field.options ?? []).map((item) => <option key={item.value} value={item.value}>{local(item.label, language)}</option>)}
        </select>
      ) : field.kind === "boolean" ? null : (
        <input aria-describedby={descriptionId} id={inputId} onChange={(event) => onChange(event.currentTarget.value)} step={field.kind === "number" ? "any" : undefined} type={field.kind === "number" ? "number" : "text"} value={typeof value === "string" ? value : ""} />
      )}
      <p>{description}</p>
    </div>
  );
}

function SectionToggle({
  checked,
  fieldId,
  label,
  description,
  onChange,
}: {
  readonly checked: boolean;
  readonly fieldId: "includeCoil" | "includeSeriesElectrical";
  readonly label: UiBasicLocalizedText;
  readonly description: UiBasicLocalizedText;
  readonly onChange: (checked: boolean) => void;
}) {
  const { language } = useUiLanguage();
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const localizedLabel = local(label, language);
  const localizedDescription = local(description, language);
  const help = fieldHelp(fieldId, localizedDescription, "boolean", language);
  return (
    <span className="section-toggle">
      <label htmlFor={inputId}>
        <input
          aria-describedby={descriptionId}
          checked={checked}
          id={inputId}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        {localizedLabel}
      </label>
      <HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={localizedLabel} />
    </span>
  );
}

function formattedValue(value: UiBasicCalculatorSectionResult["outputs"][number]["value"], language: UiLanguage): string {
  if (value === null) return language === "zh-CN" ? "不可用" : "Unavailable";
  const format = new Intl.NumberFormat(language === "zh-CN" ? "zh-CN" : "en-US", { maximumSignificantDigits: 10 });
  return typeof value === "number" ? format.format(value) : `${format.format(value.real)} + j${format.format(value.imaginary)}`;
}

function ResultSection({ section }: { readonly section: UiBasicCalculatorSectionResult }) {
  const { language, text } = useUiLanguage();
  return (
    <article className="basic-result-card">
      <header><h3>{local(section.title, language)}</h3><span className={`result-status result-status--${section.status}`}>{controlledValueLabel(section.status, language)}</span></header>
      {section.error === null ? null : <div className="result-failure" role="alert"><strong>{text("本项未完成 · 错误代码", "Section not completed · error code")}: {section.error.code}</strong><p>{local(section.error.message, language)}</p><p>{local(section.error.action, language)}</p></div>}
      {section.outputs.length === 0 ? null : <div className="result-output-grid">{section.outputs.map((output) => (
        <div className={output.status === "available" ? "result-output" : "result-output result-output--unavailable"} key={output.key}>
          <span>{local(output.label, language)}</span><strong>{formattedValue(output.value, language)}</strong><code>{output.unit === "one" ? "—" : output.unit ?? "—"}</code>
          {output.note === null ? null : <p>{local(output.note, language)}</p>}
        </div>
      ))}</div>}
      <dl className="result-evidence"><div><dt>{text("适用范围", "Applicability")}</dt><dd>{local(section.applicability.summary, language)}</dd></div></dl>
      {section.warnings.length === 0 ? null : <section className="result-list result-list--warning"><strong>{text("注意事项", "Warnings")}</strong><ul>{section.warnings.map((item) => <li key={item.zh}>{local(item, language)}</li>)}</ul></section>}
      <section className="result-list"><strong>{text("假设", "Assumptions")}</strong><ul>{section.assumptions.map((item) => <li key={item.zh}>{local(item, language)}</li>)}</ul></section>
      <section className="result-list"><strong>{text("使用限制", "Limitations")}</strong><ul>{section.limitations.map((item) => <li key={item.zh}>{local(item, language)}</li>)}</ul></section>
      <section className="result-list result-list--sources"><strong>{text("计算依据", "Calculation basis")}</strong><ul>{section.sourceTitles.map((item) => <li key={item.zh}>{local(item, language)}</li>)}</ul></section>
    </article>
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function basicResultCsv(result: UiBasicCalculatorResult, language: UiLanguage): string {
  const headings = language === "zh-CN"
    ? ["计算部分", "结果", "状态", "数值", "单位", "注意事项"]
    : ["Section", "Output", "Status", "Value", "Unit", "Warnings"];
  const rows = result.sections.flatMap((section) => section.outputs.map((output) => [
    local(section.title, language),
    local(output.label, language),
    controlledValueLabel(output.status, language),
    formattedValue(output.value, language),
    output.unit === "one" ? "—" : output.unit ?? "—",
    section.warnings.map((item) => local(item, language)).join("；"),
  ]));
  return [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function downloadCsv(result: UiBasicCalculatorResult, language: UiLanguage): void {
  const blob = new Blob([`\uFEFF${basicResultCsv(result, language)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = language === "zh-CN" ? "感应线圈基础计算结果.csv" : "induction-coil-basic-results.csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadBasicForm(form: BasicCalculatorFormState, language: UiLanguage): void {
  const text = serializeBasicCalculatorForm(form, new Date().toISOString());
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = language === "zh-CN" ? "感应线圈基础方案.json" : "induction-coil-basic-form.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function BasicCalculatorPage({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, text } = useUiLanguage();
  const formFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BasicCalculatorFormState>(EMPTY_BASIC_CALCULATOR_FORM);
  const [result, setResult] = useState<UiBasicCalculatorResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFileMessage, setFormFileMessage] = useState<Readonly<{ readonly tone: "success" | "error"; readonly text: string }> | null>(null);
  const [openingForm, setOpeningForm] = useState(false);
  const exportReady = useMemo(() => result?.sections.some((section) => section.outputs.length > 0) ?? false, [result]);

  function update(id: keyof BasicCalculatorFormState, value: BasicRawValue): void {
    setForm((current) => ({ ...current, [id]: value }));
    setResult(null);
    setFormError(null);
    setFormFileMessage(null);
  }

  function calculate(): void {
    const built = buildBasicCalculatorInput(form);
    if (built.status !== "success") {
      setFormError(local(built.message, language));
      setResult(null);
      return;
    }
    setResult(application.basic.calculate(built.input));
    setFormError(null);
  }

  function reset(): void {
    setForm(EMPTY_BASIC_CALCULATOR_FORM);
    setResult(null);
    setFormError(null);
    setFormFileMessage(null);
  }

  async function openBasicForm(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;
    setOpeningForm(true);
    setFormFileMessage(null);
    try {
      const parsed = parseBasicCalculatorForm(await file.text());
      if (parsed.status !== "success") {
        setFormFileMessage({ tone: "error", text: local(parsed.message, language) });
        return;
      }
      setForm(parsed.form);
      setResult(null);
      setFormError(null);
      setFormFileMessage({ tone: "success", text: text("基础方案输入已恢复；请点击“开始计算”生成新结果。", "Basic form inputs were restored; press Calculate to produce fresh results.") });
    } catch {
      setFormFileMessage({ tone: "error", text: text("无法读取所选基础方案文件。", "The selected basic form file could not be read.") });
    } finally {
      setOpeningForm(false);
    }
  }

  return (
    <section aria-labelledby="basic-calculator-title" className="page calculator-page basic-calculator-page">
      <header className="page-header">
        <div><p className="eyebrow">{text("0.9 测试版 · 快速单方案", "Version 0.9 · guided single case")}</p><h1 id="basic-calculator-title">{text("基础计算器", "Basic Calculator")}</h1><p className="page-header__description">{text("填写一组线圈尺寸，可计算轴向填充系数和理想螺线管电感；如另有同工况电阻、电感、电流和频率，还可计算线圈阻抗、电压与品质因数。", "Enter one coil geometry to calculate axial fill and the ideal-solenoid inductance limit; optionally add same-state electrical data for impedance, voltage, and quality factor.")}</p></div>
        <div className="page-header__actions basic-result-actions"><input accept=".json,application/json" aria-label={text("打开基础方案", "Open basic form")} className="sr-only" onChange={(event) => { void openBasicForm(event); }} ref={formFileRef} type="file" /><button className="button button--secondary" disabled={openingForm} onClick={() => formFileRef.current?.click()} type="button">{openingForm ? text("正在打开…", "Opening…") : text("打开基础方案", "Open basic form")}</button><button className="button button--secondary" onClick={() => { downloadBasicForm(form, language); setFormFileMessage({ tone: "success", text: text("基础方案输入已保存到本地文件。", "Basic form inputs were saved to a local file.") }); }} type="button">{text("保存基础方案", "Save basic form")}</button><button className="button button--secondary" disabled={!exportReady} onClick={() => { if (result !== null) downloadCsv(result, language); }} type="button">{text("导出结果 CSV", "Export result CSV")}</button><button className="button button--secondary" disabled={!exportReady} onClick={() => window.print()} type="button">{text("打印结果", "Print results")}</button><button className="button button--secondary" onClick={reset} type="button">{text("清空重填", "Reset")}</button><button className="button button--primary" onClick={calculate} type="button">{text("开始计算", "Calculate")}</button></div>
      </header>
      <div className="scope-banner" role="note"><strong>{text("数据原则", "Data principle")}</strong><span>{text("所有数值均由你填写。软件不采用附件中的历史结果作为校准目标，也不会把理想电感自动当作实际串联电感。“基础方案”文件只保存本页表单输入，不含计算结果，也不冒充正式工程方案记录。", "All numbers come from you. Historical spreadsheet outputs are not calibration targets, and ideal inductance is never substituted for actual series inductance. A basic-form file saves this page's inputs only; it contains no results and is not a formal engineering case record.")}</span></div>
      {formFileMessage === null ? null : <div className={`message message--${formFileMessage.tone}`} role={formFileMessage.tone === "error" ? "alert" : "status"}><strong>{formFileMessage.tone === "error" ? text("基础方案未打开", "Basic form not opened") : text("基础方案", "Basic form")}</strong><p>{formFileMessage.text}</p></div>}
      {formError === null ? null : <div className="message message--error" role="alert"><strong>{text("请检查输入", "Check the inputs")}</strong><p>{formError}</p></div>}

      <section aria-labelledby="basic-coil-title" className="data-panel calculator-section basic-input-section">
        <div className="panel-heading"><div><p className="eyebrow">{text("第一部分", "Part 1")}</p><h2 id="basic-coil-title">{text("线圈几何与理想电感", "Coil Geometry and Ideal Inductance")}</h2></div><SectionToggle checked={form.includeCoil} description={{ zh: "决定是否计算线圈轴向填充系数和理想长螺线管电感极限。", en: "Whether to calculate coil axial fill and the ideal long-solenoid inductance limit." }} fieldId="includeCoil" label={{ zh: "计算本部分", en: "Calculate this part" }} onChange={(checked) => update("includeCoil", checked)} /></div>
        {form.includeCoil ? <div className="calculator-fields">{COIL_FIELDS.map((field) => <BasicField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id] as BasicRawValue} />)}</div> : <p className="section-skipped">{text("本部分不会计算。", "This part will not be calculated.")}</p>}
      </section>

      <section aria-labelledby="basic-series-title" className="data-panel calculator-section basic-input-section">
        <div className="panel-heading"><div><p className="eyebrow">{text("第二部分（可选）", "Part 2 (optional)")}</p><h2 id="basic-series-title">{text("线圈串联电气参数", "Coil Series Electrical Parameters")}</h2></div><SectionToggle checked={form.includeSeriesElectrical} description={{ zh: "决定是否使用你提供的同工况串联电阻、电感、电流和频率计算阻抗、电压与品质因数。", en: "Whether to use your same-state resistance, inductance, current, and frequency to calculate impedance, voltage, and quality factor." }} fieldId="includeSeriesElectrical" label={{ zh: "计算本部分", en: "Calculate this part" }} onChange={(checked) => update("includeSeriesElectrical", checked)} /></div>
        <p className="section-introduction">{text("此处的实际电阻和实际电感必须来自同一接线位置、频率、温度与负载状态；基础计算器不会从几何尺寸猜测它们。", "Actual resistance and inductance must share one connection, frequency, temperature, and loaded state; this calculator never guesses them from geometry.")}</p>
        {form.includeSeriesElectrical ? <div className="calculator-fields">{SERIES_FIELDS.map((field) => <BasicField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id] as BasicRawValue} />)}</div> : <p className="section-skipped">{text("如暂无可靠的实际电阻和电感，可保持关闭；线圈几何部分仍可独立计算。", "Leave this off when reliable actual resistance and inductance are unavailable; the coil section remains independent.")}</p>}
      </section>

      <section aria-labelledby="basic-results-title" className="calculator-results-section basic-results-section">
        <div className="calculator-section-heading"><div><p className="eyebrow">{text("第三部分", "Part 3")}</p><h2 id="basic-results-title">{text("计算结果", "Calculation Results")}</h2></div><p>{result === null ? text("填写参数后点击“开始计算”。", "Enter inputs and press Calculate.") : text("各部分独立计算；一部分失败不会清除其他有效结果。", "Sections are isolated; one failure never removes another valid result.")}</p></div>
        {result === null ? <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>{text("尚无结果", "No results yet")}</strong><p>{text("每个问号都提供参数含义、填写方法和影响说明。", "Every question mark explains the parameter, how to provide it, and what it affects.")}</p></div></div> : <><div className="basic-notices">{result.notices.map((notice) => <p key={notice.zh}>{local(notice, language)}</p>)}</div>{result.error === null ? null : <div className="result-failure" role="alert"><strong>{text("计算未执行 · 错误代码", "Calculation not run · error code")}: {result.error.code}</strong><p>{local(result.error.message, language)}</p><p>{local(result.error.action, language)}</p></div>}<div className="calculation-results-grid">{result.sections.filter((section) => section.status !== "not_requested").map((section) => <ResultSection key={section.section} section={section} />)}</div></>}
      </section>
    </section>
  );
}
