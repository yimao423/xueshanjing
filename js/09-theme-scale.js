/* 雪山晶 · 09-theme-scale ｜ 源：雪山晶.html L7716-L7866 ｜ JS 模块 */
var UI_BASE_W = 390;
  var UI_EXTRA = 1;          
  function updateUiScale() {
    var vw = window.innerWidth || UI_BASE_W;
    var frameW = vw;
    var base = Math.max(0.80, Math.min(1.16, frameW / UI_BASE_W));
    document.documentElement.style.setProperty("--ui-base", base.toFixed(4));
    var ui = base * UI_EXTRA;
    document.documentElement.style.setProperty("--ui", ui.toFixed(4));
    var uiHead = base * UI_NONHOME * 1.06 * PAGE_SIZE_BASE * pageSizeScale();
    document.documentElement.style.setProperty("--ui-head", uiHead.toFixed(4));
  }

var UI_NONHOME = 0.70;
  var PAGE_SIZE_BASE = 1.25;
  function pageSizeScale() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem("snowcrystal.pageSize") : null;
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.scale === "number" && o.scale >= 70 && o.scale <= 140) { return o.scale / 100; }
      }
    } catch (e) { /* 忽略损坏数据 */ }
    return 1;
  }

  var CORE_PAGE_SETS = {
    wordcard: ["wordcard", "wordcard-face-lib", "wc-lib", "wc-lib-group", "wc-hub", "sub-lib", "sub-group", "qa-lib", "voice-lib", "voice-lib-group"],
    discover: ["discover", "course-list", "course-detail", "course-schedule", "course-teachers", "course-collection", "course-tips"],
    settings: ["settings", "account-settings", "beautify", "appearance", "top-components", "size-settings", "data-manage", "chat-settings", "bar-settings", "chat-feature", "chat-autoreply", "chat-pace", "chat-letter-set", "chat-sound", "prob-settings", "effect-settings", "chat-bg", "bubble-settings", "bubble-mode-settings", "bubble-shop-settings", "redpack-skin"]
  };
  function isCoreScaledPage(dp) {
    if (!dp) { return false; }
    return CORE_PAGE_SETS.wordcard.indexOf(dp) !== -1 ||
           CORE_PAGE_SETS.discover.indexOf(dp) !== -1 ||
           CORE_PAGE_SETS.settings.indexOf(dp) !== -1;
  }
function fitOneScreen() {
    var page = document.querySelector(".page.is-active");
    if (!page) { return; }
    var ps = pageSizeScale();
    if (page.getAttribute && page.getAttribute("data-page") === "home") {
      UI_EXTRA = UI_NONHOME * homeSizeScale();
    } else {
      var dp = page.getAttribute("data-page");
      UI_EXTRA = (dp === "wordcard" || dp === "discover" || dp === "settings") ? UI_NONHOME * 1.06 : UI_NONHOME;
      if (isCoreScaledPage(dp)) { UI_EXTRA *= PAGE_SIZE_BASE * ps; }
    }
    updateUiScale();
    return;
  }

  function refitAll() {
    fitOneScreen();
    if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    window.setTimeout(function () {
      if (window.__frameRefresh) { window.__frameRefresh(); }
      if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    }, 90);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function randomizeCrystalStrip() {
    var strip = document.querySelector(".crystal-strip");
    if (!strip) { return; }
    var rootEl = document.documentElement;
    /* 优先读内联变量（applyState 写入），读不到再退化为计算样式，最后兜底默认主题色相 */
    var hv = parseFloat(rootEl.style.getPropertyValue("--accent-h"));
    if (isNaN(hv)) { hv = parseFloat(getComputedStyle(rootEl).getPropertyValue("--accent-h")); }
    var h = isNaN(hv) ? 219 : hv;
    var kids = strip.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var hue = ((h + rnd(-34, 34)) % 360 + 360) % 360;
      var col = "hsla(" + hue.toFixed(1) + ", " + Math.round(rnd(56, 94)) + "%, " +
                Math.round(rnd(50, 84)) + "%, " + rnd(0.55, 1).toFixed(2) + ")";
      if (el.classList && el.classList.contains("cs-dot")) {
        el.style.background = col;
        var ds = rnd(3, 5.4).toFixed(2) + "px";
        el.style.width = ds;
        el.style.height = ds;
      } else if (el.tagName && el.tagName.toLowerCase() === "svg") {
        var hasFill = el.getAttribute("fill") && el.getAttribute("fill") !== "none";
        var hasStroke = el.getAttribute("stroke") && el.getAttribute("stroke") !== "none";
        if (hasFill) { el.style.fill = col; }
        if (hasStroke) { el.style.stroke = col; }
        if (!hasFill && !hasStroke) { el.style.fill = col; }
        var base = parseFloat(el.getAttribute("data-base-size") || el.getAttribute("width")) || 10;
        el.setAttribute("data-base-size", base);
        var k = rnd(0.8, 1.3);
        el.setAttribute("width", (base * k).toFixed(2));
        el.setAttribute("height", (base * k).toFixed(2));
      }
      el.style.transform = "translateY(" + rnd(-1.6, 1.6).toFixed(2) + "px) rotate(" +
                           rnd(-16, 16).toFixed(1) + "deg)";
      el.style.opacity = rnd(0.62, 1).toFixed(2);
    }
  }

  var WAVE_KEY = "snow_crystal_wave_a_v30";
  var WAVE_DEF = 0.65;
  function waveValue() {
    try {
      var n = parseFloat(window.localStorage.getItem(WAVE_KEY));
      if (isFinite(n) && n >= 0 && n <= 1) { return n; }
    } catch (e) { /* 存储不可用则用默认 */ }
    return WAVE_DEF;
  }
  function waveApply() {
    var v = waveValue();
    document.documentElement.style.setProperty("--wave-a", v.toFixed(2));
    var wc = document.querySelector(".wave-card");
    if (wc) {
      if (v <= 0.001) { wc.setAttribute("data-wave-off", "1"); }
      else { wc.removeAttribute("data-wave-off"); }
    }
    return v;
  }
  function syncWaveUi() {
    var p = Math.round(waveValue() * 100);
    var r = document.getElementById("waveRange"), hex = document.getElementById("waveHex");
    if (r) { r.value = String(p); }
    if (hex) { hex.textContent = p + "%"; }
  }
  function bindWavePanel() {
    var r = document.getElementById("waveRange");
    var btn = document.getElementById("waveReset");
    if (r && r.getAttribute("data-bound") !== "1") {
      r.setAttribute("data-bound", "1");
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        try { window.localStorage.setItem(WAVE_KEY, String(v)); } catch (e) {}
        waveApply();   
        var hex = document.getElementById("waveHex");
        if (hex) { hex.textContent = Math.round(v * 100) + "%"; }
      });
      r.addEventListener("change", function () { tip("首页海浪白卡不透明度 " + r.value + "%。"); });
    }
    if (btn && btn.getAttribute("data-bound") !== "1") {
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        try { window.localStorage.setItem(WAVE_KEY, String(WAVE_DEF)); } catch (e) {}
        waveApply();
        syncWaveUi();
        tip("首页海浪白卡不透明度已恢复为 65%。");
      });
    }
  }

  
