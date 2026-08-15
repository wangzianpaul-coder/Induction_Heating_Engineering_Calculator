import { describe, expect, it } from "vitest";

import * as PUBLIC_API from "../../../src/public-api.js";
import {
  G02_BINARY64_MIN_NORMAL,
  G02_CONTINUOUS_PROCESS_MAPPING,
  G02_IMPLEMENTATION_READINESS,
  G02_METHOD_CHECK_IDS,
  G02_NUMERIC_REPRESENTABILITY_POLICY,
  G02_WARNING_PREDICATES,
  evaluateG02ContinuousProcessUsefulPower,
  type G02ContinuousProcessUsefulPowerInput,
  type G02ContinuousProcessUsefulPowerOutcome,
  type G02ContinuousProcessUsefulPowerSuccess,
  type G02ExplicitStreamEvidence,
  type G02ProcessBoundaryEvidence,
  type G02StreamBinding,
} from "../../../src/methods/G/g02ContinuousProcessUsefulPower.js";

const CASE_SNAPSHOT = `case:${"a".repeat(64)}`;
const SOURCE_SNAPSHOT = `case:${"b".repeat(64)}`;
const MATERIAL_SNAPSHOT_A = `material:${"c".repeat(64)}`;
const MATERIAL_SNAPSHOT_B = `material:${"d".repeat(64)}`;

function processBoundary(
  overrides: Partial<G02ProcessBoundaryEvidence> = {},
): G02ProcessBoundaryEvidence {
  return {
    processIntent: "steady_continuous_process_stream_enthalpy_rate",
    steadyStateAssessment: "confirmed_steady_for_declared_time_basis",
    caseSnapshotId: CASE_SNAPSHOT,
    controlVolumeId: "process-heated-stream-control-volume",
    processStateSnapshotId: "process-state.steady.hot.001",
    timeBasisId: "steady-process-average",
    measurementWindowId: "process-window.001",
    processSnapshotId: "process-snapshot.001",
    sourceSnapshotId: SOURCE_SNAPSHOT,
    sourceRef: "PROJECT-PROCESS:BOUNDARY:001",
    ...overrides,
  };
}

function binding(
  streamId = "feed-stream-001",
  overrides: Partial<G02StreamBinding> = {},
): G02StreamBinding {
  return {
    caseSnapshotId: CASE_SNAPSHOT,
    controlVolumeId: "process-heated-stream-control-volume",
    processStateSnapshotId: "process-state.steady.hot.001",
    timeBasisId: "steady-process-average",
    measurementWindowId: "process-window.001",
    processSnapshotId: "process-snapshot.001",
    sourceSnapshotId: SOURCE_SNAPSHOT,
    streamId,
    physicalStreamPathId: `physical-path.${streamId}`,
    materialId: `material.${streamId}`,
    materialStateId: `material-state.${streamId}`,
    materialSnapshotId: MATERIAL_SNAPSHOT_A,
    enthalpyReferenceStateId: `enthalpy-reference.${streamId}`,
    ...overrides,
  };
}

interface StreamOptions {
  readonly streamId?: string;
  readonly massFlowKgPerS?: number;
  readonly hinJPerKg?: number;
  readonly houtJPerKg?: number;
  readonly bindingOverrides?: Partial<G02StreamBinding>;
}

function stream(options: StreamOptions = {}): G02ExplicitStreamEvidence {
  const streamId = options.streamId ?? "feed-stream-001";
  const commonBinding = binding(streamId, options.bindingOverrides);
  const makeBinding = (): G02StreamBinding => ({ ...commonBinding });
  return {
    massFlow: {
      kind: "available",
      inputId: "mass_flow(mdot)",
      valueSi: options.massFlowKgPerS ?? 0.4,
      quantityBasis: "mass_flow_rate",
      dimensionId: "mass_flow_rate",
      canonicalUnitId: "kg_per_s",
      binding: makeBinding(),
      sourceKind: "measurement",
      dataQuality: "measured",
      sourceRef: `PROJECT-FLOW:${streamId}`,
      provenanceId: `flow-provenance.${streamId}`,
    },
    inletEnthalpy: {
      kind: "available",
      inputId: "hin",
      boundaryLocation: "inlet",
      valueJPerKg: options.hinJPerKg ?? 120_000,
      dimensionId: "specific_energy",
      canonicalUnitId: "J_per_kg",
      binding: makeBinding(),
      sourceKind: "material_property",
      dataQuality: "project_specific",
      sourceRef: `PROJECT-HIN:${streamId}`,
      provenanceId: `hin-provenance.${streamId}`,
    },
    outletEnthalpy: {
      kind: "available",
      inputId: "hout",
      boundaryLocation: "outlet",
      valueJPerKg: options.houtJPerKg ?? 370_000,
      dimensionId: "specific_energy",
      canonicalUnitId: "J_per_kg",
      binding: makeBinding(),
      sourceKind: "material_property",
      dataQuality: "project_specific",
      sourceRef: `PROJECT-HOUT:${streamId}`,
      provenanceId: `hout-provenance.${streamId}`,
    },
    thermochemicalAssessment: {
      kind: "thermochemical_reference_assessment",
      referenceStateConsistency: "confirmed_same_reference_state",
      reactionEnthalpyTreatment: "source_confirmed_not_applicable",
      assessmentSourceRef: `PROJECT-THERMOCHEM:${streamId}`,
      binding: makeBinding(),
    },
  };
}

function input(
  streams: readonly G02ExplicitStreamEvidence[] = [stream()],
): G02ContinuousProcessUsefulPowerInput {
  return {
    processBoundary: processBoundary(),
    enthalpyRoute: {
      kind: "explicit_inlet_outlet_specific_enthalpy",
      streams,
    },
  };
}

function changed(
  mutate: (candidate: Record<string, any>) => void,
): G02ContinuousProcessUsefulPowerInput {
  const candidate = structuredClone(input()) as Record<string, any>;
  mutate(candidate);
  return candidate as G02ContinuousProcessUsefulPowerInput;
}

function successOf(
  candidate: G02ContinuousProcessUsefulPowerInput,
): G02ContinuousProcessUsefulPowerSuccess {
  const result = evaluateG02ContinuousProcessUsefulPower(candidate);
  expect(result.status).toBe("success");
  if (result.status !== "success") {
    throw new Error(result.failure.message);
  }
  return result;
}

function failureOf(
  candidate: unknown,
): Exclude<G02ContinuousProcessUsefulPowerOutcome, G02ContinuousProcessUsefulPowerSuccess> {
  const result = evaluateG02ContinuousProcessUsefulPower(
    candidate as G02ContinuousProcessUsefulPowerInput,
  );
  expect(result.status).not.toBe("success");
  if (result.status === "success") throw new Error("expected G-02 failure");
  for (const forbidden of [
    "value",
    "streamResults",
    "calculationTrace",
    "inputSnapshot",
    "materialSources",
    "evidence",
    "result",
  ]) {
    expect(result).not.toHaveProperty(forbidden);
  }
  expect(result.warningIds).toEqual([]);
  expect(result.warnings).toEqual([]);
  return result;
}

function expectClosedFailure(
  candidate: unknown,
  status: "invalid_input" | "insufficient_data" | "not_applicable",
  code: string,
): void {
  const result = failureOf(candidate);
  expect(result.status).toBe(status);
  expect(result.failure.code).toBe(code);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.failure)).toBe(true);
}

describe("G-02 frozen mapping and isolated route", () => {
  it("maps exactly to ID-TH-01, DER-ENERGY and TH-E-002 without inventing IDs", () => {
    expect(G02_CONTINUOUS_PROCESS_MAPPING).toEqual({
      methodId: "G-02",
      methodVersion: "1.0.0-gate0",
      approvalStatus: "approved",
      equationRef: "CALCULATION_CONTRACTS.md#G-02:Equation",
      applicabilityRef: "CALCULATION_CONTRACTS.md#G-02:Applicability",
      warningRef: "CALCULATION_CONTRACTS.md#G-02:Warning predicates",
      validationRef: "CALCULATION_CONTRACTS.md#G-02:Validation",
      inputParameterIds: ["mass_flow(mdot)", "hin", "hout", "T+cp+delta_h"],
      outputQuantityIds: ["Puseful"],
      sourceRefs: ["ID-TH-01"],
      contractSourceRefs: ["ID-TH-01", "DER-ENERGY", "process data missing"],
      derivationRefs: ["ID-TH-01", "DER-ENERGY"],
      validationCaseIds: [],
      methodCheckIds: ["TH-E-002"],
      warningPredicates: [
        "mass in kg is used as mass flow in kg/s",
        "reaction-enthalpy sign or reference state is unknown",
        "startup furnace heating is counted as steady process-flow power",
      ],
      stableWarningIds: [],
      numericRepresentabilityPolicy: G02_NUMERIC_REPRESENTABILITY_POLICY,
      implementationReadiness: G02_IMPLEMENTATION_READINESS,
    });
    expect(G02_METHOD_CHECK_IDS).toEqual(["TH-E-002"]);
    expect(G02_WARNING_PREDICATES).toEqual({
      massInKgUsedAsMassFlow:
        "mass in kg is used as mass flow in kg/s",
      reactionSignOrReferenceStateUnknown:
        "reaction-enthalpy sign or reference state is unknown",
      startupFurnaceCountedAsSteady:
        "startup furnace heating is counted as steady process-flow power",
    });
  });

  it("freezes only machine representability guards", () => {
    expect(G02_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(G02_NUMERIC_REPRESENTABILITY_POLICY).toEqual({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputOrResultPolicy: "fail_closed",
      overflowFalseZeroAndSwallowedTermPolicy: "fail_closed",
      orderedStreamSummation: true,
      sourceEquationRearranged: false,
      minimumPositiveNormal: 2 ** -1022,
    });
    expect(G02_IMPLEMENTATION_READINESS).toMatchObject({
      runtimeActivated: false,
      publicApiExported: false,
      implementedRoute: "explicit_hin_hout_steady_streams",
      realProcessEnthalpyValidation: "blocked",
    });
  });

  it("does not activate G-02 through the public API", () => {
    expect(PUBLIC_API).not.toHaveProperty(
      "evaluateG02ContinuousProcessUsefulPower",
    );
    expect(PUBLIC_API).not.toHaveProperty("G02_CONTINUOUS_PROCESS_MAPPING");
  });
});

describe("G-02 explicit hin/hout calculation", () => {
  it("closes TH-E-002 for one explicit steady stream", () => {
    const result = successOf(input());
    expect(result.value.Puseful).toEqual({
      outputId: "Puseful",
      valueSi: 100_000,
      dimensionId: "power",
      canonicalUnitId: "W",
      controlVolumeId: "process-heated-stream-control-volume",
      caseSnapshotId: CASE_SNAPSHOT,
      processStateSnapshotId: "process-state.steady.hot.001",
      timeBasisId: "steady-process-average",
      processSnapshotId: "process-snapshot.001",
    });
    expect(result.streamResults[0]).toMatchObject({
      massFlowKgPerS: 0.4,
      inletSpecificEnthalpyJPerKg: 120_000,
      outletSpecificEnthalpyJPerKg: 370_000,
      specificEnthalpyRiseJPerKg: 250_000,
      usefulPowerW: 100_000,
      inputAdjusted: false,
    });
    expect(result.methodType).toBe("numerical");
    expect(result.resultProvenance).toBe("predicted");
    expect(result.scientificConfidence).toBe("high");
    expect(result.warningIds).toEqual([]);
  });

  it("sums multiple explicit physical streams in declared order", () => {
    const first = stream({
      streamId: "feed-A",
      massFlowKgPerS: 0.25,
      hinJPerKg: 40_000,
      houtJPerKg: 160_000,
    });
    const second = stream({
      streamId: "feed-B",
      massFlowKgPerS: 0.5,
      hinJPerKg: 10_000,
      houtJPerKg: 90_000,
      bindingOverrides: {
        materialId: "material.feed-B",
        materialStateId: "material-state.feed-B",
        materialSnapshotId: MATERIAL_SNAPSHOT_B,
        enthalpyReferenceStateId: "enthalpy-reference.feed-B",
      },
    });
    const result = successOf(input([first, second]));
    expect(result.streamResults.map((entry) => entry.usefulPowerW)).toEqual([
      30_000, 40_000,
    ]);
    expect(result.value.Puseful.valueSi).toBe(70_000);
    expect(result.calculationTrace.at(-1)).toMatchObject({
      equation: "Puseful = sum(P_stream_i)",
      orderedSubstitutionValues: [30_000, 40_000],
      resultSi: 70_000,
    });
    expect(result.materialSources.map((entry) => entry.materialSnapshotId)).toEqual([
      MATERIAL_SNAPSHOT_A,
      MATERIAL_SNAPSHOT_B,
    ]);
  });

  it("permits an exact zero enthalpy-rise limit without a placeholder", () => {
    const result = successOf(
      input([stream({ hinJPerKg: 80_000, houtJPerKg: 80_000 })]),
    );
    expect(result.value.Puseful.valueSi).toBe(0);
    expect(result.streamResults[0]?.specificEnthalpyRiseJPerKg).toBe(0);
    expect(result.streamResults[0]?.usefulPowerW).toBe(0);
  });

  it("normalizes the exact signed-zero limit instead of publishing negative zero", () => {
    const result = successOf(
      input([stream({ hinJPerKg: 0, houtJPerKg: -0 })]),
    );
    expect(Object.is(result.streamResults[0]?.specificEnthalpyRiseJPerKg, -0)).toBe(
      false,
    );
    expect(Object.is(result.streamResults[0]?.usefulPowerW, -0)).toBe(false);
    expect(Object.is(result.value.Puseful.valueSi, -0)).toBe(false);
  });

  it("allows signed specific enthalpies on one common reference state", () => {
    const result = successOf(
      input([stream({ hinJPerKg: -250_000, houtJPerKg: 50_000 })]),
    );
    expect(result.streamResults[0]?.specificEnthalpyRiseJPerKg).toBe(300_000);
    expect(result.value.Puseful.valueSi).toBe(120_000);
  });

  it("is invariant to a common enthalpy reference offset", () => {
    const baseline = successOf(
      input([stream({ hinJPerKg: 20_000, houtJPerKg: 120_000 })]),
    );
    const shifted = successOf(
      input([stream({ hinJPerKg: -480_000, houtJPerKg: -380_000 })]),
    );
    expect(shifted.value.Puseful.valueSi).toBe(
      baseline.value.Puseful.valueSi,
    );
  });

  it("scales linearly with mass flow and enthalpy rise", () => {
    const baseline = successOf(
      input([stream({ massFlowKgPerS: 0.2, hinJPerKg: 0, houtJPerKg: 50_000 })]),
    );
    const doubledFlow = successOf(
      input([stream({ massFlowKgPerS: 0.4, hinJPerKg: 0, houtJPerKg: 50_000 })]),
    );
    const doubledRise = successOf(
      input([stream({ massFlowKgPerS: 0.2, hinJPerKg: 0, houtJPerKg: 100_000 })]),
    );
    expect(doubledFlow.value.Puseful.valueSi).toBe(
      2 * baseline.value.Puseful.valueSi,
    );
    expect(doubledRise.value.Puseful.valueSi).toBe(
      2 * baseline.value.Puseful.valueSi,
    );
  });

  it("accepts reaction enthalpy only when the positive sign is source-declared", () => {
    const candidate = changed((value) => {
      value.enthalpyRoute.streams[0].thermochemicalAssessment.reactionEnthalpyTreatment =
        "included_in_hout_minus_hin_with_declared_positive_useful_sign";
    });
    const result = successOf(candidate);
    expect(result.value.Puseful.valueSi).toBe(100_000);
    expect(
      result.inputSnapshot.enthalpyRoute.streams[0]?.thermochemicalAssessment
        .reactionEnthalpyTreatment,
    ).toBe("included_in_hout_minus_hin_with_declared_positive_useful_sign");
  });

  it("preserves source, material, reference-state and substitution provenance", () => {
    const result = successOf(input());
    expect(result.materialSources[0]).toEqual({
      streamId: "feed-stream-001",
      materialId: "material.feed-stream-001",
      materialSnapshotId: MATERIAL_SNAPSHOT_A,
      enthalpySourceRefs: [
        "PROJECT-HIN:feed-stream-001",
        "PROJECT-HOUT:feed-stream-001",
      ],
      enthalpyProvenanceIds: [
        "hin-provenance.feed-stream-001",
        "hout-provenance.feed-stream-001",
      ],
      enthalpyReferenceStateId: "enthalpy-reference.feed-stream-001",
    });
    expect(result.calculationTrace).toHaveLength(3);
    expect(result.calculationTrace[0]).toMatchObject({
      equation: "delta_h_process = hout - hin",
      orderedSubstitutionValues: [370_000, 120_000],
      canonicalUnitId: "J_per_kg",
    });
    expect(result.sourceRefs).toEqual(["ID-TH-01"]);
    expect(result.contractSourceRefs).toEqual([
      "ID-TH-01",
      "DER-ENERGY",
      "process data missing",
    ]);
    expect(result.validationCaseIds).toEqual([]);
    expect(result.methodCheckIds).toEqual(["TH-E-002"]);
  });

  it("does not mutate input evidence and returns frozen snapshots", () => {
    const candidate = input();
    const before = structuredClone(candidate);
    const result = successOf(candidate);
    expect(candidate).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.Puseful)).toBe(true);
    expect(Object.isFrozen(result.streamResults)).toBe(true);
    expect(Object.isFrozen(result.calculationTrace)).toBe(true);
    expect(Object.isFrozen(result.materialSources)).toBe(true);
  });
});

describe("G-02 routes and semantic status priority", () => {
  it.each([
    ["blocked", null],
    ["unknown_or_unconfirmed", null],
    ["available_versioned_result", "G01-enthalpy-result.001"],
  ] as const)(
    "fails closed for the unimplemented T+cp route with upstream status %s",
    (upstreamEnthalpyToolStatus, upstreamResultId) => {
      const candidate: G02ContinuousProcessUsefulPowerInput = {
        processBoundary: processBoundary(),
        enthalpyRoute: {
          kind: "temperature_cp_phase_reaction",
          upstreamEnthalpyToolStatus,
          upstreamResultId,
          reason: "versioned upstream enthalpy adapter not active",
        },
      };
      expectClosedFailure(
        candidate,
        "insufficient_data",
        "G-02.temperature_cp_route_unavailable",
      );
    },
  );

  it("prioritizes a known startup-furnace route over unknown steady/enthalpy-tool evidence", () => {
    const candidate: G02ContinuousProcessUsefulPowerInput = {
      processBoundary: processBoundary({
        processIntent: "startup_furnace_thermal_mass_heating",
        steadyStateAssessment: "unknown_or_unconfirmed",
      }),
      enthalpyRoute: {
        kind: "temperature_cp_phase_reaction",
        upstreamEnthalpyToolStatus: "unknown_or_unconfirmed",
        upstreamResultId: null,
        reason: "startup request",
      },
    };
    expectClosedFailure(
      candidate,
      "not_applicable",
      "G-02.startup_furnace_not_applicable",
    );
  });

  it("prioritizes known startup-furnace intent over otherwise invalid stream-route semantics", () => {
    const first = stream({ streamId: "duplicate" });
    const second = structuredClone(first) as Record<string, any>;
    second.massFlow.canonicalUnitId = "kg";
    expectClosedFailure(
      {
        processBoundary: processBoundary({
          processIntent: "startup_furnace_thermal_mass_heating",
        }),
        enthalpyRoute: {
          kind: "explicit_inlet_outlet_specific_enthalpy",
          streams: [first, second as G02ExplicitStreamEvidence],
        },
      },
      "not_applicable",
      "G-02.startup_furnace_not_applicable",
    );
  });

  it("rejects a known transient interval", () => {
    expectClosedFailure(
      {
        ...input(),
        processBoundary: processBoundary({
          steadyStateAssessment: "known_transient_or_startup",
        }),
      },
      "not_applicable",
      "G-02.transient_process_not_applicable",
    );
  });

  it("does not treat batch kg as kg/s", () => {
    expectClosedFailure(
      changed((candidate) => {
        const flow = candidate.enthalpyRoute.streams[0].massFlow;
        flow.quantityBasis = "batch_mass";
        flow.dimensionId = "mass";
        flow.canonicalUnitId = "kg";
      }),
      "not_applicable",
      "G-02.batch_mass_not_mass_flow",
    );
  });

  it("rejects a known reference-state mismatch before unrelated unknown source evidence", () => {
    expectClosedFailure(
      changed((candidate) => {
        const streamValue = candidate.enthalpyRoute.streams[0];
        streamValue.thermochemicalAssessment.referenceStateConsistency =
          "known_reference_state_mismatch";
        streamValue.massFlow.sourceKind = "unknown_or_unconfirmed";
      }),
      "not_applicable",
      "G-02.reference_state_not_applicable",
    );
  });

  it("rejects a known opposite reaction sign before unrelated unknown source evidence", () => {
    expectClosedFailure(
      changed((candidate) => {
        const streamValue = candidate.enthalpyRoute.streams[0];
        streamValue.thermochemicalAssessment.reactionEnthalpyTreatment =
          "known_opposite_or_inconsistent_sign";
        streamValue.outletEnthalpy.dataQuality = "unknown";
      }),
      "not_applicable",
      "G-02.reaction_sign_not_applicable",
    );
  });

  it("gives malformed controlled enums priority over startup classification", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.processBoundary.processIntent =
          "startup_furnace_thermal_mass_heating";
        candidate.enthalpyRoute.streams[0].outletEnthalpy.sourceKind =
          "invented_source_kind";
      }),
      "invalid_input",
      "G-02.specific_enthalpy_evidence_invalid",
    );
  });

  it.each([
    ["duplicate stream ID", (second: Record<string, any>, first: Record<string, any>) => {
      second.massFlow.binding.streamId = first.massFlow.binding.streamId;
      second.inletEnthalpy.binding.streamId = first.massFlow.binding.streamId;
      second.outletEnthalpy.binding.streamId = first.massFlow.binding.streamId;
      second.thermochemicalAssessment.binding.streamId = first.massFlow.binding.streamId;
    }],
    ["duplicate physical path", (second: Record<string, any>, first: Record<string, any>) => {
      const path = first.massFlow.binding.physicalStreamPathId;
      second.massFlow.binding.physicalStreamPathId = path;
      second.inletEnthalpy.binding.physicalStreamPathId = path;
      second.outletEnthalpy.binding.physicalStreamPathId = path;
      second.thermochemicalAssessment.binding.physicalStreamPathId = path;
    }],
  ] as const)("rejects %s double counting", (_name, mutate) => {
    const first = stream({ streamId: "feed-A" });
    const second = structuredClone(stream({ streamId: "feed-B" })) as Record<string, any>;
    mutate(second, first as unknown as Record<string, any>);
    expectClosedFailure(
      input([first, second as G02ExplicitStreamEvidence]),
      "invalid_input",
      "G-02.duplicate_stream_or_path",
    );
  });

  it("rejects mixed mass basis/dimension/unit semantics", () => {
    expectClosedFailure(
      changed((candidate) => {
        candidate.enthalpyRoute.streams[0].massFlow.canonicalUnitId = "kg";
      }),
      "invalid_input",
      "G-02.mass_flow_route_inconsistent",
    );
  });

  it.each([
    ["process intent", (candidate: Record<string, any>) => {
      candidate.processBoundary.processIntent = "unknown_or_unconfirmed";
    }],
    ["steady state", (candidate: Record<string, any>) => {
      candidate.processBoundary.steadyStateAssessment = "unknown_or_unconfirmed";
    }],
  ] as const)("fails closed when %s is unconfirmed", (_name, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "insufficient_data",
      "G-02.process_boundary_unconfirmed",
    );
  });

  it("fails closed when the mass-flow basis is wholly unconfirmed", () => {
    expectClosedFailure(
      changed((candidate) => {
        const flow = candidate.enthalpyRoute.streams[0].massFlow;
        flow.quantityBasis = "unknown_or_unconfirmed";
        flow.dimensionId = "unknown_or_unconfirmed";
        flow.canonicalUnitId = "unknown_or_unconfirmed";
      }),
      "insufficient_data",
      "G-02.mass_flow_basis_unconfirmed",
    );
  });

  it.each([
    ["source kind", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].massFlow.sourceKind =
        "unknown_or_unconfirmed";
    }],
    ["data quality", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].outletEnthalpy.dataQuality = "unknown";
    }],
  ] as const)("fails closed for unknown %s", (_name, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "insufficient_data",
      "G-02.source_evidence_unconfirmed",
    );
  });

  it.each([
    ["reference state", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].thermochemicalAssessment.referenceStateConsistency =
        "unknown_or_unconfirmed";
    }],
    ["reaction sign", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].thermochemicalAssessment.reactionEnthalpyTreatment =
        "unknown_or_unconfirmed";
    }],
  ] as const)("fails closed for unknown %s evidence", (_name, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "insufficient_data",
      "G-02.thermochemical_evidence_unconfirmed",
    );
  });
});

describe("G-02 immutable stream and process boundaries", () => {
  const bindingFields: ReadonlyArray<readonly [string, unknown]> = [
    ["caseSnapshotId", `case:${"e".repeat(64)}`],
    ["controlVolumeId", "other-control-volume"],
    ["processStateSnapshotId", "other-process-state"],
    ["timeBasisId", "other-time-basis"],
    ["measurementWindowId", "other-window"],
    ["processSnapshotId", "other-process-snapshot"],
    ["sourceSnapshotId", `case:${"f".repeat(64)}`],
    ["streamId", "other-stream"],
    ["physicalStreamPathId", "other-physical-path"],
    ["materialId", "other-material"],
    ["materialStateId", "other-material-state"],
    ["materialSnapshotId", `material:${"e".repeat(64)}`],
    ["enthalpyReferenceStateId", "other-enthalpy-reference"],
  ];

  it.each(bindingFields)(
    "rejects hin with a different %s binding",
    (field, value) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.enthalpyRoute.streams[0].inletEnthalpy.binding[field] = value;
        }),
        "insufficient_data",
        "G-02.stream_binding_mismatch",
      );
    },
  );

  it("binds hout and the thermochemical assessment independently", () => {
    for (const candidate of [
      changed((value) => {
        value.enthalpyRoute.streams[0].outletEnthalpy.binding.measurementWindowId =
          "other-window";
      }),
      changed((value) => {
        value.enthalpyRoute.streams[0].thermochemicalAssessment.binding.sourceSnapshotId =
          `case:${"f".repeat(64)}`;
      }),
    ]) {
      expectClosedFailure(
        candidate,
        "insufficient_data",
        "G-02.stream_binding_mismatch",
      );
    }
  });

  const processFields: ReadonlyArray<readonly [string, unknown]> = [
    ["caseSnapshotId", `case:${"e".repeat(64)}`],
    ["controlVolumeId", "other-control-volume"],
    ["processStateSnapshotId", "other-process-state"],
    ["timeBasisId", "other-time-basis"],
    ["measurementWindowId", "other-window"],
    ["processSnapshotId", "other-process-snapshot"],
    ["sourceSnapshotId", `case:${"f".repeat(64)}`],
  ];

  it.each(processFields)(
    "rejects a stream outside the process %s boundary",
    (field, value) => {
      expectClosedFailure(
        changed((candidate) => {
          for (const record of [
            candidate.enthalpyRoute.streams[0].massFlow,
            candidate.enthalpyRoute.streams[0].inletEnthalpy,
            candidate.enthalpyRoute.streams[0].outletEnthalpy,
            candidate.enthalpyRoute.streams[0].thermochemicalAssessment,
          ]) {
            record.binding[field] = value;
          }
        }),
        "insufficient_data",
        "G-02.process_boundary_mismatch",
      );
    },
  );

  it("does not compare or sum enthalpies from mismatched stream bindings", () => {
    const candidate = changed((value) => {
      value.enthalpyRoute.streams[0].outletEnthalpy.valueJPerKg = -1_000_000;
      value.enthalpyRoute.streams[0].outletEnthalpy.binding.streamId =
        "unrelated-stream";
    });
    expectClosedFailure(
      candidate,
      "insufficient_data",
      "G-02.stream_binding_mismatch",
    );
  });
});

describe("G-02 invalid and hostile inputs", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MIN_VALUE])(
    "rejects invalid mass-flow value %s",
    (valueSi) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.enthalpyRoute.streams[0].massFlow.valueSi = valueSi;
        }),
        "invalid_input",
        "G-02.mass_flow_evidence_invalid",
      );
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MIN_VALUE, -Number.MIN_VALUE])(
    "rejects invalid specific enthalpy value %s",
    (valueJPerKg) => {
      expectClosedFailure(
        changed((candidate) => {
          candidate.enthalpyRoute.streams[0].outletEnthalpy.valueJPerKg =
            valueJPerKg;
        }),
        "invalid_input",
        "G-02.specific_enthalpy_evidence_invalid",
      );
    },
  );

  it.each([
    ["total energy unit", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].inletEnthalpy.canonicalUnitId = "J";
    }],
    ["wrong dimension", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].outletEnthalpy.dimensionId = "energy";
    }],
    ["swapped input ID", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].inletEnthalpy.inputId = "hout";
    }],
    ["swapped location", (candidate: Record<string, any>) => {
      candidate.enthalpyRoute.streams[0].outletEnthalpy.boundaryLocation = "inlet";
    }],
  ] as const)("rejects %s instead of canonical hin/hout", (_name, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "invalid_input",
      "G-02.specific_enthalpy_evidence_invalid",
    );
  });

  it.each([
    ["bad case hash", (candidate: Record<string, any>) => {
      candidate.processBoundary.caseSnapshotId = `case:${"A".repeat(64)}`;
    }],
    ["bad source snapshot", (candidate: Record<string, any>) => {
      candidate.processBoundary.sourceSnapshotId = "source-unhashed";
    }],
    ["empty CV", (candidate: Record<string, any>) => {
      candidate.processBoundary.controlVolumeId = "";
    }],
    ["bogus process enum", (candidate: Record<string, any>) => {
      candidate.processBoundary.processIntent = "continuous-ish";
    }],
  ] as const)("rejects malformed process boundary: %s", (_name, mutate) => {
    expectClosedFailure(
      changed(mutate),
      "invalid_input",
      "G-02.process_boundary_invalid",
    );
  });

  it("rejects an empty explicit stream array", () => {
    expectClosedFailure(
      input([]),
      "invalid_input",
      "G-02.stream_array_invalid",
    );
  });

  it("rejects sparse, accessor and symbol-bearing stream arrays", () => {
    const sparse = structuredClone(input()) as Record<string, any>;
    sparse.enthalpyRoute.streams = new Array(1);
    expectClosedFailure(
      sparse,
      "invalid_input",
      "G-02.stream_array_invalid",
    );

    const accessor = structuredClone(input()) as Record<string, any>;
    const accessorArray: unknown[] = [stream()];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        throw new Error("must not execute");
      },
    });
    accessor.enthalpyRoute.streams = accessorArray;
    expectClosedFailure(
      accessor,
      "invalid_input",
      "G-02.stream_array_invalid",
    );

    const symbol = structuredClone(input()) as Record<string, any>;
    symbol.enthalpyRoute.streams[Symbol("hidden")] = "not controlled";
    expectClosedFailure(
      symbol,
      "invalid_input",
      "G-02.stream_array_invalid",
    );
  });

  it("rejects null, primitives, missing and extra top-level fields", () => {
    for (const candidate of [
      null,
      undefined,
      1,
      "input",
      {},
      { processBoundary: processBoundary() },
      { ...input(), extra: true },
    ]) {
      expectClosedFailure(
        candidate,
        "invalid_input",
        "G-02.input_schema_invalid",
      );
    }
  });

  it("rejects nested extras, symbols, accessors and class instances", () => {
    const nestedExtra = structuredClone(input()) as Record<string, any>;
    nestedExtra.enthalpyRoute.streams[0].massFlow.extra = 1;
    expectClosedFailure(
      nestedExtra,
      "invalid_input",
      "G-02.mass_flow_evidence_invalid",
    );

    const symbol = structuredClone(input()) as Record<string, any>;
    symbol.processBoundary[Symbol("hidden")] = true;
    expectClosedFailure(
      symbol,
      "invalid_input",
      "G-02.process_boundary_invalid",
    );

    const accessor = structuredClone(input()) as Record<string, any>;
    Object.defineProperty(accessor.enthalpyRoute.streams[0].outletEnthalpy, "sourceRef", {
      enumerable: true,
      configurable: true,
      get: () => {
        throw new Error("must not execute");
      },
    });
    expectClosedFailure(
      accessor,
      "invalid_input",
      "G-02.specific_enthalpy_evidence_invalid",
    );

    class BoundaryRecord {
      readonly processIntent = "steady_continuous_process_stream_enthalpy_rate";
      readonly steadyStateAssessment = "confirmed_steady_for_declared_time_basis";
      readonly caseSnapshotId = CASE_SNAPSHOT;
      readonly controlVolumeId = "process-heated-stream-control-volume";
      readonly processStateSnapshotId = "process-state.steady.hot.001";
      readonly timeBasisId = "steady-process-average";
      readonly measurementWindowId = "process-window.001";
      readonly processSnapshotId = "process-snapshot.001";
      readonly sourceSnapshotId = SOURCE_SNAPSHOT;
      readonly sourceRef = "PROJECT-PROCESS:BOUNDARY:001";
    }
    expectClosedFailure(
      { ...input(), processBoundary: new BoundaryRecord() },
      "invalid_input",
      "G-02.process_boundary_invalid",
    );
  });

  it("catches hostile reflection proxies without executing value coercion", () => {
    const hostileBoundary = new Proxy(processBoundary(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expectClosedFailure(
      { ...input(), processBoundary: hostileBoundary },
      "invalid_input",
      "G-02.process_boundary_invalid",
    );

    const hostileArray = new Proxy([stream()], {
      ownKeys() {
        throw new Error("hostile array ownKeys");
      },
    });
    expectClosedFailure(
      {
        ...input(),
        enthalpyRoute: {
          kind: "explicit_inlet_outlet_specific_enthalpy",
          streams: hostileArray,
        },
      },
      "invalid_input",
      "G-02.stream_array_invalid",
    );
  });
});

describe("G-02 binary64 and failure-closed arithmetic", () => {
  it("rejects a decreasing enthalpy route without applying abs", () => {
    const result = failureOf(
      input([stream({ hinJPerKg: 200_000, houtJPerKg: 100_000 })]),
    );
    expect(result.status).toBe("invalid_input");
    expect(result.failure.code).toBe("G-02.enthalpy_decrease_invalid");
    expect(result.failure.action).toContain("no absolute value");
  });

  it.each([
    [
      "enthalpy subtraction overflow",
      stream({ hinJPerKg: -Number.MAX_VALUE, houtJPerKg: Number.MAX_VALUE }),
    ],
    [
      "enthalpy subtraction positive-subnormal",
      stream({
        hinJPerKg: G02_BINARY64_MIN_NORMAL,
        houtJPerKg: G02_BINARY64_MIN_NORMAL + Number.MIN_VALUE,
      }),
    ],
    [
      "enthalpy subtraction swallows hin",
      stream({ hinJPerKg: G02_BINARY64_MIN_NORMAL, houtJPerKg: 1e300 }),
    ],
    [
      "power multiplication overflow",
      stream({ massFlowKgPerS: Number.MAX_VALUE, hinJPerKg: 0, houtJPerKg: 2 }),
    ],
    [
      "power multiplication underflows",
      stream({
        massFlowKgPerS: G02_BINARY64_MIN_NORMAL,
        hinJPerKg: 0,
        houtJPerKg: 0.5,
      }),
    ],
  ] as const)("fails closed when %s", (_name, candidateStream) => {
    expectClosedFailure(
      input([candidateStream]),
      "invalid_input",
      "G-02.numeric_resolution_invalid",
    );
  });

  it.each([
    [
      "a non-unit enthalpy multiplier is swallowed",
      stream({
        massFlowKgPerS: G02_BINARY64_MIN_NORMAL,
        hinJPerKg: 0,
        houtJPerKg: 1 - Number.EPSILON / 2,
      }),
    ],
    [
      "a non-unit mass-flow multiplier is swallowed",
      stream({
        massFlowKgPerS: 1 - Number.EPSILON / 2,
        hinJPerKg: 0,
        houtJPerKg: G02_BINARY64_MIN_NORMAL,
      }),
    ],
  ] as const)("fails closed when %s", (_name, candidateStream) => {
    expectClosedFailure(
      input([candidateStream]),
      "invalid_input",
      "G-02.numeric_resolution_invalid",
    );
  });

  it.each([
    [
      "unit enthalpy multiplier",
      stream({
        massFlowKgPerS: G02_BINARY64_MIN_NORMAL,
        hinJPerKg: 0,
        houtJPerKg: 1,
      }),
    ],
    [
      "unit mass-flow multiplier",
      stream({
        massFlowKgPerS: 1,
        hinJPerKg: 0,
        houtJPerKg: G02_BINARY64_MIN_NORMAL,
      }),
    ],
  ] as const)("retains the exact %s boundary", (_name, candidateStream) => {
    const result = successOf(input([candidateStream]));
    expect(result.value.Puseful.valueSi).toBe(G02_BINARY64_MIN_NORMAL);
  });

  it("rejects aggregate overflow", () => {
    expectClosedFailure(
      input([
        stream({ streamId: "A", massFlowKgPerS: 1, hinJPerKg: 0, houtJPerKg: Number.MAX_VALUE }),
        stream({ streamId: "B", massFlowKgPerS: 1, hinJPerKg: 0, houtJPerKg: Number.MAX_VALUE }),
      ]),
      "invalid_input",
      "G-02.numeric_resolution_invalid",
    );
  });

  it("rejects a swallowed positive multi-stream contribution", () => {
    expectClosedFailure(
      input([
        stream({ streamId: "large", massFlowKgPerS: 1, hinJPerKg: 0, houtJPerKg: 1e300 }),
        stream({ streamId: "small", massFlowKgPerS: 1, hinJPerKg: 0, houtJPerKg: 1 }),
      ]),
      "invalid_input",
      "G-02.numeric_resolution_invalid",
    );
  });
});
