import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EngineeringApp } from "../../src/ui/App.js";
import {
  BASIC_FORM_FILE_SCHEMA_VERSION,
  DEFAULT_BASIC_CALCULATOR_FORM,
  EMPTY_BASIC_CALCULATOR_FORM,
  basicResultCsv,
  buildBasicCalculatorInput,
  parseBasicCalculatorForm,
  serializeBasicCalculatorForm,
  type BasicCalculatorFormState,
} from "../../src/ui/BasicCalculator.js";
import {
  LEGACY_BASIC_TABS,
  LegacyReferencePage,
  type LegacyBasicPage,
} from "../../src/ui/basic-matching/LegacyReferencePages.js";
import { ENGINEERING_UI_APPLICATION } from "../../src/ui/application-adapter.js";

const UI_ROOT = join(process.cwd(), "src", "ui");

const EXPECTED_DEFAULT_FORM = Object.freeze({
  coilType: "single",
  nagaokaSource: "integral",
  coilLengthMm: "300",
  coilInnerDiameterMm: "1000",
  turns: "4",
  radialWidthMm: "30",
  conductorHeightMm: "60",
  simpsonN: "400",
  manualKn: "0.52",
  lineVoltageV: "380",
  ratedPowerKw: "100",
  frequencyKHz: "10",
  rectifierFactor: "1.35",
  equivalentResistanceOhm: "0.03",
  targetQ: "40",
  copperResistivityMicroOhmCm: "2",
  workpieceMuR: "1",
  workpieceResistivityMicroOhmCm: "130",
  workpieceLengthMm: "300",
  workpieceDiameterMm: "800",
  coilAcResistanceOhm: "0.006",
  coolingFactor: "1.7",
  inletTempC: "35",
  outletTempC: "55",
  waterSpecificHeat: "4180",
  waterDensityKgL: "1",
} satisfies BasicCalculatorFormState);

const EXPECTED_DEFAULT_INPUT = Object.freeze({
  coilType: "single",
  nagaokaSource: "integral",
  coilLengthMm: 300,
  coilInnerDiameterMm: 1000,
  turns: 4,
  radialWidthMm: 30,
  conductorHeightMm: 60,
  simpsonN: 400,
  manualKn: 0.52,
  lineVoltageV: 380,
  ratedPowerKw: 100,
  frequencyKHz: 10,
  rectifierFactor: 1.35,
  equivalentResistanceOhm: 0.03,
  targetQ: 40,
  copperResistivityMicroOhmCm: 2,
  workpieceMuR: 1,
  workpieceResistivityMicroOhmCm: 130,
  workpieceLengthMm: 300,
  workpieceDiameterMm: 800,
  coilAcResistanceOhm: 0.006,
  coolingFactor: 1.7,
  inletTempC: 35,
  outletTempC: 55,
  waterSpecificHeat: 4180,
  waterDensityKgL: 1,
});

const EXPECTED_TABS = Object.freeze([
  { id: "calculator", label: "主计算" },
  { id: "wheeler", label: "Wheeler 公式" },
  { id: "nagaoka", label: "Nagaoka 公式" },
  { id: "lookup", label: "系数查表" },
  { id: "integration", label: "积分迭代" },
  { id: "material", label: "几何与材料" },
  { id: "electrical", label: "电气匹配" },
  { id: "cooling", label: "损耗与冷却" },
  { id: "scenarios", label: "工程场景" },
] as const);

function defaultInput() {
  const built = buildBasicCalculatorInput(DEFAULT_BASIC_CALCULATOR_FORM);
  expect(built.status).toBe("success");
  if (built.status !== "success") throw new Error(built.message.en);
  return built.input;
}

function defaultResult() {
  const result = ENGINEERING_UI_APPLICATION.basicMatching.calculate(defaultInput());
  expect(result.valid).toBe(true);
  if (!result.valid) throw new Error(result.error);
  return result;
}

function renderReferencePage(page: Exclude<LegacyBasicPage, "calculator">): string {
  return renderToStaticMarkup(createElement(LegacyReferencePage, {
    application: ENGINEERING_UI_APPLICATION.basicMatching,
    page,
    result: defaultResult(),
    lookupRatio: "3.43333333",
    onLookupRatioChange: () => undefined,
    onSyncLookup: () => undefined,
  }));
}

describe("0.9.1 nine-page matching basic calculator UI", () => {
  it("ships the supplied page's exact 26 default inputs", () => {
    expect(Object.keys(EXPECTED_DEFAULT_FORM)).toHaveLength(26);
    expect(DEFAULT_BASIC_CALCULATOR_FORM).toEqual(EXPECTED_DEFAULT_FORM);
    expect(EMPTY_BASIC_CALCULATOR_FORM).toEqual(EXPECTED_DEFAULT_FORM);

    const built = defaultInput();
    expect(Object.keys(built)).toHaveLength(26);
    expect(built).toEqual(EXPECTED_DEFAULT_INPUT);
    expect(ENGINEERING_UI_APPLICATION.basicMatching.defaultInput).toEqual(
      EXPECTED_DEFAULT_INPUT,
    );
  });

  it("reproduces the exact default geometry, inductance, electrical, material, and cooling outputs", () => {
    const result = defaultResult();
    expect(result.issues).toEqual([]);
    expect(result.inductance.method).toBe("Nagaoka 公式");
    expect(result.inductance.routeLabel).toBe("l / Dm < 0.4");
    expect(result.inductance.knSourceLabel).toBe("Simpson 积分");

    // These are the two eleven-row result tables in display order.
    expect([
      result.inductance.selected,
      result.geometry.outerDiameterMm,
      result.geometry.meanDiameterMm,
      result.geometry.aspectLD,
      result.geometry.fillFactor,
      result.inductance.ideal,
      result.inductance.nagaokaSelectedInductance,
      result.inductance.nagaokaIntegral.inductance,
      result.inductance.tableInductance,
      result.inductance.wheelerSingle,
      result.inductance.wheelerMulti,
      result.material.copperSkinDepthMm,
      result.material.workpieceSkinDepthMm,
      result.electrical.currentA,
      result.electrical.equivalentResistanceOhm,
      result.electrical.equivalentInductanceMicroH,
      result.electrical.coilVoltageV,
      result.electrical.activeVoltageV,
      result.electrical.transformerRatio,
      result.cooling.coilLossKw,
      result.cooling.temperatureRiseC,
      result.cooling.waterFlowLMin,
    ]).toEqual([
      22.263032500473702,
      1060,
      1030,
      0.2912621359223301,
      0.8,
      55.84353764861706,
      22.263032500473702,
      22.263032500473702,
      22.560789210041293,
      21.882235251045486,
      21.94691180843774,
      0.7117625434171772,
      5.738413080613819,
      1825.7418583505537,
      0.03,
      19.09859317102744,
      2190.890230020664,
      54.77225575051661,
      9.36605573333834,
      20,
      20,
      24.401913875598087,
    ]);
    expect({
      k: result.inductance.nagaokaIntegral.k,
      F: result.inductance.nagaokaIntegral.F,
      E: result.inductance.nagaokaIntegral.E,
      kn: result.inductance.nagaokaIntegral.kn,
      tableKn: result.inductance.table.kn,
    }).toEqual({
      k: 0.960104332964071,
      F: 2.6943581474579807,
      E: 1.086371792216054,
      kn: 0.39866801850124256,
      tableKn: 0.404,
    });
  });

  it("renders all nine tabs and preserves the supplied page copy and formula pages", () => {
    expect(LEGACY_BASIC_TABS).toEqual(EXPECTED_TABS);
    const appHtml = renderToStaticMarkup(
      createElement(EngineeringApp, { application: ENGINEERING_UI_APPLICATION }),
    );
    for (const tab of EXPECTED_TABS) expect(appHtml).toContain(`>${tab.label}</button>`);
    for (const text of [
      "感应线圈匹配与电感综合计算器",
      "实时联动",
      "输入参数",
      "输入即计算",
      "自动公式判断",
      "电感与几何",
      "全部方法同步对比",
      "材料、电气与冷却",
      "按 Excel 计算链",
      "常见线圈形态",
      "示例不会修改输入参数",
      "Req 与 Rcu,ac 按原计算表保留为校准输入",
      "计算结果用于工程估算与方案比较；最终设计应结合实测、材料温度特性、邻近效应及电磁仿真复核。",
    ]) expect(appHtml).toContain(text);

    const pageCopy: readonly Readonly<{
      readonly page: Exclude<LegacyBasicPage, "calculator">;
      readonly expected: readonly string[];
    }>[] = [
      { page: "wheeler", expected: [
        "空气芯线圈的工程经验式",
        "L(μH) = r²N² / (9r + 10l)",
        "L(μH) = 0.8r²N² / (6r + 9l + 10t)",
        "自动判断中，仅当 l / Dm ≥ 0.4 时采用 Wheeler",
      ] },
      { page: "nagaoka", expected: [
        "Nagaoka / 长冈系数",
        "有限长螺线管修正",
        "L₀ = Kₙ · μ₀ · N² · πa² / b",
        "Kₙ = { [b√(4a²+b²)/a²][F−E] + [4√(4a²+b²)/b]E − 8a/b } / 3π",
      ] },
      { page: "lookup", expected: [
        "Nagaoka 系数查表",
        "同步主页面",
        "查表参数 2R / l = Dm / l",
        "查表范围外不进行外推",
      ] },
      { page: "integration", expected: [
        "Simpson 数值积分",
        "F(k) = ∫₀^{π/2} [1 − k²sin²θ]⁻¹ᐟ² dθ",
        "收敛检查",
        "相对 n=800",
        "积分节点示例",
      ] },
      { page: "material", expected: [
        "尺寸与填充系数",
        "Dout = D₁ + 2wrad　；　Dm = (D₁ + Dout) / 2",
        "肌肤深度",
        "δ = √[2ρ / (2πf μ₀ μr)]",
      ] },
      { page: "electrical", expected: [
        "电流、等效电感与线圈电压",
        "I = √(P / Req)",
        "Leq = Q · Req / (2πf)",
        "n = krect · ULL / UR",
      ] },
      { page: "cooling", expected: [
        "线圈损耗",
        "Pcu = I² · Rcu,ac",
        "冷却水流量",
        "Qwater = kcool · Pcu / [ρwater · cp · (Tout − Tin)]",
      ] },
      { page: "scenarios", expected: [
        "感应加热炉管与圆柱工件",
        "中频电源与匹配变压器",
        "谐振补偿与参数复核",
        "线圈水冷系统初步选型",
        "由交流铜阻和线圈电流得到铜损，再依据允许温升、比热、密度与安全系数估算所需流量。",
      ] },
    ];
    for (const { page, expected } of pageCopy) {
      const html = renderReferencePage(page);
      for (const text of expected) expect(html).toContain(text);
    }
  });

  it("defines 26 complete help records and routes every field through the accessible HelpTooltip", () => {
    const source = readFileSync(join(UI_ROOT, "BasicCalculator.tsx"), "utf8");
    const definitions = [...source.matchAll(
      /\{ id: "([^"]+)", label: "([^"]+)", description: "([^"]+)", how: "([^"]+)", impact: "([^"]+)"/gu,
    )];
    expect(definitions).toHaveLength(26);
    expect(new Set(definitions.map((match) => match[1]))).toEqual(
      new Set(Object.keys(EXPECTED_DEFAULT_FORM)),
    );
    for (const definition of definitions) {
      expect(definition[2]?.trim().length).toBeGreaterThan(0);
      expect(definition[3]?.trim().length).toBeGreaterThan(0);
      expect(definition[4]?.trim().length).toBeGreaterThan(0);
      expect(definition[5]?.trim().length).toBeGreaterThan(0);
    }
    expect(source).toContain("<HelpTooltip content={help}");
    expect(source).toMatch(/COIL_FIELDS\.filter\(\(field\) => [^)]*\)\.map\(\(field\) => <LegacyField/u);
    for (const group of ["POWER_FIELDS", "MATERIAL_FIELDS", "COOLING_FIELDS"]) {
      expect(source).toContain(`${group}.map((field) => <LegacyField`);
    }
    expect(source).toContain('field.id !== "manualKn" || form.nagaokaSource === "manual"');

    const defaultHtml = renderToStaticMarkup(
      createElement(EngineeringApp, { application: ENGINEERING_UI_APPLICATION }),
    );
    // manualKn is the 26th field and is intentionally hidden until manual mode is selected.
    expect(defaultHtml.match(/class="help-tooltip"/gu) ?? []).toHaveLength(25);
    expect(defaultHtml.match(/aria-describedby="[^"]+-description"/gu) ?? []).toHaveLength(25);
    expect(defaultHtml).toContain("这是什么：");
    expect(defaultHtml).toContain("怎么填写：");
    expect(defaultHtml).toContain("会影响什么：");
  });

  it("round-trips the version 0.9.1 exact-schema form and rejects schema drift", () => {
    expect(BASIC_FORM_FILE_SCHEMA_VERSION).toBe("0.9.1");
    const text = serializeBasicCalculatorForm(
      DEFAULT_BASIC_CALCULATOR_FORM,
      "2026-08-17T00:00:00.000Z",
    );
    const envelope = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(envelope)).toEqual(["kind", "schemaVersion", "savedAt", "form"]);
    expect(envelope).toEqual({
      kind: "induction-coil-matching-basic-form",
      schemaVersion: "0.9.1",
      savedAt: "2026-08-17T00:00:00.000Z",
      form: EXPECTED_DEFAULT_FORM,
    });
    expect(parseBasicCalculatorForm(text)).toEqual({
      status: "success",
      form: EXPECTED_DEFAULT_FORM,
    });

    const form = envelope.form as Record<string, unknown>;
    const invalidEnvelopes: readonly Record<string, unknown>[] = [
      { ...envelope, extra: true },
      { ...envelope, kind: "other-basic-form" },
      { ...envelope, schemaVersion: "0.9.0" },
      { ...envelope, savedAt: "2026-08-17" },
      { ...envelope, form: { ...form, extra: "1" } },
      { ...envelope, form: Object.fromEntries(Object.entries(form).slice(1)) },
      { ...envelope, form: { ...form, coilType: "unknown" } },
      { ...envelope, form: { ...form, nagaokaSource: "unknown" } },
      { ...envelope, form: { ...form, coilLengthMm: "not-a-number" } },
      { ...envelope, form: { ...form, turns: 4 } },
    ];
    for (const invalid of invalidEnvelopes) {
      expect(parseBasicCalculatorForm(JSON.stringify(invalid)).status).toBe("invalid_input");
    }
    expect(parseBasicCalculatorForm("{".repeat(128 * 1024 + 1)).status).toBe("invalid_input");
    expect(() => serializeBasicCalculatorForm(
      DEFAULT_BASIC_CALCULATOR_FORM,
      "2026-08-17",
    )).toThrow(TypeError);
  });

  it("exports exactly 22 friendly result rows plus one CSV header", () => {
    const csv = basicResultCsv(defaultResult(), "zh-CN");
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"分组","结果","数值","单位"');
    expect(lines.slice(1)).toHaveLength(22);
    expect(lines).toHaveLength(23);
    for (const resultName of [
      "推荐空芯电感 L0",
      "线圈外径 Dout",
      "平均直径 Dm",
      "长径比 l/Dm",
      "填充系数 kf",
      "理想螺线管电感",
      "Nagaoka 当前结果",
      "Nagaoka 积分结果",
      "Nagaoka 查表结果",
      "Wheeler 单层",
      "Wheeler 多层",
      "铜管肌肤深度",
      "炉料肌肤深度",
      "感应线圈电流",
      "经验等效电阻",
      "目标等效电感",
      "感应线圈电压",
      "有功电压分量",
      "变压器匝数比",
      "线圈损耗",
      "冷却温升",
      "冷却水流量",
    ]) expect(csv).toContain(`"${resultName}"`);
    expect(csv).not.toMatch(/methodId|sourceRef|snapshot|fingerprint|hash|SHA-?256|ADR-|\b[A-J]-\d{2}\b/iu);
  });

  it("keeps the compatibility calculator local and avoids HTML injection escape hatches", () => {
    const source = [
      join(UI_ROOT, "BasicCalculator.tsx"),
      join(UI_ROOT, "basic-matching", "LegacyReferencePages.tsx"),
      join(UI_ROOT, "basic-matching", "LegacyCoilCanvas.tsx"),
      join(process.cwd(), "src", "application", "legacyBasicCalculator.ts"),
    ].map((path) => readFileSync(path, "utf8")).join("\n");
    expect(source).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|navigator\.sendBeacon|https?:\/\//u);
    expect(source).not.toContain("innerHTML");
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});
