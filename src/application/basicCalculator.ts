import type { LoadedState } from "../domain/electrical.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import {
  calculateMvpB02,
  calculateMvpD07,
  type MvpD07CalculationInput,
  type MvpEmCalculationResult,
} from "./mvpEmCalculations.js";
import {
  calculateMvpB03,
  type MvpInductanceCalculationResult,
} from "./mvpInductanceCalculations.js";

export const BASIC_CALCULATOR_SCHEMA_VERSION = "0.9.0" as const;

/**
 * Public policy for the guided calculator. These are application-boundary
 * guarantees, not formal method-registry activation claims.
 */
export const BASIC_CALCULATOR_POLICY = cloneAndDeepFreeze({
  schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
  suppliesEngineeringDefaults: false,
  importsHistoricalSpreadsheetCoefficients: false,
  calibratesAgainstHistoricalSoftwareValues: false,
  automaticallyUsesIdealLimitAsSeriesInductance: false,
  partialResultIsolation: true,
} as const);

export interface BasicLocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface BasicCoilInput {
  /** Integer electrical turn count. */
  readonly electricalTurnCount: number;
  /** Axial projected conductor size in millimetres. */
  readonly conductorAxialSizeMm: number;
  /** Full physical winding length in millimetres. */
  readonly windingLengthMm: number;
  /** Explicit current-path diameter in millimetres. */
  readonly currentPathDiameterMm: number;
  readonly windingConstruction:
    | "uniform_identical_single_layer"
    | "other_or_unknown";
  readonly fullPhysicalWindingLengthConfirmed: boolean;
  readonly nonOverlappingTurnsConfirmed: boolean;
  readonly magneticMedium: "air" | "uniform_linear";
  /** Null for air; required and positive for a uniform linear medium. */
  readonly relativePermeability: number | null;
}

export interface BasicSeriesElectricalInput {
  /** Externally established same-state series resistance. */
  readonly resistanceOhm: number;
  /** Externally established same-state series inductance in microhenries. */
  readonly inductanceMicrohenry: number;
  /** Current magnitude at the declared coil series port. */
  readonly currentA: number;
  readonly frequencyKhz: number;
  readonly portName: string;
  readonly referencePlaneName: string;
  readonly loadedState: LoadedState;
  readonly equivalentStateName: string;
  readonly currentBasis: "rms" | "fundamental_rms";
  readonly coilSeriesPortConfirmed: boolean;
  readonly linearSinusoidalStateConfirmed: boolean;
}

export interface BasicCalculatorInput {
  readonly schemaVersion: typeof BASIC_CALCULATOR_SCHEMA_VERSION;
  /** Null explicitly means that the coil calculations were not requested. */
  readonly coil: BasicCoilInput | null;
  /** Null explicitly means that the series electrical calculation was not requested. */
  readonly seriesElectrical: BasicSeriesElectricalInput | null;
}

export type BasicCalculatorSectionKey =
  | "coil_fill_factor"
  | "ideal_long_solenoid_limit"
  | "series_port_electrical";

export type BasicCalculatorSectionStatus =
  | "success"
  | "success_with_warnings"
  | "invalid_input"
  | "insufficient_data"
  | "not_applicable"
  | "not_requested";

export interface BasicComplexValue {
  readonly real: number;
  readonly imaginary: number;
}

export interface BasicCalculatorOutput {
  readonly key:
    | "axialFillFactor"
    | "idealInductanceLimit"
    | "inductiveReactance"
    | "seriesImpedance"
    | "impedanceMagnitude"
    | "seriesQualityFactor"
    | "resistiveVoltage"
    | "inductiveVoltage"
    | "terminalVoltage";
  readonly label: BasicLocalizedText;
  readonly status: "available" | "unavailable";
  readonly value: number | BasicComplexValue | null;
  readonly unit: "one" | "µH" | "Ω" | "V" | null;
  readonly note: BasicLocalizedText | null;
}

export interface BasicCalculatorError {
  /** Technical code is present only on an error result. */
  readonly code: string;
  readonly message: BasicLocalizedText;
  readonly action: BasicLocalizedText;
}

export interface BasicCalculatorSectionResult {
  readonly section: BasicCalculatorSectionKey;
  readonly title: BasicLocalizedText;
  readonly status: BasicCalculatorSectionStatus;
  readonly outputs: readonly BasicCalculatorOutput[];
  readonly warnings: readonly BasicLocalizedText[];
  readonly assumptions: readonly BasicLocalizedText[];
  readonly limitations: readonly BasicLocalizedText[];
  readonly sourceTitles: readonly BasicLocalizedText[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly summary: BasicLocalizedText;
  }>;
  readonly error: BasicCalculatorError | null;
}

export type BasicCalculatorOverallStatus =
  | "complete"
  | "partial"
  | "failed"
  | "empty"
  | "invalid_input";

export interface BasicCalculatorResult {
  readonly schemaVersion: typeof BASIC_CALCULATOR_SCHEMA_VERSION;
  readonly status: BasicCalculatorOverallStatus;
  readonly sections: readonly BasicCalculatorSectionResult[];
  readonly notices: readonly BasicLocalizedText[];
  readonly error: BasicCalculatorError | null;
}

const TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "coil",
  "seriesElectrical",
] as const);

const COIL_KEYS = Object.freeze([
  "electricalTurnCount",
  "conductorAxialSizeMm",
  "windingLengthMm",
  "currentPathDiameterMm",
  "windingConstruction",
  "fullPhysicalWindingLengthConfirmed",
  "nonOverlappingTurnsConfirmed",
  "magneticMedium",
  "relativePermeability",
] as const);

const SERIES_KEYS = Object.freeze([
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
] as const);

const MILLIMETRES_PER_METRE = 1_000;
const MICROHENRIES_PER_HENRY = 1_000_000;
const HERTZ_PER_KILOHERTZ = 1_000;

function text(zh: string, en: string): BasicLocalizedText {
  return Object.freeze({ zh, en });
}

const SECTION_CONTENT = cloneAndDeepFreeze({
  coil_fill_factor: {
    title: text("线圈轴向填充系数", "Coil axial fill factor"),
    assumptions: [
      text(
        "匝数按电气有效匝数填写，导体轴向尺寸按线圈轴线方向的投影尺寸填写。",
        "Turn count is the electrical turn count and conductor size is its axial projection.",
      ),
    ],
    limitations: [
      text(
        "仅适用于截面相同、沿轴向不重叠的均匀单层线圈。线圈长度必须从第一匝外缘量到最后一匝外缘。",
        "Applicable only to a uniform single layer of identical, axially non-overlapping turns; winding length is measured outer edge to outer edge.",
      ),
    ],
    sources: [
      text(
        "受控线圈几何定义与轴向填充系数推导",
        "Controlled coil-geometry definition and axial fill-factor derivation",
      ),
    ],
    applicability: text(
      "均匀、同截面、无轴向重叠的单层线圈。",
      "Uniform single-layer coils with identical, axially non-overlapping turns.",
    ),
  },
  ideal_long_solenoid_limit: {
    title: text("理想长螺线管电感极限", "Ideal long-solenoid inductance limit"),
    assumptions: [
      text(
        "介质为空气或用户明确给出的均匀线性磁介质；线圈按无限长、均匀电流片理想化。",
        "The medium is air or an explicitly supplied uniform linear medium, and the coil is idealized as an infinitely long uniform current sheet.",
      ),
    ],
    limitations: [
      text(
        "这是解析极限检查，不是有限长度实际线圈的推荐电感。它不包含端部、离散绕组、引线、工件负载、漏磁和分布电容影响。",
        "This is an analytical limit check, not a recommended finite-coil inductance; end effects, discrete turns, leads, workpiece loading, leakage and distributed capacitance are excluded.",
      ),
    ],
    sources: [
      text(
        "NIST CODATA 2022 真空磁导率与理想长螺线管解析关系",
        "NIST CODATA 2022 vacuum permeability and the ideal long-solenoid analytical relation",
      ),
    ],
    applicability: text(
      "仅用于空气或均匀线性介质中的理想长螺线管极限检查。",
      "Only for an ideal long-solenoid limit check in air or a uniform linear medium.",
    ),
  },
  series_port_electrical: {
    title: text("线圈串联端口电气量", "Coil series-port electrical quantities"),
    assumptions: [
      text(
        "电阻、电感、电流和频率属于同一线圈端口、同一参考位置和同一负载状态，并采用正弦稳态有效值。",
        "Resistance, inductance, current and frequency share one coil port, reference plane and loaded state under sinusoidal steady-state RMS conventions.",
      ),
    ],
    limitations: [
      text(
        "这里不从线圈几何反推实际串联电阻或电感；两者必须由同一状态下的测量、仿真或已批准方法另行建立。电压结果不是电网侧电压，也不是谐振槽路总电压。",
        "This calculation does not infer actual series resistance or inductance from geometry; both must be established independently at the same state. Voltage outputs are neither grid-side nor whole resonant-tank voltages.",
      ),
    ],
    sources: [
      text(
        "交流串联端口电路关系与受控推导",
        "Controlled AC series-port circuit relations and derivation",
      ),
    ],
    applicability: text(
      "线性正弦稳态下、边界和状态一致的线圈串联等效端口。",
      "A state- and boundary-matched coil series-equivalent port in linear sinusoidal steady state.",
    ),
  },
} as const);

const RESULT_NOTICES = cloneAndDeepFreeze([
  text(
    "本计算器不提供隐含工程默认值，也不使用历史表格数值或经验系数校准结果。",
    "This calculator supplies no hidden engineering defaults and does not calibrate results from historical spreadsheet values or empirical coefficients.",
  ),
  text(
    "理想长螺线管电感是解析极限，不会自动传入串联端口作为实际电感。",
    "The ideal long-solenoid inductance is an analytical limit and is never passed automatically into the series-port calculation as actual inductance.",
  ),
] as const);

function numberOrNaN(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function unavailableOutput(
  key: BasicCalculatorOutput["key"],
  label: BasicLocalizedText,
  unit: BasicCalculatorOutput["unit"],
  note: BasicLocalizedText,
): BasicCalculatorOutput {
  return {
    key,
    label,
    status: "unavailable",
    value: null,
    unit,
    note,
  };
}

function availableOutput(
  key: BasicCalculatorOutput["key"],
  label: BasicLocalizedText,
  value: number | BasicComplexValue,
  unit: Exclude<BasicCalculatorOutput["unit"], null>,
  note: BasicLocalizedText | null = null,
): BasicCalculatorOutput {
  return { key, label, status: "available", value, unit, note };
}

function error(
  code: string,
  zhMessage: string,
  enMessage: string,
  zhAction: string,
  enAction: string,
): BasicCalculatorError {
  return {
    code,
    message: text(zhMessage, enMessage),
    action: text(zhAction, enAction),
  };
}

function sectionBase(
  section: BasicCalculatorSectionKey,
  status: BasicCalculatorSectionStatus,
  outputs: readonly BasicCalculatorOutput[],
  warnings: readonly BasicLocalizedText[],
  applicabilityStatus: BasicCalculatorSectionResult["applicability"]["status"],
  sectionError: BasicCalculatorError | null,
): BasicCalculatorSectionResult {
  const content = SECTION_CONTENT[section];
  return {
    section,
    title: content.title,
    status,
    outputs,
    warnings,
    assumptions: content.assumptions,
    limitations: content.limitations,
    sourceTitles: content.sources,
    applicability: {
      status: applicabilityStatus,
      summary: content.applicability,
    },
    error: sectionError,
  };
}

function notRequested(section: BasicCalculatorSectionKey): BasicCalculatorSectionResult {
  return sectionBase(section, "not_requested", [], [], "not_evaluated", null);
}

function invalidSectionSchema(
  section: BasicCalculatorSectionKey,
  code: string,
): BasicCalculatorSectionResult {
  return sectionBase(
    section,
    "invalid_input",
    [],
    [],
    "not_evaluated",
    error(
      code,
      "输入结构不完整或包含未识别字段，因此未执行计算。",
      "The input structure is incomplete or contains unrecognized fields, so no calculation was run.",
      "请只提交页面列出的字段，并重新填写该部分。",
      "Submit only the fields shown by the application and re-enter this section.",
    ),
  );
}

function adapterFailure(
  code: string,
  section: BasicCalculatorSectionKey,
): BasicCalculatorError {
  const action = section === "coil_fill_factor"
    ? text(
        "检查匝数、导体轴向尺寸、线圈总长度，并明确确认单层、同截面和无轴向重叠。",
        "Check turn count, conductor axial size and full winding length, then explicitly confirm the uniform identical single-layer and non-overlap conditions.",
      )
    : section === "ideal_long_solenoid_limit"
      ? text(
          "检查电流路径直径、线圈总长度、匝数和磁介质；空气介质不应另填相对磁导率。",
          "Check current-path diameter, winding length, turn count and magnetic medium; do not enter a separate relative permeability for air.",
        )
      : text(
          "检查电阻、电感、电流、频率、端口边界和运行状态，确认它们完全一致且属于线性正弦稳态。",
          "Check resistance, inductance, current, frequency, port boundary and operating state, and confirm that they match under linear sinusoidal steady state.",
        );
  return {
    code,
    message: text(
      "输入不满足该计算的受控条件，未产生数值结果。",
      "The input does not satisfy the controlled conditions for this calculation, so no numeric result was produced.",
    ),
    action,
  };
}

function adapterStatus(
  status: MvpEmCalculationResult["status"] | MvpInductanceCalculationResult["status"],
): Exclude<BasicCalculatorSectionStatus, "not_requested"> {
  return status === "disabled" ? "insufficient_data" : status;
}

function fillFactorSection(
  coil: Readonly<Record<string, unknown>>,
): BasicCalculatorSectionResult {
  const result = calculateMvpB02({
    electricalTurnCount: numberOrNaN(coil.electricalTurnCount),
    conductorAxialSizeM:
      numberOrNaN(coil.conductorAxialSizeMm) / MILLIMETRES_PER_METRE,
    windingEnvelopeLengthM:
      numberOrNaN(coil.windingLengthMm) / MILLIMETRES_PER_METRE,
    windingClass: coil.windingConstruction === "uniform_identical_single_layer"
      ? "uniform_single_layer"
      : "other",
    envelopeDefinition: coil.fullPhysicalWindingLengthConfirmed === true
      ? "ADR-0003_full_axial_envelope"
      : "other_or_unknown",
    identicalTurnSections:
      coil.windingConstruction === "uniform_identical_single_layer",
    nonOverlappingAxialProjection:
      coil.nonOverlappingTurnsConfirmed === true,
  });
  if (result.status !== "success") {
    return sectionBase(
      "coil_fill_factor",
      adapterStatus(result.status),
      [],
      [],
      result.applicability.status,
      adapterFailure(result.failure?.code ?? "BASIC.fill_factor_failed", "coil_fill_factor"),
    );
  }
  const value = result.outputs.find((candidate) => candidate.outputId === "k_fill_axial");
  const output = value !== undefined && typeof value.value === "number"
    ? availableOutput(
        "axialFillFactor",
        text("轴向填充系数", "Axial fill factor"),
        value.value,
        "one",
      )
    : unavailableOutput(
        "axialFillFactor",
        text("轴向填充系数", "Axial fill factor"),
        "one",
        text("计算核心未返回该结果。", "The calculation core did not return this result."),
      );
  return sectionBase(
    "coil_fill_factor",
    result.status,
    [output],
    [],
    result.applicability.status,
    null,
  );
}

function idealInductanceSection(
  coil: Readonly<Record<string, unknown>>,
): BasicCalculatorSectionResult {
  const result = calculateMvpB03({
    methodId: "B-03",
    purpose: "analytical_limit_check",
    currentPathDiameterM:
      numberOrNaN(coil.currentPathDiameterMm) / MILLIMETRES_PER_METRE,
    windingEnvelopeLengthM:
      numberOrNaN(coil.windingLengthMm) / MILLIMETRES_PER_METRE,
    electricalTurnCount: numberOrNaN(coil.electricalTurnCount),
    mediumKind: stringOrEmpty(coil.magneticMedium) as "air" | "uniform_linear",
    relativePermeability: coil.relativePermeability === null
      ? null
      : numberOrNaN(coil.relativePermeability),
  });
  if (result.status !== "success_with_warnings") {
    return sectionBase(
      "ideal_long_solenoid_limit",
      adapterStatus(result.status),
      [],
      [],
      result.applicability.status,
      adapterFailure(
        result.failure?.code ?? "BASIC.ideal_inductance_failed",
        "ideal_long_solenoid_limit",
      ),
    );
  }
  const value = result.outputs.find((candidate) => candidate.outputId === "L_inf");
  const output = value !== undefined && typeof value.value === "number"
    ? availableOutput(
        "idealInductanceLimit",
        text("理想长螺线管电感极限", "Ideal long-solenoid inductance limit"),
        value.value * MICROHENRIES_PER_HENRY,
        "µH",
        text(
          "仅作解析极限检查，不代表有限长度实际线圈电感。",
          "Analytical limit check only; this is not the actual inductance of a finite coil.",
        ),
      )
    : unavailableOutput(
        "idealInductanceLimit",
        text("理想长螺线管电感极限", "Ideal long-solenoid inductance limit"),
        "µH",
        text("计算核心未返回该结果。", "The calculation core did not return this result."),
      );
  return sectionBase(
    "ideal_long_solenoid_limit",
    result.status,
    [output],
    [
      text(
        "该数值是理想无限长线圈的解析极限，不能作为有限长度线圈的推荐预测值。",
        "This value is the analytical limit for an ideal infinitely long coil and must not be used as the recommended prediction for a finite coil.",
      ),
    ],
    result.applicability.status,
    null,
  );
}

function seriesWarningTexts(result: MvpEmCalculationResult): readonly BasicLocalizedText[] {
  if (result.warnings.length === 0) return [];
  return result.warnings.map((warning) => warning.code ===
      "D-07.quality_factor_unavailable_zero_resistance"
    ? text(
        "串联电阻为零时，品质因数趋于无穷，软件不会显示一个有限的品质因数。",
        "When series resistance is zero, quality factor tends to infinity and the application does not report a finite value.",
      )
    : text(
        "该结果带有受控适用性警告，请检查本页列出的假设和适用范围。",
        "This result carries a controlled applicability warning; review the assumptions and applicability shown here.",
      ));
}

const SERIES_OUTPUT_DEFINITIONS = cloneAndDeepFreeze([
  ["XL", "inductiveReactance", text("感抗", "Inductive reactance"), "Ω"],
  ["Zcomplex", "seriesImpedance", text("串联复阻抗", "Complex series impedance"), "Ω"],
  ["|Z|", "impedanceMagnitude", text("阻抗幅值", "Impedance magnitude"), "Ω"],
  ["Qs", "seriesQualityFactor", text("串联品质因数", "Series quality factor"), "one"],
  ["UR", "resistiveVoltage", text("电阻电压分量", "Resistive voltage component"), "V"],
  ["UX", "inductiveVoltage", text("感性电压分量", "Inductive voltage component"), "V"],
  ["Uterminal", "terminalVoltage", text("线圈端口电压", "Coil series-port voltage"), "V"],
] as const);

function seriesElectricalSection(
  series: Readonly<Record<string, unknown>>,
): BasicCalculatorSectionResult {
  const result = calculateMvpD07({
    resistanceOhm: numberOrNaN(series.resistanceOhm),
    inductanceH:
      numberOrNaN(series.inductanceMicrohenry) / MICROHENRIES_PER_HENRY,
    currentA: numberOrNaN(series.currentA),
    frequencyHz: numberOrNaN(series.frequencyKhz) * HERTZ_PER_KILOHERTZ,
    portId: stringOrEmpty(series.portName),
    referencePlaneId: stringOrEmpty(series.referencePlaneName),
    loadedState: stringOrEmpty(series.loadedState) as LoadedState,
    seriesEquivalentId: stringOrEmpty(series.equivalentStateName),
    quantityBasis: stringOrEmpty(series.currentBasis) as "rms" | "fundamental_rms",
    portInterpretation: (series.coilSeriesPortConfirmed === true
      ? "coil_series_equivalent_port"
      : "other_or_unknown") as MvpD07CalculationInput["portInterpretation"],
    modelRegime: (series.linearSinusoidalStateConfirmed === true
      ? "linear_sinusoidal_steady_state"
      : "nonlinear_or_non_sinusoidal_or_unknown") as MvpD07CalculationInput["modelRegime"],
  });
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    return sectionBase(
      "series_port_electrical",
      result.status,
      [],
      [],
      result.applicability.status,
      adapterFailure(
        result.failure?.code ?? "BASIC.series_electrical_failed",
        "series_port_electrical",
      ),
    );
  }
  const outputs = SERIES_OUTPUT_DEFINITIONS.map(
    ([internalKey, publicKey, label, publicUnit]): BasicCalculatorOutput => {
      const candidate = result.outputs.find((outputItem) =>
        outputItem.outputId === internalKey);
      if (
        candidate !== undefined &&
        candidate.status === "available" &&
        candidate.value !== null
      ) {
        return availableOutput(publicKey, label, candidate.value, publicUnit);
      }
      const isQualityFactor = publicKey === "seriesQualityFactor";
      return unavailableOutput(
        publicKey,
        label,
        isQualityFactor ? null : publicUnit,
        isQualityFactor
          ? text(
              "串联电阻为零时，品质因数没有有限数值。",
              "Quality factor has no finite value when series resistance is zero.",
            )
          : text(
              "计算核心未返回该结果。",
              "The calculation core did not return this result.",
            ),
      );
    },
  );
  return sectionBase(
    "series_port_electrical",
    result.status,
    outputs,
    seriesWarningTexts(result),
    result.applicability.status,
    null,
  );
}

function resultStatus(sections: readonly BasicCalculatorSectionResult[]): BasicCalculatorOverallStatus {
  const requested = sections.filter((section) => section.status !== "not_requested");
  if (requested.length === 0) return "empty";
  const successful = requested.filter((section) =>
    section.status === "success" || section.status === "success_with_warnings");
  if (successful.length === requested.length) return "complete";
  if (successful.length > 0) return "partial";
  return "failed";
}

function invalidTopLevelResult(code: string): BasicCalculatorResult {
  return cloneAndDeepFreeze({
    schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
    status: "invalid_input" as const,
    sections: [] as const,
    notices: RESULT_NOTICES,
    error: error(
      code,
      "基础计算器输入结构无效，未执行任何计算。",
      "The basic-calculator input structure is invalid; no calculation was run.",
      "请使用当前页面重新填写，不要添加隐藏字段或旧版本字段。",
      "Re-enter the data using the current application and do not add hidden or legacy fields.",
    ),
  });
}

/**
 * Calculate the three independent, controlled parts of one guided solution.
 * A failure in one part never causes another valid part to be discarded.
 */
export function calculateBasicCalculator(input: BasicCalculatorInput | unknown): BasicCalculatorResult {
  const topLevel = readExactPlainDataRecord(input, TOP_LEVEL_KEYS);
  if (
    topLevel === null ||
    topLevel.schemaVersion !== BASIC_CALCULATOR_SCHEMA_VERSION
  ) {
    return invalidTopLevelResult("BASIC.input_schema_invalid");
  }

  let fillFactor: BasicCalculatorSectionResult;
  let idealInductance: BasicCalculatorSectionResult;
  if (topLevel.coil === null) {
    fillFactor = notRequested("coil_fill_factor");
    idealInductance = notRequested("ideal_long_solenoid_limit");
  } else {
    const coil = readExactPlainDataRecord(topLevel.coil, COIL_KEYS);
    if (coil === null) {
      fillFactor = invalidSectionSchema(
        "coil_fill_factor",
        "BASIC.coil_input_schema_invalid",
      );
      idealInductance = invalidSectionSchema(
        "ideal_long_solenoid_limit",
        "BASIC.coil_input_schema_invalid",
      );
    } else {
      fillFactor = fillFactorSection(coil);
      idealInductance = idealInductanceSection(coil);
    }
  }

  let seriesElectrical: BasicCalculatorSectionResult;
  if (topLevel.seriesElectrical === null) {
    seriesElectrical = notRequested("series_port_electrical");
  } else {
    const series = readExactPlainDataRecord(topLevel.seriesElectrical, SERIES_KEYS);
    seriesElectrical = series === null
      ? invalidSectionSchema(
          "series_port_electrical",
          "BASIC.series_input_schema_invalid",
        )
      : seriesElectricalSection(series);
  }

  const sections = [fillFactor, idealInductance, seriesElectrical];
  return cloneAndDeepFreeze({
    schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
    status: resultStatus(sections),
    sections,
    notices: RESULT_NOTICES,
    error: null,
  });
}
