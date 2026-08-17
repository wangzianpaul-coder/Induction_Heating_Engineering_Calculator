import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EngineeringApp } from "../../src/ui/App.js";
import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";
import {
  DEFAULT_UI_LANGUAGE,
  UI_LANGUAGE_STORAGE_KEY,
  parseStoredUiLanguage,
} from "../../src/ui/i18n.js";

const UI_ROOT = join(process.cwd(), "src", "ui");

function uiSourceFiles(): readonly string[] {
  return readdirSync(UI_ROOT)
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => join(UI_ROOT, name));
}

describe("Phase 5 engineering UI", () => {
  it("server-renders Simplified Chinese by default with an accessible visible language switch", () => {
    const html = renderToStaticMarkup(
      createElement(EngineeringApp, { application: ENGINEERING_UI_APPLICATION }),
    );

    expect(html).toContain("感应加热工程计算器");
    expect(html).toContain("参数定义");
    expect(html).toContain("方法就绪状态");
    expect(html).toContain("Case 检查器");
    expect(html).toContain("关于 / 版本");
    expect(html).toContain("计算结果");
    expect(html).toContain("材料比较");
    expect(html).toContain("工程报告");
    expect(html).toContain("不可用");
    expect(html).toContain("正式方法注册表激活状态仍为 false");
    expect(html).toContain("Phase 6 参数化三维快照适配器和查看器尚未启用");
    expect(html).toContain("aria-label=\"工程计算工作区\"");
    expect(html).toContain("aria-label=\"界面语言\"");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("简体中文");
    expect(html).toContain("English");
    expect(html).toContain("aria-current=\"page\"");
    for (const methodId of ENGINEERING_UI_APPLICATION.mvp.methods.map((method) => method.methodId)) {
      expect(html).toContain(methodId);
    }
  });

  it("can render the complete English interface without changing engineering data", () => {
    const html = renderToStaticMarkup(
      createElement(EngineeringApp, {
        application: ENGINEERING_UI_APPLICATION,
        initialLanguage: "en",
      }),
    );

    expect(html).toContain("Engineering Calculator");
    expect(html).toContain("Parameters");
    expect(html).toContain("Method Readiness");
    expect(html).toContain("Case Inspector");
    expect(html).toContain("About / Versions");
    expect(html).toContain("Calculation results");
    expect(html).toContain("Formal method-registry activation remains");
    expect(html).toContain("aria-label=\"Engineering workspace\"");
    expect(html).toContain("aria-label=\"Interface language\"");
    expect(html).toContain("aria-pressed=\"true\" type=\"button\">English");
  });

  it("defaults invalid or absent UI-only language preferences to Simplified Chinese", () => {
    expect(DEFAULT_UI_LANGUAGE).toBe("zh-CN");
    expect(UI_LANGUAGE_STORAGE_KEY).toBe("ih-engineering-calculator.ui-language");
    expect(parseStoredUiLanguage(null)).toBe("zh-CN");
    expect(parseStoredUiLanguage("unexpected")).toBe("zh-CN");
    expect(parseStoredUiLanguage("en")).toBe("en");
  });

  it("keeps the language preference isolated from the canonical Case boundary", () => {
    const i18nSource = readFileSync(join(UI_ROOT, "i18n.tsx"), "utf8");
    const formSource = readFileSync(join(UI_ROOT, "mvp-form.ts"), "utf8");

    expect(i18nSource).toContain("window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language)");
    expect(i18nSource).not.toMatch(/canonicalJson|selectedMethodIds|methodInputs|caseSnapshotId/);
    expect(formSource).not.toContain(UI_LANGUAGE_STORAGE_KEY);
    expect(formSource).not.toMatch(/uiLanguage|languagePreference/);
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
    expect(ENGINEERING_UI_APPLICATION.mvp.methods.map((method) => method.methodId)).toEqual([
      "B-02",
      "B-03",
      "D-01",
      "D-03",
      "D-07",
      "F-01",
      "H-01",
      "H-03",
    ]);
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
    expect(htmlSource).toContain('<html lang="zh-Hans">');
    expect(stylesSource).toContain("body { font-size: 15px; }");
    expect(stylesSource).toContain("font-size: 14px;");
    expect(stylesSource).toContain("@media (max-width: 1450px)");
    expect(stylesSource).toContain("@media (min-width: 2200px)");
    expect(stylesSource).toContain("@media print");
    expect(stylesSource).not.toMatch(/font-size:\s*(?:8|9|10)px/);
  });
});
