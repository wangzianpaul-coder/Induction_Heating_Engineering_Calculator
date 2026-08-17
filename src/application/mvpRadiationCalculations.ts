import { methodId } from "../domain/ids.js";
import {
  calculateJ03GrayBodyRadiation,
  type J03BoundaryEvidenceInput,
  type J03Configuration,
  type J03CounterpartInput,
  type J03GrayBodyRadiationOutcome,
  type J03RadiatingSurfaceInput,
} from "../methods/J/j03GrayBodyRadiation.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";

const J03_SPECIFICATION = METHOD_SPECIFICATION_REGISTRY.get(methodId("J-03"));

export const MVP_J03_METHOD_ID = "J-03" as const;

export const MVP_J03_CALCULATION_SCOPE = cloneAndDeepFreeze({
  scope: "controlled_runnable_mvp_radiation_adapter" as const,
  formalRuntimeActivationClaim: false as const,
  methodIds: [MVP_J03_METHOD_ID] as const,
  constraints: [
    "Surface emissivity is supplied explicitly with a content-addressed material snapshot and source reference; no emissivity default is supplied.",
    "Only a view factor of one is supported, and it must be explicitly confirmed with no unmodelled openings or obstructions.",
    "The long-concentric route requires surface 1 to be the inner surface and end effects to be negligible.",
    "Every evaluator exact-schema, state, topology, and binary64 fail-closed check remains active.",
  ] as const,
});

export interface MvpJ03LocalizedText {
  readonly zh: string;
  readonly en: string;
}

export interface MvpJ03CalculationInput {
  readonly methodId: typeof MVP_J03_METHOD_ID;
  readonly configuration: J03Configuration;
  readonly surface1: J03RadiatingSurfaceInput;
  readonly counterpart: J03CounterpartInput;
  readonly boundaryEvidence: J03BoundaryEvidenceInput;
}

export interface MvpJ03CalculationOutput {
  readonly outputId: "radiative_heat_rate" | "radiation_network_factor";
  readonly label: MvpJ03LocalizedText;
  readonly value: number;
  readonly canonicalUnit: "W" | "one";
  readonly interpretation: MvpJ03LocalizedText;
}

export interface MvpJ03SourceTitle {
  readonly kind: "method_basis" | "standard" | "physical_constant" | "property_evidence";
  readonly title: MvpJ03LocalizedText;
}

export interface MvpJ03CalculationWarning {
  readonly severity: "warning";
  readonly message: MvpJ03LocalizedText;
}

export interface MvpJ03CalculationFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpJ03CalculationResult {
  /** Internal dispatch metadata. The ordinary UI must not render this value. */
  readonly methodId: typeof MVP_J03_METHOD_ID;
  readonly methodVersion: string;
  readonly approvalStatus: "approved";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly MvpJ03CalculationOutput[];
  readonly warnings: readonly MvpJ03CalculationWarning[];
  readonly sourceTitles: readonly MvpJ03SourceTitle[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly domain: MvpJ03LocalizedText;
  }>;
  readonly assumptions: readonly MvpJ03LocalizedText[];
  readonly failure: MvpJ03CalculationFailure | null;
}

const J03_INPUT_KEYS = Object.freeze([
  "methodId",
  "configuration",
  "surface1",
  "counterpart",
  "boundaryEvidence",
] as const);

const J03_DOMAIN = Object.freeze({
  zh: "仅适用于无未建模开口或遮挡、视角系数明确为 1 的大环境辐射，或端部影响可忽略的长同心双灰体表面。",
  en: "Limited to unobstructed large-surroundings radiation with an explicit view factor of one, or a long concentric two-gray-surface enclosure with negligible end effects.",
});

const J03_SOURCE_TITLES = Object.freeze([
  Object.freeze({
    kind: "method_basis" as const,
    title: Object.freeze({
      zh: "灰体表面热辐射受控计算依据",
      en: "Controlled gray-body surface-radiation calculation basis",
    }),
  }),
  Object.freeze({
    kind: "standard" as const,
    title: Object.freeze({
      zh: "GB 8175 附录 A 辐射换热关系",
      en: "GB 8175 Annex A radiation heat-transfer relation",
    }),
  }),
  Object.freeze({
    kind: "physical_constant" as const,
    title: Object.freeze({
      zh: "CODATA 2022 Stefan–Boltzmann 常数",
      en: "CODATA 2022 Stefan-Boltzmann constant",
    }),
  }),
  Object.freeze({
    kind: "property_evidence" as const,
    title: Object.freeze({
      zh: "用户提供并绑定到材料状态的表面发射率来源",
      en: "User-supplied surface-emissivity source bound to the material state",
    }),
  }),
] as const satisfies readonly MvpJ03SourceTitle[]);

function adapterFailure(
  status: "invalid_input" | "insufficient_data" | "not_applicable",
  code: string,
  message: string,
  action: string,
): MvpJ03CalculationResult {
  return cloneAndDeepFreeze({
    methodId: MVP_J03_METHOD_ID,
    methodVersion: J03_SPECIFICATION.methodVersion,
    approvalStatus: "approved" as const,
    formalRuntimeActivationClaim: false as const,
    status,
    outputs: [] as const,
    warnings: [] as const,
    sourceTitles: J03_SOURCE_TITLES,
    applicability: {
      status: status === "not_applicable"
        ? ("out_of_domain" as const)
        : ("not_evaluated" as const),
      domain: J03_DOMAIN,
    },
    assumptions: [] as const,
    failure: { code, message, action },
  });
}

function assumptionsFor(
  configuration: J03Configuration,
): readonly MvpJ03LocalizedText[] {
  if (configuration === "radiation_to_large_surroundings") {
    return Object.freeze([
      Object.freeze({
        zh: "周围环境足够大，表面到环境的视角系数为 1。",
        en: "The surroundings are large and the surface-to-surroundings view factor is one.",
      }),
      Object.freeze({
        zh: "辐射表面在所填状态下按漫射灰体处理，且没有未建模开口或遮挡。",
        en: "The radiating surface is diffuse and gray at the declared state, with no unmodelled openings or obstructions.",
      }),
      Object.freeze({
        zh: "所有温度均使用绝对温标开尔文。",
        en: "All temperatures use the absolute kelvin scale.",
      }),
    ]);
  }
  return Object.freeze([
    Object.freeze({
      zh: "两个表面为长同心灰体表面，表面 1 位于内侧。",
      en: "The two surfaces are long concentric gray surfaces with surface 1 on the inside.",
    }),
    Object.freeze({
      zh: "从内表面到外表面的视角系数为 1，且端部、开口和遮挡影响可忽略。",
      en: "The inner-to-outer view factor is one and end, opening, and obstruction effects are negligible.",
    }),
    Object.freeze({
      zh: "所有温度均使用绝对温标开尔文。",
      en: "All temperatures use the absolute kelvin scale.",
    }),
  ]);
}

function normalizeOutcome(
  outcome: J03GrayBodyRadiationOutcome,
  configuration: J03Configuration,
): MvpJ03CalculationResult {
  if (outcome.status !== "success") {
    return adapterFailure(
      outcome.status,
      outcome.failure.code,
      outcome.failure.message,
      outcome.failure.action,
    );
  }
  return cloneAndDeepFreeze({
    methodId: MVP_J03_METHOD_ID,
    methodVersion: J03_SPECIFICATION.methodVersion,
    approvalStatus: "approved" as const,
    formalRuntimeActivationClaim: false as const,
    status: "success" as const,
    outputs: [
      {
        outputId: "radiative_heat_rate" as const,
        label: {
          zh: "净辐射换热量",
          en: "Net radiative heat rate",
        },
        value: outcome.value.heatRateW,
        canonicalUnit: "W" as const,
        interpretation: {
          zh: "正值表示热量由表面 1 传向另一表面或周围环境；负值表示方向相反。",
          en: "Positive means heat flows from surface 1 to the counterpart or surroundings; negative means the reverse direction.",
        },
      },
      {
        outputId: "radiation_network_factor" as const,
        label: {
          zh: "辐射网络系数",
          en: "Radiation network factor",
        },
        value: outcome.value.networkFactor,
        canonicalUnit: "one" as const,
        interpretation: {
          zh: "由表面发射率、面积关系和所选辐射边界共同决定的无量纲系数。",
          en: "Dimensionless factor determined by surface emissivities, area relation, and the selected radiation boundary.",
        },
      },
    ],
    warnings: [] as const,
    sourceTitles: J03_SOURCE_TITLES,
    applicability: {
      status: "in_domain" as const,
      domain: J03_DOMAIN,
    },
    assumptions: assumptionsFor(configuration),
    failure: null,
  });
}

/**
 * Narrow runnable adapter for the two frozen gray-body radiation networks. It
 * does not activate the formal registry or infer emissivity/view-factor data.
 */
export function calculateMvpJ03(
  input: MvpJ03CalculationInput | unknown,
): MvpJ03CalculationResult {
  if (J03_SPECIFICATION.approvalStatus !== "approved") {
    throw new Error("The controlled gray-body radiation method is not approved for this adapter.");
  }
  const record = readExactPlainDataRecord(input, J03_INPUT_KEYS);
  if (record === null || record.methodId !== MVP_J03_METHOD_ID) {
    return adapterFailure(
      "invalid_input",
      "MVP-J-03.input_schema_invalid",
      "Gray-body radiation input must use the exact controlled application schema.",
      "Provide every declared field as plain data and remove extra fields or accessors.",
    );
  }
  const evaluatorInput = {
    configuration: record.configuration,
    surface1: record.surface1,
    counterpart: record.counterpart,
    boundaryEvidence: record.boundaryEvidence,
  };
  const outcome = calculateJ03GrayBodyRadiation(evaluatorInput);
  const configuration =
    record.configuration === "long_concentric_two_gray_surfaces"
      ? "long_concentric_two_gray_surfaces"
      : "radiation_to_large_surroundings";
  return normalizeOutcome(outcome, configuration);
}
