import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  I04_BINARY64_MIN_POSITIVE_NORMAL,
  I04_CONTRACT_SOURCE_REFS,
  I04_CRITICAL_RADIUS_SCREENING_MAPPING,
  I04_DEPENDENCY_METHOD_VERSIONS,
  I04_DERIVATION_REFS,
  I04_IMPLEMENTATION_READINESS,
  I04_METHOD_CHECK_IDS,
  I04_SOURCE_REFS,
  I04_VALIDATION_CASE_IDS,
  I04_WARNING_PREDICATES,
  evaluateI04CriticalRadiusScreening,
  type I04CriticalRadiusScreeningFailure,
  type I04CriticalRadiusScreeningInput,
  type I04CriticalRadiusScreeningOutcome,
  type I04CriticalRadiusScreeningSuccess,
  type I04GeometryEvidenceInput,
  type I04MaterialEvidenceInput,
  type I04SurfaceCoefficientEvidenceInput,
  type I04UsageEvidenceInput,
} from "../../../src/methods/I/i04CriticalRadiusScreening.js";

const CASE_SNAPSHOT = `case:${"1".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"2".repeat(64)}`;
const MATERIAL_SNAPSHOT = `material:${"3".repeat(64)}`;

function geometry(
  overrides: Partial<I04GeometryEvidenceInput> = {},
): I04GeometryEvidenceInput {
  return {
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    controlVolumeId: "control-volume:insulation-sidewall:v1",
    boundaryId: "boundary:insulation-outer-sidewall:v1",
    surfaceId: "surface:insulation-outer:v1",
    thermalStateId: "thermal-state:screening:v1",
    geometryKind: "single_layer_cylindrical_insulation",
    innerRadiusM: 0.01,
    insulationThicknessM: 0.002,
    innerRadiusParameterId: "ri",
    thicknessParameterId: "delta",
    canonicalLengthUnitId: "m",
    planeWallAreaBasis:
      "inner_cylindrical_surface_area_per_unit_length",
    geometrySourceRef: "case:geometry:insulation:v1",
    ...overrides,
  };
}

function material(
  overrides: Partial<I04MaterialEvidenceInput> = {},
): I04MaterialEvidenceInput {
  return {
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    materialSnapshotId: MATERIAL_SNAPSHOT,
    materialId: "material:insulation:test-v1",
    thermalStateId: "thermal-state:screening:v1",
    propertyStateId: "property-state:k:screening:v1",
    propertyTemperatureK: 500,
    thermalConductivityWPerMK: 0.04,
    conductivityModel: "fixed_constant_over_screening_domain",
    canonicalUnitId: "W_per_m_K",
    conductivitySourceRef: "material-source:k:test-v1",
    ...overrides,
  };
}

function surfaceCoefficient(
  overrides: Partial<I04SurfaceCoefficientEvidenceInput> = {},
): I04SurfaceCoefficientEvidenceInput {
  return {
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    controlVolumeId: "control-volume:insulation-sidewall:v1",
    boundaryId: "boundary:insulation-outer-sidewall:v1",
    surfaceId: "surface:insulation-outer:v1",
    thermalStateId: "thermal-state:screening:v1",
    surfaceStateId: "surface-state:screening:v1",
    surfaceTemperatureK: 350,
    sourceMethodId: "J-02",
    sourceMethodVersion: "1.0.0-gate0",
    coefficientStatus: "available",
    heatTransferCoefficientWPerM2K: 10,
    hModel: "fixed_over_screening_domain",
    radiationIncluded: false,
    canonicalUnitId: "W_per_m2_K",
    coefficientSourceRef: "method:J-02:result:h:v1",
    ...overrides,
  };
}

function usage(
  overrides: Partial<I04UsageEvidenceInput> = {},
): I04UsageEvidenceInput {
  return {
    criticalRadiusInterpretation: "screening_only_not_exact_design",
    rootSolveRelation: "diagnostic_only_does_not_replace_I01_I02",
    qaThresholdPolicy: "none",
    ...overrides,
  };
}

function input(
  overrides: Partial<I04CriticalRadiusScreeningInput> = {},
): I04CriticalRadiusScreeningInput {
  return {
    geometryEvidence: geometry(),
    materialEvidence: material(),
    surfaceCoefficientEvidence: surfaceCoefficient(),
    usageEvidence: usage(),
    nonlinearLossCurveRequest: "not_requested",
    ...overrides,
  };
}

function successOf(candidate: unknown): I04CriticalRadiusScreeningSuccess {
  const result = evaluateI04CriticalRadiusScreening(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(`Expected I-04 success, received ${result.status}.`);
  }
  return result;
}

function failureOf(
  candidate: unknown,
): I04CriticalRadiusScreeningFailure {
  const result = evaluateI04CriticalRadiusScreening(candidate);
  expect(result.status).not.toBe("success");
  if (result.status === "success") {
    throw new Error("Expected I-04 failure.");
  }
  return result;
}

function expectFailureWithoutPayload(
  result: I04CriticalRadiusScreeningOutcome,
): void {
  expect(result.status).not.toBe("success");
  if (result.status === "success") {
    throw new Error("Expected I-04 failure.");
  }
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect("substitution" in result).toBe(false);
  expect(result.warningIds).toEqual([]);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.failure)).toBe(true);
}

describe("I-04 fixed-h/fixed-k critical-radius screening", () => {
  it("binds exact registry, contract, source, derivation, and method-check metadata", () => {
    expect(I04_CRITICAL_RADIUS_SCREENING_MAPPING).toMatchObject({
      methodId: "I-04",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      methodType: "numerical",
      scientificConfidence: "engineering_approximation",
      recommendationEligibility: null,
      equationRef: "CALCULATION_CONTRACTS.md#I-04:Equation",
      inputParameterIds: [
        "ri",
        "delta",
        "k",
        "h(or nonlinear surface model)",
      ],
      outputQuantityIds: [
        "delta/ri",
        "rcrit",
        "screening status",
        "optional nonlinear loss curve",
      ],
      stableWarningIds: [],
      requiresSubmethodSplit: true,
    });
    expect(I04_SOURCE_REFS).toEqual(["ID-HT-01"]);
    expect(I04_CONTRACT_SOURCE_REFS).toEqual([
      "ID-HT-01",
      "V1_CONTROLLED_DERIVATIONS",
      "DER-THERM",
    ]);
    expect(I04_DERIVATION_REFS).toEqual(["ID-HT-01", "DER-THERM"]);
    expect(I04_VALIDATION_CASE_IDS).toEqual([]);
    expect(I04_METHOD_CHECK_IDS).toEqual(["INS-SCREEN-001"]);
    expect(I04_CRITICAL_RADIUS_SCREENING_MAPPING.warningPredicates).toEqual([
      I04_WARNING_PREDICATES.exactWithNonlinearPhysics,
      I04_WARNING_PREDICATES.projectThresholdCalledStandard,
      I04_WARNING_PREDICATES.replacesInsulationRootSolve,
    ]);
  });

  it("records missing child IDs, warning IDs, nonlinear child, parameter alignment, and adapter gates", () => {
    expect(I04_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      parentRequiresSubmethodSplit: true,
      approvedChildMethodIds: [],
      openGates: [
        { gateId: "I-04.approved-child-method-ids" },
        { gateId: "I-04.nonlinear-loss-curve-child" },
        { gateId: "I-04.stable-warning-ids" },
        {
          gateId: "I-04.parameter-dictionary-contract-alignment",
          registeredContractInputIds: [],
          parameterIdsDeclaringI04Consumer: [
            "insulation.inner_diameter",
            "insulation.outer_diameter",
          ],
        },
        { gateId: "I-04.unavailable-output-adapter" },
      ],
    });
    expect(
      I04_CRITICAL_RADIUS_SCREENING_MAPPING.submethodSplitBasis,
    ).toContain("fixed-h closed-form screen");
  });

  it("remains isolated from the public API and runtime method registry", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateI04CriticalRadiusScreening" in publicApi).toBe(false);
    expect("I04_CRITICAL_RADIUS_SCREENING_MAPPING" in publicApi).toBe(
      false,
    );
    const specification = METHOD_SPECIFICATION_REGISTRY.get(
      methodId("I-04"),
    );
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(
      METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("I-04")),
    ).toBe(false);
  });

  it("implements INS-SCREEN-001 and the direct inner-area resistance ratio in canonical SI", () => {
    const result = successOf(input());
    expect(result.applicabilityStatus).toBe(
      "in_domain_fixed_h_fixed_k_screen",
    );
    expect(result.value.deltaOverRi).toEqual({
      kind: "available",
      outputId: "delta/ri",
      valueSi: 0.2,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation:
        "raw_thickness_to_inner_radius_ratio_without_QA_classification",
    });
    expect(result.value.planeWallComparison.kind).toBe("available");
    if (result.value.planeWallComparison.kind !== "available") {
      throw new Error("Expected available plane-wall comparison.");
    }
    const expectedCylindricalToPlane = Math.log1p(0.2) / 0.2;
    expect(
      result.value.planeWallComparison
        .cylindricalToPlaneResistanceRatio.valueSi,
    ).toBeCloseTo(expectedCylindricalToPlane, 15);
    expect(
      result.value.planeWallComparison
        .planeToCylindricalResistanceRatio.valueSi,
    ).toBeCloseTo(1 / expectedCylindricalToPlane, 15);
    expect(
      result.value.planeWallComparison
        .planeToCylindricalHeatRateRatio.valueSi,
    ).toBeCloseTo(expectedCylindricalToPlane, 15);
    expect(
      result.value.planeWallComparison.relativePlaneHeatRateShortfall
        .valueSi,
    ).toBeCloseTo(1 - expectedCylindricalToPlane, 15);
    expect(result.value.planeWallComparison).toMatchObject({
      areaBasis: "inner_cylindrical_surface_area_per_unit_length",
      qaThresholdApplied: false,
      standardThresholdClaimed: false,
    });

    expect(result.value.criticalRadiusScreen.kind).toBe("available");
    if (result.value.criticalRadiusScreen.kind !== "available") {
      throw new Error("Expected available critical-radius screen.");
    }
    expect(result.value.criticalRadiusScreen.criticalRadius).toMatchObject({
      outputId: "rcrit",
      valueSi: 0.004,
      dimensionId: "length",
      canonicalUnitId: "m",
    });
    expect(result.value.criticalRadiusScreen.outerRadius.valueSi).toBe(
      0.012,
    );
    expect(result.value.screeningStatus).toMatchObject({
      kind: "available",
      value: "outer_radius_above_critical_radius",
      localFixedModelImplication:
        "an_outward_radius_increase_decreases_heat_loss",
      interpretation:
        "raw_fixed_h_fixed_k_cylindrical_screen_only_not_a_design_pass",
    });
    expect(result.identityChecks).toMatchObject({
      toleranceId: "TOL-ID",
      use: "algebraic_identity_only_not_engineering_or_applicability_threshold",
      binary64PositiveNormalFloor: 2 ** -1022,
      binary64FloorUse:
        "machine_representability_boundary_not_engineering_threshold",
      passed: true,
    });
    expect(result.identityChecks.resistanceReciprocalProduct).toBeCloseTo(
      1,
      15,
    );
    expect(
      result.identityChecks.reconstructedConductivityWPerMK,
    ).toBeCloseTo(0.04, 15);
  });

  it("keeps radius, conductivity, coefficient, and ratio dimensions explicit", () => {
    const result = successOf(input());
    expect(result.equations).toEqual({
      geometryRatio: "x = delta / r_i",
      cylindricalResistance:
        "R_cyl / R_plane,inner = ln(1 + x) / x",
      reciprocalResistance:
        "R_plane,inner / R_cyl = x / ln(1 + x)",
      heatRateRatio:
        "Q_plane,inner / Q_cyl = ln(1 + x) / x",
      criticalRadius: "r_crit = k / h",
      outerRadius: "r_o = r_i + delta",
    });
    expect(result.evidence.geometry.canonicalLengthUnitId).toBe("m");
    expect(result.evidence.material.canonicalUnitId).toBe("W_per_m_K");
    expect(result.evidence.surfaceCoefficient.canonicalUnitId).toBe(
      "W_per_m2_K",
    );
    expect(result.assumptions).toContain(
      "rcrit is evaluated only for fixed positive k and fixed positive convection-only h",
    );
  });

  it("preserves rcrit when k and h are scaled by the same factor", () => {
    const base = successOf(input());
    const scaled = successOf(
      input({
        materialEvidence: material({
          thermalConductivityWPerMK: 4,
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: 1000,
        }),
      }),
    );
    if (
      base.value.criticalRadiusScreen.kind !== "available" ||
      scaled.value.criticalRadiusScreen.kind !== "available"
    ) {
      throw new Error("Expected available critical-radius screens.");
    }
    expect(scaled.value.criticalRadiusScreen.criticalRadius.valueSi).toBe(
      base.value.criticalRadiusScreen.criticalRadius.valueSi,
    );
  });

  it.each([
    [
      "below",
      geometry({ innerRadiusM: 0.001, insulationThicknessM: 0.001 }),
      "outer_radius_below_critical_radius",
      "an_outward_radius_increase_can_increase_heat_loss",
    ],
    [
      "equal",
      geometry({
        innerRadiusM: 0.001953125,
        insulationThicknessM: 0.001953125,
      }),
      "outer_radius_equal_to_critical_radius",
      "stationary_maximum_of_the_fixed_h_fixed_k_model",
    ],
    [
      "above",
      geometry(),
      "outer_radius_above_critical_radius",
      "an_outward_radius_increase_decreases_heat_loss",
    ],
  ])(
    "reports the raw %s critical-radius comparison without a design pass",
    (_label, geometryEvidence, expectedStatus, expectedImplication) => {
      const materialEvidence =
        expectedStatus === "outer_radius_equal_to_critical_radius"
          ? material({ thermalConductivityWPerMK: 0.03125 })
          : material();
      const surfaceEvidence =
        expectedStatus === "outer_radius_equal_to_critical_radius"
          ? surfaceCoefficient({
              heatTransferCoefficientWPerM2K: 8,
            })
          : surfaceCoefficient();
      const result = successOf(
        input({
          geometryEvidence,
          materialEvidence,
          surfaceCoefficientEvidence: surfaceEvidence,
        }),
      );
      expect(result.value.screeningStatus).toMatchObject({
        kind: "available",
        value: expectedStatus,
        localFixedModelImplication: expectedImplication,
      });
      expect(JSON.stringify(result.value.screeningStatus)).not.toMatch(
        /"(?:pass|accepted|recommended)"\s*:/iu,
      );
    },
  );

  it("accepts a project-specific QA policy only when it is explicitly not used by I-04", () => {
    const result = successOf(
      input({
        usageEvidence: usage({
          qaThresholdPolicy: "project_specific_not_used_by_I04",
        }),
      }),
    );
    expect(result.value.planeWallComparison).toMatchObject({
      kind: "available",
      qaThresholdApplied: false,
      standardThresholdClaimed: false,
    });
  });

  it("keeps a requested nonlinear loss curve explicitly unavailable without inventing a child ID", () => {
    const result = successOf(
      input({ nonlinearLossCurveRequest: "requested" }),
    );
    expect(result.value.nonlinearLossCurve).toEqual({
      kind: "unavailable",
      outputId: "optional nonlinear loss curve",
      status: "insufficient_data",
      reason:
        "nonlinear curve requires an approved child contract and method ID",
      approvedChildMethodId: null,
    });
    const serialized = JSON.parse(
      JSON.stringify(result.value.nonlinearLossCurve),
    ) as Record<string, unknown>;
    expect("value" in serialized).toBe(false);
    expect("dimensionId" in serialized).toBe(false);
    expect("canonicalUnitId" in serialized).toBe(false);
  });

  it("marks an unrequested curve not_applicable on the fixed route", () => {
    const result = successOf(input());
    expect(result.value.nonlinearLossCurve).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
      approvedChildMethodId: null,
    });
  });

  it.each([
    [
      "radiation",
      material(),
      surfaceCoefficient({ radiationIncluded: true }),
      "available",
    ],
    [
      "variable h",
      material(),
      surfaceCoefficient({
        hModel: "variable_over_screening_domain",
      }),
      "available",
    ],
    [
      "variable k",
      material({
        conductivityModel: "variable_or_nonlinear",
        thermalConductivityWPerMK: null,
      }),
      surfaceCoefficient(),
      "unavailable",
    ],
  ])(
    "does not publish rcrit as exact for %s and requires the unavailable nonlinear child",
    (_label, materialEvidence, surfaceEvidence, expectedPlaneKind) => {
      const result = successOf(
        input({
          materialEvidence,
          surfaceCoefficientEvidence: surfaceEvidence,
        }),
      );
      expect(result.applicabilityStatus).toBe(
        "partial_outputs_nonlinear_route_unavailable",
      );
      expect(result.value.planeWallComparison.kind).toBe(
        expectedPlaneKind,
      );
      expect(result.value.criticalRadiusScreen).toMatchObject({
        kind: "unavailable",
        status: "not_applicable",
      });
      expect(result.value.screeningStatus).toMatchObject({
        kind: "unavailable",
        status: "not_applicable",
      });
      expect(result.value.nonlinearLossCurve).toMatchObject({
        kind: "unavailable",
        status: "insufficient_data",
        approvedChildMethodId: null,
      });
      const serialized = JSON.parse(
        JSON.stringify(result.value.criticalRadiusScreen),
      ) as Record<string, unknown>;
      expect(JSON.stringify(serialized)).not.toContain('"valueSi"');
      expect(JSON.stringify(serialized)).not.toContain('"canonicalUnitId"');
    },
  );

  it("keeps unconfirmed k/h evidence distinct from not_applicable and zero", () => {
    const result = successOf(
      input({
        materialEvidence: material({
          conductivityModel: "unconfirmed",
          thermalConductivityWPerMK: null,
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          sourceMethodId: null,
          sourceMethodVersion: null,
          coefficientStatus: "insufficient_data",
          heatTransferCoefficientWPerM2K: null,
          hModel: "unconfirmed",
          radiationIncluded: null,
        }),
      }),
    );
    expect(result.applicabilityStatus).toBe(
      "partial_outputs_model_evidence_insufficient",
    );
    expect(result.value.deltaOverRi.kind).toBe("available");
    expect(result.value.planeWallComparison).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.value.criticalRadiusScreen).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(JSON.stringify(result.value)).not.toMatch(
      /"valueSi":0(?:[,}])/u,
    );
  });

  it.each([
    [
      "exact-design treatment",
      usage({ criticalRadiusInterpretation: "exact_design_conclusion" }),
      "I-04.exact_design_use_not_applicable",
      I04_WARNING_PREDICATES.exactWithNonlinearPhysics,
    ],
    [
      "root-solve replacement",
      usage({ rootSolveRelation: "replaces_I01_or_I02" }),
      "I-04.root_solve_replacement_not_applicable",
      I04_WARNING_PREDICATES.replacesInsulationRootSolve,
    ],
    [
      "standard threshold claim",
      usage({ qaThresholdPolicy: "claimed_universal_or_standard" }),
      "I-04.standard_threshold_claim_not_applicable",
      I04_WARNING_PREDICATES.projectThresholdCalledStandard,
    ],
  ])(
    "fails closed for forbidden %s",
    (_label, usageEvidence, code, predicate) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({ usageEvidence }),
      );
      expect(result).toMatchObject({
        status: "not_applicable",
        applicabilityStatus: "out_of_domain",
        failure: { code, message: predicate },
      });
      expectFailureWithoutPayload(result);
    },
  );

  it.each([
    [
      "critical-radius use",
      usage({ criticalRadiusInterpretation: "unconfirmed" }),
    ],
    [
      "root-solve relation",
      usage({ rootSolveRelation: "unconfirmed" }),
    ],
    ["QA policy", usage({ qaThresholdPolicy: "unconfirmed" })],
  ])("returns insufficient_data for unconfirmed %s", (_label, usageEvidence) => {
    const result = evaluateI04CriticalRadiusScreening(
      input({ usageEvidence }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "I-04.model_scope_unconfirmed" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    [
      "case",
      material({ caseSnapshotId: `case:${"4".repeat(64)}` }),
      surfaceCoefficient(),
    ],
    [
      "geometry",
      material({
        geometrySnapshotId: `geometry:${"4".repeat(64)}`,
      }),
      surfaceCoefficient(),
    ],
    [
      "thermal state",
      material({ thermalStateId: "thermal-state:other:v1" }),
      surfaceCoefficient(),
    ],
    [
      "control volume",
      material(),
      surfaceCoefficient({ controlVolumeId: "control-volume:other:v1" }),
    ],
    [
      "boundary",
      material(),
      surfaceCoefficient({ boundaryId: "boundary:other:v1" }),
    ],
    [
      "surface",
      material(),
      surfaceCoefficient({ surfaceId: "surface:other:v1" }),
    ],
  ])(
    "rejects a %s snapshot/boundary mismatch",
    (_label, materialEvidence, surfaceEvidence) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({
          materialEvidence,
          surfaceCoefficientEvidence: surfaceEvidence,
        }),
      );
      expect(result).toMatchObject({
        status: "insufficient_data",
        failure: { code: "I-04.snapshot_binding_mismatch" },
      });
      expectFailureWithoutPayload(result);
    },
  );

  it("requires exact content-addressed snapshot prefixes and hashes", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          geometrySnapshotId: "geometry:not-a-hash",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "I-04.geometry_provenance_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("requires the exact frozen J-02 method version for an available h", () => {
    expect(I04_DEPENDENCY_METHOD_VERSIONS).toEqual({
      cylindricalConduction: {
        methodId: "J-01",
        methodVersion: "1.0.0-gate0",
      },
      convectionCoefficient: {
        methodId: "J-02",
        methodVersion: "1.0.0-gate0",
      },
    });
    const result = evaluateI04CriticalRadiusScreening(
      input({
        surfaceCoefficientEvidence: surfaceCoefficient({
          sourceMethodVersion: "0.9.0-stale",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "I-04.surface_dependency_version_invalid" },
    });
  });

  it("rejects a stale numeric h attached to unavailable dependency evidence", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        surfaceCoefficientEvidence: surfaceCoefficient({
          sourceMethodId: null,
          sourceMethodVersion: null,
          coefficientStatus: "insufficient_data",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.surface_coefficient_provenance_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("does not accept fixed-k confirmation with a missing value", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        materialEvidence: material({ thermalConductivityWPerMK: null }),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "I-04.material_value_invalid" },
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid inner radius %s",
    (innerRadiusM) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({ geometryEvidence: geometry({ innerRadiusM }) }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "I-04.geometry_value_invalid" },
      });
      expectFailureWithoutPayload(result);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid insulation thickness %s",
    (insulationThicknessM) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({ geometryEvidence: geometry({ insulationThicknessM }) }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "I-04.geometry_value_invalid" },
      });
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid conductivity %s",
    (thermalConductivityWPerMK) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({
          materialEvidence: material({ thermalConductivityWPerMK }),
        }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "I-04.material_value_invalid" },
      });
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid h %s",
    (heatTransferCoefficientWPerM2K) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({
          surfaceCoefficientEvidence: surfaceCoefficient({
            heatTransferCoefficientWPerM2K,
          }),
        }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "I-04.surface_coefficient_value_invalid" },
      });
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1])(
    "rejects invalid property temperature %s",
    (propertyTemperatureK) => {
      const result = evaluateI04CriticalRadiusScreening(
        input({ materialEvidence: material({ propertyTemperatureK }) }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "I-04.material_value_invalid" },
      });
    },
  );

  it("rejects finite outer-radius overflow", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: Number.MAX_VALUE,
          insulationThicknessM: Number.MAX_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.geometry_numeric_resolution_invalid" },
    });
  });

  it("rejects a positive thickness swallowed by outer-radius addition", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: Number.MAX_VALUE,
          insulationThicknessM: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.geometry_numeric_resolution_invalid" },
    });
  });

  it("rejects a positive inner radius swallowed by outer-radius addition", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: 1,
          insulationThicknessM: Number.MAX_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.geometry_numeric_resolution_invalid" },
    });
  });

  it("rejects delta/ri overflow", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: Number.MIN_VALUE,
          insulationThicknessM: Number.MAX_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.geometry_numeric_resolution_invalid" },
    });
  });

  it("rejects a positive plane-wall curvature difference swallowed at tiny delta/ri", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: 1.9999999999999998,
          insulationThicknessM: Number.EPSILON,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.plane_wall_numeric_resolution_invalid" },
    });
  });

  it("rejects finite k/h overflow", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        materialEvidence: material({
          thermalConductivityWPerMK: Number.MAX_VALUE,
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: Number.MIN_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "I-04.critical_radius_numeric_resolution_invalid",
      },
    });
  });

  it("rejects finite k/h underflow to a false zero", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        materialEvidence: material({
          thermalConductivityWPerMK: Number.MIN_VALUE,
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: Number.MAX_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "I-04.critical_radius_numeric_resolution_invalid",
      },
    });
  });

  it("rejects a positive critical radius swallowed in the raw radius gap", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        geometryEvidence: geometry({
          innerRadiusM: 4e307,
          insulationThicknessM: 4e307,
        }),
        materialEvidence: material({ thermalConductivityWPerMK: 1 }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "I-04.critical_radius_numeric_resolution_invalid",
      },
    });
  });

  it("fails closed at the positive-subnormal binary64 machine boundary", () => {
    expect(I04_BINARY64_MIN_POSITIVE_NORMAL).toBe(2 ** -1022);
    const result = evaluateI04CriticalRadiusScreening(
      input({
        materialEvidence: material({
          thermalConductivityWPerMK: Number.MIN_VALUE,
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: 1,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "I-04.critical_radius_numeric_resolution_invalid",
      },
    });
    expectFailureWithoutPayload(result);
  });

  it("also rejects a positive-subnormal fixed h at the machine boundary", () => {
    const result = evaluateI04CriticalRadiusScreening(
      input({
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: Number.MIN_VALUE,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: {
        code: "I-04.critical_radius_numeric_resolution_invalid",
      },
    });
    expectFailureWithoutPayload(result);
  });

  it("prioritizes a known nonlinear not_applicable route over unused subnormal fixed-model values", () => {
    const result = successOf(
      input({
        materialEvidence: material({
          thermalConductivityWPerMK: Number.MIN_VALUE,
          conductivityModel: "variable_or_nonlinear",
        }),
        surfaceCoefficientEvidence: surfaceCoefficient({
          heatTransferCoefficientWPerM2K: Number.MIN_VALUE,
          hModel: "variable_over_screening_domain",
          radiationIncluded: true,
        }),
      }),
    );
    expect(result.applicabilityStatus).toBe(
      "partial_outputs_nonlinear_route_unavailable",
    );
    expect(result.value.criticalRadiusScreen).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
  });

  it.each([
    [null],
    [undefined],
    [[]],
    [{ ...input(), extra: true }],
    [(() => {
      const candidate = input() as unknown as Record<string, unknown>;
      delete candidate.usageEvidence;
      return candidate;
    })()],
  ])("rejects a non-exact top-level input %#", (candidate) => {
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(result).toMatchObject({
      failure: { code: "I-04.input_schema_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects extra and missing nested fields", () => {
    const extra = input() as unknown as Record<string, unknown>;
    extra.geometryEvidence = { ...geometry(), extra: true };
    expect(failureOf(extra).failure.code).toBe(
      "I-04.geometry_schema_invalid",
    );

    const missing = input() as unknown as Record<string, unknown>;
    const missingMaterial = material() as unknown as Record<string, unknown>;
    delete missingMaterial.propertyStateId;
    missing.materialEvidence = missingMaterial;
    expect(failureOf(missing).failure.code).toBe(
      "I-04.material_schema_invalid",
    );
  });

  it("rejects symbol-keyed input", () => {
    const candidate = input() as unknown as Record<PropertyKey, unknown>;
    candidate[Symbol("extra")] = true;
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.input_schema_invalid" },
    });
  });

  it("does not execute a top-level getter", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, "geometryEvidence", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(executed).toBe(false);
    expectFailureWithoutPayload(result);
  });

  it("does not execute a nested numeric getter", () => {
    let executed = false;
    const candidate = input();
    Object.defineProperty(candidate.geometryEvidence, "innerRadiusM", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(executed).toBe(false);
    expectFailureWithoutPayload(result);
  });

  it("fails closed without throwing on hostile proxy reflection traps", () => {
    const candidate = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => evaluateI04CriticalRadiusScreening(candidate)).not.toThrow();
    expectFailureWithoutPayload(
      evaluateI04CriticalRadiusScreening(candidate),
    );
  });

  it("fails closed without throwing on a nested proxy descriptor trap", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.materialEvidence = new Proxy(material(), {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor");
      },
    });
    expect(() => evaluateI04CriticalRadiusScreening(candidate)).not.toThrow();
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(result).toMatchObject({
      failure: { code: "I-04.material_schema_invalid" },
    });
  });

  it("rejects a huge sparse array nested input quickly without throwing", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.surfaceCoefficientEvidence = new Array(0xffffffff);
    expect(() => evaluateI04CriticalRadiusScreening(candidate)).not.toThrow();
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.surface_coefficient_schema_invalid" },
    });
  });

  it("rejects coercible numeric objects without invoking valueOf", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.geometryEvidence = geometry({
      innerRadiusM: {
        valueOf() {
          executed = true;
          return 0.01;
        },
      } as unknown as number,
    });
    const result = evaluateI04CriticalRadiusScreening(candidate);
    expect(executed).toBe(false);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "I-04.geometry_value_invalid" },
    });
  });

  it("deep-freezes complete success, unavailable child, evidence, trace, assumptions, and mapping", () => {
    const result = successOf(
      input({ nonlinearLossCurveRequest: "requested" }),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.deltaOverRi)).toBe(true);
    expect(Object.isFrozen(result.value.planeWallComparison)).toBe(true);
    expect(Object.isFrozen(result.value.criticalRadiusScreen)).toBe(true);
    expect(Object.isFrozen(result.value.screeningStatus)).toBe(true);
    expect(Object.isFrozen(result.value.nonlinearLossCurve)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.evidence.geometry)).toBe(true);
    expect(Object.isFrozen(result.evidence.material)).toBe(true);
    expect(Object.isFrozen(result.evidence.surfaceCoefficient)).toBe(true);
    expect(Object.isFrozen(result.evidence.usage)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
    expect(Object.isFrozen(result.substitution.fixedModel)).toBe(true);
    expect(Object.isFrozen(result.identityChecks)).toBe(true);
    expect(Object.isFrozen(result.assumptions)).toBe(true);
    expect(Object.isFrozen(result.mapping)).toBe(true);
  });

  it("deep-freezes partial nonlinear/unavailable outputs", () => {
    const result = successOf(
      input({
        surfaceCoefficientEvidence: surfaceCoefficient({
          radiationIncluded: true,
        }),
      }),
    );
    expect(Object.isFrozen(result.value.criticalRadiusScreen)).toBe(true);
    expect(Object.isFrozen(result.value.screeningStatus)).toBe(true);
    expect(Object.isFrozen(result.value.nonlinearLossCurve)).toBe(true);
  });

  it("binds every failure to method/version/mapping and publishes no engineering payload", () => {
    const result = evaluateI04CriticalRadiusScreening(null);
    expect(result).toMatchObject({
      methodId: "I-04",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved_with_limitation",
      mapping: I04_CRITICAL_RADIUS_SCREENING_MAPPING,
      warningIds: [],
    });
    expectFailureWithoutPayload(result);
  });

  it("contains no frozen-out project QA threshold constants", () => {
    const source = readFileSync(
      new URL(
        "../../../src/methods/I/i04CriticalRadiusScreening.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/(?:^|[^\d])0\.2(?:[^\d]|$)/u);
    expect(source).not.toMatch(/(?:^|[^\d])0\.5(?:[^\d]|$)/u);
    expect(source).not.toContain("approvedChildMethodId: \"I-04");
  });
});
