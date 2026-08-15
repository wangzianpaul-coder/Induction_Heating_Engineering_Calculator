import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  D05_AC_RESISTANCE_FAMILY_MAPPING,
  D05_BINARY64_MIN_NORMAL,
  D05_CONTROLLED_SOURCE_FILES,
  D05_DEPENDENCY_METHOD_VERSIONS,
  D05_IMPLEMENTATION_READINESS,
  D05_INTERNAL_ROUTES,
  D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING,
  D05_METHOD_CHECK_IDS,
  D05_METHOD_ID,
  D05_METHOD_VERSION,
  D05_NUMERIC_REPRESENTABILITY_POLICY,
  D05_SOURCE_REFS,
  D05_VALIDATION_CASE_IDS,
  D05_WARNING_PREDICATES,
  evaluateD05AcResistanceFamily,
  type D05AcResistanceFamilyFailure,
  type D05AcResistanceFamilyInput,
  type D05AcResistanceFamilyOutcome,
  type D05ConductorShape,
} from "../../../src/methods/D/d05AcResistanceFamily.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT = `case:${"a".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"b".repeat(64)}`;
const MATERIAL_SNAPSHOT = `material:${"c".repeat(64)}`;
const MU0 = 1.25663706127e-6;

interface FactoryOptions {
  readonly shape?: D05ConductorShape;
  readonly outerDiameterM?: number;
  readonly innerDiameterM?: number | null;
  readonly lengthM?: number;
  readonly resistivityOhmM?: number;
  readonly frequencyHz?: number;
  readonly temperatureK?: number;
  readonly relativePermeability?: number;
}

function makeUpstream(options: FactoryOptions = {}) {
  const shape = options.shape ?? "hollow_round";
  const outerDiameterM = options.outerDiameterM ?? 0.02;
  const innerDiameterM =
    options.innerDiameterM === undefined
      ? shape === "hollow_round"
        ? 0.014
        : null
      : options.innerDiameterM;
  const lengthM = options.lengthM ?? 5;
  const resistivityOhmM = options.resistivityOhmM ?? 1.8e-8;
  const frequencyHz = options.frequencyHz ?? 10_000;
  const temperatureK = options.temperatureK ?? 373.15;
  const relativePermeability = options.relativePermeability ?? 1;
  const metalAreaM2 =
    innerDiameterM === null
      ? (Math.PI * outerDiameterM * outerDiameterM) / 4
      : (Math.PI * (outerDiameterM - innerDiameterM) *
          (outerDiameterM + innerDiameterM)) /
        4;
  const dcResistanceOhm =
    (resistivityOhmM * lengthM) / metalAreaM2;
  const absolutePermeabilityHPerM = MU0 * relativePermeability;
  const skinDepthM = Math.sqrt(
    resistivityOhmM /
      (Math.PI * frequencyHz * absolutePermeabilityHPerM),
  );
  return {
    d01: {
      sourceMethodId: "D-01" as const,
      sourceMethodVersion:
        D05_DEPENDENCY_METHOD_VERSIONS.conductorPathLength.methodVersion,
      sourceOutcome: "success" as const,
      sourceResultId: "d01-result-001",
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      conductorLengthM: lengthM,
      lengthQuantity: "helixLengthM" as const,
      pathBoundaryId: "coil.copper.body",
      leadBusJointTreatment: "excluded_and_reported_unaccounted" as const,
    },
    d02: {
      sourceMethodId: "D-02" as const,
      sourceMethodVersion:
        D05_DEPENDENCY_METHOD_VERSIONS.conductorSectionGeometry.methodVersion,
      sourceOutcome: "success" as const,
      sourceResultId: "d02-result-001",
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      conductorShape: shape,
      outerDiameterM,
      innerDiameterM,
      metalAreaM2,
      sectionUniformity: "constant_along_length" as const,
    },
    d03: {
      sourceMethodId: "D-03" as const,
      sourceMethodVersion:
        D05_DEPENDENCY_METHOD_VERSIONS.dcResistance.methodVersion,
      sourceOutcome: "success" as const,
      sourceResultId: "d03-result-001",
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      materialSnapshotId: MATERIAL_SNAPSHOT,
      materialId: "copper.project.grade-001",
      temperatureK,
      conductorLengthM: lengthM,
      metalAreaM2,
      resistivityOhmM,
      dcResistanceOhm,
      resistanceBoundaryId: "coil.copper.body",
      resistanceBoundary:
        "conductor_body_only_excludes_series_extras" as const,
    },
    d04: {
      sourceMethodId: "D-04" as const,
      sourceMethodVersion:
        D05_DEPENDENCY_METHOD_VERSIONS.copperSkinDepth.methodVersion,
      sourceOutcome: "success" as const,
      sourceResultId: "d04-result-001",
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      materialSnapshotId: MATERIAL_SNAPSHOT,
      materialId: "copper.project.grade-001",
      temperatureK,
      frequencyHz,
      resistivityOhmM,
      relativePermeability,
      skinDepthM,
      materialClass: "copper" as const,
      propertyStateMatch:
        "same_material_temperature_frequency_state" as const,
      fieldModel: "locally_planar_reference" as const,
    },
  };
}

function makeScreeningInput(
  options: FactoryOptions = {},
): D05AcResistanceFamilyInput {
  const upstreamEvidence = makeUpstream(options);
  return {
    route: "surface_skin_screening_round",
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    materialSnapshotId: MATERIAL_SNAPSHOT,
    materialId: "copper.project.grade-001",
    frequencyHz: options.frequencyHz ?? 10_000,
    coilMeanTemperatureK: options.temperatureK ?? 373.15,
    portId: "coil.series.port",
    referencePlane: "coil-copper-boundary",
    loadedState: "workpiece_hot",
    resistanceBoundaryId: "coil.copper.body",
    upstreamEvidence,
    screening: {
      conductorIsolation: "isolated",
      longStraightApproximation:
        "long_straight_or_local_planar_confirmed",
      fieldExposedSurfaces: "declared_outer_surface_only",
      outerSurfaceCurrent: "predominantly_outer_surface_confirmed",
      surfaceFieldUniformity:
        "approximately_uniform_circumferential_field",
      adjacentTurnProximity: "negligible",
      workpieceProximity: "negligible",
      returnPath: "known_and_negligible_for_screening",
      externalField: "known_isolated_conductor_screening_field",
      fproxUse: "not_used",
      applicabilitySourceRef: "project:field-assessment-001",
    },
    measurement: null,
  };
}

function makeMeasurementInput(
  options: FactoryOptions = {},
): D05AcResistanceFamilyInput {
  const screeningInput = makeScreeningInput(options);
  const upstream = screeningInput.upstreamEvidence;
  return {
    ...screeningInput,
    route: "measurement_identified",
    screening: null,
    measurement: {
      sourceOutcome: "success",
      sourceResultId: "exp-rac-result-001",
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      materialSnapshotId: MATERIAL_SNAPSHOT,
      materialId: "copper.project.grade-001",
      frequencyHz: screeningInput.frequencyHz,
      temperatureK: screeningInput.coilMeanTemperatureK,
      loadedState: screeningInput.loadedState,
      portId: screeningInput.portId,
      referencePlane: screeningInput.referencePlane,
      resistanceBoundaryId: screeningInput.resistanceBoundaryId,
      deembeddingBoundaryId: "deembed:coil-copper-001",
      coilResistanceBoundaryConfirmed: true,
      deembeddingConfirmed: true,
      loadedPortTotalActiveResistance: false,
      identificationTechnique:
        "four_terminal_impedance_at_operating_frequency",
      quantityBasis: "rms",
      currentRmsA: 1250,
      resistanceOhm: upstream.d03.dcResistanceOhm * 4.25,
      standardUncertaintyOhm: 4e-5,
      coverageFactor: 2,
      uncertaintySourceRef: "lab:uncertainty-budget-001",
      provenanceSourceRef: "lab:measurement-record-001",
      instrumentId: "instrument:lcr-001",
      calibrationRef: "calibration:certificate-001",
      rawDataSha256: "d".repeat(64),
      measurementProtocolId: "EXP-RAC-001",
    },
  };
}

function asInput(value: unknown): D05AcResistanceFamilyInput {
  return value as D05AcResistanceFamilyInput;
}

function expectFailure(
  outcome: D05AcResistanceFamilyOutcome,
  status: D05AcResistanceFamilyFailure["status"],
  code: D05AcResistanceFamilyFailure["failure"]["code"],
): D05AcResistanceFamilyFailure {
  expect(outcome.status).toBe(status);
  expect("failure" in outcome).toBe(true);
  if (
    outcome.status === "success" ||
    outcome.status === "success_with_warnings"
  ) {
    throw new Error("expected D-05 failure");
  }
  const failed = outcome as D05AcResistanceFamilyFailure;
  expect(failed.failure.code).toBe(code);
  expect("value" in failed).toBe(false);
  expect("evidence" in failed).toBe(false);
  expect(JSON.stringify(failed)).not.toContain('"value"');
  expect(JSON.stringify(failed)).not.toContain('"evidence"');
  return failed;
}

describe("D-05 controlled mapping and non-activation", () => {
  it("maps the exact frozen registry, contract, source, derivation, validation, and confidence metadata", () => {
    const spec = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-05"));
    expect(D05_METHOD_ID).toBe("D-05");
    expect(D05_METHOD_VERSION).toBe(spec.methodVersion);
    expect(D05_SOURCE_REFS).toEqual([
      "RG12:PDF172-187",
      "DHT:PDF8",
      "DHT:PDF17-18",
    ]);
    expect(D05_VALIDATION_CASE_IDS).toEqual(["EXP-RAC-001"]);
    expect(D05_METHOD_CHECK_IDS).toEqual(["ELEC-RAC-FREEZE-001"]);
    expect(D05_AC_RESISTANCE_FAMILY_MAPPING).toMatchObject({
      methodId: spec.methodId,
      methodVersion: spec.methodVersion,
      approvalStatus: "approved_with_limitation",
      methodType: null,
      sourceRefs: spec.sourceRefs,
      contractSourceRefs: spec.contractSourceRefs,
      derivationRefs: spec.derivationRefs,
      inputParameterIds: spec.inputParameterIds,
      outputQuantityIds: spec.outputQuantityIds,
      warningPredicates: spec.warningPredicates,
      stableWarningIds: [],
      scientificConfidence: "engineering_approximation",
      recommendationEligibility: null,
      requiresSubmethodSplit: true,
    });
  });

  it("binds every frozen warning prose predicate without inventing stable IDs", () => {
    expect(Object.values(D05_WARNING_PREDICATES)).toEqual(
      METHOD_SPECIFICATION_REGISTRY.get(methodId("D-05")).warningPredicates,
    );
    expect(D05_AC_RESISTANCE_FAMILY_MAPPING.stableWarningIds).toEqual([]);
  });

  it("records the visually checked controlled PDF paths and manifest hashes", () => {
    expect(D05_CONTROLLED_SOURCE_FILES.RG12).toEqual({
      relativePath: "references/external_sources/nbsbulletinv8n1p1_A2b.pdf",
      sha256:
        "73ec4b101d78494bb4d6d10312bc04df5313e678a27b008bd27e6bdadf85ff82",
      reviewedPages: "PDF172-187",
      use: "future_full_frequency_candidate_only_not_implemented_by_D05",
    });
    expect(D05_CONTROLLED_SOURCE_FILES.DHT).toEqual({
      relativePath:
        "references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf",
      sha256:
        "33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98",
      reviewedPages: "PDF8,17-18",
      use: "proximity_geometry_and_operating_frequency_measurement_basis",
    });
  });

  it("keeps the parent split, validation-name conflict, parameter alignment, and protocol execution gates explicit", () => {
    expect(D05_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "partial_implementation_not_runtime_activated",
      runtimeActivation: "blocked",
      parentRequiresSubmethodSplit: true,
      approvedChildMethodIds: [],
      internalRoutesAreNotMethodIds: true,
    });
    expect(D05_IMPLEMENTATION_READINESS.openGates.map((gate) => gate.gateId)).toEqual([
      "D-05.approved-child-method-ids",
      "D-05.stable-warning-ids",
      "D-05.validation-identifier-alignment",
      "D-05.parameter-dictionary-contract-alignment",
      "D-05.EXP-RAC-001-execution",
      "D-05.parent-result-adapter",
    ]);
    expect(D05_IMPLEMENTATION_READINESS.openGates[2]).toMatchObject({
      registryMethodCheckIds: ["ELEC-RAC-FREEZE-001"],
      validationProseAnalyticalCaseId: "ELEC-RAC-HF-001",
    });
    expect(D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING).toEqual({
      validationCaseId: "EXP-RAC-001",
      releaseStatus: "specified_not_executed",
      matrix:
        "3_copper_temperatures_x_3_frequencies_x_3_current_levels_x_unloaded_and_installed_states",
      calorimetryCrossCheckRequired: true,
      requiredRecords: [
        "geometry",
        "material",
        "temperature",
        "frequency",
        "boundary",
        "instrument",
        "calibration",
        "uncertainty",
        "raw_data_hash",
        "model_versions",
      ],
      calibrationAndValidationDataSeparated: true,
      inventedAcceptancePercentage: false,
      singleMeasurementIsReleaseValidation: false,
    });
  });

  it("uses only the two frozen parent route strings and never treats them as method IDs", () => {
    expect(D05_INTERNAL_ROUTES).toEqual([
      "surface_skin_screening_round",
      "measurement_identified",
    ]);
    for (const route of D05_INTERNAL_ROUTES) {
      expect(() => methodId(route)).toThrow();
    }
  });

  it("remains absent from runtime resolution and the public API", () => {
    expect(() =>
      METHOD_SPECIFICATION_REGISTRY.resolveRuntime(methodId("D-05")),
    ).toThrow(/requires_submethod_split/u);
    const publicApi = readFileSync(join(process.cwd(), "src", "public-api.ts"), "utf8");
    expect(publicApi).not.toContain("d05AcResistanceFamily");
    expect(publicApi).not.toContain("evaluateD05AcResistanceFamily");
  });

  it("labels its numeric boundary as machine-only and preserves equation order", () => {
    expect(D05_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(D05_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      binary64MinimumNormal: 2 ** -1022,
      boundaryKind: "machine_numeric_representability_only",
      positiveSubnormalInputOrIntermediatePolicy: "fail_closed",
      overflowFalseZeroAndSwallowedTermPolicy: "fail_closed",
      engineeringThresholdsAdded: false,
      sourceEquationRearranged: false,
    });
  });
});

describe("D-05 surface_skin_screening_round", () => {
  it("reproduces the controlled ELEC-RAC-HF-001 numerical example without using it as a release gate", () => {
    const outcome = evaluateD05AcResistanceFamily(makeScreeningInput());
    expect(outcome.status).toBe("success_with_warnings");
    if (outcome.status !== "success_with_warnings") return;
    expect(outcome.internalRoute).toBe("surface_skin_screening_round");
    expect(outcome.parentRuntimeActivated).toBe(false);
    expect(outcome.warningIds).toEqual([]);
    expect(outcome.warnings).toEqual([]);
    expect(outcome.value.Rac.valueSi).toBeCloseTo(0.002121320343, 12);
    expect(outcome.equation.substitution.skinDepthM).toBeCloseTo(
      0.000675237237,
      12,
    );
    expect(outcome.value.RacToRdc.valueSi).toBeCloseTo(
      3.776450497185304,
      13,
    );
    expect(outcome.value.screeningMetrics.outerRadiusToSkinDepth.valueSi).toBeCloseTo(
      14.809609792883546,
      13,
    );
    const wall = outcome.value.screeningMetrics.wallThicknessToSkinDepth;
    expect(wall.kind).toBe("available");
    if (wall.kind === "available") {
      expect(wall.valueSi).toBeCloseTo(4.442882937865064, 13);
    }
  });

  it("publishes the exact SI substitutions, dimensions, outer-surface-only Aeff, and no Fprox", () => {
    const outcome = evaluateD05AcResistanceFamily(makeScreeningInput());
    if (outcome.status !== "success_with_warnings") throw new Error("expected success");
    const s = outcome.equation.substitution;
    expect(outcome.equation.effectiveArea).toBe(
      "Aeff = 2 * pi * ro * delta",
    );
    expect(outcome.equation.acResistance).toBe(
      "Rac_surface = rho * ell / Aeff",
    );
    expect(s.participatingOuterPerimeterM).toBe(2 * Math.PI * s.outerRadiusM);
    expect(s.effectiveAreaM2).toBe(
      s.participatingOuterPerimeterM * s.skinDepthM,
    );
    expect(s.acResistanceOhm).toBe(
      s.resistivityTimesLengthOhmM2 / s.effectiveAreaM2,
    );
    expect(outcome.value.Rac).toMatchObject({
      outputId: "Rac",
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
    });
    expect(outcome.value.Aeff).toMatchObject({
      outputId: "Aeff",
      dimensionId: "area",
      canonicalUnitId: "m2",
    });
    expect(outcome.value.unaccountedProximity).toMatchObject({
      numericCorrectionPublished: false,
      zeroCorrectionAssumed: false,
      state:
        "not_modelled_and_explicitly_assessed_negligible_within_screening_domain",
    });
    expect(outcome.screeningEvidence.fproxUse).toBe("not_used");
  });

  it("uses a solid-round outer circumference and marks t_wall/delta not applicable without placeholders", () => {
    const outcome = evaluateD05AcResistanceFamily(
      makeScreeningInput({ shape: "solid_round", innerDiameterM: null }),
    );
    if (outcome.status !== "success_with_warnings") throw new Error("expected success");
    const wall = outcome.value.screeningMetrics.wallThicknessToSkinDepth;
    expect(wall).toEqual({
      kind: "unavailable",
      outputId: "t_wall/delta",
      status: "not_applicable",
      reason: "solid round conductor has no hollow wall thickness",
    });
    expect(JSON.stringify(wall)).not.toMatch(/value|unit|dimension/u);
  });

  it("scales Rac linearly with path length while leaving Rac/Rdc unchanged", () => {
    const one = evaluateD05AcResistanceFamily(makeScreeningInput({ lengthM: 5 }));
    const two = evaluateD05AcResistanceFamily(makeScreeningInput({ lengthM: 10 }));
    if (one.status !== "success_with_warnings" || two.status !== "success_with_warnings") {
      throw new Error("expected screening successes");
    }
    expect(two.value.Rac.valueSi / one.value.Rac.valueSi).toBeCloseTo(2, 14);
    expect(two.value.RacToRdc.valueSi).toBeCloseTo(
      one.value.RacToRdc.valueSi,
      14,
    );
  });

  it("scales Rac with sqrt(f) through the exact D-04 skin-depth binding", () => {
    const one = evaluateD05AcResistanceFamily(
      makeScreeningInput({ frequencyHz: 10_000 }),
    );
    const four = evaluateD05AcResistanceFamily(
      makeScreeningInput({ frequencyHz: 40_000 }),
    );
    if (one.status !== "success_with_warnings" || four.status !== "success_with_warnings") {
      throw new Error("expected screening successes");
    }
    expect(four.value.Rac.valueSi / one.value.Rac.valueSi).toBeCloseTo(2, 13);
    expect(
      one.equation.substitution.skinDepthM /
        four.equation.substitution.skinDepthM,
    ).toBeCloseTo(2, 13);
  });

  it("scales Rac inversely with outer radius for the same skin depth and length", () => {
    const one = evaluateD05AcResistanceFamily(
      makeScreeningInput({ shape: "solid_round", innerDiameterM: null, outerDiameterM: 0.02 }),
    );
    const two = evaluateD05AcResistanceFamily(
      makeScreeningInput({ shape: "solid_round", innerDiameterM: null, outerDiameterM: 0.04 }),
    );
    if (one.status !== "success_with_warnings" || two.status !== "success_with_warnings") {
      throw new Error("expected screening successes");
    }
    expect(two.value.Rac.valueSi / one.value.Rac.valueSi).toBeCloseTo(0.5, 14);
  });

  it("fails closed below the explicit ro/delta>=10 gate", () => {
    expectFailure(
      evaluateD05AcResistanceFamily(
        makeScreeningInput({ shape: "solid_round", innerDiameterM: null, outerDiameterM: 0.01 }),
      ),
      "not_applicable",
      "D-05.outer_radius_to_skin_depth_below_ten",
    );
  });

  it("fails closed below the explicit hollow t_wall/delta>=3 gate", () => {
    expectFailure(
      evaluateD05AcResistanceFamily(
        makeScreeningInput({ outerDiameterM: 0.02, innerDiameterM: 0.018 }),
      ),
      "not_applicable",
      "D-05.hollow_wall_to_skin_depth_below_three",
    );
  });

  it("accepts the exact inclusive ro/delta=10 and hollow t_wall/delta=3 gates", () => {
    const targetSkinDepthM = 0.001;
    const frequencyHz =
      1.8e-8 /
      (Math.PI * MU0 * targetSkinDepthM * targetSkinDepthM);
    const outcome = evaluateD05AcResistanceFamily(
      makeScreeningInput({ frequencyHz }),
    );
    expect(outcome.status).toBe("success_with_warnings");
    if (outcome.status !== "success_with_warnings") return;
    expect(
      outcome.value.screeningMetrics.outerRadiusToSkinDepth.valueSi,
    ).toBe(10);
    const wall = outcome.value.screeningMetrics.wallThicknessToSkinDepth;
    expect(wall.kind).toBe("available");
    if (wall.kind === "available") expect(wall.valueSi).toBe(3);
  });

  it.each([
    ["rectangular_or_complex", "not_applicable", "D-05.round_screening_geometry_not_applicable"],
    ["other_or_unknown", "insufficient_data", "D-05.round_screening_geometry_unconfirmed"],
  ] as const)("fails closed for %s geometry", (shape, status, code) => {
    expectFailure(
      evaluateD05AcResistanceFamily(
        makeScreeningInput({ shape, innerDiameterM: null }),
      ),
      status,
      code,
    );
  });

  it.each([
    ["conductorIsolation", "not_isolated"],
    ["longStraightApproximation", "not_satisfied"],
    ["fieldExposedSurfaces", "inner_and_outer_or_other"],
    ["outerSurfaceCurrent", "not_satisfied"],
    ["surfaceFieldUniformity", "nonuniform"],
    ["adjacentTurnProximity", "significant"],
    ["workpieceProximity", "significant"],
    ["returnPath", "known_but_significant"],
    ["externalField", "known_nonuniform_or_complex"],
  ] as const)("fails known screening scope %s=%s as not_applicable", (key, value) => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, screening: { ...input.screening, [key]: value } }),
      ),
      "not_applicable",
      "D-05.screening_scope_not_applicable",
    );
  });

  it.each([
    ["conductorIsolation", "unconfirmed"],
    ["longStraightApproximation", "unconfirmed"],
    ["fieldExposedSurfaces", "unconfirmed"],
    ["outerSurfaceCurrent", "unconfirmed"],
    ["surfaceFieldUniformity", "unconfirmed"],
    ["adjacentTurnProximity", "unconfirmed"],
    ["workpieceProximity", "unconfirmed"],
    ["returnPath", "unknown"],
    ["externalField", "unknown"],
  ] as const)("fails unresolved screening scope %s=%s as insufficient_data", (key, value) => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, screening: { ...input.screening, [key]: value } }),
      ),
      "insufficient_data",
      "D-05.screening_scope_unconfirmed",
    );
  });

  it.each([
    ["used_without_source", "D-05.unsourced_fprox_forbidden"],
    ["used_with_source", "D-05.fprox_not_supported"],
  ] as const)("forbids Fprox route evidence %s", (fproxUse, code) => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, screening: { ...input.screening, fproxUse } }),
      ),
      "not_applicable",
      code,
    );
  });

  it("gives known rectangular non-applicability priority over unrelated subnormal values", () => {
    const input = makeScreeningInput({
      shape: "rectangular_or_complex",
      innerDiameterM: null,
      lengthM: Number.MIN_VALUE,
    });
    expectFailure(
      evaluateD05AcResistanceFamily(input),
      "not_applicable",
      "D-05.round_screening_geometry_not_applicable",
    );
  });

  it("gives a known significant-proximity state priority over NaN arithmetic", () => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          frequencyHz: Number.NaN,
          screening: { ...input.screening, adjacentTurnProximity: "significant" },
        }),
      ),
      "not_applicable",
      "D-05.screening_scope_not_applicable",
    );
  });
});

describe("D-05 measurement_identified", () => {
  it("publishes same-state de-embedded coil Rac, comparison, uncertainty, and explicit unavailable Aeff", () => {
    const outcome = evaluateD05AcResistanceFamily(makeMeasurementInput());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.internalRoute).toBe("measurement_identified");
    expect(outcome.value.RacToRdc.valueSi).toBeCloseTo(4.25, 14);
    expect(outcome.value.Aeff).toEqual({
      kind: "unavailable",
      outputId: "Aeff",
      status: "insufficient_data",
      reason:
        "measurement_identified does not infer an effective area from measured Rac",
    });
    expect(JSON.stringify(outcome.value.Aeff)).not.toMatch(/value|unit|dimension/u);
    expect(outcome.value.unaccountedProximity).toMatchObject({
      numericCorrectionPublished: false,
      zeroCorrectionAssumed: false,
      state: "included_in_measured_rac_but_not_separately_identified",
    });
    expect(outcome.measurementEvidence).toMatchObject({
      deembeddingBoundaryId: "deembed:coil-copper-001",
      coilResistanceBoundaryConfirmed: true,
      deembeddingConfirmed: true,
      loadedPortTotalActiveResistance: false,
      measurementProtocolId: "EXP-RAC-001",
    });
  });

  it("does not turn Rac/Rdc<1 into a universal hard failure for measurement", () => {
    const input = makeMeasurementInput();
    const resistanceOhm = input.upstreamEvidence.d03.dcResistanceOhm * 0.99;
    const outcome = evaluateD05AcResistanceFamily(
      asInput({ ...input, measurement: { ...input.measurement, resistanceOhm } }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.RacToRdc.passiveUniformConductorCheck).toBe(
      "below_one_measurement_review_not_a_universal_hard_law",
    );
  });

  it("accepts an explicit zero standard uncertainty without using it as a missing placeholder", () => {
    const input = makeMeasurementInput();
    const outcome = evaluateD05AcResistanceFamily(
      asInput({
        ...input,
        measurement: { ...input.measurement, standardUncertaintyOhm: 0 },
      }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status === "success") {
      expect(outcome.value.measurementUncertainty.standardUncertaintyOhm).toBe(0);
    }
  });

  it.each([
    [
      "non-finite outer diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        outerDiameterM: Number.NaN,
      }),
      "D-05.numeric_input_invalid",
    ],
    [
      "positive-subnormal outer diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        conductorShape: "solid_round" as const,
        outerDiameterM: Number.MIN_VALUE,
        innerDiameterM: null,
      }),
      "D-05.numeric_resolution_invalid",
    ],
    [
      "negative inner diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        innerDiameterM: -0.001,
      }),
      "D-05.numeric_input_invalid",
    ],
    [
      "positive-subnormal inner diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        innerDiameterM: Number.MIN_VALUE,
      }),
      "D-05.numeric_resolution_invalid",
    ],
    [
      "inner diameter equal to outer diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        innerDiameterM: input.upstreamEvidence.d02.outerDiameterM,
      }),
      "D-05.upstream_method_binding_invalid",
    ],
    [
      "inner diameter larger than outer diameter",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        innerDiameterM: input.upstreamEvidence.d02.outerDiameterM * 1.1,
      }),
      "D-05.upstream_method_binding_invalid",
    ],
    [
      "unsupported rectangular/complex shape",
      (input: D05AcResistanceFamilyInput) => ({
        ...input.upstreamEvidence.d02,
        conductorShape: "rectangular_or_complex" as const,
        innerDiameterM: null,
      }),
      "D-05.upstream_method_binding_invalid",
    ],
  ] as const)(
    "rejects a purported successful D-02 result with %s on the measurement route",
    (_label, mutateD02, code) => {
      const input = makeMeasurementInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        d02: mutateD02(input),
      };
      expectFailure(
        evaluateD05AcResistanceFamily(
          asInput({ ...input, upstreamEvidence }),
        ),
        "invalid_input",
        code,
      );
    },
  );

  it.each([
    ["solid_round" as const, null],
    ["hollow_round" as const, 0.014],
  ])("accepts the exact successful D-02 %s area identity", (shape, innerDiameterM) => {
    const outcome = evaluateD05AcResistanceFamily(
      makeMeasurementInput({ shape, innerDiameterM }),
    );
    expect(outcome.status).toBe("success");
  });

  it("rejects a forged D-02 area even when D-03 repeats the same forged area", () => {
    const input = makeMeasurementInput();
    const forgedAreaM2 = input.upstreamEvidence.d02.metalAreaM2 * 1.01;
    const forgedDcResistanceOhm =
      (input.upstreamEvidence.d03.resistivityOhmM *
        input.upstreamEvidence.d03.conductorLengthM) /
      forgedAreaM2;
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d02: { ...input.upstreamEvidence.d02, metalAreaM2: forgedAreaM2 },
      d03: {
        ...input.upstreamEvidence.d03,
        metalAreaM2: forgedAreaM2,
        dcResistanceOhm: forgedDcResistanceOhm,
      },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "insufficient_data",
      "D-05.upstream_value_mismatch",
    );
  });

  it("rejects a gradual-underflow D-02 hollow area chain on the measurement route", () => {
    const input = makeMeasurementInput();
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d02: {
        ...input.upstreamEvidence.d02,
        outerDiameterM: 4.6e-162,
        innerDiameterM: 2.3e-162,
      },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "invalid_input",
      "D-05.numeric_resolution_invalid",
    );
  });

  it("replays the complete D-02 hollow hydraulic chain before accepting measurement evidence", () => {
    const input = makeMeasurementInput();
    const outerDiameterM = 0.02;
    const innerDiameterM = 1e-162;
    const metalAreaM2 =
      (Math.PI * (outerDiameterM - innerDiameterM) *
        (outerDiameterM + innerDiameterM)) /
      4;
    const dcResistanceOhm =
      (input.upstreamEvidence.d03.resistivityOhmM *
        input.upstreamEvidence.d03.conductorLengthM) /
      metalAreaM2;
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d02: {
        ...input.upstreamEvidence.d02,
        outerDiameterM,
        innerDiameterM,
        metalAreaM2,
      },
      d03: {
        ...input.upstreamEvidence.d03,
        metalAreaM2,
        dcResistanceOhm,
      },
    };
    expect(Math.PI * innerDiameterM * innerDiameterM).toBe(Number.MIN_VALUE);
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "invalid_input",
      "D-05.numeric_resolution_invalid",
    );
  });

  it.each([
    ["invalid_input", "invalid_input"],
    ["not_applicable", "not_applicable"],
    ["insufficient_data", "insufficient_data"],
  ] as const)(
    "preserves D-02 source status %s ahead of malformed measurement-route geometry",
    (sourceOutcome, status) => {
      const input = makeMeasurementInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        d02: {
          ...input.upstreamEvidence.d02,
          sourceOutcome,
          conductorShape: "rectangular_or_complex" as const,
          outerDiameterM: Number.NaN,
          innerDiameterM: -1,
        },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(
          asInput({ ...input, upstreamEvidence }),
        ),
        status,
        "D-05.upstream_result_unavailable",
      );
    },
  );

  it.each([
    ["loadedPortTotalActiveResistance", true, "D-05.loaded_port_total_not_coil_rac", "not_applicable"],
    ["coilResistanceBoundaryConfirmed", false, "D-05.loaded_port_total_not_coil_rac", "not_applicable"],
    ["deembeddingConfirmed", false, "D-05.measurement_boundary_unconfirmed", "not_applicable"],
    ["loadedPortTotalActiveResistance", null, "D-05.measurement_boundary_unconfirmed", "insufficient_data"],
    ["coilResistanceBoundaryConfirmed", null, "D-05.measurement_boundary_unconfirmed", "insufficient_data"],
    ["deembeddingConfirmed", null, "D-05.measurement_boundary_unconfirmed", "insufficient_data"],
  ] as const)("fails physical measurement boundary %s=%s", (key, value, code, status) => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, measurement: { ...input.measurement, [key]: value } }),
      ),
      status,
      code,
    );
  });

  it.each([
    ["frequencyHz", 20_000],
    ["temperatureK", 400],
    ["loadedState", "empty"],
    ["portId", "different.port"],
    ["referencePlane", "different-plane"],
    ["resistanceBoundaryId", "different.boundary"],
    ["caseSnapshotId", `case:${"1".repeat(64)}`],
    ["geometrySnapshotId", `geometry:${"2".repeat(64)}`],
    ["materialSnapshotId", `material:${"3".repeat(64)}`],
    ["materialId", "different-copper"],
  ] as const)("fails same-state measurement mismatch %s", (key, value) => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, measurement: { ...input.measurement, [key]: value } }),
      ),
      "insufficient_data",
      "D-05.measurement_state_mismatch",
    );
  });

  it.each([
    ["identificationTechnique", "other_or_unconfirmed"],
    ["quantityBasis", "other_or_unconfirmed"],
  ] as const)("fails unresolved measurement method field %s", (key, value) => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, measurement: { ...input.measurement, [key]: value } }),
      ),
      "insufficient_data",
      "D-05.measurement_method_unconfirmed",
    );
  });

  it("fails a failed measurement source without using a last value", () => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          measurement: { ...input.measurement, sourceOutcome: "insufficient_data" },
        }),
      ),
      "insufficient_data",
      "D-05.measurement_result_unavailable",
    );
  });

  it.each([
    ["invalid_input", "invalid_input"],
    ["not_applicable", "not_applicable"],
  ] as const)("preserves measurement source status %s", (sourceOutcome, status) => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, measurement: { ...input.measurement, sourceOutcome } }),
      ),
      status,
      "D-05.measurement_result_unavailable",
    );
  });

  it.each([
    ["rawDataSha256", "not-a-hash"],
    ["instrumentId", ""],
    ["calibrationRef", "bad ref with spaces"],
    ["uncertaintySourceRef", ""],
    ["provenanceSourceRef", ""],
    ["measurementProtocolId", "OTHER"],
  ] as const)("fails malformed measurement provenance %s", (key, value) => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, measurement: { ...input.measurement, [key]: value } }),
      ),
      "invalid_input",
      "D-05.measurement_provenance_invalid",
    );
  });

  it("gives loaded-port exclusion priority over an unrelated NaN resistance", () => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          measurement: {
            ...input.measurement,
            loadedPortTotalActiveResistance: true,
            resistanceOhm: Number.NaN,
          },
        }),
      ),
      "not_applicable",
      "D-05.loaded_port_total_not_coil_rac",
    );
  });
});

describe("D-05 D-01 through D-04 trust and boundary binding", () => {
  it.each(["d01", "d02", "d03", "d04"] as const)(
    "fails unavailable %s evidence without a candidate value",
    (key) => {
      const input = makeScreeningInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        [key]: { ...input.upstreamEvidence[key], sourceOutcome: "insufficient_data" },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
        "insufficient_data",
        "D-05.upstream_result_unavailable",
      );
    },
  );

  it("preserves a known upstream not_applicable status ahead of an unrelated machine-invalid input", () => {
    const input = makeScreeningInput();
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d01: { ...input.upstreamEvidence.d01, conductorLengthM: Number.MIN_VALUE },
      d04: { ...input.upstreamEvidence.d04, sourceOutcome: "not_applicable" },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "not_applicable",
      "D-05.upstream_result_unavailable",
    );
  });

  it("preserves an explicit upstream invalid_input status", () => {
    const input = makeScreeningInput();
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d03: { ...input.upstreamEvidence.d03, sourceOutcome: "invalid_input" },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "invalid_input",
      "D-05.upstream_result_unavailable",
    );
  });

  it.each(["d01", "d02", "d03", "d04"] as const)(
    "rejects a wrong frozen %s method version",
    (key) => {
      const input = makeScreeningInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        [key]: { ...input.upstreamEvidence[key], sourceMethodVersion: "0.0.0" },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
        "invalid_input",
        "D-05.upstream_method_binding_invalid",
      );
    },
  );

  it.each(["d01", "d02", "d03", "d04"] as const)(
    "rejects a non-content-addressed %s geometry snapshot",
    (key) => {
      const input = makeScreeningInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        [key]: { ...input.upstreamEvidence[key], geometrySnapshotId: "geometry:mutable" },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
        "invalid_input",
        "D-05.upstream_method_binding_invalid",
      );
    },
  );

  it("rejects a cold D-03 resistivity state instead of silently reusing it", () => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          upstreamEvidence: {
            ...input.upstreamEvidence,
            d03: { ...input.upstreamEvidence.d03, temperatureK: 293.15 },
          },
        }),
      ),
      "insufficient_data",
      "D-05.upstream_state_mismatch",
    );
  });

  it("rejects D-03 terminal resistance or an unknown boundary", () => {
    const input = makeScreeningInput();
    for (const [resistanceBoundary, status, code] of [
      ["includes_series_extras_or_terminal_measurement", "not_applicable", "D-05.dc_boundary_not_conductor_only"],
      ["unknown", "insufficient_data", "D-05.dc_boundary_unknown"],
    ] as const) {
      expectFailure(
        evaluateD05AcResistanceFamily(
          asInput({
            ...input,
            upstreamEvidence: {
              ...input.upstreamEvidence,
              d03: { ...input.upstreamEvidence.d03, resistanceBoundary },
            },
          }),
        ),
        status,
        code,
      );
    }
  });

  it.each([
    ["D-01 length", (input: D05AcResistanceFamilyInput) => ({
      ...input.upstreamEvidence,
      d01: { ...input.upstreamEvidence.d01, conductorLengthM: 6 },
    })],
    ["D-02 Ametal", (input: D05AcResistanceFamilyInput) => ({
      ...input.upstreamEvidence,
      d02: { ...input.upstreamEvidence.d02, metalAreaM2: input.upstreamEvidence.d02.metalAreaM2 * 1.01 },
    })],
    ["D-03 Rdc", (input: D05AcResistanceFamilyInput) => ({
      ...input.upstreamEvidence,
      d03: { ...input.upstreamEvidence.d03, dcResistanceOhm: input.upstreamEvidence.d03.dcResistanceOhm * 1.01 },
    })],
    ["D-04 delta", (input: D05AcResistanceFamilyInput) => ({
      ...input.upstreamEvidence,
      d04: { ...input.upstreamEvidence.d04, skinDepthM: input.upstreamEvidence.d04.skinDepthM * 1.01 },
    })],
  ] as const)("fails rounded or mismatched %s values", (_label, mutate) => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, upstreamEvidence: mutate(input) }),
      ),
      "insufficient_data",
      "D-05.upstream_value_mismatch",
    );
  });

  it("rejects unresolved lead, bus, and joint boundary evidence", () => {
    const input = makeScreeningInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          upstreamEvidence: {
            ...input.upstreamEvidence,
            d01: { ...input.upstreamEvidence.d01, leadBusJointTreatment: "unknown" },
          },
        }),
      ),
      "insufficient_data",
      "D-05.upstream_state_mismatch",
    );
  });
});

describe("D-05 hostile input and machine-numeric fail-closed behavior", () => {
  it("rejects top-level missing and extra fields", () => {
    const input = makeScreeningInput();
    const { route: _route, ...missingRoute } = input;
    expectFailure(
      evaluateD05AcResistanceFamily(asInput(missingRoute)),
      "invalid_input",
      "D-05.input_schema_invalid",
    );
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, extra: true })),
      "invalid_input",
      "D-05.input_schema_invalid",
    );
  });

  it("requires exactly one route payload and never merges screening with measurement", () => {
    const screening = makeScreeningInput();
    const measurement = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...screening, measurement: measurement.measurement }),
      ),
      "invalid_input",
      "D-05.route_payload_invalid",
    );
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...measurement, screening: screening.screening }),
      ),
      "invalid_input",
      "D-05.route_payload_invalid",
    );
  });

  it("reports explicit null route evidence as insufficient rather than guessing", () => {
    const screening = makeScreeningInput();
    const measurement = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...screening, screening: null })),
      "insufficient_data",
      "D-05.screening_evidence_missing",
    );
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...measurement, measurement: null })),
      "insufficient_data",
      "D-05.measurement_evidence_missing",
    );
  });

  it("rejects top-level getters without executing them", () => {
    const getter = vi.fn(() => makeScreeningInput().route);
    const hostile = { ...makeScreeningInput() } as Record<string, unknown>;
    Object.defineProperty(hostile, "route", { enumerable: true, get: getter });
    expectFailure(
      evaluateD05AcResistanceFamily(asInput(hostile)),
      "invalid_input",
      "D-05.input_schema_invalid",
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects nested getters without executing them", () => {
    const input = makeScreeningInput();
    const getter = vi.fn(() => input.upstreamEvidence.d04.skinDepthM);
    const hostileD04 = { ...input.upstreamEvidence.d04 } as Record<string, unknown>;
    Object.defineProperty(hostileD04, "skinDepthM", {
      enumerable: true,
      get: getter,
    });
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          upstreamEvidence: { ...input.upstreamEvidence, d04: hostileD04 },
        }),
      ),
      "invalid_input",
      "D-05.upstream_evidence_schema_invalid",
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects Proxy reflection traps without throwing", () => {
    const hostile = new Proxy(makeScreeningInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => evaluateD05AcResistanceFamily(hostile)).not.toThrow();
    expectFailure(
      evaluateD05AcResistanceFamily(hostile),
      "invalid_input",
      "D-05.input_schema_invalid",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid shared frequency %s without a result value",
    (frequencyHz) => {
      const input = makeScreeningInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        d04: { ...input.upstreamEvidence.d04, frequencyHz },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(
          asInput({ ...input, frequencyHz, upstreamEvidence }),
        ),
        "invalid_input",
        "D-05.numeric_input_invalid",
      );
    },
  );

  it("rejects a positive-subnormal upstream length at the machine boundary", () => {
    const input = makeScreeningInput();
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d01: { ...input.upstreamEvidence.d01, conductorLengthM: Number.MIN_VALUE },
      d03: { ...input.upstreamEvidence.d03, conductorLengthM: Number.MIN_VALUE },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "invalid_input",
      "D-05.numeric_input_invalid",
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not misclassify invalid skin depth %s as the ro/delta applicability gate",
    (skinDepthM) => {
      const input = makeScreeningInput();
      const upstreamEvidence = {
        ...input.upstreamEvidence,
        d04: { ...input.upstreamEvidence.d04, skinDepthM },
      };
      expectFailure(
        evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
        "invalid_input",
        "D-05.numeric_input_invalid",
      );
    },
  );

  it("rejects a gradual D-03 division overflow as machine numeric failure", () => {
    const input = makeScreeningInput({ lengthM: Number.MAX_VALUE, resistivityOhmM: 1, frequencyHz: 1e12 });
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d03: { ...input.upstreamEvidence.d03, dcResistanceOhm: 1 },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(asInput({ ...input, upstreamEvidence })),
      "invalid_input",
      "D-05.numeric_resolution_invalid",
    );
  });

  it("rejects a D-04 gradual-underflow/false-zero chain", () => {
    const input = makeScreeningInput();
    const upstreamEvidence = {
      ...input.upstreamEvidence,
      d03: { ...input.upstreamEvidence.d03, resistivityOhmM: 1e-98 },
      d04: {
        ...input.upstreamEvidence.d04,
        frequencyHz: 1e308,
        resistivityOhmM: 1e-98,
        skinDepthM: 1e-200,
      },
    };
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({ ...input, frequencyHz: 1e308, upstreamEvidence }),
      ),
      "invalid_input",
      "D-05.numeric_resolution_invalid",
    );
  });

  it("rejects measured Rac/Rdc overflow", () => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          measurement: { ...input.measurement, resistanceOhm: Number.MAX_VALUE },
        }),
      ),
      "invalid_input",
      "D-05.numeric_resolution_invalid",
    );
  });

  it("rejects a positive-subnormal measurement uncertainty instead of rounding it to zero", () => {
    const input = makeMeasurementInput();
    expectFailure(
      evaluateD05AcResistanceFamily(
        asInput({
          ...input,
          measurement: {
            ...input.measurement,
            standardUncertaintyOhm: Number.MIN_VALUE,
          },
        }),
      ),
      "invalid_input",
      "D-05.numeric_input_invalid",
    );
  });

  it("deep-snapshots and freezes successful evidence against later input mutation", () => {
    const input = makeScreeningInput();
    const outcome = evaluateD05AcResistanceFamily(input);
    if (outcome.status !== "success_with_warnings") throw new Error("expected success");
    const originalDelta = outcome.evidence.upstreamEvidence.d04.skinDepthM;
    (input.upstreamEvidence.d04 as { skinDepthM: number }).skinDepthM = 99;
    expect(outcome.evidence.upstreamEvidence.d04.skinDepthM).toBe(originalDelta);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.value)).toBe(true);
    expect(Object.isFrozen(outcome.evidence)).toBe(true);
    expect(Object.isFrozen(outcome.evidence.upstreamEvidence)).toBe(true);
    expect(Object.isFrozen(outcome.evidence.upstreamEvidence.d04)).toBe(true);
  });
});
