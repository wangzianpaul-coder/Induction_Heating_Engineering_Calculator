import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UiLanguage = "zh-CN" | "en";

export const DEFAULT_UI_LANGUAGE: UiLanguage = "zh-CN";
export const UI_LANGUAGE_STORAGE_KEY = "ih-engineering-calculator.ui-language";

interface UiLanguageContextValue {
  readonly language: UiLanguage;
  readonly setLanguage: (language: UiLanguage) => void;
  readonly text: (zh: string, en: string) => string;
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

export function parseStoredUiLanguage(value: string | null): UiLanguage {
  return value === "en" || value === "zh-CN" ? value : DEFAULT_UI_LANGUAGE;
}

function readStoredUiLanguage(): UiLanguage {
  if (typeof window === "undefined") return DEFAULT_UI_LANGUAGE;
  try {
    return parseStoredUiLanguage(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

export function uiText(language: UiLanguage, zh: string, en: string): string {
  return language === "zh-CN" ? zh : en;
}

export function UiLanguageProvider({
  children,
  initialLanguage,
}: {
  readonly children: ReactNode;
  readonly initialLanguage?: UiLanguage;
}) {
  const [language, setLanguage] = useState<UiLanguage>(() => initialLanguage ?? readStoredUiLanguage());

  useEffect(() => {
    document.documentElement.lang = language === "zh-CN" ? "zh-Hans" : "en";
    try {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Storage can be unavailable for a local file or hardened browser. The in-memory preference remains valid.
    }
  }, [language]);

  const value = useMemo<UiLanguageContextValue>(() => ({
    language,
    setLanguage,
    text: (zh, en) => uiText(language, zh, en),
  }), [language]);

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage(): UiLanguageContextValue {
  const value = useContext(UiLanguageContext);
  if (value === null) throw new Error("UiLanguageProvider is missing.");
  return value;
}

const CONTROLLED_VALUE_ZH: Readonly<Record<string, string>> = Object.freeze({
  active: "有效",
  all: "全部",
  analytical: "解析方法",
  approved: "已批准",
  approved_with_limitation: "有限制批准",
  available: "可用",
  conditionally_eligible: "有条件可推荐",
  deferred: "已延期",
  deprecated: "已弃用",
  draft: "草案",
  enabled: "已启用",
  eligible: "可推荐",
  empirical_calibrated: "经验校准方法",
  engineering_approximation: "工程近似",
  engineering_correlation: "工程关联式",
  execution_ready: "可执行",
  fem_or_experiment_recommended: "建议采用 FEM 或试验",
  fem_or_experiment_reference: "FEM 或试验参考",
  gated: "受门禁限制",
  high: "高",
  in_domain: "适用",
  insufficient_evidence: "证据不足",
  invalid_input: "输入无效",
  measurement_identified: "测量辨识方法",
  needs_verification: "需要验证",
  not_eligible: "不可推荐",
  insufficient_data: "数据不足",
  not_applicable: "不适用",
  not_evaluated: "未评估",
  numerical: "数值方法",
  out_of_domain: "超出适用域",
  reference_only: "仅供参考",
  rejected: "已拒绝",
  release_gated: "受发布门禁限制",
  retired: "已退役",
  runtime_executable: "运行时可执行",
  success: "计算成功",
  success_with_warnings: "成功但有警告",
  superseded: "已被替代",
  unavailable: "不可用",
  validated: "已验证",
});

export function controlledValueLabel(value: string, language: UiLanguage): string {
  if (language === "en") return value.replaceAll("_", " ");
  return CONTROLLED_VALUE_ZH[value] ?? value.replaceAll("_", " ");
}

export function yesNoLabel(value: boolean, language: UiLanguage): string {
  return uiText(language, value ? "是" : "否", value ? "Yes" : "No");
}

/** Internal identifiers remain valid application keys but are never public copy. */
export function publicFacingText(value: string, language: UiLanguage): string {
  if (language === "zh-CN") {
    return value
      .replaceAll("ADR-0003", "统一的绕组长度口径")
      .replaceAll("B-01", "线圈几何记录")
      .replaceAll("B-02", "线圈填充计算")
      .replaceAll("B-03", "理想螺线管计算")
      .replaceAll("D-01", "导体路径计算")
      .replaceAll("D-02", "圆形流道几何记录")
      .replaceAll("D-03", "直流电阻计算")
      .replaceAll("D-04", "铜导体趋肤深度计算")
      .replaceAll("D-07", "线圈阻抗计算")
      .replaceAll("F-01", "等效参数计算")
      .replaceAll("F-02", "同工况实测方法")
      .replaceAll("H-01", "冷却热负荷计算")
      .replaceAll("H-03", "冷却支路流速计算")
      .replaceAll("J-03", "表面热辐射计算")
      .replaceAll(/\b[A-J]-\d{2}\b/gu, "相应的受控计算")
      .replaceAll(/\bADR-\d+\b/gu, "相应的设计约定")
      .replaceAll("CaseSnapshot", "当前方案记录")
      .replaceAll(/Phase\s+\d+[A-Z]?/gu, "当前版本")
      .replaceAll("CalculationResult/Trace", "完整计算记录")
      .replaceAll("CalculationResult", "完整计算记录")
      .replaceAll("Trace", "计算过程")
      .replaceAll("MVP", "测试版")
      .replaceAll("正式方法注册表", "内部验证状态")
      .replaceAll("方法注册表", "方法目录")
      .replaceAll("注册表", "目录")
      .replaceAll(/(?:快照|溯源)\s*IDs?/giu, "记录")
      .replaceAll(/(?:内容寻址)?指纹/gu, "记录")
      .replaceAll(/SHA-?256|哈希值|散列值/giu, "校验记录")
      .replaceAll(/\bsnapshots?\b/giu, "记录")
      .replaceAll(/\bprovenance\b/giu, "来源记录")
      .replaceAll(/\bIDs?\b/giu, "名称");
  }
  return value
    .replaceAll("CaseSnapshot", "case record")
    .replaceAll("ADR-0003", "the consistent full-winding-length convention")
    .replaceAll(/\bB-0[123]\b/gu, "the corresponding coil-geometry calculation")
    .replaceAll(/\bD-0[12347]\b/gu, "the corresponding conductor calculation")
    .replaceAll(/\bF-0[12]\b/gu, "the corresponding equivalent-circuit calculation")
    .replaceAll(/\bH-0[123]\b/gu, "the corresponding cooling calculation")
    .replaceAll(/\bJ-0[123]\b/gu, "the corresponding heat-transfer calculation")
    .replaceAll(/\b[A-J]-\d{2}\b/gu, "the corresponding controlled calculation")
    .replaceAll(/\bADR-\d+\b/gu, "the corresponding design convention")
    .replaceAll(/Phase\s+\d+[A-Z]?/gu, "this release")
    .replaceAll(/formal method-registry/giu, "internal validation")
    .replaceAll(/method registry/giu, "calculation catalogue")
    .replaceAll(/\bMVP\b/gu, "test release")
    .replaceAll(/\b(?:snapshot|provenance)\s+IDs?\b/giu, "record")
    .replaceAll(/(?:content-addressed\s+)?fingerprints?/giu, (match) => /s$/iu.test(match) ? "evidence records" : "evidence record")
    .replaceAll(/content-addressed/giu, "verified")
    .replaceAll(/SHA-?256|\bhash(?:es)?\b/giu, (match) => /(?:s|es)$/iu.test(match) ? "verification records" : "verification record")
    .replaceAll(/\bsnapshots?\b/giu, (match) => /s$/iu.test(match) ? "records" : "record")
    .replaceAll(/\bprovenance\b/giu, "source record")
    .replaceAll(/\bIDs?\b/giu, (match) => /s$/iu.test(match) ? "names" : "name");
}

const MODULE_LABELS: Readonly<Record<string, Readonly<{ readonly zh: string; readonly en: string }>>> = Object.freeze({
  A: { zh: "材料与物性", en: "Materials and properties" },
  B: { zh: "线圈几何与电感", en: "Coil geometry and inductance" },
  C: { zh: "电磁场与工件", en: "Electromagnetic field and workpiece" },
  D: { zh: "导体与线圈电气参数", en: "Conductor and coil electrical parameters" },
  E: { zh: "频率与穿透深度", en: "Frequency and penetration depth" },
  F: { zh: "耦合与阻抗匹配", en: "Coupling and impedance matching" },
  G: { zh: "电源与谐振回路", en: "Power supply and resonant circuit" },
  H: { zh: "冷却水与热负荷", en: "Cooling water and heat load" },
  I: { zh: "绝缘与耐压", en: "Insulation and voltage withstand" },
  J: { zh: "传热与温升", en: "Heat transfer and temperature rise" },
});

export function moduleLabel(moduleId: string, language: UiLanguage): string {
  const label = MODULE_LABELS[moduleId];
  return label === undefined
    ? uiText(language, "工程计算", "Engineering calculation")
    : uiText(language, label.zh, label.en);
}

const CAPABILITY_LABEL_ZH: Readonly<Record<string, string>> = Object.freeze({
  parameters: "参数定义",
  "method-readiness": "方法就绪状态",
  "case-inspector": "方案文件检查",
  results: "计算结果",
  "material-comparison": "材料比较",
  "geometry-3d": "三维几何",
  "calculation-trace": "计算追踪",
  "engineering-report": "工程报告",
});

const CAPABILITY_REASON_ZH: Readonly<Record<string, string>> = Object.freeze({
  parameters: "可在只读页面查询参数含义和单位。",
  "method-readiness": "可查看当前已经能够计算的功能、用途和适用范围。",
  "case-inspector": "可在不修改、不计算的前提下验证并检查方案文件。",
  results: "可以生成当前已验证计算功能的工程结果。",
  "material-comparison": "尚无满足正式比较合同和等价边界要求的方法组合。",
  "geometry-3d": "可用明确尺寸或已保存方案查看三维示意几何；网页不执行电磁或热流体有限元求解。",
  "calculation-trace": "当前页面保留结果、警告和依据，不展示内部追踪记录。",
  "engineering-report": "当前版本提供计算结果查看与方案保存，不生成正式签署报告。",
});

const CAPABILITY_REASON_EN: Readonly<Record<string, string>> = Object.freeze({
  parameters: "Review parameter meanings, units, and input guidance.",
  "method-readiness": "Review calculations that are currently available, together with their purpose and applicability.",
  "case-inspector": "Validate and inspect a saved case without changing or calculating it.",
  results: "Produce engineering results from the calculations enabled in this test release.",
  "material-comparison": "No calculation set currently meets the complete comparison and equivalent-boundary requirements.",
  "geometry-3d": "View schematic 3D geometry from explicit dimensions or a saved case; the webpage does not run an electromagnetic or thermal-fluid FEM solver.",
  "calculation-trace": "Results, warnings, and sources are shown without exposing internal trace records.",
  "engineering-report": "This test release shows results and saves cases but does not issue a signed engineering report.",
});

export function capabilityLabel(id: string, fallback: string, language: UiLanguage): string {
  return language === "zh-CN" ? CAPABILITY_LABEL_ZH[id] ?? fallback : fallback;
}

export function capabilityReason(id: string, fallback: string, language: UiLanguage): string {
  const value = language === "zh-CN"
    ? CAPABILITY_REASON_ZH[id] ?? fallback
    : CAPABILITY_REASON_EN[id] ?? fallback;
  return publicFacingText(value, language);
}

const METHOD_PURPOSE_ZH: Readonly<Record<string, string>> = Object.freeze({
  "B-02": "计算满足明确几何条件的单层线圈轴向填充系数。",
  "B-03": "在空气或显式均匀介质中，按长螺线管近似计算理想螺线管电感。",
  "D-01": "计算圆柱螺旋导体中心路径长度，并明确处理引线和母排边界。",
  "D-03": "使用显式、同状态的电阻率和导体边界计算直流电阻。",
  "D-04": "使用同一铜材工况下的电阻率和相对磁导率，计算电磁场幅值衰减到 1/e 的趋肤深度；该结果不代表热影响深度。",
  "D-07": "由同一串联端口、同一状态下的 R、L、I 和频率计算电气参数。",
  "F-01": "由同一状态和参考边界下的双绕组 R、L、M 参数计算耦合线圈等效电气量。",
  "H-01": "汇总一个完整、不重叠的线圈冷却回路热负荷。",
  "H-02": "由明确热负荷、进出口状态及同状态冷却液属性计算所需质量流量和体积流量。",
  "H-03": "由单支路流量和经验证的 D-02 几何计算流速与水力直径。",
  "J-03": "计算表面对大环境，或长同心双灰体表面之间的净辐射换热功率。",
});

const METHOD_NAME_ZH: Readonly<Record<string, string>> = Object.freeze({
  "B-02": "线圈轴向填充系数",
  "B-03": "理想螺线管电感",
  "D-01": "线圈导体中心路径长度",
  "D-03": "导体直流电阻",
  "D-04": "铜导体电磁趋肤深度",
  "D-07": "线圈阻抗、电压与品质因数",
  "F-01": "耦合负载等效电阻与等效电感",
  "H-01": "冷却回路热负荷汇总",
  "H-03": "冷却支路流速与水力直径",
  "J-03": "表面热辐射换热",
});

export function methodDisplayName(
  methodId: string,
  fallback: Readonly<{ readonly zh: string; readonly en: string }>,
  language: UiLanguage,
): string {
  return language === "zh-CN" ? METHOD_NAME_ZH[methodId] ?? fallback.zh : fallback.en;
}

export function methodPurpose(methodId: string, fallback: string, language: UiLanguage): string {
  return publicFacingText(language === "zh-CN" ? METHOD_PURPOSE_ZH[methodId] ?? fallback : fallback, language);
}

const METHOD_GATE_REASON_ZH: Readonly<Record<string, string>> = Object.freeze({
  "H-02": "自动冷却水流量选型暂未启用：冷却液物性来源和已批准的适用温压范围仍未闭合；在此之前不能用未经批准的常数替代焓差计算。",
});

export function methodGateReason(methodId: string, fallback: string, language: UiLanguage): string {
  if (language === "en") return publicFacingText(fallback, language);
  const specific = METHOD_GATE_REASON_ZH[methodId];
  if (specific !== undefined) return publicFacingText(specific, language);
  if (fallback.includes("requires submethod split")) return "此方法需要先完成受控子方法拆分，尚不能作为单一运行路线启用。";
  if (fallback.includes("implementation unavailable")) return "此方法尚无满足当前合同和验证要求的可用实现。";
  if (fallback.includes("not approved")) return "此方法尚未获得工程计算运行批准。";
  if (fallback.includes("deferred")) return "此方法已延期，尚未完成其来源、合同或验证门禁。";
  if (fallback.includes("execution disabled")) return "此方法尚未正式启用执行；仍需完成其合同要求的验证和运行激活流程。";
  return publicFacingText(fallback, language);
}

const LIMITATION_ZH: Readonly<Record<string, string>> = Object.freeze({
  "Uniform identical single-layer turns only.": "仅适用于均匀、相同截面的单层线圈。",
  "ADR-0003 full-envelope semantics and non-overlap must be explicit.": "线圈长度必须从第一匝外缘量到最后一匝外缘，并确认各匝的轴向投影不重叠。",
  "Analytical long-solenoid limit only; no frozen aspect-ratio threshold is applied.": "仅作为长螺线管解析极限；当前不应用未冻结的长径比阈值。",
  "The result is never a finite-coil Recommended method and does not include end, leakage, lead, or conductor cross-section effects.": "该结果绝不作为有限长线圈的推荐方法，也不包含端部、漏磁、引线或导体截面效应。",
  "Uniform cylindrical mechanical/CAD centre path only.": "仅适用于均匀圆柱形机械/CAD 导体中心路径。",
  "Unknown lead or bus groups produce a lower-bound result and warning.": "引线或母排长度未知时只给出下界结果，并保留警告。",
  "No default resistivity or material state is supplied.": "不提供默认电阻率或默认材料状态。",
  "This MVP form supports either no series extras or an explicitly incomplete terminal boundary.": "此 MVP 仅支持确认无串联附加电阻，或明确标记端子边界不完整。",
  "Requires externally established R and L at one coil series port.": "电阻和电感必须来自线圈同一连接位置、同一工况下的可靠数据。",
  "Component voltages are not grid-side or whole-tank voltage.": "各电压分量不代表电网侧或整机槽路电压。",
  "Estimated linear lumped two-winding reflected-impedance model only; F-02 same-state measurement is preferred for actual equipment.": "仅适用于线性、集总参数、双绕组正弦稳态估算；有实际设备测量数据时应优先采用同工况实测值。",
  "Mutual inductance must be supplied with same-state provenance and is never inferred from geometry.": "互感必须带有同状态溯源并由用户提供，绝不从几何参数推断。",
  "One complete, non-overlapping coil coolant circuit only.": "仅适用于一个完整且热路径不重叠的线圈冷却回路。",
  "Design-margin arithmetic is not available in this MVP.": "此 MVP 尚不提供设计裕量运算。",
  "One explicit branch flow and verified D-02 geometry only.": "仅适用于一个明确的冷却支路，流量、流通面积和湿周必须属于同一段流道。",
  "No OEM/project velocity acceptance or safety conclusion is produced.": "不生成 OEM/项目流速验收或安全结论。",
  "Electromagnetic field-amplitude 1/e depth only; never a thermal affected depth.": "结果仅表示电磁场幅值衰减到 1/e 的深度，绝不代表热影响深度。",
  "Linear homogeneous copper, sinusoidal steady state, and locally planar good-conductor approximation only.": "仅适用于线性、均匀铜导体、正弦稳态和局部平面良导体近似。",
  "Only large surroundings with view factor one or a long concentric two-gray-surface enclosure are supported.": "仅支持视角系数为 1 的大环境，或长同心双灰体封闭面。",
  "Emissivity, area, absolute temperature, material evidence, openings, obstructions and concentric end effects must be explicit.": "必须明确发射率、面积、绝对温度和材料依据，并核对开口、遮挡及同心结构端部效应。",
  "B-03 is an infinite-length analytical limit, not a normal finite-coil result.": "这是无限长螺线管解析极限，不是普通有限长度线圈的实际结果。",
  "No aspect-ratio threshold is frozen, so the application never relabels this limit as a finite-coil prediction.": "当前没有已确认的长径比阈值，因此软件不会把该极限改称为有限长度线圈预测值。",
  "The result excludes finite-length end effects, discrete turns, pitch, conductor cross section, leads, workpiece loading, leakage, and distributed capacitance.": "结果不包含有限长度端部效应、离散匝、节距、导体截面、引线、工件负载、漏磁和分布电容。",
  "The result is an analytical estimate for a linear lumped two-winding sinusoidal steady-state model.": "结果是线性集总双绕组正弦稳态模型的解析估算。",
  "F-01 is not eligible to be Recommended; use F-02 same-state measurement when actual-equipment data are available.": "该结果不是实际设备的首选值；有同工况实测数据时，应优先采用实测值。",
  "Mutual inductance M must have explicit same-state provenance and is never guessed from geometry.": "互感 M 必须有明确的同工况数据来源，绝不根据几何尺寸猜测。",
  "Design-margin arithmetic is not frozen; this MVP route accepts not_requested only.": "当前计算不包含尚未确认的设计裕量运算。",
  "Unknown applicable heat sources are not replaced by zero.": "未知但可能适用的热源不会被当作零。",
  "Useful workpiece heat, ambient loss, reactive power, and plant-wide loss are outside this coolant control volume.": "工件有效吸热、环境损失、无功功率和全厂损失不属于本冷却回路边界。",
  "Equal-split total-flow routing is outside this MVP adapter.": "当前计算不把系统总流量自动平均分配到各支路。",
  "Velocity acceptance requires a separately sourced OEM or project specification; no acceptance threshold is applied.": "流速是否合格必须另有设备厂家或项目规范依据；本计算不自动应用验收阈值。",
  "The result is a mean branch velocity and hydraulic diameter, not a safety qualification.": "结果仅为支路平均流速和水力直径，不构成安全合格结论。",
});

export function limitationText(value: string, language: UiLanguage): string {
  return publicFacingText(language === "zh-CN" ? LIMITATION_ZH[value] ?? value : value, language);
}

interface FieldTranslation {
  readonly label: string;
  readonly description: string;
}

const FIELD_ZH: Readonly<Record<string, FieldTranslation>> = Object.freeze({
  electricalTurnCount: { label: "电气匝数", description: "整数电气匝数。" },
  currentPathDiameterM: { label: "电流路径直径", description: "用于所选电感近似的线圈电流路径直径。" },
  conductorAxialSizeM: { label: "导体轴向尺寸", description: "导体沿轴向的投影尺寸。" },
  windingEnvelopeLengthM: { label: "绕组总长度", description: "沿线圈轴线，从第一匝最外侧边缘到最后一匝最外侧边缘的距离。" },
  mediumKind: { label: "介质类别", description: "选择线圈内部的实际均匀介质类别。" },
  relativePermeability: { label: "相对磁导率", description: "无量纲相对磁导率；必须与所声明介质及状态一致。" },
  geometrySnapshotId: { label: "计算几何记录", description: "本次计算采用的完整几何尺寸依据；其中的边界和尺寸必须与页面输入一致。" },
  semanticMappingStatus: { label: "几何数据一致性", description: "确认各项线圈尺寸来自同一份图纸或测量记录。" },
  currentPathBasis: { label: "电流路径直径的取得方式", description: "说明直径来自导体中心线、图纸尺寸还是其他可靠数据。" },
  windingClass: { label: "绕组类别", description: "选择实际绕组类别。" },
  envelopeDefinition: { label: "绕组总长度的测量方式", description: "确认是否从第一匝外缘量到最后一匝外缘。" },
  identicalTurnSections: { label: "确认各匝截面相同", description: "所有线圈匝具有相同的投影截面。" },
  nonOverlappingAxialProjection: { label: "确认轴向投影不重叠", description: "各匝投影截面在轴向不重叠。" },
  meanMechanicalPathDiameterM: { label: "机械中心路径直径", description: "机械/CAD 导体中心路径直径，不是电磁等效直径。" },
  helixRevolutionCount: { label: "机械圈数", description: "实际机械圈数，可包含非整数圈。" },
  helixAxialAdvanceM: { label: "螺旋端点轴向推进量", description: "同一路径两端之间的带符号轴向推进量。" },
  leadSegmentLengthsM: { label: "引线段长度", description: "以逗号分隔的米制数值；[] 表示确认没有；留空表示明确未知。" },
  busSegmentLengthsM: { label: "母排段长度", description: "以逗号分隔的米制数值；[] 表示确认没有；留空表示明确未知。" },
  pathGeometry: { label: "路径几何", description: "实际导体路径类别。" },
  meanDiameterBasis: { label: "平均直径依据", description: "所输入直径的来源和物理定义。" },
  revolutionCountBasis: { label: "圈数依据", description: "所输入机械圈数的来源。" },
  axialAdvanceBasis: { label: "轴向推进量依据", description: "所输入端点推进量的来源。" },
  turnCenterSpanConsistency: { label: "匝中心跨度一致性", description: "与可用匝中心跨度的比较结果。" },
  conductorLengthM: { label: "导体本体长度", description: "在所声明导体本体边界内的长度。" },
  metalAreaM2: { label: "导电金属截面积", description: "仅指金属面积，不能使用冷却流道面积。" },
  resistivityOhmM: { label: "电阻率", description: "必须显式提供状态匹配值；不提供默认铜电阻率。" },
  materialId: { label: "导体材料名称或牌号", description: "填写与电阻率数据对应的实际导体材料，例如具体铜材牌号。" },
  temperatureK: { label: "材料温度", description: "导体和材料属性共同使用的绝对温度。" },
  resistivitySourceRef: { label: "电阻率数据来源", description: "填写材料证书、检测记录、手册或已批准物性表的名称。" },
  resistivityStateMatch: { label: "属性状态匹配", description: "材料属性状态与导体状态之间的关系。" },
  materialClass: { label: "导体材料类别", description: "确认所用材料物性是否确实属于铜；其他材料不能走当前铜导体趋肤深度计算。" },
  propertyStateMatch: { label: "材料物性工况是否一致", description: "确认电阻率和相对磁导率属于同一铜材、同一温度和同一频率工况。" },
  calculationTemperatureK: { label: "铜导体计算温度", description: "本次趋肤深度计算代表的铜导体绝对温度。" },
  constitutiveRegime: { label: "导体响应模型", description: "确认铜导体可按线性、各向同性良导体处理。" },
  excitation: { label: "电源激励状态", description: "确认本次工况为稳定的正弦交流，而不是脉冲、非正弦或未知激励。" },
  fieldModel: { label: "导体表面局部形状近似", description: "确认所关注位置相对于趋肤深度足够平缓，可采用局部平面近似。" },
  materialSnapshotId: { label: "铜材料物性校验记录", description: "填写与本次电阻率、相对磁导率、温度和频率对应的完整材料物性校验记录。" },
  materialDisplayName: { label: "铜材牌号与工况名称", description: "用通俗名称说明实际铜材牌号及其温度、频率等工况。" },
  propertyTemperatureK: { label: "材料物性对应温度", description: "材料资料中电阻率和相对磁导率所对应的绝对温度，必须与计算温度完全一致。" },
  propertyFrequencyHz: { label: "材料物性对应频率", description: "材料资料中所给物性对应的频率，必须与本次激励频率完全一致。" },
  sameMaterialStateConfirmed: { label: "确认两项物性属于同一铜材工况", description: "确认电阻率和相对磁导率来自同一份铜材工况记录。" },
  relativePermeabilitySourceRef: { label: "相对磁导率数据来源", description: "填写相对磁导率所依据的材料证书、检测记录、手册或已审核物性资料名称。" },
  materialDistribution: { label: "材料分布", description: "材料沿导体路径的均匀性。" },
  metalAreaDistribution: { label: "金属截面积分布", description: "金属截面积沿导体路径的均匀性。" },
  temperatureDistribution: { label: "温度分布", description: "温度沿导体路径的均匀性。" },
  resistanceBoundary: { label: "电阻边界", description: "选择长度和截面积所代表的电阻边界。" },
  seriesExtrasMode: { label: "串联附加电阻", description: "当前 MVP 仅支持确认空列表或明确未知列表。" },
  resistanceOhm: { label: "串联电阻", description: "与状态和边界匹配的串联电阻。" },
  inductanceH: { label: "串联电感", description: "同一状态下由外部可靠方法确定的电感；此表单本身不计算 L。" },
  currentA: { label: "端口电流", description: "同一端口的 RMS 或基波 RMS 电流。" },
  frequencyHz: { label: "频率", description: "共同的正弦稳态频率。" },
  primaryResistanceOhm: { label: "一次侧串联电阻 R₁", description: "在所声明一次侧端口、参考平面和状态下的串联电阻。" },
  primaryInductanceH: { label: "一次侧自感 Lₚ", description: "在所声明一次侧端口、参考平面和状态下的自感。" },
  secondaryResistanceOhm: { label: "二次侧串联电阻 R₂", description: "在所声明二次侧端口、参考平面和状态下的串联电阻。" },
  secondaryInductanceH: { label: "二次侧自感 Lₛ", description: "在所声明二次侧端口、参考平面和状态下的自感。" },
  mutualInductanceH: { label: "互感 M", description: "同一状态和方向约定下的一次侧与二次侧互感。" },
  primaryPortId: { label: "一次侧连接位置", description: "填写一次侧电阻、电感所对应的实际接线位置名称。" },
  secondaryPortId: { label: "二次侧等效连接位置", description: "填写工件等效电阻、电感所对应的位置名称，并与一次侧区分。" },
  primaryReferencePlaneId: { label: "一次侧参数测量位置", description: "一次侧电阻和电感共同采用的测量或折算位置。" },
  secondaryReferencePlaneId: { label: "二次侧参数测量位置", description: "二次侧电阻和电感共同采用的测量或折算位置。" },
  primaryMaterialStateId: { label: "一次侧材料工况", description: "说明一次侧材料、温度和负载状态所组成的工况。" },
  secondaryMaterialStateId: { label: "二次侧材料工况", description: "说明工件材料、温度和负载状态所组成的工况。" },
  primaryTemperatureK: { label: "一次侧温度", description: "一次侧材料的绝对温度。" },
  secondaryTemperatureK: { label: "二次侧温度", description: "二次侧材料的绝对温度。" },
  primaryMaterialSnapshotId: { label: "一次侧材料记录", description: "与一次侧参数相对应的已保存材料记录。" },
  secondaryMaterialSnapshotId: { label: "二次侧材料记录", description: "与工件等效参数相对应的已保存材料记录。" },
  coupledCircuitStateId: { label: "耦合计算工况名称", description: "为本组频率、温度、负载和电气参数填写一个便于识别的工况名称。" },
  primaryParameterSourceKind: { label: "一次侧参数来源", description: "R₁ 和 Lₚ 的受控溯源类别。" },
  secondaryParameterSourceKind: { label: "二次侧参数来源", description: "R₂ 和 Lₛ 的受控溯源类别。" },
  mutualParameterSourceKind: { label: "互感参数来源", description: "M 的受控溯源类别。" },
  primarySourceRef: { label: "一次侧参数来源", description: "填写一次侧电阻和自感所依据的测量、仿真或计算记录名称。" },
  secondarySourceRef: { label: "二次侧参数来源", description: "填写二次侧等效电阻和自感所依据的记录名称。" },
  couplingSourceRef: { label: "互感数据来源", description: "填写互感或耦合参数所依据的测量、仿真或计算记录名称。" },
  mutualSourceRef: { label: "互感数据来源", description: "填写互感所依据的测量、仿真或计算记录名称。" },
  primarySourceSnapshotId: { label: "一次侧来源记录", description: "与一次侧参数对应的已保存依据记录。" },
  secondarySourceSnapshotId: { label: "二次侧来源记录", description: "与二次侧参数对应的已保存依据记录。" },
  couplingSourceSnapshotId: { label: "互感来源记录", description: "与互感参数对应的已保存依据记录。" },
  primaryStateMatch: { label: "一次侧状态匹配", description: "一次侧参数是否已确认为当前所声明的准确状态。" },
  secondaryStateMatch: { label: "二次侧状态匹配", description: "二次侧参数是否已确认为当前所声明的准确状态。" },
  mutualStateMatch: { label: "互感状态匹配", description: "互感 M 是否已确认为同一个所声明状态。" },
  modelRegime: { label: "电路模型适用状态", description: "确认系统可按线性、集总参数、双绕组正弦稳态模型处理。" },
  portId: { label: "线圈连接位置", description: "填写电阻、电感和电流共同对应的线圈接线位置。" },
  referencePlaneId: { label: "参数测量位置", description: "电阻、电感和电流共同采用的测量或折算位置。" },
  loadedState: { label: "负载状态", description: "R、L 和 I 共同使用的工作状态。" },
  seriesEquivalentId: { label: "串联参数工况名称", description: "为本组电阻和电感填写便于识别的共同工况名称。" },
  quantityBasis: { label: "电流基准", description: "受控电流基准。" },
  confirmCoilSeriesPort: { label: "确认线圈串联等效端口", description: "不能是电网侧端口或整机槽路端口。" },
  confirmLinearSinusoidal: { label: "确认线性正弦稳态", description: "D-07 模型要求的工作区间。" },
  volumeFlowM3PerS: { label: "支路体积流量", description: "一个已声明支路的显式流量。" },
  flowAreaM2: { label: "水力流通面积", description: "同一几何的 D-02 水力面积。" },
  wettedPerimeterM: { label: "湿周", description: "同一几何的 D-02 湿周。" },
  branchId: { label: "冷却支路名称", description: "填写正在计算的单条冷却水路名称。" },
  coolantNetworkId: { label: "冷却系统名称", description: "填写该支路所属的冷却系统名称。" },
  timeBasisId: { label: "共同运行工况", description: "说明各项数据共同对应的时间段或稳定运行状态。" },
  flowSourceMethod: { label: "流量来源方法", description: "显式支路流量的来源。" },
  flowSourceRef: { label: "流量数据来源", description: "填写流量计记录、调试报告或设计输入的名称。" },
  flowDataQuality: { label: "流量数据质量", description: "受控数据质量分类。" },
  flowSourceSnapshotId: { label: "流量测量记录", description: "采用实测流量时，填写与该数值对应的已保存测量记录。" },
  flowProvenanceId: { label: "流量记录名称", description: "填写便于识别和复核的上游流量记录名称。" },
  d02SourceRef: { label: "流道尺寸来源", description: "填写流通面积和湿周所依据的图纸或测量记录名称。" },
  d02DataQuality: { label: "流道尺寸数据质量", description: "选择流道尺寸数据的可靠程度。" },
  d02ProvenanceId: { label: "流道计算记录名称", description: "填写产生流通面积和湿周的记录名称。" },
  d02SourceSnapshotId: { label: "流道尺寸依据记录", description: "填写实际包含流道尺寸依据的已保存记录。" },
  d02GeometrySnapshotId: { label: "流道几何记录", description: "填写本次面积和湿周共同采用的几何记录。" },
  hydraulicGeometryId: { label: "流道截面名称", description: "为本组流通面积和湿周填写一个共同名称。" },
  oneDeclaredBranchConfirmed: { label: "确认仅一个已声明支路", description: "所提供流量不是冷却网络总流量。" },
  verifiedD02Snapshot: { label: "确认流道截面数据已经核对", description: "确认流通面积和湿周来自有效的圆形流道尺寸。" },
  sameD02HydraulicGeometryConfirmed: { label: "确认面积和湿周属于同一截面", description: "不能把不同流道或不同位置的数据混在一起。" },
  controlVolumeId: { label: "冷却计算边界名称", description: "为本次纳入热量收支的线圈冷却范围填写名称。" },
  coolantCircuitId: { label: "冷却回路名称", description: "填写本次计算所代表的单个冷却回路名称。" },
  heatLoadW: { label: "冷却热负荷", description: "进入所声明冷却控制体、需要由冷却液带走的热负荷。" },
  inletTemperatureK: { label: "入口温度", description: "冷却液入口绝对温度。" },
  outletTemperatureK: { label: "出口温度", description: "冷却液出口绝对温度。" },
  inletPressurePaAbs: { label: "入口绝对压力", description: "冷却液入口绝对压力。" },
  outletPressurePaAbs: { label: "出口绝对压力", description: "冷却液出口绝对压力。" },
  specificHeatCapacityJPerKgK: { label: "定压比热容", description: "与所声明冷却液及温压状态一致的定压比热容。" },
  densityKgPerM3: { label: "冷却液密度", description: "与体积流量参考状态一致的冷却液密度。" },
  propertyStateId: { label: "物性状态 ID", description: "比热容和密度共同使用的稳定物性状态标识。" },
  heatLoadSourceRef: { label: "热负荷来源引用", description: "所输入冷却热负荷的稳定来源引用。" },
  propertySourceRef: { label: "冷却液物性来源引用", description: "比热容和密度的稳定来源引用。" },
  propertyDataQuality: { label: "物性数据质量", description: "受控物性数据质量分类。" },
  otherLoadPresent: { label: "存在其他冷却负荷", description: "关闭时表示其他负荷列表已明确确认为空。" },
  singleDeclaredCircuitConfirmed: { label: "确认单一回路", description: "不得聚合多个冷却回路。" },
  boundaryCompleteConfirmed: { label: "确认控制体边界完整", description: "进入此回路的每一条适用热路径均已表示。" },
  forbiddenHeatClassesExcludedConfirmed: { label: "确认排除禁止热量类别", description: "排除工件有效热、环境损失、无功功率和设备损失。" },
  multiCircuitAggregationAbsentConfirmed: { label: "确认未聚合多回路", description: "仅代表一个已声明回路。" },
  otherLoadsEnumerationComplete: { label: "确认其他负荷枚举完整", description: "没有遗漏未知但适用的其他冷却负荷。" },
  otherLoadsEnumerationSourceRef: { label: "其他负荷枚举来源", description: "支持完整枚举的显式来源。" },
  pairwiseDisjointPathsConfirmed: { label: "确认各热路径两两不重叠", description: "任何热路径都不会被重复计算。" },
  physicalSourceIdentityChecked: { label: "确认已检查物理热源标识", description: "没有重复的物理热源。" },
  overlapAssessmentSourceRef: { label: "重叠评估来源", description: "热路径及物理来源标识评估的显式来源。" },
  designMarginNotRequested: { label: "确认不要求设计裕量", description: "设计裕量方程尚未冻结，因此不可用。" },
  configuration: { label: "辐射换热边界", description: "选择表面是向足够大的周围环境辐射，还是与长同心外表面相互辐射。" },
  surface1TemperatureK: { label: "表面 1 温度", description: "主要辐射表面的绝对温度，必须使用开尔文。" },
  surface1Emissivity: { label: "表面 1 发射率", description: "表面 1 在当前材料、表面状态和温度下的总半球发射率；不提供默认值。" },
  surface1AreaM2: { label: "表面 1 辐射面积", description: "实际参与所选辐射换热边界的表面 1 面积。" },
  surface1MaterialSnapshotId: { label: "表面 1 材料与发射率校验记录", description: "填写与表面 1 材料、表面状态、温度和发射率对应的完整校验记录。" },
  surface1EmissivitySourceRef: { label: "表面 1 发射率数据来源", description: "填写表面 1 发射率所依据的检测、材料手册或已审核资料名称。" },
  surface1EmissivityStateTemperatureK: { label: "表面 1 发射率资料对应温度", description: "发射率资料所代表的绝对温度，必须与表面 1 温度完全一致。" },
  counterpartKind: { label: "另一侧辐射边界", description: "选择足够大的周围环境，或明确的同心外表面；必须与上方辐射边界一致。" },
  counterpartTemperatureK: { label: "另一侧边界温度", description: "周围环境或同心外表面的绝对温度，必须使用开尔文。" },
  surface2Emissivity: { label: "同心外表面发射率", description: "仅同心双表面计算需要；填写外表面在当前状态和温度下的总半球发射率。" },
  surface2AreaM2: { label: "同心外表面辐射面积", description: "仅同心双表面计算需要；必须与表面 1 面积来自同一份几何依据。" },
  surface2MaterialSnapshotId: { label: "同心外表面材料与发射率校验记录", description: "仅同心双表面计算需要；填写与外表面材料、状态、温度和发射率对应的完整校验记录。" },
  surface2EmissivitySourceRef: { label: "同心外表面发射率数据来源", description: "仅同心双表面计算需要；填写外表面发射率所依据的检测或已审核资料名称。" },
  surface2EmissivityStateTemperatureK: { label: "同心外表面发射率资料对应温度", description: "仅同心双表面计算需要；必须与外表面温度完全一致。" },
  snapshotConfiguration: { label: "几何记录中的辐射边界", description: "选择几何记录中保存的边界形式，必须与本次所选辐射换热边界完全一致。" },
  snapshotSurface1AreaM2: { label: "几何记录中的表面 1 面积", description: "填写几何记录中保存的表面 1 面积，必须与本页辐射面积一致。" },
  snapshotSurface2AreaM2: { label: "几何记录中的同心外表面面积", description: "仅同心双表面计算需要；必须与本页外表面辐射面积一致。" },
  temperatureScale: { label: "温度标度", description: "辐射四次方关系必须采用开尔文绝对温度。" },
  diffuseGraySurfacesConfirmed: { label: "确认表面可按漫灰体处理", description: "确认所填发射率可代表当前工况下各方向和相关波段的灰体近似。" },
  viewFactor: { label: "表面 1 视角系数", description: "表面 1 发出的辐射到达另一侧边界的几何比例；当前路线只支持页面要求的明确值。" },
  noUnmodelledOpeningsOrObstructionsConfirmed: { label: "确认没有遗漏的开口或遮挡", description: "确认没有开口、隔热屏、支撑件或其他遮挡改变所选辐射换热路径。" },
  longConcentricEndEffectsStatus: { label: "同心结构端部效应核对", description: "同心双表面计算需确认长度足够、端部效应可忽略；向大环境辐射时选择不适用。" },
  surface1RoleStatus: { label: "表面 1 在同心结构中的位置", description: "同心双表面计算需确认表面 1 是内表面；向大环境辐射时选择不适用。" },
});

const HEAT_PREFIX_ZH: Readonly<Record<string, string>> = Object.freeze({
  copper: "线圈铜损",
  pickup: "外部进入线圈的热拾取",
  magnetic: "磁性材料损耗",
  other: "一个可选的其他冷却负荷",
});

const HEAT_SUFFIX_ZH: Readonly<Record<string, FieldTranslation>> = Object.freeze({
  Disposition: { label: "处置", description: "填入已知适用值，或记录由来源确认的不适用。" },
  ValueW: { label: "数值", description: "仅在纳入计算时必填。" },
  SourceMethod: { label: "来源方法", description: "该热量项或排除结论的来源。" },
  SourceRef: { label: "数据来源", description: "填写测量记录、分析文件或有限元结果的名称。" },
  DataQuality: { label: "数据质量", description: "选择该数据的可靠程度。" },
  SourceSnapshotId: { label: "来源记录", description: "填写与该热量数值或排除结论对应的已保存记录。" },
  ProvenanceId: { label: "来源记录名称", description: "填写便于识别和复核的上游记录名称。" },
  HeatPathId: { label: "热量进入路径", description: "填写热量通过什么物理路径进入这一冷却回路。" },
  PhysicalHeatSourceId: { label: "实际热源名称", description: "填写产生这部分热量的实际部件或区域，便于避免重复计入。" },
  Reason: { label: "排除原因", description: "仅在来源确认不适用时必填。" },
});

function heatFieldTranslation(fieldId: string): FieldTranslation | null {
  const match = /^(copper|pickup|magnetic|other)(Disposition|ValueW|SourceMethod|SourceRef|DataQuality|SourceSnapshotId|ProvenanceId|HeatPathId|PhysicalHeatSourceId|Reason)$/u.exec(fieldId);
  if (match === null) return null;
  const prefix = match[1] === undefined ? undefined : HEAT_PREFIX_ZH[match[1]];
  const suffix = match[2] === undefined ? undefined : HEAT_SUFFIX_ZH[match[2]];
  return prefix === undefined || suffix === undefined
    ? null
    : { label: `${prefix} · ${suffix.label}`, description: suffix.description };
}

export function fieldLabel(fieldId: string, fallback: string, language: UiLanguage): string {
  const value = language === "en"
    ? fallback
    : FIELD_ZH[fieldId]?.label ?? heatFieldTranslation(fieldId)?.label ?? fallback;
  return publicFacingText(value, language);
}

export function fieldDescription(fieldId: string, fallback: string, language: UiLanguage): string {
  const value = language === "en"
    ? fallback
    : FIELD_ZH[fieldId]?.description ?? heatFieldTranslation(fieldId)?.description ?? fallback;
  return publicFacingText(value, language);
}

const OPTION_ZH: Readonly<Record<string, string>> = Object.freeze({
  uniform_single_layer: "均匀单层",
  multilayer: "多层",
  other: "其他",
  ADR_0003_full_axial_envelope: "从第一匝外缘量到最后一匝外缘",
  other_or_unknown: "其他或未知",
  air: "空气",
  uniform_linear: "均匀线性介质",
  confirmed_same_B01_snapshot: "已确认来自同一份线圈几何记录",
  explicit_method_or_state_bound: "已显式绑定方法或状态",
  ADR_0003_default_centroid_unresolved: "尚未确认导体中心线的取法",
  uniform_cylindrical_helix: "均匀圆柱螺旋",
  noncircular_or_multilayer: "非圆形或多层",
  mechanical_or_cad_conductor_center_path: "机械/CAD 导体中心路径",
  electromagnetic_effective_current_path: "电磁等效电流路径",
  actual_mechanical_or_cad_path: "实际机械/CAD 路径",
  guessed_from_electrical_turn_count: "由电气匝数猜测",
  actual_path_endpoint_advance: "实际路径端点推进量",
  guessed_from_turn_center_span: "由匝中心跨度猜测",
  consistent: "一致",
  inconsistent: "不一致",
  not_available: "不可用",
  same_material_temperature_as_conductor: "材料和温度均与导体相同",
  cold_or_other_material_state: "冷态或其他材料状态",
  unconfirmed: "未确认",
  uniform: "均匀",
  spatially_varying: "空间变化",
  unknown: "未知",
  conductor_body_only_excludes_series_extras: "仅导体本体；不含串联附加项",
  includes_series_extras_or_terminal_measurement: "已含串联附加项或端子测量值",
  confirmed_none: "边界完整；无串联附加项",
  empty: "空载线圈",
  workpiece_cold: "冷工件",
  workpiece_hot: "热工件",
  measured_state: "测量状态",
  user_defined_state: "用户定义状态",
  rms: "RMS",
  fundamental_rms: "基波 RMS",
  imported_measurement: "导入的测量结果",
  imported_fem: "导入的 FEM 结果",
  approved_analytical: "已批准解析结果",
  confirmed_for_declared_state: "已确认为所声明状态",
  unconfirmed_or_mismatched: "未确认或状态不匹配",
  linear_lumped_sinusoidal_steady_state: "线性集总正弦稳态",
  nonlinear_distributed_or_non_sinusoidal_or_unknown: "非线性、分布参数、非正弦或未知",
  measurement: "测量",
  limited_analytical: "有限制的解析结果",
  case_input: "Case 输入",
  analytical_estimate: "解析估算",
  fem: "FEM 结果",
  user_defined: "用户定义并声明来源",
  user_input_with_source: "带来源的用户输入",
  project_specific: "项目特定",
  measured: "测量值",
  engineering_reference: "工程参考",
  approved_reference: "已批准参考",
  known_applicable: "纳入计算，已知适用",
  source_confirmed_not_applicable: "由来源确认不适用",
  copper: "铜导体",
  same_material_temperature_frequency_state: "同一材料、温度和频率工况",
  linear_isotropic_good_conductor: "线性、各向同性良导体",
  nonlinear_or_unknown: "非线性或未知",
  sinusoidal_steady_state: "正弦稳态",
  locally_planar_reference: "局部平面近似适用",
  radiation_to_large_surroundings: "向足够大的周围环境辐射",
  long_concentric_two_gray_surfaces: "长同心双灰体表面",
  large_surroundings: "足够大的周围环境",
  concentric_outer_surface: "同心外表面",
  absolute_kelvin: "开尔文绝对温度",
  confirmed: "已确认满足",
  confirmed_not_satisfied: "已确认不满足",
  not_applicable: "不适用",
});

export function optionLabel(value: string, fallback: string, language: UiLanguage): string {
  const label = language === "en" ? fallback : OPTION_ZH[value.replaceAll("-", "_")] ?? fallback;
  return publicFacingText(label, language);
}

export interface FieldHelpContent {
  readonly what: string;
  readonly how: string;
  readonly impact: string;
}

const FIELD_HOW_ZH: Readonly<Record<string, string>> = Object.freeze({
  electricalTurnCount: "按实际完整匝数填写；不要把引线、并联支路数或半径当作匝数。",
  conductorAxialSizeM: "从图纸或实物量取单根导体沿线圈轴线方向的外形尺寸，并换算为米。",
  windingEnvelopeLengthM: "沿线圈轴线，从第一匝最外侧边缘量到最后一匝最外侧边缘，并换算为米。",
  currentPathDiameterM: "优先从机械图纸取得导体中心线直径；实测时量取相对两侧导体中心之间的距离。",
  relativePermeability: "仅在选择均匀磁性介质时，按材料在实际频率和温度下的可靠资料填写；空气无需填写。",
  meanMechanicalPathDiameterM: "使用导体中心线形成的平均直径，可从机械图纸或实测尺寸计算，并换算为米。",
  helixRevolutionCount: "沿导体实际路径计数，允许小数圈；不要直接照抄电气匝数，除非两者已经核对一致。",
  helixAxialAdvanceM: "用终点轴向坐标减去起点轴向坐标；方向相反时可为负值。",
  leadSegmentLengthsM: "沿每段引线中心线量取长度，以逗号分隔；确认没有时填 []，无法确认时留空。",
  busSegmentLengthsM: "沿每段母排中心线量取长度，以逗号分隔；确认没有时填 []，无法确认时留空。",
  conductorLengthM: "填写本次电阻计算边界内的导体中心线路径总长，并换算为米。",
  metalAreaM2: "按金属外截面积减去内部冷却孔面积；不要填写水流面积。",
  resistivityOhmM: "从材料证书、实测或已批准的材料数据取得，并确认温度和材料牌号一致。",
  temperatureK: "填写材料实际温度的开尔文值；摄氏温度需加 273.15。",
  resistanceOhm: "填写在当前频率、温度、负载和接线位置下得到的串联电阻。",
  inductanceH: "填写与电阻同一工况、同一接线位置下的可靠电感值，单位为亨利。",
  currentA: "填写同一接线位置的有效值电流；如采用基波有效值，请在电流基准中明确选择。",
  frequencyHz: "填写设备本次运行或测量时的实际频率，单位为赫兹。",
  calculationTemperatureK: "将铜导体的摄氏温度加 273.15 后填写，并与材料物性资料代表的温度核对。",
  propertyTemperatureK: "从提供电阻率和相对磁导率的同一份资料读取温度，摄氏值需加 273.15。",
  propertyFrequencyHz: "从提供材料物性的同一份资料读取其适用频率，并以赫兹填写。",
  surface1TemperatureK: "测量或确定主要辐射表面温度，将摄氏值加 273.15 后填写。",
  counterpartTemperatureK: "测量或确定周围环境或同心外表面温度，将摄氏值加 273.15 后填写。",
  surface2EmissivityStateTemperatureK: "从同心外表面的发射率资料读取对应温度，摄氏值需加 273.15。",
  surface1EmissivityStateTemperatureK: "从表面 1 的发射率资料读取对应温度，摄氏值需加 273.15。",
  surface1Emissivity: "从与实际材料、粗糙度、氧化或涂层状态及温度匹配的可靠资料或测量中取得。",
  surface2Emissivity: "仅在同心双表面计算时，从与外表面实际状态和温度匹配的资料或测量中取得。",
  surface1AreaM2: "按实际参与辐射的表面展开面积计算，扣除不参与该换热路径的区域，并换算为平方米。",
  surface2AreaM2: "仅同心双表面计算时填写外表面的有效辐射面积，并与同一几何记录核对。",
  snapshotSurface1AreaM2: "从本次采用的几何记录复制表面 1 面积，确保数值和单位与页面输入一致。",
  snapshotSurface2AreaM2: "同心双表面计算时，从同一几何记录复制外表面面积；向大环境辐射时留空。",
  viewFactor: "根据所选边界和几何关系填写；当前受控路线要求使用页面所支持的明确视角系数。",
  primaryResistanceOhm: "填写一次侧在声明工况和接线位置下的串联电阻。",
  primaryInductanceH: "填写一次侧与其他参数同工况下的自感，单位为亨利。",
  secondaryResistanceOhm: "填写工件或二次侧在同一工况下折算得到的等效电阻。",
  secondaryInductanceH: "填写工件或二次侧在同一工况下折算得到的自感。",
  mutualInductanceH: "由同工况测量、有限元分析或已验证计算取得，并保留正负号约定；不要由几何尺寸猜测。",
  primaryTemperatureK: "填写一次侧导体或材料的实际开尔文温度。",
  secondaryTemperatureK: "填写工件或二次侧等效材料的实际开尔文温度。",
  volumeFlowM3PerS: "填写单条支路的体积流量；由流量计读数换算为立方米每秒，不要填写整套系统总流量。",
  flowAreaM2: "按流道内轮廓计算实际通水截面积；圆管可用内径计算，并换算为平方米。",
  wettedPerimeterM: "填写冷却水与流道壁接触的截面周长；圆管为内圆周长，并换算为米。",
});

function helpHow(fieldId: string, kind: string, language: UiLanguage): string {
  if (language === "zh-CN") {
    const explicit = FIELD_HOW_ZH[fieldId];
    if (explicit !== undefined) return explicit;
    if (fieldId.endsWith("SourceRef") || fieldId.includes("Source")) {
      return "填写对应图纸、报告、测量、分析或材料资料的名称，确保其他人能够找到并复核。";
    }
    if (fieldId.endsWith("Id") || fieldId.includes("Snapshot") || fieldId.includes("Provenance")) {
      return "填写当前方案中与这项数据对应的记录名称；同一工况的数据应使用同一条记录。";
    }
    if (kind === "boolean") return "完成实物、图纸或数据记录核对后再勾选；不能确认时保持未勾选。";
    if (kind === "select") return "根据当前设备和数据的真实情况选择；不确定时选择未知或不确认的选项。";
    if (kind === "number") return "从图纸、实测或经确认的工程资料取得数值，并按字段旁显示的单位换算后填写。";
    if (kind === "number_list_optional") return "逐项填写实际数值并用逗号分隔；确认没有时填 []，无法确认时留空。";
    return "填写便于工程人员识别和复核的名称或来源说明，不要填写猜测内容。";
  }
  if (kind === "boolean") return "Select only after checking the drawing, equipment, or source record; leave it clear when uncertain.";
  if (kind === "select") return "Choose the option that describes the actual equipment and evidence; use an unknown option when uncertain.";
  if (kind === "number_list_optional") return "Enter measured values separated by commas, [] for confirmed none, or leave blank when unknown.";
  if (kind === "number") return "Obtain the value from a drawing, measurement, or reviewed engineering record and convert it to the displayed unit.";
  return "Enter a human-readable name or source description that another engineer can verify.";
}

function helpImpact(fieldId: string, kind: string, language: UiLanguage): string {
  if (language === "zh-CN") {
    if (/magneticMedium|relativePermeability/i.test(fieldId)) {
      return "会直接影响理想螺线管电感或铜导体趋肤深度，并决定所选材料与磁介质是否处于支持的适用范围。";
    }
    if (/emissivity|surface\d.*temperature|counterpartTemperature|radiat|viewFactor/i.test(fieldId)) {
      return "会直接改变净辐射换热功率，或决定灰体辐射关系能否适用。";
    }
    if (/calculationTemperature|propertyTemperature|propertyFrequency|materialClass|propertyState|constitutive|excitation|fieldModel|sameMaterial/i.test(fieldId)) {
      return "用于核对铜材物性和电磁模型是否与当前工况一致；不匹配时计算会停止并提示修正。";
    }
    if (/turn|diameter|length|advance|area|perimeter|size/i.test(fieldId)) return "会改变线圈几何、电感、电阻、流速或相关中间量；尺寸错误会直接带入最终结果。";
    if (/resistance|resistivity|inductance|mutual|current|frequency/i.test(fieldId)) return "会直接影响阻抗、等效电阻、等效电感、电压或损耗结果。";
    if (/flow/i.test(fieldId)) return "会直接影响冷却支路流速和水力结果，并影响后续冷却能力判断。";
    if (/valuew|heat|copper|pickup|magnetic|other/i.test(fieldId)) return "决定纳入冷却回路的热负荷及总冷却功率。";
    if (/source|quality|state|basis|confirm|distribution|regime|disposition|reason/i.test(fieldId) || kind !== "number") {
      return "主要影响数据是否适用、计算能否继续以及是否需要显示警告；通常不直接改变公式。";
    }
    return "会参与所选计算或决定其适用范围，请使用与当前工况一致的数据。";
  }
  if (/turn|diameter|length|advance|area|perimeter|size/i.test(fieldId)) return "It changes the geometry-dependent calculation and an incorrect dimension carries into the final result.";
  if (/resistance|resistivity|inductance|mutual|current|frequency/i.test(fieldId)) return "It directly changes impedance, equivalent parameters, voltage, or loss results.";
  if (/flow/i.test(fieldId)) return "It directly changes branch velocity and hydraulic results.";
  return kind === "number"
    ? "It participates in the selected calculation and must match the declared operating condition."
    : "It determines applicability, whether calculation can continue, and which warnings are shown.";
}

export function fieldHelp(
  fieldId: string,
  fallbackDescription: string,
  kind: string,
  language: UiLanguage,
): FieldHelpContent {
  return {
    what: fieldDescription(fieldId, fallbackDescription, language),
    how: helpHow(fieldId, kind, language),
    impact: helpImpact(fieldId, kind, language),
  };
}

const METHOD_RESULT_SOURCE: Readonly<Record<string, Readonly<{ readonly zh: string; readonly en: string }>>> = Object.freeze({
  "B-02": { zh: "线圈几何定义与轴向填充计算依据", en: "Coil geometry definition and axial-fill calculation basis" },
  "B-03": { zh: "理想长螺线管解析公式与国际基本常数", en: "Ideal long-solenoid equation and internationally recognized physical constants" },
  "D-01": { zh: "圆柱螺旋中心线路径几何公式", en: "Cylindrical-helix centre-line geometry" },
  "D-03": { zh: "导体直流电阻定义及用户提供的材料数据", en: "DC conductor-resistance definition and user-supplied material evidence" },
  "D-04": { zh: "经典良导体趋肤深度关系与已确认的铜材料物性", en: "Classical good-conductor skin-depth relation and confirmed copper properties" },
  "D-07": { zh: "正弦稳态串联阻抗关系", en: "Sinusoidal steady-state series-impedance relationships" },
  "F-01": { zh: "线性双绕组耦合电路与反射阻抗关系", en: "Linear two-winding coupled-circuit and reflected-impedance relationships" },
  "H-01": { zh: "单一冷却回路能量边界与不重复热负荷汇总", en: "Single-circuit energy boundary and non-overlapping heat-load total" },
  "H-03": { zh: "连续流动定义与水力直径关系", en: "Continuous-flow velocity and hydraulic-diameter definitions" },
  "J-03": { zh: "斯忒藩–玻尔兹曼定律与灰体辐射网络", en: "Stefan-Boltzmann law and gray-surface radiation network" },
});

export function methodSourceSummary(methodId: string, language: UiLanguage): string {
  const source = METHOD_RESULT_SOURCE[methodId];
  return source === undefined
    ? uiText(language, "项目中已验证的工程计算依据", "Reviewed engineering basis retained by the project")
    : uiText(language, source.zh, source.en);
}

export function methodApplicabilityScope(methodId: string, language: UiLanguage): string {
  const zh: Readonly<Record<string, string>> = {
    "B-02": "均匀、相同截面的单层线圈",
    "B-03": "空气芯或已知均匀线性介质中的理想长螺线管近似",
    "D-01": "均匀圆柱螺旋导体中心路径",
    "D-03": "材料、温度和导体边界明确且一致的直流电阻",
    "D-04": "物性同工况、线性各向同性、局部平面近似的均匀铜良导体",
    "D-07": "同一连接位置和工况下的线性正弦稳态串联参数",
    "F-01": "线性、集总参数、双绕组正弦稳态等效模型",
    "H-01": "一个完整且热量不重复的线圈冷却回路",
    "H-03": "一个明确冷却支路及同一截面的流量和几何数据",
    "J-03": "视角系数为 1 的大环境，或长同心双灰体封闭面",
  };
  const value = zh[methodId];
  if (language === "zh-CN") return value ?? "以当前功能页面列出的适用条件为准";
  return publicFacingText(value ?? "See the applicability conditions shown for this calculation.", language);
}

const RESULT_TEXT_ZH: Readonly<Record<string, string>> = Object.freeze({
  "uniform identical single-layer turns": "各匝截面相同，且为均匀单层绕组。",
  "non-overlapping axial projection": "各匝在轴向的投影互不重叠。",
  "b_env uses the ADR-0003 full axial envelope definition": "绕组总长度按第一匝外缘到最后一匝外缘的距离计算。",
  infinite_length_uniform_current_sheet: "线圈按无限长、均匀电流片理想化。",
  uniform_linear_medium: "线圈内部介质均匀且为线性介质。",
  no_workpiece: "理想模型中不包含工件。",
  no_leads: "理想模型中不包含引线。",
  no_conductor_cross_section_effects: "理想模型中不包含导体截面效应。",
  no_end_or_leakage_flux_effects: "理想模型中不包含端部效应和漏磁。",
  "uniform cylindrical helix": "导体路径按均匀圆柱螺旋线处理。",
  "D_m is the mechanical/CAD conductor center-path diameter": "输入直径表示机械图纸中的导体中心路径直径。",
  "N_rev and delta_z_helix describe the same path endpoints": "机械圈数和轴向推进量描述同一条导体路径的起止点。",
  "lead and bus paths are summed only at explicit reference planes": "只有边界和测量位置明确的引线、母排路径才会计入总长。",
  "material, temperature, and metal cross-section are uniform along the closed-form conductor path": "在所计算导体路径内，材料、温度和金属截面积按均匀处理。",
  "the resistivity snapshot matches the declared conductor material and temperature": "所用电阻率与声明的导体材料和温度一致。",
  "terminal extras are either completely enumerated with sources or explicitly unresolved": "端子附加电阻要么完整列出并注明来源，要么明确标记为尚未确定。",
  "a terminal resistance is published only for non-overlapping complete boundaries": "只有电阻边界完整且不重复时才给出端子总电阻。",
  "linear sinusoidal steady state": "系统按线性正弦稳态处理。",
  "R_s and L_s describe one series-equivalent coil port": "串联电阻和串联电感属于同一个线圈串联等效端口。",
  "R_s, L_s and I share one frequency, port, reference plane and loaded state": "电阻、电感和电流对应同一频率、接线位置、测量位置和负载状态。",
  "current is RMS or fundamental RMS under the frozen phasor convention": "电流采用总有效值或基波有效值口径。",
  "reported voltages are coil-series-port quantities, not grid-side or total resonant-tank voltages": "所示电压属于线圈串联端口，不代表电网侧或整套谐振回路电压。",
  "linear lumped two-winding equivalent": "系统按线性集总双绕组等效电路处理。",
  "sinusoidal steady state under the frozen RMS exp(j*omega*t) passive-sign convention": "采用正弦稳态有效值和统一的被动符号约定。",
  "R1/Lp, R2/Ls and M belong to one declared coupled-circuit operating state and frequency": "一次侧、二次侧及互感参数属于同一耦合工况和频率。",
  "primary and secondary material temperatures may differ physically but each is state-matched across its parameter snapshots": "一次侧和二次侧温度可以不同，但各自参数必须与各自材料工况一致。",
  "the supplied secondary equivalent is interpretable at its declared port and reference plane": "二次侧等效参数可在声明的接线位置和测量位置下解释。",
  "M, R2 and Ls come from explicit measurement, limited analysis, FEM, or sourced user input; geometry is not used to guess them": "互感及二次侧电阻、电感来自明确测量、受限分析、有限元或有来源的用户输入，不由几何尺寸猜测。",
  "positive heat rate is into the declared coolant circuit": "正热流表示热量进入所声明的冷却回路。",
  "source-confirmed not-applicable terms do not enter the sum": "已有来源确认不适用的热量项不计入合计。",
  "unknown applicable terms are never replaced by zero": "未知但可能适用的热量项绝不会被当作零。",
  "useful workpiece heat, ambient loss, reactive power and plant-wide loss are excluded": "不计入工件有效吸热、环境损失、无功功率和全厂损失。",
  "multiple coolant circuits are evaluated separately": "多个冷却回路必须分别计算。",
  "Vdot is volumetric flow at the declared state, never mass flow or velocity": "所填流量是在声明工况下的体积流量，不是质量流量或流速。",
  "v is the mean branch velocity based on actual coolant flow area": "流速是按实际通水截面积计算的支路平均流速。",
  "Dh uses the actual same-passage wetted perimeter": "水力直径使用同一流道截面的实际湿周。",
  "equal split is used only after equal geometry, equal resistance and hydraulic balance are confirmed": "只有确认各支路几何和阻力相同且水力平衡后，才可采用平均分流。",
  "velocity magnitude alone does not establish acceptability or safety": "仅凭流速数值不能得出合格或安全结论。",
  "At least one lead/bus reference-plane segment group is unknown; only the explicitly known path lower bound is available.": "至少一组引线或母排长度未知，因此只能给出已知路径长度下限。",
  "The declared actual helix endpoint advance conflicts with the independent turn-center span; the actual endpoint path value was retained.": "声明的螺旋端点推进量与独立匝中心跨度不一致；计算保留了实际端点路径值。",
  "Terminal series-extra resistances are explicitly unknown or incomplete; Rconductor_dc remains available but Rterminal_dc is not published.": "端子串联附加电阻未知或不完整；仍给出导体本体直流电阻，但不提供端子总电阻。",
  "R_s is zero, so D-07 did not emit a finite Q_s; exact impedance and voltage outputs remain available.": "串联电阻为零，因此品质因数没有有限数值；阻抗和电压结果仍然可用。",
  "B-03 is published only as the infinite-length analytical limit. No frozen b_env/D_c threshold exists, so this value must not be presented as the primary finite-coil prediction.": "该电感仅作为无限长螺线管解析极限。当前没有已确认的几何比例阈值，因此不能把它作为有限长度线圈的主要预测值。",
  "leadSegmentLengthsM=null": "引线长度尚未明确，因此该项暂不可用。",
  "busSegmentLengthsM=null": "母排长度尚未明确，因此该项暂不可用。",
  "pathCompleteness=lower_bound_only": "引线或母排长度尚未完整确认，因此不能给出导体总路径长度。",
  "terminal series-extra resistances are explicitly unknown or incomplete": "端子串联附加电阻未知或不完整，因此该项暂不可用。",
  "series quality factor is undefined/infinite at R_s=0": "串联电阻为零时，品质因数没有有限数值。",
});

export function userResultText(value: string, language: UiLanguage): string {
  const bilingualSeparator = value.indexOf(" / ");
  if (bilingualSeparator > 0) {
    const zh = value.slice(0, bilingualSeparator).trim();
    const en = value.slice(bilingualSeparator + 3).trim();
    if (/\p{Script=Han}/u.test(zh) && /[A-Za-z]/u.test(en)) {
      return publicFacingText(language === "zh-CN" ? zh : en, language);
    }
  }
  if (language === "zh-CN") {
    const translated = RESULT_TEXT_ZH[value];
    if (translated !== undefined) return translated;
    if (/infinite-length analytical limit|long-solenoid analytical limit|finite-length/iu.test(value)) {
      return "这是理想长螺线管的解析近似。实际有限长度线圈会受到端部漏磁、引线和导体截面的影响。";
    }
    if (/lower bound/iu.test(value)) return "部分引线或母排长度未知，因此当前总长度仅为下限。";
    if (/not eligible to be Recommended|preferred/iu.test(value)) return "这是工程估算结果；有同工况实测数据时应优先采用实测值。";
    if (/not supplied|unknown|unavailable/iu.test(value)) return "所需数据尚未明确，因此该项结果暂不能给出。";
    return publicFacingText(value, language);
  }
  return publicFacingText(value, language);
}

const UNIT_SYMBOLS: Readonly<Record<string, string>> = Object.freeze({
  one: "—",
  m: "m",
  m2: "m²",
  m3_per_s: "m³/s",
  m_per_s: "m/s",
  ohm: "Ω",
  H: "H",
  A: "A",
  V: "V",
  W: "W",
});

const RESULT_OUTPUT_LABELS: Readonly<Record<string, Readonly<{ readonly zh: string; readonly en: string }>>> = Object.freeze({
  k_fill_axial: { zh: "轴向填充系数", en: "Axial fill factor" },
  L_inf: { zh: "理想长螺线管电感极限", en: "Ideal long-solenoid inductance limit" },
  ell_helix: { zh: "螺旋路径长度", en: "Helix path length" },
  ell_known_lower_bound: { zh: "已知路径长度下限", en: "Known path-length lower bound" },
  ell_lead: { zh: "引线路径长度", en: "Lead path length" },
  ell_bus: { zh: "母排路径长度", en: "Bus path length" },
  ell_total: { zh: "导体总路径长度", en: "Total conductor path length" },
  Rconductor_dc: { zh: "导体本体直流电阻", en: "Conductor-body DC resistance" },
  Rterminal_dc: { zh: "端子直流总电阻", en: "Terminal DC resistance" },
  XL: { zh: "感抗", en: "Inductive reactance" },
  Zcomplex: { zh: "串联复阻抗", en: "Complex series impedance" },
  "|Z|": { zh: "阻抗幅值", en: "Impedance magnitude" },
  Qs: { zh: "串联品质因数", en: "Series quality factor" },
  UR: { zh: "电阻电压分量", en: "Resistive voltage component" },
  UX: { zh: "感性电压分量", en: "Inductive voltage component" },
  Uterminal: { zh: "线圈串联端口电压", en: "Coil series-port voltage" },
  Zin: { zh: "输入阻抗", en: "Input impedance" },
  Req: { zh: "等效输入电阻", en: "Equivalent input resistance" },
  Rref: { zh: "反射电阻", en: "Reflected resistance" },
  Leq: { zh: "等效输入电感", en: "Equivalent input inductance" },
  k: { zh: "耦合系数", en: "Coupling coefficient" },
  Qcool: { zh: "冷却回路总热负荷", en: "Total coolant-circuit heat load" },
  v: { zh: "冷却支路平均流速", en: "Mean coolant branch velocity" },
  Dh: { zh: "流道水力直径", en: "Hydraulic diameter" },
  copper_skin_depth: { zh: "铜导体电磁趋肤深度", en: "Copper electromagnetic skin depth" },
  radiative_heat_rate: { zh: "净辐射换热量", en: "Net radiative heat rate" },
  radiation_network_factor: { zh: "辐射网络系数", en: "Radiation network factor" },
});

export function resultOutputLabel(
  outputId: string,
  fallback: Readonly<{ readonly zh: string; readonly en: string }>,
  language: UiLanguage,
): string {
  const label = RESULT_OUTPUT_LABELS[outputId] ?? fallback;
  return publicFacingText(uiText(language, label.zh, label.en), language);
}

export function unitSymbol(unitId: string | null, language: UiLanguage): string {
  if (unitId === null) return uiText(language, "无量纲", "unitless");
  return UNIT_SYMBOLS[unitId] ?? publicFacingText(unitId, language);
}

export function parameterDefinitionText(localizedName: string, language: UiLanguage): string {
  return uiText(
    language,
    `“${localizedName}”是本软件在工程输入、边界检查或结果计算中使用的物理量。`,
    `“${localizedName}” is an engineering quantity used for input, boundary checking, or calculation.`,
  );
}

export function parameterApplicabilityText(localizedName: string, language: UiLanguage): string {
  return uiText(
    language,
    `${localizedName}必须与当前设备、材料、温度、频率和测量位置保持一致，并满足所选计算功能列出的适用条件。`,
    `${localizedName} must match the current equipment, material, temperature, frequency, and measurement location and the stated applicability conditions.`,
  );
}

export function parameterHelpText(localizedName: string, language: UiLanguage): string {
  return uiText(
    language,
    `请从图纸、实测记录或经确认的工程资料取得${localizedName}；按页面单位换算，不确定时不要猜测。`,
    `Obtain ${localizedName} from a drawing, measurement, or reviewed engineering record; convert to the displayed unit and do not guess.`,
  );
}

export function parameterRoleLabel(role: string, requirement: string, language: UiLanguage): string {
  if (language === "en") return publicFacingText(`${role.replaceAll("_", " ")} / ${requirement.replaceAll("_", " ")}`, language);
  const roleText = role.includes("input") ? "输入参数" : role.includes("output") ? "计算结果" : "工程参数";
  const requirementText = requirement.includes("required") ? "必需" : requirement.includes("conditional") ? "按条件需要" : "可选";
  return `${roleText} · ${requirementText}`;
}

export function parameterDimensionLabel(dimension: string, language: UiLanguage): string {
  const zh: Readonly<Record<string, string>> = {
    dimensionless: "无量纲",
    length: "长度",
    area: "面积",
    temperature: "温度",
    pressure: "压力",
    frequency: "频率",
    current: "电流",
    resistance: "电阻",
    inductance: "电感",
    power: "功率",
    volume_flow_rate: "体积流量",
    velocity: "速度",
  };
  if (language === "zh-CN") return zh[dimension] ?? "工程量";
  return publicFacingText(dimension.replaceAll("_", " "), language);
}

const CASE_FIELD_ZH: Readonly<Record<string, string>> = Object.freeze({
  "Case name": "方案名称",
  "Created at": "创建时间",
  "Case schema": "方案文件格式版本",
  "Technical freeze": "工程数据版本",
  "Geometry quantities": "几何量数量",
  "Material snapshots": "材料记录数量",
  "Operating conditions": "运行条件数量",
  "Method selections": "方法选择数量",
  "User inputs": "用户输入数量",
  "Measurement overrides": "测量覆盖数量",
  "FEM references": "FEM 引用数量",
  Attachments: "附件数量",
  "Material IDs": "采用的材料",
  "Selected method IDs": "采用的计算功能",
});

export function caseFieldLabel(value: string, language: UiLanguage): string {
  const label = language === "en"
    ? value
    : value.startsWith("Version · ")
      ? `版本 · ${value.slice("Version · ".length)}`
      : CASE_FIELD_ZH[value] ?? value;
  return publicFacingText(label, language);
}
