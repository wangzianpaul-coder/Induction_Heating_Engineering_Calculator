import {
  LOADED_STATES,
  QUANTITY_BASES,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import { isContentAddressedSnapshotId } from "../../domain/ids.js";
import { deepFreeze } from "../../serialization/canonical-json.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { methodId } from "../../domain/ids.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-01"));

export const F01_METHOD_ID = "F-01" as const;
export const F01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const F01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const F01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const F01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const F01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const F01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const F01_BINARY64_MIN_NORMAL = 2 ** -1022;

export const F01_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  boundaryKind: "machine_numeric_representability_only" as const,
  binary64MinimumNormal: F01_BINARY64_MIN_NORMAL,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  swallowedNonzeroTermPolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const F01_REFLECTED_IMPEDANCE_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: F01_SOURCE_REFS,
  contractSourceRefs: F01_CONTRACT_SOURCE_REFS,
  derivationRefs: F01_DERIVATION_REFS,
  validationCaseIds: F01_VALIDATION_CASE_IDS,
  methodCheckIds: F01_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  numericRepresentabilityPolicy: F01_NUMERIC_REPRESENTABILITY_POLICY,
});

export const F01_PARAMETER_SOURCE_KINDS = Object.freeze([
  "measurement",
  "limited_analytical",
  "fem",
  "user_input_with_source",
  "geometry_guess_or_unproven",
] as const);
export type F01ParameterSourceKind =
  (typeof F01_PARAMETER_SOURCE_KINDS)[number];

export type F01StateMatch =
  | "confirmed_for_declared_state"
  | "unconfirmed_or_mismatched";

export type F01ModelRegime =
  | "linear_lumped_sinusoidal_steady_state"
  | "nonlinear_distributed_or_non_sinusoidal_or_unknown";

interface F01SeriesParameterSnapshotBase {
  /** Fundamental frequency in canonical SI hertz. */
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly quantityBasis: QuantityBasis;
  readonly loadedState: LoadedState;
  readonly materialStateId: string;
  readonly temperatureK: number;
  readonly caseSnapshotId: string;
  readonly materialSnapshotId: string;
  /** Stable identity of this complete coupled-circuit operating state. */
  readonly coupledCircuitStateId: string;
  readonly parameterSourceKind: F01ParameterSourceKind;
  readonly sourceRef: string;
  readonly stateMatch: F01StateMatch;
}

export interface F01PrimaryParameterSnapshot
  extends F01SeriesParameterSnapshotBase {
  /** R1 in canonical SI ohms. */
  readonly resistanceOhm: number;
  /** Lp in canonical SI henries. */
  readonly inductanceH: number;
}

export interface F01SecondaryParameterSnapshot
  extends F01SeriesParameterSnapshotBase {
  /** R2 in canonical SI ohms. */
  readonly resistanceOhm: number;
  /** Ls in canonical SI henries. */
  readonly inductanceH: number;
}

export interface F01MutualParameterSnapshot {
  /** Signed mutual inductance M in canonical SI henries. */
  readonly mutualInductanceH: number;
  readonly frequencyHz: number;
  readonly primaryPortId: string;
  readonly secondaryPortId: string;
  readonly primaryReferencePlaneId: string;
  readonly secondaryReferencePlaneId: string;
  readonly quantityBasis: QuantityBasis;
  readonly loadedState: LoadedState;
  readonly primaryMaterialStateId: string;
  readonly secondaryMaterialStateId: string;
  readonly primaryTemperatureK: number;
  readonly secondaryTemperatureK: number;
  readonly caseSnapshotId: string;
  readonly primaryMaterialSnapshotId: string;
  readonly secondaryMaterialSnapshotId: string;
  readonly coupledCircuitStateId: string;
  readonly parameterSourceKind: F01ParameterSourceKind;
  readonly sourceRef: string;
  readonly stateMatch: F01StateMatch;
}

export interface F01ReflectedImpedanceInput {
  readonly primary: F01PrimaryParameterSnapshot;
  readonly secondary: F01SecondaryParameterSnapshot;
  readonly mutual: F01MutualParameterSnapshot;
  readonly modelRegime: F01ModelRegime;
}

export interface F01AvailableResistanceOutput {
  readonly kind: "available";
  readonly status: "available";
  readonly outputId: "Req" | "Rref";
  readonly valueSi: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
}

export interface F01AvailableInductanceOutput {
  readonly kind: "available";
  readonly status: "available";
  readonly outputId: "Leq";
  readonly valueSi: number;
  readonly dimensionId: "inductance";
  readonly canonicalUnitId: "H";
}

export interface F01AvailableCouplingOutput {
  readonly kind: "available";
  readonly status: "available";
  readonly outputId: "k";
  /** Signed k preserves the declared winding/dot orientation; passivity uses |k|. */
  readonly valueSi: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
}

export interface F01AvailableComplexImpedanceOutput {
  readonly kind: "available";
  readonly status: "available";
  readonly outputId: "Zin";
  readonly valueSi: Readonly<{
    readonly realOhm: number;
    readonly imaginaryOhm: number;
  }>;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly phasorConvention: "RMS_exp_j_omega_t_passive_sign";
}

export interface F01ReflectedImpedanceValue {
  readonly Zin: F01AvailableComplexImpedanceOutput;
  readonly Req: F01AvailableResistanceOutput;
  readonly Rref: F01AvailableResistanceOutput;
  readonly Leq: F01AvailableInductanceOutput;
  readonly k: F01AvailableCouplingOutput;
}

export interface F01PassivityChecks {
  readonly couplingMagnitudeWithinUnity: true;
  readonly reflectedResistanceNonNegative: true;
  readonly equivalentResistanceNonNegative: true;
  readonly equivalentInductanceNonNegative: true;
  readonly inputReactanceNonNegative: true;
  readonly passiveUnitCurrentReflectedPowerW: number;
}

export interface F01ReflectedImpedanceTrace {
  readonly path: readonly [
    "Result",
    "Method and Version",
    "Input Snapshot",
    "Material States",
    "Equation and Substitution",
    "Source",
    "Assumptions",
    "Applicability Checks",
    "Warnings",
    "Solver Residuals",
  ];
  readonly result: F01ReflectedImpedanceValue;
  readonly methodAndVersion: Readonly<{
    readonly methodId: typeof F01_METHOD_ID;
    readonly methodVersion: typeof F01_METHOD_VERSION;
    readonly approvalStatus: "approved_with_limitation";
    readonly resultProvenance: "estimated";
    readonly scientificConfidence: "high";
  }>;
  readonly inputSnapshot: Readonly<{
    readonly primary: Readonly<F01PrimaryParameterSnapshot>;
    readonly secondary: Readonly<F01SecondaryParameterSnapshot>;
    readonly mutual: Readonly<F01MutualParameterSnapshot>;
  }>;
  readonly materialStates: Readonly<{
    readonly primaryMaterialStateId: string;
    readonly secondaryMaterialStateId: string;
    readonly primaryMaterialSnapshotId: string;
    readonly secondaryMaterialSnapshotId: string;
    readonly primaryTemperatureK: number;
    readonly secondaryTemperatureK: number;
  }>;
  readonly equationAndSubstitution: Readonly<{
    readonly equations: readonly [
      "omega = 2*pi*f",
      "Z2 = R2 + j*omega*Ls",
      "Zin = R1 + j*omega*Lp + omega^2*M^2/(R2 + j*omega*Ls)",
      "Rref = omega^2*M^2*R2/(R2^2 + (omega*Ls)^2)",
      "Leq = Lp - omega^2*M^2*Ls/(R2^2 + (omega*Ls)^2)",
      "Req = R1 + Rref",
      "k = M/sqrt(Lp*Ls)",
    ];
    readonly substitution: Readonly<{
      readonly primaryResistanceOhm: number;
      readonly primaryInductanceH: number;
      readonly secondaryResistanceOhm: number;
      readonly secondaryInductanceH: number;
      readonly mutualInductanceH: number;
      readonly frequencyHz: number;
      readonly angularFrequencyRadPerS: number;
      readonly primarySecondaryInductanceProductH2: number;
      readonly couplingLimitH: number;
      readonly secondaryReactanceOhm: number;
      readonly denominatorOhm2: number;
      readonly omegaSquaredMutualSquaredOhm2: number;
      readonly reflectedResistanceOhm: number;
      readonly reflectedReactanceOhm: number;
      readonly equivalentResistanceOhm: number;
      readonly equivalentInductanceH: number;
      readonly inputReactanceOhm: number;
      readonly inputReactanceFromLeqOhm: number;
      readonly inputReactanceIdentityResidualOhm: number;
      readonly inputReactanceIdentityToleranceOhm: number;
      readonly couplingCoefficient: number;
    }>;
  }>;
  readonly source: Readonly<{
    readonly equationRef: typeof SPECIFICATION.contractEquationRef;
    readonly sourceRefs: typeof F01_SOURCE_REFS;
    readonly contractSourceRefs: typeof F01_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof F01_DERIVATION_REFS;
    readonly validationCaseIds: typeof F01_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof F01_METHOD_CHECK_IDS;
    readonly validationStatus: "specified";
    readonly externalModelEvidenceRole: "scope_only_not_equation_source";
  }>;
  readonly assumptions: typeof F01_ASSUMPTIONS;
  readonly applicabilityChecks: Readonly<{
    readonly modelRegime: "linear_lumped_sinusoidal_steady_state";
    readonly parameterStateMatch: "confirmed_for_declared_state";
    readonly sameFrequencyAndOperatingState: true;
    readonly explicitPrimaryAndSecondaryPorts: true;
    readonly mutualParameterProvenanceAccepted: true;
    readonly geometryToMutualInductanceDerivationPerformed: false;
    readonly passivity: F01PassivityChecks;
  }>;
  readonly warnings: readonly [];
  readonly solverResiduals: readonly [];
}

export const F01_ASSUMPTIONS = Object.freeze([
  "linear lumped two-winding equivalent",
  "sinusoidal steady state under the frozen RMS exp(j*omega*t) passive-sign convention",
  "R1/Lp, R2/Ls and M belong to one declared coupled-circuit operating state and frequency",
  "primary and secondary material temperatures may differ physically but each is state-matched across its parameter snapshots",
  "the supplied secondary equivalent is interpretable at its declared port and reference plane",
  "M, R2 and Ls come from explicit measurement, limited analysis, FEM, or sourced user input; geometry is not used to guess them",
] as const);

export interface F01ReflectedImpedanceSuccess {
  readonly methodId: typeof F01_METHOD_ID;
  readonly methodVersion: typeof F01_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly resultProvenance: "estimated";
  readonly scientificConfidence: "high";
  readonly value: F01ReflectedImpedanceValue;
  readonly evidence: Readonly<{
    readonly primaryParameterSnapshot: Readonly<F01PrimaryParameterSnapshot>;
    readonly secondaryParameterSnapshot: Readonly<F01SecondaryParameterSnapshot>;
    readonly mutualParameterSnapshot: Readonly<F01MutualParameterSnapshot>;
    readonly passivityChecks: F01PassivityChecks;
    readonly recommendation: Readonly<{
      readonly eligibility: "not_eligible";
      readonly isRecommended: false;
      readonly preferredActualEquipmentMethodId: "F-02";
      readonly reason: string;
    }>;
    readonly numericRepresentabilityPolicy: typeof F01_NUMERIC_REPRESENTABILITY_POLICY;
  }>;
  readonly trace: F01ReflectedImpedanceTrace;
  readonly sourceRefs: typeof F01_SOURCE_REFS;
  readonly contractSourceRefs: typeof F01_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof F01_DERIVATION_REFS;
  readonly validationCaseIds: typeof F01_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof F01_METHOD_CHECK_IDS;
  readonly failure?: never;
}

export type F01FailureCode =
  | "F-01.input_schema_invalid"
  | "F-01.primary_snapshot_missing"
  | "F-01.primary_snapshot_invalid"
  | "F-01.secondary_snapshot_missing"
  | "F-01.secondary_snapshot_invalid"
  | "F-01.mutual_snapshot_missing"
  | "F-01.mutual_snapshot_invalid"
  | "F-01.model_regime_invalid"
  | "F-01.model_regime_not_applicable"
  | "F-01.quantity_basis_not_applicable"
  | "F-01.parameter_provenance_insufficient"
  | "F-01.snapshot_state_mismatch"
  | "F-01.port_mapping_invalid"
  | "F-01.coupling_out_of_domain"
  | "F-01.numeric_resolution_invalid"
  | "F-01.passivity_check_failed";

export interface F01ReflectedImpedanceFailure {
  readonly methodId: typeof F01_METHOD_ID;
  readonly methodVersion: typeof F01_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: F01FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly trace?: never;
  readonly resultProvenance?: never;
}

export type F01ReflectedImpedanceOutcome =
  | F01ReflectedImpedanceSuccess
  | F01ReflectedImpedanceFailure;

const EMPTY_ARRAY = Object.freeze([]) as readonly [];
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;

function failure(
  status: F01ReflectedImpedanceFailure["status"],
  code: F01FailureCode,
  message: string,
  action: string,
): F01ReflectedImpedanceFailure {
  return Object.freeze({
    methodId: F01_METHOD_ID,
    methodVersion: F01_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_ARRAY,
    warnings: EMPTY_ARRAY,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableId(value: unknown): value is string {
  return typeof value === "string" && STABLE_ID_PATTERN.test(value);
}

function isStateMatch(value: unknown): value is F01StateMatch {
  return (
    value === "confirmed_for_declared_state" ||
    value === "unconfirmed_or_mismatched"
  );
}

function isParameterSourceKind(
  value: unknown,
): value is F01ParameterSourceKind {
  return (
    typeof value === "string" &&
    (F01_PARAMETER_SOURCE_KINDS as readonly string[]).includes(value)
  );
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isZeroOrNormal(value: number): boolean {
  return value === 0 || Math.abs(value) >= F01_BINARY64_MIN_NORMAL;
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= F01_BINARY64_MIN_NORMAL;
}

function isResolvedPositiveProduct(value: number): boolean {
  return Number.isFinite(value) && value >= F01_BINARY64_MIN_NORMAL;
}

type ParsedSeriesSnapshotResult<TSnapshot> =
  | { readonly ok: true; readonly snapshot: Readonly<TSnapshot> }
  | { readonly ok: false; readonly failure: F01ReflectedImpedanceFailure };

const SERIES_SNAPSHOT_KEYS = Object.freeze([
  "resistanceOhm",
  "inductanceH",
  "frequencyHz",
  "portId",
  "referencePlaneId",
  "quantityBasis",
  "loadedState",
  "materialStateId",
  "temperatureK",
  "caseSnapshotId",
  "materialSnapshotId",
  "coupledCircuitStateId",
  "parameterSourceKind",
  "sourceRef",
  "stateMatch",
] as const);

function parseSeriesSnapshot<TSnapshot extends F01SeriesParameterSnapshotBase & {
  readonly resistanceOhm: number;
  readonly inductanceH: number;
}>(
  value: unknown,
  role: "primary" | "secondary",
): ParsedSeriesSnapshotResult<TSnapshot> {
  const record = readExactPlainDataRecord(value, SERIES_SNAPSHOT_KEYS);
  if (record === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? `F-01.${role}_snapshot_missing`
          : `F-01.${role}_snapshot_invalid`,
        missing
          ? `F-01 requires an explicit ${role} R/L parameter snapshot.`
          : `The F-01 ${role} snapshot must be an exact controlled plain-data record without accessors or extra fields.`,
        `Provide the complete canonical-SI F-01 ${role} snapshot and provenance fields.`,
      ),
    };
  }

  if (
    !isFiniteNonNegative(record.resistanceOhm) ||
    !isFinitePositive(record.inductanceH) ||
    !isFinitePositive(record.frequencyHz) ||
    !isStableId(record.portId) ||
    !isStableId(record.referencePlaneId) ||
    typeof record.quantityBasis !== "string" ||
    !(QUANTITY_BASES as readonly string[]).includes(record.quantityBasis) ||
    typeof record.loadedState !== "string" ||
    !(LOADED_STATES as readonly string[]).includes(record.loadedState) ||
    !isStableId(record.materialStateId) ||
    !isFinitePositive(record.temperatureK) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableId(record.coupledCircuitStateId) ||
    !isParameterSourceKind(record.parameterSourceKind) ||
    !isStableId(record.sourceRef) ||
    !isStateMatch(record.stateMatch)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        `F-01.${role}_snapshot_invalid`,
        `The F-01 ${role} snapshot contains a non-SI, non-finite, out-of-range, uncontrolled, or incomplete field.`,
        "Use finite canonical-SI R/L/f/T values and controlled content-addressed snapshot, state, port, basis, and source identifiers.",
      ),
    };
  }

  return {
    ok: true,
    snapshot: Object.freeze({
      resistanceOhm: record.resistanceOhm,
      inductanceH: record.inductanceH,
      frequencyHz: record.frequencyHz,
      portId: record.portId,
      referencePlaneId: record.referencePlaneId,
      quantityBasis: record.quantityBasis as QuantityBasis,
      loadedState: record.loadedState as LoadedState,
      materialStateId: record.materialStateId,
      temperatureK: record.temperatureK,
      caseSnapshotId: record.caseSnapshotId,
      materialSnapshotId: record.materialSnapshotId,
      coupledCircuitStateId: record.coupledCircuitStateId,
      parameterSourceKind:
        record.parameterSourceKind as F01ParameterSourceKind,
      sourceRef: record.sourceRef,
      stateMatch: record.stateMatch as F01StateMatch,
    }) as unknown as Readonly<TSnapshot>,
  };
}

const MUTUAL_SNAPSHOT_KEYS = Object.freeze([
  "mutualInductanceH",
  "frequencyHz",
  "primaryPortId",
  "secondaryPortId",
  "primaryReferencePlaneId",
  "secondaryReferencePlaneId",
  "quantityBasis",
  "loadedState",
  "primaryMaterialStateId",
  "secondaryMaterialStateId",
  "primaryTemperatureK",
  "secondaryTemperatureK",
  "caseSnapshotId",
  "primaryMaterialSnapshotId",
  "secondaryMaterialSnapshotId",
  "coupledCircuitStateId",
  "parameterSourceKind",
  "sourceRef",
  "stateMatch",
] as const);

function parseMutualSnapshot(
  value: unknown,
): ParsedSeriesSnapshotResult<F01MutualParameterSnapshot> {
  const record = readExactPlainDataRecord(value, MUTUAL_SNAPSHOT_KEYS);
  if (record === null) {
    const missing = value === null || value === undefined;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "F-01.mutual_snapshot_missing"
          : "F-01.mutual_snapshot_invalid",
        missing
          ? "F-01 requires explicit mutual-inductance snapshot evidence; it never guesses M from geometry."
          : "The F-01 mutual snapshot must be an exact controlled plain-data record without accessors or extra fields.",
        "Provide canonical-SI M with both ports, both material states, content-addressed snapshots, and an accepted provenance source.",
      ),
    };
  }

  if (
    typeof record.mutualInductanceH !== "number" ||
    !Number.isFinite(record.mutualInductanceH) ||
    !isFinitePositive(record.frequencyHz) ||
    !isStableId(record.primaryPortId) ||
    !isStableId(record.secondaryPortId) ||
    !isStableId(record.primaryReferencePlaneId) ||
    !isStableId(record.secondaryReferencePlaneId) ||
    typeof record.quantityBasis !== "string" ||
    !(QUANTITY_BASES as readonly string[]).includes(record.quantityBasis) ||
    typeof record.loadedState !== "string" ||
    !(LOADED_STATES as readonly string[]).includes(record.loadedState) ||
    !isStableId(record.primaryMaterialStateId) ||
    !isStableId(record.secondaryMaterialStateId) ||
    !isFinitePositive(record.primaryTemperatureK) ||
    !isFinitePositive(record.secondaryTemperatureK) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(
      record.primaryMaterialSnapshotId,
      "material",
    ) ||
    !isContentAddressedSnapshotId(
      record.secondaryMaterialSnapshotId,
      "material",
    ) ||
    !isStableId(record.coupledCircuitStateId) ||
    !isParameterSourceKind(record.parameterSourceKind) ||
    !isStableId(record.sourceRef) ||
    !isStateMatch(record.stateMatch)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-01.mutual_snapshot_invalid",
        "The F-01 mutual snapshot contains a non-SI, non-finite, uncontrolled, or incomplete parameter/state/provenance field.",
        "Use finite canonical-SI M/f/T values and controlled content-addressed snapshot, state, port, basis, and source identifiers.",
      ),
    };
  }

  return {
    ok: true,
    snapshot: Object.freeze({
      mutualInductanceH: record.mutualInductanceH,
      frequencyHz: record.frequencyHz,
      primaryPortId: record.primaryPortId,
      secondaryPortId: record.secondaryPortId,
      primaryReferencePlaneId: record.primaryReferencePlaneId,
      secondaryReferencePlaneId: record.secondaryReferencePlaneId,
      quantityBasis: record.quantityBasis as QuantityBasis,
      loadedState: record.loadedState as LoadedState,
      primaryMaterialStateId: record.primaryMaterialStateId,
      secondaryMaterialStateId: record.secondaryMaterialStateId,
      primaryTemperatureK: record.primaryTemperatureK,
      secondaryTemperatureK: record.secondaryTemperatureK,
      caseSnapshotId: record.caseSnapshotId,
      primaryMaterialSnapshotId: record.primaryMaterialSnapshotId,
      secondaryMaterialSnapshotId: record.secondaryMaterialSnapshotId,
      coupledCircuitStateId: record.coupledCircuitStateId,
      parameterSourceKind:
        record.parameterSourceKind as F01ParameterSourceKind,
      sourceRef: record.sourceRef,
      stateMatch: record.stateMatch as F01StateMatch,
    }),
  };
}

function isAcceptedPhasorBasis(value: QuantityBasis): boolean {
  return value === "rms" || value === "fundamental_rms";
}

function hasAcceptedParameterProvenance(
  sourceKind: F01ParameterSourceKind,
): boolean {
  return sourceKind !== "geometry_guess_or_unproven";
}

function stateSnapshotsMatch(
  primary: Readonly<F01PrimaryParameterSnapshot>,
  secondary: Readonly<F01SecondaryParameterSnapshot>,
  mutual: Readonly<F01MutualParameterSnapshot>,
): boolean {
  return (
    primary.frequencyHz === secondary.frequencyHz &&
    primary.frequencyHz === mutual.frequencyHz &&
    primary.quantityBasis === secondary.quantityBasis &&
    primary.quantityBasis === mutual.quantityBasis &&
    primary.loadedState === secondary.loadedState &&
    primary.loadedState === mutual.loadedState &&
    primary.caseSnapshotId === secondary.caseSnapshotId &&
    primary.caseSnapshotId === mutual.caseSnapshotId &&
    primary.coupledCircuitStateId === secondary.coupledCircuitStateId &&
    primary.coupledCircuitStateId === mutual.coupledCircuitStateId &&
    primary.portId === mutual.primaryPortId &&
    secondary.portId === mutual.secondaryPortId &&
    primary.referencePlaneId === mutual.primaryReferencePlaneId &&
    secondary.referencePlaneId === mutual.secondaryReferencePlaneId &&
    primary.materialStateId === mutual.primaryMaterialStateId &&
    secondary.materialStateId === mutual.secondaryMaterialStateId &&
    primary.temperatureK === mutual.primaryTemperatureK &&
    secondary.temperatureK === mutual.secondaryTemperatureK &&
    primary.materialSnapshotId === mutual.primaryMaterialSnapshotId &&
    secondary.materialSnapshotId === mutual.secondaryMaterialSnapshotId
  );
}

function availableResistance(
  outputId: "Req" | "Rref",
  valueSi: number,
): F01AvailableResistanceOutput {
  return Object.freeze({
    kind: "available",
    status: "available",
    outputId,
    valueSi,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
  });
}

function numericFailure(): F01ReflectedImpedanceFailure {
  return failure(
    "invalid_input",
    "F-01.numeric_resolution_invalid",
    "A required positive F-01 source-equation term or output overflowed, underflowed, became subnormal, or was swallowed by binary64 arithmetic.",
    "Rescale the physical problem upstream or use a higher-precision audited implementation; do not substitute zero, infinity, or a rounded-away reflected term.",
  );
}

/** Isolated canonical-SI implementation of frozen method F-01. */
export function evaluateF01ReflectedImpedance(
  input: F01ReflectedImpedanceInput,
): F01ReflectedImpedanceOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "primary",
    "secondary",
    "mutual",
    "modelRegime",
  ]);
  if (controlledInput === null) {
    return failure(
      input === null || input === undefined
        ? "insufficient_data"
        : "invalid_input",
      "F-01.input_schema_invalid",
      "F-01 input must be an exact controlled record containing primary, secondary, mutual, and modelRegime fields.",
      "Provide all frozen F-01 inputs without accessors, symbols, prototypes, or extra fields.",
    );
  }

  if (
    controlledInput.modelRegime !==
      "linear_lumped_sinusoidal_steady_state" &&
    controlledInput.modelRegime !==
      "nonlinear_distributed_or_non_sinusoidal_or_unknown"
  ) {
    return failure(
      "invalid_input",
      "F-01.model_regime_invalid",
      "The F-01 model regime is not a controlled value.",
      "Select the frozen linear-lumped sinusoidal regime or the explicit out-of-domain regime.",
    );
  }

  const primaryResult = parseSeriesSnapshot<F01PrimaryParameterSnapshot>(
    controlledInput.primary,
    "primary",
  );
  if (!primaryResult.ok) {
    return primaryResult.failure;
  }
  const secondaryResult = parseSeriesSnapshot<F01SecondaryParameterSnapshot>(
    controlledInput.secondary,
    "secondary",
  );
  if (!secondaryResult.ok) {
    return secondaryResult.failure;
  }
  const mutualResult = parseMutualSnapshot(controlledInput.mutual);
  if (!mutualResult.ok) {
    return mutualResult.failure;
  }

  const primary = primaryResult.snapshot;
  const secondary = secondaryResult.snapshot;
  const mutual = mutualResult.snapshot;

  if (
    controlledInput.modelRegime ===
    "nonlinear_distributed_or_non_sinusoidal_or_unknown"
  ) {
    return failure(
      "not_applicable",
      "F-01.model_regime_not_applicable",
      "F-01 is limited to a linear lumped two-winding sinusoidal steady-state model.",
      "Use same-state measurement (F-02) or an independently validated FEM/circuit model for this regime.",
    );
  }

  if (
    !isAcceptedPhasorBasis(primary.quantityBasis) ||
    !isAcceptedPhasorBasis(secondary.quantityBasis) ||
    !isAcceptedPhasorBasis(mutual.quantityBasis)
  ) {
    return failure(
      "not_applicable",
      "F-01.quantity_basis_not_applicable",
      "F-01 requires RMS or fundamental-RMS sinusoidal phasor parameters at both ports.",
      "Provide one controlled RMS phasor basis; do not mix peak, full-wave, DC, local, or total quantities.",
    );
  }

  if (
    primary.stateMatch !== "confirmed_for_declared_state" ||
    secondary.stateMatch !== "confirmed_for_declared_state" ||
    mutual.stateMatch !== "confirmed_for_declared_state" ||
    !hasAcceptedParameterProvenance(primary.parameterSourceKind) ||
    !hasAcceptedParameterProvenance(secondary.parameterSourceKind) ||
    !hasAcceptedParameterProvenance(mutual.parameterSourceKind)
  ) {
    return failure(
      "insufficient_data",
      "F-01.parameter_provenance_insufficient",
      "One or more F-01 parameters lack confirmed same-state provenance or were guessed from unproven geometry.",
      "Supply M, R2 and Ls from explicit measurement, limited analysis, FEM, or sourced user input at the declared state.",
    );
  }

  if (primary.portId === secondary.portId) {
    return failure(
      "invalid_input",
      "F-01.port_mapping_invalid",
      "The F-01 primary and secondary equivalent ports must have distinct stable identifiers.",
      "Declare the two coupled ports and their reference planes explicitly.",
    );
  }

  if (!stateSnapshotsMatch(primary, secondary, mutual)) {
    return failure(
      "insufficient_data",
      "F-01.snapshot_state_mismatch",
      "R1/Lp, R2/Ls and M do not share one frequency, phasor basis, loading/circuit state, port mapping, case snapshot, or corresponding material state.",
      "Resolve all three parameter snapshots at one immutable coupled-circuit operating state; do not mix cold/hot or different-frequency parameters.",
    );
  }

  const r1 = primary.resistanceOhm;
  const lp = primary.inductanceH;
  const r2 = secondary.resistanceOhm;
  const ls = secondary.inductanceH;
  const mutualInductance = mutual.mutualInductanceH;
  const frequency = primary.frequencyHz;

  if (
    !isZeroOrNormal(r1) ||
    !isPositiveNormal(lp) ||
    !isZeroOrNormal(r2) ||
    !isPositiveNormal(ls) ||
    !isZeroOrNormal(mutualInductance) ||
    !isPositiveNormal(frequency) ||
    !isPositiveNormal(primary.temperatureK) ||
    !isPositiveNormal(secondary.temperatureK)
  ) {
    return numericFailure();
  }

  const primarySecondaryInductanceProduct = lp * ls;
  if (!isResolvedPositiveProduct(primarySecondaryInductanceProduct)) {
    return numericFailure();
  }
  const couplingLimit = Math.sqrt(primarySecondaryInductanceProduct);
  if (!isPositiveNormal(couplingLimit)) {
    return numericFailure();
  }
  const couplingCoefficient = mutualInductance / couplingLimit;
  if (
    !Number.isFinite(couplingCoefficient) ||
    (mutualInductance !== 0 &&
      Math.abs(couplingCoefficient) < F01_BINARY64_MIN_NORMAL)
  ) {
    return numericFailure();
  }
  if (Math.abs(mutualInductance) > couplingLimit || Math.abs(couplingCoefficient) > 1) {
    return failure(
      "not_applicable",
      "F-01.coupling_out_of_domain",
      "The supplied mutual inductance violates |M| <= sqrt(Lp*Ls), so the declared linear passive model is outside the F-01 domain.",
      "Correct the same-state parameter evidence; do not clamp k or M to the passive boundary.",
    );
  }

  const angularFrequency = 2 * Math.PI * frequency;
  const angularFrequencySquared = angularFrequency * angularFrequency;
  const secondaryReactance = angularFrequency * ls;
  const secondaryResistanceSquared = r2 * r2;
  const secondaryReactanceSquared = secondaryReactance * secondaryReactance;
  if (
    !isPositiveNormal(angularFrequency) ||
    !isResolvedPositiveProduct(angularFrequencySquared) ||
    !isResolvedPositiveProduct(secondaryReactance) ||
    (r2 !== 0 && !isResolvedPositiveProduct(secondaryResistanceSquared)) ||
    !isResolvedPositiveProduct(secondaryReactanceSquared)
  ) {
    return numericFailure();
  }

  const denominator = secondaryResistanceSquared + secondaryReactanceSquared;
  if (
    !isResolvedPositiveProduct(denominator) ||
    (secondaryResistanceSquared > 0 &&
      secondaryReactanceSquared > 0 &&
      (denominator === secondaryResistanceSquared ||
        denominator === secondaryReactanceSquared))
  ) {
    return numericFailure();
  }

  const mutualSquared = mutualInductance * mutualInductance;
  if (
    mutualInductance !== 0 &&
    !isResolvedPositiveProduct(mutualSquared)
  ) {
    return numericFailure();
  }
  const omegaSquaredMutualSquared = angularFrequencySquared * mutualSquared;
  if (
    mutualInductance !== 0 &&
    !isResolvedPositiveProduct(omegaSquaredMutualSquared)
  ) {
    return numericFailure();
  }

  const reflectedResistanceNumerator = omegaSquaredMutualSquared * r2;
  const reflectedReactanceMagnitudeNumerator =
    omegaSquaredMutualSquared * secondaryReactance;
  const equivalentInductanceReductionNumerator =
    omegaSquaredMutualSquared * ls;
  if (
    (omegaSquaredMutualSquared > 0 &&
      r2 > 0 &&
      !isResolvedPositiveProduct(reflectedResistanceNumerator)) ||
    (omegaSquaredMutualSquared > 0 &&
      !isResolvedPositiveProduct(reflectedReactanceMagnitudeNumerator)) ||
    (omegaSquaredMutualSquared > 0 &&
      !isResolvedPositiveProduct(equivalentInductanceReductionNumerator))
  ) {
    return numericFailure();
  }

  const reflectedResistance = reflectedResistanceNumerator / denominator;
  const reflectedReactanceMagnitude =
    reflectedReactanceMagnitudeNumerator / denominator;
  const equivalentInductanceReduction =
    equivalentInductanceReductionNumerator / denominator;
  if (
    !Number.isFinite(reflectedResistance) ||
    !Number.isFinite(reflectedReactanceMagnitude) ||
    !Number.isFinite(equivalentInductanceReduction) ||
    (reflectedResistanceNumerator > 0 &&
      !isPositiveNormal(reflectedResistance)) ||
    (reflectedReactanceMagnitudeNumerator > 0 &&
      !isPositiveNormal(reflectedReactanceMagnitude)) ||
    (equivalentInductanceReductionNumerator > 0 &&
      !isPositiveNormal(equivalentInductanceReduction))
  ) {
    return numericFailure();
  }

  const equivalentResistance = r1 + reflectedResistance;
  if (
    !Number.isFinite(equivalentResistance) ||
    (r1 > 0 &&
      reflectedResistance > 0 &&
      (equivalentResistance === r1 ||
        equivalentResistance === reflectedResistance))
  ) {
    return numericFailure();
  }

  const equivalentInductance = lp - equivalentInductanceReduction;
  const primaryReactance = angularFrequency * lp;
  const inputReactance = primaryReactance - reflectedReactanceMagnitude;
  if (
    !Number.isFinite(equivalentInductance) ||
    !isResolvedPositiveProduct(primaryReactance) ||
    !Number.isFinite(inputReactance) ||
    (equivalentInductance > 0 &&
      !isPositiveNormal(equivalentInductance)) ||
    (inputReactance > 0 && !isPositiveNormal(inputReactance)) ||
    (equivalentInductanceReduction > 0 && equivalentInductance === lp) ||
    (reflectedReactanceMagnitude > 0 && inputReactance === primaryReactance)
  ) {
    return numericFailure();
  }

  if (
    reflectedResistance < 0 ||
    equivalentResistance < 0 ||
    equivalentInductance < 0 ||
    inputReactance < 0
  ) {
    return failure(
      "invalid_input",
      "F-01.passivity_check_failed",
      "The computed reflected/equivalent parameters violate the passive coupled-circuit checks after the frozen input-domain checks.",
      "Audit the parameter snapshots and binary64 evaluation; do not emit or clamp a non-passive result.",
    );
  }

  const inputReactanceFromLeq = angularFrequency * equivalentInductance;
  if (
    !Number.isFinite(inputReactanceFromLeq) ||
    (equivalentInductance > 0 && !isPositiveNormal(inputReactanceFromLeq))
  ) {
    return numericFailure();
  }
  const inputReactanceIdentityResidual = Math.abs(
    inputReactance - inputReactanceFromLeq,
  );
  const inputReactanceIdentityTolerance =
    1e-12 * Math.max(1, Math.abs(inputReactanceFromLeq));
  if (
    !Number.isFinite(inputReactanceIdentityResidual) ||
    !Number.isFinite(inputReactanceIdentityTolerance) ||
    inputReactanceIdentityResidual > inputReactanceIdentityTolerance
  ) {
    return numericFailure();
  }

  const value = deepFreeze({
    Zin: {
      kind: "available",
      status: "available",
      outputId: "Zin",
      valueSi: {
        realOhm: equivalentResistance,
        imaginaryOhm: inputReactance,
      },
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      phasorConvention: "RMS_exp_j_omega_t_passive_sign",
    },
    Req: availableResistance("Req", equivalentResistance),
    Rref: availableResistance("Rref", reflectedResistance),
    Leq: {
      kind: "available",
      status: "available",
      outputId: "Leq",
      valueSi: equivalentInductance,
      dimensionId: "inductance",
      canonicalUnitId: "H",
    },
    k: {
      kind: "available",
      status: "available",
      outputId: "k",
      valueSi: couplingCoefficient,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
    },
  }) as unknown as F01ReflectedImpedanceValue;

  const passivityChecks = Object.freeze({
    couplingMagnitudeWithinUnity: true,
    reflectedResistanceNonNegative: true,
    equivalentResistanceNonNegative: true,
    equivalentInductanceNonNegative: true,
    inputReactanceNonNegative: true,
    passiveUnitCurrentReflectedPowerW: reflectedResistance,
  }) satisfies F01PassivityChecks;

  const inputSnapshot = Object.freeze({ primary, secondary, mutual });
  const trace = deepFreeze({
    path: [
      "Result",
      "Method and Version",
      "Input Snapshot",
      "Material States",
      "Equation and Substitution",
      "Source",
      "Assumptions",
      "Applicability Checks",
      "Warnings",
      "Solver Residuals",
    ],
    result: value,
    methodAndVersion: {
      methodId: F01_METHOD_ID,
      methodVersion: F01_METHOD_VERSION,
      approvalStatus: "approved_with_limitation",
      resultProvenance: "estimated",
      scientificConfidence: "high",
    },
    inputSnapshot,
    materialStates: {
      primaryMaterialStateId: primary.materialStateId,
      secondaryMaterialStateId: secondary.materialStateId,
      primaryMaterialSnapshotId: primary.materialSnapshotId,
      secondaryMaterialSnapshotId: secondary.materialSnapshotId,
      primaryTemperatureK: primary.temperatureK,
      secondaryTemperatureK: secondary.temperatureK,
    },
    equationAndSubstitution: {
      equations: [
        "omega = 2*pi*f",
        "Z2 = R2 + j*omega*Ls",
        "Zin = R1 + j*omega*Lp + omega^2*M^2/(R2 + j*omega*Ls)",
        "Rref = omega^2*M^2*R2/(R2^2 + (omega*Ls)^2)",
        "Leq = Lp - omega^2*M^2*Ls/(R2^2 + (omega*Ls)^2)",
        "Req = R1 + Rref",
        "k = M/sqrt(Lp*Ls)",
      ],
      substitution: {
        primaryResistanceOhm: r1,
        primaryInductanceH: lp,
        secondaryResistanceOhm: r2,
        secondaryInductanceH: ls,
        mutualInductanceH: mutualInductance,
        frequencyHz: frequency,
        angularFrequencyRadPerS: angularFrequency,
        primarySecondaryInductanceProductH2:
          primarySecondaryInductanceProduct,
        couplingLimitH: couplingLimit,
        secondaryReactanceOhm: secondaryReactance,
        denominatorOhm2: denominator,
        omegaSquaredMutualSquaredOhm2: omegaSquaredMutualSquared,
        reflectedResistanceOhm: reflectedResistance,
        reflectedReactanceOhm: -reflectedReactanceMagnitude,
        equivalentResistanceOhm: equivalentResistance,
        equivalentInductanceH: equivalentInductance,
        inputReactanceOhm: inputReactance,
        inputReactanceFromLeqOhm: inputReactanceFromLeq,
        inputReactanceIdentityResidualOhm: inputReactanceIdentityResidual,
        inputReactanceIdentityToleranceOhm: inputReactanceIdentityTolerance,
        couplingCoefficient,
      },
    },
    source: {
      equationRef: SPECIFICATION.contractEquationRef,
      sourceRefs: F01_SOURCE_REFS,
      contractSourceRefs: F01_CONTRACT_SOURCE_REFS,
      derivationRefs: F01_DERIVATION_REFS,
      validationCaseIds: F01_VALIDATION_CASE_IDS,
      methodCheckIds: F01_METHOD_CHECK_IDS,
      validationStatus: "specified",
      externalModelEvidenceRole: "scope_only_not_equation_source",
    },
    assumptions: F01_ASSUMPTIONS,
    applicabilityChecks: {
      modelRegime: "linear_lumped_sinusoidal_steady_state",
      parameterStateMatch: "confirmed_for_declared_state",
      sameFrequencyAndOperatingState: true,
      explicitPrimaryAndSecondaryPorts: true,
      mutualParameterProvenanceAccepted: true,
      geometryToMutualInductanceDerivationPerformed: false,
      passivity: passivityChecks,
    },
    warnings: EMPTY_ARRAY,
    solverResiduals: EMPTY_ARRAY,
  }) as unknown as F01ReflectedImpedanceTrace;

  return deepFreeze({
    methodId: F01_METHOD_ID,
    methodVersion: F01_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_ARRAY,
    warnings: EMPTY_ARRAY,
    resultProvenance: "estimated",
    scientificConfidence: "high",
    value,
    evidence: {
      primaryParameterSnapshot: primary,
      secondaryParameterSnapshot: secondary,
      mutualParameterSnapshot: mutual,
      passivityChecks,
      recommendation: {
        eligibility: "not_eligible",
        isRecommended: false,
        preferredActualEquipmentMethodId: "F-02",
        reason: SPECIFICATION.recommendationReason,
      },
      numericRepresentabilityPolicy: F01_NUMERIC_REPRESENTABILITY_POLICY,
    },
    trace,
    sourceRefs: F01_SOURCE_REFS,
    contractSourceRefs: F01_CONTRACT_SOURCE_REFS,
    derivationRefs: F01_DERIVATION_REFS,
    validationCaseIds: F01_VALIDATION_CASE_IDS,
    methodCheckIds: F01_METHOD_CHECK_IDS,
  }) as unknown as F01ReflectedImpedanceSuccess;
}
