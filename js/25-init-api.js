/* 雪山晶 · 25-init-api ｜ 源：雪山晶.html L12862-L12978 ｜ JS 模块 */
;/* 初始化与全局接口 */
"use strict";
  /* ---------- 初始化 ---------- */
  function init() {
    loadState();
    renderSwatches();
    applyState();
    syncUi();
    renderDailyQuote();
    renderCalendar();
    restoreImages();
    bindImagePicker();
    restoreNames();
    bindNames();
    bindAvatarMetric();
    bindWordcard();
    bindCalendar();
    if (typeof window.bindHomeQuote === "function") { window.bindHomeQuote(); }
    initFrameFlow();
    initHomeComp();
    initTopComps();
    zoneLoad();
    applyCompColors();
    syncAlbumEmpty();
    bindGlobalResize();
    waveApply();
    syncWaveUi();
    bindWavePanel();
    /* 背景颗粒模块已移除（2026-10-19） */
    updateBgLayer();
    syncBgUi();
    bindBgPanel();
    popupLoad();
    popupApply();
    syncPopupUi();
    bindPopupPanel();
    denimLoad();
    denimApply();
    syncDenimUi();
    bindDenimPanel();
    applyDeepLink();
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
    openHomeSize: openHomeSize,
    openDataManage: openDataManage,
    dmExport: dmExport, dmImportFile: dmImportFile,
    dmClearCards: dmClearCards, dmClearImages: dmClearImages, dmResetAll: dmResetAll,
    libRenameGroupAt: libRenameGroupAt, libDeleteGroupAt: libDeleteGroupAt,
    syncAlbumEmpty: syncAlbumEmpty,

    back: back,
    backPage: backPage,
    libOpen: libOpen,
    libOpenLib: libOpenLib,
    libOpenGroup: libOpenGroup,
    libBack: libBack,
    libGroupBack: libGroupBack,
    libAddGroup: libAddGroup,
    libRenameGroup: libRenameGroup,
    libDeleteGroup: libDeleteGroup,
    libAddItem: libAddItem,
    libToggleSel: libToggleSel,
    libSelAll: libSelAll,
    libDeletePicked: libDeletePicked,
    libBlockPicked: libBlockPicked,
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
    /* v-FIX：字卡数据接口对外导出 —— 聊天模块的多处 window.loadWcl 判断此前永远为 false，
       导致「拼字卡 / 引用字卡」拿不到字卡库内容 */
    loadWcl: loadWcl,
    wclReload: wclReload,
    wcExtCount: wcExtCount,
    renderWclEntry: renderWclEntry,
    libSearch: libSearch,
    libDoSearch: libDoSearch,
    libClearSearch: libClearSearch,
    libCopyText: libCopyText,
    resetZones: resetZones,
    resetZoneCards: resetZoneCards,
    pickImage: pickImage,
    clearImage: clearImage,
    openCalendar: openCalendar,
    closeCalendar: closeCalendar,
    setTheme: setTheme,
    setPolarity: setPolarity,
    resetTheme: resetTheme,
    themes: THEMES,
    buildPalette: buildPalette
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
