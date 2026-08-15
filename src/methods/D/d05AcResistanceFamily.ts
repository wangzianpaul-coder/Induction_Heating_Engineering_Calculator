/**
 * D-05 AC-resistance family isolation boundary.
 *
 * The frozen D-05 record is a parent family and has no approved child method
 * IDs.  This module therefore exposes only the two frozen route strings inside
 * the parent result.  It is deliberately absent from the runtime registry and
 * public API.  No Kelvin/Bessel solver, proximity factor, hidden correction,
 * or child method ID is introduced here.
 */

import { LOADED_STATES, type LoadedState } from "../../domain/electrical.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  parameterId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "../../registries/parameterCatalog.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-05"));
const D01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-01"));
const D02_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-02"));
const D03_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-03"));
const D04_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-04"));

export const D05_METHOD_ID = "D-05" as const;
export const D05_METHOD_VERSION = SPECIFICATION.methodVersion;
export const D05_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const D05_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const D05_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const D05_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const D05_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const D05_INTERNAL_ROUTES = Object.freeze([
  "surface_skin_screening_round",
  "measurement_identified",
] as const);
export type D05InternalRoute = (typeof D05_INTERNAL_ROUTES)[number];

/** IEEE-754 binary64 machine boundary, never an engineering threshold. */
export const D05_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D05_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: D05_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalInputOrIntermediatePolicy: "fail_closed" as const,
  overflowFalseZeroAndSwallowedTermPolicy: "fail_closed" as const,
  engineeringThresholdsAdded: false as const,
  sourceEquationRearranged: false as const,
});

export const D05_CONTROLLED_SOURCE_FILES = Object.freeze({
  RG12: Object.freeze({
    relativePath:
      "references/external_sources/nbsbulletinv8n1p1_A2b.pdf" as const,
    sha256:
      "73ec4b101d78494bb4d6d10312bc04df5313e678a27b008bd27e6bdadf85ff82" as const,
    reviewedPages: "PDF172-187" as const,
    use:
      "future_full_frequency_candidate_only_not_implemented_by_D05" as const,
  }),
  DHT: Object.freeze({
    relativePath:
      "references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf" as const,
    sha256:
      "33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98" as const,
    reviewedPages: "PDF8,17-18" as const,
    use:
      "proximity_geometry_and_operating_frequency_measurement_basis" as const,
  }),
});

/** Read-only mapping of validation/protocols/MINIMUM_VALIDATION_PLAN.md. */
export const D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING = Object.freeze({
  validationCaseId: "EXP-RAC-001" as const,
  releaseStatus: "specified_not_executed" as const,
  matrix:
    "3_copper_temperatures_x_3_frequencies_x_3_current_levels_x_unloaded_and_installed_states" as const,
  calorimetryCrossCheckRequired: true as const,
  requiredRecords: Object.freeze([
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
  ] as const),
  calibrationAndValidationDataSeparated: true as const,
  inventedAcceptancePercentage: false as const,
  singleMeasurementIsReleaseValidation: false as const,
});

const REGISTERED_D05_PARAMETER_IDS = Object.freeze(
  PARAMETER_REGISTRY.values()
    .filter((record) =>
      record.consumingMethods.some((candidate) => candidate === D05_METHOD_ID),
    )
    .map((record) => record.parameterId),
);

function hasRegisteredParameterId(candidate: string): boolean {
  try {
    return PARAMETER_REGISTRY.find(parameterId(candidate)) !== undefined;
  } catch {
    return false;
  }
}

const REGISTERED_CONTRACT_INPUT_IDS = Object.freeze(
  SPECIFICATION.inputParameterIds.filter((candidate) =>
    hasRegisteredParameterId(candidate),
  ),
);

/**
 * Release gates are frozen-data observations. They do not create method,
 * warning, parameter, or validation IDs and do not activate the parent.
 */
export const D05_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "partial_implementation_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  parentRequiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  approvedChildMethodIds: Object.freeze([]) as readonly [],
  internalRoutesAreNotMethodIds: true as const,
  implementedInternalRoutes: D05_INTERNAL_ROUTES,
  unavailableScopes: Object.freeze([
    "full_frequency_Kelvin_Bessel_internal_impedance",
    "exact_hollow_or_rectangular_internal_impedance",
    "helix_curvature_and_proximity_numeric_correction",
    "browser_FEM_solver",
  ] as const),
  openGates: Object.freeze([
    Object.freeze({
      gateId: "D-05.approved-child-method-ids" as const,
      reason:
        "The frozen D-05 parent requires a submethod split but supplies no approved child method IDs; the two frozen route strings remain internal parent discriminators." as const,
    }),
    Object.freeze({
      gateId: "D-05.stable-warning-ids" as const,
      reason:
        "The frozen contract supplies warning predicates but no stable warning IDs; this module does not invent them." as const,
    }),
    Object.freeze({
      gateId: "D-05.validation-identifier-alignment" as const,
      reason:
        "Registry metadata maps method_check_id ELEC-RAC-FREEZE-001 while VALIDATION_CASES prose names the analytical example ELEC-RAC-HF-001; activation requires a controlled identifier resolution." as const,
      registryMethodCheckIds: D05_METHOD_CHECK_IDS,
      validationProseAnalyticalCaseId: "ELEC-RAC-HF-001" as const,
    }),
    Object.freeze({
      gateId: "D-05.parameter-dictionary-contract-alignment" as const,
      reason:
        "Aggregate D-05 contract inputs and a coil-only measured Rac/de-embedding boundary do not have a complete one-to-one parameter-registry mapping; no local parameter IDs are invented." as const,
      contractInputIds: SPECIFICATION.inputParameterIds,
      registeredContractInputIds: REGISTERED_CONTRACT_INPUT_IDS,
      parameterIdsDeclaringD05Consumer: REGISTERED_D05_PARAMETER_IDS,
    }),
    Object.freeze({
      gateId: "D-05.EXP-RAC-001-execution" as const,
      reason:
        "EXP-RAC-001 is specified but not executed; a supplied measurement is isolated evidence, not release validation of the family." as const,
    }),
    Object.freeze({
      gateId: "D-05.parent-result-adapter" as const,
      reason:
        "UI/report adapters must preserve the non-activated parent route, unavailable outputs without numeric placeholders, and the screening success_with_warnings status." as const,
    }),
  ]),
});

export const D05_DEPENDENCY_METHOD_VERSIONS = Object.freeze({
  conductorPathLength: Object.freeze({
    methodId: "D-01" as const,
    methodVersion: D01_SPECIFICATION.methodVersion,
  }),
  conductorSectionGeometry: Object.freeze({
    methodId: "D-02" as const,
    methodVersion: D02_SPECIFICATION.methodVersion,
  }),
  dcResistance: Object.freeze({
    methodId: "D-03" as const,
    methodVersion: D03_SPECIFICATION.methodVersion,
  }),
  copperSkinDepth: Object.freeze({
    methodId: "D-04" as const,
    methodVersion: D04_SPECIFICATION.methodVersion,
  }),
});

export const D05_AC_RESISTANCE_FAMILY_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: D05_SOURCE_REFS,
  contractSourceRefs: D05_CONTRACT_SOURCE_REFS,
  derivationRefs: D05_DERIVATION_REFS,
  validationCaseIds: D05_VALIDATION_CASE_IDS,
  methodCheckIds: D05_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
  dependencyMethodVersions: D05_DEPENDENCY_METHOD_VERSIONS,
  numericRepresentabilityPolicy: D05_NUMERIC_REPRESENTABILITY_POLICY,
  controlledSourceFiles: D05_CONTROLLED_SOURCE_FILES,
  minimumValidationProtocol: D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING,
  implementationReadiness: D05_IMPLEMENTATION_READINESS,
});

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `D-05 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const D05_WARNING_PREDICATES = Object.freeze({
  roundScreeningOnComplexGeometry: controlledWarningPredicate(
    "round-section screening is used for rectangular or complex geometry" as const,
  ),
  outerRadiusToSkinDepthBelowTen: controlledWarningPredicate(
    "ro/delta<10" as const,
  ),
  hollowWallToSkinDepthBelowThree: controlledWarningPredicate(
    "hollow-tube t_wall/delta<3" as const,
  ),
  externalFieldOrReturnPathUnknown: controlledWarningPredicate(
    "external field or return path is unknown" as const,
  ),
  proximitySignificant: controlledWarningPredicate(
    "proximity effect is significant" as const,
  ),
  unsourcedFprox: controlledWarningPredicate(
    "an unsourced Fprox is used" as const,
  ),
  loadedPortResistanceCalledCoilRac: controlledWarningPredicate(
    "loaded-port active resistance is labelled coil Rac" as const,
  ),
});

export type D05SourceOutcome =
  | "success"
  | "success_with_warnings"
  | "invalid_input"
  | "insufficient_data"
  | "not_applicable";

export type D05ConductorShape =
  | "solid_round"
  | "hollow_round"
  | "rectangular_or_complex"
  | "other_or_unknown";

interface D05UpstreamEvidenceBase {
  readonly sourceMethodVersion: string;
  readonly sourceOutcome: D05SourceOutcome;
  readonly sourceResultId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
}

export interface D05D01PathEvidence extends D05UpstreamEvidenceBase {
  readonly sourceMethodId: "D-01";
  /** D-01 canonical-SI conductor path used by D-03 and D-05. */
  readonly conductorLengthM: number;
  readonly lengthQuantity: "helixLengthM" | "totalLengthM";
  readonly pathBoundaryId: string;
  readonly leadBusJointTreatment:
    | "included_in_declared_path_and_dc_boundary"
    | "excluded_and_reported_unaccounted"
    | "unknown";
}

export interface D05D02SectionEvidence extends D05UpstreamEvidenceBase {
  readonly sourceMethodId: "D-02";
  readonly conductorShape: D05ConductorShape;
  /** Mechanical outer diameter in canonical SI metres. */
  readonly outerDiameterM: number;
  /** Explicit null only for a solid round conductor. */
  readonly innerDiameterM: number | null;
  /** D-02 Ametal in canonical SI square metres. */
  readonly metalAreaM2: number;
  readonly sectionUniformity:
    | "constant_along_length"
    | "varying_or_unknown";
}

export interface D05D03DcResistanceEvidence extends D05UpstreamEvidenceBase {
  readonly sourceMethodId: "D-03";
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly temperatureK: number;
  readonly conductorLengthM: number;
  readonly metalAreaM2: number;
  readonly resistivityOhmM: number;
  /** D-03 Rconductor_dc, not a terminal resistance with hidden extras. */
  readonly dcResistanceOhm: number;
  readonly resistanceBoundaryId: string;
  readonly resistanceBoundary:
    | "conductor_body_only_excludes_series_extras"
    | "includes_series_extras_or_terminal_measurement"
    | "unknown";
}

export interface D05D04SkinDepthEvidence extends D05UpstreamEvidenceBase {
  readonly sourceMethodId: "D-04";
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly temperatureK: number;
  readonly frequencyHz: number;
  readonly resistivityOhmM: number;
  readonly relativePermeability: number;
  readonly skinDepthM: number;
  readonly materialClass: "copper" | "other";
  readonly propertyStateMatch:
    | "same_material_temperature_frequency_state"
    | "unconfirmed_or_mismatched";
  readonly fieldModel: "locally_planar_reference" | "other_or_unknown";
}

export interface D05UpstreamEvidence {
  readonly d01: D05D01PathEvidence;
  readonly d02: D05D02SectionEvidence;
  readonly d03: D05D03DcResistanceEvidence;
  readonly d04: D05D04SkinDepthEvidence;
}

export interface D05ScreeningApplicabilityEvidence {
  readonly conductorIsolation: "isolated" | "not_isolated" | "unconfirmed";
  readonly longStraightApproximation:
    | "long_straight_or_local_planar_confirmed"
    | "not_satisfied"
    | "unconfirmed";
  readonly fieldExposedSurfaces:
    | "declared_outer_surface_only"
    | "inner_and_outer_or_other"
    | "unconfirmed";
  readonly outerSurfaceCurrent:
    | "predominantly_outer_surface_confirmed"
    | "not_satisfied"
    | "unconfirmed";
  readonly surfaceFieldUniformity:
    | "approximately_uniform_circumferential_field"
    | "nonuniform"
    | "unconfirmed";
  readonly adjacentTurnProximity:
    | "negligible"
    | "significant"
    | "unconfirmed";
  readonly workpieceProximity:
    | "negligible"
    | "significant"
    | "unconfirmed";
  readonly returnPath:
    | "known_and_negligible_for_screening"
    | "known_but_significant"
    | "unknown";
  readonly externalField:
    | "known_isolated_conductor_screening_field"
    | "known_nonuniform_or_complex"
    | "unknown";
  readonly fproxUse:
    | "not_used"
    | "used_with_source"
    | "used_without_source";
  readonly applicabilitySourceRef: string;
}

export interface D05MeasurementIdentifiedEvidence {
  readonly sourceOutcome:
    | "success"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly sourceResultId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly frequencyHz: number;
  readonly temperatureK: number;
  readonly loadedState: LoadedState;
  readonly portId: string;
  readonly referencePlane: string;
  readonly resistanceBoundaryId: string;
  readonly deembeddingBoundaryId: string;
  readonly coilResistanceBoundaryConfirmed: true | false | null;
  readonly deembeddingConfirmed: true | false | null;
  readonly loadedPortTotalActiveResistance: true | false | null;
  readonly identificationTechnique:
    | "four_terminal_impedance_at_operating_frequency"
    | "other_or_unconfirmed";
  readonly quantityBasis: "rms" | "other_or_unconfirmed";
  readonly currentRmsA: number;
  /** Measured/de-embedded coil Rac in canonical SI ohms. */
  readonly resistanceOhm: number;
  readonly standardUncertaintyOhm: number;
  readonly coverageFactor: number;
  readonly uncertaintySourceRef: string;
  readonly provenanceSourceRef: string;
  readonly instrumentId: string;
  readonly calibrationRef: string;
  readonly rawDataSha256: string;
  readonly measurementProtocolId: "EXP-RAC-001";
}

export interface D05AcResistanceFamilyInput {
  readonly route: D05InternalRoute;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly frequencyHz: number;
  readonly coilMeanTemperatureK: number;
  readonly portId: string;
  readonly referencePlane: string;
  readonly loadedState: LoadedState;
  /** Opaque producer-owned physical boundary shared by Rdc and Rac. */
  readonly resistanceBoundaryId: string;
  readonly upstreamEvidence: D05UpstreamEvidence;
  /** Explicit null when measurement_identified is selected. */
  readonly screening: D05ScreeningApplicabilityEvidence | null;
  /** Explicit null when surface_skin_screening_round is selected. */
  readonly measurement: D05MeasurementIdentifiedEvidence | null;
}

export interface D05AvailableResistanceOutput {
  readonly kind: "available";
  readonly outputId: "Rac";
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation:
    | "strong_skin_outer_surface_screening_resistance"
    | "same_state_deembedded_measured_coil_ac_resistance";
}

export interface D05AvailableRatioOutput {
  readonly kind: "available";
  readonly outputId: "Rac/Rdc";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: "same_boundary_ac_to_dc_resistance_ratio";
  readonly passiveUniformConductorCheck:
    | "at_or_above_one"
    | "below_one_measurement_review_not_a_universal_hard_law";
}

export interface D05AvailableEffectiveAreaOutput {
  readonly kind: "available";
  readonly outputId: "Aeff";
  readonly valueSi: number;
  readonly dimensionId: "area";
  readonly canonicalUnitId: "m2";
  readonly interpretation:
    "outer_surface_participating_perimeter_times_skin_depth";
}

/** No numeric, unit, or dimension placeholder is legal when Aeff is absent. */
export interface D05UnavailableEffectiveAreaOutput {
  readonly kind: "unavailable";
  readonly outputId: "Aeff";
  readonly status: "insufficient_data";
  readonly reason:
    "measurement_identified does not infer an effective area from measured Rac";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface D05UnaccountedProximityDiscriminator {
  readonly kind: "discriminator";
  readonly outputId: "unaccounted proximity term";
  readonly numericCorrectionPublished: false;
  readonly state:
    | "not_modelled_and_explicitly_assessed_negligible_within_screening_domain"
    | "included_in_measured_rac_but_not_separately_identified";
  readonly zeroCorrectionAssumed: false;
  readonly interpretation: string;
}

export interface D05AvailableScreeningRatio {
  readonly kind: "available";
  readonly outputId: "ro/delta" | "t_wall/delta";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
}

export interface D05SolidWallRatioNotApplicable {
  readonly kind: "unavailable";
  readonly outputId: "t_wall/delta";
  readonly status: "not_applicable";
  readonly reason: "solid round conductor has no hollow wall thickness";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

interface D05SuccessBase {
  readonly methodId: typeof D05_METHOD_ID;
  readonly methodVersion: typeof D05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly applicabilityStatus: "in_domain";
  readonly parentRuntimeActivated: false;
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly routePreference: Readonly<{
    readonly preferredInternalRoute: "measurement_identified";
    readonly reason:
      "same-state four-terminal or impedance measurement with uncertainty and de-embedding is preferred";
    readonly parentIsRecommendationCandidate: false;
  }>;
  readonly evidence: Readonly<{
    readonly electricalState: Readonly<{
      readonly caseSnapshotId: string;
      readonly geometrySnapshotId: string;
      readonly materialSnapshotId: string;
      readonly materialId: string;
      readonly frequencyHz: number;
      readonly coilMeanTemperatureK: number;
      readonly portId: string;
      readonly referencePlane: string;
      readonly loadedState: LoadedState;
      readonly resistanceBoundaryId: string;
    }>;
    readonly upstreamEvidence: Readonly<D05UpstreamEvidence>;
    readonly sourceRefs: typeof D05_SOURCE_REFS;
    readonly contractSourceRefs: typeof D05_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof D05_DERIVATION_REFS;
    readonly validationCaseIds: typeof D05_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof D05_METHOD_CHECK_IDS;
    readonly controlledSourceFiles: typeof D05_CONTROLLED_SOURCE_FILES;
    readonly minimumValidationProtocol:
      typeof D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING;
    readonly numericRepresentabilityPolicy:
      typeof D05_NUMERIC_REPRESENTABILITY_POLICY;
    readonly implementationReadiness: typeof D05_IMPLEMENTATION_READINESS;
  }>;
  readonly failure?: never;
}

export interface D05ScreeningSuccess extends D05SuccessBase {
  readonly internalRoute: "surface_skin_screening_round";
  readonly status: "success_with_warnings";
  readonly value: Readonly<{
    readonly Rac: D05AvailableResistanceOutput;
    readonly RacToRdc: D05AvailableRatioOutput;
    readonly Aeff: D05AvailableEffectiveAreaOutput;
    readonly unaccountedProximity: D05UnaccountedProximityDiscriminator;
    readonly screeningMetrics: Readonly<{
      readonly outerRadiusToSkinDepth: D05AvailableScreeningRatio;
      readonly wallThicknessToSkinDepth:
        | D05AvailableScreeningRatio
        | D05SolidWallRatioNotApplicable;
    }>;
  }>;
  readonly equation: Readonly<{
    readonly effectiveArea: "Aeff = 2 * pi * ro * delta";
    readonly acResistance: "Rac_surface = rho * ell / Aeff";
    readonly substitution: Readonly<{
      readonly outerDiameterM: number;
      readonly outerRadiusM: number;
      readonly innerDiameterM: number | null;
      readonly wallThicknessM: number | null;
      readonly skinDepthM: number;
      readonly outerRadiusToSkinDepth: number;
      readonly wallThicknessToSkinDepth: number | null;
      readonly twoPi: number;
      readonly participatingOuterPerimeterM: number;
      readonly effectiveAreaM2: number;
      readonly resistivityOhmM: number;
      readonly conductorLengthM: number;
      readonly resistivityTimesLengthOhmM2: number;
      readonly acResistanceOhm: number;
      readonly dcResistanceOhm: number;
      readonly acToDcResistanceRatio: number;
    }>;
  }>;
  readonly screeningEvidence: Readonly<D05ScreeningApplicabilityEvidence>;
  readonly limitations: readonly [
    "Rac_skin_screening is an engineering screening result, not a full-frequency or proximity solution",
    "only the declared outer surface participates; inner and outer circumferences are never added",
    "helix curvature, leads, joints, busbars, adjacent-turn and workpiece proximity are not numerically corrected",
  ];
}

export interface D05MeasurementSuccess extends D05SuccessBase {
  readonly internalRoute: "measurement_identified";
  readonly status: "success";
  readonly value: Readonly<{
    readonly Rac: D05AvailableResistanceOutput;
    readonly RacToRdc: D05AvailableRatioOutput;
    readonly Aeff: D05UnavailableEffectiveAreaOutput;
    readonly unaccountedProximity: D05UnaccountedProximityDiscriminator;
    readonly measurementUncertainty: Readonly<{
      readonly standardUncertaintyOhm: number;
      readonly coverageFactor: number;
      readonly uncertaintySourceRef: string;
    }>;
  }>;
  readonly measurementEvidence: Readonly<D05MeasurementIdentifiedEvidence>;
  readonly limitations: readonly [
    "measured Rac includes the declared loaded-state electromagnetic effects but does not separately identify a proximity correction",
    "Aeff is unavailable because it is not inferred from measured Rac",
  ];
}

export type D05AcResistanceFamilySuccess =
  | D05ScreeningSuccess
  | D05MeasurementSuccess;

export type D05FailureCode =
  | "D-05.input_schema_invalid"
  | "D-05.route_invalid"
  | "D-05.route_payload_invalid"
  | "D-05.context_invalid"
  | "D-05.upstream_evidence_missing"
  | "D-05.upstream_evidence_schema_invalid"
  | "D-05.upstream_method_binding_invalid"
  | "D-05.upstream_result_unavailable"
  | "D-05.upstream_snapshot_mismatch"
  | "D-05.upstream_state_mismatch"
  | "D-05.upstream_value_mismatch"
  | "D-05.dc_boundary_not_conductor_only"
  | "D-05.dc_boundary_unknown"
  | "D-05.round_screening_geometry_not_applicable"
  | "D-05.round_screening_geometry_unconfirmed"
  | "D-05.screening_evidence_missing"
  | "D-05.screening_evidence_schema_invalid"
  | "D-05.screening_scope_not_applicable"
  | "D-05.screening_scope_unconfirmed"
  | "D-05.unsourced_fprox_forbidden"
  | "D-05.fprox_not_supported"
  | "D-05.outer_radius_to_skin_depth_below_ten"
  | "D-05.hollow_wall_to_skin_depth_below_three"
  | "D-05.measurement_evidence_missing"
  | "D-05.measurement_evidence_schema_invalid"
  | "D-05.measurement_result_unavailable"
  | "D-05.loaded_port_total_not_coil_rac"
  | "D-05.measurement_boundary_unconfirmed"
  | "D-05.measurement_state_mismatch"
  | "D-05.measurement_method_unconfirmed"
  | "D-05.measurement_provenance_invalid"
  | "D-05.numeric_input_invalid"
  | "D-05.numeric_resolution_invalid";

export interface D05AcResistanceFamilyFailure {
  readonly methodId: typeof D05_METHOD_ID;
  readonly methodVersion: typeof D05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly parentRuntimeActivated: false;
  readonly warningIds: readonly [];
  readonly failure: Readonly<{
    readonly code: D05FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type D05AcResistanceFamilyOutcome =
  | D05AcResistanceFamilySuccess
  | D05AcResistanceFamilyFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const TWO_PI = 2 * Math.PI;
const D04_VACUUM_PERMEABILITY_H_PER_M = 1.25663706127e-6;

const ROUTE_PREFERENCE = Object.freeze({
  preferredInternalRoute: "measurement_identified" as const,
  reason:
    "same-state four-terminal or impedance measurement with uncertainty and de-embedding is preferred" as const,
  parentIsRecommendationCandidate: false as const,
});

const SCREENING_LIMITATIONS = Object.freeze([
  "Rac_skin_screening is an engineering screening result, not a full-frequency or proximity solution",
  "only the declared outer surface participates; inner and outer circumferences are never added",
  "helix curvature, leads, joints, busbars, adjacent-turn and workpiece proximity are not numerically corrected",
] as const);

const MEASUREMENT_LIMITATIONS = Object.freeze([
  "measured Rac includes the declared loaded-state electromagnetic effects but does not separately identify a proximity correction",
  "Aeff is unavailable because it is not inferred from measured Rac",
] as const);

function failure(
  status: D05AcResistanceFamilyFailure["status"],
  code: D05FailureCode,
  message: string,
  action: string,
): D05AcResistanceFamilyFailure {
  return Object.freeze({
    methodId: D05_METHOD_ID,
    methodVersion: D05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    parentRuntimeActivated: false,
    warningIds: EMPTY_WARNING_IDS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isLoadedState(value: unknown): value is LoadedState {
  return LOADED_STATES.some((candidate) => candidate === value);
}

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStableEvidenceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u.test(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= D05_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormal(value: number): boolean {
  return value === 0 || isPositiveNormal(value);
}

function sameNumber(left: number, right: number): boolean {
  return Object.is(left, right) || left === right;
}

interface ParsedUpstreamEvidence {
  readonly evidence: Readonly<D05UpstreamEvidence>;
}

type ParseUpstreamResult =
  | { readonly ok: true; readonly parsed: ParsedUpstreamEvidence }
  | { readonly ok: false; readonly failure: D05AcResistanceFamilyFailure };

function readD01Evidence(value: unknown): D05D01PathEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceOutcome",
    "sourceResultId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "conductorLengthM",
    "lengthQuantity",
    "pathBoundaryId",
    "leadBusJointTreatment",
  ]);
  if (record === null) return null;
  return Object.freeze({
    sourceMethodId: record.sourceMethodId,
    sourceMethodVersion: record.sourceMethodVersion,
    sourceOutcome: record.sourceOutcome,
    sourceResultId: record.sourceResultId,
    caseSnapshotId: record.caseSnapshotId,
    geometrySnapshotId: record.geometrySnapshotId,
    conductorLengthM: record.conductorLengthM,
    lengthQuantity: record.lengthQuantity,
    pathBoundaryId: record.pathBoundaryId,
    leadBusJointTreatment: record.leadBusJointTreatment,
  }) as D05D01PathEvidence;
}

function readD02Evidence(value: unknown): D05D02SectionEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceOutcome",
    "sourceResultId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "conductorShape",
    "outerDiameterM",
    "innerDiameterM",
    "metalAreaM2",
    "sectionUniformity",
  ]);
  if (record === null) return null;
  return Object.freeze({
    sourceMethodId: record.sourceMethodId,
    sourceMethodVersion: record.sourceMethodVersion,
    sourceOutcome: record.sourceOutcome,
    sourceResultId: record.sourceResultId,
    caseSnapshotId: record.caseSnapshotId,
    geometrySnapshotId: record.geometrySnapshotId,
    conductorShape: record.conductorShape,
    outerDiameterM: record.outerDiameterM,
    innerDiameterM: record.innerDiameterM,
    metalAreaM2: record.metalAreaM2,
    sectionUniformity: record.sectionUniformity,
  }) as D05D02SectionEvidence;
}

function readD03Evidence(value: unknown): D05D03DcResistanceEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceOutcome",
    "sourceResultId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "materialId",
    "temperatureK",
    "conductorLengthM",
    "metalAreaM2",
    "resistivityOhmM",
    "dcResistanceOhm",
    "resistanceBoundaryId",
    "resistanceBoundary",
  ]);
  if (record === null) return null;
  return Object.freeze({
    sourceMethodId: record.sourceMethodId,
    sourceMethodVersion: record.sourceMethodVersion,
    sourceOutcome: record.sourceOutcome,
    sourceResultId: record.sourceResultId,
    caseSnapshotId: record.caseSnapshotId,
    geometrySnapshotId: record.geometrySnapshotId,
    materialSnapshotId: record.materialSnapshotId,
    materialId: record.materialId,
    temperatureK: record.temperatureK,
    conductorLengthM: record.conductorLengthM,
    metalAreaM2: record.metalAreaM2,
    resistivityOhmM: record.resistivityOhmM,
    dcResistanceOhm: record.dcResistanceOhm,
    resistanceBoundaryId: record.resistanceBoundaryId,
    resistanceBoundary: record.resistanceBoundary,
  }) as D05D03DcResistanceEvidence;
}

function readD04Evidence(value: unknown): D05D04SkinDepthEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceOutcome",
    "sourceResultId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "materialId",
    "temperatureK",
    "frequencyHz",
    "resistivityOhmM",
    "relativePermeability",
    "skinDepthM",
    "materialClass",
    "propertyStateMatch",
    "fieldModel",
  ]);
  if (record === null) return null;
  return Object.freeze({
    sourceMethodId: record.sourceMethodId,
    sourceMethodVersion: record.sourceMethodVersion,
    sourceOutcome: record.sourceOutcome,
    sourceResultId: record.sourceResultId,
    caseSnapshotId: record.caseSnapshotId,
    geometrySnapshotId: record.geometrySnapshotId,
    materialSnapshotId: record.materialSnapshotId,
    materialId: record.materialId,
    temperatureK: record.temperatureK,
    frequencyHz: record.frequencyHz,
    resistivityOhmM: record.resistivityOhmM,
    relativePermeability: record.relativePermeability,
    skinDepthM: record.skinDepthM,
    materialClass: record.materialClass,
    propertyStateMatch: record.propertyStateMatch,
    fieldModel: record.fieldModel,
  }) as D05D04SkinDepthEvidence;
}

function parseUpstreamEvidence(value: unknown): ParseUpstreamResult {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-05.upstream_evidence_missing",
        "D-05 requires explicit D-01 through D-04 result evidence.",
        "Provide same-case content-addressed D-01 through D-04 evidence; do not infer missing values.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, ["d01", "d02", "d03", "d04"]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-05.upstream_evidence_schema_invalid",
        "D-05 upstream evidence must be an exact controlled plain-data record.",
        "Provide only the D-01, D-02, D-03, and D-04 evidence records.",
      ),
    };
  }
  const d01 = readD01Evidence(record.d01);
  const d02 = readD02Evidence(record.d02);
  const d03 = readD03Evidence(record.d03);
  const d04 = readD04Evidence(record.d04);
  if (d01 === null || d02 === null || d03 === null || d04 === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-05.upstream_evidence_schema_invalid",
        "One or more D-01 through D-04 evidence records is malformed, hostile, missing a field, or contains an extra field.",
        "Supply exact plain-data evidence snapshots from the controlled upstream adapters.",
      ),
    };
  }
  return {
    ok: true,
    parsed: {
      evidence: Object.freeze({ d01, d02, d03, d04 }),
    },
  };
}

function readScreeningEvidence(
  value: unknown,
): D05ScreeningApplicabilityEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "conductorIsolation",
    "longStraightApproximation",
    "fieldExposedSurfaces",
    "outerSurfaceCurrent",
    "surfaceFieldUniformity",
    "adjacentTurnProximity",
    "workpieceProximity",
    "returnPath",
    "externalField",
    "fproxUse",
    "applicabilitySourceRef",
  ]);
  if (record === null) return null;
  return Object.freeze({
    conductorIsolation: record.conductorIsolation,
    longStraightApproximation: record.longStraightApproximation,
    fieldExposedSurfaces: record.fieldExposedSurfaces,
    outerSurfaceCurrent: record.outerSurfaceCurrent,
    surfaceFieldUniformity: record.surfaceFieldUniformity,
    adjacentTurnProximity: record.adjacentTurnProximity,
    workpieceProximity: record.workpieceProximity,
    returnPath: record.returnPath,
    externalField: record.externalField,
    fproxUse: record.fproxUse,
    applicabilitySourceRef: record.applicabilitySourceRef,
  }) as D05ScreeningApplicabilityEvidence;
}

function readMeasurementEvidence(
  value: unknown,
): D05MeasurementIdentifiedEvidence | null {
  const record = readExactPlainDataRecord(value, [
    "sourceOutcome",
    "sourceResultId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "materialId",
    "frequencyHz",
    "temperatureK",
    "loadedState",
    "portId",
    "referencePlane",
    "resistanceBoundaryId",
    "deembeddingBoundaryId",
    "coilResistanceBoundaryConfirmed",
    "deembeddingConfirmed",
    "loadedPortTotalActiveResistance",
    "identificationTechnique",
    "quantityBasis",
    "currentRmsA",
    "resistanceOhm",
    "standardUncertaintyOhm",
    "coverageFactor",
    "uncertaintySourceRef",
    "provenanceSourceRef",
    "instrumentId",
    "calibrationRef",
    "rawDataSha256",
    "measurementProtocolId",
  ]);
  if (record === null) return null;
  return Object.freeze({
    sourceOutcome: record.sourceOutcome,
    sourceResultId: record.sourceResultId,
    caseSnapshotId: record.caseSnapshotId,
    geometrySnapshotId: record.geometrySnapshotId,
    materialSnapshotId: record.materialSnapshotId,
    materialId: record.materialId,
    frequencyHz: record.frequencyHz,
    temperatureK: record.temperatureK,
    loadedState: record.loadedState,
    portId: record.portId,
    referencePlane: record.referencePlane,
    resistanceBoundaryId: record.resistanceBoundaryId,
    deembeddingBoundaryId: record.deembeddingBoundaryId,
    coilResistanceBoundaryConfirmed: record.coilResistanceBoundaryConfirmed,
    deembeddingConfirmed: record.deembeddingConfirmed,
    loadedPortTotalActiveResistance: record.loadedPortTotalActiveResistance,
    identificationTechnique: record.identificationTechnique,
    quantityBasis: record.quantityBasis,
    currentRmsA: record.currentRmsA,
    resistanceOhm: record.resistanceOhm,
    standardUncertaintyOhm: record.standardUncertaintyOhm,
    coverageFactor: record.coverageFactor,
    uncertaintySourceRef: record.uncertaintySourceRef,
    provenanceSourceRef: record.provenanceSourceRef,
    instrumentId: record.instrumentId,
    calibrationRef: record.calibrationRef,
    rawDataSha256: record.rawDataSha256,
    measurementProtocolId: record.measurementProtocolId,
  }) as D05MeasurementIdentifiedEvidence;
}

function validateUpstreamSchemaValues(
  evidence: Readonly<D05UpstreamEvidence>,
): D05AcResistanceFamilyFailure | null {
  const { d01, d02, d03, d04 } = evidence;
  const validSourceOutcome = (value: unknown): value is D05SourceOutcome =>
    value === "success" ||
    value === "success_with_warnings" ||
    value === "invalid_input" ||
    value === "insufficient_data" ||
    value === "not_applicable";
  if (
    d01.sourceMethodId !== "D-01" ||
    d02.sourceMethodId !== "D-02" ||
    d03.sourceMethodId !== "D-03" ||
    d04.sourceMethodId !== "D-04" ||
    d01.sourceMethodVersion !== D01_SPECIFICATION.methodVersion ||
    d02.sourceMethodVersion !== D02_SPECIFICATION.methodVersion ||
    d03.sourceMethodVersion !== D03_SPECIFICATION.methodVersion ||
    d04.sourceMethodVersion !== D04_SPECIFICATION.methodVersion ||
    !validSourceOutcome(d01.sourceOutcome) ||
    !validSourceOutcome(d02.sourceOutcome) ||
    !validSourceOutcome(d03.sourceOutcome) ||
    !validSourceOutcome(d04.sourceOutcome) ||
    !isContentAddressedSnapshotId(d01.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(d02.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(d03.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(d04.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(d01.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(d02.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(d03.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(d04.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(d03.materialSnapshotId, "material") ||
    !isContentAddressedSnapshotId(d04.materialSnapshotId, "material") ||
    !isStableEvidenceId(d01.sourceResultId) ||
    !isStableEvidenceId(d02.sourceResultId) ||
    !isStableEvidenceId(d03.sourceResultId) ||
    !isStableEvidenceId(d04.sourceResultId) ||
    (d01.lengthQuantity !== "helixLengthM" &&
      d01.lengthQuantity !== "totalLengthM") ||
    !isStableEvidenceId(d01.pathBoundaryId) ||
    (d01.leadBusJointTreatment !==
      "included_in_declared_path_and_dc_boundary" &&
      d01.leadBusJointTreatment !== "excluded_and_reported_unaccounted" &&
      d01.leadBusJointTreatment !== "unknown") ||
    (d02.conductorShape !== "solid_round" &&
      d02.conductorShape !== "hollow_round" &&
      d02.conductorShape !== "rectangular_or_complex" &&
      d02.conductorShape !== "other_or_unknown") ||
    (d02.sectionUniformity !== "constant_along_length" &&
      d02.sectionUniformity !== "varying_or_unknown") ||
    (d03.resistanceBoundary !==
      "conductor_body_only_excludes_series_extras" &&
      d03.resistanceBoundary !==
        "includes_series_extras_or_terminal_measurement" &&
      d03.resistanceBoundary !== "unknown") ||
    !isStableEvidenceId(d03.resistanceBoundaryId) ||
    (d04.materialClass !== "copper" && d04.materialClass !== "other") ||
    (d04.propertyStateMatch !==
      "same_material_temperature_frequency_state" &&
      d04.propertyStateMatch !== "unconfirmed_or_mismatched") ||
    (d04.fieldModel !== "locally_planar_reference" &&
      d04.fieldModel !== "other_or_unknown") ||
    !isNonBlankText(d03.materialId) ||
    !isNonBlankText(d04.materialId) ||
    typeof d01.conductorLengthM !== "number" ||
    typeof d02.outerDiameterM !== "number" ||
    (typeof d02.innerDiameterM !== "number" && d02.innerDiameterM !== null) ||
    typeof d02.metalAreaM2 !== "number" ||
    typeof d03.temperatureK !== "number" ||
    typeof d03.conductorLengthM !== "number" ||
    typeof d03.metalAreaM2 !== "number" ||
    typeof d03.resistivityOhmM !== "number" ||
    typeof d03.dcResistanceOhm !== "number" ||
    typeof d04.temperatureK !== "number" ||
    typeof d04.frequencyHz !== "number" ||
    typeof d04.resistivityOhmM !== "number" ||
    typeof d04.relativePermeability !== "number" ||
    typeof d04.skinDepthM !== "number"
  ) {
    return failure(
      "invalid_input",
      "D-05.upstream_method_binding_invalid",
      "D-01 through D-04 evidence contains an uncontrolled method, version, result, boundary, state, or primitive value.",
      "Use exact successful upstream adapter evidence from the frozen method versions.",
    );
  }
  return null;
}

interface D05ControlledContext {
  readonly route: D05InternalRoute;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly frequencyHz: number;
  readonly coilMeanTemperatureK: number;
  readonly portId: string;
  readonly referencePlane: string;
  readonly loadedState: LoadedState;
  readonly resistanceBoundaryId: string;
}

function validateSharedContext(
  record: Readonly<Record<string, unknown>>,
):
  | { readonly ok: true; readonly context: Readonly<D05ControlledContext> }
  | { readonly ok: false; readonly failure: D05AcResistanceFamilyFailure } {
  if (
    (record.route !== "surface_skin_screening_round" &&
      record.route !== "measurement_identified") ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isNonBlankText(record.materialId) ||
    typeof record.frequencyHz !== "number" ||
    typeof record.coilMeanTemperatureK !== "number" ||
    !isStableEvidenceId(record.portId) ||
    !isNonBlankText(record.referencePlane) ||
    !isLoadedState(record.loadedState) ||
    !isStableEvidenceId(record.resistanceBoundaryId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-05.context_invalid",
        "D-05 requires content-addressed case/geometry/material snapshots and an explicit finite-state port and resistance boundary context.",
        "Correct the controlled D-05 context; do not use a hidden default state or reference plane.",
      ),
    };
  }
  return {
    ok: true,
    context: Object.freeze({
      route: record.route,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      materialSnapshotId: record.materialSnapshotId,
      materialId: record.materialId,
      frequencyHz: record.frequencyHz,
      coilMeanTemperatureK: record.coilMeanTemperatureK,
      portId: record.portId,
      referencePlane: record.referencePlane,
      loadedState: record.loadedState,
      resistanceBoundaryId: record.resistanceBoundaryId,
    }),
  };
}

function checkUpstreamSemanticBindings(
  context: Readonly<D05ControlledContext>,
  evidence: Readonly<D05UpstreamEvidence>,
): D05AcResistanceFamilyFailure | null {
  const { d01, d02, d03, d04 } = evidence;
  if (
    d01.sourceOutcome === "not_applicable" ||
    d02.sourceOutcome === "not_applicable" ||
    d03.sourceOutcome === "not_applicable" ||
    d04.sourceOutcome === "not_applicable"
  ) {
    return failure(
      "not_applicable",
      "D-05.upstream_result_unavailable",
      "At least one required D-01 through D-04 source result is explicitly not applicable.",
      "Select a D-05 route whose upstream geometry, material, and state methods are applicable.",
    );
  }
  if (
    d01.sourceOutcome === "invalid_input" ||
    d02.sourceOutcome === "invalid_input" ||
    d03.sourceOutcome === "invalid_input" ||
    d04.sourceOutcome === "invalid_input"
  ) {
    return failure(
      "invalid_input",
      "D-05.upstream_result_unavailable",
      "At least one required D-01 through D-04 source result has invalid input.",
      "Correct the upstream input instead of substituting a candidate value.",
    );
  }
  if (
    d01.sourceOutcome === "insufficient_data" ||
    d02.sourceOutcome === "insufficient_data" ||
    d03.sourceOutcome === "insufficient_data" ||
    d04.sourceOutcome === "insufficient_data"
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_result_unavailable",
      "At least one required D-01 through D-04 source result has insufficient data.",
      "Resolve every same-case upstream result before evaluating D-05.",
    );
  }
  if (
    d01.caseSnapshotId !== context.caseSnapshotId ||
    d02.caseSnapshotId !== context.caseSnapshotId ||
    d03.caseSnapshotId !== context.caseSnapshotId ||
    d04.caseSnapshotId !== context.caseSnapshotId ||
    d01.geometrySnapshotId !== context.geometrySnapshotId ||
    d02.geometrySnapshotId !== context.geometrySnapshotId ||
    d03.geometrySnapshotId !== context.geometrySnapshotId ||
    d04.geometrySnapshotId !== context.geometrySnapshotId ||
    d03.materialSnapshotId !== context.materialSnapshotId ||
    d04.materialSnapshotId !== context.materialSnapshotId
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_snapshot_mismatch",
      "D-01 through D-04 evidence does not share the selected content-addressed case, geometry, and material snapshots.",
      "Recompute all upstream results from one immutable case snapshot.",
    );
  }
  if (
    d04.materialClass !== "copper" ||
    d04.fieldModel !== "locally_planar_reference" ||
    d02.sectionUniformity !== "constant_along_length"
  ) {
    return failure(
      "not_applicable",
      "D-05.upstream_state_mismatch",
      "The upstream material, section, or field-model scope is explicitly outside the copper uniform-section locally-planar D-05 boundary.",
      "Use an applicable geometry/material method or same-state measurement with compatible controlled upstream evidence.",
    );
  }
  if (
    d03.materialId !== context.materialId ||
    d04.materialId !== context.materialId ||
    !sameNumber(d03.temperatureK, context.coilMeanTemperatureK) ||
    !sameNumber(d04.temperatureK, context.coilMeanTemperatureK) ||
    !sameNumber(d04.frequencyHz, context.frequencyHz) ||
    !sameNumber(d03.resistivityOhmM, d04.resistivityOhmM) ||
    d04.propertyStateMatch !== "same_material_temperature_frequency_state"
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_state_mismatch",
      "D-03 and D-04 do not bind the same copper material, temperature, frequency, resistivity, and locally planar reference state.",
      "Resolve same-state copper property and skin-depth evidence; never reuse cold resistivity silently.",
    );
  }
  if (d03.resistanceBoundary === "unknown") {
    return failure(
      "insufficient_data",
      "D-05.dc_boundary_unknown",
      "The D-03 conductor-resistance boundary is unknown.",
      "Provide the conductor-body Rdc boundary and exclude unresolved series extras.",
    );
  }
  if (
    d03.resistanceBoundary !==
      "conductor_body_only_excludes_series_extras" ||
    d03.resistanceBoundaryId !== context.resistanceBoundaryId
  ) {
    return failure(
      "not_applicable",
      "D-05.dc_boundary_not_conductor_only",
      "D-05 requires D-03 Rconductor_dc at the same physical boundary, not a terminal resistance containing joints, leads, busbars, or other series extras.",
      "Supply same-boundary conductor-only Rdc evidence.",
    );
  }
  if (
    d01.pathBoundaryId !== context.resistanceBoundaryId ||
    d01.leadBusJointTreatment === "unknown"
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_state_mismatch",
      "The path, section, or lead/bus/joint treatment is not explicitly bound to the selected resistance boundary.",
      "Confirm one uniform conductor path and state every excluded or included series path explicitly.",
    );
  }
  if (
    !sameNumber(d01.conductorLengthM, d03.conductorLengthM) ||
    !sameNumber(d02.metalAreaM2, d03.metalAreaM2)
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_value_mismatch",
      "D-01 length or D-02 Ametal differs from the value consumed by D-03.",
      "Bind D-03 to the exact D-01 and D-02 result values.",
    );
  }
  return null;
}

/**
 * The measurement route still consumes D-02 as a successful frozen upstream
 * result.  A measured Rac does not make an impossible D-02 shape or a forged
 * section area acceptable.  Re-evaluate only the two round-section identities
 * implemented by D-02 v1.0.0, in the same binary64 operation order, without
 * inventing a geometry approximation for the measured route.
 */
function validateMeasurementD02SectionIdentity(
  d02: Readonly<D05D02SectionEvidence>,
): D05AcResistanceFamilyFailure | null {
  if (
    d02.conductorShape !== "solid_round" &&
    d02.conductorShape !== "hollow_round"
  ) {
    return failure(
      "invalid_input",
      "D-05.upstream_method_binding_invalid",
      "A successful D-02 v1.0.0 result can only bind solid_round or hollow_round geometry to the D-05 measurement route.",
      "Use the exact successful D-02 round-section result; unsupported or unresolved shapes cannot be relabelled as successful evidence.",
    );
  }

  if (
    !Number.isFinite(d02.outerDiameterM) ||
    d02.outerDiameterM <= 0 ||
    !Number.isFinite(d02.metalAreaM2) ||
    d02.metalAreaM2 <= 0 ||
    (d02.innerDiameterM !== null &&
      (!Number.isFinite(d02.innerDiameterM) || d02.innerDiameterM <= 0))
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_input_invalid",
      "The purported successful D-02 section contains a non-finite or non-positive diameter or metal area.",
      "Use the exact finite positive canonical-SI D-02 result; do not retain a candidate area from invalid geometry.",
    );
  }

  if (d02.conductorShape === "solid_round") {
    if (d02.innerDiameterM !== null) {
      return failure(
        "invalid_input",
        "D-05.upstream_method_binding_invalid",
        "A successful solid_round D-02 result requires innerDiameterM:null.",
        "Use the exact D-02 solid-round result without adding or inferring an inner diameter.",
      );
    }
    const piTimesOuterDiameterM = Math.PI * d02.outerDiameterM;
    const metalAreaNumeratorM2 =
      piTimesOuterDiameterM * d02.outerDiameterM;
    const expectedMetalAreaM2 = metalAreaNumeratorM2 / 4;
    if (
      !isPositiveNormal(d02.outerDiameterM) ||
      !isPositiveNormal(d02.metalAreaM2) ||
      !isPositiveNormal(piTimesOuterDiameterM) ||
      !isPositiveNormal(metalAreaNumeratorM2) ||
      !isPositiveNormal(expectedMetalAreaM2)
    ) {
      return failure(
        "invalid_input",
        "D-05.numeric_resolution_invalid",
        "The bound solid-round D-02 identity contains an overflow, false zero, or positive-subnormal binary64 term.",
        "Use a representable exact D-02 result; a measured Rac does not authorize a hidden section approximation.",
      );
    }
    if (!sameNumber(expectedMetalAreaM2, d02.metalAreaM2)) {
      return failure(
        "insufficient_data",
        "D-05.upstream_value_mismatch",
        "The solid-round D-02 metal area is not the exact pi*do^2/4 result for its bound outer diameter.",
        "Rebind the exact D-02 v1.0.0 section result without rounding or substituting Ametal.",
      );
    }
    return null;
  }

  if (
    d02.innerDiameterM === null ||
    d02.innerDiameterM >= d02.outerDiameterM
  ) {
    return failure(
      "invalid_input",
      "D-05.upstream_method_binding_invalid",
      "A successful hollow_round D-02 result requires a positive inner diameter strictly smaller than the outer diameter.",
      "Use the exact nested D-02 hollow-round dimensions; do not infer a hole or retain an area from invalid geometry.",
    );
  }
  const diameterDifferenceM = d02.outerDiameterM - d02.innerDiameterM;
  const diameterSumM = d02.outerDiameterM + d02.innerDiameterM;
  const piTimesDiameterDifferenceM = Math.PI * diameterDifferenceM;
  const metalAreaNumeratorM2 =
    piTimesDiameterDifferenceM * diameterSumM;
  const expectedMetalAreaM2 = metalAreaNumeratorM2 / 4;
  const wettedPerimeterM = Math.PI * d02.innerDiameterM;
  const hydraulicAreaNumeratorM2 = wettedPerimeterM * d02.innerDiameterM;
  const hydraulicAreaM2 = hydraulicAreaNumeratorM2 / 4;
  const hydraulicDiameterNumeratorM = 4 * hydraulicAreaM2;
  const hydraulicDiameterM =
    hydraulicDiameterNumeratorM / wettedPerimeterM;
  if (
    !isPositiveNormal(d02.outerDiameterM) ||
    !isPositiveNormal(d02.innerDiameterM) ||
    !isPositiveNormal(d02.metalAreaM2) ||
    !isPositiveNormal(diameterDifferenceM) ||
    !isPositiveNormal(diameterSumM) ||
    !isPositiveNormal(piTimesDiameterDifferenceM) ||
    !isPositiveNormal(metalAreaNumeratorM2) ||
    !isPositiveNormal(expectedMetalAreaM2) ||
    !isPositiveNormal(wettedPerimeterM) ||
    !isPositiveNormal(hydraulicAreaNumeratorM2) ||
    !isPositiveNormal(hydraulicAreaM2) ||
    !isPositiveNormal(hydraulicDiameterNumeratorM) ||
    !isPositiveNormal(hydraulicDiameterM)
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_resolution_invalid",
      "The bound hollow-round D-02 metal-area or hydraulic identity contains an overflow, false zero, or positive-subnormal binary64 term.",
      "Use a representable exact D-02 result; a measured Rac does not authorize a hidden section approximation.",
    );
  }
  if (!sameNumber(expectedMetalAreaM2, d02.metalAreaM2)) {
    return failure(
      "insufficient_data",
      "D-05.upstream_value_mismatch",
      "The hollow-round D-02 metal area is not the exact stable pi*(do-di)*(do+di)/4 result for its bound diameters.",
      "Rebind the exact D-02 v1.0.0 section result without rounding or substituting Ametal.",
    );
  }
  return null;
}

function validateScreeningEvidenceValues(
  evidence: Readonly<D05ScreeningApplicabilityEvidence>,
): D05AcResistanceFamilyFailure | null {
  if (
    (evidence.conductorIsolation !== "isolated" &&
      evidence.conductorIsolation !== "not_isolated" &&
      evidence.conductorIsolation !== "unconfirmed") ||
    (evidence.longStraightApproximation !==
      "long_straight_or_local_planar_confirmed" &&
      evidence.longStraightApproximation !== "not_satisfied" &&
      evidence.longStraightApproximation !== "unconfirmed") ||
    (evidence.fieldExposedSurfaces !== "declared_outer_surface_only" &&
      evidence.fieldExposedSurfaces !== "inner_and_outer_or_other" &&
      evidence.fieldExposedSurfaces !== "unconfirmed") ||
    (evidence.outerSurfaceCurrent !==
      "predominantly_outer_surface_confirmed" &&
      evidence.outerSurfaceCurrent !== "not_satisfied" &&
      evidence.outerSurfaceCurrent !== "unconfirmed") ||
    (evidence.surfaceFieldUniformity !==
      "approximately_uniform_circumferential_field" &&
      evidence.surfaceFieldUniformity !== "nonuniform" &&
      evidence.surfaceFieldUniformity !== "unconfirmed") ||
    (evidence.adjacentTurnProximity !== "negligible" &&
      evidence.adjacentTurnProximity !== "significant" &&
      evidence.adjacentTurnProximity !== "unconfirmed") ||
    (evidence.workpieceProximity !== "negligible" &&
      evidence.workpieceProximity !== "significant" &&
      evidence.workpieceProximity !== "unconfirmed") ||
    (evidence.returnPath !== "known_and_negligible_for_screening" &&
      evidence.returnPath !== "known_but_significant" &&
      evidence.returnPath !== "unknown") ||
    (evidence.externalField !==
      "known_isolated_conductor_screening_field" &&
      evidence.externalField !== "known_nonuniform_or_complex" &&
      evidence.externalField !== "unknown") ||
    (evidence.fproxUse !== "not_used" &&
      evidence.fproxUse !== "used_with_source" &&
      evidence.fproxUse !== "used_without_source") ||
    !isStableEvidenceId(evidence.applicabilitySourceRef)
  ) {
    return failure(
      "invalid_input",
      "D-05.screening_evidence_schema_invalid",
      "D-05 screening evidence contains an uncontrolled applicability value or source reference.",
      "Use the frozen strong-skin outer-surface screening evidence fields.",
    );
  }
  return null;
}

function screenKnownApplicability(
  shape: D05ConductorShape,
  evidence: Readonly<D05ScreeningApplicabilityEvidence>,
): D05AcResistanceFamilyFailure | null {
  if (shape === "rectangular_or_complex") {
    return failure(
      "not_applicable",
      "D-05.round_screening_geometry_not_applicable",
      D05_WARNING_PREDICATES.roundScreeningOnComplexGeometry,
      "Use same-state measurement or a future controlled geometry-specific method.",
    );
  }
  if (shape === "other_or_unknown") {
    return failure(
      "insufficient_data",
      "D-05.round_screening_geometry_unconfirmed",
      "The conductor shape is not confirmed as solid or hollow round.",
      "Resolve the mechanical section before selecting round screening.",
    );
  }
  if (evidence.fproxUse === "used_without_source") {
    return failure(
      "not_applicable",
      "D-05.unsourced_fprox_forbidden",
      D05_WARNING_PREDICATES.unsourcedFprox,
      "Remove Fprox; D-05 publishes no guessed proximity factor.",
    );
  }
  if (evidence.fproxUse === "used_with_source") {
    return failure(
      "not_applicable",
      "D-05.fprox_not_supported",
      "The frozen D-05 screening route has no approved Fprox term, including sourced user factors.",
      "Use a same-state measured Rac or a future separately controlled proximity method.",
    );
  }
  if (
    evidence.conductorIsolation === "not_isolated" ||
    evidence.longStraightApproximation === "not_satisfied" ||
    evidence.fieldExposedSurfaces === "inner_and_outer_or_other" ||
    evidence.outerSurfaceCurrent === "not_satisfied" ||
    evidence.surfaceFieldUniformity === "nonuniform" ||
    evidence.adjacentTurnProximity === "significant" ||
    evidence.workpieceProximity === "significant" ||
    evidence.returnPath === "known_but_significant" ||
    evidence.externalField === "known_nonuniform_or_complex"
  ) {
    return failure(
      "not_applicable",
      "D-05.screening_scope_not_applicable",
      "The declared field, return path, exposed surface, or proximity state is outside the isolated uniform-outer-surface screening domain.",
      "Use measurement or a controlled full electromagnetic method; do not add a proximity correction.",
    );
  }
  if (
    evidence.conductorIsolation === "unconfirmed" ||
    evidence.longStraightApproximation === "unconfirmed" ||
    evidence.fieldExposedSurfaces === "unconfirmed" ||
    evidence.outerSurfaceCurrent === "unconfirmed" ||
    evidence.surfaceFieldUniformity === "unconfirmed" ||
    evidence.adjacentTurnProximity === "unconfirmed" ||
    evidence.workpieceProximity === "unconfirmed" ||
    evidence.returnPath === "unknown" ||
    evidence.externalField === "unknown"
  ) {
    return failure(
      "insufficient_data",
      "D-05.screening_scope_unconfirmed",
      D05_WARNING_PREDICATES.externalFieldOrReturnPathUnknown,
      "Resolve isolation, exposed surface, field uniformity, return path, and proximity evidence.",
    );
  }
  return null;
}

function availableResistance(
  valueSi: number,
  interpretation: D05AvailableResistanceOutput["interpretation"],
): D05AvailableResistanceOutput {
  return Object.freeze({
    kind: "available",
    outputId: "Rac",
    valueSi,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
    interpretation,
  });
}

function availableRatio(valueSi: number): D05AvailableRatioOutput {
  return Object.freeze({
    kind: "available",
    outputId: "Rac/Rdc",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    interpretation: "same_boundary_ac_to_dc_resistance_ratio",
    passiveUniformConductorCheck:
      valueSi >= 1
        ? "at_or_above_one"
        : "below_one_measurement_review_not_a_universal_hard_law",
  });
}

function availableScreeningRatio(
  outputId: D05AvailableScreeningRatio["outputId"],
  valueSi: number,
): D05AvailableScreeningRatio {
  return Object.freeze({
    kind: "available",
    outputId,
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
  });
}

function sharedSuccessEvidence(
  context: Readonly<D05ControlledContext>,
  upstreamEvidence: Readonly<D05UpstreamEvidence>,
): D05SuccessBase["evidence"] {
  return Object.freeze({
    electricalState: Object.freeze({ ...context }),
    upstreamEvidence,
    sourceRefs: D05_SOURCE_REFS,
    contractSourceRefs: D05_CONTRACT_SOURCE_REFS,
    derivationRefs: D05_DERIVATION_REFS,
    validationCaseIds: D05_VALIDATION_CASE_IDS,
    methodCheckIds: D05_METHOD_CHECK_IDS,
    controlledSourceFiles: D05_CONTROLLED_SOURCE_FILES,
    minimumValidationProtocol: D05_MINIMUM_VALIDATION_PROTOCOL_MAPPING,
    numericRepresentabilityPolicy: D05_NUMERIC_REPRESENTABILITY_POLICY,
    implementationReadiness: D05_IMPLEMENTATION_READINESS,
  });
}

function evaluateScreening(
  context: Readonly<D05ControlledContext>,
  upstream: Readonly<D05UpstreamEvidence>,
  screening: Readonly<D05ScreeningApplicabilityEvidence>,
): D05AcResistanceFamilyOutcome {
  const knownApplicabilityFailure = screenKnownApplicability(
    upstream.d02.conductorShape,
    screening,
  );
  if (knownApplicabilityFailure !== null) return knownApplicabilityFailure;

  const upstreamBindingFailure = checkUpstreamSemanticBindings(context, upstream);
  if (upstreamBindingFailure !== null) return upstreamBindingFailure;

  const { d01, d02, d03, d04 } = upstream;
  if (
    d02.conductorShape === "solid_round" &&
    d02.innerDiameterM !== null
  ) {
    return failure(
      "invalid_input",
      "D-05.upstream_value_mismatch",
      "A solid-round D-02 snapshot cannot include an inner diameter.",
      "Use the exact D-02 solid-round result with innerDiameterM:null.",
    );
  }
  if (
    d02.conductorShape === "hollow_round" &&
    typeof d02.innerDiameterM !== "number"
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_value_mismatch",
      "A hollow-round D-02 snapshot requires an explicit inner diameter.",
      "Resolve the coolant-hole diameter from the mechanical geometry snapshot.",
    );
  }

  const outerRadiusM = d02.outerDiameterM / 2;
  const diameterDifferenceM =
    d02.innerDiameterM === null
      ? null
      : d02.outerDiameterM - d02.innerDiameterM;
  const wallThicknessM =
    diameterDifferenceM === null ? null : diameterDifferenceM / 2;
  const outerRadiusToSkinDepth = outerRadiusM / d04.skinDepthM;
  const wallThicknessToSkinDepth =
    wallThicknessM === null ? null : wallThicknessM / d04.skinDepthM;

  /* Frozen applicability gates precede unrelated machine-arithmetic checks. */
  if (
    Number.isFinite(outerRadiusM) &&
    outerRadiusM > 0 &&
    Number.isFinite(d04.skinDepthM) &&
    d04.skinDepthM > 0 &&
    Number.isFinite(outerRadiusToSkinDepth) &&
    outerRadiusToSkinDepth < 10
  ) {
    return failure(
      "not_applicable",
      "D-05.outer_radius_to_skin_depth_below_ten",
      D05_WARNING_PREDICATES.outerRadiusToSkinDepthBelowTen,
      "Use same-state measurement or a future controlled full-frequency method.",
    );
  }
  if (
    wallThicknessToSkinDepth !== null &&
    wallThicknessM !== null &&
    Number.isFinite(wallThicknessM) &&
    wallThicknessM > 0 &&
    Number.isFinite(d04.skinDepthM) &&
    d04.skinDepthM > 0 &&
    Number.isFinite(wallThicknessToSkinDepth) &&
    wallThicknessToSkinDepth < 3
  ) {
    return failure(
      "not_applicable",
      "D-05.hollow_wall_to_skin_depth_below_three",
      D05_WARNING_PREDICATES.hollowWallToSkinDepthBelowThree,
      "Use same-state measurement or a controlled hollow-conductor method.",
    );
  }

  const numericInputs = [
    context.frequencyHz,
    context.coilMeanTemperatureK,
    d01.conductorLengthM,
    d02.outerDiameterM,
    d02.metalAreaM2,
    d03.resistivityOhmM,
    d03.dcResistanceOhm,
    d04.relativePermeability,
    d04.skinDepthM,
  ];
  if (
    numericInputs.some((value) => !isPositiveNormal(value)) ||
    (d02.innerDiameterM !== null && !isPositiveNormal(d02.innerDiameterM)) ||
    (d02.innerDiameterM !== null &&
      d02.innerDiameterM >= d02.outerDiameterM)
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_input_invalid",
      "D-05 screening requires finite positive normal binary64 SI inputs and nested round dimensions.",
      "Correct the same-state SI evidence; the binary64 normal boundary is not an engineering tolerance.",
    );
  }

  const piTimesOuterDiameterM = Math.PI * d02.outerDiameterM;
  const expectedMetalAreaM2 =
    d02.innerDiameterM === null
      ? (piTimesOuterDiameterM * d02.outerDiameterM) / 4
      : (Math.PI * (d02.outerDiameterM - d02.innerDiameterM) *
          (d02.outerDiameterM + d02.innerDiameterM)) /
        4;
  const resistivityTimesLengthOhmM2 =
    d03.resistivityOhmM * d01.conductorLengthM;
  const expectedDcResistanceOhm =
    resistivityTimesLengthOhmM2 / d02.metalAreaM2;
  const absolutePermeabilityHPerM =
    D04_VACUUM_PERMEABILITY_H_PER_M * d04.relativePermeability;
  const piTimesFrequencyPerSecond = Math.PI * context.frequencyHz;
  const skinDepthDenominator =
    piTimesFrequencyPerSecond * absolutePermeabilityHPerM;
  const skinDepthRadicand = d04.resistivityOhmM / skinDepthDenominator;
  const expectedSkinDepthM = Math.sqrt(skinDepthRadicand);

  if (
    !isPositiveNormal(expectedMetalAreaM2) ||
    !isPositiveNormal(resistivityTimesLengthOhmM2) ||
    !isPositiveNormal(expectedDcResistanceOhm) ||
    !isPositiveNormal(absolutePermeabilityHPerM) ||
    !isPositiveNormal(piTimesFrequencyPerSecond) ||
    !isPositiveNormal(skinDepthDenominator) ||
    !isPositiveNormal(skinDepthRadicand) ||
    !isPositiveNormal(expectedSkinDepthM)
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_resolution_invalid",
      "A frozen D-02, D-03, or D-04 identity produced an overflow, false zero, or positive subnormal intermediate.",
      "Use representable same-state SI evidence; do not rearrange or tune the upstream identities.",
    );
  }

  if (
    !sameNumber(expectedMetalAreaM2, d02.metalAreaM2) ||
    !sameNumber(expectedDcResistanceOhm, d03.dcResistanceOhm) ||
    !sameNumber(expectedSkinDepthM, d04.skinDepthM)
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_value_mismatch",
      "D-02 Ametal, D-03 Rconductor_dc, or D-04 skin depth is not the exact frozen-identity result bound to the supplied upstream inputs.",
      "Use values copied from the controlled D-02, D-03, and D-04 results without rounding or substitution.",
    );
  }

  const participatingOuterPerimeterM = TWO_PI * outerRadiusM;
  const effectiveAreaM2 = participatingOuterPerimeterM * d04.skinDepthM;
  const acResistanceOhm =
    resistivityTimesLengthOhmM2 / effectiveAreaM2;
  const acToDcResistanceRatio = acResistanceOhm / d03.dcResistanceOhm;

  const numericIntermediates = [
    outerRadiusM,
    outerRadiusToSkinDepth,
    piTimesOuterDiameterM,
    expectedMetalAreaM2,
    resistivityTimesLengthOhmM2,
    expectedDcResistanceOhm,
    absolutePermeabilityHPerM,
    piTimesFrequencyPerSecond,
    skinDepthDenominator,
    skinDepthRadicand,
    expectedSkinDepthM,
    participatingOuterPerimeterM,
    effectiveAreaM2,
    acResistanceOhm,
    acToDcResistanceRatio,
  ];
  if (diameterDifferenceM !== null) numericIntermediates.push(diameterDifferenceM);
  if (wallThicknessM !== null) numericIntermediates.push(wallThicknessM);
  if (wallThicknessToSkinDepth !== null)
    numericIntermediates.push(wallThicknessToSkinDepth);
  if (
    numericIntermediates.some((value) => !isPositiveNormal(value)) ||
    (d02.innerDiameterM !== null &&
      (d02.outerDiameterM - d02.innerDiameterM === d02.outerDiameterM ||
        d02.outerDiameterM + d02.innerDiameterM === d02.outerDiameterM)) ||
    acResistanceOhm < d03.dcResistanceOhm
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_resolution_invalid",
      "The frozen screening chain produced an overflow, false zero, positive subnormal, swallowed positive term, or same-boundary passive-conductor inconsistency.",
      "Use representable same-boundary SI evidence; do not rearrange or tune the frozen equation.",
    );
  }

  const wallRatioOutput: D05AvailableScreeningRatio | D05SolidWallRatioNotApplicable =
    wallThicknessToSkinDepth === null
      ? Object.freeze({
          kind: "unavailable",
          outputId: "t_wall/delta",
          status: "not_applicable",
          reason: "solid round conductor has no hollow wall thickness",
        })
      : availableScreeningRatio(
          "t_wall/delta",
          wallThicknessToSkinDepth,
        );

  return Object.freeze({
    methodId: D05_METHOD_ID,
    methodVersion: D05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    internalRoute: "surface_skin_screening_round",
    status: "success_with_warnings",
    applicabilityStatus: "in_domain",
    parentRuntimeActivated: false,
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      Rac: availableResistance(
        acResistanceOhm,
        "strong_skin_outer_surface_screening_resistance",
      ),
      RacToRdc: availableRatio(acToDcResistanceRatio),
      Aeff: Object.freeze({
        kind: "available",
        outputId: "Aeff",
        valueSi: effectiveAreaM2,
        dimensionId: "area",
        canonicalUnitId: "m2",
        interpretation:
          "outer_surface_participating_perimeter_times_skin_depth",
      }),
      unaccountedProximity: Object.freeze({
        kind: "discriminator",
        outputId: "unaccounted proximity term",
        numericCorrectionPublished: false,
        state:
          "not_modelled_and_explicitly_assessed_negligible_within_screening_domain",
        zeroCorrectionAssumed: false,
        interpretation:
          "No Fprox is applied; adjacent-turn and workpiece proximity are outside the numeric screening result and were required to be explicitly assessed negligible.",
      }),
      screeningMetrics: Object.freeze({
        outerRadiusToSkinDepth: availableScreeningRatio(
          "ro/delta",
          outerRadiusToSkinDepth,
        ),
        wallThicknessToSkinDepth: wallRatioOutput,
      }),
    }),
    equation: Object.freeze({
      effectiveArea: "Aeff = 2 * pi * ro * delta",
      acResistance: "Rac_surface = rho * ell / Aeff",
      substitution: Object.freeze({
        outerDiameterM: d02.outerDiameterM,
        outerRadiusM,
        innerDiameterM: d02.innerDiameterM,
        wallThicknessM,
        skinDepthM: d04.skinDepthM,
        outerRadiusToSkinDepth,
        wallThicknessToSkinDepth,
        twoPi: TWO_PI,
        participatingOuterPerimeterM,
        effectiveAreaM2,
        resistivityOhmM: d03.resistivityOhmM,
        conductorLengthM: d01.conductorLengthM,
        resistivityTimesLengthOhmM2,
        acResistanceOhm,
        dcResistanceOhm: d03.dcResistanceOhm,
        acToDcResistanceRatio,
      }),
    }),
    screeningEvidence: screening,
    routePreference: ROUTE_PREFERENCE,
    evidence: sharedSuccessEvidence(context, upstream),
    limitations: SCREENING_LIMITATIONS,
  });
}

function validateMeasurementSchemaValues(
  measurement: Readonly<D05MeasurementIdentifiedEvidence>,
): D05AcResistanceFamilyFailure | null {
  if (
    (measurement.sourceOutcome !== "success" &&
      measurement.sourceOutcome !== "invalid_input" &&
      measurement.sourceOutcome !== "insufficient_data" &&
      measurement.sourceOutcome !== "not_applicable") ||
    !isStableEvidenceId(measurement.sourceResultId) ||
    !isContentAddressedSnapshotId(measurement.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(
      measurement.geometrySnapshotId,
      "geometry",
    ) ||
    !isContentAddressedSnapshotId(
      measurement.materialSnapshotId,
      "material",
    ) ||
    !isNonBlankText(measurement.materialId) ||
    typeof measurement.frequencyHz !== "number" ||
    typeof measurement.temperatureK !== "number" ||
    !isLoadedState(measurement.loadedState) ||
    !isStableEvidenceId(measurement.portId) ||
    !isNonBlankText(measurement.referencePlane) ||
    !isStableEvidenceId(measurement.resistanceBoundaryId) ||
    !isStableEvidenceId(measurement.deembeddingBoundaryId) ||
    (measurement.coilResistanceBoundaryConfirmed !== true &&
      measurement.coilResistanceBoundaryConfirmed !== false &&
      measurement.coilResistanceBoundaryConfirmed !== null) ||
    (measurement.deembeddingConfirmed !== true &&
      measurement.deembeddingConfirmed !== false &&
      measurement.deembeddingConfirmed !== null) ||
    (measurement.loadedPortTotalActiveResistance !== true &&
      measurement.loadedPortTotalActiveResistance !== false &&
      measurement.loadedPortTotalActiveResistance !== null) ||
    (measurement.identificationTechnique !==
      "four_terminal_impedance_at_operating_frequency" &&
      measurement.identificationTechnique !== "other_or_unconfirmed") ||
    (measurement.quantityBasis !== "rms" &&
      measurement.quantityBasis !== "other_or_unconfirmed") ||
    typeof measurement.currentRmsA !== "number" ||
    typeof measurement.resistanceOhm !== "number" ||
    typeof measurement.standardUncertaintyOhm !== "number" ||
    typeof measurement.coverageFactor !== "number" ||
    !isStableEvidenceId(measurement.uncertaintySourceRef) ||
    !isStableEvidenceId(measurement.provenanceSourceRef) ||
    !isStableEvidenceId(measurement.instrumentId) ||
    !isStableEvidenceId(measurement.calibrationRef) ||
    !isSha256(measurement.rawDataSha256) ||
    measurement.measurementProtocolId !== "EXP-RAC-001"
  ) {
    return failure(
      "invalid_input",
      "D-05.measurement_provenance_invalid",
      "Measurement evidence lacks a controlled same-state method, uncertainty, calibration, raw-data hash, or provenance field.",
      "Provide an exact EXP-RAC-001 evidence record; historical or reverse-engineered values are not accepted.",
    );
  }
  return null;
}

function evaluateMeasurement(
  context: Readonly<D05ControlledContext>,
  upstream: Readonly<D05UpstreamEvidence>,
  measurement: Readonly<D05MeasurementIdentifiedEvidence>,
): D05AcResistanceFamilyOutcome {
  /* Known physical-boundary exclusions precede unrelated numeric checks. */
  if (
    measurement.loadedPortTotalActiveResistance === true ||
    measurement.coilResistanceBoundaryConfirmed === false
  ) {
    return failure(
      "not_applicable",
      "D-05.loaded_port_total_not_coil_rac",
      D05_WARNING_PREDICATES.loadedPortResistanceCalledCoilRac,
      "De-embed and identify the coil-only resistance boundary before publishing Rac.",
    );
  }
  if (measurement.deembeddingConfirmed === false) {
    return failure(
      "not_applicable",
      "D-05.measurement_boundary_unconfirmed",
      "The measurement is not de-embedded to the declared coil-resistance boundary.",
      "Supply a successful coil-only de-embedding result and its boundary ID.",
    );
  }
  if (
    measurement.loadedPortTotalActiveResistance === null ||
    measurement.coilResistanceBoundaryConfirmed === null ||
    measurement.deembeddingConfirmed === null
  ) {
    return failure(
      "insufficient_data",
      "D-05.measurement_boundary_unconfirmed",
      "Loaded-port exclusion, coil-only boundary, or de-embedding evidence is explicitly unresolved.",
      "Resolve every physical-boundary confirmation; do not substitute a loaded-port value.",
    );
  }
  if (
    measurement.identificationTechnique !==
      "four_terminal_impedance_at_operating_frequency" ||
    measurement.quantityBasis !== "rms"
  ) {
    return failure(
      "insufficient_data",
      "D-05.measurement_method_unconfirmed",
      "The operating-frequency four-terminal/impedance method and RMS basis are not confirmed.",
      "Identify Rac with the controlled same-state measurement method and explicit RMS basis.",
    );
  }
  if (measurement.sourceOutcome !== "success") {
    return failure(
      measurement.sourceOutcome,
      "D-05.measurement_result_unavailable",
      `The selected measurement result reports ${measurement.sourceOutcome}.`,
      measurement.sourceOutcome === "not_applicable"
        ? "Select a measurement whose physical boundary and state are applicable."
        : measurement.sourceOutcome === "invalid_input"
          ? "Correct the measurement input rather than retaining a candidate value."
          : "Resolve the measurement and uncertainty record before publishing Rac.",
    );
  }

  const upstreamBindingFailure = checkUpstreamSemanticBindings(context, upstream);
  if (upstreamBindingFailure !== null) return upstreamBindingFailure;

  const d02SectionFailure = validateMeasurementD02SectionIdentity(upstream.d02);
  if (d02SectionFailure !== null) return d02SectionFailure;

  if (
    measurement.caseSnapshotId !== context.caseSnapshotId ||
    measurement.geometrySnapshotId !== context.geometrySnapshotId ||
    measurement.materialSnapshotId !== context.materialSnapshotId ||
    measurement.materialId !== context.materialId ||
    !sameNumber(measurement.frequencyHz, context.frequencyHz) ||
    !sameNumber(measurement.temperatureK, context.coilMeanTemperatureK) ||
    measurement.loadedState !== context.loadedState ||
    measurement.portId !== context.portId ||
    measurement.referencePlane !== context.referencePlane ||
    measurement.resistanceBoundaryId !== context.resistanceBoundaryId
  ) {
    return failure(
      "insufficient_data",
      "D-05.measurement_state_mismatch",
      "Measured Rac does not share the selected case, geometry, material, temperature, frequency, load, port, reference plane, and resistance boundary.",
      "Repeat or reselect the measurement at the exact D-05 state and physical boundary.",
    );
  }

  if (
    !isPositiveNormal(context.frequencyHz) ||
    !isPositiveNormal(context.coilMeanTemperatureK) ||
    !isPositiveNormal(upstream.d01.conductorLengthM) ||
    !isPositiveNormal(upstream.d02.metalAreaM2) ||
    !isPositiveNormal(upstream.d03.resistivityOhmM) ||
    !isPositiveNormal(upstream.d04.relativePermeability) ||
    !isPositiveNormal(upstream.d04.skinDepthM) ||
    !isPositiveNormal(measurement.currentRmsA) ||
    !isPositiveNormal(measurement.resistanceOhm) ||
    !isZeroOrPositiveNormal(measurement.standardUncertaintyOhm) ||
    !isPositiveNormal(measurement.coverageFactor) ||
    !isPositiveNormal(upstream.d03.dcResistanceOhm)
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_input_invalid",
      "Measured Rac, current, state, uncertainty, coverage factor, and same-boundary Rdc must be finite representable canonical-SI values.",
      "Correct the measurement record; no NaN, infinity, false zero, or positive subnormal is accepted.",
    );
  }

  const resistivityTimesLengthOhmM2 =
    upstream.d03.resistivityOhmM * upstream.d01.conductorLengthM;
  const expectedDcResistanceOhm =
    resistivityTimesLengthOhmM2 / upstream.d02.metalAreaM2;
  const absolutePermeabilityHPerM =
    D04_VACUUM_PERMEABILITY_H_PER_M * upstream.d04.relativePermeability;
  const piTimesFrequencyPerSecond = Math.PI * context.frequencyHz;
  const skinDepthDenominator =
    piTimesFrequencyPerSecond * absolutePermeabilityHPerM;
  const skinDepthRadicand =
    upstream.d04.resistivityOhmM / skinDepthDenominator;
  const expectedSkinDepthM = Math.sqrt(skinDepthRadicand);
  if (
    !isPositiveNormal(resistivityTimesLengthOhmM2) ||
    !isPositiveNormal(expectedDcResistanceOhm) ||
    !isPositiveNormal(absolutePermeabilityHPerM) ||
    !isPositiveNormal(piTimesFrequencyPerSecond) ||
    !isPositiveNormal(skinDepthDenominator) ||
    !isPositiveNormal(skinDepthRadicand) ||
    !isPositiveNormal(expectedSkinDepthM)
  ) {
    return failure(
      "invalid_input",
      "D-05.numeric_resolution_invalid",
      "The bound D-03 or D-04 identity produced an overflow, false zero, or positive subnormal intermediate.",
      "Use representable same-state SI evidence; do not infer a measured result from failed upstream arithmetic.",
    );
  }
  if (
    !sameNumber(expectedDcResistanceOhm, upstream.d03.dcResistanceOhm) ||
    !sameNumber(expectedSkinDepthM, upstream.d04.skinDepthM)
  ) {
    return failure(
      "insufficient_data",
      "D-05.upstream_value_mismatch",
      "Measured-route D-03 Rconductor_dc or D-04 skin depth is not the exact bound frozen-identity result.",
      "Use the exact controlled D-03 and D-04 values without rounding or substitution.",
    );
  }

  const racToRdc = measurement.resistanceOhm / upstream.d03.dcResistanceOhm;
  if (!isPositiveNormal(racToRdc)) {
    return failure(
      "invalid_input",
      "D-05.numeric_resolution_invalid",
      "The same-boundary measured Rac/Rdc comparison is not a positive normal finite binary64 value.",
      "Use representable same-boundary resistance evidence.",
    );
  }

  return Object.freeze({
    methodId: D05_METHOD_ID,
    methodVersion: D05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    internalRoute: "measurement_identified",
    status: "success",
    applicabilityStatus: "in_domain",
    parentRuntimeActivated: false,
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      Rac: availableResistance(
        measurement.resistanceOhm,
        "same_state_deembedded_measured_coil_ac_resistance",
      ),
      RacToRdc: availableRatio(racToRdc),
      Aeff: Object.freeze({
        kind: "unavailable",
        outputId: "Aeff",
        status: "insufficient_data",
        reason:
          "measurement_identified does not infer an effective area from measured Rac",
      }),
      unaccountedProximity: Object.freeze({
        kind: "discriminator",
        outputId: "unaccounted proximity term",
        numericCorrectionPublished: false,
        state: "included_in_measured_rac_but_not_separately_identified",
        zeroCorrectionAssumed: false,
        interpretation:
          "The declared loaded-state measurement contains electromagnetic proximity effects in Rac but does not publish a separate correction factor.",
      }),
      measurementUncertainty: Object.freeze({
        standardUncertaintyOhm: measurement.standardUncertaintyOhm,
        coverageFactor: measurement.coverageFactor,
        uncertaintySourceRef: measurement.uncertaintySourceRef,
      }),
    }),
    measurementEvidence: measurement,
    routePreference: ROUTE_PREFERENCE,
    evidence: sharedSuccessEvidence(context, upstream),
    limitations: MEASUREMENT_LIMITATIONS,
  });
}

/** Isolated canonical-SI evaluation of the frozen D-05 parent routes. */
export function evaluateD05AcResistanceFamily(
  input: D05AcResistanceFamilyInput,
): D05AcResistanceFamilyOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "route",
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "materialId",
    "frequencyHz",
    "coilMeanTemperatureK",
    "portId",
    "referencePlane",
    "loadedState",
    "resistanceBoundaryId",
    "upstreamEvidence",
    "screening",
    "measurement",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-05.input_schema_invalid",
      "D-05 input must be an exact controlled plain-data record without getters, Proxy traps, missing fields, or extra fields.",
      "Provide the complete canonical-SI D-05 parent input.",
    );
  }
  if (
    controlledInput.route !== "surface_skin_screening_round" &&
    controlledInput.route !== "measurement_identified"
  ) {
    return failure(
      "invalid_input",
      "D-05.route_invalid",
      "D-05 accepts only the two frozen internal route strings.",
      "Select surface_skin_screening_round or measurement_identified; do not invent a child method ID.",
    );
  }

  const contextResult = validateSharedContext(controlledInput);
  if (!contextResult.ok) return contextResult.failure;
  const upstreamResult = parseUpstreamEvidence(controlledInput.upstreamEvidence);
  if (!upstreamResult.ok) return upstreamResult.failure;
  const upstreamSchemaFailure = validateUpstreamSchemaValues(
    upstreamResult.parsed.evidence,
  );
  if (upstreamSchemaFailure !== null) return upstreamSchemaFailure;

  if (controlledInput.route === "surface_skin_screening_round") {
    if (controlledInput.screening === null || controlledInput.screening === undefined) {
      return failure(
        "insufficient_data",
        "D-05.screening_evidence_missing",
        "The screening route requires explicit exposed-surface, field, return-path, and proximity evidence.",
        "Provide the complete screening evidence record.",
      );
    }
    if (controlledInput.measurement !== null) {
      return failure(
        "invalid_input",
        "D-05.route_payload_invalid",
        "The screening route requires measurement:null; route payloads cannot be merged.",
        "Supply exactly one frozen parent route payload.",
      );
    }
    const screening = readScreeningEvidence(controlledInput.screening);
    if (screening === null) {
      return failure(
        "invalid_input",
        "D-05.screening_evidence_schema_invalid",
        "Screening evidence must be an exact controlled plain-data record.",
        "Remove extra fields, accessors, and uncontrolled evidence values.",
      );
    }
    const screeningSchemaFailure = validateScreeningEvidenceValues(screening);
    if (screeningSchemaFailure !== null) return screeningSchemaFailure;
    return evaluateScreening(
      contextResult.context,
      upstreamResult.parsed.evidence,
      screening,
    );
  }

  if (controlledInput.measurement === null || controlledInput.measurement === undefined) {
    return failure(
      "insufficient_data",
      "D-05.measurement_evidence_missing",
      "The measurement route requires an explicit measurement, uncertainty, de-embedding, and provenance record.",
      "Provide same-state EXP-RAC-001 measurement evidence.",
    );
  }
  if (controlledInput.screening !== null) {
    return failure(
      "invalid_input",
      "D-05.route_payload_invalid",
      "The measurement route requires screening:null; route payloads cannot be merged.",
      "Supply exactly one frozen parent route payload.",
    );
  }
  const measurement = readMeasurementEvidence(controlledInput.measurement);
  if (measurement === null) {
    return failure(
      "invalid_input",
      "D-05.measurement_evidence_schema_invalid",
      "Measurement evidence must be an exact controlled plain-data record.",
      "Remove extra fields, getters, Proxy traps, and uncontrolled fields.",
    );
  }
  const measurementSchemaFailure = validateMeasurementSchemaValues(measurement);
  if (measurementSchemaFailure !== null) return measurementSchemaFailure;
  return evaluateMeasurement(
    contextResult.context,
    upstreamResult.parsed.evidence,
    measurement,
  );
}
