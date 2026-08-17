/**
 * Narrow application boundary for the frozen single-layer inductance family.
 *
 * This module does not activate the formal method registry. B-03 is exposed
 * only as a warning-bearing analytical-limit check after its local CODATA22
 * source pin was closed. B-04 and B-05 remain fail-closed while their
 * independent frozen release gates are open.
 */

import { methodId } from "../domain/ids.js";
import {
  B03_ASSUMPTIONS,
  calculateB03LongSolenoid,
  type B03LongSolenoidResult,
} from "../methods/B/b03LongSolenoid.js";
import {
  B04_ASSUMPTIONS,
  B04_IMPLEMENTATION_READINESS,
} from "../methods/B/b04NagaokaLundinCurrentSheet.js";
import {
  B05_ASSUMPTIONS,
  B05_IMPLEMENTATION_READINESS,
} from "../methods/B/b05WheelerSingleLayer.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";

export const MVP_INDUCTANCE_METHOD_IDS = Object.freeze([
  "B-03",
  "B-04",
  "B-05",
] as const);

export type MvpInductanceMethodId =
  (typeof MVP_INDUCTANCE_METHOD_IDS)[number];

export type MvpInductanceRole =
  | "analytical_limit_only"
  | "conditionally_recommended_finite_current_sheet"
  | "quick_comparison_only";

export interface MvpInductanceActivationGate {
  readonly gateId: string;
  readonly reason: string;
}

export interface MvpInductanceMethodReadiness {
  readonly methodId: MvpInductanceMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved_with_limitation";
  readonly applicationAdapterStatus:
    | "disabled_open_release_gates"
    | "callable_with_mandatory_limitation_warning";
  readonly applicationCallable: boolean;
  readonly formalRuntimeActivationClaim: false;
  readonly formalRuntimeActivation: "blocked";
  readonly role: MvpInductanceRole;
  readonly recommendationEligibility:
    | "not_eligible"
    | "conditionally_eligible";
  readonly openGates: readonly MvpInductanceActivationGate[];
}

const B03_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-03"));
const B04_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-04"));
const B05_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("B-05"));

export const MVP_B03_CODATA22_LOCAL_SOURCE_PIN = cloneAndDeepFreeze({
  sourceId: "CODATA22" as const,
  relativePath:
    "references/external_sources/NIST_CODATA_2022_JPCRD.pdf" as const,
  bytes: 5_920_363 as const,
  sha256:
    "4d7e7f34b98ab2fc4df68b38247f818f6fc8bdf7f25f91abcdfbc329e22d2f32" as const,
  location: "PDF45:TableXXXIII" as const,
  visualReviewStatus: "rendered_and_visually_verified" as const,
  vacuumPermeabilitySourceValue:
    "1.25663706127(20)e-6 N A^-2" as const,
  evaluatorValueHPerM: 1.25663706127e-6 as const,
  controlledRef:
    "CODATA22:LOCAL:NIST_CODATA_2022_JPCRD.pdf:PDF45:TableXXXIII:sha256=4d7e7f34b98ab2fc4df68b38247f818f6fc8bdf7f25f91abcdfbc329e22d2f32" as const,
});

const B03_OPEN_GATES = Object.freeze([
  Object.freeze({
    gateId: "B-03.formal-snapshot-result-trace-warning-adapter",
    reason:
      "Formal MethodRegistry activation still requires the frozen CalculationResult, trace, snapshot, and warning adapter; this narrow MVP route makes no formal activation claim.",
  }),
] as const);

const B04_OPEN_GATES = Object.freeze([
  ...B04_IMPLEMENTATION_READINESS.openGates.map((gate) =>
    Object.freeze({ gateId: gate.gateId, reason: gate.reason }),
  ),
  Object.freeze({
    gateId: "B-04.formal-snapshot-result-trace-warning-adapter",
    reason:
      "Formal activation still requires the frozen CalculationResult, trace, snapshot, and warning adapter after the source and warning-policy release gates close.",
  }),
] as const);

const B05_OPEN_GATES = Object.freeze([
  ...B05_IMPLEMENTATION_READINESS.openGates.map((gate) =>
    Object.freeze({ gateId: gate.gateId, reason: gate.reason }),
  ),
  Object.freeze({
    gateId: "B-05.formal-snapshot-result-trace-warning-adapter",
    reason:
      "Formal activation still requires the frozen CalculationResult, trace, snapshot, and warning adapter after the warning-policy gate closes.",
  }),
] as const);

export const MVP_INDUCTANCE_METHOD_READINESS = cloneAndDeepFreeze([
  {
    methodId: "B-03",
    methodVersion: B03_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation",
    applicationAdapterStatus: "callable_with_mandatory_limitation_warning",
    applicationCallable: true,
    formalRuntimeActivationClaim: false,
    formalRuntimeActivation: "blocked",
    role: "analytical_limit_only",
    recommendationEligibility: "not_eligible",
    openGates: B03_OPEN_GATES,
  },
  {
    methodId: "B-04",
    methodVersion: B04_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation",
    applicationAdapterStatus: "disabled_open_release_gates",
    applicationCallable: false,
    formalRuntimeActivationClaim: false,
    formalRuntimeActivation: "blocked",
    role: "conditionally_recommended_finite_current_sheet",
    recommendationEligibility: "conditionally_eligible",
    openGates: B04_OPEN_GATES,
  },
  {
    methodId: "B-05",
    methodVersion: B05_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation",
    applicationAdapterStatus: "disabled_open_release_gates",
    applicationCallable: false,
    formalRuntimeActivationClaim: false,
    formalRuntimeActivation: "blocked",
    role: "quick_comparison_only",
    recommendationEligibility: "not_eligible",
    openGates: B05_OPEN_GATES,
  },
] as const satisfies readonly MvpInductanceMethodReadiness[]);

export const MVP_INDUCTANCE_CALCULATION_SCOPE = cloneAndDeepFreeze({
  scope: "controlled_runnable_mvp_inductance_adapter" as const,
  formalRuntimeActivationClaim: false as const,
  methodIds: MVP_INDUCTANCE_METHOD_IDS,
  numericallyCallableMethodIds: ["B-03"] as const,
  constraints: [
    "B-03 publishes only the long-solenoid analytical limit from the existing evaluator and is never Recommended.",
    "B-03 always exposes that no frozen aspect-ratio threshold exists; the application never relabels the limit as a finite-coil prediction.",
    "B-04 and B-05 publish no numeric value while their independent frozen release gates remain open.",
    "Comparison is same-boundary side-by-side presentation only; it performs no averaging, ranking, or normalized difference calculation.",
  ] as const,
});

export interface MvpInductanceLocalizedLabel {
  readonly en: string;
  readonly zh: string;
}

export interface MvpInductanceOutput {
  readonly outputId: string;
  readonly label: MvpInductanceLocalizedLabel;
  readonly status: "available";
  readonly value: number;
  readonly unit: "H";
}

export interface MvpInductanceWarning {
  /** Null means a frozen prose predicate exists but no stable warning ID exists. */
  readonly code: string | null;
  readonly predicate: string | null;
  readonly message: string;
}

export interface MvpInductanceFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpInductanceGeometryBoundary {
  /** Null when the isolated evaluator has no formal B-01 snapshot adapter. */
  readonly geometrySnapshotId: string | null;
  readonly currentPathDiameterM: number;
  readonly windingEnvelopeLengthM: number;
  readonly electricalTurnCount: number;
}

export interface MvpInductanceCalculationResult {
  readonly methodId: MvpInductanceMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success_with_warnings"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable"
    | "disabled";
  readonly role: MvpInductanceRole;
  readonly recommendation: Readonly<{
    readonly isRecommended: boolean;
    readonly eligibility: "not_eligible" | "conditionally_eligible";
    readonly reason: string;
  }>;
  readonly outputs: readonly MvpInductanceOutput[];
  readonly warnings: readonly MvpInductanceWarning[];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly domain: string;
  }>;
  readonly geometryBoundary: MvpInductanceGeometryBoundary | null;
  readonly limitations: readonly string[];
  readonly failure: MvpInductanceFailure | null;
}

export interface MvpB03CalculationInput {
  readonly methodId: "B-03";
  readonly purpose: "analytical_limit_check";
  readonly currentPathDiameterM: number;
  readonly windingEnvelopeLengthM: number;
  readonly electricalTurnCount: number;
  readonly mediumKind: "air" | "uniform_linear";
  readonly relativePermeability: number | null;
}

export interface MvpB04CalculationInput {
  readonly methodId: "B-04";
  readonly currentPathDiameterM: number;
  readonly windingEnvelopeLengthM: number;
  readonly electricalTurnCount: number;
  readonly geometrySnapshotId: string;
  readonly semanticMappingStatus:
    | "confirmed_same_B01_snapshot"
    | "unconfirmed";
  readonly currentPathBasis:
    | "explicit_method_or_state_bound"
    | "ADR_0003_default_centroid_unresolved"
    | "other_or_unknown";
  readonly windingClass:
    | "uniform_single_layer"
    | "multilayer"
    | "other_or_unknown";
  readonly airCoreStatus:
    | "confirmed_air_core"
    | "not_air_core"
    | "unconfirmed";
  readonly currentSheetIdealization:
    | "confirmed_for_analytical_baseline"
    | "not_satisfied"
    | "unconfirmed";
}

export interface MvpB05CalculationInput {
  readonly methodId: "B-05";
  readonly currentPathDiameterM: number;
  readonly windingEnvelopeLengthM: number;
  readonly electricalTurnCount: number;
  readonly geometrySnapshotId: string;
  readonly semanticMappingStatus:
    | "confirmed_same_B01_snapshot"
    | "unconfirmed";
  readonly currentPathBasis:
    | "explicit_method_or_state_bound"
    | "ADR_0003_default_centroid_unresolved"
    | "other_or_unknown";
  readonly windingClass:
    | "uniform_single_layer"
    | "multilayer"
    | "other_or_unknown";
  readonly wheelerGeometryStatus:
    | "confirmed_W28_Figure_2_single_layer_helical"
    | "not_satisfied"
    | "unconfirmed";
  readonly radiusMapping:
    | "method_derives_a_as_D_c_over_2"
    | "diameter_passed_to_radius_formula"
    | "unconfirmed";
  readonly sourceUnitMapping:
    | "canonical_SI_m_converted_to_exact_inch"
    | "millimetres_passed_directly_to_inch_formula"
    | "unconfirmed";
  readonly nagaokaFactorApplication:
    | "none"
    | "applied_again"
    | "unconfirmed";
}

const B03_INPUT_KEYS = Object.freeze([
  "methodId",
  "purpose",
  "currentPathDiameterM",
  "windingEnvelopeLengthM",
  "electricalTurnCount",
  "mediumKind",
  "relativePermeability",
] as const);

const RESULT_KEYS = Object.freeze([
  "methodId",
  "methodVersion",
  "approvalStatus",
  "formalRuntimeActivationClaim",
  "status",
  "role",
  "recommendation",
  "outputs",
  "warnings",
  "assumptions",
  "sources",
  "applicability",
  "geometryBoundary",
  "limitations",
  "failure",
] as const);

const DISABLED_LIMITATIONS = cloneAndDeepFreeze({
  "B-04": [
    "B-04 is conditionally Recommended only for the frozen uniform air-core cylindrical-current-sheet domain.",
    "It does not represent discrete turns, pitch, conductor cross section, leads, workpiece loading, or distributed capacitance.",
  ],
  "B-05": [
    "B-05 is a W28 Equation (2) quick engineering comparison only and is not eligible to be Recommended.",
    "Its few-turn, pitch, and conductor-thickness warning trigger policy is not frozen, so numeric publication remains disabled.",
  ],
} as const);

const B03_LIMITATIONS = Object.freeze([
  "B-03 is an infinite-length analytical limit, not a normal finite-coil result.",
  "No aspect-ratio threshold is frozen, so the application never relabels this limit as a finite-coil prediction.",
  "The result excludes finite-length end effects, discrete turns, pitch, conductor cross section, leads, workpiece loading, leakage, and distributed capacitance.",
] as const);

function safeCloneInput(value: unknown): unknown | null {
  try {
    return cloneAndDeepFreeze(value);
  } catch {
    return null;
  }
}

function sourcesFor(id: MvpInductanceMethodId): readonly string[] {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
  return Object.freeze(
    Array.from(
      new Set<string>([
        ...specification.sourceRefs,
        ...specification.contractSourceRefs,
        ...specification.derivationRefs,
        ...(id === "B-03"
          ? [MVP_B03_CODATA22_LOCAL_SOURCE_PIN.controlledRef]
          : []),
      ]),
    ),
  );
}

function readinessFor(
  id: MvpInductanceMethodId,
): MvpInductanceMethodReadiness {
  const readiness = MVP_INDUCTANCE_METHOD_READINESS.find(
    (candidate) => candidate.methodId === id,
  );
  if (readiness === undefined) {
    throw new Error(`Missing inductance readiness for ${id}.`);
  }
  return readiness;
}

function assumptionsFor(id: MvpInductanceMethodId): readonly string[] {
  if (id === "B-03") return B03_ASSUMPTIONS;
  if (id === "B-04") return B04_ASSUMPTIONS;
  return B05_ASSUMPTIONS;
}

function recommendationFor(
  id: MvpInductanceMethodId,
): MvpInductanceCalculationResult["recommendation"] {
  if (id === "B-04") {
    return {
      isRecommended: false,
      eligibility: "conditionally_eligible",
      reason:
        "B-04 can be Recommended only after its release gates close and only inside the frozen uniform air-core cylindrical-current-sheet domain.",
    };
  }
  if (id === "B-03") {
    return {
      isRecommended: false,
      eligibility: "not_eligible",
      reason:
        "B-03 is frozen as an analytical long-solenoid limit check, not a finite-coil Recommended method.",
    };
  }
  return {
    isRecommended: false,
    eligibility: "not_eligible",
    reason: B05_SPECIFICATION.recommendationReason,
  };
}

function disabledResult(
  id: "B-04" | "B-05",
): MvpInductanceCalculationResult {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
  const readiness = readinessFor(id);
  const gateSummary = readiness.openGates.map((gate) => gate.gateId).join(", ");
  return cloneAndDeepFreeze({
    methodId: id,
    methodVersion: specification.methodVersion,
    approvalStatus: "approved_with_limitation" as const,
    formalRuntimeActivationClaim: false as const,
    status: "disabled" as const,
    role: readiness.role,
    recommendation: recommendationFor(id),
    outputs: [] as const,
    warnings: [
      {
        code: `MVP-${id}.release_gates_open`,
        predicate: null,
        message: `Numeric publication remains disabled while these frozen gates are open: ${gateSummary}.`,
      },
    ],
    assumptions: assumptionsFor(id),
    sources: sourcesFor(id),
    applicability: {
      status: "not_evaluated" as const,
      domain: specification.applicabilityDomain,
    },
    geometryBoundary: null,
    limitations: DISABLED_LIMITATIONS[id],
    failure: {
      code: `MVP-${id}.release_gates_open`,
      message: "The method evaluator exists, but this application boundary cannot safely publish a numeric result yet.",
      action:
        "Close the listed controlled source, validation, and warning-policy gates; do not use a historical value or an untracked constant as a substitute.",
    },
  });
}

function b03AdapterFailure(
  status: "invalid_input" | "insufficient_data",
  code: string,
  message: string,
  action: string,
): MvpInductanceCalculationResult {
  return cloneAndDeepFreeze({
    methodId: "B-03" as const,
    methodVersion: B03_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation" as const,
    formalRuntimeActivationClaim: false as const,
    status,
    role: "analytical_limit_only" as const,
    recommendation: recommendationFor("B-03"),
    outputs: [] as const,
    warnings: [] as const,
    assumptions: [] as const,
    sources: sourcesFor("B-03"),
    applicability: {
      status: "not_evaluated" as const,
      domain: B03_SPECIFICATION.applicabilityDomain,
    },
    geometryBoundary: null,
    limitations: B03_LIMITATIONS,
    failure: { code, message, action },
  });
}

function normalizeB03(
  outcome: B03LongSolenoidResult,
  boundary: MvpInductanceGeometryBoundary,
): MvpInductanceCalculationResult {
  if (outcome.status !== "success") {
    return cloneAndDeepFreeze({
      methodId: "B-03" as const,
      methodVersion: B03_SPECIFICATION.methodVersion,
      approvalStatus: "approved_with_limitation" as const,
      formalRuntimeActivationClaim: false as const,
      status: outcome.status,
      role: "analytical_limit_only" as const,
      recommendation: recommendationFor("B-03"),
      outputs: [] as const,
      warnings: [] as const,
      assumptions: [] as const,
      sources: sourcesFor("B-03"),
      applicability: {
        status: outcome.status === "not_applicable"
          ? ("out_of_domain" as const)
          : ("not_evaluated" as const),
        domain: B03_SPECIFICATION.applicabilityDomain,
      },
      geometryBoundary: null,
      limitations: B03_LIMITATIONS,
      failure: {
        code: outcome.failure.code,
        message: outcome.failure.message,
        action:
          "Correct the explicit geometry, purpose, or linear-medium declaration; no fallback permeability or finite-coil result is supplied.",
      },
    });
  }

  const warnings: MvpInductanceWarning[] = [
    {
      code: null,
      predicate: "finite-length result is presented as the primary result",
      message:
        "B-03 is published only as the infinite-length analytical limit. No frozen b_env/D_c threshold exists, so this value must not be presented as the primary finite-coil prediction.",
    },
  ];
  return cloneAndDeepFreeze({
    methodId: "B-03" as const,
    methodVersion: outcome.methodVersion,
    approvalStatus: outcome.methodApproval,
    formalRuntimeActivationClaim: false as const,
    status: "success_with_warnings" as const,
    role: "analytical_limit_only" as const,
    recommendation: recommendationFor("B-03"),
    outputs: [
      {
        outputId: "L_inf",
        label: { en: "Ideal long-solenoid limit", zh: "理想长螺线管电感极限" },
        status: "available" as const,
        value: outcome.value.LInfH,
        unit: "H" as const,
      },
    ],
    warnings,
    assumptions: outcome.evidence.assumptions,
    sources: sourcesFor("B-03"),
    applicability: {
      status: "in_domain" as const,
      domain: B03_SPECIFICATION.applicabilityDomain,
    },
    geometryBoundary: boundary,
    limitations: B03_LIMITATIONS,
    failure: null,
  });
}

/** Evaluate the locally source-pinned B-03 analytical-limit route. */
export function calculateMvpB03(
  input: MvpB03CalculationInput | unknown,
): MvpInductanceCalculationResult {
  const cloned = safeCloneInput(input);
  const record = readExactPlainDataRecord(cloned, B03_INPUT_KEYS);
  if (record === null || record.methodId !== "B-03") {
    return b03AdapterFailure(
      "invalid_input",
      "MVP-B-03.input_schema_invalid",
      "The B-03 MVP input does not match the exact controlled adapter schema.",
      "Provide exact D_c, b_env, N, purpose, and medium fields without aliases or accessors.",
    );
  }

  let medium: { readonly kind: "air" } | {
    readonly kind: "uniform_linear";
    readonly relativePermeability: number;
  };
  if (record.mediumKind === "air") {
    if (record.relativePermeability !== null) {
      return b03AdapterFailure(
        "invalid_input",
        "MVP-B-03.air_medium_permeability_conflict",
        "The explicit air route resolves relative permeability to 1 and does not accept a second permeability value.",
        "Set relativePermeability to null for air, or select uniform_linear with an explicit positive value.",
      );
    }
    medium = { kind: "air" };
  } else if (record.mediumKind === "uniform_linear") {
    medium = {
      kind: "uniform_linear",
      relativePermeability: record.relativePermeability as number,
    };
  } else {
    return b03AdapterFailure(
      "invalid_input",
      "MVP-B-03.medium_kind_invalid",
      "mediumKind must be exactly air or uniform_linear.",
      "Select an explicit controlled linear-medium route; nonlinear media are not applicable.",
    );
  }

  const boundary = {
    geometrySnapshotId: null,
    currentPathDiameterM: record.currentPathDiameterM as number,
    windingEnvelopeLengthM: record.windingEnvelopeLengthM as number,
    electricalTurnCount: record.electricalTurnCount as number,
  };
  return normalizeB03(
    calculateB03LongSolenoid({
      purpose: record.purpose as "analytical_limit_check",
      currentPathDiameterM: record.currentPathDiameterM as number,
      windingEnvelopeLengthM: record.windingEnvelopeLengthM as number,
      electricalTurnCount: record.electricalTurnCount as number,
      medium,
    }),
    boundary,
  );
}

/** B-04 remains intentionally fail-closed; the supplied input is never read. */
export function calculateMvpB04(
  _input: MvpB04CalculationInput | unknown,
): MvpInductanceCalculationResult {
  return disabledResult("B-04");
}

/** B-05 remains intentionally fail-closed; the supplied input is never read. */
export function calculateMvpB05(
  _input: MvpB05CalculationInput | unknown,
): MvpInductanceCalculationResult {
  return disabledResult("B-05");
}

export interface MvpInductanceComparisonRow {
  readonly methodId: MvpInductanceMethodId;
  readonly role: MvpInductanceRole;
  readonly status: MvpInductanceCalculationResult["status"];
  readonly inductanceH: number | null;
  readonly geometrySnapshotId: string | null;
  readonly isRecommended: boolean;
  readonly recommendationReason: string;
}

export interface MvpInductanceComparisonResult {
  readonly status:
    | "success_with_warnings"
    | "insufficient_data"
    | "invalid_input";
  readonly formalComparisonClaim: false;
  readonly rows: readonly MvpInductanceComparisonRow[];
  readonly recommendedMethodId: "B-04" | null;
  readonly recommendedReason: string;
  readonly policy: Readonly<{
    readonly sameGeometryBoundaryRequired: true;
    readonly averaged: false;
    readonly ranked: false;
    readonly normalizedDifferencesComputed: false;
    readonly agreementIsValidation: false;
  }>;
  readonly warnings: readonly MvpInductanceWarning[];
  readonly failure: MvpInductanceFailure | null;
}

function invalidComparison(
  code: string,
  message: string,
  action: string,
): MvpInductanceComparisonResult {
  return cloneAndDeepFreeze({
    status: "invalid_input" as const,
    formalComparisonClaim: false as const,
    rows: [] as const,
    recommendedMethodId: null,
    recommendedReason:
      "No Recommended method is published from an invalid comparison request.",
    policy: {
      sameGeometryBoundaryRequired: true as const,
      averaged: false as const,
      ranked: false as const,
      normalizedDifferencesComputed: false as const,
      agreementIsValidation: false as const,
    },
    warnings: [] as const,
    failure: { code, message, action },
  });
}

/**
 * Build a side-by-side view from controlled application results.
 *
 * The function preserves caller order and never manufactures normalized
 * metrics. With the current gates, only B-03 can carry a numeric value, so a
 * genuine multi-method numerical comparison correctly remains unavailable.
 */
export function compareMvpInductanceResults(
  results: readonly MvpInductanceCalculationResult[] | unknown,
): MvpInductanceComparisonResult {
  const cloned = safeCloneInput(results);
  if (!Array.isArray(cloned)) {
    return invalidComparison(
      "MVP-INDUCTANCE.comparison_schema_invalid",
      "The comparison input must be a dense plain array of controlled inductance results.",
      "Pass results returned by the MVP inductance adapter without mutation.",
    );
  }

  const records = cloned.map((candidate) =>
    readExactPlainDataRecord(candidate, RESULT_KEYS),
  );
  if (records.some((candidate) => candidate === null)) {
    return invalidComparison(
      "MVP-INDUCTANCE.comparison_schema_invalid",
      "At least one comparison row does not match the exact controlled result envelope.",
      "Pass only unmodified results from calculateMvpB03/B04/B05.",
    );
  }

  const ids = records.map((record) => record?.methodId);
  if (
    ids.some((id) => !MVP_INDUCTANCE_METHOD_IDS.includes(id as MvpInductanceMethodId)) ||
    new Set(ids).size !== ids.length
  ) {
    return invalidComparison(
      "MVP-INDUCTANCE.comparison_method_set_invalid",
      "Comparison method IDs must be unique members of B-03, B-04, and B-05.",
      "Remove duplicate or unsupported method rows.",
    );
  }

  const typedResults = cloned as readonly MvpInductanceCalculationResult[];
  for (const result of typedResults) {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(
      methodId(result.methodId),
    );
    const numericB03 =
      result.methodId === "B-03" &&
      result.status === "success_with_warnings";
    const b03Output = numericB03 ? result.outputs[0] : undefined;
    const numericB03EnvelopeTrusted =
      !numericB03 ||
      (result.role === "analytical_limit_only" &&
        result.recommendation.isRecommended === false &&
        result.recommendation.eligibility === "not_eligible" &&
        result.outputs.length === 1 &&
        b03Output?.outputId === "L_inf" &&
        b03Output.unit === "H" &&
        Number.isFinite(b03Output.value) &&
        b03Output.value > 0 &&
        result.geometryBoundary !== null &&
        result.geometryBoundary.geometrySnapshotId === null &&
        Number.isFinite(result.geometryBoundary.currentPathDiameterM) &&
        result.geometryBoundary.currentPathDiameterM > 0 &&
        Number.isFinite(result.geometryBoundary.windingEnvelopeLengthM) &&
        result.geometryBoundary.windingEnvelopeLengthM > 0 &&
        Number.isSafeInteger(result.geometryBoundary.electricalTurnCount) &&
        result.geometryBoundary.electricalTurnCount > 1);
    if (
      result.methodVersion !== specification.methodVersion ||
      result.approvalStatus !== "approved_with_limitation" ||
      result.formalRuntimeActivationClaim !== false ||
      (result.methodId !== "B-03" && result.status !== "disabled") ||
      (result.status === "disabled" && result.outputs.length !== 0) ||
      !numericB03EnvelopeTrusted
    ) {
      return invalidComparison(
        "MVP-INDUCTANCE.comparison_result_untrusted",
        "A comparison result conflicts with the frozen method version, approval, activation, or callable-method boundary.",
        "Recalculate the row through the current MVP adapter.",
      );
    }
  }

  const numericResults = typedResults.filter(
    (result) => result.status === "success_with_warnings",
  );
  const boundaries = numericResults.map((result) => result.geometryBoundary);
  if (boundaries.some((boundary) => boundary === null)) {
    return invalidComparison(
      "MVP-INDUCTANCE.comparison_boundary_missing",
      "Every numeric comparison row must carry its exact geometry boundary.",
      "Recalculate the row from the exact controlled geometry input.",
    );
  }
  if (boundaries.length > 1) {
    const reference = boundaries[0];
    if (
      reference === undefined ||
      reference === null ||
      boundaries.some(
        (boundary) =>
          boundary === null ||
          boundary.geometrySnapshotId !== reference.geometrySnapshotId ||
          boundary.currentPathDiameterM !== reference.currentPathDiameterM ||
          boundary.windingEnvelopeLengthM !==
            reference.windingEnvelopeLengthM ||
          boundary.electricalTurnCount !== reference.electricalTurnCount,
      )
    ) {
      return invalidComparison(
        "MVP-INDUCTANCE.comparison_boundary_mismatch",
        "Inductance methods may be placed side by side only when D_c, b_env, N, and any available geometry snapshot identity are identical.",
        "Recalculate every method from one controlled geometry boundary.",
      );
    }
  }

  const rows = typedResults.map((result) => {
    const inductanceOutput = result.outputs.find(
      (candidate) => candidate.unit === "H",
    );
    return {
      methodId: result.methodId,
      role: result.role,
      status: result.status,
      inductanceH: inductanceOutput?.value ?? null,
      geometrySnapshotId: result.geometryBoundary?.geometrySnapshotId ?? null,
      isRecommended: result.recommendation.isRecommended,
      recommendationReason: result.recommendation.reason,
    };
  });

  const enoughNumericMethods = numericResults.length >= 2;
  return cloneAndDeepFreeze({
    status: enoughNumericMethods
      ? ("success_with_warnings" as const)
      : ("insufficient_data" as const),
    formalComparisonClaim: false as const,
    rows,
    recommendedMethodId: null,
    recommendedReason:
      "B-04 is the only conditionally eligible Recommended method in this family, but its release gates are open; B-03 remains a limit and B-05 remains a quick comparison.",
    policy: {
      sameGeometryBoundaryRequired: true as const,
      averaged: false as const,
      ranked: false as const,
      normalizedDifferencesComputed: false as const,
      agreementIsValidation: false as const,
    },
    warnings: [
      {
        code: "MVP-INDUCTANCE.no_safe_comparable_pair",
        predicate: null,
        message: enoughNumericMethods
          ? "Results are displayed side by side only; no formal C-01 metric, ranking, or validation claim is produced."
          : "Fewer than two safely publishable same-boundary inductance methods are available, so no numerical comparison metric is produced.",
      },
    ],
    failure: enoughNumericMethods
      ? null
      : {
          code: "MVP-INDUCTANCE.no_safe_comparable_pair",
          message:
            "A formal or normalized multi-method comparison is unavailable at the current release boundary.",
          action:
            "Close the B-03/B-04 gates or use an independently approved measurement/FEM comparison workflow; do not average available estimates.",
        },
  });
}
