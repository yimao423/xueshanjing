/* v92：消息点击菜单 / 多选 / 引用（对标拾心界 showMsgActionMenu / msg-action-menu）
   功能：撤回（仅自己）、收藏、引用、多选、删除；菜单 + icon + 对应功能。 */
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
  function toast(t) { if (typeof wcToast === "function") { wcToast(t); } }
  function favLoad() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; } }
  function favSave(list) { localStorage.setItem(FAV_KEY, JSON.stringify(list)); }

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
    var html = "";
    html += '<div class="msg-action-item' + (isSelf ? "" : " is-disabled") + '" data-act="recall" role="menuitem">' + ICONS.recall + "<span>撤回</span></div>";
    html += '<div class="msg-action-item" data-act="fav" role="menuitem">' + ICONS.fav + "<span>收藏</span></div>";
    html += '<div class="msg-action-item" data-act="quote" role="menuitem">' + ICONS.quote + "<span>引用</span></div>";
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

  /* ---------- 撤回（仅自己） ---------- */
  function doRecall(mid) {
    closeMenu();
    var c = chatObj(), l = (c && c.messages && c.messages[partnerId()]) || [], m = null, i;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m) { return; }
    if (m.type !== "self") { toast("只能撤回自己发送的消息"); return; }
    if (m.isRecall) { return; }
    m.isRecall = true;
    m.recallText = "你撤回了一条消息";
    m.recalled = { type: m.msgType, text: m.text || "", voice: m.voice || "", voiceDur: m.voiceDur || 0 };
    m.text = ""; m.msgType = "recall"; m.voice = "";
    S.Chat.saveChat(c);
    S.Chat.renderMessages(partnerId());
    var last = l[l.length - 1];
    if (last && last.id === mid) { S.Chat.setLast(partnerId(), last.recallText, S.Chat.now()); }
    toast("已撤回");
  }

  /* ---------- 收藏 ---------- */
  function favOne(m) {
    var list = favLoad(), i;
    for (i = 0; i < list.length; i++) { if (list[i].mid === m.id) { return false; } }
    try {
      list.unshift({ mid: m.id, type: m.type, msgType: m.msgType, text: m.msgType === "qa" ? "[问答]：" + String(m.q || "") : (m.text || ""), voice: m.voice || "", voiceDur: m.voiceDur || 0, img: m.img || "", time: m.time || S.Chat.now(), partner: partnerId() });
      favSave(list); return true;
    } catch (e) { return false; }
  }
  function doFavorite(mid) {
    closeMenu();
    var m = findMsg(mid);
    if (!m || m.isRecall) { return; }
    if (favOne(m)) { toast("已收藏"); } else { toast("已收藏过或内容过大"); }
  }

  /* ---------- 引用 ---------- */
  function doQuote(mid) {
    closeMenu();
    var m = findMsg(mid);
    if (!m || m.isRecall) { return; }
    var from = m.type === "self" ? "我" : (m.fromName || "对方");
    var text = m.msgType === "voice" ? "[语音]" : (m.msgType === "sticker" ? "[表情包]" : (m.msgType === "qa" ? "[问答]：" + String(m.q || "") : (m.text || "")));
    _quote = { mid: mid, from: from, text: text };
    window.__chatQuote = _quote;
    updateQuoteBar();
    var inp = document.getElementById("chatInput");
    if (inp) { inp.focus(); }
  }
  function updateQuoteBar() {
    var bar = document.getElementById("chatQuoteBar");
    var body = document.getElementById("chatQuoteBody");
    if (bar && body) {
      if (_quote) { body.textContent = _quote.text; bar.hidden = false; }
      else { bar.hidden = true; body.textContent = ""; }
    }
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
    if (_multi.picks[mid]) { delete _multi.picks[mid]; } else { _multi.picks[mid] = 1; }
    var row = document.querySelector('#chatMessages .chat-msg[data-mid="' + mid + '"]') || document.querySelector('#chatMessages .chat-fwd-card-item[data-mid="' + mid + '"]');
    if (row) { if (_multi.picks[mid]) { row.classList.add("is-picked"); } else { row.classList.remove("is-picked"); } }
    updateMultiCount();
  }
  function toggleSelectAll() {
    var l = loadMsgs(), i, all = true;
    for (i = 0; i < l.length; i++) { if (!_multi.picks[l[i].id]) { all = false; break; } }
    _multi.picks = {};
    if (!all) { for (i = 0; i < l.length; i++) { _multi.picks[l[i].id] = 1; } }
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
    for (i = 0; i < l.length; i++) { if (_multi.picks[l[i].id] && favOne(l[i])) { n++; } }
    _multi.picks = {};
    exitMultiSelect();
    toast("已收藏 " + n + " 条");
  }

  /* ---------- 转发（v100：多选批量转发，仿微信/QQ） ---------- */
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
    var n = Object.keys(_multi.picks).length;
    if (!n) { toast("请先勾选要转发的消息"); return; }
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
  function forwardSummary(m) {
    if (!m) { return "[转发]"; }
    if (m.innerType === "qa") { return "转发问答：" + String(m.q || ""); }
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
      if (!_multi.picks[m.id] || m.isRecall) { continue; }
      var fwd = {
        id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: "self",
        msgType: "forward",
        text: (m.msgType === "voice") ? "[语音]" : (m.text || ""),
        img: m.img || "",
        voice: m.voice || "",
        voiceDur: m.voiceDur || 0,
        time: (S.Chat && S.Chat.now) ? S.Chat.now() : Date.now(),
        read: false,
        fwdOriginType: m.type,
        fwdOriginName: m.type === "self" ? "我" : curName,
        fwdFrom: partnerId(),
        fwdFromName: curName
      };
      /* 原消息本身是转发时，保留最原始发送人信息；若转发内容是问答，同步透传问答数据 */
      if (m.msgType === "forward") {
        if (m.fwdOriginName) { fwd.fwdOriginName = m.fwdOriginName; fwd.fwdOriginType = m.fwdOriginType; }
        if (m.fwdFrom) { fwd.fwdFrom = m.fwdFrom; fwd.fwdFromName = m.fwdFromName; }
        if (m.innerType === "qa") {
          fwd.innerType = "qa"; fwd.q = m.q || ""; fwd.opts = (m.opts || []).slice(); fwd.multi = !!m.multi;
          fwd.picked = (m.picked || []).slice(); fwd.pickedBy = m.pickedBy || ""; fwd.status = m.status || "done";
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
    var box = document.getElementById("chatMessages");
    var row = box ? (box.querySelector('.chat-msg[data-mid="' + qmid + '"]') || box.querySelector('.chat-fwd-card-item[data-mid="' + qmid + '"]')) : null;
    if (!row) { toast("被引用的消息已不存在"); return; }
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("is-quote-jump");
    setTimeout(function () { row.classList.remove("is-quote-jump"); }, 1600);
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
        var r0 = e.target.closest ? (e.target.closest(".chat-fwd-card-item") || e.target.closest(".chat-msg")) : null;
        if (r0) { var md0 = r0.getAttribute("data-mid"); if (md0) { togglePick(md0); } e.preventDefault(); }
        return;
      }
      var qr = e.target.closest ? e.target.closest(".msg-quote-ref") : null;
      if (qr) { e.preventDefault(); e.stopPropagation(); jumpToQuote(qr.getAttribute("data-qmid") || ""); return; }
      var vb = e.target.closest ? e.target.closest(".chat-voice-bubble") : null;
      if (vb) { return; }
      /* 红包气泡：点击走自身领取/详情逻辑，不弹撤回/收藏等消息菜单 */
      var rpb = e.target.closest ? e.target.closest(".chat-bubble.chat-bubble-rp") : null;
      if (rpb) { return; }
      /* v102：问答气泡：选项 / 完成按钮点击走选择逻辑，不弹消息菜单 */
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
      /* v100：点击转发消息气泡 → 打开转发详情浮层（内容 + 发送人 + 来源） */
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
    closeForwardTargets: closeForwardTargets
  };
})();

/* ================= v43 气泡系统：默认气泡模式 / 自定义颜色 / 气泡商城（CSS 导入·指派） ================= */
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
    var d = { mode: "wechat", selfColor: "#4F86E8", otherColor: "#FFFFFF", selfTextColor: "#FFFFFF", otherTextColor: "#2b3345", quoteBgColor: "#8A9AC8", quoteTextColor: "#FFFFFF", quoteOpacity: 16 };
    if (s && typeof s === "object") {
      if (s.mode === "theme" || s.mode === "custom" || s.mode === "wechat") { d.mode = s.mode; }
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
    /* v43-fix（对标拾心界 bubble-maker.scopeCss）：
       - 主体类名全局替换：微信款替换 .message-sent / .message-received / .message（负向断言避免误伤
         .message-sentinel 等前缀类），非微信款替换自定义 cssClass；
         不再「只替换选择器第一个类名」——旧逻辑在首类非主体类（如 .wrapper .message-sent）时把 .wrapper
         错换为命名空间类，导致该规则完全不命中，样式残缺；
       - prefix 为环境限定前缀（如聊天页 .page[data-page="chat-room"][data-bubble-mode]），
         保证导入规则权重 ≥ 站内默认气泡规则（html body .page... .chat-bubble.is-self），且注入于所有静态 CSS 之后完整覆盖。 */
    var code = bub.cssCode || "";
    var ns = ".bub-css-" + bub.id;
    if (!code) { return ""; }
    var pre = prefix || "";
    if (bub.wechat) {
      /* 先替换长选择器，再替换 .message（负向断言避免误伤 .message-sent 等子串与 .message-sentinel） */
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
    dynamicStyleEl().textContent = css;
  }

  /* ---- 聊天渲染扩展：返回需要附加到气泡上的类 ---- */
  function extraClsFor(partnerId, isSelf) {
    var shop = loadShop();
    var key = isSelf ? "self" : String(partnerId || "");
    var id = shop.assign[key];
    /* 对方未按具体伙伴指派时，兜底使用「对方」指派（对齐拾心界 getBubbleForMsg 的 other 兜底） */
    if (!id && !isSelf) { id = shop.assign["other"]; }
    if (!id) { return ""; }
    var i, bub = null;
    for (i = 0; i < shop.list.length; i++) {
      if (shop.list[i].id === id) { bub = shop.list[i]; break; }
    }
    if (!bub) { return ""; }
    /* 样式注入在 init / 导入 / 删除 / 指派时已全量重建（rebuildStyles），此处不再重复全量重建，避免每次渲染消息都重建 */
    if (bub.wechat) {
      return " bub-css-" + bub.id + " message" + (isSelf ? " message-sent" : " message-received");
    }
    var extra = " bub-css-" + bub.id + " " + bub.cssClass;
    /* 非微信但导入 CSS 仍用 .message-sent/.message-received 区分方向时，按消息方向追加对应类 */
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
      pvSelf.style.background = set.mode === "custom" ? set.selfColor : (set.mode === "theme" ? "var(--accent-deep,#4F86E8)" : "#95EC69");
      pvSelf.style.color = set.mode === "custom" ? set.selfTextColor : (set.mode === "theme" ? "#FFFFFF" : "#1F3B0A");
    }
    if (pvOther) {
      pvOther.style.background = set.mode === "custom" ? set.otherColor : (set.mode === "theme" ? "var(--card,#FFFFFF)" : "#FFFFFF");
      pvOther.style.color = set.mode === "custom" ? set.otherTextColor : "#2A2F3A";
    }
  }

  function openBubbleSettings() {
    if (window.SnowCrystal && SnowCrystal.switchPage) { SnowCrystal.switchPage("bubble-settings"); }
    renderModeUI();
    renderShop();
  }

  /* ---- 商城 ---- */
  /* 同名编号辅助（对齐拾心界 cssNameExists） */
  function nameExists(n, list) {
    for (var i = 0; i < list.length; i++) { if (list[i] && list[i].name === n) { return true; } }
    return false;
  }
  function importCss() {
    var ta = document.getElementById("bubbleCssInput");
    if (!ta) { return; }
    var code = String(ta.value || "").replace(/^\s+|\s+$/g, "");
    if (!code) { toast("请先粘贴一段气泡 CSS 代码"); ta.focus(); return; }
    /* 微信风格检测：同时含 .message-sent 与 .message-received 类选择器（带前瞻避免误判 message-sentinel 等前缀类，对齐拾心界） */
    var wechat = /\.message-sent(?=[\s,{.:])/.test(code) && /\.message-received(?=[\s,{.:])/.test(code);
    /* 提取首个类名作为名字基础（对齐拾心界：以 CSS 类名命名，避免与旧版内置示例卡「微信风格气泡N」命名冲突被清理逻辑误删） */
    var clsMatch = code.match(/\.([A-Za-z_][\w-]*)/);
    if (!clsMatch) { toast("未识别到有效类名，请使用 .message-sent / .message-received 或自定义类"); return; }
    var cls = clsMatch[1];
    var shop = loadShop();
    /* 同名自动编号（对齐拾心界 cssNameExists） */
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
    /* 先写入，再读回校验（防「显示成功却无气泡」的假成功，对齐拾心界 saveCssBubble 写入校验） */
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
    /* 清理收紧（v43-fix）：仅移除无 cssCode 的历史内置占位卡（旧版内置示例无 cssCode）；
       用户自己导入的气泡必有 cssCode，无论命名如何一律保留，杜绝「导入成功却无气泡」的误删根因 */
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

  /* 商城预览：导入气泡样式经 rebuildStyles 全局生效（预览带完整类名），此处只做左右对齐兜底，
     底色/圆角/内边距一律交给气泡 CSS 自身，保证预览与聊天界面显示一致、完整 */
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

