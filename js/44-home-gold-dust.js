/* 雪山晶 · 44-home-gold-dust ｜ 源：雪山晶.html L26416-L26789 ｜ JS 模块 */
/* v156 首页第一屏：金色闪粉星点 / 星轨 / 星迹（静态 canvas + CSS 分组闪烁） */
(function(){
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  var phone = document.querySelector('.phone[data-page="home"]') || document.querySelector('.phone');
  var GROUP = 3;
  var GAP = 8;                 /* 与法盘 / 图标的最近安全间距（px） */
  var DOTS = 84;               /* 柔和圆点数量 */
  var CROSSES = 12;            /* 四角十字星芒数量 */
  var TRAILS = 0;             /* 星轨条数 */
  var DTRAILS = 0;             /* 点状星迹条数 */
  var BASE_ANG = 26;           /* 统一流向基准角（18°~35° 区间内 ±6° 抖动） */

  /* ---------- 容器与画布层 ---------- */
  var layer = ap.querySelector(':scope > .home-gold');
  if(!layer){
    layer = document.createElement('div');
    layer.className = 'home-gold';
    layer.setAttribute('aria-hidden', 'true');
    var mob = ap.querySelector(':scope > .mobius-star');
    var deco = ap.querySelector(':scope > .space-deco');
    if(mob && mob.parentNode === ap){ ap.insertBefore(layer, mob); }
    else if(deco && deco.parentNode === ap){ ap.insertBefore(layer, deco.nextSibling); }
    else { ap.appendChild(layer); }
  }
  var starLayers = [];
  for(var gi = 0; gi < GROUP; gi++){
    var cv = layer.querySelector(':scope > canvas.gold-star-layer.s-g' + (gi + 1));
    if(!cv){
      cv = document.createElement('canvas');
      cv.className = 'gold-star-layer s-g' + (gi + 1);
      cv.setAttribute('aria-hidden', 'true');
      layer.appendChild(cv);
    }
    starLayers.push(cv);
  }
  var trailCv = layer.querySelector(':scope > canvas.gold-trail-layer');
  if(!trailCv){
    trailCv = document.createElement('canvas');
    trailCv.className = 'gold-trail-layer';
    trailCv.setAttribute('aria-hidden', 'true');
    layer.appendChild(trailCv);
  }

  /* ---------- 色板 ---------- */
  var PAL_DARK = {
    s: ['243,217,164', '232,192,122', '217,164,65', '201,148,74'],
    w: [0.34, 0.30, 0.22, 0.14],
    t: ['232,211,168', '243,217,164', '232,192,122']
  };
  var PAL_LIGHT = {
    s: ['172,172,172', '188,188,188', '152,152,152', '202,202,202'],
    w: [0.34, 0.30, 0.22, 0.14],
    t: ['172,172,172', '188,188,188', '152,152,152']
  };

  /* ---------- 确定性伪随机（每次重绘同一序列，resize 不重排） ---------- */
  function makeRng(seed){
    var s = seed >>> 0;
    return function(){
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pickIdx(r, w){
    var v = r(), acc = 0;
    for(var i = 0; i < w.length; i++){ acc += w[i]; if(v <= acc) return i; }
    return w.length - 1;
  }

  /* ---------- 明暗判底 ---------- */
  function isLight(){
    var host = phone || document.body;
    var m = (getComputedStyle(host).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if(!m) return false;
    var p = m[1].split(',').map(parseFloat);
    var lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    return lum > 0.6;
  }

  /* ---------- 排除区（法盘盘体 + 星球节点 + 五枚图标，外扩 GAP） ---------- */
  function zoneList(){
    var box = ap.getBoundingClientRect();
    var zs = [], i, rc;
    var dials = ap.querySelectorAll('.time-dial');
    for(i = 0; i < dials.length; i++){
      rc = dials[i].getBoundingClientRect();
      if(rc.width < 4 || rc.height < 4) continue;
      zs.push({ t: 'c', x: rc.left - box.left + rc.width / 2, y: rc.top - box.top + rc.height / 2, r: Math.max(rc.width, rc.height) / 2 + GAP, rr: Math.max(rc.width, rc.height) / 2 });
    }
    var list = ap.querySelectorAll('.planet-node, .app-ic');
    for(i = 0; i < list.length; i++){
      rc = list[i].getBoundingClientRect();
      if(rc.width < 4 || rc.height < 4) continue;
      zs.push({ t: 'r', x1: rc.left - box.left, y1: rc.top - box.top, x2: rc.right - box.left, y2: rc.bottom - box.top });
    }
    return zs;
  }
  function blocked(zs, x, y){
    for(var k = 0; k < zs.length; k++){
      var z = zs[k];
      if(z.t === 'c'){
        var dx = x - z.x, dy = y - z.y;
        if(dx * dx + dy * dy < z.r * z.r) return true;
      } else if(x > z.x1 - GAP && x < z.x2 + GAP && y > z.y1 - GAP && y < z.y2 + GAP) return true;
    }
    return false;
  }

  /* ---------- 一次性构建（固定种子 + 拒绝采样） ---------- */
  var built = false, items = [], trails = [], dtrails = [];
  var stat = { dots: 0, crosses: 0, trails: 0, dtrails: 0, minGap: 9999 };

  function build(W, H){
    var r = makeRng(20261105);
    var zs = zoneList();

    function sample(){
      if(r() < 0.44){                       /* 屏幕边缘略密 */
        var side = Math.floor(r() * 4);
        if(side === 0) return { x: r() * W * 0.18, y: r() * H };
        if(side === 1) return { x: W - r() * W * 0.18, y: r() * H };
        if(side === 2) return { x: r() * W, y: r() * H * 0.15 };
        return { x: r() * W, y: H - r() * H * 0.15 };
      }
      return { x: r() * W, y: r() * H };
    }
    function freePoint(){
      for(var t = 0; t < 800; t++){
        var s = sample();
        if(!blocked(zs, s.x, s.y)) return s;
      }
      return null;
    }

    items = [];
    /* 柔和圆点 */
    for(var d = 0; d < DOTS; d++){
      var p = freePoint();
      if(!p) continue;
      items.push({
        kind: 0, g: items.length % GROUP,
        fx: p.x / W, fy: p.y / H,
        rad: 0.5 + r() * 0.75,
        a: 0.55 + r() * 0.40,
        c: pickIdx(r, PAL_DARK.w)
      });
    }
    /* 四角十字星芒 */
    for(var c2 = 0; c2 < CROSSES; c2++){
      var q = freePoint();
      if(!q) continue;
      items.push({
        kind: 1, g: items.length % GROUP,
        fx: q.x / W, fy: q.y / H,
        arm: 2.0 + r() * 2.5,
        lw: 0.6 + r() * 0.4,
        a: 0.60 + r() * 0.32,
        c: pickIdx(r, PAL_DARK.w),
        rot: r() * Math.PI / 2
      });
    }

    /* 星轨：细长渐变拖尾 */
    trails = [];
    for(var t2 = 0; t2 < TRAILS; t2++){
      var ang = (BASE_ANG + (r() * 12 - 6)) * Math.PI / 180;
      var dx = Math.cos(ang), dy = Math.sin(ang);
      var len = 30 + r() * 110;
      var lw2 = 0.6 + r() * 0.6;
      var ha = 0.10 + r() * 0.18;
      var ci = Math.floor(r() * PAL_DARK.t.length);
      var head = null;
      for(var tr = 0; tr < 400; tr++){
        var s2 = sample();
        if(blocked(zs, s2.x, s2.y)) continue;
        if(blocked(zs, s2.x - dx * len * 0.5, s2.y - dy * len * 0.5)) continue;
        if(blocked(zs, s2.x - dx * len, s2.y - dy * len)) continue;
        head = s2; break;
      }
      if(!head) continue;
      trails.push({
        fx: head.x / W, fy: head.y / H,
        dx: dx, dy: dy, len: len, lw: lw2, a: ha, c: ci
      });
    }

    /* 星迹：由密到疏的点串 */
    dtrails = [];
    for(var t3 = 0; t3 < DTRAILS; t3++){
      var ang3 = (BASE_ANG + (r() * 12 - 6)) * Math.PI / 180;
      var ex = Math.cos(ang3), ey = Math.sin(ang3);
      var n = 4 + Math.floor(r() * 5);
      var sp = 2 + r() * 4;
      var dm = 1.6;
      var al = 0.50;
      var start = null;
      var totalLen = 0, tSp = sp;
      for(var kk = 1; kk < n; kk++){ totalLen += tSp; tSp *= 1.18; }
      for(var tr2 = 0; tr2 < 400; tr2++){
        var s3 = sample();
        if(blocked(zs, s3.x, s3.y)) continue;
        if(blocked(zs, s3.x + ex * totalLen * 0.5, s3.y + ey * totalLen * 0.5)) continue;
        if(blocked(zs, s3.x + ex * totalLen, s3.y + ey * totalLen)) continue;
        start = s3; break;
      }
      if(!start) continue;
      var pts = [], cx = start.x, cy = start.y, step = sp, dia = dm, alp = al;
      for(var k2 = 0; k2 < n; k2++){
        pts.push({ fx: cx / W, fy: cy / H, d: dia, a: alp });
        cx += ex * step; cy += ey * step;
        step *= 1.18; dia *= 0.86; alp *= 0.78;
      }
      dtrails.push({ pts: pts, c: Math.floor(r() * PAL_DARK.t.length) });
    }

    /* 与法盘最近距离统计（盘体外缘到金色元素的净间距） */
    var minGap = 9999;
    for(var m = 0; m < zs.length; m++){
      var z = zs[m];
      if(z.t !== 'c') continue;
      for(var ii = 0; ii < items.length; ii++){
        var dd = Math.hypot(items[ii].fx * W - z.x, items[ii].fy * H - z.y) - z.rr;
        if(dd < minGap) minGap = dd;
      }
      for(var jj = 0; jj < trails.length; jj++){
        var dd2 = Math.hypot(trails[jj].fx * W - z.x, trails[jj].fy * H - z.y) - z.rr;
        if(dd2 < minGap) minGap = dd2;
      }
    }
    stat.dots = items.filter(function(o){ return o.kind === 0; }).length;
    stat.crosses = items.filter(function(o){ return o.kind === 1; }).length;
    stat.trails = trails.length;
    stat.dtrails = dtrails.length;
    stat.minGap = Math.round(minGap * 10) / 10;
    window.__goldStats = stat;
    built = true;
  }

  /* ---------- 绘制 ---------- */
  function setup(el, W, H, dpr){
    el.width = Math.max(1, Math.round(W * dpr));
    el.height = Math.max(1, Math.round(H * dpr));
    var ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    return ctx;
  }
  function dot(ctx, x, y, rad, col, a){
    var g = ctx.createRadialGradient(x, y, 0, x, y, rad * 2.8);
    g.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')');
    g.addColorStop(0.38, 'rgba(' + col + ',' + (a * 0.42).toFixed(3) + ')');
    g.addColorStop(0.72, 'rgba(' + col + ',' + (a * 0.10).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, rad * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }
  function cross(ctx, x, y, arm, lw, col, a, rot){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for(var i = 0; i < 4; i++){
      var vx = dirs[i][0], vy = dirs[i][1];
      var lg = ctx.createLinearGradient(0, 0, vx * arm, vy * arm);
      lg.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')');
      lg.addColorStop(0.62, 'rgba(' + col + ',' + (a * 0.42).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.strokeStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vx * arm, vy * arm);
      ctx.stroke();
    }
    ctx.restore();
    var g2 = ctx.createRadialGradient(x, y, 0, x, y, 2.4);
    g2.addColorStop(0, 'rgba(' + col + ',' + Math.min(1, a + 0.2).toFixed(3) + ')');
    g2.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(){
    var box = ap.getBoundingClientRect();
    /* 首页不可见（display:none）时宽高为 0：若此时重设画布，会被压成 1x1 并在返回首页时
       被 CSS 拉伸铺满整屏（金色点被放大成整片米黄），这是「返回主页先闪一下」的根因 */
    if(box.width < 2 || box.height < 2) return;
    var W = Math.round(box.width);
    var H = Math.round(box.height);
    if(!built) build(W, H);

    var pal = isLight() ? PAL_LIGHT : PAL_DARK;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var i, ctxs = [];
    for(i = 0; i < GROUP; i++) ctxs.push(setup(starLayers[i], W, H, dpr));

    for(i = 0; i < items.length; i++){
      var it = items[i];
      var x = it.fx * W, y = it.fy * H;
      if(x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      var ctx = ctxs[it.g];
      var col = pal.s[it.c];
      if(it.kind === 0) dot(ctx, x, y, it.rad, col, it.a);
      else cross(ctx, x, y, it.arm, it.lw, col, it.a, it.rot);
    }

    var tc = setup(trailCv, W, H, dpr);
    tc.lineCap = 'round';
    for(i = 0; i < trails.length; i++){
      var tr = trails[i];
      var hx = tr.fx * W, hy = tr.fy * H;
      var tx = hx - tr.dx * tr.len, ty = hy - tr.dy * tr.len;
      var colr = pal.t[tr.c];
      var lg2 = tc.createLinearGradient(hx, hy, tx, ty);
      lg2.addColorStop(0, 'rgba(' + colr + ',' + tr.a.toFixed(3) + ')');
      lg2.addColorStop(0.22, 'rgba(' + colr + ',' + (tr.a * 0.62).toFixed(3) + ')');
      lg2.addColorStop(0.62, 'rgba(' + colr + ',' + (tr.a * 0.18).toFixed(3) + ')');
      lg2.addColorStop(1, 'rgba(' + colr + ',0)');
      tc.strokeStyle = lg2;
      tc.lineWidth = tr.lw;
      tc.beginPath();
      tc.moveTo(hx, hy);
      tc.lineTo(tx, ty);
      tc.stroke();
    }
    for(i = 0; i < dtrails.length; i++){
      var dt = dtrails[i];
      var col2 = pal.t[dt.c];
      for(var k = 0; k < dt.pts.length; k++){
        var pp = dt.pts[k];
        var px = pp.fx * W, py = pp.fy * H;
        tc.fillStyle = 'rgba(' + col2 + ',' + pp.a.toFixed(3) + ')';
        tc.beginPath();
        tc.arc(px, py, pp.d / 2, 0, Math.PI * 2);
        tc.fill();
      }
    }
    var lite = isLight();
    ap.classList.toggle('is-gold-light', lite);
    ap.setAttribute('data-gold-ink', lite ? '26,26,30' : '255,255,255');
  }

  /* ---------- 低频重绘：resize / 主题切换（不重排，仅按比例重画） ---------- */
  var tid = null;
  function later(){
    if(tid) clearTimeout(tid);
    tid = setTimeout(function(){ tid = null; draw(); }, 150);
  }
  draw();
  window.addEventListener('resize', later);
  window.addEventListener('orientationchange', later);
  window.addEventListener('load', function(){ draw(); setTimeout(draw, 450); });
  setTimeout(draw, 800);
  if(window.ResizeObserver){ try{ new ResizeObserver(function(){ later(); }).observe(ap); }catch(e){} }
  if(window.MutationObserver){
    try{ new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme-mode', 'class', 'style'] }); }catch(e){}
    /* 监听 data-page：切回首页时立即按正确尺寸重绘（隐藏期间 draw 已被保护跳过，不会再压扁画布） */
    if(phone){ try{ new MutationObserver(later).observe(phone, { attributes: true, attributeFilter: ['data-page', 'class', 'style'] }); }catch(e){} }
  }
})();
