import { useId, useRef, useState, type ChangeEvent } from "react";

import { Parametric3DViewer, type ParametricSceneView } from "../visualization/index.js";
import { HelpTooltip } from "./HelpTooltip.js";
import { useUiLanguage, type FieldHelpContent, type UiLanguage } from "./i18n.js";
import type {
  EngineeringUiApplication,
  UiMechanicalVisualizationInput,
} from "./ui-model.js";

interface LocalizedText {
  readonly zh: string;
  readonly en: string;
}

type MechanicalFormKey = Exclude<keyof UiMechanicalVisualizationInput, "snapshotCreatedAt">;

export type MechanicalVisualizationFormState = Readonly<Record<MechanicalFormKey, string>>;

export const EMPTY_MECHANICAL_VISUALIZATION_FORM: MechanicalVisualizationFormState = Object.freeze({
  declaredValidDigits: "",
  workpieceOuterDiameterMm: "",
  workpieceInnerDiameterMm: "",
  workpieceActiveLengthMm: "",
  insulationInnerDiameterMm: "",
  insulationOuterDiameterMm: "",
  radialGapMm: "",
  coilInnerDiameterMm: "",
  coilOuterDiameterMm: "",
  coilMeanDiameterMm: "",
  coilWindingEnvelopeLengthMm: "",
  helixRevolutionCount: "",
  helixAxialAdvanceMm: "",
  leadLengthMm: "",
  conductorRadialSizeMm: "",
  conductorOuterDiameterMm: "",
  conductorInnerDiameterMm: "",
});

interface VisualizationFieldSpec {
  readonly id: MechanicalFormKey;
  readonly group: "precision" | "workpiece" | "insulation" | "coil" | "conductor";
  readonly label: LocalizedText;
  readonly what: LocalizedText;
  readonly how: LocalizedText;
  readonly impact: LocalizedText;
  readonly unit: LocalizedText;
}

const SAME_GEOMETRY_IMPACT: LocalizedText = {
  zh: "会改变三维示意图的尺寸和部件相对位置；它不直接执行电磁、热或结构计算。",
  en: "It changes schematic dimensions and component placement; it does not run an electromagnetic, thermal, or structural calculation.",
};

const VISUALIZATION_FIELDS: readonly VisualizationFieldSpec[] = Object.freeze([
  {
    id: "declaredValidDigits",
    group: "precision",
    label: { zh: "本组尺寸的保守有效位数", en: "Conservative significant digits for this dimension set" },
    what: { zh: "表示本组机械测量中可以可信保留的最少有效数字位数。", en: "The fewest trustworthy significant digits among this set of mechanical measurements." },
    how: { zh: "按本组测量中最不精确的一项填写 1 至 17 的整数；不要按显示小数位数夸大精度。", en: "Enter an integer from 1 to 17 based on the least precise measurement; do not claim precision from display decimals." },
    impact: { zh: "只记录这组几何数据的保守精度，不会改变任何已填写尺寸值。", en: "It records conservative geometry precision and never changes a dimension value." },
    unit: { zh: "位", en: "digits" },
  },
  {
    id: "workpieceOuterDiameterMm",
    group: "workpiece",
    label: { zh: "工件 / 炉管外径", en: "Workpiece / furnace-tube outer diameter" },
    what: { zh: "三维图中最内侧工件或炉管的外表面直径。", en: "Outer-surface diameter of the innermost workpiece or furnace tube." },
    how: { zh: "在圆截面处量取外径；非圆工件不应强行套用本同轴圆管示意。", en: "Measure the circular outside diameter; do not force a non-circular workpiece into this coaxial schematic." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "workpieceInnerDiameterMm",
    group: "workpiece",
    label: { zh: "工件 / 炉管内径", en: "Workpiece / furnace-tube inner diameter" },
    what: { zh: "工件或炉管中心孔的直径；实心工件没有中心孔。", en: "Diameter of the central bore; a solid workpiece has no bore." },
    how: { zh: "空心件量取内径；实心工件明确填写 0。该值必须小于外径。", en: "Measure the bore for a hollow part; explicitly enter 0 for a solid part. It must be below the outer diameter." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "workpieceActiveLengthMm",
    group: "workpiece",
    label: { zh: "工件有效长度", en: "Workpiece active length" },
    what: { zh: "三维图中工件或炉管沿线圈轴线显示的长度。", en: "Displayed axial length of the workpiece or furnace tube." },
    how: { zh: "按本次需要观察的有效圆柱段，从图纸或实物沿轴线量取。", en: "Measure the relevant cylindrical section along the axis from the drawing or equipment." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "insulationInnerDiameterMm",
    group: "insulation",
    label: { zh: "保温层内径", en: "Insulation inner diameter" },
    what: { zh: "保温层靠近工件一侧的内表面直径。", en: "Inside diameter of the insulation nearest the workpiece." },
    how: { zh: "按保温层成品内表面量取；不得小于工件或炉管外径。", en: "Measure the finished insulation inner surface; it must not be below the workpiece outer diameter." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "insulationOuterDiameterMm",
    group: "insulation",
    label: { zh: "保温层外径", en: "Insulation outer diameter" },
    what: { zh: "保温层朝向线圈一侧的外表面直径。", en: "Outside diameter of the insulation facing the coil." },
    how: { zh: "按保温层成品外表面量取；必须大于保温层内径。", en: "Measure the finished outer surface; it must exceed the insulation inner diameter." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "radialGapMm",
    group: "insulation",
    label: { zh: "线圈与保温层单边径向间隙", en: "Single-sided radial coil-to-insulation gap" },
    what: { zh: "保温层外表面到线圈内表面的单边净空。", en: "One-sided clearance from insulation outer surface to coil inner surface." },
    how: { zh: "按（线圈内径 − 保温层外径）÷ 2 核对并填写。", en: "Enter and verify (coil inner diameter − insulation outer diameter) ÷ 2." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "coilInnerDiameterMm",
    group: "coil",
    label: { zh: "线圈机械内径", en: "Coil mechanical inner diameter" },
    what: { zh: "线圈相对两侧导体内表面之间的最小直径。", en: "Minimum diameter between inner conductor surfaces on opposite sides of the coil." },
    how: { zh: "从机械图纸或实物内表面量取，并与保温层外径和单边间隙核对。", en: "Measure between inner surfaces and check it against insulation diameter and radial clearance." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "coilOuterDiameterMm",
    group: "coil",
    label: { zh: "线圈机械外径", en: "Coil mechanical outer diameter" },
    what: { zh: "线圈相对两侧导体外表面之间的最大直径。", en: "Maximum diameter between outer conductor surfaces on opposite sides of the coil." },
    how: { zh: "应等于线圈内径加两倍导体径向外形尺寸。", en: "It must equal coil inner diameter plus twice the conductor radial size." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "coilMeanDiameterMm",
    group: "coil",
    label: { zh: "线圈机械中心线直径", en: "Coil mechanical centre-line diameter" },
    what: { zh: "螺旋导体中心线形成的圆柱直径。", en: "Diameter of the cylinder traced by the helical conductor centre line." },
    how: { zh: "应等于（线圈内径 + 线圈外径）÷ 2。", en: "It must equal (coil inner diameter + coil outer diameter) ÷ 2." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "coilWindingEnvelopeLengthMm",
    group: "coil",
    label: { zh: "线圈轴向总高度", en: "Full axial coil height" },
    what: { zh: "沿线圈轴线，从第一圈导体外缘到最后一圈导体外缘的总高度。", en: "Total axial height from the first conductor outer edge to the last conductor outer edge." },
    how: { zh: "应等于螺旋中心路径轴向前进量加圆管导体外径。", en: "It must equal helix centre-path axial advance plus tube outer diameter." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "helixRevolutionCount",
    group: "coil",
    label: { zh: "螺旋导体实际圈数", en: "Actual helix revolution count" },
    what: { zh: "导体中心路径绕线圈轴线旋转的实际圈数，可为小数圈。", en: "Actual centre-path revolutions about the coil axis; fractional turns are allowed." },
    how: { zh: "沿实际导体中心路径计数；不要把并联支路数或电气抽头数混入。交互查看器最多显示 128 圈。", en: "Count along the actual centre path; exclude parallel branches and taps. The interactive viewer supports up to 128 turns." },
    impact: { zh: "决定螺旋线的旋转次数和三维绘制复杂度，不在此页计算电感。", en: "It sets helix revolutions and rendering complexity; this page does not calculate inductance." },
    unit: { zh: "圈", en: "turns" },
  },
  {
    id: "helixAxialAdvanceMm",
    group: "coil",
    label: { zh: "螺旋中心路径轴向前进量", en: "Helix centre-path axial advance" },
    what: { zh: "第一圈与最后一圈导体中心之间沿轴线的距离。", en: "Axial distance between the first and last conductor centres." },
    how: { zh: "用末端中心轴向坐标减去起点中心坐标，并与线圈轴向总高度核对。", en: "Subtract start-centre axial position from end-centre position and check against full coil height." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "leadLengthMm",
    group: "conductor",
    label: { zh: "引线与母排总路径长度", en: "Total lead and bus path length" },
    what: { zh: "螺旋段两端之外、需要在示意图中表示的引线与母排中心路径总长。", en: "Total centre-path length of leads and bus outside both helix ends." },
    how: { zh: "沿中心路径逐段量取并求和；确认不显示引线时明确填写 0。方向仅作示意。", en: "Measure and sum centre-line segments; explicitly enter 0 when no lead is shown. Direction remains schematic." },
    impact: { zh: "只改变引线路径示意和总显示长度，不用于此页的阻抗或热分析。", en: "It changes the illustrative lead route only and is not used here for impedance or thermal analysis." },
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "conductorRadialSizeMm",
    group: "conductor",
    label: { zh: "导体径向外形尺寸", en: "Conductor radial outside size" },
    what: { zh: "单根圆管导体沿线圈半径方向占用的外形尺寸。", en: "Outside size occupied by one round tube in the coil radial direction." },
    how: { zh: "当前只支持圆管导体，因此应与圆管导体外径相同。", en: "Only round tube is supported, so this must equal tube outer diameter." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "conductorOuterDiameterMm",
    group: "conductor",
    label: { zh: "圆管导体外径", en: "Round-tube conductor outer diameter" },
    what: { zh: "空心水冷圆管导体的外表面直径。", en: "Outside diameter of the hollow water-cooled round-tube conductor." },
    how: { zh: "在无明显变形的截面量取外径，并与导体径向外形尺寸填写相同数值。", en: "Measure an undeformed section and use the same value as conductor radial size." },
    impact: SAME_GEOMETRY_IMPACT,
    unit: { zh: "mm", en: "mm" },
  },
  {
    id: "conductorInnerDiameterMm",
    group: "conductor",
    label: { zh: "圆管冷却水孔内径", en: "Round-tube coolant-bore diameter" },
    what: { zh: "水冷圆管内部实际通水孔的直径。", en: "Actual internal coolant-bore diameter of the round tube." },
    how: { zh: "按管材内径或可靠图纸填写，必须大于 0 且小于导体外径。", en: "Use the tube bore or a reliable drawing; it must be above 0 and below tube outer diameter." },
    impact: { zh: "改变冷却水通道的三维粗细；此页不据此计算流量或换热能力。", en: "It changes the displayed coolant passage; this page does not calculate flow or cooling capacity." },
    unit: { zh: "mm", en: "mm" },
  },
]);

export type MechanicalVisualizationInputBuildResult =
  | { readonly status: "success"; readonly input: UiMechanicalVisualizationInput }
  | { readonly status: "invalid_input"; readonly message: LocalizedText };

function local(value: LocalizedText, language: UiLanguage): string {
  return language === "zh-CN" ? value.zh : value.en;
}

export function buildMechanicalVisualizationInput(
  state: MechanicalVisualizationFormState,
  snapshotCreatedAt: string,
): MechanicalVisualizationInputBuildResult {
  const values = Object.fromEntries(
    VISUALIZATION_FIELDS.map((field) => {
      const raw = state[field.id].trim();
      return [field.id, raw.length === 0 ? Number.NaN : Number(raw)];
    }),
  ) as Record<MechanicalFormKey, number>;
  if (Object.values(values).some((value) => !Number.isFinite(value))) {
    return {
      status: "invalid_input",
      message: {
        zh: "请完整填写全部机械尺寸、圈数和保守有效位数，并检查所示单位。",
        en: "Complete every dimension, turn count, and conservative significant-digit field in the displayed units.",
      },
    };
  }
  if (!Number.isSafeInteger(values.declaredValidDigits) || values.declaredValidDigits < 1 || values.declaredValidDigits > 17) {
    return {
      status: "invalid_input",
      message: { zh: "保守有效位数必须是 1 至 17 的整数。", en: "Conservative significant digits must be an integer from 1 to 17." },
    };
  }
  const parsedTime = new Date(snapshotCreatedAt);
  if (Number.isNaN(parsedTime.getTime()) || parsedTime.toISOString() !== snapshotCreatedAt) {
    return {
      status: "invalid_input",
      message: { zh: "无法建立本次三维输入的规范时间。", en: "A canonical timestamp could not be established for this 3D input." },
    };
  }
  return {
    status: "success",
    input: {
      snapshotCreatedAt,
      declaredValidDigits: values.declaredValidDigits,
      workpieceOuterDiameterMm: values.workpieceOuterDiameterMm,
      workpieceInnerDiameterMm: values.workpieceInnerDiameterMm,
      workpieceActiveLengthMm: values.workpieceActiveLengthMm,
      insulationInnerDiameterMm: values.insulationInnerDiameterMm,
      insulationOuterDiameterMm: values.insulationOuterDiameterMm,
      radialGapMm: values.radialGapMm,
      coilInnerDiameterMm: values.coilInnerDiameterMm,
      coilOuterDiameterMm: values.coilOuterDiameterMm,
      coilMeanDiameterMm: values.coilMeanDiameterMm,
      coilWindingEnvelopeLengthMm: values.coilWindingEnvelopeLengthMm,
      helixRevolutionCount: values.helixRevolutionCount,
      helixAxialAdvanceMm: values.helixAxialAdvanceMm,
      leadLengthMm: values.leadLengthMm,
      conductorRadialSizeMm: values.conductorRadialSizeMm,
      conductorOuterDiameterMm: values.conductorOuterDiameterMm,
      conductorInnerDiameterMm: values.conductorInnerDiameterMm,
    },
  };
}

function VisualizationField({
  field,
  value,
  onChange,
}: {
  readonly field: VisualizationFieldSpec;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const { language, text } = useUiLanguage();
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const label = local(field.label, language);
  const help: FieldHelpContent = {
    what: local(field.what, language),
    how: local(field.how, language),
    impact: local(field.impact, language),
  };
  return (
    <div className="visualization-field">
      <div className="visualization-field__heading">
        <label htmlFor={inputId}>{label}<span aria-label={text("必填", "required")} className="required-mark"> *</span></label>
        <span className="visualization-field__unit">{local(field.unit, language)}</span>
        <HelpTooltip content={help} descriptionId={descriptionId} fieldLabel={label} />
      </div>
      <input aria-describedby={descriptionId} id={inputId} onChange={(event) => onChange(event.currentTarget.value)} step="any" type="number" value={value} />
      <p>{local(field.what, language)}</p>
    </div>
  );
}

interface VisualizationFailure {
  readonly message: string;
  readonly code: string | null;
  readonly missing: readonly string[];
}

const GROUPS: readonly Readonly<{ readonly id: VisualizationFieldSpec["group"]; readonly title: LocalizedText }>[] = [
  { id: "precision", title: { zh: "数据精度", en: "Data precision" } },
  { id: "workpiece", title: { zh: "工件 / 炉管", en: "Workpiece / Furnace Tube" } },
  { id: "insulation", title: { zh: "保温层与空气隙", en: "Insulation and Air Gap" } },
  { id: "coil", title: { zh: "线圈主体", en: "Coil Body" } },
  { id: "conductor", title: { zh: "空心导体与引线", en: "Hollow Conductor and Leads" } },
];

export function ThreeDVisualizationPage({ application }: { readonly application: EngineeringUiApplication }) {
  const { language, text } = useUiLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MechanicalVisualizationFormState>(EMPTY_MECHANICAL_VISUALIZATION_FORM);
  const [scene, setScene] = useState<ParametricSceneView | null>(null);
  const [sceneTitle, setSceneTitle] = useState<string | null>(null);
  const [failure, setFailure] = useState<VisualizationFailure | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);

  function update(fieldId: MechanicalFormKey, value: string): void {
    setForm((current) => ({ ...current, [fieldId]: value }));
    setScene(null);
    setSceneTitle(null);
    setFailure(null);
  }

  function generate(): void {
    const built = buildMechanicalVisualizationInput(form, new Date().toISOString());
    if (built.status !== "success") {
      setFailure({ message: local(built.message, language), code: null, missing: [] });
      setScene(null);
      return;
    }
    const result = application.visualization.buildFromMechanicalInput(built.input);
    if (result.status !== "success") {
      setFailure({ message: language === "zh-CN" ? result.messageZh : result.messageEn, code: result.errorCode, missing: [] });
      setScene(null);
      return;
    }
    setScene(result.scene);
    setSceneTitle(text("当前机械尺寸生成的三维示意", "3D schematic from current mechanical dimensions"));
    setFailure(null);
  }

  function reset(): void {
    setForm(EMPTY_MECHANICAL_VISUALIZATION_FORM);
    setScene(null);
    setSceneTitle(null);
    setFailure(null);
  }

  async function loadCase(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;
    setLoadingCase(true);
    setFailure(null);
    try {
      const result = application.visualization.loadCase(await file.text());
      if (result.status !== "success") {
        setScene(null);
        setSceneTitle(null);
        setFailure({
          message: language === "zh-CN" ? result.messageZh : result.messageEn,
          code: result.errorCode,
          missing: result.missingInputsZh,
        });
        return;
      }
      setScene(result.scene);
      setSceneTitle(text(`方案“${result.caseName}”的三维示意`, `3D schematic for case “${result.caseName}”`));
    } catch {
      setScene(null);
      setSceneTitle(null);
      setFailure({ message: text("无法读取所选方案文件。", "The selected case file could not be read."), code: "file_read_failed", missing: [] });
    } finally {
      setLoadingCase(false);
    }
  }

  return (
    <section aria-labelledby="visualization-title" className="page visualization-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{text("0.9 测试版 · 参数化机械视图", "Version 0.9 · parametric mechanical view")}</p>
          <h1 id="visualization-title">{text("3D 示意 / FEM", "3D Schematic / FEM")}</h1>
          <p className="page-header__description">{text("用明确机械尺寸生成可旋转、缩放和剖切的线圈结构示意，或从兼容方案文件加载几何。此页面不执行 FEM 求解。", "Build a rotatable, zoomable, cutaway coil schematic from explicit mechanical dimensions, or load compatible case geometry. This page does not run a FEM solver.")}</p>
        </div>
        <div className="page-header__actions">
          <input accept=".json,application/json" aria-label={text("加载方案文件生成三维示意", "Load a case file for 3D schematic")} className="sr-only" onChange={(event) => { void loadCase(event); }} ref={fileRef} type="file" />
          <button className="button button--secondary" disabled={loadingCase} onClick={() => fileRef.current?.click()} type="button">{loadingCase ? text("正在加载…", "Loading…") : text("从方案文件加载", "Load case file")}</button>
          <button className="button button--secondary" onClick={reset} type="button">{text("清空重填", "Reset")}</button>
          <button className="button button--primary" onClick={generate} type="button">{text("生成 3D 示意", "Build 3D schematic")}</button>
        </div>
      </header>

      <div className="scope-banner visualization-watermark-banner" role="note"><strong>{text("示意图 · 非 FEM 场", "Schematic · Not a FEM field")}</strong><span>{text("颜色、透明度、剖切和引线方向只用于识别机械几何，不代表温度、电磁场、应力、求解精度或工程合格结论。", "Colour, opacity, cutaway, and lead direction identify mechanical geometry only; they do not represent temperature, electromagnetic field, stress, solver accuracy, or acceptance.")}</span></div>

      {failure === null ? null : (
        <div className="message message--error" role="alert">
          <strong>{text("无法生成三维示意", "3D schematic could not be built")}</strong><p>{failure.message}</p>
          {failure.missing.length === 0 ? null : <><p>{text("还需要以下机械尺寸：", "The following mechanical dimensions are still required:")}</p><ul>{failure.missing.map((item) => <li key={item}>{item}</li>)}</ul></>}
          {failure.code === null ? null : <details><summary>{text("故障详情", "Fault detail")}</summary><code>{failure.code}</code></details>}
        </div>
      )}

      <section aria-labelledby="visualization-input-title" className="data-panel visualization-input-panel">
        <div className="panel-heading"><div><p className="eyebrow">{text("显式机械输入", "Explicit mechanical input")}</p><h2 id="visualization-input-title">{text("三维尺寸", "3D Dimensions")}</h2></div><span className="text-badge">{text("不推断缺失尺寸", "No inferred dimensions")}</span></div>
        <div className="visualization-relations" role="note"><strong>{text("填写前请核对 5 个关系", "Check five relationships before building")}</strong><ul><li>{text("线圈外径 = 线圈内径 + 2 × 导体径向外形尺寸", "Coil outer diameter = coil inner diameter + 2 × conductor radial size")}</li><li>{text("线圈中心线直径 =（线圈内径 + 线圈外径）÷ 2", "Coil centre-line diameter = (inner + outer diameter) ÷ 2")}</li><li>{text("圆管导体外径 = 导体径向外形尺寸", "Tube outer diameter = conductor radial size")}</li><li>{text("单边径向间隙 =（线圈内径 − 保温层外径）÷ 2", "Single-sided radial gap = (coil inner − insulation outer diameter) ÷ 2")}</li><li>{text("线圈轴向总高度 = 螺旋中心路径轴向前进量 + 圆管导体外径", "Full coil height = helix centre-path axial advance + tube outer diameter")}</li></ul></div>
        {GROUPS.map((group) => <section className="visualization-field-group" key={group.id}><h3>{local(group.title, language)}</h3><div className="visualization-field-grid">{VISUALIZATION_FIELDS.filter((field) => field.group === group.id).map((field) => <VisualizationField field={field} key={field.id} onChange={(value) => update(field.id, value)} value={form[field.id]} />)}</div></section>)}
      </section>

      <section aria-labelledby="visualization-view-title" className="visualization-view-panel">
        <div className="calculator-section-heading"><div><p className="eyebrow">{text("交互视图", "Interactive view")}</p><h2 id="visualization-view-title">{sceneTitle ?? text("三维示意", "3D Schematic")}</h2></div><p>{scene === null ? text("完整填写尺寸并生成，或加载兼容方案文件。", "Complete the dimensions and build, or load a compatible case file.") : text("可旋转、缩放、剖切并选择部件查看尺寸。", "Rotate, zoom, cut away, and select components to inspect dimensions.")}</p></div>
        {scene === null ? <div className="empty-state" role="status"><span aria-hidden="true" className="empty-state__glyph">3D</span><div><strong>{text("尚无三维示意", "No 3D schematic yet")}</strong><p>{text("每个问号都说明尺寸含义、测量方法和对示意图的影响。", "Every question mark explains the dimension, how to measure it, and what it affects.")}</p></div></div> : <div className="visualization-viewer-shell"><Parametric3DViewer height={560} language={language} scene={scene} /><ul className="visualization-limitations">{scene.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      </section>

      <section aria-labelledby="fem-reference-title" className="data-panel fem-boundary-panel"><div className="panel-heading"><div><p className="eyebrow">{text("外部分析边界", "External analysis boundary")}</p><h2 id="fem-reference-title">{text("外部 FEM 结果", "External FEM Results")}</h2></div><span className="text-badge">{text("几何示意与场结果分离", "Geometry and fields remain separate")}</span></div><p>{text("本测试版只在此页显示参数化机械几何。外部 FEM 结果必须连同实际结果文件和文件完整性证据一起校验；单独导入一份说明文件不足以生成或认可场图，因此本页不会把机械示意伪装成 FEM 结果。", "This test release shows parametric mechanical geometry only. External FEM results require the actual result files and file-integrity evidence; a description file alone cannot create or admit a field plot, so this page never presents the schematic as FEM output.")}</p></section>
    </section>
  );
}
