(function () {
  "use strict";

  const form = document.getElementById("fortune-form");
  const errorEl = document.getElementById("form-error");
  const resultPanel = document.getElementById("result-panel");
  const emptyPanel = document.getElementById("empty-panel");
  const resetBtn = document.getElementById("reset-btn");
  const queryYearInput = document.getElementById("query-year");

  const now = new Date();
  queryYearInput.value = now.getFullYear();

  // 預設出生日期：示例用 1990-01-01，不強制
  const birthdate = document.getElementById("birthdate");
  if (!birthdate.value) {
    birthdate.max = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function showError(msg) {
    errorEl.hidden = !msg;
    errorEl.textContent = msg || "";
  }

  function getSelectedPlace() {
    const select = document.getElementById("birthplace");
    const option = select.options[select.selectedIndex];
    if (!option || !option.value) return null;
    return {
      name: option.value,
      lng: parseFloat(option.dataset.lng || "120"),
      lat: parseFloat(option.dataset.lat || "25"),
    };
  }

  function parseDateTime() {
    const dateVal = document.getElementById("birthdate").value;
    const timeVal = document.getElementById("birthtime").value;
    if (!dateVal) throw new Error("請選擇出生年月日。");
    if (!timeVal) throw new Error("請選擇出生時間。");

    const [y, m, d] = dateVal.split("-").map(Number);
    const [h, mi] = timeVal.split(":").map(Number);
    if (!y || !m || !d) throw new Error("出生日期格式不正確。");
    return { year: y, month: m, day: d, hour: h, minute: mi || 0 };
  }

  /**
   * 五角形能力值雷達圖（SVG）
   * @param {string[]} labels 五個軸標籤
   * @param {number[]} values 五個數值
   * @param {object} opts maxVal, color, size, valueFormat
   */
  function radarChartHtml(labels, values, opts) {
    const options = opts || {};
    const size = options.size || 300;
    const color = options.color || "#b8860b";
    const fill = options.fill || "rgba(184, 134, 11, 0.28)";
    const maxVal = options.maxVal || Math.max(...values.map(Number), 1);
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.34;
    const n = 5;
    const levels = 4;

    function pt(i, ratio) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + maxR * ratio * Math.cos(angle), cy + maxR * ratio * Math.sin(angle)];
    }

    function poly(ratio) {
      return Array.from({ length: n }, (_, i) => pt(i, ratio).join(",")).join(" ");
    }

    const grid = Array.from({ length: levels }, (_, li) => {
      const r = (li + 1) / levels;
      return `<polygon class="radar-grid" points="${poly(r)}" />`;
    }).join("");

    const axes = Array.from({ length: n }, (_, i) => {
      const [x, y] = pt(i, 1);
      return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" />`;
    }).join("");

    const dataPts = values.map((v, i) => {
      const ratio = Math.max(0, Math.min(1, Number(v) / maxVal));
      return pt(i, ratio);
    });
    const dataPoly = dataPts.map((p) => p.join(",")).join(" ");
    const dots = dataPts
      .map(([x, y]) => `<circle class="radar-dot" cx="${x}" cy="${y}" r="4.5" />`)
      .join("");

    const labelNodes = labels
      .map((lab, i) => {
        const [x, y] = pt(i, 1.22);
        const val = values[i];
        const shown =
          typeof options.valueFormat === "function"
            ? options.valueFormat(val)
            : String(Math.round(Number(val)));
        return `
          <text class="radar-label" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${lab}</text>
          <text class="radar-value" x="${x}" y="${y + 16}" text-anchor="middle" dominant-baseline="middle">${shown}</text>
        `;
      })
      .join("");

    const uid = "r" + Math.random().toString(36).slice(2, 9);

    return `
      <div class="radar-chart" style="--radar-color:${color};--radar-fill:${fill}">
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" role="img" aria-label="五角形能力值">
          <defs>
            <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.2"/>
            </linearGradient>
          </defs>
          ${grid}
          ${axes}
          <polygon class="radar-data" points="${dataPoly}" fill="url(#${uid})" />
          ${dots}
          ${labelNodes}
        </svg>
      </div>
    `;
  }

  function radarLegendHtml(items) {
    return `
      <ul class="radar-legend">
        ${items
          .map(
            (it) => `
          <li>
            <span class="radar-legend-name">${it.label}</span>
            <span class="radar-legend-score">${it.score}</span>
            ${it.text ? `<span class="radar-legend-text">${it.text}</span>` : ""}
          </li>
        `
          )
          .join("")}
      </ul>
    `;
  }

  /** 八字五行：金木水火土 五角形 */
  function elementBarHtml(elements) {
    const order = ["金", "木", "水", "火", "土"];
    const values = order.map((name) => Number(elements[name] || 0));
    const max = Math.max(...values, 0.01);
    const items = order.map((name, i) => ({
      label: name,
      score: values[i].toFixed(1),
    }));

    return `
      <div class="radar-block">
        ${radarChartHtml(order, values, {
          maxVal: max,
          color: "#2f6b4f",
          fill: "rgba(47, 107, 79, 0.28)",
          valueFormat: (v) => Number(v).toFixed(1),
        })}
        ${radarLegendHtml(items)}
      </div>
      <p class="radar-note">數值綜合天干地支能量權重，外圍為相對最強，僅供比較。</p>
    `;
  }

  function lightBorder(hex) {
    const h = (hex || "").toLowerCase();
    return h === "#f5f0e6" || h === "#d4b896" || h === "#c0c7ce"
      ? "border:1px solid rgba(92,58,32,0.2);"
      : "";
  }

  function nameWuxingHtml(nameAnalysis) {
    if (!nameAnalysis) return `<p>未提供姓名。</p>`;

    const chars = nameAnalysis.charDetails
      .map(
        (c) => `
        <div class="name-char-card">
          <span class="ch">${c.char}</span>
          <span class="meta">${c.stroke} 畫 · ${c.element}${c.estimated ? "（估）" : ""}</span>
        </div>
      `
      )
      .join("");

    const grids = Object.entries(nameAnalysis.grids)
      .map(
        ([key, g]) => `
        <div class="name-grid-item">
          <span>${key} · ${g.role}</span>
          <strong>${g.value} · ${g.element}</strong>
        </div>
      `
      )
      .join("");

    const order = ["金", "木", "水", "火", "土"];
    const values = order.map((name) => Number(nameAnalysis.counts[name] || 0));
    const max = Math.max(...values, 0.01);
    const nameRadar = `
      <div class="radar-block radar-block--sm">
        ${radarChartHtml(order, values, {
          maxVal: max,
          color: "#5c4570",
          fill: "rgba(92, 69, 112, 0.28)",
          size: 280,
          valueFormat: (v) => Number(v).toFixed(1),
        })}
      </div>
    `;

    return `
      <p>${nameAnalysis.summary}</p>
      <div class="combo-tags">
        <span class="combo-tag">姓：${nameAnalysis.surname}</span>
        <span class="combo-tag">名：${nameAnalysis.given}</span>
        <span class="combo-tag">偏旺：${nameAnalysis.dominant}</span>
        <span class="combo-tag">宜補：${nameAnalysis.lacking}</span>
      </div>
      <div class="name-chars">${chars}</div>
      <div class="name-grids">${grids}</div>
      ${nameRadar}
      <p class="crystal-note">數理依康熙筆畫尾數定五行；標「估」之字為筆畫庫未收錄之估算，僅供參考。</p>
    `;
  }

  function braceletPreviewHtml(bracelet) {
    const colors = bracelet.colorHex && bracelet.colorHex.length
      ? bracelet.colorHex
      : ["#b8860b"];
    const accentHex =
      bracelet.accent && bracelet.accent.colorHex
        ? bracelet.accent.colorHex[0]
        : null;

    const beads = [];
    for (let i = 0; i < 16; i++) {
      const isAccent = accentHex && (i === 4 || i === 11);
      const hex = isAccent ? accentHex : colors[i % colors.length];
      beads.push(
        `<span class="bead${isAccent ? " accent" : ""}" style="background:${hex};${lightBorder(hex)}"></span>`
      );
    }
    return `<div class="bracelet-preview" aria-hidden="true">${beads.join("")}</div>`;
  }

  function crystalHtml(bracelet) {
    if (!bracelet) {
      return `<p>暫無手鍊建議。</p>`;
    }

    const swatches = (bracelet.primaryColors || [])
      .map((name, i) => {
        const hex = bracelet.colorHex[i] || bracelet.colorHex[0] || "#b8860b";
        return `
          <div class="crystal-swatch">
            <span class="dot" style="background:${hex};${lightBorder(hex)}"></span>
            <span class="cname">${name}</span>
          </div>
        `;
      })
      .join("");

    const beadTags = (bracelet.beadColors || [])
      .map((b) => `<span class="combo-tag">${b}</span>`)
      .join("");

    const byEl = (bracelet.byElement || [])
      .map(
        (el) => `
        <div class="crystal-el">
          <div class="crystal-el-head">
            <strong>${el.element}行 · ${el.role || "主珠色"}</strong>
            <span>${(el.beadColors || el.colors).join("、")}</span>
          </div>
          <p class="crystal-meaning">${el.meaning}</p>
          <p class="crystal-stones">推薦珠子：${el.stones.join("、")}</p>
          <p class="crystal-wear">配戴：${el.wear} · ${el.ratio || ""}</p>
        </div>
      `
      )
      .join("");

    const accent = bracelet.accent
      ? `
        <div class="crystal-el">
          <div class="crystal-el-head">
            <strong>${bracelet.accent.element}行 · 點綴珠</strong>
            <span>${bracelet.accent.beadColors.join("、")}</span>
          </div>
          <p class="crystal-stones">可用：${bracelet.accent.stones.join("、")}</p>
          <p class="crystal-wear">${bracelet.accent.ratio}</p>
        </div>
      `
      : "";

    const avoid =
      bracelet.avoidColors && bracelet.avoidColors.length
        ? `<p class="crystal-avoid">手鍊較不建議整串使用的色系：<strong>${bracelet.avoidColors.join("、")}</strong>${
            bracelet.avoidBeads && bracelet.avoidBeads.length
              ? `（如 ${bracelet.avoidBeads.slice(0, 4).join("、")}）`
              : ""
          }</p>`
        : "";

    const recipe = (bracelet.recipe || []).map((t) => `<li>${t}</li>`).join("");
    const extras = (bracelet.extraTips || []).map((t) => `<li>${t}</li>`).join("");

    const comboNote = [
      bracelet.baziFavor && bracelet.baziFavor.length
        ? `八字用神：${bracelet.baziFavor.join("、")}`
        : "",
      bracelet.nameLacking ? `姓名宜補：${bracelet.nameLacking}` : "",
    ]
      .filter(Boolean)
      .map((t) => `<span class="combo-tag">${t}</span>`)
      .join("");

    return `
      <p class="crystal-summary">${bracelet.summary}</p>
      <div class="combo-tags">${comboNote}</div>
      ${braceletPreviewHtml(bracelet)}
      <div class="crystal-swatches">${swatches}</div>
      <div class="combo-tags" style="margin-top:4px">${beadTags}</div>
      <div class="crystal-list">${byEl}${accent}</div>
      ${recipe ? `<p style="margin-top:12px;font-weight:600;">串珠建議</p><ul class="recipe-list">${recipe}</ul>` : ""}
      ${avoid}
      ${extras ? `<ul class="crystal-extras">${extras}</ul>` : ""}
      <p class="crystal-note">手鍊珠色依「八字用神為主、姓名五行補缺為輔」之大致規則綜合；僅供文化與美學參考，非醫療或保證效果。專業詳細解讀請洽真人命理師；挑選以舒適、喜歡為先。</p>
    `;
  }

  function renderResult(data) {
    emptyPanel.hidden = true;
    resultPanel.hidden = false;

    const nameTitle = data.input.name ? `${data.input.name} · ` : "";
    document.getElementById("result-title").textContent = `${nameTitle}${data.flowYear.year} 年流年運勢`;
    document.getElementById("result-subtitle").textContent =
      `${data.input.birthplace} · ${data.dayMaster.stem}日主 · ${data.flowYear.label}年`;
    document.getElementById("year-badge").textContent =
      `${data.flowYear.year}\n${data.flowYear.label}`;

    document.getElementById("meta-grid").innerHTML = [
      ["姓名", data.input.name || "—"],
      ["出生地", data.input.birthplace],
      ["出生時間", data.input.localTime],
      ["真太陽時", data.input.useTrueSolar ? data.input.solarTime : "未校正"],
      ["日主", `${data.dayMaster.stem}（${data.dayMaster.yinyang}${data.dayMaster.element}）`],
      ["姓名五行", data.nameAnalysis ? `${data.nameAnalysis.dominant}旺／${data.nameAnalysis.lacking}弱` : "—"],
      ["流年", `${data.flowYear.label} · ${data.flowYear.animal}年`],
      ["流年十神", data.flowYear.god],
      ["身強身弱", `${data.strength} / 100`],
      ["查詢年份", String(data.input.queryYear)],
    ]
      .map(
        ([k, v]) => `
        <div class="meta-item">
          <span>${k}</span>
          <strong>${v}</strong>
        </div>
      `
      )
      .join("");

    const order = [
      ["year", "年柱"],
      ["month", "月柱"],
      ["day", "日柱"],
      ["hour", "時柱"],
    ];
    document.getElementById("pillars").innerHTML = order
      .map(([key, label]) => {
        const p = data.pillars[key];
        const god = data.gods[key];
        return `
          <div class="pillar-card">
            <div class="label">${label}${god ? `<span class="tag">${god}</span>` : ""}</div>
            <div class="stem">${p.stem}</div>
            <div class="branch">${p.branch}</div>
            <div class="elem">${p.stemElement}/${p.branchElement}${p.hourName ? " · " + p.hourName : ""}</div>
          </div>
        `;
      })
      .join("");

    const overall = data.scores.overall;
    document.getElementById("score-num").textContent = String(overall);
    document.getElementById("score-label").textContent = data.scores.label;
    document.getElementById("score-summary").textContent =
      data.narrative.total[data.narrative.total.length - 1] ||
      `本流年綜合評為「${data.scores.label}」。`;

    const circle = document.getElementById("score-circle");
    const circumference = 2 * Math.PI * 52;
    const offset = circumference * (1 - overall / 100);
    requestAnimationFrame(() => {
      circle.style.strokeDasharray = String(circumference);
      circle.style.strokeDashoffset = String(offset);
    });

    const aspectDefs = [
      ["career", "事業運"],
      ["wealth", "財運"],
      ["love", "感情運"],
      ["health", "健康運"],
      ["study", "學習貴人"],
    ];
    const aspectLabels = aspectDefs.map(([, title]) => title);
    const aspectValues = aspectDefs.map(([key]) => Number(data.scores.aspects[key] || 0));
    const aspectItems = aspectDefs.map(([key, title], i) => ({
      label: title,
      score: aspectValues[i],
      text: data.narrative.aspectText[key] || "",
    }));

    document.getElementById("aspect-grid").innerHTML = `
      <div class="radar-panel">
        <h3 class="radar-panel-title">五運能力值</h3>
        <div class="radar-block">
          ${radarChartHtml(aspectLabels, aspectValues, {
            maxVal: 100,
            color: "#a63d2f",
            fill: "rgba(166, 61, 47, 0.28)",
            size: 320,
          })}
          ${radarLegendHtml(aspectItems)}
        </div>
      </div>
    `;

    document.getElementById("liunian-body").innerHTML = data.narrative.total
      .map((p) => `<p>${p}</p>`)
      .join("");

    document.getElementById("advice-body").innerHTML =
      `<ul>${data.narrative.advice.map((a) => `<li>${a}</li>`).join("")}</ul>`;

    document.getElementById("name-body").innerHTML = nameWuxingHtml(
      data.nameAnalysis || data.narrative.nameAnalysis
    );
    document.getElementById("crystals-body").innerHTML = crystalHtml(data.narrative.bracelet);

    document.getElementById("elements-body").innerHTML = elementBarHtml(data.elements);

    document.getElementById("months-body").innerHTML = `
      <div class="month-list">
        ${data.narrative.months
          .map(
            (m) => `
          <div class="month-item">
            <strong>${m.name}</strong>
            <span>${m.pillar} · ${m.tone}</span>
          </div>
        `
          )
          .join("")}
      </div>
      <p style="margin-top:12px;color:var(--muted);font-size:0.88rem;">以上為依流年與日支關係摘錄之重點月份，實際仍須配合當月選擇與個人環境。</p>
    `;

    resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    showError("");

    try {
      const fullname = document.getElementById("fullname").value.trim();
      if (!fullname) throw new Error("請輸入姓名。");

      const place = getSelectedPlace();
      if (!place) throw new Error("請選擇出生地。");

      const dt = parseDateTime();
      const gender = document.getElementById("gender").value;
      const queryYear = parseInt(document.getElementById("query-year").value, 10);
      if (!queryYear || queryYear < 1900 || queryYear > 2100) {
        throw new Error("請輸入有效的流年年份（1900–2100）。");
      }
      const useTrueSolar = document.getElementById("use-true-solar").checked;

      const result = BaziFortune.computeChart({
        name: fullname,
        birthplace: place.name,
        longitude: place.lng,
        latitude: place.lat,
        year: dt.year,
        month: dt.month,
        day: dt.day,
        hour: dt.hour,
        minute: dt.minute,
        gender,
        queryYear,
        useTrueSolar,
      });

      renderResult(result);
    } catch (err) {
      showError(err.message || "查詢時發生錯誤，請檢查輸入。");
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    queryYearInput.value = new Date().getFullYear();
    document.getElementById("birthtime").value = "12:00";
    document.getElementById("use-true-solar").checked = true;
    showError("");
    resultPanel.hidden = true;
    emptyPanel.hidden = false;
  });
})();
