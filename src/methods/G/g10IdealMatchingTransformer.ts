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

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-10"));

export const G10_METHOD_ID = "G-10" as const;
export const G10_METHOD_VERSION = SPECIFICATION.methodVersion;
export const G10_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const G10_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const G10_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const G10_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const G10_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const G10_BINARY64_MIN_NORMAL = 2 ** -1022;

export const G10_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  swallowedNonzeroTermPolicy: "fail_closed" as const,
  conservationResidualClamping: false as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: G10_BINARY64_MIN_NORMAL,
});

export const G10_IDEAL_TRANSFORMER_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: G10_SOURCE_REFS,
  contractSourceRefs: G10_CONTRACT_SOURCE_REFS,
  derivationRefs: G10_DERIVATION_REFS,
  validationCaseIds: G10_VALIDATION_CASE_IDS,
  methodCheckIds: G10_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: G10_NUMERIC_REPRESENTABILITY_POLICY,
});

const REVERSED_RATIO_PREDICATE = "turns-ratio direction is reversed" as const;
const RECTIFIER_FACTOR_PREDICATE =
  "rectifier factor crosses topology boundaries" as const;
const MIXED_PORT_BASIS_PREDICATE =
  "fundamental and full-wave port quantities are mixed" as const;
const SATURATION_IGNORED_PREDICATE = "core saturation is ignored" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `G-10 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const G10_WARNING_PREDICATES = Object.freeze({
  reversedTurnsRatio: controlledWarningPredicate(REVERSED_RATIO_PREDICATE),
  crossTopologyRectifierFactor: controlledWarningPredicate(
    RECTIFIER_FACTOR_PREDICATE,
  ),
  mixedFundamentalAndFullWave: controlledWarningPredicate(
    MIXED_PORT_BASIS_PREDICATE,
  ),
  coreSaturationIgnored: controlledWarningPredicate(
    SATURATION_IGNORED_PREDICATE,
  ),
});

export type G10TopologyEvidenceId =
  | ControlledTopologyId
  | "unknown_or_unconfirmed";

export interface G10TopologyEvidence {
  readonly topologyId: G10TopologyEvidenceId;
  readonly transformerId: string;
  readonly modelRegime:
    | "ideal_lossless_transformer"
    | "nonideal_transformer"
    | "unknown_or_unconfirmed";
  readonly polarityConvention:
    | "corresponding_positive_references"
    | "reversed_or_opposed_references"
    | "unknown_or_unconfirmed";
}

export interface G10TurnsRatioEvidence {
  /** Dimensionless n=Np/Ns. */
  readonly turnsRatio: number;
  readonly ratioDefinition:
    | "Np_over_Ns"
    | "Ns_over_Np"
    | "unknown_or_unconfirmed";
  readonly primaryWindingId: string;
  readonly secondaryWindingId: string;
  readonly transformerId: string;
  readonly sourceSnapshotId: string;
}

export type G10PortCurrentReferenceDirection =
  | "into_transformer_primary_receiving_port"
  | "from_transformer_into_secondary_load_receiving_port"
  | "other_or_unconfirmed";

export interface G10PortEvidence {
  readonly windingRole: "primary" | "secondary" | "unknown_or_unconfirmed";
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly windingId: string;
  readonly transformerId: string;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly loadedState: LoadedState | "unknown_or_unconfirmed";
  readonly designStateId: string;
  readonly frequencyHz: number;
  readonly phasorTimeConvention:
    | "exp_j_omega_t"
    | "other_or_unconfirmed";
  readonly currentReferenceDirection: G10PortCurrentReferenceDirection;
}

interface G10SecondaryStateBoundary {
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly transformerId: string;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly loadedState: LoadedState | "unknown_or_unconfirmed";
  readonly designStateId: string;
  readonly frequencyHz: number;
  readonly sourceSnapshotId: string;
}

export interface G10SecondaryImpedanceEvidence
  extends G10SecondaryStateBoundary {
  /** Real part of Zs in canonical SI ohms. */
  readonly realOhm: number;
  /** Imaginary part of Zs in canonical SI ohms. */
  readonly imaginaryOhm: number;
}

export interface G10SecondaryCurrentEvidence extends G10SecondaryStateBoundary {
  /** RMS phasor real component in canonical SI amperes. */
  readonly realA: number;
  /** RMS phasor imaginary component in canonical SI amperes. */
  readonly imaginaryA: number;
  readonly currentReferenceDirection:
    "from_transformer_into_secondary_load_receiving_port";
}

export type G10NonIdealEffectAssessment =
  | "explicitly_excluded_or_confirmed_negligible"
  | "present_or_material"
  | "unknown_or_unconfirmed";

export interface G10NonIdealEffectsEvidence {
  readonly windingLoss: G10NonIdealEffectAssessment;
  readonly leakageInductance: G10NonIdealEffectAssessment;
  readonly magnetizingBranch: G10NonIdealEffectAssessment;
  readonly coreLoss: G10NonIdealEffectAssessment;
  readonly coreSaturation: G10NonIdealEffectAssessment;
  readonly parasitics: G10NonIdealEffectAssessment;
  readonly rectifierFactorUse:
    | "none"
    | "applied_or_requested"
    | "unknown_or_unconfirmed";
}

export interface G10IdealMatchingTransformerInput {
  readonly topology: G10TopologyEvidence;
  readonly turnsRatio: G10TurnsRatioEvidence;
  readonly primaryPort: G10PortEvidence;
  readonly secondaryPort: G10PortEvidence;
  readonly secondaryImpedance: G10SecondaryImpedanceEvidence;
  readonly nonIdealEffects: G10NonIdealEffectsEvidence;
  readonly secondaryCurrent: G10SecondaryCurrentEvidence | null;
}

export interface G10ComplexImpedanceOutput {
  readonly kind: "available";
  readonly outputId: "Zp";
  readonly status: "available";
  readonly valueSi: Readonly<{
    readonly realOhm: number;
    readonly imaginaryOhm: number;
  }>;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "primary_referred_impedance_of_declared_secondary_load";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface G10DimensionlessRatioOutput {
  readonly kind: "available";
  readonly outputId: "Vp/Vs" | "Is/Ip";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation:
    | "primary_to_secondary_voltage_ratio_Np_over_Ns"
    | "secondary_load_to_primary_input_current_ratio_Np_over_Ns";
}

export interface G10IdealMatchingTransformerValue {
  readonly Zp: G10ComplexImpedanceOutput;
  readonly "Vp/Vs": G10DimensionlessRatioOutput;
  readonly "Is/Ip": G10DimensionlessRatioOutput;
}

export interface G10ComplexVoltage {
  readonly realV: number;
  readonly imaginaryV: number;
}

export interface G10ComplexCurrent {
  readonly realA: number;
  readonly imaginaryA: number;
}

export interface G10ComplexPower {
  readonly realW: number;
  readonly reactiveVar: number;
}

export interface G10PowerIdentityNotRequested {
  readonly kind: "not_requested";
  readonly status: "not_applicable";
  readonly reason: "secondaryCurrent was null";
  readonly value?: never;
}

export interface G10PowerIdentityAvailable {
  readonly kind: "available";
  readonly status: "available";
  readonly secondaryCurrent: Readonly<G10ComplexCurrent>;
  readonly secondaryVoltage: Readonly<G10ComplexVoltage>;
  readonly primaryCurrent: Readonly<G10ComplexCurrent>;
  readonly primaryVoltage: Readonly<G10ComplexVoltage>;
  readonly secondaryLoadComplexPower: Readonly<G10ComplexPower>;
  readonly primaryInputComplexPower: Readonly<G10ComplexPower>;
  readonly conservationResidual: Readonly<{
    readonly realW: number;
    readonly reactiveVar: number;
  }>;
  readonly identity:
    "Vp*conj(Ip) = Vs*conj(Is) under the declared ideal directions";
}

export type G10PowerIdentity =
  | G10PowerIdentityNotRequested
  | G10PowerIdentityAvailable;

export interface G10Warning {
  readonly code: "G-10.core_saturation_excluded_ideal_model";
  readonly condition:
    "ideal model excludes core saturation after explicit exclusion/negligibility confirmation";
  readonly guardedPredicateRef: typeof SATURATION_IGNORED_PREDICATE;
  readonly message: string;
}

export interface G10IdealMatchingTransformerSuccess {
  readonly methodId: typeof G10_METHOD_ID;
  readonly methodVersion: typeof G10_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [G10Warning];
  readonly value: G10IdealMatchingTransformerValue;
  readonly powerIdentity: G10PowerIdentity;
  readonly equations: readonly [
    "n = Np/Ns = Vp/Vs = Is/Ip",
    "Zp = n^2*Zs",
    "Vp = n*Vs; Ip = Is/n",
    "Sp = Vp*conj(Ip) = Vs*conj(Is) = Ss",
  ];
  readonly substitution: Readonly<{
    readonly turnsRatioNpOverNs: number;
    readonly turnsRatioSquared: number;
    readonly secondaryImpedanceOhm: Readonly<{
      readonly realOhm: number;
      readonly imaginaryOhm: number;
    }>;
  }>;
  readonly inputSnapshot: Readonly<{
    readonly topologyId: "ideal_transformer";
    readonly modelRegime: "ideal_lossless_transformer";
    readonly transformerId: string;
    readonly ratioDefinition: "Np_over_Ns";
    readonly primaryWindingId: string;
    readonly secondaryWindingId: string;
    readonly primaryPortId: string;
    readonly secondaryPortId: string;
    readonly primaryReferencePlaneId: string;
    readonly secondaryReferencePlaneId: string;
    readonly quantityBasis: "rms" | "fundamental_rms";
    readonly loadedState: LoadedState;
    readonly designStateId: string;
    readonly frequencyHz: number;
    readonly phasorTimeConvention: "exp_j_omega_t";
    readonly polarityConvention: "corresponding_positive_references";
    readonly turnsRatioSourceSnapshotId: string;
    readonly secondaryImpedanceSourceSnapshotId: string;
    readonly secondaryCurrentSourceSnapshotId: string | null;
  }>;
  readonly applicabilityChecks: readonly [
    "topology_id is ideal_transformer and modelRegime is ideal_lossless_transformer",
    "turns ratio direction is n=Np/Ns with distinct declared windings",
    "primary and secondary ports use corresponding positive voltage references",
    "both ports share RMS/fundamental basis, frequency, loaded state and design state",
    "winding loss, leakage, magnetizing branch, core loss, saturation and parasitics are explicitly excluded or negligible",
    "no rectifier factor crosses the ideal-transformer boundary",
  ];
  readonly portBoundary: Readonly<{
    readonly topologyId: "ideal_transformer";
    readonly primaryCurrentDirection: "into_transformer_primary_receiving_port";
    readonly secondaryCurrentDirection: "from_transformer_into_secondary_load_receiving_port";
    readonly phasorConvention: "RMS_exp_j_omega_t";
    readonly excludedEffects: readonly [
      "winding_loss",
      "leakage_inductance",
      "magnetizing_current",
      "core_loss",
      "core_saturation",
      "parasitics_and_insulation_design",
      "rectifier_or_converter_scaling",
    ];
  }>;
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_closed_form_no_iterative_solver";
    readonly powerResidualAvailable: boolean;
    readonly powerResidualClamped: false;
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim: "limited_by_input_precision_and_ideal_model_applicability";
  }>;
  readonly sourceRefs: typeof G10_SOURCE_REFS;
  readonly contractSourceRefs: typeof G10_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof G10_DERIVATION_REFS;
  readonly validationCaseIds: typeof G10_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof G10_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy: typeof G10_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "ideal lossless transformer",
    "corresponding positive winding-voltage references",
    "single-frequency sinusoidal RMS phasors",
    "n is Np/Ns and is never silently inverted",
    "nonideal magnetic, winding, insulation, parasitic and converter effects are outside this method",
  ];
  readonly failure?: never;
}

export type G10FailureCode =
  | "G-10.input_schema_invalid"
  | "G-10.topology_missing"
  | "G-10.topology_invalid"
  | "G-10.topology_unknown"
  | "G-10.topology_not_applicable"
  | "G-10.model_regime_unknown"
  | "G-10.model_regime_not_applicable"
  | "G-10.polarity_unknown"
  | "G-10.polarity_not_applicable"
  | "G-10.turns_ratio_missing"
  | "G-10.turns_ratio_invalid"
  | "G-10.turns_ratio_direction_unknown"
  | "G-10.turns_ratio_reversed"
  | "G-10.primary_port_missing"
  | "G-10.secondary_port_missing"
  | "G-10.port_invalid"
  | "G-10.port_role_unknown"
  | "G-10.port_role_mismatch"
  | "G-10.port_basis_unknown"
  | "G-10.port_basis_not_applicable"
  | "G-10.port_convention_unknown"
  | "G-10.port_direction_unknown"
  | "G-10.port_direction_not_applicable"
  | "G-10.port_loaded_state_unknown"
  | "G-10.port_boundary_mismatch"
  | "G-10.secondary_impedance_missing"
  | "G-10.secondary_impedance_invalid"
  | "G-10.secondary_impedance_boundary_unknown"
  | "G-10.secondary_impedance_boundary_mismatch"
  | "G-10.nonideal_effects_missing"
  | "G-10.nonideal_effects_invalid"
  | "G-10.nonideal_effects_unknown"
  | "G-10.nonideal_effects_present"
  | "G-10.rectifier_factor_unknown"
  | "G-10.rectifier_factor_not_applicable"
  | "G-10.secondary_current_invalid"
  | "G-10.secondary_current_boundary_unknown"
  | "G-10.secondary_current_boundary_mismatch"
  | "G-10.numeric_resolution_invalid"
  | "G-10.numeric_term_swallowed";

export interface G10IdealMatchingTransformerFailure {
  readonly methodId: typeof G10_METHOD_ID;
  readonly methodVersion: typeof G10_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: G10FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly powerIdentity?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
  readonly portBoundary?: never;
  readonly solverResiduals?: never;
}

export type G10IdealMatchingTransformerOutcome =
  | G10IdealMatchingTransformerSuccess
  | G10IdealMatchingTransformerFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function failure(
  status: G10IdealMatchingTransformerFailure["status"],
  code: G10FailureCode,
  message: string,
  action: string,
): G10IdealMatchingTransformerFailure {
  return Object.freeze({
    methodId: G10_METHOD_ID,
    methodVersion: G10_METHOD_VERSION,
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

function isRepresentableSigned(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (value === 0 || Math.abs(value) >= G10_BINARY64_MIN_NORMAL)
  );
}

function isPositiveNormal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= G10_BINARY64_MIN_NORMAL
  );
}

interface ParsedPort {
  readonly windingRole: "primary" | "secondary";
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly windingId: string;
  readonly transformerId: string;
  readonly quantityBasis: "rms" | "fundamental_rms";
  readonly loadedState: LoadedState;
  readonly designStateId: string;
  readonly frequencyHz: number;
}

type ParsedPortResult =
  | { readonly ok: true; readonly port: ParsedPort }
  | {
      readonly ok: false;
      readonly failure: G10IdealMatchingTransformerFailure;
    };

function parsePort(
  value: unknown,
  expectedRole: "primary" | "secondary",
): ParsedPortResult {
  if (value === null || value === undefined) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        expectedRole === "primary"
          ? "G-10.primary_port_missing"
          : "G-10.secondary_port_missing",
        `G-10 requires an explicit ${expectedRole} port definition.`,
        "Provide the frozen port role, terminals, reference plane, RMS basis, state, frequency and direction.",
      ),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "windingRole",
    "portId",
    "positiveTerminalId",
    "negativeTerminalId",
    "referencePlaneId",
    "windingId",
    "transformerId",
    "quantityBasis",
    "loadedState",
    "designStateId",
    "frequencyHz",
    "phasorTimeConvention",
    "currentReferenceDirection",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        `G-10 ${expectedRole} port must be an exact controlled plain-data record without accessors or extra fields.`,
        "Provide only the frozen G-10 port fields as plain data values.",
      ),
    };
  }
  if (record.windingRole === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.port_role_unknown",
        "G-10 cannot infer primary versus secondary winding role.",
        "Declare the port windingRole explicitly.",
      ),
    };
  }
  if (record.windingRole !== "primary" && record.windingRole !== "secondary") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        "G-10 received an uncontrolled winding role.",
        "Use primary or secondary without coercion.",
      ),
    };
  }
  if (record.windingRole !== expectedRole) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "G-10.port_role_mismatch",
        "G-10 primary and secondary ports were reversed.",
        "Bind each declared port to its matching Np or Ns winding role.",
      ),
    };
  }
  if (
    !isNonBlankString(record.portId) ||
    !isNonBlankString(record.positiveTerminalId) ||
    !isNonBlankString(record.negativeTerminalId) ||
    record.positiveTerminalId === record.negativeTerminalId ||
    !isNonBlankString(record.referencePlaneId) ||
    !isNonBlankString(record.windingId) ||
    !isNonBlankString(record.transformerId) ||
    !isNonBlankString(record.designStateId) ||
    !isPositiveNormal(record.frequencyHz)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        "G-10 port evidence contains a blank identifier, coincident terminals, or a non-positive/non-representable frequency.",
        "Use distinct terminals, stable identifiers and a positive normal binary64 SI frequency.",
      ),
    };
  }
  if (record.quantityBasis === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.port_basis_unknown",
        "G-10 requires a confirmed RMS or fundamental_rms port basis.",
        "Confirm one compatible RMS basis on both ports.",
      ),
    };
  }
  if (!(QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        "G-10 received an uncontrolled quantity basis.",
        "Use the frozen quantity-basis enumeration without coercion.",
      ),
    };
  }
  if (record.quantityBasis !== "rms" && record.quantityBasis !== "fundamental_rms") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "G-10.port_basis_not_applicable",
        "G-10 ideal phasor ratios do not accept peak, full-wave RMS, DC, average, local or total quantities.",
        "Resolve both ports to the same sinusoidal rms or fundamental_rms basis.",
      ),
    };
  }
  if (record.loadedState === "unknown_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.port_loaded_state_unknown",
        "G-10 requires a confirmed loaded_state on both ports.",
        "Declare one frozen loaded_state at the design snapshot.",
      ),
    };
  }
  if (!(LOADED_STATES as readonly unknown[]).includes(record.loadedState)) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        "G-10 received an uncontrolled loaded_state.",
        "Use the frozen loaded_state enumeration without coercion.",
      ),
    };
  }
  if (record.phasorTimeConvention === "other_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.port_convention_unknown",
        "G-10 requires the frozen exp(j*omega*t) convention.",
        "Confirm the same phasor convention on both ports.",
      ),
    };
  }
  if (record.phasorTimeConvention !== "exp_j_omega_t") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "G-10.port_invalid",
        "G-10 received an uncontrolled phasor convention.",
        "Use exp_j_omega_t or explicitly mark the convention unconfirmed.",
      ),
    };
  }
  if (record.currentReferenceDirection === "other_or_unconfirmed") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.port_direction_unknown",
        "G-10 requires explicit primary-input and secondary-load current directions.",
        "Confirm the frozen role-specific current direction.",
      ),
    };
  }
  const expectedDirection =
    expectedRole === "primary"
      ? "into_transformer_primary_receiving_port"
      : "from_transformer_into_secondary_load_receiving_port";
  if (record.currentReferenceDirection !== expectedDirection) {
    if (
      record.currentReferenceDirection !==
        "into_transformer_primary_receiving_port" &&
      record.currentReferenceDirection !==
        "from_transformer_into_secondary_load_receiving_port"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-10.port_invalid",
          "G-10 received an uncontrolled current-reference direction.",
          "Use the frozen role-specific direction enumeration without coercion.",
        ),
      };
    }
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "G-10.port_direction_not_applicable",
        "G-10 port current direction is reversed for the declared winding role.",
        "Use primary current into the transformer and secondary current from transformer into the load.",
      ),
    };
  }

  return {
    ok: true,
    port: Object.freeze({
      windingRole: expectedRole,
      portId: record.portId,
      positiveTerminalId: record.positiveTerminalId,
      negativeTerminalId: record.negativeTerminalId,
      referencePlaneId: record.referencePlaneId,
      windingId: record.windingId,
      transformerId: record.transformerId,
      quantityBasis: record.quantityBasis,
      loadedState: record.loadedState as LoadedState,
      designStateId: record.designStateId,
      frequencyHz: record.frequencyHz,
    }),
  };
}

interface ParsedSecondaryQuantity {
  readonly real: number;
  readonly imaginary: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly transformerId: string;
  readonly quantityBasis: "rms" | "fundamental_rms";
  readonly loadedState: LoadedState;
  readonly designStateId: string;
  readonly frequencyHz: number;
  readonly sourceSnapshotId: string;
}

type ParsedSecondaryResult =
  | { readonly ok: true; readonly quantity: ParsedSecondaryQuantity }
  | {
      readonly ok: false;
      readonly failure: G10IdealMatchingTransformerFailure;
    };

function parseSecondaryQuantity(
  value: unknown,
  kind: "impedance" | "current",
): ParsedSecondaryResult {
  if (kind === "impedance" && (value === null || value === undefined)) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "G-10.secondary_impedance_missing",
        "G-10 requires the secondary complex impedance Zs.",
        "Provide a state-bound canonical-SI secondary impedance.",
      ),
    };
  }
  const realKey = kind === "impedance" ? "realOhm" : "realA";
  const imaginaryKey =
    kind === "impedance" ? "imaginaryOhm" : "imaginaryA";
  const record = readExactPlainDataRecord(value, [
    realKey,
    imaginaryKey,
    "portId",
    "referencePlaneId",
    "transformerId",
    "quantityBasis",
    "loadedState",
    "designStateId",
    "frequencyHz",
    "sourceSnapshotId",
    ...(kind === "current" ? ["currentReferenceDirection"] : []),
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        kind === "impedance"
          ? "G-10.secondary_impedance_invalid"
          : "G-10.secondary_current_invalid",
        `G-10 secondary ${kind} must be an exact plain-data record with finite canonical-SI components.`,
        `Provide only the frozen G-10 secondary-${kind} fields without accessors or extra fields.`,
      ),
    };
  }
  if (
    !isRepresentableSigned(record[realKey]) ||
    !isRepresentableSigned(record[imaginaryKey]) ||
    !isNonBlankString(record.portId) ||
    !isNonBlankString(record.referencePlaneId) ||
    !isNonBlankString(record.transformerId) ||
    !isNonBlankString(record.designStateId) ||
    !isPositiveNormal(record.frequencyHz) ||
    !isNonBlankString(record.sourceSnapshotId)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        kind === "impedance"
          ? "G-10.secondary_impedance_invalid"
          : "G-10.secondary_current_invalid",
        `G-10 secondary ${kind} contains a non-finite, subnormal or blank value.`,
        "Use signed finite normal binary64 components (zero allowed), stable identifiers and positive normal SI frequency.",
      ),
    };
  }
  if (
    record.quantityBasis === "unknown_or_unconfirmed" ||
    record.loadedState === "unknown_or_unconfirmed"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        kind === "impedance"
          ? "G-10.secondary_impedance_boundary_unknown"
          : "G-10.secondary_current_boundary_unknown",
        `G-10 secondary ${kind} basis or loaded_state is unconfirmed.`,
        "Bind the quantity to the declared secondary-port RMS basis and loaded state.",
      ),
    };
  }
  if (
    !(QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis) ||
    !(LOADED_STATES as readonly unknown[]).includes(record.loadedState)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        kind === "impedance"
          ? "G-10.secondary_impedance_invalid"
          : "G-10.secondary_current_invalid",
        `G-10 secondary ${kind} uses an uncontrolled basis or loaded_state.`,
        "Use the frozen electrical-state enumerations without coercion.",
      ),
    };
  }
  if (record.quantityBasis !== "rms" && record.quantityBasis !== "fundamental_rms") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "G-10.port_basis_not_applicable",
        `G-10 secondary ${kind} is not on an rms or fundamental_rms basis.`,
        "Resolve the quantity to the same sinusoidal RMS basis as both ports.",
      ),
    };
  }
  if (
    kind === "current" &&
    record.currentReferenceDirection !==
      "from_transformer_into_secondary_load_receiving_port"
  ) {
    if (
      record.currentReferenceDirection !== "other_or_unconfirmed" &&
      record.currentReferenceDirection !==
        "into_transformer_primary_receiving_port"
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "G-10.secondary_current_invalid",
          "G-10 optional secondary current uses an uncontrolled current-reference direction.",
          "Use the frozen secondary-load direction enumeration without coercion.",
        ),
      };
    }
    return {
      ok: false,
      failure: failure(
        record.currentReferenceDirection === "other_or_unconfirmed"
          ? "insufficient_data"
          : "not_applicable",
        record.currentReferenceDirection === "other_or_unconfirmed"
          ? "G-10.port_direction_unknown"
          : "G-10.port_direction_not_applicable",
        "G-10 optional secondary current must point from transformer into the passive secondary load.",
        "Confirm the frozen secondary-load current reference direction.",
      ),
    };
  }

  return {
    ok: true,
    quantity: Object.freeze({
      real: record[realKey] as number,
      imaginary: record[imaginaryKey] as number,
      portId: record.portId,
      referencePlaneId: record.referencePlaneId,
      transformerId: record.transformerId,
      quantityBasis: record.quantityBasis,
      loadedState: record.loadedState as LoadedState,
      designStateId: record.designStateId,
      frequencyHz: record.frequencyHz,
      sourceSnapshotId: record.sourceSnapshotId,
    }),
  };
}

function matchesSecondaryPort(
  quantity: ParsedSecondaryQuantity,
  port: ParsedPort,
): boolean {
  return (
    quantity.portId === port.portId &&
    quantity.referencePlaneId === port.referencePlaneId &&
    quantity.transformerId === port.transformerId &&
    quantity.quantityBasis === port.quantityBasis &&
    quantity.loadedState === port.loadedState &&
    quantity.designStateId === port.designStateId &&
    quantity.frequencyHz === port.frequencyHz
  );
}

type ScalarOperationResult =
  | { readonly ok: true; readonly value: number }
  | {
      readonly ok: false;
      readonly kind: "numeric" | "swallowed";
      readonly message: string;
    };

function multiplyRepresentable(
  left: number,
  right: number,
  label: string,
): ScalarOperationResult {
  if (left === 0 || right === 0) {
    return { ok: true, value: 0 };
  }
  const value = left * right;
  if (!Number.isFinite(value) || Math.abs(value) < G10_BINARY64_MIN_NORMAL) {
    return {
      ok: false,
      kind: "numeric",
      message: `G-10 ${label} overflowed or underflowed the normal binary64 range.`,
    };
  }
  return { ok: true, value };
}

function divideRepresentable(
  numerator: number,
  positiveDenominator: number,
  label: string,
): ScalarOperationResult {
  if (numerator === 0) {
    return { ok: true, value: 0 };
  }
  const value = numerator / positiveDenominator;
  if (!Number.isFinite(value) || Math.abs(value) < G10_BINARY64_MIN_NORMAL) {
    return {
      ok: false,
      kind: "numeric",
      message: `G-10 ${label} overflowed or underflowed the normal binary64 range.`,
    };
  }
  return { ok: true, value };
}

function combineRepresentable(
  left: number,
  right: number,
  sign: 1 | -1,
  label: string,
): ScalarOperationResult {
  const signedRight = sign * right;
  const value = left + signedRight;
  if (
    !Number.isFinite(value) ||
    (value !== 0 && Math.abs(value) < G10_BINARY64_MIN_NORMAL)
  ) {
    return {
      ok: false,
      kind: "numeric",
      message: `G-10 ${label} produced a non-finite or subnormal result.`,
    };
  }
  if (
    left !== 0 &&
    signedRight !== 0 &&
    (value === left || value === signedRight)
  ) {
    return {
      ok: false,
      kind: "swallowed",
      message: `G-10 ${label} swallowed one nonzero binary64 term.`,
    };
  }
  return { ok: true, value };
}

function operationFailure(
  operation: Exclude<ScalarOperationResult, { readonly ok: true }>,
): G10IdealMatchingTransformerFailure {
  return failure(
    "invalid_input",
    operation.kind === "swallowed"
      ? "G-10.numeric_term_swallowed"
      : "G-10.numeric_resolution_invalid",
    operation.message,
    "Use finite representable canonical-SI data or a separately approved higher-precision path; do not clamp, rescale or silently rearrange the frozen identities.",
  );
}

interface ComplexPair {
  readonly real: number;
  readonly imaginary: number;
}

type ComplexOperationResult =
  | { readonly ok: true; readonly value: ComplexPair }
  | {
      readonly ok: false;
      readonly operation: Exclude<ScalarOperationResult, { readonly ok: true }>;
    };

function multiplyComplex(
  left: ComplexPair,
  right: ComplexPair,
  label: string,
): ComplexOperationResult {
  const ac = multiplyRepresentable(left.real, right.real, `${label}.ac`);
  if (!ac.ok) return { ok: false, operation: ac };
  const bd = multiplyRepresentable(
    left.imaginary,
    right.imaginary,
    `${label}.bd`,
  );
  if (!bd.ok) return { ok: false, operation: bd };
  const ad = multiplyRepresentable(
    left.real,
    right.imaginary,
    `${label}.ad`,
  );
  if (!ad.ok) return { ok: false, operation: ad };
  const bc = multiplyRepresentable(
    left.imaginary,
    right.real,
    `${label}.bc`,
  );
  if (!bc.ok) return { ok: false, operation: bc };
  const real = combineRepresentable(ac.value, bd.value, -1, `${label}.real`);
  if (!real.ok) return { ok: false, operation: real };
  const imaginary = combineRepresentable(
    ad.value,
    bc.value,
    1,
    `${label}.imaginary`,
  );
  if (!imaginary.ok) return { ok: false, operation: imaginary };
  return {
    ok: true,
    value: Object.freeze({ real: real.value, imaginary: imaginary.value }),
  };
}

function scaleComplex(
  value: ComplexPair,
  factor: number,
  operation: "multiply" | "divide",
  label: string,
): ComplexOperationResult {
  const real =
    operation === "multiply"
      ? multiplyRepresentable(value.real, factor, `${label}.real`)
      : divideRepresentable(value.real, factor, `${label}.real`);
  if (!real.ok) return { ok: false, operation: real };
  const imaginary =
    operation === "multiply"
      ? multiplyRepresentable(value.imaginary, factor, `${label}.imaginary`)
      : divideRepresentable(value.imaginary, factor, `${label}.imaginary`);
  if (!imaginary.ok) return { ok: false, operation: imaginary };
  return {
    ok: true,
    value: Object.freeze({ real: real.value, imaginary: imaginary.value }),
  };
}

function complexPower(
  voltage: ComplexPair,
  current: ComplexPair,
  label: string,
): ComplexOperationResult {
  return multiplyComplex(
    voltage,
    { real: current.real, imaginary: -current.imaginary },
    label,
  );
}

/** Isolated canonical-SI implementation of frozen method G-10. */
export function evaluateG10IdealMatchingTransformer(
  input: G10IdealMatchingTransformerInput,
): G10IdealMatchingTransformerOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "topology",
    "turnsRatio",
    "primaryPort",
    "secondaryPort",
    "secondaryImpedance",
    "nonIdealEffects",
    "secondaryCurrent",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "G-10.input_schema_invalid",
      "G-10 input must be an exact controlled plain-data record.",
      "Provide topology, ratio, both ports, secondary impedance, nonideal-effect assessment and optional secondary current.",
    );
  }

  if (controlledInput.topology === null || controlledInput.topology === undefined) {
    return failure(
      "insufficient_data",
      "G-10.topology_missing",
      "G-10 requires explicit ideal-transformer topology evidence.",
      "Select the frozen topology_id ideal_transformer and ideal_lossless_transformer model regime.",
    );
  }
  const topology = readExactPlainDataRecord(controlledInput.topology, [
    "topologyId",
    "transformerId",
    "modelRegime",
    "polarityConvention",
  ]);
  if (topology === null || !isNonBlankString(topology.transformerId)) {
    return failure(
      "invalid_input",
      "G-10.topology_invalid",
      "G-10 topology evidence must be an exact record with a stable transformerId.",
      "Provide only the frozen topology evidence fields as plain data values.",
    );
  }
  if (topology.topologyId === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-10.topology_unknown",
      "G-10 does not infer a transformer from an unknown or textual topology label.",
      "Select the stable topology_id ideal_transformer.",
    );
  }
  if (!(TOPOLOGY_IDS as readonly unknown[]).includes(topology.topologyId)) {
    return failure(
      "insufficient_data",
      "G-10.topology_unknown",
      "G-10 received no recognized controlled topology_id.",
      "Resolve the circuit to a frozen topology_id without guessing.",
    );
  }
  if (topology.topologyId !== "ideal_transformer") {
    return failure(
      "not_applicable",
      "G-10.topology_not_applicable",
      "G-10 is not applicable to series, parallel, LLC or other non-transformer topologies.",
      "Route the controlled topology to its own independently frozen method.",
    );
  }
  if (topology.modelRegime === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-10.model_regime_unknown",
      "G-10 requires explicit confirmation of the ideal lossless model regime.",
      "Confirm ideal_lossless_transformer or select a nonideal transformer model.",
    );
  }
  if (topology.modelRegime !== "ideal_lossless_transformer") {
    if (topology.modelRegime !== "nonideal_transformer") {
      return failure(
        "invalid_input",
        "G-10.topology_invalid",
        "G-10 received an uncontrolled transformer model regime.",
        "Use the frozen model-regime enumeration without coercion.",
      );
    }
    return failure(
      "not_applicable",
      "G-10.model_regime_not_applicable",
      "G-10 cannot represent a nonideal transformer.",
      "Use a separate model with leakage, magnetizing, winding and core effects.",
    );
  }
  if (topology.polarityConvention === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-10.polarity_unknown",
      "G-10 requires corresponding primary/secondary positive voltage references.",
      "Declare the winding polarity/dot-reference convention explicitly.",
    );
  }
  if (topology.polarityConvention !== "corresponding_positive_references") {
    if (topology.polarityConvention !== "reversed_or_opposed_references") {
      return failure(
        "invalid_input",
        "G-10.topology_invalid",
        "G-10 received an uncontrolled winding-polarity convention.",
        "Use the frozen polarity enumeration without coercion.",
      );
    }
    return failure(
      "not_applicable",
      "G-10.polarity_not_applicable",
      "G-10 positive n voltage ratio does not apply to opposed voltage references.",
      "Use corresponding positive references or an explicitly signed transformer method.",
    );
  }

  if (
    controlledInput.nonIdealEffects === null ||
    controlledInput.nonIdealEffects === undefined
  ) {
    return failure(
      "insufficient_data",
      "G-10.nonideal_effects_missing",
      "G-10 requires explicit assessment of every excluded nonideal effect.",
      "Assess winding loss, leakage, magnetizing branch, core loss, saturation, parasitics and rectifier-factor use.",
    );
  }
  const nonIdealEffects = readExactPlainDataRecord(
    controlledInput.nonIdealEffects,
    [
      "windingLoss",
      "leakageInductance",
      "magnetizingBranch",
      "coreLoss",
      "coreSaturation",
      "parasitics",
      "rectifierFactorUse",
    ],
  );
  if (nonIdealEffects === null) {
    return failure(
      "invalid_input",
      "G-10.nonideal_effects_invalid",
      "G-10 nonideal-effect evidence must be an exact controlled plain-data record.",
      "Provide every frozen nonideal-effect field without accessors or extra fields.",
    );
  }
  const assessmentKeys = [
    "windingLoss",
    "leakageInductance",
    "magnetizingBranch",
    "coreLoss",
    "coreSaturation",
    "parasitics",
  ] as const;

  // Validate the entire discriminator record before applying engineering
  // precedence. A malformed later field must never be hidden by an earlier
  // unknown or known out-of-domain assessment.
  for (const key of assessmentKeys) {
    const assessment = nonIdealEffects[key];
    if (
      assessment !== "explicitly_excluded_or_confirmed_negligible" &&
      assessment !== "present_or_material" &&
      assessment !== "unknown_or_unconfirmed"
    ) {
      return failure(
        "invalid_input",
        "G-10.nonideal_effects_invalid",
        `G-10 received an uncontrolled ${key} assessment.`,
        "Use the frozen nonideal-effect assessment enumeration without coercion.",
      );
    }
  }
  if (
    nonIdealEffects.rectifierFactorUse !== "none" &&
    nonIdealEffects.rectifierFactorUse !== "applied_or_requested" &&
    nonIdealEffects.rectifierFactorUse !== "unknown_or_unconfirmed"
  ) {
    return failure(
      "invalid_input",
      "G-10.nonideal_effects_invalid",
      "G-10 received an uncontrolled rectifier-factor-use value.",
      "Use the frozen rectifier-factor enumeration without coercion.",
    );
  }

  const presentEffectKey = assessmentKeys.find(
    (key) => nonIdealEffects[key] === "present_or_material",
  );
  if (presentEffectKey !== undefined) {
    return failure(
      "not_applicable",
      "G-10.nonideal_effects_present",
      `G-10 ideal algebra is not applicable because ${presentEffectKey} is present or material.`,
      "Use an independently approved transformer model containing the identified effect.",
    );
  }
  if (nonIdealEffects.rectifierFactorUse === "applied_or_requested") {
    return failure(
      "not_applicable",
      "G-10.rectifier_factor_not_applicable",
      "G-10 does not apply rectifier or converter scaling factors across topology boundaries.",
      "Model the rectifier/converter as its own explicit topology and port conversion.",
    );
  }

  const unknownEffectKey = assessmentKeys.find(
    (key) => nonIdealEffects[key] === "unknown_or_unconfirmed",
  );
  if (unknownEffectKey !== undefined) {
    return failure(
      "insufficient_data",
      "G-10.nonideal_effects_unknown",
      `G-10 ${unknownEffectKey} exclusion is unconfirmed.`,
      "Confirm every excluded effect as absent/negligible or use a nonideal transformer model.",
    );
  }
  if (nonIdealEffects.rectifierFactorUse === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-10.rectifier_factor_unknown",
      "G-10 cannot determine whether a rectifier/converter factor crossed the transformer boundary.",
      "Confirm rectifierFactorUse=none for this ideal transformer method.",
    );
  }

  if (
    controlledInput.turnsRatio === null ||
    controlledInput.turnsRatio === undefined
  ) {
    return failure(
      "insufficient_data",
      "G-10.turns_ratio_missing",
      "G-10 requires n=Np/Ns and explicit winding direction.",
      "Provide the controlled turns-ratio evidence.",
    );
  }
  const ratio = readExactPlainDataRecord(controlledInput.turnsRatio, [
    "turnsRatio",
    "ratioDefinition",
    "primaryWindingId",
    "secondaryWindingId",
    "transformerId",
    "sourceSnapshotId",
  ]);
  if (
    ratio === null ||
    !isPositiveNormal(ratio.turnsRatio) ||
    !isNonBlankString(ratio.primaryWindingId) ||
    !isNonBlankString(ratio.secondaryWindingId) ||
    ratio.primaryWindingId === ratio.secondaryWindingId ||
    !isNonBlankString(ratio.transformerId) ||
    !isNonBlankString(ratio.sourceSnapshotId)
  ) {
    return failure(
      "invalid_input",
      "G-10.turns_ratio_invalid",
      "G-10 turns-ratio evidence is malformed, non-positive, subnormal, or does not identify distinct windings.",
      "Provide positive normal n with distinct Np/Ns winding IDs and stable source/transformer IDs.",
    );
  }
  if (ratio.ratioDefinition === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "G-10.turns_ratio_direction_unknown",
      "G-10 cannot infer whether the supplied ratio is Np/Ns or Ns/Np.",
      "Declare ratioDefinition=Np_over_Ns explicitly.",
    );
  }
  if (ratio.ratioDefinition !== "Np_over_Ns") {
    if (ratio.ratioDefinition !== "Ns_over_Np") {
      return failure(
        "invalid_input",
        "G-10.turns_ratio_invalid",
        "G-10 received an uncontrolled turns-ratio direction.",
        "Use Np_over_Ns or explicitly mark the direction unconfirmed.",
      );
    }
    return failure(
      "not_applicable",
      "G-10.turns_ratio_reversed",
      "G-10 never silently inverts a supplied Ns/Np ratio.",
      "Provide n=Np/Ns with the same declared primary and secondary windings.",
    );
  }
  if (ratio.transformerId !== topology.transformerId) {
    return failure(
      "insufficient_data",
      "G-10.port_boundary_mismatch",
      "G-10 ratio and topology identify different transformers.",
      "Resolve all evidence to one transformer snapshot.",
    );
  }

  const primaryPortResult = parsePort(controlledInput.primaryPort, "primary");
  if (!primaryPortResult.ok) return primaryPortResult.failure;
  const secondaryPortResult = parsePort(
    controlledInput.secondaryPort,
    "secondary",
  );
  if (!secondaryPortResult.ok) return secondaryPortResult.failure;
  const primaryPort = primaryPortResult.port;
  const secondaryPort = secondaryPortResult.port;
  if (primaryPort.quantityBasis !== secondaryPort.quantityBasis) {
    return failure(
      "not_applicable",
      "G-10.port_basis_not_applicable",
      "G-10 primary and secondary ports use different RMS/fundamental bases.",
      "Resolve both ports to one compatible rms or fundamental_rms basis; never mix fundamental and full-wave quantities.",
    );
  }
  if (
    primaryPort.transformerId !== topology.transformerId ||
    secondaryPort.transformerId !== topology.transformerId ||
    primaryPort.windingId !== ratio.primaryWindingId ||
    secondaryPort.windingId !== ratio.secondaryWindingId ||
    primaryPort.loadedState !== secondaryPort.loadedState ||
    primaryPort.designStateId !== secondaryPort.designStateId ||
    primaryPort.frequencyHz !== secondaryPort.frequencyHz ||
    primaryPort.portId === secondaryPort.portId
  ) {
    return failure(
      "insufficient_data",
      "G-10.port_boundary_mismatch",
      "G-10 ports, windings, transformer, frequency or design/loaded state do not describe one compatible snapshot.",
      "Resolve both ports and n to the same transformer and state.",
    );
  }

  const impedanceResult = parseSecondaryQuantity(
    controlledInput.secondaryImpedance,
    "impedance",
  );
  if (!impedanceResult.ok) return impedanceResult.failure;
  const secondaryImpedance = impedanceResult.quantity;
  if (!matchesSecondaryPort(secondaryImpedance, secondaryPort)) {
    return failure(
      "insufficient_data",
      "G-10.secondary_impedance_boundary_mismatch",
      "G-10 Zs does not match the declared secondary port and state.",
      "Bind Zs to the secondary reference plane, transformer, RMS basis, frequency and design/loaded state.",
    );
  }

  const turnsRatio = ratio.turnsRatio;
  const ratioSquaredResult = multiplyRepresentable(
    turnsRatio,
    turnsRatio,
    "n^2",
  );
  if (!ratioSquaredResult.ok) return operationFailure(ratioSquaredResult);
  const turnsRatioSquared = ratioSquaredResult.value;
  const primaryRealResult = multiplyRepresentable(
    turnsRatioSquared,
    secondaryImpedance.real,
    "n^2*Re(Zs)",
  );
  if (!primaryRealResult.ok) return operationFailure(primaryRealResult);
  const primaryImaginaryResult = multiplyRepresentable(
    turnsRatioSquared,
    secondaryImpedance.imaginary,
    "n^2*Im(Zs)",
  );
  if (!primaryImaginaryResult.ok)
    return operationFailure(primaryImaginaryResult);

  let powerIdentity: G10PowerIdentity;
  let secondaryCurrentSourceSnapshotId: string | null = null;
  if (controlledInput.secondaryCurrent === null) {
    powerIdentity = Object.freeze({
      kind: "not_requested",
      status: "not_applicable",
      reason: "secondaryCurrent was null",
    });
  } else {
    const currentResult = parseSecondaryQuantity(
      controlledInput.secondaryCurrent,
      "current",
    );
    if (!currentResult.ok) return currentResult.failure;
    const secondaryCurrent = currentResult.quantity;
    if (!matchesSecondaryPort(secondaryCurrent, secondaryPort)) {
      return failure(
        "insufficient_data",
        "G-10.secondary_current_boundary_mismatch",
        "G-10 optional Is does not match the declared secondary port and state.",
        "Bind Is to the same secondary reference plane, transformer, RMS basis, frequency and design/loaded state as Zs.",
      );
    }
    secondaryCurrentSourceSnapshotId = secondaryCurrent.sourceSnapshotId;
    const zs = {
      real: secondaryImpedance.real,
      imaginary: secondaryImpedance.imaginary,
    };
    const is = {
      real: secondaryCurrent.real,
      imaginary: secondaryCurrent.imaginary,
    };
    const vsResult = multiplyComplex(zs, is, "Vs=Zs*Is");
    if (!vsResult.ok) return operationFailure(vsResult.operation);
    const vpResult = scaleComplex(vsResult.value, turnsRatio, "multiply", "Vp=n*Vs");
    if (!vpResult.ok) return operationFailure(vpResult.operation);
    const ipResult = scaleComplex(is, turnsRatio, "divide", "Ip=Is/n");
    if (!ipResult.ok) return operationFailure(ipResult.operation);
    const ssResult = complexPower(vsResult.value, is, "Ss=Vs*conj(Is)");
    if (!ssResult.ok) return operationFailure(ssResult.operation);
    const spResult = complexPower(
      vpResult.value,
      ipResult.value,
      "Sp=Vp*conj(Ip)",
    );
    if (!spResult.ok) return operationFailure(spResult.operation);
    const residualReal = combineRepresentable(
      spResult.value.real,
      ssResult.value.real,
      -1,
      "Sp.real-Ss.real",
    );
    if (!residualReal.ok) return operationFailure(residualReal);
    const residualReactive = combineRepresentable(
      spResult.value.imaginary,
      ssResult.value.imaginary,
      -1,
      "Sp.reactive-Ss.reactive",
    );
    if (!residualReactive.ok) return operationFailure(residualReactive);
    powerIdentity = Object.freeze({
      kind: "available",
      status: "available",
      secondaryCurrent: Object.freeze({
        realA: is.real,
        imaginaryA: is.imaginary,
      }),
      secondaryVoltage: Object.freeze({
        realV: vsResult.value.real,
        imaginaryV: vsResult.value.imaginary,
      }),
      primaryCurrent: Object.freeze({
        realA: ipResult.value.real,
        imaginaryA: ipResult.value.imaginary,
      }),
      primaryVoltage: Object.freeze({
        realV: vpResult.value.real,
        imaginaryV: vpResult.value.imaginary,
      }),
      secondaryLoadComplexPower: Object.freeze({
        realW: ssResult.value.real,
        reactiveVar: ssResult.value.imaginary,
      }),
      primaryInputComplexPower: Object.freeze({
        realW: spResult.value.real,
        reactiveVar: spResult.value.imaginary,
      }),
      conservationResidual: Object.freeze({
        realW: residualReal.value,
        reactiveVar: residualReactive.value,
      }),
      identity:
        "Vp*conj(Ip) = Vs*conj(Is) under the declared ideal directions",
    });
  }

  const value = Object.freeze({
    Zp: Object.freeze({
      kind: "available",
      outputId: "Zp",
      status: "available",
      valueSi: Object.freeze({
        realOhm: primaryRealResult.value,
        imaginaryOhm: primaryImaginaryResult.value,
      }),
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "primary_referred_impedance_of_declared_secondary_load",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    }),
    "Vp/Vs": Object.freeze({
      kind: "available",
      outputId: "Vp/Vs",
      status: "available",
      valueSi: turnsRatio,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation: "primary_to_secondary_voltage_ratio_Np_over_Ns",
    }),
    "Is/Ip": Object.freeze({
      kind: "available",
      outputId: "Is/Ip",
      status: "available",
      valueSi: turnsRatio,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation:
        "secondary_load_to_primary_input_current_ratio_Np_over_Ns",
    }),
  }) satisfies G10IdealMatchingTransformerValue;

  const warning = Object.freeze({
    code: "G-10.core_saturation_excluded_ideal_model",
    condition:
      "ideal model excludes core saturation after explicit exclusion/negligibility confirmation",
    guardedPredicateRef: SATURATION_IGNORED_PREDICATE,
    message:
      "G-10 excludes core saturation and all other nonideal transformer effects; execution was allowed only after explicit exclusion/negligibility confirmation.",
  }) satisfies G10Warning;

  return Object.freeze({
    methodId: G10_METHOD_ID,
    methodVersion: G10_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([warning]) as readonly [G10Warning],
    value,
    powerIdentity,
    equations: Object.freeze([
      "n = Np/Ns = Vp/Vs = Is/Ip",
      "Zp = n^2*Zs",
      "Vp = n*Vs; Ip = Is/n",
      "Sp = Vp*conj(Ip) = Vs*conj(Is) = Ss",
    ]) as G10IdealMatchingTransformerSuccess["equations"],
    substitution: Object.freeze({
      turnsRatioNpOverNs: turnsRatio,
      turnsRatioSquared,
      secondaryImpedanceOhm: Object.freeze({
        realOhm: secondaryImpedance.real,
        imaginaryOhm: secondaryImpedance.imaginary,
      }),
    }),
    inputSnapshot: Object.freeze({
      topologyId: "ideal_transformer",
      modelRegime: "ideal_lossless_transformer",
      transformerId: topology.transformerId,
      ratioDefinition: "Np_over_Ns",
      primaryWindingId: ratio.primaryWindingId,
      secondaryWindingId: ratio.secondaryWindingId,
      primaryPortId: primaryPort.portId,
      secondaryPortId: secondaryPort.portId,
      primaryReferencePlaneId: primaryPort.referencePlaneId,
      secondaryReferencePlaneId: secondaryPort.referencePlaneId,
      quantityBasis: primaryPort.quantityBasis,
      loadedState: primaryPort.loadedState,
      designStateId: primaryPort.designStateId,
      frequencyHz: primaryPort.frequencyHz,
      phasorTimeConvention: "exp_j_omega_t",
      polarityConvention: "corresponding_positive_references",
      turnsRatioSourceSnapshotId: ratio.sourceSnapshotId,
      secondaryImpedanceSourceSnapshotId: secondaryImpedance.sourceSnapshotId,
      secondaryCurrentSourceSnapshotId,
    }),
    applicabilityChecks: Object.freeze([
      "topology_id is ideal_transformer and modelRegime is ideal_lossless_transformer",
      "turns ratio direction is n=Np/Ns with distinct declared windings",
      "primary and secondary ports use corresponding positive voltage references",
      "both ports share RMS/fundamental basis, frequency, loaded state and design state",
      "winding loss, leakage, magnetizing branch, core loss, saturation and parasitics are explicitly excluded or negligible",
      "no rectifier factor crosses the ideal-transformer boundary",
    ]) as G10IdealMatchingTransformerSuccess["applicabilityChecks"],
    portBoundary: Object.freeze({
      topologyId: "ideal_transformer",
      primaryCurrentDirection: "into_transformer_primary_receiving_port",
      secondaryCurrentDirection:
        "from_transformer_into_secondary_load_receiving_port",
      phasorConvention: "RMS_exp_j_omega_t",
      excludedEffects: Object.freeze([
        "winding_loss",
        "leakage_inductance",
        "magnetizing_current",
        "core_loss",
        "core_saturation",
        "parasitics_and_insulation_design",
        "rectifier_or_converter_scaling",
      ]),
    }) as G10IdealMatchingTransformerSuccess["portBoundary"],
    solverResiduals: Object.freeze({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
      powerResidualAvailable: powerIdentity.kind === "available",
      powerResidualClamped: false,
    }),
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_input_precision_and_ideal_model_applicability",
    }),
    sourceRefs: G10_SOURCE_REFS,
    contractSourceRefs: G10_CONTRACT_SOURCE_REFS,
    derivationRefs: G10_DERIVATION_REFS,
    validationCaseIds: G10_VALIDATION_CASE_IDS,
    methodCheckIds: G10_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: G10_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "ideal lossless transformer",
      "corresponding positive winding-voltage references",
      "single-frequency sinusoidal RMS phasors",
      "n is Np/Ns and is never silently inverted",
      "nonideal magnetic, winding, insulation, parasitic and converter effects are outside this method",
    ]) as G10IdealMatchingTransformerSuccess["assumptions"],
  });
}
