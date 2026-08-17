import { describe, expect, it } from "vitest";

import {
  createMvpCaseDraft,
  saveMvpCaseDraft,
} from "../../src/application/mvpCaseService.js";
import { loadCaseVisualizationScene } from "../../src/application/visualizationService.js";
import { buildVisualizationSceneFromMechanicalInput } from "../../src/application/visualizationService.js";
import { PARAMETRIC_SCENE_MAPPING_ID } from "../../src/visualization/sceneModel.js";
import { phase6GeometryPayload } from "../fixtures/phase6Geometry.js";

function completeCaseJson(): string {
  const geometry = phase6GeometryPayload();
  const draft = createMvpCaseDraft({
    caseId: "phase6-case-001",
    caseName: "三维查看案例",
    geometryMappingId: PARAMETRIC_SCENE_MAPPING_ID,
    geometryAssumptions: geometry.assumptions,
    geometryQuantities: geometry.quantities,
    operatingConditions: [],
    userInputs: [],
    displayUnits: Object.fromEntries(
      geometry.quantities.map((quantity) => [
        quantity.parameterId,
        quantity.kind === "scalar"
          ? quantity.displayRepresentation.unitId
          : quantity.canonicalUnitId,
      ]),
    ),
    selectedMethodIds: [],
    methodInputs: [],
  });
  return saveMvpCaseDraft(draft, "2026-08-17T00:00:00.000Z");
}

function completeMechanicalInput(snapshotCreatedAt = "2026-08-17T00:00:00.000Z") {
  return {
    snapshotCreatedAt,
    declaredValidDigits: 4,
    workpieceOuterDiameterMm: 800,
    workpieceInnerDiameterMm: 700,
    workpieceActiveLengthMm: 500,
    insulationInnerDiameterMm: 800,
    insulationOuterDiameterMm: 900,
    radialGapMm: 50,
    coilInnerDiameterMm: 1_000,
    coilOuterDiameterMm: 1_080,
    coilMeanDiameterMm: 1_040,
    coilWindingEnvelopeLengthMm: 320,
    helixRevolutionCount: 4,
    helixAxialAdvanceMm: 280,
    leadLengthMm: 400,
    conductorRadialSizeMm: 40,
    conductorOuterDiameterMm: 40,
    conductorInnerDiameterMm: 24,
  };
}

describe("Case visualization application service", () => {
  it("loads a strict Case and exposes only the scene plus friendly metadata", () => {
    const result = loadCaseVisualizationScene(completeCaseJson());
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }
    expect(result.caseName).toBe("三维查看案例");
    expect(result.scene.components).toHaveLength(6);
    expect(result).not.toHaveProperty("caseFile");
    expect(result).not.toHaveProperty("payload");
    expect(result.scene).not.toHaveProperty("source");
    expect(result.scene).not.toHaveProperty("mappingId");
  });

  it("returns concise Chinese failures without raw internal parameter IDs", () => {
    const invalid = loadCaseVisualizationScene("{not-json");
    expect(invalid).toMatchObject({
      status: "failed",
      errorCode: "invalid_json",
      messageZh: "所选文件不是有效的 Case JSON。",
    });

    const geometry = phase6GeometryPayload();
    const missing = createMvpCaseDraft({
      caseId: "phase6-case-missing",
      caseName: "不完整案例",
      geometryMappingId: PARAMETRIC_SCENE_MAPPING_ID,
      geometryAssumptions: geometry.assumptions,
      geometryQuantities: geometry.quantities.filter(
        (quantity) => quantity.parameterId !== "conductor.inner_diameter",
      ),
      operatingConditions: [],
      userInputs: [],
      displayUnits: {},
      selectedMethodIds: [],
      methodInputs: [],
    });
    const result = loadCaseVisualizationScene(
      saveMvpCaseDraft(missing, "2026-08-17T00:00:00.000Z"),
    );
    expect(result).toMatchObject({
      status: "failed",
      errorCode: "insufficient_geometry",
      missingInputsZh: ["圆管导体冷却水孔内径"],
    });
    expect(JSON.stringify(result)).not.toContain("conductor.inner_diameter");
  });

  it("builds a usable immutable scene from complete explicit millimetre inputs", () => {
    const result = buildVisualizationSceneFromMechanicalInput(
      completeMechanicalInput(),
    );
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      return;
    }
    expect(result.scene.components.map((component) => component.labelZh)).toEqual([
      "工件 / 炉管",
      "保温层",
      "径向空气隙",
      "空心水冷线圈",
      "冷却水通道",
      "引线 / 母排（路径示意）",
    ]);
    expect(result.scene).not.toHaveProperty("source");
    expect(result.scene).not.toHaveProperty("mappingId");
    expect(Object.isFrozen(result.scene)).toBe(true);

    const otherTimestamp = buildVisualizationSceneFromMechanicalInput(
      completeMechanicalInput("2026-08-18T00:00:00.000Z"),
    );
    expect(otherTimestamp).toEqual(result);
  });

  it("does not invent missing dimensions or repair conflicting geometry", () => {
    const missing = completeMechanicalInput() as Record<string, unknown>;
    delete missing.conductorInnerDiameterMm;
    expect(
      buildVisualizationSceneFromMechanicalInput(
        missing as unknown as ReturnType<typeof completeMechanicalInput>,
      ),
    ).toMatchObject({
      status: "failed",
      errorCode: "invalid_mechanical_input",
    });

    expect(
      buildVisualizationSceneFromMechanicalInput({
        ...completeMechanicalInput(),
        radialGapMm: 80,
      }),
    ).toMatchObject({
      status: "failed",
      errorCode: "inconsistent_geometry",
    });

    expect(
      buildVisualizationSceneFromMechanicalInput({
        ...completeMechanicalInput(),
        declaredValidDigits: 0,
      }),
    ).toMatchObject({
      status: "failed",
      errorCode: "invalid_mechanical_input",
    });
  });

  it("rejects hostile accessors and throwing proxies without executing getters or throwing", () => {
    let getterCalls = 0;
    const accessor = completeMechanicalInput() as Record<string, unknown>;
    Object.defineProperty(accessor, "coilInnerDiameterMm", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    });
    expect(() =>
      buildVisualizationSceneFromMechanicalInput(
        accessor as unknown as ReturnType<typeof completeMechanicalInput>,
      ),
    ).not.toThrow();
    expect(
      buildVisualizationSceneFromMechanicalInput(
        accessor as unknown as ReturnType<typeof completeMechanicalInput>,
      ),
    ).toMatchObject({ status: "failed", errorCode: "invalid_mechanical_input" });
    expect(getterCalls).toBe(0);

    const throwingProxy = new Proxy(completeMechanicalInput(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    expect(() => buildVisualizationSceneFromMechanicalInput(throwingProxy)).not.toThrow();
    expect(buildVisualizationSceneFromMechanicalInput(throwingProxy)).toMatchObject({
      status: "failed",
      errorCode: "invalid_mechanical_input",
    });
  });
});
