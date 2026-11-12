/* 雪山晶 · 31-shop ｜ 源：雪山晶.html L22562-L23156 ｜ JS 模块 */
(function () {
  "use strict";
  var SHOP_KEY = "snowcrystal.bubble.shop.v1";
  var SET_KEY = "snowcrystal.bubble.settings.v1";

  function lsGet(k) {
    try {
      var v = window.localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function loadShop() {
    var s = lsGet(SHOP_KEY);
    if (!s || typeof s !== "object") { s = { list: [], assign: {} }; }
    if (!Array.isArray(s.list)) { s.list = []; }
    if (!s.assign || typeof s.assign !== "object") { s.assign = {}; }
    return s;
  }
  function saveShop(s) { lsSet(SHOP_KEY, s); }

  function loadSet() {
    var s = lsGet(SET_KEY);
    var d = { mode: "theme", selfColor: "#4F86E8", otherColor: "#FFFFFF", selfTextColor: "#FFFFFF", otherTextColor: "#2b3345", quoteBgColor: "#8A9AC8", quoteTextColor: "#FFFFFF", quoteOpacity: 16 };
    if (s && typeof s === "object") {
      /* 旧版「微信气泡」模式已下线，历史存储统一归一到默认气泡（follow theme） */
      if (s.mode === "custom") { d.mode = "custom"; }
      else if (s.mode === "theme" || s.mode === "wechat") { d.mode = "theme"; }
      if (typeof s.selfColor === "string") { d.selfColor = s.selfColor; }
      if (typeof s.otherColor === "string") { d.otherColor = s.otherColor; }
      if (typeof s.selfTextColor === "string") { d.selfTextColor = s.selfTextColor; }
      if (typeof s.otherTextColor === "string") { d.otherTextColor = s.otherTextColor; }
      if (typeof s.quoteBgColor === "string") { d.quoteBgColor = s.quoteBgColor; }
      if (typeof s.quoteTextColor === "string") { d.quoteTextColor = s.quoteTextColor; }
      if (s.quoteOpacity != null) { d.quoteOpacity = Math.max(0, Math.min(100, Number(s.quoteOpacity) || 0)); }
    }
    return d;
  }
  function saveSet(s) { lsSet(SET_KEY, s); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function hexToRgb(hex) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    if (h.length !== 6) { return null; }
    var n = parseInt(h, 16);
    if (isNaN(n)) { return null; }
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function lum(hex) {
    var c = hexToRgb(hex);
    if (!c) { return 0; }
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }
  function inkOn(hex) { return lum(hex) > 0.62 ? "#262B33" : "#FFFFFF"; }

  function chatRoomEl() {
    return document.querySelector('html body .page[data-page="chat-room"]');
  }

  function applySettingsToRoom(room, mode, set) {
    if (!room) { return; }
    room.setAttribute("data-bubble-mode", mode);
    var st = room.style;
    if (mode === "custom") {
      st.setProperty("--bubble-self-c", set.selfColor);
      st.setProperty("--bubble-self-ink", inkOn(set.selfColor));
      st.setProperty("--bubble-self-text", set.selfTextColor);
      st.setProperty("--bubble-other-c", set.otherColor);
      st.setProperty("--bubble-other-ink", inkOn(set.otherColor));
      st.setProperty("--bubble-other-text", set.otherTextColor);
      var qc = hexToRgb(set.quoteBgColor);
      st.setProperty("--bubble-quote-bg-rgb", qc ? (qc.r + ", " + qc.g + ", " + qc.b) : "138, 154, 200");
      st.setProperty("--bubble-quote-text", set.quoteTextColor);
      st.setProperty("--bubble-quote-a", String((Number(set.quoteOpacity) || 0) / 100));
    } else {
      st.removeProperty("--bubble-self-c");
      st.removeProperty("--bubble-self-ink");
      st.removeProperty("--bubble-self-text");
      st.removeProperty("--bubble-other-c");
      st.removeProperty("--bubble-other-ink");
      st.removeProperty("--bubble-other-text");
      st.removeProperty("--bubble-quote-bg-rgb");
      st.removeProperty("--bubble-quote-text");
      st.removeProperty("--bubble-quote-a");
    }
  }

  function applySettings() {
    var set = loadSet();
    var room = chatRoomEl();
    if (!room) { return; }
    applySettingsToRoom(room, set.mode, set);
    applySettingsToRoom(document.querySelector('html body .page[data-page="mtx-session"]'), set.mode, set);
  }

  /* ---- 样式注入 ---- */
  function dynamicStyleEl() {
    var el = document.getElementById("bubble-dynamic-styles");
    if (!el) {
      el = document.createElement("style");
      el.id = "bubble-dynamic-styles";
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }
  function scopeCss(bub, prefix) {
    var code = bub.cssCode || "";
    var ns = ".bub-css-" + bub.id;
    if (!code) { return ""; }
    var pre = prefix || "";
    if (bub.wechat) {
      /* 先替换长选择器，再替换 .message（负向断言避免误伤 .message-sent 等子串与 .message-se */
      code = code.replace(/\.message-sent/g, ns + ".message-sent");
      code = code.replace(/\.message-received/g, ns + ".message-received");
      code = code.replace(/\.message(?![\-\w])/g, ns + ".message");
    } else {
      var cls = bub.cssClass;
      if (cls) {
        var re = new RegExp('\\.' + cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'g');
        code = code.replace(re, ns + '.' + cls);
      }
    }
    /* 逐选择器加环境前缀提权；@media / @keyframes 条件行无类名，原样跳过 */
    function scopeSel(sel) {
      var parts = sel.split(",");
      var i, s;
      for (i = 0; i < parts.length; i++) {
        s = parts[i];
        if (s.indexOf(".") === -1) { continue; }
        parts[i] = pre + s;
      }
      return parts.join(",");
    }
    code = code.replace(/([^{}]+)\{/g, function (m, sel) {
      return scopeSel(sel) + "{";
    });
    return code;
  }
  function rebuildStyles() {
    var shop = loadShop();
    var css = "";
    var i;
    /* 防护：确保聊天室与次元镜界页面存在 data-bubble-mode（init 时序异常时兜底），保证覆盖段选择器命中 */
    var _setTmp = loadSet();
    var _roomTmp = chatRoomEl();
    if (_roomTmp && !_roomTmp.hasAttribute("data-bubble-mode")) { _roomTmp.setAttribute("data-bubble-mode", _setTmp.mode || "theme"); }
    var _mtxTmp = document.querySelector('html body .page[data-page="mtx-session"]');
    if (_mtxTmp && !_mtxTmp.hasAttribute("data-bubble-mode")) { _mtxTmp.setAttribute("data-bubble-mode", _setTmp.mode || "theme"); }
    for (i = 0; i < shop.list.length; i++) {
      css += "\n/* 气泡 " + shop.list[i].id + " · 通用（商城预览等） */\n" + scopeCss(shop.list[i], "html body ") + "\n";
      css += "/* 气泡 " + shop.list[i].id + " · 聊天界面覆盖（浅色） */\n" + scopeCss(shop.list[i], 'html body .page[data-page="chat-room"][data-bubble-mode] ') + "\n";
      css += "/* 气泡 " + shop.list[i].id + " · 次元镜界覆盖（浅色） */\n" + scopeCss(shop.list[i], 'html body .page[data-page="mtx-session"][data-bubble-mode] ') + "\n";
      css += "/* 气泡 " + shop.list[i].id + " · 聊天界面覆盖（深色） */\n" + scopeCss(shop.list[i], 'html[data-theme-mode="dark"] body .page[data-page="chat-room"][data-bubble-mode] ') + "\n";
      css += "/* 气泡 " + shop.list[i].id + " · 次元镜界覆盖（深色） */\n" + scopeCss(shop.list[i], 'html[data-theme-mode="dark"] body .page[data-page="mtx-session"][data-bubble-mode] ') + "\n";
    }
    /* 次元镜界牌带保护段：导入气泡 CSS 仅应改变气泡外观（背景/圆角/箭头）， */
    css += "\n/* 次元镜界牌带布局保护（防导入气泡 CSS 破坏牌带） */\n" +
      'html body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble{display:flex !important;max-width:100% !important;width:auto !important;overflow:visible !important;padding:9px 10px 8px !important;box-sizing:border-box !important;}\n' +
      'html body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-cards{display:flex !important;flex-direction:row !important;overflow-x:auto !important;overflow-y:hidden !important;max-width:100% !important;flex-wrap:nowrap !important;}\n' +
      'html body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-card{flex:0 0 auto !important;}\n' +
      'html body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-card-img{display:block !important;}\n' +
      'html[data-theme-mode="dark"] body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble{display:flex !important;max-width:100% !important;width:auto !important;overflow:visible !important;padding:9px 10px 8px !important;box-sizing:border-box !important;}\n' +
      'html[data-theme-mode="dark"] body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-cards{display:flex !important;flex-direction:row !important;overflow-x:auto !important;overflow-y:hidden !important;max-width:100% !important;flex-wrap:nowrap !important;}\n' +
      'html[data-theme-mode="dark"] body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-card{flex:0 0 auto !important;}\n' +
      'html[data-theme-mode="dark"] body .page[data-page="mtx-session"][data-bubble-mode] .chat-bubble.mtx-cards-bubble .mtx-card-img{display:block !important;}\n';
    dynamicStyleEl().textContent = css;
  }

  /* ---- 聊天渲染扩展：返回需要附加到气泡上的类 ---- */
  function extraClsFor(partnerId, isSelf) {
    var shop = loadShop();
    var key = isSelf ? "self" : String(partnerId || "");
    var id = shop.assign[key];
 /* 对方未按具体伙伴指派时，兜底使用「对方」指派（ getBubbleForMsg 的 other 兜底） */
    if (!id && !isSelf) { id = shop.assign["other"]; }
    if (!id) { return ""; }
    var i, bub = null;
    for (i = 0; i < shop.list.length; i++) {
      if (shop.list[i].id === id) { bub = shop.list[i]; break; }
    }
    if (!bub) { return ""; }
    /* 样式注入在 init / 导入 / 删除 / 指派时已全量重建（rebuildStyles），此处不再重复全量重建，避免 */
    if (bub.wechat) {
      return " bub-css-" + bub.id + " message" + (isSelf ? " message-sent" : " message-received");
    }
    var extra = " bub-css-" + bub.id + " " + bub.cssClass;
    /* 非微信但导入 CSS 仍用 .message-sent/.message-received 区分方向时，按消息方向追加对 */
    if (isSelf && (bub.cssCode || "").indexOf(".message-sent") !== -1) { extra += " message-sent"; }
    if (!isSelf && (bub.cssCode || "").indexOf(".message-received") !== -1) { extra += " message-received"; }
    return extra;
  }

  /* ---- 设置页交互 ---- */
  function setMode(mode) {
    var set = loadSet();
    set.mode = mode;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setSelfColor(v) {
    var set = loadSet();
    set.selfColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setOtherColor(v) {
    var set = loadSet();
    set.otherColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setSelfTextColor(v) {
    var set = loadSet();
    set.selfTextColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setOtherTextColor(v) {
    var set = loadSet();
    set.otherTextColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setQuoteBgColor(v) {
    var set = loadSet();
    set.quoteBgColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setQuoteTextColor(v) {
    var set = loadSet();
    set.quoteTextColor = v;
    saveSet(set);
    applySettings();
    renderModeUI();
  }
  function setQuoteOpacity(v) {
    var set = loadSet();
    set.quoteOpacity = Math.max(0, Math.min(100, Number(v) || 0));
    saveSet(set);
    applySettings();
    renderModeUI();
  }

  function renderModeUI() {
    var set = loadSet();
    var grid = document.getElementById("bubbleModeGrid");
    if (grid) {
      var cards = grid.querySelectorAll(".bubble-mode-card");
      var i;
      for (i = 0; i < cards.length; i++) {
        cards[i].classList.toggle("is-active", cards[i].getAttribute("data-mode") === set.mode);
      }
    }
    var row = document.getElementById("bubbleCustomRow");
    var qrow = document.getElementById("bubbleQuoteRow");
    var hint = document.getElementById("bubbleQuoteHint");
    if (row) { row.style.display = set.mode === "custom" ? "flex" : "none"; }
    if (qrow) { qrow.style.display = set.mode === "custom" ? "flex" : "none"; }
    if (hint) { hint.style.display = set.mode === "custom" ? "block" : "none"; }
    var si = document.getElementById("bubbleSelfColor");
    var oi = document.getElementById("bubbleOtherColor");
    if (si) { si.value = set.selfColor; }
    if (oi) { oi.value = set.otherColor; }
    var sti = document.getElementById("bubbleSelfText");
    var oti = document.getElementById("bubbleOtherText");
    var qbi = document.getElementById("bubbleQuoteBg");
    var qti = document.getElementById("bubbleQuoteText");
    var qai = document.getElementById("bubbleQuoteA");
    var qav = document.getElementById("bubbleQuoteAV");
    if (sti) { sti.value = set.selfTextColor; }
    if (oti) { oti.value = set.otherTextColor; }
    if (qbi) { qbi.value = set.quoteBgColor; }
    if (qti) { qti.value = set.quoteTextColor; }
    if (qai) { qai.value = set.quoteOpacity; }
    if (qav) { qav.textContent = set.quoteOpacity + "%"; }
    var pvSelf = document.getElementById("bubPvSelf");
    var pvOther = document.getElementById("bubPvOther");
    if (pvSelf) {
      pvSelf.style.background = set.mode === "custom" ? set.selfColor : "var(--accent-deep,#4F86E8)";
      pvSelf.style.color = set.mode === "custom" ? set.selfTextColor : "#FFFFFF";
    }
    if (pvOther) {
      pvOther.style.background = set.mode === "custom" ? set.otherColor : "var(--card,#FFFFFF)";
      pvOther.style.color = set.mode === "custom" ? set.otherTextColor : "#2A2F3A";
    }
  }

  function openBubbleSettings() {
    if (window.SnowCrystal && SnowCrystal.switchPage) { SnowCrystal.switchPage("bubble-settings"); }
    renderModeUI();
    renderShop();
  }

  /* ---- 商城 ---- */
 /* 同名编号辅助（ cssNameExists） */
  function nameExists(n, list) {
    for (var i = 0; i < list.length; i++) { if (list[i] && list[i].name === n) { return true; } }
    return false;
  }
  function importCss() {
    var ta = document.getElementById("bubbleCssInput");
    if (!ta) { return; }
    var code = String(ta.value || "").replace(/^\s+|\s+$/g, "");
    if (!code) { toast("请先粘贴一段气泡 CSS 代码"); ta.focus(); return; }
    /* 微信风格检测：同时含 .message-sent 与 .message-received 类选择器（带前瞻避免误判 me */
    var wechat = /\.message-sent(?=[\s,{.:])/.test(code) && /\.message-received(?=[\s,{.:])/.test(code);
 /* 提取首个类名作为名字基础（：以 CSS 类名命名，避免与旧版内置示例卡「微信风格气泡N」命名冲突被清理逻辑误删 */
    var clsMatch = code.match(/\.([A-Za-z_][\w-]*)/);
    if (!clsMatch) { toast("未识别到有效类名，请使用 .message-sent / .message-received 或自定义类"); return; }
    var cls = clsMatch[1];
    var shop = loadShop();
 /* 同名自动编号（ cssNameExists） */
    var baseName = cls;
    var name = baseName;
    var seq = 2;
    while (nameExists(name, shop.list)) { name = baseName + " " + seq; seq++; }
    var bub = {
      id: "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      cssCode: code,
      cssClass: wechat ? "message" : cls,
      wechat: wechat,
      time: Date.now()
    };
 /* 先写入，再读回校验（防「显示成功却无气泡」的假成功， saveCssBubble 写入校验） */
    shop.list.unshift(bub);
    saveShop(shop);
    var saved = loadShop().list.some(function (b) { return b && b.id === bub.id; });
    if (!saved) {
      var rollback = loadShop();
      rollback.list = rollback.list.filter(function (b) { return !b || b.id !== bub.id; });
      saveShop(rollback);
      toast("保存失败，请重试");
      return;
    }
    rebuildStyles();
    ta.value = "";
    toast("已导入气泡「" + bub.name + "」");
    renderShop();
  }

  function assignRoles() {
    var roles = [{ key: "self", name: "我方" }];
    var partners = [];
    try {
      var pv = window.localStorage.getItem("snowcrystal.account.partners.v1");
      partners = pv ? JSON.parse(pv) : [];
    } catch (e) { partners = []; }
    var i;
    for (i = 0; i < partners.length; i++) {
      if (partners[i] && partners[i].id) {
        roles.push({ key: String(partners[i].id), name: partners[i].name || partners[i].id });
      }
    }
    return roles;
  }

  function renderShop() {
    var shop = loadShop();
    /* 清理收紧（v43-fix）：仅移除无 cssCode 的历史内置占位卡（旧版内置示例无 cssCode）； */
    var cleaned = false, ci, ck, cb;
    for (ci = shop.list.length - 1; ci >= 0; ci--) {
      cb = shop.list[ci];
      if (!cb || !cb.wechat || !/^微信风格气泡\d+$/.test(cb.name || "") || cb.cssCode) { continue; }
      shop.list.splice(ci, 1);
      for (ck in shop.assign) {
        if (Object.prototype.hasOwnProperty.call(shop.assign, ck) && shop.assign[ck] === cb.id) { delete shop.assign[ck]; }
      }
      cleaned = true;
    }
    if (cleaned) { saveShop(shop); }
    var listEl = document.getElementById("bubbleShopList");
    var emptyEl = document.getElementById("bubbleShopEmpty");
    if (!listEl) { return; }
    if (!shop.list.length) {
      listEl.innerHTML = "";
      if (emptyEl) { emptyEl.style.display = "block"; }
      return;
    }
    if (emptyEl) { emptyEl.style.display = "none"; }
    var roles = assignRoles();
    var html = "", i, j, bub, tag, hasSelf = false;
    for (i = 0; i < shop.list.length; i++) {
      bub = shop.list[i];
      tag = [];
      hasSelf = false;
      for (j = 0; j < roles.length; j++) {
        if (shop.assign[roles[j].key] === bub.id) { tag.push(roles[j].name); if (roles[j].key === "self") { hasSelf = true; } }
      }
      var pvSelfCls = bub.wechat ? " bub-css-" + bub.id + " message message-sent" : (" bub-css-" + bub.id + " " + (bub.cssClass || "") + ((bub.cssCode || "").indexOf(".message-sent") !== -1 ? " message-sent" : ""));
      var pvOtherCls = bub.wechat ? " bub-css-" + bub.id + " message message-received" : (" bub-css-" + bub.id + " " + (bub.cssClass || "") + ((bub.cssCode || "").indexOf(".message-received") !== -1 ? " message-received" : ""));
      html += '<div class="bubble-shop-card">' +
        '<span class="bubble-shop-prev"><span class="bub-pv' + pvSelfCls + '" data-rid="' + bub.id + '" data-side="self">你好</span><span class="bub-pv' + pvOtherCls + '" data-rid="' + bub.id + '" data-side="other">收到</span></span>' +
        '<span class="bubble-shop-meta">' +
          '<button class="bubble-shop-name" type="button" onclick="SnowBubble.renameBubble(\'' + bub.id + '\')">' + esc(bub.name) + '</button>' +
          '<span class="bubble-shop-assign-tag">' + (tag.length ? "指派：" + esc(tag.join("、")) : "未指派") + '</span>' +
        '</span>' +
        '<span class="bubble-shop-btns">' +
          '<button class="bubble-shop-btn is-primary" type="button" onclick="SnowBubble.openAssign(\'' + bub.id + '\')">指派</button>' +
          '<button class="bubble-shop-btn is-danger" type="button" onclick="SnowBubble.deleteBubble(\'' + bub.id + '\')">删除</button>' +
        '</span>' +
      '</div>';
    }
    listEl.innerHTML = html;
    renderShopPreviews();
  }

  /* 商城预览：导入气泡样式经 rebuildStyles 全局生效（预览带完整类名），此处只做左右对齐兜底， */
  function renderShopPreviews() {
    var shop = loadShop();
    var css = "", i, bub, ns;
    for (i = 0; i < shop.list.length; i++) {
      bub = shop.list[i];
      if (!bub) { continue; }
      ns = ".bub-css-" + bub.id;
      css += ns + '.bub-pv[data-rid="' + bub.id + '"][data-side="self"] { align-self:flex-end; }\n';
      css += ns + '.bub-pv[data-rid="' + bub.id + '"][data-side="other"] { align-self:flex-start; }\n';
    }
    var pe = document.getElementById("bubblePrevStyle");
    if (!pe) {
      pe = document.createElement("style");
      pe.id = "bubblePrevStyle";
      (document.head || document.documentElement).appendChild(pe);
    }
    pe.textContent = css;
  }

  /* 点击气泡名称修改：居中弹窗（替代 prompt） */
  var bubbleRenameId = "";
  function renameBubble(id) {
    var shop = loadShop();
    var i, bub = null;
    for (i = 0; i < shop.list.length; i++) { if (shop.list[i].id === id) { bub = shop.list[i]; break; } }
    if (!bub) { return; }
    bubbleRenameId = id;
    var inp = document.getElementById("bubbleRenameInput");
    if (inp) { inp.value = bub.name; }
    var panel = document.getElementById("bubbleRenamePanel");
    var mask = document.getElementById("bubbleRenameMask");
    if (panel) { panel.classList.add("is-open"); }
    if (mask) { mask.classList.add("is-open"); }
  }
  function confirmRename() {
    if (!bubbleRenameId) { return; }
    var inp = document.getElementById("bubbleRenameInput");
    var name = inp ? String(inp.value || "").replace(/^\s+|\s+$/g, "") : "";
    if (!name) { toast("名称不能为空"); return; }
    var shop = loadShop();
    var i;
    for (i = 0; i < shop.list.length; i++) { if (shop.list[i].id === bubbleRenameId) { shop.list[i].name = name; break; } }
    saveShop(shop);
    toast("已重命名气泡「" + name + "」");
    closeRename();
    renderShop();
  }
  function closeRename() {
    bubbleRenameId = "";
    var panel = document.getElementById("bubbleRenamePanel");
    var mask = document.getElementById("bubbleRenameMask");
    if (panel) { panel.classList.remove("is-open"); }
    if (mask) { mask.classList.remove("is-open"); }
  }

  function assignItemHtml(id) {
    var shop = loadShop();
    var roles = assignRoles();
    var html = "", j, r;
    for (j = 0; j < roles.length; j++) {
      r = roles[j];
      var active = shop.assign[r.key] === id;
      html += '<button class="bubble-assign-item' + (active ? " is-active" : "") + '" type="button" onclick="SnowBubble.toggleAssign(\'' + id + '\',\'' + esc(r.key) + '\')">' +
        '<span>' + esc(r.name) + '</span>' +
        '<span class="bubble-assign-check">✓</span>' +
      '</button>';
    }
    return html;
  }

  function openAssign(id) {
    var shop = loadShop();
    var i, bub = null;
    for (i = 0; i < shop.list.length; i++) { if (shop.list[i].id === id) { bub = shop.list[i]; break; } }
    if (!bub) { return; }
    var nameEl = document.getElementById("bubbleAssignName");
    if (nameEl) { nameEl.textContent = bub.name; }
    var body = document.getElementById("bubbleAssignBody");
    if (body) { body.innerHTML = assignItemHtml(id); }
    var panel = document.getElementById("bubbleAssignPanel");
    var mask = document.getElementById("bubbleAssignMask");
    if (panel) { panel.classList.add("is-open"); }
    if (mask) { mask.classList.add("is-open"); }
  }
  function toggleAssign(id, key) {
    var shop = loadShop();
    if (shop.assign[key] === id) {
      delete shop.assign[key];
    } else {
      shop.assign[key] = id;
    }
    saveShop(shop);
    var body = document.getElementById("bubbleAssignBody");
    if (body) { body.innerHTML = assignItemHtml(id); }
    renderShop();
  }
  function closeAssign() {
    var panel = document.getElementById("bubbleAssignPanel");
    var mask = document.getElementById("bubbleAssignMask");
    if (panel) { panel.classList.remove("is-open"); }
    if (mask) { mask.classList.remove("is-open"); }
  }
  function deleteBubble(id) {
    var shop = loadShop();
    var i, name = "";
    for (i = 0; i < shop.list.length; i++) {
      if (shop.list[i].id === id) {
        name = shop.list[i].name;
        shop.list.splice(i, 1);
        break;
      }
    }
    var key;
    for (key in shop.assign) {
      if (Object.prototype.hasOwnProperty.call(shop.assign, key) && shop.assign[key] === id) { delete shop.assign[key]; }
    }
    saveShop(shop);
    rebuildStyles();
    toast("已删除气泡「" + name + "」");
    renderShop();
  }

  /* ---- 轻提示 ---- */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "bubble-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.classList.add("bubble-toast-hide");
      setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 320);
    }, 1800);
  }

  /* ---- 初始化 ---- */
  function init() {
    rebuildStyles();
    applySettings();
    renderModeUI();
    renderShop();
    if (window.SnowCrystal) {
      if (!window.SnowCrystal.openBubbleSettings) { window.SnowCrystal.openBubbleSettings = openBubbleSettings; }
      if (!window.SnowCrystal.backPage) {
        window.SnowCrystal.backPage = function (name) { if (SnowCrystal.switchPage) { SnowCrystal.switchPage(name); } };
      }
    }
    window.SnowBubble = {
      setMode: setMode,
      setSelfColor: setSelfColor,
      setOtherColor: setOtherColor,
      setSelfTextColor: setSelfTextColor,
      setOtherTextColor: setOtherTextColor,
      setQuoteBgColor: setQuoteBgColor,
      setQuoteTextColor: setQuoteTextColor,
      setQuoteOpacity: setQuoteOpacity,
      importCss: importCss,
      openAssign: openAssign,
      toggleAssign: toggleAssign,
      closeAssign: closeAssign,
      deleteBubble: deleteBubble,
      renameBubble: renameBubble,
      confirmRename: confirmRename,
      closeRename: closeRename,
      openBubbleSettings: openBubbleSettings,
      extraClsFor: extraClsFor
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
