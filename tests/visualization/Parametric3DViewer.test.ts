import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Parametric3DViewer } from "../../src/visualization/Parametric3DViewer.js";
import { buildParametricEngineeringScene } from "../../src/visualization/sceneModel.js";
import { phase6GeometrySnapshot } from "../fixtures/phase6Geometry.js";

describe("Parametric3DViewer presentation boundary", () => {
  it("always renders the Chinese-first non-FEM watermark and friendly controls", () => {
    const built = buildParametricEngineeringScene(phase6GeometrySnapshot());
    expect(built.status).toBe("success");
    if (built.status !== "success") {
      return;
    }
    const markup = renderToStaticMarkup(
      createElement(Parametric3DViewer, { scene: built.scene }),
    );
    expect(markup).toContain("示意图 / Schematic · 非 FEM 场");
    expect(markup).toContain("复位视角");
    expect(markup).toContain("剖切显示");
    expect(markup).toContain("空心水冷线圈");
    expect(markup).toContain("冷却水通道");
    expect(markup).not.toContain(built.scene.source.geometrySnapshotId);
    expect(markup).not.toContain(built.scene.source.geometryFingerprintSha256);
    expect(markup).not.toContain("workpiece_or_tube");
    expect(markup).not.toContain("coil_conductor");
  });

  it("keeps renderer imports outside methods, materials and FEM interchange", () => {
    const source = readFileSync(
      new URL("../../src/visualization/Parametric3DViewer.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'][^"']*methods\//u);
    expect(source).not.toMatch(/from\s+["'][^"']*materials\//u);
    expect(source).not.toMatch(/from\s+["'][^"']*interchange\//u);
    expect(source).not.toContain("parseCaseFile");
    expect(source).not.toContain("calculate");
  });
});
