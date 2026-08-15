import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EngineeringApp } from "../../src/ui/App.js";
import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";

const UI_ROOT = join(process.cwd(), "src", "ui");

function uiSourceFiles(): readonly string[] {
  return readdirSync(UI_ROOT)
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => join(UI_ROOT, name));
}

describe("Phase 5 engineering UI", () => {
  it("server-renders the professional shell and explicit gated destinations", () => {
    const html = renderToStaticMarkup(
      createElement(EngineeringApp, { application: ENGINEERING_UI_APPLICATION }),
    );

    expect(html).toContain("Engineering Calculator");
    expect(html).toContain("Parameters");
    expect(html).toContain("Method Readiness");
    expect(html).toContain("Case Inspector");
    expect(html).toContain("About / Versions");
    expect(html).toContain("Calculation results");
    expect(html).toContain("Material Comparison");
    expect(html).toContain("Engineering Report");
    expect(html).toContain("Unavailable");
    expect(html).toContain("Formal method-registry activation remains false");
    expect(html).toContain("The Phase-6 parametric 3D snapshot adapter and viewer are not activated.");
    expect(html).toContain("aria-label=\"Engineering workspace\"");
    expect(html).toContain("aria-current=\"page\"");
    for (const methodId of ["B-02", "D-01", "D-03", "D-07", "H-01", "H-03"]) {
      expect(html).toContain(methodId);
    }
  });

  it("exposes the complete public read models without marking methods executable", () => {
    expect(ENGINEERING_UI_APPLICATION.reference.parameters).toHaveLength(67);
    expect(ENGINEERING_UI_APPLICATION.reference.methods).toHaveLength(52);
    expect(
      ENGINEERING_UI_APPLICATION.reference.methods.filter((method) => method.executionEnabled),
    ).toHaveLength(0);
    expect(
      ENGINEERING_UI_APPLICATION.reference.capabilities.find((item) => item.id === "case-inspector")?.available,
    ).toBe(true);
    expect(ENGINEERING_UI_APPLICATION.mvp.methods).toHaveLength(6);
    expect(ENGINEERING_UI_APPLICATION.mvp.methods.every((method) => !method.formalRuntimeActivationClaim)).toBe(true);
  });

  it("fails closed for invalid case text through the public application inspector", () => {
    const result = ENGINEERING_UI_APPLICATION.inspectCaseJson("{");
    expect(result).toEqual({
      status: "invalid_input",
      code: "invalid_json",
      message: "The selected file is not valid JSON.",
    });
  });

  it("imports engineering data only through the application public API", () => {
    const forbiddenBoundary = /(?:methods|registries|materials|serialization|domain|config|archive)\//;
    const applicationImports: Array<{ readonly file: string; readonly specifier: string }> = [];

    for (const file of uiSourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        expect(specifier, file).not.toMatch(forbiddenBoundary);
        if (specifier.includes("application/")) {
          applicationImports.push({ file, specifier });
        }
      }
    }

    expect(applicationImports).toEqual([
      {
        file: join(UI_ROOT, "application-adapter.ts"),
        specifier: "../application/public-api.js",
      },
    ]);
  });

  it("keeps case export, print, and offline boundaries explicit in UI source", () => {
    const appSource = readFileSync(join(UI_ROOT, "App.tsx"), "utf8");
    const adapterSource = readFileSync(join(UI_ROOT, "application-adapter.ts"), "utf8");
    const stylesSource = readFileSync(join(UI_ROOT, "styles.css"), "utf8");
    const htmlSource = readFileSync(join(UI_ROOT, "index.html"), "utf8");
    const combinedSource = [
      ...uiSourceFiles().map((file) => readFileSync(file, "utf8")),
      stylesSource,
      htmlSource,
    ].join("\n");

    expect(appSource).toContain("Case Input Record — No Calculation Result");
    expect(appSource).toContain("new Blob([importedCase.validatedJson]");
    expect(appSource).toContain("URL.createObjectURL(blob)");
    expect(appSource).toContain("URL.revokeObjectURL(objectUrl)");
    expect(appSource).toContain("window.print()");
    expect(appSource.match(/disabled=\{importedCase === null\}/g)).toHaveLength(2);
    expect(adapterSource).toContain("validatedJson: result.canonicalReexport");
    expect(combinedSource).not.toMatch(/\bfetch\s*\(/);
    expect(combinedSource).not.toMatch(/\bXMLHttpRequest\b|\bWebSocket\b|\bserviceWorker\b/);
    expect(combinedSource).not.toMatch(/https?:\/\//);
    expect(combinedSource).not.toMatch(/<svg|<img/i);
    expect(`${stylesSource}\n${htmlSource}`).not.toMatch(/url\s*\(/i);
    expect(stylesSource).toContain("@media (max-width: 1450px)");
    expect(stylesSource).toContain("@media (min-width: 2200px)");
    expect(stylesSource).toContain("@media print");
  });
});
