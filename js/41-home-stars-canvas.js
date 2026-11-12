/* 雪山晶 · 41-home-stars-canvas ｜ 源：雪山晶.html L25654-L25917 ｜ JS 模块 */
/* ===== v105 首页第一屏：闪烁星点（背景层 + 双法盘环形星点层） =====
   1) DOM：3 个 .bg-star-layer 注入 .space-deco（z0，位于 ∞ 环 z1 之下）；
      每个法盘内注入 3 个 .dial-star-layer（z2，位于指针 td-h/td-m z3 之下）。
   2) 绘制：所有星点按索引 %3 分成三组，一次性静态绘制到各自 canvas，之后不再逐帧重绘；
      闪烁完全交给 CSS opacity keyframes（三组不同 duration + 负 delay 错峰）。
   3) 帧率控制：JS 无 rAF 循环、无定时器重绘；只在 resize / 字体尺寸变化 / 主题切换时
      低频重绘一次（防抖 120ms）；document.hidden 或切页时给 .app-page 加 .is-star-paused
      暂停全部动画，回到首页再恢复。
   4) 明暗主题：取 .phone[data-page="home"] 计算背景亮度，深色→白点，浅色→近黑点，跟随重绘。 */
(function(){
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  var phone = document.querySelector('.phone[data-page="home"]') || document.querySelector('.phone');
  var deco = ap.querySelector('.space-deco') || ap;
  var dials = [];
  var trEl = ap.querySelector('.time-dial-tr');
  var blEl = ap.querySelector('.time-dial-bl');
  if(trEl) dials.push(trEl);
  if(blEl) dials.push(blEl);
  if(!dials.length) return;

  var GAP = 6;          /* 与 ∞ 脚本一致的盘-圈留白 */
  var OUT_F = 0.6093;   /* td-ring-2 inset -10.93% → 外盘环半径系数 */
  var RING_FS = [0.4407, 0.55581, 0.6093]; /* 盘面外沿 / td-ring-1 虚线环 / td-ring-2 实线外环 */
  var INFLATE = 0.13;   /* 法盘星点层外扩比例，须与 CSS 一致 */
  var GROUP = 3;

  function inkColor(){
    var host = document.querySelector('.phone[data-page="home"]') || document.body;
    var m = (getComputedStyle(host).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if(!m) return '255,255,255';
    var p = m[1].split(',').map(parseFloat);
    var lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    return lum > 0.6 ? '172,172,172' : '255,255,255';
  }
  function dialSize(el){
    var v = parseFloat(getComputedStyle(el).getPropertyValue('--td-size'));
    if(isFinite(v) && v > 0) return v;
    var rc = el.getBoundingClientRect();
    return Math.max(rc.width, rc.height) || 200;
  }
  function makeCanvas(host, cls){
    var c = document.createElement('canvas');
    c.className = 'star-layer ' + cls;
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    return c;
  }
  function matrix(el, w, h, dpr){
    el.width = Math.max(1, Math.round(w * dpr));
    el.height = Math.max(1, Math.round(h * dpr));
    var ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }
  function cross(ctx, x, y, s, col, a){
    ctx.strokeStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
    ctx.stroke();
  }

  /* ---------- 背景闪烁星点 ---------- */
  var bgCanvases = [];
  var bg = deco.querySelectorAll('canvas.bg-star-layer');
  for(var b = 0; b < GROUP; b++){
    bgCanvases.push(bg[b] || makeCanvas(deco, 'bg-star-layer s-g' + (b + 1)));
  }
  /* 背景星点层必须排在 space-deco 其它装饰之下，避免盖住 sd-rift 等 */
  for(var b2 = 0; b2 < bgCanvases.length; b2++){
    if(bgCanvases[b2].parentNode === deco && deco.firstChild !== bgCanvases[b2]){
      deco.insertBefore(bgCanvases[b2], deco.firstChild);
    }
  }

  function drawBg(col){
    var box = ap.getBoundingClientRect();
    /* 首页不可见（切到其它页）时尺寸为 0，禁止此时重设画布，否则画布被压成 1x1 后拉伸闪屏 */
    if(box.width < 2 || box.height < 2) return;
    var w = Math.round(box.width);
    var h = Math.round(box.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    /* 排除区：盘面占位 + ∞ 星点环轨迹两侧 12px，保证不与已有 ∞ 点阵叠成一团 */
    var zones = [];
    for(var i = 0; i < dials.length; i++){
      var rc = dials[i].getBoundingClientRect();
      zones.push({
        x: rc.left - box.left + rc.width / 2,
        y: rc.top - box.top + rc.height / 2,
        size: dialSize(dials[i])
      });
    }
    function blocked(x, y){
      for(var k = 0; k < zones.length; k++){
        var z = zones[k];
        var d = Math.hypot(x - z.x, y - z.y);
        if(d < z.size * 0.60) return true;                    /* 盘体内部（会被法盘遮住） */
        if(Math.abs(d - (z.size / 2 + GAP)) < 12) return true; /* ∞ 环轨迹附近 */
      }
      return false;
    }

    var seed = 20261105;
    function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    var stars = [], tries = 0;
    while(stars.length < 110 && tries < 3000){
      tries++;
      var x = rnd() * w, y = rnd() * h;
      if(x < 7 || x > w - 7 || y < 7 || y > h - 7) continue;
      if(blocked(x, y)) continue;
      var tooClose = false;
      for(var c2 = 0; c2 < stars.length; c2++){
        if(Math.hypot(x - stars[c2].x, y - stars[c2].y) < 26){ tooClose = true; break; }
      }
      if(tooClose) continue;                       /* 最小间距 26px，避免局部聚成亮团 */
      var big = rnd() < 0.09;
      stars.push({
        x: x, y: y,
        r: big ? (1.1 + rnd() * 0.7) : (0.42 + rnd() * 0.85),
        a: 0.16 + rnd() * 0.58,
        cs: big
      });
    }

    /* v107 复用：把背景星点坐标暴露给「星球」装饰，用于避开密集区（不改动绘制行为） */
    try{ ap.__starBgStars = stars; }catch(e){}

    for(var g = 0; g < bgCanvases.length; g++){
      var cvs = bgCanvases[g];
      var ctx = matrix(cvs, w, h, dpr);
      ctx.shadowColor = 'rgba(' + col + ',0.55)';
      ctx.shadowBlur = 3.4;
      for(var s = g; s < stars.length; s += GROUP){
        var st = stars[s];
        ctx.fillStyle = 'rgba(' + col + ',' + st.a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      for(var s2 = g; s2 < stars.length; s2 += GROUP){
        var st2 = stars[s2];
        if(st2.cs) cross(ctx, st2.x, st2.y, st2.r * 2.6, col, Math.min(0.62, st2.a + 0.16));
      }
    }
  }

  /* ---------- 法盘环形星点拼接 ---------- */
  var dialLayers = [];
  for(var d = 0; d < dials.length; d++){
    var el = dials[d], arr = [];
    for(var g2 = 0; g2 < GROUP; g2++){
      arr.push(el.querySelector(':scope > canvas.dial-star-layer.s-g' + (g2 + 1)) || makeCanvas(el, 'dial-star-layer s-g' + (g2 + 1)));
    }
    dialLayers.push({ el: el, layers: arr, key: 0 });
  }

  function drawDials(col){
    for(var i = 0; i < dialLayers.length; i++){
      var item = dialLayers[i], el = item.el;
      var size = dialSize(el);
      var boxW = Math.max(1, Math.round(size * (1 + INFLATE * 2)));
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var cx = boxW / 2, cy = boxW / 2;
      var boost = (col === '172,172,172') ? 1.6 : 1;   /* 浅底时提高不透明度，保证浅灰星点环可辨 */

      var seed = 771009 + i * 30941;
      function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

      /* 沿三条环形线等距撒点，形成"星点拼成的线条"；仅加微小抖动保持手作感 */
      var dots = [];
      for(var f = 0; f < RING_FS.length; f++){
        var r = RING_FS[f] * size;
        var n = Math.max(14, Math.round(2 * Math.PI * r / 6.4));
        var base = rnd() * 6.2832;
        for(var k = 0; k < n; k++){
          var ang = base + (k / n) * 6.2832;
          var rr = r + (rnd() - 0.5) * 1.0;
          dots.push({
            x: cx + Math.cos(ang) * rr,
            y: cy + Math.sin(ang) * rr,
            r: 0.55 + rnd() * 0.92,
            a: 0.26 + rnd() * 0.62,
            cs: rnd() < 0.045
          });
        }
      }

      for(var g = 0; g < item.layers.length; g++){
        var ctx = matrix(item.layers[g], boxW, boxW, dpr);
        ctx.shadowColor = 'rgba(' + col + ',0.50)';
        ctx.shadowBlur = 3.0;
        for(var s = g; s < dots.length; s += GROUP){
          var dt = dots[s];
          ctx.fillStyle = 'rgba(' + col + ',' + Math.min(1, dt.a * boost).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(dt.x, dt.y, dt.r, 0, 6.2832); ctx.fill();
        }
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        for(var s2 = g; s2 < dots.length; s2 += GROUP){
          var dt2 = dots[s2];
          if(dt2.cs) cross(ctx, dt2.x, dt2.y, dt2.r * 2.4, col, Math.min(0.70, dt2.a + 0.14));
        }
      }
    }
  }

  /* ---------- 统一重绘 / 暂停控制 ---------- */
  var timer = null;
  function draw(){
    var col = inkColor();
    try{ drawBg(col); }catch(e){}
    try{ drawDials(col); }catch(e){}
  }
  function relayout(delay){
    if(timer) clearTimeout(timer);
    timer = setTimeout(draw, delay || 120);
  }

  window.addEventListener('resize', function(){ relayout(140); }, { passive: true });
  window.addEventListener('orientationchange', function(){ relayout(260); });
  if(window.ResizeObserver){ try{ new ResizeObserver(function(){ relayout(160); }).observe(ap); }catch(e){} }
  if(window.MutationObserver){
    try{
      new MutationObserver(function(){ relayout(80); }).observe(document.documentElement,
        { attributes: true, attributeFilter: ['data-theme-mode', 'class', 'style'] });
    }catch(e){}
  }

  var state = { hidden: false, offHome: false, visible: true };
  function syncPause(){
    var pause = state.hidden || state.offHome || !state.visible;
    ap.classList.toggle('is-star-paused', pause);
  }
  document.addEventListener('visibilitychange', function(){
    state.hidden = !!document.hidden; syncPause();
  });
  if(window.MutationObserver && phone){
    try{
      new MutationObserver(function(){
        state.offHome = phone.getAttribute('data-page') !== 'home';
        syncPause();
        relayout(160);   /* 主题/底色变化时按新亮度重算星点颜色 */
      }).observe(phone, { attributes: true, attributeFilter: ['data-page', 'class', 'style'] });
    }catch(e){}
  }
  if(window.IntersectionObserver){
    try{
      new IntersectionObserver(function(es){
        state.visible = !!(es[0] && es[0].isIntersecting);
        syncPause();
      }, { threshold: 0.02 }).observe(ap);
    }catch(e){}
  }

  draw();
  requestAnimationFrame(draw);
  window.addEventListener('load', function(){ draw(); setTimeout(draw, 400); });
  setTimeout(draw, 700);
})();
