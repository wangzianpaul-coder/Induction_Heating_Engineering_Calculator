import { describe, expect, it } from "vitest";

import {
  J02_BINARY64_MIN_NORMAL,
  J02_CONTROLLED_ONLINE_SOURCES,
  J02_EXTERNAL_CONVECTION_MAPPING,
  J02_IMPLEMENTATION_READINESS,
  J02_METHOD_CHECK_IDS,
  J02_METHOD_ID,
  J02_METHOD_VERSION,
  J02_NUMERIC_REPRESENTABILITY_POLICY,
  J02_SOURCE_REFS,
  J02_STANDARD_GRAVITY_M_PER_S2,
  J02_VALIDATION_CASE_IDS,
  J02_WARNING_PREDICATES,
  evaluateJ02ExternalConvection,
  evaluateJ02NusseltMethodCheck,
  type J02ExternalConvectionInput,
  type J02ExternalConvectionOutcome,
  type J02Route,
} from "../../../src/methods/J/j02ExternalConvection.js";

const CASE_ID = `case:${"a".repeat(64)}`;
const GEOMETRY_ID = `geometry:${"b".repeat(64)}`;
const MATERIAL_ID = `material:${"c".repeat(64)}`;

function filmTemperature(surfaceTemperatureK: number, ambientTemperatureK: number) {
  return surfaceTemperatureK / 2 + ambientTemperatureK / 2;
}

function validInput(route: J02Route): J02ExternalConvectionInput {
  const forced = route === "CB77_circular_cylinder_crossflow";
  const vertical = route === "CC75_vertical_plate_all_range";
  const characteristicLengthM = vertical ? 1 : 0.1;
  const surfaceAreaM2 = vertical ? 2 : 0.5;
  const surfaceTemperatureK = 400;
  const ambientTemperatureK = 300;
  const evaluationTemperatureK = filmTemperature(
    surfaceTemperatureK,
    ambientTemperatureK,
  );
  const freeStreamVelocityMPerS = forced ? 2 : null;
  return {
    route,
    characteristicLengthM,
    surfaceAreaM2,
    surfaceTemperatureK,
    ambientTemperatureK,
    freeStreamVelocityMPerS,
    fluidProperties: {
      fluidId: "air",
      materialSnapshotId: MATERIAL_ID,
      propertyStateId: "air-film-state-350K-101325Pa",
      evaluationTemperatureK,
      absolutePressurePa: 101325,
      phaseState: "single_phase_fluid",
      applicabilityStatus: "confirmed_in_domain_without_extrapolation",
      thermalConductivityWPerMK: 0.03,
      prandtlNumber: 0.7,
      kinematicViscosityM2PerS: 2e-5,
      thermalDiffusivityM2PerS: forced ? null : 2.8e-5,
      volumetricExpansionCoefficientPerK: forced ? null : 1 / 350,
      thermalConductivitySourceRef: "A-01:air:k-film",
      prandtlSourceRef: "A-01:air:Pr-film",
      kinematicViscositySourceRef: "A-01:air:nu-film",
      thermalDiffusivitySourceRef: forced
        ? null
        : "A-01:air:alpha-film",
      volumetricExpansionSourceRef: forced
        ? null
        : "A-01:air:beta-film",
    },
    snapshotEvidence: {
      caseSnapshotId: CASE_ID,
      geometrySnapshotId: GEOMETRY_ID,
      materialSnapshotId: MATERIAL_ID,
      propertyStateId: "air-film-state-350K-101325Pa",
      controlVolumeId: "cv.external-sidewall",
      boundaryId: "boundary.external-air",
      surfaceId: "surface.insulation-outer",
      surfaceStateId: "surface-state.400K",
      normalizedRoute: route,
      normalizedCharacteristicLengthM: characteristicLengthM,
      normalizedSurfaceAreaM2: surfaceAreaM2,
      normalizedSurfaceTemperatureK: surfaceTemperatureK,
      normalizedAmbientTemperatureK: ambientTemperatureK,
      normalizedFreeStreamVelocityMPerS: freeStreamVelocityMPerS,
      normalizedFilmTemperatureK: evaluationTemperatureK,
      normalizedAbsolutePressurePa: 101325,
      temperatureScale: "absolute_kelvin",
      filmTemperatureRule: "Tf=(Ts+Tinf)/2",
      propertyEvaluationState: "all_fluid_properties_at_film_state",
    },
    applicabilityEvidence: {
      geometryClass: vertical ? "vertical_plane" : "circular_cylinder",
      orientation: vertical ? "vertical_axis" : "horizontal_axis",
      characteristicLengthDefinition: vertical
        ? "height_along_gravity"
        : "outer_diameter",
      flowState: forced
        ? "uniform_forced_crossflow"
        : "quiescent_natural_convection",
      boundaryMatchesCorrelation: true,
      singleUnshieldedSurfaceConfirmed: true,
      longCylinderEndEffectsNegligible: vertical ? null : true,
      mixedConvectionExcluded: true,
    },
  };
}

function mutableInput(route: J02Route): any {
  return structuredClone(validInput(route));
}

function setTemperatures(input: any, surfaceK: number, ambientK: number) {
  const filmK = filmTemperature(surfaceK, ambientK);
  input.surfaceTemperatureK = surfaceK;
  input.ambientTemperatureK = ambientK;
  input.fluidProperties.evaluationTemperatureK = filmK;
  input.snapshotEvidence.normalizedSurfaceTemperatureK = surfaceK;
  input.snapshotEvidence.normalizedAmbientTemperatureK = ambientK;
  input.snapshotEvidence.normalizedFilmTemperatureK = filmK;
}

function expectFailure(
  outcome: J02ExternalConvectionOutcome,
  status: "invalid_input" | "insufficient_data" | "not_applicable",
  code?: string,
) {
  expect(outcome.status).toBe(status);
  if (outcome.status === "success") {
    throw new Error("expected a failure-closed J-02 outcome");
  }
  if (code !== undefined) {
    expect(outcome.failure.code).toBe(code);
  }
  expect("value" in outcome).toBe(false);
  expect("evidence" in outcome).toBe(false);
  expect("substitution" in outcome).toBe(false);
  expect(outcome.warningIds).toEqual([]);
  expect(outcome.warnings).toEqual([]);
  return outcome;
}

function expectRelative(actual: number, expected: number, rtol = 1e-10) {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(
    rtol,
  );
}

describe("J-02 frozen mapping and non-activation gates", () => {
  it("binds exact registry method/version/source/contract metadata", () => {
    expect(J02_METHOD_ID).toBe("J-02");
    expect(J02_METHOD_VERSION).toBe("1.0.0-gate0");
    expect(J02_SOURCE_REFS).toEqual([
      "ID-HT-01",
      "CC75-V:PP1323-1329",
      "CC75-H:PP1049-1053",
      "CB77:PP300-306",
    ]);
    expect(J02_METHOD_CHECK_IDS).toEqual([
      "CONV-CC75-V-001",
      "CONV-CC75-H-001",
      "CONV-CB77-001",
    ]);
    expect(J02_VALIDATION_CASE_IDS).toEqual([]);
    expect(J02_EXTERNAL_CONVECTION_MAPPING).toMatchObject({
      methodId: "J-02",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      methodType: "engineering_correlation",
      requiresSubmethodSplit: true,
      stableWarningIds: [],
    });
    expect(J02_WARNING_PREDICATES).toEqual({
      unsupportedConfiguration:
        "arbitrary inclination, mixed convection, array or shielding is unmodeled",
      fixedCoefficientWithoutSource: "fixed h has no source",
      correlationMixing: "max or power-sum method mixing is used",
    });
  });

  it("does not falsely claim local pins, manifest hashes, or visual verification", () => {
    expect(J02_CONTROLLED_ONLINE_SOURCES).toEqual({
      CC75_vertical_plate_all_range: {
        sourceId: "CC75-V",
        sourceRef: "CC75-V:PP1323-1329",
        doi: "10.1016/0017-9310(75)90243-4",
        printedPages: "1323-1329",
        localCopyRelativePath: null,
        localCopyByteLength: null,
        localCopySha256: null,
        controlledAccessDate: null,
        sourceManifestRef: null,
        sourcePinStatus: "required",
        localVisualVerificationStatus: "not_available_no_controlled_local_pdf",
      },
      CC75_horizontal_cylinder: {
        sourceId: "CC75-H",
        sourceRef: "CC75-H:PP1049-1053",
        doi: "10.1016/0017-9310(75)90222-7",
        printedPages: "1049-1053",
        localCopyRelativePath: null,
        localCopyByteLength: null,
        localCopySha256: null,
        controlledAccessDate: null,
        sourceManifestRef: null,
        sourcePinStatus: "required",
        localVisualVerificationStatus: "not_available_no_controlled_local_pdf",
      },
      CB77_circular_cylinder_crossflow: {
        sourceId: "CB77",
        sourceRef: "CB77:PP300-306",
        doi: "10.1115/1.3450685",
        printedPages: "300-306",
        localCopyRelativePath: null,
        localCopyByteLength: null,
        localCopySha256: null,
        controlledAccessDate: null,
        sourceManifestRef: null,
        sourcePinStatus: "required",
        localVisualVerificationStatus: "not_available_no_controlled_local_pdf",
      },
    });
  });

  it("keeps route labels distinct from child method IDs and lists all activation gates", () => {
    expect(J02_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      routeNamesAreRegisteredChildMethodIds: false,
    });
    expect(
      J02_IMPLEMENTATION_READINESS.openGates.map((gate) => gate.gateId),
    ).toEqual([
      "J-02.controlled-local-primary-source-pins",
      "J-02.registered-child-method-ids",
      "J-02.property-and-geometry-parameter-mapping",
      "J-02.stable-warning-publication",
    ]);
    expect(J02_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: J02_BINARY64_MIN_NORMAL,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      positiveTermSwallowedPolicy: "fail_closed",
      engineeringThreshold: false,
      sourceCorrelationRearranged: false,
      correlationDomainChanged: false,
    });
    expect(J02_STANDARD_GRAVITY_M_PER_S2).toBe(9.80665);
  });
});

describe("J-02 direct dimensionless frozen correlation checks", () => {
  it.each([
    [
      "CC75_vertical_plate_all_range" as const,
      1e6,
      null,
      16.5303668764,
      "CC75-V",
    ],
    [
      "CC75_horizontal_cylinder" as const,
      1e6,
      null,
      14.5101908474,
      "CC75-H",
    ],
    [
      "CB77_circular_cylinder_crossflow" as const,
      null,
      1e4,
      53.3277886702,
      "CB77",
    ],
  ])("matches TH-CONV-001 for %s", (route, ra, re, expected, sourceId) => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route,
      rayleighNumber: ra,
      reynoldsNumber: re,
      prandtlNumber: 0.7,
    });
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expectRelative(outcome.nusseltNumber, expected);
    expect(outcome.sourceEvidence.sourceId).toBe(sourceId);
    expect(outcome.sourceEvidence.localCopySha256).toBeNull();
    expect(outcome.registeredChildMethodId).toBeNull();
    expect(outcome.runtimePublishable).toBe(false);
  });

  it.each([
    ["CC75_vertical_plate_all_range" as const, 1e12, null],
    ["CC75_horizontal_cylinder" as const, 1e-5, null],
    ["CC75_horizontal_cylinder" as const, 1e12, null],
    ["CB77_circular_cylinder_crossflow" as const, null, 0.2 / 0.7],
  ])("accepts the inclusive frozen domain boundary for %s", (route, ra, re) => {
    expect(
      evaluateJ02NusseltMethodCheck({
        route,
        rayleighNumber: ra,
        reynoldsNumber: re,
        prandtlNumber: 0.7,
      }).status,
    ).toBe("success");
  });

  it.each([
    ["CC75_vertical_plate_all_range" as const, 1e12 + 1, null],
    ["CC75_horizontal_cylinder" as const, 9.999e-6, null],
    ["CC75_horizontal_cylinder" as const, 1e12 + 1, null],
    ["CB77_circular_cylinder_crossflow" as const, null, 0.199 / 0.7],
  ])("fails closed outside the frozen domain for %s", (route, ra, re) => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route,
      rayleighNumber: ra,
      reynoldsNumber: re,
      prandtlNumber: 0.7,
    });
    expect(outcome.status).toBe("not_applicable");
    if (outcome.status === "success") {
      throw new Error("domain escape unexpectedly succeeded");
    }
    expect("value" in outcome).toBe(false);
    expect("evidence" in outcome).toBe(false);
  });

  it.each([
    [
      "CC75_horizontal_cylinder" as const,
      Number.MIN_VALUE,
      null,
      0.7,
      "J-02.CC75-H.domain_not_applicable",
    ],
    [
      "CC75_horizontal_cylinder" as const,
      1e-6,
      null,
      Number.MIN_VALUE,
      "J-02.CC75-H.domain_not_applicable",
    ],
    [
      "CB77_circular_cylinder_crossflow" as const,
      null,
      Number.MIN_VALUE,
      0.7,
      "J-02.CB77.domain_not_applicable",
    ],
  ])(
    "classifies the known frozen domain before in-domain machine guards for %s",
    (route, rayleighNumber, reynoldsNumber, prandtlNumber, code) => {
      const outcome = evaluateJ02NusseltMethodCheck({
        route,
        rayleighNumber,
        reynoldsNumber,
        prandtlNumber,
      });
      expect(outcome.status).toBe("not_applicable");
      if (outcome.status === "success") {
        throw new Error("known out-of-domain state unexpectedly succeeded");
      }
      expect(outcome.failure.code).toBe(code);
      expect("value" in outcome).toBe(false);
      expect("evidence" in outcome).toBe(false);
    },
  );

  it("keeps natural and forced dimensionless routes separate", () => {
    expect(
      evaluateJ02NusseltMethodCheck({
        route: "CC75_vertical_plate_all_range",
        rayleighNumber: 1e6,
        reynoldsNumber: 1e4,
        prandtlNumber: 0.7,
      }).status,
    ).toBe("invalid_input");
    expect(
      evaluateJ02NusseltMethodCheck({
        route: "CB77_circular_cylinder_crossflow",
        rayleighNumber: 1e6,
        reynoldsNumber: 1e4,
        prandtlNumber: 0.7,
      }).status,
    ).toBe("invalid_input");
  });

  it("does not invent an unknown route or accept extra method-check keys", () => {
    expect(
      evaluateJ02NusseltMethodCheck({
        route: "unregistered_child",
        rayleighNumber: 1e6,
        reynoldsNumber: null,
        prandtlNumber: 0.7,
      }).status,
    ).toBe("invalid_input");
    expect(
      evaluateJ02NusseltMethodCheck({
        route: "CC75_vertical_plate_all_range",
        rayleighNumber: 1e6,
        reynoldsNumber: null,
        prandtlNumber: 0.7,
        correction: 1,
      }).status,
    ).toBe("invalid_input");
  });
});

describe("J-02 explicit SI/property/snapshot evaluation", () => {
  it.each([
    "CC75_vertical_plate_all_range",
    "CC75_horizontal_cylinder",
    "CB77_circular_cylinder_crossflow",
  ] as const)("evaluates %s without runtime activation", (route) => {
    const input = validInput(route);
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expect(outcome.methodId).toBe("J-02");
    expect(outcome.methodVersion).toBe("1.0.0-gate0");
    expect(outcome.methodApproval).toBe("approved_with_limitation");
    expect(outcome.route).toBe(route);
    expect(outcome.registeredChildMethodId).toBeNull();
    expect(outcome.runtimePublishable).toBe(false);
    expect(outcome.warningIds).toEqual([]);
    expect(outcome.value.nusseltNumber).toBeGreaterThan(0);
    expect(outcome.value.heatTransferCoefficientWPerM2K).toBeGreaterThan(0);
    expect(outcome.value.heatRateW).toBe(
      outcome.value.heatTransferCoefficientWPerM2K *
        input.surfaceAreaM2 *
        (input.surfaceTemperatureK - input.ambientTemperatureK),
    );
    expect(outcome.value).toMatchObject({
      characteristicLengthDimensionId: "length",
      characteristicLengthCanonicalUnitId: "m",
      surfaceAreaDimensionId: "area",
      surfaceAreaCanonicalUnitId: "m2",
      heatTransferCoefficientDimensionId: "heat_transfer_coefficient",
      heatTransferCoefficientCanonicalUnitId: "W/(m2*K)",
      heatRateDimensionId: "power",
      heatRateCanonicalUnitId: "W",
      positiveDirection: "surface_to_ambient",
    });
    expect(outcome.evidence).toMatchObject({
      caseSnapshotId: CASE_ID,
      geometrySnapshotId: GEOMETRY_ID,
      materialSnapshotId: MATERIAL_ID,
      controlVolumeId: "cv.external-sidewall",
      boundaryId: "boundary.external-air",
      surfaceId: "surface.insulation-outer",
      areaM2: input.surfaceAreaM2,
      surfaceTemperatureK: 400,
      referenceTemperatureK: 300,
    });
    expect(outcome.evidence.routeSource.localCopySha256).toBeNull();
    expect(outcome.evidence.numericRepresentabilityPolicy.engineeringThreshold).toBe(
      false,
    );
  });

  it("computes CB77 Re_D from U*D/nu and preserves the source formula", () => {
    const outcome = evaluateJ02ExternalConvection(
      validInput("CB77_circular_cylinder_crossflow"),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expectRelative(outcome.value.reynoldsNumber as number, 1e4, 1e-15);
    expectRelative(outcome.value.nusseltNumber, 53.3277886702);
    expect(outcome.value.rayleighNumber).toBeNull();
    expect(outcome.equation).toContain("Re_D/282000");
    expect(outcome.domainCriterion).toBe("Re_D*Pr>=0.2");
  });

  it("does not invent a gravity-axis correction for uniform CB77 crossflow", () => {
    const input = mutableInput("CB77_circular_cylinder_crossflow");
    input.applicabilityEvidence.orientation = "vertical_axis";
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expect(outcome.value.reynoldsNumber).not.toBeNull();
  });

  it("computes CC75 Ra from g0*beta*abs(deltaT)*X^3/(nu*alpha)", () => {
    const input = validInput("CC75_horizontal_cylinder");
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    const expectedRa =
      (9.80665 *
        (input.fluidProperties.volumetricExpansionCoefficientPerK as number) *
        Math.abs(input.surfaceTemperatureK - input.ambientTemperatureK) *
        input.characteristicLengthM ** 3) /
      (input.fluidProperties.kinematicViscosityM2PerS *
        (input.fluidProperties.thermalDiffusivityM2PerS as number));
    expect(outcome.value.rayleighNumber).toBe(expectedRa);
    expect(outcome.value.reynoldsNumber).toBeNull();
    expect(outcome.substitution.filmTemperatureK).toBe(350);
    expect(outcome.evidence.fluidPropertySourceRefs).toHaveLength(5);
  });

  it("preserves signed heat flow for a colder surface", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    setTemperatures(input, 300, 400);
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expect(outcome.value.heatRateW).toBeLessThan(0);
    expect(outcome.value.rayleighNumber).toBeGreaterThan(0);
  });

  it("uses the exact zero-deltaT vertical-plate limit without a temperature threshold", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    setTemperatures(input, 300, 300);
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    expect(outcome.value.rayleighNumber).toBe(0);
    expect(outcome.value.nusseltNumber).toBe(0.825 ** 2);
    expect(outcome.value.heatRateW).toBe(0);
  });

  it("copies and freezes successful evidence instead of retaining mutable input aliases", () => {
    const input = mutableInput("CC75_horizontal_cylinder");
    const outcome = evaluateJ02ExternalConvection(input);
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      throw new Error(outcome.failure.message);
    }
    input.snapshotEvidence.normalizedSurfaceAreaM2 = 999;
    input.applicabilityEvidence.geometryClass = "other";
    expect(outcome.evidence.snapshotEvidence.normalizedSurfaceAreaM2).toBe(0.5);
    expect(outcome.evidence.applicabilityEvidence.geometryClass).toBe(
      "circular_cylinder",
    );
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.value)).toBe(true);
    expect(Object.isFrozen(outcome.evidence)).toBe(true);
    expect(Object.isFrozen(outcome.evidence.snapshotEvidence)).toBe(true);
  });

  it("does not apply the vertical zero-Ra limit to the horizontal-cylinder route", () => {
    const input = mutableInput("CC75_horizontal_cylinder");
    setTemperatures(input, 300, 300);
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "not_applicable",
      "J-02.CC75-H.domain_not_applicable",
    );
  });
});

describe("J-02 applicability and missing-evidence status priority", () => {
  it.each([
    ["inclined", "quiescent_natural_convection", true, true],
    ["vertical_axis", "mixed_convection", true, true],
    ["vertical_axis", "quiescent_natural_convection", false, true],
    ["vertical_axis", "quiescent_natural_convection", true, false],
  ])(
    "rejects inclination/mixing/boundary/shielding without corrections",
    (orientation, flowState, boundaryMatch, unshielded) => {
      const input = mutableInput("CC75_vertical_plate_all_range");
      input.applicabilityEvidence.orientation = orientation;
      input.applicabilityEvidence.flowState = flowState;
      input.applicabilityEvidence.boundaryMatchesCorrelation = boundaryMatch;
      input.applicabilityEvidence.singleUnshieldedSurfaceConfirmed = unshielded;
      expectFailure(
        evaluateJ02ExternalConvection(input),
        "not_applicable",
        "J-02.geometry_or_flow_not_applicable",
      );
    },
  );

  it("rejects non-crossflow CB77 and finite cylinder ends", () => {
    const nonCrossflow = mutableInput(
      "CB77_circular_cylinder_crossflow",
    );
    nonCrossflow.applicabilityEvidence.flowState = "non_crossflow";
    expectFailure(
      evaluateJ02ExternalConvection(nonCrossflow),
      "not_applicable",
    );
    const finiteEnds = mutableInput("CC75_horizontal_cylinder");
    finiteEnds.applicabilityEvidence.longCylinderEndEffectsNegligible = false;
    expectFailure(
      evaluateJ02ExternalConvection(finiteEnds),
      "not_applicable",
    );
  });

  it("returns insufficient_data for unconfirmed applicability before hostile numerics", () => {
    const input = mutableInput("CC75_horizontal_cylinder");
    input.applicabilityEvidence.longCylinderEndEffectsNegligible = null;
    input.characteristicLengthM = Number.MIN_VALUE;
    const failure = expectFailure(
      evaluateJ02ExternalConvection(input),
      "insufficient_data",
    );
    expect(failure.failure.code).toBe("J-02.applicability_evidence_missing");
  });

  it("returns not_applicable for known mixed convection before hostile numerics", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.applicabilityEvidence.flowState = "mixed_convection";
    input.characteristicLengthM = Number.MIN_VALUE;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "not_applicable",
      "J-02.geometry_or_flow_not_applicable",
    );
  });

  it.each(["unconfirmed", "extrapolated"])(
    "returns insufficient_data for %s film properties before numeric validation",
    (propertyStatus) => {
      const input = mutableInput("CC75_vertical_plate_all_range");
      input.fluidProperties.applicabilityStatus = propertyStatus;
      input.characteristicLengthM = Number.NaN;
      expectFailure(
        evaluateJ02ExternalConvection(input),
        "insufficient_data",
        "J-02.fluid_film_state_unavailable",
      );
    },
  );

  it("returns not_applicable for a known unsupported multiphase state first", () => {
    const input = mutableInput("CB77_circular_cylinder_crossflow");
    input.fluidProperties.phaseState = "unsupported_multiphase";
    input.freeStreamVelocityMPerS = Number.NaN;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "not_applicable",
      "J-02.fluid_phase_not_applicable",
    );
  });

  it.each(["unconfirmed", "extrapolated"])(
    "keeps known unsupported multiphase ahead of unrelated %s property applicability",
    (propertyStatus) => {
      const input = mutableInput("CC75_horizontal_cylinder");
      input.fluidProperties.phaseState = "unsupported_multiphase";
      input.fluidProperties.applicabilityStatus = propertyStatus;
      expectFailure(
        evaluateJ02ExternalConvection(input),
        "not_applicable",
        "J-02.fluid_phase_not_applicable",
      );
    },
  );

  it("keeps known unsupported multiphase ahead of an unknown long-cylinder confirmation", () => {
    const input = mutableInput("CB77_circular_cylinder_crossflow");
    input.fluidProperties.phaseState = "unsupported_multiphase";
    input.applicabilityEvidence.longCylinderEndEffectsNegligible = null;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "not_applicable",
      "J-02.fluid_phase_not_applicable",
    );
  });

  it("validates malformed schema and snapshot identity before known unsupported phase", () => {
    const malformedApplicability = mutableInput("CC75_horizontal_cylinder");
    malformedApplicability.fluidProperties.phaseState = "unsupported_multiphase";
    malformedApplicability.applicabilityEvidence.geometryClass = "forged";
    expectFailure(
      evaluateJ02ExternalConvection(malformedApplicability),
      "invalid_input",
      "J-02.applicability_evidence_invalid",
    );

    const malformedIdentity = mutableInput("CC75_horizontal_cylinder");
    malformedIdentity.fluidProperties.phaseState = "unsupported_multiphase";
    malformedIdentity.snapshotEvidence.geometrySnapshotId =
      "geometry:not-a-hash";
    expectFailure(
      evaluateJ02ExternalConvection(malformedIdentity),
      "invalid_input",
      "J-02.snapshot_identity_invalid",
    );
  });

  it("returns insufficient_data when property-level provenance is absent", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.fluidProperties.volumetricExpansionSourceRef = null;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "insufficient_data",
      "J-02.fluid_property_data_missing",
    );
  });

  it("distinguishes missing route inputs/evidence from malformed data", () => {
    const missingEvidence = mutableInput("CC75_vertical_plate_all_range");
    missingEvidence.fluidProperties = null;
    expectFailure(
      evaluateJ02ExternalConvection(missingEvidence),
      "insufficient_data",
      "J-02.evidence_schema_invalid",
    );
    const missingLength = mutableInput("CC75_vertical_plate_all_range");
    missingLength.characteristicLengthM = null;
    expectFailure(
      evaluateJ02ExternalConvection(missingLength),
      "insufficient_data",
      "J-02.required_si_input_missing",
    );
    const missingProperty = mutableInput("CC75_vertical_plate_all_range");
    missingProperty.fluidProperties.thermalDiffusivityM2PerS = null;
    expectFailure(
      evaluateJ02ExternalConvection(missingProperty),
      "insufficient_data",
      "J-02.fluid_property_data_missing",
    );
  });

  it("forbids carrying natural-convection properties into CB77", () => {
    const input = mutableInput("CB77_circular_cylinder_crossflow");
    input.fluidProperties.thermalDiffusivityM2PerS = 2.8e-5;
    input.fluidProperties.thermalDiffusivitySourceRef =
      "A-01:air:alpha-film";
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.route_property_set_invalid",
    );
  });
});

describe("J-02 exact snapshot/state binding", () => {
  it.each([
    ["normalizedRoute", "CC75_horizontal_cylinder"],
    ["normalizedCharacteristicLengthM", 0.9],
    ["normalizedSurfaceAreaM2", 1.9],
    ["normalizedSurfaceTemperatureK", 399],
    ["normalizedAmbientTemperatureK", 299],
    ["normalizedFilmTemperatureK", 349],
    ["normalizedAbsolutePressurePa", 100000],
    ["materialSnapshotId", `material:${"d".repeat(64)}`],
    ["propertyStateId", "air-film-state.stale"],
  ])("rejects a stale or changed snapshot %s", (key, value) => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.snapshotEvidence[key] = value;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.snapshot_state_mismatch",
    );
  });

  it("rejects a one-ULP area change under the same geometry snapshot", () => {
    const input = mutableInput("CC75_horizontal_cylinder");
    input.surfaceAreaM2 = 0.5000000000000001;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.snapshot_state_mismatch",
    );
  });

  it("rejects stale film properties even when all other evidence matches", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.fluidProperties.evaluationTemperatureK = 351;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.snapshot_state_mismatch",
    );
  });

  it("rejects malformed content-addressed and boundary IDs", () => {
    const badHash = mutableInput("CC75_vertical_plate_all_range");
    badHash.snapshotEvidence.geometrySnapshotId = "geometry:not-a-hash";
    expectFailure(
      evaluateJ02ExternalConvection(badHash),
      "invalid_input",
      "J-02.snapshot_identity_invalid",
    );
    const badBoundary = mutableInput("CC75_vertical_plate_all_range");
    badBoundary.snapshotEvidence.boundaryId = "not stable id";
    expectFailure(
      evaluateJ02ExternalConvection(badBoundary),
      "invalid_input",
      "J-02.snapshot_identity_invalid",
    );
  });

  it("rejects Celsius-scale evidence rather than converting it", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.snapshotEvidence.temperatureScale = "celsius";
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.snapshot_identity_invalid",
    );
  });
});

describe("J-02 binary64 fail-closed boundaries", () => {
  it("rejects a positive subnormal dimensionless input", () => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route: "CC75_vertical_plate_all_range",
      rayleighNumber: Number.MIN_VALUE,
      reynoldsNumber: null,
      prandtlNumber: 0.7,
    });
    expect(outcome.status).toBe("invalid_input");
    if (outcome.status === "success") {
      throw new Error("positive subnormal Ra unexpectedly succeeded");
    }
    expect(outcome.failure.code).toBe("J-02.numeric_resolution_invalid");
  });

  it("rejects a positive Ra contribution swallowed by the natural-correlation constant", () => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route: "CC75_vertical_plate_all_range",
      rayleighNumber: J02_BINARY64_MIN_NORMAL,
      reynoldsNumber: null,
      prandtlNumber: 0.7,
    });
    expect(outcome.status).toBe("invalid_input");
    if (outcome.status === "success") {
      throw new Error("swallowed Ra contribution unexpectedly succeeded");
    }
    expect(outcome.failure.message).toContain("swallowed");
  });

  it("rejects a positive Pr term swallowed by denominator addition", () => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route: "CC75_vertical_plate_all_range",
      rayleighNumber: 1e6,
      reynoldsNumber: null,
      prandtlNumber: 1e100,
    });
    expect(outcome.status).toBe("invalid_input");
    if (outcome.status === "success") {
      throw new Error("swallowed denominator term unexpectedly succeeded");
    }
    expect(outcome.failure.code).toBe("J-02.numeric_resolution_invalid");
  });

  it("rejects CB77 overflow instead of returning a last finite term", () => {
    const outcome = evaluateJ02NusseltMethodCheck({
      route: "CB77_circular_cylinder_crossflow",
      rayleighNumber: null,
      reynoldsNumber: Number.MAX_VALUE,
      prandtlNumber: 2,
    });
    expect(outcome.status).toBe("invalid_input");
    if (outcome.status === "success") {
      throw new Error("overflowing CB77 input unexpectedly succeeded");
    }
    expect(outcome.failure.code).toBe("J-02.numeric_resolution_invalid");
  });

  it("rejects film-temperature positive-term swallowing", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    setTemperatures(input, 1e300, 300);
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
  });

  it("rejects characteristic-length square/cube underflow", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.characteristicLengthM = 1e-200;
    input.snapshotEvidence.normalizedCharacteristicLengthM = 1e-200;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
  });

  it("rejects nu*alpha underflow", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input.fluidProperties.kinematicViscosityM2PerS = 1e-200;
    input.fluidProperties.thermalDiffusivityM2PerS = 1e-200;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
  });

  it("rejects a positive-subnormal Rayleigh numerator", () => {
    const input = mutableInput("CC75_horizontal_cylinder");
    setTemperatures(input, 301, 300);
    input.fluidProperties.volumetricExpansionCoefficientPerK = 2.3e-308;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
  });

  it("rejects h*A underflow", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    setTemperatures(input, 300, 300);
    input.surfaceAreaM2 = J02_BINARY64_MIN_NORMAL;
    input.snapshotEvidence.normalizedSurfaceAreaM2 =
      J02_BINARY64_MIN_NORMAL;
    expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
  });

  it("rejects a nonzero positive-subnormal Qconv", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    const ambientK = 300;
    const surfaceK = 300.00000000000006;
    setTemperatures(input, surfaceK, ambientK);
    input.fluidProperties.thermalConductivityWPerMK =
      4 * J02_BINARY64_MIN_NORMAL;
    const failure = expectFailure(
      evaluateJ02ExternalConvection(input),
      "invalid_input",
      "J-02.numeric_resolution_invalid",
    );
    expect(failure.failure.message).toContain("Q_conv");
  });

  it.each([
    ["characteristicLengthM", 0],
    ["characteristicLengthM", Number.MIN_VALUE],
    ["surfaceAreaM2", Number.POSITIVE_INFINITY],
    ["surfaceTemperatureK", Number.NaN],
    ["ambientTemperatureK", -1],
  ])("rejects invalid canonical SI %s=%s", (key, value) => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input[key] = value;
    expectFailure(evaluateJ02ExternalConvection(input), "invalid_input");
  });
});

describe("J-02 hostile trust boundary", () => {
  it("rejects missing and extra top-level fields", () => {
    expectFailure(evaluateJ02ExternalConvection(null), "insufficient_data");
    const missing = mutableInput("CC75_vertical_plate_all_range");
    delete missing.surfaceAreaM2;
    expectFailure(evaluateJ02ExternalConvection(missing), "invalid_input");
    const extra = mutableInput("CC75_vertical_plate_all_range");
    extra.heatTransferCoefficientWPerM2K = 10;
    expectFailure(evaluateJ02ExternalConvection(extra), "invalid_input");
  });

  it("rejects extra nested keys and arrays", () => {
    const extraFluid = mutableInput("CC75_vertical_plate_all_range");
    extraFluid.fluidProperties.hiddenDefault = true;
    expectFailure(
      evaluateJ02ExternalConvection(extraFluid),
      "invalid_input",
    );
    const arrayEvidence = mutableInput("CC75_vertical_plate_all_range");
    arrayEvidence.snapshotEvidence = [];
    expectFailure(
      evaluateJ02ExternalConvection(arrayEvidence),
      "invalid_input",
    );
  });

  it("rejects symbol keys", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    input[Symbol("hidden")] = 1;
    expectFailure(evaluateJ02ExternalConvection(input), "invalid_input");
  });

  it("rejects getters without executing them", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    let getterCalls = 0;
    Object.defineProperty(input, "route", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return "CC75_vertical_plate_all_range";
      },
    });
    expectFailure(evaluateJ02ExternalConvection(input), "invalid_input");
    expect(getterCalls).toBe(0);
  });

  it("catches hostile Proxy reflection without executing a get trap", () => {
    let getCalls = 0;
    const proxy = new Proxy(mutableInput("CC75_vertical_plate_all_range"), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
      get() {
        getCalls += 1;
        throw new Error("hostile get");
      },
    });
    expectFailure(evaluateJ02ExternalConvection(proxy), "invalid_input");
    expect(getCalls).toBe(0);
  });

  it("rejects hostile nested enum objects without coercing them", () => {
    const input = mutableInput("CC75_vertical_plate_all_range");
    let coercions = 0;
    input.applicabilityEvidence.geometryClass = {
      toString() {
        coercions += 1;
        throw new Error("must not coerce");
      },
    };
    expectFailure(evaluateJ02ExternalConvection(input), "invalid_input");
    expect(coercions).toBe(0);
  });

  it("rejects non-plain class instances", () => {
    class HostileInput {
      readonly route = "CC75_vertical_plate_all_range";
    }
    expectFailure(
      evaluateJ02ExternalConvection(new HostileInput()),
      "invalid_input",
    );
  });
});
