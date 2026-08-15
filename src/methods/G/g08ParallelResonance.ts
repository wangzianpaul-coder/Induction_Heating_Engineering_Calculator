import {
  LOADED_STATES,
  QUANTITY_BASES,
  TOPOLOGY_IDS,
  type ControlledTopologyId,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-08"));

export const G08_METHOD_ID = "G-08" as const;
export const G08_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G08_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G08_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G08_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G08_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G08_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G08_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G08_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  overflowPolicy: "fail_closed" as const,
  falseZeroPolicy: "fail_closed" as const,
  swallowedNonzeroTermPolicy: "fail_closed_bidirectional" as const,
  resonanceResidualClamping: false as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G08_BINARY64_MIN_NORMAL,
});

export const G08_INTERNAL_TOPOLOGY_ROUTES = Object.freeze([
  "parallel_ideal_r_l_c_branches",
  "parallel_c_with_series_rl_load",
] as const);

export type G08InternalTopologyRoute =
  (typeof G08_INTERNAL_TOPOLOGY_ROUTES)[number];

export const G08_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  registryParentRequiresSubmethodSplit: true as const,
  registeredChildMethodIds: Object.freeze([]) as readonly [],
  internalTopologyRoutes: G08_INTERNAL_TOPOLOGY_ROUTES,
  internalTopologyRoutesAreMethodIds: false as const,
  scientificConfidence: null,
  branchQuantityPolicy:
    "available_only_with_explicit_same-port_port.voltage_rms_evidence; otherwise discriminated unavailable" as const,
  reason:
    "G-08 is a controlled parent family requiring registered child methods; no approved child method IDs exist." as const,
});

export const G08_PARALLEL_RESONANCE_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: G08_SOURCE_REFS,
  contractSourceRefs: G08_CONTRACT_SOURCE_REFS,
  derivationRefs: G08_DERIVATION_REFS,
  validationCaseIds: G08_VALIDATION_CASE_IDS,
  methodCheckIds: G08_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
  numericRepresentabilityPolicy: G08_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: G08_IMPLEMENTATION_READINESS,
});

const SERIES_LOSS_AS_PARALLEL_PREDICATE =
  "series-loss R is treated as parallel R" as const;
const NONPOSITIVE_ROOT_AS_RESONANCE_PREDICATE =
  "a nonpositive root is reported as resonance" as const;
const SERIES_STRESS_REUSED_PREDICATE =
  "series-network stress relations are reused" as const;
const PARASITICS_IGNORED_PREDICATE = "parasitics are ignored" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-08 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G08_WARNING_PREDICATES = Object.freeze({
  seriesLossTreatedAsParallel: controlledWarningPredicate(
    SERIES_LOSS_AS_PARALLEL_PREDICATE,
  ),
  nonpositiveRootReportedAsResonance: controlledWarningPredicate(
    NONPOSITIVE_ROOT_AS_RESONANCE_PREDICATE,
  ),
  seriesStressRelationsReused: controlledWarningPredicate(
    SERIES_STRESS_REUSED_PREDICATE,
  ),
  parasiticsIgnored: controlledWarningPredicate(
    PARASITICS_IGNORED_PREDICATE,
  ),
});

export type G08TopologyEvidenceId =
  | ControlledTopologyId
  | "unknown_or_unconfirmed";

export type G08ResistancePlacement =
  | "independent_parallel_resistor_branch"
  | "series_resistance_in_rl_branch"
  | "unknown_or_unconfirmed";

export type G08NetworkModelRegime =
  | "ideal_lumped_linear_single_frequency"
  | "distributed_switching_or_nonlinear"
  | "unknown_or_unconfirmed";

export type G08WaveformDefinition =
  | "approximately_sinusoidal_fundamental"
  | "known_multifrequency_or_switching"
  | "unknown_or_unconfirmed";

export type G08PhasorTimeConvention =
  | "exp_j_omega_t"
  | "known_other_convention"
  | "unknown_or_unconfirmed";

export type G08CurrentDirection =
  | "into_passive_port"
  | "known_other_direction"
  | "unknown_or_unconfirmed";

export type G08NonIdealEffectAssessment =
  | "explicitly_excluded_or_confirmed_negligible"
  | "present_or_material"
  | "unknown_or_unconfirmed";

export type G08InductanceStateRoute =
  | "loaded_design_state"
  | "unloaded_reference_only"
  | "unknown_or_unconfirmed";

export interface G08TopologyEvidence {
  readonly topologyId: G08TopologyEvidenceId;
  readonly parallelNetworkId: string;
  readonly topologySnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly resistancePlacement: G08ResistancePlacement;
  readonly networkModelRegime: G08NetworkModelRegime;
}

/**
 * Complete port/model boundary repeated by every state-bound quantity.
 * Equality is exact; no field is defaulted, normalized or tolerance-matched.
 */
export interface G08PortBoundaryEvidence {
  readonly caseSnapshotId: string;
  readonly electricalStateSnapshotId: string;
  readonly topologySnapshotId: string;
  readonly portSnapshotId: string;
  readonly topologyId: G08TopologyEvidenceId;
  readonly parallelNetworkId: string;
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly waveformDefinition: G08WaveformDefinition;
  readonly loadedState: LoadedState | "unknown_or_unconfirmed";
  readonly designStateId: string;
  readonly frequencyHz: number;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly phasorTimeConvention: G08PhasorTimeConvention;
  readonly currentDirection: G08CurrentDirection;
}

export type G08ResistanceElementRole =
  | "independent_parallel_resistor_branch"
  | "series_resistance_in_rl_branch"
  | "unknown_or_unconfirmed";

export type G08InductanceElementRole =
  | "independent_parallel_inductor_branch"
  | "series_inductance_in_rl_branch"
  | "unknown_or_unconfirmed";

export type G08CapacitanceElementRole =
  | "independent_parallel_capacitor_branch"
  | "parallel_capacitor_across_series_rl_branch"
  | "unknown_or_unconfirmed";

interface G08ElementEvidenceBase {
  readonly componentId: string;
  readonly branchId: string;
  readonly elementSnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly binding: G08PortBoundaryEvidence;
}

export interface G08ResistanceEvidence extends G08ElementEvidenceBase {
  /** Canonical-SI resistance in ohms. */
  readonly resistanceOhm: number;
  readonly elementRole: G08ResistanceElementRole;
}

export interface G08InductanceEvidence extends G08ElementEvidenceBase {
  /** Canonical-SI inductance in henries. */
  readonly inductanceH: number;
  readonly elementRole: G08InductanceElementRole;
  readonly stateRoute: G08InductanceStateRoute;
}

export interface G08CapacitanceEvidence extends G08ElementEvidenceBase {
  /** Canonical-SI capacitance in farads. */
  readonly capacitanceF: number;
  readonly elementRole: G08CapacitanceElementRole;
}

export interface G08NonIdealEffectsEvidence {
  readonly capacitorParasitics: G08NonIdealEffectAssessment;
  readonly inductorParasitics: G08NonIdealEffectAssessment;
  readonly interconnectParasitics: G08NonIdealEffectAssessment;
  readonly switchingHarmonics: G08NonIdealEffectAssessment;
  readonly unmodelledNetworkElements: G08NonIdealEffectAssessment;
  readonly assessmentSnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly binding: G08PortBoundaryEvidence;
}

export interface G08UnavailableBranchVoltageEvidence {
  readonly kind: "not_available";
  readonly reason: string;
}

export interface G08AvailableBranchVoltageEvidence {
  readonly kind: "available";
  /** Canonical-SI RMS volts; zero is a valid analytical limit. */
  readonly voltageV: number;
  readonly phaseReference:
    | "port_voltage_is_zero_angle_reference"
    | "known_other_phase_reference"
    | "unknown_or_unconfirmed";
  readonly voltageEvidenceSnapshotId: string;
  readonly sourceSnapshotId: string;
  readonly binding: G08PortBoundaryEvidence;
}

export type G08BranchVoltageEvidence =
  | G08UnavailableBranchVoltageEvidence
  | G08AvailableBranchVoltageEvidence;

export interface G08ParallelResonanceInput {
  readonly topology: G08TopologyEvidence;
  readonly port: G08PortBoundaryEvidence;
  readonly resistance: G08ResistanceEvidence;
  readonly inductance: G08InductanceEvidence;
  readonly capacitance: G08CapacitanceEvidence;
  readonly nonIdealEffects: G08NonIdealEffectsEvidence;
  readonly branchVoltage: G08BranchVoltageEvidence;
}

export interface G08ComplexAdmittanceOutput {
  readonly kind: "available";
  readonly outputId: "Yin";
  readonly status: "available";
  readonly valueSi: Readonly<{
    readonly realS: number;
    readonly imaginaryS: number;
  }>;
  readonly dimensionId: "electrical_conductance";
  readonly canonicalUnitId: "S";
  readonly interpretation: "declared_parallel_network_input_admittance";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface G08ComplexImpedanceOutput {
  readonly kind: "available";
  readonly outputId: "Zin";
  readonly status: "available";
  readonly valueSi: Readonly<{
    readonly realOhm: number;
    readonly imaginaryOhm: number;
  }>;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "declared_parallel_network_input_impedance";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface G08AvailableFrequencyOutput {
  readonly kind: "available";
  readonly outputId: "f0";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "frequency";
  readonly canonicalUnitId: "Hz";
  readonly interpretation:
    | "ideal_parallel_lc_natural_frequency"
    | "positive_parallel_series_rl_c_resonance_frequency";
}

export interface G08UnavailableFrequencyOutput {
  readonly kind: "unavailable";
  readonly outputId: "f0";
  readonly status: "no_feasible_solution";
  readonly reason: "root_squared_nonpositive_no_physical_positive_resonance";
  readonly value?: never;
  readonly evidence?: never;
}

export type G08FrequencyOutput =
  | G08AvailableFrequencyOutput
  | G08UnavailableFrequencyOutput;

export interface G08BranchPhasor {
  readonly branchId: string;
  readonly branchRole:
    | "independent_parallel_resistor_branch"
    | "independent_parallel_inductor_branch"
    | "independent_parallel_capacitor_branch"
    | "series_rl_branch"
    | "parallel_capacitor_branch";
  readonly voltage: Readonly<{
    readonly realV: number;
    readonly imaginaryV: number;
  }>;
  readonly current: Readonly<{
    readonly realA: number;
    readonly imaginaryA: number;
  }>;
}

export interface G08AvailableBranchQuantities {
  readonly kind: "available";
  readonly outputId: "branch V/I";
  readonly status: "available";
  readonly voltageParameterId: "port.voltage_rms";
  readonly voltageEvidenceSnapshotId: string;
  readonly voltageSourceSnapshotId: string;
  readonly voltagePhaseReference: "port_voltage_is_zero_angle_reference";
  readonly branches: readonly G08BranchPhasor[];
  readonly inputCurrent: Readonly<{
    readonly realA: number;
    readonly imaginaryA: number;
  }>;
  readonly inputCurrentIdentityResidual: Readonly<{
    readonly realA: number;
    readonly imaginaryA: number;
    readonly clamped: false;
  }>;
}

export interface G08UnavailableBranchQuantities {
  readonly kind: "unavailable";
  readonly outputId: "branch V/I";
  readonly status: "insufficient_data";
  readonly requiredParameterId: "port.voltage_rms";
  readonly reason:
    "explicit_same_port_rms_voltage_evidence_was_not_supplied";
  readonly value?: never;
  readonly evidence?: never;
}

export type G08BranchQuantities =
  | G08AvailableBranchQuantities
  | G08UnavailableBranchQuantities;

export interface G08ParallelResonanceValue {
  readonly Yin: G08ComplexAdmittanceOutput;
  readonly Zin: G08ComplexImpedanceOutput;
  readonly f0: G08FrequencyOutput;
  readonly "branch V/I": G08BranchQuantities;
}

export interface G08AvailableResonanceImpedance {
  readonly kind: "available";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation:
    | "parallel_ideal_resonance_impedance_equals_Rp"
    | "parallel_series_rl_c_resonance_impedance_L_over_C_Rs";
}

export interface G08UnavailableResonanceImpedance {
  readonly kind: "unavailable";
  readonly status: "no_feasible_solution";
  readonly reason: "root_squared_nonpositive_no_physical_positive_resonance";
  readonly value?: never;
  readonly evidence?: never;
}

export type G08ResonanceImpedance =
  | G08AvailableResonanceImpedance
  | G08UnavailableResonanceImpedance;

export interface G08Warning {
  /** Frozen prose predicate, not a fabricated stable warning ID. */
  readonly predicate: typeof PARASITICS_IGNORED_PREDICATE;
  readonly message: string;
}

interface G08CommonSuccess {
  readonly methodId: typeof G08_METHOD_ID;
  readonly methodVersion: typeof G08_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly runtimeActivation: "blocked_requires_registered_child_split";
  readonly availabilityStatus: "locally_available_nonpublishable_parent_result";
  readonly scientificConfidence: null;
  readonly internalTopologyRouteIsMethodId: false;
  readonly warningIds: readonly [];
  readonly warnings: readonly [G08Warning];
  readonly methodMapping: typeof G08_PARALLEL_RESONANCE_MAPPING;
  readonly value: G08ParallelResonanceValue;
  readonly inputSnapshot: Readonly<{
    readonly topologyId: G08InternalTopologyRoute;
    readonly parallelNetworkId: string;
    readonly topologySnapshotId: string;
    readonly topologySourceSnapshotId: string;
    readonly caseSnapshotId: string;
    readonly electricalStateSnapshotId: string;
    readonly portSnapshotId: string;
    readonly portId: string;
    readonly positiveTerminalId: string;
    readonly negativeTerminalId: string;
    readonly referencePlaneId: string;
    readonly quantityBasis: "rms" | "fundamental_rms";
    readonly waveformDefinition: "approximately_sinusoidal_fundamental";
    readonly loadedState: LoadedState;
    readonly designStateId: string;
    readonly frequencyHz: number;
    readonly timeBasisId: string;
    readonly measurementWindowId: string;
    readonly phasorTimeConvention: "exp_j_omega_t";
    readonly currentDirection: "into_passive_port";
    readonly resistancePlacement: Exclude<
      G08ResistancePlacement,
      "unknown_or_unconfirmed"
    >;
    readonly inductanceStateRoute: Exclude<
      G08InductanceStateRoute,
      "unknown_or_unconfirmed"
    >;
    readonly resistanceElementSnapshotId: string;
    readonly resistanceSourceSnapshotId: string;
    readonly inductanceElementSnapshotId: string;
    readonly inductanceSourceSnapshotId: string;
    readonly capacitanceElementSnapshotId: string;
    readonly capacitanceSourceSnapshotId: string;
    readonly nonIdealAssessmentSnapshotId: string;
    readonly nonIdealSourceSnapshotId: string;
    readonly branchVoltageEvidenceSnapshotId: string | null;
    readonly branchVoltageSourceSnapshotId: string | null;
  }>;
  readonly applicabilityChecks: readonly [
    "topology_id is one exact frozen G-08 internal route and is not a child method ID",
    "port uses RMS or fundamental_rms with approximately sinusoidal fundamental exp(j*omega*t) passive-sign phasors",
    "R, L, C, nonideal assessment and optional voltage evidence share exact topology, port, case, design, loaded-state, frequency, time and reference-plane identities",
    "resistance and branch placement match the selected parallel topology",
    "network is ideal lumped, linear and single-frequency",
    "parasitics, switching harmonics and unmodelled network elements were explicitly excluded or confirmed negligible",
    "inductance loaded/unloaded route is explicit and consistent with loaded_state",
    "branch quantities are published only from explicit same-port RMS voltage evidence",
  ];
  readonly portBoundary: Readonly<{
    readonly resultScope: "declared_parallel_network_input_port";
    readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
    readonly branchVoltageDefaultApplied: false;
    readonly seriesStressRelationsReused: false;
    readonly excludedEffects: readonly [
      "capacitor_esr_and_esl",
      "inductor_and_interconnect_parasitics",
      "switching_harmonics",
      "distributed_and_nonlinear_effects",
      "unmodelled_matching_or_converter_network_elements",
    ];
  }>;
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_closed_form_no_iterative_solver";
    readonly operatingSusceptanceResidualS: number;
    readonly resonanceSusceptanceResidualS: number | null;
    readonly resonanceResidualClamped: false;
  }>;
  readonly resonanceDiagnostics: Readonly<{
    readonly rootSquaredRad2PerS2: number;
    readonly positivePhysicalRootExists: boolean;
    readonly inputImpedanceAtResonance: G08ResonanceImpedance;
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim: "limited_by_input_precision_and_model_applicability";
  }>;
  readonly sourceRefs: typeof G08_SOURCE_REFS;
  readonly contractSourceRefs: typeof G08_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G08_DERIVATION_REFS;
  readonly validationCaseIds: typeof G08_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G08_METHOD_CHECK_IDS;
  readonly validationCaseIdForInternalRoute:
    | "PWR-PAR-IDEAL-001"
    | "PWR-PAR-RL-001";
  readonly numericRepresentabilityPolicy: typeof G08_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "ideal lumped linear single-frequency network",
    "single-frequency sinusoidal RMS phasors use exp(j*omega*t) and passive current direction",
    "R, L and C are constant at the declared design snapshot",
    "component and interconnect parasitics, switching harmonics and extra network elements are excluded after explicit assessment",
    "internal topology route names are discriminators only and are not approved child method IDs",
  ];
  readonly failure?: never;
}

export interface G08IdealParallelSuccess extends G08CommonSuccess {
  readonly internalTopologyRoute: "parallel_ideal_r_l_c_branches";
  readonly equations: readonly [
    "omega = 2*pi*f",
    "Y_in = 1/Rp + j*(omega*C - 1/(omega*L))",
    "Z_in = 1/Y_in",
    "f_0 = 1/(2*pi*sqrt(L*C))",
    "Z_in(f_0) = Rp",
  ];
  readonly substitution: Readonly<{
    readonly resistancePlacement: "independent_parallel_resistor_branch";
    readonly resistanceOhm: number;
    readonly inductanceH: number;
    readonly capacitanceF: number;
    readonly frequencyHz: number;
    readonly angularFrequencyRadPerS: number;
    readonly conductanceS: number;
    readonly capacitiveSusceptanceS: number;
    readonly inductiveSusceptanceMagnitudeS: number;
    readonly netSusceptanceS: number;
  }>;
}

export interface G08SeriesRlParallelSuccess extends G08CommonSuccess {
  readonly internalTopologyRoute: "parallel_c_with_series_rl_load";
  readonly equations: readonly [
    "omega = 2*pi*f",
    "Y_in = 1/(Rs + j*omega*L) + j*omega*C",
    "Y_in = Rs/(Rs^2 + (omega*L)^2) + j*(omega*C - omega*L/(Rs^2 + (omega*L)^2))",
    "Z_in = 1/Y_in",
    "omega_0^2 = 1/(L*C) - (Rs/L)^2",
    "positive omega_0 only; Z_in(f_0) = L/(C*Rs)",
  ];
  readonly substitution: Readonly<{
    readonly resistancePlacement: "series_resistance_in_rl_branch";
    readonly resistanceOhm: number;
    readonly inductanceH: number;
    readonly capacitanceF: number;
    readonly frequencyHz: number;
    readonly angularFrequencyRadPerS: number;
    readonly angularFrequencyTimesInductanceOhm: number;
    readonly seriesRlMagnitudeSquaredOhm2: number;
    readonly conductanceS: number;
    readonly capacitiveSusceptanceS: number;
    readonly inductiveSusceptanceMagnitudeS: number;
    readonly netSusceptanceS: number;
  }>;
}

export type G08ParallelResonanceSuccess =
  | G08IdealParallelSuccess
  | G08SeriesRlParallelSuccess;

export type G08FailureCode =
  | "G-08.input_schema_invalid"
  | "G-08.topology_evidence_missing"
  | "G-08.topology_evidence_invalid"
  | "G-08.port_evidence_missing"
  | "G-08.port_evidence_invalid"
  | "G-08.resistance_evidence_missing"
  | "G-08.resistance_evidence_invalid"
  | "G-08.inductance_evidence_missing"
  | "G-08.inductance_evidence_invalid"
  | "G-08.capacitance_evidence_missing"
  | "G-08.capacitance_evidence_invalid"
  | "G-08.nonideal_evidence_missing"
  | "G-08.nonideal_evidence_invalid"
  | "G-08.branch_voltage_evidence_missing"
  | "G-08.branch_voltage_evidence_invalid"
  | "G-08.topology_unknown"
  | "G-08.topology_not_applicable"
  | "G-08.network_model_unknown"
  | "G-08.network_model_not_applicable"
  | "G-08.nonideal_effects_unknown"
  | "G-08.nonideal_effects_not_applicable"
  | "G-08.port_basis_unknown"
  | "G-08.port_basis_not_applicable"
  | "G-08.waveform_unknown"
  | "G-08.waveform_not_applicable"
  | "G-08.phasor_convention_unknown"
  | "G-08.phasor_convention_not_applicable"
  | "G-08.current_direction_unknown"
  | "G-08.current_direction_not_applicable"
  | "G-08.loaded_state_unknown"
  | "G-08.resistance_placement_unknown"
  | "G-08.element_role_unknown"
  | "G-08.topology_element_role_inconsistent"
  | "G-08.inductance_route_unknown"
  | "G-08.inductance_route_inconsistent"
  | "G-08.state_boundary_unknown"
  | "G-08.state_boundary_mismatch"
  | "G-08.branch_voltage_phase_unknown"
  | "G-08.branch_voltage_phase_not_applicable"
  | "G-08.branch_topology_inconsistent"
  | "G-08.numeric_resolution_invalid"
  | "G-08.nonzero_term_swallowed"
  | "G-08.false_zero_cancellation";

export interface G08ParallelResonanceFailure {
  readonly methodId: typeof G08_METHOD_ID;
  readonly methodVersion: typeof G08_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly runtimeActivation: "blocked_requires_registered_child_split";
  readonly availabilityStatus: "unavailable";
  readonly scientificConfidence: null;
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly methodMapping: typeof G08_PARALLEL_RESONANCE_MAPPING;
  readonly failure: Readonly<{
    readonly code: G08FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly equations?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
  readonly solverResiduals?: never;
  readonly resonanceDiagnostics?: never;
}

export type G08ParallelResonanceOutcome =
  | G08ParallelResonanceSuccess
  | G08ParallelResonanceFailure;

const EMPTY_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;

function failure(
  status: G08ParallelResonanceFailure["status"],
  code: G08FailureCode,
  message: string,
  action: string,
): G08ParallelResonanceFailure {
  return Object.freeze({
    methodId: G08_METHOD_ID,
    methodVersion: G08_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    runtimeActivation: "blocked_requires_registered_child_split",
    availabilityStatus: "unavailable",
    scientificConfidence: null,
    warningIds: EMPTY_IDS,
    warnings: EMPTY_WARNINGS,
    methodMapping: G08_PARALLEL_RESONANCE_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= G08_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormal(value: number): boolean {
  return value === 0 || isPositiveNormal(value);
}

type ParsedResult<T> =
  | Readonly<{ readonly ok: true; readonly value: T }>
  | Readonly<{
      readonly ok: false;
      readonly failure: G08ParallelResonanceFailure;
    }>;

const TOPOLOGY_EVIDENCE_IDS = Object.freeze([
  ...TOPOLOGY_IDS,
  "unknown_or_unconfirmed",
] as const);
const RESISTANCE_PLACEMENTS = Object.freeze([
  "independent_parallel_resistor_branch",
  "series_resistance_in_rl_branch",
  "unknown_or_unconfirmed",
] as const);
const NETWORK_MODEL_REGIMES = Object.freeze([
  "ideal_lumped_linear_single_frequency",
  "distributed_switching_or_nonlinear",
  "unknown_or_unconfirmed",
] as const);
const WAVEFORM_DEFINITIONS = Object.freeze([
  "approximately_sinusoidal_fundamental",
  "known_multifrequency_or_switching",
  "unknown_or_unconfirmed",
] as const);
const PHASOR_TIME_CONVENTIONS = Object.freeze([
  "exp_j_omega_t",
  "known_other_convention",
  "unknown_or_unconfirmed",
] as const);
const CURRENT_DIRECTIONS = Object.freeze([
  "into_passive_port",
  "known_other_direction",
  "unknown_or_unconfirmed",
] as const);
const NONIDEAL_ASSESSMENTS = Object.freeze([
  "explicitly_excluded_or_confirmed_negligible",
  "present_or_material",
  "unknown_or_unconfirmed",
] as const);
const INDUCTANCE_STATE_ROUTES = Object.freeze([
  "loaded_design_state",
  "unloaded_reference_only",
  "unknown_or_unconfirmed",
] as const);
const RESISTANCE_ELEMENT_ROLES = RESISTANCE_PLACEMENTS;
const INDUCTANCE_ELEMENT_ROLES = Object.freeze([
  "independent_parallel_inductor_branch",
  "series_inductance_in_rl_branch",
  "unknown_or_unconfirmed",
] as const);
const CAPACITANCE_ELEMENT_ROLES = Object.freeze([
  "independent_parallel_capacitor_branch",
  "parallel_capacitor_across_series_rl_branch",
  "unknown_or_unconfirmed",
] as const);

function parseTopology(value: unknown): ParsedResult<G08TopologyEvidence> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.topology_evidence_missing",
        "G-08 requires an explicit controlled parallel topology and topology snapshot.",
        "Provide one exact frozen G-08 topology_id and its network/source identities.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "topologyId",
    "parallelNetworkId",
    "topologySnapshotId",
    "sourceSnapshotId",
    "resistancePlacement",
    "networkModelRegime",
  ]);
  if (
    record === null ||
    !(TOPOLOGY_EVIDENCE_IDS as readonly unknown[]).includes(record.topologyId) ||
    !isStableIdentifier(record.parallelNetworkId) ||
    !isStableIdentifier(record.topologySnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId) ||
    !(RESISTANCE_PLACEMENTS as readonly unknown[]).includes(
      record.resistancePlacement,
    ) ||
    !(NETWORK_MODEL_REGIMES as readonly unknown[]).includes(
      record.networkModelRegime,
    )
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.topology_evidence_invalid",
        "G-08 topology evidence is not an exact controlled plain-data record or contains an uncontrolled value.",
        "Use the frozen topology, resistance-placement and model-regime enumerations without coercion or extra fields.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      topologyId: record.topologyId as G08TopologyEvidenceId,
      parallelNetworkId: record.parallelNetworkId,
      topologySnapshotId: record.topologySnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      resistancePlacement: record.resistancePlacement as G08ResistancePlacement,
      networkModelRegime: record.networkModelRegime as G08NetworkModelRegime,
    }),
  };
}

const BOUNDARY_KEYS = Object.freeze([
  "caseSnapshotId",
  "electricalStateSnapshotId",
  "topologySnapshotId",
  "portSnapshotId",
  "topologyId",
  "parallelNetworkId",
  "portId",
  "positiveTerminalId",
  "negativeTerminalId",
  "referencePlaneId",
  "quantityBasis",
  "waveformDefinition",
  "loadedState",
  "designStateId",
  "frequencyHz",
  "timeBasisId",
  "measurementWindowId",
  "phasorTimeConvention",
  "currentDirection",
] as const);

function parseBoundary(
  value: unknown,
  missingCode: G08FailureCode,
  invalidCode: G08FailureCode,
  label: string,
): ParsedResult<G08PortBoundaryEvidence> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        missingCode,
        `${label} is missing its complete G-08 port/state boundary.`,
        "Provide the complete case, topology, port, reference-plane, RMS, state, frequency and time-window identity.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, BOUNDARY_KEYS);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.electricalStateSnapshotId) ||
    !isStableIdentifier(record.topologySnapshotId) ||
    !isStableIdentifier(record.portSnapshotId) ||
    !(TOPOLOGY_EVIDENCE_IDS as readonly unknown[]).includes(record.topologyId) ||
    !isStableIdentifier(record.parallelNetworkId) ||
    !isStableIdentifier(record.portId) ||
    !isStableIdentifier(record.positiveTerminalId) ||
    !isStableIdentifier(record.negativeTerminalId) ||
    record.positiveTerminalId === record.negativeTerminalId ||
    !isStableIdentifier(record.referencePlaneId) ||
    !(
      (QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis) ||
      record.quantityBasis === "unknown_or_unconfirmed"
    ) ||
    !(WAVEFORM_DEFINITIONS as readonly unknown[]).includes(
      record.waveformDefinition,
    ) ||
    !(
      (LOADED_STATES as readonly unknown[]).includes(record.loadedState) ||
      record.loadedState === "unknown_or_unconfirmed"
    ) ||
    !isStableIdentifier(record.designStateId) ||
    typeof record.frequencyHz !== "number" ||
    !isPositiveNormal(record.frequencyHz) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !(PHASOR_TIME_CONVENTIONS as readonly unknown[]).includes(
      record.phasorTimeConvention,
    ) ||
    !(CURRENT_DIRECTIONS as readonly unknown[]).includes(
      record.currentDirection,
    )
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        invalidCode,
        `${label} is not an exact controlled boundary or contains an invalid identifier, enum or canonical-SI frequency.`,
        "Use a content-addressed case snapshot, stable IDs, distinct terminals, positive normal SI frequency and only frozen enumerations.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      electricalStateSnapshotId: record.electricalStateSnapshotId,
      topologySnapshotId: record.topologySnapshotId,
      portSnapshotId: record.portSnapshotId,
      topologyId: record.topologyId as G08TopologyEvidenceId,
      parallelNetworkId: record.parallelNetworkId,
      portId: record.portId,
      positiveTerminalId: record.positiveTerminalId,
      negativeTerminalId: record.negativeTerminalId,
      referencePlaneId: record.referencePlaneId,
      quantityBasis: record.quantityBasis as
        | QuantityBasis
        | "unknown_or_unconfirmed",
      waveformDefinition: record.waveformDefinition as G08WaveformDefinition,
      loadedState: record.loadedState as
        | LoadedState
        | "unknown_or_unconfirmed",
      designStateId: record.designStateId,
      frequencyHz: record.frequencyHz,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      phasorTimeConvention:
        record.phasorTimeConvention as G08PhasorTimeConvention,
      currentDirection: record.currentDirection as G08CurrentDirection,
    }),
  };
}

type ParsedResistance = Readonly<G08ResistanceEvidence>;
type ParsedInductance = Readonly<G08InductanceEvidence>;
type ParsedCapacitance = Readonly<G08CapacitanceEvidence>;

function parseResistance(value: unknown): ParsedResult<ParsedResistance> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.resistance_evidence_missing",
        "G-08 requires explicit resistance evidence and placement.",
        "Provide positive canonical-SI R with component, branch, snapshot and full boundary identities.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "resistanceOhm",
    "componentId",
    "branchId",
    "elementRole",
    "elementSnapshotId",
    "sourceSnapshotId",
    "binding",
  ]);
  if (
    record === null ||
    typeof record.resistanceOhm !== "number" ||
    !isPositiveNormal(record.resistanceOhm) ||
    !isStableIdentifier(record.componentId) ||
    !isStableIdentifier(record.branchId) ||
    !(RESISTANCE_ELEMENT_ROLES as readonly unknown[]).includes(
      record.elementRole,
    ) ||
    !isStableIdentifier(record.elementSnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.resistance_evidence_invalid",
        "G-08 resistance evidence is not exact, positive-normal canonical SI, or uses an uncontrolled role/identity.",
        "Provide a positive normal resistance in ohms and only the frozen resistance-role fields.",
      ),
    };
  }
  const binding = parseBoundary(
    record.binding,
    "G-08.resistance_evidence_missing",
    "G-08.resistance_evidence_invalid",
    "G-08 resistance evidence",
  );
  if (!binding.ok) {
    return binding;
  }
  return {
    ok: true,
    value: Object.freeze({
      resistanceOhm: record.resistanceOhm,
      componentId: record.componentId,
      branchId: record.branchId,
      elementRole: record.elementRole as G08ResistanceElementRole,
      elementSnapshotId: record.elementSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  };
}

function parseInductance(value: unknown): ParsedResult<ParsedInductance> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.inductance_evidence_missing",
        "G-08 requires explicit inductance evidence and its loaded/unloaded route.",
        "Provide positive canonical-SI L with component, branch, state route, snapshots and full boundary identities.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "inductanceH",
    "componentId",
    "branchId",
    "elementRole",
    "stateRoute",
    "elementSnapshotId",
    "sourceSnapshotId",
    "binding",
  ]);
  if (
    record === null ||
    typeof record.inductanceH !== "number" ||
    !isPositiveNormal(record.inductanceH) ||
    !isStableIdentifier(record.componentId) ||
    !isStableIdentifier(record.branchId) ||
    !(INDUCTANCE_ELEMENT_ROLES as readonly unknown[]).includes(
      record.elementRole,
    ) ||
    !(INDUCTANCE_STATE_ROUTES as readonly unknown[]).includes(
      record.stateRoute,
    ) ||
    !isStableIdentifier(record.elementSnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.inductance_evidence_invalid",
        "G-08 inductance evidence is not exact, positive-normal canonical SI, or uses an uncontrolled role/state route.",
        "Provide a positive normal inductance in henries and only frozen role/state-route fields.",
      ),
    };
  }
  const binding = parseBoundary(
    record.binding,
    "G-08.inductance_evidence_missing",
    "G-08.inductance_evidence_invalid",
    "G-08 inductance evidence",
  );
  if (!binding.ok) {
    return binding;
  }
  return {
    ok: true,
    value: Object.freeze({
      inductanceH: record.inductanceH,
      componentId: record.componentId,
      branchId: record.branchId,
      elementRole: record.elementRole as G08InductanceElementRole,
      stateRoute: record.stateRoute as G08InductanceStateRoute,
      elementSnapshotId: record.elementSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  };
}

function parseCapacitance(value: unknown): ParsedResult<ParsedCapacitance> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.capacitance_evidence_missing",
        "G-08 requires explicit capacitance evidence and branch placement.",
        "Provide positive canonical-SI C with component, branch, snapshots and full boundary identities.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "capacitanceF",
    "componentId",
    "branchId",
    "elementRole",
    "elementSnapshotId",
    "sourceSnapshotId",
    "binding",
  ]);
  if (
    record === null ||
    typeof record.capacitanceF !== "number" ||
    !isPositiveNormal(record.capacitanceF) ||
    !isStableIdentifier(record.componentId) ||
    !isStableIdentifier(record.branchId) ||
    !(CAPACITANCE_ELEMENT_ROLES as readonly unknown[]).includes(
      record.elementRole,
    ) ||
    !isStableIdentifier(record.elementSnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.capacitance_evidence_invalid",
        "G-08 capacitance evidence is not exact, positive-normal canonical SI, or uses an uncontrolled role/identity.",
        "Provide a positive normal capacitance in farads and only the frozen capacitance-role fields.",
      ),
    };
  }
  const binding = parseBoundary(
    record.binding,
    "G-08.capacitance_evidence_missing",
    "G-08.capacitance_evidence_invalid",
    "G-08 capacitance evidence",
  );
  if (!binding.ok) {
    return binding;
  }
  return {
    ok: true,
    value: Object.freeze({
      capacitanceF: record.capacitanceF,
      componentId: record.componentId,
      branchId: record.branchId,
      elementRole: record.elementRole as G08CapacitanceElementRole,
      elementSnapshotId: record.elementSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  };
}

function parseNonIdealEffects(
  value: unknown,
): ParsedResult<G08NonIdealEffectsEvidence> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.nonideal_evidence_missing",
        "G-08 requires explicit parasitic, switching-harmonic and extra-network assessments.",
        "Provide all five nonideal-effect assessments at the same controlled boundary.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "capacitorParasitics",
    "inductorParasitics",
    "interconnectParasitics",
    "switchingHarmonics",
    "unmodelledNetworkElements",
    "assessmentSnapshotId",
    "sourceSnapshotId",
    "binding",
  ]);
  if (
    record === null ||
    !(
      [
        record.capacitorParasitics,
        record.inductorParasitics,
        record.interconnectParasitics,
        record.switchingHarmonics,
        record.unmodelledNetworkElements,
      ] as readonly unknown[]
    ).every((item) =>
      (NONIDEAL_ASSESSMENTS as readonly unknown[]).includes(item),
    ) ||
    !isStableIdentifier(record.assessmentSnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.nonideal_evidence_invalid",
        "G-08 nonideal evidence is not an exact record or contains an uncontrolled assessment/identity.",
        "Use only explicit exclusion, known presence, or unknown for every frozen nonideal-effect field.",
      ),
    };
  }
  const binding = parseBoundary(
    record.binding,
    "G-08.nonideal_evidence_missing",
    "G-08.nonideal_evidence_invalid",
    "G-08 nonideal evidence",
  );
  if (!binding.ok) {
    return binding;
  }
  return {
    ok: true,
    value: Object.freeze({
      capacitorParasitics:
        record.capacitorParasitics as G08NonIdealEffectAssessment,
      inductorParasitics:
        record.inductorParasitics as G08NonIdealEffectAssessment,
      interconnectParasitics:
        record.interconnectParasitics as G08NonIdealEffectAssessment,
      switchingHarmonics:
        record.switchingHarmonics as G08NonIdealEffectAssessment,
      unmodelledNetworkElements:
        record.unmodelledNetworkElements as G08NonIdealEffectAssessment,
      assessmentSnapshotId: record.assessmentSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  };
}

function parseBranchVoltage(
  value: unknown,
): ParsedResult<G08BranchVoltageEvidence> {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-08.branch_voltage_evidence_missing",
        "G-08 requires an explicit available/not-available branch-voltage evidence discriminator.",
        "Provide controlled same-port RMS voltage evidence or explicitly state why it is not available.",
      ),
    };
  }
  const unavailable = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (unavailable !== null && unavailable.kind === "not_available") {
    if (!isStableIdentifier(unavailable.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-08.branch_voltage_evidence_invalid",
          "An unavailable G-08 branch-voltage record requires a stable non-blank reason.",
          "State why port.voltage_rms evidence is unavailable; no branch value will be defaulted.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "not_available",
        reason: unavailable.reason,
      }),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "voltageV",
    "phaseReference",
    "voltageEvidenceSnapshotId",
    "sourceSnapshotId",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    typeof record.voltageV !== "number" ||
    !isZeroOrPositiveNormal(record.voltageV) ||
    !(
      [
        "port_voltage_is_zero_angle_reference",
        "known_other_phase_reference",
        "unknown_or_unconfirmed",
      ] as readonly unknown[]
    ).includes(record.phaseReference) ||
    !isStableIdentifier(record.voltageEvidenceSnapshotId) ||
    !isStableIdentifier(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-08.branch_voltage_evidence_invalid",
        "G-08 branch-voltage evidence is not an exact available/not-available record or contains an invalid SI value/identity.",
        "Use a nonnegative normal-or-zero RMS voltage, an explicit phase reference and stable evidence/source snapshots.",
      ),
    };
  }
  const binding = parseBoundary(
    record.binding,
    "G-08.branch_voltage_evidence_missing",
    "G-08.branch_voltage_evidence_invalid",
    "G-08 branch-voltage evidence",
  );
  if (!binding.ok) {
    return binding;
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      voltageV: record.voltageV,
      phaseReference: record.phaseReference as G08AvailableBranchVoltageEvidence["phaseReference"],
      voltageEvidenceSnapshotId: record.voltageEvidenceSnapshotId,
      sourceSnapshotId: record.sourceSnapshotId,
      binding: binding.value,
    }),
  };
}

function sameBoundary(
  left: G08PortBoundaryEvidence,
  right: G08PortBoundaryEvidence,
): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.electricalStateSnapshotId === right.electricalStateSnapshotId &&
    left.topologySnapshotId === right.topologySnapshotId &&
    left.portSnapshotId === right.portSnapshotId &&
    left.topologyId === right.topologyId &&
    left.parallelNetworkId === right.parallelNetworkId &&
    left.portId === right.portId &&
    left.positiveTerminalId === right.positiveTerminalId &&
    left.negativeTerminalId === right.negativeTerminalId &&
    left.referencePlaneId === right.referencePlaneId &&
    left.quantityBasis === right.quantityBasis &&
    left.waveformDefinition === right.waveformDefinition &&
    left.loadedState === right.loadedState &&
    left.designStateId === right.designStateId &&
    left.frequencyHz === right.frequencyHz &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.phasorTimeConvention === right.phasorTimeConvention &&
    left.currentDirection === right.currentDirection
  );
}

function boundaryHasUnknown(boundary: G08PortBoundaryEvidence): boolean {
  return (
    boundary.topologyId === "unknown_or_unconfirmed" ||
    boundary.quantityBasis === "unknown_or_unconfirmed" ||
    boundary.waveformDefinition === "unknown_or_unconfirmed" ||
    boundary.loadedState === "unknown_or_unconfirmed" ||
    boundary.phasorTimeConvention === "unknown_or_unconfirmed" ||
    boundary.currentDirection === "unknown_or_unconfirmed"
  );
}

function boundaryHasKnownOutOfDomain(
  boundary: G08PortBoundaryEvidence,
):
  | "topology"
  | "basis"
  | "waveform"
  | "phasor"
  | "current"
  | null {
  if (
    boundary.topologyId !== "unknown_or_unconfirmed" &&
    !(G08_INTERNAL_TOPOLOGY_ROUTES as readonly unknown[]).includes(
      boundary.topologyId,
    )
  ) {
    return "topology";
  }
  if (
    boundary.quantityBasis !== "unknown_or_unconfirmed" &&
    boundary.quantityBasis !== "rms" &&
    boundary.quantityBasis !== "fundamental_rms"
  ) {
    return "basis";
  }
  if (boundary.waveformDefinition === "known_multifrequency_or_switching") {
    return "waveform";
  }
  if (boundary.phasorTimeConvention === "known_other_convention") {
    return "phasor";
  }
  if (boundary.currentDirection === "known_other_direction") {
    return "current";
  }
  return null;
}

type NumericResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: G08ParallelResonanceFailure;
    }>;

function numericFailure(message: string): G08ParallelResonanceFailure {
  return failure(
    "invalid_input",
    "G-08.numeric_resolution_invalid",
    message,
    "Use finite representable canonical-SI values or an independently approved higher-precision path; do not clamp, rescale or rearrange the frozen equation silently.",
  );
}

function swallowedFailure(operation: string): G08ParallelResonanceFailure {
  return failure(
    "invalid_input",
    "G-08.nonzero_term_swallowed",
    `G-08 binary64 ${operation} swallowed a nonzero non-unit operand.`,
    "Use an independently approved higher-precision path; do not publish the surviving operand as the complete frozen expression.",
  );
}

function falseZeroFailure(operation: string): G08ParallelResonanceFailure {
  return failure(
    "invalid_input",
    "G-08.false_zero_cancellation",
    `G-08 binary64 ${operation} produced zero without exact opposite/equal operands.`,
    "Use an independently approved higher-precision path; do not label a rounding-created zero as resonance.",
  );
}

function guardedPositiveMultiply(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const value = left * right;
  if (!isPositiveNormal(value)) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} overflowed, underflowed or became positive-subnormal.`,
      ),
    };
  }
  if (
    (right !== 1 && value === left) ||
    (left !== 1 && value === right)
  ) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value };
}

function guardedNonnegativeMultiply(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  if (left === 0 || right === 0) {
    return { ok: true, value: 0 };
  }
  return guardedPositiveMultiply(left, right, operation);
}

function guardedPositiveReciprocal(
  denominator: number,
  operation: string,
): NumericResult {
  const value = 1 / denominator;
  if (!isPositiveNormal(value)) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} is non-finite, underflowed or became positive-subnormal.`,
      ),
    };
  }
  if (
    denominator !== 1 &&
    (value === denominator || value === 1)
  ) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value };
}

function guardedPositiveDivide(
  numerator: number,
  denominator: number,
  operation: string,
): NumericResult {
  const value = numerator / denominator;
  if (!isPositiveNormal(value)) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} is non-finite, underflowed or became positive-subnormal.`,
      ),
    };
  }
  if (denominator !== 1 && value === numerator) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  const reciprocal = 1 / denominator;
  if (numerator !== 1 && Number.isFinite(reciprocal) && value === reciprocal) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value };
}

function guardedSignedDivide(
  numerator: number,
  denominator: number,
  operation: string,
): NumericResult {
  if (numerator === 0) {
    return { ok: true, value: 0 };
  }
  const value = numerator / denominator;
  if (!Number.isFinite(value) || Math.abs(value) < G08_BINARY64_MIN_NORMAL) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} is non-finite, underflowed or became subnormal.`,
      ),
    };
  }
  if (denominator !== 1 && value === numerator) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  const reciprocal = 1 / denominator;
  if (
    Math.abs(numerator) !== 1 &&
    Number.isFinite(reciprocal) &&
    Math.abs(value) === reciprocal
  ) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

function guardedNonnegativeAdd(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const value = left + right;
  if (!isPositiveNormal(value)) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} is non-finite, underflowed or became positive-subnormal.`,
      ),
    };
  }
  if (
    (right !== 0 && value === left) ||
    (left !== 0 && value === right)
  ) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value };
}

function guardedSignedSubtract(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const value = left - right;
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      failure: numericFailure(`G-08 ${operation} became non-finite.`),
    };
  }
  if (value !== 0 && Math.abs(value) < G08_BINARY64_MIN_NORMAL) {
    return {
      ok: false,
      failure: numericFailure(`G-08 ${operation} became subnormal.`),
    };
  }
  if (value === 0 && left !== right) {
    return { ok: false, failure: falseZeroFailure(operation) };
  }
  if (
    (right !== 0 && value === left) ||
    (left !== 0 && value === -right)
  ) {
    return { ok: false, failure: swallowedFailure(operation) };
  }
  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}

function guardedPositiveSquare(value: number, operation: string): NumericResult {
  return guardedPositiveMultiply(value, value, operation);
}

function guardedNonnegativeSquare(
  value: number,
  operation: string,
): NumericResult {
  return value === 0
    ? { ok: true, value: 0 }
    : guardedPositiveSquare(Math.abs(value), operation);
}

function guardedPositiveSqrt(value: number, operation: string): NumericResult {
  const result = Math.sqrt(value);
  if (!isPositiveNormal(result)) {
    return {
      ok: false,
      failure: numericFailure(
        `G-08 ${operation} is non-finite, underflowed or became positive-subnormal.`,
      ),
    };
  }
  return { ok: true, value: result };
}

interface AdmittanceAndImpedance {
  readonly conductanceS: number;
  readonly susceptanceS: number;
  readonly impedanceRealOhm: number;
  readonly impedanceImaginaryOhm: number;
}

function reciprocalComplexAdmittance(
  conductanceS: number,
  susceptanceS: number,
): ParsedResult<AdmittanceAndImpedance> {
  const conductanceSquared = guardedPositiveSquare(
    conductanceS,
    "conductance squared",
  );
  if (!conductanceSquared.ok) {
    return conductanceSquared;
  }
  const susceptanceSquared = guardedNonnegativeSquare(
    susceptanceS,
    "susceptance squared",
  );
  if (!susceptanceSquared.ok) {
    return susceptanceSquared;
  }
  /*
   * A rounded validation capacitance can leave a real, very small B.  B must
   * remain visible in Yin and in the numerator of Im(Zin), even when B^2 is
   * below one ulp of G^2 in the direct rectangular reciprocal denominator.
   * Treating that specified binary64 sum as a fatal swallowed *source term*
   * would incorrectly erase the controlled residual or make both central
   * cases non-executable.  The primary G and B terms are guarded before this
   * point and both remain explicit in the reciprocal components.
   */
  const magnitudeSquaredValue =
    conductanceSquared.value + susceptanceSquared.value;
  if (!isPositiveNormal(magnitudeSquaredValue)) {
    return {
      ok: false,
      failure: numericFailure(
        "G-08 admittance magnitude-squared sum overflowed, underflowed or became positive-subnormal.",
      ),
    };
  }
  const impedanceReal = guardedPositiveDivide(
    conductanceS,
    magnitudeSquaredValue,
    "real impedance reciprocal",
  );
  if (!impedanceReal.ok) {
    return impedanceReal;
  }
  const impedanceImaginary = guardedSignedDivide(
    -susceptanceS,
    magnitudeSquaredValue,
    "imaginary impedance reciprocal",
  );
  if (!impedanceImaginary.ok) {
    return impedanceImaginary;
  }
  return {
    ok: true,
    value: Object.freeze({
      conductanceS,
      susceptanceS,
      impedanceRealOhm: impedanceReal.value,
      impedanceImaginaryOhm: impedanceImaginary.value,
    }),
  };
}

interface CommonCircuitTerms {
  readonly angularFrequencyRadPerS: number;
  readonly angularFrequencyTimesInductanceOhm: number;
  readonly capacitiveSusceptanceS: number;
  readonly inductanceCapacitanceProduct: number;
}

function commonCircuitTerms(
  frequencyHz: number,
  inductanceH: number,
  capacitanceF: number,
): ParsedResult<CommonCircuitTerms> {
  const angularFrequency = guardedPositiveMultiply(
    2 * Math.PI,
    frequencyHz,
    "omega=2*pi*f",
  );
  if (!angularFrequency.ok) {
    return angularFrequency;
  }
  const omegaL = guardedPositiveMultiply(
    angularFrequency.value,
    inductanceH,
    "omega*L",
  );
  if (!omegaL.ok) {
    return omegaL;
  }
  const omegaC = guardedPositiveMultiply(
    angularFrequency.value,
    capacitanceF,
    "omega*C",
  );
  if (!omegaC.ok) {
    return omegaC;
  }
  const lc = guardedPositiveMultiply(
    inductanceH,
    capacitanceF,
    "L*C",
  );
  if (!lc.ok) {
    return lc;
  }
  return {
    ok: true,
    value: Object.freeze({
      angularFrequencyRadPerS: angularFrequency.value,
      angularFrequencyTimesInductanceOhm: omegaL.value,
      capacitiveSusceptanceS: omegaC.value,
      inductanceCapacitanceProduct: lc.value,
    }),
  };
}

function branchUnavailable(): G08UnavailableBranchQuantities {
  return Object.freeze({
    kind: "unavailable",
    outputId: "branch V/I",
    status: "insufficient_data",
    requiredParameterId: "port.voltage_rms",
    reason: "explicit_same_port_rms_voltage_evidence_was_not_supplied",
  });
}

interface BranchCalculationTerms {
  readonly voltageV: number;
  readonly conductanceS: number;
  readonly capacitiveSusceptanceS: number;
  readonly inductiveSusceptanceMagnitudeS: number;
  readonly netSusceptanceS: number;
}

function branchScalarProduct(
  voltageV: number,
  admittanceMagnitude: number,
  operation: string,
): NumericResult {
  return guardedNonnegativeMultiply(voltageV, admittanceMagnitude, operation);
}

function branchIdentityResidual(
  branchCurrentRealA: number,
  branchCurrentImaginaryA: number,
  portCurrentRealA: number,
  portCurrentImaginaryA: number,
): ParsedResult<Readonly<{ readonly realA: number; readonly imaginaryA: number }>> {
  const realResidual = guardedSignedSubtract(
    branchCurrentRealA,
    portCurrentRealA,
    "branch/input real-current identity residual",
  );
  if (!realResidual.ok) {
    return realResidual;
  }
  const imaginaryResidual = guardedSignedSubtract(
    branchCurrentImaginaryA,
    portCurrentImaginaryA,
    "branch/input imaginary-current identity residual",
  );
  if (!imaginaryResidual.ok) {
    return imaginaryResidual;
  }
  return {
    ok: true,
    value: Object.freeze({
      realA: realResidual.value,
      imaginaryA: imaginaryResidual.value,
    }),
  };
}

function idealBranchQuantities(
  voltage: G08AvailableBranchVoltageEvidence,
  resistance: ParsedResistance,
  inductance: ParsedInductance,
  capacitance: ParsedCapacitance,
  terms: BranchCalculationTerms,
): ParsedResult<G08AvailableBranchQuantities> {
  const resistorCurrent = branchScalarProduct(
    terms.voltageV,
    terms.conductanceS,
    "V*(1/Rp) resistor-branch current",
  );
  if (!resistorCurrent.ok) {
    return resistorCurrent;
  }
  const inductorCurrent = branchScalarProduct(
    terms.voltageV,
    terms.inductiveSusceptanceMagnitudeS,
    "V*(1/(omega*L)) inductor-branch current",
  );
  if (!inductorCurrent.ok) {
    return inductorCurrent;
  }
  const capacitorCurrent = branchScalarProduct(
    terms.voltageV,
    terms.capacitiveSusceptanceS,
    "V*(omega*C) capacitor-branch current",
  );
  if (!capacitorCurrent.ok) {
    return capacitorCurrent;
  }
  const branchImaginary = guardedSignedSubtract(
    capacitorCurrent.value,
    inductorCurrent.value,
    "capacitor-minus-inductor branch-current sum",
  );
  if (!branchImaginary.ok) {
    return branchImaginary;
  }
  const portReal = branchScalarProduct(
    terms.voltageV,
    terms.conductanceS,
    "V*Re(Yin) input current",
  );
  if (!portReal.ok) {
    return portReal;
  }
  const portImaginary =
    terms.netSusceptanceS === 0
      ? ({ ok: true, value: 0 } as const)
      : guardedSignedDivide(
          terms.voltageV * terms.netSusceptanceS,
          1,
          "V*Im(Yin) input current",
        );
  if (!portImaginary.ok) {
    return portImaginary;
  }
  if (
    terms.voltageV !== 0 &&
    terms.netSusceptanceS !== 0 &&
    ((terms.netSusceptanceS !== 1 &&
      portImaginary.value === terms.voltageV) ||
      (terms.voltageV !== 1 &&
        portImaginary.value === terms.netSusceptanceS))
  ) {
    return {
      ok: false,
      failure: swallowedFailure("V*Im(Yin) input current"),
    };
  }
  const identity = branchIdentityResidual(
    resistorCurrent.value,
    branchImaginary.value,
    portReal.value,
    portImaginary.value,
  );
  if (!identity.ok) {
    return identity;
  }
  const portVoltage = Object.freeze({
    realV: terms.voltageV,
    imaginaryV: 0,
  });
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      outputId: "branch V/I",
      status: "available",
      voltageParameterId: "port.voltage_rms",
      voltageEvidenceSnapshotId: voltage.voltageEvidenceSnapshotId,
      voltageSourceSnapshotId: voltage.sourceSnapshotId,
      voltagePhaseReference: "port_voltage_is_zero_angle_reference",
      branches: Object.freeze([
        Object.freeze({
          branchId: resistance.branchId,
          branchRole: "independent_parallel_resistor_branch",
          voltage: portVoltage,
          current: Object.freeze({
            realA: resistorCurrent.value,
            imaginaryA: 0,
          }),
        }),
        Object.freeze({
          branchId: inductance.branchId,
          branchRole: "independent_parallel_inductor_branch",
          voltage: portVoltage,
          current: Object.freeze({
            realA: 0,
            imaginaryA:
              inductorCurrent.value === 0 ? 0 : -inductorCurrent.value,
          }),
        }),
        Object.freeze({
          branchId: capacitance.branchId,
          branchRole: "independent_parallel_capacitor_branch",
          voltage: portVoltage,
          current: Object.freeze({
            realA: 0,
            imaginaryA: capacitorCurrent.value,
          }),
        }),
      ]),
      inputCurrent: Object.freeze({
        realA: portReal.value,
        imaginaryA: portImaginary.value,
      }),
      inputCurrentIdentityResidual: Object.freeze({
        realA: identity.value.realA,
        imaginaryA: identity.value.imaginaryA,
        clamped: false,
      }),
    }),
  };
}

function seriesRlBranchQuantities(
  voltage: G08AvailableBranchVoltageEvidence,
  resistance: ParsedResistance,
  capacitance: ParsedCapacitance,
  terms: BranchCalculationTerms,
): ParsedResult<G08AvailableBranchQuantities> {
  const rlReal = branchScalarProduct(
    terms.voltageV,
    terms.conductanceS,
    "V*Rs/(Rs^2+(omega*L)^2) series-RL branch real current",
  );
  if (!rlReal.ok) {
    return rlReal;
  }
  const rlImaginaryMagnitude = branchScalarProduct(
    terms.voltageV,
    terms.inductiveSusceptanceMagnitudeS,
    "V*omega*L/(Rs^2+(omega*L)^2) series-RL branch imaginary current",
  );
  if (!rlImaginaryMagnitude.ok) {
    return rlImaginaryMagnitude;
  }
  const capacitorCurrent = branchScalarProduct(
    terms.voltageV,
    terms.capacitiveSusceptanceS,
    "V*omega*C capacitor-branch current",
  );
  if (!capacitorCurrent.ok) {
    return capacitorCurrent;
  }
  const branchImaginary = guardedSignedSubtract(
    capacitorCurrent.value,
    rlImaginaryMagnitude.value,
    "capacitor-minus-series-RL branch-current sum",
  );
  if (!branchImaginary.ok) {
    return branchImaginary;
  }
  const portReal = branchScalarProduct(
    terms.voltageV,
    terms.conductanceS,
    "V*Re(Yin) input current",
  );
  if (!portReal.ok) {
    return portReal;
  }
  let portImaginary: NumericResult;
  if (terms.voltageV === 0 || terms.netSusceptanceS === 0) {
    portImaginary = { ok: true, value: 0 };
  } else {
    const raw = terms.voltageV * terms.netSusceptanceS;
    if (!Number.isFinite(raw) || Math.abs(raw) < G08_BINARY64_MIN_NORMAL) {
      return {
        ok: false,
        failure: numericFailure(
          "G-08 V*Im(Yin) input current overflowed, underflowed or became subnormal.",
        ),
      };
    }
    if (
      (terms.netSusceptanceS !== 1 && raw === terms.voltageV) ||
      (terms.voltageV !== 1 && raw === terms.netSusceptanceS)
    ) {
      return {
        ok: false,
        failure: swallowedFailure("V*Im(Yin) input current"),
      };
    }
    portImaginary = { ok: true, value: raw };
  }
  const identity = branchIdentityResidual(
    rlReal.value,
    branchImaginary.value,
    portReal.value,
    portImaginary.value,
  );
  if (!identity.ok) {
    return identity;
  }
  const portVoltage = Object.freeze({
    realV: terms.voltageV,
    imaginaryV: 0,
  });
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      outputId: "branch V/I",
      status: "available",
      voltageParameterId: "port.voltage_rms",
      voltageEvidenceSnapshotId: voltage.voltageEvidenceSnapshotId,
      voltageSourceSnapshotId: voltage.sourceSnapshotId,
      voltagePhaseReference: "port_voltage_is_zero_angle_reference",
      branches: Object.freeze([
        Object.freeze({
          branchId: resistance.branchId,
          branchRole: "series_rl_branch",
          voltage: portVoltage,
          current: Object.freeze({
            realA: rlReal.value,
            imaginaryA:
              rlImaginaryMagnitude.value === 0
                ? 0
                : -rlImaginaryMagnitude.value,
          }),
        }),
        Object.freeze({
          branchId: capacitance.branchId,
          branchRole: "parallel_capacitor_branch",
          voltage: portVoltage,
          current: Object.freeze({
            realA: 0,
            imaginaryA: capacitorCurrent.value,
          }),
        }),
      ]),
      inputCurrent: Object.freeze({
        realA: portReal.value,
        imaginaryA: portImaginary.value,
      }),
      inputCurrentIdentityResidual: Object.freeze({
        realA: identity.value.realA,
        imaginaryA: identity.value.imaginaryA,
        clamped: false,
      }),
    }),
  };
}

function parseFailurePriority(
  results: readonly ParsedResult<unknown>[],
): G08ParallelResonanceFailure | null {
  const failures = results.flatMap((result) =>
    result.ok ? [] : [result.failure],
  );
  return (
    failures.find((item) => item.status === "invalid_input") ??
    failures.find((item) => item.status === "not_applicable") ??
    failures.find((item) => item.status === "insufficient_data") ??
    null
  );
}

/**
 * Isolated canonical-SI implementation of the two frozen G-08 routes.
 * This function never registers or publishes a child method.
 */
export function evaluateG08ParallelResonance(
  input: G08ParallelResonanceInput,
): G08ParallelResonanceOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "topology",
    "port",
    "resistance",
    "inductance",
    "capacitance",
    "nonIdealEffects",
    "branchVoltage",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-08.input_schema_invalid",
      "G-08 input must be one exact controlled plain-data record without accessors, symbols or extra fields.",
      "Provide exactly topology, port, R, L, C, nonideal-effects and branch-voltage evidence records.",
    );
  }

  /* Parse every nested record before semantic early returns. */
  const topologyResult = parseTopology(controlledInput.topology);
  const portResult = parseBoundary(
    controlledInput.port,
    "G-08.port_evidence_missing",
    "G-08.port_evidence_invalid",
    "G-08 port evidence",
  );
  const resistanceResult = parseResistance(controlledInput.resistance);
  const inductanceResult = parseInductance(controlledInput.inductance);
  const capacitanceResult = parseCapacitance(controlledInput.capacitance);
  const nonIdealResult = parseNonIdealEffects(controlledInput.nonIdealEffects);
  const voltageResult = parseBranchVoltage(controlledInput.branchVoltage);
  const parsePriority = parseFailurePriority([
    topologyResult,
    portResult,
    resistanceResult,
    inductanceResult,
    capacitanceResult,
    nonIdealResult,
    voltageResult,
  ]);
  if (parsePriority !== null) {
    return parsePriority;
  }
  if (!topologyResult.ok) return topologyResult.failure;
  if (!portResult.ok) return portResult.failure;
  if (!resistanceResult.ok) return resistanceResult.failure;
  if (!inductanceResult.ok) return inductanceResult.failure;
  if (!capacitanceResult.ok) return capacitanceResult.failure;
  if (!nonIdealResult.ok) return nonIdealResult.failure;
  if (!voltageResult.ok) return voltageResult.failure;

  const topology = topologyResult.value;
  const port = portResult.value;
  const resistance = resistanceResult.value;
  const inductance = inductanceResult.value;
  const capacitance = capacitanceResult.value;
  const nonIdeal = nonIdealResult.value;
  const branchVoltage = voltageResult.value;
  const allBoundaries = [
    port,
    resistance.binding,
    inductance.binding,
    capacitance.binding,
    nonIdeal.binding,
    ...(branchVoltage.kind === "available" ? [branchVoltage.binding] : []),
  ] as const;

  /* Known out-of-domain facts outrank unknown/unconfirmed facts. */
  const knownBoundaryExclusion = allBoundaries
    .map(boundaryHasKnownOutOfDomain)
    .find((item) => item !== null);
  if (
    (topology.topologyId !== "unknown_or_unconfirmed" &&
      !(G08_INTERNAL_TOPOLOGY_ROUTES as readonly unknown[]).includes(
        topology.topologyId,
      )) ||
    knownBoundaryExclusion === "topology"
  ) {
    return failure(
      "not_applicable",
      "G-08.topology_not_applicable",
      "G-08 is not applicable to series RLC, transformer, LLC or any topology outside its two frozen parallel routes.",
      "Route the exact controlled topology to its independently frozen method; do not infer or rename it.",
    );
  }
  if (topology.networkModelRegime === "distributed_switching_or_nonlinear") {
    return failure(
      "not_applicable",
      "G-08.network_model_not_applicable",
      "G-08 does not model distributed, switching-harmonic or nonlinear networks.",
      "Use an independently approved topology-specific frequency- or time-domain method.",
    );
  }
  const nonIdealAssessments = [
    nonIdeal.capacitorParasitics,
    nonIdeal.inductorParasitics,
    nonIdeal.interconnectParasitics,
    nonIdeal.switchingHarmonics,
    nonIdeal.unmodelledNetworkElements,
  ] as const;
  if (nonIdealAssessments.includes("present_or_material")) {
    return failure(
      "not_applicable",
      "G-08.nonideal_effects_not_applicable",
      "A material parasitic, switching harmonic or unmodelled network element invalidates the frozen three-element G-08 route.",
      "Use a controlled network model that explicitly contains every material element and excitation harmonic.",
    );
  }
  if (knownBoundaryExclusion === "basis") {
    return failure(
      "not_applicable",
      "G-08.port_basis_not_applicable",
      "G-08 accepts only RMS or fundamental_rms quantities at one single-frequency port.",
      "Do not mix peak, full-wave RMS, DC, average, local or total quantities into G-08.",
    );
  }
  if (knownBoundaryExclusion === "waveform") {
    return failure(
      "not_applicable",
      "G-08.waveform_not_applicable",
      "Known multifrequency or switching waveforms are outside the frozen single-frequency G-08 phasor model.",
      "Resolve a controlled fundamental equivalent or use an approved multifrequency/time-domain method.",
    );
  }
  if (knownBoundaryExclusion === "phasor") {
    return failure(
      "not_applicable",
      "G-08.phasor_convention_not_applicable",
      "A known non-exp(j*omega*t) convention cannot be mixed with the frozen signed G-08 equations.",
      "Transform all phasors through a controlled convention boundary before using G-08.",
    );
  }
  if (knownBoundaryExclusion === "current") {
    return failure(
      "not_applicable",
      "G-08.current_direction_not_applicable",
      "A known non-passive current reference is outside the frozen G-08 port convention.",
      "Transform the current reference to into_passive_port before using G-08.",
    );
  }
  if (
    branchVoltage.kind === "available" &&
    branchVoltage.phaseReference === "known_other_phase_reference"
  ) {
    return failure(
      "not_applicable",
      "G-08.branch_voltage_phase_not_applicable",
      "G-08 branch phasors require the declared port voltage to be their zero-angle reference.",
      "Provide a controlled port-voltage phasor transformation or omit branch quantities explicitly.",
    );
  }

  const route = topology.topologyId;
  if (
    route === "parallel_ideal_r_l_c_branches" &&
    (topology.resistancePlacement === "series_resistance_in_rl_branch" ||
      resistance.elementRole === "series_resistance_in_rl_branch" ||
      inductance.elementRole === "series_inductance_in_rl_branch" ||
      capacitance.elementRole ===
        "parallel_capacitor_across_series_rl_branch")
  ) {
    return failure(
      "invalid_input",
      "G-08.topology_element_role_inconsistent",
      "Ideal independent parallel branches cannot consume a series-loss R or a series-RL branch role.",
      "Use Rp as its own parallel branch, or select parallel_c_with_series_rl_load with consistent element roles.",
    );
  }
  if (
    route === "parallel_c_with_series_rl_load" &&
    (topology.resistancePlacement ===
      "independent_parallel_resistor_branch" ||
      resistance.elementRole ===
        "independent_parallel_resistor_branch" ||
      inductance.elementRole ===
        "independent_parallel_inductor_branch" ||
      capacitance.elementRole ===
        "independent_parallel_capacitor_branch")
  ) {
    return failure(
      "invalid_input",
      "G-08.topology_element_role_inconsistent",
      "The practical route requires Rs and L in one series branch with C in parallel; independent R/L/C roles contradict it.",
      "Bind Rs and L to one series-RL branch and C to the separate parallel capacitor branch.",
    );
  }

  const portLoadedState = port.loadedState;
  const inductanceLoadedState = inductance.binding.loadedState;
  if (
    (inductance.stateRoute === "loaded_design_state" &&
      (portLoadedState === "empty" || inductanceLoadedState === "empty")) ||
    (inductance.stateRoute === "unloaded_reference_only" &&
      ((portLoadedState !== "unknown_or_unconfirmed" &&
        portLoadedState !== "empty") ||
        (inductanceLoadedState !== "unknown_or_unconfirmed" &&
          inductanceLoadedState !== "empty")))
  ) {
    return failure(
      "invalid_input",
      "G-08.inductance_route_inconsistent",
      "The explicit inductance route contradicts the port intent or L evidence loaded_state.",
      "Use loaded_design_state only with non-empty matching port/L states; use unloaded_reference_only only with empty matching port/L states.",
    );
  }

  /* Unknowns are fail-closed only after every known exclusion/contradiction. */
  if (route === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-08.topology_unknown",
      "G-08 cannot infer either parallel route from an unknown topology or diagram title.",
      "Select one exact topology_id from the frozen electrical topology dictionary.",
    );
  }
  if (
    route !== "parallel_ideal_r_l_c_branches" &&
    route !== "parallel_c_with_series_rl_load"
  ) {
    return failure(
      "not_applicable",
      "G-08.topology_not_applicable",
      "G-08 received a recognized topology outside its two frozen parallel routes.",
      "Route the controlled topology to its independently frozen method.",
    );
  }
  if (topology.networkModelRegime === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-08.network_model_unknown",
      "The lumped, linear, single-frequency model regime is unconfirmed.",
      "Confirm ideal_lumped_linear_single_frequency or select a method representing the actual network.",
    );
  }
  if (nonIdealAssessments.includes("unknown_or_unconfirmed")) {
    return failure(
      "insufficient_data",
      "G-08.nonideal_effects_unknown",
      "At least one parasitic, switching-harmonic or extra-network assessment is unknown.",
      "Resolve every nonideal-effect assessment; unknown applicable effects are never treated as zero.",
    );
  }
  if (topology.resistancePlacement === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-08.resistance_placement_unknown",
      "G-08 cannot distinguish Rp from series-loss Rs without explicit placement.",
      "Declare independent_parallel_resistor_branch or series_resistance_in_rl_branch consistently with topology_id.",
    );
  }
  if (
    resistance.elementRole === "unknown_or_unconfirmed" ||
    inductance.elementRole === "unknown_or_unconfirmed" ||
    capacitance.elementRole === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "G-08.element_role_unknown",
      "One or more R/L/C branch roles are unconfirmed.",
      "Bind every element to its explicit branch role before evaluating the selected topology.",
    );
  }
  if (inductance.stateRoute === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-08.inductance_route_unknown",
      "G-08 cannot determine whether L represents the loaded design state or an unloaded reference.",
      "Declare loaded_design_state or unloaded_reference_only explicitly.",
    );
  }
  if (allBoundaries.some(boundaryHasUnknown)) {
    if (
      allBoundaries.some(
        (boundary) => boundary.quantityBasis === "unknown_or_unconfirmed",
      )
    ) {
      return failure(
        "insufficient_data",
        "G-08.port_basis_unknown",
        "At least one state-bound G-08 quantity has an unknown RMS basis.",
        "Confirm rms or fundamental_rms at the same declared port for every quantity.",
      );
    }
    if (
      allBoundaries.some(
        (boundary) =>
          boundary.waveformDefinition === "unknown_or_unconfirmed",
      )
    ) {
      return failure(
        "insufficient_data",
        "G-08.waveform_unknown",
        "The approximately sinusoidal fundamental waveform basis is unconfirmed.",
        "Confirm the single-frequency fundamental model before applying phasor algebra.",
      );
    }
    if (
      allBoundaries.some(
        (boundary) =>
          boundary.phasorTimeConvention === "unknown_or_unconfirmed",
      )
    ) {
      return failure(
        "insufficient_data",
        "G-08.phasor_convention_unknown",
        "The exp(j*omega*t) phasor convention is unconfirmed.",
        "Confirm the frozen time convention before evaluating signed susceptance.",
      );
    }
    if (
      allBoundaries.some(
        (boundary) => boundary.currentDirection === "unknown_or_unconfirmed",
      )
    ) {
      return failure(
        "insufficient_data",
        "G-08.current_direction_unknown",
        "The passive-port current direction is unconfirmed.",
        "Confirm current into the passive receiving port before evaluating signed admittance.",
      );
    }
    if (
      allBoundaries.some(
        (boundary) => boundary.loadedState === "unknown_or_unconfirmed",
      )
    ) {
      return failure(
        "insufficient_data",
        "G-08.loaded_state_unknown",
        "At least one G-08 quantity lacks a controlled loaded_state.",
        "Declare empty, workpiece_cold, workpiece_hot, measured_state or user_defined_state consistently.",
      );
    }
    return failure(
      "insufficient_data",
      "G-08.state_boundary_unknown",
      "At least one topology boundary is unknown.",
      "Resolve the complete topology and state boundary before calculation.",
    );
  }
  if (
    branchVoltage.kind === "available" &&
    branchVoltage.phaseReference === "unknown_or_unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "G-08.branch_voltage_phase_unknown",
      "The explicit branch-voltage evidence lacks a controlled zero-angle port reference.",
      "Confirm port_voltage_is_zero_angle_reference or explicitly mark branch voltage unavailable.",
    );
  }

  if (
    topology.parallelNetworkId !== port.parallelNetworkId ||
    topology.topologySnapshotId !== port.topologySnapshotId ||
    topology.topologyId !== port.topologyId ||
    allBoundaries.some((boundary) => !sameBoundary(port, boundary))
  ) {
    return failure(
      "insufficient_data",
      "G-08.state_boundary_mismatch",
      "G-08 R, L, C, nonideal assessment and optional voltage evidence do not share one exact topology/port/state/frequency/time/reference-plane boundary.",
      "Resolve every input to the same case, topology, port, design state, loaded state, frequency, time window and snapshot identities.",
    );
  }

  if (
    resistance.componentId === inductance.componentId ||
    resistance.componentId === capacitance.componentId ||
    inductance.componentId === capacitance.componentId ||
    (route === "parallel_ideal_r_l_c_branches" &&
      (resistance.branchId === inductance.branchId ||
        resistance.branchId === capacitance.branchId ||
        inductance.branchId === capacitance.branchId)) ||
    (route === "parallel_c_with_series_rl_load" &&
      (resistance.branchId !== inductance.branchId ||
        resistance.branchId === capacitance.branchId))
  ) {
    return failure(
      "invalid_input",
      "G-08.branch_topology_inconsistent",
      "Component or branch identities contradict the selected parallel topology.",
      "Use distinct R/L/C component IDs; use three distinct branches for ideal parallel R/L/C, or one shared series-RL branch plus a distinct C branch.",
    );
  }

  const common = commonCircuitTerms(
    port.frequencyHz,
    inductance.inductanceH,
    capacitance.capacitanceF,
  );
  if (!common.ok) {
    return common.failure;
  }

  let conductanceS: number;
  let inductiveSusceptanceMagnitudeS: number;
  let netSusceptanceS: number;
  let seriesRlMagnitudeSquaredOhm2: number | null = null;

  if (route === "parallel_ideal_r_l_c_branches") {
    const conductance = guardedPositiveReciprocal(
      resistance.resistanceOhm,
      "1/Rp",
    );
    if (!conductance.ok) return conductance.failure;
    const inductiveSusceptance = guardedPositiveReciprocal(
      common.value.angularFrequencyTimesInductanceOhm,
      "1/(omega*L)",
    );
    if (!inductiveSusceptance.ok) return inductiveSusceptance.failure;
    const net = guardedSignedSubtract(
      common.value.capacitiveSusceptanceS,
      inductiveSusceptance.value,
      "omega*C - 1/(omega*L)",
    );
    if (!net.ok) return net.failure;
    conductanceS = conductance.value;
    inductiveSusceptanceMagnitudeS = inductiveSusceptance.value;
    netSusceptanceS = net.value;
  } else {
    const resistanceSquared = guardedPositiveSquare(
      resistance.resistanceOhm,
      "Rs^2",
    );
    if (!resistanceSquared.ok) return resistanceSquared.failure;
    const omegaLSquared = guardedPositiveSquare(
      common.value.angularFrequencyTimesInductanceOhm,
      "(omega*L)^2",
    );
    if (!omegaLSquared.ok) return omegaLSquared.failure;
    const seriesRlMagnitudeSquared = guardedNonnegativeAdd(
      resistanceSquared.value,
      omegaLSquared.value,
      "Rs^2 + (omega*L)^2",
    );
    if (!seriesRlMagnitudeSquared.ok) return seriesRlMagnitudeSquared.failure;
    const conductance = guardedPositiveDivide(
      resistance.resistanceOhm,
      seriesRlMagnitudeSquared.value,
      "Rs/(Rs^2+(omega*L)^2)",
    );
    if (!conductance.ok) return conductance.failure;
    const inductiveSusceptance = guardedPositiveDivide(
      common.value.angularFrequencyTimesInductanceOhm,
      seriesRlMagnitudeSquared.value,
      "omega*L/(Rs^2+(omega*L)^2)",
    );
    if (!inductiveSusceptance.ok) return inductiveSusceptance.failure;
    const net = guardedSignedSubtract(
      common.value.capacitiveSusceptanceS,
      inductiveSusceptance.value,
      "omega*C - omega*L/(Rs^2+(omega*L)^2)",
    );
    if (!net.ok) return net.failure;
    conductanceS = conductance.value;
    inductiveSusceptanceMagnitudeS = inductiveSusceptance.value;
    netSusceptanceS = net.value;
    seriesRlMagnitudeSquaredOhm2 = seriesRlMagnitudeSquared.value;
  }

  const admittanceAndImpedance = reciprocalComplexAdmittance(
    conductanceS,
    netSusceptanceS,
  );
  if (!admittanceAndImpedance.ok) {
    return admittanceAndImpedance.failure;
  }

  let naturalFrequency: G08FrequencyOutput;
  let rootSquaredRad2PerS2: number;
  let positivePhysicalRootExists: boolean;
  let resonanceImpedance: G08ResonanceImpedance;
  let resonanceSusceptanceResidualS: number | null;

  if (route === "parallel_ideal_r_l_c_branches") {
    const reciprocalLc = guardedPositiveReciprocal(
      common.value.inductanceCapacitanceProduct,
      "1/(L*C)",
    );
    if (!reciprocalLc.ok) return reciprocalLc.failure;
    rootSquaredRad2PerS2 = reciprocalLc.value;
    const sqrtLc = guardedPositiveSqrt(
      common.value.inductanceCapacitanceProduct,
      "sqrt(L*C)",
    );
    if (!sqrtLc.ok) return sqrtLc.failure;
    const frequencyDenominator = guardedPositiveMultiply(
      2 * Math.PI,
      sqrtLc.value,
      "2*pi*sqrt(L*C)",
    );
    if (!frequencyDenominator.ok) return frequencyDenominator.failure;
    const frequency = guardedPositiveReciprocal(
      frequencyDenominator.value,
      "1/(2*pi*sqrt(L*C))",
    );
    if (!frequency.ok) return frequency.failure;
    naturalFrequency = Object.freeze({
      kind: "available",
      outputId: "f0",
      status: "available",
      valueSi: frequency.value,
      dimensionId: "frequency",
      canonicalUnitId: "Hz",
      interpretation: "ideal_parallel_lc_natural_frequency",
    });
    positivePhysicalRootExists = true;
    resonanceImpedance = Object.freeze({
      kind: "available",
      status: "available",
      valueSi: resistance.resistanceOhm,
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "parallel_ideal_resonance_impedance_equals_Rp",
    });
    const omega0 = guardedPositiveReciprocal(
      sqrtLc.value,
      "omega0=1/sqrt(L*C)",
    );
    if (!omega0.ok) return omega0.failure;
    const omega0C = guardedPositiveMultiply(
      omega0.value,
      capacitance.capacitanceF,
      "omega0*C",
    );
    if (!omega0C.ok) return omega0C.failure;
    const omega0L = guardedPositiveMultiply(
      omega0.value,
      inductance.inductanceH,
      "omega0*L",
    );
    if (!omega0L.ok) return omega0L.failure;
    const reciprocalOmega0L = guardedPositiveReciprocal(
      omega0L.value,
      "1/(omega0*L)",
    );
    if (!reciprocalOmega0L.ok) return reciprocalOmega0L.failure;
    const resonanceResidual = guardedSignedSubtract(
      omega0C.value,
      reciprocalOmega0L.value,
      "ideal resonance susceptance residual",
    );
    if (!resonanceResidual.ok) return resonanceResidual.failure;
    resonanceSusceptanceResidualS = resonanceResidual.value;
  } else {
    const reciprocalLc = guardedPositiveReciprocal(
      common.value.inductanceCapacitanceProduct,
      "1/(L*C)",
    );
    if (!reciprocalLc.ok) return reciprocalLc.failure;
    const rsOverL = guardedPositiveDivide(
      resistance.resistanceOhm,
      inductance.inductanceH,
      "Rs/L",
    );
    if (!rsOverL.ok) return rsOverL.failure;
    const rsOverLSquared = guardedPositiveSquare(
      rsOverL.value,
      "(Rs/L)^2",
    );
    if (!rsOverLSquared.ok) return rsOverLSquared.failure;
    const rootSquared = guardedSignedSubtract(
      reciprocalLc.value,
      rsOverLSquared.value,
      "1/(L*C) - (Rs/L)^2",
    );
    if (!rootSquared.ok) return rootSquared.failure;
    rootSquaredRad2PerS2 = rootSquared.value;
    positivePhysicalRootExists = rootSquared.value > 0;
    if (!positivePhysicalRootExists) {
      naturalFrequency = Object.freeze({
        kind: "unavailable",
        outputId: "f0",
        status: "no_feasible_solution",
        reason: "root_squared_nonpositive_no_physical_positive_resonance",
      });
      resonanceImpedance = Object.freeze({
        kind: "unavailable",
        status: "no_feasible_solution",
        reason: "root_squared_nonpositive_no_physical_positive_resonance",
      });
      resonanceSusceptanceResidualS = null;
    } else {
      const omega0 = guardedPositiveSqrt(
        rootSquared.value,
        "sqrt(1/(L*C)-(Rs/L)^2)",
      );
      if (!omega0.ok) return omega0.failure;
      const frequency = guardedPositiveDivide(
        omega0.value,
        2 * Math.PI,
        "omega0/(2*pi)",
      );
      if (!frequency.ok) return frequency.failure;
      naturalFrequency = Object.freeze({
        kind: "available",
        outputId: "f0",
        status: "available",
        valueSi: frequency.value,
        dimensionId: "frequency",
        canonicalUnitId: "Hz",
        interpretation: "positive_parallel_series_rl_c_resonance_frequency",
      });
      const capacitanceTimesResistance = guardedPositiveMultiply(
        capacitance.capacitanceF,
        resistance.resistanceOhm,
        "C*Rs",
      );
      if (!capacitanceTimesResistance.ok) {
        return capacitanceTimesResistance.failure;
      }
      const resonanceZ = guardedPositiveDivide(
        inductance.inductanceH,
        capacitanceTimesResistance.value,
        "L/(C*Rs)",
      );
      if (!resonanceZ.ok) return resonanceZ.failure;
      resonanceImpedance = Object.freeze({
        kind: "available",
        status: "available",
        valueSi: resonanceZ.value,
        dimensionId: "electrical_resistance",
        canonicalUnitId: "ohm",
        interpretation: "parallel_series_rl_c_resonance_impedance_L_over_C_Rs",
      });
      const omega0L = guardedPositiveMultiply(
        omega0.value,
        inductance.inductanceH,
        "omega0*L",
      );
      if (!omega0L.ok) return omega0L.failure;
      const rsSquared = guardedPositiveSquare(
        resistance.resistanceOhm,
        "Rs^2 at resonance",
      );
      if (!rsSquared.ok) return rsSquared.failure;
      const omega0LSquared = guardedPositiveSquare(
        omega0L.value,
        "(omega0*L)^2",
      );
      if (!omega0LSquared.ok) return omega0LSquared.failure;
      const denominator = guardedNonnegativeAdd(
        rsSquared.value,
        omega0LSquared.value,
        "Rs^2+(omega0*L)^2",
      );
      if (!denominator.ok) return denominator.failure;
      const omega0C = guardedPositiveMultiply(
        omega0.value,
        capacitance.capacitanceF,
        "omega0*C",
      );
      if (!omega0C.ok) return omega0C.failure;
      const rlSusceptance = guardedPositiveDivide(
        omega0L.value,
        denominator.value,
        "omega0*L/(Rs^2+(omega0*L)^2)",
      );
      if (!rlSusceptance.ok) return rlSusceptance.failure;
      const residual = guardedSignedSubtract(
        omega0C.value,
        rlSusceptance.value,
        "series-RL parallel resonance susceptance residual",
      );
      if (!residual.ok) return residual.failure;
      resonanceSusceptanceResidualS = residual.value;
    }
  }

  const branchTerms: BranchCalculationTerms = Object.freeze({
    voltageV: branchVoltage.kind === "available" ? branchVoltage.voltageV : 0,
    conductanceS,
    capacitiveSusceptanceS: common.value.capacitiveSusceptanceS,
    inductiveSusceptanceMagnitudeS,
    netSusceptanceS,
  });
  let branchQuantities: G08BranchQuantities;
  if (branchVoltage.kind === "not_available") {
    branchQuantities = branchUnavailable();
  } else if (route === "parallel_ideal_r_l_c_branches") {
    const branches = idealBranchQuantities(
      branchVoltage,
      resistance,
      inductance,
      capacitance,
      branchTerms,
    );
    if (!branches.ok) return branches.failure;
    branchQuantities = branches.value;
  } else {
    const branches = seriesRlBranchQuantities(
      branchVoltage,
      resistance,
      capacitance,
      branchTerms,
    );
    if (!branches.ok) return branches.failure;
    branchQuantities = branches.value;
  }

  const value: G08ParallelResonanceValue = Object.freeze({
    Yin: Object.freeze({
      kind: "available",
      outputId: "Yin",
      status: "available",
      valueSi: Object.freeze({
        realS: admittanceAndImpedance.value.conductanceS,
        imaginaryS: admittanceAndImpedance.value.susceptanceS,
      }),
      dimensionId: "electrical_conductance",
      canonicalUnitId: "S",
      interpretation: "declared_parallel_network_input_admittance",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    }),
    Zin: Object.freeze({
      kind: "available",
      outputId: "Zin",
      status: "available",
      valueSi: Object.freeze({
        realOhm: admittanceAndImpedance.value.impedanceRealOhm,
        imaginaryOhm: admittanceAndImpedance.value.impedanceImaginaryOhm,
      }),
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "declared_parallel_network_input_impedance",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    }),
    f0: naturalFrequency,
    "branch V/I": branchQuantities,
  });

  const warning: G08Warning = Object.freeze({
    predicate: PARASITICS_IGNORED_PREDICATE,
    message:
      "G-08 excludes component/interconnect parasitics, switching harmonics and extra network elements; execution was allowed only after explicit exclusion or intended-use negligibility confirmation.",
  });
  const inputSnapshot = Object.freeze({
    topologyId: route,
    parallelNetworkId: topology.parallelNetworkId,
    topologySnapshotId: topology.topologySnapshotId,
    topologySourceSnapshotId: topology.sourceSnapshotId,
    caseSnapshotId: port.caseSnapshotId,
    electricalStateSnapshotId: port.electricalStateSnapshotId,
    portSnapshotId: port.portSnapshotId,
    portId: port.portId,
    positiveTerminalId: port.positiveTerminalId,
    negativeTerminalId: port.negativeTerminalId,
    referencePlaneId: port.referencePlaneId,
    quantityBasis: port.quantityBasis as "rms" | "fundamental_rms",
    waveformDefinition: "approximately_sinusoidal_fundamental" as const,
    loadedState: port.loadedState as LoadedState,
    designStateId: port.designStateId,
    frequencyHz: port.frequencyHz,
    timeBasisId: port.timeBasisId,
    measurementWindowId: port.measurementWindowId,
    phasorTimeConvention: "exp_j_omega_t" as const,
    currentDirection: "into_passive_port" as const,
    resistancePlacement: topology.resistancePlacement as Exclude<
      G08ResistancePlacement,
      "unknown_or_unconfirmed"
    >,
    inductanceStateRoute: inductance.stateRoute as Exclude<
      G08InductanceStateRoute,
      "unknown_or_unconfirmed"
    >,
    resistanceElementSnapshotId: resistance.elementSnapshotId,
    resistanceSourceSnapshotId: resistance.sourceSnapshotId,
    inductanceElementSnapshotId: inductance.elementSnapshotId,
    inductanceSourceSnapshotId: inductance.sourceSnapshotId,
    capacitanceElementSnapshotId: capacitance.elementSnapshotId,
    capacitanceSourceSnapshotId: capacitance.sourceSnapshotId,
    nonIdealAssessmentSnapshotId: nonIdeal.assessmentSnapshotId,
    nonIdealSourceSnapshotId: nonIdeal.sourceSnapshotId,
    branchVoltageEvidenceSnapshotId:
      branchVoltage.kind === "available"
        ? branchVoltage.voltageEvidenceSnapshotId
        : null,
    branchVoltageSourceSnapshotId:
      branchVoltage.kind === "available" ? branchVoltage.sourceSnapshotId : null,
  });
  const commonSuccess = {
    methodId: G08_METHOD_ID,
    methodVersion: G08_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status: "success_with_warnings" as const,
    applicabilityStatus: "in_domain" as const,
    runtimeActivation: "blocked_requires_registered_child_split" as const,
    availabilityStatus:
      "locally_available_nonpublishable_parent_result" as const,
    scientificConfidence: null,
    internalTopologyRouteIsMethodId: false as const,
    warningIds: EMPTY_IDS,
    warnings: Object.freeze([warning]) as readonly [G08Warning],
    methodMapping: G08_PARALLEL_RESONANCE_MAPPING,
    value,
    inputSnapshot,
    applicabilityChecks: Object.freeze([
      "topology_id is one exact frozen G-08 internal route and is not a child method ID",
      "port uses RMS or fundamental_rms with approximately sinusoidal fundamental exp(j*omega*t) passive-sign phasors",
      "R, L, C, nonideal assessment and optional voltage evidence share exact topology, port, case, design, loaded-state, frequency, time and reference-plane identities",
      "resistance and branch placement match the selected parallel topology",
      "network is ideal lumped, linear and single-frequency",
      "parasitics, switching harmonics and unmodelled network elements were explicitly excluded or confirmed negligible",
      "inductance loaded/unloaded route is explicit and consistent with loaded_state",
      "branch quantities are published only from explicit same-port RMS voltage evidence",
    ]) as G08CommonSuccess["applicabilityChecks"],
    portBoundary: Object.freeze({
      resultScope: "declared_parallel_network_input_port" as const,
      phasorConvention: "RMS_exp_j_omega_t_passive_sign" as const,
      branchVoltageDefaultApplied: false as const,
      seriesStressRelationsReused: false as const,
      excludedEffects: Object.freeze([
        "capacitor_esr_and_esl",
        "inductor_and_interconnect_parasitics",
        "switching_harmonics",
        "distributed_and_nonlinear_effects",
        "unmodelled_matching_or_converter_network_elements",
      ]) as G08CommonSuccess["portBoundary"]["excludedEffects"],
    }),
    solverResiduals: Object.freeze({
      solverUsed: false as const,
      classification: "analytical_closed_form_no_iterative_solver" as const,
      operatingSusceptanceResidualS: netSusceptanceS,
      resonanceSusceptanceResidualS,
      resonanceResidualClamped: false as const,
    }),
    resonanceDiagnostics: Object.freeze({
      rootSquaredRad2PerS2,
      positivePhysicalRootExists,
      inputImpedanceAtResonance: resonanceImpedance,
    }),
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64" as const,
      coreRounding: "none" as const,
      precisionClaim:
        "limited_by_input_precision_and_model_applicability" as const,
    }),
    sourceRefs: G08_SOURCE_REFS,
    contractSourceRefs: G08_CONTRACT_SOURCE_REFS,
    derivationRefs: G08_DERIVATION_REFS,
    validationCaseIds: G08_VALIDATION_CASE_IDS,
    methodCheckIds: G08_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G08_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "ideal lumped linear single-frequency network",
      "single-frequency sinusoidal RMS phasors use exp(j*omega*t) and passive current direction",
      "R, L and C are constant at the declared design snapshot",
      "component and interconnect parasitics, switching harmonics and extra network elements are excluded after explicit assessment",
      "internal topology route names are discriminators only and are not approved child method IDs",
    ]) as G08CommonSuccess["assumptions"],
  };

  if (route === "parallel_ideal_r_l_c_branches") {
    return Object.freeze({
      ...commonSuccess,
      internalTopologyRoute: route,
      equations: Object.freeze([
        "omega = 2*pi*f",
        "Y_in = 1/Rp + j*(omega*C - 1/(omega*L))",
        "Z_in = 1/Y_in",
        "f_0 = 1/(2*pi*sqrt(L*C))",
        "Z_in(f_0) = Rp",
      ]) as G08IdealParallelSuccess["equations"],
      substitution: Object.freeze({
        resistancePlacement: "independent_parallel_resistor_branch" as const,
        resistanceOhm: resistance.resistanceOhm,
        inductanceH: inductance.inductanceH,
        capacitanceF: capacitance.capacitanceF,
        frequencyHz: port.frequencyHz,
        angularFrequencyRadPerS: common.value.angularFrequencyRadPerS,
        conductanceS,
        capacitiveSusceptanceS: common.value.capacitiveSusceptanceS,
        inductiveSusceptanceMagnitudeS,
        netSusceptanceS,
      }),
      validationCaseIdForInternalRoute: "PWR-PAR-IDEAL-001" as const,
    });
  }
  if (seriesRlMagnitudeSquaredOhm2 === null) {
    return numericFailure(
      "G-08 practical-route series-RL denominator trace is unexpectedly unavailable.",
    );
  }
  return Object.freeze({
    ...commonSuccess,
    internalTopologyRoute: route,
    equations: Object.freeze([
      "omega = 2*pi*f",
      "Y_in = 1/(Rs + j*omega*L) + j*omega*C",
      "Y_in = Rs/(Rs^2 + (omega*L)^2) + j*(omega*C - omega*L/(Rs^2 + (omega*L)^2))",
      "Z_in = 1/Y_in",
      "omega_0^2 = 1/(L*C) - (Rs/L)^2",
      "positive omega_0 only; Z_in(f_0) = L/(C*Rs)",
    ]) as G08SeriesRlParallelSuccess["equations"],
    substitution: Object.freeze({
      resistancePlacement: "series_resistance_in_rl_branch" as const,
      resistanceOhm: resistance.resistanceOhm,
      inductanceH: inductance.inductanceH,
      capacitanceF: capacitance.capacitanceF,
      frequencyHz: port.frequencyHz,
      angularFrequencyRadPerS: common.value.angularFrequencyRadPerS,
      angularFrequencyTimesInductanceOhm:
        common.value.angularFrequencyTimesInductanceOhm,
      seriesRlMagnitudeSquaredOhm2,
      conductanceS,
      capacitiveSusceptanceS: common.value.capacitiveSusceptanceS,
      inductiveSusceptanceMagnitudeS,
      netSusceptanceS,
    }),
    validationCaseIdForInternalRoute: "PWR-PAR-RL-001" as const,
  });
}
