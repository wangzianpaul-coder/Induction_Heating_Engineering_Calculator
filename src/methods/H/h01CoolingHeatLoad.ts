/**
 * H-01 cooling heat-load balance for one declared coolant circuit.
 *
 * This module is deliberately isolated from runtime activation. It publishes
 * a result only when every applicable heat source is resolved, source-bound,
 * assigned to one control volume and proven non-overlapping. The optional
 * design-margin arithmetic is not frozen, so a requested margin fails closed.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-01"));

export const H01_METHOD_ID = "H-01" as const;
export const H01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const H01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const H01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const H01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const H01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const H01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Smallest positive normal IEEE-754 binary64 value. */
export const H01_BINARY64_MIN_NORMAL = 2 ** -1022;

export const H01_NUMERIC_ACCUMULATION_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  positiveAddendSwallowingPolicy: "fail_closed" as const,
  orderedSourceEquationRearranged: false as const,
  minimumPositiveNormal: H01_BINARY64_MIN_NORMAL,
});

export const H01_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  openGates: Object.freeze([
    Object.freeze({
      gateId: "H-01.design-margin-mathematical-semantics" as const,
      reason:
        "The frozen basis requires an explicit design-margin scenario but defines no unique operator, coefficient, or equation; requested margins remain insufficient_data." as const,
    }),
  ]),
});

export const H01_METHOD_MAPPING = Object.freeze({
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
  sourceRefs: H01_SOURCE_REFS,
  contractSourceRefs: H01_CONTRACT_SOURCE_REFS,
  derivationRefs: H01_DERIVATION_REFS,
  validationCaseIds: H01_VALIDATION_CASE_IDS,
  methodCheckIds: H01_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericAccumulationPolicy: H01_NUMERIC_ACCUMULATION_POLICY,
  implementationReadiness: H01_IMPLEMENTATION_READINESS,
});

const FORBIDDEN_HEAT_CLASS_PREDICATE =
  "useful workpiece heat, reactive power or plant-wide loss enters coil coolant load" as const;
const UNKNOWN_PICKUP_ZERO_PREDICATE =
  "unknown pickup is silently included or set to zero" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      "H-01 warning predicate is absent from the frozen contract: " + predicate,
    );
  }
  return predicate;
}

export const H01_WARNING_PREDICATES = Object.freeze({
  forbiddenHeatClass: controlledWarningPredicate(
    FORBIDDEN_HEAT_CLASS_PREDICATE,
  ),
  unknownPickupSubstitutedZero: controlledWarningPredicate(
    UNKNOWN_PICKUP_ZERO_PREDICATE,
  ),
});

export type H01InputId =
  | "Pcu"
  | "Qpickup_to_coil"
  | "Pmag"
  | "Pother";

export type H01AllowedHeatSourceClass =
  | "coil_copper_loss"
  | "external_heat_pickup_to_coil"
  | "magnetic_material_loss"
  | "other_explicit_cooled_load";

export type H01ForbiddenHeatSourceClass =
  | "workpiece_useful_heat"
  | "environment_heat_loss"
  | "reactive_power"
  | "plant_wide_loss"
  | "grid_or_converter_loss";

export type H01HeatSourceClass =
  | H01AllowedHeatSourceClass
  | H01ForbiddenHeatSourceClass
  | "unknown_or_unconfirmed";

export type H01TermSourceMethod =
  | "measurement"
  | "analytical_estimate"
  | "fem";

export interface H01ControlVolumeEvidence {
  readonly controlVolumeId: string;
  readonly coolantCircuitId: string;
  readonly caseSnapshotId: string;
  readonly timeBasisId: string;
  readonly heatDestination:
    | "declared_coil_coolant_circuit"
    | "other_or_unconfirmed";
  readonly circuitScope:
    | "single_declared_circuit"
    | "multiple_circuits_or_aggregate"
    | "unknown_or_unconfirmed";
  readonly boundaryCompleteConfirmed: true | false | null;
  readonly forbiddenHeatClassesExcludedConfirmed: true | false | null;
  readonly multiCircuitAggregationAbsentConfirmed: true | false | null;
}

interface H01HeatTermBoundary {
  readonly inputId: H01InputId;
  readonly heatSourceClass: H01HeatSourceClass;
  readonly sourceMethod:
    | H01TermSourceMethod
    | "design_margin"
    | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly controlVolumeId: string;
  readonly coolantCircuitId: string;
  readonly caseSnapshotId: string;
  readonly timeBasisId: string;
  readonly heatPathId: string;
  readonly physicalHeatSourceId: string;
  readonly heatDestination:
    | "declared_coil_coolant_circuit"
    | "source_confirmed_not_entering_declared_circuit"
    | "workpiece"
    | "ambient_environment"
    | "plant_or_grid"
    | "unknown_or_unconfirmed";
}

export interface H01KnownApplicableHeatTerm extends H01HeatTermBoundary {
  readonly kind: "known_applicable";
  readonly valueW: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly valueResolution:
    | "known_value"
    | "unknown_substituted_zero";
}

export interface H01SourceConfirmedNotApplicableHeatTerm
  extends H01HeatTermBoundary {
  readonly kind: "source_confirmed_not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export interface H01UnknownApplicableHeatTerm extends H01HeatTermBoundary {
  readonly kind: "unknown_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type H01HeatTerm =
  | H01KnownApplicableHeatTerm
  | H01SourceConfirmedNotApplicableHeatTerm
  | H01UnknownApplicableHeatTerm;

export interface H01OtherCooledLoadsEvidence {
  readonly enumerationStatus: "complete" | "unknown_or_unconfirmed";
  readonly enumerationSourceRef: string;
  readonly loads: readonly H01HeatTerm[];
}

export type H01OverlapAssessment =
  | Readonly<{
      readonly status: "confirmed_pairwise_disjoint";
      readonly assessedHeatPathIds: readonly string[];
      readonly physicalSourceIdentityChecked: true;
      readonly assessmentSourceRef: string;
    }>
  | Readonly<{
      readonly status: "duplicate_or_overlap_present";
      readonly assessedHeatPathIds: readonly string[];
      readonly physicalSourceIdentityChecked: true;
      readonly assessmentSourceRef: string;
      readonly overlapDescription: string;
    }>
  | Readonly<{
      readonly status: "unknown_or_unconfirmed";
      readonly assessedHeatPathIds: readonly string[];
      readonly physicalSourceIdentityChecked: false | null;
      readonly assessmentSourceRef: string;
      readonly reason: string;
    }>;

export type H01DesignMarginEvidence =
  | Readonly<{ readonly status: "not_requested" }>
  | Readonly<{
      readonly status: "requested";
      readonly scenarioId: string;
      readonly sourceRef: string;
      readonly mathematicalDefinition: "not_frozen";
    }>
  | Readonly<{
      readonly status: "unknown_or_unconfirmed";
      readonly reason: string;
    }>;

export interface H01CoolingHeatLoadInput {
  readonly controlVolume: H01ControlVolumeEvidence;
  readonly Pcu: H01HeatTerm;
  readonly Qpickup_to_coil: H01HeatTerm;
  readonly Pmag: H01HeatTerm;
  readonly Pother: H01OtherCooledLoadsEvidence;
  readonly overlapAssessment: H01OverlapAssessment;
  readonly design_margin: H01DesignMarginEvidence;
}

export interface H01IncludedItemProvenance {
  readonly disposition: "included";
  readonly inputId: H01InputId;
  readonly heatSourceClass: H01AllowedHeatSourceClass;
  readonly valueW: number;
  readonly sourceMethod: H01TermSourceMethod;
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly heatPathId: string;
  readonly physicalHeatSourceId: string;
}

export interface H01ExcludedItemProvenance {
  readonly disposition: "source_confirmed_not_applicable";
  readonly inputId: H01InputId;
  readonly heatSourceClass: H01AllowedHeatSourceClass;
  readonly sourceMethod: H01TermSourceMethod;
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly heatPathId: string;
  readonly physicalHeatSourceId: string;
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type H01PerItemProvenance =
  | H01IncludedItemProvenance
  | H01ExcludedItemProvenance;

export interface H01CoolingHeatLoadSuccess {
  readonly methodId: typeof H01_METHOD_ID;
  readonly methodVersion: typeof H01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly Qcool: Readonly<{
      readonly outputId: "Qcool";
      readonly valueSi: number;
      readonly dimensionId: "power";
      readonly canonicalUnitId: "W";
      readonly interpretation:
        "heat_entering_one_declared_coil_coolant_circuit";
    }>;
    readonly perItemProvenance: readonly H01PerItemProvenance[];
    readonly unaccountedItems: readonly [];
  }>;
  readonly equation:
    "Qcool = Pcu + Qpickup_to_coil + Pmag + sum(Pother)";
  readonly substitution: Readonly<{
    readonly orderedIncludedTerms: readonly Readonly<{
      readonly inputId: H01InputId;
      readonly heatPathId: string;
      readonly valueW: number;
    }>[];
    readonly basePhysicalHeatLoadW: number;
    readonly designMarginStatus: "not_requested";
  }>;
  readonly inputSnapshot: Readonly<{
    readonly controlVolumeId: string;
    readonly coolantCircuitId: string;
    readonly caseSnapshotId: string;
    readonly timeBasisId: string;
    readonly includedHeatPathIds: readonly string[];
    readonly excludedHeatPathIds: readonly string[];
    readonly sourceSnapshotIds: readonly string[];
  }>;
  readonly evidence: Readonly<{
    readonly controlVolume: Readonly<H01ControlVolumeEvidence>;
    readonly heatTerms: readonly H01HeatTerm[];
    readonly otherLoadEnumerationSourceRef: string;
    readonly overlapAssessment: Readonly<H01OverlapAssessment>;
  }>;
  readonly applicabilityChecks: readonly [
    "one explicit coil-coolant circuit and control volume",
    "all applicable heat sources are resolved or source-confirmed not applicable",
    "only copper loss, external pickup, magnetic-material loss and other explicit cooled loads enter the sum",
    "all included paths share case snapshot and time basis",
    "included heat paths and physical source identities are pairwise disjoint",
    "design margin is not requested because its arithmetic is not frozen",
  ];
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_ordered_nonnegative_sum";
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim:
      "limited_by_input_precision_provenance_and_control_volume_completeness";
  }>;
  readonly assumptions: readonly [
    "positive heat rate is into the declared coolant circuit",
    "source-confirmed not-applicable terms do not enter the sum",
    "unknown applicable terms are never replaced by zero",
    "useful workpiece heat, ambient loss, reactive power and plant-wide loss are excluded",
    "multiple coolant circuits are evaluated separately",
  ];
  readonly sourceRefs: typeof H01_SOURCE_REFS;
  readonly contractSourceRefs: typeof H01_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof H01_DERIVATION_REFS;
  readonly validationCaseIds: typeof H01_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof H01_METHOD_CHECK_IDS;
  readonly mapping: typeof H01_METHOD_MAPPING;
  readonly numericAccumulationPolicy: typeof H01_NUMERIC_ACCUMULATION_POLICY;
  readonly failure?: never;
}

export type H01FailureCode =
  | "H-01.input_schema_invalid"
  | "H-01.control_volume_missing"
  | "H-01.control_volume_schema_invalid"
  | "H-01.control_volume_identifier_invalid"
  | "H-01.control_volume_unknown"
  | "H-01.control_volume_incomplete"
  | "H-01.control_volume_not_applicable"
  | "H-01.multiple_circuits_not_applicable"
  | "H-01.heat_term_missing"
  | "H-01.heat_term_schema_invalid"
  | "H-01.heat_term_binding_invalid"
  | "H-01.heat_term_value_invalid"
  | "H-01.heat_term_numeric_resolution_invalid"
  | "H-01.heat_term_provenance_insufficient"
  | "H-01.heat_term_boundary_mismatch"
  | "H-01.forbidden_heat_class_not_applicable"
  | "H-01.heat_destination_not_applicable"
  | "H-01.heat_term_classification_unknown"
  | "H-01.unknown_applicable_heat_source"
  | "H-01.unknown_pickup_substituted_zero"
  | "H-01.design_margin_route_unresolved"
  | "H-01.other_loads_missing"
  | "H-01.other_loads_schema_invalid"
  | "H-01.other_loads_enumeration_unknown"
  | "H-01.overlap_assessment_missing"
  | "H-01.overlap_assessment_schema_invalid"
  | "H-01.overlap_assessment_unknown"
  | "H-01.overlap_or_duplicate_present"
  | "H-01.overlap_assessment_path_set_mismatch"
  | "H-01.numeric_overflow"
  | "H-01.numeric_term_swallowed";

export interface H01Warning {
  readonly sourceMethodId: "H-01";
  readonly predicate:
    (typeof H01_WARNING_PREDICATES)[keyof typeof H01_WARNING_PREDICATES];
  readonly message: string;
}

export interface H01CoolingHeatLoadFailure {
  readonly methodId: typeof H01_METHOD_ID;
  readonly methodVersion: typeof H01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly H01Warning[];
  readonly mapping: typeof H01_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: H01FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
}

export type H01CoolingHeatLoadOutcome =
  | H01CoolingHeatLoadSuccess
  | H01CoolingHeatLoadFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function warning(
  predicate: H01Warning["predicate"],
  message: string,
): H01Warning {
  return Object.freeze({ sourceMethodId: H01_METHOD_ID, predicate, message });
}

function failure(
  status: H01CoolingHeatLoadFailure["status"],
  code: H01FailureCode,
  message: string,
  action: string,
  warnings: readonly H01Warning[] = EMPTY_WARNINGS,
): H01CoolingHeatLoadFailure {
  return Object.freeze({
    methodId: H01_METHOD_ID,
    methodVersion: H01_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    mapping: H01_METHOD_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStableIdentifier(value: unknown): value is string {
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

function isDataQuality(value: unknown): value is DataQuality {
  return (DATA_QUALITIES as readonly unknown[]).includes(value);
}

function isTriState(value: unknown): value is true | false | null {
  return value === true || value === false || value === null;
}

function isHeatSourceClass(value: unknown): value is H01HeatSourceClass {
  return (
    value === "coil_copper_loss" ||
    value === "external_heat_pickup_to_coil" ||
    value === "magnetic_material_loss" ||
    value === "other_explicit_cooled_load" ||
    value === "workpiece_useful_heat" ||
    value === "environment_heat_loss" ||
    value === "reactive_power" ||
    value === "plant_wide_loss" ||
    value === "grid_or_converter_loss" ||
    value === "unknown_or_unconfirmed"
  );
}

function isForbiddenHeatSourceClass(
  value: H01HeatSourceClass,
): value is H01ForbiddenHeatSourceClass {
  return (
    value === "workpiece_useful_heat" ||
    value === "environment_heat_loss" ||
    value === "reactive_power" ||
    value === "plant_wide_loss" ||
    value === "grid_or_converter_loss"
  );
}

function isTermSourceMethod(
  value: unknown,
): value is H01TermSourceMethod {
  return (
    value === "measurement" ||
    value === "analytical_estimate" ||
    value === "fem"
  );
}

/** Copies a dense plain-data array without reading elements through getters. */
function readExactPlainDataArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) {
      return null;
    }
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
      if (!ownKeys.includes(key)) {
        return null;
      }
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

type ControlVolumeReadResult =
  | Readonly<{
      readonly ok: true;
      readonly controlVolume: Readonly<H01ControlVolumeEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: H01CoolingHeatLoadFailure;
    }>;

function readControlVolume(value: unknown): ControlVolumeReadResult {
  const record = readExactPlainDataRecord(value, [
    "controlVolumeId",
    "coolantCircuitId",
    "caseSnapshotId",
    "timeBasisId",
    "heatDestination",
    "circuitScope",
    "boundaryCompleteConfirmed",
    "forbiddenHeatClassesExcludedConfirmed",
    "multiCircuitAggregationAbsentConfirmed",
  ]);
  if (record === null) {
    const missing = value === null || value === undefined;
    return Object.freeze({
      ok: false,
      result: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "H-01.control_volume_missing"
          : "H-01.control_volume_schema_invalid",
        "H-01 requires one exact coil-coolant control-volume record.",
        "Provide stable circuit/control-volume IDs, a content-addressed case snapshot, time basis, scope, destination, and every tri-state boundary confirmation.",
      ),
    });
  }
  if (
    !isStableIdentifier(record.controlVolumeId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.timeBasisId)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.control_volume_identifier_invalid",
        "The H-01 boundary lacks stable IDs or a content-addressed case snapshot.",
        "Use stable machine IDs and case:<64 lowercase SHA-256 hex> for the case snapshot.",
      ),
    });
  }
  if (
    (record.heatDestination !== "declared_coil_coolant_circuit" &&
      record.heatDestination !== "other_or_unconfirmed") ||
    (record.circuitScope !== "single_declared_circuit" &&
      record.circuitScope !== "multiple_circuits_or_aggregate" &&
      record.circuitScope !== "unknown_or_unconfirmed") ||
    !isTriState(record.boundaryCompleteConfirmed) ||
    !isTriState(record.forbiddenHeatClassesExcludedConfirmed) ||
    !isTriState(record.multiCircuitAggregationAbsentConfirmed)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.control_volume_schema_invalid",
        "The H-01 control volume contains an uncontrolled scope, destination, or confirmation value.",
        "Use only the frozen single-circuit discriminators and explicit true, false, or null confirmations.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    controlVolume: Object.freeze({
      controlVolumeId: record.controlVolumeId,
      coolantCircuitId: record.coolantCircuitId,
      caseSnapshotId: record.caseSnapshotId,
      timeBasisId: record.timeBasisId,
      heatDestination: record.heatDestination,
      circuitScope: record.circuitScope,
      boundaryCompleteConfirmed: record.boundaryCompleteConfirmed,
      forbiddenHeatClassesExcludedConfirmed:
        record.forbiddenHeatClassesExcludedConfirmed,
      multiCircuitAggregationAbsentConfirmed:
        record.multiCircuitAggregationAbsentConfirmed,
    }),
  });
}

const EXPECTED_HEAT_SOURCE_CLASS = Object.freeze({
  Pcu: "coil_copper_loss",
  Qpickup_to_coil: "external_heat_pickup_to_coil",
  Pmag: "magnetic_material_loss",
  Pother: "other_explicit_cooled_load",
} as const);

type TermReadResult =
  | Readonly<{ readonly ok: true; readonly term: H01HeatTerm }>
  | Readonly<{
      readonly ok: false;
      readonly result: H01CoolingHeatLoadFailure;
    }>;

function validateTermCommon(
  record: Readonly<Record<string, unknown>>,
  expectedInputId: H01InputId,
): H01CoolingHeatLoadFailure | null {
  if (record.inputId !== expectedInputId || !isHeatSourceClass(record.heatSourceClass)) {
    return failure(
      "invalid_input",
      "H-01.heat_term_binding_invalid",
      expectedInputId + " is not bound to its exact contract input and controlled heat-source class.",
      "Use the exact H-01 input ID and heat-source classification without aliases or coercion.",
    );
  }
  if (
    record.heatSourceClass !== "unknown_or_unconfirmed" &&
    !isForbiddenHeatSourceClass(record.heatSourceClass) &&
    record.heatSourceClass !== EXPECTED_HEAT_SOURCE_CLASS[expectedInputId]
  ) {
    return failure(
      "invalid_input",
      "H-01.heat_term_binding_invalid",
      expectedInputId + " is bound to the wrong allowed H-01 heat-source class.",
      "Bind copper loss, external pickup, magnetic loss, and other cooled loads to their distinct contract inputs.",
    );
  }
  if (
    !isTermSourceMethod(record.sourceMethod) &&
    record.sourceMethod !== "design_margin" &&
    record.sourceMethod !== "unknown_or_unconfirmed"
  ) {
    return failure(
      "invalid_input",
      "H-01.heat_term_binding_invalid",
      expectedInputId + " contains an uncontrolled source-method discriminator.",
      "Use measurement, analytical_estimate, FEM, or the explicit unresolved design-margin route.",
    );
  }
  if (
    record.heatDestination !== "declared_coil_coolant_circuit" &&
    record.heatDestination !== "source_confirmed_not_entering_declared_circuit" &&
    record.heatDestination !== "workpiece" &&
    record.heatDestination !== "ambient_environment" &&
    record.heatDestination !== "plant_or_grid" &&
    record.heatDestination !== "unknown_or_unconfirmed"
  ) {
    return failure(
      "invalid_input",
      "H-01.heat_term_binding_invalid",
      expectedInputId + " contains an uncontrolled heat-destination discriminator.",
      "Declare the destination explicitly without aliases or inferred routing.",
    );
  }
  if (!isDataQuality(record.dataQuality)) {
    return failure(
      "invalid_input",
      "H-01.heat_term_binding_invalid",
      expectedInputId + " contains an uncontrolled data-quality discriminator.",
      "Use one frozen data-quality enum value without aliases or coercion.",
    );
  }
  if (
    !isStableIdentifier(record.sourceRef) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.sourceSnapshotId) ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.heatPathId) ||
    !isStableIdentifier(record.physicalHeatSourceId)
  ) {
    return failure(
      "insufficient_data",
      "H-01.heat_term_provenance_insufficient",
      expectedInputId + " lacks stable source, provenance, snapshot, path, or boundary identity.",
      "Attach controlled source/data-quality evidence plus stable path/source IDs and content-addressed snapshots.",
    );
  }
  return null;
}

function readKnownTerm(
  value: unknown,
  expectedInputId: H01InputId,
): TermReadResult | null {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "heatSourceClass",
    "valueW",
    "dimensionId",
    "canonicalUnitId",
    "valueResolution",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "controlVolumeId",
    "coolantCircuitId",
    "caseSnapshotId",
    "timeBasisId",
    "heatPathId",
    "physicalHeatSourceId",
    "heatDestination",
  ]);
  if (record === null) {
    return null;
  }
  if (
    record.kind !== "known_applicable" ||
    record.dimensionId !== "power" ||
    record.canonicalUnitId !== "W" ||
    (record.valueResolution !== "known_value" &&
      record.valueResolution !== "unknown_substituted_zero")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_binding_invalid",
        expectedInputId + " is not an exact canonical-SI known-applicable power term.",
        "Use kind known_applicable, dimension power, unit W, and an explicit value-resolution discriminator.",
      ),
    });
  }
  const commonFailure = validateTermCommon(record, expectedInputId);
  if (commonFailure !== null) {
    return Object.freeze({ ok: false, result: commonFailure });
  }
  if (
    typeof record.valueW !== "number" ||
    !Number.isFinite(record.valueW) ||
    record.valueW < 0 ||
    Object.is(record.valueW, -0)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_value_invalid",
        expectedInputId + " must be a finite non-negative canonical-SI heat rate.",
        "Resolve a finite value in W; negative values, signed negative zero, NaN, Infinity, coercion, and placeholders are forbidden.",
      ),
    });
  }
  if (record.valueW > 0 && record.valueW < H01_BINARY64_MIN_NORMAL) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_numeric_resolution_invalid",
        expectedInputId + " is a positive subnormal binary64 value and cannot be audited under the frozen numeric policy.",
        "Provide a representable normal canonical-SI value or a source-confirmed exact zero; do not flush or round inside H-01.",
      ),
    });
  }
  if (record.valueResolution === "unknown_substituted_zero") {
    const isPickup = expectedInputId === "Qpickup_to_coil";
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        isPickup
          ? "H-01.unknown_pickup_substituted_zero"
          : "H-01.unknown_applicable_heat_source",
        expectedInputId + " is labelled unknown but supplied as numeric zero.",
        "Use unknown_applicable without a numeric value; never silently replace an unresolved heat source by zero.",
        isPickup
          ? [
              warning(
                H01_WARNING_PREDICATES.unknownPickupSubstitutedZero,
                "Unknown external pickup was supplied as zero.",
              ),
            ]
          : EMPTY_WARNINGS,
      ),
    });
  }
  return Object.freeze({
    ok: true,
    term: Object.freeze({
      kind: "known_applicable" as const,
      inputId: expectedInputId,
      heatSourceClass: record.heatSourceClass as H01HeatSourceClass,
      valueW: record.valueW,
      dimensionId: "power" as const,
      canonicalUnitId: "W" as const,
      valueResolution: "known_value" as const,
      sourceMethod: record.sourceMethod as H01HeatTermBoundary["sourceMethod"],
      sourceRef: record.sourceRef as string,
      dataQuality: record.dataQuality as DataQuality,
      provenanceId: record.provenanceId as string,
      sourceSnapshotId: record.sourceSnapshotId as string,
      controlVolumeId: record.controlVolumeId as string,
      coolantCircuitId: record.coolantCircuitId as string,
      caseSnapshotId: record.caseSnapshotId as string,
      timeBasisId: record.timeBasisId as string,
      heatPathId: record.heatPathId as string,
      physicalHeatSourceId: record.physicalHeatSourceId as string,
      heatDestination:
        record.heatDestination as H01HeatTermBoundary["heatDestination"],
    }),
  });
}

function readUnavailableTerm(
  value: unknown,
  expectedInputId: H01InputId,
): TermReadResult | null {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "heatSourceClass",
    "reason",
    "resolutionSourceRef",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "controlVolumeId",
    "coolantCircuitId",
    "caseSnapshotId",
    "timeBasisId",
    "heatPathId",
    "physicalHeatSourceId",
    "heatDestination",
  ]);
  if (record === null) {
    return null;
  }
  if (
    (record.kind !== "source_confirmed_not_applicable" &&
      record.kind !== "unknown_applicable") ||
    !isNonBlankText(record.reason) ||
    !isStableIdentifier(record.resolutionSourceRef)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_binding_invalid",
        expectedInputId + " unavailable evidence is malformed or not source-resolved.",
        "Use an exact source_confirmed_not_applicable or unknown_applicable discriminator with a reason and stable resolution source.",
      ),
    });
  }
  const commonFailure = validateTermCommon(record, expectedInputId);
  if (commonFailure !== null) {
    return Object.freeze({ ok: false, result: commonFailure });
  }
  if (
    record.kind === "source_confirmed_not_applicable" &&
    record.heatDestination !== "source_confirmed_not_entering_declared_circuit"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_binding_invalid",
        expectedInputId + " claims not_applicable but does not confirm that it is outside the declared coolant path.",
        "Bind source-confirmed not-applicable evidence to source_confirmed_not_entering_declared_circuit.",
      ),
    });
  }
  if (
    record.kind === "unknown_applicable" &&
    record.heatDestination !== "unknown_or_unconfirmed"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-01.heat_term_binding_invalid",
        expectedInputId + " has contradictory unknown-applicability and destination evidence.",
        "Keep unresolved applicability and destination explicitly unknown until the heat path is resolved.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    term: Object.freeze({
      kind: record.kind,
      inputId: expectedInputId,
      heatSourceClass: record.heatSourceClass as H01HeatSourceClass,
      reason: record.reason,
      resolutionSourceRef: record.resolutionSourceRef,
      sourceMethod: record.sourceMethod as H01HeatTermBoundary["sourceMethod"],
      sourceRef: record.sourceRef as string,
      dataQuality: record.dataQuality as DataQuality,
      provenanceId: record.provenanceId as string,
      sourceSnapshotId: record.sourceSnapshotId as string,
      controlVolumeId: record.controlVolumeId as string,
      coolantCircuitId: record.coolantCircuitId as string,
      caseSnapshotId: record.caseSnapshotId as string,
      timeBasisId: record.timeBasisId as string,
      heatPathId: record.heatPathId as string,
      physicalHeatSourceId: record.physicalHeatSourceId as string,
      heatDestination: record.heatDestination,
    }) as H01HeatTerm,
  });
}

function readHeatTerm(
  value: unknown,
  expectedInputId: H01InputId,
): TermReadResult {
  const known = readKnownTerm(value, expectedInputId);
  if (known !== null) {
    return known;
  }
  const unavailable = readUnavailableTerm(value, expectedInputId);
  if (unavailable !== null) {
    return unavailable;
  }
  const missing = value === null || value === undefined;
  return Object.freeze({
    ok: false,
    result: failure(
      missing ? "insufficient_data" : "invalid_input",
      missing ? "H-01.heat_term_missing" : "H-01.heat_term_schema_invalid",
      expectedInputId + " must use one exact H-01 heat-term discriminator.",
      "Provide known_applicable, source_confirmed_not_applicable, or unknown_applicable evidence without extra, accessor, symbol, or coercible fields.",
    ),
  });
}

type OtherLoadsReadResult =
  | Readonly<{
      readonly ok: true;
      readonly status: "complete" | "unknown_or_unconfirmed";
      readonly enumerationSourceRef: string;
      readonly loads: readonly H01HeatTerm[];
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: H01CoolingHeatLoadFailure;
      readonly loads: readonly H01HeatTerm[];
    }>;

function readOtherLoads(value: unknown): OtherLoadsReadResult {
  const record = readExactPlainDataRecord(value, [
    "enumerationStatus",
    "enumerationSourceRef",
    "loads",
  ]);
  if (record === null) {
    const missing = value === null || value === undefined;
    return Object.freeze({
      ok: false,
      loads: Object.freeze([]),
      result: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "H-01.other_loads_missing"
          : "H-01.other_loads_schema_invalid",
        "Pother requires an explicit enumeration record even when no other cooled loads exist.",
        "Provide complete or unknown enumeration status, a stable enumeration source, and a dense plain-data loads array.",
      ),
    });
  }
  if (
    (record.enumerationStatus !== "complete" &&
      record.enumerationStatus !== "unknown_or_unconfirmed") ||
    !isStableIdentifier(record.enumerationSourceRef)
  ) {
    return Object.freeze({
      ok: false,
      loads: Object.freeze([]),
      result: failure(
        "invalid_input",
        "H-01.other_loads_schema_invalid",
        "Pother enumeration status or provenance is uncontrolled.",
        "Use complete or unknown_or_unconfirmed with a stable enumeration source reference.",
      ),
    });
  }
  const rawLoads = readExactPlainDataArray(record.loads);
  if (rawLoads === null) {
    return Object.freeze({
      ok: false,
      loads: Object.freeze([]),
      result: failure(
        "invalid_input",
        "H-01.other_loads_schema_invalid",
        "Pother loads must be one dense plain-data array without accessors, holes, symbols, or extra properties.",
        "Provide an exact array of individually source-bound Pother terms.",
      ),
    });
  }
  const loads: H01HeatTerm[] = [];
  const failures: H01CoolingHeatLoadFailure[] = [];
  for (const rawLoad of rawLoads) {
    const loadResult = readHeatTerm(rawLoad, "Pother");
    if (!loadResult.ok) {
      failures.push(loadResult.result);
      continue;
    }
    loads.push(loadResult.term);
  }
  if (failures.length > 0) {
    const selectedFailure =
      failures.find((candidate) => candidate.status === "invalid_input") ??
      failures.find((candidate) => candidate.status === "not_applicable") ??
      failures[0]!;
    return Object.freeze({
      ok: false,
      result: selectedFailure,
      loads: Object.freeze(loads),
    });
  }
  return Object.freeze({
    ok: true,
    status: record.enumerationStatus,
    enumerationSourceRef: record.enumerationSourceRef,
    loads: Object.freeze(loads),
  });
}

type OverlapReadResult =
  | Readonly<{ readonly ok: true; readonly assessment: H01OverlapAssessment }>
  | Readonly<{
      readonly ok: false;
      readonly result: H01CoolingHeatLoadFailure;
    }>;

function readAssessedPathIds(value: unknown): readonly string[] | null {
  const values = readExactPlainDataArray(value);
  if (
    values === null ||
    values.some((item) => !isStableIdentifier(item))
  ) {
    return null;
  }
  return Object.freeze(values as string[]);
}

function readOverlapAssessment(value: unknown): OverlapReadResult {
  const confirmed = readExactPlainDataRecord(value, [
    "status",
    "assessedHeatPathIds",
    "physicalSourceIdentityChecked",
    "assessmentSourceRef",
  ]);
  if (confirmed !== null && confirmed.status === "confirmed_pairwise_disjoint") {
    const pathIds = readAssessedPathIds(confirmed.assessedHeatPathIds);
    if (
      pathIds === null ||
      confirmed.physicalSourceIdentityChecked !== true ||
      !isStableIdentifier(confirmed.assessmentSourceRef)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-01.overlap_assessment_schema_invalid",
          "The confirmed overlap assessment is malformed or does not check physical source identity.",
          "Provide the exact assessed path set, physicalSourceIdentityChecked=true, and a stable assessment source.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      assessment: Object.freeze({
        status: "confirmed_pairwise_disjoint",
        assessedHeatPathIds: pathIds,
        physicalSourceIdentityChecked: true,
        assessmentSourceRef: confirmed.assessmentSourceRef,
      }),
    });
  }

  const duplicate = readExactPlainDataRecord(value, [
    "status",
    "assessedHeatPathIds",
    "physicalSourceIdentityChecked",
    "assessmentSourceRef",
    "overlapDescription",
  ]);
  if (duplicate !== null && duplicate.status === "duplicate_or_overlap_present") {
    const pathIds = readAssessedPathIds(duplicate.assessedHeatPathIds);
    if (
      pathIds === null ||
      duplicate.physicalSourceIdentityChecked !== true ||
      !isStableIdentifier(duplicate.assessmentSourceRef) ||
      !isNonBlankText(duplicate.overlapDescription)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-01.overlap_assessment_schema_invalid",
          "The duplicate/overlap assessment is malformed.",
          "Provide checked path IDs, stable assessment provenance, and a nonblank overlap description.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      assessment: Object.freeze({
        status: "duplicate_or_overlap_present",
        assessedHeatPathIds: pathIds,
        physicalSourceIdentityChecked: true,
        assessmentSourceRef: duplicate.assessmentSourceRef,
        overlapDescription: duplicate.overlapDescription,
      }),
    });
  }

  const unknown = readExactPlainDataRecord(value, [
    "status",
    "assessedHeatPathIds",
    "physicalSourceIdentityChecked",
    "assessmentSourceRef",
    "reason",
  ]);
  if (unknown !== null && unknown.status === "unknown_or_unconfirmed") {
    const pathIds = readAssessedPathIds(unknown.assessedHeatPathIds);
    if (
      pathIds === null ||
      (unknown.physicalSourceIdentityChecked !== false &&
        unknown.physicalSourceIdentityChecked !== null) ||
      !isStableIdentifier(unknown.assessmentSourceRef) ||
      !isNonBlankText(unknown.reason)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-01.overlap_assessment_schema_invalid",
          "The unresolved overlap assessment is malformed.",
          "Provide explicit unresolved evidence with a checked path list, reason, and stable source.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      assessment: Object.freeze({
        status: "unknown_or_unconfirmed",
        assessedHeatPathIds: pathIds,
        physicalSourceIdentityChecked:
          unknown.physicalSourceIdentityChecked,
        assessmentSourceRef: unknown.assessmentSourceRef,
        reason: unknown.reason,
      }),
    });
  }

  const missing = value === null || value === undefined;
  return Object.freeze({
    ok: false,
    result: failure(
      missing ? "insufficient_data" : "invalid_input",
      missing
        ? "H-01.overlap_assessment_missing"
        : "H-01.overlap_assessment_schema_invalid",
      "H-01 requires an exact path-overlap assessment.",
      "Declare confirmed disjoint, known overlap, or unresolved status with the exact assessed path set and provenance.",
    ),
  });
}

type MarginReadResult =
  | Readonly<{ readonly ok: true; readonly status: "not_requested" }>
  | Readonly<{
      readonly ok: false;
      readonly result: H01CoolingHeatLoadFailure;
    }>;

function readDesignMargin(value: unknown): MarginReadResult {
  const notRequested = readExactPlainDataRecord(value, ["status"]);
  if (notRequested !== null && notRequested.status === "not_requested") {
    return Object.freeze({ ok: true, status: "not_requested" });
  }
  const requested = readExactPlainDataRecord(value, [
    "status",
    "scenarioId",
    "sourceRef",
    "mathematicalDefinition",
  ]);
  if (requested !== null && requested.status === "requested") {
    if (
      !isStableIdentifier(requested.scenarioId) ||
      !isStableIdentifier(requested.sourceRef) ||
      requested.mathematicalDefinition !== "not_frozen"
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-01.design_margin_route_unresolved",
          "The requested design-margin scenario is malformed or claims an unfrozen mathematical definition.",
          "Use mathematicalDefinition=not_frozen and wait for a controlled specification of the margin operator and parameter semantics.",
        ),
      });
    }
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "H-01.design_margin_route_unresolved",
        "A design margin was requested, but the frozen H-01 basis defines no unique mathematical operator or coefficient semantics.",
        "Publish the physical base heat load only in a no-margin scenario, or approve a controlled design-margin equation before requesting margin application.",
      ),
    });
  }
  const unknown = readExactPlainDataRecord(value, ["status", "reason"]);
  if (
    unknown !== null &&
    unknown.status === "unknown_or_unconfirmed" &&
    isNonBlankText(unknown.reason)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "H-01.design_margin_route_unresolved",
        "The design-margin scenario status is unresolved.",
        "Explicitly select not_requested, or supply a controlled margin specification after the release gate is closed.",
      ),
    });
  }
  return Object.freeze({
    ok: false,
    result: failure(
      "invalid_input",
      "H-01.design_margin_route_unresolved",
      "design_margin must use one exact controlled scenario discriminator.",
      "Use not_requested, requested with mathematicalDefinition=not_frozen, or unknown_or_unconfirmed with a reason.",
    ),
  });
}

function hasSameBoundary(
  term: H01HeatTerm,
  controlVolume: Readonly<H01ControlVolumeEvidence>,
): boolean {
  return (
    term.controlVolumeId === controlVolume.controlVolumeId &&
    term.coolantCircuitId === controlVolume.coolantCircuitId &&
    term.caseSnapshotId === controlVolume.caseSnapshotId &&
    term.timeBasisId === controlVolume.timeBasisId
  );
}

function setsExactlyEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === left.length &&
    rightSet.size === right.length &&
    [...leftSet].every((value) => rightSet.has(value))
  );
}

function includedProvenance(
  term: H01KnownApplicableHeatTerm,
): H01IncludedItemProvenance {
  return Object.freeze({
    disposition: "included",
    inputId: term.inputId,
    heatSourceClass: term.heatSourceClass as H01AllowedHeatSourceClass,
    valueW: term.valueW,
    sourceMethod: term.sourceMethod as H01TermSourceMethod,
    sourceRef: term.sourceRef,
    dataQuality: term.dataQuality as Exclude<DataQuality, "unknown">,
    provenanceId: term.provenanceId,
    sourceSnapshotId: term.sourceSnapshotId,
    heatPathId: term.heatPathId,
    physicalHeatSourceId: term.physicalHeatSourceId,
  });
}

function excludedProvenance(
  term: H01SourceConfirmedNotApplicableHeatTerm,
): H01ExcludedItemProvenance {
  return Object.freeze({
    disposition: "source_confirmed_not_applicable",
    inputId: term.inputId,
    heatSourceClass: term.heatSourceClass as H01AllowedHeatSourceClass,
    sourceMethod: term.sourceMethod as H01TermSourceMethod,
    sourceRef: term.sourceRef,
    dataQuality: term.dataQuality as Exclude<DataQuality, "unknown">,
    provenanceId: term.provenanceId,
    sourceSnapshotId: term.sourceSnapshotId,
    heatPathId: term.heatPathId,
    physicalHeatSourceId: term.physicalHeatSourceId,
    reason: term.reason,
    resolutionSourceRef: term.resolutionSourceRef,
  });
}

/** Isolated canonical-SI evaluation of frozen method H-01. */
export function evaluateH01CoolingHeatLoad(
  input: unknown,
): H01CoolingHeatLoadOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "controlVolume",
    "Pcu",
    "Qpickup_to_coil",
    "Pmag",
    "Pother",
    "overlapAssessment",
    "design_margin",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "H-01.input_schema_invalid",
      "H-01 input must be one exact controlled plain-data record.",
      "Provide controlVolume, Pcu, Qpickup_to_coil, Pmag, Pother, overlapAssessment, and design_margin without missing, extra, accessor, symbol, or coercible fields.",
    );
  }

  const controlVolumeResult = readControlVolume(controlledInput.controlVolume);
  const fixedDefinitions = Object.freeze([
    Object.freeze({ inputId: "Pcu" as const, value: controlledInput.Pcu }),
    Object.freeze({
      inputId: "Qpickup_to_coil" as const,
      value: controlledInput.Qpickup_to_coil,
    }),
    Object.freeze({ inputId: "Pmag" as const, value: controlledInput.Pmag }),
  ]);
  const fixedResults = fixedDefinitions.map((definition) =>
    readHeatTerm(definition.value, definition.inputId),
  );
  const otherLoadsResult = readOtherLoads(controlledInput.Pother);
  const overlapResult = readOverlapAssessment(
    controlledInput.overlapAssessment,
  );
  const marginResult = readDesignMargin(controlledInput.design_margin);

  // Parse every controlled record before applying any engineering disposition.
  // This prevents a known/unknown classification in an early field from
  // concealing a malformed enum, identifier or schema in a later field.
  const parseFailures: H01CoolingHeatLoadFailure[] = [];
  if (!controlVolumeResult.ok) parseFailures.push(controlVolumeResult.result);
  for (const termResult of fixedResults) {
    if (!termResult.ok) parseFailures.push(termResult.result);
  }
  if (!otherLoadsResult.ok) parseFailures.push(otherLoadsResult.result);
  if (!overlapResult.ok) parseFailures.push(overlapResult.result);
  if (!marginResult.ok) parseFailures.push(marginResult.result);
  const invalidParseFailure = parseFailures.find(
    (candidate) => candidate.status === "invalid_input",
  );
  if (invalidParseFailure !== undefined) {
    return invalidParseFailure;
  }

  const mutableTerms: H01HeatTerm[] = [];
  for (const termResult of fixedResults) {
    if (termResult.ok) mutableTerms.push(termResult.term);
  }
  mutableTerms.push(...otherLoadsResult.loads);
  const terms = Object.freeze(mutableTerms);

  if (controlVolumeResult.ok) {
    for (const term of terms) {
      if (hasSameBoundary(term, controlVolumeResult.controlVolume)) continue;
      return failure(
        "invalid_input",
        "H-01.heat_term_boundary_mismatch",
        term.inputId + " path " + term.heatPathId + " does not match the declared circuit/control volume, case snapshot, or time basis.",
        "Resolve every heat term from the exact same circuit, control volume, case snapshot, and time basis before summation.",
      );
    }
  }

  // Known exclusions and duplicate facts outrank every unresolved engineering
  // state, but only after all schemas/enums have passed the global audit above.
  const forbiddenTerm = terms.find((term) =>
    isForbiddenHeatSourceClass(term.heatSourceClass),
  );
  if (forbiddenTerm !== undefined) {
    return failure(
      "not_applicable",
      "H-01.forbidden_heat_class_not_applicable",
      forbiddenTerm.inputId + " is classified as " + forbiddenTerm.heatSourceClass + ", which is outside the coil coolant-load balance.",
      "Remove useful workpiece heat, ambient loss, reactive power, plant-wide loss, and grid/converter loss from this coolant circuit.",
      [
        warning(
          H01_WARNING_PREDICATES.forbiddenHeatClass,
          "A forbidden heat or power class was offered to the coil coolant-load control volume.",
        ),
      ],
    );
  }
  if (
    controlVolumeResult.ok &&
    controlVolumeResult.controlVolume.forbiddenHeatClassesExcludedConfirmed ===
      false
  ) {
    return failure(
      "not_applicable",
      "H-01.control_volume_not_applicable",
      "The control-volume declaration includes a forbidden heat or power class.",
      "Separate useful workpiece heat, ambient loss, reactive power, and plant/grid losses from the coil coolant load.",
      [
        warning(
          H01_WARNING_PREDICATES.forbiddenHeatClass,
          "The control-volume boundary does not exclude forbidden heat classes.",
        ),
      ],
    );
  }
  if (
    overlapResult.ok &&
    overlapResult.assessment.status === "duplicate_or_overlap_present"
  ) {
    return failure(
      "not_applicable",
      "H-01.overlap_or_duplicate_present",
      "The explicit overlap assessment identifies duplicate or overlapping cooled-load paths.",
      "Resolve the overlap and repeat the pairwise-disjoint assessment before summation.",
    );
  }

  const allPathIds = terms.map((term) => term.heatPathId);
  const allPhysicalSourceIds = terms.map(
    (term) => term.physicalHeatSourceId,
  );
  if (
    new Set(allPathIds).size !== allPathIds.length ||
    new Set(allPhysicalSourceIds).size !== allPhysicalSourceIds.length
  ) {
    return failure(
      "not_applicable",
      "H-01.overlap_or_duplicate_present",
      "H-01 input records reuse a heat-path ID or physical heat-source identity, including source-confirmed excluded records.",
      "Deduplicate the complete control-volume inventory and retain every physical heat source and boundary path exactly once before assigning inclusion or exclusion.",
    );
  }

  if (
    controlVolumeResult.ok &&
    (controlVolumeResult.controlVolume.circuitScope ===
      "multiple_circuits_or_aggregate" ||
      controlVolumeResult.controlVolume
        .multiCircuitAggregationAbsentConfirmed === false)
  ) {
    return failure(
      "not_applicable",
      "H-01.multiple_circuits_not_applicable",
      "The declared boundary combines multiple coolant circuits.",
      "Evaluate each coolant circuit separately before any explicitly specified system-level aggregation.",
    );
  }

  const misroutedKnownTerm = terms.find(
    (term) =>
      term.kind === "known_applicable" &&
      term.heatDestination !== "declared_coil_coolant_circuit" &&
      term.heatDestination !== "unknown_or_unconfirmed",
  );
  if (misroutedKnownTerm !== undefined) {
    return failure(
      "not_applicable",
      "H-01.heat_destination_not_applicable",
      misroutedKnownTerm.inputId + " does not enter the declared coil coolant circuit.",
      "Move the term to its actual energy boundary or represent it as source-confirmed not applicable.",
      misroutedKnownTerm.heatDestination === "workpiece" ||
      misroutedKnownTerm.heatDestination === "ambient_environment" ||
      misroutedKnownTerm.heatDestination === "plant_or_grid"
        ? [
            warning(
              H01_WARNING_PREDICATES.forbiddenHeatClass,
              "A heat term was routed to a forbidden coolant-load destination.",
            ),
          ]
        : EMPTY_WARNINGS,
    );
  }

  const includedTerms = Object.freeze(
    terms.filter(
      (term): term is H01KnownApplicableHeatTerm =>
        term.kind === "known_applicable",
    ),
  );
  const excludedTerms = Object.freeze(
    terms.filter(
      (term): term is H01SourceConfirmedNotApplicableHeatTerm =>
        term.kind === "source_confirmed_not_applicable",
    ),
  );
  if (parseFailures.length > 0) {
    return parseFailures[0]!;
  }
  const pathIds = includedTerms.map((term) => term.heatPathId);
  if (
    overlapResult.ok &&
    overlapResult.assessment.status === "confirmed_pairwise_disjoint" &&
    !setsExactlyEqual(overlapResult.assessment.assessedHeatPathIds, pathIds)
  ) {
    return failure(
      "invalid_input",
      "H-01.overlap_assessment_path_set_mismatch",
      "The overlap assessment does not cover exactly the included heat-path set.",
      "Regenerate the overlap assessment from the same included path inventory without omissions, extras, or duplicates.",
    );
  }

  if (
    !controlVolumeResult.ok ||
    !otherLoadsResult.ok ||
    !overlapResult.ok ||
    !marginResult.ok
  ) {
    return failure(
      "insufficient_data",
      "H-01.control_volume_incomplete",
      "A controlled H-01 evidence branch remains unavailable.",
      "Resolve every required source-bound branch before summation.",
    );
  }
  const controlVolume = controlVolumeResult.controlVolume;
  const overlapAssessment = overlapResult.assessment;

  if (
    controlVolume.heatDestination === "other_or_unconfirmed" ||
    controlVolume.circuitScope === "unknown_or_unconfirmed" ||
    controlVolume.multiCircuitAggregationAbsentConfirmed === null
  ) {
    return failure(
      "insufficient_data",
      "H-01.control_volume_unknown",
      "The coolant destination or circuit scope is unresolved.",
      "Confirm one declared coil coolant circuit and exclude unmodelled multi-circuit aggregation.",
    );
  }
  if (controlVolume.forbiddenHeatClassesExcludedConfirmed === null) {
    return failure(
      "insufficient_data",
      "H-01.control_volume_unknown",
      "Exclusion of forbidden heat classes is unresolved.",
      "Confirm the coolant boundary exclusions before summation.",
    );
  }
  if (controlVolume.boundaryCompleteConfirmed !== true) {
    return failure(
      "insufficient_data",
      "H-01.control_volume_incomplete",
      "The control volume does not confirm a complete enumeration of applicable heat sources.",
      "Resolve all applicable sources; do not publish a known subtotal as Qcool.",
    );
  }

  const unknownClassTerm = terms.find(
    (term) => term.heatSourceClass === "unknown_or_unconfirmed",
  );
  if (unknownClassTerm !== undefined) {
    return failure(
      "insufficient_data",
      "H-01.heat_term_classification_unknown",
      unknownClassTerm.inputId + " has no confirmed heat-source classification.",
      "Classify the heat source before deciding whether it enters the declared coolant circuit.",
    );
  }
  const designMarginTerm = terms.find(
    (term) => term.sourceMethod === "design_margin",
  );
  if (designMarginTerm !== undefined) {
    return failure(
      "insufficient_data",
      "H-01.design_margin_route_unresolved",
      designMarginTerm.inputId + " is routed as design margin even though design-margin arithmetic is not frozen.",
      "Provide a physical measurement, analytical estimate, or FEM result for the physical term; keep margin as a separate explicit scenario gate.",
    );
  }
  const unknownProvenanceTerm = terms.find(
    (term) =>
      term.sourceMethod === "unknown_or_unconfirmed" ||
      term.dataQuality === "unknown",
  );
  if (unknownProvenanceTerm !== undefined) {
    return failure(
      "insufficient_data",
      "H-01.heat_term_provenance_insufficient",
      unknownProvenanceTerm.inputId + " has unresolved source method or data quality.",
      "Bind the term to measurement, analytical_estimate, or FEM provenance with non-unknown data quality.",
    );
  }
  const unknownTerm = terms.find((term) => term.kind === "unknown_applicable");
  if (unknownTerm !== undefined) {
    return failure(
      "insufficient_data",
      "H-01.unknown_applicable_heat_source",
      unknownTerm.inputId + " path " + unknownTerm.heatPathId + " is applicable but unresolved.",
      "Resolve the heat rate or source-confirm that the path is not applicable; never substitute zero or publish the known subtotal.",
    );
  }
  const unknownDestinationTerm = terms.find(
    (term) => term.heatDestination === "unknown_or_unconfirmed",
  );
  if (unknownDestinationTerm !== undefined) {
    return failure(
      "insufficient_data",
      "H-01.heat_term_classification_unknown",
      unknownDestinationTerm.inputId + " has no confirmed heat destination.",
      "Confirm whether the heat enters the declared coolant circuit.",
    );
  }
  if (otherLoadsResult.status === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "H-01.other_loads_enumeration_unknown",
      "The Pother load enumeration remains unresolved.",
      "Complete the source-bound inventory of other cooled loads; an empty or partial known list is not a complete Qcool.",
    );
  }
  if (overlapAssessment.status === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "H-01.overlap_assessment_unknown",
      "Path overlap or physical source identity remains unresolved.",
      "Confirm pairwise-disjoint path and physical-source accounting before summation.",
    );
  }

  let totalW = 0;
  const substitutionTerms: Array<Readonly<{
    readonly inputId: H01InputId;
    readonly heatPathId: string;
    readonly valueW: number;
  }>> = [];
  for (const term of includedTerms) {
    const nextTotalW = totalW + term.valueW;
    if (!Number.isFinite(nextTotalW)) {
      return failure(
        "invalid_input",
        "H-01.numeric_overflow",
        "The ordered H-01 canonical-SI sum overflowed binary64.",
        "Rescale only outside the canonical calculation boundary or provide representable source values; H-01 never clamps Infinity.",
      );
    }
    if (
      term.valueW > 0 &&
      totalW > 0 &&
      (nextTotalW === totalW || nextTotalW === term.valueW)
    ) {
      return failure(
        "invalid_input",
        "H-01.numeric_term_swallowed",
        "A positive heat-load term or prior positive subtotal was swallowed by binary64 addition.",
        "Provide a numerically resolvable canonical-SI inventory; H-01 does not silently discard positive sources or reorder the frozen equation.",
      );
    }
    if (nextTotalW > 0 && nextTotalW < H01_BINARY64_MIN_NORMAL) {
      return failure(
        "invalid_input",
        "H-01.heat_term_numeric_resolution_invalid",
        "The H-01 subtotal became positive subnormal binary64.",
        "Provide representable normal source terms; do not flush or round the subtotal.",
      );
    }
    totalW = nextTotalW;
    substitutionTerms.push(
      Object.freeze({
        inputId: term.inputId,
        heatPathId: term.heatPathId,
        valueW: term.valueW,
      }),
    );
  }

  const perItemProvenance = Object.freeze(
    terms.map((term) =>
      term.kind === "known_applicable"
        ? includedProvenance(term)
        : excludedProvenance(
            term as H01SourceConfirmedNotApplicableHeatTerm,
          ),
    ),
  );
  const includedPathIds = Object.freeze([...pathIds]);
  const excludedPathIds = Object.freeze(
    excludedTerms.map((term) => term.heatPathId),
  );
  const sourceSnapshotIds = Object.freeze(
    [...new Set(terms.map((term) => term.sourceSnapshotId))],
  );

  return Object.freeze({
    methodId: H01_METHOD_ID,
    methodVersion: H01_METHOD_VERSION,
    methodApproval: "approved",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      Qcool: Object.freeze({
        outputId: "Qcool",
        valueSi: totalW,
        dimensionId: "power",
        canonicalUnitId: "W",
        interpretation:
          "heat_entering_one_declared_coil_coolant_circuit",
      }),
      perItemProvenance,
      unaccountedItems: Object.freeze([]) as readonly [],
    }),
    equation: "Qcool = Pcu + Qpickup_to_coil + Pmag + sum(Pother)",
    substitution: Object.freeze({
      orderedIncludedTerms: Object.freeze(substitutionTerms),
      basePhysicalHeatLoadW: totalW,
      designMarginStatus: marginResult.status,
    }),
    inputSnapshot: Object.freeze({
      controlVolumeId: controlVolume.controlVolumeId,
      coolantCircuitId: controlVolume.coolantCircuitId,
      caseSnapshotId: controlVolume.caseSnapshotId,
      timeBasisId: controlVolume.timeBasisId,
      includedHeatPathIds: includedPathIds,
      excludedHeatPathIds: excludedPathIds,
      sourceSnapshotIds,
    }),
    evidence: Object.freeze({
      controlVolume,
      heatTerms: terms,
      otherLoadEnumerationSourceRef:
        otherLoadsResult.enumerationSourceRef,
      overlapAssessment,
    }),
    applicabilityChecks: Object.freeze([
      "one explicit coil-coolant circuit and control volume",
      "all applicable heat sources are resolved or source-confirmed not applicable",
      "only copper loss, external pickup, magnetic-material loss and other explicit cooled loads enter the sum",
      "all included paths share case snapshot and time basis",
      "included heat paths and physical source identities are pairwise disjoint",
      "design margin is not requested because its arithmetic is not frozen",
    ]) as H01CoolingHeatLoadSuccess["applicabilityChecks"],
    solverResiduals: Object.freeze({
      solverUsed: false,
      classification: "analytical_ordered_nonnegative_sum",
    }),
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_input_precision_provenance_and_control_volume_completeness",
    }),
    assumptions: Object.freeze([
      "positive heat rate is into the declared coolant circuit",
      "source-confirmed not-applicable terms do not enter the sum",
      "unknown applicable terms are never replaced by zero",
      "useful workpiece heat, ambient loss, reactive power and plant-wide loss are excluded",
      "multiple coolant circuits are evaluated separately",
    ]) as H01CoolingHeatLoadSuccess["assumptions"],
    sourceRefs: H01_SOURCE_REFS,
    contractSourceRefs: H01_CONTRACT_SOURCE_REFS,
    derivationRefs: H01_DERIVATION_REFS,
    validationCaseIds: H01_VALIDATION_CASE_IDS,
    methodCheckIds: H01_METHOD_CHECK_IDS,
    mapping: H01_METHOD_MAPPING,
    numericAccumulationPolicy: H01_NUMERIC_ACCUMULATION_POLICY,
  });
}
