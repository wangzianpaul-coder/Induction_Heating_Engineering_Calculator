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

const CAPABILITY_LABEL_ZH: Readonly<Record<string, string>> = Object.freeze({
  parameters: "参数定义",
  "method-readiness": "方法就绪状态",
  "case-inspector": "Case 检查器",
  results: "计算结果",
  "material-comparison": "材料比较",
  "geometry-3d": "三维几何",
  "calculation-trace": "计算追踪",
  "engineering-report": "工程报告",
});

const CAPABILITY_REASON_ZH: Readonly<Record<string, string>> = Object.freeze({
  parameters: "受控参数定义可通过只读应用视图查询。",
  "method-readiness": "可查看方法合同、证据状态和明确的运行门禁。",
  "case-inspector": "可在不修改、不计算的前提下验证并检查 Case 文件。",
  results: "受控 MVP 适配器可以生成当前已放行方法的计算结果。",
  "material-comparison": "尚无满足正式比较合同和等价边界要求的方法组合。",
  "geometry-3d": "Phase 6 参数化三维快照适配器和查看器尚未启用。",
  "calculation-trace": "正式 CalculationResult/Trace 合同仍未完成运行时发布门禁。",
  "engineering-report": "正式工程报告需要结果、追踪及人工验收边界完成后才能启用。",
});

export function capabilityLabel(id: string, fallback: string, language: UiLanguage): string {
  return language === "zh-CN" ? CAPABILITY_LABEL_ZH[id] ?? fallback : fallback;
}

export function capabilityReason(id: string, fallback: string, language: UiLanguage): string {
  return language === "zh-CN" ? CAPABILITY_REASON_ZH[id] ?? fallback : fallback;
}

const METHOD_PURPOSE_ZH: Readonly<Record<string, string>> = Object.freeze({
  "B-02": "计算满足明确几何条件的单层线圈轴向填充系数。",
  "B-03": "在空气或显式均匀介质中，按长螺线管近似计算理想螺线管电感。",
  "D-01": "计算圆柱螺旋导体中心路径长度，并明确处理引线和母排边界。",
  "D-03": "使用显式、同状态的电阻率和导体边界计算直流电阻。",
  "D-07": "由同一串联端口、同一状态下的 R、L、I 和频率计算电气参数。",
  "F-01": "由同一状态和参考边界下的双绕组 R、L、M 参数计算耦合线圈等效电气量。",
  "H-01": "汇总一个完整、不重叠的线圈冷却回路热负荷。",
  "H-02": "由明确热负荷、进出口状态及同状态冷却液属性计算所需质量流量和体积流量。",
  "H-03": "由单支路流量和经验证的 D-02 几何计算流速与水力直径。",
});

export function methodPurpose(methodId: string, fallback: string, language: UiLanguage): string {
  return language === "zh-CN" ? METHOD_PURPOSE_ZH[methodId] ?? fallback : fallback;
}

const METHOD_GATE_REASON_ZH: Readonly<Record<string, string>> = Object.freeze({
  "H-02": "H-02 暂未启用：A-02/IAPWS 冷却液物性提供链和已批准的常物性适用窗口仍未闭合；在此之前不能用未经批准的常数替代焓差计算。",
});

export function methodGateReason(methodId: string, fallback: string, language: UiLanguage): string {
  if (language === "en") return fallback;
  const specific = METHOD_GATE_REASON_ZH[methodId];
  if (specific !== undefined) return specific;
  if (fallback.includes("requires submethod split")) return "此方法需要先完成受控子方法拆分，尚不能作为单一运行路线启用。";
  if (fallback.includes("implementation unavailable")) return "此方法尚无满足当前合同和验证要求的可用实现。";
  if (fallback.includes("not approved")) return "此方法尚未获得工程计算运行批准。";
  if (fallback.includes("deferred")) return "此方法已延期，尚未完成其来源、合同或验证门禁。";
  if (fallback.includes("execution disabled")) return "此方法尚未正式启用执行；仍需完成其合同要求的验证和运行激活流程。";
  return fallback;
}

const LIMITATION_ZH: Readonly<Record<string, string>> = Object.freeze({
  "Uniform identical single-layer turns only.": "仅适用于均匀、相同截面的单层线圈。",
  "ADR-0003 full-envelope semantics and non-overlap must be explicit.": "必须明确采用 ADR-0003 全包络语义并确认轴向不重叠。",
  "Analytical long-solenoid limit only; no frozen aspect-ratio threshold is applied.": "仅作为长螺线管解析极限；当前不应用未冻结的长径比阈值。",
  "The result is never a finite-coil Recommended method and does not include end, leakage, lead, or conductor cross-section effects.": "该结果绝不作为有限长线圈的推荐方法，也不包含端部、漏磁、引线或导体截面效应。",
  "Uniform cylindrical mechanical/CAD centre path only.": "仅适用于均匀圆柱形机械/CAD 导体中心路径。",
  "Unknown lead or bus groups produce a lower-bound result and warning.": "引线或母排长度未知时只给出下界结果，并保留警告。",
  "No default resistivity or material state is supplied.": "不提供默认电阻率或默认材料状态。",
  "This MVP form supports either no series extras or an explicitly incomplete terminal boundary.": "此 MVP 仅支持确认无串联附加电阻，或明确标记端子边界不完整。",
  "Requires externally established R and L at one coil series port.": "要求在同一线圈串联端口提供外部已确定的 R 和 L。",
  "Component voltages are not grid-side or whole-tank voltage.": "各电压分量不代表电网侧或整机槽路电压。",
  "Estimated linear lumped two-winding reflected-impedance model only; F-02 same-state measurement is preferred for actual equipment.": "仅为线性集总双绕组折算阻抗估算模型；实际设备优先采用 F-02 同状态测量。",
  "Mutual inductance must be supplied with same-state provenance and is never inferred from geometry.": "互感必须带有同状态溯源并由用户提供，绝不从几何参数推断。",
  "One complete, non-overlapping coil coolant circuit only.": "仅适用于一个完整且热路径不重叠的线圈冷却回路。",
  "Design-margin arithmetic is not available in this MVP.": "此 MVP 尚不提供设计裕量运算。",
  "One explicit branch flow and verified D-02 geometry only.": "仅适用于一个显式支路流量及经验证的 D-02 几何。",
  "No OEM/project velocity acceptance or safety conclusion is produced.": "不生成 OEM/项目流速验收或安全结论。",
});

export function limitationText(value: string, language: UiLanguage): string {
  return language === "zh-CN" ? LIMITATION_ZH[value] ?? value : value;
}

interface FieldTranslation {
  readonly label: string;
  readonly description: string;
}

const FIELD_ZH: Readonly<Record<string, FieldTranslation>> = Object.freeze({
  electricalTurnCount: { label: "电气匝数", description: "整数电气匝数。" },
  currentPathDiameterM: { label: "电流路径直径", description: "用于所选电感近似的线圈电流路径直径。" },
  conductorAxialSizeM: { label: "导体轴向尺寸", description: "导体沿轴向的投影尺寸。" },
  windingEnvelopeLengthM: { label: "线圈完整轴向包络", description: "ADR-0003 定义的完整轴向包络长度。" },
  mediumKind: { label: "介质类别", description: "选择线圈内部的实际均匀介质类别。" },
  relativePermeability: { label: "相对磁导率", description: "无量纲相对磁导率；必须与所声明介质及状态一致。" },
  geometrySnapshotId: { label: "几何快照 ID", description: "实际包含并绑定本次计算几何语义的内容寻址快照。" },
  semanticMappingStatus: { label: "几何语义映射状态", description: "确认各几何量来自同一个 B-01 快照及冻结语义。" },
  currentPathBasis: { label: "电流路径依据", description: "所输入电流路径直径的来源和冻结语义状态。" },
  windingClass: { label: "绕组类别", description: "选择实际绕组类别。" },
  envelopeDefinition: { label: "包络定义", description: "确认是否使用 ADR-0003 完整包络语义。" },
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
  materialId: { label: "材料 ID", description: "导体和材料属性共同使用的稳定材料标识。" },
  temperatureK: { label: "材料温度", description: "导体和材料属性共同使用的绝对温度。" },
  resistivitySourceRef: { label: "电阻率来源引用", description: "项目、测量或已批准材料属性来源。" },
  resistivityStateMatch: { label: "属性状态匹配", description: "材料属性状态与导体状态之间的关系。" },
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
  primaryPortId: { label: "一次侧端口 ID", description: "稳定的一次侧端口标识。" },
  secondaryPortId: { label: "二次侧端口 ID", description: "稳定的二次侧端口标识。" },
  primaryReferencePlaneId: { label: "一次侧参考平面 ID", description: "一次侧 R/L 参数共同使用的参考平面。" },
  secondaryReferencePlaneId: { label: "二次侧参考平面 ID", description: "二次侧 R/L 参数共同使用的参考平面。" },
  primaryMaterialStateId: { label: "一次侧材料状态 ID", description: "稳定的一次侧材料状态标识。" },
  secondaryMaterialStateId: { label: "二次侧材料状态 ID", description: "稳定的二次侧材料状态标识。" },
  primaryTemperatureK: { label: "一次侧温度", description: "一次侧材料的绝对温度。" },
  secondaryTemperatureK: { label: "二次侧温度", description: "二次侧材料的绝对温度。" },
  primaryMaterialSnapshotId: { label: "一次侧材料快照 ID", description: "内容寻址的一次侧材料快照。" },
  secondaryMaterialSnapshotId: { label: "二次侧材料快照 ID", description: "内容寻址的二次侧材料快照。" },
  coupledCircuitStateId: { label: "耦合电路状态 ID", description: "此完整耦合运行状态的稳定标识。" },
  primaryParameterSourceKind: { label: "一次侧参数来源", description: "R₁ 和 Lₚ 的受控溯源类别。" },
  secondaryParameterSourceKind: { label: "二次侧参数来源", description: "R₂ 和 Lₛ 的受控溯源类别。" },
  mutualParameterSourceKind: { label: "互感参数来源", description: "M 的受控溯源类别。" },
  primarySourceRef: { label: "一次侧参数来源引用", description: "一次侧 R/L 参数的稳定来源引用。" },
  secondarySourceRef: { label: "二次侧参数来源引用", description: "二次侧 R/L 参数的稳定来源引用。" },
  couplingSourceRef: { label: "互感来源引用", description: "互感或耦合参数的稳定来源引用。" },
  mutualSourceRef: { label: "互感来源引用", description: "互感 M 的稳定来源引用。" },
  primarySourceSnapshotId: { label: "一次侧来源快照 ID", description: "一次侧参数证据的内容寻址快照。" },
  secondarySourceSnapshotId: { label: "二次侧来源快照 ID", description: "二次侧参数证据的内容寻址快照。" },
  couplingSourceSnapshotId: { label: "互感来源快照 ID", description: "互感证据的内容寻址快照。" },
  primaryStateMatch: { label: "一次侧状态匹配", description: "一次侧参数是否已确认为当前所声明的准确状态。" },
  secondaryStateMatch: { label: "二次侧状态匹配", description: "二次侧参数是否已确认为当前所声明的准确状态。" },
  mutualStateMatch: { label: "互感状态匹配", description: "互感 M 是否已确认为同一个所声明状态。" },
  modelRegime: { label: "模型区间", description: "F-01 要求线性集总双绕组正弦稳态模型。" },
  portId: { label: "端口 ID", description: "稳定的线圈串联端口标识。" },
  referencePlaneId: { label: "参考平面 ID", description: "R、L、I 共同使用的参考平面。" },
  loadedState: { label: "负载状态", description: "R、L 和 I 共同使用的工作状态。" },
  seriesEquivalentId: { label: "串联等效 ID", description: "R/L 证据共同使用的稳定标识。" },
  quantityBasis: { label: "电流基准", description: "受控电流基准。" },
  confirmCoilSeriesPort: { label: "确认线圈串联等效端口", description: "不能是电网侧端口或整机槽路端口。" },
  confirmLinearSinusoidal: { label: "确认线性正弦稳态", description: "D-07 模型要求的工作区间。" },
  volumeFlowM3PerS: { label: "支路体积流量", description: "一个已声明支路的显式流量。" },
  flowAreaM2: { label: "水力流通面积", description: "同一几何的 D-02 水力面积。" },
  wettedPerimeterM: { label: "湿周", description: "同一几何的 D-02 湿周。" },
  branchId: { label: "支路 ID", description: "稳定的冷却支路标识。" },
  coolantNetworkId: { label: "冷却网络 ID", description: "稳定的冷却网络标识。" },
  timeBasisId: { label: "时间基准 ID", description: "各项共同使用的运行状态时间基准。" },
  flowSourceMethod: { label: "流量来源方法", description: "显式支路流量的来源。" },
  flowSourceRef: { label: "流量来源引用", description: "所提供支路流量的来源引用。" },
  flowDataQuality: { label: "流量数据质量", description: "受控数据质量分类。" },
  flowSourceSnapshotId: { label: "测量流量快照 ID", description: "仅测量流量需要；Case 输入流量会绑定到当前保存的 CaseSnapshot。" },
  flowProvenanceId: { label: "流量溯源 ID", description: "稳定的上游流量溯源记录标识。" },
  d02SourceRef: { label: "D-02 几何来源引用", description: "经验证的 D-02 圆形截面结果引用。" },
  d02DataQuality: { label: "D-02 数据质量", description: "受控数据质量分类。" },
  d02ProvenanceId: { label: "D-02 溯源 ID", description: "稳定的上游 D-02 结果溯源标识。" },
  d02SourceSnapshotId: { label: "D-02 来源快照 ID", description: "实际包含经验证 D-02 结果证据的内容寻址快照。" },
  d02GeometrySnapshotId: { label: "D-02 几何快照 ID", description: "D-02 实际使用的内容寻址几何快照。" },
  hydraulicGeometryId: { label: "水力几何 ID", description: "流通面积和湿周共同使用的几何标识。" },
  oneDeclaredBranchConfirmed: { label: "确认仅一个已声明支路", description: "所提供流量不是冷却网络总流量。" },
  verifiedD02Snapshot: { label: "确认 D-02 快照已验证", description: "面积和湿周来自有效的 D-02 圆形截面结果。" },
  sameD02HydraulicGeometryConfirmed: { label: "确认使用同一 D-02 几何", description: "面积和湿周来自同一个几何快照。" },
  controlVolumeId: { label: "控制体 ID", description: "一个已声明的线圈冷却液控制体。" },
  coolantCircuitId: { label: "冷却回路 ID", description: "一个已声明的冷却回路。" },
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
  SourceRef: { label: "来源引用", description: "稳定的来源引用。" },
  DataQuality: { label: "数据质量", description: "受控数据质量分类。" },
  SourceSnapshotId: { label: "来源快照 ID", description: "所声明测量、分析或 FEM 来源的内容寻址快照。" },
  ProvenanceId: { label: "溯源 ID", description: "上游来源提供的稳定溯源记录标识。" },
  HeatPathId: { label: "热路径 ID", description: "稳定的物理热路径标识。" },
  PhysicalHeatSourceId: { label: "物理热源 ID", description: "用于防止重复计算的稳定物理来源标识。" },
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
  if (language === "en") return fallback;
  return FIELD_ZH[fieldId]?.label ?? heatFieldTranslation(fieldId)?.label ?? fallback;
}

export function fieldDescription(fieldId: string, fallback: string, language: UiLanguage): string {
  if (language === "en") return fallback;
  return FIELD_ZH[fieldId]?.description ?? heatFieldTranslation(fieldId)?.description ?? fallback;
}

const OPTION_ZH: Readonly<Record<string, string>> = Object.freeze({
  uniform_single_layer: "均匀单层",
  multilayer: "多层",
  other: "其他",
  ADR_0003_full_axial_envelope: "ADR-0003 完整轴向包络",
  other_or_unknown: "其他或未知",
  air: "空气",
  uniform_linear: "均匀线性介质",
  confirmed_same_B01_snapshot: "已确认来自同一个 B-01 快照",
  explicit_method_or_state_bound: "已显式绑定方法或状态",
  ADR_0003_default_centroid_unresolved: "ADR-0003 默认形心语义尚未解决",
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
});

export function optionLabel(value: string, fallback: string, language: UiLanguage): string {
  if (language === "en") return fallback;
  return OPTION_ZH[value.replaceAll("-", "_")] ?? fallback;
}

const CASE_FIELD_ZH: Readonly<Record<string, string>> = Object.freeze({
  "Case name": "Case 名称",
  "Created at": "创建时间",
  "Case schema": "Case 模式版本",
  "Technical freeze": "技术冻结标识",
  "Geometry quantities": "几何量数量",
  "Material snapshots": "材料快照数量",
  "Operating conditions": "运行条件数量",
  "Method selections": "方法选择数量",
  "User inputs": "用户输入数量",
  "Measurement overrides": "测量覆盖数量",
  "FEM references": "FEM 引用数量",
  Attachments: "附件数量",
  "Material IDs": "材料 ID",
  "Selected method IDs": "已选方法 ID",
});

export function caseFieldLabel(value: string, language: UiLanguage): string {
  if (language === "en") return value;
  if (value.startsWith("Version · ")) return `版本 · ${value.slice("Version · ".length)}`;
  return CASE_FIELD_ZH[value] ?? value;
}
