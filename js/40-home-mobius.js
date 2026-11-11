/* 雪山晶 · 40-home-mobius ｜ 源：雪山晶.html L25391-L25548 ｜ JS 模块 */
/* ===== v104 首页第一屏：双法盘等比缩放 + 星点莫比乌斯环 ∞ 布局与绘制 =====
   几何：∞ 为左右两个相切圆环，轴线按 TILT 倾斜（左下圈=大盘，右上圈=小盘）
   性能：点阵只在尺寸/主题变化时整幅重绘一次，不做逐帧动画 */
(function(){
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  var cv = ap.querySelector('.mobius-star');
  var tr = ap.querySelector('.time-dial-tr');
  var bl = ap.querySelector('.time-dial-bl');
  if(!cv || !tr || !bl) return;

  var SIZE_TR = 152;      /* 原 200px → 0.76 倍 */
  var SIZE_BL = 240;      /* 原 320px → 0.75 倍 */
  var RING_F  = 0.5547;   /* td-ring-2 inset -10.93% → 外盘可视半径系数 */
  var GAP     = 6;        /* 星点轨迹与法盘最外环的留白 */
  var TILT    = 56 * Math.PI / 180;
  var COS = Math.cos(TILT), SIN = Math.sin(TILT);

  function inkColor(){
    var host = document.querySelector('.phone[data-page="home"]') || document.body;
    var m = (getComputedStyle(host).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if(!m) return '255,255,255';
    var p = m[1].split(',').map(parseFloat);
    var lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    return lum > 0.6 ? '172,172,172' : '255,255,255';
  }

  function toScreen(u, v, cx, cy){
    return { x: cx + u * COS + v * SIN, y: cy - u * SIN + v * COS };
  }

  function place(el, size, c){
    el.style.setProperty('--td-size', size + 'px', 'important');
    el.style.setProperty('left', c.x.toFixed(1) + 'px', 'important');
    el.style.setProperty('top', c.y.toFixed(1) + 'px', 'important');
    el.style.setProperty('margin', (-size/2).toFixed(1) + 'px 0 0 ' + (-size/2).toFixed(1) + 'px', 'important');
  }

  function sparkle(ctx, x, y, s, col, a){
    var g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.8);
    g.addColorStop(0, 'rgba(' + col + ',' + (0.50 * a).toFixed(3) + ')');
    g.addColorStop(0.38, 'rgba(' + col + ',' + (0.14 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.8, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(' + col + ',' + (0.80 * a).toFixed(3) + ')';
    ctx.lineWidth = Math.max(0.6, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - s * 1.9, y); ctx.lineTo(x + s * 1.9, y);
    ctx.moveTo(x, y - s * 1.9); ctx.lineTo(x, y + s * 1.9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(' + col + ',' + (0.95 * a).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, s * 0.2), 0, 6.2832); ctx.fill();
  }

  function draw(){
    var w = ap.clientWidth, h = ap.clientHeight;
    if(!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    if(!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    /* 窄屏自适应：按 ∞ 整体包围盒给左右/上下各留 12px，等比缩小（下限 0.8，保持 0.75±比例） */
    var probeD = (SIZE_BL + SIZE_TR) * RING_F + GAP * 2;
    var s = Math.min(1, (w - 24) / (probeD * (COS + 1)), (h - 24) / (probeD * (SIN + 1)));
    s = Math.max(0.8, s);
    var szBl = Math.round(SIZE_BL * s), szTr = Math.round(SIZE_TR * s), gap = GAP * s;
    var rBl = szBl * RING_F + gap;
    var rTr = szTr * RING_F + gap;
    var D = rBl + rTr, half = D / 2;
    /* ∞ 参数空间原点 (cx, cy)：按整体包围盒在容器内水平/垂直居中反推 */
    var cx = w / 2 + (rBl - rTr) * (COS + 1) / 2;
    var cy = h / 2 - (rBl - rTr) * (SIN + 1) / 2;
    /* 两圈圆心（∞ 参数空间 u = -rBl / +rTr，v = 0，按 TILT 旋转投影到屏幕） */
    var blC = { x: cx - rBl * COS, y: cy + rBl * SIN };
    var trC = { x: cx + rTr * COS, y: cy - rTr * SIN };
    /* 首次落位：左下圈=大盘，右上圈=小盘 */
    var targets = [
      { el: bl, size: szBl, c: blC },
      { el: tr, size: szTr, c: trC }
    ];
    var i0;
    for(i0 = 0; i0 < targets.length; i0++){ place(targets[i0].el, targets[i0].size, targets[i0].c); }
    /* 二次校正：3D 透视变换会让包围盒中心略偏，按实测中心回正，保证盘心与圈心重合 */
    var apBox = ap.getBoundingClientRect();
    for(i0 = 0; i0 < targets.length; i0++){
      var tg = targets[i0], rc = tg.el.getBoundingClientRect();
      var ax = rc.left - apBox.left + rc.width / 2;
      var ay = rc.top - apBox.top + rc.height / 2;
      var ddx = tg.c.x - ax, ddy = tg.c.y - ay;
      if(Math.abs(ddx) > 0.4 || Math.abs(ddy) > 0.4){
        place(tg.el, tg.size, { x: tg.c.x + ddx, y: tg.c.y + ddy });
      }
    }

    var col = inkColor();
    var seed = 20261105;
    function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    var loops = [[-rBl, rBl], [rTr, rTr]];
    var dMax = D;
    ctx.shadowColor = 'rgba(' + col + ',0.50)';
    ctx.shadowBlur = 5;
    for(var li = 0; li < loops.length; li++){
      var cu = loops[li][0], r = loops[li][1];
      var n = Math.round(2 * Math.PI * r / 1.9);
      for(var i = 0; i < n; i++){
        var phi = (i / n) * 6.283185 + (rnd() - 0.5) * 0.02;
        var u = cu + r * Math.cos(phi);
        var v = r * Math.sin(phi);
        var d = Math.sqrt(u * u + v * v) / dMax;
        var dens = Math.max(0.10, 1 - d * 0.78);      /* 越靠近交叉点越密 */
        if(rnd() > 0.26 + 0.74 * dens) continue;
        if(rnd() < 0.10){ var k = 1 + rnd() * 0.07; u *= k; v *= k; }  /* 少量外溢颗粒 */
        var pt = toScreen(u + (rnd() - 0.5) * 2.2, v + (rnd() - 0.5) * 2.2, cx, cy);
        if(pt.x < 2 || pt.x > w - 2 || pt.y < 2 || pt.y > h - 2) continue;
        var rad = (0.40 + rnd() * 1.0) * (0.55 + 0.65 * dens);
        var a = (0.15 + rnd() * 0.60) * (0.50 + 0.60 * dens);
        ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, rad, 0, 6.2832); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    for(var s2 = 0; s2 < 7; s2++){
      var useLeft = rnd() < 0.55;
      var cu2 = useLeft ? -rBl : rTr, r2 = useLeft ? rBl : rTr;
      var phi2 = rnd() * 6.283185;
      var p2 = toScreen(cu2 + r2 * Math.cos(phi2), r2 * Math.sin(phi2), cx, cy);
      if(p2.x < 28 || p2.x > w - 28 || p2.y < 28 || p2.y > h - 28) continue;
      sparkle(ctx, p2.x, p2.y, 2.0 + rnd() * 2.4, col, 0.55 + rnd() * 0.40);
    }
  }

  var timer = null;
  function relayout(){ if(timer) clearTimeout(timer); timer = setTimeout(draw, 90); }
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('orientationchange', relayout);
  if(window.ResizeObserver){ try{ new ResizeObserver(relayout).observe(ap); }catch(e){} }
  if(window.MutationObserver){
    try{
      new MutationObserver(relayout).observe(document.documentElement,
        { attributes: true, attributeFilter: ['data-theme-mode', 'class', 'style'] });
    }catch(e){}
  }
  draw();
  requestAnimationFrame(draw);
  window.addEventListener('load', function(){ draw(); setTimeout(draw, 400); });
  setTimeout(draw, 700);
})();
