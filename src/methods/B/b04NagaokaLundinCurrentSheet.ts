/**
 * B-04 Nagaoka/Lundin finite cylindrical-current-sheet baseline.
 *
 * Canonical SI only. The product route remains isolated from the runtime and
 * public API until the frozen release gates exported below are closed.
 */

import { isWithinTolId, TOL_ID } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-04"));
const B01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-01"));

export const B04_METHOD_ID = "B-04" as const;
export const B04_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B04_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;
export const B04_BRANCH_POINT_RELATIVE_LIMIT = 3e-6 as const;

export const B04_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B04_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B04_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B04_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B04_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const B04_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B04_SOURCE_REFS,
  contractSourceRefs: B04_CONTRACT_SOURCE_REFS,
  derivationRefs: B04_DERIVATION_REFS,
  validationCaseIds: B04_VALIDATION_CASE_IDS,
  methodCheckIds: B04_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
});

export const B04_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated",
  runtimeActivation: "blocked",
  openGates: Object.freeze([
    Object.freeze({
      gateId: "B-04.EM-L-003.release-source-cross-check",
      sourceReviewStatus: "pending_release_cross_check",
      reason:
        "L85 Table 1 lists exact auxiliary-function values while Equations 11-12 are polynomial approximations and differ in their final shown digits at some nodes. The contract mandates Equations 9-12; no unregistered table tolerance is inferred.",
    }),
    Object.freeze({
      gateId: "B-04.stable-warning-ids-and-policy",
      reason:
        "The frozen registry supplies prose warning predicates but no stable warning IDs or numeric few-turn, pitch, or thick-conductor trigger rules.",
    }),
  ]),
} as const);

export const B04_LUNDIN_COEFFICIENTS = Object.freeze({
  f1NumeratorX: 0.383901,
  f1NumeratorX2: 0.017108,
  f1DenominatorX: 0.258952,
  f2X: 0.093842,
  f2X2: 0.002029,
  f2X3: -0.000801,
} as const);

/** Controlled EM-L-003 nodes from L85 Table 1; never substituted for Eq. 11-12. */
export const B04_L85_TABLE_1_VALIDATION_NODES = Object.freeze([
  Object.freeze({ x: 0, f1: 1, f2: 0 }),
  Object.freeze({ x: 0.25, f1: 1.030342, f2: 0.023573 }),
  Object.freeze({ x: 1, f1: 1.112836, f2: 0.095072 }),
] as const);

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

const MEAN_CURRENT_PATH_UNCERTAIN_PREDICATE =
  "mean current path is uncertain" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `B-04 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const B04_WARNING_PREDICATES = Object.freeze({
  fewTurnsPitchOrThickConductor: controlledWarningPredicate(
    "few turns, large pitch, or thick conductor" as const,
  ),
  meanCurrentPathUncertain: controlledWarningPredicate(
    MEAN_CURRENT_PATH_UNCERTAIN_PREDICATE,
  ),
  branchDisagreement: controlledWarningPredicate(
    "branch disagreement exceeds the paper approximation error" as const,
  ),
  coefficientMultipliedTwice: controlledWarningPredicate(
    "K_N is multiplied a second time" as const,
  ),
});

export const B04_ASSUMPTIONS = Object.freeze([
  "uniform_single_layer_winding",
  "air_core",
  "infinitely_thin_uniform_cylindrical_surface_ampere_turns",
  "no_pitch_or_discrete_turn_effects",
  "no_leads",
  "no_finite_conductor_section_effects",
  "no_proximity_effects",
  "no_workpiece",
  "no_distributed_capacitance",
] as const);

export interface B04GeometrySemanticEvidence {
  readonly normalizedByMethodId: "B-01";
  readonly normalizedByMethodVersion: string;
  readonly geometrySnapshotId: string;
  readonly semanticMappingStatus:
    | "confirmed_same_B01_snapshot"
    | "unconfirmed";
  readonly currentPathDiameterParameterId: "coil.current_path_diameter";
  readonly normalizedCurrentPathDiameterM: number;
  readonly windingEnvelopeLengthParameterId: "coil.winding_envelope_length";
  readonly normalizedWindingEnvelopeLengthM: number;
  readonly electricalTurnCountParameterId: "coil.electrical_turn_count";
  readonly normalizedElectricalTurnCount: number;
  readonly currentPathBasis:
    | "explicit_method_or_state_bound"
    | "ADR_0003_default_centroid_unresolved"
    | "other_or_unknown";
}

export interface B04CurrentSheetApplicabilityEvidence {
  readonly windingClass:
    | "uniform_single_layer"
    | "multilayer"
    | "other_or_unknown";
  readonly airCoreStatus:
    | "confirmed_air_core"
    | "not_air_core"
    | "unconfirmed";
  readonly currentSheetIdealization:
    | "confirmed_for_analytical_baseline"
    | "not_satisfied"
    | "unconfirmed";
}

export interface B04NagaokaLundinInput {
  /** D_c, canonical SI metres. */
  readonly currentPathDiameterM: number;
  /** b_sheet=b_env, canonical SI metres. */
  readonly windingEnvelopeLengthM: number;
  /** N, dimensionless electrical turns. */
  readonly electricalTurnCount: number;
  readonly geometryEvidence: B04GeometrySemanticEvidence;
  readonly applicabilityEvidence: B04CurrentSheetApplicabilityEvidence;
}

export type B04Branch = "long_2a_lte_b" | "short_2a_gt_b";

export interface B04GeometryIdentityCheck {
  readonly identityId:
    | "D_c=2a"
    | "K_N=L_sheet/L_inf"
    | "L_sheet=L_inf*K_N";
  readonly actualSi: number;
  readonly referenceSi: number;
  readonly absoluteResidualSi: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "synthetic_identity_only";
  readonly passed: true;
}

export interface B04BoundaryCheckEvaluated {
  readonly kind: "evaluated";
  readonly methodCheckId: "EM-L-BRANCH-001";
  readonly selectedBranch: "long_2a_lte_b";
  readonly longBranchCoefficient: number;
  readonly shortBranchCoefficient: number;
  readonly relativeDisagreement: number;
  readonly relativeLimit: typeof B04_BRANCH_POINT_RELATIVE_LIMIT;
  readonly toleranceBasis: "frozen_paper_approximation_method_check";
  readonly passed: true;
}

export interface B04BoundaryCheckNotApplicable {
  readonly kind: "not_applicable";
  readonly methodCheckId: "EM-L-BRANCH-001";
  readonly reason: "evaluated only at the exact synthetic boundary 2a=b";
  readonly relativeDisagreement?: never;
  readonly relativeLimit?: never;
}

export interface B04GeometryQuantityEvidence {
  readonly currentPathDiameter: Readonly<{
    readonly parameterId: "coil.current_path_diameter";
    readonly symbol: "D_c";
    readonly valueSi: number;
    readonly canonicalUnitId: "m";
  }>;
  readonly windingEnvelopeLength: Readonly<{
    readonly parameterId: "coil.winding_envelope_length";
    readonly symbol: "b_env";
    readonly localMethodSymbol: "b_sheet";
    readonly valueSi: number;
    readonly canonicalUnitId: "m";
  }>;
  readonly electricalTurnCount: Readonly<{
    readonly parameterId: "coil.electrical_turn_count";
    readonly symbol: "N";
    readonly valueSi: number;
    readonly canonicalUnitId: "one";
  }>;
  readonly radius: Readonly<{
    readonly symbol: "a";
    readonly valueSi: number;
    readonly canonicalUnitId: "m";
    readonly derivation: "a=D_c/2";
  }>;
}

export interface B04NagaokaLundinValue {
  readonly sheetInductance: Readonly<{
    readonly quantityId: "L_sheet";
    readonly valueSi: number;
    readonly dimensionId: "inductance";
    readonly canonicalUnitId: "H";
  }>;
  readonly longSolenoidLimit: Readonly<{
    readonly quantityId: "L_inf";
    readonly valueSi: number;
    readonly dimensionId: "inductance";
    readonly canonicalUnitId: "H";
  }>;
  readonly nagaokaCoefficient: Readonly<{
    readonly quantityId: "K_N";
    readonly valueSi: number;
    readonly dimensionId: "dimensionless";
    readonly canonicalUnitId: "one";
  }>;
  readonly branch: B04Branch;
  readonly x: number;
  readonly f1: number;
  readonly f2: number;
  readonly twoAOverB: number;
  readonly bOverTwoA: number;
}

export interface B04GeometryWarning {
  readonly predicate: typeof MEAN_CURRENT_PATH_UNCERTAIN_PREDICATE;
  readonly message: string;
}

export interface B04NagaokaLundinSuccess {
  readonly methodId: typeof B04_METHOD_ID;
  readonly methodVersion: typeof B04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain" | "at_boundary";
  readonly warningIds: readonly [];
  readonly warnings: readonly B04GeometryWarning[];
  readonly value: B04NagaokaLundinValue;
  readonly evidence: Readonly<{
    readonly geometrySnapshotId: string;
    readonly normalizedByMethodId: "B-01";
    readonly normalizedByMethodVersion: string;
    readonly geometrySemanticEvidence: Readonly<B04GeometrySemanticEvidence>;
    readonly applicabilityEvidence: Readonly<B04CurrentSheetApplicabilityEvidence>;
    readonly geometry: B04GeometryQuantityEvidence;
    readonly assumptions: typeof B04_ASSUMPTIONS;
    readonly equation: Readonly<{
      readonly equationId: "CALCULATION_CONTRACTS.md#B-04:Equation";
      readonly sourceEquationNumbers: readonly ["L85-Eq9", "L85-Eq10", "L85-Eq11", "L85-Eq12"];
      readonly selectedBranch: B04Branch;
      readonly canonicalSiEquation: string;
      readonly substitution: Readonly<{
        readonly vacuumPermeabilityHPerM: number;
        readonly electricalTurnCount: number;
        readonly radiusM: number;
        readonly windingEnvelopeLengthM: number;
        readonly x: number;
        readonly f1: number;
        readonly f2: number;
        readonly longSolenoidLimitH: number;
        readonly nagaokaCoefficient: number;
      }>;
    }>;
    readonly identities: readonly B04GeometryIdentityCheck[];
    readonly boundaryCheck:
      | B04BoundaryCheckEvaluated
      | B04BoundaryCheckNotApplicable;
    readonly warningPolicy: Readonly<{
      readonly automaticPhysicalThresholdsApplied: false;
      readonly policy: "no_frozen_few_turn_pitch_or_thick_conductor_threshold";
      readonly unautomatedPredicates: readonly [
        "few turns, large pitch, or thick conductor",
      ];
      readonly coefficientAppliedExactlyOnce: true;
    }>;
    readonly sourceReviewStatus: "pending_release_cross_check";
    readonly scientificInterpretation: "six_digit_current_sheet_approximation_not_physical_coil_accuracy";
    readonly sourceRefs: typeof B04_SOURCE_REFS;
    readonly contractSourceRefs: typeof B04_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof B04_DERIVATION_REFS;
    readonly validationCaseIds: typeof B04_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof B04_METHOD_CHECK_IDS;
    readonly units: Readonly<{
      readonly currentPathDiameter: "m";
      readonly windingEnvelopeLength: "m";
      readonly radius: "m";
      readonly turnCount: "one";
      readonly coefficient: "one";
      readonly inductance: "H";
      readonly dimensionalIdentity: "(H/m)*m=H";
    }>;
  }>;
  readonly failure?: never;
}

export type B04FailureCode =
  | "B-04.input_schema_invalid"
  | "B-04.geometry_evidence_invalid"
  | "B-04.invalid_geometry_mapping"
  | "B-04.geometry_snapshot_value_mismatch"
  | "B-04.geometry_mapping_unconfirmed"
  | "B-04.current_path_basis_unresolved"
  | "B-04.applicability_evidence_invalid"
  | "B-04.applicability_unconfirmed"
  | "B-04.multilayer_not_applicable"
  | "B-04.non_air_core_not_applicable"
  | "B-04.current_sheet_model_not_applicable"
  | "B-04.current_path_diameter_invalid"
  | "B-04.winding_envelope_length_invalid"
  | "B-04.electrical_turn_count_invalid"
  | "B-04.single_turn_not_applicable"
  | "B-04.zero_sheet_length_not_applicable"
  | "B-04.numeric_resolution_invalid"
  | "B-04.branch_consistency_failed"
  | "B-04.identity_check_failed";

export interface B04NagaokaLundinFailure {
  readonly methodId: typeof B04_METHOD_ID;
  readonly methodVersion: typeof B04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: B04FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type B04NagaokaLundinOutcome =
  | B04NagaokaLundinSuccess
  | B04NagaokaLundinFailure;

export type B04AuxiliaryFunctionOutcome =
  | Readonly<{
      readonly status: "success";
      readonly x: number;
      readonly f1: number;
      readonly f2: number;
      readonly sourceEquationRefs: readonly ["L85-Eq11", "L85-Eq12"];
      readonly tableValuesAreNotSubstituted: true;
      readonly failure?: never;
    }>
  | Readonly<{
      readonly status: "invalid_input";
      readonly failure: Readonly<{
        readonly code: "B-04.auxiliary_input_invalid";
        readonly message: string;
      }>;
      readonly x?: never;
      readonly f1?: never;
      readonly f2?: never;
    }>;

function failure(
  status: B04NagaokaLundinFailure["status"],
  code: B04FailureCode,
  message: string,
  action: string,
): B04NagaokaLundinFailure {
  return Object.freeze({
    methodId: B04_METHOD_ID,
    methodVersion: B04_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

function lundinFunctions(x: number): Readonly<{ f1: number; f2: number }> | null {
  const x2 = x * x;
  const x3 = x2 * x;
  const f1Numerator =
    1 +
    B04_LUNDIN_COEFFICIENTS.f1NumeratorX * x +
    B04_LUNDIN_COEFFICIENTS.f1NumeratorX2 * x2;
  const f1Denominator =
    1 + B04_LUNDIN_COEFFICIENTS.f1DenominatorX * x;
  const f1 = f1Numerator / f1Denominator;
  const f2 =
    B04_LUNDIN_COEFFICIENTS.f2X * x +
    B04_LUNDIN_COEFFICIENTS.f2X2 * x2 +
    B04_LUNDIN_COEFFICIENTS.f2X3 * x3;
  if (
    !Number.isFinite(x2) ||
    !Number.isFinite(x3) ||
    !Number.isFinite(f1) ||
    f1 <= 0 ||
    !Number.isFinite(f2) ||
    f2 < 0
  ) {
    return null;
  }
  return Object.freeze({ f1, f2 });
}

/** Validation-only evaluation of the frozen L85 Equations 11-12. */
export function evaluateB04LundinAuxiliaryFunctions(
  input: unknown,
): B04AuxiliaryFunctionOutcome {
  const controlledInput = readExactPlainDataRecord(input, ["x"]);
  if (
    controlledInput === null ||
    typeof controlledInput.x !== "number" ||
    !Number.isFinite(controlledInput.x) ||
    controlledInput.x < 0 ||
    controlledInput.x > 1
  ) {
    return Object.freeze({
      status: "invalid_input",
      failure: Object.freeze({
        code: "B-04.auxiliary_input_invalid",
        message:
          "L85 Equations 11-12 require an exact controlled finite x in [0,1].",
      }),
    });
  }
  const values = lundinFunctions(controlledInput.x);
  if (values === null) {
    return Object.freeze({
      status: "invalid_input",
      failure: Object.freeze({
        code: "B-04.auxiliary_input_invalid",
        message: "The L85 auxiliary functions are not representable.",
      }),
    });
  }
  return Object.freeze({
    status: "success",
    x: controlledInput.x,
    f1: values.f1,
    f2: values.f2,
    sourceEquationRefs: Object.freeze(["L85-Eq11", "L85-Eq12"] as const),
    tableValuesAreNotSubstituted: true,
  });
}

type GeometryEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B04GeometrySemanticEvidence>;
      readonly warnings: readonly B04GeometryWarning[];
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B04NagaokaLundinFailure;
    }>;

function validateGeometryEvidence(value: unknown): GeometryEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "normalizedByMethodId",
    "normalizedByMethodVersion",
    "geometrySnapshotId",
    "semanticMappingStatus",
    "currentPathDiameterParameterId",
    "normalizedCurrentPathDiameterM",
    "windingEnvelopeLengthParameterId",
    "normalizedWindingEnvelopeLengthM",
    "electricalTurnCountParameterId",
    "normalizedElectricalTurnCount",
    "currentPathBasis",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.geometry_evidence_invalid",
        "B-04 geometry evidence must be an exact controlled plain-data record.",
        "Provide same-snapshot B-01 normalization evidence without accessors or extra fields.",
      ),
    });
  }
  if (
    record.normalizedByMethodId !== "B-01" ||
    record.normalizedByMethodVersion !== B01_SPECIFICATION.methodVersion ||
    record.currentPathDiameterParameterId !==
      "coil.current_path_diameter" ||
    record.windingEnvelopeLengthParameterId !==
      "coil.winding_envelope_length" ||
    record.electricalTurnCountParameterId !== "coil.electrical_turn_count"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.invalid_geometry_mapping",
        "B-04 requires the frozen D_c, b_env, and N semantics from one version-matched B-01 normalization.",
        "Do not substitute D_m, b_cc, Np, a legacy coil length, or an unversioned geometry route.",
      ),
    });
  }
  if (
    typeof record.normalizedCurrentPathDiameterM !== "number" ||
    !Number.isFinite(record.normalizedCurrentPathDiameterM) ||
    typeof record.normalizedWindingEnvelopeLengthM !== "number" ||
    !Number.isFinite(record.normalizedWindingEnvelopeLengthM) ||
    typeof record.normalizedElectricalTurnCount !== "number" ||
    !Number.isSafeInteger(record.normalizedElectricalTurnCount)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.geometry_evidence_invalid",
        "The B-01 evidence must carry finite snapshot-bound D_c and b_env values and a safe-integer N value.",
        "Copy the immutable normalized values from the identified geometry snapshot without coercion.",
      ),
    });
  }
  if (
    typeof record.geometrySnapshotId !== "string" ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.geometry_evidence_invalid",
        "The B-01 evidence must identify one content-addressed geometry snapshot.",
        "Provide geometry:<64 lowercase SHA-256 hex> from the controlled snapshot layer.",
      ),
    });
  }
  if (record.semanticMappingStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-04.geometry_mapping_unconfirmed",
        "The D_c, b_env, and N values are not confirmed to come from the same B-01 snapshot.",
        "Resolve the geometry provenance before evaluating B-04.",
      ),
    });
  }
  if (record.semanticMappingStatus !== "confirmed_same_B01_snapshot") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.geometry_evidence_invalid",
        "semanticMappingStatus is not a controlled B-04 value.",
        "Use confirmed_same_B01_snapshot or unconfirmed without coercion.",
      ),
    });
  }

  let warnings: readonly B04GeometryWarning[] = EMPTY_WARNINGS;
  if (record.currentPathBasis === "ADR_0003_default_centroid_unresolved") {
    warnings = Object.freeze([
      Object.freeze({
        predicate: B04_WARNING_PREDICATES.meanCurrentPathUncertain,
        message:
          "D_c uses the warning-bearing ADR-0003 D_c:=D_m default; the effective current centroid remains unresolved.",
      }),
    ]);
  } else if (record.currentPathBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-04.current_path_basis_unresolved",
        "The electromagnetic current-path diameter basis is unresolved.",
        "Bind D_c to a method/state or explicitly select the ADR-0003 warning-bearing default upstream.",
      ),
    });
  } else if (record.currentPathBasis !== "explicit_method_or_state_bound") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.geometry_evidence_invalid",
        "currentPathBasis is not a controlled B-04 value.",
        "Use the explicit, ADR-0003 default, or unknown evidence enumeration.",
      ),
    });
  }

  const evidence = Object.freeze({
    normalizedByMethodId: "B-01" as const,
    normalizedByMethodVersion: B01_SPECIFICATION.methodVersion,
    geometrySnapshotId: record.geometrySnapshotId,
    semanticMappingStatus: "confirmed_same_B01_snapshot" as const,
    currentPathDiameterParameterId:
      "coil.current_path_diameter" as const,
    normalizedCurrentPathDiameterM:
      record.normalizedCurrentPathDiameterM,
    windingEnvelopeLengthParameterId:
      "coil.winding_envelope_length" as const,
    normalizedWindingEnvelopeLengthM:
      record.normalizedWindingEnvelopeLengthM,
    electricalTurnCountParameterId: "coil.electrical_turn_count" as const,
    normalizedElectricalTurnCount: record.normalizedElectricalTurnCount,
    currentPathBasis: record.currentPathBasis as
      | "explicit_method_or_state_bound"
      | "ADR_0003_default_centroid_unresolved",
  });
  return Object.freeze({ ok: true, evidence, warnings });
}

type ApplicabilityEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B04CurrentSheetApplicabilityEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B04NagaokaLundinFailure;
    }>;

function validateApplicabilityEvidence(
  value: unknown,
): ApplicabilityEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "windingClass",
    "airCoreStatus",
    "currentSheetIdealization",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.applicability_evidence_invalid",
        "B-04 applicability evidence must be an exact controlled record.",
        "Declare the winding, air-core, and current-sheet model states explicitly.",
      ),
    });
  }
  if (record.windingClass === "multilayer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-04.multilayer_not_applicable",
        "B-04 is a uniform single-layer cylindrical current-sheet method.",
        "Use an independently approved multilayer geometry and method route.",
      ),
    });
  }
  if (record.windingClass === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-04.applicability_unconfirmed",
        "The winding class is not confirmed as uniform single-layer.",
        "Resolve the winding class without inferring it from conductor thickness.",
      ),
    });
  }
  if (record.windingClass !== "uniform_single_layer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.applicability_evidence_invalid",
        "windingClass is not a controlled value.",
        "Use the frozen winding-class enumeration.",
      ),
    });
  }
  if (record.airCoreStatus === "not_air_core") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-04.non_air_core_not_applicable",
        "B-04 is frozen as an air-core current-sheet baseline.",
        "Do not insert an unfrozen relative permeability into the B-04 equation.",
      ),
    });
  }
  if (record.airCoreStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-04.applicability_unconfirmed",
        "Air-core applicability is unconfirmed.",
        "Confirm the analytical air-core baseline state.",
      ),
    });
  }
  if (record.airCoreStatus !== "confirmed_air_core") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.applicability_evidence_invalid",
        "airCoreStatus is not a controlled value.",
        "Use the frozen air-core evidence enumeration.",
      ),
    });
  }
  if (record.currentSheetIdealization === "not_satisfied") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-04.current_sheet_model_not_applicable",
        "The infinitely thin uniform cylindrical surface-ampere-turn idealization is not satisfied.",
        "Route to an applicable discrete, measurement, or FEM method without calibrating B-04.",
      ),
    });
  }
  if (record.currentSheetIdealization === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-04.applicability_unconfirmed",
        "The B-04 cylindrical current-sheet idealization is unconfirmed.",
        "Complete the model-applicability evidence; no numeric turn/pitch threshold is frozen.",
      ),
    });
  }
  if (
    record.currentSheetIdealization !==
    "confirmed_for_analytical_baseline"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-04.applicability_evidence_invalid",
        "currentSheetIdealization is not a controlled value.",
        "Use the frozen current-sheet evidence enumeration.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      windingClass: "uniform_single_layer" as const,
      airCoreStatus: "confirmed_air_core" as const,
      currentSheetIdealization:
        "confirmed_for_analytical_baseline" as const,
    }),
  });
}

function positiveFromNaturalLog(logValue: number): number | null {
  if (!Number.isFinite(logValue)) {
    return null;
  }
  const value = Math.exp(logValue);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function identityCheck(
  identityId: B04GeometryIdentityCheck["identityId"],
  actualSi: number,
  referenceSi: number,
): B04GeometryIdentityCheck | null {
  if (!isWithinTolId(actualSi, referenceSi)) {
    return null;
  }
  const absoluteResidualSi = Math.abs(actualSi - referenceSi);
  if (!Number.isFinite(absoluteResidualSi)) {
    return null;
  }
  return Object.freeze({
    identityId,
    actualSi,
    referenceSi,
    absoluteResidualSi,
    toleranceId: TOL_ID.id,
    tolerancePurpose: "synthetic_identity_only",
    passed: true,
  });
}

/** Evaluate B-04 against exact canonical-SI and semantic evidence inputs. */
export function evaluateB04NagaokaLundinCurrentSheet(
  input: unknown,
): B04NagaokaLundinOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "currentPathDiameterM",
    "windingEnvelopeLengthM",
    "electricalTurnCount",
    "geometryEvidence",
    "applicabilityEvidence",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-04.input_schema_invalid",
      "B-04 input must match the exact controlled canonical-SI schema.",
      "Remove extra fields and provide plain-data B-01 and applicability evidence.",
    );
  }

  const geometryResult = validateGeometryEvidence(
    controlledInput.geometryEvidence,
  );
  if (!geometryResult.ok) {
    return geometryResult.result;
  }
  const applicabilityResult = validateApplicabilityEvidence(
    controlledInput.applicabilityEvidence,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.result;
  }

  const {
    currentPathDiameterM,
    windingEnvelopeLengthM,
    electricalTurnCount,
  } = controlledInput;
  if (
    typeof currentPathDiameterM !== "number" ||
    !Number.isFinite(currentPathDiameterM) ||
    currentPathDiameterM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-04.current_path_diameter_invalid",
      "D_c must be a positive finite canonical-SI length.",
      "Provide coil.current_path_diameter, not D_i, D_o, or D_m.",
    );
  }
  if (
    typeof windingEnvelopeLengthM !== "number" ||
    !Number.isFinite(windingEnvelopeLengthM)
  ) {
    return failure(
      "invalid_input",
      "B-04.winding_envelope_length_invalid",
      "b_sheet=b_env must be a finite canonical-SI length.",
      "Provide coil.winding_envelope_length without substituting b_cc or Np.",
    );
  }
  if (
    typeof electricalTurnCount !== "number" ||
    !Number.isSafeInteger(electricalTurnCount) ||
    electricalTurnCount < 1
  ) {
    return failure(
      "invalid_input",
      "B-04.electrical_turn_count_invalid",
      "N must be a positive safe integer electrical turn count.",
      "Correct coil.electrical_turn_count without using helix revolutions.",
    );
  }
  if (
    geometryResult.evidence.normalizedCurrentPathDiameterM !==
      currentPathDiameterM ||
    geometryResult.evidence.normalizedWindingEnvelopeLengthM !==
      windingEnvelopeLengthM ||
    geometryResult.evidence.normalizedElectricalTurnCount !==
      electricalTurnCount
  ) {
    return failure(
      "invalid_input",
      "B-04.geometry_snapshot_value_mismatch",
      "The top-level D_c, b_env, or N value differs from the immutable value bound to the declared B-01 geometry snapshot.",
      "Use the exact snapshot-bound normalized values; B-04 does not trust a same-snapshot status string by itself.",
    );
  }
  if (electricalTurnCount === 1) {
    return failure(
      "not_applicable",
      "B-04.single_turn_not_applicable",
      "The B-04 multi-turn cylindrical current-sheet model is not applicable for N=1.",
      "Route to an approved finite-section loop method, measurement, or FEM when available.",
    );
  }
  if (windingEnvelopeLengthM === 0) {
    return failure(
      "not_applicable",
      "B-04.zero_sheet_length_not_applicable",
      "The current-sheet length is zero, so the B-04 equations would divide by zero.",
      "Resolve b_env or route to a finite-section loop method.",
    );
  }
  if (windingEnvelopeLengthM < 0) {
    return failure(
      "invalid_input",
      "B-04.winding_envelope_length_invalid",
      "b_env cannot be negative.",
      "Correct the frozen winding-envelope geometry.",
    );
  }

  const radiusM = currentPathDiameterM / 2;
  const twiceRadiusM = radiusM * 2;
  const twoAOverB = currentPathDiameterM / windingEnvelopeLengthM;
  const bOverTwoA = windingEnvelopeLengthM / currentPathDiameterM;
  if (
    !Number.isFinite(radiusM) ||
    radiusM <= 0 ||
    !Number.isFinite(twiceRadiusM) ||
    twiceRadiusM <= 0 ||
    !Number.isFinite(twoAOverB) ||
    twoAOverB <= 0 ||
    !Number.isFinite(bOverTwoA) ||
    bOverTwoA <= 0
  ) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "A positive geometry ratio or a=D_c/2 overflowed or underflowed binary64.",
      "Use finite representable canonical-SI geometry; no zero or infinite placeholder is published.",
    );
  }

  const branch: B04Branch =
    currentPathDiameterM <= windingEnvelopeLengthM
      ? "long_2a_lte_b"
      : "short_2a_gt_b";
  const stableBranchRatio =
    branch === "long_2a_lte_b" ? twoAOverB : bOverTwoA;
  const x = stableBranchRatio * stableBranchRatio;
  if (!Number.isFinite(x) || x <= 0 || x > 1) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "The positive stable Lundin branch variable x was lost or left [0,1].",
      "Use a representable D_c/b_env ratio; x=0 is only an analytical source-table limit.",
    );
  }
  const functions = lundinFunctions(x);
  if (functions === null) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "L85 Equations 11-12 did not produce finite auxiliary functions.",
      "Correct the representability of the canonical-SI geometry.",
    );
  }

  let nagaokaCoefficient: number;
  let canonicalSiEquation: string;
  if (branch === "long_2a_lte_b") {
    nagaokaCoefficient =
      functions.f1 - (4 / (3 * Math.PI)) * twoAOverB;
    canonicalSiEquation =
      "x=4a^2/b^2; L_sheet=mu0*N^2*pi*a^2/b*[f1(x)-(4/(3*pi))*(2a/b)]";
  } else {
    const shortLogFactor =
      Math.log(4) - Math.log(bOverTwoA) - 0.5;
    const shortInductanceFactor =
      shortLogFactor * functions.f1 + functions.f2;
    nagaokaCoefficient =
      (2 / Math.PI) * bOverTwoA * shortInductanceFactor;
    canonicalSiEquation =
      "x=b^2/(4a^2); L_sheet=mu0*N^2*a*{[ln(8a/b)-1/2]*f1(x)+f2(x)}";
  }
  if (
    !Number.isFinite(nagaokaCoefficient) ||
    nagaokaCoefficient <= 0 ||
    nagaokaCoefficient >= 1
  ) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "The finite positive geometry did not yield a representable 0<K_N<1 coefficient.",
      "Do not replace an underflow, overflow, or swallowed finite-length correction with 0 or 1.",
    );
  }

  const logLInfH =
    Math.log(B04_VACUUM_PERMEABILITY_H_PER_M) +
    2 * Math.log(electricalTurnCount) +
    Math.log(Math.PI) +
    2 * Math.log(radiusM) -
    Math.log(windingEnvelopeLengthM);
  const longSolenoidLimitH = positiveFromNaturalLog(logLInfH);
  if (longSolenoidLimitH === null) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "L_inf overflowed or underflowed canonical SI.",
      "Use representable geometry and turn count; no infinite or zero inductance is published.",
    );
  }
  const sheetInductanceH = longSolenoidLimitH * nagaokaCoefficient;
  if (!Number.isFinite(sheetInductanceH) || sheetInductanceH <= 0) {
    return failure(
      "invalid_input",
      "B-04.numeric_resolution_invalid",
      "L_sheet=L_inf*K_N overflowed or underflowed canonical SI.",
      "Use representable canonical-SI inputs; no placeholder result is published.",
    );
  }

  const identities = [
    identityCheck("D_c=2a", currentPathDiameterM, twiceRadiusM),
    identityCheck(
      "K_N=L_sheet/L_inf",
      nagaokaCoefficient,
      sheetInductanceH / longSolenoidLimitH,
    ),
    identityCheck(
      "L_sheet=L_inf*K_N",
      sheetInductanceH,
      longSolenoidLimitH * nagaokaCoefficient,
    ),
  ];
  if (identities.some((check) => check === null)) {
    return failure(
      "invalid_input",
      "B-04.identity_check_failed",
      "A synthetic algebraic B-04 identity failed TOL-ID.",
      "Treat this as numeric representability failure, not physical validation.",
    );
  }

  let boundaryCheck:
    | B04BoundaryCheckEvaluated
    | B04BoundaryCheckNotApplicable;
  const isExactBoundary = currentPathDiameterM === windingEnvelopeLengthM;
  if (isExactBoundary) {
    const longCoefficient =
      functions.f1 - 4 / (3 * Math.PI);
    const shortCoefficient =
      (2 / Math.PI) *
      ((Math.log(4) - 0.5) * functions.f1 + functions.f2);
    const relativeDisagreement =
      Math.abs(longCoefficient - shortCoefficient) / longCoefficient;
    if (
      !Number.isFinite(longCoefficient) ||
      longCoefficient <= 0 ||
      !Number.isFinite(shortCoefficient) ||
      shortCoefficient <= 0 ||
      !Number.isFinite(relativeDisagreement) ||
      relativeDisagreement > B04_BRANCH_POINT_RELATIVE_LIMIT
    ) {
      return failure(
        "invalid_input",
        "B-04.branch_consistency_failed",
        "The two L85 approximations disagree beyond EM-L-BRANCH-001 at 2a=b.",
        "Do not hide the source-approximation branch discontinuity or apply TOL-ID as its tolerance.",
      );
    }
    boundaryCheck = Object.freeze({
      kind: "evaluated",
      methodCheckId: "EM-L-BRANCH-001",
      selectedBranch: "long_2a_lte_b",
      longBranchCoefficient: longCoefficient,
      shortBranchCoefficient: shortCoefficient,
      relativeDisagreement,
      relativeLimit: B04_BRANCH_POINT_RELATIVE_LIMIT,
      toleranceBasis: "frozen_paper_approximation_method_check",
      passed: true,
    });
  } else {
    boundaryCheck = Object.freeze({
      kind: "not_applicable",
      methodCheckId: "EM-L-BRANCH-001",
      reason: "evaluated only at the exact synthetic boundary 2a=b",
    });
  }

  const geometry = Object.freeze({
    currentPathDiameter: Object.freeze({
      parameterId: "coil.current_path_diameter" as const,
      symbol: "D_c" as const,
      valueSi: currentPathDiameterM,
      canonicalUnitId: "m" as const,
    }),
    windingEnvelopeLength: Object.freeze({
      parameterId: "coil.winding_envelope_length" as const,
      symbol: "b_env" as const,
      localMethodSymbol: "b_sheet" as const,
      valueSi: windingEnvelopeLengthM,
      canonicalUnitId: "m" as const,
    }),
    electricalTurnCount: Object.freeze({
      parameterId: "coil.electrical_turn_count" as const,
      symbol: "N" as const,
      valueSi: electricalTurnCount,
      canonicalUnitId: "one" as const,
    }),
    radius: Object.freeze({
      symbol: "a" as const,
      valueSi: radiusM,
      canonicalUnitId: "m" as const,
      derivation: "a=D_c/2" as const,
    }),
  });
  const value = Object.freeze({
    sheetInductance: Object.freeze({
      quantityId: "L_sheet" as const,
      valueSi: sheetInductanceH,
      dimensionId: "inductance" as const,
      canonicalUnitId: "H" as const,
    }),
    longSolenoidLimit: Object.freeze({
      quantityId: "L_inf" as const,
      valueSi: longSolenoidLimitH,
      dimensionId: "inductance" as const,
      canonicalUnitId: "H" as const,
    }),
    nagaokaCoefficient: Object.freeze({
      quantityId: "K_N" as const,
      valueSi: nagaokaCoefficient,
      dimensionId: "dimensionless" as const,
      canonicalUnitId: "one" as const,
    }),
    branch,
    x,
    f1: functions.f1,
    f2: functions.f2,
    twoAOverB,
    bOverTwoA,
  });
  const equation = Object.freeze({
    equationId: "CALCULATION_CONTRACTS.md#B-04:Equation" as const,
    sourceEquationNumbers: Object.freeze([
      "L85-Eq9",
      "L85-Eq10",
      "L85-Eq11",
      "L85-Eq12",
    ] as const),
    selectedBranch: branch,
    canonicalSiEquation,
    substitution: Object.freeze({
      vacuumPermeabilityHPerM: B04_VACUUM_PERMEABILITY_H_PER_M,
      electricalTurnCount,
      radiusM,
      windingEnvelopeLengthM,
      x,
      f1: functions.f1,
      f2: functions.f2,
      longSolenoidLimitH,
      nagaokaCoefficient,
    }),
  });
  const evidence = Object.freeze({
    geometrySnapshotId: geometryResult.evidence.geometrySnapshotId,
    normalizedByMethodId: "B-01" as const,
    normalizedByMethodVersion:
      geometryResult.evidence.normalizedByMethodVersion,
    geometrySemanticEvidence: geometryResult.evidence,
    applicabilityEvidence: applicabilityResult.evidence,
    geometry,
    assumptions: B04_ASSUMPTIONS,
    equation,
    identities: Object.freeze(
      identities as readonly B04GeometryIdentityCheck[],
    ),
    boundaryCheck,
    warningPolicy: Object.freeze({
      automaticPhysicalThresholdsApplied: false as const,
      policy:
        "no_frozen_few_turn_pitch_or_thick_conductor_threshold" as const,
      unautomatedPredicates: Object.freeze([
        B04_WARNING_PREDICATES.fewTurnsPitchOrThickConductor,
      ] as const),
      coefficientAppliedExactlyOnce: true as const,
    }),
    sourceReviewStatus: "pending_release_cross_check" as const,
    scientificInterpretation:
      "six_digit_current_sheet_approximation_not_physical_coil_accuracy" as const,
    sourceRefs: B04_SOURCE_REFS,
    contractSourceRefs: B04_CONTRACT_SOURCE_REFS,
    derivationRefs: B04_DERIVATION_REFS,
    validationCaseIds: B04_VALIDATION_CASE_IDS,
    methodCheckIds: B04_METHOD_CHECK_IDS,
    units: Object.freeze({
      currentPathDiameter: "m" as const,
      windingEnvelopeLength: "m" as const,
      radius: "m" as const,
      turnCount: "one" as const,
      coefficient: "one" as const,
      inductance: "H" as const,
      dimensionalIdentity: "(H/m)*m=H" as const,
    }),
  });

  return Object.freeze({
    methodId: B04_METHOD_ID,
    methodVersion: B04_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status:
      geometryResult.warnings.length === 0
        ? "success"
        : "success_with_warnings",
    applicabilityStatus: isExactBoundary ? "at_boundary" : "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: geometryResult.warnings,
    value,
    evidence,
  });
}
