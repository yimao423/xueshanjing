/* 雪山晶 · 46-viewport-fit-patch ｜ 源：雪山晶.html L28429-L28514 ｜ JS 模块 */
(function () {
  if (window.__xjViewportFitPatch) { return; }
  window.__xjViewportFitPatch = true;

  var root = document.documentElement;
  var vv = window.visualViewport || null;
  var raf = 0, lastVal = '';

  /* 底栏已移除：钉死 data-nav=hidden，防止旧脚本再激活占位规则 */
  function lockNav() {
    if (root.getAttribute('data-nav') !== 'hidden') {
      root.setAttribute('data-nav', 'hidden');
    }
  }

  function compute() {
    lockNav();
    var layoutH = window.innerHeight || root.clientHeight || 0;
    var vh = (vv && typeof vv.height === 'number' && vv.height > 0) ? vv.height : layoutH;
    var el = document.activeElement;
    var editing = !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable));
    var zoomed = vv && vv.scale && Math.abs(vv.scale - 1) > 0.02;
    /* 必须「输入控件聚焦 + 可视区大幅收缩」才判定为软键盘；
       浏览器工具栏/地址栏造成的缩小一律不收缩，避免首页底部露白。 */
    var kb = !!(editing && !zoomed && (layoutH - vh) > 120 && vh >= 240 && vh < layoutH * 0.82);
    var h = kb ? vh : layoutH;
    if (!h || h < 240) { h = layoutH; }
    h = Math.round(h);
    var val = h + 'px';
    if (val !== lastVal) { lastVal = val; root.style.setProperty('--xj-app-h', val); }
    root.classList.toggle('xj-kb-open', kb);
  }

  function schedule() {
    if (raf) { return; }
    raf = window.requestAnimationFrame(function () { raf = 0; compute(); });
  }

  window.addEventListener('resize', schedule, true);
  window.addEventListener('orientationchange', function () {
    setTimeout(schedule, 200); setTimeout(schedule, 600); setTimeout(schedule, 1200);
  }, true);
  if (vv) {
    vv.addEventListener('resize', schedule, true);
    vv.addEventListener('scroll', schedule, true);
  } else {
    window.addEventListener('scroll', schedule, true);
  }
  /* [FIX-RAINSEE] 焦点变化只补算一次：原来 3+3 个 setTimeout 会在键盘弹出/收起时
     反复切换 xj-kb-open 与 --xj-app-h，正是「界面闪来闪去」的来源 */
  document.addEventListener('focusin', function () { setTimeout(schedule, 120); }, true);
  document.addEventListener('focusout', function () { setTimeout(schedule, 120); }, true);

  /* [FIX-RAINSEE] 只保留 documentElement 的导航锁观察；删掉 body 子树 class 监听——
     聊天滚动/按钮态切换都会触发它，每次联动 rAF 重算，是持续发热的重要来源 */
  if (window.MutationObserver) {
    try {
      new MutationObserver(function () { lockNav(); }).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-nav', 'class', 'data-page']
      });
    } catch (e) { /* 忽略 */ }
  }

  /* 部分国产内核不派发 visualViewport 事件：低频兜底，且后台不空转 */
  var _xjFitIdle = window.setInterval(function () {
    if (document.hidden) { return; }
    schedule();
  }, 2000);

  /* 空白处触摸滑动直接吞掉，避免浏览器整页拖拽 */
  document.addEventListener('touchmove', function (e) {
    var t = e.target;
    if (t === document.documentElement || t === document.body ||
        (t && t.classList && t.classList.contains('phone'))) {
      if (e.cancelable) { e.preventDefault(); }
    }
  }, { passive: false, capture: true });

  lockNav();
  compute();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { lockNav(); compute(); schedule(); }, { once: true });
  }
})();
