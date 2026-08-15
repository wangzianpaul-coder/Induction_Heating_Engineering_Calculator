import {
  LOADED_STATES,
  QUANTITY_BASES,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-07"));

export const D07_METHOD_ID = "D-07" as const;
export const D07_METHOD_VERSION = SPECIFICATION.methodVersion;
export const D07_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const D07_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const D07_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const D07_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const D07_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const D07_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D07_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: D07_BINARY64_MIN_NORMAL,
});

export const D07_SERIES_PORT_PARAMETERS_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: D07_SOURCE_REFS,
  contractSourceRefs: D07_CONTRACT_SOURCE_REFS,
  derivationRefs: D07_DERIVATION_REFS,
  validationCaseIds: D07_VALIDATION_CASE_IDS,
  methodCheckIds: D07_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: D07_NUMERIC_REPRESENTABILITY_POLICY,
});

const ZERO_RESISTANCE_FINITE_Q_PREDICATE =
  "Rs=0 but a finite Q is emitted" as const;
const PEAK_RMS_MIX_PREDICATE = "peak and RMS quantities are mixed" as const;
const UX_GRID_LABEL_PREDICATE = "UX is labelled grid voltage" as const;
const UNDEFINED_TANK_PORT_PREDICATE =
  "resonant-tank port is undefined" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `D-07 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const D07_WARNING_PREDICATES = Object.freeze({
  zeroResistanceFiniteQualityFactor: controlledWarningPredicate(
    ZERO_RESISTANCE_FINITE_Q_PREDICATE,
  ),
  peakRmsMix: controlledWarningPredicate(PEAK_RMS_MIX_PREDICATE),
  uxLabelledGridVoltage: controlledWarningPredicate(UX_GRID_LABEL_PREDICATE),
  undefinedResonantTankPort: controlledWarningPredicate(
    UNDEFINED_TANK_PORT_PREDICATE,
  ),
});

export type D07PortInterpretation =
  | "coil_series_equivalent_port"
  | "grid_side_port"
  | "resonant_tank_total_port"
  | "other_or_unknown";

export type D07ModelRegime =
  | "linear_sinusoidal_steady_state"
  | "nonlinear_or_non_sinusoidal_or_unknown";

interface D07StateBoundQuantityEvidence {
  /** Canonical-SI frequency at which this particular quantity applies. */
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  /** Stable identity of the series-equivalent R/L boundary. */
  readonly seriesEquivalentId: string;
}

export interface D07SeriesResistanceEvidence
  extends D07StateBoundQuantityEvidence {
  /** R_s in canonical SI ohms. */
  readonly resistanceOhm: number;
}

export interface D07SeriesInductanceEvidence
  extends D07StateBoundQuantityEvidence {
  /** L_s in canonical SI henries. */
  readonly inductanceH: number;
}

export interface D07CurrentEvidence extends D07StateBoundQuantityEvidence {
  /** Port-current magnitude in canonical SI amperes. */
  readonly currentA: number;
  readonly quantityBasis: QuantityBasis;
}

export interface D07SeriesPortParametersInput {
  readonly resistance: D07SeriesResistanceEvidence;
  readonly inductance: D07SeriesInductanceEvidence;
  readonly current: D07CurrentEvidence;
  readonly portInterpretation: D07PortInterpretation;
  readonly modelRegime: D07ModelRegime;
}

type D07ImpedanceOutputId = "XL" | "|Z|";
type D07VoltageOutputId = "UR" | "UX" | "Uterminal";

export interface D07AvailableImpedanceScalarOutput {
  readonly kind: "available";
  readonly outputId: D07ImpedanceOutputId;
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation:
    | "inductive_series_reactance"
    | "series_port_impedance_magnitude";
}

export interface D07AvailableComplexImpedanceOutput {
  readonly kind: "available";
  readonly outputId: "Zcomplex";
  readonly status: "available";
  readonly valueSi: Readonly<{
    readonly realOhm: number;
    readonly imaginaryOhm: number;
  }>;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "coil_series_port_complex_impedance";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface D07AvailableQualityFactorOutput {
  readonly kind: "available";
  readonly outputId: "Qs";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: "series_quality_factor_omega_L_over_R";
}

/** No numeric, dimension, or unit placeholder is legal for undefined Q_s. */
export interface D07UnavailableQualityFactorOutput {
  readonly kind: "unavailable";
  readonly outputId: "Qs";
  readonly status: "not_applicable";
  readonly reason: "series quality factor is undefined/infinite at R_s=0";
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface D07AvailableVoltageOutput {
  readonly kind: "available";
  readonly outputId: D07VoltageOutputId;
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "voltage";
  readonly canonicalUnitId: "V";
  readonly interpretation:
    | "resistive_component_at_coil_series_port"
    | "inductive_component_at_coil_series_port_not_grid_voltage"
    | "coil_series_terminal_magnitude_not_grid_or_tank_total_voltage";
}

export interface D07SeriesPortParametersValue {
  readonly XL: D07AvailableImpedanceScalarOutput;
  readonly Zcomplex: D07AvailableComplexImpedanceOutput;
  readonly "|Z|": D07AvailableImpedanceScalarOutput;
  readonly Qs:
    | D07AvailableQualityFactorOutput
    | D07UnavailableQualityFactorOutput;
  readonly UR: D07AvailableVoltageOutput;
  readonly UX: D07AvailableVoltageOutput;
  readonly Uterminal: D07AvailableVoltageOutput;
}

export interface D07AvailableDimensionlessDiagnostic {
  readonly kind: "available";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
}

export interface D07UnavailableDimensionlessDiagnostic {
  readonly kind: "unavailable";
  readonly status: "not_applicable";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface D07AvailableVoltageDiagnostic {
  readonly kind: "available";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "voltage";
  readonly canonicalUnitId: "V";
}

export interface D07UnavailableVoltageDiagnostic {
  readonly kind: "unavailable";
  readonly status: "not_applicable";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface D07InductiveOnlyApproximationDiagnostic {
  readonly classification: "diagnostic_only_engineering_approximation";
  readonly expression: "U_approx = I_rms * omega * L_s = U_X";
  readonly isReplacementForFullComplexResult: false;
  readonly thresholdApplied: false;
  readonly thresholdReason: "no frozen R_s << omega*L_s numeric threshold";
  readonly approximationVoltageV: number;
  readonly fullTerminalVoltageV: number;
  readonly absoluteMagnitudeError:
    | D07AvailableVoltageDiagnostic
    | D07UnavailableVoltageDiagnostic;
  readonly relativeMagnitudeError:
    | D07AvailableDimensionlessDiagnostic
    | D07UnavailableDimensionlessDiagnostic;
  readonly resistanceToReactanceRatio:
    | D07AvailableDimensionlessDiagnostic
    | D07UnavailableDimensionlessDiagnostic;
}

export interface D07Warning {
  readonly code: "D-07.quality_factor_unavailable_zero_resistance";
  readonly condition: "R_s=0";
  readonly guardedPredicateRef: typeof ZERO_RESISTANCE_FINITE_Q_PREDICATE;
  readonly message: string;
}

export interface D07SeriesPortParametersSuccess {
  readonly methodId: typeof D07_METHOD_ID;
  readonly methodVersion: typeof D07_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** The contract has prose warning predicates but no stable warning_id. */
  readonly warningIds: readonly [];
  readonly warnings: readonly D07Warning[];
  readonly value: D07SeriesPortParametersValue;
  readonly approximationDiagnostic: D07InductiveOnlyApproximationDiagnostic;
  readonly equations: readonly [
    "omega = 2*pi*f",
    "X_L = omega*L_s",
    "Z_s = R_s + j*X_L",
    "|Z_s| = hypot(R_s, X_L)",
    "Q_s = X_L/R_s when R_s>0",
    "U_R = I_rms*R_s; U_X = I_rms*X_L; U_terminal = I_rms*|Z_s|",
  ];
  readonly substitution: Readonly<{
    readonly resistanceOhm: number;
    readonly inductanceH: number;
    readonly frequencyHz: number;
    readonly angularFrequencyRadPerS: number;
    readonly currentA: number;
  }>;
  readonly electricalState: Readonly<{
    readonly portId: string;
    readonly referencePlaneId: string;
    readonly loadedState: LoadedState;
    readonly seriesEquivalentId: string;
    readonly quantityBasis: "rms" | "fundamental_rms";
    readonly portInterpretation: "coil_series_equivalent_port";
    readonly modelRegime: "linear_sinusoidal_steady_state";
  }>;
  readonly portBoundary: Readonly<{
    readonly resultScope: "coil_series_equivalent_port_only";
    readonly UXMeaning: "inductive_component_not_grid_voltage";
    readonly UterminalMeaning: "coil_R_plus_L_terminal_magnitude";
    readonly excludedMeanings: readonly [
      "grid_side_voltage",
      "resonant_tank_total_voltage",
    ];
  }>;
  readonly sourceRefs: typeof D07_SOURCE_REFS;
  readonly contractSourceRefs: typeof D07_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof D07_DERIVATION_REFS;
  readonly validationCaseIds: typeof D07_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof D07_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy: typeof D07_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "linear sinusoidal steady state",
    "R_s and L_s describe one series-equivalent coil port",
    "R_s, L_s and I share one frequency, port, reference plane and loaded state",
    "current is RMS or fundamental RMS under the frozen phasor convention",
    "reported voltages are coil-series-port quantities, not grid-side or total resonant-tank voltages",
  ];
  readonly failure?: never;
}

export type D07FailureCode =
  | "D-07.input_schema_invalid"
  | "D-07.resistance_evidence_missing"
  | "D-07.resistance_evidence_invalid"
  | "D-07.inductance_evidence_missing"
  | "D-07.inductance_evidence_invalid"
  | "D-07.current_evidence_missing"
  | "D-07.current_evidence_invalid"
  | "D-07.quantity_basis_invalid"
  | "D-07.quantity_basis_not_applicable"
  | "D-07.port_interpretation_invalid"
  | "D-07.port_interpretation_not_applicable"
  | "D-07.model_regime_invalid"
  | "D-07.model_regime_not_applicable"
  | "D-07.state_boundary_mismatch"
  | "D-07.numeric_resolution_invalid";

export interface D07SeriesPortParametersFailure {
  readonly methodId: typeof D07_METHOD_ID;
  readonly methodVersion: typeof D07_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: D07FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly approximationDiagnostic?: never;
}

export type D07SeriesPortParametersOutcome =
  | D07SeriesPortParametersSuccess
  | D07SeriesPortParametersFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D07_BINARY64_MIN_NORMAL;
}

function failure(
  status: D07SeriesPortParametersFailure["status"],
  code: D07FailureCode,
  message: string,
  action: string,
): D07SeriesPortParametersFailure {
  return Object.freeze({
    methodId: D07_METHOD_ID,
    methodVersion: D07_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

interface ParsedStateBoundQuantity {
  readonly valueSi: number;
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  readonly seriesEquivalentId: string;
  readonly quantityBasis?: QuantityBasis;
}

type ParsedQuantityResult =
  | { readonly ok: true; readonly quantity: ParsedStateBoundQuantity }
  | { readonly ok: false; readonly failure: D07SeriesPortParametersFailure };

function parseStateBoundQuantity(
  value: unknown,
  kind: "resistance" | "inductance" | "current",
): ParsedQuantityResult {
  const valueKey =
    kind === "resistance"
      ? "resistanceOhm"
      : kind === "inductance"
        ? "inductanceH"
        : "currentA";
  const expectedKeys = [
    valueKey,
    "frequencyHz",
    "portId",
    "referencePlaneId",
    "loadedState",
    "seriesEquivalentId",
    ...(kind === "current" ? ["quantityBasis"] : []),
  ];
  const controlled = readExactPlainDataRecord(value, expectedKeys);
  if (controlled === null) {
    const isMissing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        isMissing ? "insufficient_data" : "invalid_input",
        isMissing
          ? (`D-07.${kind}_evidence_missing` as D07FailureCode)
          : (`D-07.${kind}_evidence_invalid` as D07FailureCode),
        isMissing
          ? `D-07 requires explicit ${kind} evidence at a declared frequency, port, reference plane, loaded state and series-equivalent boundary.`
          : `D-07 ${kind} evidence must be an exact controlled plain-data record without accessors or extra fields.`,
        `Provide the frozen canonical-SI D-07 ${kind} evidence fields as plain data values.`,
      ),
    };
  }
  const numericValue = controlled[valueKey];
  if (
    typeof numericValue !== "number" ||
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    typeof controlled.frequencyHz !== "number" ||
    !Number.isFinite(controlled.frequencyHz) ||
    controlled.frequencyHz <= 0 ||
    typeof controlled.portId !== "string" ||
    controlled.portId.trim().length === 0 ||
    typeof controlled.referencePlaneId !== "string" ||
    controlled.referencePlaneId.trim().length === 0 ||
    !(LOADED_STATES as readonly unknown[]).includes(controlled.loadedState) ||
    typeof controlled.seriesEquivalentId !== "string" ||
    controlled.seriesEquivalentId.trim().length === 0
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `D-07.${kind}_evidence_invalid` as D07FailureCode,
        `D-07 ${kind} evidence contains a non-finite, negative, missing or uncontrolled value.`,
        "Use non-negative canonical-SI values, positive frequency, controlled loaded_state, and non-blank stable boundary identifiers.",
      ),
    };
  }
  if (
    kind === "current" &&
    !(QUANTITY_BASES as readonly unknown[]).includes(controlled.quantityBasis)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-07.quantity_basis_invalid",
        "D-07 current quantity_basis is not a controlled electrical basis.",
        "Use the frozen quantity-basis enumeration without coercion.",
      ),
    };
  }
  return {
    ok: true,
    quantity: Object.freeze({
      valueSi: numericValue,
      frequencyHz: controlled.frequencyHz,
      portId: controlled.portId,
      referencePlaneId: controlled.referencePlaneId,
      loadedState: controlled.loadedState as LoadedState,
      seriesEquivalentId: controlled.seriesEquivalentId,
      ...(kind === "current"
        ? { quantityBasis: controlled.quantityBasis as QuantityBasis }
        : {}),
    }),
  };
}

function sameStateBoundary(
  left: ParsedStateBoundQuantity,
  right: ParsedStateBoundQuantity,
): boolean {
  return (
    left.frequencyHz === right.frequencyHz &&
    left.portId === right.portId &&
    left.referencePlaneId === right.referencePlaneId &&
    left.loadedState === right.loadedState &&
    left.seriesEquivalentId === right.seriesEquivalentId
  );
}

function availableImpedance(
  outputId: D07ImpedanceOutputId,
  valueSi: number,
  interpretation: D07AvailableImpedanceScalarOutput["interpretation"],
): D07AvailableImpedanceScalarOutput {
  return Object.freeze({
    kind: "available",
    outputId,
    status: "available",
    valueSi,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
    interpretation,
  });
}

function availableVoltage(
  outputId: D07VoltageOutputId,
  valueSi: number,
  interpretation: D07AvailableVoltageOutput["interpretation"],
): D07AvailableVoltageOutput {
  return Object.freeze({
    kind: "available",
    outputId,
    status: "available",
    valueSi,
    dimensionId: "voltage",
    canonicalUnitId: "V",
    interpretation,
  });
}

function availableDimensionless(
  valueSi: number,
): D07AvailableDimensionlessDiagnostic {
  return Object.freeze({
    kind: "available",
    status: "available",
    valueSi,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
  });
}

function unavailableDimensionless(
  reason: string,
): D07UnavailableDimensionlessDiagnostic {
  return Object.freeze({ kind: "unavailable", status: "not_applicable", reason });
}

function availableVoltageDiagnostic(
  valueSi: number,
): D07AvailableVoltageDiagnostic {
  return Object.freeze({
    kind: "available",
    status: "available",
    valueSi,
    dimensionId: "voltage",
    canonicalUnitId: "V",
  });
}

function unavailableVoltageDiagnostic(
  reason: string,
): D07UnavailableVoltageDiagnostic {
  return Object.freeze({ kind: "unavailable", status: "not_applicable", reason });
}

/** Isolated canonical-SI implementation of frozen method D-07. */
export function evaluateD07SeriesPortParameters(
  input: D07SeriesPortParametersInput,
): D07SeriesPortParametersOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "resistance",
    "inductance",
    "current",
    "portInterpretation",
    "modelRegime",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-07.input_schema_invalid",
      "D-07 input must be an exact controlled plain-data record.",
      "Provide explicit R, L, current, port interpretation and model regime evidence.",
    );
  }

  const resistanceResult = parseStateBoundQuantity(
    controlledInput.resistance,
    "resistance",
  );
  if (!resistanceResult.ok) {
    return resistanceResult.failure;
  }
  const inductanceResult = parseStateBoundQuantity(
    controlledInput.inductance,
    "inductance",
  );
  if (!inductanceResult.ok) {
    return inductanceResult.failure;
  }
  const currentResult = parseStateBoundQuantity(
    controlledInput.current,
    "current",
  );
  if (!currentResult.ok) {
    return currentResult.failure;
  }

  if (
    controlledInput.portInterpretation !== "coil_series_equivalent_port" &&
    controlledInput.portInterpretation !== "grid_side_port" &&
    controlledInput.portInterpretation !== "resonant_tank_total_port" &&
    controlledInput.portInterpretation !== "other_or_unknown"
  ) {
    return failure(
      "invalid_input",
      "D-07.port_interpretation_invalid",
      "D-07 port interpretation is not a controlled value.",
      "Use the frozen D-07 port interpretation without coercion.",
    );
  }
  if (controlledInput.portInterpretation !== "coil_series_equivalent_port") {
    return failure(
      "not_applicable",
      "D-07.port_interpretation_not_applicable",
      "D-07 reports only the coil series-equivalent port; it does not report grid-side or total resonant-tank voltage.",
      "Select the explicit coil series-equivalent port or route the network quantity to its topology method.",
    );
  }
  if (
    controlledInput.modelRegime !== "linear_sinusoidal_steady_state" &&
    controlledInput.modelRegime !== "nonlinear_or_non_sinusoidal_or_unknown"
  ) {
    return failure(
      "invalid_input",
      "D-07.model_regime_invalid",
      "D-07 model regime is not a controlled value.",
      "Use the frozen D-07 model-regime enumeration without coercion.",
    );
  }
  if (controlledInput.modelRegime !== "linear_sinusoidal_steady_state") {
    return failure(
      "not_applicable",
      "D-07.model_regime_not_applicable",
      "D-07 requires a linear sinusoidal steady-state series equivalent.",
      "Select a method that represents the declared nonlinear or non-sinusoidal regime.",
    );
  }

  const resistance = resistanceResult.quantity;
  const inductance = inductanceResult.quantity;
  const current = currentResult.quantity;
  if (
    !sameStateBoundary(resistance, inductance) ||
    !sameStateBoundary(resistance, current)
  ) {
    return failure(
      "insufficient_data",
      "D-07.state_boundary_mismatch",
      "D-07 R_s, L_s and current do not share one frequency, port, reference plane, loaded state and series-equivalent boundary.",
      "Resolve all three quantities to one declared series-port state before evaluation.",
    );
  }
  if (current.quantityBasis !== "rms" && current.quantityBasis !== "fundamental_rms") {
    return failure(
      "not_applicable",
      "D-07.quantity_basis_not_applicable",
      "D-07 accepts only RMS or fundamental_rms current for its single-frequency phasor identities.",
      "Do not mix peak, full-wave RMS, DC, average, local or total quantities into this port method.",
    );
  }

  const resistanceOhm = resistance.valueSi;
  const inductanceH = inductance.valueSi;
  const currentA = current.valueSi;
  const frequencyHz = resistance.frequencyHz;
  const angularFrequencyRadPerS = 2 * Math.PI * frequencyHz;
  const reactanceOhm = angularFrequencyRadPerS * inductanceH;
  const impedanceMagnitudeOhm = Math.hypot(resistanceOhm, reactanceOhm);
  const resistiveVoltageV = currentA * resistanceOhm;
  const reactiveVoltageV = currentA * reactanceOhm;
  const terminalVoltageV = currentA * impedanceMagnitudeOhm;
  if (
    !Number.isFinite(angularFrequencyRadPerS) ||
    !isPositiveNormalBinary64(angularFrequencyRadPerS) ||
    !Number.isFinite(reactanceOhm) ||
    reactanceOhm < 0 ||
    (inductanceH > 0 && !isPositiveNormalBinary64(reactanceOhm)) ||
    !Number.isFinite(impedanceMagnitudeOhm) ||
    impedanceMagnitudeOhm < 0 ||
    ((resistanceOhm > 0 || reactanceOhm > 0) &&
      !isPositiveNormalBinary64(impedanceMagnitudeOhm)) ||
    !Number.isFinite(resistiveVoltageV) ||
    resistiveVoltageV < 0 ||
    (currentA > 0 &&
      resistanceOhm > 0 &&
      !isPositiveNormalBinary64(resistiveVoltageV)) ||
    !Number.isFinite(reactiveVoltageV) ||
    reactiveVoltageV < 0 ||
    (currentA > 0 &&
      inductanceH > 0 &&
      !isPositiveNormalBinary64(reactiveVoltageV)) ||
    !Number.isFinite(terminalVoltageV) ||
    terminalVoltageV < 0 ||
    (currentA > 0 &&
      impedanceMagnitudeOhm > 0 &&
      !isPositiveNormalBinary64(terminalVoltageV))
  ) {
    return failure(
      "invalid_input",
      "D-07.numeric_resolution_invalid",
      "D-07 derived a non-finite or unrepresentable impedance or voltage.",
      "Use finite, representable canonical-SI R, L, frequency and current values.",
    );
  }

  let qualityFactor:
    | D07AvailableQualityFactorOutput
    | D07UnavailableQualityFactorOutput;
  const warnings: D07Warning[] = [];
  if (resistanceOhm === 0) {
    qualityFactor = Object.freeze({
      kind: "unavailable",
      outputId: "Qs",
      status: "not_applicable",
      reason: "series quality factor is undefined/infinite at R_s=0",
    });
    warnings.push(
      Object.freeze({
        code: "D-07.quality_factor_unavailable_zero_resistance",
        condition: "R_s=0",
        guardedPredicateRef: ZERO_RESISTANCE_FINITE_Q_PREDICATE,
        message:
          "R_s is zero, so D-07 did not emit a finite Q_s; exact impedance and voltage outputs remain available.",
      }),
    );
  } else {
    const valueSi = reactanceOhm / resistanceOhm;
    if (
      !Number.isFinite(valueSi) ||
      valueSi < 0 ||
      (reactanceOhm > 0 && !isPositiveNormalBinary64(valueSi))
    ) {
      return failure(
        "invalid_input",
        "D-07.numeric_resolution_invalid",
        "D-07 could not represent the finite series quality factor.",
        "Use finite, representable canonical-SI R, L and frequency values.",
      );
    }
    qualityFactor = Object.freeze({
      kind: "available",
      outputId: "Qs",
      status: "available",
      valueSi,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation: "series_quality_factor_omega_L_over_R",
    });
  }

  const relativeErrorCandidate =
    impedanceMagnitudeOhm === 0
      ? null
      : Math.pow(resistanceOhm / impedanceMagnitudeOhm, 2) /
        (1 + reactanceOhm / impedanceMagnitudeOhm);
  const relativeMagnitudeError =
    relativeErrorCandidate === null
      ? unavailableDimensionless(
          "relative approximation error is undefined when the full impedance magnitude is zero",
        )
      : !Number.isFinite(relativeErrorCandidate) ||
          relativeErrorCandidate < 0 ||
          (resistanceOhm > 0 && relativeErrorCandidate === 0)
        ? unavailableDimensionless(
            "positive relative approximation error is below finite binary64 resolution",
          )
        : availableDimensionless(relativeErrorCandidate);
  const resistanceToReactanceCandidate =
    reactanceOhm === 0 ? null : resistanceOhm / reactanceOhm;
  const resistanceToReactanceRatio =
    resistanceToReactanceCandidate === null
      ? unavailableDimensionless(
          "R_s/(omega*L_s) is undefined when the inductive reactance is zero",
        )
      : Number.isFinite(resistanceToReactanceCandidate) &&
          !(resistanceOhm > 0 && resistanceToReactanceCandidate === 0)
        ? availableDimensionless(resistanceToReactanceCandidate)
        : unavailableDimensionless(
            "positive R_s/(omega*L_s) is outside finite binary64 representation",
          );
  const absoluteErrorCandidate =
    relativeMagnitudeError.kind === "available"
      ? terminalVoltageV * relativeMagnitudeError.valueSi
      : null;
  const absoluteMagnitudeError =
    currentA === 0 || resistanceOhm === 0 || impedanceMagnitudeOhm === 0
      ? availableVoltageDiagnostic(0)
      : absoluteErrorCandidate === null ||
          !Number.isFinite(absoluteErrorCandidate) ||
          absoluteErrorCandidate <= 0
        ? unavailableVoltageDiagnostic(
            "positive absolute approximation error is below finite binary64 resolution",
          )
        : availableVoltageDiagnostic(absoluteErrorCandidate);

  const value = Object.freeze({
    XL: availableImpedance(
      "XL",
      reactanceOhm,
      "inductive_series_reactance",
    ),
    Zcomplex: Object.freeze({
      kind: "available",
      outputId: "Zcomplex",
      status: "available",
      valueSi: Object.freeze({
        realOhm: resistanceOhm,
        imaginaryOhm: reactanceOhm,
      }),
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      interpretation: "coil_series_port_complex_impedance",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    }) as D07AvailableComplexImpedanceOutput,
    "|Z|": availableImpedance(
      "|Z|",
      impedanceMagnitudeOhm,
      "series_port_impedance_magnitude",
    ),
    Qs: qualityFactor,
    UR: availableVoltage(
      "UR",
      resistiveVoltageV,
      "resistive_component_at_coil_series_port",
    ),
    UX: availableVoltage(
      "UX",
      reactiveVoltageV,
      "inductive_component_at_coil_series_port_not_grid_voltage",
    ),
    Uterminal: availableVoltage(
      "Uterminal",
      terminalVoltageV,
      "coil_series_terminal_magnitude_not_grid_or_tank_total_voltage",
    ),
  }) satisfies D07SeriesPortParametersValue;

  return Object.freeze({
    methodId: D07_METHOD_ID,
    methodVersion: D07_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze(warnings),
    value,
    approximationDiagnostic: Object.freeze({
      classification: "diagnostic_only_engineering_approximation",
      expression: "U_approx = I_rms * omega * L_s = U_X",
      isReplacementForFullComplexResult: false,
      thresholdApplied: false,
      thresholdReason: "no frozen R_s << omega*L_s numeric threshold",
      approximationVoltageV: reactiveVoltageV,
      fullTerminalVoltageV: terminalVoltageV,
      absoluteMagnitudeError,
      relativeMagnitudeError,
      resistanceToReactanceRatio,
    }),
    equations: Object.freeze([
      "omega = 2*pi*f",
      "X_L = omega*L_s",
      "Z_s = R_s + j*X_L",
      "|Z_s| = hypot(R_s, X_L)",
      "Q_s = X_L/R_s when R_s>0",
      "U_R = I_rms*R_s; U_X = I_rms*X_L; U_terminal = I_rms*|Z_s|",
    ]) as D07SeriesPortParametersSuccess["equations"],
    substitution: Object.freeze({
      resistanceOhm,
      inductanceH,
      frequencyHz,
      angularFrequencyRadPerS,
      currentA,
    }),
    electricalState: Object.freeze({
      portId: resistance.portId,
      referencePlaneId: resistance.referencePlaneId,
      loadedState: resistance.loadedState,
      seriesEquivalentId: resistance.seriesEquivalentId,
      quantityBasis: current.quantityBasis,
      portInterpretation: "coil_series_equivalent_port",
      modelRegime: "linear_sinusoidal_steady_state",
    }),
    portBoundary: Object.freeze({
      resultScope: "coil_series_equivalent_port_only",
      UXMeaning: "inductive_component_not_grid_voltage",
      UterminalMeaning: "coil_R_plus_L_terminal_magnitude",
      excludedMeanings: Object.freeze([
        "grid_side_voltage",
        "resonant_tank_total_voltage",
      ]) as D07SeriesPortParametersSuccess["portBoundary"]["excludedMeanings"],
    }),
    sourceRefs: D07_SOURCE_REFS,
    contractSourceRefs: D07_CONTRACT_SOURCE_REFS,
    derivationRefs: D07_DERIVATION_REFS,
    validationCaseIds: D07_VALIDATION_CASE_IDS,
    methodCheckIds: D07_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: D07_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "linear sinusoidal steady state",
      "R_s and L_s describe one series-equivalent coil port",
      "R_s, L_s and I share one frequency, port, reference plane and loaded state",
      "current is RMS or fundamental RMS under the frozen phasor convention",
      "reported voltages are coil-series-port quantities, not grid-side or total resonant-tank voltages",
    ]) as D07SeriesPortParametersSuccess["assumptions"],
  });
}
