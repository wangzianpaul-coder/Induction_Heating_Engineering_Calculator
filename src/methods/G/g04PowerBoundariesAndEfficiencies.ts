import { LOADED_STATES, type LoadedState } from "../../domain/electrical.js";
import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-04"));

export const G04_METHOD_ID = "G-04" as const;
export const G04_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G04_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G04_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G04_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G04_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G04_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G04_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G04_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputOrResultPolicy: "fail_closed" as const,
  overflowFalseZeroAndSwallowedTermPolicy: "fail_closed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G04_BINARY64_MIN_NORMAL,
});

export const G04_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "isolated_implementation_not_runtime_activated" as const,
  runtimeActivated: false as const,
  publicApiExported: false as const,
});

const ZERO_DENOMINATOR_PREDICATE = "denominator is zero" as const;
const EFFICIENCY_EXCEEDS_ONE_PREDICATE =
  "efficiency exceeds one beyond uncertainty" as const;
const DOUBLE_MULTIPLICATION_PREDICATE =
  "overall and staged efficiencies are multiplied twice" as const;
const REACTIVE_AS_LOSS_PREDICATE =
  "reactive power is counted as loss" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-04 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G04_WARNING_PREDICATES = Object.freeze({
  denominatorIsZero: controlledWarningPredicate(ZERO_DENOMINATOR_PREDICATE),
  efficiencyExceedsOneBeyondUncertainty: controlledWarningPredicate(
    EFFICIENCY_EXCEEDS_ONE_PREDICATE,
  ),
  overallAndStagedEfficienciesMultipliedTwice: controlledWarningPredicate(
    DOUBLE_MULTIPLICATION_PREDICATE,
  ),
  reactivePowerCountedAsLoss: controlledWarningPredicate(
    REACTIVE_AS_LOSS_PREDICATE,
  ),
});

export const G04_POWER_BOUNDARY_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: G04_SOURCE_REFS,
  contractSourceRefs: G04_CONTRACT_SOURCE_REFS,
  derivationRefs: G04_DERIVATION_REFS,
  validationCaseIds: G04_VALIDATION_CASE_IDS,
  methodCheckIds: G04_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G04_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: G04_IMPLEMENTATION_READINESS,
});

export type G04PowerParameterId =
  | "P_grid"
  | "P_inverter_out"
  | "P_coil_terminal"
  | "P_workpiece_absorbed"
  | "P_useful"
  | "P_cu"
  | "Q_loss_environment";

export type G04PowerBoundaryRole =
  | "grid_input_active_power"
  | "inverter_output_active_power"
  | "coil_terminal_active_power"
  | "workpiece_absorbed_power"
  | "useful_process_power"
  | "coil_copper_loss"
  | "workpiece_environment_heat_loss";

export type G04PowerQuantityFamily =
  | "active_power"
  | "heat_rate"
  | "reactive_power";

export type G04PowerSourceKind =
  | "measurement"
  | "analytical_model"
  | "numerical_model"
  | "fem"
  | "sourced_user_input";

export interface G04AvailablePowerEvidence {
  readonly kind: "available";
  readonly parameterId: G04PowerParameterId;
  /** Canonical-SI watts. */
  readonly valueW: number;
  readonly quantityFamily: G04PowerQuantityFamily;
  readonly boundaryRole: G04PowerBoundaryRole;
  /** Null only for a declared non-electrical heat/control-volume boundary. */
  readonly portId: string | null;
  readonly referencePlaneId: string;
  readonly controlVolumeId: string;
  readonly caseSnapshotId: string;
  readonly stateSnapshotId: string;
  readonly loadedState: LoadedState;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly powerChainSnapshotId: string;
  readonly provenanceBasisId: string;
  readonly sourceKind: G04PowerSourceKind;
  readonly sourceRef: string;
  readonly sourceSnapshotId: string;
}

export interface G04UnavailablePowerEvidence {
  readonly kind: "unavailable";
  readonly status: "missing";
  readonly parameterId: G04PowerParameterId;
  readonly reason: string;
}

export type G04PowerEvidence =
  | G04AvailablePowerEvidence
  | G04UnavailablePowerEvidence;

export type G04EfficiencyId =
  | "eta_inv"
  | "eta_coil_wp"
  | "eta_thermal"
  | "eta_overall";

export interface G04PrecomputedEfficiencyConsistencyUncertainty {
  readonly kind:
    "precomputed_expanded_uncertainty_of_numerator_minus_denominator";
  readonly ratioId: G04EfficiencyId;
  /** Canonical-SI expanded uncertainty of the already propagated N-D residual. */
  readonly expandedDifferenceUncertaintyW: number;
  readonly coverageFactor: number;
  readonly uncertaintySourceRef: string;
}

export interface G04UnavailableEfficiencyConsistencyUncertainty {
  readonly kind: "not_available";
  readonly ratioId: G04EfficiencyId;
  readonly reason: string;
}

export type G04EfficiencyConsistencyUncertainty =
  | G04PrecomputedEfficiencyConsistencyUncertainty
  | G04UnavailableEfficiencyConsistencyUncertainty;

export interface G04RatioUncertainties {
  readonly etaInverter: G04EfficiencyConsistencyUncertainty;
  readonly etaCoilToWorkpiece: G04EfficiencyConsistencyUncertainty;
  readonly etaThermal: G04EfficiencyConsistencyUncertainty;
  readonly etaOverall: G04EfficiencyConsistencyUncertainty;
}

export interface G04AccountingAssessment {
  readonly overallAndStagedEfficiencyTreatment:
    | "independent_boundary_ratios_no_double_counting"
    | "overall_and_staged_multiplication_requested"
    | "unknown_or_unconfirmed";
  readonly reactivePowerTreatment:
    | "excluded_from_active_power_and_heat_loss_inputs"
    | "included_or_requested_as_loss"
    | "unknown_or_unconfirmed";
  readonly assessmentSourceRef: string;
}

export interface G04PowerBoundariesAndEfficienciesInput {
  readonly gridPower: G04PowerEvidence;
  readonly inverterOutputPower: G04PowerEvidence;
  readonly coilTerminalPower: G04PowerEvidence;
  readonly workpieceAbsorbedPower: G04PowerEvidence;
  readonly usefulPower: G04PowerEvidence;
  readonly copperLoss: G04PowerEvidence;
  readonly workpieceHeatLoss: G04PowerEvidence;
  readonly ratioUncertainties: G04RatioUncertainties;
  readonly accountingAssessment: G04AccountingAssessment;
}

export interface G04AvailableEfficiencyOutput {
  readonly kind: "available";
  readonly outputId: G04EfficiencyId;
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly numeratorParameterId: G04PowerParameterId;
  readonly denominatorParameterId: G04PowerParameterId;
}

export interface G04UnavailableEfficiencyOutput {
  readonly kind: "unavailable";
  readonly outputId: G04EfficiencyId;
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export type G04EfficiencyOutput =
  | G04AvailableEfficiencyOutput
  | G04UnavailableEfficiencyOutput;

export interface G04Warning {
  readonly code:
    | "G-04.denominator_zero"
    | "G-04.nominal_efficiency_exceeds_one_within_uncertainty";
  readonly severity: "warning";
  readonly ratioId: G04EfficiencyId;
  readonly guardedPredicateRef:
    | typeof ZERO_DENOMINATOR_PREDICATE
    | typeof EFFICIENCY_EXCEEDS_ONE_PREDICATE;
  readonly predicateOutcome:
    | "not_evaluated_zero_denominator"
    | "not_triggered_within_uncertainty";
  readonly message: string;
}

export interface G04AvailableAccountingCheck {
  readonly kind: "available";
  readonly checkId:
    | "workpiece_useful_plus_environment_loss"
    | "coil_absorbed_plus_copper_minimum";
  readonly equation:
    | "P_workpiece_absorbed - (P_useful + Q_loss_environment)"
    | "P_coil_terminal - (P_workpiece_absorbed + P_cu)";
  readonly boundaryInputW: number;
  readonly accountedSumW: number;
  readonly residualW: number;
  readonly classification:
    | "exact_binary64_balance"
    | "positive_unaccounted_residual"
    | "nominal_accounted_sum_exceeds_boundary";
  readonly inputAdjusted: false;
}

export interface G04UnavailableAccountingCheck {
  readonly kind: "unavailable";
  readonly checkId:
    | "workpiece_useful_plus_environment_loss"
    | "coil_absorbed_plus_copper_minimum";
  readonly reason: "missing quantity" | "boundary chain mismatch";
}

export type G04AccountingCheck =
  | G04AvailableAccountingCheck
  | G04UnavailableAccountingCheck;

export interface G04RatioTrace {
  readonly ratioId: G04EfficiencyId;
  readonly equation:
    | "eta_inv = P_inverter_out / P_grid"
    | "eta_coil_wp = P_workpiece_absorbed / P_coil_terminal"
    | "eta_thermal = P_useful / P_workpiece_absorbed"
    | "eta_overall = P_useful / P_grid";
  readonly numeratorParameterId: G04PowerParameterId;
  readonly denominatorParameterId: G04PowerParameterId;
  readonly numeratorW: number | null;
  readonly denominatorW: number | null;
  readonly nominalNumeratorMinusDenominatorW: number | null;
  readonly expandedDifferenceUncertaintyW: number | null;
  readonly boundaryConsistency:
    | "confirmed"
    | "not_evaluated_missing_quantity"
    | "mismatch";
  readonly publicationStatus:
    | "published"
    | "unavailable_missing_quantity"
    | "unavailable_boundary_mismatch"
    | "unavailable_zero_denominator"
    | "unavailable_nominal_exceedance_within_uncertainty";
  readonly inputAdjusted: false;
}

export interface G04PowerBoundariesAndEfficienciesSuccess {
  readonly methodId: typeof G04_METHOD_ID;
  readonly methodVersion: typeof G04_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** The frozen contract has predicates but no stable warning_id entries. */
  readonly warningIds: readonly [];
  readonly warnings: readonly G04Warning[];
  readonly value: Readonly<{
    readonly eta_inv: G04EfficiencyOutput;
    readonly eta_coil_wp: G04EfficiencyOutput;
    readonly eta_thermal: G04EfficiencyOutput;
    readonly eta_overall: G04EfficiencyOutput;
  }>;
  readonly missingBoundaryParameterIds: readonly G04PowerParameterId[];
  readonly powerSnapshot: Readonly<{
    readonly P_grid: G04PowerEvidence;
    readonly P_inverter_out: G04PowerEvidence;
    readonly P_coil_terminal: G04PowerEvidence;
    readonly P_workpiece_absorbed: G04PowerEvidence;
    readonly P_useful: G04PowerEvidence;
    readonly P_cu: G04PowerEvidence;
    readonly Q_loss_environment: G04PowerEvidence;
  }>;
  readonly uncertaintySnapshot: Readonly<G04RatioUncertainties>;
  readonly accountingAssessment: Readonly<G04AccountingAssessment>;
  readonly calculationTrace: readonly G04RatioTrace[];
  readonly accountingChecks: Readonly<{
    readonly workpieceBalance: G04AccountingCheck;
    readonly coilMinimumBalance: G04AccountingCheck;
  }>;
  readonly sourceRefs: typeof G04_SOURCE_REFS;
  readonly contractSourceRefs: typeof G04_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G04_DERIVATION_REFS;
  readonly validationCaseIds: typeof G04_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G04_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy:
    typeof G04_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "each named power remains on its declared port or control-volume reference plane",
    "each published ratio uses one case, state, loaded state, time basis, measurement window, power-chain snapshot and provenance basis",
    "overall efficiency is the direct P_useful/P_grid boundary ratio and is never reconstructed by multiplying staged ratios",
    "reactive power is excluded from active-power and heat-loss accounting",
    "only an explicitly precomputed expanded uncertainty of numerator-minus-denominator may classify nominal efficiency above one",
    "conservation diagnostics never adjust, calibrate or silently complete an input power balance",
  ];
  readonly failure?: never;
}

export type G04FailureCode =
  | "G-04.input_schema_invalid"
  | "G-04.power_evidence_invalid"
  | "G-04.ratio_uncertainty_schema_invalid"
  | "G-04.ratio_uncertainty_invalid"
  | "G-04.accounting_assessment_missing"
  | "G-04.accounting_assessment_invalid"
  | "G-04.double_counting_not_applicable"
  | "G-04.reactive_power_not_applicable"
  | "G-04.quantity_family_not_applicable"
  | "G-04.accounting_assessment_unconfirmed"
  | "G-04.uncertainty_required_for_nominal_exceedance"
  | "G-04.efficiency_exceeds_one_beyond_uncertainty"
  | "G-04.numeric_resolution_invalid";

export interface G04PowerBoundariesAndEfficienciesFailure {
  readonly methodId: typeof G04_METHOD_ID;
  readonly methodVersion: typeof G04_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status:
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable"
    | "inconsistent_measurement";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: G04FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly powerSnapshot?: never;
  readonly uncertaintySnapshot?: never;
  readonly accountingAssessment?: never;
  readonly calculationTrace?: never;
  readonly accountingChecks?: never;
}

export type G04PowerBoundariesAndEfficienciesOutcome =
  | G04PowerBoundariesAndEfficienciesSuccess
  | G04PowerBoundariesAndEfficienciesFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

const POWER_QUANTITY_FAMILIES = Object.freeze([
  "active_power",
  "heat_rate",
  "reactive_power",
] as const);

const POWER_SOURCE_KINDS = Object.freeze([
  "measurement",
  "analytical_model",
  "numerical_model",
  "fem",
  "sourced_user_input",
] as const);

const OVERALL_AND_STAGED_TREATMENTS = Object.freeze([
  "independent_boundary_ratios_no_double_counting",
  "overall_and_staged_multiplication_requested",
  "unknown_or_unconfirmed",
] as const);

const REACTIVE_POWER_TREATMENTS = Object.freeze([
  "excluded_from_active_power_and_heat_loss_inputs",
  "included_or_requested_as_loss",
  "unknown_or_unconfirmed",
] as const);

interface PowerSlotDefinition {
  readonly inputKey:
    | "gridPower"
    | "inverterOutputPower"
    | "coilTerminalPower"
    | "workpieceAbsorbedPower"
    | "usefulPower"
    | "copperLoss"
    | "workpieceHeatLoss";
  readonly parameterId: G04PowerParameterId;
  readonly boundaryRole: G04PowerBoundaryRole;
  readonly quantityFamily: Exclude<G04PowerQuantityFamily, "reactive_power">;
  readonly electricalPortRequired: boolean;
}

const POWER_SLOT_DEFINITIONS = Object.freeze([
  Object.freeze({
    inputKey: "gridPower",
    parameterId: "P_grid",
    boundaryRole: "grid_input_active_power",
    quantityFamily: "active_power",
    electricalPortRequired: true,
  }),
  Object.freeze({
    inputKey: "inverterOutputPower",
    parameterId: "P_inverter_out",
    boundaryRole: "inverter_output_active_power",
    quantityFamily: "active_power",
    electricalPortRequired: true,
  }),
  Object.freeze({
    inputKey: "coilTerminalPower",
    parameterId: "P_coil_terminal",
    boundaryRole: "coil_terminal_active_power",
    quantityFamily: "active_power",
    electricalPortRequired: true,
  }),
  Object.freeze({
    inputKey: "workpieceAbsorbedPower",
    parameterId: "P_workpiece_absorbed",
    boundaryRole: "workpiece_absorbed_power",
    quantityFamily: "active_power",
    electricalPortRequired: false,
  }),
  Object.freeze({
    inputKey: "usefulPower",
    parameterId: "P_useful",
    boundaryRole: "useful_process_power",
    quantityFamily: "heat_rate",
    electricalPortRequired: false,
  }),
  Object.freeze({
    inputKey: "copperLoss",
    parameterId: "P_cu",
    boundaryRole: "coil_copper_loss",
    quantityFamily: "heat_rate",
    electricalPortRequired: false,
  }),
  Object.freeze({
    inputKey: "workpieceHeatLoss",
    parameterId: "Q_loss_environment",
    boundaryRole: "workpiece_environment_heat_loss",
    quantityFamily: "heat_rate",
    electricalPortRequired: false,
  }),
] as const satisfies readonly PowerSlotDefinition[]);

interface RatioDefinition {
  readonly ratioId: G04EfficiencyId;
  readonly uncertaintyKey:
    | "etaInverter"
    | "etaCoilToWorkpiece"
    | "etaThermal"
    | "etaOverall";
  readonly numerator: G04PowerParameterId;
  readonly denominator: G04PowerParameterId;
  readonly equation: G04RatioTrace["equation"];
}

const RATIO_DEFINITIONS = Object.freeze([
  Object.freeze({
    ratioId: "eta_inv",
    uncertaintyKey: "etaInverter",
    numerator: "P_inverter_out",
    denominator: "P_grid",
    equation: "eta_inv = P_inverter_out / P_grid",
  }),
  Object.freeze({
    ratioId: "eta_coil_wp",
    uncertaintyKey: "etaCoilToWorkpiece",
    numerator: "P_workpiece_absorbed",
    denominator: "P_coil_terminal",
    equation: "eta_coil_wp = P_workpiece_absorbed / P_coil_terminal",
  }),
  Object.freeze({
    ratioId: "eta_thermal",
    uncertaintyKey: "etaThermal",
    numerator: "P_useful",
    denominator: "P_workpiece_absorbed",
    equation: "eta_thermal = P_useful / P_workpiece_absorbed",
  }),
  Object.freeze({
    ratioId: "eta_overall",
    uncertaintyKey: "etaOverall",
    numerator: "P_useful",
    denominator: "P_grid",
    equation: "eta_overall = P_useful / P_grid",
  }),
] as const satisfies readonly RatioDefinition[]);

function failure(
  status: G04PowerBoundariesAndEfficienciesFailure["status"],
  code: G04FailureCode,
  message: string,
  action: string,
): G04PowerBoundariesAndEfficienciesFailure {
  return Object.freeze({
    methodId: G04_METHOD_ID,
    methodVersion: G04_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= G04_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormal(value: number): boolean {
  return value === 0 || isPositiveNormal(value);
}

interface NumericOperationSuccess {
  readonly ok: true;
  readonly value: number;
}

interface NumericOperationFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type NumericOperationResult =
  | NumericOperationSuccess
  | NumericOperationFailure;

function numericFailure(operation: string): NumericOperationFailure {
  return {
    ok: false,
    failure: failure(
      "invalid_input",
      "G-04.numeric_resolution_invalid",
      `G-04 could not represent ${operation} as a finite normal-or-zero binary64 value without swallowing a nonzero operand.`,
      "Use a numerically resolvable canonical-SI scale; no overflow, positive subnormal, false zero or swallowed term is published.",
    ),
  };
}

function guardedPositiveAdd(
  left: number,
  right: number,
  operation: string,
): NumericOperationResult {
  const value = left + right;
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (value > 0 && !isPositiveNormal(value)) ||
    (right > 0 && value === left) ||
    (left > 0 && value === right)
  ) {
    return numericFailure(operation);
  }
  return { ok: true, value };
}

function guardedSubtract(
  left: number,
  right: number,
  operation: string,
): NumericOperationResult {
  const value = left - right;
  if (
    !Number.isFinite(value) ||
    (value !== 0 && Math.abs(value) < G04_BINARY64_MIN_NORMAL) ||
    (right > 0 && value === left) ||
    (left > 0 && value === -right)
  ) {
    return numericFailure(operation);
  }
  return { ok: true, value };
}

interface ParsedPowerSuccess {
  readonly ok: true;
  readonly power: G04PowerEvidence;
}

interface ParsedPowerFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type ParsedPowerResult = ParsedPowerSuccess | ParsedPowerFailure;

function parsePowerEvidence(
  value: unknown,
  slot: PowerSlotDefinition,
): ParsedPowerResult {
  const unavailable = readExactPlainDataRecord(value, [
    "kind",
    "status",
    "parameterId",
    "reason",
  ]);
  if (unavailable !== null && unavailable.kind === "unavailable") {
    if (
      unavailable.status !== "missing" ||
      unavailable.parameterId !== slot.parameterId ||
      !isStableIdentifier(unavailable.reason)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-04.power_evidence_invalid",
          `The unavailable ${slot.parameterId} record has an invalid status, parameter identity or reason.`,
          "Use status=missing, the fixed slot parameterId and a non-blank reason; never encode missing power as zero.",
        ),
      };
    }
    return {
      ok: true,
      power: Object.freeze({
        kind: "unavailable",
        status: "missing",
        parameterId: slot.parameterId,
        reason: unavailable.reason,
      }),
    };
  }

  const controlled = readExactPlainDataRecord(value, [
    "kind",
    "parameterId",
    "valueW",
    "quantityFamily",
    "boundaryRole",
    "portId",
    "referencePlaneId",
    "controlVolumeId",
    "caseSnapshotId",
    "stateSnapshotId",
    "loadedState",
    "timeBasisId",
    "measurementWindowId",
    "powerChainSnapshotId",
    "provenanceBasisId",
    "sourceKind",
    "sourceRef",
    "sourceSnapshotId",
  ]);
  if (
    controlled === null ||
    controlled.kind !== "available" ||
    controlled.parameterId !== slot.parameterId ||
    controlled.boundaryRole !== slot.boundaryRole ||
    typeof controlled.valueW !== "number" ||
    !isZeroOrPositiveNormal(controlled.valueW) ||
    !(POWER_QUANTITY_FAMILIES as readonly unknown[]).includes(
      controlled.quantityFamily,
    ) ||
    !(POWER_SOURCE_KINDS as readonly unknown[]).includes(
      controlled.sourceKind,
    ) ||
    !isStableIdentifier(controlled.referencePlaneId) ||
    !isStableIdentifier(controlled.controlVolumeId) ||
    !isStableIdentifier(controlled.caseSnapshotId) ||
    !isStableIdentifier(controlled.stateSnapshotId) ||
    !(LOADED_STATES as readonly unknown[]).includes(controlled.loadedState) ||
    !isStableIdentifier(controlled.timeBasisId) ||
    !isStableIdentifier(controlled.measurementWindowId) ||
    !isStableIdentifier(controlled.powerChainSnapshotId) ||
    !isStableIdentifier(controlled.provenanceBasisId) ||
    !isStableIdentifier(controlled.sourceRef) ||
    !isStableIdentifier(controlled.sourceSnapshotId) ||
    (slot.electricalPortRequired
      ? !isStableIdentifier(controlled.portId)
      : controlled.portId !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-04.power_evidence_invalid",
        value === null || value === undefined
          ? `G-04 received no explicit ${slot.parameterId} availability discriminator.`
          : `The ${slot.parameterId} evidence is not an exact canonical-SI record for its frozen named boundary.`,
        `Provide an exact available or unavailable ${slot.parameterId} record with its fixed parameter/boundary identity; null is not a missing-value record and is never converted to zero.`,
      ),
    };
  }

  return {
    ok: true,
    power: Object.freeze({
      kind: "available",
      parameterId: slot.parameterId,
      valueW: controlled.valueW,
      quantityFamily: controlled.quantityFamily as G04PowerQuantityFamily,
      boundaryRole: slot.boundaryRole,
      portId: controlled.portId as string | null,
      referencePlaneId: controlled.referencePlaneId,
      controlVolumeId: controlled.controlVolumeId,
      caseSnapshotId: controlled.caseSnapshotId,
      stateSnapshotId: controlled.stateSnapshotId,
      loadedState: controlled.loadedState as LoadedState,
      timeBasisId: controlled.timeBasisId,
      measurementWindowId: controlled.measurementWindowId,
      powerChainSnapshotId: controlled.powerChainSnapshotId,
      provenanceBasisId: controlled.provenanceBasisId,
      sourceKind: controlled.sourceKind as G04PowerSourceKind,
      sourceRef: controlled.sourceRef,
      sourceSnapshotId: controlled.sourceSnapshotId,
    }),
  };
}

interface ParsedUncertaintySuccess {
  readonly ok: true;
  readonly uncertainty: G04EfficiencyConsistencyUncertainty;
}

interface ParsedUncertaintyFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type ParsedUncertaintyResult =
  | ParsedUncertaintySuccess
  | ParsedUncertaintyFailure;

function parseRatioUncertainty(
  value: unknown,
  ratioId: G04EfficiencyId,
): ParsedUncertaintyResult {
  const unavailable = readExactPlainDataRecord(value, [
    "kind",
    "ratioId",
    "reason",
  ]);
  if (unavailable !== null && unavailable.kind === "not_available") {
    if (
      unavailable.ratioId !== ratioId ||
      !isStableIdentifier(unavailable.reason)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-04.ratio_uncertainty_invalid",
          `The unavailable uncertainty record for ${ratioId} has a wrong ratio identity or blank reason.`,
          "Bind every uncertainty discriminator to its exact ratio and provide a non-blank provenance reason.",
        ),
      };
    }
    return {
      ok: true,
      uncertainty: Object.freeze({
        kind: "not_available",
        ratioId,
        reason: unavailable.reason,
      }),
    };
  }

  const controlled = readExactPlainDataRecord(value, [
    "kind",
    "ratioId",
    "expandedDifferenceUncertaintyW",
    "coverageFactor",
    "uncertaintySourceRef",
  ]);
  if (
    controlled === null ||
    controlled.kind !==
      "precomputed_expanded_uncertainty_of_numerator_minus_denominator" ||
    controlled.ratioId !== ratioId ||
    typeof controlled.expandedDifferenceUncertaintyW !== "number" ||
    !isZeroOrPositiveNormal(controlled.expandedDifferenceUncertaintyW) ||
    typeof controlled.coverageFactor !== "number" ||
    !isPositiveNormal(controlled.coverageFactor) ||
    !isStableIdentifier(controlled.uncertaintySourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-04.ratio_uncertainty_invalid",
        value === null || value === undefined
          ? `G-04 received no explicit uncertainty-state discriminator for ${ratioId}.`
          : `The ${ratioId} uncertainty is not an exact precomputed expanded N-D uncertainty or an explicit not_available record.`,
        "Provide a finite canonical-SI precomputed expanded numerator-minus-denominator uncertainty with coverage/source, or explicitly mark it unavailable; G-04 does not invent propagation.",
      ),
    };
  }

  return {
    ok: true,
    uncertainty: Object.freeze({
      kind:
        "precomputed_expanded_uncertainty_of_numerator_minus_denominator",
      ratioId,
      expandedDifferenceUncertaintyW:
        controlled.expandedDifferenceUncertaintyW,
      coverageFactor: controlled.coverageFactor,
      uncertaintySourceRef: controlled.uncertaintySourceRef,
    }),
  };
}

interface ParsedRatioUncertaintiesSuccess {
  readonly ok: true;
  readonly uncertainties: G04RatioUncertainties;
}

interface ParsedRatioUncertaintiesFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type ParsedRatioUncertaintiesResult =
  | ParsedRatioUncertaintiesSuccess
  | ParsedRatioUncertaintiesFailure;

function parseRatioUncertainties(
  value: unknown,
): ParsedRatioUncertaintiesResult {
  const controlled = readExactPlainDataRecord(value, [
    "etaInverter",
    "etaCoilToWorkpiece",
    "etaThermal",
    "etaOverall",
  ]);
  if (controlled === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-04.ratio_uncertainty_schema_invalid",
        "G-04 requires one exact uncertainty-state record for each frozen efficiency ratio.",
        "Provide etaInverter, etaCoilToWorkpiece, etaThermal and etaOverall uncertainty discriminators without missing or extra fields.",
      ),
    };
  }

  const inverter = parseRatioUncertainty(controlled.etaInverter, "eta_inv");
  if (!inverter.ok) return inverter;
  const coil = parseRatioUncertainty(
    controlled.etaCoilToWorkpiece,
    "eta_coil_wp",
  );
  if (!coil.ok) return coil;
  const thermal = parseRatioUncertainty(
    controlled.etaThermal,
    "eta_thermal",
  );
  if (!thermal.ok) return thermal;
  const overall = parseRatioUncertainty(
    controlled.etaOverall,
    "eta_overall",
  );
  if (!overall.ok) return overall;

  return {
    ok: true,
    uncertainties: Object.freeze({
      etaInverter: inverter.uncertainty,
      etaCoilToWorkpiece: coil.uncertainty,
      etaThermal: thermal.uncertainty,
      etaOverall: overall.uncertainty,
    }),
  };
}

interface ParsedAccountingAssessmentSuccess {
  readonly ok: true;
  readonly assessment: G04AccountingAssessment;
}

interface ParsedAccountingAssessmentFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type ParsedAccountingAssessmentResult =
  | ParsedAccountingAssessmentSuccess
  | ParsedAccountingAssessmentFailure;

function parseAccountingAssessment(
  value: unknown,
): ParsedAccountingAssessmentResult {
  const controlled = readExactPlainDataRecord(value, [
    "overallAndStagedEfficiencyTreatment",
    "reactivePowerTreatment",
    "assessmentSourceRef",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-04.accounting_assessment_missing"
          : "G-04.accounting_assessment_invalid",
        missing
          ? "G-04 received no efficiency-accounting and reactive-power treatment assessment."
          : "G-04 accounting assessment must be one exact controlled plain-data record.",
        "Declare whether overall/staged efficiencies remain independent ratios and whether reactive power is excluded from loss accounting.",
      ),
    };
  }
  if (
    !(OVERALL_AND_STAGED_TREATMENTS as readonly unknown[]).includes(
      controlled.overallAndStagedEfficiencyTreatment,
    ) ||
    !(REACTIVE_POWER_TREATMENTS as readonly unknown[]).includes(
      controlled.reactivePowerTreatment,
    ) ||
    !isStableIdentifier(controlled.assessmentSourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-04.accounting_assessment_invalid",
        "G-04 accounting assessment contains an uncontrolled discriminator or blank source reference.",
        "Use the exact frozen treatment discriminators and a traceable non-blank assessment source.",
      ),
    };
  }
  return {
    ok: true,
    assessment: Object.freeze({
      overallAndStagedEfficiencyTreatment:
        controlled.overallAndStagedEfficiencyTreatment as G04AccountingAssessment["overallAndStagedEfficiencyTreatment"],
      reactivePowerTreatment:
        controlled.reactivePowerTreatment as G04AccountingAssessment["reactivePowerTreatment"],
      assessmentSourceRef: controlled.assessmentSourceRef,
    }),
  };
}

function samePowerChainBinding(
  left: G04AvailablePowerEvidence,
  right: G04AvailablePowerEvidence,
): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.stateSnapshotId === right.stateSnapshotId &&
    left.loadedState === right.loadedState &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.powerChainSnapshotId === right.powerChainSnapshotId &&
    left.provenanceBasisId === right.provenanceBasisId
  );
}

function availableEfficiency(
  ratioId: G04EfficiencyId,
  valueSi: number,
  numeratorParameterId: G04PowerParameterId,
  denominatorParameterId: G04PowerParameterId,
): G04AvailableEfficiencyOutput {
  return Object.freeze({
    kind: "available",
    outputId: ratioId,
    status: "available",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    numeratorParameterId,
    denominatorParameterId,
  });
}

function unavailableEfficiency(
  ratioId: G04EfficiencyId,
  status: G04UnavailableEfficiencyOutput["status"],
  reason: string,
): G04UnavailableEfficiencyOutput {
  return Object.freeze({ kind: "unavailable", outputId: ratioId, status, reason });
}

function denominatorZeroWarning(ratioId: G04EfficiencyId): G04Warning {
  return Object.freeze({
    code: "G-04.denominator_zero",
    severity: "warning",
    ratioId,
    guardedPredicateRef: ZERO_DENOMINATOR_PREDICATE,
    predicateOutcome: "not_evaluated_zero_denominator",
    message: `${ratioId} is undefined because its declared denominator is zero; no NaN, infinity or zero placeholder is published.`,
  });
}

function withinUncertaintyWarning(ratioId: G04EfficiencyId): G04Warning {
  return Object.freeze({
    code: "G-04.nominal_efficiency_exceeds_one_within_uncertainty",
    severity: "warning",
    ratioId,
    guardedPredicateRef: EFFICIENCY_EXCEEDS_ONE_PREDICATE,
    predicateOutcome: "not_triggered_within_uncertainty",
    message: `${ratioId} has a nominal numerator above its denominator but remains within the supplied expanded N-D uncertainty; the efficiency is unavailable and is not clamped to one.`,
  });
}

interface RatioEvaluationSuccess {
  readonly ok: true;
  readonly output: G04EfficiencyOutput;
  readonly trace: G04RatioTrace;
  readonly warning: G04Warning | null;
}

interface RatioEvaluationFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type RatioEvaluationResult = RatioEvaluationSuccess | RatioEvaluationFailure;

function evaluateRatio(
  definition: RatioDefinition,
  numerator: G04PowerEvidence,
  denominator: G04PowerEvidence,
  uncertainty: G04EfficiencyConsistencyUncertainty,
): RatioEvaluationResult {
  if (numerator.kind === "unavailable" || denominator.kind === "unavailable") {
    return {
      ok: true,
      output: unavailableEfficiency(
        definition.ratioId,
        "insufficient_data",
        `Missing ${
          numerator.kind === "unavailable"
            ? definition.numerator
            : definition.denominator
        } boundary evidence.`,
      ),
      trace: Object.freeze({
        ratioId: definition.ratioId,
        equation: definition.equation,
        numeratorParameterId: definition.numerator,
        denominatorParameterId: definition.denominator,
        numeratorW:
          numerator.kind === "available" ? numerator.valueW : null,
        denominatorW:
          denominator.kind === "available" ? denominator.valueW : null,
        nominalNumeratorMinusDenominatorW: null,
        expandedDifferenceUncertaintyW: null,
        boundaryConsistency: "not_evaluated_missing_quantity",
        publicationStatus: "unavailable_missing_quantity",
        inputAdjusted: false,
      }),
      warning: null,
    };
  }

  if (!samePowerChainBinding(numerator, denominator)) {
    return {
      ok: true,
      output: unavailableEfficiency(
        definition.ratioId,
        "insufficient_data",
        "Numerator and denominator do not share one case/state/time-window/power-chain/provenance basis.",
      ),
      trace: Object.freeze({
        ratioId: definition.ratioId,
        equation: definition.equation,
        numeratorParameterId: definition.numerator,
        denominatorParameterId: definition.denominator,
        numeratorW: numerator.valueW,
        denominatorW: denominator.valueW,
        nominalNumeratorMinusDenominatorW: null,
        expandedDifferenceUncertaintyW: null,
        boundaryConsistency: "mismatch",
        publicationStatus: "unavailable_boundary_mismatch",
        inputAdjusted: false,
      }),
      warning: null,
    };
  }

  if (denominator.valueW === 0) {
    return {
      ok: true,
      output: unavailableEfficiency(
        definition.ratioId,
        "not_applicable",
        "The declared efficiency denominator is zero.",
      ),
      trace: Object.freeze({
        ratioId: definition.ratioId,
        equation: definition.equation,
        numeratorParameterId: definition.numerator,
        denominatorParameterId: definition.denominator,
        numeratorW: numerator.valueW,
        denominatorW: denominator.valueW,
        nominalNumeratorMinusDenominatorW: null,
        expandedDifferenceUncertaintyW:
          uncertainty.kind ===
          "precomputed_expanded_uncertainty_of_numerator_minus_denominator"
            ? uncertainty.expandedDifferenceUncertaintyW
            : null,
        boundaryConsistency: "confirmed",
        publicationStatus: "unavailable_zero_denominator",
        inputAdjusted: false,
      }),
      warning: denominatorZeroWarning(definition.ratioId),
    };
  }

  const difference = guardedSubtract(
    numerator.valueW,
    denominator.valueW,
    `${definition.ratioId} numerator-minus-denominator residual`,
  );
  if (!difference.ok) return difference;

  if (difference.value > 0) {
    if (uncertainty.kind === "not_available") {
      return {
        ok: false,
        failure: failure(
          "insufficient_data",
          "G-04.uncertainty_required_for_nominal_exceedance",
          `${definition.ratioId} has a nominal numerator above its denominator, but no precomputed expanded N-D uncertainty is available.`,
          "Provide traceable precomputed expanded uncertainty for this numerator-minus-denominator residual; G-04 will not invent propagation or clamp efficiency.",
        ),
      };
    }
    if (difference.value > uncertainty.expandedDifferenceUncertaintyW) {
      return {
        ok: false,
        failure: failure(
          "inconsistent_measurement",
          "G-04.efficiency_exceeds_one_beyond_uncertainty",
          `${definition.ratioId} exceeds one beyond its supplied expanded numerator-minus-denominator uncertainty.`,
          "Correct the named boundaries, time/state binding, measurement/model inputs or upstream uncertainty analysis; no efficiency payload is retained.",
        ),
      };
    }
    return {
      ok: true,
      output: unavailableEfficiency(
        definition.ratioId,
        "insufficient_data",
        "Nominal efficiency exceeds one but remains compatible with supplied expanded uncertainty; it is not clamped or published.",
      ),
      trace: Object.freeze({
        ratioId: definition.ratioId,
        equation: definition.equation,
        numeratorParameterId: definition.numerator,
        denominatorParameterId: definition.denominator,
        numeratorW: numerator.valueW,
        denominatorW: denominator.valueW,
        nominalNumeratorMinusDenominatorW: difference.value,
        expandedDifferenceUncertaintyW:
          uncertainty.expandedDifferenceUncertaintyW,
        boundaryConsistency: "confirmed",
        publicationStatus:
          "unavailable_nominal_exceedance_within_uncertainty",
        inputAdjusted: false,
      }),
      warning: withinUncertaintyWarning(definition.ratioId),
    };
  }

  const efficiency = numerator.valueW / denominator.valueW;
  if (
    !Number.isFinite(efficiency) ||
    efficiency < 0 ||
    efficiency > 1 ||
    (numerator.valueW > 0 && !isPositiveNormal(efficiency))
  ) {
    return numericFailure(`${definition.ratioId} division`);
  }

  return {
    ok: true,
    output: availableEfficiency(
      definition.ratioId,
      efficiency,
      definition.numerator,
      definition.denominator,
    ),
    trace: Object.freeze({
      ratioId: definition.ratioId,
      equation: definition.equation,
      numeratorParameterId: definition.numerator,
      denominatorParameterId: definition.denominator,
      numeratorW: numerator.valueW,
      denominatorW: denominator.valueW,
      nominalNumeratorMinusDenominatorW: difference.value,
      expandedDifferenceUncertaintyW:
        uncertainty.kind ===
        "precomputed_expanded_uncertainty_of_numerator_minus_denominator"
          ? uncertainty.expandedDifferenceUncertaintyW
          : null,
      boundaryConsistency: "confirmed",
      publicationStatus: "published",
      inputAdjusted: false,
    }),
    warning: null,
  };
}

function unavailableAccountingCheck(
  checkId: G04UnavailableAccountingCheck["checkId"],
  reason: G04UnavailableAccountingCheck["reason"],
): G04UnavailableAccountingCheck {
  return Object.freeze({ kind: "unavailable", checkId, reason });
}

function classifyResidual(
  residualW: number,
): G04AvailableAccountingCheck["classification"] {
  if (residualW === 0) return "exact_binary64_balance";
  return residualW > 0
    ? "positive_unaccounted_residual"
    : "nominal_accounted_sum_exceeds_boundary";
}

interface AccountingCheckSuccess {
  readonly ok: true;
  readonly check: G04AccountingCheck;
}

interface AccountingCheckFailure {
  readonly ok: false;
  readonly failure: G04PowerBoundariesAndEfficienciesFailure;
}

type AccountingCheckResult = AccountingCheckSuccess | AccountingCheckFailure;

function evaluateAccountingCheck(
  checkId: G04AvailableAccountingCheck["checkId"],
  boundary: G04PowerEvidence,
  firstTerm: G04PowerEvidence,
  secondTerm: G04PowerEvidence,
): AccountingCheckResult {
  if (
    boundary.kind === "unavailable" ||
    firstTerm.kind === "unavailable" ||
    secondTerm.kind === "unavailable"
  ) {
    return {
      ok: true,
      check: unavailableAccountingCheck(checkId, "missing quantity"),
    };
  }
  if (
    !samePowerChainBinding(boundary, firstTerm) ||
    !samePowerChainBinding(boundary, secondTerm)
  ) {
    return {
      ok: true,
      check: unavailableAccountingCheck(checkId, "boundary chain mismatch"),
    };
  }
  const sum = guardedPositiveAdd(
    firstTerm.valueW,
    secondTerm.valueW,
    `${checkId} positive accounting sum`,
  );
  if (!sum.ok) return sum;
  const residual = guardedSubtract(
    boundary.valueW,
    sum.value,
    `${checkId} boundary-minus-accounted residual`,
  );
  if (!residual.ok) return residual;

  return {
    ok: true,
    check: Object.freeze({
      kind: "available",
      checkId,
      equation:
        checkId === "workpiece_useful_plus_environment_loss"
          ? "P_workpiece_absorbed - (P_useful + Q_loss_environment)"
          : "P_coil_terminal - (P_workpiece_absorbed + P_cu)",
      boundaryInputW: boundary.valueW,
      accountedSumW: sum.value,
      residualW: residual.value,
      classification: classifyResidual(residual.value),
      inputAdjusted: false,
    }),
  };
}

/** Isolated canonical-SI implementation of frozen method G-04. */
export function evaluateG04PowerBoundariesAndEfficiencies(
  input: G04PowerBoundariesAndEfficienciesInput,
): G04PowerBoundariesAndEfficienciesOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "gridPower",
    "inverterOutputPower",
    "coilTerminalPower",
    "workpieceAbsorbedPower",
    "usefulPower",
    "copperLoss",
    "workpieceHeatLoss",
    "ratioUncertainties",
    "accountingAssessment",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-04.input_schema_invalid",
      "G-04 input must be one exact controlled plain-data record.",
      "Provide all seven named power availability records, four ratio uncertainty states and the accounting assessment without accessors, symbols, extra fields or coercion.",
    );
  }

  const mutablePowerById = new Map<G04PowerParameterId, G04PowerEvidence>();
  for (const slot of POWER_SLOT_DEFINITIONS) {
    const parsed = parsePowerEvidence(controlledInput[slot.inputKey], slot);
    if (!parsed.ok) return parsed.failure;
    mutablePowerById.set(slot.parameterId, parsed.power);
  }

  const uncertaintyResult = parseRatioUncertainties(
    controlledInput.ratioUncertainties,
  );
  if (!uncertaintyResult.ok) return uncertaintyResult.failure;
  const assessmentResult = parseAccountingAssessment(
    controlledInput.accountingAssessment,
  );
  if (!assessmentResult.ok) return assessmentResult.failure;

  const power = (id: G04PowerParameterId): G04PowerEvidence => {
    const found = mutablePowerById.get(id);
    if (found === undefined) {
      throw new TypeError(`Internal G-04 power-slot mapping is incomplete: ${id}`);
    }
    return found;
  };
  const uncertainties = uncertaintyResult.uncertainties;
  const assessment = assessmentResult.assessment;

  /* All exact schemas and controlled enums are validated above. A known
   * forbidden accounting/domain state precedes unknown/unconfirmed evidence. */
  if (
    assessment.overallAndStagedEfficiencyTreatment ===
    "overall_and_staged_multiplication_requested"
  ) {
    return failure(
      "not_applicable",
      "G-04.double_counting_not_applicable",
      "The requested accounting would multiply an overall boundary efficiency with staged efficiencies and count the same conversion chain twice.",
      "Keep eta_overall as the direct P_useful/P_grid ratio; report staged ratios independently and never multiply the overall ratio into the same chain.",
    );
  }
  if (
    assessment.reactivePowerTreatment === "included_or_requested_as_loss"
  ) {
    return failure(
      "not_applicable",
      "G-04.reactive_power_not_applicable",
      "Reactive power has been included or requested as a heat/active-power loss, outside the frozen power-boundary contract.",
      "Keep reactive power on its electrical-port var quantity; supply only named active powers and heat rates to G-04.",
    );
  }

  const availablePowers = [...mutablePowerById.values()].filter(
    (candidate): candidate is G04AvailablePowerEvidence =>
      candidate.kind === "available",
  );
  if (
    availablePowers.some(
      (candidate) => candidate.quantityFamily === "reactive_power",
    )
  ) {
    return failure(
      "not_applicable",
      "G-04.reactive_power_not_applicable",
      "At least one named G-04 power slot contains reactive power rather than its frozen active-power or heat-rate quantity.",
      "Remove var/reactive power from G-04 loss accounting and restore the named canonical-W quantity at that boundary.",
    );
  }
  const incompatibleFamily = POWER_SLOT_DEFINITIONS.find((slot) => {
    const candidate = power(slot.parameterId);
    return (
      candidate.kind === "available" &&
      candidate.quantityFamily !== slot.quantityFamily
    );
  });
  if (incompatibleFamily !== undefined) {
    return failure(
      "not_applicable",
      "G-04.quantity_family_not_applicable",
      `${incompatibleFamily.parameterId} is explicitly classified as a different quantity family from its frozen named boundary.`,
      "Use active_power for the four electrical/absorbed powers and heat_rate for useful process power and named losses; do not relabel quantities between boundaries.",
    );
  }

  if (
    assessment.overallAndStagedEfficiencyTreatment ===
      "unknown_or_unconfirmed" ||
    assessment.reactivePowerTreatment === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "G-04.accounting_assessment_unconfirmed",
      "Overall/staged double-counting or reactive-power treatment remains unknown or unconfirmed.",
      "Confirm independent boundary ratios and exclusion of reactive power before calculating G-04 efficiencies.",
    );
  }

  const mutableOutputs = new Map<G04EfficiencyId, G04EfficiencyOutput>();
  const mutableTraces: G04RatioTrace[] = [];
  const mutableWarnings: G04Warning[] = [];

  for (const definition of RATIO_DEFINITIONS) {
    const evaluated = evaluateRatio(
      definition,
      power(definition.numerator),
      power(definition.denominator),
      uncertainties[definition.uncertaintyKey],
    );
    if (!evaluated.ok) return evaluated.failure;
    mutableOutputs.set(definition.ratioId, evaluated.output);
    mutableTraces.push(evaluated.trace);
    if (evaluated.warning !== null) mutableWarnings.push(evaluated.warning);
  }

  const workpieceCheck = evaluateAccountingCheck(
    "workpiece_useful_plus_environment_loss",
    power("P_workpiece_absorbed"),
    power("P_useful"),
    power("Q_loss_environment"),
  );
  if (!workpieceCheck.ok) return workpieceCheck.failure;
  const coilCheck = evaluateAccountingCheck(
    "coil_absorbed_plus_copper_minimum",
    power("P_coil_terminal"),
    power("P_workpiece_absorbed"),
    power("P_cu"),
  );
  if (!coilCheck.ok) return coilCheck.failure;

  const output = (id: G04EfficiencyId): G04EfficiencyOutput => {
    const found = mutableOutputs.get(id);
    if (found === undefined) {
      throw new TypeError(`Internal G-04 ratio mapping is incomplete: ${id}`);
    }
    return found;
  };
  const missingBoundaryParameterIds = Object.freeze(
    POWER_SLOT_DEFINITIONS.flatMap((slot) =>
      power(slot.parameterId).kind === "unavailable" ? [slot.parameterId] : [],
    ),
  );
  const warnings = Object.freeze(mutableWarnings);

  return Object.freeze({
    methodId: G04_METHOD_ID,
    methodVersion: G04_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value: Object.freeze({
      eta_inv: output("eta_inv"),
      eta_coil_wp: output("eta_coil_wp"),
      eta_thermal: output("eta_thermal"),
      eta_overall: output("eta_overall"),
    }),
    missingBoundaryParameterIds,
    powerSnapshot: Object.freeze({
      P_grid: power("P_grid"),
      P_inverter_out: power("P_inverter_out"),
      P_coil_terminal: power("P_coil_terminal"),
      P_workpiece_absorbed: power("P_workpiece_absorbed"),
      P_useful: power("P_useful"),
      P_cu: power("P_cu"),
      Q_loss_environment: power("Q_loss_environment"),
    }),
    uncertaintySnapshot: uncertainties,
    accountingAssessment: assessment,
    calculationTrace: Object.freeze(mutableTraces),
    accountingChecks: Object.freeze({
      workpieceBalance: workpieceCheck.check,
      coilMinimumBalance: coilCheck.check,
    }),
    sourceRefs: G04_SOURCE_REFS,
    contractSourceRefs: G04_CONTRACT_SOURCE_REFS,
    derivationRefs: G04_DERIVATION_REFS,
    validationCaseIds: G04_VALIDATION_CASE_IDS,
    methodCheckIds: G04_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G04_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "each named power remains on its declared port or control-volume reference plane",
      "each published ratio uses one case, state, loaded state, time basis, measurement window, power-chain snapshot and provenance basis",
      "overall efficiency is the direct P_useful/P_grid boundary ratio and is never reconstructed by multiplying staged ratios",
      "reactive power is excluded from active-power and heat-loss accounting",
      "only an explicitly precomputed expanded uncertainty of numerator-minus-denominator may classify nominal efficiency above one",
      "conservation diagnostics never adjust, calibrate or silently complete an input power balance",
    ] as const),
  });
}
