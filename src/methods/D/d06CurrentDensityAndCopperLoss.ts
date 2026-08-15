import { LOADED_STATES, type LoadedState } from "../../domain/electrical.js";
import {
  isContentAddressedSnapshotId,
  methodId,
  parameterId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { PARAMETER_REGISTRY } from "../../registries/parameterCatalog.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-06"));

export const D06_METHOD_ID = "D-06" as const;
export const D06_METHOD_VERSION = SPECIFICATION.methodVersion;
export const D06_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const D06_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const D06_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const D06_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const D06_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/**
 * Smallest positive normal IEEE-754 binary64 value. This is a machine
 * representability boundary only; it is not an engineering applicability,
 * warning, solver, or validation tolerance.
 */
export const D06_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D06_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringThreshold: false as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  sourceEquationRearranged: false as const,
  minimumPositiveNormal: D06_BINARY64_MIN_NORMAL,
});

const FREQUENCY_PARAMETER = PARAMETER_REGISTRY.get(parameterId("frequency"));
const COIL_MEAN_TEMPERATURE_PARAMETER = PARAMETER_REGISTRY.get(
  parameterId("coil.mean_temperature"),
);

/**
 * The frozen parameter dictionary presently binds D-06 to coil temperature but
 * omits it from frequency consumers.  The isolated implementation records this
 * contradiction and remains non-activatable; it must not silently repair a
 * controlled registry owned outside this method.
 */
export const D06_IMPLEMENTATION_READINESS = Object.freeze({
  implementationStatus: "isolated_not_runtime_activated" as const,
  activationStatus: "non_activatable" as const,
  blockingGate: "parameter_dictionary_conflict" as const,
  conflict: Object.freeze({
    parameterIds: Object.freeze([
      "frequency",
      "coil.mean_temperature",
    ] as const),
    frequencyDeclaresD06Consumer:
      FREQUENCY_PARAMETER.consumingMethods.some(
        (candidate) => candidate === D06_METHOD_ID,
      ),
    coilMeanTemperatureDeclaresD06Consumer:
      COIL_MEAN_TEMPERATURE_PARAMETER.consumingMethods.some(
        (candidate) => candidate === D06_METHOD_ID,
      ),
    requiredResolution:
      "Resolve the controlled parameter dictionary before runtime activation; do not edit it from D-06." as const,
  }),
});

export const D06_CURRENT_DENSITY_AND_COPPER_LOSS_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: D06_SOURCE_REFS,
  contractSourceRefs: D06_CONTRACT_SOURCE_REFS,
  derivationRefs: D06_DERIVATION_REFS,
  validationCaseIds: D06_VALIDATION_CASE_IDS,
  methodCheckIds: D06_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: D06_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: D06_IMPLEMENTATION_READINESS,
});

const PEAK_AS_RMS_PREDICATE = "peak current is used as RMS" as const;
const AEFF_NOT_APPROVED_PREDICATE = "Aeff is not approved" as const;
const RAC_CYCLE_PREDICATE =
  "Rac is back-calculated from the same Pcu and creates a cycle" as const;
const LOCAL_PEAK_AS_AVERAGE_PREDICATE =
  "a local peak is labelled an average" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `D-06 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const D06_WARNING_PREDICATES = Object.freeze({
  peakCurrentUsedAsRms: controlledWarningPredicate(PEAK_AS_RMS_PREDICATE),
  effectiveAreaNotApproved: controlledWarningPredicate(
    AEFF_NOT_APPROVED_PREDICATE,
  ),
  resistanceCircularity: controlledWarningPredicate(RAC_CYCLE_PREDICATE),
  localPeakLabelledAverage: controlledWarningPredicate(
    LOCAL_PEAK_AS_AVERAGE_PREDICATE,
  ),
});

/**
 * Only a sinusoidal RMS value or an explicitly extracted fundamental RMS value
 * is admissible to the single-frequency ID-OHM-02 loss identity.
 */
export type D06CurrentBasis =
  | "rms"
  | "fundamental_rms"
  | "peak"
  | "full_wave_rms"
  | "other_or_unknown";

export type D06SourceOutcome =
  | "success"
  | "success_with_warnings"
  | "failure_or_unavailable";

export type D06RacSource =
  | "D-05_approved_estimate"
  | "F-02_same_state_measurement"
  | "other_or_unapproved";

interface D06SameStateBoundary {
  readonly currentBasis: D06CurrentBasis;
  readonly coilMeanTemperatureK: number;
  readonly geometrySnapshotId: string;
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlane: string;
  readonly loadedState: LoadedState;
}

export interface D06RacEvidence extends D06SameStateBoundary {
  /** `Rac_used` in canonical SI ohms. */
  readonly resistanceOhm: number;
  readonly source: D06RacSource;
  readonly sourceOutcome: D06SourceOutcome;
  readonly sourceResultId: string;
  readonly derivationBasis:
    | "independent_resistance_result"
    | "back_calculated_from_same_pcu";
  /** Opaque producer-owned ID for the resistance quantity's physical boundary. */
  readonly resistanceBoundaryId: string;
  readonly deembeddingBoundaryId: string;
  readonly copperLossBoundaryConfirmed: true;
}

export interface D06EffectiveAreaEvidence extends D06SameStateBoundary {
  /** D-05 effective surface area in canonical SI square metres. */
  readonly effectiveAreaM2: number;
  readonly source: "D-05_approved_estimate" | "other_or_unapproved";
  readonly sourceOutcome: D06SourceOutcome;
  readonly sourceResultId: string;
}

export interface D06CurrentDensityAndCopperLossInput {
  /** Frozen `current_rms` quantity in canonical SI amperes. */
  readonly currentRmsA: number;
  readonly currentBasis: D06CurrentBasis;
  /** The electrical state shared by current, Rac and any effective area. */
  readonly coilMeanTemperatureK: number;
  readonly geometrySnapshotId: string;
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlane: string;
  readonly loadedState: LoadedState;
  /** D-02 `Ametal` in canonical SI square metres. */
  readonly metalAreaM2: number;
  readonly rac: D06RacEvidence;
  /** Explicit null means that no D-05 effective-area result is available. */
  readonly effectiveArea: D06EffectiveAreaEvidence | null;
}

export interface D06AvailableCurrentDensityOutput {
  readonly kind: "available";
  readonly outputId: "Jdc" | "J_eff";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "electric_current_density";
  readonly canonicalUnitId: "A_per_m2";
  readonly interpretation:
    | "average_rms_current_density_over_metal_area"
    | "average_rms_current_density_over_d05_effective_surface_area";
  readonly isLocalPeak: false;
}

export interface D06AvailableCopperLossOutput {
  readonly kind: "available";
  readonly outputId: "Pcu";
  readonly status: "available";
  readonly valueSi: number;
  readonly dimensionId: "power";
  readonly canonicalUnitId: "W";
  readonly interpretation: "same_state_active_conductor_loss";
}

/** No numeric or unit placeholder is legal on an unavailable J_eff output. */
export interface D06UnavailableEffectiveCurrentDensityOutput {
  readonly kind: "unavailable";
  readonly outputId: "J_eff";
  readonly status: "not_applicable" | "insufficient_data";
  readonly reason: string;
  readonly valueSi?: never;
  readonly dimensionId?: never;
  readonly canonicalUnitId?: never;
}

export interface D06CurrentDensityAndCopperLossValue {
  readonly Jdc: D06AvailableCurrentDensityOutput;
  readonly J_eff:
    | D06AvailableCurrentDensityOutput
    | D06UnavailableEffectiveCurrentDensityOutput;
  readonly Pcu: D06AvailableCopperLossOutput;
}

export interface D06Warning {
  readonly predicate:
    | typeof PEAK_AS_RMS_PREDICATE
    | typeof AEFF_NOT_APPROVED_PREDICATE
    | typeof RAC_CYCLE_PREDICATE
    | typeof LOCAL_PEAK_AS_AVERAGE_PREDICATE;
  readonly message: string;
}

export interface D06CurrentDensityAndCopperLossSuccess {
  readonly methodId: typeof D06_METHOD_ID;
  readonly methodVersion: typeof D06_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly D06Warning[];
  readonly value: D06CurrentDensityAndCopperLossValue;
  readonly equations: readonly [
    "Jdc = I_rms / Ametal",
    "J_eff = I_rms / Aeff (only with successful D-05 evidence)",
    "Pcu = I_rms^2 * Rac_used",
  ];
  readonly substitution: Readonly<{
    readonly currentRmsA: number;
    readonly metalAreaM2: number;
    readonly effectiveAreaM2: number | null;
    readonly resistanceOhm: number;
    readonly currentSquaredA2: number;
  }>;
  readonly electricalState: Readonly<{
    readonly currentBasis: "rms" | "fundamental_rms";
    readonly coilMeanTemperatureK: number;
    readonly geometrySnapshotId: string;
    readonly frequencyHz: number;
    readonly portId: string;
    readonly referencePlane: string;
    readonly loadedState: LoadedState;
  }>;
  readonly racEvidence: Readonly<D06RacEvidence>;
  readonly effectiveAreaEvidence: Readonly<D06EffectiveAreaEvidence> | null;
  readonly sourceRefs: typeof D06_SOURCE_REFS;
  readonly contractSourceRefs: typeof D06_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof D06_DERIVATION_REFS;
  readonly validationCaseIds: typeof D06_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof D06_METHOD_CHECK_IDS;
  readonly numericRepresentabilityPolicy: typeof D06_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "current is sinusoidal RMS or fundamental RMS",
    "current, Rac and any Aeff use one current basis, coil mean temperature, geometry snapshot, frequency, port, reference plane and loaded state",
    "Jdc and J_eff are cross-section averages, not local hotspots",
    "Rac_used is independently de-embedded to the confirmed coil-copper-loss boundary and is independent of the Pcu result being calculated",
  ];
  readonly failure?: never;
}

export type D06FailureCode =
  | "D-06.input_schema_invalid"
  | "D-06.numeric_input_invalid"
  | "D-06.electrical_context_invalid"
  | "D-06.current_basis_invalid"
  | "D-06.peak_current_not_rms"
  | "D-06.rac_evidence_missing"
  | "D-06.rac_evidence_schema_invalid"
  | "D-06.rac_evidence_invalid"
  | "D-06.rac_circularity"
  | "D-06.rac_source_unapproved"
  | "D-06.rac_state_mismatch"
  | "D-06.aeff_evidence_schema_invalid"
  | "D-06.aeff_evidence_invalid"
  | "D-06.numeric_resolution_invalid";

export interface D06CurrentDensityAndCopperLossFailure {
  readonly methodId: typeof D06_METHOD_ID;
  readonly methodVersion: typeof D06_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly D06Warning[];
  readonly failure: Readonly<{
    readonly code: D06FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type D06CurrentDensityAndCopperLossOutcome =
  | D06CurrentDensityAndCopperLossSuccess
  | D06CurrentDensityAndCopperLossFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly D06Warning[];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D06_BINARY64_MIN_NORMAL;
}

function warning(
  predicate: D06Warning["predicate"],
  message: string,
): D06Warning {
  return Object.freeze({ predicate, message });
}

function failure(
  status: D06CurrentDensityAndCopperLossFailure["status"],
  code: D06FailureCode,
  message: string,
  action: string,
  warnings: readonly D06Warning[] = EMPTY_WARNINGS,
): D06CurrentDensityAndCopperLossFailure {
  return Object.freeze({
    methodId: D06_METHOD_ID,
    methodVersion: D06_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    failure: Object.freeze({ code, message, action }),
  });
}

function isLoadedState(value: unknown): value is LoadedState {
  return (
    typeof value === "string" &&
    LOADED_STATES.some((candidate) => candidate === value)
  );
}

function isNonBlankIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim()
  );
}

function isSuccessfulSourceOutcome(
  value: D06SourceOutcome,
): value is "success" | "success_with_warnings" {
  return value === "success" || value === "success_with_warnings";
}

function isD06CurrentBasis(value: unknown): value is D06CurrentBasis {
  return (
    value === "rms" ||
    value === "fundamental_rms" ||
    value === "peak" ||
    value === "full_wave_rms" ||
    value === "other_or_unknown"
  );
}

function readRacEvidence(
  value: unknown,
):
  | { readonly ok: true; readonly evidence: Readonly<D06RacEvidence> }
  | { readonly ok: false; readonly failure: D06CurrentDensityAndCopperLossFailure } {
  const evidence = readExactPlainDataRecord(value, [
    "resistanceOhm",
    "source",
    "sourceOutcome",
    "sourceResultId",
    "derivationBasis",
    "resistanceBoundaryId",
    "deembeddingBoundaryId",
    "copperLossBoundaryConfirmed",
    "currentBasis",
    "coilMeanTemperatureK",
    "geometrySnapshotId",
    "frequencyHz",
    "portId",
    "referencePlane",
    "loadedState",
  ]);
  if (evidence === null) {
    const missing = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "D-06.rac_evidence_missing"
          : "D-06.rac_evidence_schema_invalid",
        missing
          ? "D-06 requires an independently sourced same-state Rac result."
          : "D-06 Rac evidence must be an exact controlled plain-data record without accessors or extra fields.",
        missing
          ? "Provide a D-05 approved estimate or F-02 same-state measurement."
          : "Provide only the frozen D-06 Rac evidence fields as plain data values.",
      ),
    };
  }
  if (
    typeof evidence.resistanceOhm !== "number" ||
    !Number.isFinite(evidence.resistanceOhm) ||
    evidence.resistanceOhm < 0 ||
    (evidence.source !== "D-05_approved_estimate" &&
      evidence.source !== "F-02_same_state_measurement" &&
      evidence.source !== "other_or_unapproved") ||
    (evidence.sourceOutcome !== "success" &&
      evidence.sourceOutcome !== "success_with_warnings" &&
      evidence.sourceOutcome !== "failure_or_unavailable") ||
    !isNonBlankIdentifier(evidence.sourceResultId) ||
    (evidence.derivationBasis !== "independent_resistance_result" &&
      evidence.derivationBasis !== "back_calculated_from_same_pcu") ||
    !isNonBlankIdentifier(evidence.resistanceBoundaryId) ||
    !isNonBlankIdentifier(evidence.deembeddingBoundaryId) ||
    evidence.copperLossBoundaryConfirmed !== true ||
    !isD06CurrentBasis(evidence.currentBasis) ||
    typeof evidence.coilMeanTemperatureK !== "number" ||
    !Number.isFinite(evidence.coilMeanTemperatureK) ||
    evidence.coilMeanTemperatureK <= 0 ||
    !isContentAddressedSnapshotId(
      evidence.geometrySnapshotId,
      "geometry",
    ) ||
    typeof evidence.frequencyHz !== "number" ||
    !Number.isFinite(evidence.frequencyHz) ||
    evidence.frequencyHz <= 0 ||
    !isNonBlankIdentifier(evidence.portId) ||
    !isNonBlankIdentifier(evidence.referencePlane) ||
    !isLoadedState(evidence.loadedState)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-06.rac_evidence_invalid",
        "D-06 Rac evidence contains an uncontrolled, non-finite, or non-physical value.",
        "Use canonical SI and the frozen D-06 Rac source and state enumerations.",
      ),
    };
  }

  const controlledEvidence = Object.freeze({
    resistanceOhm: evidence.resistanceOhm,
    source: evidence.source,
    sourceOutcome: evidence.sourceOutcome,
    sourceResultId: evidence.sourceResultId,
    derivationBasis: evidence.derivationBasis,
    resistanceBoundaryId: evidence.resistanceBoundaryId,
    deembeddingBoundaryId: evidence.deembeddingBoundaryId,
    copperLossBoundaryConfirmed: evidence.copperLossBoundaryConfirmed,
    currentBasis: evidence.currentBasis,
    coilMeanTemperatureK: evidence.coilMeanTemperatureK,
    geometrySnapshotId: evidence.geometrySnapshotId,
    frequencyHz: evidence.frequencyHz,
    portId: evidence.portId,
    referencePlane: evidence.referencePlane,
    loadedState: evidence.loadedState,
  }) as Readonly<D06RacEvidence>;
  return { ok: true, evidence: controlledEvidence };
}

function readEffectiveAreaEvidence(
  value: unknown,
):
  | { readonly ok: true; readonly evidence: Readonly<D06EffectiveAreaEvidence> | null }
  | { readonly ok: false; readonly failure: D06CurrentDensityAndCopperLossFailure } {
  if (value === null) {
    return { ok: true, evidence: null };
  }
  const evidence = readExactPlainDataRecord(value, [
    "effectiveAreaM2",
    "source",
    "sourceOutcome",
    "sourceResultId",
    "currentBasis",
    "coilMeanTemperatureK",
    "geometrySnapshotId",
    "frequencyHz",
    "portId",
    "referencePlane",
    "loadedState",
  ]);
  if (evidence === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-06.aeff_evidence_schema_invalid",
        "Supplied D-06 Aeff evidence must be an exact controlled plain-data record without accessors or extra fields.",
        "Use null when Aeff is absent, or provide every frozen D-06 Aeff evidence field.",
      ),
    };
  }
  if (
    typeof evidence.effectiveAreaM2 !== "number" ||
    !Number.isFinite(evidence.effectiveAreaM2) ||
    evidence.effectiveAreaM2 <= 0 ||
    (evidence.source !== "D-05_approved_estimate" &&
      evidence.source !== "other_or_unapproved") ||
    (evidence.sourceOutcome !== "success" &&
      evidence.sourceOutcome !== "success_with_warnings" &&
      evidence.sourceOutcome !== "failure_or_unavailable") ||
    !isNonBlankIdentifier(evidence.sourceResultId) ||
    !isD06CurrentBasis(evidence.currentBasis) ||
    typeof evidence.coilMeanTemperatureK !== "number" ||
    !Number.isFinite(evidence.coilMeanTemperatureK) ||
    evidence.coilMeanTemperatureK <= 0 ||
    !isContentAddressedSnapshotId(
      evidence.geometrySnapshotId,
      "geometry",
    ) ||
    typeof evidence.frequencyHz !== "number" ||
    !Number.isFinite(evidence.frequencyHz) ||
    evidence.frequencyHz <= 0 ||
    !isNonBlankIdentifier(evidence.portId) ||
    !isNonBlankIdentifier(evidence.referencePlane) ||
    !isLoadedState(evidence.loadedState)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-06.aeff_evidence_invalid",
        "D-06 Aeff evidence contains an uncontrolled, non-finite, or non-physical value.",
        "Use a finite positive canonical-SI area and the frozen D-05 evidence enumeration.",
      ),
    };
  }
  const controlledEvidence = Object.freeze({
    effectiveAreaM2: evidence.effectiveAreaM2,
    source: evidence.source,
    sourceOutcome: evidence.sourceOutcome,
    sourceResultId: evidence.sourceResultId,
    currentBasis: evidence.currentBasis,
    coilMeanTemperatureK: evidence.coilMeanTemperatureK,
    geometrySnapshotId: evidence.geometrySnapshotId,
    frequencyHz: evidence.frequencyHz,
    portId: evidence.portId,
    referencePlane: evidence.referencePlane,
    loadedState: evidence.loadedState,
  }) as Readonly<D06EffectiveAreaEvidence>;
  return { ok: true, evidence: controlledEvidence };
}

function sameElectricalState(
  expected: Readonly<D06SameStateBoundary>,
  candidate: Readonly<D06SameStateBoundary>,
): boolean {
  return (
    expected.currentBasis === candidate.currentBasis &&
    expected.coilMeanTemperatureK === candidate.coilMeanTemperatureK &&
    expected.geometrySnapshotId === candidate.geometrySnapshotId &&
    expected.frequencyHz === candidate.frequencyHz &&
    expected.portId === candidate.portId &&
    expected.referencePlane === candidate.referencePlane &&
    expected.loadedState === candidate.loadedState
  );
}

function availableCurrentDensity(
  outputId: D06AvailableCurrentDensityOutput["outputId"],
  valueSi: number,
  interpretation: D06AvailableCurrentDensityOutput["interpretation"],
): D06AvailableCurrentDensityOutput {
  return Object.freeze({
    kind: "available",
    outputId,
    status: "available",
    valueSi,
    dimensionId: "electric_current_density",
    canonicalUnitId: "A_per_m2",
    interpretation,
    isLocalPeak: false,
  });
}

function unavailableEffectiveCurrentDensity(
  status: D06UnavailableEffectiveCurrentDensityOutput["status"],
  reason: string,
): D06UnavailableEffectiveCurrentDensityOutput {
  return Object.freeze({
    kind: "unavailable",
    outputId: "J_eff",
    status,
    reason,
  });
}

/** Isolated canonical-SI implementation of frozen method D-06. */
export function evaluateD06CurrentDensityAndCopperLoss(
  input: D06CurrentDensityAndCopperLossInput,
): D06CurrentDensityAndCopperLossOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "currentRmsA",
    "currentBasis",
    "coilMeanTemperatureK",
    "geometrySnapshotId",
    "frequencyHz",
    "portId",
    "referencePlane",
    "loadedState",
    "metalAreaM2",
    "rac",
    "effectiveArea",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-06.input_schema_invalid",
      "D-06 input must be an exact controlled plain-data record.",
      "Provide the canonical-SI current, metal area, electrical state, Rac evidence, and explicit Aeff-or-null field.",
    );
  }
  if (
    typeof controlledInput.currentRmsA !== "number" ||
    !Number.isFinite(controlledInput.currentRmsA) ||
    controlledInput.currentRmsA < 0 ||
    typeof controlledInput.metalAreaM2 !== "number" ||
    !Number.isFinite(controlledInput.metalAreaM2) ||
    controlledInput.metalAreaM2 <= 0
  ) {
    return failure(
      "invalid_input",
      "D-06.numeric_input_invalid",
      "D-06 requires finite I_rms>=0 and finite Ametal>0 in canonical SI.",
      "Correct the current and D-02 metal-area quantities without inserting defaults.",
    );
  }
  if (
    typeof controlledInput.coilMeanTemperatureK !== "number" ||
    !Number.isFinite(controlledInput.coilMeanTemperatureK) ||
    controlledInput.coilMeanTemperatureK <= 0 ||
    !isContentAddressedSnapshotId(
      controlledInput.geometrySnapshotId,
      "geometry",
    ) ||
    typeof controlledInput.frequencyHz !== "number" ||
    !Number.isFinite(controlledInput.frequencyHz) ||
    controlledInput.frequencyHz <= 0 ||
    !isNonBlankIdentifier(controlledInput.portId) ||
    !isNonBlankIdentifier(controlledInput.referencePlane) ||
    !isLoadedState(controlledInput.loadedState)
  ) {
    return failure(
      "invalid_input",
      "D-06.electrical_context_invalid",
      "D-06 requires finite positive coil mean temperature and frequency, a geometry:<64 lowercase hex> snapshot, explicit port and reference plane, and a controlled loaded state.",
      "Resolve the complete same-state electrical and geometry boundary before evaluating current density or copper loss.",
    );
  }
  if (controlledInput.currentBasis === "peak") {
    return failure(
      "invalid_input",
      "D-06.peak_current_not_rms",
      "Peak current cannot be inserted into the RMS copper-loss identity.",
      "Convert the waveform to a compatible RMS or fundamental-RMS quantity with provenance.",
      [
        warning(
          D06_WARNING_PREDICATES.peakCurrentUsedAsRms,
          "The supplied current basis is peak, not RMS.",
        ),
      ],
    );
  }
  if (!isD06CurrentBasis(controlledInput.currentBasis)) {
    return failure(
      "invalid_input",
      "D-06.current_basis_invalid",
      "D-06 current basis contains an uncontrolled value.",
      "Use the frozen D-06 current-basis enumeration without coercion.",
    );
  }
  if (
    controlledInput.currentBasis !== "rms" &&
    controlledInput.currentBasis !== "fundamental_rms"
  ) {
    return failure(
      "not_applicable",
      "D-06.current_basis_invalid",
      "The single-frequency D-06 identity is not applicable to the declared current basis.",
      "Provide a sinusoidal RMS or explicitly extracted fundamental-RMS current at the Rac frequency.",
    );
  }

  const state = Object.freeze({
    currentBasis: controlledInput.currentBasis,
    coilMeanTemperatureK: controlledInput.coilMeanTemperatureK,
    geometrySnapshotId: controlledInput.geometrySnapshotId,
    frequencyHz: controlledInput.frequencyHz,
    portId: controlledInput.portId,
    referencePlane: controlledInput.referencePlane,
    loadedState: controlledInput.loadedState,
  });

  const racResult = readRacEvidence(controlledInput.rac);
  if (!racResult.ok) {
    return racResult.failure;
  }
  if (racResult.evidence.derivationBasis === "back_calculated_from_same_pcu") {
    return failure(
      "invalid_input",
      "D-06.rac_circularity",
      "Rac_used was back-calculated from the same Pcu and would create a circular identity.",
      "Supply an independent D-05 estimate or F-02 same-state measurement.",
      [
        warning(
          D06_WARNING_PREDICATES.resistanceCircularity,
          "The Rac provenance points back to the Pcu result being calculated.",
        ),
      ],
    );
  }
  if (
    racResult.evidence.source === "other_or_unapproved" ||
    !isSuccessfulSourceOutcome(racResult.evidence.sourceOutcome)
  ) {
    return failure(
      "insufficient_data",
      "D-06.rac_source_unapproved",
      "D-06 has no successful Rac result from D-05 or F-02.",
      "Provide an approved D-05 estimate or F-02 same-state measurement; historical values are not accepted.",
    );
  }
  if (!sameElectricalState(state, racResult.evidence)) {
    return failure(
      "not_applicable",
      "D-06.rac_state_mismatch",
      "Current and Rac do not share one current basis, coil mean temperature, geometry snapshot, frequency, port, reference plane, and loaded state.",
      "Resolve a same-state Rac result before calculating Pcu.",
    );
  }

  const effectiveAreaResult = readEffectiveAreaEvidence(
    controlledInput.effectiveArea,
  );
  if (!effectiveAreaResult.ok) {
    return effectiveAreaResult.failure;
  }

  const currentSquaredA2 =
    controlledInput.currentRmsA * controlledInput.currentRmsA;
  const jdc = controlledInput.currentRmsA / controlledInput.metalAreaM2;
  const pcu = currentSquaredA2 * racResult.evidence.resistanceOhm;
  if (
    !Number.isFinite(currentSquaredA2) ||
    (controlledInput.currentRmsA > 0 &&
      !isPositiveNormalBinary64(currentSquaredA2)) ||
    !Number.isFinite(jdc) ||
    jdc < 0 ||
    (controlledInput.currentRmsA > 0 && !isPositiveNormalBinary64(jdc)) ||
    !Number.isFinite(pcu) ||
    pcu < 0 ||
    (controlledInput.currentRmsA > 0 &&
      racResult.evidence.resistanceOhm > 0 &&
      !isPositiveNormalBinary64(pcu))
  ) {
    return failure(
      "invalid_input",
      "D-06.numeric_resolution_invalid",
      "D-06 derived a non-finite or negative mandatory output.",
      "Use finite, representable canonical-SI current, area, and resistance values.",
    );
  }

  let effectiveAreaM2: number | null = null;
  let effectiveAreaOutput: D06CurrentDensityAndCopperLossValue["J_eff"];
  let effectiveAreaWarnings: readonly D06Warning[] = EMPTY_WARNINGS;
  const effectiveAreaEvidence = effectiveAreaResult.evidence;
  if (effectiveAreaEvidence === null) {
    effectiveAreaOutput = unavailableEffectiveCurrentDensity(
      "insufficient_data",
      "No D-05 effective-area result was supplied; D-06 does not infer Aeff.",
    );
  } else if (
    effectiveAreaEvidence.source !== "D-05_approved_estimate" ||
    !isSuccessfulSourceOutcome(effectiveAreaEvidence.sourceOutcome)
  ) {
    effectiveAreaOutput = unavailableEffectiveCurrentDensity(
      "insufficient_data",
      "The supplied Aeff does not carry successful D-05 evidence.",
    );
    effectiveAreaWarnings = Object.freeze([
      warning(
        D06_WARNING_PREDICATES.effectiveAreaNotApproved,
        "J_eff was withheld because Aeff is not a successful D-05 result.",
      ),
    ]);
  } else if (!sameElectricalState(state, effectiveAreaEvidence)) {
    effectiveAreaOutput = unavailableEffectiveCurrentDensity(
      "not_applicable",
      "The D-05 Aeff result does not share the current basis, coil mean temperature, geometry snapshot, frequency, port, reference plane, and loaded state.",
    );
    effectiveAreaWarnings = Object.freeze([
      warning(
        D06_WARNING_PREDICATES.effectiveAreaNotApproved,
        "J_eff was withheld because Aeff is not approved for this electrical state.",
      ),
    ]);
  } else {
    const jeff =
      controlledInput.currentRmsA / effectiveAreaEvidence.effectiveAreaM2;
    if (
      !Number.isFinite(jeff) ||
      jeff < 0 ||
      (controlledInput.currentRmsA > 0 &&
        !isPositiveNormalBinary64(jeff))
    ) {
      return failure(
        "invalid_input",
        "D-06.numeric_resolution_invalid",
        "D-06 derived a non-finite effective-surface current density.",
        "Use a finite, representable current and successful D-05 effective area.",
      );
    }
    effectiveAreaM2 = effectiveAreaEvidence.effectiveAreaM2;
    effectiveAreaOutput = availableCurrentDensity(
      "J_eff",
      jeff,
      "average_rms_current_density_over_d05_effective_surface_area",
    );
  }

  const warnings = Object.freeze([...effectiveAreaWarnings]);
  return Object.freeze({
    methodId: D06_METHOD_ID,
    methodVersion: D06_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings,
    value: Object.freeze({
      Jdc: availableCurrentDensity(
        "Jdc",
        jdc,
        "average_rms_current_density_over_metal_area",
      ),
      J_eff: effectiveAreaOutput,
      Pcu: Object.freeze({
        kind: "available",
        outputId: "Pcu",
        status: "available",
        valueSi: pcu,
        dimensionId: "power",
        canonicalUnitId: "W",
        interpretation: "same_state_active_conductor_loss",
      }),
    }),
    equations: Object.freeze([
      "Jdc = I_rms / Ametal",
      "J_eff = I_rms / Aeff (only with successful D-05 evidence)",
      "Pcu = I_rms^2 * Rac_used",
    ]) as D06CurrentDensityAndCopperLossSuccess["equations"],
    substitution: Object.freeze({
      currentRmsA: controlledInput.currentRmsA,
      metalAreaM2: controlledInput.metalAreaM2,
      effectiveAreaM2,
      resistanceOhm: racResult.evidence.resistanceOhm,
      currentSquaredA2,
    }),
    electricalState: state,
    racEvidence: racResult.evidence,
    effectiveAreaEvidence,
    sourceRefs: D06_SOURCE_REFS,
    contractSourceRefs: D06_CONTRACT_SOURCE_REFS,
    derivationRefs: D06_DERIVATION_REFS,
    validationCaseIds: D06_VALIDATION_CASE_IDS,
    methodCheckIds: D06_METHOD_CHECK_IDS,
    numericRepresentabilityPolicy: D06_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "current is sinusoidal RMS or fundamental RMS",
      "current, Rac and any Aeff use one current basis, coil mean temperature, geometry snapshot, frequency, port, reference plane and loaded state",
      "Jdc and J_eff are cross-section averages, not local hotspots",
      "Rac_used is independently de-embedded to the confirmed coil-copper-loss boundary and is independent of the Pcu result being calculated",
    ]) as D06CurrentDensityAndCopperLossSuccess["assumptions"],
  });
}
