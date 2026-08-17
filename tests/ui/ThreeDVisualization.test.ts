import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  EMPTY_MECHANICAL_VISUALIZATION_FORM,
  ThreeDVisualizationPage,
  buildMechanicalVisualizationInput,
  type MechanicalVisualizationFormState,
} from "../../src/ui/ThreeDVisualization.js";
import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";
import { UiLanguageProvider } from "../../src/ui/i18n.js";

const NOMINAL_FORM = Object.freeze({
  declaredValidDigits: "4",
  workpieceOuterDiameterMm: "100",
  workpieceInnerDiameterMm: "0",
  workpieceActiveLengthMm: "240",
  insulationInnerDiameterMm: "100",
  insulationOuterDiameterMm: "140",
  radialGapMm: "20",
  coilInnerDiameterMm: "180",
  coilOuterDiameterMm: "220",
  coilMeanDiameterMm: "200",
  coilWindingEnvelopeLengthMm: "200",
  helixRevolutionCount: "10",
  helixAxialAdvanceMm: "180",
  leadLengthMm: "100",
  conductorRadialSizeMm: "20",
  conductorOuterDiameterMm: "20",
  conductorInnerDiameterMm: "12",
} satisfies MechanicalVisualizationFormState);

describe("3D schematic public UI", () => {
  it("keeps every mechanical value explicit and builds the presentation-safe scene", () => {
    expect(Object.keys(EMPTY_MECHANICAL_VISUALIZATION_FORM)).toHaveLength(17);
    expect(Object.values(EMPTY_MECHANICAL_VISUALIZATION_FORM).every((value) => value === "")).toBe(true);
    expect(buildMechanicalVisualizationInput(EMPTY_MECHANICAL_VISUALIZATION_FORM, "2026-08-17T00:00:00.000Z").status).toBe("invalid_input");

    const built = buildMechanicalVisualizationInput(NOMINAL_FORM, "2026-08-17T00:00:00.000Z");
    expect(built).toMatchObject({
      status: "success",
      input: {
        snapshotCreatedAt: "2026-08-17T00:00:00.000Z",
        declaredValidDigits: 4,
        workpieceInnerDiameterMm: 0,
        coilMeanDiameterMm: 200,
        helixRevolutionCount: 10,
      },
    });
    if (built.status !== "success") throw new Error(built.message.en);
    const result = ENGINEERING_UI_APPLICATION.visualization.buildFromMechanicalInput(built.input);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error(result.messageEn);
    expect(result.scene.watermark.zh).toBe("示意图 · 非 FEM 场");
    expect(result.scene.components.length).toBeGreaterThanOrEqual(5);
    expect(JSON.stringify(result.scene)).not.toMatch(/geometrySnapshotId|mappingId|fingerprint|SHA-?256|technicalFreezeId|sourceRef/iu);
  });

  it("renders Chinese-first dimensions, accessible help, and the FEM safety boundary", () => {
    const html = renderToStaticMarkup(
      createElement(
        UiLanguageProvider,
        {
          initialLanguage: "zh-CN",
          children: createElement(ThreeDVisualizationPage, { application: ENGINEERING_UI_APPLICATION }),
        },
      ),
    );
    expect(html).toContain("3D 示意 / FEM");
    expect(html).toContain("示意图 · 非 FEM 场");
    expect(html).toContain("本组尺寸的保守有效位数");
    expect(html).toContain("工件 / 炉管外径");
    expect(html).toContain("圆管冷却水孔内径");
    expect(html).toContain("填写前请核对 5 个关系");
    expect(html).toContain("外部 FEM 结果");
    expect(html).toContain("实际结果文件和文件完整性证据");
    expect(html.match(/这是什么：/gu)).toHaveLength(17);
    expect(html.match(/怎么填写：/gu)).toHaveLength(17);
    expect(html.match(/会影响什么：/gu)).toHaveLength(17);
    expect(html).not.toMatch(/ADR-\d+|\b[A-J]-\d{2}\b|\b(?:GEO|DER)(?:-|_)|snapshot|fingerprint|SHA-?256|sourceRef|mappingId|technicalFreezeId/iu);
  });

  it("does not infer conflicting dimensions or silently clamp viewer capacity", () => {
    const inconsistent = buildMechanicalVisualizationInput(
      { ...NOMINAL_FORM, coilOuterDiameterMm: "221" },
      "2026-08-17T00:00:00.000Z",
    );
    expect(inconsistent.status).toBe("success");
    if (inconsistent.status !== "success") throw new Error(inconsistent.message.en);
    expect(ENGINEERING_UI_APPLICATION.visualization.buildFromMechanicalInput(inconsistent.input)).toMatchObject({
      status: "failed",
      errorCode: "inconsistent_geometry",
    });

    const excessive = buildMechanicalVisualizationInput(
      { ...NOMINAL_FORM, helixRevolutionCount: "129" },
      "2026-08-17T00:00:00.000Z",
    );
    expect(excessive.status).toBe("success");
    if (excessive.status !== "success") throw new Error(excessive.message.en);
    expect(ENGINEERING_UI_APPLICATION.visualization.buildFromMechanicalInput(excessive.input)).toMatchObject({
      status: "failed",
      errorCode: "viewer_capacity_exceeded",
    });
  });

  it("keeps the visible watermark and WebGL failure handling inside the viewer", () => {
    const source = readFileSync(join(process.cwd(), "src", "visualization", "Parametric3DViewer.tsx"), "utf8");
    expect(source).toContain("示意图 / Schematic · 非 FEM 场");
    expect(source).toContain("WebGL");
    expect(source).toContain("浏览器无法创建 WebGL 三维画布");
  });
});
