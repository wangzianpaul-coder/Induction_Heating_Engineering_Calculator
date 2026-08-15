/**
 * I-04 fixed-h/fixed-k cylindrical insulation screening.
 *
 * This module is deliberately isolated from the runtime and public API. The
 * registered I-04 parent still requires approved child-method IDs. Only the
 * frozen constant-k/constant-h screen is evaluated here; a nonlinear loss
 * curve is represented as unavailable and is never guessed.
 */

import { TOL_ID, isWithinTolId } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  parameterId,
  sourceRef,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "../../registries/parameterCatalog.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("I-04"));
const J01_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-01"));
const J02_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-02"));

export const I04_METHOD_ID = "I-04" as const;
export const I04_METHOD_VERSION = SPECIFICATION.methodVersion;
export const I04_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const I04_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const I04_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const I04_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const I04_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;
export const I04_VALIDATION_NOTES = SPECIFICATION.validationNotes;

/** IEEE-754 binary64 lower boundary for positive normal values. */
export const I04_BINARY64_MIN_POSITIVE_NORMAL = 2 ** -1022;

const REGISTERED_I04_PARAMETER_IDS = Object.freeze(
  PARAMETER_REGISTRY.values()
    .filter((record) =>
      record.consumingMethods.some(
        (candidate) => candidate === I04_METHOD_ID,
      ),
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
  SPECIFICATION.inputParameterIds.filter(
    (candidate) => hasRegisteredParameterId(candidate),
  ),
);

/**
 * Controlled release gates discovered without modifying their owning
 * registries. No local route name below is a child method ID.
 */
export const I04_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  parentRequiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  approvedChildMethodIds: Object.freeze([]) as readonly [],
  openGates: Object.freeze([
    Object.freeze({
      gateId: "I-04.approved-child-method-ids" as const,
      reason:
        "The frozen I-04 parent requires a submethod split, but no approved child method IDs exist; this implementation does not invent one." as const,
    }),
    Object.freeze({
      gateId: "I-04.nonlinear-loss-curve-child" as const,
      reason:
        "The nonlinear surface-loss-curve child has no frozen contract or approved ID and remains explicitly unavailable." as const,
    }),
    Object.freeze({
      gateId: "I-04.stable-warning-ids" as const,
      reason:
        "The frozen contract supplies warning prose but no stable warning IDs; I-04 does not invent IDs." as const,
    }),
    Object.freeze({
      gateId: "I-04.parameter-dictionary-contract-alignment" as const,
      reason:
        "The contract IDs ri, delta, k, and h(or nonlinear surface model) are not parameter-registry IDs; the registry instead declares insulation inner/outer diameters as I-04 consumers and has no I-04 k/h entries." as const,
      contractInputIds: SPECIFICATION.inputParameterIds,
      registeredContractInputIds: REGISTERED_CONTRACT_INPUT_IDS,
      parameterIdsDeclaringI04Consumer: REGISTERED_I04_PARAMETER_IDS,
    }),
    Object.freeze({
      gateId: "I-04.unavailable-output-adapter" as const,
      reason:
        "UI/report adapters must preserve unavailable numeric outputs without value, unit, or dimension placeholders." as const,
    }),
  ]),
});

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `I-04 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const I04_WARNING_PREDICATES = Object.freeze({
  exactWithNonlinearPhysics: controlledWarningPredicate(
    "rcrit is treated as exact with radiation or variable h/k" as const,
  ),
  projectThresholdCalledStandard: controlledWarningPredicate(
    "project QA threshold is called a standard threshold" as const,
  ),
  replacesInsulationRootSolve: controlledWarningPredicate(
    "screening replaces the insulation root solve" as const,
  ),
});

export const I04_DEPENDENCY_METHOD_VERSIONS = Object.freeze({
  cylindricalConduction: Object.freeze({
    methodId: "J-01" as const,
    methodVersion: J01_SPECIFICATION.methodVersion,
  }),
  convectionCoefficient: Object.freeze({
    methodId: "J-02" as const,
    methodVersion: J02_SPECIFICATION.methodVersion,
  }),
});

export const I04_CRITICAL_RADIUS_SCREENING_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: I04_SOURCE_REFS,
  contractSourceRefs: I04_CONTRACT_SOURCE_REFS,
  derivationRefs: I04_DERIVATION_REFS,
  validationCaseIds: I04_VALIDATION_CASE_IDS,
  methodCheckIds: I04_METHOD_CHECK_IDS,
  validationNotes: I04_VALIDATION_NOTES,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
  dependencyMethodVersions: I04_DEPENDENCY_METHOD_VERSIONS,
  implementationReadiness: I04_IMPLEMENTATION_READINESS,
});

export interface I04GeometryEvidenceInput {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly thermalStateId: string;
  readonly geometryKind: "single_layer_cylindrical_insulation";
  /** Contract ri in canonical SI metres. */
  readonly innerRadiusM: number;
  /** Contract delta in canonical SI metres. */
  readonly insulationThicknessM: number;
  readonly innerRadiusParameterId: "ri";
  readonly thicknessParameterId: "delta";
  readonly canonicalLengthUnitId: "m";
  readonly planeWallAreaBasis:
    "inner_cylindrical_surface_area_per_unit_length";
  readonly geometrySourceRef: string;
}

export interface I04MaterialEvidenceInput {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly materialId: string;
  readonly thermalStateId: string;
  readonly propertyStateId: string;
  readonly propertyTemperatureK: number;
  /** Canonical SI W/(m*K); null is explicit missing/nonlinear evidence. */
  readonly thermalConductivityWPerMK: number | null;
  readonly conductivityModel:
    | "fixed_constant_over_screening_domain"
    | "variable_or_nonlinear"
    | "unconfirmed";
  readonly canonicalUnitId: "W_per_m_K";
  readonly conductivitySourceRef: string;
}

export interface I04SurfaceCoefficientEvidenceInput {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly thermalStateId: string;
  readonly surfaceStateId: string;
  readonly surfaceTemperatureK: number;
  /** J-02 only for an available coefficient; null is explicit otherwise. */
  readonly sourceMethodId: "J-02" | null;
  readonly sourceMethodVersion: string | null;
  readonly coefficientStatus:
    | "available"
    | "insufficient_data"
    | "not_applicable";
  /** Canonical SI W/(m^2*K); null is explicit unresolved/nonlinear evidence. */
  readonly heatTransferCoefficientWPerM2K: number | null;
  readonly hModel:
    | "fixed_over_screening_domain"
    | "variable_over_screening_domain"
    | "unconfirmed";
  readonly radiationIncluded: false | true | null;
  readonly canonicalUnitId: "W_per_m2_K";
  readonly coefficientSourceRef: string;
}

export interface I04UsageEvidenceInput {
  readonly criticalRadiusInterpretation:
    | "screening_only_not_exact_design"
    | "exact_design_conclusion"
    | "unconfirmed";
  readonly rootSolveRelation:
    | "diagnostic_only_does_not_replace_I01_I02"
    | "replaces_I01_or_I02"
    | "unconfirmed";
  readonly qaThresholdPolicy:
    | "none"
    | "project_specific_not_used_by_I04"
    | "claimed_universal_or_standard"
    | "unconfirmed";
}

export interface I04CriticalRadiusScreeningInput {
  readonly geometryEvidence: I04GeometryEvidenceInput;
  readonly materialEvidence: I04MaterialEvidenceInput;
  readonly surfaceCoefficientEvidence: I04SurfaceCoefficientEvidenceInput;
  readonly usageEvidence: I04UsageEvidenceInput;
  readonly nonlinearLossCurveRequest: "not_requested" | "requested";
}

export interface I04AvailableDimensionlessOutput {
  readonly kind: "available";
  readonly outputId:
    | "delta/ri"
    | "cylindrical_to_plane_resistance_ratio"
    | "plane_to_cylindrical_resistance_ratio"
    | "plane_to_cylindrical_heat_rate_ratio"
    | "relative_plane_heat_rate_shortfall"
    | "critical_radius_to_outer_radius_ratio";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: string;
}

export interface I04AvailableLengthOutput {
  readonly kind: "available";
  readonly outputId: "rcrit" | "outer_radius" | "critical_radius_gap";
  readonly valueSi: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation: string;
}

export interface I04UnavailableNumericOutput {
  readonly kind: "unavailable";
  readonly outputId:
    | "cylindrical_to_plane_resistance_ratio"
    | "plane_to_cylindrical_resistance_ratio"
    | "plane_to_cylindrical_heat_rate_ratio"
    | "relative_plane_heat_rate_shortfall"
    | "rcrit"
    | "critical_radius_gap";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface I04AvailableScreeningStatusOutput {
  readonly kind: "available";
  readonly outputId: "screening status";
  readonly value:
    | "outer_radius_below_critical_radius"
    | "outer_radius_equal_to_critical_radius"
    | "outer_radius_above_critical_radius";
  readonly localFixedModelImplication:
    | "an_outward_radius_increase_can_increase_heat_loss"
    | "stationary_maximum_of_the_fixed_h_fixed_k_model"
    | "an_outward_radius_increase_decreases_heat_loss";
  readonly interpretation:
    "raw_fixed_h_fixed_k_cylindrical_screen_only_not_a_design_pass";
}

export interface I04UnavailableScreeningStatusOutput {
  readonly kind: "unavailable";
  readonly outputId: "screening status";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly value?: never;
}

export interface I04UnavailableNonlinearLossCurveOutput {
  readonly kind: "unavailable";
  readonly outputId: "optional nonlinear loss curve";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason:
    | "optional curve was not requested for the fixed-h/fixed-k screen"
    | "nonlinear curve requires an approved child contract and method ID";
  readonly approvedChildMethodId: null;
  readonly value?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface I04PlaneWallComparisonAvailable {
  readonly kind: "available";
  readonly areaBasis:
    "inner_cylindrical_surface_area_per_unit_length";
  readonly cylindricalToPlaneResistanceRatio: I04AvailableDimensionlessOutput;
  readonly planeToCylindricalResistanceRatio: I04AvailableDimensionlessOutput;
  readonly planeToCylindricalHeatRateRatio: I04AvailableDimensionlessOutput;
  readonly relativePlaneHeatRateShortfall: I04AvailableDimensionlessOutput;
  readonly qaThresholdApplied: false;
  readonly standardThresholdClaimed: false;
}

export interface I04PlaneWallComparisonUnavailable {
  readonly kind: "unavailable";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly cylindricalToPlaneResistanceRatio: I04UnavailableNumericOutput;
  readonly planeToCylindricalResistanceRatio: I04UnavailableNumericOutput;
  readonly planeToCylindricalHeatRateRatio: I04UnavailableNumericOutput;
  readonly relativePlaneHeatRateShortfall: I04UnavailableNumericOutput;
}

export interface I04CriticalRadiusAvailable {
  readonly kind: "available";
  readonly criticalRadius: I04AvailableLengthOutput;
  readonly outerRadius: I04AvailableLengthOutput;
  readonly criticalRadiusGap: I04AvailableLengthOutput;
  readonly criticalRadiusToOuterRadiusRatio: I04AvailableDimensionlessOutput;
}

export interface I04CriticalRadiusUnavailable {
  readonly kind: "unavailable";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly criticalRadius: I04UnavailableNumericOutput;
  readonly criticalRadiusGap: I04UnavailableNumericOutput;
}

export interface I04CriticalRadiusScreeningValue {
  readonly deltaOverRi: I04AvailableDimensionlessOutput;
  readonly planeWallComparison:
    | I04PlaneWallComparisonAvailable
    | I04PlaneWallComparisonUnavailable;
  readonly criticalRadiusScreen:
    | I04CriticalRadiusAvailable
    | I04CriticalRadiusUnavailable;
  readonly screeningStatus:
    | I04AvailableScreeningStatusOutput
    | I04UnavailableScreeningStatusOutput;
  readonly nonlinearLossCurve: I04UnavailableNonlinearLossCurveOutput;
}

export interface I04FixedModelSubstitution {
  readonly thermalConductivityWPerMK: number;
  readonly heatTransferCoefficientWPerM2K: number;
  readonly criticalRadiusM: number;
  readonly outerRadiusM: number;
  readonly criticalRadiusGapM: number;
  readonly criticalRadiusToOuterRadiusRatio: number;
}

export interface I04CriticalRadiusScreeningSuccess {
  readonly methodId: typeof I04_METHOD_ID;
  readonly methodVersion: typeof I04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus:
    | "in_domain_fixed_h_fixed_k_screen"
    | "partial_outputs_nonlinear_route_unavailable"
    | "partial_outputs_model_evidence_insufficient";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: I04CriticalRadiusScreeningValue;
  readonly equations: Readonly<{
    readonly geometryRatio: "x = delta / r_i";
    readonly cylindricalResistance:
      "R_cyl / R_plane,inner = ln(1 + x) / x";
    readonly reciprocalResistance:
      "R_plane,inner / R_cyl = x / ln(1 + x)";
    readonly heatRateRatio:
      "Q_plane,inner / Q_cyl = ln(1 + x) / x";
    readonly criticalRadius: "r_crit = k / h";
    readonly outerRadius: "r_o = r_i + delta";
  }>;
  readonly substitution: Readonly<{
    readonly innerRadiusM: number;
    readonly insulationThicknessM: number;
    readonly deltaOverRi: number;
    readonly logOnePlusDeltaOverRi: number | null;
    readonly fixedModel: Readonly<I04FixedModelSubstitution> | null;
  }>;
  readonly identityChecks: Readonly<{
    readonly toleranceId: typeof TOL_ID.id;
    readonly use:
      "algebraic_identity_only_not_engineering_or_applicability_threshold";
    readonly binary64PositiveNormalFloor:
      typeof I04_BINARY64_MIN_POSITIVE_NORMAL;
    readonly binary64FloorUse:
      "machine_representability_boundary_not_engineering_threshold";
    readonly resistanceReciprocalProduct: number | null;
    readonly reconstructedConductivityWPerMK: number | null;
    readonly criticalRadiusAbsoluteResidualWPerMK: number | null;
    readonly passed: true | null;
  }>;
  readonly evidence: Readonly<{
    readonly geometry: Readonly<I04GeometryEvidenceInput>;
    readonly material: Readonly<I04MaterialEvidenceInput>;
    readonly surfaceCoefficient: Readonly<I04SurfaceCoefficientEvidenceInput>;
    readonly usage: Readonly<I04UsageEvidenceInput>;
    readonly nonlinearLossCurveRequest: "not_requested" | "requested";
  }>;
  readonly assumptions: readonly [
    "single-layer cylindrical sidewall geometry",
    "plane-wall comparison uses the inner cylindrical surface area per unit length and no QA threshold",
    "rcrit is evaluated only for fixed positive k and fixed positive convection-only h",
    "critical-radius status is a raw local screening result and never a design acceptance",
    "I-04 does not replace the full I-01 or I-02 nonlinear insulation solve",
    "radiation, variable h, or variable k requires a separately approved nonlinear loss-curve child",
  ];
  readonly mapping: typeof I04_CRITICAL_RADIUS_SCREENING_MAPPING;
  readonly failure?: never;
}

export type I04FailureCode =
  | "I-04.input_schema_invalid"
  | "I-04.geometry_schema_invalid"
  | "I-04.geometry_value_invalid"
  | "I-04.geometry_provenance_invalid"
  | "I-04.material_schema_invalid"
  | "I-04.material_value_invalid"
  | "I-04.material_provenance_invalid"
  | "I-04.surface_coefficient_schema_invalid"
  | "I-04.surface_coefficient_value_invalid"
  | "I-04.surface_coefficient_provenance_invalid"
  | "I-04.surface_dependency_version_invalid"
  | "I-04.usage_schema_invalid"
  | "I-04.model_scope_unconfirmed"
  | "I-04.exact_design_use_not_applicable"
  | "I-04.root_solve_replacement_not_applicable"
  | "I-04.standard_threshold_claim_not_applicable"
  | "I-04.snapshot_binding_mismatch"
  | "I-04.geometry_numeric_resolution_invalid"
  | "I-04.plane_wall_numeric_resolution_invalid"
  | "I-04.critical_radius_numeric_resolution_invalid"
  | "I-04.critical_radius_identity_failed";

export interface I04CriticalRadiusScreeningFailure {
  readonly methodId: typeof I04_METHOD_ID;
  readonly methodVersion: typeof I04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly mapping: typeof I04_CRITICAL_RADIUS_SCREENING_MAPPING;
  readonly failure: Readonly<{
    readonly code: I04FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
}

export type I04CriticalRadiusScreeningOutcome =
  | I04CriticalRadiusScreeningSuccess
  | I04CriticalRadiusScreeningFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function failure(
  status: I04CriticalRadiusScreeningFailure["status"],
  code: I04FailureCode,
  message: string,
  action: string,
): I04CriticalRadiusScreeningFailure {
  return Object.freeze({
    methodId: I04_METHOD_ID,
    methodVersion: I04_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    mapping: I04_CRITICAL_RADIUS_SCREENING_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableMachineId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    sourceRef(value);
    return true;
  } catch {
    return false;
  }
}

function isPositiveNormal(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= I04_BINARY64_MIN_POSITIVE_NORMAL
  );
}

function isZeroOrNormalMagnitude(value: number): boolean {
  return value === 0 || Math.abs(value) >= I04_BINARY64_MIN_POSITIVE_NORMAL;
}

type ReadResult<T> =
  | Readonly<{ ok: true; value: Readonly<T> }>
  | Readonly<{ ok: false; result: I04CriticalRadiusScreeningFailure }>;

function readGeometryEvidence(
  value: unknown,
): ReadResult<I04GeometryEvidenceInput> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "controlVolumeId",
    "boundaryId",
    "surfaceId",
    "thermalStateId",
    "geometryKind",
    "innerRadiusM",
    "insulationThicknessM",
    "innerRadiusParameterId",
    "thicknessParameterId",
    "canonicalLengthUnitId",
    "planeWallAreaBasis",
    "geometrySourceRef",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "I-04.geometry_schema_invalid",
        "Geometry evidence is not an exact plain controlled record.",
        "Provide every frozen geometry field once, with no accessors, symbols, missing fields, or extras.",
      ),
    });
  }
  if (
    typeof record.innerRadiusM !== "number" ||
    !Number.isFinite(record.innerRadiusM) ||
    record.innerRadiusM <= 0 ||
    typeof record.insulationThicknessM !== "number" ||
    !Number.isFinite(record.insulationThicknessM) ||
    record.insulationThicknessM <= 0
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.geometry_value_invalid",
        "ri and delta must be positive finite canonical-SI lengths.",
        "Provide positive finite metres; zero thickness is outside this finite-thickness resistance comparison.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableMachineId(record.controlVolumeId) ||
    !isStableMachineId(record.boundaryId) ||
    !isStableMachineId(record.surfaceId) ||
    !isStableMachineId(record.thermalStateId) ||
    !isStableMachineId(record.geometrySourceRef) ||
    record.geometryKind !== "single_layer_cylindrical_insulation" ||
    record.innerRadiusParameterId !== "ri" ||
    record.thicknessParameterId !== "delta" ||
    record.canonicalLengthUnitId !== "m" ||
    record.planeWallAreaBasis !==
      "inner_cylindrical_surface_area_per_unit_length"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "I-04.geometry_provenance_invalid",
        "Geometry is not bound to the frozen cylindrical ri/delta SI contract and an immutable snapshot.",
        "Bind ri and delta to one case/geometry/control-volume/boundary/surface state and state the inner-area plane-wall basis.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      controlVolumeId: record.controlVolumeId,
      boundaryId: record.boundaryId,
      surfaceId: record.surfaceId,
      thermalStateId: record.thermalStateId,
      geometryKind: record.geometryKind,
      innerRadiusM: record.innerRadiusM,
      insulationThicknessM: record.insulationThicknessM,
      innerRadiusParameterId: record.innerRadiusParameterId,
      thicknessParameterId: record.thicknessParameterId,
      canonicalLengthUnitId: record.canonicalLengthUnitId,
      planeWallAreaBasis: record.planeWallAreaBasis,
      geometrySourceRef: record.geometrySourceRef,
    }),
  });
}

function readMaterialEvidence(
  value: unknown,
): ReadResult<I04MaterialEvidenceInput> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "materialId",
    "thermalStateId",
    "propertyStateId",
    "propertyTemperatureK",
    "thermalConductivityWPerMK",
    "conductivityModel",
    "canonicalUnitId",
    "conductivitySourceRef",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "I-04.material_schema_invalid",
        "Material evidence is not an exact plain controlled record.",
        "Provide the complete material snapshot, state, conductivity model, SI value or explicit null, and source.",
      ),
    });
  }
  const conductivity = record.thermalConductivityWPerMK;
  if (
    typeof record.propertyTemperatureK !== "number" ||
    !Number.isFinite(record.propertyTemperatureK) ||
    record.propertyTemperatureK <= 0 ||
    (conductivity !== null &&
      (typeof conductivity !== "number" ||
        !Number.isFinite(conductivity) ||
        conductivity <= 0))
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.material_value_invalid",
        "The material state temperature and any supplied k must be positive finite SI values.",
        "Provide absolute kelvin and positive finite W/(m*K), or explicit null for unresolved/nonlinear k.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableMachineId(record.materialId) ||
    !isStableMachineId(record.thermalStateId) ||
    !isStableMachineId(record.propertyStateId) ||
    !isStableMachineId(record.conductivitySourceRef) ||
    (record.conductivityModel !==
      "fixed_constant_over_screening_domain" &&
      record.conductivityModel !== "variable_or_nonlinear" &&
      record.conductivityModel !== "unconfirmed") ||
    record.canonicalUnitId !== "W_per_m_K"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "I-04.material_provenance_invalid",
        "Thermal conductivity lacks controlled material, state, unit, or source provenance.",
        "Bind k to one content-addressed material snapshot and explicit property state/source.",
      ),
    });
  }
  if (
    record.conductivityModel ===
      "fixed_constant_over_screening_domain" &&
    conductivity === null
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "I-04.material_value_invalid",
        "Fixed-k screening was declared without a conductivity value.",
        "Supply the matching positive SI k or mark the model variable/unconfirmed; no hidden k is used.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      materialSnapshotId: record.materialSnapshotId,
      materialId: record.materialId,
      thermalStateId: record.thermalStateId,
      propertyStateId: record.propertyStateId,
      propertyTemperatureK: record.propertyTemperatureK,
      thermalConductivityWPerMK: conductivity,
      conductivityModel: record.conductivityModel,
      canonicalUnitId: record.canonicalUnitId,
      conductivitySourceRef: record.conductivitySourceRef,
    }),
  });
}

function readSurfaceCoefficientEvidence(
  value: unknown,
): ReadResult<I04SurfaceCoefficientEvidenceInput> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "controlVolumeId",
    "boundaryId",
    "surfaceId",
    "thermalStateId",
    "surfaceStateId",
    "surfaceTemperatureK",
    "sourceMethodId",
    "sourceMethodVersion",
    "coefficientStatus",
    "heatTransferCoefficientWPerM2K",
    "hModel",
    "radiationIncluded",
    "canonicalUnitId",
    "coefficientSourceRef",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "I-04.surface_coefficient_schema_invalid",
        "Surface-coefficient evidence is not an exact plain controlled record.",
        "Provide the complete boundary/state/model record and explicit SI h or null.",
      ),
    });
  }
  const coefficient = record.heatTransferCoefficientWPerM2K;
  if (
    typeof record.surfaceTemperatureK !== "number" ||
    !Number.isFinite(record.surfaceTemperatureK) ||
    record.surfaceTemperatureK <= 0 ||
    (coefficient !== null &&
      (typeof coefficient !== "number" ||
        !Number.isFinite(coefficient) ||
        coefficient <= 0))
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.surface_coefficient_value_invalid",
        "The surface temperature and any supplied h must be positive finite SI values.",
        "Provide absolute kelvin and positive finite W/(m^2*K), or explicit null when unavailable.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableMachineId(record.controlVolumeId) ||
    !isStableMachineId(record.boundaryId) ||
    !isStableMachineId(record.surfaceId) ||
    !isStableMachineId(record.thermalStateId) ||
    !isStableMachineId(record.surfaceStateId) ||
    !isStableMachineId(record.coefficientSourceRef) ||
    (record.sourceMethodId !== "J-02" && record.sourceMethodId !== null) ||
    (typeof record.sourceMethodVersion !== "string" &&
      record.sourceMethodVersion !== null) ||
    (record.coefficientStatus !== "available" &&
      record.coefficientStatus !== "insufficient_data" &&
      record.coefficientStatus !== "not_applicable") ||
    (record.hModel !== "fixed_over_screening_domain" &&
      record.hModel !== "variable_over_screening_domain" &&
      record.hModel !== "unconfirmed") ||
    (record.radiationIncluded !== false &&
      record.radiationIncluded !== true &&
      record.radiationIncluded !== null) ||
    record.canonicalUnitId !== "W_per_m2_K"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "I-04.surface_coefficient_provenance_invalid",
        "h lacks controlled J-02/model, boundary, state, unit, or source provenance.",
        "Bind h to the same immutable surface boundary and identify its model and radiation scope.",
      ),
    });
  }
  if (record.coefficientStatus === "available") {
    if (
      coefficient === null ||
      record.sourceMethodId !== "J-02" ||
      record.sourceMethodVersion === null
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "I-04.surface_coefficient_provenance_invalid",
          "An available h must be a version-bound J-02 value with a non-null SI coefficient.",
          "Supply the exact J-02 method/version result or mark the coefficient unavailable.",
        ),
      });
    }
    if (record.sourceMethodVersion !== J02_SPECIFICATION.methodVersion) {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "I-04.surface_dependency_version_invalid",
          "The h evidence does not match the frozen J-02 calculation-model version.",
          "Recompute J-02 and I-04 under the same calculation-model version.",
        ),
      });
    }
  } else if (
    coefficient !== null ||
    record.sourceMethodId !== null ||
    record.sourceMethodVersion !== null
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.surface_coefficient_provenance_invalid",
        "Unavailable h evidence carries a stale numeric value or dependency method identity.",
        "Use explicit nulls for unavailable h; never preserve a last value as a placeholder.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      controlVolumeId: record.controlVolumeId,
      boundaryId: record.boundaryId,
      surfaceId: record.surfaceId,
      thermalStateId: record.thermalStateId,
      surfaceStateId: record.surfaceStateId,
      surfaceTemperatureK: record.surfaceTemperatureK,
      sourceMethodId: record.sourceMethodId,
      sourceMethodVersion: record.sourceMethodVersion,
      coefficientStatus: record.coefficientStatus,
      heatTransferCoefficientWPerM2K: coefficient,
      hModel: record.hModel,
      radiationIncluded: record.radiationIncluded,
      canonicalUnitId: record.canonicalUnitId,
      coefficientSourceRef: record.coefficientSourceRef,
    }),
  });
}

function readUsageEvidence(
  value: unknown,
): ReadResult<I04UsageEvidenceInput> {
  const record = readExactPlainDataRecord(value, [
    "criticalRadiusInterpretation",
    "rootSolveRelation",
    "qaThresholdPolicy",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "I-04.usage_schema_invalid",
        "Usage evidence is not an exact controlled record.",
        "Explicitly declare screening-only use, no root-solve replacement, and the QA-threshold policy.",
      ),
    });
  }
  if (
    record.criticalRadiusInterpretation !==
      "screening_only_not_exact_design" &&
    record.criticalRadiusInterpretation !== "exact_design_conclusion" &&
    record.criticalRadiusInterpretation !== "unconfirmed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.usage_schema_invalid",
        "The critical-radius interpretation is not a frozen option.",
        "Use the explicit screening-only, forbidden exact-design, or unconfirmed state.",
      ),
    });
  }
  if (
    record.rootSolveRelation !==
      "diagnostic_only_does_not_replace_I01_I02" &&
    record.rootSolveRelation !== "replaces_I01_or_I02" &&
    record.rootSolveRelation !== "unconfirmed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.usage_schema_invalid",
        "The root-solve relationship is not a frozen option.",
        "Declare diagnostic-only use or the explicit forbidden/unconfirmed state.",
      ),
    });
  }
  if (
    record.qaThresholdPolicy !== "none" &&
    record.qaThresholdPolicy !== "project_specific_not_used_by_I04" &&
    record.qaThresholdPolicy !== "claimed_universal_or_standard" &&
    record.qaThresholdPolicy !== "unconfirmed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "I-04.usage_schema_invalid",
        "The QA-threshold policy is not a frozen option.",
        "Declare no threshold, a separate project-specific threshold not used here, or the explicit forbidden/unconfirmed state.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      criticalRadiusInterpretation:
        record.criticalRadiusInterpretation,
      rootSolveRelation: record.rootSolveRelation,
      qaThresholdPolicy: record.qaThresholdPolicy,
    }),
  });
}

function sameSnapshotAndBoundary(
  geometry: Readonly<I04GeometryEvidenceInput>,
  material: Readonly<I04MaterialEvidenceInput>,
  surface: Readonly<I04SurfaceCoefficientEvidenceInput>,
): boolean {
  return (
    geometry.caseSnapshotId === material.caseSnapshotId &&
    geometry.caseSnapshotId === surface.caseSnapshotId &&
    geometry.geometrySnapshotId === material.geometrySnapshotId &&
    geometry.geometrySnapshotId === surface.geometrySnapshotId &&
    geometry.controlVolumeId === surface.controlVolumeId &&
    geometry.boundaryId === surface.boundaryId &&
    geometry.surfaceId === surface.surfaceId &&
    geometry.thermalStateId === material.thermalStateId &&
    geometry.thermalStateId === surface.thermalStateId
  );
}

function unavailableNumeric(
  outputId: I04UnavailableNumericOutput["outputId"],
  status: I04UnavailableNumericOutput["status"],
  reason: string,
): I04UnavailableNumericOutput {
  return Object.freeze({ kind: "unavailable", outputId, status, reason });
}

function unavailablePlaneComparison(
  status: I04PlaneWallComparisonUnavailable["status"],
  reason: string,
): I04PlaneWallComparisonUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    status,
    reason,
    cylindricalToPlaneResistanceRatio: unavailableNumeric(
      "cylindrical_to_plane_resistance_ratio",
      status,
      reason,
    ),
    planeToCylindricalResistanceRatio: unavailableNumeric(
      "plane_to_cylindrical_resistance_ratio",
      status,
      reason,
    ),
    planeToCylindricalHeatRateRatio: unavailableNumeric(
      "plane_to_cylindrical_heat_rate_ratio",
      status,
      reason,
    ),
    relativePlaneHeatRateShortfall: unavailableNumeric(
      "relative_plane_heat_rate_shortfall",
      status,
      reason,
    ),
  });
}

function unavailableCriticalRadius(
  status: I04CriticalRadiusUnavailable["status"],
  reason: string,
): I04CriticalRadiusUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    status,
    reason,
    criticalRadius: unavailableNumeric("rcrit", status, reason),
    criticalRadiusGap: unavailableNumeric(
      "critical_radius_gap",
      status,
      reason,
    ),
  });
}

function nonlinearLossCurveUnavailable(
  requested: I04CriticalRadiusScreeningInput["nonlinearLossCurveRequest"],
  fixedRoute: boolean,
): I04UnavailableNonlinearLossCurveOutput {
  if (!fixedRoute || requested === "requested") {
    return Object.freeze({
      kind: "unavailable" as const,
      outputId: "optional nonlinear loss curve" as const,
      status: "insufficient_data" as const,
      reason:
        "nonlinear curve requires an approved child contract and method ID" as const,
      approvedChildMethodId: null,
    });
  }
  return Object.freeze({
    kind: "unavailable" as const,
    outputId: "optional nonlinear loss curve" as const,
    status: "not_applicable" as const,
    reason:
      "optional curve was not requested for the fixed-h/fixed-k screen" as const,
    approvedChildMethodId: null,
  });
}

const I04_EQUATIONS = Object.freeze({
  geometryRatio: "x = delta / r_i" as const,
  cylindricalResistance:
    "R_cyl / R_plane,inner = ln(1 + x) / x" as const,
  reciprocalResistance:
    "R_plane,inner / R_cyl = x / ln(1 + x)" as const,
  heatRateRatio:
    "Q_plane,inner / Q_cyl = ln(1 + x) / x" as const,
  criticalRadius: "r_crit = k / h" as const,
  outerRadius: "r_o = r_i + delta" as const,
});

const I04_ASSUMPTIONS = Object.freeze([
  "single-layer cylindrical sidewall geometry",
  "plane-wall comparison uses the inner cylindrical surface area per unit length and no QA threshold",
  "rcrit is evaluated only for fixed positive k and fixed positive convection-only h",
  "critical-radius status is a raw local screening result and never a design acceptance",
  "I-04 does not replace the full I-01 or I-02 nonlinear insulation solve",
  "radiation, variable h, or variable k requires a separately approved nonlinear loss-curve child",
] as const);

/** Evaluate the isolated canonical-SI I-04 screening contract. */
export function evaluateI04CriticalRadiusScreening(
  input: unknown,
): I04CriticalRadiusScreeningOutcome {
  const record = readExactPlainDataRecord(input, [
    "geometryEvidence",
    "materialEvidence",
    "surfaceCoefficientEvidence",
    "usageEvidence",
    "nonlinearLossCurveRequest",
  ]);
  if (record === null) {
    return failure(
      input === null || input === undefined
        ? "insufficient_data"
        : "invalid_input",
      "I-04.input_schema_invalid",
      "I-04 requires one exact controlled input record and never executes accessors or coerces values.",
      "Provide geometry, material, surface-coefficient, usage, and nonlinear-curve-request fields exactly once.",
    );
  }
  if (
    record.nonlinearLossCurveRequest !== "not_requested" &&
    record.nonlinearLossCurveRequest !== "requested"
  ) {
    return failure(
      "invalid_input",
      "I-04.input_schema_invalid",
      "The nonlinear loss-curve request is not an explicit frozen option.",
      "Use requested or not_requested; an omitted request is never guessed.",
    );
  }

  const geometryResult = readGeometryEvidence(record.geometryEvidence);
  if (!geometryResult.ok) {
    return geometryResult.result;
  }
  const materialResult = readMaterialEvidence(record.materialEvidence);
  if (!materialResult.ok) {
    return materialResult.result;
  }
  const surfaceResult = readSurfaceCoefficientEvidence(
    record.surfaceCoefficientEvidence,
  );
  if (!surfaceResult.ok) {
    return surfaceResult.result;
  }
  const usageResult = readUsageEvidence(record.usageEvidence);
  if (!usageResult.ok) {
    return usageResult.result;
  }

  const geometry = geometryResult.value;
  const material = materialResult.value;
  const surface = surfaceResult.value;
  const usage = usageResult.value;

  if (!sameSnapshotAndBoundary(geometry, material, surface)) {
    return failure(
      "insufficient_data",
      "I-04.snapshot_binding_mismatch",
      "Geometry, material k, and surface h do not belong to one case, geometry, thermal state, and surface boundary.",
      "Rebuild all I-04 evidence from one immutable case/geometry/state snapshot and one declared boundary.",
    );
  }

  if (
    usage.criticalRadiusInterpretation === "unconfirmed" ||
    usage.rootSolveRelation === "unconfirmed" ||
    usage.qaThresholdPolicy === "unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "I-04.model_scope_unconfirmed",
      "I-04 usage scope is unconfirmed, so a screening result cannot be released safely.",
      "Confirm screening-only use, no I-01/I-02 replacement, and no standard-threshold claim.",
    );
  }
  if (usage.criticalRadiusInterpretation === "exact_design_conclusion") {
    return failure(
      "not_applicable",
      "I-04.exact_design_use_not_applicable",
      I04_WARNING_PREDICATES.exactWithNonlinearPhysics,
      "Use rcrit only as a fixed-h/fixed-k screen and perform the full nonlinear design solve.",
    );
  }
  if (usage.rootSolveRelation === "replaces_I01_or_I02") {
    return failure(
      "not_applicable",
      "I-04.root_solve_replacement_not_applicable",
      I04_WARNING_PREDICATES.replacesInsulationRootSolve,
      "Run the approved I-01/I-02 finite-domain nonlinear solve; I-04 is diagnostic only.",
    );
  }
  if (usage.qaThresholdPolicy === "claimed_universal_or_standard") {
    return failure(
      "not_applicable",
      "I-04.standard_threshold_claim_not_applicable",
      I04_WARNING_PREDICATES.projectThresholdCalledStandard,
      "Remove the standard claim; I-04 publishes raw ratios and applies no QA threshold.",
    );
  }

  const outerRadiusM =
    geometry.innerRadiusM + geometry.insulationThicknessM;
  if (
    !Number.isFinite(outerRadiusM) ||
    !isPositiveNormal(outerRadiusM) ||
    outerRadiusM <= geometry.innerRadiusM ||
    outerRadiusM === geometry.innerRadiusM ||
    outerRadiusM === geometry.insulationThicknessM
  ) {
    return failure(
      "invalid_input",
      "I-04.geometry_numeric_resolution_invalid",
      "r_o=r_i+delta overflows or either positive addend is swallowed by binary64 addition.",
      "Use representable canonical-SI geometry; no zero or Infinity radius is published.",
    );
  }
  const deltaOverRi =
    geometry.insulationThicknessM / geometry.innerRadiusM;
  if (
    !Number.isFinite(deltaOverRi) ||
    !isPositiveNormal(deltaOverRi)
  ) {
    return failure(
      "invalid_input",
      "I-04.geometry_numeric_resolution_invalid",
      "delta/ri overflows, underflows to zero, or is otherwise not representable.",
      "Use a representable positive radius and thickness; I-04 does not publish a false zero ratio.",
    );
  }

  const deltaOverRiOutput = Object.freeze({
    kind: "available" as const,
    outputId: "delta/ri" as const,
    valueSi: deltaOverRi,
    dimensionId: "dimensionless" as const,
    canonicalUnitId: "one" as const,
    interpretation:
      "raw_thickness_to_inner_radius_ratio_without_QA_classification",
  });

  const fixedK =
    material.conductivityModel ===
    "fixed_constant_over_screening_domain";
  const knownVariableK =
    material.conductivityModel === "variable_or_nonlinear";
  const fixedH =
    surface.coefficientStatus === "available" &&
    surface.hModel === "fixed_over_screening_domain" &&
    surface.radiationIncluded === false;
  const knownNonlinearH =
    surface.hModel === "variable_over_screening_domain" ||
    surface.radiationIncluded === true ||
    surface.coefficientStatus === "not_applicable";
  const fixedRoute = fixedK && fixedH;
  const nonlinearKnown = knownVariableK || knownNonlinearH;

  let logOnePlusDeltaOverRi: number | null = null;
  let planeWallComparison:
    | I04PlaneWallComparisonAvailable
    | I04PlaneWallComparisonUnavailable;
  let resistanceReciprocalProduct: number | null = null;

  if (fixedK) {
    logOnePlusDeltaOverRi = Math.log1p(deltaOverRi);
    const cylindricalToPlaneResistanceRatio =
      logOnePlusDeltaOverRi / deltaOverRi;
    const planeToCylindricalResistanceRatio =
      deltaOverRi / logOnePlusDeltaOverRi;
    const relativePlaneHeatRateShortfall =
      1 - cylindricalToPlaneResistanceRatio;
    resistanceReciprocalProduct =
      cylindricalToPlaneResistanceRatio *
      planeToCylindricalResistanceRatio;
    if (
      !Number.isFinite(logOnePlusDeltaOverRi) ||
      !isPositiveNormal(logOnePlusDeltaOverRi) ||
      logOnePlusDeltaOverRi === deltaOverRi ||
      !Number.isFinite(cylindricalToPlaneResistanceRatio) ||
      !isPositiveNormal(cylindricalToPlaneResistanceRatio) ||
      cylindricalToPlaneResistanceRatio >= 1 ||
      !Number.isFinite(planeToCylindricalResistanceRatio) ||
      !isPositiveNormal(planeToCylindricalResistanceRatio) ||
      planeToCylindricalResistanceRatio <= 1 ||
      !Number.isFinite(relativePlaneHeatRateShortfall) ||
      !isPositiveNormal(relativePlaneHeatRateShortfall) ||
      relativePlaneHeatRateShortfall === 1 ||
      !Number.isFinite(resistanceReciprocalProduct) ||
      !isPositiveNormal(resistanceReciprocalProduct) ||
      !isWithinTolId(resistanceReciprocalProduct, 1)
    ) {
      return failure(
        "invalid_input",
        "I-04.plane_wall_numeric_resolution_invalid",
        "The direct ln(1+delta/ri) resistance ratio overflows, underflows, loses its positive curvature difference, or fails its reciprocal identity.",
        "Use representable geometry; I-04 does not replace a lost curvature term with zero or a QA threshold.",
      );
    }
    const cylindricalOutput = Object.freeze({
      kind: "available" as const,
      outputId: "cylindrical_to_plane_resistance_ratio" as const,
      valueSi: cylindricalToPlaneResistanceRatio,
      dimensionId: "dimensionless" as const,
      canonicalUnitId: "one" as const,
      interpretation:
        "R_cylindrical_divided_by_R_plane_using_inner_surface_area",
    });
    planeWallComparison = Object.freeze({
      kind: "available" as const,
      areaBasis:
        "inner_cylindrical_surface_area_per_unit_length" as const,
      cylindricalToPlaneResistanceRatio: cylindricalOutput,
      planeToCylindricalResistanceRatio: Object.freeze({
        kind: "available" as const,
        outputId: "plane_to_cylindrical_resistance_ratio" as const,
        valueSi: planeToCylindricalResistanceRatio,
        dimensionId: "dimensionless" as const,
        canonicalUnitId: "one" as const,
        interpretation:
          "R_plane_using_inner_surface_area_divided_by_R_cylindrical",
      }),
      planeToCylindricalHeatRateRatio: Object.freeze({
        kind: "available" as const,
        outputId: "plane_to_cylindrical_heat_rate_ratio" as const,
        valueSi: cylindricalToPlaneResistanceRatio,
        dimensionId: "dimensionless" as const,
        canonicalUnitId: "one" as const,
        interpretation:
          "Q_plane_using_inner_surface_area_divided_by_Q_cylindrical_for_same_deltaT",
      }),
      relativePlaneHeatRateShortfall: Object.freeze({
        kind: "available" as const,
        outputId: "relative_plane_heat_rate_shortfall" as const,
        valueSi: relativePlaneHeatRateShortfall,
        dimensionId: "dimensionless" as const,
        canonicalUnitId: "one" as const,
        interpretation:
          "one_minus_Q_plane_inner_area_divided_by_Q_cylindrical_without_threshold_classification",
      }),
      qaThresholdApplied: false as const,
      standardThresholdClaimed: false as const,
    });
  } else {
    const planeStatus = knownVariableK
      ? ("not_applicable" as const)
      : ("insufficient_data" as const);
    const planeReason = knownVariableK
      ? "constant-k plane/cylindrical resistance comparison is not applicable to the declared variable-k model"
      : "fixed-k model evidence is unconfirmed";
    planeWallComparison = unavailablePlaneComparison(
      planeStatus,
      planeReason,
    );
  }

  let criticalRadiusScreen:
    | I04CriticalRadiusAvailable
    | I04CriticalRadiusUnavailable;
  let screeningStatus:
    | I04AvailableScreeningStatusOutput
    | I04UnavailableScreeningStatusOutput;
  let fixedModelSubstitution: Readonly<I04FixedModelSubstitution> | null =
    null;
  let reconstructedConductivityWPerMK: number | null = null;
  let criticalRadiusAbsoluteResidualWPerMK: number | null = null;

  if (fixedRoute) {
    const thermalConductivityWPerMK =
      material.thermalConductivityWPerMK;
    const heatTransferCoefficientWPerM2K =
      surface.heatTransferCoefficientWPerM2K;
    if (
      thermalConductivityWPerMK === null ||
      heatTransferCoefficientWPerM2K === null
    ) {
      return failure(
        "insufficient_data",
        "I-04.model_scope_unconfirmed",
        "Fixed-h/fixed-k flags lack their required numeric evidence.",
        "Provide positive state-bound k and h; no hidden property or coefficient is substituted.",
      );
    }
    if (
      !isPositiveNormal(thermalConductivityWPerMK) ||
      !isPositiveNormal(heatTransferCoefficientWPerM2K)
    ) {
      return failure(
        "invalid_input",
        "I-04.critical_radius_numeric_resolution_invalid",
        "Fixed k or h is below the positive-normal binary64 machine boundary.",
        "Use representable normal SI values; 2**-1022 is a machine boundary, not an engineering threshold.",
      );
    }
    const criticalRadiusM =
      thermalConductivityWPerMK /
      heatTransferCoefficientWPerM2K;
    if (
      !Number.isFinite(criticalRadiusM) ||
      !isPositiveNormal(criticalRadiusM)
    ) {
      return failure(
        "invalid_input",
        "I-04.critical_radius_numeric_resolution_invalid",
        "rcrit=k/h overflows or underflows to zero in binary64.",
        "Use representable positive k and h; no zero or Infinity critical radius is published.",
      );
    }
    reconstructedConductivityWPerMK =
      criticalRadiusM * heatTransferCoefficientWPerM2K;
    criticalRadiusAbsoluteResidualWPerMK = Math.abs(
      reconstructedConductivityWPerMK - thermalConductivityWPerMK,
    );
    if (
      !Number.isFinite(reconstructedConductivityWPerMK) ||
      !isPositiveNormal(reconstructedConductivityWPerMK) ||
      !Number.isFinite(criticalRadiusAbsoluteResidualWPerMK) ||
      !isZeroOrNormalMagnitude(criticalRadiusAbsoluteResidualWPerMK)
    ) {
      return failure(
        "invalid_input",
        "I-04.critical_radius_numeric_resolution_invalid",
        "The h*rcrit reconstruction is non-finite or loses the positive conductivity.",
        "Use representable positive k and h; no incomplete identity trace is published.",
      );
    }
    if (
      !isWithinTolId(
        reconstructedConductivityWPerMK,
        thermalConductivityWPerMK,
      )
    ) {
      return failure(
        "invalid_input",
        "I-04.critical_radius_identity_failed",
        "INS-SCREEN-001 h*(k/h)=k failed TOL-ID.",
        "Reject the arithmetic result; TOL-ID is used only for this synthetic identity, never for design applicability.",
      );
    }

    let comparison:
      | "outer_radius_below_critical_radius"
      | "outer_radius_equal_to_critical_radius"
      | "outer_radius_above_critical_radius";
    let implication:
      | "an_outward_radius_increase_can_increase_heat_loss"
      | "stationary_maximum_of_the_fixed_h_fixed_k_model"
      | "an_outward_radius_increase_decreases_heat_loss";
    let criticalRadiusGapM: number;
    if (outerRadiusM < criticalRadiusM) {
      comparison = "outer_radius_below_critical_radius";
      implication =
        "an_outward_radius_increase_can_increase_heat_loss";
      criticalRadiusGapM = criticalRadiusM - outerRadiusM;
      if (
        !Number.isFinite(criticalRadiusGapM) ||
        !isPositiveNormal(criticalRadiusGapM) ||
        criticalRadiusGapM === criticalRadiusM
      ) {
        return failure(
          "invalid_input",
          "I-04.critical_radius_numeric_resolution_invalid",
          "The positive outer radius is swallowed in rcrit-r_o or the gap is not representable.",
          "Use a representable fixed-model state; no false critical-radius gap is published.",
        );
      }
    } else if (outerRadiusM > criticalRadiusM) {
      comparison = "outer_radius_above_critical_radius";
      implication =
        "an_outward_radius_increase_decreases_heat_loss";
      criticalRadiusGapM = outerRadiusM - criticalRadiusM;
      if (
        !Number.isFinite(criticalRadiusGapM) ||
        !isPositiveNormal(criticalRadiusGapM) ||
        criticalRadiusGapM === outerRadiusM
      ) {
        return failure(
          "invalid_input",
          "I-04.critical_radius_numeric_resolution_invalid",
          "The positive critical radius is swallowed in r_o-rcrit or the gap is not representable.",
          "Use a representable fixed-model state; no false critical-radius gap is published.",
        );
      }
    } else {
      comparison = "outer_radius_equal_to_critical_radius";
      implication =
        "stationary_maximum_of_the_fixed_h_fixed_k_model";
      criticalRadiusGapM = 0;
    }
    const criticalRadiusToOuterRadiusRatio =
      criticalRadiusM / outerRadiusM;
    if (
      !Number.isFinite(criticalRadiusToOuterRadiusRatio) ||
      !isPositiveNormal(criticalRadiusToOuterRadiusRatio)
    ) {
      return failure(
        "invalid_input",
        "I-04.critical_radius_numeric_resolution_invalid",
        "rcrit/r_o overflows or underflows to zero.",
        "Use representable geometry and state values; no false zero screening metric is published.",
      );
    }
    criticalRadiusScreen = Object.freeze({
      kind: "available" as const,
      criticalRadius: Object.freeze({
        kind: "available" as const,
        outputId: "rcrit" as const,
        valueSi: criticalRadiusM,
        dimensionId: "length" as const,
        canonicalUnitId: "m" as const,
        interpretation:
          "fixed_h_fixed_k_cylindrical_critical_radius_screen_only",
      }),
      outerRadius: Object.freeze({
        kind: "available" as const,
        outputId: "outer_radius" as const,
        valueSi: outerRadiusM,
        dimensionId: "length" as const,
        canonicalUnitId: "m" as const,
        interpretation: "r_i_plus_delta_for_the_bound_geometry",
      }),
      criticalRadiusGap: Object.freeze({
        kind: "available" as const,
        outputId: "critical_radius_gap" as const,
        valueSi: criticalRadiusGapM,
        dimensionId: "length" as const,
        canonicalUnitId: "m" as const,
        interpretation:
          "absolute_raw_distance_between_outer_radius_and_critical_radius",
      }),
      criticalRadiusToOuterRadiusRatio: Object.freeze({
        kind: "available" as const,
        outputId: "critical_radius_to_outer_radius_ratio" as const,
        valueSi: criticalRadiusToOuterRadiusRatio,
        dimensionId: "dimensionless" as const,
        canonicalUnitId: "one" as const,
        interpretation:
          "critical_radius_divided_by_current_outer_radius_raw_screening_metric",
      }),
    });
    screeningStatus = Object.freeze({
      kind: "available" as const,
      outputId: "screening status" as const,
      value: comparison,
      localFixedModelImplication: implication,
      interpretation:
        "raw_fixed_h_fixed_k_cylindrical_screen_only_not_a_design_pass" as const,
    });
    fixedModelSubstitution = Object.freeze({
      thermalConductivityWPerMK,
      heatTransferCoefficientWPerM2K,
      criticalRadiusM,
      outerRadiusM,
      criticalRadiusGapM,
      criticalRadiusToOuterRadiusRatio,
    });
  } else {
    const status = nonlinearKnown
      ? ("not_applicable" as const)
      : ("insufficient_data" as const);
    const reason = nonlinearKnown
      ? "fixed-h/fixed-k rcrit is not applicable to radiation, variable h, or variable k; a full nonlinear loss curve is required"
      : "fixed-h/fixed-k model evidence is unavailable or unconfirmed";
    criticalRadiusScreen = unavailableCriticalRadius(status, reason);
    screeningStatus = Object.freeze({
      kind: "unavailable" as const,
      outputId: "screening status" as const,
      status,
      reason,
    });
  }

  const geometryEvidence = Object.freeze({ ...geometry });
  const materialEvidence = Object.freeze({ ...material });
  const surfaceCoefficientEvidence = Object.freeze({ ...surface });
  const usageEvidence = Object.freeze({ ...usage });

  const applicabilityStatus = fixedRoute
    ? ("in_domain_fixed_h_fixed_k_screen" as const)
    : nonlinearKnown
      ? ("partial_outputs_nonlinear_route_unavailable" as const)
      : ("partial_outputs_model_evidence_insufficient" as const);

  return Object.freeze({
    methodId: I04_METHOD_ID,
    methodVersion: I04_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status: "success" as const,
    applicabilityStatus,
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      deltaOverRi: deltaOverRiOutput,
      planeWallComparison,
      criticalRadiusScreen,
      screeningStatus,
      nonlinearLossCurve: nonlinearLossCurveUnavailable(
        record.nonlinearLossCurveRequest,
        fixedRoute,
      ),
    }),
    equations: I04_EQUATIONS,
    substitution: Object.freeze({
      innerRadiusM: geometry.innerRadiusM,
      insulationThicknessM: geometry.insulationThicknessM,
      deltaOverRi,
      logOnePlusDeltaOverRi,
      fixedModel: fixedModelSubstitution,
    }),
    identityChecks: Object.freeze({
      toleranceId: TOL_ID.id,
      use:
        "algebraic_identity_only_not_engineering_or_applicability_threshold" as const,
      binary64PositiveNormalFloor:
        I04_BINARY64_MIN_POSITIVE_NORMAL,
      binary64FloorUse:
        "machine_representability_boundary_not_engineering_threshold" as const,
      resistanceReciprocalProduct,
      reconstructedConductivityWPerMK,
      criticalRadiusAbsoluteResidualWPerMK,
      passed: fixedRoute ? (true as const) : null,
    }),
    evidence: Object.freeze({
      geometry: geometryEvidence,
      material: materialEvidence,
      surfaceCoefficient: surfaceCoefficientEvidence,
      usage: usageEvidence,
      nonlinearLossCurveRequest: record.nonlinearLossCurveRequest,
    }),
    assumptions: I04_ASSUMPTIONS,
    mapping: I04_CRITICAL_RADIUS_SCREENING_MAPPING,
  });
}
