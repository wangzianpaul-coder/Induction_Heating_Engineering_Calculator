import type { LoadedState } from "../domain/electrical.js";
import { methodId } from "../domain/ids.js";
import {
  evaluateB02AxialFillFactor,
  type B02AxialFillFactorInput,
  type B02AxialFillFactorOutcome,
} from "../methods/B/b02AxialFillFactor.js";
import {
  evaluateD01ConductorPathLength,
  type D01ConductorPathLengthInput,
  type D01ConductorPathLengthOutcome,
} from "../methods/D/d01ConductorPathLength.js";
import {
  evaluateD03DcResistance,
  type D03DcResistanceInput,
  type D03DcResistanceOutcome,
  type D03SeriesExtraResistance,
} from "../methods/D/d03DcResistance.js";
import {
  evaluateD07SeriesPortParameters,
  type D07SeriesPortParametersInput,
  type D07SeriesPortParametersOutcome,
} from "../methods/D/d07SeriesPortParameters.js";
import { readExactPlainDataRecord } from "../methods/controlledInput.js";
import { cloneAndDeepFreeze } from "../registries/immutableRegistry.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../registries/methodSpecificationRegistry.js";

export const MVP_EM_METHOD_IDS = Object.freeze([
  "B-02",
  "D-01",
  "D-03",
  "D-07",
] as const);

export type MvpEmMethodId = (typeof MVP_EM_METHOD_IDS)[number];

/**
 * A deliberately narrow application allowlist over isolated, reviewed
 * evaluators. It is not a claim that the frozen Gate-0 runtime registry has
 * been activated.
 */
export const MVP_EM_CALCULATION_SCOPE = cloneAndDeepFreeze({
  scope: "phase_5b_controlled_mvp_adapter" as const,
  formalRuntimeActivationClaim: false as const,
  methodIds: MVP_EM_METHOD_IDS,
  constraints: [
    "No material property, geometry, path, resistance, inductance, current, or applicability default is supplied.",
    "Every evaluator retains its original fail-closed input, applicability, state, and numeric checks.",
    "D-07 exposes only the exact series-port outputs; its diagnostic inductive-only approximation is excluded from this MVP surface.",
  ] as const,
});

export interface MvpEmLocalizedLabel {
  readonly en: string;
  readonly zh: string;
}

export interface MvpEmComplexValue {
  readonly real: number;
  readonly imaginary: number;
}

export interface MvpEmCalculationOutput {
  readonly outputId: string;
  readonly label: MvpEmLocalizedLabel;
  readonly status: "available" | "unavailable";
  readonly value: number | MvpEmComplexValue | null;
  /** Canonical unit ID. Null is retained where the evaluator forbids a unit placeholder. */
  readonly unit: string | null;
  readonly reason: string | null;
}

export interface MvpEmCalculationWarning {
  /** Existing evaluator warning code, or null when only a frozen predicate exists. */
  readonly code: string | null;
  readonly predicate: string | null;
  readonly message: string;
}

export interface MvpEmCalculationFailure {
  readonly code: string;
  readonly message: string;
  readonly action: string;
}

export interface MvpEmCalculationResult {
  readonly methodId: MvpEmMethodId;
  readonly methodVersion: string;
  readonly approvalStatus: "approved" | "approved_with_limitation";
  readonly formalRuntimeActivationClaim: false;
  readonly status:
    | "success"
    | "success_with_warnings"
    | "invalid_input"
    | "insufficient_data"
    | "not_applicable";
  readonly outputs: readonly MvpEmCalculationOutput[];
  readonly warnings: readonly MvpEmCalculationWarning[];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly applicability: Readonly<{
    readonly status: "in_domain" | "out_of_domain" | "not_evaluated";
    readonly domain: string;
  }>;
  readonly failure: MvpEmCalculationFailure | null;
}

export interface MvpB02CalculationInput {
  readonly electricalTurnCount: number;
  readonly conductorAxialSizeM: number;
  readonly windingEnvelopeLengthM: number;
  readonly windingClass: "uniform_single_layer" | "multilayer" | "other";
  readonly envelopeDefinition:
    | "ADR-0003_full_axial_envelope"
    | "other_or_unknown";
  readonly identicalTurnSections: boolean;
  readonly nonOverlappingAxialProjection: boolean;
}

export interface MvpD01CalculationInput {
  readonly meanMechanicalPathDiameterM: number;
  readonly helixRevolutionCount: number;
  readonly helixAxialAdvanceM: number;
  readonly leadSegmentLengthsM: readonly number[] | null;
  readonly busSegmentLengthsM: readonly number[] | null;
  readonly pathGeometry:
    | "uniform_cylindrical_helix"
    | "noncircular_or_multilayer"
    | "other_or_unknown";
  readonly meanDiameterBasis:
    | "mechanical_or_cad_conductor_center_path"
    | "electromagnetic_effective_current_path"
    | "other_or_unknown";
  readonly revolutionCountBasis:
    | "actual_mechanical_or_cad_path"
    | "guessed_from_electrical_turn_count"
    | "other_or_unknown";
  readonly axialAdvanceBasis:
    | "actual_path_endpoint_advance"
    | "guessed_from_turn_center_span"
    | "other_or_unknown";
  readonly turnCenterSpanConsistency:
    | "consistent"
    | "inconsistent"
    | "not_available";
}

export interface MvpD03SeriesExtraResistance {
  readonly componentId: string;
  readonly componentKind: "joint" | "braze" | "busbar" | "lead" | "other";
  readonly resistanceOhm: number;
  readonly sourceRef: string;
  readonly duplicationEvidence:
    | "confirmed_unique_and_excluded_from_conductor_term"
    | "already_included_or_duplicated"
    | "unconfirmed";
}

export interface MvpD03CalculationInput {
  readonly conductorLengthM: number;
  readonly metalAreaM2: number;
  readonly resistivityOhmM: number;
  readonly resistivityMaterialId: string;
  readonly resistivityTemperatureK: number;
  readonly resistivitySourceRef: string;
  readonly resistivityStateMatch:
    | "same_material_temperature_as_conductor"
    | "cold_or_other_material_state"
    | "unconfirmed";
  readonly materialDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly metalAreaDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly temperatureDistribution: "uniform" | "spatially_varying" | "unknown";
  readonly conductorMaterialId: string;
  readonly conductorTemperatureK: number;
  readonly resistanceBoundary:
    | "conductor_body_only_excludes_series_extras"
    | "includes_series_extras_or_terminal_measurement"
    | "unknown";
  readonly seriesExtraResistances:
    | readonly MvpD03SeriesExtraResistance[]
    | null;
  readonly seriesBoundaryCompleteness: "complete" | "unknown_or_incomplete";
  readonly seriesBoundaryReferencePlane:
    | "terminal_equals_conductor_plus_listed_series_extras"
    | "other_or_unknown";
}

export interface MvpD07CalculationInput {
  readonly resistanceOhm: number;
  readonly inductanceH: number;
  readonly currentA: number;
  readonly frequencyHz: number;
  readonly portId: string;
  readonly referencePlaneId: string;
  readonly loadedState: LoadedState;
  readonly seriesEquivalentId: string;
  readonly quantityBasis: "rms" | "fundamental_rms";
  readonly portInterpretation: "coil_series_equivalent_port";
  readonly modelRegime: "linear_sinusoidal_steady_state";
}

const B02_KEYS = Object.freeze([
  "electricalTurnCount",
  "conductorAxialSizeM",
  "windingEnvelopeLengthM",
  "windingClass",
  "envelopeDefinition",
  "identicalTurnSections",
  "nonOverlappingAxialProjection",
] as const);

const D01_KEYS = Object.freeze([
  "meanMechanicalPathDiameterM",
  "helixRevolutionCount",
  "helixAxialAdvanceM",
  "leadSegmentLengthsM",
  "busSegmentLengthsM",
  "pathGeometry",
  "meanDiameterBasis",
  "revolutionCountBasis",
  "axialAdvanceBasis",
  "turnCenterSpanConsistency",
] as const);

const D03_KEYS = Object.freeze([
  "conductorLengthM",
  "metalAreaM2",
  "resistivityOhmM",
  "resistivityMaterialId",
  "resistivityTemperatureK",
  "resistivitySourceRef",
  "resistivityStateMatch",
  "materialDistribution",
  "metalAreaDistribution",
  "temperatureDistribution",
  "conductorMaterialId",
  "conductorTemperatureK",
  "resistanceBoundary",
  "seriesExtraResistances",
  "seriesBoundaryCompleteness",
  "seriesBoundaryReferencePlane",
] as const);

const D07_KEYS = Object.freeze([
  "resistanceOhm",
  "inductanceH",
  "currentA",
  "frequencyHz",
  "portId",
  "referencePlaneId",
  "loadedState",
  "seriesEquivalentId",
  "quantityBasis",
  "portInterpretation",
  "modelRegime",
] as const);

const INVALID_EVALUATOR_INPUT = Object.freeze({});

function label(en: string, zh: string): MvpEmLocalizedLabel {
  return Object.freeze({ en, zh });
}

function output(
  outputId: string,
  outputLabel: MvpEmLocalizedLabel,
  value: number | MvpEmComplexValue,
  unit: string,
): MvpEmCalculationOutput {
  return {
    outputId,
    label: outputLabel,
    status: "available",
    value,
    unit,
    reason: null,
  };
}

function unavailableOutput(
  outputId: string,
  outputLabel: MvpEmLocalizedLabel,
  unit: string | null,
  reason: string,
): MvpEmCalculationOutput {
  return {
    outputId,
    label: outputLabel,
    status: "unavailable",
    value: null,
    unit,
    reason,
  };
}

function sourcesFor(id: MvpEmMethodId): readonly string[] {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
  return Object.freeze(
    Array.from(
      new Set<string>([
        ...specification.sourceRefs,
        ...specification.contractSourceRefs,
      ]),
    ),
  );
}

function resultBase(
  id: MvpEmMethodId,
  outcome: {
    readonly status: MvpEmCalculationResult["status"];
    readonly applicabilityStatus: MvpEmCalculationResult["applicability"]["status"];
    readonly failure?: MvpEmCalculationFailure;
  },
  outputs: readonly MvpEmCalculationOutput[],
  warnings: readonly MvpEmCalculationWarning[],
  assumptions: readonly string[],
): MvpEmCalculationResult {
  const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId(id));
  if (
    specification.approvalStatus !== "approved" &&
    specification.approvalStatus !== "approved_with_limitation"
  ) {
    throw new Error(`MVP EM method ${id} is not approved.`);
  }
  return cloneAndDeepFreeze({
    methodId: id,
    methodVersion: specification.methodVersion,
    approvalStatus: specification.approvalStatus,
    formalRuntimeActivationClaim: false,
    status: outcome.status,
    outputs,
    warnings,
    assumptions,
    sources: sourcesFor(id),
    applicability: {
      status: outcome.applicabilityStatus,
      domain: specification.applicabilityDomain,
    },
    failure: outcome.failure ?? null,
  });
}

function normalizeB02(outcome: B02AxialFillFactorOutcome): MvpEmCalculationResult {
  if (outcome.status !== "success") {
    return resultBase("B-02", outcome, [], [], []);
  }
  return resultBase(
    "B-02",
    outcome,
    [
      output(
        "k_fill_axial",
        label("Axial fill factor", "轴向填充系数"),
        outcome.value.kFillAxial,
        outcome.value.canonicalUnitId,
      ),
    ],
    [],
    outcome.assumptions,
  );
}

function normalizeD01(outcome: D01ConductorPathLengthOutcome): MvpEmCalculationResult {
  if (outcome.status !== "success" && outcome.status !== "success_with_warnings") {
    return resultBase("D-01", outcome, [], [], []);
  }
  const value = outcome.value;
  const outputs: MvpEmCalculationOutput[] = [
    output("ell_helix", label("Helix path length", "螺旋路径长度"), value.helixLengthM, "m"),
    output(
      "ell_known_lower_bound",
      label("Known path lower bound", "已知路径下界"),
      value.knownPathLowerBoundM,
      "m",
    ),
    value.leadLengthM === null
      ? unavailableOutput("ell_lead", label("Lead path length", "引线路径长度"), "m", "leadSegmentLengthsM=null")
      : output("ell_lead", label("Lead path length", "引线路径长度"), value.leadLengthM, "m"),
    value.busLengthM === null
      ? unavailableOutput("ell_bus", label("Bus path length", "母排路径长度"), "m", "busSegmentLengthsM=null")
      : output("ell_bus", label("Bus path length", "母排路径长度"), value.busLengthM, "m"),
    value.totalLengthM === null
      ? unavailableOutput("ell_total", label("Total conductor path length", "导体总路径长度"), "m", "pathCompleteness=lower_bound_only")
      : output("ell_total", label("Total conductor path length", "导体总路径长度"), value.totalLengthM, "m"),
  ];
  return resultBase(
    "D-01",
    outcome,
    outputs,
    outcome.warnings.map((warning) => ({
      code: null,
      predicate: warning.predicate,
      message: warning.message,
    })),
    outcome.assumptions,
  );
}

function normalizeD03(outcome: D03DcResistanceOutcome): MvpEmCalculationResult {
  if (outcome.status !== "success" && outcome.status !== "success_with_warnings") {
    return resultBase("D-03", outcome, [], [], []);
  }
  const value = outcome.value;
  const outputs: MvpEmCalculationOutput[] = [
    output(
      "Rconductor_dc",
      label("Conductor DC resistance", "导体直流电阻"),
      value.RconductorDc.value,
      value.RconductorDc.canonicalUnitId,
    ),
  ];
  if (value.RterminalDc.kind === "available") {
    outputs.push(
      output(
        "Rterminal_dc",
        label("Terminal DC resistance", "端子直流电阻"),
        value.RterminalDc.value,
        value.RterminalDc.canonicalUnitId,
      ),
    );
  } else {
    outputs.push(
      unavailableOutput(
        "Rterminal_dc",
        label("Terminal DC resistance", "端子直流电阻"),
        null,
        value.RterminalDc.reason,
      ),
    );
  }
  return resultBase(
    "D-03",
    outcome,
    outputs,
    outcome.warnings.map((warning) => ({
      code: null,
      predicate: warning.predicate,
      message: warning.message,
    })),
    outcome.assumptions,
  );
}

function normalizeD07(outcome: D07SeriesPortParametersOutcome): MvpEmCalculationResult {
  if (outcome.status !== "success" && outcome.status !== "success_with_warnings") {
    return resultBase("D-07", outcome, [], [], []);
  }
  const value = outcome.value;
  const outputs: MvpEmCalculationOutput[] = [
    output("XL", label("Inductive reactance", "感抗"), value.XL.valueSi, value.XL.canonicalUnitId),
    output(
      "Zcomplex",
      label("Complex series impedance", "串联复阻抗"),
      {
        real: value.Zcomplex.valueSi.realOhm,
        imaginary: value.Zcomplex.valueSi.imaginaryOhm,
      },
      value.Zcomplex.canonicalUnitId,
    ),
    output("|Z|", label("Impedance magnitude", "阻抗幅值"), value["|Z|"].valueSi, value["|Z|"].canonicalUnitId),
    value.Qs.kind === "available"
      ? output("Qs", label("Series quality factor", "串联品质因数"), value.Qs.valueSi, value.Qs.canonicalUnitId)
      : unavailableOutput("Qs", label("Series quality factor", "串联品质因数"), null, value.Qs.reason),
    output("UR", label("Resistive voltage component", "电阻电压分量"), value.UR.valueSi, value.UR.canonicalUnitId),
    output("UX", label("Inductive voltage component", "感性电压分量"), value.UX.valueSi, value.UX.canonicalUnitId),
    output("Uterminal", label("Series-port terminal voltage", "串联端口端电压"), value.Uterminal.valueSi, value.Uterminal.canonicalUnitId),
  ];
  return resultBase(
    "D-07",
    outcome,
    outputs,
    outcome.warnings.map((warning) => ({
      code: warning.code,
      predicate: warning.guardedPredicateRef,
      message: warning.message,
    })),
    outcome.assumptions,
  );
}

export function calculateMvpB02(
  input: MvpB02CalculationInput,
): MvpEmCalculationResult {
  const record = readExactPlainDataRecord(input, B02_KEYS);
  const evaluatorInput: B02AxialFillFactorInput = record === null
    ? INVALID_EVALUATOR_INPUT as unknown as B02AxialFillFactorInput
    : {
        electricalTurnCount: record.electricalTurnCount as number,
        conductorAxialSizeM: record.conductorAxialSizeM as number,
        windingEnvelopeLengthM: record.windingEnvelopeLengthM as number,
        geometry: {
          windingClass: record.windingClass as B02AxialFillFactorInput["geometry"]["windingClass"],
          envelopeDefinition: record.envelopeDefinition as B02AxialFillFactorInput["geometry"]["envelopeDefinition"],
          identicalTurnSections: record.identicalTurnSections as boolean,
          nonOverlappingAxialProjection: record.nonOverlappingAxialProjection as boolean,
        },
      };
  return normalizeB02(evaluateB02AxialFillFactor(evaluatorInput));
}

export function calculateMvpD01(
  input: MvpD01CalculationInput,
): MvpEmCalculationResult {
  const record = readExactPlainDataRecord(input, D01_KEYS);
  const evaluatorInput: D01ConductorPathLengthInput = record === null
    ? INVALID_EVALUATOR_INPUT as unknown as D01ConductorPathLengthInput
    : {
        meanMechanicalPathDiameterM: record.meanMechanicalPathDiameterM as number,
        helixRevolutionCount: record.helixRevolutionCount as number,
        helixAxialAdvanceM: record.helixAxialAdvanceM as number,
        leadSegmentLengthsM: record.leadSegmentLengthsM as readonly number[] | null,
        busSegmentLengthsM: record.busSegmentLengthsM as readonly number[] | null,
        applicability: {
          pathGeometry: record.pathGeometry as D01ConductorPathLengthInput["applicability"]["pathGeometry"],
          meanDiameterBasis: record.meanDiameterBasis as D01ConductorPathLengthInput["applicability"]["meanDiameterBasis"],
          revolutionCountBasis: record.revolutionCountBasis as D01ConductorPathLengthInput["applicability"]["revolutionCountBasis"],
          axialAdvanceBasis: record.axialAdvanceBasis as D01ConductorPathLengthInput["applicability"]["axialAdvanceBasis"],
          turnCenterSpanConsistency: record.turnCenterSpanConsistency as D01ConductorPathLengthInput["applicability"]["turnCenterSpanConsistency"],
        },
      };
  return normalizeD01(evaluateD01ConductorPathLength(evaluatorInput));
}

export function calculateMvpD03(
  input: MvpD03CalculationInput,
): MvpEmCalculationResult {
  const record = readExactPlainDataRecord(input, D03_KEYS);
  const evaluatorInput: D03DcResistanceInput = record === null
    ? INVALID_EVALUATOR_INPUT as unknown as D03DcResistanceInput
    : {
        conductorLengthM: record.conductorLengthM as number,
        metalAreaM2: record.metalAreaM2 as number,
        resistivitySnapshot: {
          valueOhmM: record.resistivityOhmM as number,
          materialId: record.resistivityMaterialId as string,
          temperatureK: record.resistivityTemperatureK as number,
          sourceRef: record.resistivitySourceRef as string,
          stateMatch: record.resistivityStateMatch as D03DcResistanceInput["resistivitySnapshot"]["stateMatch"],
        },
        conductorEvidence: {
          materialDistribution: record.materialDistribution as D03DcResistanceInput["conductorEvidence"]["materialDistribution"],
          metalAreaDistribution: record.metalAreaDistribution as D03DcResistanceInput["conductorEvidence"]["metalAreaDistribution"],
          temperatureDistribution: record.temperatureDistribution as D03DcResistanceInput["conductorEvidence"]["temperatureDistribution"],
          materialId: record.conductorMaterialId as string,
          temperatureK: record.conductorTemperatureK as number,
          resistanceBoundary: record.resistanceBoundary as D03DcResistanceInput["conductorEvidence"]["resistanceBoundary"],
        },
        seriesExtraResistances: record.seriesExtraResistances as readonly D03SeriesExtraResistance[] | null,
        seriesBoundary: {
          completeness: record.seriesBoundaryCompleteness as D03DcResistanceInput["seriesBoundary"]["completeness"],
          referencePlane: record.seriesBoundaryReferencePlane as D03DcResistanceInput["seriesBoundary"]["referencePlane"],
        },
      };
  return normalizeD03(evaluateD03DcResistance(evaluatorInput));
}

export function calculateMvpD07(
  input: MvpD07CalculationInput,
): MvpEmCalculationResult {
  const record = readExactPlainDataRecord(input, D07_KEYS);
  if (record === null) {
    return normalizeD07(
      evaluateD07SeriesPortParameters(
        INVALID_EVALUATOR_INPUT as unknown as D07SeriesPortParametersInput,
      ),
    );
  }
  const stateBoundary = {
    frequencyHz: record.frequencyHz as number,
    portId: record.portId as string,
    referencePlaneId: record.referencePlaneId as string,
    loadedState: record.loadedState as LoadedState,
    seriesEquivalentId: record.seriesEquivalentId as string,
  };
  return normalizeD07(evaluateD07SeriesPortParameters({
    resistance: {
      resistanceOhm: record.resistanceOhm as number,
      ...stateBoundary,
    },
    inductance: {
      inductanceH: record.inductanceH as number,
      ...stateBoundary,
    },
    current: {
      currentA: record.currentA as number,
      quantityBasis: record.quantityBasis as "rms" | "fundamental_rms",
      ...stateBoundary,
    },
    portInterpretation: record.portInterpretation as "coil_series_equivalent_port",
    modelRegime: record.modelRegime as "linear_sinusoidal_steady_state",
  }));
}
