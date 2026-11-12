/* 雪山晶 · 15-quote-calendar ｜ 源：雪山晶.html L9117-L9416 ｜ JS 模块 */
;/* 日历与卡片流 */
"use strict";
  /* 迭代 v13 新增：格言库 / 横排日历 */

  /* 格言库：恋爱向格言 · 诗词短句 */
  var QUOTES = [
    "山有木兮木有枝，心悦君兮君不知。",
    "愿得一心人，白头不相离。",
    "只缘感君一回顾，使我思君朝与暮。",
    "两情若是久长时，又岂在朝朝暮暮。",
    "玲珑骰子安红豆，入骨相思知不知。",
    "衣带渐宽终不悔，为伊消得人憔悴。",
    "此情可待成追忆，只是当时已惘然。",
    "人生若只如初见，何事秋风悲画扇。",
    "十年生死两茫茫，不思量，自难忘。",
    "死生契阔，与子成说。执子之手，与子偕老。",
    "红豆生南国，春来发几枝。愿君多采撷，此物最相思。",
    "与君初相识，犹如故人归。",
    "春风十里，不如你。",
    "往后余生，风雪是你，平淡是你。",
    "我见过春日夏风秋叶冬雪，也踏遍南水北山东麓西岭，可这四季春秋，都不及你冲我展眉一笑。",
    "我明白你会来，所以我等。",
    "想把日子过成诗，把诗写成你。",
    "月亮很亮，亮也没用，没用也亮；我喜欢你，喜欢也没用，没用也喜欢。",
    "你要相信，世界上一定有人，正努力地走到你身边来。",
    "想你的时候，风也温柔，雨也温柔。",
    "所有的美好，都在向你赶来的路上。",
    "世间万物，唯你不可辜负。",
    "我喜欢你，像风走了八千里，不问归期。",
    "你若安好，便是晴天。",
    "愿你被这世界温柔以待，愿你所遇皆良人。",
    "山水一程，三生有幸。"
  ];

  var HOME_QUOTE_KEY = "snowcrystal.homequote";

  function homeQuoteCustom() {
    try {
      var raw = window.localStorage.getItem(HOME_QUOTE_KEY);
      if (raw) { var d = JSON.parse(raw); if (d && d.custom) { return String(d.custom); } }
    } catch (e) { /* 忽略 */ }
    return "";
  }
  function saveHomeQuote(text) {
    try {
      window.localStorage.setItem(HOME_QUOTE_KEY, JSON.stringify({ custom: String(text || "").replace(/^\s+|\s+$/g, "") }));
    } catch (e) { /* 忽略 */ }
  }
  function clearHomeQuote() {
    try { window.localStorage.removeItem(HOME_QUOTE_KEY); } catch (e) { /* 忽略 */ }
  }

  /* 从「格言库」（wcl.quote，含用户导入）收集全部格言文本；不可用时返回空数组 */
  function wclQuoteItems() {
    var out = [], groups = null, i, j, g, it;
    try {
      if (typeof window.loadWcl === "function") { groups = window.loadWcl().quote; }
      else {
        var raw = window.localStorage.getItem("snowcrystal.wordcard.v2");
        if (raw) { groups = (JSON.parse(raw).quote || null); }
      }
    } catch (e) { groups = null; }
    if (groups && groups.length) {
      for (i = 0; i < groups.length; i++) {
        g = groups[i] || {};
        for (j = 0; j < (g.items || []).length; j++) {
          it = g.items[j];
          if (typeof it === "string") { out.push(it); }
          else if (it && typeof it.t === "string") { out.push(it.t); }
        }
      }
    }
    return out;
  }

  /* 全部候选：格言库在前，内置兜底，去重 */
  function allQuoteCandidates() {
    var arr = wclQuoteItems().concat(QUOTES), seen = {}, out = [], i, t;
    for (i = 0; i < arr.length; i++) {
      t = String(arr[i] || "").replace(/^\s+|\s+$/g, "");
      if (!t || seen[t]) { continue; }
      seen[t] = 1;
      out.push(t);
    }
    return out;
  }

  function quoteOfDay() {
    var custom = homeQuoteCustom();
    if (custom) { return custom; }
    var lib = wclQuoteItems();
    if (!lib.length) { lib = QUOTES; }
    if (!lib.length) { return ""; }
    var d = new Date();
    var seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    return lib[seed % lib.length];
  }

  /* 首页：每日一句（居中显示，每日自动变化） */
  function renderDailyQuote() {
    var el = document.getElementById("dailyQuote");
    if (el) { el.textContent = quoteOfDay(); }
  }

  /* ---------- v76：首页格言选择弹窗 ---------- */
  var hqListCache = [];

  function hqEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function hqRenderList() {
    var el = document.getElementById("hqList");
    if (!el) { return; }
    hqListCache = allQuoteCandidates();
    var cur = homeQuoteCustom(), html = "", i;
    for (i = 0; i < hqListCache.length; i++) {
      html += '<div class="hq-item' + (hqListCache[i] === cur ? " is-cur" : "") + '" data-i="' + i + '" role="button" tabindex="0">' + hqEsc(hqListCache[i]) + "</div>";
    }
    el.innerHTML = html;
  }

  function hqOpen() {
    var m = document.getElementById("hqMask"), s = document.getElementById("hqSheet");
    if (!m || !s) { return; }
    hqRenderList();
    var inp = document.getElementById("hqInput");
    if (inp) { inp.value = ""; }
    m.hidden = false;
    s.hidden = false;
  }
  function hqClose() {
    var m = document.getElementById("hqMask"), s = document.getElementById("hqSheet");
    if (m) { m.hidden = true; }
    if (s) { s.hidden = true; }
  }
  function hqPick(text) {
    var t = String(text || "").replace(/^\s+|\s+$/g, "");
    if (!t) { return; }
    saveHomeQuote(t);
    renderDailyQuote();
    hqClose();
    if (typeof window.wcToast === "function") { window.wcToast("已设为首页格言"); }
  }

  function bindHomeQuote() {
    var el = document.getElementById("dailyQuote");
    if (!el || el.getAttribute("data-hq-bound") === "1") { return; }
    el.setAttribute("data-hq-bound", "1");
    el.addEventListener("click", hqOpen);
    el.addEventListener("keydown", function (e) {
      if ((e.key || "") === "Enter" || (e.key || "") === " ") { e.preventDefault(); hqOpen(); }
    });

    var ok = document.getElementById("hqOk");
    if (ok && ok.getAttribute("data-hq-bound") !== "1") {
      ok.setAttribute("data-hq-bound", "1");
      ok.addEventListener("click", function () {
        var inp = document.getElementById("hqInput");
        hqPick(inp ? inp.value : "");
      });
    }

    var list = document.getElementById("hqList");
    if (list && list.getAttribute("data-hq-bound") !== "1") {
      list.setAttribute("data-hq-bound", "1");
      list.addEventListener("click", function (ev) {
        var it = ev.target;
        while (it && it !== list && !(it.getAttribute && it.getAttribute("data-i") !== null)) { it = it.parentNode; }
        if (it && it !== list) {
          var idx = parseInt(it.getAttribute("data-i"), 10);
          if (idx >= 0 && idx < hqListCache.length) { hqPick(hqListCache[idx]); }
        }
      });
      list.addEventListener("keydown", function (ev) {
        if ((ev.key || "") !== "Enter") { return; }
        var it = ev.target;
        if (it && it.getAttribute && it.getAttribute("data-i") !== null) {
          var idx = parseInt(it.getAttribute("data-i"), 10);
          if (idx >= 0 && idx < hqListCache.length) { hqPick(hqListCache[idx]); }
        }
      });
    }

    var rnd = document.getElementById("hqRandom");
    if (rnd && rnd.getAttribute("data-hq-bound") !== "1") {
      rnd.setAttribute("data-hq-bound", "1");
      rnd.addEventListener("click", function () {
        clearHomeQuote();
        renderDailyQuote();
        hqClose();
        if (typeof window.wcToast === "function") { window.wcToast("已恢复每日随机"); }
      });
    }

    var c = document.getElementById("hqCancel");
    if (c && c.getAttribute("data-hq-bound") !== "1") {
      c.setAttribute("data-hq-bound", "1");
      c.addEventListener("click", hqClose);
    }

    var m = document.getElementById("hqMask");
    if (m && m.getAttribute("data-hq-bound") !== "1") {
      m.setAttribute("data-hq-bound", "1");
      m.addEventListener("click", hqClose);
    }

    if (document.documentElement.getAttribute("data-hq-esc") !== "1") {
      document.documentElement.setAttribute("data-hq-esc", "1");
      document.addEventListener("keydown", function (e) {
        if ((e.key || "") === "Escape") {
          var s = document.getElementById("hqSheet");
          if (s && !s.hidden) { hqClose(); }
        }
      });
    }
  }

  function backPage(name) { switchPage(name); }

  var LUNAR_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月",
                      "七月", "八月", "九月", "十月", "冬月", "腊月"];
  var LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
                    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
                    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  var lunarFmt = null;
  try {
    lunarFmt = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" });
    var lunarProbe = lunarFmt.formatToParts(new Date());
    var lunarOk = false;
    for (var lp = 0; lp < lunarProbe.length; lp++) {
      if (lunarProbe[lp].type === "month" || lunarProbe[lp].type === "day") { lunarOk = true; }
    }
    if (!lunarOk) { lunarFmt = null; }
  } catch (e) { lunarFmt = null; }

  function cnNum(s) {
    if (!s) { return -1; }
    var map = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
                "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12 };
    if (map[s] !== undefined) { return map[s]; }
    var n = parseInt(s, 10);
    return isNaN(n) ? -1 : n;
  }

  /* 返回「八月十八」这样的农历文本；解析不出来时返回空串（不显示） */
  function lunarText(d) {
    if (!lunarFmt || !d) { return ""; }
    var mo = "", dy = "", leap = false;
    try {
      var parts = lunarFmt.formatToParts(d);
      for (var i = 0; i < parts.length; i++) {
        var t = parts[i].type, v = parts[i].value || "";
        if (t === "month") { mo = v; }
        else if (t === "day") { dy = v; }
        else if (v.indexOf("闰") >= 0) { leap = true; }
      }
    } catch (e) { return ""; }
    if (!mo || !dy) { return ""; }
    if (mo.indexOf("闰") >= 0 || dy.indexOf("闰") >= 0) { leap = true; }
    var mi = cnNum(String(mo).replace(/[\u6708\u65e5\s]/g, ""));
    var di = cnNum(String(dy).replace(/[\u6708\u65e5\s]/g, ""));
    if (mi < 1 || mi > 12 || di < 1 || di > 30) { return ""; }
    return (leap ? "闰" : "") + LUNAR_MONTHS[mi - 1] + LUNAR_DAYS[di - 1];
  }

  /* 横排日历：周一为首日 · 中心突出当日 · 左侧标注月份 · 底部农历 + 本月进度 */
  var WEEK_CN = ["一", "二", "三", "四", "五", "六", "日"];

  function renderCalendar() {
    var week = document.getElementById("calWeek");
    var monthEl = document.getElementById("calMonth");
    if (!week) { return; }
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 3);                 /* 左移 3 天 = 最左侧格子 */
    var html = "", i, d, isToday;
    for (i = 0; i < 7; i++) {
      d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      isToday = (d.getFullYear() === now.getFullYear() &&
                 d.getMonth() === now.getMonth() &&
                 d.getDate() === now.getDate());
      html += '<span class="cal-day' + (isToday ? " today" : "") + '">' +
        '<span class="cal-w">' + WEEK_CN[(d.getDay() + 6) % 7] + "</span>" +
        '<span class="cal-d">' + d.getDate() + "</span></span>";
    }
    week.innerHTML = html;
    if (monthEl) { monthEl.textContent = (now.getMonth() + 1) + "月"; }

    var lunarEl = document.getElementById("calLunar");
    if (lunarEl) { lunarEl.textContent = lunarText(now) || "—"; }
    var days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var passed = now.getDate();
    var fillEl = document.getElementById("calProgFill");
    if (fillEl) { fillEl.style.width = Math.round(passed / days * 100) + "%"; }
    var pTxt = document.getElementById("calProgTxt");
    if (pTxt) { pTxt.textContent = passed + " / " + days; }
  }

  
