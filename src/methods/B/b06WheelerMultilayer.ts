/**
 * B-06 Wheeler 1928 multilayer engineering approximation.
 *
 * Canonical SI enters and leaves this isolated method. Wheeler Figure 1,
 * Equation (1) is evaluated at its original inch/microhenry boundary so the
 * source substitution remains auditable. No single-layer geometry is derived
 * or reused here.
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

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-06"));

export const B06_METHOD_ID = "B-06" as const;
export const B06_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B06_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B06_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B06_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B06_DERIVATION_RESOLUTION_REASON =
  SPECIFICATION.derivationResolutionReason;
export const B06_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B06_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/**
 * Smallest positive normal IEEE-754 binary64 value. This is solely a machine
 * representability boundary: it is not an engineering tolerance, model-domain
 * threshold, source accuracy statement, or geometry routing criterion.
 */
export const B06_BINARY64_MIN_NORMAL = 2 ** -1022;

export const B06_W28_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "W28" as const,
  relativePath: "references/external_sources/wheeler1928.pdf" as const,
  byteLength: 733_950 as const,
  sha256:
    "1a17fef7ab82d4bcd33f030451cf9b63b8c173ee88741a1ace8a12c1239c90f1" as const,
  equation1Location: "PDF1:PRINT1398:FIG1:eq1" as const,
  visualVerificationStatus: "verified_primary_page" as const,
  sourceManifestRef: "SOURCE_MANIFEST.csv#wheeler1928.pdf" as const,
});

export const B06_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B06_SOURCE_REFS,
  contractSourceRefs: B06_CONTRACT_SOURCE_REFS,
  derivationRefs: B06_DERIVATION_REFS,
  derivationResolutionReason: B06_DERIVATION_RESOLUTION_REASON,
  validationCaseIds: B06_VALIDATION_CASE_IDS,
  methodCheckIds: B06_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
});

/**
 * These are activation/data-contract gates. They do not authorize local
 * warning IDs, a numeric interpretation of "about equal", or a hidden
 * single-layer-to-multilayer geometry adapter.
 */
export const B06_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated",
  runtimeActivation: "blocked",
  openGates: Object.freeze([
    Object.freeze({
      gateId: "B-06.stable-warning-ids",
      reason:
        "The frozen registry supplies B-06 prose warning predicates but no stable warning IDs.",
    }),
    Object.freeze({
      gateId: "B-06.independent-multilayer-geometry-snapshot-adapter",
      reason:
        "Runtime orchestration must publish the independent content-addressed a_ml, b_ml, c_ml, N and N_layer snapshot; B-01 deliberately rejects multilayer normalization.",
    }),
    Object.freeze({
      gateId: "B-06.multilayer-recommendation-router",
      reason:
        "The frozen registry leaves recommendationEligibility null and only excludes B-06 from the single-layer recommendation policy.",
    }),
  ]),
} as const);

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `B-06 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const B06_WARNING_PREDICATES = Object.freeze({
  layerCountBelowTwo: controlledWarningPredicate(
    "N_layer<2 -> not_applicable" as const,
  ),
  conductorSizeUsedAsRadialBuild: controlledWarningPredicate(
    "single-conductor radial size is used as c_ml" as const,
  ),
  singleLayerRadiusUsedAsMeanRadius: controlledWarningPredicate(
    "single-layer D_c is used as a_ml" as const,
  ),
  stronglyNonuniformDistribution: controlledWarningPredicate(
    "layer radii or turn distribution is strongly nonuniform" as const,
  ),
  unsupportedAccuracyClaim: controlledWarningPredicate(
    "approximately 1% is claimed outside the stated shape condition" as const,
  ),
});

export const B06_ASSUMPTIONS = Object.freeze([
  "genuine_multilayer_winding_cross_section",
  "W28_Figure_1_geometry",
  "turns_approximately_uniformly_distributed_through_multilayer_cross_section",
  "a_ml_is_complete_multilayer_mechanical_mean_radius",
  "b_ml_is_complete_multilayer_axial_length",
  "c_ml_is_total_radial_build_of_all_layers",
  "N_is_total_electrical_turn_count_and_N_layer_is_independent",
  "original_equation_1_inch_and_microhenry_units",
  "no_single_layer_D_c_D_m_b_env_or_conductor_d_rad_substitution",
] as const);

export interface B06GeometrySemanticEvidence {
  readonly geometrySnapshotId: string;
  readonly semanticMappingStatus:
    | "confirmed_same_content_addressed_snapshot"
    | "unconfirmed";
  readonly multilayerMeanRadiusParameterId: "coil.multilayer_mean_radius";
  readonly normalizedMultilayerMeanRadiusM: number;
  readonly multilayerAxialLengthParameterId: "coil.multilayer_axial_length";
  readonly normalizedMultilayerAxialLengthM: number;
  readonly multilayerRadialBuildParameterId: "coil.multilayer_radial_build";
  readonly normalizedMultilayerRadialBuildM: number;
  readonly electricalTurnCountParameterId: "coil.electrical_turn_count";
  readonly normalizedElectricalTurnCount: number;
  readonly layerCountParameterId: "coil.layer_count";
  readonly normalizedLayerCount: number;
  readonly meanRadiusBasis:
    | "complete_multilayer_mechanical_mean_radius"
    | "single_layer_D_c_or_D_m_radius"
    | "other_or_unknown";
  readonly axialLengthBasis:
    | "complete_multilayer_winding_axial_length"
    | "single_layer_or_ambiguous_length"
    | "other_or_unknown";
  readonly radialBuildBasis:
    | "total_radial_build_of_all_layers"
    | "single_conductor_radial_size"
    | "other_or_unknown";
  readonly electricalTurnCountBasis:
    | "total_electrical_turn_count_all_layers"
    | "conflated_with_layer_count"
    | "other_or_unknown";
  readonly layerCountBasis:
    | "counted_physical_winding_layers"
    | "inferred_from_single_conductor_thickness"
    | "other_or_unknown";
}

export interface B06ApplicabilityEvidence {
  readonly geometrySnapshotId: string;
  readonly windingClass:
    | "genuine_multilayer"
    | "single_layer"
    | "other_or_unknown";
  readonly figure1GeometryStatus:
    | "confirmed_approximately_W28_Figure_1"
    | "not_satisfied"
    | "unconfirmed";
  readonly turnDistributionStatus:
    | "confirmed_approximately_uniform"
    | "confirmed_strongly_nonuniform"
    | "unconfirmed";
  readonly denominatorTermComparabilityStatus:
    | "confirmed_about_equal_by_engineering_assessment"
    | "confirmed_not_about_equal"
    | "unconfirmed";
  readonly denominatorTermComparabilityBasis:
    | "content_addressed_engineering_geometry_assessment"
    | "not_assessed";
}

export interface B06ApplicationGuardEvidence {
  readonly geometrySnapshotId: string;
  readonly sourceUnitMapping:
    | "canonical_SI_m_converted_to_exact_inch"
    | "millimetres_or_other_units_passed_directly"
    | "unconfirmed";
  readonly accuracyClaimPolicy:
    | "method_reports_claim_only_from_frozen_shape_evidence"
    | "approximately_one_percent_claim_forced"
    | "unconfirmed";
}

export interface B06WheelerMultilayerInput {
  /** Frozen coil.multilayer_mean_radius, canonical SI metres. */
  readonly multilayerMeanRadiusM: number;
  /** Frozen coil.multilayer_axial_length, canonical SI metres. */
  readonly multilayerAxialLengthM: number;
  /** Frozen coil.multilayer_radial_build, canonical SI metres. */
  readonly multilayerRadialBuildM: number;
  /** Total electrical turns across all layers. */
  readonly electricalTurnCount: number;
  /** Physical layer count, separate from electrical turns. */
  readonly layerCount: number;
  readonly geometryEvidence: B06GeometrySemanticEvidence;
  readonly applicabilityEvidence: B06ApplicabilityEvidence;
  readonly applicationGuardEvidence: B06ApplicationGuardEvidence;
}

export interface B06Warning {
  readonly sourceMethodId: "B-06";
  readonly predicate:
    | (typeof B06_WARNING_PREDICATES)[keyof typeof B06_WARNING_PREDICATES];
  readonly message: string;
}

export interface B06UnitIdentityCheck {
  readonly identityId:
    | "a_ml_m=inch_to_m(a_in)"
    | "b_ml_m=inch_to_m(b_in)"
    | "c_ml_m=inch_to_m(c_in)"
    | "L_microhenry=H_to_microhenry(L_H)";
  readonly actual: number;
  readonly reference: number;
  readonly absoluteResidual: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "unit_round_trip_identity_only";
  readonly passed: true;
}

export interface B06WheelerMultilayerValue {
  readonly inductance: Readonly<{
    readonly quantityId: "L_Wheeler_multilayer";
    readonly valueSi: number;
    readonly dimensionId: "inductance";
    readonly canonicalUnitId: "H";
  }>;
}

export interface B06WheelerMultilayerSuccess {
  readonly methodId: typeof B06_METHOD_ID;
  readonly methodVersion: typeof B06_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly methodMapping: typeof B06_METHOD_MAPPING;
  readonly value: B06WheelerMultilayerValue;
  readonly evidence: Readonly<{
    readonly geometrySnapshotId: string;
    readonly geometrySemanticEvidence: Readonly<B06GeometrySemanticEvidence>;
    readonly applicabilityEvidence: Readonly<B06ApplicabilityEvidence>;
    readonly applicationGuardEvidence: Readonly<B06ApplicationGuardEvidence>;
    readonly geometry: Readonly<{
      readonly multilayerMeanRadius: Readonly<{
        readonly parameterId: "coil.multilayer_mean_radius";
        readonly symbol: "a_ml";
        readonly sourceSymbol: "a";
        readonly valueSi: number;
        readonly canonicalUnitId: "m";
      }>;
      readonly multilayerAxialLength: Readonly<{
        readonly parameterId: "coil.multilayer_axial_length";
        readonly symbol: "b_ml";
        readonly sourceSymbol: "b";
        readonly valueSi: number;
        readonly canonicalUnitId: "m";
      }>;
      readonly multilayerRadialBuild: Readonly<{
        readonly parameterId: "coil.multilayer_radial_build";
        readonly symbol: "c_ml";
        readonly sourceSymbol: "c";
        readonly valueSi: number;
        readonly canonicalUnitId: "m";
      }>;
      readonly electricalTurnCount: Readonly<{
        readonly parameterId: "coil.electrical_turn_count";
        readonly symbol: "N";
        readonly sourceSymbol: "n";
        readonly valueSi: number;
        readonly canonicalUnitId: "one";
      }>;
      readonly layerCount: Readonly<{
        readonly parameterId: "coil.layer_count";
        readonly symbol: "N_layer";
        readonly valueSi: number;
        readonly canonicalUnitId: "one";
        readonly sourceEquationVariable: false;
        readonly role: "multilayer_applicability_gate";
      }>;
    }>;
    readonly equation: Readonly<{
      readonly equationId: "CALCULATION_CONTRACTS.md#B-06:Equation";
      readonly sourceEquation: "W28-Figure1-Equation1";
      readonly originalEquation: "L[µH]=0.8*a_in^2*n^2/(6*a_in+9*b_in+10*c_in)";
      readonly projectMapping: "a=a_ml; b=b_ml; c=c_ml; n=N; N_layer is a separate applicability gate";
      readonly sourceLengthUnit: "inch";
      readonly sourceOutputUnit: "uH";
      readonly legacyTDisposition: "migration_alias_for_c_ml_only_not_runtime_field";
      readonly substitution: Readonly<{
        readonly multilayerMeanRadiusM: number;
        readonly multilayerAxialLengthM: number;
        readonly multilayerRadialBuildM: number;
        readonly electricalTurnCount: number;
        readonly layerCount: number;
        readonly meanRadiusIn: number;
        readonly axialLengthIn: number;
        readonly radialBuildIn: number;
        readonly meanRadiusSquaredIn2: number;
        readonly turnsSquared: number;
        readonly unscaledNumeratorIn2: number;
        readonly scaledNumeratorIn2: number;
        readonly sixMeanRadiusIn: number;
        readonly nineAxialLengthIn: number;
        readonly tenRadialBuildIn: number;
        readonly firstDenominatorSumIn: number;
        readonly denominatorIn: number;
        readonly inductanceMicrohenry: number;
        readonly inductanceH: number;
      }>;
    }>;
    readonly unitIdentityChecks: readonly B06UnitIdentityCheck[];
    readonly engineeringAccuracy: Readonly<{
      readonly sourceStatement: "about_1_percent_only_for_W28_Figure_1_shape_and_about_equal_denominator_terms";
      readonly denominatorTermComparabilityStatus: B06ApplicabilityEvidence["denominatorTermComparabilityStatus"];
      readonly approximatelyOnePercentClaimAvailable: boolean;
      readonly approximatelyOnePercentClaimPublished: boolean;
      readonly claimBasis:
        | "W28_primary_statement_plus_content_addressed_engineering_geometry_assessment"
        | "not_available";
      readonly numericShapeThresholdInvented: false;
      readonly denominatorTermRatiosUsedForRouting: false;
    }>;
    readonly warningPolicy: Readonly<{
      readonly stableWarningIdsPublished: false;
      readonly unfrozenNumericShapeThresholdApplied: false;
      readonly applicabilityUsesCategoricalContentAddressedEvidence: true;
    }>;
    readonly numericRepresentabilityPolicy: Readonly<{
      readonly binary64MinimumNormal: number;
      readonly boundaryKind: "machine_numeric_representability_only";
      readonly positiveSubnormalIntermediatePolicy: "fail_closed";
      readonly engineeringThreshold: false;
      readonly sourceEquationRearranged: false;
    }>;
    readonly recommendation: Readonly<{
      readonly registryEligibility: null;
      readonly role: "independent_multilayer_route_only";
      readonly participatesInSingleLayerRecommendationPolicy: false;
      readonly recommendedMethodDecision: "not_decided_by_B-06";
      readonly reason: string;
    }>;
    readonly assumptions: typeof B06_ASSUMPTIONS;
    readonly controlledSource: typeof B06_W28_CONTROLLED_SOURCE;
    readonly sourceRefs: typeof B06_SOURCE_REFS;
    readonly contractSourceRefs: typeof B06_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof B06_DERIVATION_REFS;
    readonly derivationResolutionReason:
      typeof B06_DERIVATION_RESOLUTION_REASON;
    readonly validationCaseIds: typeof B06_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof B06_METHOD_CHECK_IDS;
    readonly units: Readonly<{
      readonly multilayerMeanRadius: "m";
      readonly multilayerAxialLength: "m";
      readonly multilayerRadialBuild: "m";
      readonly sourceLengths: "inch";
      readonly sourceInductance: "uH";
      readonly canonicalInductance: "H";
      readonly dimensionalIdentity: "inch^2/inch=inch; W28 coefficient maps the source result to microhenry";
    }>;
  }>;
  readonly failure?: never;
}

export type B06FailureCode =
  | "B-06.input_schema_invalid"
  | "B-06.geometry_evidence_invalid"
  | "B-06.geometry_mapping_unconfirmed"
  | "B-06.geometry_parameter_mapping_invalid"
  | "B-06.mean_radius_mapping_invalid"
  | "B-06.axial_length_mapping_invalid"
  | "B-06.radial_build_mapping_invalid"
  | "B-06.turn_count_mapping_invalid"
  | "B-06.layer_count_mapping_invalid"
  | "B-06.geometry_snapshot_value_mismatch"
  | "B-06.evidence_snapshot_mismatch"
  | "B-06.multilayer_mean_radius_invalid"
  | "B-06.multilayer_axial_length_invalid"
  | "B-06.multilayer_radial_build_invalid"
  | "B-06.electrical_turn_count_invalid"
  | "B-06.layer_count_invalid"
  | "B-06.layer_count_not_applicable"
  | "B-06.applicability_evidence_invalid"
  | "B-06.applicability_unconfirmed"
  | "B-06.single_layer_not_applicable"
  | "B-06.figure1_geometry_not_applicable"
  | "B-06.nonuniform_distribution_not_applicable"
  | "B-06.application_guard_invalid"
  | "B-06.application_guard_unconfirmed"
  | "B-06.source_unit_mapping_invalid"
  | "B-06.unsupported_accuracy_claim"
  | "B-06.numeric_resolution_invalid"
  | "B-06.unit_identity_failed";

export interface B06WheelerMultilayerFailure {
  readonly methodId: typeof B06_METHOD_ID;
  readonly methodVersion: typeof B06_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly B06Warning[];
  readonly methodMapping: typeof B06_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: B06FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type B06WheelerMultilayerOutcome =
  | B06WheelerMultilayerSuccess
  | B06WheelerMultilayerFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly B06Warning[];

function warning(
  predicate: B06Warning["predicate"],
  message: string,
): B06Warning {
  return Object.freeze({ sourceMethodId: B06_METHOD_ID, predicate, message });
}

function failure(
  status: B06WheelerMultilayerFailure["status"],
  code: B06FailureCode,
  message: string,
  action: string,
  warnings: readonly B06Warning[] = EMPTY_WARNINGS,
): B06WheelerMultilayerFailure {
  return Object.freeze({
    methodId: B06_METHOD_ID,
    methodVersion: B06_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    methodMapping: B06_METHOD_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

type GeometryEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B06GeometrySemanticEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B06WheelerMultilayerFailure;
    }>;

function validateGeometryEvidence(value: unknown): GeometryEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "geometrySnapshotId",
    "semanticMappingStatus",
    "multilayerMeanRadiusParameterId",
    "normalizedMultilayerMeanRadiusM",
    "multilayerAxialLengthParameterId",
    "normalizedMultilayerAxialLengthM",
    "multilayerRadialBuildParameterId",
    "normalizedMultilayerRadialBuildM",
    "electricalTurnCountParameterId",
    "normalizedElectricalTurnCount",
    "layerCountParameterId",
    "normalizedLayerCount",
    "meanRadiusBasis",
    "axialLengthBasis",
    "radialBuildBasis",
    "electricalTurnCountBasis",
    "layerCountBasis",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "B-06 geometry evidence must be an exact controlled plain-data record.",
        "Provide one content-addressed independent multilayer geometry record without accessors or extra fields.",
      ),
    });
  }
  if (!isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "B-06 geometry evidence must identify a content-addressed geometry snapshot.",
        "Provide geometry:<64 lowercase SHA-256 hex> from the controlled snapshot layer.",
      ),
    });
  }
  if (record.semanticMappingStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The five independent B-06 geometry values are not confirmed to share one content-addressed snapshot.",
        "Resolve a_ml, b_ml, c_ml, N and N_layer provenance before evaluation.",
      ),
    });
  }
  if (record.semanticMappingStatus !== "confirmed_same_content_addressed_snapshot") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "semanticMappingStatus is not a controlled B-06 value.",
        "Use the frozen evidence enumeration without coercion.",
      ),
    });
  }

  const parameterMappingInvalid =
    record.multilayerMeanRadiusParameterId !== "coil.multilayer_mean_radius" ||
    record.multilayerAxialLengthParameterId !== "coil.multilayer_axial_length" ||
    record.multilayerRadialBuildParameterId !== "coil.multilayer_radial_build" ||
    record.electricalTurnCountParameterId !== "coil.electrical_turn_count" ||
    record.layerCountParameterId !== "coil.layer_count";
  if (parameterMappingInvalid) {
    const warnings: B06Warning[] = [];
    if (
      record.multilayerMeanRadiusParameterId === "coil.current_path_diameter" ||
      record.multilayerMeanRadiusParameterId === "coil.mean_diameter"
    ) {
      warnings.push(
        warning(
          B06_WARNING_PREDICATES.singleLayerRadiusUsedAsMeanRadius,
          "A single-layer D_c or D_m field was supplied where independent a_ml is required.",
        ),
      );
    }
    if (record.multilayerRadialBuildParameterId === "conductor.radial_size") {
      warnings.push(
        warning(
          B06_WARNING_PREDICATES.conductorSizeUsedAsRadialBuild,
          "Single-conductor d_rad was supplied where total multilayer c_ml is required.",
        ),
      );
    }
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_parameter_mapping_invalid",
        "B-06 requires the five exact independent multilayer parameter IDs.",
        "Do not substitute single-layer radii, envelope lengths, conductor dimensions, helix turns, or conflated turn/layer counts.",
        warnings,
      ),
    });
  }

  if (
    typeof record.normalizedMultilayerMeanRadiusM !== "number" ||
    !Number.isFinite(record.normalizedMultilayerMeanRadiusM) ||
    typeof record.normalizedMultilayerAxialLengthM !== "number" ||
    !Number.isFinite(record.normalizedMultilayerAxialLengthM) ||
    typeof record.normalizedMultilayerRadialBuildM !== "number" ||
    !Number.isFinite(record.normalizedMultilayerRadialBuildM) ||
    typeof record.normalizedElectricalTurnCount !== "number" ||
    !Number.isSafeInteger(record.normalizedElectricalTurnCount) ||
    typeof record.normalizedLayerCount !== "number" ||
    !Number.isSafeInteger(record.normalizedLayerCount)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "Snapshot-bound B-06 geometry values must be finite numbers and safe-integer counts.",
        "Copy immutable canonical values from the identified snapshot without coercion.",
      ),
    });
  }

  if (record.meanRadiusBasis === "single_layer_D_c_or_D_m_radius") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.mean_radius_mapping_invalid",
        "a_ml was derived from a single-layer D_c or D_m radius.",
        "Measure or define the complete multilayer winding cross-section mean radius independently.",
        [
          warning(
            B06_WARNING_PREDICATES.singleLayerRadiusUsedAsMeanRadius,
            "The requested mapping uses a single-layer radius as a_ml.",
          ),
        ],
      ),
    });
  }
  if (record.meanRadiusBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The mechanical basis of a_ml is unconfirmed.",
        "Confirm a_ml as the complete multilayer winding mean radius.",
      ),
    });
  }
  if (record.meanRadiusBasis !== "complete_multilayer_mechanical_mean_radius") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "meanRadiusBasis is not a controlled B-06 value.",
        "Use the frozen geometry-basis enumeration without coercion.",
      ),
    });
  }

  if (record.axialLengthBasis === "single_layer_or_ambiguous_length") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.axial_length_mapping_invalid",
        "b_ml was replaced by a single-layer or ambiguous coil length.",
        "Provide the complete multilayer winding axial length; do not reuse b_env, b_cc, Np, or an ambiguous legacy length.",
      ),
    });
  }
  if (record.axialLengthBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The mechanical basis of b_ml is unconfirmed.",
        "Confirm b_ml as the complete multilayer winding axial length.",
      ),
    });
  }
  if (record.axialLengthBasis !== "complete_multilayer_winding_axial_length") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "axialLengthBasis is not a controlled B-06 value.",
        "Use the frozen geometry-basis enumeration without coercion.",
      ),
    });
  }

  if (record.radialBuildBasis === "single_conductor_radial_size") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.radial_build_mapping_invalid",
        "c_ml was replaced by one conductor's radial size.",
        "Provide the total radial build of every winding layer.",
        [
          warning(
            B06_WARNING_PREDICATES.conductorSizeUsedAsRadialBuild,
            "The requested mapping uses single-conductor d_rad as c_ml.",
          ),
        ],
      ),
    });
  }
  if (record.radialBuildBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The mechanical basis of c_ml is unconfirmed.",
        "Confirm c_ml as the total radial build of all layers.",
      ),
    });
  }
  if (record.radialBuildBasis !== "total_radial_build_of_all_layers") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "radialBuildBasis is not a controlled B-06 value.",
        "Use the frozen geometry-basis enumeration without coercion.",
      ),
    });
  }

  if (record.electricalTurnCountBasis === "conflated_with_layer_count") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.turn_count_mapping_invalid",
        "N and N_layer were conflated.",
        "Provide total electrical turns and physical layer count as independent fields.",
      ),
    });
  }
  if (record.electricalTurnCountBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The basis of total electrical turn count N is unconfirmed.",
        "Confirm total electrical turns across all layers independently of N_layer.",
      ),
    });
  }
  if (
    record.electricalTurnCountBasis !==
    "total_electrical_turn_count_all_layers"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "electricalTurnCountBasis is not a controlled B-06 value.",
        "Use the frozen turn-count enumeration without coercion.",
      ),
    });
  }

  if (record.layerCountBasis === "inferred_from_single_conductor_thickness") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.layer_count_mapping_invalid",
        "N_layer was inferred from one conductor dimension or wall thickness.",
        "Provide a counted physical winding layer count; conductor thickness never proves multilayer geometry.",
      ),
    });
  }
  if (record.layerCountBasis === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.geometry_mapping_unconfirmed",
        "The physical layer-count basis is unconfirmed.",
        "Confirm a counted physical winding layer count independently of conductor thickness.",
      ),
    });
  }
  if (record.layerCountBasis !== "counted_physical_winding_layers") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.geometry_evidence_invalid",
        "layerCountBasis is not a controlled B-06 value.",
        "Use the frozen layer-count enumeration without coercion.",
      ),
    });
  }

  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      geometrySnapshotId: record.geometrySnapshotId,
      semanticMappingStatus: "confirmed_same_content_addressed_snapshot" as const,
      multilayerMeanRadiusParameterId:
        "coil.multilayer_mean_radius" as const,
      normalizedMultilayerMeanRadiusM:
        record.normalizedMultilayerMeanRadiusM,
      multilayerAxialLengthParameterId:
        "coil.multilayer_axial_length" as const,
      normalizedMultilayerAxialLengthM:
        record.normalizedMultilayerAxialLengthM,
      multilayerRadialBuildParameterId:
        "coil.multilayer_radial_build" as const,
      normalizedMultilayerRadialBuildM:
        record.normalizedMultilayerRadialBuildM,
      electricalTurnCountParameterId:
        "coil.electrical_turn_count" as const,
      normalizedElectricalTurnCount: record.normalizedElectricalTurnCount,
      layerCountParameterId: "coil.layer_count" as const,
      normalizedLayerCount: record.normalizedLayerCount,
      meanRadiusBasis:
        "complete_multilayer_mechanical_mean_radius" as const,
      axialLengthBasis:
        "complete_multilayer_winding_axial_length" as const,
      radialBuildBasis: "total_radial_build_of_all_layers" as const,
      electricalTurnCountBasis:
        "total_electrical_turn_count_all_layers" as const,
      layerCountBasis: "counted_physical_winding_layers" as const,
    }),
  });
}

type ApplicabilityEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B06ApplicabilityEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B06WheelerMultilayerFailure;
    }>;

function validateApplicabilityEvidence(
  value: unknown,
): ApplicabilityEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "geometrySnapshotId",
    "windingClass",
    "figure1GeometryStatus",
    "turnDistributionStatus",
    "denominatorTermComparabilityStatus",
    "denominatorTermComparabilityBasis",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "B-06 applicability evidence must be an exact content-addressed plain-data record.",
        "Provide the frozen categorical W28 Figure 1, distribution, and shape-assessment fields.",
      ),
    });
  }
  if (record.windingClass === "single_layer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-06.single_layer_not_applicable",
        "Wheeler Equation (1) is a genuine multilayer route, not a single-layer substitute.",
        "Route single-layer geometry independently to B-04/B-05 as their contracts permit.",
      ),
    });
  }
  if (record.windingClass === "other_or_unknown") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.applicability_unconfirmed",
        "The winding is not confirmed to be genuinely multilayer.",
        "Confirm the winding class without inferring it from conductor thickness or hollowness.",
      ),
    });
  }
  if (record.windingClass !== "genuine_multilayer") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "windingClass is not a controlled B-06 value.",
        "Use the frozen applicability enumeration without coercion.",
      ),
    });
  }

  if (record.figure1GeometryStatus === "not_satisfied") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-06.figure1_geometry_not_applicable",
        "The confirmed winding geometry does not resemble Wheeler Figure 1.",
        "Do not run Equation (1); use a supported multilayer method or measurement/FEM route.",
      ),
    });
  }
  if (record.figure1GeometryStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.applicability_unconfirmed",
        "Wheeler Figure 1 geometry applicability is unconfirmed.",
        "Complete the content-addressed multilayer geometry assessment.",
      ),
    });
  }
  if (
    record.figure1GeometryStatus !==
    "confirmed_approximately_W28_Figure_1"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "figure1GeometryStatus is not a controlled B-06 value.",
        "Use the frozen applicability enumeration without coercion.",
      ),
    });
  }

  if (record.turnDistributionStatus === "confirmed_strongly_nonuniform") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "B-06.nonuniform_distribution_not_applicable",
        "Layer radii or turn distribution is confirmed strongly nonuniform.",
        "Do not apply the uniform multilayer Wheeler approximation.",
        [
          warning(
            B06_WARNING_PREDICATES.stronglyNonuniformDistribution,
            "The controlled geometry assessment reports a strongly nonuniform multilayer distribution.",
          ),
        ],
      ),
    });
  }
  if (record.turnDistributionStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.applicability_unconfirmed",
        "Approximate uniformity through the multilayer cross-section is unconfirmed.",
        "Provide a content-addressed turn-distribution assessment; no numeric threshold is inferred.",
      ),
    });
  }
  if (
    record.turnDistributionStatus !== "confirmed_approximately_uniform"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "turnDistributionStatus is not a controlled B-06 value.",
        "Use the frozen applicability enumeration without coercion.",
      ),
    });
  }

  const comparabilityStatus = record.denominatorTermComparabilityStatus;
  if (
    comparabilityStatus !==
      "confirmed_about_equal_by_engineering_assessment" &&
    comparabilityStatus !== "confirmed_not_about_equal" &&
    comparabilityStatus !== "unconfirmed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "denominatorTermComparabilityStatus is not a controlled B-06 value.",
        "Use the frozen non-numeric assessment enumeration without coercion.",
      ),
    });
  }
  const comparabilityBasis = record.denominatorTermComparabilityBasis;
  if (
    comparabilityBasis !==
      "content_addressed_engineering_geometry_assessment" &&
    comparabilityBasis !== "not_assessed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "denominatorTermComparabilityBasis is not a controlled B-06 value.",
        "Use the frozen assessment-basis enumeration without coercion.",
      ),
    });
  }
  if (
    comparabilityStatus === "unconfirmed" &&
    comparabilityBasis !== "not_assessed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.applicability_evidence_invalid",
        "An unconfirmed denominator-term assessment cannot claim a completed content-addressed basis.",
        "Use not_assessed until an engineering geometry assessment is completed.",
      ),
    });
  }
  if (
    comparabilityStatus !== "unconfirmed" &&
    comparabilityBasis !==
      "content_addressed_engineering_geometry_assessment"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.applicability_unconfirmed",
        "The stated denominator-term comparability has no content-addressed engineering assessment basis.",
        "Bind the categorical assessment to the same geometry snapshot; do not invent a numeric ratio threshold.",
      ),
    });
  }

  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      geometrySnapshotId: record.geometrySnapshotId,
      windingClass: "genuine_multilayer" as const,
      figure1GeometryStatus:
        "confirmed_approximately_W28_Figure_1" as const,
      turnDistributionStatus:
        "confirmed_approximately_uniform" as const,
      denominatorTermComparabilityStatus: comparabilityStatus,
      denominatorTermComparabilityBasis: comparabilityBasis,
    }),
  });
}

type ApplicationGuardResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B06ApplicationGuardEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B06WheelerMultilayerFailure;
    }>;

function validateApplicationGuard(
  value: unknown,
  comparabilityStatus: B06ApplicabilityEvidence["denominatorTermComparabilityStatus"],
): ApplicationGuardResult {
  const record = readExactPlainDataRecord(value, [
    "geometrySnapshotId",
    "sourceUnitMapping",
    "accuracyClaimPolicy",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.application_guard_invalid",
        "B-06 application-guard evidence must be an exact content-addressed plain-data record.",
        "Provide the frozen source-unit and accuracy-claim controls without accessors or extra fields.",
      ),
    });
  }
  if (record.sourceUnitMapping === "millimetres_or_other_units_passed_directly") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.source_unit_mapping_invalid",
        "A non-inch source value would be passed directly into Wheeler Equation (1).",
        "Convert canonical SI metres to exact inches at the method boundary.",
      ),
    });
  }
  if (record.sourceUnitMapping === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.application_guard_unconfirmed",
        "The Wheeler inch/microhenry unit boundary is unconfirmed.",
        "Confirm canonical SI metres to exact inches and microhenries to henries.",
      ),
    });
  }
  if (
    record.sourceUnitMapping !== "canonical_SI_m_converted_to_exact_inch"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.application_guard_invalid",
        "sourceUnitMapping is not a controlled B-06 value.",
        "Use the frozen unit-mapping enumeration without coercion.",
      ),
    });
  }
  if (record.accuracyClaimPolicy === "approximately_one_percent_claim_forced") {
    const warnings =
      comparabilityStatus ===
      "confirmed_about_equal_by_engineering_assessment"
        ? EMPTY_WARNINGS
        : Object.freeze([
            warning(
              B06_WARNING_PREDICATES.unsupportedAccuracyClaim,
              "The application attempted to force Wheeler's approximately 1% statement without the stated shape evidence.",
            ),
          ]);
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.unsupported_accuracy_claim",
        "An approximately 1% label was forced instead of being derived from frozen shape evidence.",
        "Let B-06 publish the source statement only when the content-addressed assessment confirms about-equal denominator terms.",
        warnings,
      ),
    });
  }
  if (record.accuracyClaimPolicy === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-06.application_guard_unconfirmed",
        "The engineering-accuracy display policy is unconfirmed.",
        "Confirm that the method alone derives any source accuracy statement from frozen shape evidence.",
      ),
    });
  }
  if (
    record.accuracyClaimPolicy !==
    "method_reports_claim_only_from_frozen_shape_evidence"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-06.application_guard_invalid",
        "accuracyClaimPolicy is not a controlled B-06 value.",
        "Use the frozen accuracy-policy enumeration without coercion.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      geometrySnapshotId: record.geometrySnapshotId,
      sourceUnitMapping:
        "canonical_SI_m_converted_to_exact_inch" as const,
      accuracyClaimPolicy:
        "method_reports_claim_only_from_frozen_shape_evidence" as const,
    }),
  });
}

function unitIdentityCheck(
  identityId: B06UnitIdentityCheck["identityId"],
  actual: number,
  reference: number,
): B06UnitIdentityCheck | null {
  const absoluteResidual = Math.abs(actual - reference);
  if (!Number.isFinite(absoluteResidual) || !isWithinTolId(actual, reference)) {
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
    value >= B06_BINARY64_MIN_NORMAL
  );
}

/** Evaluate W28 Figure 1, Equation (1), through its source-unit boundary. */
export function evaluateB06WheelerMultilayer(
  input: unknown,
): B06WheelerMultilayerOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "multilayerMeanRadiusM",
    "multilayerAxialLengthM",
    "multilayerRadialBuildM",
    "electricalTurnCount",
    "layerCount",
    "geometryEvidence",
    "applicabilityEvidence",
    "applicationGuardEvidence",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-06.input_schema_invalid",
      "B-06 input must match the exact independent multilayer canonical-SI schema.",
      "Remove extra, legacy, single-layer, accessor, and symbol fields; provide the five distinct B-06 values and evidence records.",
    );
  }

  const geometryResult = validateGeometryEvidence(
    controlledInput.geometryEvidence,
  );
  if (!geometryResult.ok) {
    return geometryResult.result;
  }

  const {
    multilayerMeanRadiusM,
    multilayerAxialLengthM,
    multilayerRadialBuildM,
    electricalTurnCount,
    layerCount,
  } = controlledInput;
  if (
    typeof multilayerMeanRadiusM !== "number" ||
    !Number.isFinite(multilayerMeanRadiusM) ||
    multilayerMeanRadiusM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-06.multilayer_mean_radius_invalid",
      "a_ml must be a positive finite canonical-SI length.",
      "Provide coil.multilayer_mean_radius, never D_c/2 or an unconditional D_m/2.",
    );
  }
  if (
    typeof multilayerAxialLengthM !== "number" ||
    !Number.isFinite(multilayerAxialLengthM) ||
    multilayerAxialLengthM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-06.multilayer_axial_length_invalid",
      "b_ml must be a positive finite canonical-SI length.",
      "Provide the complete multilayer winding axial length.",
    );
  }
  if (
    typeof multilayerRadialBuildM !== "number" ||
    !Number.isFinite(multilayerRadialBuildM) ||
    multilayerRadialBuildM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-06.multilayer_radial_build_invalid",
      "c_ml must be a positive finite canonical-SI length.",
      "Provide the total radial build of all layers, never one conductor's d_rad.",
    );
  }
  if (
    typeof electricalTurnCount !== "number" ||
    !Number.isSafeInteger(electricalTurnCount) ||
    electricalTurnCount < 1
  ) {
    return failure(
      "invalid_input",
      "B-06.electrical_turn_count_invalid",
      "N must be a positive safe-integer total electrical turn count.",
      "Provide all-layer electrical turns independently of N_layer.",
    );
  }
  if (
    typeof layerCount !== "number" ||
    !Number.isSafeInteger(layerCount)
  ) {
    return failure(
      "invalid_input",
      "B-06.layer_count_invalid",
      "N_layer must be a safe-integer physical winding layer count.",
      "Provide a counted layer value without coercion or inference from conductor thickness.",
    );
  }

  if (
    geometryResult.evidence.normalizedMultilayerMeanRadiusM !==
      multilayerMeanRadiusM ||
    geometryResult.evidence.normalizedMultilayerAxialLengthM !==
      multilayerAxialLengthM ||
    geometryResult.evidence.normalizedMultilayerRadialBuildM !==
      multilayerRadialBuildM ||
    geometryResult.evidence.normalizedElectricalTurnCount !==
      electricalTurnCount ||
    geometryResult.evidence.normalizedLayerCount !== layerCount
  ) {
    return failure(
      "invalid_input",
      "B-06.geometry_snapshot_value_mismatch",
      "A top-level B-06 value differs from the immutable value bound to the geometry snapshot.",
      "Use exact snapshot-bound a_ml, b_ml, c_ml, N and N_layer values; a same-snapshot label alone is not trusted.",
    );
  }

  if (layerCount < 2) {
    return failure(
      "not_applicable",
      "B-06.layer_count_not_applicable",
      "N_layer<2 proves that the B-06 multilayer route is not applicable.",
      "Route the actual winding class independently; conductor thickness or hollowness does not create a second layer.",
      [
        warning(
          B06_WARNING_PREDICATES.layerCountBelowTwo,
          "The controlled physical layer count is below two.",
        ),
      ],
    );
  }

  if (
    multilayerMeanRadiusM < B06_BINARY64_MIN_NORMAL ||
    multilayerAxialLengthM < B06_BINARY64_MIN_NORMAL ||
    multilayerRadialBuildM < B06_BINARY64_MIN_NORMAL
  ) {
    return failure(
      "invalid_input",
      "B-06.numeric_resolution_invalid",
      "A positive canonical-SI geometry input is subnormal in IEEE-754 binary64 and cannot enter the audited source-unit chain reliably.",
      "Use normally representable machine values; this is a numeric representation boundary, not an engineering geometry threshold.",
    );
  }

  const applicabilityResult = validateApplicabilityEvidence(
    controlledInput.applicabilityEvidence,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.result;
  }
  const guardResult = validateApplicationGuard(
    controlledInput.applicationGuardEvidence,
    applicabilityResult.evidence.denominatorTermComparabilityStatus,
  );
  if (!guardResult.ok) {
    return guardResult.result;
  }
  const snapshotId = geometryResult.evidence.geometrySnapshotId;
  if (
    applicabilityResult.evidence.geometrySnapshotId !== snapshotId ||
    guardResult.evidence.geometrySnapshotId !== snapshotId
  ) {
    return failure(
      "invalid_input",
      "B-06.evidence_snapshot_mismatch",
      "Geometry, applicability, and application-guard evidence do not bind the same content-addressed snapshot.",
      "Rebuild all B-06 evidence from one immutable geometry snapshot.",
    );
  }

  let meanRadiusIn: number;
  let axialLengthIn: number;
  let radialBuildIn: number;
  try {
    meanRadiusIn = fromCanonicalSI(
      multilayerMeanRadiusM,
      "in",
      "length",
    );
    axialLengthIn = fromCanonicalSI(
      multilayerAxialLengthM,
      "in",
      "length",
    );
    radialBuildIn = fromCanonicalSI(
      multilayerRadialBuildM,
      "in",
      "length",
    );
  } catch {
    return failure(
      "invalid_input",
      "B-06.numeric_resolution_invalid",
      "The exact SI-to-inch source-unit conversion was not representable.",
      "Use finite representable canonical-SI multilayer geometry; do not bypass the unit layer.",
    );
  }
  if (
    !isPositiveNormalBinary64(meanRadiusIn) ||
    !isPositiveNormalBinary64(axialLengthIn) ||
    !isPositiveNormalBinary64(radialBuildIn)
  ) {
    return failure(
      "invalid_input",
      "B-06.numeric_resolution_invalid",
      "A positive SI length became zero, subnormal, negative, or non-finite at Wheeler's inch boundary.",
      "Use representable geometry; no source-unit placeholder is published.",
    );
  }

  const meanRadiusSquaredIn2 = meanRadiusIn * meanRadiusIn;
  const turnsSquared = electricalTurnCount * electricalTurnCount;
  const unscaledNumeratorIn2 = meanRadiusSquaredIn2 * turnsSquared;
  const scaledNumeratorIn2 = 0.8 * unscaledNumeratorIn2;
  const sixMeanRadiusIn = 6 * meanRadiusIn;
  const nineAxialLengthIn = 9 * axialLengthIn;
  const tenRadialBuildIn = 10 * radialBuildIn;
  const firstDenominatorSumIn = sixMeanRadiusIn + nineAxialLengthIn;
  const denominatorIn = firstDenominatorSumIn + tenRadialBuildIn;
  if (
    !isPositiveNormalBinary64(meanRadiusSquaredIn2) ||
    !isPositiveNormalBinary64(turnsSquared) ||
    !isPositiveNormalBinary64(unscaledNumeratorIn2) ||
    (electricalTurnCount > 1 &&
      unscaledNumeratorIn2 === meanRadiusSquaredIn2) ||
    !isPositiveNormalBinary64(scaledNumeratorIn2) ||
    scaledNumeratorIn2 >= unscaledNumeratorIn2 ||
    !isPositiveNormalBinary64(sixMeanRadiusIn) ||
    sixMeanRadiusIn === meanRadiusIn ||
    !isPositiveNormalBinary64(nineAxialLengthIn) ||
    nineAxialLengthIn === axialLengthIn ||
    !isPositiveNormalBinary64(tenRadialBuildIn) ||
    tenRadialBuildIn === radialBuildIn ||
    !isPositiveNormalBinary64(firstDenominatorSumIn) ||
    firstDenominatorSumIn === sixMeanRadiusIn ||
    firstDenominatorSumIn === nineAxialLengthIn ||
    !isPositiveNormalBinary64(denominatorIn) ||
    denominatorIn === firstDenominatorSumIn ||
    denominatorIn === tenRadialBuildIn
  ) {
    return failure(
      "invalid_input",
      "B-06.numeric_resolution_invalid",
      "A positive W28 numerator or denominator term overflowed, underflowed, became false zero, or was swallowed by binary64 arithmetic.",
      "Use representable source-unit geometry and turns; no algebraic replacement or dropped positive term is permitted.",
    );
  }

  const inductanceMicrohenry = scaledNumeratorIn2 / denominatorIn;
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
      "B-06.numeric_resolution_invalid",
      "The Wheeler microhenry result could not be converted to canonical SI.",
      "Use representable geometry and turns; no infinite result is published.",
    );
  }
  if (
    !isPositiveNormalBinary64(inductanceMicrohenry) ||
    !isPositiveNormalBinary64(inductanceH)
  ) {
    return failure(
      "invalid_input",
      "B-06.numeric_resolution_invalid",
      "The positive Wheeler result overflowed, became subnormal, underflowed, or became false zero during microhenry-to-henry conversion.",
      "Use representable geometry and turns; no zero or non-finite placeholder is published.",
    );
  }

  let meanRadiusRoundTripM: number;
  let axialLengthRoundTripM: number;
  let radialBuildRoundTripM: number;
  let inductanceRoundTripMicrohenry: number;
  try {
    meanRadiusRoundTripM = toCanonicalSI(meanRadiusIn, "in", "length");
    axialLengthRoundTripM = toCanonicalSI(axialLengthIn, "in", "length");
    radialBuildRoundTripM = toCanonicalSI(radialBuildIn, "in", "length");
    inductanceRoundTripMicrohenry = fromCanonicalSI(
      inductanceH,
      "uH",
      "inductance",
    );
  } catch {
    return failure(
      "invalid_input",
      "B-06.unit_identity_failed",
      "A controlled Wheeler source-unit round trip was not representable.",
      "Treat this as a unit-boundary failure; TOL-ID is not an engineering tolerance.",
    );
  }
  const unitIdentityChecks = [
    unitIdentityCheck(
      "a_ml_m=inch_to_m(a_in)",
      meanRadiusRoundTripM,
      multilayerMeanRadiusM,
    ),
    unitIdentityCheck(
      "b_ml_m=inch_to_m(b_in)",
      axialLengthRoundTripM,
      multilayerAxialLengthM,
    ),
    unitIdentityCheck(
      "c_ml_m=inch_to_m(c_in)",
      radialBuildRoundTripM,
      multilayerRadialBuildM,
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
      "B-06.unit_identity_failed",
      "A synthetic Wheeler unit round trip failed TOL-ID.",
      "Treat this as an algebra/unit implementation failure, not a physical-accuracy result.",
    );
  }

  const approximatelyOnePercentClaimAvailable =
    applicabilityResult.evidence.denominatorTermComparabilityStatus ===
    "confirmed_about_equal_by_engineering_assessment";
  const geometry = Object.freeze({
    multilayerMeanRadius: Object.freeze({
      parameterId: "coil.multilayer_mean_radius" as const,
      symbol: "a_ml" as const,
      sourceSymbol: "a" as const,
      valueSi: multilayerMeanRadiusM,
      canonicalUnitId: "m" as const,
    }),
    multilayerAxialLength: Object.freeze({
      parameterId: "coil.multilayer_axial_length" as const,
      symbol: "b_ml" as const,
      sourceSymbol: "b" as const,
      valueSi: multilayerAxialLengthM,
      canonicalUnitId: "m" as const,
    }),
    multilayerRadialBuild: Object.freeze({
      parameterId: "coil.multilayer_radial_build" as const,
      symbol: "c_ml" as const,
      sourceSymbol: "c" as const,
      valueSi: multilayerRadialBuildM,
      canonicalUnitId: "m" as const,
    }),
    electricalTurnCount: Object.freeze({
      parameterId: "coil.electrical_turn_count" as const,
      symbol: "N" as const,
      sourceSymbol: "n" as const,
      valueSi: electricalTurnCount,
      canonicalUnitId: "one" as const,
    }),
    layerCount: Object.freeze({
      parameterId: "coil.layer_count" as const,
      symbol: "N_layer" as const,
      valueSi: layerCount,
      canonicalUnitId: "one" as const,
      sourceEquationVariable: false as const,
      role: "multilayer_applicability_gate" as const,
    }),
  });
  const equation = Object.freeze({
    equationId: "CALCULATION_CONTRACTS.md#B-06:Equation" as const,
    sourceEquation: "W28-Figure1-Equation1" as const,
    originalEquation:
      "L[µH]=0.8*a_in^2*n^2/(6*a_in+9*b_in+10*c_in)" as const,
    projectMapping:
      "a=a_ml; b=b_ml; c=c_ml; n=N; N_layer is a separate applicability gate" as const,
    sourceLengthUnit: "inch" as const,
    sourceOutputUnit: "uH" as const,
    legacyTDisposition:
      "migration_alias_for_c_ml_only_not_runtime_field" as const,
    substitution: Object.freeze({
      multilayerMeanRadiusM,
      multilayerAxialLengthM,
      multilayerRadialBuildM,
      electricalTurnCount,
      layerCount,
      meanRadiusIn,
      axialLengthIn,
      radialBuildIn,
      meanRadiusSquaredIn2,
      turnsSquared,
      unscaledNumeratorIn2,
      scaledNumeratorIn2,
      sixMeanRadiusIn,
      nineAxialLengthIn,
      tenRadialBuildIn,
      firstDenominatorSumIn,
      denominatorIn,
      inductanceMicrohenry,
      inductanceH,
    }),
  });
  const value = Object.freeze({
    inductance: Object.freeze({
      quantityId: "L_Wheeler_multilayer" as const,
      valueSi: inductanceH,
      dimensionId: "inductance" as const,
      canonicalUnitId: "H" as const,
    }),
  });
  const evidence = Object.freeze({
    geometrySnapshotId: snapshotId,
    geometrySemanticEvidence: geometryResult.evidence,
    applicabilityEvidence: applicabilityResult.evidence,
    applicationGuardEvidence: guardResult.evidence,
    geometry,
    equation,
    unitIdentityChecks: Object.freeze(
      unitIdentityChecks as readonly B06UnitIdentityCheck[],
    ),
    engineeringAccuracy: Object.freeze({
      sourceStatement:
        "about_1_percent_only_for_W28_Figure_1_shape_and_about_equal_denominator_terms" as const,
      denominatorTermComparabilityStatus:
        applicabilityResult.evidence.denominatorTermComparabilityStatus,
      approximatelyOnePercentClaimAvailable,
      approximatelyOnePercentClaimPublished:
        approximatelyOnePercentClaimAvailable,
      claimBasis: approximatelyOnePercentClaimAvailable
        ? ("W28_primary_statement_plus_content_addressed_engineering_geometry_assessment" as const)
        : ("not_available" as const),
      numericShapeThresholdInvented: false as const,
      denominatorTermRatiosUsedForRouting: false as const,
    }),
    warningPolicy: Object.freeze({
      stableWarningIdsPublished: false as const,
      unfrozenNumericShapeThresholdApplied: false as const,
      applicabilityUsesCategoricalContentAddressedEvidence: true as const,
    }),
    numericRepresentabilityPolicy: Object.freeze({
      binary64MinimumNormal: B06_BINARY64_MIN_NORMAL,
      boundaryKind: "machine_numeric_representability_only" as const,
      positiveSubnormalIntermediatePolicy: "fail_closed" as const,
      engineeringThreshold: false as const,
      sourceEquationRearranged: false as const,
    }),
    recommendation: Object.freeze({
      registryEligibility: null,
      role: "independent_multilayer_route_only" as const,
      participatesInSingleLayerRecommendationPolicy: false as const,
      recommendedMethodDecision: "not_decided_by_B-06" as const,
      reason: SPECIFICATION.recommendationReason,
    }),
    assumptions: B06_ASSUMPTIONS,
    controlledSource: B06_W28_CONTROLLED_SOURCE,
    sourceRefs: B06_SOURCE_REFS,
    contractSourceRefs: B06_CONTRACT_SOURCE_REFS,
    derivationRefs: B06_DERIVATION_REFS,
    derivationResolutionReason: B06_DERIVATION_RESOLUTION_REASON,
    validationCaseIds: B06_VALIDATION_CASE_IDS,
    methodCheckIds: B06_METHOD_CHECK_IDS,
    units: Object.freeze({
      multilayerMeanRadius: "m" as const,
      multilayerAxialLength: "m" as const,
      multilayerRadialBuild: "m" as const,
      sourceLengths: "inch" as const,
      sourceInductance: "uH" as const,
      canonicalInductance: "H" as const,
      dimensionalIdentity:
        "inch^2/inch=inch; W28 coefficient maps the source result to microhenry" as const,
    }),
  });

  return Object.freeze({
    methodId: B06_METHOD_ID,
    methodVersion: B06_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNING_IDS,
    methodMapping: B06_METHOD_MAPPING,
    value,
    evidence,
  });
}
