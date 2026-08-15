import { describe, expect, it } from "vitest";

import {
  MVP_RUNNABLE_METHOD_DEFINITIONS,
  calculateMvpWorkspace,
  loadMvpWorkspace,
  saveMvpWorkspace,
  type MvpWorkspaceInput,
} from "../../src/application/mvpWorkspace.js";
import { fingerprint } from "../../src/serialization/canonical-json.js";

const AT = "2026-08-15T01:00:00.000Z";
const SOURCE_CASE_A = `case:${"a".repeat(64)}`;
const SOURCE_CASE_B = `case:${"b".repeat(64)}`;
const SOURCE_CASE_C = `case:${"c".repeat(64)}`;
const SOURCE_CASE_D = `case:${"d".repeat(64)}`;
const SOURCE_GEOMETRY = `geometry:${"e".repeat(64)}`;

type MutableRecord = Record<string, unknown>;

function recomputeSnapshotIdentity(snapshot: MutableRecord): void {
  const recalculated = fingerprint({
    kind: snapshot.kind,
    schemaVersion: snapshot.schemaVersion,
    technicalFreezeId: snapshot.technicalFreezeId,
    payload: snapshot.payload,
  });
  snapshot.fingerprint = recalculated;
  snapshot.snapshotId = `${String(snapshot.kind)}:${recalculated.value}`;
}

function recomputeCaseFingerprints(caseFile: MutableRecord): void {
  const caseSnapshot = caseFile.caseSnapshot as MutableRecord;
  recomputeSnapshotIdentity(caseSnapshot);
  caseFile.contentFingerprint = fingerprint({
    kind: caseFile.kind,
    schemaVersion: caseFile.schemaVersion,
    technicalFreezeId: caseFile.technicalFreezeId,
    caseSnapshot,
  });
}

function input(): MvpWorkspaceInput {
  return {
    caseId: "mvp-demo-001",
    caseName: "Runnable MVP verification",
    selectedMethodIds: ["B-02", "D-01", "D-03", "D-07", "H-01", "H-03"],
    methodInputs: [
      {
        methodId: "B-02",
        payload: {
          electricalTurnCount: 8,
          conductorAxialSizeM: 0.01,
          windingEnvelopeLengthM: 0.1,
          windingClass: "uniform_single_layer",
          envelopeDefinition: "ADR-0003_full_axial_envelope",
          identicalTurnSections: true,
          nonOverlappingAxialProjection: true,
        },
      },
      {
        methodId: "D-01",
        payload: {
          meanMechanicalPathDiameterM: 0.2,
          helixRevolutionCount: 5,
          helixAxialAdvanceM: 0.5,
          leadSegmentLengthsM: [0.2, 0.2],
          busSegmentLengthsM: [],
          pathGeometry: "uniform_cylindrical_helix",
          meanDiameterBasis: "mechanical_or_cad_conductor_center_path",
          revolutionCountBasis: "actual_mechanical_or_cad_path",
          axialAdvanceBasis: "actual_path_endpoint_advance",
          turnCenterSpanConsistency: "consistent",
        },
      },
      {
        methodId: "D-03",
        payload: {
          conductorLengthM: 3,
          metalAreaM2: 0.0001,
          resistivityOhmM: 1.7e-8,
          materialId: "project.copper.coil",
          temperatureK: 330,
          resistivitySourceRef: "project.material.rho.state-1",
          resistivityStateMatch: "same_material_temperature_as_conductor",
          materialDistribution: "uniform",
          metalAreaDistribution: "uniform",
          temperatureDistribution: "uniform",
          resistanceBoundary: "conductor_body_only_excludes_series_extras",
          seriesExtrasMode: "confirmed_none",
        },
      },
      {
        methodId: "D-07",
        payload: {
          resistanceOhm: 0.08,
          inductanceH: 0.00005,
          currentA: 120,
          frequencyHz: 20_000,
          portId: "coil.series.port",
          referencePlaneId: "coil.terminals",
          loadedState: "workpiece_cold",
          seriesEquivalentId: "coil.series-equivalent.state-1",
          quantityBasis: "rms",
          confirmCoilSeriesPort: true,
          confirmLinearSinusoidal: true,
        },
      },
      {
        methodId: "H-01",
        payload: {
          controlVolumeId: "coil.coolant.cv.1",
          coolantCircuitId: "coil.coolant.circuit.1",
          timeBasisId: "steady-state.1",
          copperDisposition: "known_applicable",
          copperValueW: 120,
          copperSourceMethod: "analytical_estimate",
          copperSourceRef: "case.loss.copper",
          copperDataQuality: "user_defined",
          copperSourceSnapshotId: SOURCE_CASE_A,
          copperProvenanceId: "copper.provenance.state-1",
          copperHeatPathId: "copper.heat-path.1",
          copperPhysicalHeatSourceId: "copper.physical-source.1",
          copperReason: "",
          pickupDisposition: "source_confirmed_not_applicable",
          pickupValueW: 0,
          pickupSourceMethod: "analytical_estimate",
          pickupSourceRef: "case.loss.pickup-exclusion",
          pickupDataQuality: "user_defined",
          pickupSourceSnapshotId: SOURCE_CASE_B,
          pickupProvenanceId: "pickup.provenance.state-1",
          pickupHeatPathId: "pickup.heat-path.1",
          pickupPhysicalHeatSourceId: "pickup.physical-source.1",
          pickupReason: "No external pickup enters this circuit boundary.",
          magneticDisposition: "known_applicable",
          magneticValueW: 30,
          magneticSourceMethod: "analytical_estimate",
          magneticSourceRef: "case.loss.magnetic",
          magneticDataQuality: "user_defined",
          magneticSourceSnapshotId: SOURCE_CASE_C,
          magneticProvenanceId: "magnetic.provenance.state-1",
          magneticHeatPathId: "magnetic.heat-path.1",
          magneticPhysicalHeatSourceId: "magnetic.physical-source.1",
          magneticReason: "",
          otherDisposition: "source_confirmed_not_applicable",
          otherValueW: 0,
          otherSourceMethod: "analytical_estimate",
          otherSourceRef: "case.loss.other-exclusion",
          otherDataQuality: "user_defined",
          otherSourceSnapshotId: SOURCE_CASE_D,
          otherProvenanceId: "other.provenance.state-1",
          otherHeatPathId: "other.heat-path.1",
          otherPhysicalHeatSourceId: "other.physical-source.1",
          otherReason: "No other cooled load is present.",
          otherLoadPresent: false,
          singleDeclaredCircuitConfirmed: true,
          boundaryCompleteConfirmed: true,
          forbiddenHeatClassesExcludedConfirmed: true,
          multiCircuitAggregationAbsentConfirmed: true,
          otherLoadsEnumerationComplete: true,
          otherLoadsEnumerationSourceRef: "cooling.other-load-enumeration.state-1",
          pairwiseDisjointPathsConfirmed: true,
          physicalSourceIdentityChecked: true,
          overlapAssessmentSourceRef: "cooling.overlap-assessment.state-1",
          designMarginNotRequested: true,
        },
      },
      {
        methodId: "H-03",
        payload: {
          volumeFlowM3PerS: 0.0001,
          flowAreaM2: 0.0001,
          wettedPerimeterM: 0.04,
          branchId: "cooling.branch.1",
          coolantNetworkId: "cooling.network.1",
          timeBasisId: "steady-state.1",
          flowSourceMethod: "case_input",
          flowSourceRef: "case.flow.branch.1",
          flowDataQuality: "user_defined",
          flowSourceSnapshotId: "",
          flowProvenanceId: "flow.provenance.state-1",
          d02SourceRef: "case.geometry.d02.branch.1",
          d02DataQuality: "user_defined",
          d02ProvenanceId: "d02.provenance.state-1",
          d02SourceSnapshotId: SOURCE_GEOMETRY,
          d02GeometrySnapshotId: SOURCE_GEOMETRY,
          hydraulicGeometryId: "hydraulic-geometry.1",
          oneDeclaredBranchConfirmed: true,
          verifiedD02Snapshot: true,
          sameD02HydraulicGeometryConfirmed: true,
        },
      },
    ],
  };
}

describe("Runnable MVP workspace", () => {
  it("publishes only the six controlled adapter definitions", () => {
    expect(MVP_RUNNABLE_METHOD_DEFINITIONS.map((item) => item.methodId)).toEqual([
      "B-02", "D-01", "D-03", "D-07", "H-01", "H-03",
    ]);
    expect(MVP_RUNNABLE_METHOD_DEFINITIONS.every((item) =>
      item.formalRuntimeActivationClaim === false && item.fields.length > 0
    )).toBe(true);
  });

  it("saves and reopens one authoritative canonical CaseFile", () => {
    const saved = saveMvpWorkspace(input(), AT);
    expect(saved.status).toBe("success");
    if (saved.status !== "success") return;
    expect(saved.snapshotId).toMatch(/^case:[0-9a-f]{64}$/u);
    expect(saved.canonicalJson).toContain("ih_ec_runnable_mvp_case_provenance");
    const serialized = JSON.parse(saved.canonicalJson) as {
      caseSnapshot: { payload: { provenance: Array<{
        methodInputs: Array<{ methodId: string; payload: Record<string, unknown> }>;
      }> } };
    };
    expect(
      serialized.caseSnapshot.payload.provenance[0]?.methodInputs.find(
        (entry) => entry.methodId === "D-07",
      )?.payload.quantityBasis,
    ).toBe("rms");

    const loaded = loadMvpWorkspace(saved.canonicalJson);
    expect(loaded.status).toBe("success");
    if (loaded.status === "success") {
      expect(loaded.workspace).toEqual(input());
      expect(loaded.snapshotId).toBe(saved.snapshotId);
    }
  });

  it("calculates all six allowlisted methods through their reviewed evaluators", () => {
    const calculated = calculateMvpWorkspace(input(), AT);
    expect(calculated.status).toBe("success");
    if (calculated.status !== "success") return;
    expect(calculated.results.map((result) => [result.methodId, result.status])).toEqual([
      ["B-02", "success"],
      ["D-01", "success"],
      ["D-03", "success"],
      ["D-07", "success"],
      ["H-01", "success"],
      ["H-03", "success"],
    ]);
    expect(calculated.results.every((result) => result.formalRuntimeActivationClaim === false)).toBe(true);
    expect(calculated.results.find((result) => result.methodId === "B-02")?.outputs[0]?.value).toBeCloseTo(0.8, 14);
    expect(calculated.results.find((result) => result.methodId === "H-01")?.outputs[0]?.value).toBe(150);
    expect(calculated.results.find((result) => result.methodId === "H-03")?.outputs.map((item) => item.value)).toEqual([1, 0.01]);
  });

  it("keeps individual engineering failures visible without aborting the other methods", () => {
    const baseline = input();
    const broken: MvpWorkspaceInput = {
      ...baseline,
      selectedMethodIds: ["B-02", "D-07"],
      methodInputs: baseline.methodInputs
        .filter((item) => item.methodId === "B-02" || item.methodId === "D-07")
        .map((item) => item.methodId === "B-02"
          ? { ...item, payload: { ...item.payload, windingClass: "multilayer" } }
          : item),
    };
    const calculated = calculateMvpWorkspace(broken, AT);
    expect(calculated.status).toBe("success");
    if (calculated.status === "success") {
      expect(calculated.results[0]?.status).toBe("not_applicable");
      expect(calculated.results[0]?.outputs).toEqual([]);
      expect(calculated.results[1]?.status).toBe("success");
    }
  });

  it("fails H-01 closed for invalid dispositions or contradictory other-load presence", () => {
    const baseline = input();
    const h01 = baseline.methodInputs.find((item) => item.methodId === "H-01")!;
    const invalidDisposition = calculateMvpWorkspace({
      ...baseline,
      selectedMethodIds: ["H-01"],
      methodInputs: [{
        methodId: "H-01",
        payload: { ...h01.payload, copperDisposition: "TYPO_EXCLUDES_LOAD" },
      }],
    } as unknown as MvpWorkspaceInput, AT);
    expect(invalidDisposition).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.workspace_invalid" },
    });

    const contradictoryPresence = calculateMvpWorkspace({
        ...baseline,
        selectedMethodIds: ["H-01"],
        methodInputs: [{
          methodId: "H-01",
          payload: {
            ...h01.payload,
            otherLoadPresent: false,
            otherDisposition: "known_applicable",
            otherValueW: 100,
          },
        }],
      }, AT);
    expect(contradictoryPresence.status).toBe("success");
    if (contradictoryPresence.status === "success") {
      expect(contradictoryPresence.results[0]).toMatchObject({
          methodId: "H-01",
          status: "invalid_input",
          outputs: [],
      });
    }
  });

  it("rejects unsupported payload fields before an adapter can silently discard them", () => {
    const baseline = input();
    for (const methodId of ["H-01", "D-07"] as const) {
      const selected = baseline.methodInputs.find(
        (item) => item.methodId === methodId,
      )!;
      const hostile = {
        ...baseline,
        selectedMethodIds: [methodId],
        methodInputs: [{
          methodId,
          payload: {
            ...selected.payload,
            UNSUPPORTED_ADDITIONAL_ENGINEERING_VALUE: 1000,
          },
        }],
      } as MvpWorkspaceInput;
      expect(calculateMvpWorkspace(hostile, AT)).toMatchObject({
        status: "invalid_input",
        failure: { code: "MVP.workspace_invalid" },
      });
      expect(saveMvpWorkspace(hostile, AT)).toMatchObject({
        status: "invalid_input",
        failure: { code: "MVP.workspace_invalid" },
      });
    }
  });

  it("rejects payload type and enum coercions at the common workspace boundary", () => {
    const baseline = input();
    const attacks = [
      ["D-01", "leadSegmentLengthsM", "0.2, 0.3"],
      ["D-03", "seriesExtrasMode", "typo"],
      ["H-01", "otherLoadPresent", "yes"],
    ] as const;
    for (const [methodId, key, value] of attacks) {
      const selected = baseline.methodInputs.find(
        (item) => item.methodId === methodId,
      )!;
      const hostile = {
        ...baseline,
        selectedMethodIds: [methodId],
        methodInputs: [{
          methodId,
          payload: { ...selected.payload, [key]: value },
        }],
      } as unknown as MvpWorkspaceInput;
      expect(calculateMvpWorkspace(hostile, AT)).toMatchObject({
        status: "invalid_input",
        failure: { code: "MVP.workspace_invalid" },
      });
    }
  });

  it("includes one explicitly present, fully evidenced H-01 other cooled load", () => {
    const baseline = input();
    const h01 = baseline.methodInputs.find((item) => item.methodId === "H-01")!;
    const calculated = calculateMvpWorkspace({
      ...baseline,
      selectedMethodIds: ["H-01"],
      methodInputs: [{
        methodId: "H-01",
        payload: {
          ...h01.payload,
          otherLoadPresent: true,
          otherDisposition: "known_applicable",
          otherValueW: 100,
        },
      }],
    }, AT);
    expect(calculated.status).toBe("success");
    if (calculated.status === "success") {
      expect(calculated.results[0]).toMatchObject({
        methodId: "H-01",
        status: "success",
        outputs: [{ value: 250 }],
      });
    }
  });

  it("rejects unstable case identities before saving or calculating", () => {
    const invalid = { ...input(), caseId: "contains spaces" };
    expect(saveMvpWorkspace(invalid, AT)).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.workspace_invalid" },
    });
    expect(calculateMvpWorkspace(invalid, AT)).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.workspace_invalid" },
    });
  });

  it("captures workspace data without executing accessors", () => {
    let getterCalls = 0;
    const hostile = input() as unknown as Record<string, unknown>;
    Object.defineProperty(hostile, "methodInputs", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return input().methodInputs;
      },
    });

    const calculateUntrusted = calculateMvpWorkspace as unknown as (
      value: unknown,
      calculatedAt: string,
    ) => ReturnType<typeof calculateMvpWorkspace>;
    expect(() => calculateUntrusted(hostile, AT)).not.toThrow();
    expect(calculateUntrusted(hostile, AT)).toMatchObject({
      status: "invalid_input",
      failure: { code: "MVP.workspace_invalid" },
    });
    expect(getterCalls).toBe(0);
  });

  it("rejects a re-fingerprinted authoritative quantity that drifts from the saved method input", () => {
    const saved = saveMvpWorkspace(input(), AT);
    expect(saved.status).toBe("success");
    if (saved.status !== "success") return;
    const candidate = JSON.parse(saved.canonicalJson) as MutableRecord;
    const caseSnapshot = candidate.caseSnapshot as MutableRecord;
    const payload = caseSnapshot.payload as MutableRecord;
    const geometry = payload.geometry as MutableRecord;
    const geometryPayload = geometry.payload as MutableRecord;
    geometryPayload.geometryMappingId = "forged.geometry.mapping.v9";
    recomputeSnapshotIdentity(geometry);
    recomputeCaseFingerprints(candidate);

    expect(loadMvpWorkspace(JSON.stringify(candidate))).toMatchObject({
      status: "invalid_input",
      code: "mvp_case_state_mismatch",
    });
  });
});
