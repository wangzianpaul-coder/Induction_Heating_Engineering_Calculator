import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { methodId } from "../../../src/domain/ids.js";
import { METHOD_SPECIFICATION_REGISTRY } from "../../../src/registries/methodSpecificationRegistry.js";
import {
  J06_CONTRACT_SOURCE_REFS,
  J06_DERIVATION_REFS,
  J06_IMPLEMENTATION_READINESS,
  J06_METHOD_CHECK_IDS,
  J06_METHOD_MAPPING,
  J06_NUMERIC_ACCUMULATION_POLICY,
  J06_SOURCE_REFS,
  J06_VALIDATION_CASE_IDS,
  J06_WARNING_PREDICATES,
  evaluateJ06TotalSteadyHeatLoss,
  type J06AvailableHeatLossTerm,
  type J06ControlVolumeEvidence,
  type J06HeatLossInputId,
  type J06HeatLossTerm,
  type J06HeatPathMechanism,
  type J06TotalSteadyHeatLossInput,
  type J06TotalSteadyHeatLossOutcome,
  type J06TotalSteadyHeatLossSuccess,
  type J06UnavailableHeatLossTerm,
} from "../../../src/methods/J/j06TotalSteadyHeatLoss.js";

const CASE_SNAPSHOT = `case:${"1".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"2".repeat(64)}`;

const MECHANISMS: Readonly<
  Record<J06HeatLossInputId, J06HeatPathMechanism>
> = Object.freeze({
  Qconv: "convection",
  Qrad: "radiation",
  Qends: "end_loss",
  Qbridges: "thermal_bridge",
  Qopenings: "opening_loss",
});

const DEFAULT_VALUES: Readonly<Record<J06HeatLossInputId, number>> =
  Object.freeze({
    Qconv: 10,
    Qrad: 20,
    Qends: 30,
    Qbridges: 40,
    Qopenings: 50,
  });

function controlVolume(
  overrides: Partial<J06ControlVolumeEvidence> = {},
): J06ControlVolumeEvidence {
  return {
    controlVolumeId: "control-volume:heater-01",
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    boundaryId: "boundary:ambient-loss:v1",
    timeBasisId: "time-basis:steady-state:v1",
    analysisRegime: "steady_state",
    positiveDirection: "outward_from_control_volume_to_ambient",
    heatLossBoundaryConfirmed: true,
    nonOverlappingPathAreasConfirmed: true,
    noDuplicateHeatFlowPathsConfirmed: true,
    seriesPathAggregationAbsentConfirmed: true,
    pickupSeparatedFromAmbientLossConfirmed: true,
    ...overrides,
  };
}

function availableTerm(
  inputId: J06HeatLossInputId,
  valueW = DEFAULT_VALUES[inputId],
  overrides: Partial<J06AvailableHeatLossTerm> = {},
): J06AvailableHeatLossTerm {
  return {
    kind: "available",
    inputId,
    pathMechanism: MECHANISMS[inputId],
    valueW,
    dimensionId: "power",
    canonicalUnitId: "W",
    sourceKind: "derived",
    sourceRef: `method:J-child:result:${inputId}:v1`,
    dataQuality: "project_specific",
    valueResolution: "known_value",
    controlVolumeId: "control-volume:heater-01",
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    boundaryId: "boundary:ambient-loss:v1",
    timeBasisId: "time-basis:steady-state:v1",
    pathId: `heat-path:${inputId}`,
    pathRelationship: "parallel_independent_ambient_loss",
    deduplicationStatus: "confirmed_unique_not_counted_elsewhere",
    lossClassification: "ambient_heat_loss",
    ...overrides,
  };
}

function unavailableTerm(
  inputId: J06HeatLossInputId,
  status: J06UnavailableHeatLossTerm["status"] = "not_applicable",
  overrides: Partial<J06UnavailableHeatLossTerm> = {},
): J06UnavailableHeatLossTerm {
  return {
    kind: "unavailable",
    inputId,
    pathMechanism: MECHANISMS[inputId],
    status,
    reason:
      status === "not_applicable"
        ? "source-confirmed absent from this control volume"
        : "applicable path is not resolved",
    resolutionSourceRef: `case:path-resolution:${inputId}:v1`,
    resolution:
      status === "not_applicable"
        ? "confirmed_absent_from_control_volume"
        : "applicable_but_unresolved",
    controlVolumeId: "control-volume:heater-01",
    caseSnapshotId: CASE_SNAPSHOT,
    geometrySnapshotId: GEOMETRY_SNAPSHOT,
    boundaryId: "boundary:ambient-loss:v1",
    timeBasisId: "time-basis:steady-state:v1",
    pathId: `heat-path:${inputId}`,
    ...overrides,
  };
}

function input(
  overrides: Partial<J06TotalSteadyHeatLossInput> = {},
): J06TotalSteadyHeatLossInput {
  return {
    Qconv: availableTerm("Qconv"),
    Qrad: availableTerm("Qrad"),
    Qends: availableTerm("Qends"),
    Qbridges: availableTerm("Qbridges"),
    Qopenings: availableTerm("Qopenings"),
    controlVolume: controlVolume(),
    ...overrides,
  };
}

function successOf(
  candidate: unknown,
): J06TotalSteadyHeatLossSuccess {
  const result = evaluateJ06TotalSteadyHeatLoss(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(`Expected J-06 success, received ${result.status}.`);
  }
  return result;
}

function expectFailureWithoutPayload(
  result: J06TotalSteadyHeatLossOutcome,
): void {
  expect(result.status).not.toBe("success");
  if (result.status === "success") {
    throw new Error("Expected a J-06 failure.");
  }
  expect("value" in result).toBe(false);
  expect("evidence" in result).toBe(false);
  expect("substitution" in result).toBe(false);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.failure)).toBe(true);
  expect(result.warningIds).toEqual([]);
}

function replaceTerm(
  candidate: J06TotalSteadyHeatLossInput,
  inputId: J06HeatLossInputId,
  term: J06HeatLossTerm,
): J06TotalSteadyHeatLossInput {
  return { ...candidate, [inputId]: term };
}

describe("J-06 total steady-state heat loss", () => {
  it("binds the exact frozen registry, source, contract, derivation, and check metadata", () => {
    expect(J06_METHOD_MAPPING).toMatchObject({
      methodId: "J-06",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      methodType: "analytical",
      equationRef: "CALCULATION_CONTRACTS.md#J-06:Equation",
      inputParameterIds: [
        "Qconv",
        "Qrad",
        "Qends",
        "Qbridges",
        "Qopenings",
        "control_volume",
      ],
      outputQuantityIds: ["Qloss_total", "missing_items", "boundary"],
      stableWarningIds: [],
    });
    expect(J06_SOURCE_REFS).toEqual(["ID-HT-01"]);
    expect(J06_CONTRACT_SOURCE_REFS).toEqual([
      "ID-HT-01",
      "DER-THERM",
      "DER-ENERGY",
    ]);
    expect(J06_DERIVATION_REFS).toEqual([
      "ID-HT-01",
      "DER-THERM",
      "DER-ENERGY",
    ]);
    expect(J06_VALIDATION_CASE_IDS).toEqual([]);
    expect(J06_METHOD_CHECK_IDS).toEqual(["THERM-BAL-001"]);
    expect(J06_METHOD_MAPPING.warningPredicates).toEqual([
      J06_WARNING_PREDICATES.seriesPathHeatFlowsAdded,
      J06_WARNING_PREDICATES.unknownEndOrBridgeSetToZero,
      J06_WARNING_PREDICATES.pickupMixedWithAmbientLoss,
    ]);
  });

  it("records all nonactivation gates without editing controlled registries", () => {
    expect(J06_IMPLEMENTATION_READINESS).toMatchObject({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openGates: [
        { gateId: "J-06.stable-warning-ids" },
        {
          gateId: "J-06.parameter-dictionary-contract-alignment",
          registeredContractInputIds: [],
          parameterIdsDeclaringJ06Consumer: ["thermal.effective_length"],
        },
        { gateId: "J-06.primary-unavailable-publication-adapter" },
      ],
    });
  });

  it("remains isolated from the public API and runtime registry", async () => {
    const publicApi: object = await import("../../../src/public-api.js");
    expect("evaluateJ06TotalSteadyHeatLoss" in publicApi).toBe(false);
    expect("J06_METHOD_MAPPING" in publicApi).toBe(false);
    const specification = METHOD_SPECIFICATION_REGISTRY.get(
      methodId("J-06"),
    );
    expect(specification.implementationAvailable).toBe(false);
    expect(specification.executable).toBe(false);
    expect(
      METHOD_SPECIFICATION_REGISTRY.isRuntimeExecutable(methodId("J-06")),
    ).toBe(false);
  });

  it("implements THERM-BAL-001 as the fixed five-term control-volume sum", () => {
    const result = successOf(input());
    expect(result.value.QlossTotal).toEqual({
      kind: "available",
      outputId: "Qloss_total",
      valueSi: 150,
      dimensionId: "power",
      canonicalUnitId: "W",
      positiveDirection: "outward_from_control_volume_to_ambient",
      interpretation:
        "net_outward_ambient_heat_loss_for_declared_control_volume",
    });
    expect(result.value.missingItems).toMatchObject({
      kind: "available",
      outputId: "missing_items",
      value: [],
    });
    expect(result.value.boundary).toMatchObject({
      kind: "available",
      outputId: "boundary",
      value: controlVolume(),
    });
    expect(result.equation).toBe(
      "Qloss_total = Qconv + Qrad + Qends + Qbridges + Qopenings",
    );
    expect(result.methodCheckIds).toEqual(["THERM-BAL-001"]);
  });

  it.each([
    ["Qconv", 10],
    ["Qrad", 20],
    ["Qends", 30],
    ["Qbridges", 40],
    ["Qopenings", 50],
  ] as const)("preserves %s component scaling in canonical SI", (inputId, delta) => {
    const base = successOf(input());
    const scaledInput = replaceTerm(
      input(),
      inputId,
      availableTerm(inputId, 2 * delta),
    );
    const scaled = successOf(scaledInput);
    if (
      base.value.QlossTotal.kind !== "available" ||
      scaled.value.QlossTotal.kind !== "available"
    ) {
      throw new Error("Expected complete J-06 totals.");
    }
    expect(
      scaled.value.QlossTotal.valueSi - base.value.QlossTotal.valueSi,
    ).toBe(delta);
  });

  it("retains the frozen term order and source-bound component evidence", () => {
    const result = successOf(input());
    expect(result.substitution.orderedTerms.map((term) => term.inputId)).toEqual([
      "Qconv",
      "Qrad",
      "Qends",
      "Qbridges",
      "Qopenings",
    ]);
    expect(result.evidence.heatPaths.map((term) => term.pathId)).toEqual([
      "heat-path:Qconv",
      "heat-path:Qrad",
      "heat-path:Qends",
      "heat-path:Qbridges",
      "heat-path:Qopenings",
    ]);
    expect(result.substitution.knownSubtotalPublished).toBe(false);
  });

  it("preserves the outward-positive sign and exact cancellation", () => {
    const result = successOf(
      input({
        Qconv: availableTerm("Qconv", 100),
        Qrad: availableTerm("Qrad", -25),
        Qends: availableTerm("Qends", -75),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result.value.QlossTotal.kind).toBe("available");
    if (result.value.QlossTotal.kind !== "available") return;
    expect(result.value.QlossTotal.valueSi).toBe(0);
  });

  it("publishes a real zero only when every path is source-confirmed absent", () => {
    const result = successOf(
      input({
        Qconv: unavailableTerm("Qconv"),
        Qrad: unavailableTerm("Qrad"),
        Qends: unavailableTerm("Qends"),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result.value.QlossTotal).toMatchObject({
      kind: "available",
      valueSi: 0,
      dimensionId: "power",
      canonicalUnitId: "W",
    });
    expect(result.value.missingItems.value).toEqual([]);
    expect(
      result.evidence.heatPaths.every(
        (term) =>
          term.kind === "unavailable" &&
          term.status === "not_applicable" &&
          term.resolution === "confirmed_absent_from_control_volume",
      ),
    ).toBe(true);
  });

  it("accepts an explicit source-backed known zero without treating it as unknown", () => {
    const result = successOf(
      input({ Qends: availableTerm("Qends", 0) }),
    );
    expect(result.value.QlossTotal).toMatchObject({
      kind: "available",
      valueSi: 120,
    });
    expect(result.evidence.heatPaths[2]).toMatchObject({
      kind: "available",
      inputId: "Qends",
      valueW: 0,
      valueResolution: "known_value",
    });
  });

  it.each(["Qends", "Qbridges", "Qopenings"] as const)(
    "keeps Qloss_total unavailable when applicable %s is unresolved",
    (inputId) => {
      const result = successOf(
        replaceTerm(
          input(),
          inputId,
          unavailableTerm(inputId, "insufficient_data"),
        ),
      );
      expect(result.value.QlossTotal).toEqual({
        kind: "unavailable",
        outputId: "Qloss_total",
        status: "insufficient_data",
        reason: "one or more applicable heat-loss paths are unresolved",
      });
      expect(Object.keys(result.value.QlossTotal).sort()).toEqual([
        "kind",
        "outputId",
        "reason",
        "status",
      ]);
      expect("valueSi" in result.value.QlossTotal).toBe(false);
      expect("dimensionId" in result.value.QlossTotal).toBe(false);
      expect("canonicalUnitId" in result.value.QlossTotal).toBe(false);
      expect(result.value.missingItems.value).toEqual([inputId]);
      expect(result.substitution.resolution).toBe(
        "total_unavailable_due_to_unresolved_applicable_paths",
      );
      expect(result.substitution.knownSubtotalPublished).toBe(false);
      expect(result.status).toBe("success");
      expect(result.warnings).toEqual([]);
    },
  );

  it("distinguishes unresolved from source-confirmed not-applicable paths", () => {
    const result = successOf(
      input({
        Qends: unavailableTerm("Qends", "insufficient_data"),
        Qbridges: unavailableTerm("Qbridges", "not_applicable"),
        Qopenings: unavailableTerm("Qopenings", "insufficient_data"),
      }),
    );
    expect(result.value.missingItems.value).toEqual(["Qends", "Qopenings"]);
    expect(result.value.QlossTotal.kind).toBe("unavailable");
  });

  it("never accepts null as an implicit unresolved path discriminator", () => {
    const hostile = input() as unknown as Record<string, unknown>;
    hostile.Qends = null;
    const result = evaluateJ06TotalSteadyHeatLoss(hostile);
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-06.heat_path_missing" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects an unknown end loss substituted with zero using frozen warning prose", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qends: availableTerm("Qends", 0, {
          valueResolution: "unknown_substituted_zero",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.unknown_loss_substituted_zero" },
      warningIds: [],
      warnings: [
        { predicate: J06_WARNING_PREDICATES.unknownEndOrBridgeSetToZero },
      ],
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects series-path aggregation at the control-volume boundary", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        controlVolume: controlVolume({
          seriesPathAggregationAbsentConfirmed: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.series_path_aggregation_not_applicable" },
      warnings: [
        { predicate: J06_WARNING_PREDICATES.seriesPathHeatFlowsAdded },
      ],
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects a term classified as a series transfer stage", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm("Qconv", 10, {
          pathRelationship: "series_transfer_stage",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.series_path_not_applicable" },
      warnings: [
        { predicate: J06_WARNING_PREDICATES.seriesPathHeatFlowsAdded },
      ],
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects pickup mixed into the ambient-loss control volume", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        controlVolume: controlVolume({
          pickupSeparatedFromAmbientLossConfirmed: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.pickup_boundary_not_applicable" },
      warnings: [
        { predicate: J06_WARNING_PREDICATES.pickupMixedWithAmbientLoss },
      ],
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects a path classified as pickup or nonambient power", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qopenings: availableTerm("Qopenings", 50, {
          lossClassification: "inductive_pickup_or_nonambient",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: {
        code: "J-06.pickup_or_nonambient_path_not_applicable",
      },
      warnings: [
        { predicate: J06_WARNING_PREDICATES.pickupMixedWithAmbientLoss },
      ],
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    ["overlapping area", { nonOverlappingPathAreasConfirmed: false }],
    ["duplicate flow", { noDuplicateHeatFlowPathsConfirmed: false }],
    ["wrong boundary", { heatLossBoundaryConfirmed: false }],
  ] as const)("rejects a known %s control-volume violation", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({ controlVolume: controlVolume(overrides) }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.control_volume_not_applicable" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects duplicate path IDs across different input slots", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qrad: availableTerm("Qrad", 20, {
          pathId: "heat-path:Qconv",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.duplicate_or_overlapping_path" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects an explicitly duplicate or overlapping term", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qrad: availableTerm("Qrad", 20, {
          deduplicationStatus: "duplicate_or_overlapping",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.duplicate_or_overlapping_path" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    ["path relationship", { pathRelationship: "unconfirmed" }],
    ["deduplication", { deduplicationStatus: "unconfirmed" }],
    ["loss classification", { lossClassification: "unconfirmed" }],
  ] as const)("returns insufficient_data for unconfirmed %s", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm(
          "Qconv",
          10,
          overrides as Partial<J06AvailableHeatLossTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-06.heat_path_classification_unconfirmed" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    ["heat-loss boundary", { heatLossBoundaryConfirmed: null }],
    ["path areas", { nonOverlappingPathAreasConfirmed: null }],
    ["duplicate flows", { noDuplicateHeatFlowPathsConfirmed: null }],
    ["series aggregation", { seriesPathAggregationAbsentConfirmed: null }],
    ["pickup separation", { pickupSeparatedFromAmbientLossConfirmed: null }],
  ] as const)("returns insufficient_data for unresolved control-volume %s", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({ controlVolume: controlVolume(overrides) }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-06.control_volume_unconfirmed" },
    });
    expectFailureWithoutPayload(result);
  });

  it("prioritizes a known series-path violation over another unknown confirmation", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        controlVolume: controlVolume({
          seriesPathAggregationAbsentConfirmed: false,
          pickupSeparatedFromAmbientLossConfirmed: null,
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "not_applicable",
      failure: { code: "J-06.series_path_aggregation_not_applicable" },
    });
  });

  it.each([
    ["control volume", { controlVolumeId: "control-volume:other" }],
    ["case snapshot", { caseSnapshotId: `case:${"3".repeat(64)}` }],
    [
      "geometry snapshot",
      { geometrySnapshotId: `geometry:${"4".repeat(64)}` },
    ],
    ["boundary", { boundaryId: "boundary:other" }],
    ["time basis", { timeBasisId: "time-basis:other" }],
  ] as const)("rejects a heat path from a different %s", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm(
          "Qconv",
          10,
          overrides as Partial<J06AvailableHeatLossTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.heat_path_boundary_mismatch" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects a status/resolution contradiction on an unavailable path", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qends: unavailableTerm("Qends", "insufficient_data", {
          resolution: "confirmed_absent_from_control_volume",
        }),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.heat_path_binding_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    ["input ID", { inputId: "Qrad" }],
    ["mechanism", { pathMechanism: "radiation" }],
    ["dimension", { dimensionId: "energy" }],
    ["unit", { canonicalUnitId: "kW" }],
  ])("rejects an incorrect available-term %s binding", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm(
          "Qconv",
          10,
          overrides as Partial<J06AvailableHeatLossTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.heat_path_binding_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([
    ["source kind", { sourceKind: "spreadsheet_guess" }],
    ["source reference", { sourceRef: "" }],
    ["data quality", { dataQuality: "trusted" }],
  ])("fails closed for invalid %s provenance", (_label, overrides) => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm(
          "Qconv",
          10,
          overrides as Partial<J06AvailableHeatLossTerm>,
        ),
      }),
    );
    expect(result).toMatchObject({
      status: "insufficient_data",
      failure: { code: "J-06.heat_path_provenance_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite path value %s",
    (valueW) => {
      const result = evaluateJ06TotalSteadyHeatLoss(
        input({ Qconv: availableTerm("Qconv", valueW) }),
      );
      expect(result).toMatchObject({
        status: "invalid_input",
        failure: { code: "J-06.heat_path_value_invalid" },
      });
      expectFailureWithoutPayload(result);
    },
  );

  it("rejects finite-input overflow", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm("Qconv", Number.MAX_VALUE),
        Qrad: availableTerm("Qrad", Number.MAX_VALUE),
        Qends: unavailableTerm("Qends"),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.numeric_resolution_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects a positive term swallowed by a prior accumulator", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm("Qconv", Number.MAX_VALUE),
        Qrad: availableTerm("Qrad", 1),
        Qends: unavailableTerm("Qends"),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.numeric_resolution_invalid" },
    });
  });

  it("rejects a prior accumulator swallowed by a later positive term", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm("Qconv", 1),
        Qrad: availableTerm("Qrad", Number.MAX_VALUE),
        Qends: unavailableTerm("Qends"),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.numeric_resolution_invalid" },
    });
  });

  it("rejects cancellation that magnifies an intermediate one-ulp addition error into a plausible total", () => {
    const qconv = 1e16;
    const qrad = 3;
    const qends = -1e16;
    const contaminatedOrderedSum = (qconv + qrad) + qends;
    const exactIdentityOracle = (qconv + qends) + qrad;

    expect(contaminatedOrderedSum).toBe(4);
    expect(exactIdentityOracle).toBe(3);

    const result = evaluateJ06TotalSteadyHeatLoss(
      input({
        Qconv: availableTerm("Qconv", qconv),
        Qrad: availableTerm("Qrad", qrad),
        Qends: availableTerm("Qends", qends),
        Qbridges: availableTerm("Qbridges", 0),
        Qopenings: availableTerm("Qopenings", 0),
      }),
    );
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.numeric_resolution_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("records cancellation detection as a machine-only audit that never replaces the frozen sum", () => {
    expect(J06_NUMERIC_ACCUMULATION_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      orderedRoundoffRecoveryPolicy: "fail_closed_if_published_sum_changes",
      exactSubnormalInputTermCopyAllowed: true,
      sourceEquationRearranged: false,
    });
    expect(J06_METHOD_MAPPING.numericAccumulationPolicy).toBe(
      J06_NUMERIC_ACCUMULATION_POLICY,
    );
    expect(successOf(input()).numericAccumulationPolicy).toBe(
      J06_NUMERIC_ACCUMULATION_POLICY,
    );
  });

  it("preserves the smallest representable nonzero heat rate", () => {
    const result = successOf(
      input({
        Qconv: availableTerm("Qconv", Number.MIN_VALUE),
        Qrad: unavailableTerm("Qrad"),
        Qends: unavailableTerm("Qends"),
        Qbridges: unavailableTerm("Qbridges"),
        Qopenings: unavailableTerm("Qopenings"),
      }),
    );
    expect(result.value.QlossTotal).toMatchObject({
      kind: "available",
      valueSi: Number.MIN_VALUE,
    });
  });

  it.each([
    [null],
    [[]],
    [{ ...input(), extra: true }],
    [(() => {
      const candidate = input() as unknown as Record<string, unknown>;
      delete candidate.Qopenings;
      return candidate;
    })()],
  ])("rejects a non-exact top-level input %#", (candidate) => {
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.input_schema_invalid" },
    });
    expectFailureWithoutPayload(result);
  });

  it("rejects symbol-keyed input without executing coercion", () => {
    const candidate = input() as unknown as Record<PropertyKey, unknown>;
    candidate[Symbol("extra")] = true;
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.input_schema_invalid" },
    });
  });

  it("does not execute a top-level getter", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, unknown>;
    Object.defineProperty(candidate, "Qconv", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(executed).toBe(false);
    expectFailureWithoutPayload(result);
  });

  it("does not execute a nested heat-path getter", () => {
    let executed = false;
    const candidate = input();
    Object.defineProperty(candidate.Qconv, "valueW", {
      enumerable: true,
      get() {
        executed = true;
        throw new Error("must not execute");
      },
    });
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(executed).toBe(false);
    expectFailureWithoutPayload(result);
  });

  it("fails closed without throwing on hostile proxy reflection traps", () => {
    const candidate = new Proxy(input(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => evaluateJ06TotalSteadyHeatLoss(candidate)).not.toThrow();
    expectFailureWithoutPayload(evaluateJ06TotalSteadyHeatLoss(candidate));
  });

  it("fails closed without throwing on nested proxy descriptor traps", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.Qconv = new Proxy(availableTerm("Qconv"), {
      getOwnPropertyDescriptor() {
        throw new Error("hostile descriptor");
      },
    });
    expect(() => evaluateJ06TotalSteadyHeatLoss(candidate)).not.toThrow();
    expectFailureWithoutPayload(evaluateJ06TotalSteadyHeatLoss(candidate));
  });

  it("rejects coercible numeric objects without invoking valueOf", () => {
    let executed = false;
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.Qconv = availableTerm("Qconv", 10, {
      valueW: {
        valueOf() {
          executed = true;
          return 10;
        },
      } as unknown as number,
    });
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(executed).toBe(false);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.heat_path_value_invalid" },
    });
  });

  it("rejects a huge sparse array path quickly without throwing", () => {
    const candidate = input() as unknown as Record<string, unknown>;
    candidate.Qends = new Array(0xffffffff);
    expect(() => evaluateJ06TotalSteadyHeatLoss(candidate)).not.toThrow();
    const result = evaluateJ06TotalSteadyHeatLoss(candidate);
    expect(result).toMatchObject({
      status: "invalid_input",
      failure: { code: "J-06.heat_path_schema_invalid" },
    });
  });

  it("deep-freezes complete outputs, traces, boundary evidence, and mapping", () => {
    const result = successOf(input());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.QlossTotal)).toBe(true);
    expect(Object.isFrozen(result.value.missingItems)).toBe(true);
    expect(Object.isFrozen(result.value.missingItems.value)).toBe(true);
    expect(Object.isFrozen(result.value.boundary)).toBe(true);
    expect(Object.isFrozen(result.value.boundary.value)).toBe(true);
    expect(Object.isFrozen(result.substitution)).toBe(true);
    expect(Object.isFrozen(result.substitution.orderedTerms)).toBe(true);
    expect(
      result.substitution.orderedTerms.every((term) => Object.isFrozen(term)),
    ).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(Object.isFrozen(result.assumptions)).toBe(true);
    expect(Object.isFrozen(result.mapping)).toBe(true);
  });

  it("deep-freezes the partial-known unavailable-output path", () => {
    const result = successOf(
      input({ Qbridges: unavailableTerm("Qbridges", "insufficient_data") }),
    );
    expect(result.value.QlossTotal.kind).toBe("unavailable");
    expect(Object.isFrozen(result.value.QlossTotal)).toBe(true);
    expect(Object.isFrozen(result.value.missingItems.value)).toBe(true);
    expect(Object.isFrozen(result.evidence.heatPaths[3])).toBe(true);
  });

  it("binds every failure to method/version/mapping and publishes no engineering payload", () => {
    const result = evaluateJ06TotalSteadyHeatLoss(null);
    expect(result).toMatchObject({
      methodId: "J-06",
      methodVersion: "1.0.0-gate0",
      methodApproval: "approved",
      mapping: J06_METHOD_MAPPING,
      warningIds: [],
    });
    expectFailureWithoutPayload(result);
  });

  it("contains no forbidden historical cooling output constants", () => {
    const source = readFileSync(
      new URL(
        "../../../src/methods/J/j06TotalSteadyHeatLoss.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(source).not.toMatch(/783\s*(?:kW|000)/iu);
    expect(source).not.toMatch(/135\s*(?:L\s*\/\s*min|L\/min)/iu);
  });
});
