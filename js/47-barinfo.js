/* 雪山晶 · 47-barinfo ｜ 源：雪山晶.html L28964-L29031 ｜ JS 模块 */
(function () {
  var KEY = 'xj.barInfoHidden';
  function read() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function apply() {
    var on = read();
    document.documentElement.setAttribute('data-bar-info-hidden', on ? '1' : '0');
    var sw = document.getElementById('bbsInfoHidden');
    if (sw) {
      sw.classList.toggle('is-on', on);
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
    }
    /* v14 兜底：不只依赖样式表匹配。刷新后若 <style> 规则未命中/被其它
       !important 规则抢先，仅设 html 属性不会隐藏；这里直接对信息条本体
       下内联 !important，重新进入聊天室、退出多选（会清内联）后同样生效。 */
    var infos = document.querySelectorAll('.page[data-page="chat-room"] .chat-room-info');
    for (var i = 0; i < infos.length; i++) {
      if (on) { infos[i].style.setProperty('display', 'none', 'important'); }
      else { infos[i].style.removeProperty('display'); }
    }
  }
  function reapply() { try { apply(); } catch (e) {} }
  function set(on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    apply();
    try {
      if (window.SnowCrystal && typeof SnowCrystal.toast === 'function') {
        SnowCrystal.toast(on ? '已隐藏底栏我方情绪状态' : '已显示底栏我方情绪状态');
      }
    } catch (e) {}
  }
  function toggle() { set(!read()); }
  function mount() {
    if (!window.SnowCrystal || !SnowCrystal.Chat) { return false; }
    var C = SnowCrystal.Chat;
    C.setBarInfoHidden = set;
    C.toggleBarInfoHidden = toggle;
    C.isBarInfoHidden = read;
    C.syncBarInfoHidden = apply;
    /* 打开「顶栏底栏设置」页时同步开关显示（包装原 syncBarSettings） */
    if (typeof C.syncBarSettings === 'function' && !C.__xjV8Wrapped) {
      var orig = C.syncBarSettings;
      C.syncBarSettings = function () { var r = orig.apply(this, arguments); apply(); return r; };
      C.__xjV8Wrapped = true;
    }
    return true;
  }
  apply();
  /* v14：首帧之后再套用几次，覆盖刷新时聊天室尚未渲染完成的时序 */
  if (document.readyState === 'complete') { reapply(); }
  else { window.addEventListener('load', reapply); }
  setTimeout(reapply, 300);
  setTimeout(reapply, 1200);
  if (!mount()) {
    var n = 0;
    var timer = setInterval(function () {
      n++;
      if (mount() || n > 50) { clearInterval(timer); }
    }, 200);
  }
  /* 兜底：应用内切换页面 / 进入聊天室 / 退出多选后重新套用（无侵入） */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.page[data-page="bar-settings"]')) { setTimeout(apply, 0); return; }
    setTimeout(reapply, 30);
  }, true);
})();
