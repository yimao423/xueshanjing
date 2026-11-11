/* 雪山晶 · 28-chat-settings ｜ 源：雪山晶.html L20922-L21919 ｜ JS 模块 */
(function () {
  var Chat = window.SnowCrystal && window.SnowCrystal.Chat;
  if (!Chat) { return; }

  var KEY = "snowcrystal.chat.wallpaper2";
  var CUSTOM_KEY = "snowcrystal.chat.roomBgCustom";
  var OLD_BG_KEY = "snowcrystal.chat.roomBg"; 
  var IDB_NAME = "snowcrystal-chat";
  var IDB_STORE = "bg";
  var IDB_KEY = "roomBgCustom";

  /* 默认背景：跟随网站外观主题背景（美化设置里背景是什么就跟随什么） */
  var DEFAULT_BG = "var(--bg)";
  var WHITE_BG = "#ffffff";

  /* ---- 基础工具 ---- */
  function el(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function idbOpen() {
    try {
      if (!window.indexedDB) { return Promise.reject("no idb"); }
      return new Promise(function (resolve, reject) {
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    } catch (e) { return Promise.reject(e); }
  }
  function idbGet() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readonly");
        var rq = tx.objectStore(IDB_STORE).get(IDB_KEY);
        rq.onsuccess = function () { resolve(rq.result || ""); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function idbSet(v) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(v, IDB_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbDel() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE)["delete"](IDB_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function toast(msg) {
    var t = window.SnowCrystal && SnowCrystal.toast ? SnowCrystal.toast : null;
    if (t) { t(msg); }
  }
  function chatRoomPage() { return document.querySelector('.page[data-page="chat-room"]'); }
  function setWpMode(mode) {
    var page = chatRoomPage();
    if (!page) { return; }
    if (mode) { page.setAttribute("data-wp-mode", mode); }
    else { page.removeAttribute("data-wp-mode"); }
  }

  /* 渐变方向映射：上下 / 左右 / 斜向 / 中心晕染 / 边角晕染 / 随机弥散（三色） */
  function gradCss(dir, c1, c2, c3, st) {
    var c3v = c3 || c2;
    switch (dir) {
      case "lr":   return "linear-gradient(to right, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
      case "tlbr": return "linear-gradient(to bottom right, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
      case "rc":   return "radial-gradient(circle at 50% 50%, " + c1 + " 0%, " + c2 + " 55%, " + c3v + " 100%)";
      case "rcn":  return "radial-gradient(circle at 12% 12%, " + c1 + " 0%, " + c2 + " 55%, " + c3v + " 100%)";
      case "rr":
        if (st && st.rrCss) { return st.rrCss; }
        return randomBloomCss(c1, c2, c3v, st ? st.rrParams : null);
      case "tb":
      default:     return "linear-gradient(to bottom, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
    }
  }
  function randomBloomCss(c1, c2, c3, params) {
    var colors = [c1, c2, c3];
    var spots = params && params.spots ? Number(params.spots) : 5;   /* 大光斑数量 3-8 */
    var size  = params && params.size  ? Number(params.size)  : 55;  /* 光斑大小 30-95 */
    var soft  = params && params.soft  ? Number(params.soft)  : 65;  /* 柔和度 35-100 */
    var layers = [];
    /* 最上层：小光斑点缀，颜色更实、边缘略收 */
    var smalls = Math.max(2, Math.round(spots / 2));
    for (var j = 0; j < smalls; j++) {
      var c2v = colors[Math.floor(Math.random() * colors.length)];
      var x2 = 6 + Math.random() * 88, y2 = 6 + Math.random() * 88;
      var r2 = 14 + Math.random() * 26;
      layers.push("radial-gradient(circle at " + x2.toFixed(1) + "% " + y2.toFixed(1) + "%, " + c2v + " 0%, rgba(0,0,0,0) " + r2.toFixed(1) + "%)");
    }
    /* 中层：大光斑柔和晕染（宽过渡，边缘自然融入背景） */
    for (var i = 0; i < spots; i++) {
      var col = colors[Math.floor(Math.random() * colors.length)];
      var x = 8 + Math.random() * 84, y = 8 + Math.random() * 84;
      var r = size * (0.75 + Math.random() * 0.55);
      var fade = soft * (0.7 + Math.random() * 0.6);
      layers.push("radial-gradient(circle at " + x.toFixed(1) + "% " + y.toFixed(1) + "%, " + col + " 0%, rgba(0,0,0,0) " + fade.toFixed(1) + "%)");
    }
    /* 最底层：三色大范围融合底（整片背景的色气来源，与光斑互相渗透） */
    var bx = 18 + Math.random() * 64, by = 14 + Math.random() * 72;
    layers.push("radial-gradient(circle at " + bx.toFixed(1) + "% " + by.toFixed(1) + "%, " + c1 + " 0%, " + c2 + " 42%, " + c3 + " 80%, rgba(0,0,0,0) 100%)");
    return layers.join(", ");
  }
  function setBlurType(type) {
    var st = stLoad();
    st.blurType = type;
    stSave(st);
    apply();
    render(st);
  }
  function setBlurDir(dir) {
    var st = stLoad();
    st.blurDir = dir;
    stSave(st);
    apply();
    render(st);
  }
  var _blurRaf = 0;
  function setBlurAmt(v) {
    var st = stLoad();
    st.blurAmt = Math.max(0, Math.min((window.XJ_CAP ? XJ_CAP.blurMax() : 30), Number(v) || 0));
    stSave(st);
    if (_blurRaf) { cancelAnimationFrame(_blurRaf); }
    _blurRaf = requestAnimationFrame(function () { apply(); render(st); });
  }
  var _grainRaf = 0;
  function setGrainAmt(v) {
    var st = stLoad();
    st.grainAmt = Math.max(0, Math.min(100, Number(v) || 0));
    stSave(st);
    if (_grainRaf) { cancelAnimationFrame(_grainRaf); }
    _grainRaf = requestAnimationFrame(function () { apply(); render(st); });
  }
  function setGrain(type) {
    var st = stLoad();
    st.grain = type;
    stSave(st);
    apply();
    render(st);
  }
  function buildLayers() {
    var st = stLoad();
    if (st.lastType === "white") {
      /* [FIX 2026-11-07] 固定白色 = 恒为纯白。
         原逻辑在暗色主题下返回 var(--bg)，导致"固定白色"实际跟随站点背景，
         与"跟随网站外观主题"完全一样，用户在暗色下看不出白色设置生效。 */
      return WHITE_BG;
    }
    if (st.lastType === "custom") { return DEFAULT_BG; } /* 占位，实际由 applyCustom 覆盖 */
    if (st.lastType === "color") {
      var c1 = st.color || "#f6f8fc", c2 = st.color2 || "#c7d2dc", c3 = st.color3 || "#e8eef6";
      if (st.colorType === "gradient") { return gradCss(st.gradDir || "tb", c1, c2, c3, st); }
      return c1;
    }
    return DEFAULT_BG; /* theme：跟随网站外观主题背景 */
  }
  function stDefault() {
    return { lastType: "white", paper: "", colorType: "solid", color: "#f6f8fc", color2: "#c7d2dc", color3: "#e8eef6", gradDir: "tb", barMode: "half", blurType: "none", blurDir: "tb", blurAmt: 0, grain: "none", grainAmt: 0, rrCss: "", rrParams: { spots: 5, size: 55, soft: 65 }, rrTemplates: [] };
  }
  function stLoad() {
    try {
      var raw = localStorage.getItem(KEY);
      var st = raw ? JSON.parse(raw) : null;
      if (st && typeof st === "object") {
        /* 旧版数据兼容：v9 的 solid 无 lastType 语义时回退跟随主题 */
        if (!st.lastType) { st.lastType = "theme"; }
        if (st.lastType === "paper") { st.lastType = "theme"; }
        if (!st.gradDir) { st.gradDir = "tb"; }
        if (!st.color) { st.color = "#f6f8fc"; }
        if (!st.color2) { st.color2 = "#c7d2dc"; }
        if (!st.color3) { st.color3 = "#e8eef6"; }
        if (!st.barMode) { st.barMode = "half"; }
        if (!st.blurType) { st.blurType = "none"; }
        if (!st.blurDir) { st.blurDir = "tb"; }
        if (st.blurAmt === undefined || st.blurAmt === null) { st.blurAmt = 0; }
        if (!st.grain) { st.grain = "none"; }
        if (st.grain === "grain" || st.grain === "glass") { st.grain = "none"; }
        if (st.grainAmt === undefined || st.grainAmt === null) { st.grainAmt = 0; }
        if (!st.rrCss) { st.rrCss = ""; } 
        if (!st.rrParams || typeof st.rrParams !== "object") { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
        if (st.rrParams.spots === undefined || st.rrParams.spots === null) { st.rrParams.spots = 5; }
        if (st.rrParams.size === undefined || st.rrParams.size === null) { st.rrParams.size = 55; }
        if (st.rrParams.soft === undefined || st.rrParams.soft === null) { st.rrParams.soft = 65; }
        if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
        return st;
      }
    } catch (e) { /* ignore */ }
    return stDefault();
  }
  function stSave(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }

  /* ---- 应用层 ---- */
  /* ---- [FIX 2026-11-07] 壁纸亮度判定：浅色壁纸 → 深墨文字；深色壁纸 → 维持白字 ---- */
  function wpToRgb(c) {
    var s = String(c || "").trim();
    var m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s);
    if (r) { return [Number(r[1]), Number(r[2]), Number(r[3])]; }
    return null;
  }
  function wpRelLum(rgb) {
    if (!rgb) { return 1; }
    var c = [];
    for (var i = 0; i < 3; i++) {
      var v = rgb[i] / 255;
      c.push(v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    }
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function wpToneOfColors(list) {
    var sum = 0, n = 0;
    for (var i = 0; i < list.length; i++) {
      var rgb = wpToRgb(list[i]);
      if (rgb) { sum += wpRelLum(rgb); n++; }
    }
    if (!n) { return "light"; }
    return (sum / n) > 0.42 ? "light" : "dark";
  }
  function setTone(t) {
    var page = chatRoomPage();
    if (!page) { return; }
    if (t) { page.setAttribute("data-wp-tone", t); } else { page.removeAttribute("data-wp-tone"); }
  }
  function wpToneOfImage(url) {
    wpToneOfImage._seq = (wpToneOfImage._seq || 0) + 1;
    var seq = wpToneOfImage._seq;
    try {
      var img = new Image();
      img.onload = function () {
        if (seq !== wpToneOfImage._seq) { return; } /* 已切换，丢弃过期结果 */
        try {
          var cv = document.createElement("canvas");
          cv.width = 20; cv.height = 20;
          var ctx = cv.getContext("2d");
          ctx.drawImage(img, 0, 0, 20, 20);
          var d = ctx.getImageData(0, 0, 20, 20).data;
          var sum = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) { continue; }
            sum += wpRelLum([d[i], d[i + 1], d[i + 2]]); n++;
          }
          setTone(n ? ((sum / n) > 0.42 ? "light" : "dark") : "light");
        } catch (e) { setTone("light"); }
      };
      img.onerror = function () { if (seq === wpToneOfImage._seq) { setTone("light"); } };
      img.src = url;
    } catch (e) { setTone("light"); }
  }

  /* ---- 应用层 ----
     [FIX 2026-11-07] 统一输出 --chat-bg-art（真正参与绘制的图层），三种模式互斥：
     theme → none（露出站点自身背景）；white/color/custom → 各自图层，不再叠加站点背景 */
  function apply() {
    var page = chatRoomPage();
    if (!page) { return; }
    page.removeAttribute("data-bg");
    var st = stLoad();
    var mode = st.lastType || "theme";
    var art = "none";
    if (mode === "custom") {
      var dataUrl = lsGet(CUSTOM_KEY);
      page.style.removeProperty("--chat-bg-img");
      if (dataUrl) {
        page.style.setProperty("--chat-bg-img", 'url("' + dataUrl + '")');
        page.style.setProperty("--chat-bg", 'url("' + dataUrl + '") center / cover no-repeat');
        art = 'url("' + dataUrl + '")';
        page.setAttribute("data-wp-has-img", "1");
        wpToneOfImage(dataUrl);
      } else {
        page.style.setProperty("--chat-bg", WHITE_BG);
        art = "linear-gradient(#ffffff,#ffffff)";
        page.removeAttribute("data-wp-has-img");
        setTone("light");
      }
    } else {
      page.style.removeProperty("--chat-bg-img"); /* 切离上传图时清掉图片残留 */
      page.removeAttribute("data-wp-has-img");
      /* 随机弥散：切到 rr 但无缓存 / 改色后缓存失效时重掷，避免出现空白背景 */
      if (mode === "color" && st.colorType === "gradient" && (st.gradDir || "tb") === "rr") {
        var rp = st.rrParams || { spots: 5, size: 55, soft: 65 };
        var sig = [st.color, st.color2, st.color3, rp.spots, rp.size, rp.soft].join("|");
        if (!st.rrCss || st.rrSig !== sig) {
          st.rrCss = randomBloomCss(st.color || "#f6f8fc", st.color2 || "#c7d2dc", st.color3 || "#e8eef6", rp);
          st.rrSig = sig;
          stSave(st);
        }
      }
      var bg = buildLayers();
      page.style.setProperty("--chat-bg", bg);
      if (mode === "white") {
        art = "linear-gradient(#ffffff,#ffffff)";
        setTone("light");
      } else if (mode === "color") {
        if (st.colorType === "gradient") {
          art = bg;
          setTone(wpToneOfColors([st.color || "#f6f8fc", st.color2 || "#c7d2dc", st.color3 || "#e8eef6"]));
        } else {
          art = "linear-gradient(" + bg + "," + bg + ")";
          setTone(wpToneOfColors([st.color || "#f6f8fc"]));
        }
      } else {
        /* 跟随网站外观主题：不绘制任何壁纸层，完全露出站点背景（含美化设置里的背景图） */
        art = "none";
        setTone("");
      }
    }
    page.style.setProperty("--chat-bg-art", art);
    setWpMode(mode);
    /* v44：仅当用户主动自定义过栏外观才接管；未自定义时完全复刻改动前的默认行为 */
    if (barCustomActive(st)) {
      setBarCustomAttr(page, st);
    } else {
      clearBarPaint(page);
      if (mode === "color") { page.setAttribute("data-bar-mode", st.barMode || "half"); }
      else { page.removeAttribute("data-bar-mode"); }
    }
    bindBarThemeObserver();
    applyBarColors(st);
  }
  function applyCustom(dataUrl) {
    var page = chatRoomPage();
    if (!page) { return; }
    if (dataUrl) {
      page.style.setProperty("--chat-bg", 'url("' + dataUrl + '") center / cover no-repeat');
      page.style.setProperty("--chat-bg-img", 'url("' + dataUrl + '")');
      page.style.setProperty("--chat-bg-art", 'url("' + dataUrl + '")');
      page.setAttribute("data-wp-has-img", "1");
      setWpMode("custom");
      wpToneOfImage(dataUrl);
    }
  }
  function setMode(mode) {
    var st = stLoad();
    if (mode === "custom" && !lsGet(CUSTOM_KEY)) {
      /* [FIX 2026-11-07] 尚无上传图时先只唤起选图，不落盘模式：
         否则用户取消选图后 state= custom 但无图，下次进聊天室会变成空白背景 */
      chooseChatBgFile();
      return;
    }
    st.lastType = mode;
    stSave(st);
    apply();
    render(st);
  }
  function setColorType(type) {
    var st = stLoad();
    st.colorType = (type === "gradient") ? "gradient" : "solid";
    stSave(st);
    if (st.lastType === "color") { apply(); }
    render(st);
  }
  function setGradDir(dir) {
    var st = stLoad();
    st.gradDir = dir;
    stSave(st);
    if (st.lastType === "color" && st.colorType === "gradient") { apply(); }
    render(st);
  }
  function setBarMode(mode) {
    var st = stLoad();
    st.barMode = (mode === "full" || mode === "clear" || mode === "transparent") ? mode : "half";
    st.barCustom = true;
    stSave(st);
    apply();
    render(st);
    syncBarSettings();
  }
  function onColorInput(which, val) {
    var st = stLoad();
    if (which === "color1") { st.color = val; }
    else if (which === "color2") { st.color2 = val; }
    else { st.color3 = val; }
    stSave(st);
    if (st.lastType === "color") { apply(); }
    render(st);
  }

  /* ---- v44 顶栏底栏配色（自定义色存于壁纸状态 st，未设置=跟随主题） ---- */
  function barThemeDefault() {
    var dark = (document.documentElement.getAttribute("data-theme-mode") === "dark");
    return {
      key: dark ? "#c8d2e6" : "#5a6478",
      title: dark ? "#9aa4bb" : "#8c93a8",
      bg: dark ? "#1a202b" : "#f1f3f7"
    };
  }
  /* 依据栏底色自动判断文字明暗，保证亮色 / 暗色主题下都可读 */
  function barAutoInk(bg) {
    if (!bg) { return ""; }
    return (wpToneOfColors([bg]) === "dark") ? "light" : "dark";
  }
  /* 自定义是否生效：用户点过栏模式，或设置过任一栏颜色 */
  function barCustomActive(st) {
    st = st || stLoad();
    return !!(st.barCustom || st.barBg || st.barKey || st.barTitle);
  }
  /* 未自定义时移除所有栏外观接管属性，浏览器回落到各主题原生样式 */
  function setBarCustomAttr(page, st) {
    page = page || chatRoomPage();
    if (!page) { return; }
    if (barCustomActive(st)) {
      var mode = (st && st.barMode) || stLoad().barMode || "half";
      page.setAttribute("data-bar-custom", "1");
      page.setAttribute("data-bar-mode", mode);
    } else {
      page.removeAttribute("data-bar-custom");
      page.removeAttribute("data-bar-mode");
    }
  }
  /* 清空全部接管痕迹：选择器属性 / 变量 / 内联上色 */
  function clearBarPaint(page) {
    page = page || chatRoomPage();
    if (!page) { return; }
    page.removeAttribute("data-bar-custom");
    page.removeAttribute("data-bar-bg");
    page.removeAttribute("data-bar-key");
    page.removeAttribute("data-bar-title");
    page.removeAttribute("data-bar-ink");
    page.style.removeProperty("--wp-bar");
    page.style.removeProperty("--bar-key-color");
    page.style.removeProperty("--bar-title-color");
    clearPaint(page);
  }
  function applyBarColors(st) {
    st = st || stLoad();
    var page = chatRoomPage();
    if (!page) { return; }
    /* 未自定义：完全回到主题原生默认，不写任何属性/变量/内联样式 */
    if (!barCustomActive(st)) { clearBarPaint(page); return; }
    setBarCustomAttr(page, st);
    var mode = st.barMode || "half";
    var bg = st.barBg || "";
    var root = document.documentElement;
    /* 主题判定以 data-theme-mode 为准：data-polarity 是视觉极性(阴阳)，在亮色下也可能为 yin */
    var tm = root.getAttribute("data-theme-mode");
    var themeDark = (tm === "dark");
    if (tm !== "dark" && tm !== "light") { themeDark = (root.getAttribute("data-polarity") === "yin"); }
    var ink = "", autoKey = "", autoTitle = "";
    /* 只有用户改过背景色时才需要自适应墨色；其余情况不动文字颜色 */
    if (bg) {
      ink = (mode === "transparent") ? "" : (barAutoInk(bg) || (themeDark ? "light" : "dark"));
      autoKey = (ink === "light") ? "#eef2fa" : (ink === "dark" ? "#333a45" : "");
      autoTitle = (ink === "light") ? "#f2f6ff" : (ink === "dark" ? "#2b3340" : "");
    }
    var key = st.barKey || autoKey;
    var title = st.barTitle || autoTitle;
    if (bg) { page.style.setProperty("--wp-bar", bg); page.setAttribute("data-bar-bg", "1"); }
    else { page.style.removeProperty("--wp-bar"); page.removeAttribute("data-bar-bg"); }
    if (key) { page.style.setProperty("--bar-key-color", key); page.setAttribute("data-bar-key", "1"); }
    else { page.style.removeProperty("--bar-key-color"); page.removeAttribute("data-bar-key"); }
    if (title) { page.style.setProperty("--bar-title-color", title); page.setAttribute("data-bar-title", "1"); }
    else { page.style.removeProperty("--bar-title-color"); page.removeAttribute("data-bar-title"); }
    if (ink) { page.setAttribute("data-bar-ink", ink); }
    else { page.removeAttribute("data-bar-ink"); }
    paintBars(key, title, ink);
  }
  /* 阴阳主题存在 `body :not(#\9){color:#fff!important}` 全量白色强制块（含 ID 级特异性），
     CSS 规则无法稳定压过，故对栏内文字改为内联 !important 上色，确保自定义色即时可见、明暗主题都可读 */
  var BAR_PAINT_SEL = [
    ".chat-room-head .back-btn",
    ".chat-room-head .chat-room-clear",
    ".chat-room-head .chat-room-snow-btn",
    ".chat-room-head .chat-room-plus-btn",
    ".chat-input-wrap .chat-bar-btn",
    ".chat-room-head .chat-room-name",
    ".chat-room-head .chat-room-streak",
    ".chat-room-head .chat-streak-num",
    ".chat-room-head .chat-room-titles",
    ".chat-room-info"
  ];
  function paintTree(root, color) {
    if (!root) { return; }
    root.style.setProperty("color", color, "important");
    var kids = root.querySelectorAll("*");
    for (var i = 0; i < kids.length; i++) { kids[i].style.setProperty("color", color, "important"); }
  }
  /* 输入区文字同样可能被上色，清理时必须一并覆盖，避免重置后残留内联 !important */
  var BAR_INPUT_SEL = [
    ".chat-input-wrap textarea",
    ".chat-input-wrap input",
    ".chat-input-wrap .chat-input-ph"
  ];
  function clearPaint(page) {
    page = page || chatRoomPage();
    if (!page) { return; }
    var sel = BAR_PAINT_SEL.concat(BAR_INPUT_SEL);
    for (var i = 0; i < sel.length; i++) {
      var list = page.querySelectorAll(sel[i]);
      for (var j = 0; j < list.length; j++) {
        list[j].style.removeProperty("color");
        var kids = list[j].querySelectorAll("*");
        for (var k = 0; k < kids.length; k++) { kids[k].style.removeProperty("color"); }
      }
    }
  }
  function paintBars(key, title, ink) {
    var page = chatRoomPage();
    if (!page) { return; }
    clearPaint();
    var inkText = (ink === "light") ? "#ffffff" : (ink === "dark" ? "#2b3345" : "");
    if (inkText) {
      var tas = page.querySelectorAll(".chat-input-wrap textarea, .chat-input-wrap input, .chat-input-wrap .chat-input-ph");
      for (var q = 0; q < tas.length; q++) { paintTree(tas[q], inkText); }
    }
    if (key) {
      var keySel = [".chat-room-head .back-btn", ".chat-room-head .chat-room-clear",
                    ".chat-room-head .chat-room-snow-btn",
                    ".chat-room-head .chat-room-plus-btn",
                    ".chat-input-wrap .chat-bar-btn"];
      for (var i = 0; i < keySel.length; i++) {
        var list = page.querySelectorAll(keySel[i]);
        for (var j = 0; j < list.length; j++) { paintTree(list[j], key); }
      }
    }
    if (title) {
      /* 心跳容器只用于清理历史内联色，不参与上色；标题色只作用于昵称与连续聊天天数 */
      var tSel = [".chat-room-head .chat-room-name",
                  ".chat-room-head .chat-streak-num",
                  ".chat-room-info"];
      for (var n = 0; n < tSel.length; n++) {
        var tl = page.querySelectorAll(tSel[n]);
        for (var m = 0; m < tl.length; m++) { paintTree(tl[m], title); }
      }
    }
  }
  function bindBarThemeObserver() {
    if (window.__barThemeObs || !window.MutationObserver) { return; }
    try {
      window.__barThemeObs = new MutationObserver(function () {
        try { applyBarColors(); } catch (e) {}
      });
      window.__barThemeObs.observe(document.documentElement,
        { attributes: true, attributeFilter: ["data-theme-mode", "data-polarity"] });
    } catch (e) {}
  }
  function setBarColor(kind, val) {
    var st = stLoad();
    var v = String(val || "");
    if (kind === "title") { st.barTitle = v; st.barCustom = true; }
    else if (kind === "bg") { st.barBg = v; st.barCustom = true; }
    else { st.barKey = v; st.barCustom = true; }
    stSave(st);
    apply();
    syncBarSettings();
  }
  function resetBarColor(kind) {
    var st = stLoad();
    if (kind === "title") { st.barTitle = ""; }
    else if (kind === "bg") { st.barBg = ""; }
    else { st.barKey = ""; }
    if (!st.barBg && !st.barKey && !st.barTitle) { st.barCustom = false; }
    stSave(st);
    apply();
    syncBarSettings();
    toast("已恢复跟随主题");
  }
  function resetBarColors() {
    var st = stLoad();
    st.barKey = ""; st.barTitle = ""; st.barBg = "";
    st.barCustom = false;
    stSave(st);
    clearBarPaint();
    var pg2 = chatRoomPage();
    if (pg2) { pg2.removeAttribute("data-bar-mode"); }
    apply();
    syncBarSettings();
    toast("已恢复各主题原生默认外观");
  }
  /* 同步「顶栏底栏设置」页 UI（模式选中态 / 色值 / 重置键可用态） */
  function syncBarSettings() {
    var st = stLoad();
    var active = barCustomActive(st);
    var mode = st.barMode || "half";
    var btns = document.querySelectorAll("#bbsModeList .bbs-mode-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("is-active", active && btns[i].getAttribute("data-mode") === mode);
    }
    var hintEl = document.querySelector("#bbsModeList");
    var panelHint = hintEl ? hintEl.parentNode.querySelector(".bbs-hint") : null;
    if (panelHint) {
      panelHint.textContent = active
        ? "栏背景显示独立于壁纸模式，无论壁纸是跟随主题、纯白还是自定义图片都生效。"
        : "当前为各主题原生默认外观；选择上方任一模式或设置颜色后才会接管并记忆在本机。";
    }
    var df = barThemeDefault();
    var root2 = document.documentElement;
    var tDark = (root2.getAttribute("data-theme-mode") === "dark") || (root2.getAttribute("data-polarity") === "yin");
    var i2 = st.barBg ? (barAutoInk(st.barBg) || (tDark ? "light" : "dark")) : "";
    var aKey = (i2 === "light") ? "#f3f6ff" : (i2 === "dark" ? "#333a45" : df.key);
    var aTitle = (i2 === "light") ? "#f7f9ff" : (i2 === "dark" ? "#2b3340" : df.title);
    var kEl = el("bbsKeyColor"), tEl = el("bbsTitleColor"), gEl = el("bbsBgColor");
    if (kEl) { kEl.value = st.barKey || aKey; }
    if (tEl) { tEl.value = st.barTitle || aTitle; }
    if (gEl) { gEl.value = st.barBg || df.bg; }
    var kR = el("bbsKeyReset"), tR = el("bbsTitleReset"), gR = el("bbsBgReset");
    if (kR) { kR.classList.toggle("is-off", !st.barKey); kR.disabled = !st.barKey; }
    if (tR) { tR.classList.toggle("is-off", !st.barTitle); tR.disabled = !st.barTitle; }
    if (gR) { gR.classList.toggle("is-off", !st.barBg); gR.disabled = !st.barBg; }
  }

  /* 渲染面板（模式选中态 / 颜色控件 / 清除按钮可见性） */
  function render(st) {
    st = st || stLoad();
    var mode = st.lastType || "theme";
    var themeBtn = el("wp13ThemeBtn"), whiteBtn = el("wp13WhiteBtn"), colorBtn = el("wp13ColorBtn");
    if (themeBtn) { themeBtn.classList.toggle("is-active", mode === "theme"); }
    if (whiteBtn) { whiteBtn.classList.toggle("is-active", mode === "white"); }
    if (colorBtn) { colorBtn.classList.toggle("is-active", mode === "color"); }
    var typeSolid = el("wp13TypeSolid"), typeGrad = el("wp13TypeGrad");
    if (typeSolid) { typeSolid.classList.toggle("is-active", st.colorType !== "gradient"); }
    if (typeGrad) { typeGrad.classList.toggle("is-active", st.colorType === "gradient"); }
    var c1 = el("wp13Color1"), c2 = el("wp13Color2"), c2Wrap = el("wp13Color2Wrap"), dirWrap = el("wp13GradDirWrap");
    if (c1) { c1.value = st.color || "#f6f8fc"; }
    if (c2) { c2.value = st.color2 || "#c7d2dc"; }
    if (c2Wrap) { c2Wrap.style.display = (st.colorType === "gradient") ? "" : "none"; }
    if (dirWrap) { dirWrap.style.display = (st.colorType === "gradient") ? "" : "none"; }
    var dirBtns = dirWrap ? dirWrap.querySelectorAll(".wp13-dir-btn") : [];
    for (var i = 0; i < dirBtns.length; i++) {
      dirBtns[i].classList.toggle("is-active", dirBtns[i].getAttribute("data-dir") === (st.gradDir || "tb"));
    }
    var colorZone = el("wp13ColorZone");
    if (colorZone) { colorZone.style.display = (mode === "color") ? "" : "none"; }
    /* v44：壁纸面板不再包含顶栏 / 底栏选项（已迁到「设置 → 顶栏底栏设置」） */
    var clearBtn = el("chatBgClearBtn");
    if (clearBtn) { clearBtn.hidden = !lsGet(CUSTOM_KEY); }
    var c3 = el("wp13Color3"), c3Wrap = el("wp13Color3Wrap");
    if (c3) { c3.value = st.color3 || "#e8eef6"; }
    if (c3Wrap) { c3Wrap.style.display = (st.colorType === "gradient") ? "" : "none"; }
    var rrZone = el("wp13RrZone");
    if (rrZone) { rrZone.style.display = (mode === "color" && st.colorType === "gradient" && st.gradDir === "rr") ? "" : "none"; }
    var rrP = st.rrParams || { spots: 5, size: 55, soft: 65 };
    var spotsEl = el("wp13RrSpots"), sizeEl = el("wp13RrSize"), softEl = el("wp13RrSoft");
    var spotsVal = el("wp13RrSpotsVal"), sizeVal = el("wp13RrSizeVal"), softVal = el("wp13RrSoftVal");
    if (spotsEl) { spotsEl.value = String(rrP.spots); }
    if (spotsVal) { spotsVal.textContent = String(rrP.spots); }
    if (sizeEl) { sizeEl.value = String(rrP.size); }
    if (sizeVal) { sizeVal.textContent = String(rrP.size); }
    if (softEl) { softEl.value = String(rrP.soft); }
    if (softVal) { softVal.textContent = String(rrP.soft); }
    renderRrTpls(st);
  }

  /* ---- v23：随机弥散调节 / 模板 ---- */
  function rrColors(st) {
    return [st.color || "#f6f8fc", st.color2 || "#c7d2dc", st.color3 || "#e8eef6"];
  }
  function setRrParam(kind, val) {
    var st = stLoad();
    if (!st.rrParams || typeof st.rrParams !== "object") { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var n = Number(val);
    if (kind === "spots") { st.rrParams.spots = Math.min(8, Math.max(3, Math.round(n))); }
    else if (kind === "size") { st.rrParams.size = Math.min(95, Math.max(30, Math.round(n))); }
    else if (kind === "soft") { st.rrParams.soft = Math.min(100, Math.max(35, Math.round(n))); }
    /* 参数变化 → 按新参数重新生成一版随机效果并固化 */
    var cols = rrColors(st);
    st.rrCss = randomBloomCss(cols[0], cols[1], cols[2], st.rrParams);
    stSave(st);
    if (st.lastType === "color" && st.colorType === "gradient" && st.gradDir === "rr") { apply(); }
    render(st);
  }
  function rerollRr() {
    /* 重新随机：仅重掷光斑布局，沿用当前参数 */
    var st = stLoad();
    if (!st.rrParams || typeof st.rrParams !== "object") { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var cols = rrColors(st);
    st.rrCss = randomBloomCss(cols[0], cols[1], cols[2], st.rrParams);
    stSave(st);
    if (st.lastType === "color" && st.colorType === "gradient" && st.gradDir === "rr") { apply(); }
    render(st);
    toast("已重新随机弥散效果");
  }
  function saveRrTemplate() {
    var st = stLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    if (!st.rrParams || typeof st.rrParams !== "object") { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var nameEl = el("wp13RrName");
    var name = (nameEl && String(nameEl.value || "").trim()) ? String(nameEl.value).trim() : ("模板 " + (st.rrTemplates.length + 1));
    var cols = rrColors(st);
    var tpl = {
      id: "rr_" + Date.now(),
      name: name,
      params: { spots: st.rrParams.spots, size: st.rrParams.size, soft: st.rrParams.soft },
      css: st.rrCss || randomBloomCss(cols[0], cols[1], cols[2], st.rrParams)
    };
    st.rrTemplates.push(tpl);
    if (st.rrTemplates.length > 12) { st.rrTemplates.shift(); } /* 最多保留 12 个模板 */
    stSave(st);
    if (nameEl) { nameEl.value = ""; }
    render(st);
    toast("已保存模板：「" + name + "」");
  }
  function applyRrTemplate(id) {
    var st = stLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    for (var i = 0; i < st.rrTemplates.length; i++) {
      if (st.rrTemplates[i].id === id) {
        var t = st.rrTemplates[i];
        st.rrParams = { spots: t.params.spots, size: t.params.size, soft: t.params.soft };
        st.rrCss = t.css;
        st.gradDir = "rr";
        st.colorType = "gradient";
        stSave(st);
        if (st.lastType === "color") { apply(); }
        render(st);
        toast("已应用模板：「" + t.name + "」");
        return;
      }
    }
    toast("模板不存在或已被删除");
  }
  function deleteRrTemplate(id) {
    var st = stLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    for (var i = 0; i < st.rrTemplates.length; i++) {
      if (st.rrTemplates[i].id === id) {
        var name = st.rrTemplates[i].name;
        st.rrTemplates.splice(i, 1);
        stSave(st);
        render(st);
        toast("已删除模板：「" + name + "」");
        return;
      }
    }
  }
  function renderRrTpls(st) {
    var wrap = el("wp13RrTpls");
    if (!wrap) { return; }
    var tpls = (st && Array.isArray(st.rrTemplates)) ? st.rrTemplates : [];
    wrap.innerHTML = "";
    if (!tpls.length) {
      var empty = document.createElement("div");
      empty.className = "wp13-rr-tpl-empty";
      empty.textContent = "暂无模板，可保存当前效果";
      wrap.appendChild(empty);
      return;
    }
    for (var i = 0; i < tpls.length; i++) {
      var t = tpls[i];
      var row = document.createElement("div");
      row.className = "wp13-rr-tpl";
      var nm = document.createElement("span");
      nm.className = "wp13-rr-tpl-name";
      nm.textContent = t.name || ("模板 " + (i + 1));
      var ab = document.createElement("button");
      ab.type = "button";
      ab.className = "wp13-rr-tpl-btn";
      ab.textContent = "应用";
      ab.onclick = (function (id) { return function () { SnowCrystal.Chat.applyRrTemplate(id); }; })(t.id);
      var db = document.createElement("button");
      db.type = "button";
      db.className = "wp13-rr-tpl-btn is-danger";
      db.textContent = "删除";
      db.onclick = (function (id) { return function () { SnowCrystal.Chat.deleteRrTemplate(id); }; })(t.id);
      row.appendChild(nm);
      row.appendChild(ab);
      row.appendChild(db);
      wrap.appendChild(row);
    }
  }

  /* 自定义上传：任意尺寸 / 任意大小，双保险永久保存 */
  function chooseChatBgFile() {
    var input = el("chatBgFileInput");
    if (!input) { return; }
    input.value = "";
    input.click();
  }
  function onChatBgFileChange(ev) {
    var file = ev.target && ev.target.files && ev.target.files[0];
    if (!file) { return; }
    if (!/^image\//.test(file.type)) { toast("请选择图片文件"); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || "");
      if (!dataUrl) { toast("图片读取失败"); return; }
      lsSet(CUSTOM_KEY, dataUrl);
      idbSet(dataUrl).then(function () { /* 双保险已写入 */ });
      var st = stLoad();
      st.lastType = "custom";
      stSave(st);
      applyCustom(dataUrl);
      render(st);
      toast("自定义壁纸已应用并永久保存");
    };
    reader.onerror = function () { toast("图片读取失败"); };
    /* 不限制文件大小与尺寸：超长条图 / 超大图均可完整读入并保存 */
    reader.readAsDataURL(file);
  }
  function clearChatBgCustom() {
    lsDel(CUSTOM_KEY);
    lsDel(OLD_BG_KEY); 
    idbDel();
    var st = stDefault();
    stSave(st);
    apply();
    render(st);
    toast("已移除自定义壁纸，恢复跟随主题");
  }
  function resetWallpaper() {
    lsDel(KEY);
    lsDel(CUSTOM_KEY);
    lsDel(OLD_BG_KEY); 
    idbDel();
    var st = stDefault();
    stSave(st);
    apply();
    render(st);
    toast("已恢复默认壁纸（跟随主题）");
  }

  /* 持久化恢复：theme / white / color / custom 四模式 */
  function applyStored() {
    lsDel(OLD_BG_KEY); 
    var st = stLoad();
    if (st.lastType === "custom") {
      var custom = lsGet(CUSTOM_KEY);
      if (custom) { applyCustom(custom); render(st); return; }
      idbGet().then(function (idbVal) {
        if (idbVal) {
          lsSet(CUSTOM_KEY, idbVal);
          applyCustom(idbVal);
          render(st);
        } else {
          var s2 = stDefault();
          stSave(s2);
          apply();
          render(s2);
        }
      }).catch(function () { var s2 = stDefault(); stSave(s2); apply(); render(s2); });
      return;
    }
    apply();
    render(st);
  }

  /* ---- 面板开合 ---- */
  function openPanel() {
    var mask = el("wallpaperMask"), panel = el("wallpaperPanel");
    if (!mask || !panel) { return; }
    if (!document.body.classList.contains("chat-bg-open")) {
      if (Chat.togglePlusPanel) { Chat.togglePlusPanel(false); }
      if (Chat.toggleEmojiPanel) { Chat.toggleEmojiPanel(false); }
      try { if (window.SnowCrystal && SnowCrystal.toggleChatRoomMenu) { SnowCrystal.toggleChatRoomMenu(false); } } catch (e) { /* ignore */ }
    }
    var st = stLoad();
    render(st);
    mask.classList.add("is-open");
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("chat-bg-open");
  }
  function closePanel() {
    var mask = el("wallpaperMask"), panel = el("wallpaperPanel");
    if (!mask || !panel) { return; }
    mask.classList.remove("is-open");
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("chat-bg-open");
  }
  function togglePanel() {
    var panel = el("wallpaperPanel");
    if (!panel) { return; }
    if (panel.classList.contains("is-open")) { closePanel(); } else { openPanel(); }
  }

  /* 导出覆盖（末尾追加模块，覆盖 v6/v7/v8/v9 同名导出） */
  Chat.openChatBgPanel = openPanel;
  Chat.closeChatBgPanel = closePanel;
  Chat.toggleChatBgPanel = togglePanel;
  Chat.chooseChatBgFile = chooseChatBgFile;
  Chat.onChatBgFileChange = onChatBgFileChange;
  Chat.clearChatBgCustom = clearChatBgCustom;
  Chat.resetWallpaper = resetWallpaper;
  Chat.applyStored = applyStored;
  Chat.setWallpaperMode = setMode;
  Chat.setColorType = setColorType;
  Chat.setGradDir = setGradDir;
  Chat.setBarMode = setBarMode;
  Chat.setBarColor = setBarColor;
  Chat.resetBarColor = resetBarColor;
  Chat.resetBarColors = resetBarColors;
  Chat.syncBarSettings = syncBarSettings;
  Chat.applyBarColors = applyBarColors;
  Chat.onColorInput = onColorInput;
  Chat.setBlurType = setBlurType;
  Chat.setBlurDir = setBlurDir;
  Chat.setBlurAmt = setBlurAmt;
  Chat.setGrain = setGrain;
  Chat.setGrainAmt = setGrainAmt;
  Chat.setRrParam = setRrParam;
  Chat.rerollRr = rerollRr;
  Chat.saveRrTemplate = saveRrTemplate;
  Chat.applyRrTemplate = applyRrTemplate;
  Chat.deleteRrTemplate = deleteRrTemplate;
  Chat.wpToneOfColors = wpToneOfColors;

  /* [FIX 2026-11-07] 页面加载即按持久化设置渲染壁纸，不必先进入聊天室 */
  function wpInit() { try { applyStored(); } catch (e) { /* ignore */ } }
  wpInit();
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", wpInit); }

  /* ---- 互斥包装：其他面板开关先关壁纸面板，防双重弹出 ---- */
  var origTogglePlus = Chat.togglePlusPanel;
  Chat.togglePlusPanel = function (v) {
    if (typeof v === "undefined" || v === true) { closePanel(); }
    return origTogglePlus.apply(Chat, arguments);
  };
  var origToggleEmoji = Chat.toggleEmojiPanel;
  Chat.toggleEmojiPanel = function (v) {
    if (typeof v === "undefined" || v === true) { closePanel(); }
    return origToggleEmoji.apply(Chat, arguments);
  };
  var origMenu = window.SnowCrystal && window.SnowCrystal.toggleChatRoomMenu;
  if (origMenu && window.SnowCrystal) {
    window.SnowCrystal.toggleChatRoomMenu = function (v) {
      if (typeof v === "undefined" || v === true) { closePanel(); }
      return origMenu.apply(window.SnowCrystal, arguments);
    };
  }

  /* 输入控件绑定（change 已由面板内联 onchange 绑定，避免重复触发） */

  /* ---- 聊天室激活时按 lastType 应用持久化状态 ---- */
  var lastApplied = null;
  function maybeApply() {
    var page = chatRoomPage();
    if (!page) { lastApplied = null; return; }
    var visible = page.classList.contains("is-active");
    if (visible && lastApplied !== true) {
      lastApplied = true;
      applyStored();
    } else if (!visible) {
      lastApplied = false;
    }
  }
  maybeApply();
  /* 发热优化 P0-2：MutationObserver 收窄 + rAF 防抖 + 隐藏断开重连 */
  var _moTick = false;
  function _moSchedule() {
    if (_moTick) { return; }
    _moTick = true;
    requestAnimationFrame(function () {
      _moTick = false;
      maybeApply();
      _observeActivation();
    });
  }
  var _activationMo = null;
  var _activationMoTarget = null;
  function _observeActivation() {
    if (document.hidden) { return; } /* 隐藏时不观察 */
    var page = chatRoomPage();
    var target = page || document.body;
    if (_activationMo && _activationMoTarget === target) { return; }
    if (_activationMo) { _activationMo.disconnect(); _activationMo = null; }
    try {
      _activationMo = new MutationObserver(_moSchedule);
      if (page) {
        _activationMo.observe(page, { attributes: true, attributeFilter: ["class"] });
      } else {
        /* 页面尚未创建：退化为 body 观察，创建后 _moSchedule 自动切换 */
        _activationMo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      }
      _activationMoTarget = target;
    } catch (e) { _activationMo = null; _activationMoTarget = null; }
  }
  if (typeof window !== "undefined" && window.MutationObserver) {
    _observeActivation();
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (_activationMo) { _activationMo.disconnect(); _activationMo = null; _activationMoTarget = null; }
        } else {
          _observeActivation();
        }
      });
    }
  }
})();
