import { TOL_ID, isWithinTolId } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";
import {
  J03_BINARY64_MIN_NORMAL,
  J03_METHOD_VERSION,
  J03_STEFAN_BOLTZMANN_W_PER_M2_K4,
} from "./j03GrayBodyRadiation.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-04"));
const J02_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-02"));

export const J04_METHOD_ID = "J-04" as const;
export const J04_METHOD_VERSION = SPECIFICATION.methodVersion;
export const J04_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const J04_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const J04_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const J04_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const J04_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;
export const J04_VALIDATION_NOTES = SPECIFICATION.validationNotes;

/**
 * J-04 and J-03 are bound to the same CODATA22 Stefan-Boltzmann value. The
 * CODATA22 local-copy/hash release gate remains open in the controlled source
 * register, so this isolated implementation is not runtime activated.
 */
export const J04_STEFAN_BOLTZMANN_W_PER_M2_K4 =
  J03_STEFAN_BOLTZMANN_W_PER_M2_K4;

/** Shared IEEE-754 machine boundary; never an engineering threshold. */
export const J04_BINARY64_MIN_NORMAL = J03_BINARY64_MIN_NORMAL;

export const J04_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: J04_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const J04_DIRECT_RADIATION_RELATIVE_TOLERANCE = 1e-10 as const;

export const J04_GB8175_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "GB8175" as const,
  relativePath: "references/external_sources/GBT+8175-2025.pdf" as const,
  sha256:
    "d49b00ea888f4d73365d28ac3325ad6c2782d1796a760e1fde697135c67737ae" as const,
  location: "PDF14-16:PRINT10-12:AnnexA:eqA.1-A.2" as const,
});

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `J-04 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const J04_WARNING_PREDICATES = Object.freeze({
  equalTemperatureZeroOverZero: controlledWarningPredicate(
    "0/0 is not protected at equal temperatures" as const,
  ),
  differentAreaOrBoundary: controlledWarningPredicate(
    "coefficients from different areas or boundaries are added" as const,
  ),
  staleLinearization: controlledWarningPredicate(
    "linearized hr is used over a large temperature interval without update" as const,
  ),
});

export const J04_DEPENDENCY_METHOD_VERSIONS = Object.freeze({
  convection: Object.freeze({
    methodId: "J-02" as const,
    methodVersion: J02_SPECIFICATION.methodVersion,
  }),
  radiation: Object.freeze({
    methodId: "J-03" as const,
    methodVersion: J03_METHOD_VERSION,
  }),
});

export const J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: J04_SOURCE_REFS,
  contractSourceRefs: J04_CONTRACT_SOURCE_REFS,
  derivationRefs: J04_DERIVATION_REFS,
  validationCaseIds: J04_VALIDATION_CASE_IDS,
  methodCheckIds: J04_METHOD_CHECK_IDS,
  validationNotes: J04_VALIDATION_NOTES,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  controlledSource: J04_GB8175_CONTROLLED_SOURCE,
  dependencyMethodVersions: J04_DEPENDENCY_METHOD_VERSIONS,
  numericRepresentabilityPolicy: J04_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: Object.freeze({
    isolationStatus: "implemented_not_runtime_activated" as const,
    runtimeActivation: "blocked" as const,
    openGates: Object.freeze([
      "formal_J02_J03_snapshot_result_trace_adapter",
      "controlled_warning_publication_policy",
      "CODATA22_local_read_only_copy_access_date_and_sha256",
    ] as const),
  }),
});

export interface J04SurfaceInput {
  readonly emissivity: number;
  readonly surfaceTemperatureK: number;
  readonly surroundingsTemperatureK: number;
  readonly areaM2: number;
  readonly materialSnapshotId: string;
  readonly emissivitySourceRef: string;
  readonly emissivityStateTemperatureK: number;
}

export interface J04BoundaryEvidenceInput {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly surfaceStateId: string;
  readonly snapshotAreaM2: number;
  readonly snapshotSurfaceTemperatureK: number;
  readonly snapshotSurroundingsTemperatureK: number;
  readonly temperatureScale: "absolute_kelvin";
  readonly sameAreaAndBoundaryConfirmed: true;
}

export interface J04J02ConvectionEvidenceInput {
  readonly methodId: "J-02";
  readonly methodVersion: string;
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly surfaceStateId: string;
  readonly areaM2: number;
  readonly surfaceTemperatureK: number;
  readonly referenceTemperatureK: number;
  readonly heatTransferCoefficientWPerM2K: number;
  readonly heatRateW: number;
  readonly coefficientSourceRef: string;
}

export interface J04J03RadiationEvidenceInput {
  readonly methodId: "J-03";
  readonly methodVersion: string;
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly configuration: "radiation_to_large_surroundings";
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly surfaceStateId: string;
  readonly areaM2: number;
  readonly surfaceTemperatureK: number;
  readonly surroundingsTemperatureK: number;
  readonly emissivity: number;
  readonly materialSnapshotId: string;
  readonly emissivitySourceRef: string;
  readonly emissivityStateTemperatureK: number;
  readonly networkFactor: number;
  readonly heatRateW: number;
  readonly viewFactor: 1;
  readonly diffuseGraySurfacesConfirmed: true;
  readonly noUnmodelledOpeningsOrObstructionsConfirmed: true;
}

export interface J04LinearizedSurfaceCoefficientInput {
  readonly surface: J04SurfaceInput;
  readonly boundaryEvidence: J04BoundaryEvidenceInput;
  readonly convectionEvidence: J04J02ConvectionEvidenceInput;
  readonly radiationEvidence: J04J03RadiationEvidenceInput;
}

export interface J04LinearizedSurfaceCoefficientValue {
  readonly radiationCoefficientWPerM2K: number;
  readonly surfaceCoefficientWPerM2K: number;
  readonly radiationCoefficientDimensionId: "heat_transfer_coefficient";
  readonly surfaceCoefficientDimensionId: "heat_transfer_coefficient";
  readonly radiationCoefficientCanonicalUnitId: "W_per_m2_K";
  readonly surfaceCoefficientCanonicalUnitId: "W_per_m2_K";
}

export interface J04LinearizedSurfaceCoefficientSuccess {
  readonly methodId: typeof J04_METHOD_ID;
  readonly methodVersion: typeof J04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: J04LinearizedSurfaceCoefficientValue;
  readonly equation: Readonly<{
    readonly radiation:
      | "h_r = epsilon * sigma * (T_s + T_sur) * (T_s^2 + T_sur^2)"
      | "h_r = 4 * epsilon * sigma * T^3 (equal-temperature derivative limit)";
    readonly combined: "h_s = h_c + h_r";
    readonly originalStandardForm:
      "h_r = epsilon * sigma * (T_s^4 - T_sur^4) / (T_s - T_sur)";
  }>;
  readonly stableLinearization: Readonly<{
    readonly route:
      | "factorized_secant"
      | "equal_temperature_derivative_limit";
    readonly temperatureDifferenceK: number;
    readonly temperatureSumK: number;
    readonly squaredTemperatureSumK2: number;
    readonly cubicQuotientFactorK3: number;
    readonly identity:
      | "(T_s^4-T_sur^4)/(T_s-T_sur)=(T_s+T_sur)*(T_s^2+T_sur^2)"
      | "lim[T_sur->T_s]=(d/dT)T^4=4*T^3";
    readonly zeroOverZeroDivisionPerformed: false;
  }>;
  readonly substitution: Readonly<{
    readonly emissivity: number;
    readonly stefanBoltzmannWPerM2K4:
      typeof J04_STEFAN_BOLTZMANN_W_PER_M2_K4;
    readonly surfaceTemperatureK: number;
    readonly surroundingsTemperatureK: number;
    readonly areaM2: number;
    readonly convectionCoefficientWPerM2K: number;
    readonly radiationCoefficientWPerM2K: number;
    readonly surfaceCoefficientWPerM2K: number;
  }>;
  readonly identityChecks: Readonly<{
    readonly directRadiationHeatRateW: number;
    readonly linearizedRadiationHeatRateW: number;
    readonly absoluteResidualW: number;
    readonly relativeResidual: number;
    readonly allowedRelativeTolerance:
      typeof J04_DIRECT_RADIATION_RELATIVE_TOLERANCE;
    readonly evidenceIdentityToleranceId: typeof TOL_ID.id;
    readonly passed: true;
  }>;
  readonly evidence: Readonly<{
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly controlVolumeId: string;
    readonly boundaryId: string;
    readonly surfaceId: string;
    readonly surfaceStateId: string;
    readonly areaM2: number;
    readonly surfaceTemperatureK: number;
    readonly surroundingsTemperatureK: number;
    readonly materialSnapshotId: string;
    readonly emissivitySourceRef: string;
    readonly emissivityStateTemperatureK: number;
    readonly temperatureScale: "absolute_kelvin";
    readonly sameAreaAndBoundaryConfirmed: true;
    readonly convection: Readonly<J04J02ConvectionEvidenceInput>;
    readonly radiation: Readonly<J04J03RadiationEvidenceInput>;
    readonly numericRepresentabilityPolicy:
      typeof J04_NUMERIC_REPRESENTABILITY_POLICY;
  }>;
  readonly assumptions: readonly [
    "J-03 large-surroundings route with view factor one",
    "surface emissivity is diffuse-gray and state-bound",
    "J-02 and J-03 coefficients use the same surface area, boundary, case snapshot, geometry snapshot, control volume, and state",
    "surface and surroundings temperatures are absolute kelvin",
    "the linearization is evaluated at the current declared state and is not reused over an unfrozen temperature interval",
  ];
  readonly mapping: typeof J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING;
  readonly failure?: never;
}

export type J04FailureCode =
  | "J-04.input_schema_invalid"
  | "J-04.surface_schema_invalid"
  | "J-04.surface_value_invalid"
  | "J-04.emissivity_provenance_invalid"
  | "J-04.emissivity_state_mismatch"
  | "J-04.boundary_evidence_schema_invalid"
  | "J-04.boundary_evidence_invalid"
  | "J-04.same_area_boundary_not_confirmed"
  | "J-04.boundary_snapshot_value_mismatch"
  | "J-04.convection_evidence_schema_invalid"
  | "J-04.convection_dependency_unavailable"
  | "J-04.convection_dependency_not_applicable"
  | "J-04.convection_method_version_invalid"
  | "J-04.convection_value_invalid"
  | "J-04.convection_evidence_identity_mismatch"
  | "J-04.radiation_evidence_schema_invalid"
  | "J-04.radiation_dependency_unavailable"
  | "J-04.radiation_dependency_not_applicable"
  | "J-04.radiation_method_version_invalid"
  | "J-04.radiation_configuration_not_applicable"
  | "J-04.radiation_value_invalid"
  | "J-04.radiation_evidence_numeric_resolution_invalid"
  | "J-04.radiation_evidence_identity_mismatch"
  | "J-04.dependency_boundary_mismatch"
  | "J-04.dependency_snapshot_value_mismatch"
  | "J-04.temperature_linearization_not_representable"
  | "J-04.temperature_positive_term_swallowed"
  | "J-04.radiation_coefficient_not_representable"
  | "J-04.surface_coefficient_not_representable"
  | "J-04.surface_coefficient_positive_term_swallowed"
  | "J-04.direct_radiation_identity_not_representable"
  | "J-04.direct_radiation_identity_failed";

export interface J04LinearizedSurfaceCoefficientFailure {
  readonly methodId: typeof J04_METHOD_ID;
  readonly methodVersion: typeof J04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly mapping: typeof J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING;
  readonly failure: Readonly<{
    readonly code: J04FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type J04LinearizedSurfaceCoefficientOutcome =
  | J04LinearizedSurfaceCoefficientSuccess
  | J04LinearizedSurfaceCoefficientFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= J04_BINARY64_MIN_NORMAL;
}

function isZeroOrNormalMagnitudeBinary64(value: number): boolean {
  return (
    Number.isFinite(value) &&
    (value === 0 || Math.abs(value) >= J04_BINARY64_MIN_NORMAL)
  );
}

function failure(
  status: J04LinearizedSurfaceCoefficientFailure["status"],
  code: J04FailureCode,
  message: string,
  action: string,
): J04LinearizedSurfaceCoefficientFailure {
  return Object.freeze({
    methodId: J04_METHOD_ID,
    methodVersion: J04_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    mapping: J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING,
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

function isStableSourceRef(value: unknown): value is string {
  return isStableMachineId(value);
}

type SurfaceReadResult =
  | Readonly<{ readonly ok: true; readonly value: Readonly<J04SurfaceInput> }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function readSurface(value: unknown): SurfaceReadResult {
  const record = readExactPlainDataRecord(value, [
    "emissivity",
    "surfaceTemperatureK",
    "surroundingsTemperatureK",
    "areaM2",
    "materialSnapshotId",
    "emissivitySourceRef",
    "emissivityStateTemperatureK",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-04.surface_schema_invalid",
        "J-04 requires one exact canonical-SI surface record with state-bound emissivity provenance.",
        "Supply every controlled surface field as plain data without accessors, coercion, or extra keys.",
      ),
    });
  }
  if (
    typeof record.emissivity !== "number" ||
    !Number.isFinite(record.emissivity) ||
    record.emissivity <= 0 ||
    record.emissivity > 1 ||
    typeof record.surfaceTemperatureK !== "number" ||
    !Number.isFinite(record.surfaceTemperatureK) ||
    record.surfaceTemperatureK <= 0 ||
    typeof record.surroundingsTemperatureK !== "number" ||
    !Number.isFinite(record.surroundingsTemperatureK) ||
    record.surroundingsTemperatureK <= 0 ||
    typeof record.areaM2 !== "number" ||
    !Number.isFinite(record.areaM2) ||
    record.areaM2 <= 0 ||
    typeof record.emissivityStateTemperatureK !== "number" ||
    !Number.isFinite(record.emissivityStateTemperatureK) ||
    record.emissivityStateTemperatureK <= 0
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.surface_value_invalid",
        "Emissivity must be in (0,1], area must be positive, and temperatures must be positive finite absolute kelvin values.",
        "Correct the canonical-SI surface state; Celsius-labelled, zero, negative, and non-finite values are rejected.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableSourceRef(record.emissivitySourceRef)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        record.materialSnapshotId === null ||
          record.materialSnapshotId === undefined ||
          record.emissivitySourceRef === null ||
          record.emissivitySourceRef === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-04.emissivity_provenance_invalid",
        "Emissivity must be bound to material:<64 lowercase SHA-256 hex> and a stable property source reference.",
        "Resolve immutable material and property-level provenance before linearization.",
      ),
    });
  }
  if (record.emissivityStateTemperatureK !== record.surfaceTemperatureK) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-04.emissivity_state_mismatch",
        "The emissivity property state does not match the current surface temperature.",
        "Resolve emissivity at the declared surface state; do not reuse a cold or stale property value.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      emissivity: record.emissivity,
      surfaceTemperatureK: record.surfaceTemperatureK,
      surroundingsTemperatureK: record.surroundingsTemperatureK,
      areaM2: record.areaM2,
      materialSnapshotId: record.materialSnapshotId,
      emissivitySourceRef: record.emissivitySourceRef,
      emissivityStateTemperatureK: record.emissivityStateTemperatureK,
    }),
  });
}

type BoundaryReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<J04BoundaryEvidenceInput>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function readBoundaryEvidence(value: unknown): BoundaryReadResult {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "controlVolumeId",
    "boundaryId",
    "surfaceId",
    "surfaceStateId",
    "snapshotAreaM2",
    "snapshotSurfaceTemperatureK",
    "snapshotSurroundingsTemperatureK",
    "temperatureScale",
    "sameAreaAndBoundaryConfirmed",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-04.boundary_evidence_schema_invalid",
        "J-04 requires exact case, geometry, control-volume, boundary, surface, area, and state evidence.",
        "Supply the complete plain-data boundary record without defaults or extra keys.",
      ),
    });
  }
  if (
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableMachineId(record.controlVolumeId) ||
    !isStableMachineId(record.boundaryId) ||
    !isStableMachineId(record.surfaceId) ||
    !isStableMachineId(record.surfaceStateId) ||
    typeof record.snapshotAreaM2 !== "number" ||
    !Number.isFinite(record.snapshotAreaM2) ||
    record.snapshotAreaM2 <= 0 ||
    typeof record.snapshotSurfaceTemperatureK !== "number" ||
    !Number.isFinite(record.snapshotSurfaceTemperatureK) ||
    record.snapshotSurfaceTemperatureK <= 0 ||
    typeof record.snapshotSurroundingsTemperatureK !== "number" ||
    !Number.isFinite(record.snapshotSurroundingsTemperatureK) ||
    record.snapshotSurroundingsTemperatureK <= 0 ||
    record.temperatureScale !== "absolute_kelvin" ||
    typeof record.sameAreaAndBoundaryConfirmed !== "boolean"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.boundary_evidence_invalid",
        "Boundary evidence contains a malformed content hash, machine ID, SI state value, temperature scale, or confirmation flag.",
        "Use content-addressed case/geometry snapshots and explicit absolute-kelvin same-boundary evidence.",
      ),
    });
  }
  if (record.sameAreaAndBoundaryConfirmed !== true) {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "J-04.same_area_boundary_not_confirmed",
        "The convection and radiation coefficients are not confirmed on one area and boundary.",
        "Do not add the coefficients; rebuild both dependency results on the same controlled surface boundary.",
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
      surfaceStateId: record.surfaceStateId,
      snapshotAreaM2: record.snapshotAreaM2,
      snapshotSurfaceTemperatureK: record.snapshotSurfaceTemperatureK,
      snapshotSurroundingsTemperatureK:
        record.snapshotSurroundingsTemperatureK,
      temperatureScale: "absolute_kelvin" as const,
      sameAreaAndBoundaryConfirmed: true as const,
    }),
  });
}

type ConvectionReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<J04J02ConvectionEvidenceInput>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function dependencyUnavailableStatus(
  status: unknown,
  applicabilityStatus: unknown,
): "insufficient_data" | "not_applicable" | null {
  if (status === "not_applicable" || applicabilityStatus === "out_of_domain") {
    return "not_applicable";
  }
  if (
    status === "insufficient_data" ||
    status === "non_converged" ||
    status === "no_feasible_solution" ||
    status === "invalid_input" ||
    applicabilityStatus === "not_evaluated"
  ) {
    return "insufficient_data";
  }
  return null;
}

function readConvectionEvidence(value: unknown): ConvectionReadResult {
  const record = readExactPlainDataRecord(value, [
    "methodId",
    "methodVersion",
    "status",
    "applicabilityStatus",
    "caseSnapshotId",
    "geometrySnapshotId",
    "controlVolumeId",
    "boundaryId",
    "surfaceId",
    "surfaceStateId",
    "areaM2",
    "surfaceTemperatureK",
    "referenceTemperatureK",
    "heatTransferCoefficientWPerM2K",
    "heatRateW",
    "coefficientSourceRef",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-04.convection_evidence_schema_invalid",
        "J-04 requires an exact J-02 result-evidence projection.",
        "Supply method/version/status, same-boundary bindings, h_c, Q_conv, and coefficient provenance as plain data.",
      ),
    });
  }
  const unavailableStatus = dependencyUnavailableStatus(
    record.status,
    record.applicabilityStatus,
  );
  if (unavailableStatus !== null) {
    return Object.freeze({
      ok: false,
      result: failure(
        unavailableStatus,
        unavailableStatus === "not_applicable"
          ? "J-04.convection_dependency_not_applicable"
          : "J-04.convection_dependency_unavailable",
        "The supplied J-02 dependency is not a successful in-domain result.",
        "Resolve J-02 on the current surface boundary before evaluating J-04.",
      ),
    });
  }
  if (
    record.methodId !== "J-02" ||
    record.methodVersion !== J02_SPECIFICATION.methodVersion
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.convection_method_version_invalid",
        "The convection evidence is not bound to the frozen J-02 method and model version.",
        "Recompute J-02 under the current calculation-model version; do not coerce stale evidence.",
      ),
    });
  }
  if (
    record.status !== "success" ||
    record.applicabilityStatus !== "in_domain" ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableMachineId(record.controlVolumeId) ||
    !isStableMachineId(record.boundaryId) ||
    !isStableMachineId(record.surfaceId) ||
    !isStableMachineId(record.surfaceStateId) ||
    typeof record.areaM2 !== "number" ||
    !Number.isFinite(record.areaM2) ||
    record.areaM2 <= 0 ||
    typeof record.surfaceTemperatureK !== "number" ||
    !Number.isFinite(record.surfaceTemperatureK) ||
    record.surfaceTemperatureK <= 0 ||
    typeof record.referenceTemperatureK !== "number" ||
    !Number.isFinite(record.referenceTemperatureK) ||
    record.referenceTemperatureK <= 0 ||
    typeof record.heatTransferCoefficientWPerM2K !== "number" ||
    !Number.isFinite(record.heatTransferCoefficientWPerM2K) ||
    record.heatTransferCoefficientWPerM2K < 0 ||
    typeof record.heatRateW !== "number" ||
    !Number.isFinite(record.heatRateW) ||
    !isStableSourceRef(record.coefficientSourceRef)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.convection_value_invalid",
        "J-02 evidence contains a malformed boundary binding, canonical-SI value, result state, or source reference.",
        "Supply a finite in-domain J-02 result without hidden defaults or unit coercion.",
      ),
    });
  }
  const areaTimesCoefficient =
    record.areaM2 * record.heatTransferCoefficientWPerM2K;
  const temperatureDifferenceK =
    record.surfaceTemperatureK - record.referenceTemperatureK;
  const expectedHeatRateW = areaTimesCoefficient * temperatureDifferenceK;
  if (
    !Number.isFinite(areaTimesCoefficient) ||
    areaTimesCoefficient < 0 ||
    (record.heatTransferCoefficientWPerM2K > 0 &&
      areaTimesCoefficient === 0) ||
    !Number.isFinite(temperatureDifferenceK) ||
    !Number.isFinite(expectedHeatRateW) ||
    (temperatureDifferenceK !== 0 &&
      record.heatTransferCoefficientWPerM2K > 0 &&
      expectedHeatRateW === 0) ||
    (expectedHeatRateW === 0
      ? record.heatRateW !== 0
      : record.heatRateW === 0 ||
        Math.sign(record.heatRateW) !== Math.sign(expectedHeatRateW)) ||
    !isWithinTolId(record.heatRateW, expectedHeatRateW)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.convection_evidence_identity_mismatch",
        "The declared J-02 Q_conv is not the representable h_c*A*(T_s-T_ref) identity for its own evidence.",
        "Rebuild the controlled J-02 evidence; do not combine a coefficient detached from its heat-rate trace.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      methodId: "J-02" as const,
      methodVersion: record.methodVersion,
      status: "success" as const,
      applicabilityStatus: "in_domain" as const,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      controlVolumeId: record.controlVolumeId,
      boundaryId: record.boundaryId,
      surfaceId: record.surfaceId,
      surfaceStateId: record.surfaceStateId,
      areaM2: record.areaM2,
      surfaceTemperatureK: record.surfaceTemperatureK,
      referenceTemperatureK: record.referenceTemperatureK,
      heatTransferCoefficientWPerM2K:
        record.heatTransferCoefficientWPerM2K,
      heatRateW: record.heatRateW,
      coefficientSourceRef: record.coefficientSourceRef,
    }),
  });
}

interface FourthPowerDifference {
  readonly temperatureDifferenceK: number;
  readonly temperatureSumK: number;
  readonly squaredTemperatureSumK2: number;
  readonly fourthPowerDifferenceK4: number;
}

type FourthPowerDifferenceResult =
  | Readonly<{ readonly ok: true; readonly value: FourthPowerDifference }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function stableFourthPowerDifference(
  surfaceTemperatureK: number,
  surroundingsTemperatureK: number,
): FourthPowerDifferenceResult {
  const temperatureDifferenceK =
    surfaceTemperatureK - surroundingsTemperatureK;
  const temperatureSumK = surfaceTemperatureK + surroundingsTemperatureK;
  const surfaceSquaredK2 = surfaceTemperatureK * surfaceTemperatureK;
  const surroundingsSquaredK2 =
    surroundingsTemperatureK * surroundingsTemperatureK;
  const squaredTemperatureSumK2 =
    surfaceSquaredK2 + surroundingsSquaredK2;
  if (
    !isPositiveNormalBinary64(surfaceTemperatureK) ||
    !isPositiveNormalBinary64(surroundingsTemperatureK) ||
    !isZeroOrNormalMagnitudeBinary64(temperatureDifferenceK) ||
    !isPositiveNormalBinary64(temperatureSumK) ||
    !isPositiveNormalBinary64(surfaceSquaredK2) ||
    !isPositiveNormalBinary64(surroundingsSquaredK2) ||
    !isPositiveNormalBinary64(squaredTemperatureSumK2)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.temperature_linearization_not_representable",
        "The absolute-temperature powers required by the radiation identity are not finite representable binary64 values.",
        "Use a representable absolute-temperature state; do not publish zero, Infinity, or a wrapped result.",
      ),
    });
  }
  if (
    surfaceTemperatureK !== surroundingsTemperatureK &&
    (temperatureSumK === surfaceTemperatureK ||
      temperatureSumK === surroundingsTemperatureK ||
      squaredTemperatureSumK2 === surfaceSquaredK2 ||
      squaredTemperatureSumK2 === surroundingsSquaredK2)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.temperature_positive_term_swallowed",
        "A positive temperature or squared-temperature contribution was swallowed by binary64 addition.",
        "Use a representable state; J-04 does not silently discard a radiative term.",
      ),
    });
  }
  if (surfaceTemperatureK === surroundingsTemperatureK) {
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        temperatureDifferenceK: 0,
        temperatureSumK,
        squaredTemperatureSumK2,
        fourthPowerDifferenceK4: 0,
      }),
    });
  }
  const firstProduct = temperatureDifferenceK * temperatureSumK;
  const fourthPowerDifferenceK4 = firstProduct * squaredTemperatureSumK2;
  if (
    temperatureDifferenceK === 0 ||
    !isZeroOrNormalMagnitudeBinary64(firstProduct) ||
    firstProduct === 0 ||
    !isZeroOrNormalMagnitudeBinary64(fourthPowerDifferenceK4) ||
    fourthPowerDifferenceK4 === 0
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.temperature_linearization_not_representable",
        "The nonzero fourth-power temperature difference overflows or underflows binary64.",
        "Use a representable state; no temperature threshold or zero fallback is substituted.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      temperatureDifferenceK,
      temperatureSumK,
      squaredTemperatureSumK2,
      fourthPowerDifferenceK4,
    }),
  });
}

type RadiationReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<J04J03RadiationEvidenceInput>;
      readonly fourthDifference: FourthPowerDifference;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function readRadiationEvidence(value: unknown): RadiationReadResult {
  const record = readExactPlainDataRecord(value, [
    "methodId",
    "methodVersion",
    "status",
    "applicabilityStatus",
    "configuration",
    "caseSnapshotId",
    "geometrySnapshotId",
    "controlVolumeId",
    "boundaryId",
    "surfaceId",
    "surfaceStateId",
    "areaM2",
    "surfaceTemperatureK",
    "surroundingsTemperatureK",
    "emissivity",
    "materialSnapshotId",
    "emissivitySourceRef",
    "emissivityStateTemperatureK",
    "networkFactor",
    "heatRateW",
    "viewFactor",
    "diffuseGraySurfacesConfirmed",
    "noUnmodelledOpeningsOrObstructionsConfirmed",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-04.radiation_evidence_schema_invalid",
        "J-04 requires an exact J-03 large-surroundings result-evidence projection.",
        "Supply the current in-domain J-03 boundary, surface, emissivity, network-factor, and heat-rate evidence as plain data.",
      ),
    });
  }
  const unavailableStatus = dependencyUnavailableStatus(
    record.status,
    record.applicabilityStatus,
  );
  if (unavailableStatus !== null) {
    return Object.freeze({
      ok: false,
      result: failure(
        unavailableStatus,
        unavailableStatus === "not_applicable"
          ? "J-04.radiation_dependency_not_applicable"
          : "J-04.radiation_dependency_unavailable",
        "The supplied J-03 dependency is not a successful in-domain result.",
        "Resolve J-03 on the current large-surroundings surface boundary before evaluating J-04.",
      ),
    });
  }
  if (
    record.methodId !== "J-03" ||
    record.methodVersion !== J03_METHOD_VERSION
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_method_version_invalid",
        "The radiation evidence is not bound to the frozen J-03 method and model version.",
        "Recompute J-03 under the current calculation-model version; do not coerce stale evidence.",
      ),
    });
  }
  if (record.configuration !== "radiation_to_large_surroundings") {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "J-04.radiation_configuration_not_applicable",
        "The frozen single-emissivity J-04 formula cannot linearize a concentric two-gray-surface network factor.",
        "Keep that J-03 network result separate or register a network-specific linearization method; do not substitute network factor for epsilon.",
      ),
    });
  }
  if (
    record.status !== "success" ||
    record.applicabilityStatus !== "in_domain" ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableMachineId(record.controlVolumeId) ||
    !isStableMachineId(record.boundaryId) ||
    !isStableMachineId(record.surfaceId) ||
    !isStableMachineId(record.surfaceStateId) ||
    typeof record.areaM2 !== "number" ||
    !Number.isFinite(record.areaM2) ||
    record.areaM2 <= 0 ||
    typeof record.surfaceTemperatureK !== "number" ||
    !Number.isFinite(record.surfaceTemperatureK) ||
    record.surfaceTemperatureK <= 0 ||
    typeof record.surroundingsTemperatureK !== "number" ||
    !Number.isFinite(record.surroundingsTemperatureK) ||
    record.surroundingsTemperatureK <= 0 ||
    typeof record.emissivity !== "number" ||
    !Number.isFinite(record.emissivity) ||
    record.emissivity <= 0 ||
    record.emissivity > 1 ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableSourceRef(record.emissivitySourceRef) ||
    typeof record.emissivityStateTemperatureK !== "number" ||
    !Number.isFinite(record.emissivityStateTemperatureK) ||
    record.emissivityStateTemperatureK <= 0 ||
    typeof record.networkFactor !== "number" ||
    !Number.isFinite(record.networkFactor) ||
    record.networkFactor <= 0 ||
    record.networkFactor > 1 ||
    typeof record.heatRateW !== "number" ||
    !Number.isFinite(record.heatRateW) ||
    record.viewFactor !== 1 ||
    record.diffuseGraySurfacesConfirmed !== true ||
    record.noUnmodelledOpeningsOrObstructionsConfirmed !== true
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_value_invalid",
        "J-03 evidence contains a malformed boundary binding, SI value, large-surroundings condition, or property provenance.",
        "Supply a finite in-domain J-03 large-surroundings result with view factor one and state-bound diffuse-gray emissivity.",
      ),
    });
  }
  if (
    record.networkFactor !== record.emissivity ||
    record.emissivityStateTemperatureK !== record.surfaceTemperatureK
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_evidence_identity_mismatch",
        "The J-03 large-surroundings network factor or emissivity property state is detached from its declared surface evidence.",
        "Rebuild the J-03 evidence; do not substitute an effective network factor or stale emissivity for epsilon.",
      ),
    });
  }
  const fourthDifference = stableFourthPowerDifference(
    record.surfaceTemperatureK,
    record.surroundingsTemperatureK,
  );
  if (!fourthDifference.ok) {
    return fourthDifference;
  }
  const sigmaTimesArea =
    J04_STEFAN_BOLTZMANN_W_PER_M2_K4 * record.areaM2;
  const coefficient = sigmaTimesArea * record.networkFactor;
  const expectedHeatRateW =
    coefficient * fourthDifference.value.fourthPowerDifferenceK4;
  if (
    !isPositiveNormalBinary64(record.areaM2) ||
    !isPositiveNormalBinary64(record.emissivity) ||
    !isPositiveNormalBinary64(record.networkFactor) ||
    !isPositiveNormalBinary64(sigmaTimesArea) ||
    !isPositiveNormalBinary64(coefficient) ||
    !isZeroOrNormalMagnitudeBinary64(
      fourthDifference.value.fourthPowerDifferenceK4,
    ) ||
    !isZeroOrNormalMagnitudeBinary64(expectedHeatRateW)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_evidence_numeric_resolution_invalid",
        "The supplied J-03 evidence contains a positive subnormal or otherwise unrepresentable radiation-chain term.",
        "Recompute J-03 with normal finite binary64 inputs and intermediates; do not magnify a subnormal coefficient with a large temperature factor.",
      ),
    });
  }
  if (
    (fourthDifference.value.fourthPowerDifferenceK4 !== 0 &&
      expectedHeatRateW === 0) ||
    (expectedHeatRateW === 0
      ? record.heatRateW !== 0
      : record.heatRateW === 0 ||
        Math.sign(record.heatRateW) !== Math.sign(expectedHeatRateW)) ||
    !isWithinTolId(record.heatRateW, expectedHeatRateW)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_evidence_identity_mismatch",
        "The declared J-03 heat rate is not the representable epsilon*sigma*A*(T_s^4-T_sur^4) identity for its own evidence.",
        "Rebuild the controlled J-03 evidence; do not detach the coefficient from its radiation trace.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      methodId: "J-03" as const,
      methodVersion: record.methodVersion,
      status: "success" as const,
      applicabilityStatus: "in_domain" as const,
      configuration: "radiation_to_large_surroundings" as const,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      controlVolumeId: record.controlVolumeId,
      boundaryId: record.boundaryId,
      surfaceId: record.surfaceId,
      surfaceStateId: record.surfaceStateId,
      areaM2: record.areaM2,
      surfaceTemperatureK: record.surfaceTemperatureK,
      surroundingsTemperatureK: record.surroundingsTemperatureK,
      emissivity: record.emissivity,
      materialSnapshotId: record.materialSnapshotId,
      emissivitySourceRef: record.emissivitySourceRef,
      emissivityStateTemperatureK: record.emissivityStateTemperatureK,
      networkFactor: record.networkFactor,
      heatRateW: record.heatRateW,
      viewFactor: 1 as const,
      diffuseGraySurfacesConfirmed: true as const,
      noUnmodelledOpeningsOrObstructionsConfirmed: true as const,
    }),
    fourthDifference: fourthDifference.value,
  });
}

function sameBoundaryIds(
  boundary: Readonly<J04BoundaryEvidenceInput>,
  convection: Readonly<J04J02ConvectionEvidenceInput>,
  radiation: Readonly<J04J03RadiationEvidenceInput>,
): boolean {
  return (
    convection.caseSnapshotId === boundary.caseSnapshotId &&
    radiation.caseSnapshotId === boundary.caseSnapshotId &&
    convection.geometrySnapshotId === boundary.geometrySnapshotId &&
    radiation.geometrySnapshotId === boundary.geometrySnapshotId &&
    convection.controlVolumeId === boundary.controlVolumeId &&
    radiation.controlVolumeId === boundary.controlVolumeId &&
    convection.boundaryId === boundary.boundaryId &&
    radiation.boundaryId === boundary.boundaryId &&
    convection.surfaceId === boundary.surfaceId &&
    radiation.surfaceId === boundary.surfaceId &&
    convection.surfaceStateId === boundary.surfaceStateId &&
    radiation.surfaceStateId === boundary.surfaceStateId
  );
}

function sameSnapshotValues(
  surface: Readonly<J04SurfaceInput>,
  boundary: Readonly<J04BoundaryEvidenceInput>,
  convection: Readonly<J04J02ConvectionEvidenceInput>,
  radiation: Readonly<J04J03RadiationEvidenceInput>,
): boolean {
  return (
    boundary.snapshotAreaM2 === surface.areaM2 &&
    boundary.snapshotSurfaceTemperatureK === surface.surfaceTemperatureK &&
    boundary.snapshotSurroundingsTemperatureK ===
      surface.surroundingsTemperatureK &&
    convection.areaM2 === surface.areaM2 &&
    radiation.areaM2 === surface.areaM2 &&
    convection.surfaceTemperatureK === surface.surfaceTemperatureK &&
    radiation.surfaceTemperatureK === surface.surfaceTemperatureK &&
    convection.referenceTemperatureK === surface.surroundingsTemperatureK &&
    radiation.surroundingsTemperatureK ===
      surface.surroundingsTemperatureK &&
    radiation.emissivity === surface.emissivity &&
    radiation.materialSnapshotId === surface.materialSnapshotId &&
    radiation.emissivitySourceRef === surface.emissivitySourceRef &&
    radiation.emissivityStateTemperatureK ===
      surface.emissivityStateTemperatureK
  );
}

type LinearizationResult =
  | Readonly<{
      readonly ok: true;
      readonly route:
        | "factorized_secant"
        | "equal_temperature_derivative_limit";
      readonly temperatureDifferenceK: number;
      readonly temperatureSumK: number;
      readonly squaredTemperatureSumK2: number;
      readonly cubicQuotientFactorK3: number;
      readonly radiationCoefficientWPerM2K: number;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J04LinearizedSurfaceCoefficientFailure;
    }>;

function calculateStableRadiationCoefficient(
  surface: Readonly<J04SurfaceInput>,
  fourthDifference: FourthPowerDifference,
): LinearizationResult {
  const equalTemperature =
    surface.surfaceTemperatureK === surface.surroundingsTemperatureK;
  let cubicQuotientFactorK3: number;
  if (equalTemperature) {
    const temperatureSquaredK2 =
      surface.surfaceTemperatureK * surface.surfaceTemperatureK;
    const temperatureCubedK3 =
      temperatureSquaredK2 * surface.surfaceTemperatureK;
    cubicQuotientFactorK3 = 4 * temperatureCubedK3;
    if (
      !isPositiveNormalBinary64(surface.surfaceTemperatureK) ||
      !isPositiveNormalBinary64(temperatureSquaredK2) ||
      !isPositiveNormalBinary64(temperatureCubedK3) ||
      !isPositiveNormalBinary64(cubicQuotientFactorK3)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-04.temperature_linearization_not_representable",
          "The equal-temperature derivative limit 4*T^3 is not representable as a positive finite binary64 value.",
          "Use a representable absolute temperature; no artificial temperature-difference threshold is introduced.",
        ),
      });
    }
  } else {
    cubicQuotientFactorK3 =
      fourthDifference.temperatureSumK *
      fourthDifference.squaredTemperatureSumK2;
    if (
      !isPositiveNormalBinary64(cubicQuotientFactorK3)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-04.temperature_linearization_not_representable",
          "The stable secant factor (T_s+T_sur)*(T_s^2+T_sur^2) overflows or underflows binary64.",
          "Use a representable absolute-temperature pair; no 0/0 division or fallback coefficient is used.",
        ),
      });
    }
  }
  const epsilonTimesSigma =
    surface.emissivity * J04_STEFAN_BOLTZMANN_W_PER_M2_K4;
  const radiationCoefficientWPerM2K =
    epsilonTimesSigma * cubicQuotientFactorK3;
  if (
    !isPositiveNormalBinary64(surface.emissivity) ||
    !isPositiveNormalBinary64(epsilonTimesSigma) ||
    !isPositiveNormalBinary64(radiationCoefficientWPerM2K)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-04.radiation_coefficient_not_representable",
        "The positive radiation coefficient overflows or underflows binary64.",
        "Use a representable state and emissivity; do not publish zero or Infinity.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    route: equalTemperature
      ? "equal_temperature_derivative_limit"
      : "factorized_secant",
    temperatureDifferenceK: fourthDifference.temperatureDifferenceK,
    temperatureSumK: fourthDifference.temperatureSumK,
    squaredTemperatureSumK2: fourthDifference.squaredTemperatureSumK2,
    cubicQuotientFactorK3,
    radiationCoefficientWPerM2K,
  });
}

const J04_ASSUMPTIONS = Object.freeze([
  "J-03 large-surroundings route with view factor one",
  "surface emissivity is diffuse-gray and state-bound",
  "J-02 and J-03 coefficients use the same surface area, boundary, case snapshot, geometry snapshot, control volume, and state",
  "surface and surroundings temperatures are absolute kelvin",
  "the linearization is evaluated at the current declared state and is not reused over an unfrozen temperature interval",
] as const);

/** Isolated canonical-SI implementation of frozen method J-04. */
export function calculateJ04LinearizedSurfaceCoefficient(
  input: unknown,
): J04LinearizedSurfaceCoefficientOutcome {
  const record = readExactPlainDataRecord(input, [
    "surface",
    "boundaryEvidence",
    "convectionEvidence",
    "radiationEvidence",
  ]);
  if (record === null) {
    return failure(
      input === null || input === undefined
        ? "insufficient_data"
        : "invalid_input",
      "J-04.input_schema_invalid",
      "J-04 requires one exact controlled input record and never executes accessors or coerces values.",
      "Provide surface, boundaryEvidence, convectionEvidence, and radiationEvidence as exact plain data.",
    );
  }
  const surfaceResult = readSurface(record.surface);
  if (!surfaceResult.ok) {
    return surfaceResult.result;
  }
  const boundaryResult = readBoundaryEvidence(record.boundaryEvidence);
  if (!boundaryResult.ok) {
    return boundaryResult.result;
  }
  const convectionResult = readConvectionEvidence(record.convectionEvidence);
  if (!convectionResult.ok) {
    return convectionResult.result;
  }
  const radiationResult = readRadiationEvidence(record.radiationEvidence);
  if (!radiationResult.ok) {
    return radiationResult.result;
  }
  const surface = surfaceResult.value;
  const boundary = boundaryResult.value;
  const convection = convectionResult.value;
  const radiation = radiationResult.value;

  if (!sameBoundaryIds(boundary, convection, radiation)) {
    return failure(
      "not_applicable",
      "J-04.dependency_boundary_mismatch",
      "J-02 and J-03 do not identify the same case snapshot, geometry, control volume, boundary, surface, and surface state.",
      "Do not add coefficients from different controlled boundaries; recompute both dependencies on one surface.",
    );
  }
  if (!sameSnapshotValues(surface, boundary, convection, radiation)) {
    return failure(
      "invalid_input",
      "J-04.dependency_snapshot_value_mismatch",
      "The area, temperatures, emissivity, material snapshot, or source provenance differs across same-boundary evidence.",
      "Rebuild all J-04 inputs from one immutable snapshot; do not reuse a hash or state ID with changed values.",
    );
  }

  const linearization = calculateStableRadiationCoefficient(
    surface,
    radiationResult.fourthDifference,
  );
  if (!linearization.ok) {
    return linearization.result;
  }
  const radiationCoefficientWPerM2K =
    linearization.radiationCoefficientWPerM2K;
  const convectionCoefficientWPerM2K =
    convection.heatTransferCoefficientWPerM2K;
  const surfaceCoefficientWPerM2K =
    convectionCoefficientWPerM2K + radiationCoefficientWPerM2K;
  if (
    !Number.isFinite(surfaceCoefficientWPerM2K) ||
    surfaceCoefficientWPerM2K <= 0
  ) {
    return failure(
      "invalid_input",
      "J-04.surface_coefficient_not_representable",
      "The same-boundary h_s=h_c+h_r sum is not a positive finite binary64 value.",
      "Use representable coefficients; do not publish zero or Infinity.",
    );
  }
  if (
    (convectionCoefficientWPerM2K > 0 &&
      surfaceCoefficientWPerM2K === radiationCoefficientWPerM2K) ||
    (radiationCoefficientWPerM2K > 0 &&
      surfaceCoefficientWPerM2K === convectionCoefficientWPerM2K)
  ) {
    return failure(
      "invalid_input",
      "J-04.surface_coefficient_positive_term_swallowed",
      "A positive convection or radiation coefficient was swallowed by binary64 addition.",
      "Use representable coefficients; J-04 does not silently discard a same-boundary heat-transfer path.",
    );
  }

  const radiationCoefficientTimesAreaWPerK =
    radiationCoefficientWPerM2K * surface.areaM2;
  const linearizedRadiationHeatRateW =
    radiationCoefficientTimesAreaWPerK *
    linearization.temperatureDifferenceK;
  const directRadiationHeatRateW = radiation.heatRateW;
  const absoluteResidualW = Math.abs(
    linearizedRadiationHeatRateW - directRadiationHeatRateW,
  );
  const relativeResidual =
    directRadiationHeatRateW === 0
      ? linearizedRadiationHeatRateW === 0
        ? 0
        : Number.POSITIVE_INFINITY
      : absoluteResidualW / Math.abs(directRadiationHeatRateW);
  if (
    !isPositiveNormalBinary64(surface.areaM2) ||
    !isPositiveNormalBinary64(radiationCoefficientTimesAreaWPerK) ||
    !isZeroOrNormalMagnitudeBinary64(
      linearization.temperatureDifferenceK,
    ) ||
    !isZeroOrNormalMagnitudeBinary64(linearizedRadiationHeatRateW) ||
    (linearization.temperatureDifferenceK !== 0 &&
      linearizedRadiationHeatRateW === 0) ||
    !Number.isFinite(absoluteResidualW) ||
    !Number.isFinite(relativeResidual)
  ) {
    return failure(
      "invalid_input",
      "J-04.direct_radiation_identity_not_representable",
      "The h_r*A*(T_s-T_sur) identity overflows, underflows, or becomes non-finite.",
      "Use a representable state; do not publish a partially evaluated trace.",
    );
  }
  if (relativeResidual > J04_DIRECT_RADIATION_RELATIVE_TOLERANCE) {
    return failure(
      "invalid_input",
      "J-04.direct_radiation_identity_failed",
      "The linearized radiation heat rate does not reproduce the same-boundary direct J-03 heat rate within the frozen rtol.",
      "Reject the evidence and recompute J-03/J-04 from the same current snapshot.",
    );
  }

  const convectionEvidence = Object.freeze({ ...convection });
  const radiationEvidence = Object.freeze({ ...radiation });
  const evidence = Object.freeze({
    caseSnapshotId: boundary.caseSnapshotId,
    geometrySnapshotId: boundary.geometrySnapshotId,
    controlVolumeId: boundary.controlVolumeId,
    boundaryId: boundary.boundaryId,
    surfaceId: boundary.surfaceId,
    surfaceStateId: boundary.surfaceStateId,
    areaM2: surface.areaM2,
    surfaceTemperatureK: surface.surfaceTemperatureK,
    surroundingsTemperatureK: surface.surroundingsTemperatureK,
    materialSnapshotId: surface.materialSnapshotId,
    emissivitySourceRef: surface.emissivitySourceRef,
    emissivityStateTemperatureK: surface.emissivityStateTemperatureK,
    temperatureScale: "absolute_kelvin" as const,
    sameAreaAndBoundaryConfirmed: true as const,
    convection: convectionEvidence,
    radiation: radiationEvidence,
    numericRepresentabilityPolicy: J04_NUMERIC_REPRESENTABILITY_POLICY,
  });

  return Object.freeze({
    methodId: J04_METHOD_ID,
    methodVersion: J04_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status: "success" as const,
    applicabilityStatus: "in_domain" as const,
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      radiationCoefficientWPerM2K,
      surfaceCoefficientWPerM2K,
      radiationCoefficientDimensionId:
        "heat_transfer_coefficient" as const,
      surfaceCoefficientDimensionId: "heat_transfer_coefficient" as const,
      radiationCoefficientCanonicalUnitId: "W_per_m2_K" as const,
      surfaceCoefficientCanonicalUnitId: "W_per_m2_K" as const,
    }),
    equation: Object.freeze({
      radiation:
        linearization.route === "equal_temperature_derivative_limit"
          ? ("h_r = 4 * epsilon * sigma * T^3 (equal-temperature derivative limit)" as const)
          : ("h_r = epsilon * sigma * (T_s + T_sur) * (T_s^2 + T_sur^2)" as const),
      combined: "h_s = h_c + h_r" as const,
      originalStandardForm:
        "h_r = epsilon * sigma * (T_s^4 - T_sur^4) / (T_s - T_sur)" as const,
    }),
    stableLinearization: Object.freeze({
      route: linearization.route,
      temperatureDifferenceK: linearization.temperatureDifferenceK,
      temperatureSumK: linearization.temperatureSumK,
      squaredTemperatureSumK2: linearization.squaredTemperatureSumK2,
      cubicQuotientFactorK3: linearization.cubicQuotientFactorK3,
      identity:
        linearization.route === "equal_temperature_derivative_limit"
          ? ("lim[T_sur->T_s]=(d/dT)T^4=4*T^3" as const)
          : ("(T_s^4-T_sur^4)/(T_s-T_sur)=(T_s+T_sur)*(T_s^2+T_sur^2)" as const),
      zeroOverZeroDivisionPerformed: false as const,
    }),
    substitution: Object.freeze({
      emissivity: surface.emissivity,
      stefanBoltzmannWPerM2K4:
        J04_STEFAN_BOLTZMANN_W_PER_M2_K4,
      surfaceTemperatureK: surface.surfaceTemperatureK,
      surroundingsTemperatureK: surface.surroundingsTemperatureK,
      areaM2: surface.areaM2,
      convectionCoefficientWPerM2K,
      radiationCoefficientWPerM2K,
      surfaceCoefficientWPerM2K,
    }),
    identityChecks: Object.freeze({
      directRadiationHeatRateW,
      linearizedRadiationHeatRateW,
      absoluteResidualW,
      relativeResidual,
      allowedRelativeTolerance:
        J04_DIRECT_RADIATION_RELATIVE_TOLERANCE,
      evidenceIdentityToleranceId: TOL_ID.id,
      passed: true as const,
    }),
    evidence,
    assumptions: J04_ASSUMPTIONS,
    mapping: J04_LINEARIZED_SURFACE_COEFFICIENT_MAPPING,
  });
}
