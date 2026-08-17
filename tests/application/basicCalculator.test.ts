import { describe, expect, it, vi } from "vitest";

import {
  BASIC_CALCULATOR_POLICY,
  BASIC_CALCULATOR_SCHEMA_VERSION,
  calculateBasicCalculator,
  type BasicCalculatorInput,
  type BasicCalculatorOutput,
  type BasicCalculatorResult,
} from "../../src/application/basicCalculator.js";

const INPUT = Object.freeze({
  schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
  coil: {
    electricalTurnCount: 12,
    conductorAxialSizeMm: 6,
    windingLengthMm: 120,
    currentPathDiameterMm: 160,
    windingConstruction: "uniform_identical_single_layer",
    fullPhysicalWindingLengthConfirmed: true,
    nonOverlappingTurnsConfirmed: true,
    magneticMedium: "air",
    relativePermeability: null,
  },
  seriesElectrical: {
    resistanceOhm: 0.2,
    inductanceMicrohenry: 50,
    currentA: 100,
    frequencyKhz: 10,
    portName: "coil-terminal-port",
    referencePlaneName: "coil-terminals",
    loadedState: "workpiece_hot",
    equivalentStateName: "hot-series-equivalent",
    currentBasis: "rms",
    coilSeriesPortConfirmed: true,
    linearSinusoidalStateConfirmed: true,
  },
} as const satisfies BasicCalculatorInput);

function section(
  result: BasicCalculatorResult,
  key: BasicCalculatorResult["sections"][number]["section"],
) {
  const candidate = result.sections.find((item) => item.section === key);
  expect(candidate).toBeDefined();
  if (candidate === undefined) throw new Error(`Missing basic section ${key}.`);
  return candidate;
}

function output(
  result: BasicCalculatorResult,
  key: BasicCalculatorOutput["key"],
): BasicCalculatorOutput {
  const candidate = result.sections.flatMap((item) => item.outputs)
    .find((item) => item.key === key);
  expect(candidate).toBeDefined();
  if (candidate === undefined) throw new Error(`Missing basic output ${key}.`);
  return candidate;
}

function scalar(result: BasicCalculatorResult, key: BasicCalculatorOutput["key"]): number {
  const candidate = output(result, key);
  expect(candidate.status).toBe("available");
  expect(typeof candidate.value).toBe("number");
  if (typeof candidate.value !== "number") {
    throw new Error(`Expected scalar basic output ${key}.`);
  }
  return candidate.value;
}

describe("safe guided basic calculator application service", () => {
  it("calculates the approved fill-factor, analytical-limit, and series-port routes", () => {
    const result = calculateBasicCalculator(INPUT);
    expect(result).toMatchObject({
      schemaVersion: "0.9.0",
      status: "complete",
      error: null,
    });
    expect(result.sections.map((item) => [item.section, item.status])).toEqual([
      ["coil_fill_factor", "success"],
      ["ideal_long_solenoid_limit", "success_with_warnings"],
      ["series_port_electrical", "success"],
    ]);

    expect(scalar(result, "axialFillFactor")).toBeCloseTo(0.6, 15);
    const expectedIdealMicrohenry =
      (1.25663706127e-6 * 12 ** 2 * Math.PI * 0.08 ** 2 / 0.12) * 1e6;
    expect(scalar(result, "idealInductanceLimit"))
      .toBeCloseTo(expectedIdealMicrohenry, 12);
    expect(output(result, "idealInductanceLimit")).toMatchObject({
      unit: "µH",
      note: { zh: expect.stringContaining("解析极限") },
    });

    const expectedReactance = 2 * Math.PI * 10_000 * 50e-6;
    expect(scalar(result, "inductiveReactance"))
      .toBeCloseTo(expectedReactance, 14);
    expect(scalar(result, "impedanceMagnitude"))
      .toBeCloseTo(Math.hypot(0.2, expectedReactance), 14);
    expect(scalar(result, "seriesQualityFactor"))
      .toBeCloseTo(expectedReactance / 0.2, 14);
    expect(scalar(result, "terminalVoltage"))
      .toBeCloseTo(100 * Math.hypot(0.2, expectedReactance), 12);
    expect(output(result, "seriesImpedance")).toMatchObject({
      value: { real: 0.2, imaginary: expectedReactance },
      unit: "Ω",
    });

    expect(section(result, "ideal_long_solenoid_limit").warnings[0]?.zh)
      .toContain("不能作为");
    expect(section(result, "series_port_electrical").limitations[0]?.zh)
      .toContain("不从线圈几何反推");
    expect(result.sections.every((item) => item.sourceTitles.length > 0)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sections)).toBe(true);
  });

  it("keeps public success data free of internal tracking identifiers", () => {
    const serialized = JSON.stringify(calculateBasicCalculator(INPUT));
    for (const forbidden of [
      "methodId",
      "sourceRef",
      "formalRuntimeActivationClaim",
      "ADR-",
      "DER-",
      "ID-GEO",
      "B-02",
      "B-03",
      "D-07",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(serialized).toContain("线圈轴向填充系数");
    expect(serialized).toContain("理想长螺线管电感极限");
    expect(serialized).toContain("线圈串联端口电气量");
  });

  it("does not supply historical coefficients, calibration targets, or numeric defaults", () => {
    expect(BASIC_CALCULATOR_POLICY).toEqual({
      schemaVersion: "0.9.0",
      suppliesEngineeringDefaults: false,
      importsHistoricalSpreadsheetCoefficients: false,
      calibratesAgainstHistoricalSoftwareValues: false,
      automaticallyUsesIdealLimitAsSeriesInductance: false,
      partialResultIsolation: true,
    });

    const empty = calculateBasicCalculator({
      schemaVersion: BASIC_CALCULATOR_SCHEMA_VERSION,
      coil: null,
      seriesElectrical: null,
    });
    expect(empty.status).toBe("empty");
    expect(empty.sections.every((item) =>
      item.status === "not_requested" && item.outputs.length === 0)).toBe(true);
    expect(empty.sections.flatMap((item) => item.outputs)).toEqual([]);
    expect(empty.notices.map((item) => item.zh).join(" ")).toContain("不提供隐含工程默认值");
    expect(empty.notices.map((item) => item.zh).join(" ")).toContain("不会自动传入");
  });

  it("isolates partial and unavailable results without substituting a fallback", () => {
    const result = calculateBasicCalculator({
      ...INPUT,
      coil: {
        ...INPUT.coil,
        windingConstruction: "other_or_unknown",
      },
      seriesElectrical: {
        ...INPUT.seriesElectrical,
        resistanceOhm: 0,
      },
    });
    expect(result.status).toBe("partial");
    expect(section(result, "coil_fill_factor")).toMatchObject({
      status: "not_applicable",
      outputs: [],
      error: { code: "B-02.geometry_not_uniform_single_layer" },
    });
    expect(section(result, "ideal_long_solenoid_limit").status)
      .toBe("success_with_warnings");
    expect(section(result, "series_port_electrical").status)
      .toBe("success_with_warnings");
    expect(output(result, "seriesQualityFactor")).toMatchObject({
      status: "unavailable",
      value: null,
      unit: null,
      note: { zh: expect.stringContaining("没有有限数值") },
    });
    expect(section(result, "series_port_electrical").warnings[0]?.zh)
      .toContain("不会显示一个有限");
  });

  it("preserves fail-closed invalid and applicability outcomes independently", () => {
    const result = calculateBasicCalculator({
      ...INPUT,
      coil: {
        ...INPUT.coil,
        conductorAxialSizeMm: -1,
        relativePermeability: 1,
      },
      seriesElectrical: {
        ...INPUT.seriesElectrical,
        coilSeriesPortConfirmed: false,
      },
    });
    expect(result.status).toBe("failed");
    expect(section(result, "coil_fill_factor")).toMatchObject({
      status: "invalid_input",
      outputs: [],
      error: { code: "B-02.numeric_input_invalid" },
    });
    expect(section(result, "ideal_long_solenoid_limit")).toMatchObject({
      status: "invalid_input",
      outputs: [],
      error: { code: "MVP-B-03.air_medium_permeability_conflict" },
    });
    expect(section(result, "series_port_electrical")).toMatchObject({
      status: "not_applicable",
      outputs: [],
      error: { code: "D-07.port_interpretation_not_applicable" },
    });
    expect(result.sections.every((item) => item.error !== null)).toBe(true);
  });

  it("rejects extra fields and hostile accessors without executing them", () => {
    const getter = vi.fn(() => INPUT.coil?.windingLengthMm);
    const hostileCoil = { ...INPUT.coil } as Record<string, unknown>;
    Object.defineProperty(hostileCoil, "windingLengthMm", {
      enumerable: true,
      configurable: true,
      get: getter,
    });
    const hostile = calculateBasicCalculator({
      ...INPUT,
      coil: hostileCoil,
    });
    expect(getter).not.toHaveBeenCalled();
    expect(hostile.status).toBe("partial");
    expect(section(hostile, "coil_fill_factor")).toMatchObject({
      status: "invalid_input",
      error: { code: "BASIC.coil_input_schema_invalid" },
    });
    expect(section(hostile, "ideal_long_solenoid_limit")).toMatchObject({
      status: "invalid_input",
      error: { code: "BASIC.coil_input_schema_invalid" },
    });
    expect(section(hostile, "series_port_electrical").status).toBe("success");

    const topLevelExtra = calculateBasicCalculator({
      ...INPUT,
      hiddenDefault: 1,
    });
    expect(topLevelExtra).toMatchObject({
      status: "invalid_input",
      sections: [],
      error: { code: "BASIC.input_schema_invalid" },
    });
  });
});
