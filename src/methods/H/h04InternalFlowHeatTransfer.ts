/**
 * H-04 internal-flow heat-transfer correlation family.
 *
 * This is an isolated, non-activatable implementation of the three routes
 * whose equations and applicability limits are frozen in Calculation Basis.
 * The parent registry requires registered child methods, but no child IDs are
 * frozen yet. Consequently the route names below are discriminators only;
 * they are never represented as method IDs or runtime registrations.
 *
 * The three primary source copies are not present in SOURCE_MANIFEST.csv. The
 * implementation therefore exposes that release gate and never claims that a
 * caller-supplied property tuple is an executed A-02 result.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import {
  DATA_QUALITIES,
  type DataQuality,
} from "../../domain/status.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";
import { H03_METHOD_VERSION } from "./h03BranchFlowGeometry.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-04"));

export const H04_METHOD_ID = "H-04" as const;
export const H04_METHOD_VERSION = SPECIFICATION.methodVersion;
export const H04_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const H04_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const H04_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const H04_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const H04_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const H04_BINARY64_MIN_NORMAL = 2 ** -1022;

export const H04_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringTolerance: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  overflowPolicy: "fail_closed" as const,
  swallowedTermPolicy: "fail_closed" as const,
  coreRounding: "none" as const,
  minimumPositiveNormal: H04_BINARY64_MIN_NORMAL,
});

export const H04_CONTROLLED_SOURCE_GATES = Object.freeze([
  Object.freeze({
    sourceRef: "GN75:PP8-16" as const,
    localCopySha256: null,
    manifestStatus: "missing_from_source_manifest" as const,
    visualPageReviewStatus: "blocked_local_copy_missing" as const,
  }),
  Object.freeze({
    sourceRef: "NASA-NTRS-19830022277:S6.1.2.1" as const,
    localCopySha256: null,
    manifestStatus: "missing_from_source_manifest" as const,
    visualPageReviewStatus: "blocked_local_copy_missing" as const,
  }),
  Object.freeze({
    sourceRef: "OSTI-836896:S3.1.1" as const,
    localCopySha256: null,
    manifestStatus: "missing_from_source_manifest" as const,
    visualPageReviewStatus: "blocked_local_copy_missing" as const,
  }),
] as const);

export const H04_INTERNAL_ROUTE_NAMES = Object.freeze([
  "fully_developed_straight_round_laminar_CWT",
  "fully_developed_straight_round_laminar_CWF",
  "straight_smooth_round_Gnielinski_1975",
] as const);

export type H04InternalRouteName =
  (typeof H04_INTERNAL_ROUTE_NAMES)[number];

export const H04_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  registryParentRequiresSubmethodSplit: true as const,
  registeredChildMethodIds: Object.freeze([]) as readonly [],
  internalRouteNamesAreMethodIds: false as const,
  propertyBoundary:
    "explicit upstream tuple; H-04 does not claim or execute A-02" as const,
  openMethodGates: Object.freeze([
    "registered_H04_child_method_ids_missing",
    "GN75_local_primary_copy_and_sha256_missing",
    "NASA_NTRS_19830022277_local_primary_copy_and_sha256_missing",
    "OSTI_836896_local_primary_copy_and_sha256_missing",
    "A02_executable_property_provider_missing",
    "COOL_HT_001_prose_regression_differs_from_frozen_log10_formula",
  ] as const),
});

export const H04_PARAMETER_MAPPING = Object.freeze({
  density: Object.freeze({
    contractInputId: "rho" as const,
    dimensionId: "density" as const,
    canonicalUnitId: "kg_per_m3" as const,
  }),
  velocity: Object.freeze({
    contractInputId: "v" as const,
    parameterId: "water.velocity" as const,
    dimensionId: "velocity" as const,
    canonicalUnitId: "m_per_s" as const,
  }),
  hydraulicDiameter: Object.freeze({
    contractInputId: "Dh" as const,
    parameterId: "coolant.hydraulic_diameter" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
  dynamicViscosity: Object.freeze({
    contractInputId: "mu" as const,
    dimensionId: "dynamic_viscosity" as const,
    canonicalUnitId: "Pa_s" as const,
  }),
  specificHeatCapacity: Object.freeze({
    contractInputId: "cp" as const,
    dimensionId: "specific_heat_capacity" as const,
    canonicalUnitId: "J_per_kg_K" as const,
  }),
  thermalConductivity: Object.freeze({
    contractInputId: "kf" as const,
    dimensionId: "thermal_conductivity" as const,
    canonicalUnitId: "W_per_m_K" as const,
  }),
  reynoldsNumber: Object.freeze({
    contractOutputId: "Re" as const,
    dimensionId: "dimensionless" as const,
    canonicalUnitId: "one" as const,
  }),
  prandtlNumber: Object.freeze({
    contractOutputId: "Pr" as const,
    dimensionId: "dimensionless" as const,
    canonicalUnitId: "one" as const,
  }),
  nusseltNumber: Object.freeze({
    contractOutputId: "Nu" as const,
    dimensionId: "dimensionless" as const,
    canonicalUnitId: "one" as const,
  }),
  meanHeatTransferCoefficient: Object.freeze({
    contractOutputId: "h" as const,
    dimensionId: "heat_transfer_coefficient" as const,
    canonicalUnitId: "W_per_m2_K" as const,
  }),
});

export const H04_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
  equationRef: SPECIFICATION.contractEquationRef,
  applicabilityRef: SPECIFICATION.contractApplicabilityRef,
  warningRef: SPECIFICATION.contractWarningRef,
  validationRef: SPECIFICATION.contractValidationRef,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  sourceRefs: H04_SOURCE_REFS,
  contractSourceRefs: H04_CONTRACT_SOURCE_REFS,
  derivationRefs: H04_DERIVATION_REFS,
  validationCaseIds: H04_VALIDATION_CASE_IDS,
  methodCheckIds: H04_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  parameterMapping: H04_PARAMETER_MAPPING,
  sourceGates: H04_CONTROLLED_SOURCE_GATES,
  numericRepresentabilityPolicy: H04_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: H04_IMPLEMENTATION_READINESS,
});

const TRANSITION_FLOW_PREDICATE =
  "transition-flow interpolation" as const;
const STRAIGHT_TUBE_MISAPPLICATION_PREDICATE =
  "straight-tube correlation is applied to helical, entrance, noncircular or two-phase flow" as const;
const HOTSPOT_OVERCLAIM_PREDICATE =
  "mean h is labelled hotspot safety" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      "H-04 warning predicate is absent from the frozen contract: " +
        predicate,
    );
  }
  return predicate;
}

export const H04_WARNING_PREDICATES = Object.freeze({
  transitionFlowInterpolation: controlledWarningPredicate(
    TRANSITION_FLOW_PREDICATE,
  ),
  straightTubeMisapplication: controlledWarningPredicate(
    STRAIGHT_TUBE_MISAPPLICATION_PREDICATE,
  ),
  hotspotSafetyOverclaim: controlledWarningPredicate(
    HOTSPOT_OVERCLAIM_PREDICATE,
  ),
});

export interface H04PositiveQuantity<
  TDimension extends string,
  TUnit extends string,
> {
  readonly valueSi: number;
  readonly dimensionId: TDimension;
  readonly canonicalUnitId: TUnit;
}

export interface H04FlowGeometryEvidence {
  readonly kind: "h03_resolved_flow_geometry";
  readonly sourceMethodId: "H-03";
  readonly sourceMethodVersion: string;
  readonly sourceResultSnapshotId: string;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly fluidStateSnapshotId: string;
  readonly coolantCircuitId: string;
  readonly branchId: string;
  readonly timeBasisId: string;
  readonly velocity: H04PositiveQuantity<"velocity", "m_per_s">;
  readonly hydraulicDiameter: H04PositiveQuantity<"length", "m">;
}

export interface H04ExplicitUpstreamPropertyTuple {
  readonly kind: "explicit_upstream_property_tuple";
  readonly a02ResultClaimed: false;
  readonly propertyTupleSnapshotId: string;
  readonly propertyProviderId: string;
  readonly propertyProviderVersion: string;
  readonly propertyProviderArtifactSha256: string;
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly caseSnapshotId: string;
  readonly fluidStateSnapshotId: string;
  readonly coolantCircuitId: string;
  readonly branchId: string;
  readonly timeBasisId: string;
  readonly temperature: H04PositiveQuantity<
    "absolute_temperature",
    "K"
  >;
  readonly pressure: H04PositiveQuantity<"pressure", "Pa"> &
    Readonly<{ readonly pressureBasis: "absolute" }>;
  readonly phaseClassification:
    | "single_phase_liquid"
    | "two_phase_or_other"
    | "unknown_or_unconfirmed";
  readonly rho: H04PositiveQuantity<"density", "kg_per_m3">;
  readonly mu: H04PositiveQuantity<"dynamic_viscosity", "Pa_s">;
  readonly cp: H04PositiveQuantity<
    "specific_heat_capacity",
    "J_per_kg_K"
  >;
  readonly kf: H04PositiveQuantity<
    "thermal_conductivity",
    "W_per_m_K"
  >;
}

export interface H04ApplicabilityEvidence {
  readonly geometryClass:
    | "straight_round_tube"
    | "helical_or_curved"
    | "noncircular"
    | "unknown_or_unconfirmed";
  readonly surfaceClass:
    | "smooth"
    | "rough_or_other"
    | "unknown_or_unconfirmed";
  readonly hydrodynamicDevelopment:
    | "fully_developed"
    | "entrance_or_developing"
    | "unknown_or_unconfirmed";
  readonly thermalDevelopment:
    | "fully_developed"
    | "entrance_or_developing"
    | "unknown_or_unconfirmed";
  readonly phaseRegime:
    | "single_phase_liquid"
    | "two_phase_or_other"
    | "unknown_or_unconfirmed";
  readonly propertyVariation:
    | "not_significant_at_declared_bulk_state"
    | "significant"
    | "unknown_or_unconfirmed";
  readonly heatBoundaryCondition:
    | "constant_wall_temperature"
    | "constant_wall_heat_flux"
    | "other_known"
    | "unknown_or_unconfirmed";
  readonly requestedInterpretation:
    | "mean_internal_heat_transfer_coefficient_screening"
    | "local_hotspot_or_safety_claim"
    | "unknown_or_unconfirmed";
}

export interface H04InternalFlowHeatTransferInput {
  readonly route: H04InternalRouteName | "unknown_or_unconfirmed";
  readonly flowGeometry: H04FlowGeometryEvidence;
  readonly properties: H04ExplicitUpstreamPropertyTuple;
  readonly applicability: H04ApplicabilityEvidence;
}

export interface H04Warning {
  readonly sourceMethodId: "H-04";
  readonly predicate:
    (typeof H04_WARNING_PREDICATES)[keyof typeof H04_WARNING_PREDICATES];
  readonly message: string;
}

export interface H04InternalFlowHeatTransferSuccess {
  readonly methodId: typeof H04_METHOD_ID;
  readonly methodVersion: typeof H04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly internalRoute: Readonly<{
    readonly name: H04InternalRouteName;
    readonly registrationStatus:
      "internal_route_not_registered_child_method";
  }>;
  readonly value: Readonly<{
    readonly Re: Readonly<{
      readonly outputId: "Re";
      readonly valueSi: number;
      readonly dimensionId: "dimensionless";
      readonly canonicalUnitId: "one";
    }>;
    readonly Pr: Readonly<{
      readonly outputId: "Pr";
      readonly valueSi: number;
      readonly dimensionId: "dimensionless";
      readonly canonicalUnitId: "one";
    }>;
    readonly Nu: Readonly<{
      readonly outputId: "Nu";
      readonly valueSi: number;
      readonly dimensionId: "dimensionless";
      readonly canonicalUnitId: "one";
    }>;
    readonly h: Readonly<{
      readonly outputId: "h";
      readonly valueSi: number;
      readonly dimensionId: "heat_transfer_coefficient";
      readonly canonicalUnitId: "W_per_m2_K";
      readonly interpretation:
        "mean_internal_heat_transfer_coefficient_screening_not_hotspot_safety";
    }>;
    readonly gnielinskiFrictionFactor: Readonly<{
      readonly availability: "available";
      readonly valueSi: number;
      readonly canonicalUnitId: "one";
    }> | Readonly<{
      readonly availability: "not_applicable_to_selected_laminar_route";
    }>;
  }>;
  readonly equations: readonly [
    "Re = rho * v * Dh / mu",
    "Pr = cp * mu / kf",
    "Nu_CWT = 3.656",
    "Nu_CWF = 4.364",
    "fG = (1.82 * log10(Re) - 1.64)^(-2)",
    "Nu_Gnielinski = ((fG/8)*(Re-1000)*Pr) / (1 + 12.7*sqrt(fG/8)*(Pr^(2/3)-1))",
    "h = Nu * kf / Dh",
  ];
  readonly substitution: Readonly<{
    readonly rhoKgPerM3: number;
    readonly velocityMPerS: number;
    readonly hydraulicDiameterM: number;
    readonly dynamicViscosityPaS: number;
    readonly specificHeatCapacityJPerKgK: number;
    readonly thermalConductivityWPerMK: number;
    readonly reynoldsNumber: number;
    readonly prandtlNumber: number;
    readonly selectedNusseltNumber: number;
  }>;
  readonly inputSnapshot: Readonly<{
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly fluidStateSnapshotId: string;
    readonly propertyTupleSnapshotId: string;
    readonly sourceResultSnapshotId: string;
    readonly coolantCircuitId: string;
    readonly branchId: string;
    readonly timeBasisId: string;
  }>;
  readonly evidence: Readonly<{
    readonly flowGeometry: Readonly<H04FlowGeometryEvidence>;
    readonly properties: Readonly<H04ExplicitUpstreamPropertyTuple>;
    readonly applicability: Readonly<H04ApplicabilityEvidence>;
  }>;
  readonly applicabilityChecks: readonly [
    "straight smooth round passage",
    "hydrodynamically and thermally fully developed flow",
    "single-phase liquid at one declared bulk state",
    "no significant property variation at the selected state",
    "heat boundary matches the selected internal route",
    "route-specific Reynolds and Prandtl domain",
    "output is a mean screening coefficient, not local hotspot safety",
  ];
  readonly solverResiduals: Readonly<{
    readonly solverUsed: false;
    readonly classification: "analytical_closed_form_no_iterative_solver";
  }>;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim:
      "limited_by_upstream_geometry_property_precision_and_correlation_domain";
  }>;
  readonly assumptions: readonly [
    "the explicit property tuple belongs to the same flow state as v and Dh",
    "H-04 does not execute or certify A-02",
    "the internal route name is not a registered child method ID",
    "the reported h is a mean straight-tube screening value",
    "helical, entrance, noncircular, two-phase and significant-property-variation routes are excluded",
  ];
  readonly sourceRefs: typeof H04_SOURCE_REFS;
  readonly contractSourceRefs: typeof H04_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof H04_DERIVATION_REFS;
  readonly validationCaseIds: typeof H04_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof H04_METHOD_CHECK_IDS;
  readonly mapping: typeof H04_METHOD_MAPPING;
  readonly sourceGates: typeof H04_CONTROLLED_SOURCE_GATES;
  readonly implementationReadiness: typeof H04_IMPLEMENTATION_READINESS;
  readonly numericRepresentabilityPolicy:
    typeof H04_NUMERIC_REPRESENTABILITY_POLICY;
  readonly failure?: never;
}

export type H04FailureCode =
  | "H-04.input_schema_invalid"
  | "H-04.route_invalid"
  | "H-04.route_unconfirmed"
  | "H-04.flow_geometry_missing"
  | "H-04.flow_geometry_schema_invalid"
  | "H-04.flow_geometry_value_invalid"
  | "H-04.flow_geometry_provenance_insufficient"
  | "H-04.upstream_h03_version_mismatch"
  | "H-04.property_tuple_missing"
  | "H-04.property_tuple_schema_invalid"
  | "H-04.property_tuple_value_invalid"
  | "H-04.property_tuple_provenance_insufficient"
  | "H-04.a02_result_overclaim"
  | "H-04.applicability_missing"
  | "H-04.applicability_schema_invalid"
  | "H-04.upstream_state_binding_mismatch"
  | "H-04.phase_evidence_mismatch"
  | "H-04.geometry_not_applicable"
  | "H-04.surface_not_applicable"
  | "H-04.development_not_applicable"
  | "H-04.phase_not_applicable"
  | "H-04.property_variation_not_applicable"
  | "H-04.heat_boundary_not_applicable"
  | "H-04.hotspot_safety_not_applicable"
  | "H-04.transition_flow_not_applicable"
  | "H-04.route_domain_not_applicable"
  | "H-04.applicability_unconfirmed"
  | "H-04.heat_boundary_route_mismatch"
  | "H-04.numeric_overflow"
  | "H-04.numeric_underflow"
  | "H-04.numeric_term_swallowed"
  | "H-04.numeric_intermediate_invalid";

export interface H04InternalFlowHeatTransferFailure {
  readonly methodId: typeof H04_METHOD_ID;
  readonly methodVersion: typeof H04_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly H04Warning[];
  readonly mapping: typeof H04_METHOD_MAPPING;
  readonly sourceGates: typeof H04_CONTROLLED_SOURCE_GATES;
  readonly implementationReadiness: typeof H04_IMPLEMENTATION_READINESS;
  readonly failure: Readonly<{
    readonly code: H04FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
}

export type H04InternalFlowHeatTransferOutcome =
  | H04InternalFlowHeatTransferSuccess
  | H04InternalFlowHeatTransferFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function warning(
  predicate: H04Warning["predicate"],
  message: string,
): H04Warning {
  return Object.freeze({
    sourceMethodId: H04_METHOD_ID,
    predicate,
    message,
  });
}

function failure(
  status: H04InternalFlowHeatTransferFailure["status"],
  code: H04FailureCode,
  message: string,
  action: string,
  warnings: readonly H04Warning[] = EMPTY_WARNINGS,
): H04InternalFlowHeatTransferFailure {
  return Object.freeze({
    methodId: H04_METHOD_ID,
    methodVersion: H04_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    mapping: H04_METHOD_MAPPING,
    sourceGates: H04_CONTROLLED_SOURCE_GATES,
    implementationReadiness: H04_IMPLEMENTATION_READINESS,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u.test(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isFluidStateSnapshotId(value: unknown): value is string {
  return (
    typeof value === "string" && /^fluid_state:[0-9a-f]{64}$/u.test(value)
  );
}

function isResultSnapshotId(value: unknown): value is string {
  return typeof value === "string" && /^result:[0-9a-f]{64}$/u.test(value);
}

function isDataQuality(value: unknown): value is DataQuality {
  return (DATA_QUALITIES as readonly unknown[]).includes(value);
}

function isPositiveFinite(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

type QuantityReadResult<TQuantity> =
  | Readonly<{ readonly ok: true; readonly quantity: TQuantity }>
  | Readonly<{ readonly ok: false }>;

function readPositiveQuantity<
  TDimension extends string,
  TUnit extends string,
>(
  value: unknown,
  dimensionId: TDimension,
  canonicalUnitId: TUnit,
  extraExpectedKeys: readonly string[] = [],
): QuantityReadResult<H04PositiveQuantity<TDimension, TUnit>> {
  const record = readExactPlainDataRecord(value, [
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    ...extraExpectedKeys,
  ]);
  if (
    record === null ||
    !isPositiveFinite(record.valueSi) ||
    record.dimensionId !== dimensionId ||
    record.canonicalUnitId !== canonicalUnitId
  ) {
    return Object.freeze({ ok: false });
  }
  return Object.freeze({
    ok: true,
    quantity: Object.freeze({
      valueSi: record.valueSi,
      dimensionId,
      canonicalUnitId,
    }),
  });
}

type FlowReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<H04FlowGeometryEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H04InternalFlowHeatTransferFailure;
    }>;

function readFlowGeometry(value: unknown): FlowReadResult {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-04.flow_geometry_missing",
        "H-04 requires one resolved v/Dh flow-geometry tuple.",
        "Provide one same-branch H-03 result adapter with immutable snapshots.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "sourceMethodId",
    "sourceMethodVersion",
    "sourceResultSnapshotId",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "caseSnapshotId",
    "geometrySnapshotId",
    "fluidStateSnapshotId",
    "coolantCircuitId",
    "branchId",
    "timeBasisId",
    "velocity",
    "hydraulicDiameter",
  ]);
  if (
    record === null ||
    record.kind !== "h03_resolved_flow_geometry" ||
    record.sourceMethodId !== "H-03" ||
    !isStableIdentifier(record.sourceMethodVersion) ||
    !isResultSnapshotId(record.sourceResultSnapshotId) ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isFluidStateSnapshotId(record.fluidStateSnapshotId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.branchId) ||
    !isStableIdentifier(record.timeBasisId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-04.flow_geometry_schema_invalid",
        "The flow-geometry evidence is not one exact controlled H-03 adapter.",
        "Provide stable provenance, content-addressed snapshots, v in m/s and Dh in m without extra fields.",
      ),
    });
  }
  const velocity = readPositiveQuantity(record.velocity, "velocity", "m_per_s");
  const hydraulicDiameter = readPositiveQuantity(
    record.hydraulicDiameter,
    "length",
    "m",
  );
  if (!velocity.ok || !hydraulicDiameter.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-04.flow_geometry_value_invalid",
        "v and Dh must be finite positive binary64 SI quantities.",
        "Resolve mean branch velocity in m/s and hydraulic diameter in m from H-03; machine-normal representability is checked after applicability disposition.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "h03_resolved_flow_geometry",
      sourceMethodId: "H-03",
      sourceMethodVersion: record.sourceMethodVersion,
      sourceResultSnapshotId: record.sourceResultSnapshotId,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      fluidStateSnapshotId: record.fluidStateSnapshotId,
      coolantCircuitId: record.coolantCircuitId,
      branchId: record.branchId,
      timeBasisId: record.timeBasisId,
      velocity: velocity.quantity,
      hydraulicDiameter: hydraulicDiameter.quantity,
    }),
  });
}

type PropertyReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<H04ExplicitUpstreamPropertyTuple>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H04InternalFlowHeatTransferFailure;
    }>;

function readProperties(value: unknown): PropertyReadResult {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-04.property_tuple_missing",
        "H-04 requires an explicit same-state rho/mu/cp/kf tuple.",
        "Resolve the property tuple upstream; H-04 does not supply default water properties.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "a02ResultClaimed",
    "propertyTupleSnapshotId",
    "propertyProviderId",
    "propertyProviderVersion",
    "propertyProviderArtifactSha256",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "caseSnapshotId",
    "fluidStateSnapshotId",
    "coolantCircuitId",
    "branchId",
    "timeBasisId",
    "temperature",
    "pressure",
    "phaseClassification",
    "rho",
    "mu",
    "cp",
    "kf",
  ]);
  if (
    record === null ||
    record.kind !== "explicit_upstream_property_tuple" ||
    typeof record.a02ResultClaimed !== "boolean" ||
    !isContentAddressedSnapshotId(record.propertyTupleSnapshotId, "material") ||
    !isStableIdentifier(record.propertyProviderId) ||
    !isStableIdentifier(record.propertyProviderVersion) ||
    !isSha256(record.propertyProviderArtifactSha256) ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isFluidStateSnapshotId(record.fluidStateSnapshotId) ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.branchId) ||
    !isStableIdentifier(record.timeBasisId) ||
    (record.phaseClassification !== "single_phase_liquid" &&
      record.phaseClassification !== "two_phase_or_other" &&
      record.phaseClassification !== "unknown_or_unconfirmed")
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-04.property_tuple_schema_invalid",
        "The property evidence is not one exact provenance-bearing upstream tuple.",
        "Provide one same-state SI tuple with provider version/artifact SHA and no extra or accessor fields.",
      ),
    });
  }
  const temperature = readPositiveQuantity(
    record.temperature,
    "absolute_temperature",
    "K",
  );
  const pressureRecord = readExactPlainDataRecord(record.pressure, [
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
    "pressureBasis",
  ]);
  const pressureOk =
    pressureRecord !== null &&
    isPositiveFinite(pressureRecord.valueSi) &&
    pressureRecord.dimensionId === "pressure" &&
    pressureRecord.canonicalUnitId === "Pa" &&
    pressureRecord.pressureBasis === "absolute";
  const rho = readPositiveQuantity(record.rho, "density", "kg_per_m3");
  const mu = readPositiveQuantity(record.mu, "dynamic_viscosity", "Pa_s");
  const cp = readPositiveQuantity(
    record.cp,
    "specific_heat_capacity",
    "J_per_kg_K",
  );
  const kf = readPositiveQuantity(
    record.kf,
    "thermal_conductivity",
    "W_per_m_K",
  );
  if (!temperature.ok || !pressureOk || !rho.ok || !mu.ok || !cp.ok || !kf.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-04.property_tuple_value_invalid",
        "The state or rho/mu/cp/kf tuple contains an invalid, non-SI, non-finite or non-positive quantity.",
        "Provide positive binary64 SI values and absolute pressure for one bulk state; machine-normal representability is checked after applicability disposition.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "explicit_upstream_property_tuple",
      a02ResultClaimed: record.a02ResultClaimed as false,
      propertyTupleSnapshotId: record.propertyTupleSnapshotId,
      propertyProviderId: record.propertyProviderId,
      propertyProviderVersion: record.propertyProviderVersion,
      propertyProviderArtifactSha256: record.propertyProviderArtifactSha256,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      caseSnapshotId: record.caseSnapshotId,
      fluidStateSnapshotId: record.fluidStateSnapshotId,
      coolantCircuitId: record.coolantCircuitId,
      branchId: record.branchId,
      timeBasisId: record.timeBasisId,
      temperature: temperature.quantity,
      pressure: Object.freeze({
        valueSi: pressureRecord.valueSi as number,
        dimensionId: "pressure",
        canonicalUnitId: "Pa",
        pressureBasis: "absolute",
      }),
      phaseClassification: record.phaseClassification,
      rho: rho.quantity,
      mu: mu.quantity,
      cp: cp.quantity,
      kf: kf.quantity,
    }),
  });
}

type ApplicabilityReadResult =
  | Readonly<{
      readonly ok: true;
      readonly value: Readonly<H04ApplicabilityEvidence>;
    }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H04InternalFlowHeatTransferFailure;
    }>;

function readApplicability(value: unknown): ApplicabilityReadResult {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-04.applicability_missing",
        "H-04 requires explicit geometry, development, phase, property-variation, heat-boundary and interpretation evidence.",
        "Classify every frozen applicability discriminator without inference.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "geometryClass",
    "surfaceClass",
    "hydrodynamicDevelopment",
    "thermalDevelopment",
    "phaseRegime",
    "propertyVariation",
    "heatBoundaryCondition",
    "requestedInterpretation",
  ]);
  const valid =
    record !== null &&
    [
      "straight_round_tube",
      "helical_or_curved",
      "noncircular",
      "unknown_or_unconfirmed",
    ].includes(record.geometryClass as string) &&
    ["smooth", "rough_or_other", "unknown_or_unconfirmed"].includes(
      record.surfaceClass as string,
    ) &&
    [
      "fully_developed",
      "entrance_or_developing",
      "unknown_or_unconfirmed",
    ].includes(record.hydrodynamicDevelopment as string) &&
    [
      "fully_developed",
      "entrance_or_developing",
      "unknown_or_unconfirmed",
    ].includes(record.thermalDevelopment as string) &&
    [
      "single_phase_liquid",
      "two_phase_or_other",
      "unknown_or_unconfirmed",
    ].includes(record.phaseRegime as string) &&
    [
      "not_significant_at_declared_bulk_state",
      "significant",
      "unknown_or_unconfirmed",
    ].includes(record.propertyVariation as string) &&
    [
      "constant_wall_temperature",
      "constant_wall_heat_flux",
      "other_known",
      "unknown_or_unconfirmed",
    ].includes(record.heatBoundaryCondition as string) &&
    [
      "mean_internal_heat_transfer_coefficient_screening",
      "local_hotspot_or_safety_claim",
      "unknown_or_unconfirmed",
    ].includes(record.requestedInterpretation as string);
  if (!valid || record === null) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-04.applicability_schema_invalid",
        "The H-04 applicability record contains a missing, extra or unknown machine enum.",
        "Use only the frozen H-04 applicability discriminators.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      geometryClass: record.geometryClass,
      surfaceClass: record.surfaceClass,
      hydrodynamicDevelopment: record.hydrodynamicDevelopment,
      thermalDevelopment: record.thermalDevelopment,
      phaseRegime: record.phaseRegime,
      propertyVariation: record.propertyVariation,
      heatBoundaryCondition: record.heatBoundaryCondition,
      requestedInterpretation: record.requestedInterpretation,
    } as H04ApplicabilityEvidence),
  });
}

function numericFailure(
  code:
    | "H-04.numeric_overflow"
    | "H-04.numeric_underflow"
    | "H-04.numeric_term_swallowed"
    | "H-04.numeric_intermediate_invalid",
  operation: string,
): H04InternalFlowHeatTransferFailure {
  return failure(
    "invalid_input",
    code,
    "Binary64 cannot represent the H-04 " + operation + " reliably.",
    "Rescale the physical problem or use a higher-precision reviewed implementation; no rounded, zero or last value is returned.",
  );
}

type NumericResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H04InternalFlowHeatTransferFailure;
    }>;

function checkedPositiveResult(value: number, operation: string): NumericResult {
  if (!Number.isFinite(value)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-04.numeric_overflow", operation),
    });
  }
  if (value === 0 || (value > 0 && value < H04_BINARY64_MIN_NORMAL)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-04.numeric_underflow", operation),
    });
  }
  if (value < 0) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-04.numeric_intermediate_invalid", operation),
    });
  }
  return Object.freeze({ ok: true, value });
}

function checkedPositiveProduct(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const checked = checkedPositiveResult(left * right, operation);
  if (!checked.ok) return checked;
  if (
    (right !== 1 && checked.value === left) ||
    (left !== 1 && checked.value === right)
  ) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-04.numeric_term_swallowed",
        operation + " non-unit operand",
      ),
    });
  }
  return checked;
}

function checkedPositiveQuotient(
  numerator: number,
  denominator: number,
  operation: string,
): NumericResult {
  const checked = checkedPositiveResult(numerator / denominator, operation);
  if (!checked.ok) return checked;
  if (denominator !== 1 && checked.value === numerator) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-04.numeric_term_swallowed",
        operation + " non-unit divisor",
      ),
    });
  }
  return checked;
}

function sameStateBinding(
  flow: H04FlowGeometryEvidence,
  properties: H04ExplicitUpstreamPropertyTuple,
): boolean {
  return (
    flow.caseSnapshotId === properties.caseSnapshotId &&
    flow.fluidStateSnapshotId === properties.fluidStateSnapshotId &&
    flow.coolantCircuitId === properties.coolantCircuitId &&
    flow.branchId === properties.branchId &&
    flow.timeBasisId === properties.timeBasisId
  );
}

function unsupportedGeometryFailure(
  code:
    | "H-04.geometry_not_applicable"
    | "H-04.surface_not_applicable"
    | "H-04.development_not_applicable"
    | "H-04.phase_not_applicable"
    | "H-04.property_variation_not_applicable"
    | "H-04.heat_boundary_not_applicable",
  message: string,
): H04InternalFlowHeatTransferFailure {
  return failure(
    "not_applicable",
    code,
    message,
    "Select an approved matching correlation or retain this route as deferred; do not coerce it to a straight-tube result.",
    [
      warning(
        H04_WARNING_PREDICATES.straightTubeMisapplication,
        message,
      ),
    ],
  );
}

/** Evaluate only the frozen, explicitly selected H-04 internal route. */
export function evaluateH04InternalFlowHeatTransfer(
  input: H04InternalFlowHeatTransferInput,
): H04InternalFlowHeatTransferOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "route",
    "flowGeometry",
    "properties",
    "applicability",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "H-04.input_schema_invalid",
      "H-04 input must be one exact controlled plain-data record.",
      "Provide only route, flowGeometry, properties and applicability without missing, extra, inherited, accessor or symbol fields.",
    );
  }

  const route = controlledInput.route;
  const routeValid =
    route === "unknown_or_unconfirmed" ||
    (H04_INTERNAL_ROUTE_NAMES as readonly unknown[]).includes(route);
  const flowResult = readFlowGeometry(controlledInput.flowGeometry);
  const propertyResult = readProperties(controlledInput.properties);
  const applicabilityResult = readApplicability(controlledInput.applicability);

  /* Complete schema inspection before semantic disposition: a later hostile
   * record must outrank an earlier missing/unknown engineering item. */
  if (!routeValid) {
    return failure(
      "invalid_input",
      "H-04.route_invalid",
      "The requested H-04 route is not a frozen internal route name.",
      "Use one of the three frozen internal discriminators; none is a registered child method ID.",
    );
  }
  for (const result of [flowResult, propertyResult, applicabilityResult]) {
    if (!result.ok && result.failure.status === "invalid_input") {
      return result.failure;
    }
  }
  if (!flowResult.ok) return flowResult.failure;
  if (!propertyResult.ok) return propertyResult.failure;
  if (!applicabilityResult.ok) return applicabilityResult.failure;

  const flow = flowResult.value;
  const properties = propertyResult.value;
  const applicability = applicabilityResult.value;

  if (properties.a02ResultClaimed !== false) {
    return failure(
      "invalid_input",
      "H-04.a02_result_overclaim",
      "The tuple claims an A-02 result even though H-04 cannot replay an executable A-02 provider chain.",
      "Set a02ResultClaimed=false and retain the explicit upstream tuple provenance until A-02 is released.",
    );
  }
  if (flow.sourceMethodVersion !== H03_METHOD_VERSION) {
    return failure(
      "insufficient_data",
      "H-04.upstream_h03_version_mismatch",
      "The flow-geometry adapter does not match the current H-03 model version.",
      "Re-evaluate v and Dh with the current H-03 implementation and bind its result snapshot.",
    );
  }
  if (!sameStateBinding(flow, properties)) {
    return failure(
      "invalid_input",
      "H-04.upstream_state_binding_mismatch",
      "v, Dh and the property tuple do not share one case, branch, circuit, fluid state and time basis.",
      "Bind all H-04 inputs to the same immutable bulk-flow state before evaluating dimensionless groups.",
    );
  }
  if (
    properties.phaseClassification !== "unknown_or_unconfirmed" &&
    applicability.phaseRegime !== "unknown_or_unconfirmed" &&
    properties.phaseClassification !== applicability.phaseRegime
  ) {
    return failure(
      "invalid_input",
      "H-04.phase_evidence_mismatch",
      "The property tuple and applicability record give contradictory phase classifications.",
      "Resolve one same-state single-phase classification; do not select the more convenient record.",
    );
  }

  /* Known non-numeric applicability failures must not be masked by an
   * unrelated subnormal property or by arithmetic that is unnecessary for
   * disposing the selected route. */
  if (applicability.geometryClass === "helical_or_curved") {
    return unsupportedGeometryFailure(
      "H-04.geometry_not_applicable",
      "Helical or curved-passage effects are outside the frozen straight-tube routes.",
    );
  }
  if (applicability.geometryClass === "noncircular") {
    return unsupportedGeometryFailure(
      "H-04.geometry_not_applicable",
      "A noncircular passage is outside the frozen straight round-tube routes.",
    );
  }
  if (applicability.surfaceClass === "rough_or_other") {
    return unsupportedGeometryFailure(
      "H-04.surface_not_applicable",
      "A rough or otherwise unsupported surface is outside the frozen smooth-tube route family.",
    );
  }
  if (
    applicability.hydrodynamicDevelopment === "entrance_or_developing" ||
    applicability.thermalDevelopment === "entrance_or_developing"
  ) {
    return unsupportedGeometryFailure(
      "H-04.development_not_applicable",
      "Entrance or developing flow is outside the fully developed route family.",
    );
  }
  if (
    applicability.phaseRegime === "two_phase_or_other" ||
    properties.phaseClassification === "two_phase_or_other"
  ) {
    return unsupportedGeometryFailure(
      "H-04.phase_not_applicable",
      "Two-phase or non-liquid flow is outside the single-phase H-04 routes.",
    );
  }
  if (applicability.propertyVariation === "significant") {
    return unsupportedGeometryFailure(
      "H-04.property_variation_not_applicable",
      "Significant property variation is outside the selected one-state property-tuple route.",
    );
  }
  if (applicability.heatBoundaryCondition === "other_known") {
    return unsupportedGeometryFailure(
      "H-04.heat_boundary_not_applicable",
      "The heat boundary is not a confirmed constant-wall-temperature or constant-wall-flux route.",
    );
  }
  if (
    applicability.requestedInterpretation ===
    "local_hotspot_or_safety_claim"
  ) {
    const message =
      "A mean straight-tube heat-transfer coefficient cannot establish a local hotspot or safety claim.";
    return failure(
      "not_applicable",
      "H-04.hotspot_safety_not_applicable",
      message,
      "Use local heat-flux, wall-temperature, saturation and validated geometry evidence; retain H-04 only as mean screening.",
      [warning(H04_WARNING_PREDICATES.hotspotSafetyOverclaim, message)],
    );
  }

  if (
    (route === "fully_developed_straight_round_laminar_CWT" &&
      applicability.heatBoundaryCondition === "constant_wall_heat_flux") ||
    (route === "fully_developed_straight_round_laminar_CWF" &&
      applicability.heatBoundaryCondition === "constant_wall_temperature")
  ) {
    return failure(
      "not_applicable",
      "H-04.heat_boundary_route_mismatch",
      "The selected laminar route does not match the declared thermal boundary condition.",
      "Select CWT only for constant wall temperature and CWF only for constant wall heat flux.",
    );
  }

  const hasUnknownApplicability =
    route === "unknown_or_unconfirmed" ||
    properties.phaseClassification === "unknown_or_unconfirmed" ||
    applicability.geometryClass === "unknown_or_unconfirmed" ||
    applicability.surfaceClass === "unknown_or_unconfirmed" ||
    applicability.hydrodynamicDevelopment === "unknown_or_unconfirmed" ||
    applicability.thermalDevelopment === "unknown_or_unconfirmed" ||
    applicability.phaseRegime === "unknown_or_unconfirmed" ||
    applicability.propertyVariation === "unknown_or_unconfirmed" ||
    applicability.heatBoundaryCondition === "unknown_or_unconfirmed" ||
    applicability.requestedInterpretation === "unknown_or_unconfirmed";

  const unknownApplicabilityFailure = () =>
    failure(
      "insufficient_data",
      route === "unknown_or_unconfirmed"
        ? "H-04.route_unconfirmed"
        : "H-04.applicability_unconfirmed",
      "At least one H-04 route or applicability discriminator is unknown or unconfirmed.",
      "Resolve straight/smooth/round, development, phase, property variation, heat boundary, route and interpretation before relying on machine arithmetic.",
    );

  const hasSubnormalInput = [
    flow.velocity.valueSi,
    flow.hydraulicDiameter.valueSi,
    properties.temperature.valueSi,
    properties.pressure.valueSi,
    properties.rho.valueSi,
    properties.mu.valueSi,
    properties.cp.valueSi,
    properties.kf.valueSi,
  ].some((value) => value < H04_BINARY64_MIN_NORMAL);
  if (hasSubnormalInput) {
    if (hasUnknownApplicability) {
      return unknownApplicabilityFailure();
    }
    if (
      flow.dataQuality === "unknown" ||
      flow.dataQuality === "generic_typical"
    ) {
      return failure(
        "insufficient_data",
        "H-04.flow_geometry_provenance_insufficient",
        "The H-03 v/Dh evidence has unknown or generic-typical data quality.",
        "Provide a current provenance-bearing H-03 result; H-04 does not publish an assumed H-03 success.",
      );
    }
    if (
      properties.dataQuality === "unknown" ||
      properties.dataQuality === "generic_typical"
    ) {
      return failure(
        "insufficient_data",
        "H-04.property_tuple_provenance_insufficient",
        "The explicit property tuple has unknown or generic-typical data quality.",
        "Provide a provenance-bearing approved, engineering or project-specific same-state tuple; no default water constants are substituted.",
      );
    }
    return numericFailure(
      "H-04.numeric_underflow",
      "positive subnormal input boundary",
    );
  }

  const rhoV = checkedPositiveProduct(
    properties.rho.valueSi,
    flow.velocity.valueSi,
    "rho*v product",
  );
  if (!rhoV.ok) {
    return hasUnknownApplicability
      ? unknownApplicabilityFailure()
      : rhoV.failure;
  }
  const rhoVDh = checkedPositiveProduct(
    rhoV.value,
    flow.hydraulicDiameter.valueSi,
    "rho*v*Dh product",
  );
  if (!rhoVDh.ok) {
    return hasUnknownApplicability
      ? unknownApplicabilityFailure()
      : rhoVDh.failure;
  }
  const reynolds = checkedPositiveQuotient(
    rhoVDh.value,
    properties.mu.valueSi,
    "Re division",
  );
  if (!reynolds.ok) {
    return hasUnknownApplicability
      ? unknownApplicabilityFailure()
      : reynolds.failure;
  }

  const cpMu = checkedPositiveProduct(
    properties.cp.valueSi,
    properties.mu.valueSi,
    "cp*mu product",
  );
  if (!cpMu.ok) {
    return hasUnknownApplicability
      ? unknownApplicabilityFailure()
      : cpMu.failure;
  }
  const prandtl = checkedPositiveQuotient(
    cpMu.value,
    properties.kf.valueSi,
    "Pr division",
  );
  if (!prandtl.ok) {
    return hasUnknownApplicability
      ? unknownApplicabilityFailure()
      : prandtl.failure;
  }

  const Re = reynolds.value;
  const Pr = prandtl.value;

  /* Frozen numeric domain evidence precedes unrelated unknown engineering
   * state when the dimensionless groups are representable. */
  if (Re >= 2_300 && Re < 10_000) {
    const message =
      "The computed Reynolds number is inside the frozen deferred transition interval 2300<=Re<10000.";
    return failure(
      "not_applicable",
      "H-04.transition_flow_not_applicable",
      message,
      "Use a separately approved transition-flow method; H-04 does not interpolate between laminar and turbulent routes.",
      [warning(H04_WARNING_PREDICATES.transitionFlowInterpolation, message)],
    );
  }

  if (
    (route === "fully_developed_straight_round_laminar_CWT" ||
      route === "fully_developed_straight_round_laminar_CWF") &&
    Re >= 2_300
  ) {
    return failure(
      "not_applicable",
      "H-04.route_domain_not_applicable",
      "The selected laminar route requires Re<2300.",
      "Select a matching approved route without interpolation or coercion.",
    );
  }
  if (
    route === "straight_smooth_round_Gnielinski_1975" &&
    (Re < 10_000 || Re > 5_000_000 || Pr < 0.5 || Pr > 2_000)
  ) {
    return failure(
      "not_applicable",
      "H-04.route_domain_not_applicable",
      "Gnielinski requires 1e4<=Re<=5e6 and 0.5<=Pr<=2000 in the frozen project domain.",
      "Use the route only inside both frozen dimensionless domains.",
    );
  }

  if (hasUnknownApplicability) {
    return unknownApplicabilityFailure();
  }
  if (
    flow.dataQuality === "unknown" ||
    flow.dataQuality === "generic_typical"
  ) {
    return failure(
      "insufficient_data",
      "H-04.flow_geometry_provenance_insufficient",
      "The H-03 v/Dh evidence has unknown or generic-typical data quality.",
      "Provide a current provenance-bearing H-03 result; H-04 does not publish an assumed H-03 success.",
    );
  }
  if (
    properties.dataQuality === "unknown" ||
    properties.dataQuality === "generic_typical"
  ) {
    return failure(
      "insufficient_data",
      "H-04.property_tuple_provenance_insufficient",
      "The explicit property tuple has unknown or generic-typical data quality.",
      "Provide a provenance-bearing approved, engineering or project-specific same-state tuple; no default water constants are substituted.",
    );
  }

  let Nu: number;
  let gnielinskiFrictionFactor:
    | Readonly<{
        readonly availability: "available";
        readonly valueSi: number;
        readonly canonicalUnitId: "one";
      }>
    | Readonly<{
        readonly availability: "not_applicable_to_selected_laminar_route";
      }>;

  if (route === "fully_developed_straight_round_laminar_CWT") {
    Nu = 3.656;
    gnielinskiFrictionFactor = Object.freeze({
      availability: "not_applicable_to_selected_laminar_route",
    });
  } else if (route === "fully_developed_straight_round_laminar_CWF") {
    Nu = 4.364;
    gnielinskiFrictionFactor = Object.freeze({
      availability: "not_applicable_to_selected_laminar_route",
    });
  } else {
    const scaledLog = 1.82 * Math.log10(Re);
    if (!Number.isFinite(scaledLog)) {
      return numericFailure(
        "H-04.numeric_intermediate_invalid",
        "Gnielinski logarithm",
      );
    }
    const logTerm = scaledLog - 1.64;
    if (logTerm === scaledLog) {
      return numericFailure(
        "H-04.numeric_term_swallowed",
        "Gnielinski logarithmic subtraction",
      );
    }
    const logTermSquared = checkedPositiveProduct(
      logTerm,
      logTerm,
      "Gnielinski log-term square",
    );
    if (!logTermSquared.ok) return logTermSquared.failure;
    const friction = checkedPositiveQuotient(
      1,
      logTermSquared.value,
      "Gnielinski friction-factor reciprocal",
    );
    if (!friction.ok) return friction.failure;
    const fOverEight = checkedPositiveQuotient(
      friction.value,
      8,
      "Gnielinski f/8",
    );
    if (!fOverEight.ok) return fOverEight.failure;
    const reMinusThousand = Re - 1_000;
    if (reMinusThousand === Re) {
      return numericFailure(
        "H-04.numeric_term_swallowed",
        "Gnielinski Re-1000 subtraction",
      );
    }
    const firstNumerator = checkedPositiveProduct(
      fOverEight.value,
      reMinusThousand,
      "Gnielinski numerator first product",
    );
    if (!firstNumerator.ok) return firstNumerator.failure;
    const numerator = checkedPositiveProduct(
      firstNumerator.value,
      Pr,
      "Gnielinski numerator Pr product",
    );
    if (!numerator.ok) return numerator.failure;
    const prTwoThirds = Pr ** (2 / 3);
    if (!Number.isFinite(prTwoThirds) || prTwoThirds <= 0) {
      return numericFailure(
        "H-04.numeric_intermediate_invalid",
        "Gnielinski Pr^(2/3)",
      );
    }
    if (Pr !== 1 && prTwoThirds === 1) {
      return numericFailure(
        "H-04.numeric_term_swallowed",
        "Gnielinski Pr^(2/3)-1 subtraction",
      );
    }
    const prCorrection = prTwoThirds - 1;
    const sqrtTerm = Math.sqrt(fOverEight.value);
    if (!Number.isFinite(sqrtTerm) || sqrtTerm <= 0) {
      return numericFailure(
        "H-04.numeric_intermediate_invalid",
        "Gnielinski square root",
      );
    }
    const correction = 12.7 * sqrtTerm * prCorrection;
    if (!Number.isFinite(correction)) {
      return numericFailure(
        "H-04.numeric_overflow",
        "Gnielinski denominator correction",
      );
    }
    const denominator = 1 + correction;
    if (correction !== 0 && denominator === 1) {
      return numericFailure(
        "H-04.numeric_term_swallowed",
        "Gnielinski denominator addition",
      );
    }
    const validDenominator = checkedPositiveResult(
      denominator,
      "Gnielinski denominator",
    );
    if (!validDenominator.ok) return validDenominator.failure;
    const nusselt = checkedPositiveQuotient(
      numerator.value,
      validDenominator.value,
      "Gnielinski Nusselt division",
    );
    if (!nusselt.ok) return nusselt.failure;
    Nu = nusselt.value;
    gnielinskiFrictionFactor = Object.freeze({
      availability: "available",
      valueSi: friction.value,
      canonicalUnitId: "one",
    });
  }

  const nuK = checkedPositiveProduct(
    Nu,
    properties.kf.valueSi,
    "Nu*kf product",
  );
  if (!nuK.ok) return nuK.failure;
  const heatTransferCoefficient = checkedPositiveQuotient(
    nuK.value,
    flow.hydraulicDiameter.valueSi,
    "h division",
  );
  if (!heatTransferCoefficient.ok) return heatTransferCoefficient.failure;

  const controlledRoute = route as H04InternalRouteName;
  return Object.freeze({
    methodId: H04_METHOD_ID,
    methodVersion: H04_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status: "success",
    applicabilityStatus: "in_domain",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    internalRoute: Object.freeze({
      name: controlledRoute,
      registrationStatus: "internal_route_not_registered_child_method",
    }),
    value: Object.freeze({
      Re: Object.freeze({
        outputId: "Re",
        valueSi: Re,
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
      }),
      Pr: Object.freeze({
        outputId: "Pr",
        valueSi: Pr,
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
      }),
      Nu: Object.freeze({
        outputId: "Nu",
        valueSi: Nu,
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
      }),
      h: Object.freeze({
        outputId: "h",
        valueSi: heatTransferCoefficient.value,
        dimensionId: "heat_transfer_coefficient",
        canonicalUnitId: "W_per_m2_K",
        interpretation:
          "mean_internal_heat_transfer_coefficient_screening_not_hotspot_safety",
      }),
      gnielinskiFrictionFactor,
    }),
    equations: Object.freeze([
      "Re = rho * v * Dh / mu",
      "Pr = cp * mu / kf",
      "Nu_CWT = 3.656",
      "Nu_CWF = 4.364",
      "fG = (1.82 * log10(Re) - 1.64)^(-2)",
      "Nu_Gnielinski = ((fG/8)*(Re-1000)*Pr) / (1 + 12.7*sqrt(fG/8)*(Pr^(2/3)-1))",
      "h = Nu * kf / Dh",
    ] as const),
    substitution: Object.freeze({
      rhoKgPerM3: properties.rho.valueSi,
      velocityMPerS: flow.velocity.valueSi,
      hydraulicDiameterM: flow.hydraulicDiameter.valueSi,
      dynamicViscosityPaS: properties.mu.valueSi,
      specificHeatCapacityJPerKgK: properties.cp.valueSi,
      thermalConductivityWPerMK: properties.kf.valueSi,
      reynoldsNumber: Re,
      prandtlNumber: Pr,
      selectedNusseltNumber: Nu,
    }),
    inputSnapshot: Object.freeze({
      caseSnapshotId: flow.caseSnapshotId,
      geometrySnapshotId: flow.geometrySnapshotId,
      fluidStateSnapshotId: flow.fluidStateSnapshotId,
      propertyTupleSnapshotId: properties.propertyTupleSnapshotId,
      sourceResultSnapshotId: flow.sourceResultSnapshotId,
      coolantCircuitId: flow.coolantCircuitId,
      branchId: flow.branchId,
      timeBasisId: flow.timeBasisId,
    }),
    evidence: Object.freeze({ flowGeometry: flow, properties, applicability }),
    applicabilityChecks: Object.freeze([
      "straight smooth round passage",
      "hydrodynamically and thermally fully developed flow",
      "single-phase liquid at one declared bulk state",
      "no significant property variation at the selected state",
      "heat boundary matches the selected internal route",
      "route-specific Reynolds and Prandtl domain",
      "output is a mean screening coefficient, not local hotspot safety",
    ] as const),
    solverResiduals: Object.freeze({
      solverUsed: false,
      classification: "analytical_closed_form_no_iterative_solver",
    }),
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_upstream_geometry_property_precision_and_correlation_domain",
    }),
    assumptions: Object.freeze([
      "the explicit property tuple belongs to the same flow state as v and Dh",
      "H-04 does not execute or certify A-02",
      "the internal route name is not a registered child method ID",
      "the reported h is a mean straight-tube screening value",
      "helical, entrance, noncircular, two-phase and significant-property-variation routes are excluded",
    ] as const),
    sourceRefs: H04_SOURCE_REFS,
    contractSourceRefs: H04_CONTRACT_SOURCE_REFS,
    derivationRefs: H04_DERIVATION_REFS,
    validationCaseIds: H04_VALIDATION_CASE_IDS,
    methodCheckIds: H04_METHOD_CHECK_IDS,
    mapping: H04_METHOD_MAPPING,
    sourceGates: H04_CONTROLLED_SOURCE_GATES,
    implementationReadiness: H04_IMPLEMENTATION_READINESS,
    numericRepresentabilityPolicy: H04_NUMERIC_REPRESENTABILITY_POLICY,
  });
}
