import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-01"));

export const D01_METHOD_ID = "D-01" as const;
export const D01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const D01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const D01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const D01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const D01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const D01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** IEEE-754 machine boundary only; never an engineering/model threshold. */
export const D01_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D01_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: D01_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const D01_CONDUCTOR_PATH_LENGTH_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: D01_SOURCE_REFS,
  contractSourceRefs: D01_CONTRACT_SOURCE_REFS,
  derivationRefs: D01_DERIVATION_REFS,
  validationCaseIds: D01_VALIDATION_CASE_IDS,
  methodCheckIds: D01_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: D01_NUMERIC_REPRESENTABILITY_POLICY,
});

const D01_LEAD_OR_BUS_UNKNOWN_PREDICATE =
  "lead length is unknown" as const;
const D01_AXIAL_ADVANCE_CONFLICT_PREDICATE =
  "delta_z_helix conflicts with the turn-center span" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      `D-01 warning predicate is absent from the frozen contract: ${predicate}`,
    );
  }
  return predicate;
}

export const D01_WARNING_PREDICATES = Object.freeze({
  leadOrBusLengthUnknown: controlledWarningPredicate(
    D01_LEAD_OR_BUS_UNKNOWN_PREDICATE,
  ),
  axialAdvanceConflict: controlledWarningPredicate(
    D01_AXIAL_ADVANCE_CONFLICT_PREDICATE,
  ),
});

export interface D01PathApplicabilityEvidence {
  readonly pathGeometry:
    | "uniform_cylindrical_helix"
    | "noncircular_or_multilayer"
    | "other_or_unknown";
  readonly meanDiameterBasis:
    | "mechanical_or_cad_conductor_center_path"
    | "electromagnetic_effective_current_path"
    | "other_or_unknown";
  readonly revolutionCountBasis:
    | "actual_mechanical_or_cad_path"
    | "guessed_from_electrical_turn_count"
    | "other_or_unknown";
  readonly axialAdvanceBasis:
    | "actual_path_endpoint_advance"
    | "guessed_from_turn_center_span"
    | "other_or_unknown";
  readonly turnCenterSpanConsistency:
    | "consistent"
    | "inconsistent"
    | "not_available";
}

export interface D01ConductorPathLengthInput {
  /** Frozen `coil.mean_diameter` (`D_m`) in canonical SI metres. */
  readonly meanMechanicalPathDiameterM: number;
  /** Frozen `coil.helix_revolution_count` (`N_rev`), including partial turns. */
  readonly helixRevolutionCount: number;
  /** Actual signed endpoint advance `delta_z_helix` in canonical SI metres. */
  readonly helixAxialAdvanceM: number;
  /** Explicit lead centre-path segments, or null when the group is unknown. */
  readonly leadSegmentLengthsM: readonly number[] | null;
  /** Explicit bus centre-path segments, or null when the group is unknown. */
  readonly busSegmentLengthsM: readonly number[] | null;
  readonly applicability: D01PathApplicabilityEvidence;
}

export interface D01ConductorPathLengthValue {
  readonly helixLengthM: number;
  readonly leadLengthM: number | null;
  readonly busLengthM: number | null;
  /** Null unless every lead and bus reference-plane segment is known. */
  readonly totalLengthM: number | null;
  /** Sum of the helix and every explicitly known lead/bus segment. */
  readonly knownPathLowerBoundM: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly pathCompleteness: "complete" | "lower_bound_only";
  readonly diameterInterpretation: "mechanical_or_cad_conductor_center_path";
}

export interface D01ConductorPathLengthWarning {
  readonly predicate:
    | typeof D01_LEAD_OR_BUS_UNKNOWN_PREDICATE
    | typeof D01_AXIAL_ADVANCE_CONFLICT_PREDICATE;
  readonly message: string;
}

export interface D01ConductorPathLengthSuccess {
  readonly methodId: typeof D01_METHOD_ID;
  readonly methodVersion: typeof D01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success" | "success_with_warnings";
  readonly applicabilityStatus: "in_domain";
  /** D-01 has no stable warning IDs in the frozen v1 contract. */
  readonly warningIds: readonly [];
  readonly warnings: readonly D01ConductorPathLengthWarning[];
  readonly value: D01ConductorPathLengthValue;
  readonly equation:
    "ell_helix = sqrt((pi * D_m * N_rev)^2 + delta_z_helix^2); ell_total = ell_helix + ell_lead + ell_bus";
  readonly substitution: Readonly<{
    readonly meanMechanicalPathDiameterM: number;
    readonly helixRevolutionCount: number;
    readonly circumferentialTravelM: number;
    readonly helixAxialAdvanceM: number;
    readonly leadSegmentLengthsM: readonly number[] | null;
    readonly busSegmentLengthsM: readonly number[] | null;
  }>;
  readonly applicability: Readonly<D01PathApplicabilityEvidence>;
  readonly numericRepresentabilityPolicy:
    typeof D01_NUMERIC_REPRESENTABILITY_POLICY;
  readonly sourceRefs: typeof D01_SOURCE_REFS;
  readonly contractSourceRefs: typeof D01_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof D01_DERIVATION_REFS;
  readonly validationCaseIds: typeof D01_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof D01_METHOD_CHECK_IDS;
  readonly assumptions: readonly [
    "uniform cylindrical helix",
    "D_m is the mechanical/CAD conductor center-path diameter",
    "N_rev and delta_z_helix describe the same path endpoints",
    "lead and bus paths are summed only at explicit reference planes",
  ];
  readonly failure?: never;
}

export type D01ConductorPathLengthFailureCode =
  | "D-01.input_schema_invalid"
  | "D-01.numeric_input_invalid"
  | "D-01.applicability_evidence_missing"
  | "D-01.applicability_evidence_invalid"
  | "D-01.path_geometry_not_applicable"
  | "D-01.mean_diameter_is_electromagnetic_path"
  | "D-01.mean_diameter_basis_unconfirmed"
  | "D-01.revolution_count_guessed"
  | "D-01.revolution_count_basis_unconfirmed"
  | "D-01.axial_advance_guessed"
  | "D-01.axial_advance_basis_unconfirmed"
  | "D-01.segment_lengths_invalid"
  | "D-01.numeric_resolution_invalid";

export interface D01ConductorPathLengthFailure {
  readonly methodId: typeof D01_METHOD_ID;
  readonly methodVersion: typeof D01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly failure: Readonly<{
    readonly code: D01ConductorPathLengthFailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type D01ConductorPathLengthOutcome =
  | D01ConductorPathLengthSuccess
  | D01ConductorPathLengthFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze(
  [],
) as readonly D01ConductorPathLengthWarning[];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D01_BINARY64_MIN_NORMAL;
}

function isZeroOrNormalMagnitudeBinary64(value: number): boolean {
  return value === 0 || isPositiveNormalBinary64(Math.abs(value));
}

function failure(
  status: D01ConductorPathLengthFailure["status"],
  code: D01ConductorPathLengthFailureCode,
  message: string,
  action: string,
): D01ConductorPathLengthFailure {
  return Object.freeze({
    methodId: D01_METHOD_ID,
    methodVersion: D01_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    failure: Object.freeze({ code, message, action }),
  });
}

type SegmentGroupResult =
  | { readonly status: "known"; readonly segments: readonly number[] }
  | { readonly status: "unknown" }
  | { readonly status: "invalid" };

/**
 * Snapshot a dense segment array without executing element accessors or Proxy
 * `get` traps. Unknown groups are represented only by an explicit null.
 */
function readSegmentGroup(value: unknown): SegmentGroupResult {
  if (value === null) {
    return { status: "unknown" };
  }
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      return { status: "invalid" };
    }
    const keys = Reflect.ownKeys(value);
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor | undefined
    >;
    const lengthDescriptor = descriptors["length"];
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number" ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      return { status: "invalid" };
    }
    const length = lengthDescriptor.value;
    if (
      keys.length !== length + 1 ||
      keys.some((key) => typeof key !== "string") ||
      !keys.includes("length")
    ) {
      return { status: "invalid" };
    }
    const segments: number[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true ||
        typeof descriptor.value !== "number" ||
        !Number.isFinite(descriptor.value) ||
        descriptor.value < 0
      ) {
        return { status: "invalid" };
      }
      segments.push(descriptor.value);
    }
    return { status: "known", segments: Object.freeze(segments) };
  } catch {
    return { status: "invalid" };
  }
}

function sumFiniteNonnegativeSegments(
  segments: readonly number[],
): number | null {
  let sum = 0;
  for (const segment of segments) {
    const previousSum = sum;
    const nextSum = previousSum + segment;
    if (
      !Number.isFinite(nextSum) ||
      nextSum < 0 ||
      (segment > 0 && !isPositiveNormalBinary64(segment)) ||
      (nextSum > 0 && !isPositiveNormalBinary64(nextSum)) ||
      (segment > 0 && nextSum === previousSum) ||
      (previousSum > 0 && nextSum === segment)
    ) {
      return null;
    }
    sum = nextSum;
  }
  return sum;
}

function validateApplicability(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly applicability: Readonly<D01PathApplicabilityEvidence>;
    }
  | { readonly ok: false; readonly failure: D01ConductorPathLengthFailure } {
  const applicability = readExactPlainDataRecord(value, [
    "pathGeometry",
    "meanDiameterBasis",
    "revolutionCountBasis",
    "axialAdvanceBasis",
    "turnCenterSpanConsistency",
  ]);
  if (applicability === null) {
    const absent = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        absent ? "insufficient_data" : "invalid_input",
        absent
          ? "D-01.applicability_evidence_missing"
          : "D-01.applicability_evidence_invalid",
        absent
          ? "D-01 requires explicit mechanical-path applicability evidence."
          : "D-01 applicability evidence must be an exact controlled plain-data record.",
        absent
          ? "Resolve the B-01/CAD path classification and endpoint semantics."
          : "Provide the exact frozen D-01 applicability fields as plain data values.",
      ),
    };
  }
  if (
    (applicability.pathGeometry !== "uniform_cylindrical_helix" &&
      applicability.pathGeometry !== "noncircular_or_multilayer" &&
      applicability.pathGeometry !== "other_or_unknown") ||
    (applicability.meanDiameterBasis !==
      "mechanical_or_cad_conductor_center_path" &&
      applicability.meanDiameterBasis !==
        "electromagnetic_effective_current_path" &&
      applicability.meanDiameterBasis !== "other_or_unknown") ||
    (applicability.revolutionCountBasis !==
      "actual_mechanical_or_cad_path" &&
      applicability.revolutionCountBasis !==
        "guessed_from_electrical_turn_count" &&
      applicability.revolutionCountBasis !== "other_or_unknown") ||
    (applicability.axialAdvanceBasis !== "actual_path_endpoint_advance" &&
      applicability.axialAdvanceBasis !== "guessed_from_turn_center_span" &&
      applicability.axialAdvanceBasis !== "other_or_unknown") ||
    (applicability.turnCenterSpanConsistency !== "consistent" &&
      applicability.turnCenterSpanConsistency !== "inconsistent" &&
      applicability.turnCenterSpanConsistency !== "not_available")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-01.applicability_evidence_invalid",
        "D-01 applicability evidence contains an uncontrolled value.",
        "Use only the frozen D-01 path and endpoint evidence enumeration.",
      ),
    };
  }

  const snapshot = Object.freeze({
    pathGeometry: applicability.pathGeometry,
    meanDiameterBasis: applicability.meanDiameterBasis,
    revolutionCountBasis: applicability.revolutionCountBasis,
    axialAdvanceBasis: applicability.axialAdvanceBasis,
    turnCenterSpanConsistency: applicability.turnCenterSpanConsistency,
  }) as Readonly<D01PathApplicabilityEvidence>;

  if (snapshot.pathGeometry === "noncircular_or_multilayer") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "D-01.path_geometry_not_applicable",
        "The one-segment D-01 helix equation does not represent a noncircular or multilayer path.",
        "Use segmentwise 3D CAD conductor-centerline integration.",
      ),
    };
  }
  if (snapshot.pathGeometry === "other_or_unknown") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.applicability_evidence_missing",
        "The conductor path is not confirmed as a uniform cylindrical helix.",
        "Resolve the B-01/CAD path geometry before evaluating D-01.",
      ),
    };
  }
  if (snapshot.meanDiameterBasis === "electromagnetic_effective_current_path") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-01.mean_diameter_is_electromagnetic_path",
        "D_c cannot replace the mechanical/CAD conductor center-path diameter D_m in D-01.",
        "Provide coil.mean_diameter from B-01 or an equivalent CAD centerline.",
      ),
    };
  }
  if (snapshot.meanDiameterBasis === "other_or_unknown") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.mean_diameter_basis_unconfirmed",
        "The supplied diameter is not confirmed as the mechanical/CAD conductor center path.",
        "Resolve D_m independently; do not substitute D_c.",
      ),
    };
  }
  if (snapshot.revolutionCountBasis === "guessed_from_electrical_turn_count") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.revolution_count_guessed",
        "N_rev was guessed from the electrical turn count N.",
        "Provide the actual complete/partial mechanical path revolution count.",
      ),
    };
  }
  if (snapshot.revolutionCountBasis === "other_or_unknown") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.revolution_count_basis_unconfirmed",
        "The helix revolution count does not have a confirmed mechanical/CAD path basis.",
        "Resolve N_rev from the actual conductor path.",
      ),
    };
  }
  if (snapshot.axialAdvanceBasis === "guessed_from_turn_center_span") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.axial_advance_guessed",
        "delta_z_helix was guessed from a turn-center span or envelope length.",
        "Provide the actual axial advance between the same helix path endpoints.",
      ),
    };
  }
  if (snapshot.axialAdvanceBasis === "other_or_unknown") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-01.axial_advance_basis_unconfirmed",
        "The helix endpoint axial advance is not confirmed.",
        "Resolve delta_z_helix from the actual path endpoints.",
      ),
    };
  }
  return { ok: true, applicability: snapshot };
}

/** Isolated canonical-SI implementation of frozen method D-01. */
export function evaluateD01ConductorPathLength(
  input: unknown,
): D01ConductorPathLengthOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "meanMechanicalPathDiameterM",
    "helixRevolutionCount",
    "helixAxialAdvanceM",
    "leadSegmentLengthsM",
    "busSegmentLengthsM",
    "applicability",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-01.input_schema_invalid",
      "D-01 input must be an exact controlled plain-data record.",
      "Provide canonical-SI D_m, N_rev, delta_z_helix, explicit segment groups, and path evidence.",
    );
  }

  const {
    meanMechanicalPathDiameterM,
    helixRevolutionCount,
    helixAxialAdvanceM,
  } = controlledInput;
  if (
    typeof meanMechanicalPathDiameterM !== "number" ||
    !Number.isFinite(meanMechanicalPathDiameterM) ||
    meanMechanicalPathDiameterM <= 0 ||
    typeof helixRevolutionCount !== "number" ||
    !Number.isFinite(helixRevolutionCount) ||
    helixRevolutionCount <= 0 ||
    typeof helixAxialAdvanceM !== "number" ||
    !Number.isFinite(helixAxialAdvanceM)
  ) {
    return failure(
      "invalid_input",
      "D-01.numeric_input_invalid",
      "D-01 requires finite D_m>0, N_rev>0, and finite delta_z_helix in canonical SI.",
      "Correct the mechanical/CAD path quantities without substituting electrical turn or envelope definitions.",
    );
  }

  const applicabilityResult = validateApplicability(
    controlledInput.applicability,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.failure;
  }

  const leadSegments = readSegmentGroup(controlledInput.leadSegmentLengthsM);
  const busSegments = readSegmentGroup(controlledInput.busSegmentLengthsM);
  if (leadSegments.status === "invalid" || busSegments.status === "invalid") {
    return failure(
      "invalid_input",
      "D-01.segment_lengths_invalid",
      "Lead and bus groups must be explicit nulls or dense plain arrays of finite nonnegative SI lengths.",
      "Provide each measured/drawn reference-plane segment separately; do not use accessors, sparse arrays, or negative lengths.",
    );
  }

  const leadLengthM =
    leadSegments.status === "known"
      ? sumFiniteNonnegativeSegments(leadSegments.segments)
      : null;
  const busLengthM =
    busSegments.status === "known"
      ? sumFiniteNonnegativeSegments(busSegments.segments)
      : null;
  if (
    (leadSegments.status === "known" && leadLengthM === null) ||
    (busSegments.status === "known" && busLengthM === null)
  ) {
    return failure(
      "invalid_input",
      "D-01.numeric_resolution_invalid",
      "The explicit lead or bus path sum is not representable as a finite SI length.",
      "Use finite, representable segment lengths at the declared reference planes.",
    );
  }

  // Preserve the frozen left-to-right source operation order. The explicit
  // intermediate exists only so a positive subnormal product cannot later be
  // magnified into an apparently normal result.
  const piTimesMeanMechanicalPathDiameterM =
    Math.PI * meanMechanicalPathDiameterM;
  if (!isPositiveNormalBinary64(piTimesMeanMechanicalPathDiameterM)) {
    return failure(
      "invalid_input",
      "D-01.numeric_resolution_invalid",
      "The frozen pi*D_m intermediate is not a positive normal finite binary64 SI length.",
      "Use representable canonical-SI path geometry; the binary64 normal boundary is a machine limit, not an engineering threshold.",
    );
  }
  const circumferentialTravelM =
    piTimesMeanMechanicalPathDiameterM * helixRevolutionCount;
  if (
    !isPositiveNormalBinary64(circumferentialTravelM) ||
    !isZeroOrNormalMagnitudeBinary64(helixAxialAdvanceM)
  ) {
    return failure(
      "invalid_input",
      "D-01.numeric_resolution_invalid",
      "A nonzero frozen helix-norm term is not representable as a normal finite binary64 SI length.",
      "Use representable canonical-SI D_m, N_rev, and signed delta_z_helix values without changing the frozen equation.",
    );
  }
  const helixLengthM = Math.hypot(
    circumferentialTravelM,
    helixAxialAdvanceM,
  );
  if (!isPositiveNormalBinary64(helixLengthM)) {
    return failure(
      "invalid_input",
      "D-01.numeric_resolution_invalid",
      "The frozen helix hypot operation did not produce a positive normal finite binary64 length.",
      "Use finite, representable canonical-SI D_m, N_rev, and delta_z_helix values.",
    );
  }

  // These named partial sums retain the original left-associated total. They
  // allow complete loss of either positive addend to fail closed.
  const leadContributionM = leadLengthM ?? 0;
  const busContributionM = busLengthM ?? 0;
  const helixAndLeadLengthM = helixLengthM + leadContributionM;
  const knownPathLowerBoundM = helixAndLeadLengthM + busContributionM;
  if (
    !isPositiveNormalBinary64(helixAndLeadLengthM) ||
    !isPositiveNormalBinary64(knownPathLowerBoundM) ||
    (leadContributionM > 0 && helixAndLeadLengthM === helixLengthM) ||
    (helixLengthM > 0 && helixAndLeadLengthM === leadContributionM) ||
    (busContributionM > 0 &&
      knownPathLowerBoundM === helixAndLeadLengthM) ||
    (helixAndLeadLengthM > 0 &&
      knownPathLowerBoundM === busContributionM)
  ) {
    return failure(
      "invalid_input",
      "D-01.numeric_resolution_invalid",
      "The known mechanical/CAD path sum is not representable as a finite SI length.",
      "Use finite, representable segment lengths at explicit reference planes.",
    );
  }

  const segmentGroupsComplete = leadLengthM !== null && busLengthM !== null;
  const totalLengthM = segmentGroupsComplete ? knownPathLowerBoundM : null;
  const warnings: D01ConductorPathLengthWarning[] = [];
  if (!segmentGroupsComplete) {
    warnings.push(
      Object.freeze({
        predicate: D01_WARNING_PREDICATES.leadOrBusLengthUnknown,
        message:
          "At least one lead/bus reference-plane segment group is unknown; only the explicitly known path lower bound is available.",
      }),
    );
  }
  if (
    applicabilityResult.applicability.turnCenterSpanConsistency ===
    "inconsistent"
  ) {
    warnings.push(
      Object.freeze({
        predicate: D01_WARNING_PREDICATES.axialAdvanceConflict,
        message:
          "The declared actual helix endpoint advance conflicts with the independent turn-center span; the actual endpoint path value was retained.",
      }),
    );
  }
  const frozenWarnings =
    warnings.length === 0 ? EMPTY_WARNINGS : Object.freeze(warnings);
  const frozenLeadSegments =
    leadSegments.status === "known" ? leadSegments.segments : null;
  const frozenBusSegments =
    busSegments.status === "known" ? busSegments.segments : null;

  return Object.freeze({
    methodId: D01_METHOD_ID,
    methodVersion: D01_METHOD_VERSION,
    methodApproval: "approved",
    status: warnings.length === 0 ? "success" : "success_with_warnings",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: frozenWarnings,
    value: Object.freeze({
      helixLengthM,
      leadLengthM,
      busLengthM,
      totalLengthM,
      knownPathLowerBoundM,
      dimensionId: "length",
      canonicalUnitId: "m",
      pathCompleteness: segmentGroupsComplete
        ? "complete"
        : "lower_bound_only",
      diameterInterpretation: "mechanical_or_cad_conductor_center_path",
    }),
    equation:
      "ell_helix = sqrt((pi * D_m * N_rev)^2 + delta_z_helix^2); ell_total = ell_helix + ell_lead + ell_bus",
    substitution: Object.freeze({
      meanMechanicalPathDiameterM,
      helixRevolutionCount,
      circumferentialTravelM,
      helixAxialAdvanceM,
      leadSegmentLengthsM: frozenLeadSegments,
      busSegmentLengthsM: frozenBusSegments,
    }),
    applicability: applicabilityResult.applicability,
    numericRepresentabilityPolicy: D01_NUMERIC_REPRESENTABILITY_POLICY,
    sourceRefs: D01_SOURCE_REFS,
    contractSourceRefs: D01_CONTRACT_SOURCE_REFS,
    derivationRefs: D01_DERIVATION_REFS,
    validationCaseIds: D01_VALIDATION_CASE_IDS,
    methodCheckIds: D01_METHOD_CHECK_IDS,
    assumptions: Object.freeze([
      "uniform cylindrical helix",
      "D_m is the mechanical/CAD conductor center-path diameter",
      "N_rev and delta_z_helix describe the same path endpoints",
      "lead and bus paths are summed only at explicit reference planes",
    ]) as D01ConductorPathLengthSuccess["assumptions"],
  });
}
