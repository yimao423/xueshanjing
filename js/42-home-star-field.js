/* 雪山晶 · 42-home-star-field ｜ 源：雪山晶.html L25958-L26325 ｜ JS 模块 */
(function(){
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  var phone = document.querySelector('.phone[data-page="home"]') || document.querySelector('.phone');
  var deco = ap.querySelector('.space-deco') || ap;

  var COUNT = 6;              /* 星球数量（vX：新增第 6 枚「探索」入口） */
  var GROUP = 3;              /* 与 v105 一致的三组错峰动画 */
  var MX = 18, MT = 22, MB = 26;   /* 安全边距：左右 18 / 上 22 / 下 26，避免贴边裁切 */
  var DIAL_GAP = 6, INF = 12;      /* 与 v105 一致：∞ 环轨迹两侧 12px 为排除带 */
  var SELF_GAP = 16;               /* 星球彼此最小净距 */
  var SIZE_MIN = 44, SIZE_MAX = 126;  /* 直径随机区间（40~130 内的可落位子区间） */

  function inkColor(){
    var host = phone || document.body;
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

  var nodes = [];
  function ensureNodes(){
    nodes = [];
    for(var i = 0; i < COUNT; i++){
      var n = deco.querySelector('.planet-node[data-planet="' + i + '"]');
      if(!n){
        n = document.createElement('div');
        n.className = 'planet-node';
        n.setAttribute('data-planet', String(i));
        n.setAttribute('aria-hidden', 'true');
        deco.appendChild(n);   /* 追加在背景星点层之后 → 绘制层级高于背景星点 */
      }
      n.style.display = '';
      var layers = [];
      for(var g = 0; g < GROUP; g++){
        var c = n.querySelector('canvas.planet-star-layer.s-g' + (g + 1));
        if(!c){
          c = document.createElement('canvas');
          c.className = 'planet-star-layer star-layer s-g' + (g + 1);
          c.setAttribute('aria-hidden', 'true');
          n.appendChild(c);
        }
        layers.push(c);
      }
      nodes.push({ node: n, layers: layers });
    }
  }

  /* ---------- 布局：拒绝采样 + 网格兜底 + 多轮缩尺重试 ---------- */
  var SHRINK = [1, 1, 0.94, 0.88, 0.82, 0.76, 0.70, 0.66, 0.62, 0.58];   /* 挤不下时逐轮等比缩小星球直径 */
  var VIS_F = 1.20;      /* 视觉外扩系数：散点最远 1.16R，留 1.20R 作为占位半径 */

  function tryLayout(w, h, seed0, shrink){
    var seed = seed0;
    function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

    var box = ap.getBoundingClientRect();
    var zones = [], dEls = ap.querySelectorAll('.time-dial');
    for(var i = 0; i < dEls.length; i++){
      var rc = dEls[i].getBoundingClientRect();
      zones.push({ x: rc.left - box.left + rc.width / 2, y: rc.top - box.top + rc.height / 2, size: dialSize(dEls[i]) });
    }
    var bgStars = (ap.__starBgStars && ap.__starBgStars.length) ? ap.__starBgStars : [];

    var planets = [];
    function free(x, y, re){
      if(x - re < MX || x + re > w - MX) return false;
      if(y - re < MT || y + re > h - MB) return false;
      for(var k = 0; k < zones.length; k++){
        var z = zones[k], d = Math.hypot(x - z.x, y - z.y);
        if(d < z.size * 0.62 + re + 8) return false;                       /* 法盘盘体 */
        if(Math.abs(d - (z.size / 2 + DIAL_GAP)) < re + INF) return false; /* ∞ 轨迹两侧 12px */
      }
      for(var p2 = 0; p2 < planets.length; p2++){
        var q = planets[p2];
        if(Math.hypot(x - q.x, y - q.y) < re + q.re + SELF_GAP) return false;
      }
      if(bgStars.length){
        var near = 0, rr = (re * 0.95) * (re * 0.95);
        for(var s = 0; s < bgStars.length; s++){
          var dx = bgStars[s].x - x, dy = bgStars[s].y - y;
          if(dx * dx + dy * dy < rr){ near++; if(near > 3) return false; }  /* 背景星点密集区 */
        }
      }
      return true;
    }

    var sizes = [];
    for(var i2 = 0; i2 < COUNT; i2++) sizes.push((SIZE_MIN + rnd() * (SIZE_MAX - SIZE_MIN)) * shrink);
    sizes.sort(function(a, b){ return b - a; });   /* 大球先占位，小球填空隙 */

    for(var i3 = 0; i3 < sizes.length; i3++){
      var size = sizes[i3], re = size / 2 * VIS_F, pick = null, t = 0;
      for(t = 0; t < 1600 && !pick; t++){
        var x = MX + re + rnd() * (w - 2 * (MX + re));
        var y = MT + re + rnd() * (h - MT - MB - 2 * re);
        if(free(x, y, re)) pick = { x: x, y: y };
      }
      if(!pick){
        for(var gy = MT + re; gy <= h - MB - re && !pick; gy += 6){
          for(var gx = MX + re; gx <= w - MX - re; gx += 6){
            if(free(gx, gy, re)){ pick = { x: gx, y: gy }; break; }
          }
        }
      }
      if(!pick) continue;      /* 极端拥挤时宁缺勿硬塞 */
      planets.push({
        x: pick.x, y: pick.y, size: size, re: re,
        ang: (rnd() * 2 - 1) * Math.PI,     /* 旋转角 -180°~180° 随机 */
        ratio: 0.86 + rnd() * 0.14,        /* 椭圆短轴比 0.86~1.00，避免整齐正圆 */
        phase: rnd() * 6.2832,             /* 疏密调制相位，让缺口位置各不相同 */
        seed: (100003 + i3 * 7919 + Math.round(size * 13)) >>> 0,
        ico: i3                            /* 图标按直径从大到小分配：0 今日絮语 / 1 月汐笺语 / 2 字卡 / 3 设置 / 4 写信 */
      });
    }
    return planets;
  }

  function buildLayout(w, h){
    var best = [];
    for(var a = 0; a < SHRINK.length; a++){
      var res = tryLayout(w, h, 20261107 + a * 1013, SHRINK[a]);
      if(res.length > best.length) best = res;
      if(res.length === COUNT) break;    /* 5 个全部落位即停 */
    }
    return best;
  }

  /* ---------- 星球中心图标数据 ----------
     前 4 个为硬编码的 SVG path（今日絮语 / 月汐笺语 / 字卡 / 设置），
     第 5 个「写信」为同一视觉语言新增（信封 + 笔，viewBox 24，纯单色实心，用 evenodd 挖出折线与笔身分界）。
     vb：viewBox 边长（24 或 32），绘制时按目标尺寸等比缩放；d：path 数组。 */
  var PLANET_ICONS = [
    /* 0 今日絮语：心电图折线 + 爱心叠加 —— 一枚完整爱心轮廓（主体），一条带尖峰的 ECG 折线横贯其内，
       两图形交叠形成图层叠加感；均只描边不填充，viewBox 24 */
    { vb: 24, thin: true, bb: { x: 3.3, y: 6.4, w: 17.4, h: 14.7 },
      d: ['M12 20.9C6.6 16.9 3.4 13.7 3.4 10.2a4.9 4.9 0 0 1 8.6-3.2 4.9 4.9 0 0 1 8.6 3.2c0 3.5-3.2 6.7-8.6 10.7z',
          'M5.2 12.4h3.7l1.6-3.3 2.4 6.9 1.9-4.8 1.5 1.2h3.5'] },
    /* 1 月汐笺语：水滴 —— 单色线描泪滴（底部圆润、顶端收尖）+ 一道内部水光弧，呼应「月汐」潮汐语义 */
    { vb: 24, bb: { x: 4.9, y: 2.6, w: 14.2, h: 19.4 },
      d: ['M12 2.6C12 2.6 19.1 10.9 19.1 15.1a7.1 7.1 0 0 1-14.2 0C4.9 10.9 12 2.6 12 2.6z',
          'M8.8 14.2a3.5 3.5 0 0 0 2.5 3.4'] },
    /* 2 字卡：✐ 铅笔 —— 直接绘制字体符号 U+2710 UPPER RIGHT PENCIL（字号 1.15×图标边长、居中、带柔光）；
       下面的 d 为该字形的备用兜底：一旦 glyphUsable() 判定字体缺字（豆腐块/空白），立即回退到这组手绘铅笔 path */
    { vb: 24, glyph: '\u2710', bb: { x: 3.3, y: 2.9, w: 17.8, h: 17.8 },
      d: ['M21.0 5.8 7.6 19.2 3.4 20.6 4.8 16.4 18.2 3.0Z',
          'M5.9 15.3 8.7 18.1'] },
    /* 3 设置：齿轮 —— 重新画的干净版：外圈半径收小、8 根等距短齿（齿距 4.7 单位，细线下不粘连）、中心一个圆孔 */
    { vb: 24, bb: { x: 3.6, y: 3.6, w: 16.8, h: 16.8 },
      d: ['M12 5.7a6.3 6.3 0 1 1 0 12.6a6.3 6.3 0 1 1 0-12.6z',
          'M12 9.4a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 1 1 0-5.2z',
          'M18.3 12H20.4', 'M16.45 16.45 17.94 17.94', 'M12 18.3V20.4', 'M7.55 16.45 6.06 17.94',
          'M5.7 12H3.6', 'M7.55 7.55 6.06 6.06', 'M12 5.7V3.6', 'M16.45 7.55 17.94 6.06'] },
    /* 4 写信：信封 —— 新增设计（矩形 + V 折线）；27px 下"信封 + 斜笔"两图形交叠必糊，故只用信封语义 */
    { vb: 24, bb: { x: 2.2, y: 5.2, w: 19.6, h: 13.6 },
      d: ['M4.4 5.2h15.2a2.2 2.2 0 0 1 2.2 2.2v9.2a2.2 2.2 0 0 1-2.2 2.2H4.4a2.2 2.2 0 0 1-2.2-2.2V7.4a2.2 2.2 0 0 1 2.2-2.2z',
          'M2.6 7.0 11.9 14.2 21.2 7.0'] },
    /* 5 探索：罗盘 —— 外圆 + 内圈指针菱形 + 中心点，呼应「星野探索」语义；线描无填充，与其余图标同一笔触体系 */
    { vb: 24, bb: { x: 2.6, y: 2.6, w: 18.8, h: 18.8 },
      d: ['M12 3.2a8.8 8.8 0 1 1 0 17.6a8.8 8.8 0 1 1 0-17.6z',
          'M15.7 8.3 13.4 13.4 8.3 15.7 10.6 10.6Z',
          'M12 11.1a.9.9 0 1 1 0 1.8a.9.9 0 1 1 0-1.8z'] }
  ];
  /* 图标 Path2D 缓存（viewBox 原始坐标，绘制时由 ctx 变换做等比缩放） */
  var PLANET_ICON_P2D = [];
  function iconP2D(def){
    var idx = PLANET_ICONS.indexOf(def);
    if(PLANET_ICON_P2D[idx]) return PLANET_ICON_P2D[idx];
    var p2 = new Path2D();
    for(var i = 0; i < def.d.length; i++){ p2.addPath(new Path2D(def.d[i])); }
    PLANET_ICON_P2D[idx] = p2;
    return p2;
  }


  /* 字体符号可用性校验（仅用于「字卡」✐）：在离屏 64×64 画布上以 48px 真实测量该字形，
     要求「有足够笔画像素」且「与缺字形 \uFFFF 的豆腐块渲染差异明显」才判定字形存在；
     结果按字符缓存，只在首帧算一次，重绘不重复测量。任一条件不满足即回退到手绘 path。 */
  var GLYPH_FONT = "'Zapf Dingbats','Apple Symbols','Segoe UI Symbol',serif";
  var __glyphOK = {};
  function glyphUsable(ch){
    if(__glyphOK.hasOwnProperty(ch)) return __glyphOK[ch];
    var ok = false;
    try{
      var cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      var g = cv.getContext('2d');
      function stamp(c){
        g.clearRect(0, 0, 64, 64);
        g.font = '48px ' + GLYPH_FONT;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#fff';
        g.fillText(c, 32, 32);
        return g.getImageData(0, 0, 64, 64).data;
      }
      var a = stamp(ch), b = stamp('\uFFFF'), inkA = 0, diff = 0;
      for(var k = 0; k < a.length; k += 4){
        if(a[k] > 24) inkA++;
        if(Math.abs(a[k] - b[k]) > 24) diff++;
      }
      var wA = g.measureText(ch).width;
      ok = inkA > 24 && diff > 24 && wA > 0.5 && wA < 96;
    }catch(e){ ok = false; }
    __glyphOK[ch] = ok;
    return ok;
  }

  /* ---------- 绘制单个星球 ---------- */
  function drawPlanet(item, p, col){
    var pad = Math.ceil(p.size * 0.13) + 8;
    var boxW = Math.round(p.size + pad * 2);
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    item.node.style.left = (p.x - boxW / 2) + 'px';
    item.node.style.top = (p.y - boxW / 2) + 'px';
    item.node.style.width = boxW + 'px';
    item.node.style.height = boxW + 'px';
    item.node.setAttribute('data-size', String(Math.round(p.size)));
    /* v157：写入图标身份（PLANET_ICONS 下标），供点击入口按身份映射，不依赖节点序号 */
    item.node.setAttribute('data-ico', String(p.ico));

    var cx = boxW / 2, cy = boxW / 2, R = p.size / 2;
    var seed = p.seed;
    function rnd(){ seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    var ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    function pt(theta, rad){
      var ex = Math.cos(theta) * rad, ey = Math.sin(theta) * rad * p.ratio;
      return { x: cx + ex * ca - ey * sa, y: cy + ex * sa + ey * ca };
    }

    var dots = [];
    /* 外圈：沿椭圆密集排布，按 sin(2θ+phase) 调制密度 → 边缘明显疏密不匀 */
    var n = Math.max(16, Math.min(90, Math.round(2 * Math.PI * R / 3.1)));
    for(var k = 0; k < n; k++){
      var th = (k / n) * 6.2832 + (rnd() - 0.5) * 0.06;
      var dens = 0.55 + 0.45 * Math.sin(th * 2 + p.phase);
      if(rnd() > 0.35 + 0.65 * dens) continue;                /* 疏区丢点，形成手绘缺口 */
      var q = pt(th, R * (1 + (rnd() - 0.5) * 0.075));
      dots.push({ x: q.x, y: q.y, r: 0.52 + rnd() * 0.80, a: (0.30 + 0.62 * rnd()) * (0.68 + 0.32 * dens) });
    }
    /* 内圈：更疏更淡，保持中间空心 */
    var n2 = Math.max(6, Math.round(n * 0.42));
    var base2 = rnd() * 6.2832;
    for(var k2 = 0; k2 < n2; k2++){
      var th2 = base2 + (k2 / n2) * 6.2832 + (rnd() - 0.5) * 0.16;
      if(rnd() < 0.34) continue;
      var q2 = pt(th2, R * (0.68 + rnd() * 0.10));
      dots.push({ x: q2.x, y: q2.y, r: 0.42 + rnd() * 0.52, a: 0.16 + rnd() * 0.34 });
    }
    /* 游离散点：环外 1.06~1.26R，少量 */
    var n3 = 3 + Math.floor(rnd() * 4);
    for(var k3 = 0; k3 < n3; k3++){
      var q3 = pt(rnd() * 6.2832, R * (1.06 + rnd() * 0.10));
      dots.push({ x: q3.x, y: q3.y, r: 0.40 + rnd() * 0.55, a: 0.15 + rnd() * 0.40 });
    }
    /* 略大微光点：2~3 颗落在环上 */
    var glows = [], ng = 2 + (rnd() < 0.5 ? 1 : 0);
    for(var k4 = 0; k4 < ng; k4++){
      var q4 = pt(rnd() * 6.2832, R * (0.985 + rnd() * 0.03));
      glows.push({ x: q4.x, y: q4.y, r: 1.6 + rnd() * 1.0, a: 0.62 + rnd() * 0.34 });
    }

    for(var g = 0; g < item.layers.length; g++){
      var cvs = item.layers[g];
      cvs.width = Math.max(1, Math.round(boxW * dpr));
      cvs.height = Math.max(1, Math.round(boxW * dpr));
      var ctx = cvs.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, boxW, boxW);
      /* 中心纯图标：无任何圆形/圆角矩形底板、无环绕线条，图标与星球同心；
         四枚线描图标 lineWidth = 图标边长 × 0.056（「今日絮语」单独 × 0.047，更细），round 端点保留手绘柔和感；
         「字卡」直接绘制字体符号 ✐（U+2710），不做线描；
         三张 canvas 各画一份、alpha 压低后叠加，复用 s-g1/2/3 的 opacity 动画 → 闪烁与星点同节奏，无额外逐帧 */
      var idef = PLANET_ICONS[p.ico % PLANET_ICONS.length];
      var bb = idef.bb;                        /* 图标内容在各自 viewBox 里的实际外接框，用于等比缩放 + 精确居中 */
      var isz = p.size * 0.38;                 /* 图标外接框最大边长 ≈ 星球直径的 0.38（规格 0.37~0.40，本轮整体收小） */
      var isc = isz / Math.max(bb.w, bb.h);    /* viewBox 24 / 32 通用，等比缩放不拉伸 */
      var onLight = (col === '172,172,172');      /* 浅底：浅灰图标 + 淡灰柔光 */
      var ink = onLight ? '#ACACAC' : '#FFFFFF';
      ctx.globalAlpha = onLight ? 0.86 : 0.90;   /* 线更细后略提不透明度补偿存在感 */
      ctx.shadowColor = onLight ? 'rgba(172,172,172,0.24)' : 'rgba(255,255,255,0.34)';
      ctx.shadowBlur = Math.min(4.0, Math.max(2.6, isz * 0.10));  /* 柔光 2.6~4.0px */
      /* 字卡：直接绘制字体符号 ✐（U+2710）——先用真实字形可用性校验，缺字则回退到手绘铅笔 path，
         绝不允许出现空白或豆腐块方框 */
      if(idef.glyph && glyphUsable(idef.glyph)){
        ctx.save();
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = Math.round(isz * 1.15) + 'px ' + GLYPH_FONT;   /* 字号 = 图标外接框边长 × 1.15 */
        ctx.fillText(idef.glyph, cx, cy);
        ctx.restore();
      }else{
        ctx.save();
        ctx.translate(cx - (bb.x + bb.w / 2) * isc, cy - (bb.y + bb.h / 2) * isc);
        ctx.scale(isc, isc);
        /* 线宽：默认 = 图标边长 × 0.056 且不低于 1.3px；「今日絮语」单独再细到 × 0.047（约统一线宽的 0.84 倍），
           下限 1.1px 保证仍清晰连贯，其余四枚维持原值 */
        var iconLW = (idef.thin ? Math.max(isz * 0.047, 1.1) : Math.max(isz * 0.056, 1.3)) / isc;
        ctx.fillStyle = 'transparent';           /* 一律不填充 */
        ctx.strokeStyle = ink;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.lineWidth = iconLW;
        ctx.stroke(iconP2D(idef));
        ctx.restore();
      }
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      for(var s = g; s < dots.length; s += GROUP){
        var d1 = dots[s];
        ctx.fillStyle = 'rgba(' + col + ',' + Math.min(1, d1.a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d1.x, d1.y, d1.r, 0, 6.2832); ctx.fill();
      }
      for(var s2 = g; s2 < glows.length; s2 += GROUP){
        var d2 = glows[s2];
        ctx.shadowColor = 'rgba(' + col + ',0.80)';
        ctx.shadowBlur = 6.5;
        ctx.fillStyle = 'rgba(' + col + ',' + Math.min(1, d2.a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d2.x, d2.y, d2.r, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    }
    return dots.length + glows.length;
  }

  /* ---------- 统一重绘 ---------- */
  var timer = null;
  function draw(){
    var box = ap.getBoundingClientRect();
    /* 首页不可见时不做布局，避免按 0 尺寸重算星球位置 / 画布尺寸导致返回时错位闪动 */
    if(box.width < 2 || box.height < 2) return;
    var w = Math.round(box.width), h = Math.round(box.height);
    var col = inkColor();
    ensureNodes();
    var planets = buildLayout(w, h);
    for(var i = 0; i < planets.length; i++) drawPlanet(nodes[i], planets[i], col);
    for(var j = planets.length; j < nodes.length; j++) nodes[j].node.style.display = 'none';
    ap.setAttribute('data-planets', String(planets.length));
  }
  function relayout(delay){
    if(timer) clearTimeout(timer);
    timer = setTimeout(draw, delay || 170);
  }

  window.addEventListener('resize', function(){ relayout(170); }, { passive: true });
  window.addEventListener('orientationchange', function(){ relayout(300); });
  if(window.ResizeObserver){ try{ new ResizeObserver(function(){ relayout(180); }).observe(ap); }catch(e){} }
  if(window.MutationObserver){
    try{
      new MutationObserver(function(){ relayout(90); }).observe(document.documentElement,
        { attributes: true, attributeFilter: ['data-theme-mode', 'class', 'style'] });
    }catch(e){}
  }
  if(window.MutationObserver && phone){
    try{
      new MutationObserver(function(){ relayout(170); }).observe(phone,
        { attributes: true, attributeFilter: ['data-page', 'class', 'style'] });
    }catch(e){}
  }

  draw();
  requestAnimationFrame(draw);
  window.addEventListener('load', function(){ draw(); setTimeout(draw, 450); });
  setTimeout(draw, 750);
})();
