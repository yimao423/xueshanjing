/* ============================================================
   发热专项：全局页面可见性引擎（xj-ve）v121
   - 页面隐藏（visibilitychange -> hidden）时：
       1) <html> 挂 .xj-ve-hidden —— 配合 css/14-ve-engine.css 暂停全部 CSS 动画；
       2) 广播自定义事件 xj-ve:hidden —— 各模块（聊天/通话/保活）暂停定时器。
   - 回到可见时：
       1) 移除 .xj-ve-hidden，动画自动恢复；
       2) 广播 xj-ve:visible —— 各模块按原设置恢复定时器/保活。
   原则：仅隐藏时暂停/降频非必要任务；可见时行为与视觉效果完全不变。
   ============================================================ */
(function () {
  if (window.__xjVe) { return; }
  var isHidden = document.hidden || document.visibilityState === "hidden";

  function applyState(h) {
    if (h === isHidden) { return; }
    isHidden = h;
    var root = document.documentElement;
    if (root) {
      if (isHidden) { root.classList.add("xj-ve-hidden"); }
      else { root.classList.remove("xj-ve-hidden"); }
    }
    try {
      document.dispatchEvent(new CustomEvent(isHidden ? "xj-ve:hidden" : "xj-ve:visible"));
    } catch (e) { /* 老环境不支持 CustomEvent 时忽略，类切换仍生效 */ }
  }

  document.addEventListener("visibilitychange", function () {
    applyState(document.hidden || document.visibilityState === "hidden");
  });
  /* 初始同步：首帧即隐藏（如后台恢复/恢复会话）立即生效 */
  applyState(isHidden);

  window.__xjVe = {
    state: function () { return isHidden ? "hidden" : "visible"; }
  };
})();
