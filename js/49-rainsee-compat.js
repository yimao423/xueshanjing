/* 雪山晶 · 49-rainsee-compat ｜ 源：雪山晶.html L32384-L32421 ｜ JS 模块 */
(function () {
  if (window.__xjRainseeCompat) { return; }
  window.__xjRainseeCompat = true;
  var root = document.documentElement;

  /* 1) 后台暂停动画，回前台恢复 */
  function syncVis() { root.classList.toggle('xj-page-hidden', !!document.hidden); }
  document.addEventListener('visibilitychange', syncVis);
  window.addEventListener('pagehide', syncVis);
  window.addEventListener('pageshow', syncVis);
  syncVis();

  /* 2) 发送键：阻止 mousedown 的默认焦点转移，保持 chatInput 焦点、软键盘不收起。
        button 的 mousedown 被 preventDefault 后 click 仍会正常触发，不影响发送。 */
  document.addEventListener('mousedown', function (e) {
    var t = e.target;
    if (!t || !t.closest) { return; }
    if (t.closest('.chat-plus-btn.is-send, .chat-send-btn')) { e.preventDefault(); }
  }, true);

  /* 3) 兜底：个别内核仍会抢走焦点时，异步把焦点还给输入框（preventScroll 不触发滚动） */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) { return; }
    if (!t.closest('.chat-plus-btn.is-send, .chat-send-btn')) { return; }
    var inp = document.getElementById('chatInput');
    if (!inp || document.activeElement === inp) { return; }
    setTimeout(function () {
      if (document.activeElement === inp) { return; }
      try { inp.focus({ preventScroll: true }); } catch (err) { try { inp.focus(); } catch (e2) {} }
    }, 0);
  }, true);

  /* 4) 面板/弹窗打开时不自动聚焦：只有用户真正点中输入框，浏览器才会调起输入法。
        这里不做任何 focus() 干预；同时不再注册任何键盘期间的滚动/尺寸重排监听。 */
}());
