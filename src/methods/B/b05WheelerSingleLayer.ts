/**
 * B-05 Wheeler 1928 single-layer engineering comparison.
 *
 * Canonical SI enters and leaves this isolated method. Wheeler Equation (2)
 * is nevertheless evaluated in its original inch/microhenry unit system so
 * the controlled source substitution remains auditable.
 */

import { isWithinTolId, TOL_ID } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import {
  fromCanonicalSI,
  toCanonicalSI,
} from "../../units/conversion.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-05"));
const B01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-01"));

export const B05_METHOD_ID = "B-05" as const;
export const B05_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B05_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B05_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B05_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B05_DERIVATION_RESOLUTION_REASON =
  SPECIFICATION.derivationResolutionReason;
export const B05_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B05_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/**
 * Smallest positive normal IEEE-754 binary64 value. This is solely a machine
 * representability boundary: it is not an engineering tolerance, model-domain
 * threshold, source accuracy statement, or geometry routing criterion.
 */
export const B05_BINARY64_MIN_NORMAL = 2 ** -1022;

export const B05_W28_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "W28" as const,
  relativePath: "references/external_sources/wheeler1928.pdf" as const,
  sha256:
    "1a17fef7ab82d4bcd33f030451cf9b63b8c173ee88741a1ace8a12c1239c90f1" as const,
  equation2Location: "PDF2:PRINT1399:eq2" as const,
  equation3Location: "PDF3:PRINT1400:eq3" as const,
  sourceManifestRef: "SOURCE_MANIFEST.csv#wheeler1928.pdf" as const,
});

export const B05_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B05_SOURCE_REFS,
  contractSourceRefs: B05_CONTRACT_SOURCE_REFS,
  derivationRefs: B05_DERIVATION_REFS,
  derivationResolutionReason: B05_DERIVATION_RESOLUTION_REASON,
  validationCaseIds: B05_VALIDATION_CASE_IDS,
  methodCheckIds: B05_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
});

/**
 * These are release-data gates, not permission to invent local warning IDs or
 * geometry thresholds. The isolated function remains directly testable.
 */
export const B05_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated",
  runtimeActivation: "blocked",
  openGates: Object.freeze([
    Object.freeze({
      gateId: "B-05.stable-warning-ids-and-trigger-policy",
      reason:
        "The frozen registry supplies prose warning predicates but no stable warning IDs and no numeric few-turn, large-pitch, or thick-conductor trigger rules.",
    }),
  ]),
} as const);

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `B-05 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const B05_WARNING_PREDICATES = Object.freeze({
  diameterPassedToRadiusFormula: controlledWarningPredicate(
    "diameter is passed to a radius formula" as const,
  ),
  millimetresPassedToInchFormula: controlledWarningPredicate(
    "millimetres are passed directly to the inch formula" as const,
  ),
  outsideEquation2AccuracyDomain: controlledWarningPredicate(
    "b<=0.8a" as const,
  ),
  fewTurnsLargePitchOrThickConductor: controlledWarningPredicate(
    "few turns, large pitch, or thick conductor" as const,
  ),
  nagaokaFactorAppliedAgain: controlledWarningPredicate(
    "a Nagaoka factor is applied again" as const,
  ),
});

const B01_CURRENT_CENTROID_WARNING_PREDICATE =
  "effective current centroid is unknown" as const;
if (
  !B01_SPECIFICATION.warningPredicates.includes(
    B01_CURRENT_CENTROID_WARNING_PREDICATE,
  )
) {
  throw new TypeError(
    "B-05 cannot bind the ADR-0003 D_c:=D_m path because the frozen B-01 warning predicate is missing.",
  );
}

export const B05_ASSUMPTIONS = Object.freeze([
  "W28_Figure_2_single_layer_helical_geometry",
  "air_core_source_formula_without_workpiece_or_magnetic_loading",
  "a_is_radius_derived_as_D_c_over_2",
  "b_is_B01_winding_envelope_length_b_env",
  "original_equation_2_inch_and_microhenry_units",
  "no_discrete_turn_pitch_conductor_section_skin_proximity_lead_or_distributed_capacitance_correction",
  "no_Nagaoka_factor_applied_to_the_Wheeler_result",
] as const);

export interface B05GeometrySemanticEvidence {
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

export interface B05ApplicabilityEvidence {
  readonly windingClass:
    | "uniform_single_layer"
    | "multilayer"
    | "other_or_unknown";
  readonly wheelerGeometryStatus:
    | "confirmed_W28_Figure_2_single_layer_helical"
    | "not_satisfied"
    | "unconfirmed";
}

export interface B05ApplicationGuardEvidence {
  readonly radiusMapping:
    | "method_derives_a_as_D_c_over_2"
    | "diameter_passed_to_radius_formula"
    | "unconfirmed";
  readonly sourceUnitMapping:
    | "canonical_SI_m_converted_to_exact_inch"
    | "millimetres_passed_directly_to_inch_formula"
    | "unconfirmed";
  readonly nagaokaFactorApplication:
    | "none"
    | "applied_again"
    | "unconfirmed";
}

export interface B05WheelerSingleLayerInput {
  /** Frozen D_c in canonical SI metres. */
  readonly currentPathDiameterM: number;
  /** Frozen b_env in canonical SI metres. */
  readonly windingEnvelopeLengthM: number;
  /** Frozen dimensionless electrical turn count N. */
  readonly electricalTurnCount: number;
  readonly geometryEvidence: B05GeometrySemanticEvidence;
  readonly applicabilityEvidence: B05ApplicabilityEvidence;
  readonly applicationGuardEvidence: B05ApplicationGuardEvidence;
}

export interface B05Warning {
  readonly sourceMethodId: "B-05";
  readonly predicate:
    | (typeof B05_WARNING_PREDICATES)[keyof typeof B05_WARNING_PREDICATES];
  readonly message: string;
}

export interface B05UpstreamGeometryWarning {
  readonly sourceMethodId: "B-01";
  readonly predicate: typeof B01_CURRENT_CENTROID_WARNING_PREDICATE;
  readonly message: string;
}

export interface B05UnitIdentityCheck {
  readonly identityId:
    | "a_m=inch_to_m(a_in)"
    | "b_env_m=inch_to_m(b_in)"
    | "L_microhenry=H_to_microhenry(L_H)";
  readonly actual: number;
  readonly reference: number;
  readonly absoluteResidual: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "unit_round_trip_identity_only";
  readonly passed: true;
}

export interface B05WheelerSingleLayerValue {
  readonly inductance: Readonly<{
    readonly quantityId: "L_Wheeler";
    readonly valueSi: number;
    readonly dimensionId: "inductance";
    readonly canonicalUnitId: "H";
  }>;
}

export interface B05WheelerSingleLayerSuccess {
  readonly methodId: typeof B05_METHOD_ID;
  readonly methodVersion: typeof B05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly B05Warning[];
  readonly upstreamGeometryWarnings: readonly B05UpstreamGeometryWarning[];
  readonly value: B05WheelerSingleLayerValue;
  readonly evidence: Readonly<{
    readonly geometrySnapshotId: string;
    readonly normalizedByMethodId: "B-01";
    readonly normalizedByMethodVersion: string;
    readonly geometrySemanticEvidence: Readonly<B05GeometrySemanticEvidence>;
    readonly applicabilityEvidence: Readonly<B05ApplicabilityEvidence>;
    readonly applicationGuardEvidence: Readonly<B05ApplicationGuardEvidence>;
    readonly geometry: Readonly<{
      readonly currentPathDiameter: Readonly<{
        readonly parameterId: "coil.current_path_diameter";
        readonly symbol: "D_c";
        readonly valueSi: number;
        readonly canonicalUnitId: "m";
      }>;
      readonly windingEnvelopeLength: Readonly<{
        readonly parameterId: "coil.winding_envelope_length";
        readonly symbol: "b_env";
        readonly localMethodSymbol: "b";
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
    }>;
    readonly equation: Readonly<{
      readonly equationId: "CALCULATION_CONTRACTS.md#B-05:Equation";
      readonly sourceEquation: "W28-Eq2";
      readonly originalEquation: "L[µH]=a_in^2*N^2/(9*a_in+10*b_in)";
      readonly projectMapping: "a=D_c/2; b=b_env";
      readonly sourceLengthUnit: "inch";
      readonly sourceOutputUnit: "uH";
      readonly substitution: Readonly<{
        readonly currentPathDiameterM: number;
        readonly radiusM: number;
        readonly windingEnvelopeLengthM: number;
        readonly electricalTurnCount: number;
        readonly radiusIn: number;
        readonly windingEnvelopeLengthIn: number;
        readonly radiusSquaredIn2: number;
        readonly turnsSquared: number;
        readonly numeratorIn2: number;
        readonly nineRadiusIn: number;
        readonly tenWindingEnvelopeLengthIn: number;
        readonly denominatorIn: number;
        readonly inductanceMicrohenry: number;
        readonly inductanceH: number;
      }>;
      readonly equation3Disposition: Readonly<{
        readonly sourceEquation: "W28-Eq3";
        readonly status: "reference_only_not_executed";
        readonly automaticSwitchApplied: false;
      }>;
    }>;
    readonly unitIdentityChecks: readonly B05UnitIdentityCheck[];
    readonly applicability: Readonly<{
      readonly bOverA: number;
      readonly equation2AccuracyDomain: "b>0.8a";
      readonly domainStatus:
        | "inside_stated_approximately_1_percent_domain"
        | "outside_or_at_stated_accuracy_domain";
      readonly approximatelyOnePercentClaimAvailable: boolean;
      readonly hardMethodSwitchApplied: false;
    }>;
    readonly warningPolicy: Readonly<{
      readonly automaticUnfrozenPhysicalThresholdsApplied: false;
      readonly singleTurnCategoricalWarningApplied: boolean;
      readonly unautomatedPredicates: readonly [
        "few turns, large pitch, or thick conductor",
      ];
      readonly reason:
        "no frozen numeric few-turn, large-pitch, or thick-conductor thresholds";
      readonly nagaokaFactorApplied: false;
    }>;
    readonly numericRepresentabilityPolicy: Readonly<{
      readonly binary64MinimumNormal: number;
      readonly boundaryKind: "machine_numeric_representability_only";
      readonly positiveSubnormalIntermediatePolicy: "fail_closed";
      readonly engineeringThreshold: false;
      readonly sourceEquationRearranged: false;
    }>;
    readonly recommendation: Readonly<{
      readonly eligibility: "not_eligible";
      readonly role: "quick_comparison_only";
      readonly isRecommended: false;
      readonly reason: string;
    }>;
    readonly assumptions: typeof B05_ASSUMPTIONS;
    readonly controlledSource: typeof B05_W28_CONTROLLED_SOURCE;
    readonly sourceRefs: typeof B05_SOURCE_REFS;
    readonly contractSourceRefs: typeof B05_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof B05_DERIVATION_REFS;
    readonly derivationResolutionReason:
      typeof B05_DERIVATION_RESOLUTION_REASON;
    readonly validationCaseIds: typeof B05_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof B05_METHOD_CHECK_IDS;
    readonly units: Readonly<{
      readonly currentPathDiameter: "m";
      readonly windingEnvelopeLength: "m";
      readonly sourceLengths: "inch";
      readonly sourceInductance: "uH";
      readonly canonicalInductance: "H";
      readonly dimensionalIdentity: "inch^2/inch=inch; W28 coefficient maps the source result to microhenry";
    }>;
  }>;
  readonly failure?: never;
}

export type B05FailureCode =
  | "B-05.input_schema_invalid"
  | "B-05.geometry_evidence_invalid"
  | "B-05.invalid_geometry_mapping"
  | "B-05.geometry_mapping_unconfirmed"
  | "B-05.geometry_snapshot_value_mismatch"
  | "B-05.current_path_basis_unresolved"
  | "B-05.applicability_evidence_invalid"
  | "B-05.applicability_unconfirmed"
  | "B-05.multilayer_not_applicable"
  | "B-05.wheeler_geometry_not_applicable"
  | "B-05.application_guard_invalid"
  | "B-05.application_guard_unconfirmed"
  | "B-05.radius_mapping_invalid"
  | "B-05.source_unit_mapping_invalid"
  | "B-05.repeated_finite_length_correction"
  | "B-05.current_path_diameter_invalid"
  | "B-05.winding_envelope_length_invalid"
  | "B-05.electrical_turn_count_invalid"
  | "B-05.numeric_resolution_invalid"
  | "B-05.unit_identity_failed";

export interface B05WheelerSingleLayerFailure {
  readonly methodId: typeof B05_METHOD_ID;
  readonly methodVersion: typeof B05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly B05Warning[];
  readonly failure: Readonly<{
    readonly code: B05FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly upstreamGeometryWarnings?: never;
}

export type B05WheelerSingleLayerOutcome =
  | B05WheelerSingleLayerSuccess
  | B05WheelerSingleLayerFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly B05Warning[];
const EMPTY_UPSTREAM_WARNINGS = Object.freeze(
  [],
) as readonly B05UpstreamGeometryWarning[];

function warning(
  predicate: B05Warning["predicate"],
  message: string,
): B05Warning {
  return Object.freeze({ sourceMethodId: "B-05", predicate, message });
}

function failure(
  status: B05WheelerSingleLayerFailure["status"],
  code: B05FailureCode,
  message: string,
  action: string,
  warnings: readonly B05Warning[] = EMPTY_WARNINGS,
): B05WheelerSingleLayerFailure {
  return Object.freeze({
    methodId: B05_METHOD_ID,
    methodVersion: B05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    failure: Object.freeze({ code, message, action }),
  });
}

type GeometryEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B05GeometrySemanticEvidence>;
      readonly upstreamWarnings: readonly B05UpstreamGeometryWarning[];
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B05WheelerSingleLayerFailure;
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
        "B-05.geometry_evidence_invalid",
        "B-05 geometry evidence must be an exact controlled plain-data record.",
        "Provide content-addressed same-snapshot B-01 evidence without accessors or extra fields.",
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
        "B-05.invalid_geometry_mapping",
        "B-05 requires the frozen D_c, b_env, and N semantics from one version-matched B-01 normalization.",
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
        "B-05.geometry_evidence_invalid",
        "B-01 evidence must carry finite snapshot-bound D_c and b_env values and a safe-integer N.",
        "Copy immutable normalized values from the identified geometry snapshot without coercion.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.geometry_evidence_invalid",
        "B-01 evidence must identify one content-addressed geometry snapshot.",
        "Provide geometry:<64 lowercase SHA-256 hex> from the controlled snapshot layer.",
      ),
    });
  }
  if (record.semanticMappingStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.geometry_mapping_unconfirmed",
        "D_c, b_env, and N are not confirmed to come from the same B-01 snapshot.",
        "Resolve geometry provenance before evaluating B-05.",
      ),
    });
  }
  if (record.semanticMappingStatus !== "confirmed_same_B01_snapshot") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.geometry_evidence_invalid",
        "semanticMappingStatus is not a controlled B-05 value.",
        "Use confirmed_same_B01_snapshot or unconfirmed without coercion.",
      ),
    });
  }

  let upstreamWarnings = EMPTY_UPSTREAM_WARNINGS;
  if (record.currentPathBasis === "ADR_0003_default_centroid_unresolved") {
    upstreamWarnings = Object.freeze([
      Object.freeze({
        sourceMethodId: "B-01" as const,
        predicate: B01_CURRENT_CENTROID_WARNING_PREDICATE,
        message:
          "B-01 supplied the warning-bearing ADR-0003 D_c:=D_m default; the upstream current-centroid warning remains visible and does not alter Wheeler's formula.",
      }),
    ]);
  } else if (record.currentPathBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.current_path_basis_unresolved",
        "The electromagnetic current-path diameter basis is unresolved.",
        "Bind D_c explicitly or use the warning-bearing ADR-0003 default in B-01.",
      ),
    });
  } else if (record.currentPathBasis !== "explicit_method_or_state_bound") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.geometry_evidence_invalid",
        "currentPathBasis is not a controlled B-05 value.",
        "Use the explicit, ADR-0003 default, or unresolved evidence enumeration.",
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
  return Object.freeze({ ok: true, evidence, upstreamWarnings });
}

type ApplicabilityEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B05ApplicabilityEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B05WheelerSingleLayerFailure;
    }>;

function validateApplicabilityEvidence(
  value: unknown,
): ApplicabilityEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "windingClass",
    "wheelerGeometryStatus",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.applicability_evidence_invalid",
        "B-05 applicability evidence must be an exact controlled plain-data record.",
        "Provide the winding class and W28 Figure 2 geometry status explicitly.",
      ),
    });
  }
  if (record.windingClass === "multilayer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-05.multilayer_not_applicable",
        "Wheeler Equation (2) in B-05 is the single-layer formula.",
        "Route genuine multilayer geometry to B-06 without substituting single-layer D_c or conductor thickness.",
      ),
    });
  }
  if (record.windingClass === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.applicability_unconfirmed",
        "The winding is not confirmed as uniform single-layer geometry.",
        "Resolve the B-01 winding class before using Wheeler Equation (2).",
      ),
    });
  }
  if (record.windingClass !== "uniform_single_layer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.applicability_evidence_invalid",
        "windingClass is not a controlled B-05 value.",
        "Use the frozen single-layer, multilayer, or unknown enumeration.",
      ),
    });
  }
  if (record.wheelerGeometryStatus === "not_satisfied") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-05.wheeler_geometry_not_applicable",
        "The declared coil does not satisfy W28 Figure 2 single-layer helical geometry.",
        "Use another approved geometry model, measurement, or FEM.",
      ),
    });
  }
  if (record.wheelerGeometryStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.applicability_unconfirmed",
        "W28 Figure 2 geometry applicability is unconfirmed.",
        "Confirm the single-layer helical geometry before evaluating B-05.",
      ),
    });
  }
  if (
    record.wheelerGeometryStatus !==
    "confirmed_W28_Figure_2_single_layer_helical"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.applicability_evidence_invalid",
        "wheelerGeometryStatus is not a controlled B-05 value.",
        "Use the frozen confirmed, not-satisfied, or unconfirmed enumeration.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      windingClass: "uniform_single_layer" as const,
      wheelerGeometryStatus:
        "confirmed_W28_Figure_2_single_layer_helical" as const,
    }),
  });
}

type ApplicationGuardResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B05ApplicationGuardEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B05WheelerSingleLayerFailure;
    }>;

function validateApplicationGuard(value: unknown): ApplicationGuardResult {
  const record = readExactPlainDataRecord(value, [
    "radiusMapping",
    "sourceUnitMapping",
    "nagaokaFactorApplication",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.application_guard_invalid",
        "B-05 application-guard evidence must be an exact controlled plain-data record.",
        "Declare the radius, source-unit, and correction boundaries explicitly.",
      ),
    });
  }
  if (record.radiusMapping === "diameter_passed_to_radius_formula") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.radius_mapping_invalid",
        "D_c cannot be inserted as Wheeler's radius a.",
        "Use the controlled a=D_c/2 mapping.",
        [
          warning(
            B05_WARNING_PREDICATES.diameterPassedToRadiusFormula,
            "The requested application passes a diameter to Wheeler's radius formula.",
          ),
        ],
      ),
    });
  }
  if (record.radiusMapping === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.application_guard_unconfirmed",
        "The D_c-to-a radius mapping is unconfirmed.",
        "Confirm that B-05 derives a=D_c/2 internally.",
      ),
    });
  }
  if (record.radiusMapping !== "method_derives_a_as_D_c_over_2") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.application_guard_invalid",
        "radiusMapping is not a controlled B-05 value.",
        "Use the frozen radius-mapping enumeration without coercion.",
      ),
    });
  }
  if (
    record.sourceUnitMapping ===
    "millimetres_passed_directly_to_inch_formula"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.source_unit_mapping_invalid",
        "Millimetres cannot be inserted directly into Wheeler's inch formula.",
        "Supply canonical SI metres and use the controlled exact m-to-inch boundary conversion.",
        [
          warning(
            B05_WARNING_PREDICATES.millimetresPassedToInchFormula,
            "The requested application bypasses the required inch conversion.",
          ),
        ],
      ),
    });
  }
  if (record.sourceUnitMapping === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.application_guard_unconfirmed",
        "The source-unit conversion boundary is unconfirmed.",
        "Confirm canonical SI metres to exact inches and microhenries to henries.",
      ),
    });
  }
  if (
    record.sourceUnitMapping !==
    "canonical_SI_m_converted_to_exact_inch"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.application_guard_invalid",
        "sourceUnitMapping is not a controlled B-05 value.",
        "Use the frozen unit-mapping enumeration without coercion.",
      ),
    });
  }
  if (record.nagaokaFactorApplication === "applied_again") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.repeated_finite_length_correction",
        "Wheeler Equation (2) already embeds its finite-length approximation and cannot be multiplied by a Nagaoka factor.",
        "Remove the repeated correction and compare B-04 and B-05 as separate methods.",
        [
          warning(
            B05_WARNING_PREDICATES.nagaokaFactorAppliedAgain,
            "The requested application applies a Nagaoka factor again.",
          ),
        ],
      ),
    });
  }
  if (record.nagaokaFactorApplication === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-05.application_guard_unconfirmed",
        "The finite-length correction path is unconfirmed.",
        "Confirm that no Nagaoka or other finite-length factor is applied to the Wheeler result.",
      ),
    });
  }
  if (record.nagaokaFactorApplication !== "none") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-05.application_guard_invalid",
        "nagaokaFactorApplication is not a controlled B-05 value.",
        "Use the frozen correction enumeration without coercion.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      radiusMapping: "method_derives_a_as_D_c_over_2" as const,
      sourceUnitMapping:
        "canonical_SI_m_converted_to_exact_inch" as const,
      nagaokaFactorApplication: "none" as const,
    }),
  });
}

function unitIdentityCheck(
  identityId: B05UnitIdentityCheck["identityId"],
  actual: number,
  reference: number,
): B05UnitIdentityCheck | null {
  const absoluteResidual = Math.abs(actual - reference);
  if (
    !Number.isFinite(absoluteResidual) ||
    !isWithinTolId(actual, reference)
  ) {
    return null;
  }
  return Object.freeze({
    identityId,
    actual,
    reference,
    absoluteResidual,
    toleranceId: TOL_ID.id,
    tolerancePurpose: "unit_round_trip_identity_only",
    passed: true,
  });
}

function isPositiveNormalBinary64(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= B05_BINARY64_MIN_NORMAL
  );
}

/** Evaluate W28 Equation (2) through its exact source-unit boundary. */
export function evaluateB05WheelerSingleLayer(
  input: unknown,
): B05WheelerSingleLayerOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "currentPathDiameterM",
    "windingEnvelopeLengthM",
    "electricalTurnCount",
    "geometryEvidence",
    "applicabilityEvidence",
    "applicationGuardEvidence",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-05.input_schema_invalid",
      "B-05 input must match the exact controlled canonical-SI schema.",
      "Remove extra fields and provide plain-data B-01, applicability, and application-guard evidence.",
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
  const guardResult = validateApplicationGuard(
    controlledInput.applicationGuardEvidence,
  );
  if (!guardResult.ok) {
    return guardResult.result;
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
      "B-05.current_path_diameter_invalid",
      "D_c must be a positive finite canonical-SI length.",
      "Provide coil.current_path_diameter, not D_i, D_o, or D_m.",
    );
  }
  if (
    typeof windingEnvelopeLengthM !== "number" ||
    !Number.isFinite(windingEnvelopeLengthM) ||
    windingEnvelopeLengthM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-05.winding_envelope_length_invalid",
      "b=b_env must be a positive finite canonical-SI length.",
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
      "B-05.electrical_turn_count_invalid",
      "N must be a positive safe-integer electrical turn count.",
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
      "B-05.geometry_snapshot_value_mismatch",
      "The top-level D_c, b_env, or N differs from the immutable value bound to the B-01 geometry snapshot.",
      "Use the exact snapshot-bound normalized values; a same-snapshot status string alone is not trusted.",
    );
  }

  if (
    currentPathDiameterM < B05_BINARY64_MIN_NORMAL ||
    windingEnvelopeLengthM < B05_BINARY64_MIN_NORMAL
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "A positive canonical-SI geometry input is subnormal in IEEE-754 binary64 and cannot enter the audited source-unit chain reliably.",
      "Use normally representable machine values; this is a numeric representation boundary, not an engineering geometry threshold.",
    );
  }

  const radiusM = currentPathDiameterM / 2;
  if (
    !isPositiveNormalBinary64(radiusM) ||
    radiusM * 2 !== currentPathDiameterM
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "The positive a=D_c/2 mapping overflowed, underflowed, or lost the diameter identity.",
      "Use representable canonical-SI geometry; no zero radius is substituted.",
    );
  }

  let radiusIn: number;
  let windingEnvelopeLengthIn: number;
  try {
    radiusIn = fromCanonicalSI(radiusM, "in", "length");
    windingEnvelopeLengthIn = fromCanonicalSI(
      windingEnvelopeLengthM,
      "in",
      "length",
    );
  } catch {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "The exact SI-to-inch source-unit conversion was not representable.",
      "Use finite representable canonical-SI geometry; do not bypass the unit layer.",
    );
  }
  if (
    !isPositiveNormalBinary64(radiusIn) ||
    !isPositiveNormalBinary64(windingEnvelopeLengthIn)
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "A positive SI length became zero, subnormal, negative, or non-finite in Wheeler's inch boundary.",
      "Use representable geometry; no source-unit placeholder is published.",
    );
  }

  const radiusSquaredIn2 = radiusIn * radiusIn;
  const turnsSquared = electricalTurnCount * electricalTurnCount;
  const numeratorIn2 = radiusSquaredIn2 * turnsSquared;
  const nineRadiusIn = 9 * radiusIn;
  const tenWindingEnvelopeLengthIn = 10 * windingEnvelopeLengthIn;
  const denominatorIn = nineRadiusIn + tenWindingEnvelopeLengthIn;
  if (
    !isPositiveNormalBinary64(radiusSquaredIn2) ||
    !isPositiveNormalBinary64(turnsSquared) ||
    !isPositiveNormalBinary64(numeratorIn2) ||
    (electricalTurnCount > 1 && numeratorIn2 === radiusSquaredIn2) ||
    !isPositiveNormalBinary64(nineRadiusIn) ||
    nineRadiusIn === radiusIn ||
    !isPositiveNormalBinary64(tenWindingEnvelopeLengthIn) ||
    tenWindingEnvelopeLengthIn === windingEnvelopeLengthIn ||
    !isPositiveNormalBinary64(denominatorIn) ||
    denominatorIn === nineRadiusIn ||
    denominatorIn === tenWindingEnvelopeLengthIn
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "A positive W28 numerator or denominator term overflowed, underflowed, became false zero, or was swallowed by binary64 addition.",
      "Use representable source-unit geometry and turns; do not algebraically replace the audited W28 substitution.",
    );
  }

  const inductanceMicrohenry = numeratorIn2 / denominatorIn;
  let inductanceH: number;
  try {
    inductanceH = toCanonicalSI(
      inductanceMicrohenry,
      "uH",
      "inductance",
    );
  } catch {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "The W28 microhenry result could not be converted to canonical SI.",
      "Use representable geometry and turns; no infinite result is published.",
    );
  }
  if (
    !isPositiveNormalBinary64(inductanceMicrohenry) ||
    !isPositiveNormalBinary64(inductanceH)
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "The positive W28 result overflowed, underflowed, or became false zero during µH-to-H conversion.",
      "Use representable geometry and turns; no zero or non-finite placeholder is published.",
    );
  }

  let radiusRoundTripM: number;
  let windingEnvelopeRoundTripM: number;
  let inductanceRoundTripMicrohenry: number;
  try {
    radiusRoundTripM = toCanonicalSI(radiusIn, "in", "length");
    windingEnvelopeRoundTripM = toCanonicalSI(
      windingEnvelopeLengthIn,
      "in",
      "length",
    );
    inductanceRoundTripMicrohenry = fromCanonicalSI(
      inductanceH,
      "uH",
      "inductance",
    );
  } catch {
    return failure(
      "invalid_input",
      "B-05.unit_identity_failed",
      "A controlled source-unit round trip was not representable.",
      "Treat this as a unit-boundary failure; TOL-ID is not an engineering tolerance.",
    );
  }
  const unitIdentityChecks = [
    unitIdentityCheck(
      "a_m=inch_to_m(a_in)",
      radiusRoundTripM,
      radiusM,
    ),
    unitIdentityCheck(
      "b_env_m=inch_to_m(b_in)",
      windingEnvelopeRoundTripM,
      windingEnvelopeLengthM,
    ),
    unitIdentityCheck(
      "L_microhenry=H_to_microhenry(L_H)",
      inductanceRoundTripMicrohenry,
      inductanceMicrohenry,
    ),
  ];
  if (unitIdentityChecks.some((candidate) => candidate === null)) {
    return failure(
      "invalid_input",
      "B-05.unit_identity_failed",
      "A synthetic W28 unit round trip failed TOL-ID.",
      "Treat this as an algebra/unit implementation failure, not a physical-accuracy result.",
    );
  }

  const bOverA = windingEnvelopeLengthIn / radiusIn;
  const equation2BoundaryIn = 0.8 * radiusIn;
  if (
    !isPositiveNormalBinary64(bOverA) ||
    !isPositiveNormalBinary64(equation2BoundaryIn)
  ) {
    return failure(
      "invalid_input",
      "B-05.numeric_resolution_invalid",
      "The positive b/a ratio or W28 b=0.8a domain boundary was not representable.",
      "Use representable geometry; no applicability placeholder is published.",
    );
  }
  const insideEquation2AccuracyDomain =
    windingEnvelopeLengthIn > equation2BoundaryIn;

  const warnings: B05Warning[] = [];
  if (!insideEquation2AccuracyDomain) {
    warnings.push(
      warning(
        B05_WARNING_PREDICATES.outsideEquation2AccuracyDomain,
        "W28 Equation (2) is being retained as a limited comparison at b<=0.8a; the paper's approximately 1% statement is unavailable and no hard method switch is applied.",
      ),
    );
  }
  if (electricalTurnCount === 1) {
    warnings.push(
      warning(
        B05_WARNING_PREDICATES.fewTurnsLargePitchOrThickConductor,
        "N=1 is the frozen categorical single-turn case and falls under Wheeler's explicit too-few-turns accuracy caution; no broader numeric few-turn threshold is inferred.",
      ),
    );
  }
  const frozenWarnings = Object.freeze(warnings);

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
      localMethodSymbol: "b" as const,
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
    inductance: Object.freeze({
      quantityId: "L_Wheeler" as const,
      valueSi: inductanceH,
      dimensionId: "inductance" as const,
      canonicalUnitId: "H" as const,
    }),
  });
  const equation = Object.freeze({
    equationId: "CALCULATION_CONTRACTS.md#B-05:Equation" as const,
    sourceEquation: "W28-Eq2" as const,
    originalEquation:
      "L[µH]=a_in^2*N^2/(9*a_in+10*b_in)" as const,
    projectMapping: "a=D_c/2; b=b_env" as const,
    sourceLengthUnit: "inch" as const,
    sourceOutputUnit: "uH" as const,
    substitution: Object.freeze({
      currentPathDiameterM,
      radiusM,
      windingEnvelopeLengthM,
      electricalTurnCount,
      radiusIn,
      windingEnvelopeLengthIn,
      radiusSquaredIn2,
      turnsSquared,
      numeratorIn2,
      nineRadiusIn,
      tenWindingEnvelopeLengthIn,
      denominatorIn,
      inductanceMicrohenry,
      inductanceH,
    }),
    equation3Disposition: Object.freeze({
      sourceEquation: "W28-Eq3" as const,
      status: "reference_only_not_executed" as const,
      automaticSwitchApplied: false as const,
    }),
  });
  const evidence = Object.freeze({
    geometrySnapshotId: geometryResult.evidence.geometrySnapshotId,
    normalizedByMethodId: "B-01" as const,
    normalizedByMethodVersion:
      geometryResult.evidence.normalizedByMethodVersion,
    geometrySemanticEvidence: geometryResult.evidence,
    applicabilityEvidence: applicabilityResult.evidence,
    applicationGuardEvidence: guardResult.evidence,
    geometry,
    equation,
    unitIdentityChecks: Object.freeze(
      unitIdentityChecks as readonly B05UnitIdentityCheck[],
    ),
    applicability: Object.freeze({
      bOverA,
      equation2AccuracyDomain: "b>0.8a" as const,
      domainStatus: insideEquation2AccuracyDomain
        ? ("inside_stated_approximately_1_percent_domain" as const)
        : ("outside_or_at_stated_accuracy_domain" as const),
      approximatelyOnePercentClaimAvailable:
        insideEquation2AccuracyDomain,
      hardMethodSwitchApplied: false as const,
    }),
    warningPolicy: Object.freeze({
      automaticUnfrozenPhysicalThresholdsApplied: false as const,
      singleTurnCategoricalWarningApplied: electricalTurnCount === 1,
      unautomatedPredicates: Object.freeze([
        B05_WARNING_PREDICATES.fewTurnsLargePitchOrThickConductor,
      ] as const),
      reason:
        "no frozen numeric few-turn, large-pitch, or thick-conductor thresholds" as const,
      nagaokaFactorApplied: false as const,
    }),
    numericRepresentabilityPolicy: Object.freeze({
      binary64MinimumNormal: B05_BINARY64_MIN_NORMAL,
      boundaryKind: "machine_numeric_representability_only" as const,
      positiveSubnormalIntermediatePolicy: "fail_closed" as const,
      engineeringThreshold: false as const,
      sourceEquationRearranged: false as const,
    }),
    recommendation: Object.freeze({
      eligibility: "not_eligible" as const,
      role: "quick_comparison_only" as const,
      isRecommended: false as const,
      reason: SPECIFICATION.recommendationReason,
    }),
    assumptions: B05_ASSUMPTIONS,
    controlledSource: B05_W28_CONTROLLED_SOURCE,
    sourceRefs: B05_SOURCE_REFS,
    contractSourceRefs: B05_CONTRACT_SOURCE_REFS,
    derivationRefs: B05_DERIVATION_REFS,
    derivationResolutionReason: B05_DERIVATION_RESOLUTION_REASON,
    validationCaseIds: B05_VALIDATION_CASE_IDS,
    methodCheckIds: B05_METHOD_CHECK_IDS,
    units: Object.freeze({
      currentPathDiameter: "m" as const,
      windingEnvelopeLength: "m" as const,
      sourceLengths: "inch" as const,
      sourceInductance: "uH" as const,
      canonicalInductance: "H" as const,
      dimensionalIdentity:
        "inch^2/inch=inch; W28 coefficient maps the source result to microhenry" as const,
    }),
  });

  return Object.freeze({
    methodId: B05_METHOD_ID,
    methodVersion: B05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status:
      frozenWarnings.length === 0 &&
      geometryResult.upstreamWarnings.length === 0
        ? "success"
        : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: frozenWarnings,
    upstreamGeometryWarnings: geometryResult.upstreamWarnings,
    value,
    evidence,
  });
}
