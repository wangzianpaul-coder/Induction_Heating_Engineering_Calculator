import { describe, expect, it } from "vitest";

import {
  UNIT_DEFINITIONS,
  UNIT_IDS,
  UnitConversionError,
  assertUnitRegistryIntegrity,
  convertUnit,
  fromCanonicalSI,
  getUnitsForDimension,
  toCanonicalSI,
} from "../../src/units/index.js";

describe("controlled unit registry", () => {
  it("is complete, frozen, and has valid canonical links", () => {
    expect(() => assertUnitRegistryIntegrity()).not.toThrow();
    expect(Object.isFrozen(UNIT_DEFINITIONS)).toBe(true);
    expect(Object.keys(UNIT_DEFINITIONS)).toHaveLength(UNIT_IDS.length);

    for (const id of UNIT_IDS) {
      expect(Object.isFrozen(UNIT_DEFINITIONS[id])).toBe(true);
      expect(Object.isFrozen(UNIT_DEFINITIONS[id].dimensionIds)).toBe(true);
    }

    expect(getUnitsForDimension("temperature_difference").map((unit) => unit.id)).toEqual([
      "K",
      "delta_degC",
    ]);
  });
});

describe("SI boundary conversions", () => {
  it.each([
    [1, "mm", "m", 1e-3],
    [1, "cm", "m", 1e-2],
    [1, "in", "m", 0.0254],
    [1, "uH", "H", 1e-6],
    [1, "kW", "W", 1e3],
    [60, "L/min", "m3_per_s", 1e-3],
    [1, "ohm_cm", "ohm_m", 1e-2],
    [1, "microohm_cm", "ohm_m", 1e-8],
  ] as const)("converts %s %s to canonical %s", (value, source, canonical, expected) => {
    const valueSi = convertUnit(value, source, canonical);
    expect(valueSi).toBeCloseTo(expected, 14);
    expect(convertUnit(valueSi, canonical, source)).toBeCloseTo(value, 12);
  });

  it("round-trips every linear unit through its canonical unit", () => {
    for (const unit of Object.values(UNIT_DEFINITIONS)) {
      if (unit.conversionKind !== "linear") {
        continue;
      }
      const [dimensionId] = unit.dimensionIds;
      if (dimensionId === undefined) {
        throw new Error(`Unit ${unit.id} has no dimension.`);
      }
      const valueSi = toCanonicalSI(12.3456789, unit.id, dimensionId);
      const restored = fromCanonicalSI(valueSi, unit.id, dimensionId);
      expect(restored).toBeCloseTo(12.3456789, 12);
    }
  });

  it("applies affine absolute-temperature conversion but linear temperature-difference conversion", () => {
    expect(toCanonicalSI(20, "degC", "absolute_temperature")).toBeCloseTo(293.15, 12);
    expect(
      fromCanonicalSI(293.15, "degC", "absolute_temperature"),
    ).toBeCloseTo(20, 12);
    expect(toCanonicalSI(20, "delta_degC", "temperature_difference")).toBe(20);
    expect(fromCanonicalSI(20, "delta_degC", "temperature_difference")).toBe(20);

    expect(convertUnit(293.15, "K", "degC", "absolute_temperature")).toBeCloseTo(20, 12);
    expect(convertUnit(20, "K", "delta_degC", "temperature_difference")).toBe(20);
  });

  it("fails closed for ambiguous or cross-dimension conversions", () => {
    expect(() => toCanonicalSI(293.15, "K")).toThrowError(UnitConversionError);
    expect(() => convertUnit(20, "degC", "delta_degC")).toThrowError(/no shared semantic dimension/u);
    expect(() => convertUnit(1, "kg_per_s", "m3_per_s")).toThrowError(/no shared semantic dimension/u);
    expect(() => toCanonicalSI(1, "ohm_cm", "electrical_resistance")).toThrowError(
      /does not support dimension/u,
    );
  });

  it("rejects non-finite values, overflow, and temperatures below absolute zero", () => {
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => toCanonicalSI(invalid, "m", "length")).toThrowError(/finite/u);
    }
    expect(() => toCanonicalSI(Number.MAX_VALUE, "MW", "power")).toThrowError(/finite/u);
    expect(() => toCanonicalSI(-273.151, "degC", "absolute_temperature")).toThrowError(
      /below 0 K/u,
    );
    expect(toCanonicalSI(-50, "delta_degC", "temperature_difference")).toBe(-50);
  });
});
