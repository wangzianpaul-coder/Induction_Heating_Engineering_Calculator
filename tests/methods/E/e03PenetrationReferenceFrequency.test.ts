import { describe, expect, it } from "vitest";

import {
  E03_CRITERION_POLICY,
  E03_ENGINEERING_UNIT_COEFFICIENTS,
  E03_IMPLEMENTATION_READINESS,
  E03_M04_CONTROLLED_SOURCE,
  E03_METHOD_MAPPING,
  E03_SOURCE_UNIT_DISPOSITION,
  E03_VACUUM_PERMEABILITY_H_PER_M,
  E03_WARNING_PREDICATES,
  evaluateE03PenetrationReferenceFrequency,
  type E03ApplicabilityEvidence,
  type E03CalculationRoute,
  type E03E01SkinDepthEvidence,
  type E03GeometryEvidence,
  type E03PenetrationCriterionEvidence,
  type E03PenetrationReferenceFrequencyInput,
  type E03PenetrationReferenceFrequencyOutcome,
  type E03PenetrationReferenceFrequencySuccess,
  type E03PropertySnapshot,
  type E03TargetMaterialState,
} from "../../../src/methods/E/e03PenetrationReferenceFrequency.js";
import {
  fromCanonicalSI,
  toCanonicalSI,
} from "../../../src/units/index.js";

const GEOMETRY_SNAPSHOT_ID = `geometry:${"a".repeat(64)}`;
const OTHER_GEOMETRY_SNAPSHOT_ID = `geometry:${"c".repeat(64)}`;
const MATERIAL_SNAPSHOT_ID = `material:${"b".repeat(64)}`;
const OTHER_MATERIAL_SNAPSHOT_ID = `material:${"d".repeat(64)}`;

const BASE_DIAMETER_M = toCanonicalSI(12, "cm", "length");
const BASE_RESISTIVITY_OHM_M = toCanonicalSI(
  80,
  "microohm_cm",
  "electrical_resistivity",
);
const BASE_RELATIVE_PERMEABILITY = 40;
const BASE_FREQUENCY_HZ = 18_000;

function stableReferenceFrequency(
  diameterM: number,
  resistivityOhmM: number,
  relativePermeability: number,
): number {
  return Math.exp(
    Math.log(16) +
      Math.log(resistivityOhmM) -
      Math.log(Math.PI) -
      Math.log(E03_VACUUM_PERMEABILITY_H_PER_M) -
      Math.log(relativePermeability) -
      2 * Math.log(diameterM),
  );
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const BASE_REFERENCE_FREQUENCY_HZ = stableReferenceFrequency(
  BASE_DIAMETER_M,
  BASE_RESISTIVITY_OHM_M,
  BASE_RELATIVE_PERMEABILITY,
);

const BASE_TARGET_STATE = Object.freeze({
  materialId: "synthetic-project-material",
  materialRevision: "material-rev-1",
  materialSnapshotId: MATERIAL_SNAPSHOT_ID,
  materialStateId: "target-state-1",
  temperatureK: 1173.15,
  fieldStrengthApm: 1_200,
  frequencyHz: BASE_REFERENCE_FREQUENCY_HZ,
  phaseOrMicrostructureId: "synthetic-target-phase",
  statePurpose: "target_heating_state",
  stateConfirmation: "confirmed",
} as const satisfies E03TargetMaterialState);

const BASE_GEOMETRY = Object.freeze({
  contractParameterId: "workpiece.diameter",
  canonicalParameterId: "workpiece.outer_diameter",
  normalizedDiameterM: BASE_DIAMETER_M,
  dimensionId: "length",
  canonicalUnitId: "m",
  geometrySnapshotId: GEOMETRY_SNAPSHOT_ID,
  geometrySourceRef: "PROJECT-GEOMETRY:E03-SYNTHETIC",
  mappingStatus: "confirmed_same_solid_cylinder_snapshot",
  workpieceForm: "solid_cylinder",
} as const satisfies E03GeometryEvidence);

const BASE_RESISTIVITY = Object.freeze({
  contractParameterId: "rho_at_target_state",
  parameterId: "resistivity",
  propertyId: "electrical_resistivity",
  valueSi: BASE_RESISTIVITY_OHM_M,
  dimensionId: "electrical_resistivity",
  canonicalUnitId: "ohm_m",
  materialId: BASE_TARGET_STATE.materialId,
  materialRevision: BASE_TARGET_STATE.materialRevision,
  propertyRevision: "rho-rev-1",
  materialSnapshotId: BASE_TARGET_STATE.materialSnapshotId,
  materialStateId: BASE_TARGET_STATE.materialStateId,
  temperatureK: BASE_TARGET_STATE.temperatureK,
  fieldStrengthApm: BASE_TARGET_STATE.fieldStrengthApm,
  frequencyHz: BASE_TARGET_STATE.frequencyHz,
  phaseOrMicrostructureId: BASE_TARGET_STATE.phaseOrMicrostructureId,
  sourceRef: "PROJECT-MATERIAL:E03-RHO-SYNTHETIC",
  dataQuality: "project_specific",
  stateMatch: "confirmed_for_target_state",
} as const satisfies E03PropertySnapshot);

const BASE_PERMEABILITY = Object.freeze({
  contractParameterId: "mu_r_at_target_state",
  parameterId: "relative_permeability",
  propertyId: "relative_permeability",
  valueSi: BASE_RELATIVE_PERMEABILITY,
  dimensionId: "dimensionless",
  canonicalUnitId: "one",
  materialId: BASE_TARGET_STATE.materialId,
  materialRevision: BASE_TARGET_STATE.materialRevision,
  propertyRevision: "mu-r-rev-1",
  materialSnapshotId: BASE_TARGET_STATE.materialSnapshotId,
  materialStateId: BASE_TARGET_STATE.materialStateId,
  temperatureK: BASE_TARGET_STATE.temperatureK,
  fieldStrengthApm: BASE_TARGET_STATE.fieldStrengthApm,
  frequencyHz: BASE_TARGET_STATE.frequencyHz,
  phaseOrMicrostructureId: BASE_TARGET_STATE.phaseOrMicrostructureId,
  sourceRef: "PROJECT-MATERIAL:E03-MUR-SYNTHETIC",
  dataQuality: "project_specific",
  stateMatch: "confirmed_for_target_state",
} as const satisfies E03PropertySnapshot);

const BASE_APPLICABILITY = Object.freeze({
  workpieceForm: "solid_cylinder",
  materialClass: "ferromagnetic",
  materialHomogeneity: "homogeneous",
  materialIsotropy: "isotropic",
  constitutiveRegime: "effective_linear_good_conductor",
  propertyStateUse: "confirmed_target_state",
  intendedInterpretation: "reference_relation_not_optimum",
} as const satisfies E03ApplicabilityEvidence);

function rawE01SkinDepth(
  resistivityOhmM: number,
  relativePermeability: number,
  frequencyHz: number,
): number {
  const absolutePermeability =
    E03_VACUUM_PERMEABILITY_H_PER_M * relativePermeability;
  return Math.sqrt(
    resistivityOhmM /
      (Math.PI * frequencyHz * absolutePermeability),
  );
}

type InputOverrides = Partial<
  Omit<
    E03PenetrationReferenceFrequencyInput,
    | "geometryEvidence"
    | "targetState"
    | "resistivitySnapshot"
    | "relativePermeabilitySnapshot"
    | "penetrationCriterion"
    | "skinDepthEvidence"
    | "applicability"
  >
> & {
  readonly geometryEvidence?: Partial<E03GeometryEvidence>;
  readonly targetState?: Partial<E03TargetMaterialState>;
  readonly resistivitySnapshot?: Partial<E03PropertySnapshot>;
  readonly relativePermeabilitySnapshot?: Partial<E03PropertySnapshot>;
  readonly penetrationCriterion?: Partial<E03PenetrationCriterionEvidence>;
  readonly skinDepthEvidence?: Partial<E03E01SkinDepthEvidence> | null;
  readonly applicability?: Partial<E03ApplicabilityEvidence>;
};

function input(
  overrides: InputOverrides = {},
): E03PenetrationReferenceFrequencyInput {
  const route: E03CalculationRoute =
    overrides.route ?? "reference_frequency_for_historical_pi_d_2";
  const diameterM = overrides.diameterM ?? BASE_DIAMETER_M;
  const resistivityOhmM =
    overrides.resistivitySnapshot?.valueSi ?? BASE_RESISTIVITY_OHM_M;
  const relativePermeability =
    overrides.relativePermeabilitySnapshot?.valueSi ??
    BASE_RELATIVE_PERMEABILITY;
  const dependencyFrequencyHz =
    overrides.skinDepthEvidence === null
      ? BASE_FREQUENCY_HZ
      : (overrides.skinDepthEvidence?.frequencyHz ?? BASE_FREQUENCY_HZ);
  const candidateReferenceFrequencyHz =
    isFinitePositiveNumber(diameterM) &&
    isFinitePositiveNumber(resistivityOhmM) &&
    isFinitePositiveNumber(relativePermeability)
      ? stableReferenceFrequency(
          diameterM,
          resistivityOhmM,
          relativePermeability,
        )
      : BASE_REFERENCE_FREQUENCY_HZ;
  const defaultPropertyFrequencyHz =
    route === "penetration_parameter_from_e01_depth"
      ? dependencyFrequencyHz
      : isFinitePositiveNumber(candidateReferenceFrequencyHz)
        ? candidateReferenceFrequencyHz
        : BASE_REFERENCE_FREQUENCY_HZ;
  const targetState = {
    ...BASE_TARGET_STATE,
    frequencyHz: defaultPropertyFrequencyHz,
    ...overrides.targetState,
  };
  const applicability = {
    ...BASE_APPLICABILITY,
    ...overrides.applicability,
  };
  const geometryEvidence = {
    ...BASE_GEOMETRY,
    normalizedDiameterM: diameterM,
    workpieceForm: applicability.workpieceForm,
    ...overrides.geometryEvidence,
  };
  const resistivitySnapshot = {
    ...BASE_RESISTIVITY,
    materialId: targetState.materialId,
    materialRevision: targetState.materialRevision,
    materialSnapshotId: targetState.materialSnapshotId,
    materialStateId: targetState.materialStateId,
    temperatureK: targetState.temperatureK,
    fieldStrengthApm: targetState.fieldStrengthApm,
    frequencyHz: targetState.frequencyHz,
    phaseOrMicrostructureId: targetState.phaseOrMicrostructureId,
    ...overrides.resistivitySnapshot,
  };
  const relativePermeabilitySnapshot = {
    ...BASE_PERMEABILITY,
    materialId: targetState.materialId,
    materialRevision: targetState.materialRevision,
    materialSnapshotId: targetState.materialSnapshotId,
    materialStateId: targetState.materialStateId,
    temperatureK: targetState.temperatureK,
    fieldStrengthApm: targetState.fieldStrengthApm,
    frequencyHz: targetState.frequencyHz,
    phaseOrMicrostructureId: targetState.phaseOrMicrostructureId,
    ...overrides.relativePermeabilitySnapshot,
  };
  const defaultCriterion =
    route === "reference_frequency_for_historical_pi_d_2"
      ? {
          contractParameterId: "penetration_criterion" as const,
          selection: "historical_pi_d_equals_2" as const,
          valueSi: 2 as const,
          dimensionId: "dimensionless" as const,
          canonicalUnitId: "one" as const,
          explicitlySelected: true,
          sourceRef: "M04:PDF2-3:PRINT72-73:eq1-5" as const,
        }
      : {
          contractParameterId: "penetration_criterion" as const,
          selection: "not_used_penetration_parameter_route" as const,
          valueSi: null,
          dimensionId: "dimensionless" as const,
          canonicalUnitId: "one" as const,
          explicitlySelected: true,
          sourceRef: null,
        };
  const penetrationCriterion = {
    ...defaultCriterion,
    ...overrides.penetrationCriterion,
  } as E03PenetrationCriterionEvidence;

  const baseSkinDepthEvidence = {
    sourceMethodId: "E-01",
    sourceMethodVersion: "1.0.0-gate0",
    sourceOutcome: "success",
    sourceResultId: "e01-synthetic-result-1",
    skinDepthM: rawE01SkinDepth(
      resistivitySnapshot.valueSi,
      relativePermeabilitySnapshot.valueSi,
      dependencyFrequencyHz,
    ),
    frequencyHz: dependencyFrequencyHz,
    interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
    isThermalAffectedDepth: false,
    materialSnapshotId: targetState.materialSnapshotId,
    materialStateId: targetState.materialStateId,
    temperatureK: targetState.temperatureK,
    fieldStrengthApm: targetState.fieldStrengthApm,
    phaseOrMicrostructureId: targetState.phaseOrMicrostructureId,
    geometrySnapshotId: geometryEvidence.geometrySnapshotId,
    resistivityOhmM: resistivitySnapshot.valueSi,
    relativePermeability: relativePermeabilitySnapshot.valueSi,
    stateMappingStatus: "confirmed_same_target_and_geometry_snapshots",
  } as const satisfies E03E01SkinDepthEvidence;

  let skinDepthEvidence: E03E01SkinDepthEvidence | null;
  if (Object.hasOwn(overrides, "skinDepthEvidence")) {
    skinDepthEvidence =
      overrides.skinDepthEvidence === null
        ? null
        : ({
            ...baseSkinDepthEvidence,
            ...overrides.skinDepthEvidence,
          } as E03E01SkinDepthEvidence);
  } else {
    skinDepthEvidence =
      route === "penetration_parameter_from_e01_depth"
        ? baseSkinDepthEvidence
        : null;
  }

  return {
    route,
    diameterM,
    geometryEvidence: geometryEvidence as E03GeometryEvidence,
    targetState: targetState as E03TargetMaterialState,
    resistivitySnapshot: resistivitySnapshot as E03PropertySnapshot,
    relativePermeabilitySnapshot:
      relativePermeabilitySnapshot as E03PropertySnapshot,
    penetrationCriterion,
    skinDepthEvidence,
    applicability: applicability as E03ApplicabilityEvidence,
  };
}

function successful(
  candidate: unknown,
): E03PenetrationReferenceFrequencySuccess {
  const result = evaluateE03PenetrationReferenceFrequency(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    return result;
  }
  if (result.failure !== undefined) {
    throw new Error(
      `Expected E-03 success, received ${result.status}: ${result.failure.message}`,
    );
  }
  throw new Error(`Expected E-03 success, received ${result.status}.`);
}

function expectFailure(
  result: E03PenetrationReferenceFrequencyOutcome,
  status:
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable",
  code?: string,
): void {
  expect(result.status).toBe(status);
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  if (
    code !== undefined &&
    result.status !== "success" &&
    result.status !== "success_with_warnings" &&
    result.failure !== undefined
  ) {
    expect(result.failure.code).toBe(code);
  }
}

function expectTolId(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    1e-12 * Math.max(1, Math.abs(expected)),
  );
}

describe("E-03 penetration parameter and reference frequency", () => {
  it("remains isolated from the runtime public API", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateE03PenetrationReferenceFrequency" in publicApi).toBe(
      false,
    );
    expect("E03_METHOD_MAPPING" in publicApi).toBe(false);
  });

  it("maps exactly to the frozen registry, M04, ID-EM-01, DER-EM, and EM-F-001", () => {
    expect(E03_METHOD_MAPPING).toEqual({
      methodId: "E-03",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved_with_limitation",
      equationRef: "CALCULATION_CONTRACTS.md#E-03:Equation",
      sourceRefs: ["M04:PDF2-3:eq1-5", "ID-EM-01", "CODATA22"],
      contractSourceRefs: [
        "M04:PDF2-3:PRINT72-73:eq1-5",
        "ID-EM-01",
        "DER-EM",
      ],
      derivationRefs: ["ID-EM-01", "DER-EM"],
      validationCaseIds: [],
      methodCheckIds: ["EM-F-001"],
      inputParameterIds: [
        "workpiece.diameter",
        "rho_at_target_state",
        "mu_r_at_target_state",
        "penetration_criterion",
      ],
      outputQuantityIds: ["Pi_D", "fref"],
      warningPredicates: [
        "ohm-centimetre and microohm-centimetre constants are mixed",
        "thin-wall workpiece",
        "cold properties are used for the hot state",
        "result is labelled recommended or optimum without process optimization",
      ],
      stableWarningIds: [],
    });
    expect(Object.values(E03_WARNING_PREDICATES)).toEqual(
      E03_METHOD_MAPPING.warningPredicates,
    );
    expect(E03_M04_CONTROLLED_SOURCE).toEqual({
      sourceId: "M04",
      relativePath:
        "references/project_uploads/电源频率和功率在透热感应加热中的选择_马建平.pdf",
      sha256:
        "441b880074454c5a06da76c1ea8f599ea923e55c668a48d636cb5ef6264dfdcb",
      location: "PDF2-3:PRINT72-73:eq1-5",
    });
    expect(E03_VACUUM_PERMEABILITY_H_PER_M).toBe(1.25663706127e-6);
  });

  it("records the explicit criterion and non-activation policies without inventing warning IDs", () => {
    expect(E03_CRITERION_POLICY).toEqual({
      frozenCriterion: 2,
      meaning: "Pi_D=D/(2*delta)=2",
      selectionPolicy: "explicit_selection_required_no_runtime_default",
      otherCriteria: "not_implemented_without_separate_approval",
    });
    expect(E03_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        { gateId: "E-03.stable-warning-ids" },
        { gateId: "E-03.parameter-id-mapping-closure" },
        { gateId: "E-03.frequency-state-orchestration" },
      ],
      penetrationParameterRoute: {
        contractDependency: "E-01",
        evidencePolicy:
          "require_successful_same_snapshot_e01_depth_no_hidden_frequency_or_depth",
      },
    });
    expect(E03_SOURCE_UNIT_DISPOSITION).toMatchObject({
      implementationRoute:
        "canonical_si_only_engineering_units_are_identity_wrappers",
      printedRoundedCoefficientsUsedForCalculation: false,
    });
    expect(E03_METHOD_MAPPING.stableWarningIds).toEqual([]);
  });

  it("evaluates the frozen Pi_D=2 reference-frequency relation in canonical SI", () => {
    const result = successful(input());
    const expected =
      (16 * BASE_RESISTIVITY_OHM_M) /
      (Math.PI *
        E03_VACUUM_PERMEABILITY_H_PER_M *
        BASE_RELATIVE_PERMEABILITY *
        BASE_DIAMETER_M ** 2);

    expect(result.status).toBe("success");
    expect(result.value.route).toBe(
      "reference_frequency_for_historical_pi_d_2",
    );
    if (
      result.value.route !==
      "reference_frequency_for_historical_pi_d_2"
    ) {
      throw new Error("Expected reference-frequency route.");
    }
    expectTolId(result.value.referenceFrequency.valueSi, expected);
    expect(result.evidence.targetState.frequencyHz).toBe(
      result.value.referenceFrequency.valueSi,
    );
    expect(result.evidence.resistivitySnapshot.frequencyHz).toBe(
      result.value.referenceFrequency.valueSi,
    );
    expect(result.evidence.relativePermeabilitySnapshot.frequencyHz).toBe(
      result.value.referenceFrequency.valueSi,
    );
    expect(result.value.referenceFrequency.canonicalUnitId).toBe("Hz");
    expect(result.value.penetrationParameter.valueSi).toBe(2);
    expectTolId(
      result.value.skinDepth.valueSi,
      BASE_DIAMETER_M / 4,
    );
    expect(result.value.referenceFrequency.isRecommendedFrequency).toBe(
      false,
    );
    expect(result.value.referenceFrequency.isOptimumFrequency).toBe(false);
    expect(result.value.penetrationParameter.isOptimumCriterion).toBe(false);
    expect(result.warningIds).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
  });

  it("passes EM-F-001 through exact engineering-unit wrappers derived from SI", () => {
    const result = successful(input());
    if (
      result.evidence.route !==
      "reference_frequency_for_historical_pi_d_2" ||
      result.value.route !==
        "reference_frequency_for_historical_pi_d_2"
    ) {
      throw new Error("Expected reference-frequency evidence.");
    }
    const rhoOhmCm = fromCanonicalSI(
      BASE_RESISTIVITY_OHM_M,
      "ohm_cm",
      "electrical_resistivity",
    );
    const rhoMicroOhmCm = fromCanonicalSI(
      BASE_RESISTIVITY_OHM_M,
      "microohm_cm",
      "electrical_resistivity",
    );
    const diameterCm = fromCanonicalSI(
      BASE_DIAMETER_M,
      "cm",
      "length",
    );
    const fromOhmCm =
      (E03_ENGINEERING_UNIT_COEFFICIENTS.ohmCentimetreForPiDEquals2 *
        rhoOhmCm) /
      (BASE_RELATIVE_PERMEABILITY * diameterCm ** 2);
    const fromMicroOhmCm =
      (E03_ENGINEERING_UNIT_COEFFICIENTS.microOhmCentimetreForPiDEquals2 *
        rhoMicroOhmCm) /
      (BASE_RELATIVE_PERMEABILITY * diameterCm ** 2);

    expectTolId(
      result.evidence.engineeringUnitWrappers.ohmCentimetreFrequencyHz,
      result.value.referenceFrequency.valueSi,
    );
    expectTolId(
      result.evidence.engineeringUnitWrappers
        .microOhmCentimetreFrequencyHz,
      result.value.referenceFrequency.valueSi,
    );
    expectTolId(fromOhmCm, result.value.referenceFrequency.valueSi);
    expectTolId(fromMicroOhmCm, result.value.referenceFrequency.valueSi);
    expect(
      result.evidence.engineeringUnitWrappers
        .printedRoundedCoefficientsUsedForCalculation,
    ).toBe(false);
    expect(
      E03_ENGINEERING_UNIT_COEFFICIENTS.ohmCentimetreForPiDEquals2,
    ).toBe(
      E03_ENGINEERING_UNIT_COEFFICIENTS.siForPiDEquals2 * 100,
    );
    expect(
      E03_ENGINEERING_UNIT_COEFFICIENTS.microOhmCentimetreForPiDEquals2,
    ).toBe(
      E03_ENGINEERING_UNIT_COEFFICIENTS.siForPiDEquals2 / 10_000,
    );
    expect(
      E03_ENGINEERING_UNIT_COEFFICIENTS.printedApproximateOhmCentimetre,
    ).toBe(4.05285e8);
    expect(
      E03_ENGINEERING_UNIT_COEFFICIENTS.printedApproximateMicroOhmCentimetre,
    ).toBe(405.285);
    expect(
      result.evidence.identities.every(
        (identity) =>
          identity.toleranceId === "TOL-ID" &&
          identity.tolerancePurpose === "synthetic_identity_only" &&
          identity.passed,
      ),
    ).toBe(true);
  });

  it("obeys rho, mu_r, and inverse-square diameter scaling", () => {
    const base = successful(input());
    const rhoScaled = successful(
      input({
        resistivitySnapshot: {
          valueSi: BASE_RESISTIVITY_OHM_M * 4,
        },
      }),
    );
    const permeabilityScaled = successful(
      input({
        relativePermeabilitySnapshot: {
          valueSi: BASE_RELATIVE_PERMEABILITY * 4,
        },
      }),
    );
    const diameterScaled = successful(
      input({ diameterM: BASE_DIAMETER_M * 2 }),
    );
    if (
      base.value.route !==
        "reference_frequency_for_historical_pi_d_2" ||
      rhoScaled.value.route !==
        "reference_frequency_for_historical_pi_d_2" ||
      permeabilityScaled.value.route !==
        "reference_frequency_for_historical_pi_d_2" ||
      diameterScaled.value.route !==
        "reference_frequency_for_historical_pi_d_2"
    ) {
      throw new Error("Expected reference-frequency results.");
    }
    expectTolId(
      rhoScaled.value.referenceFrequency.valueSi /
        base.value.referenceFrequency.valueSi,
      4,
    );
    expectTolId(
      permeabilityScaled.value.referenceFrequency.valueSi /
        base.value.referenceFrequency.valueSi,
      0.25,
    );
    expectTolId(
      diameterScaled.value.referenceFrequency.valueSi /
        base.value.referenceFrequency.valueSi,
      0.25,
    );
    expectTolId(
      diameterScaled.value.skinDepth.valueSi /
        base.value.skinDepth.valueSi,
      2,
    );
  });

  it("computes Pi_D only from successful same-snapshot E-01 depth evidence", () => {
    const candidate = input({
      route: "penetration_parameter_from_e01_depth",
    });
    const result = successful(candidate);
    if (
      result.value.route !== "penetration_parameter_from_e01_depth" ||
      result.evidence.route !== "penetration_parameter_from_e01_depth"
    ) {
      throw new Error("Expected penetration-parameter route.");
    }
    const skinDepth = rawE01SkinDepth(
      BASE_RESISTIVITY_OHM_M,
      BASE_RELATIVE_PERMEABILITY,
      BASE_FREQUENCY_HZ,
    );
    expectTolId(
      result.value.penetrationParameter.valueSi,
      BASE_DIAMETER_M / (2 * skinDepth),
    );
    expect(result.value.skinDepth.valueSi).toBe(skinDepth);
    expect(result.value.frequencyHz).toBe(BASE_FREQUENCY_HZ);
    expect("referenceFrequency" in result.value).toBe(false);
    expect(result.evidence.skinDepthEvidence.sourceMethodId).toBe("E-01");
    expect(result.evidence.skinDepthEvidence.sourceMethodVersion).toBe(
      "1.0.0-gate0",
    );
    expect(result.evidence.engineeringUnitWrappers).toBeUndefined();
  });

  it("preserves the Pi_D diameter and square-root frequency analytical scalings", () => {
    const base = successful(
      input({ route: "penetration_parameter_from_e01_depth" }),
    );
    const diameterScaled = successful(
      input({
        route: "penetration_parameter_from_e01_depth",
        diameterM: BASE_DIAMETER_M * 2,
      }),
    );
    const frequency = BASE_FREQUENCY_HZ * 4;
    const frequencyScaled = successful(
      input({
        route: "penetration_parameter_from_e01_depth",
        skinDepthEvidence: {
          frequencyHz: frequency,
          skinDepthM: rawE01SkinDepth(
            BASE_RESISTIVITY_OHM_M,
            BASE_RELATIVE_PERMEABILITY,
            frequency,
          ),
        },
      }),
    );
    if (
      base.value.route !== "penetration_parameter_from_e01_depth" ||
      diameterScaled.value.route !==
        "penetration_parameter_from_e01_depth" ||
      frequencyScaled.value.route !==
        "penetration_parameter_from_e01_depth"
    ) {
      throw new Error("Expected penetration-parameter results.");
    }
    expectTolId(
      diameterScaled.value.penetrationParameter.valueSi /
        base.value.penetrationParameter.valueSi,
      2,
    );
    expectTolId(
      frequencyScaled.value.penetrationParameter.valueSi /
        base.value.penetrationParameter.valueSi,
      2,
    );
  });

  it("retains exact material-state, property, and geometry provenance", () => {
    const result = successful(input());
    expect(result.evidence.geometry).toEqual(BASE_GEOMETRY);
    expect(result.evidence.targetState).toEqual(BASE_TARGET_STATE);
    expect(result.evidence.resistivitySnapshot).toEqual(BASE_RESISTIVITY);
    expect(result.evidence.relativePermeabilitySnapshot).toEqual(
      BASE_PERMEABILITY,
    );
    expect(result.evidence.units).toEqual({
      diameter: "m",
      skinDepth: "m",
      resistivity: "ohm_m",
      relativePermeability: "one",
      penetrationParameter: "one",
      referenceFrequency: "Hz",
      dimensionalIdentity: "(ohm*m)/((H/m)*m^2)=1/s=Hz",
    });
    expect(JSON.stringify(result.value)).not.toMatch(
      /recommendedMethod|bestFrequency|optimalFrequency/u,
    );
  });

  it("does not inject the nominal criterion when penetration_criterion is omitted", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    const { penetrationCriterion: _omitted, ...withoutCriterion } =
      candidate;
    const result = evaluateE03PenetrationReferenceFrequency(
      withoutCriterion,
    );
    expectFailure(
      result,
      "insufficient_data",
      "E-03.penetration_criterion_missing",
    );
  });

  it("fails closed for unconfirmed, implicit, arbitrary, or route-conflicting criteria", () => {
    const cases: readonly [unknown, string, string][] = [
      [
        input({
          penetrationCriterion: {
            selection: "unconfirmed",
            valueSi: null,
            explicitlySelected: false,
            sourceRef: null,
          },
        }),
        "insufficient_data",
        "E-03.penetration_criterion_unconfirmed",
      ],
      [
        input({
          penetrationCriterion: { explicitlySelected: false },
        }),
        "not_applicable",
        "E-03.penetration_criterion_not_approved",
      ],
      [
        input({
          penetrationCriterion: {
            valueSi: 3 as unknown as 2,
          },
        }),
        "invalid_input",
        "E-03.penetration_criterion_invalid",
      ],
      [
        input({
          route: "penetration_parameter_from_e01_depth",
          penetrationCriterion: {
            selection: "historical_pi_d_equals_2",
            valueSi: 2,
            sourceRef: "M04:PDF2-3:PRINT72-73:eq1-5",
          },
        }),
        "invalid_input",
        "E-03.penetration_criterion_invalid",
      ],
    ];
    for (const [candidate, status, code] of cases) {
      expectFailure(
        evaluateE03PenetrationReferenceFrequency(candidate),
        status as "invalid_input" | "insufficient_data" | "not_applicable",
        code,
      );
    }
  });

  it("requires E-01 depth only on the Pi_D route", () => {
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(
        input({
          route: "penetration_parameter_from_e01_depth",
          skinDepthEvidence: null,
        }),
      ),
      "insufficient_data",
      "E-03.skin_depth_evidence_missing",
    );
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(
        input({
          skinDepthEvidence: {
            sourceMethodId: "E-01",
          },
        }),
      ),
      "invalid_input",
      "E-03.skin_depth_route_conflict",
    );
  });

  it("rejects a top-level diameter not bound to the declared geometry snapshot", () => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        geometryEvidence: {
          normalizedDiameterM: BASE_DIAMETER_M * 1.01,
        },
      }),
    );
    expectFailure(
      result,
      "invalid_input",
      "E-03.geometry_snapshot_value_mismatch",
    );
  });

  it.each([
    ["material ID", { materialId: "different-material" }],
    ["material revision", { materialRevision: "other-revision" }],
    ["material snapshot", { materialSnapshotId: OTHER_MATERIAL_SNAPSHOT_ID }],
    ["material state", { materialStateId: "other-state" }],
    ["temperature", { temperatureK: 1183.15 }],
    ["field", { fieldStrengthApm: 1_300 }],
    ["frequency", { frequencyHz: BASE_REFERENCE_FREQUENCY_HZ * 1.01 }],
    ["phase", { phaseOrMicrostructureId: "other-phase" }],
  ] satisfies ReadonlyArray<
    readonly [string, Partial<E03PropertySnapshot>]
  >)("rejects %s mismatch between property and target snapshots", (_name, mismatch) => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({ resistivitySnapshot: mismatch }),
    );
    expectFailure(
      result,
      "insufficient_data",
      "E-03.property_state_mismatch",
    );
  });

  it.each([
    ["material snapshot", { materialSnapshotId: OTHER_MATERIAL_SNAPSHOT_ID }],
    ["material state", { materialStateId: "other-state" }],
    ["temperature", { temperatureK: 1183.15 }],
    ["field", { fieldStrengthApm: 1_300 }],
    ["phase", { phaseOrMicrostructureId: "other-phase" }],
    ["geometry snapshot", { geometrySnapshotId: OTHER_GEOMETRY_SNAPSHOT_ID }],
    ["resistivity", { resistivityOhmM: BASE_RESISTIVITY_OHM_M * 2 }],
    ["relative permeability", { relativePermeability: 41 }],
  ] satisfies ReadonlyArray<
    readonly [string, Partial<E03E01SkinDepthEvidence>]
  >)("rejects E-01 depth with mismatched %s binding", (_name, mismatch) => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        route: "penetration_parameter_from_e01_depth",
        skinDepthEvidence: mismatch,
      }),
    );
    expectFailure(
      result,
      "invalid_input",
      "E-03.skin_depth_state_mismatch",
    );
  });

  it("requires Pi_D property point-frequency state to match the E-01 frequency", () => {
    const dependencyFrequencyHz = BASE_FREQUENCY_HZ * 2;
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        route: "penetration_parameter_from_e01_depth",
        targetState: { frequencyHz: BASE_FREQUENCY_HZ },
        skinDepthEvidence: {
          frequencyHz: dependencyFrequencyHz,
          skinDepthM: rawE01SkinDepth(
            BASE_RESISTIVITY_OHM_M,
            BASE_RELATIVE_PERMEABILITY,
            dependencyFrequencyHz,
          ),
        },
      }),
    );
    expectFailure(
      result,
      "invalid_input",
      "E-03.skin_depth_state_mismatch",
    );
  });

  it("fails closed when f_ref differs from the A-01 point-frequency state", () => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        targetState: { frequencyHz: BASE_REFERENCE_FREQUENCY_HZ * 2 },
      }),
    );
    expectFailure(
      result,
      "insufficient_data",
      "E-03.property_frequency_state_mismatch",
    );
  });

  it("requires the exact unmodified E-01 binary64 depth", () => {
    const exact = rawE01SkinDepth(
      BASE_RESISTIVITY_OHM_M,
      BASE_RELATIVE_PERMEABILITY,
      BASE_FREQUENCY_HZ,
    );
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        route: "penetration_parameter_from_e01_depth",
        skinDepthEvidence: { skinDepthM: exact * (1 + 1e-12) },
      }),
    );
    expectFailure(
      result,
      "invalid_input",
      "E-03.skin_depth_evidence_invalid",
    );
  });

  it("routes thin-wall, hollow, nonlinear, cold-property, and optimum-label cases without values", () => {
    const cases: readonly [
      E03PenetrationReferenceFrequencyInput,
      "not_applicable" | "insufficient_data",
      string,
      string | null,
    ][] = [
      [
        input({ applicability: { workpieceForm: "thin_wall_tube" } }),
        "not_applicable",
        "E-03.thin_wall_not_applicable",
        E03_WARNING_PREDICATES.thinWallWorkpiece,
      ],
      [
        input({
          applicability: { workpieceForm: "other_hollow_or_non_solid" },
        }),
        "not_applicable",
        "E-03.method_regime_not_applicable",
        null,
      ],
      [
        input({
          applicability: { constitutiveRegime: "nonlinear_or_unresolved" },
        }),
        "not_applicable",
        "E-03.method_regime_not_applicable",
        null,
      ],
      [
        input({
          applicability: {
            propertyStateUse: "cold_properties_for_hot_target",
          },
        }),
        "insufficient_data",
        "E-03.target_property_state_unconfirmed",
        E03_WARNING_PREDICATES.coldPropertiesForHotState,
      ],
      [
        input({
          applicability: {
            intendedInterpretation:
              "recommended_or_optimum_without_process_optimization",
          },
        }),
        "not_applicable",
        "E-03.optimum_interpretation_not_applicable",
        E03_WARNING_PREDICATES.optimumOrRecommendedLabel,
      ],
    ];
    for (const [candidate, status, code, predicate] of cases) {
      const result = evaluateE03PenetrationReferenceFrequency(candidate);
      expectFailure(result, status, code);
      if (predicate !== null) {
        expect(result.warnings.map((item) => item.predicate)).toContain(
          predicate,
        );
      }
      expect(result.warningIds).toEqual([]);
    }
  });

  it("prioritizes known out-of-domain and cold-state evidence over unrelated unknown predicates", () => {
    const cases: readonly [
      string,
      E03PenetrationReferenceFrequencyInput,
      "not_applicable" | "insufficient_data",
      string,
    ][] = [
      [
        "thin geometry plus unknown material homogeneity",
        input({
          applicability: {
            workpieceForm: "thin_wall_tube",
            materialHomogeneity: "unknown",
          },
        }),
        "not_applicable",
        "E-03.thin_wall_not_applicable",
      ],
      [
        "known nonlinear regime plus unknown isotropy",
        input({
          applicability: {
            materialIsotropy: "unknown",
            constitutiveRegime: "nonlinear_or_unresolved",
          },
        }),
        "not_applicable",
        "E-03.method_regime_not_applicable",
      ],
      [
        "known optimum-label misuse plus unknown material class",
        input({
          applicability: {
            materialClass: "other_or_unknown",
            intendedInterpretation:
              "recommended_or_optimum_without_process_optimization",
          },
        }),
        "not_applicable",
        "E-03.optimum_interpretation_not_applicable",
      ],
      [
        "known cold-state mismatch plus unknown material class",
        input({
          applicability: {
            materialClass: "other_or_unknown",
            propertyStateUse: "cold_properties_for_hot_target",
          },
        }),
        "insufficient_data",
        "E-03.target_property_state_unconfirmed",
      ],
      [
        "remaining unknown material class",
        input({
          applicability: { materialClass: "other_or_unknown" },
        }),
        "insufficient_data",
        "E-03.applicability_unconfirmed",
      ],
    ];
    for (const [_name, candidate, status, code] of cases) {
      expectFailure(
        evaluateE03PenetrationReferenceFrequency(candidate),
        status,
        code,
      );
    }
  });

  it("rejects engineering-unit resistivity at the canonical core boundary with controlled prose", () => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({
        resistivitySnapshot: {
          canonicalUnitId: "microohm_cm" as unknown as "ohm_m",
        },
      }),
    );
    expectFailure(
      result,
      "invalid_input",
      "E-03.property_snapshot_invalid",
    );
    expect(result.warnings.map((item) => item.predicate)).toEqual([
      E03_WARNING_PREDICATES.unitConstantMix,
    ]);
  });

  it("fails closed for unconfirmed property quality and target state", () => {
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(
        input({ resistivitySnapshot: { dataQuality: "unknown" } }),
      ),
      "insufficient_data",
      "E-03.property_provenance_insufficient",
    );
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(
        input({ targetState: { stateConfirmation: "unconfirmed" } }),
      ),
      "insufficient_data",
      "E-03.target_state_unconfirmed",
    );
  });

  it("requires an explicit field state for ferromagnetic effective permeability", () => {
    const result = evaluateE03PenetrationReferenceFrequency(
      input({ targetState: { fieldStrengthApm: null } }),
    );
    expectFailure(
      result,
      "insufficient_data",
      "E-03.ferromagnetic_field_state_missing",
    );
  });

  it.each([
    ["zero target frequency", { targetState: { frequencyHz: 0 } }],
    [
      "non-finite property frequency",
      { resistivitySnapshot: { frequencyHz: Number.NaN } },
    ],
  ] satisfies ReadonlyArray<readonly [string, InputOverrides]>)(
    "rejects %s without value or evidence",
    (_name, overrides) => {
      const result = evaluateE03PenetrationReferenceFrequency(input(overrides));
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    },
  );

  it.each([
    ["zero diameter", { diameterM: 0 }],
    ["negative diameter", { diameterM: -1 }],
    ["NaN diameter", { diameterM: Number.NaN }],
    ["infinite diameter", { diameterM: Number.POSITIVE_INFINITY }],
  ])("rejects %s without a value or evidence", (_name, overrides) => {
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(input(overrides)),
      "invalid_input",
      "E-03.diameter_invalid",
    );
  });

  it.each([
    ["zero rho", "rho", 0],
    ["negative rho", "rho", -1],
    ["NaN rho", "rho", Number.NaN],
    ["infinite rho", "rho", Number.POSITIVE_INFINITY],
    ["zero mu_r", "mu", 0],
    ["negative mu_r", "mu", -1],
    ["NaN mu_r", "mu", Number.NaN],
    ["infinite mu_r", "mu", Number.POSITIVE_INFINITY],
  ] as const)("rejects %s without a numeric result", (_name, property, valueSi) => {
    const candidate =
      property === "rho"
        ? input({ resistivitySnapshot: { valueSi } })
        : input({ relativePermeabilitySnapshot: { valueSi } });
    expectFailure(
      evaluateE03PenetrationReferenceFrequency(candidate),
      "invalid_input",
      "E-03.property_snapshot_invalid",
    );
  });

  it.each([
    ["wrong geometry kind", `material:${"a".repeat(64)}`, "geometry"],
    ["short geometry digest", `geometry:${"a".repeat(63)}`, "geometry"],
    ["uppercase geometry digest", `geometry:${"A".repeat(64)}`, "geometry"],
    ["wrong material kind", `geometry:${"b".repeat(64)}`, "material"],
    ["short material digest", `material:${"b".repeat(63)}`, "material"],
    ["uppercase material digest", `material:${"B".repeat(64)}`, "material"],
  ] as const)("rejects %s", (_name, snapshotId, kind) => {
    const candidate =
      kind === "geometry"
        ? input({ geometryEvidence: { geometrySnapshotId: snapshotId } })
        : input({ targetState: { materialSnapshotId: snapshotId } });
    const result = evaluateE03PenetrationReferenceFrequency(candidate);
    expect(result.status).toBe("invalid_input");
    expect("value" in result).toBe(false);
    expect("evidence" in result).toBe(false);
  });

  it("uses stable logarithmic scaling when D squared would overflow or underflow", () => {
    const large = successful(
      input({
        diameterM: 1e200,
        resistivitySnapshot: { valueSi: 1e300 },
        relativePermeabilitySnapshot: { valueSi: 1 },
        applicability: { materialClass: "nonferromagnetic" },
        targetState: { fieldStrengthApm: null },
      }),
    );
    const small = successful(
      input({
        diameterM: 1e-200,
        resistivitySnapshot: { valueSi: 1e-300 },
        relativePermeabilitySnapshot: { valueSi: 1 },
        applicability: { materialClass: "nonferromagnetic" },
        targetState: { fieldStrengthApm: null },
      }),
    );
    for (const result of [large, small]) {
      if (
        result.value.route !==
        "reference_frequency_for_historical_pi_d_2"
      ) {
        throw new Error("Expected reference-frequency result.");
      }
      expect(result.value.referenceFrequency.valueSi).toBeGreaterThan(0);
      expect(Number.isFinite(result.value.referenceFrequency.valueSi)).toBe(
        true,
      );
      expect(result.value.skinDepth.valueSi).toBeGreaterThan(0);
      expect(Number.isFinite(result.value.skinDepth.valueSi)).toBe(true);
    }
  });

  it("fails closed when positive f_ref or depth is not representable", () => {
    const cases = [
      input({
        diameterM: Number.MIN_VALUE,
        resistivitySnapshot: { valueSi: Number.MAX_VALUE },
        relativePermeabilitySnapshot: { valueSi: Number.MIN_VALUE },
        applicability: { materialClass: "nonferromagnetic" },
        targetState: { fieldStrengthApm: null },
      }),
      input({
        diameterM: Number.MAX_VALUE,
        resistivitySnapshot: { valueSi: Number.MIN_VALUE },
        relativePermeabilitySnapshot: { valueSi: Number.MAX_VALUE },
        applicability: { materialClass: "nonferromagnetic" },
        targetState: { fieldStrengthApm: null },
      }),
      input({
        diameterM: Number.MIN_VALUE,
        resistivitySnapshot: { valueSi: 1 },
        relativePermeabilitySnapshot: { valueSi: 1 },
        applicability: { materialClass: "nonferromagnetic" },
        targetState: { fieldStrengthApm: null },
      }),
    ];
    for (const candidate of cases) {
      expectFailure(
        evaluateE03PenetrationReferenceFrequency(candidate),
        "invalid_input",
        "E-03.numeric_resolution_invalid",
      );
    }
  });

  it("fails closed without executing accessors, reflection traps, extras, or sparse arrays", () => {
    const topAccessor = Object.defineProperty(
      { ...input() },
      "diameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute top-level getter");
        },
      },
    );
    const geometryAccessor = Object.defineProperty(
      { ...BASE_GEOMETRY },
      "normalizedDiameterM",
      {
        enumerable: true,
        get() {
          throw new Error("must not execute geometry getter");
        },
      },
    );
    const hostileTopProxy = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile top-level ownKeys trap");
      },
    });
    const hostilePropertyProxy = new Proxy(BASE_RESISTIVITY, {
      getOwnPropertyDescriptor() {
        throw new Error("hostile property descriptor trap");
      },
    });
    const hugeSparse: unknown[] = [];
    hugeSparse.length = 4_000_000_000;
    const candidates = [
      topAccessor,
      { ...input(), geometryEvidence: geometryAccessor },
      hostileTopProxy,
      { ...input(), resistivitySnapshot: hostilePropertyProxy },
      { ...input(), penetrationCriterion: hugeSparse },
      { ...input(), legacyBestFrequencyHz: 123 },
    ];
    for (const candidate of candidates) {
      expect(() =>
        evaluateE03PenetrationReferenceFrequency(candidate),
      ).not.toThrow();
      const result = evaluateE03PenetrationReferenceFrequency(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });

  it("does not coerce hostile enum or numeric objects", () => {
    const hostile = Object.freeze({
      valueOf() {
        throw new Error("must not coerce value");
      },
      toString() {
        throw new Error("must not coerce string");
      },
    });
    for (const candidate of [
      { ...input(), route: hostile },
      input({ diameterM: hostile as unknown as number }),
      input({
        applicability: {
          workpieceForm: hostile as unknown as "solid_cylinder",
        },
      }),
      input({
        penetrationCriterion: {
          valueSi: hostile as unknown as 2,
        },
      }),
    ]) {
      expect(() =>
        evaluateE03PenetrationReferenceFrequency(candidate),
      ).not.toThrow();
      const result = evaluateE03PenetrationReferenceFrequency(candidate);
      expect(result.status).toBe("invalid_input");
      expect("value" in result).toBe(false);
      expect("evidence" in result).toBe(false);
    }
  });
});
