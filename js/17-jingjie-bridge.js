/* ============================================================================
 * 镜界嵌入桥接（雪晶侧）
 * 对标：拾心界-镜界整合版 js/jingjie-bridge.js
 * 提供 SnowCrystal.openJingJie()：全屏 iframe 嵌入 ./镜界/index.html
 * 监听 {type:'back-to-shixinjie'} message 回到雪晶（镜界侧 jingjie-embed.js
 * 在嵌入态注入返回按钮并发送该消息，雪晶侧监听同名消息关闭 iframe）
 * 暴露全局兜底 window.__shxjBackJingJie__（镜界侧直调）
 * ==========================================================================*/
(function () {
  'use strict';

  var JINGJIE_IFRAME_SRC = './镜界/index.html';
  var CONTAINER_ID = 'jingjie-embed-container';
  var containerNode = null;
  var opened = false;

  function getContainer() {
    if (containerNode && document.body && document.body.contains(containerNode)) {
      return containerNode;
    }
    containerNode = null;
    return null;
  }

  function ensureContainer() {
    var el = getContainer();
    if (el) return el;

    el = document.getElementById(CONTAINER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = CONTAINER_ID;

      var frame = document.createElement('iframe');
      frame.id = CONTAINER_ID + '-frame';
      frame.src = JINGJIE_IFRAME_SRC;
      frame.style.cssText = 'width:100%;height:100%;border:0;display:block;';
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('allowfullscreen', 'true');
      frame.setAttribute('loading', 'eager');
      frame.setAttribute('allow', 'fullscreen');

      el.appendChild(frame);
      document.body.appendChild(el);
    }
    containerNode = el;
    return el;
  }

  /* 关闭雪晶可能仍在屏幕上的浮层（加号/表情/拍一拍/菜单/来电等），
     避免嵌入镜界后浮层残留覆盖 */
  function hideFloating() {
    var C = null;
    try { C = window.SnowCrystal && window.SnowCrystal.Chat; } catch (e) { C = null; }
    if (C) {
      try { if (typeof C.closePlusPanel === 'function') C.closePlusPanel(); } catch (e) { /* 忽略 */ }
      try { if (typeof C.closeEmojiPanel === 'function') C.closeEmojiPanel(); } catch (e) { /* 忽略 */ }
      try { if (typeof C.closePatPanel === 'function') C.closePatPanel(); } catch (e) { /* 忽略 */ }
      try { if (typeof C.closeChatRoomMenu === 'function') C.closeChatRoomMenu(); } catch (e) { /* 忽略 */ }
      try { if (typeof C.closeChatBgPanel === 'function') C.closeChatBgPanel(); } catch (e) { /* 忽略 */ }
    }
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      try { document.activeElement.blur(); } catch (e) { /* 忽略 */ }
    }
  }

  function openJingJie() {
    hideFloating();
    var el = ensureContainer();
    el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#ffffff;display:block;';
    opened = true;
  }

  function closeJingJie() {
    var el = getContainer();
    if (el) el.style.display = 'none';
    opened = false;
  }

  /* 全局兜底回退函数（供镜界侧直调） */
  window.__shxjBackJingJie__ = closeJingJie;

  /* message 监听，带防重复标志 */
  window.addEventListener('message', function (event) {
    try {
      if (!event || !event.data) return;
      var data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { /* 非 JSON 忽略 */ }
      }
      if (data && data.type === 'back-to-shixinjie') {
        closeJingJie();
      }
    } catch (e) { /* 忽略异常，保证雪晶正常 */ }
  });

  window.openJingJie = openJingJie;
  window.closeJingJie = closeJingJie;
  if (!window.SnowCrystal) { window.SnowCrystal = {}; }
  window.SnowCrystal.openJingJie = openJingJie;
  window.SnowCrystal.closeJingJie = closeJingJie;
})();
