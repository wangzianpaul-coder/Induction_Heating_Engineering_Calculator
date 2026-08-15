import { methodId } from "../../domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../registries/methodSpecificationRegistry.js";
import { readExactPlainDataRecord } from "../controlledInput.js";

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-04"));

export const D04_VACUUM_PERMEABILITY_H_PER_M =
  1.25663706127e-6 as const;

/** IEEE-754 machine boundary only; never an engineering/model threshold. */
export const D04_BINARY64_MIN_NORMAL = 2 ** -1022;

export const D04_NUMERIC_REPRESENTABILITY_POLICY = Object.freeze({
  binary64MinimumNormal: D04_BINARY64_MIN_NORMAL,
  boundaryKind: "machine_numeric_representability_only" as const,
  positiveSubnormalIntermediatePolicy: "fail_closed" as const,
  engineeringThreshold: false as const,
  sourceEquationRearranged: false as const,
});

export const D04_COPPER_SKIN_DEPTH_MAPPING = Object.freeze({
  methodId: SPECIFICATION.methodId,
  methodVersion: SPECIFICATION.methodVersion,
  approvalStatus: SPECIFICATION.approvalStatus,
  equationRef: SPECIFICATION.contractEquationRef,
  sourceRefs: SPECIFICATION.sourceRefs,
  contractSourceRefs: SPECIFICATION.contractSourceRefs,
  validationCaseIds: SPECIFICATION.validationCaseIds,
  methodCheckIds: SPECIFICATION.methodCheckIds,
  numericRepresentabilityPolicy: D04_NUMERIC_REPRESENTABILITY_POLICY,
});

export interface D04CopperStateEvidence {
  readonly materialClass: "copper" | "other";
  readonly propertyStateMatch:
    | "same_material_temperature_frequency_state"
    | "unconfirmed_or_mismatched";
  readonly temperatureK: number;
  readonly constitutiveRegime:
    | "linear_isotropic_good_conductor"
    | "nonlinear_or_unknown";
  readonly excitation: "sinusoidal_steady_state" | "other_or_unknown";
  readonly fieldModel: "locally_planar_reference" | "other_or_unknown";
}

export interface D04CopperSkinDepthInput {
  /** Frozen `frequency` quantity in canonical SI hertz. */
  readonly frequencyHz: number;
  /** Copper electrical-resistivity snapshot in canonical SI ohm metres. */
  readonly resistivityOhmM: number;
  /** Copper relative-permeability snapshot; no implicit value of one. */
  readonly relativePermeability: number;
  /** Explicit evidence that the property snapshots and method state agree. */
  readonly state: D04CopperStateEvidence;
}

export interface D04CopperSkinDepthValue {
  readonly skinDepthM: number;
  readonly dimensionId: "length";
  readonly canonicalUnitId: "m";
  readonly interpretation: "electromagnetic_field_amplitude_1_over_e_depth";
  readonly isThermalAffectedDepth: false;
}

export interface D04CopperSkinDepthSuccess {
  readonly status: "success";
  readonly applicabilityStatus: "in_domain";
  readonly value: D04CopperSkinDepthValue;
  readonly equation: "delta = sqrt(rho / (pi * f * mu0 * mu_r))";
  readonly substitution: Readonly<{
    readonly resistivityOhmM: number;
    readonly frequencyHz: number;
    readonly vacuumPermeabilityHPerM: number;
    readonly relativePermeability: number;
    readonly absolutePermeabilityHPerM: number;
    readonly denominator: number;
  }>;
  readonly state: Readonly<D04CopperStateEvidence>;
  readonly numericRepresentabilityPolicy:
    typeof D04_NUMERIC_REPRESENTABILITY_POLICY;
  readonly assumptions: readonly [
    "linear isotropic good conductor",
    "sinusoidal steady state",
    "locally planar semi-infinite reference field",
    "resistivity and relative permeability share one material state",
  ];
}

export interface D04CopperSkinDepthFailure {
  readonly status: "invalid_input" | "insufficient_data" | "not_applicable";
  readonly applicabilityStatus: "not_evaluated" | "out_of_domain";
  readonly failure: Readonly<{
    readonly code: string;
    readonly message: string;
    readonly action: string;
  }>;
  readonly value?: never;
}

export type D04CopperSkinDepthOutcome =
  | D04CopperSkinDepthSuccess
  | D04CopperSkinDepthFailure;

function isPositiveNormalBinary64(value: number): boolean {
  return Number.isFinite(value) && value >= D04_BINARY64_MIN_NORMAL;
}

function failure(
  status: D04CopperSkinDepthFailure["status"],
  code: string,
  message: string,
  action: string,
): D04CopperSkinDepthFailure {
  return Object.freeze({
    status,
    applicabilityStatus:
      status === "not_applicable" ? "out_of_domain" : "not_evaluated",
    failure: Object.freeze({ code, message, action }),
  });
}

function validateState(
  value: unknown,
):
  | { readonly ok: true; readonly state: Readonly<D04CopperStateEvidence> }
  | { readonly ok: false; readonly failure: D04CopperSkinDepthFailure } {
  const controlledState = readExactPlainDataRecord(value, [
    "materialClass",
    "propertyStateMatch",
    "temperatureK",
    "constitutiveRegime",
    "excitation",
    "fieldModel",
  ]);
  if (controlledState === null) {
    const evidenceIsAbsent = value === undefined || value === null;
    return {
      ok: false,
      failure: failure(
        evidenceIsAbsent ? "insufficient_data" : "invalid_input",
        evidenceIsAbsent
          ? "D-04.state_evidence_missing"
          : "D-04.state_evidence_schema_invalid",
        evidenceIsAbsent
          ? "D-04 requires explicit material, temperature, frequency, regime, excitation, and field-model evidence."
          : "D-04 state evidence must be an exact controlled plain-data record without accessors or extra fields.",
        evidenceIsAbsent
          ? "Resolve matching copper property snapshots before evaluating D-04."
          : "Provide the exact frozen D-04 state-evidence fields as plain data values.",
      ),
    };
  }
  if (
    (controlledState.materialClass !== "copper" && controlledState.materialClass !== "other") ||
    (controlledState.propertyStateMatch !== "same_material_temperature_frequency_state" &&
      controlledState.propertyStateMatch !== "unconfirmed_or_mismatched") ||
    typeof controlledState.temperatureK !== "number" ||
    !Number.isFinite(controlledState.temperatureK) ||
    controlledState.temperatureK <= 0 ||
    (controlledState.constitutiveRegime !== "linear_isotropic_good_conductor" &&
      controlledState.constitutiveRegime !== "nonlinear_or_unknown") ||
    (controlledState.excitation !== "sinusoidal_steady_state" &&
      controlledState.excitation !== "other_or_unknown") ||
    (controlledState.fieldModel !== "locally_planar_reference" &&
      controlledState.fieldModel !== "other_or_unknown")
  ) {
    return {
      ok: false,
      failure: failure(
        "invalid_input",
        "D-04.state_evidence_invalid",
        "D-04 state evidence contains an uncontrolled or non-physical value.",
        "Use the frozen D-04 evidence enumeration and a positive absolute temperature.",
      ),
    };
  }
  const state = Object.freeze({
    materialClass: controlledState.materialClass,
    propertyStateMatch: controlledState.propertyStateMatch,
    temperatureK: controlledState.temperatureK,
    constitutiveRegime: controlledState.constitutiveRegime,
    excitation: controlledState.excitation,
    fieldModel: controlledState.fieldModel,
  }) as Readonly<D04CopperStateEvidence>;
  if (state.materialClass !== "copper") {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "D-04.material_not_copper",
        "D-04 is the copper-conductor skin-depth method.",
        "Route non-copper workpiece material to the applicable E-module method.",
      ),
    };
  }
  if (state.propertyStateMatch !== "same_material_temperature_frequency_state") {
    return {
      ok: false,
      failure: failure(
        "insufficient_data",
        "D-04.property_state_mismatch",
        "Copper resistivity and relative permeability are not confirmed at one material/temperature/frequency state.",
        "Resolve same-state property snapshots; do not reuse a cold resistivity silently.",
      ),
    };
  }
  if (
    state.constitutiveRegime !== "linear_isotropic_good_conductor" ||
    state.excitation !== "sinusoidal_steady_state" ||
    state.fieldModel !== "locally_planar_reference"
  ) {
    return {
      ok: false,
      failure: failure(
        "not_applicable",
        "D-04.method_regime_not_applicable",
        "D-04 requires a linear isotropic good conductor, sinusoidal steady state, and the locally planar reference model.",
        "Select a method whose domain matches the declared electromagnetic regime.",
      ),
    };
  }
  return { ok: true, state };
}

/** Isolated canonical-SI implementation of frozen method D-04. */
export function evaluateD04CopperSkinDepth(
  input: D04CopperSkinDepthInput,
): D04CopperSkinDepthOutcome {
  const controlledInput = readExactPlainDataRecord(input, [
    "frequencyHz",
    "resistivityOhmM",
    "relativePermeability",
    "state",
  ]);
  if (controlledInput === null) {
    return failure(
      "invalid_input",
      "D-04.input_schema_invalid",
      "D-04 input must be a controlled object.",
      "Provide canonical-SI property values and explicit state evidence.",
    );
  }
  if (
    typeof controlledInput.frequencyHz !== "number" ||
    !Number.isFinite(controlledInput.frequencyHz) ||
    controlledInput.frequencyHz <= 0 ||
    typeof controlledInput.resistivityOhmM !== "number" ||
    !Number.isFinite(controlledInput.resistivityOhmM) ||
    controlledInput.resistivityOhmM <= 0 ||
    typeof controlledInput.relativePermeability !== "number" ||
    !Number.isFinite(controlledInput.relativePermeability) ||
    controlledInput.relativePermeability <= 0
  ) {
    return failure(
      "invalid_input",
      "D-04.numeric_input_invalid",
      "D-04 requires finite positive f, rho, and mu_r in canonical SI.",
      "Correct the frequency and same-state copper property snapshots.",
    );
  }
  const stateResult = validateState(controlledInput.state);
  if (!stateResult.ok) {
    return stateResult.failure;
  }

  const absolutePermeabilityHPerM =
    D04_VACUUM_PERMEABILITY_H_PER_M * controlledInput.relativePermeability;
  const piTimesFrequencyPerSecond = Math.PI * controlledInput.frequencyHz;
  const denominator =
    piTimesFrequencyPerSecond * absolutePermeabilityHPerM;
  const radicand = controlledInput.resistivityOhmM / denominator;
  const skinDepthM = Math.sqrt(radicand);
  if (
    !isPositiveNormalBinary64(controlledInput.frequencyHz) ||
    !isPositiveNormalBinary64(controlledInput.resistivityOhmM) ||
    !isPositiveNormalBinary64(controlledInput.relativePermeability) ||
    !isPositiveNormalBinary64(absolutePermeabilityHPerM) ||
    !isPositiveNormalBinary64(piTimesFrequencyPerSecond) ||
    !isPositiveNormalBinary64(denominator) ||
    !isPositiveNormalBinary64(radicand) ||
    !isPositiveNormalBinary64(skinDepthM)
  ) {
    return failure(
      "invalid_input",
      "D-04.numeric_resolution_invalid",
      "D-04 derived a non-finite or non-positive electromagnetic depth.",
      "Use finite, representable canonical-SI property and frequency values.",
    );
  }

  return Object.freeze({
    status: "success",
    applicabilityStatus: "in_domain",
    value: Object.freeze({
      skinDepthM,
      dimensionId: "length",
      canonicalUnitId: "m",
      interpretation: "electromagnetic_field_amplitude_1_over_e_depth",
      isThermalAffectedDepth: false,
    }),
    equation: "delta = sqrt(rho / (pi * f * mu0 * mu_r))",
    substitution: Object.freeze({
      resistivityOhmM: controlledInput.resistivityOhmM,
      frequencyHz: controlledInput.frequencyHz,
      vacuumPermeabilityHPerM: D04_VACUUM_PERMEABILITY_H_PER_M,
      relativePermeability: controlledInput.relativePermeability,
      absolutePermeabilityHPerM,
      denominator,
    }),
    state: stateResult.state,
    numericRepresentabilityPolicy: D04_NUMERIC_REPRESENTABILITY_POLICY,
    assumptions: Object.freeze([
      "linear isotropic good conductor",
      "sinusoidal steady state",
      "locally planar semi-infinite reference field",
      "resistivity and relative permeability share one material state",
    ]) as D04CopperSkinDepthSuccess["assumptions"],
  });
}
