import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-03"));

export const D03_METHOD_ID = "D-03" as const;
export const D03_METHOD_VERSION = SPECIFICATION.methodVersion;
export const D03_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const D03_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const D03_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const D03_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const D03_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** IEEE-754 machine boundary only; never an engineering/model threshold. */
export const D03_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D03_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: D03_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const D03_DC_RESISTANCE_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: D03_SOURCE_REFS,
  contractSourceRefs: D03_CONTRACT_SOURCE_REFS,
  derivationRefs: D03_DERIVATION_REFS,
  validationCaseIds: D03_VALIDATION_CASE_IDS,
  methodCheckIds: D03_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: D03_NUMERIC_REPRESENTABILITY_POLICY,
});

const D03_SERIES_EXTRAS_UNKNOWN_PREDICATE =
  "joint resistance is unknown" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `D-03 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const D03_WARNING_PREDICATES = Object.freeze({
  seriesExtrasUnknown: controlledWarningPredicate(
    D03_SERIES_EXTRAS_UNKNOWN_PREDICATE,
  ),
});

export interface D03ResistivitySnapshot {
  /** Electrical resistivity in canonical SI ohm metres. */
  readonly valueOhmM: number;
  /** Stable material identifier for comparison with the conductor state. */
  readonly materialId: string;
  /** Absolute temperature of this property snapshot. */
  readonly temperatureK: number;
  /** Property-level source or project-material reference. */
  readonly sourceRef: string;
  readonly stateMatch:
    | "same_material_temperature_as_conductor"
    | "cold_or_other_material_state"
    | "unconfirmed";
}

export interface D03UniformConductorEvidence {
  readonly materialDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly metalAreaDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly temperatureDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly materialId: string;
  readonly temperatureK: number;
  readonly resistanceBoundary:
    | "conductor_body_only_excludes_series_extras"
    | "includes_series_extras_or_terminal_measurement"
    | "unknown";
}

export interface D03SeriesExtraResistance {
  readonly componentId: string;
  readonly componentKind: "joint" | "braze" | "busbar" | "lead" | "other";
  /** Same-state series resistance in canonical SI ohms. */
  readonly resistanceOhm: number;
  /** Measurement, drawing, case, or controlled-property source reference. */
  readonly sourceRef: string;
  readonly duplicationEvidence:
    | "confirmed_unique_and_excluded_from_conductor_term"
    | "already_included_or_duplicated"
    | "unconfirmed";
}

export interface D03SeriesBoundaryEvidence {
  readonly completeness: "complete" | "unknown_or_incomplete";
  readonly referencePlane:
    | "terminal_equals_conductor_plus_listed_series_extras"
    | "other_or_unknown";
}

export interface D03DcResistanceInput {
  /** D-01 conductor-body path length in canonical SI metres. */
  readonly conductorLengthM: number;
  /** D-02 conducting metal area, never hydraulic area, in square metres. */
  readonly metalAreaM2: number;
  readonly resistivitySnapshot: D03ResistivitySnapshot;
  readonly conductorEvidence: D03UniformConductorEvidence;
  /** Always explicit; use [] only when the declared boundary has no extras. */
  readonly seriesExtraResistances:
    | readonly D03SeriesExtraResistance[]
    | null;
  readonly seriesBoundary: D03SeriesBoundaryEvidence;
}

export interface D03ResistanceOutput {
  readonly kind: "available";
  readonly quantityId: "Rconductor_dc" | "Rterminal_dc";
  readonly value: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation:
    | "uniform_conductor_body_dc_resistance"
    | "terminal_dc_resistance_including_explicit_series_extras";
}

export interface D03SeriesExtraAggregateOutput {
  readonly kind: "available";
  readonly quantityId: "Rseries_extra_sum";
  readonly value: number;
  readonly dimensionId: "electrical_resistance";
  readonly canonicalUnitId: "ohm";
  readonly interpretation: "sum_of_explicit_unique_series_extras";
}

export interface D03UnavailableOutput {
  readonly kind: "unavailable";
  readonly quantityId: "Rterminal_dc" | "Rseries_extra_sum";
  readonly status: "insufficient_data";
  readonly reason:
    "terminal series-extra resistances are explicitly unknown or incomplete";
}

export interface D03SeriesExtraResistanceTrace {
  readonly componentId: string;
  readonly componentKind: D03SeriesExtraResistance["componentKind"];
  readonly resistanceOhm: number;
  readonly sourceRef: string;
  readonly duplicationEvidence:
    "confirmed_unique_and_excluded_from_conductor_term";
}

export interface D03CompleteDcResistanceValue {
  readonly terminalBoundaryStatus: "complete";
  readonly RconductorDc: D03ResistanceOutput;
  readonly RterminalDc: D03ResistanceOutput;
  readonly seriesExtraAggregate: D03SeriesExtraAggregateOutput;
  readonly seriesExtraBreakdown: readonly D03SeriesExtraResistanceTrace[];
}

export interface D03IncompleteDcResistanceValue {
  readonly terminalBoundaryStatus: "unknown_or_incomplete";
  readonly RconductorDc: D03ResistanceOutput;
  readonly RterminalDc: D03UnavailableOutput;
  readonly seriesExtraAggregate: D03UnavailableOutput;
  readonly seriesExtraBreakdown: null;
}

export type D03DcResistanceValue =
  | D03CompleteDcResistanceValue
  | D03IncompleteDcResistanceValue;

export interface D03DcResistanceWarning {
  readonly predicate: typeof D03_SERIES_EXTRAS_UNKNOWN_PREDICATE;
  readonly message: string;
}

interface D03DcResistanceSuccessBase {
  readonly methodId: typeof D03_METHOD_ID;
  readonly methodVersion: typeof D03_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly equations: readonly [
    "R_conductor,dc = rho_e(T) * ell / A_metal",
    "R_terminal,dc = R_conductor,dc + sum(R_series,explicit)",
  ];
  readonly materialSnapshot: Readonly<D03ResistivitySnapshot>;
  readonly conductorEvidence: Readonly<D03UniformConductorEvidence>;
  readonly seriesBoundary: Readonly<D03SeriesBoundaryEvidence>;
  readonly numericRepresentabilityPolicy:
    typeof D03_NUMERIC_REPRESENTABILITY_POLICY;
  readonly sourceRefs: typeof D03_SOURCE_REFS;
  readonly contractSourceRefs: typeof D03_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof D03_DERIVATION_REFS;
  readonly validationCaseIds: typeof D03_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof D03_METHOD_CHECK_IDS;
  readonly units: Readonly<{
    readonly resistivity: "ohm_m";
    readonly length: "m";
    readonly area: "m2";
    readonly resistance: "ohm";
    readonly conductorDimensionalIdentity: "(ohm*m)*m/m2=ohm";
    readonly terminalDimensionalIdentity: "ohm+sum(ohm)=ohm";
  }>;
  readonly assumptions: readonly [
    "material, temperature, and metal cross-section are uniform along the closed-form conductor path",
    "the resistivity snapshot matches the declared conductor material and temperature",
    "terminal extras are either completely enumerated with sources or explicitly unresolved",
    "a terminal resistance is published only for non-overlapping complete boundaries",
  ];
  readonly failure?: never;
}

interface D03SubstitutionBase {
  readonly resistivityOhmM: number;
  readonly conductorLengthM: number;
  readonly metalAreaM2: number;
  readonly conductorResistanceOhm: number;
}

export interface D03CompleteDcResistanceSuccess
  extends D03DcResistanceSuccessBase {
  readonly status: "success";
  readonly warnings: readonly [];
  readonly value: D03CompleteDcResistanceValue;
  readonly substitution: Readonly<
    D03SubstitutionBase & {
      readonly seriesResolution: Readonly<{
        readonly kind: "available";
        readonly seriesExtraResistanceSumOhm: number;
        readonly terminalResistanceOhm: number;
      }>;
    }
  >;
}

export interface D03IncompleteDcResistanceSuccess
  extends D03DcResistanceSuccessBase {
  readonly status: "success_with_warnings";
  readonly warnings: readonly D03DcResistanceWarning[];
  readonly value: D03IncompleteDcResistanceValue;
  readonly substitution: Readonly<
    D03SubstitutionBase & {
      readonly seriesResolution: Readonly<{
        readonly kind: "unavailable";
        readonly status: "insufficient_data";
        readonly reason:
          "terminal series-extra resistances are explicitly unknown or incomplete";
      }>;
    }
  >;
}

export type D03DcResistanceSuccess =
  | D03CompleteDcResistanceSuccess
  | D03IncompleteDcResistanceSuccess;

export type D03DcResistanceFailureCode =
  | "D-03.input_schema_invalid"
  | "D-03.numeric_input_invalid"
  | "D-03.resistivity_snapshot_missing"
  | "D-03.resistivity_snapshot_invalid"
  | "D-03.conductor_evidence_missing"
  | "D-03.conductor_evidence_invalid"
  | "D-03.nonuniform_path_not_applicable"
  | "D-03.uniformity_unconfirmed"
  | "D-03.resistivity_state_mismatch"
  | "D-03.resistivity_state_unconfirmed"
  | "D-03.resistance_boundary_duplicate"
  | "D-03.resistance_boundary_unconfirmed"
  | "D-03.series_boundary_missing"
  | "D-03.series_boundary_invalid"
  | "D-03.series_boundary_inconsistent"
  | "D-03.series_reference_plane_unconfirmed"
  | "D-03.series_extra_array_invalid"
  | "D-03.series_extra_invalid"
  | "D-03.series_extra_source_missing"
  | "D-03.series_extra_duplicate"
  | "D-03.series_extra_duplication_unconfirmed"
  | "D-03.numeric_resolution_invalid";

export interface D03DcResistanceFailure {
  readonly methodId: typeof D03_METHOD_ID;
  readonly methodVersion: typeof D03_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly failure: Readonly<{
    readonly code: D03DcResistanceFailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type D03DcResistanceOutcome =
  | D03DcResistanceSuccess
  | D03DcResistanceFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];
const UNKNOWN_SERIES_WARNINGS = Object.freeze([
  Object.freeze({
    predicate: D03_WARNING_PREDICATES.seriesExtrasUnknown,
    message:
      "Terminal series-extra resistances are explicitly unknown or incomplete; Rconductor_dc remains available but Rterminal_dc is not published.",
  }),
]) as readonly D03DcResistanceWarning[];

function failure(
  status: D03DcResistanceFailure["status"],
  code: D03DcResistanceFailureCode,
  message: string,
  action: string,
): D03DcResistanceFailure {
  return Object.freeze({
    methodId: D03_METHOD_ID,
    methodVersion: D03_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isNonEmptyControlledString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D03_BINARY64_MIN_NORMAL;
}

function isZeroOrPositiveNormalBinary64(value: number): boolean {
  return value === 0 || isPositiveNormalBinary64(value);
}

/** Snapshot a dense plain array without executing element accessors. */
function readDensePlainDataArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      return null;
    }
    const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number" ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      return null;
    }
    const length = lengthDescriptor.value;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== length + 1 ||
      keys.some((key) => typeof key !== "string") ||
      !keys.includes("length")
    ) {
      return null;
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        value,
        String(index),
      );
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function validateResistivitySnapshot(
  value: unknown,
):
  | { readonly ok: true; readonly snapshot: Readonly<D03ResistivitySnapshot> }
  | { readonly ok: false; readonly failure: D03DcResistanceFailure } {
  const snapshot = readExactPlainDataRecord(value, [
    "valueOhmM",
    "materialId",
    "temperatureK",
    "sourceRef",
    "stateMatch",
  ]);
  if (snapshot === null) {
    const absent = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        absent ? "insufficient_data" : "invalid_input",
        absent
          ? "D-03.resistivity_snapshot_missing"
          : "D-03.resistivity_snapshot_invalid",
        absent
          ? "D-03 requires an explicit same-state resistivity snapshot."
          : "The D-03 resistivity snapshot must be an exact controlled plain-data record.",
        "Provide finite positive rho and temperature with material and property-source identifiers.",
      ),
    };
  }
  if (
    typeof snapshot.valueOhmM !== "number" ||
    !Number.isFinite(snapshot.valueOhmM) ||
    snapshot.valueOhmM <= 0 ||
    !isNonEmptyControlledString(snapshot.materialId) ||
    typeof snapshot.temperatureK !== "number" ||
    !Number.isFinite(snapshot.temperatureK) ||
    snapshot.temperatureK <= 0 ||
    !isNonEmptyControlledString(snapshot.sourceRef) ||
    (snapshot.stateMatch !== "same_material_temperature_as_conductor" &&
      snapshot.stateMatch !== "cold_or_other_material_state" &&
      snapshot.stateMatch !== "unconfirmed")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-03.resistivity_snapshot_invalid",
        "The D-03 resistivity snapshot contains an uncontrolled, missing-source, non-finite, or non-positive value.",
        "Use the frozen snapshot fields in canonical SI with a non-empty material property source.",
      ),
    };
  }
  return {
    ok: true,
    snapshot: Object.freeze({
      valueOhmM: snapshot.valueOhmM,
      materialId: snapshot.materialId,
      temperatureK: snapshot.temperatureK,
      sourceRef: snapshot.sourceRef,
      stateMatch: snapshot.stateMatch,
    }) as Readonly<D03ResistivitySnapshot>,
  };
}

function validateConductorEvidence(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly evidence: Readonly<D03UniformConductorEvidence>;
    }
  | { readonly ok: false; readonly failure: D03DcResistanceFailure } {
  const evidence = readExactPlainDataRecord(value, [
    "materialDistribution",
    "metalAreaDistribution",
    "temperatureDistribution",
    "materialId",
    "temperatureK",
    "resistanceBoundary",
  ]);
  if (evidence === null) {
    const absent = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        absent ? "insufficient_data" : "invalid_input",
        absent
          ? "D-03.conductor_evidence_missing"
          : "D-03.conductor_evidence_invalid",
        absent
          ? "D-03 requires explicit uniformity, material-state, and resistance-boundary evidence."
          : "D-03 conductor evidence must be an exact controlled plain-data record.",
        "Resolve the conductor path state and terminal reference boundary before evaluating D-03.",
      ),
    };
  }
  if (
    (evidence.materialDistribution !== "uniform" &&
      evidence.materialDistribution !== "spatially_varying" &&
      evidence.materialDistribution !== "unknown") ||
    (evidence.metalAreaDistribution !== "uniform" &&
      evidence.metalAreaDistribution !== "spatially_varying" &&
      evidence.metalAreaDistribution !== "unknown") ||
    (evidence.temperatureDistribution !== "uniform" &&
      evidence.temperatureDistribution !== "spatially_varying" &&
      evidence.temperatureDistribution !== "unknown") ||
    !isNonEmptyControlledString(evidence.materialId) ||
    typeof evidence.temperatureK !== "number" ||
    !Number.isFinite(evidence.temperatureK) ||
    evidence.temperatureK <= 0 ||
    (evidence.resistanceBoundary !==
      "conductor_body_only_excludes_series_extras" &&
      evidence.resistanceBoundary !==
        "includes_series_extras_or_terminal_measurement" &&
      evidence.resistanceBoundary !== "unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-03.conductor_evidence_invalid",
        "D-03 conductor evidence contains an uncontrolled or non-physical value.",
        "Use the frozen uniformity and resistance-boundary enumeration with a positive absolute temperature.",
      ),
    };
  }
  const controlledEvidence = Object.freeze({
    materialDistribution: evidence.materialDistribution,
    metalAreaDistribution: evidence.metalAreaDistribution,
    temperatureDistribution: evidence.temperatureDistribution,
    materialId: evidence.materialId,
    temperatureK: evidence.temperatureK,
    resistanceBoundary: evidence.resistanceBoundary,
  }) as Readonly<D03UniformConductorEvidence>;
  if (
    controlledEvidence.materialDistribution === "spatially_varying" ||
    controlledEvidence.metalAreaDistribution === "spatially_varying" ||
    controlledEvidence.temperatureDistribution === "spatially_varying"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "D-03.nonuniform_path_not_applicable",
        "The D-03 closed form is not applicable to a spatially varying material, area, or temperature path.",
        "Use a separately registered segmentwise or path-integral method; D-03 does not guess the integration.",
      ),
    };
  }
  if (
    controlledEvidence.materialDistribution === "unknown" ||
    controlledEvidence.metalAreaDistribution === "unknown" ||
    controlledEvidence.temperatureDistribution === "unknown"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-03.uniformity_unconfirmed",
        "Uniform material, metal area, and temperature have not all been confirmed.",
        "Resolve the along-path state before using the D-03 analytical subpath.",
      ),
    };
  }
  if (
    controlledEvidence.resistanceBoundary ===
    "includes_series_extras_or_terminal_measurement"
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-03.resistance_boundary_duplicate",
        "The conductor term already includes a terminal measurement or listed series-extra boundary.",
        "Separate the rho*l/A conductor body from joints, leads, and busbars before summing terminal resistance.",
      ),
    };
  }
  if (controlledEvidence.resistanceBoundary === "unknown") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-03.resistance_boundary_unconfirmed",
        "The conductor-body resistance boundary is not confirmed to exclude series extras.",
        "Resolve the geometric and measurement reference planes before evaluating D-03.",
      ),
    };
  }
  return { ok: true, evidence: controlledEvidence };
}

function validateSeriesBoundary(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly boundary: Readonly<D03SeriesBoundaryEvidence>;
      readonly resolution: D03SeriesBoundaryEvidence["completeness"];
    }
  | { readonly ok: false; readonly failure: D03DcResistanceFailure } {
  const boundary = readExactPlainDataRecord(value, [
    "completeness",
    "referencePlane",
  ]);
  if (boundary === null) {
    const absent = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        absent ? "insufficient_data" : "invalid_input",
        absent
          ? "D-03.series_boundary_missing"
          : "D-03.series_boundary_invalid",
        absent
          ? "The terminal series-extra boundary is missing."
          : "The terminal series-extra boundary must be an exact controlled plain-data record.",
        "Declare completeness and the terminal reference-plane equation explicitly.",
      ),
    };
  }
  if (
    (boundary.completeness !== "complete" &&
      boundary.completeness !== "unknown_or_incomplete") ||
    (boundary.referencePlane !==
      "terminal_equals_conductor_plus_listed_series_extras" &&
      boundary.referencePlane !== "other_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-03.series_boundary_invalid",
        "The D-03 terminal boundary contains an uncontrolled value.",
        "Use the frozen series-boundary enumeration.",
      ),
    };
  }
  if (
    boundary.referencePlane !==
    "terminal_equals_conductor_plus_listed_series_extras"
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-03.series_reference_plane_unconfirmed",
        "The terminal reference plane is not confirmed to equal the conductor term plus the listed extras.",
        "Resolve the DC port boundary before publishing Rterminal_dc.",
      ),
    };
  }
  return {
    ok: true,
    boundary: Object.freeze({
      completeness: boundary.completeness,
      referencePlane: boundary.referencePlane,
    }) as Readonly<D03SeriesBoundaryEvidence>,
    resolution: boundary.completeness,
  };
}

function validateSeriesExtras(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly extras: readonly D03SeriesExtraResistanceTrace[];
      readonly sumOhm: number;
    }
  | { readonly ok: false; readonly failure: D03DcResistanceFailure } {
  const items = readDensePlainDataArray(value);
  if (items === null) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-03.series_extra_array_invalid",
        "seriesExtraResistances must be an explicit dense plain array without accessors or extra properties.",
        "Provide [] only for an explicitly complete no-extra boundary, otherwise list every sourced series component.",
      ),
    };
  }
  const componentIds = new Set<string>();
  const extras: D03SeriesExtraResistanceTrace[] = [];
  let sumOhm = 0;
  for (const item of items) {
    const extra = readExactPlainDataRecord(item, [
      "componentId",
      "componentKind",
      "resistanceOhm",
      "sourceRef",
      "duplicationEvidence",
    ]);
    if (extra === null) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "D-03.series_extra_invalid",
          "Each series extra must be an exact controlled plain-data record.",
          "Provide component ID, kind, nonnegative resistance, source, and duplication evidence.",
        ),
      };
    }
    if (
      !isNonEmptyControlledString(extra.componentId) ||
      (extra.componentKind !== "joint" &&
        extra.componentKind !== "braze" &&
        extra.componentKind !== "busbar" &&
        extra.componentKind !== "lead" &&
        extra.componentKind !== "other") ||
      typeof extra.resistanceOhm !== "number" ||
      !Number.isFinite(extra.resistanceOhm) ||
      extra.resistanceOhm < 0 ||
      (extra.duplicationEvidence !==
        "confirmed_unique_and_excluded_from_conductor_term" &&
        extra.duplicationEvidence !== "already_included_or_duplicated" &&
        extra.duplicationEvidence !== "unconfirmed")
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "D-03.series_extra_invalid",
          "A D-03 series extra contains an uncontrolled, negative, or non-finite value.",
          "Use the frozen component enumeration and a finite nonnegative canonical-SI resistance.",
        ),
      };
    }
    if (!isNonEmptyControlledString(extra.sourceRef)) {
      return {
        ok: false,
        failure: failure(
          "insufficient_data",
          "D-03.series_extra_source_missing",
          "Every D-03 series-extra resistance requires an explicit source.",
          "Attach the measurement, drawing, case, or controlled-property reference for the component.",
        ),
      };
    }
    if (componentIds.has(extra.componentId)) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "D-03.series_extra_duplicate",
          "A series component ID appears more than once in the terminal sum.",
          "Deduplicate the explicit series-extra list and preserve one sourced term per resistance boundary.",
        ),
      };
    }
    if (extra.duplicationEvidence === "already_included_or_duplicated") {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "D-03.series_extra_duplicate",
          "A listed series extra is already included in the conductor term or another resistance.",
          "Remove the duplicate or correct the resistance reference boundaries before summation.",
        ),
      };
    }
    if (extra.duplicationEvidence === "unconfirmed") {
      return {
        ok: false,
        failure: failure(
          "insufficient_data",
          "D-03.series_extra_duplication_unconfirmed",
          "A series extra is not confirmed unique and excluded from the conductor term.",
          "Resolve its geometric and measurement inclusion boundary before summation.",
        ),
      };
    }
    componentIds.add(extra.componentId);
    const previousSumOhm = sumOhm;
    const nextSumOhm = previousSumOhm + extra.resistanceOhm;
    if (
      !Number.isFinite(nextSumOhm) ||
      nextSumOhm < 0 ||
      !isZeroOrPositiveNormalBinary64(extra.resistanceOhm) ||
      !isZeroOrPositiveNormalBinary64(nextSumOhm) ||
      (extra.resistanceOhm > 0 && nextSumOhm === previousSumOhm) ||
      (previousSumOhm > 0 && nextSumOhm === extra.resistanceOhm)
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "D-03.numeric_resolution_invalid",
          "The explicit series-extra sum is not representable as normal finite binary64 arithmetic without losing a positive component.",
          "Use representable same-state component resistances; the binary64 normal boundary is a machine limit, not an engineering threshold.",
        ),
      };
    }
    sumOhm = nextSumOhm;
    extras.push(
      Object.freeze({
        componentId: extra.componentId,
        componentKind: extra.componentKind,
        resistanceOhm: extra.resistanceOhm,
        sourceRef: extra.sourceRef,
        duplicationEvidence:
          "confirmed_unique_and_excluded_from_conductor_term",
      }) as D03SeriesExtraResistanceTrace,
    );
  }
  return { ok: true, extras: Object.freeze(extras), sumOhm };
}

function resistanceOutput(
  quantityId: D03ResistanceOutput["quantityId"],
  value: number,
  interpretation: D03ResistanceOutput["interpretation"],
): D03ResistanceOutput {
  return Object.freeze({
    kind: "available",
    quantityId,
    value,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
    interpretation,
  });
}

function seriesExtraAggregateOutput(
  value: number,
): D03SeriesExtraAggregateOutput {
  return Object.freeze({
    kind: "available",
    quantityId: "Rseries_extra_sum",
    value,
    dimensionId: "electrical_resistance",
    canonicalUnitId: "ohm",
    interpretation: "sum_of_explicit_unique_series_extras",
  });
}

function unavailableOutput(
  quantityId: D03UnavailableOutput["quantityId"],
): D03UnavailableOutput {
  return Object.freeze({
    kind: "unavailable",
    quantityId,
    status: "insufficient_data",
    reason:
      "terminal series-extra resistances are explicitly unknown or incomplete",
  });
}

/** Isolated canonical-SI, non-activated implementation of frozen method D-03. */
export function evaluateD03DcResistance(
  input: unknown,
): D03DcResistanceOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "conductorLengthM",
    "metalAreaM2",
    "resistivitySnapshot",
    "conductorEvidence",
    "seriesExtraResistances",
    "seriesBoundary",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-03.input_schema_invalid",
      "D-03 input must be an exact controlled canonical-SI plain-data record.",
      "Provide length, metal area, resistivity snapshot, uniformity evidence, explicit series extras, and the terminal boundary.",
    );
  }
  if (
    typeof controlledInput.conductorLengthM !== "number" ||
    !Number.isFinite(controlledInput.conductorLengthM) ||
    controlledInput.conductorLengthM <= 0 ||
    typeof controlledInput.metalAreaM2 !== "number" ||
    !Number.isFinite(controlledInput.metalAreaM2) ||
    controlledInput.metalAreaM2 <= 0
  ) {
    return failure(
      "invalid_input",
      "D-03.numeric_input_invalid",
      "D-03 requires finite positive conductor length and conducting metal area in canonical SI.",
      "Use D-01 conductor-body length and D-02 Ametal; never substitute hydraulic area.",
    );
  }

  const snapshotResult = validateResistivitySnapshot(
    controlledInput.resistivitySnapshot,
  );
  if (!snapshotResult.ok) {
    return snapshotResult.failure;
  }
  const conductorResult = validateConductorEvidence(
    controlledInput.conductorEvidence,
  );
  if (!conductorResult.ok) {
    return conductorResult.failure;
  }
  if (
    snapshotResult.snapshot.stateMatch === "cold_or_other_material_state" ||
    snapshotResult.snapshot.materialId !== conductorResult.evidence.materialId ||
    snapshotResult.snapshot.temperatureK !== conductorResult.evidence.temperatureK
  ) {
    return failure(
      "insufficient_data",
      "D-03.resistivity_state_mismatch",
      "The resistivity snapshot does not match the declared conductor material and temperature.",
      "Resolve a same-state material property; do not silently use cold resistivity for a hot conductor.",
    );
  }
  if (snapshotResult.snapshot.stateMatch === "unconfirmed") {
    return failure(
      "insufficient_data",
      "D-03.resistivity_state_unconfirmed",
      "The resistivity snapshot is not confirmed at the conductor material and temperature state.",
      "Resolve same-state material provenance before evaluating D-03.",
    );
  }

  const boundaryResult = validateSeriesBoundary(controlledInput.seriesBoundary);
  if (!boundaryResult.ok) {
    return boundaryResult.failure;
  }
  if (
    (boundaryResult.resolution === "complete" &&
      controlledInput.seriesExtraResistances === null) ||
    (boundaryResult.resolution === "unknown_or_incomplete" &&
      controlledInput.seriesExtraResistances !== null)
  ) {
    return failure(
      "invalid_input",
      "D-03.series_boundary_inconsistent",
      "The explicit series-extra payload conflicts with the declared boundary completeness.",
      "Use a dense sourced array for a complete boundary or explicit null for an unknown/incomplete boundary; never substitute [] or zero for unknown extras.",
    );
  }

  let validatedSeriesExtras: Readonly<{
    readonly extras: readonly D03SeriesExtraResistanceTrace[];
    readonly sumOhm: number;
  }> | null = null;
  if (boundaryResult.resolution === "complete") {
    const extrasResult = validateSeriesExtras(
      controlledInput.seriesExtraResistances,
    );
    if (!extrasResult.ok) {
      return extrasResult.failure;
    }
    validatedSeriesExtras = Object.freeze({
      extras: extrasResult.extras,
      sumOhm: extrasResult.sumOhm,
    });
  }

  // Preserve the frozen left-to-right rho*l/A operation order. The explicit
  // numerator exists only to prevent a positive subnormal product from being
  // magnified by the following division.
  const resistivityLengthProductOhmM2 =
    snapshotResult.snapshot.valueOhmM * controlledInput.conductorLengthM;
  if (!isPositiveNormalBinary64(resistivityLengthProductOhmM2)) {
    return failure(
      "invalid_input",
      "D-03.numeric_resolution_invalid",
      "The frozen rho_e(T)*ell numerator is not a positive normal finite binary64 value.",
      "Use representable canonical-SI length and resistivity; the binary64 normal boundary is a machine limit, not an engineering threshold.",
    );
  }
  const conductorResistanceOhm =
    resistivityLengthProductOhmM2 / controlledInput.metalAreaM2;
  if (!isPositiveNormalBinary64(conductorResistanceOhm)) {
    return failure(
      "invalid_input",
      "D-03.numeric_resolution_invalid",
      "The frozen rho_e(T)*ell/A_metal division did not produce a positive normal finite binary64 resistance.",
      "Use finite, representable canonical-SI length, area, and resistivity without changing the frozen equation.",
    );
  }

  if (boundaryResult.resolution === "unknown_or_incomplete") {
    const unavailableReason =
      "terminal series-extra resistances are explicitly unknown or incomplete" as const;
    return Object.freeze({
      methodId: D03_METHOD_ID,
      methodVersion: D03_METHOD_VERSION,
      methodApproval: "approved",
      status: "success_with_warnings",
      applicabilityStatus: "in_domain",
      warningIds: EMPTY_WARNING_IDS,
      warnings: UNKNOWN_SERIES_WARNINGS,
      value: Object.freeze({
        terminalBoundaryStatus: "unknown_or_incomplete",
        RconductorDc: resistanceOutput(
          "Rconductor_dc",
          conductorResistanceOhm,
          "uniform_conductor_body_dc_resistance",
        ),
        RterminalDc: unavailableOutput("Rterminal_dc"),
        seriesExtraAggregate: unavailableOutput("Rseries_extra_sum"),
        seriesExtraBreakdown: null,
      }),
      equations: Object.freeze([
        "R_conductor,dc = rho_e(T) * ell / A_metal",
        "R_terminal,dc = R_conductor,dc + sum(R_series,explicit)",
      ]) as D03DcResistanceSuccess["equations"],
      substitution: Object.freeze({
        resistivityOhmM: snapshotResult.snapshot.valueOhmM,
        conductorLengthM: controlledInput.conductorLengthM,
        metalAreaM2: controlledInput.metalAreaM2,
        conductorResistanceOhm,
        seriesResolution: Object.freeze({
          kind: "unavailable",
          status: "insufficient_data",
          reason: unavailableReason,
        }),
      }),
      materialSnapshot: snapshotResult.snapshot,
      conductorEvidence: conductorResult.evidence,
      seriesBoundary: boundaryResult.boundary,
      numericRepresentabilityPolicy: D03_NUMERIC_REPRESENTABILITY_POLICY,
      sourceRefs: D03_SOURCE_REFS,
      contractSourceRefs: D03_CONTRACT_SOURCE_REFS,
      derivationRefs: D03_DERIVATION_REFS,
      validationCaseIds: D03_VALIDATION_CASE_IDS,
      methodCheckIds: D03_METHOD_CHECK_IDS,
      units: Object.freeze({
        resistivity: "ohm_m",
        length: "m",
        area: "m2",
        resistance: "ohm",
        conductorDimensionalIdentity: "(ohm*m)*m/m2=ohm",
        terminalDimensionalIdentity: "ohm+sum(ohm)=ohm",
      }),
      assumptions: Object.freeze([
        "material, temperature, and metal cross-section are uniform along the closed-form conductor path",
        "the resistivity snapshot matches the declared conductor material and temperature",
        "terminal extras are either completely enumerated with sources or explicitly unresolved",
        "a terminal resistance is published only for non-overlapping complete boundaries",
      ]) as D03DcResistanceSuccess["assumptions"],
    });
  }

  if (validatedSeriesExtras === null) {
    return failure(
      "invalid_input",
      "D-03.series_boundary_inconsistent",
      "A complete D-03 boundary did not produce a validated explicit series-extra aggregate.",
      "Provide the exact complete-boundary series-extra array required by the frozen contract.",
    );
  }
  const extrasResult = validatedSeriesExtras;
  const terminalResistanceOhm =
    conductorResistanceOhm + extrasResult.sumOhm;
  if (
    !isPositiveNormalBinary64(terminalResistanceOhm) ||
    (extrasResult.sumOhm > 0 &&
      terminalResistanceOhm === conductorResistanceOhm) ||
    (conductorResistanceOhm > 0 &&
      terminalResistanceOhm === extrasResult.sumOhm)
  ) {
    return failure(
      "invalid_input",
      "D-03.numeric_resolution_invalid",
      "The terminal resistance addition is not normal finite binary64 arithmetic or loses a positive conductor/series contribution.",
      "Use representable canonical-SI conductor and series resistances whose positive components remain numerically resolvable.",
    );
  }

  return Object.freeze({
    methodId: D03_METHOD_ID,
    methodVersion: D03_METHOD_VERSION,
    methodApproval: "approved",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    value: Object.freeze({
      terminalBoundaryStatus: "complete",
      RconductorDc: resistanceOutput(
        "Rconductor_dc",
        conductorResistanceOhm,
        "uniform_conductor_body_dc_resistance",
      ),
      RterminalDc: resistanceOutput(
        "Rterminal_dc",
        terminalResistanceOhm,
        "terminal_dc_resistance_including_explicit_series_extras",
      ),
      seriesExtraAggregate: seriesExtraAggregateOutput(extrasResult.sumOhm),
      seriesExtraBreakdown: extrasResult.extras,
    }),
    equations: Object.freeze([
      "R_conductor,dc = rho_e(T) * ell / A_metal",
      "R_terminal,dc = R_conductor,dc + sum(R_series,explicit)",
    ]) as D03DcResistanceSuccess["equations"],
    substitution: Object.freeze({
      resistivityOhmM: snapshotResult.snapshot.valueOhmM,
      conductorLengthM: controlledInput.conductorLengthM,
      metalAreaM2: controlledInput.metalAreaM2,
      conductorResistanceOhm,
      seriesResolution: Object.freeze({
        kind: "available",
        seriesExtraResistanceSumOhm: extrasResult.sumOhm,
        terminalResistanceOhm,
      }),
    }),
    materialSnapshot: snapshotResult.snapshot,
    conductorEvidence: conductorResult.evidence,
    seriesBoundary: boundaryResult.boundary,
    numericRepresentabilityPolicy: D03_NUMERIC_REPRESENTABILITY_POLICY,
    sourceRefs: D03_SOURCE_REFS,
    contractSourceRefs: D03_CONTRACT_SOURCE_REFS,
    derivationRefs: D03_DERIVATION_REFS,
    validationCaseIds: D03_VALIDATION_CASE_IDS,
    methodCheckIds: D03_METHOD_CHECK_IDS,
    units: Object.freeze({
      resistivity: "ohm_m",
      length: "m",
      area: "m2",
      resistance: "ohm",
      conductorDimensionalIdentity: "(ohm*m)*m/m2=ohm",
      terminalDimensionalIdentity: "ohm+sum(ohm)=ohm",
    }),
    assumptions: Object.freeze([
      "material, temperature, and metal cross-section are uniform along the closed-form conductor path",
      "the resistivity snapshot matches the declared conductor material and temperature",
      "terminal extras are either completely enumerated with sources or explicitly unresolved",
      "a terminal resistance is published only for non-overlapping complete boundaries",
    ]) as D03DcResistanceSuccess["assumptions"],
  });
}
