/* 雪山晶 · 53-explore-fav ｜ 探索页：我的收藏 / 他的收藏
   数据来源：SnowCrystal.ChatFav（js/30-chat-data.js）
   渲染原则：收藏项保存消息完整快照，直接复用聊天室渲染器（S.Chat.favMsgHtml）重绘，
             原本是什么样子，收藏里就显示什么样子。 */
(function () {
  "use strict";
  var S = window.SnowCrystal = window.SnowCrystal || {};
  var TAB = "me";
  var KINDS = {
    text: "文本", letter: "信件", qa: "问答", voice: "语音", img: "图片",
    sticker: "表情", forward: "转发", pat: "拍一拍", redpack: "红包", call: "通话", card: "字卡"
  };

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtTime(ms) {
    var n = Number(ms) || 0;
    if (!n) { return ""; }
    var d = new Date(n), now = new Date();
    var hm = pad(d.getHours()) + ":" + pad(d.getMinutes());
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
      return "今天 " + hm;
    }
    return (d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + hm;
  }
  function toast(msg) {
    var el = document.getElementById("wcToast");
    if (!el) { return; }
    el.textContent = msg;
    el.classList.add("is-on");
    if (el._t) { window.clearTimeout(el._t); }
    el._t = window.setTimeout(function () { el.classList.remove("is-on"); }, 1500);
  }
  function kindOf(rec) {
    var mt = (rec && rec.msgType) || "text";
    return KINDS[mt] || "消息";
  }

  /* 原样重绘：优先走聊天室渲染器；失败时退化成同款气泡文本 */
  function shotHtml(rec) {
    var html = "";
    try {
      if (S.Chat && S.Chat.favMsgHtml) { html = S.Chat.favMsgHtml(rec.snap || null, rec.partner || ""); }
    } catch (e) { html = ""; }
    if (!html && rec && rec.text) {
      var self = rec.type === "self";
      html = '<div class="chat-msg ' + (self ? "is-self" : "is-other") + '">' +
        '<div class="chat-msg-col"><div class="chat-bubble chat-bubble-text ' + (self ? "is-self" : "is-other") + '">' +
        esc(rec.text) + "</div></div></div>";
    }
    return html;
  }

  /* 藏品要跟聊天室长得一模一样：把聊天室页面的气泡皮肤标记同步到快照容器，
     这样主题/皮肤类规则（.page.is-active[data-bubble-mode] 等）也能命中收藏页 */
  function bubbleMode() {
    var p = document.querySelector('.page[data-page="chat-room"]');
    return p ? (p.getAttribute("data-bubble-mode") || "") : "";
  }
  /* [FIX-BUBBLE] 自定义气泡皮肤的颜色变量挂在聊天室页的内联 style 上，
     收藏页不在其 DOM 子树里，CSS 变量继承不过来 → 渲染时把这几项同步到 .fav-shot 上，
     保证收藏气泡与聊天室里看到的一模一样，三角也取同一个颜色变量。 */
  var BUBBLE_VARS = ["--bubble-self-c", "--bubble-self-ink", "--bubble-self-text",
    "--bubble-other-c", "--bubble-other-ink", "--bubble-other-text"];
  function bubbleSkinStyle() {
    var p = document.querySelector('.page[data-page="chat-room"]');
    if (!p || !p.style) { return ""; }
    var out = "", i, v;
    for (i = 0; i < BUBBLE_VARS.length; i++) {
      v = p.style.getPropertyValue(BUBBLE_VARS[i]);
      if (v) { out += BUBBLE_VARS[i] + ":" + v + ";"; }
    }
    return out;
  }
  function shotWrap(inner) {
    var bm = bubbleMode();
    var sk = bubbleSkinStyle();
    return '<div class="fav-shot fav-frozen"' +
      (bm ? ' data-bubble-mode="' + esc(bm) + '"' : "") +
      (sk ? ' style="' + esc(sk) + '"' : "") + ">" + inner + "</div>";
  }

  function itemHtml(rec) {
    var uid = esc(rec.uid || "");
    return '<article class="fav-item" data-uid="' + uid + '">' +
      '<div class="fav-item-head">' +
        '<span class="fav-kind">' + esc(kindOf(rec)) + "</span>" +
        '<span class="fav-time">收藏于 ' + esc(fmtTime(rec.time)) + "</span>" +
        '<button type="button" class="fav-del" title="移出收藏" aria-label="移出收藏" onclick="SnowCrystal.ExploreFav.remove(\'' + uid + '\')">' +
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6.5 9h11l-.9 10.2a1.4 1.4 0 0 1-1.4 1.3H8.8a1.4 1.4 0 0 1-1.4-1.3L6.5 9z"/></svg>' +
        "</button>" +
      "</div>" +
      shotWrap(shotHtml(rec)) +
    "</article>";
  }

  function emptyHtml() {
    var isMe = TAB === "me";
    return '<div class="explore-empty">' +
      '<span class="explore-empty-ico">' +
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/></svg>' +
      "</span>" +
      '<span class="explore-empty-t">' + (isMe ? "还没有收藏" : "对方还没收藏你的消息") + "</span>" +
      '<span class="explore-empty-d">' + (isMe ? "在聊天里长按消息即可收藏，内容会原样收进这里" : "文本、信件与问答都可能被对方收进收藏") + "</span>" +
    "</div>";
  }

  function setSegUI() {
    var btns = document.querySelectorAll(".explore-seg .chat-seg-btn");
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute("data-fav-tab") === TAB;
      if (on) { btns[i].classList.add("is-on"); } else { btns[i].classList.remove("is-on"); }
      btns[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    var gt = document.getElementById("favGroupTitle");
    if (gt) { gt.textContent = TAB === "me" ? "我方点过收藏的内容" : "对方角色收藏的内容"; }
  }

  function render() {
    var box = document.getElementById("exploreFavList");
    if (!box) { return; }
    setSegUI();
    var cnt = (S.ChatFav && S.ChatFav.count) ? S.ChatFav.count() : { me: 0, him: 0 };
    var nMe = document.getElementById("favNumMe"), nHim = document.getElementById("favNumHim");
    if (nMe) { nMe.textContent = cnt.me; }
    if (nHim) { nHim.textContent = cnt.him; }
    /* 探索入口列表上的数量（我的收藏 / 他的收藏 两行） */
    var eMe = document.getElementById("favEntryMe"), eHim = document.getElementById("favEntryHim");
    if (eMe) { eMe.textContent = cnt.me; }
    if (eHim) { eHim.textContent = cnt.him; }

    var list = (S.ChatFav && S.ChatFav.list) ? (S.ChatFav.list(TAB) || []) : [];
    if (!list.length) { box.innerHTML = emptyHtml(); return; }

    var html = "", i;
    if (TAB === "him") {
      /* 他的收藏：按角色署名分组，同一角色归拢在一起 */
      var groups = [], map = {};
      for (i = 0; i < list.length; i++) {
        var who = String(list[i].who || "对方");
        if (!map[who]) { map[who] = { who: who, items: [] }; groups.push(map[who]); }
        map[who].items.push(list[i]);
      }
      for (i = 0; i < groups.length; i++) {
        html += '<section class="fav-group">' +
          '<div class="fav-group-head">' +
            '<span class="fav-group-name">' + esc(groups[i].who) + "</span>" +
            '<span class="fav-group-sub">收藏了 ' + groups[i].items.length + " 条</span>" +
          "</div>" +
          groups[i].items.map(itemHtml).join("") +
        "</section>";
      }
    } else {
      for (i = 0; i < list.length; i++) { html += itemHtml(list[i]); }
    }
    box.innerHTML = html;
    try { if (S.Chat && S.Chat.favResolveImgs) { S.Chat.favResolveImgs(box); } } catch (e) { /* ignore */ }
  }

  function setTab(by) {
    TAB = by === "him" ? "him" : "me";
    render();
    var l = document.getElementById("exploreFavList");
    if (l && l.scrollTo) { try { l.scrollTo(0, 0); } catch (e) { /* ignore */ } }
  }

  function remove(uid) {
    if (!uid || !S.ChatFav) { return; }
    var n = S.ChatFav.del(uid);
    render();
    toast(n ? "已移出收藏" : "收藏不存在");
  }

  /* 从探索入口列表进入收藏子页：open('me'|'him') */
  function open(tab) {
    TAB = tab === "him" ? "him" : "me";
    try { if (S.switchPage) { S.switchPage("explore-fav"); } } catch (e) { /* ignore */ }
    render();
    var l = document.getElementById("exploreFavList");
    if (l && l.scrollTo) { try { l.scrollTo(0, 0); } catch (e) { /* ignore */ } }
  }

  function goto() { open(TAB); }

  /* 页面被激活时任一路径进入都能自动渲染：
     探索页（入口列表）→ 刷新数量；收藏子页 → 渲染收藏列表 */
  function watch() {
    if (!window.MutationObserver) { return; }
    var probe = [
      { sel: '.page[data-page="explore"]', fn: render },
      { sel: '.page[data-page="explore-fav"]', fn: render }
    ];
    for (var i = 0; i < probe.length; i++) {
      (function (item) {
        var page = document.querySelector(item.sel);
        if (!page) { return; }
        new MutationObserver(function () {
          if (page.classList.contains("is-active")) { item.fn(); }
        }).observe(page, { attributes: true, attributeFilter: ["class"] });
      })(probe[i]);
    }
  }

  S.ExploreFav = { render: render, setTab: setTab, remove: remove, open: open, goto: goto };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { watch(); render(); });
  } else { watch(); render(); }
})();
