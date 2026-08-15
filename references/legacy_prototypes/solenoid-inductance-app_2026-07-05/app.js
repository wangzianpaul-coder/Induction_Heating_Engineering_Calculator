(function (root) {
  const MU0 = 4 * Math.PI * 1e-7;
  const INCH_PER_MM = 1 / 25.4;
  const TABLE = [
    [0.1, 0.96],
    [0.2, 0.92],
    [0.3, 0.88],
    [0.4, 0.85],
    [0.6, 0.79],
    [0.8, 0.74],
    [1.0, 0.69],
    [1.5, 0.60],
    [2.0, 0.52],
    [3.0, 0.43],
    [4.0, 0.37],
    [5.0, 0.32],
    [10.0, 0.20],
    [20.0, 0.12],
  ];

  const samples = {
    caseE: {
      coilType: "single",
      lengthMm: 1050,
      innerDiameterMm: 378,
      turns: 18,
      radialThicknessMm: 0,
      simpsonN: 400,
    },
    long: {
      coilType: "single",
      lengthMm: 1323,
      innerDiameterMm: 220,
      turns: 23,
      radialThicknessMm: 0,
      simpsonN: 400,
    },
    short: {
      coilType: "single",
      lengthMm: 300,
      innerDiameterMm: 1027,
      turns: 4,
      radialThicknessMm: 0,
      simpsonN: 400,
    },
    multi: {
      coilType: "multi",
      lengthMm: 80,
      innerDiameterMm: 180,
      turns: 50,
      radialThicknessMm: 20,
      simpsonN: 400,
    },
  };

  const exampleDefinitions = {
    long: {
      title: "长线圈",
      definition: "单层线圈，轴向长度 l 相对平均直径 Dm 较长。工程上本 app 用 l / Dm ≥ 0.4 作为 Wheeler 单层公式的自动判断线；若 l / Dm ≥ 1，则更接近传统意义上的长螺线管。",
      params: "l = 200 mm，Din = 80 mm，N = 20，t = 0 mm",
      method: "通常优先用 Wheeler 单层公式，并用 Nagaoka 结果做对比。",
      svg: `
        <svg viewBox="0 0 360 150" role="img" aria-label="长线圈示意">
          <rect x="42" y="62" width="276" height="26" rx="13" fill="#eef2ef"/>
          <path d="M52 45 C62 78 62 72 72 105 M76 45 C86 78 86 72 96 105 M100 45 C110 78 110 72 120 105 M124 45 C134 78 134 72 144 105 M148 45 C158 78 158 72 168 105 M172 45 C182 78 182 72 192 105 M196 45 C206 78 206 72 216 105 M220 45 C230 78 230 72 240 105 M244 45 C254 78 254 72 264 105 M268 45 C278 78 278 72 288 105 M292 45 C302 78 302 72 312 105" fill="none" stroke="#167a74" stroke-width="6" stroke-linecap="round"/>
          <path d="M40 116 H320" stroke="#607078" stroke-width="2"/>
          <path d="M40 112 V120 M320 112 V120" stroke="#607078" stroke-width="2"/>
          <path d="M326 48 V105" stroke="#b96f22" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `,
    },
    short: {
      title: "短粗线圈",
      definition: "单层线圈，轴向长度 l 明显小于平均直径 Dm。这里定义为 l / Dm < 0.4，有限长度端部效应更强。",
      params: "l = 80 mm，Din = 260 mm，N = 8，t = 0 mm",
      method: "优先用 Nagaoka 积分法或查表法；Wheeler 单层结果只适合做快速对比。",
      svg: `
        <svg viewBox="0 0 360 150" role="img" aria-label="短粗线圈示意">
          <rect x="136" y="24" width="88" height="102" rx="8" fill="#eef2ef"/>
          <path d="M144 28 C160 72 160 78 176 122 M160 28 C176 72 176 78 192 122 M176 28 C192 72 192 78 208 122 M192 28 C208 72 208 78 224 122" fill="none" stroke="#167a74" stroke-width="7" stroke-linecap="round"/>
          <path d="M112 128 H248" stroke="#607078" stroke-width="2"/>
          <path d="M112 124 V132 M248 124 V132" stroke="#607078" stroke-width="2"/>
          <path d="M232 28 V122" stroke="#b96f22" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `,
    },
    multi: {
      title: "多层线圈",
      definition: "线圈在径向方向有明显绕组厚度 t，匝数分布不只是一层。这里定义为 t > 0，计算时使用平均半径/平均直径。",
      params: "l = 100 mm，Din = 120 mm，N = 60，t = 30 mm",
      method: "优先用 Wheeler 多层/厚绕组公式；Nagaoka 与单层 Wheeler 可作为辅助参考。",
      svg: `
        <svg viewBox="0 0 360 150" role="img" aria-label="多层线圈示意">
          <rect x="112" y="24" width="136" height="102" rx="8" fill="#fff7ed" stroke="#b96f22" stroke-width="4"/>
          <rect x="126" y="38" width="108" height="74" rx="6" fill="#eef2ef"/>
          <path d="M124 30 C140 72 140 78 156 120 M142 30 C158 72 158 78 174 120 M160 30 C176 72 176 78 192 120 M178 30 C194 72 194 78 210 120 M196 30 C212 72 212 78 228 120" fill="none" stroke="#167a74" stroke-width="6" stroke-linecap="round"/>
          <path d="M132 36 C148 72 148 78 164 114 M150 36 C166 72 166 78 182 114 M168 36 C184 72 184 78 200 114 M186 36 C202 72 202 78 218 114" fill="none" stroke="#0f5652" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
          <path d="M96 130 H264" stroke="#607078" stroke-width="2"/>
          <path d="M96 126 V134 M264 126 V134" stroke="#607078" stroke-width="2"/>
        </svg>
      `,
    },
  };

  function asNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function evenSegmentCount(value) {
    const n = Math.max(20, Math.min(2000, Math.round(asNumber(value, 400))));
    return n % 2 === 0 ? n : n + 1;
  }

  function positive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function format(value, digits = 4) {
    if (!Number.isFinite(value)) return "--";
    const abs = Math.abs(value);
    if (abs !== 0 && abs < 0.0001) return value.toExponential(3);
    return value.toLocaleString("zh-CN", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  }

  function signedPercent(value) {
    if (!Number.isFinite(value)) return "--";
    return `${value >= 0 ? "+" : ""}${format(value, 2)}%`;
  }

  function idealInductanceMicroH(radiusMm, lengthMm, turns) {
    if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns)) return NaN;
    const a = radiusMm / 1000;
    const b = lengthMm / 1000;
    return MU0 * turns * turns * Math.PI * a * a / b * 1e6;
  }

  function wheelerSingleMicroH(radiusMm, lengthMm, turns) {
    if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns)) return NaN;
    return INCH_PER_MM * radiusMm * radiusMm * turns * turns / (9 * radiusMm + 10 * lengthMm);
  }

  function wheelerMultiMicroH(radiusMm, lengthMm, thicknessMm, turns) {
    if (!positive(radiusMm) || !positive(lengthMm) || !positive(turns) || thicknessMm < 0) return NaN;
    return 0.8 * INCH_PER_MM * radiusMm * radiusMm * turns * turns /
      (6 * radiusMm + 9 * lengthMm + 10 * thicknessMm);
  }

  function ellipticBySimpson(k, n) {
    const segments = evenSegmentCount(n);
    const h = (Math.PI / 2) / segments;
    let sumK = 0;
    let sumE = 0;
    const sampleRows = [];

    for (let i = 0; i <= segments; i += 1) {
      const theta = i * h;
      const weight = i === 0 || i === segments ? 1 : (i % 2 === 1 ? 4 : 2);
      const under = 1 - k * k * Math.sin(theta) * Math.sin(theta);
      const fK = 1 / Math.sqrt(under);
      const fE = Math.sqrt(under);
      sumK += weight * fK;
      sumE += weight * fE;

      if (i < 8 || i === segments) {
        sampleRows.push({ i, theta, weight, fK, fE });
      } else if (i === 8) {
        sampleRows.push({ gap: true });
      }
    }

    return {
      n: segments,
      F: (h / 3) * sumK,
      E: (h / 3) * sumE,
      sampleRows,
    };
  }

  function nagaokaCoefficient(radiusMm, lengthMm, n = 400) {
    if (!positive(radiusMm) || !positive(lengthMm)) {
      return { kn: NaN, k: NaN, F: NaN, E: NaN, n: evenSegmentCount(n), sampleRows: [] };
    }

    const a = radiusMm;
    const b = lengthMm;
    const rootTerm = Math.sqrt(4 * a * a + b * b);
    const k = (2 * a) / rootTerm;
    const integral = ellipticBySimpson(k, n);
    const kn = (
      ((b * rootTerm) / (a * a)) * (integral.F - integral.E) +
      ((4 * rootTerm) / b) * integral.E -
      ((8 * a) / b)
    ) / (3 * Math.PI);

    return {
      kn,
      k,
      F: integral.F,
      E: integral.E,
      n: integral.n,
      sampleRows: integral.sampleRows,
    };
  }

  function nagaokaMicroH(radiusMm, lengthMm, turns, n = 400) {
    const coeff = nagaokaCoefficient(radiusMm, lengthMm, n);
    return {
      ...coeff,
      ideal: idealInductanceMicroH(radiusMm, lengthMm, turns),
      inductance: idealInductanceMicroH(radiusMm, lengthMm, turns) * coeff.kn,
    };
  }

  function tableLookupKn(ratio) {
    const x = asNumber(ratio, NaN);
    if (!Number.isFinite(x)) {
      return { kn: NaN, status: "invalid", interval: "请输入有效数字" };
    }

    if (x < TABLE[0][0]) {
      return {
        kn: NaN,
        status: "out-low",
        interval: `小于表格下限 ${TABLE[0][0]}`,
      };
    }

    const last = TABLE[TABLE.length - 1];
    if (x > last[0]) {
      return {
        kn: NaN,
        status: "out-high",
        interval: `大于表格上限 ${last[0]}`,
      };
    }

    for (let i = 0; i < TABLE.length; i += 1) {
      if (Math.abs(TABLE[i][0] - x) < 1e-12) {
        return {
          kn: TABLE[i][1],
          status: "exact",
          interval: `命中表值 ${TABLE[i][0]}`,
          low: TABLE[i],
          high: TABLE[i],
        };
      }
    }

    for (let i = 0; i < TABLE.length - 1; i += 1) {
      const low = TABLE[i];
      const high = TABLE[i + 1];
      if (x > low[0] && x < high[0]) {
        const t = (x - low[0]) / (high[0] - low[0]);
        return {
          kn: low[1] + t * (high[1] - low[1]),
          status: "interpolated",
          interval: `线性插值区间 ${low[0]} - ${high[0]}`,
          low,
          high,
        };
      }
    }

    return { kn: NaN, status: "invalid", interval: "未找到区间" };
  }

  function normalizeInputs(raw) {
    const coilType = raw.coilType === "multi" ? "multi" : "single";
    const radialThicknessMm = coilType === "multi" ? Math.max(0, asNumber(raw.radialThicknessMm, 0)) : 0;
    return {
      coilType,
      lengthMm: asNumber(raw.lengthMm, NaN),
      innerDiameterMm: asNumber(raw.innerDiameterMm, NaN),
      turns: asNumber(raw.turns, NaN),
      radialThicknessMm,
      simpsonN: evenSegmentCount(raw.simpsonN),
    };
  }

  function calculate(raw) {
    const input = normalizeInputs(raw);
    const valid = positive(input.lengthMm) && positive(input.innerDiameterMm) && positive(input.turns);
    if (!valid) {
      return { input, valid: false, error: "线圈长度、直径和匝数必须大于 0。" };
    }

    const meanDiameterMm = input.innerDiameterMm + input.radialThicknessMm;
    const radiusMm = meanDiameterMm / 2;
    const aspectLD = input.lengthMm / meanDiameterMm;
    const aspectDL = meanDiameterMm / input.lengthMm;
    const ideal = idealInductanceMicroH(radiusMm, input.lengthMm, input.turns);
    const nagaoka = nagaokaMicroH(radiusMm, input.lengthMm, input.turns, input.simpsonN);
    const table = tableLookupKn(aspectDL);
    const tableInductance = Number.isFinite(table.kn) ? ideal * table.kn : NaN;
    const wheelerSingle = wheelerSingleMicroH(radiusMm, input.lengthMm, input.turns);
    const wheelerMulti = wheelerMultiMicroH(radiusMm, input.lengthMm, input.radialThicknessMm, input.turns);
    const wheelerError = ((wheelerSingle - nagaoka.inductance) / nagaoka.inductance) * 100;

    let method = "";
    let selected = NaN;
    let reason = "";
    let status = "ok";

    if (input.coilType === "multi") {
      method = "Wheeler 多层公式";
      selected = wheelerMulti;
      reason = `已选择多层/厚绕组，采用 Wheeler 多层公式；平均直径 Dm = ${format(meanDiameterMm, 2)} mm。`;
      if (input.radialThicknessMm === 0) {
        status = "warn";
        reason += " 当前径向厚度为 0，结果会退化为薄绕组近似。";
      }
    } else if (aspectLD >= 0.4) {
      method = "Wheeler 单层公式";
      selected = wheelerSingle;
      reason = `单层线圈且 l / Dm = ${format(aspectLD, 4)} ≥ 0.4，满足 Wheeler 单层常用适用条件。`;
    } else {
      method = "Nagaoka 积分法";
      selected = nagaoka.inductance;
      reason = `单层线圈但 l / Dm = ${format(aspectLD, 4)} < 0.4，属于短粗线圈，优先采用 Nagaoka 系数修正。`;
    }

    return {
      input,
      valid: true,
      geometry: {
        meanDiameterMm,
        radiusMm,
        aspectLD,
        aspectDL,
      },
      ideal,
      nagaoka,
      table,
      tableInductance,
      wheelerSingle,
      wheelerMulti,
      wheelerError,
      method,
      selected,
      reason,
      status,
    };
  }

  const api = {
    MU0,
    TABLE,
    samples,
    format,
    calculate,
    idealInductanceMicroH,
    wheelerSingleMicroH,
    wheelerMultiMicroH,
    ellipticBySimpson,
    nagaokaCoefficient,
    nagaokaMicroH,
    tableLookupKn,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.SolenoidCalc = api;

  if (typeof document === "undefined") return;

  const els = {};
  const ids = [
    "coilType", "lengthMm", "innerDiameterMm", "turns", "radialThicknessMm", "simpsonN",
    "topMethod", "topInductance", "recommendedMethod", "methodReason", "decisionBand",
    "selectedInductance", "ratioLD", "knIntegral", "idealInductance", "methodRows",
    "wheelerSingleNow", "wheelerMultiNow", "wheelerConditionNow", "nagaokaRatioNow",
    "nagaokaKNow", "nagaokaKnNow", "nagaokaLNow", "lookupRatio", "lookupKn",
    "lookupInterval", "lookupTableRows", "integrationNNow", "integrationFNow",
    "integrationENow", "integrationKnNow", "convergenceRows", "simpsonRows",
    "coilCanvas", "syncLookupButton", "exampleFigure", "exampleTitle",
    "exampleDefinition", "exampleParams", "exampleMethod",
  ];

  ids.forEach((id) => {
    els[id] = document.getElementById(id);
  });

  function text(id, value) {
    if (els[id]) els[id].innerHTML = value;
  }

  function inputValue(id) {
    return els[id] ? els[id].value : "";
  }

  function readInputs() {
    return {
      coilType: inputValue("coilType"),
      lengthMm: inputValue("lengthMm"),
      innerDiameterMm: inputValue("innerDiameterMm"),
      turns: inputValue("turns"),
      radialThicknessMm: inputValue("radialThicknessMm"),
      simpsonN: inputValue("simpsonN"),
    };
  }

  function setInputs(sample) {
    if (!sample) return;
    els.coilType.value = sample.coilType;
    els.lengthMm.value = sample.lengthMm;
    els.innerDiameterMm.value = sample.innerDiameterMm;
    els.turns.value = sample.turns;
    els.radialThicknessMm.value = sample.radialThicknessMm;
    els.simpsonN.value = sample.simpsonN;
    update();
  }

  function renderExample(kind) {
    const example = exampleDefinitions[kind] || exampleDefinitions.long;
    text("exampleFigure", example.svg);
    text("exampleTitle", example.title);
    text("exampleDefinition", example.definition);
    text("exampleParams", example.params);
    text("exampleMethod", example.method);
    document.querySelectorAll(".example-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.example === kind);
    });
  }

  function renderMethodRows(result) {
    if (!result.valid) {
      els.methodRows.innerHTML = `<tr><td colspan="3">${result.error}</td></tr>`;
      return;
    }

    const singleStatus = result.geometry.aspectLD >= 0.4
      ? `<span class="status-pill">满足 l/D ≥ 0.4</span>`
      : `<span class="status-pill warn">短粗线圈慎用</span>`;
    const multiStatus = result.input.coilType === "multi"
      ? `<span class="status-pill">多层推荐</span>`
      : `<span class="status-pill soft">用于厚绕组对比</span>`;
    const tableStatus = Number.isFinite(result.tableInductance)
      ? `<span class="status-pill soft">${result.table.interval}</span>`
      : `<span class="status-pill warn">${result.table.interval}</span>`;

    const rows = [
      ["推荐结果", `${format(result.selected, 4)} μH`, `<span class="status-pill">${result.method}</span>`],
      ["Nagaoka 积分法", `${format(result.nagaoka.inductance, 4)} μH`, `K<sub>N</sub> = ${format(result.nagaoka.kn, 6)}`],
      ["Nagaoka 查表法", Number.isFinite(result.tableInductance) ? `${format(result.tableInductance, 4)} μH` : "--", tableStatus],
      ["Wheeler 单层", `${format(result.wheelerSingle, 4)} μH`, `${singleStatus} <span class="number">相对积分法 ${signedPercent(result.wheelerError)}</span>`],
      ["Wheeler 多层", `${format(result.wheelerMulti, 4)} μH`, multiStatus],
    ];

    els.methodRows.innerHTML = rows.map((row) => `
      <tr>
        <td>${row[0]}</td>
        <td class="number">${row[1]}</td>
        <td>${row[2]}</td>
      </tr>
    `).join("");
  }

  function renderLookupTable(activeRatio) {
    els.lookupTableRows.innerHTML = TABLE.map(([ratio, kn]) => {
      const active = Math.abs(ratio - activeRatio) < 1e-12 ? " class=\"highlight\"" : "";
      return `<tr${active}><td class="number">${ratio}</td><td class="number">${kn}</td></tr>`;
    }).join("");
  }

  function renderLookup() {
    const ratio = asNumber(els.lookupRatio.value, NaN);
    const lookup = tableLookupKn(ratio);
    text("lookupKn", Number.isFinite(lookup.kn) ? format(lookup.kn, 6) : "--");
    text("lookupInterval", lookup.interval);
    renderLookupTable(ratio);
  }

  function renderIntegration(result) {
    if (!result.valid) {
      ["integrationNNow", "integrationFNow", "integrationENow", "integrationKnNow"].forEach((id) => text(id, "--"));
      els.convergenceRows.innerHTML = "";
      els.simpsonRows.innerHTML = "";
      return;
    }

    text("integrationNNow", result.nagaoka.n);
    text("integrationFNow", format(result.nagaoka.F, 8));
    text("integrationENow", format(result.nagaoka.E, 8));
    text("integrationKnNow", format(result.nagaoka.kn, 8));

    const convNs = [50, 100, 200, 400, 800].filter((n) => n <= 2000);
    els.convergenceRows.innerHTML = convNs.map((n) => {
      const item = nagaokaMicroH(result.geometry.radiusMm, result.input.lengthMm, result.input.turns, n);
      return `<tr><td class="number">${item.n}</td><td class="number">${format(item.kn, 8)}</td><td class="number">${format(item.inductance, 5)} μH</td></tr>`;
    }).join("");

    els.simpsonRows.innerHTML = result.nagaoka.sampleRows.map((row) => {
      if (row.gap) return `<tr><td colspan="5">...</td></tr>`;
      return `
        <tr>
          <td class="number">${row.i}</td>
          <td class="number">${format(row.theta, 8)}</td>
          <td class="number">${row.weight}</td>
          <td class="number">${format(row.fK, 8)}</td>
          <td class="number">${format(row.fE, 8)}</td>
        </tr>
      `;
    }).join("");
  }

  function drawCoil(result) {
    const canvas = els.coilCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const height = 260;
    canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fbfcfa";
    ctx.fillRect(0, 0, width, height);

    if (!result.valid) {
      ctx.fillStyle = "#607078";
      ctx.font = "15px Microsoft YaHei, sans-serif";
      ctx.fillText("请输入有效参数", 24, 42);
      return;
    }

    const labelY = 30;
    ctx.font = "15px Microsoft YaHei, sans-serif";
    ctx.fillStyle = "#1d2528";
    ctx.textAlign = "left";
    ctx.fillText(`N = ${format(result.input.turns, 2)}`, 24, labelY);
    ctx.textAlign = "right";
    ctx.fillText(`Dm = ${format(result.geometry.meanDiameterMm, 1)} mm`, width - 24, labelY);

    const maxW = Math.max(160, width - 150);
    const maxH = 126;
    const length = result.input.lengthMm;
    const diameter = result.geometry.meanDiameterMm;
    const scale = Math.min(maxW / length, maxH / diameter);
    const coilW = Math.max(92, Math.min(maxW, length * scale));
    const coilH = Math.max(58, Math.min(maxH, diameter * scale));
    const x0 = (width - coilW) / 2;
    const y0 = 70 + (maxH - coilH) / 2;
    const cy = y0 + coilH / 2;

    ctx.fillStyle = "#eef2ef";
    ctx.fillRect(x0, y0 + coilH * 0.28, coilW, coilH * 0.44);
    ctx.strokeStyle = "#cfd9d4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0 + coilH * 0.28, coilW, coilH * 0.44);

    const cycles = Math.max(5, Math.min(24, Math.round(result.input.turns)));
    const steps = cycles * 28;
    const amp = coilH * 0.42;

    function helix(color, lineWidth, phase, yOffset, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const x = x0 + coilW * t;
        const y = cy + Math.sin(t * cycles * Math.PI * 2 + phase) * amp + yOffset;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    helix("#6bb6ae", 2.4, Math.PI, 0, 0.75);
    helix("#167a74", 3.2, 0, 0, 1);

    if (result.input.coilType === "multi" && result.input.radialThicknessMm > 0) {
      ctx.strokeStyle = "#b96f22";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(x0 - 7, y0 - 7, coilW + 14, coilH + 14);
      helix("#0f5652", 2.2, Math.PI / 3, 7, 0.8);
      helix("#b96f22", 2, Math.PI * 1.15, -7, 0.8);
    }

    ctx.strokeStyle = "#607078";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x0, height - 45);
    ctx.lineTo(x0 + coilW, height - 45);
    ctx.moveTo(x0, height - 50);
    ctx.lineTo(x0, height - 40);
    ctx.moveTo(x0 + coilW, height - 50);
    ctx.lineTo(x0 + coilW, height - 40);
    ctx.moveTo(x0 + coilW + 20, y0);
    ctx.lineTo(x0 + coilW + 20, y0 + coilH);
    ctx.moveTo(x0 + coilW + 15, y0);
    ctx.lineTo(x0 + coilW + 25, y0);
    ctx.moveTo(x0 + coilW + 15, y0 + coilH);
    ctx.lineTo(x0 + coilW + 25, y0 + coilH);
    ctx.stroke();

    ctx.fillStyle = "#1d2528";
    ctx.font = "14px Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`l = ${format(result.input.lengthMm, 1)} mm`, width / 2, height - 18);
  }

  function render(result) {
    if (!result.valid) {
      text("topMethod", "输入无效");
      text("topInductance", "-- μH");
      text("recommendedMethod", "输入无效");
      text("methodReason", result.error);
      text("selectedInductance", "--");
      text("ratioLD", "--");
      text("knIntegral", "--");
      text("idealInductance", "--");
      renderMethodRows(result);
      drawCoil(result);
      return;
    }

    text("topMethod", result.method);
    text("topInductance", `${format(result.selected, 3)} μH`);
    text("recommendedMethod", result.method);
    text("methodReason", result.reason);
    els.decisionBand.classList.toggle("warn", result.status === "warn");

    text("selectedInductance", format(result.selected, 4));
    text("ratioLD", format(result.geometry.aspectLD, 5));
    text("knIntegral", format(result.nagaoka.kn, 6));
    text("idealInductance", format(result.ideal, 4));

    renderMethodRows(result);
    drawCoil(result);

    text("wheelerSingleNow", `${format(result.wheelerSingle, 5)} μH`);
    text("wheelerMultiNow", `${format(result.wheelerMulti, 5)} μH`);
    text("wheelerConditionNow", result.geometry.aspectLD >= 0.4
      ? `l / Dm = ${format(result.geometry.aspectLD, 5)}，满足单层 Wheeler 常用条件。`
      : `l / Dm = ${format(result.geometry.aspectLD, 5)}，单层 Wheeler 仅作对比。`);

    text("nagaokaRatioNow", format(result.geometry.aspectDL, 6));
    text("nagaokaKNow", format(result.nagaoka.k, 8));
    text("nagaokaKnNow", format(result.nagaoka.kn, 8));
    text("nagaokaLNow", `${format(result.nagaoka.inductance, 5)} μH`);

    renderIntegration(result);
  }

  function update() {
    els.radialThicknessMm.disabled = inputValue("coilType") !== "multi";
    const result = calculate(readInputs());
    render(result);
  }

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
      update();
      if (page === "lookup") renderLookup();
    });
  });

  ["coilType", "lengthMm", "innerDiameterMm", "turns", "radialThicknessMm", "simpsonN"].forEach((id) => {
    els[id].addEventListener("input", update);
    els[id].addEventListener("change", update);
  });

  document.querySelectorAll(".example-button").forEach((button) => {
    button.addEventListener("click", () => renderExample(button.dataset.example));
  });

  els.syncLookupButton.addEventListener("click", () => {
    const result = calculate(readInputs());
    if (result.valid) {
      els.lookupRatio.value = format(result.geometry.aspectDL, 6).replace(/,/g, "");
      renderLookup();
    }
  });

  els.lookupRatio.addEventListener("input", renderLookup);
  window.addEventListener("resize", () => drawCoil(calculate(readInputs())));

  renderLookupTable(NaN);
  renderExample("long");
  update();
  els.syncLookupButton.click();
})(typeof window !== "undefined" ? window : globalThis);
