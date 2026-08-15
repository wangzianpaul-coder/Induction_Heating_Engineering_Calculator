import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-02"));

export const G02_METHOD_ID = "G-02" as const;
export const G02_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G02_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G02_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G02_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G02_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G02_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G02_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G02_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputOrResultPolicy: "fail_closed" as const,
  overflowFalseZeroAndSwallowedTermPolicy: "fail_closed" as const,
  orderedStreamSummation: true as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G02_BINARY64_MIN_NORMAL,
});

export const G02_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "isolated_safe_route_not_runtime_activated" as const,
  runtimeActivated: false as const,
  publicApiExported: false as const,
  implementedRoute: "explicit_hin_hout_steady_streams" as const,
  unavailableRoute:
    "temperature_cp_phase_reaction_requires_versioned_A01_G01_enthalpy_tool" as const,
  realProcessEnthalpyValidation: "blocked" as const,
});

const MASS_AS_FLOW_PREDICATE =
  "mass in kg is used as mass flow in kg/s" as const;
const REACTION_REFERENCE_UNKNOWN_PREDICATE =
  "reaction-enthalpy sign or reference state is unknown" as const;
const STARTUP_AS_STEADY_PREDICATE =
  "startup furnace heating is counted as steady process-flow power" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-02 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G02_WARNING_PREDICATES = Object.freeze({
  massInKgUsedAsMassFlow: controlledWarningPredicate(MASS_AS_FLOW_PREDICATE),
  reactionSignOrReferenceStateUnknown: controlledWarningPredicate(
    REACTION_REFERENCE_UNKNOWN_PREDICATE,
  ),
  startupFurnaceCountedAsSteady: controlledWarningPredicate(
    STARTUP_AS_STEADY_PREDICATE,
  ),
});

export const G02_CONTINUOUS_PROCESS_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  sourceRefs: G02_SOURCE_REFS,
  contractSourceRefs: G02_CONTRACT_SOURCE_REFS,
  derivationRefs: G02_DERIVATION_REFS,
  validationCaseIds: G02_VALIDATION_CASE_IDS,
  methodCheckIds: G02_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G02_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: G02_IMPLEMENTATION_READINESS,
});

export type G02ProcessIntent =
  | "steady_continuous_process_stream_enthalpy_rate"
  | "startup_furnace_thermal_mass_heating"
  | "unknown_or_unconfirmed";

export type G02SteadyStateAssessment =
  | "confirmed_steady_for_declared_time_basis"
  | "known_transient_or_startup"
  | "unknown_or_unconfirmed";

export interface G02ProcessBoundaryEvidence {
  readonly processIntent: G02ProcessIntent;
  readonly steadyStateAssessment: G02SteadyStateAssessment;
  readonly caseSnapshotId: string;
  readonly controlVolumeId: string;
  readonly processStateSnapshotId: string;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly processSnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly sourceRef: string;
}

export interface G02StreamBinding {
  readonly caseSnapshotId: string;
  readonly controlVolumeId: string;
  readonly processStateSnapshotId: string;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly processSnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly streamId: string;
  readonly physicalStreamPathId: string;
  readonly materialId: string;
  readonly materialStateId: string;
  readonly materialSnapshotId: string;
  readonly enthalpyReferenceStateId: string;
}

export type G02EvidenceSourceKind =
  | "measurement"
  | "process_dataset"
  | "material_property"
  | "numerical_model"
  | "sourced_user_input"
  | "unknown_or_unconfirmed";

interface G02EvidenceSource {
  readonly sourceKind: G02EvidenceSourceKind;
  readonly dataQuality: DataQuality;
  readonly sourceRef: string;
  readonly provenanceId: string;
}

export type G02MassQuantityBasis =
  | "mass_flow_rate"
  | "batch_mass"
  | "unknown_or_unconfirmed";

export type G02MassDimensionId =
  | "mass_flow_rate"
  | "mass"
  | "unknown_or_unconfirmed";

export type G02MassCanonicalUnitId =
  | "kg_per_s"
  | "kg"
  | "unknown_or_unconfirmed";

export interface G02MassFlowEvidence extends G02EvidenceSource {
  readonly kind: "available";
  readonly inputId: "mass_flow(mdot)";
  /** Canonical-SI kg/s only when quantityBasis is mass_flow_rate. */
  readonly valueSi: number;
  readonly quantityBasis: G02MassQuantityBasis;
  readonly dimensionId: G02MassDimensionId;
  readonly canonicalUnitId: G02MassCanonicalUnitId;
  readonly binding: G02StreamBinding;
}

export interface G02SpecificEnthalpyEvidence extends G02EvidenceSource {
  readonly kind: "available";
  readonly inputId: "hin" | "hout";
  readonly boundaryLocation: "inlet" | "outlet";
  /** Canonical-SI J/kg. Signed values are permitted on a declared reference. */
  readonly valueJPerKg: number;
  readonly dimensionId: "specific_energy";
  readonly canonicalUnitId: "J_per_kg";
  readonly binding: G02StreamBinding;
}

export type G02ReferenceStateConsistency =
  | "confirmed_same_reference_state"
  | "known_reference_state_mismatch"
  | "unknown_or_unconfirmed";

export type G02ReactionEnthalpyTreatment =
  | "included_in_hout_minus_hin_with_declared_positive_useful_sign"
  | "source_confirmed_not_applicable"
  | "known_opposite_or_inconsistent_sign"
  | "unknown_or_unconfirmed";

export interface G02ThermochemicalReferenceAssessment {
  readonly kind: "thermochemical_reference_assessment";
  readonly referenceStateConsistency: G02ReferenceStateConsistency;
  readonly reactionEnthalpyTreatment: G02ReactionEnthalpyTreatment;
  readonly assessmentSourceRef: string;
  readonly binding: G02StreamBinding;
}

export interface G02ExplicitStreamEvidence {
  readonly massFlow: G02MassFlowEvidence;
  readonly inletEnthalpy: G02SpecificEnthalpyEvidence;
  readonly outletEnthalpy: G02SpecificEnthalpyEvidence;
  readonly thermochemicalAssessment: G02ThermochemicalReferenceAssessment;
}

export interface G02ExplicitEnthalpyRoute {
  readonly kind: "explicit_inlet_outlet_specific_enthalpy";
  readonly streams: readonly G02ExplicitStreamEvidence[];
}

export type G02UpstreamEnthalpyToolStatus =
  | "available_versioned_result"
  | "blocked"
  | "unknown_or_unconfirmed";

export interface G02TemperatureCpPhaseReactionRoute {
  readonly kind: "temperature_cp_phase_reaction";
  readonly upstreamEnthalpyToolStatus: G02UpstreamEnthalpyToolStatus;
  readonly upstreamResultId: string | null;
  readonly reason: string;
}

export type G02EnthalpyRoute =
  | G02ExplicitEnthalpyRoute
  | G02TemperatureCpPhaseReactionRoute;

export interface G02ContinuousProcessUsefulPowerInput {
  readonly processBoundary: G02ProcessBoundaryEvidence;
  readonly enthalpyRoute: G02EnthalpyRoute;
}

export interface G02StreamPowerResult {
  readonly streamId: string;
  readonly physicalStreamPathId: string;
  readonly materialId: string;
  readonly massFlowKgPerS: number;
  readonly inletSpecificEnthalpyJPerKg: number;
  readonly outletSpecificEnthalpyJPerKg: number;
  readonly specificEnthalpyRiseJPerKg: number;
  readonly usefulPowerW: number;
  readonly equation: "P_stream = mass_flow * (hout - hin)";
  readonly inputAdjusted: false;
}

export interface G02CalculationTrace {
  readonly traceId: string;
  readonly equation:
    | "delta_h_process = hout - hin"
    | "P_stream = mass_flow * delta_h_process"
    | "Puseful = sum(P_stream_i)";
  readonly streamId: string | null;
  readonly orderedSubstitutionValues: readonly number[];
  readonly resultSi: number;
  readonly canonicalUnitId: "J_per_kg" | "W";
  readonly inputAdjusted: false;
}

export interface G02ContinuousProcessUsefulPowerSuccess {
  readonly methodId: typeof G02_METHOD_ID;
  readonly methodVersion: typeof G02_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly methodType: "numerical";
  readonly status: "success";
  readonly calculationStatus: "complete";
  readonly applicabilityStatus: "in_domain";
  readonly resultProvenance: "predicted";
  readonly scientificConfidence: "high";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly Puseful: Readonly<{
      readonly outputId: "Puseful";
      readonly valueSi: number;
      readonly dimensionId: "power";
      readonly canonicalUnitId: "W";
      readonly controlVolumeId: string;
      readonly caseSnapshotId: string;
      readonly processStateSnapshotId: string;
      readonly timeBasisId: string;
      readonly processSnapshotId: string;
    }>;
  }>;
  readonly streamResults: readonly G02StreamPowerResult[];
  readonly calculationTrace: readonly G02CalculationTrace[];
  readonly inputSnapshot: Readonly<{
    readonly processBoundary: Readonly<G02ProcessBoundaryEvidence>;
    readonly enthalpyRoute: Readonly<G02ExplicitEnthalpyRoute>;
  }>;
  readonly materialSources: readonly Readonly<{
    readonly streamId: string;
    readonly materialId: string;
    readonly materialSnapshotId: string;
    readonly enthalpySourceRefs: readonly [string, string];
    readonly enthalpyProvenanceIds: readonly [string, string];
    readonly enthalpyReferenceStateId: string;
  }>[];
  readonly engineeringPrecision:
    "controlled_by_mass_flow_and_specific_enthalpy_input_evidence";
  readonly sourceRefs: typeof G02_SOURCE_REFS;
  readonly contractSourceRefs: typeof G02_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G02_DERIVATION_REFS;
  readonly validationCaseIds: typeof G02_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G02_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy:
    typeof G02_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "the declared control volume is a steady continuous-process stream boundary rather than startup furnace thermal mass",
    "mass flow is canonical kg/s and each hin/hout pair is canonical J/kg",
    "mass flow, inlet enthalpy, outlet enthalpy and thermochemical assessment share one exact stream, material, state, time, reference-state and source snapshot",
    "all streams share one case, process control volume, process state, time basis, measurement window and process snapshot",
    "reaction enthalpy is either source-confirmed not applicable or already included with the declared positive useful-enthalpy sign",
    "each physical stream path appears exactly once and no input is calibrated or adjusted",
  ];
  readonly failure?: never;
}

export type G02FailureCode =
  | "G-02.input_schema_invalid"
  | "G-02.process_boundary_invalid"
  | "G-02.enthalpy_route_invalid"
  | "G-02.stream_array_invalid"
  | "G-02.stream_evidence_invalid"
  | "G-02.mass_flow_evidence_invalid"
  | "G-02.specific_enthalpy_evidence_invalid"
  | "G-02.thermochemical_assessment_invalid"
  | "G-02.duplicate_stream_or_path"
  | "G-02.mass_flow_route_inconsistent"
  | "G-02.startup_furnace_not_applicable"
  | "G-02.transient_process_not_applicable"
  | "G-02.batch_mass_not_mass_flow"
  | "G-02.reference_state_not_applicable"
  | "G-02.reaction_sign_not_applicable"
  | "G-02.process_boundary_unconfirmed"
  | "G-02.mass_flow_basis_unconfirmed"
  | "G-02.source_evidence_unconfirmed"
  | "G-02.thermochemical_evidence_unconfirmed"
  | "G-02.temperature_cp_route_unavailable"
  | "G-02.stream_binding_mismatch"
  | "G-02.process_boundary_mismatch"
  | "G-02.enthalpy_decrease_invalid"
  | "G-02.numeric_resolution_invalid";

export interface G02ContinuousProcessUsefulPowerFailure {
  readonly methodId: typeof G02_METHOD_ID;
  readonly methodVersion: typeof G02_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: G02FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly streamResults?: never;
  readonly calculationTrace?: never;
  readonly inputSnapshot?: never;
  readonly materialSources?: never;
}

export type G02ContinuousProcessUsefulPowerOutcome =
  | G02ContinuousProcessUsefulPowerSuccess
  | G02ContinuousProcessUsefulPowerFailure;

const EMPTY = Object.freeze([]) as readonly [];

const PROCESS_INTENTS = Object.freeze([
  "steady_continuous_process_stream_enthalpy_rate",
  "startup_furnace_thermal_mass_heating",
  "unknown_or_unconfirmed",
] as const);

const STEADY_STATE_ASSESSMENTS = Object.freeze([
  "confirmed_steady_for_declared_time_basis",
  "known_transient_or_startup",
  "unknown_or_unconfirmed",
] as const);

const SOURCE_KINDS = Object.freeze([
  "measurement",
  "process_dataset",
  "material_property",
  "numerical_model",
  "sourced_user_input",
  "unknown_or_unconfirmed",
] as const);

const MASS_QUANTITY_BASES = Object.freeze([
  "mass_flow_rate",
  "batch_mass",
  "unknown_or_unconfirmed",
] as const);

const MASS_DIMENSIONS = Object.freeze([
  "mass_flow_rate",
  "mass",
  "unknown_or_unconfirmed",
] as const);

const MASS_UNITS = Object.freeze([
  "kg_per_s",
  "kg",
  "unknown_or_unconfirmed",
] as const);

const REFERENCE_STATE_CONSISTENCIES = Object.freeze([
  "confirmed_same_reference_state",
  "known_reference_state_mismatch",
  "unknown_or_unconfirmed",
] as const);

const REACTION_TREATMENTS = Object.freeze([
  "included_in_hout_minus_hin_with_declared_positive_useful_sign",
  "source_confirmed_not_applicable",
  "known_opposite_or_inconsistent_sign",
  "unknown_or_unconfirmed",
] as const);

const UPSTREAM_TOOL_STATUSES = Object.freeze([
  "available_versioned_result",
  "blocked",
  "unknown_or_unconfirmed",
] as const);

const STABLE_IDENTIFIER_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;

function failure(
  status: G02ContinuousProcessUsefulPowerFailure["status"],
  code: G02FailureCode,
  message: string,
  action: string,
): G02ContinuousProcessUsefulPowerFailure {
  return Object.freeze({
    methodId: G02_METHOD_ID,
    methodVersion: G02_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY,
    warnings: EMPTY,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && STABLE_IDENTIFIER_PATTERN.test(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= G02_BINARY64_MIN_NORMAL;
}

function isSignedNormalOrZero(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (value === 0 || Math.abs(value) >= G02_BINARY64_MIN_NORMAL)
  );
}

/** Copies a dense plain-data array without reading elements through getters. */
function readExactPlainDataArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
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
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== length + 1 ||
      ownKeys.some((key) => typeof key !== "string") ||
      !ownKeys.includes("length")
    ) {
      return null;
    }
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!ownKeys.includes(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      output.push(descriptor.value);
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
}

type Parsed<T> =
  | Readonly<{ readonly ok: true; readonly value: T }>
  | Readonly<{
      readonly ok: false;
      readonly failure: G02ContinuousProcessUsefulPowerFailure;
    }>;

function parseProcessBoundary(value: unknown): Parsed<G02ProcessBoundaryEvidence> {
  const record = readExactPlainDataRecord(value, [
    "processIntent",
    "steadyStateAssessment",
    "caseSnapshotId",
    "controlVolumeId",
    "processStateSnapshotId",
    "timeBasisId",
    "measurementWindowId",
    "processSnapshotId",
    "sourceSnapshotId",
    "sourceRef",
  ]);
  if (
    record === null ||
    !(PROCESS_INTENTS as readonly unknown[]).includes(record.processIntent) ||
    !(STEADY_STATE_ASSESSMENTS as readonly unknown[]).includes(
      record.steadyStateAssessment,
    ) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isStableIdentifier(record.processStateSnapshotId) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !isStableIdentifier(record.processSnapshotId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId) ||
    !isStableIdentifier(record.sourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.process_boundary_invalid",
        "G-02 requires one exact controlled process boundary with content-addressed case/source snapshots and controlled steady/startup semantics.",
        "Provide the declared control volume, case, process state, time/window, process snapshot, source snapshot and process intent without extra or inferred fields.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      processIntent: record.processIntent as G02ProcessIntent,
      steadyStateAssessment:
        record.steadyStateAssessment as G02SteadyStateAssessment,
      caseSnapshotId: record.caseSnapshotId,
      controlVolumeId: record.controlVolumeId,
      processStateSnapshotId: record.processStateSnapshotId,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      processSnapshotId: record.processSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      sourceRef: record.sourceRef,
    }),
  };
}

function parseBinding(value: unknown): Parsed<G02StreamBinding> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "controlVolumeId",
    "processStateSnapshotId",
    "timeBasisId",
    "measurementWindowId",
    "processSnapshotId",
    "sourceSnapshotId",
    "streamId",
    "physicalStreamPathId",
    "materialId",
    "materialStateId",
    "materialSnapshotId",
    "enthalpyReferenceStateId",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isStableIdentifier(record.processStateSnapshotId) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !isStableIdentifier(record.processSnapshotId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId) ||
    !isStableIdentifier(record.streamId) ||
    !isStableIdentifier(record.physicalStreamPathId) ||
    !isStableIdentifier(record.materialId) ||
    !isStableIdentifier(record.materialStateId) ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableIdentifier(record.enthalpyReferenceStateId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.stream_evidence_invalid",
        "A G-02 stream binding is incomplete, uncontrolled or lacks content-addressed case/material/source snapshots.",
        "Bind every stream quantity to one stream/path, control volume, case, material/state, time, reference state and immutable source snapshot.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      controlVolumeId: record.controlVolumeId,
      processStateSnapshotId: record.processStateSnapshotId,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      processSnapshotId: record.processSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      streamId: record.streamId,
      physicalStreamPathId: record.physicalStreamPathId,
      materialId: record.materialId,
      materialStateId: record.materialStateId,
      materialSnapshotId: record.materialSnapshotId,
      enthalpyReferenceStateId: record.enthalpyReferenceStateId,
    }),
  };
}

function sourceFieldsAreControlled(record: Readonly<Record<string, unknown>>): boolean {
  return (
    (SOURCE_KINDS as readonly unknown[]).includes(record.sourceKind) &&
    (DATA_QUALITIES as readonly unknown[]).includes(record.dataQuality) &&
    isStableIdentifier(record.sourceRef) &&
    isStableIdentifier(record.provenanceId)
  );
}

function parseMassFlow(value: unknown): Parsed<G02MassFlowEvidence> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "valueSi",
    "quantityBasis",
    "dimensionId",
    "canonicalUnitId",
    "binding",
    "sourceKind",
    "dataQuality",
    "sourceRef",
    "provenanceId",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    record.inputId !== "mass_flow(mdot)" ||
    typeof record.valueSi !== "number" ||
    !isPositiveNormal(record.valueSi) ||
    !(MASS_QUANTITY_BASES as readonly unknown[]).includes(
      record.quantityBasis,
    ) ||
    !(MASS_DIMENSIONS as readonly unknown[]).includes(record.dimensionId) ||
    !(MASS_UNITS as readonly unknown[]).includes(record.canonicalUnitId) ||
    !sourceFieldsAreControlled(record)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.mass_flow_evidence_invalid",
        "G-02 mass-flow evidence must be one exact positive-normal canonical-SI record with controlled quantity basis, dimension, unit and provenance.",
        "Provide a finite positive kg/s mass-flow record; do not use kg, zero, a positive subnormal, NaN, Infinity or an unversioned source.",
      ),
    };
  }
  const bindingResult = parseBinding(record.binding);
  if (!bindingResult.ok) return bindingResult;
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      inputId: "mass_flow(mdot)",
      valueSi: record.valueSi,
      quantityBasis: record.quantityBasis as G02MassQuantityBasis,
      dimensionId: record.dimensionId as G02MassDimensionId,
      canonicalUnitId: record.canonicalUnitId as G02MassCanonicalUnitId,
      binding: bindingResult.value,
      sourceKind: record.sourceKind as G02EvidenceSourceKind,
      dataQuality: record.dataQuality as DataQuality,
      sourceRef: record.sourceRef as string,
      provenanceId: record.provenanceId as string,
    }),
  };
}

function parseSpecificEnthalpy(
  value: unknown,
  expectedInputId: "hin" | "hout",
  expectedLocation: "inlet" | "outlet",
): Parsed<G02SpecificEnthalpyEvidence> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "boundaryLocation",
    "valueJPerKg",
    "dimensionId",
    "canonicalUnitId",
    "binding",
    "sourceKind",
    "dataQuality",
    "sourceRef",
    "provenanceId",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    record.inputId !== expectedInputId ||
    record.boundaryLocation !== expectedLocation ||
    !isSignedNormalOrZero(record.valueJPerKg) ||
    record.dimensionId !== "specific_energy" ||
    record.canonicalUnitId !== "J_per_kg" ||
    !sourceFieldsAreControlled(record)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.specific_enthalpy_evidence_invalid",
        `G-02 ${expectedInputId} evidence must be one exact finite normal-or-zero canonical J/kg ${expectedLocation} record with controlled provenance.`,
        "Provide explicit inlet/outlet specific enthalpy on the declared material and reference state; total J, NaN, Infinity and positive/negative subnormal placeholders are rejected.",
      ),
    };
  }
  const bindingResult = parseBinding(record.binding);
  if (!bindingResult.ok) return bindingResult;
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      inputId: expectedInputId,
      boundaryLocation: expectedLocation,
      valueJPerKg: record.valueJPerKg,
      dimensionId: "specific_energy",
      canonicalUnitId: "J_per_kg",
      binding: bindingResult.value,
      sourceKind: record.sourceKind as G02EvidenceSourceKind,
      dataQuality: record.dataQuality as DataQuality,
      sourceRef: record.sourceRef as string,
      provenanceId: record.provenanceId as string,
    }),
  };
}

function parseThermochemicalAssessment(
  value: unknown,
): Parsed<G02ThermochemicalReferenceAssessment> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "referenceStateConsistency",
    "reactionEnthalpyTreatment",
    "assessmentSourceRef",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "thermochemical_reference_assessment" ||
    !(REFERENCE_STATE_CONSISTENCIES as readonly unknown[]).includes(
      record.referenceStateConsistency,
    ) ||
    !(REACTION_TREATMENTS as readonly unknown[]).includes(
      record.reactionEnthalpyTreatment,
    ) ||
    !isStableIdentifier(record.assessmentSourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.thermochemical_assessment_invalid",
        "G-02 requires one exact controlled reaction-sign and enthalpy-reference-state assessment per stream.",
        "Declare whether reaction enthalpy is included or source-confirmed not applicable and bind the same enthalpy reference state without guessing a sign.",
      ),
    };
  }
  const bindingResult = parseBinding(record.binding);
  if (!bindingResult.ok) return bindingResult;
  return {
    ok: true,
    value: Object.freeze({
      kind: "thermochemical_reference_assessment",
      referenceStateConsistency:
        record.referenceStateConsistency as G02ReferenceStateConsistency,
      reactionEnthalpyTreatment:
        record.reactionEnthalpyTreatment as G02ReactionEnthalpyTreatment,
      assessmentSourceRef: record.assessmentSourceRef,
      binding: bindingResult.value,
    }),
  };
}

function parseStream(value: unknown): Parsed<G02ExplicitStreamEvidence> {
  const record = readExactPlainDataRecord(value, [
    "massFlow",
    "inletEnthalpy",
    "outletEnthalpy",
    "thermochemicalAssessment",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.stream_evidence_invalid",
        "Each G-02 stream must be one exact record containing mass flow, hin, hout and thermochemical assessment.",
        "Provide the four controlled stream records without missing, extra, inherited, accessor or symbol fields.",
      ),
    };
  }
  const massFlow = parseMassFlow(record.massFlow);
  const inlet = parseSpecificEnthalpy(record.inletEnthalpy, "hin", "inlet");
  const outlet = parseSpecificEnthalpy(
    record.outletEnthalpy,
    "hout",
    "outlet",
  );
  const assessment = parseThermochemicalAssessment(
    record.thermochemicalAssessment,
  );
  if (!massFlow.ok) return massFlow;
  if (!inlet.ok) return inlet;
  if (!outlet.ok) return outlet;
  if (!assessment.ok) return assessment;
  return {
    ok: true,
    value: Object.freeze({
      massFlow: massFlow.value,
      inletEnthalpy: inlet.value,
      outletEnthalpy: outlet.value,
      thermochemicalAssessment: assessment.value,
    }),
  };
}

function parseEnthalpyRoute(value: unknown): Parsed<G02EnthalpyRoute> {
  const explicit = readExactPlainDataRecord(value, ["kind", "streams"]);
  if (explicit !== null && explicit.kind === "explicit_inlet_outlet_specific_enthalpy") {
    const streamValues = readExactPlainDataArray(explicit.streams);
    if (streamValues === null || streamValues.length === 0) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-02.stream_array_invalid",
          "The explicit G-02 route requires a non-empty dense plain-data stream array.",
          "Provide one steady stream or an explicit dense list of multiple streams; sparse/accessor arrays and empty placeholders are rejected.",
        ),
      };
    }
    const parsedStreams: G02ExplicitStreamEvidence[] = [];
    for (const streamValue of streamValues) {
      const parsed = parseStream(streamValue);
      if (!parsed.ok) return parsed;
      parsedStreams.push(parsed.value);
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "explicit_inlet_outlet_specific_enthalpy",
        streams: Object.freeze(parsedStreams),
      }),
    };
  }

  const temperatureRoute = readExactPlainDataRecord(value, [
    "kind",
    "upstreamEnthalpyToolStatus",
    "upstreamResultId",
    "reason",
  ]);
  if (
    temperatureRoute === null ||
    temperatureRoute.kind !== "temperature_cp_phase_reaction" ||
    !(UPSTREAM_TOOL_STATUSES as readonly unknown[]).includes(
      temperatureRoute.upstreamEnthalpyToolStatus,
    ) ||
    (temperatureRoute.upstreamResultId !== null &&
      !isStableIdentifier(temperatureRoute.upstreamResultId)) ||
    !isNonEmptyText(temperatureRoute.reason)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-02.enthalpy_route_invalid",
        "G-02 enthalpyRoute must be exactly the explicit hin/hout route or the controlled unavailable T+cp+phase/reaction route.",
        "Use explicit source-bound hin/hout, or declare the upstream A-01/G-01 enthalpy-tool status without inserting an unregistered integration formula.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "temperature_cp_phase_reaction",
      upstreamEnthalpyToolStatus:
        temperatureRoute.upstreamEnthalpyToolStatus as G02UpstreamEnthalpyToolStatus,
      upstreamResultId: temperatureRoute.upstreamResultId as string | null,
      reason: temperatureRoute.reason,
    }),
  };
}

function sameBinding(left: G02StreamBinding, right: G02StreamBinding): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.controlVolumeId === right.controlVolumeId &&
    left.processStateSnapshotId === right.processStateSnapshotId &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.processSnapshotId === right.processSnapshotId &&
    left.sourceSnapshotId === right.sourceSnapshotId &&
    left.streamId === right.streamId &&
    left.physicalStreamPathId === right.physicalStreamPathId &&
    left.materialId === right.materialId &&
    left.materialStateId === right.materialStateId &&
    left.materialSnapshotId === right.materialSnapshotId &&
    left.enthalpyReferenceStateId === right.enthalpyReferenceStateId
  );
}

function sameProcessBoundary(
  process: G02ProcessBoundaryEvidence,
  binding: G02StreamBinding,
): boolean {
  return (
    process.caseSnapshotId === binding.caseSnapshotId &&
    process.controlVolumeId === binding.controlVolumeId &&
    process.processStateSnapshotId === binding.processStateSnapshotId &&
    process.timeBasisId === binding.timeBasisId &&
    process.measurementWindowId === binding.measurementWindowId &&
    process.processSnapshotId === binding.processSnapshotId &&
    process.sourceSnapshotId === binding.sourceSnapshotId
  );
}

type MassRouteClassification =
  | "mass_flow_rate"
  | "batch_mass"
  | "unknown"
  | "inconsistent";

function classifyMassRoute(massFlow: G02MassFlowEvidence): MassRouteClassification {
  if (
    massFlow.quantityBasis === "mass_flow_rate" &&
    massFlow.dimensionId === "mass_flow_rate" &&
    massFlow.canonicalUnitId === "kg_per_s"
  ) {
    return "mass_flow_rate";
  }
  if (
    massFlow.quantityBasis === "batch_mass" &&
    massFlow.dimensionId === "mass" &&
    massFlow.canonicalUnitId === "kg"
  ) {
    return "batch_mass";
  }
  if (
    massFlow.quantityBasis === "unknown_or_unconfirmed" &&
    massFlow.dimensionId === "unknown_or_unconfirmed" &&
    massFlow.canonicalUnitId === "unknown_or_unconfirmed"
  ) {
    return "unknown";
  }
  return "inconsistent";
}

function hasUnconfirmedSource(stream: G02ExplicitStreamEvidence): boolean {
  const evidence = [
    stream.massFlow,
    stream.inletEnthalpy,
    stream.outletEnthalpy,
  ];
  return evidence.some(
    (candidate) =>
      candidate.sourceKind === "unknown_or_unconfirmed" ||
      candidate.dataQuality === "unknown",
  );
}

type NumericResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: G02ContinuousProcessUsefulPowerFailure;
    }>;

function numericFailure(operation: string): NumericResult {
  return {
    ok: false,
    failure: failure(
      "invalid_input",
      "G-02.numeric_resolution_invalid",
      `G-02 could not represent ${operation} as a finite normal-or-zero binary64 value without swallowing a nonzero term.`,
      "Use a numerically resolvable canonical-SI scale; no overflow, underflow, positive subnormal, false zero or swallowed stream contribution is published.",
    ),
  };
}

function guardedEnthalpyDifference(hout: number, hin: number): NumericResult {
  const rawValue = hout - hin;
  const value = rawValue === 0 ? 0 : rawValue;
  if (
    !Number.isFinite(value) ||
    (value !== 0 && Math.abs(value) < G02_BINARY64_MIN_NORMAL) ||
    (hin !== 0 && value === hout) ||
    (hout !== 0 && value === -hin)
  ) {
    return numericFailure("delta_h_process = hout - hin");
  }
  return { ok: true, value };
}

function guardedMultiplyMassFlow(
  massFlowKgPerS: number,
  deltaHJPerKg: number,
): NumericResult {
  const value = massFlowKgPerS * deltaHJPerKg;
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (value > 0 && !isPositiveNormal(value)) ||
    (deltaHJPerKg > 0 && value === 0) ||
    (deltaHJPerKg !== 0 &&
      deltaHJPerKg !== 1 &&
      value === massFlowKgPerS) ||
    (deltaHJPerKg !== 0 &&
      massFlowKgPerS !== 1 &&
      value === deltaHJPerKg)
  ) {
    return numericFailure("P_stream = mass_flow * delta_h_process");
  }
  return { ok: true, value };
}

function guardedPositiveAdd(left: number, right: number): NumericResult {
  const value = left + right;
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (value > 0 && !isPositiveNormal(value)) ||
    (right > 0 && value === left) ||
    (left > 0 && value === right)
  ) {
    return numericFailure("Puseful = sum(P_stream_i)");
  }
  return { ok: true, value };
}

/** Isolated canonical-SI safe-route implementation of frozen method G-02. */
export function evaluateG02ContinuousProcessUsefulPower(
  input: G02ContinuousProcessUsefulPowerInput,
): G02ContinuousProcessUsefulPowerOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "processBoundary",
    "enthalpyRoute",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-02.input_schema_invalid",
      "G-02 input must be one exact controlled plain-data record.",
      "Provide only processBoundary and enthalpyRoute without missing, extra, inherited, accessor, symbol or coercive fields.",
    );
  }
  const processResult = parseProcessBoundary(controlledInput.processBoundary);
  const routeResult = parseEnthalpyRoute(controlledInput.enthalpyRoute);
  if (!processResult.ok) return processResult.failure;
  if (!routeResult.ok) return routeResult.failure;
  const process = processResult.value;
  const route = routeResult.value;

  /* Known startup/transient use is outside G-02 before any unknown route is
   * interpreted. Exact schemas and controlled enums were already validated. */
  if (
    process.processIntent === "startup_furnace_thermal_mass_heating"
  ) {
    return failure(
      "not_applicable",
      "G-02.startup_furnace_not_applicable",
      "Startup furnace/tube thermal-mass heating is not steady continuous-process stream useful power.",
      "Route startup thermal mass to the frozen batch/transient energy model; do not count it as steady process-flow power.",
    );
  }
  if (process.steadyStateAssessment === "known_transient_or_startup") {
    return failure(
      "not_applicable",
      "G-02.transient_process_not_applicable",
      "The declared process interval is known to be transient or startup rather than steady continuous flow.",
      "Use a separately approved transient control-volume method and keep startup furnace heat outside G-02.",
    );
  }

  if (route.kind === "explicit_inlet_outlet_specific_enthalpy") {
    const streamIds = route.streams.map(
      (stream) => stream.massFlow.binding.streamId,
    );
    const physicalPaths = route.streams.map(
      (stream) => stream.massFlow.binding.physicalStreamPathId,
    );
    if (
      new Set(streamIds).size !== streamIds.length ||
      new Set(physicalPaths).size !== physicalPaths.length
    ) {
      return failure(
        "invalid_input",
        "G-02.duplicate_stream_or_path",
        "The explicit multi-stream route repeats a streamId or physicalStreamPathId and could double-count useful power.",
        "Provide each physical stream path exactly once with a unique controlled stream identity.",
      );
    }
    if (
      route.streams.some(
        (stream) => classifyMassRoute(stream.massFlow) === "inconsistent",
      )
    ) {
      return failure(
        "invalid_input",
        "G-02.mass_flow_route_inconsistent",
        "A mass-flow record mixes controlled mass-flow, batch-mass or unknown quantity basis/dimension/unit fields.",
        "Use exactly mass_flow_rate + mass_flow_rate + kg_per_s, batch_mass + mass + kg, or the all-unknown route; never mix them.",
      );
    }
  }

  if (route.kind === "explicit_inlet_outlet_specific_enthalpy") {
    if (
      route.streams.some(
        (stream) => classifyMassRoute(stream.massFlow) === "batch_mass",
      )
    ) {
      return failure(
        "not_applicable",
        "G-02.batch_mass_not_mass_flow",
        "A stream supplies batch mass in kg where G-02 requires mass flow in kg/s.",
        "Provide a source-bound mass-flow rate; route finite batch mass to G-01 instead of dividing by an inferred duration.",
      );
    }
    if (
      route.streams.some(
        (stream) =>
          stream.thermochemicalAssessment.referenceStateConsistency ===
          "known_reference_state_mismatch",
      )
    ) {
      return failure(
        "not_applicable",
        "G-02.reference_state_not_applicable",
        "At least one hin/hout pair is known to use inconsistent enthalpy reference states.",
        "Reissue both specific enthalpies on one declared reference state; do not subtract unlike reference bases.",
      );
    }
    if (
      route.streams.some(
        (stream) =>
          stream.thermochemicalAssessment.reactionEnthalpyTreatment ===
          "known_opposite_or_inconsistent_sign",
      )
    ) {
      return failure(
        "not_applicable",
        "G-02.reaction_sign_not_applicable",
        "At least one reaction-enthalpy treatment is known to conflict with positive hout-hin useful-process sign semantics.",
        "Resolve the reaction convention upstream and provide reference-consistent hin/hout with positive useful enthalpy rise.",
      );
    }
  }

  if (
    process.processIntent === "unknown_or_unconfirmed" ||
    process.steadyStateAssessment === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "G-02.process_boundary_unconfirmed",
      "Steady continuous-process intent or steady-state applicability is unknown or unconfirmed.",
      "Confirm the steady stream control volume and exclude startup furnace thermal mass before evaluating G-02.",
    );
  }

  if (route.kind === "temperature_cp_phase_reaction") {
    return failure(
      "insufficient_data",
      "G-02.temperature_cp_route_unavailable",
      "The T+cp+phase/reaction route requires a versioned A-01/G-01 enthalpy integration result that is not consumed by this isolated G-02 safe route.",
      "Provide explicit source-bound hin/hout for each stream, or complete and activate the upstream material-property/enthalpy tool without recreating its formula here.",
    );
  }

  if (
    route.streams.some(
      (stream) => classifyMassRoute(stream.massFlow) === "unknown",
    )
  ) {
    return failure(
      "insufficient_data",
      "G-02.mass_flow_basis_unconfirmed",
      "At least one stream does not confirm that its quantity is canonical kg/s mass flow.",
      "Confirm mass_flow_rate, mass_flow_rate dimension and kg_per_s; do not infer a duration from kg.",
    );
  }
  if (route.streams.some(hasUnconfirmedSource)) {
    return failure(
      "insufficient_data",
      "G-02.source_evidence_unconfirmed",
      "At least one mass-flow or specific-enthalpy source kind/data-quality state is unknown or unconfirmed.",
      "Resolve each source, provenance and immutable snapshot before publishing useful process power.",
    );
  }
  if (
    route.streams.some(
      (stream) =>
        stream.thermochemicalAssessment.referenceStateConsistency ===
          "unknown_or_unconfirmed" ||
        stream.thermochemicalAssessment.reactionEnthalpyTreatment ===
          "unknown_or_unconfirmed",
    )
  ) {
    return failure(
      "insufficient_data",
      "G-02.thermochemical_evidence_unconfirmed",
      "Reaction-enthalpy sign or enthalpy reference-state consistency is unknown for at least one stream.",
      "Provide a source-bound reference-state and reaction-sign assessment; G-02 does not guess or calibrate the missing convention.",
    );
  }

  for (const stream of route.streams) {
    const binding = stream.massFlow.binding;
    if (
      !sameBinding(binding, stream.inletEnthalpy.binding) ||
      !sameBinding(binding, stream.outletEnthalpy.binding) ||
      !sameBinding(binding, stream.thermochemicalAssessment.binding)
    ) {
      return failure(
        "insufficient_data",
        "G-02.stream_binding_mismatch",
        "Mass flow, hin, hout and thermochemical assessment do not share one exact stream/material/state/time/reference/source snapshot.",
        "Rebind all four records to the same immutable stream evidence set; do not mix materials, states, time windows or reference states.",
      );
    }
    if (!sameProcessBoundary(process, binding)) {
      return failure(
        "insufficient_data",
        "G-02.process_boundary_mismatch",
        "A stream does not belong to the declared process case, control volume, state, time/window or process/source snapshot.",
        "Use only streams from the exact declared steady process boundary; do not sum across cases, control volumes or time bases.",
      );
    }
  }

  const streamResults: G02StreamPowerResult[] = [];
  const traces: G02CalculationTrace[] = [];
  let usefulPowerW = 0;
  for (const stream of route.streams) {
    const hin = stream.inletEnthalpy.valueJPerKg;
    const hout = stream.outletEnthalpy.valueJPerKg;
    const deltaResult = guardedEnthalpyDifference(hout, hin);
    if (!deltaResult.ok) return deltaResult.failure;
    if (deltaResult.value < 0) {
      return failure(
        "invalid_input",
        "G-02.enthalpy_decrease_invalid",
        "G-02 requires hout >= hin for nonnegative useful process enthalpy rise.",
        "Correct the inlet/outlet orientation or route an energy-releasing process to a separately approved signed balance; no absolute value is applied.",
      );
    }
    const streamPower = guardedMultiplyMassFlow(
      stream.massFlow.valueSi,
      deltaResult.value,
    );
    if (!streamPower.ok) return streamPower.failure;
    const sum = guardedPositiveAdd(usefulPowerW, streamPower.value);
    if (!sum.ok) return sum.failure;
    usefulPowerW = sum.value;
    const binding = stream.massFlow.binding;
    streamResults.push(
      Object.freeze({
        streamId: binding.streamId,
        physicalStreamPathId: binding.physicalStreamPathId,
        materialId: binding.materialId,
        massFlowKgPerS: stream.massFlow.valueSi,
        inletSpecificEnthalpyJPerKg: hin,
        outletSpecificEnthalpyJPerKg: hout,
        specificEnthalpyRiseJPerKg: deltaResult.value,
        usefulPowerW: streamPower.value,
        equation: "P_stream = mass_flow * (hout - hin)",
        inputAdjusted: false,
      }),
    );
    traces.push(
      Object.freeze({
        traceId: `${binding.streamId}.delta_h_process`,
        equation: "delta_h_process = hout - hin",
        streamId: binding.streamId,
        orderedSubstitutionValues: Object.freeze([hout, hin]),
        resultSi: deltaResult.value,
        canonicalUnitId: "J_per_kg",
        inputAdjusted: false,
      }),
      Object.freeze({
        traceId: `${binding.streamId}.P_stream`,
        equation: "P_stream = mass_flow * delta_h_process",
        streamId: binding.streamId,
        orderedSubstitutionValues: Object.freeze([
          stream.massFlow.valueSi,
          deltaResult.value,
        ]),
        resultSi: streamPower.value,
        canonicalUnitId: "W",
        inputAdjusted: false,
      }),
    );
  }
  traces.push(
    Object.freeze({
      traceId: "Puseful.aggregate",
      equation: "Puseful = sum(P_stream_i)",
      streamId: null,
      orderedSubstitutionValues: Object.freeze(
        streamResults.map((stream) => stream.usefulPowerW),
      ),
      resultSi: usefulPowerW,
      canonicalUnitId: "W",
      inputAdjusted: false,
    }),
  );

  const frozenStreamResults = Object.freeze(streamResults);
  const frozenTraces = Object.freeze(traces);
  const materialSources = Object.freeze(
    route.streams.map((stream) =>
      Object.freeze({
        streamId: stream.massFlow.binding.streamId,
        materialId: stream.massFlow.binding.materialId,
        materialSnapshotId: stream.massFlow.binding.materialSnapshotId,
        enthalpySourceRefs: Object.freeze([
          stream.inletEnthalpy.sourceRef,
          stream.outletEnthalpy.sourceRef,
        ]) as readonly [string, string],
        enthalpyProvenanceIds: Object.freeze([
          stream.inletEnthalpy.provenanceId,
          stream.outletEnthalpy.provenanceId,
        ]) as readonly [string, string],
        enthalpyReferenceStateId:
          stream.massFlow.binding.enthalpyReferenceStateId,
      }),
    ),
  );

  return Object.freeze({
    methodId: G02_METHOD_ID,
    methodVersion: G02_METHOD_VERSION,
    methodApproval: "approved",
    methodType: "numerical",
    status: "success",
    calculationStatus: "complete",
    applicabilityStatus: "in_domain",
    resultProvenance: "predicted",
    scientificConfidence: "high",
    warningIds: EMPTY,
    warnings: EMPTY,
    value: Object.freeze({
      Puseful: Object.freeze({
        outputId: "Puseful",
        valueSi: usefulPowerW,
        dimensionId: "power",
        canonicalUnitId: "W",
        controlVolumeId: process.controlVolumeId,
        caseSnapshotId: process.caseSnapshotId,
        processStateSnapshotId: process.processStateSnapshotId,
        timeBasisId: process.timeBasisId,
        processSnapshotId: process.processSnapshotId,
      }),
    }),
    streamResults: frozenStreamResults,
    calculationTrace: frozenTraces,
    inputSnapshot: Object.freeze({
      processBoundary: process,
      enthalpyRoute: route,
    }),
    materialSources,
    engineeringPrecision:
      "controlled_by_mass_flow_and_specific_enthalpy_input_evidence",
    sourceRefs: G02_SOURCE_REFS,
    contractSourceRefs: G02_CONTRACT_SOURCE_REFS,
    derivationRefs: G02_DERIVATION_REFS,
    validationCaseIds: G02_VALIDATION_CASE_IDS,
    methodCheckIds: G02_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G02_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "the declared control volume is a steady continuous-process stream boundary rather than startup furnace thermal mass",
      "mass flow is canonical kg/s and each hin/hout pair is canonical J/kg",
      "mass flow, inlet enthalpy, outlet enthalpy and thermochemical assessment share one exact stream, material, state, time, reference-state and source snapshot",
      "all streams share one case, process control volume, process state, time basis, measurement window and process snapshot",
      "reaction enthalpy is either source-confirmed not applicable or already included with the declared positive useful-enthalpy sign",
      "each physical stream path appears exactly once and no input is calibrated or adjusted",
    ] as const),
  });
}
