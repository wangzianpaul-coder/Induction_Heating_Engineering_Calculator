import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EngineeringApp } from "../../src/ui/App.js";
import {
  EMPTY_BASIC_CALCULATOR_FORM,
  BASIC_FORM_FILE_SCHEMA_VERSION,
  basicResultCsv,
  buildBasicCalculatorInput,
  parseBasicCalculatorForm,
  serializeBasicCalculatorForm,
  type BasicCalculatorFormState,
} from "../../src/ui/BasicCalculator.js";
import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";

const UI_ROOT = join(process.cwd(), "src", "ui");

const NOMINAL_FORM = Object.freeze({
  ...EMPTY_BASIC_CALCULATOR_FORM,
  includeCoil: true,
  includeSeriesElectrical: true,
  electricalTurnCount: "12",
  conductorAxialSizeMm: "6",
  windingLengthMm: "120",
  currentPathDiameterMm: "160",
  windingConstruction: "uniform_identical_single_layer",
  fullPhysicalWindingLengthConfirmed: true,
  nonOverlappingTurnsConfirmed: true,
  magneticMedium: "air",
  relativePermeability: "",
  resistanceOhm: "0.2",
  inductanceMicrohenry: "50",
  currentA: "100",
  frequencyKhz: "10",
  portName: "线圈接线端",
  referencePlaneName: "线圈端子处",
  loadedState: "workpiece_hot",
  equivalentStateName: "热态工况",
  currentBasis: "rms",
  coilSeriesPortConfirmed: true,
  linearSinusoidalStateConfirmed: true,
} satisfies BasicCalculatorFormState);

function calculate(state: BasicCalculatorFormState = NOMINAL_FORM) {
  const built = buildBasicCalculatorInput(state);
  expect(built.status).toBe("success");
  if (built.status !== "success") throw new Error(built.message.en);
  return ENGINEERING_UI_APPLICATION.basic.calculate(built.input);
}

describe("0.9 guided basic calculator UI", () => {
  it("starts in Chinese without numeric engineering defaults", () => {
    const numericKeys = [
      "electricalTurnCount",
      "conductorAxialSizeMm",
      "windingLengthMm",
      "currentPathDiameterMm",
      "relativePermeability",
      "resistanceOhm",
      "inductanceMicrohenry",
      "currentA",
      "frequencyKhz",
    ] as const;
    for (const key of numericKeys) expect(EMPTY_BASIC_CALCULATOR_FORM[key]).toBe("");
    expect(buildBasicCalculatorInput(EMPTY_BASIC_CALCULATOR_FORM).status).toBe("invalid_input");

    const html = renderToStaticMarkup(
      createElement(EngineeringApp, { application: ENGINEERING_UI_APPLICATION }),
    );
    expect(html).toContain("基础计算器");
    expect(html).toContain("线圈几何与理想电感");
    expect(html).toContain("线圈串联电气参数");
    expect(html).toContain("计算结果");
    expect(html).toContain("导出结果 CSV");
    expect(html).toContain("打印结果");
    expect(html).toContain("打开基础方案");
    expect(html).toContain("保存基础方案");
    expect(html).toContain("只保存本页表单输入，不含计算结果");
    expect(html).not.toMatch(/value="(?:0|1|12|50|100|120|160)"/u);
  });

  it("round-trips a versioned exact-schema basic form without claiming a canonical case", () => {
    expect(BASIC_FORM_FILE_SCHEMA_VERSION).toBe("0.9.0");
    const text = serializeBasicCalculatorForm(NOMINAL_FORM, "2026-08-17T00:00:00.000Z");
    expect(parseBasicCalculatorForm(text)).toEqual({ status: "success", form: NOMINAL_FORM });
    expect(text).toContain('"kind": "induction-heating-basic-form"');
    expect(text).toContain('"schemaVersion": "0.9.0"');
    expect(text).not.toContain("calculationResult");
    expect(text).not.toContain("canonicalCase");

    const withExtra = JSON.parse(text) as Record<string, unknown>;
    withExtra.hiddenDefault = 1;
    expect(parseBasicCalculatorForm(JSON.stringify(withExtra)).status).toBe("invalid_input");
    const wrongVersion = { ...JSON.parse(text) as Record<string, unknown>, schemaVersion: "0.8.0" };
    expect(parseBasicCalculatorForm(JSON.stringify(wrongVersion)).status).toBe("invalid_input");
    const invalidTime = { ...JSON.parse(text) as Record<string, unknown>, savedAt: "not-a-time" };
    expect(parseBasicCalculatorForm(JSON.stringify(invalidTime)).status).toBe("invalid_input");
  });

  it("builds the exact public input and calculates all three friendly result sections", () => {
    const built = buildBasicCalculatorInput(NOMINAL_FORM);
    expect(built).toMatchObject({
      status: "success",
      input: {
        schemaVersion: "0.9.0",
        coil: {
          electricalTurnCount: 12,
          conductorAxialSizeMm: 6,
          windingLengthMm: 120,
          currentPathDiameterMm: 160,
          relativePermeability: null,
        },
        seriesElectrical: {
          resistanceOhm: 0.2,
          inductanceMicrohenry: 50,
          frequencyKhz: 10,
        },
      },
    });

    const result = calculate();
    expect(result.status).toBe("complete");
    expect(result.sections.map((section) => section.status)).toEqual([
      "success",
      "success_with_warnings",
      "success",
    ]);
    const fill = result.sections.flatMap((section) => section.outputs)
      .find((output) => output.key === "axialFillFactor");
    const ideal = result.sections.flatMap((section) => section.outputs)
      .find((output) => output.key === "idealInductanceLimit");
    const impedance = result.sections.flatMap((section) => section.outputs)
      .find((output) => output.key === "seriesImpedance");
    expect(fill?.value).toBeCloseTo(0.6, 15);
    expect(typeof ideal?.value).toBe("number");
    expect(ideal?.unit).toBe("µH");
    expect(impedance?.value).toMatchObject({ real: 0.2 });
    expect(result.sections.every((section) => section.sourceTitles.length > 0)).toBe(true);
  });

  it("keeps one invalid section from erasing independently valid results", () => {
    const result = calculate({
      ...NOMINAL_FORM,
      windingConstruction: "other_or_unknown",
      resistanceOhm: "0",
    });
    expect(result.status).toBe("partial");
    expect(result.sections.map((section) => section.status)).toEqual([
      "not_applicable",
      "success_with_warnings",
      "success_with_warnings",
    ]);
    expect(result.sections[0]?.outputs).toEqual([]);
    expect(result.sections[1]?.outputs).toHaveLength(1);
    expect(result.sections[2]?.outputs.length).toBeGreaterThan(1);
  });

  it("exports only friendly result columns and omits internal tracking data", () => {
    const csv = basicResultCsv(calculate(), "zh-CN");
    expect(csv).toContain('"计算部分","结果","状态","数值","单位","注意事项"');
    expect(csv).toContain("线圈轴向填充系数");
    expect(csv).toContain("理想长螺线管电感极限");
    expect(csv).toContain("线圈串联端口电气量");
    expect(csv).toContain("解析极限");
    expect(csv).not.toMatch(/methodId|sourceRef|snapshot|fingerprint|hash|SHA-?256|ADR-|\b[A-J]-\d{2}\b/iu);
  });

  it("uses the shared accessible help for every basic input and includes safe print/export controls", () => {
    const source = readFileSync(join(UI_ROOT, "BasicCalculator.tsx"), "utf8");
    const styles = readFileSync(join(UI_ROOT, "styles.css"), "utf8");
    const engineeringFieldDefinitions = source.match(/\{ id: "[^"]+", label:/gu) ?? [];
    expect(engineeringFieldDefinitions).toHaveLength(20);
    expect(source).toContain("COIL_FIELDS.map((field) => <BasicField");
    expect(source).toContain("SERIES_FIELDS.map((field) => <BasicField");
    expect(source).toContain("<HelpTooltip content={help}");
    expect(source).toContain('fieldId="includeCoil"');
    expect(source).toContain('fieldId="includeSeriesElectrical"');
    expect(source).toContain("new Blob");
    expect(source).toContain("window.print()");
    expect(styles).toContain("@media print");
    expect(styles).toContain(".basic-result-actions");
    expect(source).not.toContain("field.placeholder");
  });
});
