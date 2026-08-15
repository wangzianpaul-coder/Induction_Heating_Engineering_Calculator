import { describe, expect, it } from "vitest";

import {
  H03_BINARY64_MIN_NORMAL,
  H03_IMPLEMENTATION_READINESS,
  H03_METHOD_CHECK_IDS,
  H03_METHOD_MAPPING,
  H03_NUMERIC_REPRESENTABILITY_POLICY,
  H03_PARAMETER_MAPPING,
  H03_SOURCE_REFS,
  H03_WARNING_PREDICATES,
  evaluateH03BranchFlowGeometry,
  type H03BranchFlowGeometryFailure,
  type H03BranchFlowGeometryInput,
  type H03BranchFlowGeometryOutcome,
  type H03EqualSplitTotalVolumeFlow,
  type H03ExplicitBranchVolumeFlow,
  type H03HydraulicAreaEvidence,
  type H03HydraulicGeometryEvidence,
  type H03UnavailableFlow,
  type H03UnavailableHydraulicGeometryQuantity,
  type H03WettedPerimeterEvidence,
} from "../../../src/methods/H/h03BranchFlowGeometry.js";

const CASE_SNAPSHOT = `case:${"1".repeat(64)}`;
const OTHER_CASE_SNAPSHOT = `case:${"2".repeat(64)}`;
const FLOW_SOURCE_SNAPSHOT = `case:${"3".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"4".repeat(64)}`;
const OTHER_GEOMETRY_SNAPSHOT = `geometry:${"5".repeat(64)}`;
const D02_SOURCE_SNAPSHOT = `geometry:${"6".repeat(64)}`;
const OTHER_D02_SOURCE_SNAPSHOT = `geometry:${"7".repeat(64)}`;
const BRANCH_ID = "coolant-branch:01";
const NETWORK_ID = "coolant-network:01";
const HYDRAULIC_GEOMETRY_ID = "hydraulic-geometry:01";
const TIME_BASIS_ID = "time-basis:steady-design-point-01";

function explicitFlow(
  overrides: Partial<H03ExplicitBranchVolumeFlow> = {},
): H03ExplicitBranchVolumeFlow {
  return {
    kind: "explicit_branch_volume_flow",
    valueSi: 0.002,
    quantityKind: "volume_flow_rate",
    dimensionId: "volume_flow_rate",
    canonicalUnitId: "m3_per_s",
    valueResolution: "known_value",
    flowScope: "one_declared_branch",
    sourceMethod: "measurement",
    sourceRef: "measurement:branch-flow:01",
    dataQuality: "measured",
    provenanceId: "provenance:branch-flow:01",
    sourceSnapshotId: FLOW_SOURCE_SNAPSHOT,
    branchId: BRANCH_ID,
    coolantNetworkId: NETWORK_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    ...overrides,
  };
}

function equalSplitFlow(
  overrides: Partial<H03EqualSplitTotalVolumeFlow> = {},
): H03EqualSplitTotalVolumeFlow {
  return {
    kind: "equal_split_total_volume_flow",
    valueSi: 0.006,
    quantityKind: "volume_flow_rate",
    dimensionId: "volume_flow_rate",
    canonicalUnitId: "m3_per_s",
    valueResolution: "known_value",
    flowScope: "total_network_flow",
    sourceMethod: "H-02",
    sourceRef: "method:H-02:total-volume-flow",
    dataQuality: "project_specific",
    provenanceId: "provenance:total-flow:01",
    sourceSnapshotId: FLOW_SOURCE_SNAPSHOT,
    branchId: BRANCH_ID,
    coolantNetworkId: NETWORK_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    branchCount: 3,
    targetBranchOrdinal: 1,
    networkTopology: "parallel_branches",
    equalHydraulicGeometryConfirmed: true,
    equalResistanceConfirmed: true,
    hydraulicallyBalancedConfirmed: true,
    ...overrides,
  };
}

function unavailableFlow(
  overrides: Partial<H03UnavailableFlow> = {},
): H03UnavailableFlow {
  return {
    kind: "unavailable",
    status: "insufficient_data",
    reason: "Branch flow has not been measured or solved.",
    resolutionSourceRef: "resolution:branch-flow:01",
    sourceMethod: "unknown_or_unconfirmed",
    sourceRef: "source:branch-flow:unavailable",
    dataQuality: "unknown",
    provenanceId: "provenance:branch-flow:unavailable",
    sourceSnapshotId: FLOW_SOURCE_SNAPSHOT,
    branchId: BRANCH_ID,
    coolantNetworkId: NETWORK_ID,
    caseSnapshotId: CASE_SNAPSHOT,
    timeBasisId: TIME_BASIS_ID,
    ...overrides,
  };
}

const GEOMETRY_BOUNDARY = Object.freeze({
  sourceMethodId: "D-02" as const,
  sourceRef: "method:D-02:hydraulic-geometry",
  dataQuality: "project_specific" as const,
  provenanceId: "provenance:D-02:hydraulic-geometry:01",
  sourceSnapshotId: D02_SOURCE_SNAPSHOT,
  branchId: BRANCH_ID,
  coolantNetworkId: NETWORK_ID,
  hydraulicGeometryId: HYDRAULIC_GEOMETRY_ID,
  caseSnapshotId: CASE_SNAPSHOT,
  geometrySnapshotId: GEOMETRY_SNAPSHOT,
});

function hydraulicArea(
  overrides: Partial<Extract<H03HydraulicAreaEvidence, { kind: "available" }>> =
    {},
): Extract<H03HydraulicAreaEvidence, { kind: "available" }> {
  return {
    kind: "available",
    contractInputId: "Ah",
    parameterId: "coolant.flow_area",
    sourceQuantityId: "Ahydraulic",
    valueSi: 0.001,
    dimensionId: "area",
    canonicalUnitId: "m2",
    interpretation: "internal_coolant_flow_cross_section",
    ...GEOMETRY_BOUNDARY,
    ...overrides,
  };
}

function wettedPerimeter(
  overrides: Partial<Extract<H03WettedPerimeterEvidence, { kind: "available" }>> =
    {},
): Extract<H03WettedPerimeterEvidence, { kind: "available" }> {
  return {
    kind: "available",
    contractInputId: "Pwetted",
    parameterId: "coolant.wetted_perimeter",
    sourceQuantityId: "Pwetted",
    valueSi: 0.1,
    dimensionId: "length",
    canonicalUnitId: "m",
    interpretation: "internal_coolant_wetted_perimeter",
    ...GEOMETRY_BOUNDARY,
    ...overrides,
  };
}

function unavailableGeometryQuantity(
  inputId: "Ah" | "Pwetted",
  overrides: Partial<H03UnavailableHydraulicGeometryQuantity> = {},
): H03UnavailableHydraulicGeometryQuantity {
  return {
    kind: "unavailable",
    contractInputId: inputId,
    parameterId:
      inputId === "Ah" ? "coolant.flow_area" : "coolant.wetted_perimeter",
    sourceQuantityId: inputId === "Ah" ? "Ahydraulic" : "Pwetted",
    status: "insufficient_data",
    reason: "D-02 quantity is unresolved.",
    resolutionSourceRef: `resolution:D-02:${inputId}`,
    ...GEOMETRY_BOUNDARY,
    ...overrides,
  };
}

function geometry(
  overrides: Partial<H03HydraulicGeometryEvidence> = {},
): H03HydraulicGeometryEvidence {
  return {
    Ah: hydraulicArea(),
    Pwetted: wettedPerimeter(),
    sameD02HydraulicGeometryConfirmed: true,
    ...overrides,
  };
}

function input(
  overrides: Partial<H03BranchFlowGeometryInput> = {},
): H03BranchFlowGeometryInput {
  return {
    flow: explicitFlow(),
    hydraulicGeometry: geometry(),
    ...overrides,
  };
}

function expectFailure(
  outcome: H03BranchFlowGeometryOutcome,
  status: H03BranchFlowGeometryFailure["status"],
  code: H03BranchFlowGeometryFailure["failure"]["code"],
): H03BranchFlowGeometryFailure {
  expect(outcome.status).toBe(status);
  if (outcome.status === "success") {
    throw new Error("Expected H-03 to fail closed.");
  }
  expect(outcome.failure.code).toBe(code);
  expect(outcome).not.toHaveProperty("value");
  expect(outcome).not.toHaveProperty("evidence");
  expect(outcome).not.toHaveProperty("substitution");
  expect(outcome).not.toHaveProperty("inputSnapshot");
  expect(outcome).not.toHaveProperty("selectedFlowRoute");
  expect(outcome).not.toHaveProperty("engineeringAssessment");
  return outcome;
}

describe("H-03 frozen mapping and controlled boundaries", () => {
  it("maps exactly to the frozen source, contract, derivation and check", () => {
    expect(H03_METHOD_MAPPING).toMatchObject({
      methodId: "H-03",
      approvalStatus: "approved",
      methodType: "analytical",
      inputParameterIds: ["Vdot_branch", "Ah", "Pwetted", "network split"],
      outputQuantityIds: ["v", "Dh"],
      sourceRefs: ["ID-HYD-01"],
      contractSourceRefs: ["ID-HYD-01", "DER-HYD"],
      derivationRefs: ["ID-HYD-01", "DER-HYD"],
      validationCaseIds: [],
      methodCheckIds: ["COOL-GEO-001"],
    });
    expect(H03_SOURCE_REFS).toEqual(["ID-HYD-01"]);
    expect(H03_METHOD_CHECK_IDS).toEqual(["COOL-GEO-001"]);
    expect(H03_IMPLEMENTATION_READINESS).toEqual({
      isolationStatus: "implemented_not_runtime_activated",
      runtimeActivation: "blocked",
      openMethodGates: [],
      externalAssessmentBoundary:
        "velocity acceptance requires a separately sourced OEM or project specification",
    });
  });

  it("keeps every contract quantity distinct and in canonical SI", () => {
    expect(H03_PARAMETER_MAPPING).toEqual({
      branchVolumeFlow: {
        contractInputId: "Vdot_branch",
        parameterId: "water.volume_flow",
        requiredScope: "one_declared_branch",
        dimensionId: "volume_flow_rate",
        canonicalUnitId: "m3_per_s",
      },
      hydraulicArea: {
        contractInputId: "Ah",
        parameterId: "coolant.flow_area",
        d02OutputQuantityId: "Ahydraulic",
        dimensionId: "area",
        canonicalUnitId: "m2",
      },
      wettedPerimeter: {
        contractInputId: "Pwetted",
        parameterId: "coolant.wetted_perimeter",
        d02OutputQuantityId: "Pwetted",
        dimensionId: "length",
        canonicalUnitId: "m",
      },
      velocity: {
        contractOutputId: "v",
        parameterId: "water.velocity",
        dimensionId: "velocity",
        canonicalUnitId: "m_per_s",
      },
      hydraulicDiameter: {
        contractOutputId: "Dh",
        parameterId: "coolant.hydraulic_diameter",
        dimensionId: "length",
        canonicalUnitId: "m",
      },
    });
  });

  it("binds all three frozen warning predicates", () => {
    expect(H03_WARNING_PREDICATES).toEqual({
      totalFlowToOneBranch: "total flow is passed to one branch",
      massFlowAsVelocity: "mass flow is labelled velocity",
      asymmetricEqualSplit: "asymmetric branches are evenly split",
    });
  });

  it("declares machine representability policy without an engineering threshold", () => {
    expect(H03_BINARY64_MIN_NORMAL).toBe(2 ** -1022);
    expect(H03_NUMERIC_REPRESENTABILITY_POLICY).toMatchObject({
      policy: "machine_numeric_representability_only",
      engineeringThreshold: false,
      positiveSubnormalInputPolicy: "fail_closed",
      positiveSubnormalIntermediatePolicy: "fail_closed",
      overflowPolicy: "fail_closed",
      swallowedSplitFactorPolicy: "fail_closed",
      sourceEquationRearranged: false,
    });
  });
});

describe("H-03 analytical identities", () => {
  it("evaluates explicit branch volume flow with the same D-02 geometry", () => {
    const outcome = evaluateH03BranchFlowGeometry(input());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.v).toEqual({
      outputId: "v",
      parameterId: "water.velocity",
      valueSi: 2,
      dimensionId: "velocity",
      canonicalUnitId: "m_per_s",
      interpretation: "mean_velocity_in_declared_branch",
    });
    expect(outcome.value.Dh.valueSi).toBeCloseTo(0.04, 15);
    expect(outcome.selectedFlowRoute).toBe("explicit_branch_volume_flow");
    expect(outcome.substitution).toMatchObject({
      providedFlowValueM3PerS: 0.002,
      branchCountApplied: null,
      branchVolumeFlowM3PerS: 0.002,
      hydraulicAreaM2: 0.001,
      wettedPerimeterM: 0.1,
      meanVelocityMPerS: 2,
    });
    expect(outcome.inputSnapshot).toEqual({
      branchId: BRANCH_ID,
      coolantNetworkId: NETWORK_ID,
      caseSnapshotId: CASE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      timeBasisId: TIME_BASIS_ID,
      hydraulicGeometryId: HYDRAULIC_GEOMETRY_ID,
      flowSourceSnapshotId: FLOW_SOURCE_SNAPSHOT,
      geometrySourceSnapshotId: D02_SOURCE_SNAPSHOT,
    });
  });

  it("splits total volume flow only when every equal-branch fact is confirmed", () => {
    const outcome = evaluateH03BranchFlowGeometry(
      input({ flow: equalSplitFlow() }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.selectedFlowRoute).toBe("equal_split_total_volume_flow");
    expect(outcome.substitution.branchCountApplied).toBe(3);
    expect(outcome.substitution.branchVolumeFlowM3PerS).toBe(0.002);
    expect(outcome.value.v.valueSi).toBe(2);
    expect(outcome.value.Dh.valueSi).toBeCloseTo(0.04, 15);
  });

  it("has the N=1 equal-split analytical limit", () => {
    const total = 0.0025;
    const outcome = evaluateH03BranchFlowGeometry(
      input({
        flow: equalSplitFlow({
          valueSi: total,
          branchCount: 1,
          targetBranchOrdinal: 1,
        }),
      }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.substitution.branchVolumeFlowM3PerS).toBe(total);
    expect(outcome.value.v.valueSi).toBe(2.5);
  });

  it("preserves a measured physical zero flow without inventing velocity", () => {
    const outcome = evaluateH03BranchFlowGeometry(
      input({ flow: explicitFlow({ valueSi: 0 }) }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.v.valueSi).toBe(0);
    expect(outcome.value.Dh.valueSi).toBeCloseTo(0.04, 15);
  });

  it("does not apply an OEM/project velocity threshold or safety verdict", () => {
    const outcome = evaluateH03BranchFlowGeometry(
      input({ flow: explicitFlow({ valueSi: 1 }) }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.v.valueSi).toBe(1_000);
    expect(outcome.engineeringAssessment).toEqual({
      oemVelocityThresholdApplied: false,
      projectVelocityThresholdApplied: false,
      velocityQualification: "not_evaluated",
      reason:
        "H-03 is a kinematic identity; acceptance requires separately sourced OEM or project limits",
    });
    expect(outcome.engineeringAssessment).not.toHaveProperty("acceptable");
    expect(outcome.engineeringAssessment).not.toHaveProperty("safe");
    expect(outcome.engineeringAssessment).not.toHaveProperty("safetyStatus");
  });

  it("scales v with branch flow while Dh remains geometric", () => {
    const first = evaluateH03BranchFlowGeometry(input());
    const second = evaluateH03BranchFlowGeometry(
      input({ flow: explicitFlow({ valueSi: 0.004 }) }),
    );
    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    if (first.status !== "success" || second.status !== "success") return;
    expect(second.value.v.valueSi / first.value.v.valueSi).toBe(2);
    expect(second.value.Dh.valueSi).toBe(first.value.Dh.valueSi);
  });

  it("passes the dimensional geometry scaling limit", () => {
    const scale = 7;
    const first = evaluateH03BranchFlowGeometry(input());
    const second = evaluateH03BranchFlowGeometry(
      input({
        flow: explicitFlow({ valueSi: 0.002 * scale ** 3 }),
        hydraulicGeometry: geometry({
          Ah: hydraulicArea({ valueSi: 0.001 * scale ** 2 }),
          Pwetted: wettedPerimeter({ valueSi: 0.1 * scale }),
        }),
      }),
    );
    expect(first.status).toBe("success");
    expect(second.status).toBe("success");
    if (first.status !== "success" || second.status !== "success") return;
    expect(second.value.v.valueSi / first.value.v.valueSi).toBeCloseTo(scale, 14);
    expect(second.value.Dh.valueSi / first.value.Dh.valueSi).toBeCloseTo(
      scale,
      14,
    );
  });

  it("recovers the diameter of a synthetic circular passage", () => {
    const diameter = 0.012;
    const area = (Math.PI * diameter ** 2) / 4;
    const perimeter = Math.PI * diameter;
    const outcome = evaluateH03BranchFlowGeometry(
      input({
        hydraulicGeometry: geometry({
          Ah: hydraulicArea({ valueSi: area }),
          Pwetted: wettedPerimeter({ valueSi: perimeter }),
        }),
      }),
    );
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    expect(outcome.value.Dh.valueSi).toBeCloseTo(diameter, 15);
  });

  it("returns a deeply frozen engineering trace", () => {
    const outcome = evaluateH03BranchFlowGeometry(input());
    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") return;
    for (const value of [
      outcome,
      outcome.value,
      outcome.value.v,
      outcome.value.Dh,
      outcome.substitution,
      outcome.inputSnapshot,
      outcome.evidence,
      outcome.evidence.flow,
      outcome.evidence.hydraulicGeometry,
      outcome.evidence.hydraulicGeometry.Ah,
      outcome.evidence.hydraulicGeometry.Pwetted,
      outcome.engineeringAssessment,
      outcome.equations,
      outcome.assumptions,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });
});

describe("H-03 flow-route failure closure", () => {
  it("rejects mass flow rather than treating kg/s as velocity", () => {
    const outcome = evaluateH03BranchFlowGeometry(
      input({
        flow: explicitFlow({
          quantityKind: "mass_flow_rate",
          dimensionId: "mass_flow_rate",
          canonicalUnitId: "kg_per_s",
        }),
      }),
    );
    const result = expectFailure(
      outcome,
      "not_applicable",
      "H-03.mass_flow_not_applicable",
    );
    expect(result.warnings).toEqual([
      expect.objectContaining({
        predicate: "mass flow is labelled velocity",
      }),
    ]);
  });

  it("rejects velocity supplied as the flow input", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({
            quantityKind: "velocity",
            dimensionId: "velocity",
            canonicalUnitId: "m_per_s",
          }),
        }),
      ),
      "not_applicable",
      "H-03.velocity_input_not_applicable",
    );
  });

  it("rejects routing total network flow directly to one branch", () => {
    const result = expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: explicitFlow({ flowScope: "total_network_flow" }) }),
      ),
      "not_applicable",
      "H-03.total_flow_to_one_branch_not_applicable",
    );
    expect(result.warnings[0]?.predicate).toBe(
      "total flow is passed to one branch",
    );
  });

  it.each([
    ["network topology", { networkTopology: "not_parallel_or_asymmetric_network" }],
    ["hydraulic geometry", { equalHydraulicGeometryConfirmed: false }],
    ["resistance", { equalResistanceConfirmed: false }],
    ["hydraulic balance", { hydraulicallyBalancedConfirmed: false }],
  ] as const)("rejects known asymmetric %s", (_label, overrides) => {
    const result = expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: equalSplitFlow(overrides) }),
      ),
      "not_applicable",
      "H-03.branch_split_not_applicable",
    );
    expect(result.warnings[0]?.predicate).toBe(
      "asymmetric branches are evenly split",
    );
  });

  it.each([
    ["topology", { networkTopology: "unknown_or_unconfirmed" }],
    ["geometry", { equalHydraulicGeometryConfirmed: null }],
    ["resistance", { equalResistanceConfirmed: null }],
    ["balance", { hydraulicallyBalancedConfirmed: null }],
  ] as const)("fails closed for unknown split %s", (_label, overrides) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: equalSplitFlow(overrides) }),
      ),
      "insufficient_data",
      "H-03.branch_split_unknown",
    );
  });

  it.each([
    [0, 1],
    [-1, 1],
    [1.5, 1],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
    [2, 0],
    [2, 3],
    [2, 1.5],
  ])("rejects invalid branchCount=%s target=%s", (branchCount, target) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: equalSplitFlow({
            branchCount,
            targetBranchOrdinal: target,
          }),
        }),
      ),
      "invalid_input",
      "H-03.branch_split_binding_invalid",
    );
  });

  it("rejects branch-scoped flow on the total-flow split route", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: equalSplitFlow({ flowScope: "one_declared_branch" }),
        }),
      ),
      "invalid_input",
      "H-03.branch_split_binding_invalid",
    );
  });

  it("rejects inconsistent quantity/dimension/unit tuples before semantics", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({
            quantityKind: "volume_flow_rate",
            dimensionId: "mass_flow_rate",
            canonicalUnitId: "kg_per_s",
          }),
        }),
      ),
      "invalid_input",
      "H-03.flow_binding_invalid",
    );
  });

  it("rejects an unresolved flow hidden behind numeric zero", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({
            valueSi: 0,
            valueResolution: "unknown_substituted_zero",
          }),
        }),
      ),
      "invalid_input",
      "H-03.unknown_flow_substituted_zero",
    );
  });

  it("returns insufficient_data for a wholly unknown quantity tuple", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({
            quantityKind: "unknown_or_unconfirmed",
            dimensionId: "unknown_or_unconfirmed",
            canonicalUnitId: "unknown_or_unconfirmed",
          }),
        }),
      ),
      "insufficient_data",
      "H-03.flow_quantity_unknown",
    );
  });

  it("returns insufficient_data for unknown scope or provenance", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({ flowScope: "unknown_or_unconfirmed" }),
        }),
      ),
      "insufficient_data",
      "H-03.flow_quantity_unknown",
    );
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({
            sourceMethod: "unknown_or_unconfirmed",
            dataQuality: "unknown",
          }),
        }),
      ),
      "insufficient_data",
      "H-03.flow_provenance_invalid",
    );
  });

  it.each(["insufficient_data", "not_applicable"] as const)(
    "propagates an explicit unavailable flow status %s without a numeric payload",
    (status) => {
      expectFailure(
        evaluateH03BranchFlowGeometry(
          input({ flow: unavailableFlow({ status }) }),
        ),
        status,
        "H-03.flow_unavailable",
      );
    },
  );

  it("known asymmetry outranks unknown flow provenance", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: equalSplitFlow({
            sourceMethod: "unknown_or_unconfirmed",
            dataQuality: "unknown",
            equalResistanceConfirmed: false,
          }),
        }),
      ),
      "not_applicable",
      "H-03.branch_split_not_applicable",
    );
  });
});

describe("H-03 D-02 geometry identity and boundary closure", () => {
  it("rejects an explicit denial of the same D-02 geometry", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            sameD02HydraulicGeometryConfirmed: false,
          }),
        }),
      ),
      "invalid_input",
      "H-03.hydraulic_geometry_pair_mismatch",
    );
  });

  it("fails closed when same-D-02 identity is unresolved", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            sameD02HydraulicGeometryConfirmed: null,
          }),
        }),
      ),
      "insufficient_data",
      "H-03.hydraulic_geometry_pair_unknown",
    );
  });

  it.each([
    ["branch", { branchId: "coolant-branch:02" }],
    ["network", { coolantNetworkId: "coolant-network:02" }],
    ["geometry identity", { hydraulicGeometryId: "hydraulic-geometry:02" }],
    ["case", { caseSnapshotId: OTHER_CASE_SNAPSHOT }],
    ["geometry snapshot", { geometrySnapshotId: OTHER_GEOMETRY_SNAPSHOT }],
    ["D-02 source snapshot", { sourceSnapshotId: OTHER_D02_SOURCE_SNAPSHOT }],
  ] as const)("rejects mixed Ah/Pwetted %s", (_label, perimeterOverrides) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            Pwetted: wettedPerimeter(perimeterOverrides),
          }),
        }),
      ),
      "invalid_input",
      "H-03.hydraulic_geometry_pair_mismatch",
    );
  });

  it.each([
    ["branch", { branchId: "coolant-branch:02" }],
    ["network", { coolantNetworkId: "coolant-network:02" }],
    ["case", { caseSnapshotId: OTHER_CASE_SNAPSHOT }],
  ] as const)("rejects flow/geometry %s mismatch", (_label, flowOverrides) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: explicitFlow(flowOverrides) }),
      ),
      "invalid_input",
      "H-03.branch_boundary_mismatch",
    );
  });

  it.each(["Ah", "Pwetted"] as const)(
    "fails closed when D-02 %s is unavailable",
    (quantity) => {
      const unavailable = unavailableGeometryQuantity(quantity);
      expectFailure(
        evaluateH03BranchFlowGeometry(
          input({
            hydraulicGeometry: geometry(
              quantity === "Ah"
                ? { Ah: unavailable }
                : { Pwetted: unavailable },
            ),
          }),
        ),
        "insufficient_data",
        "H-03.hydraulic_geometry_unavailable",
      );
    },
  );

  it("propagates source-confirmed not-applicable D-02 geometry", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            Ah: unavailableGeometryQuantity("Ah", {
              status: "not_applicable",
            }),
          }),
        }),
      ),
      "not_applicable",
      "H-03.hydraulic_geometry_unavailable",
    );
  });

  it.each(["Ah", "Pwetted"] as const)(
    "requires non-unknown D-02 data quality for %s",
    (quantity) => {
      expectFailure(
        evaluateH03BranchFlowGeometry(
          input({
            hydraulicGeometry: geometry(
              quantity === "Ah"
                ? { Ah: hydraulicArea({ dataQuality: "unknown" }) }
                : { Pwetted: wettedPerimeter({ dataQuality: "unknown" }) },
            ),
          }),
        ),
        "insufficient_data",
        "H-03.hydraulic_geometry_provenance_invalid",
      );
    },
  );

  it("rejects metal area as an Ah alias", () => {
    const malformed = {
      ...hydraulicArea(),
      parameterId: "coil.metal_area",
      interpretation: "copper_metal_cross_section",
    };
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            Ah: malformed as unknown as H03HydraulicAreaEvidence,
          }),
        }),
      ),
      "invalid_input",
      "H-03.hydraulic_geometry_binding_invalid",
    );
  });

  it.each([
    ["area contract", { contractInputId: "Pwetted" }],
    ["area source", { sourceQuantityId: "Pwetted" }],
    ["area unit", { canonicalUnitId: "m" }],
    ["area dimension", { dimensionId: "length" }],
    ["area source method", { sourceMethodId: "H-03" }],
  ])("rejects malformed %s binding", (_label, overrides) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry({
            Ah: {
              ...hydraulicArea(),
              ...overrides,
            } as unknown as H03HydraulicAreaEvidence,
          }),
        }),
      ),
      "invalid_input",
      "H-03.hydraulic_geometry_binding_invalid",
    );
  });
});

describe("H-03 numeric representability", () => {
  it.each([
    [Number.NaN, "H-03.flow_value_invalid"],
    [Number.POSITIVE_INFINITY, "H-03.flow_value_invalid"],
    [Number.NEGATIVE_INFINITY, "H-03.flow_value_invalid"],
    [-1, "H-03.flow_value_invalid"],
    [-0, "H-03.flow_value_invalid"],
    [Number.MIN_VALUE, "H-03.flow_numeric_resolution_invalid"],
  ] as const)("rejects hostile flow value %s", (value, code) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: explicitFlow({ valueSi: value }) }),
      ),
      "invalid_input",
      code,
    );
  });

  it.each([
    ["Ah", 0],
    ["Ah", -1],
    ["Ah", Number.NaN],
    ["Ah", Number.POSITIVE_INFINITY],
    ["Ah", Number.MIN_VALUE],
    ["Pwetted", 0],
    ["Pwetted", -1],
    ["Pwetted", Number.NaN],
    ["Pwetted", Number.POSITIVE_INFINITY],
    ["Pwetted", Number.MIN_VALUE],
  ] as const)("rejects hostile %s value %s", (quantity, value) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          hydraulicGeometry: geometry(
            quantity === "Ah"
              ? { Ah: hydraulicArea({ valueSi: value }) }
              : { Pwetted: wettedPerimeter({ valueSi: value }) },
          ),
        }),
      ),
      "invalid_input",
      "H-03.geometry_value_invalid",
    );
  });

  it("fails closed when equal split creates a positive subnormal", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: equalSplitFlow({
            valueSi: H03_BINARY64_MIN_NORMAL,
            branchCount: 2,
          }),
        }),
      ),
      "invalid_input",
      "H-03.numeric_underflow",
    );
  });

  it("fails closed on velocity overflow", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({ valueSi: Number.MAX_VALUE }),
          hydraulicGeometry: geometry({ Ah: hydraulicArea({ valueSi: 0.5 }) }),
        }),
      ),
      "invalid_input",
      "H-03.numeric_overflow",
    );
  });

  it("fails closed on velocity underflow", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({ valueSi: H03_BINARY64_MIN_NORMAL }),
          hydraulicGeometry: geometry({
            Ah: hydraulicArea({ valueSi: Number.MAX_VALUE }),
            Pwetted: wettedPerimeter({ valueSi: Number.MAX_VALUE }),
          }),
        }),
      ),
      "invalid_input",
      "H-03.numeric_underflow",
    );
  });

  it("fails closed when 4*Ah overflows", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({ valueSi: 0 }),
          hydraulicGeometry: geometry({
            Ah: hydraulicArea({ valueSi: Number.MAX_VALUE }),
            Pwetted: wettedPerimeter({ valueSi: Number.MAX_VALUE }),
          }),
        }),
      ),
      "invalid_input",
      "H-03.numeric_overflow",
    );
  });

  it("fails closed when Dh underflows", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: explicitFlow({ valueSi: 0 }),
          hydraulicGeometry: geometry({
            Ah: hydraulicArea({ valueSi: H03_BINARY64_MIN_NORMAL }),
            Pwetted: wettedPerimeter({ valueSi: Number.MAX_VALUE }),
          }),
        }),
      ),
      "invalid_input",
      "H-03.numeric_underflow",
    );
  });
});

describe("H-03 hostile input and status priority", () => {
  it.each([
    null,
    undefined,
    0,
    "input",
    [],
    {},
    { flow: explicitFlow() },
    { hydraulicGeometry: geometry() },
    { ...input(), extra: true },
  ])("rejects malformed top-level input %#", (value) => {
    expectFailure(
      evaluateH03BranchFlowGeometry(value),
      "invalid_input",
      "H-03.input_schema_invalid",
    );
  });

  it("rejects a symbol key and a non-plain prototype", () => {
    const withSymbol = input() as H03BranchFlowGeometryInput & {
      [key: symbol]: boolean;
    };
    Object.defineProperty(withSymbol, Symbol("hidden"), {
      value: true,
      enumerable: true,
    });
    expectFailure(
      evaluateH03BranchFlowGeometry(withSymbol),
      "invalid_input",
      "H-03.input_schema_invalid",
    );

    const inherited = Object.create({ hidden: true }) as Record<string, unknown>;
    Object.assign(inherited, input());
    expectFailure(
      evaluateH03BranchFlowGeometry(inherited),
      "invalid_input",
      "H-03.input_schema_invalid",
    );
  });

  it("does not execute top-level or nested accessors", () => {
    let reads = 0;
    const top = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(top, {
      flow: {
        enumerable: true,
        get() {
          reads += 1;
          return explicitFlow();
        },
      },
      hydraulicGeometry: {
        enumerable: true,
        value: geometry(),
      },
    });
    expectFailure(
      evaluateH03BranchFlowGeometry(top),
      "invalid_input",
      "H-03.input_schema_invalid",
    );
    expect(reads).toBe(0);

    const nested = { ...explicitFlow() } as Record<string, unknown>;
    Object.defineProperty(nested, "valueSi", {
      enumerable: true,
      get() {
        reads += 1;
        return 0.002;
      },
    });
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({ flow: nested as unknown as H03ExplicitBranchVolumeFlow }),
      ),
      "invalid_input",
      "H-03.flow_schema_invalid",
    );
    expect(reads).toBe(0);
  });

  it("catches hostile proxy reflection without throwing", () => {
    const hostile = new Proxy(input(), {
      getPrototypeOf() {
        throw new Error("hostile reflection");
      },
    });
    expect(() => evaluateH03BranchFlowGeometry(hostile)).not.toThrow();
    expectFailure(
      evaluateH03BranchFlowGeometry(hostile),
      "invalid_input",
      "H-03.input_schema_invalid",
    );
  });

  it("rejects coercible numeric strings", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: {
            ...explicitFlow(),
            valueSi: "0.002",
          } as unknown as H03ExplicitBranchVolumeFlow,
        }),
      ),
      "invalid_input",
      "H-03.flow_schema_invalid",
    );
  });

  it("lets malformed geometry outrank missing flow", () => {
    const malformed = {
      flow: null,
      hydraulicGeometry: {
        ...geometry(),
        sameD02HydraulicGeometryConfirmed: "yes",
      },
    };
    expectFailure(
      evaluateH03BranchFlowGeometry(malformed),
      "invalid_input",
      "H-03.hydraulic_geometry_schema_invalid",
    );
  });

  it("lets a malformed later enum outrank an unavailable nested quantity", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry({
        flow: explicitFlow(),
        hydraulicGeometry: {
          Ah: null,
          Pwetted: wettedPerimeter(),
          sameD02HydraulicGeometryConfirmed: "bogus",
        },
      }),
      "invalid_input",
      "H-03.hydraulic_geometry_schema_invalid",
    );
  });

  it("lets known same-geometry contradiction outrank unknown flow evidence", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: unavailableFlow(),
          hydraulicGeometry: geometry({
            sameD02HydraulicGeometryConfirmed: false,
          }),
        }),
      ),
      "invalid_input",
      "H-03.hydraulic_geometry_pair_mismatch",
    );
  });

  it("fails invalid on unknown enum values and never silently defaults", () => {
    expectFailure(
      evaluateH03BranchFlowGeometry(
        input({
          flow: {
            ...equalSplitFlow(),
            networkTopology: "parallel-ish",
          } as unknown as H03EqualSplitTotalVolumeFlow,
        }),
      ),
      "invalid_input",
      "H-03.flow_schema_invalid",
    );
  });
});
