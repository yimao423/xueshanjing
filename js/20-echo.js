/* ============================================================
   昨日回响（echo）v2  —— 首页朝暮絮语二级页（全屏）
   - 数据：自动收录「昨日」（昨天自然日）聊天消息，统计高频语句/词
   - 图案：8 套 Word Art 模板（蒲公英/玫瑰/雏菊/铃兰/蝴蝶/猫/心形/星月），
           用高频文字沿结构化点位拼成图案轮廓（SVG 一次性渲染）；
           底部切换条可自由切换模板（切换复用当日留言/高频词，不重新随机），
           切换结果持久化到当天记录
   - 上传图片：canvas 降采样(最长边512) + 亮度/边缘采样生成关键点集，
           按高频词在采样点放置文字（暗处密集/深色、亮处稀疏/浅色），
           一次性渲染生成"照片画像"，可作为当天图案与其他模板互相切换
   - 发布：对方角色每日随机选一套模板 + 随机留言，按日期键去重
           （同日重复打开不重新生成，跨日自动重新生成）
   - 错配防御：缓存命中时以 patternId 反查模板并校验名称一致，
           不一致即丢弃重建，保证徽标名称与实际图案严格同源
   - 空态：昨日无聊天记录时展示友好提示（仍可上传图片生成画像）
   - 发热：全流程一次性渲染，无 setInterval / 无常驻动画；
           仅 0.5s 一次性淡入（由 css/14-ve-engine.css 的 xj-ve-hidden 规则暂停）
   ============================================================ */
(function () {
  if (window.__echoLoaded) { return; }
  window.__echoLoaded = true;

  var ECHO_KEY = "snowcrystal.echo.v1";
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  var VIEW_W = 240, VIEW_H = 260;

  /* ---------- 基础工具 ---------- */
  function lsGet(k) {
    try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 本机写满时静默 */ }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function now() {
    return (window.SnowCrystal && SnowCrystal.Chat && SnowCrystal.Chat.now)
      ? SnowCrystal.Chat.now() : Date.now();
  }
  function dateStr(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function dateOf(ts) {
    var d = new Date(ts || Date.now());
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function loadPartners() {
    var list = lsGet(PARTNERS_KEY);
    return Array.isArray(list) ? list : [];
  }
  function loadChat() {
    if (window.SnowCrystal && SnowCrystal.Chat && typeof SnowCrystal.Chat.loadChat === "function") {
      try { return SnowCrystal.Chat.loadChat(); } catch (e) { /* 继续走兜底 */ }
    }
    return lsGet("snowcrystal.chat.v1") || { chats: [], messages: {} };
  }

  /* 消息取可收录文本：图片/语音/表情包无文字内容，不参与统计 */
  function msgText(msg) {
    if (!msg) { return ""; }
    if (msg.msgType === "image" || msg.msgType === "voice" || msg.msgType === "sticker" || msg.msgType === "redpack") { return ""; }
    if (msg.msgType === "qa") { return String(msg.q || ""); }
    if (msg.msgType === "forward") { return String(msg.text || ""); }
    return String(msg.text || "");
  }

  /* ---------- 高频语句/词统计 ----------
     * 输入：昨日全部消息的 text 数组
     * 输出：words —— 排序后的图案用字数组（优先频次≥2 的片段，不足时用唯一片段补齐） */
  var STOP_CHARS = "的了么呢啊吧呀哦嗯嘛哈嘻唉喂诶咦哎啦唷呗乎耶哈喽哈啰好嗯哦";
  var STOP_WORDS = ["我", "你", "他", "她", "它", "我们", "你们", "他们", "她们", "这个", "那个", "什么",
    "怎么", "为什么", "就是", "还是", "但是", "因为", "所以", "如果", "然后", "可以", "不能", "没有",
    "不是", "一个", "一下", "真的", "觉得", "知道", "今天", "昨天", "明天", "早上", "晚上", "现在",
    "时候", "自己", "这么", "那么", "这样", "那样", "已经", "一直", "一起", "谢谢", "哈哈", "呜呜",
    "哈哈哈", "嗯嗯", "好吧", "没事", "没关系", "在吗", "在呢", "早安", "晚安"];
  function isStop(w) {
    if (STOP_WORDS.indexOf(w) !== -1) { return true; }
    if (w.length === 1 && STOP_CHARS.indexOf(w) !== -1) { return true; }
    return false;
  }
  function normText(s) {
    return String(s || "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")   /* 去 emoji */
      .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "");        /* 只留中文/字母/数字 */
  }
  function buildWords(texts) {
    var freq = {};
    function add(w) {
      if (!w || !w.length) { return; }
      if (w.length > 8) { return; }
      if (isStop(w)) { return; }
      freq[w] = (freq[w] || 0) + 1;
    }
    var i, j, t, n;
    for (i = 0; i < texts.length; i++) {
      t = normText(texts[i]);
      if (!t) { continue; }
      if (t.length <= 8) { add(t); }                      /* 整句短句 */
      /* 2-6 字滑窗 */
      for (n = 2; n <= 6; n++) {
        for (j = 0; j + n <= t.length; j++) { add(t.slice(j, j + n)); }
      }
    }
    var arr = [];
    for (var k in freq) {
      if (Object.prototype.hasOwnProperty.call(freq, k)) { arr.push({ w: k, n: freq[k] }); }
    }
    /* 排序：频次降序 → 长度降序（长片段更有语义）→ 字典序稳定 */
    arr.sort(function (a, b) {
      if (a.n !== b.n) { return b.n - a.n; }
      if (a.w.length !== b.w.length) { return b.w.length - a.w.length; }
      return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
    });
    var words = [], used = {};
    /* 先取频次≥2 */
    for (i = 0; i < arr.length && words.length < 40; i++) {
      if (arr[i].n < 2) { break; }
      if (used[arr[i].w]) { continue; }
      used[arr[i].w] = 1;
      words.push(arr[i].w);
    }
    /* 再取唯一片段补齐（排行靠前） */
    for (i = 0; i < arr.length && words.length < 40; i++) {
      if (used[arr[i].w]) { continue; }
      used[arr[i].w] = 1;
      words.push(arr[i].w);
    }
    /* 保底：全部被停用词过滤时，退回原始字符 */
    if (!words.length) {
      var seen = {};
      for (i = 0; i < texts.length; i++) {
        t = normText(texts[i]);
        for (j = 0; j < t.length; j++) {
          var ch = t[j];
          if (seen[ch] || isStop(ch)) { continue; }
          seen[ch] = 1;
          words.push(ch);
          if (words.length >= 40) { break; }
        }
        if (words.length >= 40) { break; }
      }
    }
    return words;
  }

  /* 取第 idx 个图案字：按序取，越界循环；优先返回不超过 2 字 */
  function pickWord(words, idx) {
    if (!words || !words.length) { return "絮"; }
    var w = words[idx % words.length];
    if (w.length > 3) { w = w.slice(0, 2); }
    return w;
  }

  /* ---------- 语句提取（词云模式：不拆单字） ----------
     * 输入：昨日消息 items = [{ text, isSelf }]
     * 输出：phrases = [{ text, freq, role }]（freq 降序，取 top maxN）
     * 规则：按标点/换行把消息切分为完整语句；优先对方角色；
     *       先取频次≥2 的对方语句，不足补频次=1 的对方语句，
     *       再补我方语句；仍不足用整条消息原文（保持不拆单字） */
  function splitSentences(s) {
    return String(s || "")
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")   /* 去 emoji */
      .split(/[。！？!?…；;，,\n\r]+/)
      .map(function (x) { return x.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "").trim(); })
      .filter(function (x) { return x.length >= 2; });
  }
  function extractPhrases(items, maxN) {
    maxN = maxN || 15;
    if (!Array.isArray(items)) { return []; }
    var freq = {}, roleOf = {}, i, j, it, seg;
    var msgs = [];
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (!it || !it.text) { continue; }
      var segs = splitSentences(it.text);
      if (!segs.length) { continue; }
      for (j = 0; j < segs.length; j++) {
        seg = segs[j];
        if (seg.length > 20) { seg = seg.slice(0, 20); }  /* 过长截断防溢出 */
        if (!freq[seg]) { freq[seg] = 0; roleOf[seg] = it.isSelf ? "self" : "partner"; }
        freq[seg]++;
        msgs.push({ text: seg, isSelf: it.isSelf });
      }
    }
    var arr = [];
    for (var k in freq) {
      if (Object.prototype.hasOwnProperty.call(freq, k)) {
        arr.push({ text: k, freq: freq[k], role: roleOf[k] });
      }
    }
    /* 频次降序 → 长度降序（长句更完整）→ 字典序稳定 */
    arr.sort(function (a, b) {
      if (a.freq !== b.freq) { return b.freq - a.freq; }
      if (a.text.length !== b.text.length) { return b.text.length - a.text.length; }
      return a.text < b.text ? -1 : (a.text > b.text ? 1 : 0);
    });
    var out = [], used = {};
    function pushIf(p) {
      if (!p || used[p.text] || out.length >= maxN) { return; }
      used[p.text] = 1;
      out.push(p);
    }
    for (i = 0; i < arr.length; i++) { if (arr[i].role === "partner" && arr[i].freq >= 2) { pushIf(arr[i]); } }
    for (i = 0; i < arr.length; i++) { if (arr[i].role === "partner") { pushIf(arr[i]); } }
    for (i = 0; i < arr.length; i++) { if (arr[i].role === "self") { pushIf(arr[i]); } }
    /* 兜底：整条消息原文（不拆单字） */
    if (!out.length) {
      for (i = 0; i < msgs.length; i++) {
        pushIf({ text: msgs[i].text.slice(0, 20), freq: 1, role: msgs[i].isSelf ? "self" : "partner" });
      }
    }
    return out;
  }

  /* 语句不足时兜底：用已有语句轮转补齐到 minN（保持不拆单字） */
  function fillPhrases(phrases, minN) {
    minN = minN || 8;
    if (!phrases.length) { return phrases; }
    var out = phrases.slice(0);
    var pool = phrases.slice(0).sort(function (a, b) { return b.text.length - a.text.length; });
    var i = 0;
    while (out.length < minN) {
      var p = pool[i % pool.length];
      out.push({ text: p.text, freq: Math.max(1, p.freq - (out.length - phrases.length)), role: p.role });
      i++;
      if (i > minN * 3) { break; }
    }
    return out;
  }

  /* ---------- 词云布局（完整语句填满形状内部） ----------
     * cloud: { circles: [[cx,cy,r],...], test: fn(x,y)->bool 可选 }
     *        circles 为形状内部可放置区域（圆近似）；test 用于挖洞（如月牙内凹）
     * decor: 形状装饰 path（来自模板 build([])）
     * 字号分级：rank 1-2→20px / 3-5→16px / 6-9→13px / 10+→10px，
     *           按形状面积与语句总量整体缩放；旋转 ±15°
     * 放置：形状内随机候选 + AABB 碰撞检测（含 pad），一次渲染无定时器 */
  function textEstW(text, fs) {
    var w = 0, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charCodeAt(i);
      if (ch >= 0x4e00 && ch <= 0x9fff) { w += fs; }
      else if ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || (ch >= 48 && ch <= 57)) { w += fs * 0.55; }
      else { w += fs * 0.8; }
    }
    return w;
  }
  function cloudLayout(phrases, cloud, decor) {
    var texts = [], placed = [], i;
    if (!Array.isArray(phrases) || !phrases.length) { return { texts: [], decor: decor || [] }; }
    if (!cloud || !cloud.circles || !cloud.circles.length) { return { texts: [], decor: decor || [] }; }
    var circles = cloud.circles;
    var areaSum = 0, totalText = 0;
    for (i = 0; i < circles.length; i++) { areaSum += Math.PI * circles[i][2] * circles[i][2]; }
    for (i = 0; i < phrases.length; i++) {
      var fs0 = i < 2 ? 22 : (i < 5 ? 17 : (i < 9 ? 14 : 11));
      totalText += textEstW(phrases[i].text, fs0) * fs0 * 1.2;
    }
    var scale = Math.min(1, (areaSum * 0.9) / (totalText || 1));
    /* 字号再约束：保证最宽语句能放进最大圆（词云不溢出形状轮廓） */
    var maxW = 0, rMax = 0;
    for (i = 0; i < circles.length; i++) { rMax = Math.max(rMax, circles[i][2]); }
    for (i = 0; i < phrases.length; i++) {
      var fs0w = i < 2 ? 22 : (i < 5 ? 17 : (i < 9 ? 14 : 11));
      maxW = Math.max(maxW, textEstW(phrases[i].text, fs0w));
    }
    var scaleFit = maxW ? (rMax * 1.35) / maxW : 1;
    scale = Math.min(scale, scaleFit);
    /* 预采样形状内候选点（均匀网格，随机打乱），让语句散布全形状而非堆中心 */
    var cand = [], j;
    for (i = 0; i < circles.length; i++) {
      var c = circles[i], step = Math.max(9, Math.min(14, c[2] / 5));
      for (var gy = c[1] - c[2]; gy <= c[1] + c[2]; gy += step) {
        for (var gx = c[0] - c[2]; gx <= c[0] + c[2]; gx += step) {
          var dd = Math.sqrt((gx - c[0]) * (gx - c[0]) + (gy - c[1]) * (gy - c[1]));
          if (dd <= c[2] && (!cloud.test || cloud.test(gx, gy))) { cand.push({ x: gx, y: gy }); }
        }
      }
    }
    for (i = cand.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      var tt = cand[i]; cand[i] = cand[j]; cand[j] = tt;
    }
    function collides(box) {
      for (j = 0; j < placed.length; j++) {
        var b = placed[j];
        if (box.x < b.x2 && box.x2 > b.x && box.y < b.y2 && box.y2 > b.y) { return true; }
      }
      return false;
    }
    /* box 四角都须落在形状内（某圆内且通过 test），防止词云溢出轮廓 */
    function boxInShape(box) {
      var corners = [[box.x, box.y], [box.x2, box.y], [box.x, box.y2], [box.x2, box.y2]];
      for (var ci = 0; ci < 4; ci++) {
        var cx = corners[ci][0], cy = corners[ci][1], inside = false;
        for (var k = 0; k < circles.length && !inside; k++) {
          var cc = circles[k];
          var d2 = Math.sqrt((cx - cc[0]) * (cx - cc[0]) + (cy - cc[1]) * (cy - cc[1]));
          if (d2 <= cc[2] + 1 && (!cloud.test || cloud.test(cx, cy))) { inside = true; }
        }
        if (!inside) { return false; }
      }
      return true;
    }
    /* 多轮放置：语句可重复出现（词云式），轮次越靠后字号档越低，高频先放所以高频大字号 */
    var maxTexts = Math.min(56, Math.max(14, Math.round(areaSum / 520)));
    var round;
    for (round = 0; round < 5 && texts.length < maxTexts; round++) {
      var placedThisRound = 0;
      for (i = 0; i < phrases.length && texts.length < maxTexts; i++) {
        var p = phrases[i];
        var fsBase = (i < 2 ? 22 : (i < 5 ? 17 : (i < 9 ? 14 : 11))) * scale;
        var levels = [fsBase, fsBase * 0.8, fsBase * 0.64, fsBase * 0.5, fsBase * 0.4];
        var placedOk = null, li;
        for (li = Math.min(3, round); li < levels.length && !placedOk; li++) {
          var fs = Math.max(5.5, Math.round(levels[li] * 10) / 10);
          var rot = Math.round((Math.random() * 30 - 15) * 10) / 10;
          var w = textEstW(p.text, fs);
          var h = fs * 1.25;
          var rad = rot * Math.PI / 180;
          var sinA = Math.abs(Math.sin(rad)), cosA = Math.abs(Math.cos(rad));
          var hw = (w * cosA + h * sinA) / 2 + fs * 0.35;
          var hh = (w * sinA + h * cosA) / 2 + fs * 0.35;
          var found = null, tried = 0, maxTry = Math.min(120, Math.max(24, cand.length));
          while (tried < maxTry && !found) {
            var base = cand[Math.floor(Math.random() * cand.length)]; tried++;
            var box = { x: base.x - hw, y: base.y - hh, x2: base.x + hw, y2: base.y + hh };
            if (boxInShape(box) && !collides(box)
                && base.x - hw >= -8 && base.x + hw <= VIEW_W + 8 && base.y - hh >= -6 && base.y + hh <= VIEW_H + 6) {
              found = { x: base.x, y: base.y, box: box };
            }
          }
          if (found) {
            placed.push(found.box);
            /* 剔除已被占用的候选点，后续语句采样命中率更高 */
            cand = cand.filter(function (pt) {
              return !(pt.x > found.box.x - 1 && pt.x < found.box.x2 + 1 && pt.y > found.box.y - 1 && pt.y < found.box.y2 + 1);
            });
            placedOk = { x: found.x, y: found.y, fs: fs, rot: rot, op: 0.92, anchor: "middle", text: p.text };
          }
        }
        if (placedOk) { texts.push(placedOk); placedThisRound++; }
      }
      if (!placedThisRound) { break; }
    }
    return { texts: texts, decor: decor || [] };
  }

  /* ---------- 图案模板（结构化点位生成） ----------
     * 每套模板返回 { texts: [{x,y,fs,rot,op,anchor,text}], decor: [svgPath...], cat }
     * viewBox 240x260，图案主体居中上部，底部预留留言空间 */
  function P(px, py) { return { x: px, y: py }; }
  function ringPoints(cx, cy, r, count, startAngle) {
    var pts = [], i, a;
    for (i = 0; i < count; i++) {
      a = (startAngle || 0) + Math.PI * 2 * i / count;
      pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return pts;
  }
  function heartP(t) { /* 心形参数方程，返回 {x,y}，scale 4.3 中心 (120,132) */
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return P(120 + x * 4.3, 132 - y * 4.3);
  }

  var CAT_F = "flower"; var CAT_D = "dandelion"; var CAT_A = "animal"; var CAT_S = "symbol"; var CAT_P = "plant";

  var PATTERNS = [
    /* 1. 蒲公英：中心密集字 + 外环放射渐淡（参考图：中心字群、外围单字飘散） */
    {
      id: "dandelion", name: "蒲公英", cat: CAT_D, icon: '<circle cx="12" cy="12" r="1.8"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6M5.7 5.7l1.9 1.9M16.4 16.4l1.9 1.9M18.3 5.7l-1.9 1.9M7.6 16.4l-1.9 1.9"/><circle cx="4.6" cy="4.6" r="0.7"/><circle cx="19.4" cy="19.4" r="0.7"/><circle cx="4.6" cy="19.4" r="0.7"/><circle cx="19.4" cy="4.6" r="0.7"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i, cx = 120, cy = 108;
        var grid = [[-20, -20], [0, -20], [20, -20], [-20, 0], [0, 0], [20, 0], [-20, 20], [0, 20], [20, 20]];
        for (i = 0; i < grid.length; i++) {
          texts.push({ x: cx + grid[i][0], y: cy + grid[i][1], fs: 12, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        }
        var rings = [[46, 10, 1], [78, 12, 0.6], [108, 14, 0.32]];
        for (i = 0; i < rings.length; i++) {
          var r = rings[i][0], cnt = rings[i][1], op = rings[i][2];
          var pts = ringPoints(cx, cy, r, cnt, 0.2);
          for (var j = 0; j < pts.length; j++) {
            var pt = pts[j];
            decor.push("M" + cx.toFixed(1) + " " + cy.toFixed(1) + "L" + pt.x.toFixed(1) + " " + pt.y.toFixed(1));
            texts.push({ x: pt.x, y: pt.y, fs: r > 90 ? 8 : (r > 60 ? 9 : 11), rot: 0, op: op, anchor: "middle", text: pickWord(words, idx++) });
          }
        }
        /* 底部一点茎 */
        decor.push("M120 140C118 168 118 190 121 214");
        texts.push({ x: 120, y: 228, fs: 7, rot: 0, op: 0.5, anchor: "middle", text: pickWord(words, idx++) });
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[120, 108, 80]] }   /* 词云区域：主绒球+飘散圈 */
    },
    /* 2. 玫瑰：花瓣多圈环形 + 茎叶（参考图：路径环绕花朵） */
    {
      id: "rose", name: "玫瑰", cat: CAT_F, icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="1.8"/><path d="M12 4v1.6M20 12h-1.6M4 12h1.6M12 20v-1.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i, cx = 120, cy = 104;
        /* 花瓣三圈：内/中/外，文字沿切向 */
        var rings = [[20, 5, 11, 1], [40, 10, 9.5, 0.9], [62, 14, 8.5, 0.78], [84, 18, 7.5, 0.62]];
        for (i = 0; i < rings.length; i++) {
          var r = rings[i][0], cnt = rings[i][1], fs = rings[i][2], op = rings[i][3];
          var pts = ringPoints(cx, cy, r, cnt, i % 2 ? 0.4 : 0.1);
          for (var j = 0; j < pts.length; j++) {
            var pt = pts[j];
            var ang = Math.atan2(pt.y - cy, pt.x - cx);
            texts.push({ x: pt.x, y: pt.y, fs: fs, rot: (ang * 180 / Math.PI + 90), op: op, anchor: "middle", text: pickWord(words, idx++) });
          }
        }
        /* 茎（竖排） */
        decor.push("M120 142C119 172 120 196 120 218");
        var stemY = [152, 166, 180, 194, 208, 222];
        for (i = 0; i < stemY.length; i++) {
          texts.push({ x: 120, y: stemY[i], fs: 7.5, rot: 0, op: 0.85, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 左右叶片（弧排 2 字 + 叶脉） */
        var leafL = [[96, 178], [88, 192], [84, 206]];
        var leafR = [[144, 182], [152, 196], [156, 210]];
        decor.push("M120 178C106 176 96 184 88 200");
        decor.push("M120 182C134 182 144 190 150 206");
        for (i = 0; i < leafL.length; i++) { texts.push({ x: leafL[i][0], y: leafL[i][1], fs: 7, rot: -18, op: 0.7, anchor: "middle", text: pickWord(words, idx++) }); }
        for (i = 0; i < leafR.length; i++) { texts.push({ x: leafR[i][0], y: leafR[i][1], fs: 7, rot: 18, op: 0.7, anchor: "middle", text: pickWord(words, idx++) }); }
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[120, 104, 64], [120, 180, 16], [98, 192, 16], [144, 196, 16]] }  /* 词云区域：花盘+茎叶 */
    },
    /* 3. 雏菊：中心大花盘 + 8 片花瓣 */
    {
      id: "daisy", name: "雏菊", cat: CAT_F, icon: '<circle cx="12" cy="12" r="2.6"/><path d="M12 2.6V6M12 18v3.4M2.6 12H6M18 12h3.4M5.2 5.2l2.5 2.5M16.3 16.3l2.5 2.5M18.8 5.2l-2.5 2.5M7.7 16.3l-2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i, cx = 120, cy = 118;
        texts.push({ x: cx, y: cy, fs: 17, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        for (i = 0; i < 8; i++) {
          var a = Math.PI * 2 * i / 8 + 0.35;
          var ang = a * 180 / Math.PI;
          var p0 = P(cx + 26 * Math.cos(a), cy + 26 * Math.sin(a));
          var p1 = P(cx + 58 * Math.cos(a), cy + 58 * Math.sin(a));
          var p2 = P(cx + 86 * Math.cos(a), cy + 86 * Math.sin(a));
          decor.push("M" + p0.x.toFixed(1) + " " + p0.y.toFixed(1) + "L" + p2.x.toFixed(1) + " " + p2.y.toFixed(1));
          texts.push({ x: p0.x, y: p0.y, fs: 8, rot: ang, op: 0.9, anchor: "middle", text: pickWord(words, idx++) });
          texts.push({ x: p1.x, y: p1.y, fs: 9, rot: ang, op: 0.8, anchor: "middle", text: pickWord(words, idx++) });
          texts.push({ x: p2.x, y: p2.y, fs: 7.5, rot: ang, op: 0.55, anchor: "middle", text: pickWord(words, idx++) });
        }
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[120, 118, 30], [169, 136, 21], [142, 165, 21], [102, 167, 21], [73, 139, 21], [71, 101, 21], [98, 71, 21], [138, 69, 21], [167, 97, 21]] }  /* 词云区域：中心盘+8瓣 */
    },
    /* 4. 铃兰：垂挂钟形花串 */
    {
      id: "lily", name: "铃兰", cat: CAT_P, icon: '<path d="M12 3v9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 12.5c-2.2 0-3.4 2-3.4 4 0 1.2 1.1 2.4 3.4 2.4s3.4-1.2 3.4-2.4c0-2-1.2-4-3.4-4z"/><path d="M7.8 8c-2.2 0-3.4 2-3.4 4 0 1.2 1.1 2.4 3.4 2.4s3.4-1.2 3.4-2.4c0-2-1.2-4-3.4-4z"/><path d="M16.2 8c-2.2 0-3.4 2-3.4 4 0 1.2 1.1 2.4 3.4 2.4s3.4-1.2 3.4-2.4c0-2-1.2-4-3.4-4z"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i;
        decor.push("M120 36C119 80 119 130 120 216");
        /* 主茎字 */
        var ys = [52, 72, 92, 112, 132, 152, 172, 192, 210];
        for (i = 0; i < ys.length; i++) { texts.push({ x: 120, y: ys[i], fs: 7.5, rot: 0, op: 0.9, anchor: "middle", text: pickWord(words, idx++) }); }
        /* 左分支钟串 */
        var lc = [[98, 96], [84, 116], [70, 138], [58, 160], [50, 182]];
        decor.push("M120 96C104 104 92 122 80 146");
        for (i = 0; i < lc.length; i++) {
          var p = lc[i];
          decor.push("M" + p[0] + " " + (p[1] - 6) + "C" + (p[0] - 5) + " " + (p[1] + 2) + "," + (p[0] - 5) + " " + (p[1] + 12) + "," + p[0] + " " + (p[1] + 16));
          texts.push({ x: p[0] - 6, y: p[1] + 6, fs: 6.5, rot: -8, op: 0.7, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 右分支钟串 */
        var rc = [[142, 100], [156, 122], [170, 146], [182, 170], [192, 194]];
        decor.push("M120 100C136 108 148 126 160 150");
        for (i = 0; i < rc.length; i++) {
          p = rc[i];
          decor.push("M" + p[0] + " " + (p[1] - 6) + "C" + (p[0] + 5) + " " + (p[1] + 2) + "," + (p[0] + 5) + " " + (p[1] + 12) + "," + p[0] + " " + (p[1] + 16));
          texts.push({ x: p[0] + 6, y: p[1] + 6, fs: 6.5, rot: 8, op: 0.7, anchor: "middle", text: pickWord(words, idx++) });
        }
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[120, 110, 42], [120, 168, 32], [92, 136, 26], [148, 140, 26], [70, 168, 20], [172, 172, 20]] }  /* 词云区域：主茎+左右钟串 */
    },
    /* 5. 蝴蝶：对称双翼 + 触角 */
    {
      id: "butterfly", name: "蝴蝶", cat: CAT_A, icon: '<path d="M12 8c-1.2-3.4-5.4-4.6-7.4-2.4-1.1 1.3-.8 4 2.8 6-3.6 2-3.9 4.7-2.8 6 2 2.2 6.2 1 7.4-2.4 1.2 3.4 5.4 4.6 7.4 2.4 1.1-1.3.8-4-2.8-6 3.6-2 3.9-4.7 2.8-6-2-2.2-6.2-1-7.4 2.4z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M12 5.6V19" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i;
        /* 身体 */
        decor.push("M120 90C119 120 119 160 120 190");
        texts.push({ x: 120, y: 108, fs: 10, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 120, y: 132, fs: 10, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 120, y: 156, fs: 10, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        /* 左翼：上环 + 下环 */
        var lu = ringPoints(88, 100, 26, 9, 0.3);
        decor.push("M88 74A26 22 0 1 1 88 126");
        for (i = 0; i < lu.length; i++) {
          var ang = Math.atan2(lu[i].y - 100, lu[i].x - 88) * 180 / Math.PI;
          texts.push({ x: lu[i].x, y: lu[i].y, fs: 7, rot: ang + 90, op: 0.85, anchor: "middle", text: pickWord(words, idx++) });
        }
        var ld = ringPoints(84, 158, 22, 9, 0.7);
        decor.push("M84 136A22 24 0 1 1 84 180");
        for (i = 0; i < ld.length; i++) {
          var ang2 = Math.atan2(ld[i].y - 158, ld[i].x - 84) * 180 / Math.PI;
          texts.push({ x: ld[i].x, y: ld[i].y, fs: 6.5, rot: ang2 + 90, op: 0.75, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 右翼镜像 */
        var ru = ringPoints(152, 100, 26, 9, 0.3);
        decor.push("M152 74A26 22 0 0 1 152 126");
        for (i = 0; i < ru.length; i++) {
          var ang3 = Math.atan2(ru[i].y - 100, ru[i].x - 152) * 180 / Math.PI;
          texts.push({ x: ru[i].x, y: ru[i].y, fs: 7, rot: ang3 + 90, op: 0.85, anchor: "middle", text: pickWord(words, idx++) });
        }
        var rd = ringPoints(156, 158, 22, 9, 0.7);
        decor.push("M156 136A22 24 0 0 1 156 180");
        for (i = 0; i < rd.length; i++) {
          var ang4 = Math.atan2(rd[i].y - 158, rd[i].x - 156) * 180 / Math.PI;
          texts.push({ x: rd[i].x, y: rd[i].y, fs: 6.5, rot: ang4 + 90, op: 0.75, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 触角 */
        decor.push("M120 96C108 78 92 66 76 62");
        decor.push("M120 96C132 78 148 66 164 62");
        texts.push({ x: 74, y: 60, fs: 7, rot: -30, op: 0.8, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 166, y: 60, fs: 7, rot: 30, op: 0.8, anchor: "middle", text: pickWord(words, idx++) });
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[88, 100, 32], [84, 158, 26], [152, 100, 32], [156, 158, 26], [120, 132, 16]] }  /* 词云区域：双翼+身体 */
    },
    /* 6. 猫：圆脸 + 双耳 + 五官 */
    {
      id: "cat", name: "猫咪", cat: CAT_A, icon: '<path d="M7.5 15.5c0-3.8 1.9-6.8 4.5-6.8s4.5 3 4.5 6.8c0 2.7-1.8 4.5-4.5 4.5s-4.5-1.8-4.5-4.5z" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M7.5 15.5 3.6 10l5 3.4M16.5 15.5l3.9-5.5-5 3.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/><circle cx="10" cy="15" r="0.75"/><circle cx="14" cy="15" r="0.75"/><path d="M11.4 18.2 12 17l.6 1.2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i, cx = 120, cy = 142;
        /* 耳朵 */
        decor.push("M92 102L70 62L120 92");
        decor.push("M148 102L170 62L120 92");
        texts.push({ x: 96, y: 86, fs: 8, rot: -18, op: 0.9, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 144, y: 86, fs: 8, rot: 18, op: 0.9, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 86, y: 74, fs: 7, rot: -10, op: 0.7, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 154, y: 74, fs: 7, rot: 10, op: 0.7, anchor: "middle", text: pickWord(words, idx++) });
        /* 脸环 */
        var face = ringPoints(cx, cy, 56, 14, 0.2);
        decor.push("M64 142A56 52 0 1 1 176 142A56 52 0 1 1 64 142");
        for (i = 0; i < face.length; i++) {
          var ang = Math.atan2(face[i].y - cy, face[i].x - cx) * 180 / Math.PI;
          texts.push({ x: face[i].x, y: face[i].y, fs: 7.5, rot: ang + 90, op: 0.8, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 中心字 */
        texts.push({ x: cx, y: cy, fs: 11, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        /* 眼睛 + 鼻子 + 胡须 */
        texts.push({ x: 92, y: 132, fs: 8, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 148, y: 132, fs: 8, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 120, y: 152, fs: 8, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 66, y: 142, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 174, y: 142, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 70, y: 160, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 170, y: 160, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        /* 点缀：额头 / 左右脸颊 / 下巴 */
        texts.push({ x: 120, y: 108, fs: 6.5, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 74, y: 158, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 166, y: 158, fs: 6, rot: 0, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 120, y: 176, fs: 6.5, rot: 0, op: 0.55, anchor: "middle", text: pickWord(words, idx++) });
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[120, 142, 66], [100, 86, 26], [140, 86, 26]] }  /* 词云区域：脸+双耳 */
    },
    /* 7. 心形：参数方程采样 */
    {
      id: "heart", name: "心语", cat: CAT_S, icon: '<path d="M12 19.5s-6.3-4.2-8.2-7.6C2.6 9.7 3.6 6.6 6.4 6.6c1.9 0 3.3 1 4.3 2.4.5.6.9.6 1.3 0 1-1.4 2.4-2.4 4.3-2.4 2.8 0 3.8 3.1 2.6 5.3-1.9 3.4-8.2 7.6-8.2 7.6z" stroke="currentColor" stroke-width="1.3" fill="none"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i;
        var pts = [], N = 30;
        for (i = 0; i < N; i++) { pts.push(heartP(Math.PI * 2 * i / N)); }
        for (i = 0; i < N; i++) {
          var p = pts[i], p2 = pts[(i + 1) % N];
          decor.push("M" + p.x.toFixed(1) + " " + p.y.toFixed(1) + "L" + p2.x.toFixed(1) + " " + p2.y.toFixed(1));
          var ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
          texts.push({ x: p.x, y: p.y, fs: i % 2 ? 7.5 : 9, rot: ang + 90, op: i > 20 ? 0.55 : 0.9, anchor: "middle", text: pickWord(words, idx++) });
        }
        texts.push({ x: 120, y: 136, fs: 12, rot: 0, op: 1, anchor: "middle", text: pickWord(words, idx++) });
        texts.push({ x: 120, y: 158, fs: 9, rot: 0, op: 0.9, anchor: "middle", text: pickWord(words, idx++) });
        return { texts: texts, decor: decor };
      },
      cloud: { circles: [[107, 112, 38], [133, 112, 38], [120, 154, 44]] }  /* 词云区域：心形主体三圆近似 */
    },
    /* 8. 星月：月牙弧 + 星星点缀 */
    {
      id: "starmoon", name: "星月", cat: CAT_S, icon: '<path d="M14.5 3.8a8.2 8.2 0 0 0 .2 16.4 8.4 8.4 0 0 1-.6-16.4 8.2 8.2 0 0 0 .4 0z" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M18.5 3.2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>',
      build: function (words) {
        var texts = [], decor = [], idx = 0, i;
        /* 月牙外弧 */
        var outer = ringPoints(128, 122, 64, 18, 0.35);
        decor.push("M64 122A64 60 0 1 1 192 122");
        for (i = 0; i < outer.length; i++) {
          var ang = Math.atan2(outer[i].y - 122, outer[i].x - 128) * 180 / Math.PI;
          texts.push({ x: outer[i].x, y: outer[i].y, fs: i % 3 === 0 ? 9.5 : 8, rot: ang + 90, op: 0.9, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 月牙内弧 */
        var inner = ringPoints(102, 110, 50, 9, 2.2);
        decor.push("M52 110A50 46 0 0 0 152 110");
        for (i = 0; i < inner.length; i++) {
          var ang2 = Math.atan2(inner[i].y - 110, inner[i].x - 102) * 180 / Math.PI;
          texts.push({ x: inner[i].x, y: inner[i].y, fs: 7, rot: ang2 + 90, op: 0.6, anchor: "middle", text: pickWord(words, idx++) });
        }
        /* 星星：5 组五角顶点 */
        var stars = [[30, 40], [205, 32], [215, 205], [26, 210], [120, 232]];
        for (i = 0; i < stars.length; i++) {
          var sx = stars[i][0], sy = stars[i][1];
          var pts = ringPoints(sx, sy, 13, 5, -Math.PI / 2);
          /* 五角星折线合并为单个 path（M + L... + Z），禁止拆分 decor 导致非法 d */
          var d = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
          for (var j = 1; j < pts.length; j++) { d += "L" + pts[j].x.toFixed(1) + " " + pts[j].y.toFixed(1); }
          d += "Z";
          decor.push(d);
          for (j = 0; j < pts.length; j++) {
            texts.push({ x: pts[j].x, y: pts[j].y, fs: 6.5, rot: 0, op: 0.75, anchor: "middle", text: pickWord(words, idx++) });
          }
        }
        return { texts: texts, decor: decor };
      },
      cloud: {
        circles: [[128, 122, 74]],   /* 词云区域：整圆（月牙/星星由 decor path 叠加呈现，月牙环带过窄放不下完整语句大字） */
        test: function (x, y) { return true; }
      }
    }
  ];

  /* ---------- 留言池（按图案类别随机） ---------- */
  var MESSAGES = {
    dandelion: [
      "风把昨天的话吹成了蒲公英，轻轻落在你肩头。",
      "那些飘散的字，原来都还记得回来的路。",
      "今天的风是从昨天吹来的，捎着你说过的话。",
      "把昨日的心事种进风里，等它开出新的花。"
    ],
    flower: [
      "把昨日的只言片语，开成一朵不会凋谢的花。",
      "花会谢，字会留，我的话一直在这里。",
      "玫瑰有刺，温柔有边，而你始终柔软。",
      "每一瓣都是昨天没说完的话。"
    ],
    plant: [
      "铃铛轻响，是昨日的话在风里点头。",
      "藤蔓攀着时间往上走，字就挂在叶尖上。",
      "晨露是你的话，叶脉是我们走过的路。",
      "把昨天的句子，养在今天的窗台上。"
    ],
    animal: [
      "蝴蝶记得来时的路，我也记得你说的话。",
      "猫咪打盹的午后，正好用来翻昨天的絮语。",
      "翅膀扇一扇，昨天的话就飞回来了。",
      "所有的陪伴，都长成了毛茸茸的形状。"
    ],
    symbol: [
      "把昨天揉成一颗心，放进今天的口袋里。",
      "月亮弯弯，装着我们说过的话。",
      "星子一闪一闪，是你昨天点头的样子。",
      "心事画成形状，夜夜都亮着。"
    ]
  };

  /* ---------- 生成 / 去重 ---------- */
  function collectYesterday() {
    var c = loadChat();
    var partners = loadPartners();
    if (!c || !c.messages) { return { texts: [], partners: partners }; }
    var yest = dateStr(-1);
    var texts = [], items = [], hitPartners = [], seenP = {}, i, p, list, m, j;
    for (i = 0; i < partners.length; i++) {
      p = partners[i];
      list = c.messages[p.id];
      if (!Array.isArray(list)) { continue; }
      for (j = 0; j < list.length; j++) {
        m = list[j];
        if (!m || !m.time) { continue; }
        if (dateOf(m.time) !== yest) { continue; }
        var t = msgText(m);
        if (t) {
          texts.push(t);
          items.push({ text: t, isSelf: m.type === "self" });
          if (!seenP[p.id]) { seenP[p.id] = 1; hitPartners.push(p); }
        }
      }
    }
    /* 昨日无消息但 partners 有：返回空数组 */
    return { texts: texts, items: items, partners: partners, hitPartners: hitPartners };
  }

  function roll() { return Math.floor(Math.random() * 100000) % 100; }

  var PHOTO_PREFIX = "photo:";
  var DEFAULT_WORDS = ["昨", "日", "回", "响", "絮", "语", "念", "你"];
  function isPhotoId(id) { return !!id && id.indexOf(PHOTO_PREFIX) === 0; }

  /* 按 id 反查模板；不存在返回 null（照片画像 id 不属于模板） */
  function resolvePattern(id) {
    for (var i = 0; i < PATTERNS.length; i++) {
      if (PATTERNS[i].id === id) { return PATTERNS[i]; }
    }
    return null;
  }

  /* 生成/取当天 entry：patternId 指定时优先按该模板生成（切换/上传用）；
     缓存命中时以 patternId 反查模板并校验名称一致，不一致即修复/重建，
     杜绝「徽标玫瑰、图案蒲公英」类错配 */
  function buildEcho(patternId) {
    var yest = dateStr(-1);
    var store = lsGet(ECHO_KEY) || { byDate: {} };
    var cached = store.byDate ? store.byDate[yest] : null;
    if (cached && cached.patternId) {
      if (isPhotoId(cached.patternId)) {
        if (cached.layout && cached.layout.texts && cached.layout.texts.length) { return cached; } /* 照片画像：layout 由图片生成，无模板可校验 */
      } else {
        var cp = resolvePattern(cached.patternId);
        if (cp) {
          if (cp.name === cached.patternName && cached.layout && cached.layout.texts && cached.layout.texts.length) {
            /* 词云版本校验：必须有完整语句短语，且每条文字都有原文（杜绝旧版单字/词组脏数据） */
            var hasPh = Array.isArray(cached.phrases) && cached.phrases.length > 0;
            var textsOk = true, ti;
            for (ti = 0; ti < cached.layout.texts.length; ti++) {
              if (!cached.layout.texts[ti].text) { textsOk = false; break; }
            }
            if (hasPh && textsOk) { return cached; } /* 词云版缓存：同日去重 */
          }
          /* 旧版/脏数据：按正确模板用当日语句重建词云（保留留言/发布者） */
          var d2 = collectYesterday();
          var ph2 = d2.items ? extractPhrases(d2.items) : [];
          if (ph2.length) {
            ph2 = fillPhrases(ph2.slice(0, 15), 8);
            cached.patternName = cp.name;
            cached.phrases = ph2;
            cached.words = ph2.map(function (p) { return p.text; }).slice(0, 40);
            cached.layout = cloudLayout(ph2, cp.cloud, cp.build([]).decor);
            store.byDate[yest] = cached;
            lsSet(ECHO_KEY, store);
            return cached;
          }
        }
        /* 模板不存在或无法重建（脏数据）：丢弃重建 */
      }
    }

    var data = collectYesterday();
    if (!data.texts.length) { return null; }              /* 空态：不写入存储 */

    var phrases = extractPhrases(data.items);
    if (!phrases.length) { return null; }                 /* 空态：不写入存储 */
    phrases = fillPhrases(phrases.slice(0, 15), 8);

    var pattern = null;
    if (patternId && !isPhotoId(patternId)) { pattern = resolvePattern(patternId); }
    if (!pattern) { pattern = PATTERNS[roll() % PATTERNS.length]; }
    var layout = cloudLayout(phrases, pattern.cloud, pattern.build([]).decor);
    var catMsgs = MESSAGES[pattern.cat] || MESSAGES.dandelion;
    var message = catMsgs[roll() % catMsgs.length];

    /* 发布者：昨日有消息的伙伴中最后活跃的（消息量最多优先），兜底 partners[0] */
    var pub = data.hitPartners[0] || (data.partners && data.partners[0]) || { id: "", name: "对方" };

    var entry = {
      date: yest,
      patternId: pattern.id,
      patternName: pattern.name,
      words: phrases.map(function (p) { return p.text; }).slice(0, 40),
      phrases: phrases,
      layout: layout,
      message: message,
      partnerId: pub.id || "",
      partnerName: pub.name || "对方",
      msgCount: data.texts.length,
      time: now()
    };
    store.byDate = store.byDate || {};
    store.byDate[yest] = entry;
    lsSet(ECHO_KEY, store);
    return entry;
  }

  /* ---------- 上传图片 → 文字画像 ----------
     一次性流程（无定时器/动画）：
     File → Image → canvas 降采样(最长边≤512) → 亮度+边缘网格采样
     → 生成与模板同构的 layout.texts（暗处密集高 op、亮处稀疏低 op、
       边缘格放大字强化轮廓） → 持久化为当天 entry 的照片画像 */
  function fileToImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () { cb(img); };
      img.onerror = function () { cb(null); };
      img.src = e.target.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  /* 照片画像：按图片亮度/边缘采样，用完整语句填满轮廓（phrases 为空时退回单字兜底） */
  function photoLayoutFromImage(img, phrases) {
    var MAX = 512;
    var w = img.naturalWidth || img.width || 1;
    var h = img.naturalHeight || img.height || 1;
    var scale = Math.min(1, MAX / Math.max(w, h));
    var cw = Math.max(2, Math.round(w * scale));
    var ch = Math.max(2, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, cw, ch);
    var data;
    try { data = ctx.getImageData(0, 0, cw, ch).data; } catch (err) { return null; }

    var COLS = 24, ROWS = 26;               /* 采样网格（对应 240x260 viewBox，比例≈0.92） */
    var cellW = cw / COLS, cellH = ch / ROWS;
    var luma = [], edge = [], r, c, i;
    for (r = 0; r < ROWS; r++) {
      luma[r] = []; edge[r] = [];
      for (c = 0; c < COLS; c++) {
        var x0 = Math.floor(c * cellW), y0 = Math.floor(r * cellH);
        var x1 = Math.max(x0 + 1, Math.floor((c + 1) * cellW));
        var y1 = Math.max(y0 + 1, Math.floor((r + 1) * cellH));
        var sum = 0, n = 0, p;
        for (var yy = y0; yy < y1; yy++) {
          for (var xx = x0; xx < x1; xx++) {
            p = (yy * cw + xx) * 4;
            sum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
            n++;
          }
        }
        luma[r][c] = n ? sum / n : 128;
      }
    }
    /* 边缘强度：与上下左右格亮度差的最大值 */
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        var mx = 0, d;
        if (r > 0) { d = Math.abs(luma[r][c] - luma[r - 1][c]); if (d > mx) { mx = d; } }
        if (r < ROWS - 1) { d = Math.abs(luma[r][c] - luma[r + 1][c]); if (d > mx) { mx = d; } }
        if (c > 0) { d = Math.abs(luma[r][c] - luma[r][c - 1]); if (d > mx) { mx = d; } }
        if (c < COLS - 1) { d = Math.abs(luma[r][c] - luma[r][c + 1]); if (d > mx) { mx = d; } }
        edge[r][c] = mx;
      }
    }

    /* 语句池（完整语句不拆字）；无语句时退回单字 */
    var PHR = (phrases && phrases.length) ? phrases : null;
    var pIdx = 0;
    function nextPhrase() {
      if (!PHR) { return pickWord(DEFAULT_WORDS, pIdx++); }
      return PHR[pIdx % PHR.length].text;
    }
    function fontSize(weight) { return PHR ? 11 + (weight % 4) * 3 : 9.5; }
    function phraseOcc(x, y, fs, s) {
      if (!PHR) { return fs; }
      var occ = 0, st;
      for (st = 0; st < PHR.length; st++) { occ += PHR[st].count * Math.exp(-((x - PHR[st].x) * (x - PHR[st].x) + (y - PHR[st].y) * (y - PHR[st].y)) / (fs * fs * 2.2)); }
      return Math.max(fs, occ);
    }

    /* 生成文字点位：完整语句以碰撞检测错落放置（不拆字、不重叠、可读），无语句时退回单字点阵 */
    var texts = [], placedB = [];
    var CAND = [], r, c, i;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        var L = luma[r][c], E = edge[r][c];
        var x = 4 + c * (240 - 8) / (COLS - 1);
        var y = 6 + r * (260 - 12) / (ROWS - 1);
        if (E >= 26) { CAND.push({ x: x, y: y, kind: 0, L: L, E: E }); }
        else if (L < 128) { CAND.push({ x: x, y: y, kind: 1, L: L, E: E }); }
        else if (L < 200 && (c + r) % 2 === 0) { CAND.push({ x: x, y: y, kind: 2, L: L, E: E }); }
      }
    }
    CAND.sort(function (a, b) { return (a.kind - b.kind) || (b.E - a.E) || (a.L - b.L); });
    var OFFS = [0, 5, -5, 10, -10, 14, -14, 18, -18];
    function tryPlace(cx, cy, fs, s, rot) {
      var w = PHR ? textEstW(s, fs) : fs * 1.0;
      var h = fs * 1.2;
      for (var d = 0; d < OFFS.length; d++) {
        var x = cx + OFFS[d], y = cy + (d % 2 ? 5 : -3);
        var x1 = x - w / 2, x2 = x + w / 2, y1 = y - h / 2, y2 = y + h / 2;
        if (x2 > 248 || x1 < 2 || y2 > 256 || y1 < 2) { continue; }
        var ok = true, j;
        for (j = 0; j < placedB.length; j++) {
          var b = placedB[j];
          if (x2 > b.x1 && x1 < b.x2 && y2 > b.y1 && y1 < b.y2) { ok = false; break; }
        }
        if (ok) {
          placedB.push({ x1: x1, x2: x2, y1: y1, y2: y2 });
          return { x: x, y: y, fs: fs, rot: rot, op: 1, anchor: "middle", text: s };
        }
      }
      return null;
    }
    var MAXT = PHR ? 70 : 260;
    for (i = 0; i < CAND.length && texts.length < MAXT; i++) {
      var cd = CAND[i];
      var s = nextPhrase();
      var fs, rot = PHR ? ((i % 5) - 2) * 6 : 0;
      if (PHR) {
        var weight = (PHR[pIdx % PHR.length].count) || 1;
        fs = 6.5 + (weight % 3) * 1.5;
        var tw = textEstW(s, fs);
        if (tw > 85) { fs = Math.max(5, fs * 80 / tw); }
      } else {
        fs = 9.5;
      }
      var placed = tryPlace(cd.x, cd.y, fs, s, rot);
      if (placed) { texts.push(placed); }
    }
    return { texts: texts, decor: [] };
  }

  /* 上传图片入口（一次性）：生成照片画像并持久化为当天图案 */
  function uploadImage(file) {
    if (!file || !/^image\//.test(file.type || "")) { return; }
    fileToImage(file, function (img) {
      if (!img) { return; }
      var data0 = collectYesterday();
      var ph0 = data0.items ? extractPhrases(data0.items) : [];
      var phrases = ph0.length ? fillPhrases(ph0.slice(0, 15), 8) : null;
      var layout = photoLayoutFromImage(img, phrases);
      if (!layout || !layout.texts.length) { return; }
      var yest = dateStr(-1);
      var store = lsGet(ECHO_KEY) || { byDate: {} };
      var cached = store.byDate ? store.byDate[yest] : null;
      var entry = cached && cached.patternId ? cached : null;
      if (!entry) {
        var data = collectYesterday();
        var ph = data.items ? extractPhrases(data.items) : [];
        var words = ph.length ? ph.map(function (p) { return p.text; }).slice(0, 40) :
          (data.texts.length ? buildWords(data.texts) : DEFAULT_WORDS.slice(0));
        var pub = (data && data.hitPartners && data.hitPartners[0]) ||
          (data && data.partners && data.partners[0]) || { id: "", name: "对方" };
        entry = {
          date: yest,
          words: words.slice(0, 40),
          phrases: ph.length ? fillPhrases(ph.slice(0, 15), 8) : [],
          message: "把这张图里的心事，拼成今天想说的话。",
          partnerId: pub.id || "",
          partnerName: pub.name || "对方",
          msgCount: data.texts ? data.texts.length : 0,
          time: now()
        };
      }
      var photoId = PHOTO_PREFIX + now();
      entry.patternId = photoId;
      entry.patternName = "照片画像";
      entry.layout = layout;
      entry.photoId = photoId;
      entry.photoLayout = layout;
      store.byDate = store.byDate || {};
      store.byDate[yest] = entry;
      lsSet(ECHO_KEY, store);
      renderEcho();
    });
  }

  /* 切换图案模板：复用当天留言/高频词，不重新随机；照片画像可切回 */
  function switchPattern(id) {
    var yest = dateStr(-1);
    var store = lsGet(ECHO_KEY) || { byDate: {} };
    var entry = (store.byDate && store.byDate[yest]) || buildEcho();
    if (!entry) { return; }
    if (isPhotoId(id)) {
      if (!entry.photoLayout || !entry.photoLayout.texts) { return; }
      entry.patternId = entry.photoId || id;
      entry.patternName = "照片画像";
      entry.layout = entry.photoLayout;
    } else {
      var pattern = resolvePattern(id);
      if (!pattern) { return; }
      entry.patternId = pattern.id;
      entry.patternName = pattern.name;
      var phrases = (Array.isArray(entry.phrases) && entry.phrases.length) ? entry.phrases : (function () {
        var d = collectYesterday();
        return d.items ? extractPhrases(d.items) : [];
      })();
      if (phrases.length) {
        entry.phrases = fillPhrases(phrases.slice(0, 15), 8);
        entry.layout = cloudLayout(entry.phrases, pattern.cloud, pattern.build([]).decor);
        entry.words = entry.phrases.map(function (p) { return p.text; }).slice(0, 40);
      } else if (Array.isArray(entry.words) && entry.words.length) {
        entry.layout = pattern.build(entry.words);
      } else {
        entry.layout = pattern.build(DEFAULT_WORDS);
      }
    }
    store.byDate = store.byDate || {};
    store.byDate[yest] = entry;
    lsSet(ECHO_KEY, store);
    renderEcho();
  }

  /* ---------- 渲染 ---------- */
  function svgOf(entry) {
    var parts = [];
    parts.push('<svg class="echo-svg" viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" role="img" aria-label="' + esc(entry.patternName) + '文字图案" xmlns="http://www.w3.org/2000/svg">');
    if (entry.layout && entry.layout.decor) {
      var i;
      for (i = 0; i < entry.layout.decor.length; i++) {
        parts.push('<path class="echo-decor" d="' + esc(entry.layout.decor[i]) + '" fill="none" stroke="currentColor" stroke-width="0.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.28"/>');
      }
    }
    if (entry.layout && entry.layout.texts) {
      for (i = 0; i < entry.layout.texts.length; i++) {
        var t = entry.layout.texts[i];
        parts.push('<text x="' + t.x.toFixed(1) + '" y="' + t.y.toFixed(1) + '" font-size="' + t.fs + '" text-anchor="' + (t.anchor || "middle") + '" opacity="' + t.op + '"' +
          (t.rot ? ' transform="rotate(' + t.rot.toFixed(1) + ' ' + t.x.toFixed(1) + ' ' + t.y.toFixed(1) + ')"' : "") +
          ' style="stroke-width:' + (Math.round(t.fs * 0.05 * 100) / 100).toFixed(2) + 'px">' + esc(t.text) + "</text>");
      }
    }
    parts.push("</svg>");
    return parts.join("");
  }

  function switchBarHtml(entry) {
    var parts = ['<div class="echo-switch" role="tablist" aria-label="图案模板切换">'];
    var i, p, activeId = entry.patternId;
    for (i = 0; i < PATTERNS.length; i++) {
      p = PATTERNS[i];
      parts.push('<button type="button" class="echo-switch-btn' + (p.id === activeId ? ' is-active' : '') + '" data-pattern="' + p.id + '" onclick="SnowCrystal.Echo.switchPattern(\'' + p.id + '\')" role="tab" aria-selected="' + (p.id === activeId ? 'true' : 'false') + '">' +
        '<svg viewBox="0 0 24 24" class="echo-switch-ico" aria-hidden="true">' + p.icon + '</svg>' +
        '<span class="echo-switch-name">' + esc(p.name) + '</span></button>');
    }
    if (entry.photoLayout && entry.photoLayout.texts && entry.photoLayout.texts.length) {
      var pid = entry.photoId || "";
      parts.push('<button type="button" class="echo-switch-btn' + (pid === activeId ? ' is-active' : '') + '" data-pattern="photo" onclick="SnowCrystal.Echo.switchPattern(\'' + pid + '\')" role="tab" aria-selected="' + (pid === activeId ? 'true' : 'false') + '">' +
        '<svg viewBox="0 0 24 24" class="echo-switch-ico" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg>' +
        '<span class="echo-switch-name">照片画像</span></button>');
    }
    parts.push('</div>');
    return parts.join("");
  }

  function renderEcho() {
    var wrap = document.getElementById("echoWrap");
    if (!wrap) { return; }
    var entry = buildEcho();

    if (!entry) {
      wrap.innerHTML =
        '<div class="echo-empty echo-fade">' +
        '<div class="echo-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 7.4v4.6l3.2 1.9"/></svg></div>' +
        '<p class="echo-empty-title">昨日絮语尚空</p>' +
        '<p class="echo-empty-desc">待你今日畅谈，明天这里就会有图案绽放；也可以直接上传图片生成文字画像。</p>' +
        '<button class="echo-empty-btn" type="button" onclick="SnowCrystal.openChatList()">去聊几句</button>' +
        '<button class="echo-empty-btn echo-empty-upload" type="button" onclick="SnowCrystal.Echo.pickImage()">上传图片生成画像</button>' +
        "</div>";
      return;
    }

    var headHtml =
      '<div class="echo-head">' +
      '<span class="echo-date">' + esc(entry.date) + ' · 回响</span>' +
      '<span class="echo-badge">' + esc(entry.patternName) + '</span>' +
      "</div>";

    var statHtml =
      '<p class="echo-stat">收录昨日 ' + entry.msgCount + ' 条絮语 · ' +
      ((entry.phrases && entry.phrases.length) ? entry.phrases.length + ' 句高频语句' : entry.words.length + ' 个高频词') + '</p>';

    var msgHtml =
      '<div class="echo-message">' +
      '<span class="echo-message-who">' + esc(entry.partnerName) + '</span>' +
      '<span class="echo-message-text">' + esc(entry.message) + '</span>' +
      "</div>";

    var uploadBtn =
      '<button class="echo-upload-btn" type="button" onclick="SnowCrystal.Echo.pickImage()" title="上传图片生成文字画像">' +
      '<svg viewBox="0 0 24 24" class="echo-upload-ico" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg>' +
      '<span>上传图片</span></button>';

    wrap.innerHTML =
      '<div class="echo-card echo-fade">' +
      headHtml + msgHtml + statHtml +
      '<div class="echo-stage">' + svgOf(entry) + '</div>' +
      '<div class="echo-tools">' + switchBarHtml(entry) + uploadBtn + '</div>' +
      "</div>";
  }

  /* 惰性创建一次文件输入（body 级，不随 renderEcho 重建丢失） */
  function ensureFileInput() {
    var inp = document.getElementById("echoFileInput");
    if (inp) { return inp; }
    inp = document.createElement("input");
    inp.id = "echoFileInput";
    inp.type = "file";
    inp.accept = "image/*";
    inp.style.display = "none";
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0];
      if (f) { uploadImage(f); }
      inp.value = "";
    });
    document.body.appendChild(inp);
    return inp;
  }
  function pickImage() { ensureFileInput().click(); }

  function openEcho() {
    if (window.SnowCrystal && SnowCrystal.switchPage) { SnowCrystal.switchPage("echo"); }
    renderEcho();
  }

  /* ---------- 导出 ---------- */
  var S = window.SnowCrystal = window.SnowCrystal || {};
  S.Echo = S.Echo || {};
  S.openEcho = openEcho;
  S.Echo.renderEcho = renderEcho;
  S.Echo.buildEcho = buildEcho;
  S.Echo.buildWords = buildWords;
  S.Echo.extractPhrases = extractPhrases;
  S.Echo.fillPhrases = fillPhrases;
  S.Echo.cloudLayout = cloudLayout;
  S.Echo.PATTERNS = PATTERNS;
  S.Echo.ECHO_KEY = ECHO_KEY;
  S.Echo.dateStr = dateStr;
  S.Echo.collectYesterday = collectYesterday;
  S.Echo.switchPattern = switchPattern;
  S.Echo.uploadImage = uploadImage;
  S.Echo.pickImage = pickImage;
  S.Echo.ensureFileInput = ensureFileInput;
  S.Echo.resolvePattern = resolvePattern;
  S.Echo.isPhotoId = isPhotoId;
  S.Echo.photoLayoutFromImage = photoLayoutFromImage;
  S.Echo.DEFAULT_WORDS = DEFAULT_WORDS;
})();
