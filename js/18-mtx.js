/* ============================================================================
 * 次元镜界 · 传讯（雪晶侧）
 * 对标：拾心界-镜界整合版 拾心界/js/transmit.js
 *
 * 通过隐藏 iframe 加载本地 镜界/index.html（其 jingjie-transmit.js 提供 RPC），
 * 以 postMessage 完成：ping 握手 / listDecks / listSpreads / draw（抽牌渲染 PNG）。
 *
 * 落地范围（雪晶版，单聊版）：
 *   - 月牙菜单「次元镜界」入口 -> 邀请当前聊天对象 -> 传讯页
 *   - 传讯页：发问（自己气泡）-> 洗牌动画 -> 对方抽牌（横排牌带气泡）
 *   - 牌组设置弹窗（牌组 / 牌阵 / 正逆位）
 *   - 时空回响：会话持久化（localStorage 索引 + 会话 JSON；牌图进 IndexedDB 引用，
 *     避免 localStorage 撑爆）、回看与删除
 *   - 传讯期间冻结外部世界（暂停来电模拟，结束恢复）
 *
 * 数据键：
 *   snowcrystal.mtx.index.v1            会话索引
 *   snowcrystal.mtx.session.<id>        会话详情
 *   IDB snowcrystal.mtx.media.v1       牌图 dataURL（ref: mtxmedia_<n>）
 * ==========================================================================*/
(function () {
  'use strict';

  /* ---------- 存储键 ---------- */
  var MTX_INDEX_KEY = 'snowcrystal.mtx.index.v1';
  var MTX_SESSION_PREFIX = 'snowcrystal.mtx.session.';
  var MTX_MEDIA_DB = 'snowcrystal.mtx.media.v1';
  var MTX_MEDIA_STORE = 'media';

  /* ---------- 基础工具 ---------- */
  function now() { return Date.now(); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var m = d.getMonth() + 1, day = d.getDate(), h = d.getHours(), mi = d.getMinutes();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return m + '月' + day + '日 ' + pad(h) + ':' + pad(mi);
  }

  function fmtDateTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }

  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* 忽略 */ } }

  /* ---------- 牌图 IndexedDB 引用存储（避免 localStorage 撑爆） ---------- */
  function mediaDB() {
    return new Promise(function (resolve, reject) {
      var req;
      try { req = window.indexedDB.open(MTX_MEDIA_DB, 1); } catch (e) { reject(e); return; }
      req.onerror = function () { reject(req.error || new Error('IDB error')); };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MTX_MEDIA_STORE)) {
          db.createObjectStore(MTX_MEDIA_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
    });
  }

  function mediaWrite(key, dataURL) {
    return mediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(MTX_MEDIA_STORE, 'readwrite');
          tx.objectStore(MTX_MEDIA_STORE).put({ key: key, data: dataURL, ts: Date.now() });
          tx.oncomplete = function () { resolve(key); };
          tx.onerror = function () { reject(tx.error); };
        } catch (e) { reject(e); }
      });
    });
  }

  function mediaRead(key) {
    return mediaDB().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(MTX_MEDIA_STORE, 'readonly');
          var req = tx.objectStore(MTX_MEDIA_STORE).get(key);
          req.onsuccess = function () { resolve(req.result ? req.result.data : null); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }

  function mediaNewKey() {
    return 'mtxmedia_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- RPC 桥（隐藏 iframe -> 镜界 jingjie-transmit.js） ---------- */
  var rpcFrame = null;
  var rpcPending = {};
  var rpcSeq = 1;
  var PING_MAX_TRIES = 50;
  var PING_TIMEOUT = 1500;
  var RPC_TIMEOUT = 12000;

  function ensureFrame() {
    if (rpcFrame && rpcFrame.contentWindow) return rpcFrame;
    if (!rpcFrame) {
      var frame = document.createElement('iframe');
      frame.id = 'mtx-rpc-frame';
      frame.src = './镜界/index.html';
      frame.style.cssText = 'position:fixed;width:0;height:0;visibility:hidden;border:0;display:none;';
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('tabindex', '-1');
      frame.setAttribute('aria-hidden', 'true');
      document.body.appendChild(frame);
      rpcFrame = frame;
    }
    return rpcFrame;
  }

  /* ping 轮询握手（对标拾心界 transmit.js ensureFrame）：
   * 创建 iframe 后立即轮询 ping，不依赖 load 事件与 readyState（刚创建的 iframe
   * contentDocument 为 about:blank，readyState=complete 会被误判为已就绪，若据此立即
   * 发 ping，真实镜界页面尚未加载、监听器未注册，消息将丢失且 rpcNoTimeout 无超时
   * 导致握手永久挂起）。单次 ping 带 PING_TIMEOUT 超时，超时/失败即重试，
   * 直到镜界 jingjie-transmit.js 注册监听（ping 返回 ok）或达到最大重试次数。 */
  function ensureReady() {
    var f = ensureFrame();
    return new Promise(function (resolve, reject) {
      var tries = 0;
      var started = false;
      var startPing = function () {
        if (started) return;
        started = true;
        var ping = function () {
          tries++;
          if (tries > PING_MAX_TRIES) { reject(new Error('镜界传讯通道握手失败')); return; }
          rpcNoTimeout('ping').then(function () { resolve(); }, function () {
            setTimeout(ping, 150);
          });
        };
        setTimeout(ping, 100);
      };
      startPing();
    });
  }

  /* 握手 ping：带 PING_TIMEOUT 超时，超时清理 pending 并 reject，供 ensureReady 轮询重试 */
  function rpcNoTimeout(op, payload) {
    var id = 'mtx' + (rpcSeq++);
    var f = ensureFrame();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        if (rpcPending[id]) { delete rpcPending[id]; reject(new Error(op + ' 超时')); }
      }, PING_TIMEOUT);
      rpcPending[id] = {
        resolve: function (v) { clearTimeout(timer); resolve(v); },
        reject: function (e) { clearTimeout(timer); reject(e); }
      };
      try {
        f.contentWindow.postMessage({ mtx: { op: op, id: id, payload: payload || {} } }, '*');
      } catch (e) {
        clearTimeout(timer);
        delete rpcPending[id];
        reject(e);
      }
    });
  }

  function rpc(op, payload, timeout) {
    var id = 'mtx' + (rpcSeq++);
    var f = ensureFrame();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        if (rpcPending[id]) { delete rpcPending[id]; reject(new Error(op + ' 超时')); }
      }, timeout || RPC_TIMEOUT);
      rpcPending[id] = {
        resolve: function (v) { clearTimeout(timer); resolve(v); },
        reject: function (e) { clearTimeout(timer); reject(e); }
      };
      try {
        f.contentWindow.postMessage({ mtx: { op: op, id: id, payload: payload || {} } }, '*');
      } catch (e) {
        clearTimeout(timer);
        delete rpcPending[id];
        reject(e);
      }
    });
  }

  window.addEventListener('message', function (ev) {
    if (!ev || !ev.data) return;
    var d = ev.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
    if (!d || !d.mtx || !d.mtx.id) return;
    var h = rpcPending[d.mtx.id];
    if (!h) return;
    delete rpcPending[d.mtx.id];
    if (d.mtx.ok) { h.resolve(d.mtx.result); }
    else { h.reject(new Error(String(d.mtx.result || 'rpc error'))); }
  });

  /* ---------- 会话状态 ---------- */
  var active = null; /* 当前进行中的会话（或回看中的会话） */
  var viewingEcho = false; /* 是否处于时空回响回看模式（只读） */
  var echoSource = null;   /* 时空回响入口来源页（探索页入口为 'discover'，空为聊天室/传讯顶栏） */
  var questionActive = false; /* 发问后等待抽牌 */
  var shuffleTimer = null;
  var worldFrozen = false;

  /* ---------- 外部世界冻结 / 恢复（传讯期间暂停来电模拟等） ---------- */
  function pauseWorld() {
    var C = null;
    try { C = window.SnowCrystal && window.SnowCrystal.Chat; } catch (e) { C = null; }
    if (!C) return;
    /* 关闭进行中 / 来电浮层，暂停来电模拟定时器 */
    try { if (typeof C.stopSimulateCallTimer === 'function') C.stopSimulateCallTimer(); } catch (e) { /* 忽略 */ }
    try {
      if (typeof C.hangupCall === 'function' && document.querySelector('.call-active-overlay')) C.hangupCall();
      if (typeof C.rejectIncomingCall === 'function' && document.querySelector('.call-incoming-overlay')) C.rejectIncomingCall();
    } catch (e) { /* 忽略 */ }
    worldFrozen = true;
  }

  function resumeWorld() {
    var C = null;
    try { C = window.SnowCrystal && window.SnowCrystal.Chat; } catch (e) { C = null; }
    if (!C) { worldFrozen = false; return; }
    /* 按设置开关安全恢复来电模拟（内部有 callAllow/callProb 判断） */
    try { if (typeof C.startSimulateCallTimer === 'function') C.startSimulateCallTimer(); } catch (e) { /* 忽略 */ }
    worldFrozen = false;
  }

  /* ---------- 当前聊天对象 ---------- */
  function currentPartner() {
    var C = null, pid = '';
    try { C = window.SnowCrystal && window.SnowCrystal.Chat; if (C && typeof C.getPartnerId === 'function') pid = C.getPartnerId() || ''; } catch (e) { pid = ''; }
    if (!pid) return null;
    var name = '对方', avatar = '';
    try {
      var c = (typeof C.loadChat === 'function') ? C.loadChat() : null;
      if (c && Array.isArray(c.chats)) {
        for (var i = 0; i < c.chats.length; i++) {
          if (c.chats[i] && c.chats[i].id === pid) { name = c.chats[i].name || name; avatar = c.chats[i].avatar || ''; break; }
        }
      }
    } catch (e) { /* 保持兜底 */ }
    return { id: pid, name: name, avatar: avatar };
  }

  /* ---------- 邀请 ---------- */
  function entryInvite() {
    var partner = currentPartner();
    if (!partner) {
      mtxToast('请先在聊天室里发起镜界传讯');
      return;
    }
    var modal = document.getElementById('mtxInviteModal');
    if (!modal) return;
    var nameEl = document.getElementById('mtxInviteName');
    if (nameEl) nameEl.textContent = partner.name || '对方';
    var avEl = document.getElementById('mtxInviteAvatar');
    if (avEl) {
      if (partner.avatar) {
        avEl.innerHTML = '<img class="mtx-invite-avatar-img" src="' + esc(partner.avatar) + '" alt="">';
      } else {
        avEl.textContent = String(partner.name || '缘').slice(0, 1);
      }
    }
    modal.style.display = 'flex';
  }

  function closeInviteModal() {
    var modal = document.getElementById('mtxInviteModal');
    if (modal) modal.style.display = 'none';
  }

  function confirmInvite() {
    closeInviteModal();
    mtxToast('正在为你连接镜界…');
    ensureReady().then(function () {
      var partner = currentPartner();
      if (!partner) { mtxToast('请先在聊天室里发起镜界传讯'); return; }
      var linkIn = document.getElementById('mtxLinkIn');
      if (linkIn) linkIn.classList.add('show');
      var timer = setTimeout(function () {
        /* 链接进入动效展示约 0.35s 后淡出，随即进入传讯页（2-3 秒窗口内） */
        if (linkIn) {
          linkIn.classList.add('hide');
          setTimeout(function () { linkIn.classList.remove('show', 'hide'); }, 350);
        }
        startSession(partner);
      }, 2300 + Math.random() * 500);
      var tEl = document.getElementById('mtxShuffleText');
      if (tEl) { tEl.textContent = '对方已同意你的邀请，正在进入次元镜界…'; }
    }, function () {
      mtxToast('镜界通道连接失败，请检查 镜界 文件夹是否完整');
    });
  }

  /* ---------- 会话开始 ---------- */
  function startSession(partner) {
    var id = 'mtx' + now().toString(36) + Math.random().toString(36).slice(2, 8);
    active = {
      id: id,
      kind: 'single',
      partnerId: partner.id,
      partnerName: partner.name,
      partnerAvatar: partner.avatar || '',
      deckSetting: null,
      items: [],
      created: now(),
      ended: 0
    };
    viewingEcho = false;
    questionActive = false;
    pauseWorld();
    switchPage('mtx-session');
    applyMtxBg();
    renderSessionHead(partner.name, false);
    var box = mtxBox();
    if (box) box.innerHTML = '';
    appendSystem('已连接镜界 · 次元传讯开启');
    appendSystem('向对方发问，对方将为你从镜界抽牌');
    openDeckModal();
  }

  function switchPage(name) {
    try { if (window.SnowCrystal && typeof window.SnowCrystal.switchPage === 'function') { window.SnowCrystal.switchPage(name); return; } } catch (e) { /* 忽略 */ }
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].getAttribute('data-page') === name) pages[i].classList.add('is-active');
      else pages[i].classList.remove('is-active');
    }
  }

  /* ---------- 传讯页 DOM ---------- */
  function mtxBox() { return document.getElementById('mtxMessages'); }

  function renderSessionHead(name, echoMode) {
    var title = document.getElementById('mtxRoomTitle');
    if (title) title.textContent = echoMode ? ('时空回响 · ' + name) : (name + ' · 镜界传讯');
    var headDeck = document.getElementById('mtxDeckHeadBtn');
    if (headDeck) headDeck.style.display = echoMode ? 'none' : 'inline-flex';
    var inputBar = document.getElementById('mtxInputBar');
    if (inputBar) inputBar.style.display = echoMode ? 'none' : 'flex';
    var bgBtn = document.getElementById('mtxBgBtn');
    if (bgBtn) bgBtn.style.display = echoMode ? 'none' : 'inline-flex';
  }

  /* ---------- 消息渲染 ---------- */
  function appendSystem(text) {
    if (!active) return;
    active.items.push({ role: 'system', text: String(text || ''), time: now() });
    var box = mtxBox();
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'mtx-sys';
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function appendSelf(text) {
    if (!active) return;
    active.items.push({ role: 'self', text: String(text || ''), time: now() });
    var box = mtxBox();
    if (!box) return;
    /* 气泡商城：次元镜界文本消息同样应用指派气泡（对标拾心界 buildBubbleExt 全场景生效） */
    var bubExtra = "";
    try {
      if (window.SnowBubble && typeof window.SnowBubble.extraClsFor === "function") {
        bubExtra = window.SnowBubble.extraClsFor(active.partnerId || "", true, null);
      }
    } catch (e) { bubExtra = ""; }
    var html = '<div class="chat-msg is-self"><span class="chat-msg-avatar chat-avatar-square"><span class="chat-avatar-ph">我</span></span>' +
      '<div class="chat-msg-col"><div class="chat-bubble is-self' + bubExtra + '">' + esc(text) + '</div>' +
      '<div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(now())) + '</span></div></div></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    box.appendChild(wrap.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function appendOtherCards(cards) {
    if (!active) return;
    active.items.push({ role: 'other', cards: cards, time: now() });
    var box = mtxBox();
    if (!box) return;
    var name = active.partnerName || '对方';
    /* 气泡商城：对方牌消息同样应用指派气泡（与聊天室/拾心界对方消息一致，幂等注入） */
    var bubExtra = "";
    try {
      if (window.SnowBubble && typeof window.SnowBubble.extraClsFor === "function") {
        bubExtra = window.SnowBubble.extraClsFor(active.partnerId || "", false, null);
      }
    } catch (e) { bubExtra = ""; }
    /* 仅当允许逆位且该牌为逆位时显示“逆位”，否则不显示正逆位标识 */
    var revEnabled = !!(active.deckSetting && active.deckSetting.reversedEnabled);
    var html = '<div class="chat-msg is-other"><span class="chat-msg-avatar chat-avatar-square"><span class="chat-avatar-ph">' + esc(name.slice(0, 1)) + '</span></span>' +
      '<div class="chat-msg-col"><div class="chat-bubble is-other mtx-cards-bubble' + bubExtra + '">' +
      '<div class="mtx-cards">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i] || {};
      html += '<div class="mtx-card">' +
        '<img class="mtx-card-img' + ((revEnabled && c.reversed) ? ' is-rev' : '') + '" data-src="' + esc(c.ref || '') + '" alt="' + esc(c.name || '') + '">' +
        '<div class="mtx-card-name">' + esc(c.name || '') + '</div>' +
        ((revEnabled && c.reversed) ? '<div class="mtx-card-dir">逆位</div>' : '') +
        '</div>';
    }
    html += '</div><div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(now())) + '</span></div>' +
      '</div></div></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    box.appendChild(wrap.firstChild);
    box.scrollTop = box.scrollHeight;
    loadMtxImgs(box);
  }

  /* 异步取回牌图：data-src 存 mediaKey（mtxmedia_*），由 IDB 解析 */
  function loadMtxImgs(scope) {
    var imgs = scope ? scope.querySelectorAll('img.mtx-card-img[data-src^="mtxmedia_"]') : [];
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var key = img.getAttribute('data-src');
        mediaRead(key).then(function (dataURL) {
          if (dataURL && img.getAttribute('data-src') === key) { img.src = dataURL; img.classList.add('loaded'); }
        });
      })(imgs[i]);
    }
  }

  /* ---------- 洗牌动画（对标拾心界：牌背卡堆交错洗牌；改造：在对方消息气泡内播放，3-4 秒后出牌） ---------- */
  function showShuffleAnimation() {
    var box = mtxBox();
    if (!box) return null;
    var name = active ? (active.partnerName || '对方') : '对方';
    /* 气泡商城：占位气泡同样应用指派气泡，出牌后气泡保持不变（问题1规则一致） */
    var bubExtra = "";
    try {
      if (window.SnowBubble && typeof window.SnowBubble.extraClsFor === "function") {
        bubExtra = window.SnowBubble.extraClsFor(active ? (active.partnerId || "") : "", false, null);
      }
    } catch (e) { bubExtra = ""; }
    var html = '<div class="chat-msg is-other"><span class="chat-msg-avatar chat-avatar-square"><span class="chat-avatar-ph">' + esc(name.slice(0, 1)) + '</span></span>' +
      '<div class="chat-msg-col"><div class="chat-bubble is-other mtx-cards-bubble mtx-anim-bubble' + bubExtra + '">' +
      '<div class="mtx-shuffle">' +
        '<div class="mtx-shuffle-deck">' +
          '<span class="card-back"></span><span class="card-back"></span><span class="card-back"></span>' +
          '<span class="card-back"></span><span class="card-back"></span>' +
        '</div>' +
        '<span class="mtx-shuffle-text" id="mtxShuffleText">对方正在凝神洗牌…</span>' +
      '</div>' +
      '<div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(now())) + '</span></div>' +
      '</div></div></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var node = wrap.firstChild;
    var bubble = node.querySelector('.chat-bubble');
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
    var step = 0;
    bubble._mtxStartedAt = Date.now();
    shuffleTimer = setInterval(function () {
      step++;
      var tEl = document.getElementById('mtxShuffleText');
      if (!tEl || !bubble.parentNode) { clearInterval(shuffleTimer); return; }
      if (step === 1) tEl.textContent = '正在连接镜界牌阵…';
      else if (step === 2) tEl.textContent = '对方凝神抽牌中…';
      else if (step === 3) tEl.textContent = '牌阵已显现…';
    }, 800);
    return bubble;
  }

  /* 清除洗牌动画：默认移除占位气泡；传 false 时仅清定时器（出牌后调用，气泡已保留牌内容） */
  function clearShuffleAnimation(removeBubble) {
    if (shuffleTimer) { clearInterval(shuffleTimer); shuffleTimer = null; }
    if (removeBubble === false) return;
    var wrap = document.querySelector('#mtxMessages .mtx-anim-bubble');
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    else {
      var bar = document.querySelector('#mtxMessages .mtx-shuffle');
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    }
  }

  /* 把最终牌渲染进占位气泡（替换气泡内洗牌动画，保持气泡与指定气泡类不变） */
  function renderCardsIntoBubble(bubble, cards) {
    if (!bubble || !bubble.parentNode) return;
    var revEnabled = !!(active && active.deckSetting && active.deckSetting.reversedEnabled);
    var html = '<div class="mtx-cards">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i] || {};
      html += '<div class="mtx-card">' +
        '<img class="mtx-card-img' + ((revEnabled && c.reversed) ? ' is-rev' : '') + '" data-src="' + esc(c.ref || '') + '" alt="' + esc(c.name || '') + '">' +
        '<div class="mtx-card-name">' + esc(c.name || '') + '</div>' +
        ((revEnabled && c.reversed) ? '<div class="mtx-card-dir">逆位</div>' : '') +
        '</div>';
    }
    html += '</div>';
    var old = bubble.querySelector('.mtx-shuffle');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var cardsEl = tmp.firstChild;
    var meta = bubble.querySelector('.chat-msg-meta');
    if (meta && meta.parentNode) meta.parentNode.insertBefore(cardsEl, meta);
    else bubble.appendChild(cardsEl);
    var tEl = bubble.querySelector('.chat-msg-time');
    if (tEl) tEl.textContent = esc(fmtTime(now()));
    loadMtxImgs(bubble);
  }

  /* ---------- 牌组设置 ---------- */
  var deckMeta = { decks: [], spreads: [] };
  var deckChosen = { deckId: '', spreadId: '', reversedEnabled: true };

  function openDeckModal() {
    var modal = document.getElementById('mtxDeckModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var listWrap = document.getElementById('mtxDeckList');
    if (listWrap) listWrap.innerHTML = '<div class="mtx-loading">正在读取镜界牌组…</div>';
    if (active && active.deckSetting) {
      deckChosen = {
        deckId: active.deckSetting.deckId,
        spreadId: active.deckSetting.spreadId,
        reversedEnabled: active.deckSetting.reversedEnabled !== false
      };
    } else {
      deckChosen = { deckId: '', spreadId: '', reversedEnabled: true };
    }
    ensureReady().then(function () {
      return Promise.all([rpc('listDecks'), rpc('listSpreads')]);
    }).then(function (res) {
      deckMeta.decks = res[0] || [];
      deckMeta.spreads = res[1] || [];
      renderDeckLists();
    }, function () {
      var listWrap = document.getElementById('mtxDeckList');
      if (listWrap) listWrap.innerHTML = '<div class="mtx-loading">镜界牌组读取失败，请确认 镜界 文件夹完整</div>';
    });
  }

  function renderDeckLists() {
    var listWrap = document.getElementById('mtxDeckList');
    if (!listWrap) return;
    if (!deckMeta.decks.length) { listWrap.innerHTML = '<div class="mtx-loading">镜界暂无可用牌组</div>'; return; }
    if (!deckChosen.deckId) deckChosen.deckId = deckMeta.decks[0].id;
    var html = '<div class="mtx-modal-sec">';
    html += '<div class="mtx-modal-sec-title">选择牌组</div><div class="mtx-pick-row mtx-pick-row-deck">';
    for (var i = 0; i < deckMeta.decks.length; i++) {
      var d = deckMeta.decks[i];
      html += '<button type="button" class="mtx-pick-chip' + (deckChosen.deckId === d.id ? ' is-on' : '') + '" data-deck="' + esc(d.id) + '" onclick="SnowCrystal.Mtx.pickDeck(\'' + esc(d.id) + '\')">' + esc(d.name || d.id) + '</button>';
    }
    html += '</div></div>';
    html += '<div class="mtx-modal-sec"><div class="mtx-modal-sec-title">选择牌阵</div><div class="mtx-pick-row mtx-pick-row-spread">';
    for (var j = 0; j < deckMeta.spreads.length; j++) {
      var s = deckMeta.spreads[j];
      html += '<button type="button" class="mtx-pick-chip' + (deckChosen.spreadId === s.id ? ' is-on' : '') + '" data-spread="' + esc(s.id) + '" onclick="SnowCrystal.Mtx.pickSpread(\'' + esc(s.id) + '\')">' + esc(s.name || s.id) + '<i>' + esc(String(s.cardCount || 1)) + '张</i></button>';
    }
    html += '</div></div>';
    html += '<div class="mtx-modal-sec"><label class="mtx-rev-row"><input type="checkbox" id="mtxRevToggle" ' + (deckChosen.reversedEnabled ? 'checked' : '') + ' onchange="SnowCrystal.Mtx.toggleReversed()"> <span>允许逆位</span></label></div>';
    listWrap.innerHTML = html;
    var posHint = document.getElementById('mtxSpreadHint');
    if (posHint) {
      var spread = findSpread(deckChosen.spreadId);
      posHint.textContent = spread && spread.positions && spread.positions.length
        ? '牌阵位：' + spread.positions.join(' · ') : '';
    }
  }

  function findSpread(id) {
    for (var i = 0; i < deckMeta.spreads.length; i++) { if (deckMeta.spreads[i].id === id) return deckMeta.spreads[i]; }
    return null;
  }

  function pickDeck(id) { deckChosen.deckId = id; renderDeckLists(); }
  function pickSpread(id) {
    deckChosen.spreadId = id;
    var spread = findSpread(id);
    if (spread && spread.positions && spread.positions.length) {
      var hint = document.getElementById('mtxSpreadHint');
      if (hint) hint.textContent = '牌阵位：' + spread.positions.join(' · ');
    }
    renderDeckLists();
  }
  function toggleReversed() {
    var el = document.getElementById('mtxRevToggle');
    deckChosen.reversedEnabled = !!(el && el.checked);
  }

  function closeDeckModal() {
    var modal = document.getElementById('mtxDeckModal');
    if (modal) modal.style.display = 'none';
  }

  function confirmDeckSetting() {
    if (!deckChosen.deckId) { mtxToast('请先选择牌组'); return; }
    var spread = findSpread(deckChosen.spreadId);
    var setting = {
      deckId: deckChosen.deckId,
      deckName: deckNameOf(deckChosen.deckId),
      spreadId: deckChosen.spreadId || '',
      spreadName: spread ? spread.name : '',
      cardCount: spread ? (spread.cardCount || 1) : 1,
      positions: spread && spread.positions ? spread.positions.slice() : [],
      reversedEnabled: deckChosen.reversedEnabled
    };
    if (active) active.deckSetting = setting;
    closeDeckModal();
    var ph = document.getElementById('mtxInput');
    if (ph) ph.placeholder = '向镜界发问，让对方为你抽牌';
    appendSystem('牌组已设置：' + setting.deckName + (setting.spreadName ? ' · ' + setting.spreadName : ''));
  }

  function deckNameOf(id) {
    for (var i = 0; i < deckMeta.decks.length; i++) { if (deckMeta.decks[i].id === id) return deckMeta.decks[i].name || id; }
    return id;
  }

  /* ---------- 发问 ---------- */
  function sendQuestion() {
    if (!active || viewingEcho) return;
    if (questionActive) { mtxToast('对方正在抽牌，请稍候'); return; }
    if (!active.deckSetting) { mtxToast('请先设置牌组'); openDeckModal(); return; }
    var inp = document.getElementById('mtxInput');
    var text = inp ? String(inp.value || '').replace(/^\s+|\s+$/g, '') : '';
    if (!text) return;
    if (inp) inp.value = '';
    appendSelf(text);
    questionActive = true;
    var bar = showShuffleAnimation();
    var setting = active.deckSetting;
    rpc('draw', {
      deckId: setting.deckId,
      count: setting.cardCount || 1,
      reversedEnabled: setting.reversedEnabled !== false,
      positions: setting.positions || []
    }).then(function (rawCards) {
      /* 洗牌动画至少展示 3.4 秒（3-4 秒窗口），抽牌结果随后在对方消息气泡内渲染 */
      var elapsed = Date.now() - ((bar && bar._mtxStartedAt) || Date.now());
      var hold = Math.max(0, 3400 - elapsed);
      var cards = [];
      var jobs = [];
      for (var i = 0; i < rawCards.length; i++) {
        (function (rc) {
          jobs.push(mediaWrite(mediaNewKey(), rc.image || '').then(function (ref) {
            cards.push({
              ref: ref,
              name: rc.name || '',
              nameEn: rc.nameEn || '',
              reversed: !!rc.reversed,
              position: rc.position || '',
              deckName: rc.deckName || '',
              deckType: rc.deckType || ''
            });
          }));
        })(rawCards[i]);
      }
      return Promise.all(jobs).then(function () {
        return new Promise(function (resolve) { setTimeout(resolve, hold); });
      }).then(function () {
        /* 出牌：仅清定时器，保留占位气泡并把牌渲染进去（气泡样式/指定气泡类不变） */
        clearShuffleAnimation(false);
        questionActive = false;
        if (!active) return;
        renderCardsIntoBubble(bar, cards);
        active.items.push({ role: 'other', cards: cards, time: now() });
      });
    }, function (err) {
      clearShuffleAnimation(true);
      questionActive = false;
      appendSystem('抽牌失败：' + String((err && err.message) || err));
    });
  }

  /* ---------- 结束传讯 ---------- */
  function endSession() {
    if (!active) return;
    if (viewingEcho) {
      /* 回看模式：返回时空回响列表 */
      switchPage('mtx-echo');
      renderEchoList();
      active = null;
      viewingEcho = false;
      return;
    }
    if (!window.confirm('结束本次镜界传讯？对话将存入时空回响。')) return;
    var s = active;
    s.ended = now();
    saveSession(s);
    var C = null;
    try { C = window.SnowCrystal && window.SnowCrystal.Chat; } catch (e) { C = null; }
    var goBackChatRoom = false;
    if (C && typeof C.getPartnerId === 'function') {
      try { goBackChatRoom = (C.getPartnerId() === s.partnerId); } catch (e) { goBackChatRoom = false; }
    }
    resumeWorld();
    active = null;
    if (goBackChatRoom) {
      switchPage('chat-room');
      try { if (C && typeof C.renderMessages === 'function') C.renderMessages(s.partnerId, true); } catch (e) { /* 忽略 */ }
    } else {
      switchPage('chat-list');
      try { if (C && typeof C.renderChatList === 'function') C.renderChatList(); } catch (e) { /* 忽略 */ }
    }
    mtxToast('传讯已结束，已存入时空回响');
  }

  /* ---------- 持久化 ---------- */
  function saveSession(s) {
    try { lsSet(MTX_SESSION_PREFIX + s.id, s); } catch (e) { /* 忽略 */ }
    updateIndex(s);
  }

  function updateIndex(s) {
    var idx = lsGet(MTX_INDEX_KEY) || [];
    var found = -1, i;
    for (i = 0; i < idx.length; i++) { if (idx[i].id === s.id) { found = i; break; } }
    var item = {
      id: s.id,
      partnerId: s.partnerId,
      partnerName: s.partnerName,
      startedAt: s.created,
      endedAt: s.ended || s.created,
      questionCount: countRole(s.items, 'self'),
      cardCount: countCards(s.items)
    };
    if (found >= 0) { idx[found] = item; }
    else { idx.unshift(item); }
    lsSet(MTX_INDEX_KEY, idx);
  }

  function countRole(items, role) {
    var n = 0, i;
    for (i = 0; i < items.length; i++) { if (items[i] && items[i].role === role) n++; }
    return n;
  }

  function countCards(items) {
    var n = 0, i;
    for (i = 0; i < items.length; i++) { if (items[i] && items[i].cards && items[i].cards.length) n += items[i].cards.length; }
    return n;
  }

  function loadSession(id) {
    return lsGet(MTX_SESSION_PREFIX + id);
  }

  /* ---------- 时空回响 ---------- */
  /* src：入口来源页，探索页入口传 'discover'，聊天室/传讯顶栏不传 */
  function openEcho(src) {
    echoSource = (typeof src === 'string' && src) ? src : null;
    switchPage('mtx-echo');
    renderEchoList();
  }

  /* 时空回响页返回：传讯中则回传讯页；否则回入口来源页（探索页）；无来源则回聊天室 */
  function backFromEcho() {
    if (active && !viewingEcho) { switchPage('mtx-session'); return; }
    if (echoSource) { var p = echoSource; echoSource = null; switchPage(p); return; }
    switchPage('chat-room');
  }

  function renderEchoList() {
    var wrap = document.getElementById('mtxEchoList');
    if (!wrap) return;
    var idx = lsGet(MTX_INDEX_KEY) || [];
    if (!idx.length) {
      wrap.innerHTML = '<div class="mtx-echo-empty">还没有时空回响<br>结束一次镜界传讯后，会在这里留下痕迹</div>';
      var foot = document.getElementById('mtxEchoFoot');
      if (foot) foot.style.display = 'none';
      return;
    }
    var foot = document.getElementById('mtxEchoFoot');
    if (foot) foot.style.display = 'block';
    var html = '';
    for (var i = 0; i < idx.length; i++) {
      var it = idx[i];
      html += '<div class="mtx-echo-item">' +
        '<div class="mtx-echo-main">' +
        '<div class="mtx-echo-name">' + esc(it.partnerName || '对方') + '</div>' +
        '<div class="mtx-echo-sub">' + esc(fmtDateTime(it.startedAt)) + ' · ' +
          esc(String(it.questionCount || 0)) + '问 · ' + esc(String(it.cardCount || 0)) + '张牌</div>' +
        '</div>' +
        '<div class="mtx-echo-ops">' +
        '<button type="button" class="mtx-echo-btn" onclick="SnowCrystal.Mtx.viewEcho(\'' + esc(it.id) + '\')">回看</button>' +
        '<button type="button" class="mtx-echo-btn danger" onclick="SnowCrystal.Mtx.deleteEcho(\'' + esc(it.id) + '\')">删除</button>' +
        '</div></div>';
    }
    wrap.innerHTML = html;
  }

  function viewEcho(id) {
    var s = loadSession(id);
    if (!s) { mtxToast('回响记录不存在'); return; }
    active = s;
    viewingEcho = true;
    switchPage('mtx-session');
    renderSessionHead(s.partnerName || '对方', true);
    var box = mtxBox();
    if (!box) return;
    box.innerHTML = '';
    var i, item;
    for (i = 0; i < s.items.length; i++) {
      item = s.items[i];
      if (item.role === 'system') {
        var d = document.createElement('div');
        d.className = 'mtx-sys';
        d.textContent = item.text || '';
        box.appendChild(d);
      } else if (item.role === 'self') {
        var wrap1 = document.createElement('div');
        /* 气泡商城：回看 self 文本消息同样应用指派气泡，与实时发送一致 */
        var bubExtra1 = "";
        try {
          if (window.SnowBubble && typeof window.SnowBubble.extraClsFor === "function") {
            bubExtra1 = window.SnowBubble.extraClsFor(s.partnerId || "", true, null);
          }
        } catch (e) { bubExtra1 = ""; }
        wrap1.innerHTML = '<div class="chat-msg is-self"><span class="chat-msg-avatar chat-avatar-square"><span class="chat-avatar-ph">我</span></span><div class="chat-msg-col"><div class="chat-bubble is-self' + bubExtra1 + '">' + esc(item.text || '') + '</div><div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(item.time)) + '</span></div></div></div>';
        box.appendChild(wrap1.firstChild);
      } else if (item.role === 'other') {
        var cards = item.cards || [];
        /* 回看同样按会话牌组设置判断正逆位显示 */
        var revEnabled = !!(s.deckSetting && s.deckSetting.reversedEnabled);
        /* 气泡商城：回看对方牌消息同样应用指派气泡（与实时发送一致） */
        var bubExtra2 = "";
        try {
          if (window.SnowBubble && typeof window.SnowBubble.extraClsFor === "function") {
            bubExtra2 = window.SnowBubble.extraClsFor(s.partnerId || "", false, null);
          }
        } catch (e) { bubExtra2 = ""; }
        var html2 = '<div class="chat-msg is-other"><span class="chat-msg-avatar chat-avatar-square"><span class="chat-avatar-ph">' + esc((s.partnerName || '对方').slice(0, 1)) + '</span></span><div class="chat-msg-col"><div class="chat-bubble is-other mtx-cards-bubble' + bubExtra2 + '"><div class="mtx-cards">';
        for (var k = 0; k < cards.length; k++) {
          var c = cards[k] || {};
          html2 += '<div class="mtx-card"><img class="mtx-card-img' + ((revEnabled && c.reversed) ? ' is-rev' : '') + '" data-src="' + esc(c.ref || '') + '" alt="' + esc(c.name || '') + '"><div class="mtx-card-name">' + esc(c.name || '') + '</div>' + ((revEnabled && c.reversed) ? '<div class="mtx-card-dir">逆位</div>' : '') + '</div>';
        }
        html2 += '</div><div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(item.time)) + '</span></div></div></div></div>';
        var wrap2 = document.createElement('div');
        wrap2.innerHTML = html2;
        box.appendChild(wrap2.firstChild);
      }
    }
    box.scrollTop = box.scrollHeight;
    loadMtxImgs(box);
  }

  function deleteEcho(id) {
    if (!window.confirm('删除这条时空回响？此操作不可恢复。')) return;
    lsDel(MTX_SESSION_PREFIX + id);
    var idx = lsGet(MTX_INDEX_KEY) || [];
    var out = [], i;
    for (i = 0; i < idx.length; i++) { if (idx[i].id !== id) out.push(idx[i]); }
    lsSet(MTX_INDEX_KEY, out);
    renderEchoList();
    mtxToast('已删除');
  }

  function clearAllEcho() {
    var idx = lsGet(MTX_INDEX_KEY) || [];
    if (!idx.length) { mtxToast('暂无回响记录'); return; }
    if (!window.confirm('清空全部时空回响？此操作不可恢复。')) return;
    for (var i = 0; i < idx.length; i++) { lsDel(MTX_SESSION_PREFIX + idx[i].id); }
    lsSet(MTX_INDEX_KEY, []);
    renderEchoList();
    mtxToast('已清空');
  }

  /* ---------- 传讯页背景设置（机制对齐网站聊天背景：模式 + 自定义图片持久化） ---------- */
  var MTX_BG_KEY = 'snowcrystal.mtx.wallpaper2';
  var MTX_BG_CUSTOM_KEY = 'snowcrystal.mtx.wallpaperCustom2';

  function loadMtxBgSetting() {
    var raw = null;
    try { raw = lsGet(MTX_BG_KEY); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object' || !raw.mode) raw = { mode: 'theme' };
    return raw;
  }

  function applyMtxBg() {
    var page = document.querySelector('.page[data-page="mtx-session"]');
    if (!page) return;
    var st = loadMtxBgSetting();
    page.setAttribute('data-mtx-bg', st.mode || 'theme');
    if ((st.mode || 'theme') === 'custom') {
      var dataUrl = '';
      try { dataUrl = lsGet(MTX_BG_CUSTOM_KEY) || ''; } catch (e) { dataUrl = ''; }
      page.style.setProperty('--mtx-bg-img', dataUrl ? ('url("' + dataUrl + '")') : 'transparent');
    } else {
      page.style.removeProperty('--mtx-bg-img');
    }
    /* 气泡跟随网站聊天设置：同步 data-bubble-mode 与 custom 变量 */
    var room = document.querySelector('.page[data-page="chat-room"]');
    if (room) {
      var mode = room.getAttribute('data-bubble-mode') || 'theme';
      page.setAttribute('data-bubble-mode', mode);
      var keys = ['--bubble-self-c', '--bubble-self-ink', '--bubble-self-text', '--bubble-other-c', '--bubble-other-ink', '--bubble-other-text', '--bubble-quote-bg-rgb', '--bubble-quote-text', '--bubble-quote-a'];
      for (var i = 0; i < keys.length; i++) {
        var v = room.style.getPropertyValue(keys[i]);
        if (v) page.style.setProperty(keys[i], v);
        else page.style.removeProperty(keys[i]);
      }
    }
  }

  function openMtxBgModal() {
    var modal = document.getElementById('mtxBgModal');
    if (!modal) return;
    modal.style.display = 'flex';
    var st = loadMtxBgSetting();
    var mode = st.mode || 'theme';
    /* 兼容旧存储：浅色底/纯透明已下线，自动回退为跟随主题 */
    if (mode !== 'theme' && mode !== 'custom') {
      mode = 'theme';
      st.mode = 'theme';
      try { lsSet(MTX_BG_KEY, st); } catch (e) { /* 忽略 */ }
      applyMtxBg();
    }
    var ids = { theme: 'mtxBgTheme', custom: 'mtxBgCustom' };
    for (var k in ids) {
      var el = document.getElementById(ids[k]);
      if (el) el.classList.toggle('is-on', k === mode);
    }
    var dataUrl = '';
    try { dataUrl = lsGet(MTX_BG_CUSTOM_KEY) || ''; } catch (e) { dataUrl = ''; }
    var clearBtn = document.getElementById('mtxBgClearBtn');
    if (clearBtn) clearBtn.hidden = !dataUrl;
  }

  function closeMtxBgModal() {
    var modal = document.getElementById('mtxBgModal');
    if (modal) modal.style.display = 'none';
  }

  function setMtxBgMode(mode) {
    var st = loadMtxBgSetting();
    st.mode = mode;
    try { lsSet(MTX_BG_KEY, st); } catch (e) { /* 忽略 */ }
    applyMtxBg();
    var modal = document.getElementById('mtxBgModal');
    if (modal) modal.style.display = 'none';
    mtxToast(mode === 'theme' ? '传讯背景已恢复跟随主题' : '传讯背景已更新');
  }

  function chooseMtxBgFile() {
    var input = document.getElementById('mtxBgFileInput');
    if (input) input.click();
  }

  function onMtxBgFileChange(ev) {
    var file = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type || '')) {
      mtxToast('请选择图片文件（JPG/PNG/WebP）');
      if (ev && ev.target) ev.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || '');
      /* 先用 Image 解码校验：HEIC 等浏览器不支持渲染的格式直接拒绝，避免“保存成功但背景不显示” */
      var img = new Image();
      img.onload = function () {
        var saved = compressMtxBgImage(img, img.naturalWidth, img.naturalHeight);
        if (!saved) {
          mtxToast('图片处理失败，请更换图片');
          if (ev && ev.target) ev.target.value = '';
          return;
        }
        if (!lsSet(MTX_BG_CUSTOM_KEY, saved)) {
          mtxToast('图片过大，保存失败，请换一张较小的图片');
          if (ev && ev.target) ev.target.value = '';
          return;
        }
        var st = loadMtxBgSetting();
        st.mode = 'custom';
        if (!lsSet(MTX_BG_KEY, st)) { mtxToast('背景设置保存失败'); return; }
        applyMtxBg();
        var modal = document.getElementById('mtxBgModal');
        if (modal) modal.style.display = 'none';
        mtxToast('传讯背景已更新为自定义图片');
        if (ev && ev.target) ev.target.value = '';
      };
      img.onerror = function () {
        mtxToast('图片格式不受支持，请使用 JPG/PNG/WebP');
        if (ev && ev.target) ev.target.value = '';
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  /* 上传背景压缩：最长边不超过 1440，优先转 WebP（保留透明），失败回退 JPEG，
     确保任意图片都能存入 localStorage（5MB 上限），避免静默保存失败 */
  function compressMtxBgImage(img, w, h) {
    var MAX = 1440;
    var scale = Math.min(1, MAX / Math.max(w || 1, h || 1));
    var tw = Math.max(1, Math.round((w || 1) * scale));
    var th = Math.max(1, Math.round((h || 1) * scale));
    try {
      var canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      var ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(img, 0, 0, tw, th);
      var out = '';
      try { out = canvas.toDataURL('image/webp', 0.86); } catch (e) { out = ''; }
      if (!out || out.length > 2000000) {
        try { out = canvas.toDataURL('image/jpeg', 0.85); } catch (e) { out = ''; }
      }
      return out || '';
    } catch (e) { return ''; }
  }

  function clearMtxBgCustom() {
    try { lsDel(MTX_BG_CUSTOM_KEY); } catch (e) { /* 忽略 */ }
    var st = loadMtxBgSetting();
    st.mode = 'theme';
    try { lsSet(MTX_BG_KEY, st); } catch (e) { /* 忽略 */ }
    applyMtxBg();
    var clearBtn = document.getElementById('mtxBgClearBtn');
    if (clearBtn) clearBtn.hidden = true;
    mtxToast('已移除自定义背景，恢复跟随主题');
  }

  /* ---------- 轻量提示 ---------- */
  var mtxToastTimer = null;
  function mtxToast(text) {
    var el = document.getElementById('mtxToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mtxToast';
      el.className = 'mtx-toast';
      document.body.appendChild(el);
    }
    el.textContent = text || '';
    el.classList.add('show');
    if (mtxToastTimer) { clearTimeout(mtxToastTimer); }
    mtxToastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- 接口 ---------- */
  var Mtx = {
    entryInvite: entryInvite,
    closeInviteModal: closeInviteModal,
    confirmInvite: confirmInvite,
    openDeckModal: openDeckModal,
    closeDeckModal: closeDeckModal,
    confirmDeckSetting: confirmDeckSetting,
    pickDeck: pickDeck,
    pickSpread: pickSpread,
    toggleReversed: toggleReversed,
    sendQuestion: sendQuestion,
    endSession: endSession,
    openEcho: openEcho,
    backFromEcho: backFromEcho,
    viewEcho: viewEcho,
    deleteEcho: deleteEcho,
    clearAllEcho: clearAllEcho,
    openMtxBgModal: openMtxBgModal,
    closeMtxBgModal: closeMtxBgModal,
    setMtxBgMode: setMtxBgMode,
    chooseMtxBgFile: chooseMtxBgFile,
    onMtxBgFileChange: onMtxBgFileChange,
    clearMtxBgCustom: clearMtxBgCustom
  };

  if (!window.SnowCrystal) { window.SnowCrystal = {}; }
  window.SnowCrystal.Mtx = Mtx;
})();
