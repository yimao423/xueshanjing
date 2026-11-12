/* 雪山晶 · 35-nav-multimode ｜ 源：雪山晶.html L23621-L23789 ｜ JS 模块 */
/* [2026-11-01] 底栏多模态（v2026.11） */
(function () {
  "use strict";

  var NAV_KEY = "snowcrystal.navMode";
  var NAV_MODES = ["docked", "auto", "pill", "fab"];
  var NAV_LABELS = { docked: "常驻", auto: "智能收纳", pill: "胶囊", fab: "雪花键" };
  var NAV_EXEMPT = ["chat-room", "chat-list", "mtx-session", "mtx-echo"];

  var navMode = "hidden";   /* 底栏已移除：固定 hidden，不再预留底部空间 */
  var navHidden = false;   /* auto 模式滚动隐藏态 */
  var navLastY = 0;

  function navPhone() { return document.querySelector(".phone"); }
  function currentPage() {
    var p = navPhone();
    return p ? (p.getAttribute("data-page") || "home") : "home";
  }
  function isExempt(key) { return NAV_EXEMPT.indexOf(key) >= 0; }

  function loadNavMode() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(NAV_KEY) : null;
      /* 底栏已移除：忽略 localStorage 中的历史导航形态设置 */
    } catch (e) { /* 忽略 */ }
  }
  function saveNavMode() {
    try {
      if (window.localStorage) { window.localStorage.setItem(NAV_KEY, navMode); }
    } catch (e) { /* 忽略 */ }
  }

  /* 聊天四页文字锁黑：默认主题灰阶修复不污染聊天页视觉 */
  function lockChatTextIfDefault() {
    var root = document.documentElement;
    var cur = "";
    try { cur = getComputedStyle(root).getPropertyValue("--text-1").trim(); } catch (e) { cur = ""; }
    var isDefaultGray = cur === "#14161A" || cur === "rgb(20, 22, 26)";
    if (!isDefaultGray) { return; }  /* 用户自定义颜色 / 其它主题：聊天页跟随，不动 */
    root.style.setProperty("--text-1", "#000000");
    root.style.setProperty("--text-2", "#000000");
    root.style.setProperty("--text-3", "#000000");
    root.style.setProperty("--text-4", "#000000");
    root.style.setProperty("--text-5", "#000000");
    root.style.setProperty("--text-title", "#000000");
    root.style.setProperty("--sub", "#000000");
  }

  /* 应用导航形态（切页收口由 switchPage 调用） */
  function applyNavMode(pageKey) {
    var phone = navPhone();
    if (!phone) { return; }
    var key = pageKey || currentPage();
    var root = document.documentElement;

    if (isExempt(key)) {
      root.setAttribute("data-nav", "hidden");
      closeNav();
      lockChatTextIfDefault();
      return;
    }
    root.setAttribute("data-nav", "hidden");   /* 底栏已移除 */
    navLastY = window.pageYOffset || document.documentElement.scrollTop || 0;
    navHidden = false;
    var nav = document.getElementById("bottomNav");
    if (nav) { nav.classList.remove("is-nav-hidden"); }
    if (navMode !== "pill") { closeNav(); }
    /* 非聊天页：恢复文字变量（灰阶 / 用户自定义均由 applyFontColor 下发） */
    if (typeof applyFontColor === "function") { applyFontColor(); }
    syncNavModeDesc();
  }

  function syncNavModeDesc() {
    var el = document.getElementById("navModeDesc");
    if (el) { el.textContent = NAV_LABELS[navMode] || navMode; }
  }

  /* auto 滚动隐藏：下滚隐藏 / 上滚或近底恢复 */
  function bindNavScroll() {
    window.addEventListener("scroll", function () {
      if (navMode !== "auto") { return; }
      if (isExempt(currentPage())) { return; }
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var delta = y - navLastY;
      navLastY = y;
      var nav = document.getElementById("bottomNav");
      if (!nav) { return; }
      var atBottom = (y + window.innerHeight) >= (document.documentElement.scrollHeight - 48);
      if (atBottom || delta < -4) {
        if (navHidden) { navHidden = false; nav.classList.remove("is-nav-hidden"); }
      } else if (delta > 4 && y > 60) {
        if (!navHidden) { navHidden = true; nav.classList.add("is-nav-hidden"); }
      }
    }, { passive: true });
  }

  /* ---------- 模式选择 ---------- */
  function setNavMode(mode) {
    if (NAV_MODES.indexOf(mode) < 0) { return; }
    navMode = mode;
    saveNavMode();
    applyNavMode(currentPage());
    syncSheet();
    syncNavModeDesc();
  }
  function openNavMode() {
    var mask = document.getElementById("navModeMask");
    var sheet = document.getElementById("navModeSheet");
    if (!mask || !sheet) { return; }
    syncSheet();
    mask.hidden = false;
    sheet.hidden = false;
  }
  function closeNavMode() {
    var mask = document.getElementById("navModeMask");
    var sheet = document.getElementById("navModeSheet");
    if (mask) { mask.hidden = true; }
    if (sheet) { sheet.hidden = true; }
  }
  function syncSheet() {
    var opts = document.querySelectorAll(".navmode-opt");
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute("data-mode") === navMode;
      if (on) { opts[i].classList.add("is-on"); } else { opts[i].classList.remove("is-on"); }
    }
  }

  /* pill 胶囊展开 / 收起 */
  function togglePill() {
    if (navMode !== "pill") { return; }
    var nav = document.getElementById("bottomNav");
    var open = !(nav && nav.classList.contains("is-open"));
    setNavOpen(open);
  }

  /* 包装 applyFontColor：默认主题灰阶后，聊天页锁回纯黑 */
  function wrapFontColor() {
    if (typeof applyFontColor !== "function") { return; }
    var orig = applyFontColor;
    applyFontColor = function () {
      orig();
      if (isExempt(currentPage())) { lockChatTextIfDefault(); }
    };
  }

  /* ---------- 初始化 ---------- */
  function init() {
    loadNavMode();
    applyNavMode(currentPage());
    bindNavScroll();
    wrapFontColor();
    syncNavModeDesc();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* 导出到 SnowCrystal */
  window.SnowCrystal = window.SnowCrystal || {};
  window.SnowCrystal.openNavMode = openNavMode;
  window.SnowCrystal.closeNavMode = closeNavMode;
  window.SnowCrystal.setNavMode = setNavMode;
  window.SnowCrystal.togglePill = togglePill;
  window.SnowCrystal.applyNavMode = applyNavMode;
})();
