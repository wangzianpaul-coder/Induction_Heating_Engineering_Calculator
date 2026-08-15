import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import {
  G04_BINARY64_MIN_NORMAL,
  G04_IMPLEMENTATION_READINESS,
  G04_NUMERIC_REPRESENTABILITY_POLICY,
  G04_POWER_BOUNDARY_MAPPING,
  G04_WARNING_PREDICATES,
  evaluateG04PowerBoundariesAndEfficiencies,
  type G04AvailablePowerEvidence,
  type G04EfficiencyConsistencyUncertainty,
  type G04PowerBoundariesAndEfficienciesFailure,
  type G04PowerBoundariesAndEfficienciesInput,
  type G04PowerBoundariesAndEfficienciesSuccess,
  type G04PowerEvidence,
  type G04PowerParameterId,
} from "../../../src/methods/G/g04PowerBoundariesAndEfficiencies.js";
import * as publicApi from "../../../src/public-api.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";

const SLOT = Object.freeze({
  P_grid: Object.freeze({
    key: "gridPower",
    valueW: 1_000,
    quantityFamily: "active_power",
    boundaryRole: "grid_input_active_power",
    portId: "grid-input-meter-port",
    referencePlaneId: "grid-input-meter-plane",
    controlVolumeId: "complete-heating-system",
  }),
  P_inverter_out: Object.freeze({
    key: "inverterOutputPower",
    valueW: 900,
    quantityFamily: "active_power",
    boundaryRole: "inverter_output_active_power",
    portId: "inverter-output-port",
    referencePlaneId: "inverter-output-terminals",
    controlVolumeId: "inverter-control-volume",
  }),
  P_coil_terminal: Object.freeze({
    key: "coilTerminalPower",
    valueW: 800,
    quantityFamily: "active_power",
    boundaryRole: "coil_terminal_active_power",
    portId: "coil-terminal-port",
    referencePlaneId: "coil-terminals",
    controlVolumeId: "coil-and-workpiece-system",
  }),
  P_workpiece_absorbed: Object.freeze({
    key: "workpieceAbsorbedPower",
    valueW: 600,
    quantityFamily: "active_power",
    boundaryRole: "workpiece_absorbed_power",
    portId: null,
    referencePlaneId: "workpiece-electromagnetic-absorption-boundary",
    controlVolumeId: "workpiece-control-volume",
  }),
  P_useful: Object.freeze({
    key: "usefulPower",
    valueW: 480,
    quantityFamily: "heat_rate",
    boundaryRole: "useful_process_power",
    portId: null,
    referencePlaneId: "useful-process-enthalpy-boundary",
    controlVolumeId: "useful-process-control-volume",
  }),
  P_cu: Object.freeze({
    key: "copperLoss",
    valueW: 100,
    quantityFamily: "heat_rate",
    boundaryRole: "coil_copper_loss",
    portId: null,
    referencePlaneId: "coil-copper-loss-boundary",
    controlVolumeId: "coil-conductor-control-volume",
  }),
  Q_loss_environment: Object.freeze({
    key: "workpieceHeatLoss",
    valueW: 120,
    quantityFamily: "heat_rate",
    boundaryRole: "workpiece_environment_heat_loss",
    portId: null,
    referencePlaneId: "workpiece-environment-boundary",
    controlVolumeId: "workpiece-control-volume",
  }),
} as const);

const PARAMETER_IDS = Object.freeze(
  Object.keys(SLOT) as G04PowerParameterId[],
);

function availablePower(
  parameterId: G04PowerParameterId,
  overrides: Partial<G04AvailablePowerEvidence> = {},
): G04AvailablePowerEvidence {
  const slot = SLOT[parameterId];
  return {
    kind: "available",
    parameterId,
    valueW: slot.valueW,
    quantityFamily: slot.quantityFamily,
    boundaryRole: slot.boundaryRole,
    portId: slot.portId,
    referencePlaneId: slot.referencePlaneId,
    controlVolumeId: slot.controlVolumeId,
    caseSnapshotId: "case-g04-synthetic-001",
    stateSnapshotId: "power-state-hot-steady-001",
    loadedState: "workpiece_hot",
    timeBasisId: "steady-state-average-power",
    measurementWindowId: "coincident-window-001",
    powerChainSnapshotId: "power-chain-snapshot-001",
    provenanceBasisId: "power-chain-provenance-basis-001",
    sourceKind: "measurement",
    sourceRef: `synthetic-source-${parameterId}`,
    sourceSnapshotId: `synthetic-source-snapshot-${parameterId}`,
    ...overrides,
  };
}

function unavailablePower(parameterId: G04PowerParameterId): G04PowerEvidence {
  return {
    kind: "unavailable",
    status: "missing",
    parameterId,
    reason: `${parameterId} has not been supplied for this synthetic case`,
  };
}

function exactUncertainty(
  ratioId: G04EfficiencyConsistencyUncertainty["ratioId"],
  expandedDifferenceUncertaintyW = 0,
): G04EfficiencyConsistencyUncertainty {
  return {
    kind:
      "precomputed_expanded_uncertainty_of_numerator_minus_denominator",
    ratioId,
    expandedDifferenceUncertaintyW,
    coverageFactor: 2,
    uncertaintySourceRef: `synthetic-expanded-N-minus-D-${ratioId}`,
  };
}

function unavailableUncertainty(
  ratioId: G04EfficiencyConsistencyUncertainty["ratioId"],
): G04EfficiencyConsistencyUncertainty {
  return {
    kind: "not_available",
    ratioId,
    reason: `No propagated N-D uncertainty is available for ${ratioId}`,
  };
}

function baseInput(): G04PowerBoundariesAndEfficienciesInput {
  return {
    gridPower: availablePower("P_grid"),
    inverterOutputPower: availablePower("P_inverter_out"),
    coilTerminalPower: availablePower("P_coil_terminal"),
    workpieceAbsorbedPower: availablePower("P_workpiece_absorbed"),
    usefulPower: availablePower("P_useful"),
    copperLoss: availablePower("P_cu"),
    workpieceHeatLoss: availablePower("Q_loss_environment"),
    ratioUncertainties: {
      etaInverter: exactUncertainty("eta_inv"),
      etaCoilToWorkpiece: exactUncertainty("eta_coil_wp"),
      etaThermal: exactUncertainty("eta_thermal"),
      etaOverall: exactUncertainty("eta_overall"),
    },
    accountingAssessment: {
      overallAndStagedEfficiencyTreatment:
        "independent_boundary_ratios_no_double_counting",
      reactivePowerTreatment:
        "excluded_from_active_power_and_heat_loss_inputs",
      assessmentSourceRef: "synthetic-accounting-assessment-001",
    },
  };
}

function withPower(
  candidate: G04PowerBoundariesAndEfficienciesInput,
  parameterId: G04PowerParameterId,
  power: G04PowerEvidence,
): G04PowerBoundariesAndEfficienciesInput {
  return { ...candidate, [SLOT[parameterId].key]: power };
}

function withUncertainty(
  candidate: G04PowerBoundariesAndEfficienciesInput,
  key: keyof G04PowerBoundariesAndEfficienciesInput["ratioUncertainties"],
  uncertainty: G04EfficiencyConsistencyUncertainty,
): G04PowerBoundariesAndEfficienciesInput {
  return {
    ...candidate,
    ratioUncertainties: {
      ...candidate.ratioUncertainties,
      [key]: uncertainty,
    },
  };
}

function withAssessment(
  candidate: G04PowerBoundariesAndEfficienciesInput,
  patch: Partial<
    G04PowerBoundariesAndEfficienciesInput["accountingAssessment"]
  >,
): G04PowerBoundariesAndEfficienciesInput {
  return {
    ...candidate,
    accountingAssessment: {
      ...candidate.accountingAssessment,
      ...patch,
    },
  };
}

function successOf(
  candidate: G04PowerBoundariesAndEfficienciesInput,
): G04PowerBoundariesAndEfficienciesSuccess {
  const result = evaluateG04PowerBoundariesAndEfficiencies(candidate);
  expect(["success", "success_with_warnings"]).toContain(result.status);
  if (result.status !== "success" && result.status !== "success_with_warnings") {
    throw new Error(
      (result as G04PowerBoundariesAndEfficienciesFailure).failure.message,
    );
  }
  return result as G04PowerBoundariesAndEfficienciesSuccess;
}

function failureOf(
  candidate: G04PowerBoundariesAndEfficienciesInput,
): G04PowerBoundariesAndEfficienciesFailure {
  const result = evaluateG04PowerBoundariesAndEfficiencies(candidate);
  expect(["success", "success_with_warnings"]).not.toContain(result.status);
  if (result.status === "success" || result.status === "success_with_warnings") {
    throw new Error("expected G-04 failure");
  }
  return result as G04PowerBoundariesAndEfficienciesFailure;
}

function availableValue(
  result: G04PowerBoundariesAndEfficienciesSuccess,
  ratioId: "eta_inv" | "eta_coil_wp" | "eta_thermal" | "eta_overall",
): number {
  const output = result.value[ratioId];
  expect(output.kind).toBe("available");
  if (output.kind !== "available") throw new Error(`${ratioId} unavailable`);
  return output.valueSi;
}

describe("G-04 frozen power boundaries and efficiencies", () => {
  it("maps exactly to ID-TH-01, DER-ENERGY, DER-CIRCUIT and SYS-P-001", () => {
    expect(G04_POWER_BOUNDARY_MAPPING).toMatchObject({
      methodId: "G-04",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#G-04:Equation",
      sourceRefs: ["ID-TH-01"],
      contractSourceRefs: ["ID-TH-01", "DER-ENERGY", "DER-CIRCUIT"],
      derivationRefs: ["ID-TH-01", "DER-ENERGY", "DER-CIRCUIT"],
      validationCaseIds: [],
      methodCheckIds: ["SYS-P-001"],
      inputParameterIds: [
        "Pgrid",
        "Pinv",
        "Pcoil",
        "Pwp",
        "Puseful",
        "Pcu",
        "Qloss",
      ],
      outputQuantityIds: [
        "eta_inv",
        "eta_coil_wp",
        "eta_thermal",
        "eta_overall",
        "missing boundary",
      ],
      stableWarningIds: [],
    });
    expect(G04_WARNING_PREDICATES).toEqual({
      denominatorIsZero: "denominator is zero",
      efficiencyExceedsOneBeyondUncertainty:
        "efficiency exceeds one beyond uncertainty",
      overallAndStagedEfficienciesMultipliedTwice:
        "overall and staged efficiencies are multiplied twice",
      reactivePowerCountedAsLoss: "reactive power is counted as loss",
    });
  });

  it("remains isolated from the registry runtime and public API", () => {
    expect(G04_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "isolated_implementation_not_runtime_activated",
      runtimeActivated: false,
      publicApiExported: false,
    });
    const specification = METHOD_SPECIFICATION_REGISTRY.get(methodId("G-04"));
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect("evaluateG04PowerBoundariesAndEfficiencies" in publicApi).toBe(false);
  });

  it("passes SYS-P-001 with four direct frozen boundary ratios", () => {
    const result = successOf(baseInput());
    expect(result.status).toBe("success");
    expect(availableValue(result, "eta_inv")).toBeCloseTo(0.9, 15);
    expect(availableValue(result, "eta_coil_wp")).toBeCloseTo(0.75, 15);
    expect(availableValue(result, "eta_thermal")).toBeCloseTo(0.8, 15);
    expect(availableValue(result, "eta_overall")).toBeCloseTo(0.48, 15);
    expect(result.missingBoundaryParameterIds).toEqual([]);
  });

  it("calculates overall efficiency directly and never multiplies it through the staged chain", () => {
    const result = successOf(baseInput());
    const stagedProduct =
      availableValue(result, "eta_inv") *
      availableValue(result, "eta_coil_wp") *
      availableValue(result, "eta_thermal");
    expect(stagedProduct).toBeCloseTo(0.54, 15);
    expect(availableValue(result, "eta_overall")).toBeCloseTo(0.48, 15);
    expect(availableValue(result, "eta_overall")).not.toBe(stagedProduct);
    expect(
      result.calculationTrace.find(
        (trace) => trace.ratioId === "eta_overall",
      )?.equation,
    ).toBe("eta_overall = P_useful / P_grid");
  });

  it("retains every named port/control-volume boundary and property-level provenance", () => {
    const result = successOf(baseInput());
    expect(result.powerSnapshot.P_grid).toMatchObject({
      parameterId: "P_grid",
      boundaryRole: "grid_input_active_power",
      portId: "grid-input-meter-port",
      referencePlaneId: "grid-input-meter-plane",
      controlVolumeId: "complete-heating-system",
      sourceRef: "synthetic-source-P_grid",
      sourceSnapshotId: "synthetic-source-snapshot-P_grid",
    });
    expect(result.powerSnapshot.P_workpiece_absorbed).toMatchObject({
      parameterId: "P_workpiece_absorbed",
      boundaryRole: "workpiece_absorbed_power",
      portId: null,
      referencePlaneId: "workpiece-electromagnetic-absorption-boundary",
      controlVolumeId: "workpiece-control-volume",
    });
    expect(result.sourceRefs).toEqual(["ID-TH-01"]);
    expect(result.contractSourceRefs).toEqual([
      "ID-TH-01",
      "DER-ENERGY",
      "DER-CIRCUIT",
    ]);
    expect(result.methodCheckIds).toEqual(["SYS-P-001"]);
  });

  it("performs exact conservation diagnostics without modifying any input", () => {
    const result = successOf(baseInput());
    expect(result.accountingChecks.workpieceBalance).toEqual({
      kind: "available",
      checkId: "workpiece_useful_plus_environment_loss",
      equation:
        "P_workpiece_absorbed - (P_useful + Q_loss_environment)",
      boundaryInputW: 600,
      accountedSumW: 600,
      residualW: 0,
      classification: "exact_binary64_balance",
      inputAdjusted: false,
    });
    expect(result.accountingChecks.coilMinimumBalance).toMatchObject({
      kind: "available",
      accountedSumW: 700,
      residualW: 100,
      classification: "positive_unaccounted_residual",
      inputAdjusted: false,
    });
  });

  it.each([
    ["P_grid", ["eta_inv", "eta_overall"]],
    ["P_inverter_out", ["eta_inv"]],
    ["P_coil_terminal", ["eta_coil_wp"]],
    ["P_workpiece_absorbed", ["eta_coil_wp", "eta_thermal"]],
    ["P_useful", ["eta_thermal", "eta_overall"]],
    ["P_cu", []],
    ["Q_loss_environment", []],
  ] as const)(
    "keeps only outputs consuming missing %s unavailable",
    (parameterId, unavailableRatioIds) => {
      const result = successOf(
        withPower(baseInput(), parameterId, unavailablePower(parameterId)),
      );
      expect(result.missingBoundaryParameterIds).toEqual([parameterId]);
      for (const ratioId of [
        "eta_inv",
        "eta_coil_wp",
        "eta_thermal",
        "eta_overall",
      ] as const) {
        const expectedUnavailable = (
          unavailableRatioIds as readonly string[]
        ).includes(ratioId);
        expect(result.value[ratioId].kind).toBe(
          expectedUnavailable ? "unavailable" : "available",
        );
        if (expectedUnavailable) {
          expect(result.value[ratioId]).not.toHaveProperty("valueSi");
        }
      }
    },
  );

  it("never treats an unavailable quantity as a hidden zero", () => {
    const result = successOf(
      withPower(baseInput(), "P_inverter_out", unavailablePower("P_inverter_out")),
    );
    expect(result.value.eta_inv).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.value.eta_inv).not.toHaveProperty("valueSi");
    expect(result.calculationTrace[0]).toMatchObject({
      numeratorW: null,
      denominatorW: 1_000,
      nominalNumeratorMinusDenominatorW: null,
      publicationStatus: "unavailable_missing_quantity",
    });
  });

  it.each([
    ["caseSnapshotId", "other-case"],
    ["stateSnapshotId", "other-state"],
    ["loadedState", "workpiece_cold"],
    ["timeBasisId", "other-time-basis"],
    ["measurementWindowId", "other-window"],
    ["powerChainSnapshotId", "other-chain"],
    ["provenanceBasisId", "other-provenance-basis"],
  ] as const)(
    "withholds only eta_inv for a %s chain-binding mismatch",
    (field, value) => {
      const candidate = withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { [field]: value }),
      );
      const result = successOf(candidate);
      expect(result.value.eta_inv).toMatchObject({
        kind: "unavailable",
        status: "insufficient_data",
      });
      expect(result.value.eta_overall.kind).toBe("available");
      expect(result.calculationTrace[0]).toMatchObject({
        boundaryConsistency: "mismatch",
        publicationStatus: "unavailable_boundary_mismatch",
      });
    },
  );

  it("allows the frozen ratio to cross its two different named ports while retaining both", () => {
    const result = successOf(baseInput());
    expect(availableValue(result, "eta_inv")).toBe(0.9);
    expect(result.powerSnapshot.P_grid).toMatchObject({
      portId: "grid-input-meter-port",
      controlVolumeId: "complete-heating-system",
    });
    expect(result.powerSnapshot.P_inverter_out).toMatchObject({
      portId: "inverter-output-port",
      controlVolumeId: "inverter-control-volume",
    });
  });

  it("retains independent source snapshots while requiring their shared provenance basis", () => {
    const result = successOf(baseInput());
    expect(result.powerSnapshot.P_grid.kind).toBe("available");
    expect(result.powerSnapshot.P_inverter_out.kind).toBe("available");
    if (
      result.powerSnapshot.P_grid.kind === "available" &&
      result.powerSnapshot.P_inverter_out.kind === "available"
    ) {
      expect(result.powerSnapshot.P_grid.sourceSnapshotId).not.toBe(
        result.powerSnapshot.P_inverter_out.sourceSnapshotId,
      );
      expect(result.powerSnapshot.P_grid.provenanceBasisId).toBe(
        result.powerSnapshot.P_inverter_out.provenanceBasisId,
      );
    }
  });

  it("returns an unavailable output and warning for every zero denominator", () => {
    const gridZero = successOf(
      withPower(baseInput(), "P_grid", availablePower("P_grid", { valueW: 0 })),
    );
    expect(gridZero.value.eta_inv).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(gridZero.value.eta_overall).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(gridZero.warnings.map((warning) => warning.ratioId)).toEqual([
      "eta_inv",
      "eta_overall",
    ]);

    const coilZero = successOf(
      withPower(
        baseInput(),
        "P_coil_terminal",
        availablePower("P_coil_terminal", { valueW: 0 }),
      ),
    );
    expect(coilZero.value.eta_coil_wp).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });

    const workpieceZero = successOf(
      withPower(
        baseInput(),
        "P_workpiece_absorbed",
        availablePower("P_workpiece_absorbed", { valueW: 0 }),
      ),
    );
    expect(workpieceZero.value.eta_thermal).toMatchObject({
      kind: "unavailable",
      status: "not_applicable",
    });
    expect(workpieceZero.value.eta_coil_wp).toMatchObject({
      kind: "available",
      valueSi: 0,
    });
  });

  it("preserves exact zero-numerator and unity analytical limits", () => {
    const zero = successOf(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 0 }),
      ),
    );
    expect(availableValue(zero, "eta_inv")).toBe(0);

    const unity = successOf(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1_000 }),
      ),
    );
    expect(availableValue(unity, "eta_inv")).toBe(1);
  });

  it("returns inconsistent_measurement when eta_inv exceeds one beyond explicit uncertainty", () => {
    const result = failureOf(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1_001 }),
      ),
    );
    expect(result.status).toBe("inconsistent_measurement");
    expect(result.failure.code).toBe(
      "G-04.efficiency_exceeds_one_beyond_uncertainty",
    );
    expect(result).not.toHaveProperty("value");
  });

  it("requires precomputed expanded N-D uncertainty for nominal efficiency above one", () => {
    const candidate = withUncertainty(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1_001 }),
      ),
      "etaInverter",
      unavailableUncertainty("eta_inv"),
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-04.uncertainty_required_for_nominal_exceedance",
    );
  });

  it("withholds rather than clamps an above-one nominal ratio within uncertainty", () => {
    const candidate = withUncertainty(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1_001 }),
      ),
      "etaInverter",
      exactUncertainty("eta_inv", 2),
    );
    const result = successOf(candidate);
    expect(result.status).toBe("success_with_warnings");
    expect(result.value.eta_inv).toMatchObject({
      kind: "unavailable",
      status: "insufficient_data",
    });
    expect(result.value.eta_inv).not.toHaveProperty("valueSi");
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "G-04.nominal_efficiency_exceeds_one_within_uncertainty",
        ratioId: "eta_inv",
        guardedPredicateRef: "efficiency exceeds one beyond uncertainty",
      }),
    );
  });

  it("applies the same uncertainty rule to eta_overall without staged-route substitution", () => {
    let candidate = baseInput();
    candidate = withPower(
      candidate,
      "P_coil_terminal",
      availablePower("P_coil_terminal", { valueW: 1_200 }),
    );
    candidate = withPower(
      candidate,
      "P_workpiece_absorbed",
      availablePower("P_workpiece_absorbed", { valueW: 1_100 }),
    );
    candidate = withPower(
      candidate,
      "P_useful",
      availablePower("P_useful", { valueW: 1_001 }),
    );
    candidate = withUncertainty(
      candidate,
      "etaOverall",
      exactUncertainty("eta_overall", 2),
    );
    const result = successOf(candidate);
    expect(result.value.eta_inv.kind).toBe("available");
    expect(result.value.eta_coil_wp.kind).toBe("available");
    expect(result.value.eta_thermal.kind).toBe("available");
    expect(result.value.eta_overall.kind).toBe("unavailable");
    expect(result.warnings.at(-1)?.ratioId).toBe("eta_overall");
  });

  it("rejects swapped ratio uncertainty identities and malformed uncertainty", () => {
    const swapped = withUncertainty(
      baseInput(),
      "etaInverter",
      exactUncertainty("eta_overall"),
    );
    const swappedResult = failureOf(swapped);
    expect(swappedResult.status).toBe("invalid_input");
    expect(swappedResult.failure.code).toBe(
      "G-04.ratio_uncertainty_invalid",
    );

    for (const patch of [
      { expandedDifferenceUncertaintyW: -1 },
      { expandedDifferenceUncertaintyW: Number.MIN_VALUE },
      { expandedDifferenceUncertaintyW: Number.NaN },
      { coverageFactor: 0 },
      { coverageFactor: Number.POSITIVE_INFINITY },
      { uncertaintySourceRef: " " },
    ]) {
      const candidate = baseInput() as unknown as Record<string, any>;
      candidate.ratioUncertainties.etaThermal = {
        ...candidate.ratioUncertainties.etaThermal,
        ...patch,
      };
      const result = failureOf(
        candidate as G04PowerBoundariesAndEfficienciesInput,
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-04.ratio_uncertainty_invalid");
    }
  });

  it("rejects overall/staged double counting before an unrelated unknown treatment", () => {
    const candidate = withAssessment(baseInput(), {
      overallAndStagedEfficiencyTreatment:
        "overall_and_staged_multiplication_requested",
      reactivePowerTreatment: "unknown_or_unconfirmed",
    });
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-04.double_counting_not_applicable");
  });

  it("rejects known reactive-as-loss treatment before an unrelated unknown treatment", () => {
    const candidate = withAssessment(baseInput(), {
      overallAndStagedEfficiencyTreatment: "unknown_or_unconfirmed",
      reactivePowerTreatment: "included_or_requested_as_loss",
    });
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-04.reactive_power_not_applicable");
  });

  it("rejects reactive quantity evidence before unknown accounting or boundary mismatch", () => {
    let candidate = withPower(
      baseInput(),
      "P_cu",
      availablePower("P_cu", { quantityFamily: "reactive_power" }),
    );
    candidate = withPower(
      candidate,
      "P_inverter_out",
      availablePower("P_inverter_out", { stateSnapshotId: "mismatch" }),
    );
    candidate = withAssessment(candidate, {
      overallAndStagedEfficiencyTreatment: "unknown_or_unconfirmed",
    });
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-04.reactive_power_not_applicable");
  });

  it("classifies known wrong active/heat family before unknown accounting", () => {
    const candidate = withAssessment(
      withPower(
        baseInput(),
        "P_useful",
        availablePower("P_useful", { quantityFamily: "active_power" }),
      ),
      {
        reactivePowerTreatment: "unknown_or_unconfirmed",
      },
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-04.quantity_family_not_applicable");
  });

  it.each([
    ["overallAndStagedEfficiencyTreatment", "unknown_or_unconfirmed"],
    ["reactivePowerTreatment", "unknown_or_unconfirmed"],
  ] as const)("returns insufficient_data for unknown %s", (field, value) => {
    const candidate = withAssessment(baseInput(), { [field]: value });
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-04.accounting_assessment_unconfirmed",
    );
  });

  it("keeps unknown accounting classified before a generic ratio-boundary mismatch", () => {
    const candidate = withAssessment(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", {
          measurementWindowId: "different-window",
        }),
      ),
      { reactivePowerTreatment: "unknown_or_unconfirmed" },
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("insufficient_data");
    expect(result.failure.code).toBe(
      "G-04.accounting_assessment_unconfirmed",
    );
  });

  it("keeps a later malformed quantity above an earlier explicit missing boundary", () => {
    let candidate = withPower(
      baseInput(),
      "P_grid",
      unavailablePower("P_grid"),
    );
    candidate = withPower(
      candidate,
      "P_useful",
      availablePower("P_useful", { sourceKind: "bad-enum" as never }),
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-04.power_evidence_invalid");
  });

  it("keeps known double-counting exclusion above explicit missing boundaries", () => {
    const candidate = withAssessment(
      withPower(baseInput(), "P_grid", unavailablePower("P_grid")),
      {
        overallAndStagedEfficiencyTreatment:
          "overall_and_staged_multiplication_requested",
      },
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("not_applicable");
    expect(result.failure.code).toBe("G-04.double_counting_not_applicable");
  });

  it("validates every enum before a known or unknown domain classification", () => {
    const candidate = baseInput() as unknown as Record<string, any>;
    candidate.accountingAssessment = {
      overallAndStagedEfficiencyTreatment:
        "overall_and_staged_multiplication_requested",
      reactivePowerTreatment: "uncontrolled-later-enum",
      assessmentSourceRef: "source",
    };
    const result = failureOf(candidate as G04PowerBoundariesAndEfficienciesInput);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-04.accounting_assessment_invalid");
  });

  it.each(["P_grid", "P_inverter_out", "P_useful"] as const)(
    "rejects hostile numeric values for %s",
    (parameterId) => {
      for (const valueW of [
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MIN_VALUE,
      ]) {
        const candidate = withPower(
          baseInput(),
          parameterId,
          availablePower(parameterId, { valueW }),
        );
        const result = failureOf(candidate);
        expect(result.status).toBe("invalid_input");
        expect(result.failure.code).toBe("G-04.power_evidence_invalid");
      }
    },
  );

  it("rejects slot identity, boundary, port, state and provenance smuggling", () => {
    const patches: readonly Partial<G04AvailablePowerEvidence>[] = [
      { parameterId: "P_inverter_out" },
      { boundaryRole: "inverter_output_active_power" },
      { portId: null },
      { referencePlaneId: " " },
      { controlVolumeId: " " },
      { loadedState: "legacy_state" as never },
      { timeBasisId: " " },
      { sourceKind: "historical_guess" as never },
      { sourceRef: " " },
    ];
    for (const patch of patches) {
      const result = failureOf(
        withPower(
          baseInput(),
          "P_grid",
          availablePower("P_grid", patch),
        ),
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-04.power_evidence_invalid");
    }
  });

  it("requires explicit missing and uncertainty discriminators instead of null placeholders", () => {
    const nullPower = failureOf({
      ...baseInput(),
      gridPower: null,
    } as unknown as G04PowerBoundariesAndEfficienciesInput);
    expect(nullPower.status).toBe("invalid_input");
    expect(nullPower.failure.code).toBe("G-04.power_evidence_invalid");

    const nullUncertainty = failureOf({
      ...baseInput(),
      ratioUncertainties: {
        ...baseInput().ratioUncertainties,
        etaInverter: null,
      },
    } as unknown as G04PowerBoundariesAndEfficienciesInput);
    expect(nullUncertainty.status).toBe("invalid_input");
    expect(nullUncertainty.failure.code).toBe(
      "G-04.ratio_uncertainty_invalid",
    );
  });

  it("rejects an electrical port attached to a declared heat/control-volume quantity", () => {
    const result = failureOf(
      withPower(
        baseInput(),
        "Q_loss_environment",
        availablePower("Q_loss_environment", { portId: "invented-port" }),
      ),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-04.power_evidence_invalid");
  });

  it("fails closed on both directions of numerator-minus-denominator operand swallow", () => {
    const numeratorDominates = failureOf(
      withPower(
        withPower(
          baseInput(),
          "P_grid",
          availablePower("P_grid", { valueW: 1 }),
        ),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1e308 }),
      ),
    );
    expect(numeratorDominates.status).toBe("invalid_input");
    expect(numeratorDominates.failure.code).toBe(
      "G-04.numeric_resolution_invalid",
    );

    const denominatorDominates = failureOf(
      withPower(
        withPower(
          baseInput(),
          "P_grid",
          availablePower("P_grid", { valueW: 1e308 }),
        ),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1 }),
      ),
    );
    expect(denominatorDominates.status).toBe("invalid_input");
    expect(denominatorDominates.failure.code).toBe(
      "G-04.numeric_resolution_invalid",
    );
  });

  it("fails closed on conservation-sum overflow", () => {
    let candidate = baseInput();
    for (const parameterId of [
      "P_grid",
      "P_inverter_out",
      "P_coil_terminal",
      "P_workpiece_absorbed",
      "P_useful",
      "Q_loss_environment",
    ] as const) {
      candidate = withPower(
        candidate,
        parameterId,
        availablePower(parameterId, { valueW: Number.MAX_VALUE }),
      );
    }
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-04.numeric_resolution_invalid");
  });

  it("fails closed when a nonzero conservation term is swallowed", () => {
    let candidate = baseInput();
    for (const parameterId of [
      "P_grid",
      "P_inverter_out",
      "P_coil_terminal",
      "P_workpiece_absorbed",
      "P_useful",
    ] as const) {
      candidate = withPower(
        candidate,
        parameterId,
        availablePower(parameterId, { valueW: 1e308 }),
      );
    }
    candidate = withPower(
      candidate,
      "Q_loss_environment",
      availablePower("Q_loss_environment", { valueW: 1 }),
    );
    const result = failureOf(candidate);
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-04.numeric_resolution_invalid");
  });

  it("reports a negative exact conservation residual without tuning any power", () => {
    const candidate = withPower(
      baseInput(),
      "Q_loss_environment",
      availablePower("Q_loss_environment", { valueW: 121 }),
    );
    const result = successOf(candidate);
    expect(result.accountingChecks.workpieceBalance).toMatchObject({
      residualW: -1,
      classification: "nominal_accounted_sum_exceeds_boundary",
      inputAdjusted: false,
    });
    expect(result.powerSnapshot.Q_loss_environment).toMatchObject({ valueW: 121 });
  });

  it("exposes the machine-only representability policy without engineering thresholds", () => {
    expect(G04_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputOrResultPolicy: "fail_closed",
      overflowFalseZeroAndSwallowedTermPolicy: "fail_closed",
      sourceEquationRearranged: false,
      minimumPositiveNormal: G04_BINARY64_MIN_NORMAL,
    });
  });

  it("rejects missing, extra and symbol top-level fields", () => {
    const missing = baseInput() as unknown as Record<string, unknown>;
    delete missing.gridPower;
    const extra = { ...baseInput(), hiddenOverallEfficiency: 0.9 };
    const symbol = baseInput() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = 1;
    for (const candidate of [missing, extra, symbol]) {
      const result = failureOf(
        candidate as unknown as G04PowerBoundariesAndEfficienciesInput,
      );
      expect(result.status).toBe("invalid_input");
      expect(result.failure.code).toBe("G-04.input_schema_invalid");
    }
  });

  it("does not execute hostile top-level or nested accessors", () => {
    let calls = 0;
    const top = { ...baseInput() } as Record<string, unknown>;
    Object.defineProperty(top, "gridPower", {
      enumerable: true,
      get() {
        calls += 1;
        return availablePower("P_grid");
      },
    });
    const topResult = failureOf(
      top as unknown as G04PowerBoundariesAndEfficienciesInput,
    );
    expect(topResult.failure.code).toBe("G-04.input_schema_invalid");

    const nested = {
      ...availablePower("P_grid"),
    } as Record<string, unknown>;
    Object.defineProperty(nested, "valueW", {
      enumerable: true,
      get() {
        calls += 1;
        return 1_000;
      },
    });
    const nestedResult = failureOf({
      ...baseInput(),
      gridPower: nested,
    } as unknown as G04PowerBoundariesAndEfficienciesInput);
    expect(nestedResult.failure.code).toBe("G-04.power_evidence_invalid");
    expect(calls).toBe(0);
  });

  it("rejects hostile Proxy reflection traps, class records and custom prototypes", () => {
    const proxied = new Proxy(baseInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    class InputRecord {
      public gridPower = baseInput().gridPower;
      public inverterOutputPower = baseInput().inverterOutputPower;
      public coilTerminalPower = baseInput().coilTerminalPower;
      public workpieceAbsorbedPower = baseInput().workpieceAbsorbedPower;
      public usefulPower = baseInput().usefulPower;
      public copperLoss = baseInput().copperLoss;
      public workpieceHeatLoss = baseInput().workpieceHeatLoss;
      public ratioUncertainties = baseInput().ratioUncertainties;
      public accountingAssessment = baseInput().accountingAssessment;
    }
    const inheritedPower = Object.create(
      availablePower("P_grid"),
    ) as G04AvailablePowerEvidence;
    for (const candidate of [
      proxied,
      new InputRecord(),
      { ...baseInput(), gridPower: inheritedPower },
    ]) {
      const result = failureOf(
        candidate as G04PowerBoundariesAndEfficienciesInput,
      );
      expect(result.status).toBe("invalid_input");
    }
  });

  it("keeps success records deeply immutable and does not mutate the caller", () => {
    const candidate = baseInput();
    const before = JSON.stringify(candidate);
    const result = successOf(candidate);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.eta_inv)).toBe(true);
    expect(Object.isFrozen(result.powerSnapshot)).toBe(true);
    expect(Object.isFrozen(result.powerSnapshot.P_grid)).toBe(true);
    expect(Object.isFrozen(result.uncertaintySnapshot)).toBe(true);
    expect(Object.isFrozen(result.uncertaintySnapshot.etaInverter)).toBe(true);
    expect(Object.isFrozen(result.calculationTrace)).toBe(true);
    expect(Object.isFrozen(result.calculationTrace[0])).toBe(true);
    expect(Object.isFrozen(result.accountingChecks)).toBe(true);
    expect(Object.isFrozen(result.accountingChecks.workpieceBalance)).toBe(true);
    expect(Object.isFrozen(result.assumptions)).toBe(true);
  });

  it("keeps every global failure free of result, trace, snapshot and diagnostic payload", () => {
    const inconsistent = failureOf(
      withPower(
        baseInput(),
        "P_inverter_out",
        availablePower("P_inverter_out", { valueW: 1_001 }),
      ),
    );
    const insufficientCandidate = withAssessment(baseInput(), {
      reactivePowerTreatment: "unknown_or_unconfirmed",
    });
    const insufficient = failureOf(insufficientCandidate);
    const notApplicableCandidate = withAssessment(baseInput(), {
      reactivePowerTreatment: "included_or_requested_as_loss",
    });
    const notApplicable = failureOf(notApplicableCandidate);
    const invalid = failureOf(
      withPower(
        baseInput(),
        "P_grid",
        availablePower("P_grid", { valueW: Number.NaN }),
      ),
    );
    expect(
      [inconsistent, insufficient, notApplicable, invalid]
        .map((entry) => entry.status)
        .sort(),
    ).toEqual([
      "inconsistent_measurement",
      "insufficient_data",
      "invalid_input",
      "not_applicable",
    ]);
    for (const result of [
      inconsistent,
      insufficient,
      notApplicable,
      invalid,
    ]) {
      expect(result).not.toHaveProperty("value");
      expect(result).not.toHaveProperty("powerSnapshot");
      expect(result).not.toHaveProperty("uncertaintySnapshot");
      expect(result).not.toHaveProperty("accountingAssessment");
      expect(result).not.toHaveProperty("calculationTrace");
      expect(result).not.toHaveProperty("accountingChecks");
    }
  });

  it("contains no historical output, calibration target or runtime-fetch dependency", () => {
    const source = readFileSync(
      new URL(
        "../../../src/methods/G/g04PowerBoundariesAndEfficiencies.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/fetch\s*\(|localStorage|indexedDB|localhost|https?:\/\//i);
    expect(source).not.toMatch(/legacy workbook|historical output|calibration target/i);
  });

  it("uses all seven distinct frozen parameter identities without a generic P slot", () => {
    const result = successOf(baseInput());
    expect(Object.keys(result.powerSnapshot)).toEqual(PARAMETER_IDS);
  });
});
