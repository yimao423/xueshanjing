/* 雪山晶 · 03-viewport-fit ｜ 源：雪山晶.html L5355-L5448 ｜ JS 模块 */
/* 视觉视口底栏适配（00a-viewport-fit.js） */
(function () {
  if (window.__xjVvFit) { return; }
  window.__xjVvFit = true;

  var KEYBOARD_GAP = 120; /* 视口高度收缩超过该值才认为软键盘弹出（防误判） */
  var vv = window.visualViewport || null;
  var fitted = false;
  var lastH = 0, lastTop = 0;

  function activePage() {
    return document.querySelector('.page.is-active');
  }

  function applyFit(h, top) {
    var pg = activePage();
    if (!pg) { return; }
    fitted = true;
    lastH = h; lastTop = top;
    pg.style.height = h + 'px';
    pg.style.top = top + 'px';
  }

  function clearFit() {
    var pg = activePage();
    fitted = false;
    lastH = 0; lastTop = 0;
    if (!pg) { return; }
    pg.style.height = '';
    pg.style.top = '';
  }

  function update() {
    var vh = 0, vt = 0;
    if (vv) {
      vh = vv.height;
      vt = vv.offsetTop || 0;
    } else {
      vh = window.innerHeight;
      vt = 0;
    }
    var shrink = (window.innerHeight - vh);
    var el = document.activeElement;
    var editing = !!(el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable));
    var keyboard = editing && shrink > KEYBOARD_GAP;

    if (keyboard) {
      applyFit(vh, vt);
      return;
    }
    if (fitted) {
      /* 键盘收起：若视口已恢复则清除适配；若仍收缩（如输入法未完全收起）则保持 */
      if (shrink <= KEYBOARD_GAP) { clearFit(); }
      else { applyFit(vh, vt); }
    }
  }

  if (vv) {
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
  } else {
    window.addEventListener('resize', function () { update(); });
    window.addEventListener('scroll', function () { update(); });
  }
  document.addEventListener('focusin', function () { setTimeout(update, 60); });
  document.addEventListener('focusout', function () { setTimeout(update, 320); }); /* 键盘收起有延迟 */

  /* 切换页面后若输入法仍开着，重新适配新页面 */
  var _navObserver = null;
  if (window.MutationObserver) {
    var _navT = 0; /* V18 降温：单定时器合并，避免 class 抖动堆积大量 update */
    _navObserver = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].type === 'attributes') {
          clearTimeout(_navT);
          _navT = setTimeout(update, 30);
          break;
        }
      }
    });
    /* V18 降温：只观察 .phone 自身（页面切换/键盘态都落在这里），不再全子树监听 class */
    var navHost = document.querySelector('.phone') || document.documentElement;
    if (navHost) { _navObserver.observe(navHost, { attributes: true, attributeFilter: ['class', 'data-page'] }); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();
