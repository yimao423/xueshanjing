/* 雪山晶 · 08-theme-zones ｜ 源：雪山晶.html L7259-L7716 ｜ JS 模块 */
function zoneEach(fn) {
    for (var g = 0; g < ZONE_GROUPS.length; g++) {
      for (var i = 0; i < ZONE_GROUPS[g].zones.length; i++) { fn(ZONE_GROUPS[g].zones[i], ZONE_GROUPS[g]); }
    }
  }
  function zoneEachSub(fn) {
    for (var g = 0; g < ZONE_GROUPS.length; g++) {
      for (var i = 0; i < ZONE_GROUPS[g].zones.length; i++) {
        if (!ZONE_GROUPS[g].zones[i].subs) { continue; }
        for (var s = 0; s < ZONE_GROUPS[g].zones[i].subs.length; s++) { fn(ZONE_GROUPS[g].zones[i].subs[s]); }
      }
    }
  }
  function zoneLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(ZONE_KEY) : null;
      if (!raw) { return; }
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") { return; }
      if (saved.ico && typeof saved.ico === "object") { zoneState.ico = saved.ico; }
      if (saved.txt && typeof saved.txt === "object") { zoneState.txt = saved.txt; }
      if (saved.card && typeof saved.card === "object") { zoneState.card = saved.card; }
    if (saved.cp && typeof saved.cp === "object") { zoneState.cp = saved.cp; }
    if (saved.cpa && typeof saved.cpa === "object") { zoneState.cpa = saved.cpa; }
    if (saved.cpt && typeof saved.cpt === "object") { zoneState.cpt = saved.cpt; }
    if (saved.cpb && typeof saved.cpb === "object") { zoneState.cpb = saved.cpb; }
      if (saved.fc && typeof saved.fc === "object") { zoneState.fc = saved.fc; }
      if (saved.ic && typeof saved.ic === "object") { zoneState.ic = saved.ic; }
      if (saved.cc && typeof saved.cc === "object") { zoneState.cc = saved.cc; }
      if (saved.ca && typeof saved.ca === "object") { zoneState.ca = saved.ca; }
      if (zoneState.txt && !zoneState.txt[FONT_KEY]) {
        var legacy = ["home", "wordcard", "discover", "settings", "tabbar"], t;
        for (t = 0; t < legacy.length; t++) {
          if (zoneState.txt[legacy[t]]) { zoneState.txt = { global: zoneState.txt[legacy[t]] }; break; }
        }
        if (!zoneState.txt[FONT_KEY]) { zoneState.txt = {}; }
      }
    } catch (e) { /* 读不到就用默认 */ }
  }
  function zoneSave() {
    try { if (window.localStorage) { window.localStorage.setItem(ZONE_KEY, JSON.stringify(zoneState)); } } catch (e) { /* 忽略 */ }
  }
  /* 卡片不透明度（%）：v34 起区间 0%~100% —— 缺省 / 脏数据回落到「当前主题默认」；0 为有效值（完全透明 */
  function themeCardDefault(key) {
    if (state.key === "default") { return (key === "tabbar") ? CARD_DEF : 20; }
    return CARD_DEF;
  }
  function cardPct(key) {
    var n = parseInt(zoneState.card[key], 10);
    if (!isFinite(n)) { return themeCardDefault(key); }
    return Math.max(CARD_MIN, Math.min(CARD_MAX, n));
  }
  /* 注意：本函数名不能叫 hexToRgb —— 上面调色板已有一个同名 hexToRgb（返回 {r,g,b}）， */
  function hexToRgbTriple(hex) {
    var s = String(hex || "").replace("#", "");
    if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
    if (!/^[0-9a-fA-F]{6}$/.test(s)) { return null; }
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function fontTint(c, a) {
    return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")";
  }
  var TEXT_VARS = ["--text", "--text-1", "--text-2", "--text-3", "--text-4", "--text-5", "--text-title", "--sub"];
  function applyFontColor() {
    var root = document.documentElement, i, name;
    var c = hexToRgbTriple(zoneState.txt[FONT_KEY]);
    if (!c) {
      if (state.key === "default") {
        var _gray = { "--text": "#14161A", "--text-1": "#14161A", "--text-2": "#4A5058", "--text-3": "#767D87", "--text-4": "#9AA0A9", "--text-5": "#C9C9C9", "--text-title": "#14161A", "--sub": "#4A5058" };
        for (i = 0; i < TEXT_VARS.length; i++) { root.style.setProperty(TEXT_VARS[i], _gray[TEXT_VARS[i]] || "#14161A"); }
        return;
      }
      /* 未自定义：回到主题色板默认 —— 亮色主题 = 黑色系，暗色 = 自适应亮色 */
      for (i = 0; i < TEXT_VARS.length; i++) {
        name = TEXT_VARS[i];
        if (lastPalette[name]) { root.style.setProperty(name, lastPalette[name]); }
        else { root.style.removeProperty(name); }
      }
      return;
    }
    root.style.setProperty("--text", fontTint(c, 1));
    root.style.setProperty("--text-1", fontTint(c, 1));
    root.style.setProperty("--text-2", fontTint(c, 0.88));
    root.style.setProperty("--text-3", fontTint(c, 0.74));
    root.style.setProperty("--text-4", fontTint(c, 0.60));
    root.style.setProperty("--text-5", fontTint(c, 0.44));
    root.style.setProperty("--text-title", fontTint(c, 1));
    root.style.setProperty("--sub", fontTint(c, 0.80));
  }
  function zoneApplyVars() {
    var root = document.documentElement;
    zoneEach(function (z) {
      var name = "--zone-ico-" + z.key, val = zoneState.ico[z.key], pct;
      if (val) { root.style.setProperty(name, val); } else { root.style.removeProperty(name); }
      /* 字体色已改为全站统一（见 applyFontColor），旧的区域字体变量一律清掉 */
      root.style.removeProperty("--zone-txt-" + z.key);
      pct = cardPct(z.key);
      if (pct === CARD_DEF) { root.style.removeProperty("--zc-a-" + z.key); }
      else { root.style.setProperty("--zc-a-" + z.key, (pct / 100).toFixed(3)); }
    });
    zoneEachSub(function (sub) {
      var spct = cardPct(sub.key);
      var v37DefFrame = (state.key === "default" && sub.key === "frame"
                         && !isFinite(parseInt(zoneState.card["frame"], 10)));
      if (v37DefFrame) { root.style.setProperty("--zc-a-frame", "1"); }
      else if (spct === CARD_DEF) { root.style.removeProperty("--zc-a-" + sub.key); }
      else { root.style.setProperty("--zc-a-" + sub.key, (spct / 100).toFixed(3)); }
    });
    applyCompColors();
    applyFontColor();
    applyFontColors();   
    applyIconColors();   
    applyCardColors();   
    refreshSwatchColors();   
    zoneApplyPages();
  }
  /* 区域卡片系数 → 各二级页根节点（--zc-a），页内卡片统一读 var(--zc-a) */
  function zoneApplyPages() {
    var pages = document.querySelectorAll(".page"), i, key, zone, pct, off;
    if (pages && pages.length) {
      for (i = 0; i < pages.length; i++) {
        key = pages[i].getAttribute("data-page");
        zone = PAGE_ZONE[key];
        if (!zone) {
          pages[i].style.removeProperty("--zc-a");
          pages[i].removeAttribute("data-zc-off");
          continue;
        }
        pct = cardPct(zone);
        pages[i].style.setProperty("--zc-a", (pct / 100).toFixed(3));
        if (pct === 0) { pages[i].setAttribute("data-zc-off", "1"); }
        else { pages[i].removeAttribute("data-zc-off"); }
      }
    }
    var navBar = document.querySelector(".bottom-nav");
    if (navBar) {
      off = (cardPct("tabbar") === 0) || (ccPct("tabbar") === 0);
      if (off) { navBar.setAttribute("data-zc-off", "1"); }
      else { navBar.removeAttribute("data-zc-off"); }
    }
  }
  function zonePanelHtml(kind) {
    var html = "", g, i, z, v, pct;
    if (kind === "txt") {
      v = zoneState.txt[FONT_KEY] || "";
      return '<p class="zone-group">全站文字</p>' +
        '<div class="zone-row" data-kind="txt" data-zone="' + FONT_KEY + '">' +
          '<div class="zone-info">' +
            '<span class="zone-name">全局字体颜色</span>' +
            '<span class="zone-desc">一处设置，全站文字（标题 · 正文 · 说明 · 角标 · 底栏）一起变</span>' +
          '</div>' +
          '<input class="zone-color" type="color" value="' + (v || "#000000") + '" data-kind="txt" data-zone="' + FONT_KEY + '" aria-label="全局字体颜色">' +
          '<span class="zone-hex" data-hex="txt:' + FONT_KEY + '">' + (v ? v.toUpperCase() : "亮色默认黑") + '</span>' +
          '<button class="zone-reset" type="button" data-reset="txt:' + FONT_KEY + '" title="恢复默认（亮色黑 / 暗色自适应）">复位</button>' +
        '</div>';
    }
    for (g = 0; g < ZONE_GROUPS.length; g++) {
      html += '<p class="zone-group">' + ZONE_GROUPS[g].name + "</p>";
      for (i = 0; i < ZONE_GROUPS[g].zones.length; i++) {
        z = ZONE_GROUPS[g].zones[i];
        if (!z[kind]) { continue; }
        if (kind === "card") {
          pct = cardPct(z.key);
          html += '<div class="zone-row" data-kind="card" data-zone="' + z.key + '">' +
                    '<div class="zone-info">' +
                      '<span class="zone-name">' + z.name + '卡片</span>' +
                      '<span class="zone-desc">' + (z.cardDesc || z.desc) + "</span>" +
                    "</div>" +
                    '<input class="zone-range" type="range" min="' + CARD_MIN + '" max="' + CARD_MAX + '" step="5" value="' + pct + '" data-kind="card" data-zone="' + z.key + '" aria-label="' + z.name + '卡片不透明度">' +
                    '<span class="zone-hex" data-hex="card:' + z.key + '">' + pct + '%</span>' +
                    '<button class="zone-reset" type="button" data-reset="card:' + z.key + '" title="恢复为 100%">复位</button>' +
                  "</div>";
          if (z.subs) {
            for (var s = 0; s < z.subs.length; s++) {
              var sub = z.subs[s], spct = cardPct(sub.key);
              html += '<div class="zone-row zone-row-sub" data-kind="card" data-zone="' + sub.key + '">' +
                        '<div class="zone-info">' +
                          '<span class="zone-name">' + sub.name + "</span>" +
                          '<span class="zone-desc">' + (sub.cardDesc || sub.desc || "") + "</span>" +
                        "</div>" +
                        '<input class="zone-range" type="range" min="' + CARD_MIN + '" max="' + CARD_MAX + '" step="5" value="' + spct + '" data-kind="card" data-zone="' + sub.key + '" aria-label="' + sub.name + '不透明度">' +
                        '<span class="zone-hex" data-hex="card:' + sub.key + '">' + spct + "%</span>" +
                        '<button class="zone-reset" type="button" data-reset="card:' + sub.key + '" title="恢复为 100%">复位</button>' +
                      "</div>";
            }
          }
          continue;
        }
        v = zoneState[kind][z.key] || "";
        html += '<div class="zone-row" data-kind="' + kind + '" data-zone="' + z.key + '">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">' + z.name + "</span>" +
                    '<span class="zone-desc">' + z.desc + "</span>" +
                  "</div>" +
                  '<input class="zone-color" type="color" value="' + (v || themeSwatch()) + '" data-kind="' + kind + '" data-zone="' + z.key + '" aria-label="' + z.name + '颜色">' +
                  '<span class="zone-hex" data-hex="' + kind + ':' + z.key + '">' + (v ? v.toUpperCase() : "跟随主题") + "</span>" +
                  '<button class="zone-reset" type="button" data-reset="' + kind + ':' + z.key + '" title="恢复为跟随主题">复位</button>' +
                "</div>";
      }
    }
    return html;
  }
  function renderZonePanels() {
    zoneLoad();
    var ids = ["zoneIconPanel", "zoneTextPanel", "zoneCardPanel"], kinds = ["ico", "txt", "card"], i, host;
    for (i = 0; i < ids.length; i++) {
      host = document.getElementById(ids[i]);
      if (host) { host.innerHTML = zonePanelHtml(kinds[i]); }
    }
    zoneApplyVars();
    syncWaveUi();
    bindWavePanel();
  }
  function zoneSyncRow(kind, key) {
    var ids = kind === "ico" ? ["zoneIconPanel"]
            : (kind === "txt" ? ["zoneTextPanel"] : ["zoneCardPanel"]);
    var v = zoneState[kind] ? zoneState[kind][key] : undefined;
    for (var n = 0; n < ids.length; n++) {
      var panel = document.getElementById(ids[n]);
      if (!panel) { continue; }
      var rows = panel.querySelectorAll(".zone-row");
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute("data-zone") !== key) { continue; }
        var hex = rows[i].querySelector(".zone-hex");
        if (!hex) { continue; }
        if (kind === "card") { hex.textContent = cardPct(key) + "%"; }
        else if (kind === "txt") { hex.textContent = v ? v.toUpperCase() : "亮色默认黑"; }
        else { hex.textContent = v ? v.toUpperCase() : "跟随主题"; }
      }
    }
  }
  function zoneSet(kind, key, value) {
    if (kind === "card" || kind === "ca") {
      var n = parseInt(value, 10);
      var box = (kind === "card") ? zoneState.card : zoneState.ca;
      if (isFinite(n)) { box[key] = Math.max(CARD_MIN, Math.min(CARD_MAX, n)); }
      else { delete box[key]; }
    } else if (value) { zoneState[kind][key] = value; }
    else { delete zoneState[kind][key]; }
    zoneSave();
    zoneApplyVars();
    zoneSyncRow(kind, key);
  }
  function resetZones() {
    zoneState = { ico: {}, txt: {}, card: {}, fc: {}, ic: {}, cc: {}, ca: {}, cb: {}, cp: {}, cpa: {}, cpt: {}, cpb: {} };
    zoneSave();
    renderZonePanels();
    tip("卡片颜色、字体颜色与卡片通透度已全部复位，回到默认观感。");
  }
  function resetZoneCards() {
    zoneState.card = {};
    zoneSave();
    renderZonePanels();
    tip(state.key === "default"
      ? "各区域卡片不透明度已复位为灰色系默认（悬浮底栏 100% · 其余卡片 20%）。"
      : "各区域卡片不透明度已复位为 100%。");
  }

  var ICON_GROUPS = [
    { name: "底部导航（底栏四键）", items: [
      { key: "tab-bg",     name: "按键背景 · 未选中", desc: "底栏四个图标键的圆角底色（未激活态）" },
      { key: "tab-ink",    name: "按键图标 · 未选中", desc: "底栏四个按键的图标（未激活态）" },
      { key: "tab-bg-on",  name: "按键背景 · 激活态", desc: "当前所在页对应的那个按键（激活态）" },
      { key: "tab-ink-on", name: "按键图标 · 激活态", desc: "激活按键的图标（默认白色）" },
      { key: "snow",       name: "底栏雪花按键", desc: "右下角那枚雪花按键的图形（未激活 / 激活同色）" }
    ] },
    { name: "首页 · 功能列表按键", items: [
      { key: "home-bg",     name: "按键背景 · 未激活", desc: "功能列表左侧圆角图标底（未激活态）" },
      { key: "home-ink",    name: "按键图标 · 未激活", desc: "功能列表左侧图标（未激活态）" },
      { key: "home-bg-on",  name: "按键背景 · 激活", desc: "按下功能卡片时的图标底" },
      { key: "home-ink-on", name: "按键图标 · 激活", desc: "按下功能卡片时的图标" }
    ] },
    { name: "字卡 · 条目按键", items: [
      { key: "wc-bg",     name: "按键背景 · 未激活", desc: "字卡页条目卡左侧图标底（未激活态）" },
      { key: "wc-ink",    name: "按键图标 · 未激活", desc: "字卡页条目卡左侧图标（未激活态）" },
      { key: "wc-bg-on",  name: "按键背景 · 激活", desc: "按下条目卡时的图标底" },
      { key: "wc-ink-on", name: "按键图标 · 激活", desc: "按下条目卡时的图标" }
    ] },
    { name: "探索 · 条目按键", items: [
      { key: "disc-bg",     name: "按键背景 · 未激活", desc: "探索页条目卡左侧图标底（未激活态）" },
      { key: "disc-ink",    name: "按键图标 · 未激活", desc: "探索页条目卡左侧图标（未激活态）" },
      { key: "disc-bg-on",  name: "按键背景 · 激活", desc: "按下探索条目卡时的图标底" },
      { key: "disc-ink-on", name: "按键图标 · 激活", desc: "按下探索条目卡时的图标" }
    ] },
    { name: "设置 · 条目按键", items: [
      { key: "set-bg",     name: "按键背景 · 未激活", desc: "设置页条目卡左侧图标底（未激活态）" },
      { key: "set-ink",    name: "按键图标 · 未激活", desc: "设置页条目卡左侧图标（未激活态）" },
      { key: "set-bg-on",  name: "按键背景 · 激活", desc: "按下设置条目卡时的图标底" },
      { key: "set-ink-on", name: "按键图标 · 激活", desc: "按下设置条目卡时的图标" }
    ] }
  ];
  function icEach(fn) {
    for (var g = 0; g < ICON_GROUPS.length; g++) {
      for (var i = 0; i < ICON_GROUPS[g].items.length; i++) { fn(ICON_GROUPS[g].items[i], ICON_GROUPS[g]); }
    }
  }
  function applyIconColors() {
    var root = document.documentElement;
    icEach(function (it) {
      var v = zoneState.ic[it.key];
      if (v) { root.style.setProperty("--fic-" + it.key, v); }
      else { root.style.removeProperty("--fic-" + it.key); }
    });
  }
  var CARD_COLOR_GROUPS = [
    { name: "主导航", items: [
      { key: "tabbar", name: "悬浮底栏", desc: "底部导航玻璃底：颜色 + 不透明度" }
    ] },
    { name: "首页", items: [
      { key: "home-list", name: "下方列表", desc: "按键下方的功能列表卡底色" },
    ] },
    { name: "字卡", items: [
      { key: "wordcard", name: "条目卡 / 面板", desc: "字卡页条目卡与面板底色" },
      { key: "wc-tool",  name: "工具与输入卡", desc: "字卡页底部工具条 / 输入框底色" }
    ] },
    { name: "探索", items: [
      { key: "discover", name: "横幅 / 探索条目", desc: "探索页横幅与条目卡底色" }
    ] },
    { name: "设置", items: [
      { key: "settings", name: "设置条目卡 / 面板", desc: "设置页分组与各设置面板底色" }
    ] },
  ];
  function ccEach(fn) {
    for (var g = 0; g < CARD_COLOR_GROUPS.length; g++) {
      for (var i = 0; i < CARD_COLOR_GROUPS[g].items.length; i++) { fn(CARD_COLOR_GROUPS[g].items[i], CARD_COLOR_GROUPS[g]); }
    }
  }
  function ccPct(key) {
    var n = parseInt(zoneState.ca[key], 10);
    if (!isFinite(n)) { return CARD_DEF; }
    return Math.max(CARD_MIN, Math.min(CARD_MAX, n));
  }
  var CC_BLUR_KEYS = ["tabbar", "home-list", "frame", "wordcard", "wc-tool", "discover", "settings"];
  function syncCcBlur() {
    var root = document.documentElement, off = [], i, k;
    for (i = 0; i < CC_BLUR_KEYS.length; i++) {
      k = CC_BLUR_KEYS[i];
      if (ccPct(k) === 0) { off.push(k); }
    }
    if (off.length) { root.setAttribute("data-cca-zero", off.join(" ")); }
    else { root.removeAttribute("data-cca-zero"); }
  }
  function applyCardColors() {
    var root = document.documentElement;
    ccEach(function (it) {
      var rgb = hexToRgbTriple(zoneState.cc[it.key]);
      if (rgb) { root.style.setProperty("--cc-rgb-" + it.key, rgb.join(", ")); }
      else { root.style.removeProperty("--cc-rgb-" + it.key); }
      var pct = ccPct(it.key);
      if (pct === CARD_DEF) { root.style.removeProperty("--cc-a-" + it.key); }
      else { root.style.setProperty("--cc-a-" + it.key, (pct / 100).toFixed(3)); }
    });
    syncCcBlur();
  }
  var COMP_ZONES = [
    { key: "frame",   name: "相册卡片流", desc: "首页五格相框卡片流" },
    { key: "album",   name: "相册卡片",   desc: "四格照片 + 右侧条形码" },
    { key: "anniv",   name: "纪念日",     desc: "三个日子 · 自动算天数" },
    { key: "ticket",  name: "飞机票",     desc: "登机牌式布局" },
    { key: "weather", name: "天气",       desc: "实时天气卡" },
    { key: "poster",  name: "渐变海报",   desc: "整张图片上传" }
  ];
  /* 不透明度：未设置 = 100%（跟随主题原样） */
  /* 下发：颜色 → --cp-rgb-*；不透明度 → --cp-a-*；文字图案 → --cp-txt-*； */
  function applyCompColors() {
    var root = document.documentElement, i, it, rgb, n, v, set = [], aOn = [], txt = [], off = [];
    for (i = 0; i < COMP_ZONES.length; i++) {
      it = COMP_ZONES[i];
      rgb = hexToRgbTriple(zoneState.cp[it.key]);
      if (rgb) { root.style.setProperty("--cp-rgb-" + it.key, rgb.join(", ")); set.push(it.key); }
      else { root.style.removeProperty("--cp-rgb-" + it.key); }

      n = parseInt(zoneState.cpa[it.key], 10);
      if (isFinite(n) && n !== 100) {
        root.style.setProperty("--cp-a-" + it.key, (Math.max(0, Math.min(100, n)) / 100).toFixed(3));
        aOn.push(it.key);
      } else { root.style.removeProperty("--cp-a-" + it.key); }

      v = (it.key === "frame" || it.key === "poster") ? "" : zoneState.cpt[it.key];
      if (v) { root.style.setProperty("--cp-txt-" + it.key, v); txt.push(it.key); }
      else { root.style.removeProperty("--cp-txt-" + it.key); }

      if (zoneState.cpb[it.key] !== "1") { off.push(it.key); }
    }
    function mark(attr, list) {
      if (list.length) { root.setAttribute(attr, list.join(" ")); }
      else { root.removeAttribute(attr); }
    }
    mark("data-cp-set", set);
    mark("data-cp-a", aOn);
    mark("data-cp-txt", txt);
    mark("data-cp-blur-off", off);
  }
  /* 相册卡片：四个格子都没上传图片时才走「未上传默认样式」 */
  function syncAlbumEmpty() {
    var card = document.getElementById("hcAlbum");
    if (!card) { return; }
    var cells = card.querySelectorAll(".hc-album-cell");
    var empty = true, i;
    for (i = 0; i < cells.length; i++) {
      if (cells[i].classList.contains("has-photo")) { empty = false; }
    }
    if (empty) { card.classList.add("is-empty"); }
    else { card.classList.remove("is-empty"); }
  }

  function bindZonePanels() {
    var ids = ["zoneIconPanel", "zoneTextPanel", "zoneCardPanel"], n;
    for (n = 0; n < ids.length; n++) {
      var panel = document.getElementById(ids[n]);
      if (!panel || panel.getAttribute("data-bound") === "1") { continue; }
      panel.setAttribute("data-bound", "1");
      panel.addEventListener("input", function (e) {
        var t = e.target || e.srcElement;
        if (!t || !t.getAttribute) { return; }
        var kind = t.getAttribute("data-kind");
        if (!kind || t.getAttribute("data-zone") === null) { return; }
        zoneSet(kind, t.getAttribute("data-zone"), t.value);
      });
      panel.addEventListener("click", function (e) {
        var t = e.target || e.srcElement;
        var btn = closestData(t, "data-reset", panel);
        if (!btn) { return; }
        var parts = String(btn.getAttribute("data-reset") || "").split(":");
        zoneSet(parts[0], parts[1], "");
        if (parts[0] === "card") { tip("已复位为 100%（与默认一致）。"); }
        else if (parts[0] === "txt") { tip("字体颜色已恢复默认：亮色主题黑色，暗色主题自适应。"); }
        else { tip("已复位为跟随主题色。"); }
      });
    }
  }

  function applyState() {
    var vars = buildPalette(state.base, state.mode, state.key);
    var root = document.documentElement;
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) { root.style.setProperty(k, vars[k]); }
    }
    lastPalette = vars;
    root.setAttribute("data-theme-mode", state.mode === "dark" ? "dark" : "light");
    root.setAttribute("data-theme-key", state.key);
    root.setAttribute("data-polarity", state.polarity);
    root.style.setProperty("--xj-home-bg", state.polarity === "yang" ? "#FFFFFF" : "#252525");
    /* [V29] 首帧预置脚本会在 html 上写死底色；运行时切主题必须同步这份内联底色，
       否则阴→阳切换后 html 底色仍留在 #252525（回弹/露边时闪出深色）。 */
    try {
      root.style.backgroundColor = state.polarity === "yang" ? "#FFFFFF" : "#252525";
      root.style.colorScheme = state.polarity === "yang" ? "light" : "dark";
    } catch (eBg) { /* 忽略 */ }
    syncPolarityUi();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && vars["--bg"]) { meta.setAttribute("content", vars["--bg"]); }
    updateUiScale();
    randomizeCrystalStrip();
    zoneApplyVars();
  }

  
