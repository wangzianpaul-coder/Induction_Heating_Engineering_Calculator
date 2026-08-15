/**
 * H-06 local saturation, NPSH and evidence gates.
 *
 * The frozen project does not yet contain a locally pinned IAPWS Region 4
 * implementation, a pinned HI 9.6.1 edition, or project/OEM safety limits.
 * This isolated method therefore performs only two source-bound algebraic
 * screenings: Tsat(p_abs) - T from an externally precomputed exact tuple, and
 * NPSHA - NPSHR from an already-complete same-operating-point pair. It never
 * derives Tsat, Twi or NPSHA and never issues a safe/no-boiling conclusion.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-06"));

export const H06_METHOD_ID = "H-06" as const;
export const H06_METHOD_VERSION = SPECIFICATION.methodVersion;
export const H06_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const H06_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const H06_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const H06_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const H06_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const H06_BINARY64_MIN_NORMAL = 2 ** -1022;

export const H06_NUMERIC_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  nonzeroSubnormalInputOrResultPolicy: "fail_closed" as const,
  overflowFalseZeroAndOperandSwallowPolicy: "fail_closed" as const,
  exactZeroDifferencePolicy: "allowed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: H06_BINARY64_MIN_NORMAL,
});

export const H06_DHT_SOURCE_PIN = Object.freeze({
  sourceId: "DHT" as const,
  relativePath:
    "references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf" as const,
  sha256:
    "33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98" as const,
  auditedPdfPages: Object.freeze([11, 12, 17] as const),
  hashStatus: "verified_against_source_manifest_and_register" as const,
  role:
    "context_for_local_hotspots_water_quality_and_oem_flow_evidence_not_a_universal_threshold" as const,
});

export const H06_SOURCE_READINESS = Object.freeze({
  technicalFreezeId: "IH-EC-V1-G0-2026-08-14-01" as const,
  dht: H06_DHT_SOURCE_PIN,
  iapwsRegion4: Object.freeze({
    localPinnedCopyAvailable: false as const,
    executableProviderAvailable: false as const,
    routeStatus: "blocked_unpinned_local_source_and_provider" as const,
  }),
  hi961: Object.freeze({
    localPinnedEditionAvailable: false as const,
    safetyMarginEvaluationAvailable: false as const,
    routeStatus: "blocked_unpinned_edition" as const,
  }),
  oemSafetyThresholds: Object.freeze({
    frozenProjectThresholdsAvailable: false as const,
    safetyDecisionAvailable: false as const,
    routeStatus: "blocked_source_bound_oem_project_evidence_required" as const,
  }),
});

export const H06_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivated: false as const,
  publicApiExported: false as const,
  supportedRoutes: Object.freeze([
    "raw_local_saturation_difference_from_external_precomputed_tuple",
    "raw_npsha_minus_oem_npshr_from_precomputed_pair",
    "explicit_missing_data_gates",
  ] as const),
  blockedRoutes: Object.freeze([
    "iapws_region4_property_provider",
    "npsha_from_partial_bernoulli_terms",
    "inner_wall_temperature_derivation",
    "hi_or_oem_safety_margin_decision",
    "safe_or_no_boiling_conclusion",
  ] as const),
});

export const H06_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  sourceRefs: H06_SOURCE_REFS,
  contractSourceRefs: H06_CONTRACT_SOURCE_REFS,
  derivationRefs: H06_DERIVATION_REFS,
  validationCaseIds: H06_VALIDATION_CASE_IDS,
  methodCheckIds: H06_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericPolicy: H06_NUMERIC_POLICY,
  sourceReadiness: H06_SOURCE_READINESS,
  implementationReadiness: H06_IMPLEMENTATION_READINESS,
});

const POSITIVE_MARGIN_SAFE_PREDICATE =
  "a positive raw margin is called safe" as const;
const OUTLET_HOTSPOT_PREDICATE =
  "outlet temperature substitutes for hotspot temperature" as const;
const OEM_OR_PUMP_MISSING_PREDICATE =
  "OEM data or pump curve is missing" as const;
const GAUGE_PRESSURE_PREDICATE = "gauge pressure is used" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      "H-06 warning predicate is absent from the frozen contract: " + predicate,
    );
  }
  return predicate;
}

export const H06_WARNING_PREDICATES = Object.freeze({
  positiveMarginCalledSafe: controlledWarningPredicate(
    POSITIVE_MARGIN_SAFE_PREDICATE,
  ),
  outletTemperatureAsHotspot: controlledWarningPredicate(
    OUTLET_HOTSPOT_PREDICATE,
  ),
  oemOrPumpEvidenceMissing: controlledWarningPredicate(
    OEM_OR_PUMP_MISSING_PREDICATE,
  ),
  gaugePressure: controlledWarningPredicate(GAUGE_PRESSURE_PREDICATE),
});

export type H06RequestedInterpretation =
  | "raw_screening_only"
  | "safety_or_no_boiling_claim"
  | "unknown_or_unconfirmed";

export type H06PressureBasis =
  | "absolute"
  | "gauge"
  | "unknown_or_unconfirmed";

export interface H06LocalStateBinding {
  readonly coolantCircuitId: string;
  readonly branchId: string;
  readonly localStationId: string;
  readonly localReferencePlaneId: string;
  readonly caseSnapshotId: string;
  readonly stateSnapshotId: string;
  readonly fluidStateSnapshotId: string;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly fluidIdentityId: string;
  readonly fluidClass:
    | "ordinary_water"
    | "other_liquid_or_mixture"
    | "unknown_or_unconfirmed";
  readonly sourceSnapshotId: string;
}

export type H06EvidenceSourceMethod =
  | "measurement"
  | "upstream_precomputed_model"
  | "sourced_user_input";

interface H06LocalSourceEvidence {
  readonly sourceMethod: H06EvidenceSourceMethod | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly binding: H06LocalStateBinding;
}

export interface H06AvailableSaturationTuple extends H06LocalSourceEvidence {
  readonly kind: "available";
  readonly inputId: "pabs+Tsat";
  readonly pressurePa: number;
  readonly pressureDimensionId: "pressure";
  readonly pressureCanonicalUnitId: "Pa";
  readonly pressureBasis: H06PressureBasis;
  readonly saturationTemperatureK: number;
  readonly temperatureDimensionId: "absolute_temperature";
  readonly temperatureCanonicalUnitId: "K";
  readonly tupleOrigin:
    | "external_precomputed_exact_pressure_tuple"
    | "h06_internal_property_provider_claim"
    | "unknown_or_unconfirmed";
  readonly providerExecutionClaim:
    | "not_executed_by_h06"
    | "executable_inside_h06"
    | "unknown_or_unconfirmed";
  readonly providerSourceRef: string;
  readonly providerReleaseId: string;
  readonly providerImplementationId: string;
  readonly propertySnapshotId: string;
  readonly sourceMethod: H06EvidenceSourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface H06UnknownSaturationTuple extends H06LocalSourceEvidence {
  readonly kind: "unknown_applicable";
  readonly inputId: "pabs+Tsat";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly pressureBasis: H06PressureBasis;
  readonly tupleOrigin:
    | "external_precomputed_exact_pressure_tuple"
    | "h06_internal_property_provider_claim"
    | "unknown_or_unconfirmed";
  readonly providerExecutionClaim:
    | "not_executed_by_h06"
    | "executable_inside_h06"
    | "unknown_or_unconfirmed";
  readonly providerSourceRef: string;
  readonly sourceMethod: "unknown_or_unconfirmed";
  readonly dataQuality: "unknown";
}

export type H06SaturationTuple =
  | H06AvailableSaturationTuple
  | H06UnknownSaturationTuple;

export type H06TemperatureInputId = "Tb" | "Twi";

export type H06TemperatureSpatialBasis =
  | "local_bulk_at_declared_station"
  | "local_inner_wall_at_declared_station"
  | "circuit_outlet_bulk"
  | "outlet_substituted_as_hotspot"
  | "unknown_or_unconfirmed";

export type H06TemperatureValueOrigin =
  | "measurement_or_upstream_precomputed_local_value"
  | "h06_derived_from_q_h_rf"
  | "outlet_temperature_substitution"
  | "unknown_or_unconfirmed";

export interface H06AvailableTemperatureEvidence
  extends H06LocalSourceEvidence {
  readonly kind: "available";
  readonly inputId: H06TemperatureInputId;
  readonly valueK: number;
  readonly dimensionId: "absolute_temperature";
  readonly canonicalUnitId: "K";
  readonly spatialBasis: H06TemperatureSpatialBasis;
  readonly valueOrigin: H06TemperatureValueOrigin;
  readonly sourceMethod: H06EvidenceSourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface H06UnknownTemperatureEvidence extends H06LocalSourceEvidence {
  readonly kind: "unknown_applicable";
  readonly inputId: H06TemperatureInputId;
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly spatialBasis: H06TemperatureSpatialBasis;
  readonly valueOrigin: H06TemperatureValueOrigin;
  readonly sourceMethod: "unknown_or_unconfirmed";
  readonly dataQuality: "unknown";
}

export type H06TemperatureEvidence =
  | H06AvailableTemperatureEvidence
  | H06UnknownTemperatureEvidence;

export interface H06NpshBinding {
  readonly pumpId: string;
  readonly coolantCircuitId: string;
  readonly flowRateM3PerS: number;
  readonly flowDimensionId: "volume_flow_rate";
  readonly flowCanonicalUnitId: "m3_per_s";
  readonly pumpSpeedRadPerS: number;
  readonly speedDimensionId: "angular_velocity";
  readonly speedCanonicalUnitId: "rad_per_s";
  readonly liquidIdentityId: string;
  readonly liquidStateSnapshotId: string;
  readonly npshDefinitionId: string;
  readonly suctionReferencePlaneId: string;
  readonly caseSnapshotId: string;
  readonly stateSnapshotId: string;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly operatingPointSnapshotId: string;
}

export interface H06NpshaEvidence {
  readonly inputId: "NPSHA";
  readonly valueM: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly precomputationBasis:
    | "upstream_complete_bernoulli_at_declared_reference_plane"
    | "partial_or_missing_bernoulli_terms"
    | "unknown_or_unconfirmed";
  readonly pressureBasis: H06PressureBasis;
  readonly sourceMethod:
    | "measurement_bound_precomputed"
    | "h06_partial_bernoulli_attempt"
    | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly binding: H06NpshBinding;
}

export interface H06NpshrEvidence {
  readonly inputId: "NPSHR";
  readonly valueM: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly curveBasis:
    | "oem_curve_at_exact_flow_speed_liquid_definition"
    | "non_oem_or_unmatched_curve"
    | "unknown_or_unconfirmed";
  readonly sourceMethod:
    | "oem_pump_curve"
    | "generic_or_non_oem_curve"
    | "unknown_or_unconfirmed";
  readonly oemDocumentRef: string;
  readonly oemCurveSnapshotId: string;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly binding: H06NpshBinding;
}

export type H06NpshComparisonEvidence =
  | Readonly<{
      readonly kind: "available";
      readonly npsha: H06NpshaEvidence;
      readonly npshr: H06NpshrEvidence;
    }>
  | Readonly<{
      readonly kind: "source_confirmed_not_applicable";
      readonly reason: string;
      readonly resolutionSourceRef: string;
    }>
  | Readonly<{
      readonly kind: "unknown_applicable";
      readonly reason: string;
      readonly resolutionSourceRef: string;
    }>;

export type H06DataGateId =
  | "water_quality"
  | "oem_safety_thresholds"
  | "pump_operating_evidence";

interface H06DataGateCommon {
  readonly gateId: H06DataGateId;
  readonly scopeEntityId: string;
  readonly sourceMethod:
    | "measurement"
    | "oem_document"
    | "project_specification"
    | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly coolantCircuitId: string;
  readonly caseSnapshotId: string;
  readonly stateSnapshotId: string;
  readonly timeBasisId: string;
}

export interface H06AvailableDataGate extends H06DataGateCommon {
  readonly kind: "available";
  readonly sourceMethod: Exclude<
    H06DataGateCommon["sourceMethod"],
    "unknown_or_unconfirmed"
  >;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface H06NotApplicableDataGate extends H06DataGateCommon {
  readonly kind: "source_confirmed_not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly sourceMethod: Exclude<
    H06DataGateCommon["sourceMethod"],
    "unknown_or_unconfirmed"
  >;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface H06UnknownDataGate extends H06DataGateCommon {
  readonly kind: "unknown_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly sourceMethod: "unknown_or_unconfirmed";
  readonly dataQuality: "unknown";
}

export type H06DataGateEvidence =
  | H06AvailableDataGate
  | H06NotApplicableDataGate
  | H06UnknownDataGate;

export interface H06LocalPhaseAndNpshGatesInput {
  readonly requestedInterpretation: H06RequestedInterpretation;
  readonly saturationTuple: H06SaturationTuple;
  readonly bulkTemperature: H06TemperatureEvidence;
  readonly innerWallTemperature: H06TemperatureEvidence;
  readonly npshComparison: H06NpshComparisonEvidence;
  readonly waterQualityEvidence: H06DataGateEvidence;
  readonly oemSafetyThresholdEvidence: H06DataGateEvidence;
  readonly pumpEvidence: H06DataGateEvidence;
}

export type H06OutputId =
  | "DeltaT_sub_bulk"
  | "DeltaT_sub_wall"
  | "NPSH_raw_difference";

export interface H06AvailableRawScreeningOutput {
  readonly kind: "available";
  readonly outputId: H06OutputId;
  readonly status: "screening_only";
  readonly valueSi: number;
  readonly dimensionId: "temperature_difference" | "length";
  readonly canonicalUnitId: "K" | "m";
  readonly interpretation: "signed_raw_margin_not_a_safety_conclusion";
  readonly safetyConclusion: "not_evaluated";
}

export interface H06UnavailableRawScreeningOutput {
  readonly kind: "unavailable";
  readonly outputId: H06OutputId;
  readonly status: "insufficient_data" | "source_confirmed_not_applicable";
  readonly reason: string;
  readonly unresolvedItemIds: readonly string[];
  readonly valueSi?: never;
}

export type H06RawScreeningOutput =
  | H06AvailableRawScreeningOutput
  | H06UnavailableRawScreeningOutput;

export interface H06MissingDataItem {
  readonly itemId: string;
  readonly category:
    | "local_saturation_tuple"
    | "local_temperature"
    | "npsh_pair"
    | "water_quality"
    | "oem_safety_thresholds"
    | "pump_operating_evidence";
  readonly reason: string;
  readonly affectedOutputs: readonly H06OutputId[];
}

export interface H06DataGateSummary {
  readonly gateId: H06DataGateId;
  readonly disposition:
    | "evidence_present_not_safety_evaluated"
    | "source_confirmed_not_applicable"
    | "unknown_missing_data";
  readonly scopeEntityId: string;
  readonly sourceRef: string;
  readonly sourceSnapshotId: string;
  readonly reason: string | null;
}

export interface H06CalculationTrace {
  readonly outputId: H06OutputId;
  readonly equation:
    | "DeltaT_sub_bulk = Tsat(p_abs) - T_bulk"
    | "DeltaT_sub_wall = Tsat(p_abs) - T_wall_inner"
    | "NPSH_raw_difference = NPSHA - NPSHR";
  readonly orderedInputIds: readonly string[];
  readonly orderedInputValues: readonly number[];
  readonly resultSi: number | null;
  readonly publicationStatus: "screening_only" | "unavailable";
  readonly safetyDecisionPerformed: false;
}

export interface H06LocalPhaseAndNpshGatesSuccess {
  readonly methodId: typeof H06_METHOD_ID;
  readonly methodVersion: typeof H06_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly calculationStatus: "partial";
  readonly applicabilityStatus: "in_domain_raw_screening_only";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly bulkSaturationMargin: H06RawScreeningOutput;
    readonly wallSaturationMargin: H06RawScreeningOutput;
    readonly npshRawDifference: H06RawScreeningOutput;
    readonly missingData: readonly H06MissingDataItem[];
    readonly dataGates: readonly H06DataGateSummary[];
    readonly openReleaseGates: readonly [
      "IAPWS-IF97:REGION4 local versioned source/provider pin",
      "HI-961 local edition pin",
      "source-bound OEM/project safety thresholds",
    ];
    readonly safetyConclusion: "not_evaluated";
  }>;
  readonly calculationTrace: readonly H06CalculationTrace[];
  readonly inputSnapshot: Readonly<{
    readonly coolantCircuitId: string;
    readonly branchId: string;
    readonly localStationId: string;
    readonly localReferencePlaneId: string;
    readonly caseSnapshotId: string;
    readonly stateSnapshotId: string;
    readonly fluidStateSnapshotId: string;
    readonly timeBasisId: string;
    readonly measurementWindowId: string;
    readonly localSourceSnapshotId: string;
    readonly npshOperatingPointSnapshotId: string | null;
  }>;
  readonly evidence: Readonly<{
    readonly saturationTuple: Readonly<H06SaturationTuple>;
    readonly bulkTemperature: Readonly<H06TemperatureEvidence>;
    readonly innerWallTemperature: Readonly<H06TemperatureEvidence>;
    readonly npshComparison: Readonly<H06NpshComparisonEvidence>;
    readonly dataGates: readonly H06DataGateEvidence[];
  }>;
  readonly sourceReadiness: typeof H06_SOURCE_READINESS;
  readonly mapping: typeof H06_METHOD_MAPPING;
  readonly numericPolicy: typeof H06_NUMERIC_POLICY;
  readonly sourceRefs: typeof H06_SOURCE_REFS;
  readonly contractSourceRefs: typeof H06_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof H06_DERIVATION_REFS;
  readonly validationCaseIds: typeof H06_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof H06_METHOD_CHECK_IDS;
  readonly assumptions: readonly [
    "Tsat is an external precomputed exact absolute-pressure tuple and H-06 does not execute A-02 or IAPWS",
    "bulk and wall temperatures are local values at the declared station; outlet temperature is never substituted",
    "NPSHA is already complete at the declared suction reference plane and H-06 adds no missing Bernoulli term",
    "NPSHR is OEM evidence matched to the exact pump operating state and definition",
    "positive raw margins are screening values and never a safe or no-boiling conclusion",
    "unknown evidence remains missing and is never replaced by zero",
  ];
  readonly failure?: never;
}

export type H06FailureCode =
  | "H-06.input_schema_invalid"
  | "H-06.requested_interpretation_invalid"
  | "H-06.unsafe_claim_not_applicable"
  | "H-06.requested_interpretation_unknown"
  | "H-06.local_binding_schema_invalid"
  | "H-06.saturation_evidence_schema_invalid"
  | "H-06.saturation_value_invalid"
  | "H-06.temperature_evidence_schema_invalid"
  | "H-06.temperature_value_invalid"
  | "H-06.npsh_evidence_schema_invalid"
  | "H-06.npsh_value_invalid"
  | "H-06.data_gate_schema_invalid"
  | "H-06.fluid_not_applicable"
  | "H-06.gauge_pressure_not_applicable"
  | "H-06.unpinned_provider_execution_not_applicable"
  | "H-06.saturation_source_not_applicable"
  | "H-06.outlet_as_hotspot_not_applicable"
  | "H-06.wall_derivation_not_applicable"
  | "H-06.local_state_binding_mismatch"
  | "H-06.npsh_basis_not_applicable"
  | "H-06.npsh_binding_mismatch"
  | "H-06.data_gate_binding_mismatch"
  | "H-06.pump_evidence_contradiction"
  | "H-06.single_phase_model_not_applicable"
  | "H-06.numeric_resolution_invalid";

export interface H06LocalPhaseAndNpshGatesFailure {
  readonly methodId: typeof H06_METHOD_ID;
  readonly methodVersion: typeof H06_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly sourceReadiness: typeof H06_SOURCE_READINESS;
  readonly mapping: typeof H06_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: H06FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly calculationTrace?: never;
  readonly inputSnapshot?: never;
}

export type H06LocalPhaseAndNpshGatesOutcome =
  | H06LocalPhaseAndNpshGatesSuccess
  | H06LocalPhaseAndNpshGatesFailure;

const EMPTY = Object.freeze([]) as readonly [];

function failure(
  status: H06LocalPhaseAndNpshGatesFailure["status"],
  code: H06FailureCode,
  message: string,
  action: string,
): H06LocalPhaseAndNpshGatesFailure {
  return Object.freeze({
    methodId: H06_METHOD_ID,
    methodVersion: H06_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY,
    warnings: EMPTY,
    sourceReadiness: H06_SOURCE_READINESS,
    mapping: H06_METHOD_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableIdentifier(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    sourceRef(value);
    return true;
  } catch {
    return false;
  }
}

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDataQuality(value: unknown): value is DataQuality {
  return (DATA_QUALITIES as readonly unknown[]).includes(value);
}

function isAvailableSourceMethod(
  value: unknown,
): value is H06EvidenceSourceMethod {
  return (
    value === "measurement" ||
    value === "upstream_precomputed_model" ||
    value === "sourced_user_input"
  );
}

function isNormalOrExactZero(value: number): boolean {
  return value === 0 || Math.abs(value) >= H06_BINARY64_MIN_NORMAL;
}

type ReadResult<T> =
  | Readonly<{ readonly ok: true; readonly value: Readonly<T> }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H06LocalPhaseAndNpshGatesFailure;
    }>;

function readLocalBinding(value: unknown): ReadResult<H06LocalStateBinding> {
  const record = readExactPlainDataRecord(value, [
    "coolantCircuitId",
    "branchId",
    "localStationId",
    "localReferencePlaneId",
    "caseSnapshotId",
    "stateSnapshotId",
    "fluidStateSnapshotId",
    "timeBasisId",
    "measurementWindowId",
    "fluidIdentityId",
    "fluidClass",
    "sourceSnapshotId",
  ]);
  if (
    record === null ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.branchId) ||
    !isStableIdentifier(record.localStationId) ||
    !isStableIdentifier(record.localReferencePlaneId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.stateSnapshotId) ||
    !isContentAddressedSnapshotId(record.fluidStateSnapshotId, "material") ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !isStableIdentifier(record.fluidIdentityId) ||
    (record.fluidClass !== "ordinary_water" &&
      record.fluidClass !== "other_liquid_or_mixture" &&
      record.fluidClass !== "unknown_or_unconfirmed") ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-06.local_binding_schema_invalid",
        "A local H-06 evidence binding is not an exact controlled state/snapshot record.",
        "Provide stable circuit, branch, station, reference-plane, time and fluid IDs plus content-addressed case/material/source snapshots.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      coolantCircuitId: record.coolantCircuitId,
      branchId: record.branchId,
      localStationId: record.localStationId,
      localReferencePlaneId: record.localReferencePlaneId,
      caseSnapshotId: record.caseSnapshotId,
      stateSnapshotId: record.stateSnapshotId,
      fluidStateSnapshotId: record.fluidStateSnapshotId,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      fluidIdentityId: record.fluidIdentityId,
      fluidClass: record.fluidClass,
      sourceSnapshotId: record.sourceSnapshotId,
    }),
  });
}

function readSaturationTuple(value: unknown): ReadResult<H06SaturationTuple> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "pressurePa",
    "pressureDimensionId",
    "pressureCanonicalUnitId",
    "pressureBasis",
    "saturationTemperatureK",
    "temperatureDimensionId",
    "temperatureCanonicalUnitId",
    "tupleOrigin",
    "providerExecutionClaim",
    "providerSourceRef",
    "providerReleaseId",
    "providerImplementationId",
    "propertySnapshotId",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "binding",
  ]);
  if (available !== null) {
    const binding = readLocalBinding(available.binding);
    if (!binding.ok) return binding;
    if (
      available.kind !== "available" ||
      available.inputId !== "pabs+Tsat" ||
      available.pressureDimensionId !== "pressure" ||
      available.pressureCanonicalUnitId !== "Pa" ||
      (available.pressureBasis !== "absolute" &&
        available.pressureBasis !== "gauge" &&
        available.pressureBasis !== "unknown_or_unconfirmed") ||
      available.temperatureDimensionId !== "absolute_temperature" ||
      available.temperatureCanonicalUnitId !== "K" ||
      (available.tupleOrigin !==
        "external_precomputed_exact_pressure_tuple" &&
        available.tupleOrigin !== "h06_internal_property_provider_claim" &&
        available.tupleOrigin !== "unknown_or_unconfirmed") ||
      (available.providerExecutionClaim !== "not_executed_by_h06" &&
        available.providerExecutionClaim !== "executable_inside_h06" &&
        available.providerExecutionClaim !== "unknown_or_unconfirmed") ||
      !isStableIdentifier(available.providerSourceRef) ||
      !isStableIdentifier(available.providerReleaseId) ||
      !isStableIdentifier(available.providerImplementationId) ||
      !isContentAddressedSnapshotId(
        available.propertySnapshotId,
        "material",
      ) ||
      !isAvailableSourceMethod(available.sourceMethod) ||
      !isStableIdentifier(available.sourceRef) ||
      !isDataQuality(available.dataQuality) ||
      available.dataQuality === "unknown" ||
      !isStableIdentifier(available.provenanceId)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.saturation_evidence_schema_invalid",
          "The available saturation tuple has an uncontrolled enum, unit, source or snapshot field.",
          "Use the exact canonical-SI external-precomputed tuple schema without aliases, coercion or an executable-provider claim.",
        ),
      });
    }
    if (
      typeof available.pressurePa !== "number" ||
      !Number.isFinite(available.pressurePa) ||
      available.pressurePa <= 0 ||
      !isNormalOrExactZero(available.pressurePa) ||
      typeof available.saturationTemperatureK !== "number" ||
      !Number.isFinite(available.saturationTemperatureK) ||
      available.saturationTemperatureK <= 0 ||
      !isNormalOrExactZero(available.saturationTemperatureK)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.saturation_value_invalid",
          "p_abs and Tsat must be finite positive normal canonical-SI values.",
          "Provide Pa absolute and K values from the exact upstream property tuple; do not pass NaN, Infinity, nonpositive or subnormal values.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "available" as const,
        inputId: "pabs+Tsat" as const,
        pressurePa: available.pressurePa,
        pressureDimensionId: "pressure" as const,
        pressureCanonicalUnitId: "Pa" as const,
        pressureBasis: available.pressureBasis,
        saturationTemperatureK: available.saturationTemperatureK,
        temperatureDimensionId: "absolute_temperature" as const,
        temperatureCanonicalUnitId: "K" as const,
        tupleOrigin: available.tupleOrigin,
        providerExecutionClaim: available.providerExecutionClaim,
        providerSourceRef: available.providerSourceRef,
        providerReleaseId: available.providerReleaseId,
        providerImplementationId: available.providerImplementationId,
        propertySnapshotId: available.propertySnapshotId,
        sourceMethod: available.sourceMethod,
        sourceRef: available.sourceRef,
        dataQuality: available.dataQuality,
        provenanceId: available.provenanceId,
        binding: binding.value,
      }),
    });
  }

  const unknown = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "reason",
    "resolutionSourceRef",
    "pressureBasis",
    "tupleOrigin",
    "providerExecutionClaim",
    "providerSourceRef",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "binding",
  ]);
  if (unknown !== null) {
    const binding = readLocalBinding(unknown.binding);
    if (!binding.ok) return binding;
    if (
      unknown.kind !== "unknown_applicable" ||
      unknown.inputId !== "pabs+Tsat" ||
      !isNonBlankText(unknown.reason) ||
      !isStableIdentifier(unknown.resolutionSourceRef) ||
      (unknown.pressureBasis !== "absolute" &&
        unknown.pressureBasis !== "gauge" &&
        unknown.pressureBasis !== "unknown_or_unconfirmed") ||
      (unknown.tupleOrigin !== "external_precomputed_exact_pressure_tuple" &&
        unknown.tupleOrigin !== "h06_internal_property_provider_claim" &&
        unknown.tupleOrigin !== "unknown_or_unconfirmed") ||
      (unknown.providerExecutionClaim !== "not_executed_by_h06" &&
        unknown.providerExecutionClaim !== "executable_inside_h06" &&
        unknown.providerExecutionClaim !== "unknown_or_unconfirmed") ||
      !isStableIdentifier(unknown.providerSourceRef) ||
      unknown.sourceMethod !== "unknown_or_unconfirmed" ||
      !isStableIdentifier(unknown.sourceRef) ||
      unknown.dataQuality !== "unknown" ||
      !isStableIdentifier(unknown.provenanceId)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.saturation_evidence_schema_invalid",
          "The unresolved saturation tuple is not an exact unknown-applicable record.",
          "Use explicit unknown evidence with controlled basis enums, reason, resolution source and exact local binding; never add a placeholder value.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "unknown_applicable" as const,
        inputId: "pabs+Tsat" as const,
        reason: unknown.reason,
        resolutionSourceRef: unknown.resolutionSourceRef,
        pressureBasis: unknown.pressureBasis,
        tupleOrigin: unknown.tupleOrigin,
        providerExecutionClaim: unknown.providerExecutionClaim,
        providerSourceRef: unknown.providerSourceRef,
        sourceMethod: "unknown_or_unconfirmed" as const,
        sourceRef: unknown.sourceRef,
        dataQuality: "unknown" as const,
        provenanceId: unknown.provenanceId,
        binding: binding.value,
      }),
    });
  }

  return Object.freeze({
    ok: false,
    failure: failure(
      value === null || value === undefined ? "insufficient_data" : "invalid_input",
      "H-06.saturation_evidence_schema_invalid",
      "H-06 requires an exact available or unknown-applicable saturation tuple.",
      "Provide a source-bound Tsat-at-p_abs tuple or explicit unresolved evidence without numeric placeholders.",
    ),
  });
}

function isTemperatureSpatialBasis(
  value: unknown,
): value is H06TemperatureSpatialBasis {
  return (
    value === "local_bulk_at_declared_station" ||
    value === "local_inner_wall_at_declared_station" ||
    value === "circuit_outlet_bulk" ||
    value === "outlet_substituted_as_hotspot" ||
    value === "unknown_or_unconfirmed"
  );
}

function isTemperatureValueOrigin(
  value: unknown,
): value is H06TemperatureValueOrigin {
  return (
    value === "measurement_or_upstream_precomputed_local_value" ||
    value === "h06_derived_from_q_h_rf" ||
    value === "outlet_temperature_substitution" ||
    value === "unknown_or_unconfirmed"
  );
}

function readTemperatureEvidence(
  value: unknown,
  expectedInputId: H06TemperatureInputId,
): ReadResult<H06TemperatureEvidence> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "valueK",
    "dimensionId",
    "canonicalUnitId",
    "spatialBasis",
    "valueOrigin",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "binding",
  ]);
  if (available !== null) {
    const binding = readLocalBinding(available.binding);
    if (!binding.ok) return binding;
    if (
      available.kind !== "available" ||
      available.inputId !== expectedInputId ||
      available.dimensionId !== "absolute_temperature" ||
      available.canonicalUnitId !== "K" ||
      !isTemperatureSpatialBasis(available.spatialBasis) ||
      !isTemperatureValueOrigin(available.valueOrigin) ||
      !isAvailableSourceMethod(available.sourceMethod) ||
      !isStableIdentifier(available.sourceRef) ||
      !isDataQuality(available.dataQuality) ||
      available.dataQuality === "unknown" ||
      !isStableIdentifier(available.provenanceId)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.temperature_evidence_schema_invalid",
          expectedInputId + " is not exact canonical-SI local temperature evidence.",
          "Use the exact input ID, K unit, local spatial/value-origin enums and source-bound evidence.",
        ),
      });
    }
    if (
      typeof available.valueK !== "number" ||
      !Number.isFinite(available.valueK) ||
      available.valueK <= 0 ||
      !isNormalOrExactZero(available.valueK)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.temperature_value_invalid",
          expectedInputId + " must be a finite positive normal absolute temperature.",
          "Provide the exact local value in K; NaN, Infinity, nonpositive, subnormal and placeholder values are forbidden.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "available" as const,
        inputId: expectedInputId,
        valueK: available.valueK,
        dimensionId: "absolute_temperature" as const,
        canonicalUnitId: "K" as const,
        spatialBasis: available.spatialBasis,
        valueOrigin: available.valueOrigin,
        sourceMethod: available.sourceMethod,
        sourceRef: available.sourceRef,
        dataQuality: available.dataQuality,
        provenanceId: available.provenanceId,
        binding: binding.value,
      }),
    });
  }

  const unknown = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "reason",
    "resolutionSourceRef",
    "spatialBasis",
    "valueOrigin",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "binding",
  ]);
  if (unknown !== null) {
    const binding = readLocalBinding(unknown.binding);
    if (!binding.ok) return binding;
    if (
      unknown.kind !== "unknown_applicable" ||
      unknown.inputId !== expectedInputId ||
      !isNonBlankText(unknown.reason) ||
      !isStableIdentifier(unknown.resolutionSourceRef) ||
      !isTemperatureSpatialBasis(unknown.spatialBasis) ||
      !isTemperatureValueOrigin(unknown.valueOrigin) ||
      unknown.sourceMethod !== "unknown_or_unconfirmed" ||
      !isStableIdentifier(unknown.sourceRef) ||
      unknown.dataQuality !== "unknown" ||
      !isStableIdentifier(unknown.provenanceId)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.temperature_evidence_schema_invalid",
          expectedInputId + " unresolved evidence is malformed.",
          "Use explicit unknown-applicable evidence with no numeric value and an exact local binding.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "unknown_applicable" as const,
        inputId: expectedInputId,
        reason: unknown.reason,
        resolutionSourceRef: unknown.resolutionSourceRef,
        spatialBasis: unknown.spatialBasis,
        valueOrigin: unknown.valueOrigin,
        sourceMethod: "unknown_or_unconfirmed" as const,
        sourceRef: unknown.sourceRef,
        dataQuality: "unknown" as const,
        provenanceId: unknown.provenanceId,
        binding: binding.value,
      }),
    });
  }

  return Object.freeze({
    ok: false,
    failure: failure(
      value === null || value === undefined ? "insufficient_data" : "invalid_input",
      "H-06.temperature_evidence_schema_invalid",
      expectedInputId + " must be available local evidence or explicit unknown evidence.",
      "Provide a local source-bound K value or unknown_applicable without a zero/NaN placeholder.",
    ),
  });
}

function readNpshBinding(value: unknown): ReadResult<H06NpshBinding> {
  const record = readExactPlainDataRecord(value, [
    "pumpId",
    "coolantCircuitId",
    "flowRateM3PerS",
    "flowDimensionId",
    "flowCanonicalUnitId",
    "pumpSpeedRadPerS",
    "speedDimensionId",
    "speedCanonicalUnitId",
    "liquidIdentityId",
    "liquidStateSnapshotId",
    "npshDefinitionId",
    "suctionReferencePlaneId",
    "caseSnapshotId",
    "stateSnapshotId",
    "timeBasisId",
    "measurementWindowId",
    "operatingPointSnapshotId",
  ]);
  if (
    record === null ||
    !isStableIdentifier(record.pumpId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    typeof record.flowRateM3PerS !== "number" ||
    !Number.isFinite(record.flowRateM3PerS) ||
    record.flowRateM3PerS <= 0 ||
    !isNormalOrExactZero(record.flowRateM3PerS) ||
    record.flowDimensionId !== "volume_flow_rate" ||
    record.flowCanonicalUnitId !== "m3_per_s" ||
    typeof record.pumpSpeedRadPerS !== "number" ||
    !Number.isFinite(record.pumpSpeedRadPerS) ||
    record.pumpSpeedRadPerS <= 0 ||
    !isNormalOrExactZero(record.pumpSpeedRadPerS) ||
    record.speedDimensionId !== "angular_velocity" ||
    record.speedCanonicalUnitId !== "rad_per_s" ||
    !isStableIdentifier(record.liquidIdentityId) ||
    !isContentAddressedSnapshotId(
      record.liquidStateSnapshotId,
      "material",
    ) ||
    !isStableIdentifier(record.npshDefinitionId) ||
    !isStableIdentifier(record.suctionReferencePlaneId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.stateSnapshotId) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !isContentAddressedSnapshotId(
      record.operatingPointSnapshotId,
      "case",
    )
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-06.npsh_evidence_schema_invalid",
        "An NPSH record lacks the exact pump operating-point and reference-plane binding.",
        "Provide canonical flow/speed plus exact pump, liquid, definition, reference plane, case/state/time/window and content-addressed snapshots.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      pumpId: record.pumpId,
      coolantCircuitId: record.coolantCircuitId,
      flowRateM3PerS: record.flowRateM3PerS,
      flowDimensionId: "volume_flow_rate" as const,
      flowCanonicalUnitId: "m3_per_s" as const,
      pumpSpeedRadPerS: record.pumpSpeedRadPerS,
      speedDimensionId: "angular_velocity" as const,
      speedCanonicalUnitId: "rad_per_s" as const,
      liquidIdentityId: record.liquidIdentityId,
      liquidStateSnapshotId: record.liquidStateSnapshotId,
      npshDefinitionId: record.npshDefinitionId,
      suctionReferencePlaneId: record.suctionReferencePlaneId,
      caseSnapshotId: record.caseSnapshotId,
      stateSnapshotId: record.stateSnapshotId,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      operatingPointSnapshotId: record.operatingPointSnapshotId,
    }),
  });
}

function readNpsha(value: unknown): ReadResult<H06NpshaEvidence> {
  const record = readExactPlainDataRecord(value, [
    "inputId",
    "valueM",
    "dimensionId",
    "canonicalUnitId",
    "precomputationBasis",
    "pressureBasis",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "binding",
  ]);
  const binding = record === null ? null : readNpshBinding(record.binding);
  if (
    record === null ||
    binding === null ||
    !binding.ok ||
    record.inputId !== "NPSHA" ||
    record.dimensionId !== "length" ||
    record.canonicalUnitId !== "m" ||
    (record.precomputationBasis !==
      "upstream_complete_bernoulli_at_declared_reference_plane" &&
      record.precomputationBasis !== "partial_or_missing_bernoulli_terms" &&
      record.precomputationBasis !== "unknown_or_unconfirmed") ||
    (record.pressureBasis !== "absolute" &&
      record.pressureBasis !== "gauge" &&
      record.pressureBasis !== "unknown_or_unconfirmed") ||
    (record.sourceMethod !== "measurement_bound_precomputed" &&
      record.sourceMethod !== "h06_partial_bernoulli_attempt" &&
      record.sourceMethod !== "unknown_or_unconfirmed") ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId)
  ) {
    return Object.freeze({
      ok: false,
      failure:
        binding !== null && !binding.ok
          ? binding.failure
          : failure(
              "invalid_input",
              "H-06.npsh_evidence_schema_invalid",
              "NPSHA is not an exact canonical precomputed evidence record.",
              "Provide a complete upstream measurement-bound NPSHA record at one declared suction reference plane.",
            ),
    });
  }
  if (
    typeof record.valueM !== "number" ||
    !Number.isFinite(record.valueM) ||
    Object.is(record.valueM, -0) ||
    !isNormalOrExactZero(record.valueM)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-06.npsh_value_invalid",
        "NPSHA must be a finite normal signed head or exact positive zero in m.",
        "Resolve the upstream value without NaN, Infinity, negative zero, subnormal or placeholder values.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      inputId: "NPSHA" as const,
      valueM: record.valueM,
      dimensionId: "length" as const,
      canonicalUnitId: "m" as const,
      precomputationBasis: record.precomputationBasis,
      pressureBasis: record.pressureBasis,
      sourceMethod: record.sourceMethod,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  });
}

function readNpshr(value: unknown): ReadResult<H06NpshrEvidence> {
  const record = readExactPlainDataRecord(value, [
    "inputId",
    "valueM",
    "dimensionId",
    "canonicalUnitId",
    "curveBasis",
    "sourceMethod",
    "oemDocumentRef",
    "oemCurveSnapshotId",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "binding",
  ]);
  const binding = record === null ? null : readNpshBinding(record.binding);
  if (
    record === null ||
    binding === null ||
    !binding.ok ||
    record.inputId !== "NPSHR" ||
    record.dimensionId !== "length" ||
    record.canonicalUnitId !== "m" ||
    (record.curveBasis !==
      "oem_curve_at_exact_flow_speed_liquid_definition" &&
      record.curveBasis !== "non_oem_or_unmatched_curve" &&
      record.curveBasis !== "unknown_or_unconfirmed") ||
    (record.sourceMethod !== "oem_pump_curve" &&
      record.sourceMethod !== "generic_or_non_oem_curve" &&
      record.sourceMethod !== "unknown_or_unconfirmed") ||
    !isStableIdentifier(record.oemDocumentRef) ||
    !isContentAddressedSnapshotId(record.oemCurveSnapshotId) ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId)
  ) {
    return Object.freeze({
      ok: false,
      failure:
        binding !== null && !binding.ok
          ? binding.failure
          : failure(
              "invalid_input",
              "H-06.npsh_evidence_schema_invalid",
              "NPSHR is not an exact OEM curve evidence record.",
              "Provide source-bound OEM NPSHR matched to the exact pump, flow, speed, liquid, definition and reference plane.",
            ),
    });
  }
  if (
    typeof record.valueM !== "number" ||
    !Number.isFinite(record.valueM) ||
    record.valueM < 0 ||
    Object.is(record.valueM, -0) ||
    !isNormalOrExactZero(record.valueM)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-06.npsh_value_invalid",
        "OEM NPSHR must be a finite non-negative normal head or exact positive zero in m.",
        "Use the exact OEM curve value without NaN, Infinity, negative, signed-zero, subnormal or placeholder values.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      inputId: "NPSHR" as const,
      valueM: record.valueM,
      dimensionId: "length" as const,
      canonicalUnitId: "m" as const,
      curveBasis: record.curveBasis,
      sourceMethod: record.sourceMethod,
      oemDocumentRef: record.oemDocumentRef,
      oemCurveSnapshotId: record.oemCurveSnapshotId,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  });
}

function readNpshComparison(
  value: unknown,
): ReadResult<H06NpshComparisonEvidence> {
  const available = readExactPlainDataRecord(value, ["kind", "npsha", "npshr"]);
  if (available !== null) {
    if (available.kind !== "available") {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-06.npsh_evidence_schema_invalid",
          "NPSH available evidence has an invalid discriminator.",
          "Use kind available only with exact NPSHA and NPSHR child records.",
        ),
      });
    }
    const npsha = readNpsha(available.npsha);
    const npshr = readNpshr(available.npshr);
    if (!npsha.ok) return npsha;
    if (!npshr.ok) return npshr;
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "available" as const,
        npsha: npsha.value,
        npshr: npshr.value,
      }),
    });
  }
  const unavailable = readExactPlainDataRecord(value, [
    "kind",
    "reason",
    "resolutionSourceRef",
  ]);
  if (
    unavailable !== null &&
    (unavailable.kind === "source_confirmed_not_applicable" ||
      unavailable.kind === "unknown_applicable") &&
    isNonBlankText(unavailable.reason) &&
    isStableIdentifier(unavailable.resolutionSourceRef)
  ) {
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: unavailable.kind,
        reason: unavailable.reason,
        resolutionSourceRef: unavailable.resolutionSourceRef,
      }),
    });
  }
  return Object.freeze({
    ok: false,
    failure: failure(
      value === null || value === undefined ? "insufficient_data" : "invalid_input",
      "H-06.npsh_evidence_schema_invalid",
      "NPSH comparison must be an exact available, source-confirmed N/A, or unknown record.",
      "Provide a complete precomputed pair or explicit no-value evidence; do not supply partial Bernoulli terms or placeholders.",
    ),
  });
}

function isDataGateSourceMethod(
  value: unknown,
): value is H06DataGateCommon["sourceMethod"] {
  return (
    value === "measurement" ||
    value === "oem_document" ||
    value === "project_specification" ||
    value === "unknown_or_unconfirmed"
  );
}

function readDataGate(
  value: unknown,
  expectedGateId: H06DataGateId,
): ReadResult<H06DataGateEvidence> {
  const commonKeys = [
    "kind",
    "gateId",
    "scopeEntityId",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "coolantCircuitId",
    "caseSnapshotId",
    "stateSnapshotId",
    "timeBasisId",
  ] as const;
  const available = readExactPlainDataRecord(value, commonKeys);
  const unavailable = readExactPlainDataRecord(value, [
    ...commonKeys,
    "reason",
    "resolutionSourceRef",
  ]);
  const record = available ?? unavailable;
  if (
    record === null ||
    record.gateId !== expectedGateId ||
    !isStableIdentifier(record.scopeEntityId) ||
    !isDataGateSourceMethod(record.sourceMethod) ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.stateSnapshotId) ||
    !isStableIdentifier(record.timeBasisId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        value === null || value === undefined ? "insufficient_data" : "invalid_input",
        "H-06.data_gate_schema_invalid",
        expectedGateId + " does not use the exact tri-state source-evidence schema.",
        "Provide available, source_confirmed_not_applicable, or unknown_applicable evidence with stable provenance and no numeric placeholder.",
      ),
    });
  }
  if (
    record.kind === "available" &&
    available !== null &&
    record.sourceMethod !== "unknown_or_unconfirmed" &&
    record.dataQuality !== "unknown"
  ) {
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "available" as const,
        gateId: expectedGateId,
        scopeEntityId: record.scopeEntityId,
        sourceMethod: record.sourceMethod,
        sourceRef: record.sourceRef,
        dataQuality: record.dataQuality,
        provenanceId: record.provenanceId,
        sourceSnapshotId: record.sourceSnapshotId,
        coolantCircuitId: record.coolantCircuitId,
        caseSnapshotId: record.caseSnapshotId,
        stateSnapshotId: record.stateSnapshotId,
        timeBasisId: record.timeBasisId,
      }),
    });
  }
  if (
    unavailable !== null &&
    (record.kind === "source_confirmed_not_applicable" ||
      record.kind === "unknown_applicable") &&
    isNonBlankText(record.reason) &&
    isStableIdentifier(record.resolutionSourceRef) &&
    ((record.kind === "source_confirmed_not_applicable" &&
      record.sourceMethod !== "unknown_or_unconfirmed" &&
      record.dataQuality !== "unknown") ||
      (record.kind === "unknown_applicable" &&
        record.sourceMethod === "unknown_or_unconfirmed" &&
        record.dataQuality === "unknown"))
  ) {
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: record.kind,
        gateId: expectedGateId,
        scopeEntityId: record.scopeEntityId,
        reason: record.reason,
        resolutionSourceRef: record.resolutionSourceRef,
        sourceMethod: record.sourceMethod,
        sourceRef: record.sourceRef,
        dataQuality: record.dataQuality,
        provenanceId: record.provenanceId,
        sourceSnapshotId: record.sourceSnapshotId,
        coolantCircuitId: record.coolantCircuitId,
        caseSnapshotId: record.caseSnapshotId,
        stateSnapshotId: record.stateSnapshotId,
        timeBasisId: record.timeBasisId,
      }) as H06DataGateEvidence,
    });
  }
  return Object.freeze({
    ok: false,
    failure: failure(
      "invalid_input",
      "H-06.data_gate_schema_invalid",
      expectedGateId + " has contradictory kind, source method or data quality.",
      "Available/N/A evidence requires a known source; unknown evidence requires unknown source and data quality.",
    ),
  });
}

function sameLocalBinding(
  left: H06LocalStateBinding,
  right: H06LocalStateBinding,
): boolean {
  return (
    left.coolantCircuitId === right.coolantCircuitId &&
    left.branchId === right.branchId &&
    left.localStationId === right.localStationId &&
    left.localReferencePlaneId === right.localReferencePlaneId &&
    left.caseSnapshotId === right.caseSnapshotId &&
    left.stateSnapshotId === right.stateSnapshotId &&
    left.fluidStateSnapshotId === right.fluidStateSnapshotId &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.fluidIdentityId === right.fluidIdentityId &&
    left.fluidClass === right.fluidClass &&
    left.sourceSnapshotId === right.sourceSnapshotId
  );
}

function sameNpshBinding(left: H06NpshBinding, right: H06NpshBinding): boolean {
  return (
    left.pumpId === right.pumpId &&
    left.coolantCircuitId === right.coolantCircuitId &&
    Object.is(left.flowRateM3PerS, right.flowRateM3PerS) &&
    left.flowDimensionId === right.flowDimensionId &&
    left.flowCanonicalUnitId === right.flowCanonicalUnitId &&
    Object.is(left.pumpSpeedRadPerS, right.pumpSpeedRadPerS) &&
    left.speedDimensionId === right.speedDimensionId &&
    left.speedCanonicalUnitId === right.speedCanonicalUnitId &&
    left.liquidIdentityId === right.liquidIdentityId &&
    left.liquidStateSnapshotId === right.liquidStateSnapshotId &&
    left.npshDefinitionId === right.npshDefinitionId &&
    left.suctionReferencePlaneId === right.suctionReferencePlaneId &&
    left.caseSnapshotId === right.caseSnapshotId &&
    left.stateSnapshotId === right.stateSnapshotId &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.operatingPointSnapshotId === right.operatingPointSnapshotId
  );
}

function dataGateMatchesLocal(
  gate: H06DataGateEvidence,
  local: H06LocalStateBinding,
): boolean {
  return (
    gate.coolantCircuitId === local.coolantCircuitId &&
    gate.caseSnapshotId === local.caseSnapshotId &&
    gate.stateSnapshotId === local.stateSnapshotId &&
    gate.timeBasisId === local.timeBasisId
  );
}

function npshMatchesLocal(
  binding: H06NpshBinding,
  local: H06LocalStateBinding,
): boolean {
  return (
    binding.coolantCircuitId === local.coolantCircuitId &&
    binding.caseSnapshotId === local.caseSnapshotId &&
    binding.stateSnapshotId === local.stateSnapshotId &&
    binding.timeBasisId === local.timeBasisId &&
    binding.measurementWindowId === local.measurementWindowId &&
    binding.liquidIdentityId === local.fluidIdentityId &&
    binding.liquidStateSnapshotId === local.fluidStateSnapshotId
  );
}

type SubtractionResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H06LocalPhaseAndNpshGatesFailure;
    }>;

function guardedSubtract(
  minuend: number,
  subtrahend: number,
  label: string,
): SubtractionResult {
  const result = minuend - subtrahend;
  const overflow = !Number.isFinite(result);
  const falseZero = result === 0 && minuend !== subtrahend;
  const subnormal = result !== 0 && Math.abs(result) < H06_BINARY64_MIN_NORMAL;
  const subtrahendSwallowed =
    subtrahend !== 0 && Object.is(result, minuend);
  const minuendSwallowed =
    minuend !== 0 && Object.is(result, -subtrahend);
  if (
    overflow ||
    falseZero ||
    subnormal ||
    subtrahendSwallowed ||
    minuendSwallowed
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-06.numeric_resolution_invalid",
        label + " is not auditable in IEEE-754 binary64 without overflow, underflow, false zero or a swallowed operand.",
        "Rescale only outside H-06 with controlled provenance or provide higher-resolution source evidence; H-06 will not round, flush or hide an operand.",
      ),
    });
  }
  return Object.freeze({ ok: true, value: result });
}

function availableOutput(
  outputId: H06OutputId,
  valueSi: number,
  dimensionId: H06AvailableRawScreeningOutput["dimensionId"],
  canonicalUnitId: H06AvailableRawScreeningOutput["canonicalUnitId"],
): H06AvailableRawScreeningOutput {
  return Object.freeze({
    kind: "available",
    outputId,
    status: "screening_only",
    valueSi,
    dimensionId,
    canonicalUnitId,
    interpretation: "signed_raw_margin_not_a_safety_conclusion",
    safetyConclusion: "not_evaluated",
  });
}

function unavailableOutput(
  outputId: H06OutputId,
  status: H06UnavailableRawScreeningOutput["status"],
  reason: string,
  unresolvedItemIds: readonly string[],
): H06UnavailableRawScreeningOutput {
  return Object.freeze({
    kind: "unavailable",
    outputId,
    status,
    reason,
    unresolvedItemIds: Object.freeze([...unresolvedItemIds]),
  });
}

function trace(
  outputId: H06OutputId,
  equation: H06CalculationTrace["equation"],
  inputIds: readonly string[],
  inputValues: readonly number[],
  resultSi: number | null,
): H06CalculationTrace {
  return Object.freeze({
    outputId,
    equation,
    orderedInputIds: Object.freeze([...inputIds]),
    orderedInputValues: Object.freeze([...inputValues]),
    resultSi,
    publicationStatus: resultSi === null ? "unavailable" : "screening_only",
    safetyDecisionPerformed: false,
  });
}

function missingItem(
  itemId: string,
  category: H06MissingDataItem["category"],
  reason: string,
  affectedOutputs: readonly H06OutputId[],
): H06MissingDataItem {
  return Object.freeze({
    itemId,
    category,
    reason,
    affectedOutputs: Object.freeze([...affectedOutputs]),
  });
}

function dataGateSummary(gate: H06DataGateEvidence): H06DataGateSummary {
  return Object.freeze({
    gateId: gate.gateId,
    disposition:
      gate.kind === "available"
        ? "evidence_present_not_safety_evaluated"
        : gate.kind === "source_confirmed_not_applicable"
          ? "source_confirmed_not_applicable"
          : "unknown_missing_data",
    scopeEntityId: gate.scopeEntityId,
    sourceRef: gate.sourceRef,
    sourceSnapshotId: gate.sourceSnapshotId,
    reason: gate.kind === "available" ? null : gate.reason,
  });
}

export function evaluateH06LocalPhaseAndNpshGates(
  input: unknown,
): H06LocalPhaseAndNpshGatesOutcome {
  const top = readExactPlainDataRecord(input, [
    "requestedInterpretation",
    "saturationTuple",
    "bulkTemperature",
    "innerWallTemperature",
    "npshComparison",
    "waterQualityEvidence",
    "oemSafetyThresholdEvidence",
    "pumpEvidence",
  ]);
  if (top === null) {
    return failure(
      "invalid_input",
      "H-06.input_schema_invalid",
      "H-06 input must be one exact plain-data record.",
      "Remove extra/symbol/accessor fields and provide every controlled H-06 evidence branch.",
    );
  }
  if (
    top.requestedInterpretation !== "raw_screening_only" &&
    top.requestedInterpretation !== "safety_or_no_boiling_claim" &&
    top.requestedInterpretation !== "unknown_or_unconfirmed"
  ) {
    return failure(
      "invalid_input",
      "H-06.requested_interpretation_invalid",
      "The requested H-06 interpretation is not a frozen enum value.",
      "Request raw_screening_only, explicitly request the unsupported safety claim, or mark the request unknown.",
    );
  }

  /* Parse every branch before applicability decisions so schema/enum failures
   * have stable priority over known exclusions or unresolved evidence. */
  const saturationResult = readSaturationTuple(top.saturationTuple);
  const bulkResult = readTemperatureEvidence(top.bulkTemperature, "Tb");
  const wallResult = readTemperatureEvidence(top.innerWallTemperature, "Twi");
  const npshResult = readNpshComparison(top.npshComparison);
  const waterQualityResult = readDataGate(
    top.waterQualityEvidence,
    "water_quality",
  );
  const oemResult = readDataGate(
    top.oemSafetyThresholdEvidence,
    "oem_safety_thresholds",
  );
  const pumpResult = readDataGate(
    top.pumpEvidence,
    "pump_operating_evidence",
  );
  if (!saturationResult.ok) return saturationResult.failure;
  if (!bulkResult.ok) return bulkResult.failure;
  if (!wallResult.ok) return wallResult.failure;
  if (!npshResult.ok) return npshResult.failure;
  if (!waterQualityResult.ok) return waterQualityResult.failure;
  if (!oemResult.ok) return oemResult.failure;
  if (!pumpResult.ok) return pumpResult.failure;

  const saturation = saturationResult.value;
  const bulk = bulkResult.value;
  const wall = wallResult.value;
  const npsh = npshResult.value;
  const waterQuality = waterQualityResult.value;
  const oem = oemResult.value;
  const pump = pumpResult.value;
  const local = saturation.binding;

  if (top.requestedInterpretation === "safety_or_no_boiling_claim") {
    return failure(
      "not_applicable",
      "H-06.unsafe_claim_not_applicable",
      "The caller requests a safety/no-boiling conclusion that the frozen H-06 evidence cannot support.",
      "Use raw_screening_only and obtain source-bound OEM/project thresholds, a pinned IAPWS provider and the required local validation before any safety decision.",
    );
  }

  if (
    local.fluidClass === "other_liquid_or_mixture" ||
    bulk.binding.fluidClass === "other_liquid_or_mixture" ||
    wall.binding.fluidClass === "other_liquid_or_mixture"
  ) {
    return failure(
      "not_applicable",
      "H-06.fluid_not_applicable",
      "The local saturation route is explicitly bound to a non-ordinary-water liquid or mixture.",
      "Use a separately approved property/saturation method for that fluid; do not apply the IAPWS-water route.",
    );
  }
  if (saturation.pressureBasis === "gauge") {
    return failure(
      "not_applicable",
      "H-06.gauge_pressure_not_applicable",
      "The saturation tuple uses gauge pressure instead of exact absolute pressure.",
      "Convert pressure at the data boundary with provenance and regenerate the exact Tsat-at-p_abs tuple.",
    );
  }
  if (
    saturation.tupleOrigin === "h06_internal_property_provider_claim" ||
    saturation.providerExecutionClaim === "executable_inside_h06"
  ) {
    return failure(
      "not_applicable",
      "H-06.unpinned_provider_execution_not_applicable",
      "The input claims an executable H-06/IAPWS provider while the local release/provider gate is frozen blocked.",
      "Provide an external precomputed exact tuple and retain the blocked provider status; do not execute or emulate Region 4 inside H-06.",
    );
  }
  if (
    saturation.providerSourceRef !== "IAPWS-IF97:REGION4" &&
    saturation.providerSourceRef !== "unknown_or_unconfirmed"
  ) {
    return failure(
      "not_applicable",
      "H-06.saturation_source_not_applicable",
      "The saturation tuple is bound to a property source outside the frozen H-06 source route.",
      "Use a versioned external IAPWS-IF97 Region 4 tuple or keep the route explicitly unresolved.",
    );
  }
  if (
    bulk.spatialBasis === "circuit_outlet_bulk" ||
    bulk.spatialBasis === "outlet_substituted_as_hotspot" ||
    bulk.valueOrigin === "outlet_temperature_substitution" ||
    wall.spatialBasis === "circuit_outlet_bulk" ||
    wall.spatialBasis === "outlet_substituted_as_hotspot" ||
    wall.valueOrigin === "outlet_temperature_substitution"
  ) {
    return failure(
      "not_applicable",
      "H-06.outlet_as_hotspot_not_applicable",
      "Circuit outlet temperature is offered as a local station/hotspot value.",
      "Provide local bulk and local inner-wall evidence at the exact declared station; never substitute outlet temperature for a hotspot.",
    );
  }
  if (
    bulk.valueOrigin === "h06_derived_from_q_h_rf" ||
    wall.valueOrigin === "h06_derived_from_q_h_rf"
  ) {
    return failure(
      "not_applicable",
      "H-06.wall_derivation_not_applicable",
      "The input asks H-06 to derive a local temperature from q, h or fouling resistance.",
      "Supply measured/upstream-precomputed local Tb/Twi evidence; this isolated partial method does not derive Twi or a hotspot.",
    );
  }
  if (
    (bulk.spatialBasis !== "unknown_or_unconfirmed" &&
      bulk.spatialBasis !== "local_bulk_at_declared_station") ||
    (wall.spatialBasis !== "unknown_or_unconfirmed" &&
      wall.spatialBasis !== "local_inner_wall_at_declared_station") ||
    !sameLocalBinding(local, bulk.binding) ||
    !sameLocalBinding(local, wall.binding)
  ) {
    return failure(
      "not_applicable",
      "H-06.local_state_binding_mismatch",
      "Tsat, p_abs, Tb and Twi do not share one exact station/branch/circuit/case/fluid-state/time/source snapshot.",
      "Regenerate every local item from the exact same state and reference plane; do not compare nearby or differently sourced snapshots.",
    );
  }
  if (
    !dataGateMatchesLocal(waterQuality, local) ||
    !dataGateMatchesLocal(oem, local) ||
    !dataGateMatchesLocal(pump, local)
  ) {
    return failure(
      "not_applicable",
      "H-06.data_gate_binding_mismatch",
      "A water-quality/OEM/pump evidence gate is bound to a different circuit, case, state or time basis.",
      "Bind all gate evidence to the same H-06 circuit and state snapshot before reporting it.",
    );
  }

  if (npsh.kind === "available") {
    const left = npsh.npsha;
    const right = npsh.npshr;
    if (
      left.precomputationBasis === "partial_or_missing_bernoulli_terms" ||
      left.sourceMethod === "h06_partial_bernoulli_attempt" ||
      left.pressureBasis === "gauge" ||
      right.curveBasis === "non_oem_or_unmatched_curve" ||
      right.sourceMethod === "generic_or_non_oem_curve"
    ) {
      return failure(
        "not_applicable",
        "H-06.npsh_basis_not_applicable",
        "NPSHA is partial/gauge-based or NPSHR is not exact OEM operating-point evidence.",
        "Precompute complete NPSHA upstream and provide OEM NPSHR at the exact same pump, flow, speed, liquid, definition and reference plane.",
      );
    }
    if (
      left.binding.npshDefinitionId !==
        "head_of_pumped_liquid_at_suction_reference_plane" ||
      right.binding.npshDefinitionId !==
        "head_of_pumped_liquid_at_suction_reference_plane" ||
      !sameNpshBinding(left.binding, right.binding) ||
      !npshMatchesLocal(left.binding, local)
    ) {
      return failure(
        "not_applicable",
        "H-06.npsh_binding_mismatch",
        "NPSHA and NPSHR do not share the exact pump/flow/speed/liquid/definition/reference-plane/case/state/time operating point.",
        "Resolve both values onto one explicit suction-plane operating-point snapshot without definition conversion inside H-06.",
      );
    }
    if (
      pump.kind !== "available" ||
      pump.scopeEntityId !== left.binding.pumpId
    ) {
      return failure(
        "not_applicable",
        "H-06.pump_evidence_contradiction",
        "A numeric NPSH pair is supplied without matching available pump operating evidence.",
        "Provide the matching pump evidence gate or keep the NPSH route explicitly unresolved/not applicable without numeric values.",
      );
    }
  } else if (
    (npsh.kind === "source_confirmed_not_applicable") !==
    (pump.kind === "source_confirmed_not_applicable")
  ) {
    return failure(
      "invalid_input",
      "H-06.pump_evidence_contradiction",
      "The pump gate and NPSH route disagree on source-confirmed applicability.",
      "Use matching source-confirmed N/A records when no pump route exists, or keep both routes available/unknown consistently.",
    );
  }

  const saturationReady =
    saturation.kind === "available" &&
    local.fluidClass === "ordinary_water" &&
    saturation.pressureBasis === "absolute" &&
    saturation.tupleOrigin === "external_precomputed_exact_pressure_tuple" &&
    saturation.providerExecutionClaim === "not_executed_by_h06" &&
    saturation.providerSourceRef === "IAPWS-IF97:REGION4";
  const bulkReady =
    bulk.kind === "available" &&
    bulk.spatialBasis === "local_bulk_at_declared_station" &&
    bulk.valueOrigin === "measurement_or_upstream_precomputed_local_value";
  const wallReady =
    wall.kind === "available" &&
    wall.spatialBasis === "local_inner_wall_at_declared_station" &&
    wall.valueOrigin === "measurement_or_upstream_precomputed_local_value";

  /* This is an applicability comparison, not diagnostic subtraction. It must
   * precede unknown-interpretation handling and every guarded arithmetic path
   * so a known non-single-phase wall state cannot be masked by unrelated
   * binary64 loss of significance (for example in the bulk-margin route). */
  if (
    saturationReady &&
    wallReady &&
    wall.valueK >= saturation.saturationTemperatureK
  ) {
    return failure(
      "not_applicable",
      "H-06.single_phase_model_not_applicable",
      "The local inner-wall temperature is at or above the externally supplied saturation temperature, so the frozen single-phase model is not applicable.",
      "Stop the single-phase route and obtain an approved local two-phase/boiling assessment; H-06 does not label the condition safe or tune the input.",
    );
  }

  if (top.requestedInterpretation === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "H-06.requested_interpretation_unknown",
      "The caller has not confirmed that only raw screening output is requested.",
      "Confirm raw_screening_only before publishing any signed margin.",
    );
  }

  const missing: H06MissingDataItem[] = [];
  let bulkOutput: H06RawScreeningOutput;
  let bulkTrace: H06CalculationTrace;

  if (!saturationReady || !bulkReady) {
    const unresolvedIds: string[] = [];
    if (!saturationReady) {
      unresolvedIds.push("pabs+Tsat");
      missing.push(
        missingItem(
          "pabs+Tsat",
          "local_saturation_tuple",
          saturation.kind === "unknown_applicable"
            ? saturation.reason
            : local.fluidClass === "unknown_or_unconfirmed"
              ? "The local fluid class is unknown or unconfirmed."
              : "Saturation tuple basis/source remains unknown or unconfirmed.",
          ["DeltaT_sub_bulk", "DeltaT_sub_wall"],
        ),
      );
    }
    if (!bulkReady) {
      unresolvedIds.push("Tb");
      missing.push(
        missingItem(
          "Tb",
          "local_temperature",
          bulk.kind === "unknown_applicable"
            ? bulk.reason
            : "Local bulk spatial basis or value origin remains unknown or unconfirmed.",
          ["DeltaT_sub_bulk"],
        ),
      );
    }
    bulkOutput = unavailableOutput(
      "DeltaT_sub_bulk",
      "insufficient_data",
      "Raw bulk saturation margin requires exact Tsat-at-p_abs and local Tb evidence.",
      unresolvedIds,
    );
    bulkTrace = trace(
      "DeltaT_sub_bulk",
      "DeltaT_sub_bulk = Tsat(p_abs) - T_bulk",
      [],
      [],
      null,
    );
  } else {
    const difference = guardedSubtract(
      saturation.saturationTemperatureK,
      bulk.valueK,
      "Tsat(p_abs) - T_bulk",
    );
    if (!difference.ok) return difference.failure;
    bulkOutput = availableOutput(
      "DeltaT_sub_bulk",
      difference.value,
      "temperature_difference",
      "K",
    );
    bulkTrace = trace(
      "DeltaT_sub_bulk",
      "DeltaT_sub_bulk = Tsat(p_abs) - T_bulk",
      ["Tsat", "Tb"],
      [saturation.saturationTemperatureK, bulk.valueK],
      difference.value,
    );
  }

  let wallOutput: H06RawScreeningOutput;
  let wallTrace: H06CalculationTrace;
  if (!saturationReady || !wallReady) {
    const unresolvedIds: string[] = [];
    if (!saturationReady) unresolvedIds.push("pabs+Tsat");
    if (!wallReady) {
      unresolvedIds.push("Twi");
      missing.push(
        missingItem(
          "Twi",
          "local_temperature",
          wall.kind === "unknown_applicable"
            ? wall.reason
            : "Local inner-wall spatial basis or value origin remains unknown or unconfirmed.",
          ["DeltaT_sub_wall"],
        ),
      );
    }
    wallOutput = unavailableOutput(
      "DeltaT_sub_wall",
      "insufficient_data",
      "Raw wall saturation margin requires exact Tsat-at-p_abs and local Twi evidence; H-06 does not derive Twi.",
      unresolvedIds,
    );
    wallTrace = trace(
      "DeltaT_sub_wall",
      "DeltaT_sub_wall = Tsat(p_abs) - T_wall_inner",
      [],
      [],
      null,
    );
  } else {
    const difference = guardedSubtract(
      saturation.saturationTemperatureK,
      wall.valueK,
      "Tsat(p_abs) - T_wall_inner",
    );
    if (!difference.ok) return difference.failure;
    if (difference.value <= 0) {
      return failure(
        "not_applicable",
        "H-06.single_phase_model_not_applicable",
        "The signed local wall saturation difference is nonpositive, so the frozen single-phase model is not applicable.",
        "Stop the single-phase route and obtain an approved local two-phase/boiling assessment; H-06 does not label the condition safe or tune the input.",
      );
    }
    wallOutput = availableOutput(
      "DeltaT_sub_wall",
      difference.value,
      "temperature_difference",
      "K",
    );
    wallTrace = trace(
      "DeltaT_sub_wall",
      "DeltaT_sub_wall = Tsat(p_abs) - T_wall_inner",
      ["Tsat", "Twi"],
      [saturation.saturationTemperatureK, wall.valueK],
      difference.value,
    );
  }

  let npshOutput: H06RawScreeningOutput;
  let npshTrace: H06CalculationTrace;
  if (npsh.kind === "available") {
    const semanticsUnknown =
      npsh.npsha.precomputationBasis === "unknown_or_unconfirmed" ||
      npsh.npsha.pressureBasis === "unknown_or_unconfirmed" ||
      npsh.npsha.sourceMethod === "unknown_or_unconfirmed" ||
      npsh.npsha.dataQuality === "unknown" ||
      npsh.npshr.curveBasis === "unknown_or_unconfirmed" ||
      npsh.npshr.sourceMethod === "unknown_or_unconfirmed" ||
      npsh.npshr.dataQuality === "unknown";
    if (semanticsUnknown) {
      missing.push(
        missingItem(
          "NPSHA/NPSHR",
          "npsh_pair",
          "NPSH source/definition completeness remains unknown.",
          ["NPSH_raw_difference"],
        ),
      );
      npshOutput = unavailableOutput(
        "NPSH_raw_difference",
        "insufficient_data",
        "NPSHA/NPSHR semantic completeness is unconfirmed.",
        ["NPSHA/NPSHR"],
      );
      npshTrace = trace(
        "NPSH_raw_difference",
        "NPSH_raw_difference = NPSHA - NPSHR",
        [],
        [],
        null,
      );
    } else {
      const difference = guardedSubtract(
        npsh.npsha.valueM,
        npsh.npshr.valueM,
        "NPSHA - NPSHR",
      );
      if (!difference.ok) return difference.failure;
      npshOutput = availableOutput(
        "NPSH_raw_difference",
        difference.value,
        "length",
        "m",
      );
      npshTrace = trace(
        "NPSH_raw_difference",
        "NPSH_raw_difference = NPSHA - NPSHR",
        ["NPSHA", "NPSHR"],
        [npsh.npsha.valueM, npsh.npshr.valueM],
        difference.value,
      );
    }
  } else {
    const status =
      npsh.kind === "source_confirmed_not_applicable"
        ? "source_confirmed_not_applicable"
        : "insufficient_data";
    if (npsh.kind === "unknown_applicable") {
      missing.push(
        missingItem("NPSHA/NPSHR", "npsh_pair", npsh.reason, [
          "NPSH_raw_difference",
        ]),
      );
    }
    npshOutput = unavailableOutput(
      "NPSH_raw_difference",
      status,
      npsh.reason,
      npsh.kind === "unknown_applicable" ? ["NPSHA/NPSHR"] : [],
    );
    npshTrace = trace(
      "NPSH_raw_difference",
      "NPSH_raw_difference = NPSHA - NPSHR",
      [],
      [],
      null,
    );
  }

  for (const gate of [waterQuality, oem, pump]) {
    if (gate.kind !== "unknown_applicable") continue;
    missing.push(
      missingItem(
        gate.gateId,
        gate.gateId,
        gate.reason,
        gate.gateId === "pump_operating_evidence"
          ? ["NPSH_raw_difference"]
          : [],
      ),
    );
  }

  const dataGates = Object.freeze([
    dataGateSummary(waterQuality),
    dataGateSummary(oem),
    dataGateSummary(pump),
  ]);
  const npshOperatingPointSnapshotId =
    npsh.kind === "available"
      ? npsh.npsha.binding.operatingPointSnapshotId
      : null;
  return Object.freeze({
    methodId: H06_METHOD_ID,
    methodVersion: H06_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    calculationStatus: "partial",
    applicabilityStatus: "in_domain_raw_screening_only",
    warningIds: EMPTY,
    warnings: EMPTY,
    value: Object.freeze({
      bulkSaturationMargin: bulkOutput,
      wallSaturationMargin: wallOutput,
      npshRawDifference: npshOutput,
      missingData: Object.freeze(missing),
      dataGates,
      openReleaseGates: Object.freeze([
        "IAPWS-IF97:REGION4 local versioned source/provider pin",
        "HI-961 local edition pin",
        "source-bound OEM/project safety thresholds",
      ] as const),
      safetyConclusion: "not_evaluated",
    }),
    calculationTrace: Object.freeze([bulkTrace, wallTrace, npshTrace]),
    inputSnapshot: Object.freeze({
      coolantCircuitId: local.coolantCircuitId,
      branchId: local.branchId,
      localStationId: local.localStationId,
      localReferencePlaneId: local.localReferencePlaneId,
      caseSnapshotId: local.caseSnapshotId,
      stateSnapshotId: local.stateSnapshotId,
      fluidStateSnapshotId: local.fluidStateSnapshotId,
      timeBasisId: local.timeBasisId,
      measurementWindowId: local.measurementWindowId,
      localSourceSnapshotId: local.sourceSnapshotId,
      npshOperatingPointSnapshotId,
    }),
    evidence: Object.freeze({
      saturationTuple: saturation,
      bulkTemperature: bulk,
      innerWallTemperature: wall,
      npshComparison: npsh,
      dataGates: Object.freeze([waterQuality, oem, pump]),
    }),
    sourceReadiness: H06_SOURCE_READINESS,
    mapping: H06_METHOD_MAPPING,
    numericPolicy: H06_NUMERIC_POLICY,
    sourceRefs: H06_SOURCE_REFS,
    contractSourceRefs: H06_CONTRACT_SOURCE_REFS,
    derivationRefs: H06_DERIVATION_REFS,
    validationCaseIds: H06_VALIDATION_CASE_IDS,
    methodCheckIds: H06_METHOD_CHECK_IDS,
    assumptions: Object.freeze([
      "Tsat is an external precomputed exact absolute-pressure tuple and H-06 does not execute A-02 or IAPWS",
      "bulk and wall temperatures are local values at the declared station; outlet temperature is never substituted",
      "NPSHA is already complete at the declared suction reference plane and H-06 adds no missing Bernoulli term",
      "NPSHR is OEM evidence matched to the exact pump operating state and definition",
      "positive raw margins are screening values and never a safe or no-boiling conclusion",
      "unknown evidence remains missing and is never replaced by zero",
    ] as const),
  });
}
