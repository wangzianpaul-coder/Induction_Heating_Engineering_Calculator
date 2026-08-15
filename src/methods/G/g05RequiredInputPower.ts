import { LOADED_STATES, type LoadedState } from "../../domain/electrical.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { DATA_QUALITIES, type DataQuality } from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-05"));

export const G05_METHOD_ID = "G-05" as const;
export const G05_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G05_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G05_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G05_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G05_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G05_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const G05_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G05_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputOrResultPolicy: "fail_closed" as const,
  overflowFalseZeroAndSwallowedTermPolicy: "fail_closed" as const,
  orderedSourceEquationRearranged: false as const,
  minimumPositiveNormal: G05_BINARY64_MIN_NORMAL,
});

export const G05_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "isolated_implementation_not_runtime_activated" as const,
  runtimeActivated: false as const,
  publicApiExported: false as const,
});

const UNKNOWN_LOSS_ZERO_PREDICATE =
  "unknown loss is silently set to zero" as const;
const EFFICIENCY_OVERLAP_PREDICATE =
  "efficiency boundaries overlap" as const;
const ZERO_EFFICIENCY_PREDICATE = "eta=0" as const;
const MIXED_POWER_BASIS_PREDICATE =
  "peak and average powers are mixed" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-05 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G05_WARNING_PREDICATES = Object.freeze({
  unknownLossSilentlySetToZero: controlledWarningPredicate(
    UNKNOWN_LOSS_ZERO_PREDICATE,
  ),
  efficiencyBoundariesOverlap: controlledWarningPredicate(
    EFFICIENCY_OVERLAP_PREDICATE,
  ),
  zeroEfficiency: controlledWarningPredicate(ZERO_EFFICIENCY_PREDICATE),
  peakAndAveragePowersMixed: controlledWarningPredicate(
    MIXED_POWER_BASIS_PREDICATE,
  ),
});

export const G05_REQUIRED_INPUT_POWER_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  sourceRefs: G05_SOURCE_REFS,
  contractSourceRefs: G05_CONTRACT_SOURCE_REFS,
  derivationRefs: G05_DERIVATION_REFS,
  validationCaseIds: G05_VALIDATION_CASE_IDS,
  methodCheckIds: G05_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G05_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: G05_IMPLEMENTATION_READINESS,
});

export type G05PowerBasis =
  | "steady_average_power"
  | "cycle_average_power"
  | "instantaneous_power"
  | "peak_power"
  | "unknown_or_unconfirmed";

export interface G05PowerChainBinding {
  readonly caseSnapshotId: string;
  readonly stateSnapshotId: string;
  readonly loadedState: LoadedState;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly powerBasis: G05PowerBasis;
  readonly powerChainSnapshotId: string;
  readonly provenanceBasisId: string;
}

export type G05SourceMethod =
  | "measurement"
  | "vendor_data"
  | "analytical_model"
  | "numerical_model"
  | "fem"
  | "sourced_user_input";

interface G05SourceEvidence {
  readonly sourceMethod: G05SourceMethod;
  readonly sourceRef: string;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
}

export interface G05UsefulPowerEvidence extends G05SourceEvidence {
  readonly kind: "available";
  readonly inputId: "Puseful";
  readonly boundaryRole: "useful_process_power";
  readonly valueW: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly portId: null;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
  readonly energyPathId: string;
  readonly physicalPowerSourceId: string;
  readonly binding: G05PowerChainBinding;
}

export type G05LossInputId = "Qloss_wp" | "Pcu" | "Pstray";

export type G05LossBoundaryRole =
  | "workpiece_environment_heat_loss"
  | "coil_copper_loss"
  | "local_stray_loss";

interface G05LossEvidenceCommon {
  readonly inputId: G05LossInputId;
  readonly boundaryRole: G05LossBoundaryRole;
  readonly portId: null;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
  readonly lossPathId: string;
  readonly physicalLossSourceId: string;
  readonly binding: G05PowerChainBinding;
  readonly sourceMethod: G05SourceMethod | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
}

export interface G05AvailableLossEvidence extends G05LossEvidenceCommon {
  readonly kind: "available";
  readonly valueW: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly sourceMethod: G05SourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface G05SourceConfirmedNotApplicableLossEvidence
  extends G05LossEvidenceCommon {
  readonly kind: "source_confirmed_not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly sourceMethod: G05SourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface G05UnknownApplicableLossEvidence
  extends G05LossEvidenceCommon {
  readonly kind: "unknown_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type G05LossEvidence =
  | G05AvailableLossEvidence
  | G05SourceConfirmedNotApplicableLossEvidence
  | G05UnknownApplicableLossEvidence;

export type G05EfficiencyId =
  | "eta_matching"
  | "eta_inv"
  | "eta_rect"
  | "eta_other";

export type G05EfficiencyStageRole =
  | "matching_stage_efficiency"
  | "inverter_stage_efficiency"
  | "rectifier_stage_efficiency"
  | "other_explicit_stage_efficiency";

interface G05EfficiencyEvidenceCommon {
  readonly efficiencyId: G05EfficiencyId;
  readonly stageRole: G05EfficiencyStageRole;
  readonly efficiencyBoundaryId: string;
  readonly physicalConversionStageId: string;
  readonly deviceId: string;
  readonly numeratorPortId: string;
  readonly denominatorPortId: string;
  readonly numeratorReferencePlaneId: string;
  readonly denominatorReferencePlaneId: string;
  readonly numeratorControlVolumeId: string;
  readonly denominatorControlVolumeId: string;
  readonly binding: G05PowerChainBinding;
  readonly sourceMethod: G05SourceMethod | "unknown_or_unconfirmed";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceSnapshotId: string;
}

export interface G05AvailableEfficiencyEvidence
  extends G05EfficiencyEvidenceCommon {
  readonly kind: "available";
  readonly value: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly sourceMethod: G05SourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface G05SourceConfirmedNotApplicableEfficiencyEvidence
  extends G05EfficiencyEvidenceCommon {
  readonly kind: "source_confirmed_not_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
  readonly sourceMethod: G05SourceMethod;
  readonly dataQuality: Exclude<DataQuality, "unknown">;
}

export interface G05UnknownApplicableEfficiencyEvidence
  extends G05EfficiencyEvidenceCommon {
  readonly kind: "unknown_applicable";
  readonly reason: string;
  readonly resolutionSourceRef: string;
}

export type G05EfficiencyEvidence =
  | G05AvailableEfficiencyEvidence
  | G05SourceConfirmedNotApplicableEfficiencyEvidence
  | G05UnknownApplicableEfficiencyEvidence;

export interface G05EfficienciesEvidence {
  readonly etaMatching: G05EfficiencyEvidence;
  readonly etaInverter: G05EfficiencyEvidence;
  readonly etaRectifier: G05EfficiencyEvidence;
  readonly etaOther: G05EfficiencyEvidence;
}

export type G05OutputId = "Pwp_abs" | "Pcoil_terminal" | "Pgrid";

export type G05OutputBoundaryRole =
  | "workpiece_absorbed_power"
  | "coil_terminal_active_power"
  | "grid_input_active_power";

export interface G05OutputBoundaryEvidence {
  readonly outputId: G05OutputId;
  readonly boundaryRole: G05OutputBoundaryRole;
  readonly portId: string | null;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
  readonly binding: G05PowerChainBinding;
}

export interface G05OutputBoundariesEvidence {
  readonly workpieceAbsorbed: G05OutputBoundaryEvidence;
  readonly coilTerminal: G05OutputBoundaryEvidence;
  readonly gridInput: G05OutputBoundaryEvidence;
}

export type G05OverlapAssessment =
  | Readonly<{
      readonly status: "confirmed_pairwise_nonoverlapping";
      readonly assessedIds: readonly string[];
      readonly physicalIdentityChecked: true;
      readonly assessmentSourceRef: string;
    }>
  | Readonly<{
      readonly status: "overlap_or_double_count_present";
      readonly assessedIds: readonly string[];
      readonly physicalIdentityChecked: true;
      readonly assessmentSourceRef: string;
      readonly overlapDescription: string;
    }>
  | Readonly<{
      readonly status: "unknown_or_unconfirmed";
      readonly assessedIds: readonly string[];
      readonly physicalIdentityChecked: false | null;
      readonly assessmentSourceRef: string;
      readonly reason: string;
    }>;

export interface G05RequiredInputPowerInput {
  readonly usefulPower: G05UsefulPowerEvidence;
  readonly workpieceHeatLoss: G05LossEvidence;
  readonly copperLoss: G05LossEvidence;
  readonly strayLoss: G05LossEvidence;
  readonly efficiencies: G05EfficienciesEvidence;
  readonly outputBoundaries: G05OutputBoundariesEvidence;
  readonly powerTermOverlapAssessment: G05OverlapAssessment;
  readonly efficiencyOverlapAssessment: G05OverlapAssessment;
}

export interface G05AvailablePowerOutput {
  readonly kind: "available";
  readonly outputId: G05OutputId;
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly boundaryRole: G05OutputBoundaryRole;
  readonly portId: string | null;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
  readonly binding: Readonly<G05PowerChainBinding>;
}

export interface G05UnavailablePowerOutput {
  readonly kind: "unavailable";
  readonly outputId: G05OutputId;
  readonly status: "insufficient_data";
  readonly reason: string;
  readonly unresolvedItemIds: readonly string[];
  readonly valueSi?: never;
}

export type G05PowerOutput =
  | G05AvailablePowerOutput
  | G05UnavailablePowerOutput;

export interface G05UnresolvedItem {
  readonly itemId: string;
  readonly category:
    | "unknown_loss"
    | "unknown_efficiency"
    | "power_term_overlap_unconfirmed"
    | "efficiency_overlap_unconfirmed"
    | "boundary_binding_mismatch"
    | "power_basis_unconfirmed";
  readonly reason: string;
  readonly affectedOutputs: readonly G05OutputId[];
}

export interface G05CalculationTrace {
  readonly outputId: G05OutputId;
  readonly equation:
    | "Pwp_abs = Puseful + Qloss_wp"
    | "Pcoil_terminal = Pwp_abs + Pcu + Pstray"
    | "Pgrid = Pcoil_terminal / (eta_matching * eta_inv * eta_rect * eta_other)";
  readonly orderedAppliedInputIds: readonly string[];
  readonly orderedAppliedValues: readonly number[];
  readonly sourceConfirmedNotApplicableInputIds: readonly string[];
  readonly publicationStatus: "published" | "unavailable";
  readonly resultW: number | null;
  readonly inputAdjusted: false;
}

export interface G05ConservationCheck {
  readonly outputId: G05OutputId;
  readonly kind: "available" | "unavailable";
  readonly residualW: number | null;
  readonly classification:
    | "exact_binary64_identity"
    | "finite_binary64_roundoff_residual"
    | "not_evaluated_output_unavailable";
  readonly inputAdjusted: false;
}

export interface G05RequiredInputPowerSuccess {
  readonly methodId: typeof G05_METHOD_ID;
  readonly methodVersion: typeof G05_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success";
  readonly calculationStatus: "complete" | "partial";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly value: Readonly<{
    readonly Pwp_abs: G05PowerOutput;
    readonly Pcoil_terminal: G05PowerOutput;
    readonly Pgrid: G05PowerOutput;
    readonly unknownItems: readonly G05UnresolvedItem[];
  }>;
  readonly calculationTrace: readonly G05CalculationTrace[];
  readonly conservationChecks: readonly G05ConservationCheck[];
  readonly inputSnapshot: Readonly<{
    readonly usefulPower: Readonly<G05UsefulPowerEvidence>;
    readonly losses: readonly G05LossEvidence[];
    readonly efficiencies: readonly G05EfficiencyEvidence[];
    readonly outputBoundaries: readonly G05OutputBoundaryEvidence[];
    readonly powerTermOverlapAssessment: Readonly<G05OverlapAssessment>;
    readonly efficiencyOverlapAssessment: Readonly<G05OverlapAssessment>;
  }>;
  readonly sourceRefs: typeof G05_SOURCE_REFS;
  readonly contractSourceRefs: typeof G05_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G05_DERIVATION_REFS;
  readonly validationCaseIds: typeof G05_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G05_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy:
    typeof G05_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "every published power uses one declared case, state, loaded state, time basis, measurement window, power basis, power-chain snapshot and provenance basis",
    "source-confirmed not-applicable conditional items are excluded from the applicable set without numeric zero or unity placeholders",
    "unknown conditional items remain explicit and close only their dependent downstream outputs",
    "loss paths and efficiency boundaries are non-overlapping and each applicable item appears exactly once",
    "efficiency factors are dimensionless, positive and no greater than one",
    "conservation checks never tune or overwrite input evidence",
  ];
  readonly failure?: never;
}

export type G05FailureCode =
  | "G-05.input_schema_invalid"
  | "G-05.useful_power_missing"
  | "G-05.useful_power_invalid"
  | "G-05.loss_evidence_invalid"
  | "G-05.efficiencies_schema_invalid"
  | "G-05.efficiency_evidence_invalid"
  | "G-05.efficiency_zero_invalid"
  | "G-05.efficiency_out_of_range"
  | "G-05.output_boundaries_schema_invalid"
  | "G-05.output_boundary_invalid"
  | "G-05.overlap_assessment_invalid"
  | "G-05.loss_overlap_or_double_count"
  | "G-05.efficiency_overlap_or_double_count"
  | "G-05.efficiency_chain_not_contiguous"
  | "G-05.overlap_assessment_set_mismatch"
  | "G-05.peak_average_power_mixed"
  | "G-05.required_power_basis_unconfirmed"
  | "G-05.numeric_resolution_invalid";

export interface G05RequiredInputPowerFailure {
  readonly methodId: typeof G05_METHOD_ID;
  readonly methodVersion: typeof G05_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: G05FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly calculationTrace?: never;
  readonly conservationChecks?: never;
  readonly inputSnapshot?: never;
}

export type G05RequiredInputPowerOutcome =
  | G05RequiredInputPowerSuccess
  | G05RequiredInputPowerFailure;

const EMPTY = Object.freeze([]) as readonly [];

const POWER_BASES = Object.freeze([
  "steady_average_power",
  "cycle_average_power",
  "instantaneous_power",
  "peak_power",
  "unknown_or_unconfirmed",
] as const);

const SOURCE_METHODS = Object.freeze([
  "measurement",
  "vendor_data",
  "analytical_model",
  "numerical_model",
  "fem",
  "sourced_user_input",
] as const);

const LOSS_DEFINITIONS = Object.freeze({
  Qloss_wp: Object.freeze({
    inputId: "Qloss_wp",
    boundaryRole: "workpiece_environment_heat_loss",
  }),
  Pcu: Object.freeze({ inputId: "Pcu", boundaryRole: "coil_copper_loss" }),
  Pstray: Object.freeze({
    inputId: "Pstray",
    boundaryRole: "local_stray_loss",
  }),
} as const);

const EFFICIENCY_DEFINITIONS = Object.freeze({
  eta_matching: Object.freeze({
    efficiencyId: "eta_matching",
    stageRole: "matching_stage_efficiency",
  }),
  eta_inv: Object.freeze({
    efficiencyId: "eta_inv",
    stageRole: "inverter_stage_efficiency",
  }),
  eta_rect: Object.freeze({
    efficiencyId: "eta_rect",
    stageRole: "rectifier_stage_efficiency",
  }),
  eta_other: Object.freeze({
    efficiencyId: "eta_other",
    stageRole: "other_explicit_stage_efficiency",
  }),
} as const);

const OUTPUT_DEFINITIONS = Object.freeze({
  Pwp_abs: Object.freeze({
    outputId: "Pwp_abs",
    boundaryRole: "workpiece_absorbed_power",
    portRequired: false,
  }),
  Pcoil_terminal: Object.freeze({
    outputId: "Pcoil_terminal",
    boundaryRole: "coil_terminal_active_power",
    portRequired: true,
  }),
  Pgrid: Object.freeze({
    outputId: "Pgrid",
    boundaryRole: "grid_input_active_power",
    portRequired: true,
  }),
} as const);

function failure(
  status: G05RequiredInputPowerFailure["status"],
  code: G05FailureCode,
  message: string,
  action: string,
): G05RequiredInputPowerFailure {
  return Object.freeze({
    methodId: G05_METHOD_ID,
    methodVersion: G05_METHOD_VERSION,
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

function isSourceMethod(value: unknown): value is G05SourceMethod {
  return (SOURCE_METHODS as readonly unknown[]).includes(value);
}

function isZeroOrPositiveNormal(value: number): boolean {
  return (
    Number.isFinite(value) &&
    !Object.is(value, -0) &&
    (value === 0 || value >= G05_BINARY64_MIN_NORMAL)
  );
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= G05_BINARY64_MIN_NORMAL;
}

type ReadResult<T> =
  | Readonly<{ readonly ok: true; readonly value: T }>
  | Readonly<{ readonly ok: false; readonly failure: G05RequiredInputPowerFailure }>;

function readBinding(value: unknown): ReadResult<G05PowerChainBinding> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "stateSnapshotId",
    "loadedState",
    "timeBasisId",
    "measurementWindowId",
    "powerBasis",
    "powerChainSnapshotId",
    "provenanceBasisId",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.stateSnapshotId) ||
    !(LOADED_STATES as readonly unknown[]).includes(record.loadedState) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !(POWER_BASES as readonly unknown[]).includes(record.powerBasis) ||
    !isStableIdentifier(record.powerChainSnapshotId) ||
    !isStableIdentifier(record.provenanceBasisId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.loss_evidence_invalid",
        "A G-05 power-chain binding is malformed, uncontrolled or not content-addressed.",
        "Provide exact case/state/loaded-state/time-window/power-basis/chain/provenance binding evidence.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      stateSnapshotId: record.stateSnapshotId,
      loadedState: record.loadedState as LoadedState,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      powerBasis: record.powerBasis as G05PowerBasis,
      powerChainSnapshotId: record.powerChainSnapshotId,
      provenanceBasisId: record.provenanceBasisId,
    }),
  });
}

function validKnownSource(record: Readonly<Record<string, unknown>>): boolean {
  return (
    isSourceMethod(record.sourceMethod) &&
    isStableIdentifier(record.sourceRef) &&
    isDataQuality(record.dataQuality) &&
    record.dataQuality !== "unknown" &&
    isStableIdentifier(record.provenanceId) &&
    isContentAddressedSnapshotId(record.sourceSnapshotId)
  );
}

function validUnknownSource(record: Readonly<Record<string, unknown>>): boolean {
  return (
    (isSourceMethod(record.sourceMethod) ||
      record.sourceMethod === "unknown_or_unconfirmed") &&
    isStableIdentifier(record.sourceRef) &&
    isDataQuality(record.dataQuality) &&
    isStableIdentifier(record.provenanceId) &&
    isContentAddressedSnapshotId(record.sourceSnapshotId)
  );
}

function readUsefulPower(value: unknown): ReadResult<G05UsefulPowerEvidence> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "boundaryRole",
    "valueW",
    "dimensionId",
    "canonicalUnitId",
    "portId",
    "referencePlaneId",
    "controlVolumeId",
    "energyPathId",
    "physicalPowerSourceId",
    "binding",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
  ]);
  if (record === null) {
    const missing = value === null || value === undefined;
    return Object.freeze({
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing ? "G-05.useful_power_missing" : "G-05.useful_power_invalid",
        "G-05 requires exact available Puseful evidence; it is the required upstream demand.",
        "Provide canonical-SI useful process power with boundary, path, state/time and provenance evidence.",
      ),
    });
  }
  if (
    record.kind !== "available" ||
    record.inputId !== "Puseful" ||
    record.boundaryRole !== "useful_process_power" ||
    typeof record.valueW !== "number" ||
    !isZeroOrPositiveNormal(record.valueW) ||
    record.dimensionId !== "power" ||
    record.canonicalUnitId !== "W" ||
    record.portId !== null ||
    !isStableIdentifier(record.referencePlaneId) ||
    !isStableIdentifier(record.controlVolumeId) ||
    !isStableIdentifier(record.energyPathId) ||
    !isStableIdentifier(record.physicalPowerSourceId) ||
    !validKnownSource(record)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.useful_power_invalid",
        "Puseful is not an exact finite canonical-SI useful-process power record.",
        "Use the fixed Puseful identity, non-negative W value, non-electrical process boundary and controlled source provenance.",
      ),
    });
  }
  const binding = readBinding(record.binding);
  if (!binding.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.useful_power_invalid",
        binding.failure.failure.message,
        binding.failure.failure.action,
      ),
    });
  }
  const evidence: G05UsefulPowerEvidence = Object.freeze({
      kind: "available",
      inputId: "Puseful",
      boundaryRole: "useful_process_power",
      valueW: record.valueW,
      dimensionId: "power",
      canonicalUnitId: "W",
      portId: null,
      referencePlaneId: record.referencePlaneId as string,
      controlVolumeId: record.controlVolumeId as string,
      energyPathId: record.energyPathId as string,
      physicalPowerSourceId: record.physicalPowerSourceId as string,
      binding: binding.value,
      sourceMethod: record.sourceMethod as G05SourceMethod,
      sourceRef: record.sourceRef as string,
      dataQuality: record.dataQuality as Exclude<DataQuality, "unknown">,
      provenanceId: record.provenanceId as string,
      sourceSnapshotId: record.sourceSnapshotId as string,
    });
  return Object.freeze({
    ok: true,
    value: evidence,
  });
}

function lossCommonValid(
  record: Readonly<Record<string, unknown>>,
  inputId: G05LossInputId,
): boolean {
  const definition = LOSS_DEFINITIONS[inputId];
  return (
    record.inputId === inputId &&
    record.boundaryRole === definition.boundaryRole &&
    record.portId === null &&
    isStableIdentifier(record.referencePlaneId) &&
    isStableIdentifier(record.controlVolumeId) &&
    isStableIdentifier(record.lossPathId) &&
    isStableIdentifier(record.physicalLossSourceId)
  );
}

function readLoss(
  value: unknown,
  inputId: G05LossInputId,
): ReadResult<G05LossEvidence> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "boundaryRole",
    "valueW",
    "dimensionId",
    "canonicalUnitId",
    "portId",
    "referencePlaneId",
    "controlVolumeId",
    "lossPathId",
    "physicalLossSourceId",
    "binding",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
  ]);
  if (available !== null && available.kind === "available") {
    if (
      !lossCommonValid(available, inputId) ||
      typeof available.valueW !== "number" ||
      !isZeroOrPositiveNormal(available.valueW) ||
      available.dimensionId !== "power" ||
      available.canonicalUnitId !== "W" ||
      !validKnownSource(available)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.loss_evidence_invalid",
          `${inputId} available loss evidence is malformed, negative, non-finite, subnormal or misbound.`,
          "Provide its fixed loss identity, canonical W value, non-electrical boundary, path identity and controlled source provenance.",
        ),
      });
    }
    const binding = readBinding(available.binding);
    if (!binding.ok) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.loss_evidence_invalid",
          binding.failure.failure.message,
          binding.failure.failure.action,
        ),
      });
    }
    const evidence: G05AvailableLossEvidence = Object.freeze({
        kind: "available",
        inputId,
        boundaryRole: LOSS_DEFINITIONS[inputId].boundaryRole,
        valueW: available.valueW,
        dimensionId: "power",
        canonicalUnitId: "W",
        portId: null,
        referencePlaneId: available.referencePlaneId as string,
        controlVolumeId: available.controlVolumeId as string,
        lossPathId: available.lossPathId as string,
        physicalLossSourceId: available.physicalLossSourceId as string,
        binding: binding.value,
        sourceMethod: available.sourceMethod as G05SourceMethod,
        sourceRef: available.sourceRef as string,
        dataQuality: available.dataQuality as Exclude<DataQuality, "unknown">,
        provenanceId: available.provenanceId as string,
        sourceSnapshotId: available.sourceSnapshotId as string,
      });
    return Object.freeze({
      ok: true,
      value: evidence,
    });
  }

  const unresolved = readExactPlainDataRecord(value, [
    "kind",
    "inputId",
    "boundaryRole",
    "reason",
    "resolutionSourceRef",
    "portId",
    "referencePlaneId",
    "controlVolumeId",
    "lossPathId",
    "physicalLossSourceId",
    "binding",
    "sourceMethod",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceSnapshotId",
  ]);
  if (
    unresolved === null ||
    (unresolved.kind !== "source_confirmed_not_applicable" &&
      unresolved.kind !== "unknown_applicable") ||
    !lossCommonValid(unresolved, inputId) ||
    !isNonBlankText(unresolved.reason) ||
    !isStableIdentifier(unresolved.resolutionSourceRef) ||
    (unresolved.kind === "source_confirmed_not_applicable"
      ? !validKnownSource(unresolved)
      : !validUnknownSource(unresolved))
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.loss_evidence_invalid",
        `${inputId} must be exact available, source-confirmed not-applicable, or unknown-applicable evidence.`,
        "Do not encode an unknown loss as numeric zero; preserve reason, path, binding and provenance without extra fields.",
      ),
    });
  }
  const binding = readBinding(unresolved.binding);
  if (!binding.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.loss_evidence_invalid",
        binding.failure.failure.message,
        binding.failure.failure.action,
      ),
    });
  }
  const common = {
    inputId,
    boundaryRole: LOSS_DEFINITIONS[inputId].boundaryRole,
    reason: unresolved.reason,
    resolutionSourceRef: unresolved.resolutionSourceRef,
    portId: null,
    referencePlaneId: unresolved.referencePlaneId as string,
    controlVolumeId: unresolved.controlVolumeId as string,
    lossPathId: unresolved.lossPathId as string,
    physicalLossSourceId: unresolved.physicalLossSourceId as string,
    binding: binding.value,
    sourceMethod: unresolved.sourceMethod as
      | G05SourceMethod
      | "unknown_or_unconfirmed",
    sourceRef: unresolved.sourceRef as string,
    dataQuality: unresolved.dataQuality as DataQuality,
    provenanceId: unresolved.provenanceId as string,
    sourceSnapshotId: unresolved.sourceSnapshotId as string,
  } as const;
  if (unresolved.kind === "source_confirmed_not_applicable") {
    const evidence: G05SourceConfirmedNotApplicableLossEvidence = Object.freeze({
      kind: "source_confirmed_not_applicable",
      ...common,
      sourceMethod: common.sourceMethod as G05SourceMethod,
      dataQuality: common.dataQuality as Exclude<DataQuality, "unknown">,
    });
    return Object.freeze({ ok: true, value: evidence });
  }
  const evidence: G05UnknownApplicableLossEvidence = Object.freeze({
    kind: "unknown_applicable",
    ...common,
  });
  return Object.freeze({ ok: true, value: evidence });
}

function efficiencyCommonValid(
  record: Readonly<Record<string, unknown>>,
  efficiencyId: G05EfficiencyId,
): boolean {
  const definition = EFFICIENCY_DEFINITIONS[efficiencyId];
  return (
    record.efficiencyId === efficiencyId &&
    record.stageRole === definition.stageRole &&
    isStableIdentifier(record.efficiencyBoundaryId) &&
    isStableIdentifier(record.physicalConversionStageId) &&
    isStableIdentifier(record.deviceId) &&
    isStableIdentifier(record.numeratorPortId) &&
    isStableIdentifier(record.denominatorPortId) &&
    isStableIdentifier(record.numeratorReferencePlaneId) &&
    isStableIdentifier(record.denominatorReferencePlaneId) &&
    record.numeratorReferencePlaneId !== record.denominatorReferencePlaneId &&
    isStableIdentifier(record.numeratorControlVolumeId) &&
    isStableIdentifier(record.denominatorControlVolumeId)
  );
}

const EFFICIENCY_COMMON_KEYS = Object.freeze([
  "efficiencyId",
  "stageRole",
  "efficiencyBoundaryId",
  "physicalConversionStageId",
  "deviceId",
  "numeratorPortId",
  "denominatorPortId",
  "numeratorReferencePlaneId",
  "denominatorReferencePlaneId",
  "numeratorControlVolumeId",
  "denominatorControlVolumeId",
  "binding",
  "sourceMethod",
  "sourceRef",
  "dataQuality",
  "provenanceId",
  "sourceSnapshotId",
] as const);

function copyEfficiencyCommon(
  record: Readonly<Record<string, unknown>>,
  efficiencyId: G05EfficiencyId,
  binding: G05PowerChainBinding,
): Omit<G05EfficiencyEvidenceCommon, "sourceMethod" | "dataQuality"> & {
  readonly sourceMethod: G05SourceMethod | "unknown_or_unconfirmed";
  readonly dataQuality: DataQuality;
} {
  return Object.freeze({
    efficiencyId,
    stageRole: EFFICIENCY_DEFINITIONS[efficiencyId].stageRole,
    efficiencyBoundaryId: record.efficiencyBoundaryId as string,
    physicalConversionStageId: record.physicalConversionStageId as string,
    deviceId: record.deviceId as string,
    numeratorPortId: record.numeratorPortId as string,
    denominatorPortId: record.denominatorPortId as string,
    numeratorReferencePlaneId: record.numeratorReferencePlaneId as string,
    denominatorReferencePlaneId: record.denominatorReferencePlaneId as string,
    numeratorControlVolumeId: record.numeratorControlVolumeId as string,
    denominatorControlVolumeId: record.denominatorControlVolumeId as string,
    binding,
    sourceMethod: record.sourceMethod as
      | G05SourceMethod
      | "unknown_or_unconfirmed",
    sourceRef: record.sourceRef as string,
    dataQuality: record.dataQuality as DataQuality,
    provenanceId: record.provenanceId as string,
    sourceSnapshotId: record.sourceSnapshotId as string,
  });
}

function readEfficiency(
  value: unknown,
  efficiencyId: G05EfficiencyId,
): ReadResult<G05EfficiencyEvidence> {
  const available = readExactPlainDataRecord(value, [
    "kind",
    "value",
    "dimensionId",
    "canonicalUnitId",
    ...EFFICIENCY_COMMON_KEYS,
  ]);
  if (available !== null && available.kind === "available") {
    if (
      !efficiencyCommonValid(available, efficiencyId) ||
      typeof available.value !== "number" ||
      available.dimensionId !== "dimensionless" ||
      available.canonicalUnitId !== "one" ||
      !validKnownSource(available)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.efficiency_evidence_invalid",
          `${efficiencyId} evidence is malformed, misbound or lacks controlled source provenance.`,
          "Provide the exact stage, two port/reference-plane boundaries, dimensionless value and source snapshot.",
        ),
      });
    }
    if (available.value === 0 || Object.is(available.value, -0)) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.efficiency_zero_invalid",
          `${efficiencyId}=0 violates the frozen conditional efficiency input range 0<eta<=1.`,
          "Resolve a positive measured/vendor/model efficiency or classify the stage explicitly not applicable; do not divide by zero.",
        ),
      });
    }
    if (
      !isPositiveNormal(available.value) ||
      available.value > 1
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.efficiency_out_of_range",
          `${efficiencyId} is non-finite, positive-subnormal or outside the passive (0,1] interval.`,
          "Correct the efficiency value and boundary evidence; G-05 never clamps or calibrates an efficiency.",
        ),
      });
    }
    const binding = readBinding(available.binding);
    if (!binding.ok) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.efficiency_evidence_invalid",
          binding.failure.failure.message,
          binding.failure.failure.action,
        ),
      });
    }
    const common = copyEfficiencyCommon(available, efficiencyId, binding.value);
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "available",
        ...common,
        value: available.value,
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
        sourceMethod: common.sourceMethod as G05SourceMethod,
        dataQuality: common.dataQuality as Exclude<DataQuality, "unknown">,
      }),
    });
  }

  const unresolved = readExactPlainDataRecord(value, [
    "kind",
    "reason",
    "resolutionSourceRef",
    ...EFFICIENCY_COMMON_KEYS,
  ]);
  if (
    unresolved === null ||
    (unresolved.kind !== "source_confirmed_not_applicable" &&
      unresolved.kind !== "unknown_applicable") ||
    !efficiencyCommonValid(unresolved, efficiencyId) ||
    !isNonBlankText(unresolved.reason) ||
    !isStableIdentifier(unresolved.resolutionSourceRef) ||
    (unresolved.kind === "source_confirmed_not_applicable"
      ? !validKnownSource(unresolved)
      : !validUnknownSource(unresolved))
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.efficiency_evidence_invalid",
        `${efficiencyId} must be exact available, source-confirmed not-applicable, or unknown-applicable evidence.`,
        "Never encode an unknown/absent efficiency as numeric unity; retain stage boundary, reason and provenance.",
      ),
    });
  }
  const binding = readBinding(unresolved.binding);
  if (!binding.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.efficiency_evidence_invalid",
        binding.failure.failure.message,
        binding.failure.failure.action,
      ),
    });
  }
  const common = copyEfficiencyCommon(unresolved, efficiencyId, binding.value);
  const resolution = {
    reason: unresolved.reason,
    resolutionSourceRef: unresolved.resolutionSourceRef,
  } as const;
  return Object.freeze({
    ok: true,
    value: Object.freeze(
      unresolved.kind === "source_confirmed_not_applicable"
        ? {
            kind: "source_confirmed_not_applicable" as const,
            ...common,
            ...resolution,
            sourceMethod: common.sourceMethod as G05SourceMethod,
            dataQuality: common.dataQuality as Exclude<DataQuality, "unknown">,
          }
        : {
            kind: "unknown_applicable" as const,
            ...common,
            ...resolution,
          },
    ),
  });
}

function readEfficiencies(value: unknown): ReadResult<G05EfficienciesEvidence> {
  const record = readExactPlainDataRecord(value, [
    "etaMatching",
    "etaInverter",
    "etaRectifier",
    "etaOther",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.efficiencies_schema_invalid",
        "G-05 efficiencies must contain exactly four conditional stage records.",
        "Provide etaMatching, etaInverter, etaRectifier and etaOther discriminated evidence.",
      ),
    });
  }
  const matching = readEfficiency(record.etaMatching, "eta_matching");
  if (!matching.ok) return matching;
  const inverter = readEfficiency(record.etaInverter, "eta_inv");
  if (!inverter.ok) return inverter;
  const rectifier = readEfficiency(record.etaRectifier, "eta_rect");
  if (!rectifier.ok) return rectifier;
  const other = readEfficiency(record.etaOther, "eta_other");
  if (!other.ok) return other;
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      etaMatching: matching.value,
      etaInverter: inverter.value,
      etaRectifier: rectifier.value,
      etaOther: other.value,
    }),
  });
}

function readOutputBoundary(
  value: unknown,
  outputId: G05OutputId,
): ReadResult<G05OutputBoundaryEvidence> {
  const record = readExactPlainDataRecord(value, [
    "outputId",
    "boundaryRole",
    "portId",
    "referencePlaneId",
    "controlVolumeId",
    "binding",
  ]);
  const definition = OUTPUT_DEFINITIONS[outputId];
  if (
    record === null ||
    record.outputId !== outputId ||
    record.boundaryRole !== definition.boundaryRole ||
    (definition.portRequired
      ? !isStableIdentifier(record.portId)
      : record.portId !== null) ||
    !isStableIdentifier(record.referencePlaneId) ||
    !isStableIdentifier(record.controlVolumeId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.output_boundary_invalid",
        `${outputId} target boundary is malformed or bound to the wrong fixed role/port type.`,
        "Provide the exact output identity, reference plane, control volume, port and power-chain binding.",
      ),
    });
  }
  const binding = readBinding(record.binding);
  if (!binding.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.output_boundary_invalid",
        binding.failure.failure.message,
        binding.failure.failure.action,
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      outputId,
      boundaryRole: definition.boundaryRole,
      portId: record.portId as string | null,
      referencePlaneId: record.referencePlaneId,
      controlVolumeId: record.controlVolumeId,
      binding: binding.value,
    }),
  });
}

function readOutputBoundaries(
  value: unknown,
): ReadResult<G05OutputBoundariesEvidence> {
  const record = readExactPlainDataRecord(value, [
    "workpieceAbsorbed",
    "coilTerminal",
    "gridInput",
  ]);
  if (record === null) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "G-05.output_boundaries_schema_invalid",
        "G-05 requires exactly three explicit target output boundaries.",
        "Provide workpieceAbsorbed, coilTerminal and gridInput target records.",
      ),
    });
  }
  const workpiece = readOutputBoundary(record.workpieceAbsorbed, "Pwp_abs");
  if (!workpiece.ok) return workpiece;
  const coil = readOutputBoundary(record.coilTerminal, "Pcoil_terminal");
  if (!coil.ok) return coil;
  const grid = readOutputBoundary(record.gridInput, "Pgrid");
  if (!grid.ok) return grid;
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      workpieceAbsorbed: workpiece.value,
      coilTerminal: coil.value,
      gridInput: grid.value,
    }),
  });
}

function readExactArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) return null;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    if (
      length === undefined ||
      !("value" in length) ||
      !Number.isSafeInteger(length.value) ||
      length.value < 0
    ) {
      return null;
    }
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== length.value + 1 ||
      keys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const output: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
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

function readIds(value: unknown): readonly string[] | null {
  const values = readExactArray(value);
  if (values === null || values.some((item) => !isStableIdentifier(item))) {
    return null;
  }
  return Object.freeze(values as string[]);
}

function readOverlapAssessment(value: unknown): ReadResult<G05OverlapAssessment> {
  const confirmed = readExactPlainDataRecord(value, [
    "status",
    "assessedIds",
    "physicalIdentityChecked",
    "assessmentSourceRef",
  ]);
  if (
    confirmed !== null &&
    confirmed.status === "confirmed_pairwise_nonoverlapping"
  ) {
    const ids = readIds(confirmed.assessedIds);
    if (
      ids === null ||
      confirmed.physicalIdentityChecked !== true ||
      !isStableIdentifier(confirmed.assessmentSourceRef)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.overlap_assessment_invalid",
          "A confirmed G-05 overlap assessment is malformed or omits physical identity checking.",
          "Provide the exact assessed ID set, physicalIdentityChecked=true and stable assessment source.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        status: "confirmed_pairwise_nonoverlapping",
        assessedIds: ids,
        physicalIdentityChecked: true,
        assessmentSourceRef: confirmed.assessmentSourceRef,
      }),
    });
  }
  const overlap = readExactPlainDataRecord(value, [
    "status",
    "assessedIds",
    "physicalIdentityChecked",
    "assessmentSourceRef",
    "overlapDescription",
  ]);
  if (overlap !== null && overlap.status === "overlap_or_double_count_present") {
    const ids = readIds(overlap.assessedIds);
    if (
      ids === null ||
      overlap.physicalIdentityChecked !== true ||
      !isStableIdentifier(overlap.assessmentSourceRef) ||
      !isNonBlankText(overlap.overlapDescription)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.overlap_assessment_invalid",
          "A known-overlap G-05 assessment is malformed.",
          "Provide exact assessed IDs, checked physical identity, stable source and overlap description.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        status: "overlap_or_double_count_present",
        assessedIds: ids,
        physicalIdentityChecked: true,
        assessmentSourceRef: overlap.assessmentSourceRef,
        overlapDescription: overlap.overlapDescription,
      }),
    });
  }
  const unknown = readExactPlainDataRecord(value, [
    "status",
    "assessedIds",
    "physicalIdentityChecked",
    "assessmentSourceRef",
    "reason",
  ]);
  if (unknown !== null && unknown.status === "unknown_or_unconfirmed") {
    const ids = readIds(unknown.assessedIds);
    if (
      ids === null ||
      (unknown.physicalIdentityChecked !== false &&
        unknown.physicalIdentityChecked !== null) ||
      !isStableIdentifier(unknown.assessmentSourceRef) ||
      !isNonBlankText(unknown.reason)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "G-05.overlap_assessment_invalid",
          "An unresolved G-05 overlap assessment is malformed.",
          "Provide explicit unknown status, current assessed IDs, reason and stable assessment source.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        status: "unknown_or_unconfirmed",
        assessedIds: ids,
        physicalIdentityChecked: unknown.physicalIdentityChecked,
        assessmentSourceRef: unknown.assessmentSourceRef,
        reason: unknown.reason,
      }),
    });
  }
  return Object.freeze({
    ok: false,
    failure: failure(
      "invalid_input",
      "G-05.overlap_assessment_invalid",
      "G-05 overlap evidence does not use an exact controlled discriminator.",
      "Declare confirmed non-overlap, known overlap/double count, or explicit unknown status.",
    ),
  });
}

function setsExactlyEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === left.length &&
    rightSet.size === right.length &&
    [...leftSet].every((item) => rightSet.has(item))
  );
}

interface G05BoundaryNode {
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
}

type G05EfficiencyChainResult =
  | Readonly<{
      readonly ok: true;
      readonly orderedEdges: readonly G05AvailableEfficiencyEvidence[];
    }>
  | Readonly<{ readonly ok: false }>;

function boundaryNodeKey(node: G05BoundaryNode): string {
  return `${node.portId}\u0000${node.referencePlaneId}\u0000${node.controlVolumeId}`;
}

function outputBoundaryNode(
  boundary: G05OutputBoundaryEvidence,
): G05BoundaryNode | null {
  if (boundary.portId === null) return null;
  return Object.freeze({
    portId: boundary.portId,
    referencePlaneId: boundary.referencePlaneId,
    controlVolumeId: boundary.controlVolumeId,
  });
}

function efficiencyNumeratorNode(
  efficiency: G05AvailableEfficiencyEvidence,
): G05BoundaryNode {
  return Object.freeze({
    portId: efficiency.numeratorPortId,
    referencePlaneId: efficiency.numeratorReferencePlaneId,
    controlVolumeId: efficiency.numeratorControlVolumeId,
  });
}

function efficiencyDenominatorNode(
  efficiency: G05AvailableEfficiencyEvidence,
): G05BoundaryNode {
  return Object.freeze({
    portId: efficiency.denominatorPortId,
    referencePlaneId: efficiency.denominatorReferencePlaneId,
    controlVolumeId: efficiency.denominatorControlVolumeId,
  });
}

/**
 * Proves one directed downstream-to-upstream path.  Each available efficiency
 * is the edge numerator boundary -> denominator boundary; N/A evidence is not
 * an edge and unknown evidence is screened before this proof is requested.
 */
function orderContinuousEfficiencyChain(
  coilBoundary: G05OutputBoundaryEvidence,
  gridBoundary: G05OutputBoundaryEvidence,
  edges: readonly G05AvailableEfficiencyEvidence[],
): G05EfficiencyChainResult {
  const coilNode = outputBoundaryNode(coilBoundary);
  const gridNode = outputBoundaryNode(gridBoundary);
  if (coilNode === null || gridNode === null) return Object.freeze({ ok: false });

  const startKey = boundaryNodeKey(coilNode);
  const endKey = boundaryNodeKey(gridNode);
  if (edges.length === 0) {
    return startKey === endKey
      ? Object.freeze({ ok: true, orderedEdges: Object.freeze([]) })
      : Object.freeze({ ok: false });
  }
  if (startKey === endKey) return Object.freeze({ ok: false });

  const outgoing = new Map<string, G05AvailableEfficiencyEvidence[]>();
  for (const edge of edges) {
    const fromKey = boundaryNodeKey(efficiencyNumeratorNode(edge));
    const current = outgoing.get(fromKey);
    if (current === undefined) outgoing.set(fromKey, [edge]);
    else current.push(edge);
  }

  const ordered: G05AvailableEfficiencyEvidence[] = [];
  const usedEdges = new Set<G05AvailableEfficiencyEvidence>();
  const visitedNodes = new Set<string>([startKey]);
  let currentKey = startKey;
  while (currentKey !== endKey) {
    const candidates = outgoing.get(currentKey) ?? [];
    if (candidates.length !== 1) return Object.freeze({ ok: false });
    const edge = candidates[0];
    if (edge === undefined || usedEdges.has(edge)) {
      return Object.freeze({ ok: false });
    }
    usedEdges.add(edge);
    ordered.push(edge);
    const nextKey = boundaryNodeKey(efficiencyDenominatorNode(edge));
    if (visitedNodes.has(nextKey)) return Object.freeze({ ok: false });
    visitedNodes.add(nextKey);
    currentKey = nextKey;
    if (ordered.length > edges.length) return Object.freeze({ ok: false });
  }

  if (ordered.length !== edges.length || usedEdges.size !== edges.length) {
    return Object.freeze({ ok: false });
  }
  return Object.freeze({
    ok: true,
    orderedEdges: Object.freeze(ordered),
  });
}

function sameBinding(left: G05PowerChainBinding, right: G05PowerChainBinding): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.stateSnapshotId === right.stateSnapshotId &&
    left.loadedState === right.loadedState &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.powerBasis === right.powerBasis &&
    left.powerChainSnapshotId === right.powerChainSnapshotId &&
    left.provenanceBasisId === right.provenanceBasisId
  );
}

function unavailableOutput(
  boundary: G05OutputBoundaryEvidence,
  reason: string,
  unresolvedItemIds: readonly string[],
): G05UnavailablePowerOutput {
  return Object.freeze({
    kind: "unavailable",
    outputId: boundary.outputId,
    status: "insufficient_data",
    reason,
    unresolvedItemIds: Object.freeze([...unresolvedItemIds]),
  });
}

function availableOutput(
  boundary: G05OutputBoundaryEvidence,
  valueSi: number,
): G05AvailablePowerOutput {
  return Object.freeze({
    kind: "available",
    outputId: boundary.outputId,
    status: "available",
    valueSi,
    dimensionId: "power",
    canonicalUnitId: "W",
    boundaryRole: boundary.boundaryRole,
    portId: boundary.portId,
    referencePlaneId: boundary.referencePlaneId,
    controlVolumeId: boundary.controlVolumeId,
    binding: boundary.binding,
  });
}

type NumericResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{ readonly ok: false; readonly failure: G05RequiredInputPowerFailure }>;

function numericFailure(operation: string): NumericResult {
  return Object.freeze({
    ok: false,
    failure: failure(
      "invalid_input",
      "G-05.numeric_resolution_invalid",
      `G-05 could not represent ${operation} without overflow, positive subnormal, false zero or a swallowed nonzero operand.`,
      "Use a numerically resolvable canonical-SI scale; G-05 does not reorder, clamp or discard terms/factors.",
    ),
  });
}

function orderedPositiveSum(values: readonly number[], label: string): NumericResult {
  let total = 0;
  for (const value of values) {
    const next = total + value;
    if (
      !Number.isFinite(next) ||
      (next > 0 && next < G05_BINARY64_MIN_NORMAL) ||
      (value > 0 && total > 0 && (next === total || next === value))
    ) {
      return numericFailure(label);
    }
    total = next;
  }
  return Object.freeze({ ok: true, value: total });
}

function orderedEfficiencyProduct(
  values: readonly number[],
  label: string,
): NumericResult {
  let product = 1;
  for (const value of values) {
    const next = product * value;
    if (
      !Number.isFinite(next) ||
      !isPositiveNormal(next) ||
      (value !== 1 && next === product) ||
      (product !== 1 && next === value)
    ) {
      return numericFailure(label);
    }
    product = next;
  }
  return Object.freeze({ ok: true, value: product });
}

function guardedDivide(powerW: number, efficiency: number): NumericResult {
  const value = powerW / efficiency;
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (powerW > 0 && !isPositiveNormal(value)) ||
    (efficiency !== 1 && powerW > 0 && value === powerW)
  ) {
    return numericFailure("Pcoil_terminal / applicable efficiency product");
  }
  return Object.freeze({ ok: true, value });
}

function guardedMultiply(left: number, right: number, label: string): NumericResult {
  const value = left * right;
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (left > 0 && right > 0 && !isPositiveNormal(value)) ||
    (right !== 1 && left > 0 && value === left) ||
    (left !== 1 && right > 0 && value === right)
  ) {
    return numericFailure(label);
  }
  return Object.freeze({ ok: true, value });
}

function guardedSubtract(left: number, right: number, label: string): NumericResult {
  const value = left - right;
  if (
    !Number.isFinite(value) ||
    (value !== 0 && Math.abs(value) < G05_BINARY64_MIN_NORMAL) ||
    (right > 0 && value === left) ||
    (left > 0 && value === -right)
  ) {
    return numericFailure(label);
  }
  return Object.freeze({ ok: true, value });
}

function unresolvedItem(
  itemId: string,
  category: G05UnresolvedItem["category"],
  reason: string,
  affectedOutputs: readonly G05OutputId[],
): G05UnresolvedItem {
  return Object.freeze({
    itemId,
    category,
    reason,
    affectedOutputs: Object.freeze([...affectedOutputs]),
  });
}

function trace(
  outputId: G05OutputId,
  equation: G05CalculationTrace["equation"],
  appliedIds: readonly string[],
  appliedValues: readonly number[],
  excludedIds: readonly string[],
  resultW: number | null,
): G05CalculationTrace {
  return Object.freeze({
    outputId,
    equation,
    orderedAppliedInputIds: Object.freeze([...appliedIds]),
    orderedAppliedValues: Object.freeze([...appliedValues]),
    sourceConfirmedNotApplicableInputIds: Object.freeze([...excludedIds]),
    publicationStatus: resultW === null ? "unavailable" : "published",
    resultW,
    inputAdjusted: false,
  });
}

function conservationCheck(
  outputId: G05OutputId,
  residualW: number | null,
): G05ConservationCheck {
  return Object.freeze({
    outputId,
    kind: residualW === null ? "unavailable" : "available",
    residualW,
    classification:
      residualW === null
        ? "not_evaluated_output_unavailable"
        : residualW === 0
          ? "exact_binary64_identity"
          : "finite_binary64_roundoff_residual",
    inputAdjusted: false,
  });
}

/** Isolated canonical-SI evaluation of frozen method G-05. */
export function evaluateG05RequiredInputPower(
  input: G05RequiredInputPowerInput,
): G05RequiredInputPowerOutcome {
  const record = readExactPlainDataRecord(input, [
    "usefulPower",
    "workpieceHeatLoss",
    "copperLoss",
    "strayLoss",
    "efficiencies",
    "outputBoundaries",
    "powerTermOverlapAssessment",
    "efficiencyOverlapAssessment",
  ]);
  if (record === null) {
    return failure(
      "invalid_input",
      "G-05.input_schema_invalid",
      "G-05 input must be one exact controlled plain-data record.",
      "Provide required power, three conditional losses, four conditional efficiencies, three output boundaries and both overlap assessments without extra/accessor/symbol fields.",
    );
  }

  /* Parse every schema and enum before any domain/unknown classification. */
  const usefulResult = readUsefulPower(record.usefulPower);
  const heatLossResult = readLoss(record.workpieceHeatLoss, "Qloss_wp");
  const copperResult = readLoss(record.copperLoss, "Pcu");
  const strayResult = readLoss(record.strayLoss, "Pstray");
  const efficienciesResult = readEfficiencies(record.efficiencies);
  const boundariesResult = readOutputBoundaries(record.outputBoundaries);
  const powerOverlapResult = readOverlapAssessment(
    record.powerTermOverlapAssessment,
  );
  const efficiencyOverlapResult = readOverlapAssessment(
    record.efficiencyOverlapAssessment,
  );
  if (!usefulResult.ok && usefulResult.failure.status === "invalid_input") {
    return usefulResult.failure;
  }
  if (!heatLossResult.ok) return heatLossResult.failure;
  if (!copperResult.ok) return copperResult.failure;
  if (!strayResult.ok) return strayResult.failure;
  if (!efficienciesResult.ok) return efficienciesResult.failure;
  if (!boundariesResult.ok) return boundariesResult.failure;
  if (!powerOverlapResult.ok) return powerOverlapResult.failure;
  if (!efficiencyOverlapResult.ok) return efficiencyOverlapResult.failure;
  if (!usefulResult.ok) return usefulResult.failure;

  const useful = usefulResult.value;
  const losses = Object.freeze([
    heatLossResult.value,
    copperResult.value,
    strayResult.value,
  ] as const);
  const efficiencies = Object.freeze([
    efficienciesResult.value.etaMatching,
    efficienciesResult.value.etaInverter,
    efficienciesResult.value.etaRectifier,
    efficienciesResult.value.etaOther,
  ] as const);
  const boundaries = boundariesResult.value;
  const powerOverlap = powerOverlapResult.value;
  const efficiencyOverlap = efficiencyOverlapResult.value;

  const applicableLosses = losses.filter(
    (loss) => loss.kind !== "source_confirmed_not_applicable",
  );
  const applicableEfficiencies = efficiencies.filter(
    (efficiency) => efficiency.kind !== "source_confirmed_not_applicable",
  );
  const allPowerPathIds = [
    useful.energyPathId,
    ...losses.map((loss) => loss.lossPathId),
  ];
  const allPowerPhysicalIds = [
    useful.physicalPowerSourceId,
    ...losses.map((loss) => loss.physicalLossSourceId),
  ];
  if (
    new Set(allPowerPathIds).size !== allPowerPathIds.length ||
    new Set(allPowerPhysicalIds).size !== allPowerPhysicalIds.length
  ) {
    return failure(
      "not_applicable",
      "G-05.loss_overlap_or_double_count",
      "Useful power or conditional loss evidence reuses an energy/loss path or physical source identity.",
      "Deduplicate the power inventory; each physical contribution and path appears exactly once even when source-confirmed not applicable.",
    );
  }
  const allEfficiencyBoundaryIds = efficiencies.map(
    (efficiency) => efficiency.efficiencyBoundaryId,
  );
  const allPhysicalStageIds = efficiencies.map(
    (efficiency) => efficiency.physicalConversionStageId,
  );
  const allBoundaryPairs = efficiencies.map(
    (efficiency) =>
      `${efficiency.numeratorReferencePlaneId}\u0000${efficiency.denominatorReferencePlaneId}`,
  );
  if (
    new Set(allEfficiencyBoundaryIds).size !== allEfficiencyBoundaryIds.length ||
    new Set(allPhysicalStageIds).size !== allPhysicalStageIds.length ||
    new Set(allBoundaryPairs).size !== allBoundaryPairs.length
  ) {
    return failure(
      "not_applicable",
      "G-05.efficiency_overlap_or_double_count",
      "Conditional efficiency evidence reuses a boundary, physical conversion stage or numerator/denominator reference-plane pair.",
      "Deduplicate the efficiency chain; overall or overlapping device efficiencies must not be multiplied with their staged components.",
    );
  }
  if (powerOverlap.status === "overlap_or_double_count_present") {
    return failure(
      "not_applicable",
      "G-05.loss_overlap_or_double_count",
      "The explicit power-term assessment identifies an overlap or double count.",
      "Resolve the overlap before calculating any G-05 power boundary.",
    );
  }
  if (efficiencyOverlap.status === "overlap_or_double_count_present") {
    return failure(
      "not_applicable",
      "G-05.efficiency_overlap_or_double_count",
      "The explicit efficiency assessment identifies overlapping conversion boundaries.",
      "Use a non-overlapping staged chain and never multiply a total efficiency with its component efficiencies.",
    );
  }

  const applicablePowerPathIds = [
    useful.energyPathId,
    ...applicableLosses.map((loss) => loss.lossPathId),
  ];
  const applicableEfficiencyIds = applicableEfficiencies.map(
    (efficiency) => efficiency.efficiencyBoundaryId,
  );
  if (
    powerOverlap.status !== "unknown_or_unconfirmed" &&
    !setsExactlyEqual(powerOverlap.assessedIds, applicablePowerPathIds)
  ) {
    return failure(
      "invalid_input",
      "G-05.overlap_assessment_set_mismatch",
      "The power-term overlap assessment does not cover exactly the applicable useful/loss path set.",
      "Regenerate the assessment from the current applicable inventory without omissions, extras or duplicate IDs.",
    );
  }
  if (
    efficiencyOverlap.status !== "unknown_or_unconfirmed" &&
    !setsExactlyEqual(efficiencyOverlap.assessedIds, applicableEfficiencyIds)
  ) {
    return failure(
      "invalid_input",
      "G-05.overlap_assessment_set_mismatch",
      "The efficiency overlap assessment does not cover exactly the applicable conversion-boundary set.",
      "Regenerate the assessment from the current applicable efficiency inventory.",
    );
  }

  const allBindings = [
    useful.binding,
    ...losses.map((loss) => loss.binding),
    ...efficiencies.map((efficiency) => efficiency.binding),
    boundaries.workpieceAbsorbed.binding,
    boundaries.coilTerminal.binding,
    boundaries.gridInput.binding,
  ];
  const knownPowerBases = allBindings
    .map((binding) => binding.powerBasis)
    .filter(
      (basis): basis is Exclude<G05PowerBasis, "unknown_or_unconfirmed"> =>
        basis !== "unknown_or_unconfirmed",
    );
  const hasPeak = knownPowerBases.includes("peak_power");
  const hasAverage = knownPowerBases.some(
    (basis) =>
      basis === "steady_average_power" || basis === "cycle_average_power",
  );
  if (hasPeak && hasAverage) {
    return failure(
      "not_applicable",
      "G-05.peak_average_power_mixed",
      "The G-05 chain mixes peak and average powers/efficiencies.",
      "Resolve every term and efficiency to one explicit simultaneous power basis; do not combine peak demand with average losses or efficiencies.",
    );
  }
  if (useful.binding.powerBasis === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-05.required_power_basis_unconfirmed",
      "Required Puseful has an unknown power basis.",
      "Confirm its instantaneous, peak, steady-average or cycle-average basis before deriving any boundary power.",
    );
  }

  const unresolved: G05UnresolvedItem[] = [];
  const bindingIssue = (
    itemId: string,
    binding: G05PowerChainBinding,
    reference: G05PowerChainBinding,
    affected: readonly G05OutputId[],
  ): void => {
    if (binding.powerBasis === "unknown_or_unconfirmed") {
      unresolved.push(
        unresolvedItem(
          `power-basis:${itemId}`,
          "power_basis_unconfirmed",
          `${itemId} power basis is unknown or unconfirmed.`,
          affected,
        ),
      );
    } else if (!sameBinding(binding, reference)) {
      unresolved.push(
        unresolvedItem(
          `binding:${itemId}`,
          "boundary_binding_mismatch",
          `${itemId} does not share the required case/state/time-window/power-basis/chain/provenance binding.`,
          affected,
        ),
      );
    }
  };

  bindingIssue(
    "Qloss_wp",
    losses[0].binding,
    useful.binding,
    ["Pwp_abs", "Pcoil_terminal", "Pgrid"],
  );
  bindingIssue(
    "Pwp_abs_boundary",
    boundaries.workpieceAbsorbed.binding,
    useful.binding,
    ["Pwp_abs", "Pcoil_terminal", "Pgrid"],
  );
  bindingIssue(
    "Pcu",
    losses[1].binding,
    useful.binding,
    ["Pcoil_terminal", "Pgrid"],
  );
  bindingIssue(
    "Pstray",
    losses[2].binding,
    useful.binding,
    ["Pcoil_terminal", "Pgrid"],
  );
  bindingIssue(
    "Pcoil_terminal_boundary",
    boundaries.coilTerminal.binding,
    useful.binding,
    ["Pcoil_terminal", "Pgrid"],
  );
  for (const efficiency of efficiencies) {
    bindingIssue(
      efficiency.efficiencyId,
      efficiency.binding,
      useful.binding,
      ["Pgrid"],
    );
  }
  bindingIssue(
    "Pgrid_boundary",
    boundaries.gridInput.binding,
    useful.binding,
    ["Pgrid"],
  );

  for (const loss of losses) {
    if (loss.kind === "unknown_applicable") {
      unresolved.push(
        unresolvedItem(
          loss.inputId,
          "unknown_loss",
          loss.reason,
          loss.inputId === "Qloss_wp"
            ? ["Pwp_abs", "Pcoil_terminal", "Pgrid"]
            : ["Pcoil_terminal", "Pgrid"],
        ),
      );
    }
  }
  for (const efficiency of efficiencies) {
    if (efficiency.kind === "unknown_applicable") {
      unresolved.push(
        unresolvedItem(
          efficiency.efficiencyId,
          "unknown_efficiency",
          efficiency.reason,
          ["Pgrid"],
        ),
      );
    }
  }
  if (powerOverlap.status === "unknown_or_unconfirmed") {
    unresolved.push(
      unresolvedItem(
        "powerTermOverlapAssessment",
        "power_term_overlap_unconfirmed",
        powerOverlap.reason,
        ["Pwp_abs", "Pcoil_terminal", "Pgrid"],
      ),
    );
  }
  if (efficiencyOverlap.status === "unknown_or_unconfirmed") {
    unresolved.push(
      unresolvedItem(
        "efficiencyOverlapAssessment",
        "efficiency_overlap_unconfirmed",
        efficiencyOverlap.reason,
        ["Pgrid"],
      ),
    );
  }

  const affects = (outputId: G05OutputId): readonly G05UnresolvedItem[] =>
    unresolved.filter((item) => item.affectedOutputs.includes(outputId));

  let pwp: G05PowerOutput;
  let pwpTrace: G05CalculationTrace;
  let pwpResidual: number | null = null;
  const pwpIssues = affects("Pwp_abs");
  const qloss = losses[0];
  if (pwpIssues.length > 0) {
    pwp = unavailableOutput(
      boundaries.workpieceAbsorbed,
      "Pwp_abs depends on unresolved Qloss/binding/overlap evidence.",
      pwpIssues.map((item) => item.itemId),
    );
    pwpTrace = trace(
      "Pwp_abs",
      "Pwp_abs = Puseful + Qloss_wp",
      ["Puseful"],
      [useful.valueW],
      qloss.kind === "source_confirmed_not_applicable" ? ["Qloss_wp"] : [],
      null,
    );
  } else {
    const pwpValues = [
      useful.valueW,
      ...(qloss.kind === "available" ? [qloss.valueW] : []),
    ];
    const sum = orderedPositiveSum(pwpValues, "Puseful + Qloss_wp");
    if (!sum.ok) return sum.failure;
    pwp = availableOutput(boundaries.workpieceAbsorbed, sum.value);
    pwpTrace = trace(
      "Pwp_abs",
      "Pwp_abs = Puseful + Qloss_wp",
      ["Puseful", ...(qloss.kind === "available" ? ["Qloss_wp"] : [])],
      pwpValues,
      qloss.kind === "source_confirmed_not_applicable" ? ["Qloss_wp"] : [],
      sum.value,
    );
    const reverse = orderedPositiveSum(pwpValues, "Pwp conservation reverse sum");
    if (!reverse.ok) return reverse.failure;
    const residual = guardedSubtract(sum.value, reverse.value, "Pwp conservation residual");
    if (!residual.ok) return residual.failure;
    pwpResidual = residual.value;
  }

  let pcoil: G05PowerOutput;
  let pcoilTrace: G05CalculationTrace;
  let pcoilResidual: number | null = null;
  const pcoilIssues = affects("Pcoil_terminal");
  const pcu = losses[1];
  const pstray = losses[2];
  if (pcoilIssues.length > 0 || pwp.kind === "unavailable") {
    const ids = new Set([
      ...pcoilIssues.map((item) => item.itemId),
      ...(pwp.kind === "unavailable" ? pwp.unresolvedItemIds : []),
    ]);
    pcoil = unavailableOutput(
      boundaries.coilTerminal,
      "Pcoil_terminal depends on unresolved Pwp_abs/Pcu/Pstray evidence.",
      [...ids],
    );
    pcoilTrace = trace(
      "Pcoil_terminal",
      "Pcoil_terminal = Pwp_abs + Pcu + Pstray",
      [],
      [],
      [
        ...(pcu.kind === "source_confirmed_not_applicable" ? ["Pcu"] : []),
        ...(pstray.kind === "source_confirmed_not_applicable" ? ["Pstray"] : []),
      ],
      null,
    );
  } else {
    const values = [
      pwp.valueSi,
      ...(pcu.kind === "available" ? [pcu.valueW] : []),
      ...(pstray.kind === "available" ? [pstray.valueW] : []),
    ];
    const sum = orderedPositiveSum(values, "Pwp_abs + Pcu + Pstray");
    if (!sum.ok) return sum.failure;
    pcoil = availableOutput(boundaries.coilTerminal, sum.value);
    pcoilTrace = trace(
      "Pcoil_terminal",
      "Pcoil_terminal = Pwp_abs + Pcu + Pstray",
      [
        "Pwp_abs",
        ...(pcu.kind === "available" ? ["Pcu"] : []),
        ...(pstray.kind === "available" ? ["Pstray"] : []),
      ],
      values,
      [
        ...(pcu.kind === "source_confirmed_not_applicable" ? ["Pcu"] : []),
        ...(pstray.kind === "source_confirmed_not_applicable" ? ["Pstray"] : []),
      ],
      sum.value,
    );
    const reverse = orderedPositiveSum(values, "Pcoil conservation reverse sum");
    if (!reverse.ok) return reverse.failure;
    const residual = guardedSubtract(sum.value, reverse.value, "Pcoil conservation residual");
    if (!residual.ok) return residual.failure;
    pcoilResidual = residual.value;
  }

  let pgrid: G05PowerOutput;
  let pgridTrace: G05CalculationTrace;
  let pgridResidual: number | null = null;
  const pgridIssues = affects("Pgrid");
  const appliedEfficiencies = efficiencies.filter(
    (efficiency): efficiency is G05AvailableEfficiencyEvidence =>
      efficiency.kind === "available",
  );
  const excludedEfficiencies = efficiencies.filter(
    (efficiency) => efficiency.kind === "source_confirmed_not_applicable",
  );
  if (pgridIssues.length > 0 || pcoil.kind === "unavailable") {
    const ids = new Set([
      ...pgridIssues.map((item) => item.itemId),
      ...(pcoil.kind === "unavailable" ? pcoil.unresolvedItemIds : []),
    ]);
    pgrid = unavailableOutput(
      boundaries.gridInput,
      "Pgrid depends on resolved Pcoil_terminal and a complete non-overlapping efficiency chain.",
      [...ids],
    );
    pgridTrace = trace(
      "Pgrid",
      "Pgrid = Pcoil_terminal / (eta_matching * eta_inv * eta_rect * eta_other)",
      appliedEfficiencies.map((efficiency) => efficiency.efficiencyId),
      appliedEfficiencies.map((efficiency) => efficiency.value),
      excludedEfficiencies.map((efficiency) => efficiency.efficiencyId),
      null,
    );
  } else {
    const chain = orderContinuousEfficiencyChain(
      boundaries.coilTerminal,
      boundaries.gridInput,
      appliedEfficiencies,
    );
    if (!chain.ok) {
      return failure(
        "invalid_input",
        "G-05.efficiency_chain_not_contiguous",
        "Available efficiency boundaries do not form one continuous directed path from the coil-terminal output boundary to the grid-input output boundary.",
        "Connect every available numerator (downstream) boundary to the preceding denominator (upstream) boundary exactly once; remove gaps, reversed edges, branches, cycles and unrelated edges. With no available edge, coil and grid nodes must be identical.",
      );
    }
    /* The graph walk proves connectivity only.  Floating-point evaluation and
     * controlled trace retain the frozen eta_matching/inv/rect/other order. */
    const factors = appliedEfficiencies.map((efficiency) => efficiency.value);
    const product = orderedEfficiencyProduct(
      factors,
      "eta_matching * eta_inv * eta_rect * eta_other",
    );
    if (!product.ok) return product.failure;
    const divided = guardedDivide(pcoil.valueSi, product.value);
    if (!divided.ok) return divided.failure;
    pgrid = availableOutput(boundaries.gridInput, divided.value);
    pgridTrace = trace(
      "Pgrid",
      "Pgrid = Pcoil_terminal / (eta_matching * eta_inv * eta_rect * eta_other)",
      ["Pcoil_terminal", ...appliedEfficiencies.map((item) => item.efficiencyId)],
      [pcoil.valueSi, ...factors],
      excludedEfficiencies.map((efficiency) => efficiency.efficiencyId),
      divided.value,
    );
    const reverse = guardedMultiply(
      divided.value,
      product.value,
      "Pgrid conservation reverse multiplication",
    );
    if (!reverse.ok) return reverse.failure;
    const residual = guardedSubtract(
      reverse.value,
      pcoil.valueSi,
      "Pgrid efficiency-chain conservation residual",
    );
    if (!residual.ok) return residual.failure;
    pgridResidual = residual.value;
  }

  const unresolvedItems = Object.freeze(unresolved);
  return Object.freeze({
    methodId: G05_METHOD_ID,
    methodVersion: G05_METHOD_VERSION,
    methodApproval: "approved",
    status: "success",
    calculationStatus:
      pwp.kind === "available" &&
      pcoil.kind === "available" &&
      pgrid.kind === "available"
        ? "complete"
        : "partial",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY,
    warnings: EMPTY,
    value: Object.freeze({
      Pwp_abs: pwp,
      Pcoil_terminal: pcoil,
      Pgrid: pgrid,
      unknownItems: unresolvedItems,
    }),
    calculationTrace: Object.freeze([pwpTrace, pcoilTrace, pgridTrace]),
    conservationChecks: Object.freeze([
      conservationCheck("Pwp_abs", pwpResidual),
      conservationCheck("Pcoil_terminal", pcoilResidual),
      conservationCheck("Pgrid", pgridResidual),
    ]),
    inputSnapshot: Object.freeze({
      usefulPower: useful,
      losses,
      efficiencies,
      outputBoundaries: Object.freeze([
        boundaries.workpieceAbsorbed,
        boundaries.coilTerminal,
        boundaries.gridInput,
      ]),
      powerTermOverlapAssessment: powerOverlap,
      efficiencyOverlapAssessment: efficiencyOverlap,
    }),
    sourceRefs: G05_SOURCE_REFS,
    contractSourceRefs: G05_CONTRACT_SOURCE_REFS,
    derivationRefs: G05_DERIVATION_REFS,
    validationCaseIds: G05_VALIDATION_CASE_IDS,
    methodCheckIds: G05_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G05_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "every published power uses one declared case, state, loaded state, time basis, measurement window, power basis, power-chain snapshot and provenance basis",
      "source-confirmed not-applicable conditional items are excluded from the applicable set without numeric zero or unity placeholders",
      "unknown conditional items remain explicit and close only their dependent downstream outputs",
      "loss paths and efficiency boundaries are non-overlapping and each applicable item appears exactly once",
      "efficiency factors are dimensionless, positive and no greater than one",
      "conservation checks never tune or overwrite input evidence",
    ] as const),
  });
}
