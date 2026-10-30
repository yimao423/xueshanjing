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
  /* 发热优化 P1-2：洗牌占位文案定时器 —— setTimeout 链替代 setInterval；
     _shuffleStep 当前文案步进；_shuffleNextAt 下一跳计划时间（用于暂停续播）；
     _shuffleBubble 当前洗牌气泡引用；_shuffleStopped 出牌/清除后置 true 不再续播；
     _shufflePhase 洗牌阶段（0 洗牌 / 1 聚拢即终态）；_shufflePhaseDone 动画已到终态 */
  var _shuffleStep = 0;
  var _shufflePhase = 0;
  var _shufflePhaseDone = false;
  var _shuffleNextAt = 0;
  var _shuffleBubble = null;
  var _shuffleStopped = true;
  var _shuffleStepTimer = null;
  var _shuffleMainTimer = null;   /* 动画总时长到点自动淡出（showShuffleAnimation 设置，clearShuffleAnimation 清理） */
  var _shuffleGuardTimer = null;  /* 超时兜底强制移除动画块（showShuffleAnimation 设置，clearShuffleAnimation 清理） */
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
    mtxApplyStored();
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

  /* ---------- 消息头像 / 昵称（对标今日传讯聊天室 avatarOf / avatarOfMy 渲染） ---------- */
  function mtxLoadMy() {
    var m = lsGet("snowcrystal.account.my.v1");
    return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
  }
  function mtxShapeClsForMy() {
    var m = mtxLoadMy();
    return (m && m.shape === "circle") ? " chat-avatar-circle" : " chat-avatar-square";
  }
  function mtxMyAvatarInner() {
    var m = mtxLoadMy();
    if (m && m.avatar) { return '<img class="chat-avatar-img" src="' + esc(m.avatar) + '" alt="">'; }
    return '<span class="chat-avatar-ph">' + esc(String((m && m.name) || "我").slice(0, 1)) + "</span>";
  }
  function mtxPartnerShapeCls(partnerId) {
    try {
      var ps = lsGet("snowcrystal.account.partners.v1") || [], i;
      for (i = 0; i < ps.length; i++) {
        if (ps[i] && ps[i].id === partnerId) { return (ps[i].shape === "circle") ? " chat-avatar-circle" : " chat-avatar-square"; }
      }
    } catch (e) { /* 忽略 */ }
    return " chat-avatar-square";
  }
  function mtxPartnerAvatarInner(name, avatar) {
    if (avatar) { return '<img class="chat-avatar-img" src="' + esc(avatar) + '" alt="">'; }
    return '<span class="chat-avatar-ph">' + esc(String(name || "对方").slice(0, 1)) + "</span>";
  }
  function mtxNameEl(name, isSelf) {
    return '<div class="chat-msg-name' + (isSelf ? " is-self" : "") + '">' + esc(String(name || (isSelf ? "我" : "对方"))) + "</div>";
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
    var my = mtxLoadMy();
    var html = '<div class="chat-msg is-self"><span class="chat-msg-avatar' + mtxShapeClsForMy() + '">' + mtxMyAvatarInner() + '</span>' +
      '<div class="chat-msg-col">' + mtxNameEl((my && my.name) || "我", true) +
      '<div class="chat-bubble is-self' + bubExtra + '">' + esc(text) + '</div>' +
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
    /* 允许逆位时，正位/逆位均输出清晰标签（正位 is-upright / 逆位 is-rev），避免正位无标注 */
    var revEnabled = !!(active.deckSetting && active.deckSetting.reversedEnabled);
    var html = '<div class="chat-msg is-other"><span class="chat-msg-avatar' + mtxPartnerShapeCls(active.partnerId || "") + '">' + mtxPartnerAvatarInner(name, active.partnerAvatar || '') + '</span>' +
      '<div class="chat-msg-col">' + mtxNameEl(name, false) +
      '<div class="chat-bubble is-other mtx-cards-bubble' + bubExtra + '">' +
      '<div class="mtx-cards">';
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i] || {};
      html += '<div class="mtx-card">' +
        '<img class="mtx-card-img' + ((revEnabled && c.reversed) ? ' is-rev' : '') + '" data-src="' + esc(c.ref || '') + '" alt="' + esc(c.name || '') + '">' +
        '<div class="mtx-card-name">' + esc(c.name || '') + '</div>' +
        (revEnabled ? '<div class="mtx-card-dir' + (c.reversed ? ' is-rev' : ' is-upright') + '">' + (c.reversed ? '逆位' : '正位') + '</div>' : '') +
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

  /* ---------- 洗牌动画（对标拾心界完整三阶段：5 张牌背横向交错洗牌 → 聚拢抽牌 → 中央翻牌亮出） ---------- */
  /* 与拾心界 transmit.js 完全一致的时序常量（零差异） */
  var SHUFFLE_ANIM_MS = 4000;      /* 动画总时长：洗牌→聚拢→翻牌亮出停留，随后淡出出牌（完整三阶段） */
  var SHUFFLE_PHASE_MS = 1350;     /* 阶段推进间隔：1350ms 进入聚拢抽牌（phase-draw），再 1350ms 进入翻牌亮出（phase-reveal） */
  var SHUFFLE_TIMEOUT_MS = 6000;   /* 兜底：动画超时强制移除动画块 */
  var SHUFFLE_CARD_COUNT = 5;      /* 洗牌牌列卡数 */
  var SHUFFLE_TEXTS = ['正在洗牌…', '凝神抽牌中…', '牌面缓缓浮现…'];  /* 阶段文案（洗牌 → 聚拢 → 亮出） */
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
    var html = '<div class="chat-msg is-other"><span class="chat-msg-avatar' + mtxPartnerShapeCls(active ? (active.partnerId || "") : "") + '">' + mtxPartnerAvatarInner(name, active ? (active.partnerAvatar || '') : '') + '</span>' +
      '<div class="chat-msg-col">' + mtxNameEl(name, false) +
      '<div class="chat-bubble is-other mtx-cards-bubble mtx-anim-bubble' + bubExtra + '">' +
      '<div class="mtx-shuffle" id="mtxShuffleWrap">' +
        '<div class="mtx-shuffle-cards">' +
          '<span class="mtx-shuffle-card"></span><span class="mtx-shuffle-card"></span><span class="mtx-shuffle-card"></span>' +
          '<span class="mtx-shuffle-card"></span><span class="mtx-shuffle-card"></span>' +
        '</div>' +
        '<span class="mtx-shuffle-text" id="mtxShuffleText">' + esc(SHUFFLE_TEXTS[0]) + '</span>' +
      '</div>' +
      '<div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(now())) + '</span></div>' +
      '</div></div></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var node = wrap.firstChild;
    var bubble = node.querySelector('.chat-bubble');
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
    _shufflePhase = 0;          /* 0=洗牌抖动 1=聚拢抽牌 2=亮出牌面 3=完成（停留终态） */
    _shufflePhaseDone = false;
    bubble._mtxStartedAt = Date.now();
    _shuffleBubble = bubble;
    _shuffleStopped = false;
    _shuffleNextAt = Date.now() + SHUFFLE_PHASE_MS;
    _shuffleStepTimer = setTimeout(_shuffleTick, SHUFFLE_PHASE_MS);
    /* 对齐拾心界时序：动画总时长到点自动淡出（mainTimer）；超时兜底强制移除动画块（guardTimer） */
    _shuffleMainTimer = setTimeout(function () {
      if (_shuffleStopped) return;
      var sh = document.getElementById('mtxShuffleWrap');
      if (sh && !sh.classList.contains('mtx-shuffle-done')) sh.classList.add('mtx-shuffle-done');
    }, SHUFFLE_ANIM_MS);
    _shuffleGuardTimer = setTimeout(function () {
      if (_shuffleStopped) return;
      var sh = document.getElementById('mtxShuffleWrap');
      if (sh && sh.parentNode) sh.parentNode.removeChild(sh);
    }, SHUFFLE_TIMEOUT_MS);
    return bubble;
  }

  /* 洗牌阶段推进（对标拾心界 startShuffleAnim 的 phase 状态机，替代原 800ms 单步推文案）。
     页面隐藏（xj-ve:hidden）时挂起，回前台按剩余时间续播；动画到达终态后停留等待外部出牌。 */
  function _shuffleTick() {
    _shuffleStepTimer = null;
    if (_shuffleStopped) { return; }
    var b = _shuffleBubble;
    var tEl = document.getElementById('mtxShuffleText');
    if (!tEl || !b || !b.parentNode) { clearShuffleAnimation(false); return; }
    _shufflePhase++;
    var sh = document.getElementById('mtxShuffleWrap');
    if (_shufflePhase === 1) {
      if (sh) { sh.classList.add('phase-draw'); }
      tEl.textContent = SHUFFLE_TEXTS[1];
    } else if (_shufflePhase === 2) {
      if (sh) { sh.classList.add('phase-reveal'); }
      tEl.textContent = SHUFFLE_TEXTS[2];
      /* 完整三阶段完成：聚拢（phase-draw）+ 翻牌亮出（phase-reveal）已推进，停留等待出牌回调替换/淡出 */
      _shufflePhaseDone = true;
      return;
    }
    var dur = SHUFFLE_PHASE_MS;
    _shuffleNextAt = Date.now() + dur;
    _shuffleStepTimer = setTimeout(_shuffleTick, dur);
  }
  if (!document.__xjMtxShuffleVisBound) {
    document.__xjMtxShuffleVisBound = true;
    document.addEventListener("xj-ve:hidden", function () {
      if (_shuffleStepTimer) { clearTimeout(_shuffleStepTimer); _shuffleStepTimer = null; }
    });
    document.addEventListener("xj-ve:visible", function () {
      if (_shuffleStopped || _shufflePhaseDone || _shuffleStepTimer || !_shuffleBubble || !_shuffleBubble.parentNode) { return; }
      var remain = Math.max(0, _shuffleNextAt - Date.now());
      _shuffleStepTimer = setTimeout(_shuffleTick, remain || 800);
    });
  }

  /* 清除洗牌动画：默认移除占位气泡；传 false 时仅清定时器（出牌后调用，气泡已保留牌内容） */
  function clearShuffleAnimation(removeBubble) {
    _shuffleStopped = true;
    _shuffleBubble = null;
    if (_shuffleStepTimer) { clearTimeout(_shuffleStepTimer); _shuffleStepTimer = null; }
    if (_shuffleMainTimer) { clearTimeout(_shuffleMainTimer); _shuffleMainTimer = null; }
    if (_shuffleGuardTimer) { clearTimeout(_shuffleGuardTimer); _shuffleGuardTimer = null; }
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
        (revEnabled ? '<div class="mtx-card-dir' + (c.reversed ? ' is-rev' : ' is-upright') + '">' + (c.reversed ? '逆位' : '正位') + '</div>' : '') +
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
      /* 洗牌动画至少展示 3000ms（前半截：洗牌→聚拢停留），抽牌结果随后在对方消息气泡内渲染 */
      var elapsed = Date.now() - ((bar && bar._mtxStartedAt) || Date.now());
      var hold = Math.max(0, SHUFFLE_ANIM_MS - elapsed);
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
        /* 出牌：先加 done 淡出 340ms（对齐拾心界淡出后出牌），再清定时器渲染进占位气泡 */
        var sh = bar && bar.querySelector('.mtx-shuffle');
        var gone = !(sh && sh.parentNode);
        if (sh && !sh.classList.contains('mtx-shuffle-done')) sh.classList.add('mtx-shuffle-done');
        var wait = gone ? 0 : 340;
        return new Promise(function (resolve) { setTimeout(resolve, wait); });
      }).then(function () {
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
        var my = mtxLoadMy();
        wrap1.innerHTML = '<div class="chat-msg is-self"><span class="chat-msg-avatar' + mtxShapeClsForMy() + '">' + mtxMyAvatarInner() + '</span><div class="chat-msg-col">' + mtxNameEl((my && my.name) || "我", true) + '<div class="chat-bubble is-self' + bubExtra1 + '">' + esc(item.text || '') + '</div><div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtTime(item.time)) + '</span></div></div></div>';
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
        var html2 = '<div class="chat-msg is-other"><span class="chat-msg-avatar' + mtxPartnerShapeCls(s.partnerId || "") + '">' + mtxPartnerAvatarInner(s.partnerName || '对方', s.partnerAvatar || '') + '</span><div class="chat-msg-col">' + mtxNameEl(s.partnerName || '对方', false) + '<div class="chat-bubble is-other mtx-cards-bubble' + bubExtra2 + '"><div class="mtx-cards">';
        for (var k = 0; k < cards.length; k++) {
          var c = cards[k] || {};
          html2 += '<div class="mtx-card"><img class="mtx-card-img' + ((revEnabled && c.reversed) ? ' is-rev' : '') + '" data-src="' + esc(c.ref || '') + '" alt="' + esc(c.name || '') + '"><div class="mtx-card-name">' + esc(c.name || '') + '</div>' + (revEnabled ? '<div class="mtx-card-dir' + (c.reversed ? ' is-rev' : ' is-upright') + '">' + (c.reversed ? '逆位' : '正位') + '</div>' : '') + '</div>';
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

  /* ---------- 传讯页背景设置（对齐今日传讯换壁纸 v13：四模式 + IndexedDB/localStorage 双存储） ---------- */
  /* 面板模式：
   *   theme   跟随网站外观主题
   *   white   固定白色
   *   color   自定义颜色（纯色 / 渐变六方向：上下 / 左右 / 斜向 / 中心晕染 / 边角晕染 / 随机弥散 + 顶底栏档位）
   *   custom  自定义上传（任意尺寸 / 任意大小，IndexedDB + localStorage 双保险永久保存）
   * 持久化键 snowcrystal.mtx.wallpaper2；lastType: theme | white | color | custom */
  var MTX_BG_KEY = 'snowcrystal.mtx.wallpaper2';
  var MTX_BG_CUSTOM_KEY = 'snowcrystal.mtx.wallpaperCustom2';
  var MTX_IDB_NAME = 'snowcrystal-mtx';
  var MTX_IDB_STORE = 'bg';
  var MTX_IDB_KEY = 'mtxBgCustom';
  var MTX_DEFAULT_BG = 'var(--bg)';
  var MTX_WHITE_BG = '#ffffff';

  function mtxEl(id) { return document.getElementById(id); }
  function mtxLsGet(k) { try { return localStorage.getItem(k); } catch (e) { return ''; } }
  function mtxLsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function mtxLsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function mtxIdbOpen() {
    try {
      if (!window.indexedDB) { return Promise.reject('no idb'); }
      return new Promise(function (resolve, reject) {
        var req = indexedDB.open(MTX_IDB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(MTX_IDB_STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    } catch (e) { return Promise.reject(e); }
  }
  function mtxIdbGet() {
    return mtxIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MTX_IDB_STORE, 'readonly');
        var rq = tx.objectStore(MTX_IDB_STORE).get(MTX_IDB_KEY);
        rq.onsuccess = function () { resolve(rq.result || ''); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function mtxIdbSet(v) {
    return mtxIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MTX_IDB_STORE, 'readwrite');
        tx.objectStore(MTX_IDB_STORE).put(v, MTX_IDB_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function mtxIdbDel() {
    return mtxIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MTX_IDB_STORE, 'readwrite');
        tx.objectStore(MTX_IDB_STORE)['delete'](MTX_IDB_KEY);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  /* ---- 渐变方向映射（与今日传讯 gradCss 一致） ---- */
  function mtxGradCss(dir, c1, c2, c3, st) {
    var c3v = c3 || c2;
    switch (dir) {
      case 'lr':   return 'linear-gradient(to right, ' + c1 + ' 0%, ' + c2 + ' 50%, ' + c3v + ' 100%)';
      case 'tlbr': return 'linear-gradient(to bottom right, ' + c1 + ' 0%, ' + c2 + ' 50%, ' + c3v + ' 100%)';
      case 'rc':   return 'radial-gradient(circle at 50% 50%, ' + c1 + ' 0%, ' + c2 + ' 55%, ' + c3v + ' 100%)';
      case 'rcn':  return 'radial-gradient(circle at 12% 12%, ' + c1 + ' 0%, ' + c2 + ' 55%, ' + c3v + ' 100%)';
      case 'rr':
        if (st && st.rrCss) { return st.rrCss; }
        return mtxRandomBloomCss(c1, c2, c3v, st ? st.rrParams : null);
      case 'tb':
      default:     return 'linear-gradient(to bottom, ' + c1 + ' 0%, ' + c2 + ' 50%, ' + c3v + ' 100%)';
    }
  }
  function mtxRandomBloomCss(c1, c2, c3, params) {
    var colors = [c1, c2, c3];
    var spots = params && params.spots ? Number(params.spots) : 5;
    var size  = params && params.size  ? Number(params.size)  : 55;
    var soft  = params && params.soft  ? Number(params.soft)  : 65;
    var layers = [];
    var smalls = Math.max(2, Math.round(spots / 2));
    for (var j = 0; j < smalls; j++) {
      var c2v = colors[Math.floor(Math.random() * colors.length)];
      var x2 = 6 + Math.random() * 88, y2 = 6 + Math.random() * 88;
      var r2 = 14 + Math.random() * 26;
      layers.push('radial-gradient(circle at ' + x2.toFixed(1) + '% ' + y2.toFixed(1) + '%, ' + c2v + ' 0%, rgba(0,0,0,0) ' + r2.toFixed(1) + '%)');
    }
    for (var i = 0; i < spots; i++) {
      var col = colors[Math.floor(Math.random() * colors.length)];
      var x = 8 + Math.random() * 84, y = 8 + Math.random() * 84;
      var r = size * (0.75 + Math.random() * 0.55);
      var fade = soft * (0.7 + Math.random() * 0.6);
      layers.push('radial-gradient(circle at ' + x.toFixed(1) + '% ' + y.toFixed(1) + '%, ' + col + ' 0%, rgba(0,0,0,0) ' + fade.toFixed(1) + '%)');
    }
    var bx = 18 + Math.random() * 64, by = 14 + Math.random() * 72;
    layers.push('radial-gradient(circle at ' + bx.toFixed(1) + '% ' + by.toFixed(1) + '%, ' + c1 + ' 0%, ' + c2 + ' 42%, ' + c3 + ' 80%, rgba(0,0,0,0) 100%)');
    return layers.join(', ');
  }
  function mtxBgDefault() {
    return { lastType: 'white', colorType: 'solid', color: '#f6f8fc', color2: '#c7d2dc', color3: '#e8eef6', gradDir: 'tb', barMode: 'half', rrCss: '', rrParams: { spots: 5, size: 55, soft: 65 }, rrTemplates: [] };
  }
  function mtxBgLoad() {
    try {
      var raw = localStorage.getItem(MTX_BG_KEY);
      var st = raw ? JSON.parse(raw) : null;
      if (st && typeof st === 'object') {
        /* 旧版（两模式）数据兼容：mode → lastType */
        if (!st.lastType && st.mode) {
          st.lastType = (st.mode === 'custom') ? 'custom' : ((st.mode === 'white' || st.mode === 'color') ? st.mode : 'theme');
        }
        if (!st.lastType) { st.lastType = 'theme'; }
        if (!st.colorType) { st.colorType = 'solid'; }
        if (!st.gradDir) { st.gradDir = 'tb'; }
        if (!st.color) { st.color = '#f6f8fc'; }
        if (!st.color2) { st.color2 = '#c7d2dc'; }
        if (!st.color3) { st.color3 = '#e8eef6'; }
        if (!st.barMode) { st.barMode = 'half'; }
        if (!st.rrCss) { st.rrCss = ''; }
        if (!st.rrParams || typeof st.rrParams !== 'object') { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
        if (st.rrParams.spots === undefined || st.rrParams.spots === null) { st.rrParams.spots = 5; }
        if (st.rrParams.size === undefined || st.rrParams.size === null) { st.rrParams.size = 55; }
        if (st.rrParams.soft === undefined || st.rrParams.soft === null) { st.rrParams.soft = 65; }
        if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
        return st;
      }
    } catch (e) { /* ignore */ }
    return mtxBgDefault();
  }
  function mtxBgSave(st) { try { localStorage.setItem(MTX_BG_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }
  function mtxBuildLayers() {
    var st = mtxBgLoad();
    if (st.lastType === 'white') {
      var dm = document.documentElement && document.documentElement.getAttribute('data-theme-mode') === 'dark';
      return dm ? 'var(--bg)' : MTX_WHITE_BG;
    }
    if (st.lastType === 'custom') { return MTX_DEFAULT_BG; }
    if (st.lastType === 'color') {
      var c1 = st.color || '#f6f8fc', c2 = st.color2 || '#c7d2dc', c3 = st.color3 || '#e8eef6';
      if (st.colorType === 'gradient') { return mtxGradCss(st.gradDir || 'tb', c1, c2, c3, st); }
      return c1;
    }
    return MTX_DEFAULT_BG;
  }
  function mtxSetWpMode(mode) {
    var page = document.querySelector('.page[data-page="mtx-session"]');
    if (!page) { return; }
    if (mode) { page.setAttribute('data-wp-mode', mode); }
    else { page.removeAttribute('data-wp-mode'); }
  }
  function applyMtxBg() {
    var page = document.querySelector('.page[data-page="mtx-session"]');
    if (!page) { return; }
    var st = mtxBgLoad();
    page.removeAttribute('data-bg');
    if (st.lastType === 'custom') {
      var dataUrl = mtxLsGet(MTX_BG_CUSTOM_KEY);
      if (dataUrl) {
        page.style.setProperty('--mtx-bg', 'url("' + dataUrl + '") center / cover no-repeat');
      } else {
        page.style.setProperty('--mtx-bg', mtxBuildLayers());
      }
    } else {
      page.style.setProperty('--mtx-bg', mtxBuildLayers());
    }
    mtxSetWpMode(st.lastType || 'theme');
    if (st.lastType === 'color') { page.setAttribute('data-bar-mode', st.barMode || 'half'); }
    else { page.removeAttribute('data-bar-mode'); }
  }
  function mtxApplyCustom(dataUrl) {
    var page = document.querySelector('.page[data-page="mtx-session"]');
    if (!page) { return; }
    if (dataUrl) {
      page.style.setProperty('--mtx-bg', 'url("' + dataUrl + '") center / cover no-repeat');
      mtxSetWpMode('custom');
    }
  }
  /* ---- 模式 / 颜色 / 渐变方向 / 顶底栏 ---- */
  function setMtxBgMode(mode) {
    var st = mtxBgLoad();
    st.lastType = mode;
    mtxBgSave(st);
    if (mode === 'custom') { chooseMtxBgFile(); return; }
    applyMtxBg();
    renderMtxBg(st);
    mtxToast(mode === 'theme' ? '传讯背景已恢复跟随主题' : (mode === 'white' ? '传讯背景已切换为固定白色' : '传讯背景已更新'));
  }
  function setMtxColorType(type) {
    var st = mtxBgLoad();
    st.colorType = (type === 'gradient') ? 'gradient' : 'solid';
    mtxBgSave(st);
    if (st.lastType === 'color') { applyMtxBg(); }
    renderMtxBg(st);
  }
  function setMtxGradDir(dir) {
    var st = mtxBgLoad();
    st.gradDir = dir;
    mtxBgSave(st);
    if (st.lastType === 'color' && st.colorType === 'gradient') { applyMtxBg(); }
    renderMtxBg(st);
  }
  function setMtxBarMode(mode) {
    var st = mtxBgLoad();
    st.barMode = (mode === 'full' || mode === 'clear' || mode === 'transparent') ? mode : 'half';
    mtxBgSave(st);
    if (st.lastType === 'color') { applyMtxBg(); }
    renderMtxBg(st);
  }
  function onMtxColorInput(which, val) {
    var st = mtxBgLoad();
    if (which === 'color1') { st.color = val; }
    else if (which === 'color2') { st.color2 = val; }
    else { st.color3 = val; }
    mtxBgSave(st);
    if (st.lastType === 'color') { applyMtxBg(); }
    renderMtxBg(st);
  }
  /* ---- 渲染面板（同步选中态 / 颜色控件 / 清除按钮 / 随机弥散） ---- */
  function renderMtxBg(st) {
    st = st || mtxBgLoad();
    var mode = st.lastType || 'theme';
    var themeBtn = mtxEl('mtxBgThemeBtn'), whiteBtn = mtxEl('mtxBgWhiteBtn'), colorBtn = mtxEl('mtxBgColorBtn');
    if (themeBtn) { themeBtn.classList.toggle('is-active', mode === 'theme'); }
    if (whiteBtn) { whiteBtn.classList.toggle('is-active', mode === 'white'); }
    if (colorBtn) { colorBtn.classList.toggle('is-active', mode === 'color'); }
    var typeSolid = mtxEl('mtxBgTypeSolid'), typeGrad = mtxEl('mtxBgTypeGrad');
    if (typeSolid) { typeSolid.classList.toggle('is-active', st.colorType !== 'gradient'); }
    if (typeGrad) { typeGrad.classList.toggle('is-active', st.colorType === 'gradient'); }
    var c1 = mtxEl('mtxBgColor1'), c2 = mtxEl('mtxBgColor2'), c3 = mtxEl('mtxBgColor3');
    var c2Wrap = mtxEl('mtxBgColor2Wrap'), c3Wrap = mtxEl('mtxBgColor3Wrap'), dirWrap = mtxEl('mtxBgGradDirWrap');
    if (c1) { c1.value = st.color || '#f6f8fc'; }
    if (c2) { c2.value = st.color2 || '#c7d2dc'; }
    if (c3) { c3.value = st.color3 || '#e8eef6'; }
    var isGrad = st.colorType === 'gradient';
    if (c2Wrap) { c2Wrap.style.display = isGrad ? '' : 'none'; }
    if (c3Wrap) { c3Wrap.style.display = isGrad ? '' : 'none'; }
    if (dirWrap) { dirWrap.style.display = isGrad ? '' : 'none'; }
    var dirBtns = dirWrap ? dirWrap.querySelectorAll('.wp13-dir-btn') : [];
    for (var i = 0; i < dirBtns.length; i++) {
      dirBtns[i].classList.toggle('is-active', dirBtns[i].getAttribute('data-dir') === (st.gradDir || 'tb'));
    }
    var colorZone = mtxEl('mtxBgColorZone');
    if (colorZone) { colorZone.style.display = (mode === 'color') ? '' : 'none'; }
    var barZone = mtxEl('mtxBgBarZone');
    if (barZone) { barZone.style.display = (mode === 'color') ? '' : 'none'; }
    var barMode = st.barMode || 'half';
    var bHalf = mtxEl('mtxBgBarHalf'), bFull = mtxEl('mtxBgBarFull'), bClear = mtxEl('mtxBgBarClear'), bTransparent = mtxEl('mtxBgBarTransparent');
    if (bHalf) { bHalf.classList.toggle('is-active', barMode === 'half'); }
    if (bFull) { bFull.classList.toggle('is-active', barMode === 'full'); }
    if (bClear) { bClear.classList.toggle('is-active', barMode === 'clear'); }
    if (bTransparent) { bTransparent.classList.toggle('is-active', barMode === 'transparent'); }
    var rrZone = mtxEl('mtxBgRrZone');
    if (rrZone) { rrZone.style.display = (mode === 'color' && isGrad && (st.gradDir || 'tb') === 'rr') ? '' : 'none'; }
    var rrP = st.rrParams || { spots: 5, size: 55, soft: 65 };
    var spotsEl = mtxEl('mtxBgRrSpots'), sizeEl = mtxEl('mtxBgRrSize'), softEl = mtxEl('mtxBgRrSoft');
    var spotsVal = mtxEl('mtxBgRrSpotsVal'), sizeVal = mtxEl('mtxBgRrSizeVal'), softVal = mtxEl('mtxBgRrSoftVal');
    if (spotsEl) { spotsEl.value = String(rrP.spots); }
    if (spotsVal) { spotsVal.textContent = String(rrP.spots); }
    if (sizeEl) { sizeEl.value = String(rrP.size); }
    if (sizeVal) { sizeVal.textContent = String(rrP.size); }
    if (softEl) { softEl.value = String(rrP.soft); }
    if (softVal) { softVal.textContent = String(rrP.soft); }
    var clearBtn = mtxEl('mtxBgClearBtn');
    if (clearBtn) { clearBtn.hidden = !mtxLsGet(MTX_BG_CUSTOM_KEY); }
    renderMtxRrTpls(st);
  }
  /* ---- 随机弥散调节 / 模板（与今日传讯 setRrParam/saveRrTemplate 一致） ---- */
  function mtxRrColors(st) {
    return [st.color || '#f6f8fc', st.color2 || '#c7d2dc', st.color3 || '#e8eef6'];
  }
  function setMtxRrParam(kind, val) {
    var st = mtxBgLoad();
    if (!st.rrParams || typeof st.rrParams !== 'object') { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var n = Number(val);
    if (kind === 'spots') { st.rrParams.spots = Math.min(8, Math.max(3, Math.round(n))); }
    else if (kind === 'size') { st.rrParams.size = Math.min(95, Math.max(30, Math.round(n))); }
    else if (kind === 'soft') { st.rrParams.soft = Math.min(100, Math.max(35, Math.round(n))); }
    var cols = mtxRrColors(st);
    st.rrCss = mtxRandomBloomCss(cols[0], cols[1], cols[2], st.rrParams);
    mtxBgSave(st);
    if (st.lastType === 'color' && st.colorType === 'gradient' && st.gradDir === 'rr') { applyMtxBg(); }
    renderMtxBg(st);
  }
  function rerollMtxRr() {
    var st = mtxBgLoad();
    if (!st.rrParams || typeof st.rrParams !== 'object') { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var cols = mtxRrColors(st);
    st.rrCss = mtxRandomBloomCss(cols[0], cols[1], cols[2], st.rrParams);
    mtxBgSave(st);
    if (st.lastType === 'color' && st.colorType === 'gradient' && st.gradDir === 'rr') { applyMtxBg(); }
    renderMtxBg(st);
    mtxToast('已重新随机弥散效果');
  }
  function saveMtxRrTemplate() {
    var st = mtxBgLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    if (!st.rrParams || typeof st.rrParams !== 'object') { st.rrParams = { spots: 5, size: 55, soft: 65 }; }
    var nameEl = mtxEl('mtxBgRrName');
    var name = (nameEl && String(nameEl.value || '').trim()) ? String(nameEl.value).trim() : ('模板 ' + (st.rrTemplates.length + 1));
    var cols = mtxRrColors(st);
    var tpl = { id: 'rr_' + Date.now(), name: name, params: { spots: st.rrParams.spots, size: st.rrParams.size, soft: st.rrParams.soft }, css: st.rrCss || mtxRandomBloomCss(cols[0], cols[1], cols[2], st.rrParams) };
    st.rrTemplates.push(tpl);
    if (st.rrTemplates.length > 12) { st.rrTemplates.shift(); }
    mtxBgSave(st);
    if (nameEl) { nameEl.value = ''; }
    renderMtxBg(st);
    mtxToast('已保存模板：「' + name + '」');
  }
  function applyMtxRrTemplate(id) {
    var st = mtxBgLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    for (var i = 0; i < st.rrTemplates.length; i++) {
      if (st.rrTemplates[i].id === id) {
        var t = st.rrTemplates[i];
        st.rrParams = { spots: t.params.spots, size: t.params.size, soft: t.params.soft };
        st.rrCss = t.css;
        st.gradDir = 'rr';
        st.colorType = 'gradient';
        mtxBgSave(st);
        if (st.lastType === 'color') { applyMtxBg(); }
        renderMtxBg(st);
        mtxToast('已应用模板：「' + t.name + '」');
        return;
      }
    }
    mtxToast('模板不存在或已被删除');
  }
  function deleteMtxRrTemplate(id) {
    var st = mtxBgLoad();
    if (!Array.isArray(st.rrTemplates)) { st.rrTemplates = []; }
    for (var i = 0; i < st.rrTemplates.length; i++) {
      if (st.rrTemplates[i].id === id) {
        var name = st.rrTemplates[i].name;
        st.rrTemplates.splice(i, 1);
        mtxBgSave(st);
        renderMtxBg(st);
        mtxToast('已删除模板：「' + name + '」');
        return;
      }
    }
  }
  function renderMtxRrTpls(st) {
    var wrap = mtxEl('mtxBgRrTpls');
    if (!wrap) { return; }
    var tpls = (st && Array.isArray(st.rrTemplates)) ? st.rrTemplates : [];
    wrap.innerHTML = '';
    if (!tpls.length) {
      var empty = document.createElement('div');
      empty.className = 'wp13-rr-tpl-empty';
      empty.textContent = '暂无模板，可保存当前效果';
      wrap.appendChild(empty);
      return;
    }
    for (var i = 0; i < tpls.length; i++) {
      var t = tpls[i];
      var row = document.createElement('div');
      row.className = 'wp13-rr-tpl';
      var nm = document.createElement('span');
      nm.className = 'wp13-rr-tpl-name';
      nm.textContent = t.name || ('模板 ' + (i + 1));
      var ab = document.createElement('button');
      ab.type = 'button';
      ab.className = 'wp13-rr-tpl-btn';
      ab.textContent = '应用';
      ab.onclick = (function (id) { return function () { SnowCrystal.Mtx.applyMtxRrTemplate(id); }; })(t.id);
      var db = document.createElement('button');
      db.type = 'button';
      db.className = 'wp13-rr-tpl-btn is-danger';
      db.textContent = '删除';
      db.onclick = (function (id) { return function () { SnowCrystal.Mtx.deleteMtxRrTemplate(id); }; })(t.id);
      row.appendChild(nm);
      row.appendChild(ab);
      row.appendChild(db);
      wrap.appendChild(row);
    }
  }
  /* ---- 自定义上传：任意尺寸 / 任意大小，IndexedDB + localStorage 双保险永久保存 ---- */
  function chooseMtxBgFile() {
    var input = mtxEl('mtxBgFileInput');
    if (!input) { return; }
    input.value = '';
    input.click();
  }
  function onMtxBgFileChange(ev) {
    var file = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!file) { return; }
    if (!/^image\//.test(file.type || '')) {
      mtxToast('请选择图片文件');
      if (ev && ev.target) { ev.target.value = ''; }
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || '');
      if (!dataUrl) { mtxToast('图片读取失败'); return; }
      if (!mtxLsSet(MTX_BG_CUSTOM_KEY, dataUrl)) { mtxToast('图片过大，本地存储保存失败'); return; }
      mtxIdbSet(dataUrl).then(function () { /* 双保险已写入 IndexedDB */ }).catch(function () { /* 忽略 */ });
      var st = mtxBgLoad();
      st.lastType = 'custom';
      mtxBgSave(st);
      mtxApplyCustom(dataUrl);
      renderMtxBg(st);
      mtxToast('自定义壁纸已应用并永久保存');
      if (ev && ev.target) { ev.target.value = ''; }
    };
    reader.onerror = function () { mtxToast('图片读取失败'); };
    reader.readAsDataURL(file);
  }
  function clearMtxBgCustom() {
    mtxLsDel(MTX_BG_CUSTOM_KEY);
    mtxIdbDel();
    var st = mtxBgDefault();
    mtxBgSave(st);
    applyMtxBg();
    renderMtxBg(st);
    mtxToast('已移除自定义壁纸，恢复默认');
  }
  /* ---- 持久化恢复：四模式 + 双存储回退 ---- */
  function mtxApplyStored() {
    var st = mtxBgLoad();
    if (st.lastType === 'custom') {
      var custom = mtxLsGet(MTX_BG_CUSTOM_KEY);
      if (custom) { mtxApplyCustom(custom); renderMtxBg(st); return; }
      mtxIdbGet().then(function (idbVal) {
        if (idbVal) {
          mtxLsSet(MTX_BG_CUSTOM_KEY, idbVal);
          mtxApplyCustom(idbVal);
          renderMtxBg(st);
        } else {
          var s2 = mtxBgDefault();
          mtxBgSave(s2);
          applyMtxBg();
          renderMtxBg(s2);
        }
      }).catch(function () { var s2 = mtxBgDefault(); mtxBgSave(s2); applyMtxBg(); renderMtxBg(s2); });
      return;
    }
    applyMtxBg();
    renderMtxBg(st);
  }
  /* ---- 弹窗开合 ---- */
  function openMtxBgModal() {
    var modal = mtxEl('mtxBgModal');
    if (!modal) { return; }
    modal.style.display = 'flex';
    renderMtxBg(mtxBgLoad());
  }
  function closeMtxBgModal() {
    var modal = mtxEl('mtxBgModal');
    if (modal) { modal.style.display = 'none'; }
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
    setMtxColorType: setMtxColorType,
    setMtxGradDir: setMtxGradDir,
    setMtxBarMode: setMtxBarMode,
    onMtxColorInput: onMtxColorInput,
    setMtxRrParam: setMtxRrParam,
    rerollMtxRr: rerollMtxRr,
    saveMtxRrTemplate: saveMtxRrTemplate,
    applyMtxRrTemplate: applyMtxRrTemplate,
    deleteMtxRrTemplate: deleteMtxRrTemplate,
    chooseMtxBgFile: chooseMtxBgFile,
    onMtxBgFileChange: onMtxBgFileChange,
    clearMtxBgCustom: clearMtxBgCustom
  };

  if (!window.SnowCrystal) { window.SnowCrystal = {}; }
  window.SnowCrystal.Mtx = Mtx;
})();
