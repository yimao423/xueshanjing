/* 雪山晶 · 11-theme-store ｜ 源：雪山晶.html L8231-L8403 ｜ JS 模块 */
var resizeTimer = null;
  function bindGlobalResize() {
    window.addEventListener("resize", function () {
      updateUiScale();
      if (resizeTimer) { window.clearTimeout(resizeTimer); }
      resizeTimer = window.setTimeout(refitAll, 160);
    });
  }

  /* 主题存取 */
  function resolveKey(key) {
    var i;
    for (i = 0; i < THEMES.length; i++) {
      if (THEMES[i].key === key) { return THEMES[i]; }
    }
    return null;
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) {
        /* [V30] localStorage 空（被清 / 隐私模式）：先用 cookie 镜像恢复阴阳，再退回默认阳 */
        try {
          var ck5 = document.cookie ? String(document.cookie).match(/(?:^|;\s*)xj_theme_pol=(yang|yin)/) : null;
          if (ck5) { state.polarity = ck5[1]; }
        } catch (eCk5) { /* 忽略 */ }
        return;
      }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") { return; }
      var spec = resolveKey(obj.key);
      if (spec) {
        state.key = spec.key; state.name = spec.name; state.base = spec.base; state.mode = spec.mode;
      }
      if (spec && typeof obj.base === "string") {
        var bh = normHex(obj.base);
        if (bh) { state.base = bh; }
      }
      if (obj.polarity === "yang" || obj.polarity === "yin") { state.polarity = obj.polarity; }
    } catch (e) { /* 隐私模式 / file:// 下可能不可用，忽略 */ }
  }

  function persist() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ key: state.key, base: state.base, polarity: state.polarity }));
    } catch (e) { /* 忽略 */ }
    /* [V30] 阴阳同时镜像到 cookie：localStorage 被清（或仅存于 IndexedDB）时，
       首帧预置脚本仍能读到「明确选过的阴/阳」，避免默认值造成的闪动。 */
    try {
      document.cookie = "xj_theme_pol=" + (state.polarity === "yin" ? "yin" : "yang") + ";path=/;max-age=31536000;SameSite=Lax";
    } catch (e2) { /* 忽略 */ }
  }

  /* 主题列表渲染 */
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="__C__" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.6 10.4 17 18 8.4"/></svg>';

  function syncPolarityUi() {
    var btns = document.querySelectorAll("#themeGrid .pol-btn");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-pol") === state.polarity) { btns[i].classList.add("is-on"); }
      else { btns[i].classList.remove("is-on"); }
    }
  }

  function swatchHtml(key, name, hex, mode, active) {
    var c = hexToRgb(hex) || { r: 61, g: 121, b: 252 };
    var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    var tickColor = lum > 0.62 ? "#23262E" : "#FFFFFF";
    var bg;
    if (mode === "dark") { bg = "linear-gradient(160deg, #2C313B 0%, #12141A 100%)"; }
    else { bg = hex; }
    var pol = state.polarity === "yang" ? "yang" : "yin";
    return '<div class="swatch' + (active ? " active" : "") + '" data-theme="' + key + '"' +
      ' onclick="SnowCrystal.setTheme(\'' + key + '\')" title="' + name + " " + hex + '">' +
      '<span class="swatch-dot" style="background:' + bg + '">' + TICK.replace("__C__", tickColor) + "</span>" +
      '<span class="swatch-info"><span class="swatch-name">' + name + '</span><span class="swatch-desc">' + hex + ' · 内置主题</span></span>' +
      '<span class="pol-switch">' +
        '<button class="pol-btn' + (pol === "yin" ? " is-on" : "") + '" type="button" data-pol="yin" onclick="event.stopPropagation();SnowCrystal.setPolarity(this.dataset.pol)" title="阴 · 深色系">阴</button>' +
        '<button class="pol-btn' + (pol === "yang" ? " is-on" : "") + '" type="button" data-pol="yang" onclick="event.stopPropagation();SnowCrystal.setPolarity(this.dataset.pol)" title="阳 · 浅色系">阳</button>' +
      "</span>" +
      "</div>";
  }

  function renderSwatches() {
    var grid = document.getElementById("themeGrid");
    if (!grid) { return; }
    var html = "", i;
    for (i = 0; i < THEMES.length; i++) {
      html += swatchHtml(THEMES[i].key, THEMES[i].name, THEMES[i].base, THEMES[i].mode, THEMES[i].key === state.key);
    }
    grid.innerHTML = html;
    renderZonePanels();
    bindZonePanels();
  }

  /* 界面同步 */
  var tipTimer = null;
  function tip(text) {
    var el = document.getElementById("customTip");
    if (!el) { return; }
    el.textContent = text;
    if (tipTimer) { window.clearTimeout(tipTimer); }
    tipTimer = window.setTimeout(function () {
      el.textContent = "选好颜色后点「保存」，主题立即生效并记忆在本机，最多 6 个；保存后双击色块即可删除该颜色。";
    }, 2200);
  }

  function syncUi() {
    var swatches = document.querySelectorAll("#themeGrid .swatch");
    for (var i = 0; i < swatches.length; i++) {
      if (swatches[i].getAttribute("data-theme") === state.key) { swatches[i].classList.add("active"); }
      else { swatches[i].classList.remove("active"); }
    }
    var meta = document.getElementById("themeMeta");
    if (meta) { meta.textContent = state.name; }
    var dot = document.getElementById("currentDot");
    if (dot) { dot.style.background = state.base; }
    var nameEl = document.getElementById("currentName");
    if (nameEl) { nameEl.textContent = state.name; }
    var hexEl = document.getElementById("currentHex");
    if (hexEl) { hexEl.textContent = state.base + " · 内置"; }

    popupApply();
    syncPopupUi();
  }

  /* 对外操作 */
  function setTheme(key) {
    var spec = resolveKey(key);
    if (!spec) { return; }
    state.key = spec.key;
    state.name = spec.name;
    state.base = spec.base;
    state.mode = spec.mode;
    applyState();
    syncUi();
    persist();
  }

  function resetTheme() {
    setTheme(DEFAULT_THEME.key);
    tip("已恢复默认主题（" + DEFAULT_THEME.base + "）");
  }

  function setPolarity(k) {
    if (k !== "yin" && k !== "yang") { return; }
    state.polarity = k;
    applyState();
    persist();
  }

  window.fitOneScreen = fitOneScreen;
  window.refitAll = refitAll;

  /* 持久化修复：IndexedDB 恢复后重放主题 */
  function restoreThemeFromStore() {
    try {
      /* [V30] 不再因 localStorage 为空而直接 return：loadState 会用 cookie 镜像兜底，
         水合后（IndexedDB 恢复出主题键）也能立刻把正确阴阳应用上去。 */
      loadState();
      applyState();
      syncUi();
      if (document.getElementById("themeGrid")) { renderSwatches(); }
    } catch (e) { /* 忽略 */ }
  }
  (function () {
    if (window.XJ_STORE && typeof window.XJ_STORE.onReady === "function") {
      window.XJ_STORE.onReady(restoreThemeFromStore);
    }
  })();
