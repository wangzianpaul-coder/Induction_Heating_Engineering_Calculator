import type {
  UiLegacyBasicCalculatorApplication,
  UiLegacyBasicCalculatorResult,
  UiLegacyBasicValidResult,
} from "../ui-model.js";

export type LegacyBasicPage =
  | "calculator"
  | "wheeler"
  | "nagaoka"
  | "lookup"
  | "integration"
  | "material"
  | "electrical"
  | "cooling"
  | "scenarios";

export const LEGACY_BASIC_TABS: readonly Readonly<{ readonly id: LegacyBasicPage; readonly label: string }>[] = Object.freeze([
  { id: "calculator", label: "主计算" },
  { id: "wheeler", label: "Wheeler 公式" },
  { id: "nagaoka", label: "Nagaoka 公式" },
  { id: "lookup", label: "系数查表" },
  { id: "integration", label: "积分迭代" },
  { id: "material", label: "几何与材料" },
  { id: "electrical", label: "电气匹配" },
  { id: "cooling", label: "损耗与冷却" },
  { id: "scenarios", label: "工程场景" },
]);

export function legacyDisplay(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "--";
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute < 0.0001 || absolute >= 1e8)) return value.toExponential(3);
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function valueWithUnit(value: number, unit: string, digits = 4): string {
  if (!Number.isFinite(value)) return "--";
  return `${legacyDisplay(value, digits)} ${unit}`;
}

function FormulaBox({ title, formula, note }: {
  readonly title?: string;
  readonly formula: string;
  readonly note?: string;
}) {
  return <div className="basic-matching-formula">{title === undefined ? null : <p>{title}</p>}<code>{formula}</code>{note === undefined ? null : <span>{note}</span>}</div>;
}

function DetailList({ rows }: { readonly rows: readonly (readonly [string, string])[] }) {
  return <dl className="basic-matching-details">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function NotReady() {
  return <div className="empty-state"><span aria-hidden="true" className="empty-state__glyph">i</span><div><strong>等待有效的线圈几何输入</strong><p>修正主计算页中的线圈高度、内径、匝数和径向宽度后，本页会自动更新。</p></div></div>;
}

function WheelerPage({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  return <div className="basic-matching-reference-grid"><article className="basic-matching-info"><p className="eyebrow">Wheeler 公式</p><h2>空气芯线圈的工程经验式</h2><FormulaBox formula="L(μH) = r²N² / (9r + 10l)" note="r、l 使用 inch；r 为平均半径。" title="单层螺线管" /><FormulaBox formula="L(μH) = 0.8r²N² / (6r + 9l + 10t)" note="r、l、t 使用 inch；t 为径向绕组厚度。" title="多层或厚绕组" /><p className="basic-matching-note">自动判断中，仅当 l / Dm ≥ 0.4 时采用 Wheeler；单层选单层式，多层选多层式。</p></article><article className="basic-matching-info"><h2>当前输入结果</h2>{result.valid ? <DetailList rows={[
    ["平均半径 r", `${valueWithUnit(result.geometry.radiusMm, "mm", 4)} / ${valueWithUnit(result.geometry.radiusMm / 25.4, "inch", 6)}`],
    ["单层 Wheeler", valueWithUnit(result.inductance.wheelerSingle, "μH", 6)],
    ["多层 Wheeler", valueWithUnit(result.inductance.wheelerMulti, "μH", 6)],
    ["当前适用判断", result.geometry.aspectLD >= 0.4 ? `l / Dm = ${legacyDisplay(result.geometry.aspectLD, 6)}，进入 Wheeler 分支。` : `l / Dm = ${legacyDisplay(result.geometry.aspectLD, 6)}，当前仅作对比。`],
  ]} /> : <NotReady />}</article></div>;
}

function NagaokaPage({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  return <div className="basic-matching-reference-grid"><article className="basic-matching-info"><p className="eyebrow">Nagaoka / 长冈系数</p><h2>有限长螺线管修正</h2><FormulaBox formula="L₀ = Kₙ · μ₀ · N² · πa² / b" note="a 为平均半径，b 为线圈轴向长度。" title="有限长空芯电感" /><FormulaBox formula="k = 2a / √(4a² + b²)" note="Kₙ 由第一类与第二类完全椭圆积分 F(k)、E(k) 求得。" title="椭圆积分模数" /><FormulaBox formula="Kₙ = { [b√(4a²+b²)/a²][F−E] + [4√(4a²+b²)/b]E − 8a/b } / 3π" title="长冈系数" /></article><article className="basic-matching-info"><h2>当前输入结果</h2>{result.valid ? <DetailList rows={[
    ["Dm / l", legacyDisplay(result.geometry.aspectDL, 8)],
    ["模数 k", legacyDisplay(result.inductance.nagaokaIntegral.k, 10)],
    ["积分 KN", legacyDisplay(result.inductance.nagaokaIntegral.kn, 10)],
    ["当前采用 KN", `${legacyDisplay(result.inductance.selectedKn, 10)} · ${result.inductance.knSourceLabel}`],
    ["Nagaoka 电感", valueWithUnit(result.inductance.nagaokaSelectedInductance, "μH", 6)],
  ]} /> : <NotReady />}</article></div>;
}

function LookupPage({ application, lookupRatio, onLookupRatioChange, onSync }: {
  readonly application: UiLegacyBasicCalculatorApplication;
  readonly lookupRatio: string;
  readonly onLookupRatioChange: (value: string) => void;
  readonly onSync: () => void;
}) {
  const ratio = Number(lookupRatio);
  const lookup = application.lookupKn(ratio);
  return <div className="basic-matching-lookup-grid"><article className="basic-matching-info basic-matching-lookup-control"><div className="panel-heading"><div><p className="eyebrow">线性插值</p><h2>Nagaoka 系数查表</h2></div><button className="button button--secondary" onClick={onSync} type="button">同步主页面</button></div><label className="basic-matching-lookup-field"><span>查表参数 2R / l = Dm / l</span><input min="0.001" onChange={(event) => onLookupRatioChange(event.currentTarget.value)} step="0.01" type="number" value={lookupRatio} /></label><div className="basic-matching-lookup-result"><span>线性插值 KN</span><strong>{Number.isFinite(lookup.kn) ? legacyDisplay(lookup.kn, 8) : "--"}</strong><em>{lookup.interval}</em></div><p className="basic-matching-note">查表范围外不进行外推；主计算若选用查表法，将自动回退到积分值并给出提示。</p></article><article className="basic-matching-info basic-matching-table-panel"><table className="basic-matching-table"><thead><tr><th>2R / l</th><th>KN</th></tr></thead><tbody>{application.nagaokaTable.map(([nodeRatio, kn]) => <tr className={Math.abs(nodeRatio - ratio) < 1e-12 ? "is-highlighted" : undefined} key={nodeRatio}><td>{legacyDisplay(nodeRatio, 2)}</td><td>{legacyDisplay(kn, 4)}</td></tr>)}</tbody></table></article></div>;
}

function IntegrationPage({ application, result }: {
  readonly application: UiLegacyBasicCalculatorApplication;
  readonly result: UiLegacyBasicCalculatorResult;
}) {
  if (!result.valid) return <NotReady />;
  const counts = [50, 100, 200, 400, 800] as const;
  const reference = application.nagaokaMicroH(result.geometry.radiusMm, result.input.coilLengthMm, result.input.turns, 800);
  const convergence = counts.map((n) => {
    const item = application.nagaokaMicroH(result.geometry.radiusMm, result.input.coilLengthMm, result.input.turns, n);
    const relative = Number.isFinite(reference.kn) && reference.kn !== 0 ? (item.kn - reference.kn) / reference.kn * 100 : Number.NaN;
    return { item, relative };
  });
  return <><div className="basic-matching-reference-grid basic-matching-reference-grid--wide"><article className="basic-matching-info"><p className="eyebrow">Simpson 数值积分</p><h2>积分迭代计算</h2><FormulaBox formula="F(k) = ∫₀^{π/2} [1 − k²sin²θ]⁻¹ᐟ² dθ" title="第一类完全椭圆积分" /><FormulaBox formula="E(k) = ∫₀^{π/2} [1 − k²sin²θ]¹ᐟ² dθ" title="第二类完全椭圆积分" /><DetailList rows={[
    ["当前 n", String(result.inductance.nagaokaIntegral.n)],
    ["F(k)", legacyDisplay(result.inductance.nagaokaIntegral.F, 10)],
    ["E(k)", legacyDisplay(result.inductance.nagaokaIntegral.E, 10)],
    ["KN", legacyDisplay(result.inductance.nagaokaIntegral.kn, 10)],
  ]} /></article><article className="basic-matching-info"><h2>收敛检查</h2><div className="table-scroll"><table className="basic-matching-table"><thead><tr><th>n</th><th>KN</th><th>L₀</th><th>相对 n=800</th></tr></thead><tbody>{convergence.map(({ item, relative }) => <tr key={item.n}><td>{item.n}</td><td>{legacyDisplay(item.kn, 10)}</td><td>{valueWithUnit(item.inductance, "μH", 7)}</td><td>{valueWithUnit(relative, "%", 7)}</td></tr>)}</tbody></table></div></article></div><article className="basic-matching-info basic-matching-info--full"><h2>积分节点示例</h2><div className="table-scroll"><table className="basic-matching-table"><thead><tr><th>i</th><th>θ</th><th>权重</th><th>fK</th><th>fE</th></tr></thead><tbody>{result.inductance.nagaokaIntegral.sampleRows.map((row, index) => row.gap === true ? <tr key={`gap-${index}`}><td colSpan={5}>...</td></tr> : <tr key={row.i}><td>{row.i}</td><td>{legacyDisplay(row.theta ?? Number.NaN, 10)}</td><td>{row.weight}</td><td>{legacyDisplay(row.fF ?? Number.NaN, 10)}</td><td>{legacyDisplay(row.fE ?? Number.NaN, 10)}</td></tr>)}</tbody></table></div></article></>;
}

function MaterialPage({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  return <div className="basic-matching-reference-grid"><article className="basic-matching-info"><p className="eyebrow">几何关系</p><h2>尺寸与填充系数</h2><FormulaBox formula="Dout = D₁ + 2wrad　；　Dm = (D₁ + Dout) / 2" title="线圈外径与平均直径" /><FormulaBox formula="l / Dm = L₁ / Dm　；　kf = N · hcu / L₁" title="长径比与填充系数" /><p className="basic-matching-note">kf 是沿线圈轴向的几何占比；大于 1 时说明当前匝数、铜管高度与线圈高度组合发生重叠，应重新核对。</p></article><article className="basic-matching-info"><p className="eyebrow">电磁材料</p><h2>肌肤深度</h2><FormulaBox formula="δ = √[2ρ / (2πf μ₀ μr)]" note="电阻率由 ×10⁻⁶ Ω·cm 换算为 Ω·m；输出为 mm。" />{result.valid ? <DetailList rows={[
    ["线圈外径 Dout", valueWithUnit(result.geometry.outerDiameterMm, "mm", 4)],
    ["平均直径 Dm", valueWithUnit(result.geometry.meanDiameterMm, "mm", 4)],
    ["长径比 l / Dm", legacyDisplay(result.geometry.aspectLD, 8)],
    ["填充系数 kf", legacyDisplay(result.geometry.fillFactor, 8)],
    ["铜管肌肤深度", valueWithUnit(result.material.copperSkinDepthMm, "mm", 8)],
    ["炉料肌肤深度", valueWithUnit(result.material.workpieceSkinDepthMm, "mm", 8)],
  ]} /> : <NotReady />}</article></div>;
}

function ElectricalPage({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  return <div className="basic-matching-reference-grid"><article className="basic-matching-info"><p className="eyebrow">电气匹配链</p><h2>电流、等效电感与线圈电压</h2><FormulaBox formula="I = √(P / Req)" title="由有功功率反推电流" /><FormulaBox formula="Leq = Q · Req / (2πf)" title="由目标品质因数反推等效电感" /><FormulaBox formula="UL = I · 2πf · Leq　；　UR = I · Req" title="线圈电压" /><FormulaBox formula="n = krect · ULL / UR" title="变压器匝数比估算" /></article><article className="basic-matching-info"><h2>当前输入结果</h2>{result.valid ? <DetailList rows={[
    ["感应线圈电流 I", valueWithUnit(result.electrical.currentA, "A", 6)],
    ["等效电阻 Req", valueWithUnit(result.electrical.equivalentResistanceOhm, "Ω", 8)],
    ["等效电感 Leq", valueWithUnit(result.electrical.equivalentInductanceMicroH, "μH", 8)],
    ["线圈电压 UL", valueWithUnit(result.electrical.coilVoltageV, "V", 6)],
    ["有功电压 UR", valueWithUnit(result.electrical.activeVoltageV, "V", 6)],
    ["变压器匝数比 n", legacyDisplay(result.electrical.transformerRatio, 8)],
  ]} /> : <NotReady />}<p className="basic-matching-note">Req 是原表中的经验校准输入，并非由本页几何参数自动求得。</p></article></div>;
}

function CoolingPage({ result }: { readonly result: UiLegacyBasicCalculatorResult }) {
  return <div className="basic-matching-reference-grid"><article className="basic-matching-info"><p className="eyebrow">铜损</p><h2>线圈损耗</h2><FormulaBox formula="Pcu = I² · Rcu,ac" note="输出换算为 kW。" /><p className="basic-matching-note">Rcu,ac 按原表作为固定交流铜阻输入；它通常包含肌肤效应与邻近效应带来的交流增量。</p></article><article className="basic-matching-info"><p className="eyebrow">热平衡</p><h2>冷却水流量</h2><FormulaBox formula="Qwater = kcool · Pcu / [ρwater · cp · (Tout − Tin)]" note="完成 W、s 与 L/min 的单位换算后输出。" />{result.valid ? <DetailList rows={[
    ["线圈电流 I", valueWithUnit(result.electrical.currentA, "A", 6)],
    ["线圈损耗 Pcu", valueWithUnit(result.cooling.coilLossKw, "kW", 8)],
    ["允许温升 ΔT", valueWithUnit(result.cooling.temperatureRiseC, "°C", 4)],
    ["冷却水流量", valueWithUnit(result.cooling.waterFlowLMin, "L/min", 8)],
  ]} /> : <NotReady />}</article></div>;
}

const SCENARIOS = Object.freeze([
  ["感应加热炉管与圆柱工件", "由线圈几何得到空芯电感，同时用炉料电阻率、相对磁导率和频率估算电磁场在工件中的穿透深度。", "coil"],
  ["中频电源与匹配变压器", "根据额定功率、经验等效电阻和目标品质因数估算线圈电流、电压与变压器匝数比。", "power"],
  ["谐振补偿与参数复核", "将计算得到的空芯电感与目标等效电感并列比较，为补偿电容和谐振网络的进一步设计提供输入。", "resonance"],
  ["线圈水冷系统初步选型", "由交流铜阻和线圈电流得到铜损，再依据允许温升、比热、密度与安全系数估算所需流量。", "cooling"],
] as const);

function ScenariosPage() {
  return <div className="basic-matching-scenario-grid">{SCENARIOS.map(([title, copy, kind]) => <article className="basic-matching-scenario" key={title}><div aria-hidden="true" className={`basic-matching-scene basic-matching-scene--${kind}`}><span /><i /><b /></div><h2>{title}</h2><p>{copy}</p></article>)}</div>;
}

export function LegacyReferencePage({ application, page, result, lookupRatio, onLookupRatioChange, onSyncLookup }: {
  readonly application: UiLegacyBasicCalculatorApplication;
  readonly page: Exclude<LegacyBasicPage, "calculator">;
  readonly result: UiLegacyBasicCalculatorResult;
  readonly lookupRatio: string;
  readonly onLookupRatioChange: (value: string) => void;
  readonly onSyncLookup: () => void;
}) {
  if (page === "wheeler") return <WheelerPage result={result} />;
  if (page === "nagaoka") return <NagaokaPage result={result} />;
  if (page === "lookup") return <LookupPage application={application} lookupRatio={lookupRatio} onLookupRatioChange={onLookupRatioChange} onSync={onSyncLookup} />;
  if (page === "integration") return <IntegrationPage application={application} result={result} />;
  if (page === "material") return <MaterialPage result={result} />;
  if (page === "electrical") return <ElectricalPage result={result} />;
  if (page === "cooling") return <CoolingPage result={result} />;
  return <ScenariosPage />;
}

export function validLegacyResult(result: UiLegacyBasicCalculatorResult): result is UiLegacyBasicValidResult {
  return result.valid;
}
