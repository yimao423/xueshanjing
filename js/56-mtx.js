/* ============================================================
 * 56-mtx.js —— 次元镜界（宿主侧逻辑）
 *
 * 定位：聊天界面底栏月牙菜单里的「次元镜界」入口。
 *   1) 界面完全复用聊天室骨架类（.chat-room-head / .chat-room-body /
 *      .chat-room-input / .chat-msg / .chat-bubble），与聊天界面一致；
 *   2) 牌组数据与镜界「我的牌组」同源：通过隐藏 iframe 加载
 *      镜界/index.html，走 jingjie-transmit.js 的 postMessage RPC
 *      （op: ping / listDecks / listSpreads / draw），不复制任何牌组数据；
 *   3) 交互流程对标 拾心界-镜界整合版 的次元镜界：我方提问 → 对方发牌；
 *   4) 顶栏最右侧为牌组选择菜单（牌组 + 牌阵 + 是否逆位）。
 * ============================================================ */
(function () {
  "use strict";

  var S = window.SnowCrystal || (window.SnowCrystal = {});
  var KEY = "snowcrystal.mtx.v1";
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  var MY_KEY = "snowcrystal.account.my.v1";
  var BRIDGE_SRC = "镜界/index.html?bridge=mtx";

  var state = {
    deckId: "",
    deckName: "",
    spreadId: "",
    spreadName: "",
    cardCount: 0,
    positions: [],
    reversed: true,
    items: []      /* { id, role:'self'|'other'|'sys', text, time, cards:[{name,position,reversed,deckName,image}] } */
  };
  var pick = { deckId: "", spreadId: "", reversed: true };   /* 弹窗内暂存 */
  var decks = [];
  var spreads = [];
  var bridgeReady = false;
  var pending = {};
  var seq = 0;
  var busy = false;
  var loadedMeta = false;

  /* ---------- 基础工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function toast(msg) {
    try { if (typeof S.toast === "function") { S.toast(msg); return; } } catch (e) { /* ignore */ }
    try { if (S.Chat && typeof S.Chat.toast === "function") { S.Chat.toast(msg); return; } } catch (e2) { /* ignore */ }
    if (window.console && console.log) console.log("[次元镜界] " + msg);
  }
  function uid() { return "mtx" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowTime() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------- 持久化（卡面 PNG 不入库，避免撑爆 localStorage 配额） ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return;
      state.deckId = o.deckId || "";
      state.deckName = o.deckName || "";
      state.spreadId = o.spreadId || "";
      state.spreadName = o.spreadName || "";
      state.cardCount = o.cardCount || 0;
      state.positions = Array.isArray(o.positions) ? o.positions : [];
      state.reversed = o.reversed !== false;
      state.items = Array.isArray(o.items) ? o.items.map(function (m) {
        var cards = Array.isArray(m.cards) ? m.cards.map(function (c) {
          return { name: c.name || "", position: c.position || "", reversed: !!c.reversed, deckName: c.deckName || "", image: "" };
        }) : [];
        return { id: m.id || uid(), role: m.role || "self", text: m.text || "", time: m.time || "", cards: cards };
      }) : [];
    } catch (e) { /* 忽略损坏数据 */ }
  }
  function save() {
    try {
      var slim = {
        deckId: state.deckId, deckName: state.deckName,
        spreadId: state.spreadId, spreadName: state.spreadName,
        cardCount: state.cardCount, positions: state.positions,
        reversed: state.reversed,
        items: state.items.slice(-60).map(function (m) {
          return {
            id: m.id, role: m.role, text: m.text, time: m.time,
            cards: (m.cards || []).map(function (c) {
              return { name: c.name, position: c.position, reversed: c.reversed, deckName: c.deckName };
            })
          };
        })
      };
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch (e) { /* 配额超限时静默 */ }
  }

  /* ---------- 账号信息（头像 / 名称）---------- */
  function readJson(k, dv) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v || dv; } catch (e) { return dv; }
  }
  function myProfile() { return readJson(MY_KEY, {}) || {}; }
  function partnerProfile() {
    var pid = "", i;
    try { pid = (S.Chat && S.Chat.getPartnerId) ? S.Chat.getPartnerId() : ""; } catch (e) { pid = ""; }
    var ps = readJson(PARTNERS_KEY, []) || [];
    for (i = 0; i < ps.length; i++) { if (String(ps[i].id) === String(pid)) return ps[i]; }
    return { name: "次元镜界" };
  }
  function avatarHtml(p, fallback) {
    if (p && p.avatar) return '<img class="chat-avatar-img" src="' + esc(p.avatar) + '" alt="">';
    return '<span class="chat-avatar-ph">' + esc(String((p && p.name) || fallback || "对").slice(0, 1)) + "</span>";
  }
  function avatarCls(p) {
    var shape = (p && p.shape === "circle") ? "circle" : "square";
    return " chat-avatar-" + shape;
  }

  /* ---------- RPC 桥（隐藏 iframe → 镜界 jingjie-transmit.js）---------- */
  function ensureBridge() {
    var f = $("mtxBridgeFrame");
    if (!f) {
      f = document.createElement("iframe");
      f.id = "mtxBridgeFrame";
      f.setAttribute("aria-hidden", "true");
      f.setAttribute("tabindex", "-1");
      f.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none";
      f.src = BRIDGE_SRC;
      document.body.appendChild(f);
    }
    return f;
  }

  function rpc(op, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var f = ensureBridge();
      var id = "mtx" + (++seq);
      var to = setTimeout(function () {
        delete pending[id];
        reject(new Error("镜界响应超时"));
      }, timeoutMs || 20000);
      pending[id] = { resolve: resolve, reject: reject, timer: to };
      try {
        f.contentWindow.postMessage({ mtx: { op: op, id: id, payload: payload || {} } }, "*");
      } catch (e) {
        clearTimeout(to);
        delete pending[id];
        reject(e);
      }
    });
  }

  function onMessage(ev) {
    var d = ev.data;
    if (!d || !d.mtx || !d.mtx.id) return;
    var p = pending[d.mtx.id];
    if (!p) return;
    clearTimeout(p.timer);
    delete pending[d.mtx.id];
    if (d.mtx.ok) p.resolve(d.mtx.result);
    else p.reject(new Error(String(d.mtx.result || "镜界返回失败")));
  }
  window.addEventListener("message", onMessage);

  /* ping 就绪探测：iframe 首帧与脚本执行有先后，重试至就绪 */
  function waitReady(tries) {
    var n = tries || 0;
    return rpc("ping", {}, 3000).then(function () {
      bridgeReady = true;
      return true;
    }).catch(function () {
      if (n >= 14) throw new Error("镜界模块未就绪，请稍后重试");
      return new Promise(function (r) { setTimeout(r, 320); }).then(function () { return waitReady(n + 1); });
    });
  }

  function loadMeta() {
    return waitReady(0)
      .then(function () { return rpc("listDecks", {}, 8000); })
      .then(function (list) {
        decks = Array.isArray(list) ? list : [];
        return rpc("listSpreads", {}, 8000);
      })
      .then(function (list) {
        spreads = Array.isArray(list) ? list : [];
        loadedMeta = true;
        /* 首次进入且无历史选择：默认取「我的牌组」首个，否则内置首个；牌阵默认第一个 */
        if (!state.deckId && decks.length) {
          var mine = decks.filter(isMine);
          var d0 = mine.length ? mine[0] : decks[0];
          state.deckId = d0.id; state.deckName = d0.name;
        }
        if (!state.spreadId && spreads.length) {
          var s0 = spreads[0];
          state.spreadId = s0.id; state.spreadName = s0.name;
          state.cardCount = s0.cardCount || 1;
          state.positions = s0.positions || [];
        }
        return true;
      });
  }
  function isMine(d) { return !!(d && d.id && d.id.indexOf("custom_") === 0); }
  function deckNameOf(id) {
    var i;
    for (i = 0; i < decks.length; i++) { if (decks[i].id === id) return decks[i].name; }
    return state.deckName || id || "未选牌组";
  }
  function spreadOf(id) {
    var i;
    for (i = 0; i < spreads.length; i++) { if (spreads[i].id === id) return spreads[i]; }
    return null;
  }

  /* ---------- 渲染：状态条 ---------- */
  function renderStatus() {
    var bar = $("mtxStatusBar");
    if (!bar) return;
    var cnt = state.cardCount || 1;
    var deckLabel = loadedMeta ? deckNameOf(state.deckId) : "读取中…";
    bar.innerHTML =
      '<span class="mtx-status-chip is-deck" onclick="SnowCrystal.Mtx.openDeckMenu()">牌组 · ' + esc(deckLabel) + "</span>" +
      '<span class="mtx-status-chip" onclick="SnowCrystal.Mtx.openDeckMenu()">' + esc(state.spreadName || "单牌") + " · " + cnt + " 张</span>" +
      '<span class="mtx-status-chip" onclick="SnowCrystal.Mtx.toggleReversed()">' + (state.reversed ? "逆位 开" : "逆位 关") + "</span>";
  }

  /* ---------- 渲染：消息流 ---------- */
  function cardHtml(c, idx) {
    var dir = c.reversed ? '<span class="mtx-card-dir is-rev">逆位</span>' : '<span class="mtx-card-dir">正位</span>';
    var img = c.image
      ? '<img class="mtx-card-img" src="' + esc(c.image) + '" alt="' + esc(c.name || "牌") + '">'
      : '<div class="mtx-card-img mtx-card-ph" style="display:flex;align-items:center;justify-content:center;min-height:110px;border-radius:8px;background:linear-gradient(150deg,#8b7cc0,#5a4c7e);color:#fff;font-size:12px;padding:8px;text-align:center">' + esc(c.name || "牌") + "</div>";
    return '<div class="mtx-card" data-idx="' + idx + '">' + img +
      (c.position ? '<div class="mtx-card-pos">' + esc(c.position) + "</div>" : "") +
      (c.name ? '<div class="mtx-card-name">' + esc(c.name) + "</div>" : "") +
      dir + "</div>";
  }

  function msgHtml(m) {
    var t = m.time ? '<span class="chat-msg-time">' + esc(m.time) + "</span>" : "";
    if (m.role === "sys") {
      return '<div class="mtx-sys-tip">' + esc(m.text || "") + "</div>";
    }
    var isSelf = m.role === "self";
    var p = isSelf ? myProfile() : partnerProfile();
    var av = '<span class="chat-msg-avatar' + avatarCls(p) + '">' + avatarHtml(p, isSelf ? "我" : "对") + "</span>";
    var inner;
    if (m.cards && m.cards.length) {
      inner = '<div class="chat-bubble mtx-cards-bubble' + (isSelf ? " is-self" : " is-other") + '" data-count="' + m.cards.length + '">' +
        '<div class="mtx-cards">' + m.cards.map(cardHtml).join("") + "</div></div>";
    } else {
      inner = '<div class="chat-bubble chat-bubble-text' + (isSelf ? " is-self" : " is-other") + '"><div class="chat-bubble-body">' + esc(m.text || "") + "</div></div>";
    }
    return '<div class="chat-msg ' + (isSelf ? "is-self" : "is-other") + '" data-id="' + esc(m.id) + '">' + av +
      '<div class="chat-msg-col">' + inner + '<div class="chat-msg-meta">' + t + "</div></div></div>";
  }

  function renderMessages() {
    var box = $("mtxMessages");
    if (!box) return;
    if (!state.items.length) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = state.items.map(msgHtml).join("");
    scrollBottom();
  }
  function scrollBottom() {
    var box = $("mtxMessages");
    if (!box) return;
    try { box.scrollTop = box.scrollHeight; } catch (e) { /* ignore */ }
  }

  function push(m) {
    state.items.push(m);
    if (state.items.length > 120) state.items = state.items.slice(-80);
    renderMessages();
    save();
    return m;
  }

  /* ---------- 主流程：我方提问 → 对方发牌 ---------- */
  function send() {
    var inp = $("mtxInput");
    var text = inp ? String(inp.value || "").trim() : "";
    if (!text) { toast("先写下你要问的问题"); return; }
    if (busy) return;
    if (!state.deckId) { toast("请先在右上角选择牌组"); openDeckMenu(); return; }

    busy = true;
    if (inp) { inp.value = ""; try { inp.style.height = "auto"; } catch (e) { /* ignore */ } }
    setSendDisabled(true);

    var q = push({ id: uid(), role: "self", text: text, time: nowTime(), cards: [] });
    var holder = push({ id: uid(), role: "other", text: "", time: "", cards: [] });
    /* 洗牌抽牌动画与 draw 请求并行；动画播完后才亮出牌面 */
    var animDone = startShuffle(holder.id);

    var cnt = state.cardCount || 1;
    var positions = (state.positions || []).slice(0, cnt);
    var drawP = waitReady(0).then(function () {
      return rpc("draw", {
        deckId: state.deckId,
        count: cnt,
        reversedEnabled: state.reversed !== false,
        positions: positions
      }, 30000);
    });
    Promise.all([
      drawP.then(function (c) { return { ok: true, cards: c }; }, function (e) { return { ok: false, err: e }; }),
      animDone
    ]).then(function (res) {
      var r = res[0];
      if (r.ok) {
        holder.cards = (Array.isArray(r.cards) ? r.cards : []).map(function (c) {
          return { name: c.name || "", position: c.position || "", reversed: !!c.reversed, deckName: c.deckName || deckNameOf(state.deckId), image: c.image || "" };
        });
        holder.time = nowTime();
        holder.text = "";
      } else {
        holder.role = "sys";
        holder.text = "发牌失败：" + String((r.err && r.err.message) || r.err);
      }
      renderMessages();
      save();
    }).then(function () {
      busy = false;
      setSendDisabled(false);
      /* 发牌后静默核对牌组是否仍在镜界存在（改名 / 删除时同步状态条） */
      if (!loadedMeta) return null;
      return null;
    });
    /* 引用 q 仅为保持语义清晰 */
    void q;
  }

  function setSendDisabled(v) {
    var b = $("mtxSendBtn");
    if (b) { if (v) b.setAttribute("disabled", "disabled"); else b.removeAttribute("disabled"); }
  }

  /* ---------- 洗牌抽牌动画（对标拾心界传讯页） ----------
   * 仅在「发问成功 → 对方回答牌面之前」的实时等待阶段播放：
   * 洗牌抖动 → 聚拢抽牌 → 中间牌翻转亮面，同步切换思考文案。
   * 动画行只是占位气泡的 DOM 表现，不入 state.items、不入库；回看直接渲染记录。 */
  var SHUFFLE_ANIM_MS = 4000;      /* 动画总时长 */
  var SHUFFLE_PHASE_MS = 1350;     /* 每个思考阶段推进间隔 */
  var SHUFFLE_TIMEOUT_MS = 6000;   /* 兜底：最多约 6s 强制进入出牌渲染 */
  var SHUFFLE_CARD_COUNT = 5;      /* 动画牌背张数 */
  var SHUFFLE_TEXTS = ["正在洗牌…", "凝神抽牌中…", "牌面缓缓浮现…"];

  function buildShuffleHtml() {
    var cards = "";
    for (var i = 0; i < SHUFFLE_CARD_COUNT; i++) cards += '<span class="mtx-shuffle-card"></span>';
    return '<div class="chat-bubble chat-bubble-text is-other mtx-shuffle-bubble"><div class="mtx-shuffle">' +
      '<div class="mtx-shuffle-cards">' + cards + "</div>" +
      '<div class="mtx-shuffle-text">' + esc(SHUFFLE_TEXTS[0]) + "</div></div></div>";
  }

  function setShuffleText(row, text) {
    var t = row && row.querySelector(".mtx-shuffle-text");
    if (t) t.textContent = text;
  }

  /* 把指定消息的气泡换成洗牌动画，动画结束（含淡出）后 resolve */
  function startShuffle(id) {
    return new Promise(function (resolve) {
      var box = $("mtxMessages");
      if (!box) { resolve(); return; }
      var row = box.querySelector('.chat-msg[data-id="' + id + '"]');
      if (!row) { renderMessages(); row = box.querySelector('.chat-msg[data-id="' + id + '"]'); }
      var col = row ? row.querySelector(".chat-msg-col") : null;
      if (!col) { resolve(); return; }
      var meta = row.querySelector(".chat-msg-meta");
      col.innerHTML = buildShuffleHtml() + (meta ? meta.outerHTML : "");
      row.classList.add("mtx-shuffle-row");
      scrollBottom();

      var finished = false;
      var timers = [];
      var finish = function () {
        if (finished) return;
        finished = true;
        timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
        timers = [];
        row.classList.add("mtx-shuffle-done");
        var out = setTimeout(function () { resolve(row); }, 340);   /* 淡出后再交给出牌渲染 */
        void out;
      };
      /* 阶段推进：洗牌 → 聚拢抽牌 → 亮出牌面 */
      var phase = 0;
      var phaseTimer = setInterval(function () {
        phase++;
        if (phase === 1) { row.classList.add("phase-draw"); setShuffleText(row, SHUFFLE_TEXTS[1]); }
        else if (phase === 2) { row.classList.add("phase-reveal"); setShuffleText(row, SHUFFLE_TEXTS[2]); clearInterval(phaseTimer); }
      }, SHUFFLE_PHASE_MS);
      timers.push(phaseTimer);
      timers.push(setTimeout(finish, SHUFFLE_ANIM_MS));      /* 动画自然结束 */
      timers.push(setTimeout(finish, SHUFFLE_TIMEOUT_MS));   /* 兜底强制结束 */
    });
  }

  /* ---------- 牌组选择弹窗 ---------- */
  function renderDeckMenu() {
    var deckBox = $("mtxDeckGrid");
    var spreadBox = $("mtxSpreadList");
    if (!deckBox || !spreadBox) return;
    if (!loadedMeta) {
      deckBox.innerHTML = '<div class="mtx-loading-tip">正在从镜界读取牌组…</div>';
      spreadBox.innerHTML = "";
      return;
    }
    if (!decks.length) {
      deckBox.innerHTML = '<div class="mtx-loading-tip">镜界里还没有可用牌组，请先在镜界中创建或启用牌组。</div>';
    } else {
      var mine = decks.filter(isMine), builtin = decks.filter(function (d) { return !isMine(d); });
      var html = "";
      function group(title, list) {
        if (!list.length) return "";
        var h = '<div class="mtx-sec-title">' + esc(title) + '<span class="mtx-sec-hint">' + list.length + " 组</span></div><div class=\"mtx-deck-grid\">";
        h += list.map(function (d) {
          return '<div class="mtx-deck-item' + (d.id === pick.deckId ? " is-on" : "") + '" data-deck="' + esc(d.id) + '" onclick="SnowCrystal.Mtx.pickDeck(this)">' +
            '<span class="mtx-deck-item-name">' + esc(d.name) + "</span>" +
            '<span class="mtx-deck-item-tag">' + (isMine(d) ? "我的牌组" : "内置") + "</span></div>";
        }).join("");
        return h + "</div>";
      }
      html += group("我的牌组", mine);
      html += group("内置牌组", builtin);
      deckBox.innerHTML = html;
    }
    if (!spreads.length) {
      spreadBox.innerHTML = '<div class="mtx-loading-tip">镜界里还没有可用牌阵，将按单张发牌。</div>';
    } else {
      spreadBox.innerHTML = "<div class=\"mtx-spread-list\">" + spreads.map(function (s) {
        return '<div class="mtx-spread-item' + (s.id === pick.spreadId ? " is-on" : "") + '" data-spread="' + esc(s.id) + '" onclick="SnowCrystal.Mtx.pickSpread(this)">' +
          '<span class="mtx-spread-name">' + esc(s.name) + "</span>" +
          '<span class="mtx-spread-count">' + (s.cardCount || 1) + " 张</span></div>";
      }).join("") + "</div>";
    }
    var chk = $("mtxRevChk");
    if (chk) chk.checked = pick.reversed !== false;
  }

  function openDeckMenu() {
    pick.deckId = state.deckId;
    pick.spreadId = state.spreadId;
    pick.reversed = state.reversed !== false;
    var m = $("mtxDeckMask");
    if (m) { m.classList.add("is-open"); m.setAttribute("aria-hidden", "false"); }
    renderDeckMenu();
    if (!loadedMeta) {
      loadMeta().then(function () { renderDeckMenu(); renderStatus(); save(); })
        .catch(function (err) { toast(String((err && err.message) || err)); renderDeckMenu(); });
    }
  }
  function closeDeckMenu() {
    var m = $("mtxDeckMask");
    if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
  }
  function pickDeck(el) {
    if (!el) return;
    var id = el.getAttribute("data-deck") || "";
    pick.deckId = id;
    var box = $("mtxDeckGrid");
    if (box) {
      var items = box.querySelectorAll(".mtx-deck-item");
      for (var i = 0; i < items.length; i++) items[i].classList.toggle("is-on", items[i] === el);
    }
  }
  function pickSpread(el) {
    if (!el) return;
    var id = el.getAttribute("data-spread") || "";
    pick.spreadId = id;
    var box = $("mtxSpreadList");
    if (box) {
      var items = box.querySelectorAll(".mtx-spread-item");
      for (var i = 0; i < items.length; i++) items[i].classList.toggle("is-on", items[i] === el);
    }
  }
  function saveDeckPick() {
    var chk = $("mtxRevChk");
    if (chk) pick.reversed = !!chk.checked;
    if (pick.deckId) { state.deckId = pick.deckId; state.deckName = deckNameOf(pick.deckId); }
    if (pick.spreadId) {
      var s = spreadOf(pick.spreadId);
      state.spreadId = pick.spreadId;
      state.spreadName = s ? s.name : state.spreadName;
      state.cardCount = s ? (s.cardCount || 1) : state.cardCount;
      state.positions = s ? (s.positions || []) : state.positions;
    }
    state.reversed = pick.reversed !== false;
    save();
    renderStatus();
    closeDeckMenu();
    toast("已选择：" + deckNameOf(state.deckId) + " · " + (state.spreadName || "单牌") + (state.reversed ? "（可逆位）" : "（不正逆）"));
  }
  function toggleReversed() {
    state.reversed = state.reversed === false;
    save();
    renderStatus();
  }

  /* ---------- 打开 / 返回 ---------- */
  function open() {
    load();
    try { if (S.Chat && typeof S.Chat.closePlusPanel === "function") S.Chat.closePlusPanel(); } catch (e) { /* ignore */ }

    var p = partnerProfile();
    var nameEl = $("mtxPartnerName");
    if (nameEl) nameEl.textContent = p.name || "次元镜界";
    var avEl = $("mtxPartnerAvatar");
    if (avEl) { avEl.className = "chat-msg-avatar mtx-head-avatar" + avatarCls(p); avEl.innerHTML = avatarHtml(p, "次"); }

    renderStatus();
    renderMessages();

    var nav = S.switchPage;
    if (typeof nav === "function") { try { nav("mtx-session"); } catch (e3) { /* ignore */ } }

    ensureBridge();
    if (!loadedMeta) {
      loadMeta().then(function () { renderStatus(); renderDeckMenu(); save(); })
        .catch(function (err) { toast(String((err && err.message) || err)); });
    }
  }

  function back() {
    try {
      if (typeof SnowCrystal.switchPage === "function") SnowCrystal.switchPage("chat-room");
    } catch (e) { /* ignore */ }
  }

  /* ---------- 输入框：点击兜底聚焦 + 回车发送（Shift+Enter 换行）---------- */
  function focusInput() {
    var inp = $("mtxInput");
    if (!inp) return;
    try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (_) { /* ignore */ } }
  }

  function bindInput() {
    var inp = $("mtxInput");
    if (!inp || inp.__mtxBound) return;
    inp.__mtxBound = true;
    inp.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        send();
      }
    });
    inp.addEventListener("input", function () {
      try {
        inp.style.height = "auto";
        inp.style.height = Math.min(inp.scrollHeight, 120) + "px";
      } catch (e) { /* ignore */ }
    });
    /* 部分 WebView 里直接点 textarea 不聚焦：整块输入区兜底，点到空白也聚焦 */
    var zone = inp.closest(".chat-room-input");
    if (zone) {
      var onTap = function (ev) {
        var t = ev.target;
        if (!t) return;
        if (t === inp) return;
        if (t.closest && t.closest("button")) return;
        focusInput();
      };
      zone.addEventListener("pointerdown", onTap);
      zone.addEventListener("click", function (ev) {
        var t = ev.target;
        if (t && t.closest && t.closest("button")) return;
        if (document.activeElement !== inp) focusInput();
      });
    }
  }

  function init() {
    load();
    bindInput();
    renderStatus();
    var m = $("mtxDeckMask");
    if (m) m.setAttribute("aria-hidden", "true");
  }

  S.Mtx = {
    open: open,
    back: back,
    send: send,
    openDeckMenu: openDeckMenu,
    closeDeckMenu: closeDeckMenu,
    pickDeck: pickDeck,
    pickSpread: pickSpread,
    saveDeckPick: saveDeckPick,
    toggleReversed: toggleReversed,
    reload: function () { loadedMeta = false; return loadMeta(); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
