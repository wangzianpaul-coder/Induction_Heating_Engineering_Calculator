import { describe, expect, it } from "vitest";

import { VERSION_INFO } from "../../src/config/versions.js";
import { createGeometrySnapshot } from "../../src/domain/snapshot.js";
import { fingerprint } from "../../src/serialization/canonical-json.js";
import {
  PARAMETRIC_SCENE_MAPPING_ID,
  SCHEMATIC_VISUALIZATION_PROVENANCE,
  buildParametricEngineeringScene,
} from "../../src/visualization/sceneModel.js";
import {
  phase6GeometryPayload,
  phase6GeometrySnapshot,
} from "../fixtures/phase6Geometry.js";

describe("Phase-6 parametric scene model", () => {
  it("builds every required component from one immutable geometry snapshot", () => {
    const snapshot = phase6GeometrySnapshot();
    const before = JSON.stringify(snapshot);
    const result = buildParametricEngineeringScene(snapshot);

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }
    expect(result.scene.source.geometrySnapshotId).toBe(snapshot.snapshotId);
    expect(result.scene.source.geometryFingerprintSha256).toBe(
      snapshot.fingerprint.value,
    );
    expect(result.scene.mappingId).toBe(PARAMETRIC_SCENE_MAPPING_ID);
    expect(result.scene.visualizationProvenance).toBe(
      SCHEMATIC_VISUALIZATION_PROVENANCE,
    );
    expect(result.scene.watermark.zh).toContain("非 FEM 场");
    expect(result.scene.components.map((component) => component.componentId)).toEqual([
      "workpiece_or_tube",
      "insulation_layer[0]",
      "radial_air_gap",
      "coil_conductor",
      "coolant_path",
      "lead_or_bus",
    ]);
    expect(
      result.scene.components.every(
        (component) =>
          component.visualizationProvenance ===
          SCHEMATIC_VISUALIZATION_PROVENANCE,
      ),
    ).toBe(true);
    expect(result.scene.dimensions.map((dimension) => dimension.valueM)).toEqual([
      0.8,
      1.08,
      0.32,
      0.05,
    ]);
    expect(Object.isFrozen(result.scene)).toBe(true);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("produces exactly the same scene identity and dimensions for the same snapshot content", () => {
    const first = phase6GeometrySnapshot();
    const second = createGeometrySnapshot(
      phase6GeometryPayload(),
      "2026-08-18T00:00:00.000Z",
    );
    const firstResult = buildParametricEngineeringScene(first);
    const secondResult = buildParametricEngineeringScene(second);

    expect(first.snapshotId).toBe(second.snapshotId);
    expect(firstResult).toEqual(secondResult);
  });

  it("fails closed on tampering, wrong mappings, missing quantities and conflicting identities", () => {
    const snapshot = phase6GeometrySnapshot();
    const tampered = structuredClone(snapshot);
    const quantity = tampered.payload.quantities.find(
      (entry) => entry.parameterId === "coil.inner_diameter",
    );
    if (quantity?.kind === "scalar") {
      (quantity as { valueSi: number }).valueSi = 1.1;
    }
    expect(buildParametricEngineeringScene(tampered)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });

    const wrongMapping = createGeometrySnapshot(
      {
        ...phase6GeometryPayload(),
        geometryMappingId: "legacy.ambiguous.geometry",
      },
      "2026-08-17T00:00:00.000Z",
    );
    expect(buildParametricEngineeringScene(wrongMapping)).toMatchObject({
      status: "failed",
      code: "incompatible_snapshot",
    });

    const payload = phase6GeometryPayload();
    const missing = createGeometrySnapshot(
      {
        ...payload,
        quantities: payload.quantities.filter(
          (entry) => entry.parameterId !== "conductor.inner_diameter",
        ),
      },
      "2026-08-17T00:00:00.000Z",
    );
    expect(buildParametricEngineeringScene(missing)).toMatchObject({
      status: "failed",
      code: "insufficient_geometry",
      missingParameterIds: ["conductor.inner_diameter"],
    });

    const conflicting = phase6GeometrySnapshot({
      "thermal.radial_gap": 0.08,
    });
    expect(buildParametricEngineeringScene(conflicting)).toMatchObject({
      status: "failed",
      code: "inconsistent_geometry",
    });

    const tooManyRevolutions = phase6GeometrySnapshot({
      "coil.helix_revolution_count": 129,
    });
    expect(buildParametricEngineeringScene(tooManyRevolutions)).toMatchObject({
      status: "failed",
      code: "incompatible_snapshot",
    });
  });

  it("rejects an otherwise valid snapshot from a future geometry schema", () => {
    const payload = {
      ...phase6GeometryPayload(),
      geometrySchemaVersion: "9.0.0",
    };
    const snapshot = createGeometrySnapshot(payload, "2026-08-17T00:00:00.000Z");
    expect(snapshot.schemaVersion).toBe(VERSION_INFO.geometrySchema);
    expect(buildParametricEngineeringScene(snapshot)).toMatchObject({
      status: "failed",
      code: "incompatible_snapshot",
    });
  });

  it("does not execute hostile snapshot accessors or propagate Proxy failures", () => {
    let getterCalls = 0;
    const accessor = structuredClone(phase6GeometrySnapshot());
    Object.defineProperty(accessor, "payload", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("hostile snapshot getter");
      },
    });
    expect(() => buildParametricEngineeringScene(accessor)).not.toThrow();
    expect(buildParametricEngineeringScene(accessor)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });
    expect(getterCalls).toBe(0);

    const proxy = new Proxy(phase6GeometrySnapshot(), {
      ownKeys() {
        throw new Error("hostile snapshot ownKeys");
      },
    });
    expect(() => buildParametricEngineeringScene(proxy)).not.toThrow();
    expect(buildParametricEngineeringScene(proxy)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });

    let proxyGetterCalls = 0;
    const getterProxy = new Proxy(phase6GeometrySnapshot(), {
      get() {
        proxyGetterCalls += 1;
        throw new Error("hostile snapshot get");
      },
    });
    expect(buildParametricEngineeringScene(getterProxy)).toMatchObject({
      status: "success",
    });
    expect(proxyGetterCalls).toBe(0);

    const revocable = Proxy.revocable(phase6GeometrySnapshot(), {});
    revocable.revoke();
    expect(() => buildParametricEngineeringScene(revocable.proxy)).not.toThrow();
    expect(buildParametricEngineeringScene(revocable.proxy)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });
  });

  it("fails closed for null and extra snapshot or payload fields", () => {
    expect(() => buildParametricEngineeringScene(null)).not.toThrow();
    expect(buildParametricEngineeringScene(null)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });

    const extraRoot = structuredClone(
      phase6GeometrySnapshot(),
    ) as unknown as Record<string, unknown>;
    extraRoot.unexpected = true;
    expect(buildParametricEngineeringScene(extraRoot)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });

    const extraPayload = structuredClone(phase6GeometrySnapshot());
    (extraPayload.payload as unknown as Record<string, unknown>).unexpected = true;
    const recalculated = fingerprint({
      kind: extraPayload.kind,
      schemaVersion: extraPayload.schemaVersion,
      technicalFreezeId: extraPayload.technicalFreezeId,
      payload: extraPayload.payload,
    });
    (extraPayload as unknown as { fingerprint: typeof recalculated }).fingerprint =
      recalculated;
    (extraPayload as unknown as { snapshotId: string }).snapshotId =
      `geometry:${recalculated.value}`;
    expect(buildParametricEngineeringScene(extraPayload)).toMatchObject({
      status: "failed",
      code: "invalid_snapshot",
    });
  });
});
