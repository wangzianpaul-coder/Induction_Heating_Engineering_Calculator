import { describe, expect, it } from "vitest";

import {
  MVP_THERMAL_METHOD_ALLOWLIST,
  calculateMvpH01CoolingHeatLoad,
  calculateMvpH03BranchFlowGeometry,
  calculateMvpThermal,
  type MvpH01CoolingHeatLoadInput,
  type MvpH01HeatTermInput,
  type MvpH03BranchFlowGeometryInput,
} from "../../src/application/mvpThermalCalculations.js";

const CASE_SNAPSHOT = `case:${"1".repeat(64)}`;
const FLOW_SOURCE_SNAPSHOT = `case:${"2".repeat(64)}`;
const HEAT_SOURCE_SNAPSHOT = `case:${"3".repeat(64)}`;
const GEOMETRY_SNAPSHOT = `geometry:${"4".repeat(64)}`;
const D02_SOURCE_SNAPSHOT = `geometry:${"5".repeat(64)}`;

function knownHeatTerm(
  id: string,
  valueW: number,
): MvpH01HeatTermInput {
  return {
    disposition: "known_applicable",
    valueW,
    sourceMethod: "analytical_estimate",
    sourceRef: `case-source:${id}`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${id}`,
    sourceSnapshotId: HEAT_SOURCE_SNAPSHOT,
    heatPathId: `heat-path:${id}`,
    physicalHeatSourceId: `physical-source:${id}`,
  };
}

function excludedHeatTerm(id: string): MvpH01HeatTermInput {
  return {
    disposition: "source_confirmed_not_applicable",
    reason: "Source review confirms that the path does not enter this circuit.",
    resolutionSourceRef: `case-resolution:${id}`,
    sourceMethod: "analytical_estimate",
    sourceRef: `case-source:${id}`,
    dataQuality: "project_specific",
    provenanceId: `provenance:${id}`,
    sourceSnapshotId: HEAT_SOURCE_SNAPSHOT,
    heatPathId: `heat-path:${id}`,
    physicalHeatSourceId: `physical-source:${id}`,
  };
}

function h01Input(): MvpH01CoolingHeatLoadInput {
  return {
    methodId: "H-01",
    controlVolume: {
      controlVolumeId: "coolant-control-volume:coil-loop-01",
      coolantCircuitId: "coolant-circuit:coil-loop-01",
      caseSnapshotId: CASE_SNAPSHOT,
      timeBasisId: "time-basis:steady-design-point-01",
      singleDeclaredCircuitConfirmed: true,
      boundaryCompleteConfirmed: true,
      forbiddenHeatClassesExcludedConfirmed: true,
      multiCircuitAggregationAbsentConfirmed: true,
    },
    copperLoss: knownHeatTerm("copper", 100),
    externalHeatPickupToCoil: knownHeatTerm("pickup", 20),
    magneticMaterialLoss: excludedHeatTerm("magnetic"),
    otherCooledLoads: [knownHeatTerm("auxiliary", 10)],
    otherLoadsEnumerationComplete: true,
    otherLoadsEnumerationSourceRef: "case-source:other-load-enumeration",
    pairwiseDisjointPathsConfirmed: true,
    physicalSourceIdentityChecked: true,
    overlapAssessmentSourceRef: "case-source:heat-path-overlap-review",
    designMarginStatus: "not_requested",
  };
}

function h03Input(): MvpH03BranchFlowGeometryInput {
  return {
    methodId: "H-03",
    binding: {
      caseSnapshotId: CASE_SNAPSHOT,
      coolantNetworkId: "coolant-network:01",
      branchId: "coolant-branch:01",
      timeBasisId: "time-basis:steady-design-point-01",
    },
    explicitBranchFlow: {
      volumeFlowM3PerS: 0.002,
      oneDeclaredBranchConfirmed: true,
      sourceMethod: "measurement",
      sourceRef: "measurement:branch-flow:01",
      dataQuality: "measured",
      provenanceId: "provenance:branch-flow:01",
      sourceSnapshotId: FLOW_SOURCE_SNAPSHOT,
    },
    d02Geometry: {
      flowAreaM2: 0.001,
      wettedPerimeterM: 0.1,
      sourceMethodId: "D-02",
      verifiedD02Snapshot: true,
      sameD02HydraulicGeometryConfirmed: true,
      sourceRef: "method:D-02:hydraulic-geometry",
      dataQuality: "project_specific",
      provenanceId: "provenance:D-02:hydraulic-geometry:01",
      sourceSnapshotId: D02_SOURCE_SNAPSHOT,
      geometrySnapshotId: GEOMETRY_SNAPSHOT,
      hydraulicGeometryId: "hydraulic-geometry:01",
    },
  };
}

describe("Phase-5B narrow thermal calculation adapters", () => {
  it("allowlists exactly H-01 and H-03 without changing registry flags", async () => {
    expect(MVP_THERMAL_METHOD_ALLOWLIST).toEqual(["H-01", "H-03"]);
    expect(Object.isFrozen(MVP_THERMAL_METHOD_ALLOWLIST)).toBe(true);
    const applicationPublicApi = await import("../../src/application/public-api.js");
    expect(applicationPublicApi).not.toHaveProperty("calculateMvpThermal");
    expect(applicationPublicApi).not.toHaveProperty(
      "calculateMvpH03BranchFlowGeometry",
    );
  });

  it("calculates H-03 only from one explicit branch and one verified D-02 geometry", () => {
    const result = calculateMvpH03BranchFlowGeometry(h03Input());
    expect(result).toMatchObject({
      methodId: "H-03",
      methodApproval: "approved",
      status: "success",
      failure: null,
      applicability: {
        status: "in_domain",
      },
    });
    expect(result.outputs).toEqual([
      {
        outputId: "v",
        parameterId: "water.velocity",
        valueSi: 2,
        dimensionId: "velocity",
        canonicalUnitId: "m_per_s",
        interpretation: "mean_velocity_in_declared_branch",
      },
      {
        outputId: "Dh",
        parameterId: "coolant.hydraulic_diameter",
        valueSi: 0.04,
        dimensionId: "length",
        canonicalUnitId: "m",
        interpretation:
          "hydraulic_diameter_from_same_D02_area_and_wetted_perimeter",
      },
    ]);
    expect(result.sources.methodCheckIds).toEqual(["COOL-GEO-001"]);
    expect(result.applicability.checks).toContain(
      "no OEM or project velocity acceptance threshold is inferred",
    );
    expect(result).not.toHaveProperty("velocityQualification");
    expect(result).not.toHaveProperty("safetyVerdict");
    expect(Object.isFrozen(result.outputs)).toBe(true);
    expect(Object.isFrozen(result.applicability.limitations)).toBe(true);
  });

  it("blocks H-03 when the one-branch or verified-D-02 evidence is absent", () => {
    const notBranch = structuredClone(h03Input()) as Record<string, any>;
    notBranch.explicitBranchFlow.oneDeclaredBranchConfirmed = false;
    expect(calculateMvpH03BranchFlowGeometry(notBranch)).toMatchObject({
      status: "not_applicable",
      outputs: [],
      failure: { code: "MVP-H-03.explicit_branch_route_not_confirmed" },
    });

    const unverified = structuredClone(h03Input()) as Record<string, any>;
    unverified.d02Geometry.verifiedD02Snapshot = false;
    expect(calculateMvpH03BranchFlowGeometry(unverified)).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "MVP-H-03.verified_D02_geometry_required" },
    });
  });

  it("preserves an H-03 evaluator failure without publishing partial outputs", () => {
    const invalid = structuredClone(h03Input()) as Record<string, any>;
    invalid.d02Geometry.flowAreaM2 = 0;
    const result = calculateMvpH03BranchFlowGeometry(invalid);
    expect(result).toMatchObject({
      methodId: "H-03",
      status: "invalid_input",
      outputs: [],
      failure: { code: "H-03.geometry_value_invalid" },
    });
    expect(result.assumptions).toEqual([]);
  });

  it("calculates H-01 only for a complete no-margin single-circuit control volume", () => {
    const result = calculateMvpH01CoolingHeatLoad(h01Input());
    expect(result).toMatchObject({
      methodId: "H-01",
      methodApproval: "approved",
      status: "success",
      failure: null,
      applicability: { status: "in_domain" },
    });
    expect(result.outputs).toEqual([
      {
        outputId: "Qcool",
        parameterId: null,
        valueSi: 130,
        dimensionId: "power",
        canonicalUnitId: "W",
        interpretation:
          "heat_entering_one_declared_coil_coolant_circuit",
      },
    ]);
    expect(result.sources.methodCheckIds).toEqual(["COOL-CONTROL-001"]);
    expect(result.assumptions).toContain(
      "unknown applicable terms are never replaced by zero",
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sources.sourceRefs)).toBe(true);
  });

  it("blocks H-01 design-margin and incomplete overlap routes", () => {
    const requestedMargin = structuredClone(h01Input()) as Record<string, any>;
    requestedMargin.designMarginStatus = "requested";
    expect(calculateMvpH01CoolingHeatLoad(requestedMargin)).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "H-01.design_margin_route_unresolved" },
    });

    const unconfirmedOverlap = structuredClone(h01Input()) as Record<
      string,
      any
    >;
    unconfirmedOverlap.pairwiseDisjointPathsConfirmed = false;
    expect(calculateMvpH01CoolingHeatLoad(unconfirmedOverlap)).toMatchObject({
      status: "insufficient_data",
      outputs: [],
      failure: { code: "MVP-H-01.control_volume_evidence_incomplete" },
    });
  });

  it("preserves H-01 evaluator validation and never converts bad heat into a result", () => {
    const invalid = structuredClone(h01Input()) as Record<string, any>;
    invalid.copperLoss.valueW = -1;
    expect(calculateMvpH01CoolingHeatLoad(invalid)).toMatchObject({
      methodId: "H-01",
      status: "invalid_input",
      outputs: [],
      failure: { code: "H-01.heat_term_value_invalid" },
    });
  });

  it("dispatches only allowlisted methods and fails hostile inputs closed", () => {
    expect(calculateMvpThermal(h03Input()).status).toBe("success");
    expect(calculateMvpThermal({ methodId: "J-03" })).toMatchObject({
      methodId: null,
      status: "not_applicable",
      outputs: [],
      failure: { code: "MVP.method_not_allowlisted" },
    });

    const hostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(hostile, "methodId", {
      enumerable: true,
      get() {
        throw new Error("must not execute");
      },
    });
    expect(() => calculateMvpThermal(hostile)).not.toThrow();
    expect(calculateMvpThermal(hostile)).toMatchObject({
      status: "invalid_input",
      outputs: [],
      failure: { code: "MVP.input_schema_invalid" },
    });
  });
});
