/* ============================================================================
 * 雪山晶 · 54-mirror ｜ 镜界嵌入桥接（宿主侧）
 *
 * 链路：探索页「镜界」入口 → SnowCrystal.Mirror.open()
 *       → 子页 section.page[data-page="mirror"]（NAV_PARENT 归 home）
 *       → iframe#mirrorFrame 懒加载 镜界/index.html
 *
 * 回退：镜界侧 js/jingjie-embed.js 检测到被 iframe 嵌入时，自绘左上角返回钮，
 *       点击后 postMessage({type:'back-to-shixinjie'})，并兜底调用父级
 *       window.__shxjBackJingJie__()。两侧任一通道生效即可回到探索页。
 *
 * 懒加载：首次进入才设置 src，避免主页一打开就加载整套镜界资源；
 *         二次进入复用同一 iframe，保留镜界内部状态（牌组 / 占卜记录）。
 * ==========================================================================*/
(function () {
  "use strict";

  var S = (window.SnowCrystal = window.SnowCrystal || {});
  var FRAME_ID = "mirrorFrame";
  var LOADING_ID = "mirrorLoading";
  var SRC = "镜界/index.html";
  var BACK_PAGE = "explore";
  var loaded = false;

  function frame() { return document.getElementById(FRAME_ID); }

  function backToExplore() {
    if (typeof S.backPage === "function") { S.backPage(BACK_PAGE); return; }
    if (typeof S.switchPage === "function") { S.switchPage(BACK_PAGE); }
  }

  function hideLoading() {
    var tip = document.getElementById(LOADING_ID);
    if (!tip) { return; }
    tip.classList.add("is-done");
    window.setTimeout(function () {
      if (tip && tip.parentNode) { tip.parentNode.removeChild(tip); }
    }, 400);
  }

  /* 宿主顶栏已有「返回探索」键，隐藏镜界侧自绘的返回钮，避免左上角两个返回控件重叠。
     同源（http 访问）时可访问子文档；file:// 下若被跨域拦截则保留镜界自带返回钮，
     postMessage 与 __shxjBackJingJie__ 两条回退通道始终有效，不影响功能 */
  function hideInnerBack() {
    try {
      var f = frame();
      var doc = f && (f.contentDocument || (f.contentWindow && f.contentWindow.document));
      if (!doc || !doc.getElementById("btn-back-shxj")) { return; }
      var st = doc.getElementById("shxj-host-hide-back");
      if (st) { return; }
      st = doc.createElement("style");
      st.id = "shxj-host-hide-back";
      st.textContent = "#btn-back-shxj{display:none !important}";
      (doc.head || doc.documentElement).appendChild(st);
    } catch (e) { /* 跨域则忽略，保留镜界自带按钮 */ }
  }

  function ensureLoaded() {
    var f = frame();
    if (!f || loaded) { return; }
    loaded = true;
    f.addEventListener("load", function () {
      hideLoading();
      hideInnerBack();
    }, false);
    f.src = SRC;
  }

  function open() {
    ensureLoaded();
    if (typeof S.switchPage === "function") { S.switchPage("mirror"); }
  }

  /* 镜界侧兜底通道：直接调用父级暴露的函数 */
  window.__shxjBackJingJie__ = backToExplore;

  /* 主通道：接收镜界 postMessage */
  window.addEventListener("message", function (ev) {
    var d = ev && ev.data;
    if (!d) { return; }
    var type = (typeof d === "string") ? d : d.type;
    if (type === "back-to-shixinjie") { backToExplore(); }
  }, false);

  S.Mirror = { open: open, back: backToExplore };

  /* 兜底：直接以 URL hash / 刷新方式落到 mirror 页时，也保证 iframe 有内容 */
  function autoBoot() {
    var page = document.querySelector('.page[data-page="mirror"]');
    if (page && page.classList.contains("is-active")) { ensureLoaded(); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoBoot);
  } else { autoBoot(); }
})();
