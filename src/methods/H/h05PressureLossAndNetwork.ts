/**
 * H-05 Darcy pressure-loss and network parent method.
 *
 * This file intentionally implements only an isolated, non-activatable
 * straight-round, single-branch, fixed-flow partial.  The frozen registry
 * requires separately registered laminar and Colebrook child methods, but no
 * child IDs are registered.  The route names below are therefore local
 * discriminators and must never be presented as method IDs.
 *
 * C39 and NIST TN 2294 have no controlled local copies or SOURCE_MANIFEST.csv
 * rows.  Their hash and visual-review fields consequently remain null and the
 * implementation cannot be runtime activated.
 */

import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import {
  DATA_QUALITIES,
  type DataQuality,
} from "../../domain/status.js";
import {
  BracketedBisectionEvaluationError,
  BracketedBisectionInputError,
  bracketedBisection,
} from "../../numerics/bracketedBisection.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";
import { H03_METHOD_VERSION } from "./h03BranchFlowGeometry.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("H-05"));

export const H05_METHOD_ID = "H-05" as const;
export const H05_METHOD_VERSION = SPECIFICATION.methodVersion;
export const H05_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const H05_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const H05_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const H05_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const H05_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const H05_BINARY64_MIN_NORMAL = 2 ** -1022;

export const H05_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  policy: "machine_numeric_representability_only" as const,
  engineeringTolerance: false as const,
  positiveSubnormalInputPolicy: "fail_closed" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  overflowPolicy: "fail_closed" as const,
  swallowedTermPolicy: "fail_closed" as const,
  coreRounding: "none" as const,
  minimumPositiveNormal: H05_BINARY64_MIN_NORMAL,
});

export const H05_CONTROLLED_SOURCE_GATES = Object.freeze([
  Object.freeze({
    sourceRef: "C39:PP133-156" as const,
    localCopyPath: null,
    localCopySha256: null,
    sourceManifestEntry: null,
    visualPageReviewStatus: null,
    gateStatus: "blocked_local_primary_copy_missing" as const,
  }),
  Object.freeze({
    sourceRef: "NIST-TN2294:REPORT-P23" as const,
    localCopyPath: null,
    localCopySha256: null,
    sourceManifestEntry: null,
    visualPageReviewStatus: null,
    gateStatus: "blocked_local_primary_copy_missing" as const,
  }),
] as const);

export const H05_INTERNAL_ROUTE_NAMES = Object.freeze([
  "straight_round_laminar_Darcy_64_over_Re",
  "straight_round_turbulent_Colebrook_1939",
] as const);

export type H05InternalRouteName =
  (typeof H05_INTERNAL_ROUTE_NAMES)[number];

export const H05_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  registryParentRequiresSubmethodSplit: true as const,
  registeredChildMethodIds: Object.freeze([]) as readonly [],
  internalRouteNamesAreMethodIds: false as const,
  implementedScope:
    "straight_round_single_branch_fixed_flow_with_source_confirmed_absent_local_and_elevation_components" as const,
  propertyBoundary:
    "explicit upstream rho/mu tuple; H-05 does not claim or execute A-02" as const,
  networkBoundary:
    "parallel-network and pump-workpoint adapters are unavailable" as const,
  openMethodGates: Object.freeze([
    "registered_H05_child_method_ids_missing",
    "C39_local_primary_copy_and_sha256_missing",
    "NIST_TN2294_local_primary_copy_and_sha256_missing",
    "NIST_TN2294_Figure_18_digitization_pending",
    "A02_executable_property_provider_missing",
    "parameter_dictionary_dynamic_viscosity_id_missing",
    "local_loss_component_adapter_missing",
    "elevation_component_adapter_missing",
    "formal_network_topology_adapter_missing",
    "formal_pump_curve_adapter_missing",
  ] as const),
});

export const H05_PARAMETER_MAPPING = Object.freeze({
  straightLength: Object.freeze({
    contractInputId: "L" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
  hydraulicDiameter: Object.freeze({
    contractInputId: "Dh" as const,
    parameterId: "coolant.hydraulic_diameter" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
  density: Object.freeze({
    contractInputId: "rho" as const,
    dimensionId: "density" as const,
    canonicalUnitId: "kg_per_m3" as const,
  }),
  dynamicViscosity: Object.freeze({
    contractInputId: "mu" as const,
    parameterId: null,
    parameterDictionaryStatus:
      "controlled_parameter_id_missing" as const,
    dimensionId: "dynamic_viscosity" as const,
    canonicalUnitId: "Pa_s" as const,
  }),
  velocity: Object.freeze({
    contractInputId: "v" as const,
    parameterId: "water.velocity" as const,
    dimensionId: "velocity" as const,
    canonicalUnitId: "m_per_s" as const,
  }),
  absoluteRoughness: Object.freeze({
    contractInputId: "epsilon" as const,
    dimensionId: "length" as const,
    canonicalUnitId: "m" as const,
  }),
  pressureComponents: Object.freeze({
    contractOutputId: "Delta p components" as const,
    dimensionId: "pressure" as const,
    canonicalUnitId: "Pa" as const,
  }),
});

export const H05_METHOD_MAPPING = Object.freeze({
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
  sourceRefs: H05_SOURCE_REFS,
  contractSourceRefs: H05_CONTRACT_SOURCE_REFS,
  derivationRefs: H05_DERIVATION_REFS,
  validationCaseIds: H05_VALIDATION_CASE_IDS,
  methodCheckIds: H05_METHOD_CHECK_IDS,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  parameterMapping: H05_PARAMETER_MAPPING,
  sourceGates: H05_CONTROLLED_SOURCE_GATES,
  numericRepresentabilityPolicy: H05_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: H05_IMPLEMENTATION_READINESS,
});

const DARCY_FANNING_PREDICATE =
  "Darcy and Fanning factors are mixed" as const;
const ROUGHNESS_OR_K_UNKNOWN_PREDICATE =
  "roughness or local-loss coefficient is unknown" as const;
const TRANSITION_FLOW_PREDICATE = "transition flow" as const;
const HELICAL_FINAL_PREDICATE =
  "helical-pipe result is presented as final" as const;
const REACHABILITY_WITHOUT_PUMP_CURVE_PREDICATE =
  "reachability is claimed without a pump curve" as const;

function controlledWarningPredicate<TPredicate extends string>(
  predicate: TPredicate,
): TPredicate {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(
      "H-05 warning predicate is absent from the frozen contract: " +
        predicate,
    );
  }
  return predicate;
}

export const H05_WARNING_PREDICATES = Object.freeze({
  darcyFanningMix: controlledWarningPredicate(DARCY_FANNING_PREDICATE),
  roughnessOrLocalLossUnknown: controlledWarningPredicate(
    ROUGHNESS_OR_K_UNKNOWN_PREDICATE,
  ),
  transitionFlow: controlledWarningPredicate(TRANSITION_FLOW_PREDICATE),
  helicalFinal: controlledWarningPredicate(HELICAL_FINAL_PREDICATE),
  reachabilityWithoutPumpCurve: controlledWarningPredicate(
    REACHABILITY_WITHOUT_PUMP_CURVE_PREDICATE,
  ),
});

export interface H05PositiveQuantity<
  TDimension extends string,
  TUnit extends string,
> {
  readonly valueSi: number;
  readonly dimensionId: TDimension;
  readonly canonicalUnitId: TUnit;
}

export interface H05FlowGeometryEvidence {
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
  readonly coolantNetworkId: string;
  readonly branchId: string;
  readonly timeBasisId: string;
  readonly velocity: H05PositiveQuantity<"velocity", "m_per_s">;
  readonly hydraulicDiameter: H05PositiveQuantity<"length", "m">;
}

export interface H05ExplicitUpstreamPropertyTuple {
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
  readonly coolantNetworkId: string;
  readonly branchId: string;
  readonly timeBasisId: string;
  readonly temperature: H05PositiveQuantity<"absolute_temperature", "K">;
  readonly pressure: H05PositiveQuantity<"pressure", "Pa"> &
    Readonly<{ readonly pressureBasis: "absolute" }>;
  readonly phaseClassification:
    | "single_phase_liquid"
    | "two_phase_or_other"
    | "unknown_or_unconfirmed";
  readonly rho: H05PositiveQuantity<"density", "kg_per_m3">;
  readonly mu: H05PositiveQuantity<"dynamic_viscosity", "Pa_s">;
}

export interface H05StraightSegmentEvidence {
  readonly kind: "straight_segment_geometry";
  readonly sourceRef: string;
  readonly dataQuality: DataQuality;
  readonly provenanceId: string;
  readonly sourceArtifactSha256: string;
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly coolantCircuitId: string;
  readonly coolantNetworkId: string;
  readonly branchId: string;
  readonly length: H05PositiveQuantity<"length", "m">;
  readonly lengthInterpretation: "straight_centerline_length";
}

export interface H05RoughnessEvidence {
  readonly kind:
    | "actual_absolute_roughness"
    | "source_confirmed_not_applicable"
    | "unknown_or_unconfirmed";
  readonly roughnessMeaning:
    | "actual_absolute_roughness"
    | "not_applicable_to_laminar_route"
    | "unknown_or_unconfirmed";
  readonly sourceRef: string | null;
  readonly dataQuality: DataQuality | null;
  readonly provenanceId: string | null;
  readonly sourceArtifactSha256: string | null;
  readonly caseSnapshotId: string | null;
  readonly geometrySnapshotId: string | null;
  readonly coolantCircuitId: string | null;
  readonly coolantNetworkId: string | null;
  readonly branchId: string | null;
  readonly epsilon:
    | Readonly<{
        readonly valueSi: number;
        readonly dimensionId: "length";
        readonly canonicalUnitId: "m";
      }>
    | null;
}

export type H05AbsentComponentName = "local_losses" | "elevation";

export interface H05ComponentResolutionEvidence {
  readonly kind:
    | "source_confirmed_not_applicable"
    | "unknown_or_unconfirmed";
  readonly component: H05AbsentComponentName;
  readonly reasonCode:
    | "no_local_loss_components_in_declared_segment"
    | "no_elevation_change_in_declared_segment"
    | "unknown_or_unconfirmed"
    | null;
  readonly sourceRef: string | null;
  readonly dataQuality: DataQuality | null;
  readonly provenanceId: string | null;
  readonly sourceArtifactSha256: string | null;
  readonly caseSnapshotId: string | null;
  readonly geometrySnapshotId: string | null;
  readonly coolantCircuitId: string | null;
  readonly coolantNetworkId: string | null;
  readonly branchId: string | null;
}

export interface H05NetworkScopeEvidence {
  readonly kind:
    | "single_branch_fixed_flow_only"
    | "parallel_network_or_pump_workpoint_requested"
    | "unknown_or_unconfirmed";
  readonly topologyAdapterStatus:
    | "not_applicable_single_branch"
    | "missing_or_unreleased"
    | "unknown_or_unconfirmed";
  readonly pumpCurveAdapterStatus:
    | "not_applicable_single_branch"
    | "missing_or_unreleased"
    | "unknown_or_unconfirmed";
  readonly reachabilityClaimed: boolean | null;
}

export interface H05ApplicabilityEvidence {
  readonly geometryClass:
    | "straight_round_tube"
    | "helical_or_curved"
    | "noncircular"
    | "unknown_or_unconfirmed";
  readonly flowScope:
    | "single_branch_fixed_flow"
    | "parallel_network_or_pump_workpoint"
    | "unknown_or_unconfirmed";
  readonly phaseRegime:
    | "single_phase_liquid"
    | "two_phase_or_other"
    | "unknown_or_unconfirmed";
  readonly frictionFactorConvention:
    | "Darcy"
    | "Fanning"
    | "unknown_or_unconfirmed";
}

export interface H05SolverEvidence {
  readonly kind:
    | "not_applicable_to_closed_form_laminar_route"
    | "explicit_ID_NUM_01_bracketed_bisection"
    | "unknown_or_unconfirmed";
  readonly lowerBoundFD: number | null;
  readonly upperBoundFD: number | null;
  readonly residualTolerance: number | null;
  readonly bracketWidthTolerance: number | null;
  readonly maxIterations: number | null;
}

export interface H05PressureLossAndNetworkInput {
  readonly route: H05InternalRouteName | "unknown_or_unconfirmed";
  readonly flowGeometry: H05FlowGeometryEvidence;
  readonly properties: H05ExplicitUpstreamPropertyTuple;
  readonly straightSegment: H05StraightSegmentEvidence;
  readonly roughness: H05RoughnessEvidence;
  readonly localLosses: H05ComponentResolutionEvidence;
  readonly elevation: H05ComponentResolutionEvidence;
  readonly networkScope: H05NetworkScopeEvidence;
  readonly applicability: H05ApplicabilityEvidence;
  readonly solver: H05SolverEvidence;
}

export interface H05Warning {
  readonly sourceMethodId: "H-05";
  readonly predicate:
    (typeof H05_WARNING_PREDICATES)[keyof typeof H05_WARNING_PREDICATES];
  readonly message: string;
}

type H05SolverTrace =
  | Readonly<{
      readonly solverUsed: false;
      readonly algorithmId: "closed_form_fD_64_over_Re";
      readonly classification: "analytical_internal_route";
    }>
  | Readonly<{
      readonly solverUsed: true;
      readonly algorithmId: "ID-NUM-01:bracketed-bisection";
      readonly status: "converged";
      readonly iterationCount: number;
      readonly functionEvaluationCount: number;
      readonly residual: number;
      readonly residualMagnitude: number;
      readonly finalBracket: Readonly<{
        readonly lowerBound: number;
        readonly upperBound: number;
        readonly width: number;
      }>;
      readonly tolerance: Readonly<{
        readonly residualTolerance: number;
        readonly bracketWidthTolerance: number;
      }>;
      readonly terminationReason:
        | "exact_zero_at_lower_bound"
        | "exact_zero_at_upper_bound"
        | "exact_zero_at_midpoint"
        | "residual_and_bracket_tolerances_satisfied";
    }>;

export interface H05PressureLossAndNetworkSuccess {
  readonly methodId: typeof H05_METHOD_ID;
  readonly methodVersion: typeof H05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly internalRoute: Readonly<{
    readonly name: H05InternalRouteName;
    readonly registrationStatus: "internal_route_not_registered_child_method";
  }>;
  readonly value: Readonly<{
    readonly Re: Readonly<{
      readonly outputId: "Re";
      readonly valueSi: number;
      readonly dimensionId: "dimensionless";
      readonly canonicalUnitId: "one";
    }>;
    readonly frictionFactorDarcy: Readonly<{
      readonly outputId: "f_D";
      readonly valueSi: number;
      readonly dimensionId: "dimensionless";
      readonly canonicalUnitId: "one";
      readonly convention: "Darcy";
    }>;
    readonly pressureComponents: Readonly<{
      readonly straightFriction: Readonly<{
        readonly valueSi: number;
        readonly dimensionId: "pressure";
        readonly canonicalUnitId: "Pa";
      }>;
      readonly localLosses: Readonly<{
        readonly availability: "source_confirmed_not_applicable";
        readonly numericPlaceholderUsed: false;
      }>;
      readonly elevation: Readonly<{
        readonly availability: "source_confirmed_not_applicable";
        readonly numericPlaceholderUsed: false;
      }>;
      readonly total: Readonly<{
        readonly outputId: "Delta p components";
        readonly valueSi: number;
        readonly dimensionId: "pressure";
        readonly canonicalUnitId: "Pa";
        readonly composition:
          "straight_friction_only_after_local_and_elevation_confirmed_not_applicable";
      }>;
    }>;
    readonly branchFlows: Readonly<{
      readonly outputId: "branch flows";
      readonly availability: "not_evaluated_fixed_branch_flow_is_input";
    }>;
    readonly workpoint: Readonly<{
      readonly outputId: "workpoint";
      readonly availability: "not_available_single_branch_no_pump_curve_requested";
      readonly reachabilityEvaluated: false;
    }>;
  }>;
  readonly equations: readonly [
    "Re = rho * v * Dh / mu",
    "f_D = 64 / Re (Re < 2300)",
    "1/sqrt(f_D) = -2*log10(epsilon/(3.7*Dh) + 2.51/(Re*sqrt(f_D))) (Re >= 10000)",
    "Delta_p_friction = f_D * (L/Dh) * rho*v^2/2",
    "Delta_p_total = Delta_p_friction when local and elevation components are source-confirmed not applicable",
  ];
  readonly substitution: Readonly<{
    readonly densityKgPerM3: number;
    readonly velocityMPerS: number;
    readonly hydraulicDiameterM: number;
    readonly dynamicViscosityPaS: number;
    readonly straightLengthM: number;
    readonly absoluteRoughnessM: number | null;
    readonly reynoldsNumber: number;
    readonly frictionFactorDarcy: number;
    readonly lengthToDiameterRatio: number;
    readonly dynamicPressurePa: number;
    readonly straightFrictionPressureLossPa: number;
  }>;
  readonly inputSnapshot: Readonly<{
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly fluidStateSnapshotId: string;
    readonly propertyTupleSnapshotId: string;
    readonly flowResultSnapshotId: string;
    readonly coolantCircuitId: string;
    readonly coolantNetworkId: string;
    readonly branchId: string;
    readonly timeBasisId: string;
  }>;
  readonly evidence: Readonly<{
    readonly flowGeometry: Readonly<H05FlowGeometryEvidence>;
    readonly properties: Readonly<H05ExplicitUpstreamPropertyTuple>;
    readonly straightSegment: Readonly<H05StraightSegmentEvidence>;
    readonly roughness: Readonly<H05RoughnessEvidence>;
    readonly localLosses: Readonly<H05ComponentResolutionEvidence>;
    readonly elevation: Readonly<H05ComponentResolutionEvidence>;
    readonly networkScope: Readonly<H05NetworkScopeEvidence>;
    readonly applicability: Readonly<H05ApplicabilityEvidence>;
    readonly solver: Readonly<H05SolverEvidence>;
  }>;
  readonly applicabilityChecks: readonly [
    "straight round single-phase passage",
    "single declared branch with fixed mean flow",
    "Darcy friction-factor convention",
    "Re<2300 laminar or Re>=10000 Colebrook route",
    "actual absolute roughness required for Colebrook",
    "local-loss and elevation components source-confirmed not applicable",
    "parallel network and pump workpoint not evaluated",
  ];
  readonly solverResiduals: H05SolverTrace;
  readonly engineeringPrecision: Readonly<{
    readonly arithmetic: "IEEE-754_binary64";
    readonly coreRounding: "none";
    readonly precisionClaim:
      "limited_by_upstream_geometry_property_roughness_and_solver_settings";
  }>;
  readonly assumptions: readonly [
    "the explicit rho/mu tuple belongs to the same branch state as v and Dh",
    "H-05 does not execute or certify A-02",
    "the internal route name is not a registered child method ID",
    "f_D is a Darcy friction factor and is never a Fanning factor",
    "no local-loss or elevation value is silently set to zero",
    "no parallel-network reachability or pump workpoint is inferred",
  ];
  readonly sourceRefs: typeof H05_SOURCE_REFS;
  readonly contractSourceRefs: typeof H05_CONTRACT_SOURCE_REFS;
  readonly derivationRefs: typeof H05_DERIVATION_REFS;
  readonly validationCaseIds: typeof H05_VALIDATION_CASE_IDS;
  readonly methodCheckIds: typeof H05_METHOD_CHECK_IDS;
  readonly mapping: typeof H05_METHOD_MAPPING;
  readonly sourceGates: typeof H05_CONTROLLED_SOURCE_GATES;
  readonly implementationReadiness: typeof H05_IMPLEMENTATION_READINESS;
  readonly numericRepresentabilityPolicy: typeof H05_NUMERIC_REPRESENTABILITY_POLICY;
  readonly failure?: never;
}

export type H05FailureCode =
  | "H-05.input_schema_invalid"
  | "H-05.route_invalid"
  | "H-05.flow_geometry_missing"
  | "H-05.flow_geometry_schema_invalid"
  | "H-05.flow_geometry_value_invalid"
  | "H-05.flow_geometry_provenance_insufficient"
  | "H-05.property_tuple_missing"
  | "H-05.property_tuple_schema_invalid"
  | "H-05.property_tuple_value_invalid"
  | "H-05.a02_result_overclaim"
  | "H-05.straight_segment_missing"
  | "H-05.straight_segment_schema_invalid"
  | "H-05.straight_segment_value_invalid"
  | "H-05.straight_segment_provenance_insufficient"
  | "H-05.roughness_missing"
  | "H-05.roughness_schema_invalid"
  | "H-05.roughness_value_invalid"
  | "H-05.roughness_provenance_insufficient"
  | "H-05.component_resolution_missing"
  | "H-05.component_resolution_schema_invalid"
  | "H-05.component_provenance_insufficient"
  | "H-05.network_scope_missing"
  | "H-05.network_scope_schema_invalid"
  | "H-05.applicability_missing"
  | "H-05.applicability_schema_invalid"
  | "H-05.solver_settings_missing"
  | "H-05.solver_settings_schema_invalid"
  | "H-05.upstream_h03_version_mismatch"
  | "H-05.upstream_state_binding_mismatch"
  | "H-05.geometry_evidence_binding_mismatch"
  | "H-05.component_evidence_binding_mismatch"
  | "H-05.roughness_evidence_binding_mismatch"
  | "H-05.network_scope_mismatch"
  | "H-05.phase_evidence_mismatch"
  | "H-05.transition_flow_not_applicable"
  | "H-05.geometry_not_applicable"
  | "H-05.phase_not_applicable"
  | "H-05.fanning_factor_not_applicable"
  | "H-05.route_domain_not_applicable"
  | "H-05.route_unconfirmed"
  | "H-05.applicability_unconfirmed"
  | "H-05.property_tuple_provenance_insufficient"
  | "H-05.roughness_required"
  | "H-05.roughness_unconfirmed"
  | "H-05.local_loss_component_unconfirmed"
  | "H-05.elevation_component_unconfirmed"
  | "H-05.network_adapter_unavailable"
  | "H-05.reachability_claim_not_applicable"
  | "H-05.solver_route_mismatch"
  | "H-05.solver_settings_unconfirmed"
  | "H-05.solver_bracket_invalid"
  | "H-05.numeric_overflow"
  | "H-05.numeric_underflow"
  | "H-05.numeric_term_swallowed"
  | "H-05.numeric_intermediate_invalid"
  | "H-05.solver_evaluation_invalid"
  | "H-05.solver_non_converged";

export interface H05PressureLossAndNetworkFailure {
  readonly methodId: typeof H05_METHOD_ID;
  readonly methodVersion: typeof H05_METHOD_VERSION;
  readonly methodApproval: "approved_with_limitation";
  readonly status:
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable"
    | "non_converged";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly H05Warning[];
  readonly mapping: typeof H05_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: H05FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
  readonly substitution?: never;
  readonly inputSnapshot?: never;
  readonly solverResiduals?: never;
  readonly internalRoute?: never;
}

export type H05PressureLossAndNetworkOutcome =
  | H05PressureLossAndNetworkSuccess
  | H05PressureLossAndNetworkFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function warning(
  predicate: H05Warning["predicate"],
  message: string,
): H05Warning {
  return Object.freeze({ sourceMethodId: H05_METHOD_ID, predicate, message });
}

function failure(
  status: H05PressureLossAndNetworkFailure["status"],
  code: H05FailureCode,
  message: string,
  action: string,
  warnings: readonly H05Warning[] = EMPTY_WARNINGS,
): H05PressureLossAndNetworkFailure {
  return Object.freeze({
    methodId: H05_METHOD_ID,
    methodVersion: H05_METHOD_VERSION,
    methodApproval: "approved_with_limitation",
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: Object.freeze([...warnings]),
    mapping: H05_METHOD_MAPPING,
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

function isPositiveNormal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= H05_BINARY64_MIN_NORMAL
  );
}

function isNonnegativeNormalOrZero(value: unknown): value is number {
  return (
    value === 0 ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= H05_BINARY64_MIN_NORMAL)
  );
}

function readPositiveQuantity<TDimension extends string, TUnit extends string>(
  value: unknown,
  dimensionId: TDimension,
  canonicalUnitId: TUnit,
): Readonly<
  | {
      readonly ok: true;
      readonly quantity: Readonly<
        H05PositiveQuantity<TDimension, TUnit>
      >;
    }
  | { readonly ok: false }
> {
  const record = readExactPlainDataRecord(value, [
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
  ]);
  if (
    record === null ||
    !isPositiveNormal(record.valueSi) ||
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

type ReadResult<T> =
  | Readonly<{ readonly ok: true; readonly value: Readonly<T> }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H05PressureLossAndNetworkFailure;
    }>;

function readFlowGeometry(value: unknown): ReadResult<H05FlowGeometryEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.flow_geometry_missing",
        "H-05 requires one resolved H-03 v/Dh adapter.",
        "Provide a current same-branch H-03 result snapshot without placeholders.",
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
    "coolantNetworkId",
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
    !isStableIdentifier(record.coolantNetworkId) ||
    !isStableIdentifier(record.branchId) ||
    !isStableIdentifier(record.timeBasisId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.flow_geometry_schema_invalid",
        "The v/Dh evidence is not one exact provenance-bearing H-03 adapter.",
        "Provide stable IDs, content-addressed snapshots and no extra, accessor, inherited or symbol fields.",
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
        "H-05.flow_geometry_value_invalid",
        "v and Dh must be finite positive normal binary64 SI quantities.",
        "Resolve mean branch velocity in m/s and hydraulic diameter in m through H-03.",
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
      coolantNetworkId: record.coolantNetworkId,
      branchId: record.branchId,
      timeBasisId: record.timeBasisId,
      velocity: velocity.quantity,
      hydraulicDiameter: hydraulicDiameter.quantity,
    }),
  });
}

function readProperties(
  value: unknown,
): ReadResult<H05ExplicitUpstreamPropertyTuple> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.property_tuple_missing",
        "H-05 requires an explicit same-state rho/mu tuple.",
        "Resolve rho and mu upstream with state and content-addressed provenance; no default water properties are supplied.",
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
    "coolantNetworkId",
    "branchId",
    "timeBasisId",
    "temperature",
    "pressure",
    "phaseClassification",
    "rho",
    "mu",
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
    !isStableIdentifier(record.coolantNetworkId) ||
    !isStableIdentifier(record.branchId) ||
    !isStableIdentifier(record.timeBasisId) ||
    ![
      "single_phase_liquid",
      "two_phase_or_other",
      "unknown_or_unconfirmed",
    ].includes(record.phaseClassification as string)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.property_tuple_schema_invalid",
        "The rho/mu evidence is not one exact provenance-bearing upstream property tuple.",
        "Provide provider/version/artifact SHA, immutable state bindings and no extra or accessor fields.",
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
    isPositiveNormal(pressureRecord.valueSi) &&
    pressureRecord.dimensionId === "pressure" &&
    pressureRecord.canonicalUnitId === "Pa" &&
    pressureRecord.pressureBasis === "absolute";
  const rho = readPositiveQuantity(record.rho, "density", "kg_per_m3");
  const mu = readPositiveQuantity(record.mu, "dynamic_viscosity", "Pa_s");
  if (!temperature.ok || !pressureOk || !rho.ok || !mu.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.property_tuple_value_invalid",
        "The state or rho/mu tuple contains an invalid, non-SI, subnormal or non-positive quantity.",
        "Provide positive normal binary64 SI values and absolute pressure for one fluid state.",
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
      coolantNetworkId: record.coolantNetworkId,
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
    } as H05ExplicitUpstreamPropertyTuple),
  });
}

function readStraightSegment(
  value: unknown,
): ReadResult<H05StraightSegmentEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.straight_segment_missing",
        "The straight-segment length evidence is missing.",
        "Provide the actual straight centerline length from the same geometry snapshot.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceArtifactSha256",
    "caseSnapshotId",
    "geometrySnapshotId",
    "coolantCircuitId",
    "coolantNetworkId",
    "branchId",
    "length",
    "lengthInterpretation",
  ]);
  if (
    record === null ||
    record.kind !== "straight_segment_geometry" ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isSha256(record.sourceArtifactSha256) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.coolantNetworkId) ||
    !isStableIdentifier(record.branchId) ||
    record.lengthInterpretation !== "straight_centerline_length"
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.straight_segment_schema_invalid",
        "The length evidence is not one exact straight-segment geometry record.",
        "Provide content-addressed geometry provenance and a straight centerline length without extra fields.",
      ),
    });
  }
  const length = readPositiveQuantity(record.length, "length", "m");
  if (!length.ok) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.straight_segment_value_invalid",
        "L must be a finite positive normal binary64 length in metres.",
        "Provide the actual straight centerline length in canonical SI.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "straight_segment_geometry",
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      sourceArtifactSha256: record.sourceArtifactSha256,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      coolantCircuitId: record.coolantCircuitId,
      coolantNetworkId: record.coolantNetworkId,
      branchId: record.branchId,
      length: length.quantity,
      lengthInterpretation: "straight_centerline_length",
    }),
  });
}

function readRoughness(value: unknown): ReadResult<H05RoughnessEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.roughness_missing",
        "Roughness applicability evidence is missing.",
        "Provide actual absolute roughness for Colebrook or a sourced laminar not-applicable record.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "roughnessMeaning",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceArtifactSha256",
    "caseSnapshotId",
    "geometrySnapshotId",
    "coolantCircuitId",
    "coolantNetworkId",
    "branchId",
    "epsilon",
  ]);
  if (
    record === null ||
    ![
      "actual_absolute_roughness",
      "source_confirmed_not_applicable",
      "unknown_or_unconfirmed",
    ].includes(record.kind as string) ||
    ![
      "actual_absolute_roughness",
      "not_applicable_to_laminar_route",
      "unknown_or_unconfirmed",
    ].includes(record.roughnessMeaning as string)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.roughness_schema_invalid",
        "The roughness record has a missing, extra or unknown machine field.",
        "Use only actual absolute roughness, sourced laminar not-applicable, or explicit unknown evidence.",
      ),
    });
  }

  if (record.kind === "unknown_or_unconfirmed") {
    const nullFields = [
      record.sourceRef,
      record.dataQuality,
      record.provenanceId,
      record.sourceArtifactSha256,
      record.caseSnapshotId,
      record.geometrySnapshotId,
      record.coolantCircuitId,
      record.coolantNetworkId,
      record.branchId,
      record.epsilon,
    ];
    if (
      record.roughnessMeaning !== "unknown_or_unconfirmed" ||
      nullFields.some((item) => item !== null)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-05.roughness_schema_invalid",
          "Unknown roughness must not carry a value or fabricated provenance.",
          "Use null unavailable fields; never substitute zero for unknown roughness.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "unknown_or_unconfirmed",
        roughnessMeaning: "unknown_or_unconfirmed",
        sourceRef: null,
        dataQuality: null,
        provenanceId: null,
        sourceArtifactSha256: null,
        caseSnapshotId: null,
        geometrySnapshotId: null,
        coolantCircuitId: null,
        coolantNetworkId: null,
        branchId: null,
        epsilon: null,
      }),
    });
  }

  if (
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isSha256(record.sourceArtifactSha256) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.coolantNetworkId) ||
    !isStableIdentifier(record.branchId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.roughness_schema_invalid",
        "Known roughness applicability lacks immutable geometry provenance.",
        "Bind the record to the same case, geometry, circuit, network and branch with an artifact SHA.",
      ),
    });
  }

  if (record.kind === "source_confirmed_not_applicable") {
    if (
      record.roughnessMeaning !== "not_applicable_to_laminar_route" ||
      record.epsilon !== null
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-05.roughness_schema_invalid",
          "A laminar not-applicable roughness record must contain no numeric epsilon.",
          "Keep epsilon unavailable rather than storing a zero placeholder.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "source_confirmed_not_applicable",
        roughnessMeaning: "not_applicable_to_laminar_route",
        sourceRef: record.sourceRef,
        dataQuality: record.dataQuality,
        provenanceId: record.provenanceId,
        sourceArtifactSha256: record.sourceArtifactSha256,
        caseSnapshotId: record.caseSnapshotId,
        geometrySnapshotId: record.geometrySnapshotId,
        coolantCircuitId: record.coolantCircuitId,
        coolantNetworkId: record.coolantNetworkId,
        branchId: record.branchId,
        epsilon: null,
      }),
    });
  }

  const epsilonRecord = readExactPlainDataRecord(record.epsilon, [
    "valueSi",
    "dimensionId",
    "canonicalUnitId",
  ]);
  if (
    record.roughnessMeaning !== "actual_absolute_roughness" ||
    epsilonRecord === null ||
    !isNonnegativeNormalOrZero(epsilonRecord.valueSi) ||
    epsilonRecord.dimensionId !== "length" ||
    epsilonRecord.canonicalUnitId !== "m"
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.roughness_value_invalid",
        "Colebrook epsilon must be actual absolute roughness as a finite nonnegative normal-or-zero SI length.",
        "Provide sourced absolute roughness in metres; do not provide relative roughness or an unknown-as-zero placeholder.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "actual_absolute_roughness",
      roughnessMeaning: "actual_absolute_roughness",
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      sourceArtifactSha256: record.sourceArtifactSha256,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      coolantCircuitId: record.coolantCircuitId,
      coolantNetworkId: record.coolantNetworkId,
      branchId: record.branchId,
      epsilon: Object.freeze({
        valueSi: epsilonRecord.valueSi,
        dimensionId: "length",
        canonicalUnitId: "m",
      }),
    }),
  });
}

function readComponentResolution(
  value: unknown,
  expectedComponent: H05AbsentComponentName,
): ReadResult<H05ComponentResolutionEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.component_resolution_missing",
        `The ${expectedComponent} disposition is missing.`,
        "Confirm the component is not applicable from the same geometry source or keep total pressure unavailable.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "component",
    "reasonCode",
    "sourceRef",
    "dataQuality",
    "provenanceId",
    "sourceArtifactSha256",
    "caseSnapshotId",
    "geometrySnapshotId",
    "coolantCircuitId",
    "coolantNetworkId",
    "branchId",
  ]);
  if (
    record === null ||
    record.component !== expectedComponent ||
    (record.kind !== "source_confirmed_not_applicable" &&
      record.kind !== "unknown_or_unconfirmed")
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.component_resolution_schema_invalid",
        `The ${expectedComponent} record has a missing, extra or unknown field.`,
        "Use only a source-confirmed not-applicable record or an explicit unknown record; no numeric zero is accepted.",
      ),
    });
  }
  if (record.kind === "unknown_or_unconfirmed") {
    if (
      record.reasonCode !== "unknown_or_unconfirmed" ||
      [
        record.sourceRef,
        record.dataQuality,
        record.provenanceId,
        record.sourceArtifactSha256,
        record.caseSnapshotId,
        record.geometrySnapshotId,
        record.coolantCircuitId,
        record.coolantNetworkId,
        record.branchId,
      ].some((item) => item !== null)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-05.component_resolution_schema_invalid",
          `Unknown ${expectedComponent} evidence must not carry fabricated provenance.`,
          "Use null unavailable fields and never substitute a zero component.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: "unknown_or_unconfirmed",
        component: expectedComponent,
        reasonCode: "unknown_or_unconfirmed",
        sourceRef: null,
        dataQuality: null,
        provenanceId: null,
        sourceArtifactSha256: null,
        caseSnapshotId: null,
        geometrySnapshotId: null,
        coolantCircuitId: null,
        coolantNetworkId: null,
        branchId: null,
      }),
    });
  }
  const expectedReason =
    expectedComponent === "local_losses"
      ? "no_local_loss_components_in_declared_segment"
      : "no_elevation_change_in_declared_segment";
  if (
    record.reasonCode !== expectedReason ||
    !isStableIdentifier(record.sourceRef) ||
    !isDataQuality(record.dataQuality) ||
    !isStableIdentifier(record.provenanceId) ||
    !isSha256(record.sourceArtifactSha256) ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isStableIdentifier(record.coolantCircuitId) ||
    !isStableIdentifier(record.coolantNetworkId) ||
    !isStableIdentifier(record.branchId)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.component_resolution_schema_invalid",
        `The ${expectedComponent} not-applicable disposition lacks exact same-geometry provenance.`,
        "Provide the controlled reason, source artifact SHA and immutable boundary bindings.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "source_confirmed_not_applicable",
      component: expectedComponent,
      reasonCode: expectedReason,
      sourceRef: record.sourceRef,
      dataQuality: record.dataQuality,
      provenanceId: record.provenanceId,
      sourceArtifactSha256: record.sourceArtifactSha256,
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      coolantCircuitId: record.coolantCircuitId,
      coolantNetworkId: record.coolantNetworkId,
      branchId: record.branchId,
    }),
  });
}

function readNetworkScope(value: unknown): ReadResult<H05NetworkScopeEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.network_scope_missing",
        "The requested hydraulic scope is missing.",
        "Declare single-branch fixed-flow scope or retain network/workpoint outputs as unavailable.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "topologyAdapterStatus",
    "pumpCurveAdapterStatus",
    "reachabilityClaimed",
  ]);
  const enumValid =
    record !== null &&
    [
      "single_branch_fixed_flow_only",
      "parallel_network_or_pump_workpoint_requested",
      "unknown_or_unconfirmed",
    ].includes(record.kind as string) &&
    [
      "not_applicable_single_branch",
      "missing_or_unreleased",
      "unknown_or_unconfirmed",
    ].includes(record.topologyAdapterStatus as string) &&
    [
      "not_applicable_single_branch",
      "missing_or_unreleased",
      "unknown_or_unconfirmed",
    ].includes(record.pumpCurveAdapterStatus as string) &&
    (typeof record.reachabilityClaimed === "boolean" ||
      record.reachabilityClaimed === null);
  if (!enumValid || record === null) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.network_scope_schema_invalid",
        "The network-scope record contains a missing, extra or unknown machine enum.",
        "Use only the frozen isolated-scope discriminators.",
      ),
    });
  }
  const combinationValid =
    (record.kind === "single_branch_fixed_flow_only" &&
      record.topologyAdapterStatus === "not_applicable_single_branch" &&
      record.pumpCurveAdapterStatus === "not_applicable_single_branch" &&
      record.reachabilityClaimed === false) ||
    (record.kind === "parallel_network_or_pump_workpoint_requested" &&
      record.topologyAdapterStatus === "missing_or_unreleased" &&
      record.pumpCurveAdapterStatus === "missing_or_unreleased" &&
      typeof record.reachabilityClaimed === "boolean") ||
    (record.kind === "unknown_or_unconfirmed" &&
      record.topologyAdapterStatus === "unknown_or_unconfirmed" &&
      record.pumpCurveAdapterStatus === "unknown_or_unconfirmed" &&
      record.reachabilityClaimed === null);
  if (!combinationValid) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.network_scope_schema_invalid",
        "The network request contradicts its topology, pump-curve or reachability fields.",
        "Do not claim adapters or reachability that the isolated H-05 boundary cannot replay.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: record.kind,
      topologyAdapterStatus: record.topologyAdapterStatus,
      pumpCurveAdapterStatus: record.pumpCurveAdapterStatus,
      reachabilityClaimed: record.reachabilityClaimed,
    } as H05NetworkScopeEvidence),
  });
}

function readApplicability(
  value: unknown,
): ReadResult<H05ApplicabilityEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.applicability_missing",
        "H-05 applicability evidence is missing.",
        "Classify geometry, scope, phase and friction-factor convention explicitly.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "geometryClass",
    "flowScope",
    "phaseRegime",
    "frictionFactorConvention",
  ]);
  const valid =
    record !== null &&
    [
      "straight_round_tube",
      "helical_or_curved",
      "noncircular",
      "unknown_or_unconfirmed",
    ].includes(record.geometryClass as string) &&
    [
      "single_branch_fixed_flow",
      "parallel_network_or_pump_workpoint",
      "unknown_or_unconfirmed",
    ].includes(record.flowScope as string) &&
    [
      "single_phase_liquid",
      "two_phase_or_other",
      "unknown_or_unconfirmed",
    ].includes(record.phaseRegime as string) &&
    ["Darcy", "Fanning", "unknown_or_unconfirmed"].includes(
      record.frictionFactorConvention as string,
    );
  if (!valid || record === null) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.applicability_schema_invalid",
        "The applicability record contains a missing, extra or unknown machine enum.",
        "Use only the controlled H-05 geometry, scope, phase and convention values.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      geometryClass: record.geometryClass,
      flowScope: record.flowScope,
      phaseRegime: record.phaseRegime,
      frictionFactorConvention: record.frictionFactorConvention,
    } as H05ApplicabilityEvidence),
  });
}

function readSolver(value: unknown): ReadResult<H05SolverEvidence> {
  if (value === null || value === undefined) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "insufficient_data",
        "H-05.solver_settings_missing",
        "The route-specific solver disposition is missing.",
        "Declare closed-form not-applicable settings for laminar flow or every explicit bisection setting for Colebrook.",
      ),
    });
  }
  const record = readExactPlainDataRecord(value, [
    "kind",
    "lowerBoundFD",
    "upperBoundFD",
    "residualTolerance",
    "bracketWidthTolerance",
    "maxIterations",
  ]);
  if (
    record === null ||
    ![
      "not_applicable_to_closed_form_laminar_route",
      "explicit_ID_NUM_01_bracketed_bisection",
      "unknown_or_unconfirmed",
    ].includes(record.kind as string)
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.solver_settings_schema_invalid",
        "The solver record has a missing, extra or unknown field.",
        "Use one exact controlled solver disposition without hidden defaults.",
      ),
    });
  }
  if (
    record.kind === "not_applicable_to_closed_form_laminar_route" ||
    record.kind === "unknown_or_unconfirmed"
  ) {
    if (
      [
        record.lowerBoundFD,
        record.upperBoundFD,
        record.residualTolerance,
        record.bracketWidthTolerance,
        record.maxIterations,
      ].some((item) => item !== null)
    ) {
      return Object.freeze({
        ok: false,
        failure: failure(
          "invalid_input",
          "H-05.solver_settings_schema_invalid",
          "A non-numerical or unknown solver disposition must not carry hidden numerical settings.",
          "Use null settings; never preserve stale solver values.",
        ),
      });
    }
    return Object.freeze({
      ok: true,
      value: Object.freeze({
        kind: record.kind,
        lowerBoundFD: null,
        upperBoundFD: null,
        residualTolerance: null,
        bracketWidthTolerance: null,
        maxIterations: null,
      }),
    });
  }
  if (
    !isPositiveNormal(record.lowerBoundFD) ||
    !isPositiveNormal(record.upperBoundFD) ||
    !(record.upperBoundFD > record.lowerBoundFD) ||
    !isPositiveNormal(record.residualTolerance) ||
    !isPositiveNormal(record.bracketWidthTolerance) ||
    !Number.isSafeInteger(record.maxIterations) ||
    (record.maxIterations as number) < 1
  ) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.solver_settings_schema_invalid",
        "Colebrook requires an ordered positive-normal bracket, two positive-normal tolerances and a positive safe-integer iteration limit.",
        "Supply every bisection setting explicitly; H-05 has no default bracket, tolerance or iteration count.",
      ),
    });
  }
  const width = record.upperBoundFD - record.lowerBoundFD;
  if (!Number.isFinite(width) || width < H05_BINARY64_MIN_NORMAL) {
    return Object.freeze({
      ok: false,
      failure: failure(
        "invalid_input",
        "H-05.solver_settings_schema_invalid",
        "The explicit friction-factor bracket width is not a positive normal binary64 value.",
        "Provide two distinct representable bounds without relying on subnormal resolution.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "explicit_ID_NUM_01_bracketed_bisection",
      lowerBoundFD: record.lowerBoundFD,
      upperBoundFD: record.upperBoundFD,
      residualTolerance: record.residualTolerance,
      bracketWidthTolerance: record.bracketWidthTolerance,
      maxIterations: record.maxIterations as number,
    } as H05SolverEvidence),
  });
}

function sameStateBinding(
  flow: H05FlowGeometryEvidence,
  properties: H05ExplicitUpstreamPropertyTuple,
): boolean {
  return (
    flow.caseSnapshotId === properties.caseSnapshotId &&
    flow.fluidStateSnapshotId === properties.fluidStateSnapshotId &&
    flow.coolantCircuitId === properties.coolantCircuitId &&
    flow.coolantNetworkId === properties.coolantNetworkId &&
    flow.branchId === properties.branchId &&
    flow.timeBasisId === properties.timeBasisId
  );
}

interface H05BoundaryBinding {
  readonly caseSnapshotId: string | null;
  readonly geometrySnapshotId: string | null;
  readonly coolantCircuitId: string | null;
  readonly coolantNetworkId: string | null;
  readonly branchId: string | null;
}

function sameGeometryBoundary(
  flow: H05FlowGeometryEvidence,
  evidence: H05BoundaryBinding,
): boolean {
  return (
    evidence.caseSnapshotId === flow.caseSnapshotId &&
    evidence.geometrySnapshotId === flow.geometrySnapshotId &&
    evidence.coolantCircuitId === flow.coolantCircuitId &&
    evidence.coolantNetworkId === flow.coolantNetworkId &&
    evidence.branchId === flow.branchId
  );
}

function numericFailure(
  code:
    | "H-05.numeric_overflow"
    | "H-05.numeric_underflow"
    | "H-05.numeric_term_swallowed"
    | "H-05.numeric_intermediate_invalid"
    | "H-05.solver_evaluation_invalid",
  operation: string,
): H05PressureLossAndNetworkFailure {
  return failure(
    "invalid_input",
    code,
    "Binary64 cannot represent the H-05 " + operation + " reliably.",
    "Rescale the physical problem or use a higher-precision reviewed implementation; no rounded, zero or last-iteration value is returned.",
  );
}

type NumericResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H05PressureLossAndNetworkFailure;
    }>;

function checkedPositive(value: number, operation: string): NumericResult {
  if (!Number.isFinite(value)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_overflow", operation),
    });
  }
  if (value === 0 || (value > 0 && value < H05_BINARY64_MIN_NORMAL)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_underflow", operation),
    });
  }
  if (value < 0) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_intermediate_invalid", operation),
    });
  }
  return Object.freeze({ ok: true, value });
}

function checkedNonnegative(
  value: number,
  operation: string,
): NumericResult {
  if (!Number.isFinite(value)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_overflow", operation),
    });
  }
  if (value < 0) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_intermediate_invalid", operation),
    });
  }
  if (value > 0 && value < H05_BINARY64_MIN_NORMAL) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_underflow", operation),
    });
  }
  return Object.freeze({ ok: true, value });
}

function checkedPositiveProduct(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const checked = checkedPositive(left * right, operation);
  if (!checked.ok) return checked;
  if (
    (right !== 1 && checked.value === left) ||
    (left !== 1 && checked.value === right)
  ) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-05.numeric_term_swallowed",
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
  const checked = checkedPositive(numerator / denominator, operation);
  if (!checked.ok) return checked;
  if (denominator !== 1 && checked.value === numerator) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-05.numeric_term_swallowed",
        operation + " non-unit divisor",
      ),
    });
  }
  return checked;
}

function checkedNonnegativeQuotient(
  numerator: number,
  denominator: number,
  operation: string,
): NumericResult {
  const checked = checkedNonnegative(numerator / denominator, operation);
  if (!checked.ok) return checked;
  if (
    numerator !== 0 &&
    denominator !== 1 &&
    checked.value === numerator
  ) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-05.numeric_term_swallowed",
        operation + " non-unit divisor",
      ),
    });
  }
  return checked;
}

function checkedPositiveSum(
  left: number,
  right: number,
  operation: string,
): NumericResult {
  const result = left + right;
  const checked = checkedPositive(result, operation);
  if (!checked.ok) return checked;
  if (
    (left !== 0 && result === right) ||
    (right !== 0 && result === left)
  ) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_term_swallowed", operation),
    });
  }
  return checked;
}

type ResidualResult =
  | Readonly<{ readonly ok: true; readonly value: number }>
  | Readonly<{
      readonly ok: false;
      readonly failure: H05PressureLossAndNetworkFailure;
    }>;

function colebrookResidual(
  frictionFactorDarcy: number,
  reynoldsNumber: number,
  absoluteRoughnessM: number,
  hydraulicDiameterM: number,
): ResidualResult {
  const sqrtF = checkedPositive(
    Math.sqrt(frictionFactorDarcy),
    "Colebrook sqrt(f_D)",
  );
  if (!sqrtF.ok) return sqrtF;
  const inverseSqrt = checkedPositiveQuotient(
    1,
    sqrtF.value,
    "Colebrook 1/sqrt(f_D)",
  );
  if (!inverseSqrt.ok) return inverseSqrt;
  const threePointSevenDh = checkedPositiveProduct(
    3.7,
    hydraulicDiameterM,
    "Colebrook 3.7*Dh product",
  );
  if (!threePointSevenDh.ok) return threePointSevenDh;
  const relativeRoughnessTerm = checkedNonnegativeQuotient(
    absoluteRoughnessM,
    threePointSevenDh.value,
    "Colebrook epsilon/(3.7*Dh) division",
  );
  if (!relativeRoughnessTerm.ok) return relativeRoughnessTerm;
  const reSqrtF = checkedPositiveProduct(
    reynoldsNumber,
    sqrtF.value,
    "Colebrook Re*sqrt(f_D) product",
  );
  if (!reSqrtF.ok) return reSqrtF;
  const viscousTerm = checkedPositiveQuotient(
    2.51,
    reSqrtF.value,
    "Colebrook 2.51/(Re*sqrt(f_D)) division",
  );
  if (!viscousTerm.ok) return viscousTerm;
  const logArgument = checkedPositiveSum(
    relativeRoughnessTerm.value,
    viscousTerm.value,
    "Colebrook logarithm-argument addition",
  );
  if (!logArgument.ok) return logArgument;
  const logarithm = Math.log10(logArgument.value);
  if (!Number.isFinite(logarithm)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-05.numeric_intermediate_invalid",
        "Colebrook log10 argument",
      ),
    });
  }
  const doubledLogarithm = 2 * logarithm;
  if (!Number.isFinite(doubledLogarithm)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_overflow", "Colebrook 2*log10 term"),
    });
  }
  const residual = inverseSqrt.value + doubledLogarithm;
  if (!Number.isFinite(residual)) {
    return Object.freeze({
      ok: false,
      failure: numericFailure("H-05.numeric_overflow", "Colebrook residual addition"),
    });
  }
  if (
    (inverseSqrt.value !== 0 && residual === doubledLogarithm) ||
    (doubledLogarithm !== 0 && residual === inverseSqrt.value)
  ) {
    return Object.freeze({
      ok: false,
      failure: numericFailure(
        "H-05.numeric_term_swallowed",
        "Colebrook residual addition",
      ),
    });
  }
  return Object.freeze({ ok: true, value: residual });
}

/** Evaluate only the frozen isolated H-05 straight single-branch partial. */
export function evaluateH05PressureLossAndNetwork(
  input: H05PressureLossAndNetworkInput,
): H05PressureLossAndNetworkOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "route",
    "flowGeometry",
    "properties",
    "straightSegment",
    "roughness",
    "localLosses",
    "elevation",
    "networkScope",
    "applicability",
    "solver",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "H-05.input_schema_invalid",
      "H-05 input must be one exact controlled plain-data record.",
      "Provide only the ten controlled H-05 fields without missing, extra, inherited, accessor or symbol fields.",
    );
  }

  const route = controlledInput.route;
  const routeValid =
    route === "unknown_or_unconfirmed" ||
    (H05_INTERNAL_ROUTE_NAMES as readonly unknown[]).includes(route);
  const flowResult = readFlowGeometry(controlledInput.flowGeometry);
  const propertyResult = readProperties(controlledInput.properties);
  const segmentResult = readStraightSegment(controlledInput.straightSegment);
  const roughnessResult = readRoughness(controlledInput.roughness);
  const localLossResult = readComponentResolution(
    controlledInput.localLosses,
    "local_losses",
  );
  const elevationResult = readComponentResolution(
    controlledInput.elevation,
    "elevation",
  );
  const networkResult = readNetworkScope(controlledInput.networkScope);
  const applicabilityResult = readApplicability(controlledInput.applicability);
  const solverResult = readSolver(controlledInput.solver);

  /* Inspect every schema before any engineering disposition so a later hostile
   * object outranks an earlier unknown or out-of-domain value. */
  if (!routeValid) {
    return failure(
      "invalid_input",
      "H-05.route_invalid",
      "The requested H-05 route is not a frozen internal route name.",
      "Use one of the two internal discriminators; neither is a registered child method ID.",
    );
  }
  for (const result of [
    flowResult,
    propertyResult,
    segmentResult,
    roughnessResult,
    localLossResult,
    elevationResult,
    networkResult,
    applicabilityResult,
    solverResult,
  ]) {
    if (!result.ok && result.failure.status === "invalid_input") {
      return result.failure;
    }
  }
  if (!flowResult.ok) return flowResult.failure;
  if (!propertyResult.ok) return propertyResult.failure;
  if (!segmentResult.ok) return segmentResult.failure;
  if (!roughnessResult.ok) return roughnessResult.failure;
  if (!localLossResult.ok) return localLossResult.failure;
  if (!elevationResult.ok) return elevationResult.failure;
  if (!networkResult.ok) return networkResult.failure;
  if (!applicabilityResult.ok) return applicabilityResult.failure;
  if (!solverResult.ok) return solverResult.failure;

  const flow = flowResult.value;
  const properties = propertyResult.value;
  const straightSegment = segmentResult.value;
  const roughness = roughnessResult.value;
  const localLosses = localLossResult.value;
  const elevation = elevationResult.value;
  const networkScope = networkResult.value;
  const applicability = applicabilityResult.value;
  const solver = solverResult.value;

  if (properties.a02ResultClaimed !== false) {
    return failure(
      "invalid_input",
      "H-05.a02_result_overclaim",
      "The tuple claims an A-02 result even though H-05 cannot replay an executable A-02 provider chain.",
      "Set a02ResultClaimed=false and retain explicit upstream tuple provenance until A-02 is released.",
    );
  }
  if (flow.sourceMethodVersion !== H03_METHOD_VERSION) {
    return failure(
      "insufficient_data",
      "H-05.upstream_h03_version_mismatch",
      "The v/Dh adapter does not match the current H-03 model version.",
      "Re-evaluate H-03 and bind the current immutable result snapshot.",
    );
  }
  if (!sameStateBinding(flow, properties)) {
    return failure(
      "invalid_input",
      "H-05.upstream_state_binding_mismatch",
      "v, Dh, rho and mu do not share one case, circuit, network, branch, fluid state and time basis.",
      "Bind all flow and fluid properties to the same immutable branch state.",
    );
  }
  if (!sameGeometryBoundary(flow, straightSegment)) {
    return failure(
      "invalid_input",
      "H-05.geometry_evidence_binding_mismatch",
      "The straight length does not belong to the same case and branch geometry as v and Dh.",
      "Use one content-addressed geometry snapshot for L, v and Dh.",
    );
  }
  if (
    (localLosses.kind === "source_confirmed_not_applicable" &&
      !sameGeometryBoundary(flow, localLosses)) ||
    (elevation.kind === "source_confirmed_not_applicable" &&
      !sameGeometryBoundary(flow, elevation))
  ) {
    return failure(
      "invalid_input",
      "H-05.component_evidence_binding_mismatch",
      "A component not-applicable record belongs to a different case or branch geometry.",
      "Resolve local-loss and elevation applicability against the same immutable segment boundary.",
    );
  }
  if (
    roughness.kind !== "unknown_or_unconfirmed" &&
    !sameGeometryBoundary(flow, roughness)
  ) {
    return failure(
      "invalid_input",
      "H-05.roughness_evidence_binding_mismatch",
      "The roughness evidence belongs to a different case or branch geometry.",
      "Bind actual roughness or its laminar disposition to the same immutable segment geometry.",
    );
  }
  if (
    properties.phaseClassification !== "unknown_or_unconfirmed" &&
    applicability.phaseRegime !== "unknown_or_unconfirmed" &&
    properties.phaseClassification !== applicability.phaseRegime
  ) {
    return failure(
      "invalid_input",
      "H-05.phase_evidence_mismatch",
      "The property tuple and applicability record give contradictory phase classifications.",
      "Resolve one same-state phase classification; do not select the more convenient record.",
    );
  }

  if (
    (networkScope.kind === "single_branch_fixed_flow_only" &&
      applicability.flowScope === "parallel_network_or_pump_workpoint") ||
    (networkScope.kind === "parallel_network_or_pump_workpoint_requested" &&
      applicability.flowScope === "single_branch_fixed_flow")
  ) {
    return failure(
      "invalid_input",
      "H-05.network_scope_mismatch",
      "The network request and applicability record describe contradictory hydraulic scopes.",
      "Resolve one fixed-branch or network/workpoint request before evaluation.",
    );
  }

  /* Known categorical exclusions do not require Reynolds arithmetic and must
   * not be masked by an unrelated machine-representability failure. */
  if (applicability.geometryClass === "helical_or_curved") {
    const message =
      "Helical or curved-passage pressure loss is deferred and cannot be presented as the straight-pipe final result.";
    return failure(
      "not_applicable",
      "H-05.geometry_not_applicable",
      message,
      "Use a separately approved helical correction and topology model.",
      [warning(H05_WARNING_PREDICATES.helicalFinal, message)],
    );
  }
  if (applicability.geometryClass === "noncircular") {
    return failure(
      "not_applicable",
      "H-05.geometry_not_applicable",
      "A noncircular passage is outside the isolated straight-round route.",
      "Use a separately approved geometry-specific pressure-loss method.",
    );
  }
  if (
    properties.phaseClassification === "two_phase_or_other" ||
    applicability.phaseRegime === "two_phase_or_other"
  ) {
    return failure(
      "not_applicable",
      "H-05.phase_not_applicable",
      "Two-phase or non-liquid flow is outside this single-phase pressure-loss route.",
      "Resolve an approved multiphase method; do not apply the single-phase Darcy route.",
    );
  }
  if (applicability.frictionFactorConvention === "Fanning") {
    const message =
      "The supplied convention is Fanning while the frozen H-05 equations require Darcy f_D.";
    return failure(
      "not_applicable",
      "H-05.fanning_factor_not_applicable",
      message,
      "Convert through an explicit sourced factor-of-four boundary before invoking H-05; this method never silently converts conventions.",
      [warning(H05_WARNING_PREDICATES.darcyFanningMix, message)],
    );
  }

  /* A matched network/workpoint request cannot consume this isolated fixed-
   * branch Reynolds route.  Dispose it before performing unused arithmetic. */
  if (networkScope.reachabilityClaimed === true) {
    const message =
      "Network or pump reachability is claimed without a replayable topology and pump-curve adapter.";
    return failure(
      "not_applicable",
      "H-05.reachability_claim_not_applicable",
      message,
      "Remove the reachability claim and provide a future formal topology/pump-curve adapter before solving a workpoint.",
      [warning(H05_WARNING_PREDICATES.reachabilityWithoutPumpCurve, message)],
    );
  }
  if (
    networkScope.kind === "parallel_network_or_pump_workpoint_requested" ||
    applicability.flowScope === "parallel_network_or_pump_workpoint"
  ) {
    return failure(
      "insufficient_data",
      "H-05.network_adapter_unavailable",
      "Parallel branch flows and pump workpoint cannot be solved without released topology and pump-curve adapters.",
      "Provide formal versioned topology, component and pump-curve evidence in a future registered route; do not infer equal flow or reachability.",
    );
  }

  const hasUnknownApplicability =
    route === "unknown_or_unconfirmed" ||
    properties.phaseClassification === "unknown_or_unconfirmed" ||
    networkScope.kind === "unknown_or_unconfirmed" ||
    applicability.geometryClass === "unknown_or_unconfirmed" ||
    applicability.flowScope === "unknown_or_unconfirmed" ||
    applicability.phaseRegime === "unknown_or_unconfirmed" ||
    applicability.frictionFactorConvention === "unknown_or_unconfirmed";
  const unknownApplicabilityFailure = () =>
    failure(
      "insufficient_data",
      route === "unknown_or_unconfirmed"
        ? "H-05.route_unconfirmed"
        : "H-05.applicability_unconfirmed",
      "At least one H-05 route, scope, geometry, phase or convention discriminator is unknown.",
      "Resolve every applicability discriminator without inference before relying on machine arithmetic.",
    );

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
  const Re = reynolds.value;

  if (Re >= 2_300 && Re < 10_000) {
    const message =
      "The computed Reynolds number is inside the frozen deferred interval 2300<=Re<10000.";
    return failure(
      "not_applicable",
      "H-05.transition_flow_not_applicable",
      message,
      "Use a separately approved transition-flow method; H-05 does not interpolate or select a friction factor in this interval.",
      [warning(H05_WARNING_PREDICATES.transitionFlow, message)],
    );
  }
  if (
    (route === "straight_round_laminar_Darcy_64_over_Re" && Re >= 2_300) ||
    (route === "straight_round_turbulent_Colebrook_1939" && Re < 10_000)
  ) {
    return failure(
      "not_applicable",
      "H-05.route_domain_not_applicable",
      "The selected internal friction route does not match the computed Reynolds domain.",
      "Select laminar only for Re<2300 and Colebrook only for Re>=10000.",
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
      "H-05.flow_geometry_provenance_insufficient",
      "The H-03 v/Dh adapter has unknown or generic-typical data quality.",
      "Provide a current provenance-bearing H-03 result; H-05 does not publish an assumed upstream success.",
    );
  }
  if (
    properties.dataQuality === "unknown" ||
    properties.dataQuality === "generic_typical"
  ) {
    return failure(
      "insufficient_data",
      "H-05.property_tuple_provenance_insufficient",
      "The rho/mu tuple has unknown or generic-typical data quality.",
      "Provide a provenance-bearing same-state project, measured, approved or engineering reference tuple; no default water constants are substituted.",
    );
  }
  if (
    straightSegment.dataQuality === "unknown" ||
    straightSegment.dataQuality === "generic_typical"
  ) {
    return failure(
      "insufficient_data",
      "H-05.straight_segment_provenance_insufficient",
      "The straight-segment geometry has unknown or generic-typical data quality.",
      "Provide a project, measured, approved or engineering geometry source with an artifact SHA.",
    );
  }
  if (
    roughness.kind !== "unknown_or_unconfirmed" &&
    (roughness.dataQuality === "unknown" ||
      roughness.dataQuality === "generic_typical")
  ) {
    return failure(
      "insufficient_data",
      "H-05.roughness_provenance_insufficient",
      "The roughness disposition has unknown or generic-typical data quality.",
      "Provide actual project/source roughness or a controlled laminar applicability disposition; do not use a typical aged-pipe value.",
    );
  }
  if (
    (localLosses.kind === "source_confirmed_not_applicable" &&
      (localLosses.dataQuality === "unknown" ||
        localLosses.dataQuality === "generic_typical")) ||
    (elevation.kind === "source_confirmed_not_applicable" &&
      (elevation.dataQuality === "unknown" ||
        elevation.dataQuality === "generic_typical"))
  ) {
    return failure(
      "insufficient_data",
      "H-05.component_provenance_insufficient",
      "A not-applicable pressure component is supported only by unknown or generic-typical evidence.",
      "Confirm the actual declared segment has no local component or elevation change from a content-addressed project source.",
    );
  }
  if (localLosses.kind === "unknown_or_unconfirmed") {
    const message =
      "Local-loss applicability is unknown, so total pressure loss cannot be closed.";
    return failure(
      "insufficient_data",
      "H-05.local_loss_component_unconfirmed",
      message,
      "Resolve every local component with a future coefficient adapter or prove none exists in the declared segment; never fill sumK with zero.",
      [warning(H05_WARNING_PREDICATES.roughnessOrLocalLossUnknown, message)],
    );
  }
  if (elevation.kind === "unknown_or_unconfirmed") {
    return failure(
      "insufficient_data",
      "H-05.elevation_component_unconfirmed",
      "Elevation applicability is unknown, so total pressure loss cannot be closed.",
      "Resolve the branch elevation boundary or prove no elevation change exists; never fill Delta z with zero.",
    );
  }

  let frictionFactorDarcy: number;
  let solverTrace: H05SolverTrace;
  let absoluteRoughnessM: number | null = null;

  if (route === "straight_round_laminar_Darcy_64_over_Re") {
    if (solver.kind !== "not_applicable_to_closed_form_laminar_route") {
      return failure(
        solver.kind === "unknown_or_unconfirmed"
          ? "insufficient_data"
          : "invalid_input",
        solver.kind === "unknown_or_unconfirmed"
          ? "H-05.solver_settings_unconfirmed"
          : "H-05.solver_route_mismatch",
        "The laminar closed-form route must carry an explicit no-solver disposition.",
        "Remove stale bisection settings and mark the solver not applicable to this route.",
      );
    }
    if (roughness.kind === "unknown_or_unconfirmed") {
      return failure(
        "insufficient_data",
        "H-05.roughness_unconfirmed",
        "Roughness applicability is unknown even though the laminar route does not consume epsilon.",
        "Provide a sourced not-applicable disposition; do not use unknown-as-zero.",
      );
    }
    const friction = checkedPositiveQuotient(
      64,
      Re,
      "laminar f_D=64/Re division",
    );
    if (!friction.ok) return friction.failure;
    frictionFactorDarcy = friction.value;
    solverTrace = Object.freeze({
      solverUsed: false,
      algorithmId: "closed_form_fD_64_over_Re",
      classification: "analytical_internal_route",
    });
  } else {
    if (roughness.kind === "source_confirmed_not_applicable") {
      return failure(
        "insufficient_data",
        "H-05.roughness_required",
        "Colebrook requires actual absolute roughness; a laminar not-applicable disposition is insufficient.",
        "Provide sourced epsilon in metres from the same geometry snapshot.",
      );
    }
    if (roughness.kind === "unknown_or_unconfirmed") {
      const message =
        "Actual absolute roughness is unknown, so the turbulent Colebrook route is unavailable.";
      return failure(
        "insufficient_data",
        "H-05.roughness_unconfirmed",
        message,
        "Provide sourced actual absolute roughness; never substitute zero or an aged-pipe guess.",
        [warning(H05_WARNING_PREDICATES.roughnessOrLocalLossUnknown, message)],
      );
    }
    if (solver.kind === "unknown_or_unconfirmed") {
      return failure(
        "insufficient_data",
        "H-05.solver_settings_unconfirmed",
        "Colebrook bisection settings are unknown.",
        "Provide the bracket, both tolerances and maxIterations explicitly; H-05 has no defaults.",
      );
    }
    if (solver.kind !== "explicit_ID_NUM_01_bracketed_bisection") {
      return failure(
        "invalid_input",
        "H-05.solver_route_mismatch",
        "The Colebrook route cannot use a no-solver disposition.",
        "Provide explicit ID-NUM-01 bracketed-bisection settings.",
      );
    }
    absoluteRoughnessM = roughness.epsilon?.valueSi ?? null;
    if (absoluteRoughnessM === null) {
      return failure(
        "invalid_input",
        "H-05.roughness_value_invalid",
        "The validated actual-roughness record unexpectedly lacks epsilon.",
        "Rebuild the controlled roughness record; no value is inferred.",
      );
    }
    let evaluatorFailure: H05PressureLossAndNetworkFailure | null = null;
    let solved: ReturnType<typeof bracketedBisection>;
    try {
      solved = bracketedBisection({
        evaluate: (candidateFD) => {
          const residual = colebrookResidual(
            candidateFD,
            Re,
            absoluteRoughnessM as number,
            flow.hydraulicDiameter.valueSi,
          );
          if (!residual.ok) {
            evaluatorFailure = residual.failure;
            throw new Error("H-05 Colebrook numeric gate");
          }
          return residual.value;
        },
        lowerBound: solver.lowerBoundFD as number,
        upperBound: solver.upperBoundFD as number,
        residualTolerance: solver.residualTolerance as number,
        bracketWidthTolerance: solver.bracketWidthTolerance as number,
        maxIterations: solver.maxIterations as number,
      });
    } catch (cause) {
      if (evaluatorFailure !== null) return evaluatorFailure;
      if (
        cause instanceof BracketedBisectionInputError ||
        cause instanceof BracketedBisectionEvaluationError
      ) {
        return numericFailure(
          "H-05.solver_evaluation_invalid",
          "Colebrook bracket or residual evaluation",
        );
      }
      return numericFailure(
        "H-05.solver_evaluation_invalid",
        "Colebrook solver boundary",
      );
    }
    if (solved.status === "invalid_bracket") {
      return failure(
        "invalid_input",
        "H-05.solver_bracket_invalid",
        "The explicit friction-factor endpoints do not prove a Colebrook sign-changing bracket.",
        "Select and justify a finite positive physical bracket; do not publish a midpoint or relabel this as non-convergence.",
      );
    }
    if (solved.status === "non_converged") {
      return failure(
        "non_converged",
        "H-05.solver_non_converged",
        "The proven Colebrook bracket did not meet both explicit tolerances.",
        "Review the explicit solver settings and rerun; no last iteration value is returned.",
      );
    }
    const finalFriction = checkedPositive(
      solved.root,
      "converged Colebrook friction factor",
    );
    if (!finalFriction.ok) return finalFriction.failure;
    frictionFactorDarcy = finalFriction.value;
    solverTrace = Object.freeze({
      solverUsed: true,
      algorithmId: solved.algorithmId,
      status: solved.status,
      iterationCount: solved.iterationCount,
      functionEvaluationCount: solved.functionEvaluationCount,
      residual: solved.residual,
      residualMagnitude: solved.residualMagnitude,
      finalBracket: solved.finalBracket,
      tolerance: solved.tolerance,
      terminationReason: solved.terminationReason,
    });
  }

  const lengthToDiameter = checkedPositiveQuotient(
    straightSegment.length.valueSi,
    flow.hydraulicDiameter.valueSi,
    "L/Dh division",
  );
  if (!lengthToDiameter.ok) return lengthToDiameter.failure;
  const velocitySquared = checkedPositiveProduct(
    flow.velocity.valueSi,
    flow.velocity.valueSi,
    "v^2 product",
  );
  if (!velocitySquared.ok) return velocitySquared.failure;
  const rhoVelocitySquared = checkedPositiveProduct(
    properties.rho.valueSi,
    velocitySquared.value,
    "rho*v^2 product",
  );
  if (!rhoVelocitySquared.ok) return rhoVelocitySquared.failure;
  const dynamicPressure = checkedPositiveQuotient(
    rhoVelocitySquared.value,
    2,
    "rho*v^2/2 division",
  );
  if (!dynamicPressure.ok) return dynamicPressure.failure;
  const frictionLengthFactor = checkedPositiveProduct(
    frictionFactorDarcy,
    lengthToDiameter.value,
    "f_D*(L/Dh) product",
  );
  if (!frictionLengthFactor.ok) return frictionLengthFactor.failure;
  const pressureLoss = checkedPositiveProduct(
    frictionLengthFactor.value,
    dynamicPressure.value,
    "straight friction pressure-loss product",
  );
  if (!pressureLoss.ok) return pressureLoss.failure;

  const controlledRoute = route as H05InternalRouteName;
  return Object.freeze({
    methodId: H05_METHOD_ID,
    methodVersion: H05_METHOD_VERSION,
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
      frictionFactorDarcy: Object.freeze({
        outputId: "f_D",
        valueSi: frictionFactorDarcy,
        dimensionId: "dimensionless",
        canonicalUnitId: "one",
        convention: "Darcy",
      }),
      pressureComponents: Object.freeze({
        straightFriction: Object.freeze({
          valueSi: pressureLoss.value,
          dimensionId: "pressure",
          canonicalUnitId: "Pa",
        }),
        localLosses: Object.freeze({
          availability: "source_confirmed_not_applicable",
          numericPlaceholderUsed: false,
        }),
        elevation: Object.freeze({
          availability: "source_confirmed_not_applicable",
          numericPlaceholderUsed: false,
        }),
        total: Object.freeze({
          outputId: "Delta p components",
          valueSi: pressureLoss.value,
          dimensionId: "pressure",
          canonicalUnitId: "Pa",
          composition:
            "straight_friction_only_after_local_and_elevation_confirmed_not_applicable",
        }),
      }),
      branchFlows: Object.freeze({
        outputId: "branch flows",
        availability: "not_evaluated_fixed_branch_flow_is_input",
      }),
      workpoint: Object.freeze({
        outputId: "workpoint",
        availability: "not_available_single_branch_no_pump_curve_requested",
        reachabilityEvaluated: false,
      }),
    }),
    equations: Object.freeze([
      "Re = rho * v * Dh / mu",
      "f_D = 64 / Re (Re < 2300)",
      "1/sqrt(f_D) = -2*log10(epsilon/(3.7*Dh) + 2.51/(Re*sqrt(f_D))) (Re >= 10000)",
      "Delta_p_friction = f_D * (L/Dh) * rho*v^2/2",
      "Delta_p_total = Delta_p_friction when local and elevation components are source-confirmed not applicable",
    ] as const),
    substitution: Object.freeze({
      densityKgPerM3: properties.rho.valueSi,
      velocityMPerS: flow.velocity.valueSi,
      hydraulicDiameterM: flow.hydraulicDiameter.valueSi,
      dynamicViscosityPaS: properties.mu.valueSi,
      straightLengthM: straightSegment.length.valueSi,
      absoluteRoughnessM,
      reynoldsNumber: Re,
      frictionFactorDarcy,
      lengthToDiameterRatio: lengthToDiameter.value,
      dynamicPressurePa: dynamicPressure.value,
      straightFrictionPressureLossPa: pressureLoss.value,
    }),
    inputSnapshot: Object.freeze({
      caseSnapshotId: flow.caseSnapshotId,
      geometrySnapshotId: flow.geometrySnapshotId,
      fluidStateSnapshotId: flow.fluidStateSnapshotId,
      propertyTupleSnapshotId: properties.propertyTupleSnapshotId,
      flowResultSnapshotId: flow.sourceResultSnapshotId,
      coolantCircuitId: flow.coolantCircuitId,
      coolantNetworkId: flow.coolantNetworkId,
      branchId: flow.branchId,
      timeBasisId: flow.timeBasisId,
    }),
    evidence: Object.freeze({
      flowGeometry: flow,
      properties,
      straightSegment,
      roughness,
      localLosses,
      elevation,
      networkScope,
      applicability,
      solver,
    }),
    applicabilityChecks: Object.freeze([
      "straight round single-phase passage",
      "single declared branch with fixed mean flow",
      "Darcy friction-factor convention",
      "Re<2300 laminar or Re>=10000 Colebrook route",
      "actual absolute roughness required for Colebrook",
      "local-loss and elevation components source-confirmed not applicable",
      "parallel network and pump workpoint not evaluated",
    ] as const),
    solverResiduals: solverTrace,
    engineeringPrecision: Object.freeze({
      arithmetic: "IEEE-754_binary64",
      coreRounding: "none",
      precisionClaim:
        "limited_by_upstream_geometry_property_roughness_and_solver_settings",
    }),
    assumptions: Object.freeze([
      "the explicit rho/mu tuple belongs to the same branch state as v and Dh",
      "H-05 does not execute or certify A-02",
      "the internal route name is not a registered child method ID",
      "f_D is a Darcy friction factor and is never a Fanning factor",
      "no local-loss or elevation value is silently set to zero",
      "no parallel-network reachability or pump workpoint is inferred",
    ] as const),
    sourceRefs: H05_SOURCE_REFS,
    contractSourceRefs: H05_CONTRACT_SOURCE_REFS,
    derivationRefs: H05_DERIVATION_REFS,
    validationCaseIds: H05_VALIDATION_CASE_IDS,
    methodCheckIds: H05_METHOD_CHECK_IDS,
    mapping: H05_METHOD_MAPPING,
    sourceGates: H05_CONTROLLED_SOURCE_GATES,
    implementationReadiness: H05_IMPLEMENTATION_READINESS,
    numericRepresentabilityPolicy: H05_NUMERIC_REPRESENTABILITY_POLICY,
  });
}
