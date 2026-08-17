import type { LoadedState, QuantityBasis } from "../domain/electrical.js";
import { methodId } from "../domain/ids.js";
import {
  F01_ASSUMPTIONS,
  F01_CONTRACT_SOURCE_REFS,
  F01_DERIVATION_REFS,
  F01_METHOD_CHECK_IDS,
  F01_METHOD_ID,
  F01_METHOD_VERSION,
  F01_SOURCE_REFS,
  F01_VALIDATION_CASE_IDS,
  evaluateF01ReflectedImpedance,
  type F01ModelRegime,
  type F01ParameterSourceKind,
  type F01ReflectedImpedanceInput,
  type F01ReflectedImpedanceOutcome,
  type F01StateMatch,
} from "../methods/F/f01ReflectedImpedance.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";

export const MVP_EQUIVALENT_METHOD_IDS = Object.freeze(["F-01"] as const);
export type MvpEquivalentMethodId =
  (typeof MVP_EQUIVALENT_METHOD_IDS)[number];

const SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("F-01"));
if (
  SPECIFICATION.approvalStatus !== "approved_with_limitation" ||
  SPECIFICATION.recommendationEligibility !== "not_eligible" ||
  typeof SPECIFICATION.recommendationReason !== "string" ||
  SPECIFICATION.recommendationReason.length === 0
) {
  throw new Error("F-01 MVP adapter requires the frozen limited/not-eligible specification.");
}

/**
 * A narrow application adapter over the reviewed F-01 evaluator. This does not
 * activate F-01 in the formal Gate-0 runtime registry.
 */
export const MVP_EQUIVALENT_CALCULATION_SCOPE = cloneAndDeepFreeze({
  scope: "phase_5b_controlled_mvp_adapter" as const,
  formalRuntimeActivationClaim: false as const,
  methodIds: MVP_EQUIVALENT_METHOD_IDS,
  constraints: [
    "R1, Lp, R2, Ls, M, and f must be supplied explicitly in canonical SI units for one declared coupled-circuit state.",
    "The adapter never estimates mutual inductance from geometry and rejects geometry_guess_or_unproven provenance.",
    "F-01 results are estimated and are not eligible to be Recommended; F-02 same-state measurement is preferred for actual equipment.",
    "Every evaluator input, applicability, passivity, provenance, and binary64 representability check remains fail-closed.",
  ] as const,
});

export interface MvpF01CalculationInput {
  /** R1 in canonical SI ohms. */
  readonly primaryResistanceOhm: number;
  /** Lp in canonical SI henries. */
  readonly primaryInductanceH: number;
  /** R2 in canonical SI ohms. */
  readonly secondaryResistanceOhm: number;
  /** Ls in canonical SI henries. */
  readonly secondaryInductanceH: number;
  /** Signed M in canonical SI henries; no geometry inference is performed. */
  readonly mutualInductanceH: number;
  /** One shared operating frequency in canonical SI hertz. */
  readonly frequencyHz: number;
  readonly primaryPortId: string;
  readonly secondaryPortId: string;
  readonly primaryReferencePlaneId: string;
  readonly secondaryReferencePlaneId: string;
  readonly quantityBasis: QuantityBasis;
  readonly loadedState: LoadedState;
  readonly primaryMaterialStateId: string;
  readonly secondaryMaterialStateId: string;
  readonly primaryTemperatureK: number;
  readonly secondaryTemperatureK: number;
  readonly caseSnapshotId: string;
  readonly primaryMaterialSnapshotId: string;
  readonly secondaryMaterialSnapshotId: string;
  readonly coupledCircuitStateId: string;
  readonly primaryParameterSourceKind: F01ParameterSourceKind;
  readonly secondaryParameterSourceKind: F01ParameterSourceKind;
  readonly mutualParameterSourceKind: F01ParameterSourceKind;
  readonly primarySourceRef: string;
  readonly secondarySourceRef: string;
  readonly mutualSourceRef: string;
  readonly primaryStateMatch: F01StateMatch;
  readonly secondaryStateMatch: F01StateMatch;
  readonly mutualStateMatch: F01StateMatch;
  readonly modelRegime: F01ModelRegime;
}

export interface MvpEquivalentLocalizedLabel {
  readonly en: string;
  readonly zh: string;
}

export interface MvpEquivalentComplexValue {
  readonly real: number;
  readonly imaginary: number;
}

export interface MvpEquivalentCalculationOutput {
  readonly outputId: "Zin" | "Req" | "Rref" | "Leq" | "k";
  readonly label: MvpEquivalentLocalizedLabel;
  readonly value: number | MvpEquivalentComplexValue;
  readonly unit: "ohm" | "H" | "one";
}

export interface MvpEquivalentCalculationFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpEquivalentCalculationResult {
  readonly methodId: MvpEquivalentMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly MvpEquivalentCalculationOutput[];
  readonly warnings: readonly [];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly domain: string;
  }>;
  readonly resultProvenance: "estimated" | null;
  readonly recommendation: Readonly<{
    readonly eligibility: "not_eligible";
    readonly isRecommended: false;
    readonly preferredActualEquipmentMethodId: "F-02";
    readonly reason: string;
  }>;
  readonly limitations: readonly string[];
  readonly failure: MvpEquivalentCalculationFailure | null;
}

const INPUT_KEYS = Object.freeze([
  "primaryResistanceOhm",
  "primaryInductanceH",
  "secondaryResistanceOhm",
  "secondaryInductanceH",
  "mutualInductanceH",
  "frequencyHz",
  "primaryPortId",
  "secondaryPortId",
  "primaryReferencePlaneId",
  "secondaryReferencePlaneId",
  "quantityBasis",
  "loadedState",
  "primaryMaterialStateId",
  "secondaryMaterialStateId",
  "primaryTemperatureK",
  "secondaryTemperatureK",
  "caseSnapshotId",
  "primaryMaterialSnapshotId",
  "secondaryMaterialSnapshotId",
  "coupledCircuitStateId",
  "primaryParameterSourceKind",
  "secondaryParameterSourceKind",
  "mutualParameterSourceKind",
  "primarySourceRef",
  "secondarySourceRef",
  "mutualSourceRef",
  "primaryStateMatch",
  "secondaryStateMatch",
  "mutualStateMatch",
  "modelRegime",
] as const);

const EMPTY = Object.freeze([]) as readonly [];
const INVALID_EVALUATOR_INPUT = Object.freeze({});

const SOURCES = cloneAndDeepFreeze(
  Array.from(
    new Set<string>([
      ...F01_SOURCE_REFS,
      ...F01_CONTRACT_SOURCE_REFS,
      ...F01_DERIVATION_REFS,
      ...F01_VALIDATION_CASE_IDS,
      ...F01_METHOD_CHECK_IDS,
    ]),
  ),
);

const RECOMMENDATION = cloneAndDeepFreeze({
  eligibility: "not_eligible" as const,
  isRecommended: false as const,
  preferredActualEquipmentMethodId: "F-02" as const,
  reason: SPECIFICATION.recommendationReason,
});

const LIMITATIONS = cloneAndDeepFreeze([
  "The result is an analytical estimate for a linear lumped two-winding sinusoidal steady-state model.",
  "F-01 is not eligible to be Recommended; use F-02 same-state measurement when actual-equipment data are available.",
  "Mutual inductance M must have explicit same-state provenance and is never guessed from geometry.",
] as const);

function label(en: string, zh: string): MvpEquivalentLocalizedLabel {
  return { en, zh };
}

function scalarOutput(
  outputId: "Req" | "Rref" | "Leq" | "k",
  outputLabel: MvpEquivalentLocalizedLabel,
  value: number,
  unit: "ohm" | "H" | "one",
): MvpEquivalentCalculationOutput {
  return { outputId, label: outputLabel, value, unit };
}

function normalize(
  outcome: F01ReflectedImpedanceOutcome,
): MvpEquivalentCalculationResult {
  if (outcome.status !== "success") {
    return cloneAndDeepFreeze({
      methodId: F01_METHOD_ID,
      methodVersion: F01_METHOD_VERSION,
      approvalStatus: "approved_with_limitation" as const,
      formalRuntimeActivationClaim: false as const,
      status: outcome.status,
      outputs: EMPTY,
      warnings: EMPTY,
      assumptions: EMPTY,
      sources: SOURCES,
      applicability: {
        status: outcome.applicabilityStatus,
        domain: SPECIFICATION.applicabilityDomain,
      },
      resultProvenance: null,
      recommendation: RECOMMENDATION,
      limitations: LIMITATIONS,
      failure: outcome.failure,
    });
  }

  return cloneAndDeepFreeze({
    methodId: F01_METHOD_ID,
    methodVersion: F01_METHOD_VERSION,
    approvalStatus: "approved_with_limitation" as const,
    formalRuntimeActivationClaim: false as const,
    status: "success" as const,
    outputs: [
      {
        outputId: "Zin" as const,
        label: label("Input impedance", "输入阻抗"),
        value: {
          real: outcome.value.Zin.valueSi.realOhm,
          imaginary: outcome.value.Zin.valueSi.imaginaryOhm,
        },
        unit: outcome.value.Zin.canonicalUnitId,
      },
      scalarOutput(
        "Req",
        label("Equivalent input resistance", "等效输入电阻"),
        outcome.value.Req.valueSi,
        outcome.value.Req.canonicalUnitId,
      ),
      scalarOutput(
        "Rref",
        label("Reflected resistance", "反射电阻"),
        outcome.value.Rref.valueSi,
        outcome.value.Rref.canonicalUnitId,
      ),
      scalarOutput(
        "Leq",
        label("Equivalent input inductance", "等效输入电感"),
        outcome.value.Leq.valueSi,
        outcome.value.Leq.canonicalUnitId,
      ),
      scalarOutput(
        "k",
        label("Coupling coefficient", "耦合系数"),
        outcome.value.k.valueSi,
        outcome.value.k.canonicalUnitId,
      ),
    ],
    warnings: EMPTY,
    assumptions: [...F01_ASSUMPTIONS],
    sources: SOURCES,
    applicability: {
      status: outcome.applicabilityStatus,
      domain: SPECIFICATION.applicabilityDomain,
    },
    resultProvenance: outcome.resultProvenance,
    recommendation: RECOMMENDATION,
    limitations: LIMITATIONS,
    failure: null,
  });
}

/** Evaluate the controlled application-level F-01 reflected-impedance route. */
export function calculateMvpF01(
  input: MvpF01CalculationInput,
): MvpEquivalentCalculationResult {
  const record = readExactPlainDataRecord(input, INPUT_KEYS);
  if (record === null) {
    return normalize(
      evaluateF01ReflectedImpedance(
        INVALID_EVALUATOR_INPUT as unknown as F01ReflectedImpedanceInput,
      ),
    );
  }

  const sharedState = {
    frequencyHz: record.frequencyHz as number,
    quantityBasis: record.quantityBasis as QuantityBasis,
    loadedState: record.loadedState as LoadedState,
    caseSnapshotId: record.caseSnapshotId as string,
    coupledCircuitStateId: record.coupledCircuitStateId as string,
  };
  return normalize(evaluateF01ReflectedImpedance({
    primary: {
      resistanceOhm: record.primaryResistanceOhm as number,
      inductanceH: record.primaryInductanceH as number,
      portId: record.primaryPortId as string,
      referencePlaneId: record.primaryReferencePlaneId as string,
      materialStateId: record.primaryMaterialStateId as string,
      temperatureK: record.primaryTemperatureK as number,
      materialSnapshotId: record.primaryMaterialSnapshotId as string,
      parameterSourceKind:
        record.primaryParameterSourceKind as F01ParameterSourceKind,
      sourceRef: record.primarySourceRef as string,
      stateMatch: record.primaryStateMatch as F01StateMatch,
      ...sharedState,
    },
    secondary: {
      resistanceOhm: record.secondaryResistanceOhm as number,
      inductanceH: record.secondaryInductanceH as number,
      portId: record.secondaryPortId as string,
      referencePlaneId: record.secondaryReferencePlaneId as string,
      materialStateId: record.secondaryMaterialStateId as string,
      temperatureK: record.secondaryTemperatureK as number,
      materialSnapshotId: record.secondaryMaterialSnapshotId as string,
      parameterSourceKind:
        record.secondaryParameterSourceKind as F01ParameterSourceKind,
      sourceRef: record.secondarySourceRef as string,
      stateMatch: record.secondaryStateMatch as F01StateMatch,
      ...sharedState,
    },
    mutual: {
      mutualInductanceH: record.mutualInductanceH as number,
      primaryPortId: record.primaryPortId as string,
      secondaryPortId: record.secondaryPortId as string,
      primaryReferencePlaneId: record.primaryReferencePlaneId as string,
      secondaryReferencePlaneId: record.secondaryReferencePlaneId as string,
      primaryMaterialStateId: record.primaryMaterialStateId as string,
      secondaryMaterialStateId: record.secondaryMaterialStateId as string,
      primaryTemperatureK: record.primaryTemperatureK as number,
      secondaryTemperatureK: record.secondaryTemperatureK as number,
      primaryMaterialSnapshotId: record.primaryMaterialSnapshotId as string,
      secondaryMaterialSnapshotId: record.secondaryMaterialSnapshotId as string,
      parameterSourceKind:
        record.mutualParameterSourceKind as F01ParameterSourceKind,
      sourceRef: record.mutualSourceRef as string,
      stateMatch: record.mutualStateMatch as F01StateMatch,
      ...sharedState,
    },
    modelRegime: record.modelRegime as F01ModelRegime,
  }));
}
