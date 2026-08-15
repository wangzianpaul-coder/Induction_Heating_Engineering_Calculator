import { describe, expect, it } from "vitest";

import * as publicApi from "../../../src/public-api.js";
import {
  J03_BINARY64_MIN_NORMAL,
  J03_CONTRACT_SOURCE_REFS,
  J03_DERIVATION_REFS,
  J03_GRAY_BODY_RADIATION_MAPPING,
  J03_METHOD_CHECK_IDS,
  J03_NUMERIC_REPRESENTABILITY_POLICY,
  J03_SOURCE_REFS,
  J03_STEFAN_BOLTZMANN_W_PER_M2_K4,
  calculateJ03GrayBodyRadiation,
} from "../../../src/methods/J/j03GrayBodyRadiation.js";

const MATERIAL_1 = `material:${"a".repeat(64)}`;
const MATERIAL_2 = `material:${"b".repeat(64)}`;
const GEOMETRY = `geometry:${"c".repeat(64)}`;

function largeInput(): Record<string, unknown> {
  return {
    configuration: "radiation_to_large_surroundings",
    surface1: {
      temperatureK: 500,
      emissivity: 0.8,
      areaM2: 2,
      materialSnapshotId: MATERIAL_1,
      emissivitySourceRef: "MAT-EMISSIVITY-01",
      emissivityStateTemperatureK: 500,
    },
    counterpart: {
      kind: "large_surroundings",
      temperatureK: 300,
    },
    boundaryEvidence: {
      geometrySnapshotId: GEOMETRY,
      snapshotConfiguration: "radiation_to_large_surroundings",
      snapshotSurface1AreaM2: 2,
      snapshotSurface2AreaM2: null,
      temperatureScale: "absolute_kelvin",
      diffuseGraySurfacesConfirmed: true,
      viewFactor: 1,
      noUnmodelledOpeningsOrObstructionsConfirmed: true,
      longConcentricEndEffectsNegligible: null,
      surface1IsInnerSurface: null,
    },
  };
}

function concentricInput(): Record<string, unknown> {
  return {
    configuration: "long_concentric_two_gray_surfaces",
    surface1: {
      temperatureK: 500,
      emissivity: 0.8,
      areaM2: 2,
      materialSnapshotId: MATERIAL_1,
      emissivitySourceRef: "MAT-EMISSIVITY-01",
      emissivityStateTemperatureK: 500,
    },
    counterpart: {
      kind: "concentric_outer_surface",
      temperatureK: 300,
      emissivity: 0.6,
      areaM2: 4,
      materialSnapshotId: MATERIAL_2,
      emissivitySourceRef: "MAT-EMISSIVITY-02",
      emissivityStateTemperatureK: 300,
    },
    boundaryEvidence: {
      geometrySnapshotId: GEOMETRY,
      snapshotConfiguration: "long_concentric_two_gray_surfaces",
      snapshotSurface1AreaM2: 2,
      snapshotSurface2AreaM2: 4,
      temperatureScale: "absolute_kelvin",
      diffuseGraySurfacesConfirmed: true,
      viewFactor: 1,
      noUnmodelledOpeningsOrObstructionsConfirmed: true,
      longConcentricEndEffectsNegligible: true,
      surface1IsInnerSurface: true,
    },
  };
}

function nextUp(value: number): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  let bits = view.getBigUint64(0, false);
  bits += 1n;
  view.setBigUint64(0, bits, false);
  return view.getFloat64(0, false);
}

function expectFailureWithoutPayload(outcome: unknown): void {
  expect(outcome).toMatchObject({
    status: expect.stringMatching(/invalid_input|insufficient_data|not_applicable/u),
  });
  expect(outcome).not.toHaveProperty("value");
  expect(outcome).not.toHaveProperty("evidence");
}

describe("J-03 gray-body radiation", () => {
  it("binds the exact frozen registry and source mapping", () => {
    expect(J03_GRAY_BODY_RADIATION_MAPPING).toMatchObject({
      methodId: "J-03",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      sourceRefs: [
        "ID-RAD-01",
        "GB8175:PDF14-16:eqA2",
        "CODATA22",
      ],
      contractSourceRefs: [
        "ID-RAD-01",
        "Stefan-Boltzmann",
        "GB8175:PDF14-16:AnnexA:eqA.2",
        "DER-THERM",
        "CODATA22",
      ],
      derivationRefs: ["ID-RAD-01", "DER-THERM"],
      validationCaseIds: [],
      methodCheckIds: ["RAD-001"],
      outputQuantityIds: ["Qrad", "network factor"],
      stableWarningIds: [],
    });
    expect(J03_SOURCE_REFS).toEqual(
      J03_GRAY_BODY_RADIATION_MAPPING.sourceRefs,
    );
    expect(J03_CONTRACT_SOURCE_REFS).toEqual(
      J03_GRAY_BODY_RADIATION_MAPPING.contractSourceRefs,
    );
    expect(J03_DERIVATION_REFS).toEqual(["ID-RAD-01", "DER-THERM"]);
    expect(J03_METHOD_CHECK_IDS).toEqual(["RAD-001"]);
    expect(J03_STEFAN_BOLTZMANN_W_PER_M2_K4).toBe(5.670374419e-8);
    expect(J03_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(J03_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      J03_GRAY_BODY_RADIATION_MAPPING.numericRepresentabilityPolicy,
    ).toBe(J03_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("evaluates radiation to large surroundings in canonical SI", () => {
    const outcome = calculateJ03GrayBodyRadiation(largeInput());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    const expected =
      0.8 *
      J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
      2 *
      (500 ** 4 - 300 ** 4);
    expect(outcome.value.heatRateW).toBeCloseTo(expected, 11);
    expect(outcome.value.networkFactor).toBe(0.8);
    expect(outcome.value).toMatchObject({
      heatRateDimensionId: "power",
      heatRateCanonicalUnitId: "W",
      networkFactorDimensionId: "dimensionless",
      networkFactorCanonicalUnitId: "one",
      positiveDirection: "surface_1_to_counterpart",
    });
    expect(outcome.warningIds).toEqual([]);
    expect(outcome.equation).toContain("epsilon_1");
  });

  it("uses the stable fourth-power factorization", () => {
    const outcome = calculateJ03GrayBodyRadiation(largeInput());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.stableFourthPowerDifference).toEqual({
      temperatureDifferenceK: 200,
      temperatureSumK: 800,
      squaredTemperatureSumK2: 340000,
      fourthPowerDifferenceK4: 54_400_000_000,
      identity: "(T1-T2)*(T1+T2)*(T1^2+T2^2)",
    });
  });

  it("returns an exact physical zero at equal absolute temperature", () => {
    const input = largeInput();
    input.counterpart = { kind: "large_surroundings", temperatureK: 500 };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.heatRateW).toBe(0);
    expect(outcome.stableFourthPowerDifference.fourthPowerDifferenceK4).toBe(0);
  });

  it("preserves a one-ULP near-equal temperature difference", () => {
    const temperature1K = nextUp(500);
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      temperatureK: temperature1K,
      emissivityStateTemperatureK: temperature1K,
    };
    input.counterpart = { kind: "large_surroundings", temperatureK: 500 };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.heatRateW).toBeGreaterThan(0);
    expect(outcome.stableFourthPowerDifference.temperatureDifferenceK).toBe(
      temperature1K - 500,
    );
  });

  it("preserves reverse heat-flow sign", () => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      temperatureK: 300,
      emissivityStateTemperatureK: 300,
    };
    input.counterpart = { kind: "large_surroundings", temperatureK: 500 };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.heatRateW).toBeLessThan(0);
  });

  it("scales the large-surroundings result with area and emissivity", () => {
    const base = calculateJ03GrayBodyRadiation(largeInput());
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      emissivity: 0.4,
      areaM2: 8,
    };
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      snapshotSurface1AreaM2: 8,
    };
    const scaled = calculateJ03GrayBodyRadiation(input);
    expect(base.status).toBe("success");
    expect(scaled.status).toBe("success");
    if (base.status !== "success" || scaled.status !== "success") return;
    expect(scaled.value.heatRateW / base.value.heatRateW).toBeCloseTo(2, 14);
  });

  it("evaluates the full long-concentric gray-surface network", () => {
    const outcome = calculateJ03GrayBodyRadiation(concentricInput());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    const denominator = 1 / 0.8 + (2 / 4) * (1 / 0.6 - 1);
    const expected =
      (J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        (500 ** 4 - 300 ** 4)) /
      denominator;
    expect(outcome.value.networkFactor).toBeCloseTo(1 / denominator, 15);
    expect(outcome.value.heatRateW).toBeCloseTo(expected, 11);
    expect(outcome.substitution).toMatchObject({
      areaRatioA1OverA2: 0.5,
      networkResistanceDenominator: denominator,
      surface2Emissivity: 0.6,
      surface2AreaM2: 4,
    });
    expect(outcome.evidence.surface2MaterialSnapshotId).toBe(MATERIAL_2);
  });

  it("keeps the full network at equal area", () => {
    const input = concentricInput();
    input.counterpart = {
      ...(input.counterpart as Record<string, unknown>),
      areaM2: 2,
    };
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      snapshotSurface2AreaM2: 2,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.substitution.areaRatioA1OverA2).toBe(1);
    expect(outcome.substitution.networkResistanceDenominator).toBeCloseTo(
      1 / 0.8 + 1 / 0.6 - 1,
      15,
    );
  });

  it("reaches the blackbody limit", () => {
    const input = concentricInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      emissivity: 1,
    };
    input.counterpart = {
      ...(input.counterpart as Record<string, unknown>),
      emissivity: 1,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.networkFactor).toBe(1);
    expect(outcome.value.heatRateW).toBeCloseTo(
      J03_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        (500 ** 4 - 300 ** 4),
      11,
    );
  });

  it("satisfies temperature-exchange reciprocity on one fixed network", () => {
    const forward = calculateJ03GrayBodyRadiation(concentricInput());
    const reverseInput = concentricInput();
    reverseInput.surface1 = {
      ...(reverseInput.surface1 as Record<string, unknown>),
      temperatureK: 300,
      emissivityStateTemperatureK: 300,
    };
    reverseInput.counterpart = {
      ...(reverseInput.counterpart as Record<string, unknown>),
      temperatureK: 500,
      emissivityStateTemperatureK: 500,
    };
    const reverse = calculateJ03GrayBodyRadiation(reverseInput);
    expect(forward.status).toBe("success");
    expect(reverse.status).toBe("success");
    if (forward.status !== "success" || reverse.status !== "success") return;
    expect(reverse.value.heatRateW).toBe(-forward.value.heatRateW);
  });

  it("rejects an inner area greater than the outer area", () => {
    const input = concentricInput();
    input.counterpart = {
      ...(input.counterpart as Record<string, unknown>),
      areaM2: 1,
    };
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      snapshotSurface2AreaM2: 1,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.concentric_area_order_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["nongray", { diffuseGraySurfacesConfirmed: false }],
    ["view factor below one", { viewFactor: 0.9 }],
    ["zero view factor", { viewFactor: 0 }],
    ["opening", { noUnmodelledOpeningsOrObstructionsConfirmed: false }],
  ])("fails closed for unsupported %s evidence", (_label, override) => {
    const input = largeInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      ...override,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome.status).toBe("not_applicable");
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["finite/end effects", { longConcentricEndEffectsNegligible: false }],
    ["surface 1 is not inner", { surface1IsInnerSurface: false }],
  ])("fails closed for unsupported concentric %s", (_label, override) => {
    const input = concentricInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      ...override,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-03.concentric_geometry_not_confirmed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["end-effect evidence", { longConcentricEndEffectsNegligible: null }],
    ["inner-surface evidence", { surface1IsInnerSurface: null }],
  ])("returns insufficient_data for unconfirmed concentric %s", (_label, override) => {
    const input = concentricInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      ...override,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-03.concentric_geometry_unconfirmed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    [
      "known end-effect violation with unknown inner role",
      {
        longConcentricEndEffectsNegligible: false,
        surface1IsInnerSurface: null,
      },
    ],
    [
      "known inner-role violation with unknown end effects",
      {
        longConcentricEndEffectsNegligible: null,
        surface1IsInnerSurface: false,
      },
    ],
  ])("prioritizes not_applicable for %s", (_label, override) => {
    const input = concentricInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      ...override,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-03.concentric_geometry_not_confirmed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects mixed concentric evidence on the large-surroundings route", () => {
    const input = largeInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      longConcentricEndEffectsNegligible: true,
      surface1IsInnerSurface: true,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.large_surroundings_evidence_mixed" },
    });
  });

  it("rejects a Celsius or uncontrolled temperature scale", () => {
    const input = largeInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      temperatureScale: "degC",
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.boundary_evidence_invalid" },
    });
  });

  it.each([0, -0.1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid emissivity %s",
    (emissivity) => {
      const input = largeInput();
      input.surface1 = {
        ...(input.surface1 as Record<string, unknown>),
        emissivity,
      };
      expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid absolute temperature %s",
    (temperatureK) => {
      const input = largeInput();
      input.surface1 = {
        ...(input.surface1 as Record<string, unknown>),
        temperatureK,
      };
      expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid area %s",
    (areaM2) => {
      const input = largeInput();
      input.surface1 = {
        ...(input.surface1 as Record<string, unknown>),
        areaM2,
      };
      expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
    },
  );

  it.each([
    ["material snapshot", { materialSnapshotId: "material:BAD" }],
    ["numeric source", { emissivitySourceRef: 42 }],
    ["blank source", { emissivitySourceRef: "" }],
  ])("rejects malformed %s provenance", (_label, override) => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      ...override,
    };
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
  });

  it("rejects emissivity from a different temperature state", () => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      emissivityStateTemperatureK: 300,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-03.emissivity_state_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a malformed geometry content hash", () => {
    const input = largeInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      geometrySnapshotId: `geometry:${"A".repeat(64)}`,
    };
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
  });

  it("rejects mismatched configuration/counterpart topology", () => {
    const input = concentricInput();
    input.counterpart = { kind: "large_surroundings", temperatureK: 300 };
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
  });

  it.each([
    ["configuration", { snapshotConfiguration: "long_concentric_two_gray_surfaces" }],
    ["surface-1 area", { snapshotSurface1AreaM2: 2.1 }],
    ["surface-2 area", { snapshotSurface2AreaM2: 4 }],
  ])("rejects a %s mismatch against the geometry snapshot", (_label, override) => {
    const input = largeInput();
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      ...override,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.geometry_snapshot_value_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    [null],
    [[]],
    [{ ...largeInput(), extra: true }],
    [(() => {
      const value = largeInput();
      delete value.surface1;
      return value;
    })()],
  ])("rejects non-exact top-level input %#", (input) => {
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
  });

  it("does not execute a top-level getter", () => {
    let executed = false;
    const input = largeInput();
    Object.defineProperty(input, "surface1", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(() => calculateJ03GrayBodyRadiation(input)).not.toThrow();
    expect(executed).toBe(false);
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(input));
  });

  it("does not execute a nested getter", () => {
    let executed = false;
    const input = largeInput();
    const surface = input.surface1 as Record<string, unknown>;
    Object.defineProperty(surface, "temperatureK", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(() => calculateJ03GrayBodyRadiation(input)).not.toThrow();
    expect(executed).toBe(false);
  });

  it("fails closed on hostile proxy reflection traps", () => {
    const proxy = new Proxy(largeInput(), {
      ownKeys() {
        throw new Error("hostile");
      },
    });
    expect(() => calculateJ03GrayBodyRadiation(proxy)).not.toThrow();
    expectFailureWithoutPayload(calculateJ03GrayBodyRadiation(proxy));
  });

  it("rejects fourth-power overflow", () => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      temperatureK: 1e200,
      emissivityStateTemperatureK: 1e200,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.temperature_power_not_representable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a swallowed positive temperature contribution", () => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      temperatureK: 1e50,
      emissivityStateTemperatureK: 1e50,
    };
    input.counterpart = { kind: "large_surroundings", temperatureK: 1 };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.temperature_positive_term_swallowed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a nonzero heat-rate product that underflows", () => {
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      areaM2: Number.MIN_VALUE,
    };
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      snapshotSurface1AreaM2: Number.MIN_VALUE,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.heat_rate_not_representable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a positive-subnormal radiation coefficient before a huge temperature factor can magnify its rounding error", () => {
    const emissivity =
      (Number.MIN_VALUE / J03_STEFAN_BOLTZMANN_W_PER_M2_K4) * 0.75;
    const input = largeInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      temperatureK: 1e76,
      emissivity,
      emissivityStateTemperatureK: 1e76,
    };
    input.counterpart = {
      kind: "large_surroundings",
      temperatureK: 5e75,
    };

    expect(emissivity).toBeGreaterThan(0);
    expect(emissivity).toBeLessThan(J03_BINARY64_MIN_NORMAL);
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.heat_rate_not_representable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a swallowed positive outer-network resistance", () => {
    const input = concentricInput();
    input.surface1 = {
      ...(input.surface1 as Record<string, unknown>),
      areaM2: 1,
    };
    input.counterpart = {
      ...(input.counterpart as Record<string, unknown>),
      areaM2: Number.MAX_VALUE,
      emissivity: 0.5,
    };
    input.boundaryEvidence = {
      ...(input.boundaryEvidence as Record<string, unknown>),
      snapshotSurface1AreaM2: 1,
      snapshotSurface2AreaM2: Number.MAX_VALUE,
    };
    const outcome = calculateJ03GrayBodyRadiation(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-03.network_factor_not_representable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("deep-freezes the successful result", () => {
    const outcome = calculateJ03GrayBodyRadiation(concentricInput());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.value)).toBe(true);
    expect(Object.isFrozen(outcome.substitution)).toBe(true);
    expect(Object.isFrozen(outcome.evidence)).toBe(true);
    expect(outcome.evidence.numericRepresentabilityPolicy).toBe(
      J03_NUMERIC_REPRESENTABILITY_POLICY,
    );
    expect(Object.isFrozen(outcome.stableFourthPowerDifference)).toBe(true);
    expect(Object.isFrozen(outcome.assumptions)).toBe(true);
  });

  it("binds every failure to the frozen method mapping", () => {
    const outcome = calculateJ03GrayBodyRadiation(null);
    expect(outcome).toMatchObject({
      methodId: "J-03",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved",
      warningIds: [],
      warnings: [],
      mapping: J03_GRAY_BODY_RADIATION_MAPPING,
    });
    expect(outcome.status).not.toBe("success");
    if (outcome.status === "success") return;
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.failure)).toBe(true);
  });

  it("does not expose J-03 through the Foundation public API", () => {
    expect(publicApi).not.toHaveProperty("calculateJ03GrayBodyRadiation");
    expect(publicApi).not.toHaveProperty("J03_GRAY_BODY_RADIATION_MAPPING");
  });
});
