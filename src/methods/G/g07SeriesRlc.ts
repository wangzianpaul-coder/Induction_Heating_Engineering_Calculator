import {
  LOADED_STATES,
  QUANTITY_BASES,
  TOPOLOGY_IDS,
  type ControlledTopologyId,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-07"));

export const G07_METHOD_ID = "G-07" as const;
export const G07_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G07_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G07_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G07_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G07_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G07_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G07_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G07_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  swallowedNonzeroReactiveTermPolicy: "fail_closed" as const,
  resonanceResidualClamping: false as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G07_BINARY64_MIN_NORMAL,
});

export const G07_SERIES_RLC_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: G07_SOURCE_REFS,
  contractSourceRefs: G07_CONTRACT_SOURCE_REFS,
  derivationRefs: G07_DERIVATION_REFS,
  validationCaseIds: G07_VALIDATION_CASE_IDS,
  methodCheckIds: G07_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G07_NUMERIC_REPRESENTABILITY_POLICY,
});

const TOPOLOGY_UNKNOWN_PREDICATE = "topology is unknown" as const;
const UNLOADED_L_PREDICATE =
  "unloaded L replaces hot loaded L without warning" as const;
const WRONG_TOPOLOGY_PREDICATE =
  "parallel or LLC topology uses the series method" as const;
const PARASITICS_IGNORED_PREDICATE = "parasitics are ignored" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-07 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G07_WARNING_PREDICATES = Object.freeze({
  topologyUnknown: controlledWarningPredicate(TOPOLOGY_UNKNOWN_PREDICATE),
  unloadedInductanceWithoutWarning: controlledWarningPredicate(
    UNLOADED_L_PREDICATE,
  ),
  parallelOrLlcMisroute: controlledWarningPredicate(WRONG_TOPOLOGY_PREDICATE),
  parasiticsIgnored: controlledWarningPredicate(PARASITICS_IGNORED_PREDICATE),
});

export type G07TopologyEvidenceId =
  | ControlledTopologyId
  | "unknown_or_unconfirmed";

export type G07NetworkModelRegime =
  | "ideal_lumped_linear_single_frequency"
  | "distributed_or_switching_or_nonlinear"
  | "unknown_or_unconfirmed";

export type G07ParasiticAssessment =
  | "confirmed_negligible_for_intended_use"
  | "present_or_material"
  | "unknown_or_unconfirmed";

export type G07InductanceStateRoute =
  | "loaded_design_state"
  | "unloaded_reference_only"
  | "unknown_or_unconfirmed";

export interface G07TopologyEvidence {
  readonly topologyId: G07TopologyEvidenceId;
  readonly seriesNetworkId: string;
  readonly networkModelRegime: G07NetworkModelRegime;
  readonly parasiticAssessment: G07ParasiticAssessment;
}

export interface G07PortEvidence {
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly loadedState: LoadedState | "unknown_or_unconfirmed";
  readonly designStateId: string;
  readonly frequencyHz: number;
  readonly phasorTimeConvention:
    | "exp_j_omega_t"
    | "other_or_unconfirmed";
  readonly currentDirection:
    | "into_passive_port"
    | "other_or_unconfirmed";
}

interface G07StateBoundElementEvidence {
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState | "unknown_or_unconfirmed";
  readonly designStateId: string;
  readonly seriesNetworkId: string;
  readonly sourceSnapshotId: string;
}

export interface G07ResistanceEvidence extends G07StateBoundElementEvidence {
  /** Series-equivalent resistance in canonical SI ohms. */
  readonly resistanceOhm: number;
}

export interface G07InductanceEvidence extends G07StateBoundElementEvidence {
  /** Series-equivalent inductance in canonical SI henries. */
  readonly inductanceH: number;
  readonly stateRoute: G07InductanceStateRoute;
}

export interface G07CapacitanceEvidence extends G07StateBoundElementEvidence {
  /** Series compensation capacitance in canonical SI farads. */
  readonly capacitanceF: number;
}

export interface G07SeriesRlcInput {
  readonly topology: G07TopologyEvidence;
  readonly port: G07PortEvidence;
  readonly resistance: G07ResistanceEvidence;
  readonly inductance: G07InductanceEvidence;
  readonly capacitance: G07CapacitanceEvidence;
}

export interface G07ComplexImpedanceOutput {
  readonly kind: "available";
  readonly outputId: "Zs";
  readonly status: "available";
  readonly valueSi: Readonly<{
    readonly realOhm: number;
    readonly imaginaryOhm: number;
  }>;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "series_rlc_input_impedance";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface G07FrequencyOutput {
  readonly kind: "available";
  readonly outputId: "f0";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "frequency";
  readonly canonicalUnitId: "Hz";
  readonly interpretation: "ideal_series_lc_natural_frequency";
}

export interface G07CapacitanceOutput {
  readonly kind: "available";
  readonly outputId: "C_for_f";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "capacitance";
  readonly canonicalUnitId: "F";
  readonly interpretation: "ideal_series_compensation_capacitance_for_requested_frequency";
}

export interface G07SeriesRlcValue {
  readonly Zs: G07ComplexImpedanceOutput;
  readonly f0: G07FrequencyOutput;
  readonly C_for_f: G07CapacitanceOutput;
}

export interface G07Warning {
  readonly code:
    | "G-07.parasitics_excluded_after_negligibility_confirmation"
    | "G-07.unloaded_inductance_reference_only";
  readonly condition:
    | "ideal lumped model excludes parasitic elements"
    | "stateRoute=unloaded_reference_only and loadedState=empty";
  readonly guardedPredicateRef:
    | typeof PARASITICS_IGNORED_PREDICATE
    | typeof UNLOADED_L_PREDICATE;
  readonly message: string;
}

export interface G07SeriesRlcSuccess {
  readonly methodId: typeof G07_METHOD_ID;
  readonly methodVersion: typeof G07_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** The frozen contract supplies prose predicates but no stable warning IDs. */
  readonly warningIds: readonly [];
  readonly warnings: readonly G07Warning[];
  readonly value: G07SeriesRlcValue;
  readonly equations: readonly [
    "omega = 2*pi*f",
    "Z_s = R + j*(omega*L - 1/(omega*C))",
    "f_0 = 1/(2*pi*sqrt(L*C))",
    "C_for_f = 1/((2*pi*f)^2*L)",
  ];
  readonly substitution: Readonly<{
    readonly resistanceOhm: number;
    readonly inductanceH: number;
    readonly capacitanceF: number;
    readonly frequencyHz: number;
    readonly angularFrequencyRadPerS: number;
    readonly inductiveReactanceOhm: number;
    readonly capacitiveReactanceOhm: number;
  }>;
  readonly inputSnapshot: Readonly<{
    readonly topologyId: "series_rlc_single_loop";
    readonly seriesNetworkId: string;
    readonly portId: string;
    readonly positiveTerminalId: string;
    readonly negativeTerminalId: string;
    readonly referencePlaneId: string;
    readonly quantityBasis: "rms" | "fundamental_rms";
    readonly loadedState: LoadedState;
    readonly designStateId: string;
    readonly frequencyHz: number;
    readonly phasorTimeConvention: "exp_j_omega_t";
    readonly currentDirection: "into_passive_port";
    readonly inductanceStateRoute:
      | "loaded_design_state"
      | "unloaded_reference_only";
    readonly resistanceSourceSnapshotId: string;
    readonly inductanceSourceSnapshotId: string;
    readonly capacitanceSourceSnapshotId: string;
  }>;
  readonly materialProperties: readonly [];
  readonly applicabilityChecks: readonly [
    "topology_id is series_rlc_single_loop",
    "port uses RMS or fundamental_rms with exp(j*omega*t) and passive current direction",
    "R, L, C and f share one network, port, reference plane, design state and loaded state",
    "network is ideal lumped, linear and single-frequency",
    "parasitics were explicitly assessed negligible for the intended use",
    "inductance loaded/unloaded route is explicit and consistent with loaded_state",
  ];
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_closed_form_no_iterative_solver";
    readonly operatingReactiveResidualOhm: number;
    readonly resonanceResidualClamped: false;
  }>;
  readonly portBoundary: Readonly<{
    readonly topologyId: "series_rlc_single_loop";
    readonly resultScope: "declared_series_tank_input_port";
    readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
    readonly excludedTopologies: readonly [
      "parallel_ideal_r_l_c_branches",
      "parallel_c_with_series_rl_load",
      "llc_zjl_fig2_6_fundamental_equivalent",
      "ideal_transformer",
    ];
    readonly excludedEffects: readonly [
      "capacitor_esr_and_esl",
      "wiring_and_busbar_parasitics",
      "switching_harmonics",
      "distributed_and_nonlinear_effects",
    ];
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim: "limited_by_input_precision_and_model_applicability";
  }>;
  readonly sourceRefs: typeof G07_SOURCE_REFS;
  readonly contractSourceRefs: typeof G07_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G07_DERIVATION_REFS;
  readonly validationCaseIds: typeof G07_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G07_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy: typeof G07_NUMERIC_REPRESENTABILITY_POLICY;
  readonly recommendation: Readonly<{
    readonly eligibility: null;
    readonly reason: string;
  }>;
  readonly assumptions: readonly [
    "ideal lumped linear series RLC network",
    "single-frequency sinusoidal steady state",
    "R, L and C are constant at the declared design snapshot",
    "component and interconnect parasitics are excluded after an explicit negligibility assessment",
    "f0 and C_for_f are ideal compensation quantities, not converter-control or component-stress predictions",
  ];
  readonly failure?: never;
}

export type G07FailureCode =
  | "G-07.input_schema_invalid"
  | "G-07.topology_evidence_missing"
  | "G-07.topology_evidence_invalid"
  | "G-07.topology_unknown"
  | "G-07.topology_not_applicable"
  | "G-07.network_model_unknown"
  | "G-07.network_model_not_applicable"
  | "G-07.parasitic_assessment_unknown"
  | "G-07.parasitics_not_applicable"
  | "G-07.port_evidence_missing"
  | "G-07.port_evidence_invalid"
  | "G-07.port_basis_unknown"
  | "G-07.port_basis_not_applicable"
  | "G-07.phasor_convention_unknown"
  | "G-07.current_direction_unknown"
  | "G-07.loaded_state_unknown"
  | "G-07.resistance_evidence_missing"
  | "G-07.resistance_evidence_invalid"
  | "G-07.inductance_evidence_missing"
  | "G-07.inductance_evidence_invalid"
  | "G-07.capacitance_evidence_missing"
  | "G-07.capacitance_evidence_invalid"
  | "G-07.element_loaded_state_unknown"
  | "G-07.state_boundary_mismatch"
  | "G-07.inductance_route_unknown"
  | "G-07.inductance_route_inconsistent"
  | "G-07.numeric_resolution_invalid"
  | "G-07.reactive_term_swallowed";

export interface G07SeriesRlcFailure {
  readonly methodId: typeof G07_METHOD_ID;
  readonly methodVersion: typeof G07_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: G07FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
  readonly materialProperties?: never;
  readonly solverResiduals?: never;
  readonly portBoundary?: never;
}

export type G07SeriesRlcOutcome = G07SeriesRlcSuccess | G07SeriesRlcFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function failure(
  status: G07SeriesRlcFailure["status"],
  code: G07FailureCode,
  message: string,
  action: string,
): G07SeriesRlcFailure {
  return Object.freeze({
    methodId: G07_METHOD_ID,
    methodVersion: G07_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
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

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= G07_BINARY64_MIN_NORMAL;
}

interface ParsedPort {
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly quantityBasis: "rms" | "fundamental_rms";
  readonly loadedState: LoadedState;
  readonly designStateId: string;
  readonly frequencyHz: number;
}

type ParsedPortResult =
  | { readonly ok: true; readonly port: ParsedPort }
  | { readonly ok: false; readonly failure: G07SeriesRlcFailure };

function parsePort(value: unknown): ParsedPortResult {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.port_evidence_missing",
        "G-07 requires an explicit port, reference plane, RMS basis, loaded state and design state.",
        "Provide the complete frozen G-07 port evidence record.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "portId",
    "positiveTerminalId",
    "negativeTerminalId",
    "referencePlaneId",
    "quantityBasis",
    "loadedState",
    "designStateId",
    "frequencyHz",
    "phasorTimeConvention",
    "currentDirection",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 port evidence must be an exact controlled plain-data record without accessors or extra fields.",
        "Provide only the frozen G-07 port fields as plain data values.",
      ),
    };
  }
  if (
    !isNonBlankString(record.portId) ||
    !isNonBlankString(record.positiveTerminalId) ||
    !isNonBlankString(record.negativeTerminalId) ||
    record.positiveTerminalId === record.negativeTerminalId ||
    !isNonBlankString(record.referencePlaneId) ||
    !isNonBlankString(record.designStateId) ||
    typeof record.frequencyHz !== "number" ||
    !isPositiveNormalBinary64(record.frequencyHz)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 port evidence has a blank identifier, coincident terminals, or a non-positive/non-representable SI frequency.",
        "Use distinct terminals, stable non-blank identifiers and a positive normal binary64 frequency in hertz.",
      ),
    };
  }
  if (record.quantityBasis === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.port_basis_unknown",
        "G-07 cannot evaluate an unconfirmed RMS/quantity basis.",
        "Confirm rms or fundamental_rms at the declared port.",
      ),
    };
  }
  if (!(QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 received an uncontrolled quantity basis.",
        "Use the frozen quantity-basis enumeration without coercion.",
      ),
    };
  }
  if (record.quantityBasis !== "rms" && record.quantityBasis !== "fundamental_rms") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "G-07.port_basis_not_applicable",
        "G-07 single-frequency phasor algebra accepts only rms or fundamental_rms quantities.",
        "Do not route peak, full-wave RMS, DC, average, local or total quantities into G-07.",
      ),
    };
  }
  if (record.loadedState === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.loaded_state_unknown",
        "G-07 requires an explicit frozen loaded_state.",
        "Declare empty, workpiece_cold, workpiece_hot, measured_state or user_defined_state.",
      ),
    };
  }
  if (!(LOADED_STATES as readonly unknown[]).includes(record.loadedState)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 received an uncontrolled loaded_state.",
        "Use the frozen loaded_state enumeration without coercion.",
      ),
    };
  }
  if (record.phasorTimeConvention === "other_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.phasor_convention_unknown",
        "G-07 requires the frozen exp(j*omega*t) phasor convention.",
        "Confirm exp_j_omega_t before evaluating signed reactance.",
      ),
    };
  }
  if (record.phasorTimeConvention !== "exp_j_omega_t") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 received an uncontrolled phasor convention.",
        "Use exp_j_omega_t or explicitly mark the convention unconfirmed.",
      ),
    };
  }
  if (record.currentDirection === "other_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.current_direction_unknown",
        "G-07 requires current direction into the passive port.",
        "Confirm the frozen passive current direction before evaluation.",
      ),
    };
  }
  if (record.currentDirection !== "into_passive_port") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-07.port_evidence_invalid",
        "G-07 received an uncontrolled current-direction convention.",
        "Use into_passive_port or explicitly mark the direction unconfirmed.",
      ),
    };
  }

  return {
    ok: true,
    port: Object.freeze({
      portId: record.portId,
      positiveTerminalId: record.positiveTerminalId,
      negativeTerminalId: record.negativeTerminalId,
      referencePlaneId: record.referencePlaneId,
      quantityBasis: record.quantityBasis,
      loadedState: record.loadedState as LoadedState,
      designStateId: record.designStateId,
      frequencyHz: record.frequencyHz,
    }),
  };
}

interface ParsedElement {
  readonly valueSi: number;
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  readonly designStateId: string;
  readonly seriesNetworkId: string;
  readonly sourceSnapshotId: string;
  readonly stateRoute?: G07InductanceStateRoute;
}

type ParsedElementResult =
  | { readonly ok: true; readonly element: ParsedElement }
  | { readonly ok: false; readonly failure: G07SeriesRlcFailure };

function parseElement(
  value: unknown,
  kind: "resistance" | "inductance" | "capacitance",
): ParsedElementResult {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        `G-07.${kind}_evidence_missing` as G07FailureCode,
        `G-07 requires explicit ${kind} evidence bound to the design snapshot.`,
        `Provide the complete canonical-SI G-07 ${kind} evidence record.`,
      ),
    };
  }
  const valueKey =
    kind === "resistance"
      ? "resistanceOhm"
      : kind === "inductance"
        ? "inductanceH"
        : "capacitanceF";
  const keys = [
    valueKey,
    "frequencyHz",
    "portId",
    "referencePlaneId",
    "loadedState",
    "designStateId",
    "seriesNetworkId",
    "sourceSnapshotId",
    ...(kind === "inductance" ? ["stateRoute"] : []),
  ];
  const record = readExactPlainDataRecord(value, keys);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `G-07.${kind}_evidence_invalid` as G07FailureCode,
        `G-07 ${kind} evidence must be an exact controlled plain-data record without accessors or extra fields.`,
        `Provide only the frozen G-07 ${kind} fields as plain data values.`,
      ),
    };
  }
  const numericValue = record[valueKey];
  const resistanceIsValid =
    kind === "resistance" &&
    typeof numericValue === "number" &&
    Number.isFinite(numericValue) &&
    (numericValue === 0 || isPositiveNormalBinary64(numericValue));
  const positiveValueIsValid =
    kind !== "resistance" &&
    typeof numericValue === "number" &&
    isPositiveNormalBinary64(numericValue);
  if (
    (!resistanceIsValid && !positiveValueIsValid) ||
    typeof record.frequencyHz !== "number" ||
    !isPositiveNormalBinary64(record.frequencyHz) ||
    !isNonBlankString(record.portId) ||
    !isNonBlankString(record.referencePlaneId) ||
    !isNonBlankString(record.designStateId) ||
    !isNonBlankString(record.seriesNetworkId) ||
    !isNonBlankString(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `G-07.${kind}_evidence_invalid` as G07FailureCode,
        `G-07 ${kind} evidence contains a non-finite, negative, zero-for-positive-only, subnormal, or blank value.`,
        "Use canonical SI: R>=0 (zero allowed), L>0, C>0 and f>0 with positive nonzero quantities representable as normal binary64 values.",
      ),
    };
  }
  if (record.loadedState === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-07.element_loaded_state_unknown",
        `G-07 ${kind} evidence has an unconfirmed loaded_state.`,
        "Bind every R/L/C element to the explicit port loaded_state.",
      ),
    };
  }
  if (!(LOADED_STATES as readonly unknown[]).includes(record.loadedState)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `G-07.${kind}_evidence_invalid` as G07FailureCode,
        `G-07 ${kind} evidence uses an uncontrolled loaded_state.`,
        "Use the frozen loaded_state enumeration without coercion.",
      ),
    };
  }
  if (kind === "inductance") {
    if (record.stateRoute === "unknown_or_unconfirmed") {
      return {
        ok: false,
        failure: failure(
          "insufficient_data",
          "G-07.inductance_route_unknown",
          "G-07 cannot decide whether L is a loaded design value or an unloaded reference.",
          "Declare loaded_design_state or unloaded_reference_only explicitly.",
        ),
      };
    }
    if (
      record.stateRoute !== "loaded_design_state" &&
      record.stateRoute !== "unloaded_reference_only"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-07.inductance_evidence_invalid",
          "G-07 received an uncontrolled inductance state route.",
          "Use the frozen G-07 inductance state-route enumeration without coercion.",
        ),
      };
    }
  }

  return {
    ok: true,
    element: Object.freeze({
      valueSi: numericValue as number,
      frequencyHz: record.frequencyHz,
      portId: record.portId,
      referencePlaneId: record.referencePlaneId,
      loadedState: record.loadedState as LoadedState,
      designStateId: record.designStateId,
      seriesNetworkId: record.seriesNetworkId,
      sourceSnapshotId: record.sourceSnapshotId,
      ...(kind === "inductance"
        ? { stateRoute: record.stateRoute as G07InductanceStateRoute }
        : {}),
    }),
  };
}

function elementMatchesStructuralBoundary(
  element: ParsedElement,
  port: ParsedPort,
  seriesNetworkId: string,
): boolean {
  return (
    element.frequencyHz === port.frequencyHz &&
    element.portId === port.portId &&
    element.referencePlaneId === port.referencePlaneId &&
    element.designStateId === port.designStateId &&
    element.seriesNetworkId === seriesNetworkId
  );
}

function elementMatchesBoundary(
  element: ParsedElement,
  port: ParsedPort,
  seriesNetworkId: string,
): boolean {
  return (
    elementMatchesStructuralBoundary(element, port, seriesNetworkId) &&
    element.loadedState === port.loadedState
  );
}

function numericFailure(message: string): G07SeriesRlcFailure {
  return failure(
    "invalid_input",
    "G-07.numeric_resolution_invalid",
    message,
    "Use finite, representable canonical-SI values or a separately approved higher-precision calculation path; do not clamp, rescale or rearrange the frozen equation silently.",
  );
}

/** Isolated canonical-SI implementation of frozen method G-07. */
export function evaluateG07SeriesRlc(
  input: G07SeriesRlcInput,
): G07SeriesRlcOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "topology",
    "port",
    "resistance",
    "inductance",
    "capacitance",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-07.input_schema_invalid",
      "G-07 input must be an exact controlled plain-data record.",
      "Provide topology, port, resistance, inductance and capacitance records without accessors or extra fields.",
    );
  }

  if (controlledInput.topology === null || controlledInput.topology === undefined) {
    return failure(
      "insufficient_data",
      "G-07.topology_evidence_missing",
      "G-07 requires an explicit topology_id and series-network model boundary.",
      "Select series_rlc_single_loop and provide the complete topology evidence.",
    );
  }
  const topology = readExactPlainDataRecord(controlledInput.topology, [
    "topologyId",
    "seriesNetworkId",
    "networkModelRegime",
    "parasiticAssessment",
  ]);
  if (topology === null || !isNonBlankString(topology.seriesNetworkId)) {
    return failure(
      "invalid_input",
      "G-07.topology_evidence_invalid",
      "G-07 topology evidence must be an exact record with a stable seriesNetworkId.",
      "Provide only the frozen topology fields as plain data values.",
    );
  }
  if (topology.topologyId === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-07.topology_unknown",
      "G-07 does not infer a series circuit from an unknown or textual topology label.",
      "Select the stable topology_id series_rlc_single_loop from the frozen dictionary.",
    );
  }
  if (!(TOPOLOGY_IDS as readonly unknown[]).includes(topology.topologyId)) {
    return failure(
      "insufficient_data",
      "G-07.topology_unknown",
      "G-07 received no recognized controlled topology_id.",
      "Resolve the circuit to a frozen topology_id; do not guess from a diagram title.",
    );
  }
  if (topology.topologyId !== "series_rlc_single_loop") {
    return failure(
      "not_applicable",
      "G-07.topology_not_applicable",
      "G-07 is not applicable to a parallel, LLC, transformer or other non-series-RLC topology.",
      "Route the controlled topology to its own independently frozen method.",
    );
  }
  if (topology.networkModelRegime === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-07.network_model_unknown",
      "G-07 requires confirmation of an ideal lumped, linear, single-frequency network.",
      "Confirm the model regime or select a method that represents the actual distributed/switching network.",
    );
  }
  if (topology.networkModelRegime !== "ideal_lumped_linear_single_frequency") {
    if (topology.networkModelRegime !== "distributed_or_switching_or_nonlinear") {
      return failure(
        "invalid_input",
        "G-07.topology_evidence_invalid",
        "G-07 received an uncontrolled network-model regime.",
        "Use the frozen G-07 model-regime enumeration without coercion.",
      );
    }
    return failure(
      "not_applicable",
      "G-07.network_model_not_applicable",
      "G-07 does not model distributed elements, switching harmonics or nonlinear components.",
      "Use an independently approved topology-specific frequency-domain or time-domain model.",
    );
  }
  if (topology.parasiticAssessment === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-07.parasitic_assessment_unknown",
      "G-07 cannot omit parasitics without an explicit intended-use negligibility assessment.",
      "Assess capacitor ESR/ESL, interconnect and switching parasitics for the declared design state.",
    );
  }
  if (topology.parasiticAssessment !== "confirmed_negligible_for_intended_use") {
    if (topology.parasiticAssessment !== "present_or_material") {
      return failure(
        "invalid_input",
        "G-07.topology_evidence_invalid",
        "G-07 received an uncontrolled parasitic-assessment value.",
        "Use the frozen G-07 parasitic-assessment enumeration without coercion.",
      );
    }
    return failure(
      "not_applicable",
      "G-07.parasitics_not_applicable",
      "Material parasitic elements invalidate the ideal three-element G-07 network.",
      "Use a topology model that includes the identified parasitic elements.",
    );
  }

  const portResult = parsePort(controlledInput.port);
  if (!portResult.ok) {
    return portResult.failure;
  }
  const resistanceResult = parseElement(controlledInput.resistance, "resistance");
  if (!resistanceResult.ok) {
    return resistanceResult.failure;
  }
  const inductanceResult = parseElement(controlledInput.inductance, "inductance");
  if (!inductanceResult.ok) {
    return inductanceResult.failure;
  }
  const capacitanceResult = parseElement(controlledInput.capacitance, "capacitance");
  if (!capacitanceResult.ok) {
    return capacitanceResult.failure;
  }

  const port = portResult.port;
  const resistance = resistanceResult.element;
  const inductance = inductanceResult.element;
  const capacitance = capacitanceResult.element;
  const stateRoute = inductance.stateRoute;
  if (stateRoute === undefined || stateRoute === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-07.inductance_route_unknown",
      "G-07 inductance state route is unconfirmed.",
      "Declare loaded_design_state or unloaded_reference_only explicitly.",
    );
  }
  if (
    (stateRoute === "loaded_design_state" && port.loadedState === "empty") ||
    (stateRoute === "unloaded_reference_only" && port.loadedState !== "empty") ||
    (stateRoute === "loaded_design_state" &&
      inductance.loadedState === "empty") ||
    (stateRoute === "unloaded_reference_only" &&
      inductance.loadedState !== "empty")
  ) {
    return failure(
      "invalid_input",
      "G-07.inductance_route_inconsistent",
      "G-07 inductance state route contradicts the declared port intent or the inductance evidence loaded_state.",
      "Use loaded_design_state only when both the port intent and L evidence are non-empty; use unloaded_reference_only only when both are empty.",
    );
  }

  if (
    !elementMatchesStructuralBoundary(
      resistance,
      port,
      topology.seriesNetworkId,
    ) ||
    !elementMatchesStructuralBoundary(
      inductance,
      port,
      topology.seriesNetworkId,
    ) ||
    !elementMatchesStructuralBoundary(
      capacitance,
      port,
      topology.seriesNetworkId,
    )
  ) {
    return failure(
      "insufficient_data",
      "G-07.state_boundary_mismatch",
      "G-07 R, L, C and f do not share one network, port, reference plane and design-state identity.",
      "Resolve all element evidence to one declared series-tank structure after selecting a semantically consistent loaded/unloaded inductance route.",
    );
  }

  if (
    !elementMatchesBoundary(resistance, port, topology.seriesNetworkId) ||
    !elementMatchesBoundary(inductance, port, topology.seriesNetworkId) ||
    !elementMatchesBoundary(capacitance, port, topology.seriesNetworkId)
  ) {
    return failure(
      "insufficient_data",
      "G-07.state_boundary_mismatch",
      "G-07 R, L and C do not share the declared port loaded_state.",
      "Resolve every element to one loaded-state snapshot after selecting a consistent loaded/unloaded inductance route.",
    );
  }

  const resistanceOhm = resistance.valueSi;
  const inductanceH = inductance.valueSi;
  const capacitanceF = capacitance.valueSi;
  const frequencyHz = port.frequencyHz;
  const angularFrequencyRadPerS = 2 * Math.PI * frequencyHz;
  if (!isPositiveNormalBinary64(angularFrequencyRadPerS)) {
    return numericFailure("G-07 angular frequency is non-finite or not a positive normal binary64 value.");
  }

  const inductiveReactanceOhm = angularFrequencyRadPerS * inductanceH;
  if (!isPositiveNormalBinary64(inductiveReactanceOhm)) {
    return numericFailure("G-07 omega*L overflowed or underflowed the positive normal binary64 range.");
  }
  const omegaCapacitance = angularFrequencyRadPerS * capacitanceF;
  if (!isPositiveNormalBinary64(omegaCapacitance)) {
    return numericFailure("G-07 omega*C overflowed or underflowed the positive normal binary64 range.");
  }
  const capacitiveReactanceOhm = 1 / omegaCapacitance;
  if (!isPositiveNormalBinary64(capacitiveReactanceOhm)) {
    return numericFailure("G-07 1/(omega*C) is non-finite or outside the positive normal binary64 range.");
  }
  const imaginaryOhm = inductiveReactanceOhm - capacitiveReactanceOhm;
  if (
    !Number.isFinite(imaginaryOhm) ||
    (imaginaryOhm !== 0 && Math.abs(imaginaryOhm) < G07_BINARY64_MIN_NORMAL)
  ) {
    return numericFailure("G-07 reactive subtraction produced a non-finite or positive-subnormal residual.");
  }
  if (
    imaginaryOhm === inductiveReactanceOhm ||
    imaginaryOhm === -capacitiveReactanceOhm
  ) {
    return failure(
      "invalid_input",
      "G-07.reactive_term_swallowed",
      "G-07 binary64 subtraction swallowed one nonzero reactive term.",
      "Use a separately approved higher-precision path; do not report the surviving term as the full RLC reactance.",
    );
  }

  const inductanceCapacitanceProduct = inductanceH * capacitanceF;
  if (!isPositiveNormalBinary64(inductanceCapacitanceProduct)) {
    return numericFailure("G-07 L*C overflowed or underflowed the positive normal binary64 range.");
  }
  const squareRootLc = Math.sqrt(inductanceCapacitanceProduct);
  if (!isPositiveNormalBinary64(squareRootLc)) {
    return numericFailure("G-07 sqrt(L*C) is outside the positive normal binary64 range.");
  }
  const naturalFrequencyDenominator = 2 * Math.PI * squareRootLc;
  if (!isPositiveNormalBinary64(naturalFrequencyDenominator)) {
    return numericFailure("G-07 2*pi*sqrt(L*C) is outside the positive normal binary64 range.");
  }
  const naturalFrequencyHz = 1 / naturalFrequencyDenominator;
  if (!isPositiveNormalBinary64(naturalFrequencyHz)) {
    return numericFailure("G-07 f0 is non-finite or outside the positive normal binary64 range.");
  }

  const angularFrequencySquared =
    angularFrequencyRadPerS * angularFrequencyRadPerS;
  if (!isPositiveNormalBinary64(angularFrequencySquared)) {
    return numericFailure("G-07 omega^2 overflowed or underflowed the positive normal binary64 range.");
  }
  const targetCapacitanceDenominator = angularFrequencySquared * inductanceH;
  if (!isPositiveNormalBinary64(targetCapacitanceDenominator)) {
    return numericFailure("G-07 omega^2*L overflowed or underflowed the positive normal binary64 range.");
  }
  const capacitanceForFrequencyF = 1 / targetCapacitanceDenominator;
  if (!isPositiveNormalBinary64(capacitanceForFrequencyF)) {
    return numericFailure("G-07 C_for_f is non-finite or outside the positive normal binary64 range.");
  }

  const warnings: G07Warning[] = [
    Object.freeze({
      code: "G-07.parasitics_excluded_after_negligibility_confirmation",
      condition: "ideal lumped model excludes parasitic elements",
      guardedPredicateRef: PARASITICS_IGNORED_PREDICATE,
      message:
        "G-07 excludes capacitor ESR/ESL, interconnect and switching parasitics; execution was allowed only because they were explicitly assessed negligible for the intended use.",
    }),
  ];
  if (stateRoute === "unloaded_reference_only") {
    warnings.push(
      Object.freeze({
        code: "G-07.unloaded_inductance_reference_only",
        condition: "stateRoute=unloaded_reference_only and loadedState=empty",
        guardedPredicateRef: UNLOADED_L_PREDICATE,
        message:
          "The reported compensation quantities use unloaded L and are reference-only; they must not silently replace hot loaded design-state inductance.",
      }),
    );
  }

  const value = Object.freeze({
    Zs: Object.freeze({
      kind: "available",
      outputId: "Zs",
      status: "available",
      valueSi: Object.freeze({
        realOhm: resistanceOhm,
        imaginaryOhm,
      }),
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "series_rlc_input_impedance",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    }),
    f0: Object.freeze({
      kind: "available",
      outputId: "f0",
      status: "available",
      valueSi: naturalFrequencyHz,
      dimensionId: "frequency",
      canonicalUnitId: "Hz",
      interpretation: "ideal_series_lc_natural_frequency",
    }),
    C_for_f: Object.freeze({
      kind: "available",
      outputId: "C_for_f",
      status: "available",
      valueSi: capacitanceForFrequencyF,
      dimensionId: "capacitance",
      canonicalUnitId: "F",
      interpretation: "ideal_series_compensation_capacitance_for_requested_frequency",
    }),
  }) satisfies G07SeriesRlcValue;

  return Object.freeze({
    methodId: G07_METHOD_ID,
    methodVersion: G07_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze(warnings),
    value,
    equations: Object.freeze([
      "omega = 2*pi*f",
      "Z_s = R + j*(omega*L - 1/(omega*C))",
      "f_0 = 1/(2*pi*sqrt(L*C))",
      "C_for_f = 1/((2*pi*f)^2*L)",
    ]) as G07SeriesRlcSuccess["equations"],
    substitution: Object.freeze({
      resistanceOhm,
      inductanceH,
      capacitanceF,
      frequencyHz,
      angularFrequencyRadPerS,
      inductiveReactanceOhm,
      capacitiveReactanceOhm,
    }),
    inputSnapshot: Object.freeze({
      topologyId: "series_rlc_single_loop",
      seriesNetworkId: topology.seriesNetworkId,
      portId: port.portId,
      positiveTerminalId: port.positiveTerminalId,
      negativeTerminalId: port.negativeTerminalId,
      referencePlaneId: port.referencePlaneId,
      quantityBasis: port.quantityBasis,
      loadedState: port.loadedState,
      designStateId: port.designStateId,
      frequencyHz,
      phasorTimeConvention: "exp_j_omega_t",
      currentDirection: "into_passive_port",
      inductanceStateRoute: stateRoute,
      resistanceSourceSnapshotId: resistance.sourceSnapshotId,
      inductanceSourceSnapshotId: inductance.sourceSnapshotId,
      capacitanceSourceSnapshotId: capacitance.sourceSnapshotId,
    }),
    materialProperties: EMPTY_WARNINGS,
    applicabilityChecks: Object.freeze([
      "topology_id is series_rlc_single_loop",
      "port uses RMS or fundamental_rms with exp(j*omega*t) and passive current direction",
      "R, L, C and f share one network, port, reference plane, design state and loaded state",
      "network is ideal lumped, linear and single-frequency",
      "parasitics were explicitly assessed negligible for the intended use",
      "inductance loaded/unloaded route is explicit and consistent with loaded_state",
    ]) as G07SeriesRlcSuccess["applicabilityChecks"],
    solverResiduals: Object.freeze({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
      operatingReactiveResidualOhm: imaginaryOhm,
      resonanceResidualClamped: false,
    }),
    portBoundary: Object.freeze({
      topologyId: "series_rlc_single_loop",
      resultScope: "declared_series_tank_input_port",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
      excludedTopologies: Object.freeze([
        "parallel_ideal_r_l_c_branches",
        "parallel_c_with_series_rl_load",
        "llc_zjl_fig2_6_fundamental_equivalent",
        "ideal_transformer",
      ]),
      excludedEffects: Object.freeze([
        "capacitor_esr_and_esl",
        "wiring_and_busbar_parasitics",
        "switching_harmonics",
        "distributed_and_nonlinear_effects",
      ]),
    }) as G07SeriesRlcSuccess["portBoundary"],
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim: "limited_by_input_precision_and_model_applicability",
    }),
    sourceRefs: G07_SOURCE_REFS,
    contractSourceRefs: G07_CONTRACT_SOURCE_REFS,
    derivationRefs: G07_DERIVATION_REFS,
    validationCaseIds: G07_VALIDATION_CASE_IDS,
    methodCheckIds: G07_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G07_NUMERIC_REPRESENTABILITY_POLICY,
    recommendation: Object.freeze({
      eligibility: null,
      reason: SPECIFICATION.recommendationReason,
    }),
    assumptions: Object.freeze([
      "ideal lumped linear series RLC network",
      "single-frequency sinusoidal steady state",
      "R, L and C are constant at the declared design snapshot",
      "component and interconnect parasitics are excluded after an explicit negligibility assessment",
      "f0 and C_for_f are ideal compensation quantities, not converter-control or component-stress predictions",
    ]) as G07SeriesRlcSuccess["assumptions"],
  });
}
