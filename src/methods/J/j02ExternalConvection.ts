/**
 * J-02 isolated external-convection correlation router.
 *
 * The three frozen correlations are evaluated as explicitly selected routes;
 * they are not registered child method IDs. Runtime activation remains blocked
 * by the source-pin, child-split, parameter-mapping, and warning-policy gates
 * recorded below.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-02"));

export const J02_METHOD_ID = "J-02" as const;
export const J02_METHOD_VERSION = SPECIFICATION.methodVersion;
export const J02_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const J02_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const J02_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const J02_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const J02_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;
export const J02_VALIDATION_NOTES = SPECIFICATION.validationNotes;

/** Frozen standard-gravity value from Calculation Basis section 3. */
export const J02_STANDARD_GRAVITY_M_PER_S2 = 9.80665 as const;

/** IEEE-754 binary64 boundary only; never an engineering/domain threshold. */
export const J02_BINARY64_MIN_NORMAL = 2 ** -1022;

export const J02_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: J02_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  positiveTermSwallowedPolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceCorrelationRearranged: false as const,
  correlationDomainChanged: false as const,
});

export const J02_CONTROLLED_ONLINE_SOURCES = Object.freeze({
  CC75_vertical_plate_all_range: Object.freeze({
    sourceId: "CC75-V" as const,
    sourceRef: "CC75-V:PP1323-1329" as const,
    doi: "10.1016/0017-9310(75)90243-4" as const,
    printedPages: "1323-1329" as const,
    localCopyRelativePath: null,
    localCopyByteLength: null,
    localCopySha256: null,
    controlledAccessDate: null,
    sourceManifestRef: null,
    sourcePinStatus: "required" as const,
    localVisualVerificationStatus:
      "not_available_no_controlled_local_pdf" as const,
  }),
  CC75_horizontal_cylinder: Object.freeze({
    sourceId: "CC75-H" as const,
    sourceRef: "CC75-H:PP1049-1053" as const,
    doi: "10.1016/0017-9310(75)90222-7" as const,
    printedPages: "1049-1053" as const,
    localCopyRelativePath: null,
    localCopyByteLength: null,
    localCopySha256: null,
    controlledAccessDate: null,
    sourceManifestRef: null,
    sourcePinStatus: "required" as const,
    localVisualVerificationStatus:
      "not_available_no_controlled_local_pdf" as const,
  }),
  CB77_circular_cylinder_crossflow: Object.freeze({
    sourceId: "CB77" as const,
    sourceRef: "CB77:PP300-306" as const,
    doi: "10.1115/1.3450685" as const,
    printedPages: "300-306" as const,
    localCopyRelativePath: null,
    localCopyByteLength: null,
    localCopySha256: null,
    controlledAccessDate: null,
    sourceManifestRef: null,
    sourcePinStatus: "required" as const,
    localVisualVerificationStatus:
      "not_available_no_controlled_local_pdf" as const,
  }),
});

export const J02_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  routeNamesAreRegisteredChildMethodIds: false as const,
  openGates: Object.freeze([
    Object.freeze({
      gateId: "J-02.controlled-local-primary-source-pins" as const,
      reason:
        "CC75-V, CC75-H, and CB77 are online-only frozen references and have no controlled local path, access-date record, or SHA-256 in SOURCE_MANIFEST.csv." as const,
    }),
    Object.freeze({
      gateId: "J-02.registered-child-method-ids" as const,
      reason:
        "The frozen J-02 parent requires three child methods, but no approved child method IDs or contracts are registered." as const,
    }),
    Object.freeze({
      gateId: "J-02.property-and-geometry-parameter-mapping" as const,
      reason:
        "No frozen runtime adapter uniquely maps film-state fluid properties, characteristic length, and surface area into J-02; this isolated function accepts explicit evidence only." as const,
    }),
    Object.freeze({
      gateId: "J-02.stable-warning-publication" as const,
      reason:
        "The frozen registry supplies warning predicates but no stable warning IDs or publication policy." as const,
    }),
  ]),
});

function controlledWarningPredicate<T extends string>(predicate: T): T {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(`J-02 warning predicate is not frozen: ${predicate}`);
  }
  return predicate;
}

export const J02_WARNING_PREDICATES = Object.freeze({
  unsupportedConfiguration: controlledWarningPredicate(
    "arbitrary inclination, mixed convection, array or shielding is unmodeled" as const,
  ),
  fixedCoefficientWithoutSource: controlledWarningPredicate(
    "fixed h has no source" as const,
  ),
  correlationMixing: controlledWarningPredicate(
    "max or power-sum method mixing is used" as const,
  ),
});

export type J02Route =
  | "CC75_vertical_plate_all_range"
  | "CC75_horizontal_cylinder"
  | "CB77_circular_cylinder_crossflow";

export type J02Orientation =
  | "horizontal_axis"
  | "vertical_axis"
  | "inclined"
  | "unconfirmed";

export interface J02FluidPropertiesInput {
  readonly fluidId: string;
  readonly materialSnapshotId: string;
  readonly propertyStateId: string;
  readonly evaluationTemperatureK: number;
  readonly absolutePressurePa: number;
  readonly phaseState:
    | "single_phase_fluid"
    | "unsupported_multiphase"
    | "unconfirmed";
  readonly applicabilityStatus:
    | "confirmed_in_domain_without_extrapolation"
    | "extrapolated"
    | "unconfirmed";
  readonly thermalConductivityWPerMK: number;
  readonly prandtlNumber: number;
  readonly kinematicViscosityM2PerS: number;
  readonly thermalDiffusivityM2PerS: number | null;
  readonly volumetricExpansionCoefficientPerK: number | null;
  readonly thermalConductivitySourceRef: string;
  readonly prandtlSourceRef: string;
  readonly kinematicViscositySourceRef: string;
  readonly thermalDiffusivitySourceRef: string | null;
  readonly volumetricExpansionSourceRef: string | null;
}

export interface J02SnapshotEvidenceInput {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly propertyStateId: string;
  readonly controlVolumeId: string;
  readonly boundaryId: string;
  readonly surfaceId: string;
  readonly surfaceStateId: string;
  readonly normalizedRoute: J02Route;
  readonly normalizedCharacteristicLengthM: number;
  readonly normalizedSurfaceAreaM2: number;
  readonly normalizedSurfaceTemperatureK: number;
  readonly normalizedAmbientTemperatureK: number;
  readonly normalizedFreeStreamVelocityMPerS: number | null;
  readonly normalizedFilmTemperatureK: number;
  readonly normalizedAbsolutePressurePa: number;
  readonly temperatureScale: "absolute_kelvin";
  readonly filmTemperatureRule: "Tf=(Ts+Tinf)/2";
  readonly propertyEvaluationState: "all_fluid_properties_at_film_state";
}

export interface J02ApplicabilityEvidenceInput {
  readonly geometryClass:
    | "vertical_plane"
    | "circular_cylinder"
    | "other"
    | "unconfirmed";
  readonly orientation: J02Orientation;
  readonly characteristicLengthDefinition:
    | "height_along_gravity"
    | "outer_diameter"
    | "other"
    | "unconfirmed";
  readonly flowState:
    | "quiescent_natural_convection"
    | "uniform_forced_crossflow"
    | "mixed_convection"
    | "non_crossflow"
    | "unconfirmed";
  readonly boundaryMatchesCorrelation: boolean | null;
  readonly singleUnshieldedSurfaceConfirmed: boolean | null;
  readonly longCylinderEndEffectsNegligible: boolean | null;
  readonly mixedConvectionExcluded: boolean | null;
}

export interface J02ExternalConvectionInput {
  readonly route: J02Route;
  readonly characteristicLengthM: number;
  readonly surfaceAreaM2: number;
  readonly surfaceTemperatureK: number;
  readonly ambientTemperatureK: number;
  readonly freeStreamVelocityMPerS: number | null;
  readonly fluidProperties: J02FluidPropertiesInput;
  readonly snapshotEvidence: J02SnapshotEvidenceInput;
  readonly applicabilityEvidence: J02ApplicabilityEvidenceInput;
}

export interface J02NusseltMethodCheckInput {
  readonly route: J02Route;
  readonly rayleighNumber: number | null;
  readonly reynoldsNumber: number | null;
  readonly prandtlNumber: number;
}

export const J02_EXTERNAL_CONVECTION_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  scientificConfidence: SPECIFICATION.scientificConfidence,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  sourceRefs: J02_SOURCE_REFS,
  contractSourceRefs: J02_CONTRACT_SOURCE_REFS,
  derivationRefs: J02_DERIVATION_REFS,
  validationCaseIds: J02_VALIDATION_CASE_IDS,
  methodCheckIds: J02_METHOD_CHECK_IDS,
  validationNotes: J02_VALIDATION_NOTES,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
  controlledOnlineSources: J02_CONTROLLED_ONLINE_SOURCES,
  numericRepresentabilityPolicy: J02_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: J02_IMPLEMENTATION_READINESS,
});

export interface J02CorrelationTrace {
  readonly rayleighSixthRoot: number | null;
  readonly reynoldsSquareRoot: number | null;
  readonly prandtlOneThirdPower: number | null;
  readonly prandtlRatio: number;
  readonly prandtlRatioPower: number;
  readonly denominatorBase: number;
  readonly denominator: number;
  readonly primaryNumerator: number;
  readonly primaryTerm: number;
  readonly highReynoldsRatio: number | null;
  readonly highReynoldsPower: number | null;
  readonly highReynoldsBase: number | null;
  readonly highReynoldsFactor: number | null;
  readonly correlationBase: number;
}

export interface J02ExternalConvectionValue {
  readonly rayleighNumber: number | null;
  readonly reynoldsNumber: number | null;
  readonly prandtlNumber: number;
  readonly nusseltNumber: number;
  readonly heatTransferCoefficientWPerM2K: number;
  readonly heatRateW: number;
  readonly characteristicLengthDimensionId: "length";
  readonly characteristicLengthCanonicalUnitId: "m";
  readonly surfaceAreaDimensionId: "area";
  readonly surfaceAreaCanonicalUnitId: "m2";
  readonly heatTransferCoefficientDimensionId: "heat_transfer_coefficient";
  readonly heatTransferCoefficientCanonicalUnitId: "W/(m2*K)";
  readonly heatRateDimensionId: "power";
  readonly heatRateCanonicalUnitId: "W";
  readonly positiveDirection: "surface_to_ambient";
}

export interface J02ExternalConvectionSuccess {
  readonly methodId: typeof J02_METHOD_ID;
  readonly methodVersion: typeof J02_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly route: J02Route;
  readonly registeredChildMethodId: null;
  readonly runtimePublishable: false;
  readonly value: J02ExternalConvectionValue;
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly equation: string;
  readonly domainCriterion: string;
  readonly substitution: Readonly<{
    readonly characteristicLengthM: number;
    readonly surfaceAreaM2: number;
    readonly surfaceTemperatureK: number;
    readonly ambientTemperatureK: number;
    readonly filmTemperatureK: number;
    readonly temperatureDifferenceK: number;
    readonly absoluteTemperatureDifferenceK: number;
    readonly standardGravityMPerS2: typeof J02_STANDARD_GRAVITY_M_PER_S2;
    readonly thermalConductivityWPerMK: number;
    readonly prandtlNumber: number;
    readonly kinematicViscosityM2PerS: number;
    readonly thermalDiffusivityM2PerS: number | null;
    readonly volumetricExpansionCoefficientPerK: number | null;
    readonly freeStreamVelocityMPerS: number | null;
    readonly correlationTrace: J02CorrelationTrace;
  }>;
  readonly evidence: Readonly<{
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly materialSnapshotId: string;
    readonly propertyStateId: string;
    readonly controlVolumeId: string;
    readonly boundaryId: string;
    readonly surfaceId: string;
    readonly surfaceStateId: string;
    readonly areaM2: number;
    readonly surfaceTemperatureK: number;
    readonly referenceTemperatureK: number;
    readonly fluidId: string;
    readonly fluidPropertySourceRefs: readonly string[];
    readonly coefficientSourceRef: string;
    readonly routeSource: (typeof J02_CONTROLLED_ONLINE_SOURCES)[J02Route];
    readonly snapshotEvidence: Readonly<J02SnapshotEvidenceInput>;
    readonly applicabilityEvidence: Readonly<J02ApplicabilityEvidenceInput>;
    readonly numericRepresentabilityPolicy:
      typeof J02_NUMERIC_REPRESENTABILITY_POLICY;
  }>;
  readonly assumptions: readonly string[];
  readonly mapping: typeof J02_EXTERNAL_CONVECTION_MAPPING;
}

export interface J02ExternalConvectionFailure {
  readonly methodId: typeof J02_METHOD_ID;
  readonly methodVersion: typeof J02_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly mapping: typeof J02_EXTERNAL_CONVECTION_MAPPING;
  readonly failure: Readonly<{
    readonly code: string;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
}

export interface J02NusseltMethodCheckSuccess {
  readonly methodId: typeof J02_METHOD_ID;
  readonly methodVersion: typeof J02_METHOD_VERSION;
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly route: J02Route;
  readonly registeredChildMethodId: null;
  readonly runtimePublishable: false;
  readonly nusseltNumber: number;
  readonly correlationTrace: J02CorrelationTrace;
  readonly sourceEvidence: (typeof J02_CONTROLLED_ONLINE_SOURCES)[J02Route];
  readonly mapping: typeof J02_EXTERNAL_CONVECTION_MAPPING;
}

export type J02ExternalConvectionOutcome =
  | J02ExternalConvectionSuccess
  | J02ExternalConvectionFailure;

export type J02NusseltMethodCheckOutcome =
  | J02NusseltMethodCheckSuccess
  | J02ExternalConvectionFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function failure(
  status: J02ExternalConvectionFailure["status"],
  code: string,
  message: string,
  action: string,
): J02ExternalConvectionFailure {
  return Object.freeze({
    methodId: J02_METHOD_ID,
    methodVersion: J02_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    mapping: J02_EXTERNAL_CONVECTION_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function numericFailure(stage: string): J02ExternalConvectionFailure {
  return failure(
    "invalid_input",
    "J-02.numeric_resolution_invalid",
    `A positive J-02 ${stage} is non-finite, zero after arithmetic, subnormal, or swallowed by binary64 addition.`,
    "Use representable canonical-SI inputs; this machine boundary is not an engineering tolerance and does not alter a correlation domain.",
  );
}

function isRoute(value: unknown): value is J02Route {
  return (
    value === "CC75_vertical_plate_all_range" ||
    value === "CC75_horizontal_cylinder" ||
    value === "CB77_circular_cylinder_crossflow"
  );
}

function isStableMachineId(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    sourceRef(value);
    return true;
  } catch {
    return false;
  }
}

function isPositiveNormal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= J02_BINARY64_MIN_NORMAL
  );
}

function isFiniteNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positiveResultInvalid(value: number): boolean {
  return !Number.isFinite(value) || value < J02_BINARY64_MIN_NORMAL;
}

function positiveTermSwallowed(sum: number, base: number, term: number): boolean {
  return term > 0 && sum === base;
}

type InternalCorrelationResult =
  | Readonly<{
      readonly ok: true;
      readonly nusseltNumber: number;
      readonly trace: J02CorrelationTrace;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J02ExternalConvectionFailure;
    }>;

function computeNaturalCorrelation(
  route:
    | "CC75_vertical_plate_all_range"
    | "CC75_horizontal_cylinder",
  rayleighNumber: number,
  prandtlNumber: number,
): InternalCorrelationResult {
  if (
    route === "CC75_vertical_plate_all_range" &&
    rayleighNumber > 1e12
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "J-02.CC75-V.domain_not_applicable",
        "CC75_vertical_plate_all_range is project-gated at Ra_L <= 1e12.",
        "Select an approved in-domain method or provide CFD/test evidence; do not extrapolate the correlation.",
      ),
    });
  }
  if (
    route === "CC75_horizontal_cylinder" &&
    (rayleighNumber < 1e-5 || rayleighNumber > 1e12)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "J-02.CC75-H.domain_not_applicable",
        "CC75_horizontal_cylinder has the frozen project domain 1e-5 <= Ra_D <= 1e12.",
        "Select an approved in-domain method or provide CFD/test evidence; do not extrapolate the correlation.",
      ),
    });
  }

  const rayleighSixthRoot = Math.pow(rayleighNumber, 1 / 6);
  if (
    rayleighNumber > 0 &&
    positiveResultInvalid(rayleighSixthRoot)
  ) {
    return Object.freeze({ ok: false, result: numericFailure("Ra^(1/6)") });
  }
  const coefficient =
    route === "CC75_vertical_plate_all_range" ? 0.492 : 0.559;
  const leadingConstant =
    route === "CC75_vertical_plate_all_range" ? 0.825 : 0.6;
  const prandtlRatio = coefficient / prandtlNumber;
  if (positiveResultInvalid(prandtlRatio)) {
    return Object.freeze({ ok: false, result: numericFailure("Pr ratio") });
  }
  const prandtlRatioPower = Math.pow(prandtlRatio, 9 / 16);
  if (positiveResultInvalid(prandtlRatioPower)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("Pr-ratio power"),
    });
  }
  const denominatorBase = 1 + prandtlRatioPower;
  if (
    !Number.isFinite(denominatorBase) ||
    positiveTermSwallowed(denominatorBase, 1, prandtlRatioPower)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation denominator base"),
    });
  }
  const denominator = Math.pow(denominatorBase, 8 / 27);
  if (positiveResultInvalid(denominator)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation denominator"),
    });
  }
  const primaryNumerator = 0.387 * rayleighSixthRoot;
  if (
    rayleighSixthRoot > 0 &&
    positiveResultInvalid(primaryNumerator)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation numerator"),
    });
  }
  const primaryTerm = primaryNumerator / denominator;
  if (primaryNumerator > 0 && positiveResultInvalid(primaryTerm)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation primary term"),
    });
  }
  const correlationBase = leadingConstant + primaryTerm;
  if (
    !Number.isFinite(correlationBase) ||
    positiveTermSwallowed(correlationBase, leadingConstant, primaryTerm)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation additive term"),
    });
  }
  const nusseltNumber = correlationBase * correlationBase;
  if (positiveResultInvalid(nusseltNumber)) {
    return Object.freeze({ ok: false, result: numericFailure("Nusselt number") });
  }
  return Object.freeze({
    ok: true,
    nusseltNumber,
    trace: Object.freeze({
      rayleighSixthRoot,
      reynoldsSquareRoot: null,
      prandtlOneThirdPower: null,
      prandtlRatio,
      prandtlRatioPower,
      denominatorBase,
      denominator,
      primaryNumerator,
      primaryTerm,
      highReynoldsRatio: null,
      highReynoldsPower: null,
      highReynoldsBase: null,
      highReynoldsFactor: null,
      correlationBase,
    }),
  });
}

function computeForcedCorrelation(
  reynoldsNumber: number,
  prandtlNumber: number,
): InternalCorrelationResult {
  const reynoldsPrandtl = reynoldsNumber * prandtlNumber;
  if (reynoldsPrandtl < 0.2) {
    return Object.freeze({
      ok: false,
      result: failure(
        "not_applicable",
        "J-02.CB77.domain_not_applicable",
        "CB77_circular_cylinder_crossflow requires Re_D*Pr >= 0.2.",
        "Select an approved in-domain method or provide CFD/test evidence; do not extrapolate the correlation.",
      ),
    });
  }
  if (
    !Number.isFinite(reynoldsPrandtl) ||
    (reynoldsNumber > 0 && positiveResultInvalid(reynoldsPrandtl))
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("Re_D*Pr domain product"),
    });
  }

  const reynoldsSquareRoot = Math.sqrt(reynoldsNumber);
  const prandtlOneThirdPower = Math.pow(prandtlNumber, 1 / 3);
  if (
    positiveResultInvalid(reynoldsSquareRoot) ||
    positiveResultInvalid(prandtlOneThirdPower)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("CB77 square/cube-root term"),
    });
  }
  const firstProduct = 0.62 * reynoldsSquareRoot;
  const primaryNumerator = firstProduct * prandtlOneThirdPower;
  if (
    positiveResultInvalid(firstProduct) ||
    positiveResultInvalid(primaryNumerator)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("CB77 numerator"),
    });
  }
  const prandtlRatio = 0.4 / prandtlNumber;
  if (positiveResultInvalid(prandtlRatio)) {
    return Object.freeze({ ok: false, result: numericFailure("Pr ratio") });
  }
  const prandtlRatioPower = Math.pow(prandtlRatio, 2 / 3);
  if (positiveResultInvalid(prandtlRatioPower)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("Pr-ratio power"),
    });
  }
  const denominatorBase = 1 + prandtlRatioPower;
  if (
    !Number.isFinite(denominatorBase) ||
    positiveTermSwallowed(denominatorBase, 1, prandtlRatioPower)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation denominator base"),
    });
  }
  const denominator = Math.pow(denominatorBase, 1 / 4);
  if (positiveResultInvalid(denominator)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation denominator"),
    });
  }
  const primaryTerm = primaryNumerator / denominator;
  if (positiveResultInvalid(primaryTerm)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("correlation primary term"),
    });
  }
  const highReynoldsRatio = reynoldsNumber / 282000;
  if (positiveResultInvalid(highReynoldsRatio)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("Re_D/282000 ratio"),
    });
  }
  const highReynoldsPower = Math.pow(highReynoldsRatio, 5 / 8);
  if (positiveResultInvalid(highReynoldsPower)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("high-Reynolds power"),
    });
  }
  const highReynoldsBase = 1 + highReynoldsPower;
  if (
    !Number.isFinite(highReynoldsBase) ||
    positiveTermSwallowed(highReynoldsBase, 1, highReynoldsPower)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("high-Reynolds additive term"),
    });
  }
  const highReynoldsFactor = Math.pow(highReynoldsBase, 4 / 5);
  if (positiveResultInvalid(highReynoldsFactor)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("high-Reynolds factor"),
    });
  }
  const enhancedTerm = primaryTerm * highReynoldsFactor;
  if (positiveResultInvalid(enhancedTerm)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("CB77 enhanced term"),
    });
  }
  const correlationBase = 0.3 + enhancedTerm;
  if (
    !Number.isFinite(correlationBase) ||
    positiveTermSwallowed(correlationBase, 0.3, enhancedTerm)
  ) {
    return Object.freeze({
      ok: false,
      result: numericFailure("CB77 additive term"),
    });
  }
  return Object.freeze({
    ok: true,
    nusseltNumber: correlationBase,
    trace: Object.freeze({
      rayleighSixthRoot: null,
      reynoldsSquareRoot,
      prandtlOneThirdPower,
      prandtlRatio,
      prandtlRatioPower,
      denominatorBase,
      denominator,
      primaryNumerator,
      primaryTerm,
      highReynoldsRatio,
      highReynoldsPower,
      highReynoldsBase,
      highReynoldsFactor,
      correlationBase,
    }),
  });
}

function computeCorrelation(
  route: J02Route,
  rayleighNumber: number | null,
  reynoldsNumber: number | null,
  prandtlNumber: number,
): InternalCorrelationResult {
  if (!Number.isFinite(prandtlNumber) || prandtlNumber <= 0) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-02.prandtl_invalid",
        "Pr must be a finite positive normal dimensionless value.",
        "Supply the explicit film-state Pr value without a hidden default or unit coercion.",
      ),
    });
  }
  if (route === "CB77_circular_cylinder_crossflow") {
    if (rayleighNumber !== null || !isFiniteNonnegative(reynoldsNumber)) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-02.dimensionless_route_mismatch",
          "CB77 requires Re_D and forbids a natural-convection Ra input.",
          "Keep the three correlation routes separate and supply only their frozen dimensionless arguments.",
        ),
      });
    }
    const reynoldsPrandtl = reynoldsNumber * prandtlNumber;
    if (reynoldsPrandtl < 0.2) {
      return computeForcedCorrelation(reynoldsNumber, prandtlNumber);
    }
    if (!isPositiveNormal(prandtlNumber)) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-02.prandtl_invalid",
          "Pr must be a finite positive normal dimensionless value.",
          "Supply the explicit film-state Pr value without a hidden default or unit coercion.",
        ),
      });
    }
    if (reynoldsNumber > 0 && !isPositiveNormal(reynoldsNumber)) {
      return Object.freeze({
        ok: false,
        result: numericFailure("Reynolds number"),
      });
    }
    return computeForcedCorrelation(reynoldsNumber, prandtlNumber);
  }
  if (reynoldsNumber !== null || !isFiniteNonnegative(rayleighNumber)) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-02.dimensionless_route_mismatch",
        "CC75 natural-convection routes require Ra and forbid a forced-convection Re input.",
        "Keep the three correlation routes separate and supply only their frozen dimensionless arguments.",
      ),
    });
  }
  if (
    (route === "CC75_vertical_plate_all_range" &&
      rayleighNumber > 1e12) ||
    (route === "CC75_horizontal_cylinder" &&
      (rayleighNumber < 1e-5 || rayleighNumber > 1e12))
  ) {
    return computeNaturalCorrelation(route, rayleighNumber, prandtlNumber);
  }
  if (!isPositiveNormal(prandtlNumber)) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-02.prandtl_invalid",
        "Pr must be a finite positive normal dimensionless value.",
        "Supply the explicit film-state Pr value without a hidden default or unit coercion.",
      ),
    });
  }
  if (rayleighNumber > 0 && !isPositiveNormal(rayleighNumber)) {
    return Object.freeze({
      ok: false,
      result: numericFailure("Rayleigh number"),
    });
  }
  return computeNaturalCorrelation(route, rayleighNumber, prandtlNumber);
}

const FLUID_KEYS = Object.freeze([
  "fluidId",
  "materialSnapshotId",
  "propertyStateId",
  "evaluationTemperatureK",
  "absolutePressurePa",
  "phaseState",
  "applicabilityStatus",
  "thermalConductivityWPerMK",
  "prandtlNumber",
  "kinematicViscosityM2PerS",
  "thermalDiffusivityM2PerS",
  "volumetricExpansionCoefficientPerK",
  "thermalConductivitySourceRef",
  "prandtlSourceRef",
  "kinematicViscositySourceRef",
  "thermalDiffusivitySourceRef",
  "volumetricExpansionSourceRef",
] as const);

const SNAPSHOT_KEYS = Object.freeze([
  "caseSnapshotId",
  "geometrySnapshotId",
  "materialSnapshotId",
  "propertyStateId",
  "controlVolumeId",
  "boundaryId",
  "surfaceId",
  "surfaceStateId",
  "normalizedRoute",
  "normalizedCharacteristicLengthM",
  "normalizedSurfaceAreaM2",
  "normalizedSurfaceTemperatureK",
  "normalizedAmbientTemperatureK",
  "normalizedFreeStreamVelocityMPerS",
  "normalizedFilmTemperatureK",
  "normalizedAbsolutePressurePa",
  "temperatureScale",
  "filmTemperatureRule",
  "propertyEvaluationState",
] as const);

const APPLICABILITY_KEYS = Object.freeze([
  "geometryClass",
  "orientation",
  "characteristicLengthDefinition",
  "flowState",
  "boundaryMatchesCorrelation",
  "singleUnshieldedSurfaceConfirmed",
  "longCylinderEndEffectsNegligible",
  "mixedConvectionExcluded",
] as const);

function validateApplicabilityEvidenceSchema(
  evidence: Readonly<Record<string, unknown>>,
): J02ExternalConvectionFailure | null {
  const knownGeometry =
    evidence.geometryClass === null ||
    evidence.geometryClass === undefined ||
    (typeof evidence.geometryClass === "string" &&
      [
        "vertical_plane",
        "circular_cylinder",
        "other",
        "unconfirmed",
      ].includes(evidence.geometryClass));
  const knownOrientation =
    evidence.orientation === null ||
    evidence.orientation === undefined ||
    (typeof evidence.orientation === "string" &&
      [
        "horizontal_axis",
        "vertical_axis",
        "inclined",
        "unconfirmed",
      ].includes(evidence.orientation));
  const knownLength =
    evidence.characteristicLengthDefinition === null ||
    evidence.characteristicLengthDefinition === undefined ||
    (typeof evidence.characteristicLengthDefinition === "string" &&
      [
        "height_along_gravity",
        "outer_diameter",
        "other",
        "unconfirmed",
      ].includes(evidence.characteristicLengthDefinition));
  const knownFlow =
    evidence.flowState === null ||
    evidence.flowState === undefined ||
    (typeof evidence.flowState === "string" &&
      [
        "quiescent_natural_convection",
        "uniform_forced_crossflow",
        "mixed_convection",
        "non_crossflow",
        "unconfirmed",
      ].includes(evidence.flowState));
  const nullableBooleans = [
    evidence.boundaryMatchesCorrelation,
    evidence.singleUnshieldedSurfaceConfirmed,
    evidence.longCylinderEndEffectsNegligible,
    evidence.mixedConvectionExcluded,
  ];
  if (
    !knownGeometry ||
    !knownOrientation ||
    !knownLength ||
    !knownFlow ||
    nullableBooleans.some(
      (value) =>
        value !== null && typeof value !== "boolean",
    )
  ) {
    return failure(
      "invalid_input",
      "J-02.applicability_evidence_invalid",
      "J-02 applicability evidence contains an unknown enum or malformed confirmation field.",
      "Supply exact controlled geometry/orientation/flow evidence; do not coerce or infer a route.",
    );
  }
  return null;
}

function validateApplicabilityEvidence(
  route: J02Route,
  evidence: Readonly<Record<string, unknown>>,
): J02ExternalConvectionFailure | null {
  const schemaFailure = validateApplicabilityEvidenceSchema(evidence);
  if (schemaFailure !== null) {
    return schemaFailure;
  }
  if (
    evidence.geometryClass === null ||
    evidence.geometryClass === undefined ||
    evidence.orientation === null ||
    evidence.orientation === undefined ||
    evidence.characteristicLengthDefinition === null ||
    evidence.characteristicLengthDefinition === undefined ||
    evidence.flowState === null ||
    evidence.flowState === undefined
  ) {
    return failure(
      "insufficient_data",
      "J-02.applicability_evidence_missing",
      "Geometry, orientation, characteristic-length, or flow-state evidence is missing.",
      "Confirm the exact correlation geometry and boundary; do not add an inclination, mixing, array, or end correction.",
    );
  }
  if (
    evidence.geometryClass === "unconfirmed" ||
    evidence.orientation === "unconfirmed" ||
    evidence.characteristicLengthDefinition === "unconfirmed" ||
    evidence.flowState === "unconfirmed" ||
    evidence.boundaryMatchesCorrelation === null ||
    evidence.singleUnshieldedSurfaceConfirmed === null ||
    evidence.mixedConvectionExcluded === null ||
    (route !== "CC75_vertical_plate_all_range" &&
      evidence.longCylinderEndEffectsNegligible === null)
  ) {
    return failure(
      "insufficient_data",
      "J-02.applicability_evidence_missing",
      "Geometry, orientation, flow, shielding, end-effect, or mixed-convection evidence is unconfirmed.",
      "Confirm the exact correlation geometry and boundary; do not add an inclination, mixing, array, or end correction.",
    );
  }

  const verticalMatch =
    route === "CC75_vertical_plate_all_range" &&
    evidence.geometryClass === "vertical_plane" &&
    evidence.orientation === "vertical_axis" &&
    evidence.characteristicLengthDefinition === "height_along_gravity" &&
    evidence.flowState === "quiescent_natural_convection" &&
    evidence.longCylinderEndEffectsNegligible === null;
  const horizontalNaturalMatch =
    route === "CC75_horizontal_cylinder" &&
    evidence.geometryClass === "circular_cylinder" &&
    evidence.orientation === "horizontal_axis" &&
    evidence.characteristicLengthDefinition === "outer_diameter" &&
    evidence.flowState === "quiescent_natural_convection" &&
    evidence.longCylinderEndEffectsNegligible === true;
  const forcedMatch =
    route === "CB77_circular_cylinder_crossflow" &&
    evidence.geometryClass === "circular_cylinder" &&
    (evidence.orientation === "horizontal_axis" ||
      evidence.orientation === "vertical_axis") &&
    evidence.characteristicLengthDefinition === "outer_diameter" &&
    evidence.flowState === "uniform_forced_crossflow" &&
    evidence.longCylinderEndEffectsNegligible === true;
  if (
    evidence.boundaryMatchesCorrelation !== true ||
    evidence.singleUnshieldedSurfaceConfirmed !== true ||
    evidence.mixedConvectionExcluded !== true ||
    (!verticalMatch && !horizontalNaturalMatch && !forcedMatch)
  ) {
    return failure(
      "not_applicable",
      "J-02.geometry_or_flow_not_applicable",
      "The selected J-02 route does not match the explicit geometry, orientation, characteristic length, flow, shielding, end-effect, or mixed-convection evidence.",
      "Select only the matching frozen route; arbitrary inclination, mixed convection, arrays, shielding, finite-end corrections, and non-crossflow are Deferred.",
    );
  }
  return null;
}

function readExternalInput(
  input: unknown,
):
  | Readonly<{
      readonly ok: true;
      readonly top: Readonly<Record<string, unknown>>;
      readonly route: J02Route;
      readonly fluid: Readonly<Record<string, unknown>>;
      readonly snapshot: Readonly<Record<string, unknown>>;
      readonly applicability: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly result: J02ExternalConvectionFailure;
    }> {
  const top = readExactPlainDataRecord(input, [
    "route",
    "characteristicLengthM",
    "surfaceAreaM2",
    "surfaceTemperatureK",
    "ambientTemperatureK",
    "freeStreamVelocityMPerS",
    "fluidProperties",
    "snapshotEvidence",
    "applicabilityEvidence",
  ]);
  if (top === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        input === null || input === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-02.input_schema_invalid",
        "J-02 requires one exact plain-data input without accessors, Proxy behavior, symbols, missing fields, or extra fields.",
        "Supply the explicit route, canonical-SI values, fluid state, snapshot binding, and applicability evidence.",
      ),
    });
  }
  if (!isRoute(top.route)) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-02.route_invalid",
        "The requested route is not one of the three frozen J-02 correlation names.",
        "Select a frozen route name; do not invent or imply a child method ID.",
      ),
    });
  }
  const fluid = readExactPlainDataRecord(top.fluidProperties, FLUID_KEYS);
  const snapshot = readExactPlainDataRecord(top.snapshotEvidence, SNAPSHOT_KEYS);
  const applicability = readExactPlainDataRecord(
    top.applicabilityEvidence,
    APPLICABILITY_KEYS,
  );
  if (fluid === null || snapshot === null || applicability === null) {
    const requiredEvidenceMissing =
      top.fluidProperties === null ||
      top.fluidProperties === undefined ||
      top.snapshotEvidence === null ||
      top.snapshotEvidence === undefined ||
      top.applicabilityEvidence === null ||
      top.applicabilityEvidence === undefined;
    return Object.freeze({
      ok: false,
      result: failure(
        requiredEvidenceMissing ? "insufficient_data" : "invalid_input",
        "J-02.evidence_schema_invalid",
        "Fluid, snapshot, or applicability evidence is not an exact plain-data record.",
        "Remove getters, Proxy objects, symbols and extra keys; supply every required evidence field explicitly.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    top,
    route: top.route,
    fluid,
    snapshot,
    applicability,
  });
}

function validateFluidStateSchema(
  fluid: Readonly<Record<string, unknown>>,
): J02ExternalConvectionFailure | null {
  const knownPhaseState =
    fluid.phaseState === null ||
    fluid.phaseState === undefined ||
    fluid.phaseState === "single_phase_fluid" ||
    fluid.phaseState === "unsupported_multiphase" ||
    fluid.phaseState === "unconfirmed";
  const knownApplicabilityStatus =
    fluid.applicabilityStatus === null ||
    fluid.applicabilityStatus === undefined ||
    fluid.applicabilityStatus ===
      "confirmed_in_domain_without_extrapolation" ||
    fluid.applicabilityStatus === "extrapolated" ||
    fluid.applicabilityStatus === "unconfirmed";
  if (!knownPhaseState || !knownApplicabilityStatus) {
    return failure(
      "invalid_input",
      "J-02.fluid_state_enum_invalid",
      "The fluid-state applicability or phase enum is malformed.",
      "Supply an exact controlled state value.",
    );
  }
  return null;
}

function validateKnownUnsupportedPhaseIdentityBindings(
  route: J02Route,
  fluid: Readonly<Record<string, unknown>>,
  snapshot: Readonly<Record<string, unknown>>,
): J02ExternalConvectionFailure | null {
  if (
    fluid.fluidId === null ||
    fluid.fluidId === undefined ||
    fluid.materialSnapshotId === null ||
    fluid.materialSnapshotId === undefined ||
    fluid.propertyStateId === null ||
    fluid.propertyStateId === undefined
  ) {
    return failure(
      "insufficient_data",
      "J-02.fluid_property_data_missing",
      "The fluid identity, material snapshot, or property-state identity is missing.",
      "Supply the explicit same-state fluid identity and provenance before classifying applicability.",
    );
  }
  if (
    snapshot.caseSnapshotId === null ||
    snapshot.caseSnapshotId === undefined ||
    snapshot.geometrySnapshotId === null ||
    snapshot.geometrySnapshotId === undefined ||
    snapshot.materialSnapshotId === null ||
    snapshot.materialSnapshotId === undefined ||
    snapshot.propertyStateId === null ||
    snapshot.propertyStateId === undefined ||
    snapshot.controlVolumeId === null ||
    snapshot.controlVolumeId === undefined ||
    snapshot.boundaryId === null ||
    snapshot.boundaryId === undefined ||
    snapshot.surfaceId === null ||
    snapshot.surfaceId === undefined ||
    snapshot.surfaceStateId === null ||
    snapshot.surfaceStateId === undefined ||
    snapshot.normalizedRoute === null ||
    snapshot.normalizedRoute === undefined ||
    snapshot.temperatureScale === null ||
    snapshot.temperatureScale === undefined ||
    snapshot.filmTemperatureRule === null ||
    snapshot.filmTemperatureRule === undefined ||
    snapshot.propertyEvaluationState === null ||
    snapshot.propertyEvaluationState === undefined
  ) {
    return failure(
      "insufficient_data",
      "J-02.snapshot_evidence_missing",
      "A required case, geometry, material, property-state, control-volume, boundary, or surface identifier is missing.",
      "Supply exact same-snapshot evidence; do not reuse an unbound coefficient or property state.",
    );
  }
  if (
    !isStableMachineId(fluid.fluidId) ||
    !isContentAddressedSnapshotId(fluid.materialSnapshotId, "material") ||
    !isStableMachineId(fluid.propertyStateId)
  ) {
    return failure(
      "invalid_input",
      "J-02.fluid_property_value_invalid",
      "Fluid identity, material snapshot, or property-state identity is malformed.",
      "Supply explicit stable identifiers and content-addressed provenance.",
    );
  }
  if (
    !isContentAddressedSnapshotId(snapshot.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(snapshot.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(snapshot.materialSnapshotId, "material") ||
    !isStableMachineId(snapshot.propertyStateId) ||
    !isStableMachineId(snapshot.controlVolumeId) ||
    !isStableMachineId(snapshot.boundaryId) ||
    !isStableMachineId(snapshot.surfaceId) ||
    !isStableMachineId(snapshot.surfaceStateId) ||
    snapshot.temperatureScale !== "absolute_kelvin" ||
    snapshot.filmTemperatureRule !== "Tf=(Ts+Tinf)/2" ||
    snapshot.propertyEvaluationState !==
      "all_fluid_properties_at_film_state"
  ) {
    return failure(
      "invalid_input",
      "J-02.snapshot_identity_invalid",
      "Snapshot, control-volume, boundary, surface, temperature-scale, or film-state identifiers are malformed.",
      "Supply exact content-addressed snapshots and stable same-boundary state identifiers.",
    );
  }
  if (
    snapshot.normalizedRoute !== route ||
    snapshot.materialSnapshotId !== fluid.materialSnapshotId ||
    snapshot.propertyStateId !== fluid.propertyStateId
  ) {
    return failure(
      "invalid_input",
      "J-02.snapshot_state_mismatch",
      "Route, material, or property-state identity is not exactly bound to the same normalized snapshot.",
      "Rebuild the J-02 input from one case/geometry/material/state snapshot; do not reuse stale identities.",
    );
  }
  return null;
}

function stableFilmTemperature(
  surfaceTemperatureK: number,
  ambientTemperatureK: number,
): number | null {
  const halfSurface = surfaceTemperatureK / 2;
  const halfAmbient = ambientTemperatureK / 2;
  if (
    positiveResultInvalid(halfSurface) ||
    positiveResultInvalid(halfAmbient)
  ) {
    return null;
  }
  const filmTemperatureK = halfSurface + halfAmbient;
  if (
    positiveResultInvalid(filmTemperatureK) ||
    (halfSurface > 0 &&
      halfAmbient > 0 &&
      (filmTemperatureK === halfSurface ||
        filmTemperatureK === halfAmbient))
  ) {
    return null;
  }
  return filmTemperatureK;
}

function correlationEquation(route: J02Route): string {
  if (route === "CC75_vertical_plate_all_range") {
    return "Nu_L={0.825+0.387*Ra_L^(1/6)/[1+(0.492/Pr)^(9/16)]^(8/27)}^2";
  }
  if (route === "CC75_horizontal_cylinder") {
    return "Nu_D={0.60+0.387*Ra_D^(1/6)/[1+(0.559/Pr)^(9/16)]^(8/27)}^2";
  }
  return "Nu_D=0.3+[0.62*Re_D^(1/2)*Pr^(1/3)]/[1+(0.4/Pr)^(2/3)]^(1/4)*[1+(Re_D/282000)^(5/8)]^(4/5)";
}

function correlationDomain(route: J02Route): string {
  if (route === "CC75_vertical_plate_all_range") {
    return "Ra_L<=1e12";
  }
  if (route === "CC75_horizontal_cylinder") {
    return "1e-5<=Ra_D<=1e12";
  }
  return "Re_D*Pr>=0.2";
}

export function evaluateJ02NusseltMethodCheck(
  input: unknown,
): J02NusseltMethodCheckOutcome {
  const record = readExactPlainDataRecord(input, [
    "route",
    "rayleighNumber",
    "reynoldsNumber",
    "prandtlNumber",
  ]);
  if (record === null || !isRoute(record.route)) {
    return failure(
      "invalid_input",
      "J-02.method_check_schema_invalid",
      "The direct dimensionless method check requires an exact frozen route plus Ra or Re and Pr.",
      "Use the TH-CONV-001 dimensionless inputs without adding geometry or property defaults.",
    );
  }
  const computed = computeCorrelation(
    record.route,
    typeof record.rayleighNumber === "number"
      ? record.rayleighNumber
      : record.rayleighNumber === null
        ? null
        : Number.NaN,
    typeof record.reynoldsNumber === "number"
      ? record.reynoldsNumber
      : record.reynoldsNumber === null
        ? null
        : Number.NaN,
    typeof record.prandtlNumber === "number"
      ? record.prandtlNumber
      : Number.NaN,
  );
  if (!computed.ok) {
    return computed.result;
  }
  return Object.freeze({
    methodId: J02_METHOD_ID,
    methodVersion: J02_METHOD_VERSION,
    status: "success" as const,
    applicabilityStatus: "in_domain" as const,
    route: record.route,
    registeredChildMethodId: null,
    runtimePublishable: false as const,
    nusseltNumber: computed.nusseltNumber,
    correlationTrace: computed.trace,
    sourceEvidence: J02_CONTROLLED_ONLINE_SOURCES[record.route],
    mapping: J02_EXTERNAL_CONVECTION_MAPPING,
  });
}

export function evaluateJ02ExternalConvection(
  input: unknown,
): J02ExternalConvectionOutcome {
  const read = readExternalInput(input);
  if (!read.ok) {
    return read.result;
  }
  const { top, route, fluid, snapshot, applicability } = read;

  const applicabilitySchemaFailure =
    validateApplicabilityEvidenceSchema(applicability);
  if (applicabilitySchemaFailure !== null) {
    return applicabilitySchemaFailure;
  }
  const fluidStateSchemaFailure = validateFluidStateSchema(fluid);
  if (fluidStateSchemaFailure !== null) {
    return fluidStateSchemaFailure;
  }
  if (fluid.phaseState === "unsupported_multiphase") {
    const identityFailure = validateKnownUnsupportedPhaseIdentityBindings(
      route,
      fluid,
      snapshot,
    );
    if (identityFailure !== null) {
      return identityFailure;
    }
    return failure(
      "not_applicable",
      "J-02.fluid_phase_not_applicable",
      "The selected single-phase external-convection correlation is not applicable to the declared multiphase state.",
      "Use an independently approved multiphase model or test evidence.",
    );
  }
  const applicabilityFailure = validateApplicabilityEvidence(
    route,
    applicability,
  );
  if (applicabilityFailure !== null) {
    return applicabilityFailure;
  }
  if (
    fluid.applicabilityStatus === null ||
    fluid.applicabilityStatus === undefined ||
    fluid.phaseState === null ||
    fluid.phaseState === undefined
  ) {
    return failure(
      "insufficient_data",
      "J-02.fluid_film_state_unavailable",
      "The film-state fluid phase or property applicability evidence is missing.",
      "Resolve every required property at the explicit film state with property-level provenance; do not add a hidden property adapter.",
    );
  }
  if (
    fluid.applicabilityStatus === "unconfirmed" ||
    fluid.applicabilityStatus === "extrapolated" ||
    fluid.phaseState === "unconfirmed"
  ) {
    return failure(
      "insufficient_data",
      "J-02.fluid_film_state_unavailable",
      "The film-state fluid properties are unconfirmed or extrapolated.",
      "Resolve every required property at the explicit film state with property-level provenance; do not add a hidden property adapter.",
    );
  }
  if (
    fluid.applicabilityStatus !==
      "confirmed_in_domain_without_extrapolation" ||
    fluid.phaseState !== "single_phase_fluid"
  ) {
    return failure(
      "invalid_input",
      "J-02.fluid_state_enum_invalid",
      "The fluid-state applicability or phase enum is malformed.",
      "Supply an exact controlled state value.",
    );
  }

  if (
    top.characteristicLengthM === null ||
    top.characteristicLengthM === undefined ||
    top.surfaceAreaM2 === null ||
    top.surfaceAreaM2 === undefined ||
    top.surfaceTemperatureK === null ||
    top.surfaceTemperatureK === undefined ||
    top.ambientTemperatureK === null ||
    top.ambientTemperatureK === undefined ||
    (route === "CB77_circular_cylinder_crossflow" &&
      (top.freeStreamVelocityMPerS === null ||
        top.freeStreamVelocityMPerS === undefined))
  ) {
    return failure(
      "insufficient_data",
      "J-02.required_si_input_missing",
      "A route-required characteristic length, area, absolute temperature, or crossflow velocity is missing.",
      "Supply every required canonical-SI input explicitly; do not substitute zero, NaN, or a hidden default.",
    );
  }
  if (
    !isPositiveNormal(top.characteristicLengthM) ||
    !isPositiveNormal(top.surfaceAreaM2) ||
    !isPositiveNormal(top.surfaceTemperatureK) ||
    !isPositiveNormal(top.ambientTemperatureK)
  ) {
    return failure(
      "invalid_input",
      "J-02.canonical_si_input_invalid",
      "Characteristic length, surface area, and absolute temperatures must be finite positive normal canonical-SI values.",
      "Supply X in m, A in m2, and temperatures in K without hidden conversions or defaults.",
    );
  }
  const forcedRoute = route === "CB77_circular_cylinder_crossflow";
  const naturalRoute = !forcedRoute;
  if (
    (forcedRoute &&
      (!isFiniteNonnegative(top.freeStreamVelocityMPerS) ||
        (top.freeStreamVelocityMPerS > 0 &&
          !isPositiveNormal(top.freeStreamVelocityMPerS)))) ||
    (!forcedRoute && top.freeStreamVelocityMPerS !== null)
  ) {
    return failure(
      "invalid_input",
      "J-02.velocity_route_mismatch",
      "CB77 requires a finite nonnegative crossflow velocity; CC75 natural-convection routes forbid a velocity input.",
      "Keep forced and natural routes separate; do not mix or select their maximum.",
    );
  }
  const filmTemperatureK = stableFilmTemperature(
    top.surfaceTemperatureK,
    top.ambientTemperatureK,
  );
  if (filmTemperatureK === null) {
    return numericFailure("film-temperature average");
  }

  const requiredFluidValues = [
    fluid.fluidId,
    fluid.materialSnapshotId,
    fluid.propertyStateId,
    fluid.evaluationTemperatureK,
    fluid.absolutePressurePa,
    fluid.thermalConductivityWPerMK,
    fluid.prandtlNumber,
    fluid.kinematicViscosityM2PerS,
    fluid.thermalConductivitySourceRef,
    fluid.prandtlSourceRef,
    fluid.kinematicViscositySourceRef,
  ];
  if (
    requiredFluidValues.some(
      (value) => value === null || value === undefined,
    ) ||
    (naturalRoute &&
      [
        fluid.thermalDiffusivityM2PerS,
        fluid.volumetricExpansionCoefficientPerK,
        fluid.thermalDiffusivitySourceRef,
        fluid.volumetricExpansionSourceRef,
      ].some((value) => value === null || value === undefined))
  ) {
    return failure(
      "insufficient_data",
      "J-02.fluid_property_data_missing",
      "One or more route-required film-state fluid properties or property source references are missing.",
      "Resolve the explicit same-state property set; do not substitute a default, zero, NaN, or unused route property.",
    );
  }

  if (
    !isStableMachineId(fluid.fluidId) ||
    !isContentAddressedSnapshotId(fluid.materialSnapshotId, "material") ||
    !isStableMachineId(fluid.propertyStateId) ||
    !isPositiveNormal(fluid.evaluationTemperatureK) ||
    !isPositiveNormal(fluid.absolutePressurePa) ||
    !isPositiveNormal(fluid.thermalConductivityWPerMK) ||
    !isPositiveNormal(fluid.prandtlNumber) ||
    !isPositiveNormal(fluid.kinematicViscosityM2PerS)
  ) {
    return failure(
      "invalid_input",
      "J-02.fluid_property_value_invalid",
      "Fluid identity, film-state binding, pressure, k_f, Pr, or nu is malformed, non-finite, non-positive, or subnormal.",
      "Supply explicit canonical-SI single-phase film-state properties and content-addressed provenance.",
    );
  }
  if (
    (naturalRoute &&
      (!isPositiveNormal(fluid.thermalDiffusivityM2PerS) ||
        !isPositiveNormal(fluid.volumetricExpansionCoefficientPerK))) ||
    (forcedRoute &&
      (fluid.thermalDiffusivityM2PerS !== null ||
        fluid.volumetricExpansionCoefficientPerK !== null))
  ) {
    return failure(
      "invalid_input",
      "J-02.route_property_set_invalid",
      "CC75 requires positive normal alpha and beta; CB77 forbids carrying unused natural-convection properties in its route record.",
      "Supply only the explicit film-state property set required by the selected frozen route.",
    );
  }

  const commonSourceRefs = [
    fluid.thermalConductivitySourceRef,
    fluid.prandtlSourceRef,
    fluid.kinematicViscositySourceRef,
  ];
  const naturalSourceRefs = [
    fluid.thermalDiffusivitySourceRef,
    fluid.volumetricExpansionSourceRef,
  ];
  if (
    commonSourceRefs.some((value) => !isStableMachineId(value)) ||
    (naturalRoute &&
      naturalSourceRefs.some((value) => !isStableMachineId(value))) ||
    (forcedRoute && naturalSourceRefs.some((value) => value !== null))
  ) {
    return failure(
      "insufficient_data",
      "J-02.property_provenance_missing",
      "One or more route-required fluid-property source references are missing or invalid.",
      "Provide property-level source references at the same film state; do not use a hidden default property table.",
    );
  }

  if (
    snapshot.caseSnapshotId === null ||
    snapshot.caseSnapshotId === undefined ||
    snapshot.geometrySnapshotId === null ||
    snapshot.geometrySnapshotId === undefined ||
    snapshot.materialSnapshotId === null ||
    snapshot.materialSnapshotId === undefined ||
    snapshot.propertyStateId === null ||
    snapshot.propertyStateId === undefined ||
    snapshot.controlVolumeId === null ||
    snapshot.controlVolumeId === undefined ||
    snapshot.boundaryId === null ||
    snapshot.boundaryId === undefined ||
    snapshot.surfaceId === null ||
    snapshot.surfaceId === undefined ||
    snapshot.surfaceStateId === null ||
    snapshot.surfaceStateId === undefined ||
    snapshot.normalizedRoute === null ||
    snapshot.normalizedRoute === undefined ||
    snapshot.normalizedCharacteristicLengthM === null ||
    snapshot.normalizedCharacteristicLengthM === undefined ||
    snapshot.normalizedSurfaceAreaM2 === null ||
    snapshot.normalizedSurfaceAreaM2 === undefined ||
    snapshot.normalizedSurfaceTemperatureK === null ||
    snapshot.normalizedSurfaceTemperatureK === undefined ||
    snapshot.normalizedAmbientTemperatureK === null ||
    snapshot.normalizedAmbientTemperatureK === undefined ||
    (forcedRoute &&
      (snapshot.normalizedFreeStreamVelocityMPerS === null ||
        snapshot.normalizedFreeStreamVelocityMPerS === undefined)) ||
    snapshot.normalizedFilmTemperatureK === null ||
    snapshot.normalizedFilmTemperatureK === undefined ||
    snapshot.normalizedAbsolutePressurePa === null ||
    snapshot.normalizedAbsolutePressurePa === undefined ||
    snapshot.temperatureScale === null ||
    snapshot.temperatureScale === undefined ||
    snapshot.filmTemperatureRule === null ||
    snapshot.filmTemperatureRule === undefined ||
    snapshot.propertyEvaluationState === null ||
    snapshot.propertyEvaluationState === undefined
  ) {
    return failure(
      "insufficient_data",
      "J-02.snapshot_evidence_missing",
      "A required case, geometry, material, property-state, control-volume, boundary, or surface identifier is missing.",
      "Supply exact same-snapshot evidence; do not reuse an unbound coefficient or property state.",
    );
  }
  if (
    !isContentAddressedSnapshotId(snapshot.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(snapshot.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(snapshot.materialSnapshotId, "material") ||
    !isStableMachineId(snapshot.propertyStateId) ||
    !isStableMachineId(snapshot.controlVolumeId) ||
    !isStableMachineId(snapshot.boundaryId) ||
    !isStableMachineId(snapshot.surfaceId) ||
    !isStableMachineId(snapshot.surfaceStateId) ||
    snapshot.temperatureScale !== "absolute_kelvin" ||
    snapshot.filmTemperatureRule !== "Tf=(Ts+Tinf)/2" ||
    snapshot.propertyEvaluationState !==
      "all_fluid_properties_at_film_state"
  ) {
    return failure(
      "invalid_input",
      "J-02.snapshot_identity_invalid",
      "Snapshot, control-volume, boundary, surface, temperature-scale, or film-state identifiers are malformed.",
      "Supply exact content-addressed snapshots and stable same-boundary state identifiers.",
    );
  }
  if (
    snapshot.normalizedRoute !== route ||
    snapshot.normalizedCharacteristicLengthM !== top.characteristicLengthM ||
    snapshot.normalizedSurfaceAreaM2 !== top.surfaceAreaM2 ||
    snapshot.normalizedSurfaceTemperatureK !== top.surfaceTemperatureK ||
    snapshot.normalizedAmbientTemperatureK !== top.ambientTemperatureK ||
    snapshot.normalizedFreeStreamVelocityMPerS !==
      top.freeStreamVelocityMPerS ||
    snapshot.normalizedFilmTemperatureK !== filmTemperatureK ||
    snapshot.normalizedAbsolutePressurePa !== fluid.absolutePressurePa ||
    snapshot.materialSnapshotId !== fluid.materialSnapshotId ||
    snapshot.propertyStateId !== fluid.propertyStateId ||
    fluid.evaluationTemperatureK !== filmTemperatureK
  ) {
    return failure(
      "invalid_input",
      "J-02.snapshot_state_mismatch",
      "Geometry, area, temperature, velocity, film-state, pressure, material, or property evidence is not exactly bound to the same normalized snapshot.",
      "Rebuild the J-02 input from one case/geometry/material/state snapshot; do not reuse stale properties or coefficients.",
    );
  }

  const temperatureDifferenceK =
    top.surfaceTemperatureK - top.ambientTemperatureK;
  const absoluteTemperatureDifferenceK = Math.abs(temperatureDifferenceK);
  if (
    !Number.isFinite(temperatureDifferenceK) ||
    (temperatureDifferenceK !== 0 &&
      positiveResultInvalid(absoluteTemperatureDifferenceK))
  ) {
    return numericFailure("surface-to-ambient temperature difference");
  }

  let rayleighNumber: number | null = null;
  let reynoldsNumber: number | null = null;
  if (naturalRoute) {
    const lengthSquared =
      top.characteristicLengthM * top.characteristicLengthM;
    const lengthCubed = lengthSquared * top.characteristicLengthM;
    if (
      positiveResultInvalid(lengthSquared) ||
      positiveResultInvalid(lengthCubed)
    ) {
      return numericFailure("characteristic-length power");
    }
    const diffusivityProduct =
      fluid.kinematicViscosityM2PerS *
      (fluid.thermalDiffusivityM2PerS as number);
    if (positiveResultInvalid(diffusivityProduct)) {
      return numericFailure("nu*alpha denominator");
    }
    if (absoluteTemperatureDifferenceK === 0) {
      rayleighNumber = 0;
    } else {
      const gravityExpansion =
        J02_STANDARD_GRAVITY_M_PER_S2 *
        (fluid.volumetricExpansionCoefficientPerK as number);
      const buoyancyTemperature =
        gravityExpansion * absoluteTemperatureDifferenceK;
      const buoyancyLength = buoyancyTemperature * lengthCubed;
      if (
        positiveResultInvalid(gravityExpansion) ||
        positiveResultInvalid(buoyancyTemperature) ||
        positiveResultInvalid(buoyancyLength)
      ) {
        return numericFailure("Rayleigh numerator");
      }
      rayleighNumber = buoyancyLength / diffusivityProduct;
      if (positiveResultInvalid(rayleighNumber)) {
        return numericFailure("Rayleigh number");
      }
    }
  } else {
    const velocityLength =
      (top.freeStreamVelocityMPerS as number) * top.characteristicLengthM;
    if (
      (top.freeStreamVelocityMPerS as number) > 0 &&
      positiveResultInvalid(velocityLength)
    ) {
      return numericFailure("U*D Reynolds numerator");
    }
    reynoldsNumber = velocityLength / fluid.kinematicViscosityM2PerS;
    if (
      (top.freeStreamVelocityMPerS as number) > 0 &&
      positiveResultInvalid(reynoldsNumber)
    ) {
      return numericFailure("Reynolds number");
    }
  }

  const correlation = computeCorrelation(
    route,
    rayleighNumber,
    reynoldsNumber,
    fluid.prandtlNumber,
  );
  if (!correlation.ok) {
    return correlation.result;
  }

  const nusseltConductivity =
    correlation.nusseltNumber * fluid.thermalConductivityWPerMK;
  const heatTransferCoefficientWPerM2K =
    nusseltConductivity / top.characteristicLengthM;
  const coefficientArea =
    heatTransferCoefficientWPerM2K * top.surfaceAreaM2;
  if (
    positiveResultInvalid(nusseltConductivity) ||
    positiveResultInvalid(heatTransferCoefficientWPerM2K) ||
    positiveResultInvalid(coefficientArea)
  ) {
    return numericFailure("h_c=Nu*k_f/X or h_c*A");
  }
  const heatRateW = coefficientArea * temperatureDifferenceK;
  if (
    !Number.isFinite(heatRateW) ||
    (temperatureDifferenceK !== 0 &&
      positiveResultInvalid(Math.abs(heatRateW)))
  ) {
    return numericFailure("Q_conv=h_c*A*(Ts-Tinf)");
  }

  const fluidPropertySourceRefs = Object.freeze(
    naturalRoute
      ? [
          fluid.thermalConductivitySourceRef as string,
          fluid.prandtlSourceRef as string,
          fluid.kinematicViscositySourceRef as string,
          fluid.thermalDiffusivitySourceRef as string,
          fluid.volumetricExpansionSourceRef as string,
        ]
      : [
          fluid.thermalConductivitySourceRef as string,
          fluid.prandtlSourceRef as string,
          fluid.kinematicViscositySourceRef as string,
        ],
  );
  const routeSource = J02_CONTROLLED_ONLINE_SOURCES[route];
  return Object.freeze({
    methodId: J02_METHOD_ID,
    methodVersion: J02_METHOD_VERSION,
    methodApproval: "approved_with_limitation" as const,
    status: "success" as const,
    applicabilityStatus: "in_domain" as const,
    route,
    registeredChildMethodId: null,
    runtimePublishable: false as const,
    value: Object.freeze({
      rayleighNumber,
      reynoldsNumber,
      prandtlNumber: fluid.prandtlNumber,
      nusseltNumber: correlation.nusseltNumber,
      heatTransferCoefficientWPerM2K,
      heatRateW,
      characteristicLengthDimensionId: "length" as const,
      characteristicLengthCanonicalUnitId: "m" as const,
      surfaceAreaDimensionId: "area" as const,
      surfaceAreaCanonicalUnitId: "m2" as const,
      heatTransferCoefficientDimensionId:
        "heat_transfer_coefficient" as const,
      heatTransferCoefficientCanonicalUnitId: "W/(m2*K)" as const,
      heatRateDimensionId: "power" as const,
      heatRateCanonicalUnitId: "W" as const,
      positiveDirection: "surface_to_ambient" as const,
    }),
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    equation: correlationEquation(route),
    domainCriterion: correlationDomain(route),
    substitution: Object.freeze({
      characteristicLengthM: top.characteristicLengthM,
      surfaceAreaM2: top.surfaceAreaM2,
      surfaceTemperatureK: top.surfaceTemperatureK,
      ambientTemperatureK: top.ambientTemperatureK,
      filmTemperatureK,
      temperatureDifferenceK,
      absoluteTemperatureDifferenceK,
      standardGravityMPerS2: J02_STANDARD_GRAVITY_M_PER_S2,
      thermalConductivityWPerMK: fluid.thermalConductivityWPerMK,
      prandtlNumber: fluid.prandtlNumber,
      kinematicViscosityM2PerS: fluid.kinematicViscosityM2PerS,
      thermalDiffusivityM2PerS:
        fluid.thermalDiffusivityM2PerS as number | null,
      volumetricExpansionCoefficientPerK:
        fluid.volumetricExpansionCoefficientPerK as number | null,
      freeStreamVelocityMPerS:
        top.freeStreamVelocityMPerS as number | null,
      correlationTrace: correlation.trace,
    }),
    evidence: Object.freeze({
      caseSnapshotId: snapshot.caseSnapshotId as string,
      geometrySnapshotId: snapshot.geometrySnapshotId as string,
      materialSnapshotId: snapshot.materialSnapshotId as string,
      propertyStateId: snapshot.propertyStateId as string,
      controlVolumeId: snapshot.controlVolumeId as string,
      boundaryId: snapshot.boundaryId as string,
      surfaceId: snapshot.surfaceId as string,
      surfaceStateId: snapshot.surfaceStateId as string,
      areaM2: top.surfaceAreaM2,
      surfaceTemperatureK: top.surfaceTemperatureK,
      referenceTemperatureK: top.ambientTemperatureK,
      fluidId: fluid.fluidId as string,
      fluidPropertySourceRefs,
      coefficientSourceRef: routeSource.sourceRef,
      routeSource,
      snapshotEvidence: Object.freeze({
        ...(snapshot as unknown as J02SnapshotEvidenceInput),
      }),
      applicabilityEvidence: Object.freeze({
        ...(applicability as unknown as J02ApplicabilityEvidenceInput),
      }),
      numericRepresentabilityPolicy: J02_NUMERIC_REPRESENTABILITY_POLICY,
    }),
    assumptions: Object.freeze([
      "selected_route_only_no_correlation_mixing",
      "all_fluid_properties_evaluated_at_explicit_film_state",
      "surface_area_and_characteristic_length_bound_to_same_geometry_snapshot",
      "single_unshielded_correlation_geometry",
      "mixed_convection_and_unapproved_corrections_excluded",
      "positive_heat_flow_is_surface_to_ambient",
      "end_effects_are_negligible_only_where_cylinder_route_requires_it",
    ]),
    mapping: J02_EXTERNAL_CONVECTION_MAPPING,
  });
}
