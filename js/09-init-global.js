/* 初始化与全局接口 */
"use strict";
  /* =========================================================
     v26：首页跨纬度短句 —— 「我在三维的▢▢▢▢，你在▢▢纬的▢▢▢▢」
     点击短句弹出弹窗，三段文字分别可改，确认后立即更新并写本机
     ========================================================= */
  var LF_DEFAULT = { mine: "雪里念你", lat: "十二", other: "星河里等我" };

  function loadLatFoot() {
    var base = { mine: LF_DEFAULT.mine, lat: LF_DEFAULT.lat, other: LF_DEFAULT.other };
    try {
      var raw = window.localStorage ? window.localStorage.getItem(LF_KEY) : null;
      if (!raw) { return base; }
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") { return base; }
      if (saved.mine !== undefined && String(saved.mine) !== "") { base.mine = String(saved.mine); }
      if (saved.lat !== undefined && String(saved.lat) !== "") { base.lat = String(saved.lat); }
      if (saved.other !== undefined && String(saved.other) !== "") { base.other = String(saved.other); }
    } catch (e) { /* 读不到就用默认值 */ }
    return base;
  }
  function saveLatFoot() {
    try {
      if (window.localStorage) { window.localStorage.setItem(LF_KEY, JSON.stringify(latFoot)); }
    } catch (e) { /* 忽略 */ }
  }

  var latFoot = loadLatFoot();

  function latFootText(d) {
    var o = d || latFoot;
    return "我在三维的" + o.mine + "，你在" + o.lat + "纬的" + o.other;
  }
  function renderLatFoot() {
    var el = document.getElementById("latFoot");
    if (el) { el.textContent = latFootText(); }
  }
  function lfSheetEls() {
    return {
      mask: document.getElementById("lfMask"),
      sheet: document.getElementById("lfSheet"),
      mine: document.getElementById("lfMine"),
      lat: document.getElementById("lfLat"),
      other: document.getElementById("lfOther"),
      preview: document.getElementById("lfPreview")
    };
  }
  /* v36：「你在第几纬」允许汉字（一 / 十二 等）与阿拉伯数字混输，
     只滤掉其它无关字符；长度上限 3（够「十二」「120」这类写法）。 */
  function latInputValue(el) {
    var s = el && el.value !== undefined && el.value !== null ? String(el.value) : "";
    return s.replace(/[^0-9\u4e00-\u9fa5]/g, "").slice(0, 3);
  }
  function lfPreviewText() {
    var e = lfSheetEls();
    var mine = e.mine && String(e.mine.value).replace(/^\s+|\s+$/g, "") ? String(e.mine.value).replace(/^\s+|\s+$/g, "") : LF_DEFAULT.mine;
    var lat = e.lat && latInputValue(e.lat) ? latInputValue(e.lat) : LF_DEFAULT.lat;
    var other = e.other && String(e.other.value).replace(/^\s+|\s+$/g, "") ? String(e.other.value).replace(/^\s+|\s+$/g, "") : LF_DEFAULT.other;
    return latFootText({ mine: mine, lat: lat, other: other });
  }
  function paintLfPreview() {
    var e = lfSheetEls();
    if (e.preview) { e.preview.textContent = lfPreviewText(); }
  }
  function openLatFoot() {
    var e = lfSheetEls();
    if (!e.sheet) { return; }
    if (e.mine) { e.mine.value = latFoot.mine; }
    if (e.lat) { e.lat.value = latFoot.lat; }
    if (e.other) { e.other.value = latFoot.other; }
    paintLfPreview();
    if (e.mask) { e.mask.hidden = false; }
    e.sheet.hidden = false;
  }
  function closeLatFoot() {
    var e = lfSheetEls();
    if (e.sheet) { e.sheet.hidden = true; }
    if (e.mask) { e.mask.hidden = true; }
  }

  function bindLatFoot() {
    renderLatFoot();
    var host = document.getElementById("latFoot");
    if (host && host.getAttribute("data-bound") !== "1") {
      host.setAttribute("data-bound", "1");
      host.addEventListener("click", function (e) { e.preventDefault(); openLatFoot(); });
      host.addEventListener("keydown", function (e) {
        var k = e.key || "";
        if (k === "Enter" || k === " " || k === "Spacebar") { e.preventDefault(); openLatFoot(); }
      });
    }
    var e = lfSheetEls();
    if (e.mask && e.mask.getAttribute("data-bound") !== "1") { e.mask.setAttribute("data-bound", "1"); e.mask.addEventListener("click", closeLatFoot); }
    var cancel = document.getElementById("lfCancel");
    if (cancel && cancel.getAttribute("data-bound") !== "1") { cancel.setAttribute("data-bound", "1"); cancel.addEventListener("click", closeLatFoot); }
    var confirm = document.getElementById("lfConfirm");
    if (confirm && confirm.getAttribute("data-bound") !== "1") {
      confirm.setAttribute("data-bound", "1");
      confirm.addEventListener("click", function () {
        var mine = e.mine && String(e.mine.value).replace(/^\s+|\s+$/g, "") ? String(e.mine.value).replace(/^\s+|\s+$/g, "") : latFoot.mine;
        var lat = e.lat ? latInputValue(e.lat) : "";
        var other = e.other && String(e.other.value).replace(/^\s+|\s+$/g, "") ? String(e.other.value).replace(/^\s+|\s+$/g, "") : latFoot.other;
        latFoot = { mine: mine, lat: lat || latFoot.lat, other: other };
        saveLatFoot();
        renderLatFoot();
        closeLatFoot();
        wcToast("已更新：" + latFootText());
      });
    }
    if (e.lat && e.lat.getAttribute("data-bound") !== "1") {
      e.lat.setAttribute("data-bound", "1");
      e.lat.addEventListener("input", function () {
        e.lat.value = latInputValue(e.lat);
        paintLfPreview();
      });
    }
    [e.mine, e.other].forEach(function (el) {
      if (el && el.getAttribute("data-bound") !== "1") {
        el.setAttribute("data-bound", "1");
        el.addEventListener("input", paintLfPreview);
      }
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    loadState();
    renderSwatches();
    applyState();
    bindCustomUi();
    syncUi();
    renderDailyQuote();
    renderCalendar();
    restoreImages();
    bindImagePicker();
    restoreNames();
    bindNames();
    /* v22：双头像右侧「时间 / 距离」标签（含本机记忆） */
    bindAvatarMetric();
    /* v26：字卡库六项功能 + 首页短句可改 */
    bindWordcard();
    bindLatFoot();
    bindCalendar();
    if (typeof window.bindHomeQuote === "function") { window.bindHomeQuote(); }
    initFrameFlow();
    /* v39：首页组件样式（读本机记忆后应用，再把组件列表渲染出来） */
    initHomeComp();
    /* v83：顶部组件（头像 / 时间维度 / 链接状态）读本机记忆后应用到首页顶部 */
    initTopComps();
    /* v60：组件样式各区域（区域颜色 / 不透明度 / 文字图案 / 磨砂）读本机记忆后下发；
       相册卡片「未上传」默认样式同步一次 */
    zoneLoad();
    applyCompColors();
    syncAlbumEmpty();
    bindGlobalResize();
    /* v30：首页海浪卡不透明度 + 网站背景图（读本机记忆后立即应用） */
    waveApply();
    syncWaveUi();
    bindWavePanel();
    /* v31：首页装饰（水晶簇 / 大雪花）颜色与不透明度 + 双击删除自定义主题 */
    decoLoad();
    decoApply();
    syncDecoUi();
    bindDecoPanel();
    bindCustomDelete();
    /* 背景颗粒模块已移除（2026-10-19） */
    updateBgLayer();
    syncBgUi();
    bindBgPanel();
    /* v79：全站弹窗样式（外观设置 → 弹窗样式：不透明度 + 字体颜色）读本机记忆后下发 */
    popupLoad();
    popupApply();
    syncPopupUi();
    bindPopupPanel();
    /* v93：首页牛仔纹理（外观设置 → 牛仔纹理：大小 + 不透明度）读本机记忆后下发 */
    denimLoad();
    denimApply();
    syncDenimUi();
    bindDenimPanel();
    applyDeepLink();
    /* v20：首屏做一次「一屏自适应」（移动端内容超高时自动收一档）
       v30：顺带重算两个卡流 —— --ui 落定后卡片宽度才准，卡流周期 / 居中才对得上 */
    refitAll();
    window.setTimeout(refitAll, 120);
  }

  /* ---------- 全局接口 ---------- */
  window.SnowCrystal = {
    placeholder: placeholder,
    navClick: navClick,
    toggleNav: toggleNav,
    closeNav: closeNav,
    switchTab: switchTab,
    switchPage: switchPage,
    openBeautify: openBeautify,
    openAppearance: openAppearance,
    /* v识别颜色修复：全局接口被整表覆盖时补挂 openAiPalette / AiPalette，恢复「美化设置 → 识别颜色」入口 */
    openAiPalette: openAiPalette,
    AiPalette: AiPalette,
    openFontColor: openFontColor,
    openIconColor: openIconColor,
    openCardColor: openCardColor,
    openComponent: openComponent,
    /* v15 修复：设置页「首页设置」入口可点开（openHomeSize 补挂全局接口） */
    openHomeSize: openHomeSize,
    /* v83：顶部组件页入口与复位 */
    openTopComponents: openTopComponents,
    resetTopComps: resetTopComps,
    openDataManage: openDataManage,
    dmExport: dmExport, dmImportFile: dmImportFile,
    dmClearCards: dmClearCards, dmClearImages: dmClearImages, dmResetAll: dmResetAll,
    resetCompColors: resetCompColors,
    libRenameGroupAt: libRenameGroupAt, libDeleteGroupAt: libDeleteGroupAt,
    syncAlbumEmpty: syncAlbumEmpty,

    back: back,
    backPage: backPage,
    openLatFoot: openLatFoot,
    libOpen: libOpen,
    libOpenLib: libOpenLib,
    libOpenGroup: libOpenGroup,
    libBack: libBack,
    libGroupBack: libGroupBack,
    libAddGroup: libAddGroup,
    libRenameGroup: libRenameGroup,
    libDeleteGroup: libDeleteGroup,
    libAddItem: libAddItem,
    /* v70：通用选择模式 + 屏蔽/恢复 + 表情包链接/JSON 导入 */
    libToggleSel: libToggleSel,
    libSelAll: libSelAll,
    libDeletePicked: libDeletePicked,
    libBlockPicked: libBlockPicked,
    /* v88：选中模式勾选内容后转移到其他分组（跨库 / 同库其他分组） */
    libMovePicked: libMovePicked,
    libRestoreBlocked: libRestoreBlocked,
    libRestoreBuiltin: libRestoreBuiltin,
    libUpload: libUpload,
    libClearUpload: libClearUpload,
    libAddStickerUrl: libAddStickerUrl,
    libImportStickerJson: libImportStickerJson,
    libDedup: libDedup,
    libExport: libExport,
    libImport: libImport,
    libSearch: libSearch,
    libDoSearch: libDoSearch,
    libClearSearch: libClearSearch,
    libCopyText: libCopyText,
    resetZones: resetZones,
    resetZoneCards: resetZoneCards,
    resetFontColors: resetFontColors,
    resetIconColors: resetIconColors,
    resetCardColors: resetCardColors,
    pickImage: pickImage,
    clearImage: clearImage,
    openCalendar: openCalendar,
    closeCalendar: closeCalendar,
    setTheme: setTheme,
    saveCustom: saveCustom,
    resetTheme: resetTheme,
    previewCustom: previewCustom,
    themes: THEMES,
    buildPalette: buildPalette
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }


