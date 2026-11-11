/* 雪山晶 · 45-home-star-nav ｜ 源：雪山晶.html L26817-L26989 ｜ JS 模块 */
/* v157 首页第一屏：星点星球点击 → 直接打开对应页面（今日絮语 / 月汐笺语 / 字卡 / 设置） */
(function(){
  "use strict";
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  if(ap.__planetTapBound) return;          /* 只绑定一次，避免重复绑定导致多次打开 */
  ap.__planetTapBound = true;
  var phone = document.querySelector('.phone') || document.body;

  var MOVE_TOL = 10;      /* 位移阈值 px：超过视为滑动，不算点击 */
  var TIME_TOL = 700;     /* 按下-抬起最大间隔 ms */
  var HIT_EXTRA = 6;      /* 命中半径外扩容差 px */

  /* 直接走原导航入口：navClick 只从按钮读 data-page，故用临时按钮承载，
     不再依赖任何应用桌面 DOM */
  function navTo(key, label){
    if(!window.SnowCrystal || typeof window.SnowCrystal.navClick !== 'function') return;
    var btn = document.createElement('button');
    btn.setAttribute('data-page', key);
    window.SnowCrystal.navClick(btn, label);
  }

  /* 图标身份 → 真实打开逻辑（下标 = PLANET_ICONS 下标） */
  var OPENERS = {
    0: function(){ if(window.SnowCrystal && window.SnowCrystal.openChatList){ window.SnowCrystal.openChatList(); } },
    1: function(){ if(window.SnowCrystal && window.SnowCrystal.moonOpen){ window.SnowCrystal.moonOpen('default'); } },
    2: function(){ navTo('wordcard', '字卡'); },
    3: function(){ navTo('settings', '设置'); },
    4: function(){ if(window.SnowCrystal && window.SnowCrystal.openLetter){ window.SnowCrystal.openLetter(); } }
  };
  var OPENER_NAMES = {
    0: "SnowCrystal.openChatList()",
    1: "SnowCrystal.moonOpen('default')",
    2: "navTo('wordcard','字卡')",
    3: "navTo('settings','设置')",
    4: "SnowCrystal.openLetter()"
  };

  /* 运行时几何：容器矩形取圆心，data-size 取真实直径 */
  function geo(){
    var out = [];
    var nodes = ap.querySelectorAll('.planet-node[data-planet]');
    for(var i = 0; i < nodes.length; i++){
      var n = nodes[i];
      if(n.style.display === 'none') continue;
      var rc = n.getBoundingClientRect();
      if(rc.width < 8 || rc.height < 8) continue;
      var size = parseFloat(n.getAttribute('data-size'));
      if(!(size > 0)) size = Math.min(rc.width, rc.height);
      var ico = parseInt(n.getAttribute('data-ico'), 10);
      out.push({
        el: n,
        ico: isNaN(ico) ? i : ico,
        cx: rc.left + rc.width / 2,
        cy: rc.top + rc.height / 2,
        r: size / 2
      });
    }
    return out;
  }

  function flash(el){
    if(!el) return;
    el.classList.remove('is-tapped');
    void el.offsetWidth;                    /* 强制回流，保证连续点击可重播 */
    el.classList.add('is-tapped');
    if(el.__tapTimer) clearTimeout(el.__tapTimer);
    el.__tapTimer = setTimeout(function(){ el.classList.remove('is-tapped'); el.__tapTimer = null; }, 200);
  }

  function fire(x, y){
    var ps = geo(), best = null, bestD = Infinity;
    for(var i = 0; i < ps.length; i++){
      var p = ps[i], dx = x - p.cx, dy = y - p.cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if(d <= p.r + HIT_EXTRA && d < bestD){ bestD = d; best = p; }
    }
    if(!best) return;                        /* 未命中任何星球：不做任何事 */
    flash(best.el);
    var fn = OPENERS[best.ico];
    if(!fn) return;                          /* 未接入口的星球：仅反馈 */

    /* v158：触屏 pointerup 之后浏览器还会补发一次合成 click。这里同步切页，
       那次 click 会命中新页面同坐标处的卡片（点字卡星球时常误开「格言列表 / 字卡库」）。
       在捕获阶段吞掉紧随其后的那一下，首屏稳定停在「字卡」项目列表；
       格言等子列表只在用户明确点击对应条目时才打开。 */
    var guardDone = false;
    function dropGuard(){
      if(guardDone) return;
      guardDone = true;
      document.removeEventListener('click', clickGuard, true);
    }
    function clickGuard(ev){
      var cx = ev.clientX, cy = ev.clientY;
      var near = (typeof cx === 'number' && typeof cy === 'number')
        ? (Math.abs(cx - x) <= 24 && Math.abs(cy - y) <= 24) : true;
      if(near){
        ev.preventDefault();
        if(ev.stopImmediatePropagation){ ev.stopImmediatePropagation(); }
        else { ev.stopPropagation(); }
      }
      dropGuard();
    }
    document.addEventListener('click', clickGuard, true);

    try{ fn(); }catch(e){ if(window.console && console.warn){ console.warn('[planet tap] open failed:', best.ico, e); } }
    window.setTimeout(dropGuard, 350);
  }

  var st = null;
  function now(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }

  ap.addEventListener('pointerdown', function(e){
    if(e.pointerType === 'mouse' && e.button !== 0){ st = null; return; }
    if(phone.getAttribute('data-page') !== 'home'){ st = null; return; }
    st = { x: e.clientX, y: e.clientY, t: now(), id: e.pointerId };
  }, { passive: true });

  window.addEventListener('pointerup', function(e){
    if(!st) return;
    var s = st; st = null;
    if(s.id != null && e.pointerId != null && s.id !== e.pointerId) return;
    var dx = e.clientX - s.x, dy = e.clientY - s.y;
    if(Math.sqrt(dx * dx + dy * dy) >= MOVE_TOL) return;   /* 滑动：不算点击 */
    if(now() - s.t > TIME_TOL) return;
    fire(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('pointercancel', function(){ st = null; }, { passive: true });

  /* 不支持 Pointer Events 的环境：退化为 touch + mouse 判定 */
  if(!window.PointerEvent){
    ap.addEventListener('touchstart', function(e){
      var t = e.touches && e.touches[0];
      if(!t) return;
      if(phone.getAttribute('data-page') !== 'home'){ st = null; return; }
      st = { x: t.clientX, y: t.clientY, t: now(), id: t.identifier };
    }, { passive: true });
    ap.addEventListener('touchend', function(e){
      if(!st) return;
      var s = st; st = null;
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      if(!t) return;
      var dx = t.clientX - s.x, dy = t.clientY - s.y;
      if(Math.sqrt(dx * dx + dy * dy) >= MOVE_TOL) return;
      if(now() - s.t > TIME_TOL) return;
      fire(t.clientX, t.clientY);
    }, { passive: true });
    ap.addEventListener('touchcancel', function(){ st = null; }, { passive: true });
    ap.addEventListener('mousedown', function(e){
      if(e.button !== 0){ st = null; return; }
      if(phone.getAttribute('data-page') !== 'home'){ st = null; return; }
      st = { x: e.clientX, y: e.clientY, t: now(), id: 'm' };
    }, { passive: true });
    window.addEventListener('mouseup', function(e){
      if(!st) return;
      var s = st; st = null;
      var dx = e.clientX - s.x, dy = e.clientY - s.y;
      if(Math.sqrt(dx * dx + dy * dy) >= MOVE_TOL) return;
      if(now() - s.t > TIME_TOL) return;
      fire(e.clientX, e.clientY);
    }, { passive: true });
  }

  /* 调试/验收用只读快照（不参与交互逻辑） */
  window.__planetTapInfo = {
    bound: true,
    geo: geo,
    openers: OPENER_NAMES
  };
})();
