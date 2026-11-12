/* 雪山晶 · 50-letter-v17 ｜ 源：雪山晶.html L32944-L34237 ｜ JS 模块 */
/* ============================================================
   V17 云笺书架 / 信件系统（自包含）
   - 小三角 → 独立书架分组页；新增「我方名称」分组接收对方来信
   - 角色分组下撰写的内容可寄出为聊天里的信封消息，点开看完整信件
   - 对方读信后可用字卡「格言库」内容评论回复
   - 对方按回信设置主动写信（字卡 / 颜文字 / emoji + 署名 + 书信格式）
   ============================================================ */
(function () {
  'use strict';
  if (window.XJShelf) { return; }
  var S = window.SnowCrystal = window.SnowCrystal || {};
  var $ = function (id) { return document.getElementById(id); };
  var LKEY = 'snowcrystal.letters.v1';
  var CKEY = 'snowcrystal.chat.settings.v1';
  var CHATKEY = 'snowcrystal.chat.v1';
  var BKEY = 'snowcrystal.shelf.books.v1';
  /* [V21] 任意分组（含动态角色/我方/梦境/全部）都可长按改封面色，单独持久化 key→cc */
  var COVER_KEY = 'snowcrystal.shelf.covers.v21';
  var WCLKEY = 'snowcrystal.wordcard.v2';
  var PKEY = 'snowcrystal.account.partners.v1';
  var MKEY = 'snowcrystal.account.my.v1';
  var DEF = { letterProactiveSec: 7200, letterReplySec: 30, letterLines: 2, letterDurSec: 20,
              letterTypeRate: 100, letterStrikePct: 40, letterStrikeSrc: 1 };  /* [V28] 打字机速度% / 划掉概率% / 划掉句来源 */
  var FALLBACK_CARDS = ['今天的风很轻，忽然就想起你了。', '窗外的云慢慢走，我也慢慢在等你。', '把这一小段安静留给你。', '有些话写下来，才算是真的说过。', '愿你今日顺遂，也愿我记得告诉你。'];
  /* [V21] 默认封面色板改为镜界低饱和清淡色（可长按任意分组自定义） */
  var SHELF_COLORS = ['#BFDCEA', '#F3D9DE', '#D9CCEB', '#C9DFD4', '#F5E2C8',
                      '#C6D7F0', '#E6D3EA', '#CDE6E2', '#F0D9E2', '#DDE8C9'];

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function now() { return Date.now(); }
  function fmtDate(t) { var d = new Date(t || now()); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function read(key, def) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? def : v; } catch (e) { return def; } }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function loadDB() { var d = read(LKEY, {}); if (!d || !Array.isArray(d.letters)) { d = { letters: [] }; } return d; }
  function saveDB(d) { write(LKEY, d); }
  function findLetter(id) { var d = loadDB(), i; for (i = 0; i < d.letters.length; i++) { if (d.letters[i].id === id) { return d.letters[i]; } } return null; }
  function loadSet() { var s = read(CKEY, {}), o = {}, k;
    for (k in DEF) {
      /* [V28] letterStrikePct 允许 0（关闭划掉），其余仍要求 >0 */
      var okZero = (k === 'letterStrikePct' || k === 'letterStrikeSrc');
      o[k] = (s && typeof s[k] === 'number' && (s[k] > 0 || (okZero && s[k] >= 0))) ? s[k] : DEF[k];
    }
    /* [V30] 时间字段的单位偏好原样带出（s/m/h），供面板显示与调度换算共用 */
    o.letterProactiveSecUnit = (s && (s.letterProactiveSecUnit === 's' || s.letterProactiveSecUnit === 'm' || s.letterProactiveSecUnit === 'h')) ? s.letterProactiveSecUnit : 'h';
    o.letterReplySecUnit = (s && (s.letterReplySecUnit === 'm' || s.letterReplySecUnit === 'h')) ? s.letterReplySecUnit : 's';
    o.letterDurSecUnit = (s && (s.letterDurSecUnit === 'm' || s.letterDurSecUnit === 'h')) ? s.letterDurSecUnit : 's';
    return o; }
  function setNum(k, v) {
    var s = read(CKEY, {});
    var n = Number(v);
    if (!isFinite(n)) { n = DEF[k]; }
    if (LF_TIME_KEYS[k]) {
      /* [V30] 时间类字段：界面值按当前单位换算为秒存储（存储永远是秒，调度按毫秒换算） */
      var u = lfUnitOf(k), minSec = (k === 'letterProactiveSec') ? 10 : 1;
      var sec = Math.round(n * lfFactor(u));
      if (!isFinite(sec)) { sec = DEF[k]; }
      n = Math.max(minSec, sec);
      s[k] = n;
      s[k + 'Unit'] = u;
      write(CKEY, s);
      var el = $('lf_' + k);
      if (el) {
        el.setAttribute('data-sec', n);
        el.setAttribute('data-minsec', minSec);
        el.value = lfDisp(n, u);
        el.min = lfDisp(minSec, u);
      }
      scheduleRoleLetters();
      return;
    }
    n = Math.round(n);
    if (!isFinite(n)) { n = DEF[k]; }
    if (k === 'letterLines') { n = Math.max(2, n); }
    else if (k === 'letterStrikePct') { n = Math.max(0, Math.min(100, n)); }
    else if (k === 'letterStrikeSrc') { n = Math.max(1, Math.min(3, n)); }
    else { n = Math.max(1, n); }
    s[k] = n;
    write(CKEY, s);
    var el2 = $('lf_' + k);
    if (el2 && !LF_TIME_KEYS[k]) { el2.value = n; }
    scheduleRoleLetters();
  }
  function partners() { var a = read(PKEY, []); return Array.isArray(a) ? a.filter(function (x) { return x && x.name; }) : []; }
  function myName() { var m = read(MKEY, {}); return (m && m.name) ? String(m.name) : '我'; }
  /* [V18] 自建分组支持自定义封面色：内部统一为 {name, cc}，兼容旧版纯字符串数组 */
  function books() {
    var a = read(BKEY, []);
    if (!Array.isArray(a)) { return []; }
    var out = [], i, x;
    for (i = 0; i < a.length; i++) {
      x = a[i];
      if (x && typeof x === 'object') {
        if (x.name) { out.push({ name: String(x.name), cc: x.cc || SHELF_COLORS[i % SHELF_COLORS.length] }); }
      } else if (x) { out.push({ name: String(x), cc: SHELF_COLORS[(i + 3) % SHELF_COLORS.length] }); }
    }
    return out;
  }
  function saveBooks(list) { return write(BKEY, list.map(function (x) { return { name: x.name, cc: x.cc }; })); }
  function coverMap() { var m = read(COVER_KEY, {}); return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {}; }
  function saveCover(key, cc) { var m = coverMap(); m[key] = cc; return write(COVER_KEY, m); }
  function wclItems(lib) {
    var w = null;
    try { if (S.loadWcl) { w = S.loadWcl(); } } catch (e) { /* 忽略 */ }
    if (!w) { w = read(WCLKEY, null); }
    var g = w && w[lib], out = [], i, j, it;
    if (Array.isArray(g)) {
      for (i = 0; i < g.length; i++) {
        it = (g[i] && g[i].items) || [];
        for (j = 0; j < it.length; j++) {
          var t = (typeof it[j] === 'string') ? it[j] : (it[j] && it[j].text);
          if (t) { out.push(String(t)); }
        }
      }
    }
    return out;
  }
  function pick(a) { return (a && a.length) ? a[Math.floor(Math.random() * a.length)] : ''; }
  function toast(t) {
    var e = document.querySelector('.xjs-toast');
    if (!e) { e = document.createElement('div'); e.className = 'xjs-toast'; document.body.appendChild(e); }
    e.textContent = t; e.style.opacity = '1';
    clearTimeout(e.__t); e.__t = setTimeout(function () { e.style.opacity = '0'; }, 1700);
  }

  var API = window.XJShelf = {
    curPid: '',
    /* [V40] 云笺首页左滑删除来信（含对方回信） */
    deleteLetter: function (id) {
      var db = loadDB(), out = [], i, hit = false;
      for (i = 0; i < db.letters.length; i++) {
        if (db.letters[i].id === id) { hit = true; continue; }
        out.push(db.letters[i]);
      }
      if (!hit) { return; }
      db.letters = out;
      saveDB(db);
      try { document.dispatchEvent(new Event('xj:letters-changed')); } catch (e0) {}
      toast('已删除');
    }
  };
  /* 关闭云笺：同步隐藏，避免 history.back 的异步窗口期遮挡聊天页 */
  function dismissLetter() {
    try { if (S.xjl && S.xjl.dismiss) { S.xjl.dismiss(); } } catch (e) { /* 忽略 */ }
    var app = $('xjLetterApp');
    if (app) {
      app.classList.remove('is-open');
      app.classList.remove('editing');
      app.setAttribute('aria-hidden', 'true');
    }
    try { if (history.state && history.state.xjlLetter) { history.replaceState({}, ''); } } catch (e) { /* 忽略 */ }
  }
  var _origOpen = S.openChatRoom;
  if (typeof _origOpen === 'function') {
    S.openChatRoom = function (pid) {
      API.curPid = pid;
      var app = $('xjLetterApp');
      if (app && app.classList.contains('is-open')) { dismissLetter(); }
      return _origOpen.apply(this, arguments);
    };
  }

  /* ---------------- 视图切换 ---------------- */
  function pane(kind) {
    var el = $('xjsPane_' + kind);
    return el;
  }
  function ensurePanes() {
    var app = $('xjLetterApp');
    if (!app || pane('shelf')) { return; }
    var a = document.createElement('section');
    a.className = 'xjl-view xjs-pane'; a.id = 'xjsPane_shelf'; a.setAttribute('data-view', 'shelf');
    a.innerHTML = '<div class="xjs-head"><button type="button" class="xjs-back" data-xjs="back" aria-label="返回">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 4 7 12l10 8z"/></svg></button>' +
      '<div class="xjs-title">全部云笺 <i></i></div>' +
      '<button type="button" class="xjs-add" data-xjs="addbook">＋ 添加分组</button></div>' +
      '<div class="xjs-grid" id="xjsShelfGrid"></div>';
    app.appendChild(a);
    var b = document.createElement('section');
    b.className = 'xjl-view xjs-pane'; b.id = 'xjsPane_letters'; b.setAttribute('data-view', 'letters');
    b.innerHTML = '<div class="xjs-head"><button type="button" class="xjs-back" data-xjs="back" aria-label="返回">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 4 7 12l10 8z"/></svg></button>' +
      '<div class="xjs-title" id="xjsLettersTitle">信件</div><span></span></div>' +
      '<div class="xjs-list" id="xjsLetterRows"></div>';
    app.appendChild(b);
  }
  function showOnly(kind) {
    var app = $('xjLetterApp'); if (!app) { return; }
    var vs = app.querySelectorAll('.xjl-view'), i;
    for (i = 0; i < vs.length; i++) { vs[i].classList.toggle('is-on', vs[i].getAttribute('data-view') === kind); }
    var dock = $('xjlDock'); if (dock) { dock.style.display = (kind === 'list' || kind === 'stats') ? '' : 'none'; }
  }
  function closeShelf() {
    showOnly('list');
    try { if (S.xjl && S.xjl.renderList) { S.xjl.renderList(); } } catch (e) { /* 忽略 */ }
  }
  API.openShelf = function () {
    ensurePanes();
    var app = $('xjLetterApp');
    if (!app || !app.classList.contains('is-open')) { if (S.openLetter) { S.openLetter(); } }
    ensurePanes();
    renderShelf();
    showOnly('shelf');
  };

  /* ---------------- 书架分组 ---------------- */
  /* [V18] 默认只保留四类：全部云笺 / 我方角色 / 对方角色 / 梦境记录，
     再加用户自建分组。对方角色分组随账号里新增角色自动出现（每次打开都重读 partners）。 */
  function shelfData() {
    var cov = coverMap();
    var out = [
      { key: 'all', name: '全部云笺', all: true, cc: '#D8E9F2' },
      { key: 'inbox', name: myName(), cc: '#BFDCEA', inbox: true }
    ];
    var ps = partners(), i;
    for (i = 0; i < ps.length; i++) {
      out.push({ key: 'role:' + ps[i].id, name: '给' + ps[i].name, cc: SHELF_COLORS[i % SHELF_COLORS.length], pid: ps[i].id, pname: ps[i].name });
    }
    out.push({ key: 'dream', name: '梦境记录', cc: '#C9DFD4' });
    var bs = books();
    for (i = 0; i < bs.length; i++) { out.push({ key: 'book:' + esc(bs[i].name), name: bs[i].name, cc: bs[i].cc, book: bs[i].name }); }
    /* [V21] 长按改过的封面色优先于默认分配 */
    for (i = 0; i < out.length; i++) {
      if (cov[out[i].key]) { out[i].cc = cov[out[i].key]; }
      if (!out[i].cc) { out[i].cc = SHELF_COLORS[i % SHELF_COLORS.length]; }
    }
    return out;
  }
  function renderShelf() {
    var grid = $('xjsShelfGrid'); if (!grid) { return; }
    var d = shelfData(), h = '', i, x;
    for (i = 0; i < d.length; i++) {
      x = d[i];
      /* [V42] 统一形态：纯色封面（不写字）+ 下方实心名称键，分组名只出现一次 */
      h += '<button type="button" class="xjs-card" data-key="' + esc(x.key) + '" style="--cc:' + esc(x.cc) + '"><span class="xjs-cover" style="--cc:' + esc(x.cc) + '"></span><span class="xjs-label">' + esc(x.name) + '</span></button>';
    }
    grid.innerHTML = h;
  }
  function openGroup(key) {
    var st = S.xjl && S.xjl.state, i, d = shelfData(), hit = null;
    for (i = 0; i < d.length; i++) { if (d[i].key === key) { hit = d[i]; break; } }
    if (!hit) { return; }
    if (key === 'all') {
      if (st) { st.group = 'all'; st.box = 'all'; }
      closeShelf();
    } else if (key === 'dream') {
      if (st) { st.group = '梦境记录'; st.box = 'all'; }
      closeShelf();
    } else if (key.indexOf('role:') === 0) {
      if (st) { st.group = hit.name; st.box = 'letter'; }
      closeShelf();
    } else if (key === 'inbox' || key.indexOf('book:') === 0) {
      renderLetters(key, hit);
      showOnly('letters');
    }
  }

  /* ==================================================================
     [V41] 信件列表行左滑删除（收信箱 / 寄出备份 / 分类篓）
     左滑只露出「删除」，删除走 API.deleteLetter（打开键已移除）
     ================================================================== */
  API.__lsw = {
    acts: '<div class="xjs-lsw">' +
        '<button type="button" class="xjs-lsw-btn is-del" data-lsw="del" aria-label="删除"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button>' +
      '</div>',
    key: '', hit: null,
    card: null, from: null, x: 0, y: 0, on: false, moved: false, suppress: false,
    rowOf: function (t) { return t && t.closest ? t.closest('#xjsLetterRows .xjs-lrow[data-letter]') : null; },
    close: function () { var L = API.__lsw; if (L.card) { L.card.classList.remove('is-sw'); } L.card = null; },
    confirm: function (onYes) {
      var m = document.createElement('div');
      m.className = 'xjs-mask';
      m.innerHTML = '<div class="xjs-dialog"><div class="xjs-dlg-t">删除这封信？</div>' +
        '<div class="xjs-dlg-x">删除后不可恢复。</div>' +
        '<div class="xjs-dlg-b"><button type="button" data-dlg="no">取消</button>' +
        '<button type="button" class="is-primary" data-dlg="yes">删除</button></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function (e) {
        if (e.stopPropagation) { e.stopPropagation(); }
        var b = e.target.closest ? e.target.closest('[data-dlg]') : null;
        if (!b) { if (e.target === m) { m.remove(); } return; }
        var yes = b.getAttribute('data-dlg') === 'yes';
        m.remove();
        if (yes && onYes) { onYes(); }
      });
    }
  };
  var LSW = API.__lsw;
  /* 手势：捕获阶段记录，只在信件列表行内生效；click 交给全局委托统一拦截 */
  document.addEventListener('pointerdown', function (e) {
    var r = LSW.rowOf(e.target);
    LSW.on = !!r; LSW.from = r; LSW.moved = false;
    LSW.x = e.clientX || 0; LSW.y = e.clientY || 0;
    if (LSW.card && LSW.card !== r) { LSW.close(); }
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!LSW.on) { return; }
    var dx = (e.clientX || 0) - LSW.x, dy = (e.clientY || 0) - LSW.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { LSW.moved = true; }
  }, true);
  document.addEventListener('pointerup', function (e) {
    if (!LSW.on) { return; }
    LSW.on = false;
    if (!LSW.moved) { return; }
    var dx = (e.clientX || 0) - LSW.x;
    LSW.suppress = true;
    setTimeout(function () { LSW.suppress = false; }, 300);
    var r = LSW.from;
    if (dx < -36) {
      if (LSW.card && LSW.card !== r) { LSW.close(); }
      LSW.card = r;
      if (r) { r.classList.add('is-sw'); }
    } else if (dx > 36) { LSW.close(); }
  }, true);
  document.addEventListener('pointercancel', function () { LSW.on = false; }, true);
  /* 删除后来信数变化：刷新当前信件列表（云笺首页由它自己的监听刷新） */
  document.addEventListener('xj:letters-changed', function () {
    try {
      var L = API.__lsw;
      if (!L.key) { return; }
      var p = pane('letters');
      if (p && p.classList.contains('is-on')) { renderLetters(L.key, L.hit); }
    } catch (e0) {}
  });

  function renderLetters(key, hit) {
    API.__lsw.key = key; API.__lsw.hit = hit || null; API.__lsw.close();
    var box = $('xjsLetterRows'), t = $('xjsLettersTitle'); if (!box) { return; }
    if (t) { t.textContent = hit ? hit.name : '信件'; }
    var d = loadDB(), list = [], i, L;
    for (i = 0; i < d.letters.length; i++) {
      L = d.letters[i];
      if (key === 'inbox' && L.dir === 'in') { list.push(L); }
      else if (key === 'backup' && L.dir === 'out' && L.sentChat) { list.push(L); }
      else if (key.indexOf('book:') === 0 && L.book === hit.name) { list.push(L); }
    }
    /* [V36] 来信按毫秒时间戳排序（原先 (b.created||0)-(a.created||0) 对字符串恒为 NaN，顺序是乱的） */
    list.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    if (!list.length) {
      box.innerHTML = '<div class="xjs-empty">' + (key === 'inbox' ? '还没有收到来信' : '这一格还空着') + '</div>';
      return;
    }
    var h = '', unread = 0;
    for (i = 0; i < list.length; i++) {
      L = list[i];
      var txt = String(L.text || '').replace(/\s+/g, ' ').trim();
      var ex = txt.length > 62 ? txt.slice(0, 62) + '…' : txt;
      var wc = String(L.text || '').replace(/\s/g, '').length;
      var isIn = L.dir === 'in';
      var un = isIn && !L.readAt;
      if (un) { unread++; }
      /* [V36] 来信行：署名 + 标题 + 正文摘要 + 日期字数，未读带一个小圆点 */
      h += '<div class="xjs-lrow' + (isIn ? ' is-in' : '') + (un ? ' is-unread' : '') + '" data-letter="' + esc(L.id) + '">' +
        LSW.acts +
        '<div class="xjs-lrow-in">' +
        '<span class="xjs-lico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>' + (un ? '<i class="xjs-lun"></i>' : '') + '</span>' +
        '<span class="xjs-lmain">' +
          '<span class="xjs-lt">' + esc(L.title || '无题') + '</span>' +
          (key === 'inbox' && ex ? '<span class="xjs-lx">' + esc(ex) + '</span>' : '') +
          '<span class="xjs-ld"><b>' + esc(isIn ? ('来自 ' + (L.sign || '对方')) : ('致 ' + (L.to || ''))) + '</b>' +
          '<i>·</i>' + esc(fmtDate(L.created)) +
          (wc ? '<i>·</i>' + wc + ' 字' : '') + '</span>' +
        '</span>' +
        '</div></div>';
    }
    box.innerHTML = (key === 'inbox' ? '<div class="xjs-lcount">共 ' + list.length + ' 封' + (unread ? ' · 未读 ' + unread : '') + '</div>' : '') + h;
  }

  /* ---------------- 信件消息 / 数据 ---------------- */
  function letterMsg(L, dir) {
    return {
      id: 'm' + uid(), type: dir === 'in' ? 'other' : 'self', msgType: 'letter',
      text: '[信件] ' + (L.title || '无题'), time: now(), read: true,
      letterId: L.id, letterTitle: L.title || '无题',
      letterFrom: dir === 'in' ? (L.sign || '对方') : ('致 ' + (L.to || '')),
      letterDir: dir, letterTint: L.tint || ''
    };
  }
  function pushChatMsg(pid, msg) {
    if (!pid) { return; }
    try {
      /* [V18] 聊天模块以 chatMem 内存缓存为准并延迟落库；若只写 localStorage，
         对方来信在聊天室会读到旧缓存，且后续 saveChat 会用旧缓存覆盖掉信封消息。 */
      var c = null, viaChat = false;
      try {
        if (S.Chat && typeof S.Chat.loadChat === 'function') {
          c = S.Chat.loadChat(); viaChat = !!(c && typeof c === 'object');
        }
      } catch (e0) { viaChat = false; }
      if (!viaChat) { c = read(CHATKEY, {}); }
      c.chats = c.chats || []; c.messages = c.messages || {};
      if (!Array.isArray(c.chats)) { c.chats = []; }
      if (!Array.isArray(c.messages[pid])) { c.messages[pid] = []; }
      c.messages[pid].push(msg);
      var i, f = null;
      for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === pid) { f = c.chats[i]; break; } }
      if (f) { f.lastText = msg.text; f.lastTime = msg.time; }
      else { c.chats.push({ id: pid, name: (findPartnerName(pid) || '对方'), avatar: '', shape: 'square', lastText: msg.text, lastTime: msg.time, pinned: false }); }
      /* [V31] 只走一个写入通道：聊天模块可用时交给 saveChat（它能抬版本戳、双写并处理
         水合期挂起）；不可用时才自己写，且同样抬版本戳，避免无版本的旧快照覆盖新数据 */
      if (viaChat && S.Chat && typeof S.Chat.saveChat === 'function') { S.Chat.saveChat(c); }
      else {
        try {
          c.ver = (Date.now() > (c.ver || 0)) ? Date.now() : ((c.ver || 0) + 1);
        } catch (e1) { /* 忽略 */ }
        write(CHATKEY, c);
      }
    } catch (e) { /* 忽略 */ }
    try { if (S.Chat && S.Chat.renderChatList) { S.Chat.renderChatList(); } } catch (e) { /* 忽略 */ }
    try {
      var act = document.querySelector('.page.is-active[data-page="chat-room"]');
      if (act && API.curPid === pid && S.Chat && S.Chat.renderMessages) { S.Chat.renderMessages(pid, false); }
    } catch (e) { /* 忽略 */ }
  }
  function findPartnerName(pid) { var ps = partners(), i; for (i = 0; i < ps.length; i++) { if (ps[i].id === pid) { return ps[i].name; } } return ''; }

  /* ---------------- 编辑器「寄出」 ---------------- */
  function ensureSendBtn() {
    var acts = document.querySelector('#xjLetterApp .xjl-ed-acts');
    if (!acts || acts.querySelector('.xjs-send')) { return; }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'xjs-send'; b.textContent = '寄出'; b.setAttribute('data-xjs', 'send');
    acts.appendChild(b);   /* 寄出固定在最右侧，左右撤回键在它左侧 */
  }
  function currentDraft() {
    var t = ($('xjlFTitle') && $('xjlFTitle').textContent || '').trim();
    var body = $('xjlFBody');
    var html = body ? body.innerHTML : '';
    var text = body ? (body.innerText || body.textContent || '') : '';
    var to = ($('xjlRecipient') && $('xjlRecipient').textContent || '').replace(/^致\s*·\s*/, '').trim();
    var bg = '', tint = '';
    try {
      var app = $('xjLetterApp');
      if (app) {
        bg = app.style.getPropertyValue('--xjl-paper-bg');
        tint = app.style.getPropertyValue('--xjl-paper-tint').trim();
      }
    } catch (e) { /* 忽略 */ }
    /* [V44] 写信已无标题栏：信件标题取正文首句，供聊天信封与书架显示 */
    var xjlEx = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 18);
    return { title: t || xjlEx || '无题', html: html, text: text, to: to, paper: bg, tint: tint };
  }
  function askSend() {
    var d = currentDraft();
    var ps = partners(), hit = null, i;
    /* [V44] 修「写完点寄出没反应」：原判断拿「给 + 角色名」去比抬头文字（抬头只有角色名本身），
       回信场景永远匹配不上，被静默拦下。现按角色名双向兼容匹配。 */
    var xjlTo = String(d.to || '').replace(/^给\s*/, '').trim();
    for (i = 0; i < ps.length; i++) {
      var xjlPn = String((ps[i] && ps[i].name) || '').replace(/^给\s*/, '').trim();
      if (xjlPn && xjlPn === xjlTo) { hit = ps[i]; break; }
    }
    if (!hit) { toast('还没选收信人 · 点上方「致」选角色'); return; }
    if (!d.text.trim()) { toast('还没有写内容'); return; }
    API._pending = { draft: d, partner: hit };
    showDialog('寄出这封信？', '将以信封发送至「' + d.to + '」的聊天', function () { doSend(); });
  }
  function doSend() {
    var p = API._pending; if (!p) { return; }
    var d = p.draft, pp = p.partner, db = loadDB();
    var L = {
      id: uid(), dir: 'out', group: '给' + pp.name, to: '给' + pp.name,
      roleId: pp.id, roleName: pp.name, chatPid: pp.id,
      title: d.title, html: d.html, text: d.text, paper: d.paper, tint: d.tint || '',
      sign: myName(), book: '', created: now(), sentChat: true, read: false
    };
    db.letters.push(L); saveDB(db);
    pushChatMsg(pp.id, letterMsg(L, 'out'));
    API._pending = null;
    dismissLetter();
    try { if (S.openChatRoom) { S.openChatRoom(pp.id); } } catch (e) { /* 忽略 */ }
    toast('已寄出');
    /* 对方读信后按「回信时长」以格言库内容回评 */
    var sec = Math.max(1, loadSet().letterReplySec);
    setTimeout(function () { try { deliverReply(L.id); } catch (e0) {} }, sec * 1000);
  }
  function showDialog(title, text, onYes) {
    var m = document.createElement('div');
    m.className = 'xjs-mask'; m.setAttribute('data-xjs', 'dlg');
    m.innerHTML = '<div class="xjs-dialog"><div class="xjs-dlg-t">' + esc(title) + '</div>' +
      '<div class="xjs-dlg-x">' + esc(text) + '</div>' +
      '<div class="xjs-dlg-b"><button type="button" data-dlg="no">先不寄</button>' +
      '<button type="button" class="is-primary" data-dlg="yes">寄出</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dlg]');
      if (!b) { if (e.target === m) { m.remove(); } return; }
      var yes = b.getAttribute('data-dlg') === 'yes';
      m.remove();
      if (yes && onYes) { onYes(); }
    });
  }

  /* [V18] 新建分组弹窗：分组名称 + 分组封面颜色（预设色板，也可自定义取色） */
  function openAddBook() {
    var old = document.querySelector('.xjs-ab-mask'); if (old) { old.remove(); }
    var m = document.createElement('div');
    m.className = 'xjs-mask xjs-ab-mask'; m.setAttribute('data-cc', SHELF_COLORS[0]);
    var sw = '', i;
    for (i = 0; i < SHELF_COLORS.length; i++) {
      sw += '<button type="button" class="xjs-ab-sw' + (i === 0 ? ' is-on' : '') + '" data-xjs="ab-pick" data-ab-pick="' + SHELF_COLORS[i] + '" style="background:' + SHELF_COLORS[i] + '" aria-label="颜色"></button>';
    }
    m.innerHTML = '<div class="xjs-dialog xjs-ab-dialog">' +
      '<div class="xjs-dlg-t">新建分组</div>' +
      '<div class="xjs-ab-preview" style="background:' + SHELF_COLORS[0] + '"><span class="xjs-ab-prev-vt">新分组</span></div>' +
      '<div class="xjs-ab-field"><label>分组名称</label>' +
      '<input class="xjs-ab-name" type="text" maxlength="12" placeholder="给它取个名字"></div>' +
      '<div class="xjs-ab-field"><label>分组封面颜色</label>' +
      '<div class="xjs-ab-colors">' + sw + '</div>' +
      '<div class="xjs-ab-custom"><span>自定义</span><input type="color" class="xjs-ab-color-input" value="' + SHELF_COLORS[0] + '"></div></div>' +
      '<div class="xjs-dlg-b"><button type="button" data-xjs="ab-cancel">取消</button>' +
      '<button type="button" class="is-primary" data-xjs="ab-ok">添加</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) { m.remove(); } });
    var ci = m.querySelector('.xjs-ab-color-input');
    if (ci) {
      ci.addEventListener('input', function () {
        var v = ci.value; m.setAttribute('data-cc', v);
        var pv = m.querySelector('.xjs-ab-preview'); if (pv) { pv.style.background = v; }
        var sws = m.querySelectorAll('.xjs-ab-sw');
        for (var k = 0; k < sws.length; k++) { sws[k].classList.remove('is-on'); }
      });
    }
    setTimeout(function () { var n = m.querySelector('.xjs-ab-name'); if (n) { n.focus(); } }, 60);
  }

  /* [V21] 长按分组卡片 → 修改封面颜色 */
  function openEditCover(key) {
    var d = shelfData(), hit = null, i;
    for (i = 0; i < d.length; i++) { if (d[i].key === key) { hit = d[i]; break; } }
    if (!hit) { return; }
    var cc = hit.cc || SHELF_COLORS[0];
    var old = document.querySelector('.xjs-ab-mask'); if (old) { old.remove(); }
    var m = document.createElement('div');
    m.className = 'xjs-mask xjs-ab-mask xjs-eb-mask';
    m.setAttribute('data-cc', cc);
    m.setAttribute('data-edit-key', key);
    m.setAttribute('data-edit-book', hit.book || '');
    var sw = '';
    for (i = 0; i < SHELF_COLORS.length; i++) {
      sw += '<button type="button" class="xjs-ab-sw' + (SHELF_COLORS[i] === cc ? ' is-on' : '') + '" data-xjs="ab-pick" data-ab-pick="' + SHELF_COLORS[i] + '" style="background:' + SHELF_COLORS[i] + '" aria-label="颜色"></button>';
    }
    m.innerHTML = '<div class="xjs-dialog xjs-ab-dialog">' +
      '<div class="xjs-dlg-t">修改封面颜色</div>' +
      '<div class="xjs-eb-name">「' + esc(hit.name) + '」</div>' +
      '<div class="xjs-ab-preview" style="background:' + esc(cc) + '"><span class="xjs-ab-prev-vt">' + esc(hit.name) + '</span></div>' +
      '<div class="xjs-ab-field"><label>分组封面颜色</label>' +
      '<div class="xjs-ab-colors">' + sw + '</div>' +
      '<div class="xjs-ab-custom"><span>自定义</span><input type="color" class="xjs-ab-color-input" value="' + esc(cc) + '"></div></div>' +
      '<div class="xjs-dlg-b"><button type="button" data-xjs="eb-cancel">取消</button>' +
      '<button type="button" class="is-primary" data-xjs="eb-ok">保存</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) { m.remove(); } });
    var ci = m.querySelector('.xjs-ab-color-input');
    if (ci) {
      ci.addEventListener('input', function () {
        var v = ci.value; m.setAttribute('data-cc', v);
        var pv = m.querySelector('.xjs-ab-preview'); if (pv) { pv.style.background = v; }
        var sws = m.querySelectorAll('.xjs-ab-sw');
        for (var k = 0; k < sws.length; k++) { sws[k].classList.remove('is-on'); }
      });
    }
  }

  /* ---------------- [V40] 对方回信：生成一封完整信纸，不再用格言评论气泡 ---------------- */
  function deliverReply(origId) {
    var db = loadDB(), orig = null, i;
    for (i = 0; i < db.letters.length; i++) { if (db.letters[i].id === origId) { orig = db.letters[i]; break; } }
    if (!orig || orig.replied) { return; }
    var p = { id: orig.roleId, name: orig.roleName || '对方' };
    var R = buildRoleLetter(p, { replyTo: orig.id });
    R.chatPid = orig.chatPid || orig.roleId;
    db.letters.push(R);
    orig.replied = R.id;
    saveDB(db);
    /* 聊天里只放信封，不把任何格言文本当作对方消息发出 */
    pushChatMsg(R.chatPid, letterMsg(R, 'in'));
    try { if (S.Chat && S.Chat.maybeNotifyIncoming) { S.Chat.maybeNotifyIncoming(R.chatPid, '[信件] ' + R.title); } } catch (e0) {}
    try { document.dispatchEvent(new Event('xj:letters-changed')); } catch (e1) {}
  }

  /* ---------------- 信件详情：完整信纸 + 打字机 ---------------- */
  /* [V21] 我方 / 对方信件统一走这一套：打开就是一整张铺满的信纸，
     正文逐字浮现（打字机），点按可跳过；不再用单独的白色卡片式详情。 */
  var twTimer = null, twToken = 0;
  function stopTypewriter() { twToken++; if (twTimer) { clearTimeout(twTimer); twTimer = null; } }
  function letterParagraphs(L) {
    var box = document.createElement('div');
    box.innerHTML = String(L.html || '');
    var ps = box.querySelectorAll('p'), out = [], i, t;
    if (ps.length) {
      for (i = 0; i < ps.length; i++) {
        /* [V28] 带 xjs-strike 标记的段落= 写信时被划掉重写的那句 */
        out.push({ t: String(ps[i].textContent || '').replace(/\u00a0/g, ' '), s: ps[i].classList.contains('xjs-strike') });
      }
    } else {
      out = String(L.text || box.textContent || '').split('\n').map(function (x) { return { t: x, s: false }; });
    }
    return out;
  }
  /* [V28] 打字机节奏配置：改这里即可整体调快/调慢（单位毫秒，均再乘 settings.letterTypeRate 倍率）
     charMs   普通字间隔（真人手写约 40–70）
     punctMs  标点后的停顿（句号 > 逗号，另按标点再叠一点随机）
     spaceMs  空格/全角空格
     paraMs   换段停顿
     startMs  打开信纸到落第一个字的等待
     strikeMs 一句写完到「划掉」这一笔落下的停顿
     jitterMs 随机抖动，让节奏不那么机械 */
  var TWCFG = { charMs: 56, punctMs: 330, spaceMs: 26, paraMs: 320, startMs: 620, strikeMs: 460, jitterMs: 30 };
  /* [V35] 字素簇（grapheme cluster）切分：优先 Intl.Segmenter，环境不支持时按
     「代理对 + 变体选择符 + ZWJ 组合 + 肤色修饰 + 国旗对 + 组合附加符」手写兜底。
     打字机每次落一个完整的字而不是一个 UTF-16 码元，emoji 才不会出现半个或空白。 */
  function xjGraphemes(str) {
    var s = String(str == null ? '' : str);
    if (!s) { return []; }
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        var seg = new Intl.Segmenter('zh-Hans', { granularity: 'grapheme' });
        var arr = Array.from(seg.segment(s), function (x) { return x.segment; });
        if (arr.length && arr.join('') === s) { return arr; }
      }
    } catch (e) { /* 走兜底 */ }
    return xjGraphemeFallback(s);
  }
  function xjGraphemeFallback(s) {
    function isExtend(cp) {
      return (cp >= 0x0300 && cp <= 0x036F) || (cp >= 0x0483 && cp <= 0x0489) ||
        (cp >= 0x0591 && cp <= 0x05BD) || (cp >= 0x0610 && cp <= 0x061A) ||
        (cp >= 0x064B && cp <= 0x065F) || cp === 0x0670 ||
        (cp >= 0x06D6 && cp <= 0x06DC) || (cp >= 0x0900 && cp <= 0x0903) ||
        (cp >= 0x093A && cp <= 0x094F) || (cp >= 0x0E31 && cp <= 0x0E3A) ||
        (cp >= 0x0E47 && cp <= 0x0E4E) || (cp >= 0x1AB0 && cp <= 0x1AFF) ||
        (cp >= 0x1DC0 && cp <= 0x1DFF) || (cp >= 0x20D0 && cp <= 0x20FF) ||
        (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xFE20 && cp <= 0xFE2F) ||
        (cp >= 0x1F3FB && cp <= 0x1F3FF) || (cp >= 0xE0020 && cp <= 0xE007F) ||
        (cp >= 0xE0100 && cp <= 0xE01EF);
    }
    function isRI(cp) { return cp >= 0x1F1E6 && cp <= 0x1F1FF; }
    var out = [], i = 0, n = s.length;
    while (i < n) {
      var cp = s.codePointAt(i), cl = String.fromCodePoint(cp);
      i += cl.length;
      var ri = isRI(cp), guard = 0;
      while (i < n && guard < 24) {
        var ncp = s.codePointAt(i), nch = String.fromCodePoint(ncp);
        if (ncp === 0x200D) {                            /* ZWJ：把下一个码点一起吞进同一簇 */
          cl += nch; i += nch.length; guard++;
          if (i < n) { var c3 = s.codePointAt(i), s3 = String.fromCodePoint(c3); cl += s3; i += s3.length; guard++; }
        } else if (isExtend(ncp)) {                      /* 变体选择符 / 肤色 / 组合符 / 键帽 */
          cl += nch; i += nch.length; guard++;
        } else if (ri && isRI(ncp) && cl.length === 2) { /* 国旗 = 两个 regional indicator */
          cl += nch; i += nch.length; guard++;
        } else { break; }
      }
      out.push(cl);
    }
    return out;
  }
  function runTypewriter(m, instant) {
    stopTypewriter();
    var set = loadSet();
    var body = m.querySelector('.xjs-lt-body');
    var view = m.querySelector('.xjs-tw-view');
    if (!body || !view) { return; }
    var foot = m.querySelector('.xjs-sheet-foot'), sign = m.querySelector('.xjs-lt-sign');
    function done() {
      if (twTimer) { clearTimeout(twTimer); twTimer = null; }
      body.classList.add('is-done');
      if (foot) { foot.classList.add('is-done'); }
      if (sign) { sign.classList.add('is-done'); }
      /* [V34] 全文层出现后补量一次划线长度，保证只覆盖被划掉那句的文字 */
      requestAnimationFrame(function () {
        var fs = m.querySelectorAll('.xjs-lt-full p.xjs-strike'), fi;
        for (fi = 0; fi < fs.length; fi++) { xjMeasureStrike(fs[fi]); }
        xjPlaceFoot(m);
      });
    }
    if (instant) { done(); return; }
    body.classList.remove('is-done');
    if (foot) { foot.classList.remove('is-done'); }
    if (sign) { sign.classList.remove('is-done'); }
    view.innerHTML = '';
    var L = findLetter(m.getAttribute('data-cur'));
    var paras = L ? letterParagraphs(L) : [];
    var pEls = [], pi;
    for (pi = 0; pi < paras.length; pi++) {
      var pel = document.createElement('p'); pel.className = 'xjs-tw-p';
      /* 落款 / 日期段落与全文层保持同为右对齐，避免打字完成后跳动 */
      if (/^[　\s]*(——|—)/.test(paras[pi].t) || /^[　\s]*\d{4}年/.test(paras[pi].t)) { pel.style.textAlign = 'right'; }
      if (paras[pi].s) { pel.setAttribute('data-strike', '1'); }
      view.appendChild(pel); pEls.push(pel);
    }
    var caret = document.createElement('span'); caret.className = 'xjs-tw-caret';
    if (pEls.length) { pEls[0].appendChild(caret); }
    /* [V28] 放慢：基准节奏 × (100 / letterTypeRate)，可随时调 */
    var rate = Math.max(20, Math.min(400, Number(set.letterTypeRate) || 100)), k = 100 / rate;
    var token = twToken, p = 0, c = 0, penDone = false;
    /* [V35] 段落先按字素簇切开，后面每次只推进一个完整字素（emoji / 组合字符整块出现），
       节奏按字素个数计；划线宽度仍由 DOM 实测，不受切分方式影响。 */
    var segs = [], sj;
    for (sj = 0; sj < paras.length; sj++) { segs.push(xjGraphemes(paras[sj].t)); }
    function step() {
      if (token !== twToken) { return; }
      if (p >= paras.length || !pEls.length) { done(); return; }
      var para = paras[p], gr = segs[p], host = pEls[p];
      if (c < gr.length) {
        var ch = gr[c];
        /* [V21] caret 可能仍挂在上一段：先摘下，再 append 字符，最后把 caret 挂回当前段末尾。
           直接 insertBefore(node, caret) 在跨段时会抛「不是子节点」错误并中断打字。 */
        if (caret.parentNode) { caret.parentNode.removeChild(caret); }
        host.appendChild(document.createTextNode(ch));
        host.appendChild(caret);
        c++;
        var tail = ch.charAt(ch.length - 1);
        var delay = TWCFG.charMs + Math.random() * TWCFG.jitterMs;
        if ('，。！？；：、,.!?;:'.indexOf(tail) >= 0) { delay = TWCFG.punctMs + Math.random() * TWCFG.jitterMs * 2; }
        else if (tail === ' ' || tail === '\u3000') { delay = TWCFG.spaceMs; }
        twTimer = setTimeout(step, delay * k);
      } else if (para.s && !penDone) {
        /* [V28] 这句是「写到一半不要了」：整句写完停顿一下，再落一道划线 */
        penDone = true;
        /* [V34] 先量出这句文字的右边界，再划下去（仍由 CSS transition 自然伸展进来） */
        xjMeasureStrike(host);
        (window.requestAnimationFrame || function (f) { setTimeout(f, 16); })(function () { host.classList.add('is-struck'); });
        twTimer = setTimeout(step, TWCFG.strikeMs * k);
      } else {
        p++; c = 0; penDone = false;
        twTimer = setTimeout(step, TWCFG.paraMs * k);
      }
    }
    twTimer = setTimeout(step, TWCFG.startMs * k);
    m.__twSkip = function () { if (!body.classList.contains('is-done')) { stopTypewriter(); done(); } };
  }
  /* [V34] 从信纸背景（可能是多层渐变字符串）里取最后一层基底色 → 该张纸的墨色与纸色，
     供「划掉」笔画与信纸内按键按纸色派生配色使用：浅底取同色系深墨、深底反相取浅墨。 */
  function xjRgbOf(c) {
    var s = String(c || '').trim(), h, n, m, a;
    if (s.charAt(0) === '#') {
      h = s.slice(1);
      if (h.length === 3) { h = h.replace(/./g, function (x) { return x + x; }); }
      if (h.length === 8) { h = h.slice(0, 6); }
      if (h.length !== 6) { return null; }
      n = parseInt(h, 16); if (isNaN(n)) { return null; }
      return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      a = m[1].split(/[,\s\/]+/);
      return [parseFloat(a[0]) || 0, parseFloat(a[1]) || 0, parseFloat(a[2]) || 0];
    }
    return null;
  }
  function xjHex(rgb) {
    var s = '#', i, v;
    for (i = 0; i < 3; i++) { v = Math.max(0, Math.min(255, Math.round(rgb[i]))).toString(16); s += v.length < 2 ? '0' + v : v; }
    return s;
  }
  function xjRgb2Hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) { h = ((g - b) / d + (g < b ? 6 : 0)); }
      else if (mx === g) { h = (b - r) / d + 2; }
      else { h = (r - g) / d + 4; }
      h *= 60;
    }
    return [h, s, l];
  }
  function xjHsl2Hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return xjHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
  }
  function xjPaperTheme(bg) {
    var s = String(bg || ''), pick = null, hs, rs, rgb;
    hs = s.match(/#[0-9a-fA-F]{3,8}/g); rs = s.match(/rgba?\([^)]*\)/g);
    pick = (hs && hs.length) ? hs[hs.length - 1] : ((rs && rs.length) ? rs[rs.length - 1] : '#fbf8f0');
    rgb = xjRgbOf(pick) || [251, 248, 240];
    /* 基底色若几乎透明（自定义纸纹），退化为中性纸色，避免算出极端墨色 */
    var hsl = xjRgb2Hsl(rgb[0], rgb[1], rgb[2]);
    var lum = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    var light = lum >= 132;
    var ink, on, kicker;
    if (light) {
      ink = xjHsl2Hex(hsl[0], Math.min(.46, Math.max(.08, hsl[1] * .95)), .27);
      on = '#FFFFFF';
      /* [V42] 抬头（收到的信／寄出的信）：同色相、低饱和、比正文浅一档的中间调，压住纸色又不抢标题 */
      kicker = xjHsl2Hex(hsl[0], Math.min(.34, Math.max(.05, hsl[1] * .62)), .40);
    } else {
      ink = xjHsl2Hex(hsl[0], Math.min(.34, Math.max(.06, hsl[1] * .7)), .90);
      on = '#20262E';
      kicker = xjHsl2Hex(hsl[0], Math.min(.30, Math.max(.05, hsl[1] * .58)), .82);
    }
    return { base: xjHex(rgb), ink: ink, on: on, kicker: kicker, light: light, lum: lum };
  }
  /* [V34] 划掉的那一句只覆盖文字本身：量出该段最后一行文字的右边界，写进 --xjl-strike-w */
  function xjMeasureStrike(host) {
    if (!host) { return; }
    try {
      var pr = host.getBoundingClientRect(), r = document.createRange(), rects, i, right = 0;
      if (!pr.width) { return; }
      r.selectNodeContents(host);
      rects = r.getClientRects();
      for (i = 0; i < rects.length; i++) { if (rects[i].width > 0.5) { right = Math.max(right, rects[i].right); } }
      if (!right) { return; }
      var w = Math.min(pr.width, right - pr.left);
      if (w > 4) { host.style.setProperty('--xjl-strike-w', w.toFixed(1) + 'px'); }
    } catch (e0) { /* 量不到就退回整段宽度 */ }
  }
  /* [V41] 操作键跟随署名底部、靠右成组：不再用剩余纸高把按键顶到纸面底边 */
  function xjPlaceFoot(m) {
    var paper = m && m.querySelector('.xjs-sheet-paper'), foot = m && m.querySelector('.xjs-sheet-foot');
    if (!paper || !foot) { return; }
    var ui = parseFloat(getComputedStyle(paper).getPropertyValue('--ui')) || 1;
    foot.style.setProperty('margin-top', (10 * ui).toFixed(1) + 'px', 'important');
  }
  window.addEventListener('resize', function () {
    var m = document.querySelector('.xjs-letter-mask');
    if (m) { xjPlaceFoot(m); }
  });
  function renderLetterDetail(id, instant) {
    var L = findLetter(id); if (!L) { return; }
    var m = document.querySelector('.xjs-letter-mask');
    if (!m) { return; }
    var bg = L.paper || '#fbf8f0';
    var P = xjPaperTheme(bg);   /* [V34] 该张纸的墨色 / 纸基色 / 按键反相文字色 */
    var isReply = !!L.replyTo;
    var kicker = isReply ? '✦　收到的回信　✦' : (L.dir === 'in' ? '✦　收到的信　✦' : '✦　寄出的信　✦');
    /* [V40] 回信：上部「你的原信」引用，下部是对方写的完整回信信纸 */
    var quote = '';
    if (isReply) {
      var o = findLetter(L.replyTo);
      if (o) {
        var ox = String(o.text || '').replace(/\s+/g, ' ').trim();
        if (ox.length > 168) { ox = ox.slice(0, 168) + '…'; }
        quote = '<div class="xjs-lt-quote"><span class="xjs-lt-quote-cap">你的原信</span>' +
                '<div class="xjs-lt-quote-x">' + esc(ox || o.title || '') + '</div></div>';
      }
    }
    /* [V40] 统一书信抬头：正文里没有「致」时补称呼；正文已带落款则不再重复署名 */
    var html0 = String(L.html || '');
    var toName = L.dir === 'in' ? (L.to || '') : String(L.to || '').replace(/^给/, '');
    var toLine = /致\s*\S/.test(html0) ? '' : '<div class="xjs-lt-to">致 ' + esc(toName || '你') + '：</div>';
    var hasSign = /——|—\s/.test(html0);
    var signHtml = hasSign ? '' :
      '<div class="xjs-lt-sign">' + esc(L.dir === 'in' ? (L.sign || '') : ('—— ' + (L.sign || myName()))) + '<br>' + esc(fmtDate(L.created)) + '</div>';
    var foot = L.dir === 'out'
      ? (L.replied ? '<div class="xjs-sheet-foot"><button type="button" data-lt="viewreply">查看回信</button></div>' : '')
      : '<div class="xjs-sheet-foot"><button type="button" data-lt="reply">写回信</button></div>';
    m.innerHTML = '<div class="xjs-sheet">' +
      '<div class="xjs-sheet-paper' + (P.light ? '' : ' is-dark-paper') + '" style="--xjl-letter-bg:' + bg +
        (L.paperSize ? ';--xjl-letter-size:' + L.paperSize : '') +
        ';--xjl-ink:' + P.ink + ';--xjl-paper-base:' + P.base + ';--xjl-btn-on:' + P.on + ';--xjl-kicker:' + P.kicker + '">' +
      '<div class="xjs-lt-kicker">' + kicker + '</div>' +
      '<div class="xjs-lt-title">' + esc(L.title || '无题') + '</div>' +
      quote + toLine +
      '<div class="xjs-lt-body">' +
        '<div class="xjs-tw-view" aria-hidden="true"></div>' +
        '<div class="xjs-lt-full">' + (L.html || esc(L.text || '')) + '</div>' +
      '</div>' +
      signHtml + foot +
      '</div>' +
      '</div>';
    runTypewriter(m, !!instant);
  }
  API.openLetter = function (id) {
    var L = findLetter(id);
    if (!L) { toast('信件内容已不在本机'); return; }
    stopTypewriter();
    var olds = document.querySelectorAll('.xjs-letter-mask'), oi;
    for (oi = 0; oi < olds.length; oi++) { olds[oi].parentNode && olds[oi].parentNode.removeChild(olds[oi]); }
    var m = document.createElement('div'); m.className = 'xjs-letter-mask';
    m.setAttribute('data-cur', id);
    document.body.appendChild(m);   /* [V27] 遮罩层已去模糊去色，仅作点击关闭的命中区 */
    renderLetterDetail(id);
  };
  function closeLetterDetail() {
    stopTypewriter();
    var ms = document.querySelectorAll('.xjs-letter-mask'), i;
    for (i = 0; i < ms.length; i++) { ms[i].parentNode && ms[i].parentNode.removeChild(ms[i]); }
  }

  /* ---------------- 对方角色主动写信 ---------------- */
  /* [V18] 从主模块信纸库随机抽一张（含自定义信纸），返回 {bg,size,tint} */
  function randomLetterPaper() {
    try {
      if (S.xjl && typeof S.xjl.randomPaper === 'function') { return S.xjl.randomPaper(); }
    } catch (e0) {}
    return { bg: '#f7f2e7', size: '', tint: '#e7dcc6' };
  }
  /* [V28] 划掉重写：被丢弃句子候选（source=1 废弃句库） */
  var STRIKE_LINES = [
    '今天本来想说点什么，写到这儿又觉得不必了。',
    '算了，这句划掉吧，你也别当真。',
    '其实昨天我还想过另一件事，',
    '写到这里突然不知道怎么接了，',
    '这一句写完自己看着都觉得多余。',
    '本想抱怨两句，又觉得扫兴。',
    '差点写成别的话，还是擦掉好。',
    '这句话删掉一半，剩下半句也作废。',
    '（这里本来还有一段，想想还是不寄了。）',
    '刚才想说的那件事，好像也没那么重要。'
  ];
  /* 划掉句来源可配：1=废弃句库 2=卡片句改写 3=自造短句 */
  function strikeSentence(sel) {
    var src = Number(sel.letterStrikeSrc || 1), pool;
    if (src === 2) {
      pool = wclItems('main');
      if (pool && pool.length) { return String(pick(pool)).replace(/[。！？…]+$/, '') + '……算了，这句不要了。'; }
    }
    if (src === 3) {
      return pick(['刚写到一半就走神了，', '这句其实没想好，', '本想多说两句，', '犹豫了半天，']) +
        pick(['还是划掉吧。', '算了，不写了。', '当没说过。', '留着自己看看就好。']);
    }
    return pick(STRIKE_LINES);
  }
  function buildRoleLetter(p, opt) {
    opt = opt || {};
    var set = loadSet();
    var rp = randomLetterPaper();
    var n = Math.max(2, set.letterLines || 2);
    var cards = wclItems('main'), kao = wclItems('kao'), emo = wclItems('emoji');
    var parts = [], i, t, deco;
    for (i = 0; i < n; i++) {
      t = pick(cards.length ? cards : FALLBACK_CARDS) || FALLBACK_CARDS[i % FALLBACK_CARDS.length];
      deco = '';
      if (kao.length && Math.random() < 0.42) { deco = ' ' + pick(kao); }
      else if (emo.length && Math.random() < 0.42) { deco = ' ' + pick(emo); }
      var seg2 = t;
      if (deco) {
        var mm = String(t).match(/^(.*?)([。！？…～~!?]+)\s*$/);
        seg2 = mm ? (mm[1] + deco + mm[2]) : (t + deco);
      }
      parts.push(seg2);
    }
    /* [V28] 划掉重写：按概率把其中一句换成想丢弃的句子 */
    var strikeIdx = -1, sPct = set.letterStrikePct == null ? 40 : Number(set.letterStrikePct);
    if (parts.length && sPct > 0 && Math.random() * 100 < sPct) {
      strikeIdx = Math.floor(Math.random() * parts.length);
      parts[strikeIdx] = strikeSentence(set);
    }
    /* [V40] 每句字卡之间用标点连接成一段，靠纸宽自然换行，不再一句一行 */
    var para = '', plain = '', j, seg;
    var ENDP = /[，。！？；：、…～~,!?;:）)】」』”"']$/;
    for (j = 0; j < parts.length; j++) {
      seg = String(parts[j] || '').trim();
      if (!seg) { continue; }
      if (plain && !ENDP.test(plain)) { para += '，'; plain += '，'; }
      para += (j === strikeIdx) ? ('<span class="xjs-strike-inline">' + esc(seg) + '</span>') : esc(seg);
      plain += seg;
    }
    if (plain && !/[。！？…～~!?]$/.test(plain)) { para += '。'; plain += '。'; }
    var me = myName(), date = fmtDate(now());
    var html = '<p>致 ' + esc(me) + '：</p><p><br></p>' +
      '<p>　　' + para + '</p>' +
      '<p><br></p><p style="text-align:right">—— ' + esc(p.name) + '</p>' +
      '<p style="text-align:right">' + esc(date) + '</p>';
    var text = '致 ' + me + '：\n\n　　' + plain + '\n\n—— ' + p.name + '\n' + date;
    var L = {
      id: uid(), dir: 'in', group: myName(), to: me,
      roleId: p.id, roleName: p.name, chatPid: p.id,
      title: opt.replyTo ? ('来自' + p.name + '的回信') : ('来自' + p.name + '的信'),
      html: html, text: text,
      paper: rp.bg, paperSize: rp.size || '', tint: rp.tint,
      sign: p.name, book: '', created: now(), sentChat: true, read: false
    };
    if (opt.replyTo) { L.replyTo = opt.replyTo; }
    return L;
  }
  function deliverRoleLetter(p) {
    var db = loadDB(), L = buildRoleLetter(p);
    db.letters.push(L); saveDB(db);
    pushChatMsg(p.id, letterMsg(L, 'in'));
    try { if (S.Chat && S.Chat.maybeNotifyIncoming) { S.Chat.maybeNotifyIncoming(p.id, '[信件] ' + L.title); } } catch (e) { /* 忽略 */ }
  }
  var roleTimer = null;
  function scheduleRoleLetters() {
    if (roleTimer) { clearTimeout(roleTimer); roleTimer = null; }
    var sec = Math.max(10, loadSet().letterProactiveSec);
    roleTimer = setTimeout(function () {
      if (!document.hidden) {
        var ps = partners();
        if (ps.length) {
          var p = ps[Math.floor(Math.random() * ps.length)];
          var dur = Math.max(1, loadSet().letterDurSec);
          setTimeout(function () { try { deliverRoleLetter(p); } catch (e) { /* 忽略 */ } }, dur * 1000);
        }
      }
      scheduleRoleLetters();
    }, sec * 1000);
  }

  /* ---------------- 回信设置 ---------------- */
  /* [V30] 控件规格与「聊天设置 / 节奏设置」完全对齐：
     row-card.chat-set-row + .row-title + .chat-field + input.chat-num.chat-num-unit.chat-num-mini
     + button.chat-unit-btn（点击弹「切换单位」面板，与节奏设置同一交互）。
     时间类字段（letterProactiveSec / letterReplySec / letterDurSec）新增 秒/分钟/小时 切换：
     · 存储始终为「秒」，单位只影响显示，切换时按换算显示且不回写脏值；
     · 单位选择持久化在 snowcrystal.chat.settings.v1 的 <key>Unit 字段；
     · 调度逻辑继续按 loadSet() 的秒值参与 Date.now() 毫秒换算，无需改动。 */
  var LF_TIME_KEYS = { letterProactiveSec: 1, letterReplySec: 1, letterDurSec: 1 };
  var LF_UNIT_LABELS = { s: '秒', m: '分钟', h: '小时' };
  function lfSetRaw() { return read(CKEY, {}) || {}; }
  function lfUnitOf(key) {
    var s = lfSetRaw(), u = s[key + 'Unit'];
    /* [V44] 主动写信的时长缺省以「小时」显示（默认 7200 秒 → 2 小时），其余时间项仍按秒 */
    if (u === 's' || u === 'm' || u === 'h') { return u; }
    return (key === 'letterProactiveSec') ? 'h' : 's';
  }
  function lfFactor(u) { return u === 'm' ? 60 : (u === 'h' ? 3600 : 1); }
  function lfDisp(sec, u) {
    /* [V32] 显示精度按单位自适应：秒=整数、分=2 位、时=3 位（20s→0.006h 而非 0.01h），
       避免切到小时单位后因四舍五入造成明显数值失真；存储始终是秒，不受显示精度影响。 */
    var f = lfFactor(u);
    var p = (u === 's') ? 0 : (u === 'm' ? 2 : 3);
    var m = Math.pow(10, p);
    var v = Math.round((Number(sec) / f) * m) / m;
    /* 非零秒在小时/分钟单位下可能被舍入成 0（如 1s→0h），此时按该单位最小刻度显示，避免 min="0" 与空值观感 */
    if (v === 0 && Number(sec) > 0) { v = 1 / m; }
    return String(v);
  }
  function renderLetterSettings() {
    var root = $('chatLetterSetWrap'); if (!root) { return; }
    var s = loadSet();
    function inputHtml(key, minSec, digits) {
      var id = 'lf_' + key;
      if (LF_TIME_KEYS[key]) {
        var u = lfUnitOf(key);
        return '<input type="number" class="lf-input chat-num chat-num-unit chat-num-mini" id="' + id + '"' +
          ' data-sec="' + s[key] + '" data-minsec="' + minSec + '"' +
          ' value="' + lfDisp(s[key], u) + '" min="' + lfDisp(minSec, u) + '" step="any"' +
          ' onchange="XJShelf.setNum(\'' + key + '\',this.value)">';
      }
      return '<input type="number" class="lf-input chat-num chat-num-unit chat-num-mini" id="' + id + '"' +
        ' value="' + s[key] + '" min="' + minSec + '" step="1"' +
        ' onchange="XJShelf.setNum(\'' + key + '\',this.value)">';
    }
    function unitHtml(key, fixedLabel) {
      if (LF_TIME_KEYS[key]) {
        var u = lfUnitOf(key);
        return '<button type="button" class="chat-unit-btn lf-unit-btn" data-u="' + u + '" data-u-owner="' + key + '"' +
          ' title="点击切换单位" onclick="XJShelf.openLetterUnitPicker(\'' + key + '\')">' + (LF_UNIT_LABELS[u] || '秒') + '</button>';
      }
      return '<span class="chat-unit-btn lf-unit-fixed">' + fixedLabel + '</span>';
    }
    function row(label, key, unitLabel, minSec) {
      return '<article class="row-card chat-set-row chat-set-field"><span class="row-title">' + label + '</span>' +
        '<span class="chat-field">' + inputHtml(key, minSec) + unitHtml(key, unitLabel) + '</span></article>';
    }
    root.innerHTML = '<div class="row-list">' +
      row('主动写信的时长', 'letterProactiveSec', '秒', 10) +
      row('回信的时长', 'letterReplySec', '秒', 1) +
      row('写信单次条数', 'letterLines', '句', 2) +
      row('信件的时长', 'letterDurSec', '秒', 1) +
      row('打字机速度', 'letterTypeRate', '%', 20) +
      row('划掉重写的概率', 'letterStrikePct', '%', 0) +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">划掉句的来源</span>' +
        '<span class="chat-field"><select id="lf_letterStrikeSrc" class="lf-input chat-num chat-num-mini lf-select" onchange="XJShelf.setNum(\'letterStrikeSrc\',this.value)">' +
          '<option value="1"' + (Number(s.letterStrikeSrc) === 1 ? ' selected' : '') + '>废弃句库</option>' +
          '<option value="2"' + (Number(s.letterStrikeSrc) === 2 ? ' selected' : '') + '>卡片句改写</option>' +
          '<option value="3"' + (Number(s.letterStrikeSrc) === 3 ? ' selected' : '') + '>随口自造</option>' +
        '</select></span></article>' +
      '</div>';
  }
  /* [V31] rpOpenModal / rpEnsureModal 是聊天主模块 IIFE 的私有函数，云笺 IIFE 取不到，
     直接调用会 ReferenceError 导致「切换单位」面板根本打不开。这里就地复刻同款弹层
     （复用 #rpModalMask / .rp-modal / .rp-unit-pick 结构与样式），行为与节奏设置一致。 */
  function lfModalOpen(html) {
    var mask = document.getElementById('rpModalMask');
    if (!mask) {
      mask = document.createElement('div');
      mask.className = 'rp-modal-mask';
      mask.id = 'rpModalMask';
      mask.innerHTML = '<div class="rp-modal" id="rpModalBody"></div>';
      mask.addEventListener('click', function (e) { if (e.target === mask) { lfModalClose(); } });
      document.body.appendChild(mask);
    }
    var body = document.getElementById('rpModalBody');
    if (body) { body.innerHTML = html; }
    mask.classList.add('is-open');
  }
  function lfModalClose() {
    var mask = document.getElementById('rpModalMask');
    if (mask) { mask.classList.remove('is-open'); }
  }
  API.closeLetterUnitPicker = function () { lfModalClose(); };
  /* 单位切换：与节奏设置一致，点击单位按钮弹居中选择面板 */
  API.openLetterUnitPicker = function (key) {
    if (!LF_TIME_KEYS[key]) { return; }
    var cur = lfUnitOf(key);
    var opts = '';
    ['s', 'm', 'h'].forEach(function (u) {
      opts += '<button type="button" class="chat-unit-btn rp-unit-opt' + (u === cur ? ' is-on' : '') + '" data-u="' + u + '"' +
        ' onclick="XJShelf.setLetterUnit(\'' + key + '\',\'' + u + '\')">' + (LF_UNIT_LABELS[u] || u) + '</button>';
    });
    lfModalOpen(
      '<div class="rp-modal-head">切换单位</div>' +
      '<div class="rp-unit-pick">' + opts + '</div>' +
      '<div class="rp-row" style="margin-top:14px"><button class="rp-btn rp-btn-ghost" type="button" onclick="XJShelf.closeLetterUnitPicker()">取消</button></div>'
    );
  };
  /* 应用新单位：显示按换算重算，存储值（秒）不变 */
  API.setLetterUnit = function (key, u) {
    if (!LF_TIME_KEYS[key] || (u !== 's' && u !== 'm' && u !== 'h')) { return; }
    lfModalClose();   /* [V31] 关闭自建单位面板（不再依赖聊天模块私有函数） */
    var s = lfSetRaw();
    s[key + 'Unit'] = u;
    write(CKEY, s);
    var el = $('lf_' + key);
    if (el) {
      var minSec = Number(el.getAttribute('data-minsec') || 1) || 1;
      var sec = Number(el.getAttribute('data-sec'));
      if (!isFinite(sec) || sec <= 0) { sec = loadSet()[key]; }
      el.setAttribute('data-sec', sec);
      el.value = lfDisp(sec, u);
      el.min = lfDisp(minSec, u);
    }
    var btn = document.querySelector('#chatLetterSetWrap .lf-unit-btn[data-u-owner="' + key + '"]');
    if (btn) { btn.setAttribute('data-u', u); btn.textContent = LF_UNIT_LABELS[u] || '秒'; }
    try { if (typeof wcToast === 'function') { wcToast('已保存'); } } catch (e1) { /* 忽略 */ }
  };
  S.openLetterSettings = function () {
    if (S.switchPage) { S.switchPage('chat-letter-set'); }
    renderLetterSettings();
  };
  API.setNum = setNum;
  /* 手动触发一封对方来信（也供「写回信」后对方再来信） */
  API.triggerRoleLetter = function (pid) {
    var ps = partners(), p = null, i;
    if (!ps.length) { return null; }
    if (pid) { for (i = 0; i < ps.length; i++) { if (ps[i].id === pid) { p = ps[i]; } } }
    if (!p) { p = ps[Math.floor(Math.random() * ps.length)]; }
    try { deliverRoleLetter(p); return p.id; } catch (e) { return null; }
  };
  API.renderShelf = renderShelf;

  /* ---------------- 全局事件委托 ---------------- */
  document.addEventListener('click', function (e) {
    if (LP.fired) { e.preventDefault(); e.stopPropagation(); LP.fired = false; return; }
    var t = e.target; if (!t || !t.closest) { return; }
    /* 书架 / 信件列表内的按钮 */
    var x = t.closest('[data-xjs]');
    if (x) {
      var a = x.getAttribute('data-xjs');
      if (a === 'back') { e.preventDefault(); closeShelf(); return; }
      if (a === 'send') { e.preventDefault(); askSend(); return; }
      if (a === 'addbook') { e.preventDefault(); openAddBook(); return; }
      if (a === 'ab-pick') {
        var sw = x.getAttribute('data-ab-pick');
        var m = document.querySelector('.xjs-ab-mask');
        if (m && sw) {
          m.setAttribute('data-cc', sw);
          var pv = m.querySelector('.xjs-ab-preview'); if (pv) { pv.style.background = sw; }
          var sws = m.querySelectorAll('.xjs-ab-sw');
          for (var si = 0; si < sws.length; si++) { sws[si].classList.toggle('is-on', sws[si].getAttribute('data-ab-pick') === sw); }
        }
        return;
      }
      if (a === 'ab-cancel') { var mm = document.querySelector('.xjs-ab-mask'); if (mm) { mm.remove(); } return; }
      if (a === 'eb-cancel') { var em2 = document.querySelector('.xjs-ab-mask'); if (em2) { em2.remove(); } return; }
      if (a === 'eb-ok') {
        var em = document.querySelector('.xjs-ab-mask'); if (!em) { return; }
        var ekey = em.getAttribute('data-edit-key') || '';
        var ecc = em.getAttribute('data-cc') || SHELF_COLORS[0];
        var ebook = em.getAttribute('data-edit-book') || '';
        if (ekey) {
          saveCover(ekey, ecc);
          if (ebook) {
            var bl = books(), bi;
            for (bi = 0; bi < bl.length; bi++) { if (bl[bi].name === ebook) { bl[bi].cc = ecc; } }
            saveBooks(bl);
          }
        }
        em.remove(); renderShelf(); toast('封面颜色已更新');
        return;
      }
      if (a === 'ab-ok') {
        var mk = document.querySelector('.xjs-ab-mask'); if (!mk) { return; }
        var ni = mk.querySelector('.xjs-ab-name');
        var nm2 = ni ? String(ni.value || '').trim().slice(0, 12) : '';
        if (!nm2) { toast('请填写分组名称'); return; }
        var cc = mk.getAttribute('data-cc') || SHELF_COLORS[0];
        var bl = books(), dup = false;
        for (var bi = 0; bi < bl.length; bi++) { if (bl[bi].name === nm2) { dup = true; } }
        if (dup) { toast('已有同名分组'); return; }
        bl.push({ name: nm2, cc: cc });
        if (!saveBooks(bl)) { toast('保存失败'); return; }
        mk.remove(); renderShelf(); toast('分组已添加');
        return;
      }
    }
    var card = t.closest('.xjs-card[data-key]');
    if (card) { e.preventDefault(); openGroup(card.getAttribute('data-key')); return; }
    /* [V41] 信件行左滑：操作按钮 / 收起滑开行 / 抑制滑动后的误点 */
    var LS = API.__lsw;
    var swb = t.closest('[data-lsw]');
    if (swb) {
      e.preventDefault(); e.stopPropagation();
      var srow = swb.closest('.xjs-lrow[data-letter]');
      var slid = srow && srow.getAttribute('data-letter');
      LS.close();
      if (slid) {
        LS.confirm(function () { API.deleteLetter(slid); });
      }
      return;
    }
    if (LS.suppress) { LS.suppress = false; e.preventDefault(); e.stopPropagation(); return; }
    if (t.closest('.xjs-lrow.is-sw[data-letter]')) { LS.close(); e.preventDefault(); e.stopPropagation(); return; }
    var lrow = t.closest('.xjs-lrow[data-letter]');
    if (lrow) { e.preventDefault(); API.openLetter(lrow.getAttribute('data-letter')); return; }
    /* 信封消息：捕获阶段优先，阻止聊天已有的多选/气泡点击逻辑 */
    var bub = t.closest('.chat-bubble-letter[data-letter-id]');
    if (bub) { e.preventDefault(); e.stopPropagation(); API.openLetter(bub.getAttribute('data-letter-id')); return; }
    /* 详情弹层 */
    /* 点弹层空白处也能关闭（防止遮罩误留） */
    var lm = t.closest('.xjs-letter-mask');
    if (lm && !t.closest('.xjs-sheet')) { closeLetterDetail(); return; }
    /* [V21] 点按信纸任意处跳过打字机，立即展示全文 */
    if (lm && t.closest('.xjs-sheet-paper') && !t.closest('[data-lt]') && typeof lm.__twSkip === 'function') {
      lm.__twSkip();
    }
    var lt = t.closest('[data-lt]');
    if (lt) {
      var k = lt.getAttribute('data-lt');
      if (k === 'close') { closeLetterDetail(); }
      else if (k === 'viewreply') {
        var m = document.querySelector('.xjs-letter-mask');
        var mid = m && m.getAttribute('data-cur');
        var L = mid ? findLetter(mid) : null;
        if (L && L.replied) { closeLetterDetail(); API.openLetter(L.replied); }
      }
      else if (k === 'reply') {
        /* [V43] 直接进写信界面：拿到这封来信，带着原文回显开写 */
        var rm = document.querySelector('.xjs-letter-mask');
        var rid = rm && rm.getAttribute('data-cur');
        var RL = rid ? findLetter(rid) : null;
        closeLetterDetail();
        if (RL && S.xjl && typeof S.xjl.replyTo === 'function') { S.xjl.replyTo(RL); }
        else if (S.openLetter) { S.openLetter(); }
      }
      return;
    }
  }, true);

  /* 详情弹层记住当前信件 id */
  var _origOpenLetter = API.openLetter;
  API.openLetter = function (id) {
    _origOpenLetter(id);
    var m = document.querySelector('.xjs-letter-mask'); if (m) { m.setAttribute('data-cur', id); }
  };

  /* [V21] 长按分组卡片（约 550ms）修改封面颜色；移动 / 抬起 / 取消都撤销计时 */
  var LP = { timer: null, fired: false, sx: 0, sy: 0 };
  function lpClear() { if (LP.timer) { clearTimeout(LP.timer); LP.timer = null; } }
  document.addEventListener('pointerdown', function (e) {
    var c = e.target && e.target.closest ? e.target.closest('.xjs-card[data-key]') : null;
    if (!c) { return; }
    LP.fired = false;
    LP.sx = e.clientX || 0; LP.sy = e.clientY || 0;
    var key = c.getAttribute('data-key');
    lpClear();
    LP.timer = setTimeout(function () {
      LP.timer = null; LP.fired = true;
      try { openEditCover(key); } catch (e2) {}
    }, 550);
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!LP.timer) { return; }
    if (Math.abs((e.clientX || 0) - LP.sx) > 10 || Math.abs((e.clientY || 0) - LP.sy) > 10) { lpClear(); }
  }, true);
  document.addEventListener('pointerup', lpClear, true);
  document.addEventListener('pointercancel', lpClear, true);
  document.addEventListener('scroll', lpClear, true);
  /* 真机长按不弹系统菜单/选中文字，避免打断改色弹窗 */
  document.addEventListener('contextmenu', function (e) {
    if (e.target && e.target.closest && e.target.closest('.xjs-card[data-key]')) { e.preventDefault(); }
  }, true);

  /* ---------------- 启动 ---------------- */
  function boot() {
    ensureSendBtn();
    ensurePanes();
    scheduleRoleLetters();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
}());
