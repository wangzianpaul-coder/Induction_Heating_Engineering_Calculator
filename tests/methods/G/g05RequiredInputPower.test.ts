import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  G05_BINARY64_MIN_NORMAL,
  G05_IMPLEMENTATION_READINESS,
  G05_NUMERIC_REPRESENTABILITY_POLICY,
  G05_REQUIRED_INPUT_POWER_MAPPING,
  G05_WARNING_PREDICATES,
  evaluateG05RequiredInputPower,
  type G05AvailableEfficiencyEvidence,
  type G05AvailableLossEvidence,
  type G05EfficiencyEvidence,
  type G05EfficiencyId,
  type G05LossEvidence,
  type G05LossInputId,
  type G05OutputBoundaryEvidence,
  type G05PowerChainBinding,
  type G05RequiredInputPowerFailure,
  type G05RequiredInputPowerInput,
  type G05RequiredInputPowerSuccess,
  type G05SourceConfirmedNotApplicableEfficiencyEvidence,
  type G05SourceConfirmedNotApplicableLossEvidence,
  type G05UnknownApplicableEfficiencyEvidence,
  type G05UnknownApplicableLossEvidence,
  type G05UsefulPowerEvidence,
} from "../../../src/methods/G/g05RequiredInputPower.js";
import * as publicApi from "../../../src/public-api.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const CASE_SNAPSHOT = `case:${"5".repeat(64)}`;
const SOURCE_SNAPSHOT = `case:${"6".repeat(64)}`;

type MutableG05Input = {
  -readonly [K in keyof G05RequiredInputPowerInput]: G05RequiredInputPowerInput[K];
};

const LOSS_DEFINITION = Object.freeze({
  Qloss_wp: Object.freeze({
    boundaryRole: "workpiece_environment_heat_loss",
    valueW: 20,
  }),
  Pcu: Object.freeze({ boundaryRole: "coil_copper_loss", valueW: 10 }),
  Pstray: Object.freeze({ boundaryRole: "local_stray_loss", valueW: 5 }),
} as const);

const EFFICIENCY_DEFINITION = Object.freeze({
  eta_matching: Object.freeze({
    stageRole: "matching_stage_efficiency",
    value: 0.9,
  }),
  eta_inv: Object.freeze({
    stageRole: "inverter_stage_efficiency",
    value: 0.8,
  }),
  eta_rect: Object.freeze({
    stageRole: "rectifier_stage_efficiency",
    value: 0.95,
  }),
  eta_other: Object.freeze({
    stageRole: "other_explicit_stage_efficiency",
    value: 0.98,
  }),
} as const);

const CHAIN_NODE = Object.freeze({
  coilTerminal: Object.freeze({
    portId: "port:coil-terminal",
    referencePlaneId: "plane:Pcoil_terminal",
    controlVolumeId: "cv:Pcoil_terminal",
  }),
  matchingUpstream: Object.freeze({
    portId: "port:matching-upstream",
    referencePlaneId: "plane:matching-upstream",
    controlVolumeId: "cv:matching-stage",
  }),
  inverterUpstream: Object.freeze({
    portId: "port:inverter-upstream",
    referencePlaneId: "plane:inverter-upstream",
    controlVolumeId: "cv:inverter-stage",
  }),
  rectifierUpstream: Object.freeze({
    portId: "port:rectifier-upstream",
    referencePlaneId: "plane:rectifier-upstream",
    controlVolumeId: "cv:rectifier-stage",
  }),
  gridInput: Object.freeze({
    portId: "port:grid-input",
    referencePlaneId: "plane:Pgrid",
    controlVolumeId: "cv:Pgrid",
  }),
} as const);

type ChainNode = Readonly<{
  portId: string;
  referencePlaneId: string;
  controlVolumeId: string;
}>;

function chainNode(id: string): ChainNode {
  return Object.freeze({
    portId: `port:${id}`,
    referencePlaneId: `plane:${id}`,
    controlVolumeId: `cv:${id}`,
  });
}

const EFFICIENCY_EDGE = Object.freeze({
  eta_matching: Object.freeze({
    numerator: CHAIN_NODE.coilTerminal,
    denominator: CHAIN_NODE.matchingUpstream,
  }),
  eta_inv: Object.freeze({
    numerator: CHAIN_NODE.matchingUpstream,
    denominator: CHAIN_NODE.inverterUpstream,
  }),
  eta_rect: Object.freeze({
    numerator: CHAIN_NODE.inverterUpstream,
    denominator: CHAIN_NODE.rectifierUpstream,
  }),
  eta_other: Object.freeze({
    numerator: CHAIN_NODE.rectifierUpstream,
    denominator: CHAIN_NODE.gridInput,
  }),
} as const);

function efficiencyEdgeOverrides(
  numerator: ChainNode,
  denominator: ChainNode,
): Pick<
  G05AvailableEfficiencyEvidence,
  | "numeratorPortId"
  | "denominatorPortId"
  | "numeratorReferencePlaneId"
  | "denominatorReferencePlaneId"
  | "numeratorControlVolumeId"
  | "denominatorControlVolumeId"
> {
  return {
    numeratorPortId: numerator.portId,
    denominatorPortId: denominator.portId,
    numeratorReferencePlaneId: numerator.referencePlaneId,
    denominatorReferencePlaneId: denominator.referencePlaneId,
    numeratorControlVolumeId: numerator.controlVolumeId,
    denominatorControlVolumeId: denominator.controlVolumeId,
  };
}

function outputNodeOverrides(
  node: ChainNode,
): Pick<
  G05OutputBoundaryEvidence,
  "portId" | "referencePlaneId" | "controlVolumeId"
> {
  return { ...node };
}

function binding(
  overrides: Partial<G05PowerChainBinding> = {},
): G05PowerChainBinding {
  return {
    caseSnapshotId: CASE_SNAPSHOT,
    stateSnapshotId: "state:hot-steady:001",
    loadedState: "workpiece_hot",
    timeBasisId: "time-basis:steady-average",
    measurementWindowId: "window:coincident:001",
    powerBasis: "steady_average_power",
    powerChainSnapshotId: "power-chain:snapshot:001",
    provenanceBasisId: "provenance-basis:power-chain:001",
    ...overrides,
  };
}

function usefulPower(
  valueW = 100,
  overrides: Partial<G05UsefulPowerEvidence> = {},
): G05UsefulPowerEvidence {
  return {
    kind: "available",
    inputId: "Puseful",
    boundaryRole: "useful_process_power",
    valueW,
    dimensionId: "power",
    canonicalUnitId: "W",
    portId: null,
    referencePlaneId: "plane:useful-process",
    controlVolumeId: "cv:useful-process",
    energyPathId: "power-path:Puseful",
    physicalPowerSourceId: "physical-source:Puseful",
    binding: binding(),
    sourceMethod: "analytical_model",
    sourceRef: "ID-TH-01",
    dataQuality: "approved_reference",
    provenanceId: "provenance:Puseful:001",
    sourceSnapshotId: SOURCE_SNAPSHOT,
    ...overrides,
  };
}

function availableLoss(
  inputId: G05LossInputId,
  valueW: number = LOSS_DEFINITION[inputId].valueW,
  overrides: Partial<G05AvailableLossEvidence> = {},
): G05AvailableLossEvidence {
  return {
    kind: "available",
    inputId,
    boundaryRole: LOSS_DEFINITION[inputId].boundaryRole,
    valueW,
    dimensionId: "power",
    canonicalUnitId: "W",
    portId: null,
    referencePlaneId: `plane:${inputId}`,
    controlVolumeId: `cv:${inputId}`,
    lossPathId: `loss-path:${inputId}`,
    physicalLossSourceId: `physical-loss-source:${inputId}`,
    binding: binding(),
    sourceMethod: "analytical_model",
    sourceRef: inputId === "Qloss_wp" ? "ID-TH-01" : "DER-ENERGY",
    dataQuality: "approved_reference",
    provenanceId: `provenance:${inputId}:001`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    ...overrides,
  };
}

function excludedLoss(
  inputId: G05LossInputId,
  overrides: Partial<G05SourceConfirmedNotApplicableLossEvidence> = {},
): G05SourceConfirmedNotApplicableLossEvidence {
  return {
    kind: "source_confirmed_not_applicable",
    inputId,
    boundaryRole: LOSS_DEFINITION[inputId].boundaryRole,
    reason: `${inputId} is absent from this controlled boundary`,
    resolutionSourceRef: `applicability:${inputId}:001`,
    portId: null,
    referencePlaneId: `plane:${inputId}`,
    controlVolumeId: `cv:${inputId}`,
    lossPathId: `loss-path:${inputId}`,
    physicalLossSourceId: `physical-loss-source:${inputId}`,
    binding: binding(),
    sourceMethod: "analytical_model",
    sourceRef: "DER-ENERGY",
    dataQuality: "approved_reference",
    provenanceId: `provenance:${inputId}:na:001`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    ...overrides,
  };
}

function unknownLoss(
  inputId: G05LossInputId,
  overrides: Partial<G05UnknownApplicableLossEvidence> = {},
): G05UnknownApplicableLossEvidence {
  return {
    kind: "unknown_applicable",
    inputId,
    boundaryRole: LOSS_DEFINITION[inputId].boundaryRole,
    reason: `${inputId} applicability/value remains unresolved`,
    resolutionSourceRef: `resolution-needed:${inputId}:001`,
    portId: null,
    referencePlaneId: `plane:${inputId}`,
    controlVolumeId: `cv:${inputId}`,
    lossPathId: `loss-path:${inputId}`,
    physicalLossSourceId: `physical-loss-source:${inputId}`,
    binding: binding(),
    sourceMethod: "unknown_or_unconfirmed",
    sourceRef: `unresolved-source:${inputId}`,
    dataQuality: "unknown",
    provenanceId: `provenance:${inputId}:unknown:001`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
    ...overrides,
  };
}

function efficiencyCommon(efficiencyId: G05EfficiencyId) {
  const edge = EFFICIENCY_EDGE[efficiencyId];
  return {
    efficiencyId,
    stageRole: EFFICIENCY_DEFINITION[efficiencyId].stageRole,
    efficiencyBoundaryId: `efficiency-boundary:${efficiencyId}`,
    physicalConversionStageId: `conversion-stage:${efficiencyId}`,
    deviceId: `device:${efficiencyId}`,
    ...efficiencyEdgeOverrides(edge.numerator, edge.denominator),
    binding: binding(),
    sourceMethod: "measurement" as const,
    sourceRef: `device-efficiency-source:${efficiencyId}`,
    dataQuality: "measured" as const,
    provenanceId: `provenance:${efficiencyId}:001`,
    sourceSnapshotId: SOURCE_SNAPSHOT,
  };
}

function availableEfficiency(
  efficiencyId: G05EfficiencyId,
  value: number = EFFICIENCY_DEFINITION[efficiencyId].value,
  overrides: Partial<G05AvailableEfficiencyEvidence> = {},
): G05AvailableEfficiencyEvidence {
  return {
    kind: "available",
    ...efficiencyCommon(efficiencyId),
    value,
    dimensionId: "dimensionless",
    canonicalUnitId: "one",
    ...overrides,
  };
}

function excludedEfficiency(
  efficiencyId: G05EfficiencyId,
  overrides: Partial<G05SourceConfirmedNotApplicableEfficiencyEvidence> = {},
): G05SourceConfirmedNotApplicableEfficiencyEvidence {
  return {
    kind: "source_confirmed_not_applicable",
    ...efficiencyCommon(efficiencyId),
    reason: `${efficiencyId} stage is absent in this controlled topology`,
    resolutionSourceRef: `applicability:${efficiencyId}:001`,
    ...overrides,
  };
}

function unknownEfficiency(
  efficiencyId: G05EfficiencyId,
  overrides: Partial<G05UnknownApplicableEfficiencyEvidence> = {},
): G05UnknownApplicableEfficiencyEvidence {
  return {
    kind: "unknown_applicable",
    ...efficiencyCommon(efficiencyId),
    reason: `${efficiencyId} is unresolved for this device boundary`,
    resolutionSourceRef: `resolution-needed:${efficiencyId}:001`,
    sourceMethod: "unknown_or_unconfirmed",
    dataQuality: "unknown",
    ...overrides,
  };
}

function outputBoundary(
  outputId: G05OutputBoundaryEvidence["outputId"],
  overrides: Partial<G05OutputBoundaryEvidence> = {},
): G05OutputBoundaryEvidence {
  const definition = {
    Pwp_abs: {
      boundaryRole: "workpiece_absorbed_power",
      portId: null,
    },
    Pcoil_terminal: {
      boundaryRole: "coil_terminal_active_power",
      portId: "port:coil-terminal",
    },
    Pgrid: {
      boundaryRole: "grid_input_active_power",
      portId: "port:grid-input",
    },
  } as const;
  return {
    outputId,
    boundaryRole: definition[outputId].boundaryRole,
    portId: definition[outputId].portId,
    referencePlaneId: `plane:${outputId}`,
    controlVolumeId: `cv:${outputId}`,
    binding: binding(),
    ...overrides,
  };
}

function baseInput(): MutableG05Input {
  return {
    usefulPower: usefulPower(),
    workpieceHeatLoss: availableLoss("Qloss_wp"),
    copperLoss: availableLoss("Pcu"),
    strayLoss: availableLoss("Pstray"),
    efficiencies: {
      etaMatching: availableEfficiency("eta_matching"),
      etaInverter: availableEfficiency("eta_inv"),
      etaRectifier: availableEfficiency("eta_rect"),
      etaOther: availableEfficiency("eta_other"),
    },
    outputBoundaries: {
      workpieceAbsorbed: outputBoundary("Pwp_abs"),
      coilTerminal: outputBoundary("Pcoil_terminal"),
      gridInput: outputBoundary("Pgrid"),
    },
    powerTermOverlapAssessment: {
      status: "confirmed_pairwise_nonoverlapping",
      assessedIds: [
        "power-path:Puseful",
        "loss-path:Qloss_wp",
        "loss-path:Pcu",
        "loss-path:Pstray",
      ],
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:power:001",
    },
    efficiencyOverlapAssessment: {
      status: "confirmed_pairwise_nonoverlapping",
      assessedIds: [
        "efficiency-boundary:eta_matching",
        "efficiency-boundary:eta_inv",
        "efficiency-boundary:eta_rect",
        "efficiency-boundary:eta_other",
      ],
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:efficiencies:001",
    },
  };
}

function synchronizedAssessments(
  candidate: G05RequiredInputPowerInput,
): G05RequiredInputPowerInput {
  const losses: readonly G05LossEvidence[] = [
    candidate.workpieceHeatLoss,
    candidate.copperLoss,
    candidate.strayLoss,
  ];
  const efficiencies: readonly G05EfficiencyEvidence[] = [
    candidate.efficiencies.etaMatching,
    candidate.efficiencies.etaInverter,
    candidate.efficiencies.etaRectifier,
    candidate.efficiencies.etaOther,
  ];
  return {
    ...candidate,
    powerTermOverlapAssessment: {
      status: "confirmed_pairwise_nonoverlapping",
      assessedIds: [
        candidate.usefulPower.energyPathId,
        ...losses
          .filter((item) => item.kind !== "source_confirmed_not_applicable")
          .map((item) => item.lossPathId),
      ],
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:power:synchronized",
    },
    efficiencyOverlapAssessment: {
      status: "confirmed_pairwise_nonoverlapping",
      assessedIds: efficiencies
        .filter((item) => item.kind !== "source_confirmed_not_applicable")
        .map((item) => item.efficiencyBoundaryId),
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:efficiency:synchronized",
    },
  };
}

function successOf(
  candidate: G05RequiredInputPowerInput,
): G05RequiredInputPowerSuccess {
  const result = evaluateG05RequiredInputPower(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error((result as G05RequiredInputPowerFailure).failure.message);
  }
  return result;
}

function failureOf(candidate: unknown): G05RequiredInputPowerFailure {
  const result = evaluateG05RequiredInputPower(
    candidate as G05RequiredInputPowerInput,
  );
  expect(result.status).not.toBe("success");
  if (result.status === "success") throw new Error("expected G-05 failure");
  return result;
}

function expectNoFailurePayload(result: G05RequiredInputPowerFailure): void {
  expect(result).not.toHaveProperty("value");
  expect(result).not.toHaveProperty("calculationTrace");
  expect(result).not.toHaveProperty("conservationChecks");
  expect(result).not.toHaveProperty("inputSnapshot");
}

function availableValue(
  result: G05RequiredInputPowerSuccess,
  outputId: "Pwp_abs" | "Pcoil_terminal" | "Pgrid",
): number {
  const output = result.value[outputId];
  expect(output.kind).toBe("available");
  if (output.kind !== "available") throw new Error(`${outputId} unavailable`);
  return output.valueSi;
}

describe("G-05 required input power", () => {
  it("maps the frozen contract, source, derivation and SYS-P-002 metadata exactly", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-05"));
    expect(G05_REQUIRED_INPUT_POWER_MAPPING).toMatchObject({
      methodId: "G-05",
      methodVersion: specification.methodVersion,
      approvalStatus: "approved",
      inputParameterIds: [
        "Puseful",
        "Qloss_wp",
        "Pcu",
        "Pstray",
        "eta_matching",
        "eta_inv",
        "eta_rect",
        "eta_other",
      ],
      outputQuantityIds: ["Pwp_abs", "Pcoil_terminal", "Pgrid", "unknown items"],
      sourceRefs: ["ID-TH-01"],
      contractSourceRefs: [
        "ID-TH-01",
        "DER-ENERGY",
        "per-device efficiency source",
      ],
      methodCheckIds: ["SYS-P-002"],
      validationCaseIds: [],
      stableWarningIds: [],
    });
    expect(G05_REQUIRED_INPUT_POWER_MAPPING.derivationRefs).toContain("DER-ENERGY");
    expect(G05_WARNING_PREDICATES).toEqual({
      unknownLossSilentlySetToZero: "unknown loss is silently set to zero",
      efficiencyBoundariesOverlap: "efficiency boundaries overlap",
      zeroEfficiency: "eta=0",
      peakAndAveragePowersMixed: "peak and average powers are mixed",
    });
  });

  it("remains isolated from runtime registry and public API activation", () => {
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-05"));
    expect(G05_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "isolated_implementation_not_runtime_activated",
      runtimeActivated: false,
      publicApiExported: false,
    });
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect("evaluateG05RequiredInputPower" in publicApi).toBe(false);
  });

  it("passes SYS-P-002 using the frozen ordered source equations", () => {
    const result = successOf(baseInput());
    const product = 0.9 * 0.8 * 0.95 * 0.98;
    expect(result.calculationStatus).toBe("complete");
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(availableValue(result, "Pcoil_terminal")).toBe(135);
    expect(availableValue(result, "Pgrid")).toBe(135 / product);
    expect(result.value.unknownItems).toEqual([]);
    expect(result.calculationTrace.map((item) => item.equation)).toEqual([
      "Pwp_abs = Puseful + Qloss_wp",
      "Pcoil_terminal = Pwp_abs + Pcu + Pstray",
      "Pgrid = Pcoil_terminal / (eta_matching * eta_inv * eta_rect * eta_other)",
    ]);
    expect(result.calculationTrace.every((item) => !item.inputAdjusted)).toBe(true);
    expect(result.conservationChecks.every((item) => !item.inputAdjusted)).toBe(true);
  });

  it("publishes canonical-SI values with exact target boundaries and bindings", () => {
    const result = successOf(baseInput());
    expect(result.value.Pwp_abs).toMatchObject({
      kind: "available",
      outputId: "Pwp_abs",
      dimensionId: "power",
      canonicalUnitId: "W",
      boundaryRole: "workpiece_absorbed_power",
      portId: null,
      referencePlaneId: "plane:Pwp_abs",
      controlVolumeId: "cv:Pwp_abs",
      binding: binding(),
    });
    expect(result.value.Pcoil_terminal).toMatchObject({
      boundaryRole: "coil_terminal_active_power",
      portId: "port:coil-terminal",
    });
    expect(result.value.Pgrid).toMatchObject({
      boundaryRole: "grid_input_active_power",
      portId: "port:grid-input",
    });
  });

  it("retains the G-04-compatible two-boundary efficiency evidence instead of a bare factor", () => {
    const result = successOf(baseInput());
    const inverter = result.inputSnapshot.efficiencies.find(
      (item) => item.efficiencyId === "eta_inv",
    );
    expect(inverter).toMatchObject({
      kind: "available",
      value: 0.8,
      numeratorPortId: CHAIN_NODE.matchingUpstream.portId,
      denominatorPortId: CHAIN_NODE.inverterUpstream.portId,
      numeratorReferencePlaneId: CHAIN_NODE.matchingUpstream.referencePlaneId,
      denominatorReferencePlaneId: CHAIN_NODE.inverterUpstream.referencePlaneId,
      sourceSnapshotId: SOURCE_SNAPSHOT,
    });
  });

  it("scales dimensionally with all power inputs while efficiencies stay dimensionless", () => {
    const factor = 4;
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(100 * factor);
    candidate.workpieceHeatLoss = availableLoss("Qloss_wp", 20 * factor);
    candidate.copperLoss = availableLoss("Pcu", 10 * factor);
    candidate.strayLoss = availableLoss("Pstray", 5 * factor);
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(120 * factor);
    expect(availableValue(result, "Pcoil_terminal")).toBe(135 * factor);
    expect(availableValue(result, "Pgrid")).toBe(
      (135 * factor) / (0.9 * 0.8 * 0.95 * 0.98),
    );
  });

  it("supports the exact zero-power analytical limit without NaN or hidden defaults", () => {
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(0);
    candidate.workpieceHeatLoss = availableLoss("Qloss_wp", 0);
    candidate.copperLoss = availableLoss("Pcu", 0);
    candidate.strayLoss = availableLoss("Pstray", 0);
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(0);
    expect(availableValue(result, "Pcoil_terminal")).toBe(0);
    expect(availableValue(result, "Pgrid")).toBe(0);
  });

  it("excludes source-confirmed N/A losses without a numeric zero placeholder", () => {
    const candidate = baseInput();
    candidate.workpieceHeatLoss = excludedLoss("Qloss_wp");
    candidate.copperLoss = excludedLoss("Pcu");
    candidate.strayLoss = excludedLoss("Pstray");
    const result = successOf(synchronizedAssessments(candidate));
    expect(availableValue(result, "Pwp_abs")).toBe(100);
    expect(availableValue(result, "Pcoil_terminal")).toBe(100);
    expect(result.calculationTrace[0]).toMatchObject({
      orderedAppliedInputIds: ["Puseful"],
      orderedAppliedValues: [100],
      sourceConfirmedNotApplicableInputIds: ["Qloss_wp"],
    });
    expect(result.calculationTrace[1]).toMatchObject({
      orderedAppliedInputIds: ["Pwp_abs"],
      orderedAppliedValues: [100],
      sourceConfirmedNotApplicableInputIds: ["Pcu", "Pstray"],
    });
  });

  it("excludes source-confirmed N/A efficiencies without storing a unity placeholder", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: excludedEfficiency("eta_matching"),
      etaInverter: excludedEfficiency("eta_inv"),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    candidate.outputBoundaries = {
      ...candidate.outputBoundaries,
      gridInput: outputBoundary(
        "Pgrid",
        outputNodeOverrides(CHAIN_NODE.coilTerminal),
      ),
    };
    const result = successOf(synchronizedAssessments(candidate));
    expect(availableValue(result, "Pgrid")).toBe(135);
    expect(result.calculationTrace[2]).toMatchObject({
      orderedAppliedInputIds: ["Pcoil_terminal"],
      orderedAppliedValues: [135],
      sourceConfirmedNotApplicableInputIds: [
        "eta_matching",
        "eta_inv",
        "eta_rect",
        "eta_other",
      ],
    });
  });

  it("skips source-confirmed N/A efficiencies without treating them as edges", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: excludedEfficiency("eta_matching"),
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.coilTerminal,
          CHAIN_NODE.gridInput,
        ),
      }),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    const result = successOf(synchronizedAssessments(candidate));
    expect(availableValue(result, "Pgrid")).toBe(135 / 0.8);
    expect(result.calculationTrace[2]).toMatchObject({
      orderedAppliedInputIds: ["Pcoil_terminal", "eta_inv"],
      orderedAppliedValues: [135, 0.8],
      sourceConfirmedNotApplicableInputIds: [
        "eta_matching",
        "eta_rect",
        "eta_other",
      ],
    });
  });

  it.each([
    ["Qloss_wp", "workpieceHeatLoss", ["Pwp_abs", "Pcoil_terminal", "Pgrid"]],
    ["Pcu", "copperLoss", ["Pcoil_terminal", "Pgrid"]],
    ["Pstray", "strayLoss", ["Pcoil_terminal", "Pgrid"]],
  ] as const)(
    "keeps independent upstream outputs when %s is unknown",
    (inputId, key, affectedOutputs) => {
      const candidate = baseInput();
      candidate[key] = unknownLoss(inputId);
      const result = successOf(candidate);
      expect(result.calculationStatus).toBe("partial");
      expect(result.value.unknownItems).toContainEqual(
        expect.objectContaining({
          itemId: inputId,
          category: "unknown_loss",
          affectedOutputs,
        }),
      );
      for (const outputId of affectedOutputs) {
        expect(result.value[outputId].kind).toBe("unavailable");
        expect(result.value[outputId]).not.toHaveProperty("valueSi");
      }
      if (inputId !== "Qloss_wp") {
        expect(availableValue(result, "Pwp_abs")).toBe(120);
      }
    },
  );

  it.each([
    ["eta_matching", "etaMatching"],
    ["eta_inv", "etaInverter"],
    ["eta_rect", "etaRectifier"],
    ["eta_other", "etaOther"],
  ] as const)("keeps Pwp/Pcoil available when %s is unknown", (id, key) => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      [key]: unknownEfficiency(id),
    };
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(availableValue(result, "Pcoil_terminal")).toBe(135);
    expect(result.value.Pgrid).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
      unresolvedItemIds: [id],
    });
    expect(result.value.Pgrid).not.toHaveProperty("valueSi");
  });

  it("lists every unresolved conditional item without converting any to zero or one", () => {
    const candidate = baseInput();
    candidate.copperLoss = unknownLoss("Pcu");
    candidate.strayLoss = unknownLoss("Pstray");
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: unknownEfficiency("eta_inv"),
      etaRectifier: unknownEfficiency("eta_rect"),
    };
    const result = successOf(candidate);
    expect(result.value.unknownItems.map((item) => item.itemId)).toEqual([
      "Pcu",
      "Pstray",
      "eta_inv",
      "eta_rect",
    ]);
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(result.value.Pcoil_terminal.kind).toBe("unavailable");
    expect(result.value.Pgrid.kind).toBe("unavailable");
  });

  it("limits an unknown efficiency-overlap assessment to Pgrid", () => {
    const candidate = baseInput();
    candidate.efficiencyOverlapAssessment = {
      status: "unknown_or_unconfirmed",
      assessedIds: [],
      physicalIdentityChecked: null,
      assessmentSourceRef: "overlap-assessment:efficiencies:unknown",
      reason: "Physical stage identity is not yet confirmed",
    };
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(availableValue(result, "Pcoil_terminal")).toBe(135);
    expect(result.value.Pgrid.kind).toBe("unavailable");
    expect(result.value.unknownItems).toContainEqual(
      expect.objectContaining({
        itemId: "efficiencyOverlapAssessment",
        category: "efficiency_overlap_unconfirmed",
      }),
    );
  });

  it("makes every output unavailable when power-term overlap is unresolved", () => {
    const candidate = baseInput();
    candidate.powerTermOverlapAssessment = {
      status: "unknown_or_unconfirmed",
      assessedIds: [],
      physicalIdentityChecked: false,
      assessmentSourceRef: "overlap-assessment:power:unknown",
      reason: "Physical loss identities are not yet confirmed",
    };
    const result = successOf(candidate);
    expect(result.calculationStatus).toBe("partial");
    expect(result.value.Pwp_abs.kind).toBe("unavailable");
    expect(result.value.Pcoil_terminal.kind).toBe("unavailable");
    expect(result.value.Pgrid.kind).toBe("unavailable");
  });

  it.each([
    ["caseSnapshotId", `case:${"7".repeat(64)}`],
    ["stateSnapshotId", "state:hot-steady:other"],
    ["loadedState", "workpiece_cold"],
    ["timeBasisId", "time-basis:cycle-average"],
    ["measurementWindowId", "window:coincident:other"],
    ["powerBasis", "cycle_average_power"],
    ["powerChainSnapshotId", "power-chain:snapshot:other"],
    ["provenanceBasisId", "provenance-basis:other"],
  ] as const)("fails closed downstream for a %s mismatch", (field, value) => {
    const candidate = baseInput();
    candidate.copperLoss = availableLoss("Pcu", 10, {
      binding: binding({ [field]: value }),
    });
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(result.value.Pcoil_terminal.kind).toBe("unavailable");
    expect(result.value.Pgrid.kind).toBe("unavailable");
    expect(result.value.unknownItems).toContainEqual(
      expect.objectContaining({
        itemId: "binding:Pcu",
        category: "boundary_binding_mismatch",
      }),
    );
  });

  it("fails only Pgrid for an efficiency or grid-boundary binding mismatch", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        binding: binding({ stateSnapshotId: "state:other" }),
      }),
    };
    candidate.outputBoundaries = {
      ...candidate.outputBoundaries,
      gridInput: outputBoundary("Pgrid", {
        binding: binding({ measurementWindowId: "window:other" }),
      }),
    };
    const result = successOf(candidate);
    expect(availableValue(result, "Pcoil_terminal")).toBe(135);
    expect(result.value.Pgrid.kind).toBe("unavailable");
    expect(result.value.unknownItems.map((item) => item.itemId)).toEqual([
      "binding:eta_inv",
      "binding:Pgrid_boundary",
    ]);
  });

  it("treats an unknown conditional power basis as insufficient only downstream", () => {
    const candidate = baseInput();
    candidate.copperLoss = unknownLoss("Pcu", {
      binding: binding({ powerBasis: "unknown_or_unconfirmed" }),
    });
    const result = successOf(candidate);
    expect(availableValue(result, "Pwp_abs")).toBe(120);
    expect(result.value.Pcoil_terminal.kind).toBe("unavailable");
    expect(result.value.unknownItems.map((item) => item.itemId)).toEqual([
      "power-basis:Pcu",
      "Pcu",
    ]);
  });

  it("rejects an unconfirmed required Puseful power basis globally", () => {
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(100, {
      binding: binding({ powerBasis: "unknown_or_unconfirmed" }),
    });
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "G-05.required_power_basis_unconfirmed" },
    });
    expectNoFailurePayload(result);
  });

  it("rejects a known peak/average mix before generic unknown evidence", () => {
    const candidate = baseInput();
    candidate.workpieceHeatLoss = unknownLoss("Qloss_wp");
    candidate.copperLoss = availableLoss("Pcu", 10, {
      binding: binding({ powerBasis: "peak_power" }),
    });
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "G-05.peak_average_power_mixed" },
    });
    expectNoFailurePayload(result);
  });

  it.each(["workpieceHeatLoss", "copperLoss", "strayLoss"] as const)(
    "rejects an explicit power-path overlap even when %s is unknown",
    (key) => {
      const candidate = baseInput();
      candidate[key] = unknownLoss(
        key === "workpieceHeatLoss" ? "Qloss_wp" : key === "copperLoss" ? "Pcu" : "Pstray",
      );
      candidate.powerTermOverlapAssessment = {
        status: "overlap_or_double_count_present",
        assessedIds: ["power-path:Puseful"],
        physicalIdentityChecked: true,
        assessmentSourceRef: "overlap-assessment:power:known-overlap",
        overlapDescription: "The inventory repeats one physical contribution",
      };
      const result = failureOf(candidate);
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "G-05.loss_overlap_or_double_count" },
      });
    },
  );

  it("rejects a known efficiency overlap before an unknown efficiency", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaOther: unknownEfficiency("eta_other"),
    };
    candidate.efficiencyOverlapAssessment = {
      status: "overlap_or_double_count_present",
      assessedIds: ["efficiency-boundary:eta_matching"],
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:efficiency:known-overlap",
      overlapDescription: "An overall factor overlaps staged factors",
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "G-05.efficiency_overlap_or_double_count" },
    });
  });

  it.each(["lossPathId", "physicalLossSourceId"] as const)(
    "globally rejects duplicate %s across included and source-confirmed N/A losses",
    (identity) => {
      const included = availableLoss("Pcu");
      const candidate = baseInput();
      candidate.copperLoss = included;
      candidate.strayLoss = excludedLoss("Pstray", {
        [identity]: included[identity],
      });
      const result = failureOf(synchronizedAssessments(candidate));
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "G-05.loss_overlap_or_double_count" },
      });
    },
  );

  it.each([
    "efficiencyBoundaryId",
    "physicalConversionStageId",
  ] as const)(
    "globally rejects duplicate %s across included and source-confirmed N/A efficiencies",
    (identity) => {
      const included = availableEfficiency("eta_inv");
      const candidate = baseInput();
      candidate.efficiencies = {
        ...candidate.efficiencies,
        etaInverter: included,
        etaOther: excludedEfficiency("eta_other", {
          [identity]: included[identity],
        }),
      };
      const result = failureOf(synchronizedAssessments(candidate));
      expect(result).toMatchObject({
        status: "not_applicable",
        failure: { code: "G-05.efficiency_overlap_or_double_count" },
      });
    },
  );

  it("rejects a duplicate efficiency reference-plane pair", () => {
    const included = availableEfficiency("eta_inv");
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: included,
      etaOther: availableEfficiency("eta_other", 0.98, {
        numeratorReferencePlaneId: included.numeratorReferencePlaneId,
        denominatorReferencePlaneId: included.denominatorReferencePlaneId,
      }),
    };
    expect(failureOf(candidate)).toMatchObject({
      status: "not_applicable",
      failure: { code: "G-05.efficiency_overlap_or_double_count" },
    });
  });

  it("rejects unique but unrelated available efficiency edges", () => {
    const nodes = [0, 1, 2, 3, 4].map((index) =>
      chainNode(`unrelated-${index}`),
    );
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: availableEfficiency("eta_matching", 0.9, {
        ...efficiencyEdgeOverrides(nodes[0]!, nodes[1]!),
      }),
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(nodes[1]!, nodes[2]!),
      }),
      etaRectifier: availableEfficiency("eta_rect", 0.95, {
        ...efficiencyEdgeOverrides(nodes[2]!, nodes[3]!),
      }),
      etaOther: availableEfficiency("eta_other", 0.98, {
        ...efficiencyEdgeOverrides(nodes[3]!, nodes[4]!),
      }),
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_chain_not_contiguous" },
    });
    expectNoFailurePayload(result);
  });

  it("rejects an available efficiency edge directed upstream-to-downstream", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaMatching: availableEfficiency("eta_matching", 0.9, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.matchingUpstream,
          CHAIN_NODE.coilTerminal,
        ),
      }),
    };
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-05.efficiency_chain_not_contiguous");
    expectNoFailurePayload(result);
  });

  it("rejects a gap between otherwise unique efficiency edges", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(
          chainNode("gap-upstream"),
          CHAIN_NODE.inverterUpstream,
        ),
      }),
    };
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-05.efficiency_chain_not_contiguous");
    expectNoFailurePayload(result);
  });

  it("rejects a branch from the reachable efficiency-chain node", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.coilTerminal,
          CHAIN_NODE.inverterUpstream,
        ),
      }),
    };
    const result = failureOf(candidate);
    expect(result.failure.code).toBe("G-05.efficiency_chain_not_contiguous");
    expectNoFailurePayload(result);
  });

  it("rejects a reachable directed cycle", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: availableEfficiency("eta_matching"),
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.matchingUpstream,
          CHAIN_NODE.coilTerminal,
        ),
      }),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    const result = failureOf(synchronizedAssessments(candidate));
    expect(result.failure.code).toBe("G-05.efficiency_chain_not_contiguous");
    expectNoFailurePayload(result);
  });

  it("proves connectivity without assigning a physical position from the efficiency ID", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: availableEfficiency("eta_matching", 0.9, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.inverterUpstream,
          CHAIN_NODE.rectifierUpstream,
        ),
      }),
      etaInverter: availableEfficiency("eta_inv", 0.8, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.rectifierUpstream,
          CHAIN_NODE.gridInput,
        ),
      }),
      etaRectifier: availableEfficiency("eta_rect", 0.95, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.matchingUpstream,
          CHAIN_NODE.inverterUpstream,
        ),
      }),
      etaOther: availableEfficiency("eta_other", 0.98, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.coilTerminal,
          CHAIN_NODE.matchingUpstream,
        ),
      }),
    };
    const result = successOf(candidate);
    expect(availableValue(result, "Pgrid")).toBe(
      135 / (0.9 * 0.8 * 0.95 * 0.98),
    );
    expect(result.calculationTrace[2]?.orderedAppliedInputIds).toEqual([
      "Pcoil_terminal",
      "eta_matching",
      "eta_inv",
      "eta_rect",
      "eta_other",
    ]);
    expect(result.calculationTrace[2]?.orderedAppliedValues).toEqual([
      135,
      0.9,
      0.8,
      0.95,
      0.98,
    ]);
  });

  it("rejects zero available efficiency edges when coil and grid nodes differ", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: excludedEfficiency("eta_matching"),
      etaInverter: excludedEfficiency("eta_inv"),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    const result = failureOf(synchronizedAssessments(candidate));
    expect(result.failure.code).toBe("G-05.efficiency_chain_not_contiguous");
    expectNoFailurePayload(result);
  });

  it.each(["power", "efficiency"] as const)(
    "rejects an incomplete or extra %s assessment set",
    (kind) => {
      const candidate = baseInput();
      if (kind === "power") {
        candidate.powerTermOverlapAssessment = {
          ...candidate.powerTermOverlapAssessment,
          assessedIds: ["power-path:Puseful"],
        };
      } else {
        candidate.efficiencyOverlapAssessment = {
          ...candidate.efficiencyOverlapAssessment,
          assessedIds: [
            "efficiency-boundary:eta_matching",
            "efficiency-boundary:eta_inv",
            "efficiency-boundary:eta_rect",
            "efficiency-boundary:eta_other",
            "efficiency-boundary:extra",
          ],
        };
      }
      const result = failureOf(candidate);
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "G-05.overlap_assessment_set_mismatch" },
      });
      expectNoFailurePayload(result);
    },
  );

  it.each([0, -0] as const)("rejects eta=0 (%s) before division", (value) => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaInverter: availableEfficiency("eta_inv", value),
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_zero_invalid" },
    });
    expectNoFailurePayload(result);
  });

  it.each([
    -0.1,
    1.0000000000000002,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    G05_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid/passivity-breaking efficiency %s", (value) => {
    const candidate = baseInput();
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaRectifier: availableEfficiency("eta_rect", value),
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_out_of_range" },
    });
    expectNoFailurePayload(result);
  });

  it.each([
    -1,
    -0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    G05_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid useful power %s", (value) => {
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(value);
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.useful_power_invalid" },
    });
  });

  it.each([
    -1,
    -0,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    G05_BINARY64_MIN_NORMAL / 2,
  ])("rejects invalid conditional loss %s", (value) => {
    const candidate = baseInput();
    candidate.strayLoss = availableLoss("Pstray", value);
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.loss_evidence_invalid" },
    });
  });

  it("fails closed on ordered Puseful+Qloss overflow", () => {
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(Number.MAX_VALUE);
    candidate.workpieceHeatLoss = availableLoss("Qloss_wp", Number.MAX_VALUE);
    candidate.copperLoss = excludedLoss("Pcu");
    candidate.strayLoss = excludedLoss("Pstray");
    const result = failureOf(synchronizedAssessments(candidate));
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.numeric_resolution_invalid" },
    });
    expectNoFailurePayload(result);
  });

  it.each([
    [1e308, 1],
    [1, 1e308],
  ] as const)(
    "rejects either swallowed operand direction in Puseful+Qloss (%s,%s)",
    (useful, loss) => {
      const candidate = baseInput();
      candidate.usefulPower = usefulPower(useful);
      candidate.workpieceHeatLoss = availableLoss("Qloss_wp", loss);
      candidate.copperLoss = excludedLoss("Pcu");
      candidate.strayLoss = excludedLoss("Pstray");
      const result = failureOf(synchronizedAssessments(candidate));
      expect(result.failure.code).toBe("G-05.numeric_resolution_invalid");
      expectNoFailurePayload(result);
    },
  );

  it.each([
    [1e308, 1],
    [1, 1e308],
  ] as const)(
    "rejects either swallowed operand direction in Pwp+Pcu (%s,%s)",
    (pwp, copper) => {
      const candidate = baseInput();
      candidate.usefulPower = usefulPower(pwp);
      candidate.workpieceHeatLoss = excludedLoss("Qloss_wp");
      candidate.copperLoss = availableLoss("Pcu", copper);
      candidate.strayLoss = excludedLoss("Pstray");
      const result = failureOf(synchronizedAssessments(candidate));
      expect(result.failure.code).toBe("G-05.numeric_resolution_invalid");
    },
  );

  it("fails closed when the ordered efficiency product underflows", () => {
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: availableEfficiency("eta_matching", 1e-100),
      etaInverter: availableEfficiency("eta_inv", 1e-100),
      etaRectifier: availableEfficiency("eta_rect", 1e-100),
      etaOther: availableEfficiency("eta_other", 1e-100),
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.numeric_resolution_invalid" },
    });
  });

  it("rejects a non-unity efficiency factor swallowed by the prior product", () => {
    const nextBelowOne = 1 - Number.EPSILON / 2;
    expect(G05_BINARY64_MIN_NORMAL * nextBelowOne).toBe(
      G05_BINARY64_MIN_NORMAL,
    );
    const candidate = baseInput();
    candidate.efficiencies = {
      etaMatching: availableEfficiency(
        "eta_matching",
        G05_BINARY64_MIN_NORMAL,
      ),
      etaInverter: availableEfficiency("eta_inv", nextBelowOne, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.matchingUpstream,
          CHAIN_NODE.gridInput,
        ),
      }),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    const result = failureOf(synchronizedAssessments(candidate));
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.numeric_resolution_invalid" },
    });
    expectNoFailurePayload(result);
  });

  it("fails closed when Pcoil/efficiency overflows", () => {
    const candidate = baseInput();
    candidate.usefulPower = usefulPower(Number.MAX_VALUE);
    candidate.workpieceHeatLoss = excludedLoss("Qloss_wp");
    candidate.copperLoss = excludedLoss("Pcu");
    candidate.strayLoss = excludedLoss("Pstray");
    candidate.efficiencies = {
      etaMatching: availableEfficiency("eta_matching", 0.5, {
        ...efficiencyEdgeOverrides(
          CHAIN_NODE.coilTerminal,
          CHAIN_NODE.gridInput,
        ),
      }),
      etaInverter: excludedEfficiency("eta_inv"),
      etaRectifier: excludedEfficiency("eta_rect"),
      etaOther: excludedEfficiency("eta_other"),
    };
    const result = failureOf(synchronizedAssessments(candidate));
    expect(result.failure.code).toBe("G-05.numeric_resolution_invalid");
    expectNoFailurePayload(result);
  });

  it("declares a machine-only binary64 policy without engineering thresholds", () => {
    expect(G05_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputOrResultPolicy: "fail_closed",
      overflowFalseZeroAndSwallowedTermPolicy: "fail_closed",
      orderedSourceEquationRearranged: false,
      minimumPositiveNormal: G05_BINARY64_MIN_NORMAL,
    });
  });

  it("lets a later malformed enum outrank an earlier unknown conditional item", () => {
    const candidate = baseInput();
    candidate.workpieceHeatLoss = unknownLoss("Qloss_wp");
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaOther: {
        ...availableEfficiency("eta_other"),
        sourceMethod: "spreadsheet_guess",
      } as unknown as G05AvailableEfficiencyEvidence,
    };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_evidence_invalid" },
    });
  });

  it("lets malformed schema outrank a known overlap/domain exclusion", () => {
    const candidate = baseInput();
    candidate.powerTermOverlapAssessment = {
      status: "overlap_or_double_count_present",
      assessedIds: ["power-path:Puseful"],
      physicalIdentityChecked: true,
      assessmentSourceRef: "overlap-assessment:known",
      overlapDescription: "Known repeated path",
    };
    candidate.efficiencies = {
      ...candidate.efficiencies,
      etaRectifier: {
        ...availableEfficiency("eta_rect"),
        dimensionId: "power",
      } as unknown as G05AvailableEfficiencyEvidence,
    };
    expect(failureOf(candidate)).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_evidence_invalid" },
    });
  });

  it("returns insufficient_data for missing/null required Puseful evidence", () => {
    const candidate = { ...baseInput(), usefulPower: null };
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "G-05.useful_power_missing" },
    });
    expectNoFailurePayload(result);
  });

  it("lets a later malformed enum outrank missing required Puseful evidence", () => {
    const candidate = {
      ...baseInput(),
      usefulPower: null,
      efficiencies: {
        ...baseInput().efficiencies,
        etaOther: {
          ...availableEfficiency("eta_other"),
          sourceMethod: "spreadsheet_guess",
        },
      },
    };
    expect(failureOf(candidate)).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.efficiency_evidence_invalid" },
    });
  });

  it.each([
    ["loss", "workpieceHeatLoss"],
    ["efficiency", "efficiencies"],
    ["boundary", "outputBoundaries"],
  ] as const)("rejects malformed %s nested binding with category-specific failure", (kind, _key) => {
    const candidate = baseInput();
    if (kind === "loss") {
      candidate.workpieceHeatLoss = availableLoss("Qloss_wp", 20, {
        binding: binding({ loadedState: "bogus" as never }),
      });
    } else if (kind === "efficiency") {
      candidate.efficiencies = {
        ...candidate.efficiencies,
        etaMatching: availableEfficiency("eta_matching", 0.9, {
          binding: binding({ loadedState: "bogus" as never }),
        }),
      };
    } else {
      candidate.outputBoundaries = {
        ...candidate.outputBoundaries,
        gridInput: outputBoundary("Pgrid", {
          binding: binding({ loadedState: "bogus" as never }),
        }),
      };
    }
    const result = failureOf(candidate);
    expect(result.failure.code).toBe(
      kind === "loss"
        ? "G-05.loss_evidence_invalid"
        : kind === "efficiency"
          ? "G-05.efficiency_evidence_invalid"
          : "G-05.output_boundary_invalid",
    );
  });

  it.each([
    null,
    [],
    Object.create(null),
    new (class InputRecord {})(),
  ])("rejects a non-plain or non-exact top-level record", (candidate) => {
    const result = failureOf(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "G-05.input_schema_invalid" },
    });
    expectNoFailurePayload(result);
  });

  it("rejects extra top-level string or symbol keys", () => {
    const extra = { ...baseInput(), extra: 1 };
    expect(failureOf(extra).failure.code).toBe("G-05.input_schema_invalid");
    const symbol = { ...baseInput() } as Record<PropertyKey, unknown>;
    symbol[Symbol("hostile")] = 1;
    expect(failureOf(symbol).failure.code).toBe("G-05.input_schema_invalid");
  });

  it("does not execute a top-level accessor", () => {
    const candidate = { ...baseInput() } as Record<string, unknown>;
    let executed = false;
    Object.defineProperty(candidate, "usefulPower", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    expect(failureOf(candidate).failure.code).toBe("G-05.input_schema_invalid");
    expect(executed).toBe(false);
  });

  it("does not execute a nested evidence accessor", () => {
    const candidate = baseInput();
    const loss = { ...availableLoss("Pcu") } as Record<string, unknown>;
    let executed = false;
    Object.defineProperty(loss, "valueW", {
      enumerable: true,
      get() {
        executed = true;
        return 0;
      },
    });
    candidate.copperLoss = loss as unknown as G05LossEvidence;
    expect(failureOf(candidate).failure.code).toBe("G-05.loss_evidence_invalid");
    expect(executed).toBe(false);
  });

  it("contains a throwing Proxy at the trust boundary", () => {
    const hostile = new Proxy(baseInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(failureOf(hostile).failure.code).toBe("G-05.input_schema_invalid");
  });

  it("rejects a sparse or accessor-bearing assessedIds array without executing it", () => {
    const sparse = baseInput();
    sparse.powerTermOverlapAssessment = {
      ...sparse.powerTermOverlapAssessment,
      assessedIds: new Array(4),
    };
    expect(failureOf(sparse).failure.code).toBe(
      "G-05.overlap_assessment_invalid",
    );

    const candidate = baseInput();
    const ids = [
      "power-path:Puseful",
      "loss-path:Qloss_wp",
      "loss-path:Pcu",
      "loss-path:Pstray",
    ];
    let executed = false;
    Object.defineProperty(ids, "1", {
      enumerable: true,
      get() {
        executed = true;
        return "loss-path:Qloss_wp";
      },
    });
    candidate.powerTermOverlapAssessment = {
      ...candidate.powerTermOverlapAssessment,
      assessedIds: ids,
    };
    expect(failureOf(candidate).failure.code).toBe(
      "G-05.overlap_assessment_invalid",
    );
    expect(executed).toBe(false);
  });

  it("does not mutate caller input and deep-freezes success evidence", () => {
    const candidate = baseInput();
    const before = JSON.stringify(candidate);
    const result = successOf(candidate);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.unknownItems)).toBe(true);
    expect(Object.isFrozen(result.inputSnapshot)).toBe(true);
    expect(result.inputSnapshot.losses.every((item) => Object.isFrozen(item))).toBe(true);
    expect(result.calculationTrace.every((item) => Object.isFrozen(item))).toBe(true);
    expect(result.conservationChecks.every((item) => Object.isFrozen(item))).toBe(true);
  });

  it("keeps every failure branch payload-free", () => {
    const failures = [
      failureOf(null),
      failureOf({ ...baseInput(), usefulPower: null }),
      failureOf({
        ...baseInput(),
        efficiencies: {
          ...baseInput().efficiencies,
          etaMatching: availableEfficiency("eta_matching", 0),
        },
      }),
      failureOf({
        ...baseInput(),
        powerTermOverlapAssessment: {
          status: "overlap_or_double_count_present",
          assessedIds: ["power-path:Puseful"],
          physicalIdentityChecked: true,
          assessmentSourceRef: "overlap-assessment:known",
          overlapDescription: "Known overlap",
        },
      }),
      failureOf({
        ...baseInput(),
        usefulPower: usefulPower(100, {
          binding: binding({ powerBasis: "unknown_or_unconfirmed" }),
        }),
      }),
    ];
    for (const result of failures) expectNoFailurePayload(result);
  });

  it("contains no historical-output, calibration or runtime-fetch dependency", () => {
    const source = readFileSync(
      new URL(
        "../../../src/methods/G/g05RequiredInputPower.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/fetch\s*\(|localStorage|indexedDB|localhost|https?:\/\//i);
    expect(source).not.toMatch(
      /legacy workbook|historical output|calibration target/i,
    );
  });
});
