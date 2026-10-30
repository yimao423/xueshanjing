/* ============================================================================
 * 视觉视口底栏适配（00a-viewport-fit.js）
 * ----------------------------------------------------------------------------
 * 背景：聊天页 .page[data-page="chat-room"] 采用 position:fixed; top/left/right/bottom=0
 *       全屏布局。移动端（雨见 / 系统 WebView 等）软键盘弹出时，视觉视口（visualViewport）
 *       高度收缩、页面被键盘顶起，fixed 元素按「布局视口」定位，输入栏下半截被键盘遮挡。
 * 方案：监听 visualViewport 的 resize/scroll 与 focusin/focusout，当检测到软键盘弹出
 *       （视口高度收缩 > 阈值且焦点在输入区）时，把活动页高度改为 visualViewport 可见高度、
 *       顶部对齐视觉视口顶部（offsetTop），使底栏完整落在键盘上方；
 *       键盘收起或焦点离开后恢复原样式（清除内联样式）。
 * 兼容：visualViewport 不可用的老内核退化为 window resize 监听（尽力而为）。
 * 安全：只改当前活动页的内联 height/top，不改任何布局常量；仅影响 .page 全屏页。
 * ========================================================================== */
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
    _navObserver = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].type === 'attributes' && muts[i].attributeName === 'class') {
          setTimeout(update, 30);
          break;
        }
      }
    });
    var root = document.documentElement;
    if (root) { _navObserver.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] }); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', update);
  } else {
    update();
  }
})();
