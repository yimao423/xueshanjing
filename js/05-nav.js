/* 雪山晶 · 05-nav ｜ 源：雪山晶.html L6228-L6526 ｜ JS 模块 */
;/* 页面切换与底部导航 */
"use strict";
  /* ---------- 占位空实现 ---------- */
  function placeholder(name) {
    if (window.console && console.log) {
      console.log("[雪晶·占位] " + name + "（待实现）");
    }
  }

  /* 页面切换：home / wordcard / discover / settings / appearance */
  /* appearance 为二级页，底部导航高亮沿用父页 settings */
  var NAV_PARENT = {
    "beautify": "settings",
    "appearance": "settings",
    "top-components": "settings",
    "size-settings": "settings",
    "data-manage": "settings",
    "account-settings": "settings",
 /* 聊天（聊天设置 + 日常聊天）：聊天列表 / 聊天室挂在首页，设置 / 概率挂在设置页 */
    "chat-list": "home",
    "chat-room": "home",
    /* 探索页（首页第 6 枚星球）：内含我的收藏 / 他的收藏，父级为首页 */
    "explore": "home",
    /* 收藏子页（探索页内的我的收藏 / 他的收藏），返回链回探索页，底栏高亮仍归首页 */
    "explore-fav": "home",
    /* 镜界嵌入页（探索页内「镜界」入口），返回链回探索页，底栏高亮归首页 */
    "mirror": "home",
    /* 次元镜界（聊天界面底栏月牙菜单入口），返回链回聊天室，底栏高亮归首页 */
    "mtx-session": "chat-room",
    "chat-settings": "settings",
    /* 顶栏底栏设置（栏背景显示 + 配色），入口在聊天界面齿轮菜单，父级为聊天室 */
    "bar-settings": "chat-room",
    /* 聊天设置分组子页（功能 / 节奏 / 音效），父级仍是设置页 */
    "chat-feature": "settings",
    "chat-autoreply": "settings",
    "chat-pace": "settings",
    /* [V31] 回信设置同属聊天设置子页，必须登记，否则 switchPage 的父级回退与非首页缩放判定都会漏掉它 */
    "chat-letter-set": "settings",
    "chat-sound": "settings",
    "prob-settings": "settings",
    "effect-settings": "settings",
    /* 后台设置（后台保活 / 新消息通知 / 后台系统通知），父级仍是设置页 */
    "chat-bg": "settings",
    "wordcard-face-lib": "wordcard",
    "wc-lib": "wordcard", "wc-lib-group": "wordcard",
    "voice-lib": "wordcard", "voice-lib-group": "wordcard",
    "course-list": "discover",
    "course-detail": "discover",
    "course-schedule": "discover",
    "course-teachers": "discover",
    "course-collection": "discover",
    "course-tips": "discover"
  };

  var HOME_SIZE_KEY = "snowcrystal.homeSize";
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
  function homeSizeScale() { return ((homeSizeState.scale || 100) / 100) * 1.1; }
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
  if (window.addEventListener) {
    window.addEventListener("resize", function () {
      if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    });
  }
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

    /* 移动端输入法防护：切页时强制失焦（软键盘弹出时 window.scrollTo 会被键盘滚动锁定覆盖， */
    try {
      var _focused = document.activeElement;
      if (_focused && _focused !== document.body && typeof _focused.blur === "function") { _focused.blur(); }
    } catch (e) { /* 忽略 */ }

    if (window.scrollTo) { window.scrollTo(0, 0); }
    if (document.documentElement) { document.documentElement.scrollTop = 0; }
    if (document.body) { document.body.scrollTop = 0; }
    var _resetPageScroll = function () {
      try {
        if (window.scrollTo) { window.scrollTo(0, 0); }
        if (document.documentElement) { document.documentElement.scrollTop = 0; }
        if (document.body) { document.body.scrollTop = 0; }
      } catch (e) { /* 忽略 */ }
    };
    window.setTimeout(_resetPageScroll, 80);
    window.setTimeout(_resetPageScroll, 300);
    window.setTimeout(_resetPageScroll, 700);

    if (typeof refitAll === "function") {
      window.requestAnimationFrame(refitAll);
    }

    if (typeof updateHomeScrollLock === "function") {
      window.setTimeout(updateHomeScrollLock, 30);
      window.setTimeout(updateHomeScrollLock, 140);
    }

    closeNav();

    if (typeof SnowCrystal !== "undefined" && typeof SnowCrystal.applyNavMode === "function") {
      SnowCrystal.applyNavMode(name);
    }

    /* v-FIX：字卡相关页进入时重算入口统计（列表/统计与真实数据保持一致） */
    try {
      if (typeof window.__wcPageRefresh === "function") { window.__wcPageRefresh(name); }
    } catch (errWcRefresh) { /* 忽略 */ }
  }

  /* 底部导航：切页 + 选中态 */
  function navClick(btn, label) {
    var page = btn && btn.getAttribute("data-page");
    switchPage(page);
    placeholder(label || page || "导航");
  }

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

/* 底栏雪花按键 */
"use strict";
  function navEls() {
    return {
      nav: document.getElementById("bottomNav"),
      fab: document.getElementById("snowFab"),
      mask: document.getElementById("navMask")
    };
  }

  function setNavOpen(open) {
    var els = navEls();
    if (els.nav) {
      if (open) { els.nav.classList.add("is-open"); } else { els.nav.classList.remove("is-open"); }
    }
    if (els.mask) {
      if (open) { els.mask.classList.add("is-open"); } else { els.mask.classList.remove("is-open"); }
    }
    if (els.fab) {
      els.fab.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { els.fab.classList.add("is-open"); } else { els.fab.classList.remove("is-open"); }
    }
    /* 展开时给手机壳补足底部占位（防内容被悬浮导航遮挡），收起时收回 */
    var phone = document.querySelector(".phone");
    if (phone) {
      if (open) { phone.classList.add("nav-open-pad"); } else { phone.classList.remove("nav-open-pad"); }
    }
  }

  function toggleNav() {
    var els = navEls();
    var open = !(els.nav && els.nav.classList.contains("is-open"));
    setNavOpen(open);
  }

  function closeNav() { setNavOpen(false); }
