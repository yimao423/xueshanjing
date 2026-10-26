/* 页面切换与底部导航 */
"use strict";
  /* ---------- 占位空实现 ---------- */
  function placeholder(name) {
    if (window.console && console.log) {
      console.log("[雪晶·占位] " + name + "（待实现）");
    }
  }

  /* ---------- 页面切换：home / wordcard / discover / settings / appearance ---------- */
  /* appearance 为二级页，底部导航高亮沿用父页 settings */
  var NAV_PARENT = {
    /* v37：美化设置页（收纳外观 / 字体 / 图标 / 卡片），父级仍是设置页 */
    "beautify": "settings",
    "appearance": "settings",
    /* v32：字体颜色独立二级页，父级仍是设置页 */
    "fontcolor": "settings",
    /* v33：图标颜色 / 卡片颜色独立二级页，父级仍是设置页 */
    "iconcolor": "settings",
    "cardcolor": "settings",
    /* v39：组件样式（首页组件切换），父级仍是设置页 */
    "component": "settings",
    /* v83：顶部组件（首页顶部组件启停 / 排序 / 链接状态），父级仍是设置页 */
    "top-components": "settings",
    /* v14/6m：尺寸设置（首页缩放 / 隐藏组件 + 字卡课程设置整体缩放），父级仍是设置页 */
    "size-settings": "settings",
    /* v60：数据管理（本机数据备份 / 恢复 / 清理），父级仍是设置页 */
    "data-manage": "settings",
    /* v6x：账号设置（对标拾心界账号设置），父级仍是设置页 */
    "account-settings": "settings",
    /* 聊天（对标拾心界聊天设置 + 日常聊天）：聊天列表 / 聊天室挂在首页，设置 / 概率挂在设置页 */
    "chat-list": "home",
    "chat-room": "home",
    "chat-settings": "settings",
    /* 聊天设置分组子页（功能 / 节奏 / 音效），父级仍是设置页 */
    "chat-feature": "settings",
    "chat-pace": "settings",
    "chat-sound": "settings",
    "prob-settings": "settings",
    "effect-settings": "settings",
    "wordcard-face-lib": "wordcard",
    "wc-lib": "wordcard", "wc-lib-group": "wordcard",
    "voice-lib": "wordcard", "voice-lib-group": "wordcard",
    /* v100：字卡管理，父级仍是字卡页 */
    "wordcard-manage": "wordcard",
    /* v100：课程体系子页（课程表 / 我的课程 / 课程详情 / 精选讲师 / 课程合集 / 学习技巧），父级仍是课程页 */
    "course-list": "discover",
    "course-detail": "discover",
    "course-schedule": "discover",
    "course-teachers": "discover",
    "course-collection": "discover",
    "course-tips": "discover"
  };

  /* ---------------- v14：首页设置（缩放 + 隐藏组件） ----------------
     存 localStorage「snowcrystal.homeSize」：{ scale:100, hideComp:false, hideCal:false, hideQuote:false }
     scale 为百分比；应用时首页 --ui 额外乘 scale/100×1.1；隐藏组件通过首页 section class 控制。 */
  var HOME_SIZE_KEY = "snowcrystal.homeSize";
  /* v19：缩放基准上调 —— 100% 的实际大小 = 旧版 110% 的效果（系数整体 ×1.1）；
     默认 100%；移除「隐藏顶部组件」开关；保留滚动 / 交换位置开关 */
  var homeSizeState = { scale: 100, hideComp: false, hideCal: false, hideQuote: false, swap: false, scroll: true };
  function loadHomeSize() {
    try {
      var raw = window.localStorage.getItem(HOME_SIZE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === "object") {
          if (o.v === 2) {
            if (typeof o.scale === "number" && o.scale >= 70 && o.scale <= 130) { homeSizeState.scale = Math.round(o.scale); }
          } else {
            /* v19：旧版基准 110% → 新版基准 100%（实际大小不变）：旧值 ÷ 1.1 迁移 */
            if (typeof o.scale === "number" && o.scale >= 70 && o.scale <= 150) { homeSizeState.scale = Math.round(o.scale / 1.1); }
          }
          if (typeof o.hideComp === "boolean") { homeSizeState.hideComp = o.hideComp; }
          if (typeof o.hideCal === "boolean") { homeSizeState.hideCal = o.hideCal; }
          if (typeof o.hideQuote === "boolean") { homeSizeState.hideQuote = o.hideQuote; }
          if (typeof o.swap === "boolean") { homeSizeState.swap = o.swap; }
          if (typeof o.scroll === "boolean") { homeSizeState.scroll = o.scroll; }
        }
      }
    } catch (e) { /* 忽略损坏数据 */ }
  }
  function saveHomeSize() {
    try {
      var d = { scale: homeSizeState.scale, hideComp: homeSizeState.hideComp, hideCal: homeSizeState.hideCal, hideQuote: homeSizeState.hideQuote, swap: homeSizeState.swap, scroll: homeSizeState.scroll, v: 2 };
      window.localStorage.setItem(HOME_SIZE_KEY, JSON.stringify(d));
    } catch (e) { /* 忽略 */ }
  }
  /* v19：缩放基准上调 —— 100% = 旧版 110% 的实际大小（整体 ×1.1） */
  function homeSizeScale() { return ((homeSizeState.scale || 100) / 100) * 1.1; }
  /* v18：首页滚动锁定 —— 默认「智能」：内容能在一屏内显示全时锁死不滑动，
     放大到一屏显示不全时才允许上下滑动；开关关闭则始终锁死。 */
  function updateHomeScrollLock() {
    var home = document.querySelector('.page[data-page="home"]');
    var rootEl = document.documentElement;
    if (!home) { if (rootEl) { rootEl.classList.remove("home-scroll-lock"); } return; }
    var active = document.querySelector(".page.is-active");
    var isHome = active === home;
    var lock = false;
    if (isHome) {
      if (homeSizeState.scroll === false) {
        lock = true;
      } else {
        var vh = window.innerHeight || document.documentElement.clientHeight || 0;
        lock = home.scrollHeight <= vh;
      }
    }
    if (rootEl) { rootEl.classList.toggle("home-scroll-lock", lock); }
    if (lock && window.scrollTo) { window.scrollTo(0, 0); }
    if (rootEl) { rootEl.scrollTop = 0; }
  }
  function applyHomeSize() {
    var home = document.querySelector('.page[data-page="home"]');
    if (home) {
      home.classList.toggle("home-hide-comp", homeSizeState.hideComp);
      home.classList.toggle("home-hide-cal", homeSizeState.hideCal);
      home.classList.toggle("home-hide-quote", homeSizeState.hideQuote);
      home.classList.toggle("home-swap", homeSizeState.swap);
    }
    updateHomeScrollLock();
  }
  function openHomeSize() {
    switchPage("size-settings");
    var range = document.getElementById("hsScaleRange");
    var val = document.getElementById("hsSizeVal");
    var cComp = document.getElementById("hsHideComp");
    var cCal = document.getElementById("hsHideCal");
    var cQuote = document.getElementById("hsHideQuote");
    var cSwap = document.getElementById("hsSwap");
    var cScroll = document.getElementById("hsScroll");
    if (range) { range.value = String(homeSizeState.scale); }
    if (val) { val.textContent = homeSizeState.scale + "%"; }
    if (cComp) { cComp.checked = homeSizeState.hideComp; }
    if (cCal) { cCal.checked = homeSizeState.hideCal; }
    if (cQuote) { cQuote.checked = homeSizeState.hideQuote; }
    if (cSwap) { cSwap.checked = homeSizeState.swap; }
    if (cScroll) { cScroll.checked = homeSizeState.scroll !== false; }
    applyHomeSize();
  }
  function initHomeSizeEvents() {
    var range = document.getElementById("hsScaleRange");
    var cComp = document.getElementById("hsHideComp");
    var cCal = document.getElementById("hsHideCal");
    var cQuote = document.getElementById("hsHideQuote");
    var cSwap = document.getElementById("hsSwap");
    var cScroll = document.getElementById("hsScroll");
    var val = document.getElementById("hsSizeVal");
    if (range) {
      range.addEventListener("input", function () {
        homeSizeState.scale = parseInt(range.value, 10) || 100;
        if (val) { val.textContent = homeSizeState.scale + "%"; }
        saveHomeSize();
        applyHomeSize();
        var active = document.querySelector(".page.is-active");
        if (active && active.getAttribute("data-page") === "home" && typeof refitAll === "function") { refitAll(); }
      });
    }
    if (cComp) {
      cComp.addEventListener("change", function () { homeSizeState.hideComp = cComp.checked; saveHomeSize(); applyHomeSize(); });
    }
    if (cCal) {
      cCal.addEventListener("change", function () { homeSizeState.hideCal = cCal.checked; saveHomeSize(); applyHomeSize(); });
    }
    if (cQuote) {
      cQuote.addEventListener("change", function () { homeSizeState.hideQuote = cQuote.checked; saveHomeSize(); applyHomeSize(); });
    }
    if (cSwap) {
      cSwap.addEventListener("change", function () { homeSizeState.swap = cSwap.checked; saveHomeSize(); applyHomeSize(); });
    }
    if (cScroll) {
      cScroll.addEventListener("change", function () { homeSizeState.scroll = cScroll.checked; saveHomeSize(); applyHomeSize(); });
    }
  }
  /* v18：窗口尺寸变化时复核首页滚动锁定 */
  if (window.addEventListener) {
    window.addEventListener("resize", function () {
      if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    });
  }
  /* v14：初始化首页设置（读取记忆 + 绑定控件 + 应用首页显隐） */
  loadHomeSize();
  initHomeSizeEvents();
  applyHomeSize();

  function switchPage(name) {
    if (!name) { return; }

    /* .phone[data-page] 决定波浪装饰卡是否显示（仅首页显示） */
    var phone = document.querySelector(".phone");
    if (phone) { phone.setAttribute("data-page", name); }

    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].getAttribute("data-page") === name) {
        pages[i].classList.add("is-active");
      } else {
        pages[i].classList.remove("is-active");
      }
    }

    /* v42：飞机票水晶簇依赖真实布局，切页后（尤其首页由隐藏转显示）补定位 */
    if (window.__tkCrystalLayout) {
      window.setTimeout(window.__tkCrystalLayout, 60);
      window.setTimeout(window.__tkCrystalLayout, 320);
    }

    var navName = NAV_PARENT[name] || name;
    var navBtns = document.querySelectorAll(".bottom-nav .nav-btn");
    for (var j = 0; j < navBtns.length; j++) {
      if (navBtns[j].getAttribute("data-page") === navName) {
        navBtns[j].classList.add("active");
      } else {
        navBtns[j].classList.remove("active");
      }
    }

    if (window.scrollTo) { window.scrollTo(0, 0); }
    if (document.documentElement) { document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollTop = 0; }

    /* v30：切页后重新做一次「一屏自适应 + 卡流重算」（卡流尺寸随 --ui 变化） */
    if (typeof refitAll === "function") {
      window.requestAnimationFrame(refitAll);
    }

    /* v18：切页后按当前页复核首页滚动锁定（仅首页 active 时可能加锁） */
    if (typeof updateHomeScrollLock === "function") {
      window.setTimeout(updateHomeScrollLock, 30);
      window.setTimeout(updateHomeScrollLock, 140);
    }

    /* v22：切换页面后自动收起底栏，回到「只有一个雪花按键」的状态 */
    closeNav();
  }

  /* ---------- 底部导航：切页 + 选中态 ---------- */
  function navClick(btn, label) {
    var page = btn && btn.getAttribute("data-page");
    switchPage(page);
    placeholder(label || page || "导航");
  }

  /* ---------- v21：相框下方「一整横排文字按键」切换功能列表 ---------- */
  function switchTab(key) {
    var strip = document.querySelector(".tab-strip");
    var items = strip ? strip.querySelectorAll(".tab-item") : [];
    for (var i = 0; i < items.length; i++) {
      var on = items[i].getAttribute("data-tab") === key;
      if (on) { items[i].classList.add("is-active"); } else { items[i].classList.remove("is-active"); }
      items[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    var panels = document.querySelectorAll(".tab-panel");
    for (var j = 0; j < panels.length; j++) {
      var onp = panels[j].getAttribute("data-panel") === key;
      if (onp) { panels[j].classList.add("is-active"); } else { panels[j].classList.remove("is-active"); }
    }
    /* 切换后按新面板高度复核一次「一屏完整呈现」，并重算卡流尺寸 */
    if (typeof refitAll === "function") { refitAll(); }
  }



