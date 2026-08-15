/**
 * J-01 isolated cylindrical radial-conduction family implementation.
 *
 * The frozen parent requires registered child methods, but no child IDs exist.
 * Therefore this file is directly testable and deliberately not runtime
 * activatable. It evaluates only the two fully closed constant-property routes.
 */

import { isWithinTolId, TOL_ID } from "../../config/tolerances.js";
import {
  isContentAddressedSnapshotId,
  methodId,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-01"));

export const J01_METHOD_ID = "J-01" as const;
export const J01_METHOD_VERSION = SPECIFICATION.methodVersion;
export const J01_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const J01_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const J01_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const J01_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const J01_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

/** IEEE-754 machine boundary only; never an engineering/domain threshold. */
export const J01_BINARY64_MIN_NORMAL = 2 ** -1022;

/** Hostile-input allocation ceiling only; never a physical layer-count limit. */
export const J01_MAX_LAYER_RECORDS = 4_096;

export const J01_GB8175_CONTROLLED_SOURCE = Object.freeze({
  sourceId: "GB8175" as const,
  relativePath: "references/external_sources/GBT+8175-2025.pdf" as const,
  byteLength: 515_231 as const,
  sha256:
    "d49b00ea888f4d73365d28ac3325ad6c2782d1796a760e1fde697135c67737ae" as const,
  equation7Location: "PDF7:PRINT3:eq7" as const,
  disposition: "rejected_as_printed_not_implemented" as const,
  conflict:
    "Printed sum uses ln(D_i/D_0); J-01 executes only adjacent-layer Fourier resistance from ID-HT-01." as const,
  sourceManifestRef: "SOURCE_MANIFEST.csv#GBT+8175-2025.pdf" as const,
});

export const J01_METHOD_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  methodType: SPECIFICATION.methodType,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: J01_SOURCE_REFS,
  contractSourceRefs: J01_CONTRACT_SOURCE_REFS,
  derivationRefs: J01_DERIVATION_REFS,
  validationCaseIds: J01_VALIDATION_CASE_IDS,
  methodCheckIds: J01_METHOD_CHECK_IDS,
  inputParameterIds: SPECIFICATION.inputParameterIds,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  recommendationEligibility: SPECIFICATION.recommendationEligibility,
  recommendationReason: SPECIFICATION.recommendationReason,
  requiresSubmethodSplit: SPECIFICATION.requiresSubmethodSplit,
  submethodSplitBasis: SPECIFICATION.submethodSplitBasis,
});

export const J01_IMPLEMENTATION_READINESS = Object.freeze({
  isolationStatus: "implemented_not_runtime_activated" as const,
  runtimeActivation: "blocked" as const,
  reason: "J-01 is a parent family requiring registered children; no approved child method IDs exist." as const,
  implementedRoutes: Object.freeze([
    "constant_k_single_layer",
    "piecewise_constant_k_multilayer",
  ] as const),
  unavailableRoutes: Object.freeze([
    "temperature_dependent_k_integration",
  ] as const),
  openGates: Object.freeze([
    Object.freeze({
      gateId: "J-01.registered-child-method-ids" as const,
      reason: "The frozen parent requires a split but provides no approved child IDs." as const,
    }),
    Object.freeze({
      gateId: "J-01.temperature-dependent-property-adapter" as const,
      reason: "No frozen k(T) adapter/integration and interface-iteration child contract is registered." as const,
    }),
    Object.freeze({
      gateId: "J-01.stable-warning-ids" as const,
      reason: "The frozen registry supplies prose predicates but no stable warning IDs." as const,
    }),
  ]),
});

function controlledWarningPredicate<T extends string>(predicate: T): T {
  if (!SPECIFICATION.warningPredicates.includes(predicate)) {
    throw new TypeError(`J-01 warning predicate is not frozen: ${predicate}`);
  }
  return predicate;
}

export const J01_WARNING_PREDICATES = Object.freeze({
  radiusDiameterMixed: controlledWarningPredicate(
    "radius and diameter are mixed" as const,
  ),
  conductivityStateInvalid: controlledWarningPredicate(
    "k is extrapolated or wet-state k is missing" as const,
  ),
  endOrBridgeOmitted: controlledWarningPredicate(
    "end or bridge loss is omitted" as const,
  ),
  disputedStandardImplemented: controlledWarningPredicate(
    "a disputed standard print is implemented directly" as const,
  ),
});

export const J01_ASSUMPTIONS = Object.freeze([
  "steady_one_dimensional_radial_sidewall_conduction",
  "cylindrical_concentric_layers",
  "perfect_thermal_contact_between_layers",
  "constant_k_within_each_executable_layer",
  "adjacent_layer_Fourier_resistances_in_series",
  "end_bridge_support_opening_and_contact_losses_are_separate_paths",
  "positive_heat_flow_is_inner_to_outer",
] as const);

export type J01Route =
  | "constant_k_single_layer"
  | "piecewise_constant_k_multilayer"
  | "temperature_dependent_k_integration";

export interface J01LayerInput {
  readonly layerIndex: number;
  readonly innerRadiusM: number;
  readonly outerRadiusM: number;
  readonly conductivityWPerMK: number;
  readonly conductivityModel: "constant";
  readonly materialId: string;
  readonly materialSnapshotId: string;
  readonly propertyStateId: string;
  readonly conductivitySourceRef: string;
  readonly conductivityApplicability:
    | "confirmed_no_extrapolation"
    | "extrapolated"
    | "unconfirmed";
  readonly moistureState: "dry" | "wet" | "unconfirmed";
  readonly wetStatePropertyStatus:
    | "not_required_dry"
    | "confirmed_wet_property"
    | "missing_wet_property"
    | "unconfirmed";
  readonly validTemperatureLowerK: number;
  readonly validTemperatureUpperK: number;
}

export interface J01SnapshotEvidence {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly propertyStateId: string;
  readonly normalizedInnerRadiusM: number;
  readonly normalizedOuterRadiusM: number;
  readonly normalizedLengthM: number;
  readonly normalizedInnerTemperatureK: number;
  readonly normalizedOuterTemperatureK: number;
  readonly normalizedLayerCount: number | null;
  readonly normalizedLayerBoundaryRadiiM: readonly number[] | null;
  readonly radiusSemantics:
    | "confirmed_radii_not_diameters"
    | "diameter_or_mixed"
    | "unconfirmed";
  readonly layerOrderStatus:
    | "confirmed_inner_to_outer_adjacent"
    | "non_adjacent_or_unordered"
    | "unconfirmed";
}

export interface J01ScopeEvidence {
  readonly caseSnapshotId: string;
  readonly geometrySnapshotId: string;
  readonly materialSnapshotId: string;
  readonly propertyStateId: string;
  readonly modelScope: "steady_1d_radial_cylindrical_sidewall" | "unconfirmed";
  readonly heatFlowSignConvention: "positive_inner_to_outer" | "unconfirmed";
  readonly endAndBridgeTreatment:
    | "excluded_separate_paths_acknowledged"
    | "omitted_without_separate_model"
    | "unconfirmed";
  readonly sourceEquationPolicy:
    | "ID_HT_01_adjacent_layer_Fourier_only"
    | "GB8175_equation_7_as_printed"
    | "unconfirmed";
  readonly propertyTreatment:
    | "constant_k_single_layer"
    | "piecewise_constant_k_layers"
    | "temperature_dependent_k_integration_requested";
}

export interface J01CylindricalRadialConductionInput {
  readonly route: J01Route;
  readonly innerRadiusM: number;
  readonly outerRadiusM: number;
  readonly lengthM: number;
  readonly innerTemperatureK: number;
  readonly outerTemperatureK: number;
  readonly layers: readonly J01LayerInput[] | null;
  readonly snapshotEvidence: J01SnapshotEvidence;
  readonly scopeEvidence: J01ScopeEvidence;
}

export interface J01Warning {
  readonly sourceMethodId: "J-01";
  readonly predicate:
    | (typeof J01_WARNING_PREDICATES)[keyof typeof J01_WARNING_PREDICATES];
  readonly message: string;
}

interface J01LayerTrace extends J01LayerInput {
  readonly thicknessM: number;
  readonly relativeThickness: number;
  readonly logarithmicRadiusRatio: number;
  readonly twoPiConductivityWPerMK: number;
  readonly twoPiConductivityLengthWPerK: number;
  readonly resistanceKPerW: number;
  readonly cumulativeResistanceKPerW: number;
}

export interface J01IdentityCheck {
  readonly identityId: "deltaT=Q*R_total" | "single_R=ln_ratio/(2pi*k*L)";
  readonly actual: number;
  readonly reference: number;
  readonly absoluteResidual: number;
  readonly toleranceId: "TOL-ID";
  readonly tolerancePurpose: "algebra_identity_only";
  readonly passed: true;
}

export interface J01CylindricalRadialConductionSuccess {
  readonly methodId: typeof J01_METHOD_ID;
  readonly methodVersion: typeof J01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly runtimeActivation: "blocked_requires_registered_child_split";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly methodMapping: typeof J01_METHOD_MAPPING;
  readonly value: Readonly<{
    readonly resistance: Readonly<{
      readonly quantityId: "Rcond";
      readonly valueSi: number;
      readonly dimensionId: "thermal_resistance";
      readonly canonicalUnitId: "K_per_W";
    }>;
    readonly heatFlow: Readonly<{
      readonly quantityId: "Qcond";
      readonly valueSi: number;
      readonly dimensionId: "power";
      readonly canonicalUnitId: "W";
      readonly signConvention: "positive_inner_to_outer";
    }>;
    readonly interfaceTemperatures: readonly Readonly<{
      readonly interfaceIndex: number;
      readonly radiusM: number;
      readonly temperatureK: number;
    }>[];
  }>;
  readonly evidence: Readonly<{
    readonly route: Exclude<J01Route, "temperature_dependent_k_integration">;
    readonly caseSnapshotId: string;
    readonly geometrySnapshotId: string;
    readonly materialSnapshotId: string;
    readonly propertyStateId: string;
    readonly snapshotEvidence: Readonly<J01SnapshotEvidence>;
    readonly scopeEvidence: Readonly<J01ScopeEvidence>;
    readonly equation: Readonly<{
      readonly equationId: "CALCULATION_CONTRACTS.md#J-01:Equation";
      readonly controlledDerivation: "ID-HT-01";
      readonly singleLayerEquation: "Q=2*pi*L*k*(Ti-To)/ln(ro/ri)";
      readonly multilayerEquation: "R=sum(ln(r_i/r_i-1)/(2*pi*k_i*L)); Q=(Ti-To)/R";
      readonly logarithmEvaluation: "log1p((ro-ri)/ri)_algebraically_equivalent";
      readonly gb8175Equation7Executed: false;
      readonly temperatureDifferenceK: number;
      readonly layers: readonly Readonly<J01LayerTrace>[];
      readonly totalResistanceKPerW: number;
      readonly heatFlowW: number;
      readonly reconstructedTemperatureDifferenceK: number;
    }>;
    readonly identityChecks: readonly J01IdentityCheck[];
    readonly assumptions: typeof J01_ASSUMPTIONS;
    readonly limitations: Readonly<{
      readonly sidewallOnly: true;
      readonly endsBridgesSupportsOpeningsExcluded: true;
      readonly excludedPathsMustBeHandledSeparately: true;
      readonly temperatureDependentConductivityEvaluated: false;
    }>;
    readonly numericRepresentabilityPolicy: Readonly<{
      readonly binary64MinimumNormal: number;
      readonly boundaryKind: "machine_numeric_representability_only";
      readonly positiveSubnormalIntermediatePolicy: "fail_closed";
      readonly engineeringThreshold: false;
      readonly layerAllocationCeilingIsTrustBoundaryOnly: true;
    }>;
    readonly controlledSource: typeof J01_GB8175_CONTROLLED_SOURCE;
    readonly sourceRefs: typeof J01_SOURCE_REFS;
    readonly contractSourceRefs: typeof J01_CONTRACT_SOURCE_REFS;
    readonly derivationRefs: typeof J01_DERIVATION_REFS;
    readonly validationCaseIds: typeof J01_VALIDATION_CASE_IDS;
    readonly methodCheckIds: typeof J01_METHOD_CHECK_IDS;
  }>;
  readonly failure?: never;
}

export type J01FailureCode =
  | "J-01.input_schema_invalid"
  | "J-01.route_invalid"
  | "J-01.snapshot_evidence_invalid"
  | "J-01.snapshot_value_mismatch"
  | "J-01.evidence_snapshot_mismatch"
  | "J-01.radius_semantics_invalid"
  | "J-01.layer_order_invalid"
  | "J-01.scope_evidence_invalid"
  | "J-01.end_bridge_model_missing"
  | "J-01.disputed_standard_route_rejected"
  | "J-01.route_evidence_mismatch"
  | "J-01.temperature_dependent_route_unavailable"
  | "J-01.geometry_invalid"
  | "J-01.temperature_invalid"
  | "J-01.layer_schema_invalid"
  | "J-01.layer_count_invalid"
  | "J-01.layer_geometry_invalid"
  | "J-01.layer_snapshot_mismatch"
  | "J-01.conductivity_invalid"
  | "J-01.conductivity_state_unavailable"
  | "J-01.numeric_resolution_invalid"
  | "J-01.identity_check_failed";

export interface J01CylindricalRadialConductionFailure {
  readonly methodId: typeof J01_METHOD_ID;
  readonly methodVersion: typeof J01_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data";
  readonly applicabilityStatus: "not_evaluated";
  readonly runtimeActivation: "blocked_requires_registered_child_split";
  readonly availabilityStatus: "unavailable" | "partial_specification";
  readonly warningIds: readonly [];
  readonly warnings: readonly J01Warning[];
  readonly methodMapping: typeof J01_METHOD_MAPPING;
  readonly failure: Readonly<{
    readonly code: J01FailureCode;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type J01CylindricalRadialConductionOutcome =
  | J01CylindricalRadialConductionSuccess
  | J01CylindricalRadialConductionFailure;

const EMPTY_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly J01Warning[];
const PROPERTY_STATE_PATTERN = /^property-state:[0-9a-f]{64}$/u;
const STABLE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-\[\]]*$/u;

function warning(
  predicate: J01Warning["predicate"],
  message: string,
): J01Warning {
  return Object.freeze({ sourceMethodId: J01_METHOD_ID, predicate, message });
}

function failure(
  status: J01CylindricalRadialConductionFailure["status"],
  code: J01FailureCode,
  message: string,
  action: string,
  warnings: readonly J01Warning[] = EMPTY_WARNINGS,
  availabilityStatus: J01CylindricalRadialConductionFailure["availabilityStatus"] = "unavailable",
): J01CylindricalRadialConductionFailure {
  return Object.freeze({
    methodId: J01_METHOD_ID,
    methodVersion: J01_METHOD_VERSION,
    methodApproval: "approved",
    status,
    applicabilityStatus: "not_evaluated",
    runtimeActivation: "blocked_requires_registered_child_split",
    availabilityStatus,
    warningIds: EMPTY_IDS,
    warnings: Object.freeze([...warnings]),
    methodMapping: J01_METHOD_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isPositiveNormal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= J01_BINARY64_MIN_NORMAL
  );
}

function isPropertyStateId(value: unknown): value is string {
  return typeof value === "string" && PROPERTY_STATE_PATTERN.test(value);
}

function isStableRef(value: unknown): value is string {
  return typeof value === "string" && STABLE_REF_PATTERN.test(value);
}

/** Exact dense data-array copy with a machine-only allocation ceiling. */
function readExactDenseDataArray(
  value: unknown,
  maximumLength = J01_MAX_LAYER_RECORDS,
): readonly unknown[] | null {
  try {
    if (!Array.isArray(value)) {
      return null;
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number" ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.value > maximumLength
    ) {
      return null;
    }
    const length = lengthDescriptor.value;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== length + 1 ||
      keys.some((key) =>
        typeof key === "symbol"
          ? true
          : key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key),
      )
    ) {
      return null;
    }
    const output: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      output.push(descriptor.value);
    }
    return Object.freeze(output);
  } catch {
    return null;
  }
}

type EvidenceResult<T> =
  | Readonly<{ readonly ok: true; readonly evidence: Readonly<T> }>
  | Readonly<{
      readonly ok: false;
      readonly result: J01CylindricalRadialConductionFailure;
    }>;

function validateSnapshotEvidence(value: unknown): EvidenceResult<J01SnapshotEvidence> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "propertyStateId",
    "normalizedInnerRadiusM",
    "normalizedOuterRadiusM",
    "normalizedLengthM",
    "normalizedInnerTemperatureK",
    "normalizedOuterTemperatureK",
    "normalizedLayerCount",
    "normalizedLayerBoundaryRadiiM",
    "radiusSemantics",
    "layerOrderStatus",
  ]);
  const layerBoundaryValues =
    record === null || record.normalizedLayerBoundaryRadiiM === null
      ? null
      : readExactDenseDataArray(
          record.normalizedLayerBoundaryRadiiM,
          J01_MAX_LAYER_RECORDS + 1,
        );
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isPropertyStateId(record.propertyStateId) ||
    (record.normalizedLayerBoundaryRadiiM !== null &&
      (layerBoundaryValues === null ||
        layerBoundaryValues.some(
          (candidate) =>
            typeof candidate !== "number" || !Number.isFinite(candidate),
        )))
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.snapshot_evidence_invalid",
        "Snapshot evidence must be an exact content-addressed plain-data record.",
        "Bind one case, geometry, material database, and property state without accessors or extra fields.",
      ),
    });
  }
  if (record.radiusSemantics === "diameter_or_mixed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.radius_semantics_invalid",
        "A radius/diameter mapping is mixed at the J-01 boundary.",
        "Supply explicit inner and outer radii in canonical SI metres.",
        [
          warning(
            J01_WARNING_PREDICATES.radiusDiameterMixed,
            "The controlled geometry evidence reports a radius/diameter mix.",
          ),
        ],
      ),
    });
  }
  if (record.radiusSemantics === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-01.radius_semantics_invalid",
        "Radius semantics are unconfirmed.",
        "Confirm both cylindrical boundaries as radii, not diameters.",
      ),
    });
  }
  if (record.radiusSemantics !== "confirmed_radii_not_diameters") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.snapshot_evidence_invalid",
        "radiusSemantics is not a controlled value.",
        "Use the frozen enumeration without coercion.",
      ),
    });
  }
  if (record.layerOrderStatus === "non_adjacent_or_unordered") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.layer_order_invalid",
        "The layer stack is not an adjacent inner-to-outer series path.",
        "Provide ordered adjacent cylindrical boundaries; never reuse the common inner radius in every logarithm.",
      ),
    });
  }
  if (record.layerOrderStatus === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-01.layer_order_invalid",
        "Layer adjacency and order are unconfirmed.",
        "Confirm the same geometry snapshot from inner to outer radius.",
      ),
    });
  }
  if (record.layerOrderStatus !== "confirmed_inner_to_outer_adjacent") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.snapshot_evidence_invalid",
        "layerOrderStatus is not a controlled value.",
        "Use the frozen enumeration without coercion.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      materialSnapshotId: record.materialSnapshotId,
      propertyStateId: record.propertyStateId,
      normalizedInnerRadiusM: record.normalizedInnerRadiusM as number,
      normalizedOuterRadiusM: record.normalizedOuterRadiusM as number,
      normalizedLengthM: record.normalizedLengthM as number,
      normalizedInnerTemperatureK: record.normalizedInnerTemperatureK as number,
      normalizedOuterTemperatureK: record.normalizedOuterTemperatureK as number,
      normalizedLayerCount: record.normalizedLayerCount as number | null,
      normalizedLayerBoundaryRadiiM:
        layerBoundaryValues === null
          ? null
          : Object.freeze(
              layerBoundaryValues.map((candidate) => candidate as number),
            ),
      radiusSemantics: "confirmed_radii_not_diameters" as const,
      layerOrderStatus: "confirmed_inner_to_outer_adjacent" as const,
    }),
  });
}

function validateScopeEvidence(value: unknown): EvidenceResult<J01ScopeEvidence> {
  const record = readExactPlainDataRecord(value, [
    "caseSnapshotId",
    "geometrySnapshotId",
    "materialSnapshotId",
    "propertyStateId",
    "modelScope",
    "heatFlowSignConvention",
    "endAndBridgeTreatment",
    "sourceEquationPolicy",
    "propertyTreatment",
  ]);
  if (
    record === null ||
    !isContentAddressedSnapshotId(record.caseSnapshotId, "case") ||
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isPropertyStateId(record.propertyStateId)
  ) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.scope_evidence_invalid",
        "Scope evidence must be an exact content-addressed plain-data record.",
        "Provide the frozen sidewall, sign, limitation, source, and property controls.",
      ),
    });
  }
  if (record.sourceEquationPolicy === "GB8175_equation_7_as_printed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.disputed_standard_route_rejected",
        "GB/T 8175 Equation (7) as printed is a rejected comparison path, not an implementation source.",
        "Use the adjacent-layer Fourier resistance frozen in ID-HT-01.",
        [
          warning(
            J01_WARNING_PREDICATES.disputedStandardImplemented,
            "The request attempted to execute the disputed printed standard equation.",
          ),
        ],
      ),
    });
  }
  if (record.sourceEquationPolicy === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-01.scope_evidence_invalid",
        "The conduction-equation source route is unconfirmed.",
        "Bind the calculation to ID-HT-01; do not infer or repair the disputed standard print.",
      ),
    });
  }
  if (record.sourceEquationPolicy !== "ID_HT_01_adjacent_layer_Fourier_only") {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.scope_evidence_invalid",
        "sourceEquationPolicy is not a controlled value.",
        "Use the frozen enumeration without coercion.",
      ),
    });
  }
  if (record.endAndBridgeTreatment === "omitted_without_separate_model") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-01.end_bridge_model_missing",
        "End or bridge heat-loss paths were omitted without an explicit separate-path treatment.",
        "Acknowledge the sidewall-only scope and model end/bridge/support/opening paths separately.",
        [
          warning(
            J01_WARNING_PREDICATES.endOrBridgeOmitted,
            "The declared total-loss use omits an end or bridge path.",
          ),
        ],
      ),
    });
  }
  if (record.endAndBridgeTreatment === "unconfirmed") {
    return Object.freeze({
      ok: false,
      result: failure(
        "insufficient_data",
        "J-01.end_bridge_model_missing",
        "End and bridge path treatment is unconfirmed.",
        "Confirm that J-01 is sidewall-only and excluded paths remain explicit elsewhere.",
      ),
    });
  }
  if (
    record.modelScope !== "steady_1d_radial_cylindrical_sidewall" ||
    record.heatFlowSignConvention !== "positive_inner_to_outer" ||
    record.endAndBridgeTreatment !== "excluded_separate_paths_acknowledged" ||
    (record.propertyTreatment !== "constant_k_single_layer" &&
      record.propertyTreatment !== "piecewise_constant_k_layers" &&
      record.propertyTreatment !==
        "temperature_dependent_k_integration_requested")
  ) {
    const status =
      record.modelScope === "unconfirmed" ||
      record.heatFlowSignConvention === "unconfirmed"
        ? "insufficient_data"
        : "invalid_input";
    return Object.freeze({
      ok: false,
      result: failure(
        status,
        "J-01.scope_evidence_invalid",
        "J-01 scope or sign evidence is missing or not controlled.",
        "Confirm steady one-dimensional radial sidewall conduction and the frozen sign convention.",
      ),
    });
  }
  return Object.freeze({
    ok: true,
    evidence: Object.freeze({
      caseSnapshotId: record.caseSnapshotId,
      geometrySnapshotId: record.geometrySnapshotId,
      materialSnapshotId: record.materialSnapshotId,
      propertyStateId: record.propertyStateId,
      modelScope: "steady_1d_radial_cylindrical_sidewall" as const,
      heatFlowSignConvention: "positive_inner_to_outer" as const,
      endAndBridgeTreatment:
        "excluded_separate_paths_acknowledged" as const,
      sourceEquationPolicy:
        "ID_HT_01_adjacent_layer_Fourier_only" as const,
      propertyTreatment: record.propertyTreatment as J01ScopeEvidence["propertyTreatment"],
    }),
  });
}

type LayerResult =
  | Readonly<{ readonly ok: true; readonly layers: readonly J01LayerInput[] }>
  | Readonly<{
      readonly ok: false;
      readonly result: J01CylindricalRadialConductionFailure;
    }>;

function parseLayers(
  value: unknown,
  snapshot: Readonly<J01SnapshotEvidence>,
  minimumTemperatureK: number,
  maximumTemperatureK: number,
): LayerResult {
  const values = readExactDenseDataArray(value);
  if (values === null) {
    return Object.freeze({
      ok: false,
      result: failure(
        "invalid_input",
        "J-01.layer_schema_invalid",
        "layers must be an exact dense data array within the machine trust-boundary ceiling.",
        "Remove holes, accessors, symbols, extra fields, and hostile or oversized arrays.",
      ),
    });
  }
  const output: J01LayerInput[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const record = readExactPlainDataRecord(values[index], [
      "layerIndex",
      "innerRadiusM",
      "outerRadiusM",
      "conductivityWPerMK",
      "conductivityModel",
      "materialId",
      "materialSnapshotId",
      "propertyStateId",
      "conductivitySourceRef",
      "conductivityApplicability",
      "moistureState",
      "wetStatePropertyStatus",
      "validTemperatureLowerK",
      "validTemperatureUpperK",
    ]);
    if (record === null || record.layerIndex !== index) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_schema_invalid",
          "Each layer must be an exact plain-data record with its zero-based physical order.",
          "Provide dense inner-to-outer layer records without accessors or extra fields.",
        ),
      });
    }
    if (
      !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
      !isPropertyStateId(record.propertyStateId) ||
      record.materialSnapshotId !== snapshot.materialSnapshotId ||
      record.propertyStateId !== snapshot.propertyStateId
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_snapshot_mismatch",
          "A layer property does not bind the same material snapshot and property state.",
          "Rebuild all layer properties from the single declared material/property snapshot.",
        ),
      });
    }
    if (!isStableRef(record.materialId) || !isStableRef(record.conductivitySourceRef)) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_schema_invalid",
          "Layer material and conductivity source identifiers must be stable machine references.",
          "Provide explicit provenance without coercion.",
        ),
      });
    }
    if (
      record.conductivityModel !== "constant" ||
      !isPositiveNormal(record.conductivityWPerMK)
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.conductivity_invalid",
          "Each executable layer requires a positive normal binary64 constant conductivity in W/(m*K).",
          "Use the explicit constant-property route or request the unavailable k(T) route.",
        ),
      });
    }
    if (record.conductivityApplicability === "extrapolated") {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "J-01.conductivity_state_unavailable",
          "A layer conductivity is extrapolated beyond its declared property state.",
          "Provide in-range property evidence; J-01 does not invent an extrapolation rule.",
          [
            warning(
              J01_WARNING_PREDICATES.conductivityStateInvalid,
              "The layer conductivity is marked extrapolated.",
            ),
          ],
        ),
      });
    }
    if (record.conductivityApplicability === "unconfirmed") {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "J-01.conductivity_state_unavailable",
          "Layer conductivity applicability is unconfirmed.",
          "Confirm the source temperature and moisture state.",
        ),
      });
    }
    if (record.conductivityApplicability !== "confirmed_no_extrapolation") {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_schema_invalid",
          "conductivityApplicability is not controlled.",
          "Use the frozen enumeration without coercion.",
        ),
      });
    }
    if (
      (record.moistureState !== "dry" &&
        record.moistureState !== "wet" &&
        record.moistureState !== "unconfirmed") ||
      (record.wetStatePropertyStatus !== "not_required_dry" &&
        record.wetStatePropertyStatus !== "confirmed_wet_property" &&
        record.wetStatePropertyStatus !== "missing_wet_property" &&
        record.wetStatePropertyStatus !== "unconfirmed")
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_schema_invalid",
          "Layer moisture-state evidence contains an uncontrolled value.",
          "Use the frozen dry/wet and wet-property enumerations without coercion.",
        ),
      });
    }
    if (
      record.moistureState === "wet" &&
      record.wetStatePropertyStatus === "missing_wet_property"
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "J-01.conductivity_state_unavailable",
          "Wet-state conductivity is missing for a declared wet layer.",
          "Provide wet-state property evidence or change the declared material state with provenance.",
          [
            warning(
              J01_WARNING_PREDICATES.conductivityStateInvalid,
              "The declared wet layer lacks wet-state conductivity.",
            ),
          ],
        ),
      });
    }
    if (
      (record.moistureState === "dry" &&
        record.wetStatePropertyStatus !== "not_required_dry") ||
      (record.moistureState === "wet" &&
        record.wetStatePropertyStatus !== "confirmed_wet_property") ||
      record.moistureState === "unconfirmed" ||
      record.wetStatePropertyStatus === "unconfirmed"
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "J-01.conductivity_state_unavailable",
          "Layer moisture/property-state evidence is inconsistent or unconfirmed.",
          "Bind k to the declared dry or wet material state.",
        ),
      });
    }
    if (
      !isPositiveNormal(record.innerRadiusM) ||
      !isPositiveNormal(record.outerRadiusM) ||
      record.outerRadiusM <= record.innerRadiusM ||
      !isPositiveNormal(record.validTemperatureLowerK) ||
      !isPositiveNormal(record.validTemperatureUpperK) ||
      record.validTemperatureUpperK < record.validTemperatureLowerK
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "invalid_input",
          "J-01.layer_geometry_invalid",
          "Layer radii or declared temperature interval are invalid/non-normal.",
          "Provide ordered positive radii and a positive absolute-temperature interval.",
        ),
      });
    }
    if (
      record.validTemperatureLowerK > minimumTemperatureK ||
      record.validTemperatureUpperK < maximumTemperatureK
    ) {
      return Object.freeze({
        ok: false,
        result: failure(
          "insufficient_data",
          "J-01.conductivity_state_unavailable",
          "The declared constant-k validity interval does not cover the full boundary-temperature interval.",
          "Provide in-range constant-property evidence or a registered k(T) integration child.",
          [
            warning(
              J01_WARNING_PREDICATES.conductivityStateInvalid,
              "The layer conductivity would be extrapolated across the boundary-temperature interval.",
            ),
          ],
        ),
      });
    }
    output.push(
      Object.freeze({
        layerIndex: index,
        innerRadiusM: record.innerRadiusM,
        outerRadiusM: record.outerRadiusM,
        conductivityWPerMK: record.conductivityWPerMK,
        conductivityModel: "constant",
        materialId: record.materialId,
        materialSnapshotId: record.materialSnapshotId,
        propertyStateId: record.propertyStateId,
        conductivitySourceRef: record.conductivitySourceRef,
        conductivityApplicability: "confirmed_no_extrapolation",
        moistureState: record.moistureState as "dry" | "wet",
        wetStatePropertyStatus: record.wetStatePropertyStatus as
          | "not_required_dry"
          | "confirmed_wet_property",
        validTemperatureLowerK: record.validTemperatureLowerK,
        validTemperatureUpperK: record.validTemperatureUpperK,
      }),
    );
  }
  return Object.freeze({ ok: true, layers: Object.freeze(output) });
}

function identityCheck(
  identityId: J01IdentityCheck["identityId"],
  actual: number,
  reference: number,
): J01IdentityCheck | null {
  const absoluteResidual = Math.abs(actual - reference);
  if (!Number.isFinite(absoluteResidual) || !isWithinTolId(actual, reference)) {
    return null;
  }
  return Object.freeze({
    identityId,
    actual,
    reference,
    absoluteResidual,
    toleranceId: TOL_ID.id,
    tolerancePurpose: "algebra_identity_only",
    passed: true,
  });
}

/** Evaluate only the frozen, constant-property J-01 routes in isolation. */
export function evaluateJ01CylindricalRadialConduction(
  input: unknown,
): J01CylindricalRadialConductionOutcome {
  const record = readExactPlainDataRecord(input, [
    "route",
    "innerRadiusM",
    "outerRadiusM",
    "lengthM",
    "innerTemperatureK",
    "outerTemperatureK",
    "layers",
    "snapshotEvidence",
    "scopeEvidence",
  ]);
  if (record === null) {
    return failure(
      "invalid_input",
      "J-01.input_schema_invalid",
      "J-01 input must match the exact isolated canonical-SI schema.",
      "Remove extra, missing, accessor, symbol, and legacy fields.",
    );
  }
  if (
    record.route !== "constant_k_single_layer" &&
    record.route !== "piecewise_constant_k_multilayer" &&
    record.route !== "temperature_dependent_k_integration"
  ) {
    return failure(
      "invalid_input",
      "J-01.route_invalid",
      "route is not a controlled J-01 route.",
      "Use the frozen route enumeration without inventing a child method ID.",
    );
  }
  const snapshotResult = validateSnapshotEvidence(record.snapshotEvidence);
  if (!snapshotResult.ok) {
    return snapshotResult.result;
  }
  const scopeResult = validateScopeEvidence(record.scopeEvidence);
  if (!scopeResult.ok) {
    return scopeResult.result;
  }
  const snapshot = snapshotResult.evidence;
  const scope = scopeResult.evidence;
  if (
    snapshot.caseSnapshotId !== scope.caseSnapshotId ||
    snapshot.geometrySnapshotId !== scope.geometrySnapshotId ||
    snapshot.materialSnapshotId !== scope.materialSnapshotId ||
    snapshot.propertyStateId !== scope.propertyStateId
  ) {
    return failure(
      "invalid_input",
      "J-01.evidence_snapshot_mismatch",
      "Geometry, boundary, material, and property evidence do not bind the same snapshots/state.",
      "Rebuild J-01 evidence from one immutable case/geometry/material/property state.",
    );
  }
  if (
    snapshot.normalizedInnerRadiusM !== record.innerRadiusM ||
    snapshot.normalizedOuterRadiusM !== record.outerRadiusM ||
    snapshot.normalizedLengthM !== record.lengthM ||
    snapshot.normalizedInnerTemperatureK !== record.innerTemperatureK ||
    snapshot.normalizedOuterTemperatureK !== record.outerTemperatureK
  ) {
    return failure(
      "invalid_input",
      "J-01.snapshot_value_mismatch",
      "A top-level geometry or boundary temperature differs from its immutable snapshot value.",
      "Use exact snapshot-bound ri, ro, L, Ti, and To values.",
    );
  }

  if (record.route === "temperature_dependent_k_integration") {
    if (
      record.layers !== null ||
      snapshot.normalizedLayerCount !== null ||
      snapshot.normalizedLayerBoundaryRadiiM !== null ||
      scope.propertyTreatment !==
        "temperature_dependent_k_integration_requested"
    ) {
      return failure(
        "invalid_input",
        "J-01.route_evidence_mismatch",
        "The temperature-dependent request mixes constant-layer data or a different property treatment.",
        "Request the unavailable k(T) route without fabricating constant layer values.",
      );
    }
    return failure(
      "insufficient_data",
      "J-01.temperature_dependent_route_unavailable",
      "The frozen J-01 parent requires a registered k(T) integration/interface child and property adapter that do not exist.",
      "Register approved child IDs and a versioned property integration contract before evaluation.",
      EMPTY_WARNINGS,
      "partial_specification",
    );
  }

  const expectedTreatment =
    record.route === "constant_k_single_layer"
      ? "constant_k_single_layer"
      : "piecewise_constant_k_layers";
  if (scope.propertyTreatment !== expectedTreatment) {
    return failure(
      "invalid_input",
      "J-01.route_evidence_mismatch",
      "The executable route and declared property treatment differ.",
      "Bind the route to the matching frozen constant-property treatment.",
    );
  }
  if (
    !isPositiveNormal(record.innerRadiusM) ||
    !isPositiveNormal(record.outerRadiusM) ||
    !isPositiveNormal(record.lengthM) ||
    record.outerRadiusM <= record.innerRadiusM
  ) {
    return failure(
      "invalid_input",
      "J-01.geometry_invalid",
      "ri, ro, and L must be positive normal binary64 SI lengths with ro>ri.",
      "Correct the cylindrical geometry; the minimum-normal boundary is numeric, not engineering applicability.",
    );
  }
  if (
    !isPositiveNormal(record.innerTemperatureK) ||
    !isPositiveNormal(record.outerTemperatureK)
  ) {
    return failure(
      "invalid_input",
      "J-01.temperature_invalid",
      "Ti and To must be positive normal binary64 absolute temperatures in kelvin.",
      "Provide physical absolute temperatures without Celsius substitution.",
    );
  }
  const minimumTemperatureK = Math.min(
    record.innerTemperatureK,
    record.outerTemperatureK,
  );
  const maximumTemperatureK = Math.max(
    record.innerTemperatureK,
    record.outerTemperatureK,
  );
  const layerResult = parseLayers(
    record.layers,
    snapshot,
    minimumTemperatureK,
    maximumTemperatureK,
  );
  if (!layerResult.ok) {
    return layerResult.result;
  }
  const layers = layerResult.layers;
  if (
    !Number.isSafeInteger(snapshot.normalizedLayerCount) ||
    snapshot.normalizedLayerCount !== layers.length ||
    (record.route === "constant_k_single_layer" && layers.length !== 1) ||
    (record.route === "piecewise_constant_k_multilayer" && layers.length < 2)
  ) {
    return failure(
      "invalid_input",
      "J-01.layer_count_invalid",
      "The route, snapshot-bound layer count, and dense layer records disagree.",
      "Use exactly one layer for the single-layer route and at least two for the multilayer route.",
    );
  }
  const snapshotLayerBoundaries =
    snapshot.normalizedLayerBoundaryRadiiM;
  if (
    snapshotLayerBoundaries === null ||
    snapshotLayerBoundaries.length !== layers.length + 1 ||
    layers.some(
      (layer, index) =>
        snapshotLayerBoundaries[index] !== layer.innerRadiusM ||
        snapshotLayerBoundaries[index + 1] !== layer.outerRadiusM,
    )
  ) {
    return failure(
      "invalid_input",
      "J-01.snapshot_value_mismatch",
      "An ordered layer boundary radius differs from the immutable geometry snapshot.",
      "Bind every dense inner-to-outer layer boundary radius to the same geometry snapshot without changing an internal interface.",
    );
  }
  const firstLayer = layers[0];
  const lastLayer = layers[layers.length - 1];
  if (
    firstLayer === undefined ||
    lastLayer === undefined ||
    firstLayer.innerRadiusM !== record.innerRadiusM ||
    lastLayer.outerRadiusM !== record.outerRadiusM
  ) {
    return failure(
      "invalid_input",
      "J-01.layer_geometry_invalid",
      "The layer stack does not span the exact top-level inner and outer radii.",
      "Bind the first and last layer boundaries to the same geometry snapshot.",
    );
  }
  for (let index = 1; index < layers.length; index += 1) {
    const previous = layers[index - 1];
    const current = layers[index];
    if (
      previous === undefined ||
      current === undefined ||
      previous.outerRadiusM !== current.innerRadiusM
    ) {
      return failure(
        "invalid_input",
        "J-01.layer_geometry_invalid",
        "Adjacent layers do not share the exact same interface radius.",
        "Provide a gap-free, overlap-free inner-to-outer series stack.",
      );
    }
  }

  const temperatureDifferenceK =
    record.innerTemperatureK - record.outerTemperatureK;
  if (
    !Number.isFinite(temperatureDifferenceK) ||
    (temperatureDifferenceK !== 0 &&
      Math.abs(temperatureDifferenceK) < J01_BINARY64_MIN_NORMAL)
  ) {
    return failure(
      "invalid_input",
      "J-01.numeric_resolution_invalid",
      "The signed boundary-temperature difference is non-finite or positive subnormal.",
      "Use normally representable machine values; no temperature-difference threshold is invented.",
    );
  }

  const layerTraces: J01LayerTrace[] = [];
  let totalResistanceKPerW = 0;
  for (const layer of layers) {
    const thicknessM = layer.outerRadiusM - layer.innerRadiusM;
    const relativeThickness = thicknessM / layer.innerRadiusM;
    const logarithmicRadiusRatio = Math.log1p(relativeThickness);
    const twoPiConductivityWPerMK =
      2 * Math.PI * layer.conductivityWPerMK;
    const twoPiConductivityLengthWPerK =
      twoPiConductivityWPerMK * record.lengthM;
    const resistanceKPerW =
      logarithmicRadiusRatio / twoPiConductivityLengthWPerK;
    if (
      !isPositiveNormal(thicknessM) ||
      !isPositiveNormal(relativeThickness) ||
      !isPositiveNormal(logarithmicRadiusRatio) ||
      !isPositiveNormal(twoPiConductivityWPerMK) ||
      !isPositiveNormal(twoPiConductivityLengthWPerK) ||
      !isPositiveNormal(resistanceKPerW)
    ) {
      return failure(
        "invalid_input",
        "J-01.numeric_resolution_invalid",
        "A positive ri/ro/log/2*pi*k*L/layer-R intermediate overflowed, underflowed, or became subnormal.",
        "Use normally representable inputs; this is a machine boundary, not a thin-layer engineering cutoff.",
      );
    }
    const nextResistance = totalResistanceKPerW + resistanceKPerW;
    if (
      !isPositiveNormal(nextResistance) ||
      (totalResistanceKPerW > 0 &&
        (nextResistance === totalResistanceKPerW ||
          nextResistance === resistanceKPerW))
    ) {
      return failure(
        "invalid_input",
        "J-01.numeric_resolution_invalid",
        "A positive layer resistance overflowed, became subnormal, or was swallowed in the ordered series sum.",
        "Use resolvable layer properties; no positive resistance term may be dropped.",
      );
    }
    totalResistanceKPerW = nextResistance;
    layerTraces.push(
      Object.freeze({
        ...layer,
        thicknessM,
        relativeThickness,
        logarithmicRadiusRatio,
        twoPiConductivityWPerMK,
        twoPiConductivityLengthWPerK,
        resistanceKPerW,
        cumulativeResistanceKPerW: totalResistanceKPerW,
      }),
    );
  }

  let heatFlowW: number;
  if (temperatureDifferenceK === 0) {
    heatFlowW = 0;
  } else if (record.route === "constant_k_single_layer") {
    const only = layerTraces[0];
    if (only === undefined) {
      return failure(
        "invalid_input",
        "J-01.layer_count_invalid",
        "The single-layer trace is absent.",
        "Provide exactly one controlled layer.",
      );
    }
    const numeratorW =
      only.twoPiConductivityLengthWPerK * temperatureDifferenceK;
    heatFlowW = numeratorW / only.logarithmicRadiusRatio;
    if (
      !Number.isFinite(numeratorW) ||
      Math.abs(numeratorW) < J01_BINARY64_MIN_NORMAL
    ) {
      return failure(
        "invalid_input",
        "J-01.numeric_resolution_invalid",
        "The signed 2*pi*L*k*(Ti-To) numerator overflowed, underflowed, or became subnormal.",
        "Use normally representable machine values without rearranging the frozen equation.",
      );
    }
  } else {
    heatFlowW = temperatureDifferenceK / totalResistanceKPerW;
  }
  if (
    !Number.isFinite(heatFlowW) ||
    (heatFlowW !== 0 && Math.abs(heatFlowW) < J01_BINARY64_MIN_NORMAL)
  ) {
    return failure(
      "invalid_input",
      "J-01.numeric_resolution_invalid",
      "The signed conductive heat flow overflowed, underflowed, or became positive subnormal in magnitude.",
      "Use normally representable inputs; no zero or non-finite placeholder is published.",
    );
  }

  const reconstructedTemperatureDifferenceK =
    heatFlowW * totalResistanceKPerW;
  if (
    !Number.isFinite(reconstructedTemperatureDifferenceK) ||
    (temperatureDifferenceK !== 0 &&
      Math.abs(reconstructedTemperatureDifferenceK) <
        J01_BINARY64_MIN_NORMAL)
  ) {
    return failure(
      "invalid_input",
      "J-01.numeric_resolution_invalid",
      "The Q*R temperature reconstruction overflowed, underflowed, or became subnormal.",
      "Treat this as a machine-resolution failure.",
    );
  }
  const deltaIdentity = identityCheck(
    "deltaT=Q*R_total",
    reconstructedTemperatureDifferenceK,
    temperatureDifferenceK,
  );
  const identityChecks: J01IdentityCheck[] = [];
  if (deltaIdentity === null) {
    return failure(
      "invalid_input",
      "J-01.identity_check_failed",
      "The frozen Q*R temperature identity failed TOL-ID.",
      "Treat this as an algebra/numeric implementation failure, not engineering accuracy.",
    );
  }
  identityChecks.push(deltaIdentity);
  if (record.route === "constant_k_single_layer") {
    const only = layerTraces[0];
    if (only === undefined) {
      return failure(
        "invalid_input",
        "J-01.layer_count_invalid",
        "The single-layer trace is absent.",
        "Provide exactly one controlled layer.",
      );
    }
    const singleIdentity = identityCheck(
      "single_R=ln_ratio/(2pi*k*L)",
      only.resistanceKPerW,
      only.logarithmicRadiusRatio /
        only.twoPiConductivityLengthWPerK,
    );
    if (singleIdentity === null) {
      return failure(
        "invalid_input",
        "J-01.identity_check_failed",
        "The single-layer resistance identity failed TOL-ID.",
        "Treat this as an algebra/numeric implementation failure.",
      );
    }
    identityChecks.push(singleIdentity);
  }

  const interfaceTemperatures: Array<
    Readonly<{
      readonly interfaceIndex: number;
      readonly radiusM: number;
      readonly temperatureK: number;
    }>
  > = [];
  let previousTemperatureK = record.innerTemperatureK;
  for (let index = 0; index < layerTraces.length - 1; index += 1) {
    const layer = layerTraces[index];
    if (layer === undefined) {
      return failure(
        "invalid_input",
        "J-01.layer_geometry_invalid",
        "An interface layer trace is absent.",
        "Provide a dense physical layer stack.",
      );
    }
    const temperatureDropK =
      heatFlowW * layer.cumulativeResistanceKPerW;
    const interfaceTemperatureK: number =
      record.innerTemperatureK - temperatureDropK;
    if (
      !Number.isFinite(temperatureDropK) ||
      (heatFlowW !== 0 &&
        Math.abs(temperatureDropK) < J01_BINARY64_MIN_NORMAL) ||
      !isPositiveNormal(interfaceTemperatureK) ||
      (heatFlowW !== 0 && interfaceTemperatureK === record.innerTemperatureK) ||
      (temperatureDifferenceK > 0 &&
        (interfaceTemperatureK >= previousTemperatureK ||
          interfaceTemperatureK <= record.outerTemperatureK)) ||
      (temperatureDifferenceK < 0 &&
        (interfaceTemperatureK <= previousTemperatureK ||
          interfaceTemperatureK >= record.outerTemperatureK))
    ) {
      return failure(
        "invalid_input",
        "J-01.numeric_resolution_invalid",
        "An interface temperature/drop overflowed, became subnormal, was swallowed, or violated signed monotonicity.",
        "Use resolvable layers; do not publish a last-iteration or placeholder interface temperature.",
      );
    }
    interfaceTemperatures.push(
      Object.freeze({
        interfaceIndex: index + 1,
        radiusM: layer.outerRadiusM,
        temperatureK: interfaceTemperatureK,
      }),
    );
    previousTemperatureK = interfaceTemperatureK;
  }

  const frozenLayerTraces = Object.freeze(layerTraces);
  const frozenInterfaceTemperatures = Object.freeze(interfaceTemperatures);
  const frozenIdentityChecks = Object.freeze(identityChecks);
  const equation = Object.freeze({
    equationId: "CALCULATION_CONTRACTS.md#J-01:Equation" as const,
    controlledDerivation: "ID-HT-01" as const,
    singleLayerEquation:
      "Q=2*pi*L*k*(Ti-To)/ln(ro/ri)" as const,
    multilayerEquation:
      "R=sum(ln(r_i/r_i-1)/(2*pi*k_i*L)); Q=(Ti-To)/R" as const,
    logarithmEvaluation:
      "log1p((ro-ri)/ri)_algebraically_equivalent" as const,
    gb8175Equation7Executed: false as const,
    temperatureDifferenceK,
    layers: frozenLayerTraces,
    totalResistanceKPerW,
    heatFlowW,
    reconstructedTemperatureDifferenceK,
  });
  const value = Object.freeze({
    resistance: Object.freeze({
      quantityId: "Rcond" as const,
      valueSi: totalResistanceKPerW,
      dimensionId: "thermal_resistance" as const,
      canonicalUnitId: "K_per_W" as const,
    }),
    heatFlow: Object.freeze({
      quantityId: "Qcond" as const,
      valueSi: heatFlowW,
      dimensionId: "power" as const,
      canonicalUnitId: "W" as const,
      signConvention: "positive_inner_to_outer" as const,
    }),
    interfaceTemperatures: frozenInterfaceTemperatures,
  });
  const evidence = Object.freeze({
    route: record.route,
    caseSnapshotId: snapshot.caseSnapshotId,
    geometrySnapshotId: snapshot.geometrySnapshotId,
    materialSnapshotId: snapshot.materialSnapshotId,
    propertyStateId: snapshot.propertyStateId,
    snapshotEvidence: snapshot,
    scopeEvidence: scope,
    equation,
    identityChecks: frozenIdentityChecks,
    assumptions: J01_ASSUMPTIONS,
    limitations: Object.freeze({
      sidewallOnly: true as const,
      endsBridgesSupportsOpeningsExcluded: true as const,
      excludedPathsMustBeHandledSeparately: true as const,
      temperatureDependentConductivityEvaluated: false as const,
    }),
    numericRepresentabilityPolicy: Object.freeze({
      binary64MinimumNormal: J01_BINARY64_MIN_NORMAL,
      boundaryKind: "machine_numeric_representability_only" as const,
      positiveSubnormalIntermediatePolicy: "fail_closed" as const,
      engineeringThreshold: false as const,
      layerAllocationCeilingIsTrustBoundaryOnly: true as const,
    }),
    controlledSource: J01_GB8175_CONTROLLED_SOURCE,
    sourceRefs: J01_SOURCE_REFS,
    contractSourceRefs: J01_CONTRACT_SOURCE_REFS,
    derivationRefs: J01_DERIVATION_REFS,
    validationCaseIds: J01_VALIDATION_CASE_IDS,
    methodCheckIds: J01_METHOD_CHECK_IDS,
  });
  return Object.freeze({
    methodId: J01_METHOD_ID,
    methodVersion: J01_METHOD_VERSION,
    methodApproval: "approved",
    status: "success",
    applicabilityStatus: "in_domain",
    runtimeActivation: "blocked_requires_registered_child_split",
    warningIds: EMPTY_IDS,
    warnings: EMPTY_IDS,
    methodMapping: J01_METHOD_MAPPING,
    value,
    evidence,
  });
}
