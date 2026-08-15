import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-02"));

/**
 * IEEE-754 binary64 minimum positive normal value. This is a machine
 * representability boundary only; it is not an engineering tolerance,
 * physical-domain threshold, or source accuracy claim.
 */
export const D02_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D02_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: D02_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

const BLOCKED_CONFLICT_SHAPES = Object.freeze([
  "solid_rect",
  "hollow_rect",
  "solid_rectangular",
  "hollow_rectangular",
  "custom",
] as const);

export const D02_CONDUCTOR_SECTION_GEOMETRY_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: SPECIFICATION.sourceRefs,
  contractSourceRefs: SPECIFICATION.contractSourceRefs,
  validationCaseIds: SPECIFICATION.validationCaseIds,
  methodCheckIds: SPECIFICATION.methodCheckIds,
  numericRepresentabilityPolicy: D02_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness:
    "partial_non_activatable_specification_conflict" as const,
  implementedShapes: Object.freeze(["solid_round", "hollow_round"] as const),
  blockedShapes: BLOCKED_CONFLICT_SHAPES,
  specificationConflict: Object.freeze({
    contractEnumeration: Object.freeze([
      "solid_round",
      "hollow_round",
      "solid_rect",
      "hollow_rect",
    ] as const),
    parameterDictionaryEnumeration: Object.freeze([
      "solid_round",
      "hollow_round",
      "solid_rectangular",
      "hollow_rectangular",
      "custom",
    ] as const),
    gate:
      "Rectangular D-02 routing remains unavailable until the controlled enum conflict is resolved by a new freeze." as const,
  }),
});

export type D02ConductorShape =
  | "solid_round"
  | "hollow_round"
  | (typeof BLOCKED_CONFLICT_SHAPES)[number];

export interface D02RoundOuterDimensions {
  /** Declared mechanical outer diameter in canonical SI metres. */
  readonly outerDiameterM: number;
}

export interface D02RoundInnerDimensions {
  /** Declared mechanical coolant-hole diameter in canonical SI metres. */
  readonly innerDiameterM: number;
}

export interface D02RoundApplicabilityEvidence {
  readonly sectionUniformity:
    | "constant_along_length"
    | "varying_or_unknown";
  readonly sectionBasis:
    | "ideal_declared_dimensions"
    | "actual_cad_required_or_unknown";
  readonly voidPlacement:
    | "centered"
    | "not_applicable"
    | "eccentric_or_unknown";
  readonly depositState: "absent" | "present_or_unknown";
}

interface D02InputBase {
  readonly shape: D02ConductorShape;
  readonly outerDimensions: unknown;
  readonly innerDimensions: unknown;
  readonly applicability: unknown;
}

export interface D02SolidRoundInput extends D02InputBase {
  readonly shape: "solid_round";
  readonly outerDimensions: D02RoundOuterDimensions;
  /** A solid section has no inferred or default coolant hole. */
  readonly innerDimensions: null;
  readonly applicability: D02RoundApplicabilityEvidence;
}

export interface D02HollowRoundInput extends D02InputBase {
  readonly shape: "hollow_round";
  readonly outerDimensions: D02RoundOuterDimensions;
  readonly innerDimensions: D02RoundInnerDimensions;
  readonly applicability: D02RoundApplicabilityEvidence;
}

export interface D02SpecificationConflictInput extends D02InputBase {
  readonly shape: (typeof BLOCKED_CONFLICT_SHAPES)[number];
}

export type D02ConductorSectionGeometryInput =
  | D02SolidRoundInput
  | D02HollowRoundInput
  | D02SpecificationConflictInput;

export interface D02AvailableAreaOutput {
  readonly kind: "available";
  readonly quantityId: "Ametal" | "Ahydraulic";
  readonly value: number;
  readonly dimensionId: "area";
  readonly canonicalUnitId: "m2";
  readonly interpretation:
    | "conducting_metal_cross_section"
    | "internal_coolant_flow_cross_section";
}

export interface D02AvailableLengthOutput {
  readonly kind: "available";
  readonly quantityId: "Pwetted" | "Dh";
  readonly value: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation:
    | "internal_coolant_wetted_perimeter"
    | "internal_coolant_hydraulic_diameter";
}

export interface D02NotApplicableOutput {
  readonly kind: "unavailable";
  readonly quantityId: "Ahydraulic" | "Pwetted" | "Dh";
  readonly status: "not_applicable";
  readonly reason: "solid conductor has no declared internal coolant passage";
}

export interface D02ConductorSectionGeometryValue {
  readonly Ametal: D02AvailableAreaOutput;
  readonly Ahydraulic: D02AvailableAreaOutput | D02NotApplicableOutput;
  readonly Pwetted: D02AvailableLengthOutput | D02NotApplicableOutput;
  readonly Dh: D02AvailableLengthOutput | D02NotApplicableOutput;
}

export interface D02ConductorSectionGeometrySuccess {
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly shape: "solid_round" | "hollow_round";
  readonly value: D02ConductorSectionGeometryValue;
  readonly equations: readonly string[];
  readonly substitution: Readonly<Record<string, number>>;
  readonly assumptions: readonly [
    "ideal cross-section from explicit mechanical dimensions",
    "cross-section is constant along the evaluated length",
    "no deposit changes the declared flow geometry",
  ];
}

export interface D02ConductorSectionGeometryFailure {
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly failure: Readonly<{
    readonly code: string;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type D02ConductorSectionGeometryOutcome =
  | D02ConductorSectionGeometrySuccess
  | D02ConductorSectionGeometryFailure;

function failure(
  status: D02ConductorSectionGeometryFailure["status"],
  code: string,
  message: string,
  action: string,
): D02ConductorSectionGeometryFailure {
  return Object.freeze({
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    failure: Object.freeze({ code, message, action }),
  });
}

function availableArea(
  quantityId: D02AvailableAreaOutput["quantityId"],
  value: number,
  interpretation: D02AvailableAreaOutput["interpretation"],
): D02AvailableAreaOutput {
  return Object.freeze({
    kind: "available",
    quantityId,
    value,
    dimensionId: "area",
    canonicalUnitId: "m2",
    interpretation,
  });
}

function availableLength(
  quantityId: D02AvailableLengthOutput["quantityId"],
  value: number,
  interpretation: D02AvailableLengthOutput["interpretation"],
): D02AvailableLengthOutput {
  return Object.freeze({
    kind: "available",
    quantityId,
    value,
    dimensionId: "length",
    canonicalUnitId: "m",
    interpretation,
  });
}

function hydraulicNotApplicable(
  quantityId: D02NotApplicableOutput["quantityId"],
): D02NotApplicableOutput {
  return Object.freeze({
    kind: "unavailable",
    quantityId,
    status: "not_applicable",
    reason: "solid conductor has no declared internal coolant passage",
  });
}

function isBlockedConflictShape(
  value: unknown,
): value is (typeof BLOCKED_CONFLICT_SHAPES)[number] {
  return (
    typeof value === "string" &&
    BLOCKED_CONFLICT_SHAPES.some((candidate) => candidate === value)
  );
}

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D02_BINARY64_MIN_NORMAL;
}

function validateApplicability(
  value: unknown,
  shape: "solid_round" | "hollow_round",
):
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: D02ConductorSectionGeometryFailure } {
  const applicability = readExactPlainDataRecord(value, [
    "sectionUniformity",
    "sectionBasis",
    "voidPlacement",
    "depositState",
  ]);
  if (applicability === null) {
    const missing = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        missing ? "insufficient_data" : "invalid_input",
        missing
          ? "D-02.applicability_evidence_missing"
          : "D-02.applicability_evidence_schema_invalid",
        missing
          ? "D-02 requires explicit ideal-section applicability evidence."
          : "D-02 applicability evidence must be an exact controlled plain-data record.",
        missing
          ? "Provide section uniformity, ideal-dimension basis, void placement, and deposit state."
          : "Provide only the frozen D-02 applicability fields as plain data values.",
      ),
    };
  }
  if (
    (applicability.sectionUniformity !== "constant_along_length" &&
      applicability.sectionUniformity !== "varying_or_unknown") ||
    (applicability.sectionBasis !== "ideal_declared_dimensions" &&
      applicability.sectionBasis !== "actual_cad_required_or_unknown") ||
    (applicability.voidPlacement !== "centered" &&
      applicability.voidPlacement !== "not_applicable" &&
      applicability.voidPlacement !== "eccentric_or_unknown") ||
    (applicability.depositState !== "absent" &&
      applicability.depositState !== "present_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-02.applicability_evidence_invalid",
        "D-02 applicability evidence contains an uncontrolled value.",
        "Use the frozen D-02 applicability enumeration.",
      ),
    };
  }
  if (
    applicability.sectionUniformity !== "constant_along_length" ||
    applicability.sectionBasis !== "ideal_declared_dimensions" ||
    applicability.depositState !== "absent"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "D-02.actual_section_geometry_required",
        "The declared section requires actual CAD section properties rather than the ideal D-02 identities.",
        "Supply independently derived actual CAD metal and flow geometry through a separately controlled method.",
      ),
    };
  }
  if (
    (shape === "solid_round" &&
      applicability.voidPlacement !== "not_applicable") ||
    (shape === "hollow_round" &&
      applicability.voidPlacement !== "centered")
  ) {
    return {
      ok: false,
      failure: failure(
        shape === "hollow_round" ? "not_applicable" : "invalid_input",
        shape === "hollow_round"
          ? "D-02.centered_void_not_confirmed"
          : "D-02.solid_void_evidence_inconsistent",
        shape === "hollow_round"
          ? "The hollow-round identity requires an explicitly centered circular coolant hole."
          : "A solid-round declaration cannot also declare an internal void placement.",
        shape === "hollow_round"
          ? "Use actual CAD section properties for an eccentric or unconfirmed void."
          : "Set voidPlacement to not_applicable for a solid round conductor.",
      ),
    };
  }
  return { ok: true };
}

function solidRoundSuccess(
  outerDiameterM: number,
  metalAreaM2: number,
): D02ConductorSectionGeometrySuccess {
  return Object.freeze({
    status: "success",
    applicabilityStatus: "in_domain",
    shape: "solid_round",
    value: Object.freeze({
      Ametal: availableArea(
        "Ametal",
        metalAreaM2,
        "conducting_metal_cross_section",
      ),
      Ahydraulic: hydraulicNotApplicable("Ahydraulic"),
      Pwetted: hydraulicNotApplicable("Pwetted"),
      Dh: hydraulicNotApplicable("Dh"),
    }),
    equations: Object.freeze(["Ametal = pi * d_o^2 / 4"]),
    substitution: Object.freeze({ outerDiameterM, metalAreaM2 }),
    assumptions: Object.freeze([
      "ideal cross-section from explicit mechanical dimensions",
      "cross-section is constant along the evaluated length",
      "no deposit changes the declared flow geometry",
    ]) as D02ConductorSectionGeometrySuccess["assumptions"],
  });
}

function hollowRoundSuccess(
  outerDiameterM: number,
  innerDiameterM: number,
  metalAreaM2: number,
  hydraulicAreaM2: number,
  wettedPerimeterM: number,
  hydraulicDiameterM: number,
): D02ConductorSectionGeometrySuccess {
  return Object.freeze({
    status: "success",
    applicabilityStatus: "in_domain",
    shape: "hollow_round",
    value: Object.freeze({
      Ametal: availableArea(
        "Ametal",
        metalAreaM2,
        "conducting_metal_cross_section",
      ),
      Ahydraulic: availableArea(
        "Ahydraulic",
        hydraulicAreaM2,
        "internal_coolant_flow_cross_section",
      ),
      Pwetted: availableLength(
        "Pwetted",
        wettedPerimeterM,
        "internal_coolant_wetted_perimeter",
      ),
      Dh: availableLength(
        "Dh",
        hydraulicDiameterM,
        "internal_coolant_hydraulic_diameter",
      ),
    }),
    equations: Object.freeze([
      "Ametal = pi * (d_o^2 - d_i^2) / 4",
      "Ahydraulic = pi * d_i^2 / 4",
      "Pwetted = pi * d_i",
      "Dh = 4 * Ahydraulic / Pwetted = d_i",
    ]),
    substitution: Object.freeze({
      outerDiameterM,
      innerDiameterM,
      metalAreaM2,
      hydraulicAreaM2,
      wettedPerimeterM,
      hydraulicDiameterM,
    }),
    assumptions: Object.freeze([
      "ideal cross-section from explicit mechanical dimensions",
      "cross-section is constant along the evaluated length",
      "no deposit changes the declared flow geometry",
    ]) as D02ConductorSectionGeometrySuccess["assumptions"],
  });
}

/** Isolated canonical-SI, non-activated implementation of frozen method D-02. */
export function evaluateD02ConductorSectionGeometry(
  input: D02ConductorSectionGeometryInput,
): D02ConductorSectionGeometryOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "shape",
    "outerDimensions",
    "innerDimensions",
    "applicability",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-02.input_schema_invalid",
      "D-02 input must be an exact controlled plain-data record.",
      "Provide shape, canonical-SI dimensions, and explicit applicability evidence without accessors or extra fields.",
    );
  }

  const shape = controlledInput.shape;
  if (isBlockedConflictShape(shape)) {
    return failure(
      "insufficient_data",
      "D-02.specification_conflict",
      "The controlled D-02 rectangular-shape enum conflicts with the engineering parameter dictionary and cannot be routed safely.",
      "Keep D-02 non-activated until a new technical freeze resolves the rectangular shape identifiers.",
    );
  }
  if (shape !== "solid_round" && shape !== "hollow_round") {
    return failure(
      "invalid_input",
      "D-02.shape_invalid",
      "D-02 received an uncontrolled conductor shape.",
      "Use a shape identifier released by the frozen D-02 contract.",
    );
  }

  const applicabilityResult = validateApplicability(
    controlledInput.applicability,
    shape,
  );
  if (!applicabilityResult.ok) {
    return applicabilityResult.failure;
  }

  const outerDimensions = readExactPlainDataRecord(
    controlledInput.outerDimensions,
    ["outerDiameterM"],
  );
  if (outerDimensions === null) {
    return failure(
      controlledInput.outerDimensions === undefined ||
        controlledInput.outerDimensions === null
        ? "insufficient_data"
        : "invalid_input",
      "D-02.outer_dimensions_invalid",
      "Round D-02 geometry requires exactly one explicit outer diameter.",
      "Provide outerDiameterM as a plain finite positive canonical-SI value.",
    );
  }
  const outerDiameterM = outerDimensions.outerDiameterM;
  if (
    typeof outerDiameterM !== "number" ||
    !Number.isFinite(outerDiameterM) ||
    outerDiameterM <= 0
  ) {
    return failure(
      "invalid_input",
      "D-02.outer_dimension_non_positive_or_non_finite",
      "D-02 requires a finite positive outer diameter in metres.",
      "Correct the declared mechanical outer diameter.",
    );
  }

  if (shape === "solid_round") {
    if (controlledInput.innerDimensions !== null) {
      return failure(
        "invalid_input",
        "D-02.solid_inner_dimensions_forbidden",
        "A solid-round section cannot include inner dimensions.",
        "Use innerDimensions:null; D-02 never infers a default center hole.",
      );
    }
    const piTimesOuterDiameterM = Math.PI * outerDiameterM;
    const piTimesOuterDiameterSquaredM2 =
      piTimesOuterDiameterM * outerDiameterM;
    const metalAreaM2 = piTimesOuterDiameterSquaredM2 / 4;
    if (
      !isPositiveNormalBinary64(outerDiameterM) ||
      !isPositiveNormalBinary64(piTimesOuterDiameterM) ||
      !isPositiveNormalBinary64(piTimesOuterDiameterSquaredM2) ||
      !isPositiveNormalBinary64(metalAreaM2)
    ) {
      return failure(
        "invalid_input",
        "D-02.numeric_resolution_invalid",
        "D-02 cannot represent every positive solid-round calculation term as a normal finite binary64 value.",
        "Use finite, representable canonical-SI section dimensions.",
      );
    }
    return solidRoundSuccess(outerDiameterM, metalAreaM2);
  }

  const innerDimensions = readExactPlainDataRecord(
    controlledInput.innerDimensions,
    ["innerDiameterM"],
  );
  if (innerDimensions === null) {
    return failure(
      controlledInput.innerDimensions === undefined ||
        controlledInput.innerDimensions === null
        ? "insufficient_data"
        : "invalid_input",
      "D-02.inner_dimensions_invalid",
      "Hollow-round D-02 geometry requires exactly one explicit inner diameter.",
      "Provide innerDiameterM as a plain finite positive canonical-SI value; no wall-thickness convention is inferred.",
    );
  }
  const innerDiameterM = innerDimensions.innerDiameterM;
  if (
    typeof innerDiameterM !== "number" ||
    !Number.isFinite(innerDiameterM) ||
    innerDiameterM <= 0
  ) {
    return failure(
      "invalid_input",
      "D-02.inner_dimension_non_positive_or_non_finite",
      "D-02 requires a finite positive inner diameter in metres.",
      "Correct the declared mechanical coolant-hole diameter.",
    );
  }
  if (innerDiameterM >= outerDiameterM) {
    return failure(
      "invalid_input",
      "D-02.inner_not_nested",
      "The hollow-round inner diameter must be strictly smaller than the outer diameter.",
      "Correct the explicitly declared inner and outer mechanical dimensions.",
    );
  }

  const diameterDifferenceM = outerDiameterM - innerDiameterM;
  const diameterSumM = outerDiameterM + innerDiameterM;
  const piTimesDiameterDifferenceM = Math.PI * diameterDifferenceM;
  const metalAreaNumeratorM2 =
    piTimesDiameterDifferenceM * diameterSumM;
  const metalAreaM2 = metalAreaNumeratorM2 / 4;
  const wettedPerimeterM = Math.PI * innerDiameterM;
  const hydraulicAreaNumeratorM2 = wettedPerimeterM * innerDiameterM;
  const hydraulicAreaM2 = hydraulicAreaNumeratorM2 / 4;
  const hydraulicDiameterNumeratorM = 4 * hydraulicAreaM2;
  const hydraulicDiameterM =
    hydraulicDiameterNumeratorM / wettedPerimeterM;
  if (
    !isPositiveNormalBinary64(outerDiameterM) ||
    !isPositiveNormalBinary64(innerDiameterM) ||
    !isPositiveNormalBinary64(diameterDifferenceM) ||
    !isPositiveNormalBinary64(diameterSumM) ||
    !isPositiveNormalBinary64(piTimesDiameterDifferenceM) ||
    !isPositiveNormalBinary64(metalAreaNumeratorM2) ||
    !isPositiveNormalBinary64(metalAreaM2) ||
    !isPositiveNormalBinary64(wettedPerimeterM) ||
    !isPositiveNormalBinary64(hydraulicAreaNumeratorM2) ||
    !isPositiveNormalBinary64(hydraulicAreaM2) ||
    !isPositiveNormalBinary64(hydraulicDiameterNumeratorM) ||
    !isPositiveNormalBinary64(hydraulicDiameterM)
  ) {
    return failure(
      "invalid_input",
      "D-02.numeric_resolution_invalid",
      "D-02 cannot represent every positive hollow-round calculation term as a normal finite binary64 value.",
      "Use finite, representable canonical-SI section dimensions.",
    );
  }

  return hollowRoundSuccess(
    outerDiameterM,
    innerDiameterM,
    metalAreaM2,
    hydraulicAreaM2,
    wettedPerimeterM,
    hydraulicDiameterM,
  );
}
