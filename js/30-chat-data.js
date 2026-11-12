/* 雪山晶 · 30-chat-data ｜ 源：雪山晶.html L22065-L22562 ｜ JS 模块 */
(function () {
  var S = window.SnowCrystal || (window.SnowCrystal = {});
  var FAV_KEY = "snowcrystal.chat.favorites.v1";
  var MENU = null;
  var _menuOpen = false;
  var _activeMid = "";
  var _multi = { active: false, picks: {} };
  var _quote = null;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function partnerId() { return (S.Chat && S.Chat.getPartnerId) ? S.Chat.getPartnerId() : ""; }
  function chatObj() { return S.Chat.loadChat(); }
  function loadMsgs() { var c = chatObj(), p = partnerId(); return (c && c.messages && c.messages[p]) || []; }
  function findMsg(mid) { var l = loadMsgs(), i; for (i = 0; i < l.length; i++) { if (l[i].id === mid) { return l[i]; } } return null; }
  /* v101：红包类消息（红包本体 + 转发红包卡）统一禁止撤回与转发 */
  function isRpLocked(m) { return !!m && (m.msgType === "redpack" || (m.msgType === "forward" && m.origType === "redpack")); }
  function toast(t) {
    var el = document.getElementById("wcToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "wcToast";
      el.className = "wc-toast";
      (document.body || document.documentElement).appendChild(el);
    }
    if (typeof wcToast === "function") { wcToast(t); return; }
    el.textContent = String(t == null ? "" : t);
    el.classList.add("is-on");
    if (el._toastTimer) { window.clearTimeout(el._toastTimer); }
    el._toastTimer = window.setTimeout(function () { el.classList.remove("is-on"); }, 1500);
  }
  function favLoad() { try { var a = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function favSave(list) { try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

  /* ---------- 探索 · 收藏（我方收藏 / 他的收藏 双轨） ----------
     数据模型：{ uid, mid, by:"me"|"him", who, partner, msgType, type, time(收藏时间), msgTime, snap(完整消息快照) }
     snap 为消息对象深拷贝，收藏页复用聊天渲染器重绘 → 原本什么样就显示什么样。 */
  var MY_KEY_FAV = "snowcrystal.account.my.v1";
  var PARTNERS_KEY_FAV = "snowcrystal.account.partners.v1";
  function favUid() { return "fv" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function favMyName() {
    try { var v = JSON.parse(localStorage.getItem(MY_KEY_FAV) || "{}"); return String((v && v.name) || "").trim() || "我"; } catch (e) { return "我"; }
  }
  function favPartnerName(pid) {
    try {
      var ps = JSON.parse(localStorage.getItem(PARTNERS_KEY_FAV) || "[]"), i;
      for (i = 0; i < ps.length; i++) { if (String(ps[i].id) === String(pid)) { return String(ps[i].name || "").trim() || "对方"; } }
    } catch (e) { /* ignore */ }
    return "对方";
  }
  /* 收藏一条消息：by = "me"（我方点击收藏）/ "him"（对方角色点击收藏） */
  function favOne(m, by, who) {
    if (!m || m.isRecall) { return false; }
    by = by === "him" ? "him" : "me";
    var pid = partnerId(), list = favLoad(), i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].mid === m.id && (list[i].by || "me") === by && String(list[i].partner || "") === String(pid)) { return false; }
    }
    var snap = null;
    try { snap = JSON.parse(JSON.stringify(m)); } catch (e) { return false; }
    if (!snap) { return false; }
    var rec = {
      uid: favUid(),
      mid: m.id,
      by: by,
      who: String(who || "").trim() || (by === "him" ? favPartnerName(pid) : favMyName()),
      partner: pid,
      msgType: m.msgType || "text",
      type: m.type || "",
      time: (S.Chat && S.Chat.now) ? S.Chat.now() : Date.now(),
      msgTime: m.time || 0,
      text: m.msgType === "qa" ? "[问答]：" + String(m.q || "") : (m.text || ""),
      snap: snap
    };
    list.unshift(rec);
    if (!favSave(list)) { return false; }
    return true;
  }
  /* 对方角色只收藏我方发出的 文本 / 信件 / 问答 */
  function favByPartner(m, who) {
    if (!m || m.isRecall || m.type !== "self") { return false; }
    var mt = m.msgType || "text";
    if (mt !== "text" && mt !== "letter" && mt !== "qa") { return false; }
    if (mt === "text" && !String(m.text || "").trim()) { return false; }
    return favOne(m, "him", who);
  }
  function favList(by) {
    var all = favLoad();
    if (!by) { return all; }
    return all.filter(function (x) { return x && (x.by || "me") === by; });
  }
  function favDel(uid) {
    var list = favLoad(), i, n = 0;
    for (i = list.length - 1; i >= 0; i--) { if (list[i] && list[i].uid === uid) { list.splice(i, 1); n++; } }
    if (n) { favSave(list); }
    return n;
  }
  function favCount() {
    var list = favLoad(), out = { me: 0, him: 0 };
    for (var i = 0; i < list.length; i++) {
      var by = (list[i] && list[i].by) || "me";
      if (by === "him") { out.him++; } else { out.me++; }
    }
    return out;
  }

  var ICONS = {
    recall: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>',
    fav: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.6 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>',
    multi: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm13.5-3.3L19 9.2l1.4 1.4-4 4-2.4-2.4 1.4-1.4z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3.4h6l.8 2.2h3.4v1.8H4.8V5.6h3.4zM6 9h12l-.9 10.1a1.8 1.8 0 0 1-1.8 1.7H8.7a1.8 1.8 0 0 1-1.8-1.7z"/></svg>'
  };

  /* ---------- 菜单 ---------- */
  function showMsgActionMenu(row, mid) {
    closeMenu();
    var m = findMsg(mid);
    if (!m) { return; }
    _activeMid = mid;
    if (!MENU) {
      MENU = document.createElement("div");
      MENU.className = "msg-action-menu";
      MENU.id = "msgActionMenu";
      MENU.setAttribute("role", "menu");
      MENU.addEventListener("click", function (e) {
        var it = e.target.closest ? e.target.closest(".msg-action-item") : null;
        if (!it) { return; }
        var act = it.getAttribute("data-act") || "";
        e.stopPropagation();
        if (act === "recall") { doRecall(_activeMid); }
        else if (act === "fav") { doFavorite(_activeMid); }
        else if (act === "quote") { doQuote(_activeMid); }
        else if (act === "multi") { enterMultiSelect(); }
        else if (act === "del") { doDeleteOne(_activeMid); }
      });
      document.body.appendChild(MENU);
    }
    var isSelf = m.type === "self";
    var isRecall = !!m.isRecall;
    /* v101：红包消息不允许撤回，菜单里不出现撤回项 */
    var isRp = isRpLocked(m);
    var html = "";
    html += (isRecall || isRp ? "" : '<div class="msg-action-item" data-act="recall" role="menuitem">' + ICONS.recall + "<span>撤回</span></div>");
    html += '<div class="msg-action-item" data-act="fav" role="menuitem">' + ICONS.fav + "<span>收藏</span></div>";
    /* [QUOTE-FWD] 转发消息不提供引用入口 */
    html += (m.msgType === "forward" ? "" : '<div class="msg-action-item" data-act="quote" role="menuitem">' + ICONS.quote + "<span>引用</span></div>");
    html += '<div class="msg-action-item" data-act="multi" role="menuitem">' + ICONS.multi + "<span>多选</span></div>";
    html += '<div class="msg-action-item is-danger" data-act="del" role="menuitem">' + ICONS.del + "<span>删除</span></div>";
    MENU.innerHTML = html;

    var rect = row.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    MENU.style.visibility = "hidden";
    MENU.style.left = "0px"; MENU.style.top = "0px";
    var mw = MENU.offsetWidth, mh = MENU.offsetHeight;
    var x = rect.left + rect.width / 2 - mw / 2;
    x = Math.max(8, Math.min(x, vw - mw - 8));
    var y;
    if (rect.top - mh - 10 >= 8) { y = rect.top - mh - 10; }
    else { y = Math.min(rect.bottom + 10, vh - mh - 8); }
    MENU.style.left = x + "px"; MENU.style.top = y + "px";
    MENU.style.visibility = "visible";
    MENU.classList.add("is-open");
    _menuOpen = true;
  }
  function closeMenu() { if (MENU) { MENU.classList.remove("is-open"); } _menuOpen = false; }

  /* 撤回（自己与对方消息均可，已撤回的不能再撤） */
  function doRecall(mid) {
    closeMenu();
    var c = chatObj(), l = (c && c.messages && c.messages[partnerId()]) || [], m = null, i;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m) { return; }
    if (m.isRecall) { return; }
    /* v101：红包消息不允许撤回（兜底，防其它入口调用） */
    if (isRpLocked(m)) { toast("红包消息不支持撤回"); return; }
    S.Chat.markRecallMsg(m, m.type === "self" ? "你撤回了一条消息" : "对方撤回了一条消息");
    S.Chat.saveChat(c);
    S.Chat.renderMessages(partnerId());
    var last = l[l.length - 1];
    if (last && last.id === mid) { S.Chat.setLast(partnerId(), last.recallText, S.Chat.now()); }
    toast(m.type === "self" ? "已撤回" : "已替对方撤回");
  }

  /* ---------- 收藏 ---------- */
  function doFavorite(mid) {
    closeMenu();
    var m = findMsg(mid);
    if (!m || m.isRecall) { return; }
    if (favOne(m, "me")) { toast("已收藏"); } else { toast("已收藏过或内容过大"); }
  }

  /* ---------- 引用 ---------- */
  function doQuote(mid) {
    closeMenu();
    var m = findMsg(mid);
    if (!m || m.isRecall) { return; }
    /* [QUOTE-FWD] 转发消息不支持引用：转发卡片自带来源信息，再叠一层引用会重复 */
    if (m.msgType === "forward") { toast("转发消息不支持引用"); return; }
    var from = m.type === "self" ? "我" : (m.fromName || "对方");
    /* [QUOTE-TYPE] 各类型消息引用时都给出可读摘要，避免 text 为空导致引用块整体不渲染 */
    var text = m.msgType === "voice" ? "[语音]"
      : m.msgType === "sticker" ? "[表情包]"
      : m.msgType === "qa" ? ("[问答]：" + String(m.q || ""))
      : m.msgType === "image" ? "[图片]"
      : m.msgType === "letter" ? ("[信件] " + String(m.letterTitle || "无题"))
      : m.msgType === "redpack" ? ("[红包] " + String(m.wish || ""))
      : (m.text || "");
    _quote = { mid: mid, from: from, text: text };
    /* [QUOTE-STICKER] 表情包引用带上原图，渲染时直接显示图片而非「[表情包]」 */
    if (m.msgType === "sticker" && m.img) { _quote.img = m.img; }
    window.__chatQuote = _quote;
    updateQuoteBar();
    var inp = document.getElementById("chatInput");
    if (inp) { inp.focus(); }
  }
  function updateQuoteBar() {
    var bar = document.getElementById("chatQuoteBar");
    var body = document.getElementById("chatQuoteBody");
    if (!bar || !body) { return; }
    if (!_quote) { bar.hidden = true; body.textContent = ""; return; }
    bar.hidden = false;
    /* [QUOTE-STICKER] 引用表情包：条内直接显示缩略图 */
    if (_quote.img) {
      body.innerHTML = '<img class="chat-quote-img" alt="表情包">';
      var im = body.firstChild;
      var raw = String(_quote.img);
      if (typeof S.Chat.resolveImgSrc === "function") {
        S.Chat.resolveImgSrc(raw, function (url) {
          if (url) { im.src = url; } else { im.style.display = "none"; }
        });
      } else { im.style.display = "none"; }
      return;
    }
    body.textContent = _quote.text;
  }
  function dismissQuote() { _quote = null; window.__chatQuote = null; updateQuoteBar(); }
  window.__chatQuoteDismiss = dismissQuote;

  /* ---------- 单条删除 ---------- */
  function doDeleteOne(mid) {
    closeMenu();
    var c = chatObj(), l = (c && c.messages && c.messages[partnerId()]) || [], i;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { l.splice(i, 1); break; } }
    S.Chat.saveChat(c);
    S.Chat.renderMessages(partnerId());
    toast("已删除");
  }

  /* ---------- 多选 ---------- */
  function enterMultiSelect() {
    closeMenu();
    _multi.active = true; _multi.picks = {};
    var box = document.getElementById("chatMessages");
    if (box) { box.classList.add("is-msg-selecting"); }
    var bar = document.getElementById("msgMultiBar");
    if (bar) { bar.hidden = false; }
    var wrap = document.querySelector(".page[data-page='chat-room'] .chat-input-wrap");
    var info = document.querySelector(".page[data-page='chat-room'] .chat-room-info");
    if (wrap) { wrap.style.display = "none"; }
    if (info) { info.style.display = "none"; }
    updateMultiCount();
  }
  function exitMultiSelect() {
    _multi.active = false; _multi.picks = {};
    var box = document.getElementById("chatMessages");
    if (box) { box.classList.remove("is-msg-selecting"); box.classList.remove("is-selecting"); }
    var bar = document.getElementById("msgMultiBar");
    if (bar) { bar.hidden = true; }
    var wrap = document.querySelector(".page[data-page='chat-room'] .chat-input-wrap");
    var info = document.querySelector(".page[data-page='chat-room'] .chat-room-info");
    if (wrap) { wrap.style.display = ""; }
    if (info) { info.style.display = ""; }
    updateMultiCount();
  }
  function updateMultiCount() {
    var n = Object.keys(_multi.picks).length;
    var el = document.getElementById("msgMultiCount");
    if (el) { el.textContent = "已选 " + n + " 条"; }
  }
  function togglePick(mid) {
    if (!_multi.active) { return; }
    /* v101：红包消息不允许转发，禁止进入转发选中集合 */
    var pm = findMsg(mid);
    if (isRpLocked(pm)) { toast("红包消息不支持转发"); return; }
    if (_multi.picks[mid]) { delete _multi.picks[mid]; } else { _multi.picks[mid] = 1; }
    var row = document.querySelector('#chatMessages .chat-msg[data-mid="' + mid + '"]') || document.querySelector('#chatMessages .chat-fwd-card-item[data-mid="' + mid + '"]');
    if (row) { if (_multi.picks[mid]) { row.classList.add("is-picked"); } else { row.classList.remove("is-picked"); } }
    updateMultiCount();
  }
  function toggleSelectAll() {
    var l = loadMsgs(), i, all = true;
    /* v101：红包消息不参与全选/转发 */
    for (i = 0; i < l.length; i++) { if (isRpLocked(l[i])) { continue; } if (!_multi.picks[l[i].id]) { all = false; break; } }
    _multi.picks = {};
    if (!all) { for (i = 0; i < l.length; i++) { if (isRpLocked(l[i])) { continue; } _multi.picks[l[i].id] = 1; } }
    refreshPickedUI();
    updateMultiCount();
  }
  function refreshPickedUI() {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var rows = box.querySelectorAll(".chat-msg, .chat-fwd-card-item"), i;
    for (i = 0; i < rows.length; i++) {
      var mid = rows[i].getAttribute("data-mid");
      if (mid && _multi.picks[mid]) { rows[i].classList.add("is-picked"); } else { rows[i].classList.remove("is-picked"); }
      var gids = rows[i].getAttribute ? (rows[i].getAttribute("data-fwd-ids") || "") : "";
      if (gids) {
        var arr = gids.split(","), k, any = false;
        for (k = 0; k < arr.length; k++) { if (arr[k] && _multi.picks[arr[k]]) { any = true; break; } }
        if (any) { rows[i].classList.add("is-picked"); } else { rows[i].classList.remove("is-picked"); }
      }
    }
  }
  function deleteSelected() {
    var c = chatObj(), l = (c && c.messages && c.messages[partnerId()]) || [], n = 0, i;
    for (i = l.length - 1; i >= 0; i--) { if (_multi.picks[l[i].id]) { l.splice(i, 1); n++; } }
    S.Chat.saveChat(c);
    _multi.picks = {};
    exitMultiSelect();
    S.Chat.renderMessages(partnerId());
    toast("已删除 " + n + " 条");
  }
  function favoriteSelected() {
    var l = loadMsgs(), i, n = 0;
    for (i = 0; i < l.length; i++) { if (_multi.picks[l[i].id] && favOne(l[i], "me")) { n++; } }
    _multi.picks = {};
    exitMultiSelect();
    toast("已收藏 " + n + " 条");
  }

  /* 转发（v100：多选批量转发，仿微信/QQ） */
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  var _fwdPanel = null;
  function partnersLoad() { try { var v = JSON.parse(localStorage.getItem(PARTNERS_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function partnerNameOf(pid) {
    var ps = partnersLoad(), i;
    for (i = 0; i < ps.length; i++) { if (String(ps[i].id) === String(pid)) { return ps[i].name || "对方"; } }
    return "对方";
  }
  function avatarOf(p) {
    if (p && p.avatar) { return '<img class="fwd-target-avatar-img" src="' + esc(p.avatar) + '" alt="">'; }
    return '<span class="fwd-target-avatar-ph">' + esc(String((p && p.name) || "对").slice(0, 1)) + "</span>";
  }
  function forwardSelected() {
    /* v101：红包消息不允许转发，转发前先剔除选中集合里的红包 */
    var l0 = loadMsgs(), i0, banned = 0;
    for (i0 = 0; i0 < l0.length; i0++) {
      if (isRpLocked(l0[i0]) && _multi.picks[l0[i0].id]) { delete _multi.picks[l0[i0].id]; banned++; }
    }
    if (banned) { refreshPickedUI(); updateMultiCount(); }
    var n = Object.keys(_multi.picks).length;
    if (!n) { toast(banned ? "红包消息不支持转发" : "请先勾选要转发的消息"); return; }
    openForwardTargets();
  }
  function openForwardTargets() {
    closeForwardTargets();
    var ps = partnersLoad();
    if (!ps.length) { toast("暂无可转发的对话框"); return; }
    var cur = partnerId();
    var mask = document.createElement("div");
    mask.className = "fwd-target-mask";
    mask.id = "fwdTargetMask";
    var panel = document.createElement("div");
    panel.className = "fwd-target-panel";
    panel.id = "fwdTargetPanel";
    var html = '<div class="fwd-target-head"><span class="fwd-target-title">转发到</span><button type="button" class="fwd-target-close" onclick="SnowCrystal.ChatMsgMenu.closeForwardTargets()" aria-label="关闭">×</button></div><div class="fwd-target-list">';
    var i, p, isCur;
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      isCur = String(p.id) === String(cur);
      html += '<div class="fwd-target-item' + (isCur ? " is-cur" : "") + '" data-target="' + esc(String(p.id)) + '" role="button" tabindex="0">' +
        '<span class="fwd-target-avatar">' + avatarOf(p) + "</span>" +
        '<span class="fwd-target-name">' + esc(p.name || "对方") + (isCur ? '<em class="fwd-target-cur-tag">当前</em>' : "") + "</span></div>";
    }
    html += "</div>";
    panel.innerHTML = html;
    mask.appendChild(panel);
    document.body.appendChild(mask);
    mask.addEventListener("click", function (e) {
      if (e.target === mask) { closeForwardTargets(); return; }
      var it = e.target.closest ? e.target.closest(".fwd-target-item") : null;
      if (!it) { return; }
      var tid = it.getAttribute("data-target");
      if (tid) { doForwardTo(tid); }
    });
    _fwdPanel = mask;
  }
  function closeForwardTargets() {
    if (_fwdPanel) { if (_fwdPanel.parentNode) { _fwdPanel.parentNode.removeChild(_fwdPanel); } _fwdPanel = null; }
  }
  /* 转发消息的兜底文本：红包/拍一拍/通知/问答等特殊类型给出合理标识，普通消息用原文 */
  function fwdTextOf(m) {
    if (!m) { return ""; }
    if (m.msgType === "voice") { return "[语音]"; }
    if (m.msgType === "redpack") { return m.text || "[红包]"; }
    if (m.msgType === "qa" || m.innerType === "qa") { return m.text || "[问答]"; }
    if (m.msgType === "pat") { return m.text || "[拍一拍]"; }
    if (m.msgType === "call" || m.isCall) { return m.text || "[通知]"; }
    return m.text || "";
  }
  function forwardSummary(m) {
    if (!m) { return "[转发]"; }
    var ot = m.origType || "";
    if (ot === "qa" || m.innerType === "qa") { return "转发问答：" + String(m.q || ""); }
    if (ot === "redpack") { return "转发红包"; }
    if (ot === "pat") { return "转发拍一拍"; }
    if (ot === "call" || m.isCall) { return "转发通知"; }
    if (m.img) { return "[图片]"; }
    return "转发：" + String(m.text || "");
  }
  function doForwardTo(targetId) {
    if (!targetId) { return; }
    var c = chatObj();
    if (!c.messages[targetId] || !Array.isArray(c.messages[targetId])) { c.messages[targetId] = []; }
    var l = (c.messages[partnerId()] || []), i, n = 0;
    var curName = partnerNameOf(partnerId());
    for (i = 0; i < l.length; i++) {
      var m = l[i];
      if (!_multi.picks[m.id]) { continue; }
      /* v101：红包消息一律不转发（兜底） */
      if (isRpLocked(m)) { continue; }
      var fwd = {
        id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: "self",
        msgType: "forward",
        text: fwdTextOf(m),
        img: m.img || "",
        voice: m.voice || "",
        voiceDur: m.voiceDur || 0,
        time: (S.Chat && S.Chat.now) ? S.Chat.now() : Date.now(),
        read: false,
        origType: m.msgType === "forward" ? (m.origType || "") : m.msgType,
        fwdOriginType: m.type,
        fwdOriginName: m.type === "self" ? "我" : curName,
        fwdFrom: partnerId(),
        fwdFromName: curName
      };
      /* 原消息本身是转发时，保留最原始发送人信息；若转发内容是问答/红包，同步透传对应数据 */
      if (m.msgType === "forward") {
        if (m.fwdOriginName) { fwd.fwdOriginName = m.fwdOriginName; fwd.fwdOriginType = m.fwdOriginType; }
        if (m.fwdFrom) { fwd.fwdFrom = m.fwdFrom; fwd.fwdFromName = m.fwdFromName; }
        if (m.innerType === "qa") {
          fwd.innerType = "qa"; fwd.q = m.q || ""; fwd.opts = (m.opts || []).slice(); fwd.multi = !!m.multi;
          fwd.picked = (m.picked || []).slice(); fwd.pickedBy = m.pickedBy || ""; fwd.status = m.status || "done";
        } else if (m.origType === "redpack") {
          fwd.amount = m.amount || 0; fwd.wish = m.wish || ""; fwd.opened = !!m.opened;
        }
      }
      /* 原消息是问答时，转发保留问答数据，转发卡片展示实际问答卡片 */
      if (m.msgType === "qa") {
        fwd.innerType = "qa";
        fwd.q = m.q || "";
        fwd.opts = (m.opts || []).slice();
        fwd.multi = !!m.multi;
        fwd.picked = (m.picked || []).slice();
        fwd.pickedBy = m.pickedBy || "";
        fwd.status = m.status || "done";
      }
      /* 原消息是红包时，透传金额/祝词/领取态，转发详情按原样渲染红包卡片 */
      if (m.msgType === "redpack") {
        fwd.amount = m.amount || 0; fwd.wish = m.wish || ""; fwd.opened = !!m.opened;
      }
      c.messages[targetId].push(fwd);
      n++;
    }
    if (!n) { closeForwardTargets(); toast("没有可转发的消息"); return; }
    S.Chat.saveChat(c);
    var last = c.messages[targetId][c.messages[targetId].length - 1];
    S.Chat.setLast(targetId, forwardSummary(last), (S.Chat && S.Chat.now) ? S.Chat.now() : Date.now());
    _multi.picks = {};
    exitMultiSelect();
    closeForwardTargets();
    if (String(targetId) === String(partnerId())) { S.Chat.renderMessages(partnerId()); }
    toast("已转发 " + n + " 条到「" + partnerNameOf(targetId) + "」");
  }

  /* ---------- 引用跳转 ---------- */
  function jumpToQuote(qmid) {
    if (!qmid) { return; }
    /* [FIX-QUOTE-JUMP] vlScrollToMid 是 27-chat-core 内部函数，本模块作用域取不到，
       必须走 S.Chat.scrollToMid 导出入口；否则任何引用条都会误报“不存在”。 */
    var sc = (S.Chat && typeof S.Chat.scrollToMid === "function") ? S.Chat.scrollToMid
           : (typeof vlScrollToMid === "function" ? vlScrollToMid : null);
    if (!sc) { return; }
    var ok = sc(qmid, true, false);
    if (!ok) {
      /* 兜底：虚拟列表尚未就绪时，目标其实在数据里——重渲染后重试一次 */
      var list = loadMsgs(), i, hit = false;
      for (i = 0; i < list.length; i++) { if (list[i] && String(list[i].id) === String(qmid)) { hit = true; break; } }
      if (hit) {
        try { if (S.Chat && S.Chat.renderMessages) { S.Chat.renderMessages(partnerId()); } } catch (e) {}
        ok = sc(qmid, true, false);
      }
    }
    if (!ok) {
      toast("被引用的消息已不存在");
      return;
    }
    var box = document.getElementById("chatMessages");
    var row = box ? (box.querySelector('.chat-msg[data-mid="' + qmid + '"]') || box.querySelector('.chat-fwd-card-item[data-mid="' + qmid + '"]')) : null;
    if (row) {
      row.classList.add("is-quote-jump");
      setTimeout(function () { row.classList.remove("is-quote-jump"); }, 1600);
    }
  }

  /* ---------- 事件绑定 ---------- */
  var _docCloseBound = false;
  function bindDocClose() {
    if (_docCloseBound) { return; }
    _docCloseBound = true;
    document.addEventListener("click", function (e) {
      if (_menuOpen && MENU && !(e.target.closest && e.target.closest("#msgActionMenu"))) { closeMenu(); }
    });
  }
  function bindEvents() {
    var box = document.getElementById("chatMessages");
    if (!box || box.getAttribute("data-msgmenu-bound")) { return; }
    box.setAttribute("data-msgmenu-bound", "1");
    box.addEventListener("click", function (e) {
      if (_multi.active) {
        var fcard = e.target.closest ? e.target.closest(".chat-fwd-card-msg") : null;
        if (fcard) {
          var gids = fcard.getAttribute("data-fwd-ids") || "";
          if (gids) {
            var arr = gids.split(","), k, allPicked = true;
            for (k = 0; k < arr.length; k++) { if (arr[k] && !_multi.picks[arr[k]]) { allPicked = false; break; } }
            for (k = 0; k < arr.length; k++) { if (arr[k]) { if (allPicked) { delete _multi.picks[arr[k]]; } else { _multi.picks[arr[k]] = 1; } } }
            if (allPicked) { fcard.classList.remove("is-picked"); } else { fcard.classList.add("is-picked"); }
            updateMultiCount();
          }
        } else {
          var r0 = e.target.closest ? e.target.closest(".chat-msg") : null;
          if (r0) {
            var md0 = r0.getAttribute("data-mid");
            if (md0) { togglePick(md0); }
          }
        }
        e.preventDefault();
        return;
      }
      var qr = e.target.closest ? e.target.closest(".msg-quote-ref") : null;
      if (qr) { e.preventDefault(); e.stopPropagation(); jumpToQuote(qr.getAttribute("data-qmid") || ""); return; }
      var vb = e.target.closest ? e.target.closest(".chat-voice-bubble") : null;
      if (vb) { return; }
      /* 红包气泡：点击走自身领取/详情逻辑，不弹撤回/收藏等消息菜单 */
      var rpb = e.target.closest ? e.target.closest(".chat-bubble.chat-bubble-rp") : null;
      if (rpb) { return; }
      var qaOpt = e.target.closest ? e.target.closest(".qa-opt") : null;
      if (qaOpt) {
        var qaRow = qaOpt.closest ? qaOpt.closest(".chat-msg") : null;
        var qaMid = qaRow ? qaRow.getAttribute("data-mid") : "";
        var qaIdx = parseInt(qaOpt.getAttribute("data-qa-opt") || "", 10);
        if (qaMid && !isNaN(qaIdx) && S.Chat && S.Chat.qaPick) { e.preventDefault(); e.stopPropagation(); S.Chat.qaPick(qaMid, qaIdx); }
        return;
      }
      var qaDone = e.target.closest ? e.target.closest(".qa-done-btn") : null;
      if (qaDone) {
        var qaRow2 = qaDone.closest ? qaDone.closest(".chat-msg") : null;
        var qaMid2 = qaRow2 ? qaRow2.getAttribute("data-mid") : "";
        if (qaMid2 && S.Chat && S.Chat.qaPickDone) { e.preventDefault(); e.stopPropagation(); S.Chat.qaPickDone(qaMid2); }
        return;
      }
      var bub = e.target.closest ? e.target.closest(".chat-bubble") : null;
      if (!bub) { return; }
      var row = bub.closest ? bub.closest(".chat-msg") : null;
      if (!row) { return; }
      var mid = row.getAttribute("data-mid") || "";
      if (!mid) { return; }
      e.preventDefault(); e.stopPropagation();
      var fm = findMsg(mid);
      if (fm && fm.msgType === "forward" && S.Chat && S.Chat.openForwardDetail) {
        S.Chat.openForwardDetail(mid);
        return;
      }
      showMsgActionMenu(row, mid);
    });
  }
  bindDocClose();
  bindEvents();

  /* ---------- 导出 ---------- */
  S.ChatMsgMenu = {
    showMsgActionMenu: showMsgActionMenu,
    closeMsgActionMenu: closeMenu,
    enterMultiSelect: enterMultiSelect,
    exitMultiSelect: exitMultiSelect,
    toggleSelectAll: toggleSelectAll,
    favoriteSelected: favoriteSelected,
    deleteSelected: deleteSelected,
    dismissQuote: dismissQuote,
    togglePick: togglePick,
    forwardSelected: forwardSelected,
    closeForwardTargets: closeForwardTargets,
    getPicks: function () { return _multi; }
  };
  /* 探索页 · 收藏数据接口（跨模块）：list(by) / add / del / count / favByPartner */
  S.ChatFav = {
    list: favList,
    add: function (m, by, who) { return favOne(m, by, who); },
    addByPartner: favByPartner,
    del: favDel,
    count: favCount,
    myName: favMyName,
    partnerName: favPartnerName,
    key: FAV_KEY
  };
})();
