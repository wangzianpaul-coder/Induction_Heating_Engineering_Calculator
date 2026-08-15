import { describe, expect, it } from "vitest";

import {
  D04_BINARY64_MIN_NORMAL,
  D04_COPPER_SKIN_DEPTH_MAPPING,
  D04_NUMERIC_REPRESENTABILITY_POLICY,
  D04_VACUUM_PERMEABILITY_H_PER_M,
  evaluateD04CopperSkinDepth,
  type D04CopperSkinDepthInput,
} from "../../../src/methods/D/d04CopperSkinDepth.js";
import { toCanonicalSI } from "../../../src/units/conversion.js";

const matchingState = Object.freeze({
  materialClass: "copper",
  propertyStateMatch: "same_material_temperature_frequency_state",
  temperatureK: 373.15,
  constitutiveRegime: "linear_isotropic_good_conductor",
  excitation: "sinusoidal_steady_state",
  fieldModel: "locally_planar_reference",
} as const);

function input(
  overrides: Partial<D04CopperSkinDepthInput> = {},
): D04CopperSkinDepthInput {
  return {
    frequencyHz: 20_000,
    resistivityOhmM: 2e-8,
    relativePermeability: 1,
    state: matchingState,
    ...overrides,
  };
}

function valueOf(candidate: D04CopperSkinDepthInput): number {
  const result = evaluateD04CopperSkinDepth(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(result.failure.message);
  }
  return result.value.skinDepthM;
}

describe("D-04 copper electromagnetic skin depth", () => {
  it("maps to the frozen equation, sources, and EM-S method checks", () => {
    expect(D04_COPPER_SKIN_DEPTH_MAPPING).toMatchObject({
      methodId: "D-04",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#D-04:Equation",
      methodCheckIds: ["EM-S-001", "EM-S-002"],
    });
    expect(D04_COPPER_SKIN_DEPTH_MAPPING.sourceRefs).toEqual(
      expect.arrayContaining(["ID-EM-01", "CODATA22"]),
    );
    expect(D04_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(D04_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(D04_COPPER_SKIN_DEPTH_MAPPING.numericRepresentabilityPolicy).toBe(
      D04_NUMERIC_REPRESENTABILITY_POLICY,
    );
  });

  it("implements the controlled canonical-SI equation", () => {
    const candidate = input();
    const expected = Math.sqrt(
      candidate.resistivityOhmM /
        (Math.PI *
          candidate.frequencyHz *
          D04_VACUUM_PERMEABILITY_H_PER_M *
          candidate.relativePermeability),
    );
    const result = evaluateD04CopperSkinDepth(candidate);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.value.skinDepthM).toBeCloseTo(expected, 15);
      expect(result.value).toMatchObject({
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
        isThermalAffectedDepth: false,
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.substitution)).toBe(true);
      expect(result.numericRepresentabilityPolicy).toBe(
        D04_NUMERIC_REPRESENTABILITY_POLICY,
      );
    }
  });

  it("passes the EM-S-002 square-root scaling identities", () => {
    const base = valueOf(input());
    expect(valueOf(input({ frequencyHz: 80_000 }))).toBeCloseTo(
      base / 2,
      15,
    );
    expect(valueOf(input({ resistivityOhmM: 8e-8 }))).toBeCloseTo(
      base * 2,
      15,
    );
    expect(valueOf(input({ relativePermeability: 100 }))).toBeCloseTo(
      base / 10,
      15,
    );
  });

  it("uses the unit layer for an independent resistivity round-trip", () => {
    const fromEngineeringUnit = toCanonicalSI(
      2,
      "microohm_cm",
      "electrical_resistivity",
    );
    expect(fromEngineeringUnit).toBe(2e-8);
    expect(valueOf(input({ resistivityOhmM: fromEngineeringUnit }))).toBeCloseTo(
      valueOf(input({ resistivityOhmM: 2e-8 })),
      15,
    );
  });

  it.each([
    ["zero frequency", { frequencyHz: 0 }],
    ["negative resistivity", { resistivityOhmM: -1 }],
    ["zero permeability", { relativePermeability: 0 }],
    ["NaN frequency", { frequencyHz: Number.NaN }],
    ["infinite resistivity", { resistivityOhmM: Number.POSITIVE_INFINITY }],
    ["infinite permeability", { relativePermeability: Number.POSITIVE_INFINITY }],
  ])("rejects %s without a numeric value", (_name, overrides) => {
    const result = evaluateD04CopperSkinDepth(input(overrides));
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("returns insufficient_data for absent or mismatched state evidence", () => {
    const absent = evaluateD04CopperSkinDepth({
      ...input(),
      state: undefined,
    } as unknown as D04CopperSkinDepthInput);
    expect(absent.status).toBe("insufficient_data");
    expect("value" in absent).toBe(false);

    const mismatched = evaluateD04CopperSkinDepth(
      input({
        state: {
          ...matchingState,
          propertyStateMatch: "unconfirmed_or_mismatched",
        },
      }),
    );
    expect(mismatched.status).toBe("insufficient_data");
    expect("value" in mismatched).toBe(false);
  });

  it("returns not_applicable for non-copper or unsupported EM regimes", () => {
    for (const state of [
      { ...matchingState, materialClass: "other" as const },
      {
        ...matchingState,
        constitutiveRegime: "nonlinear_or_unknown" as const,
      },
      { ...matchingState, excitation: "other_or_unknown" as const },
      { ...matchingState, fieldModel: "other_or_unknown" as const },
    ]) {
      const result = evaluateD04CopperSkinDepth(input({ state }));
      expect(result.status).toBe("not_applicable");
      expect("value" in result).toBe(false);
    }
  });

  it("rejects erased hostile state enums and non-physical temperature", () => {
    for (const state of [
      { ...matchingState, materialClass: "legacy_copper" },
      { ...matchingState, temperatureK: 0 },
      { ...matchingState, extraLegacyField: true },
    ]) {
      const result = evaluateD04CopperSkinDepth(
        input({ state: state as typeof matchingState }),
      );
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed without executing top-level or state accessors and traps", () => {
    const topLevelAccessor = Object.defineProperty(
      { ...input() },
      "relativePermeability",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level accessor");
        },
      },
    );
    const topLevelProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("must contain hostile top-level reflection trap");
      },
    });
    const stateAccessor = Object.defineProperty(
      { ...matchingState },
      "materialClass",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute state accessor");
        },
      },
    );
    const stateProxy = new Proxy(matchingState, {
      getOwnPropertyDescriptor() {
        throw new Error("must contain hostile state reflection trap");
      },
    });

    for (const [name, candidate, expectedStatus] of [
      ["top-level accessor", topLevelAccessor, "invalid_input"],
      ["top-level proxy", topLevelProxy, "invalid_input"],
      [
        "state accessor",
        input({ state: stateAccessor as typeof matchingState }),
        "invalid_input",
      ],
      ["state proxy", input({ state: stateProxy }), "invalid_input"],
    ] as const) {
      expect(() =>
        evaluateD04CopperSkinDepth(
          candidate as unknown as D04CopperSkinDepthInput,
        ),
      ).not.toThrow();
      const result = evaluateD04CopperSkinDepth(
        candidate as unknown as D04CopperSkinDepthInput,
      );
      const diagnostic =
        "failure" in result ? result.failure.code : "unexpected_success";
      expect(result.status, `${name}: ${diagnostic}`).toBe(expectedStatus);
      expect("value" in result).toBe(false);
    }
  });

  it("fails closed when representable positive inputs overflow the equation", () => {
    const result = evaluateD04CopperSkinDepth(
      input({
        frequencyHz: Number.MAX_VALUE,
        relativePermeability: Number.MAX_VALUE,
      }),
    );
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
  });

  it("rejects a positive-subnormal permeability chain before it can publish a normal but corrupted depth", () => {
    const relativePermeability =
      (Number.MIN_VALUE / D04_VACUUM_PERMEABILITY_H_PER_M) * 0.75;
    const result = evaluateD04CopperSkinDepth(
      input({
        frequencyHz: 1,
        resistivityOhmM: relativePermeability,
        relativePermeability,
      }),
    );

    expect(relativePermeability).toBeGreaterThan(0);
    expect(relativePermeability).toBeLessThan(D04_BINARY64_MIN_NORMAL);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "D-04.numeric_resolution_invalid" },
    });
    expect("value" in result).toBe(false);
  });

  it("keeps a known unsupported EM regime ahead of an unused machine-resolution failure", () => {
    const subnormal = Number.MIN_VALUE;
    const result = evaluateD04CopperSkinDepth(
      input({
        frequencyHz: subnormal,
        resistivityOhmM: subnormal,
        relativePermeability: subnormal,
        state: { ...matchingState, materialClass: "other" },
      }),
    );
    expect(result.status).toBe("not_applicable");
    expect("value" in result).toBe(false);
  });
});
