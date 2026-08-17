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
  caseFieldLabel,
  capabilityLabel,
  capabilityReason,
  fieldHelp,
  fieldLabel,
  optionLabel,
  parseStoredUiLanguage,
  publicFacingText,
  resultOutputLabel,
  userResultText,
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
    expect(html).toContain("计算功能说明");
    expect(html).toContain("方案文件");
    expect(html).toContain("关于 / 版本");
    expect(html).toContain("计算结果");
    expect(html).toContain("基础计算器");
    expect(html).toContain("高级计算");
    expect(html).toContain("感应线圈匹配与电感综合计算器");
    expect(html).toContain("自动公式判断");
    expect(html).toContain("0.9 测试版");
    expect(html).toContain("这是什么：");
    expect(html).toContain("怎么填写：");
    expect(html).toContain("会影响什么：");
    expect(html).toContain("aria-label=\"工程计算工作区\"");
    expect(html).toContain("aria-label=\"界面语言\"");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("简体中文");
    expect(html).toContain("English");
    expect(html).toContain("aria-current=\"page\"");
    expect(html).not.toContain("正式方法注册表");
    expect(html).not.toContain("Phase 5B");
    expect(html).not.toContain("受发布门禁限制");
    expect(html).not.toContain(">B-02<");
    expect(html).not.toContain(">F-01<");
    expect(html).not.toMatch(/ADR-\d+|\b[A-J]-\d{2}\b|sourceRef|snapshot|fingerprint|SHA-?256|formal\s+(?:method-)?registry/iu);
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
    expect(html).toContain("Calculation Guide");
    expect(html).toContain("Case Files");
    expect(html).toContain("About / Versions");
    expect(html).toContain("感应线圈匹配与电感综合计算器");
    expect(html).not.toContain("Formal method-registry activation remains");
    expect(html).toContain("aria-label=\"Engineering workspace\"");
    expect(html).toContain("aria-label=\"Interface language\"");
    expect(html).toContain("aria-pressed=\"true\" type=\"button\">English");
  });

  it("provides complete plain-language help for every advanced calculator input", () => {
    const forbiddenPublicMarker = /ADR-\d+|\b[A-J]-\d{2}\b|\b(?:GEO|DER)(?:-|_)|\bID\b|快照\s*ID|溯源\s*ID|sourceRef|snapshot|fingerprint|SHA-?256|\bhash\b|formal\s+(?:method-)?registry/iu;
    let fieldCount = 0;

    for (const method of ENGINEERING_UI_APPLICATION.mvp.methods) {
      for (const field of method.fields) {
        fieldCount += 1;
        const label = fieldLabel(field.id, field.label, "zh-CN");
        const help = fieldHelp(field.id, field.description, field.kind, "zh-CN");
        expect(label).not.toMatch(forbiddenPublicMarker);
        expect(help.what.length).toBeGreaterThan(5);
        expect(help.how.length).toBeGreaterThan(8);
        expect(help.impact.length).toBeGreaterThan(8);
        expect(`${help.what} ${help.how} ${help.impact}`).not.toMatch(forbiddenPublicMarker);
        const englishLabel = fieldLabel(field.id, field.label, "en");
        const englishHelp = fieldHelp(field.id, field.description, field.kind, "en");
        expect(`${englishLabel} ${englishHelp.what} ${englishHelp.how} ${englishHelp.impact}`).not.toMatch(forbiddenPublicMarker);
        for (const option of field.options) {
          expect(optionLabel(option.value, option.label, "zh-CN")).not.toMatch(forbiddenPublicMarker);
          expect(optionLabel(option.value, option.label, "en")).not.toMatch(forbiddenPublicMarker);
        }
      }
    }

    expect(fieldCount).toBeGreaterThan(100);
  });

  it("removes internal identifiers from every public parameter and capability description", () => {
    const forbiddenPublicMarker = /ADR-\d+|\b[A-J]-\d{2}\b|\b(?:GEO|DER)(?:-|_)|\bID\b|sourceRef|snapshot|fingerprint|SHA-?256|\bhash\b|formal\s+(?:method-)?registry/iu;

    for (const parameter of ENGINEERING_UI_APPLICATION.reference.parameters) {
      for (const language of ["zh-CN", "en"] as const) {
        const visible = [
          language === "zh-CN" ? parameter.localizedName : parameter.name,
          publicFacingText(parameter.physicalRange, language),
          publicFacingText(parameter.applicability, language),
          publicFacingText(parameter.definition, language),
          publicFacingText(parameter.help, language),
        ].join(" ");
        expect(visible, `${language}:${parameter.id}`).not.toMatch(forbiddenPublicMarker);
      }
    }

    for (const capability of ENGINEERING_UI_APPLICATION.reference.capabilities) {
      for (const language of ["zh-CN", "en"] as const) {
        const visible = `${capabilityLabel(capability.id, capability.label, language)} ${capabilityReason(capability.id, capability.reason, language)}`;
        expect(visible, `${language}:${capability.id}`).not.toMatch(forbiddenPublicMarker);
        expect(visible).not.toMatch(/formal registry activation remains unchanged|snapshot-driven/iu);
      }
    }
  });

  it("uses one reusable accessible question-help component for generic inputs", () => {
    const calculatorSource = readFileSync(join(UI_ROOT, "Calculator.tsx"), "utf8");
    const tooltipSource = readFileSync(join(UI_ROOT, "HelpTooltip.tsx"), "utf8");
    expect(calculatorSource).toContain("<HelpTooltip content={help}");
    expect(tooltipSource).toContain('role="tooltip"');
    expect(tooltipSource).toContain("aria-controls={tooltipId}");
    expect(tooltipSource).toContain("aria-expanded={open}");
    expect(tooltipSource).toContain('event.key !== "Escape"');
    expect(tooltipSource).toContain("onMouseEnter");
    expect(tooltipSource).toContain("onFocus");
    expect(tooltipSource).toContain("onClick");
  });

  it("defaults invalid or absent UI-only language preferences to Simplified Chinese", () => {
    expect(DEFAULT_UI_LANGUAGE).toBe("zh-CN");
    expect(UI_LANGUAGE_STORAGE_KEY).toBe("ih-engineering-calculator.ui-language");
    expect(parseStoredUiLanguage(null)).toBe("zh-CN");
    expect(parseStoredUiLanguage("unexpected")).toBe("zh-CN");
    expect(parseStoredUiLanguage("en")).toBe("en");
  });

  it("selects one language from bilingual calculation messages", () => {
    const bilingual = "铜导体工况已确认。 / The copper state is confirmed.";
    expect(userResultText(bilingual, "zh-CN")).toBe("铜导体工况已确认。");
    expect(userResultText(bilingual, "en")).toBe("The copper state is confirmed.");
    expect(userResultText("uniform cylindrical helix", "zh-CN")).toBe("导体路径按均匀圆柱螺旋线处理。");
    expect(resultOutputLabel("Qcool", { zh: "Qcool", en: "Qcool" }, "zh-CN")).toBe("冷却回路总热负荷");
    expect(resultOutputLabel("Dh", { zh: "Dh", en: "Dh" }, "en")).toBe("Hydraulic diameter");
    const reflectedImpedanceAssumption = "primary and secondary material temperatures may differ physically but each is state-matched across its parameter snapshots";
    expect(userResultText(reflectedImpedanceAssumption, "en")).not.toMatch(/snapshots?|fingerprints?|hash(?:es)?|\bIDs?\b/iu);
    expect(userResultText("snapshot IDs, fingerprints and hashes are internal", "en")).toBe("record, evidence records and verification records are internal");
    expect(caseFieldLabel("Material snapshots", "en")).toBe("Material records");
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
      "D-04",
      "D-07",
      "F-01",
      "H-01",
      "H-03",
      "J-03",
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

    expect(appSource).toContain("方案输入记录 — 不含计算结果");
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
    const readableCopyOverride = stylesSource.indexOf("This block\n   intentionally follows the component rules");
    expect(readableCopyOverride).toBeGreaterThan(stylesSource.indexOf(".statusbar {"));
    expect(readableCopyOverride).toBeLessThan(stylesSource.indexOf("@media (min-width: 2200px)"));
    expect(stylesSource.slice(readableCopyOverride)).toContain(".definition-list dd,");
    expect(stylesSource.slice(readableCopyOverride)).toContain("font-size: 13px;");
    expect(stylesSource).toContain("@media (max-width: 1450px)");
    expect(stylesSource).toContain("@media (min-width: 2200px)");
    expect(stylesSource).toContain("@media print");
    expect(stylesSource).not.toMatch(/font-size:\s*(?:8|9|10)px/);
  });
});
