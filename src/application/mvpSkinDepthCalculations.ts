import {
  isContentAddressedSnapshotId,
  methodId,
  sourceRef,
} from "../domain/ids.js";
import {
  evaluateD04CopperSkinDepth,
  type D04CopperSkinDepthInput,
  type D04CopperSkinDepthOutcome,
  type D04CopperStateEvidence,
} from "../methods/D/d04CopperSkinDepth.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";

const D04_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("D-04"));

export const MVP_D04_METHOD_ID = "D-04" as const;

export const MVP_D04_CALCULATION_SCOPE = cloneAndDeepFreeze({
  scope: "controlled_runnable_mvp_skin_depth_adapter" as const,
  formalRuntimeActivationClaim: false as const,
  methodIds: [MVP_D04_METHOD_ID] as const,
  constraints: [
    "Copper resistivity and relative permeability are supplied explicitly; the adapter provides no material default.",
    "Both properties must be bound to one content-addressed copper-material snapshot and one declared temperature/frequency state.",
    "The result is the electromagnetic field-amplitude 1/e depth under the locally planar good-conductor model, never a thermal affected depth.",
    "The isolated evaluator retains its exact-schema, applicability, state, and binary64 fail-closed checks.",
  ] as const,
});

export interface MvpD04LocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface MvpD04PropertyEvidenceInput {
  readonly materialSnapshotId: string;
  readonly materialDisplayName: string;
  readonly propertyTemperatureK: number;
  readonly propertyFrequencyHz: number;
  readonly sameMaterialStateConfirmed: true;
  readonly resistivitySourceRef: string;
  readonly relativePermeabilitySourceRef: string;
}

export interface MvpD04CalculationInput {
  readonly methodId: typeof MVP_D04_METHOD_ID;
  readonly frequencyHz: number;
  readonly resistivityOhmM: number;
  readonly relativePermeability: number;
  readonly state: D04CopperStateEvidence;
  readonly propertyEvidence: MvpD04PropertyEvidenceInput;
}

export interface MvpD04CalculationOutput {
  readonly outputId: "copper_skin_depth";
  readonly label: MvpD04LocalizedText;
  readonly value: number;
  readonly canonicalUnit: "m";
  readonly suggestedDisplayUnit: "mm";
  readonly interpretation: MvpD04LocalizedText;
}

export interface MvpD04CalculationWarning {
  readonly severity: "limitation";
  readonly message: MvpD04LocalizedText;
}

export interface MvpD04SourceTitle {
  readonly kind: "method_basis" | "physical_constant" | "property_evidence";
  readonly title: MvpD04LocalizedText;
}

export interface MvpD04CalculationFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpD04CalculationResult {
  /** Internal dispatch metadata. The ordinary UI must not render this value. */
  readonly methodId: typeof MVP_D04_METHOD_ID;
  readonly methodVersion: string;
  readonly approvalStatus: "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success_with_warnings"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly MvpD04CalculationOutput[];
  readonly warnings: readonly MvpD04CalculationWarning[];
  readonly sourceTitles: readonly MvpD04SourceTitle[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly domain: MvpD04LocalizedText;
  }>;
  readonly assumptions: readonly MvpD04LocalizedText[];
  readonly failure: MvpD04CalculationFailure | null;
}

const D04_INPUT_KEYS = Object.freeze([
  "methodId",
  "frequencyHz",
  "resistivityOhmM",
  "relativePermeability",
  "state",
  "propertyEvidence",
] as const);

const D04_PROPERTY_EVIDENCE_KEYS = Object.freeze([
  "materialSnapshotId",
  "materialDisplayName",
  "propertyTemperatureK",
  "propertyFrequencyHz",
  "sameMaterialStateConfirmed",
  "resistivitySourceRef",
  "relativePermeabilitySourceRef",
] as const);

const D04_DOMAIN = Object.freeze({
  zh: "线性、均匀、各向同性的铜良导体；正弦稳态；局部平面半无限近似；材料属性与计算状态一致。",
  en: "Linear homogeneous isotropic copper in sinusoidal steady state under the locally planar semi-infinite good-conductor approximation, with state-matched properties.",
});

const D04_WARNINGS = Object.freeze([
  Object.freeze({
    severity: "limitation" as const,
    message: Object.freeze({
      zh: "结果表示电磁场幅值降至初始值 1/e 的参考深度，不是温度变化深度或实际淬硬层深度。",
      en: "This is the electromagnetic field-amplitude 1/e reference depth, not a thermal penetration depth or case-hardening depth.",
    }),
  }),
  Object.freeze({
    severity: "limitation" as const,
    message: Object.freeze({
      zh: "该结果只适用于已确认的正弦稳态、线性良导体和局部平面近似；复杂边缘、邻近效应或非线性状态不在本计算范围内。",
      en: "The result is limited to the confirmed sinusoidal, linear-good-conductor, locally planar model; edge, proximity, and nonlinear effects are outside this calculation.",
    }),
  }),
] as const satisfies readonly MvpD04CalculationWarning[]);

const D04_ASSUMPTIONS = Object.freeze([
  Object.freeze({
    zh: "铜材在所填状态下按线性、均匀、各向同性良导体处理。",
    en: "Copper is treated as a linear homogeneous isotropic good conductor at the declared state.",
  }),
  Object.freeze({
    zh: "激励为正弦稳态，且采用局部平面半无限导体参考模型。",
    en: "Excitation is sinusoidal steady state and the locally planar semi-infinite reference model is used.",
  }),
  Object.freeze({
    zh: "电阻率和相对磁导率来自同一铜材、温度与频率状态。",
    en: "Resistivity and relative permeability belong to the same copper, temperature, and frequency state.",
  }),
] as const satisfies readonly MvpD04LocalizedText[]);

const D04_SOURCE_TITLES = Object.freeze([
  Object.freeze({
    kind: "method_basis" as const,
    title: Object.freeze({
      zh: "铜良导体电磁趋肤深度受控计算依据",
      en: "Controlled electromagnetic skin-depth basis for copper good conductors",
    }),
  }),
  Object.freeze({
    kind: "method_basis" as const,
    title: Object.freeze({
      zh: "经典电磁场理论中的正弦良导体趋肤关系",
      en: "Classical electromagnetic theory for sinusoidal good-conductor skin depth",
    }),
  }),
  Object.freeze({
    kind: "physical_constant" as const,
    title: Object.freeze({
      zh: "CODATA 2022 真空磁导率",
      en: "CODATA 2022 vacuum permeability",
    }),
  }),
  Object.freeze({
    kind: "property_evidence" as const,
    title: Object.freeze({
      zh: "用户提供并绑定到同一材料状态的铜电阻率来源",
      en: "User-supplied copper-resistivity source bound to the same material state",
    }),
  }),
  Object.freeze({
    kind: "property_evidence" as const,
    title: Object.freeze({
      zh: "用户提供并绑定到同一材料状态的铜相对磁导率来源",
      en: "User-supplied copper relative-permeability source bound to the same material state",
    }),
  }),
] as const satisfies readonly MvpD04SourceTitle[]);

function isStableSourceReference(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    sourceRef(value);
    return true;
  } catch {
    return false;
  }
}

function adapterFailure(
  status: "invalid_input" | "insufficient_data" | "not_applicable",
  code: string,
  message: string,
  action: string,
): MvpD04CalculationResult {
  return cloneAndDeepFreeze({
    methodId: MVP_D04_METHOD_ID,
    methodVersion: D04_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation" as const,
    formalRuntimeActivationClaim: false as const,
    status,
    outputs: [] as const,
    warnings: D04_WARNINGS,
    sourceTitles: D04_SOURCE_TITLES,
    applicability: {
      status: status === "not_applicable"
        ? ("out_of_domain" as const)
        : ("not_evaluated" as const),
      domain: D04_DOMAIN,
    },
    assumptions: [] as const,
    failure: { code, message, action },
  });
}

function normalizeOutcome(
  outcome: D04CopperSkinDepthOutcome,
): MvpD04CalculationResult {
  if (outcome.status !== "success") {
    return adapterFailure(
      outcome.status,
      outcome.failure.code,
      outcome.failure.message,
      outcome.failure.action,
    );
  }
  return cloneAndDeepFreeze({
    methodId: MVP_D04_METHOD_ID,
    methodVersion: D04_SPECIFICATION.methodVersion,
    approvalStatus: "approved_with_limitation" as const,
    formalRuntimeActivationClaim: false as const,
    status: "success_with_warnings" as const,
    outputs: [
      {
        outputId: "copper_skin_depth" as const,
        label: {
          zh: "铜导体电磁趋肤深度",
          en: "Copper electromagnetic skin depth",
        },
        value: outcome.value.skinDepthM,
        canonicalUnit: "m" as const,
        suggestedDisplayUnit: "mm" as const,
        interpretation: {
          zh: "电磁场幅值降至初始值 1/e 的深度",
          en: "Depth at which electromagnetic field amplitude falls to 1/e of its surface value",
        },
      },
    ],
    warnings: D04_WARNINGS,
    sourceTitles: D04_SOURCE_TITLES,
    applicability: {
      status: "in_domain" as const,
      domain: D04_DOMAIN,
    },
    assumptions: D04_ASSUMPTIONS,
    failure: null,
  });
}

/**
 * Narrow runnable adapter for copper skin depth. It does not activate the
 * formal registry and never supplies copper property defaults.
 */
export function calculateMvpD04(
  input: MvpD04CalculationInput | unknown,
): MvpD04CalculationResult {
  if (D04_SPECIFICATION.approvalStatus !== "approved_with_limitation") {
    throw new Error("The controlled copper skin-depth method is not approved for this adapter.");
  }
  const record = readExactPlainDataRecord(input, D04_INPUT_KEYS);
  if (record === null || record.methodId !== MVP_D04_METHOD_ID) {
    return adapterFailure(
      "invalid_input",
      "MVP-D-04.input_schema_invalid",
      "Copper skin-depth input must use the exact controlled application schema.",
      "Provide every declared field as plain data and remove extra fields or accessors.",
    );
  }
  const evidence = readExactPlainDataRecord(
    record.propertyEvidence,
    D04_PROPERTY_EVIDENCE_KEYS,
  );
  if (evidence === null) {
    const absent = record.propertyEvidence === null || record.propertyEvidence === undefined;
    return adapterFailure(
      absent ? "insufficient_data" : "invalid_input",
      absent
        ? "MVP-D-04.property_evidence_missing"
        : "MVP-D-04.property_evidence_schema_invalid",
      absent
        ? "Material and property-source evidence is required before copper skin depth can be calculated."
        : "Material and property-source evidence must use the exact controlled plain-data schema.",
      "Provide one content-addressed copper-material snapshot, matching state values, and stable source references for both properties.",
    );
  }
  if (
    !isContentAddressedSnapshotId(evidence.materialSnapshotId, "material") ||
    typeof evidence.materialDisplayName !== "string" ||
    evidence.materialDisplayName.trim().length === 0 ||
    typeof evidence.propertyTemperatureK !== "number" ||
    !Number.isFinite(evidence.propertyTemperatureK) ||
    evidence.propertyTemperatureK <= 0 ||
    typeof evidence.propertyFrequencyHz !== "number" ||
    !Number.isFinite(evidence.propertyFrequencyHz) ||
    evidence.propertyFrequencyHz <= 0 ||
    evidence.sameMaterialStateConfirmed !== true ||
    !isStableSourceReference(evidence.resistivitySourceRef) ||
    !isStableSourceReference(evidence.relativePermeabilitySourceRef)
  ) {
    return adapterFailure(
      "invalid_input",
      "MVP-D-04.property_evidence_invalid",
      "Copper property evidence is malformed or lacks stable source and material bindings.",
      "Correct the material snapshot, positive state values, confirmation, and both stable property source references.",
    );
  }

  const state = readExactPlainDataRecord(record.state, [
    "materialClass",
    "propertyStateMatch",
    "temperatureK",
    "constitutiveRegime",
    "excitation",
    "fieldModel",
  ]);
  if (
    state !== null &&
    typeof state.temperatureK === "number" &&
    typeof record.frequencyHz === "number" &&
    (evidence.propertyTemperatureK !== state.temperatureK ||
      evidence.propertyFrequencyHz !== record.frequencyHz)
  ) {
    return adapterFailure(
      "insufficient_data",
      "MVP-D-04.property_state_mismatch",
      "The property evidence temperature or frequency does not match the declared calculation state.",
      "Resolve both property snapshots at the exact calculation temperature and frequency; no cold-property fallback is allowed.",
    );
  }

  const evaluatorInput: D04CopperSkinDepthInput = {
    frequencyHz: record.frequencyHz as number,
    resistivityOhmM: record.resistivityOhmM as number,
    relativePermeability: record.relativePermeability as number,
    state: record.state as D04CopperStateEvidence,
  };
  return normalizeOutcome(evaluateD04CopperSkinDepth(evaluatorInput));
}
