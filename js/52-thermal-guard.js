/* 雪山晶 · 52-thermal-guard ｜ 源：雪山晶.html L36248-L36293 ｜ JS 模块 */
/* V18 降温守卫：离屏常驻动画暂停 + 后台静默。不改任何功能与布局。 */
(function () {
  if (window.__xjThermalGuard) { return; }
  window.__xjThermalGuard = true;
  var root = document.documentElement;
  var SEL = '.star-layer,.gold-star-layer,.link-sym,.call-active-ring,.mtx-shuffle-card,' +
            '.time-dial,.time-dial *,' +
            '.chat-voice-wave i,.qa-state,.snow-effect-p,.denim-texture,.xjl-caret,.chat-vl-row,.album-card';
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        var e = es[i];
        if (e.isIntersecting) { e.target.classList.remove('xj-offscreen'); }
        else { e.target.classList.add('xj-offscreen'); }
      }
    }, { rootMargin: '160px' });
  }
  var scoped = false;
  function scan() {
    if (!io || scoped) { return; }
    var list;
    try { list = document.querySelectorAll(SEL); } catch (e) { return; }
    if (!list.length) { return; }
    scoped = true;
    for (var i = 0; i < list.length; i++) {
      try { io.observe(list[i]); } catch (e2) { /* 忽略 */ }
    }
  }
  function later() {
    if (window.requestIdleCallback) { requestIdleCallback(scan, { timeout: 3000 }); }
    else { setTimeout(scan, 1500); }
  }
  if (document.readyState === 'complete') { later(); }
  else { window.addEventListener('load', later, { once: true }); }
  /* 页面/主题切换后布局会重排，重新判定一次可见性 */
  var t = 0;
  document.addEventListener('visibilitychange', function () {
    root.classList.toggle('xj-page-hidden', !!document.hidden);
    if (document.hidden) { return; }
    clearTimeout(t);
    t = setTimeout(scan, 400);
  });
})();
