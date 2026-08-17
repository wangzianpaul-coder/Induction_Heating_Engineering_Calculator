import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import { HelpTooltip } from "./HelpTooltip.js";
import { LegacyCoilCanvas } from "./basic-matching/LegacyCoilCanvas.js";
import {
  LEGACY_BASIC_TABS,
  LegacyReferencePage,
  legacyDisplay,
  type LegacyBasicPage,
} from "./basic-matching/LegacyReferencePages.js";
import { useUiLanguage, type FieldHelpContent, type UiLanguage } from "./i18n.js";
import type {
  EngineeringUiApplication,
  UiLegacyBasicCalculatorInput,
  UiLegacyBasicCalculatorResult,
} from "./ui-model.js";

export interface BasicCalculatorFormState {
  readonly coilType: string;
  readonly nagaokaSource: string;
  readonly coilLengthMm: string;
  readonly coilInnerDiameterMm: string;
  readonly turns: string;
  readonly radialWidthMm: string;
  readonly conductorHeightMm: string;
  readonly simpsonN: string;
  readonly manualKn: string;
  readonly lineVoltageV: string;
  readonly ratedPowerKw: string;
  readonly frequencyKHz: string;
  readonly rectifierFactor: string;
  readonly equivalentResistanceOhm: string;
  readonly targetQ: string;
  readonly copperResistivityMicroOhmCm: string;
  readonly workpieceMuR: string;
  readonly workpieceResistivityMicroOhmCm: string;
  readonly workpieceLengthMm: string;
  readonly workpieceDiameterMm: string;
  readonly coilAcResistanceOhm: string;
  readonly coolingFactor: string;
  readonly inletTempC: string;
  readonly outletTempC: string;
  readonly waterSpecificHeat: string;
  readonly waterDensityKgL: string;
}

export const DEFAULT_BASIC_CALCULATOR_FORM: BasicCalculatorFormState = Object.freeze({
  coilType: "single",
  nagaokaSource: "integral",
  coilLengthMm: "300",
  coilInnerDiameterMm: "1000",
  turns: "4",
  radialWidthMm: "30",
  conductorHeightMm: "60",
  simpsonN: "400",
  manualKn: "0.52",
  lineVoltageV: "380",
  ratedPowerKw: "100",
  frequencyKHz: "10",
  rectifierFactor: "1.35",
  equivalentResistanceOhm: "0.03",
  targetQ: "40",
  copperResistivityMicroOhmCm: "2",
  workpieceMuR: "1",
  workpieceResistivityMicroOhmCm: "130",
  workpieceLengthMm: "300",
  workpieceDiameterMm: "800",
  coilAcResistanceOhm: "0.006",
  coolingFactor: "1.7",
  inletTempC: "35",
  outletTempC: "55",
  waterSpecificHeat: "4180",
  waterDensityKgL: "1",
});

/** Backward-compatible export name; it now represents the supplied page defaults. */
export const EMPTY_BASIC_CALCULATOR_FORM = DEFAULT_BASIC_CALCULATOR_FORM;

export const BASIC_FORM_FILE_SCHEMA_VERSION = "0.9.1" as const;
const BASIC_FORM_FILE_KIND = "induction-coil-matching-basic-form" as const;
const BASIC_FORM_KEYS = Object.freeze([
  "coilType", "nagaokaSource", "coilLengthMm", "coilInnerDiameterMm", "turns",
  "radialWidthMm", "conductorHeightMm", "simpsonN", "manualKn", "lineVoltageV",
  "ratedPowerKw", "frequencyKHz", "rectifierFactor", "equivalentResistanceOhm",
  "targetQ", "copperResistivityMicroOhmCm", "workpieceMuR",
  "workpieceResistivityMicroOhmCm", "workpieceLengthMm", "workpieceDiameterMm",
  "coilAcResistanceOhm", "coolingFactor", "inletTempC", "outletTempC",
  "waterSpecificHeat", "waterDensityKgL",
] as const satisfies readonly (keyof BasicCalculatorFormState)[]);
const SELECT_VALUES: Readonly<Partial<Record<keyof BasicCalculatorFormState, readonly string[]>>> = Object.freeze({
  coilType: ["single", "multi"],
  nagaokaSource: ["integral", "table", "manual"],
});

export type BasicFormFileParseResult =
  | { readonly status: "success"; readonly form: BasicCalculatorFormState }
  | { readonly status: "invalid_input"; readonly message: Readonly<{ readonly zh: string; readonly en: string }> };

function exactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return actual.length === sorted.length && actual.every((key, index) => key === sorted[index]);
}

function canonicalUtc(value: string): boolean {
  try {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
  } catch {
    return false;
  }
}

export function serializeBasicCalculatorForm(form: BasicCalculatorFormState, savedAt: string): string {
  if (!canonicalUtc(savedAt)) throw new TypeError("Basic form savedAt must be canonical UTC ISO text.");
  const canonicalForm = Object.fromEntries(BASIC_FORM_KEYS.map((key) => [key, form[key]]));
  return `${JSON.stringify({
    kind: BASIC_FORM_FILE_KIND,
    schemaVersion: BASIC_FORM_FILE_SCHEMA_VERSION,
    savedAt,
    form: canonicalForm,
  }, null, 2)}\n`;
}

export function parseBasicCalculatorForm(text: string): BasicFormFileParseResult {
  if (text.length > 128 * 1024) return { status: "invalid_input", message: { zh: "基础方案文件过大，已拒绝打开。", en: "The basic form file is too large and was rejected." } };
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { status: "invalid_input", message: { zh: "所选文件不是有效的基础方案文件。", en: "The selected file is not a valid basic form file." } }; }
  if (!exactKeys(value, ["kind", "schemaVersion", "savedAt", "form"]) ||
      value.kind !== BASIC_FORM_FILE_KIND || value.schemaVersion !== BASIC_FORM_FILE_SCHEMA_VERSION ||
      typeof value.savedAt !== "string" || !canonicalUtc(value.savedAt) ||
      !exactKeys(value.form, BASIC_FORM_KEYS)) {
    return { status: "invalid_input", message: { zh: "方案文件版本或字段不匹配，未加载任何数据。", en: "The form version or exact fields do not match; nothing was loaded." } };
  }
  const restored: Record<string, string> = {};
  for (const key of BASIC_FORM_KEYS) {
    const field = value.form[key];
    if (typeof field !== "string" || field.length > 1_000) return { status: "invalid_input", message: { zh: "方案文件包含格式错误的字段。", en: "The form contains an invalid field." } };
    const allowed = SELECT_VALUES[key];
    if (allowed !== undefined ? !allowed.includes(field) : field.trim().length > 0 && !Number.isFinite(Number(field))) {
      return { status: "invalid_input", message: { zh: "方案文件包含无法识别的数值或选择。", en: "The form contains an unrecognized value or option." } };
    }
    restored[key] = field;
  }
  return { status: "success", form: Object.freeze(restored) as unknown as BasicCalculatorFormState };
}

export type BasicInputBuildResult =
  | { readonly status: "success"; readonly input: UiLegacyBasicCalculatorInput }
  | { readonly status: "invalid_input"; readonly message: Readonly<{ readonly zh: string; readonly en: string }> };

export function buildBasicCalculatorInput(state: BasicCalculatorFormState): BasicInputBuildResult {
  const numeric = (key: Exclude<keyof BasicCalculatorFormState, "coilType" | "nagaokaSource">): number => Number(state[key]);
  const input: UiLegacyBasicCalculatorInput = {
    coilType: state.coilType === "multi" ? "multi" : "single",
    nagaokaSource: state.nagaokaSource === "table" || state.nagaokaSource === "manual" ? state.nagaokaSource : "integral",
    coilLengthMm: numeric("coilLengthMm"),
    coilInnerDiameterMm: numeric("coilInnerDiameterMm"),
    turns: numeric("turns"),
    radialWidthMm: numeric("radialWidthMm"),
    conductorHeightMm: numeric("conductorHeightMm"),
    simpsonN: numeric("simpsonN"),
    manualKn: numeric("manualKn"),
    lineVoltageV: numeric("lineVoltageV"),
    ratedPowerKw: numeric("ratedPowerKw"),
    frequencyKHz: numeric("frequencyKHz"),
    rectifierFactor: numeric("rectifierFactor"),
    equivalentResistanceOhm: numeric("equivalentResistanceOhm"),
    targetQ: numeric("targetQ"),
    copperResistivityMicroOhmCm: numeric("copperResistivityMicroOhmCm"),
    workpieceMuR: numeric("workpieceMuR"),
    workpieceResistivityMicroOhmCm: numeric("workpieceResistivityMicroOhmCm"),
    workpieceLengthMm: numeric("workpieceLengthMm"),
    workpieceDiameterMm: numeric("workpieceDiameterMm"),
    coilAcResistanceOhm: numeric("coilAcResistanceOhm"),
    coolingFactor: numeric("coolingFactor"),
    inletTempC: numeric("inletTempC"),
    outletTempC: numeric("outletTempC"),
    waterSpecificHeat: numeric("waterSpecificHeat"),
    waterDensityKgL: numeric("waterDensityKgL"),
  };
  if (Object.entries(input).some(([key, value]) => key !== "coilType" && key !== "nagaokaSource" && !Number.isFinite(value))) {
    return { status: "invalid_input", message: { zh: "请检查所有数值输入。", en: "Check all numeric inputs." } };
  }
  return { status: "success", input };
}

interface BasicFieldSpec {
  readonly id: keyof BasicCalculatorFormState;
  readonly label: string;
  readonly description: string;
  readonly how: string;
  readonly impact: string;
  readonly unit?: string;
  readonly kind: "number" | "select";
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
  readonly options?: readonly Readonly<{ readonly value: string; readonly label: string }>[];
}

const COIL_FIELDS: readonly BasicFieldSpec[] = [
  { id: "coilType", label: "线圈类型", description: "选择单层螺线管，或径向有明显厚度的多层/厚绕组。", how: "按线圈实际绕制结构选择；径向只有一排导体选单层。", impact: "决定长线圈分支采用 Wheeler 单层式还是多层式。", kind: "select", options: [{ value: "single", label: "单层螺线管" }, { value: "multi", label: "多层 / 厚绕组" }] },
  { id: "nagaokaSource", label: "Nagaoka 系数来源", description: "短粗线圈使用的有限长度修正系数来源。", how: "通常选 Simpson 积分；需要复现表格或指定系数时选择相应来源。", impact: "改变短粗线圈的 Nagaoka 电感和对比结果。", kind: "select", options: [{ value: "integral", label: "Simpson 积分" }, { value: "table", label: "查表线性插值" }, { value: "manual", label: "手动输入" }] },
  { id: "coilLengthMm", label: "线圈高度 L₁", description: "线圈沿轴向的总高度。", how: "从第一匝到最后一匝沿轴线量取，单位毫米。", impact: "影响长径比、填充系数和全部电感公式。", unit: "mm", kind: "number", min: "0.001", step: "1" },
  { id: "coilInnerDiameterMm", label: "线圈内径 D₁", description: "线圈内侧自由空间的直径。", how: "在绕组内表面量取直径，单位毫米。", impact: "与径向宽度共同决定平均半径和电感。", unit: "mm", kind: "number", min: "0.001", step: "1" },
  { id: "turns", label: "线圈匝数 N", description: "参与计算的总绕制匝数。", how: "按实际有效匝数填写；兼容原网页，可输入正数。", impact: "电感近似与匝数平方成正比，也影响填充系数。", unit: "turn", kind: "number", min: "0.001", step: "1" },
  { id: "radialWidthMm", label: "径向宽度 wrad", description: "铜管或厚绕组在径向方向的宽度。", how: "沿半径方向量取单根铜管宽度或绕组总厚度，单位毫米。", impact: "用于外径、平均直径以及 Wheeler 多层公式。", unit: "mm", kind: "number", min: "0", step: "1" },
  { id: "conductorHeightMm", label: "铜管轴向高度 hcu", description: "单根铜管沿线圈轴线方向占用的高度。", how: "量取铜管外形在轴向的投影尺寸，单位毫米。", impact: "与匝数、线圈高度共同决定填充系数。", unit: "mm", kind: "number", min: "0", step: "1" },
  { id: "simpsonN", label: "Simpson 分段数 n", description: "把 0 到 π/2 的积分区间分成 n 段。", how: "填写 20 到 2000；程序会取最近整数、夹在范围内并调整为偶数，常用 200 到 800。", impact: "改变椭圆积分数值精度和积分节点表。", unit: "偶数", kind: "number", min: "20", max: "2000", step: "2" },
  { id: "manualKn", label: "手动 Nagaoka 系数 KN", description: "用户指定的有限长度修正系数。", how: "仅选择手动来源时使用，填写 0 到 1 之间的正数。", impact: "直接乘到理想螺线管电感上；无效时回退到 Simpson 积分。", kind: "number", min: "0.000001", max: "1", step: "0.0001" },
];

const POWER_FIELDS: readonly BasicFieldSpec[] = [
  { id: "lineVoltageV", label: "线电压 ULL", description: "中频电源输入侧线电压。", how: "按设备铭牌或当前运行值填写，单位伏。", impact: "参与变压器匝数比估算。", unit: "V", kind: "number", min: "0", step: "1" },
  { id: "ratedPowerKw", label: "额定功率 P", description: "用于反推线圈电流的有功功率。", how: "填写计划或运行功率，单位千瓦。", impact: "通过 I=√(P/Req) 直接影响电流、铜损和水流量。", unit: "kW", kind: "number", min: "0", step: "1" },
  { id: "frequencyKHz", label: "工作频率 f", description: "电源和线圈的工作频率。", how: "按设备设定或测量值填写，单位千赫兹。", impact: "影响肌肤深度、目标等效电感和线圈电压。", unit: "kHz", kind: "number", min: "0.001", step: "1" },
  { id: "rectifierFactor", label: "整流系数 krect", description: "用于电源电压与线圈有功电压之间的比例估算。", how: "按原方案或电源拓扑采用的系数填写。", impact: "用于估算变压器匝数比。", kind: "number", min: "0.001", step: "0.01" },
  { id: "equivalentResistanceOhm", label: "经验等效电阻 Req", description: "原网页中用于反推电流的经验等效电阻。", how: "按已有方案、测量或校准值填写，单位欧姆。", impact: "用于 P=I²Req 反推电流，并参与品质因数和等效电感计算。", unit: "Ω", kind: "number", min: "0.000001", step: "0.001" },
  { id: "targetQ", label: "目标品质因数 Q", description: "希望匹配回路达到的目标品质因数。", how: "按方案目标填写正数。", impact: "与等效电阻、频率共同反推目标等效电感。", kind: "number", min: "0.001", step: "1" },
];

const MATERIAL_FIELDS: readonly BasicFieldSpec[] = [
  { id: "copperResistivityMicroOhmCm", label: "铜电阻率 ρcu", description: "用于估算线圈铜材肌肤深度的电阻率。", how: "按所采用铜材数据填写，单位为 ×10⁻⁶ Ω·cm。", impact: "数值越大，估算肌肤深度越大。", unit: "×10⁻⁶ Ω·cm", kind: "number", min: "0.000001", step: "0.1" },
  { id: "workpieceMuR", label: "炉料相对磁导率 μr,w", description: "工件材料相对于真空的磁导率倍数。", how: "按材料在目标工况下采用的数值填写。", impact: "数值越大，工件肌肤深度越小。", kind: "number", min: "0.000001", step: "0.1" },
  { id: "workpieceResistivityMicroOhmCm", label: "炉料电阻率 ρw", description: "用于估算工件肌肤深度的电阻率。", how: "按工件材料数据填写，单位为 ×10⁻⁶ Ω·cm。", impact: "数值越大，估算穿透深度越大。", unit: "×10⁻⁶ Ω·cm", kind: "number", min: "0.000001", step: "1" },
  { id: "workpieceLengthMm", label: "炉料高度 L₂", description: "圆柱工件沿线圈轴向的高度。", how: "量取或从图纸读取，单位毫米。", impact: "用于几何示意和工件是否超出线圈高度的提醒。", unit: "mm", kind: "number", min: "0", step: "1" },
  { id: "workpieceDiameterMm", label: "炉料直径 D₂", description: "圆柱工件的外径。", how: "量取或从图纸读取，单位毫米。", impact: "用于几何示意和装配间隙提醒。", unit: "mm", kind: "number", min: "0", step: "1" },
];

const COOLING_FIELDS: readonly BasicFieldSpec[] = [
  { id: "coilAcResistanceOhm", label: "线圈交流电阻 Rcu,ac", description: "原网页中用于估算铜损的交流电阻。", how: "按测量、仿真或原方案校准值填写，单位欧姆。", impact: "通过 Pcu=I²Rcu,ac 直接改变铜损和冷却水流量。", unit: "Ω", kind: "number", min: "0", step: "0.001" },
  { id: "coolingFactor", label: "冷却安全系数 kcool", description: "在铜损基础上放大的冷却流量系数。", how: "按项目采用的裕量填写非负数。", impact: "与所需冷却水流量成正比。", kind: "number", min: "0", step: "0.1" },
  { id: "inletTempC", label: "进水温度 Tin", description: "冷却水进入线圈时的温度。", how: "按设计值或入口实测值填写，单位摄氏度。", impact: "与出水温度的差决定单位流量可带走的热量。", unit: "°C", kind: "number", step: "1" },
  { id: "outletTempC", label: "出水温度 Tout", description: "冷却水离开线圈时的温度。", how: "按允许值或出口实测值填写，且应高于进水温度。", impact: "温升越大，按公式得到的所需流量越小。", unit: "°C", kind: "number", step: "1" },
  { id: "waterSpecificHeat", label: "水比热 cp", description: "水每千克每升高一度可吸收的热量。", how: "填写当前计算采用的比热，单位 J/(kg·K)。", impact: "比热越大，按公式得到的所需流量越小。", unit: "J/kg·K", kind: "number", min: "0.001", step: "10" },
  { id: "waterDensityKgL", label: "水密度 ρwater", description: "单位体积冷却水的质量。", how: "填写当前计算采用的密度，单位 kg/L。", impact: "密度越大，按公式得到的体积流量越小。", unit: "kg/L", kind: "number", min: "0.001", step: "0.01" },
];

function LegacyField({ field, value, onChange }: { readonly field: BasicFieldSpec; readonly value: string; readonly onChange: (value: string) => void }) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const help: FieldHelpContent = { what: field.description, how: field.how, impact: field.impact };
  return <div className="basic-matching-field"><label htmlFor={inputId}><span>{field.label}<HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={field.label} /></span>{field.unit === undefined ? null : <code>{field.unit}</code>}</label>{field.kind === "select" ? <select aria-describedby={descriptionId} id={inputId} onChange={(event) => onChange(event.currentTarget.value)} value={value}>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <div className="basic-matching-unit-input"><input aria-describedby={descriptionId} id={inputId} max={field.max} min={field.min} onChange={(event) => onChange(event.currentTarget.value)} step={field.step ?? "any"} type="number" value={value} />{field.unit === undefined ? null : <em>{field.unit}</em>}</div>}<p>{field.description}</p></div>;
}

function ResultTable({ rows }: { readonly rows: readonly Readonly<{ readonly label: string; readonly value: string; readonly highlighted?: boolean }>[] }) {
  return <div className="table-scroll"><table className="basic-matching-table"><tbody>{rows.map((row) => <tr className={row.highlighted === true ? "is-highlighted" : undefined} key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>)}</tbody></table></div>;
}

const EXAMPLES = Object.freeze({
  long: { title: "长线圈", definition: "单层线圈的轴向长度相对平均直径较大。本工具以 l / Dm ≥ 0.4 作为 Wheeler 分支判断线；l / Dm ≥ 1 时更接近传统长螺线管。", params: "l = 200 mm，Din = 80 mm，N = 20，wrad = 4 mm", method: "l / Dm ≥ 0.4 且为单层时，自动采用 Wheeler 单层公式。" },
  short: { title: "短粗线圈", definition: "线圈轴向长度明显小于平均直径，定义为 l / Dm < 0.4。此时端部效应明显，理想长螺线管公式需要长冈系数修正。", params: "l = 80 mm，Din = 260 mm，N = 8，wrad = 6 mm", method: "自动采用 Nagaoka 公式，并按所选来源取得 KN。" },
  multi: { title: "多层线圈", definition: "绕组在径向方向具有明显厚度，匝数不只分布在一层。平均直径采用内、外径的中值，Wheeler 多层式显式包含径向厚度。", params: "l = 100 mm，Din = 120 mm，N = 60，wrad = 30 mm", method: "l / Dm ≥ 0.4 时采用 Wheeler 多层公式；短粗时仍进入 Nagaoka 分支并给出厚度近似提醒。" },
} as const);
type ExampleKey = keyof typeof EXAMPLES;

function ExamplePanel() {
  const [active, setActive] = useState<ExampleKey>("long");
  const example = EXAMPLES[active];
  return <section className="basic-matching-examples"><div className="section-heading"><h3>常见线圈形态</h3><span>示例不会修改输入参数</span></div><div className="basic-matching-example-buttons">{(Object.keys(EXAMPLES) as ExampleKey[]).map((key) => <button className={key === active ? "button button--secondary is-active" : "button button--secondary"} key={key} onClick={() => setActive(key)} type="button">{EXAMPLES[key].title}</button>)}</div><div aria-hidden="true" className={`basic-matching-example-picture basic-matching-example-picture--${active}`}><span /><i /><b /></div><div className="basic-matching-example-copy"><strong>{example.title}</strong><span>{example.definition}</span><dl><div><dt>示意参数</dt><dd>{example.params}</dd></div><div><dt>常用判断</dt><dd>{example.method}</dd></div></dl></div></section>;
}

function MainCalculator({ form, result, update }: { readonly form: BasicCalculatorFormState; readonly result: UiLegacyBasicCalculatorResult; readonly update: (key: keyof BasicCalculatorFormState, value: string) => void }) {
  const valid = result.valid ? result : null;
  const errorText = "error" in result ? result.error : "";
  const tableValue = valid === null ? "--" : Number.isFinite(valid.inductance.tableInductance) ? `${legacyDisplay(valid.inductance.tableInductance, 5)} μH · KN ${legacyDisplay(valid.inductance.table.kn, 6)}` : valid.inductance.table.interval;
  const inductanceRows = valid === null ? [{ label: errorText, value: "--" }] : [
    { label: "推荐空芯电感 L₀", value: `${legacyDisplay(valid.inductance.selected, 5)} μH · ${valid.inductance.method}`, highlighted: true },
    { label: "估算线圈外径 Dout", value: `${legacyDisplay(valid.geometry.outerDiameterMm, 3)} mm` },
    { label: "平均直径 Dm", value: `${legacyDisplay(valid.geometry.meanDiameterMm, 3)} mm` },
    { label: "长径比 l / Dm", value: legacyDisplay(valid.geometry.aspectLD, 6) },
    { label: "填充系数 kf", value: legacyDisplay(valid.geometry.fillFactor, 6) },
    { label: "理想螺线管电感 Lideal", value: `${legacyDisplay(valid.inductance.ideal, 5)} μH` },
    { label: "Nagaoka（当前 KN）", value: `${legacyDisplay(valid.inductance.nagaokaSelectedInductance, 5)} μH · KN ${legacyDisplay(valid.inductance.selectedKn, 6)}` },
    { label: "Nagaoka（积分）", value: `${legacyDisplay(valid.inductance.nagaokaIntegral.inductance, 5)} μH · KN ${legacyDisplay(valid.inductance.nagaokaIntegral.kn, 6)}` },
    { label: "Nagaoka（查表）", value: tableValue },
    { label: "Wheeler 单层", value: `${legacyDisplay(valid.inductance.wheelerSingle, 5)} μH` },
    { label: "Wheeler 多层", value: `${legacyDisplay(valid.inductance.wheelerMulti, 5)} μH` },
  ];
  const systemRows = valid === null ? [{ label: "等待有效输入", value: "--" }] : [
    { label: "铜管肌肤深度 δcu", value: `${legacyDisplay(valid.material.copperSkinDepthMm, 6)} mm` },
    { label: "炉料肌肤深度 δw", value: `${legacyDisplay(valid.material.workpieceSkinDepthMm, 6)} mm` },
    { label: "感应线圈电流 I", value: `${legacyDisplay(valid.electrical.currentA, 4)} A` },
    { label: "经验等效电阻 Req", value: `${legacyDisplay(valid.electrical.equivalentResistanceOhm, 6)} Ω` },
    { label: "目标等效电感 Leq", value: `${legacyDisplay(valid.electrical.equivalentInductanceMicroH, 5)} μH` },
    { label: "感应线圈电压 UL", value: `${legacyDisplay(valid.electrical.coilVoltageV, 4)} V` },
    { label: "有功电压分量 UR", value: `${legacyDisplay(valid.electrical.activeVoltageV, 4)} V` },
    { label: "变压器匝数比 n", value: legacyDisplay(valid.electrical.transformerRatio, 6) },
    { label: "线圈损耗 Pcu", value: `${legacyDisplay(valid.cooling.coilLossKw, 5)} kW` },
    { label: "冷却温升 ΔT", value: `${legacyDisplay(valid.cooling.temperatureRiseC, 3)} °C` },
    { label: "冷却水流量 Qwater", value: `${legacyDisplay(valid.cooling.waterFlowLMin, 5)} L/min` },
  ];
  return <div className="basic-matching-main-grid"><form className="basic-matching-input-panel" onSubmit={(event) => event.preventDefault()}><div className="panel-heading"><div><p className="eyebrow">实时联动</p><h2>输入参数</h2></div><span className="status-chip">输入即计算</span></div><fieldset><legend>线圈与算法</legend><div className="basic-matching-fields">{COIL_FIELDS.filter((field) => field.id !== "manualKn" || form.nagaokaSource === "manual").map((field) => <LegacyField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id]} />)}</div></fieldset><fieldset><legend>电源与匹配</legend><div className="basic-matching-fields">{POWER_FIELDS.map((field) => <LegacyField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id]} />)}</div></fieldset><fieldset><legend>材料与炉料</legend><div className="basic-matching-fields">{MATERIAL_FIELDS.map((field) => <LegacyField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id]} />)}</div></fieldset><fieldset><legend>损耗与冷却</legend><div className="basic-matching-fields">{COOLING_FIELDS.map((field) => <LegacyField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id]} />)}</div></fieldset><p className="basic-matching-note">Req 与 Rcu,ac 按原计算表保留为校准输入；本工具不会由线圈几何自动猜测这两个参数。</p></form><section className="basic-matching-output-panel"><div className={`basic-matching-decision${!result.valid || result.issues.some((issue) => issue.type === "error") ? " is-error" : result.issues.length > 0 ? " is-warning" : ""}`}><p className="eyebrow">自动公式判断</p><h2>{valid?.inductance.method ?? "无法计算"}</h2><div className="basic-matching-decision-tags"><span>{valid?.inductance.routeLabel ?? "几何输入无效"}</span><span>{valid === null ? "等待修正" : `KN：${valid.inductance.knSourceLabel}`}</span></div><p>{valid?.inductance.reason ?? errorText}</p></div><LegacyCoilCanvas result={result} /><div className="basic-matching-metrics"><div><span>推荐空芯电感 L₀</span><strong>{legacyDisplay(valid?.inductance.selected ?? Number.NaN, 4)}</strong><em>μH</em></div><div><span>感应线圈电流 I</span><strong>{legacyDisplay(valid?.electrical.currentA ?? Number.NaN, 3)}</strong><em>A</em></div><div><span>目标等效电感 Leq</span><strong>{legacyDisplay(valid?.electrical.equivalentInductanceMicroH ?? Number.NaN, 4)}</strong><em>μH</em></div><div><span>冷却水流量</span><strong>{legacyDisplay(valid?.cooling.waterFlowLMin ?? Number.NaN, 4)}</strong><em>L/min</em></div></div>{result.issues.length === 0 ? null : <div className="basic-matching-alerts">{result.issues.map((issue) => <div className={issue.type === "error" ? "basic-matching-alert is-error" : "basic-matching-alert"} key={issue.text}>{issue.text}</div>)}</div>}<div className="basic-matching-results-columns"><section><div className="section-heading"><h3>电感与几何</h3><span>全部方法同步对比</span></div><ResultTable rows={inductanceRows} /></section><section><div className="section-heading"><h3>材料、电气与冷却</h3><span>按 Excel 计算链</span></div><ResultTable rows={systemRows} /></section></div><ExamplePanel /></section></div>;
}

function csvCell(value: string): string { return `"${value.replaceAll('"', '""')}"`; }

export function basicResultCsv(result: UiLegacyBasicCalculatorResult, language: UiLanguage): string {
  const headings = language === "zh-CN" ? ["分组", "结果", "数值", "单位"] : ["Group", "Result", "Value", "Unit"];
  if ("error" in result) return [headings, ["错误", result.error, "--", "--"]].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const rows: readonly (readonly string[])[] = [
    ["电感与几何", "推荐空芯电感 L0", legacyDisplay(result.inductance.selected, 10), "μH"], ["电感与几何", "线圈外径 Dout", legacyDisplay(result.geometry.outerDiameterMm, 10), "mm"], ["电感与几何", "平均直径 Dm", legacyDisplay(result.geometry.meanDiameterMm, 10), "mm"], ["电感与几何", "长径比 l/Dm", legacyDisplay(result.geometry.aspectLD, 10), "—"], ["电感与几何", "填充系数 kf", legacyDisplay(result.geometry.fillFactor, 10), "—"], ["电感与几何", "理想螺线管电感", legacyDisplay(result.inductance.ideal, 10), "μH"], ["电感与几何", "Nagaoka 当前结果", legacyDisplay(result.inductance.nagaokaSelectedInductance, 10), "μH"], ["电感与几何", "Nagaoka 积分结果", legacyDisplay(result.inductance.nagaokaIntegral.inductance, 10), "μH"], ["电感与几何", "Nagaoka 查表结果", legacyDisplay(result.inductance.tableInductance, 10), "μH"], ["电感与几何", "Wheeler 单层", legacyDisplay(result.inductance.wheelerSingle, 10), "μH"], ["电感与几何", "Wheeler 多层", legacyDisplay(result.inductance.wheelerMulti, 10), "μH"], ["材料、电气与冷却", "铜管肌肤深度", legacyDisplay(result.material.copperSkinDepthMm, 10), "mm"], ["材料、电气与冷却", "炉料肌肤深度", legacyDisplay(result.material.workpieceSkinDepthMm, 10), "mm"], ["材料、电气与冷却", "感应线圈电流", legacyDisplay(result.electrical.currentA, 10), "A"], ["材料、电气与冷却", "经验等效电阻", legacyDisplay(result.electrical.equivalentResistanceOhm, 10), "Ω"], ["材料、电气与冷却", "目标等效电感", legacyDisplay(result.electrical.equivalentInductanceMicroH, 10), "μH"], ["材料、电气与冷却", "感应线圈电压", legacyDisplay(result.electrical.coilVoltageV, 10), "V"], ["材料、电气与冷却", "有功电压分量", legacyDisplay(result.electrical.activeVoltageV, 10), "V"], ["材料、电气与冷却", "变压器匝数比", legacyDisplay(result.electrical.transformerRatio, 10), "—"], ["材料、电气与冷却", "线圈损耗", legacyDisplay(result.cooling.coilLossKw, 10), "kW"], ["材料、电气与冷却", "冷却温升", legacyDisplay(result.cooling.temperatureRiseC, 10), "°C"], ["材料、电气与冷却", "冷却水流量", legacyDisplay(result.cooling.waterFlowLMin, 10), "L/min"],
  ];
  return [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function downloadText(text: string, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export function BasicCalculatorPage({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, text } = useUiLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [activePage, setActivePage] = useState<LegacyBasicPage>("calculator");
  const [form, setForm] = useState<BasicCalculatorFormState>(DEFAULT_BASIC_CALCULATOR_FORM);
  const [lookupRatio, setLookupRatio] = useState("3.43333333");
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const built = useMemo(() => buildBasicCalculatorInput(form), [form]);
  const result = useMemo<UiLegacyBasicCalculatorResult>(() => built.status === "success" ? application.basicMatching.calculate(built.input) : { input: application.basicMatching.defaultInput, valid: false, error: built.message.zh, issues: [{ type: "error", text: built.message.zh }] }, [application, built]);
  function update(key: keyof BasicCalculatorFormState, value: string): void { setForm((current) => ({ ...current, [key]: value })); setFileMessage(null); }
  async function openForm(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file === undefined) return;
    try {
      const parsed = parseBasicCalculatorForm(await file.text());
      if (parsed.status !== "success") { setFileMessage(language === "zh-CN" ? parsed.message.zh : parsed.message.en); return; }
      setForm(parsed.form);
      const input = buildBasicCalculatorInput(parsed.form);
      if (input.status === "success") { const loaded = application.basicMatching.calculate(input.input); if (loaded.valid) setLookupRatio(String(Number(loaded.geometry.aspectDL.toFixed(8)))); }
      setFileMessage(text("基础方案已恢复，全部结果已重新计算。", "The basic form was restored and all results were recalculated."));
    } catch { setFileMessage(text("无法读取所选基础方案文件。", "The selected basic form could not be read.")); }
  }
  function syncLookup(): void { if (result.valid) setLookupRatio(String(Number(result.geometry.aspectDL.toFixed(8)))); }
  return <section aria-labelledby="basic-calculator-title" className="page basic-matching-page"><header className="page-header"><div><p className="eyebrow">电感 · 电气匹配 · 损耗冷却</p><h1 id="basic-calculator-title">感应线圈匹配与电感综合计算器</h1><p className="page-header__description">原三文件网页已完整整合到本页：输入实时计算，九个页面同步展示公式、查表、积分、几何、电气、损耗、冷却和工程场景。</p></div><div className="basic-matching-top-summary"><span>{result.valid ? result.inductance.method : "等待输入"}</span><strong>{result.valid ? `${legacyDisplay(result.inductance.selected, 4)} μH` : "-- μH"}</strong></div></header><div className="page-header__actions basic-matching-actions"><input accept=".json,application/json" aria-label="打开基础方案" className="sr-only" onChange={(event) => { void openForm(event); }} ref={fileRef} type="file" /><button className="button button--secondary" onClick={() => fileRef.current?.click()} type="button">打开基础方案</button><button className="button button--secondary" onClick={() => { downloadText(serializeBasicCalculatorForm(form, new Date().toISOString()), "感应线圈匹配基础方案.json", "application/json;charset=utf-8"); setFileMessage("基础方案已保存到本地文件。"); }} type="button">保存基础方案</button><button className="button button--secondary" onClick={() => downloadText(`\uFEFF${basicResultCsv(result, language)}`, "感应线圈匹配计算结果.csv", "text/csv;charset=utf-8")} type="button">导出结果 CSV</button><button className="button button--secondary" onClick={() => window.print()} type="button">打印结果</button><button className="button button--secondary" onClick={() => { setForm(DEFAULT_BASIC_CALCULATOR_FORM); setLookupRatio("3.43333333"); setFileMessage("已恢复原网页默认输入。"); }} type="button">恢复默认值</button></div>{fileMessage === null ? null : <div className="message message--success" role="status"><strong>基础方案</strong><p>{fileMessage}</p></div>}<nav aria-label="基础计算器页面" className="basic-matching-tabs" role="tablist">{LEGACY_BASIC_TABS.map((tab) => <button aria-selected={activePage === tab.id} className={activePage === tab.id ? "is-active" : undefined} key={tab.id} onClick={() => setActivePage(tab.id)} role="tab" type="button">{tab.label}</button>)}</nav><div className="basic-matching-page-content" role="tabpanel">{activePage === "calculator" ? <MainCalculator form={form} result={result} update={update} /> : <LegacyReferencePage application={application.basicMatching} lookupRatio={lookupRatio} onLookupRatioChange={setLookupRatio} onSyncLookup={syncLookup} page={activePage} result={result} />}</div><footer className="basic-matching-footer">计算结果用于工程估算与方案比较；最终设计应结合实测、材料温度特性、邻近效应及电磁仿真复核。</footer></section>;
}
