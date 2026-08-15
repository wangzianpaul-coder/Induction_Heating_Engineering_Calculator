/**
 * B-03 ideal long-solenoid analytical-limit check.
 *
 * Canonical SI only. This isolated method intentionally does not choose a
 * long-coil aspect-ratio threshold because none is frozen for v1.
 */

import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-03"));

export const B03_METHOD_ID = "B-03" as const;
export const B03_METHOD_VERSION = SPECIFICATION.methodVersion;
export const B03_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;

export const B03_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const B03_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const B03_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const B03_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const B03_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const B03_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: B03_SOURCE_REFS,
  contractSourceRefs: B03_CONTRACT_SOURCE_REFS,
  derivationRefs: B03_DERIVATION_REFS,
  validationCaseIds: B03_VALIDATION_CASE_IDS,
  methodCheckIds: B03_METHOD_CHECK_IDS,
});

export const B03_ASSUMPTIONS = Object.freeze([
  "infinite_length_uniform_current_sheet",
  "uniform_linear_medium",
  "no_workpiece",
  "no_leads",
  "no_conductor_cross_section_effects",
  "no_end_or_leakage_flux_effects",
] as const);

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];

export type B03Purpose = "analytical_limit_check";

export type B03Medium =
  | {
      /** Explicit air path; the method resolves relative permeability to 1. */
      readonly kind: "air";
    }
  | {
      /** Uniform, linear medium only. */
      readonly kind: "uniform_linear";
      readonly relativePermeability: number;
    };

export interface B03LongSolenoidInput {
  readonly purpose: B03Purpose;
  /** D_c in canonical SI metres. */
  readonly currentPathDiameterM: number;
  /** b_env in canonical SI metres. */
  readonly windingEnvelopeLengthM: number;
  /** Dimensionless electrical turn count. */
  readonly electricalTurnCount: number;
  readonly medium: B03Medium;
}

export interface B03LongSolenoidValue {
  /** L_inf in canonical SI henries. */
  readonly LInfH: number;
  /** a=D_c/2 in canonical SI metres. */
  readonly aM: number;
  /** A=pi*a^2 in canonical SI square metres. */
  readonly areaM2: number;
  /** b_env/D_c, reported without a hard acceptance threshold. */
  readonly bOverD: number;
}

export interface B03EquationEvidence {
  readonly equationId: "CALCULATION_CONTRACTS.md#B-03:Equation";
  readonly canonicalSiEquation: "L_inf=mu0*mu_r*N^2*A/b; a=D_c/2; A=pi*a^2";
  readonly substitution: Readonly<{
    readonly vacuumPermeabilityHPerM: number;
    readonly relativePermeability: number;
    readonly electricalTurnCount: number;
    readonly currentPathDiameterM: number;
    readonly windingEnvelopeLengthM: number;
    readonly radiusM: number;
    readonly areaM2: number;
  }>;
}

export interface B03ApplicabilityEvidence {
  readonly status: "in_domain_for_analytical_limit_check";
  readonly purpose: B03Purpose;
  readonly mediumKind: B03Medium["kind"];
  readonly relativePermeability: number;
  readonly interpretation: "long_solenoid_limit_only";
  readonly hardLengthToDiameterThresholdApplied: false;
  readonly thresholdPolicy: "no_frozen_hard_threshold";
}

export interface B03RecommendationEvidence {
  readonly isRecommended: false;
  readonly reason: "B-03 is frozen as an analytical long-solenoid limit check, not a normal finite-coil Recommended method.";
}

export interface B03UnitEvidence {
  readonly currentPathDiameter: "m";
  readonly windingEnvelopeLength: "m";
  readonly radius: "m";
  readonly area: "m2";
  readonly relativePermeability: "1";
  readonly turnCount: "1";
  readonly lengthToDiameterRatio: "1";
  readonly inductance: "H";
  readonly dimensionalIdentity: "(H/m)*1*1*m2/m=H";
}

export interface B03LongSolenoidEvidence {
  readonly equation: B03EquationEvidence;
  readonly sourceRefs: typeof B03_SOURCE_REFS;
  readonly contractSourceRefs: typeof B03_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof B03_DERIVATION_REFS;
  readonly assumptions: typeof B03_ASSUMPTIONS;
  readonly applicability: B03ApplicabilityEvidence;
  readonly recommendation: B03RecommendationEvidence;
  readonly units: B03UnitEvidence;
  readonly validationCaseIds: typeof B03_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof B03_METHOD_CHECK_IDS;
}

interface B03ResultBase<TStatus extends B03LongSolenoidResult["status"]> {
  readonly methodId: typeof B03_METHOD_ID;
  readonly methodVersion: typeof B03_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: TStatus;
  /** B-03 has no stable method warning ID in the frozen v1 contracts. */
  readonly warningIds: readonly [];
}

export interface B03LongSolenoidSuccess
  extends B03ResultBase<"success"> {
  readonly value: B03LongSolenoidValue;
  readonly evidence: B03LongSolenoidEvidence;
  readonly failure?: never;
}

export type B03LongSolenoidFailureCode =
  | "invalid_input_shape"
  | "unsupported_purpose"
  | "invalid_current_path_diameter"
  | "invalid_winding_envelope_length"
  | "invalid_electrical_turn_count"
  | "missing_medium"
  | "unknown_medium_kind"
  | "invalid_relative_permeability"
  | "nonlinear_medium_not_applicable"
  | "single_turn_current_sheet_not_applicable"
  | "non_finite_derived_value";

export interface B03LongSolenoidFailureDiagnostic {
  readonly code: B03LongSolenoidFailureCode;
  readonly message: string;
}

export interface B03LongSolenoidFailure
  extends B03ResultBase<"invalid_input" | "not_applicable"> {
  readonly status: "invalid_input" | "not_applicable";
  readonly failure: B03LongSolenoidFailureDiagnostic;
  readonly value?: never;
  readonly evidence?: never;
}

export type B03LongSolenoidResult =
  | B03LongSolenoidSuccess
  | B03LongSolenoidFailure;

function failure(
  status: "invalid_input" | "not_applicable",
  code: B03LongSolenoidFailureCode,
  message: string,
): B03LongSolenoidFailure {
  return Object.freeze({
    methodId: B03_METHOD_ID,
    methodVersion: B03_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    warningIds: EMPTY_WARNING_IDS,
    failure: Object.freeze({ code, message }),
  });
}

function resolveMedium(
  value: unknown,
):
  | {
      readonly ok: true;
      readonly kind: B03Medium["kind"];
      readonly relativePermeability: number;
    }
  | {
      readonly ok: false;
      readonly result: B03LongSolenoidFailure;
    } {
  if (value === undefined || value === null) {
    return {
      ok: false,
      result: failure(
        "invalid_input",
        "missing_medium",
        "B-03 requires an explicit air or uniform_linear medium declaration.",
      ),
    };
  }

  const singleFieldMedium = readExactPlainDataRecord(value, ["kind"]);

  // Recognize an erased-type nonlinear request only to fail it as a domain
  // violation; nonlinear media are intentionally not part of B03Medium.
  if (singleFieldMedium?.kind === "nonlinear") {
    return {
      ok: false,
      result: failure(
        "not_applicable",
        "nonlinear_medium_not_applicable",
        "B-03 is limited to air or a uniform linear medium; nonlinear magnetic behavior is not applicable.",
      ),
    };
  }

  if (singleFieldMedium?.kind === "air") {
    return { ok: true, kind: "air", relativePermeability: 1 };
  }

  const uniformLinearMedium = readExactPlainDataRecord(value, [
    "kind",
    "relativePermeability",
  ]);
  if (uniformLinearMedium?.kind === "uniform_linear") {
    if (
      typeof uniformLinearMedium.relativePermeability !== "number" ||
      !Number.isFinite(uniformLinearMedium.relativePermeability) ||
      uniformLinearMedium.relativePermeability <= 0
    ) {
      return {
        ok: false,
        result: failure(
          "invalid_input",
          "invalid_relative_permeability",
          "uniform_linear relativePermeability must be positive and finite.",
        ),
      };
    }
    return {
      ok: true,
      kind: "uniform_linear",
      relativePermeability: uniformLinearMedium.relativePermeability,
    };
  }

  if (singleFieldMedium?.kind === "uniform_linear") {
    return {
      ok: false,
      result: failure(
        "invalid_input",
        "invalid_relative_permeability",
        "uniform_linear requires an explicit relativePermeability; no default is applied.",
      ),
    };
  }

  return {
    ok: false,
    result: failure(
      "invalid_input",
      "unknown_medium_kind",
      "B-03 medium must be exactly {kind:'air'} or {kind:'uniform_linear', relativePermeability}.",
    ),
  };
}

function success(input: {
  readonly currentPathDiameterM: number;
  readonly windingEnvelopeLengthM: number;
  readonly electricalTurnCount: number;
  readonly mediumKind: B03Medium["kind"];
  readonly relativePermeability: number;
  readonly radiusM: number;
  readonly areaM2: number;
  readonly bOverD: number;
  readonly LInfH: number;
}): B03LongSolenoidSuccess {
  const value = Object.freeze({
    LInfH: input.LInfH,
    aM: input.radiusM,
    areaM2: input.areaM2,
    bOverD: input.bOverD,
  });
  const equation = Object.freeze({
    equationId: "CALCULATION_CONTRACTS.md#B-03:Equation" as const,
    canonicalSiEquation:
      "L_inf=mu0*mu_r*N^2*A/b; a=D_c/2; A=pi*a^2" as const,
    substitution: Object.freeze({
      vacuumPermeabilityHPerM: B03_VACUUM_PERMEABILITY_H_PER_M,
      relativePermeability: input.relativePermeability,
      electricalTurnCount: input.electricalTurnCount,
      currentPathDiameterM: input.currentPathDiameterM,
      windingEnvelopeLengthM: input.windingEnvelopeLengthM,
      radiusM: input.radiusM,
      areaM2: input.areaM2,
    }),
  });
  const applicability = Object.freeze({
    status: "in_domain_for_analytical_limit_check" as const,
    purpose: "analytical_limit_check" as const,
    mediumKind: input.mediumKind,
    relativePermeability: input.relativePermeability,
    interpretation: "long_solenoid_limit_only" as const,
    hardLengthToDiameterThresholdApplied: false as const,
    thresholdPolicy: "no_frozen_hard_threshold" as const,
  });
  const recommendation = Object.freeze({
    isRecommended: false as const,
    reason:
      "B-03 is frozen as an analytical long-solenoid limit check, not a normal finite-coil Recommended method." as const,
  });
  const units = Object.freeze({
    currentPathDiameter: "m" as const,
    windingEnvelopeLength: "m" as const,
    radius: "m" as const,
    area: "m2" as const,
    relativePermeability: "1" as const,
    turnCount: "1" as const,
    lengthToDiameterRatio: "1" as const,
    inductance: "H" as const,
    dimensionalIdentity: "(H/m)*1*1*m2/m=H" as const,
  });
  const evidence = Object.freeze({
    equation,
    sourceRefs: B03_SOURCE_REFS,
    contractSourceRefs: B03_CONTRACT_SOURCE_REFS,
    derivationRefs: B03_DERIVATION_REFS,
    assumptions: B03_ASSUMPTIONS,
    applicability,
    recommendation,
    units,
    validationCaseIds: B03_VALIDATION_CASE_IDS,
    methodCheckIds: B03_METHOD_CHECK_IDS,
  });

  return Object.freeze({
    methodId: B03_METHOD_ID,
    methodVersion: B03_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    warningIds: EMPTY_WARNING_IDS,
    value,
    evidence,
  });
}

/**
 * Evaluate B-03 as a canonical-SI analytical-limit check.
 *
 * `unknown` is intentional at this trust boundary: erased JavaScript callers
 * receive a typed failure result rather than an exception or numeric fallback.
 */
export function calculateB03LongSolenoid(
  input: unknown,
): B03LongSolenoidResult {
  const controlledInput = readExactPlainDataRecord(input, [
    "purpose",
    "currentPathDiameterM",
    "windingEnvelopeLengthM",
    "electricalTurnCount",
    "medium",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "invalid_input_shape",
      "B-03 input must match the exact controlled canonical-SI schema.",
    );
  }

  if (typeof controlledInput.purpose !== "string") {
    return failure(
      "invalid_input",
      "unsupported_purpose",
      "B-03 purpose must explicitly be analytical_limit_check.",
    );
  }
  if (controlledInput.purpose !== "analytical_limit_check") {
    return failure(
      "not_applicable",
      "unsupported_purpose",
      "B-03 is not applicable outside the explicit analytical_limit_check purpose.",
    );
  }

  if (
    typeof controlledInput.currentPathDiameterM !== "number" ||
    !Number.isFinite(controlledInput.currentPathDiameterM) ||
    controlledInput.currentPathDiameterM <= 0
  ) {
    return failure(
      "invalid_input",
      "invalid_current_path_diameter",
      "currentPathDiameterM must be positive and finite canonical SI metres.",
    );
  }
  if (
    typeof controlledInput.windingEnvelopeLengthM !== "number" ||
    !Number.isFinite(controlledInput.windingEnvelopeLengthM) ||
    controlledInput.windingEnvelopeLengthM <= 0
  ) {
    return failure(
      "invalid_input",
      "invalid_winding_envelope_length",
      "windingEnvelopeLengthM must be positive and finite canonical SI metres.",
    );
  }
  if (
    typeof controlledInput.electricalTurnCount !== "number" ||
    !Number.isSafeInteger(controlledInput.electricalTurnCount) ||
    controlledInput.electricalTurnCount < 1
  ) {
    return failure(
      "invalid_input",
      "invalid_electrical_turn_count",
      "electricalTurnCount must be a positive safe integer.",
    );
  }

  const medium = resolveMedium(controlledInput.medium);
  if (!medium.ok) {
    return medium.result;
  }

  if (controlledInput.electricalTurnCount === 1) {
    return failure(
      "not_applicable",
      "single_turn_current_sheet_not_applicable",
      "B-03 does not evaluate the N=1 current-sheet chain; use an approved finite-section loop route when available.",
    );
  }

  const radiusM = controlledInput.currentPathDiameterM / 2;
  const areaM2 = Math.PI * radiusM * radiusM;
  const bOverD =
    controlledInput.windingEnvelopeLengthM /
    controlledInput.currentPathDiameterM;
  const turnCountSquared =
    controlledInput.electricalTurnCount * controlledInput.electricalTurnCount;
  const LInfH =
    (B03_VACUUM_PERMEABILITY_H_PER_M *
      medium.relativePermeability *
      turnCountSquared *
      areaM2) /
    controlledInput.windingEnvelopeLengthM;

  if (
    !Number.isFinite(radiusM) ||
    radiusM <= 0 ||
    !Number.isFinite(areaM2) ||
    areaM2 <= 0 ||
    !Number.isFinite(bOverD) ||
    bOverD <= 0 ||
    !Number.isFinite(turnCountSquared) ||
    !Number.isFinite(LInfH) ||
    LInfH <= 0
  ) {
    return failure(
      "invalid_input",
      "non_finite_derived_value",
      "B-03 derived geometry or inductance is non-finite or not positive; no value is published.",
    );
  }

  return success({
    currentPathDiameterM: controlledInput.currentPathDiameterM,
    windingEnvelopeLengthM: controlledInput.windingEnvelopeLengthM,
    electricalTurnCount: controlledInput.electricalTurnCount,
    mediumKind: medium.kind,
    relativePermeability: medium.relativePermeability,
    radiusM,
    areaM2,
    bOverD,
    LInfH,
  });
}
