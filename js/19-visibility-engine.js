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

  function applyState(h, force) {
    if (!force && h === isHidden) { return; }
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
  /* 初始同步：首帧即隐藏（如后台恢复/恢复会话）立即生效。
     v121.1：初始隐藏必须强制广播 xj-ve:hidden —— 否则各模块（聊天主动引擎/保活）在
     DOMContentLoaded 前感知不到隐藏态，其隐藏清理逻辑永远不会执行（历史死锁根因）。 */
  applyState(isHidden, true);

  window.__xjVe = {
    state: function () { return isHidden ? "hidden" : "visible"; }
  };

  /* ============================================================
     发热优化 P0-1a：可见态空闲降载（xj-idle）
     - 页面可见且 30s 无交互时，给 <html> 挂 .xj-idle，
       配合 css/14-ve-engine.css 仅暂停装饰类无限动画；
     - 任一交互（点击/触摸/按键/滚动/移动）立即移除并重新计时；
     - 页面隐藏时移除（隐藏态另有 .xj-ve-hidden 全暂停兜底），
       回前台重新计时。
     原则：仅在「无人操作」时暂停装饰动画，恢复交互即恢复原效果，
     视觉与功能无感知差异。
     ============================================================ */
  (function idleDowngrade() {
    if (window.__xjIdleDowngrade) { return; }
    window.__xjIdleDowngrade = true;
    var root = document.documentElement;
    var IDLE_MS = 30000;
    var timer = null;
    var armed = false;
    function clearT() { if (timer) { clearTimeout(timer); timer = null; } }
    function arm() {
      if (armed) { return; }
      armed = true;
      timer = setTimeout(function () {
        timer = null;
        if (!document.hidden) { root.classList.add("xj-idle"); }
      }, IDLE_MS);
    }
    function kick() {
      clearT();
      if (root.classList.contains("xj-idle")) { root.classList.remove("xj-idle"); }
      armed = false;
      arm();
    }
    /* 交互即唤醒：捕获阶段 + passive，避免影响页面自身事件 */
    ["pointerdown", "touchstart", "keydown", "pointermove", "wheel", "scroll"].forEach(function (ev) {
      document.addEventListener(ev, kick, { passive: true, capture: true });
    });
    document.addEventListener("visibilitychange", function () {
      clearT();
      if (root.classList.contains("xj-idle")) { root.classList.remove("xj-idle"); }
      armed = false;
      arm();
    });
    arm();
  })();
})();
