/* 雪山晶 · 32-shop-page ｜ 源：雪山晶.html L23156-L23218 ｜ JS 模块 */
(function () {
  "use strict";
  var S = window.SnowCrystal || (window.SnowCrystal = {});

  /* 课程库默认数据（本机只读展示 + 学习进度单独记忆） */

  /* 页面大小 的读写 */
  var PAGE_SIZE_KEY = "snowcrystal.pageSize";

  function loadJson(key, def) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) { var o = JSON.parse(raw); if (o && typeof o === "object") { return o; } }
    } catch (e) { /* 忽略损坏数据 */ }
    return def;
  }
  function getPageSize() {
    var o = loadJson(PAGE_SIZE_KEY, {});
    var s = o.scale;
    if (typeof s !== "number" || isNaN(s)) { return 100; }
    return Math.max(70, Math.min(140, Math.round(s)));
  }
  function toast(text) {
    if (typeof window.wcToast === "function") { window.wcToast(text); }
  }

  /* 尺寸设置（整合：首页缩放 + 字卡/课程/设置整体缩放） */
  function renderPageSize() {
    var v = getPageSize();
    var val = document.getElementById("psSizeVal");
    var range = document.getElementById("psScaleRange");
    if (val) { val.textContent = v + "%"; }
    if (range) { range.value = v; }
  }
  S.renderPageSize = renderPageSize;
  // size-settings 模块已按需求移除，提供无操作占位避免初始化中断
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  S.backCourseDetail = function(){};  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */
  /* 课程/探索模块已移除，占位避免中断 */

  /* 启动：绑定控件 */
  function onReady() {
    /* bindPage 仅绑定已移除的 size-settings，置空 */
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
