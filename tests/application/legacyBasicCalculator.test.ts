import { describe, expect, it } from "vitest";

import {
  LEGACY_BASIC_DEFAULT_INPUT,
  LEGACY_NAGAOKA_TABLE,
  calculateLegacyBasicCalculator,
  legacyEllipticBySimpson,
  legacyEvenSegmentCount,
  legacyTableLookupKn,
  type LegacyBasicCalculatorInput,
  type LegacyBasicValidResult,
} from "../../src/application/legacyBasicCalculator.js";

function calculate(
  overrides: Partial<LegacyBasicCalculatorInput> = {},
): LegacyBasicValidResult {
  const result = calculateLegacyBasicCalculator({
    ...LEGACY_BASIC_DEFAULT_INPUT,
    ...overrides,
  });
  expect(result.valid).toBe(true);
  if (!result.valid) throw new Error(result.error);
  return result;
}

describe("three-file basic calculator compatibility implementation", () => {
  it("reproduces every default result from the supplied standalone page", () => {
    expect(LEGACY_BASIC_DEFAULT_INPUT).toEqual({
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

    const result = calculate();
    expect(result.status).toBe("ok");
    expect(result.issues).toEqual([]);
    expect(result.geometry).toEqual({
      outerDiameterMm: 1_060,
      meanDiameterMm: 1_030,
      radiusMm: 515,
      aspectLD: 0.2912621359223301,
      aspectDL: 3.433333333333333,
      fillFactor: 0.8,
    });
    expect(result.inductance.ideal).toBe(55.84353764861706);
    expect(result.inductance.nagaokaIntegral).toMatchObject({
      kn: 0.39866801850124256,
      k: 0.960104332964071,
      F: 2.6943581474579807,
      E: 1.086371792216054,
      n: 400,
      ideal: 55.84353764861706,
      inductance: 22.263032500473702,
    });
    expect(result.inductance.table).toEqual({
      kn: 0.404,
      status: "interpolated",
      interval: "线性插值区间 3 - 4",
      low: [3, 0.43],
      high: [4, 0.37],
    });
    expect(result.inductance).toMatchObject({
      tableInductance: 22.560789210041293,
      selectedKn: 0.39866801850124256,
      knSourceLabel: "Simpson 积分",
      knSourceActual: "integral",
      nagaokaSelectedInductance: 22.263032500473702,
      wheelerSingle: 21.882235251045486,
      wheelerMulti: 21.94691180843774,
      method: "Nagaoka 公式",
      selected: 22.263032500473702,
      routeLabel: "l / Dm < 0.4",
    });
    expect(result.material).toEqual({
      copperSkinDepthMm: 0.7117625434171772,
      workpieceSkinDepthMm: 5.738413080613819,
    });
    expect(result.electrical).toEqual({
      currentA: 1825.7418583505537,
      equivalentResistanceOhm: 0.03,
      equivalentInductanceMicroH: 19.09859317102744,
      coilVoltageV: 2190.890230020664,
      activeVoltageV: 54.77225575051661,
      transformerRatio: 9.36605573333834,
    });
    expect(result.cooling).toEqual({
      coilLossKw: 20,
      temperatureRiseC: 20,
      waterFlowLMin: 24.401913875598087,
    });
  });

  it.each([
    {
      name: "long single-layer coil",
      input: {
        coilLengthMm: 200,
        coilInnerDiameterMm: 80,
        turns: 20,
        radialWidthMm: 4,
        conductorHeightMm: 5,
        workpieceDiameterMm: 50,
        workpieceLengthMm: 150,
      },
      method: "Wheeler 单层公式",
      route: "l / Dm ≥ 0.4 · 单层",
      aspectLD: 2.380952380952381,
      selected: 11.681887114825534,
    },
    {
      name: "short single-layer coil",
      input: {
        coilLengthMm: 80,
        coilInnerDiameterMm: 260,
        turns: 8,
        radialWidthMm: 6,
        conductorHeightMm: 5,
        workpieceDiameterMm: 200,
        workpieceLengthMm: 60,
      },
      method: "Nagaoka 公式",
      route: "l / Dm < 0.4",
      aspectLD: 0.3007518796992481,
      selected: 22.672390372947973,
    },
    {
      name: "long multilayer coil",
      input: {
        coilType: "multi" as const,
        coilLengthMm: 100,
        coilInnerDiameterMm: 120,
        turns: 60,
        radialWidthMm: 30,
        conductorHeightMm: 1,
        workpieceDiameterMm: 100,
        workpieceLengthMm: 80,
      },
      method: "Wheeler 多层公式",
      route: "l / Dm ≥ 0.4 · 多层",
      aspectLD: 0.6666666666666666,
      selected: 386.54259126700066,
    },
    {
      name: "exact 0.4 boundary",
      input: { coilLengthMm: 412 },
      method: "Wheeler 单层公式",
      route: "l / Dm ≥ 0.4 · 单层",
      aspectLD: 0.4,
      selected: 19.082908754052802,
    },
  ])("preserves the $name branch", ({ input, method, route, aspectLD, selected }) => {
    const result = calculate(input);
    expect(result.status).toBe("ok");
    expect(result.geometry.aspectLD).toBe(aspectLD);
    expect(result.inductance.method).toBe(method);
    expect(result.inductance.routeLabel).toBe(route);
    expect(result.inductance.selected).toBe(selected);
  });

  it("preserves the complete lookup table, interpolation, and no-extrapolation fallback", () => {
    expect(LEGACY_NAGAOKA_TABLE).toEqual([
      [0.1, 0.96], [0.2, 0.92], [0.3, 0.88], [0.4, 0.85],
      [0.6, 0.79], [0.8, 0.74], [1, 0.69], [1.5, 0.6],
      [2, 0.52], [3, 0.43], [4, 0.37], [5, 0.32],
      [10, 0.2], [20, 0.12],
    ]);
    expect(legacyTableLookupKn(1.5)).toEqual({
      kn: 0.6,
      status: "exact",
      interval: "命中表值 1.5",
      low: [1.5, 0.6],
      high: [1.5, 0.6],
    });
    expect(legacyTableLookupKn(0.36)).toEqual({
      kn: 0.862,
      status: "interpolated",
      interval: "线性插值区间 0.3 - 0.4",
      low: [0.3, 0.88],
      high: [0.4, 0.85],
    });
    expect(legacyTableLookupKn(0.099)).toMatchObject({
      status: "out-low",
      interval: "小于表格下限 0.1",
    });
    expect(legacyTableLookupKn(20.001)).toMatchObject({
      status: "out-high",
      interval: "大于表格上限 20",
    });

    const interpolated = calculate({
      nagaokaSource: "table",
      coilLengthMm: 1_000,
      coilInnerDiameterMm: 350,
      radialWidthMm: 10,
      conductorHeightMm: 20,
      workpieceDiameterMm: 200,
      workpieceLengthMm: 500,
    });
    expect(interpolated.issues).toEqual([]);
    expect(interpolated.inductance).toMatchObject({
      selectedKn: 0.862,
      knSourceLabel: "查表线性插值",
      knSourceActual: "table",
      nagaokaSelectedInductance: 1.7641357273417242,
      method: "Wheeler 单层公式",
      selected: 1.756406955154702,
    });

    const outOfRange = calculate({
      nagaokaSource: "table",
      coilLengthMm: 10,
      coilInnerDiameterMm: 210,
      radialWidthMm: 0,
      conductorHeightMm: 0,
      workpieceDiameterMm: 0,
      workpieceLengthMm: 0,
    });
    expect(outOfRange.inductance.table.status).toBe("out-high");
    expect(Number.isNaN(outOfRange.inductance.table.kn)).toBe(true);
    expect(outOfRange.inductance.knSourceActual).toBe("integral");
    expect(outOfRange.issues).toEqual([{
      type: "warn",
      text: "查表参数 Dm / l = 21 超出范围，Nagaoka 结果已回退到 Simpson 积分。",
    }]);
  });

  it("uses a valid manual coefficient and falls back to Simpson for an invalid one", () => {
    const manual = calculate({ nagaokaSource: "manual", manualKn: 0.52 });
    expect(manual.inductance).toMatchObject({
      selectedKn: 0.52,
      knSourceLabel: "手动输入",
      knSourceActual: "manual",
      nagaokaSelectedInductance: 29.038639577280872,
      selected: 29.038639577280872,
    });
    expect(manual.issues).toEqual([]);

    const fallback = calculate({ nagaokaSource: "manual", manualKn: 1.1 });
    expect(fallback.inductance.selectedKn).toBe(0.39866801850124256);
    expect(fallback.inductance.knSourceActual).toBe("integral");
    expect(fallback.inductance.selected).toBe(22.263032500473702);
    expect(fallback.issues).toEqual([{
      type: "warn",
      text: "手动 K_N 必须满足 0 < K_N ≤ 1，Nagaoka 结果已回退到 Simpson 积分。",
    }]);
  });

  it("normalizes Simpson segment counts exactly like the standalone page", () => {
    expect([
      legacyEvenSegmentCount(-5),
      legacyEvenSegmentCount(20),
      legacyEvenSegmentCount(21),
      legacyEvenSegmentCount(22),
      legacyEvenSegmentCount(1_999),
      legacyEvenSegmentCount(2_000),
      legacyEvenSegmentCount(3_000),
      legacyEvenSegmentCount(Number.NaN),
    ]).toEqual([20, 20, 22, 22, 2_000, 2_000, 2_000, 400]);

    const integral = legacyEllipticBySimpson(0.5, 21);
    expect(integral.n).toBe(22);
    expect(integral.F).toBe(1.685750354812596);
    expect(integral.E).toBe(1.467462209339427);
    expect(integral.sampleRows).toHaveLength(10);
    expect(integral.sampleRows[8]).toEqual({ gap: true });
    expect(integral.sampleRows[9]).toMatchObject({
      i: 22,
      theta: 1.5707963267948966,
      weight: 1,
      fF: 1.1547005383792517,
      fE: 0.8660254037844386,
    });
  });

  it("emits every compatible warning and error in the original order", () => {
    const result = calculate({
      coilType: "multi",
      radialWidthMm: 0,
      conductorHeightMm: 100,
      nagaokaSource: "manual",
      manualKn: 0,
      frequencyKHz: 0,
      copperResistivityMicroOhmCm: 0,
      workpieceResistivityMicroOhmCm: 0,
      workpieceMuR: 0,
      ratedPowerKw: -1,
      equivalentResistanceOhm: 0,
      targetQ: 0,
      rectifierFactor: 0,
      lineVoltageV: -1,
      coilAcResistanceOhm: -1,
      coolingFactor: -1,
      waterSpecificHeat: 0,
      waterDensityKgL: 0,
      inletTempC: 55,
      outletTempC: 35,
      workpieceDiameterMm: 1_000,
      workpieceLengthMm: 301,
    });

    expect(result.status).toBe("warn");
    expect(result.issues).toEqual([
      { type: "warn", text: "手动 K_N 必须满足 0 < K_N ≤ 1，Nagaoka 结果已回退到 Simpson 积分。" },
      { type: "warn", text: "当前为短粗多层线圈。Nagaoka 分支使用平均直径近似，未显式描述径向厚度分布，建议用仿真或实测复核。" },
      { type: "warn", text: "已选择多层/厚绕组，但径向宽度为 0；请核对线圈类型或补充厚度。" },
      { type: "warn", text: "填充系数 k_f = 1.3333 > 1，当前匝数与铜管轴向高度在线圈高度内发生几何重叠。" },
      { type: "warn", text: "炉料直径不小于线圈内径，请核对绝缘层、装配间隙和输入尺寸。" },
      { type: "warn", text: "炉料高度大于线圈高度，请核对加热区覆盖范围。" },
      { type: "error", text: "工作频率必须大于 0，肌肤深度和频率相关电气量暂不计算。" },
      { type: "error", text: "材料电阻率与炉料相对磁导率必须大于 0。" },
      { type: "error", text: "电源与匹配参数无效：功率和线电压不得为负，R_eq、Q 与 k_rect 必须大于 0。" },
      { type: "error", text: "损耗与冷却参数无效：交流电阻和安全系数不得为负，比热与密度必须大于 0。" },
      { type: "error", text: "出水温度必须高于进水温度，冷却水流量暂不计算。" },
    ]);
  });

  it("returns the standalone geometry failure without mutating the caller input", () => {
    const input = Object.freeze({
      ...LEGACY_BASIC_DEFAULT_INPUT,
      coilLengthMm: 0,
      simpsonN: 21,
    });
    const before = { ...input };
    const result = calculateLegacyBasicCalculator(input);

    expect(input).toEqual(before);
    expect(input.simpsonN).toBe(21);
    expect(result.input).not.toBe(input);
    expect(result.input.simpsonN).toBe(22);
    expect(result).toEqual({
      input: { ...before, simpsonN: 22 },
      valid: false,
      error: "线圈高度、内径和匝数必须大于 0，径向宽度不得为负数。",
      issues: [{ type: "error", text: "请先修正线圈几何输入。" }],
    });
  });

  it("does not mutate a valid mutable caller input while normalizing the result copy", () => {
    const input: LegacyBasicCalculatorInput = {
      ...LEGACY_BASIC_DEFAULT_INPUT,
      simpsonN: 21,
    };
    const before = structuredClone(input);
    const result = calculateLegacyBasicCalculator(input);

    expect(input).toEqual(before);
    expect(input.simpsonN).toBe(21);
    expect(result.input).not.toBe(input);
    expect(result.input.simpsonN).toBe(22);
  });
});
