/**
 * Compatibility implementation of the supplied three-file induction-coil
 * calculator.  The equations, defaults, branch point, lookup table and
 * fallback behaviour intentionally match that standalone page.  It is kept
 * separate from the controlled engineering-method adapters so that using the
 * compatibility page cannot silently alter formal calculation records.
 */

export const LEGACY_BASIC_CALCULATOR_SCHEMA_VERSION = "0.9.0-compat.1" as const;
export const LEGACY_BASIC_MU0 = 4 * Math.PI * 1e-7;
const INCH_PER_MM = 1 / 25.4;

export const LEGACY_NAGAOKA_TABLE = Object.freeze([
  [0.1, 0.96],
  [0.2, 0.92],
  [0.3, 0.88],
  [0.4, 0.85],
  [0.6, 0.79],
  [0.8, 0.74],
  [1.0, 0.69],
  [1.5, 0.60],
  [2.0, 0.52],
  [3.0, 0.43],
  [4.0, 0.37],
  [5.0, 0.32],
  [10.0, 0.20],
  [20.0, 0.12],
] as const);

export type LegacyCoilType = "single" | "multi";
export type LegacyNagaokaSource = "integral" | "table" | "manual";

export interface LegacyBasicCalculatorInput {
  readonly coilType: LegacyCoilType;
  readonly nagaokaSource: LegacyNagaokaSource;
  readonly coilLengthMm: number;
  readonly coilInnerDiameterMm: number;
  readonly turns: number;
  readonly radialWidthMm: number;
  readonly conductorHeightMm: number;
  readonly simpsonN: number;
  readonly manualKn: number;
  readonly lineVoltageV: number;
  readonly ratedPowerKw: number;
  readonly frequencyKHz: number;
  readonly rectifierFactor: number;
  readonly equivalentResistanceOhm: number;
  readonly targetQ: number;
  readonly copperResistivityMicroOhmCm: number;
  readonly workpieceMuR: number;
  readonly workpieceResistivityMicroOhmCm: number;
  readonly workpieceLengthMm: number;
  readonly workpieceDiameterMm: number;
  readonly coilAcResistanceOhm: number;
  readonly coolingFactor: number;
  readonly inletTempC: number;
  readonly outletTempC: number;
  readonly waterSpecificHeat: number;
  readonly waterDensityKgL: number;
}

export const LEGACY_BASIC_DEFAULT_INPUT: LegacyBasicCalculatorInput = Object.freeze({
  coilType: "single",
  nagaokaSource: "integral",
  coilLengthMm: 300,
  coilInnerDiameterMm: 1_000,
  turns: 4,
  radialWidthMm: 30,
  conductorHeightMm: 60,
  simpsonN: 400,
  manualKn: 0.52,
  lineVoltageV: 380,
  ratedPowerKw: 100,
  frequencyKHz: 10,
  rectifierFactor: 1.35,
  equivalentResistanceOhm: 0.03,
  targetQ: 40,
  copperResistivityMicroOhmCm: 2,
  workpieceMuR: 1,
  workpieceResistivityMicroOhmCm: 130,
  workpieceLengthMm: 300,
  workpieceDiameterMm: 800,
  coilAcResistanceOhm: 0.006,
  coolingFactor: 1.7,
  inletTempC: 35,
  outletTempC: 55,
  waterSpecificHeat: 4_180,
  waterDensityKgL: 1,
});

export interface LegacySimpsonRow {
  readonly i?: number;
  readonly theta?: number;
  readonly weight?: number;
  readonly fF?: number;
  readonly fE?: number;
  readonly gap?: true;
}

export interface LegacyEllipticResult {
  readonly n: number;
  readonly F: number;
  readonly E: number;
  readonly sampleRows: readonly LegacySimpsonRow[];
}

export interface LegacyNagaokaResult extends LegacyEllipticResult {
  readonly kn: number;
  readonly k: number;
}

export interface LegacyNagaokaInductanceResult extends LegacyNagaokaResult {
  readonly ideal: number;
  readonly inductance: number;
}

export interface LegacyNagaokaLookupResult {
  readonly kn: number;
  readonly status: "invalid" | "out-low" | "out-high" | "exact" | "interpolated";
  readonly interval: string;
  readonly low?: readonly [number, number];
  readonly high?: readonly [number, number];
}

export interface LegacyCalculationIssue {
  readonly type: "warn" | "error";
  readonly text: string;
}

export interface LegacyBasicInvalidResult {
  readonly input: LegacyBasicCalculatorInput;
  readonly valid: false;
  readonly error: string;
  readonly issues: readonly LegacyCalculationIssue[];
}

export interface LegacyBasicValidResult {
  readonly input: LegacyBasicCalculatorInput;
  readonly valid: true;
  readonly issues: readonly LegacyCalculationIssue[];
  readonly status: "ok" | "warn";
  readonly geometry: Readonly<{
    outerDiameterMm: number;
    meanDiameterMm: number;
    radiusMm: number;
    aspectLD: number;
    aspectDL: number;
    fillFactor: number;
  }>;
  readonly inductance: Readonly<{
    ideal: number;
    nagaokaIntegral: LegacyNagaokaInductanceResult;
    table: LegacyNagaokaLookupResult;
    tableInductance: number;
    selectedKn: number;
    knSourceLabel: string;
    knSourceActual: LegacyNagaokaSource;
    nagaokaSelectedInductance: number;
    wheelerSingle: number;
    wheelerMulti: number;
    method: string;
    selected: number;
    reason: string;
    routeLabel: string;
  }>;
  readonly material: Readonly<{
    copperSkinDepthMm: number;
    workpieceSkinDepthMm: number;
  }>;
  readonly electrical: Readonly<{
    currentA: number;
    equivalentResistanceOhm: number;
    equivalentInductanceMicroH: number;
    coilVoltageV: number;
    activeVoltageV: number;
    transformerRatio: number;
  }>;
  readonly cooling: Readonly<{
    coilLossKw: number;
    temperatureRiseC: number;
    waterFlowLMin: number;
  }>;
}

export type LegacyBasicCalculatorResult = LegacyBasicInvalidResult | LegacyBasicValidResult;

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function nonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function legacyEvenSegmentCount(value: number): number {
  const rounded = Math.round(Number.isFinite(value) ? value : 400);
  const bounded = Math.max(20, Math.min(2_000, rounded));
  return bounded % 2 === 0 ? bounded : bounded + 1;
}

export function legacyIdealInductanceMicroH(
  radiusMm: number,
  lengthMm: number,
  turns: number,
): number {
  if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns)) return Number.NaN;
  const radiusM = radiusMm / 1_000;
  const lengthM = lengthMm / 1_000;
  return LEGACY_BASIC_MU0 * turns * turns * Math.PI * radiusM * radiusM / lengthM * 1e6;
}

export function legacyWheelerSingleMicroH(
  radiusMm: number,
  lengthMm: number,
  turns: number,
): number {
  if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns)) return Number.NaN;
  return INCH_PER_MM * radiusMm * radiusMm * turns * turns /
    (9 * radiusMm + 10 * lengthMm);
}

export function legacyWheelerMultiMicroH(
  radiusMm: number,
  lengthMm: number,
  thicknessMm: number,
  turns: number,
): number {
  if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns) || !nonNegative(thicknessMm)) {
    return Number.NaN;
  }
  return 0.8 * INCH_PER_MM * radiusMm * radiusMm * turns * turns /
    (6 * radiusMm + 9 * lengthMm + 10 * thicknessMm);
}

export function legacyEllipticBySimpson(k: number, n: number): LegacyEllipticResult {
  const segments = legacyEvenSegmentCount(n);
  if (!Number.isFinite(k) || k < 0 || k >= 1) {
    return { n: segments, F: Number.NaN, E: Number.NaN, sampleRows: [] };
  }
  const step = (Math.PI / 2) / segments;
  let sumF = 0;
  let sumE = 0;
  const sampleRows: LegacySimpsonRow[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const theta = i * step;
    const weight = i === 0 || i === segments ? 1 : (i % 2 === 1 ? 4 : 2);
    const underRoot = 1 - k * k * Math.sin(theta) ** 2;
    const fF = 1 / Math.sqrt(underRoot);
    const fE = Math.sqrt(underRoot);
    sumF += weight * fF;
    sumE += weight * fE;
    if (i < 8 || i === segments) sampleRows.push({ i, theta, weight, fF, fE });
    else if (i === 8) sampleRows.push({ gap: true });
  }
  return {
    n: segments,
    F: (step / 3) * sumF,
    E: (step / 3) * sumE,
    sampleRows,
  };
}

export function legacyNagaokaCoefficient(
  radiusMm: number,
  lengthMm: number,
  n = 400,
): LegacyNagaokaResult {
  if (!positive(radiusMm) || !positive(lengthMm)) {
    return {
      kn: Number.NaN,
      k: Number.NaN,
      F: Number.NaN,
      E: Number.NaN,
      n: legacyEvenSegmentCount(n),
      sampleRows: [],
    };
  }
  const a = radiusMm;
  const b = lengthMm;
  const rootTerm = Math.sqrt(4 * a * a + b * b);
  const k = 2 * a / rootTerm;
  const integral = legacyEllipticBySimpson(k, n);
  const kn = (
    (b * rootTerm / (a * a)) * (integral.F - integral.E) +
    (4 * rootTerm / b) * integral.E -
    8 * a / b
  ) / (3 * Math.PI);
  return { kn, k, F: integral.F, E: integral.E, n: integral.n, sampleRows: integral.sampleRows };
}

export function legacyNagaokaMicroH(
  radiusMm: number,
  lengthMm: number,
  turns: number,
  n = 400,
): LegacyNagaokaInductanceResult {
  const coefficient = legacyNagaokaCoefficient(radiusMm, lengthMm, n);
  const ideal = legacyIdealInductanceMicroH(radiusMm, lengthMm, turns);
  return { ...coefficient, ideal, inductance: ideal * coefficient.kn };
}

export function legacyTableLookupKn(ratio: number): LegacyNagaokaLookupResult {
  if (!Number.isFinite(ratio)) {
    return { kn: Number.NaN, status: "invalid", interval: "请输入有效数字" };
  }
  const first = LEGACY_NAGAOKA_TABLE[0];
  const last = LEGACY_NAGAOKA_TABLE[LEGACY_NAGAOKA_TABLE.length - 1]!;
  if (ratio < first[0]) return { kn: Number.NaN, status: "out-low", interval: `小于表格下限 ${first[0]}` };
  if (ratio > last[0]) return { kn: Number.NaN, status: "out-high", interval: `大于表格上限 ${last[0]}` };
  for (const item of LEGACY_NAGAOKA_TABLE) {
    if (Math.abs(item[0] - ratio) < 1e-12) {
      return { kn: item[1], status: "exact", interval: `命中表值 ${item[0]}`, low: item, high: item };
    }
  }
  for (let i = 0; i < LEGACY_NAGAOKA_TABLE.length - 1; i += 1) {
    const low = LEGACY_NAGAOKA_TABLE[i];
    const high = LEGACY_NAGAOKA_TABLE[i + 1];
    if (low !== undefined && high !== undefined && ratio > low[0] && ratio < high[0]) {
      const fraction = (ratio - low[0]) / (high[0] - low[0]);
      return {
        kn: low[1] + fraction * (high[1] - low[1]),
        status: "interpolated",
        interval: `线性插值区间 ${low[0]} - ${high[0]}`,
        low,
        high,
      };
    }
  }
  return { kn: Number.NaN, status: "invalid", interval: "未找到插值区间" };
}

export function legacySkinDepthMm(
  resistivityMicroOhmCm: number,
  frequencyKHz: number,
  relativePermeability = 1,
): number {
  if (!positive(resistivityMicroOhmCm) || !positive(frequencyKHz) || !positive(relativePermeability)) {
    return Number.NaN;
  }
  const resistivityOhmM = resistivityMicroOhmCm * 1e-8;
  const frequencyHz = frequencyKHz * 1_000;
  return Math.sqrt(2 * resistivityOhmM /
    (2 * Math.PI * frequencyHz * LEGACY_BASIC_MU0 * relativePermeability)) * 1_000;
}

function legacyFormat(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "--";
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute < 0.0001 || absolute >= 1e8)) return value.toExponential(3);
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function calculateLegacyBasicCalculator(
  input: LegacyBasicCalculatorInput,
): LegacyBasicCalculatorResult {
  const normalized: LegacyBasicCalculatorInput = {
    ...input,
    coilType: input.coilType === "multi" ? "multi" : "single",
    nagaokaSource: input.nagaokaSource === "table" || input.nagaokaSource === "manual"
      ? input.nagaokaSource
      : "integral",
    simpsonN: legacyEvenSegmentCount(input.simpsonN),
  };
  const issues: LegacyCalculationIssue[] = [];
  const geometryValid = positive(normalized.coilLengthMm) &&
    positive(normalized.coilInnerDiameterMm) && positive(normalized.turns) &&
    nonNegative(normalized.radialWidthMm);
  if (!geometryValid) {
    return {
      input: normalized,
      valid: false,
      error: "线圈高度、内径和匝数必须大于 0，径向宽度不得为负数。",
      issues: [{ type: "error", text: "请先修正线圈几何输入。" }],
    };
  }

  const outerDiameterMm = normalized.coilInnerDiameterMm + 2 * normalized.radialWidthMm;
  const meanDiameterMm = (normalized.coilInnerDiameterMm + outerDiameterMm) / 2;
  const radiusMm = meanDiameterMm / 2;
  const aspectLD = normalized.coilLengthMm / meanDiameterMm;
  const aspectDL = meanDiameterMm / normalized.coilLengthMm;
  const fillFactor = nonNegative(normalized.conductorHeightMm)
    ? normalized.turns * normalized.conductorHeightMm / normalized.coilLengthMm
    : Number.NaN;

  const ideal = legacyIdealInductanceMicroH(radiusMm, normalized.coilLengthMm, normalized.turns);
  const nagaokaIntegral = legacyNagaokaMicroH(
    radiusMm,
    normalized.coilLengthMm,
    normalized.turns,
    normalized.simpsonN,
  );
  const table = legacyTableLookupKn(aspectDL);
  const tableInductance = Number.isFinite(table.kn) ? ideal * table.kn : Number.NaN;
  let selectedKn = nagaokaIntegral.kn;
  let knSourceLabel = "Simpson 积分";
  let knSourceActual: LegacyNagaokaSource = "integral";
  if (normalized.nagaokaSource === "table") {
    if (Number.isFinite(table.kn)) {
      selectedKn = table.kn;
      knSourceLabel = "查表线性插值";
      knSourceActual = "table";
    } else {
      issues.push({
        type: "warn",
        text: `查表参数 Dm / l = ${legacyFormat(aspectDL, 5)} 超出范围，Nagaoka 结果已回退到 Simpson 积分。`,
      });
    }
  } else if (normalized.nagaokaSource === "manual") {
    if (positive(normalized.manualKn) && normalized.manualKn <= 1) {
      selectedKn = normalized.manualKn;
      knSourceLabel = "手动输入";
      knSourceActual = "manual";
    } else {
      issues.push({ type: "warn", text: "手动 K_N 必须满足 0 < K_N ≤ 1，Nagaoka 结果已回退到 Simpson 积分。" });
    }
  }

  const nagaokaSelectedInductance = ideal * selectedKn;
  const wheelerSingle = legacyWheelerSingleMicroH(radiusMm, normalized.coilLengthMm, normalized.turns);
  const wheelerMulti = legacyWheelerMultiMicroH(
    radiusMm,
    normalized.coilLengthMm,
    normalized.radialWidthMm,
    normalized.turns,
  );
  let method: string;
  let selectedInductance: number;
  let reason: string;
  let routeLabel: string;
  if (aspectLD < 0.4) {
    method = "Nagaoka 公式";
    selectedInductance = nagaokaSelectedInductance;
    routeLabel = "l / Dm < 0.4";
    reason = `l / Dm = ${legacyFormat(aspectLD, 5)}，属于短粗线圈，采用有限长度修正；K_N 来源为${knSourceLabel}。`;
    if (normalized.coilType === "multi") {
      issues.push({ type: "warn", text: "当前为短粗多层线圈。Nagaoka 分支使用平均直径近似，未显式描述径向厚度分布，建议用仿真或实测复核。" });
    }
  } else if (normalized.coilType === "multi") {
    method = "Wheeler 多层公式";
    selectedInductance = wheelerMulti;
    routeLabel = "l / Dm ≥ 0.4 · 多层";
    reason = `l / Dm = ${legacyFormat(aspectLD, 5)}，且选择了多层/厚绕组，采用包含径向厚度的 Wheeler 多层公式。`;
  } else {
    method = "Wheeler 单层公式";
    selectedInductance = wheelerSingle;
    routeLabel = "l / Dm ≥ 0.4 · 单层";
    reason = `l / Dm = ${legacyFormat(aspectLD, 5)}，且为单层螺线管，采用 Wheeler 单层经验公式。`;
  }

  if (normalized.coilType === "multi" && normalized.radialWidthMm === 0) {
    issues.push({ type: "warn", text: "已选择多层/厚绕组，但径向宽度为 0；请核对线圈类型或补充厚度。" });
  }
  if (Number.isFinite(fillFactor) && fillFactor > 1) {
    issues.push({ type: "warn", text: `填充系数 k_f = ${legacyFormat(fillFactor, 4)} > 1，当前匝数与铜管轴向高度在线圈高度内发生几何重叠。` });
  }
  if (positive(normalized.workpieceDiameterMm) && normalized.workpieceDiameterMm >= normalized.coilInnerDiameterMm) {
    issues.push({ type: "warn", text: "炉料直径不小于线圈内径，请核对绝缘层、装配间隙和输入尺寸。" });
  }
  if (positive(normalized.workpieceLengthMm) && normalized.workpieceLengthMm > normalized.coilLengthMm) {
    issues.push({ type: "warn", text: "炉料高度大于线圈高度，请核对加热区覆盖范围。" });
  }

  const copperSkinDepthMm = legacySkinDepthMm(
    normalized.copperResistivityMicroOhmCm,
    normalized.frequencyKHz,
    1,
  );
  const workpieceSkinDepthMm = legacySkinDepthMm(
    normalized.workpieceResistivityMicroOhmCm,
    normalized.frequencyKHz,
    normalized.workpieceMuR,
  );
  if (!positive(normalized.frequencyKHz)) {
    issues.push({ type: "error", text: "工作频率必须大于 0，肌肤深度和频率相关电气量暂不计算。" });
  }
  if (!positive(normalized.copperResistivityMicroOhmCm) ||
      !positive(normalized.workpieceResistivityMicroOhmCm) || !positive(normalized.workpieceMuR)) {
    issues.push({ type: "error", text: "材料电阻率与炉料相对磁导率必须大于 0。" });
  }

  const powerW = nonNegative(normalized.ratedPowerKw) ? normalized.ratedPowerKw * 1_000 : Number.NaN;
  const currentA = Number.isFinite(powerW) && positive(normalized.equivalentResistanceOhm)
    ? Math.sqrt(powerW / normalized.equivalentResistanceOhm)
    : Number.NaN;
  const frequencyHz = positive(normalized.frequencyKHz) ? normalized.frequencyKHz * 1_000 : Number.NaN;
  const equivalentInductanceMicroH = positive(normalized.targetQ) &&
    positive(normalized.equivalentResistanceOhm) && positive(frequencyHz)
    ? normalized.targetQ * normalized.equivalentResistanceOhm / (2 * Math.PI * frequencyHz) * 1e6
    : Number.NaN;
  const coilVoltageV = Number.isFinite(currentA) && Number.isFinite(equivalentInductanceMicroH) && positive(frequencyHz)
    ? currentA * 2 * Math.PI * frequencyHz * equivalentInductanceMicroH * 1e-6
    : Number.NaN;
  const activeVoltageV = Number.isFinite(currentA) && positive(normalized.equivalentResistanceOhm)
    ? currentA * normalized.equivalentResistanceOhm
    : Number.NaN;
  const transformerRatio = positive(normalized.rectifierFactor) && nonNegative(normalized.lineVoltageV) && positive(activeVoltageV)
    ? normalized.rectifierFactor * normalized.lineVoltageV / activeVoltageV
    : Number.NaN;
  if (!nonNegative(normalized.ratedPowerKw) || !positive(normalized.equivalentResistanceOhm) ||
      !positive(normalized.targetQ) || !positive(normalized.rectifierFactor) || !nonNegative(normalized.lineVoltageV)) {
    issues.push({ type: "error", text: "电源与匹配参数无效：功率和线电压不得为负，R_eq、Q 与 k_rect 必须大于 0。" });
  }

  const coilLossKw = Number.isFinite(currentA) && nonNegative(normalized.coilAcResistanceOhm)
    ? currentA * currentA * normalized.coilAcResistanceOhm / 1_000
    : Number.NaN;
  const temperatureRiseC = Number.isFinite(normalized.outletTempC) && Number.isFinite(normalized.inletTempC)
    ? normalized.outletTempC - normalized.inletTempC
    : Number.NaN;
  const waterFlowLMin = Number.isFinite(coilLossKw) && nonNegative(normalized.coolingFactor) &&
    positive(normalized.waterSpecificHeat) && positive(normalized.waterDensityKgL) && positive(temperatureRiseC)
    ? normalized.coolingFactor * coilLossKw * 1_000 /
      (normalized.waterSpecificHeat * temperatureRiseC) * 60 / normalized.waterDensityKgL
    : Number.NaN;
  if (!nonNegative(normalized.coilAcResistanceOhm) || !nonNegative(normalized.coolingFactor) ||
      !positive(normalized.waterSpecificHeat) || !positive(normalized.waterDensityKgL)) {
    issues.push({ type: "error", text: "损耗与冷却参数无效：交流电阻和安全系数不得为负，比热与密度必须大于 0。" });
  }
  if (!positive(temperatureRiseC)) {
    issues.push({ type: "error", text: "出水温度必须高于进水温度，冷却水流量暂不计算。" });
  }

  return {
    input: normalized,
    valid: true,
    issues,
    status: issues.length > 0 ? "warn" : "ok",
    geometry: { outerDiameterMm, meanDiameterMm, radiusMm, aspectLD, aspectDL, fillFactor },
    inductance: {
      ideal,
      nagaokaIntegral,
      table,
      tableInductance,
      selectedKn,
      knSourceLabel,
      knSourceActual,
      nagaokaSelectedInductance,
      wheelerSingle,
      wheelerMulti,
      method,
      selected: selectedInductance,
      reason,
      routeLabel,
    },
    material: { copperSkinDepthMm, workpieceSkinDepthMm },
    electrical: {
      currentA,
      equivalentResistanceOhm: normalized.equivalentResistanceOhm,
      equivalentInductanceMicroH,
      coilVoltageV,
      activeVoltageV,
      transformerRatio,
    },
    cooling: { coilLossKw, temperatureRiseC, waterFlowLMin },
  };
}
