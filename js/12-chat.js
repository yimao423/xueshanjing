/* =========================================================
 * 雪晶 · 聊天（对标拾心界「聊天设置 + 日常聊天」）
 * ---------------------------------------------------------
 *  · 独立命名空间：SnowCrystal.Chat（页内快捷方法另挂 SnowCrystal.*，与既有 onclick 风格一致）
 *  · 独立存储键：snowcrystal.chat.v1（聊天数据）/
 *                snowcrystal.chat.settings.v1（聊天设置）/
 *                snowcrystal.chat.prob.v1（混入概率），不触碰其它 snowcrystal.* 键
 *  · 数据源：对方角色 ← snowcrystal.account.partners.v1（账号设置）
 *            字卡库   ← snowcrystal.wordcard.v2（main / kao / emoji / sticker / pat）
 *            表情包图 ← IndexedDB snowcrystal.media.v1（只读，不新增条目）
 *  · 复用：.page 页面体系 / switchPage / backPage / wcToast / wcConfirm /
 *          .wc-line-toggle 开关样式 / .lf-input / .row-card / .group-title
 *  · 功能：聊天列表 / 聊天室（自动回复 · 已读回执 · 主动发送 ·
 *            拼字卡 · 表情包 · 颜文字 · Emoji · 拍一拍 · 对方转发）/
 *            聊天设置（功能 + 回复节奏 + 混入开关）/ 概率设置（可调混入概率）
 * ========================================================= */
"use strict";
(function () {
  var CHAT_KEY = "snowcrystal.chat.v1";
  var CSET_KEY = "snowcrystal.chat.settings.v1";
  var CPROB_KEY = "snowcrystal.chat.prob.v1";
  var CSOUND_KEY = "snowcrystal.chat.sound.v1";
  var WCL_KEY = "snowcrystal.wordcard.v2";
  var MY_KEY = "snowcrystal.account.my.v1";
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  var MEDIA_DB = "snowcrystal.media.v1";
  var MEDIA_STORE = "media";

  var DEFAULT_SETTINGS = {
    readMode: "icon",       /* icon | text */
    enterSend: true,
    timestamp: "time",      /* none | time | datetime */
    replyMin: 30,           /* 秒 */
    replyMax: 120,          /* 秒 */
    proactive: false,
    proactiveInterval: 120, /* 秒 */
    forward: 5,             /* 对方转发概率 % */
    callAllow: false,       /* 允许对方拨打通话 */
    callProb: 50,           /* 对方自动来电触发概率 % */
    callAcceptProb: 60,     /* 我方拨打时对方接通电话概率 % */
    callRejectProb: 20,     /* 我方拨打时对方拒接电话概率 % */
    callMissProb: 20,       /* 我方拨打时对方未接电话概率 % */
    keepAlive: false,          /* 后台保活：静音音频循环播放防止页面被挂起 */
    notifyBar: true,           /* 新消息顶部通知栏：非聊天页收到消息时弹顶部横幅 */
    bgNotify: true,            /* 后台浏览器系统通知：页面 hidden 时收到消息弹系统通知 */
    recallShow: true,          /* 聊天界面显示撤回提示 */
    allowQuote: true,          /* 允许对方回复时引用我方消息 */
    cardMin: 2,             /* 拼字卡最少张数（含基础字卡） */
    cardMax: 3,             /* 拼字卡最多张数（含基础字卡） */
    cardSep: "，",           /* 拼字卡连接符号 */
    mixSwitch: { card: true, emoji: true, kao: true, sticker: true, pat: true, voice: true, quote: true, redpack: true, qa: true },
    effectEnabled: true,          /* 特效总开关 */
    effectCount: 40,              /* 特效掉落数量 */
    effectRules: [
      { kw: "好想你", emoji: "✨", type: "fall" },
      { kw: "生日快乐", emoji: "🎂", type: "rise" },
      { kw: "新年快乐", emoji: "🎉", type: "boom" },
      { kw: "我爱你", emoji: "❤️", type: "fall" },
      { kw: "我要炸了", emoji: "💥", type: "bomb" }
    ]
  };
  var DEFAULT_SOUND = {
    enabled: true,          /* 音效总开关 */
    volume: 80,             /* 音量 0-100 */
    receive: "default",     /* 接收音效：default | standard | crisp | soft */
    send: "default"         /* 发送音效：default | standard | crisp | soft */
  };
  var SOUND_META = [
    { key: "default",  label: "默认音效" },
    { key: "standard", label: "标准" },
    { key: "crisp",    label: "清脆" },
    { key: "soft",     label: "柔和" }
  ];
  var DEFAULT_PROB = { card: 50, emoji: 15, kao: 20, sticker: 30, pat: 10, voice: 20, quote: 15, redpack: 10, qa: 12, subcard: 10 };
  var PROB_META = [
    { key: "card",    label: "字卡混入", tip: "回复时追加第二、三张字卡" },
    { key: "subcard", label: "副字卡混入", tip: "回复时优先使用该角色的专属副字卡" },
    { key: "emoji",   label: "Emoji",    tip: "回复中混入 Emoji" },
    { key: "kao",     label: "颜文字",   tip: "回复中混入颜文字" },
    { key: "sticker", label: "表情包",   tip: "整条回复使用表情包图片" },
    { key: "pat",     label: "拍一拍",   tip: "回复使用「拍了拍你」类消息" },
    { key: "voice",   label: "语音字卡", tip: "回复时发送一条语音字卡音频" },
    { key: "quote",   label: "引用消息", tip: "对方回复时引用你最近一条消息" },
    { key: "redpack", label: "对方红包", tip: "对方回复时发一个红包过来" },
    { key: "qa", label: "问答混入", tip: "对方回复时发一个问答让你选择" }
  ];

  var state = {
    partnerId: "",
    replyTimer: null,
    proactiveTimer: null,
    readTimers: {},
    keepScreenOn: false,
    wakeLock: null,
    wakeLockBusy: false,   /* 屏幕常亮请求进行中（防自动重获风暴） */
    keepAliveCtx: null,       /* 后台保活 AudioContext */
    keepAliveSrc: null,       /* 后台保活 BufferSource */
    keepAliveGain: null,      /* 后台保活 GainNode */
    keepAlivePulseTimer: null, /* 发热优化 P1-1：脉冲式保活调度定时器 */
    keepAliveUnlockBound: false, /* 手势解锁监听是否已绑定 */
    notifyQueue: [],          /* 顶部通知栏消息队列 */
    notifyShowing: false,     /* 当前是否有通知栏在展示 */
    notifyTimer: null,        /* 通知栏自动消失定时器 */
    /* ---- 全局常驻消息引擎：不依赖聊天室激活，页面加载即运行 ---- */
    globalProactiveTimer: null,      /* 全局主动消息定时器 */
    globalReplyTimers: {},           /* 全局回复调度表：partnerId -> timeout */
    pendingReply: {},                /* 后台隐藏期间到期、待回前台补发的回复：partnerId -> true */
    engineStarted: false             /* 引擎是否已启动（唯一运行意图标志） */
  };

  /* ---------- 基础工具 ---------- */
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsTrySet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsSet(k, v) { lsTrySet(k, v); }
  /* ---- 聊天记录：无上限 · 跟随设备内存永久保存 ----
     主存储 localStorage（同步），写满自动降级 IndexedDB 兜底（容量远大于 localStorage）；
     运行时以内存副本 chatMem 为准，确保新消息不依赖落盘成功、随时可见。 */
  var CHAT_DB = "snowcrystal.chat.v1.db";
  var CHAT_STORE = "kv";
  var chatMem = null;
  var chatIdbCache = null;
  function chatIdbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no-idb")); return; }
      var req;
      try { req = window.indexedDB.open(CHAT_DB, 1); } catch (e) { reject(e); return; }
      req.onerror = function () { reject(req.error); };
      req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains(CHAT_STORE)) { db.createObjectStore(CHAT_STORE, { keyPath: "key" }); } };
      req.onsuccess = function () { resolve(req.result); };
    });
  }
  function chatIdbSet(key, value) {
    return chatIdbOpen().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(CHAT_STORE, "readwrite");
          tx.objectStore(CHAT_STORE).put({ key: key, value: value });
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
          tx.onabort = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    }).catch(function () { return false; });
  }
  function chatIdbGet(key) {
    return chatIdbOpen().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(CHAT_STORE, "readonly");
          var g = tx.objectStore(CHAT_STORE).get(key);
          g.onsuccess = function () { resolve(g.result && g.result.value ? g.result.value : null); };
          g.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    }).catch(function () { return null; });
  }
  function _chatMsgCount(c) {
    if (!c || !c.messages || typeof c.messages !== "object") { return 0; }
    var pid, n = 0;
    for (pid in c.messages) { n += (Array.isArray(c.messages[pid]) ? c.messages[pid].length : 0); }
    return n;
  }
  function _mergeChatFromIdb(v) {
    /* 回归修复 R1：IDB 全量副本比 ls 轻量副本更新时，把缺失消息合并进已初始化的内存副本，
       避免「ls 残留旧快照 + IDB 新数据」场景下读取旧数据覆盖新消息（消息"丢失"） */
    if (!v || typeof v !== "object" || !chatMem || typeof chatMem !== "object") { return; }
    var pid, i, m, seen;
    for (pid in v.messages) {
      if (!Array.isArray(v.messages[pid]) || !v.messages[pid].length) { continue; }
      if (!chatMem.messages[pid]) { chatMem.messages[pid] = []; }
      seen = {};
      for (i = 0; i < chatMem.messages[pid].length; i++) { if (chatMem.messages[pid][i] && chatMem.messages[pid][i].id) { seen[chatMem.messages[pid][i].id] = true; } }
      for (i = 0; i < v.messages[pid].length; i++) {
        m = v.messages[pid][i];
        if (m && m.id && !seen[m.id]) { chatMem.messages[pid].push(m); seen[m.id] = true; }
      }
      chatMem.messages[pid].sort(function (a, b) { return (a.time || 0) - (b.time || 0); });
      if (chatMem.messages[pid].length > MAX_MSG_PER_CHAT) { chatMem.messages[pid].splice(0, chatMem.messages[pid].length - MAX_MSG_PER_CHAT); }
    }
    if (v.chats && Array.isArray(v.chats) && v.chats.length > (chatMem.chats || []).length) { chatMem.chats = v.chats; }
  }
  function chatIdbPreload() {
    chatIdbGet(CHAT_KEY).then(function (v) {
      if (v && typeof v === "object") {
        chatIdbCache = v;
        /* 回归修复 R1：ls 存在旧快照时也要加载 IDB 全量；若首次 loadChat 已提前发生（竞态），
           把 IDB 中缺失的消息合并进内存副本，避免被旧 ls 初始化覆盖 */
        if (chatMem && _chatMsgCount(chatIdbCache) > _chatMsgCount(chatMem)) { _mergeChatFromIdb(chatIdbCache); }
      }
    }).catch(function () {});
  }
  if (typeof window !== "undefined" && window.indexedDB) { chatIdbPreload(); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function randInt(min, max) { min = Math.ceil(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { if (!arr || !arr.length) { return null; } return arr[Math.floor(Math.random() * arr.length)]; }
  function now() { return Date.now(); }

  function fmtTime(ts, mode) {
    if (mode === "none" || !ts) { return ""; }
    var d = new Date(ts);
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    if (mode === "datetime") { return (d.getMonth() + 1) + "-" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  /* ---------- 数据读写 ---------- */
  function loadChat() {
    var c;
    if (chatMem) { return chatMem; }
    /* 回归修复 R1：读取时优先完整数据源 —— ls 可能残留旧快照（写失败/被清/降级未回退），
       IDB 全量副本更新时不得被旧 ls 覆盖，取消息数更多者作为运行时数据 */
    var lsC = lsGet(CHAT_KEY), idbC = chatIdbCache;
    if (lsC && idbC) { c = (_chatMsgCount(idbC) > _chatMsgCount(lsC)) ? idbC : lsC; }
    else { c = lsC || idbC || null; }
    if (!c || typeof c !== "object") { c = { chats: [], messages: {} }; }
    if (!Array.isArray(c.chats)) { c.chats = []; }
    if (!c.messages || typeof c.messages !== "object") { c.messages = {}; }
    chatMem = c;
    return c;
  }
  /* v120：saveChat 防抖落盘 —— 聊天记录多时，发送/已读/自动回复等高频调用
     会反复 JSON.stringify 整个聊天对象同步写 localStorage，阻塞主线程。
     改为：更新内存副本后 250ms 内合并多次保存为一次落盘（同批变更只写一次），
     页面隐藏/卸载前强制 flush，确保刷新不丢消息；返回值保持 true 兼容既有调用。 */
  var _chatDirty = false;
  var _chatFlushTimer = null;
  var _chatPending = null;
  function flushChatSave() {
    if (!_chatDirty) { return; }
    _chatDirty = false;
    _chatFlushTimer = null;
    var c = _chatPending;
    _chatPending = null;
    var ok = lsTrySet(CHAT_KEY, c);
    /* 发热优化 P0-3b：分级双写 —— localStorage 为主通道（同步快速恢复），
       IDB 无条件异步全量备份（大聊天记录防丢失，也为后续「ls 轻量副本 +
       IDB 全量」平滑迁移预留）；ls 失败时 IDB 即唯一持久副本，并同步更新
       内存缓存兜底当前会话。 */
    if (typeof window !== "undefined" && window.indexedDB) {
      chatIdbSet(CHAT_KEY, c);
      if (!ok) { chatIdbCache = c; }
    }
  }
  function saveChat(c) {
    chatMem = c;
    _chatPending = c;
    if (!_chatDirty) {
      _chatDirty = true;
      if (_chatFlushTimer) { clearTimeout(_chatFlushTimer); }
      _chatFlushTimer = setTimeout(flushChatSave, 250);
    }
    return true;
  }
  /* 页面隐藏/卸载前强制落盘，避免防抖窗口内丢失最后变更 */
  (function bindChatFlush() {
    if (typeof window === "undefined" || window.__xjChatFlushBound) { return; }
    window.__xjChatFlushBound = true;
    var flush = function () {
      if (_chatFlushTimer) { clearTimeout(_chatFlushTimer); _chatFlushTimer = null; }
      flushChatSave();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", function () { if (document.hidden) { flush(); } });
  })();
  function loadSettings() {
    var s = lsGet(CSET_KEY);
    var out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (s && typeof s === "object") {
      var k;
      for (k in s) { if (Object.prototype.hasOwnProperty.call(s, k) && k !== "mixSwitch") { out[k] = s[k]; } }
      if (s.mixSwitch && typeof s.mixSwitch === "object") {
        for (k in DEFAULT_SETTINGS.mixSwitch) {
          if (Object.prototype.hasOwnProperty.call(s.mixSwitch, k)) { out.mixSwitch[k] = !!s.mixSwitch[k]; }
        }
      }
    }
    /* v12.4：开关字段强制布尔归一 —— 防止旧版本/手工写入的字符串脏值
       （如 "false"/"true"）导致引擎误判开关状态 */
    out.proactive = !!out.proactive;
    return out;
  }
  function saveSettings(s) { lsSet(CSET_KEY, s); }
  function loadProb() {
    var p = lsGet(CPROB_KEY), out = JSON.parse(JSON.stringify(DEFAULT_PROB)), k;
    if (p && typeof p === "object") {
      for (k in p) { if (Object.prototype.hasOwnProperty.call(p, k) && Object.prototype.hasOwnProperty.call(out, k)) { out[k] = Math.max(0, Math.min(100, Number(p[k]) || 0)); } }
    }
    return out;
  }
  function saveProb(p) { lsSet(CPROB_KEY, p); }
  function loadSound() {
    var s = lsGet(CSOUND_KEY);
    var out = JSON.parse(JSON.stringify(DEFAULT_SOUND)), k;
    if (s && typeof s === "object") {
      for (k in s) { if (Object.prototype.hasOwnProperty.call(s, k) && Object.prototype.hasOwnProperty.call(out, k)) { out[k] = s[k]; } }
    }
    out.volume = Math.max(0, Math.min(100, Number(out.volume) || 0));
    return out;
  }
  function saveSound(s) { lsSet(CSOUND_KEY, s); }

  /* 优先走 11-account.js 的统一账号接口：localStorage 受限（雨见等第三方浏览器隐私模式禁用存储）时，
     账号设置已用内存兜底保存角色，聊天列表必须读取同一份数据，否则"账号已添加但聊天列表无入口" */
  function _accountApi(name) {
    try {
      var S = window.SnowCrystal;
      if (S && S.AccountData && typeof S.AccountData[name] === "function") { return S.AccountData[name](); }
    } catch (e) { /* 忽略 */ }
    return null;
  }
  function loadMy() {
    var viaApi = _accountApi("loadMy");
    if (viaApi) { return viaApi; }
    var m = lsGet(MY_KEY); return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
  }
  function loadPartners() {
    var viaApi = _accountApi("loadPartners");
    if (viaApi) { return viaApi; }
    var list = lsGet(PARTNERS_KEY); return Array.isArray(list) ? list : [];
  }
  function loadWcl() { var w = lsGet(WCL_KEY); return (w && typeof w === "object") ? w : null; }
  function flatten(groups) {
    var out = [], i, j, it;
    groups = groups || [];
    for (i = 0; i < groups.length; i++) {
      it = (groups[i] && groups[i].items) || [];
      for (j = 0; j < it.length; j++) { out.push(it[j]); }
    }
    return out;
  }
  function textOf(item) { if (item == null) { return ""; } return typeof item === "string" ? item : String(item.text || ""); }

  /* 表情包图片：dataURL / http(s) URL 直用；mediaKey（m_xxx）从雪晶媒体库 IndexedDB 只读解析 */
  /* v78：mediaRead 加内存缓存（LRU），避免同一媒体反复 open IDB 与重复解码大图 */
  var _chatMediaCache = {}, _chatMediaOrder = [], _chatMediaMax = (window.XJ_CAP ? XJ_CAP.cacheMax() : 40);
  function _chatMediaPut(key, dataURL) {
    if (_chatMediaCache[key]) {
      var i = _chatMediaOrder.indexOf(key);
      if (i >= 0) { _chatMediaOrder.splice(i, 1); }
    }
    _chatMediaCache[key] = dataURL;
    _chatMediaOrder.push(key);
    while (_chatMediaOrder.length > _chatMediaMax) {
      var old = _chatMediaOrder.shift();
      delete _chatMediaCache[old];
    }
  }
  /* v101.4：同步读媒体内存缓存（命中即 dataURL，未命中返回空串）。
     红包皮肤等需要"首帧即显示"的场景用它内联 src，避免异步 IndexedDB 读取
     期间显示默认皮（用户反馈：发红包先默认皮、领取重渲染后才变自定义） */
  function mediaCacheGet(key) {
    var d = _chatMediaCache[String(key || "")];
    return (typeof d === "string" && d) ? d : "";
  }
  function mediaRead(key) {
    return new Promise(function (resolve) {
      if (!window.indexedDB || !key) { resolve(""); return; }
      if (_chatMediaCache[key]) { resolve(_chatMediaCache[key]); return; }
      var req;
      try { req = window.indexedDB.open(MEDIA_DB, 1); } catch (e) { resolve(""); return; }
      req.onerror = function () { resolve(""); };
      req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains(MEDIA_STORE)) { db.createObjectStore(MEDIA_STORE, { keyPath: "key" }); } };
      req.onsuccess = function () {
        var db = req.result;
        try {
          var tx = db.transaction(MEDIA_STORE, "readonly");
          var g = tx.objectStore(MEDIA_STORE).get(key);
          g.onsuccess = function () { var row = g.result; var d = row && row.data ? row.data : ""; if (d) { _chatMediaPut(key, d); } resolve(d); };
          g.onerror = function () { resolve(""); };
        } catch (e) { resolve(""); }
      };
    });
  }
  function resolveImg(src, cb) {
    src = String(src || "");
    if (/^data:/i.test(src) || /^(https?:)?\/\//i.test(src)) { cb(src); return; }
    if (/^m_[A-Za-z0-9_-]{6,}$/.test(src)) { mediaRead(src).then(cb); return; }
    /* v100：兼容旧版红包皮 rp 前缀媒体 key（历史上传的皮仍能显示） */
    if (/^rp[A-Za-z0-9_-]{4,}$/.test(src)) { mediaRead(src).then(cb); return; }
    cb("");
  }
  function stickerItemImg(item) {
    if (!item) { return ""; }
    if (typeof item === "string") { return item; }
    return String(item.img || "");
  }

  /* ---------- 字卡取料 ---------- */
  function mainItems() { var w = loadWcl(); return flatten(w && w.main); }
  function emojiItems() { var w = loadWcl(); return flatten(w && w.emoji); }
  function kaoItems() { var w = loadWcl(); return flatten(w && w.kao); }
  function stickerItems() { var w = loadWcl(); return flatten(w && w.sticker); }
  function patGroupByName(groups, name) {
    var i;
    groups = groups || [];
    for (i = 0; i < groups.length; i++) { if (groups[i] && groups[i].name === name) { return groups[i]; } }
    return null;
  }
  function patItems() { var w = loadWcl(); var g = patGroupByName(w && w.pat, "对方拍一拍库"); return flatten(g && [g]); }
  function patSelfItems() { var w = loadWcl(); var g = patGroupByName(w && w.pat, "我方拍一拍库"); return flatten(g && [g]); }
  /* 分组结构：返回原始 groups（[{name,items}]），供表情面板按组展示 */
  function emojiGroups() { var w = loadWcl(); return (w && Array.isArray(w.emoji)) ? w.emoji : []; }
  function stickerGroups() { var w = loadWcl(); return (w && Array.isArray(w.sticker)) ? w.sticker : []; }

  /* ---------- 会话与消息 ---------- */
  function upsertChat(partner) {
    var c = loadChat(), i, found = null;
    for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === partner.id) { found = c.chats[i]; break; } }
    if (found) {
      found.name = partner.name || found.name;
      found.avatar = partner.avatar || found.avatar;
      found.shape = partner.shape || "square";
    } else {
      c.chats.push({ id: partner.id, name: partner.name || "对方", avatar: partner.avatar || "", shape: partner.shape || "square", lastText: "", lastTime: 0, pinned: false });
    }
    saveChat(c);
    return c;
  }
  /* 发热优化 P0-3：单会话消息上限，超出后保尾裁剪（丢弃最旧消息），
     防止聊天记录无限增长导致 localStorage 写入 / JSON 解析持续变慢、页面发热 */
  var MAX_MSG_PER_CHAT = 500;
  function pushMsg(partnerId, msg) {
    var c = loadChat();
    if (!c.messages[partnerId] || !Array.isArray(c.messages[partnerId])) { c.messages[partnerId] = []; }
    c.messages[partnerId].push(msg);
    if (c.messages[partnerId].length > MAX_MSG_PER_CHAT) {
      c.messages[partnerId].splice(0, c.messages[partnerId].length - MAX_MSG_PER_CHAT);
    }
    saveChat(c);
  }
  function setLast(partnerId, text, t) {
    var c = loadChat(), i, found = null;
    for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === partnerId) { found = c.chats[i]; break; } }
    if (found) {
      found.lastText = text; found.lastTime = t;
    } else {
      /* 全局引擎在非聊天界面也可能收到消息：聊天列表无该会话时自动补一条 */
      var pp = findPartner(partnerId);
      c.chats.push({ id: partnerId, name: (pp && pp.name) || "对方", avatar: (pp && pp.avatar) || "", shape: (pp && pp.shape) || "square", lastText: text, lastTime: t, pinned: false });
    }
    saveChat(c);
  }
  function msgText(msg) {
    if (msg.msgType === "sticker") { return "[表情包]"; }
    if (msg.msgType === "voice") { return "[语音]"; }
    if (msg.msgType === "image") { return "[图片]"; }
    if (msg.msgType === "forward") {
      if (msg.innerType === "qa") { return "转发问答：" + String(msg.q || ""); }
      return "转发：" + String(msg.text || "");
    }
    if (msg.msgType === "qa") { return "[问答]：" + String(msg.q || ""); }
    return String(msg.text || "");
  }

  /* ---------- 页面：聊天列表 ---------- */
  function openChatList() { switchPage("chat-list"); renderChatList(); }
  function renderChatList() {
    var wrap = document.getElementById("chatListWrap");
    if (!wrap) { return; }
    var partners = loadPartners();
    var c = loadChat();
    if (!partners.length) {
      wrap.innerHTML =
        '<div class="chat-empty">' +
        '<p class="chat-empty-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16v10.2H9.2L5.2 20v-3.3H4z"/><path d="M8.5 11.2h7M8.5 13.7h4.4"/></svg></p>' +
        '<p class="chat-empty-title">还没有可聊天的人</p>' +
        '<p class="chat-empty-desc">先在「账号设置」里添加一个对方角色，Ta 就会出现在这里。</p>' +
        '<button class="chat-empty-btn" type="button" onclick="SnowCrystal.openAccountSettings()">去添加对方角色</button>' +
        "</div>";
      return;
    }
    var items = [], i, j, p, ch = null;
    for (i = 0; i < partners.length; i++) {
      p = partners[i];
      ch = null;
      for (j = 0; j < c.chats.length; j++) { if (c.chats[j].id === p.id) { ch = c.chats[j]; break; } }
      if (!ch) { ch = { id: p.id, name: p.name, avatar: p.avatar || "", shape: p.shape || "square", lastText: "", lastTime: 0 }; }
      items.push({ p: p, ch: ch });
    }
    /* v100：置顶会话排在最前，其余保持原顺序 */
    items.sort(function (a, b) { return (b.ch.pinned ? 1 : 0) - (a.ch.pinned ? 1 : 0); });
    var html = "";
    for (i = 0; i < items.length; i++) {
      p = items[i].p; ch = items[i].ch;
      var avatar = p.avatar || "";
      var avatarHtml = avatar
        ? '<img class="chat-avatar-img" src="' + esc(avatar) + '" alt="">'
        : '<span class="chat-avatar-ph">' + esc(String(p.name || "对").slice(0, 1)) + "</span>";
      var pidEsc = String(p.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      html +=
        '<article class="row-card chat-item" role="listitem" onclick="SnowCrystal.openChatRoom(\'' + pidEsc + '\')">' +
        '<span class="chat-avatar' + (p.shape === "square" ? " is-square" : "") + '">' + avatarHtml + "</span>" +
        '<div class="row-main chat-item-main">' +
        '<span class="row-title chat-item-name">' + esc(p.name || "对方") + (ch.pinned ? '<span class="chat-pin-badge">置顶</span>' : "") + "</span>" +
        '<span class="row-desc chat-item-last">' + (ch.lastText ? esc(ch.lastText) : "打个招呼吧～") + "</span>" +
        "</div>" +
        (ch.lastTime ? '<span class="chat-item-time">' + esc(fmtTime(ch.lastTime, "datetime")) + "</span>" : "") +
        "</article>";
    }
    wrap.innerHTML = html;
  }

  /* ---------- 页面：聊天室 ---------- */
  function openChatRoom(partnerId) {
    var partners = loadPartners(), i, p = null;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { p = partners[i]; break; } }
    if (!p) { wcToast("对方角色不存在"); return; }
    closeEmojiPanel();
    closePlusPanel();
    closeChatBgPanel();
    state.partnerId = partnerId;
    if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.applyStored) { window.SnowCrystal.Chat.applyStored(); } else { applyStoredChatBg(); }
    renderChatRoomInfo();
    upsertChat(p);
    switchPage("chat-room");
    renderRoomHead(p);
    renderMessages(partnerId);
    /* 进入聊天室：清除本会话的顶栏弹窗与排队（消息已在聊天流中，弹窗无意义） */
    if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
    hideNotifyBar();
    state.notifyShowing = false;
    state.notifyQueue = state.notifyQueue.filter(function (it) { return it.partnerId !== partnerId; });
    if (state.notifyQueue.length) { notifyNext(); }
    /* 全局常驻消息引擎由页面加载/设置开关统一管理，进聊天室不再重启，
       避免打断跨页面消息节奏 */
    startSimulateCallTimer();
  }
  /* ---------- 底栏信息区：我方角色名 / 当前情绪 / 心动值（无存储时占位） ---------- */
  function renderChatRoomInfo() {
    var nameEl = document.getElementById("chatInfoName");
    var moodEl = document.getElementById("chatInfoMood");
    var heartEl = document.getElementById("chatInfoHeart");
    if (!nameEl && !moodEl && !heartEl) { return; }
    var my = loadMy();
    var name = (my && my.name) ? String(my.name).trim() : "";
    var mood = (my && my.mood) ? String(my.mood).trim() : "";
    if (nameEl) { nameEl.textContent = name || "我"; }
    if (moodEl) { moodEl.textContent = "当前情绪为" + (mood || "平静"); }
    if (heartEl) { heartEl.textContent = "心动值 0"; }
  }
  function renderRoomHead(p) {
    /* v62：顶栏返回键右侧展示对方角色名，火苗 + 连续聊天天数紧随其后 */
    var nameEl = document.getElementById("chatRoomName");
    if (nameEl) {
      nameEl.textContent = (p && p.name && String(p.name).trim()) ? String(p.name).trim() : "对方";
    }
    refreshFlameDisplay();
  }
  /* ===== 顶栏火苗 + 连续聊天天数（基于聊天记录持久化数据计算；心动数字已移除） =====
   * 规则：
   *   - 活跃日 = 当天自然日内有自己发送（type === "self"）的消息记录；
   *   - 火苗点亮 = 今日有发送消息；今日未发送任何消息则暗灭；
   *   - 连续天数 = 从今天（今日有聊）或昨天（今日未聊但昨天有聊）起向前
   *     连续存在活跃消息的自然日数量；中断超过 1 天则归 0。
   * 数据源：localStorage snowcrystal.chat.v1 -> messages[partnerId] */
  function dateStr(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function dateOf(ts) {
    var d = new Date(ts || now());
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function activeDaySet(partnerId) {
    var c = loadChat();
    var set = {};
    var msgs = (c && c.messages && c.messages[partnerId]) ? c.messages[partnerId] : [];
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i] && msgs[i].type === "self" && msgs[i].time) { set[dateOf(msgs[i].time)] = 1; }
    }
    return set;
  }
  /* 起始聊天日期：解析（支持 2024-05-20 / 2024.5.20 / 2024/5/20 等）/ 换算自然日差 */
  function parseStartDate(s) {
    var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(s || ""));
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) { return null; }
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) { return null; }
    return dt;
  }
  function startDayDiff(sd) {
    var nowD = new Date();
    var today = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());
    return Math.round((today.getTime() - sd.getTime()) / 86400000);
  }
  function computeFlame(partnerId) {
    /* v84：已设置「起始聊天日期」时，天数 = 从该日起（含当天）到今天的自然日数，
       不依赖聊天记录 —— 清空聊天记录后依然自动计算；未设置时回退按活跃日统计 */
    var c0 = loadChat();
    var start = (c0.starts && c0.starts[partnerId]) ? c0.starts[partnerId] : null;
    if (start) {
      var sd = parseStartDate(start);
      if (sd) {
        var n = startDayDiff(sd);
        if (n < 0) { return { lit: false, streak: 0 }; } /* 起始日期在未来时先显示 0 天 */
        var set2 = activeDaySet(partnerId);
        return { lit: !!set2[dateStr(0)], streak: n + 1 };
      }
    }
    var set = activeDaySet(partnerId);
    var todayStr = dateStr(0);
    var lit = !!set[todayStr];
    var streak = 0;
    var cur = new Date();
    if (!lit) { cur.setDate(cur.getDate() - 1); } /* 今日未聊则从昨天起算最近连续段 */
    var guard = 0;
    while (guard < 7300) {
      if (!set[dateOf(cur.getTime())]) { break; }
      streak++;
      cur.setDate(cur.getDate() - 1);
      guard++;
    }
    return { lit: lit, streak: streak };
  }
  /* 点击顶栏天数：设置 / 清除起始聊天日期（v84；数据独立存 c.starts，清空聊天记录不影响） */
  function setChatStartDate() {
    var partnerId = state.partnerId;
    if (!partnerId) { return; }
    var c = loadChat();
    var cur = (c.starts && c.starts[partnerId]) ? c.starts[partnerId] : "";
    wcPrompt("设置开始聊天的日期", cur, "如 2024-05-20 · 留空恢复按聊天记录统计", function (v) {
      if (v === null || v === undefined) { return; }
      v = String(v).trim();
      if (!c.starts) { c.starts = {}; }
      if (v === "") {
        delete c.starts[partnerId];
        saveChat(c);
        refreshFlameDisplay();
        wcToast("已清除起始日期，天数恢复按聊天记录统计");
        return;
      }
      var d = parseStartDate(v);
      if (!d) { wcToast("没读懂这个日期，试试 2024-05-20 这样的写法"); return; }
      var mo = d.getMonth() + 1, day = d.getDate();
      var fmt = d.getFullYear() + "-" + (mo < 10 ? "0" + mo : mo) + "-" + (day < 10 ? "0" + day : day);
      c.starts[partnerId] = fmt;
      saveChat(c);
      refreshFlameDisplay();
      wcToast("已设置起始日期 " + fmt + "，连续天数自动更新");
    }, { hideLine: true });
  }
  function refreshFlameDisplay() {
    var wrap = document.getElementById("chatRoomHeartbeat");
    var streakEl = document.getElementById("chatHeartbeatStreak");
    if (!wrap) { return; }
    if (!wrap.getAttribute("data-start-bound")) {
      wrap.setAttribute("data-start-bound", "1");
      wrap.setAttribute("role", "button");
      wrap.setAttribute("tabindex", "0");
      wrap.addEventListener("click", function (e) {
        e.stopPropagation();
        setChatStartDate();
      });
      wrap.addEventListener("keydown", function (e) {
        var k = e.key || "";
        if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
        e.preventDefault();
        setChatStartDate();
      });
    }
    var f = computeFlame(state.partnerId);
    if (streakEl) { streakEl.textContent = String(f.streak); }
    var c = loadChat();
    var start = (c.starts && c.starts[state.partnerId]) ? c.starts[state.partnerId] : null;
    wrap.title = start ? ("起始 " + start + " · 连续聊天 " + f.streak + " 天 · 点击修改") : ("连续聊天 " + f.streak + " 天 · 点击设置起始日期" + (f.lit ? " · 今日已聊天" : " · 今日未发送消息"));
  }
  function backFromChatRoom() {
    stopAllTimers();
    closeEmojiPanel();
    closePlusPanel();
    voiceStopPlay();
    state.partnerId = "";
    switchPage("chat-list");
    renderChatList();
  }
  function clearChatHistory(partnerId) {
    var c = loadChat(), i;
    if (c.messages[partnerId]) { c.messages[partnerId] = []; }
    for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === partnerId) { c.chats[i].lastText = ""; c.chats[i].lastTime = 0; break; } }
    saveChat(c);
    renderMessages(partnerId);
  }

  /* 账号设置头像形状（circle/square）：跟随 snowcrystal.account.my.v1 / partners.v1 的 shape */
  function accountShapeOf(kind, partnerId) {
    try {
      var key = kind === "my" ? "snowcrystal.account.my.v1" : "snowcrystal.account.partners.v1";
      var raw = window.localStorage ? window.localStorage.getItem(key) : null;
      if (!raw) { return "square"; }
      var data = JSON.parse(raw);
      if (kind === "my") { return (data && data.shape === "circle") ? "circle" : "square"; }
      if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          if (data[i] && data[i].id === partnerId) { return data[i].shape === "circle" ? "circle" : "square"; }
        }
      }
      return "square";
    } catch (e) { return "square"; }
  }
  function avatarShapeCls(kind, partnerId, cache) {
    if (cache) { return kind === "my" ? cache.myShapeCls : cache.otherShapeCls; }
    return accountShapeOf(kind, partnerId) === "square" ? " chat-avatar-square" : " chat-avatar-circle";
  }

  function avatarOf(partnerId, cache) {
    var p = null;
    if (cache) { p = cache.other; }
    else {
      var partners = loadPartners(), i;
      for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { p = partners[i]; break; } }
    }
    if (p && p.avatar) { return '<img class="chat-avatar-img" src="' + esc(p.avatar) + '" alt="">'; }
    return '<span class="chat-avatar-ph">' + esc(String((p && p.name) || "对").slice(0, 1)) + "</span>";
  }
  /* 我方头像：跟随账号设置 snowcrystal.account.my.v1（我方发送的消息显示我方头像） */
  function avatarOfMy(cache) {
    var m = cache ? cache.my : loadMy();
    if (m && m.avatar) { return '<img class="chat-avatar-img" src="' + esc(m.avatar) + '" alt="">'; }
    return '<span class="chat-avatar-ph">' + esc(String((m && m.name) || "我").slice(0, 1)) + "</span>";
  }
  /* v120：一次渲染窗口内复用的头像/形状缓存，避免每条消息重复 JSON.parse localStorage。
     全量与增量渲染、加载更早共用；不传 cache 时上述函数维持原有独立读取语义。 */
  function buildRenderCache(partnerId) {
    var my = loadMy();
    var partners = loadPartners();
    var other = null, i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { other = partners[i]; break; } }
    var myShape = (my && my.shape === "circle") ? "circle" : "square";
    var otherShape = (other && other.shape === "circle") ? "circle" : "square";
    return {
      my: my,
      partners: partners,
      other: other,
      myShapeCls: myShape === "square" ? " chat-avatar-square" : " chat-avatar-circle",
      otherShapeCls: otherShape === "square" ? " chat-avatar-square" : " chat-avatar-circle",
      myAvatarHtml: (my && my.avatar) ? '<img class="chat-avatar-img" src="' + esc(my.avatar) + '" alt="">' : '<span class="chat-avatar-ph">' + esc(String((my && my.name) || "我").slice(0, 1)) + "</span>",
      otherAvatarHtml: (other && other.avatar) ? '<img class="chat-avatar-img" src="' + esc(other.avatar) + '" alt="">' : '<span class="chat-avatar-ph">' + esc(String((other && other.name) || "对").slice(0, 1)) + "</span>"
    };
  }

  /* ---- 语音消息辅助：声波纹 + 时长文本 ---- */
  function voiceWaveHtml() {
    var bars = "";
    for (var i = 0; i < 7; i++) { bars += "<i></i>"; }
    return '<span class="chat-voice-wave">' + bars + "</span>";
  }
  function fmtVoiceDur(d) {
    d = Math.max(0, Math.round(Number(d) || 0));
    var m = Math.floor(d / 60), s = d % 60;
    return m + "\u2032" + (s < 10 ? "0" : "") + s + "\u2033";
  }

  /* 语音气泡点击播放（对标拾心界）：按 data-mid 从消息记录取回音频，播放/再点停止 */
  function playVoiceMsg(el) {
    var bubble = (el && el.classList && el.classList.contains("chat-voice-bubble")) ? el : (el ? el.closest(".chat-voice-bubble") : null);
    if (!bubble) { return; }
    if (voiceAudio && voiceAudioBubble === bubble) { voiceStopPlay(); return; }
    var mid = bubble.getAttribute("data-mid") || "";
    var c = loadChat(), list = c.messages[state.partnerId] || [], m = null, i;
    for (i = 0; i < list.length; i++) { if (list[i].id === mid) { m = list[i]; break; } }
    if (!m || !m.voice) { voiceStopPlay(); wcToast("语音数据缺失"); return; }
    voicePlaySrc(m.voice, m.voiceDur || 0, null, bubble);
  }
  /* v80：消息渲染 —— 单条 HTML 生成抽为 msgHtml（全量与增量共用，保证字符串逐字一致）；
     新增 _msgMeta 记录上次全量渲染的会话与条数；追加型调用（发送/接收/拍一拍/贴图/通话通知）
     走 appendOnly 增量分支，仅追加尾部新消息，避免聊天记录多时每次收发都整段 innerHTML 重绘。
     v120：对标拾心界分批渲染 —— 初次只渲染尾部最近 CHAT_INIT_RENDER 条，顶部提供
     「加载更早消息」按钮/滚动到顶触发向前分批加载，从根本上避免几百条消息全量重建 DOM。
     start = 当前渲染窗口在完整列表中的起始索引；total = 完整列表长度。 */
  var _msgMeta = { partnerId: "", count: 0, start: 0, total: 0 };
  var CHAT_INIT_RENDER = 100;   /* 初次渲染最近消息条数（对标拾心界 DISPLAYED_MSG_COUNT） */
  var CHAT_HISTORY_BATCH = 60;  /* 每次「加载更早消息」向前追加的条数（对标拾心界 HISTORY_BATCH_SIZE） */
  var _historyLoading = false;  /* 防止加载更早重入 */
  function msgHtml(m, partnerId, set, isSelf, cache) {
    var html = "", fwdTag = "", quoteHtml = "";
    if (m.isRecall) {
      if (set.recallShow === false) { return ""; }
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + esc(m.recallText || (m.type === "self" ? "你撤回了一条消息" : "对方撤回了一条消息")) + "</span></div>";
    }
    if (m.msgType === "pat") {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + esc(m.text || "") + "</span></div>";
    }
    if (m.msgType === "call" || m.isCall) {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text chat-msg-call">' + callNoticeIconHtml() + "<span>" + esc(m.text || "") + "</span></span></div>";
    }
    fwdTag = m.msgType === "forward" ? '<span class="chat-forward-tag">转发</span>' : "";
    if (m.quote && m.quote.text) {
      /* v95：引用块移入气泡内部展示，此处直接生成完整引用容器 */
      quoteHtml = '<div class="chat-msg-quote' + (isSelf ? " is-self" : " is-other") + '"><span class="msg-quote-ref" data-qmid="' + esc(m.quote.mid || "") + '"><span class="msg-quote-text">' + esc(m.quote.text) + "</span></span></div>";
    }
    html += '<div class="chat-msg ' + (isSelf ? "is-self" : "is-other") + '" data-mid="' + esc(m.id || "") + '">';
    html += '<span class="chat-msg-avatar' + avatarShapeCls(isSelf ? "my" : "other", partnerId, cache) + '">' + (isSelf ? avatarOfMy(cache) : avatarOf(partnerId, cache)) + "</span>";
    html += '<div class="chat-msg-col">';
    if (m.msgType === "voice") {
      /* v91：语音气泡点击播放（对标拾心界），音频从消息记录按 data-mid 取回，避免 dataURL 撑大 DOM */
      html += '<div class="chat-bubble chat-voice-bubble' + (isSelf ? " is-self" : " is-other") + '" data-mid="' + esc(m.id || "") + '" role="button" tabindex="0" title="点击播放 / 停止" onclick="SnowCrystal.Chat.playVoiceMsg(this)">' + fwdTag + quoteHtml + voiceWaveHtml() + '<span class="chat-voice-dur">' + esc(fmtVoiceDur(m.voiceDur || 0)) + "</span></div>";
    } else if (m.msgType === "sticker" || (m.msgType === "forward" && m.img)) {
      /* v121：先解析后渲染 —— 媒体缓存命中时内联最终 src 直渲（发送前面板已预热，点击即显示）；
         未命中仍走 data-src 占位，由增量解析兜底（修复后的 collectPendingImgs 在搬入前收集） */
      var stkKey = stickerItemImg(m.img), stkUrl = mediaCacheGet(stkKey);
      html += '<div class="chat-bubble chat-bubble-sticker">' + fwdTag + quoteHtml + (stkUrl ? '<img class="chat-sticker-img" src="' + esc(stkUrl) + '" alt="表情包">' : '<img class="chat-sticker-img" data-src="' + esc(stkKey) + '" alt="表情包">') + '</div>';
    } else if (m.msgType === "image") {
      /* v97：图片消息（加号面板「图片」功能），data-src 存 mediaKey，由 loadStickerImgs 一并解析 */
      var imgKey = m.img || "", imgUrl = mediaCacheGet(imgKey);
      html += '<div class="chat-bubble chat-bubble-img' + (isSelf ? " is-self" : " is-other") + '">' + fwdTag + quoteHtml + (imgUrl ? '<img class="chat-img" src="' + esc(imgUrl) + '" alt="图片">' : '<img class="chat-img" data-src="' + esc(imgKey) + '" alt="图片">') + '</div>';
    } else if (m.msgType === "redpack") {
      /* v9：红包消息 —— 简约红包皮卡片，点击打开详情弹窗领取 */
      html += redpackCardHtml(m, isSelf, partnerId, set);
    } else if (m.msgType === "qa") {
      /* v102：让你选 —— 问答抉择气泡，跟随主题配色 */
      html += '<div class="chat-bubble chat-bubble-qa' + (isSelf ? " is-self" : " is-other") + '">' + fwdTag + quoteHtml + qaCardHtml(m, isSelf, partnerId, set) + "</div>";
    } else {
      var bubExtra = (window.SnowBubble && window.SnowBubble.extraClsFor) ? window.SnowBubble.extraClsFor(partnerId, isSelf, m) : "";
      html += '<div class="chat-bubble' + (isSelf ? " is-self" : " is-other") + bubExtra + '">' + fwdTag + quoteHtml + esc(m.text || "") + "</div>";
    }
    var t = fmtTime(m.time, set.timestamp);
    var readHtml = "";
    if (isSelf && t) {
      if (set.readMode === "text") { readHtml = m.read ? "<i class='chat-read chat-read-text'>已读</i>" : ""; }
      else if (m.read) { readHtml = "<i class='chat-read'>&#10003;&#10003;</i>"; }
    }
    if (t || readHtml) {
      html += '<div class="chat-msg-meta">' + (t ? "<span class='chat-msg-time'>" + esc(t) + "</span>" : "") + readHtml + "</div>";
    }
    html += "</div></div>";
    return html;
  }
  /* v131：转发消息统一卡片 —— 连续相邻的 forward 消息聚合为一张微信"聊天记录"卡片：
     头部标题「XX的聊天记录」，正文灰色小字摘要预览（纯文字、无头像无气泡，超出省略），
     底部「聊天记录」入口；组内每条保留独立 id（data-fwd-ids）供多选整组/详情/更多操作使用 */
  function fwdCardPreviewText(m) {
    var ot = m.origType || "";
    if (ot === "qa" || m.innerType === "qa") { return "[问答] " + String(m.q || ""); }
    if (ot === "redpack") { return "[红包] " + String(m.wish || ""); }
    if (ot === "pat") { return "[拍一拍] " + String(m.text || ""); }
    if (ot === "call" || m.isCall) { return "[通知] " + String(m.text || ""); }
    if (m.isRecall) { return "[通知] " + String(m.text || m.recallText || ""); }
    if (m.img) { return "[图片]"; }
    if (m.voice) { return "[语音] " + String(fmtVoiceDur(m.voiceDur || 0)); }
    return String(m.text || "");
  }
  function fwdCardItemHtml(m) {
    var originName = m.fwdOriginName || (m.fwdOriginType === "self" ? "我" : "对方");
    return '<div class="chat-fwd-card-preview"><span class="chat-fwd-card-preview-name">' + esc(originName) + '：</span><span class="chat-fwd-card-preview-text">' + esc(fwdCardPreviewText(m)) + "</span></div>";
  }
  function fwdCardHtml(grp, partnerId, set, isSelf, cache) {
    var first = grp[0];
    var fromName = first.fwdFromName || "其他对话";
    var ids = [], i;
    for (i = 0; i < grp.length; i++) { ids.push(grp[i].id || ""); }
    var html = '<div class="chat-msg chat-fwd-card-msg ' + (isSelf ? "is-self" : "is-other") + '" data-mid="' + esc(first.id || "") + '" data-fwd-ids="' + esc(ids.join(",")) + '">';
    html += '<span class="chat-msg-avatar' + avatarShapeCls(isSelf ? "my" : "other", partnerId, cache) + '">' + (isSelf ? avatarOfMy(cache) : avatarOf(partnerId, cache)) + "</span>";
    html += '<div class="chat-msg-col">';
    html += '<div class="chat-bubble chat-fwd-card' + (isSelf ? " is-self" : " is-other") + '">';
    html += '<div class="chat-fwd-card-title">' + esc(fromName) + "的聊天记录</div>";
    html += '<div class="chat-fwd-card-items">';
    /* 预览显示全部转发条目（v132：放开转发后，红包/拍一拍/通知/问答等特殊类型均需在预览呈现合理标识） */
    var maxPreview = grp.length;
    for (i = 0; i < maxPreview; i++) { html += fwdCardItemHtml(grp[i]); }
    html += "</div>";
    html += '<div class="chat-fwd-card-foot"><span class="chat-fwd-card-open">聊天记录</span><span class="chat-fwd-card-arrow">›</span></div>';
    html += "</div>";
    var t = fmtTime(first.time, set.timestamp);
    var readHtml = "";
    if (isSelf && t) {
      if (set.readMode === "text") { readHtml = first.read ? "<i class='chat-read chat-read-text'>已读</i>" : ""; }
      else if (first.read) { readHtml = "<i class='chat-read'>&#10003;&#10003;</i>"; }
    }
    if (t || readHtml) {
      html += '<div class="chat-msg-meta">' + (t ? "<span class='chat-msg-time'>" + esc(t) + "</span>" : "") + readHtml + "</div>";
    }
    html += "</div></div>";
    return html;
  }
  function renderMessages(partnerId, appendOnly) {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var c = loadChat();
    var list = c.messages[partnerId] || [];
    var set = loadSettings();
    if (!list.length) {
      _msgMeta = { partnerId: partnerId, count: 0 };
      box.innerHTML = '<div class="chat-msg-empty"><p>你们还没开始聊天<br>发一句试试吧</p></div>';
      return;
    }
    /* 增量追加：仅当同一会话、且新列表是旧列表的尾部扩展时使用（撤回/删除/切换会话会回退全量） */
    if (appendOnly && _msgMeta.partnerId === partnerId && list.length > _msgMeta.count) {
      var wrap = document.createElement("div"), i, m, k;
      /* 跨边界延续：新增段首条是 forward 且上一条（已渲染尾部）也是 forward 时，
         聚合卡片会跨渲染边界，直接回退全量渲染以保证连续转发正确合并 */
      if (list[_msgMeta.count] && list[_msgMeta.count].msgType === "forward" &&
          _msgMeta.count > 0 && list[_msgMeta.count - 1] && list[_msgMeta.count - 1].msgType === "forward") {
        renderMessages(partnerId, false);
        return;
      }
      for (i = _msgMeta.count; i < list.length; i++) {
        m = list[i];
        if (m.msgType === "forward") {
          var grp = [m];
          k = i + 1;
          while (k < list.length && list[k].msgType === "forward") { grp.push(list[k]); k++; }
          wrap.insertAdjacentHTML("beforeend", fwdCardHtml(grp, partnerId, set, m.type === "self"));
          i = k - 1;
          continue;
        }
        var nh = msgHtml(m, partnerId, set, m.type === "self");
        if (nh) { wrap.insertAdjacentHTML("beforeend", nh); }
      }
      /* v121（修复）：搬入前先收集新节点内待解析图片 —— 原 v120 实现把 collectPendingImgs 放在
         搬入之后，此时 wrap 已被清空，收集恒为空数组，导致新消息的表情包/图片占位 img 永远不解析
         （用户反馈：刚发表情包不显示、等几秒/触发全量渲染后才显示）。必须在 while 搬入前收集，
         resolvePendingImgs 的回调对已搬入 box 的节点引用仍然有效 */
      var freshImgs = collectPendingImgs(wrap);
      while (wrap.firstChild) { box.appendChild(wrap.firstChild); }
      _msgMeta.count = list.length;
      _msgMeta.total = list.length;
      resolvePendingImgs(freshImgs);
      scrollChatBottom();
      return;
    }
    /* v120：对标拾心界分批渲染 —— 全量分支只渲染尾部最近 CHAT_INIT_RENDER 条，
       顶部提供「加载更早消息」入口；渲染循环复用头像/形状缓存，避免每条消息重复 JSON.parse */
    var start = 0, cache = buildRenderCache(partnerId), html = "", i, m, k;
    if (list.length > CHAT_INIT_RENDER) { start = list.length - CHAT_INIT_RENDER; }
    /* 连续转发聚合跨窗口边界：回退到连续段起点，保证转发卡片不被窗口截断 */
    while (start > 0 && list[start - 1] && list[start - 1].msgType === "forward") { start--; }
    for (i = start; i < list.length; i++) {
      m = list[i];
      if (m.msgType === "forward") {
        var grp = [m];
        k = i + 1;
        while (k < list.length && list[k].msgType === "forward") { grp.push(list[k]); k++; }
        html += fwdCardHtml(grp, partnerId, set, m.type === "self", cache);
        i = k - 1;
        continue;
      }
      var h = msgHtml(m, partnerId, set, m.type === "self", cache);
      if (h) { html += h; }
    }
    _msgMeta = { partnerId: partnerId, count: list.length, start: start, total: list.length };
    box.innerHTML = (start > 0 ? historyLoaderHtml() : "") + html;
    scrollChatBottom();
    loadStickerImgs(box);
    installHistoryLoaderScroll(box);
    return;
  }
  /* v120：收集待解析图片（只查未设置 src 的节点），供增量分支在节点搬入前收集 */
  var STICKER_IMG_SEL = "img.chat-sticker-img[data-src], img.chat-img[data-src], img.chat-fwd-card-img[data-src], img.chat-rp-card-bg[data-src]";
  function collectPendingImgs(scope) {
    var out = [];
    if (!scope || scope.nodeType !== 1) { return out; }
    var imgs = scope.querySelectorAll(STICKER_IMG_SEL);
    Array.prototype.forEach.call(imgs, function (img) {
      if (!img.getAttribute("src") && img.getAttribute("data-src")) { out.push(img); }
    });
    return out;
  }
  /* v120：批量解析收集到的待解析图片（异步 IndexedDB 读取，回调合并滚动） */
  function resolvePendingImgs(imgList) {
    if (!imgList || !imgList.length) { return; }
    Array.prototype.forEach.call(imgList, function (img) {
      var src = img.getAttribute("data-src") || "";
      if (!src) { img.style.display = "none"; return; }
      resolveImg(src, function (url) {
        if (url) { img.src = url; scheduleChatBottom(); } else { img.style.display = "none"; }
      });
    });
  }
  function loadStickerImgs(scope) {
    var imgs = (scope || document).querySelectorAll(STICKER_IMG_SEL);
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.getAttribute("src")) { return; } /* vXX：已解析过的跳过，避免增量扫描 box 时重复解析历史消息 */
      var src = img.getAttribute("data-src") || "";
      if (!src) { img.style.display = "none"; return; }
      resolveImg(src, function (url) { if (url) { img.src = url; scheduleChatBottom(); } else { img.style.display = "none"; } });
    });
  }
  /* v120：滚动到底部用 rAF 防抖合并 —— 多张图片异步加载完成时多次触发只合并为一次滚动 */
  var _chatScrollScheduled = false;
  function scheduleChatBottom() {
    if (_chatScrollScheduled) { return; }
    _chatScrollScheduled = true;
    requestAnimationFrame(function () {
      _chatScrollScheduled = false;
      scrollChatBottom();
    });
  }
  /* v120：对标拾心界「加载更早消息」按钮 HTML（置于消息列表顶部） */
  function historyLoaderHtml() {
    return '<div class="chat-history-loader" id="chatHistoryLoader" role="button" tabindex="0" title="加载更早消息">加载更早消息</div>';
  }
  function hideHistoryLoader(box) {
    var loader = (box || document).querySelector("#chatHistoryLoader");
    if (loader) { loader.style.display = "none"; }
  }
  /* v120：对标拾心界 _installHistoryLoaderScroll —— 滚动到顶自动加载更早（节流 400ms + 防重入），
     并在容器上做一次事件委托处理「加载更早消息」按钮点击 */
  function installHistoryLoaderScroll(box) {
    if (!box || box._historyScrollBound) { return; }
    box._historyScrollBound = true;
    var lastTrigger = 0;
    box.addEventListener("scroll", function () {
      if (_historyLoading) { return; }
      var now = Date.now();
      if (now - lastTrigger < 400) { return; }
      if (box.scrollTop <= 60) { lastTrigger = now; loadMoreHistory(); }
    });
    box.addEventListener("click", function (ev) {
      var t = ev.target;
      var loader = t && t.closest ? t.closest("#chatHistoryLoader") : null;
      if (!loader) { return; }
      ev.preventDefault();
      loadMoreHistory();
    });
  }
  /* v120：对标拾心界 loadMoreHistory —— 向前分批加载更早消息，隐藏容器 + 锚点滚动补偿 */
  function loadMoreHistory() {
    var box = document.getElementById("chatMessages");
    if (!box || _historyLoading) { return; }
    var c = loadChat(), list = c.messages[_msgMeta.partnerId] || [];
    var start = _msgMeta.start || 0;
    if (start <= 0) { hideHistoryLoader(box); return; }
    var newStart = Math.max(0, start - CHAT_HISTORY_BATCH);
    /* 连续转发聚合跨窗口边界：同样回退到连续段起点 */
    while (newStart > 0 && list[newStart - 1] && list[newStart - 1].msgType === "forward") { newStart--; }
    if (newStart >= start) { hideHistoryLoader(box); return; }
    _historyLoading = true;
    /* 锚点：当前可见的第一条消息（data-mid + 其相对视口顶部位置） */
    var rows = box.querySelectorAll(".chat-msg");
    var anchorId = null, anchorTop = 0, i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].offsetTop + rows[i].offsetHeight >= box.scrollTop) {
        anchorId = rows[i].getAttribute("data-mid");
        anchorTop = rows[i].getBoundingClientRect().top;
        break;
      }
    }
    var oldScrollHeight = box.scrollHeight;
    var set = loadSettings();
    var cache = buildRenderCache(_msgMeta.partnerId);
    var html = "", m, k;
    for (i = newStart; i < start; i++) {
      m = list[i];
      if (m.msgType === "forward") {
        var grp = [m];
        k = i + 1;
        while (k < list.length && list[k].msgType === "forward") { grp.push(list[k]); k++; }
        html += fwdCardHtml(grp, _msgMeta.partnerId, set, m.type === "self", cache);
        i = k - 1;
        continue;
      }
      var h = msgHtml(m, _msgMeta.partnerId, set, m.type === "self", cache);
      if (h) { html += h; }
    }
    _msgMeta.start = newStart;
    var loader = box.querySelector("#chatHistoryLoader");
    var prevVisibility = box.style.visibility;
    var prevOverflow = box.style.overflow;
    box.style.visibility = "hidden";
    box.style.overflow = "hidden";
    if (loader) { loader.insertAdjacentHTML("afterend", html); }
    else { box.insertAdjacentHTML("afterbegin", html); }
    box.scrollTop = box.scrollTop + (box.scrollHeight - oldScrollHeight);
    requestAnimationFrame(function () {
      if (anchorId) {
        var na = box.querySelector('.chat-msg[data-mid="' + anchorId + '"]');
        if (na) { box.scrollTop += (na.getBoundingClientRect().top - anchorTop); }
      }
      /* 发热优化 P1-3：恢复可见性与锚点微调合并到同一帧（原为双 rAF），
         减少一帧等待，功能等价：微调完成后再恢复 visibility */
      box.style.visibility = prevVisibility || "";
      box.style.overflow = prevOverflow || "";
      if (newStart <= 0) { hideHistoryLoader(box); }
      _historyLoading = false;
    });
  }
  /* 滚到底部（增强版）：先强制同步布局并立即滚底；再扫描未完成图片
   * （data-src 异步加载 / 正在加载的 src）绑定 load/error 回调补滚；
   * 再用 requestAnimationFrame 在回流后补滚一次；设 img.src 后由调用方
   * 再触发一次（见 loadStickerImgs）。覆盖修复聊天记录过多后新消息
   * 不显示/不滚到底的问题。
   * 旧实现保留语义不删，仅整体覆盖为更健壮的版本。 */
  function scrollChatBottom() {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    /* 1) 立即滚到底：设置 scrollTop 时读取 scrollHeight 已含一次必要布局，
     *    不再额外 void box.offsetHeight 强制同步布局（v120 移除多余重排） */
    box.scrollTop = box.scrollHeight;
    /* 2) 扫描容器内未完成图片（data-src 异步加载 / 正在加载的 src），
     *    绑定 load/error 回调，加载完成后补滚到底 */
    var pending = box.querySelectorAll("img[data-src], img[src]");
    Array.prototype.forEach.call(pending, function (img) {
      var waitingSrc = img.hasAttribute("data-src") && !img.getAttribute("src");
      var stillLoading = img.getAttribute("src") && !img.complete;
      if (!waitingSrc && !stillLoading) { return; }
      if (img._scrollBound) { return; }
      img._scrollBound = true;
      var done = function () {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
        img._scrollBound = false;
        var b = document.getElementById("chatMessages");
        if (b) { b.scrollTop = b.scrollHeight; }
      };
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });
    /* 3) rAF 回流后补滚一次：innerHTML 全量重绘后布局可能尚未稳定 */
    requestAnimationFrame(function () {
      var b = document.getElementById("chatMessages");
      if (b) { b.scrollTop = b.scrollHeight; }
    });
  }

  /* ---------- 发送 / 已读 / 自动回复 ---------- */
  function sendMessage() {
    if (!state.partnerId) { return; }
    var inp = document.getElementById("chatInput");
    var text = inp ? String(inp.value || "").replace(/^\s+|\s+$/g, "") : "";
    if (!text) { return; }
    if (inp) { inp.value = ""; }
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "text", text: text, time: now(), read: false };
    if (window.__chatQuote && window.__chatQuote.mid) { msg.quote = window.__chatQuote; window.__chatQuote = null; if (window.__chatQuoteDismiss) { window.__chatQuoteDismiss(); } }
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, text, now());
    triggerEffectForText(text); /* 关键词命中触发满屏特效 */
    renderMessages(state.partnerId, true);
    chatPlaySend();
    refreshFlameDisplay(); /* 发消息后立即刷新火苗与连续天数 */
    scheduleReadReceipt(msg.id);
    scheduleReply();
    maybeTriggerIncomingByKeyword(text);
    updateSendBtn(); /* 输入已清空：发送键收起，加号键恢复 */
  }

  /* ---------- 图片 / 继续发送 / 屏幕常亮（v97 加号面板真实功能） ---------- */
  /* 写雪晶媒体库 IndexedDB：mediaKey -> dataURL，返回 Promise<mediaKey|null> */
  function mediaWrite(key, dataURL) {
    if (!key || !dataURL || !window.indexedDB) { return Promise.resolve(null); }
    return new Promise(function (resolve) {
      var req;
      try { req = window.indexedDB.open(MEDIA_DB, 1); } catch (e) { resolve(null); return; }
      req.onerror = function () { resolve(null); };
      req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains(MEDIA_STORE)) { db.createObjectStore(MEDIA_STORE, { keyPath: "key" }); } };
      req.onsuccess = function () {
        var db = req.result;
        try {
          var tx = db.transaction(MEDIA_STORE, "readwrite");
          tx.objectStore(MEDIA_STORE).put({ key: key, data: dataURL, ts: Date.now() });
          tx.oncomplete = function () { resolve(key); };
          tx.onerror = function () { resolve(null); };
          tx.onabort = function () { resolve(null); };
        } catch (e) { resolve(null); }
      };
    });
  }
  /* 生成 m_ 开头唯一 mediaKey（仿 data-manager.js mediaNewKey） */
  function mediaNewKey() {
    return "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  /* 图片压缩：最长边上限 maxSide，JPEG quality 0.85；原图为 PNG 时保留 PNG 避免透明丢失 */
  function compressImageDataURL(dataURL, maxSide) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.width, h = img.height, m = Math.max(w, h);
          var scale = m > maxSide ? maxSide / m : 1;
          var nw = Math.max(1, Math.round(w * scale));
          var nh = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = nw; canvas.height = nh;
          var ctx = canvas.getContext("2d");
          var isPng = /^data:image\/png/i.test(dataURL);
          if (!isPng) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, nw, nh); }
          ctx.drawImage(img, 0, 0, nw, nh);
          resolve(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
        } catch (e) { resolve(dataURL); }
      };
      img.onerror = function () { resolve(dataURL); };
      img.src = dataURL;
    });
  }
  /* 加号面板「图片」：选图 -> 压缩 -> 存 IndexedDB -> 发图片消息 */
  function sendImage() {
    if (!state.partnerId) { return; }
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) { if (input.parentNode) { input.parentNode.removeChild(input); } return; }
      var reader = new FileReader();
      reader.onload = function () {
        var dataURL = String(reader.result || "");
        compressImageDataURL(dataURL, (window.XJ_CAP ? XJ_CAP.chatImgMax() : 1280)).then(function (compressed) {
          return mediaWrite(mediaNewKey(), compressed);
        }).then(function (mediaKey) {
          if (!mediaKey) { wcToast("图片保存失败"); return; }
          var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "image", img: mediaKey, time: now(), read: false };
          pushMsg(state.partnerId, msg);
          setLast(state.partnerId, "[图片]", now());
          /* vXX：预热图片缓存，增量渲染即时出图（与表情包发送同策略） */
          try { _chatMediaPut(mediaKey, compressed); } catch (e) { /* ignore */ }
          renderMessages(state.partnerId, true);
          chatPlaySend();
          refreshFlameDisplay();
          scheduleReadReceipt(msg.id);
          updateSendBtn();
        });
      };
      reader.onerror = function () { wcToast("图片读取失败"); };
      reader.readAsDataURL(file);
      if (input.parentNode) { input.parentNode.removeChild(input); }
    });
    input.click();
  }
  /* 加号面板「继续发送」：点击后触发对方立即继续发送消息（复用自动回复机制，跳过随机延迟） */
  function continueSend() {
    if (!state.partnerId) { return; }
    clearReplyTimer();
    doAutoReply(state.partnerId);
    var inp = document.getElementById("chatInput");
    if (inp) { inp.focus(); }
  }
  /* 屏幕常亮激活态 UI：is-active + label 文案 */
  function setKeepAwakeUI(on) {
    var btn = document.getElementById("chatKeepAwakeBtn");
    if (!btn) { return; }
    if (on) { btn.classList.add("is-active"); } else { btn.classList.remove("is-active"); }
    var lab = btn.querySelector(".moon-item-label");
    if (lab) { lab.textContent = on ? "屏幕常亮中" : "屏幕常亮"; }
  }
  /* 屏幕常亮持久化键：刷新 / 重新打开页面后按开关状态自动恢复 */
  var KEEP_AWAKE_KEY = "snowcrystal.chat.keepScreenOn";
  /* 请求屏幕常亮（wakeLock）：成功持有后监听系统释放并自动重获；
     silent=true 用于自动重获 / 页面加载恢复，失败不弹打扰性 toast */
  function requestKeepScreenOn(silent) {
    if (state.wakeLockBusy) { return Promise.resolve(false); }
    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
      if (!silent) { wcToast("当前环境不支持屏幕常亮，需在 HTTPS 或本地部署下使用"); }
      return Promise.resolve(false);
    }
    state.wakeLockBusy = true;
    return navigator.wakeLock.request("screen").then(function (lock) {
      /* 核心修复①：监听 sentinel release —— 无论系统释放（页面 hidden /
         浏览器策略 / 失焦）还是主动释放，都把句柄置空，并按需自动重获 */
      lock.addEventListener("release", function () {
        if (state.wakeLock !== lock) { return; }
        state.wakeLock = null;
        /* 非用户主动关闭且页面可见时自动重获，避免开启后过一阵熄屏 */
        if (state.keepScreenOn && document.visibilityState === "visible") {
          requestKeepScreenOn(true);
        }
      });
      state.keepScreenOn = true;
      state.wakeLock = lock;
      setKeepAwakeUI(true);
      lsSet(KEEP_AWAKE_KEY, true);
      if (!silent) { wcToast("屏幕保持常亮"); }
      return true;
    })["catch"](function () {
      if (!silent) { wcToast("屏幕常亮开启失败"); }
      return false;
    })["finally"](function () {
      state.wakeLockBusy = false;
    });
  }
  /* 加号面板「屏幕常亮」：切换 wakeLock */
  function toggleKeepScreenOn() {
    if (state.keepScreenOn && state.wakeLock) {
      /* 主动关闭：先置关闭意图并清句柄，再 release，
         release 事件回调看到 keepScreenOn=false 不会误自动重获 */
      state.keepScreenOn = false;
      var lock = state.wakeLock;
      state.wakeLock = null;
      setKeepAwakeUI(false);
      lsSet(KEEP_AWAKE_KEY, false);
      lock.release().then(function () {
        wcToast("已关闭屏幕常亮");
      })["catch"](function () {
        wcToast("已关闭屏幕常亮");
      });
      return;
    }
    requestKeepScreenOn();
  }
  /* 核心修复②：页面重新可见且常亮开启但句柄已被释放（release 回调已置空）
     时，自动重新请求；与 release 回调形成双重保险 */
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && state.keepScreenOn && !state.wakeLock) {
      requestKeepScreenOn(true);
    }
  });

  function scheduleReadReceipt(msgId) {
    var delay = randInt(3000, 10000);
    if (state.readTimers[msgId]) { clearTimeout(state.readTimers[msgId]); }
    state.readTimers[msgId] = setTimeout(function () {
      var c = loadChat(), list = c.messages[state.partnerId] || [], i, changed = false;
      for (i = list.length - 1; i >= 0; i--) {
        if (list[i].id === msgId && list[i].type === "self" && !list[i].read) { list[i].read = true; changed = true; break; }
      }
      if (changed) { saveChat(c); renderMessages(state.partnerId); }
      delete state.readTimers[msgId];
    }, delay);
  }

  /* 对方回复调度：改为全局常驻调度（不依赖聊天室激活态），
     离开聊天室 / 切到任意页面后已排定的回复仍会按时到达 */
  function scheduleReply() {
    var partnerId = state.partnerId;
    if (!partnerId) { return; }
    globalScheduleReply(partnerId);
  }
  function globalScheduleReply(partnerId) {
    if (!partnerId) { return; }
    var set = loadSettings();
    var delay = randInt(set.replyMin || 30, set.replyMax || 120) * 1000;
    clearGlobalReply(partnerId);
    state.globalReplyTimers[partnerId] = setTimeout(function () {
      delete state.globalReplyTimers[partnerId];
      if (document.hidden) {
        /* v12.4：后台隐藏期间到期不丢弃 —— 挂起到 pendingReply，回前台由可见性恢复统一补发，
           修复「发消息后切后台，对方回复永久丢失」 */
        state.pendingReply[partnerId] = true;
        return;
      }
      try { doAutoReply(partnerId); }
      catch (e) { try { replyFallbackText(partnerId); } catch (e2) { /* 兜底失败不再重试 */ } }
    }, delay);
  }
  function clearGlobalReply(partnerId) {
    if (partnerId && state.globalReplyTimers[partnerId]) {
      clearTimeout(state.globalReplyTimers[partnerId]);
      delete state.globalReplyTimers[partnerId];
    }
  }
  function clearReplyTimer() {
    if (state.replyTimer) { clearTimeout(state.replyTimer); state.replyTimer = null; }
  }

  function doAutoReply(partnerId) {
    try {
    if (document.hidden) { return; } /* 发热专项：隐藏竞态防御，确保后台不产生任何渲染/落盘 */
    var set = loadSettings();
    var prob = loadProb();
    var mix = set.mixSwitch || {};
    var r = function () { return Math.random() * 100; };
    var my = loadMy();
    var partners = loadPartners(), i, p = null;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { p = partners[i]; break; } }
    var pName = (p && p.name) || "对方";
    var myName = my.name || "我方";

    /* 对方转发：低概率从历史对方消息挑一条「转发」过来（对标拾心界 partnerForward） */
    if (r() < Number(set.forward) || 0) {
      /* 放开转发：红包/拍一拍/通知/问答均可被对方转发，仅排除转发消息本身（避免无限嵌套） */
      var hist = (loadChat().messages[partnerId] || []).filter(function (m) { return m.type === "other" && m.msgType !== "forward"; });
      var fm = pick(hist);
      if (fm) {
        var fwdMsg = { msgType: "forward", text: fm.text || "", img: fm.img || "", voice: fm.voice || "", voiceDur: fm.voiceDur || 0, origType: fm.msgType || "" };
        if (fm.msgType === "qa" || fm.innerType === "qa") {
          fwdMsg.innerType = "qa";
          fwdMsg.q = fm.q || "";
          fwdMsg.opts = (fm.opts || []).slice();
          fwdMsg.multi = !!fm.multi;
          fwdMsg.picked = (fm.picked || []).slice();
          fwdMsg.pickedBy = fm.pickedBy || "";
          fwdMsg.status = fm.status || "done";
        } else if (fm.msgType === "redpack") {
          fwdMsg.amount = fm.amount || 0; fwdMsg.wish = fm.wish || ""; fwdMsg.opened = !!fm.opened; fwdMsg.text = "[红包]";
        } else if (fm.msgType === "pat") {
          fwdMsg.text = fm.text || "[拍一拍]";
        } else if (fm.msgType === "call" || fm.isCall) {
          fwdMsg.text = fm.text || "[通知]";
        } else if (fm.isRecall) {
          fwdMsg.text = fm.text || fm.recallText || "[通知]";
        }
        pushOther(partnerId, fwdMsg); return;
      }
    }

    /* v9：对方红包混入 —— 对方回复时可能直接发一个红包过来（节奏设置开关 + 概率设置概率）
       v101.5：金额无上限（特殊数字/小额/大额按比例随机）
       防崩溃：金额/祝词生成异常时降级继续，不阻断整条回复链路 */
    if (mix.redpack !== false && (r() < Number(prob.redpack) || 0)) {
      try {
        var rpAmount = rpOtherAmount();
        var rpWish = pick(REDPACK_WISHES) || "小小心意";
        pushOther(partnerId, { msgType: "redpack", amount: rpAmount, wish: rpWish });
        return;
      } catch (e) { /* 红包分支异常：降级走下方基础回复 */ }
    }

    /* v102：问答混入 —— 对方回复时从问答库取一条模板发问答让你选择
       （节奏设置「问答」开关 + 概率设置「问答混入概率」控制） */
    if (mix.qa && (r() < Number(prob.qa) || 0)) {
      try {
        var qaTpl = qaPickRandom();
        if (qaTpl && qaTpl.q && (qaTpl.opts || []).length >= 2) {
          pushOther(partnerId, { msgType: "qa", q: qaTpl.q, opts: qaTpl.opts.slice(), multi: !!qaTpl.multi });
          return;
        }
      } catch (e) { /* 问答分支异常：降级走下方基础回复 */ }
    }

    /* v91：语音字卡混入（对标拾心界 _maybeSendVoiceAutoReply）——
       从语音字卡库随机取一条，异步取回音频后发送语音消息；取回失败时兜底发基础字卡。
       防崩溃：语音库/音频读取异常时降级继续，不阻断整条回复链路 */
    if (mix.voice && (r() < Number(prob.voice) || 0)) {
      try {
        var vc = voicePickRandom();
        if (vc) {
          soundGet(vc.audioKey).then(function (dataUrl) {
            if (dataUrl) { pushOther(partnerId, { msgType: "voice", voice: dataUrl, voiceDur: vc.dur, voiceText: vc.name }); }
            else { replyFallbackText(partnerId); }
          })["catch"](function () { replyFallbackText(partnerId); });
          return;
        }
      } catch (e) { /* 语音分支异常：降级走下方基础回复 */ }
    }

    /* 拍一拍 */
    if (mix.pat && (r() < Number(prob.pat) || 0)) {
      try {
        var pat = pick(patItems());
        if (pat) {
          var patText = String(textOf(pat)).replace(/「我方」|"我方"|我方/g, myName).replace(/「对方」|"对方"|对方/g, pName);
          pushOther(partnerId, { msgType: "pat", text: patText });
          return;
        }
      } catch (e) { /* 拍一拍分支异常：降级走下方基础回复 */ }
    }

    /* 表情包（整条图片） */
    if (mix.sticker && (r() < Number(prob.sticker) || 0)) {
      try {
        var st = pick(stickerItems());
        if (st && stickerItemImg(st)) { pushOther(partnerId, { msgType: "sticker", img: stickerItemImg(st) }); return; }
      } catch (e) { /* 表情包分支异常：降级走下方基础回复 */ }
    }

    /* 基础字卡：字卡库有字卡时取一条作为基础文案；
       字卡库为空时不发内置文案，直接继续走下方 Emoji / 颜文字混入（命中即发），未命中则保持沉默 */
    var mains = mainItems();
    var base = mains.length ? String(textOf(pick(mains)) || "") : "";
    var _subBase = false;

    /* 副字卡混入（角色专属）：开启且命中概率时，优先用当前角色的副字卡作为基础文案；
       副字卡只允许对应角色发出，绝不跨角色串联 */
    if (mix.subcard && (r() < Number(prob.subcard) || 0)) {
      var subTxt = subPickFor(partnerId);
      if (subTxt) { base = String(textOf(subTxt) || ""); _subBase = true; }
    }

    /* 字卡混入（拼字卡）：按设置的条数与连接符号拼接（仅基础字卡存在时触发，副字卡基础不拼） */
    if (base && !_subBase && mix.card && (r() < Number(prob.card) || 0)) {
      var cMin = Math.max(1, Math.round(Number(set.cardMin) || 2));
      var cMax = Math.max(cMin, Math.round(Number(set.cardMax) || 3));
      var total = randInt(cMin, cMax); /* 拼接总张数（含基础字卡） */
      var extra = total - 1, k, parts = [base], it, tx;
      var sep = set.cardSep || "，";
      for (k = 0; k < extra; k++) {
        it = pick(mains);
        tx = String(textOf(it) || "");
        if (tx) { parts.push(tx); }
      }
      base = parts.join(sep);
    }

    /* Emoji 混入：有基础文案时追加后缀；字卡库为空时可直接作为回复内容发送。
       自身库为空时回退内置 Emoji（WCL_DEFAULT），保证字卡库为空时仍有料可发 */
    if (mix.emoji && (r() < Number(prob.emoji) || 0)) {
      var emArr = emojiItems();
      if (!emArr.length && WCL_DEFAULT.emoji) { emArr = flatten(WCL_DEFAULT.emoji); }
      var em = pick(emArr);
      if (em != null) { base = base ? base + " " + String(textOf(em)) : String(textOf(em)); }
    }

    /* 颜文字混入：有基础文案时追加后缀；字卡库为空时可直接作为回复内容发送。
       自身库为空时回退内置颜文字（WCL_DEFAULT），保证字卡库为空时仍有料可发 */
    if (mix.kao && (r() < Number(prob.kao) || 0)) {
      var kaArr = kaoItems();
      if (!kaArr.length && WCL_DEFAULT.kao) { kaArr = flatten(WCL_DEFAULT.kao); }
      var ka = pick(kaArr);
      if (ka != null) { base = base ? base + " " + String(textOf(ka)) : String(textOf(ka)); }
    }

    /* 引用消息：按概率引用我方最近一条文本消息（需开启「允许对方引用消息」） */
    var quoteRef = null;
    if (set.allowQuote !== false && mix.quote && (r() < Number(prob.quote) || 0)) {
      var msgs = (loadChat().messages[partnerId] || []);
      var jj;
      for (jj = msgs.length - 1; jj >= 0; jj--) {
        if (msgs[jj] && msgs[jj].type === "self" && !msgs[jj].isRecall && msgs[jj].msgType !== "pat" && msgs[jj].text) {
          quoteRef = { mid: msgs[jj].id || "", from: myName, text: String(msgs[jj].text).slice(0, 40) };
          break;
        }
      }
    }
    /* 无任何可发送内容（字卡库为空且 Emoji / 颜文字混入均未命中）时
       使用内置兜底文案回复，避免「继续发送/自动回复完全沉默」 */
    if (!String(base || "").replace(/^\s+|\s+$/g, "")) {
      replyFallbackText(partnerId);
      return;
    }
    pushOther(partnerId, { msgType: "text", text: base, quote: quoteRef });
    } catch (e) {
      /* v12.4：顶层异常兜底 —— 单条回复生成/发送异常时降级发基础文案，绝不崩断调用方链路 */
      try { replyFallbackText(partnerId); } catch (e2) { /* 忽略 */ }
    }
  }

  function pushOther(partnerId, m) {
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "other", msgType: m.msgType, time: now() };
    if (m.msgType === "sticker") { msg.img = m.img || ""; msg.text = "[表情包]"; }
    else if (m.msgType === "forward") {
      msg.text = m.text || ""; msg.img = m.img || ""; msg.origType = m.origType || "";
      if (m.voice) { msg.voice = m.voice || ""; msg.voiceDur = m.voiceDur || 0; }
      if (m.innerType === "qa") {
        msg.innerType = "qa"; msg.q = m.q || ""; msg.opts = (m.opts || []).slice(); msg.multi = !!m.multi;
        msg.picked = (m.picked || []).slice(); msg.pickedBy = m.pickedBy || ""; msg.status = m.status || "done";
      } else if (m.origType === "redpack") {
        msg.amount = m.amount || 0; msg.wish = m.wish || ""; msg.opened = !!m.opened;
      }
    }
    else if (m.msgType === "voice") { msg.voice = m.voice || ""; msg.voiceDur = m.voiceDur || 0; msg.voiceText = m.voiceText || ""; msg.text = "[语音]"; }
    else if (m.msgType === "redpack") { msg.amount = m.amount || 0; msg.wish = m.wish || ""; msg.text = "[红包]"; }
    else if (m.msgType === "qa") { msg.q = m.q || ""; msg.opts = (m.opts || []).slice(); msg.multi = !!m.multi; msg.status = "pending"; msg.picked = []; msg.pickedBy = ""; msg.text = "[问答]"; }
    else { msg.text = m.text || ""; }
    if (m.quote) { msg.quote = m.quote; }
    pushMsg(partnerId, msg);
    setLast(partnerId, msgText(msg), now());
    renderMessages(partnerId, true);
    chatPlayReceive();
    maybeNotifyIncoming(partnerId, msg);
    /* 心动数字与旧火苗计数已移除：火苗点亮仅由自己当天发送消息决定 */
  }

  /* ---------- 主动发送：全局常驻消息引擎（不依赖聊天室激活态） ---------- */
  /* 挑选本次主动消息的接收方：聊天室内用当前会话；否则随机挑选一个角色 */
  function pickEnginePartner() {
    if (state.partnerId) {
      var partners0 = loadPartners(), i;
      for (i = 0; i < partners0.length; i++) { if (partners0[i].id === state.partnerId) { return state.partnerId; } }
    }
    var list = loadPartners();
    if (list && list.length) { return list[Math.floor(Math.random() * list.length)].id; }
    var c = loadChat();
    var keys = c && c.messages ? Object.keys(c.messages) : [];
    return keys.length ? keys[Math.floor(Math.random() * keys.length)] : "";
  }
  function startProactive(immediateFirst) {
    var set = loadSettings();
    if (!set.proactive) { stopProactive(); return false; }
    /* v12.4：收敛为健壮生命周期链路 —— startProactive 为强制重启入口
       （页面加载/开关开启/间隔修改均走此路径，内部先停后起保证幂等） */
    stopProactive();
    var interval = Math.max(1, Number(set.proactiveInterval) || 120) * 1000;
    var firstDelay = immediateFirst ? Math.min(interval, 5000) : interval;
    state.engineStarted = true;
    state._proactiveNextAt = Date.now() + firstDelay;
    state.globalProactiveTimer = setTimeout(proactiveTick, Math.max(1, Math.min(firstDelay, PROACTIVE_MAX_MS)));
    return true;
  }
  /* 幂等启动：引擎已运行时不动（用于可见性恢复等自愈场景）；未运行时以短延迟首触发补启动 */
  function ensureProactiveEngine() {
    if (!loadSettings().proactive) { stopProactive(); return false; }
    if (state.engineStarted && state.globalProactiveTimer) { return true; }
    return startProactive(true);
  }
  function stopProactive() {
    if (state.globalProactiveTimer) { clearTimeout(state.globalProactiveTimer); state.globalProactiveTimer = null; }
    state.engineStarted = false;
  }
  /* v12.4：主动引擎心跳 —— 递归 setTimeout + 时间戳调度。
     关键修复：hidden 期间仍重排下一次，递归链永不因隐藏断裂；
     后台由浏览器节流 setTimeout，回前台自然恢复节奏；
     engineStarted 为唯一运行意图标志，stopProactive 置 false 后 tick 立即自停 */
  function proactiveTick() {
    if (!state.engineStarted) { state.globalProactiveTimer = null; return; } /* 已停止 */
    var set = loadSettings();
    var interval = Math.max(1, Number(set.proactiveInterval) || 120) * 1000;
    if (!document.hidden) {
      var pid = pickEnginePartner();
      if (pid) {
        try { doAutoReply(pid); }
        catch (e) { try { replyFallbackText(pid); } catch (e2) { /* 忽略 */ } }
      }
    }
    var nowMs = Date.now();
    if (!state._proactiveNextAt || state._proactiveNextAt < nowMs) { state._proactiveNextAt = nowMs + interval; }
    else { state._proactiveNextAt += interval; }
    var d = state._proactiveNextAt - Date.now();
    state.globalProactiveTimer = setTimeout(proactiveTick, Math.max(1, Math.min(d, PROACTIVE_MAX_MS)));
  }
  var PROACTIVE_MAX_MS = 2147483647;
  /* 可见性联动 v12.4：隐藏期间不实际发送（tick 自行判断），无需清定时器；
     回前台自愈恢复（引擎链若意外断裂立即补启动）+ 统一补发隐藏期间到期的挂起回复。
     双保险监听：19 引擎广播（xj-ve:visible）+ 原生 visibilitychange，任一丢失都能恢复。 */
  if (!document.__xjVeProactiveBound2) {
    document.__xjVeProactiveBound2 = true;
    var _proactiveResume = function () {
      if (document.hidden) { return; }
      try {
        if (loadSettings().proactive) { ensureProactiveEngine(); }
        var k;
        for (k in state.pendingReply) {
          if (Object.prototype.hasOwnProperty.call(state.pendingReply, k) && state.pendingReply[k]) {
            delete state.pendingReply[k];
            try { doAutoReply(k); } catch (e) { try { replyFallbackText(k); } catch (e2) { /* 忽略 */ } }
          }
        }
      } catch (e) { /* 忽略 */ }
    };
    document.addEventListener("xj-ve:visible", _proactiveResume);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { _proactiveResume(); } });
    /* 初始自愈：页面加载即可见且引擎未起（如脚本时序异常）时补启动 */
    if (!document.hidden) { setTimeout(_proactiveResume, 0); }
  }
  function stopAllTimers() {
    clearReplyTimer();
    /* 通话计时器/通话状态与聊天室解耦：离开聊天室不挂断进行中的通话 */
    var k;
    for (k in state.readTimers) { if (Object.prototype.hasOwnProperty.call(state.readTimers, k)) { clearTimeout(state.readTimers[k]); } }
    state.readTimers = {};
    /* 注意：全局常驻引擎（globalProactiveTimer / globalReplyTimers）不受聊天室开关影响，
       离开聊天室后消息接收照常进行 */
  }

  /* ---------- 后台保活：静音音频循环播放，防止页面被挂起 ---------- */
  function startKeepAlive() {
    stopKeepAlive();
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { return; }
    try {
      var ctx = new Ctx();
      var sr = ctx.sampleRate || 44100;
      var len = Math.max(1, Math.floor(sr * 0.25)); /* 250ms 静音 buffer（发热专项：对标拾心界，全 0 无需写样本） */
      var buf = ctx.createBuffer(1, len, sr);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var gain = ctx.createGain();
      gain.gain.value = 0.15; /* 源振幅 0.00015 * 0.15 ≈ 2.25e-5，远低于听阈 */
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      state.keepAliveCtx = ctx;
      state.keepAliveSrc = src;
      state.keepAliveGain = gain;
      if (ctx.state === "suspended") {
        try { ctx.resume(); } catch (e) { /* 无手势被挂起，等首次交互解锁 */ }
      }
      ensureKeepAliveGestureUnlock();
      bindKeepAliveVisibility();
      /* 发热优化 P1-1：脉冲式保活 —— 播 250ms 静音后挂起整个 AudioContext
         25s，再唤醒续播 250ms，循环往复。与原先「持续空转音频图」相比，
         25s 内音频引擎完全挂起，空闲/后台 CPU 占用显著下降；
         保活语义不变（周期性唤醒保持页面不被挂起）。 */
      state.keepAlivePulseTimer = setTimeout(function keepAliveSuspend() {
        if (!state.keepAliveCtx) { return; }
        try { state.keepAliveCtx.suspend(); } catch (e) { /* 忽略 */ }
        state.keepAlivePulseTimer = setTimeout(function keepAliveWake() {
          if (!state.keepAliveCtx) { return; }
          try { state.keepAliveCtx.resume(); } catch (e) { /* 忽略 */ }
          state.keepAlivePulseTimer = setTimeout(keepAliveSuspend, 250);
        }, 25000);
      }, 250);
    } catch (e) { /* 保活启动失败不影响聊天 */ }
  }
  function stopKeepAlive() {
    if (state.keepAlivePulseTimer) { clearTimeout(state.keepAlivePulseTimer); state.keepAlivePulseTimer = null; }
    try { if (state.keepAliveSrc) { state.keepAliveSrc.stop(); state.keepAliveSrc.disconnect(); } } catch (e) {}
    try { if (state.keepAliveGain) { state.keepAliveGain.disconnect(); } } catch (e) {}
    try { if (state.keepAliveCtx) { state.keepAliveCtx.close(); } } catch (e) {}
    state.keepAliveSrc = null;
    state.keepAliveGain = null;
    state.keepAliveCtx = null;
  }
  function ensureKeepAliveGestureUnlock() {
    if (state.keepAliveUnlockBound) { return; }
    state.keepAliveUnlockBound = true;
    var unlock = function () {
      state.keepAliveUnlockBound = false;
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
      if (state.keepAliveCtx && state.keepAliveCtx.state === "suspended") {
        try { state.keepAliveCtx.resume(); } catch (e) { /* 忽略 */ }
      }
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock);
  }
  function bindKeepAliveVisibility() {
    if (document.__xjKeepAliveVisBound) { return; }
    document.__xjKeepAliveVisBound = true;
    document.addEventListener("visibilitychange", function () {
      /* 回到可见时若保活音频被挂起则恢复播放；后台隐藏期间 AudioContext 继续播放即可保活 */
      if (!document.hidden && state.keepAliveCtx && state.keepAliveCtx.state === "suspended") {
        try { state.keepAliveCtx.resume(); } catch (e) { /* 忽略 */ }
      }
    });
  }
  /* 发热专项：后台隐藏时停止保活音频，让浏览器可正常挂起页面（CSS 动画/定时器全停，后台零占用）；
     回前台按设置恢复保活。功能不受影响：主动消息引擎已在隐藏时暂停，回前台按原节奏继续。 */
  if (!document.__xjVeKeepAliveBound) {
    document.__xjVeKeepAliveBound = true;
    document.addEventListener("xj-ve:hidden", function () {
      if (state.keepAliveCtx) { stopKeepAlive(); }
    });
    document.addEventListener("xj-ve:visible", function () {
      try {
        if (loadSettings().keepAlive && !state.keepAliveCtx) { startKeepAlive(); }
      } catch (e) { /* 忽略 */ }
    });
  }

  /* ---------- 新消息顶部通知栏（任意页面可见） ---------- */
  /* 通知权限引导：navigator.permissions 检查 + requestPermission 申请 */
  function ensureNotifyPermission() {
    if (!window.Notification) { return; }
    if (Notification.permission === "granted" || Notification.permission === "denied") { return; }
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "notifications" }).then(function (st) {
          if (st && st.state === "prompt" && Notification.permission === "default") {
            try { Notification.requestPermission(); } catch (e) { /* 忽略 */ }
          }
        }).catch(function () {
          try { Notification.requestPermission(); } catch (e) { /* 忽略 */ }
        });
      } else {
        try { Notification.requestPermission(); } catch (e) { /* 忽略 */ }
      }
    } catch (e) {
      try { Notification.requestPermission(); } catch (e2) { /* 忽略 */ }
    }
  }
  function findPartner(partnerId) {
    var partners = loadPartners(), i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { return partners[i]; } }
    return null;
  }
  function maybeNotifyIncoming(partnerId, msg) {
    try {
      var set = loadSettings();
      if (!set.notifyBar && !set.bgNotify) { return; }
      var p = findPartner(partnerId);
      var name = p && p.name ? p.name : "对方";
      var text = msgText(msg) || "[新消息]";
      var roomActive = false;
      var roomPage = document.querySelector('.page[data-page="chat-room"]');
      if (roomPage) { roomActive = roomPage.classList.contains("is-active"); }
      /* 正停留在该会话聊天室且页面可见：消息已在聊天流中，不弹任何提醒 */
      if (!document.hidden && state.partnerId === partnerId && roomActive) { return; }
      /* 后台（页面 hidden）：走浏览器系统通知；未授权引导申请，并排队顶栏回前台可见 */
      if (document.hidden) {
        if (set.bgNotify && window.Notification) {
          if (Notification.permission === "granted") {
            try {
              var n = new Notification(name, { body: text, tag: "xj-" + partnerId, icon: p && p.avatar ? p.avatar : undefined });
              n.onclick = function () { try { window.focus(); } catch (e) {} jumpFromNotify(partnerId); n.close(); };
              return; /* 已用系统通知提醒，不重复排队顶栏 */
            } catch (e) { /* 创建失败回退顶栏排队 */ }
          } else if (Notification.permission === "default") {
            ensureNotifyPermission(); /* 未决状态：后台收到消息时引导申请 */
          }
        }
        queueNotifyBar(partnerId, msg); /* 回前台后可见未读提醒 */
        return;
      }
      /* 前台：顶栏弹窗（仅非聊天室；聊天室已在上面 return） */
      if (set.notifyBar) { queueNotifyBar(partnerId, msg); }
    } catch (e) { /* 通知失败不影响聊天 */ }
  }
  function ensureNotifyBarEl() {
    var el = document.getElementById("xjNotifyBar");
    if (!el) {
      el = document.createElement("div");
      el.id = "xjNotifyBar";
      el.className = "xj-notify-bar";
      el.setAttribute("role", "alert");
      document.body.appendChild(el);
    }
    return el;
  }
  function queueNotifyBar(partnerId, msg) {
    state.notifyQueue.push({ partnerId: partnerId, msg: msg });
    if (!state.notifyShowing) { notifyNext(); }
  }
  function notifyNext() {
    if (!state.notifyQueue.length) { state.notifyShowing = false; hideNotifyBar(); return; }
    var item = state.notifyQueue.shift();
    showNotifyBarEl(item);
  }
  function showNotifyBarEl(item) {
    var el = ensureNotifyBarEl();
    var partnerId = item.partnerId;
    var partners = loadPartners();
    var p = null, i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === partnerId) { p = partners[i]; break; } }
    var name = p && p.name ? p.name : "对方";
    var text = msgText(item.msg) || "[新消息]";
    var avatarHtml = p && p.avatar
      ? '<img class="xj-notify-avatar-img" src="' + esc(p.avatar) + '" alt="">'
      : '<span class="xj-notify-avatar-ph">' + esc(String(name).slice(0, 1)) + "</span>";
    el.innerHTML =
      '<span class="xj-notify-avatar">' + avatarHtml + "</span>" +
      '<span class="xj-notify-body"><span class="xj-notify-name">' + esc(name) + "</span>" +
      '<span class="xj-notify-text">' + esc(text) + "</span></span>" +
      '<span class="xj-notify-close" title="关闭">×</span>';
    el.style.display = "flex";
    el.classList.remove("is-in");
    void el.offsetWidth; /* 强制 reflow 后触发滑入动画 */
    el.classList.add("is-in");
    el.onclick = function (ev) {
      if (ev && ev.target && ev.target.className === "xj-notify-close") {
        ev.stopPropagation();
        if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
        hideNotifyBar();
        state.notifyShowing = false;
        notifyNext();
        return;
      }
      jumpFromNotify(partnerId);
    };
    state.notifyShowing = true;
    if (state.notifyTimer) { clearTimeout(state.notifyTimer); }
    state.notifyTimer = window.setTimeout(function () {
      hideNotifyBar();
      notifyNext();
    }, 4000);
  }
  function hideNotifyBar() {
    var el = document.getElementById("xjNotifyBar");
    if (el) { el.classList.remove("is-in"); el.style.display = "none"; }
  }
  function jumpFromNotify(partnerId) {
    if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
    hideNotifyBar();
    state.notifyShowing = false;
    /* 清除该会话的剩余排队通知（视为已读），保留其它会话 */
    state.notifyQueue = state.notifyQueue.filter(function (it) { return it.partnerId !== partnerId; });
    if (partnerId) { openChatRoom(partnerId); }
    if (state.notifyQueue.length) { notifyNext(); }
  }

  /* ---------- 页面：聊天设置（分组入口，对标拾心界） ---------- */
  function openChatSettings() { switchPage("chat-settings"); renderChatSettings(); }
  function renderChatSettings() {
    var root = document.getElementById("chatSettingsWrap");
    if (!root) { return; }
    var set = loadSettings();
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatFeature()">' +
      '<span class="row-main"><span class="row-title">功能设置</span><span class="row-desc">已读显示 · 回车发送 · 时间戳</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatPace()">' +
      '<span class="row-main"><span class="row-title">节奏设置</span><span class="row-desc">回复速度 · 主动发送 · 混入开关</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatSound()">' +
      '<span class="row-main"><span class="row-title">音效设置</span><span class="row-desc">消息提示音 · 音量 · 音效预览</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openProbSettings()">' +
      '<span class="row-main"><span class="row-title">概率设置</span><span class="row-desc">表情包 / 颜文字 / Emoji / 字卡混入概率</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openEffectSettings()">' +
      '<span class="row-main"><span class="row-title">特效设置</span><span class="row-desc">关键词触发 · Emoji 掉落 · 烟花炸弹满屏特效</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatBg()">' +
      '<span class="row-main"><span class="row-title">后台设置</span><span class="row-desc">后台保活 · 新消息通知 · 后台系统通知</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      "</div>";
  }

  /* ---------- 页面：后台设置（后台保活 / 新消息通知 / 后台系统通知 收纳分组） ---------- */
  function openChatBg() { switchPage("chat-bg"); renderChatBg(); }
  function renderChatBg() {
    var set = loadSettings();
    var root = document.getElementById("chatBgWrap");
    if (!root) { return; }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">后台保活</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csKeepAlive"' + (set.keepAlive ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'keepAlive\',this.checked)"><span>开启后播放静音音频循环，防止后台被挂起掉线</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">新消息通知</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csNotifyBar"' + (set.notifyBar ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'notifyBar\',this.checked)"><span>非聊天页收到新消息时顶部弹通知栏</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">后台系统通知</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csBgNotify"' + (set.bgNotify ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'bgNotify\',this.checked)"><span>网页切到后台时浏览器弹系统通知提醒（未授权时自动引导申请）</span></label></article>' +
      "</div>";
  }

  /* ---------- 页面：特效设置（关键词触发 Emoji 满屏特效） ---------- */
  var EFFECT_TYPES = [
    { key: "fall", label: "从上往下飘" },
    { key: "rise", label: "从下往上飘" },
    { key: "boom", label: "烟花绽放" },
    { key: "bomb", label: "炸弹爆炸" }
  ];
  function openEffectSettings() { switchPage("effect-settings"); renderEffectSettings(); }
  function renderEffectSettings() {
    var set = loadSettings();
    var root = document.getElementById("effectSettingsWrap");
    if (!root) { return; }
    var rules = Array.isArray(set.effectRules) ? set.effectRules : [];
    var rows = "", i;
    for (i = 0; i < rules.length; i++) {
      var r = rules[i] || {};
      rows +=
        '<article class="row-card chat-set-row chat-effect-row">' +
        '<input class="lf-input chat-text ef-kw" type="text" maxlength="12" value="' + esc(r.kw || "") + '" placeholder="关键词" onchange="SnowCrystal.updateEffectRule(' + i + ',\'kw\',this.value)">' +
        '<input class="lf-input chat-text ef-em" type="text" maxlength="8" value="' + esc(r.emoji || "") + '" placeholder="Emoji" onchange="SnowCrystal.updateEffectRule(' + i + ',\'emoji\',this.value)">' +
        '<select class="ef-type" onchange="SnowCrystal.updateEffectRule(' + i + ',\'type\',this.value)">' + typeOptions(r.type || "fall") + '</select>' +
        '<button class="ef-del" type="button" onclick="SnowCrystal.delEffectRule(' + i + ')" aria-label="删除">×</button>' +
        '</article>';
    }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">关键词特效</span><label class="wc-line-toggle"><input type="checkbox" id="efEnabled"' + (set.effectEnabled ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'effectEnabled\',this.checked)"><span>发送消息命中关键词时触发满屏特效</span></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">掉落数量</span><input type="number" class="lf-input chat-text" id="efCount" min="10" max="120" value="' + (Number(set.effectCount) || 40) + '" onchange="SnowCrystal.chatSetEffectCount(this.value)"></article>' +
      "</div>" +
      '<div class="row-list">' + (rows || '<div class="chat-pat-empty">暂无规则，点击下方按钮添加</div>') + "</div>" +
      '<button class="ef-add-btn" type="button" onclick="SnowCrystal.addEffectRule()">+ 添加关键词</button>';
  }
  function typeOptions(v) {
    var s = "", i;
    for (i = 0; i < EFFECT_TYPES.length; i++) {
      s += '<option value="' + EFFECT_TYPES[i].key + '"' + (EFFECT_TYPES[i].key === v ? " selected" : "") + ">" + EFFECT_TYPES[i].label + "</option>";
    }
    return s;
  }
  function chatSetEffectCount(v) {
    var set = loadSettings();
    var maxC = (window.XJ_CAP ? XJ_CAP.effectMax() : 120);
    set.effectCount = Math.max(10, Math.min(maxC, Number(v) || 40));
    saveSettings(set);
    wcToast("已保存");
  }
  function updateEffectRule(i, field, val) {
    var set = loadSettings();
    var rules = Array.isArray(set.effectRules) ? set.effectRules.slice() : [];
    if (i >= rules.length) { return; }
    if (field === "kw") { rules[i].kw = String(val || "").slice(0, 12); }
    else if (field === "emoji") { rules[i].emoji = String(val || "").slice(0, 8) || "✨"; }
    else if (field === "type") { rules[i].type = val || "fall"; }
    set.effectRules = rules;
    saveSettings(set);
    wcToast("已保存");
  }
  function delEffectRule(i) {
    var set = loadSettings();
    var rules = Array.isArray(set.effectRules) ? set.effectRules.slice() : [];
    if (i < 0 || i >= rules.length) { return; }
    rules.splice(i, 1);
    set.effectRules = rules;
    saveSettings(set);
    renderEffectSettings();
    wcToast("已删除");
  }
  function addEffectRule() {
    var set = loadSettings();
    var rules = Array.isArray(set.effectRules) ? set.effectRules.slice() : [];
    rules.push({ kw: "", emoji: "✨", type: "fall" });
    set.effectRules = rules;
    saveSettings(set);
    renderEffectSettings();
    wcToast("已添加，填写关键词即可");
  }

  /* ---------- 特效执行：发送消息命中关键词触发 ---------- */
  function triggerEffectForText(text) {
    if (!text) { return; }
    var set = loadSettings();
    if (!set.effectEnabled) { return; }
    var rules = Array.isArray(set.effectRules) ? set.effectRules : [];
    var i, r;
    for (i = 0; i < rules.length; i++) {
      r = rules[i] || {};
      if (r.kw && String(text).indexOf(r.kw) >= 0) {
        runEffect(r.type || "fall", r.emoji || "✨", Math.max(10, Math.min((window.XJ_CAP ? XJ_CAP.effectMax() : 120), Number(set.effectCount) || 40)));
        return;
      }
    }
  }
  function runEffect(type, emoji, count) {
    var layer = document.getElementById("snowEffectLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "snowEffectLayer";
      layer.className = "snow-effect-layer";
      document.body.appendChild(layer);
    }
    var W = window.innerWidth, H = window.innerHeight;
    var i;
    if (type === "boom" || type === "bomb") {
      var bursts = type === "bomb" ? 2 : 3;
      for (i = 0; i < bursts; i++) {
        (function (idx) {
          setTimeout(function () {
            burstEffect(layer, W * (0.18 + 0.64 * Math.random()), H * (0.12 + 0.42 * Math.random()), emoji, Math.ceil(count / bursts), type === "bomb");
          }, idx * 200);
        })(i);
      }
    } else if (type === "rise") {
      for (i = 0; i < count; i++) { spawnEmoji(layer, Math.random() * W, H + 30, emoji, "sf-rise", 2.5 + Math.random() * 2.5, Math.random() * 1.2, 16 + Math.random() * 18); }
    } else {
      for (i = 0; i < count; i++) { spawnEmoji(layer, Math.random() * W, -30, emoji, "sf-fall", 2.5 + Math.random() * 2.5, Math.random() * 1.2, 16 + Math.random() * 18); }
    }
  }
  function burstEffect(layer, cx, cy, emoji, n, bomb) {
    var i, a, dist;
    for (i = 0; i < n; i++) {
      a = Math.random() * Math.PI * 2;
      dist = bomb ? (120 + Math.random() * 220) : (80 + Math.random() * 180);
      spawnEmoji(layer, cx, cy, emoji, bomb ? "sf-bomb" : "sf-boom", 0.9 + Math.random() * 0.8, 0, bomb ? 24 + Math.random() * 18 : 18 + Math.random() * 14, Math.cos(a) * dist, Math.sin(a) * dist);
    }
    if (bomb) {
      var ring = document.createElement("span");
      ring.className = "snow-effect-ring";
      ring.style.left = cx + "px";
      ring.style.top = cy + "px";
      layer.appendChild(ring);
      (function (el) { setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 1400); })(ring);
    }
  }
  function spawnEmoji(layer, x, y, emoji, cls, dur, delay, size, tx, ty) {
    var s = document.createElement("span");
    s.className = "snow-effect-p " + cls;
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.fontSize = size + "px";
    s.style.animationDuration = dur + "s";
    s.style.animationDelay = delay + "s";
    if (tx !== undefined && ty !== undefined) { s.style.setProperty("--tx", tx + "px"); s.style.setProperty("--ty", ty + "px"); }
    s.textContent = emoji;
    layer.appendChild(s);
    (function (el) { setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, (dur + delay) * 1000 + 300); })(s);
  }

  /* ---------- 页面：功能设置（对标拾心界 · 交互设置 + 时间戳设置） ---------- */
  function openChatFeature() { switchPage("chat-feature"); renderChatFeature(); }
  function renderChatFeature() {
    var set = loadSettings();
    var root = document.getElementById("chatFeatureWrap");
    if (!root) { return; }
    function seg(key, val) { return set[key] === val ? " is-on" : ""; }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">已读显示</span><span class="chat-seg">' +
      '<button type="button" class="chat-seg-btn' + seg("readMode", "icon") + '" data-val="icon" onclick="SnowCrystal.chatSetSeg(\'readMode\',\'icon\',this)">双勾</button>' +
      '<button type="button" class="chat-seg-btn' + seg("readMode", "text") + '" data-val="text" onclick="SnowCrystal.chatSetSeg(\'readMode\',\'text\',this)">文字</button></span></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">回车发送</span><label class="wc-line-toggle"><input type="checkbox" id="csEnterSend"' + (set.enterSend ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'enterSend\',this.checked)"><span>回车直接发送，Shift+回车换行</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">撤回消息显示</span><label class="wc-line-toggle"><input type="checkbox" id="csRecallShow"' + (set.recallShow !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'recallShow\',this.checked)"><span>在聊天中显示撤回提示</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">允许对方引用消息</span><label class="wc-line-toggle"><input type="checkbox" id="csAllowQuote"' + (set.allowQuote !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'allowQuote\',this.checked)"><span>对方回复可引用你的消息</span></label></article>' +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">时间戳</span><span class="chat-seg">' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "none") + '" data-val="none" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'none\',this)">不显示</button>' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "time") + '" data-val="time" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'time\',this)">时间</button>' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "datetime") + '" data-val="datetime" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'datetime\',this)">日期</button></span></article>' +
      "</div>";
  }

  /* ---------- 页面：节奏设置（对标拾心界 · 回复速度 + 消息行为） ---------- */
  function paceUnitFactor(u) { return u === "m" ? 60 : (u === "h" ? 3600 : 1); }
  function paceUnitDisp(sec, u) { var f = paceUnitFactor(u); return Math.round((sec / f) * 100) / 100; }
  function openChatPace() { switchPage("chat-pace"); renderChatPace(); }
  function renderChatPace() {
    var set = loadSettings();
    var root = document.getElementById("chatPaceWrap");
    if (!root) { return; }
    var m = set.mixSwitch || {};
    function paceInput(id, key, sec, minSec, maxSec, mini) {
      var unit = set[key + "Unit"] || "s";
      /* v101.3：统一拼接样式（chat-num-unit 与单位按钮无缝贴合），最短/最长与主动间隔同尺寸 */
      /* v12.3：放开数字上限 —— maxSec 传 null 表示无上限（不渲染 max 属性与 data-maxsec），仅保留 1 秒下限 */
      var hasMax = (maxSec != null && isFinite(Number(maxSec)) && Number(maxSec) > 0);
      return '<input type="number" class="lf-input chat-num chat-num-unit' + (mini ? " chat-num-mini" : "") + '" id="' + id + '" data-sec="' + sec + '" value="' + paceUnitDisp(sec, unit) + '" min="' + paceUnitDisp(minSec, unit) + '"' + (hasMax ? ' max="' + paceUnitDisp(maxSec, unit) + '"' : '') + ' step="any" data-minsec="' + minSec + '"' + (hasMax ? ' data-maxsec="' + maxSec + '"' : '') + ' onchange="SnowCrystal.chatSetNum(\'' + key + '\',this.value)">';
    }
    function paceSeg(key, unit) {
      var labels = { s: "秒", m: "分钟", h: "小时" };
      return '<button type="button" class="chat-unit-btn" data-u="' + unit + '" data-u-owner="' + key + '" title="点击切换单位" onclick="SnowCrystal.chatOpenPaceUnitPicker(\'' + key + '\')">' + (labels[unit] || "秒") + "</button>";
    }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">回复速度</span>' +
      '<span class="chat-field-col">' +
      '<span class="chat-field">最短 ' + paceInput("csReplyMin", "replyMin", set.replyMin || 30, 1, null, true) + paceSeg("replyMin", set.replyMinUnit || "s") + "</span>" +
      '<span class="chat-field">最长 ' + paceInput("csReplyMax", "replyMax", set.replyMax || 120, 1, null, true) + paceSeg("replyMax", set.replyMaxUnit || "s") + "</span>" +
      "</span></article>" +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">主动发送</span><label class="wc-line-toggle"><input type="checkbox" id="csProactive"' + (set.proactive ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'proactive\',this.checked)"><span>对方会主动找你聊天</span></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">主动间隔</span><span class="chat-field">每 ' + paceInput("csProactiveInterval", "proactiveInterval", set.proactiveInterval || 120, 1, null) + paceSeg("proactiveInterval", set.proactiveIntervalUnit || "s") + " 主动发一条</span></article>" +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">拼字卡</span><label class="wc-line-toggle"><input type="checkbox" id="csMixCard"' + (m.card ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'card\',this.checked)"><span>回复时追加多张字卡</span></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">拼字卡条数</span><span class="chat-field">最少 <input type="number" class="lf-input chat-num" id="csCardMin" value="' + (set.cardMin != null ? set.cardMin : 2) + '" min="1" max="9" onchange="SnowCrystal.chatSetNum(\'cardMin\',this.value)"> 张，最多 <input type="number" class="lf-input chat-num" id="csCardMax" value="' + (set.cardMax != null ? set.cardMax : 3) + '" min="1" max="9" onchange="SnowCrystal.chatSetNum(\'cardMax\',this.value)"> 张</span></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">连接符号</span><span class="chat-field"><input type="text" class="lf-input chat-num" id="csCardSep" value="' + (set.cardSep || "，") + '" maxlength="6" onchange="SnowCrystal.chatSetNum(\'cardSep\',this.value)"> 拼接多张字卡（如 ， 、 空格）</span></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">表情包</span><label class="wc-line-toggle"><input type="checkbox" id="csMixSticker"' + (m.sticker ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'sticker\',this.checked)"><span>回复使用表情包图片</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">颜文字</span><label class="wc-line-toggle"><input type="checkbox" id="csMixKao"' + (m.kao ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'kao\',this.checked)"><span>回复混入颜文字</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">Emoji</span><label class="wc-line-toggle"><input type="checkbox" id="csMixEmoji"' + (m.emoji ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'emoji\',this.checked)"><span>回复混入 Emoji</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">拍一拍</span><label class="wc-line-toggle"><input type="checkbox" id="csMixPat"' + (m.pat ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'pat\',this.checked)"><span>回复使用拍一拍消息</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">语音字卡</span><label class="wc-line-toggle"><input type="checkbox" id="csMixVoice"' + (m.voice ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'voice\',this.checked)"><span>回复发送语音字卡音频</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">引用消息</span><label class="wc-line-toggle"><input type="checkbox" id="csMixQuote"' + (m.quote ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'quote\',this.checked)"><span>对方回复可引用你的消息</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">红包</span><label class="wc-line-toggle"><input type="checkbox" id="csMixRedpack"' + (m.redpack !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'redpack\',this.checked)"><span>对方回复时可能发红包过来</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">问答</span><label class="wc-line-toggle"><input type="checkbox" id="csMixQa"' + (m.qa ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'qa\',this.checked)"><span>对方回复时可能发一个问答让你选择</span></label></article>' +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">允许对方拨打通话</span><label class="wc-line-toggle"><input type="checkbox" id="csCallAllow"' + (set.callAllow ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'callAllow\',this.checked)"><span>对方可主动拨来语音 / 视频通话</span></label></article>' +
      "</div>";
  }

  /* ---------- 页面：音效设置（对标拾心界 · 全局控制 + 接收 / 发送音效） ---------- */
  function openChatSound() { switchPage("chat-sound"); renderChatSound(); }
  function renderChatSound() {
    var snd = loadSound();
    var root = document.getElementById("chatSoundWrap");
    if (!root) { return; }
    var i, m, on;
    function optHtml(side, key) {
      var h = "", j, mm;
      for (j = 0; j < SOUND_META.length; j++) {
        mm = SOUND_META[j];
        h += '<button type="button" class="chat-sound-option' + (snd[side] === mm.key ? " is-on" : "") + '" data-sound="' + mm.key + '" ' +
          'onclick="SnowCrystal.chatSoundPick(\'' + side + '\',\'' + mm.key + '\',this)">' + mm.label +
          '<span class="chat-sound-play" title="预览" onclick="event.stopPropagation();SnowCrystal.chatSoundPreview(\'' + mm.key + '\')">▶</span></button>';
      }
      return h;
    }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">音效开关</span><label class="wc-line-toggle"><input type="checkbox" id="csSoundEnabled"' + (snd.enabled ? " checked" : "") + ' onchange="SnowCrystal.chatSoundToggle(this.checked)"><span>消息提示音总开关</span></label></article>' +
      '<article class="row-card chat-set-row chat-sound-slider"><span class="row-title">音量大小</span>' +
      '<span class="chat-slider-val" id="csSoundVolVal">' + (snd.volume || 0) + '%</span>' +
      '<input type="range" class="chat-range chat-sound-range" id="csSoundVol" min="0" max="100" step="5" value="' + (snd.volume || 0) + '" ' +
      'oninput="SnowCrystal.chatSoundVolDisp(this.value)" onchange="SnowCrystal.chatSoundVolume(this.value)">' +
      "</article>" +
      "</div>" +
      '<div class="chat-sound-options">' + optHtml("receive", snd.receive) + "</div>" +
      '<div class="chat-sound-options">' + optHtml("send", snd.send) + "</div>";
  }
  function chatSoundToggle(on) {
    var snd = loadSound();
    snd.enabled = !!on;
    saveSound(snd);
    wcToast("已保存");
  }
  function chatSoundVolDisp(v) {
    var el = document.getElementById("csSoundVolVal");
    if (el) { el.textContent = v + "%"; }
  }
  function chatSoundVolume(v) {
    var snd = loadSound();
    snd.volume = Math.max(0, Math.min(100, Number(v) || 0));
    saveSound(snd);
    wcToast("已保存 " + snd.volume + "%");
  }
  function chatSoundPick(side, key, btn) {
    var snd = loadSound();
    snd[side] = key;
    saveSound(snd);
    var bs = btn.parentNode.querySelectorAll(".chat-sound-option"), i;
    for (i = 0; i < bs.length; i++) { bs[i].classList.remove("is-on"); }
    btn.classList.add("is-on");
    playSound(key, 1);
    wcToast("已保存");
  }
  function chatSoundPreview(key) { playSound(key, 1); }
  function playSound(key, forceVol) {
    try {
      var snd = loadSound();
      if (!forceVol && !snd.enabled) { return; }
      var vol = forceVol ? (Number(forceVol) || 1) : (Number(snd.volume) / 100);
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { return; }
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      var t = ctx.currentTime;
      var cfg = {
        "default":  [{ f: 880, d: 0.09 }, { f: 1318, d: 0.16 }],
        "standard": [{ f: 660, d: 0.10 }, { f: 990, d: 0.18 }],
        "crisp":    [{ f: 1568, d: 0.06 }, { f: 2093, d: 0.10 }],
        "soft":     [{ f: 523, d: 0.12 }, { f: 784, d: 0.22 }]
      }[key] || [{ f: 880, d: 0.09 }];
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, t);
      var i, at;
      for (i = 0; i < cfg.length; i++) {
        at = t + (i === 0 ? 0 : 0.08);
        gain.gain.cancelScheduledValues(at);
        gain.gain.setValueAtTime(Math.max(0.0001, vol * 0.5), at);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + cfg[i].d);
        osc.frequency.setValueAtTime(cfg[i].f, at);
      }
      osc.start(t);
      osc.stop(t + 0.5);
      var end = t + 0.6;
      window.setTimeout(function () { try { ctx.close(); } catch (e) { } }, Math.ceil((end - t) * 1000) + 80);
    } catch (e) { /* 音效失败不影响聊天 */ }
  }
  function chatPlayReceive() { playSound(loadSound().receive, null); }
  function chatPlaySend() { playSound(loadSound().send, null); }
  function chatSetSeg(key, val, btn) {
    var set = loadSettings();
    set[key] = val;
    saveSettings(set);
    var bs = btn.parentNode.querySelectorAll(".chat-seg-btn"), i;
    for (i = 0; i < bs.length; i++) { bs[i].classList.remove("is-on"); }
    btn.classList.add("is-on");
    wcToast("已保存");
  }
  function chatSetBool(key, on) {
    var set = loadSettings();
    set[key] = !!on;
    saveSettings(set);
    if (key === "proactive") { if (on) { startProactive(); } else { stopProactive(); } }
    if (key === "callAllow") { if (on && state.partnerId) { startSimulateCallTimer(); } else { stopSimulateCallTimer(); } }
    if (key === "keepAlive") { if (on) { startKeepAlive(); } else { stopKeepAlive(); } }
    if (key === "notifyBar" && on) { ensureNotifyPermission(); }
    if (key === "bgNotify" && on) { ensureNotifyPermission(); }
    wcToast("已保存");
  }
  function chatSetNum(key, v) {
    var set = loadSettings();
    if (key === "cardSep") {
      var sep = String(v || "").slice(0, 6) || "，";
      set.cardSep = sep;
      saveSettings(set);
      var sepEl = document.getElementById("csCardSep");
      if (sepEl) { sepEl.value = sep; }
      wcToast("已保存");
      return;
    }
    var n = Number(v) || 0;
    if (key === "replyMin" || key === "replyMax" || key === "proactiveInterval") {
      n = Math.round(n * paceUnitFactor(set[key + "Unit"] || "s")); /* 按当前单位换算为秒存储 */
      /* v12.3：放开数字上限 —— 最短/最长/主动间隔仅保留 1 秒下限，最大不设限（不再 clamp 3600/86400） */
      n = Math.max(1, n);
    }
    else if (key === "forward") { n = Math.max(0, Math.min(100, n)); }
    else if (key === "callProb") { n = Math.max(0, Math.min(100, n)); }
    else if (key === "callAcceptProb" || key === "callRejectProb" || key === "callMissProb") { n = Math.max(0, Math.min(100, n)); }
    else if (key === "cardMin" || key === "cardMax") { n = Math.max(1, Math.min(9, Math.round(n))); }
    set[key] = n;
    saveSettings(set);
    var idMap = { replyMin: "csReplyMin", replyMax: "csReplyMax", proactiveInterval: "csProactiveInterval", forward: "csForward", callProb: "csCallProb", callAcceptProb: "csCallAcceptProb", callRejectProb: "csCallRejectProb", callMissProb: "csCallMissProb", cardMin: "csCardMin", cardMax: "csCardMax", cardSep: "csCardSep" };
    var el = document.getElementById(idMap[key]);
    if (el) {
      if (key === "replyMin" || key === "replyMax" || key === "proactiveInterval") { el.setAttribute("data-sec", n); el.value = paceUnitDisp(n, set[key + "Unit"] || "s"); }
      else { el.value = n; }
    }
    if (key === "proactiveInterval" && set.proactive) { startProactive(); }
    if (key === "callProb" && set.callAllow && state.partnerId) { startSimulateCallTimer(); }
    wcToast("已保存");
  }
  function chatSetUnitCycle(key, btn) {
    var set = loadSettings();
    var idMap = { replyMin: "csReplyMin", replyMax: "csReplyMax", proactiveInterval: "csProactiveInterval" };
    var el = document.getElementById(idMap[key]);
    if (!el) { return; }
    var oldU = set[key + "Unit"] || "s";
    var next = oldU === "s" ? "m" : (oldU === "m" ? "h" : "s");
    var sec = Number(el.getAttribute("data-sec") || 0) || (Number(el.value || 0) * paceUnitFactor(oldU)); /* 优先用原始秒值，避免显示换算漂移 */
    el.setAttribute("data-sec", sec);
    el.value = paceUnitDisp(sec, next);                     /* 按新单位显示 */
    var minSec = Number(el.getAttribute("data-minsec")) || 1;
    el.min = paceUnitDisp(minSec, next);
    var maxSecRaw = el.getAttribute("data-maxsec");
    if (maxSecRaw && isFinite(Number(maxSecRaw)) && Number(maxSecRaw) > 0) { el.max = paceUnitDisp(Number(maxSecRaw), next); }
    else { el.removeAttribute("max"); } /* v12.3：无上限时切换单位也不恢复 max */
    set[key + "Unit"] = next;
    saveSettings(set);
    var labels = { s: "秒", m: "分钟", h: "小时" };
    btn.setAttribute("data-u", next);
    btn.textContent = labels[next] || "秒";
    wcToast("已保存");
  }
  /* 单位切换：点击单位按钮 → 居中弹窗手动选择（不再循环切换） */
  function openPaceUnitPicker(key) {
    var set = loadSettings();
    var cur = set[key + "Unit"] || "s";
    var labels = { s: "秒", m: "分钟", h: "小时" };
    var opts = "";
    ["s", "m", "h"].forEach(function (u) {
      opts += '<button type="button" class="chat-unit-btn rp-unit-opt' + (u === cur ? " is-on" : "") + '" data-u="' + u + '" onclick="SnowCrystal.chatSetPaceUnit(\'' + key + '\',\'' + u + '\')">' + (labels[u] || u) + "</button>";
    });
    rpOpenModal(
      '<div class="rp-modal-head">切换单位</div>' +
      '<div class="rp-unit-pick">' + opts + "</div>" +
      '<div class="rp-row" style="margin-top:14px"><button class="rp-btn rp-btn-ghost" type="button" onclick="SnowCrystal.Chat.closeRedpackModal()">取消</button></div>'
    );
  }
  function setPaceUnit(key, u) {
    var set = loadSettings();
    var idMap = { replyMin: "csReplyMin", replyMax: "csReplyMax", proactiveInterval: "csProactiveInterval" };
    var el = document.getElementById(idMap[key]);
    if (!el) { closeRedpackModal(); return; }
    var oldU = set[key + "Unit"] || "s";
    if (u === oldU) { closeRedpackModal(); return; }
    var sec = Number(el.getAttribute("data-sec") || 0) || (Number(el.value || 0) * paceUnitFactor(oldU)); /* 优先用原始秒值，避免显示换算漂移 */
    el.setAttribute("data-sec", sec);
    el.value = paceUnitDisp(sec, u);                     /* 按新单位显示 */
    var minSec = Number(el.getAttribute("data-minsec")) || 1;
    el.min = paceUnitDisp(minSec, u);
    var maxSecRaw = el.getAttribute("data-maxsec");
    if (maxSecRaw && isFinite(Number(maxSecRaw)) && Number(maxSecRaw) > 0) { el.max = paceUnitDisp(Number(maxSecRaw), u); }
    else { el.removeAttribute("max"); } /* v12.3：无上限时切换单位也不恢复 max */
    set[key + "Unit"] = u;
    saveSettings(set);
    var labels = { s: "秒", m: "分钟", h: "小时" };
    var segBtn = document.querySelector('#chatPaceWrap .chat-unit-btn[data-u-owner="' + key + '"]');
    if (segBtn) { segBtn.setAttribute("data-u", u); segBtn.textContent = labels[u] || "秒"; }
    closeRedpackModal();
    wcToast("已保存");
  }
  function chatSetMix(key, on) {
    var set = loadSettings();
    set.mixSwitch[key] = !!on;
    saveSettings(set);
    wcToast("已保存");
  }


  /* =========================================================
   * 让你选（v102）：月牙菜单「让你选」—— 问答抉择弹窗 / 消息气泡 / 问答库
   * 需求：居中弹窗输入问题 + 2~15 条答案（无字数上限、答案区可上下滚动），
   *       单选 / 多选；发出后对方 3-6s 内选择；气泡跟随主题；
   *       字卡新增「问答库」收纳模板，对方可调用模板发问答让我方选择；
   *       节奏设置新增「问答」开关 + 概率设置新增「问答混入概率」。
   * ========================================================= */
  var QA_KEY = "snowcrystal.chat.qa.v1";
  var QA_MAX_OPTS = 15, QA_MIN_OPTS = 2;
  var _qaMulti = false;
  var _qaEditMode = false; /* true=问答库「新建模板」保存模式（仅保存不发送） */

  function loadQa() { var v = lsGet(QA_KEY); return Array.isArray(v) ? v : []; }
  function saveQa(list) { lsSet(QA_KEY, list); }
  function qaPartnerName() {
    var partners = loadPartners(), i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === state.partnerId) { return partners[i].name || "对方"; } }
    return "对方";
  }
  function qaTplId(q, opts, multi) { return q + "\u0001" + (multi ? "1" : "0") + "\u0001" + JSON.stringify(opts); }
  function saveQaTpl(q, opts, multi) {
    var list = loadQa(), id = qaTplId(q, opts, multi), i;
    for (i = 0; i < list.length; i++) { if (qaTplId(list[i].q, list[i].opts, list[i].multi) === id) { break; } }
    var tpl = { id: id, q: q, opts: opts.slice(), multi: !!multi, time: now() };
    if (i < list.length) { list.splice(i, 1); }
    list.unshift(tpl);
    saveQa(list);
    var meta = document.getElementById("qaMeta");
    if (meta) { meta.textContent = list.length + " 条"; }
  }
  function qaPickRandom() {
    var list = loadQa();
    if (!list.length) { return null; }
    return list[Math.floor(Math.random() * list.length)];
  }
  (function () {
    var meta = document.getElementById("qaMeta");
    if (meta) { meta.textContent = loadQa().length + " 条"; }
  })();
  function qaRefreshRowUi() {
    var rows = document.querySelectorAll("#qaOpts .qa-opt-row"), i, j, delBtns;
    var n = rows.length;
    for (i = 0; i < rows.length; i++) {
      delBtns = rows[i].querySelectorAll(".qa-opt-del");
      for (j = 0; j < delBtns.length; j++) { delBtns[j].disabled = n <= QA_MIN_OPTS; }
    }
    var addBtn = document.getElementById("qaAddBtn");
    if (addBtn) { addBtn.disabled = n >= QA_MAX_OPTS; addBtn.textContent = n >= QA_MAX_OPTS ? "已到上限 " + QA_MAX_OPTS + " 条" : "＋ 添加答案"; }
    var cnt = document.getElementById("qaCount");
    if (cnt) { cnt.textContent = n + "/" + QA_MAX_OPTS; }
  }
  function qaOptRowHtml() {
    return '<div class="qa-opt-row">' +
      '<textarea class="qa-opt-input" rows="1" placeholder="答案选项" oninput="SnowCrystal.Chat.qaAutoGrow(this)"></textarea>' +
      '<button class="qa-opt-del" type="button" title="删除该答案" onclick="SnowCrystal.Chat.qaDelOpt(this)"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6.6 17.4 18M17.4 6.6 6 17.4"/></svg></button>' +
      "</div>";
  }
  function qaAutoGrow(el) {
    if (!el) { return; }
    el.style.height = "auto";
    el.style.height = Math.min(120, Math.max(40, el.scrollHeight)) + "px";
  }
  function qaSetPanelText() {
    var t = document.getElementById("chatQaTitle");
    if (t) { t.textContent = _qaEditMode ? "新建问答模板" : "让你选"; }
    var b = document.querySelector("#chatQaPanel .chat-qa-send");
    if (b) { b.textContent = _qaEditMode ? "保存到问答库" : "发送让你选"; }
    var tip = document.querySelector("#chatQaPanel .chat-qa-tip");
    if (tip) { tip.textContent = _qaEditMode ? "仅保存为模板，不会发送 · 可从问答库随时复用" : "对方收到后可在 3-6 秒内选择答案 · 发送后自动存入问答库"; }
  }
  function liftQaLayer() {
    /* 问答弹窗默认嵌在聊天室页内，切到问答库等其它页面时父页 display:none 导致弹窗不可见；
       打开前把遮罩与面板提升为 body 直属全局浮层，任何页面都能正常弹出 */
    var panel = document.getElementById("chatQaPanel"), mask = document.getElementById("chatQaMask");
    if (panel && panel.parentNode && panel.parentNode !== document.body) { document.body.appendChild(panel); }
    if (mask && mask.parentNode && mask.parentNode !== document.body) { document.body.appendChild(mask); }
  }
  function openQaPicker() {
    liftQaLayer();
    var panel = document.getElementById("chatQaPanel"), mask = document.getElementById("chatQaMask");
    if (!panel || !mask) { return; }
    var q = document.getElementById("qaQuestion");
    if (q) { q.value = ""; q.style.height = "auto"; }
    var opts = document.getElementById("qaOpts");
    if (opts) { opts.innerHTML = qaOptRowHtml() + qaOptRowHtml(); }
    setQaMode(false);
    _qaEditMode = false;
    qaSetPanelText();
    qaRefreshRowUi();
    mask.classList.add("is-open");
    panel.classList.add("is-open");
    if (q) { window.setTimeout(function () { q.focus(); }, 60); }
  }
  function openQaEdit() {
    liftQaLayer();
    var panel = document.getElementById("chatQaPanel"), mask = document.getElementById("chatQaMask");
    if (!panel || !mask) { return; }
    var q = document.getElementById("qaQuestion");
    if (q) { q.value = ""; q.style.height = "auto"; }
    var opts = document.getElementById("qaOpts");
    if (opts) { opts.innerHTML = qaOptRowHtml() + qaOptRowHtml(); }
    setQaMode(false);
    _qaEditMode = true;
    qaSetPanelText();
    qaRefreshRowUi();
    mask.classList.add("is-open");
    panel.classList.add("is-open");
    if (q) { window.setTimeout(function () { q.focus(); }, 60); }
  }
  function closeQaPanel() {
    var panel = document.getElementById("chatQaPanel"), mask = document.getElementById("chatQaMask");
    if (panel) { panel.classList.remove("is-open"); }
    if (mask) { mask.classList.remove("is-open"); }
    _qaEditMode = false;
    qaSetPanelText();
  }
  function toggleQaMode() { setQaMode(!_qaMulti); }
  function setQaMode(multi) {
    _qaMulti = !!multi;
    var btn = document.getElementById("qaModeBtn");
    if (btn) { btn.textContent = _qaMulti ? "多选" : "单选"; btn.setAttribute("aria-pressed", _qaMulti ? "true" : "false"); }
  }
  function qaAddOpt() {
    var opts = document.getElementById("qaOpts");
    if (!opts) { return; }
    var rows = opts.querySelectorAll(".qa-opt-row");
    if (rows.length >= QA_MAX_OPTS) { return; }
    var div = document.createElement("div");
    div.innerHTML = qaOptRowHtml();
    var row = div.firstChild;
    opts.appendChild(row);
    qaRefreshRowUi();
    var ta = row.querySelector(".qa-opt-input");
    if (ta) { ta.focus(); }
  }
  function qaDelOpt(el) {
    if (!el) { return; }
    var row = el.closest ? el.closest(".qa-opt-row") : null;
    if (!row) { return; }
    var opts = document.getElementById("qaOpts");
    if (!opts) { return; }
    var n = opts.querySelectorAll(".qa-opt-row").length;
    if (n <= QA_MIN_OPTS) { return; }
    if (row.parentNode) { row.parentNode.removeChild(row); }
    qaRefreshRowUi();
  }
  function qaSend() {
    var qEl = document.getElementById("qaQuestion");
    var q = String(qEl ? qEl.value : "").replace(/^\s+|\s+$/g, "");
    var rows = document.querySelectorAll("#qaOpts .qa-opt-row");
    var opts = [], i, v;
    for (i = 0; i < rows.length; i++) {
      var ta = rows[i].querySelector(".qa-opt-input");
      v = String(ta ? ta.value : "").replace(/^\s+|\s+$/g, "");
      if (v) { opts.push(v); }
    }
    if (!q) { wcToast("先写下你的问题"); return; }
    if (opts.length < QA_MIN_OPTS) { wcToast("至少需要 " + QA_MIN_OPTS + " 个答案"); return; }
    if (_qaEditMode) {
      /* 问答库新建模板：仅保存不发送 */
      saveQaTpl(q, opts, _qaMulti);
      closeQaPanel();
      var cur = document.querySelector(".page.is-active");
      if (cur && cur.getAttribute("data-page") === "qa-lib") { renderQaLib(); }
      wcToast("已保存到问答库");
      return;
    }
    if (!state.partnerId) { wcToast("请先进入聊天室再发送"); return; }
    sendQaMsg(q, opts, _qaMulti);
    closeQaPanel();
    wcToast("已发送「让你选」，等对方选择");
  }
  function sendQaMsg(q, opts, multi) {
    var mid = "m" + now().toString(36) + Math.random().toString(36).slice(2, 7);
    var msg = { id: mid, type: "self", msgType: "qa", time: now(), read: false,
                q: q, opts: opts.slice(), multi: !!multi, status: "pending", picked: [], pickedBy: "" };
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, msgText(msg), now());
    renderMessages(state.partnerId, true);
    chatPlaySend();
    saveQaTpl(q, opts, multi);
    scheduleQaPick(mid);
  }
  function scheduleQaPick(mid) {
    var delay = 3000 + Math.random() * 3000;
    window.setTimeout(function () {
      try {
        var c = loadChat(), l = c.messages[state.partnerId] || [], i;
        for (i = 0; i < l.length; i++) {
          if (l[i].id === mid && l[i].msgType === "qa" && l[i].status === "pending") {
            var msg = l[i];
            var n = msg.multi ? (1 + Math.floor(Math.random() * Math.min(3, msg.opts.length))) : 1;
            var pool = [], j, ix;
            for (j = 0; j < msg.opts.length; j++) { pool.push(j); }
            var picks = [];
            for (j = 0; j < n && pool.length; j++) {
              ix = Math.floor(Math.random() * pool.length);
              picks.push(pool.splice(ix, 1)[0]);
            }
            msg.status = "done"; msg.picked = picks; msg.pickedBy = qaPartnerName();
            saveChat(c);
            rerenderMsgRow(mid);
            return;
          }
        }
      } catch (e) { /* 模拟选择异常忽略 */ }
    }, delay);
  }
  function rerenderMsgRow(mid) {
    var box = document.getElementById("chatMessages");
    if (!box || !mid) { return; }
    var row = box.querySelector('.chat-msg[data-mid="' + mid + '"]');
    if (!row) { return; }
    var c = loadChat(), l = c.messages[state.partnerId] || [], m = null, i;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m || m.isRecall) { return; }
    var set = loadSettings();
    var h = msgHtml(m, state.partnerId, set, m.type === "self");
    if (!h) { return; }
    var tmp = document.createElement("div");
    tmp.innerHTML = h;
    var nrow = tmp.firstChild;
    if (!nrow) { return; }
    row.parentNode.insertBefore(nrow, row);
    row.parentNode.removeChild(row);
    loadStickerImgs(box);
  }
  function qaPick(mid, idx) {
    var c = loadChat(), l = c.messages[state.partnerId] || [], i, m = null;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m || m.msgType !== "qa" || m.status !== "pending" || m.type !== "other") { return; }
    if (!m.multi) {
      m.status = "done"; m.picked = [idx]; m.pickedBy = (loadMy() || {}).name || "我";
      saveChat(c);
      rerenderMsgRow(mid);
    } else {
      var arr = m.picked || [];
      var pos = arr.indexOf(idx);
      if (pos >= 0) { arr.splice(pos, 1); } else { arr.push(idx); }
      m.picked = arr;
      saveChat(c);
      rerenderMsgRow(mid);
    }
  }
  function qaPickDone(mid) {
    var c = loadChat(), l = c.messages[state.partnerId] || [], i, m = null;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m || m.msgType !== "qa" || m.status !== "pending" || m.type !== "other") { return; }
    if (!(m.picked || []).length) { wcToast("先选一个答案再完成"); return; }
    m.status = "done"; m.pickedBy = (loadMy() || {}).name || "我";
    saveChat(c);
    rerenderMsgRow(mid);
  }
  function qaCardHtml(m, isSelf, partnerId, set) {
    var q = esc(m.q || "");
    var opts = m.opts || [];
    var multi = !!m.multi;
    var done = m.status === "done";
    var picked = m.picked || [];
    var i, optHtml = "";
    for (i = 0; i < opts.length; i++) {
      var pickedCls = picked.indexOf(i) >= 0 ? " is-picked" : "";
      var tag = multi ? (done ? "&#10003;" : "&#9744;") : (done ? "&#9679;" : "&#9675;");
      if (done) {
        optHtml += '<div class="qa-opt' + pickedCls + '"><span class="qa-opt-tag">' + tag + '</span><span class="qa-opt-text">' + esc(opts[i]) + "</span></div>";
      } else if (isSelf) {
        optHtml += '<div class="qa-opt' + pickedCls + '"><span class="qa-opt-tag">' + tag + '</span><span class="qa-opt-text">' + esc(opts[i]) + "</span></div>";
      } else {
        optHtml += '<button class="qa-opt' + pickedCls + '" type="button" data-qa-opt="' + i + '"><span class="qa-opt-tag">' + tag + '</span><span class="qa-opt-text">' + esc(opts[i]) + "</span></button>";
      }
    }
    var stateHtml;
    if (done) {
      var picksText = [];
      for (i = 0; i < picked.length; i++) { if (opts[picked[i]] != null) { picksText.push(opts[picked[i]]); } }
      stateHtml = '<div class="qa-state is-done"><span class="qa-picked-by">' + esc(m.pickedBy || "对方") + " 选择了：</span>" + esc(picksText.join("、") || "—") + "</div>";
    } else if (isSelf) {
      stateHtml = '<div class="qa-state">等待对方选择…</div>';
    } else if (multi) {
      var cur = [];
      for (i = 0; i < picked.length; i++) { if (opts[picked[i]] != null) { cur.push(opts[picked[i]]); } }
      stateHtml = '<div class="qa-state is-multi"><span>已选：' + esc(cur.join("、") || "未选") + '（可多点）</span><button class="qa-done-btn" type="button">完成</button></div>';
    } else {
      stateHtml = '<div class="qa-state">点一下答案，帮我选一个</div>';
    }
    return '<div class="qa-card">' +
      '<div class="qa-card-head"><svg class="qa-card-icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M239.43,133l-32-80A8,8,0,0,0,200,48a8.27,8.27,0,0,0-1.73.21L136,62V40a8,8,0,0,0-16,0V65.58L54.27,80.21A8,8,0,0,0,48.57,85l-32,80a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133Zm-160,35H32.62L56,109.54Zm97.24-32L200,77.54,223.38,136Z"/></svg><span>抉择一下</span></div>' +
      '<div class="qa-q">' + q + "</div>" +
      '<div class="qa-opts-list">' + optHtml + "</div>" +
      stateHtml +
      "</div>";
  }
  function openQaLib() { renderQaLib(); switchPage("qa-lib"); }
  function qaBack() { switchPage("wordcard"); }
  function renderQaLib() {
    var wrap = document.getElementById("qaListWrap");
    if (!wrap) { return; }
    var list = loadQa(), i, html = "";
    if (!list.length) {
      wrap.innerHTML = '<div class="chat-empty"><p class="chat-empty-title">还没有问答模板</p><p class="chat-empty-desc">在聊天里点「让你选」发出一个问答，就会自动收录到这里</p></div>';
      var foot = document.getElementById("qaFoot");
      if (foot) { foot.textContent = "问答模板 · 共 0 条 · 数据存在本机"; }
      return;
    }
    for (i = 0; i < list.length; i++) {
      var t = list[i];
      var prev = t.opts.slice(0, 4).map(function (x) { return esc(x); }).join(" / ");
      if (t.opts.length > 4) { prev += " …"; }
      html += '<article class="row-card qa-tpl-card">' +
        '<div class="row-main">' +
        '<span class="row-title">' + esc(t.q) + (t.multi ? ' <span class="qa-tpl-tag">多选</span>' : "") + "</span>" +
        '<span class="row-desc">' + prev + "</span>" +
        "</div>" +
        '<div class="qa-tpl-actions">' +
        '<button class="qa-tpl-btn" type="button" onclick="SnowCrystal.Chat.qaUseTpl(' + i + ')">发送</button>' +
        '<button class="qa-tpl-btn is-del" type="button" onclick="SnowCrystal.Chat.qaDelTpl(' + i + ')">删除</button>' +
        "</div>" +
        "</article>";
    }
    wrap.innerHTML = html;
    var foot2 = document.getElementById("qaFoot");
    if (foot2) { foot2.textContent = "问答模板 · 共 " + list.length + " 条 · 数据存在本机"; }
  }
  function qaUseTpl(idx) {
    var list = loadQa(), t = list[idx];
    if (!t) { return; }
    if (!state.partnerId) { wcToast("请先进入聊天室再发送"); return; }
    sendQaMsg(t.q, t.opts, t.multi);
    switchPage("chat-room");
    renderMessages(state.partnerId, false);
    wcToast("已发送「让你选」，等对方选择");
  }
  function qaDelTpl(idx) {
    var list = loadQa();
    if (idx < 0 || idx >= list.length) { return; }
    list.splice(idx, 1);
    saveQa(list);
    renderQaLib();
    var meta = document.getElementById("qaMeta");
    if (meta) { meta.textContent = list.length + " 条"; }
  }

  /* =========================================================
   * 副字卡（角色专属字卡）：按账号设置中的对方角色分组，
   *   每个角色的字卡只在对应角色聊天中发出，绝不跨角色串联。
   * ========================================================= */
  var SUB_KEY = "snowcrystal.wordcard.sub.v1";
  var _subPid = "";
  var SUB_SEND_ICO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3.4 4.4 21 12 3.4 19.6l2.3-6.9L18.4 12 5.7 11.3z"/></svg>';

  function loadSub() { var v = lsGet(SUB_KEY); return (v && typeof v === "object" && !Array.isArray(v)) ? v : {}; }
  function saveSub(d) { lsSet(SUB_KEY, d); }
  function subItemsOf(pid) { var d = loadSub(), arr = d[pid]; return Array.isArray(arr) ? arr : []; }
  function subPickFor(pid) { var arr = subItemsOf(pid); return arr.length ? pick(arr) : null; }
  function subPartnerOf(pid) {
    var partners = loadPartners(), i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === pid) { return partners[i]; } }
    return null;
  }
  function subMetaRefresh() {
    var d = loadSub(), keys = Object.keys(d), cnt = 0, i;
    for (i = 0; i < keys.length; i++) { if (Array.isArray(d[keys[i]])) { cnt += d[keys[i]].length; } }
    var meta = document.getElementById("subMeta");
    if (meta) { meta.textContent = cnt ? cnt + " 条" : ""; }
    return cnt;
  }
  function openWcHub() { subMetaRefresh(); SnowCrystal.switchPage("wc-hub"); }
  function subBack() { SnowCrystal.switchPage("wc-hub"); }
  function openSubLib() { subMetaRefresh(); renderSubLib(); SnowCrystal.switchPage("sub-lib"); }
  function renderSubLib() {
    var wrap = document.getElementById("subGroups");
    if (!wrap) { return; }
    var partners = loadPartners(), i, html = "";
    if (!partners.length) {
      wrap.innerHTML = '<div class="chat-empty"><p class="chat-empty-title">还没有对方角色</p><p class="chat-empty-desc">先到「账号设置」添加对方角色，专属字卡将按角色分组</p></div>';
      var f0 = document.getElementById("subLibFoot");
      if (f0) { f0.textContent = "先添加对方角色再创建专属字卡 · 数据存在本机"; }
      return;
    }
    for (i = 0; i < partners.length; i++) {
      var p = partners[i];
      var arr = subItemsOf(p.id);
      var pidEsc = String(p.id).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      html += '<div class="group-item-wrapper">' +
        '<div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openSubGroup(\'' + pidEsc + '\')">' +
          '<span class="discover-icon is-avatar">' + subAvatarHtml(p) + "</span>" +
          '<span class="discover-info">' +
            '<span class="discover-title">' + esc(p.name || "对方") + "</span>" +
            '<span class="discover-desc">' + (arr.length ? arr.length + " 条专属字卡 · 点进查看" : "还没有字卡，点进去添加") + "</span>" +
          "</span>" +
          '<span class="discover-arrow">›</span>' +
        "</div>" +
        (i < partners.length - 1 ? '<div class="list-divider" aria-hidden="true"></div>' : "") +
        "</div>";
    }
    wrap.innerHTML = html;
    var f2 = document.getElementById("subLibFoot");
    if (f2) { f2.textContent = "专属字卡只由对应角色发出 · 共 " + partners.length + " 个角色 · 数据存在本机"; }
  }
  function subAvatarHtml(p) {
    var av = p.avatar || "";
    if (av) { return '<img class="chat-avatar-img" src="' + esc(av) + '" alt="">'; }
    return '<span class="chat-avatar-ph">' + esc(String(p.name || "对").slice(0, 1)) + "</span>";
  }
  function subGroupBack() { renderSubLib(); SnowCrystal.switchPage("sub-lib"); }
  function openSubGroup(pid) {
    var p = subPartnerOf(pid);
    if (!p) { wcToast("对方角色不存在"); return; }
    _subPid = pid;
    renderSubGroup();
    SnowCrystal.switchPage("sub-group");
  }
  function renderSubGroup() {
    var p = subPartnerOf(_subPid);
    if (!p) { return; }
    var tEl = document.getElementById("subGrpTitle");
    if (tEl) { tEl.textContent = p.name || "对方"; }
    var arr = subItemsOf(_subPid);
    var tools = document.getElementById("subGrpTools");
    if (tools) {
      /* 对标通用字卡：菜单栏纯图标化，尺寸/样式与通用字卡工具栏一致 */
      tools.innerHTML =
        '<button class="wc-tool wc-tool--main is-ico" type="button" title="添加专属字卡" aria-label="添加专属字卡" onclick="SnowCrystal.subAdd()">' + WC_ICO_ADD + "</button>" +
        '<button class="wc-tool is-ico" type="button" title="导入 JSON" aria-label="导入 JSON" onclick="SnowCrystal.subImport()">' + WC_ICO_IMPORT + "</button>" +
        '<button class="wc-tool is-ico" type="button" title="导出 JSON" aria-label="导出 JSON" onclick="SnowCrystal.subExport()">' + WC_ICO_EXPORT + "</button>" +
        '<button class="wc-tool is-ico" type="button" title="去重" aria-label="去重" onclick="SnowCrystal.subDedup()">' + WC_ICO_DEDUP + "</button>" +
        '<button class="wc-tool is-ico" type="button" title="搜索" aria-label="搜索" onclick="SnowCrystal.subSearch()">' + WC_ICO_SEARCH + "</button>";
    }
    var body = document.getElementById("subGrpBody");
    if (!body) { return; }
    /* 切页/重渲染时复位搜索态 */
    var sWrap = document.getElementById("subSearchWrap");
    var sInp = document.getElementById("subSearchInput");
    if (sWrap) { sWrap.hidden = true; }
    if (sInp) { sInp.value = ""; }
    var sRes = document.getElementById("subSearchResults");
    if (sRes) { sRes.hidden = true; sRes.innerHTML = ""; }
    if (!arr.length) {
      body.innerHTML = '<p class="grp-empty">' + esc(p.name || "对方") + " 还没有专属字卡，点上方「＋」添加</p>";
    } else {
      /* 对标通用字卡分组内容页：双列卡片网格（尺寸与通用字卡 wc-grid.is-card-grid 一致） */
      var html = '<div class="wc-grid is-card-grid" id="subItems">', j;
      for (j = 0; j < arr.length; j++) {
        html += '<div class="wc-card" role="button" tabindex="0" data-copy="' + esc(arr[j]) + '">' +
          '<span class="wc-card-text">' + esc(arr[j]) + "</span>" +
          '<button class="wc-send" type="button" data-send="1" title="发送给' + esc(p.name || "对方") + '" aria-label="发送">' + SUB_SEND_ICO + "</button>" +
          '<button class="wc-del" type="button" data-del="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>" +
          "</div>";
      }
      html += "</div>";
      body.innerHTML = html;
    }
    if (body.getAttribute("data-bound") !== "1") {
      body.setAttribute("data-bound", "1");
      body.addEventListener("click", subBodyClick);
    }
  }
  function subBodyClick(e) {
    var t = e.target || e.srcElement;
    var host = document.getElementById("subGrpBody");
    if (!host || !host.contains(t)) { return; }
    var del = closestData(t, "data-del", host);
    if (del) { subDel(del); return; }
    var send = closestData(t, "data-send", host);
    if (send) { subSend(send); return; }
    var item = closestData(t, "data-copy", host);
    if (item) { wcCopy(item.getAttribute("data-copy") || ""); }
  }
  function subNodeIndex(node) {
    var host = document.getElementById("subGrpBody");
    var nodes = host ? host.querySelectorAll("[data-copy]") : [];
    var i;
    for (i = 0; i < nodes.length; i++) { if (nodes[i] === node) { return i; } }
    return -1;
  }
  function subAdd() {
    if (!_subPid) { return; }
    var p = subPartnerOf(_subPid);
    if (!p) { wcToast("对方角色不存在"); return; }
    wcPrompt("添加 " + (p.name || "对方") + " 的专属字卡", "", "该字卡只会由 " + (p.name || "对方") + " 在聊天中发出", function (v) {
      var d = loadSub();
      if (!Array.isArray(d[_subPid])) { d[_subPid] = []; }
      var list = String(v).split("\n"), cnt = 0, i2, t;
      for (i2 = 0; i2 < list.length; i2++) {
        t = String(list[i2]).replace(/^\s+|\s+$/g, "");
        if (t) { d[_subPid].push(t); cnt++; }
      }
      if (!cnt) { wcToast("内容为空"); return; }
      saveSub(d);
      renderSubGroup();
      renderSubLib();
      subMetaRefresh();
      wcToast(cnt > 1 ? "已添加 " + cnt + " 条" : "已添加");
    }, { multiline: true, lineKey: "sub", contentLabel: true });
  }
  function subDel(node) {
    var idx = subNodeIndex(node);
    if (idx < 0) { return; }
    var d = loadSub();
    if (!Array.isArray(d[_subPid]) || idx >= d[_subPid].length) { return; }
    d[_subPid].splice(idx, 1);
    saveSub(d);
    renderSubGroup();
    renderSubLib();
    subMetaRefresh();
    wcToast("已删除");
  }
  function subSend(node) {
    var idx = subNodeIndex(node);
    if (idx < 0) { return; }
    var d = loadSub();
    if (!Array.isArray(d[_subPid]) || idx >= d[_subPid].length) { return; }
    var p = subPartnerOf(_subPid);
    var text = String(d[_subPid][idx] || "");
    if (!text) { return; }
    if (p) { openChatRoom(p.id); }
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "text", text: text, time: now(), read: false };
    pushMsg(p ? p.id : _subPid, msg);
    setLast(p ? p.id : _subPid, text, now());
    triggerEffectForText(text);
    renderMessages(p ? p.id : _subPid, true);
    chatPlaySend();
    refreshFlameDisplay();
    scheduleReadReceipt(msg.id);
    scheduleReply();
    maybeTriggerIncomingByKeyword(text);
    updateSendBtn();
    wcToast("已发送给 " + (p ? (p.name || "对方") : "对方"));
  }
  /* 对标通用字卡：专属字卡菜单栏新增 搜索/导入/导出/去重 */
  function subCopyText(t) { wcCopy(t); }
  function subSearch() {
    var wrap = document.getElementById("subSearchWrap");
    var inp = document.getElementById("subSearchInput");
    if (!wrap) { return; }
    if (!wrap.hidden) {
      wrap.hidden = true;
      if (inp) { inp.value = ""; }
      subDoSearch("");
      return;
    }
    wrap.hidden = false;
    if (inp) { inp.value = ""; inp.focus(); }
    subDoSearch("");
  }
  function subDoSearch(q) {
    var host = document.getElementById("subSearchResults");
    var list = document.getElementById("subGrpBody");
    q = String(q == null ? "" : q).replace(/^\s+|\s+$/g, "");
    if (!q) {
      if (host) { host.hidden = true; host.innerHTML = ""; }
      if (list) { list.hidden = false; }
      return;
    }
    if (host) { host.hidden = false; }
    if (list) { list.hidden = true; }
    var p = subPartnerOf(_subPid), arr = subItemsOf(_subPid);
    if (!p) { return; }
    var html = '<p class="grp-empty">「' + esc(q) + '」的搜索结果</p><div class="row-list">', hit = 0, j, txt;
    for (j = 0; j < arr.length; j++) {
      txt = arr[j];
      if (String(txt).toLowerCase().indexOf(q.toLowerCase()) < 0) { continue; }
      hit++;
      html += '<article class="row-card" onclick="SnowCrystal.subCopyText(\'' + esc(txt).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + '\')">' +
                '<span class="row-ico">' + WC_ICO_GRP_OPEN + "</span>" +
                '<div class="row-main"><span class="row-title">' + esc(txt) + "</span>" +
                '<span class="row-desc">' + esc(p.name || "对方") + " 专属字卡</span></div>" +
                '<span class="row-arrow">›</span>' +
              "</article>";
    }
    html += "</div>";
    if (!hit) { html = '<p class="grp-empty">没有找到「' + esc(q) + '」</p>'; }
    if (host) { host.innerHTML = html; }
  }
  function subClearSearch() {
    var wrap = document.getElementById("subSearchWrap");
    var inp = document.getElementById("subSearchInput");
    if (inp) { inp.value = ""; }
    if (wrap) { wrap.hidden = true; }
    subDoSearch("");
  }
  function subImport() {
    var inp = document.getElementById("subLibImport");
    if (inp) { inp.click(); }
  }
  function subExport() {
    var d = loadSub();
    var data = { kind: "snowcrystal-sub-wordcard", exportedAt: new Date().toISOString(), groups: d };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "雪晶-专属字卡.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    wcToast("已导出专属字卡");
  }
  function subDedup() {
    var d = loadSub(), removed = 0, pid;
    for (pid in d) {
      if (!Object.prototype.hasOwnProperty.call(d, pid)) { continue; }
      if (!Array.isArray(d[pid])) { continue; }
      var keep = [], seen = {}, i;
      for (i = 0; i < d[pid].length; i++) {
        var k = String(d[pid][i]);
        if (seen[k]) { removed++; continue; }
        seen[k] = 1;
        keep.push(d[pid][i]);
      }
      d[pid] = keep;
    }
    saveSub(d);
    renderSubGroup();
    renderSubLib();
    subMetaRefresh();
    wcToast("去重完成：删掉 " + removed + " 条重复字卡");
  }

  /* =========================================================
   * 红包模块（v9）：发送红包 / 详情领取 / 皮肤自定义
   *   - 红包皮默认跟随外观主题：底色取主题强调色提亮的浅色，文字深色
   *   - 可自定义背景色 + 字体色 + 上传图片（图片走媒体库 IndexedDB，key 存皮肤）
   *   - 领取后的红包默认叠加一层 20% 不透明度白色蒙层，金额 + 祝福语仍展示
   * ========================================================= */
  var RPSKIN_KEY = "snowcrystal.chat.redpack.skin.v1";
  var RPSKIN_KEY_OTHER = "snowcrystal.chat.redpack.skin.other.v1"; /* v101.3：对方红包独立皮肤 */
  var _rpSkinMode = "self"; /* 皮肤设置页当前编辑对象：self=我方 / other=对方 */
  function rpSkinModeKey() { return _rpSkinMode === "other" ? RPSKIN_KEY_OTHER : RPSKIN_KEY; }
  var REDPACK_WISHES = [
    "今晚月色真美，红包也替我亮一下",
    "取次花丛懒回顾，半缘修道半缘君",
    "山有木兮木有枝，心悦君兮君不知",
    "玲珑骰子安红豆，入骨相思知不知",
    "云想衣裳花想容，春风拂槛露华浓",
    "愿我如星君如月，夜夜流光相皎洁",
    "晓看天色暮看云，行也思君，坐也思君",
    "我的心是旷野的鸟，在你眼里找到了天空",
    "你是人间的四月天，笑响点亮了四面风",
    "你来时冬至，但眉上风止，开口是来日方长",
    "世界那么大，只想把这一点点温柔都给你",
    "星河滚烫，你是人间理想",
    "慢慢来，我们还有一生的时间说晚安",
    "今天也想你，刚好红包也顺路",
    "想和你一起看雪，也想把春天留给你",
    "隔着屏幕的拥抱，就先让红包替我送到",
    "风很温柔，花很香，你在心上",
    "往后余生，风雪是你，平淡也是你",
    "你眼中倒映的星河烂漫，是我从不曾见过的世外桃源",
    "岁月静好，是因为有你在身边",
    "但愿人长久，千里共婵娟",
    "所爱隔山海，山海皆可平",
    "一屋两人，三餐四季，愿你都在",
    "山水一程，三生有幸",
    "遇到你，是我所有好运的开始",
    "亲爱的，这枚小红包请你收下，日子要甜甜的",
    "愿你今天也被温柔以待",
    "红纸包住的不是钱，是我想你的零钱",
    "把好运分成很多份，这一份先给你",
    "特别的日子，特别的你，都值得被好好对待"
  ];
  /* v101.6：聊天兜底回复文案 —— 字卡库为空且 Emoji / 颜文字混入均未命中时，
     自动回复 / 继续发送也能产出一条通用回复，杜绝「继续发送没反应、要连点好几遍」 */
  var WCL_REPLY_FALLBACK = [
    "嗯嗯～",
    "好的呀",
    "哈哈，收到",
    "在的～",
    "真不错",
    "嘿嘿",
    "好耶",
    "有道理"
  ];
  function replyFallbackText(partnerId) {
    pushOther(partnerId, { msgType: "text", text: pick(WCL_REPLY_FALLBACK) || "嗯嗯～" });
  }
  /* v101.5：对方红包金额 —— 金额无上限（特殊数字 / 小额 / 大额按比例随机）
   * 此前该函数被调用处遗漏定义，导致对方红包混入分支抛 ReferenceError，
   * 进而使 doAutoReply 整条回复链路中断（对方不回消息 / 继续发送无反应）。 */
  function rpOtherAmount() {
    var r = Math.random() * 100;
    if (r < 25) {
      /* 特殊数字：谐音/纪念日/整数浪漫金额 */
      var specials = [0.52, 5.2, 5.21, 6.66, 8.88, 9.99, 13.14, 52, 66.6, 66.66, 88.8, 88.88, 99.9, 131.4, 520, 1314];
      return pick(specials);
    }
    if (r < 70) {
      /* 小额：0.01 - 19.99，保留两位小数 */
      return Math.round((0.01 + Math.random() * 19.98) * 100) / 100;
    }
    /* 大额：20 - 99999，金额无上限（按比例随机，避免整数溢出） */
    return Math.round((20 + Math.random() * 99979) * 100) / 100;
  }
  function fmtRpAmount(a) {
    var n = Number(a) || 0;
    if (n >= 100000000) {
      var yi = Math.floor(n / 100000000);
      var restWan = Math.round((n - yi * 100000000) / 10000);
      return yi + "亿+" + restWan + "万";
    }
    return n.toFixed(2);
  }
  /* v100：金额文字大小自适应 —— 金额越长字号越小，避免撑破固定红包卡片 */
  function rpAmountFontSize(txt) {
    var len = String(txt || "").length;
    if (len > 12) { return 13; }
    if (len > 9) { return 16; }
    if (len > 6) { return 19; }
    return 24;
  }
  function loadRedpackSkin(key) {
    var k = key || RPSKIN_KEY;
    var s = null;
    try { s = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { s = null; }
    if (!s || typeof s !== "object") { s = {}; }
    return { bg: String(s.bg || ""), fg: String(s.fg || ""), img: String(s.img || ""), status: String(s.status || "") };
  }
  function saveRedpackSkin(s, key) {
    var k = key || RPSKIN_KEY;
    try { localStorage.setItem(k, JSON.stringify(s || {})); } catch (e) { /* 皮肤保存失败不影响聊天 */ }
  }
  function lightenHex(hex, t) {
    var h = String(hex || "").replace("#", "");
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    if (h.length !== 6) { return "#ffddea"; }
    var n = parseInt(h, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * t); g = Math.round(g + (255 - g) * t); b = Math.round(b + (255 - b) * t);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  /* 红包皮配色：未自定义时跟随外观主题（强调色提亮浅色底 + 深色字） */
  /* v101.3：key 参数区分我方/对方皮肤，不传默认我方 */
  function redpackBgFg(key) {
    var skin = loadRedpackSkin(key);
    var accent = "";
    try {
      var cs = getComputedStyle(document.documentElement);
      accent = String(cs.getPropertyValue("--accent")).replace(/^\s+|\s+$/g, "");
    } catch (e) { accent = ""; }
    if (!/^#[0-9a-fA-F]{3,8}$/.test(accent)) { accent = "#e86aa0"; }
    return {
      bg: skin.bg || lightenHex(accent, 0.44),
      fg: skin.fg || "#1b2233",
      img: skin.img,
      status: skin.status || "#000000"
    };
  }
  function rpIconSvg(size) {
    return '<svg class="chat-rp-ico" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true"><path d="M5 4.5h14c1.1 0 2 .9 2 2v2H3v-2c0-1.1.9-2 2-2zm-2 6h18v7c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-7zm6.5 2.5a2 2 0 1 0 0 4h5a2 2 0 1 0 0-4h-5z"/></svg>';
  }
  /* 聊天列表里的红包卡片（点开详情弹窗；已领取叠加白色蒙层）
     v101.3：对方红包用独立的“对方红包皮”，未领取也显示自定义皮 */
  function redpackCardHtml(m, isSelf, partnerId, set) {
    var bf = isSelf ? redpackBgFg() : redpackBgFg(RPSKIN_KEY_OTHER);
    var opened = !!m.opened;
    var status = opened ? "已领取" : (isSelf ? "待领取" : "点开看看");
    /* v101.4：皮肤图优先用内存缓存内联 src，首帧即显示自定义皮；
       缓存未命中再走 data-src 异步解析（loadStickerImgs） */
    var imgEl = "";
    if (bf.img) {
      var _cached = mediaCacheGet(bf.img);
      imgEl = _cached
        ? '<img class="chat-rp-card-bg" src="' + esc(_cached) + '" alt="">'
        : '<img class="chat-rp-card-bg" data-src="' + esc(bf.img) + '" alt="">';
    }
    return '<div class="chat-bubble chat-bubble-rp' + (opened ? " is-opened" : "") + '" data-rp-mid="' + esc(m.id || "") + '" ' +
      'style="background-color:' + bf.bg + ';color:' + bf.fg + '" role="button" tabindex="0" ' +
      'onclick="SnowCrystal.Chat.openRedpack(\'' + esc(String(m.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">' +
      imgEl +
      '<span class="chat-rp-main">' +
      '<span class="chat-rp-ico">' + rpIconSvg(44) + "</span>" +
      '<span class="chat-rp-body">' +
      '<span class="chat-rp-amount" style="font-size:' + rpAmountFontSize(fmtRpAmount(m.amount)) + 'px">¥' + fmtRpAmount(m.amount) + "</span>" +
      '<span class="chat-rp-wish">' + esc(m.wish || "") + "</span>" +
      "</span></span>" +
      '<span class="chat-rp-status" style="color:' + bf.status + '">' + status + "</span>" +
      "</div>";
  }
  /* 弹窗容器（复用：发送 / 详情共用） */
  function rpEnsureModal() {
    var mask = document.getElementById("rpModalMask");
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "rp-modal-mask";
      mask.id = "rpModalMask";
      mask.innerHTML = '<div class="rp-modal" id="rpModalBody"></div>';
      mask.addEventListener("click", function (e) { if (e.target === mask) { closeRedpackModal(); } });
      document.body.appendChild(mask);
    }
    return mask;
  }
  function rpOpenModal(html) {
    var mask = rpEnsureModal();
    var body = document.getElementById("rpModalBody");
    if (body) { body.innerHTML = html; }
    mask.classList.add("is-open");
    /* v100：弹窗内红包皮背景图解析（发送预览/领取详情统一生效） */
    if (body) {
      var bgs = body.querySelectorAll("img.rp-preview-bg[data-src]");
      for (var bi = 0; bi < bgs.length; bi++) {
        (function (el) {
          var src = el.getAttribute("data-src") || "";
          resolveImg(src, function (url) { if (url) { el.src = url; } });
        })(bgs[bi]);
      }
    }
    var inp = mask.querySelector("input.rp-input, input[type=number]");
    if (inp) { setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60); }
  }
  function closeRedpackModal() {
    var mask = document.getElementById("rpModalMask");
    if (mask) { mask.classList.remove("is-open"); }
  }
  /* 发送红包：加号面板「红包」按钮 */
  function openRedpackSend() {
    if (!state.partnerId) { return; }
    var bf = redpackBgFg();
    /* v101.4：打开发送弹窗即预热皮肤图（写入内存缓存），发送后聊天卡片首帧即显示自定义皮 */
    if (bf.img) { resolveImg(bf.img, function () {}); }
    var imgEl = "";
    if (bf.img) {
      var _cached = mediaCacheGet(bf.img);
      imgEl = _cached
        ? '<img class="rp-preview-bg" src="' + esc(_cached) + '" alt="">'
        : '<img class="rp-preview-bg" data-src="' + esc(bf.img) + '" alt="">';
    }
    rpOpenModal(
      '<div class="rp-modal-head">发红包</div>' +
      '<div class="rp-preview" id="rpSendPreview" style="background-color:' + bf.bg + ';color:' + bf.fg + '">' + imgEl +
      '<span class="rp-preview-main">' +
      '<span class="rp-preview-ico">' + rpIconSvg(46) + "</span>" +
      '<span class="rp-preview-body">' +
      '<span class="rp-preview-amt" id="rpSendPreviewAmt">¥0.00</span>' +
      '<span class="rp-preview-wish" id="rpSendPreviewWish">输入金额与祝福语</span>' +
      "</span></span></div>" +
      '<div class="rp-field"><label>金额（元）</label>' +
      '<input class="rp-input" id="rpSendAmount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="任意金额" ' +
      'oninput="SnowCrystal.Chat.rpSendPreviewRefresh()"></div>' +
      '<div class="rp-field"><label>祝福语</label>' +
      '<div class="rp-row" style="margin-top:0"><input class="rp-input" id="rpSendWish" type="text" maxlength="40" placeholder="想说点什么呢？" ' +
      'oninput="SnowCrystal.Chat.rpSendPreviewRefresh()">' +
      '<button class="rp-random-btn" type="button" onclick="SnowCrystal.Chat.rpSendWishRandom()">随机</button></div></div>' +
      '<div class="rp-row">' +
      '<button class="rp-btn rp-btn-cancel" type="button" onclick="SnowCrystal.Chat.closeRedpackModal()">取消</button>' +
      '<button class="rp-btn rp-btn-main" type="button" onclick="SnowCrystal.Chat.sendRedpack()">塞进红包</button>' +
      "</div>"
    );
  }
  function rpSendPreviewRefresh() {
    var amtEl = document.getElementById("rpSendPreviewAmt");
    var wishEl = document.getElementById("rpSendPreviewWish");
    var amtInp = document.getElementById("rpSendAmount");
    var wishInp = document.getElementById("rpSendWish");
    if (amtEl) {
      var v = Number(amtInp ? amtInp.value : 0) || 0;
      amtEl.textContent = "¥" + fmtRpAmount(v);
      amtEl.style.fontSize = rpAmountFontSize("¥" + fmtRpAmount(v)) + "px";
    }
    if (wishEl) { wishEl.textContent = String(wishInp ? wishInp.value : "").replace(/^\s+|\s+$/g, "") || "输入金额与祝福语"; }
  }
  function rpSendWishRandom() {
    var inp = document.getElementById("rpSendWish");
    if (!inp) { return; }
    inp.value = pick(REDPACK_WISHES);
    rpSendPreviewRefresh();
  }
  function sendRedpack() {
    if (!state.partnerId) { return; }
    /* v101.4：发送前预热皮肤图，保证推送渲染时缓存命中、立即显示自定义皮 */
    var _bfPre = redpackBgFg();
    if (_bfPre.img) { resolveImg(_bfPre.img, function () {}); }
    var amtInp = document.getElementById("rpSendAmount");
    var wishInp = document.getElementById("rpSendWish");
    var amount = Math.round((Number(amtInp ? amtInp.value : 0) || 0) * 100) / 100;
    if (!(amount >= 0.01)) { wcToast("金额至少 0.01 元"); if (amtInp) { amtInp.focus(); } return; }
    var wish = String(wishInp ? wishInp.value : "").replace(/^\s+|\s+$/g, "") || pick(REDPACK_WISHES);
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "redpack", amount: amount, wish: String(wish).slice(0, 40), time: now(), read: true, text: "[红包]" };
    closeRedpackModal();
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, "[红包] ¥" + fmtRpAmount(amount), now());
    renderMessages(state.partnerId, true);
    chatPlaySend();
    scheduleRedpackCollect(state.partnerId, msg.id);
    scheduleReply();
    updateSendBtn();
  }
  /* 我方发出的红包：过一会儿标记为「对方已领取」（定时，3-6 秒随机） */
  function scheduleRedpackCollect(partnerId, msgId) {
    var delay = randInt(3000, 6000);
    if (state.readTimers["rp" + msgId]) { clearTimeout(state.readTimers["rp" + msgId]); }
    state.readTimers["rp" + msgId] = setTimeout(function () {
      delete state.readTimers["rp" + msgId];
      var c = loadChat();
      var list = c.messages[partnerId] || [];
      var changed = false, i;
      for (i = 0; i < list.length; i++) {
        if (list[i].id === msgId && list[i].msgType === "redpack" && list[i].type === "self" && !list[i].opened) {
          list[i].opened = true;
          var pnames = loadPartners(), jj, pp = null;
          for (jj = 0; jj < pnames.length; jj++) { if (pnames[jj].id === partnerId) { pp = pnames[jj]; break; } }
          list[i].collectedBy = (pp && pp.name) || "对方";
          list[i].collectedAt = now();
          changed = true;
          break;
        }
      }
      if (changed) {
        saveChat(c);
        if (state.partnerId === partnerId) { renderMessages(partnerId, false); }
        var s = loadSettings();
        if (s && s.soundEnabled !== false) { try { playSound(loadSound().receive, null); } catch (e) {} }
      }
    }, delay);
  }
  /* 打开红包详情：他人红包可点击领取，领取后叠加白蒙层 */
  function openRedpack(mid) {
    if (!state.partnerId) { return; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var i, m = null;
    for (i = list.length - 1; i >= 0; i--) { if (list[i].id === mid) { m = list[i]; break; } }
    if (!m || m.msgType !== "redpack") { wcToast("红包不存在或已失效"); return; }
    var partners = loadPartners(), j, p = null;
    for (j = 0; j < partners.length; j++) { if (partners[j].id === state.partnerId) { p = partners[j]; break; } }
    var my = loadMy();
    var sender = m.type === "self" ? ((my && my.name) || "我") : ((p && p.name) || "对方");
    /* v101.3：详情弹窗按发送方使用对应红包皮（对方红包用对方皮） */
    var bf = m.type === "self" ? redpackBgFg() : redpackBgFg(RPSKIN_KEY_OTHER);
    /* v101.4：详情弹窗预览同样优先用内存缓存内联 src，已缓存立即显示 */
    var imgEl = "";
    if (bf.img) {
      var _cached = mediaCacheGet(bf.img);
      imgEl = _cached
        ? '<img class="rp-preview-bg" src="' + esc(_cached) + '" alt="">'
        : '<img class="rp-preview-bg" data-src="' + esc(bf.img) + '" alt="">';
    }
    var stateTxt = "";
    var btn = "";
    if (m.type === "other" && !m.opened) {
      stateTxt = "来自 " + sender + " 的红包";
      btn = '<button class="rp-btn rp-btn-main" type="button" onclick="SnowCrystal.Chat.collectRedpack(\'' + esc(String(mid).replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">领取红包</button>';
    } else if (m.type === "other") {
      stateTxt = "已领取来自 " + sender + " 的红包";
    } else if (m.opened) {
      stateTxt = "对方已领取";
    } else {
      stateTxt = "对方还没领取";
    }
    rpOpenModal(
      '<div class="rp-modal-head">红包</div>' +
      '<div class="rp-preview" style="background-color:' + bf.bg + ';color:' + bf.fg + '">' + imgEl +
      '<span class="rp-preview-main">' +
      '<span class="rp-preview-ico">' + rpIconSvg(46) + "</span>" +
      '<span class="rp-preview-body">' +
      '<span class="rp-preview-amt" style="font-size:' + rpAmountFontSize("¥" + fmtRpAmount(m.amount)) + 'px">¥' + fmtRpAmount(m.amount) + "</span>" +
      '<span class="rp-preview-wish">' + esc(m.wish || "") + "</span>" +
      "</span></span></div>" +
      '<div class="rp-preview-from">' + esc(stateTxt) + "</div>" +
      (m.opened && m.collectedAt ? '<div class="rp-preview-detail"><span>领取人：' + esc(m.collectedBy || (m.type === "self" ? _rpPartnerName() : ((my && my.name) || "我"))) + "</span><span>领取时间：" + esc(fmtTime(m.collectedAt, "datetime")) + "</span></div>" : "") +
      (btn ? '<div class="rp-row">' + btn + '<button class="rp-btn rp-btn-ghost" type="button" onclick="SnowCrystal.Chat.closeRedpackModal()">先存着</button></div>' : "")
    );
  }
  function collectRedpack(mid) {
    if (!state.partnerId) { return; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var i, m = null;
    for (i = 0; i < list.length; i++) { if (list[i].id === mid) { m = list[i]; break; } }
    if (!m || m.msgType !== "redpack" || m.type !== "other") { return; }
    if (m.opened) { closeRedpackModal(); return; }
    m.opened = true;
    var my = loadMy();
    m.collectedBy = (my && my.name) || "我";
    m.collectedAt = now();
    saveChat(c);
    closeRedpackModal();
    renderMessages(state.partnerId, false);
    wcToast("已领取红包 ¥" + fmtRpAmount(m.amount));
  }
  /* ---- 红包记录 / 未领取红包（聊天室右上角菜单） ---- */
  function _rpRecordList() {
    if (!state.partnerId) { return []; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var out = [], i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && list[i].msgType === "redpack") { out.push(list[i]); }
    }
    out.reverse(); /* 新的在前 */
    return out;
  }
  function _rpPartnerName() {
    var partners = loadPartners(), j, p = null;
    for (j = 0; j < partners.length; j++) { if (partners[j].id === state.partnerId) { p = partners[j]; break; } }
    return (p && p.name) || "对方";
  }
  function _rpSenderName(m) {
    if (m.type === "self") { var my = loadMy(); return (my && my.name) || "我"; }
    return _rpPartnerName();
  }
  function _rpStatusInfo(m) {
    if (m.type === "other") { return m.opened ? { text: "已领取", cls: "st-done" } : { text: "可领取", cls: "st-open" }; }
    return m.opened ? { text: "对方已领取", cls: "st-done" } : { text: "对方未领取", cls: "st-mine" };
  }
  function _rpMountWrap() { return document.querySelector(".phone") || document.body; }
  function _rpAppendOverlay(html) {
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    _rpMountWrap().appendChild(wrap.firstChild);
  }
  function closeRpListOverlay(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }
  /* 红包记录：当前对话框全部红包，点击条目查看详情 */
  function openRedpackRecords() {
    if (!state.partnerId) { return; }
    var rows = "";
    var recs = _rpRecordList();
    if (!recs.length) {
      rows = '<div class="rp-rec-empty">暂无红包记录</div>';
    } else {
      var i, m, st, tm;
      for (i = 0; i < recs.length; i++) {
        m = recs[i];
        st = _rpStatusInfo(m);
        tm = m.time ? fmtTime(m.time) : "";
        rows +=
          '<div class="rp-rec-item" onclick="SnowCrystal.Chat.openRedpackFromRecords(\'' + esc(String(m.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">' +
          '<div class="rp-rec-icon">🧧</div>' +
          '<div class="rp-rec-info">' +
          '<div class="rp-rec-name">' + esc(_rpSenderName(m)) + '<span class="rp-rec-time">' + esc(tm) + "</span></div>" +
          '<div class="rp-rec-sub">' + esc(m.wish || "") + "</div></div>" +
          '<div class="rp-rec-amt">¥' + fmtRpAmount(m.amount) + "</div>" +
          '<span class="rp-rec-status ' + st.cls + '">' + st.text + "</span>" +
          "</div>";
      }
    }
    _rpAppendOverlay(
      '<div class="rp-rec-overlay" id="rpRecordsOverlay" onclick="SnowCrystal.Chat.closeRpListOverlay(\'rpRecordsOverlay\')">' +
      '<div class="rp-rec-panel" onclick="event.stopPropagation()">' +
      '<div class="rp-rec-head"><span class="rp-rec-title">红包记录</span>' +
      (recs.length ? '<button class="rp-rec-clear" type="button" onclick="SnowCrystal.Chat.clearRedpackRecords()">清空</button>' : "") +
      '<span class="rp-rec-close" onclick="SnowCrystal.Chat.closeRpListOverlay(\'rpRecordsOverlay\')">✕</span></div>' +
      '<div class="rp-rec-list">' + rows + "</div>" +
      "</div></div>"
    );
  }
  /* v100：清空红包记录（仅删除当前对话框的红包消息，普通聊天消息保留） */
  function clearRedpackRecords() {
    if (!state.partnerId) { return; }
    if (!window.confirm("确定清空当前对话框的全部红包记录吗？")) { return; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var kept = [], i, m;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (m && m.msgType === "redpack") { continue; }
      kept.push(m);
    }
    c.messages[state.partnerId] = kept;
    /* 若最后一条消息是红包被清掉，同步会话列表摘要 */
    var last = kept.length ? kept[kept.length - 1] : null;
    for (i = 0; i < c.chats.length; i++) {
      if (c.chats[i].id === state.partnerId) {
        if (last) { c.chats[i].lastText = msgText(last); c.chats[i].lastTime = last.time || 0; }
        else { c.chats[i].lastText = ""; c.chats[i].lastTime = 0; }
        break;
      }
    }
    saveChat(c);
    renderMessages(state.partnerId);
    renderChatList();
    openRedpackRecords();
    wcToast("红包记录已清空");
  }
  function openRedpackFromRecords(mid) {
    closeRpListOverlay("rpRecordsOverlay");
    openRedpack(mid);
  }
  /* ================= v100：查找聊天记录 ================= */
  function openChatSearch() {
    if (!state.partnerId) { return; }
    var list = (loadChat().messages[state.partnerId] || []).slice().reverse();
    var rows;
    if (!list.length) { rows = '<div class="chat-search-list"><div class="chat-stats-empty">暂无聊天记录</div></div>'; }
    else {
      rows = '<div class="chat-search-input-wrap"><input class="chat-search-input" id="chatSearchInput" type="text" placeholder="搜索聊天记录" oninput="SnowCrystal.Chat.chatSearchFilter(this.value)"></div>' +
        '<div class="chat-search-list">' + chatSearchRows(list, "") + "</div>";
    }
    _rpAppendOverlay(
      '<div class="rp-rec-overlay" id="chatSearchOverlay" onclick="SnowCrystal.Chat.closeRpListOverlay(\'chatSearchOverlay\')">' +
      '<div class="rp-rec-panel" onclick="event.stopPropagation()">' +
      '<div class="rp-rec-head"><span class="rp-rec-title">查找聊天记录</span>' +
      '<span class="rp-rec-close" onclick="SnowCrystal.Chat.closeRpListOverlay(\'chatSearchOverlay\')">✕</span></div>' +
      rows +
      "</div></div>"
    );
    var inp = document.getElementById("chatSearchInput");
    if (inp) { setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60); }
  }
  function chatSearchRows(list, kw) {
    var kwl = String(kw || "").toLowerCase();
    var html = "", i, m, txt, sender, tm;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (!m) { continue; }
      if (m.msgType === "redpack") { txt = "🧧 红包：" + (m.wish || ""); }
      else if (m.img) { txt = "[图片]"; }
      else if (m.voice) { txt = "[语音] " + fmtVoiceDur(m.voiceDur || 0); }
      else if (m.fwdOriginType) { txt = "[转发] " + (m.text || ""); }
      else { txt = m.text || ""; }
      if (kwl && String(txt).toLowerCase().indexOf(kwl) < 0) { continue; }
      sender = m.type === "self" ? "我" : "对方";
      tm = m.time ? fmtTime(m.time) : "";
      html +=
        '<div class="chat-search-item" onclick="SnowCrystal.Chat.chatSearchJump(\'' + esc(String(m.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">' +
        '<div class="chat-search-sender">' + esc(sender) + "<span>" + esc(tm) + "</span></div>" +
        '<div class="chat-search-text">' + esc(txt) + "</div>" +
        "</div>";
    }
    return html || '<div class="chat-stats-empty">没有找到相关消息</div>';
  }
  function chatSearchFilter(v) {
    var box = document.querySelector("#chatSearchOverlay .chat-search-list");
    if (!box || !state.partnerId) { return; }
    var list = (loadChat().messages[state.partnerId] || []).slice().reverse();
    box.innerHTML = chatSearchRows(list, v);
  }
  function chatSearchJump(mid) {
    closeRpListOverlay("chatSearchOverlay");
    if (!state.partnerId) { return; }
    var row = document.querySelector('#chatMessages .chat-msg[data-mid="' + esc(mid) + '"]');
    if (row) {
      try { row.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { row.scrollIntoView(); }
      row.classList.remove("chat-msg-flash");
      void row.offsetWidth;
      row.classList.add("chat-msg-flash");
      setTimeout(function () { row.classList.remove("chat-msg-flash"); }, 1800);
    } else {
      wcToast("该消息不在当前会话");
    }
  }
  /* ================= v100：聊天统计 ================= */
  var _statsCalCursor = null;
  function msgStatText(m) {
    if (!m) { return ""; }
    if (m.msgType === "redpack") { return "红包"; }
    if (m.img) { return "[图片]"; }
    if (m.voice) { return "[语音]"; }
    var t = String(m.text || "").replace(/^\s+|\s+$/g, "");
    if (m.fwdOriginType) { t = "[转发] " + t; }
    return t || "[空白]";
  }
  function topPhrases(map, n) {
    var arr = [], k;
    for (k in map) { if (Object.prototype.hasOwnProperty.call(map, k)) { arr.push({ text: k, n: map[k] }); } }
    arr.sort(function (a, b) { return (b.n - a.n) || String(a.text).localeCompare(String(b.text)); });
    return arr.slice(0, n);
  }
  function statsCalHtml(year, month, list) {
    var weekHead = "<span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>";
    var first = new Date(year, month, 1);
    var days = new Date(year, month + 1, 0).getDate();
    var offset = first.getDay();
    var counts = {}, i, m;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (!m || !m.time) { continue; }
      var d = new Date(m.time);
      if (d.getFullYear() === year && d.getMonth() === month) { counts[d.getDate()] = (counts[d.getDate()] || 0) + 1; }
    }
    var now = new Date();
    var todayK = (now.getFullYear() === year && now.getMonth() === month) ? now.getDate() : -1;
    var headHtml = '<div class="chat-stats-cal-head"><span class="chat-stats-cal-title">' + year + " 年 " + (month + 1) + " 月</span>" +
      '<span class="chat-stats-cal-nav" role="button" onclick="SnowCrystal.Chat.statsCalNav(-1)">‹</span>' +
      '<span class="chat-stats-cal-nav" role="button" onclick="SnowCrystal.Chat.statsCalNav(1)">›</span></div>';
    var grid = "";
    for (i = 0; i < offset; i++) { grid += '<div class="chat-stats-cal-cell is-out"></div>'; }
    for (i = 1; i <= days; i++) {
      var n = counts[i] || 0;
      var cls = "chat-stats-cal-cell" + (todayK === i ? " is-today" : "");
      var bg = "";
      if (n > 0) {
        /* 颜色跟随外观主题：主用 color-mix 混合主题主色（旧浏览器回退 --accent-deep-rgb 静态浅色） */
        var pct = Math.round(Math.min(90, 14 + n * 6));
        bg = ' style="background:rgba(var(--accent-deep-rgb),0.22);background:color-mix(in srgb, var(--accent-deep,#E86AA0) ' + pct + '%, transparent)"';
      }
      grid += '<div class="' + cls + '"' + bg + '><span class="chat-stats-cal-day">' + i + "</span>" +
        (n > 0 ? '<span class="chat-stats-cal-count">' + n + "</span>" : "") + "</div>";
    }
    var totalCells = offset + days;
    while (totalCells % 7 !== 0) { grid += '<div class="chat-stats-cal-cell is-out"></div>'; totalCells++; }
    var legend = '<div class="chat-stats-legend"><span class="chat-stats-legend-label">少</span>' +
      '<span class="chat-stats-legend-bar">' +
      '<i style="background:rgba(var(--accent-deep-rgb),0.22);background:color-mix(in srgb, var(--accent-deep,#E86AA0) 14%, transparent)"></i>' +
      '<i style="background:rgba(var(--accent-deep-rgb),0.28);background:color-mix(in srgb, var(--accent-deep,#E86AA0) 30%, transparent)"></i>' +
      '<i style="background:rgba(var(--accent-deep-rgb),0.34);background:color-mix(in srgb, var(--accent-deep,#E86AA0) 46%, transparent)"></i>' +
      '<i style="background:rgba(var(--accent-deep-rgb),0.42);background:color-mix(in srgb, var(--accent-deep,#E86AA0) 64%, transparent)"></i>' +
      '<i style="background:rgba(var(--accent-deep-rgb),0.50);background:color-mix(in srgb, var(--accent-deep,#E86AA0) 90%, transparent)"></i>' +
      '</span><span class="chat-stats-legend-label">多</span></div>';
    return headHtml + '<div class="chat-stats-cal-grid-head">' + weekHead + '</div><div class="chat-stats-cal-grid">' + grid + "</div>" + legend;
  }
  function statsCalNav(delta) {
    var c = _statsCalCursor || new Date();
    var d = new Date(c.getFullYear(), c.getMonth() + delta, 1);
    _statsCalCursor = d;
    var list = state.partnerId ? (loadChat().messages[state.partnerId] || []) : [];
    var box = document.getElementById("chatStatsCalBox");
    if (box) { box.innerHTML = statsCalHtml(d.getFullYear(), d.getMonth(), list); }
  }
  function openChatStats() {
    if (!state.partnerId) { return; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var myN = 0, otherN = 0, i, m, t, map;
    var myMap = {}, otherMap = {};
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (!m) { continue; }
      if (m.type === "self") { myN++; } else { otherN++; }
      t = msgStatText(m);
      if (!t) { continue; }
      map = m.type === "self" ? myMap : otherMap;
      map[t] = (map[t] || 0) + 1;
    }
    var total = myN + otherN;
    var myTop = topPhrases(myMap, 5);
    var otherTop = topPhrases(otherMap, 5);
    var now = new Date();
    _statsCalCursor = now;
    var sec = function (title, rows) {
      var h = '<div class="chat-stats-sec"><div class="chat-stats-sec-title">' + title + "</div>";
      if (!rows.length) { h += '<div class="chat-stats-empty">暂无数据</div>'; }
      else {
        var j, it;
        for (j = 0; j < rows.length; j++) {
          it = rows[j];
          h += '<div class="chat-stats-top-item"><span class="chat-stats-top-rank' + (j === 0 ? " r1" : "") + '">' + (j + 1) + '</span><span class="chat-stats-top-text">' + esc(it.text) + '</span><span class="chat-stats-top-count">' + it.n + " 次</span></div>";
        }
      }
      return h + "</div>";
    };
    _rpAppendOverlay(
      '<div class="rp-rec-overlay" id="chatStatsOverlay" onclick="SnowCrystal.Chat.closeRpListOverlay(\'chatStatsOverlay\')">' +
      '<div class="rp-rec-panel" onclick="event.stopPropagation()">' +
      '<div class="rp-rec-head"><span class="rp-rec-title">聊天统计</span>' +
      '<span class="rp-rec-close" onclick="SnowCrystal.Chat.closeRpListOverlay(\'chatStatsOverlay\')">✕</span></div>' +
      '<div class="chat-stats-scroll">' +
      '<div class="chat-stats-kpis">' +
      '<div class="chat-stats-kpi"><div class="chat-stats-kpi-num">' + myN + '</div><div class="chat-stats-kpi-label">我发送</div></div>' +
      '<div class="chat-stats-kpi"><div class="chat-stats-kpi-num">' + otherN + '</div><div class="chat-stats-kpi-label">对方发送</div></div>' +
      '<div class="chat-stats-kpi"><div class="chat-stats-kpi-num">' + total + '</div><div class="chat-stats-kpi-label">总消息数</div></div>' +
      "</div>" +
      sec("我方常用语句 TOP5", myTop) +
      sec("对方常用语句 TOP5", otherTop) +
      '<div class="chat-stats-sec chat-stats-cal"><div class="chat-stats-sec-title">每日聊天数量</div><div id="chatStatsCalBox">' + statsCalHtml(now.getFullYear(), now.getMonth(), list) + "</div></div>" +
      "</div></div></div>"
    );
  }
  /* 未领取红包：当前对话框未领取的（对方发来的可领取；我方发出显示等待对方领取），支持一键全领 */
  function openPendingRedpacks() {
    if (!state.partnerId) { return; }
    var recs = _rpRecordList();
    var pend = recs.filter(function (m) { return !m.opened; });
    var collectable = pend.filter(function (m) { return m.type === "other"; });
    var rows = "";
    if (!pend.length) {
      rows = '<div class="rp-rec-empty">当前没有未领取的红包</div>';
    } else {
      var i, m, st, isOther, tm;
      for (i = 0; i < pend.length; i++) {
        m = pend[i];
        isOther = m.type === "other";
        st = _rpStatusInfo(m);
        tm = m.time ? fmtTime(m.time) : "";
        rows +=
          '<div class="rp-rec-item" onclick="SnowCrystal.Chat.collectFromPending(\'' + esc(String(m.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">' +
          '<div class="rp-rec-icon">🧧</div>' +
          '<div class="rp-rec-info">' +
          '<div class="rp-rec-name">来自 ' + esc(_rpSenderName(m)) + '<span class="rp-rec-time">' + esc(tm) + "</span></div>" +
          '<div class="rp-rec-sub">' + esc(m.wish || "") + "</div></div>" +
          '<div class="rp-rec-amt">¥' + fmtRpAmount(m.amount) + "</div>" +
          (isOther
            ? '<button class="rp-rec-btn-collect" type="button" onclick="event.stopPropagation();SnowCrystal.Chat.collectFromPending(\'' + esc(String(m.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")) + '\')">领取</button>'
            : '<span class="rp-rec-status ' + st.cls + '">' + st.text + "</span>") +
          "</div>";
      }
    }
    var foot = (pend.length && collectable.length)
      ? '<div class="rp-rec-foot"><button class="rp-rec-collect-all" type="button" onclick="SnowCrystal.Chat.collectAllPending()">一键全领（' + collectable.length + ' 个）</button></div>'
      : "";
    _rpAppendOverlay(
      '<div class="rp-rec-overlay" id="rpPendingOverlay" onclick="SnowCrystal.Chat.closeRpListOverlay(\'rpPendingOverlay\')">' +
      '<div class="rp-rec-panel" onclick="event.stopPropagation()">' +
      '<div class="rp-rec-head"><span class="rp-rec-title">未领取红包（' + pend.length + ' 个）</span>' +
      '<span class="rp-rec-close" onclick="SnowCrystal.Chat.closeRpListOverlay(\'rpPendingOverlay\')">✕</span></div>' +
      '<div class="rp-rec-list">' + rows + "</div>" + foot +
      "</div></div>"
    );
  }
  /* 点击未领取红包条目：对方发来的直接领取，我方发出的打开详情查看 */
  function collectFromPending(mid) {
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var i, m = null;
    for (i = 0; i < list.length; i++) { if (list[i].id === mid) { m = list[i]; break; } }
    closeRpListOverlay("rpPendingOverlay");
    if (m && m.type === "other") { collectRedpack(mid); }
    else { openRedpack(mid); }
  }
  /* 一键全领：当前对话框所有对方发来的未领取红包 */
  function collectAllPending() {
    if (!state.partnerId) { return; }
    var c = loadChat();
    var list = c.messages[state.partnerId] || [];
    var i, m, n = 0;
    for (i = 0; i < list.length; i++) {
      m = list[i];
      if (m && m.msgType === "redpack" && m.type === "other" && !m.opened) { m.opened = true; n++; }
    }
    if (!n) { wcToast("没有可领取的红包"); return; }
    saveChat(c);
    renderMessages(state.partnerId, false);
    closeRpListOverlay("rpPendingOverlay");
    wcToast("已领取 " + n + " 个红包");
  }

  /* 红包皮肤设置页（美画设置 → 红包皮肤） */
  function openRedpackSkin() { switchPage("redpack-skin"); renderRedpackSkin(); }
  function rpPreviewHtml(bf) {
    var imgEl = "";
    if (bf.img) {
      var _cached = mediaCacheGet(bf.img);
      imgEl = _cached
        ? '<img class="rp-preview-bg" src="' + esc(_cached) + '" alt="">'
        : '<img class="rp-preview-bg" data-src="' + esc(bf.img) + '" alt="">';
    }
    return '<div class="rp-preview" id="rpSkinPreviewBox" style="background-color:' + bf.bg + ';color:' + bf.fg + '">' + imgEl +
      '<span class="rp-preview-main">' +
      '<span class="rp-preview-ico">' + rpIconSvg(46) + "</span>" +
      '<span class="rp-preview-body">' +
      '<span class="rp-preview-amt">¥88.88</span>' +
      '<span class="rp-preview-wish">今天也想你，刚好红包也顺路</span>' +
      "</span></span>" +
      '<span class="rp-preview-state" style="color:' + bf.status + '">待领取</span></div>';
  }
  /* v101.3：皮肤设置页切换 我方/对方 红包皮 */
  function rpSkinMode(mode) {
    _rpSkinMode = mode === "other" ? "other" : "self";
    renderRedpackSkin();
  }
  function renderRedpackSkin() {
    var root = document.getElementById("redpackSkinWrap");
    if (!root) { return; }
    var skin = loadRedpackSkin(rpSkinModeKey());
    var bf = redpackBgFg(rpSkinModeKey());
    var themeMode = !skin.bg && !skin.fg;
    var imgItem = skin.img
      ? '<div class="rp-skin-img-item"><img data-src="' + esc(skin.img) + '" alt=""><button class="rp-skin-file-btn" type="button" onclick="SnowCrystal.Chat.rpSkinClearImg()">移除图片</button></div>'
      : "";
    root.innerHTML =
      '<div class="rp-skin-mode-bar">' +
      '<button type="button" class="rp-skin-mode-btn' + (_rpSkinMode === "self" ? " is-on" : "") + '" onclick="SnowCrystal.Chat.rpSkinMode(\'self\')">我方红包皮</button>' +
      '<button type="button" class="rp-skin-mode-btn' + (_rpSkinMode === "other" ? " is-on" : "") + '" onclick="SnowCrystal.Chat.rpSkinMode(\'other\')">对方红包皮</button>' +
      "</div>" +
      '<div class="rp-skin-preview-wrap">' + rpPreviewHtml(bf) + "</div>" +
      '<p class="rp-skin-note">红包皮默认跟随外观主题（浅色底 + 深色字）。取消「跟随主题」后可自定义背景色与字体色，也可上传图片作为红包皮肤。切换上方标签可分别设置我方与对方发送的红包皮。</p>' +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">跟随主题</span><label class="wc-line-toggle"><input type="checkbox" id="rpSkinTheme"' + (themeMode ? " checked" : "") + ' onchange="SnowCrystal.Chat.rpSkinToggleTheme(this.checked)"><span>使用外观主题配色</span></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">背景颜色</span>' +
      '<span class="rp-skin-color-row"><input type="color" class="custom-color" id="rpSkinBg" value="' + (skin.bg || lightenHex(bf.bg, 0)) + '" onchange="SnowCrystal.Chat.rpSkinSetBg(this.value)"><span class="row-desc" style="margin:0">' + (skin.bg || "跟随主题") + "</span></span></article>" +
      '<article class="row-card chat-set-row"><span class="row-title">字体颜色</span>' +
      '<span class="rp-skin-color-row"><input type="color" class="custom-color" id="rpSkinFg" value="' + (skin.fg || "#1b2233") + '" onchange="SnowCrystal.Chat.rpSkinSetFg(this.value)"><span class="row-desc" style="margin:0">' + (skin.fg || "#1b2233") + "</span></span></article>" +
      '<article class="row-card chat-set-row"><span class="row-title">领取状态颜色</span>' +
      '<span class="rp-skin-color-row"><input type="color" class="custom-color" id="rpSkinStatus" value="' + (skin.status || "#000000") + '" onchange="SnowCrystal.Chat.rpSkinSetStatus(this.value)"><span class="row-desc" style="margin:0">' + (skin.status || "默认黑色") + "</span></span></article>" +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">自定义图片</span><span class="row-desc">上传后将作为红包皮肤底图</span>' +
      '<span style="flex:0 0 auto"><button class="rp-skin-file-btn" type="button" onclick="document.getElementById(\'rpSkinFile\').click()">选择图片</button>' +
      '<input type="file" id="rpSkinFile" accept="image/*" style="display:none" onchange="SnowCrystal.Chat.rpSkinPickImg(this)"></span></article>' +
      imgItem +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">恢复默认</span><label class="wc-line-toggle"><button class="rp-skin-file-btn" type="button" onclick="SnowCrystal.Chat.rpSkinReset()" style="background:transparent;color:var(--accent-deep,#d85f9b)">一键还原</button></label></article>' +
      "</div>";
    /* 异步解析皮肤底图（mediaKey / dataURL） */
    var imgs = root.querySelectorAll("img[data-src]");
    Array.prototype.forEach.call(imgs, function (img) {
      var src = img.getAttribute("data-src") || "";
      if (!src) { img.style.display = "none"; return; }
      resolveImg(src, function (url) { if (url) { img.src = url; } else { img.style.display = "none"; } });
    });
  }
  function rpSkinToggleTheme(on) {
    var skin = loadRedpackSkin(rpSkinModeKey());
    if (on) {
      skin.bg = "";
      skin.fg = "";
      saveRedpackSkin(skin, rpSkinModeKey());
    } else {
      var bgInp = document.getElementById("rpSkinBg");
      var fgInp = document.getElementById("rpSkinFg");
      skin.bg = (bgInp && bgInp.value) ? bgInp.value : lightenHex("#e86aa0", 0.72);
      skin.fg = (fgInp && fgInp.value) ? fgInp.value : "#1b2233";
      saveRedpackSkin(skin, rpSkinModeKey());
    }
    rpSkinSyncThemeUI();
    refreshRpSkinPreview();
    wcToast("已保存");
  }
  /* 自定义颜色选择后：同步「跟随主题」开关与色块取值 */
  function rpSkinSyncThemeUI() {
    var skin = loadRedpackSkin(rpSkinModeKey());
    var t = document.getElementById("rpSkinTheme");
    if (t) { t.checked = !skin.bg && !skin.fg; }
    var bf = redpackBgFg(rpSkinModeKey());
    var bgEl = document.getElementById("rpSkinBg");
    var fgEl = document.getElementById("rpSkinFg");
    if (bgEl) { bgEl.value = skin.bg || bf.bg; }
    if (fgEl) { fgEl.value = skin.fg || "#1b2233"; }
  }
  function rpSkinSetBg(v) {
    var skin = loadRedpackSkin(rpSkinModeKey());
    skin.bg = String(v || "");
    saveRedpackSkin(skin, rpSkinModeKey());
    rpSkinSyncThemeUI();
    refreshRpSkinPreview();
    wcToast("已保存");
  }
  function rpSkinSetFg(v) {
    var skin = loadRedpackSkin(rpSkinModeKey());
    skin.fg = String(v || "");
    saveRedpackSkin(skin, rpSkinModeKey());
    rpSkinSyncThemeUI();
    refreshRpSkinPreview();
    wcToast("已保存");
  }
  /* 领取状态字体颜色：默认黑色，独立于跟随主题 */
  function rpSkinSetStatus(v) {
    var skin = loadRedpackSkin(rpSkinModeKey());
    skin.status = /^#[0-9a-fA-F]{3,8}$/.test(String(v || "")) ? String(v) : "";
    saveRedpackSkin(skin, rpSkinModeKey());
    refreshRpSkinPreview();
    wcToast("已保存");
  }
  function rpSkinPickImg(input) {
    var file = input && input.files && input.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || "");
      /* v100：压缩后按媒体库规范 m_ 前缀入库（旧 rp 前缀无法被 resolveImg 解析，导致上传皮不显示） */
      compressImageDataURL(dataUrl, 1080)
        .then(function (compressed) {
          var key = mediaNewKey();
          return mediaWrite(key, compressed).then(function () { return key; });
        })
        .then(function (key) {
          if (!key) { wcToast("图片保存失败"); return; }
          var skin = loadRedpackSkin(rpSkinModeKey());
          skin.img = key;
          saveRedpackSkin(skin, rpSkinModeKey());
          renderRedpackSkin();
          wcToast("已保存");
        })
        .catch(function () { wcToast("图片保存失败"); });
    };
    reader.readAsDataURL(file);
  }
  function rpSkinClearImg() {
    var skin = loadRedpackSkin(rpSkinModeKey());
    skin.img = "";
    saveRedpackSkin(skin, rpSkinModeKey());
    renderRedpackSkin();
    wcToast("已移除");
  }
  function rpSkinReset() {
    try { localStorage.removeItem(rpSkinModeKey()); } catch (e) {}
    renderRedpackSkin();
    wcToast("已恢复默认");
  }
  function refreshRpSkinPreview() {
    var box = document.getElementById("rpSkinPreviewBox");
    if (!box) { return; }
    var bf = redpackBgFg(rpSkinModeKey());
    box.style.backgroundColor = bf.bg;
    box.style.color = bf.fg;
    var oldImg = box.querySelector("img.rp-preview-bg");
    if (bf.img) {
      if (!oldImg) {
        var img = document.createElement("img");
        img.className = "rp-preview-bg";
        box.insertBefore(img, box.firstChild);
        oldImg = img;
      }
      /* v101.4：已缓存皮肤图直接内联，未缓存走 data-src 异步解析 */
      var _cached = mediaCacheGet(bf.img);
      if (_cached) {
        oldImg.removeAttribute("data-src");
        oldImg.src = _cached;
      } else {
        oldImg.removeAttribute("src");
        oldImg.setAttribute("data-src", bf.img);
        resolveImg(bf.img, function (url) { if (url) { oldImg.src = url; } });
      }
    } else if (oldImg) { oldImg.remove(); }
  }

  /* ---------- 页面：概率设置 ---------- */
  function openProbSettings() { switchPage("prob-settings"); renderProbSettings(); }
  function renderProbSettings() {
    var prob = loadProb();
    var root = document.getElementById("probSettingsWrap");
    if (!root) { return; }
    var html = '<div class="row-list">', i, m, key;
    for (i = 0; i < PROB_META.length; i++) {
      m = PROB_META[i];
      key = m.key;
      html +=
        '<article class="row-card chat-set-row chat-prob-row">' +
        '<span class="chat-prob-main"><span class="row-title">' + m.label + '</span><span class="row-desc">' + m.tip + "</span></span>" +
        '<span class="chat-prob-val" id="probVal_' + key + '">' + (prob[key] || 0) + "%</span>" +
        '<input type="range" class="chat-range" id="prob_' + key + '" min="0" max="100" step="1" value="' + (prob[key] || 0) + '" ' +
        'oninput="SnowCrystal.chatProbDisp(\'' + key + '\',this.value)" onchange="SnowCrystal.chatProbSet(\'' + key + '\',this.value)">' +
        "</article>";
    }
    html += "</div>";
    var set = loadSettings();
    html +=
      '<div class="row-list">' +
      '<article class="row-card chat-set-row chat-prob-row">' +
      '<span class="chat-prob-main"><span class="row-title">对方转发</span><span class="row-desc">对方回复时转发一条历史消息的概率</span></span>' +
      '<span class="chat-prob-val" id="probVal_csForward">' + (set.forward != null ? set.forward : 5) + "%</span>" +
      '<input type="range" class="chat-range" id="csForward" min="0" max="100" step="1" value="' + (set.forward != null ? set.forward : 5) + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'csForward\',this.value)" onchange="SnowCrystal.chatSetNum(\'forward\',this.value)">' +
      "</article>" +
      '<article class="row-card chat-set-row chat-prob-row chat-call-prob-row">' +
      '<span class="chat-prob-main"><span class="row-title">通话触发概率</span><span class="row-desc">对方主动拨来语音 / 视频通话的概率</span></span>' +
      '<span class="chat-prob-val" id="probVal_csCallProb">' + (set.callProb != null ? set.callProb : 50) + "%</span>" +
      '<input type="range" class="chat-range" id="csCallProb" min="0" max="100" step="5" value="' + (set.callProb != null ? set.callProb : 50) + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'csCallProb\',this.value)" onchange="SnowCrystal.chatSetNum(\'callProb\',this.value)">' +
      "</article>" +
      '<article class="row-card chat-set-row chat-prob-row chat-call-prob-row">' +
      '<span class="chat-prob-main"><span class="row-title">对方接通电话概率</span><span class="row-desc">我方拨打时对方接通电话的概率</span></span>' +
      '<span class="chat-prob-val" id="probVal_csCallAcceptProb">' + (set.callAcceptProb != null ? set.callAcceptProb : 60) + "%</span>" +
      '<input type="range" class="chat-range" id="csCallAcceptProb" min="0" max="100" step="1" value="' + (set.callAcceptProb != null ? set.callAcceptProb : 60) + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'csCallAcceptProb\',this.value)" onchange="SnowCrystal.chatSetNum(\'callAcceptProb\',this.value)">' +
      "</article>" +
      '<article class="row-card chat-set-row chat-prob-row chat-call-prob-row">' +
      '<span class="chat-prob-main"><span class="row-title">对方拒接电话概率</span><span class="row-desc">我方拨打时对方拒接电话的概率</span></span>' +
      '<span class="chat-prob-val" id="probVal_csCallRejectProb">' + (set.callRejectProb != null ? set.callRejectProb : 20) + "%</span>" +
      '<input type="range" class="chat-range" id="csCallRejectProb" min="0" max="100" step="1" value="' + (set.callRejectProb != null ? set.callRejectProb : 20) + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'csCallRejectProb\',this.value)" onchange="SnowCrystal.chatSetNum(\'callRejectProb\',this.value)">' +
      "</article>" +
      '<article class="row-card chat-set-row chat-prob-row chat-call-prob-row">' +
      '<span class="chat-prob-main"><span class="row-title">对方未接电话概率</span><span class="row-desc">我方拨打时对方未接电话的概率</span></span>' +
      '<span class="chat-prob-val" id="probVal_csCallMissProb">' + (set.callMissProb != null ? set.callMissProb : 20) + "%</span>" +
      '<input type="range" class="chat-range" id="csCallMissProb" min="0" max="100" step="1" value="' + (set.callMissProb != null ? set.callMissProb : 20) + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'csCallMissProb\',this.value)" onchange="SnowCrystal.chatSetNum(\'callMissProb\',this.value)">' +
      "</article>" +
      "</div>";
    root.innerHTML = html;
  }
  function chatProbDisp(key, v) {
    var el = document.getElementById("probVal_" + key);
    if (el) { el.textContent = v + "%"; }
  }
  function chatProbSet(key, v) {
    var prob = loadProb();
    prob[key] = Math.max(0, Math.min(100, Number(v) || 0));
    saveProb(prob);
    wcToast("已保存");
  }

  /* ---------- 输入区回车 ---------- */
  function onChatInputKey(e) {
    var set = loadSettings();
    if ((e.key || "") === "Enter" && !e.shiftKey && set.enterSend) {
      e.preventDefault();
      sendMessage();
    }
  }
  function bindInput() {
    var inp = document.getElementById("chatInput");
    if (inp && !inp.getAttribute("data-chat-bound")) {
      inp.setAttribute("data-chat-bound", "1");
      inp.addEventListener("keydown", onChatInputKey);
      inp.addEventListener("input", onChatInput);
    }
    updateSendBtn();
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", bindInput); }
  else { bindInput(); }

  /* ---------- 底栏：发送键/加号键 共用最右侧键位（有文字显示发送，无文字显示加号） ---------- */
  function onChatInput() { updateSendBtn(); }
  /* v9：加号/发送 二合一 —— 输入文字时加号键切换为发送键 */
  function updateSendBtn() {
    var inp = document.getElementById("chatInput");
    var plus = document.querySelector(".chat-plus-btn");
    if (!inp || !plus) { return; }
    var hasText = !!String(inp.value || "").replace(/^\s+|\s+$/g, "");
    plus.classList.toggle("is-send", hasText);
    plus.setAttribute("aria-label", hasText ? "发送" : "更多功能");
    plus.title = hasText ? "发送" : "更多功能";
    if (hasText) { closePlusPanel(); closeEmojiPanel(); }
  }
  /* v9：最右键点击 —— 有文字发消息，无文字开加号面板 */
  function onPlusSendTap() {
    var inp = document.getElementById("chatInput");
    var hasText = !!(inp && String(inp.value || "").replace(/^\s+|\s+$/g, ""));
    if (hasText) { sendMessage(); } else { togglePlusPanel(); }
  }

  /* ---------- 底栏：拍一拍（图一手掌键 → 拍一拍面板：拍一拍库 + 自定义输入） ---------- */
  function patPartner() {
    if (!state.partnerId) { return; }
    renderPatPanel();
    var panel = document.getElementById("chatPatPanel");
    var mask = document.getElementById("chatPatMask");
    if (panel) { panel.classList.add("is-open"); panel.setAttribute("aria-hidden", "false"); }
    if (mask) { mask.classList.add("is-open"); }
    var inp = document.getElementById("chatPatInput");
    if (inp) { setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60); }
  }
  function closePatPanel() {
    var panel = document.getElementById("chatPatPanel");
    var mask = document.getElementById("chatPatMask");
    if (panel) { panel.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true"); }
    if (mask) { mask.classList.remove("is-open"); }
  }
  /* v14：内置拍一拍已全部移除，改由「字卡库 → 拍一拍」的「我方拍一拍库」提供 */
  var PAT_SELF_TEMPLATES = [];
  function patOtherHint() { wcToast("对方拍一拍库内容用于对方自动回复混入，不能由我方发送"); }
  function renderPatPanel() {
    var listSelf = document.getElementById("chatPatListSelf");
    var my = loadMy(), partners = loadPartners(), i, p = null;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === state.partnerId) { p = partners[i]; break; } }
    var pName = (p && p.name) || "对方";
    var myName = (my && my.name) || "我";
    /* 我方拍一拍：来自字卡库「我方拍一拍库」，点击由我方发送 */
    var itemsS = patSelfItems();
    var htmlS = "", k, t;
    if (!itemsS || !itemsS.length) {
      htmlS = '<div class="chat-pat-empty">我方拍一拍库暂无内容，可到「字卡库 → 拍一拍」添加</div>';
    } else {
      for (k = 0; k < itemsS.length; k++) {
        t = textOf(itemsS[k]);
        t = String(t).replace(/我方/g, myName).replace(/对方/g, pName).replace(/^\s+|\s+$/g, "");
        htmlS += '<button class="chat-pat-item" type="button" onclick="SnowCrystal.Chat.sendPat(\'' + t.replace(/'/g, "\\'") + '\')">' + esc(t) + "</button>";
      }
    }
    if (listSelf) { listSelf.innerHTML = htmlS; }
  }
  function sendPat(fullText) {
    if (!state.partnerId) { return; }
    closePatPanel();
    sendPatMsg(fullText);
  }
  function sendPatCustom() {
    var inp = document.getElementById("chatPatInput");
    var suffix = inp ? String(inp.value || "").replace(/^\s+|\s+$/g, "") : "";
    if (!suffix) { wcToast("请输入自定义内容"); if (inp) { inp.focus(); } return; }
    var my = loadMy(), partners = loadPartners(), i, p = null;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === state.partnerId) { p = partners[i]; break; } }
    var pName = (p && p.name) || "对方";
    var myName = (my && my.name) || "我";
    closePatPanel();
    if (inp) { inp.value = ""; }
    sendPatMsg(myName + "拍了拍" + pName + "：" + suffix);
  }
  function sendPatMsg(text) {
    if (!state.partnerId) { return; }
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "pat", text: text, time: now(), read: true };
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, text, now());
    renderMessages(state.partnerId, true);
    chatPlaySend();
    scheduleReply();
    updateSendBtn();
  }


  /* ---------- 底栏：表情面板（Emoji / 表情包 双 Tab） ---------- */
  var _emojiTab = "emoji";
  var _emojiGroupIdx = { emoji: 0, sticker: 0 };
  /* vXX：表情面板渲染序号 —— 用于丢弃过期异步渲染（快速连续切换分组时，
     仅最后一次渲染生效，避免旧分组的异步解析结果覆盖新分组） */
  var _emojiRenderSeq = 0;
  function toggleEmojiPanel() {
    var panel = document.getElementById("chatEmojiPanel");
    var mask = document.getElementById("chatEmojiMask");
    var btn = document.querySelector(".chat-emoji-btn");
    if (!panel || !mask) { return; }
    var open = panel.classList.contains("is-open");
    if (!open) { closePlusPanel(); closeChatBgPanel(); closeChatRoomMenu(); renderEmojiBody(_emojiTab); }
    panel.classList.toggle("is-open", !open);
    mask.classList.toggle("is-open", !open);
    if (btn) { btn.setAttribute("aria-expanded", String(!open)); }
  }
  function closeEmojiPanel() {
    var panel = document.getElementById("chatEmojiPanel");
    var mask = document.getElementById("chatEmojiMask");
    var btn = document.querySelector(".chat-emoji-btn");
    if (!panel || !mask) { return; }
    panel.classList.remove("is-open");
    mask.classList.remove("is-open");
    if (btn) { btn.setAttribute("aria-expanded", "false"); }
  }
  function switchEmojiTab(tab) {
    _emojiTab = tab === "sticker" ? "sticker" : "emoji";
    var tabs = document.querySelectorAll(".chat-emoji-tab");
    Array.prototype.forEach.call(tabs, function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab") === _emojiTab); });
    renderEmojiBody(_emojiTab);
  }
  /* 点击分组横栏：切换至对应分组并重渲染当前内容 */
  function switchEmojiGroup(tab, idx) {
    var key = tab === "sticker" ? "sticker" : "emoji";
    var grps = key === "sticker" ? stickerGroups() : emojiGroups();
    if (!grps[idx]) { return; }
    _emojiGroupIdx[key] = idx;
    renderEmojiBody(key);
  }
  /* 表情面板内容渲染：上方横向分组栏 + 当前分组网格（一行 5 个） */
  function renderEmojiBody(tab) {
    var body = document.getElementById("chatEmojiBody");
    if (!body) { return; }
    var seq = ++_emojiRenderSeq;
    var key = tab === "sticker" ? "sticker" : "emoji";
    var grps = key === "sticker" ? stickerGroups() : emojiGroups();
    var hasItems = false, g;
    for (g = 0; g < grps.length; g++) {
      if ((grps[g] || {}).items && grps[g].items.length) { hasItems = true; break; }
    }
    if (!hasItems) {
      body.innerHTML = key === "sticker"
        ? '<p class="chat-emoji-empty">暂未配置表情包图片<br>可到「字卡库 → 表情包」中添加</p>'
        : '<p class="chat-emoji-empty">暂未配置 Emoji<br>可到「字卡库 → Emoji」中添加</p>';
      return;
    }
    var idx = _emojiGroupIdx[key];
    if (!grps[idx] || !((grps[idx] || {}).items || []).length) {
      for (g = 0; g < grps.length; g++) { if ((grps[g] || {}).items && grps[g].items.length) { idx = g; break; } }
      _emojiGroupIdx[key] = idx;
    }
    /* 分组横栏：横向滚动，点击切换分组 */
    var bar = '<div class="chat-emoji-groups" role="tablist">';
    for (g = 0; g < grps.length; g++) {
      var grp0 = grps[g] || {};
      if (!(grp0.items || []).length) { continue; }
      bar += '<button class="chat-emoji-group-chip' + (g === idx ? " is-active" : "") + '" type="button" data-tab="' + key + '" data-g="' + g + '" onclick="SnowCrystal.Chat.switchEmojiGroup(\'' + key + '\',' + g + ')">' + esc(grp0.name || "未分组") + "</button>";
    }
    bar += "</div>";
    /* 当前分组网格：全局偏移保持与 emojiItems()/stickerItems() 平铺索引一致 */
    var base = 0;
    for (g = 0; g < idx; g++) { base += ((grps[g] || {}).items || []).length; }
    var grp = grps[idx] || {}, items = grp.items || [], i = base, gi, html = "";
    /* vXX：表情面板 sticker 分组「先解析后渲染」——渲染前把当前分组所有图片解析为
       最终 dataURL（dataURL/外链同步直出；mediaKey 内存缓存命中同步直出，未命中则
       从 IndexedDB 媒体库异步读取），全部就绪后一次性写入带真实 src 的 img；
       异步等待期间仅先更新分组栏，绝不写入无 src 的占位 img，
       彻底消除「点开/切换分组闪一下占位符图（alt 文字/破图）」的闪烁。 */
    function paintEmojiGrid(gridHtml) {
      if (seq !== _emojiRenderSeq) { return; }
      body.innerHTML = bar + gridHtml;
      Array.prototype.forEach.call(body.querySelectorAll(".chat-emoji-item"), function (b) {
        b.addEventListener("click", onEmojiItemClick);
      });
      var chip = body.querySelector(".chat-emoji-group-chip.is-active");
      if (chip && chip.scrollIntoView) {
        try { chip.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e2) { chip.scrollIntoView(); }
      }
    }
    if (key === "sticker") {
      var srcs = [], pend = [], gi2, it2, img2, c;
      for (gi2 = 0; gi2 < items.length; gi2++) {
        it2 = items[gi2];
        img2 = stickerItemImg(it2);
        if (!img2) { srcs.push(""); continue; }
        if (/^data:/i.test(String(img2)) || /^(https?:)?\/\//i.test(String(img2))) { srcs.push(String(img2)); continue; }
        c = mediaCacheGet(img2);
        if (c) { srcs.push(c); continue; }
        srcs.push("");
        if (/^m_[A-Za-z0-9_-]{6,}$/.test(String(img2)) || /^rp[A-Za-z0-9_-]{4,}$/.test(String(img2))) {
          pend.push((function (idx2, mk) { return mediaRead(mk).then(function (d) { if (d) { srcs[idx2] = d; } }); })(gi2, String(img2)));
        }
      }
      function stickerGridHtml() {
        var h = '<div class="chat-emoji-grid">', ii = base, gi4, it4;
        for (gi4 = 0; gi4 < items.length; gi4++, ii++) {
          it4 = items[gi4];
          h += '<button class="chat-emoji-item chat-emoji-img-item" type="button" data-sticker="' + ii + '" title="' + esc(it4.t || it4.k || "表情包") + '">' +
            (srcs[gi4] ? '<img class="chat-emoji-img" src="' + esc(srcs[gi4]) + '" alt="表情包">' : "") + "</button>";
        }
        return h + "</div>";
      }
      if (pend.length) {
        /* vXX：异步取图期间不清空现有网格 —— 之前先 body.innerHTML=bar 会把当前分组
           网格瞬间清空、面板高度塌缩、露出深色遮罩，被感知为「切换分组闪黑」。
           现在保留旧网格直到新网格全部就绪再一次性整体替换，杜绝空白帧；
           仅当 body 尚无任何内容（首次打开）时先渲染分组栏作为过渡。 */
        if (!body.innerHTML.trim()) { body.innerHTML = bar; }
        Promise.all(pend).then(function () {
          if (seq !== _emojiRenderSeq) { return; }
          paintEmojiGrid(stickerGridHtml());
        });
      } else {
        paintEmojiGrid(stickerGridHtml());
      }
    } else {
      html += '<div class="chat-emoji-grid">';
      for (gi = 0; gi < items.length; gi++, i++) {
        var ei = items[gi];
        var k = (ei && (ei.k || ei.text)) || (typeof ei === "string" ? ei : "");
        html += '<button class="chat-emoji-item" type="button" data-emoji="' + i + '" title="' + esc((ei && ei.t) || "") + '">' + esc(k) + "</button>";
      }
      html += "</div>";
      paintEmojiGrid(html);
    }
  }
  /* vXX：原 loadPanelStickerImgs（data-src 懒加载占位机制）已随「先解析后渲染」改造移除 */
  function onEmojiItemClick(e) {
    var b = e.currentTarget;
    if (b.hasAttribute("data-sticker")) {
      var sts = stickerItems(), idx = Number(b.getAttribute("data-sticker"));
      if (sts[idx] && stickerItemImg(sts[idx])) { sendStickerMsg(stickerItemImg(sts[idx])); }
      return;
    }
    if (b.hasAttribute("data-emoji")) {
      var ems = emojiItems(), j = Number(b.getAttribute("data-emoji")), it = ems[j];
      var k = (it && (it.k || it.text)) || (typeof it === "string" ? it : "");
      var inp = document.getElementById("chatInput");
      if (inp && k) {
        inp.value = (inp.value || "") + k;
        var pnl = document.getElementById("chatEmojiPanel");
        if (pnl && pnl.classList.contains("is-open")) { try { inp.blur(); } catch (err) { } } else { inp.focus(); }
        updateSendBtn();
      }
    }
  }
  function sendStickerMsg(img) {
    if (!state.partnerId || !img) { return; }
    /* v121：预热提前到 push/渲染之前发起 —— 面板路径（先解析后渲染）通常已命中缓存，此处兜底确保
       渲染时 mediaCacheGet 尽可能命中，配合 msgHtml 直渲达到「点击即显示」 */
    resolveImg(img, function (url) { if (url) { _chatMediaPut(img, url); } });
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "sticker", img: img, text: "", time: now(), read: false };
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, "[表情包]", now());
    renderMessages(state.partnerId, true);
    chatPlaySend();
    scheduleReadReceipt(msg.id);
    scheduleReply();
  }

  /* ---------- 底栏：加号功能面板（独立底部菜单，与顶栏雪花键菜单互不绑定） ---------- */
  function togglePlusPanel() {
    var panel = document.getElementById("chatPlusPanel");
    var mask = document.getElementById("chatPlusMask");
    var btn = document.querySelector(".chat-plus-btn");
    if (!panel || !mask) { return; }
    var open = panel.classList.contains("is-open");
    if (!open) { closeEmojiPanel(); closeChatBgPanel(); closeChatRoomMenu(); }
    panel.classList.toggle("is-open", !open);
    mask.classList.toggle("is-open", !open);
    if (btn) { btn.classList.toggle("is-active", !open); btn.setAttribute("aria-expanded", String(!open)); }
  }
  function closePlusPanel() {
    var panel = document.getElementById("chatPlusPanel");
    var mask = document.getElementById("chatPlusMask");
    var btn = document.querySelector(".chat-plus-btn");
    if (!panel || !mask) { return; }
    panel.classList.remove("is-open");
    mask.classList.remove("is-open");
    if (btn) { btn.classList.remove("is-active"); btn.setAttribute("aria-expanded", "false"); }
  }
  function onPlusItemClick(e) {
    var b = e && e.currentTarget;
    var action = b ? b.getAttribute("data-action") : "";
    var names = { album: "相册", camera: "拍照", file: "文件", location: "位置" };
    if (action === "wallpaper") {
      /* v5：加号面板「壁纸」入口 → 打开更换壁纸面板 */
      closePlusPanel();
      SnowCrystal.Chat.openChatBgPanel();
      return;
    }
    wcToast("「" + (names[action] || "该功能") + "」功能开发中，敬请期待");
    closePlusPanel();
  }

  /* ---------- 顶栏雪花键：菜单栏开合 ---------- */
  function toggleChatRoomMenu() {
    var menu = document.getElementById("chatRoomMenu");
    var mask = document.getElementById("chatRoomMenuMask");
    var btn = document.querySelector(".chat-room-snow-btn");
    if (!menu || !mask) { return; }
    var open = menu.classList.contains("is-open");
    if (!open) { closeEmojiPanel(); closePlusPanel(); closeChatBgPanel(); syncChatPinLabel(); }
    menu.classList.toggle("is-open", !open);
    mask.classList.toggle("is-open", !open);
    if (btn) { btn.setAttribute("aria-expanded", String(!open)); }
  }
  /* v100：置顶 / 取消置顶当前对话 */
  function toggleChatPin() {
    if (!state.partnerId) { return; }
    var c = loadChat(), i;
    for (i = 0; i < c.chats.length; i++) {
      if (c.chats[i].id === state.partnerId) {
        c.chats[i].pinned = !c.chats[i].pinned;
        saveChat(c);
        renderChatList();
        syncChatPinLabel();
        wcToast(c.chats[i].pinned ? "已置顶该聊天" : "已取消置顶");
        return;
      }
    }
    /* 尚无会话条目则先创建再置顶 */
    var partners = loadPartners(), p = null, j;
    for (j = 0; j < partners.length; j++) { if (partners[j].id === state.partnerId) { p = partners[j]; break; } }
    if (!p) { return; }
    upsertChat(p);
    var c2 = loadChat();
    for (i = 0; i < c2.chats.length; i++) {
      if (c2.chats[i].id === state.partnerId) { c2.chats[i].pinned = true; break; }
    }
    saveChat(c2);
    renderChatList();
    syncChatPinLabel();
    wcToast("已置顶该聊天");
  }
  function syncChatPinLabel() {
    var el = document.getElementById("chatRoomMenuPinLabel");
    if (!el) { return; }
    var pinned = false;
    if (state.partnerId) {
      var c = loadChat(), i;
      for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === state.partnerId) { pinned = !!c.chats[i].pinned; break; } }
    }
    el.textContent = pinned ? "取消置顶" : "置顶聊天";
  }
  function closeChatRoomMenu() {
    var menu = document.getElementById("chatRoomMenu");
    var mask = document.getElementById("chatRoomMenuMask");
    var btn = document.querySelector(".chat-room-snow-btn");
    if (!menu || !mask) { return; }
    menu.classList.remove("is-open");
    mask.classList.remove("is-open");
    if (btn) { btn.setAttribute("aria-expanded", "false"); }
  }

  /* ---------- 更换聊天背景：内置背景面板（选中实时切换 .chat-room-body 并 localStorage 持久化） ---------- */
  var CHAT_BG_KEY = "snowcrystal.chat.roomBg";
  var CHAT_BGS = [
    { id: "snow",   name: "雪夜" },
    { id: "mist",   name: "晨雾" },
    { id: "mint",   name: "薄荷" },
    { id: "dawn",   name: "霞光" },
    { id: "starry", name: "星幕" },
    { id: "paper",  name: "纸白" },
    { id: "ice",    name: "冰蓝" },
    { id: "dusk",   name: "暮蓝" }
  ];
  function openChatBgPanel() {
    var panel = document.getElementById("chatBgPanel");
    var mask = document.getElementById("chatBgMask");
    if (!panel || !mask) { return; }
    var open = panel.classList.contains("is-open");
    if (!open) { closeChatRoomMenu(); closeEmojiPanel(); closePlusPanel(); renderChatBgGrid(); }
    panel.classList.toggle("is-open", !open);
    mask.classList.toggle("is-open", !open);
  }
  function closeChatBgPanel() {
    var panel = document.getElementById("chatBgPanel");
    var mask = document.getElementById("chatBgMask");
    if (!panel || !mask) { return; }
    panel.classList.remove("is-open");
    mask.classList.remove("is-open");
  }
  function renderChatBgGrid() {
    var grid = document.getElementById("chatBgGrid");
    if (!grid) { return; }
    var cur = lsGet(CHAT_BG_KEY) || "";
    var custom = chatBgCustom();
    if (custom) { cur = "__custom"; }
    var html = "", i, b;
    for (i = 0; i < CHAT_BGS.length; i++) {
      b = CHAT_BGS[i];
      html += '<button class="chat-bg-item' + (b.id === cur ? " is-active" : "") + '" type="button" data-bg="' + b.id + '" aria-pressed="' + (b.id === cur ? "true" : "false") + '" onclick="SnowCrystal.Chat.switchChatBg(\'' + b.id + '\')">' +
        '<span class="chat-bg-swatch" data-bg="' + b.id + '"></span>' +
        '<span class="chat-bg-name">' + esc(b.name) + "</span>" +
        "</button>";
    }
    if (custom) {
      html += '<button class="chat-bg-item is-active" type="button" data-bg="__custom" aria-pressed="true" title="点击可更换上传的图片" onclick="SnowCrystal.Chat.chooseChatBgFile()">' +
        '<span class="chat-bg-swatch chat-bg-swatch-custom" style="background-image:url(\'' + custom + '\');background-size:cover;background-position:center;"></span>' +
        '<span class="chat-bg-name">自定义</span>' +
        "</button>";
    }
    grid.innerHTML = html;
    updateChatBgClearBtn();
  }
  function switchChatBg(id) {
    var ok = false, i;
    for (i = 0; i < CHAT_BGS.length; i++) { if (CHAT_BGS[i].id === id) { ok = true; break; } }
    if (!ok) { return; }
    lsSet(CHAT_BG_KEY, id);
    applyChatBg(id);
    renderChatBgGrid();
  }
  /* 沉浸式背景应用：--chat-bg 变量作用于整个聊天室页（顶栏/消息区/底栏统一） */
  function applyChatBg(id) {
    var page = chatRoomPage();
    var box = document.getElementById("chatMessages");
    if (page) {
      if (id) { page.setAttribute("data-bg", id); }
      else { page.removeAttribute("data-bg"); }
      page.style.removeProperty("--chat-bg");
    }
    if (box) {
      if (id) { box.setAttribute("data-bg", id); }
      else { box.removeAttribute("data-bg"); }
    }
  }
  /* 自定义上传背景：base64 存 localStorage + IndexedDB 双保险，优先于内置背景 */
  var CHAT_BG_CUSTOM_KEY = "snowcrystal.chat.roomBgCustom";
  /* ===== 自定义背景持久化升级：IndexedDB 主存 + localStorage 同步兜底（双保险，刷新/重启不丢） ===== */
  var CHAT_BG_IDB_NAME = "snowcrystal-chat";
  var CHAT_BG_IDB_STORE = "bg";
  var CHAT_BG_IDB_KEY = "roomBgCustom";
  function chatBgIdbOpen() {
    return new Promise(function (resolve, reject) {
      try {
        if (!window.indexedDB) { reject(new Error("no-idb")); return; }
        var req = window.indexedDB.open(CHAT_BG_IDB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(CHAT_BG_IDB_STORE)) { db.createObjectStore(CHAT_BG_IDB_STORE); }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error("idb-open-fail")); };
      } catch (err) { reject(err); }
    });
  }
  function chatBgIdbSet(value) {
    return chatBgIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(CHAT_BG_IDB_STORE, "readwrite");
          tx.objectStore(CHAT_BG_IDB_STORE).put(value, CHAT_BG_IDB_KEY);
          tx.oncomplete = function () { db.close(); resolve(); };
          tx.onerror = function () { db.close(); reject(tx.error || new Error("idb-set-fail")); };
        } catch (err) { reject(err); }
      });
    });
  }
  function chatBgIdbGet() {
    return chatBgIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(CHAT_BG_IDB_STORE, "readonly");
          var req = tx.objectStore(CHAT_BG_IDB_STORE).get(CHAT_BG_IDB_KEY);
          req.onsuccess = function () { db.close(); resolve(req.result || ""); };
          req.onerror = function () { db.close(); reject(req.error || new Error("idb-get-fail")); };
        } catch (err) { reject(err); }
      });
    });
  }
  function chatBgIdbDelete() {
    return chatBgIdbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(CHAT_BG_IDB_STORE, "readwrite");
          tx.objectStore(CHAT_BG_IDB_STORE).delete(CHAT_BG_IDB_KEY);
          tx.oncomplete = function () { db.close(); resolve(); };
          tx.onerror = function () { db.close(); reject(tx.error || new Error("idb-del-fail")); };
        } catch (err) { reject(err); }
      });
    });
  }
  function chatBgIdbLoadAndSync() {
    /* 读取优先级：IndexedDB → localStorage → 内置背景；IDB 有值且与 LS 不同则同步回写 */
    chatBgIdbGet().then(function (idbVal) {
      var lsVal = chatBgCustom();
      if (idbVal) {
        if (idbVal !== lsVal) {
          try { lsSet(CHAT_BG_CUSTOM_KEY, idbVal); } catch (err) { /* 忽略 */ }
          applyChatBgCustom(idbVal);
          renderChatBgGrid();
        }
      } else if (lsVal) {
        chatBgIdbSet(lsVal).catch(function () { /* IndexedDB 不可用时回退 localStorage */ });
      }
    }).catch(function () { /* IndexedDB 不可用时回退 localStorage */ });
  }
  function chatRoomPage() {
    return document.querySelector('.page[data-page="chat-room"]');
  }
  function chatBgCustom() {
    return lsGet(CHAT_BG_CUSTOM_KEY);
  }
  function applyChatBgCustom(dataUrl) {
    var page = chatRoomPage();
    if (!page) { return; }
    page.removeAttribute("data-bg");
    page.style.setProperty("--chat-bg", 'url("' + dataUrl + '") center / cover no-repeat');
  }
  function applyStoredChatBg() {
    var custom = chatBgCustom();
    if (custom) { applyChatBgCustom(custom); return; }
    /* localStorage 无自定义背景时，从 IndexedDB 异步恢复（刷新/清缓存后场景） */
    chatBgIdbGet().then(function (idbVal) {
      if (idbVal) {
        try { lsSet(CHAT_BG_CUSTOM_KEY, idbVal); } catch (err) { /* 忽略 */ }
        applyChatBgCustom(idbVal);
        renderChatBgGrid();
        updateChatBgClearBtn();
      } else {
        applyChatBg(lsGet(CHAT_BG_KEY) || "");
      }
    }).catch(function () {
      applyChatBg(lsGet(CHAT_BG_KEY) || "");
    });
  }
  function chooseChatBgFile() {
    var input = document.getElementById("chatBgFileInput");
    if (!input) { return; }
    input.value = "";
    input.click();
  }
  function onChatBgFileChange(e) {
    var input = e && e.target ? e.target : null;
    var file = input && input.files && input.files[0];
    if (!file) { return; }
    if (!/^image\//.test(file.type)) { wcToast("请选择图片文件"); return; }
    /* 不限大小：多大内存的图片都可以上传（大图由 IndexedDB 主存兜底） */
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result || "");
      if (!dataUrl) { wcToast("读取图片失败"); return; }
      /* IndexedDB 主存（无大小限制），localStorage 尽力同步，写不下静默忽略 */
      chatBgIdbSet(dataUrl).catch(function () { /* IDB 不可用时回退 localStorage */ });
      try { lsSet(CHAT_BG_CUSTOM_KEY, dataUrl); } catch (err) { /* 大图超限静默，IDB 已兜底 */ }
      applyChatBgCustom(dataUrl);
      renderChatBgGrid();
      wcToast("自定义背景已应用");
    };
    reader.onerror = function () { wcToast("读取图片失败"); };
    reader.readAsDataURL(file);
  }
  function clearChatBgCustom() {
    try { window.localStorage.removeItem(CHAT_BG_CUSTOM_KEY); } catch (err) { /* 忽略 */ }
    chatBgIdbDelete().catch(function () { /* 忽略 */ });
    applyStoredChatBg();
    renderChatBgGrid();
    wcToast("已恢复默认背景");
  }
  function updateChatBgClearBtn() {
    var btn = document.getElementById("chatBgClearBtn");
    if (!btn) { return; }
    btn.hidden = !chatBgCustom();
  }

  /* ==========================================================
     v98 通话功能（对标拾心界 · 语音/视频 · 来电 · 缩略气泡 · 通话记录）
     ========================================================== */
  var CALL_KEY = "snowcrystal.chat.calls.v1";
  var CALL_BG_KEY = "snowcrystal.chat.callBg.v1";
  var CALL_MINI_KEY = "snowcrystal.chat.callMiniPos.v1";
  var CALL_STATE_KEY = "snowcrystal.chat.callState.v1";
  /* 通话状态持久化恢复判定时限（毫秒）：
     - 振铃/呼叫中（ringing_*）：超过 90 秒视为已失效（原模拟振铃最长约 60 秒）
     - 已接通（connected）：无时长上限，只要连通时间合理即恢复续接 */
  var CALL_RESUME_RINGING_MAX = 90000;
  var CALL_BG_CLASSES = ["call-bg-0", "call-bg-1", "call-bg-2", "call-bg-3", "call-bg-4", "call-bg-5"];
  var CALL_DARK_BGS = [1, 4, 5]; /* 星夜 / 森林 / 极光：深色背景需白字适配 */
  function _loadCallBgPref() {
    var v = lsGet(CALL_BG_KEY);
    var n = Number(v);
    if (v === null || isNaN(n)) { return 0; }
    return Math.max(0, Math.min(CALL_BG_CLASSES.length - 1, n));
  }
  function _isDarkCallBg(n) { return CALL_DARK_BGS.indexOf(Number(n)) >= 0; }
  function _loadMiniPos() {
    var v = lsGet(CALL_MINI_KEY);
    if (v && typeof v === "object" && !isNaN(Number(v.right)) && !isNaN(Number(v.top))) {
      return { right: Number(v.right), top: Number(v.top) };
    }
    return null;
  }
  var callState = {
    kind: "voice", connected: false, seconds: 0, timer: null,
    missTimer: null, simulateTimer: null, bg: _loadCallBgPref(), incomingKind: "voice",
    direction: "out", connectedAt: 0, partnerId: null, startedAt: 0
  };
  function callSvg(path, size, cls, vb) {
    var v = vb || 24;
    return '<svg viewBox="0 0 ' + v + ' ' + v + '" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="currentColor" class="' + (cls || "") + '" aria-hidden="true"><path d="' + path + '"/></svg>';
  }
  /* 通话功能发起按钮（加号面板「通话」）同款图标：Phosphor phone，现代听筒+右侧信号波纹，viewBox 256 */
  var CALL_ICON_WAVE_PATH = "M144.27,45.93a8,8,0,0,1,9.8-5.66,86.22,86.22,0,0,1,61.66,61.66,8,8,0,0,1-5.66,9.8A8.23,8.23,0,0,1,208,112a8,8,0,0,1-7.73-5.93,70.35,70.35,0,0,0-50.33-50.34A8,8,0,0,1,144.27,45.93Zm-2.33,41.8c13.79,3.68,22.65,12.55,26.33,26.34A8,8,0,0,0,176,120a8.23,8.23,0,0,0,2.07-.27,8,8,0,0,0,5.66-9.8c-5.12-19.16-18.5-32.54-37.66-37.66a8,8,0,1,0-4.13,15.46Zm72.43,78.73-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L126.87,168c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L89.54,41.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,24,88c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,214.37,166.46Z";
  var CALL_ICON_PATH = "M6.62,10.79c1.44,2.83,3.76,5.14,6.59,6.59l2.2-2.2c0.27-0.27,0.67-0.36,1.02-0.24c1.12,0.37,2.33,0.57,3.57,0.57c0.55,0,1,0.45,1,1V20c0,0.55-0.45,1-1,1c-9.39,0-17-7.61-17-17c0-0.55,0.45-1,1-1h3.5c0.55,0,1,0.45,1,1c0,1.25,0.2,2.45,0.57,3.57c0.11,0.35,0.03,0.74-0.25,1.02L6.62,10.79z";
  var CALL_VIDEO_PATH = "M17,10.5V7c0-0.55-0.45-1-1-1H4C3.45,6,3,6.45,3,7v10c0,0.55,0.45,1,1,1h12c0.55,0,1-0.45,1-1v-3.5l4,2.5v-9L17,10.5z";
  var CALL_PALETTE_PATH = "M12,22C6.49,22,2,17.51,2,12S6.49,2,12,2s10,4.04,10,10c0,2.21-1.79,4-4,4h-1.5c-0.55,0-1,0.45-1,1c0,0.26,0.1,0.5,0.26,0.68c0.16,0.18,0.24,0.42,0.24,0.68c0,0.55-0.45,1-1,1H12zM6.5,13c0.83,0,1.5-0.67,1.5-1.5S7.33,10,6.5,10S5,10.67,5,11.5S5.67,13,6.5,13zM9.5,8.5C10.33,8.5,11,7.83,11,7S10.33,5.5,9.5,5.5S8,6.17,8,7S8.67,8.5,9.5,8.5zM13,5.5C13.83,5.5,14.5,4.83,14.5,4S13.83,2.5,13,2.5S11.5,3.17,11.5,4S12.17,5.5,13,5.5z";
  var CALL_MINUS_PATH = "M19,13H5v-2h14V13z";
  var CALL_CLOSE_PATH = "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41z";
  var CALL_TRASH_PATH = "M6,19c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V7H6V19zM19,4h-3.5l-1-1h-5l-1,1H5v2h14V4z";
  function callNoticeIconHtml() {
    return callSvg(CALL_ICON_WAVE_PATH, 14, "call-bubble-icon", 256);
  }
  var callRecordsCache = null;
  function callIdbPreload() {
    chatIdbGet(CALL_KEY).then(function (v) { if (Array.isArray(v) && v.length) { callRecordsCache = v; } }).catch(function () {});
  }
  if (typeof window !== "undefined" && window.indexedDB) { callIdbPreload(); }
  function loadCallRecords() {
    var ls = lsGet(CALL_KEY);
    if (Array.isArray(ls) && ls.length) { return ls; }
    /* 回归修复 R2：ls 为空/写失败时回退到 IDB 双写副本，通话记录不因存储异常丢失 */
    return (callRecordsCache && callRecordsCache.length) ? callRecordsCache : (Array.isArray(ls) ? ls : (callRecordsCache || []));
  }
  function saveCallRecords(r) {
    /* 回归修复 R2：通话记录纳入与聊天记录相同的 IDB 双写链路（ls 主通道 + IDB 全量备份），
       ls 写失败（配额满/隐私模式）时 IDB 兜底，重开页面仍可读到记录 */
    var ok = lsTrySet(CALL_KEY, r);
    if (typeof window !== "undefined" && window.indexedDB) {
      chatIdbSet(CALL_KEY, r);
      if (!ok) { callRecordsCache = r; }
    }
  }
  function _callPartner() {
    var pid = callState.partnerId || state.partnerId;
    if (!pid) { return null; }
    var partners = loadPartners(), i;
    for (i = 0; i < partners.length; i++) { if (partners[i].id === pid) { return partners[i]; } }
    return null;
  }
  function _callPartnerName() {
    var p = _callPartner();
    if (p && p.name) { return String(p.name); }
    /* 回归修复 R3：伙伴列表暂不可用时（数据丢失/未加载），回退到已持久化的通话对方名 */
    return (callState && callState.partnerName) ? String(callState.partnerName) : "对方";
  }
  function _buildCallAvatarHtml(cls) {
    var p = _callPartner();
    if (p && p.avatar) { return '<div class="' + cls + '" style="background-image:url(&quot;' + esc(p.avatar) + '&quot;)"></div>'; }
    return '<div class="' + cls + '">' + esc(String(_callPartnerName()).slice(0, 1)) + "</div>";
  }
  /* 账号设置更新头像后的实时同步：缩略气泡 + 通话大面板 + 来电面板 一并刷新，
     不再需要"重新点开通话面板"才看到新头像。JS 直设 style 时不能用 esc（实体不会在 style 中解码），
     仅对双引号做 CSS 字符串转义 */
  function _setAvatarBackground(el, avatar) {
    if (!el) { return; }
    if (avatar) {
      el.style.backgroundImage = 'url("' + String(avatar).replace(/"/g, '\\"') + '")';
      el.textContent = "";
    } else {
      el.style.backgroundImage = "";
      el.textContent = esc(String(_callPartnerName()).slice(0, 1));
    }
  }
  function _refreshCallAvatars() {
    var p = _callPartner();
    var url = p && p.avatar ? p.avatar : "";
    var mini = document.getElementById("call-mini-bubble");
    if (mini) {
      var miniAv = mini.querySelector(".call-mini-avatar");
      if (miniAv) { _setAvatarBackground(miniAv, url); }
    }
    var activeAv = document.querySelector("#call-active-overlay .call-active-avatar");
    if (activeAv) { _setAvatarBackground(activeAv, url); }
    var incomingAv = document.querySelector("#call-incoming-overlay .call-incoming-avatar");
    if (incomingAv) { _setAvatarBackground(incomingAv, url); }
  }
  /* 监听账号设置保存成功（localStorage 持久化成功 / 内存兜底均触发） */
  document.addEventListener("snowcrystal:account-updated", function () {
    try { _refreshCallAvatars(); } catch (e) { /* 忽略 */ }
  });
  function removeCallOverlays() {
    var ids = ["call-incoming-overlay", "call-active-overlay", "call-picker-overlay", "call-history-overlay", "call-mini-bubble"];
    var i, el;
    for (i = 0; i < ids.length; i++) { el = document.getElementById(ids[i]); if (el && el.parentNode) { el.parentNode.removeChild(el); } }
  }
  /* ---- 拨号面板 ---- */
  function openCallPicker() {
    removeCallOverlays();
    try { closePlusPanel(); } catch (e) { /* 忽略 */ }
    var name = _callPartnerName();
    var html =
      '<div class="call-overlay" id="call-picker-overlay" onclick="SnowCrystal.Chat.closeCallPicker()">' +
      '<div class="call-picker-panel" onclick="event.stopPropagation()">' +
      '<div class="call-picker-avatar">' + callSvg(CALL_ICON_PATH, 26, "") + "</div>" +
      '<div class="call-picker-name">' + esc(name) + "</div>" +
      '<div class="call-picker-sub">选择通话方式</div>' +
      '<div class="call-picker-options">' +
      '<div class="call-picker-option" onclick="SnowCrystal.Chat.startCall(\'voice\')">' + callSvg(CALL_ICON_PATH, 22, "") + "<span>语音通话</span></div>" +
      '<div class="call-picker-option" onclick="SnowCrystal.Chat.startCall(\'video\')">' + callSvg(CALL_VIDEO_PATH, 22, "") + "<span>视频通话</span></div>" +
      "</div>" +
      '<div class="call-picker-cancel" onclick="SnowCrystal.Chat.closeCallPicker()">取消</div>' +
      '<div class="call-picker-history" onclick="SnowCrystal.Chat.openCallHistoryPanel()">通话记录</div>' +
      "</div></div>";
    var mount = document.querySelector(".phone") || document.body;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    mount.appendChild(wrap.firstChild);
  }
  function closeCallPicker() {
    var el = document.getElementById("call-picker-overlay");
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }
  /* ---- 发起通话 ---- */
  function startCall(kind) {
    closeCallPicker();
    _beginOutgoingRing(kind, false);
  }
  function _beginOutgoingRing(kind, keepStart) {
    var realKind = kind === "video" ? "video" : "voice";
    callState.kind = realKind;
    callState.connected = false;
    callState.seconds = 0;
    callState.connectedAt = 0;
    callState.direction = "out";
    callState.partnerId = state.partnerId || (keepStart && callState.partnerId) || null;
    callState.startedAt = (keepStart && callState.startedAt) ? callState.startedAt : now();
    _openCallActivePanel(realKind, false);
    _persistCallSave("ringing_out", keepStart);
    var partnerName = _callPartnerName();
    var delay = 2000 + Math.random() * 1500;
    callState.timer = setTimeout(function () {
      var set = loadSettings();
      var pa = Number(set.callAcceptProb != null ? set.callAcceptProb : 60) || 0;
      var pr = Number(set.callRejectProb != null ? set.callRejectProb : 20) || 0;
      var pm = Number(set.callMissProb != null ? set.callMissProb : 20) || 0;
      var total = pa + pr + pm;
      if (total <= 0) { pa = 60; pr = 20; pm = 20; total = 100; }
      var r = Math.random() * total;
      if (r < pa) {
        _beginCallConnected();
        _addCallNotice("通话已接通", realKind);
      } else if (r < pa + pr) {
        _finishCall(true, "rejected", partnerName, "out");
        _addCallNotice("对方拒绝了你的" + (realKind === "video" ? "视频" : "语音") + "通话", realKind);
      } else {
        _finishCall(true, "missed", partnerName, "out");
        _addCallNotice("对方未接听你的" + (realKind === "video" ? "视频" : "语音") + "通话", realKind);
      }
    }, delay);
  }
  function _openCallActivePanel(kind, connected, skipBegin) {
    removeCallOverlays();
    var name = _callPartnerName();
    var statusHtml = connected
      ? '<div class="call-active-status" id="call-active-status">' + (kind === "video" ? "视频通话" : "语音通话") + "中</div>"
      : '<div class="call-active-status" id="call-active-status">' + (kind === "video" ? "视频通话" : "语音通话") + " · 正在呼叫...</div>";
    var timerHtml = connected
      ? '<div class="call-active-timer" id="call-active-timer">' + formatCallDuration(callState.seconds) + "</div>"
      : '<div class="call-active-ring" id="call-active-ring"></div>';
    var html =
      '<div class="call-overlay" id="call-active-overlay">' +
      '<div class="call-active-panel call-bg-' + (callState.bg || 0) + '" id="call-active-panel">' +
      '<div class="call-active-bg"></div>' +
      '<div class="call-active-topbtns">' +
      '<div class="call-bg-btn" onclick="SnowCrystal.Chat.toggleCallBgPicker(event)" title="更换背景">' + callSvg(CALL_PALETTE_PATH, 18, "") + "</div>" +
      '<div class="call-min-btn" onclick="SnowCrystal.Chat.minimizeCall()" title="缩为气泡">' + callSvg(CALL_MINUS_PATH, 20, "") + "</div>" +
      "</div>" +
      '<div class="call-active-content">' +
      _buildCallAvatarHtml("call-active-avatar") +
      '<div class="call-active-name">' + esc(name) + "</div>" +
      statusHtml + timerHtml +
      '<div class="call-actions"><div class="call-btn call-btn-hangup" onclick="SnowCrystal.Chat.hangupCall()">' + callSvg(CALL_ICON_PATH, 22, "") + "</div></div>" +
      "</div></div></div>";
    var mount = document.querySelector(".phone") || document.body;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    mount.appendChild(wrap.firstChild);
    if (connected && !skipBegin) { _beginCallConnected(); }
  }
  function _beginCallConnected() {
    if (callState.timer) { clearTimeout(callState.timer); callState.timer = null; }
    callState.connected = true;
    callState.seconds = 0;
    callState.connectedAt = now();
    var ring = document.getElementById("call-active-ring");
    var timerEl = document.getElementById("call-active-timer");
    if (!timerEl && ring) {
      /* 振铃面板直接接通：把振铃占位替换为计时元素，保证主面板持续显示通话时长 */
      var td = document.createElement("div");
      td.className = "call-active-timer";
      td.id = "call-active-timer";
      td.textContent = "00:00";
      ring.parentNode.replaceChild(td, ring);
      timerEl = td;
    } else if (timerEl) {
      timerEl.style.display = "";
      timerEl.textContent = "00:00";
    }
    var statusEl = document.getElementById("call-active-status");
    if (statusEl) { statusEl.textContent = (callState.kind === "video" ? "视频通话" : "语音通话") + "中"; }
    _startConnectedTimer();
    _persistCallSave("connected", false);
  }
  function _startConnectedTimer() {
    var timerEl = document.getElementById("call-active-timer");
    if (timerEl) { timerEl.textContent = formatCallDuration(callState.seconds); }
    callState.timer = setInterval(function () {
      /* 时长以时间戳差为准：后台/切页被浏览器节流时 setInterval 可能延迟，
         用 connectedAt 重新计算可保证累计时长不丢、不虚增 */
      callState.seconds = Math.max(0, Math.floor((now() - callState.connectedAt) / 1000));
      var el = document.getElementById("call-active-timer");
      if (el) { el.textContent = formatCallDuration(callState.seconds); }
      var miniSt = document.getElementById("call-mini-status");
      if (miniSt) { miniSt.textContent = formatCallDuration(callState.seconds); }
    }, 1000);
  }
  /* 发热专项：后台隐藏时暂停通话秒表 DOM 更新（时长按时间戳差计算，恢复后不丢不虚增），回前台恢复 */
  if (!document.__xjVeCallTimerBound) {
    document.__xjVeCallTimerBound = true;
    document.addEventListener("xj-ve:hidden", function () {
      if (callState.timer) { clearInterval(callState.timer); callState.timer = null; }
    });
    document.addEventListener("xj-ve:visible", function () {
      if (callState.connected && !callState.timer) { _startConnectedTimer(); }
    });
  }
  function formatCallDuration(sec) {
    var s = Math.max(0, Number(sec) || 0);
    var h = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(h) + ":" + p(mm) + ":" + p(ss);
  }
  function _clearCallTimer() {
    if (callState.timer) {
      if (callState.connected) { clearInterval(callState.timer); } else { clearTimeout(callState.timer); }
      callState.timer = null;
    }
  }
  function _finishCall(saveRecord, status, name, direction) {
    _clearCallTimer();
    var duration = callState.connected ? callState.seconds : 0;
    var kind = callState.kind || "voice";
    removeCallOverlays();
    if (saveRecord) { _saveCallRecord(name || _callPartnerName(), kind, status, duration, direction || callState.direction || "out", callState.startedAt || callState.connectedAt || 0); }
    callState.connected = false;
    callState.connectedAt = 0;
    _persistCallClear();
    /* 接通后挂断：在聊天居中位置补一条通话记录时长消息 */
    if (status === "connected") {
      _addCallNotice((kind === "video" ? "视频通话 " : "语音通话 ") + fmtCallDurationText(kind, duration), kind);
    }
  }
  function fmtCallDurationText(kind, sec) {
    var s = Math.max(0, Number(sec) || 0);
    if (kind === "video") { return formatCallDuration(s); }
    var h = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h > 0 ? h + "小时" : "") + mm + "分" + (ss < 10 ? "0" + ss : String(ss)) + "秒";
  }
  /* ---- 通话状态持久化（用于页面关闭/刷新后自动恢复） ---- */
  var callStateCache = null;
  function _persistCallSave(status, keepStart) {
    var prev = lsGet(CALL_STATE_KEY) || callStateCache;
    var t = now();
    var payload = {
      kind: callState.kind || "voice",
      partnerId: callState.partnerId || (prev && prev.partnerId) || null,
      partnerName: _callPartnerName() || (prev && prev.partnerName) || "",
      direction: callState.direction || "out",
      status: status,
      startedAt: (keepStart && prev && prev.startedAt) ? Number(prev.startedAt) : t,
      connectedAt: (status === "connected") ? t : ((keepStart && prev && prev.connectedAt) ? Number(prev.connectedAt) : 0)
    };
    /* 回归修复 R3：通话状态纳入 IDB 双写，ls 写失败（配额满/隐私模式/被清）时仍可恢复通话 */
    var ok = lsTrySet(CALL_STATE_KEY, payload);
    if (typeof window !== "undefined" && window.indexedDB) {
      chatIdbSet(CALL_STATE_KEY, payload);
      if (!ok) { callStateCache = payload; }
    }
  }
  function _persistCallClear() {
    try { window.localStorage.removeItem(CALL_STATE_KEY); } catch (e) { /* ignore */ }
    if (typeof window !== "undefined" && window.indexedDB) { chatIdbSet(CALL_STATE_KEY, null); }
    callStateCache = null;
  }
  function hangupCall() {
    _finishCall(true, callState.connected ? "connected" : "missed", _callPartnerName(), callState.direction || "out");
    startSimulateCallTimer();
  }
  /* ---- 背景切换 ---- */
  function toggleCallBgPicker(e) {
    if (e && e.stopPropagation) { e.stopPropagation(); }
    var panel = document.getElementById("call-active-panel");
    if (!panel) { return; }
    var old = document.getElementById("call-bg-picker");
    if (old) { old.parentNode.removeChild(old); return; }
    var html = '<div class="call-bg-picker" id="call-bg-picker">';
    var i;
    for (i = 0; i < CALL_BG_CLASSES.length; i++) {
      html += '<div class="call-bg-swatch ' + CALL_BG_CLASSES[i] + (callState.bg === i ? " is-on" : "") + '" onclick="SnowCrystal.Chat.setCallBg(' + i + ')"></div>';
    }
    html += "</div>";
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    panel.appendChild(wrap.firstChild);
  }
  function setCallBg(idx) {
    var n = Math.max(0, Math.min(CALL_BG_CLASSES.length - 1, Number(idx) || 0));
    callState.bg = n;
    lsTrySet(CALL_BG_KEY, n);
    var panel = document.getElementById("call-active-panel");
    var i;
    if (panel) {
      for (i = 0; i < CALL_BG_CLASSES.length; i++) { panel.classList.remove(CALL_BG_CLASSES[i]); }
      panel.classList.add(CALL_BG_CLASSES[n]);
    }
    var picker = document.getElementById("call-bg-picker");
    if (picker) { picker.parentNode.removeChild(picker); }
  }
  /* ---- 缩略气泡 ---- */
  var _miniDrag = { startX: 0, startY: 0, moved: false, right: 16, top: 100 };
  function _saveMiniPos(right, top) { lsTrySet(CALL_MINI_KEY, { right: right, top: top }); }
  function miniPointerDown(e) {
    /* 关闭按钮区域不启动拖拽：避免 setPointerCapture 把点击合成事件重定向到气泡本体，导致关闭按钮的 click 永远不触发 */
    var t = e.target;
    if (t && t.closest && t.closest(".call-mini-close")) { return; }
    var b = document.getElementById("call-mini-bubble");
    if (!b) { return; }
    _miniDrag.startX = e.clientX;
    _miniDrag.startY = e.clientY;
    _miniDrag.moved = false;
    _miniDrag.right = parseFloat(b.style.right) || 16;
    _miniDrag.top = parseFloat(b.style.top) || 100;
    if (b.setPointerCapture) { try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
  }
  var _miniDragRaf = 0;
  function miniPointerMove(e) {
    var b = document.getElementById("call-mini-bubble");
    if (!b || !_miniDrag.startX) { return; }
    var dx = e.clientX - _miniDrag.startX, dy = e.clientY - _miniDrag.startY;
    if (!_miniDrag.moved && Math.sqrt(dx * dx + dy * dy) > 3) { _miniDrag.moved = true; }
    if (_miniDrag.moved) {
      /* 发热优化 P1-3：拖拽样式写入合并到 rAF（读写分离），
         一次手势中的多帧 pointermove 只触发一次布局计算 */
      if (_miniDragRaf) { return; }
      _miniDragRaf = requestAnimationFrame(function () {
        _miniDragRaf = 0;
        var nb = document.getElementById("call-mini-bubble");
        if (!nb || !_miniDrag.startX) { return; }
        var mount = nb.parentNode;
        var mw = mount && mount.clientWidth ? mount.clientWidth : window.innerWidth;
        var mh = mount && mount.clientHeight ? mount.clientHeight : window.innerHeight;
        var bw = nb.offsetWidth || 160, bh = nb.offsetHeight || 48;
        var right = Math.min(Math.max(4, _miniDrag.right - dx), Math.max(4, mw - bw - 4));
        var top = Math.min(Math.max(4, _miniDrag.top + dy), Math.max(4, mh - bh - 4));
        nb.style.right = right + "px";
        nb.style.top = top + "px";
      });
    }
  }
  function miniPointerUp() {
    var b = document.getElementById("call-mini-bubble");
    if (b && _miniDrag.moved) {
      var right = parseFloat(b.style.right) || 16, top = parseFloat(b.style.top) || 100;
      _saveMiniPos(right, top);
    }
    _miniDrag.startX = 0;
    _miniDrag.startY = 0;
  }
  function minimizeCall() {
    var overlay = document.getElementById("call-active-overlay");
    if (!overlay) { return; }
    overlay.parentNode.removeChild(overlay);
    var pos = _loadMiniPos();
    var right = pos ? pos.right : 16;
    var top = pos ? pos.top : Math.max(4, (document.querySelector(".phone") || document.body).clientHeight - 174);
    var p = _callPartner();
    var avatarHtml = p && p.avatar
      ? '<div class="call-mini-avatar" style="background-image:url(&quot;' + esc(p.avatar) + '&quot;)"></div>'
      : '<div class="call-mini-avatar">' + esc(String(_callPartnerName()).slice(0, 1)) + "</div>";
    var html =
      '<div class="call-mini-bubble" id="call-mini-bubble" style="right:' + right + "px;top:" + top + 'px"' +
      ' onclick="SnowCrystal.Chat.restoreCall()"' +
      ' onpointerdown="SnowCrystal.Chat.miniPointerDown(event)"' +
      ' onpointermove="SnowCrystal.Chat.miniPointerMove(event)"' +
      ' onpointerup="SnowCrystal.Chat.miniPointerUp(event)"' +
      ' onpointercancel="SnowCrystal.Chat.miniPointerUp(event)">' +
      avatarHtml +
      '<div class="call-mini-info"><div class="call-mini-name">' + esc(_callPartnerName()) + "</div>" +
      '<div class="call-mini-status" id="call-mini-status">' + (callState.connected ? formatCallDuration(callState.seconds) : (callState.kind === "video" ? "视频通话中" : "语音通话中")) + "</div></div>" +
      '<div class="call-mini-close" onclick="event.stopPropagation();SnowCrystal.Chat.hangupCall()">' + callSvg(CALL_ICON_PATH, 11, "") + "</div>" +
      "</div>";
    var mount = document.querySelector(".phone") || document.body;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    mount.appendChild(wrap.firstChild);
  }
  function restoreCall() {
    if (_miniDrag.moved) { _miniDrag.moved = false; _miniDrag.startX = 0; return; }
    var mini = document.getElementById("call-mini-bubble");
    /* 双击/连击保护：气泡已被还原后再次点击直接忽略，防止重复重建面板导致计时重置 */
    if (!mini) { return; }
    if (mini.parentNode) { mini.parentNode.removeChild(mini); }
    /* 还原大面板时保留当前通话计时（skipBegin=true），不再触发 _beginCallConnected 重置时长 */
    _openCallActivePanel(callState.kind, callState.connected, true);
    if (callState.connected && !callState.timer) { _startConnectedTimer(); }
  }
  /* ---- 来电 ---- */
  function _triggerIncomingCall(kind) {
    if (document.getElementById("call-incoming-overlay")) { return; }
    if (document.getElementById("call-active-overlay")) { return; }
    if (document.getElementById("call-mini-bubble")) { return; }
    if (!state.partnerId) { return; }
    var s = loadSettings();
    if (!s.callAllow) { return; }
    removeCallOverlays();
    try { closeChatRoomMenu(); } catch (e) { /* 忽略 */ }
    try { closeEmojiPanel(); } catch (e) { /* 忽略 */ }
    try { closePlusPanel(); } catch (e) { /* 忽略 */ }
    try { closeChatBgPanel(); } catch (e) { /* 忽略 */ }
    _beginIncomingRing(kind, false);
  }
  function _beginIncomingRing(kind, keepStart) {
    var realKind = kind === "video" ? "video" : "voice";
    callState.kind = realKind;
    callState.connected = false;
    callState.seconds = 0;
    callState.connectedAt = 0;
    callState.direction = "in";
    callState.partnerId = state.partnerId || (keepStart && callState.partnerId) || null;
    callState.startedAt = (keepStart && callState.startedAt) ? callState.startedAt : now();
    var p = _callPartner();
    var avatarHtml = p && p.avatar
      ? '<div class="call-incoming-avatar" style="background-image:url(&quot;' + esc(p.avatar) + '&quot;)"></div>'
      : '<div class="call-incoming-avatar">' + esc(String(_callPartnerName()).slice(0, 1)) + "</div>";
    var bgClass = "call-bg-" + (callState.bg || 0) + (_isDarkCallBg(callState.bg) ? " call-bg-dark" : "");
    var html =
      '<div class="call-overlay" id="call-incoming-overlay">' +
      '<div class="call-incoming-panel ' + bgClass + '">' +
      '<div class="call-active-bg"></div>' +
      avatarHtml +
      '<div class="call-incoming-name">' + esc(_callPartnerName()) + "</div>" +
      '<div class="call-incoming-sub" id="call-incoming-sub">邀请你' + (realKind === "video" ? "视频" : "语音") + "通话…</div>" +
      '<div class="call-incoming-actions">' +
      '<div class="call-incoming-btn reject" onclick="SnowCrystal.Chat.rejectIncomingCall()" title="拒绝">' + callSvg(CALL_ICON_PATH, 20, "") + "</div>" +
      '<div class="call-incoming-btn accept" onclick="SnowCrystal.Chat.answerIncomingCall()" title="接听">' + callSvg(CALL_ICON_PATH, 20, "") + "</div>" +
      "</div></div></div>";
    var mount = document.querySelector(".phone") || document.body;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    mount.appendChild(wrap.firstChild);
    _persistCallSave("ringing_in", keepStart);
    callState.missTimer = setTimeout(function () {
      callState.missTimer = null;
      if (!document.getElementById("call-incoming-overlay")) { return; }
      removeCallOverlays();
      _saveCallRecord(_callPartnerName(), callState.kind, "missed", 0, "in", callState.startedAt);
      _addCallNotice(_callPartnerName() + "的" + (callState.kind === "video" ? "视频" : "语音") + "通话未接听", callState.kind);
      _persistCallClear();
    }, 25000 + Math.random() * 35000);
  }
  function answerIncomingCall() {
    if (callState.missTimer) { clearTimeout(callState.missTimer); callState.missTimer = null; }
    var overlay = document.getElementById("call-incoming-overlay");
    if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    callState.connected = false;
    _openCallActivePanel(callState.kind, true);
    _addCallNotice("通话已接通", callState.kind);
  }
  function rejectIncomingCall() {
    if (callState.missTimer) { clearTimeout(callState.missTimer); callState.missTimer = null; }
    removeCallOverlays();
    _saveCallRecord(_callPartnerName(), callState.kind, "rejected", 0, "in", callState.startedAt);
    _addCallNotice("你拒绝了" + _callPartnerName() + "的" + (callState.kind === "video" ? "视频" : "语音") + "通话", callState.kind);
    _persistCallClear();
    startSimulateCallTimer();
  }
  /* ---- 通话系统消息 ---- */
  function _addCallNotice(text, kind) {
    var pid = callState.partnerId || state.partnerId;
    if (!pid) { return; }
    var msg = { id: "c" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "system", msgType: "call", text: text, time: now(), kind: kind || "voice" };
    pushMsg(pid, msg);
    if (state.partnerId === pid) { renderMessages(pid, true); }
  }
  /* ---- 通话记录 ---- */
  function _saveCallRecord(name, kind, status, duration, direction, startedAt) {
    var recs = loadCallRecords();
    recs.unshift({ id: "cr" + now().toString(36) + Math.random().toString(36).slice(2, 7), name: name, kind: kind, status: status, duration: duration || 0, direction: direction || "out", time: now(), startedAt: Number(startedAt) || 0 });
    saveCallRecords(recs);
  }
  function openCallHistoryPanel() {
    var recs = loadCallRecords();
    var rows = "";
    if (!recs.length) {
      rows = '<div class="call-history-empty">暂无通话记录</div>';
    } else {
      var i, r, st, ic, tm;
      for (i = 0; i < recs.length; i++) {
        r = recs[i] || {};
        if (r.status === "connected") { st = (r.duration ? formatCallDuration(r.duration) : "已接通"); ic = "icon-connected"; }
        else if (r.status === "rejected") { st = r.direction === "in" ? "你已拒绝" : "对方已拒绝"; ic = "icon-rejected"; }
        else { st = "未接听"; ic = "icon-missed"; }
        tm = (r.startedAt ? fmtTime(r.startedAt) : (r.time ? fmtTime(r.time) : ""));
        rows +=
          '<div class="call-history-item">' +
          '<div class="call-history-icon ' + ic + '">' + (r.kind === "video" ? callSvg(CALL_VIDEO_PATH, 18, "") : callSvg(CALL_ICON_WAVE_PATH, 18, "", 256)) + "</div>" +
          '<div class="call-history-info"><div class="call-history-name">' + esc(r.name || "对方") + "</div>" +
          '<div class="call-history-status ' + (r.status === "connected" ? "" : r.status) + '">' + (r.direction === "in" ? "← " : "→ ") + st + "</div></div>" +
          '<div class="call-history-time">' + esc(tm) + "</div>" +
          '<div class="call-history-del" onclick="SnowCrystal.Chat.deleteCallRecord(\'' + r.id + '\')" title="删除">' + callSvg(CALL_TRASH_PATH, 14, "") + "</div>" +
          "</div>";
      }
    }
    var html =
      '<div class="call-overlay" id="call-history-overlay" onclick="SnowCrystal.Chat.closeCallHistoryPanel()">' +
      '<div class="call-history-panel" onclick="event.stopPropagation()">' +
      '<div class="call-history-header"><span class="call-history-title">通话记录</span>' +
      '<span class="call-history-clear" onclick="SnowCrystal.Chat.clearCallRecordsAll()">清空</span>' +
      '<span class="call-history-close" onclick="SnowCrystal.Chat.closeCallHistoryPanel()">' + callSvg(CALL_CLOSE_PATH, 14, "") + "</span></div>" +
      '<div class="call-history-list">' + rows + "</div>" +
      "</div></div>";
    var mount = document.querySelector(".phone") || document.body;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    mount.appendChild(wrap.firstChild);
  }
  function closeCallHistoryPanel() {
    var el = document.getElementById("call-history-overlay");
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }
  function deleteCallRecord(id) {
    var recs = loadCallRecords(), i, out = [];
    for (i = 0; i < recs.length; i++) { if (recs[i].id !== id) { out.push(recs[i]); } }
    saveCallRecords(out);
    var el = document.getElementById("call-history-overlay");
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
    openCallHistoryPanel();
  }
  function clearCallRecordsAll() {
    saveCallRecords([]);
    var el = document.getElementById("call-history-overlay");
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
    openCallHistoryPanel();
  }
  /* ---- 关键词触发来电 ---- */
  function _matchCallKeyword(text) {
    if (!text) { return null; }
    if (/视频通话|打视频|视频|facetime|FaceTime/i.test(text)) { return "video"; }
    if (/语音通话|打电话|打语音|语音|电话|来电|call/i.test(text)) { return "voice"; }
    return null;
  }
  function maybeTriggerIncomingByKeyword(text) {
    var kw = _matchCallKeyword(text);
    if (!kw) { return; }
    var s = loadSettings();
    if (!s.callAllow) { return; }
    setTimeout(function () {
      if (state.partnerId && !document.getElementById("call-incoming-overlay") && !document.getElementById("call-active-overlay")) {
        _triggerIncomingCall(kw);
      }
    }, 1200 + Math.random() * 1500);
  }
  /* ---- 模拟来电定时器（概率控制） ---- */
  function startSimulateCallTimer() {
    stopSimulateCallTimer();
    var s = loadSettings();
    if (!s.callAllow || !s.callProb || !state.partnerId) { return; }
    var baseMin = 4 + Math.random() * 8; /* 4~12 分钟一个检查点 */
    callState.simulateTimer = setTimeout(function () {
      callState.simulateTimer = null;
      var s2 = loadSettings();
      if (!s2.callAllow || !s2.callProb || !state.partnerId) { return; }
      if (Math.random() * 100 < s2.callProb) {
        _triggerIncomingCall(Math.random() < 0.35 ? "video" : "voice");
      }
      startSimulateCallTimer();
    }, baseMin * 60000);
  }
  function stopSimulateCallTimer() {
    if (callState.simulateTimer) { clearTimeout(callState.simulateTimer); callState.simulateTimer = null; }
  }
  function stopCallTimer() {
    _clearCallTimer();
    if (callState.missTimer) { clearTimeout(callState.missTimer); callState.missTimer = null; }
    stopSimulateCallTimer();
    removeCallOverlays();
    callState.connected = false;
    callState.connectedAt = 0;
    _persistCallClear();
  }

  /* ---- 通话状态持久化恢复（页面重开自动续接） ---- */
  /* 通话中途异常（刷新/崩溃/失效）也不丢失已通话信息：把已累计的通话落成一条记录 */
  function _saveInterruptedCallIfAny(saved) {
    if (!saved || typeof saved !== "object") { return; }
    var st = saved.status;
    if (st !== "connected" && st !== "ringing_out" && st !== "ringing_in") { return; }
    var t = now();
    var startedAt = Number(saved.startedAt) || 0;
    var connectedAt = Number(saved.connectedAt) || 0;
    var name = saved.partnerName || "对方";
    var kind = saved.kind === "video" ? "video" : "voice";
    var dir = saved.direction === "in" ? "in" : "out";
    if (st === "connected") {
      var dur = Math.max(0, Math.floor((t - (connectedAt || startedAt || t)) / 1000));
      _saveCallRecord(name, kind, "connected", dur, dir, connectedAt || startedAt || t);
    } else {
      _saveCallRecord(name, kind, "missed", 0, dir, startedAt || t);
    }
  }
  function tryResumeCallState() {
    try {
      if (document.getElementById("call-active-overlay")) { return; }
      if (document.getElementById("call-incoming-overlay")) { return; }
      if (document.getElementById("call-mini-bubble")) { return; }
      var saved = lsGet(CALL_STATE_KEY) || callStateCache;
      if (!saved || typeof saved !== "object") {
        /* 回归修复 R3：ls 无状态（写失败/被清）时，从 IDB 双写副本兜底恢复一次 */
        if (!lsGet(CALL_STATE_KEY) && typeof window !== "undefined" && window.indexedDB) {
          chatIdbGet(CALL_STATE_KEY).then(function (v) {
            if (v && typeof v === "object" && v.status) {
              callStateCache = v;
              tryResumeCallState();
            }
          }).catch(function () {});
        }
        return;
      }
      var status = saved.status;
      if (status !== "ringing_out" && status !== "ringing_in" && status !== "connected") { _persistCallClear(); return; }
      var t = now();
      var startedAt = Number(saved.startedAt) || 0;
      var connectedAt = Number(saved.connectedAt) || 0;
      var valid = false;
      if (status === "connected") {
        /* 已接通通话无时长上限：只要连通时间合理（不晚于当前）即恢复续接 */
        valid = !!connectedAt && connectedAt <= t;
      } else {
        valid = !!startedAt && startedAt <= t && (t - startedAt) <= CALL_RESUME_RINGING_MAX;
      }
      if (!valid) { _saveInterruptedCallIfAny(saved); _persistCallClear(); return; }
      var pid = saved.partnerId;
      /* 回归修复 R3：partnerId 缺失或伙伴列表暂不可用时，不放弃恢复、不清除持久化状态；
         通话浮层按已保存的 partnerName 展示，避免「关闭后无法恢复且状态被清」 */
      var partners = [], found = false, i;
      if (pid) { partners = loadPartners(); for (i = 0; i < partners.length; i++) { if (partners[i].id === pid) { found = true; break; } } }
      callState.partnerId = found ? pid : (pid || null);
      callState.partnerName = saved.partnerName || "";
      callState.startedAt = startedAt || connectedAt || t;
      if (document.getElementById("call-active-overlay")) { return; }
      if (document.getElementById("call-incoming-overlay")) { return; }
      if (document.getElementById("call-mini-bubble")) { return; }
      var kind = saved.kind === "video" ? "video" : "voice";
      if (status === "connected") {
        callState.kind = kind;
        callState.direction = saved.direction === "in" ? "in" : "out";
        callState.bg = _loadCallBgPref();
        callState.connected = true;
        callState.seconds = Math.max(0, Math.floor((t - connectedAt) / 1000));
        callState.connectedAt = connectedAt;
        _openCallActivePanel(kind, true, true);
        _startConnectedTimer();
      } else if (status === "ringing_in") {
        _beginIncomingRing(kind, true);
      } else {
        _beginOutgoingRing(kind, true);
      }
    } catch (e) {
      /* 恢复失败不阻塞页面：先落一条中断记录再清除持久化，避免反复失败且不丢已通话信息 */
      try { _saveInterruptedCallIfAny(lsGet(CALL_STATE_KEY)); } catch (e2) { /* 忽略 */ }
      _persistCallClear();
    }
  }

  /* ---------- 转发详情浮层（v100：点击转发消息查看内容 + 发送人 + 来源；
     v101：连续 forward 聚合为卡片后，点击卡片打开聚合详情，逐条展示发送人与内容；
     v131：改为微信"聊天记录"展开样式 —— 浅灰背景可滚动，每条消息头像 + 用户名 + 时间戳 + 内容，无气泡） ---------- */
  var _fwdDetail = null;
  /* 详情行头像：自己转发的取我方头像，对方转发的取来源对话头像（找不到则回退当前会话对方） */
  function fwdDetailAvatarHtml(gm, cache) {
    if (gm.fwdOriginType === "self") {
      return '<span class="fwd-detail-avatar">' + (cache ? cache.myAvatarHtml : avatarOfMy(null)) + "</span>";
    }
    var srcP = null, partners = loadPartners(), pi;
    if (gm.fwdFrom) { for (pi = 0; pi < partners.length; pi++) { if (String(partners[pi].id) === String(gm.fwdFrom)) { srcP = partners[pi]; break; } } }
    if (!srcP) { srcP = cache ? cache.other : null; }
    if (srcP && srcP.avatar) { return '<span class="fwd-detail-avatar"><img class="chat-avatar-img" src="' + esc(srcP.avatar) + '" alt=""></span>'; }
    return '<span class="fwd-detail-avatar fwd-detail-avatar-ph">' + esc(String((srcP && srcP.name) || "对").slice(0, 1)) + "</span>";
  }
  function fwdDetailMsgBodyHtml(gm, set) {
    var ot = gm.origType || "";
    if (ot === "qa" || gm.innerType === "qa") {
      if ((gm.opts || []).length) {
        /* v132.1：透传原始问答状态与原始方向，保持与聊天流完全一致的渲染
           （原始 pending 显示"能/不能"可选按钮+等待文案；强制 done 会把选项变成已选圆点+“选择了：—”）
           v132.2：补外层 .chat-bubble.chat-bubble-qa 气泡容器 —— 聊天流中 qa 由 msgHtml
           包气泡（主题色边框/浅底/圆角/宽度），此前详情只输出内层 .qa-card，样式裸奔 */
        var qIsSelf = gm.fwdOriginType === "self";
        var qvD = { q: gm.q || "", opts: (gm.opts || []).slice(), multi: !!gm.multi, status: gm.status || "done", picked: (gm.picked || []).slice(), pickedBy: gm.pickedBy || "" };
        return '<div class="chat-bubble chat-bubble-qa' + (qIsSelf ? " is-self" : " is-other") + '">' + qaCardHtml(qvD, qIsSelf, state.partnerId, set) + "</div>";
      }
      return '<div class="fwd-detail-text">[问答] ' + esc(gm.q || "") + "</div>";
    }
    if (ot === "redpack") {
      /* 原样红包卡片：静态展示（仅外观一致，不含领取/详情点击行为；状态字按原始方向：自己发未领显示"待领取"） */
      var rpD = { id: gm.id || "", amount: gm.amount || 0, wish: gm.wish || "", opened: !!gm.opened, isSelf: gm.fwdOriginType === "self" };
      return fwdDetailRedpackHtml(rpD, set);
    }
    if (ot === "pat") {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + esc(gm.text || "[拍一拍]") + "</span></div>";
    }
    if (ot === "call" || gm.isCall) {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text chat-msg-call">' + callNoticeIconHtml() + "<span>" + esc(gm.text || "[通知]") + "</span></span></div>";
    }
    if (gm.isRecall) {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + esc(gm.text || gm.recallText || "消息已撤回") + "</span></div>";
    }
    if (gm.img) { return '<div class="fwd-detail-msg-imgwrap"><img class="fwd-detail-img" data-src="' + esc(String(gm.img || "")) + '" alt="转发图片"></div>'; }
    if (gm.voice) { return '<div class="fwd-detail-text">[语音] ' + esc(fmtVoiceDur(gm.voiceDur || 0)) + "</div>"; }
    return '<div class="fwd-detail-text">' + esc(gm.text || "") + "</div>";
  }
  /* 转发详情中的红包：按原始红包卡片外观静态渲染（仅展示，不可点击领取） */
  function fwdDetailRedpackHtml(m, set) {
    var bf = redpackBgFg(RPSKIN_KEY_OTHER);
    var status = m.opened ? "已领取" : (m.isSelf ? "待领取" : "点开看看");
    var imgEl = "";
    if (bf.img) {
      var _cached = mediaCacheGet(bf.img);
      imgEl = _cached
        ? '<img class="chat-rp-card-bg" src="' + esc(_cached) + '" alt="">'
        : '<img class="chat-rp-card-bg" data-src="' + esc(bf.img) + '" alt="">';
    }
    return '<div class="chat-bubble chat-bubble-rp' + (m.opened ? " is-opened" : "") + '" ' +
      'style="background-color:' + bf.bg + ';color:' + bf.fg + '">' +
      imgEl +
      '<span class="chat-rp-main">' +
      '<span class="chat-rp-ico">' + rpIconSvg(44) + "</span>" +
      '<span class="chat-rp-body">' +
      '<span class="chat-rp-amount" style="font-size:' + rpAmountFontSize(fmtRpAmount(m.amount)) + 'px">¥' + fmtRpAmount(m.amount) + "</span>" +
      '<span class="chat-rp-wish">' + esc(m.wish || "") + "</span>" +
      "</span></span>" +
      '<span class="chat-rp-status" style="color:' + bf.status + '">' + status + "</span>" +
      "</div>";
  }
  function fwdDetailMsgHtml(gm, cache, set) {
    var oN = gm.fwdOriginName || (gm.fwdOriginType === "self" ? "我" : "对方");
    return '<div class="fwd-detail-msg">' +
      fwdDetailAvatarHtml(gm, cache) +
      '<div class="fwd-detail-msg-main">' +
      '<div class="fwd-detail-msg-meta"><span class="fwd-detail-msg-name">' + esc(oN) + '</span><span class="fwd-detail-msg-time">' + esc(fmtTime(gm.time, set.timestamp)) + "</span></div>" +
      '<div class="fwd-detail-msg-body">' + fwdDetailMsgBodyHtml(gm, set) + "</div>" +
      "</div></div>";
  }
  function openForwardDetail(mid) {
    var c = loadChat(), l = (c && c.messages && c.messages[state.partnerId]) || [], m = null, i;
    for (i = 0; i < l.length; i++) { if (l[i].id === mid) { m = l[i]; break; } }
    if (!m || m.msgType !== "forward") { return; }
    closeForwardDetail();
    /* 聚合组扫描：前后连续 forward 归入同一张卡片 */
    var grp = [m], j;
    for (j = i - 1; j >= 0 && l[j] && l[j].msgType === "forward"; j--) { grp.unshift(l[j]); }
    for (j = i + 1; j < l.length && l[j] && l[j].msgType === "forward"; j++) { grp.push(l[j]); }
    var mask = document.createElement("div");
    mask.className = "fwd-detail-mask";
    mask.id = "fwdDetailMask";
    var panel = document.createElement("div");
    panel.className = "fwd-detail-panel";
    panel.id = "fwdDetailPanel";
    var cache = buildRenderCache(state.partnerId);
    var set = loadSettings();
    var itemsHtml = "", gi;
    for (gi = 0; gi < grp.length; gi++) { itemsHtml += fwdDetailMsgHtml(grp[gi], cache, set); }
    var gFromName = grp[0].fwdFromName || "其他对话";
    panel.innerHTML =
      '<div class="fwd-detail-head"><span class="fwd-detail-title">' + esc(gFromName) + "的聊天记录</span><button type=\"button\" class=\"fwd-detail-close\" onclick=\"SnowCrystal.Chat.closeForwardDetail()\" aria-label=\"关闭\">×</button></div>" +
      '<div class="fwd-detail-list">' + itemsHtml + "</div>" +
      '<div class="fwd-detail-foot"><button type="button" class="fwd-detail-more" id="fwdDetailMoreBtn">更多操作</button></div>';
    mask.appendChild(panel);
    document.body.appendChild(mask);
    mask.addEventListener("click", function (e) { if (e.target === mask) { closeForwardDetail(); } });
    var moreBtn = panel.querySelector("#fwdDetailMoreBtn");
    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        closeForwardDetail();
        var row = document.querySelector('#chatMessages .chat-msg[data-mid="' + esc(mid) + '"]');
        if (row && window.SnowCrystal && window.SnowCrystal.ChatMsgMenu) {
          window.SnowCrystal.ChatMsgMenu.showMsgActionMenu(row, mid);
        }
      });
    }
    loadStickerImgs(panel);
    /* 详情浮层图片：resolveImg 解析 data-src（图片/贴图原图） */
    var dimgs = panel.querySelectorAll("img.fwd-detail-img[data-src]");
    Array.prototype.forEach.call(dimgs, function (img) {
      var src = img.getAttribute("data-src") || "";
      if (!src) { img.style.display = "none"; return; }
      resolveImg(src, function (url) { if (url) { img.src = url; } else { img.style.display = "none"; } });
    });
    _fwdDetail = mask;
  }
  function closeForwardDetail() {
    if (_fwdDetail) { if (_fwdDetail.parentNode) { _fwdDetail.parentNode.removeChild(_fwdDetail); } _fwdDetail = null; }
  }

  /* ---------- 导出 ---------- */
  var S = window.SnowCrystal = window.SnowCrystal || {};
  S.Chat = S.Chat || {};
  S.Chat.getPartnerId = function () { return state.partnerId; };
  S.Chat.openForwardDetail = openForwardDetail;
  S.Chat.closeForwardDetail = closeForwardDetail;
  S.Chat.backFromChatRoom = backFromChatRoom;
  S.Chat.clearChatHistory = clearChatHistory;
  S.Chat.setChatStartDate = setChatStartDate;
  S.Chat.toggleChatRoomMenu = toggleChatRoomMenu;
  S.Chat.closeChatRoomMenu = closeChatRoomMenu;
  S.Chat.openChatBgPanel = openChatBgPanel;
  S.Chat.closeChatBgPanel = closeChatBgPanel;
  S.Chat.switchChatBg = switchChatBg;
  S.Chat.chooseChatBgFile = chooseChatBgFile;
  S.Chat.onChatBgFileChange = onChatBgFileChange;
  S.Chat.clearChatBgCustom = clearChatBgCustom;
  S.Chat.playVoiceMsg = playVoiceMsg;
  S.Chat.loadChat = loadChat;
  S.Chat.saveChat = saveChat;
  S.Chat.pushMsg = pushMsg;
  S.Chat.setLast = setLast;
  S.Chat.renderMessages = renderMessages;
  S.Chat.now = now;
  S.Chat.chatPlaySend = chatPlaySend;
  S.Chat.refreshFlameDisplay = refreshFlameDisplay;
  S.Chat.scheduleReadReceipt = scheduleReadReceipt;
  S.Chat.scheduleReply = scheduleReply;
  S.Chat.updateSendBtn = updateSendBtn;
  S.Chat.patPartner = patPartner;
  S.Chat.closePatPanel = closePatPanel;
  S.Chat.sendPat = sendPat;
  S.Chat.sendPatCustom = sendPatCustom;
  S.Chat.toggleEmojiPanel = toggleEmojiPanel;
  S.Chat.closeEmojiPanel = closeEmojiPanel;
  S.Chat.switchEmojiTab = switchEmojiTab;
  S.Chat.switchEmojiGroup = switchEmojiGroup;
  S.Chat.togglePlusPanel = togglePlusPanel;
  S.Chat.closePlusPanel = closePlusPanel;
  S.Chat.onPlusItemClick = onPlusItemClick;
  S.Chat.sendImage = sendImage;
  S.Chat.continueSend = continueSend;
  S.Chat.toggleKeepScreenOn = toggleKeepScreenOn;
  S.Chat.updateSendBtn = updateSendBtn;
  S.Chat.onPlusSendTap = onPlusSendTap;
  S.Chat.openChatSettings = openChatSettings;
  S.Chat.startKeepAlive = startKeepAlive;
  S.Chat.stopKeepAlive = stopKeepAlive;
  S.Chat.maybeNotifyIncoming = maybeNotifyIncoming;
  S.Chat.jumpFromNotify = jumpFromNotify;
  S.Chat.ensureNotifyPermission = ensureNotifyPermission;
  /* 全局常驻消息引擎导出（便于跨页面验证 / 外部调用） */
  S.Chat.startGlobalMsgEngine = startProactive;
  S.Chat.stopGlobalMsgEngine = stopProactive;
  S.Chat.globalScheduleReply = globalScheduleReply;
  S.Chat.clearGlobalReply = clearGlobalReply;
  S.Chat.pickEnginePartner = pickEnginePartner;
  S.Chat.openProbSettings = openProbSettings;
  S.Chat.openEffectSettings = openEffectSettings;
  S.Chat.renderEffectSettings = renderEffectSettings;
  S.Chat.chatSetEffectCount = chatSetEffectCount;
  S.Chat.updateEffectRule = updateEffectRule;
  S.Chat.delEffectRule = delEffectRule;
  S.Chat.addEffectRule = addEffectRule;
  S.Chat.renderChatList = renderChatList;
  S.Chat.renderChatSettings = renderChatSettings;
  S.Chat.renderProbSettings = renderProbSettings;
  S.Chat.openChatFeature = openChatFeature;
  S.Chat.renderChatFeature = renderChatFeature;
  S.Chat.openChatPace = openChatPace;
  S.Chat.renderChatPace = renderChatPace;
  S.Chat.openChatSound = openChatSound;
  S.Chat.renderChatSound = renderChatSound;
  S.Chat.openChatBg = openChatBg;
  S.Chat.renderChatBg = renderChatBg;
  S.Chat.sendMessage = sendMessage;
  S.Chat.chatSetSeg = chatSetSeg;
  S.Chat.chatSetBool = chatSetBool;
  S.Chat.chatSetNum = chatSetNum;
  S.Chat.chatSetUnitCycle = chatSetUnitCycle;
  S.Chat.chatOpenPaceUnitPicker = openPaceUnitPicker;
  S.Chat.chatSetPaceUnit = setPaceUnit;
  S.Chat.chatSetMix = chatSetMix;
  S.Chat.chatSoundToggle = chatSoundToggle;
  S.Chat.chatSoundVolDisp = chatSoundVolDisp;
  S.Chat.chatSoundVolume = chatSoundVolume;
  /* 音效选项 onclick 使用 SnowCrystal.chatSoundPick(...)（与 openChatSound 同级直层），
     仅挂 S.Chat 会导致"SnowCrystal.chatSoundPick is not a function"，音效无法点击切换 */
  S.chatSoundPick = chatSoundPick;
  S.Chat.chatSoundPick = chatSoundPick;
  S.Chat.chatSoundPreview = chatSoundPreview;
  S.Chat.chatProbDisp = chatProbDisp;
  S.Chat.chatProbSet = chatProbSet;
  /* 通话 v98 */
  S.Chat.openCallPicker = openCallPicker;
  S.Chat.closeCallPicker = closeCallPicker;
  S.Chat.startCall = startCall;
  S.Chat.hangupCall = hangupCall;
  S.Chat.minimizeCall = minimizeCall;
  S.Chat.restoreCall = restoreCall;
  S.Chat.toggleCallBgPicker = toggleCallBgPicker;
  S.Chat.setCallBg = setCallBg;
  S.Chat.answerIncomingCall = answerIncomingCall;
  S.Chat.rejectIncomingCall = rejectIncomingCall;
  S.Chat.openCallHistoryPanel = openCallHistoryPanel;
  S.Chat.miniPointerDown = miniPointerDown;
  S.Chat.miniPointerMove = miniPointerMove;
  S.Chat.miniPointerUp = miniPointerUp;
  S.Chat.closeCallHistoryPanel = closeCallHistoryPanel;
  S.Chat.deleteCallRecord = deleteCallRecord;
  S.Chat.clearCallRecordsAll = clearCallRecordsAll;
  S.Chat.maybeTriggerIncomingByKeyword = maybeTriggerIncomingByKeyword;
  S.Chat.startSimulateCallTimer = startSimulateCallTimer;
  S.Chat.stopSimulateCallTimer = stopSimulateCallTimer;
  S.Chat.stopCallTimer = stopCallTimer;
  S.Chat.tryResumeCallState = tryResumeCallState;
  S.Chat._triggerIncomingCall = _triggerIncomingCall;
  S.Chat._addCallNotice = _addCallNotice;
  S.Chat._saveCallRecord = _saveCallRecord;
  S.Chat.callNoticeIconHtml = callNoticeIconHtml;
  S.Chat.doAutoReply = doAutoReply;
  /* 让你选 v102 */
  S.Chat.openQaPicker = openQaPicker;
  S.Chat.closeQaPanel = closeQaPanel;
  S.Chat.toggleQaMode = toggleQaMode;
  S.Chat.qaAddOpt = qaAddOpt;
  S.Chat.qaDelOpt = qaDelOpt;
  S.Chat.qaAutoGrow = qaAutoGrow;
  S.Chat.qaSend = qaSend;
  S.Chat.qaPick = qaPick;
  S.Chat.qaPickDone = qaPickDone;
  S.Chat.openQaLib = openQaLib;
  S.Chat.qaBack = qaBack;
  S.Chat.qaUseTpl = qaUseTpl;
  S.Chat.qaDelTpl = qaDelTpl;
  S.Chat.openQaEdit = openQaEdit;
  /* 副字卡（角色专属）· 直接挂顶层 SnowCrystal，供页面 onclick 调用 */
  S.openWcHub = openWcHub;
  S.subBack = subBack;
  S.openSubLib = openSubLib;
  S.openSubGroup = openSubGroup;
  S.subGroupBack = subGroupBack;
  S.subAdd = subAdd;
  S.subCopyText = subCopyText;
  S.subSearch = subSearch;
  S.subDoSearch = subDoSearch;
  S.subClearSearch = subClearSearch;
  S.subImport = subImport;
  S.subExport = subExport;
  S.subDedup = subDedup;
  /* 专属字卡 JSON 导入：合并到对应角色（保留本地已有字卡） */
  var subImp = document.getElementById("subLibImport");
  if (subImp && subImp.getAttribute("data-bound") !== "1") {
    subImp.setAttribute("data-bound", "1");
    subImp.addEventListener("change", function () {
      var f = subImp.files && subImp.files[0];
      if (!f) { return; }
      var reader = new FileReader();
      reader.onload = function () {
        var raw = String(reader.result || "").replace(/^\uFEFF/, "");
        var obj = null;
        try { obj = JSON.parse(raw); } catch (e) { obj = null; }
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
          wcToast("文件里没有可导入的专属字卡");
          subImp.value = "";
          return;
        }
        var d = loadSub(), added = 0, pid, arr;
        /* 兼容导出文件里的 { groups: {pid:[...]} } 包装，也兼容裸 {pid:[...]} */
        var src = (obj && obj.groups && typeof obj.groups === "object" && !Array.isArray(obj.groups)) ? obj.groups : obj;
        for (pid in src) {
          if (!Object.prototype.hasOwnProperty.call(src, pid)) { continue; }
          arr = src[pid];
          if (!Array.isArray(arr)) { continue; }
          if (!Array.isArray(d[pid])) { d[pid] = []; }
          d[pid] = d[pid].concat(arr.filter(function (x) { return x != null && String(x).replace(/^\s+|\s+$/g, "") !== ""; }));
          added += arr.length;
        }
        saveSub(d);
        renderSubGroup();
        renderSubLib();
        subMetaRefresh();
        wcToast(added ? "已导入 " + added + " 条专属字卡" : "文件里没有可导入的专属字卡");
        subImp.value = "";
      };
      reader.readAsText(f);
    });
  }
  /* 红包 v9 */
  S.Chat.openRedpackSend = openRedpackSend;
  S.Chat.closeRedpackModal = closeRedpackModal;
  S.Chat.rpSendPreviewRefresh = rpSendPreviewRefresh;
  S.Chat.rpSendWishRandom = rpSendWishRandom;
  S.Chat.sendRedpack = sendRedpack;
  S.Chat.openRedpack = openRedpack;
  S.Chat.collectRedpack = collectRedpack;
  S.Chat.openRedpackSkin = openRedpackSkin;
  S.Chat.rpSkinMode = rpSkinMode;
  S.Chat.rpSkinToggleTheme = rpSkinToggleTheme;
  S.Chat.rpSkinSetBg = rpSkinSetBg;
  S.Chat.rpSkinSetFg = rpSkinSetFg;
  S.Chat.rpSkinSetStatus = rpSkinSetStatus;
  S.Chat.rpSkinPickImg = rpSkinPickImg;
  S.Chat.rpSkinClearImg = rpSkinClearImg;
  S.Chat.rpSkinReset = rpSkinReset;
  S.Chat.openRedpackRecords = openRedpackRecords;
  S.Chat.openPendingRedpacks = openPendingRedpacks;
  S.Chat.closeRpListOverlay = closeRpListOverlay;
  S.Chat.openRedpackFromRecords = openRedpackFromRecords;
  S.Chat.collectFromPending = collectFromPending;
  S.Chat.collectAllPending = collectAllPending;
  S.Chat.toggleChatPin = toggleChatPin;
  S.Chat.syncChatPinLabel = syncChatPinLabel;
  S.Chat.openChatSearch = openChatSearch;
  S.Chat.chatSearchFilter = chatSearchFilter;
  S.Chat.chatSearchJump = chatSearchJump;
  S.Chat.openChatStats = openChatStats;
  S.Chat.statsCalNav = statsCalNav;

  /* 页内快捷入口（与既有 onclick 风格一致） */
  S.openChatList = openChatList;
  S.openChatRoom = openChatRoom;
  S.Chat.openChatRoom = openChatRoom;
  S.backFromChatRoom = backFromChatRoom;
  S.clearChatHistory = clearChatHistory;
  S.toggleChatRoomMenu = toggleChatRoomMenu;
  S.closeChatRoomMenu = closeChatRoomMenu;
  S.sendMessage = sendMessage;
  S.openChatSettings = openChatSettings;
  S.openChatBg = openChatBg;
  S.openProbSettings = openProbSettings;
  S.openEffectSettings = openEffectSettings;
  S.renderEffectSettings = renderEffectSettings;
  S.chatSetEffectCount = chatSetEffectCount;
  S.updateEffectRule = updateEffectRule;
  S.delEffectRule = delEffectRule;
  S.addEffectRule = addEffectRule;
  S.openChatFeature = openChatFeature;
  S.openChatPace = openChatPace;
  S.openChatSound = openChatSound;
  S.chatSetSeg = chatSetSeg;
  S.chatSetBool = chatSetBool;
  S.chatSetNum = chatSetNum;
  S.chatSetUnitCycle = chatSetUnitCycle;
  S.chatOpenPaceUnitPicker = openPaceUnitPicker;
  S.chatSetPaceUnit = setPaceUnit;
  S.chatSetMix = chatSetMix;
  S.chatSoundToggle = chatSoundToggle;
  S.chatSoundVolDisp = chatSoundVolDisp;
  S.chatSoundPreview = chatSoundPreview;
  S.chatProbDisp = chatProbDisp;
  S.chatProbSet = chatProbSet;

  /* 初始化：从 IndexedDB 恢复自定义聊天背景（与 localStorage 双保险，刷新/重启后仍生效） */
  chatBgIdbLoadAndSync();

  /* 通话状态持久化恢复：页面加载完成后自动检测未结束的通话并续接 */
  var _resumeCallRun = function () {
    setTimeout(function () {
      if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.tryResumeCallState) {
        window.SnowCrystal.Chat.tryResumeCallState();
      }
    }, 150);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _resumeCallRun);
  } else {
    _resumeCallRun();
  }

  /* 初始化：页面加载完成后按持久化开关恢复「后台保活」 */
  var _keepAliveInit = function () {
    try { if (loadSettings().keepAlive) { startKeepAlive(); } } catch (e) { /* 忽略 */ }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _keepAliveInit);
  } else {
    _keepAliveInit();
  }

  /* 核心修复③：页面加载完成后按持久化开关恢复「屏幕常亮」——
     上次开启则自动重新持有 wake lock（silent 模式不打扰） */
  var _keepAwakeInit = function () {
    try {
      if (lsGet(KEEP_AWAKE_KEY) && document.visibilityState === "visible") {
        requestKeepScreenOn(true);
      }
    } catch (e) { /* 忽略 */ }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _keepAwakeInit);
  } else {
    _keepAwakeInit();
  }

  /* 初始化：全局常驻消息接收引擎 —— 页面加载即启动，不依赖聊天室激活；
     主动发送开关开启时立即开始跨页面接收/模拟对方消息 */
  var _msgEngineInit = function () {
    try { startProactive(); } catch (e) { /* 忽略 */ }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _msgEngineInit);
  } else {
    _msgEngineInit();
  }
})();
/* =========================================================
 * v13 更换壁纸模块（重写 v9：四模式）
 * 面板模式：
 *   theme   跟随网站外观主题 —— 美化设置里背景是什么，聊天就同步跟随什么（--bg，亮/暗自动）
 *   white   固定白色 —— 不随主题变化，始终纯白
 *   color   自定义颜色 —— 不跟随主题，可自选纯色或渐变
 *           （渐变方向：上下 / 左右 / 斜向 / 中心晕染 / 边角晕染 / 随机晕染）
 *   custom  自定义上传 —— 任意尺寸 / 任意大小图片，IndexedDB + localStorage 双保险永久保存，
 *           超长条图也能完整上传（FileReader 不限大小，无尺寸限制）
 * 持久化键 snowcrystal.chat.wallpaper2；lastType: theme | white | color | custom；
 * 旧版数据（纯色/渐变 hex）在 v13 下统一回退为跟随主题背景
 * ========================================================= */
(function () {
  var Chat = window.SnowCrystal && window.SnowCrystal.Chat;
  if (!Chat) { return; }

  var KEY = "snowcrystal.chat.wallpaper2";
  var CUSTOM_KEY = "snowcrystal.chat.roomBgCustom";
  var OLD_BG_KEY = "snowcrystal.chat.roomBg"; /* v10：旧版内置背景键，刷新变蓝根因之一 */
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
  /* v15：标记当前壁纸模式（theme/white/color/custom），驱动底栏「仅自定义背景时沉浸式」 */
  function setWpMode(mode) {
    var page = chatRoomPage();
    if (!page) { return; }
    if (mode) { page.setAttribute("data-wp-mode", mode); }
    else { page.removeAttribute("data-wp-mode"); }
  }

  /* ---- 渐变方向映射：上下 / 左右 / 斜向 / 中心晕染 / 边角晕染 / 随机弥散（三色） ---- */
  function gradCss(dir, c1, c2, c3, st) {
    var c3v = c3 || c2;
    switch (dir) {
      case "lr":   return "linear-gradient(to right, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
      case "tlbr": return "linear-gradient(to bottom right, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
      case "rc":   return "radial-gradient(circle at 50% 50%, " + c1 + " 0%, " + c2 + " 55%, " + c3v + " 100%)";
      case "rcn":  return "radial-gradient(circle at 12% 12%, " + c1 + " 0%, " + c2 + " 55%, " + c3v + " 100%)";
      case "rr":
        /* v23：随机弥散优先使用已固化的当前效果（含用户调节参数 / 保存模板），无缓存时才重新随机 */
        if (st && st.rrCss) { return st.rrCss; }
        return randomBloomCss(c1, c2, c3v, st ? st.rrParams : null);
      case "tb":
      default:     return "linear-gradient(to bottom, " + c1 + " 0%, " + c2 + " 50%, " + c3v + " 100%)";
    }
  }
  /* v23：随机弥散重做 —— 大光斑柔和晕染 + 小光斑点缀 + 三色底融，晕染自然不扎眼 */
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
  /* v22：玻璃质感重做（删除原“颗粒感 / 玻璃颗粒感”，改为 5 种高透玻璃纹理，纯 CSS 渐变叠加、无 SVG 滤镜，流畅）
     高透 clear —— 极淡高光玻璃；分块 block —— 规则方块网格；磨砂 frosted —— 高密度细噪磨砂；
     长虹 fluted —— 竖向条纹；水波纹 ripple —— 同心圆波纹 */
  var GLASS_BG = {
    clear:   ["linear-gradient(160deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.14) 24%, rgba(255,255,255,0.02) 46%, rgba(255,255,255,0.10) 66%, rgba(255,255,255,0.34) 88%, rgba(255,255,255,0.16) 100%), radial-gradient(rgba(255,255,255,0.40) 0.8px, transparent 1.3px)", "100% 100%, 6px 6px", "0 0, 0 0"],
    block:   ["linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.35) 0.7px, transparent 1.2px), linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 55%)", "30px 30px, 30px 30px, 5px 5px, 100% 100%", "0 0, 0 0, 1px 1px, 0 0"],
    frosted: ["radial-gradient(rgba(255,255,255,0.42) 0.6px, transparent 1px), radial-gradient(rgba(190,205,228,0.28) 0.6px, transparent 1.1px), radial-gradient(rgba(255,255,255,0.30) 0.7px, transparent 1.2px), radial-gradient(rgba(120,140,190,0.18) 0.5px, transparent 1px)", "2.5px 2.5px, 3.5px 3.5px, 4.5px 4.5px, 2px 2px", "0 0, 1px 2px, 2px 0, 3px 1px"],
    fluted:  ["repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.38) 2px, rgba(255,255,255,0.10) 4px, transparent 4px, transparent 9px), radial-gradient(rgba(255,255,255,0.25) 0.8px, transparent 1.3px)", "auto, 5px 5px", "0 0, 0 0"],
    ripple:  ["radial-gradient(circle at 50% 50%, transparent 0 6px, rgba(255,255,255,0.32) 6.5px, transparent 8px), radial-gradient(circle at 50% 50%, transparent 0 13px, rgba(255,255,255,0.24) 13.5px, transparent 15px), radial-gradient(circle at 50% 50%, transparent 0 21px, rgba(255,255,255,0.20) 21.5px, transparent 23px), radial-gradient(circle at 50% 50%, transparent 0 30px, rgba(255,255,255,0.15) 30.5px, transparent 32px), radial-gradient(rgba(255,255,255,0.20) 0.8px, transparent 1.3px)", "72px 72px, 72px 72px, 72px 72px, 72px 72px, 6px 6px", "0 0, 0 0, 0 0, 0 0, 0 0"]
  };
  /* v22：动感模糊重做为 feGaussianBlur 双值方向标准差 —— 沿轴线性拉伸的高透拖影（对应图二动感模糊效果），
     左右 → (v 0)、上下 → (0 v)、中心 → (v v)；强度收敛在 18px 内，移动端流畅不卡 */
  function updateSvgBlur(dir, v) {
    var id = dir === "lr" ? "wpMotionLr" : (dir === "c" ? "wpMotionC" : "wpMotionTb");
    var f = document.getElementById(id);
    if (!f) { return; }
    var g = f.querySelector("feGaussianBlur");
    if (!g) { return; }
    var vv = Math.max(1, Math.min(18, v));
    if (dir === "lr") { g.setAttribute("stdDeviation", vv + " 0"); }
    else if (dir === "c") { g.setAttribute("stdDeviation", vv + " " + vv); }
    else { g.setAttribute("stdDeviation", "0 " + vv); }
  }
  function applyBlurAndGrain() {
    var page = chatRoomPage();
    if (!page) { return; }
    var st = stLoad();
    /* v21：模糊/颗粒拆分为壁纸专属 —— 仅「自定义上传(custom)」「自定义颜色(color)」模式生效，
       跟随主题 / 固定白色 等纯色背景不应用，避免无意义的大半径模糊导致卡顿 */
    var enable = (st.lastType === "custom" || st.lastType === "color");
    /* v21 原收敛 30px 防卡；现按设备内存动态放宽上限（30/40/50/60），低内存档保持原收敛值 */
    var amt = Math.max(0, Math.min((window.XJ_CAP ? XJ_CAP.blurMax() : 30), Number(st.blurAmt) || 0));
    var filter = "none", persp = "none";
    var dir = st.blurDir || "tb";
    if (enable) {
      if (st.blurType === "gaussian" && amt > 0) {
        filter = "blur(" + amt + "px)";
      } else if ((st.blurType === "motion" || st.blurType === "perspective") && amt > 0) {
        var v = Math.max(2, Math.round(amt * 0.8));
        updateSvgBlur(dir, v);
        var id = dir === "lr" ? "#wpMotionLr" : (dir === "c" ? "#wpMotionC" : "#wpMotionTb");
        filter = "url(" + id + ")";
        if (st.blurType === "perspective") {
          if (dir === "tb") { persp = "linear-gradient(to bottom, rgba(15,20,35,.34), transparent 38%, transparent 62%, rgba(15,20,35,.34))"; }
          else if (dir === "lr") { persp = "linear-gradient(to right, rgba(15,20,35,.34), transparent 38%, transparent 62%, rgba(15,20,35,.34))"; }
          else { persp = "radial-gradient(circle at 50% 42%, transparent 26%, rgba(15,20,35,.32))"; }
        }
      }
    }
    page.style.setProperty("--chat-bg-filter", filter);
    page.style.setProperty("--chat-bg-persp", persp);
    var grain = st.grain || "none";
    var gAmt = Math.max(0, Math.min(100, Number(st.grainAmt) || 0));
    if (enable && grain !== "none" && gAmt > 0 && GLASS_BG[grain]) {
      var g = GLASS_BG[grain];
      page.style.setProperty("--chat-grain-opacity", String(gAmt / 100));
      page.style.setProperty("--chat-grain-bg", g[0]);
      page.style.setProperty("--chat-grain-size", g[1]);
      page.style.setProperty("--chat-grain-pos", g[2]);
      page.style.setProperty("--chat-grain-filter", "none");
    } else {
      page.style.setProperty("--chat-grain-opacity", "0");
      page.style.setProperty("--chat-grain-bg", "none");
      page.style.setProperty("--chat-grain-size", "4px 4px");
      page.style.setProperty("--chat-grain-pos", "0 0");
      page.style.setProperty("--chat-grain-filter", "none");
    }
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
  /* v21：滑块高频 oninput 用 rAF 节流合并重绘，避免拖拽时逐帧全量 apply 卡顿 */
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
      /* 未设置/纯白模式：浅色 = 纯白 #ffffff；暗色 = 跟随网站外观主题 --bg（避免纯白刺眼） */
      var dm = document.documentElement && document.documentElement.getAttribute("data-theme-mode") === "dark";
      return dm ? "var(--bg)" : WHITE_BG;
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
    /* v16：未设置聊天背景时默认纯白模式（浅色纯白、暗色跟随主题）
       v18：自定义颜色时顶栏底栏默认半透明 50%（barMode: half） */
    return { lastType: "white", colorType: "solid", color: "#f6f8fc", color2: "#c7d2dc", color3: "#e8eef6", gradDir: "tb", barMode: "half", blurType: "none", blurDir: "tb", blurAmt: 0, grain: "none", grainAmt: 0, rrCss: "", rrParams: { spots: 5, size: 55, soft: 65 }, rrTemplates: [] };
  }
  function stLoad() {
    try {
      var raw = localStorage.getItem(KEY);
      var st = raw ? JSON.parse(raw) : null;
      if (st && typeof st === "object") {
        /* 旧版数据兼容：v9 的 solid 无 lastType 语义时回退跟随主题 */
        if (!st.lastType) { st.lastType = "theme"; }
        if (!st.gradDir) { st.gradDir = "tb"; }
        if (!st.color) { st.color = "#f6f8fc"; }
        if (!st.color2) { st.color2 = "#c7d2dc"; }
        if (!st.color3) { st.color3 = "#e8eef6"; }
        if (!st.barMode) { st.barMode = "half"; }
        if (!st.blurType) { st.blurType = "none"; }
        if (!st.blurDir) { st.blurDir = "tb"; }
        if (st.blurAmt === undefined || st.blurAmt === null) { st.blurAmt = 0; }
        if (!st.grain) { st.grain = "none"; }
        /* v22：原“颗粒感 / 玻璃颗粒感”已重做为玻璃质感，旧值一律回退为无 */
        if (st.grain === "grain" || st.grain === "glass") { st.grain = "none"; }
        if (st.grainAmt === undefined || st.grainAmt === null) { st.grainAmt = 0; }
        if (!st.rrCss) { st.rrCss = ""; } /* v22：随机晕染固化缓存 */
        /* v23：随机弥散调节参数与模板列表 */
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
  function apply() {
    var page = chatRoomPage();
    if (!page) { return; }
    page.removeAttribute("data-bg"); /* v10：清除旧版内置背景属性，防止 [data-bg] 蓝色渐变规则接管 */
    var st = stLoad();
    /* v24：识别配色激活且未单独设置聊天背景（默认 white / 跟随主题 theme）时，
       不写内联 --chat-bg，交由 CSS（05-theme-system.css）回退显示识图方案背景；
       用户单独设置（自定义颜色 color / 上传图片 custom / 内置 data-bg）时仍走下方原逻辑，单独背景优先 */
    var aiOn = document.documentElement && document.documentElement.getAttribute("data-ai-palette") === "1";
    if (aiOn && (st.lastType === "white" || st.lastType === "theme")) {
      page.style.removeProperty("--chat-bg-img");
      page.style.removeProperty("--chat-bg");
      setWpMode(st.lastType || "theme"); /* v15：同步壁纸模式标记 */
      page.removeAttribute("data-bar-mode"); /* v18：非 color 模式移除标记走默认样式 */
      return;
    }
    /* v22：自定义上传模式下重建背景时保留用户图片 —— 点击模糊/玻璃不再把壁纸清掉 */
    if (st.lastType === "custom") {
      var dataUrl = lsGet(CUSTOM_KEY);
      if (dataUrl) {
        page.style.setProperty("--chat-bg-img", "url(" + dataUrl + ")");
        page.style.setProperty("--chat-bg", "url(" + dataUrl + ") center / cover no-repeat");
      } else {
        page.style.removeProperty("--chat-bg-img");
        page.style.setProperty("--chat-bg", buildLayers());
      }
    } else {
      page.style.removeProperty("--chat-bg-img"); /* 切离上传图时清掉图片残留 */
      page.style.setProperty("--chat-bg", buildLayers());
    }
    /* v23：已移除模糊/玻璃质感功能，不再应用旧效果残留 */
    setWpMode(st.lastType || "theme"); /* v15：同步壁纸模式标记 */
    /* v18：仅自定义颜色时应用顶栏底栏三档显示（half / full / clear），其余模式移除标记走默认样式 */
    if (st.lastType === "color") { page.setAttribute("data-bar-mode", st.barMode || "half"); }
    else { page.removeAttribute("data-bar-mode"); }
  }
  function applyCustom(dataUrl) {
    var page = chatRoomPage();
    if (!page) { return; }
    if (dataUrl) {
      page.style.setProperty("--chat-bg", "url(" + dataUrl + ") center / cover no-repeat");
      page.style.setProperty("--chat-bg-img", "url(" + dataUrl + ")");
      setWpMode("custom"); /* v15：自定义壁纸 → 上下底栏沉浸式 */
    }
  }

  /* ---- 模式 / 颜色 / 渐变方向操作 ---- */
  function setMode(mode) {
    var st = stLoad();
    st.lastType = mode;
    stSave(st);
    if (mode === "custom") { chooseChatBgFile(); return; }
    if (mode === "color") {
      /* 进入自定义颜色：若无自定义上传，按 color 应用 */
    }
    if (mode !== "custom" && lsGet(CUSTOM_KEY) && mode !== "theme") {
      /* 切走上传图模式时仅保留其数据，不影响新模式的展示 */
    }
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
    /* v18/v21：自定义颜色时顶栏底栏显示档位：half（半透明50%）/ full（全显背景）/ clear（纯透明只显示符号）/ transparent（全透明：输入框与右侧信息文字背景也透明） */
    var st = stLoad();
    st.barMode = (mode === "full" || mode === "clear" || mode === "transparent") ? mode : "half";
    stSave(st);
    if (st.lastType === "color") { apply(); }
    render(st);
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

  /* ---- 渲染面板（模式选中态 / 颜色控件 / 清除按钮可见性） ---- */
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
    /* v18：顶栏底栏三档按钮同步 + 仅颜色模式可见 */
    var barZone = el("wp13BarZone");
    if (barZone) { barZone.style.display = (mode === "color") ? "" : "none"; }
    var barMode = st.barMode || "half";
    var bHalf = el("wp13BarHalf"), bFull = el("wp13BarFull"), bClear = el("wp13BarClear"), bTransparent = el("wp13BarTransparent");
    if (bHalf) { bHalf.classList.toggle("is-active", barMode === "half"); }
    if (bFull) { bFull.classList.toggle("is-active", barMode === "full"); }
    if (bClear) { bClear.classList.toggle("is-active", barMode === "clear"); }
    if (bTransparent) { bTransparent.classList.toggle("is-active", barMode === "transparent"); }
    var clearBtn = el("chatBgClearBtn");
    if (clearBtn) { clearBtn.hidden = !lsGet(CUSTOM_KEY); }
    /* v23：三色 / 随机弥散调节控件同步（模糊/玻璃质感已移除） */
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

  /* ---- 自定义上传：任意尺寸 / 任意大小，双保险永久保存 ---- */
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
    lsDel(OLD_BG_KEY); /* v10：同步清理旧版内置背景键 */
    idbDel();
    var st = stDefault();
    stSave(st);
    apply();
    render(st);
    toast("已移除自定义壁纸，恢复跟随主题");
  }
  function resetWallpaper() {
    /* v13：重置为「跟随网站外观主题」模式 */
    lsDel(KEY);
    lsDel(CUSTOM_KEY);
    lsDel(OLD_BG_KEY); /* v10：同步清理旧版内置背景键 */
    idbDel();
    var st = stDefault();
    stSave(st);
    apply();
    render(st);
    toast("已恢复默认壁纸（跟随主题）");
  }

  /* ---- 持久化恢复：theme / white / color / custom 四模式 ---- */
  function applyStored() {
    lsDel(OLD_BG_KEY); /* v10：清理旧版内置背景持久化键，杜绝刷新恢复 ice/dusk 蓝色背景 */
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

  /* ---- 导出覆盖（末尾追加模块，覆盖 v6/v7/v8/v9 同名导出） ---- */
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
  Chat.onColorInput = onColorInput;
  Chat.setBlurType = setBlurType;
  Chat.setBlurDir = setBlurDir;
  Chat.setBlurAmt = setBlurAmt;
  Chat.setGrain = setGrain;
  Chat.setGrainAmt = setGrainAmt;
  /* v23：随机弥散调节 / 模板保存 */
  Chat.setRrParam = setRrParam;
  Chat.rerollRr = rerollRr;
  Chat.saveRrTemplate = saveRrTemplate;
  Chat.applyRrTemplate = applyRrTemplate;
  Chat.deleteRrTemplate = deleteRrTemplate;

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

  /* ---- 输入控件绑定（change 已由面板内联 onchange 绑定，避免重复触发） ---- */

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
  /* 发热优化 P0-2：MutationObserver 收窄 + rAF 防抖 + 隐藏断开重连
     - 原实现对 document.body 全子树观察（childList+subtree+attributes），
       任何节点增删/class 变化都会唤醒回调，后台页面尤其费电；
     - maybeApply 只依赖聊天室 page 的 is-active class，因此仅观察该节点
       的 class 属性即可覆盖全部意图；
     - 同帧多次触发合并为一次 rAF 调度；页面隐藏时断开观察（后台不再被
       DOM 变化唤醒），回前台自动重连；聊天室节点尚未创建时退化为 body
       观察，创建后由下一轮调度自动切换为精准观察。 */
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

/* ============================================================
   v11 —— 今日絮语聊天室 UI 改造（三端联动 · 末尾追加覆盖模块）
   1) 底栏信息区「当前情绪 / 心动值」支持点击内联编辑：
      - chatInfoMood / chatInfoHeart 点击后原地变为输入框
      - Enter / 失焦保存，Esc 取消
      - 保存持久化到 loadMy() 的 mood / heart 字段（MY_KEY 同一对象）
      - 保存后调用 v11 渲染函数刷新显示（不再把心动值写死为 0）
   2) 覆盖导出 Chat.renderChatRoomInfo（新增导出）供外部 / 刷新复用
   3) 覆盖 Chat.openChatRoom：打开聊天室后按持久化值刷新信息区
   旧逻辑不删只覆盖，原 renderChatRoomInfo 保留不动。
   ============================================================ */
(function () {
  var S = window.SnowCrystal || (window.SnowCrystal = {});
  var Chat = S.Chat = S.Chat || {};
  /* v-fix：聊天语音气泡点击播放保持主模块导出（见 5357 行 S.Chat.playVoiceMsg = playVoiceMsg）。
     此前此处重复覆盖 Chat.playVoiceMsg，但本模块是独立 IIFE，作用域内没有主模块私有的
     loadChat / state，点击气泡会抛 ReferenceError（loadChat is not defined）导致无法播放，
     故不再覆盖，交由主模块原版处理。 */
  var V11_MY_KEY = "snowcrystal.account.my.v1";
  function v11LsGet(k) {
    try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function v11LsSet(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 本机写满时静默 */ }
  }
  function v11LoadMy() {
    var m = v11LsGet(V11_MY_KEY);
    return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
  }
  function v11PersistMy(patch) {
    var my = v11LoadMy(), k;
    if (!my || typeof my !== "object") { my = {}; }
    for (k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) { my[k] = patch[k]; }
    }
    v11LsSet(V11_MY_KEY, my);
  }
  /* v11 渲染：读取 loadMy() 的 mood / heart（heart 无存储时占位 0） */
  function renderChatRoomInfoV11() {
    var moodEl = document.getElementById("chatInfoMood");
    var heartEl = document.getElementById("chatInfoHeart");
    if (!moodEl && !heartEl) { return; }
    var my = v11LoadMy();
    var mood = (my && my.mood) ? String(my.mood).trim() : "";
    var heart = 0;
    if (my && my.heart !== undefined && my.heart !== null && my.heart !== "") { heart = Math.max(0, Math.floor(Number(my.heart) || 0)); }
    if (moodEl) { moodEl.textContent = "当前情绪为" + (mood || "平静"); }
    if (heartEl) { heartEl.textContent = "心动值 " + heart; }
  }
  /* 内联编辑：把 span 换成 input，Enter/失焦保存，Esc 取消 */
  function v11BeginInlineEdit(id, isNumber) {
    var el = document.getElementById(id);
    if (!el) { return; }
    if (el.querySelector("input")) { return; }
    var m = String(el.textContent || "").match(/(?:当前情绪为|心动值)\s*(.*)$/);
    var val = m ? m[1] : "";
    if (isNumber) { val = val.replace(/[^\d]/g, ""); }
    var input = document.createElement("input");
    input.type = isNumber ? "number" : "text";
    input.value = val;
    input.className = "chat-info-edit";
    input.setAttribute("aria-label", isNumber ? "修改心动值" : "修改当前情绪");
    el.textContent = "";
    el.appendChild(input);
    input.focus();
    if (input.select) { input.select(); }
    function v11Finish(save) {
      if (!el || !el.contains(input)) { return; }
      var newVal = input.value;
      el.removeChild(input);
      if (save && newVal !== "") {
        if (isNumber) {
          var n = Math.max(0, Math.floor(Number(newVal) || 0));
          v11PersistMy({ heart: n });
        } else {
          v11PersistMy({ mood: String(newVal).trim() });
        }
      }
      renderChatRoomInfoV11();
    }
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); v11Finish(true); }
      if (ev.key === "Escape") { ev.preventDefault(); v11Finish(false); }
    });
    input.addEventListener("blur", function () { v11Finish(true); });
    input.addEventListener("click", function (ev) { ev.stopPropagation(); });
  }
  function editMoodV11() { v11BeginInlineEdit("chatInfoMood", false); }
  function editHeartV11() { v11BeginInlineEdit("chatInfoHeart", true); }

  /* ---- 导出：新增 / 覆盖同名导出 ---- */
  Chat.renderChatRoomInfo = renderChatRoomInfoV11;
  Chat.editMood = editMoodV11;
  Chat.editHeart = editHeartV11;

  /* ---- 覆盖 openChatRoom：打开聊天室后按持久化值刷新信息区 ----
     兼容兜底：聊天模块原本只导出 SnowCrystal.openChatRoom，
     此处回退到该原始函数，避免 Chat.openChatRoom 变成空操作。 */
  var v11OrigOpen = Chat.openChatRoom || (window.SnowCrystal && window.SnowCrystal.openChatRoom);
  if (typeof v11OrigOpen === "function") {
    Chat.openChatRoom = function (pid) {
      var r = v11OrigOpen.apply(Chat, arguments);
      renderChatRoomInfoV11();
      return r;
    };
  } else {
    Chat.openChatRoom = function () { renderChatRoomInfoV11(); };
  }

  /* 页面就绪后立即渲染一次（保证已打开的聊天室同步持久化值） */
  renderChatRoomInfoV11();
})();


