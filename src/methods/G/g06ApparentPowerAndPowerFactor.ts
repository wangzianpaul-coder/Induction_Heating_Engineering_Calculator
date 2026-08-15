import {
  LOADED_STATES,
  QUANTITY_BASES,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-06"));

export const G06_METHOD_ID = "G-06" as const;
export const G06_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G06_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G06_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G06_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G06_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G06_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G06_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G06_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputOrResultPolicy: "fail_closed" as const,
  overflowFalseZeroAndSwallowedTermPolicy: "fail_closed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G06_BINARY64_MIN_NORMAL,
});

export const G06_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "isolated_implementation_not_runtime_activated" as const,
  runtimeActivated: false as const,
  publicApiExported: false as const,
  formalNormativeSourcePageStatus:
    "PRIMARY_STANDARD_COPY_REQUIRED_source_location_gap_preserved" as const,
});

const P_EXCEEDS_S_PREDICATE = "P>S beyond uncertainty" as const;
const COS_PHI_TRUE_PF_PREDICATE = "cos(phi) is used as true PF" as const;
const MIXED_PORT_PREDICATE =
  "coil-terminal and grid-side quantities are mixed" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-06 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G06_WARNING_PREDICATES = Object.freeze({
  activePowerExceedsApparentPowerBeyondUncertainty:
    controlledWarningPredicate(P_EXCEEDS_S_PREDICATE),
  cosinePhiUsedAsTruePowerFactor: controlledWarningPredicate(
    COS_PHI_TRUE_PF_PREDICATE,
  ),
  coilAndGridPortsMixed: controlledWarningPredicate(MIXED_PORT_PREDICATE),
});

export const G06_APPARENT_POWER_AND_POWER_FACTOR_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: G06_SOURCE_REFS,
  contractSourceRefs: G06_CONTRACT_SOURCE_REFS,
  derivationRefs: G06_DERIVATION_REFS,
  validationCaseIds: G06_VALIDATION_CASE_IDS,
  methodCheckIds: G06_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G06_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: G06_IMPLEMENTATION_READINESS,
});

export type G06PortRole =
  | "grid_side"
  | "coil_terminal"
  | "transformer_primary"
  | "transformer_secondary"
  | "inverter_output"
  | "other_explicit_single_phase_or_equivalent";

export type G06WaveformBasis =
  | "sinusoidal_steady_state"
  | "possibly_nonsinusoidal_total_waveform"
  | "fundamental_only"
  | "unknown_or_unconfirmed";

export interface G06ElectricalBindingEvidence {
  readonly caseSnapshotId: string;
  readonly electricalStateSnapshotId: string;
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  readonly frequencyHz: number;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly portRole: G06PortRole;
  readonly currentDirection: "into_passive_port";
  readonly waveformBasis: G06WaveformBasis;
}

export type G06VoltageInterpretation =
  | "single_phase_or_equivalent_port_rms"
  | "line_to_line_rms"
  | "phase_to_neutral_rms"
  | "other_explicit_voltage_interpretation"
  | "unknown_or_unconfirmed";

export type G06CurrentInterpretation =
  | "single_phase_or_equivalent_port_rms"
  | "line_current_rms"
  | "phase_current_rms"
  | "other_explicit_current_interpretation"
  | "unknown_or_unconfirmed";

export interface G06VoltageEvidence {
  /** Canonical-SI volts. */
  readonly voltageV: number;
  readonly quantityBasis: QuantityBasis;
  readonly interpretation: G06VoltageInterpretation;
  readonly binding: G06ElectricalBindingEvidence;
}

export interface G06CurrentEvidence {
  /** Canonical-SI amperes. */
  readonly currentA: number;
  readonly quantityBasis: QuantityBasis;
  readonly interpretation: G06CurrentInterpretation;
  readonly binding: G06ElectricalBindingEvidence;
}

export type G06ActivePowerBasis =
  | "total_active_power_same_waveform_and_window"
  | "fundamental_active_power_only"
  | "cos_phi_derived"
  | "unknown_or_unconfirmed";

export interface G06ActivePowerEvidence {
  /** Canonical-SI watts, positive into the passive receiving port. */
  readonly activePowerW: number;
  readonly activePowerBasis: G06ActivePowerBasis;
  readonly binding: G06ElectricalBindingEvidence;
}

export type G06PhaseTopology =
  | "single_phase_or_equivalent_port"
  | "balanced_three_phase_grid"
  | "unbalanced_three_phase"
  | "unknown_or_unconfirmed";

export interface G06PhaseSystemEvidence {
  readonly phaseTopology: G06PhaseTopology;
  readonly phaseCount: 1 | 3;
  readonly phaseTopologyEvidenceId: string;
  readonly balancedLineVoltageAndCurrentConfirmed: boolean | null;
  readonly gridSidePortConfirmed: boolean | null;
}

export interface G06PrecomputedConsistencyUncertainty {
  readonly kind: "precomputed_expanded_uncertainty_of_P_minus_S";
  /**
   * Canonical-SI expanded uncertainty of the already propagated P-S
   * consistency residual. G-06 deliberately does not invent a propagation
   * model from separate instrument specifications.
   */
  readonly expandedDifferenceUncertaintyW: number;
  readonly coverageFactor: number;
  readonly uncertaintySourceRef: string;
}

export interface G06UnavailableConsistencyUncertainty {
  readonly kind: "not_available";
  readonly reason: string;
}

export type G06ConsistencyUncertainty =
  | G06PrecomputedConsistencyUncertainty
  | G06UnavailableConsistencyUncertainty;

export interface G06ApparentPowerAndPowerFactorInput {
  readonly voltage: G06VoltageEvidence;
  readonly current: G06CurrentEvidence;
  readonly activePower: G06ActivePowerEvidence;
  readonly phaseSystem: G06PhaseSystemEvidence;
  readonly consistencyUncertainty: G06ConsistencyUncertainty;
}

export interface G06AvailableApparentPowerOutput {
  readonly kind: "available";
  readonly outputId: "S";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "power";
  /** Canonical unit of the shared SI power dimension. */
  readonly canonicalUnitId: "W";
  /** Frozen engineering display semantic for apparent power. */
  readonly engineeringUnitId: "VA";
  readonly interpretation:
    | "single_phase_or_equivalent_apparent_power"
    | "balanced_three_phase_grid_apparent_power";
}

export interface G06AvailablePowerFactorOutput {
  readonly kind: "available";
  readonly outputId: "PF";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation:
    "true_power_factor_from_same_port_total_active_power_and_total_rms";
}

export interface G06UnavailablePowerFactorOutput {
  readonly kind: "unavailable";
  readonly outputId: "PF";
  readonly status: "not_applicable" | "insufficient_data";
  readonly reason:
    | "P/S is undefined at zero apparent power"
    | "nominal P exceeds S but remains compatible with the supplied expanded uncertainty; PF is not clamped or published";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface G06Warning {
  readonly code:
    | "G-06.power_factor_unavailable_zero_apparent_power"
    | "G-06.nominal_active_power_exceeds_apparent_power_within_uncertainty";
  readonly severity: "warning";
  readonly condition: "S=0" | "0 < P-S <= U_expanded(P-S)";
  readonly guardedPredicateRef: typeof P_EXCEEDS_S_PREDICATE | null;
  readonly predicateOutcome:
    | "not_evaluated_zero_denominator"
    | "not_triggered_within_uncertainty";
  readonly message: string;
}

export interface G06ApparentPowerAndPowerFactorSuccess {
  readonly methodId: typeof G06_METHOD_ID;
  readonly methodVersion: typeof G06_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** The frozen contract has predicates but no stable warning_id entries. */
  readonly warningIds: readonly [];
  readonly warnings: readonly G06Warning[];
  readonly value: Readonly<{
    readonly S: G06AvailableApparentPowerOutput;
    readonly PF:
      | G06AvailablePowerFactorOutput
      | G06UnavailablePowerFactorOutput;
  }>;
  readonly equation:
    | "S = V_rms * I_rms; PF = P / S when S > 0"
    | "S = sqrt(3) * U_LL,rms * I_L,rms; PF = P / S when S > 0";
  readonly substitution: Readonly<{
    readonly voltageV: number;
    readonly currentA: number;
    readonly activePowerW: number;
    readonly phaseMultiplier: 1 | number;
    readonly apparentPowerVA: number;
  }>;
  readonly electricalSnapshot: Readonly<{
    readonly binding: Readonly<G06ElectricalBindingEvidence>;
    readonly phaseSystem: Readonly<G06PhaseSystemEvidence>;
    readonly voltageQuantityBasis: "rms" | "full_wave_rms";
    readonly currentQuantityBasis: "rms" | "full_wave_rms";
    readonly voltageInterpretation:
      | "single_phase_or_equivalent_port_rms"
      | "line_to_line_rms";
    readonly currentInterpretation:
      | "single_phase_or_equivalent_port_rms"
      | "line_current_rms";
    readonly activePowerBasis:
      "total_active_power_same_waveform_and_window";
  }>;
  readonly consistency: Readonly<{
    readonly nominalActivePowerMinusApparentPowerW: number;
    readonly expandedDifferenceUncertaintyW: number | null;
    readonly classification:
      | "nominal_consistent"
      | "nominal_exceeds_within_expanded_uncertainty";
    readonly inputAdjusted: false;
    readonly powerFactorPublished: boolean;
  }>;
  /** Exact upstream uncertainty discriminator/provenance used by consistency. */
  readonly uncertaintySnapshot: Readonly<G06ConsistencyUncertainty>;
  readonly sourceRefs: typeof G06_SOURCE_REFS;
  readonly contractSourceRefs: typeof G06_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G06_DERIVATION_REFS;
  readonly validationCaseIds: typeof G06_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G06_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy:
    typeof G06_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "voltage, current and active power belong to one exact port, reference plane, loaded state, frequency, time basis and measurement window",
    "positive active power follows the frozen passive receiving-port convention",
    "single-phase/equivalent values are total RMS port values, or three-phase values are balanced grid-side line quantities",
    "PF is calculated only as P/S from total active power and matching total RMS quantities; cos(phi) is never substituted",
    "the method does not predict converter efficiency or distortion power factor from topology",
  ];
  readonly failure?: never;
}

export type G06FailureCode =
  | "G-06.input_schema_invalid"
  | "G-06.voltage_evidence_missing"
  | "G-06.voltage_evidence_invalid"
  | "G-06.current_evidence_missing"
  | "G-06.current_evidence_invalid"
  | "G-06.active_power_evidence_missing"
  | "G-06.active_power_evidence_invalid"
  | "G-06.binding_evidence_missing"
  | "G-06.binding_evidence_invalid"
  | "G-06.phase_system_evidence_missing"
  | "G-06.phase_system_evidence_invalid"
  | "G-06.uncertainty_evidence_missing"
  | "G-06.uncertainty_evidence_invalid"
  | "G-06.uncertainty_required_for_nominal_exceedance"
  | "G-06.port_state_time_boundary_mismatch"
  | "G-06.quantity_basis_not_applicable"
  | "G-06.waveform_basis_not_applicable"
  | "G-06.waveform_basis_unconfirmed"
  | "G-06.active_power_basis_not_applicable"
  | "G-06.active_power_basis_unconfirmed"
  | "G-06.phase_system_not_applicable"
  | "G-06.phase_system_unconfirmed"
  | "G-06.three_phase_balance_unconfirmed"
  | "G-06.three_phase_not_grid_side"
  | "G-06.voltage_current_interpretation_not_applicable"
  | "G-06.voltage_current_interpretation_unconfirmed"
  | "G-06.active_power_exceeds_apparent_power"
  | "G-06.numeric_resolution_invalid";

export interface G06ApparentPowerAndPowerFactorFailure {
  readonly methodId: typeof G06_METHOD_ID;
  readonly methodVersion: typeof G06_METHOD_VERSION;
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
    readonly code: G06FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly substitution?: never;
  readonly electricalSnapshot?: never;
  readonly consistency?: never;
  readonly uncertaintySnapshot?: never;
}

export type G06ApparentPowerAndPowerFactorOutcome =
  | G06ApparentPowerAndPowerFactorSuccess
  | G06ApparentPowerAndPowerFactorFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const SQUARE_ROOT_OF_THREE = Math.sqrt(3);

const PORT_ROLES = Object.freeze([
  "grid_side",
  "coil_terminal",
  "transformer_primary",
  "transformer_secondary",
  "inverter_output",
  "other_explicit_single_phase_or_equivalent",
] as const);

const WAVEFORM_BASES = Object.freeze([
  "sinusoidal_steady_state",
  "possibly_nonsinusoidal_total_waveform",
  "fundamental_only",
  "unknown_or_unconfirmed",
] as const);

const VOLTAGE_INTERPRETATIONS = Object.freeze([
  "single_phase_or_equivalent_port_rms",
  "line_to_line_rms",
  "phase_to_neutral_rms",
  "other_explicit_voltage_interpretation",
  "unknown_or_unconfirmed",
] as const);

const CURRENT_INTERPRETATIONS = Object.freeze([
  "single_phase_or_equivalent_port_rms",
  "line_current_rms",
  "phase_current_rms",
  "other_explicit_current_interpretation",
  "unknown_or_unconfirmed",
] as const);

const ACTIVE_POWER_BASES = Object.freeze([
  "total_active_power_same_waveform_and_window",
  "fundamental_active_power_only",
  "cos_phi_derived",
  "unknown_or_unconfirmed",
] as const);

const PHASE_TOPOLOGIES = Object.freeze([
  "single_phase_or_equivalent_port",
  "balanced_three_phase_grid",
  "unbalanced_three_phase",
  "unknown_or_unconfirmed",
] as const);

function failure(
  status: G06ApparentPowerAndPowerFactorFailure["status"],
  code: G06FailureCode,
  message: string,
  action: string,
): G06ApparentPowerAndPowerFactorFailure {
  return Object.freeze({
    methodId: G06_METHOD_ID,
    methodVersion: G06_METHOD_VERSION,
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
  return Number.isFinite(value) && value >= G06_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormal(value: number): boolean {
  return value === 0 || isPositiveNormal(value);
}

type ParsedBindingResult =
  | { readonly ok: true; readonly binding: G06ElectricalBindingEvidence }
  | {
      readonly ok: false;
      readonly failure: G06ApparentPowerAndPowerFactorFailure;
    };

function parseBinding(value: unknown): ParsedBindingResult {
  const controlled = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "electricalStateSnapshotId",
    "portId",
    "positiveTerminalId",
    "negativeTerminalId",
    "referencePlaneId",
    "loadedState",
    "frequencyHz",
    "timeBasisId",
    "measurementWindowId",
    "portRole",
    "currentDirection",
    "waveformBasis",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-06.binding_evidence_missing"
          : "G-06.binding_evidence_invalid",
        missing
          ? "G-06 requires an explicit electrical state, port, reference plane and time binding for every quantity."
          : "A G-06 electrical binding must be an exact controlled plain-data record without accessors, symbols or extra fields.",
        "Provide the complete frozen binding fields for the same measured or modelled port state.",
      ),
    };
  }

  if (
    !isStableIdentifier(controlled.caseSnapshotId) ||
    !isStableIdentifier(controlled.electricalStateSnapshotId) ||
    !isStableIdentifier(controlled.portId) ||
    !isStableIdentifier(controlled.positiveTerminalId) ||
    !isStableIdentifier(controlled.negativeTerminalId) ||
    controlled.positiveTerminalId === controlled.negativeTerminalId ||
    !isStableIdentifier(controlled.referencePlaneId) ||
    !(LOADED_STATES as readonly unknown[]).includes(controlled.loadedState) ||
    typeof controlled.frequencyHz !== "number" ||
    !isPositiveNormal(controlled.frequencyHz) ||
    !isStableIdentifier(controlled.timeBasisId) ||
    !isStableIdentifier(controlled.measurementWindowId) ||
    !(PORT_ROLES as readonly unknown[]).includes(controlled.portRole) ||
    controlled.currentDirection !== "into_passive_port" ||
    !(WAVEFORM_BASES as readonly unknown[]).includes(controlled.waveformBasis)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.binding_evidence_invalid",
        "A G-06 electrical binding contains a missing, uncontrolled, non-finite or non-representable field.",
        "Use stable non-blank identifiers, distinct terminals, positive finite frequency, a controlled loaded state, passive current direction and a controlled waveform basis.",
      ),
    };
  }

  return {
    ok: true,
    binding: Object.freeze({
      caseSnapshotId: controlled.caseSnapshotId,
      electricalStateSnapshotId: controlled.electricalStateSnapshotId,
      portId: controlled.portId,
      positiveTerminalId: controlled.positiveTerminalId,
      negativeTerminalId: controlled.negativeTerminalId,
      referencePlaneId: controlled.referencePlaneId,
      loadedState: controlled.loadedState as LoadedState,
      frequencyHz: controlled.frequencyHz,
      timeBasisId: controlled.timeBasisId,
      measurementWindowId: controlled.measurementWindowId,
      portRole: controlled.portRole as G06PortRole,
      currentDirection: "into_passive_port",
      waveformBasis: controlled.waveformBasis as G06WaveformBasis,
    }),
  };
}

interface ParsedVoltage {
  readonly valueV: number;
  readonly quantityBasis: QuantityBasis;
  readonly interpretation: G06VoltageInterpretation;
  readonly binding: G06ElectricalBindingEvidence;
}

interface ParsedCurrent {
  readonly valueA: number;
  readonly quantityBasis: QuantityBasis;
  readonly interpretation: G06CurrentInterpretation;
  readonly binding: G06ElectricalBindingEvidence;
}

interface ParsedActivePower {
  readonly valueW: number;
  readonly activePowerBasis: G06ActivePowerBasis;
  readonly binding: G06ElectricalBindingEvidence;
}

type ParsedQuantityResult<T> =
  | { readonly ok: true; readonly quantity: T }
  | {
      readonly ok: false;
      readonly failure: G06ApparentPowerAndPowerFactorFailure;
    };

function parseVoltage(value: unknown): ParsedQuantityResult<ParsedVoltage> {
  const controlled = readExactPlainDataRecord(value, [
    "voltageV",
    "quantityBasis",
    "interpretation",
    "binding",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-06.voltage_evidence_missing"
          : "G-06.voltage_evidence_invalid",
        missing
          ? "G-06 requires an explicit canonical-SI RMS voltage record."
          : "G-06 voltage evidence must be an exact controlled plain-data record.",
        "Provide voltageV, quantityBasis, interpretation and binding without coercion or extra fields.",
      ),
    };
  }
  if (
    typeof controlled.voltageV !== "number" ||
    !isZeroOrPositiveNormal(controlled.voltageV) ||
    !(QUANTITY_BASES as readonly unknown[]).includes(controlled.quantityBasis) ||
    !(VOLTAGE_INTERPRETATIONS as readonly unknown[]).includes(
      controlled.interpretation,
    )
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.voltage_evidence_invalid",
        "G-06 voltage evidence contains a negative, non-finite, positive-subnormal or uncontrolled value.",
        "Use canonical-SI volts and controlled quantity-basis and voltage-interpretation values.",
      ),
    };
  }
  const binding = parseBinding(controlled.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    quantity: Object.freeze({
      valueV: controlled.voltageV,
      quantityBasis: controlled.quantityBasis as QuantityBasis,
      interpretation: controlled.interpretation as G06VoltageInterpretation,
      binding: binding.binding,
    }),
  };
}

function parseCurrent(value: unknown): ParsedQuantityResult<ParsedCurrent> {
  const controlled = readExactPlainDataRecord(value, [
    "currentA",
    "quantityBasis",
    "interpretation",
    "binding",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-06.current_evidence_missing"
          : "G-06.current_evidence_invalid",
        missing
          ? "G-06 requires an explicit canonical-SI RMS current record."
          : "G-06 current evidence must be an exact controlled plain-data record.",
        "Provide currentA, quantityBasis, interpretation and binding without coercion or extra fields.",
      ),
    };
  }
  if (
    typeof controlled.currentA !== "number" ||
    !isZeroOrPositiveNormal(controlled.currentA) ||
    !(QUANTITY_BASES as readonly unknown[]).includes(controlled.quantityBasis) ||
    !(CURRENT_INTERPRETATIONS as readonly unknown[]).includes(
      controlled.interpretation,
    )
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.current_evidence_invalid",
        "G-06 current evidence contains a negative, non-finite, positive-subnormal or uncontrolled value.",
        "Use canonical-SI amperes and controlled quantity-basis and current-interpretation values.",
      ),
    };
  }
  const binding = parseBinding(controlled.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    quantity: Object.freeze({
      valueA: controlled.currentA,
      quantityBasis: controlled.quantityBasis as QuantityBasis,
      interpretation: controlled.interpretation as G06CurrentInterpretation,
      binding: binding.binding,
    }),
  };
}

function parseActivePower(
  value: unknown,
): ParsedQuantityResult<ParsedActivePower> {
  const controlled = readExactPlainDataRecord(value, [
    "activePowerW",
    "activePowerBasis",
    "binding",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-06.active_power_evidence_missing"
          : "G-06.active_power_evidence_invalid",
        missing
          ? "G-06 requires an explicit same-port active-power record."
          : "G-06 active-power evidence must be an exact controlled plain-data record.",
        "Provide activePowerW, activePowerBasis and binding without coercion or extra fields.",
      ),
    };
  }
  if (
    typeof controlled.activePowerW !== "number" ||
    !isZeroOrPositiveNormal(controlled.activePowerW) ||
    !(ACTIVE_POWER_BASES as readonly unknown[]).includes(
      controlled.activePowerBasis,
    )
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.active_power_evidence_invalid",
        "G-06 active-power evidence contains a negative, non-finite, positive-subnormal or uncontrolled value.",
        "Use canonical-SI watts and a controlled active-power basis under the passive receiving-port convention.",
      ),
    };
  }
  const binding = parseBinding(controlled.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    quantity: Object.freeze({
      valueW: controlled.activePowerW,
      activePowerBasis: controlled.activePowerBasis as G06ActivePowerBasis,
      binding: binding.binding,
    }),
  };
}

type ParsedPhaseSystemResult =
  | { readonly ok: true; readonly phaseSystem: G06PhaseSystemEvidence }
  | {
      readonly ok: false;
      readonly failure: G06ApparentPowerAndPowerFactorFailure;
    };

function parsePhaseSystem(value: unknown): ParsedPhaseSystemResult {
  const controlled = readExactPlainDataRecord(value, [
    "phaseTopology",
    "phaseCount",
    "phaseTopologyEvidenceId",
    "balancedLineVoltageAndCurrentConfirmed",
    "gridSidePortConfirmed",
  ]);
  if (controlled === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "G-06.phase_system_evidence_missing"
          : "G-06.phase_system_evidence_invalid",
        missing
          ? "G-06 requires an explicit phase-count and phase-topology record."
          : "G-06 phase-system evidence must be an exact controlled plain-data record.",
        "Declare the single-phase/equivalent or balanced-three-phase-grid branch and all branch confirmations.",
      ),
    };
  }

  if (
    !(PHASE_TOPOLOGIES as readonly unknown[]).includes(
      controlled.phaseTopology,
    ) ||
    (controlled.phaseCount !== 1 && controlled.phaseCount !== 3) ||
    !isStableIdentifier(controlled.phaseTopologyEvidenceId) ||
    (controlled.balancedLineVoltageAndCurrentConfirmed !== true &&
      controlled.balancedLineVoltageAndCurrentConfirmed !== false &&
      controlled.balancedLineVoltageAndCurrentConfirmed !== null) ||
    (controlled.gridSidePortConfirmed !== true &&
      controlled.gridSidePortConfirmed !== false &&
      controlled.gridSidePortConfirmed !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.phase_system_evidence_invalid",
        "G-06 phase-system evidence contains an uncontrolled topology, phase count, confirmation or evidence identifier.",
        "Use the exact frozen phase-system discriminators and explicit true/false/null confirmations.",
      ),
    };
  }

  if (
    (controlled.phaseTopology === "single_phase_or_equivalent_port" &&
      (controlled.phaseCount !== 1 ||
        controlled.balancedLineVoltageAndCurrentConfirmed !== null ||
        controlled.gridSidePortConfirmed !== null)) ||
    (controlled.phaseTopology !== "single_phase_or_equivalent_port" &&
      controlled.phaseCount !== 3)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-06.phase_system_evidence_invalid",
        "G-06 phase topology, phase count and branch-specific confirmations contradict one another.",
        "Use phaseCount=1 with null three-phase confirmations, or phaseCount=3 with explicit three-phase confirmations.",
      ),
    };
  }

  return {
    ok: true,
    phaseSystem: Object.freeze({
      phaseTopology: controlled.phaseTopology as G06PhaseTopology,
      phaseCount: controlled.phaseCount as 1 | 3,
      phaseTopologyEvidenceId: controlled.phaseTopologyEvidenceId,
      balancedLineVoltageAndCurrentConfirmed:
        controlled.balancedLineVoltageAndCurrentConfirmed as boolean | null,
      gridSidePortConfirmed: controlled.gridSidePortConfirmed as boolean | null,
    }),
  };
}

type ParsedUncertaintyResult =
  | { readonly ok: true; readonly uncertainty: G06ConsistencyUncertainty }
  | {
      readonly ok: false;
      readonly failure: G06ApparentPowerAndPowerFactorFailure;
    };

function parseUncertainty(value: unknown): ParsedUncertaintyResult {
  const unavailable = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (unavailable !== null && unavailable.kind === "not_available") {
    if (!isStableIdentifier(unavailable.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-06.uncertainty_evidence_invalid",
          "A not-available uncertainty record requires a non-blank reason.",
          "State why a propagated P-S uncertainty is unavailable.",
        ),
      };
    }
    return {
      ok: true,
      uncertainty: Object.freeze({
        kind: "not_available",
        reason: unavailable.reason,
      }),
    };
  }

  const precomputed = readExactPlainDataRecord(value, [
    "kind",
    "expandedDifferenceUncertaintyW",
    "coverageFactor",
    "uncertaintySourceRef",
  ]);
  if (
    precomputed === null ||
    precomputed.kind !== "precomputed_expanded_uncertainty_of_P_minus_S" ||
    typeof precomputed.expandedDifferenceUncertaintyW !== "number" ||
    !isZeroOrPositiveNormal(precomputed.expandedDifferenceUncertaintyW) ||
    typeof precomputed.coverageFactor !== "number" ||
    !isPositiveNormal(precomputed.coverageFactor) ||
    !isStableIdentifier(precomputed.uncertaintySourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        value === null || value === undefined
          ? "G-06.uncertainty_evidence_missing"
          : "G-06.uncertainty_evidence_invalid",
        value === null || value === undefined
          ? "G-06 received no uncertainty-state discriminator."
          : "G-06 uncertainty evidence is neither an exact unavailable record nor a valid precomputed expanded uncertainty of P-S.",
        "Provide an explicit not_available record or a finite canonical-SI precomputed expanded P-S uncertainty with coverage and source.",
      ),
    };
  }

  return {
    ok: true,
    uncertainty: Object.freeze({
      kind: "precomputed_expanded_uncertainty_of_P_minus_S",
      expandedDifferenceUncertaintyW:
        precomputed.expandedDifferenceUncertaintyW,
      coverageFactor: precomputed.coverageFactor,
      uncertaintySourceRef: precomputed.uncertaintySourceRef,
    }),
  };
}

function sameElectricalBinding(
  left: G06ElectricalBindingEvidence,
  right: G06ElectricalBindingEvidence,
): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.electricalStateSnapshotId === right.electricalStateSnapshotId &&
    left.portId === right.portId &&
    left.positiveTerminalId === right.positiveTerminalId &&
    left.negativeTerminalId === right.negativeTerminalId &&
    left.referencePlaneId === right.referencePlaneId &&
    left.loadedState === right.loadedState &&
    left.frequencyHz === right.frequencyHz &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.portRole === right.portRole &&
    left.currentDirection === right.currentDirection &&
    left.waveformBasis === right.waveformBasis
  );
}

function availableApparentPower(
  valueSi: number,
  interpretation: G06AvailableApparentPowerOutput["interpretation"],
): G06AvailableApparentPowerOutput {
  return Object.freeze({
    kind: "available",
    outputId: "S",
    status: "available",
    valueSi,
    dimensionId: "power",
    canonicalUnitId: "W",
    engineeringUnitId: "VA",
    interpretation,
  });
}

function availablePowerFactor(
  valueSi: number,
): G06AvailablePowerFactorOutput {
  return Object.freeze({
    kind: "available",
    outputId: "PF",
    status: "available",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    interpretation:
      "true_power_factor_from_same_port_total_active_power_and_total_rms",
  });
}

function unavailablePowerFactor(
  status: G06UnavailablePowerFactorOutput["status"],
  reason: G06UnavailablePowerFactorOutput["reason"],
): G06UnavailablePowerFactorOutput {
  return Object.freeze({ kind: "unavailable", outputId: "PF", status, reason });
}

function zeroApparentPowerWarning(): G06Warning {
  return Object.freeze({
    code: "G-06.power_factor_unavailable_zero_apparent_power",
    severity: "warning",
    condition: "S=0",
    guardedPredicateRef: null,
    predicateOutcome: "not_evaluated_zero_denominator",
    message:
      "P/S is undefined at zero apparent power; G-06 publishes S=0 but no PF placeholder.",
  });
}

function withinUncertaintyWarning(): G06Warning {
  return Object.freeze({
    code: "G-06.nominal_active_power_exceeds_apparent_power_within_uncertainty",
    severity: "warning",
    condition: "0 < P-S <= U_expanded(P-S)",
    guardedPredicateRef: P_EXCEEDS_S_PREDICATE,
    predicateOutcome: "not_triggered_within_uncertainty",
    message:
      "Nominal P exceeds nominal S but remains within the supplied expanded P-S uncertainty; PF is unavailable and is not clamped to one.",
  });
}

/** Isolated canonical-SI implementation of frozen method G-06. */
export function evaluateG06ApparentPowerAndPowerFactor(
  input: G06ApparentPowerAndPowerFactorInput,
): G06ApparentPowerAndPowerFactorOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "voltage",
    "current",
    "activePower",
    "phaseSystem",
    "consistencyUncertainty",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-06.input_schema_invalid",
      "G-06 input must be one exact controlled plain-data record.",
      "Provide voltage, current, activePower, phaseSystem and consistencyUncertainty without missing, extra, accessor, symbol or coercible fields.",
    );
  }

  const voltageResult = parseVoltage(controlledInput.voltage);
  if (!voltageResult.ok) return voltageResult.failure;
  const currentResult = parseCurrent(controlledInput.current);
  if (!currentResult.ok) return currentResult.failure;
  const powerResult = parseActivePower(controlledInput.activePower);
  if (!powerResult.ok) return powerResult.failure;
  const phaseResult = parsePhaseSystem(controlledInput.phaseSystem);
  if (!phaseResult.ok) return phaseResult.failure;
  const uncertaintyResult = parseUncertainty(
    controlledInput.consistencyUncertainty,
  );
  if (!uncertaintyResult.ok) return uncertaintyResult.failure;

  const voltage = voltageResult.quantity;
  const current = currentResult.quantity;
  const activePower = powerResult.quantity;
  const phaseSystem = phaseResult.phaseSystem;
  const uncertainty = uncertaintyResult.uncertainty;

  /* Exact schema/enum checks above are authoritative.  Below them, a known
   * frozen domain exclusion precedes any generic same-boundary insufficiency;
   * explicit unknown/unconfirmed discriminators remain insufficient_data. */
  if (voltage.quantityBasis !== current.quantityBasis) {
    return failure(
      "not_applicable",
      "G-06.quantity_basis_not_applicable",
      "G-06 voltage and current do not share one RMS quantity basis.",
      "Use matching total RMS values from the exact same waveform and time window.",
    );
  }
  if (
    voltage.quantityBasis !== "rms" &&
    voltage.quantityBasis !== "full_wave_rms"
  ) {
    return failure(
      "not_applicable",
      "G-06.quantity_basis_not_applicable",
      "G-06 true PF accepts only sinusoidal RMS or total full-wave RMS voltage and current, not peak, DC, average, local, total labels or fundamental-only values.",
      "Provide total same-waveform RMS values; route fundamental-only quantities to a separately labelled fundamental analysis.",
    );
  }

  const electricalBindings = [
    voltage.binding,
    current.binding,
    activePower.binding,
  ] as const;
  if (
    (voltage.binding.waveformBasis === "sinusoidal_steady_state" &&
      voltage.quantityBasis !== "rms") ||
    (voltage.binding.waveformBasis ===
      "possibly_nonsinusoidal_total_waveform" &&
      voltage.quantityBasis !== "full_wave_rms") ||
    (current.binding.waveformBasis === "sinusoidal_steady_state" &&
      current.quantityBasis !== "rms") ||
    (current.binding.waveformBasis ===
      "possibly_nonsinusoidal_total_waveform" &&
      current.quantityBasis !== "full_wave_rms") ||
    electricalBindings.some(
      (binding) => binding.waveformBasis === "fundamental_only",
    )
  ) {
    return failure(
      "not_applicable",
      "G-06.waveform_basis_not_applicable",
      "G-06 RMS values are inconsistent with the declared waveform basis or are explicitly fundamental-only.",
      "Use rms for a confirmed sinusoidal steady state, or full_wave_rms with total active power for the complete possibly nonsinusoidal waveform.",
    );
  }
  if (
    activePower.activePowerBasis === "fundamental_active_power_only" ||
    activePower.activePowerBasis === "cos_phi_derived"
  ) {
    return failure(
      "not_applicable",
      "G-06.active_power_basis_not_applicable",
      activePower.activePowerBasis === "cos_phi_derived"
        ? "G-06 does not accept active power reconstructed from cos(phi) as evidence for true PF."
        : "G-06 does not mix fundamental-only active power with total RMS apparent power.",
      "Provide independently measured or modelled total active power for the same port, waveform and time window; never substitute cos(phi) for true PF.",
    );
  }

  if (phaseSystem.phaseTopology === "unbalanced_three_phase") {
    return failure(
      "not_applicable",
      "G-06.phase_system_not_applicable",
      "The frozen sqrt(3) branch is not applicable to an explicitly unbalanced three-phase system.",
      "Provide a confirmed balanced three-phase grid-side state or use a phase-resolved method.",
    );
  }
  if (
    phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
    phaseSystem.balancedLineVoltageAndCurrentConfirmed === false
  ) {
    return failure(
      "not_applicable",
      "G-06.phase_system_not_applicable",
      "The declared three-phase line quantities are not balanced, so sqrt(3) U_LL I_L is outside the frozen G-06 domain.",
      "Use a phase-resolved method for the unbalanced system.",
    );
  }
  if (
    phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
    (phaseSystem.gridSidePortConfirmed === false ||
      electricalBindings.some((binding) => binding.portRole !== "grid_side"))
  ) {
    return failure(
      "not_applicable",
      "G-06.three_phase_not_grid_side",
      "The frozen three-phase branch is grid-side only, but at least one declared quantity belongs to another electrical boundary.",
      "Use same-boundary grid-side U_LL, I_L and P, or select the single-phase/equivalent port branch where applicable.",
    );
  }

  const voltageInterpretationKnownUnsupported =
    voltage.interpretation === "phase_to_neutral_rms" ||
    voltage.interpretation === "other_explicit_voltage_interpretation" ||
    (phaseSystem.phaseTopology === "single_phase_or_equivalent_port" &&
      voltage.interpretation === "line_to_line_rms") ||
    (phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
      voltage.interpretation === "single_phase_or_equivalent_port_rms");
  const currentInterpretationKnownUnsupported =
    current.interpretation === "phase_current_rms" ||
    current.interpretation === "other_explicit_current_interpretation" ||
    (phaseSystem.phaseTopology === "single_phase_or_equivalent_port" &&
      current.interpretation === "line_current_rms") ||
    (phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
      current.interpretation === "single_phase_or_equivalent_port_rms");
  if (
    voltageInterpretationKnownUnsupported ||
    currentInterpretationKnownUnsupported
  ) {
    return failure(
      "not_applicable",
      "G-06.voltage_current_interpretation_not_applicable",
      "The declared voltage/current interpretation is explicitly outside the selected G-06 phase branch.",
      "Select the matching phase branch and supply its explicitly defined total RMS voltage/current pair.",
    );
  }

  if (
    electricalBindings.some(
      (binding) => binding.waveformBasis === "unknown_or_unconfirmed",
    )
  ) {
    return failure(
      "insufficient_data",
      "G-06.waveform_basis_unconfirmed",
      "At least one waveform basis is unknown or unconfirmed, so G-06 cannot establish total same-waveform RMS evidence.",
      "Confirm a sinusoidal RMS or complete possibly nonsinusoidal total-waveform basis for all three quantities.",
    );
  }
  if (activePower.activePowerBasis === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-06.active_power_basis_unconfirmed",
      "The active-power basis is unknown or unconfirmed.",
      "Confirm total active power for the exact same waveform and measurement window.",
    );
  }
  if (phaseSystem.phaseTopology === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-06.phase_system_unconfirmed",
      "The phase topology is unknown or unconfirmed.",
      "Confirm the single-phase/equivalent or balanced-three-phase-grid topology without inference.",
    );
  }
  if (
    voltage.interpretation === "unknown_or_unconfirmed" ||
    current.interpretation === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "G-06.voltage_current_interpretation_unconfirmed",
      "The voltage or current interpretation is unknown or unconfirmed.",
      "Confirm the exact port-RMS or grid line-quantity interpretation before calculating apparent power.",
    );
  }
  if (
    phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
    phaseSystem.balancedLineVoltageAndCurrentConfirmed === null
  ) {
    return failure(
      "insufficient_data",
      "G-06.three_phase_balance_unconfirmed",
      "Balanced three-phase line voltage/current evidence is unresolved.",
      "Confirm waveform-level balance before using sqrt(3) U_LL I_L.",
    );
  }
  if (
    phaseSystem.phaseTopology === "balanced_three_phase_grid" &&
    phaseSystem.gridSidePortConfirmed === null
  ) {
    return failure(
      "insufficient_data",
      "G-06.three_phase_not_grid_side",
      "The three-phase port has not been confirmed as the grid-side line-quantity reference plane.",
      "Confirm the grid-side port and reference plane before using the balanced three-phase branch.",
    );
  }

  if (
    !sameElectricalBinding(voltage.binding, current.binding) ||
    !sameElectricalBinding(voltage.binding, activePower.binding)
  ) {
    return failure(
      "insufficient_data",
      "G-06.port_state_time_boundary_mismatch",
      "G-06 voltage, current and active power do not share one exact case/state snapshot, port, terminal pair, reference plane, frequency, loaded state, waveform basis, time basis and measurement window.",
      "Resolve all three quantities to the same declared electrical port state; never mix coil-terminal, grid-side, transformer-side or different-time quantities.",
    );
  }

  let phaseMultiplier: 1 | number;
  let equation: G06ApparentPowerAndPowerFactorSuccess["equation"];
  let apparentPowerInterpretation: G06AvailableApparentPowerOutput["interpretation"];

  if (phaseSystem.phaseTopology === "single_phase_or_equivalent_port") {
    phaseMultiplier = 1;
    equation = "S = V_rms * I_rms; PF = P / S when S > 0";
    apparentPowerInterpretation =
      "single_phase_or_equivalent_apparent_power";
  } else {
    phaseMultiplier = SQUARE_ROOT_OF_THREE;
    equation =
      "S = sqrt(3) * U_LL,rms * I_L,rms; PF = P / S when S > 0";
    apparentPowerInterpretation =
      "balanced_three_phase_grid_apparent_power";
  }

  const baseVoltAmpere = voltage.valueV * current.valueA;
  if (
    !Number.isFinite(baseVoltAmpere) ||
    baseVoltAmpere < 0 ||
    (voltage.valueV > 0 &&
      current.valueA > 0 &&
      !isPositiveNormal(baseVoltAmpere))
  ) {
    return failure(
      "invalid_input",
      "G-06.numeric_resolution_invalid",
      "G-06 V*I overflowed or underflowed the controlled binary64 representability domain.",
      "Use finite representable canonical-SI voltage/current inputs; no false zero, infinity or positive-subnormal result is published.",
    );
  }
  const apparentPowerVA = phaseMultiplier * baseVoltAmpere;
  if (
    !Number.isFinite(apparentPowerVA) ||
    apparentPowerVA < 0 ||
    (baseVoltAmpere > 0 && !isPositiveNormal(apparentPowerVA))
  ) {
    return failure(
      "invalid_input",
      "G-06.numeric_resolution_invalid",
      "G-06 apparent power is non-finite or unrepresentable in binary64.",
      "Use finite representable canonical-SI quantities; no overflow, false zero or positive-subnormal result is published.",
    );
  }

  const nominalDifferenceW = activePower.valueW - apparentPowerVA;
  if (
    !Number.isFinite(nominalDifferenceW) ||
    (apparentPowerVA > 0 &&
      nominalDifferenceW === activePower.valueW) ||
    (activePower.valueW > 0 &&
      nominalDifferenceW === -apparentPowerVA) ||
    (nominalDifferenceW !== 0 &&
      Math.abs(nominalDifferenceW) < G06_BINARY64_MIN_NORMAL)
  ) {
    return failure(
      "invalid_input",
      "G-06.numeric_resolution_invalid",
      "G-06 could not represent the P-S consistency residual as a normal finite binary64 value without swallowing a nonzero operand.",
      "Use a numerically resolvable canonical-SI scale or an upstream uncertainty computation that preserves the residual.",
    );
  }

  let powerFactor:
    | G06AvailablePowerFactorOutput
    | G06UnavailablePowerFactorOutput;
  const mutableWarnings: G06Warning[] = [];
  let consistencyClassification:
    | "nominal_consistent"
    | "nominal_exceeds_within_expanded_uncertainty" = "nominal_consistent";

  if (nominalDifferenceW > 0) {
    if (uncertainty.kind === "not_available") {
      return failure(
        "insufficient_data",
        "G-06.uncertainty_required_for_nominal_exceedance",
        "Nominal active power exceeds nominal apparent power, but no propagated expanded uncertainty of P-S is available to classify the measurement consistency.",
        "Provide a traceable precomputed expanded uncertainty for P-S; G-06 will not invent an uncertainty propagation rule or clamp PF.",
      );
    }
    if (
      nominalDifferenceW > uncertainty.expandedDifferenceUncertaintyW
    ) {
      return failure(
        "inconsistent_measurement",
        "G-06.active_power_exceeds_apparent_power",
        "Active power exceeds apparent power beyond the supplied expanded P-S uncertainty under the passive same-port convention.",
        "Correct the port, RMS/time basis, instrument/de-embedding record or uncertainty analysis; no S/PF result is retained.",
      );
    }
    consistencyClassification =
      "nominal_exceeds_within_expanded_uncertainty";
    mutableWarnings.push(withinUncertaintyWarning());
    powerFactor = unavailablePowerFactor(
      "insufficient_data",
      "nominal P exceeds S but remains compatible with the supplied expanded uncertainty; PF is not clamped or published",
    );
  } else if (apparentPowerVA === 0) {
    mutableWarnings.push(zeroApparentPowerWarning());
    powerFactor = unavailablePowerFactor(
      "not_applicable",
      "P/S is undefined at zero apparent power",
    );
  } else {
    const powerFactorValue = activePower.valueW / apparentPowerVA;
    if (
      !Number.isFinite(powerFactorValue) ||
      powerFactorValue < 0 ||
      powerFactorValue > 1 ||
      (activePower.valueW > 0 && !isPositiveNormal(powerFactorValue))
    ) {
      return failure(
        "invalid_input",
        "G-06.numeric_resolution_invalid",
        "G-06 true PF is non-finite, outside the passive [0,1] interval or underflowed to an unrepresentable value.",
        "Use finite representable same-port P, V and I values; G-06 does not clamp or replace PF.",
      );
    }
    powerFactor = availablePowerFactor(powerFactorValue);
  }

  const warnings = Object.freeze(mutableWarnings);
  const quantityBasis = voltage.quantityBasis as "rms" | "full_wave_rms";
  const voltageInterpretation = voltage.interpretation as
    | "single_phase_or_equivalent_port_rms"
    | "line_to_line_rms";
  const currentInterpretation = current.interpretation as
    | "single_phase_or_equivalent_port_rms"
    | "line_current_rms";

  return Object.freeze({
    methodId: G06_METHOD_ID,
    methodVersion: G06_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value: Object.freeze({
      S: availableApparentPower(
        apparentPowerVA,
        apparentPowerInterpretation,
      ),
      PF: powerFactor,
    }),
    equation,
    substitution: Object.freeze({
      voltageV: voltage.valueV,
      currentA: current.valueA,
      activePowerW: activePower.valueW,
      phaseMultiplier,
      apparentPowerVA,
    }),
    electricalSnapshot: Object.freeze({
      binding: voltage.binding,
      phaseSystem,
      voltageQuantityBasis: quantityBasis,
      currentQuantityBasis: quantityBasis,
      voltageInterpretation,
      currentInterpretation,
      activePowerBasis: "total_active_power_same_waveform_and_window",
    }),
    consistency: Object.freeze({
      nominalActivePowerMinusApparentPowerW: nominalDifferenceW,
      expandedDifferenceUncertaintyW:
        uncertainty.kind ===
        "precomputed_expanded_uncertainty_of_P_minus_S"
          ? uncertainty.expandedDifferenceUncertaintyW
          : null,
      classification: consistencyClassification,
      inputAdjusted: false,
      powerFactorPublished: powerFactor.kind === "available",
    }),
    uncertaintySnapshot: uncertainty,
    sourceRefs: G06_SOURCE_REFS,
    contractSourceRefs: G06_CONTRACT_SOURCE_REFS,
    derivationRefs: G06_DERIVATION_REFS,
    validationCaseIds: G06_VALIDATION_CASE_IDS,
    methodCheckIds: G06_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G06_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "voltage, current and active power belong to one exact port, reference plane, loaded state, frequency, time basis and measurement window",
      "positive active power follows the frozen passive receiving-port convention",
      "single-phase/equivalent values are total RMS port values, or three-phase values are balanced grid-side line quantities",
      "PF is calculated only as P/S from total active power and matching total RMS quantities; cos(phi) is never substituted",
      "the method does not predict converter efficiency or distortion power factor from topology",
    ] as const),
  });
}
