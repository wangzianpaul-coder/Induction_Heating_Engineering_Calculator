import {
  LOADED_STATES,
  QUANTITY_BASES,
  type LoadedState,
  type QuantityBasis,
} from "../../domain/electrical.js";
import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { deepFreeze } from "../../serialization/canonical-json.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-02"));

export const F02_METHOD_ID = "F-02" as const;
export const F02_METHOD_VERSION = SPECIFICATION.methodVersion;
export const F02_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const F02_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const F02_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const F02_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const F02_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** Machine-only lower bound for positive normal IEEE-754 binary64 values. */
export const F02_BINARY64_MIN_NORMAL = 2 ** -1022;

export const F02_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  boundaryKind: "machine_numeric_representability_only" as const,
  binary64MinimumNormal: F02_BINARY64_MIN_NORMAL,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  overflowPolicy: "fail_closed" as const,
  swallowedNonzeroTermPolicy: "fail_closed" as const,
  negativeRadicandAbsoluteValuePolicy: "prohibited" as const,
  sourceEquationRearranged: false as const,
  engineeringThreshold: false as const,
});

export const F02_DHT_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "DHT" as const,
  relativePath:
    "references/external_sources/Design-and-Fab-of-Inductors-for-HT-1.pdf" as const,
  sha256:
    "33f733aaeba16d4ff94aab4c2214596345ff86244d39db55195792d1d5c2fc98" as const,
  location: "PDF17-18" as const,
  visualReview:
    "supports measurement at heating frequency and, where practicable, with the component/workpiece present; supplies no uncertainty-propagation or fixture-de-embedding equation" as const,
});

export const F02_IMPLEMENTATION_READINESS = deepFreeze({
  isolationStatus: "implemented_safe_partial_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  publicApiExported: false as const,
  implementedScope:
    "nominal_ID_MEAS_01_identification_consuming_upstream_precomputed_expanded_uncertainty_and_already_deembedded_measurements" as const,
  openGates: [
    {
      gateId: "F-02.component-uncertainty-propagation",
      disposition:
        "not_implemented_no_frozen_uV_uI_uP_uphi_covariance_propagation_rule" as const,
    },
    {
      gateId: "F-02.numeric-phase-reactive-power-adapters",
      disposition:
        "not_implemented_requires_separate_sign_convention_and_uncertainty_contract" as const,
    },
    {
      gateId: "F-02.fixture-deembedding-calculation",
      disposition:
        "not_implemented_requires_versioned_fixture_model_and_calibration_adapter" as const,
    },
    {
      gateId: "F-02.actual-measurement-validation",
      disposition:
        "blocked_by_EM_Z_ACTUAL_001_and_EXP_Z_001_data_acquisition" as const,
    },
  ],
});

const P_EXCEEDS_VI_PREDICATE = "P>VI beyond uncertainty" as const;
const NEGATIVE_X2_PREDICATE =
  "|Z|^2-Req^2 is negative beyond propagated uncertainty" as const;
const LEQ_FROM_PI_ONLY_PREDICATE = "Leq is emitted from P and I only" as const;
const PF_COS_PHI_MIXED_PREDICATE =
  "true PF and cos(phi) are mixed" as const;
const TEMPERATURE_DRIFT_PREDICATE =
  "temperature drifts during measurement" as const;

function controlledWarningPredicate<T extends string>(predicate: T): T {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `F-02 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const F02_WARNING_PREDICATES = Object.freeze({
  activePowerExceedsApparentPowerBeyondUncertainty:
    controlledWarningPredicate(P_EXCEEDS_VI_PREDICATE),
  negativeReactanceSquaredBeyondPropagatedUncertainty:
    controlledWarningPredicate(NEGATIVE_X2_PREDICATE),
  inductanceEmittedFromActivePowerAndCurrentOnly:
    controlledWarningPredicate(LEQ_FROM_PI_ONLY_PREDICATE),
  truePowerFactorAndCosinePhiMixed: controlledWarningPredicate(
    PF_COS_PHI_MIXED_PREDICATE,
  ),
  temperatureDrift: controlledWarningPredicate(TEMPERATURE_DRIFT_PREDICATE),
});

export const F02_MEASURED_PORT_IMPEDANCE_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: F02_SOURCE_REFS,
  contractSourceRefs: F02_CONTRACT_SOURCE_REFS,
  derivationRefs: F02_DERIVATION_REFS,
  validationCaseIds: F02_VALIDATION_CASE_IDS,
  methodCheckIds: F02_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  numericRepresentabilityPolicy: F02_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: F02_IMPLEMENTATION_READINESS,
  controlledExternalSource: F02_DHT_CONTROLLED_SOURCE,
});

export type F02WaveformDefinition =
  | "approximately_sinusoidal_fundamental"
  | "explicit_full_wave_total"
  | "known_multifrequency_without_single_frequency_equivalent"
  | "unknown_or_unconfirmed";

export interface F02MeasurementBindingEvidence {
  readonly caseSnapshotId: string;
  readonly measurementSnapshotId: string;
  readonly electricalStateSnapshotId: string;
  readonly portId: string;
  readonly positiveTerminalId: string;
  readonly negativeTerminalId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  readonly frequencyHz: number;
  readonly timeBasisId: string;
  readonly measurementWindowId: string;
  readonly temperatureSnapshotId: string;
  readonly temperatureK: number;
  readonly waveformDefinition: F02WaveformDefinition;
  readonly currentDirection: "into_passive_port";
  readonly phasorTimeConvention: "exp_j_omega_t";
  readonly portModel: "series_equivalent_at_declared_port";
}

export interface F02AvailableVoltageEvidence {
  readonly kind: "available";
  /** Canonical-SI volts. */
  readonly voltageV: number;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly binding: F02MeasurementBindingEvidence;
}

export interface F02UnavailableVoltageEvidence {
  readonly kind: "not_available";
  readonly reason: string;
}

export type F02VoltageEvidence =
  | F02AvailableVoltageEvidence
  | F02UnavailableVoltageEvidence;

export interface F02CurrentEvidence {
  readonly kind: "available";
  /** Canonical-SI amperes. */
  readonly currentA: number;
  readonly quantityBasis: QuantityBasis | "unknown_or_unconfirmed";
  readonly binding: F02MeasurementBindingEvidence;
}

export type F02ActivePowerBasis =
  | "same_waveform_active_power"
  | "cos_phi_derived"
  | "unknown_or_unconfirmed";

export interface F02ActivePowerEvidence {
  readonly kind: "available";
  /** Canonical-SI watts, positive into the passive receiving port. */
  readonly activePowerW: number;
  readonly activePowerBasis: F02ActivePowerBasis;
  readonly binding: F02MeasurementBindingEvidence;
}

export type F02ReactiveClassification = "inductive" | "capacitive" | "zero";

export type F02ReactiveSignEvidence =
  | Readonly<{
      readonly kind: "resolved_reactive_sign";
      readonly classification: F02ReactiveClassification;
      readonly evidenceBasis:
        | "measured_reactive_power_sign"
        | "measured_phase_sign"
        | "instrument_complex_impedance_sign";
      readonly signResolvedAtExpandedUncertainty: true;
      readonly sourceRef: string;
      readonly binding: F02MeasurementBindingEvidence;
    }>
  | Readonly<{
      readonly kind: "not_available";
      readonly reason: string;
    }>
  | Readonly<{
      readonly kind: "cos_phi_only";
      readonly sourceRef: string;
      readonly binding: F02MeasurementBindingEvidence;
    }>
  | Readonly<{
      readonly kind: "unknown_or_unconfirmed";
      readonly reason: string;
    }>;

export type F02DeembeddingEvidence =
  | Readonly<{
      readonly kind: "already_deembedded_to_declared_reference_plane";
      /** Exact measurement result snapshot consumed by this de-embedding. */
      readonly measurementSnapshotId: string;
      /** Immutable raw artifact consumed by the de-embedding derivation. */
      readonly rawArtifactId: string;
      readonly rawArtifactSha256: string;
      /** Exact measurement derivation record to which de-embedding was applied. */
      readonly derivationRecordId: string;
      readonly fixtureId: string;
      readonly leadConfigurationId: string;
      readonly declaredReferencePlaneId: string;
      readonly deembeddingMethodId: string;
      readonly deembeddingMethodVersion: string;
      readonly deembeddingSnapshotId: string;
      readonly calibrationCertificateId: string;
      readonly fixtureModelSourceRef: string;
      readonly fixtureAndLeadUncertaintyIncluded: true;
    }>
  | Readonly<{
      readonly kind: "not_deembedded";
      readonly fixtureId: string;
      readonly reason: string;
    }>
  | Readonly<{
      readonly kind: "unknown_or_unconfirmed";
      readonly reason: string;
    }>;

export type F02TemperatureStabilityEvidence =
  | Readonly<{
      readonly kind: "confirmed_stable_under_pre_registered_criterion";
      readonly assessmentId: string;
      readonly criterionId: string;
      readonly sourceRef: string;
    }>
  | Readonly<{
      readonly kind: "drift_detected";
      readonly assessmentId: string;
      readonly sourceRef: string;
    }>
  | Readonly<{
      readonly kind: "unknown_or_unconfirmed";
      readonly reason: string;
    }>;

export type F02CalibrationStatus =
  | "confirmed_current_and_traceable_at_measurement"
  | "expired_or_not_traceable"
  | "unknown_or_unconfirmed";

export type F02MeasurementReviewStatus = "accepted" | "pending" | "rejected";

export interface F02MeasurementProvenance {
  readonly measurementRecordId: string;
  readonly instrumentRecordId: string;
  readonly instrumentManufacturer: string;
  readonly instrumentModel: string;
  readonly instrumentSerialNumber: string;
  readonly calibrationCertificateId: string;
  readonly calibrationStatus: F02CalibrationStatus;
  readonly samplingSettingsId: string;
  readonly rawArtifactId: string;
  readonly rawArtifactMediaType: string;
  /** Lowercase SHA-256 of the immutable raw measurement artifact. */
  readonly rawArtifactSha256: string;
  readonly derivationRecordId: string;
  readonly reviewStatus: F02MeasurementReviewStatus;
  readonly sourceRef: string;
}

/**
 * F-02 does not create an uncertainty propagation formula. It consumes this
 * upstream, versioned package verbatim. Every numeric entry is canonical SI.
 * A null field means that the corresponding input/output is explicitly
 * unavailable on the selected information route; it is never replaced by 0.
 */
export interface F02PrecomputedExpandedUncertaintyPackage {
  readonly kind: "precomputed_expanded_uncertainty_package";
  /** Exact measurement result snapshot covered by this uncertainty package. */
  readonly measurementSnapshotId: string;
  /** Immutable raw artifact and derivation covered by this package. */
  readonly rawArtifactId: string;
  readonly rawArtifactSha256: string;
  readonly derivationRecordId: string;
  /** Exact upstream de-embedding result included in this uncertainty budget. */
  readonly deembeddingSnapshotId: string;
  readonly componentUncertaintySnapshotId: string;
  readonly voltageStandardUncertaintyV: number | null;
  readonly currentStandardUncertaintyA: number;
  readonly activePowerStandardUncertaintyW: number;
  readonly reactiveSignResolutionUncertaintySnapshotId: string | null;
  readonly activePowerMinusApparentPowerExpandedUncertaintyW: number | null;
  readonly reactanceSquaredExpandedUncertaintyOhm2: number | null;
  readonly impedanceMagnitudeExpandedUncertaintyOhm: number | null;
  readonly equivalentResistanceExpandedUncertaintyOhm: number;
  readonly reactanceExpandedUncertaintyOhm: number | null;
  readonly inductanceExpandedUncertaintyH: number | null;
  readonly qualityFactorExpandedUncertaintyOne: number | null;
  readonly coverageFactor: number;
  readonly covarianceTreatmentId: string;
  readonly propagationMethodId: string;
  readonly propagationMethodVersion: string;
  readonly propagationRecordId: string;
  readonly uncertaintySourceRef: string;
  readonly calibrationCertificateId: string;
  readonly fixtureAndLeadContributionsIncluded: true | false | null;
}

export interface F02MeasuredPortImpedanceInput {
  readonly voltage: F02VoltageEvidence;
  readonly current: F02CurrentEvidence;
  readonly activePower: F02ActivePowerEvidence;
  readonly reactiveEvidence: F02ReactiveSignEvidence;
  readonly deembedding: F02DeembeddingEvidence;
  readonly temperatureStability: F02TemperatureStabilityEvidence;
  readonly provenance: F02MeasurementProvenance;
  readonly uncertainty: F02PrecomputedExpandedUncertaintyPackage;
}

export interface F02ExpandedUncertaintyOutput {
  readonly kind: "expanded";
  readonly valueSi: number;
  readonly coverageFactor: number;
  readonly propagationRecordId: string;
  readonly uncertaintySourceRef: string;
}

interface F02AvailableScalarOutputBase {
  readonly kind: "available";
  readonly status: "available";
  readonly valueSi: number;
  readonly uncertainty: F02ExpandedUncertaintyOutput;
}

export interface F02AvailableImpedanceMagnitudeOutput
  extends F02AvailableScalarOutputBase {
  readonly outputId: "|Z|";
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
}

export interface F02AvailableResistanceOutput extends F02AvailableScalarOutputBase {
  readonly outputId: "Req";
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
}

export interface F02AvailableReactanceOutput extends F02AvailableScalarOutputBase {
  readonly outputId: "X";
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "inductive" | "capacitive" | "zero";
}

export interface F02AvailableInductanceOutput extends F02AvailableScalarOutputBase {
  readonly outputId: "Leq";
  readonly dimensionId: "inductance";
  readonly canonicalUnitId: "H";
  readonly interpretation: "inductive_series_equivalent";
}

export interface F02AvailableQualityFactorOutput
  extends F02AvailableScalarOutputBase {
  readonly outputId: "Qs";
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: "inductive_series_quality_factor";
}

export interface F02UnavailableOutput {
  readonly kind: "unavailable";
  readonly outputId: "|Z|" | "X" | "Leq" | "Qs";
  readonly status: "insufficient_data" | "not_applicable";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
  readonly uncertainty?: never;
}

export type F02WarningCode =
  | "F-02.nominal_P_exceeds_VI_within_expanded_uncertainty"
  | "F-02.negative_x2_clamped_within_expanded_uncertainty"
  | "F-02.voltage_unavailable_PI_only"
  | "F-02.reactive_sign_unavailable"
  | "F-02.full_wave_has_no_single_frequency_reactance"
  | "F-02.capacitive_state_has_no_inductive_Leq"
  | "F-02.zero_reactance_has_no_inductive_Leq"
  | "F-02.Qs_unavailable_zero_Req";

export interface F02Warning {
  readonly code: F02WarningCode;
  readonly severity: "warning";
  readonly guardedPredicateRef:
    | typeof P_EXCEEDS_VI_PREDICATE
    | typeof NEGATIVE_X2_PREDICATE
    | typeof LEQ_FROM_PI_ONLY_PREDICATE
    | null;
  readonly predicateOutcome:
    | "not_triggered_within_expanded_uncertainty"
    | "unsafe_output_prevented"
    | "information_route_partial"
    | "not_applicable_to_declared_state";
  readonly message: string;
}

export interface F02MeasuredPortImpedanceSuccess {
  readonly methodId: typeof F02_METHOD_ID;
  readonly methodVersion: typeof F02_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly methodType: "measurement_identified";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain" | "at_boundary";
  readonly warningIds: readonly [];
  readonly warnings: readonly F02Warning[];
  readonly value: Readonly<{
    readonly impedanceMagnitude:
      | F02AvailableImpedanceMagnitudeOutput
      | F02UnavailableOutput;
    readonly equivalentResistance: F02AvailableResistanceOutput;
    readonly reactance: F02AvailableReactanceOutput | F02UnavailableOutput;
    readonly equivalentInductance:
      | F02AvailableInductanceOutput
      | F02UnavailableOutput;
    readonly seriesQualityFactor:
      | F02AvailableQualityFactorOutput
      | F02UnavailableOutput;
  }>;
  readonly equation: Readonly<{
    readonly impedanceMagnitude: "|Z| = V_rms / I_rms when V is available";
    readonly equivalentResistance: "Req = P / I_rms^2";
    readonly reactanceSquared: "x2 = |Z|^2 - Req^2";
    readonly reactance: "X = sign(X) * sqrt(x2) when sign evidence is resolved";
    readonly equivalentInductance: "Leq = X / (2*pi*f) for an inductive port";
    readonly qualityFactor: "Qs = (2*pi*f)*Leq/Req when Req > 0";
  }>;
  readonly substitution: Readonly<{
    readonly resistanceStage: Readonly<{
      readonly currentA: number;
      readonly activePowerW: number;
      readonly currentSquaredA2: number;
      readonly equivalentResistanceOhm: number;
    }>;
    readonly voltageStage:
      | Readonly<{
          readonly kind: "evaluated";
          readonly voltageV: number;
          readonly apparentPowerVA: number;
          readonly nominalActivePowerMinusApparentPowerW: number;
          readonly impedanceMagnitudeOhm: number;
          readonly impedanceMagnitudeSquaredOhm2: number;
          readonly equivalentResistanceSquaredOhm2: number;
          readonly rawReactanceSquaredOhm2: number;
          readonly usedReactanceSquaredOhm2: number;
          readonly negativeRadicandClampedToZero: boolean;
        }>
      | Readonly<{
          readonly kind: "not_evaluated_voltage_unavailable";
        }>;
    readonly reactiveStage:
      | Readonly<{
          readonly kind: "evaluated";
          readonly classification: F02ReactiveClassification;
          readonly reactanceOhm: number;
          readonly angularFrequencyRadPerS: number;
          readonly equivalentInductanceH?: number;
          readonly seriesQualityFactor?: number;
        }>
      | Readonly<{
          readonly kind: "not_evaluated";
          readonly reason: string;
        }>;
  }>;
  readonly measurementSnapshot: Readonly<{
    readonly authoritativeBinding: F02MeasurementBindingEvidence;
    readonly voltage: F02VoltageEvidence;
    readonly current: F02CurrentEvidence;
    readonly activePower: F02ActivePowerEvidence;
    readonly reactiveEvidence: F02ReactiveSignEvidence;
    readonly deembedding: Extract<
      F02DeembeddingEvidence,
      { readonly kind: "already_deembedded_to_declared_reference_plane" }
    >;
    readonly temperatureStability: Extract<
      F02TemperatureStabilityEvidence,
      { readonly kind: "confirmed_stable_under_pre_registered_criterion" }
    >;
    readonly provenance: F02MeasurementProvenance;
    readonly uncertainty: F02PrecomputedExpandedUncertaintyPackage;
  }>;
  readonly consistency: Readonly<{
    readonly activePowerVsApparentPower:
      | Readonly<{
          readonly kind: "evaluated";
          readonly nominalResidualW: number;
          readonly expandedResidualUncertaintyW: number;
          readonly classification:
            | "nominal_passive"
            | "nominal_exceeds_within_expanded_uncertainty";
        }>
      | Readonly<{ readonly kind: "not_evaluated_voltage_unavailable" }>;
    readonly reactanceSquared:
      | Readonly<{
          readonly kind: "evaluated";
          readonly nominalOhm2: number;
          readonly expandedUncertaintyOhm2: number;
          readonly classification:
            | "nominal_nonnegative"
            | "negative_within_expanded_uncertainty_clamped_to_zero";
        }>
      | Readonly<{ readonly kind: "not_evaluated_voltage_unavailable" }>;
    readonly inputAdjusted: false;
  }>;
  readonly resultProvenance: "identified_from_measurement";
  readonly dataQuality: "measured";
  readonly engineeringPrecision:
    "bounded_by_upstream_expanded_uncertainty_no_digit_inflation";
  readonly recommendation: Readonly<{
    readonly eligible: true;
    readonly isRecommendedForActualEquipment: true;
    readonly reason: string;
  }>;
  readonly sourceRefs: typeof F02_SOURCE_REFS;
  readonly contractSourceRefs: typeof F02_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof F02_DERIVATION_REFS;
  readonly validationCaseIds: typeof F02_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof F02_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy:
    typeof F02_NUMERIC_REPRESENTABILITY_POLICY;
  readonly implementationReadiness: typeof F02_IMPLEMENTATION_READINESS;
  readonly assumptions: readonly [
    "V, I and P are canonical-SI same-port measurements bound to one exact reference plane, loaded state, frequency, temperature, time basis and measurement window",
    "positive P and reactive sign follow the passive RMS exp(j*omega*t) convention",
    "fixture and lead effects were already de-embedded upstream to the declared reference plane",
    "F-02 consumes versioned precomputed expanded uncertainties and does not invent a component-to-output propagation or covariance model",
    "Leq is published only for an approximately sinusoidal fundamental and an explicitly resolved inductive sign",
  ];
  readonly failure?: never;
}

export type F02FailureCode =
  | "F-02.input_schema_invalid"
  | "F-02.voltage_evidence_invalid"
  | "F-02.current_evidence_invalid"
  | "F-02.active_power_evidence_invalid"
  | "F-02.reactive_evidence_invalid"
  | "F-02.deembedding_evidence_invalid"
  | "F-02.temperature_stability_evidence_invalid"
  | "F-02.provenance_evidence_invalid"
  | "F-02.uncertainty_evidence_invalid"
  | "F-02.quantity_basis_not_applicable"
  | "F-02.quantity_basis_unconfirmed"
  | "F-02.waveform_not_applicable"
  | "F-02.waveform_unconfirmed"
  | "F-02.active_power_basis_not_applicable"
  | "F-02.active_power_basis_unconfirmed"
  | "F-02.cos_phi_not_reactive_sign"
  | "F-02.reactive_sign_unconfirmed"
  | "F-02.not_deembedded"
  | "F-02.deembedding_unconfirmed"
  | "F-02.temperature_drift"
  | "F-02.temperature_stability_unconfirmed"
  | "F-02.calibration_not_applicable"
  | "F-02.calibration_unconfirmed"
  | "F-02.measurement_review_rejected"
  | "F-02.measurement_review_pending"
  | "F-02.port_state_frequency_temperature_window_mismatch"
  | "F-02.measurement_provenance_mismatch"
  | "F-02.uncertainty_route_inconsistent"
  | "F-02.precomputed_output_uncertainty_missing"
  | "F-02.active_power_exceeds_apparent_power"
  | "F-02.negative_reactance_squared"
  | "F-02.reactive_classification_inconsistent"
  | "F-02.numeric_resolution_invalid";

export interface F02MeasuredPortImpedanceFailure {
  readonly methodId: typeof F02_METHOD_ID;
  readonly methodVersion: typeof F02_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly methodType: "measurement_identified";
  readonly status:
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable"
    | "inconsistent_measurement";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly failure: Readonly<{
    readonly code: F02FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly substitution?: never;
  readonly measurementSnapshot?: never;
  readonly consistency?: never;
}

export type F02MeasuredPortImpedanceOutcome =
  | F02MeasuredPortImpedanceSuccess
  | F02MeasuredPortImpedanceFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

const WAVEFORM_DEFINITIONS = Object.freeze([
  "approximately_sinusoidal_fundamental",
  "explicit_full_wave_total",
  "known_multifrequency_without_single_frequency_equivalent",
  "unknown_or_unconfirmed",
] as const);

const ACTIVE_POWER_BASES = Object.freeze([
  "same_waveform_active_power",
  "cos_phi_derived",
  "unknown_or_unconfirmed",
] as const);

const REACTIVE_CLASSIFICATIONS = Object.freeze([
  "inductive",
  "capacitive",
  "zero",
] as const);

const REACTIVE_EVIDENCE_BASES = Object.freeze([
  "measured_reactive_power_sign",
  "measured_phase_sign",
  "instrument_complex_impedance_sign",
] as const);

const CALIBRATION_STATUSES = Object.freeze([
  "confirmed_current_and_traceable_at_measurement",
  "expired_or_not_traceable",
  "unknown_or_unconfirmed",
] as const);

const REVIEW_STATUSES = Object.freeze(["accepted", "pending", "rejected"] as const);

function failure(
  status: F02MeasuredPortImpedanceFailure["status"],
  code: F02FailureCode,
  message: string,
  action: string,
): F02MeasuredPortImpedanceFailure {
  return Object.freeze({
    methodId: F02_METHOD_ID,
    methodVersion: F02_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    methodType: "measurement_identified",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    failure: Object.freeze({ code, message, action }),
  });
}

function numericFailure(message: string): F02MeasuredPortImpedanceFailure {
  return failure(
    "invalid_input",
    "F-02.numeric_resolution_invalid",
    message,
    "Use finite representable canonical-SI measurements or a separately approved higher-precision path; do not clamp, rescale, rearrange or replace a swallowed term.",
  );
}

function isStableIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isPositiveNormal(value: number): boolean {
  return Number.isFinite(value) && value >= F02_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormal(value: number): boolean {
  return value === 0 || isPositiveNormal(value);
}

function isNullableZeroOrPositiveNormal(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && isZeroOrPositiveNormal(value))
  );
}

type ParsedResult<T> =
  | Readonly<{ readonly ok: true; readonly value: T }>
  | Readonly<{
      readonly ok: false;
      readonly failure: F02MeasuredPortImpedanceFailure;
    }>;

function parseBinding(value: unknown): ParsedResult<F02MeasurementBindingEvidence> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "measurementSnapshotId",
    "electricalStateSnapshotId",
    "portId",
    "positiveTerminalId",
    "negativeTerminalId",
    "referencePlaneId",
    "loadedState",
    "frequencyHz",
    "timeBasisId",
    "measurementWindowId",
    "temperatureSnapshotId",
    "temperatureK",
    "waveformDefinition",
    "currentDirection",
    "phasorTimeConvention",
    "portModel",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.port_state_frequency_temperature_window_mismatch",
        "An F-02 quantity binding must be one exact controlled plain-data record.",
        "Provide the complete case, measurement, port, frequency, temperature, time-window and sign-convention binding without accessors or extra fields.",
      ),
    };
  }
  if (
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isStableIdentifier(record.measurementSnapshotId) ||
    !isStableIdentifier(record.electricalStateSnapshotId) ||
    !isStableIdentifier(record.portId) ||
    !isStableIdentifier(record.positiveTerminalId) ||
    !isStableIdentifier(record.negativeTerminalId) ||
    record.positiveTerminalId === record.negativeTerminalId ||
    !isStableIdentifier(record.referencePlaneId) ||
    !(LOADED_STATES as readonly unknown[]).includes(record.loadedState) ||
    typeof record.frequencyHz !== "number" ||
    !isPositiveNormal(record.frequencyHz) ||
    !isStableIdentifier(record.timeBasisId) ||
    !isStableIdentifier(record.measurementWindowId) ||
    !isStableIdentifier(record.temperatureSnapshotId) ||
    typeof record.temperatureK !== "number" ||
    !isPositiveNormal(record.temperatureK) ||
    !(WAVEFORM_DEFINITIONS as readonly unknown[]).includes(
      record.waveformDefinition,
    ) ||
    record.currentDirection !== "into_passive_port" ||
    record.phasorTimeConvention !== "exp_j_omega_t" ||
    record.portModel !== "series_equivalent_at_declared_port"
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.port_state_frequency_temperature_window_mismatch",
        "An F-02 quantity binding contains a missing, uncontrolled, non-finite or non-representable field.",
        "Use a content-addressed case snapshot, stable IDs, distinct terminals, positive normal SI frequency/temperature and the frozen passive RMS port convention.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      measurementSnapshotId: record.measurementSnapshotId,
      electricalStateSnapshotId: record.electricalStateSnapshotId,
      portId: record.portId,
      positiveTerminalId: record.positiveTerminalId,
      negativeTerminalId: record.negativeTerminalId,
      referencePlaneId: record.referencePlaneId,
      loadedState: record.loadedState as LoadedState,
      frequencyHz: record.frequencyHz,
      timeBasisId: record.timeBasisId,
      measurementWindowId: record.measurementWindowId,
      temperatureSnapshotId: record.temperatureSnapshotId,
      temperatureK: record.temperatureK,
      waveformDefinition: record.waveformDefinition as F02WaveformDefinition,
      currentDirection: "into_passive_port",
      phasorTimeConvention: "exp_j_omega_t",
      portModel: "series_equivalent_at_declared_port",
    }),
  };
}

function parseVoltage(value: unknown): ParsedResult<F02VoltageEvidence> {
  const unavailable = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (unavailable !== null && unavailable.kind === "not_available") {
    if (!isStableIdentifier(unavailable.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.voltage_evidence_invalid",
          "An unavailable voltage record requires a non-blank reason.",
          "State why V is unavailable; F-02 will retain only the P/I resistance route.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({ kind: "not_available", reason: unavailable.reason }),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "voltageV",
    "quantityBasis",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    typeof record.voltageV !== "number" ||
    !isZeroOrPositiveNormal(record.voltageV) ||
    (record.quantityBasis !== "unknown_or_unconfirmed" &&
      !(QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis))
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.voltage_evidence_invalid",
        "F-02 voltage evidence is neither an exact unavailable record nor a valid canonical-SI data record.",
        "Provide V>=0 as a normal finite SI value, an explicit controlled quantity basis and a complete binding.",
      ),
    };
  }
  const binding = parseBinding(record.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      voltageV: record.voltageV,
      quantityBasis: record.quantityBasis as
        | QuantityBasis
        | "unknown_or_unconfirmed",
      binding: binding.value,
    }),
  };
}

function parseCurrent(value: unknown): ParsedResult<F02CurrentEvidence> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "currentA",
    "quantityBasis",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    typeof record.currentA !== "number" ||
    !isPositiveNormal(record.currentA) ||
    (record.quantityBasis !== "unknown_or_unconfirmed" &&
      !(QUANTITY_BASES as readonly unknown[]).includes(record.quantityBasis))
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.current_evidence_invalid",
        "F-02 current evidence must contain I>0 as a normal finite canonical-SI value, a controlled quantity basis and a complete binding.",
        "Provide the exact current evidence record without coercion, accessors or extra fields.",
      ),
    };
  }
  const binding = parseBinding(record.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      currentA: record.currentA,
      quantityBasis: record.quantityBasis as
        | QuantityBasis
        | "unknown_or_unconfirmed",
      binding: binding.value,
    }),
  };
}

function parseActivePower(value: unknown): ParsedResult<F02ActivePowerEvidence> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "activePowerW",
    "activePowerBasis",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "available" ||
    typeof record.activePowerW !== "number" ||
    !isZeroOrPositiveNormal(record.activePowerW) ||
    !(ACTIVE_POWER_BASES as readonly unknown[]).includes(record.activePowerBasis)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.active_power_evidence_invalid",
        "F-02 active-power evidence must contain P>=0 under the passive convention, a controlled basis and a complete binding.",
        "Provide independently measured same-waveform active power; do not reconstruct P from cos(phi).",
      ),
    };
  }
  const binding = parseBinding(record.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    value: Object.freeze({
      kind: "available",
      activePowerW: record.activePowerW,
      activePowerBasis: record.activePowerBasis as F02ActivePowerBasis,
      binding: binding.value,
    }),
  };
}

function parseReactiveEvidence(value: unknown): ParsedResult<F02ReactiveSignEvidence> {
  const short = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (
    short !== null &&
    (short.kind === "not_available" ||
      short.kind === "unknown_or_unconfirmed")
  ) {
    if (!isStableIdentifier(short.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.reactive_evidence_invalid",
          "An unavailable or unconfirmed reactive-evidence record requires a non-blank reason.",
          "State whether sign evidence is explicitly unavailable or remains unresolved.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({ kind: short.kind, reason: short.reason }) as
        | Extract<F02ReactiveSignEvidence, { readonly kind: "not_available" }>
        | Extract<
            F02ReactiveSignEvidence,
            { readonly kind: "unknown_or_unconfirmed" }
          >,
    };
  }
  const cosPhi = readExactPlainDataRecord(value, ["kind", "sourceRef", "binding"]);
  if (cosPhi !== null && cosPhi.kind === "cos_phi_only") {
    if (!isStableIdentifier(cosPhi.sourceRef)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.reactive_evidence_invalid",
          "cos(phi)-only evidence requires a non-blank source reference.",
          "Provide traceable phase or reactive-sign evidence; cos(phi) alone is not a signed reactive quantity.",
        ),
      };
    }
    const binding = parseBinding(cosPhi.binding);
    if (!binding.ok) return binding;
    return {
      ok: true,
      value: Object.freeze({
        kind: "cos_phi_only",
        sourceRef: cosPhi.sourceRef,
        binding: binding.value,
      }),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "classification",
    "evidenceBasis",
    "signResolvedAtExpandedUncertainty",
    "sourceRef",
    "binding",
  ]);
  if (
    record === null ||
    record.kind !== "resolved_reactive_sign" ||
    !(REACTIVE_CLASSIFICATIONS as readonly unknown[]).includes(
      record.classification,
    ) ||
    !(REACTIVE_EVIDENCE_BASES as readonly unknown[]).includes(
      record.evidenceBasis,
    ) ||
    record.signResolvedAtExpandedUncertainty !== true ||
    !isStableIdentifier(record.sourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.reactive_evidence_invalid",
        "F-02 reactive evidence is not an exact resolved-sign, unavailable, unconfirmed or cos(phi)-only record.",
        "Provide a pre-resolved inductive/capacitive/zero sign whose uncertainty and passive convention were handled upstream.",
      ),
    };
  }
  const binding = parseBinding(record.binding);
  if (!binding.ok) return binding;
  return {
    ok: true,
    value: Object.freeze({
      kind: "resolved_reactive_sign",
      classification: record.classification as F02ReactiveClassification,
      evidenceBasis: record.evidenceBasis as Extract<
        F02ReactiveSignEvidence,
        { readonly kind: "resolved_reactive_sign" }
      >["evidenceBasis"],
      signResolvedAtExpandedUncertainty: true,
      sourceRef: record.sourceRef,
      binding: binding.value,
    }),
  };
}

function parseDeembedding(value: unknown): ParsedResult<F02DeembeddingEvidence> {
  const unknown = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (unknown !== null && unknown.kind === "unknown_or_unconfirmed") {
    if (!isStableIdentifier(unknown.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.deembedding_evidence_invalid",
          "Unknown de-embedding evidence requires a non-blank reason.",
          "State the unresolved fixture/lead boundary evidence.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "unknown_or_unconfirmed",
        reason: unknown.reason,
      }),
    };
  }
  const notDeembedded = readExactPlainDataRecord(value, [
    "kind",
    "fixtureId",
    "reason",
  ]);
  if (notDeembedded !== null && notDeembedded.kind === "not_deembedded") {
    if (
      !isStableIdentifier(notDeembedded.fixtureId) ||
      !isStableIdentifier(notDeembedded.reason)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.deembedding_evidence_invalid",
          "A not-deembedded record requires a fixture ID and reason.",
          "Identify the fixture and why its contribution remains at the measurement plane.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "not_deembedded",
        fixtureId: notDeembedded.fixtureId,
        reason: notDeembedded.reason,
      }),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "measurementSnapshotId",
    "rawArtifactId",
    "rawArtifactSha256",
    "derivationRecordId",
    "fixtureId",
    "leadConfigurationId",
    "declaredReferencePlaneId",
    "deembeddingMethodId",
    "deembeddingMethodVersion",
    "deembeddingSnapshotId",
    "calibrationCertificateId",
    "fixtureModelSourceRef",
    "fixtureAndLeadUncertaintyIncluded",
  ]);
  if (
    record === null ||
    record.kind !== "already_deembedded_to_declared_reference_plane" ||
    !isStableIdentifier(record.measurementSnapshotId) ||
    !isStableIdentifier(record.rawArtifactId) ||
    !isSha256(record.rawArtifactSha256) ||
    !isStableIdentifier(record.derivationRecordId) ||
    !isStableIdentifier(record.fixtureId) ||
    !isStableIdentifier(record.leadConfigurationId) ||
    !isStableIdentifier(record.declaredReferencePlaneId) ||
    !isStableIdentifier(record.deembeddingMethodId) ||
    !isStableIdentifier(record.deembeddingMethodVersion) ||
    !isStableIdentifier(record.deembeddingSnapshotId) ||
    !isStableIdentifier(record.calibrationCertificateId) ||
    !isStableIdentifier(record.fixtureModelSourceRef) ||
    record.fixtureAndLeadUncertaintyIncluded !== true
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.deembedding_evidence_invalid",
        "Confirmed F-02 de-embedding evidence is incomplete, uncontrolled or excludes fixture/lead uncertainty.",
        "Provide the versioned upstream de-embedding snapshot, fixture/lead IDs, calibration, declared reference plane and uncertainty inclusion.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "already_deembedded_to_declared_reference_plane",
      measurementSnapshotId: record.measurementSnapshotId,
      rawArtifactId: record.rawArtifactId,
      rawArtifactSha256: record.rawArtifactSha256,
      derivationRecordId: record.derivationRecordId,
      fixtureId: record.fixtureId,
      leadConfigurationId: record.leadConfigurationId,
      declaredReferencePlaneId: record.declaredReferencePlaneId,
      deembeddingMethodId: record.deembeddingMethodId,
      deembeddingMethodVersion: record.deembeddingMethodVersion,
      deembeddingSnapshotId: record.deembeddingSnapshotId,
      calibrationCertificateId: record.calibrationCertificateId,
      fixtureModelSourceRef: record.fixtureModelSourceRef,
      fixtureAndLeadUncertaintyIncluded: true,
    }),
  };
}

function parseTemperatureStability(
  value: unknown,
): ParsedResult<F02TemperatureStabilityEvidence> {
  const unknown = readExactPlainDataRecord(value, ["kind", "reason"]);
  if (unknown !== null && unknown.kind === "unknown_or_unconfirmed") {
    if (!isStableIdentifier(unknown.reason)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.temperature_stability_evidence_invalid",
          "Unknown temperature stability requires a non-blank reason.",
          "State why same-temperature stability is unresolved.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "unknown_or_unconfirmed",
        reason: unknown.reason,
      }),
    };
  }
  const drift = readExactPlainDataRecord(value, [
    "kind",
    "assessmentId",
    "sourceRef",
  ]);
  if (drift !== null && drift.kind === "drift_detected") {
    if (
      !isStableIdentifier(drift.assessmentId) ||
      !isStableIdentifier(drift.sourceRef)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "F-02.temperature_stability_evidence_invalid",
          "A drift-detected record requires assessment and source IDs.",
          "Provide the traceable temperature stability assessment.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "drift_detected",
        assessmentId: drift.assessmentId,
        sourceRef: drift.sourceRef,
      }),
    };
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "assessmentId",
    "criterionId",
    "sourceRef",
  ]);
  if (
    record === null ||
    record.kind !== "confirmed_stable_under_pre_registered_criterion" ||
    !isStableIdentifier(record.assessmentId) ||
    !isStableIdentifier(record.criterionId) ||
    !isStableIdentifier(record.sourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.temperature_stability_evidence_invalid",
        "F-02 temperature-stability evidence is not an exact controlled record.",
        "Provide a pre-registered criterion and accepted assessment; F-02 does not invent a drift threshold.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "confirmed_stable_under_pre_registered_criterion",
      assessmentId: record.assessmentId,
      criterionId: record.criterionId,
      sourceRef: record.sourceRef,
    }),
  };
}

function parseProvenance(value: unknown): ParsedResult<F02MeasurementProvenance> {
  const record = readExactPlainDataRecord(value, [
    "measurementRecordId",
    "instrumentRecordId",
    "instrumentManufacturer",
    "instrumentModel",
    "instrumentSerialNumber",
    "calibrationCertificateId",
    "calibrationStatus",
    "samplingSettingsId",
    "rawArtifactId",
    "rawArtifactMediaType",
    "rawArtifactSha256",
    "derivationRecordId",
    "reviewStatus",
    "sourceRef",
  ]);
  if (
    record === null ||
    !isStableIdentifier(record.measurementRecordId) ||
    !isStableIdentifier(record.instrumentRecordId) ||
    !isStableIdentifier(record.instrumentManufacturer) ||
    !isStableIdentifier(record.instrumentModel) ||
    !isStableIdentifier(record.instrumentSerialNumber) ||
    !isStableIdentifier(record.calibrationCertificateId) ||
    !(CALIBRATION_STATUSES as readonly unknown[]).includes(
      record.calibrationStatus,
    ) ||
    !isStableIdentifier(record.samplingSettingsId) ||
    !isStableIdentifier(record.rawArtifactId) ||
    !isStableIdentifier(record.rawArtifactMediaType) ||
    !isSha256(record.rawArtifactSha256) ||
    !isStableIdentifier(record.derivationRecordId) ||
    !(REVIEW_STATUSES as readonly unknown[]).includes(record.reviewStatus) ||
    !isStableIdentifier(record.sourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.provenance_evidence_invalid",
        "F-02 measurement provenance is incomplete, uncontrolled or lacks a lowercase raw-artifact SHA-256.",
        "Provide instrument model/serial, calibration, sampling, immutable raw artifact, derivation, review and source records.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      measurementRecordId: record.measurementRecordId,
      instrumentRecordId: record.instrumentRecordId,
      instrumentManufacturer: record.instrumentManufacturer,
      instrumentModel: record.instrumentModel,
      instrumentSerialNumber: record.instrumentSerialNumber,
      calibrationCertificateId: record.calibrationCertificateId,
      calibrationStatus: record.calibrationStatus as F02CalibrationStatus,
      samplingSettingsId: record.samplingSettingsId,
      rawArtifactId: record.rawArtifactId,
      rawArtifactMediaType: record.rawArtifactMediaType,
      rawArtifactSha256: record.rawArtifactSha256,
      derivationRecordId: record.derivationRecordId,
      reviewStatus: record.reviewStatus as F02MeasurementReviewStatus,
      sourceRef: record.sourceRef,
    }),
  };
}

function parseUncertainty(
  value: unknown,
): ParsedResult<F02PrecomputedExpandedUncertaintyPackage> {
  const record = readExactPlainDataRecord(value, [
    "kind",
    "measurementSnapshotId",
    "rawArtifactId",
    "rawArtifactSha256",
    "derivationRecordId",
    "deembeddingSnapshotId",
    "componentUncertaintySnapshotId",
    "voltageStandardUncertaintyV",
    "currentStandardUncertaintyA",
    "activePowerStandardUncertaintyW",
    "reactiveSignResolutionUncertaintySnapshotId",
    "activePowerMinusApparentPowerExpandedUncertaintyW",
    "reactanceSquaredExpandedUncertaintyOhm2",
    "impedanceMagnitudeExpandedUncertaintyOhm",
    "equivalentResistanceExpandedUncertaintyOhm",
    "reactanceExpandedUncertaintyOhm",
    "inductanceExpandedUncertaintyH",
    "qualityFactorExpandedUncertaintyOne",
    "coverageFactor",
    "covarianceTreatmentId",
    "propagationMethodId",
    "propagationMethodVersion",
    "propagationRecordId",
    "uncertaintySourceRef",
    "calibrationCertificateId",
    "fixtureAndLeadContributionsIncluded",
  ]);
  if (
    record === null ||
    record.kind !== "precomputed_expanded_uncertainty_package" ||
    !isStableIdentifier(record.measurementSnapshotId) ||
    !isStableIdentifier(record.rawArtifactId) ||
    !isSha256(record.rawArtifactSha256) ||
    !isStableIdentifier(record.derivationRecordId) ||
    !isStableIdentifier(record.deembeddingSnapshotId) ||
    !isStableIdentifier(record.componentUncertaintySnapshotId) ||
    !isNullableZeroOrPositiveNormal(record.voltageStandardUncertaintyV) ||
    typeof record.currentStandardUncertaintyA !== "number" ||
    !isZeroOrPositiveNormal(record.currentStandardUncertaintyA) ||
    typeof record.activePowerStandardUncertaintyW !== "number" ||
    !isZeroOrPositiveNormal(record.activePowerStandardUncertaintyW) ||
    (record.reactiveSignResolutionUncertaintySnapshotId !== null &&
      !isStableIdentifier(record.reactiveSignResolutionUncertaintySnapshotId)) ||
    !isNullableZeroOrPositiveNormal(
      record.activePowerMinusApparentPowerExpandedUncertaintyW,
    ) ||
    !isNullableZeroOrPositiveNormal(
      record.reactanceSquaredExpandedUncertaintyOhm2,
    ) ||
    !isNullableZeroOrPositiveNormal(
      record.impedanceMagnitudeExpandedUncertaintyOhm,
    ) ||
    typeof record.equivalentResistanceExpandedUncertaintyOhm !== "number" ||
    !isZeroOrPositiveNormal(
      record.equivalentResistanceExpandedUncertaintyOhm,
    ) ||
    !isNullableZeroOrPositiveNormal(record.reactanceExpandedUncertaintyOhm) ||
    !isNullableZeroOrPositiveNormal(record.inductanceExpandedUncertaintyH) ||
    !isNullableZeroOrPositiveNormal(record.qualityFactorExpandedUncertaintyOne) ||
    typeof record.coverageFactor !== "number" ||
    !isPositiveNormal(record.coverageFactor) ||
    !isStableIdentifier(record.covarianceTreatmentId) ||
    !isStableIdentifier(record.propagationMethodId) ||
    !isStableIdentifier(record.propagationMethodVersion) ||
    !isStableIdentifier(record.propagationRecordId) ||
    !isStableIdentifier(record.uncertaintySourceRef) ||
    !isStableIdentifier(record.calibrationCertificateId) ||
    (record.fixtureAndLeadContributionsIncluded !== true &&
      record.fixtureAndLeadContributionsIncluded !== false &&
      record.fixtureAndLeadContributionsIncluded !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "F-02.uncertainty_evidence_invalid",
        "F-02 requires one exact, finite, canonical-SI precomputed uncertainty package with propagation and covariance provenance.",
        "Provide normal-or-zero uncertainty values, explicit nulls for unavailable routes, a positive coverage factor and versioned propagation/calibration records.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "precomputed_expanded_uncertainty_package",
      measurementSnapshotId: record.measurementSnapshotId,
      rawArtifactId: record.rawArtifactId,
      rawArtifactSha256: record.rawArtifactSha256,
      derivationRecordId: record.derivationRecordId,
      deembeddingSnapshotId: record.deembeddingSnapshotId,
      componentUncertaintySnapshotId: record.componentUncertaintySnapshotId,
      voltageStandardUncertaintyV: record.voltageStandardUncertaintyV,
      currentStandardUncertaintyA: record.currentStandardUncertaintyA,
      activePowerStandardUncertaintyW: record.activePowerStandardUncertaintyW,
      reactiveSignResolutionUncertaintySnapshotId:
        record.reactiveSignResolutionUncertaintySnapshotId,
      activePowerMinusApparentPowerExpandedUncertaintyW:
        record.activePowerMinusApparentPowerExpandedUncertaintyW,
      reactanceSquaredExpandedUncertaintyOhm2:
        record.reactanceSquaredExpandedUncertaintyOhm2,
      impedanceMagnitudeExpandedUncertaintyOhm:
        record.impedanceMagnitudeExpandedUncertaintyOhm,
      equivalentResistanceExpandedUncertaintyOhm:
        record.equivalentResistanceExpandedUncertaintyOhm,
      reactanceExpandedUncertaintyOhm:
        record.reactanceExpandedUncertaintyOhm,
      inductanceExpandedUncertaintyH:
        record.inductanceExpandedUncertaintyH,
      qualityFactorExpandedUncertaintyOne:
        record.qualityFactorExpandedUncertaintyOne,
      coverageFactor: record.coverageFactor,
      covarianceTreatmentId: record.covarianceTreatmentId,
      propagationMethodId: record.propagationMethodId,
      propagationMethodVersion: record.propagationMethodVersion,
      propagationRecordId: record.propagationRecordId,
      uncertaintySourceRef: record.uncertaintySourceRef,
      calibrationCertificateId: record.calibrationCertificateId,
      fixtureAndLeadContributionsIncluded:
        record.fixtureAndLeadContributionsIncluded,
    }),
  };
}

function sameBinding(
  left: F02MeasurementBindingEvidence,
  right: F02MeasurementBindingEvidence,
): boolean {
  return (
    left.caseSnapshotId === right.caseSnapshotId &&
    left.measurementSnapshotId === right.measurementSnapshotId &&
    left.electricalStateSnapshotId === right.electricalStateSnapshotId &&
    left.portId === right.portId &&
    left.positiveTerminalId === right.positiveTerminalId &&
    left.negativeTerminalId === right.negativeTerminalId &&
    left.referencePlaneId === right.referencePlaneId &&
    left.loadedState === right.loadedState &&
    left.frequencyHz === right.frequencyHz &&
    left.timeBasisId === right.timeBasisId &&
    left.measurementWindowId === right.measurementWindowId &&
    left.temperatureSnapshotId === right.temperatureSnapshotId &&
    left.temperatureK === right.temperatureK &&
    left.waveformDefinition === right.waveformDefinition &&
    left.currentDirection === right.currentDirection &&
    left.phasorTimeConvention === right.phasorTimeConvention &&
    left.portModel === right.portModel
  );
}

function expandedUncertainty(
  valueSi: number,
  uncertainty: F02PrecomputedExpandedUncertaintyPackage,
): F02ExpandedUncertaintyOutput {
  return Object.freeze({
    kind: "expanded",
    valueSi,
    coverageFactor: uncertainty.coverageFactor,
    propagationRecordId: uncertainty.propagationRecordId,
    uncertaintySourceRef: uncertainty.uncertaintySourceRef,
  });
}

function unavailable(
  outputId: F02UnavailableOutput["outputId"],
  status: F02UnavailableOutput["status"],
  reason: string,
): F02UnavailableOutput {
  return Object.freeze({ kind: "unavailable", outputId, status, reason });
}

function warning(
  code: F02WarningCode,
  guardedPredicateRef: F02Warning["guardedPredicateRef"],
  predicateOutcome: F02Warning["predicateOutcome"],
  message: string,
): F02Warning {
  return Object.freeze({
    code,
    severity: "warning",
    guardedPredicateRef,
    predicateOutcome,
    message,
  });
}

function requireAvailableUncertainty(
  value: number | null,
  outputName: string,
): F02MeasuredPortImpedanceFailure | null {
  if (value !== null) return null;
  return failure(
    "insufficient_data",
    "F-02.precomputed_output_uncertainty_missing",
    `The upstream expanded uncertainty for available output ${outputName} is missing.`,
    "Complete the versioned upstream propagation record; F-02 will not invent an output uncertainty.",
  );
}

function validateNullUncertainty(
  value: number | null,
  outputName: string,
): F02MeasuredPortImpedanceFailure | null {
  if (value === null) return null;
  return failure(
    "invalid_input",
    "F-02.uncertainty_route_inconsistent",
    `The uncertainty package supplies ${outputName} uncertainty although that output is unavailable on the selected route.`,
    "Use null for every unavailable output; do not attach an orphan uncertainty or numeric placeholder.",
  );
}

/**
 * Isolated canonical-SI implementation of frozen method F-02.
 *
 * The function identifies nominal values only. It never derives an uncertainty
 * model and never performs fixture de-embedding. Those operations must have
 * produced the controlled evidence supplied to this boundary.
 */
export function evaluateF02MeasuredPortImpedance(
  input: F02MeasuredPortImpedanceInput,
): F02MeasuredPortImpedanceOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "voltage",
    "current",
    "activePower",
    "reactiveEvidence",
    "deembedding",
    "temperatureStability",
    "provenance",
    "uncertainty",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "F-02.input_schema_invalid",
      "F-02 input must be one exact controlled plain-data record.",
      "Provide only the eight frozen F-02 evidence records without missing, extra, accessor, symbol or inherited fields.",
    );
  }

  const voltageResult = parseVoltage(controlledInput.voltage);
  if (!voltageResult.ok) return voltageResult.failure;
  const currentResult = parseCurrent(controlledInput.current);
  if (!currentResult.ok) return currentResult.failure;
  const activePowerResult = parseActivePower(controlledInput.activePower);
  if (!activePowerResult.ok) return activePowerResult.failure;
  const reactiveResult = parseReactiveEvidence(controlledInput.reactiveEvidence);
  if (!reactiveResult.ok) return reactiveResult.failure;
  const deembeddingResult = parseDeembedding(controlledInput.deembedding);
  if (!deembeddingResult.ok) return deembeddingResult.failure;
  const temperatureResult = parseTemperatureStability(
    controlledInput.temperatureStability,
  );
  if (!temperatureResult.ok) return temperatureResult.failure;
  const provenanceResult = parseProvenance(controlledInput.provenance);
  if (!provenanceResult.ok) return provenanceResult.failure;
  const uncertaintyResult = parseUncertainty(controlledInput.uncertainty);
  if (!uncertaintyResult.ok) return uncertaintyResult.failure;

  const voltage = voltageResult.value;
  const current = currentResult.value;
  const activePower = activePowerResult.value;
  const reactiveEvidence = reactiveResult.value;
  const deembedding = deembeddingResult.value;
  const temperatureStability = temperatureResult.value;
  const provenance = provenanceResult.value;
  const uncertainty = uncertaintyResult.value;

  /* A fully parsed route contradiction is invalid evidence, not unresolved
   * waveform information. Detect orphan signed-reactive uncertainty before
   * applying any known/unknown engineering disposition. */
  if (
    reactiveEvidence.kind === "not_available" &&
    (uncertainty.reactiveSignResolutionUncertaintySnapshotId !== null ||
      uncertainty.reactanceExpandedUncertaintyOhm !== null ||
      uncertainty.inductanceExpandedUncertaintyH !== null ||
      uncertainty.qualityFactorExpandedUncertaintyOne !== null)
  ) {
    return failure(
      "invalid_input",
      "F-02.uncertainty_route_inconsistent",
      "Reactive sign is explicitly unavailable, but the uncertainty package retains a signed-reactive resolution or output uncertainty.",
      "Use null for the reactive-sign snapshot and X/Leq/Qs uncertainties when signed reactive evidence is unavailable; do not retain orphan uncertainty records.",
    );
  }

  /* Known out-of-domain evidence precedes unknown evidence and generic
   * cross-snapshot mismatch; exact malformed data was already rejected. */
  const availableQuantityBases = [
    current.quantityBasis,
    ...(voltage.kind === "available" ? [voltage.quantityBasis] : []),
  ];
  const availableWaveformDefinitions = [
    current.binding.waveformDefinition,
    activePower.binding.waveformDefinition,
    ...(voltage.kind === "available"
      ? [voltage.binding.waveformDefinition]
      : []),
    ...(reactiveEvidence.kind === "resolved_reactive_sign" ||
      reactiveEvidence.kind === "cos_phi_only"
      ? [reactiveEvidence.binding.waveformDefinition]
      : []),
  ];
  if (
    availableQuantityBases.some(
      (basis) =>
        basis !== "rms" &&
        basis !== "fundamental_rms" &&
        basis !== "full_wave_rms" &&
        basis !== "unknown_or_unconfirmed",
    )
  ) {
    return failure(
      "not_applicable",
      "F-02.quantity_basis_not_applicable",
      "F-02 accepts only declared RMS/fundamental-RMS or full-wave-RMS measurements.",
      "Do not route peak, DC, average, local or unlabelled quantities into the measurement identity.",
    );
  }
  if (activePower.activePowerBasis === "cos_phi_derived") {
    return failure(
      "not_applicable",
      "F-02.active_power_basis_not_applicable",
      "F-02 does not accept active power reconstructed from cos(phi).",
      "Provide independently measured same-window active power under the passive convention.",
    );
  }
  if (reactiveEvidence.kind === "cos_phi_only") {
    return failure(
      "not_applicable",
      "F-02.cos_phi_not_reactive_sign",
      "cos(phi) does not identify the sign of reactive power and is not accepted as true PF or signed phase evidence.",
      "Provide an uncertainty-resolved measured Q/phase/Im(Z) sign, or declare reactive evidence unavailable.",
    );
  }
  if (
    availableWaveformDefinitions.some(
      (waveformDefinition) =>
        waveformDefinition ===
        "known_multifrequency_without_single_frequency_equivalent",
    )
  ) {
    return failure(
      "not_applicable",
      "F-02.waveform_not_applicable",
      "The declared waveform has no defensible single-frequency series equivalent for this F-02 route.",
      "Provide an approximately sinusoidal fundamental or an explicitly defined total full-wave measurement route.",
    );
  }
  if (deembedding.kind === "not_deembedded") {
    return failure(
      "not_applicable",
      "F-02.not_deembedded",
      "Fixture and lead effects remain at the measurement plane, outside the declared F-02 port boundary.",
      "Apply a versioned, calibrated de-embedding method upstream and bind its result to the declared reference plane.",
    );
  }
  if (temperatureStability.kind === "drift_detected") {
    return failure(
      "not_applicable",
      "F-02.temperature_drift",
      "Temperature drift was detected across the measurement window, so the same-temperature series equivalent is not applicable.",
      "Repeat the measurement under a pre-registered stability criterion; do not average across changing states silently.",
    );
  }
  if (provenance.calibrationStatus === "expired_or_not_traceable") {
    return failure(
      "not_applicable",
      "F-02.calibration_not_applicable",
      "The measurement calibration was expired or not traceable at acquisition.",
      "Repeat or requalify the measurement with a current traceable calibration record.",
    );
  }
  if (provenance.reviewStatus === "rejected") {
    return failure(
      "not_applicable",
      "F-02.measurement_review_rejected",
      "The supplied measurement record was rejected by its controlled review.",
      "Use an accepted measurement record; rejected evidence cannot identify a product result.",
    );
  }
  if (uncertainty.fixtureAndLeadContributionsIncluded === false) {
    return failure(
      "not_applicable",
      "F-02.not_deembedded",
      "The supplied uncertainty budget explicitly excludes fixture/lead contributions.",
      "Use a complete uncertainty budget at the declared de-embedded reference plane.",
    );
  }

  if (
    availableQuantityBases.some(
      (basis) => basis === "unknown_or_unconfirmed",
    )
  ) {
    return failure(
      "insufficient_data",
      "F-02.quantity_basis_unconfirmed",
      "At least one measurement quantity basis is unknown or unconfirmed.",
      "Confirm RMS, fundamental-RMS or full-wave-RMS semantics without inference.",
    );
  }
  if (
    availableWaveformDefinitions.some(
      (waveformDefinition) => waveformDefinition === "unknown_or_unconfirmed",
    )
  ) {
    return failure(
      "insufficient_data",
      "F-02.waveform_unconfirmed",
      "The waveform definition is unknown or unconfirmed.",
      "Confirm an approximately sinusoidal fundamental or explicitly defined full-wave-total route.",
    );
  }
  if (activePower.activePowerBasis === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "F-02.active_power_basis_unconfirmed",
      "The active-power basis is unknown or unconfirmed.",
      "Confirm independently measured active power for the exact waveform and window.",
    );
  }
  if (reactiveEvidence.kind === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "F-02.reactive_sign_unconfirmed",
      "Reactive evidence is unresolved rather than explicitly unavailable.",
      "Resolve the signed reactive evidence or declare it not_available so F-02 can return the safe partial route.",
    );
  }
  if (deembedding.kind === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "F-02.deembedding_unconfirmed",
      "Fixture/lead de-embedding is unknown or unconfirmed.",
      "Resolve the declared measurement and device reference planes before identification.",
    );
  }
  if (temperatureStability.kind === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "F-02.temperature_stability_unconfirmed",
      "Same-temperature stability across the measurement window is unconfirmed.",
      "Provide a pre-registered stability criterion and accepted assessment.",
    );
  }
  if (provenance.calibrationStatus === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "F-02.calibration_unconfirmed",
      "Calibration traceability at the measurement time is unconfirmed.",
      "Resolve the instrument calibration certificate and acquisition date binding.",
    );
  }
  if (provenance.reviewStatus === "pending") {
    return failure(
      "insufficient_data",
      "F-02.measurement_review_pending",
      "The measurement record remains pending controlled review.",
      "Complete review and sign-off before publishing identified values.",
    );
  }
  if (uncertainty.fixtureAndLeadContributionsIncluded === null) {
    return failure(
      "insufficient_data",
      "F-02.deembedding_unconfirmed",
      "The uncertainty package does not confirm whether fixture and lead contributions are included.",
      "Complete the upstream uncertainty budget for the applied de-embedding method.",
    );
  }
  const authoritativeBinding = current.binding;
  if (
    !sameBinding(authoritativeBinding, activePower.binding) ||
    (voltage.kind === "available" &&
      !sameBinding(authoritativeBinding, voltage.binding)) ||
    (reactiveEvidence.kind === "resolved_reactive_sign" &&
      !sameBinding(authoritativeBinding, reactiveEvidence.binding))
  ) {
    return failure(
      "insufficient_data",
      "F-02.port_state_frequency_temperature_window_mismatch",
      "F-02 V, I, P and signed reactive evidence do not share one exact port, reference plane, state, frequency, temperature and measurement window.",
      "Resolve every available quantity to the same immutable measurement snapshot; do not mix empty/loaded, cold/hot or different-time evidence.",
    );
  }
  if (
    voltage.kind === "available" &&
    voltage.quantityBasis !== current.quantityBasis
  ) {
    return failure(
      "not_applicable",
      "F-02.quantity_basis_not_applicable",
      "Voltage and current use different RMS quantity bases.",
      "Use the matching same-waveform RMS pair from one measurement window.",
    );
  }
  const waveform = authoritativeBinding.waveformDefinition;
  if (
    (waveform === "approximately_sinusoidal_fundamental" &&
      current.quantityBasis !== "rms" &&
      current.quantityBasis !== "fundamental_rms") ||
    (waveform === "explicit_full_wave_total" &&
      current.quantityBasis !== "full_wave_rms")
  ) {
    return failure(
      "not_applicable",
      "F-02.quantity_basis_not_applicable",
      "The declared waveform definition and voltage/current basis are inconsistent.",
      "Use rms/fundamental_rms for the approximately sinusoidal route or full_wave_rms for the explicit total-waveform route.",
    );
  }
  if (
    deembedding.declaredReferencePlaneId !== authoritativeBinding.referencePlaneId ||
    deembedding.calibrationCertificateId !== provenance.calibrationCertificateId ||
    uncertainty.calibrationCertificateId !== provenance.calibrationCertificateId ||
    deembedding.measurementSnapshotId !==
      authoritativeBinding.measurementSnapshotId ||
    uncertainty.measurementSnapshotId !==
      authoritativeBinding.measurementSnapshotId ||
    deembedding.rawArtifactId !== provenance.rawArtifactId ||
    uncertainty.rawArtifactId !== provenance.rawArtifactId ||
    deembedding.rawArtifactSha256 !== provenance.rawArtifactSha256 ||
    uncertainty.rawArtifactSha256 !== provenance.rawArtifactSha256 ||
    deembedding.derivationRecordId !== provenance.derivationRecordId ||
    uncertainty.derivationRecordId !== provenance.derivationRecordId ||
    uncertainty.deembeddingSnapshotId !== deembedding.deembeddingSnapshotId
  ) {
    return failure(
      "insufficient_data",
      "F-02.measurement_provenance_mismatch",
      "The reference plane, calibration, measurement snapshot, raw artifact, derivation record or de-embedding snapshot differs across the measurement evidence packages.",
      "Bind measurement, de-embedding and uncertainty evidence to the same calibrated measurement snapshot, immutable raw artifact and derivation record.",
    );
  }

  const voltageAvailable = voltage.kind === "available";
  if (
    (voltageAvailable &&
      (uncertainty.voltageStandardUncertaintyV === null ||
        uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW === null ||
        uncertainty.reactanceSquaredExpandedUncertaintyOhm2 === null ||
        uncertainty.impedanceMagnitudeExpandedUncertaintyOhm === null)) ||
    (!voltageAvailable &&
      (uncertainty.voltageStandardUncertaintyV !== null ||
        uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW !== null ||
        uncertainty.reactanceSquaredExpandedUncertaintyOhm2 !== null ||
        uncertainty.impedanceMagnitudeExpandedUncertaintyOhm !== null))
  ) {
    return failure(
      voltageAvailable ? "insufficient_data" : "invalid_input",
      voltageAvailable
        ? "F-02.precomputed_output_uncertainty_missing"
        : "F-02.uncertainty_route_inconsistent",
      "The voltage-route uncertainty fields do not match voltage availability.",
      "Provide all V/P-VI/x2/|Z| uncertainties for an available voltage, or explicit nulls for the P/I-only route.",
    );
  }
  const reqUncertaintyFailure = requireAvailableUncertainty(
    uncertainty.equivalentResistanceExpandedUncertaintyOhm,
    "Req",
  );
  if (reqUncertaintyFailure !== null) return reqUncertaintyFailure;

  const currentSquaredA2 = current.currentA * current.currentA;
  if (!isPositiveNormal(currentSquaredA2)) {
    return numericFailure(
      "F-02 I^2 overflowed, underflowed or became non-normal in binary64.",
    );
  }
  const equivalentResistanceOhm =
    activePower.activePowerW / currentSquaredA2;
  if (
    !Number.isFinite(equivalentResistanceOhm) ||
    equivalentResistanceOhm < 0 ||
    (activePower.activePowerW > 0 &&
      !isPositiveNormal(equivalentResistanceOhm))
  ) {
    return numericFailure(
      "F-02 Req=P/I^2 is non-finite, negative, false-zero or positive-subnormal.",
    );
  }

  const mutableWarnings: F02Warning[] = [];
  let impedanceMagnitudeOutput:
    | F02AvailableImpedanceMagnitudeOutput
    | F02UnavailableOutput;
  let reactanceOutput: F02AvailableReactanceOutput | F02UnavailableOutput;
  let inductanceOutput: F02AvailableInductanceOutput | F02UnavailableOutput;
  let qualityFactorOutput:
    | F02AvailableQualityFactorOutput
    | F02UnavailableOutput;
  let voltageStage: F02MeasuredPortImpedanceSuccess["substitution"]["voltageStage"];
  let reactiveStage: F02MeasuredPortImpedanceSuccess["substitution"]["reactiveStage"];
  let powerConsistency: F02MeasuredPortImpedanceSuccess["consistency"]["activePowerVsApparentPower"];
  let x2Consistency: F02MeasuredPortImpedanceSuccess["consistency"]["reactanceSquared"];
  let clampedAtBoundary = false;

  if (!voltageAvailable) {
    const nullChecks = [
      validateNullUncertainty(
        uncertainty.reactanceExpandedUncertaintyOhm,
        "X",
      ),
      validateNullUncertainty(
        uncertainty.inductanceExpandedUncertaintyH,
        "Leq",
      ),
      validateNullUncertainty(
        uncertainty.qualityFactorExpandedUncertaintyOne,
        "Qs",
      ),
    ];
    const inconsistent = nullChecks.find((entry) => entry !== null);
    if (inconsistent !== undefined && inconsistent !== null) return inconsistent;
    impedanceMagnitudeOutput = unavailable(
      "|Z|",
      "insufficient_data",
      "Voltage is explicitly unavailable; |Z|=V/I cannot be evaluated.",
    );
    reactanceOutput = unavailable(
      "X",
      "insufficient_data",
      "Voltage and signed reactive magnitude information are insufficient for X.",
    );
    inductanceOutput = unavailable(
      "Leq",
      "insufficient_data",
      "Only P and I identify Req; Leq is not identifiable and no placeholder is emitted.",
    );
    qualityFactorOutput = unavailable(
      "Qs",
      "insufficient_data",
      "Qs requires an identified inductive Leq and Req.",
    );
    mutableWarnings.push(
      warning(
        "F-02.voltage_unavailable_PI_only",
        LEQ_FROM_PI_ONLY_PREDICATE,
        "unsafe_output_prevented",
        "Only P/I evidence is available; F-02 publishes Req and leaves |Z|, X, Leq and Qs explicitly unavailable.",
      ),
    );
    voltageStage = Object.freeze({
      kind: "not_evaluated_voltage_unavailable",
    });
    reactiveStage = Object.freeze({
      kind: "not_evaluated",
      reason: "voltage unavailable",
    });
    powerConsistency = Object.freeze({
      kind: "not_evaluated_voltage_unavailable",
    });
    x2Consistency = Object.freeze({
      kind: "not_evaluated_voltage_unavailable",
    });
  } else {
    const apparentPowerVA = voltage.voltageV * current.currentA;
    if (
      !Number.isFinite(apparentPowerVA) ||
      apparentPowerVA < 0 ||
      (voltage.voltageV > 0 && !isPositiveNormal(apparentPowerVA))
    ) {
      return numericFailure(
        "F-02 V*I overflowed, underflowed or became a false zero/non-normal value.",
      );
    }
    const pMinusViW = activePower.activePowerW - apparentPowerVA;
    if (
      !Number.isFinite(pMinusViW) ||
      (apparentPowerVA > 0 && pMinusViW === activePower.activePowerW) ||
      (activePower.activePowerW > 0 && pMinusViW === -apparentPowerVA) ||
      (pMinusViW !== 0 && Math.abs(pMinusViW) < F02_BINARY64_MIN_NORMAL)
    ) {
      return numericFailure(
        "F-02 P-VI is non-finite, subnormal or swallowed a nonzero operand.",
      );
    }
    const pMinusViUncertainty =
      uncertainty.activePowerMinusApparentPowerExpandedUncertaintyW as number;
    let pClassification:
      | "nominal_passive"
      | "nominal_exceeds_within_expanded_uncertainty" = "nominal_passive";
    if (pMinusViW > 0) {
      if (pMinusViW > pMinusViUncertainty) {
        return failure(
          "inconsistent_measurement",
          "F-02.active_power_exceeds_apparent_power",
          "Nominal P exceeds V*I beyond the supplied expanded P-VI uncertainty.",
          "Correct the port, RMS/window binding, calibration, de-embedding or upstream uncertainty analysis; no identified value is retained.",
        );
      }
      pClassification = "nominal_exceeds_within_expanded_uncertainty";
      mutableWarnings.push(
        warning(
          "F-02.nominal_P_exceeds_VI_within_expanded_uncertainty",
          P_EXCEEDS_VI_PREDICATE,
          "not_triggered_within_expanded_uncertainty",
          "Nominal P exceeds nominal V*I but the upstream expanded residual interval contains zero; inputs are not adjusted.",
        ),
      );
    }
    const impedanceMagnitudeOhm = voltage.voltageV / current.currentA;
    if (
      !Number.isFinite(impedanceMagnitudeOhm) ||
      impedanceMagnitudeOhm < 0 ||
      (voltage.voltageV > 0 && !isPositiveNormal(impedanceMagnitudeOhm))
    ) {
      return numericFailure(
        "F-02 |Z|=V/I is non-finite, negative, false-zero or positive-subnormal.",
      );
    }
    const zSquaredOhm2 = impedanceMagnitudeOhm * impedanceMagnitudeOhm;
    if (
      !Number.isFinite(zSquaredOhm2) ||
      zSquaredOhm2 < 0 ||
      (impedanceMagnitudeOhm > 0 && !isPositiveNormal(zSquaredOhm2))
    ) {
      return numericFailure(
        "F-02 |Z|^2 overflowed, underflowed or became non-normal.",
      );
    }
    const reqSquaredOhm2 = equivalentResistanceOhm * equivalentResistanceOhm;
    if (
      !Number.isFinite(reqSquaredOhm2) ||
      reqSquaredOhm2 < 0 ||
      (equivalentResistanceOhm > 0 && !isPositiveNormal(reqSquaredOhm2))
    ) {
      return numericFailure(
        "F-02 Req^2 overflowed, underflowed or became non-normal.",
      );
    }
    const rawX2Ohm2 = zSquaredOhm2 - reqSquaredOhm2;
    if (
      !Number.isFinite(rawX2Ohm2) ||
      (reqSquaredOhm2 > 0 && rawX2Ohm2 === zSquaredOhm2) ||
      (zSquaredOhm2 > 0 && rawX2Ohm2 === -reqSquaredOhm2) ||
      (rawX2Ohm2 !== 0 &&
        Math.abs(rawX2Ohm2) < F02_BINARY64_MIN_NORMAL)
    ) {
      return numericFailure(
        "F-02 x2=|Z|^2-Req^2 is non-finite, subnormal or swallowed a nonzero squared term.",
      );
    }
    const x2Uncertainty =
      uncertainty.reactanceSquaredExpandedUncertaintyOhm2 as number;
    let usedX2Ohm2 = rawX2Ohm2;
    let x2Classification:
      | "nominal_nonnegative"
      | "negative_within_expanded_uncertainty_clamped_to_zero" =
      "nominal_nonnegative";
    if (rawX2Ohm2 < 0) {
      if (Math.abs(rawX2Ohm2) > x2Uncertainty) {
        return failure(
          "inconsistent_measurement",
          "F-02.negative_reactance_squared",
          "The nominal |Z|^2-Req^2 radicand is negative beyond the supplied expanded x2 uncertainty.",
          "Correct the measurement, port/window binding, calibration, de-embedding or upstream uncertainty analysis; absolute value is prohibited.",
        );
      }
      usedX2Ohm2 = 0;
      x2Classification =
        "negative_within_expanded_uncertainty_clamped_to_zero";
      clampedAtBoundary = true;
      mutableWarnings.push(
        warning(
          "F-02.negative_x2_clamped_within_expanded_uncertainty",
          NEGATIVE_X2_PREDICATE,
          "not_triggered_within_expanded_uncertainty",
          "The upstream expanded x2 interval contains zero; x2 alone is clamped to zero, while V, I, P and Req remain unchanged.",
        ),
      );
    }
    impedanceMagnitudeOutput = Object.freeze({
      kind: "available",
      status: "available",
      outputId: "|Z|",
      valueSi: impedanceMagnitudeOhm,
      dimensionId: "electrical_resistance",
      canonicalUnitId: "ohm",
      uncertainty: expandedUncertainty(
        uncertainty.impedanceMagnitudeExpandedUncertaintyOhm as number,
        uncertainty,
      ),
    });
    powerConsistency = Object.freeze({
      kind: "evaluated",
      nominalResidualW: pMinusViW,
      expandedResidualUncertaintyW: pMinusViUncertainty,
      classification: pClassification,
    });
    x2Consistency = Object.freeze({
      kind: "evaluated",
      nominalOhm2: rawX2Ohm2,
      expandedUncertaintyOhm2: x2Uncertainty,
      classification: x2Classification,
    });
    voltageStage = Object.freeze({
      kind: "evaluated",
      voltageV: voltage.voltageV,
      apparentPowerVA,
      nominalActivePowerMinusApparentPowerW: pMinusViW,
      impedanceMagnitudeOhm,
      impedanceMagnitudeSquaredOhm2: zSquaredOhm2,
      equivalentResistanceSquaredOhm2: reqSquaredOhm2,
      rawReactanceSquaredOhm2: rawX2Ohm2,
      usedReactanceSquaredOhm2: usedX2Ohm2,
      negativeRadicandClampedToZero: rawX2Ohm2 < 0,
    });

    const singleFrequencyReactiveRoute =
      waveform === "approximately_sinusoidal_fundamental" &&
      reactiveEvidence.kind === "resolved_reactive_sign";
    if (!singleFrequencyReactiveRoute) {
      const nullChecks = [
        validateNullUncertainty(
          uncertainty.reactanceExpandedUncertaintyOhm,
          "X",
        ),
        validateNullUncertainty(
          uncertainty.inductanceExpandedUncertaintyH,
          "Leq",
        ),
        validateNullUncertainty(
          uncertainty.qualityFactorExpandedUncertaintyOne,
          "Qs",
        ),
      ];
      const inconsistent = nullChecks.find((entry) => entry !== null);
      if (inconsistent !== undefined && inconsistent !== null) return inconsistent;
      if (waveform === "explicit_full_wave_total") {
        reactanceOutput = unavailable(
          "X",
          "not_applicable",
          "Total full-wave V/I/P does not identify one signed single-frequency reactance.",
        );
        inductanceOutput = unavailable(
          "Leq",
          "not_applicable",
          "A single-frequency inductance is not identified from total full-wave quantities.",
        );
        qualityFactorOutput = unavailable(
          "Qs",
          "not_applicable",
          "Inductive single-frequency Qs is outside the total full-wave route.",
        );
        mutableWarnings.push(
          warning(
            "F-02.full_wave_has_no_single_frequency_reactance",
            null,
            "not_applicable_to_declared_state",
            "F-02 reports total-waveform |Z| and Req but does not mislabel their nonactive remainder as single-frequency X or Leq.",
          ),
        );
        reactiveStage = Object.freeze({
          kind: "not_evaluated",
          reason: "explicit total full-wave route",
        });
      } else {
        reactanceOutput = unavailable(
          "X",
          "insufficient_data",
          "The reactive sign is explicitly unavailable.",
        );
        inductanceOutput = unavailable(
          "Leq",
          "insufficient_data",
          "Reactive sign/phase information is required for inductive Leq.",
        );
        qualityFactorOutput = unavailable(
          "Qs",
          "insufficient_data",
          "Qs requires identified inductive Leq.",
        );
        mutableWarnings.push(
          warning(
            "F-02.reactive_sign_unavailable",
            LEQ_FROM_PI_ONLY_PREDICATE,
            "unsafe_output_prevented",
            "V/I/P identify |Z| and Req, but F-02 leaves X, Leq and Qs unavailable without signed reactive evidence.",
          ),
        );
        reactiveStage = Object.freeze({
          kind: "not_evaluated",
          reason: "reactive sign unavailable",
        });
      }
    } else {
      const reactiveUncertaintyFailure = requireAvailableUncertainty(
        uncertainty.reactanceExpandedUncertaintyOhm,
        "X",
      );
      if (reactiveUncertaintyFailure !== null)
        return reactiveUncertaintyFailure;
      if (
        uncertainty.reactiveSignResolutionUncertaintySnapshotId === null
      ) {
        return failure(
          "insufficient_data",
          "F-02.precomputed_output_uncertainty_missing",
          "Resolved reactive sign lacks its upstream uncertainty-resolution snapshot.",
          "Provide the phase/Q/Im(Z) sign-resolution uncertainty record; F-02 does not infer sign confidence.",
        );
      }
      if (
        reactiveEvidence.classification === "zero" &&
        usedX2Ohm2 > 0
      ) {
        return failure(
          "inconsistent_measurement",
          "F-02.reactive_classification_inconsistent",
          "Reactive evidence declares zero while the controlled x2 radicand is strictly positive.",
          "Correct the signed reactive evidence or upstream uncertainty analysis; F-02 will not guess a sign.",
        );
      }
      const reactanceMagnitudeOhm = Math.sqrt(usedX2Ohm2);
      if (
        !Number.isFinite(reactanceMagnitudeOhm) ||
        reactanceMagnitudeOhm < 0 ||
        (usedX2Ohm2 > 0 && !isPositiveNormal(reactanceMagnitudeOhm))
      ) {
        return numericFailure(
          "F-02 sqrt(x2) is non-finite, negative or non-normal.",
        );
      }
      const reactanceOhm =
        reactiveEvidence.classification === "capacitive"
          ? -reactanceMagnitudeOhm
          : reactiveEvidence.classification === "zero"
            ? 0
            : reactanceMagnitudeOhm;
      reactanceOutput = Object.freeze({
        kind: "available",
        status: "available",
        outputId: "X",
        valueSi: Object.is(reactanceOhm, -0) ? 0 : reactanceOhm,
        dimensionId: "electrical_resistance",
        canonicalUnitId: "ohm",
        interpretation: reactiveEvidence.classification,
        uncertainty: expandedUncertainty(
          uncertainty.reactanceExpandedUncertaintyOhm as number,
          uncertainty,
        ),
      });
      const angularFrequencyRadPerS =
        2 * Math.PI * authoritativeBinding.frequencyHz;
      if (!isPositiveNormal(angularFrequencyRadPerS)) {
        return numericFailure(
          "F-02 angular frequency 2*pi*f overflowed or became non-normal.",
        );
      }
      if (reactiveEvidence.classification !== "inductive") {
        const lNull = validateNullUncertainty(
          uncertainty.inductanceExpandedUncertaintyH,
          "Leq",
        );
        if (lNull !== null) return lNull;
        const qNull = validateNullUncertainty(
          uncertainty.qualityFactorExpandedUncertaintyOne,
          "Qs",
        );
        if (qNull !== null) return qNull;
        const isCapacitive = reactiveEvidence.classification === "capacitive";
        inductanceOutput = unavailable(
          "Leq",
          "not_applicable",
          isCapacitive
            ? "The measured port is capacitive; negative X is not relabelled as inductance."
            : "Zero reactance is not labelled an inductive equivalent.",
        );
        qualityFactorOutput = unavailable(
          "Qs",
          "not_applicable",
          "The frozen Qs output is the inductive series quality factor.",
        );
        mutableWarnings.push(
          warning(
            isCapacitive
              ? "F-02.capacitive_state_has_no_inductive_Leq"
              : "F-02.zero_reactance_has_no_inductive_Leq",
            null,
            "not_applicable_to_declared_state",
            isCapacitive
              ? "X is retained as a negative capacitive reactance and Leq/Qs remain not_applicable."
              : "X=0 is retained without manufacturing an inductive Leq/Qs label.",
          ),
        );
        reactiveStage = Object.freeze({
          kind: "evaluated",
          classification: reactiveEvidence.classification,
          reactanceOhm: Object.is(reactanceOhm, -0) ? 0 : reactanceOhm,
          angularFrequencyRadPerS,
        });
      } else {
        const lUncertaintyFailure = requireAvailableUncertainty(
          uncertainty.inductanceExpandedUncertaintyH,
          "Leq",
        );
        if (lUncertaintyFailure !== null) return lUncertaintyFailure;
        const equivalentInductanceH = reactanceOhm / angularFrequencyRadPerS;
        if (
          !Number.isFinite(equivalentInductanceH) ||
          equivalentInductanceH < 0 ||
          (reactanceOhm > 0 && !isPositiveNormal(equivalentInductanceH))
        ) {
          return numericFailure(
            "F-02 Leq=X/(2*pi*f) is non-finite, negative, false-zero or positive-subnormal.",
          );
        }
        inductanceOutput = Object.freeze({
          kind: "available",
          status: "available",
          outputId: "Leq",
          valueSi: equivalentInductanceH,
          dimensionId: "inductance",
          canonicalUnitId: "H",
          interpretation: "inductive_series_equivalent",
          uncertainty: expandedUncertainty(
            uncertainty.inductanceExpandedUncertaintyH as number,
            uncertainty,
          ),
        });
        if (equivalentResistanceOhm === 0) {
          const qNull = validateNullUncertainty(
            uncertainty.qualityFactorExpandedUncertaintyOne,
            "Qs",
          );
          if (qNull !== null) return qNull;
          qualityFactorOutput = unavailable(
            "Qs",
            "not_applicable",
            "Qs=(omega*Leq)/Req is undefined for Req=0.",
          );
          mutableWarnings.push(
            warning(
              "F-02.Qs_unavailable_zero_Req",
              null,
              "not_applicable_to_declared_state",
              "The passive boundary Req=0 is retained, and no finite or infinite Qs placeholder is emitted.",
            ),
          );
          reactiveStage = Object.freeze({
            kind: "evaluated",
            classification: "inductive",
            reactanceOhm,
            angularFrequencyRadPerS,
            equivalentInductanceH,
          });
        } else {
          const qUncertaintyFailure = requireAvailableUncertainty(
            uncertainty.qualityFactorExpandedUncertaintyOne,
            "Qs",
          );
          if (qUncertaintyFailure !== null) return qUncertaintyFailure;
          const omegaLeqOhm = angularFrequencyRadPerS * equivalentInductanceH;
          if (
            !Number.isFinite(omegaLeqOhm) ||
            (equivalentInductanceH > 0 && !isPositiveNormal(omegaLeqOhm))
          ) {
            return numericFailure(
              "F-02 omega*Leq overflowed, underflowed or became non-normal.",
            );
          }
          const seriesQualityFactor = omegaLeqOhm / equivalentResistanceOhm;
          if (
            !Number.isFinite(seriesQualityFactor) ||
            seriesQualityFactor < 0 ||
            (omegaLeqOhm > 0 && !isPositiveNormal(seriesQualityFactor))
          ) {
            return numericFailure(
              "F-02 Qs=(omega*Leq)/Req is non-finite, negative, false-zero or positive-subnormal.",
            );
          }
          qualityFactorOutput = Object.freeze({
            kind: "available",
            status: "available",
            outputId: "Qs",
            valueSi: seriesQualityFactor,
            dimensionId: "dimensionless",
            canonicalUnitId: "one",
            interpretation: "inductive_series_quality_factor",
            uncertainty: expandedUncertainty(
              uncertainty.qualityFactorExpandedUncertaintyOne as number,
              uncertainty,
            ),
          });
          reactiveStage = Object.freeze({
            kind: "evaluated",
            classification: "inductive",
            reactanceOhm,
            angularFrequencyRadPerS,
            equivalentInductanceH,
            seriesQualityFactor,
          });
        }
      }
    }
  }

  const equivalentResistanceOutput: F02AvailableResistanceOutput = Object.freeze({
    kind: "available",
    status: "available",
    outputId: "Req",
    valueSi: equivalentResistanceOhm,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
    uncertainty: expandedUncertainty(
      uncertainty.equivalentResistanceExpandedUncertaintyOhm,
      uncertainty,
    ),
  });

  const warnings = Object.freeze(mutableWarnings);
  return deepFreeze({
    methodId: F02_METHOD_ID,
    methodVersion: F02_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    methodType: "measurement_identified" as const,
    status: warnings.length === 0 ? ("success" as const) : ("success_with_warnings" as const),
    applicabilityStatus: clampedAtBoundary
      ? ("at_boundary" as const)
      : ("in_domain" as const),
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value: {
      impedanceMagnitude: impedanceMagnitudeOutput,
      equivalentResistance: equivalentResistanceOutput,
      reactance: reactanceOutput,
      equivalentInductance: inductanceOutput,
      seriesQualityFactor: qualityFactorOutput,
    },
    equation: {
      impedanceMagnitude: "|Z| = V_rms / I_rms when V is available" as const,
      equivalentResistance: "Req = P / I_rms^2" as const,
      reactanceSquared: "x2 = |Z|^2 - Req^2" as const,
      reactance: "X = sign(X) * sqrt(x2) when sign evidence is resolved" as const,
      equivalentInductance: "Leq = X / (2*pi*f) for an inductive port" as const,
      qualityFactor: "Qs = (2*pi*f)*Leq/Req when Req > 0" as const,
    },
    substitution: {
      resistanceStage: {
        currentA: current.currentA,
        activePowerW: activePower.activePowerW,
        currentSquaredA2,
        equivalentResistanceOhm,
      },
      voltageStage,
      reactiveStage,
    },
    measurementSnapshot: {
      authoritativeBinding,
      voltage,
      current,
      activePower,
      reactiveEvidence,
      deembedding,
      temperatureStability,
      provenance,
      uncertainty,
    },
    consistency: {
      activePowerVsApparentPower: powerConsistency,
      reactanceSquared: x2Consistency,
      inputAdjusted: false as const,
    },
    resultProvenance: "identified_from_measurement" as const,
    dataQuality: "measured" as const,
    engineeringPrecision:
      "bounded_by_upstream_expanded_uncertainty_no_digit_inflation" as const,
    recommendation: {
      eligible: true as const,
      isRecommendedForActualEquipment: true as const,
      reason: SPECIFICATION.recommendationReason ??
        "CALCULATION_BASIS explicitly labels F-02 the actual-equipment Recommended method.",
    },
    sourceRefs: F02_SOURCE_REFS,
    contractSourceRefs: F02_CONTRACT_SOURCE_REFS,
    derivationRefs: F02_DERIVATION_REFS,
    validationCaseIds: F02_VALIDATION_CASE_IDS,
    methodCheckIds: F02_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: F02_NUMERIC_REPRESENTABILITY_POLICY,
    implementationReadiness: F02_IMPLEMENTATION_READINESS,
    assumptions: [
      "V, I and P are canonical-SI same-port measurements bound to one exact reference plane, loaded state, frequency, temperature, time basis and measurement window",
      "positive P and reactive sign follow the passive RMS exp(j*omega*t) convention",
      "fixture and lead effects were already de-embedded upstream to the declared reference plane",
      "F-02 consumes versioned precomputed expanded uncertainties and does not invent a component-to-output propagation or covariance model",
      "Leq is published only for an approximately sinusoidal fundamental and an explicitly resolved inductive sign",
    ] as const,
  }) as F02MeasuredPortImpedanceSuccess;
}
