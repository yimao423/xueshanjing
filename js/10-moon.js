/* =========================================================
   月汐笺语（月经记录）—— 对标拾心界 period 模块移植
   纯前端 SPA 增量模块：
   · 数据键独立：snowcrystal.moon.records / snowcrystal.moon.settings
     / snowcrystal.moon.reminderDate（不触碰既有 snowcrystal.* 结构）
   · 弹窗复用全站 metric-mask / metric-sheet 体系
   · 样式复用主题变量（--accent / --text-* / --ui / --ui-base / --popup-*）
   · 全部函数独立命名 moonXxx，不覆盖既有全局
   ========================================================= */
"use strict";
(function () {
  var MOON_RECORDS_KEY = "snowcrystal.moon.records";
  var MOON_SETTINGS_KEY = "snowcrystal.moon.settings";
  var MOON_REMINDER_KEY = "snowcrystal.moon.reminderDate";
  var MOON_MSG_KEY = "snowcrystal.moon.messages";

  var moonViewDate = new Date();   // 月历当前展示年月
  var moonFlow = 1;                // 记录卡当前选中流量
  var moonPain = 0;                // 记录卡当前选中疼痛
  var moonEditDate = "";           // 记录卡当前编辑日期
  var moonMarkToday = true;        // 记录卡「今天来月经」开关
  var moonConfirmCb = null;        // 记录卡内嵌确认回调

  /* ---------- 小工具 ---------- */
  function moonEsc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function moonToast(text) {
    var el = document.getElementById("moonToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "moonToast";
      el.className = "wc-toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("is-on");
    window.setTimeout(function () { el.classList.remove("is-on"); }, 1600);
  }

  /* ---------- 数据读写 ---------- */
  function moonLoadRecords() {
    try {
      var raw = window.localStorage.getItem(MOON_RECORDS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function moonSaveRecords(records) {
    try { window.localStorage.setItem(MOON_RECORDS_KEY, JSON.stringify(records)); } catch (e) {}
  }
  function moonGetSettings() {
    try {
      var s = JSON.parse(window.localStorage.getItem(MOON_SETTINGS_KEY) || "null");
      if (s && s.cycleLength) { return s; }
    } catch (e) {}
    return { cycleLength: 28, periodLength: 7 };
  }
  function moonPersistSettings(s) {
    try { window.localStorage.setItem(MOON_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ---------- 月汐留言（对方角色针对月经的温柔留言，对标拾心界 PeriodReminder.quotes） ---------- */
  var MOON_DEFAULT_MESSAGES = [
    "生理期快到了，这几天记得早点睡，别着凉，暖宝宝我已经帮你记在备忘录里啦。",
    "宝，预测经期就在眼前了，红糖水、暖水袋都安排上，难受了就随时找我。",
    "再过两天就是你的生理期了，这阵子少吃生冷，我会一直陪着你。",
    "亲爱的，经期倒计时开始啦，这两天别逞强，重活都交给我。",
    "预测你的经期快到了，记得照顾好自己，晚上盖好被子，别踢被子啦。"
  ];
  function moonLoadMessages() {
    try {
      var raw = window.localStorage.getItem(MOON_MSG_KEY);
      var arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) {
        return arr.map(function (m) {
          return { id: String(m.id), text: String(m.text) };
        });
      }
    } catch (e) {}
    return MOON_DEFAULT_MESSAGES.map(function (t, i) { return { id: "m" + (i + 1), text: t }; });
  }
  function moonSaveMessages(list) {
    try { window.localStorage.setItem(MOON_MSG_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function moonOpenMessages() {
    var mask = document.getElementById("moonMsgMask");
    var sheet = document.getElementById("moonMsgSheet");
    if (!sheet) { return; }
    moonRenderMessages();
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
  }
  function moonCloseMessages() {
    var mask = document.getElementById("moonMsgMask");
    var sheet = document.getElementById("moonMsgSheet");
    if (mask) { mask.hidden = true; }
    if (sheet) { sheet.hidden = true; }
  }
  function moonAddMessage() {
    var input = document.getElementById("moonMsgInput");
    var text = input ? input.value.trim() : "";
    if (!text) { return; }
    var list = moonLoadMessages();
    list.push({ id: "m" + Date.now(), text: text });
    moonSaveMessages(list);
    if (input) { input.value = ""; }
    moonRenderMessages();
    moonToast("留言已添加");
  }
  function moonDeleteMessage(id) {
    var list = moonLoadMessages().filter(function (m) { return m.id !== id; });
    moonSaveMessages(list);
    moonRenderMessages();
    moonToast("留言已删除");
  }
  function moonRenderMessages() {
    var box = document.getElementById("moonMsgList");
    if (!box) { return; }
    var list = moonLoadMessages();
    if (!list.length) {
      box.innerHTML = '<div class="moon-msg-empty">还没有留言，添加一条温柔提醒吧</div>';
      return;
    }
    box.innerHTML = list.map(function (m) {
      return '<div class="moon-msg-item">' +
        '<span class="moon-msg-text">' + moonEsc(m.text) + "</span>" +
        '<button type="button" class="moon-msg-del" onclick="SnowCrystal.moonDeleteMessage(\'' + m.id + '\')">删除</button>' +
      "</div>";
    }).join("");
  }

  /* ---------- 日期工具 ---------- */
  function moonParse(s) {
    if (s instanceof Date) { return new Date(s.getFullYear(), s.getMonth(), s.getDate()); }
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function moonFmt(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, "0") + "-" + d.getDate().toString().padStart(2, "0");
  }
  function moonAddDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  function moonDiffDays(a, b) {
    var da = a instanceof Date ? new Date(a.getFullYear(), a.getMonth(), a.getDate()) : moonParse(a);
    var db = b instanceof Date ? new Date(b.getFullYear(), b.getMonth(), b.getDate()) : moonParse(b);
    return Math.round((db - da) / 86400000);
  }

  /* ---------- 生理算法（与拾心界 PeriodCalc 对齐） ---------- */
  var MoonCalc = {
    /* 平均周期 = 相邻经期起始日间隔均值 */
    calcAvgCycle: function () {
      var records = moonLoadRecords();
      var starts = records.map(function (r) { return moonParse(r.startDate); }).sort(function (a, b) { return a - b; });
      if (starts.length < 2) { return null; }
      var sum = 0;
      for (var i = 1; i < starts.length; i++) { sum += moonDiffDays(starts[i - 1], starts[i]); }
      return Math.round(sum / (starts.length - 1));
    },
    /* 经期天数 = 最近一次记录 endDate - startDate + 1 */
    calcPeriodLength: function () {
      var records = moonLoadRecords();
      if (!records.length) { return null; }
      var sorted = records.slice().sort(function (a, b) { return b.startDate.localeCompare(a.startDate); });
      return moonDiffDays(sorted[0].startDate, sorted[0].endDate) + 1;
    },
    /* 预估排卵日 = 最近一次经期结束日 + 9 天 */
    calcOvulationDay: function () {
      var records = moonLoadRecords();
      if (!records.length) { return null; }
      var sorted = records.slice().sort(function (a, b) { return b.startDate.localeCompare(a.startDate); });
      return moonAddDays(moonParse(sorted[0].endDate), 9);
    },
    /* 预估下次月经首日 = 预估排卵日 + 黄体期 14 天 */
    predictNextPeriodStart: function () {
      var ov = this.calcOvulationDay();
      if (!ov) { return null; }
      return moonAddDays(ov, 14);
    },
    /* 排卵期 = 结束日+4 ~ 结束日+9 共 6 天，第 6 天为排卵日 */
    calcOvulationWindow: function () {
      var ov = this.calcOvulationDay();
      if (!ov) { return null; }
      return { start: moonAddDays(ov, -5), end: ov };
    },
    /* 预测经期区间 = 预测起始日 + 经期天数 */
    predictPeriodRange: function () {
      var next = this.predictNextPeriodStart();
      if (!next) { return null; }
      var len = this.calcPeriodLength() || moonGetSettings().periodLength;
      return { start: next, end: moonAddDays(next, len - 1) };
    }
  };

  /* ---------- 弹窗开关 ---------- */
  function moonOpen(view) {
    var mask = document.getElementById("moonMask");
    var sheet = document.getElementById("moonSheet");
    if (!sheet) { return; }
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
    moonRender();
    /* v3 主弹窗按入口模式显示：
       cycle    → 仅周期显示主图（环状周期图）
       reminder → 仅温馨提醒模块（倒计时 + 留言 / 管理按钮）
       stats    → 仅日历记录（记录经期）+ 底部周期设置按钮
       record   → 记录卡 + 日历 + 概览/图例（保持原行为）
       默认     → 概览 + 日历 + 图例（保持原行为） */
    var all = ["moonOverview", "moonCycleView", "moonStatsView", "moonReminderView", "moonCalendar", "moonLegend", "moonRecordCard"];
    function setHidden(id, hidden) {
      var el = document.getElementById(id);
      if (el) { el.hidden = hidden; }
    }
    var showMap = {
      cycle:    { moonCycleView: true },
      reminder: { moonReminderView: true },
      stats:    { moonCalendar: true, moonLegend: true },
      record:   { moonOverview: true, moonCalendar: true, moonLegend: true, moonRecordCard: true },
      default:  { moonOverview: true, moonCalendar: true, moonLegend: true }
    };
    var show = showMap[view] || showMap.default;
    all.forEach(function (id) {
      setHidden(id, !show[id]);
    });
    /* 记录卡使用 style.display 控制，非「记录」入口一律隐藏 */
    if (view !== "record") {
      var rc = document.getElementById("moonRecordCard");
      if (rc) { rc.style.display = "none"; }
    }
    /* 按入口聚焦 */
    if (view === "cycle") {
      var cv = document.getElementById("moonCycleView");
      if (cv) { cv.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    } else if (view === "reminder") {
      var rv = document.getElementById("moonReminderView");
      if (rv) { rv.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    } else if (view === "stats") {
      var cal = document.getElementById("moonCalendar");
      if (cal) { cal.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    } else if (view === "record") {
      var card = document.getElementById("moonRecordCard");
      if (card) { card.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    }
  }
  function moonClose() {
    moonConfirmCb = null;
    var mask = document.getElementById("moonMask");
    var sheet = document.getElementById("moonSheet");
    if (mask) { mask.hidden = true; }
    if (sheet) { sheet.hidden = true; }
  }

  /* ---------- 渲染：概览 + 日历 + 图例 + 记录卡 + 三视图 ---------- */
  function moonRender() {
    var ov = document.getElementById("moonOverview");
    if (ov) { ov.innerHTML = moonRenderOverview(); }
    var cal = document.getElementById("moonCalendar");
    if (cal) { cal.innerHTML = moonRenderCalendar(moonViewDate); }
    var legend = document.getElementById("moonLegend");
    if (legend) { legend.innerHTML = moonRenderLegend(); }
    var cv = document.getElementById("moonCycleView");
    if (cv) { cv.innerHTML = moonRenderCycleView(); }
    var sv = document.getElementById("moonStatsView");
    if (sv) { sv.innerHTML = moonRenderStatsView(); }
    var rv = document.getElementById("moonReminderView");
    if (rv) { rv.innerHTML = moonRenderReminderView(); }
    moonSyncRecordCard();
  }

  /* ---------- 周期显示视图：环状周期图（主图，保留标题/副文字/提示，去掉进度条与时间轴） ---------- */
  function moonRenderCycleView() {
    var settings = moonGetSettings();
    var records = moonLoadRecords();
    var now = new Date();
    var next = MoonCalc.predictNextPeriodStart();
    var ovDay = MoonCalc.calcOvulationDay();
    var win = MoonCalc.calcOvulationWindow();

    var cycle = settings.cycleLength || 28;
    var period = settings.periodLength || 7;
    /* 当前所处阶段 */
    var phase = "安全期";
    var pct = 0;
    if (next) {
      var d = moonDiffDays(now, next);
      var cyclePos = cycle - d;
      if (cyclePos < 1) { cyclePos = 1; }
      if (cyclePos > cycle) { cyclePos = cycle; }
      pct = Math.round((cyclePos / cycle) * 100);
      if (cyclePos <= period) { phase = "经期"; }
      else if (win && now >= win.start && now <= win.end) { phase = "排卵期"; }
      else if (cyclePos >= cycle - 3) { phase = "预测经期临近"; }
      else if (cyclePos <= period + 6) { phase = "卵泡期"; }
    }
    /* 环状图：SVG 圆环表示当前周期进度 */
    var r = 54, c = 2 * Math.PI * r;
    var arc = Math.round(c * (pct / 100));
    var ring =
      '<svg class="moon-ring" viewBox="0 0 140 140" aria-label="周期进度环">' +
        '<circle class="moon-ring-bg" cx="70" cy="70" r="' + r + '"></circle>' +
        '<circle class="moon-ring-fg" cx="70" cy="70" r="' + r + '" stroke-dasharray="' + arc + " " + (c - arc) + '"></circle>' +
        '<text class="moon-ring-pct" x="70" y="64" text-anchor="middle">' + pct + "%</text>" +
        '<text class="moon-ring-label" x="70" y="84" text-anchor="middle">' + moonEsc(phase) + "</text>" +
      "</svg>";
    /* 阶段进度条与时间轴已按要求移除：周期显示只保留环状主图 */
    return '<div class="moon-cycle-card">' +
      '<div class="moon-view-title">周期显示</div>' +
      '<div class="moon-cycle-main">' + ring + "</div>" +
      '<div class="moon-cycle-sub">当前周期第 ' + (next ? Math.min(cycle, Math.max(1, cycle - moonDiffDays(now, next))) : "—") + " 天 / 共 " + cycle + " 天</div>" +
      '<div class="moon-cycle-hint">' + (records.length ? "基于最近记录推算 · 环状图展示当前周期进度" : "记录 2 次经期后自动推算平均值") + "</div>" +
    "</div>";
  }

  /* ---------- 周期统计视图：下次经期 / 排卵日 / 平均周期（对标拾心界概览统计） ---------- */
  function moonRenderStatsView() {
    var records = moonLoadRecords();
    var settings = moonGetSettings();
    var now = new Date();
    var rows = "";
    var hint = records.length ? "基于 " + records.length + " 次记录统计 · 排卵期/预测经期按最近一次经期推算" : "记录 2 次经期后自动推算平均值";
    var next = MoonCalc.predictNextPeriodStart();
    var ovDay = MoonCalc.calcOvulationDay();
    var win = MoonCalc.calcOvulationWindow();
    var range = MoonCalc.predictPeriodRange();
    var avgCycle = MoonCalc.calcAvgCycle();
    var avgLen = MoonCalc.calcPeriodLength();
    function statRow(label, value) {
      return '<div class="moon-ov-row"><span class="moon-ov-label">' + label + "</span>" +
        '<span class="moon-ov-value">' + value + "</span></div>";
    }
    if (next) {
      var d = moonDiffDays(now, next);
      rows += statRow("下次经期", d > 0 ? d + " 天后" : (d === 0 ? "今天" : "已开始"));
    } else { rows += statRow("下次经期", "—"); }
    if (ovDay) {
      var od = moonDiffDays(now, ovDay);
      rows += statRow("排卵日", od > 0 ? od + " 天后" : (od === 0 ? "今天" : moonFmt(ovDay)));
    } else { rows += statRow("排卵日", "—"); }
    rows += statRow("排卵期", win ? (win.start.getMonth() + 1) + "月" + win.start.getDate() + "日 ~ " + (win.end.getMonth() + 1) + "月" + win.end.getDate() + "日" : "—");
    rows += statRow("预测经期", range ? (range.start.getMonth() + 1) + "月" + range.start.getDate() + "日 ~ " + (range.end.getMonth() + 1) + "月" + range.end.getDate() + "日" : "—");
    rows += statRow("平均周期", avgCycle ? avgCycle + " 天" : "—");
    rows += statRow("平均经期", avgLen ? avgLen + " 天" : "—");
    return '<div class="moon-stats-card">' +
      '<div class="moon-view-title">周期统计</div>' +
      '<div class="moon-ov-card">' + rows + '<div class="moon-ov-hint">' + hint + "</div></div>" +
    "</div>";
  }

  /* ---------- 温馨提醒视图：经期前提醒 + 对方角色温柔留言（对标拾心界温馨提醒 + PeriodReminder） ---------- */
  function moonRenderReminderView() {
    var records = moonLoadRecords();
    var next = MoonCalc.predictNextPeriodStart();
    var msgs = moonLoadMessages();
    var quote = msgs.length ? msgs[Math.floor(Math.random() * msgs.length)].text : MOON_DEFAULT_MESSAGES[0];
    var body = "";
    if (!records.length) {
      body = '<div class="moon-reminder-empty">还没有经期记录，先去「记录经期」里记录吧</div>';
    } else if (next) {
      var d = moonDiffDays(new Date(), next);
      var when = d > 3 ? "预计 " + d + " 天后" : (d > 0 ? "还有 " + d + " 天" : (d === 0 ? "就在今天" : "已经到来"));
      body = '<div class="moon-reminder-big">' + when + "</div>" +
        '<div class="moon-reminder-msg">' + moonEsc(quote) + "</div>" +
        '<button type="button" class="save-btn" onclick="SnowCrystal.moonOpenMessages()">管理温柔留言</button>';
    } else {
      body = '<div class="moon-reminder-empty">数据不足，记录后即可获得提醒</div>';
    }
    return '<div class="moon-reminder-card">' +
      '<div class="moon-view-title">温馨提醒</div>' +
      body +
    "</div>";
  }

  function moonRenderOverview() {
    var records = moonLoadRecords();
    var settings = moonGetSettings();
    var now = new Date();

    if (!records.length) {
      return '<div class="moon-ov-card">' +
        '<div class="moon-ov-title">经期与周期</div>' +
        '<div class="moon-ov-row"><span class="moon-ov-label">默认周期</span><span class="moon-ov-value">' + settings.cycleLength + '<small> 天</small></span></div>' +
        '<div class="moon-ov-row"><span class="moon-ov-label">默认经期</span><span class="moon-ov-value">' + settings.periodLength + '<small> 天</small></span></div>' +
        '<div class="moon-ov-hint">记录 2 次经期后自动推算平均值</div>' +
      "</div>";
    }

    var sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    var recent = records.filter(function (r) { return moonParse(r.startDate) >= sixMonthsAgo; });
    var pool = recent.length >= 2 ? recent : records;

    var starts = pool.map(function (r) { return moonParse(r.startDate); }).sort(function (a, b) { return a - b; });
    var avgCycle = null;
    if (starts.length >= 2) {
      var sum = 0;
      for (var i = 1; i < starts.length; i++) { sum += moonDiffDays(starts[i - 1], starts[i]); }
      avgCycle = Math.round(sum / (starts.length - 1));
    }
    var lens = pool.map(function (r) { return moonDiffDays(r.startDate, r.endDate) + 1; });
    var avgLen = lens.length ? Math.round(lens.reduce(function (a, b) { return a + b; }, 0) / lens.length) : null;

    var len = avgLen || settings.periodLength;
    var nextStart = MoonCalc.predictNextPeriodStart();
    var ovDay = MoonCalc.calcOvulationDay();

    var nextRow = "";
    if (nextStart) {
      var diff = moonDiffDays(now, nextStart);
      nextRow = '<div class="moon-ov-row"><span class="moon-ov-label">下次经期</span>' +
        '<span class="moon-ov-value">' + (diff > 0 ? diff + " 天后" : (diff === 0 ? "今天" : "已开始")) + "</span></div>";
    }
    var ovRow = "";
    if (ovDay) {
      var ovDiff = moonDiffDays(now, ovDay);
      ovRow = '<div class="moon-ov-row"><span class="moon-ov-label">排卵日</span>' +
        '<span class="moon-ov-value">' + (ovDiff > 0 ? ovDiff + " 天后" : (ovDiff === 0 ? "今天" : moonFmt(ovDay))) + "</span></div>";
    }
    var hint = avgCycle
      ? "基于 " + pool.length + " 次记录统计 · 排卵期/预测经期按最近一次经期推算"
      : "基于最近一次经期推算排卵期与预测经期";

    return '<div class="moon-ov-card">' +
      '<div class="moon-ov-title">经期与周期</div>' +
      nextRow + ovRow +
      '<div class="moon-ov-row"><span class="moon-ov-label">近 6 个月平均经期</span><span class="moon-ov-value">' + len + '<small> 天</small></span></div>' +
      '<div class="moon-ov-row"><span class="moon-ov-label">近 6 个月平均周期</span><span class="moon-ov-value">' + (avgCycle ? avgCycle + '<small> 天</small>' : "<small>记录中</small>") + "</span></div>" +
      '<div class="moon-ov-hint">' + hint + "</div>" +
    "</div>";
  }

  function moonRenderLegend() {
    return '<div class="moon-legend">' +
      '<span class="moon-legend-title">图例</span>' +
      '<span class="moon-legend-item"><span class="moon-dot moon-dot-period"></span>经期</span>' +
      '<span class="moon-legend-item"><span class="moon-dot moon-dot-predict"></span>预测经期</span>' +
      '<span class="moon-legend-item"><span class="moon-dot moon-dot-ovday">★</span>排卵日</span>' +
      '<span class="moon-legend-item"><span class="moon-dot moon-dot-ovwin"></span>排卵期</span>' +
      '<span class="moon-legend-item"><span class="moon-dot moon-dot-today"></span>今天</span>' +
    "</div>";
  }

  function moonRenderCalendar(date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayStr = moonFmt(new Date());
    var records = moonLoadRecords();

    var periodDays = {};
    var periodFlowMap = {};
    var periodPainMap = {};
    records.forEach(function (r) {
      var d = moonParse(r.startDate);
      var end = moonParse(r.endDate);
      while (d <= end) {
        var ds = moonFmt(d);
        periodDays[ds] = 1;
        var day = (r.daily && r.daily[ds]) || {};
        if (day.flow != null) { periodFlowMap[ds] = day.flow; }
        if (day.pain != null) { periodPainMap[ds] = day.pain; }
        d = moonAddDays(d, 1);
      }
    });

    var predictRange = MoonCalc.predictPeriodRange();
    var predictDays = {};
    if (predictRange) {
      var pd = predictRange.start;
      while (pd <= predictRange.end) {
        predictDays[moonFmt(pd)] = 1;
        pd = moonAddDays(pd, 1);
      }
    }

    var ovDayStrSet = {};
    var ovWinDays = {};
    records.forEach(function (r) {
      var end = moonParse(r.endDate);
      var ov = moonAddDays(end, 9);
      ovDayStrSet[moonFmt(ov)] = 1;
      var wd = moonAddDays(end, 4);
      while (wd <= ov) {
        ovWinDays[moonFmt(wd)] = 1;
        wd = moonAddDays(wd, 1);
      }
    });

    var monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    var dayHeaders = ["日", "一", "二", "三", "四", "五", "六"];

    var html = '<div class="moon-cal-card">' +
      '<div class="moon-cal-head">' +
        '<span class="moon-cal-month">' + year + "年 " + monthNames[month] + "</span>" +
        '<span class="moon-cal-nav">' +
          '<button type="button" class="moon-cal-btn" onclick="SnowCrystal.moonChangeMonth(-1)" aria-label="上个月">‹</button>' +
          '<button type="button" class="moon-cal-btn" onclick="SnowCrystal.moonChangeMonth(1)" aria-label="下个月">›</button>' +
        "</span>" +
      "</div>" +
      '<div class="moon-cal-grid">';

    dayHeaders.forEach(function (h) { html += '<span class="moon-cal-dhead">' + h + "</span>"; });
    for (var i = 0; i < firstDay; i++) { html += '<span class="moon-cal-day moon-cal-other"></span>'; }
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + "-" + (month + 1).toString().padStart(2, "0") + "-" + d.toString().padStart(2, "0");
      var cls = "moon-cal-day";
      if (dateStr === todayStr) { cls += " moon-today"; }
      if (periodDays[dateStr]) { cls += " moon-day-period"; }
      else if (ovDayStrSet[dateStr]) { cls += " moon-day-ovday"; }
      else if (ovWinDays[dateStr]) { cls += " moon-day-ovwin"; }
      else if (predictDays[dateStr]) { cls += " moon-day-predict"; }

      var badge = "";
      if (periodDays[dateStr]) {
        var flow = Math.max(0, Math.min(3, periodFlowMap[dateStr] || 0));
        var pain = Math.max(0, Math.min(3, periodPainMap[dateStr] || 0));
        if (flow > 0) { badge += '<span class="moon-drop">' + moonDropIcons(flow) + "</span>"; }
        if (pain > 0) { badge += '<span class="moon-pain">' + moonPainIcons(pain) + "</span>"; }
      }
      /* 状态标记：状态日以整格背景填充标示（经期/预测经期纯色底、排卵期浅蓝块、排卵日★符号），
         仅排卵日渲染小五角星；仅今天且无其它状态时渲染"今天"浅灰蓝空心圆 */
      var mark = "";
      if (ovDayStrSet[dateStr]) {
        mark = '<span class="moon-star">★</span>';
      } else if (periodDays[dateStr] || ovWinDays[dateStr] || predictDays[dateStr]) {
        mark = '<span class="moon-dot-mark"></span>';
      } else if (dateStr === todayStr) {
        mark = '<span class="moon-dot-mark moon-dot-today-only"></span>';
      }
      if (moonEditDate && dateStr === moonEditDate) { cls += " moon-current"; }
      html += '<div class="' + cls + '" data-ds="' + dateStr + '" role="button" tabindex="0" onclick="SnowCrystal.moonRecordDay(\'' + dateStr + '\')">' + d + mark + badge + "</div>";
    }
    html += "</div></div>";
    return html;
  }

  function moonDropIcons(n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      s += '<svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" aria-hidden="true"><path d="M12 3.2c2.9 3.8 5 6.6 5 9a5 5 0 1 1-10 0c0-2.4 2.1-5.2 5-9z"/></svg>';
    }
    return s;
  }
  function moonPainIcons(n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      s += '<svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor" aria-hidden="true"><path d="M13 2.8 5 13.6h5.4L9.6 21l8-10.8h-5.4z"/></svg>';
    }
    return s;
  }

  function moonChangeMonth(delta) {
    moonViewDate = new Date(moonViewDate.getFullYear(), moonViewDate.getMonth() + delta, 1);
    var cal = document.getElementById("moonCalendar");
    if (cal) { cal.innerHTML = moonRenderCalendar(moonViewDate); }
  }

  /* ---------- 记录卡 ---------- */
  function moonSyncRecordCard() {
    var card = document.getElementById("moonRecordCard");
    if (!card) { return; }
    var todayStr = moonFmt(new Date());
    var records = moonLoadRecords();
    var active = records.find(function (r) { return todayStr >= r.startDate && todayStr <= r.endDate; });
    if (active) { moonRenderRecordCard(todayStr); }
    else { card.style.display = "none"; }
  }

  function moonRecordDay(dateStr) {
    moonRenderRecordCard(dateStr);
    var cal = document.getElementById("moonCalendar");
    if (cal) {
      var prev = cal.querySelector(".moon-cal-day.moon-current");
      if (prev) { prev.classList.remove("moon-current"); }
      var cell = cal.querySelector('.moon-cal-day[data-ds="' + dateStr + '"]');
      if (cell) { cell.classList.add("moon-current"); }
    }
    var card = document.getElementById("moonRecordCard");
    if (card) { card.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  function moonRenderRecordCard(dateStr) {
    var card = document.getElementById("moonRecordCard");
    if (!card) { return; }
    moonEditDate = dateStr;
    moonPain = 0;
    var records = moonLoadRecords();
    var existing = records.find(function (r) { return dateStr >= r.startDate && dateStr <= r.endDate; });
    var sorted = records.slice().sort(function (a, b) { return b.startDate.localeCompare(a.startDate); });
    var last = sorted[0];

    var html = "";
    if (existing) {
      var dayData = (existing.daily && existing.daily[dateStr]) || {};
      moonFlow = dayData.flow != null ? dayData.flow : (existing.flow || 1);
      moonPain = dayData.pain != null ? dayData.pain : (existing.pain || 0);
      var daySymp = dayData.symptoms != null ? dayData.symptoms : (existing.symptoms || "");
      var hasDaily = !!(existing.daily && existing.daily[dateStr]);
      var dayNum = moonDiffDays(existing.startDate, dateStr) + 1;
      html = '<div class="moon-record-panel">' +
        '<div class="moon-record-title">经期第 ' + dayNum + " 天</div>" +
        '<div class="moon-record-date">' + dateStr + " · " + existing.startDate + " 开始</div>" +
        (dateStr === existing.startDate
          ? '<button type="button" class="moon-cancel-btn" onclick="SnowCrystal.moonCancelRecord(\'' + dateStr + '\')">取消月经标注</button>'
          : '<button type="button" class="moon-end-btn" onclick="SnowCrystal.moonEndNow(\'' + dateStr + '\')">结束经期（到 ' + dateStr + " 为止）</button>") +
        '<div class="moon-form-label">经期量 <span class="moon-form-sub">点击水滴选择</span></div>' +
        '<div class="moon-drop-row">' + moonDropOptions() + "</div>" +
        '<div class="moon-form-label">疼痛强度 <span class="moon-form-sub">点击闪电选择</span></div>' +
        '<div class="moon-pain-row">' + moonPainOptions() + "</div>" +
        '<div class="moon-form-label">记录状态感受</div>' +
        '<input type="text" id="moonFeelInput" class="moon-input" placeholder="如腹胀、腰酸、心情烦躁" maxlength="60" value="' + moonEsc(daySymp) + '">' +
        (hasDaily
          ? '<div class="moon-daily-tip">本日已单独标记，修改只影响 ' + dateStr + " 这一天</div>" +
            '<button type="button" class="moon-clear-daily-btn" onclick="SnowCrystal.moonClearDaily(\'' + dateStr + '\')">清除本日标记，恢复整期默认</button>'
          : '<div class="moon-daily-tip">当前为整期默认，可单独标记这一天</div>') +
        '<div class="moon-actions">' +
          '<button type="button" class="ghost-btn" onclick="SnowCrystal.moonCloseRecordCard()">取消</button>' +
          '<button type="button" class="save-btn" onclick="SnowCrystal.moonSaveRecord()">保存</button>' +
        "</div>" +
      "</div>";
    } else {
      moonFlow = last ? (last.flow || 1) : 1;
      moonMarkToday = true;
      html = '<div class="moon-record-panel">' +
        '<div class="moon-record-title">记录经期</div>' +
        '<div class="moon-record-date">' + dateStr + "</div>" +
        '<div class="moon-mark-row">' +
          '<span class="moon-mark-label">今天来月经了吗？</span>' +
          '<span class="moon-switch' + (moonMarkToday ? " is-on" : "") + '" id="moonMarkSwitch" onclick="SnowCrystal.moonToggleMark()"></span>' +
        "</div>" +
        '<div class="moon-form-label">经期量 <span class="moon-form-sub">点击水滴选择</span></div>' +
        '<div class="moon-drop-row">' + moonDropOptions() + "</div>" +
        '<div class="moon-form-label">疼痛强度 <span class="moon-form-sub">点击闪电选择</span></div>' +
        '<div class="moon-pain-row">' + moonPainOptions() + "</div>" +
        '<div class="moon-form-label">记录状态感受</div>' +
        '<input type="text" id="moonFeelInput" class="moon-input" placeholder="如腹胀、腰酸、心情烦躁" maxlength="60">' +
        '<div class="moon-actions">' +
          '<button type="button" class="ghost-btn" onclick="SnowCrystal.moonCloseRecordCard()">取消</button>' +
          '<button type="button" class="save-btn" onclick="SnowCrystal.moonSaveRecord()">保存</button>' +
        "</div>" +
      "</div>";
    }
    card.innerHTML = html;
    card.style.display = "block";
    moonSelectFlow(moonFlow);
    moonSelectPain(moonPain);
  }

  function moonDropOptions() {
    var labels = ["少量", "中量", "大量"];
    var h = "";
    for (var i = 1; i <= 3; i++) {
      h += '<div class="moon-drop-opt" data-flow="' + i + '" onclick="SnowCrystal.moonSelectFlow(' + i + ')">' +
        '<span class="moon-drop-icon">' + moonDropIcons(i) + "</span>" +
        '<span class="moon-drop-text">' + labels[i - 1] + "</span>" +
      "</div>";
    }
    return h;
  }
  function moonPainOptions() {
    var labels = ["无痛", "轻微", "明显", "剧烈"];
    var h = "";
    for (var i = 0; i <= 3; i++) {
      var icons = i === 0 ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>' : moonPainIcons(i);
      h += '<div class="moon-pain-opt" data-pain="' + i + '" onclick="SnowCrystal.moonSelectPain(' + i + ')">' +
        '<span class="moon-pain-icon">' + icons + "</span>" +
        '<span class="moon-pain-text">' + labels[i] + "</span>" +
      "</div>";
    }
    return h;
  }

  function moonSelectFlow(f) {
    moonFlow = f;
    var els = document.querySelectorAll(".moon-drop-opt");
    for (var i = 0; i < els.length; i++) {
      els[i].classList.toggle("is-on", +els[i].getAttribute("data-flow") === f);
    }
  }
  function moonSelectPain(p) {
    moonPain = p;
    var els = document.querySelectorAll(".moon-pain-opt");
    for (var i = 0; i < els.length; i++) {
      els[i].classList.toggle("is-on", +els[i].getAttribute("data-pain") === p);
    }
  }
  function moonToggleMark() {
    moonMarkToday = !moonMarkToday;
    var sw = document.getElementById("moonMarkSwitch");
    if (sw) { sw.classList.toggle("is-on", moonMarkToday); }
  }

  function moonSaveRecord() {
    var feelInput = document.getElementById("moonFeelInput");
    var feel = (feelInput && feelInput.value.trim()) || "无";
    var records = moonLoadRecords();
    var existing = records.find(function (r) { return moonEditDate >= r.startDate && moonEditDate <= r.endDate; });

    if (existing) {
      existing.daily = existing.daily || {};
      existing.daily[moonEditDate] = { flow: moonFlow, pain: moonPain, symptoms: feel };
      moonSaveRecords(records);
      moonCloseRecordCard();
      moonRender();
      moonToast("已保存该天记录");
      return;
    }

    if (!moonMarkToday) {
      moonCloseRecordCard();
      moonToast("未标记为经期，未保存");
      return;
    }

    var len = moonGetSettings().periodLength;
    var endDate = moonAddDays(moonParse(moonEditDate), len - 1);
    var dayOne = { flow: moonFlow, pain: moonPain, symptoms: feel };
    records.push({
      id: Date.now(),
      startDate: moonEditDate,
      endDate: moonFmt(endDate),
      flow: moonFlow,
      pain: moonPain,
      symptoms: feel,
      daily: {}
    });
    records[records.length - 1].daily[moonEditDate] = dayOne;
    moonSaveRecords(records);
    moonCloseRecordCard();
    moonRender();
    moonToast("已标记经期（默认 " + len + " 天）");
  }

  function moonClearDaily(dateStr) {
    var records = moonLoadRecords();
    var existing = records.find(function (r) { return dateStr >= r.startDate && dateStr <= r.endDate; });
    if (!existing || !existing.daily || !existing.daily[dateStr]) {
      moonToast("该天没有单独标记");
      return;
    }
    delete existing.daily[dateStr];
    if (!Object.keys(existing.daily).length) { delete existing.daily; }
    moonSaveRecords(records);
    moonRenderRecordCard(dateStr);
    moonRender();
    moonToast("已恢复整期默认");
  }

  function moonEndNow(dateStr) {
    var target = dateStr || moonFmt(new Date());
    var records = moonLoadRecords();
    var existing = records.find(function (r) { return target >= r.startDate && target <= r.endDate; });
    if (!existing) { moonToast("该日期不在经期内"); return; }
    moonRenderConfirm(
      "结束经期",
      "确定将本次经期结束于 " + target + " 吗？",
      function () {
        existing.endDate = target;
        moonSaveRecords(records);
        moonCloseRecordCard();
        moonRender();
        moonToast("经期已结束");
      },
      false
    );
  }

  function moonCancelRecord(dateStr) {
    var records = moonLoadRecords();
    var existing = records.find(function (r) { return dateStr >= r.startDate && dateStr <= r.endDate; });
    if (!existing) { moonToast("该日期不在经期内"); return; }
    moonRenderConfirm(
      "取消月经标注",
      "确定取消 " + existing.startDate + " 开始的经期标注吗？该天的经期量、疼痛与感受数据将被清除。",
      function () {
        moonSaveRecords(records.filter(function (r) { return r.id !== existing.id; }));
        moonCloseRecordCard();
        moonRender();
        moonToast("已取消月经标注");
      },
      true
    );
  }

  function moonRenderConfirm(title, text, onConfirm, danger) {
    var card = document.getElementById("moonRecordCard");
    if (!card) { return; }
    moonConfirmCb = onConfirm;
    var btnCls = danger ? "moon-danger-btn" : "moon-ok-btn";
    card.innerHTML = '<div class="moon-record-panel">' +
      '<div class="moon-record-title">' + title + "</div>" +
      '<div class="moon-confirm-box">' +
        '<div class="moon-confirm-text">' + text + "</div>" +
        '<div class="moon-actions">' +
          '<button type="button" class="ghost-btn" onclick="SnowCrystal.moonCloseRecordCard()">返回</button>' +
          '<button type="button" class="' + btnCls + '" onclick="SnowCrystal.moonDoConfirm()">确认</button>' +
        "</div>" +
      "</div>" +
    "</div>";
    card.style.display = "block";
  }

  function moonDoConfirm() {
    var cb = moonConfirmCb;
    moonConfirmCb = null;
    if (cb) { cb(); }
  }

  function moonCloseRecordCard() {
    moonConfirmCb = null;
    var card = document.getElementById("moonRecordCard");
    if (card) { card.style.display = "none"; }
  }

  /* ---------- 温柔提醒（经期前三天，对标拾心界 PeriodReminder：对方角色关心文案） ---------- */
  var MoonReminder = {
    check: function () {
      try {
        var records = moonLoadRecords();
        if (!records || !records.length) { return; }
        var next = MoonCalc.predictNextPeriodStart();
        if (!next) { return; }
        var todayStr = moonFmt(new Date());
        var diff = moonDiffDays(new Date(), next);
        if (diff < 1 || diff > 3) { return; }
        var lastReminder = "";
        try { lastReminder = window.localStorage.getItem(MOON_REMINDER_KEY) || ""; } catch (e) {}
        if (lastReminder === todayStr) { return; }
        try { window.localStorage.setItem(MOON_REMINDER_KEY, todayStr); } catch (e) {}
        var msgs = moonLoadMessages();
        var quote = msgs.length ? msgs[Math.floor(Math.random() * msgs.length)].text : MOON_DEFAULT_MESSAGES[0];
        this.show(quote, diff);
      } catch (e) {}
    },
    /* 发送者：优先取账号设置「对方角色」第一位（对标拾心界 partners[0]），无则回退雪晶 */
    show: function (quote, diff) {
      var partner = null;
      try {
        var raw = window.localStorage.getItem("snowcrystal.account.partners.v1");
        var arr = raw ? JSON.parse(raw) : null;
        if (Array.isArray(arr) && arr.length && arr[0] && arr[0].name) { partner = arr[0]; }
      } catch (e) {}
      var senderName = partner ? String(partner.name) : "雪晶";
      var senderAvatar = partner && partner.avatar ? String(partner.avatar) : "";
      var senderChar = partner && partner.avatar && partner.avatar.length ? partner.avatar.charAt(0) : "雪";
      var overlay = document.getElementById("moonReminderOverlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "moonReminderOverlay";
        overlay.className = "moon-reminder-overlay";
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = '<div class="moon-reminder-panel" onclick="event.stopPropagation()">' +
        '<div class="moon-reminder-head">' +
          '<span class="moon-reminder-avatar">' + moonEsc(senderChar) + "</span>" +
          '<span class="moon-reminder-meta">' +
            '<span class="moon-reminder-name">' + moonEsc(senderName) + "</span>" +
            '<span class="moon-reminder-time">月汐笺语</span>' +
          "</span>" +
        "</div>" +
        '<div class="moon-reminder-bubble">' +
          '<div class="moon-reminder-tag">经期前 ' + diff + " 天提醒</div>" +
          "<div>" + moonEsc(quote) + "</div>" +
        "</div>" +
        '<div class="moon-reminder-actions">' +
          '<button type="button" class="ghost-btn" onclick="SnowCrystal.moonCloseReminder()">知道了</button>' +
          '<button type="button" class="save-btn" onclick="SnowCrystal.moonCloseReminder();SnowCrystal.moonOpen(\'record\')">去记录</button>' +
        "</div>" +
      "</div>";
      overlay.style.display = "flex";
      overlay.onclick = function () { moonCloseReminder(); };
    }
  };

  function moonCloseReminder() {
    var el = document.getElementById("moonReminderOverlay");
    if (el) { el.style.display = "none"; }
  }

  function moonCheckReminder() {
    MoonReminder.check();
  }

  /* ---------- 设置弹窗（默认周期 / 经期天数） ---------- */
  function moonOpenSettings() {
    var mask = document.getElementById("moonSettingsMask");
    var sheet = document.getElementById("moonSettingsSheet");
    if (!sheet) { return; }
    var s = moonGetSettings();
    var cy = document.getElementById("moonSettingsCycle");
    var pl = document.getElementById("moonSettingsPeriod");
    if (cy) { cy.value = s.cycleLength; }
    if (pl) { pl.value = s.periodLength; }
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
  }
  function moonCloseSettings() {
    var mask = document.getElementById("moonSettingsMask");
    var sheet = document.getElementById("moonSettingsSheet");
    if (mask) { mask.hidden = true; }
    if (sheet) { sheet.hidden = true; }
  }
  function moonSaveSettings() {
    var cy = document.getElementById("moonSettingsCycle");
    var pl = document.getElementById("moonSettingsPeriod");
    var cycle = cy ? Math.max(15, Math.min(60, parseInt(cy.value, 10) || 28)) : 28;
    var period = pl ? Math.max(1, Math.min(14, parseInt(pl.value, 10) || 7)) : 7;
    moonPersistSettings({ cycleLength: cycle, periodLength: period });
    moonCloseSettings();
    moonRender();
    moonToast("周期设置已保存");
  }

  /* ---------- 弹窗遮罩点击关闭：月汐主弹窗 / 周期设置 / 月汐留言（点空白遮罩即关） ---------- */
  function moonBindMaskDismiss() {
    var pairs = [
      ["moonMask", moonClose],
      ["moonSettingsMask", moonCloseSettings],
      ["moonMsgMask", moonCloseMessages]
    ];
    pairs.forEach(function (p) {
      var mask = document.getElementById(p[0]);
      if (mask && mask.getAttribute("data-moon-bound") !== "1") {
        mask.setAttribute("data-moon-bound", "1");
        mask.addEventListener("click", p[1]);
      }
    });
  }

  /* ---------- 页面初始化：绑定遮罩点击关闭 + 检查提醒 ---------- */
  function moonInit() {
    moonBindMaskDismiss();
    moonCheckReminder();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", moonInit);
  } else {
    window.setTimeout(moonInit, 400);
  }

  /* ---------- 挂载到全局（增量追加，不覆盖既有成员） ---------- */
  var NS = window.SnowCrystal || (window.SnowCrystal = {});
  NS.moonOpen = moonOpen;
  NS.moonClose = moonClose;
  NS.moonChangeMonth = moonChangeMonth;
  NS.moonRecordDay = moonRecordDay;
  NS.moonSelectFlow = moonSelectFlow;
  NS.moonSelectPain = moonSelectPain;
  NS.moonToggleMark = moonToggleMark;
  NS.moonSaveRecord = moonSaveRecord;
  NS.moonClearDaily = moonClearDaily;
  NS.moonEndNow = moonEndNow;
  NS.moonCancelRecord = moonCancelRecord;
  NS.moonDoConfirm = moonDoConfirm;
  NS.moonCloseRecordCard = moonCloseRecordCard;
  NS.moonOpenSettings = moonOpenSettings;
  NS.moonCloseSettings = moonCloseSettings;
  NS.moonSaveSettings = moonSaveSettings;
  NS.moonCloseReminder = moonCloseReminder;
  NS.moonCheckReminder = moonCheckReminder;
  NS.moonOpenMessages = moonOpenMessages;
  NS.moonCloseMessages = moonCloseMessages;
  NS.moonAddMessage = moonAddMessage;
  NS.moonDeleteMessage = moonDeleteMessage;
})();


