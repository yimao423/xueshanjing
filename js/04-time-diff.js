/* 时间相隔 */
"use strict";
  /* =========================================================
     v25：「时间相隔」—— 首页只读展示「时间相隔 N 秒」，点击弹出窗口分别设置
     「我方时间」「对方时间」（24 小时制），确认后自动算出两地相隔秒数并存进本机。
     首页数字不可直接编辑，只能通过弹窗改时间（原来「就地改整串文案」的做法已废弃）。
     ========================================================= */
  var METRIC_TIMES_KEY = "snowcrystal.metric.times.v2";
  var METRIC_TIMES_DEFAULT = { mine: [8, 0], other: [16, 0] };   /* 默认：我方 08:00 · 对方 16:00（相隔 28800 秒） */
  var metricTimes = { mine: [8, 0], other: [16, 0] };
  var metricSeconds = 28800;
  /* v39 ①：间隔显示模式 —— sec（秒，默认）/ min（分钟）/ hour（小时），本机记忆 */
  var METRIC_UNIT_KEY = "snowcrystal.metric.unit.v1";
  var METRIC_UNITS = { sec: "秒", min: "分钟", hour: "小时" };
  var metricUnit = "sec";


  function metricTimeToSeconds(hh, mm) {
    return (clamp(parseInt(hh, 10) || 0, 0, 23) * 3600) + (clamp(parseInt(mm, 10) || 0, 0, 59) * 60);
  }

  function metricPair(raw, fallback) {
    if (!raw || raw.length !== 2) { return fallback.slice(); }
    var hh = parseInt(String(raw[0]).replace(/[^0-9]/g, ""), 10);
    var mm = parseInt(String(raw[1]).replace(/[^0-9]/g, ""), 10);
    if (isNaN(hh)) { hh = fallback[0]; }
    if (isNaN(mm)) { mm = fallback[1]; }
    return [clamp(hh, 0, 23), clamp(mm, 0, 59)];
  }

  function loadMetric() {
    var raw = null;
    try { raw = window.localStorage ? window.localStorage.getItem(METRIC_TIMES_KEY) : null; } catch (e) { raw = null; }
    var valid = false;
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && o.mine && o.other) {
          metricTimes = {
            mine: metricPair(o.mine, METRIC_TIMES_DEFAULT.mine),
            other: metricPair(o.other, METRIC_TIMES_DEFAULT.other)
          };
          valid = true;
        }
      } catch (e) { valid = false; }
    }
    if (!valid) {
      metricTimes = { mine: METRIC_TIMES_DEFAULT.mine.slice(), other: METRIC_TIMES_DEFAULT.other.slice() };
    }
    metricSeconds = Math.abs(metricTimeToSeconds(metricTimes.mine[0], metricTimes.mine[1]) - metricTimeToSeconds(metricTimes.other[0], metricTimes.other[1]));
  }

  function persistMetric() {
    try {
      if (window.localStorage) { window.localStorage.setItem(METRIC_TIMES_KEY, JSON.stringify(metricTimes)); }
    } catch (e) { /* 忽略 */ }
  }

  function renderMetric() {
    var d = metricDisplay();
    var labelEl = document.getElementById("avatarMetricLabel");
    var numEl = document.getElementById("avatarMetricNum");
    var unitEl = document.getElementById("avatarMetricUnit");
    var host = document.getElementById("avatarMetric");
    if (labelEl) { labelEl.textContent = "时间相隔"; }
    if (numEl) { numEl.textContent = d.num; }
    if (unitEl) { unitEl.textContent = d.unit; }
    if (host) {
      host.classList.remove("is-plain");
      host.setAttribute("title", "点击设置两地时间（24 小时制）");
      host.setAttribute("aria-label", "时间相隔 " + d.num + " " + d.unit + "，点击设置两地时间");
    }
  }

  /* ---------- v39 ①：间隔显示模式（秒 / 分钟 / 小时） ----------
     metricSeconds 始终是本机存储的「真实相隔秒数」，显示时按 metricUnit 现算：
     秒 = 整数；分钟 = 1 位小数；小时 = 2 位小数（多余的 0 去掉）。
     显示单位存本机（localStorage），刷新 / 重开后保持上次选择。 */
  function metricTrim(n, digits) {
    var t = n.toFixed(digits);
    if (t.indexOf(".") >= 0) { t = t.replace(/0+$/, "").replace(/\.$/, ""); }
    return t;
  }
  function metricUnitText() {
    return METRIC_UNITS[metricUnit] || "秒";
  }
  function metricDisplay() {
    if (metricUnit === "min") { return { num: metricTrim(metricSeconds / 60, 1), unit: "分钟" }; }
    if (metricUnit === "hour") { return { num: metricTrim(metricSeconds / 3600, 2), unit: "小时" }; }
    return { num: String(metricSeconds), unit: "秒" };
  }
  function loadMetricUnit() {
    var raw = null;
    try { raw = window.localStorage ? window.localStorage.getItem(METRIC_UNIT_KEY) : null; } catch (e) { raw = null; }
    metricUnit = (raw && METRIC_UNITS[raw]) ? raw : "sec";
    syncMetricUnitUi();
  }
  function persistMetricUnit() {
    try { if (window.localStorage) { window.localStorage.setItem(METRIC_UNIT_KEY, metricUnit); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  /* 弹窗里三个分段按钮的选中态与 metricUnit 保持一致 */
  function syncMetricUnitUi() {
    var seg = document.getElementById("msUnitSeg");
    if (!seg) { return; }
    var btns = seg.querySelectorAll(".ms-seg-btn");
    for (var i = 0; i < btns.length; i++) {
      var on = (btns[i].getAttribute("data-unit") === metricUnit);
      if (on) { btns[i].classList.add("is-on"); } else { btns[i].classList.remove("is-on"); }
      btns[i].setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  function setMetricUnit(u) {
    if (!u || !METRIC_UNITS[u] || u === metricUnit) { return; }
    metricUnit = u;
    persistMetricUnit();
    syncMetricUnitUi();
    renderMetric();
  }

  function metricSheetEls() {
    return {
      mask: document.getElementById("metricMask"),
      sheet: document.getElementById("metricSheet"),
      mineH: document.getElementById("msMineH"), mineM: document.getElementById("msMineM"),
      otherH: document.getElementById("msOtherH"), otherM: document.getElementById("msOtherM")
    };
  }

  function openMetricSheet() {
    var els = metricSheetEls();
    if (!els.sheet) { return; }
    if (els.mineH) { els.mineH.value = String(metricTimes.mine[0]); }
    if (els.mineM) { els.mineM.value = String(metricTimes.mine[1]); }
    if (els.otherH) { els.otherH.value = String(metricTimes.other[0]); }
    if (els.otherM) { els.otherM.value = String(metricTimes.other[1]); }
    if (els.mask) { els.mask.hidden = false; }
    els.sheet.hidden = false;
  }

  function closeMetricSheet() {
    var els = metricSheetEls();
    if (els.sheet) { els.sheet.hidden = true; }
    if (els.mask) { els.mask.hidden = true; }
  }

  function readSheetTime(hEl, mEl, fallback) {
    var hh = hEl ? parseInt(String(hEl.value).replace(/[^0-9]/g, ""), 10) : NaN;
    var mm = mEl ? parseInt(String(mEl.value).replace(/[^0-9]/g, ""), 10) : NaN;
    if (isNaN(hh)) { hh = fallback[0]; }
    if (isNaN(mm)) { mm = fallback[1]; }
    return [clamp(hh, 0, 23), clamp(mm, 0, 59)];
  }

  function bindAvatarMetric() {
    loadMetric();
    loadMetricUnit();
    renderMetric();
    var els = metricSheetEls();
    var host = document.getElementById("avatarMetric");
    if (host) {
      host.addEventListener("click", function (e) { e.preventDefault(); openMetricSheet(); });
      host.addEventListener("keydown", function (e) {
        var k = e.key || "";
        if (k === "Enter" || k === " " || k === "Spacebar") { e.preventDefault(); openMetricSheet(); }
      });
    }
    var seg = document.getElementById("msUnitSeg");
    if (seg && seg.getAttribute("data-bound") !== "1") {
      seg.setAttribute("data-bound", "1");
      seg.addEventListener("click", function (e) {
        var btn = closestData(e.target || e.srcElement, "data-unit", seg);
        if (btn) { setMetricUnit(btn.getAttribute("data-unit")); }
      });
    }
    if (els.mask) { els.mask.addEventListener("click", closeMetricSheet); }
    var cancelBtn = document.getElementById("msCancel");
    if (cancelBtn) { cancelBtn.addEventListener("click", closeMetricSheet); }
    var confirmBtn = document.getElementById("msConfirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        metricTimes = {
          mine: readSheetTime(els.mineH, els.mineM, metricTimes.mine),
          other: readSheetTime(els.otherH, els.otherM, metricTimes.other)
        };
        metricSeconds = Math.abs(metricTimeToSeconds(metricTimes.mine[0], metricTimes.mine[1]) - metricTimeToSeconds(metricTimes.other[0], metricTimes.other[1]));
        persistMetric();
        renderMetric();
        closeMetricSheet();
      });
    }
    /* 弹窗内四项只接受数字：时 0~23、分 0~59 */
    [els.mineH, els.mineM, els.otherH, els.otherM].forEach(function (el, idx) {
      if (!el) { return; }
      var isHour = (idx === 0 || idx === 2);
      el.addEventListener("input", function () {
        var v = String(el.value).replace(/[^0-9]/g, "").slice(0, 2);
        if (v !== "") { v = String(clamp(parseInt(v, 10), 0, isHour ? 23 : 59)); }
        el.value = v;
      });
    });
    document.addEventListener("keydown", function (e) {
      if ((e.key || "") === "Escape" && els.sheet && !els.sheet.hidden) { closeMetricSheet(); }
    });
  }



