import { describe, expect, it } from "vitest";

import * as publicApi from "../../../src/public-api.js";
import {
  J04_BINARY64_MIN_NORMAL,
  J04_CONTRACT_SOURCE_REFS,
  J04_DEPENDENCY_METHOD_VERSIONS,
  J04_DERIVATION_REFS,
  J04_DIRECT_RADIATION_RELATIVE_TOLERANCE,
  J04_GB8175_CONTROLLED_SOURCE,
  J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING,
  J04_METHOD_CHECK_IDS,
  J04_NUMERIC_REPRESENTABILITY_POLICY,
  J04_SOURCE_REFS,
  J04_STEFAN_BOLTZMANN_W_PER_M2_K4,
  J04_VALIDATION_CASE_IDS,
  J04_WARNING_PREDICATES,
  calculateJ04LinearizedSurfaceCoefficient,
} from "../../../src/methods/J/j04LinearizedSurfaceCoefficient.js";
import { J03_STEFAN_BOLTZMANN_W_PER_M2_K4 } from "../../../src/methods/J/j03GrayBodyRadiation.js";

const CASE = `case:${"a".repeat(64)}`;
const GEOMETRY = `geometry:${"b".repeat(64)}`;
const MATERIAL = `material:${"c".repeat(64)}`;

interface FixtureState {
  readonly surfaceTemperatureK?: number;
  readonly surroundingsTemperatureK?: number;
  readonly emissivity?: number;
  readonly areaM2?: number;
  readonly convectionCoefficientWPerM2K?: number;
}

function fourthPowerDifference(
  surfaceTemperatureK: number,
  surroundingsTemperatureK: number,
): number {
  return (
    (surfaceTemperatureK - surroundingsTemperatureK) *
    (surfaceTemperatureK + surroundingsTemperatureK) *
    (surfaceTemperatureK ** 2 + surroundingsTemperatureK ** 2)
  );
}

function inputFixture(state: FixtureState = {}): Record<string, unknown> {
  const surfaceTemperatureK = state.surfaceTemperatureK ?? 500;
  const surroundingsTemperatureK = state.surroundingsTemperatureK ?? 300;
  const emissivity = state.emissivity ?? 0.8;
  const areaM2 = state.areaM2 ?? 2;
  const convectionCoefficientWPerM2K =
    state.convectionCoefficientWPerM2K ?? 12;
  const temperatureDifferenceK =
    surfaceTemperatureK - surroundingsTemperatureK;
  const convectionHeatRateW =
    areaM2 * convectionCoefficientWPerM2K * temperatureDifferenceK;
  const radiationHeatRateW =
    J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
    areaM2 *
    emissivity *
    fourthPowerDifference(surfaceTemperatureK, surroundingsTemperatureK);
  return {
    surface: {
      emissivity,
      surfaceTemperatureK,
      surroundingsTemperatureK,
      areaM2,
      materialSnapshotId: MATERIAL,
      emissivitySourceRef: "MAT-EMISSIVITY-01",
      emissivityStateTemperatureK: surfaceTemperatureK,
    },
    boundaryEvidence: {
      caseSnapshotId: CASE,
      geometrySnapshotId: GEOMETRY,
      controlVolumeId: "thermal.control_volume.sidewall",
      boundaryId: "thermal.boundary.outer_surface",
      surfaceId: "surface.insulation_outer",
      surfaceStateId: "state.outer_surface.current",
      snapshotAreaM2: areaM2,
      snapshotSurfaceTemperatureK: surfaceTemperatureK,
      snapshotSurroundingsTemperatureK: surroundingsTemperatureK,
      temperatureScale: "absolute_kelvin",
      sameAreaAndBoundaryConfirmed: true,
    },
    convectionEvidence: {
      methodId: "J-02",
      methodVersion: "1.0.0-gate0",
      status: "success",
      applicabilityStatus: "in_domain",
      caseSnapshotId: CASE,
      geometrySnapshotId: GEOMETRY,
      controlVolumeId: "thermal.control_volume.sidewall",
      boundaryId: "thermal.boundary.outer_surface",
      surfaceId: "surface.insulation_outer",
      surfaceStateId: "state.outer_surface.current",
      areaM2,
      surfaceTemperatureK,
      referenceTemperatureK: surroundingsTemperatureK,
      heatTransferCoefficientWPerM2K: convectionCoefficientWPerM2K,
      heatRateW: convectionHeatRateW,
      coefficientSourceRef: "J-02:result:hc",
    },
    radiationEvidence: {
      methodId: "J-03",
      methodVersion: "1.0.0-gate0",
      status: "success",
      applicabilityStatus: "in_domain",
      configuration: "radiation_to_large_surroundings",
      caseSnapshotId: CASE,
      geometrySnapshotId: GEOMETRY,
      controlVolumeId: "thermal.control_volume.sidewall",
      boundaryId: "thermal.boundary.outer_surface",
      surfaceId: "surface.insulation_outer",
      surfaceStateId: "state.outer_surface.current",
      areaM2,
      surfaceTemperatureK,
      surroundingsTemperatureK,
      emissivity,
      materialSnapshotId: MATERIAL,
      emissivitySourceRef: "MAT-EMISSIVITY-01",
      emissivityStateTemperatureK: surfaceTemperatureK,
      networkFactor: emissivity,
      heatRateW: radiationHeatRateW,
      viewFactor: 1,
      diffuseGraySurfacesConfirmed: true,
      noUnmodelledOpeningsOrObstructionsConfirmed: true,
    },
  };
}

function nested(
  input: Record<string, unknown>,
  key:
    | "surface"
    | "boundaryEvidence"
    | "convectionEvidence"
    | "radiationEvidence",
): Record<string, unknown> {
  return input[key] as Record<string, unknown>;
}

function expectFailureWithoutPayload(outcome: unknown): void {
  expect(outcome).toMatchObject({
    status: expect.stringMatching(
      /invalid_input|insufficient_data|not_applicable/u,
    ),
  });
  expect(outcome).not.toHaveProperty("value");
  expect(outcome).not.toHaveProperty("evidence");
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

describe("J-04 linearized surface coefficient", () => {
  it("binds the exact frozen registry, source, derivation, and validation metadata", () => {
    expect(J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING).toMatchObject({
      methodId: "J-04",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      scientificConfidence: "high",
      recommendationEligibility: null,
      sourceRefs: [
        "ID-RAD-01",
        "GB8175:PDF14-16:eqA2",
        "CODATA22",
      ],
      contractSourceRefs: [
        "GB8175:AnnexA:eqA.2",
        "ID-RAD-01",
        "DER-THERM",
        "CODATA22",
      ],
      derivationRefs: ["ID-RAD-01", "DER-THERM"],
      validationCaseIds: [],
      methodCheckIds: [],
      outputQuantityIds: ["hr", "hs"],
      stableWarningIds: [],
      implementationReadiness: {
        isolationStatus: "implemented_not_runtime_activated",
        runtimeActivation: "blocked",
        openGates: [
          "formal_J02_J03_snapshot_result_trace_adapter",
          "controlled_warning_publication_policy",
          "CODATA22_local_read_only_copy_access_date_and_sha256",
        ],
      },
    });
    expect(J04_SOURCE_REFS).toEqual(
      J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING.sourceRefs,
    );
    expect(J04_CONTRACT_SOURCE_REFS).toEqual([
      "GB8175:AnnexA:eqA.2",
      "ID-RAD-01",
      "DER-THERM",
      "CODATA22",
    ]);
    expect(J04_DERIVATION_REFS).toEqual(["ID-RAD-01", "DER-THERM"]);
    expect(J04_VALIDATION_CASE_IDS).toEqual([]);
    expect(J04_METHOD_CHECK_IDS).toEqual([]);
  });

  it("pins the manifest-matched GB8175 controlled source and Annex A location", () => {
    expect(J04_GB8175_CONTROLLED_SOURCE).toEqual({
      sourceId: "GB8175",
      relativePath: "references/external_sources/GBT+8175-2025.pdf",
      sha256:
        "d49b00ea888f4d73365d28ac3325ad6c2782d1796a760e1fde697135c67737ae",
      location: "PDF14-16:PRINT10-12:AnnexA:eqA.1-A.2",
    });
    expect(
      J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING.controlledSource,
    ).toBe(J04_GB8175_CONTROLLED_SOURCE);
  });

  it("binds the exact frozen warning predicates without inventing warning IDs", () => {
    expect(J04_WARNING_PREDICATES).toEqual({
      equalTemperatureZeroOverZero:
        "0/0 is not protected at equal temperatures",
      differentAreaOrBoundary:
        "coefficients from different areas or boundaries are added",
      staleLinearization:
        "linearized hr is used over a large temperature interval without update",
    });
    expect(
      J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING.stableWarningIds,
    ).toEqual([]);
  });

  it("binds the J-02 and J-03 calculation-model versions", () => {
    expect(J04_DEPENDENCY_METHOD_VERSIONS).toEqual({
      convection: { methodId: "J-02", methodVersion: "1.0.0-gate0" },
      radiation: { methodId: "J-03", methodVersion: "1.0.0-gate0" },
    });
  });

  it("uses the identical J-03 CODATA22 Stefan-Boltzmann constant", () => {
    expect(J04_STEFAN_BOLTZMANN_W_PER_M2_K4).toBe(5.670374419e-8);
    expect(J04_STEFAN_BOLTZMANN_W_PER_M2_K4).toBe(
      J03_STEFAN_BOLTZMANN_W_PER_M2_K4,
    );
    expect(J04_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(J04_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      engineeringThreshold: false,
      sourceEquationRearranged: false,
    });
    expect(
      J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING.numericRepresentabilityPolicy,
    ).toBe(J04_NUMERIC_REPRESENTABILITY_POLICY);
  });

  it("evaluates the stable non-equal-temperature secant in canonical SI", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    const expectedHr =
      0.8 *
      J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
      (500 + 300) *
      (500 ** 2 + 300 ** 2);
    expect(outcome.value.radiationCoefficientWPerM2K).toBeCloseTo(
      expectedHr,
      13,
    );
    expect(outcome.value.surfaceCoefficientWPerM2K).toBeCloseTo(
      12 + expectedHr,
      13,
    );
    expect(outcome.value).toMatchObject({
      radiationCoefficientDimensionId: "heat_transfer_coefficient",
      surfaceCoefficientDimensionId: "heat_transfer_coefficient",
      radiationCoefficientCanonicalUnitId: "W_per_m2_K",
      surfaceCoefficientCanonicalUnitId: "W_per_m2_K",
    });
  });

  it("records the factorized identity and performs no quotient division", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.stableLinearization).toEqual({
      route: "factorized_secant",
      temperatureDifferenceK: 200,
      temperatureSumK: 800,
      squaredTemperatureSumK2: 340000,
      cubicQuotientFactorK3: 272000000,
      identity:
        "(T_s^4-T_sur^4)/(T_s-T_sur)=(T_s+T_sur)*(T_s^2+T_sur^2)",
      zeroOverZeroDivisionPerformed: false,
    });
  });

  it("uses the exact derivative limit at equal temperature without 0/0", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({
        surfaceTemperatureK: 500,
        surroundingsTemperatureK: 500,
      }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    const expected =
      4 * 0.8 * J04_STEFAN_BOLTZMANN_W_PER_M2_K4 * 500 ** 3;
    expect(outcome.value.radiationCoefficientWPerM2K).toBeCloseTo(
      expected,
      13,
    );
    expect(outcome.stableLinearization).toMatchObject({
      route: "equal_temperature_derivative_limit",
      temperatureDifferenceK: 0,
      cubicQuotientFactorK3: 4 * 500 ** 3,
      identity: "lim[T_sur->T_s]=(d/dT)T^4=4*T^3",
      zeroOverZeroDivisionPerformed: false,
    });
    expect(outcome.identityChecks).toMatchObject({
      directRadiationHeatRateW: 0,
      linearizedRadiationHeatRateW: 0,
      relativeResidual: 0,
      passed: true,
    });
  });

  it("does not invent a near-equal temperature threshold", () => {
    const adjacent = nextUp(500);
    const outcome = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({
        surfaceTemperatureK: adjacent,
        surroundingsTemperatureK: 500,
      }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.stableLinearization.route).toBe("factorized_secant");
    expect(outcome.stableLinearization.temperatureDifferenceK).toBeGreaterThan(
      0,
    );
  });

  it("returns the same positive h_r for reversed surface/surroundings temperatures", () => {
    const hot = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    const cold = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({ surfaceTemperatureK: 300, surroundingsTemperatureK: 500 }),
    );
    expect(hot.status).toBe("success");
    expect(cold.status).toBe("success");
    if (hot.status !== "success" || cold.status !== "success") return;
    expect(cold.value.radiationCoefficientWPerM2K).toBe(
      hot.value.radiationCoefficientWPerM2K,
    );
    expect(cold.identityChecks.directRadiationHeatRateW).toBeLessThan(0);
    expect(cold.identityChecks.relativeResidual).toBeLessThanOrEqual(
      J04_DIRECT_RADIATION_RELATIVE_TOLERANCE,
    );
  });

  it("supports a zero convection coefficient without hiding radiation", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({ convectionCoefficientWPerM2K: 0 }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.surfaceCoefficientWPerM2K).toBe(
      outcome.value.radiationCoefficientWPerM2K,
    );
    expect(outcome.evidence.convection.heatRateW).toBe(0);
  });

  it("scales h_r linearly with emissivity", () => {
    const full = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({ emissivity: 1 }),
    );
    const half = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({ emissivity: 0.5 }),
    );
    expect(full.status).toBe("success");
    expect(half.status).toBe("success");
    if (full.status !== "success" || half.status !== "success") return;
    expect(half.value.radiationCoefficientWPerM2K).toBeCloseTo(
      full.value.radiationCoefficientWPerM2K / 2,
      13,
    );
  });

  it("keeps h_r independent of area while binding direct heat rate to area", () => {
    const area2 = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    const area5 = calculateJ04LinearizedSurfaceCoefficient(
      inputFixture({ areaM2: 5 }),
    );
    expect(area2.status).toBe("success");
    expect(area5.status).toBe("success");
    if (area2.status !== "success" || area5.status !== "success") return;
    expect(area5.value.radiationCoefficientWPerM2K).toBe(
      area2.value.radiationCoefficientWPerM2K,
    );
    expect(area5.identityChecks.directRadiationHeatRateW).toBeCloseTo(
      (area2.identityChecks.directRadiationHeatRateW * 5) / 2,
      10,
    );
  });

  it("reproduces the direct J-03 radiation heat rate within the frozen rtol", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.identityChecks.allowedRelativeTolerance).toBe(1e-10);
    expect(outcome.identityChecks.relativeResidual).toBeLessThanOrEqual(1e-10);
    expect(outcome.identityChecks.evidenceIdentityToleranceId).toBe("TOL-ID");
    expect(outcome.identityChecks.passed).toBe(true);
  });

  it("returns explicit method, equation, source, material, state, and boundary trace evidence", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome).toMatchObject({
      methodId: "J-04",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved_with_limitation",
      applicabilityStatus: "in_domain",
      warningIds: [],
      warnings: [],
      equation: {
        combined: "h_s = h_c + h_r",
        originalStandardForm:
          "h_r = epsilon * sigma * (T_s^4 - T_sur^4) / (T_s - T_sur)",
      },
      evidence: {
        caseSnapshotId: CASE,
        geometrySnapshotId: GEOMETRY,
        controlVolumeId: "thermal.control_volume.sidewall",
        boundaryId: "thermal.boundary.outer_surface",
        surfaceId: "surface.insulation_outer",
        surfaceStateId: "state.outer_surface.current",
        areaM2: 2,
        surfaceTemperatureK: 500,
        surroundingsTemperatureK: 300,
        materialSnapshotId: MATERIAL,
        emissivitySourceRef: "MAT-EMISSIVITY-01",
        emissivityStateTemperatureK: 500,
        temperatureScale: "absolute_kelvin",
        sameAreaAndBoundaryConfirmed: true,
        convection: { methodId: "J-02" },
        radiation: {
          methodId: "J-03",
          configuration: "radiation_to_large_surroundings",
        },
      },
      mapping: J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING,
    });
  });

  it("rejects a concentric two-gray-surface J-03 result instead of treating network factor as epsilon", () => {
    const input = inputFixture();
    nested(input, "radiationEvidence").configuration =
      "long_concentric_two_gray_surfaces";
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-04.radiation_configuration_not_applicable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects an effective network factor substituted for the explicit emissivity", () => {
    const input = inputFixture();
    nested(input, "radiationEvidence").networkFactor = 0.6;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.radiation_evidence_identity_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["case snapshot", "caseSnapshotId", `case:${"d".repeat(64)}`],
    ["geometry snapshot", "geometrySnapshotId", `geometry:${"e".repeat(64)}`],
    ["control volume", "controlVolumeId", "thermal.control_volume.other"],
    ["boundary", "boundaryId", "thermal.boundary.other"],
    ["surface", "surfaceId", "surface.other"],
    ["state", "surfaceStateId", "state.other"],
  ])("rejects a different J-02 %s as not applicable", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "convectionEvidence")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-04.dependency_boundary_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["case snapshot", "caseSnapshotId", `case:${"d".repeat(64)}`],
    ["geometry snapshot", "geometrySnapshotId", `geometry:${"e".repeat(64)}`],
    ["control volume", "controlVolumeId", "thermal.control_volume.other"],
    ["boundary", "boundaryId", "thermal.boundary.other"],
    ["surface", "surfaceId", "surface.other"],
    ["state", "surfaceStateId", "state.other"],
  ])("rejects a different J-03 %s as not applicable", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "radiationEvidence")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-04.dependency_boundary_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects an explicitly unconfirmed same-area/same-boundary condition", () => {
    const input = inputFixture();
    nested(input, "boundaryEvidence").sameAreaAndBoundaryConfirmed = false;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-04.same_area_boundary_not_confirmed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["area", "areaM2", 3],
    ["surface temperature", "surfaceTemperatureK", 501],
    ["reference temperature", "referenceTemperatureK", 301],
  ])("rejects a same-ID J-02 %s value mismatch", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "convectionEvidence")[key] = value;
    if (key === "areaM2") {
      nested(input, "convectionEvidence").heatRateW = 7200;
    } else if (key === "surfaceTemperatureK") {
      nested(input, "convectionEvidence").heatRateW = 4824;
    } else {
      nested(input, "convectionEvidence").heatRateW = 4776;
    }
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.dependency_snapshot_value_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["area", "areaM2", 3],
    ["surface temperature", "surfaceTemperatureK", 501],
    ["surroundings temperature", "surroundingsTemperatureK", 301],
    ["emissivity", "emissivity", 0.7],
    ["material snapshot", "materialSnapshotId", `material:${"f".repeat(64)}`],
    ["emissivity source", "emissivitySourceRef", "MAT-EMISSIVITY-02"],
  ])("rejects a same-ID J-03 %s value mismatch", (_label, key, value) => {
    const input = inputFixture();
    const radiation = nested(input, "radiationEvidence");
    radiation[key] = value;
    if (key === "areaM2") {
      radiation.heatRateW =
        J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        3 *
        0.8 *
        fourthPowerDifference(500, 300);
    } else if (key === "surfaceTemperatureK") {
      radiation.emissivityStateTemperatureK = 501;
      radiation.heatRateW =
        J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        0.8 *
        fourthPowerDifference(501, 300);
    } else if (key === "surroundingsTemperatureK") {
      radiation.heatRateW =
        J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        0.8 *
        fourthPowerDifference(500, 301);
    } else if (key === "emissivity") {
      radiation.networkFactor = 0.7;
      radiation.heatRateW =
        J04_STEFAN_BOLTZMANN_W_PER_M2_K4 *
        2 *
        0.7 *
        fourthPowerDifference(500, 300);
    }
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.dependency_snapshot_value_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["area", "snapshotAreaM2", 3],
    ["surface temperature", "snapshotSurfaceTemperatureK", 501],
    ["surroundings temperature", "snapshotSurroundingsTemperatureK", 301],
  ])("rejects a boundary snapshot %s mismatch", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "boundaryEvidence")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.dependency_snapshot_value_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("fails closed when emissivity is not evaluated at the surface state", () => {
    const input = inputFixture();
    nested(input, "surface").emissivityStateTemperatureK = 300;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-04.emissivity_state_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["zero emissivity", "emissivity", 0],
    ["emissivity above one", "emissivity", 1.01],
    ["zero kelvin surface", "surfaceTemperatureK", 0],
    ["negative surroundings kelvin", "surroundingsTemperatureK", -1],
    ["zero area", "areaM2", 0],
  ])("rejects %s", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "surface")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.surface_value_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a non-Kelvin boundary scale instead of applying Celsius fourth powers", () => {
    const input = inputFixture();
    nested(input, "boundaryEvidence").temperatureScale = "degree_celsius";
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.boundary_evidence_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["malformed case hash", "caseSnapshotId", `case:${"A".repeat(64)}`],
    ["malformed geometry hash", "geometrySnapshotId", "geometry:not-a-hash"],
    ["unstable control volume", "controlVolumeId", "contains spaces"],
  ])("rejects %s", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "boundaryEvidence")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.boundary_evidence_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a malformed material content hash or property source", () => {
    const input = inputFixture();
    nested(input, "surface").materialSnapshotId = `material:${"A".repeat(64)}`;
    nested(input, "surface").emissivitySourceRef = "contains spaces";
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.emissivity_provenance_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("fails closed for missing surface, boundary, or dependency evidence", () => {
    for (const key of [
      "surface",
      "boundaryEvidence",
      "convectionEvidence",
      "radiationEvidence",
    ] as const) {
      const input = inputFixture();
      input[key] = null;
      const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
      expect(outcome.status).toBe("insufficient_data");
      expectFailureWithoutPayload(outcome);
    }
  });

  it.each([
    ["J-02", "convectionEvidence", "status", "insufficient_data", "insufficient_data"],
    ["J-02", "convectionEvidence", "status", "not_applicable", "not_applicable"],
    ["J-03", "radiationEvidence", "status", "insufficient_data", "insufficient_data"],
    ["J-03", "radiationEvidence", "status", "not_applicable", "not_applicable"],
  ])(
    "propagates unavailable %s dependency evidence as failure-closed %s",
    (_method, evidenceKey, statusKey, statusValue, expectedStatus) => {
      const input = inputFixture();
      nested(
        input,
        evidenceKey as "convectionEvidence" | "radiationEvidence",
      )[statusKey] = statusValue;
      const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
      expect(outcome.status).toBe(expectedStatus);
      expectFailureWithoutPayload(outcome);
    },
  );

  it.each([
    ["J-02", "convectionEvidence", "0.9.0"],
    ["J-03", "radiationEvidence", "0.9.0"],
  ])("rejects stale %s method-version evidence", (_method, evidenceKey, version) => {
    const input = inputFixture();
    nested(
      input,
      evidenceKey as "convectionEvidence" | "radiationEvidence",
    ).methodVersion = version;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome.status).toBe("invalid_input");
    expectFailureWithoutPayload(outcome);
  });

  it.each([NaN, Number.POSITIVE_INFINITY, -1])(
    "rejects invalid h_c=%s",
    (coefficient) => {
      const input = inputFixture();
      nested(input, "convectionEvidence").heatTransferCoefficientWPerM2K =
        coefficient;
      const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
      expect(outcome).toMatchObject({
        status: "invalid_input",
        failure: { code: "J-04.convection_value_invalid" },
      });
      expectFailureWithoutPayload(outcome);
    },
  );

  it("rejects a J-02 heat rate detached from h_c*A*DeltaT", () => {
    const input = inputFixture();
    nested(input, "convectionEvidence").heatRateW = 4801;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.convection_evidence_identity_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a nonzero J-02 heat rate at an exact zero-temperature difference", () => {
    const input = inputFixture({
      surfaceTemperatureK: 500,
      surroundingsTemperatureK: 500,
    });
    nested(input, "convectionEvidence").heatRateW = Number.MIN_VALUE;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.convection_evidence_identity_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a J-03 heat rate detached from epsilon*sigma*A*Delta(T^4)", () => {
    const input = inputFixture();
    nested(input, "radiationEvidence").heatRateW = 1;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.radiation_evidence_identity_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects an opposite-sign J-03 heat rate even below the TOL-ID absolute floor", () => {
    const input = inputFixture({
      surfaceTemperatureK: 500,
      surroundingsTemperatureK: 500,
    });
    nested(input, "radiationEvidence").heatRateW = -Number.MIN_VALUE;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.radiation_evidence_identity_mismatch" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    ["view factor", "viewFactor", 0.5],
    ["diffuse-gray confirmation", "diffuseGraySurfacesConfirmed", false],
    [
      "opening/obstruction confirmation",
      "noUnmodelledOpeningsOrObstructionsConfirmed",
      false,
    ],
  ])("rejects invalid J-03 large-surroundings %s", (_label, key, value) => {
    const input = inputFixture();
    nested(input, "radiationEvidence")[key] = value;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.radiation_value_invalid" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects absolute-temperature power overflow", () => {
    const input = inputFixture();
    const surface = nested(input, "surface");
    const boundary = nested(input, "boundaryEvidence");
    const convection = nested(input, "convectionEvidence");
    const radiation = nested(input, "radiationEvidence");
    surface.surfaceTemperatureK = 1e200;
    surface.emissivityStateTemperatureK = 1e200;
    boundary.snapshotSurfaceTemperatureK = 1e200;
    convection.surfaceTemperatureK = 1e200;
    convection.heatRateW = 2 * 12 * (1e200 - 300);
    radiation.surfaceTemperatureK = 1e200;
    radiation.emissivityStateTemperatureK = 1e200;
    radiation.heatRateW = 0;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.temperature_linearization_not_representable" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a swallowed positive temperature contribution", () => {
    const input = inputFixture({
      surfaceTemperatureK: 1e50,
      surroundingsTemperatureK: 1,
    });
    nested(input, "radiationEvidence").heatRateW = 0;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-04.temperature_positive_term_swallowed" },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a nonzero radiation product that underflows", () => {
    const input = inputFixture({ emissivity: Number.MIN_VALUE });
    nested(input, "radiationEvidence").heatRateW = 0;
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "J-04.radiation_evidence_numeric_resolution_invalid",
      },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects mutually consistent J-03/J-04 evidence built from a positive-subnormal emissivity product", () => {
    const emissivity =
      (Number.MIN_VALUE / J04_STEFAN_BOLTZMANN_W_PER_M2_K4) * 0.75;
    const input = inputFixture({
      surfaceTemperatureK: 1e76,
      surroundingsTemperatureK: 5e75,
      emissivity,
      areaM2: 2,
    });

    expect(emissivity).toBeGreaterThan(0);
    expect(emissivity).toBeLessThan(J04_BINARY64_MIN_NORMAL);
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "J-04.radiation_evidence_numeric_resolution_invalid",
      },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a positive h_c term swallowed by h_r addition", () => {
    const input = inputFixture({
      convectionCoefficientWPerM2K: Number.MIN_VALUE,
    });
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "J-04.surface_coefficient_positive_term_swallowed",
      },
    });
    expectFailureWithoutPayload(outcome);
  });

  it("rejects a positive h_r term swallowed by a huge h_c addition", () => {
    const input = inputFixture({ convectionCoefficientWPerM2K: 1e300 });
    const outcome = calculateJ04LinearizedSurfaceCoefficient(input);
    expect(outcome).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "J-04.surface_coefficient_positive_term_swallowed",
      },
    });
    expectFailureWithoutPayload(outcome);
  });

  it.each([
    [null],
    [[]],
    [{ ...inputFixture(), extra: true }],
    [(() => {
      const input = inputFixture();
      delete input.surface;
      return input;
    })()],
  ])("rejects non-exact top-level input %#", (input) => {
    expectFailureWithoutPayload(calculateJ04LinearizedSurfaceCoefficient(input));
  });

  it("rejects an extra nested key", () => {
    const input = inputFixture();
    nested(input, "radiationEvidence").extra = true;
    expectFailureWithoutPayload(calculateJ04LinearizedSurfaceCoefficient(input));
  });

  it("rejects symbol keys and non-plain nested prototypes", () => {
    const withSymbol = inputFixture();
    Object.defineProperty(nested(withSymbol, "surface"), Symbol("hidden"), {
      enumerable: true,
      value: true,
    });
    expectFailureWithoutPayload(
      calculateJ04LinearizedSurfaceCoefficient(withSymbol),
    );

    const withPrototype = inputFixture();
    Object.setPrototypeOf(nested(withPrototype, "boundaryEvidence"), {
      inherited: true,
    });
    expectFailureWithoutPayload(
      calculateJ04LinearizedSurfaceCoefficient(withPrototype),
    );
  });

  it("does not execute a top-level getter", () => {
    let executed = false;
    const input = inputFixture();
    Object.defineProperty(input, "surface", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(() => calculateJ04LinearizedSurfaceCoefficient(input)).not.toThrow();
    expect(executed).toBe(false);
    expectFailureWithoutPayload(calculateJ04LinearizedSurfaceCoefficient(input));
  });

  it("does not execute a nested getter", () => {
    let executed = false;
    const input = inputFixture();
    Object.defineProperty(nested(input, "convectionEvidence"), "heatRateW", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(() => calculateJ04LinearizedSurfaceCoefficient(input)).not.toThrow();
    expect(executed).toBe(false);
    expectFailureWithoutPayload(calculateJ04LinearizedSurfaceCoefficient(input));
  });

  it("fails closed on hostile proxy reflection traps", () => {
    const proxy = new Proxy(inputFixture(), {
      ownKeys() {
        throw new Error("hostile");
      },
    });
    expect(() => calculateJ04LinearizedSurfaceCoefficient(proxy)).not.toThrow();
    expectFailureWithoutPayload(calculateJ04LinearizedSurfaceCoefficient(proxy));
  });

  it("does not mutate the caller input", () => {
    const input = inputFixture();
    const before = JSON.stringify(input);
    calculateJ04LinearizedSurfaceCoefficient(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("deep-freezes every successful result branch", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(inputFixture());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.value)).toBe(true);
    expect(Object.isFrozen(outcome.equation)).toBe(true);
    expect(Object.isFrozen(outcome.stableLinearization)).toBe(true);
    expect(Object.isFrozen(outcome.substitution)).toBe(true);
    expect(Object.isFrozen(outcome.identityChecks)).toBe(true);
    expect(Object.isFrozen(outcome.evidence)).toBe(true);
    expect(Object.isFrozen(outcome.evidence.convection)).toBe(true);
    expect(Object.isFrozen(outcome.evidence.radiation)).toBe(true);
    expect(outcome.evidence.numericRepresentabilityPolicy).toBe(
      J04_NUMERIC_REPRESENTABILITY_POLICY,
    );
    expect(Object.isFrozen(outcome.assumptions)).toBe(true);
    expect(Object.isFrozen(outcome.mapping)).toBe(true);
  });

  it("binds every failure to method/version/approval/mapping and omits value/evidence", () => {
    const outcome = calculateJ04LinearizedSurfaceCoefficient(null);
    expect(outcome).toMatchObject({
      methodId: "J-04",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved_with_limitation",
      status: "insufficient_data",
      applicabilityStatus: "not_evaluated",
      warningIds: [],
      warnings: [],
      mapping: J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING,
    });
    expectFailureWithoutPayload(outcome);
    expect(Object.isFrozen(outcome)).toBe(true);
    if (outcome.status === "success") return;
    expect(Object.isFrozen(outcome.failure)).toBe(true);
  });

  it("is deterministic for the same controlled input", () => {
    const input = inputFixture();
    expect(calculateJ04LinearizedSurfaceCoefficient(input)).toEqual(
      calculateJ04LinearizedSurfaceCoefficient(input),
    );
  });

  it("does not expose J-04 through the Foundation public API", () => {
    expect(publicApi).not.toHaveProperty(
      "calculateJ04LinearizedSurfaceCoefficient",
    );
    expect(publicApi).not.toHaveProperty(
      "J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING",
    );
  });
});
