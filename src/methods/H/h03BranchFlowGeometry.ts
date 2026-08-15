/**
 * H-03 branch volume-flow, mean-velocity and hydraulic-diameter identities.
 *
 * The module is isolated from runtime activation. Equal splitting is accepted
 * only for an explicit parallel network whose geometry, resistance and
 * hydraulic balance are all confirmed. No velocity acceptance threshold is
 * embedded here; that belongs to an OEM or project specification.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-03"));

export const H03_METHOD_ID = "H-03" as const;
export const H03_METHOD_VERSION = SPECIFICATION.methodVersion;
export const H03_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const H03_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const H03_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const H03_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const H03_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const H03_BINARY64_MIN_NORMAL = 2 ** -1022;

export const H03_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  overflowPolicy: "fail_closed" as const,
  swallowedSplitFactorPolicy: "fail_closed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: H03_BINARY64_MIN_NORMAL,
});

export const H03_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  openMethodGates: Object.freeze([]) as readonly [],
  externalAssessmentBoundary:
    "velocity acceptance requires a separately sourced OEM or project specification" as const,
});

export const H03_PARAMETER_MAPPING = Object.freeze({
  branchVolumeFlow: Object.freeze({
    contractInputId: "Vdot_branch" as const,
    parameterId: "water.volume_flow" as const,
    requiredScope: "one_declared_branch" as const,
    dimensionId: "volume_flow_rate" as const,
    canonicalUnitId: "m3_per_s" as const,
  }),
  hydraulicArea: Object.freeze({
    contractInputId: "Ah" as const,
    parameterId: "coolant.flow_area" as const,
    d02OutputQuantityId: "Ahydraulic" as const,
    dimensionId: "area" as const,
    canonicalUnitId: "m2" as const,
  }),
  wettedPerimeter: Object.freeze({
    contractInputId: "Pwetted" as const,
    parameterId: "coolant.wetted_perimeter" as const,
    d02OutputQuantityId: "Pwetted" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
  velocity: Object.freeze({
    contractOutputId: "v" as const,
    parameterId: "water.velocity" as const,
    dimensionId: "velocity" as const,
    canonicalUnitId: "m_per_s" as const,
  }),
  hydraulicDiameter: Object.freeze({
    contractOutputId: "Dh" as const,
    parameterId: "coolant.hydraulic_diameter" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
});

export const H03_METHOD_MAPPING = Object.freeze({
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
  sourceRefs: H03_SOURCE_REFS,
  contractSourceRefs: H03_CONTRACT_SOURCE_REFS,
  derivationRefs: H03_DERIVATION_REFS,
  validationCaseIds: H03_VALIDATION_CASE_IDS,
  methodCheckIds: H03_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  parameterMapping: H03_PARAMETER_MAPPING,
  numericRepresentabilityPolicy: H03_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: H03_IMPLEMENTATION_READINESS,
});

const TOTAL_FLOW_TO_ONE_BRANCH_PREDICATE =
  "total flow is passed to one branch" as const;
const MASS_FLOW_AS_VELOCITY_PREDICATE =
  "mass flow is labelled velocity" as const;
const ASYMMETRIC_EQUAL_SPLIT_PREDICATE =
  "asymmetric branches are evenly split" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      "H-03 warning predicate is absent from the frozen contract: " + predicate,
    );
  }
  return predicate;
}

export const H03_WARNING_PREDICATES = Object.freeze({
  totalFlowToOneBranch: controlledWarningPredicate(
    TOTAL_FLOW_TO_ONE_BRANCH_PREDICATE,
  ),
  massFlowAsVelocity: controlledWarningPredicate(
    MASS_FLOW_AS_VELOCITY_PREDICATE,
  ),
  asymmetricEqualSplit: controlledWarningPredicate(
    ASYMMETRIC_EQUAL_SPLIT_PREDICATE,
  ),
});

export type H03FlowSourceMethod =
  | "measurement"
  | "H-02"
  | "H-05"
  | "case_input"
  | "unknown_or_unconfirmed";

export type H03FlowQuantityKind =
  | "volume_flow_rate"
  | "mass_flow_rate"
  | "velocity"
  | "unknown_or_unconfirmed";

interface H03FlowBoundary {
  readonly sourceMethod: H03FlowSourceMethod;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly branchId: string;
  readonly coolantNetworkId: string;
  readonly caseSnapshotId: string;
  readonly timeBasisId: string;
}

interface H03KnownFlowBase extends H03FlowBoundary {
  readonly valueSi: number;
  readonly quantityKind: H03FlowQuantityKind;
  readonly dimensionId:
    | "volume_flow_rate"
    | "mass_flow_rate"
    | "velocity"
    | "unknown_or_unconfirmed";
  readonly canonicalUnitId:
    | "m3_per_s"
    | "kg_per_s"
    | "m_per_s"
    | "unknown_or_unconfirmed";
  readonly valueResolution: "known_value" | "unknown_substituted_zero";
  readonly flowScope:
    | "one_declared_branch"
    | "total_network_flow"
    | "unknown_or_unconfirmed";
}

export interface H03ExplicitBranchVolumeFlow extends H03KnownFlowBase {
  readonly kind: "explicit_branch_volume_flow";
}

export interface H03EqualSplitTotalVolumeFlow extends H03KnownFlowBase {
  readonly kind: "equal_split_total_volume_flow";
  readonly branchCount: number;
  readonly targetBranchOrdinal: number;
  readonly networkTopology:
    | "parallel_branches"
    | "not_parallel_or_asymmetric_network"
    | "unknown_or_unconfirmed";
  readonly equalHydraulicGeometryConfirmed: true | false | null;
  readonly equalResistanceConfirmed: true | false | null;
  readonly hydraulicallyBalancedConfirmed: true | false | null;
}

export interface H03UnavailableFlow extends H03FlowBoundary {
  readonly kind: "unavailable";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type H03FlowEvidence =
  | H03ExplicitBranchVolumeFlow
  | H03EqualSplitTotalVolumeFlow
  | H03UnavailableFlow;

interface H03HydraulicGeometryBoundary {
  readonly sourceMethodId: "D-02";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
  readonly branchId: string;
  readonly coolantNetworkId: string;
  readonly hydraulicGeometryId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
}

export interface H03AvailableHydraulicArea
  extends H03HydraulicGeometryBoundary {
  readonly kind: "available";
  readonly contractInputId: "Ah";
  readonly parameterId: "coolant.flow_area";
  readonly sourceQuantityId: "Ahydraulic";
  readonly valueSi: number;
  readonly dimensionId: "area";
  readonly canonicalUnitId: "m2";
  readonly interpretation: "internal_coolant_flow_cross_section";
}

export interface H03AvailableWettedPerimeter
  extends H03HydraulicGeometryBoundary {
  readonly kind: "available";
  readonly contractInputId: "Pwetted";
  readonly parameterId: "coolant.wetted_perimeter";
  readonly sourceQuantityId: "Pwetted";
  readonly valueSi: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation: "internal_coolant_wetted_perimeter";
}

export interface H03UnavailableHydraulicGeometryQuantity
  extends H03HydraulicGeometryBoundary {
  readonly kind: "unavailable";
  readonly contractInputId: "Ah" | "Pwetted";
  readonly parameterId: "coolant.flow_area" | "coolant.wetted_perimeter";
  readonly sourceQuantityId: "Ahydraulic" | "Pwetted";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type H03HydraulicAreaEvidence =
  | H03AvailableHydraulicArea
  | H03UnavailableHydraulicGeometryQuantity;
export type H03WettedPerimeterEvidence =
  | H03AvailableWettedPerimeter
  | H03UnavailableHydraulicGeometryQuantity;

export interface H03HydraulicGeometryEvidence {
  readonly Ah: H03HydraulicAreaEvidence;
  readonly Pwetted: H03WettedPerimeterEvidence;
  readonly sameD02HydraulicGeometryConfirmed: true | false | null;
}

export interface H03BranchFlowGeometryInput {
  readonly flow: H03FlowEvidence;
  readonly hydraulicGeometry: H03HydraulicGeometryEvidence;
}

export interface H03Warning {
  readonly sourceMethodId: "H-03";
  readonly predicate:
    (typeof H03_WARNING_PREDICATES)[keyof typeof H03_WARNING_PREDICATES];
  readonly message: string;
}

export interface H03BranchFlowGeometrySuccess {
  readonly methodId: typeof H03_METHOD_ID;
  readonly methodVersion: typeof H03_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly v: Readonly<{
      readonly outputId: "v";
      readonly parameterId: "water.velocity";
      readonly valueSi: number;
      readonly dimensionId: "velocity";
      readonly canonicalUnitId: "m_per_s";
      readonly interpretation: "mean_velocity_in_declared_branch";
    }>;
    readonly Dh: Readonly<{
      readonly outputId: "Dh";
      readonly parameterId: "coolant.hydraulic_diameter";
      readonly valueSi: number;
      readonly dimensionId: "length";
      readonly canonicalUnitId: "m";
      readonly interpretation:
        "hydraulic_diameter_from_same_D02_area_and_wetted_perimeter";
    }>;
  }>;
  readonly equations: readonly [
    "Vdot_branch = Vdot_explicit",
    "Vdot_branch = Vdot_total / N_branch (equal confirmed branches only)",
    "v = Vdot_branch / Ah",
    "Dh = 4 * Ah / Pwetted",
  ];
  readonly selectedFlowRoute:
    | "explicit_branch_volume_flow"
    | "equal_split_total_volume_flow";
  readonly substitution: Readonly<{
    readonly providedFlowValueM3PerS: number;
    readonly branchCountApplied: number | null;
    readonly branchVolumeFlowM3PerS: number;
    readonly hydraulicAreaM2: number;
    readonly wettedPerimeterM: number;
    readonly fourTimesHydraulicAreaM2: number;
    readonly meanVelocityMPerS: number;
    readonly hydraulicDiameterM: number;
  }>;
  readonly inputSnapshot: Readonly<{
    readonly branchId: string;
    readonly coolantNetworkId: string;
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly timeBasisId: string;
    readonly hydraulicGeometryId: string;
    readonly flowSourceSnapshotId: string;
    readonly geometrySourceSnapshotId: string;
  }>;
  readonly evidence: Readonly<{
    readonly flow: Readonly<H03FlowEvidence>;
    readonly hydraulicGeometry: Readonly<H03HydraulicGeometryEvidence>;
  }>;
  readonly applicabilityChecks: readonly [
    "flow is a declared branch volume flow or a fully confirmed equal split of total volume flow",
    "mass flow, velocity and total-flow-to-one-branch aliases are rejected",
    "Ah and Pwetted are available from one D-02 hydraulic geometry and content-addressed case/geometry snapshot",
    "branch, coolant network and case bindings match",
    "no OEM or project velocity acceptance threshold is inferred",
  ];
  readonly engineeringAssessment: Readonly<{
    readonly oemVelocityThresholdApplied: false;
    readonly projectVelocityThresholdApplied: false;
    readonly velocityQualification: "not_evaluated";
    readonly reason:
      "H-03 is a kinematic identity; acceptance requires separately sourced OEM or project limits";
  }>;
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_closed_form_no_iterative_solver";
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim:
      "limited_by_flow_and_D02_geometry_input_precision";
  }>;
  readonly assumptions: readonly [
    "Vdot is volumetric flow at the declared state, never mass flow or velocity",
    "v is the mean branch velocity based on actual coolant flow area",
    "Dh uses the actual same-passage wetted perimeter",
    "equal split is used only after equal geometry, equal resistance and hydraulic balance are confirmed",
    "velocity magnitude alone does not establish acceptability or safety",
  ];
  readonly sourceRefs: typeof H03_SOURCE_REFS;
  readonly contractSourceRefs: typeof H03_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof H03_DERIVATION_REFS;
  readonly validationCaseIds: typeof H03_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof H03_METHOD_CHECK_IDS;
  readonly mapping: typeof H03_METHOD_MAPPING;
  readonly numericRepresentabilityPolicy: typeof H03_NUMERIC_REPRESENTABILITY_POLICY;
  readonly failure?: never;
}

export type H03FailureCode =
  | "H-03.input_schema_invalid"
  | "H-03.flow_missing"
  | "H-03.flow_schema_invalid"
  | "H-03.flow_binding_invalid"
  | "H-03.flow_provenance_invalid"
  | "H-03.flow_unavailable"
  | "H-03.flow_value_invalid"
  | "H-03.flow_numeric_resolution_invalid"
  | "H-03.unknown_flow_substituted_zero"
  | "H-03.flow_quantity_unknown"
  | "H-03.mass_flow_not_applicable"
  | "H-03.velocity_input_not_applicable"
  | "H-03.total_flow_to_one_branch_not_applicable"
  | "H-03.branch_split_binding_invalid"
  | "H-03.branch_split_not_applicable"
  | "H-03.branch_split_unknown"
  | "H-03.hydraulic_geometry_missing"
  | "H-03.hydraulic_geometry_schema_invalid"
  | "H-03.hydraulic_geometry_binding_invalid"
  | "H-03.hydraulic_geometry_provenance_invalid"
  | "H-03.hydraulic_geometry_unavailable"
  | "H-03.hydraulic_geometry_pair_mismatch"
  | "H-03.hydraulic_geometry_pair_unknown"
  | "H-03.branch_boundary_mismatch"
  | "H-03.geometry_value_invalid"
  | "H-03.numeric_overflow"
  | "H-03.numeric_underflow"
  | "H-03.numeric_factor_swallowed";

export interface H03BranchFlowGeometryFailure {
  readonly methodId: typeof H03_METHOD_ID;
  readonly methodVersion: typeof H03_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly H03Warning[];
  readonly mapping: typeof H03_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: H03FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
  readonly selectedFlowRoute?: never;
  readonly engineeringAssessment?: never;
}

export type H03BranchFlowGeometryOutcome =
  | H03BranchFlowGeometrySuccess
  | H03BranchFlowGeometryFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function warning(
  predicate: H03Warning["predicate"],
  message: string,
): H03Warning {
  return Object.freeze({ sourceMethodId: H03_METHOD_ID, predicate, message });
}

function failure(
  status: H03BranchFlowGeometryFailure["status"],
  code: H03FailureCode,
  message: string,
  action: string,
  warnings: readonly H03Warning[] = EMPTY_WARNINGS,
): H03BranchFlowGeometryFailure {
  return Object.freeze({
    methodId: H03_METHOD_ID,
    methodVersion: H03_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    mapping: H03_METHOD_MAPPING,
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

function isFlowSourceMethod(value: unknown): value is H03FlowSourceMethod {
  return (
    value === "measurement" ||
    value === "H-02" ||
    value === "H-05" ||
    value === "case_input" ||
    value === "unknown_or_unconfirmed"
  );
}

function isFlowQuantityKind(value: unknown): value is H03FlowQuantityKind {
  return (
    value === "volume_flow_rate" ||
    value === "mass_flow_rate" ||
    value === "velocity" ||
    value === "unknown_or_unconfirmed"
  );
}

function validFlowBoundaryRecord(
  record: Readonly<Record<string, unknown>>,
): boolean {
  return (
    isFlowSourceMethod(record.sourceMethod) &&
    isStableIdentifier(record.sourceRef) &&
    isDataQuality(record.dataQuality) &&
    isStableIdentifier(record.provenanceId) &&
    isContentAddressedSnapshotId(record.sourceSnapshotId) &&
    isStableIdentifier(record.branchId) &&
    isStableIdentifier(record.coolantNetworkId) &&
    isContentAddressedSnapshotId(record.caseSnapshotId, "case") &&
    isStableIdentifier(record.timeBasisId)
  );
}

type FlowReadResult =
  | Readonly<{ readonly ok: true; readonly flow: H03FlowEvidence }>
  | Readonly<{
      readonly ok: false;
      readonly result: H03BranchFlowGeometryFailure;
    }>;

const KNOWN_FLOW_KEYS = Object.freeze([
  "kind",
  "valueSi",
  "quantityKind",
  "dimensionId",
  "canonicalUnitId",
  "valueResolution",
  "flowScope",
  "sourceMethod",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
  "branchId",
  "coolantNetworkId",
  "caseSnapshotId",
  "timeBasisId",
] as const);

function validKnownFlowEnums(
  record: Readonly<Record<string, unknown>>,
): boolean {
  return (
    typeof record.valueSi === "number" &&
    isFlowQuantityKind(record.quantityKind) &&
    (record.dimensionId === "volume_flow_rate" ||
      record.dimensionId === "mass_flow_rate" ||
      record.dimensionId === "velocity" ||
      record.dimensionId === "unknown_or_unconfirmed") &&
    (record.canonicalUnitId === "m3_per_s" ||
      record.canonicalUnitId === "kg_per_s" ||
      record.canonicalUnitId === "m_per_s" ||
      record.canonicalUnitId === "unknown_or_unconfirmed") &&
    (record.valueResolution === "known_value" ||
      record.valueResolution === "unknown_substituted_zero") &&
    (record.flowScope === "one_declared_branch" ||
      record.flowScope === "total_network_flow" ||
      record.flowScope === "unknown_or_unconfirmed") &&
    validFlowBoundaryRecord(record)
  );
}

function cloneKnownFlowBase(
  record: Readonly<Record<string, unknown>>,
): Omit<H03KnownFlowBase, never> {
  return {
    valueSi: record.valueSi as number,
    quantityKind: record.quantityKind as H03FlowQuantityKind,
    dimensionId: record.dimensionId as H03KnownFlowBase["dimensionId"],
    canonicalUnitId:
      record.canonicalUnitId as H03KnownFlowBase["canonicalUnitId"],
    valueResolution:
      record.valueResolution as H03KnownFlowBase["valueResolution"],
    flowScope: record.flowScope as H03KnownFlowBase["flowScope"],
    sourceMethod: record.sourceMethod as H03FlowSourceMethod,
    sourceRef: record.sourceRef as string,
    dataQuality: record.dataQuality as DataQuality,
    provenanceId: record.provenanceId as string,
    sourceSnapshotId: record.sourceSnapshotId as string,
    branchId: record.branchId as string,
    coolantNetworkId: record.coolantNetworkId as string,
    caseSnapshotId: record.caseSnapshotId as string,
    timeBasisId: record.timeBasisId as string,
  };
}

function cloneFlowBoundary(
  record: Readonly<Record<string, unknown>>,
): H03FlowBoundary {
  return {
    sourceMethod: record.sourceMethod as H03FlowSourceMethod,
    sourceRef: record.sourceRef as string,
    dataQuality: record.dataQuality as DataQuality,
    provenanceId: record.provenanceId as string,
    sourceSnapshotId: record.sourceSnapshotId as string,
    branchId: record.branchId as string,
    coolantNetworkId: record.coolantNetworkId as string,
    caseSnapshotId: record.caseSnapshotId as string,
    timeBasisId: record.timeBasisId as string,
  };
}

function readFlow(value: unknown): FlowReadResult {
  const direct = readExactPlainDataRecord(value, KNOWN_FLOW_KEYS);
  if (direct !== null && direct.kind === "explicit_branch_volume_flow") {
    if (!validKnownFlowEnums(direct)) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.flow_schema_invalid",
          "The explicit branch-flow record contains an uncontrolled enum, type, ID, unit, or snapshot.",
          "Provide the exact canonical flow record with stable provenance and content-addressed snapshots.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      flow: Object.freeze({
        kind: "explicit_branch_volume_flow",
        ...cloneKnownFlowBase(direct),
      }),
    });
  }

  const equal = readExactPlainDataRecord(value, [
    ...KNOWN_FLOW_KEYS,
    "branchCount",
    "targetBranchOrdinal",
    "networkTopology",
    "equalHydraulicGeometryConfirmed",
    "equalResistanceConfirmed",
    "hydraulicallyBalancedConfirmed",
  ]);
  if (equal !== null && equal.kind === "equal_split_total_volume_flow") {
    if (
      !validKnownFlowEnums(equal) ||
      typeof equal.branchCount !== "number" ||
      typeof equal.targetBranchOrdinal !== "number" ||
      (equal.networkTopology !== "parallel_branches" &&
        equal.networkTopology !== "not_parallel_or_asymmetric_network" &&
        equal.networkTopology !== "unknown_or_unconfirmed") ||
      !isTriState(equal.equalHydraulicGeometryConfirmed) ||
      !isTriState(equal.equalResistanceConfirmed) ||
      !isTriState(equal.hydraulicallyBalancedConfirmed)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.flow_schema_invalid",
          "The equal-split flow record contains an uncontrolled enum, type, ID, unit, or confirmation.",
          "Provide the exact total-flow split record and every explicit network confirmation.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      flow: Object.freeze({
        kind: "equal_split_total_volume_flow",
        ...cloneKnownFlowBase(equal),
        branchCount: equal.branchCount,
        targetBranchOrdinal: equal.targetBranchOrdinal,
        networkTopology: equal.networkTopology,
        equalHydraulicGeometryConfirmed:
          equal.equalHydraulicGeometryConfirmed,
        equalResistanceConfirmed: equal.equalResistanceConfirmed,
        hydraulicallyBalancedConfirmed:
          equal.hydraulicallyBalancedConfirmed,
      }),
    });
  }

  const unavailable = readExactPlainDataRecord(value, [
    "kind",
    "status",
    "reason",
    "resolutionSourceRef",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
    "branchId",
    "coolantNetworkId",
    "caseSnapshotId",
    "timeBasisId",
  ]);
  if (unavailable !== null && unavailable.kind === "unavailable") {
    if (
      (unavailable.status !== "insufficient_data" &&
        unavailable.status !== "not_applicable") ||
      !isNonBlankText(unavailable.reason) ||
      !isStableIdentifier(unavailable.resolutionSourceRef) ||
      !validFlowBoundaryRecord(unavailable)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.flow_schema_invalid",
          "Unavailable flow evidence is malformed or lacks controlled provenance.",
          "Use the exact unavailable discriminator without a numeric placeholder.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      flow: Object.freeze({
        kind: "unavailable",
        status: unavailable.status,
        reason: unavailable.reason,
        resolutionSourceRef: unavailable.resolutionSourceRef,
        ...cloneFlowBoundary(unavailable),
      }),
    });
  }

  const missing = value === null || value === undefined;
  return Object.freeze({
    ok: false,
    result: failure(
      missing ? "insufficient_data" : "invalid_input",
      missing ? "H-03.flow_missing" : "H-03.flow_schema_invalid",
      "H-03 requires an exact branch-flow, equal-split total-flow, or unavailable-flow discriminator.",
      "Do not supply null, mass-flow aliases, velocity aliases, hidden defaults, or extra fields.",
    ),
  });
}

function validGeometryBoundaryRecord(
  record: Readonly<Record<string, unknown>>,
): boolean {
  return (
    record.sourceMethodId === "D-02" &&
    isStableIdentifier(record.sourceRef) &&
    isDataQuality(record.dataQuality) &&
    isStableIdentifier(record.provenanceId) &&
    isContentAddressedSnapshotId(record.sourceSnapshotId) &&
    isStableIdentifier(record.branchId) &&
    isStableIdentifier(record.coolantNetworkId) &&
    isStableIdentifier(record.hydraulicGeometryId) &&
    isContentAddressedSnapshotId(record.caseSnapshotId, "case") &&
    isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry")
  );
}

const GEOMETRY_BOUNDARY_KEYS = Object.freeze([
  "sourceMethodId",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
  "branchId",
  "coolantNetworkId",
  "hydraulicGeometryId",
  "caseSnapshotId",
  "geometrySnapshotId",
] as const);

type HydraulicQuantityReadResult<TQuantity> =
  | Readonly<{ readonly ok: true; readonly quantity: TQuantity }>
  | Readonly<{
      readonly ok: false;
      readonly result: H03BranchFlowGeometryFailure;
    }>;

function geometryBoundaryClone(
  record: Readonly<Record<string, unknown>>,
): H03HydraulicGeometryBoundary {
  return {
    sourceMethodId: "D-02",
    sourceRef: record.sourceRef as string,
    dataQuality: record.dataQuality as DataQuality,
    provenanceId: record.provenanceId as string,
    sourceSnapshotId: record.sourceSnapshotId as string,
    branchId: record.branchId as string,
    coolantNetworkId: record.coolantNetworkId as string,
    hydraulicGeometryId: record.hydraulicGeometryId as string,
    caseSnapshotId: record.caseSnapshotId as string,
    geometrySnapshotId: record.geometrySnapshotId as string,
  };
}

function readHydraulicArea(
  value: unknown,
): HydraulicQuantityReadResult<H03HydraulicAreaEvidence> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "contractInputId",
    "parameterId",
    "sourceQuantityId",
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "interpretation",
    ...GEOMETRY_BOUNDARY_KEYS,
  ]);
  if (available !== null && available.kind === "available") {
    if (
      available.contractInputId !== "Ah" ||
      available.parameterId !== "coolant.flow_area" ||
      available.sourceQuantityId !== "Ahydraulic" ||
      typeof available.valueSi !== "number" ||
      available.dimensionId !== "area" ||
      available.canonicalUnitId !== "m2" ||
      available.interpretation !==
        "internal_coolant_flow_cross_section" ||
      !validGeometryBoundaryRecord(available)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.hydraulic_geometry_binding_invalid",
          "Ah is not the exact canonical-SI D-02 Ahydraulic output with controlled geometry provenance.",
          "Use contract Ah -> coolant.flow_area -> D-02 Ahydraulic without metal-area aliases.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      quantity: Object.freeze({
        kind: "available",
        contractInputId: "Ah",
        parameterId: "coolant.flow_area",
        sourceQuantityId: "Ahydraulic",
        valueSi: available.valueSi,
        dimensionId: "area",
        canonicalUnitId: "m2",
        interpretation: "internal_coolant_flow_cross_section",
        ...geometryBoundaryClone(available),
      }),
    });
  }
  return readUnavailableGeometryQuantity(value, "Ah");
}

function readWettedPerimeter(
  value: unknown,
): HydraulicQuantityReadResult<H03WettedPerimeterEvidence> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "contractInputId",
    "parameterId",
    "sourceQuantityId",
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "interpretation",
    ...GEOMETRY_BOUNDARY_KEYS,
  ]);
  if (available !== null && available.kind === "available") {
    if (
      available.contractInputId !== "Pwetted" ||
      available.parameterId !== "coolant.wetted_perimeter" ||
      available.sourceQuantityId !== "Pwetted" ||
      typeof available.valueSi !== "number" ||
      available.dimensionId !== "length" ||
      available.canonicalUnitId !== "m" ||
      available.interpretation !== "internal_coolant_wetted_perimeter" ||
      !validGeometryBoundaryRecord(available)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.hydraulic_geometry_binding_invalid",
          "Pwetted is not the exact canonical-SI D-02 wetted-perimeter output with controlled geometry provenance.",
          "Use contract Pwetted -> coolant.wetted_perimeter -> D-02 Pwetted without geometric aliases.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      quantity: Object.freeze({
        kind: "available",
        contractInputId: "Pwetted",
        parameterId: "coolant.wetted_perimeter",
        sourceQuantityId: "Pwetted",
        valueSi: available.valueSi,
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation: "internal_coolant_wetted_perimeter",
        ...geometryBoundaryClone(available),
      }),
    });
  }
  return readUnavailableGeometryQuantity(value, "Pwetted");
}

function readUnavailableGeometryQuantity(
  value: unknown,
  expectedInputId: "Ah" | "Pwetted",
): HydraulicQuantityReadResult<H03UnavailableHydraulicGeometryQuantity> {
  const unavailable = readExactPlainDataRecord(value, [
    "kind",
    "contractInputId",
    "parameterId",
    "sourceQuantityId",
    "status",
    "reason",
    "resolutionSourceRef",
    ...GEOMETRY_BOUNDARY_KEYS,
  ]);
  if (unavailable !== null && unavailable.kind === "unavailable") {
    const expectedParameterId =
      expectedInputId === "Ah"
        ? "coolant.flow_area"
        : "coolant.wetted_perimeter";
    const expectedSourceQuantityId =
      expectedInputId === "Ah" ? "Ahydraulic" : "Pwetted";
    if (
      unavailable.contractInputId !== expectedInputId ||
      unavailable.parameterId !== expectedParameterId ||
      unavailable.sourceQuantityId !== expectedSourceQuantityId ||
      (unavailable.status !== "insufficient_data" &&
        unavailable.status !== "not_applicable") ||
      !isNonBlankText(unavailable.reason) ||
      !isStableIdentifier(unavailable.resolutionSourceRef) ||
      !validGeometryBoundaryRecord(unavailable)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "H-03.hydraulic_geometry_binding_invalid",
          expectedInputId + " unavailable evidence is malformed or bound to another D-02 quantity.",
          "Use the exact source-bound unavailable discriminator without numeric, unit, or dimension placeholders.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      quantity: Object.freeze({
        kind: "unavailable",
        contractInputId: expectedInputId,
        parameterId: expectedParameterId,
        sourceQuantityId: expectedSourceQuantityId,
        status: unavailable.status,
        reason: unavailable.reason,
        resolutionSourceRef: unavailable.resolutionSourceRef,
        ...geometryBoundaryClone(unavailable),
      }),
    });
  }
  const missing = value === null || value === undefined;
  return Object.freeze({
    ok: false,
    result: failure(
      missing ? "insufficient_data" : "invalid_input",
      missing
        ? "H-03.hydraulic_geometry_missing"
        : "H-03.hydraulic_geometry_schema_invalid",
      expectedInputId + " must be an exact available or unavailable D-02 hydraulic-geometry quantity.",
      "Do not use null, metal area, a hidden default, NaN, zero placeholder, accessor, or extra field.",
    ),
  });
}

type GeometryReadResult =
  | Readonly<{
      readonly ok: true;
      readonly geometry: Readonly<H03HydraulicGeometryEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: H03BranchFlowGeometryFailure;
    }>;

function readHydraulicGeometry(value: unknown): GeometryReadResult {
  const record = readExactPlainDataRecord(value, [
    "Ah",
    "Pwetted",
    "sameD02HydraulicGeometryConfirmed",
  ]);
  if (record === null) {
    const missing = value === null || value === undefined;
    return Object.freeze({
      ok: false,
      result: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "H-03.hydraulic_geometry_missing"
          : "H-03.hydraulic_geometry_schema_invalid",
        "H-03 requires one exact D-02 hydraulic-geometry pair record.",
        "Provide Ah, Pwetted, and explicit same-geometry confirmation without extra fields.",
      ),
    });
  }
  if (!isTriState(record.sameD02HydraulicGeometryConfirmed)) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "H-03.hydraulic_geometry_schema_invalid",
        "sameD02HydraulicGeometryConfirmed must be true, false, or null.",
        "Use the exact controlled tri-state confirmation.",
      ),
    });
  }
  const areaResult = readHydraulicArea(record.Ah);
  const perimeterResult = readWettedPerimeter(record.Pwetted);
  if (!areaResult.ok && areaResult.result.status === "invalid_input") {
    return Object.freeze({ ok: false, result: areaResult.result });
  }
  if (!perimeterResult.ok && perimeterResult.result.status === "invalid_input") {
    return Object.freeze({ ok: false, result: perimeterResult.result });
  }
  if (!areaResult.ok) {
    return Object.freeze({ ok: false, result: areaResult.result });
  }
  if (!perimeterResult.ok) {
    return Object.freeze({ ok: false, result: perimeterResult.result });
  }
  return Object.freeze({
    ok: true,
    geometry: Object.freeze({
      Ah: areaResult.quantity,
      Pwetted: perimeterResult.quantity,
      sameD02HydraulicGeometryConfirmed:
        record.sameD02HydraulicGeometryConfirmed,
    }),
  });
}

function sameGeometryBinding(
  left: H03HydraulicGeometryBoundary,
  right: H03HydraulicGeometryBoundary,
): boolean {
  return (
    left.sourceMethodId === right.sourceMethodId &&
    left.branchId === right.branchId &&
    left.coolantNetworkId === right.coolantNetworkId &&
    left.hydraulicGeometryId === right.hydraulicGeometryId &&
    left.caseSnapshotId === right.caseSnapshotId &&
    left.geometrySnapshotId === right.geometrySnapshotId &&
    left.sourceSnapshotId === right.sourceSnapshotId
  );
}

function sameBranchBoundary(
  flow: H03FlowEvidence,
  geometry: H03HydraulicGeometryBoundary,
): boolean {
  return (
    flow.branchId === geometry.branchId &&
    flow.coolantNetworkId === geometry.coolantNetworkId &&
    flow.caseSnapshotId === geometry.caseSnapshotId
  );
}

function flowQuantityTupleIsConsistent(
  flow: H03ExplicitBranchVolumeFlow | H03EqualSplitTotalVolumeFlow,
): boolean {
  if (flow.quantityKind === "volume_flow_rate") {
    return (
      flow.dimensionId === "volume_flow_rate" &&
      flow.canonicalUnitId === "m3_per_s"
    );
  }
  if (flow.quantityKind === "mass_flow_rate") {
    return (
      flow.dimensionId === "mass_flow_rate" &&
      flow.canonicalUnitId === "kg_per_s"
    );
  }
  if (flow.quantityKind === "velocity") {
    return (
      flow.dimensionId === "velocity" &&
      flow.canonicalUnitId === "m_per_s"
    );
  }
  return (
    flow.dimensionId === "unknown_or_unconfirmed" &&
    flow.canonicalUnitId === "unknown_or_unconfirmed"
  );
}

function positiveNormalOrZero(value: number): boolean {
  return value === 0 || value >= H03_BINARY64_MIN_NORMAL;
}

/** Isolated canonical-SI evaluation of frozen method H-03. */
export function evaluateH03BranchFlowGeometry(
  input: unknown,
): H03BranchFlowGeometryOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "flow",
    "hydraulicGeometry",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "H-03.input_schema_invalid",
      "H-03 input must be one exact controlled plain-data record.",
      "Provide flow and hydraulicGeometry without missing, extra, accessor, symbol, or coercible fields.",
    );
  }

  const flowResult = readFlow(controlledInput.flow);
  const geometryResult = readHydraulicGeometry(
    controlledInput.hydraulicGeometry,
  );
  if (!flowResult.ok && flowResult.result.status === "invalid_input") {
    return flowResult.result;
  }
  if (!geometryResult.ok && geometryResult.result.status === "invalid_input") {
    return geometryResult.result;
  }
  if (!flowResult.ok) {
    return flowResult.result;
  }
  if (!geometryResult.ok) {
    return geometryResult.result;
  }
  const flow = flowResult.flow;
  const geometry = geometryResult.geometry;
  const area = geometry.Ah;
  const perimeter = geometry.Pwetted;

  if (!sameGeometryBinding(area, perimeter)) {
    return failure(
      "invalid_input",
      "H-03.hydraulic_geometry_pair_mismatch",
      "Ah and Pwetted do not share one D-02 hydraulic geometry, branch, network, case, geometry snapshot, and source snapshot.",
      "Use the two available outputs from the exact same D-02 geometry evaluation and content-addressed snapshots.",
    );
  }
  if (!sameBranchBoundary(flow, area)) {
    return failure(
      "invalid_input",
      "H-03.branch_boundary_mismatch",
      "Flow and D-02 hydraulic geometry do not belong to the same branch, coolant network, and case snapshot.",
      "Bind flow and geometry to one declared branch before evaluating H-03.",
    );
  }
  if (geometry.sameD02HydraulicGeometryConfirmed === false) {
    return failure(
      "invalid_input",
      "H-03.hydraulic_geometry_pair_mismatch",
      "The input explicitly denies that Ah and Pwetted come from the same D-02 hydraulic geometry.",
      "Use one same-passage D-02 result pair.",
    );
  }

  if (flow.kind !== "unavailable") {
    if (!flowQuantityTupleIsConsistent(flow)) {
      return failure(
        "invalid_input",
        "H-03.flow_binding_invalid",
        "Flow quantity kind, dimension and canonical unit contradict one another.",
        "Use volume_flow_rate/m3_per_s, mass_flow_rate/kg_per_s, velocity/m_per_s, or a wholly unknown tuple.",
      );
    }
    if (
      !Number.isFinite(flow.valueSi) ||
      flow.valueSi < 0 ||
      Object.is(flow.valueSi, -0)
    ) {
      return failure(
        "invalid_input",
        "H-03.flow_value_invalid",
        "Flow must be a finite non-negative canonical-SI quantity.",
        "Provide a resolved finite value; negative values, signed negative zero, NaN, Infinity, coercion and placeholders are forbidden.",
      );
    }
    if (!positiveNormalOrZero(flow.valueSi)) {
      return failure(
        "invalid_input",
        "H-03.flow_numeric_resolution_invalid",
        "The positive flow input is subnormal binary64.",
        "Provide a representable normal SI value; H-03 never flushes it to zero.",
      );
    }
    if (flow.valueResolution === "unknown_substituted_zero") {
      return failure(
        "invalid_input",
        "H-03.unknown_flow_substituted_zero",
        "An unresolved flow was supplied as numeric zero.",
        "Use the explicit unavailable-flow discriminator without a numeric payload.",
      );
    }
    if (flow.kind === "equal_split_total_volume_flow") {
      if (
        !Number.isSafeInteger(flow.branchCount) ||
        flow.branchCount < 1 ||
        !Number.isSafeInteger(flow.targetBranchOrdinal) ||
        flow.targetBranchOrdinal < 1 ||
        flow.targetBranchOrdinal > flow.branchCount ||
        flow.flowScope === "one_declared_branch"
      ) {
        return failure(
          "invalid_input",
          "H-03.branch_split_binding_invalid",
          "Equal-split routing has an invalid branch count, target ordinal, or branch/total scope.",
          "Use safe integer N_branch>=1, a target ordinal in [1,N], and total_network_flow scope.",
        );
      }
    }
  }

  if (area.kind === "available") {
    if (
      !Number.isFinite(area.valueSi) ||
      area.valueSi <= 0 ||
      area.valueSi < H03_BINARY64_MIN_NORMAL
    ) {
      return failure(
        "invalid_input",
        "H-03.geometry_value_invalid",
        "D-02 hydraulic flow area must be finite, positive, and normal binary64 in m2.",
        "Resolve a positive canonical-SI D-02 Ahydraulic value; no zero or subnormal placeholder is accepted.",
      );
    }
  }
  if (perimeter.kind === "available") {
    if (
      !Number.isFinite(perimeter.valueSi) ||
      perimeter.valueSi <= 0 ||
      perimeter.valueSi < H03_BINARY64_MIN_NORMAL
    ) {
      return failure(
        "invalid_input",
        "H-03.geometry_value_invalid",
        "D-02 wetted perimeter must be finite, positive, and normal binary64 in m.",
        "Resolve a positive canonical-SI D-02 Pwetted value; no zero or subnormal placeholder is accepted.",
      );
    }
  }

  // Known out-of-domain facts outrank unresolved evidence.
  if (flow.kind !== "unavailable" && flow.quantityKind === "mass_flow_rate") {
    return failure(
      "not_applicable",
      "H-03.mass_flow_not_applicable",
      "H-03 received mass flow rather than branch volumetric flow.",
      "Convert mass flow to volume flow only with an explicit same-state density in H-02 or another approved boundary method.",
      [
        warning(
          H03_WARNING_PREDICATES.massFlowAsVelocity,
          "Mass flow cannot be labelled or used as branch velocity.",
        ),
      ],
    );
  }
  if (flow.kind !== "unavailable" && flow.quantityKind === "velocity") {
    return failure(
      "not_applicable",
      "H-03.velocity_input_not_applicable",
      "H-03 received velocity as the flow input to its own velocity identity.",
      "Provide branch volume flow and let H-03 calculate mean velocity.",
    );
  }
  if (
    flow.kind === "explicit_branch_volume_flow" &&
    flow.flowScope === "total_network_flow"
  ) {
    return failure(
      "not_applicable",
      "H-03.total_flow_to_one_branch_not_applicable",
      "A total network flow was routed directly into one branch.",
      "Provide a measured/solved branch flow or use the explicitly confirmed equal-split route.",
      [
        warning(
          H03_WARNING_PREDICATES.totalFlowToOneBranch,
          "Total network flow was offered as one branch flow.",
        ),
      ],
    );
  }
  if (flow.kind === "equal_split_total_volume_flow") {
    if (
      flow.networkTopology === "not_parallel_or_asymmetric_network" ||
      flow.equalHydraulicGeometryConfirmed === false ||
      flow.equalResistanceConfirmed === false ||
      flow.hydraulicallyBalancedConfirmed === false
    ) {
      return failure(
        "not_applicable",
        "H-03.branch_split_not_applicable",
        "The network is known to be asymmetric, unequal-resistance, unequal-geometry, or unbalanced.",
        "Use measured branch flow or solve the same-pressure-drop network with H-05.",
        [
          warning(
            H03_WARNING_PREDICATES.asymmetricEqualSplit,
            "Asymmetric or unbalanced branches cannot be evenly split.",
          ),
        ],
      );
    }
  }
  if (
    (area.kind === "unavailable" && area.status === "not_applicable") ||
    (perimeter.kind === "unavailable" &&
      perimeter.status === "not_applicable")
  ) {
    return failure(
      "not_applicable",
      "H-03.hydraulic_geometry_unavailable",
      "D-02 confirms that the declared branch has no applicable internal hydraulic passage geometry.",
      "Select a branch with an applicable coolant passage or provide an approved actual-CAD hydraulic geometry route.",
    );
  }

  if (flow.kind === "unavailable") {
    return failure(
      flow.status,
      "H-03.flow_unavailable",
      "Branch volumetric flow is explicitly unavailable.",
      "Resolve a branch flow from measurement, H-02, H-05, or a controlled case input without a placeholder.",
    );
  }
  if (
    flow.quantityKind === "unknown_or_unconfirmed" ||
    flow.dimensionId === "unknown_or_unconfirmed" ||
    flow.canonicalUnitId === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "H-03.flow_quantity_unknown",
      "The flow quantity kind, dimension, or canonical unit is unresolved.",
      "Confirm branch volumetric flow in m3/s before evaluation.",
    );
  }
  if (
    flow.sourceMethod === "unknown_or_unconfirmed" ||
    flow.dataQuality === "unknown"
  ) {
    return failure(
      "insufficient_data",
      "H-03.flow_provenance_invalid",
      "The branch-flow source method or data quality is unresolved.",
      "Bind flow to measurement, H-02, H-05, or a controlled case source with non-unknown data quality.",
    );
  }
  if (flow.flowScope === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "H-03.flow_quantity_unknown",
      "The flow scope is unresolved between one branch and the full network.",
      "Confirm the flow reference boundary before calculating velocity.",
    );
  }
  if (flow.kind === "equal_split_total_volume_flow") {
    if (
      flow.networkTopology === "unknown_or_unconfirmed" ||
      flow.equalHydraulicGeometryConfirmed === null ||
      flow.equalResistanceConfirmed === null ||
      flow.hydraulicallyBalancedConfirmed === null
    ) {
      return failure(
        "insufficient_data",
        "H-03.branch_split_unknown",
        "Equal-split topology, geometry, resistance, or hydraulic balance remains unresolved.",
        "Confirm every split condition, measure the branch, or solve the network with H-05.",
      );
    }
  }
  if (
    (area.kind === "unavailable" && area.status === "insufficient_data") ||
    (perimeter.kind === "unavailable" &&
      perimeter.status === "insufficient_data")
  ) {
    return failure(
      "insufficient_data",
      "H-03.hydraulic_geometry_unavailable",
      "D-02 Ah or Pwetted remains unavailable.",
      "Resolve both hydraulic quantities from one D-02 geometry without zero, NaN, or unit placeholders.",
    );
  }
  if (geometry.sameD02HydraulicGeometryConfirmed === null) {
    return failure(
      "insufficient_data",
      "H-03.hydraulic_geometry_pair_unknown",
      "Same-D-02-geometry identity for Ah and Pwetted is unresolved.",
      "Confirm the geometry identity before deriving Dh.",
    );
  }
  if (area.dataQuality === "unknown" || perimeter.dataQuality === "unknown") {
    return failure(
      "insufficient_data",
      "H-03.hydraulic_geometry_provenance_invalid",
      "D-02 hydraulic geometry data quality is unresolved.",
      "Provide non-unknown geometry provenance before deriving v and Dh.",
    );
  }
  if (area.kind !== "available" || perimeter.kind !== "available") {
    return failure(
      "insufficient_data",
      "H-03.hydraulic_geometry_unavailable",
      "H-03 cannot obtain both available D-02 hydraulic quantities.",
      "Resolve Ah and Pwetted without placeholders.",
    );
  }

  let branchVolumeFlowM3PerS = flow.valueSi;
  let branchCountApplied: number | null = null;
  if (flow.kind === "equal_split_total_volume_flow") {
    branchCountApplied = flow.branchCount;
    branchVolumeFlowM3PerS = flow.valueSi / flow.branchCount;
    if (!Number.isFinite(branchVolumeFlowM3PerS)) {
      return failure(
        "invalid_input",
        "H-03.numeric_overflow",
        "Equal-split branch volume flow is non-finite.",
        "Provide representable total volume flow and branch count.",
      );
    }
    if (
      flow.valueSi > 0 &&
      (branchVolumeFlowM3PerS === 0 ||
        branchVolumeFlowM3PerS < H03_BINARY64_MIN_NORMAL)
    ) {
      return failure(
        "invalid_input",
        "H-03.numeric_underflow",
        "Equal splitting underflowed a positive branch volume flow.",
        "Provide a numerically resolvable canonical-SI flow; H-03 never replaces the branch flow with zero.",
      );
    }
    if (
      flow.valueSi > 0 &&
      flow.branchCount > 1 &&
      branchVolumeFlowM3PerS === flow.valueSi
    ) {
      return failure(
        "invalid_input",
        "H-03.numeric_factor_swallowed",
        "The non-unit branch-count divisor was swallowed by binary64 arithmetic.",
        "Provide a numerically resolvable total flow and branch count; no split factor is silently discarded.",
      );
    }
  }

  const meanVelocityMPerS = branchVolumeFlowM3PerS / area.valueSi;
  if (!Number.isFinite(meanVelocityMPerS)) {
    return failure(
      "invalid_input",
      "H-03.numeric_overflow",
      "v=Vdot_branch/Ah overflowed binary64.",
      "Provide representable canonical-SI branch flow and hydraulic area; H-03 never clamps Infinity.",
    );
  }
  if (
    branchVolumeFlowM3PerS > 0 &&
    (meanVelocityMPerS === 0 ||
      meanVelocityMPerS < H03_BINARY64_MIN_NORMAL)
  ) {
    return failure(
      "invalid_input",
      "H-03.numeric_underflow",
      "v=Vdot_branch/Ah underflowed a positive velocity.",
      "Provide numerically resolvable canonical-SI inputs; H-03 never publishes zero for a positive flow.",
    );
  }

  const fourTimesHydraulicAreaM2 = 4 * area.valueSi;
  if (!Number.isFinite(fourTimesHydraulicAreaM2)) {
    return failure(
      "invalid_input",
      "H-03.numeric_overflow",
      "The numerator 4*Ah overflowed binary64.",
      "Provide representable canonical-SI D-02 geometry; H-03 never clamps the numerator.",
    );
  }
  if (
    area.valueSi > 0 &&
    fourTimesHydraulicAreaM2 === area.valueSi
  ) {
    return failure(
      "invalid_input",
      "H-03.numeric_factor_swallowed",
      "The non-unit factor four was swallowed in the Dh numerator.",
      "Provide numerically resolvable D-02 geometry; no equation factor is silently discarded.",
    );
  }
  const hydraulicDiameterM =
    fourTimesHydraulicAreaM2 / perimeter.valueSi;
  if (!Number.isFinite(hydraulicDiameterM)) {
    return failure(
      "invalid_input",
      "H-03.numeric_overflow",
      "Dh=4Ah/Pwetted overflowed binary64.",
      "Provide representable canonical-SI area and wetted perimeter; H-03 never clamps Infinity.",
    );
  }
  if (
    hydraulicDiameterM === 0 ||
    hydraulicDiameterM < H03_BINARY64_MIN_NORMAL
  ) {
    return failure(
      "invalid_input",
      "H-03.numeric_underflow",
      "Dh=4Ah/Pwetted underflowed a positive hydraulic diameter.",
      "Provide numerically resolvable D-02 geometry; H-03 never publishes zero for a positive passage.",
    );
  }

  return Object.freeze({
    methodId: H03_METHOD_ID,
    methodVersion: H03_METHOD_VERSION,
    methodApproval: "approved",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      v: Object.freeze({
        outputId: "v",
        parameterId: "water.velocity",
        valueSi: meanVelocityMPerS,
        dimensionId: "velocity",
        canonicalUnitId: "m_per_s",
        interpretation: "mean_velocity_in_declared_branch",
      }),
      Dh: Object.freeze({
        outputId: "Dh",
        parameterId: "coolant.hydraulic_diameter",
        valueSi: hydraulicDiameterM,
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation:
          "hydraulic_diameter_from_same_D02_area_and_wetted_perimeter",
      }),
    }),
    equations: Object.freeze([
      "Vdot_branch = Vdot_explicit",
      "Vdot_branch = Vdot_total / N_branch (equal confirmed branches only)",
      "v = Vdot_branch / Ah",
      "Dh = 4 * Ah / Pwetted",
    ]) as H03BranchFlowGeometrySuccess["equations"],
    selectedFlowRoute: flow.kind,
    substitution: Object.freeze({
      providedFlowValueM3PerS: flow.valueSi,
      branchCountApplied,
      branchVolumeFlowM3PerS,
      hydraulicAreaM2: area.valueSi,
      wettedPerimeterM: perimeter.valueSi,
      fourTimesHydraulicAreaM2,
      meanVelocityMPerS,
      hydraulicDiameterM,
    }),
    inputSnapshot: Object.freeze({
      branchId: flow.branchId,
      coolantNetworkId: flow.coolantNetworkId,
      caseSnapshotId: flow.caseSnapshotId,
      geometrySnapshotId: area.geometrySnapshotId,
      timeBasisId: flow.timeBasisId,
      hydraulicGeometryId: area.hydraulicGeometryId,
      flowSourceSnapshotId: flow.sourceSnapshotId,
      geometrySourceSnapshotId: area.sourceSnapshotId,
    }),
    evidence: Object.freeze({ flow, hydraulicGeometry: geometry }),
    applicabilityChecks: Object.freeze([
      "flow is a declared branch volume flow or a fully confirmed equal split of total volume flow",
      "mass flow, velocity and total-flow-to-one-branch aliases are rejected",
      "Ah and Pwetted are available from one D-02 hydraulic geometry and content-addressed case/geometry snapshot",
      "branch, coolant network and case bindings match",
      "no OEM or project velocity acceptance threshold is inferred",
    ]) as H03BranchFlowGeometrySuccess["applicabilityChecks"],
    engineeringAssessment: Object.freeze({
      oemVelocityThresholdApplied: false,
      projectVelocityThresholdApplied: false,
      velocityQualification: "not_evaluated",
      reason:
        "H-03 is a kinematic identity; acceptance requires separately sourced OEM or project limits",
    }),
    solverResiduals: Object.freeze({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
    }),
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim: "limited_by_flow_and_D02_geometry_input_precision",
    }),
    assumptions: Object.freeze([
      "Vdot is volumetric flow at the declared state, never mass flow or velocity",
      "v is the mean branch velocity based on actual coolant flow area",
      "Dh uses the actual same-passage wetted perimeter",
      "equal split is used only after equal geometry, equal resistance and hydraulic balance are confirmed",
      "velocity magnitude alone does not establish acceptability or safety",
    ]) as H03BranchFlowGeometrySuccess["assumptions"],
    sourceRefs: H03_SOURCE_REFS,
    contractSourceRefs: H03_CONTRACT_SOURCE_REFS,
    derivationRefs: H03_DERIVATION_REFS,
    validationCaseIds: H03_VALIDATION_CASE_IDS,
    methodCheckIds: H03_METHOD_CHECK_IDS,
    mapping: H03_METHOD_MAPPING,
    numericRepresentabilityPolicy: H03_NUMERIC_REPRESENTABILITY_POLICY,
  });
}
