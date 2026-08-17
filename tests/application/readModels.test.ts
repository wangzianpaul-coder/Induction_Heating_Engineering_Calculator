import { describe, expect, it } from "vitest";

import {
  APPLICATION_READINESS,
  METHOD_READINESS_ROWS,
  METHOD_READINESS_SUMMARY,
  PARAMETER_DEFINITION_ROWS,
  inspectCurrentCaseFile,
  queryParameterDefinitionRows,
} from "../../src/application/public-api.js";
import { VERSION_INFO } from "../../src/config/versions.js";
import { createUnavailableQuantity } from "../../src/controlled-quantity-factory.js";
import { methodId, parameterId, sourceRef } from "../../src/domain/ids.js";
import { createCaseSnapshot, createGeometrySnapshot } from "../../src/domain/snapshot.js";
import { PARAMETER_REGISTRY } from "../../src/registries/parameterCatalog.js";
import { createCaseFile, serializeCaseFile } from "../../src/serialization/case-file.js";

describe("Phase-5B application read models", () => {
  it("preserves all 67 canonical parameter identities and only three controlled derivations", () => {
    expect(PARAMETER_DEFINITION_ROWS).toHaveLength(67);
    expect(PARAMETER_DEFINITION_ROWS.map((row) => row.parameterId)).toEqual(
      PARAMETER_REGISTRY.ids(),
    );
    expect(PARAMETER_DEFINITION_ROWS.filter((row) => row.controlledDerivation !== null)
      .map((row) => row.parameterId).sort()).toEqual([
        "coil.current_path_diameter",
        "coil.mean_diameter",
      "thermal.radial_gap",
    ]);
    expect(PARAMETER_DEFINITION_ROWS.filter((row) => row.controlledDerivation !== null)
      .every((row) => row.controlledDerivation?.scope === "metadata_only" &&
        row.controlledDerivation.executionAvailable === false)).toBe(true);
    expect(Object.isFrozen(PARAMETER_DEFINITION_ROWS[0]?.allowedDisplayUnits)).toBe(true);
  });

  it("searches Unicode canonical metadata but never migration aliases", () => {
    expect(queryParameterDefinitionRows({ search: "线圈机械内径" }).map((row) => row.parameterId))
      .toContain("coil.inner_diameter");
    expect(queryParameterDefinitionRows({ search: "  COIL MECHANICAL INNER DIAMETER  " })
      .map((row) => row.parameterId)).toContain("coil.inner_diameter");
    expect(queryParameterDefinitionRows({ search: "Dmean" })).toEqual([]);
    expect(queryParameterDefinitionRows({ search: "coil.turn_count" })).toEqual([]);
  });

  it("filters exact metadata and exposes controlled unit/method joins without producer inference", () => {
    const rows = queryParameterDefinitionRows({
      ownerModule: "B",
      dimension: "length",
      consumingMethodId: methodId("B-01"),
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.ownerModule === "B" && row.dimension === "length")).toBe(true);
    const inner = rows.find((row) => row.parameterId === "coil.inner_diameter");
    expect(inner?.canonicalUnit).toMatchObject({ unitId: "m", symbol: "m", isCanonical: true });
    expect(inner?.consumingMethods.map((method) => method.methodId)).toContain("B-01");
  });

  it("keeps the frozen 52/0 registry boundary while reporting ten controlled adapters", () => {
    expect(METHOD_READINESS_ROWS).toHaveLength(52);
    expect(METHOD_READINESS_SUMMARY).toEqual({
      specificationCount: 52,
      runtimeExecutableCount: 0,
      blockedCount: 52,
    });
    expect(METHOD_READINESS_ROWS.every((row) =>
      !row.runtimeExecutable && row.runtimeBlockReason !== null)).toBe(true);
    expect(APPLICATION_READINESS.counts).toEqual({
      parameterDefinitions: 67,
      controlledDerivations: 3,
      methodSpecifications: 52,
      runtimeExecutableMethods: 0,
      runnableMvpAdapters: 10,
      releasedMaterials: 0,
    });
    expect(APPLICATION_READINESS.capabilities.caseCreation.status).toBe("available");
    expect(APPLICATION_READINESS.capabilities.caseEditing.status).toBe("available");
    expect(APPLICATION_READINESS.capabilities.resultProduction.status).toBe("available");
    expect([
      APPLICATION_READINESS.capabilities.materialComparison.status,
      APPLICATION_READINESS.capabilities.geometry3d.status,
      APPLICATION_READINESS.capabilities.calculationTrace.status,
      APPLICATION_READINESS.capabilities.engineeringReport.status,
    ]).toEqual(["blocked", "available", "blocked", "blocked"]);
    expect(APPLICATION_READINESS.builds.map((build) => build.phase5UiTargetReadiness))
      .toEqual(["automated_artifact_gate_verified", "automated_artifact_gate_verified"]);
    expect(APPLICATION_READINESS.builds.map((build) => build.currentArtifactScope))
      .toEqual(["v0_9_test_release_ui", "v0_9_test_release_ui"]);
  });

  it("failure-closes case input and returns an immutable current-version canonical re-export", () => {
    expect(inspectCurrentCaseFile("{not-json")).toMatchObject({
      status: "invalid_input",
      code: "invalid_json",
    });

    const geometry = createGeometrySnapshot({
      geometrySchemaVersion: VERSION_INFO.geometrySchema,
      geometryMappingId: "canonical_single_layer_v1",
      quantities: [],
      assumptions: [],
    }, "2026-08-14T01:00:00Z");
    const unavailableFrequency = createUnavailableQuantity({
      parameterId: parameterId("frequency"),
      dimensionId: "frequency",
      basis: "total",
      provenance: {
        sourceKind: "user",
        sourceRef: sourceRef("case.input.frequency"),
        dataQuality: "unknown",
      },
      status: "missing",
      reason: "Not entered.",
    });
    const snapshot = createCaseSnapshot({
      caseId: "phase-5b-case",
      caseName: "Phase 5B inspection fixture",
      geometry,
      materials: [],
      operatingConditions: [unavailableFrequency],
      topology: { status: "insufficient_data" },
      phasorConvention: {
        amplitudeBasis: "rms",
        timeConvention: "exp_j_omega_t",
        currentDirection: "into_passive_port",
        complexPower: "S_equals_V_times_conjugate_I",
      },
      methodSelections: [{
        methodId: "B-01",
        methodVersion: VERSION_INFO.calculationModel,
        approvalStatus: "approved",
      }],
      measurementOverrides: [],
      femReferenceIds: [],
      attachmentHashes: [],
      userInputs: [],
      displayUnits: {},
      explicitOverrides: [],
      warningAcknowledgements: [],
      solverSettings: {},
      provenance: [],
      migration: { sourceSchemaVersion: VERSION_INFO.caseSchema, appliedMigrationIds: [] },
    }, "2026-08-14T01:00:00Z");
    const text = serializeCaseFile(createCaseFile(snapshot));
    const unsupported = JSON.parse(text) as { schemaVersion: string };
    unsupported.schemaVersion = "0.0.0-unsupported";
    expect(inspectCurrentCaseFile(JSON.stringify(unsupported))).toMatchObject({
      status: "insufficient_data",
      code: "unsupported_schema_version",
    });
    const inspected = inspectCurrentCaseFile(text);
    expect(inspected.status).toBe("success");
    if (inspected.status === "success") {
      expect(inspected.summary).toMatchObject({
        caseId: "phase-5b-case",
        counts: { materials: 0, methodSelections: 1, operatingConditions: 1 },
        selectedMethodIds: ["B-01"],
      });
      expect(Object.isFrozen(inspected)).toBe(true);
      expect(Object.isFrozen(inspected.summary.counts)).toBe(true);
      expect(inspectCurrentCaseFile(inspected.canonicalReexport)).toEqual(inspected);
    }
  });
});
