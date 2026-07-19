/**
 * index-3：八字命盤 → 適合水晶手鍊顏色
 */
(function () {
  "use strict";

  const form = document.getElementById("fortune-form");
  const errorEl = document.getElementById("form-error");
  const resultPanel = document.getElementById("result-panel");
  const emptyPanel = document.getElementById("empty-panel");
  const resetBtn = document.getElementById("reset-btn");

  const birthdate = document.getElementById("birthdate");
  const now = new Date();
  if (birthdate && !birthdate.value) {
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

  function lightBorder(hex) {
    const h = (hex || "").toLowerCase();
    return h === "#f5f0e6" || h === "#d4b896" || h === "#c0c7ce"
      ? "border:1px solid rgba(92,58,32,0.2);"
      : "";
  }

  function radarChartHtml(labels, values, opts) {
    const options = opts || {};
    const size = options.size || 280;
    const color = options.color || "#b8860b";
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
        const shown =
          typeof options.valueFormat === "function"
            ? options.valueFormat(values[i])
            : String(Math.round(Number(values[i])));
        return `
          <text class="radar-label" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${lab}</text>
          <text class="radar-value" x="${x}" y="${y + 16}" text-anchor="middle" dominant-baseline="middle">${shown}</text>
        `;
      })
      .join("");
    const uid = "r3" + Math.random().toString(36).slice(2, 8);

    return `
      <div class="radar-chart" style="--radar-color:${color}">
        <svg viewBox="0 0 ${size} ${size}" width="100%" height="auto" role="img" aria-label="五行能力值">
          <defs>
            <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.55"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.2"/>
            </linearGradient>
          </defs>
          ${grid}${axes}
          <polygon class="radar-data" points="${dataPoly}" fill="url(#${uid})" />
          ${dots}${labelNodes}
        </svg>
      </div>
    `;
  }

  function braceletPreviewHtml(bracelet) {
    const colors = bracelet.colorHex && bracelet.colorHex.length ? bracelet.colorHex : ["#b8860b"];
    const accentHex = bracelet.accent && bracelet.accent.colorHex ? bracelet.accent.colorHex[0] : null;
    const beads = [];
    for (let i = 0; i < 18; i++) {
      const isAccent = accentHex && (i === 5 || i === 12);
      const hex = isAccent ? accentHex : colors[i % colors.length];
      beads.push(
        `<span class="bead${isAccent ? " accent" : ""}" style="background:${hex};${lightBorder(hex)}"></span>`
      );
    }
    return `<div class="bracelet-preview" aria-hidden="true">${beads.join("")}</div>`;
  }

  function crystalHtml(bracelet) {
    if (!bracelet) return `<p>暫無手鍊建議。</p>`;

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
      bracelet.baziFavor && bracelet.baziFavor.length ? `八字用神：${bracelet.baziFavor.join("、")}` : "",
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
      ${recipe ? `<p class="recipe-title">串珠建議</p><ul class="recipe-list">${recipe}</ul>` : ""}
      ${avoid}
      ${extras ? `<ul class="crystal-extras">${extras}</ul>` : ""}
      <p class="crystal-note">依八字用神為主、姓名五行補缺為輔之大致規則；僅供文化與美學參考。專業詳細解讀請洽真人命理師。</p>
    `;
  }

  function renderResult(data) {
    emptyPanel.hidden = true;
    resultPanel.hidden = false;

    const nameTitle = data.input.name ? `${data.input.name} · ` : "";
    document.getElementById("result-title").textContent = `${nameTitle}八字命盤與手鍊色`;
    document.getElementById("result-subtitle").textContent =
      `${data.input.birthplace} · ${data.dayMaster.stem}日主 · 用神偏 ${
        (data.narrative.bracelet && data.narrative.bracelet.baziFavor
          ? data.narrative.bracelet.baziFavor.join("、")
          : "—")
      }`;

    const favor = (data.narrative.bracelet && data.narrative.bracelet.baziFavor) || [];
    document.getElementById("year-badge").textContent =
      favor.length ? `用神\n${favor.join(" ")}` : "用神\n—";

    document.getElementById("meta-grid").innerHTML = [
      ["姓名", data.input.name || "—"],
      ["出生地", data.input.birthplace],
      ["出生時間", data.input.localTime],
      ["真太陽時", data.input.useTrueSolar ? data.input.solarTime : "未校正"],
      ["日主", `${data.dayMaster.stem}（${data.dayMaster.yinyang}${data.dayMaster.element}）`],
      ["身強身弱", `${data.strength} / 100`],
      ["八字用神", favor.join("、") || "—"],
      ["姓名五行", data.nameAnalysis ? `${data.nameAnalysis.dominant}旺／${data.nameAnalysis.lacking}弱` : "—"],
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

    // 五行能力值（輔助理解用神）
    const wuxingOrder = ["金", "木", "水", "火", "土"];
    const elVals = wuxingOrder.map((n) => Number(data.elements[n] || 0));
    const elMax = Math.max(...elVals, 0.01);
    document.getElementById("elements-body").innerHTML = `
      <div class="radar-block radar-block--sm">
        ${radarChartHtml(wuxingOrder, elVals, {
          maxVal: elMax,
          color: "#2f6b4f",
          valueFormat: (v) => Number(v).toFixed(1),
        })}
      </div>
      <p class="radar-note">命盤五行相對能量；手鍊主色多依用神（身強洩克／身弱生扶）與姓名補缺綜合。</p>
    `;

    document.getElementById("bazi-note-body").innerHTML = `
      <p>日主「${data.dayMaster.stem}」屬${data.dayMaster.element}，身強指數約 ${data.strength}。</p>
      <p>${data.narrative.bracelet ? data.narrative.bracelet.summary : ""}</p>
      ${
        data.nameAnalysis
          ? `<p>姓名「${data.nameAnalysis.full}」數理偏「${data.nameAnalysis.dominant}」旺、「${data.nameAnalysis.lacking}」弱，手鍊色已一併參考。</p>`
          : ""
      }
    `;

    document.getElementById("crystals-body").innerHTML = crystalHtml(data.narrative.bracelet);

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
        queryYear: new Date().getFullYear(),
        useTrueSolar,
      });

      renderResult(result);
    } catch (err) {
      showError(err.message || "查詢時發生錯誤，請檢查輸入。");
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("birthtime").value = "12:00";
    document.getElementById("use-true-solar").checked = true;
    showError("");
    resultPanel.hidden = true;
    emptyPanel.hidden = false;
  });
})();
