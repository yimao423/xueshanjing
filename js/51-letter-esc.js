/* 雪山晶 · 51-letter-esc ｜ 源：雪山晶.html L36099-L36117 ｜ JS 模块 */
/* 去掉「关闭」按键后保留键盘兜底：Esc 关闭信件弹窗（点信纸外空白仍可关闭） */
(function(){
  if (window.__xjV38LetterEsc) { return; }
  window.__xjV38LetterEsc = 1;
  document.addEventListener('keydown', function (e) {
    if ((e.key || '') !== 'Escape') { return; }
    var m = document.querySelector('.xjs-letter-mask');
    if (!m) { return; }
    /* 复用遮罩点击的委托逻辑：closeLetterDetail() 会同时停掉打字机 */
    try { m.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
    catch (err) {
      var ev = document.createEvent('MouseEvents');
      ev.initEvent('click', true, true);
      m.dispatchEvent(ev);
    }
  }, true);
})();
