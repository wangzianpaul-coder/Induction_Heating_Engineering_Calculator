/**
 * J-06 total steady-state heat loss for one explicit control volume.
 *
 * This module is intentionally isolated from the runtime and public API. It
 * sums only explicit, independently classified heat-loss paths. An unresolved
 * applicable path makes Qloss_total unavailable; it is never replaced by zero
 * and no known subtotal is published as the total.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
  parameterId,
  sourceRef,
} from "../../domain/ids.js";
import {
  QUANTITY_SOURCE_KINDS,
  type QuantitySourceKind,
} from "../../domain/quantity.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "../../registries/parameterCatalog.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-06"));

export const J06_METHOD_ID = "J-06" as const;
export const J06_METHOD_VERSION = SPECIFICATION.methodVersion;
export const J06_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const J06_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const J06_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const J06_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const J06_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/**
 * Machine-arithmetic audit policy for the frozen ordered five-term sum. The
 * compensated path is diagnostic only: it never replaces or rearranges the
 * source equation's published result.
 */
export const J06_NUMERIC_ACCUMULATION_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  orderedRoundoffRecoveryPolicy: "fail_closed_if_published_sum_changes" as const,
  exactSubnormalInputTermCopyAllowed: true as const,
  sourceEquationRearranged: false as const,
});

const REGISTERED_J06_PARAMETER_IDS = Object.freeze(
  PARAMETER_REGISTRY.values()
    .filter((record) =>
      record.consumingMethods.some(
        (candidate) => candidate === J06_METHOD_ID,
      ),
    )
    .map((record) => record.parameterId),
);

const REGISTERED_CONTRACT_INPUT_IDS = Object.freeze(
  SPECIFICATION.inputParameterIds.filter(
    (candidate) =>
      PARAMETER_REGISTRY.find(parameterId(candidate)) !== undefined,
  ),
);

/**
 * Controlled release gates discovered without editing the owning registries.
 * They keep this isolated implementation non-activatable.
 */
export const J06_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  openGates: Object.freeze([
    Object.freeze({
      gateId: "J-06.stable-warning-ids" as const,
      reason:
        "The frozen registry supplies warning prose but no stable warning IDs; J-06 does not invent IDs." as const,
    }),
    Object.freeze({
      gateId: "J-06.parameter-dictionary-contract-alignment" as const,
      reason:
        "The J-06 contract input IDs are absent from the controlled parameter registry, while thermal.effective_length declares J-06 as a consumer but is not a J-06 contract input." as const,
      contractInputIds: SPECIFICATION.inputParameterIds,
      registeredContractInputIds: REGISTERED_CONTRACT_INPUT_IDS,
      parameterIdsDeclaringJ06Consumer: REGISTERED_J06_PARAMETER_IDS,
    }),
    Object.freeze({
      gateId: "J-06.primary-unavailable-publication-adapter" as const,
      reason:
        "UI and report adapters must confirm presentation of a successful method envelope whose primary Qloss_total output is explicitly unavailable while missing_items and boundary remain available." as const,
    }),
  ]),
});

export const J06_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: J06_SOURCE_REFS,
  contractSourceRefs: J06_CONTRACT_SOURCE_REFS,
  derivationRefs: J06_DERIVATION_REFS,
  validationCaseIds: J06_VALIDATION_CASE_IDS,
  methodCheckIds: J06_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericAccumulationPolicy: J06_NUMERIC_ACCUMULATION_POLICY,
  implementationReadiness: J06_IMPLEMENTATION_READINESS,
});

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `J-06 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const J06_WARNING_PREDICATES = Object.freeze({
  seriesPathHeatFlowsAdded: controlledWarningPredicate(
    "series-path heat flows are added" as const,
  ),
  unknownEndOrBridgeSetToZero: controlledWarningPredicate(
    "unknown end or bridge loss is set to zero" as const,
  ),
  pickupMixedWithAmbientLoss: controlledWarningPredicate(
    "inductive pickup and ambient heat loss are mixed" as const,
  ),
});

export type J06HeatLossInputId =
  | "Qconv"
  | "Qrad"
  | "Qends"
  | "Qbridges"
  | "Qopenings";

export type J06HeatPathMechanism =
  | "convection"
  | "radiation"
  | "end_loss"
  | "thermal_bridge"
  | "opening_loss";

export interface J06ControlVolumeEvidence {
  readonly controlVolumeId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly boundaryId: string;
  readonly timeBasisId: string;
  readonly analysisRegime: "steady_state";
  readonly positiveDirection:
    "outward_from_control_volume_to_ambient";
  readonly heatLossBoundaryConfirmed: true | false | null;
  readonly nonOverlappingPathAreasConfirmed: true | false | null;
  readonly noDuplicateHeatFlowPathsConfirmed: true | false | null;
  readonly seriesPathAggregationAbsentConfirmed: true | false | null;
  readonly pickupSeparatedFromAmbientLossConfirmed: true | false | null;
}

interface J06HeatPathBinding {
  readonly inputId: J06HeatLossInputId;
  readonly pathMechanism: J06HeatPathMechanism;
  readonly controlVolumeId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly boundaryId: string;
  readonly timeBasisId: string;
  readonly pathId: string;
}

export interface J06AvailableHeatLossTerm extends J06HeatPathBinding {
  readonly kind: "available";
  /** Signed heat rate in canonical SI watts; positive is outward loss. */
  readonly valueW: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly sourceKind: QuantitySourceKind;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly valueResolution:
    | "known_value"
    | "unknown_substituted_zero";
  readonly pathRelationship:
    | "parallel_independent_ambient_loss"
    | "series_transfer_stage"
    | "unconfirmed";
  readonly deduplicationStatus:
    | "confirmed_unique_not_counted_elsewhere"
    | "duplicate_or_overlapping"
    | "unconfirmed";
  readonly lossClassification:
    | "ambient_heat_loss"
    | "inductive_pickup_or_nonambient"
    | "unconfirmed";
}

export interface J06UnavailableHeatLossTerm extends J06HeatPathBinding {
  readonly kind: "unavailable";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly resolution:
    | "applicable_but_unresolved"
    | "confirmed_absent_from_control_volume";
}

export type J06HeatLossTerm =
  | J06AvailableHeatLossTerm
  | J06UnavailableHeatLossTerm;

export interface J06TotalSteadyHeatLossInput {
  readonly Qconv: J06HeatLossTerm;
  readonly Qrad: J06HeatLossTerm;
  readonly Qends: J06HeatLossTerm;
  readonly Qbridges: J06HeatLossTerm;
  readonly Qopenings: J06HeatLossTerm;
  readonly controlVolume: J06ControlVolumeEvidence;
}

export interface J06AvailableTotalHeatLossOutput {
  readonly kind: "available";
  readonly outputId: "Qloss_total";
  readonly valueSi: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly positiveDirection:
    "outward_from_control_volume_to_ambient";
  readonly interpretation:
    "net_outward_ambient_heat_loss_for_declared_control_volume";
}

export interface J06UnavailableTotalHeatLossOutput {
  readonly kind: "unavailable";
  readonly outputId: "Qloss_total";
  readonly status: "insufficient_data";
  readonly reason:
    "one or more applicable heat-loss paths are unresolved";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export type J06TotalHeatLossOutput =
  | J06AvailableTotalHeatLossOutput
  | J06UnavailableTotalHeatLossOutput;

export interface J06MissingItemsOutput {
  readonly kind: "available";
  readonly outputId: "missing_items";
  readonly value: readonly J06HeatLossInputId[];
  readonly interpretation:
    "applicable_heat_loss_paths_without_a_resolved_value";
}

export interface J06BoundaryOutput {
  readonly kind: "available";
  readonly outputId: "boundary";
  readonly value: Readonly<J06ControlVolumeEvidence>;
  readonly interpretation:
    "steady_state_outward_ambient_heat_loss_control_volume";
}

export interface J06Warning {
  readonly sourceMethodId: "J-06";
  readonly predicate:
    (typeof J06_WARNING_PREDICATES)[keyof typeof J06_WARNING_PREDICATES];
  readonly message: string;
}

export interface J06TotalSteadyHeatLossSuccess {
  readonly methodId: typeof J06_METHOD_ID;
  readonly methodVersion: typeof J06_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly QlossTotal: J06TotalHeatLossOutput;
    readonly missingItems: J06MissingItemsOutput;
    readonly boundary: J06BoundaryOutput;
  }>;
  readonly equation:
    "Qloss_total = Qconv + Qrad + Qends + Qbridges + Qopenings";
  readonly substitution: Readonly<{
    readonly resolution:
      | "complete_control_volume_sum"
      | "total_unavailable_due_to_unresolved_applicable_paths";
    readonly orderedTerms: readonly J06HeatLossTerm[];
    readonly knownSubtotalPublished: false;
  }>;
  readonly evidence: Readonly<{
    readonly controlVolume: Readonly<J06ControlVolumeEvidence>;
    readonly heatPaths: readonly J06HeatLossTerm[];
  }>;
  readonly sourceRefs: typeof J06_SOURCE_REFS;
  readonly contractSourceRefs: typeof J06_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof J06_DERIVATION_REFS;
  readonly validationCaseIds: typeof J06_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof J06_METHOD_CHECK_IDS;
  readonly numericAccumulationPolicy: typeof J06_NUMERIC_ACCUMULATION_POLICY;
  readonly assumptions: readonly [
    "all included heat rates use one control volume, boundary, time basis, and outward-positive convention",
    "included paths are parallel independent ambient-loss terms and are not duplicate or overlapping heat flows",
    "confirmed-not-applicable paths are absent from the declared control volume",
    "unresolved applicable paths make Qloss_total unavailable and are never replaced by zero",
  ];
  readonly mapping: typeof J06_METHOD_MAPPING;
  readonly failure?: never;
}

export type J06FailureCode =
  | "J-06.input_schema_invalid"
  | "J-06.control_volume_missing"
  | "J-06.control_volume_schema_invalid"
  | "J-06.control_volume_identifier_invalid"
  | "J-06.control_volume_not_applicable"
  | "J-06.control_volume_unconfirmed"
  | "J-06.series_path_aggregation_not_applicable"
  | "J-06.pickup_boundary_not_applicable"
  | "J-06.heat_path_missing"
  | "J-06.heat_path_schema_invalid"
  | "J-06.heat_path_binding_invalid"
  | "J-06.heat_path_value_invalid"
  | "J-06.heat_path_provenance_invalid"
  | "J-06.heat_path_boundary_mismatch"
  | "J-06.unknown_loss_substituted_zero"
  | "J-06.series_path_not_applicable"
  | "J-06.duplicate_or_overlapping_path"
  | "J-06.pickup_or_nonambient_path_not_applicable"
  | "J-06.heat_path_classification_unconfirmed"
  | "J-06.numeric_resolution_invalid";

export interface J06TotalSteadyHeatLossFailure {
  readonly methodId: typeof J06_METHOD_ID;
  readonly methodVersion: typeof J06_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly J06Warning[];
  readonly mapping: typeof J06_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: J06FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
}

export type J06TotalSteadyHeatLossOutcome =
  | J06TotalSteadyHeatLossSuccess
  | J06TotalSteadyHeatLossFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

const TERM_DEFINITIONS = Object.freeze([
  Object.freeze({
    inputId: "Qconv" as const,
    pathMechanism: "convection" as const,
  }),
  Object.freeze({
    inputId: "Qrad" as const,
    pathMechanism: "radiation" as const,
  }),
  Object.freeze({
    inputId: "Qends" as const,
    pathMechanism: "end_loss" as const,
  }),
  Object.freeze({
    inputId: "Qbridges" as const,
    pathMechanism: "thermal_bridge" as const,
  }),
  Object.freeze({
    inputId: "Qopenings" as const,
    pathMechanism: "opening_loss" as const,
  }),
] as const);

function warning(
  predicate: J06Warning["predicate"],
  message: string,
): J06Warning {
  return Object.freeze({ sourceMethodId: "J-06", predicate, message });
}

function failure(
  status: J06TotalSteadyHeatLossFailure["status"],
  code: J06FailureCode,
  message: string,
  action: string,
  warnings: readonly J06Warning[] = EMPTY_WARNINGS,
): J06TotalSteadyHeatLossFailure {
  return Object.freeze({
    methodId: J06_METHOD_ID,
    methodVersion: J06_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    mapping: J06_METHOD_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
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

function isNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isQuantitySourceKind(value: unknown): value is QuantitySourceKind {
  return (QUANTITY_SOURCE_KINDS as readonly unknown[]).includes(value);
}

function isDataQuality(value: unknown): value is DataQuality {
  return (DATA_QUALITIES as readonly unknown[]).includes(value);
}

function isTriStateConfirmation(
  value: unknown,
): value is true | false | null {
  return value === true || value === false || value === null;
}

type ControlVolumeReadResult =
  | Readonly<{
      readonly ok: true;
      readonly evidence: Readonly<J06ControlVolumeEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J06TotalSteadyHeatLossFailure;
    }>;

function readControlVolume(value: unknown): ControlVolumeReadResult {
  const record = readExactPlainDataRecord(value, [
    "controlVolumeId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "boundaryId",
    "timeBasisId",
    "analysisRegime",
    "positiveDirection",
    "heatLossBoundaryConfirmed",
    "nonOverlappingPathAreasConfirmed",
    "noDuplicateHeatFlowPathsConfirmed",
    "seriesPathAggregationAbsentConfirmed",
    "pickupSeparatedFromAmbientLossConfirmed",
  ]);
  if (record === null) {
    const missing = value === null || value === undefined;
    return Object.freeze({
      ok: false,
      result: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "J-06.control_volume_missing"
          : "J-06.control_volume_schema_invalid",
        "J-06 requires an exact, explicit steady-state control-volume boundary record.",
        "Provide immutable case/geometry snapshots, boundary and time-basis IDs, direction, and every tri-state applicability confirmation without defaults or extra fields.",
      ),
    });
  }
  if (
    !isStableIdentifier(record.controlVolumeId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableIdentifier(record.boundaryId) ||
    !isStableIdentifier(record.timeBasisId)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.control_volume_identifier_invalid",
        "The J-06 control volume is not bound to stable IDs and content-addressed case/geometry snapshots.",
        "Use stable machine IDs plus case:<64 lowercase SHA-256 hex> and geometry:<64 lowercase SHA-256 hex> snapshots.",
      ),
    });
  }
  if (
    record.analysisRegime !== "steady_state" ||
    record.positiveDirection !==
      "outward_from_control_volume_to_ambient" ||
    !isTriStateConfirmation(record.heatLossBoundaryConfirmed) ||
    !isTriStateConfirmation(record.nonOverlappingPathAreasConfirmed) ||
    !isTriStateConfirmation(record.noDuplicateHeatFlowPathsConfirmed) ||
    !isTriStateConfirmation(
      record.seriesPathAggregationAbsentConfirmed,
    ) ||
    !isTriStateConfirmation(
      record.pickupSeparatedFromAmbientLossConfirmed,
    )
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.control_volume_schema_invalid",
        "The J-06 boundary contains an uncontrolled regime, direction, or confirmation value.",
        "Use the frozen steady-state outward-positive boundary and explicit true, false, or null confirmations.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      controlVolumeId: record.controlVolumeId,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      boundaryId: record.boundaryId,
      timeBasisId: record.timeBasisId,
      analysisRegime: "steady_state" as const,
      positiveDirection:
        "outward_from_control_volume_to_ambient" as const,
      heatLossBoundaryConfirmed: record.heatLossBoundaryConfirmed,
      nonOverlappingPathAreasConfirmed:
        record.nonOverlappingPathAreasConfirmed,
      noDuplicateHeatFlowPathsConfirmed:
        record.noDuplicateHeatFlowPathsConfirmed,
      seriesPathAggregationAbsentConfirmed:
        record.seriesPathAggregationAbsentConfirmed,
      pickupSeparatedFromAmbientLossConfirmed:
        record.pickupSeparatedFromAmbientLossConfirmed,
    }),
  });
}

type HeatPathReadResult =
  | Readonly<{
      readonly ok: true;
      readonly term: J06HeatLossTerm;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J06TotalSteadyHeatLossFailure;
    }>;

function readAvailableHeatPath(
  value: unknown,
  expectedInputId: J06HeatLossInputId,
  expectedMechanism: J06HeatPathMechanism,
): HeatPathReadResult | null {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "pathMechanism",
    "valueW",
    "dimensionId",
    "canonicalUnitId",
    "sourceKind",
    "sourceRef",
    "dataQuality",
    "valueResolution",
    "controlVolumeId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "boundaryId",
    "timeBasisId",
    "pathId",
    "pathRelationship",
    "deduplicationStatus",
    "lossClassification",
  ]);
  if (record === null) {
    return null;
  }
  if (
    record.kind !== "available" ||
    record.inputId !== expectedInputId ||
    record.pathMechanism !== expectedMechanism ||
    record.dimensionId !== "power" ||
    record.canonicalUnitId !== "W"
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.heat_path_binding_invalid",
        `${expectedInputId} is not bound to its exact frozen mechanism and canonical-SI power identity.`,
        "Use the contract input ID, matching heat-path mechanism, dimension power, and canonical unit W without aliases or coercion.",
      ),
    });
  }
  if (
    typeof record.valueW !== "number" ||
    !Number.isFinite(record.valueW)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.heat_path_value_invalid",
        `${expectedInputId} must be a finite signed heat rate in canonical SI watts.`,
        "Resolve a finite same-boundary value; NaN, Infinity, coercion, and placeholders are forbidden.",
      ),
    });
  }
  if (
    !isQuantitySourceKind(record.sourceKind) ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-06.heat_path_provenance_invalid",
        `${expectedInputId} lacks controlled quantity provenance or data quality.`,
        "Attach an explicit controlled source kind, stable source reference, and data-quality classification.",
      ),
    });
  }
  if (
    (record.valueResolution !== "known_value" &&
      record.valueResolution !== "unknown_substituted_zero") ||
    (record.pathRelationship !==
      "parallel_independent_ambient_loss" &&
      record.pathRelationship !== "series_transfer_stage" &&
      record.pathRelationship !== "unconfirmed") ||
    (record.deduplicationStatus !==
      "confirmed_unique_not_counted_elsewhere" &&
      record.deduplicationStatus !== "duplicate_or_overlapping" &&
      record.deduplicationStatus !== "unconfirmed") ||
    (record.lossClassification !== "ambient_heat_loss" &&
      record.lossClassification !==
        "inductive_pickup_or_nonambient" &&
      record.lossClassification !== "unconfirmed") ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(
      record.geometrySnapshotId,
      "geometry",
    ) ||
    !isStableIdentifier(record.boundaryId) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.pathId)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.heat_path_binding_invalid",
        `${expectedInputId} contains uncontrolled boundary, resolution, path, or classification evidence.`,
        "Use stable IDs, content-addressed snapshots, and the exact J-06 path evidence discriminators.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    term: Object.freeze({
      kind: "available" as const,
      inputId: expectedInputId,
      pathMechanism: expectedMechanism,
      valueW: record.valueW,
      dimensionId: "power" as const,
      canonicalUnitId: "W" as const,
      sourceKind: record.sourceKind,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      valueResolution: record.valueResolution,
      controlVolumeId: record.controlVolumeId,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      boundaryId: record.boundaryId,
      timeBasisId: record.timeBasisId,
      pathId: record.pathId,
      pathRelationship: record.pathRelationship,
      deduplicationStatus: record.deduplicationStatus,
      lossClassification: record.lossClassification,
    }),
  });
}

function readUnavailableHeatPath(
  value: unknown,
  expectedInputId: J06HeatLossInputId,
  expectedMechanism: J06HeatPathMechanism,
): HeatPathReadResult | null {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "pathMechanism",
    "status",
    "reason",
    "resolutionSourceRef",
    "resolution",
    "controlVolumeId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "boundaryId",
    "timeBasisId",
    "pathId",
  ]);
  if (record === null) {
    return null;
  }
  if (
    record.kind !== "unavailable" ||
    record.inputId !== expectedInputId ||
    record.pathMechanism !== expectedMechanism ||
    (record.status !== "insufficient_data" &&
      record.status !== "not_applicable") ||
    !isNonBlankText(record.reason) ||
    !isStableIdentifier(record.resolutionSourceRef) ||
    (record.resolution !== "applicable_but_unresolved" &&
      record.resolution !==
        "confirmed_absent_from_control_volume") ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(
      record.geometrySnapshotId,
      "geometry",
    ) ||
    !isStableIdentifier(record.boundaryId) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.pathId)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.heat_path_binding_invalid",
        `${expectedInputId} unavailable evidence is malformed or not source-bound.`,
        "Use an exact unavailable discriminator with a stable resolution source and the same control-volume binding.",
      ),
    });
  }
  if (
    (record.status === "insufficient_data" &&
      record.resolution !== "applicable_but_unresolved") ||
    (record.status === "not_applicable" &&
      record.resolution !==
        "confirmed_absent_from_control_volume")
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-06.heat_path_binding_invalid",
        `${expectedInputId} availability status conflicts with its explicit boundary resolution.`,
        "Use insufficient_data only for an applicable unresolved path and not_applicable only for a source-confirmed absent path.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    term: Object.freeze({
      kind: "unavailable" as const,
      inputId: expectedInputId,
      pathMechanism: expectedMechanism,
      status: record.status,
      reason: record.reason,
      resolutionSourceRef: record.resolutionSourceRef,
      resolution: record.resolution,
      controlVolumeId: record.controlVolumeId,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      boundaryId: record.boundaryId,
      timeBasisId: record.timeBasisId,
      pathId: record.pathId,
    }),
  });
}

function readHeatPath(
  value: unknown,
  expectedInputId: J06HeatLossInputId,
  expectedMechanism: J06HeatPathMechanism,
): HeatPathReadResult {
  const available = readAvailableHeatPath(
    value,
    expectedInputId,
    expectedMechanism,
  );
  if (available !== null) {
    return available;
  }
  const unavailable = readUnavailableHeatPath(
    value,
    expectedInputId,
    expectedMechanism,
  );
  if (unavailable !== null) {
    return unavailable;
  }
  const missing = value === null || value === undefined;
  return Object.freeze({
    ok: false,
    result: failure(
      missing ? "insufficient_data" : "invalid_input",
      missing ? "J-06.heat_path_missing" : "J-06.heat_path_schema_invalid",
      `${expectedInputId} must use an exact available or unavailable heat-path discriminator.`,
      "Represent unresolved applicable paths explicitly; never use null, zero, NaN, an empty object, or a prior result as a placeholder.",
    ),
  });
}

function hasSameBoundary(
  term: J06HeatLossTerm,
  controlVolume: Readonly<J06ControlVolumeEvidence>,
): boolean {
  return (
    term.controlVolumeId === controlVolume.controlVolumeId &&
    term.caseSnapshotId === controlVolume.caseSnapshotId &&
    term.geometrySnapshotId === controlVolume.geometrySnapshotId &&
    term.boundaryId === controlVolume.boundaryId &&
    term.timeBasisId === controlVolume.timeBasisId
  );
}

function availableTotalOutput(
  valueSi: number,
): J06AvailableTotalHeatLossOutput {
  return Object.freeze({
    kind: "available",
    outputId: "Qloss_total",
    valueSi,
    dimensionId: "power",
    canonicalUnitId: "W",
    positiveDirection: "outward_from_control_volume_to_ambient",
    interpretation:
      "net_outward_ambient_heat_loss_for_declared_control_volume",
  });
}

function unavailableTotalOutput(): J06UnavailableTotalHeatLossOutput {
  return Object.freeze({
    kind: "unavailable",
    outputId: "Qloss_total",
    status: "insufficient_data",
    reason: "one or more applicable heat-loss paths are unresolved",
  });
}

/** Isolated canonical-SI evaluation of frozen method J-06. */
export function evaluateJ06TotalSteadyHeatLoss(
  input: unknown,
): J06TotalSteadyHeatLossOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "Qconv",
    "Qrad",
    "Qends",
    "Qbridges",
    "Qopenings",
    "controlVolume",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "J-06.input_schema_invalid",
      "J-06 input must be one exact controlled plain-data record containing all five path discriminators and one control volume.",
      "Provide Qconv, Qrad, Qends, Qbridges, Qopenings, and controlVolume without missing, extra, accessor, symbol, or coercible fields.",
    );
  }

  const controlVolumeResult = readControlVolume(
    controlledInput.controlVolume,
  );
  if (!controlVolumeResult.ok) {
    return controlVolumeResult.result;
  }
  const controlVolume = controlVolumeResult.evidence;

  const mutableTerms: J06HeatLossTerm[] = [];
  for (const definition of TERM_DEFINITIONS) {
    const pathResult = readHeatPath(
      controlledInput[definition.inputId],
      definition.inputId,
      definition.pathMechanism,
    );
    if (!pathResult.ok) {
      return pathResult.result;
    }
    if (!hasSameBoundary(pathResult.term, controlVolume)) {
      return failure(
        "invalid_input",
        "J-06.heat_path_boundary_mismatch",
        `${definition.inputId} does not match the declared control volume, case/geometry snapshot, boundary, or time basis.`,
        "Resolve every term from the exact same control-volume state before summation.",
      );
    }
    mutableTerms.push(pathResult.term);
  }
  const terms = Object.freeze(mutableTerms);

  if (controlVolume.seriesPathAggregationAbsentConfirmed === false) {
    return failure(
      "not_applicable",
      "J-06.series_path_aggregation_not_applicable",
      "The declared control volume attempts to add heat flows from series stages.",
      "Reduce each series path to one boundary heat flow before entering the independent control-volume sum.",
      [
        warning(
          J06_WARNING_PREDICATES.seriesPathHeatFlowsAdded,
          "Series-path heat flows are not independent loss terms and cannot be added by J-06.",
        ),
      ],
    );
  }
  if (controlVolume.pickupSeparatedFromAmbientLossConfirmed === false) {
    return failure(
      "not_applicable",
      "J-06.pickup_boundary_not_applicable",
      "Inductive pickup or another nonambient power path is mixed into the ambient heat-loss boundary.",
      "Separate pickup and ambient loss at explicit energy reference planes before evaluating J-06.",
      [
        warning(
          J06_WARNING_PREDICATES.pickupMixedWithAmbientLoss,
          "The requested boundary mixes inductive pickup with ambient heat loss.",
        ),
      ],
    );
  }
  if (
    controlVolume.heatLossBoundaryConfirmed === false ||
    controlVolume.nonOverlappingPathAreasConfirmed === false ||
    controlVolume.noDuplicateHeatFlowPathsConfirmed === false
  ) {
    return failure(
      "not_applicable",
      "J-06.control_volume_not_applicable",
      "The declared J-06 boundary is not an explicit non-overlapping, deduplicated ambient heat-loss control volume.",
      "Correct the control-volume path/area accounting before summation.",
    );
  }

  const pathIds = new Set<string>();
  for (const term of terms) {
    if (pathIds.has(term.pathId)) {
      return failure(
        "not_applicable",
        "J-06.duplicate_or_overlapping_path",
        `Heat path ${term.pathId} is represented more than once in the J-06 inputs.`,
        "Deduplicate the control-volume path list and retain exactly one term per independent heat-flow path.",
      );
    }
    pathIds.add(term.pathId);
  }

  for (const term of terms) {
    if (term.kind !== "available") {
      continue;
    }
    if (term.valueResolution === "unknown_substituted_zero") {
      const isEndOrBridge =
        term.inputId === "Qends" || term.inputId === "Qbridges";
      return failure(
        "invalid_input",
        "J-06.unknown_loss_substituted_zero",
        `${term.inputId} is labelled unknown but supplied as a numeric zero.`,
        "Use the explicit unavailable/insufficient_data discriminator and retain the missing item; do not publish Qloss_total.",
        isEndOrBridge
          ? [
              warning(
                J06_WARNING_PREDICATES.unknownEndOrBridgeSetToZero,
                "An unknown end or bridge loss was set to zero.",
              ),
            ]
          : EMPTY_WARNINGS,
      );
    }
    if (term.pathRelationship === "series_transfer_stage") {
      return failure(
        "not_applicable",
        "J-06.series_path_not_applicable",
        `${term.inputId} is a series transfer stage rather than an independent boundary loss.`,
        "Reduce the series path to one boundary heat flow before J-06 aggregation.",
        [
          warning(
            J06_WARNING_PREDICATES.seriesPathHeatFlowsAdded,
            "A series-stage heat flow was offered as an independently additive loss.",
          ),
        ],
      );
    }
    if (term.deduplicationStatus === "duplicate_or_overlapping") {
      return failure(
        "not_applicable",
        "J-06.duplicate_or_overlapping_path",
        `${term.inputId} is already included in another area or heat-flow path.`,
        "Resolve overlapping areas and duplicate paths before summing the control volume.",
      );
    }
    if (
      term.lossClassification === "inductive_pickup_or_nonambient"
    ) {
      return failure(
        "not_applicable",
        "J-06.pickup_or_nonambient_path_not_applicable",
        `${term.inputId} is classified as pickup or another nonambient power path.`,
        "Move the term to the matching energy boundary instead of ambient heat loss.",
        [
          warning(
            J06_WARNING_PREDICATES.pickupMixedWithAmbientLoss,
            "An inductive-pickup or nonambient term was mixed into J-06.",
          ),
        ],
      );
    }
  }

  if (
    controlVolume.heatLossBoundaryConfirmed === null ||
    controlVolume.nonOverlappingPathAreasConfirmed === null ||
    controlVolume.noDuplicateHeatFlowPathsConfirmed === null ||
    controlVolume.seriesPathAggregationAbsentConfirmed === null ||
    controlVolume.pickupSeparatedFromAmbientLossConfirmed === null
  ) {
    return failure(
      "insufficient_data",
      "J-06.control_volume_unconfirmed",
      "One or more control-volume applicability confirmations remain unresolved.",
      "Confirm the ambient-loss boundary, independent areas/paths, absence of series-stage aggregation, and pickup separation.",
    );
  }

  for (const term of terms) {
    if (
      term.kind === "available" &&
      (term.pathRelationship === "unconfirmed" ||
        term.deduplicationStatus === "unconfirmed" ||
        term.lossClassification === "unconfirmed")
    ) {
      return failure(
        "insufficient_data",
        "J-06.heat_path_classification_unconfirmed",
        `${term.inputId} does not yet prove independent, unique ambient-loss path status.`,
        "Resolve the path relationship, deduplication, and ambient-loss classification before aggregation.",
      );
    }
  }

  const missingItemValues = terms
    .filter(
      (term): term is J06UnavailableHeatLossTerm =>
        term.kind === "unavailable" &&
        term.status === "insufficient_data",
    )
    .map((term) => term.inputId);
  const missingItems = Object.freeze(missingItemValues);

  let totalOutput: J06TotalHeatLossOutput;
  let substitutionResolution:
    | "complete_control_volume_sum"
    | "total_unavailable_due_to_unresolved_applicable_paths";
  if (missingItems.length > 0) {
    totalOutput = unavailableTotalOutput();
    substitutionResolution =
      "total_unavailable_due_to_unresolved_applicable_paths";
  } else {
    let totalW = 0;
    let roundoffCompensationW = 0;
    for (const term of terms) {
      if (term.kind !== "available") {
        continue;
      }
      const previousW = totalW;
      const nextW = previousW + term.valueW;
      if (
        !Number.isFinite(nextW) ||
        (term.valueW !== 0 && nextW === previousW) ||
        (previousW !== 0 && nextW === term.valueW)
      ) {
        return failure(
          "invalid_input",
          "J-06.numeric_resolution_invalid",
          `The ${term.inputId} addition cannot be represented without overflow or loss of a nonzero term.`,
          "Use finite, representable canonical-SI heat rates or an approved higher-range calculation path; do not publish a rounded-away component.",
        );
      }

      // Neumaier's error recovery follows the same term order and is used only
      // to detect whether intermediate rounding would change the final sum.
      // It is never substituted for the frozen equation result.
      const additionRoundoffW =
        Math.abs(previousW) >= Math.abs(term.valueW)
          ? (previousW - nextW) + term.valueW
          : (term.valueW - nextW) + previousW;
      const nextCompensationW = roundoffCompensationW + additionRoundoffW;
      if (
        !Number.isFinite(additionRoundoffW) ||
        !Number.isFinite(nextCompensationW) ||
        (additionRoundoffW !== 0 &&
          nextCompensationW === roundoffCompensationW)
      ) {
        return failure(
          "invalid_input",
          "J-06.numeric_resolution_invalid",
          `The ${term.inputId} ordered addition generated roundoff that cannot be retained for a machine-representability audit.`,
          "Use finite, representable canonical-SI heat rates or an approved higher-precision calculation path; do not publish a cancellation-sensitive total.",
        );
      }
      roundoffCompensationW = nextCompensationW;
      totalW = nextW;
    }
    const recoveredOrderedSumW = totalW + roundoffCompensationW;
    if (
      !Number.isFinite(recoveredOrderedSumW) ||
      recoveredOrderedSumW !== totalW
    ) {
      return failure(
        "invalid_input",
        "J-06.numeric_resolution_invalid",
        "The frozen ordered heat-loss sum is cancellation-sensitive at binary64 precision; recovering its addition roundoff changes the publishable total.",
        "Use an approved higher-precision calculation path or rescale the independently sourced heat-rate terms; do not publish the rounded ordered total or a silently regrouped substitute.",
      );
    }
    totalOutput = availableTotalOutput(totalW);
    substitutionResolution = "complete_control_volume_sum";
  }

  const missingItemsOutput = Object.freeze({
    kind: "available" as const,
    outputId: "missing_items" as const,
    value: missingItems,
    interpretation:
      "applicable_heat_loss_paths_without_a_resolved_value" as const,
  });
  const boundaryOutput = Object.freeze({
    kind: "available" as const,
    outputId: "boundary" as const,
    value: controlVolume,
    interpretation:
      "steady_state_outward_ambient_heat_loss_control_volume" as const,
  });

  return Object.freeze({
    methodId: J06_METHOD_ID,
    methodVersion: J06_METHOD_VERSION,
    methodApproval: "approved" as const,
    status: "success" as const,
    applicabilityStatus: "in_domain" as const,
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      QlossTotal: totalOutput,
      missingItems: missingItemsOutput,
      boundary: boundaryOutput,
    }),
    equation:
      "Qloss_total = Qconv + Qrad + Qends + Qbridges + Qopenings" as const,
    substitution: Object.freeze({
      resolution: substitutionResolution,
      orderedTerms: terms,
      knownSubtotalPublished: false as const,
    }),
    evidence: Object.freeze({
      controlVolume,
      heatPaths: terms,
    }),
    sourceRefs: J06_SOURCE_REFS,
    contractSourceRefs: J06_CONTRACT_SOURCE_REFS,
    derivationRefs: J06_DERIVATION_REFS,
    validationCaseIds: J06_VALIDATION_CASE_IDS,
    methodCheckIds: J06_METHOD_CHECK_IDS,
    numericAccumulationPolicy: J06_NUMERIC_ACCUMULATION_POLICY,
    assumptions: Object.freeze([
      "all included heat rates use one control volume, boundary, time basis, and outward-positive convention",
      "included paths are parallel independent ambient-loss terms and are not duplicate or overlapping heat flows",
      "confirmed-not-applicable paths are absent from the declared control volume",
      "unresolved applicable paths make Qloss_total unavailable and are never replaced by zero",
    ] as const),
    mapping: J06_METHOD_MAPPING,
  });
}
