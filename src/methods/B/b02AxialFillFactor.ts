import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { methodId } from "../../domain/ids.js";
import { TOL_ID, tolIdAbsoluteBound } from "../../config/tolerances.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-02"));

export const B02_AXIAL_FILL_FACTOR_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: SPECIFICATION.sourceRefs,
  contractSourceRefs: SPECIFICATION.contractSourceRefs,
  validationCaseIds: SPECIFICATION.validationCaseIds,
  methodCheckIds: SPECIFICATION.methodCheckIds,
});

export interface B02GeometryApplicabilityEvidence {
  readonly windingClass: "uniform_single_layer" | "multilayer" | "other";
  readonly envelopeDefinition:
    | "ADR-0003_full_axial_envelope"
    | "other_or_unknown";
  readonly identicalTurnSections: boolean;
  readonly nonOverlappingAxialProjection: boolean;
}

export interface B02AxialFillFactorInput {
  /** Frozen parameter coil.electrical_turn_count, dimensionless. */
  readonly electricalTurnCount: number;
  /** Frozen parameter conductor.axial_size in canonical SI metres. */
  readonly conductorAxialSizeM: number;
  /** Frozen parameter coil.winding_envelope_length in canonical SI metres. */
  readonly windingEnvelopeLengthM: number;
  /** Explicit evidence for every non-numeric applicability predicate. */
  readonly geometry: B02GeometryApplicabilityEvidence;
}

export interface B02AxialFillFactorValue {
  readonly kFillAxial: number;
  readonly dimensionId: "dimensionless";
  readonly canonicalUnitId: "one";
  readonly interpretation: "axial_projected_coverage";
}

export interface B02AxialFillFactorSuccess {
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly value: B02AxialFillFactorValue;
  readonly equation: "k_fill_axial = N * d_ax / b_env";
  readonly substitution: Readonly<{
    readonly electricalTurnCount: number;
    readonly conductorAxialSizeM: number;
    readonly windingEnvelopeLengthM: number;
  }>;
  readonly assumptions: readonly [
    "uniform identical single-layer turns",
    "non-overlapping axial projection",
    "b_env uses the ADR-0003 full axial envelope definition",
  ];
}

export interface B02AxialFillFactorFailure {
  readonly status: "invalid_input" | "not_applicable" | "insufficient_data";
  readonly applicabilityStatus: "out_of_domain" | "not_evaluated";
  readonly failure: Readonly<{
    readonly code: string;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type B02AxialFillFactorOutcome =
  | B02AxialFillFactorSuccess
  | B02AxialFillFactorFailure;

/** Frozen TOL-ID, used only to normalize binary64 noise at the exact k=1 identity. */
export const B02_IDENTITY_TOLERANCE = TOL_ID.relativeFactor;

function failure(
  status: B02AxialFillFactorFailure["status"],
  code: string,
  message: string,
  action: string,
): B02AxialFillFactorFailure {
  return Object.freeze({
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    failure: Object.freeze({ code, message, action }),
  });
}

/**
 * Isolated canonical-SI implementation of frozen method B-02.
 *
 * The function never supplies geometry defaults. Callers must prove the
 * ADR-0003 envelope and uniform-single-layer applicability explicitly.
 */
export function evaluateB02AxialFillFactor(
  input: B02AxialFillFactorInput,
): B02AxialFillFactorOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "electricalTurnCount",
    "conductorAxialSizeM",
    "windingEnvelopeLengthM",
    "geometry",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "B-02.input_schema_invalid",
      "B-02 input must be a controlled object.",
      "Provide all canonical-SI values and explicit geometry evidence.",
    );
  }
  const { electricalTurnCount, conductorAxialSizeM, windingEnvelopeLengthM } =
    controlledInput;
  if (
    typeof electricalTurnCount !== "number" ||
    !Number.isSafeInteger(electricalTurnCount) ||
    electricalTurnCount < 1 ||
    typeof conductorAxialSizeM !== "number" ||
    !Number.isFinite(conductorAxialSizeM) ||
    conductorAxialSizeM <= 0 ||
    typeof windingEnvelopeLengthM !== "number" ||
    !Number.isFinite(windingEnvelopeLengthM) ||
    windingEnvelopeLengthM <= 0
  ) {
    return failure(
      "invalid_input",
      "B-02.numeric_input_invalid",
      "B-02 requires integer N>=1 and finite positive d_ax and b_env in metres.",
      "Correct the frozen turn-count and geometry quantities.",
    );
  }
  const geometry = readExactPlainDataRecord(controlledInput.geometry, [
    "windingClass",
    "envelopeDefinition",
    "identicalTurnSections",
    "nonOverlappingAxialProjection",
  ]);
  if (geometry === null) {
    return failure(
      "insufficient_data",
      "B-02.geometry_evidence_missing",
      "B-02 cannot establish its uniform-single-layer applicability.",
      "Provide the winding classification, envelope definition, section-uniformity, and overlap evidence.",
    );
  }
  if (
    (geometry.windingClass !== "uniform_single_layer" &&
      geometry.windingClass !== "multilayer" &&
      geometry.windingClass !== "other") ||
    (geometry.envelopeDefinition !== "ADR-0003_full_axial_envelope" &&
      geometry.envelopeDefinition !== "other_or_unknown") ||
    typeof geometry.identicalTurnSections !== "boolean" ||
    typeof geometry.nonOverlappingAxialProjection !== "boolean"
  ) {
    return failure(
      "invalid_input",
      "B-02.geometry_evidence_invalid",
      "B-02 geometry evidence contains an uncontrolled value.",
      "Use the frozen B-02 applicability enumeration and explicit booleans.",
    );
  }
  if (geometry.envelopeDefinition !== "ADR-0003_full_axial_envelope") {
    return failure(
      "insufficient_data",
      "B-02.envelope_semantics_unconfirmed",
      "b_env is not confirmed as the ADR-0003 full axial envelope.",
      "Normalize the geometry through B-01 before calling B-02.",
    );
  }
  if (
    geometry.windingClass !== "uniform_single_layer" ||
    !geometry.identicalTurnSections
  ) {
    return failure(
      "not_applicable",
      "B-02.geometry_not_uniform_single_layer",
      "B-02 is limited to identical turns in a uniform single layer.",
      "Use a method with explicit multilayer or mixed-section geometry semantics.",
    );
  }

  const numerator = electricalTurnCount * conductorAxialSizeM;
  const rawKFillAxial = numerator / windingEnvelopeLengthM;
  const identityBoundAtOne = tolIdAbsoluteBound(1);
  if (!Number.isFinite(numerator) || !Number.isFinite(rawKFillAxial) || rawKFillAxial <= 0) {
    return failure(
      "invalid_input",
      "B-02.numeric_resolution_invalid",
      "B-02 produced a non-finite or non-positive projected coverage from the supplied inputs.",
      "Use finite, representable canonical-SI geometry values.",
    );
  }
  if (
    rawKFillAxial > 1 + identityBoundAtOne ||
    !geometry.nonOverlappingAxialProjection
  ) {
    return failure(
      "invalid_input",
      "B-02.axial_overlap",
      "B-02 requires k_fill_axial<=1 and a non-overlapping axial projection.",
      "Correct the turn count, conductor axial size, or ADR-0003 envelope geometry.",
    );
  }
  const kFillAxial =
    Math.abs(rawKFillAxial - 1) <= identityBoundAtOne
      ? 1
      : rawKFillAxial;

  return Object.freeze({
    status: "success",
    applicabilityStatus: "in_domain",
    value: Object.freeze({
      kFillAxial,
      dimensionId: "dimensionless",
      canonicalUnitId: "one",
      interpretation: "axial_projected_coverage",
    }),
    equation: "k_fill_axial = N * d_ax / b_env",
    substitution: Object.freeze({
      electricalTurnCount,
      conductorAxialSizeM,
      windingEnvelopeLengthM,
    }),
    assumptions: Object.freeze([
      "uniform identical single-layer turns",
      "non-overlapping axial projection",
      "b_env uses the ADR-0003 full axial envelope definition",
    ]) as B02AxialFillFactorSuccess["assumptions"],
  });
}
