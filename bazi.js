/**
 * 八字與流年運勢計算核心
 * 採用近似立春換年、節氣校正與真太陽時推算
 * 僅供文化參考
 */
(function (global) {
  "use strict";

  const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const STEM_ELEMS = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  const BRANCH_ELEMS = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  const STEM_YINYANG = ["陽", "陰", "陽", "陰", "陽", "陰", "陽", "陰", "陽", "陰"];
  const BRANCH_ANIMALS = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"];

  const HOUR_BRANCHES = [
    { branch: 0, start: 23, end: 1, name: "子時" },
    { branch: 1, start: 1, end: 3, name: "丑時" },
    { branch: 2, start: 3, end: 5, name: "寅時" },
    { branch: 3, start: 5, end: 7, name: "卯時" },
    { branch: 4, start: 7, end: 9, name: "辰時" },
    { branch: 5, start: 9, end: 11, name: "巳時" },
    { branch: 6, start: 11, end: 13, name: "午時" },
    { branch: 7, start: 13, end: 15, name: "未時" },
    { branch: 8, start: 15, end: 17, name: "申時" },
    { branch: 9, start: 17, end: 19, name: "酉時" },
    { branch: 10, start: 19, end: 21, name: "戌時" },
    { branch: 11, start: 21, end: 23, name: "亥時" },
  ];

  // 每月節氣近似日期（公曆日，用於換月柱）
  // 立春、驚蟄、清明、立夏、芒種、小暑、立秋、白露、寒露、立冬、大雪、小寒
  const JIE_DAY = [4, 6, 5, 5, 6, 7, 8, 8, 8, 8, 7, 7];
  // 對應地支：寅卯辰巳午未申酉戌亥子丑
  const MONTH_BRANCH_FROM_JIE = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];

  const WUXING_ORDER = ["木", "火", "土", "金", "水"];
  const WUXING_GENERATE = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const WUXING_CONTROL = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

  /**
   * 五行對應水晶珠手鍊（文化參考）
   * 品項對齊：五行水晶手鍊清單.txt / 水晶名稱清單.txt
   */
  const CRYSTAL_BY_ELEMENT = {
    木: {
      element: "木",
      colors: ["綠色", "青綠色", "翠綠"],
      beadColors: ["翠綠珠", "淺綠珠", "孔雀綠珠"],
      colorHex: ["#3d8b5c", "#2a9d8f", "#6b8e23"],
      stones: [
        "綠幽靈",
        "東陵玉",
        "孔雀石",
        "橄欖石",
        "綠髮晶",
        "綠祖母晶",
        "葡萄石",
        "綠雲母",
      ],
      wear: "左手腕（主入、補益）為主，珠徑 6–8mm 日常款",
      meaning: "助成長、貴人、學習與身心舒展",
      ratio: "主珠可佔 50–70%",
    },
    火: {
      element: "火",
      colors: ["紅色", "橙紅", "粉紅", "紫色"],
      beadColors: ["酒紅珠", "橙紅珠", "粉晶珠", "紫晶珠"],
      colorHex: ["#c45a3a", "#e07a3d", "#e891a8", "#6b4c8a"],
      stones: [
        "紅石榴石",
        "紅瑪瑙",
        "太陽石",
        "粉晶",
        "草莓晶",
        "紫水晶",
        "紫鋰輝",
        "金太陽石",
        "橙月光",
        "紅兔毛",
        "紅虎眼",
        "紅膠花",
        "紫鈦晶",
        "紅紋石",
        "紫牙烏",
        "櫻花雨薔薇輝",
      ],
      wear: "左手腕助人緣與表達；避免整串過紅刺眼",
      meaning: "助熱情、表達、人際魅力與行動力",
      ratio: "主珠 40–60%，可搭配少許白珠緩衝",
    },
    土: {
      element: "土",
      colors: ["黃色", "褐色", "米金色"],
      beadColors: ["琥珀黃珠", "虎眼褐珠", "茶晶珠", "金棕珠"],
      colorHex: ["#c9a227", "#8b6914", "#d4b896", "#c4a35a"],
      stones: [
        "黃水晶",
        "虎眼石",
        "茶晶",
        "金虎眼",
        "鈦晶（金棕）",
        "黃膠花",
        "金鋰雲母",
        "金太陽",
        "金髮晶",
      ],
      wear: "左手腕穩財氣；職場可選較沉穩褐金系",
      meaning: "助穩定、信用、財庫與落地執行",
      ratio: "主珠 50–70%，宜圓潤不帶尖角",
    },
    金: {
      element: "金",
      colors: ["白色", "金色", "銀色"],
      beadColors: ["白水晶珠", "金髮晶珠", "銀白月光珠"],
      colorHex: ["#f5f0e6", "#d4af37", "#c0c7ce"],
      stones: [
        "白水晶",
        "金髮晶",
        "鈦晶",
        "月光石",
        "白幽靈",
        "白兔毛",
        "閃靈水晶",
        "透石膏",
        "白阿賽",
      ],
      wear: "左手腕利決斷與收成；可單串白珠極簡",
      meaning: "助條理、決斷、正義與收穫",
      ratio: "主珠 50–80%，金色系宜點綴勿過炫",
    },
    水: {
      element: "水",
      colors: ["藍色", "黑色", "紫色"],
      beadColors: ["海藍珠", "黑曜石珠", "紫水晶珠", "藍晶珠"],
      colorHex: ["#3d6f99", "#2c2c2c", "#6b4c8a", "#4a7fb5"],
      stones: [
        "海藍寶",
        "黑曜石",
        "紫水晶",
        "拉長石",
        "青金石",
        "銀曜石",
        "金曜石",
        "藍晶石",
        "藍月光",
        "藍虎眼",
        "海紋石",
        "藍螢石",
        "天河石",
        "金運石",
        "黑髮晶",
        "藍磷輝",
        "藍托帕",
      ],
      wear: "左手腕利沉澱智慧；睡眠差可改睡前取下",
      meaning: "助智慧、直覺、人脈流動與壓力釋放",
      ratio: "主珠 50–70%，紫／藍可混搭",
    },
  };

  const TEN_GODS = {
    same_yang: "比肩",
    same_yin: "劫財",
    generate_me_yang: "偏印",
    generate_me_yin: "正印",
    i_generate_yang: "食神",
    i_generate_yin: "傷官",
    control_me_yang: "七殺",
    control_me_yin: "正官",
    i_control_yang: "偏財",
    i_control_yin: "正財",
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toDateParts(date) {
    return {
      y: date.getFullYear(),
      m: date.getMonth() + 1,
      d: date.getDate(),
      h: date.getHours(),
      mi: date.getMinutes(),
    };
  }

  /** 儒略日（UTC 近似，用於日柱） */
  function julianDay(y, m, d) {
    let year = y;
    let month = m;
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5;
  }

  /**
   * 真太陽時校正
   * 經度差：以東經 120° 為中國標準時基準，每度 4 分鐘
   * 均時差：簡化正弦近似
   */
  function trueSolarTime(localDate, longitude, useCorrection) {
    if (!useCorrection) return new Date(localDate.getTime());

    const lngDiffMinutes = (longitude - 120) * 4;
    const dayOfYear = Math.floor(
      (Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()) -
        Date.UTC(localDate.getFullYear(), 0, 0)) /
        86400000
    );
    // 簡化均時差（分鐘）
    const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const totalMinutes = lngDiffMinutes + eot;
    return new Date(localDate.getTime() + totalMinutes * 60 * 1000);
  }

  function getYearPillar(y, m, d) {
    // 立春約 2 月 4 日，此前仍屬前一年干支
    let year = y;
    if (m < 2 || (m === 2 && d < JIE_DAY[0])) {
      year -= 1;
    }
    // 1984 甲子年
    const offset = year - 1984;
    const stem = ((offset % 10) + 10) % 10;
    const branch = ((offset % 12) + 12) % 12;
    return { stem, branch, year };
  }

  function getMonthPillar(y, m, d, yearStem) {
    // 找到當前所在節氣月
    let jieIndex; // 0=立春月(寅)...
    let useYear = y;

    // 從前一年小寒開始判斷
    // 公曆月份 1..12 對應可能的節
    // 小寒在 1 月 → 丑月(index 11)
    // 立春 2 月 → 寅月(0) ...

    const candidates = [];
    for (let i = 0; i < 12; i++) {
      // jie i 落在公曆月份 ((i+1)%12)+1 ? 
      // 立春 i=0 → 2月, 驚蟄 i=1 → 3月, ... 小寒 i=11 → 1月
      const month = ((i + 1) % 12) + 1;
      let year = y;
      if (month === 1 && m >= 2) {
        // 明年小寒不在本輪
      }
      candidates.push({ i, year: month === 1 ? y : y, month, day: JIE_DAY[i] });
    }

    // 更直覺：以當前日期對照
    // 構造今年各節氣日期
    const jieList = [];
    for (let i = 0; i < 12; i++) {
      const month = ((i + 1) % 12) + 1; // 2,3,4,...,1
      let year = y;
      if (month === 1) year = y + 1; // 今年立春後的小寒屬次年丑月起點，暫用簡化
      if (i === 11) {
        // 小寒：1 月
        jieList.push({ i, date: new Date(y, 0, JIE_DAY[11]) });
      } else {
        jieList.push({ i, date: new Date(y, i + 1, JIE_DAY[i]) }); // 2月=立春 i=0 → month index 1
      }
    }

    // 修正 jieList 建立
    const list = [
      { i: 11, date: new Date(y, 0, JIE_DAY[11]) }, // 小寒 丑
      { i: 0, date: new Date(y, 1, JIE_DAY[0]) }, // 立春 寅
      { i: 1, date: new Date(y, 2, JIE_DAY[1]) },
      { i: 2, date: new Date(y, 3, JIE_DAY[2]) },
      { i: 3, date: new Date(y, 4, JIE_DAY[3]) },
      { i: 4, date: new Date(y, 5, JIE_DAY[4]) },
      { i: 5, date: new Date(y, 6, JIE_DAY[5]) },
      { i: 6, date: new Date(y, 7, JIE_DAY[6]) },
      { i: 7, date: new Date(y, 8, JIE_DAY[7]) },
      { i: 8, date: new Date(y, 9, JIE_DAY[8]) },
      { i: 9, date: new Date(y, 10, JIE_DAY[9]) },
      { i: 10, date: new Date(y, 11, JIE_DAY[10]) }, // 大雪 子
    ];

    // 若在小寒前，屬前年丑月之前的子月（大雪）
    const current = new Date(y, m - 1, d);
    let active = list[0];
    if (current < list[0].date) {
      // 前年大雪後至小寒前 → 子月 i=10
      jieIndex = 10;
      useYear = y - 1;
    } else {
      for (let k = 0; k < list.length; k++) {
        if (current >= list[k].date) {
          active = list[k];
        }
      }
      jieIndex = active.i;
    }

    const branch = MONTH_BRANCH_FROM_JIE[jieIndex];
    // 五虎遁：甲己之年丙作首
    const yearStemForMonth = getYearPillar(y, m, d).stem;
    const monthStemStart = [2, 4, 6, 8, 0][yearStemForMonth % 5]; // 寅月天干
    // 寅=2 為起點，branch 2 → offset 0
    const monthOffset = (branch - 2 + 12) % 12;
    const stem = (monthStemStart + monthOffset) % 10;

    return { stem, branch, jieIndex, yearStemUsed: yearStemForMonth };
  }

  function getDayPillar(y, m, d) {
    // 以 1900-01-01 為甲戌日做基準校準
    // 1900-01-01 是星期一，八字日柱常用：甲戌
    const base = julianDay(1900, 1, 1);
    const target = julianDay(y, m, d);
    const diff = Math.round(target - base);
    // 甲戌: 甲=0, 戌=10 → 在六十甲子中 index
    // 甲戌 = stem 0, branch 10, 六十甲子序 10
    const baseIndex = 10;
    const idx = ((baseIndex + diff) % 60 + 60) % 60;
    return { stem: idx % 10, branch: idx % 12, index: idx };
  }

  function getHourPillar(dayStem, hour, minute) {
    let h = hour + minute / 60;
    // 23:00 起為子時，屬次日子時的日柱問題：此處簡化為當日子時
    let branch;
    if (h >= 23 || h < 1) branch = 0;
    else if (h < 3) branch = 1;
    else if (h < 5) branch = 2;
    else if (h < 7) branch = 3;
    else if (h < 9) branch = 4;
    else if (h < 11) branch = 5;
    else if (h < 13) branch = 6;
    else if (h < 15) branch = 7;
    else if (h < 17) branch = 8;
    else if (h < 19) branch = 9;
    else if (h < 21) branch = 10;
    else branch = 11;

    // 五鼠遁：甲己還加甲
    const hourStemStart = [0, 2, 4, 6, 8][dayStem % 5];
    const stem = (hourStemStart + branch) % 10;
    const hourName = HOUR_BRANCHES.find((x) => x.branch === branch)?.name || "";
    return { stem, branch, hourName };
  }

  function pillarLabel(p) {
    return STEMS[p.stem] + BRANCHES[p.branch];
  }

  function pillarInfo(p) {
    return {
      stem: STEMS[p.stem],
      branch: BRANCHES[p.branch],
      label: pillarLabel(p),
      stemElement: STEM_ELEMS[p.stem],
      branchElement: BRANCH_ELEMS[p.branch],
      yinyang: STEM_YINYANG[p.stem],
      animal: BRANCH_ANIMALS[p.branch],
      stemIndex: p.stem,
      branchIndex: p.branch,
    };
  }

  function tenGod(dayStem, otherStem) {
    if (dayStem === otherStem) return "比肩";
    const dayElem = STEM_ELEMS[dayStem];
    const otherElem = STEM_ELEMS[otherStem];
    const dayYang = dayStem % 2 === 0;
    const otherYang = otherStem % 2 === 0;
    const samePolarity = dayYang === otherYang;

    if (dayElem === otherElem) return samePolarity ? "比肩" : "劫財";
    if (WUXING_GENERATE[otherElem] === dayElem) return samePolarity ? "偏印" : "正印";
    if (WUXING_GENERATE[dayElem] === otherElem) return samePolarity ? "食神" : "傷官";
    if (WUXING_CONTROL[otherElem] === dayElem) return samePolarity ? "七殺" : "正官";
    if (WUXING_CONTROL[dayElem] === otherElem) return samePolarity ? "偏財" : "正財";
    return "—";
  }

  function countElements(pillars) {
    const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach((p) => {
      counts[STEM_ELEMS[p.stem]] += 1.2;
      counts[BRANCH_ELEMS[p.branch]] += 1;
    });
    return counts;
  }

  function dayMasterStrength(pillars, monthBranch) {
    const dayStem = pillars.day.stem;
    const dayElem = STEM_ELEMS[dayStem];
    const counts = countElements([pillars.year, pillars.month, pillars.day, pillars.hour]);
    const monthElem = BRANCH_ELEMS[monthBranch];

    let score = 50;
    // 月令得氣
    if (monthElem === dayElem) score += 18;
    else if (WUXING_GENERATE[monthElem] === dayElem) score += 12;
    else if (WUXING_CONTROL[monthElem] === dayElem) score -= 12;
    else if (WUXING_CONTROL[dayElem] === monthElem) score += 4;

    // 同類與印星
    score += (counts[dayElem] - 2) * 6;
    const printElem = Object.keys(WUXING_GENERATE).find((k) => WUXING_GENERATE[k] === dayElem);
    score += (counts[printElem] - 1.5) * 4;
    // 官殺克身
    const officerElem = Object.keys(WUXING_CONTROL).find((k) => WUXING_CONTROL[k] === dayElem);
    score -= (counts[officerElem] - 1.2) * 5;

    return clamp(Math.round(score), 15, 90);
  }

  function relationScore(dayElem, flowElem) {
    if (dayElem === flowElem) return { score: 72, type: "比和", note: "流年與日主同氣，自我意識強，宜主動進取。" };
    if (WUXING_GENERATE[flowElem] === dayElem) return { score: 80, type: "生身", note: "流年生扶日主，貴人運與學習運較佳。" };
    if (WUXING_GENERATE[dayElem] === flowElem) return { score: 68, type: "洩身", note: "日主生流年，才華外放，宜創作表達，忌過度消耗。" };
    if (WUXING_CONTROL[flowElem] === dayElem) return { score: 52, type: "克身", note: "流年克身，壓力與考驗增多，宜守成、修德、防小人。" };
    if (WUXING_CONTROL[dayElem] === flowElem) return { score: 74, type: "我克", note: "日主克流年，偏財與掌控力提升，利事業拓展。" };
    return { score: 60, type: "中和", note: "五行互動平穩。" };
  }

  function branchClash(a, b) {
    // 六冲
    return (a + 6) % 12 === b;
  }

  function branchHarm(a, b) {
    // 六害簡表
    const harms = new Set(["0-7", "1-6", "2-5", "3-4", "8-11", "9-10"]);
    const key = [a, b].sort((x, y) => x - y).join("-");
    return harms.has(key);
  }

  function branchCombine(a, b) {
    // 六合
    const pairs = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
    return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
  }

  function aspectScores(baseScore, pillars, flowYear, strength) {
    const dayElem = STEM_ELEMS[pillars.day.stem];
    const flowStemElem = STEM_ELEMS[flowYear.stem];
    const flowBranchElem = BRANCH_ELEMS[flowYear.branch];
    const relStem = relationScore(dayElem, flowStemElem);
    const relBranch = relationScore(dayElem, flowBranchElem);

    let career = baseScore * 0.35 + relStem.score * 0.35 + (strength > 55 ? 8 : -4);
    let wealth = baseScore * 0.3 + (relStem.type === "我克" || relBranch.type === "我克" ? 78 : 60) * 0.4;
    let love = baseScore * 0.28 + (branchCombine(pillars.day.branch, flowYear.branch) ? 82 : 58);
    let health = baseScore * 0.4 + (branchClash(pillars.day.branch, flowYear.branch) ? 42 : 70) * 0.35;
    let study = baseScore * 0.3 + (relStem.type === "生身" ? 84 : 62);

    if (branchClash(pillars.year.branch, flowYear.branch) || branchClash(pillars.day.branch, flowYear.branch)) {
      career -= 8;
      love -= 10;
      health -= 12;
    }
    if (branchHarm(pillars.day.branch, flowYear.branch)) {
      love -= 6;
      health -= 5;
    }
    if (branchCombine(pillars.day.branch, flowYear.branch) || branchCombine(pillars.year.branch, flowYear.branch)) {
      love += 10;
      career += 6;
    }

    // 十神傾向
    const god = tenGod(pillars.day.stem, flowYear.stem);
    if (["正官", "七殺"].includes(god)) {
      career += 8;
      love -= 3;
    }
    if (["正財", "偏財"].includes(god)) {
      wealth += 10;
    }
    if (["正印", "偏印"].includes(god)) {
      study += 10;
      health += 4;
    }
    if (["食神", "傷官"].includes(god)) {
      study += 6;
      love += 5;
      career += 3;
    }
    if (["比肩", "劫財"].includes(god)) {
      career += 4;
      wealth -= 4;
      love += 2;
    }

    const map = {
      career: clamp(Math.round(career), 35, 96),
      wealth: clamp(Math.round(wealth), 35, 96),
      love: clamp(Math.round(love), 35, 96),
      health: clamp(Math.round(health), 35, 96),
      study: clamp(Math.round(study), 35, 96),
    };

    const overall = clamp(
      Math.round(map.career * 0.25 + map.wealth * 0.22 + map.love * 0.18 + map.health * 0.2 + map.study * 0.15),
      40,
      95
    );

    return { aspects: map, overall, god, relStem, relBranch };
  }

  function scoreLabel(score) {
    if (score >= 88) return "上上大吉";
    if (score >= 80) return "吉利亨通";
    if (score >= 72) return "平中見喜";
    if (score >= 62) return "中平穩健";
    if (score >= 52) return "波折宜守";
    return "低盪考驗";
  }

  function buildNarrative(input, chart, flow, scores, nameAnalysis) {
    const dayMaster = STEMS[chart.pillars.day.stem];
    const age = flow.year - input.birthYear + 1;
    const animal = BRANCH_ANIMALS[flow.branch];
    const god = scores.god;
    const person = input.name ? `${input.name}，` : "";

    const total = [
      `${person}出生於${input.birthplace}，排盤後日主為「${dayMaster}」，屬${STEM_ELEMS[chart.pillars.day.stem]}命，命盤四柱為 ${chart.labels.full}。`,
      `${flow.year} 年為${STEMS[flow.stem]}${BRANCHES[flow.branch]}年（${animal}年），流年天干對日主為「${god}」，五行關係偏「${scores.relStem.type}」。`,
      scores.relStem.note,
    ];

    if (nameAnalysis) {
      total.push(
        `姓名「${nameAnalysis.full}」數理五行偏「${nameAnalysis.dominant}」旺、「${nameAnalysis.lacking}」弱；人格屬${nameAnalysis.grids.人格.element}，總格屬${nameAnalysis.grids.總格.element}。`
      );
    }

    if (branchClash(chart.pillars.day.branch, flow.branch)) {
      total.push("流年地支與日支相沖，變動、遷移、關係調整的機率升高，重大決定宜三思。");
    } else if (branchCombine(chart.pillars.day.branch, flow.branch)) {
      total.push("流年地支與日支相合，人際助力與情感機緣較明顯，適合合作與聯結。");
    }

    if (chart.strength >= 65) {
      total.push("日主偏強，流年宜多出力、主動佈局，避免固執硬碰。");
    } else if (chart.strength <= 40) {
      total.push("日主偏弱，流年宜借力使力、充實學養，避免硬撐與過度承諾。");
    } else {
      total.push("日主中和，流年節奏相對平衡，進可攻、退可守。");
    }

    total.push(`虛歲約 ${age} 歲，綜合運勢指數 ${scores.overall}，評為「${scoreLabel(scores.overall)}」。`);

    const advice = [];
    const dayElem = STEM_ELEMS[chart.pillars.day.stem];
    const favor =
      chart.strength >= 60
        ? [WUXING_CONTROL[dayElem], WUXING_GENERATE[dayElem]]
        : [
            dayElem,
            Object.keys(WUXING_GENERATE).find((k) => WUXING_GENERATE[k] === dayElem),
          ];

    const favorList = favor.filter(Boolean);
    // 忌神色系：身強少再比劫印，身弱少再官殺與過度洩耗
    const printElem = Object.keys(WUXING_GENERATE).find((k) => WUXING_GENERATE[k] === dayElem);
    const officerElem = Object.keys(WUXING_CONTROL).find((k) => WUXING_CONTROL[k] === dayElem);
    const avoidElems =
      chart.strength >= 60
        ? [dayElem, printElem]
        : [officerElem, WUXING_GENERATE[dayElem]];

    const bracelet = buildBraceletAdvice(
      favorList,
      avoidElems,
      dayElem,
      chart.strength,
      scores,
      nameAnalysis
    );

    // —— 開運建議：依日主／身強弱／流年十神／分項分數／姓名 個人化 ——
    const flowLabel = STEMS[flow.stem] + BRANCHES[flow.branch];
    const flowElem = STEM_ELEMS[flow.stem];
    const strengthTone =
      chart.strength >= 65 ? "身偏強" : chart.strength <= 40 ? "身偏弱" : "身中和";
    const godTips = {
      比肩: "宜合作也防爭奪，資源共享時先講清楚界線。",
      劫財: "支出與人情關說較多，重大財務勿情緒下決定。",
      食神: "利發揮專長與口才，適合創作、教學或輕鬆社交。",
      傷官: "表達欲強，宜把創意落成作品，少與上司硬槓。",
      偏財: "偏財機會與人脈流動增，仍忌槓桿與來路不明之財。",
      正財: "利穩定收成與本業薪資，適合按計畫存錢與還款。",
      七殺: "壓力與競爭明顯，宜訂優先順序，硬仗只打關鍵的一場。",
      正官: "規矩與責任加重，利升遷考核，忌犯規與延遲交付。",
      偏印: "思緒多、靈感也多，適合進修研究，防想太多遲遲不動。",
      正印: "貴人與學習運佳，宜拜師充電，勿過度依賴他人安排。",
    };
    const elemIndustry = {
      木: "文教、設計、植物、新生事業",
      火: "展演、餐飲、行銷、光電與曝光型工作",
      土: "地產、管理、中介、穩健服務業",
      金: "金融、科技、法務、精密與決策型職務",
      水: "流通、顧問、旅遊、資訊與人脈型工作",
    };
    const healthByDay = {
      木: "肝膽、筋骨、肩頸與用眼過度",
      火: "心臟循環、血壓與情緒燥熱",
      土: "脾胃消化、濕重與代謝",
      金: "肺部呼吸、皮膚與大腸作息",
      水: "腎膀胱、腰膝與睡眠品質",
    };

    advice.push(
      `【${input.name || "命主"}】日主${dayMaster}（${dayElem}）、${strengthTone}（${chart.strength}），${flow.year}流年${flowLabel}為「${god}」、五行偏「${scores.relStem.type}」。`
    );
    advice.push(
      `用神方向「${favorList.join("、")}」，可多接觸：${favorList.map((e) => elemIndustry[e] || e).join("；")}；顏色以${bracelet.primaryColors.slice(0, 3).join("、")}為主。`
    );
    advice.push(
      `手鍊參考：${bracelet.stones.slice(0, 4).join("、")}等；${godTips[god] || "依節奏進退，重大決策宜三思。"}`
    );

    // 事業
    {
      const s = scores.aspects.career;
      let line = `事業（${s}）：`;
      if (["正官", "七殺"].includes(god)) {
        line +=
          s >= 70
            ? `流年「${god}」利於扛責與表現，可爭取可見成果或職位調整。`
            : s >= 55
              ? `流年「${god}」責任感加重，先把本分做滿再談升遷。`
              : `流年「${god}」壓力偏大，少開新戰場，重交付品質與人際。`;
      } else if (["食神", "傷官"].includes(god)) {
        line +=
          s >= 70
            ? `流年「${god}」利創意發揮與對外說明，適合提案、作品或副業技能變現。`
            : `流年「${god}」宜把想法寫成計畫，避免只吐槽不執行。`;
      } else if (["比肩", "劫財"].includes(god)) {
        line +=
          s >= 65
            ? `流年「${god}」合作機會多，簽約前分清權責與分潤。`
            : `流年「${god}」易有競爭或搶功，重要事項自己掌握節奏。`;
      } else {
        line +=
          s >= 75
            ? "適合爭取曝光、升遷或啟動關鍵專案，把握上半年節奏。"
            : s >= 60
              ? "以維持現況並小步優化為主，合作優於硬碰。"
              : "宜穩紮穩打，少同時開多線，重細節與協調。";
      }
      if (chart.strength >= 65) line += " 身強者可主動出手，但忌固執。";
      else if (chart.strength <= 40) line += " 身弱者宜借力使力，勿一人硬撐。";
      advice.push(line);
    }

    // 財運
    {
      const s = scores.aspects.wealth;
      let line = `財運（${s}）：`;
      if (["正財", "偏財"].includes(god)) {
        line +=
          s >= 70
            ? `流年「${god}」進帳機會較明，仍以正職與可追蹤來源為主，忌槓桿。`
            : `流年「${god}」有財象但波動，先守現金流再談擴張。`;
      } else if (["劫財", "比肩"].includes(god)) {
        line += "破財或代墊風險偏高，少當保證人、少跟風投資。";
      } else if (["食神", "傷官"].includes(god)) {
        line +=
          s >= 65
            ? "利以技能、內容或手藝換取收入，適合精緻小額多元進帳。"
            : "支出易隨興，先列固定開銷再玩副業。";
      } else {
        line +=
          s >= 75
            ? "正財穩、偏財可遇，仍忌投機。"
            : s >= 60
              ? "收支大致平衡，適合儲蓄與長期配置。"
              : "先守現金流，減少非必要開支。";
      }
      advice.push(line);
    }

    // 感情
    {
      const s = scores.aspects.love;
      let line = `感情（${s}）：`;
      if (branchClash(chart.pillars.day.branch, flow.branch)) {
        line += "日支與流年相沖，關係易有距離或議題浮上檯面，溝通要慢、少作最後通牒。";
      } else if (branchCombine(chart.pillars.day.branch, flow.branch)) {
        line += "日支與流年相合，互動與合作機緣佳，適合深化承諾或認識新朋友。";
      } else if (s >= 75) {
        line += `人際熱絡（流年${god}），單身可多參與聚會；有伴者宜共同規劃。`;
      } else if (s < 60) {
        line += "情緒易累及關係，避免冷暴力，重要話選對時機說。";
      } else {
        line += "整體平穩，用心經營日常溫度即可。";
      }
      advice.push(line);
    }

    // 健康
    {
      const s = scores.aspects.health;
      const focus = healthByDay[dayElem] || "作息與壓力管理";
      let line = `健康（${s}）：日主${dayElem}，宜特別留意${focus}。`;
      if (s < 55) line += " 今年偏耗，睡眠與檢查優先於猛補。";
      else if (s >= 75) line += " 體力尚可，可建立固定運動習慣。";
      else line += " 維持規律飲食與伸展，換季時加強防護。";
      if (["七殺", "傷官"].includes(god)) line += " 流年壓力大，預留空白休息日。";
      advice.push(line);
    }

    // 學習貴人
    {
      const s = scores.aspects.study;
      let line = `學習貴人（${s}）：`;
      if (["正印", "偏印"].includes(god)) {
        line += `流年「${god}」利進修、證照與長輩貴人，適合系統化學習。`;
      } else if (s >= 75) {
        line += "吸收力佳，利考試、課程與跨領域技能。";
      } else if (s < 60) {
        line += "專注易散，採番茄鐘或分段學習，減少資訊過載。";
      } else {
        line += "可穩定推進一項專長，不必貪多。";
      }
      if (nameAnalysis) {
        line += ` 姓名數理「${nameAnalysis.lacking}」偏弱，學習／貴人面向可多補${nameAnalysis.lacking}行氣場（色系或環境）。`;
      }
      advice.push(line);
    }

    // 開運習慣（依用神與流年而變，避免全員同一句）
    {
      const habitColors = bracelet.primaryColors.slice(0, 2).join("、") || favorList.join("、");
      const habitStone = (bracelet.stones && bracelet.stones[0]) || "白水晶";
      let habit = `開運習慣：本流年可在辦公或居家放置「${habitColors}」小物，手鍊／飾品優先「${habitStone}」；`;
      if (scores.relStem.type === "克身" || ["七殺", "正官"].includes(god)) {
        habit += "每週固定一天只處理待辦、不開新項目，降低被動消耗。";
      } else if (scores.relStem.type === "生身" || ["正印", "偏印"].includes(god)) {
        habit += "每週安排一次學習或與前輩請益，把貴人運落到行動。";
      } else if (["食神", "傷官"].includes(god)) {
        habit += "每週產出一件可見成果（文案、作品、整理成果），把靈感變現。";
      } else {
        habit += "每月選固定一日檢視目標與收支，重要文件雙重核對。";
      }
      advice.push(habit);
    }

    const aspectText = {
      career: advice.find((a) => a.startsWith("事業"))?.replace(/^事業（\d+）：/, "") || "事業節奏需配合個人環境。",
      wealth: advice.find((a) => a.startsWith("財運"))?.replace(/^財運（\d+）：/, "") || "財運宜量力而為。",
      love: advice.find((a) => a.startsWith("感情"))?.replace(/^感情（\d+）：/, "") || "感情宜真誠溝通。",
      health: advice.find((a) => a.startsWith("健康"))?.replace(/^健康（\d+）：/, "") || "健康宜規律作息。",
      study: advice.find((a) => a.startsWith("學習貴人"))?.replace(/^學習貴人（\d+）：/, "") || "學習可持續推進。",
    };

    // 流月重點（簡化：以流年支為起點順排）
    const months = [];
    const monthNames = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"];
    for (let i = 0; i < 12; i++) {
      const b = (flow.branch + i) % 12;
      const mStem = (flow.stem * 2 + i) % 10; // 簡化
      let tone = "平穩推進";
      let score = 60;
      if (branchCombine(chart.pillars.day.branch, b)) {
        tone = "人際合作佳";
        score = 78;
      }
      if (branchClash(chart.pillars.day.branch, b)) {
        tone = "變動較大，宜謹慎";
        score = 48;
      }
      if (BRANCH_ELEMS[b] === dayElem || WUXING_GENERATE[BRANCH_ELEMS[b]] === dayElem) {
        tone = tone === "平穩推進" ? "精力與運勢上揚" : tone;
        score += 8;
      }
      if (WUXING_CONTROL[BRANCH_ELEMS[b]] === dayElem) {
        tone = tone.includes("變動") ? tone : "壓力略增，宜休整";
        score -= 6;
      }
      months.push({
        name: monthNames[i],
        pillar: STEMS[mStem] + BRANCHES[b],
        tone,
        score: clamp(score, 40, 90),
      });
    }
    // 取重點月：最高 3 + 最低 2
    const sorted = [...months].sort((a, b) => b.score - a.score);
    const highlights = [...sorted.slice(0, 3), ...sorted.slice(-2)]
      .filter((v, i, arr) => arr.findIndex((x) => x.name === v.name) === i)
      .slice(0, 5)
      .sort((a, b) => monthNames.indexOf(a.name) - monthNames.indexOf(b.name));

    return {
      total,
      advice,
      aspectText,
      months: highlights,
      favor: favorList,
      bracelet,
      nameAnalysis: nameAnalysis || null,
    };
  }

  /**
   * 綜合八字用神 + 姓名五行 → 水晶珠手鍊色
   * 權重：八字用神為主（約 65%），姓名缺補為輔（約 35%）
   */
  function buildBraceletAdvice(favorList, avoidElems, dayElem, strength, scores, nameAnalysis) {
    const scoreMap = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

    // 八字用神加分
    favorList.filter(Boolean).forEach((el, i) => {
      scoreMap[el] += i === 0 ? 65 : 40;
    });

    // 姓名：缺的五行宜補；過旺的略減
    if (nameAnalysis) {
      scoreMap[nameAnalysis.lacking] += 35;
      nameAnalysis.nameFavor.forEach((el) => {
        scoreMap[el] += 12;
      });
      scoreMap[nameAnalysis.dominant] -= 15;
      // 人格五行可作次要參考（性格主運）
      if (nameAnalysis.grids && nameAnalysis.grids.人格) {
        scoreMap[nameAnalysis.grids.人格.element] += 8;
      }
    }

    // 忌神扣分
    (avoidElems || []).filter(Boolean).forEach((el) => {
      scoreMap[el] -= 28;
    });

    const ranked = WUXING_ORDER.map((el) => ({ element: el, score: scoreMap[el] })).sort(
      (a, b) => b.score - a.score
    );

    // 取前 1～2 個正分主色，必要時第三作點綴
    const main = ranked.filter((r) => r.score > 0).slice(0, 2);
    if (main.length === 0) main.push(ranked[0]);
    const accent = ranked.find((r) => !main.some((m) => m.element === r.element) && r.score > -5);

    const uniqueFavor = main.map((m) => m.element);
    const packs = uniqueFavor.map((el) => CRYSTAL_BY_ELEMENT[el]).filter(Boolean);

    const primaryColors = [];
    const beadColors = [];
    const colorHex = [];
    const stones = [];
    const byElement = [];

    packs.forEach((p) => {
      p.colors.forEach((c) => {
        if (!primaryColors.includes(c)) primaryColors.push(c);
      });
      (p.beadColors || p.colors).forEach((c) => {
        if (!beadColors.includes(c)) beadColors.push(c);
      });
      p.colorHex.forEach((h) => {
        if (!colorHex.includes(h)) colorHex.push(h);
      });
      p.stones.forEach((s) => {
        if (!stones.includes(s)) stones.push(s);
      });
      byElement.push({
        element: p.element,
        colors: p.colors,
        beadColors: p.beadColors || p.colors,
        colorHex: p.colorHex,
        stones: p.stones,
        wear: p.wear,
        meaning: p.meaning,
        ratio: p.ratio,
        role: "主珠色",
      });
    });

    let accentInfo = null;
    if (accent && accent.score >= 0) {
      const ap = CRYSTAL_BY_ELEMENT[accent.element];
      if (ap && !uniqueFavor.includes(accent.element)) {
        accentInfo = {
          element: ap.element,
          colors: ap.colors.slice(0, 2),
          beadColors: (ap.beadColors || ap.colors).slice(0, 2),
          colorHex: ap.colorHex.slice(0, 2),
          stones: ap.stones.slice(0, 2),
          ratio: "點綴 10–20% 即可",
          role: "點綴珠",
        };
      }
    }

    const extraTips = [];
    extraTips.push("配戴建議：日常以左手腕為主（傳統「吸納」）；珠徑 6–8mm 較舒適，單手一串即可。");
    if (packs[0]) extraTips.push(`串珠比例：${packs.map((p) => `${p.element}行 ${p.ratio}`).join("；")}。`);
    if (accentInfo) {
      extraTips.push(
        `可加少許${accentInfo.element}行點綴珠（${accentInfo.beadColors.join("、")}），約 10–20%，避免喧賓奪主。`
      );
    }
    if (scores.aspects.love < 60) {
      extraTips.push("流年感情較波動時，主色不變，可在手鍊上加 1–3 顆粉晶珠柔和氣場。");
    }
    if (scores.aspects.health < 60) {
      extraTips.push("健康宜養：選溫潤圓珠，避免過重、尖角或過緊勒腕。");
    }
    if (scores.aspects.career >= 75 && uniqueFavor.includes("金")) {
      extraTips.push("事業運佳：白水晶或金髮晶主珠利於專注與決策場合。");
    }
    if (scores.aspects.wealth >= 75 && (uniqueFavor.includes("土") || uniqueFavor.includes("金"))) {
      extraTips.push("財運較佳：黃水晶／虎眼石可作主珠或隔珠（仍以理性理財為先）。");
    }
    if (nameAnalysis) {
      extraTips.push(
        `姓名層面「${nameAnalysis.lacking}」偏弱，手鍊可刻意提高該行珠色比例以象徵補益。`
      );
    }

    const avoidColors = [];
    const avoidBeads = [];
    const avoidStones = [];
    [...new Set((avoidElems || []).filter(Boolean))].forEach((el) => {
      const pack = CRYSTAL_BY_ELEMENT[el];
      if (!pack || uniqueFavor.includes(el)) return;
      // 若姓名極缺此行，不列為手鍊大忌
      if (nameAnalysis && nameAnalysis.lacking === el) return;
      pack.colors.forEach((c) => {
        if (!avoidColors.includes(c)) avoidColors.push(c);
      });
      (pack.beadColors || []).forEach((c) => {
        if (!avoidBeads.includes(c)) avoidBeads.push(c);
      });
      pack.stones.slice(0, 2).forEach((s) => {
        if (!avoidStones.includes(s)) avoidStones.push(s);
      });
    });

    const reasonParts = [];
    reasonParts.push(
      strength >= 60
        ? `八字日主偏強，手鍊主色取「${uniqueFavor.join("、")}」（洩秀／制衡）`
        : strength <= 40
          ? `八字日主偏弱，手鍊主色取「${uniqueFavor.join("、")}」（生扶／比助）`
          : `八字日主中和，手鍊主色取「${uniqueFavor.join("、")}」`
    );
    if (nameAnalysis) {
      reasonParts.push(
        `姓名數理「${nameAnalysis.dominant}」旺「${nameAnalysis.lacking}」弱，珠色已綜合補缺`
      );
    }

    const summary = `${reasonParts.join("；")}。總體最適合的水晶珠手鍊色系為：${primaryColors.join("、")}。`;

    // 具體串法建議
    const recipe = buildBeadRecipe(uniqueFavor, accentInfo, stones);

    return {
      summary,
      primaryColors,
      beadColors,
      colorHex,
      stones,
      byElement,
      accent: accentInfo,
      avoidColors,
      avoidBeads,
      avoidStones,
      extraTips,
      recipe,
      ranked,
      baziFavor: favorList.filter(Boolean),
      nameLacking: nameAnalysis ? nameAnalysis.lacking : null,
      dayElement: dayElem,
    };
  }

  function buildBeadRecipe(mainElems, accentInfo, stones) {
    const mainNames = mainElems
      .map((el) => CRYSTAL_BY_ELEMENT[el])
      .filter(Boolean)
      .map((p) => p.stones[0]);
    const parts = [];
    if (mainElems.length === 1) {
      parts.push(`主串：${mainNames[0] || stones[0]} 單色珠約 18–22 顆（依手腕調整）`);
    } else {
      parts.push(
        `主串：${mainNames[0]} 約 60% + ${mainNames[1] || "次色珠"} 約 30% 交錯或分段排列`
      );
    }
    if (accentInfo) {
      parts.push(`點綴：${accentInfo.stones[0]} 2–4 顆作隔珠或中間焦點`);
    } else {
      parts.push("可加 1 顆白水晶隔珠，淨化並緩衝五行");
    }
    parts.push("線材：彈性繩或鋼絲線；金屬配件宜選銀／金色，少選過多雜色電鍍");
    return parts;
  }

  function computeChart(options) {
    const {
      name,
      birthplace,
      longitude,
      latitude,
      year,
      month,
      day,
      hour,
      minute,
      gender,
      queryYear,
      useTrueSolar,
    } = options;

    let nameAnalysis = null;
    if (name && String(name).trim()) {
      if (typeof global.NameWuxing === "undefined" && typeof NameWuxing === "undefined") {
        throw new Error("姓名五行模組未載入。");
      }
      const NW = global.NameWuxing || NameWuxing;
      nameAnalysis = NW.analyzeName(String(name).trim());
    }

    const local = new Date(year, month - 1, day, hour, minute, 0);
    const solar = trueSolarTime(local, longitude, useTrueSolar);
    const sp = toDateParts(solar);

    // 夜子時：23 點後日柱進一日的簡化處理
    let dayY = sp.y;
    let dayM = sp.m;
    let dayD = sp.d;
    if (sp.h >= 23) {
      const next = new Date(sp.y, sp.m - 1, sp.d + 1);
      dayY = next.getFullYear();
      dayM = next.getMonth() + 1;
      dayD = next.getDate();
    }

    const yearP = getYearPillar(sp.y, sp.m, sp.d);
    const monthP = getMonthPillar(sp.y, sp.m, sp.d, yearP.stem);
    const dayP = getDayPillar(dayY, dayM, dayD);
    const hourP = getHourPillar(dayP.stem, sp.h, sp.mi);

    const pillars = { year: yearP, month: monthP, day: dayP, hour: hourP };
    const labels = {
      year: pillarLabel(yearP),
      month: pillarLabel(monthP),
      day: pillarLabel(dayP),
      hour: pillarLabel(hourP),
      full: `${pillarLabel(yearP)} ${pillarLabel(monthP)} ${pillarLabel(dayP)} ${pillarLabel(hourP)}`,
    };

    const strength = dayMasterStrength(pillars, monthP.branch);
    const elements = countElements([yearP, monthP, dayP, hourP]);

    const qYear = queryYear || new Date().getFullYear();
    // 流年以立春換年
    const flow = getYearPillar(qYear, 6, 15); // 年中必屬該流年
    flow.year = qYear;
    flow.stem = ((qYear - 1984) % 10 + 10) % 10;
    flow.branch = ((qYear - 1984) % 12 + 12) % 12;

    const baseRel = relationScore(STEM_ELEMS[dayP.stem], STEM_ELEMS[flow.stem]);
    const scores = aspectScores(baseRel.score, pillars, flow, strength);
    const narrative = buildNarrative(
      {
        name: nameAnalysis ? nameAnalysis.full : name || "",
        birthplace,
        birthYear: year,
        gender,
      },
      { pillars, labels, strength, elements },
      flow,
      scores,
      nameAnalysis
    );

    const gods = {
      year: tenGod(dayP.stem, yearP.stem),
      month: tenGod(dayP.stem, monthP.stem),
      day: "日主",
      hour: tenGod(dayP.stem, hourP.stem),
      flow: scores.god,
    };

    return {
      input: {
        name: nameAnalysis ? nameAnalysis.full : (name || "").trim(),
        birthplace,
        longitude,
        latitude,
        localTime: `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`,
        solarTime: `${sp.y}-${pad(sp.m)}-${pad(sp.d)} ${pad(sp.h)}:${pad(sp.mi)}`,
        useTrueSolar: !!useTrueSolar,
        gender,
        queryYear: qYear,
      },
      nameAnalysis,
      pillars: {
        year: pillarInfo(yearP),
        month: pillarInfo(monthP),
        day: pillarInfo(dayP),
        hour: { ...pillarInfo(hourP), hourName: hourP.hourName },
      },
      labels,
      gods,
      strength,
      elements,
      dayMaster: {
        stem: STEMS[dayP.stem],
        element: STEM_ELEMS[dayP.stem],
        yinyang: STEM_YINYANG[dayP.stem],
      },
      flowYear: {
        year: qYear,
        stem: STEMS[flow.stem],
        branch: BRANCHES[flow.branch],
        label: STEMS[flow.stem] + BRANCHES[flow.branch],
        animal: BRANCH_ANIMALS[flow.branch],
        element: STEM_ELEMS[flow.stem],
        branchElement: BRANCH_ELEMS[flow.branch],
        god: scores.god,
      },
      scores: {
        overall: scores.overall,
        label: scoreLabel(scores.overall),
        aspects: scores.aspects,
        relation: scores.relStem,
      },
      narrative,
    };
  }

  global.BaziFortune = {
    computeChart,
    STEMS,
    BRANCHES,
    WUXING_ORDER,
  };
})(typeof window !== "undefined" ? window : globalThis);
