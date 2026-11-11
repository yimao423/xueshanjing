/* 雪山晶 · 01-theme-boot ｜ 源：雪山晶.html L7-L66 ｜ JS 模块 */
/* ==================================================================
   [V30] 首帧主题预置（在任何 CSS / 任何页面脚本之前执行）
   问题：阳（浅色）主题刷新时先闪一下阴（深色）主题。
   根因（全局排查结论）：
     1) 本预置脚本（V29）与主题引擎 state.polarity 默认值都是 "yin"，
        任何「存储尚未读到 / 尚未水合」的首帧都会按深色铺底；
     2) CSS 兜底值写死深色：--xj-home-bg:#222222、.phone/.app-desktop
        的 var(--xj-home-bg,#252525) 回退值，脚本未执行前一律深色；
     3) 无 <meta name="theme-color">，浏览器 UI 首帧同样取深色；
     4) IndexedDB 水合晚于首次绘制：localStorage 被清时首帧读不到主题，
        只能走默认值 → 深色 → 水合后再切回浅色（第二次闪黑）。
   做法（不做延时补丁，直接改默认口径）：
     · 全局默认 = 阳（浅色）：变量默认值、CSS 回退值、state 默认值、本脚本
       默认值、html 底色、meta theme-color 全部改成浅色；
     · 阴（深色）只由本脚本在读到「明确存过 yin」时显式切换；
     · localStorage 读不到时再用 cookie 镜像 xj_theme_pol 兜底，减少
       「仅存于 IndexedDB」导致的浅→深二次闪动。
   ================================================================== */
(function () {
  var d = document.documentElement;
  if (!d) { return; }
  var pol = "yang", mode = "light";
  try {
    var raw = window.localStorage ? window.localStorage.getItem("snowcrystal.theme.v1") : null;
    var st = null;
    if (raw) { st = JSON.parse(raw) || {}; }
    if (!st || (st.polarity !== "yang" && st.polarity !== "yin")) {
      /* localStorage 为空 / 值异常：退回 cookie 镜像，避免已选阴阳被误判成默认 */
      var ck = "";
      try {
        var mm = document.cookie ? String(document.cookie).match(/(?:^|;\s*)xj_theme_pol=(yang|yin)/) : null;
        if (mm) { ck = mm[1]; }
      } catch (eCk) { ck = ""; }
      if (ck === "yin" || ck === "yang") { st = { polarity: ck }; }
    }
    if (st) {
      /* 只有明确存过 yin 才用深色，其余一律浅色兜底 */
      pol = (st.polarity === "yin") ? "yin" : "yang";
      if (st.mode === "dark") { mode = "dark"; }
    }
  } catch (e) { /* 读不到：默认阳（浅色），不做深色兜底 */ }
  var bg = pol === "yang" ? "#FFFFFF" : "#252525";
  d.setAttribute("data-polarity", pol);
  d.setAttribute("data-theme-mode", mode);
  try {
    d.style.backgroundColor = bg;
    d.style.setProperty("--xj-home-bg", bg);
    if (pol === "yang") {
      d.style.setProperty("--bg", "#FFFFFF");
      d.style.setProperty("--page-outside", "#FFFFFF");
    }
    d.style.colorScheme = pol === "yang" ? "light" : "dark";
  } catch (e) { /* 忽略 */ }
  try {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) { m.setAttribute("content", bg); }
  } catch (e) { /* 忽略 */ }
})();
