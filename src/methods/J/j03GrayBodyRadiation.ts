import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-03"));

/** CODATA22 value frozen by the J-03 source mapping. */
export const J03_STEFAN_BOLTZMANN_W_PER_M2_K4 =
  5.670374419e-8 as const;

/**
 * IEEE-754 binary64 minimum positive normal value. This is a machine
 * representability boundary only, never an engineering tolerance, material
 * limit, radiation-domain threshold, or source-accuracy statement.
 */
export const J03_BINARY64_MIN_NORMAL = 2 ** -1022;

export const J03_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: J03_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const J03_METHOD_ID = "J-03" as const;
export const J03_METHOD_VERSION = SPECIFICATION.methodVersion;
export const J03_SOURCE_REFS = SPECIFICATION.sourceRefs;
export const J03_CONTRACT_SOURCE_REFS = SPECIFICATION.contractSourceRefs;
export const J03_DERIVATION_REFS = SPECIFICATION.derivationRefs;
export const J03_VALIDATION_CASE_IDS = SPECIFICATION.validationCaseIds;
export const J03_METHOD_CHECK_IDS = SPECIFICATION.methodCheckIds;

export const J03_GRAY_BODY_RADIATION_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: J03_SOURCE_REFS,
  contractSourceRefs: J03_CONTRACT_SOURCE_REFS,
  derivationRefs: J03_DERIVATION_REFS,
  validationCaseIds: J03_VALIDATION_CASE_IDS,
  methodCheckIds: J03_METHOD_CHECK_IDS,
  outputQuantityIds: SPECIFICATION.outputQuantityIds,
  warningPredicates: SPECIFICATION.warningPredicates,
  stableWarningIds: SPECIFICATION.warningIds,
  numericRepresentabilityPolicy: J03_NUMERIC_REPRESENTABILITY_POLICY,
  implementationReadiness: Object.freeze({
    isolationStatus: "implemented_not_runtime_activated" as const,
    runtimeActivation: "blocked" as const,
    openGates: Object.freeze([
      "formal_snapshot_result_trace_adapter",
      "controlled_warning_publication_policy",
    ] as const),
  }),
});

export type J03Configuration =
  | "radiation_to_large_surroundings"
  | "long_concentric_two_gray_surfaces";

export interface J03RadiatingSurfaceInput {
  readonly temperatureK: number;
  readonly emissivity: number;
  readonly areaM2: number;
  readonly materialSnapshotId: string;
  readonly emissivitySourceRef: string;
  readonly emissivityStateTemperatureK: number;
}

export interface J03LargeSurroundingsInput {
  readonly kind: "large_surroundings";
  readonly temperatureK: number;
}

export interface J03ConcentricOuterSurfaceInput {
  readonly kind: "concentric_outer_surface";
  readonly temperatureK: number;
  readonly emissivity: number;
  readonly areaM2: number;
  readonly materialSnapshotId: string;
  readonly emissivitySourceRef: string;
  readonly emissivityStateTemperatureK: number;
}

export type J03CounterpartInput =
  | J03LargeSurroundingsInput
  | J03ConcentricOuterSurfaceInput;

export interface J03BoundaryEvidenceInput {
  readonly geometrySnapshotId: string;
  readonly snapshotConfiguration: J03Configuration;
  readonly snapshotSurface1AreaM2: number;
  readonly snapshotSurface2AreaM2: number | null;
  readonly temperatureScale: "absolute_kelvin";
  readonly diffuseGraySurfacesConfirmed: true;
  readonly viewFactor: 1;
  readonly noUnmodelledOpeningsOrObstructionsConfirmed: true;
  readonly longConcentricEndEffectsNegligible: true | null;
  readonly surface1IsInnerSurface: true | null;
}

export interface J03GrayBodyRadiationInput {
  readonly configuration: J03Configuration;
  readonly surface1: J03RadiatingSurfaceInput;
  readonly counterpart: J03CounterpartInput;
  readonly boundaryEvidence: J03BoundaryEvidenceInput;
}

export interface J03GrayBodyRadiationValue {
  readonly heatRateW: number;
  readonly networkFactor: number;
  readonly heatRateDimensionId: "power";
  readonly heatRateCanonicalUnitId: "W";
  readonly networkFactorDimensionId: "dimensionless";
  readonly networkFactorCanonicalUnitId: "one";
  readonly positiveDirection: "surface_1_to_counterpart";
}

export interface J03GrayBodyRadiationSuccess {
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly value: J03GrayBodyRadiationValue;
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly equation:
    | "Q = epsilon_1 * sigma * A_1 * (T_1^4 - T_sur^4)"
    | "Q = sigma * A_1 * (T_1^4 - T_2^4) / [1/epsilon_1 + (A_1/A_2)*(1/epsilon_2 - 1)]";
  readonly stableFourthPowerDifference: Readonly<{
    readonly temperatureDifferenceK: number;
    readonly temperatureSumK: number;
    readonly squaredTemperatureSumK2: number;
    readonly fourthPowerDifferenceK4: number;
    readonly identity: "(T1-T2)*(T1+T2)*(T1^2+T2^2)";
  }>;
  readonly substitution: Readonly<{
    readonly configuration: J03Configuration;
    readonly surface1TemperatureK: number;
    readonly counterpartTemperatureK: number;
    readonly surface1Emissivity: number;
    readonly surface2Emissivity: number | null;
    readonly surface1AreaM2: number;
    readonly surface2AreaM2: number | null;
    readonly areaRatioA1OverA2: number | null;
    readonly networkResistanceDenominator: number | null;
    readonly networkFactor: number;
    readonly stefanBoltzmannWPerM2K4: typeof J03_STEFAN_BOLTZMANN_W_PER_M2_K4;
  }>;
  readonly evidence: Readonly<{
    readonly geometrySnapshotId: string;
    readonly snapshotConfiguration: J03Configuration;
    readonly snapshotSurface1AreaM2: number;
    readonly snapshotSurface2AreaM2: number | null;
    readonly surface1MaterialSnapshotId: string;
    readonly surface2MaterialSnapshotId: string | null;
    readonly surface1EmissivitySourceRef: string;
    readonly surface2EmissivitySourceRef: string | null;
    readonly surface1EmissivityStateTemperatureK: number;
    readonly surface2EmissivityStateTemperatureK: number | null;
    readonly temperatureScale: "absolute_kelvin";
    readonly diffuseGraySurfacesConfirmed: true;
    readonly viewFactor: 1;
    readonly noUnmodelledOpeningsOrObstructionsConfirmed: true;
    readonly longConcentricEndEffectsNegligible: true | null;
    readonly surface1IsInnerSurface: true | null;
    readonly numericRepresentabilityPolicy:
      typeof J03_NUMERIC_REPRESENTABILITY_POLICY;
  }>;
  readonly assumptions: readonly string[];
  readonly mapping: typeof J03_GRAY_BODY_RADIATION_MAPPING;
}

export interface J03GrayBodyRadiationFailure {
  readonly methodId: typeof J03_METHOD_ID;
  readonly methodVersion: typeof J03_METHOD_VERSION;
  readonly methodApproval: "approved";
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly warningIds: readonly [];
  readonly warnings: readonly [];
  readonly mapping: typeof J03_GRAY_BODY_RADIATION_MAPPING;
  readonly failure: Readonly<{
    readonly code: string;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
  readonly evidence?: never;
}

export type J03GrayBodyRadiationOutcome =
  | J03GrayBodyRadiationSuccess
  | J03GrayBodyRadiationFailure;

const EMPTY_WARNING_IDS = Object.freeze([]) as readonly [];
const EMPTY_WARNINGS = Object.freeze([]) as readonly [];

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= J03_BINARY64_MIN_NORMAL;
}

function isZeroOrNormalMagnitudeBinary64(value: number): boolean {
  return (
    Number.isFinite(value) &&
    (value === 0 || Math.abs(value) >= J03_BINARY64_MIN_NORMAL)
  );
}

function failure(
  status: J03GrayBodyRadiationFailure["status"],
  code: string,
  message: string,
  action: string,
): J03GrayBodyRadiationFailure {
  return Object.freeze({
    methodId: J03_METHOD_ID,
    methodVersion: J03_METHOD_VERSION,
    methodApproval: "approved" as const,
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    mapping: J03_GRAY_BODY_RADIATION_MAPPING,
    failure: Object.freeze({ code, message, action }),
  });
}

function isStableSourceRef(value: unknown): value is string {
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

type SurfaceReadResult =
  | { readonly ok: true; readonly value: Readonly<J03RadiatingSurfaceInput> }
  | { readonly ok: false; readonly failure: J03GrayBodyRadiationFailure };

function readSurface(value: unknown): SurfaceReadResult {
  const record = readExactPlainDataRecord(value, [
    "temperatureK",
    "emissivity",
    "areaM2",
    "materialSnapshotId",
    "emissivitySourceRef",
    "emissivityStateTemperatureK",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        value === null || value === undefined
          ? "J-03.surface_evidence_missing"
          : "J-03.surface_schema_invalid",
        "J-03 requires an exact radiating-surface record with temperature, emissivity, area, immutable material snapshot, and property source.",
        "Supply the complete controlled surface record without accessors, extra fields, or coercible values.",
      ),
    };
  }
  if (
    typeof record.temperatureK !== "number" ||
    !Number.isFinite(record.temperatureK) ||
    record.temperatureK <= 0 ||
    typeof record.emissivity !== "number" ||
    !Number.isFinite(record.emissivity) ||
    record.emissivity <= 0 ||
    record.emissivity > 1 ||
    typeof record.areaM2 !== "number" ||
    !Number.isFinite(record.areaM2) ||
    record.areaM2 <= 0 ||
    typeof record.emissivityStateTemperatureK !== "number" ||
    !Number.isFinite(record.emissivityStateTemperatureK) ||
    record.emissivityStateTemperatureK <= 0
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.surface_value_invalid",
        "Absolute temperature and area must be positive finite SI values, and emissivity must be in (0,1].",
        "Correct the physical surface values; Celsius-labelled or non-finite inputs are not accepted.",
      ),
    };
  }
  if (
    !isContentAddressedSnapshotId(record.materialSnapshotId, "material") ||
    !isStableSourceRef(record.emissivitySourceRef)
  ) {
    return {
      ok: false,
      failure: failure(
        record.materialSnapshotId === null ||
          record.materialSnapshotId === undefined ||
          record.emissivitySourceRef === null ||
          record.emissivitySourceRef === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-03.emissivity_provenance_invalid",
        "Emissivity must be bound to material:<64 lowercase SHA-256 hex> and a stable property source reference.",
        "Resolve the immutable material/property provenance for the radiating surface.",
      ),
    };
  }
  if (record.emissivityStateTemperatureK !== record.temperatureK) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "J-03.emissivity_state_mismatch",
        "The emissivity property state temperature does not match the radiating-surface temperature.",
        "Resolve the emissivity at the declared surface state; do not reuse a cold property silently.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      temperatureK: record.temperatureK,
      emissivity: record.emissivity,
      areaM2: record.areaM2,
      materialSnapshotId: record.materialSnapshotId,
      emissivitySourceRef: record.emissivitySourceRef,
      emissivityStateTemperatureK: record.emissivityStateTemperatureK,
    }),
  };
}

type CounterpartReadResult =
  | {
      readonly ok: true;
      readonly value:
        | Readonly<J03LargeSurroundingsInput>
        | Readonly<J03ConcentricOuterSurfaceInput>;
    }
  | { readonly ok: false; readonly failure: J03GrayBodyRadiationFailure };

function readCounterpart(
  configuration: J03Configuration,
  value: unknown,
): CounterpartReadResult {
  if (configuration === "radiation_to_large_surroundings") {
    const record = readExactPlainDataRecord(value, ["kind", "temperatureK"]);
    if (record === null) {
      return {
        ok: false,
        failure: failure(
          value === null || value === undefined
            ? "insufficient_data"
            : "invalid_input",
          "J-03.large_surroundings_schema_invalid",
          "The large-surroundings route requires exactly kind and absolute temperature.",
          "Provide an explicit large_surroundings counterpart in kelvin.",
        ),
      };
    }
    if (
      record.kind !== "large_surroundings" ||
      typeof record.temperatureK !== "number" ||
      !Number.isFinite(record.temperatureK) ||
      record.temperatureK <= 0
    ) {
      return {
        ok: false,
        failure: failure(
          "invalid_input",
          "J-03.large_surroundings_value_invalid",
          "Large-surroundings evidence must use the controlled kind and a positive finite absolute temperature.",
          "Use kelvin and the explicit large_surroundings configuration.",
        ),
      };
    }
    return {
      ok: true,
      value: Object.freeze({
        kind: "large_surroundings" as const,
        temperatureK: record.temperatureK,
      }),
    };
  }

  const record = readExactPlainDataRecord(value, [
    "kind",
    "temperatureK",
    "emissivity",
    "areaM2",
    "materialSnapshotId",
    "emissivitySourceRef",
    "emissivityStateTemperatureK",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-03.concentric_surface_schema_invalid",
        "The concentric route requires a complete outer gray-surface record.",
        "Provide the exact outer-surface temperature, emissivity, area, and immutable property provenance.",
      ),
    };
  }
  const surfaceResult = readSurface(
    Object.freeze({
      temperatureK: record.temperatureK,
      emissivity: record.emissivity,
      areaM2: record.areaM2,
      materialSnapshotId: record.materialSnapshotId,
      emissivitySourceRef: record.emissivitySourceRef,
      emissivityStateTemperatureK: record.emissivityStateTemperatureK,
    }),
  );
  if (!surfaceResult.ok) {
    return surfaceResult;
  }
  if (record.kind !== "concentric_outer_surface") {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.concentric_surface_kind_invalid",
        "The two-gray-surface route requires the controlled concentric outer-surface kind.",
        "Use the exact configuration discriminator; no topology coercion is allowed.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      kind: "concentric_outer_surface" as const,
      ...surfaceResult.value,
    }),
  };
}

type BoundaryReadResult =
  | { readonly ok: true; readonly value: Readonly<J03BoundaryEvidenceInput> }
  | { readonly ok: false; readonly failure: J03GrayBodyRadiationFailure };

function readBoundaryEvidence(
  configuration: J03Configuration,
  value: unknown,
): BoundaryReadResult {
  const record = readExactPlainDataRecord(value, [
    "geometrySnapshotId",
    "snapshotConfiguration",
    "snapshotSurface1AreaM2",
    "snapshotSurface2AreaM2",
    "temperatureScale",
    "diffuseGraySurfacesConfirmed",
    "viewFactor",
    "noUnmodelledOpeningsOrObstructionsConfirmed",
    "longConcentricEndEffectsNegligible",
    "surface1IsInnerSurface",
  ]);
  if (record === null) {
    return {
      ok: false,
      failure: failure(
        value === null || value === undefined
          ? "insufficient_data"
          : "invalid_input",
        "J-03.boundary_evidence_schema_invalid",
        "J-03 requires exact geometry, temperature-scale, view, gray-surface, and opening evidence.",
        "Supply the complete boundary evidence as plain data without defaults or extra fields.",
      ),
    };
  }
  if (
    !isContentAddressedSnapshotId(record.geometrySnapshotId, "geometry") ||
    (record.snapshotConfiguration !== "radiation_to_large_surroundings" &&
      record.snapshotConfiguration !==
        "long_concentric_two_gray_surfaces") ||
    typeof record.snapshotSurface1AreaM2 !== "number" ||
    !Number.isFinite(record.snapshotSurface1AreaM2) ||
    record.snapshotSurface1AreaM2 <= 0 ||
    (record.snapshotSurface2AreaM2 !== null &&
      (typeof record.snapshotSurface2AreaM2 !== "number" ||
        !Number.isFinite(record.snapshotSurface2AreaM2) ||
        record.snapshotSurface2AreaM2 <= 0)) ||
    record.temperatureScale !== "absolute_kelvin" ||
    typeof record.diffuseGraySurfacesConfirmed !== "boolean" ||
    typeof record.viewFactor !== "number" ||
    !Number.isFinite(record.viewFactor) ||
    record.viewFactor < 0 ||
    record.viewFactor > 1 ||
    typeof record.noUnmodelledOpeningsOrObstructionsConfirmed !== "boolean" ||
    (record.longConcentricEndEffectsNegligible !== true &&
      record.longConcentricEndEffectsNegligible !== false &&
      record.longConcentricEndEffectsNegligible !== null) ||
    (record.surface1IsInnerSurface !== true &&
      record.surface1IsInnerSurface !== false &&
      record.surface1IsInnerSurface !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.boundary_evidence_invalid",
        "Boundary evidence contains a malformed snapshot or an uncontrolled value.",
        "Use an immutable geometry snapshot, absolute kelvin, explicit diffuse-gray evidence, and an exact view factor of one.",
      ),
    };
  }
  if (
    record.diffuseGraySurfacesConfirmed !== true ||
    record.viewFactor !== 1 ||
    record.noUnmodelledOpeningsOrObstructionsConfirmed !== true
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "J-03.view_or_surface_model_not_applicable",
        "J-03 does not cover nongray surfaces, view factors below one, openings, or obstructions.",
        "Route the explicit radiative enclosure to a view-factor/network method.",
      ),
    };
  }
  if (
    configuration === "radiation_to_large_surroundings" &&
    (record.longConcentricEndEffectsNegligible !== null ||
      record.surface1IsInnerSurface !== null)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.large_surroundings_evidence_mixed",
        "Concentric-cylinder evidence cannot be attached to the large-surroundings route.",
        "Use null for non-applicable concentric evidence fields.",
      ),
    };
  }
  if (
    configuration === "long_concentric_two_gray_surfaces" &&
    (record.longConcentricEndEffectsNegligible === false ||
      record.surface1IsInnerSurface === false)
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "J-03.concentric_geometry_not_confirmed",
        "The supported two-gray-surface route requires a long concentric geometry with surface 1 inside and negligible end effects.",
        "Use a method matching the actual finite, eccentric, open, or obstructed geometry.",
      ),
    };
  }
  if (
    configuration === "long_concentric_two_gray_surfaces" &&
    (record.longConcentricEndEffectsNegligible === null ||
      record.surface1IsInnerSurface === null)
  ) {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "J-03.concentric_geometry_unconfirmed",
        "Long-concentric/end-effect or inner-surface geometry evidence remains unconfirmed.",
        "Resolve the content-addressed concentric geometry before evaluating J-03.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      geometrySnapshotId: record.geometrySnapshotId,
      snapshotConfiguration: record.snapshotConfiguration,
      snapshotSurface1AreaM2: record.snapshotSurface1AreaM2,
      snapshotSurface2AreaM2: record.snapshotSurface2AreaM2,
      temperatureScale: "absolute_kelvin" as const,
      diffuseGraySurfacesConfirmed: true as const,
      viewFactor: 1 as const,
      noUnmodelledOpeningsOrObstructionsConfirmed: true as const,
      longConcentricEndEffectsNegligible:
        configuration === "radiation_to_large_surroundings" ? null : true,
      surface1IsInnerSurface:
        configuration === "radiation_to_large_surroundings" ? null : true,
    }),
  };
}

type FourthDifferenceResult =
  | {
      readonly ok: true;
      readonly value: Readonly<{
        readonly temperatureDifferenceK: number;
        readonly temperatureSumK: number;
        readonly squaredTemperatureSumK2: number;
        readonly fourthPowerDifferenceK4: number;
        readonly identity: "(T1-T2)*(T1+T2)*(T1^2+T2^2)";
      }>;
    }
  | { readonly ok: false; readonly failure: J03GrayBodyRadiationFailure };

function stableFourthPowerDifference(
  temperature1K: number,
  temperature2K: number,
): FourthDifferenceResult {
  const temperatureDifferenceK = temperature1K - temperature2K;
  const temperatureSumK = temperature1K + temperature2K;
  const temperature1SquaredK2 = temperature1K * temperature1K;
  const temperature2SquaredK2 = temperature2K * temperature2K;
  const squaredTemperatureSumK2 =
    temperature1SquaredK2 + temperature2SquaredK2;
  if (
    !isPositiveNormalBinary64(temperature1K) ||
    !isPositiveNormalBinary64(temperature2K) ||
    !isZeroOrNormalMagnitudeBinary64(temperatureDifferenceK) ||
    !isPositiveNormalBinary64(temperatureSumK) ||
    !isPositiveNormalBinary64(temperature1SquaredK2) ||
    !isPositiveNormalBinary64(temperature2SquaredK2) ||
    !isPositiveNormalBinary64(squaredTemperatureSumK2)
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.temperature_power_not_representable",
        "The absolute-temperature fourth-power identity is not representable as finite binary64 arithmetic.",
        "Use a representable absolute-temperature state; do not publish Infinity or a wrapped value.",
      ),
    };
  }
  if (temperature1K === temperature2K) {
    return {
      ok: true,
      value: Object.freeze({
        temperatureDifferenceK: 0,
        temperatureSumK,
        squaredTemperatureSumK2,
        fourthPowerDifferenceK4: 0,
        identity: "(T1-T2)*(T1+T2)*(T1^2+T2^2)" as const,
      }),
    };
  }
  if (
    temperatureSumK === temperature1K ||
    temperatureSumK === temperature2K ||
    squaredTemperatureSumK2 === temperature1SquaredK2 ||
    squaredTemperatureSumK2 === temperature2SquaredK2
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.temperature_positive_term_swallowed",
        "A positive temperature or squared-temperature term was swallowed by binary64 addition.",
        "Use a representable temperature pair; do not silently drop a radiative contribution.",
      ),
    };
  }
  if (temperatureDifferenceK === 0) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.temperature_difference_under_resolved",
        "Distinct declared temperatures collapse to zero difference in binary64 arithmetic.",
        "Provide representable absolute temperatures; no engineering threshold is substituted.",
      ),
    };
  }
  const firstProduct = temperatureDifferenceK * temperatureSumK;
  const fourthPowerDifferenceK4 = firstProduct * squaredTemperatureSumK2;
  if (
    !isZeroOrNormalMagnitudeBinary64(firstProduct) ||
    firstProduct === 0 ||
    !isZeroOrNormalMagnitudeBinary64(fourthPowerDifferenceK4) ||
    fourthPowerDifferenceK4 === 0
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "J-03.fourth_power_difference_not_representable",
        "The nonzero fourth-power temperature difference overflows or underflows binary64.",
        "Use a representable state; do not replace the result with zero or Infinity.",
      ),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      temperatureDifferenceK,
      temperatureSumK,
      squaredTemperatureSumK2,
      fourthPowerDifferenceK4,
      identity: "(T1-T2)*(T1+T2)*(T1^2+T2^2)" as const,
    }),
  };
}

function multiplyHeatRate(
  areaM2: number,
  networkFactor: number,
  fourthPowerDifferenceK4: number,
): number | null {
  const sigmaTimesArea = J03_STEFAN_BOLTZMANN_W_PER_M2_K4 * areaM2;
  const coefficient = sigmaTimesArea * networkFactor;
  const heatRateW = coefficient * fourthPowerDifferenceK4;
  if (
    !isPositiveNormalBinary64(areaM2) ||
    !isPositiveNormalBinary64(networkFactor) ||
    !isPositiveNormalBinary64(sigmaTimesArea) ||
    !isPositiveNormalBinary64(coefficient) ||
    !isZeroOrNormalMagnitudeBinary64(fourthPowerDifferenceK4) ||
    !isZeroOrNormalMagnitudeBinary64(heatRateW) ||
    (fourthPowerDifferenceK4 !== 0 && heatRateW === 0)
  ) {
    return null;
  }
  return heatRateW;
}

/** Isolated canonical-SI implementation of frozen method J-03. */
export function calculateJ03GrayBodyRadiation(
  input: unknown,
): J03GrayBodyRadiationOutcome {
  const record = readExactPlainDataRecord(input, [
    "configuration",
    "surface1",
    "counterpart",
    "boundaryEvidence",
  ]);
  if (record === null) {
    return failure(
      input === null || input === undefined
        ? "insufficient_data"
        : "invalid_input",
      "J-03.input_schema_invalid",
      "J-03 requires one exact controlled input record and does not execute accessors or coerce values.",
      "Provide configuration, surface1, counterpart, and boundaryEvidence as exact plain data.",
    );
  }
  if (
    record.configuration !== "radiation_to_large_surroundings" &&
    record.configuration !== "long_concentric_two_gray_surfaces"
  ) {
    return failure(
      "invalid_input",
      "J-03.configuration_invalid",
      "The configuration is not one of the two frozen J-03 radiation networks.",
      "Select the explicit large-surroundings or long-concentric-two-gray-surfaces route.",
    );
  }
  const configuration = record.configuration;
  const surfaceResult = readSurface(record.surface1);
  if (!surfaceResult.ok) {
    return surfaceResult.failure;
  }
  const counterpartResult = readCounterpart(
    configuration,
    record.counterpart,
  );
  if (!counterpartResult.ok) {
    return counterpartResult.failure;
  }
  const boundaryResult = readBoundaryEvidence(
    configuration,
    record.boundaryEvidence,
  );
  if (!boundaryResult.ok) {
    return boundaryResult.failure;
  }
  const expectedSurface2AreaM2 =
    counterpartResult.value.kind === "large_surroundings"
      ? null
      : counterpartResult.value.areaM2;
  if (
    boundaryResult.value.snapshotConfiguration !== configuration ||
    boundaryResult.value.snapshotSurface1AreaM2 !==
      surfaceResult.value.areaM2 ||
    boundaryResult.value.snapshotSurface2AreaM2 !== expectedSurface2AreaM2
  ) {
    return failure(
      "invalid_input",
      "J-03.geometry_snapshot_value_mismatch",
      "The configuration or radiating areas do not exactly match the values bound to the declared geometry snapshot.",
      "Rebuild the J-03 input from one immutable geometry snapshot; do not reuse a hash with changed geometry values.",
    );
  }

  const surface1 = surfaceResult.value;
  const counterpart = counterpartResult.value;
  const counterpartTemperatureK = counterpart.temperatureK;
  const fourthDifferenceResult = stableFourthPowerDifference(
    surface1.temperatureK,
    counterpartTemperatureK,
  );
  if (!fourthDifferenceResult.ok) {
    return fourthDifferenceResult.failure;
  }

  let networkFactor: number;
  let areaRatioA1OverA2: number | null = null;
  let networkResistanceDenominator: number | null = null;
  let surface2Emissivity: number | null = null;
  let surface2AreaM2: number | null = null;
  let surface2MaterialSnapshotId: string | null = null;
  let surface2EmissivitySourceRef: string | null = null;
  let surface2EmissivityStateTemperatureK: number | null = null;
  let equation: J03GrayBodyRadiationSuccess["equation"];
  let assumptions: readonly string[];

  if (configuration === "radiation_to_large_surroundings") {
    if (counterpart.kind !== "large_surroundings") {
      return failure(
        "invalid_input",
        "J-03.configuration_counterpart_mismatch",
        "The counterpart discriminator does not match the selected radiation network.",
        "Keep configuration and counterpart kind identical; no topology coercion is allowed.",
      );
    }
    networkFactor = surface1.emissivity;
    equation =
      "Q = epsilon_1 * sigma * A_1 * (T_1^4 - T_sur^4)";
    assumptions = Object.freeze([
      "large surroundings with view factor one",
      "surface 1 is diffuse and gray at the declared state",
      "no unmodelled opening or obstruction",
      "all temperatures are absolute kelvin",
    ]);
  } else {
    if (counterpart.kind !== "concentric_outer_surface") {
      return failure(
        "invalid_input",
        "J-03.configuration_counterpart_mismatch",
        "The counterpart discriminator does not match the selected radiation network.",
        "Keep configuration and counterpart kind identical; no topology coercion is allowed.",
      );
    }
    if (surface1.areaM2 > counterpart.areaM2) {
      return failure(
        "invalid_input",
        "J-03.concentric_area_order_invalid",
        "The declared inner radiating area exceeds the outer concentric area.",
        "Correct the same-snapshot concentric geometry; do not use the equal-area simplification.",
      );
    }
    areaRatioA1OverA2 = surface1.areaM2 / counterpart.areaM2;
    const outerResistance = 1 / counterpart.emissivity - 1;
    const scaledOuterResistance = areaRatioA1OverA2 * outerResistance;
    const innerResistance = 1 / surface1.emissivity;
    networkResistanceDenominator =
      innerResistance + scaledOuterResistance;
    if (
      !isPositiveNormalBinary64(areaRatioA1OverA2) ||
      areaRatioA1OverA2 > 1 ||
      !isZeroOrNormalMagnitudeBinary64(outerResistance) ||
      outerResistance < 0 ||
      (counterpart.emissivity !== 1 && outerResistance === 0) ||
      !isZeroOrNormalMagnitudeBinary64(scaledOuterResistance) ||
      scaledOuterResistance < 0 ||
      (outerResistance > 0 && scaledOuterResistance === 0) ||
      !isPositiveNormalBinary64(innerResistance) ||
      innerResistance < 1 ||
      !isPositiveNormalBinary64(networkResistanceDenominator) ||
      networkResistanceDenominator < 1 ||
      (scaledOuterResistance > 0 &&
        networkResistanceDenominator === innerResistance)
    ) {
      return failure(
        "invalid_input",
        "J-03.network_factor_not_representable",
        "A positive gray-surface resistance or area-ratio contribution is not representable in binary64.",
        "Use representable same-snapshot geometry and emissivity values; do not drop a network term.",
      );
    }
    networkFactor = 1 / networkResistanceDenominator;
    if (
      !isPositiveNormalBinary64(networkFactor) ||
      networkFactor > 1
    ) {
      return failure(
        "invalid_input",
        "J-03.network_factor_invalid",
        "The concentric gray-surface network factor is non-physical or unrepresentable.",
        "Correct the emissivity and area evidence; no equal-area fallback is used.",
      );
    }
    surface2Emissivity = counterpart.emissivity;
    surface2AreaM2 = counterpart.areaM2;
    surface2MaterialSnapshotId = counterpart.materialSnapshotId;
    surface2EmissivitySourceRef = counterpart.emissivitySourceRef;
    surface2EmissivityStateTemperatureK =
      counterpart.emissivityStateTemperatureK;
    equation =
      "Q = sigma * A_1 * (T_1^4 - T_2^4) / [1/epsilon_1 + (A_1/A_2)*(1/epsilon_2 - 1)]";
    assumptions = Object.freeze([
      "long concentric two-gray-surface enclosure",
      "surface 1 is the inner surface",
      "view factor from surface 1 to surface 2 is one",
      "end effects, openings, and obstructions are absent",
      "all temperatures are absolute kelvin",
    ]);
  }

  const heatRateW = multiplyHeatRate(
    surface1.areaM2,
    networkFactor,
    fourthDifferenceResult.value.fourthPowerDifferenceK4,
  );
  if (heatRateW === null) {
    return failure(
      "invalid_input",
      "J-03.heat_rate_not_representable",
      "The nonzero radiative heat rate overflows or underflows binary64 arithmetic.",
      "Use a representable physical state; do not publish zero, Infinity, or a partially evaluated product.",
    );
  }

  const evidence = Object.freeze({
    geometrySnapshotId: boundaryResult.value.geometrySnapshotId,
    snapshotConfiguration: boundaryResult.value.snapshotConfiguration,
    snapshotSurface1AreaM2:
      boundaryResult.value.snapshotSurface1AreaM2,
    snapshotSurface2AreaM2:
      boundaryResult.value.snapshotSurface2AreaM2,
    surface1MaterialSnapshotId: surface1.materialSnapshotId,
    surface2MaterialSnapshotId,
    surface1EmissivitySourceRef: surface1.emissivitySourceRef,
    surface2EmissivitySourceRef,
    surface1EmissivityStateTemperatureK:
      surface1.emissivityStateTemperatureK,
    surface2EmissivityStateTemperatureK,
    temperatureScale: "absolute_kelvin" as const,
    diffuseGraySurfacesConfirmed: true as const,
    viewFactor: 1 as const,
    noUnmodelledOpeningsOrObstructionsConfirmed: true as const,
    longConcentricEndEffectsNegligible:
      boundaryResult.value.longConcentricEndEffectsNegligible,
    surface1IsInnerSurface: boundaryResult.value.surface1IsInnerSurface,
    numericRepresentabilityPolicy: J03_NUMERIC_REPRESENTABILITY_POLICY,
  });

  return Object.freeze({
    status: "success" as const,
    applicabilityStatus: "in_domain" as const,
    value: Object.freeze({
      heatRateW,
      networkFactor,
      heatRateDimensionId: "power" as const,
      heatRateCanonicalUnitId: "W" as const,
      networkFactorDimensionId: "dimensionless" as const,
      networkFactorCanonicalUnitId: "one" as const,
      positiveDirection: "surface_1_to_counterpart" as const,
    }),
    warningIds: EMPTY_WARNING_IDS,
    warnings: EMPTY_WARNINGS,
    equation,
    stableFourthPowerDifference: fourthDifferenceResult.value,
    substitution: Object.freeze({
      configuration,
      surface1TemperatureK: surface1.temperatureK,
      counterpartTemperatureK,
      surface1Emissivity: surface1.emissivity,
      surface2Emissivity,
      surface1AreaM2: surface1.areaM2,
      surface2AreaM2,
      areaRatioA1OverA2,
      networkResistanceDenominator,
      networkFactor,
      stefanBoltzmannWPerM2K4:
        J03_STEFAN_BOLTZMANN_W_PER_M2_K4,
    }),
    evidence,
    assumptions,
    mapping: J03_GRAY_BODY_RADIATION_MAPPING,
  });
}
