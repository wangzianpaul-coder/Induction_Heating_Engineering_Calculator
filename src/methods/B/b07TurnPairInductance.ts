/**
 * B-07 discrete coaxial-loop inductance summation boundary.
 *
 * The frozen contract permits a thin, solid, round, uniformly-current-carrying
 * single-turn self-inductance subpath.  Mutual inductance requires a released,
 * version-pinned complete-elliptic-integral provider.  No such provider is
 * present in the frozen dependency set, so every input containing an i<j pair
 * fails closed without publishing a candidate mutual or total value.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-07"));
const B01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-01"));

export const B07_METHOD_ID = "B-07" as const;
export const B07_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B07_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B07_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B07_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B07_DERIVATION_RESOLUTION_REASON =
  SPECIFICATION.derivationResolutionReason;
export const B07_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B07_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const B07_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;

/**
 * Smallest positive normal IEEE-754 binary64 value.  This is exclusively a
 * machine representability boundary, never an engineering applicability
 * threshold or a substitute for the unfrozen r_c/a assessment.
 */
export const B07_BINARY64_MIN_NORMAL = 2 ** -1022;

export const B07_RG12_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "RG12" as const,
  relativePath:
    "references/external_sources/nbsbulletinv8n1p1_A2b.pdf" as const,
  sha256:
    "73ec4b101d78494bb4d6d10312bc04df5313e678a27b008bd27e6bdadf85ff82" as const,
  mutualEquationLocation: "PDF6:eq1" as const,
  summationEquationLocation: "PDF123:eq81" as const,
  exampleLocation: "PDF126-128:Example57" as const,
  sourceManifestRef:
    "SOURCE_MANIFEST.csv#nbsbulletinv8n1p1_A2b.pdf" as const,
  originalUnitSystem: "electromagnetic_CGS" as const,
});

export const B07_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B07_SOURCE_REFS,
  contractSourceRefs: B07_CONTRACT_SOURCE_REFS,
  derivationRefs: B07_DERIVATION_REFS,
  derivationResolutionReason: B07_DERIVATION_RESOLUTION_REASON,
  validationCaseIds: B07_VALIDATION_CASE_IDS,
  methodCheckIds: B07_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  confidenceResolutionReason: SPECIFICATION.confidenceResolutionReason,
});

/**
 * Release gates are data/specification facts.  They do not create a child
 * method, warning ID, parameter ID, elliptic algorithm, or runtime activation.
 */
export const B07_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "partial_implementation_not_runtime_activated",
  runtimeActivation: "blocked",
  implementedSubpath:
    "single_turn_thin_solid_round_uniform_current_self_inductance_only",
  unavailableSubpath:
    "two_or_more_turn_mutual_inductance_and_total_summation",
  openGates: Object.freeze([
    Object.freeze({
      gateId: "B-07.elliptic-provider-release-gate",
      reason:
        "No approved, fixed-version, offline-packaged complete-elliptic-integral provider and error contract exists in the frozen dependency set; Basis authorization to use a reliable library or Carlson algorithm does not approve a locally invented solver or stopping tolerance.",
    }),
    Object.freeze({
      gateId: "B-07.DER-EM-SI-normalization-and-EM-L-004",
      reason:
        "The contract records DER-EM SI normalization as pending and EM-L-004 as blocked until the complete signed CGS-to-SI and Example 57 chain is available.",
    }),
    Object.freeze({
      gateId: "B-07.composite-confidence-child-split",
      reason:
        "Contract metadata records composite A/C confidence and requires a child split, but no approved child method IDs exist; this implementation does not invent them.",
    }),
    Object.freeze({
      gateId: "B-07.parameter-dictionary-alignment",
      reason:
        "The runtime parameter catalog registers coil.turn_center_z[] but does not register the contract IDs turn.radius[], conductor.round_radius, or current_distribution; no local parameter IDs are invented here.",
    }),
    Object.freeze({
      gateId: "B-07.stable-warning-ids-and-trigger-policy",
      reason:
        "The frozen contract supplies prose warning predicates but no stable warning IDs and no sourced numeric r_c/a threshold; every unsupported or unresolved scope therefore fails closed.",
    }),
  ]),
} as const);

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `B-07 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const B07_WARNING_PREDICATES = Object.freeze({
  sameTurnMutualSingularity: controlledWarningPredicate(
    "i=j mutual-inductance singularity" as const,
  ),
  thinWireScopeUnconfirmed: controlledWarningPredicate(
    "r_c/a is not small" as const,
  ),
  turnsIntersect: controlledWarningPredicate("turns intersect" as const),
  unsupportedSectionSelfConstant: controlledWarningPredicate(
    "hollow or rectangular section uses the -7/4 self term" as const,
  ),
  leadContributionMissing: controlledWarningPredicate(
    "lead contribution is missing" as const,
  ),
});

export const B07_ASSUMPTIONS = Object.freeze([
  "each_turn_is_a_planar_coaxial_circular_current_path",
  "turn_radii_and_axial_positions_are_explicitly_bound_to_one_B01_geometry_snapshot",
  "single_turn_self_path_uses_a_thin_solid_round_conductor_with_uniform_cross_section_current",
  "Lself=mu0*a*[ln(8*a/r_c)-7/4]",
  "single_turn_has_no_i_less_than_j_mutual_pair",
  "reported_boundary_is_winding_only_and_explicitly_excludes_leads",
  "no_hollow_rectangular_strong_skin_proximity_real_helix_or_lead_correction",
  "no_unfrozen_r_c_over_a_threshold",
] as const);

export type B07CurrentDistribution =
  | "uniform_cross_section"
  | "strong_skin_surface"
  | "other_or_unknown";

export interface B07GeometrySemanticEvidence {
  readonly normalizedByMethodId: "B-01";
  readonly normalizedByMethodVersion: string;
  readonly geometrySnapshotId: string;
  readonly semanticMappingStatus:
    | "confirmed_same_B01_snapshot"
    | "unconfirmed";
  readonly turnRadiusContractParameterId: "turn.radius[]";
  readonly turnRadiusBasis: "explicit_per_turn_current_path_radius";
  readonly normalizedTurnRadiiM: readonly number[];
  readonly turnAxialPositionContractParameterId: "turn.axial_position[]";
  readonly b01TurnCenterParameterId: "coil.turn_center_z[]";
  readonly axialPositionMapping: "explicit_identity_to_B01_turn_centers";
  readonly normalizedTurnAxialPositionsM: readonly number[];
  readonly coordinateSystemId: string;
  readonly turnOrdering: "ascending" | "descending";
  readonly geometrySourceRef: string;
}

export interface B07ModelScopeEvidence {
  readonly geometrySnapshotId: string;
  readonly planarCoaxialLoopStatus:
    | "confirmed"
    | "not_satisfied"
    | "unconfirmed";
  readonly conductorSection:
    | "thin_solid_round"
    | "hollow_round"
    | "rectangular"
    | "other_or_unknown";
  readonly thinSolidRoundApproximationStatus:
    | "confirmed_without_numeric_threshold"
    | "not_satisfied"
    | "unconfirmed";
  readonly conductorRoundRadiusContractParameterId:
    "conductor.round_radius";
  readonly normalizedConductorRoundRadiusM: number;
  readonly currentDistributionContractParameterId: "current_distribution";
  readonly currentDistribution: B07CurrentDistribution;
  readonly continuousHelixEffect:
    | "negligible_for_discrete_loop_model"
    | "significant"
    | "unconfirmed";
  readonly leadTreatment:
    | "winding_only_boundary_explicitly_excludes_leads"
    | "complete_terminal_boundary_with_unmodelled_leads"
    | "unconfirmed";
  readonly proximityEffect:
    | "negligible_for_discrete_loop_model"
    | "significant"
    | "unconfirmed";
  readonly turnIntersectionStatus:
    | "confirmed_non_intersecting"
    | "intersecting"
    | "unconfirmed";
  readonly conductorAssumptionSourceRef: string;
  readonly currentDistributionSourceRef: string;
  readonly omittedPathAssessmentSourceRef: string;
}

export interface B07TurnPairInductanceInput {
  /** Contract turn.radius[] in canonical SI metres. */
  readonly turnRadiiM: readonly number[];
  /** Contract turn.axial_position[] in canonical SI metres. */
  readonly turnAxialPositionsM: readonly number[];
  /** Contract conductor.round_radius in canonical SI metres. */
  readonly conductorRoundRadiusM: number;
  readonly currentDistribution: B07CurrentDistribution;
  readonly geometryEvidence: B07GeometrySemanticEvidence;
  readonly modelScopeEvidence: B07ModelScopeEvidence;
}

export interface B07SelfInductanceOutput {
  readonly quantityId: "Lself_i";
  readonly turnIndex: number;
  readonly valueSi: number;
  readonly dimensionId: "inductance";
  readonly canonicalUnitId: "H";
}

export interface B07MutualInductanceOutput {
  readonly quantityId: "Mij";
  readonly firstTurnIndex: number;
  readonly secondTurnIndex: number;
  readonly valueSi: number;
  readonly dimensionId: "inductance";
  readonly canonicalUnitId: "H";
}

export interface B07TurnPairInductanceSuccess {
  readonly methodId: typeof B07_METHOD_ID;
  readonly methodVersion: typeof B07_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly totalInductance: Readonly<{
      readonly quantityId: "L_total";
      readonly valueSi: number;
      readonly dimensionId: "inductance";
      readonly canonicalUnitId: "H";
    }>;
    readonly selfInductances: readonly Readonly<B07SelfInductanceOutput>[];
    readonly mutualInductances: readonly Readonly<B07MutualInductanceOutput>[];
  }>;
  readonly evidence: Readonly<{
    readonly geometrySnapshotId: string;
    readonly geometrySemanticEvidence: Readonly<B07GeometrySemanticEvidence>;
    readonly modelScopeEvidence: Readonly<B07ModelScopeEvidence>;
    readonly inputSnapshot: Readonly<{
      readonly turnRadiiM: readonly number[];
      readonly turnAxialPositionsM: readonly number[];
      readonly conductorRoundRadiusM: number;
      readonly currentDistribution: "uniform_cross_section";
    }>;
    readonly equation: Readonly<{
      readonly equationId: "CALCULATION_CONTRACTS.md#B-07:Equation";
      readonly selfEquation: "L_i=mu0*a_i*[ln(8*a_i/r_c)-7/4]";
      readonly totalEquation: "L_total=sum_i(L_i)+2*sum_i_less_than_j(M_ij)";
      readonly substitution: Readonly<{
        readonly turnIndex: 0;
        readonly radiusM: number;
        readonly conductorRoundRadiusM: number;
        readonly eightRadiusM: number;
        readonly logarithmArgument: number;
        readonly logarithmTerm: number;
        readonly finiteSectionConstant: 1.75;
        readonly logarithmMinusFiniteSectionConstant: number;
        readonly vacuumPermeabilityHPerM: typeof B07_VACUUM_PERMEABILITY_H_PER_M;
        readonly vacuumPermeabilityTimesRadiusH: number;
        readonly selfInductanceH: number;
        readonly mutualPairSumH: 0;
        readonly totalInductanceH: number;
      }>;
    }>;
    readonly mutualEvaluation: Readonly<{
      readonly status: "not_applicable";
      readonly pairCount: 0;
      readonly providerUsed: false;
      readonly reason: "a single turn has no i<j mutual-inductance pair";
    }>;
    readonly numericRepresentabilityPolicy: Readonly<{
      readonly binary64MinimumNormal: typeof B07_BINARY64_MIN_NORMAL;
      readonly boundaryKind: "machine_numeric_representability_only";
      readonly positiveSubnormalIntermediatePolicy: "fail_closed";
      readonly swallowedPositiveOrSubtractiveTermPolicy: "fail_closed";
      readonly engineeringThreshold: false;
      readonly rCOverAThresholdApplied: false;
    }>;
    readonly releaseReadiness: typeof B07_IMPLEMENTATION_READINESS;
    readonly assumptions: typeof B07_ASSUMPTIONS;
    readonly controlledSource: typeof B07_RG12_CONTROLLED_SOURCE;
    readonly sourceRefs: typeof B07_SOURCE_REFS;
    readonly contractSourceRefs: typeof B07_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof B07_DERIVATION_REFS;
    readonly derivationResolutionReason:
      typeof B07_DERIVATION_RESOLUTION_REASON;
    readonly validationCaseIds: typeof B07_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof B07_METHOD_CHECK_IDS;
    readonly validationState: Readonly<{
      readonly emL005: "specified";
      readonly emL006: "specified";
      readonly emL004: "blocked_pending_signed_CGS_to_SI_chain";
    }>;
    readonly units: Readonly<{
      readonly radius: "m";
      readonly axialPosition: "m";
      readonly conductorRoundRadius: "m";
      readonly inductance: "H";
      readonly dimensionalIdentity: "(H/m)*m=H";
    }>;
  }>;
  readonly failure?: never;
}

export type B07FailureCode =
  | "B-07.input_schema_invalid"
  | "B-07.turn_array_schema_invalid"
  | "B-07.turn_count_invalid"
  | "B-07.geometry_evidence_invalid"
  | "B-07.geometry_mapping_unconfirmed"
  | "B-07.geometry_snapshot_value_mismatch"
  | "B-07.model_scope_evidence_invalid"
  | "B-07.model_scope_unconfirmed"
  | "B-07.planar_coaxial_geometry_not_applicable"
  | "B-07.unsupported_conductor_section"
  | "B-07.thin_solid_round_approximation_not_applicable"
  | "B-07.strong_skin_not_applicable"
  | "B-07.continuous_helix_not_applicable"
  | "B-07.lead_boundary_not_applicable"
  | "B-07.proximity_not_applicable"
  | "B-07.turns_intersect"
  | "B-07.current_distribution_mismatch"
  | "B-07.numeric_input_invalid"
  | "B-07.conductor_radius_out_of_range"
  | "B-07.elliptic_provider_release_gate"
  | "B-07.numeric_resolution_invalid";

export interface B07TurnPairInductanceFailure {
  readonly methodId: typeof B07_METHOD_ID;
  readonly methodVersion: typeof B07_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: B07FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type B07TurnPairInductanceOutcome =
  | B07TurnPairInductanceSuccess
  | B07TurnPairInductanceFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function failure(
  status: B07TurnPairInductanceFailure["status"],
  code: B07FailureCode,
  message: string,
  action: string,
): B07TurnPairInductanceFailure {
  return Object.freeze({
    methodId: B07_METHOD_ID,
    methodVersion: B07_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isNonEmptyControlledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Snapshot a dense, ordinary array without invoking element accessors. */
function readDensePlainDataArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      return null;
    }
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number" ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      return null;
    }
    const length = lengthDescriptor.value;
    const keys = Reflect.ownKeys(value);
    // This rejects new Array(0xffffffff) before any length-bounded iteration.
    if (
      keys.length !== length + 1 ||
      keys.some((key) => typeof key !== "string") ||
      !keys.includes("length")
    ) {
      return null;
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function readFiniteNumberArray(value: unknown): readonly number[] | null {
  const values = readDensePlainDataArray(value);
  if (
    values === null ||
    values.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    return null;
  }
  return Object.freeze([...values]) as readonly number[];
}

type GeometryEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B07GeometrySemanticEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B07TurnPairInductanceFailure;
    }>;

function validateGeometryEvidence(value: unknown): GeometryEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "normalizedByMethodId",
    "normalizedByMethodVersion",
    "geometrySnapshotId",
    "semanticMappingStatus",
    "turnRadiusContractParameterId",
    "turnRadiusBasis",
    "normalizedTurnRadiiM",
    "turnAxialPositionContractParameterId",
    "b01TurnCenterParameterId",
    "axialPositionMapping",
    "normalizedTurnAxialPositionsM",
    "coordinateSystemId",
    "turnOrdering",
    "geometrySourceRef",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-07.geometry_evidence_invalid",
        "B-07 geometry evidence must be an exact controlled plain-data record.",
        "Provide accessor-free content-addressed B-01 geometry evidence with no missing or extra fields.",
      ),
    });
  }

  const radii = readFiniteNumberArray(record.normalizedTurnRadiiM);
  const positions = readFiniteNumberArray(record.normalizedTurnAxialPositionsM);
  if (
    record.normalizedByMethodId !== "B-01" ||
    record.normalizedByMethodVersion !== B01_SPECIFICATION.methodVersion ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    (record.semanticMappingStatus !== "confirmed_same_B01_snapshot" &&
      record.semanticMappingStatus !== "unconfirmed") ||
    record.turnRadiusContractParameterId !== "turn.radius[]" ||
    record.turnRadiusBasis !== "explicit_per_turn_current_path_radius" ||
    record.turnAxialPositionContractParameterId !== "turn.axial_position[]" ||
    record.b01TurnCenterParameterId !== "coil.turn_center_z[]" ||
    record.axialPositionMapping !==
      "explicit_identity_to_B01_turn_centers" ||
    (record.turnOrdering !== "ascending" &&
      record.turnOrdering !== "descending") ||
    !isNonEmptyControlledString(record.coordinateSystemId) ||
    !isNonEmptyControlledString(record.geometrySourceRef) ||
    radii === null ||
    positions === null
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-07.geometry_evidence_invalid",
        "B-07 geometry evidence does not match the frozen B-01 and B-07 mapping.",
        "Bind explicit per-turn current-path radii and B-01 turn centers to one geometry:<sha256> snapshot.",
      ),
    });
  }

  if (record.semanticMappingStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "B-07.geometry_mapping_unconfirmed",
        "The per-turn radius and axial-position mapping is not confirmed on one B-01 snapshot.",
        "Confirm the explicit D_c,i/2 radius mapping and B-01 turn-center identity before evaluation.",
      ),
    });
  }

  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      normalizedByMethodId: "B-01" as const,
      normalizedByMethodVersion: record.normalizedByMethodVersion,
      geometrySnapshotId: record.geometrySnapshotId,
      semanticMappingStatus: "confirmed_same_B01_snapshot" as const,
      turnRadiusContractParameterId: "turn.radius[]" as const,
      turnRadiusBasis: "explicit_per_turn_current_path_radius" as const,
      normalizedTurnRadiiM: radii,
      turnAxialPositionContractParameterId:
        "turn.axial_position[]" as const,
      b01TurnCenterParameterId: "coil.turn_center_z[]" as const,
      axialPositionMapping:
        "explicit_identity_to_B01_turn_centers" as const,
      normalizedTurnAxialPositionsM: positions,
      coordinateSystemId: record.coordinateSystemId,
      turnOrdering: record.turnOrdering,
      geometrySourceRef: record.geometrySourceRef,
    }),
  });
}

type ScopeEvidenceResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<B07ModelScopeEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: B07TurnPairInductanceFailure;
    }>;

function validateScopeEvidence(value: unknown): ScopeEvidenceResult {
  const record = readExactPlainDataRecord(value, [
    "geometrySnapshotId",
    "planarCoaxialLoopStatus",
    "conductorSection",
    "thinSolidRoundApproximationStatus",
    "conductorRoundRadiusContractParameterId",
    "normalizedConductorRoundRadiusM",
    "currentDistributionContractParameterId",
    "currentDistribution",
    "continuousHelixEffect",
    "leadTreatment",
    "proximityEffect",
    "turnIntersectionStatus",
    "conductorAssumptionSourceRef",
    "currentDistributionSourceRef",
    "omittedPathAssessmentSourceRef",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    ![
      "confirmed",
      "not_satisfied",
      "unconfirmed",
    ].includes(record.planarCoaxialLoopStatus as string) ||
    ![
      "thin_solid_round",
      "hollow_round",
      "rectangular",
      "other_or_unknown",
    ].includes(record.conductorSection as string) ||
    ![
      "confirmed_without_numeric_threshold",
      "not_satisfied",
      "unconfirmed",
    ].includes(record.thinSolidRoundApproximationStatus as string) ||
    record.conductorRoundRadiusContractParameterId !==
      "conductor.round_radius" ||
    typeof record.normalizedConductorRoundRadiusM !== "number" ||
    !Number.isFinite(record.normalizedConductorRoundRadiusM) ||
    record.currentDistributionContractParameterId !==
      "current_distribution" ||
    ![
      "uniform_cross_section",
      "strong_skin_surface",
      "other_or_unknown",
    ].includes(record.currentDistribution as string) ||
    ![
      "negligible_for_discrete_loop_model",
      "significant",
      "unconfirmed",
    ].includes(record.continuousHelixEffect as string) ||
    ![
      "winding_only_boundary_explicitly_excludes_leads",
      "complete_terminal_boundary_with_unmodelled_leads",
      "unconfirmed",
    ].includes(record.leadTreatment as string) ||
    ![
      "negligible_for_discrete_loop_model",
      "significant",
      "unconfirmed",
    ].includes(record.proximityEffect as string) ||
    ![
      "confirmed_non_intersecting",
      "intersecting",
      "unconfirmed",
    ].includes(record.turnIntersectionStatus as string) ||
    !isNonEmptyControlledString(record.conductorAssumptionSourceRef) ||
    !isNonEmptyControlledString(record.currentDistributionSourceRef) ||
    !isNonEmptyControlledString(record.omittedPathAssessmentSourceRef)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "B-07.model_scope_evidence_invalid",
        "B-07 model-scope evidence is malformed or uses an unfrozen categorical value.",
        "Provide explicit same-snapshot section, current-distribution, helix, lead, proximity, and intersection evidence.",
      ),
    });
  }

  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      geometrySnapshotId: record.geometrySnapshotId,
      planarCoaxialLoopStatus: record.planarCoaxialLoopStatus,
      conductorSection: record.conductorSection,
      thinSolidRoundApproximationStatus:
        record.thinSolidRoundApproximationStatus,
      conductorRoundRadiusContractParameterId:
        "conductor.round_radius" as const,
      normalizedConductorRoundRadiusM:
        record.normalizedConductorRoundRadiusM,
      currentDistributionContractParameterId:
        "current_distribution" as const,
      currentDistribution: record.currentDistribution,
      continuousHelixEffect: record.continuousHelixEffect,
      leadTreatment: record.leadTreatment,
      proximityEffect: record.proximityEffect,
      turnIntersectionStatus: record.turnIntersectionStatus,
      conductorAssumptionSourceRef: record.conductorAssumptionSourceRef,
      currentDistributionSourceRef: record.currentDistributionSourceRef,
      omittedPathAssessmentSourceRef: record.omittedPathAssessmentSourceRef,
    }) as Readonly<B07ModelScopeEvidence>,
  });
}

function arraysEqual(
  first: readonly number[],
  second: readonly number[],
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function isPositiveNormal(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= B07_BINARY64_MIN_NORMAL &&
    value > 0
  );
}

/**
 * Execute the frozen B-07 boundary.  This function is intentionally absent
 * from the public API and runtime method registry.
 */
export function calculateB07TurnPairInductance(
  input: B07TurnPairInductanceInput,
): B07TurnPairInductanceOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "turnRadiiM",
    "turnAxialPositionsM",
    "conductorRoundRadiusM",
    "currentDistribution",
    "geometryEvidence",
    "modelScopeEvidence",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-07.input_schema_invalid",
      "B-07 input must be an exact controlled plain-data record.",
      "Remove accessors, proxies, missing fields, symbols, and extra fields before evaluation.",
    );
  }

  const turnRadiiM = readFiniteNumberArray(controlledInput.turnRadiiM);
  const turnAxialPositionsM = readFiniteNumberArray(
    controlledInput.turnAxialPositionsM,
  );
  if (turnRadiiM === null || turnAxialPositionsM === null) {
    return failure(
      "invalid_input",
      "B-07.turn_array_schema_invalid",
      "Turn radii and axial positions must be dense accessor-free finite-number arrays.",
      "Provide canonical-SI arrays with one ordinary data element per turn.",
    );
  }
  if (
    turnRadiiM.length === 0 ||
    turnRadiiM.length !== turnAxialPositionsM.length
  ) {
    return failure(
      "invalid_input",
      "B-07.turn_count_invalid",
      "Turn radius and axial-position arrays must have the same non-zero length.",
      "Provide exactly one radius and one axial position for every electrical turn.",
    );
  }

  const geometryResult = validateGeometryEvidence(
    controlledInput.geometryEvidence,
  );
  if (!geometryResult.ok) {
    return geometryResult.result;
  }
  const scopeResult = validateScopeEvidence(controlledInput.modelScopeEvidence);
  if (!scopeResult.ok) {
    return scopeResult.result;
  }
  const scope = scopeResult.evidence;

  // Frozen, known out-of-domain facts precede machine-numeric checks and the
  // missing-provider gate.  No unsupported path is converted into a warning.
  if (scope.planarCoaxialLoopStatus === "not_satisfied") {
    return failure(
      "not_applicable",
      "B-07.planar_coaxial_geometry_not_applicable",
      "At least one turn is not a planar coaxial circular loop.",
      "Use an approved geometry-specific method, measurement, or EM FEM.",
    );
  }
  if (
    scope.conductorSection === "hollow_round" ||
    scope.conductorSection === "rectangular"
  ) {
    return failure(
      "not_applicable",
      "B-07.unsupported_conductor_section",
      "The -7/4 self-inductance constant is not approved for the declared conductor section.",
      "Use a separately approved hollow or rectangular section model, measurement, or FEM.",
    );
  }
  if (scope.thinSolidRoundApproximationStatus === "not_satisfied") {
    return failure(
      "not_applicable",
      "B-07.thin_solid_round_approximation_not_applicable",
      "The explicit engineering assessment rejects the thin-solid-round self-inductance approximation.",
      "Do not create an r_c/a threshold locally; use a supported model, measurement, or FEM.",
    );
  }
  if (
    controlledInput.currentDistribution === "strong_skin_surface" ||
    scope.currentDistribution === "strong_skin_surface"
  ) {
    return failure(
      "not_applicable",
      "B-07.strong_skin_not_applicable",
      "The frozen -7/4 self term assumes uniform cross-section current and cannot be used for strong skin current.",
      "Use a separately approved current-distribution/section model, measurement, or FEM.",
    );
  }
  if (scope.continuousHelixEffect === "significant") {
    return failure(
      "not_applicable",
      "B-07.continuous_helix_not_applicable",
      "The declared real continuous-helix effect is significant for the requested result.",
      "Use a helix-aware method, measurement, or EM FEM.",
    );
  }
  if (
    scope.leadTreatment ===
    "complete_terminal_boundary_with_unmodelled_leads"
  ) {
    return failure(
      "not_applicable",
      "B-07.lead_boundary_not_applicable",
      "Unmodelled leads are included in the requested complete terminal boundary.",
      "Either request an explicit winding-only boundary or provide a separately approved lead model/measurement.",
    );
  }
  if (scope.proximityEffect === "significant") {
    return failure(
      "not_applicable",
      "B-07.proximity_not_applicable",
      "The declared proximity effect is significant and is omitted by B-07.",
      "Use measurement or an approved EM field model.",
    );
  }
  if (scope.turnIntersectionStatus === "intersecting") {
    return failure(
      "not_applicable",
      "B-07.turns_intersect",
      "The content-addressed geometry assessment reports intersecting turns.",
      "Correct the geometry or use a geometry model that supports the declared conductors.",
    );
  }

  if (
    scope.planarCoaxialLoopStatus === "unconfirmed" ||
    scope.conductorSection === "other_or_unknown" ||
    scope.thinSolidRoundApproximationStatus === "unconfirmed" ||
    controlledInput.currentDistribution === "other_or_unknown" ||
    scope.currentDistribution === "other_or_unknown" ||
    scope.continuousHelixEffect === "unconfirmed" ||
    scope.leadTreatment === "unconfirmed" ||
    scope.proximityEffect === "unconfirmed" ||
    scope.turnIntersectionStatus === "unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "B-07.model_scope_unconfirmed",
      "One or more B-07 applicability assumptions are unconfirmed.",
      "Resolve the same-snapshot loop, section, current, helix, lead, proximity, and intersection evidence.",
    );
  }

  if (controlledInput.currentDistribution !== scope.currentDistribution) {
    return failure(
      "invalid_input",
      "B-07.current_distribution_mismatch",
      "The contract current_distribution differs from its same-snapshot scope evidence.",
      "Rebuild the input and evidence from one immutable model-state snapshot.",
    );
  }
  if (
    scope.geometrySnapshotId !== geometryResult.evidence.geometrySnapshotId
  ) {
    return failure(
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
      "Geometry and scope evidence identify different content-addressed snapshots.",
      "Bind every B-07 geometry and model-scope assertion to one geometry:<sha256> snapshot.",
    );
  }
  if (
    !arraysEqual(
      turnRadiiM,
      geometryResult.evidence.normalizedTurnRadiiM,
    ) ||
    !arraysEqual(
      turnAxialPositionsM,
      geometryResult.evidence.normalizedTurnAxialPositionsM,
    )
  ) {
    return failure(
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
      "Top-level turn radii or axial positions differ from the immutable B-01 snapshot evidence.",
      "Copy the exact canonical-SI turn arrays from the identified geometry snapshot without coercion.",
    );
  }

  const conductorRoundRadiusM = controlledInput.conductorRoundRadiusM;
  if (conductorRoundRadiusM !== scope.normalizedConductorRoundRadiusM) {
    return failure(
      "invalid_input",
      "B-07.geometry_snapshot_value_mismatch",
      "The top-level conductor.round_radius differs from its same-snapshot model-scope evidence.",
      "Copy the explicit canonical-SI conductor radius from the identified geometry snapshot without a hidden default.",
    );
  }
  if (
    typeof conductorRoundRadiusM !== "number" ||
    !Number.isFinite(conductorRoundRadiusM) ||
    conductorRoundRadiusM <= 0 ||
    turnRadiiM.some((radius) => radius <= 0)
  ) {
    return failure(
      "invalid_input",
      "B-07.numeric_input_invalid",
      "Turn radii and conductor round radius must be finite positive canonical-SI values.",
      "Provide physical radii in metres without NaN, infinity, zero, or negative values.",
    );
  }
  if (turnRadiiM.some((radius) => conductorRoundRadiusM >= radius)) {
    return failure(
      "invalid_input",
      "B-07.conductor_radius_out_of_range",
      "The contract requires 0 < r_c < a_i for every turn.",
      "Correct the explicit conductor and current-path radii; no default conductor radius is used.",
    );
  }

  for (let first = 0; first < turnRadiiM.length; first += 1) {
    for (let second = first + 1; second < turnRadiiM.length; second += 1) {
      if (
        turnRadiiM[first] === turnRadiiM[second] &&
        turnAxialPositionsM[first] === turnAxialPositionsM[second]
      ) {
        return failure(
          "not_applicable",
          "B-07.turns_intersect",
          "Two declared turn centerlines are identical; evaluating their mutual term would hit the i=j/coincident-loop singularity.",
          "Provide distinct non-intersecting turn geometry.",
        );
      }
    }
  }

  // None of the following self-formula machine checks are relevant to N>=2:
  // the missing controlled elliptic provider is the earlier release boundary.
  if (turnRadiiM.length >= 2) {
    return failure(
      "insufficient_data",
      "B-07.elliptic_provider_release_gate",
      "B-07 cannot evaluate any i<j mutual term because no approved fixed-version complete-elliptic-integral provider is released.",
      "Release and validate an offline elliptic provider with controlled source, version, error contract, DER-EM SI normalization, and EM-L-004 mapping.",
    );
  }

  const radiusM = turnRadiiM[0]!;
  if (
    !isPositiveNormal(radiusM) ||
    !isPositiveNormal(conductorRoundRadiusM)
  ) {
    return failure(
      "invalid_input",
      "B-07.numeric_resolution_invalid",
      "A positive self-inductance input is subnormal in IEEE-754 binary64.",
      "Use normally representable machine values; this is a numeric boundary, not an r_c/a engineering threshold.",
    );
  }

  const eightRadiusM = 8 * radiusM;
  if (!isPositiveNormal(eightRadiusM)) {
    return failure(
      "invalid_input",
      "B-07.numeric_resolution_invalid",
      "The source-ordered intermediate 8*a is not a finite positive normal binary64 value.",
      "Use representable canonical-SI geometry; no algebraic rearrangement or placeholder is published.",
    );
  }
  const logarithmArgument = eightRadiusM / conductorRoundRadiusM;
  if (!isPositiveNormal(logarithmArgument) || logarithmArgument <= 1) {
    return failure(
      "invalid_input",
      "B-07.numeric_resolution_invalid",
      "The logarithm argument 8*a/r_c is not a finite positive normal value greater than one.",
      "Use representable physical radii; no clipped logarithm argument is substituted.",
    );
  }
  const logarithmTerm = Math.log(logarithmArgument);
  const finiteSectionConstant = 1.75 as const;
  const logarithmMinusFiniteSectionConstant =
    logarithmTerm - finiteSectionConstant;
  if (
    !isPositiveNormal(logarithmTerm) ||
    !isPositiveNormal(logarithmMinusFiniteSectionConstant) ||
    logarithmMinusFiniteSectionConstant === logarithmTerm
  ) {
    return failure(
      "invalid_input",
      "B-07.numeric_resolution_invalid",
      "The logarithmic self-inductance bracket is non-representable or the -7/4 term was swallowed by binary64 resolution.",
      "Use representable geometry; never publish a bracket with a lost finite-section term.",
    );
  }

  const vacuumPermeabilityTimesRadiusH =
    B07_VACUUM_PERMEABILITY_H_PER_M * radiusM;
  const selfInductanceH =
    vacuumPermeabilityTimesRadiusH *
    logarithmMinusFiniteSectionConstant;
  if (
    !isPositiveNormal(vacuumPermeabilityTimesRadiusH) ||
    !isPositiveNormal(selfInductanceH)
  ) {
    return failure(
      "invalid_input",
      "B-07.numeric_resolution_invalid",
      "The single-turn self-inductance chain overflowed, underflowed, or became subnormal.",
      "Use representable canonical-SI geometry; no zero, infinity, or last intermediate is published.",
    );
  }

  const selfOutput = Object.freeze({
    quantityId: "Lself_i" as const,
    turnIndex: 0,
    valueSi: selfInductanceH,
    dimensionId: "inductance" as const,
    canonicalUnitId: "H" as const,
  });
  const value = Object.freeze({
    totalInductance: Object.freeze({
      quantityId: "L_total" as const,
      valueSi: selfInductanceH,
      dimensionId: "inductance" as const,
      canonicalUnitId: "H" as const,
    }),
    selfInductances: Object.freeze([selfOutput]),
    mutualInductances: Object.freeze([]) as readonly Readonly<B07MutualInductanceOutput>[],
  });

  const evidence = Object.freeze({
    geometrySnapshotId: geometryResult.evidence.geometrySnapshotId,
    geometrySemanticEvidence: geometryResult.evidence,
    modelScopeEvidence: scope,
    inputSnapshot: Object.freeze({
      turnRadiiM: Object.freeze([...turnRadiiM]),
      turnAxialPositionsM: Object.freeze([...turnAxialPositionsM]),
      conductorRoundRadiusM,
      currentDistribution: "uniform_cross_section" as const,
    }),
    equation: Object.freeze({
      equationId: "CALCULATION_CONTRACTS.md#B-07:Equation" as const,
      selfEquation:
        "L_i=mu0*a_i*[ln(8*a_i/r_c)-7/4]" as const,
      totalEquation:
        "L_total=sum_i(L_i)+2*sum_i_less_than_j(M_ij)" as const,
      substitution: Object.freeze({
        turnIndex: 0 as const,
        radiusM,
        conductorRoundRadiusM,
        eightRadiusM,
        logarithmArgument,
        logarithmTerm,
        finiteSectionConstant,
        logarithmMinusFiniteSectionConstant,
        vacuumPermeabilityHPerM: B07_VACUUM_PERMEABILITY_H_PER_M,
        vacuumPermeabilityTimesRadiusH,
        selfInductanceH,
        mutualPairSumH: 0 as const,
        totalInductanceH: selfInductanceH,
      }),
    }),
    mutualEvaluation: Object.freeze({
      status: "not_applicable" as const,
      pairCount: 0 as const,
      providerUsed: false as const,
      reason: "a single turn has no i<j mutual-inductance pair" as const,
    }),
    numericRepresentabilityPolicy: Object.freeze({
      binary64MinimumNormal: B07_BINARY64_MIN_NORMAL,
      boundaryKind: "machine_numeric_representability_only" as const,
      positiveSubnormalIntermediatePolicy: "fail_closed" as const,
      swallowedPositiveOrSubtractiveTermPolicy: "fail_closed" as const,
      engineeringThreshold: false as const,
      rCOverAThresholdApplied: false as const,
    }),
    releaseReadiness: B07_IMPLEMENTATION_READINESS,
    assumptions: B07_ASSUMPTIONS,
    controlledSource: B07_RG12_CONTROLLED_SOURCE,
    sourceRefs: B07_SOURCE_REFS,
    contractSourceRefs: B07_CONTRACT_SOURCE_REFS,
    derivationRefs: B07_DERIVATION_REFS,
    derivationResolutionReason: B07_DERIVATION_RESOLUTION_REASON,
    validationCaseIds: B07_VALIDATION_CASE_IDS,
    methodCheckIds: B07_METHOD_CHECK_IDS,
    validationState: Object.freeze({
      emL005: "specified" as const,
      emL006: "specified" as const,
      emL004: "blocked_pending_signed_CGS_to_SI_chain" as const,
    }),
    units: Object.freeze({
      radius: "m" as const,
      axialPosition: "m" as const,
      conductorRoundRadius: "m" as const,
      inductance: "H" as const,
      dimensionalIdentity: "(H/m)*m=H" as const,
    }),
  });

  return Object.freeze({
    methodId: B07_METHOD_ID,
    methodVersion: B07_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value,
    evidence,
  });
}
