import { isWithinTolId, TOL_ID } from "../../config/tolerances.js";
import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-01"));

export const B01_METHOD_ID = "B-01" as const;
export const B01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const B01_GEOMETRY_NORMALIZATION_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B01_SOURCE_REFS,
  contractSourceRefs: B01_CONTRACT_SOURCE_REFS,
  derivationRefs: B01_DERIVATION_REFS,
  validationCaseIds: B01_VALIDATION_CASE_IDS,
  methodCheckIds: B01_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
});

/**
 * This implementation remains isolated until the two frozen-data gaps below
 * are closed. They are deliberately not replaced by local thresholds or IDs.
 */
export const B01_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated",
  runtimeActivation: "blocked",
  openGates: Object.freeze([
    Object.freeze({
      gateId: "B-01.measurement_identity_uncertainty_rule",
      reason:
        "No frozen combined-uncertainty comparison rule exists for real measured geometry identity residuals; TOL-ID is identity-only.",
    }),
    Object.freeze({
      gateId: "B-01.stable_warning_ids",
      reason:
        "The frozen registry provides B-01 warning predicates but no stable warning IDs.",
    }),
  ]),
} as const);

const CURRENT_CENTROID_UNKNOWN_PREDICATE =
  "effective current centroid is unknown" as const;
const NEGATIVE_CLEARANCE_PREDICATE = "g<0" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `B-01 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const B01_WARNING_PREDICATES = Object.freeze({
  currentCentroidUnknown: controlledWarningPredicate(
    CURRENT_CENTROID_UNKNOWN_PREDICATE,
  ),
  negativeClearance: controlledWarningPredicate(
    NEGATIVE_CLEARANCE_PREDICATE,
  ),
});

export interface B01GeometryApplicabilityEvidence {
  readonly windingClass:
    | "uniform_single_layer"
    | "multilayer"
    | "other_or_unknown";
  readonly cylindricalAxisDefinition: "explicit" | "unconfirmed";
  readonly conductorSectionDirections:
    | "radial_and_axial_explicit"
    | "unconfirmed";
  readonly measurementDatums:
    | "consistent"
    | "inconsistent"
    | "unconfirmed";
  readonly identicalTurnSections: boolean;
  /**
   * TOL-ID is legal only when redundant values are asserted to be algebraic
   * identity inputs. Real measurement residuals require an uncertainty rule
   * that is not frozen in the B-01 contract.
   */
  readonly identityCheckBasis:
    | "exact_identity"
    | "measurement_uncertainty_required";
}

export interface B01TurnCenterInput {
  readonly positionsM: readonly number[] | null;
  readonly coordinateSystemId: string | null;
  readonly ordering: "ascending" | "descending" | "unconfirmed";
}

export interface B01HelixPathInput {
  readonly revolutionCount: number | null;
  readonly axialAdvanceM: number | null;
  readonly leadLengthM: number | null;
  readonly revolutionCountBasis:
    | "actual_mechanical_or_cad_path"
    | "guessed_from_electrical_turn_count"
    | "other_or_unknown";
  readonly axialAdvanceBasis:
    | "actual_path_endpoint_advance"
    | "guessed_from_turn_center_span"
    | "other_or_unknown";
}

export interface B01GeometryNormalizationInput {
  /** Frozen coil.electrical_turn_count, dimensionless. */
  readonly electricalTurnCount: number;
  /** Frozen coil.inner_diameter, canonical SI metres. */
  readonly innerDiameterM: number;
  /** Frozen mechanically required D_o; the identity never replaces this input. */
  readonly outerDiameterM: number;
  /** Explicit redundant D_m, or null to derive it. */
  readonly meanDiameterM: number | null;
  /** Explicit D_c, or null only with an explicit unresolved-default basis. */
  readonly currentPathDiameterM: number | null;
  readonly currentPathBasis:
    | "explicit_method_or_state_bound"
    | "unresolved_default_to_mean_diameter"
    | "other_or_unknown";
  /** Frozen conductor.radial_size, canonical SI metres. */
  readonly conductorRadialSizeM: number;
  /** Frozen conductor.axial_size, canonical SI metres. */
  readonly conductorAxialSizeM: number;
  /** Frozen coil.pitch_center; explicit null is required for N=1. */
  readonly pitchCenterM: number | null;
  readonly turnCenters: B01TurnCenterInput;
  readonly helixPath: B01HelixPathInput;
  readonly geometry: B01GeometryApplicabilityEvidence;
}

type B01LengthParameterId =
  | "coil.inner_diameter"
  | "coil.outer_diameter"
  | "coil.mean_diameter"
  | "coil.current_path_diameter"
  | "conductor.radial_size"
  | "conductor.axial_size"
  | "coil.pitch_center"
  | "coil.turn_clearance_axial"
  | "coil.first_last_center_span"
  | "coil.winding_envelope_length"
  | "coil.helix_axial_advance"
  | "coil.lead_length";

type B01ScalarProvenance =
  | "explicit_input"
  | "derived_ID_GEO_01"
  | "derived_ADR_0003_default";

export interface B01AvailableLengthOutput {
  readonly kind: "available";
  readonly parameterId: B01LengthParameterId;
  readonly valueSi: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly provenance: B01ScalarProvenance;
}

export interface B01AvailableDimensionlessOutput {
  readonly kind: "available";
  readonly parameterId:
    | "coil.electrical_turn_count"
    | "coil.helix_revolution_count";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly provenance: "explicit_input";
}

export interface B01UnavailableOutput {
  readonly kind: "unavailable";
  readonly parameterId:
    | "coil.pitch_center"
    | "coil.turn_clearance_axial"
    | "coil.helix_revolution_count"
    | "coil.helix_axial_advance"
    | "coil.lead_length"
    | "coil.turn_center_z[]";
  readonly status: "not_applicable" | "insufficient_data";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface B01AvailableTurnCentersOutput {
  readonly kind: "available";
  readonly parameterId: "coil.turn_center_z[]";
  readonly valueSi: readonly number[];
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly coordinateSystemId: string;
  readonly ordering: "ascending" | "descending";
  readonly provenance: "explicit_input";
}

export interface B01AvailableRatioOutput {
  readonly kind: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly numeratorParameterId:
    | "coil.winding_envelope_length"
    | "coil.pitch_center"
    | "conductor.radial_size";
  readonly denominatorParameterId:
    | "coil.current_path_diameter"
    | "conductor.axial_size";
}

export interface B01UnavailableRatioOutput {
  readonly kind: "unavailable";
  readonly status: "not_applicable";
  readonly numeratorParameterId: "coil.pitch_center";
  readonly denominatorParameterId: "conductor.axial_size";
  readonly reason: "p/d_ax is not applicable when N=1";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface B01IdentityCheck {
  readonly identityId:
    | "D_o=D_i+2d_rad"
    | "D_m=(D_i+D_o)/2"
    | "D_m=D_i+d_rad"
    | "z_interval=p"
    | "z_span=b_cc";
  readonly actualSi: number;
  readonly referenceSi: number;
  readonly absoluteResidualSi: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "identity_only";
  readonly passed: true;
}

export interface B01GeometryNormalizationValue {
  readonly innerDiameter: B01AvailableLengthOutput;
  readonly outerDiameter: B01AvailableLengthOutput;
  readonly meanDiameter: B01AvailableLengthOutput;
  readonly currentPathDiameter: B01AvailableLengthOutput;
  readonly conductorRadialSize: B01AvailableLengthOutput;
  readonly conductorAxialSize: B01AvailableLengthOutput;
  readonly pitchCenter: B01AvailableLengthOutput | B01UnavailableOutput;
  readonly turnClearanceAxial:
    | B01AvailableLengthOutput
    | B01UnavailableOutput;
  readonly firstLastCenterSpan: B01AvailableLengthOutput;
  readonly windingEnvelopeLength: B01AvailableLengthOutput;
  readonly electricalTurnCount: B01AvailableDimensionlessOutput;
  readonly helixRevolutionCount:
    | B01AvailableDimensionlessOutput
    | B01UnavailableOutput;
  readonly helixAxialAdvance:
    | B01AvailableLengthOutput
    | B01UnavailableOutput;
  readonly leadLength: B01AvailableLengthOutput | B01UnavailableOutput;
  readonly turnCenterZ:
    | B01AvailableTurnCentersOutput
    | B01UnavailableOutput;
  readonly dimensionlessRatios: Readonly<{
    readonly windingEnvelopeToCurrentPathDiameter: B01AvailableRatioOutput;
    readonly pitchToConductorAxialSize:
      | B01AvailableRatioOutput
      | B01UnavailableRatioOutput;
    readonly conductorRadialSizeToCurrentPathDiameter: B01AvailableRatioOutput;
  }>;
}

export interface B01GeometryWarning {
  readonly predicate:
    | typeof CURRENT_CENTROID_UNKNOWN_PREDICATE
    | typeof NEGATIVE_CLEARANCE_PREDICATE;
  readonly message: string;
}

export interface B01GeometryNormalizationSuccess {
  readonly methodId: typeof B01_METHOD_ID;
  readonly methodVersion: typeof B01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** The frozen contract has prose predicates but no stable warning_id. */
  readonly warningIds: readonly [];
  readonly warnings: readonly B01GeometryWarning[];
  readonly value: B01GeometryNormalizationValue;
  readonly identityChecks: readonly B01IdentityCheck[];
  readonly geometryEvidence: Readonly<B01GeometryApplicabilityEvidence>;
  readonly equations: readonly [
    "D_o = D_i + 2*d_rad",
    "D_m = (D_i + D_o)/2 = D_i + d_rad",
    "g = p - d_ax when N>1",
    "b_cc = (N-1)*p when N>1; b_cc=0 when N=1",
    "b_env = b_cc + d_ax",
  ];
  readonly semanticBoundaries: Readonly<{
    readonly diametersRemainDistinct: readonly ["D_i", "D_o", "D_m", "D_c"];
    readonly axialLengthsRemainDistinct: readonly [
      "p",
      "g",
      "b_cc",
      "b_env",
      "delta_z_helix",
    ];
    readonly revolutionCountsRemainDistinct: readonly ["N", "N_rev"];
    readonly helixRevolutionPolicy: "N_rev_never_inferred_from_N";
    readonly thermalRadialGapPolicy: "thermal.radial_gap_is_not_consumed_or_derived";
  }>;
  readonly sourceRefs: typeof B01_SOURCE_REFS;
  readonly contractSourceRefs: typeof B01_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof B01_DERIVATION_REFS;
  readonly validationCaseIds: typeof B01_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof B01_METHOD_CHECK_IDS;
  readonly failure?: never;
}

export type B01GeometryNormalizationFailureCode =
  | "B-01.input_schema_invalid"
  | "B-01.geometry_evidence_missing"
  | "B-01.geometry_evidence_invalid"
  | "B-01.multilayer_not_applicable"
  | "B-01.geometry_applicability_unconfirmed"
  | "B-01.measurement_datums_inconsistent"
  | "B-01.numeric_input_invalid"
  | "B-01.single_turn_pitch_invalid"
  | "B-01.pitch_missing"
  | "B-01.current_path_evidence_invalid"
  | "B-01.current_path_evidence_missing"
  | "B-01.redundant_identity_uncertainty_unresolved"
  | "B-01.geometry_identity_inconsistent"
  | "B-01.turn_center_schema_invalid"
  | "B-01.turn_center_evidence_missing"
  | "B-01.turn_center_count_invalid"
  | "B-01.turn_center_order_invalid"
  | "B-01.helix_path_schema_invalid"
  | "B-01.helix_path_incomplete"
  | "B-01.invalid_geometry_mapping"
  | "B-01.helix_path_evidence_missing"
  | "B-01.numeric_resolution_invalid";

export interface B01GeometryNormalizationFailure {
  readonly methodId: typeof B01_METHOD_ID;
  readonly methodVersion: typeof B01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: B01GeometryNormalizationFailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly identityChecks?: never;
}

export type B01GeometryNormalizationOutcome =
  | B01GeometryNormalizationSuccess
  | B01GeometryNormalizationFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const DEFAULT_CURRENT_PATH_WARNINGS = Object.freeze([
  Object.freeze({
    predicate: B01_WARNING_PREDICATES.currentCentroidUnknown,
    message:
      "The effective high-frequency current centroid is unresolved; D_c was explicitly derived from D_m under the frozen ADR-0003 v1 default without changing the mechanical geometry.",
  }),
]) as readonly B01GeometryWarning[];
const NEGATIVE_CLEARANCE_WARNING = Object.freeze({
  predicate: B01_WARNING_PREDICATES.negativeClearance,
  message:
    "The frozen axial turn clearance g=p-d_ax is negative; B-01 preserves the overlap geometry and reports the controlled warning predicate without using TOL-ID as an engineering threshold.",
}) satisfies B01GeometryWarning;

function failure(
  status: B01GeometryNormalizationFailure["status"],
  code: B01GeometryNormalizationFailureCode,
  message: string,
  action: string,
): B01GeometryNormalizationFailure {
  return Object.freeze({
    methodId: B01_METHOD_ID,
    methodVersion: B01_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Read a dense plain numeric array without getters, Proxy get traps, or length allocation. */
function readDenseFiniteNumberArray(value: unknown): readonly number[] | null {
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
    if (
      keys.length !== length + 1 ||
      keys.some((key) => typeof key !== "string") ||
      !keys.includes("length")
    ) {
      return null;
    }
    const snapshot: number[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        typeof descriptor.value !== "number" ||
        !Number.isFinite(descriptor.value)
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

function availableLength(
  parameterId: B01LengthParameterId,
  valueSi: number,
  provenance: B01ScalarProvenance,
): B01AvailableLengthOutput {
  return Object.freeze({
    kind: "available",
    parameterId,
    valueSi,
    dimensionId: "length",
    canonicalUnitId: "m",
    provenance,
  });
}

function availableDimensionless(
  parameterId: B01AvailableDimensionlessOutput["parameterId"],
  valueSi: number,
): B01AvailableDimensionlessOutput {
  return Object.freeze({
    kind: "available",
    parameterId,
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    provenance: "explicit_input",
  });
}

function unavailable(
  parameterId: B01UnavailableOutput["parameterId"],
  status: B01UnavailableOutput["status"],
  reason: string,
): B01UnavailableOutput {
  return Object.freeze({ kind: "unavailable", parameterId, status, reason });
}

function availableRatio(
  valueSi: number,
  numeratorParameterId: B01AvailableRatioOutput["numeratorParameterId"],
  denominatorParameterId: B01AvailableRatioOutput["denominatorParameterId"],
): B01AvailableRatioOutput {
  return Object.freeze({
    kind: "available",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    numeratorParameterId,
    denominatorParameterId,
  });
}

function identityCheck(
  identityId: B01IdentityCheck["identityId"],
  actualSi: number,
  referenceSi: number,
): B01IdentityCheck | null {
  const absoluteResidualSi = Math.abs(actualSi - referenceSi);
  if (
    !Number.isFinite(actualSi) ||
    !Number.isFinite(referenceSi) ||
    !Number.isFinite(absoluteResidualSi) ||
    !isWithinTolId(actualSi, referenceSi)
  ) {
    return null;
  }
  return Object.freeze({
    identityId,
    actualSi,
    referenceSi,
    absoluteResidualSi,
    toleranceId: TOL_ID.id,
    tolerancePurpose: "identity_only",
    passed: true,
  });
}

type GeometryEvidenceResult =
  | {
      readonly ok: true;
      readonly evidence: Readonly<B01GeometryApplicabilityEvidence>;
    }
  | { readonly ok: false; readonly failure: B01GeometryNormalizationFailure };

function validateGeometryEvidence(value: unknown): GeometryEvidenceResult {
  const evidence = readExactPlainDataRecord(value, [
    "windingClass",
    "cylindricalAxisDefinition",
    "conductorSectionDirections",
    "measurementDatums",
    "identicalTurnSections",
    "identityCheckBasis",
  ]);
  if (evidence === null) {
    return {
      ok: false,
      failure: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        value === null || value === undefined
          ? "B-01.geometry_evidence_missing"
          : "B-01.geometry_evidence_invalid",
        "B-01 requires exact cylindrical-axis, section-direction, winding-class, datum, and identity-comparison evidence.",
        "Provide the controlled B-01 geometry applicability record.",
      ),
    };
  }
  if (
    (evidence.windingClass !== "uniform_single_layer" &&
      evidence.windingClass !== "multilayer" &&
      evidence.windingClass !== "other_or_unknown") ||
    (evidence.cylindricalAxisDefinition !== "explicit" &&
      evidence.cylindricalAxisDefinition !== "unconfirmed") ||
    (evidence.conductorSectionDirections !==
      "radial_and_axial_explicit" &&
      evidence.conductorSectionDirections !== "unconfirmed") ||
    (evidence.measurementDatums !== "consistent" &&
      evidence.measurementDatums !== "inconsistent" &&
      evidence.measurementDatums !== "unconfirmed") ||
    typeof evidence.identicalTurnSections !== "boolean" ||
    (evidence.identityCheckBasis !== "exact_identity" &&
      evidence.identityCheckBasis !== "measurement_uncertainty_required")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.geometry_evidence_invalid",
        "B-01 geometry evidence contains an uncontrolled value.",
        "Use only the isolated B-01 controlled evidence enumeration.",
      ),
    };
  }
  if (evidence.windingClass === "multilayer") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "B-01.multilayer_not_applicable",
        "The frozen ID-GEO-01 identities normalize a uniform single-layer winding, not a multilayer winding cross-section.",
        "Route genuine multilayer geometry through its independent a_ml, b_ml, c_ml and N_layer records.",
      ),
    };
  }
  if (
    evidence.windingClass !== "uniform_single_layer" ||
    evidence.cylindricalAxisDefinition !== "explicit" ||
    evidence.conductorSectionDirections !== "radial_and_axial_explicit" ||
    !evidence.identicalTurnSections ||
    evidence.measurementDatums === "unconfirmed"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "B-01.geometry_applicability_unconfirmed",
        "The uniform-single-layer axis, installed section directions, identical turns, or measurement datum is not confirmed.",
        "Resolve the mechanical geometry evidence before applying ID-GEO-01.",
      ),
    };
  }
  if (evidence.measurementDatums === "inconsistent") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.measurement_datums_inconsistent",
        "The supplied mechanical dimensions do not share a consistent measurement datum.",
        "Reconcile the mechanical drawing or measurement reference datums.",
      ),
    };
  }
  return {
    ok: true,
    evidence: Object.freeze({
      windingClass: "uniform_single_layer",
      cylindricalAxisDefinition: "explicit",
      conductorSectionDirections: "radial_and_axial_explicit",
      measurementDatums: "consistent",
      identicalTurnSections: true,
      identityCheckBasis: evidence.identityCheckBasis,
    }),
  };
}

interface ParsedTurnCenters {
  readonly output: B01AvailableTurnCentersOutput | B01UnavailableOutput;
  readonly positions: readonly number[] | null;
}

function parseTurnCenters(
  value: unknown,
  electricalTurnCount: number,
):
  | { readonly ok: true; readonly parsed: ParsedTurnCenters }
  | { readonly ok: false; readonly failure: B01GeometryNormalizationFailure } {
  const record = readExactPlainDataRecord(value, [
    "positionsM",
    "coordinateSystemId",
    "ordering",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.turn_center_schema_invalid",
        "turnCenters must be an exact controlled plain-data record.",
        "Provide explicit positionsM, coordinateSystemId, and ordering fields.",
      ),
    };
  }
  if (record.positionsM === null) {
    if (
      record.coordinateSystemId !== null ||
      record.ordering !== "unconfirmed"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.turn_center_schema_invalid",
          "Absent z_i requires explicit null coordinateSystemId and unconfirmed ordering.",
          "Do not attach coordinate metadata to a missing coordinate array.",
        ),
      };
    }
    return {
      ok: true,
      parsed: {
        positions: null,
        output: unavailable(
          "coil.turn_center_z[]",
          "insufficient_data",
          "turn-center coordinates were not provided; no positions were guessed from N or p",
        ),
      },
    };
  }
  const positions = readDenseFiniteNumberArray(record.positionsM);
  if (
    positions === null ||
    !isNonBlankString(record.coordinateSystemId) ||
    (record.ordering !== "ascending" && record.ordering !== "descending")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.turn_center_schema_invalid",
        "z_i must be a dense finite plain array with a non-blank coordinate system and explicit ordering.",
        "Provide accessor-free canonical-SI coordinates in their declared fixed order.",
      ),
    };
  }
  if (positions.length !== electricalTurnCount) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.turn_center_count_invalid",
        "The z_i array does not contain exactly one center coordinate per electrical turn.",
        "Correct N or provide the complete ordered turn-center array.",
      ),
    };
  }
  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1];
    const current = positions[index];
    if (previous === undefined || current === undefined) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.turn_center_schema_invalid",
          "The z_i array is not dense.",
          "Provide every turn-center coordinate explicitly.",
        ),
      };
    }
    if (
      (record.ordering === "ascending" && current <= previous) ||
      (record.ordering === "descending" && current >= previous)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.turn_center_order_invalid",
          "The z_i values are not strictly monotonic in the declared order.",
          "Correct the fixed coordinate ordering without silently sorting it.",
        ),
      };
    }
  }
  return {
    ok: true,
    parsed: {
      positions,
      output: Object.freeze({
        kind: "available",
        parameterId: "coil.turn_center_z[]",
        valueSi: positions,
        dimensionId: "length",
        canonicalUnitId: "m",
        coordinateSystemId: record.coordinateSystemId,
        ordering: record.ordering,
        provenance: "explicit_input",
      }),
    },
  };
}

interface ParsedHelixPath {
  readonly revolutionCount:
    | B01AvailableDimensionlessOutput
    | B01UnavailableOutput;
  readonly axialAdvance: B01AvailableLengthOutput | B01UnavailableOutput;
  readonly leadLength: B01AvailableLengthOutput | B01UnavailableOutput;
}

function parseHelixPath(
  value: unknown,
):
  | { readonly ok: true; readonly parsed: ParsedHelixPath }
  | { readonly ok: false; readonly failure: B01GeometryNormalizationFailure } {
  const record = readExactPlainDataRecord(value, [
    "revolutionCount",
    "axialAdvanceM",
    "leadLengthM",
    "revolutionCountBasis",
    "axialAdvanceBasis",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.helix_path_schema_invalid",
        "helixPath must be an exact controlled plain-data record.",
        "Declare N_rev, delta_z_helix, lead_length and their path bases explicitly, using null for missing values.",
      ),
    };
  }
  if (
    (record.revolutionCountBasis !== "actual_mechanical_or_cad_path" &&
      record.revolutionCountBasis !== "guessed_from_electrical_turn_count" &&
      record.revolutionCountBasis !== "other_or_unknown") ||
    (record.axialAdvanceBasis !== "actual_path_endpoint_advance" &&
      record.axialAdvanceBasis !== "guessed_from_turn_center_span" &&
      record.axialAdvanceBasis !== "other_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.helix_path_schema_invalid",
        "The helix-path evidence contains an uncontrolled basis value.",
        "Use only the explicit mechanical/CAD path evidence enumeration.",
      ),
    };
  }
  if (
    (record.revolutionCount === null) !== (record.axialAdvanceM === null)
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "B-01.helix_path_incomplete",
        "N_rev and delta_z_helix must both be present for a path route; one is missing.",
        "Provide both actual path endpoint quantities or leave both explicitly unresolved.",
      ),
    };
  }
  let revolutionCount:
    | B01AvailableDimensionlessOutput
    | B01UnavailableOutput;
  let axialAdvance: B01AvailableLengthOutput | B01UnavailableOutput;
  if (record.revolutionCount === null && record.axialAdvanceM === null) {
    if (
      record.revolutionCountBasis !== "other_or_unknown" ||
      record.axialAdvanceBasis !== "other_or_unknown"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.helix_path_schema_invalid",
          "Missing helix path values cannot claim an actual or guessed path basis.",
          "Use other_or_unknown for both bases when path quantities are absent.",
        ),
      };
    }
    revolutionCount = unavailable(
      "coil.helix_revolution_count",
      "insufficient_data",
      "N_rev was not provided and was not inferred from electrical turn count N",
    );
    axialAdvance = unavailable(
      "coil.helix_axial_advance",
      "insufficient_data",
      "delta_z_helix was not provided and was not inferred from b_cc or z_i",
    );
  } else {
    if (
      typeof record.revolutionCount !== "number" ||
      !Number.isFinite(record.revolutionCount) ||
      record.revolutionCount <= 0 ||
      typeof record.axialAdvanceM !== "number" ||
      !Number.isFinite(record.axialAdvanceM)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.numeric_input_invalid",
          "N_rev must be finite and positive and delta_z_helix must be finite canonical SI.",
          "Correct the actual mechanical/CAD helix path quantities.",
        ),
      };
    }
    if (
      record.revolutionCountBasis === "guessed_from_electrical_turn_count" ||
      record.axialAdvanceBasis === "guessed_from_turn_center_span"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "B-01.invalid_geometry_mapping",
          "B-01 forbids guessing N_rev from N or delta_z_helix from a turn-center/envelope length.",
          "Use actual mechanical/CAD path endpoint evidence.",
        ),
      };
    }
    if (
      record.revolutionCountBasis !== "actual_mechanical_or_cad_path" ||
      record.axialAdvanceBasis !== "actual_path_endpoint_advance"
    ) {
      return {
        ok: false,
        failure: failure(
          "insufficient_data",
          "B-01.helix_path_evidence_missing",
          "The supplied N_rev or delta_z_helix is not confirmed as an actual mechanical/CAD path quantity.",
          "Resolve both path bases before publishing them as B-01 path outputs.",
        ),
      };
    }
    revolutionCount = availableDimensionless(
      "coil.helix_revolution_count",
      record.revolutionCount,
    );
    axialAdvance = availableLength(
      "coil.helix_axial_advance",
      record.axialAdvanceM,
      "explicit_input",
    );
  }

  let leadLength: B01AvailableLengthOutput | B01UnavailableOutput;
  if (record.leadLengthM === null) {
    leadLength = unavailable(
      "coil.lead_length",
      "insufficient_data",
      "lead_length is unknown; zero was not substituted",
    );
  } else if (
    typeof record.leadLengthM !== "number" ||
    !Number.isFinite(record.leadLengthM) ||
    record.leadLengthM < 0
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "B-01.numeric_input_invalid",
        "lead_length must be a finite nonnegative canonical-SI length or explicit null.",
        "Correct the lead reference-plane length without substituting an implicit zero.",
      ),
    };
  } else {
    leadLength = availableLength(
      "coil.lead_length",
      record.leadLengthM,
      "explicit_input",
    );
  }
  return {
    ok: true,
    parsed: { revolutionCount, axialAdvance, leadLength },
  };
}

/** Isolated canonical-SI, non-activated implementation of frozen method B-01. */
export function evaluateB01GeometryNormalization(
  input: unknown,
): B01GeometryNormalizationOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "electricalTurnCount",
    "innerDiameterM",
    "outerDiameterM",
    "meanDiameterM",
    "currentPathDiameterM",
    "currentPathBasis",
    "conductorRadialSizeM",
    "conductorAxialSizeM",
    "pitchCenterM",
    "turnCenters",
    "helixPath",
    "geometry",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-01.input_schema_invalid",
      "B-01 input must be an exact controlled canonical-SI plain-data record.",
      "Provide every B-01 field explicitly; use null only where the isolated schema permits it.",
    );
  }

  const geometryResult = validateGeometryEvidence(controlledInput.geometry);
  if (!geometryResult.ok) {
    return geometryResult.failure;
  }

  const {
    electricalTurnCount,
    innerDiameterM,
    outerDiameterM,
    meanDiameterM,
    currentPathDiameterM,
    currentPathBasis,
    conductorRadialSizeM,
    conductorAxialSizeM,
    pitchCenterM,
  } = controlledInput;
  if (
    typeof electricalTurnCount !== "number" ||
    !Number.isSafeInteger(electricalTurnCount) ||
    electricalTurnCount < 1 ||
    typeof innerDiameterM !== "number" ||
    !Number.isFinite(innerDiameterM) ||
    innerDiameterM <= 0 ||
    typeof conductorRadialSizeM !== "number" ||
    !Number.isFinite(conductorRadialSizeM) ||
    conductorRadialSizeM <= 0 ||
    typeof conductorAxialSizeM !== "number" ||
    !Number.isFinite(conductorAxialSizeM) ||
    conductorAxialSizeM <= 0 ||
    typeof outerDiameterM !== "number" ||
    !Number.isFinite(outerDiameterM) ||
    outerDiameterM <= innerDiameterM ||
    (meanDiameterM !== null &&
      (typeof meanDiameterM !== "number" ||
        !Number.isFinite(meanDiameterM) ||
        meanDiameterM <= innerDiameterM ||
        meanDiameterM >= outerDiameterM))
  ) {
    return failure(
      "invalid_input",
      "B-01.numeric_input_invalid",
      "B-01 requires safe-integer N>=1, positive finite canonical-SI mechanical dimensions, D_o>D_i, and D_i<D_m<D_o when redundant values are supplied.",
      "Correct the distinct mechanical diameter and installed conductor-section inputs.",
    );
  }
  if (electricalTurnCount === 1 && pitchCenterM !== null) {
    return failure(
      "invalid_input",
      "B-01.single_turn_pitch_invalid",
      "p is not applicable for N=1 because there is no adjacent turn center.",
      "Use explicit null for p; B-01 will return b_cc=0 and b_env=d_ax.",
    );
  }
  if (
    electricalTurnCount > 1 &&
    (typeof pitchCenterM !== "number" ||
      !Number.isFinite(pitchCenterM) ||
      pitchCenterM <= 0)
  ) {
    return failure(
      pitchCenterM === null ? "insufficient_data" : "invalid_input",
      pitchCenterM === null
        ? "B-01.pitch_missing"
        : "B-01.numeric_input_invalid",
      "A finite positive adjacent-turn center pitch is required when N>=2.",
      "Provide the drawing-defined canonical-SI p without substituting Np or an envelope length.",
    );
  }

  const twoRadialSizes = 2 * conductorRadialSizeM;
  const derivedOuterDiameterM = innerDiameterM + twoRadialSizes;
  const derivedMeanFromRadialSizeM = innerDiameterM + conductorRadialSizeM;
  const derivedMeanFromBoundsM =
    innerDiameterM + (outerDiameterM - innerDiameterM) / 2;
  const resolvedMeanDiameterM = meanDiameterM ?? derivedMeanFromBoundsM;
  if (
    !Number.isFinite(twoRadialSizes) ||
    twoRadialSizes <= 0 ||
    !Number.isFinite(derivedOuterDiameterM) ||
    derivedOuterDiameterM <= innerDiameterM ||
    derivedOuterDiameterM === innerDiameterM ||
    !Number.isFinite(derivedMeanFromRadialSizeM) ||
    derivedMeanFromRadialSizeM <= innerDiameterM ||
    derivedMeanFromRadialSizeM === innerDiameterM ||
    derivedMeanFromRadialSizeM >= derivedOuterDiameterM ||
    !Number.isFinite(derivedMeanFromBoundsM) ||
    derivedMeanFromBoundsM <= innerDiameterM ||
    derivedMeanFromBoundsM >= outerDiameterM ||
    !Number.isFinite(resolvedMeanDiameterM)
  ) {
    return failure(
      "invalid_input",
      "B-01.numeric_resolution_invalid",
      "A positive conductor radial size was lost or overflowed while deriving D_o or D_m.",
      "Use finite, representable canonical-SI mechanical dimensions.",
    );
  }

  const identityChecks: B01IdentityCheck[] = [];
  if (geometryResult.evidence.identityCheckBasis !== "exact_identity") {
    return failure(
      "insufficient_data",
      "B-01.redundant_identity_uncertainty_unresolved",
      "The mechanically required D_o and conductor radial size are redundant measured geometry; their comparison requires a frozen combined-uncertainty rule, and TOL-ID cannot be used as an engineering measurement tolerance.",
      "Resolve the measurement-uncertainty rule or call the exact-identity route only for algebraic/synthetic inputs.",
    );
  }

  const outerCheck = identityCheck(
    "D_o=D_i+2d_rad",
    outerDiameterM,
    derivedOuterDiameterM,
  );
  if (outerCheck === null) {
    return failure(
      "invalid_input",
      "B-01.geometry_identity_inconsistent",
      "The required D_o conflicts with D_i+2*d_rad under the declared exact identity basis.",
      "Correct the distinct mechanical input; B-01 does not derive over or overwrite D_o.",
    );
  }
  identityChecks.push(outerCheck);

  const meanBoundsCheck = identityCheck(
    "D_m=(D_i+D_o)/2",
    resolvedMeanDiameterM,
    derivedMeanFromBoundsM,
  );
  if (meanBoundsCheck === null) {
    return failure(
      "invalid_input",
      "B-01.geometry_identity_inconsistent",
      "The supplied or derived D_m conflicts with (D_i+D_o)/2 under the declared exact identity basis.",
      "Correct the redundant input; B-01 keeps D_i, D_o, D_m, and D_c distinct.",
    );
  }
  identityChecks.push(meanBoundsCheck);

  const meanRadialCheck = identityCheck(
    "D_m=D_i+d_rad",
    resolvedMeanDiameterM,
    derivedMeanFromRadialSizeM,
  );
  if (meanRadialCheck === null) {
    return failure(
      "invalid_input",
      "B-01.geometry_identity_inconsistent",
      "The supplied or derived D_m conflicts with D_i+d_rad under the declared exact identity basis.",
      "Correct the redundant input; D_m and D_c remain distinct and are not overwritten.",
    );
  }
  identityChecks.push(meanRadialCheck);

  let resolvedCurrentPathDiameterM: number;
  let currentPathProvenance: B01ScalarProvenance;
  let warnings: readonly B01GeometryWarning[];
  if (currentPathBasis === "explicit_method_or_state_bound") {
    if (
      typeof currentPathDiameterM !== "number" ||
      !Number.isFinite(currentPathDiameterM) ||
      currentPathDiameterM <= 0
    ) {
      return failure(
        "invalid_input",
        "B-01.current_path_evidence_invalid",
        "An explicit method/state-bound D_c basis requires a finite positive D_c.",
        "Provide the independently established current-path diameter and retain D_m separately.",
      );
    }
    resolvedCurrentPathDiameterM = currentPathDiameterM;
    currentPathProvenance = "explicit_input";
    warnings = EMPTY_WARNINGS;
  } else if (currentPathBasis === "unresolved_default_to_mean_diameter") {
    if (currentPathDiameterM !== null) {
      return failure(
        "invalid_input",
        "B-01.current_path_evidence_invalid",
        "The unresolved ADR-0003 default requires explicit null D_c so no supplied value is overwritten.",
        "Use explicit_method_or_state_bound for an established D_c or null for the declared D_m default.",
      );
    }
    resolvedCurrentPathDiameterM = resolvedMeanDiameterM;
    currentPathProvenance = "derived_ADR_0003_default";
    warnings = DEFAULT_CURRENT_PATH_WARNINGS;
  } else if (currentPathBasis === "other_or_unknown") {
    return failure(
      "insufficient_data",
      "B-01.current_path_evidence_missing",
      "The D_c basis is unknown and no explicit ADR-0003 default decision was made.",
      "Establish D_c independently or explicitly select the warning-bearing D_c:=D_m v1 default.",
    );
  } else {
    return failure(
      "invalid_input",
      "B-01.current_path_evidence_invalid",
      "The D_c basis is not a controlled B-01 value.",
      "Use the frozen explicit, unresolved-default, or unknown evidence enumeration without coercion.",
    );
  }

  let pitchOutput: B01AvailableLengthOutput | B01UnavailableOutput;
  let clearanceOutput: B01AvailableLengthOutput | B01UnavailableOutput;
  let firstLastCenterSpanM: number;
  let windingEnvelopeLengthM: number;
  if (electricalTurnCount === 1) {
    pitchOutput = unavailable(
      "coil.pitch_center",
      "not_applicable",
      "p is not applicable when N=1",
    );
    clearanceOutput = unavailable(
      "coil.turn_clearance_axial",
      "not_applicable",
      "g=p-d_ax is not applicable when N=1",
    );
    firstLastCenterSpanM = 0;
    windingEnvelopeLengthM = conductorAxialSizeM;
  } else {
    if (typeof pitchCenterM !== "number") {
      return failure(
        "insufficient_data",
        "B-01.pitch_missing",
        "p is missing for N>=2.",
        "Provide the adjacent-turn center pitch.",
      );
    }
    const clearanceM = pitchCenterM - conductorAxialSizeM;
    if (!Number.isFinite(clearanceM)) {
      return failure(
        "invalid_input",
        "B-01.numeric_resolution_invalid",
        "g=p-d_ax is not representable as a finite canonical-SI length.",
        "Use finite, representable p and d_ax values.",
      );
    }
    if (clearanceM < 0) {
      warnings = Object.freeze([...warnings, NEGATIVE_CLEARANCE_WARNING]);
    }
    if (pitchCenterM > conductorAxialSizeM && clearanceM === 0) {
      return failure(
        "invalid_input",
        "B-01.numeric_resolution_invalid",
        "A physically positive axial clearance rounded to a false zero.",
        "Use representable canonical-SI geometry values.",
      );
    }
    firstLastCenterSpanM = (electricalTurnCount - 1) * pitchCenterM;
    windingEnvelopeLengthM =
      firstLastCenterSpanM + conductorAxialSizeM;
    if (
      !Number.isFinite(firstLastCenterSpanM) ||
      firstLastCenterSpanM <= 0 ||
      !Number.isFinite(windingEnvelopeLengthM) ||
      windingEnvelopeLengthM <= firstLastCenterSpanM ||
      windingEnvelopeLengthM === firstLastCenterSpanM
    ) {
      return failure(
        "invalid_input",
        "B-01.numeric_resolution_invalid",
        "b_cc=(N-1)p or b_env=b_cc+d_ax overflowed or lost a positive contribution.",
        "Use finite, representable N, p, and d_ax values.",
      );
    }
    pitchOutput = availableLength(
      "coil.pitch_center",
      pitchCenterM,
      "explicit_input",
    );
    clearanceOutput = availableLength(
      "coil.turn_clearance_axial",
      clearanceM,
      "derived_ID_GEO_01",
    );
  }

  const turnCenterResult = parseTurnCenters(
    controlledInput.turnCenters,
    electricalTurnCount,
  );
  if (!turnCenterResult.ok) {
    return turnCenterResult.failure;
  }
  const positions = turnCenterResult.parsed.positions;
  if (
    positions !== null &&
    geometryResult.evidence.identityCheckBasis !== "exact_identity"
  ) {
    return failure(
      "insufficient_data",
      "B-01.redundant_identity_uncertainty_unresolved",
      "Measured z_i consistency requires an uncertainty rule; TOL-ID is reserved for exact identity inputs.",
      "Provide an approved uncertainty comparison or use the exact-identity route only for synthetic/algebraic coordinates.",
    );
  }
  if (positions !== null && positions.length > 1) {
    if (typeof pitchCenterM !== "number") {
      return failure(
        "insufficient_data",
        "B-01.pitch_missing",
        "z_i cannot be checked against a missing p for N>=2.",
        "Provide p explicitly.",
      );
    }
    const turnCenterRecord = readExactPlainDataRecord(controlledInput.turnCenters, [
      "positionsM",
      "coordinateSystemId",
      "ordering",
    ]);
    if (turnCenterRecord === null) {
      return failure(
        "invalid_input",
        "B-01.turn_center_schema_invalid",
        "turnCenters changed during controlled parsing.",
        "Provide immutable plain-data geometry evidence.",
      );
    }
    for (let index = 1; index < positions.length; index += 1) {
      const previous = positions[index - 1];
      const current = positions[index];
      if (previous === undefined || current === undefined) {
        return failure(
          "invalid_input",
          "B-01.turn_center_schema_invalid",
          "The z_i array is not dense.",
          "Provide every coordinate explicitly.",
        );
      }
      const interval =
        turnCenterRecord.ordering === "ascending"
          ? current - previous
          : previous - current;
      if (!Number.isFinite(interval) || interval <= 0) {
        return failure(
          "invalid_input",
          "B-01.numeric_resolution_invalid",
          "A z_i interval is not a finite positive length.",
          "Use finite, representable ordered coordinates.",
        );
      }
      const check = identityCheck("z_interval=p", interval, pitchCenterM);
      if (check === null) {
        return failure(
          "invalid_input",
          "B-01.geometry_identity_inconsistent",
          "An exact-identity z_i interval conflicts with p.",
          "Correct the explicit pitch or turn-center coordinates; B-01 does not sort or fit them.",
        );
      }
      identityChecks.push(check);
    }
    const first = positions[0];
    const last = positions[positions.length - 1];
    if (first === undefined || last === undefined) {
      return failure(
        "invalid_input",
        "B-01.turn_center_schema_invalid",
        "The z_i endpoints are unavailable.",
        "Provide the complete dense coordinate array.",
      );
    }
    const span = Math.abs(last - first);
    if (!Number.isFinite(span)) {
      return failure(
        "invalid_input",
        "B-01.numeric_resolution_invalid",
        "The first-to-last z_i span overflowed canonical SI.",
        "Use finite, representable coordinates within one fixed datum.",
      );
    }
    const spanCheck = identityCheck(
      "z_span=b_cc",
      span,
      firstLastCenterSpanM,
    );
    if (spanCheck === null) {
      return failure(
        "invalid_input",
        "B-01.geometry_identity_inconsistent",
        "The exact-identity z_i endpoint span conflicts with b_cc=(N-1)p.",
        "Correct the redundant geometry inputs without replacing b_cc by a fitted value.",
      );
    }
    identityChecks.push(spanCheck);
  }

  const helixResult = parseHelixPath(controlledInput.helixPath);
  if (!helixResult.ok) {
    return helixResult.failure;
  }

  const windingEnvelopeToCurrentPathDiameter =
    windingEnvelopeLengthM / resolvedCurrentPathDiameterM;
  const conductorRadialSizeToCurrentPathDiameter =
    conductorRadialSizeM / resolvedCurrentPathDiameterM;
  const pitchToConductorAxialSize =
    typeof pitchCenterM === "number"
      ? pitchCenterM / conductorAxialSizeM
      : null;
  if (
    !Number.isFinite(windingEnvelopeToCurrentPathDiameter) ||
    windingEnvelopeToCurrentPathDiameter <= 0 ||
    !Number.isFinite(conductorRadialSizeToCurrentPathDiameter) ||
    conductorRadialSizeToCurrentPathDiameter <= 0 ||
    (typeof pitchCenterM === "number" &&
      (pitchToConductorAxialSize === null ||
        !Number.isFinite(pitchToConductorAxialSize) ||
        pitchToConductorAxialSize <= 0))
  ) {
    return failure(
      "invalid_input",
      "B-01.numeric_resolution_invalid",
      "A positive dimensionless geometry ratio overflowed or underflowed.",
      "Use finite, representable canonical-SI geometry values.",
    );
  }

  const pitchRatioOutput: B01AvailableRatioOutput | B01UnavailableRatioOutput =
    pitchToConductorAxialSize === null
      ? Object.freeze({
          kind: "unavailable",
          status: "not_applicable",
          numeratorParameterId: "coil.pitch_center",
          denominatorParameterId: "conductor.axial_size",
          reason: "p/d_ax is not applicable when N=1",
        })
      : availableRatio(
          pitchToConductorAxialSize,
          "coil.pitch_center",
          "conductor.axial_size",
        );

  const value = Object.freeze({
    innerDiameter: availableLength(
      "coil.inner_diameter",
      innerDiameterM,
      "explicit_input",
    ),
    outerDiameter: availableLength(
      "coil.outer_diameter",
      outerDiameterM,
      "explicit_input",
    ),
    meanDiameter: availableLength(
      "coil.mean_diameter",
      resolvedMeanDiameterM,
      meanDiameterM === null ? "derived_ID_GEO_01" : "explicit_input",
    ),
    currentPathDiameter: availableLength(
      "coil.current_path_diameter",
      resolvedCurrentPathDiameterM,
      currentPathProvenance,
    ),
    conductorRadialSize: availableLength(
      "conductor.radial_size",
      conductorRadialSizeM,
      "explicit_input",
    ),
    conductorAxialSize: availableLength(
      "conductor.axial_size",
      conductorAxialSizeM,
      "explicit_input",
    ),
    pitchCenter: pitchOutput,
    turnClearanceAxial: clearanceOutput,
    firstLastCenterSpan: availableLength(
      "coil.first_last_center_span",
      firstLastCenterSpanM,
      "derived_ID_GEO_01",
    ),
    windingEnvelopeLength: availableLength(
      "coil.winding_envelope_length",
      windingEnvelopeLengthM,
      "derived_ID_GEO_01",
    ),
    electricalTurnCount: availableDimensionless(
      "coil.electrical_turn_count",
      electricalTurnCount,
    ),
    helixRevolutionCount: helixResult.parsed.revolutionCount,
    helixAxialAdvance: helixResult.parsed.axialAdvance,
    leadLength: helixResult.parsed.leadLength,
    turnCenterZ: turnCenterResult.parsed.output,
    dimensionlessRatios: Object.freeze({
      windingEnvelopeToCurrentPathDiameter: availableRatio(
        windingEnvelopeToCurrentPathDiameter,
        "coil.winding_envelope_length",
        "coil.current_path_diameter",
      ),
      pitchToConductorAxialSize: pitchRatioOutput,
      conductorRadialSizeToCurrentPathDiameter: availableRatio(
        conductorRadialSizeToCurrentPathDiameter,
        "conductor.radial_size",
        "coil.current_path_diameter",
      ),
    }),
  }) satisfies B01GeometryNormalizationValue;

  return Object.freeze({
    methodId: B01_METHOD_ID,
    methodVersion: B01_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value,
    identityChecks: Object.freeze(identityChecks),
    geometryEvidence: geometryResult.evidence,
    equations: Object.freeze([
      "D_o = D_i + 2*d_rad",
      "D_m = (D_i + D_o)/2 = D_i + d_rad",
      "g = p - d_ax when N>1",
      "b_cc = (N-1)*p when N>1; b_cc=0 when N=1",
      "b_env = b_cc + d_ax",
    ]) as B01GeometryNormalizationSuccess["equations"],
    semanticBoundaries: Object.freeze({
      diametersRemainDistinct: Object.freeze([
        "D_i",
        "D_o",
        "D_m",
        "D_c",
      ]) as B01GeometryNormalizationSuccess["semanticBoundaries"]["diametersRemainDistinct"],
      axialLengthsRemainDistinct: Object.freeze([
        "p",
        "g",
        "b_cc",
        "b_env",
        "delta_z_helix",
      ]) as B01GeometryNormalizationSuccess["semanticBoundaries"]["axialLengthsRemainDistinct"],
      revolutionCountsRemainDistinct: Object.freeze([
        "N",
        "N_rev",
      ]) as B01GeometryNormalizationSuccess["semanticBoundaries"]["revolutionCountsRemainDistinct"],
      helixRevolutionPolicy: "N_rev_never_inferred_from_N",
      thermalRadialGapPolicy:
        "thermal.radial_gap_is_not_consumed_or_derived",
    }),
    sourceRefs: B01_SOURCE_REFS,
    contractSourceRefs: B01_CONTRACT_SOURCE_REFS,
    derivationRefs: B01_DERIVATION_REFS,
    validationCaseIds: B01_VALIDATION_CASE_IDS,
    methodCheckIds: B01_METHOD_CHECK_IDS,
  });
}
