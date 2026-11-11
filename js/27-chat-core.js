/* 雪山晶 · 27-chat-core ｜ 源：雪山晶.html L13778-L20922 ｜ JS 模块 */
;/* 雪晶 · 聊天（「聊天设置 + 日常聊天」） */
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
    replyMin: 5,            /* 秒 */
    replyMax: 30,           /* 秒 */
    proactive: false,
    proactiveInterval: 30,  /* 秒 */
    forward: 5,             /* 对方转发概率 % */
    callAllow: true,        /* 允许对方拨打通话：默认勾选开启 */
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
    ],
    autoReplyEnabled: false,      /* 自动回复：对方消息命中关键词时我方自动回一条 */
    autoReplyRules: [],           /* [{ kw: "在吗", txt: "在的～" }] */
    letterProactiveSec: 240,      /* 回信设置：主动写信时长（秒，V27 由 120 翻倍至 240） */
    letterReplySec: 30,           /* 回信设置：回信时长（秒） */
    letterLines: 2,               /* 回信设置：写信单次条数（最低 2，无上限） */
    letterDurSec: 20,             /* 回信设置：信件时长（秒） */
    letterTypeRate: 100,          /* [V28] 打字机速度（%，100=基准，越小越慢） */
    letterStrikePct: 40,          /* [V28] 划掉重写概率（%，0=关闭） */
    letterStrikeSrc: 1            /* [V28] 划掉句来源：1=废弃句库 2=卡片句 3=自造短句 */
  };
  var DEFAULT_SOUND = {
    enabled: true,          /* 音效总开关 */
    volume: 100,            /* 音量 0-100（默认 100%） */
    receive: "default",     /* 接收音效：default | standard | crisp | soft | custom_xxx */
    send: "default",        /* 发送音效：default | standard | crisp | soft | custom_xxx */
    customSounds: []        /* 自定义 mp3 音效元数据 [{ id, name, side }]，音频本体存 IndexedDB */
  };
  var SOUND_META = [
    { key: "default",  label: "默认音效" },
    { key: "standard", label: "标准" },
    { key: "crisp",    label: "清脆" },
    { key: "soft",     label: "柔和" }
  ];
  var DEFAULT_PROB = { card: 50, emoji: 15, kao: 20, sticker: 30, pat: 10, voice: 20, quote: 15, redpack: 10, qa: 12, subcard: 10, recall: 15 };
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
    { key: "qa", label: "问答混入", tip: "对方回复时发一个问答让你选择" },
    { key: "recall", label: "对方撤回", tip: "对方回复后撤回消息的概率" }
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
    /* 全局常驻消息引擎：不依赖聊天室激活，页面加载即运行 */
    globalProactiveTimer: null,      /* 全局主动消息定时器 */
    globalReplyTimers: {},           /* 全局回复调度表：partnerId -> timeout */
    pendingReply: {},                /* 后台隐藏期间到期、待回前台补发的回复：partnerId -> true */
    engineStarted: false             /* 引擎是否已启动（唯一运行意图标志） */
  };

  /* ---------- 基础工具 ---------- */
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsTrySet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsSet(k, v) { lsTrySet(k, v); }
  /* 聊天记录：无上限 · 跟随设备内存永久保存 */
  var CHAT_DB = "snowcrystal.chat.v1.db";
  var CHAT_STORE = "kv";
  var CHAT_META_KEY = "chat.meta";          
  var CHAT_MSG_PREFIX = "chat.msg.";        
  var chatMem = null;
  var chatIdbCache = null;
  function chatIdbWriteAll(c) {
    if (!c || typeof c !== "object" || !window.indexedDB) { return Promise.resolve(false); }
    return chatIdbOpen().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(CHAT_STORE, "readwrite");
          var store = tx.objectStore(CHAT_STORE);
          var wrote = false;
          function writeWith(existingKeys) {
            if (wrote) { return; }
            wrote = true;
            try {
              var i, k, pid, pids = [], seen = {};
              /* [V31] 保留库中已存在的会话键：内存副本若因启动竞态少了一部分会话，
                 旧实现会把 meta.pids 改写成残缺列表，那些消息键从此成孤儿、永久读不出来。 */
              for (i = 0; i < existingKeys.length; i++) {
                k = String(existingKeys[i]);
                if (k.indexOf(CHAT_MSG_PREFIX) === 0) {
                  pid = k.slice(CHAT_MSG_PREFIX.length);
                  if (pid && !seen[pid]) { seen[pid] = true; pids.push(pid); }
                }
              }
              /* [V34] 库中已有会话键、而本次要写的聊天内容全空 → 这是空壳，直接放弃覆盖。
                 旧实现在此无条件 put(meta) + 重写消息键，一次启动竞态就能把聊天库清成 0 条。 */
              if (pids.length > 0 && _chatMsgCount(c) === 0) { return; }
              for (pid in c.messages) {
                if (c.messages[pid] && Array.isArray(c.messages[pid]) && !seen[pid]) { seen[pid] = true; pids.push(pid); }
              }
              store.put({ key: CHAT_META_KEY, value: { chats: c.chats || [], starts: c.starts || {}, pids: pids, ver: c.ver || 0, tombs: c.tombs || {} } });
              for (pid in c.messages) {
                if (c.messages[pid] && Array.isArray(c.messages[pid])) {
                  store.put({ key: CHAT_MSG_PREFIX + pid, value: c.messages[pid] });
                }
              }
            } catch (e) { /* 事务已关闭：交给调用方下次重试 */ }
          }
          if (typeof store.getAllKeys === "function") {
            var keysReq = store.getAllKeys();
            keysReq.onsuccess = function () { writeWith(keysReq.result || []); };
            keysReq.onerror = function () { writeWith([]); };
          } else { writeWith([]); }
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
          tx.onabort = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    }).catch(function () { return false; });
  }
  /* 显式删除若干会话（删角色 / 清空记录时调用，与上面的「保守保留」配套，避免数据复活） */
  function chatIdbDropPids(pids) {
    if (!window.indexedDB || !pids || !pids.length) { return Promise.resolve(false); }
    return chatIdbOpen().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(CHAT_STORE, "readwrite");
          var store = tx.objectStore(CHAT_STORE);
          for (var i = 0; i < pids.length; i++) { store.delete(CHAT_MSG_PREFIX + pids[i]); }
          store.get(CHAT_META_KEY).onsuccess = function (ev) {
            var rec = ev.target.result;
            var meta = (rec && rec.value) || { chats: [], starts: {}, pids: [] };
            meta.pids = (meta.pids || []).filter(function (p) { return pids.indexOf(p) < 0; });
            meta.chats = (meta.chats || []).filter(function (x) { return !x || pids.indexOf(x.id) < 0; });
            store.put({ key: CHAT_META_KEY, value: meta });
          };
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
          tx.onabort = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    }).catch(function () { return false; });
  }
  function chatIdbReadAll() {
    if (!window.indexedDB) { return Promise.resolve(null); }
    return chatIdbOpen().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(CHAT_STORE, "readonly");
          var store = tx.objectStore(CHAT_STORE);
          var metaReq = store.get(CHAT_META_KEY);
          var pids = [];
          metaReq.onsuccess = function () {
            var meta = metaReq.result && metaReq.result.value;
            if (meta && meta.pids && Array.isArray(meta.pids)) { pids = meta.pids; }
            else if (meta && meta.chats && Array.isArray(meta.chats)) { for (var i = 0; i < meta.chats.length; i++) { if (meta.chats[i] && meta.chats[i].id) { pids.push(meta.chats[i].id); } } }
            var out = { chats: (meta && meta.chats) || [], starts: (meta && meta.starts) || {}, messages: {}, ver: (meta && meta.ver) || 0, tombs: (meta && meta.tombs) || {} };
            var pending = pids.length;
            if (!pending) { resolve(out); return; }
            pids.forEach(function (pid) {
              var g = store.get(CHAT_MSG_PREFIX + pid);
              g.onsuccess = function () {
                var v = g.result && g.result.value;
                if (Array.isArray(v)) { out.messages[pid] = v; }
                pending--;
                if (pending <= 0) { resolve(out); }
              };
              g.onerror = function () { pending--; if (pending <= 0) { resolve(out); } };
            });
          };
          metaReq.onerror = function () { resolve({ chats: [], starts: {}, messages: {} }); };
        } catch (e) { resolve(null); }
      });
    }).catch(function () { return null; });
  }
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
  function _chatEmpty() { return { chats: [], messages: {}, starts: {}, ver: 0, tombs: {} }; }
  /* [V31] 版本戳：每次落盘单调递增，用于判断「哪一侧才是最新的完整快照」。
     没有它，双写就只能靠并集兜底 —— 并集只能变多不能变少，「清空 / 删除」永远无法生效。 */
  function _chatNextVer(c) {
    var t = (window.Date && Date.now) ? Date.now() : 0;
    var v = (c && c.ver) || 0;
    return t > v ? t : v + 1;
  }
  /* 删除墓碑：session → 删除时刻。合并时早于墓碑的消息一律视为已删除，
     这样「旧快照因写入失败残留」也不会把删掉的内容复活。 */
  function _chatMarkTomb(c, pid) {
    if (!c || pid == null) { return c; }
    if (!c.tombs || typeof c.tombs !== "object") { c.tombs = {}; }
    c.tombs[String(pid)] = (window.Date && Date.now) ? Date.now() : 0;
    return c;
  }
  /* 合并两份聊天数据：chats 按 id 并集、messages 按消息 id 并集、按时间重排。
     不变量：合并只会变多不会变少 —— 任何一次读取都不允许「选错数据源」导致整体丢失。 */
  function _mergeChatObjects(a, b) {
    var out = _chatEmpty();
    a = (a && typeof a === "object") ? a : _chatEmpty();
    b = (b && typeof b === "object") ? b : _chatEmpty();
    var i, k, pid;
    /* chats 并集 */
    var byId = {}, order = [];
    (function (list) {
      if (!Array.isArray(list)) { return; }
      for (var j = 0; j < list.length; j++) {
        var ch = list[j];
        if (!ch || !ch.id) { continue; }
        if (!byId[ch.id]) { byId[ch.id] = ch; order.push(ch.id); }
        else {
          var merged = {}, kk;
          for (kk in byId[ch.id]) { if (Object.prototype.hasOwnProperty.call(byId[ch.id], kk)) { merged[kk] = byId[ch.id][kk]; } }
          for (kk in ch) { if (Object.prototype.hasOwnProperty.call(ch, kk) && ch[kk] != null && ch[kk] !== "") { merged[kk] = ch[kk]; } }
          byId[ch.id] = merged;
        }
      }
    })(a.chats);
    (function (list) {
      if (!Array.isArray(list)) { return; }
      for (var j = 0; j < list.length; j++) {
        var ch = list[j];
        if (!ch || !ch.id) { continue; }
        if (!byId[ch.id]) { byId[ch.id] = ch; order.push(ch.id); }
        else {
          var merged = {}, kk;
          for (kk in byId[ch.id]) { if (Object.prototype.hasOwnProperty.call(byId[ch.id], kk)) { merged[kk] = byId[ch.id][kk]; } }
          for (kk in ch) { if (Object.prototype.hasOwnProperty.call(ch, kk) && ch[kk] != null && ch[kk] !== "") { merged[kk] = ch[kk]; } }
          byId[ch.id] = merged;
        }
      }
    })(b.chats);
    for (i = 0; i < order.length; i++) { out.chats.push(byId[order[i]]); }
    /* starts */
    (function (src) {
      if (!src || typeof src !== "object") { return; }
      for (var kk in src) { if (Object.prototype.hasOwnProperty.call(src, kk) && src[kk]) { out.starts[kk] = src[kk]; } }
    })(a.starts);
    (function (src) {
      if (!src || typeof src !== "object") { return; }
      for (var kk in src) { if (Object.prototype.hasOwnProperty.call(src, kk) && src[kk]) { out.starts[kk] = src[kk]; } }
    })(b.starts);
    /* 墓碑与版本先合并：后面的消息并集要按墓碑裁剪 */
    out.tombs = {};
    (function (src) {
      if (!src || typeof src !== "object") { return; }
      for (var p in src) {
        if (!Object.prototype.hasOwnProperty.call(src, p)) { continue; }
        var ts = src[p] || 0;
        if (!out.tombs[p] || ts > out.tombs[p]) { out.tombs[p] = ts; }
      }
    })(a.tombs);
    (function (src) {
      if (!src || typeof src !== "object") { return; }
      for (var p in src) {
        if (!Object.prototype.hasOwnProperty.call(src, p)) { continue; }
        var ts = src[p] || 0;
        if (!out.tombs[p] || ts > out.tombs[p]) { out.tombs[p] = ts; }
      }
    })(b.tombs);
    out.ver = Math.max(a.ver || 0, b.ver || 0);
    /* messages 并集 */
    var pidList = [], seenPid = {};
    (function (ms) {
      if (!ms || typeof ms !== "object") { return; }
      for (var p in ms) { if (Object.prototype.hasOwnProperty.call(ms, p) && !seenPid[p]) { seenPid[p] = true; pidList.push(p); } }
    })(a.messages);
    (function (ms) {
      if (!ms || typeof ms !== "object") { return; }
      for (var p in ms) { if (Object.prototype.hasOwnProperty.call(ms, p) && !seenPid[p]) { seenPid[p] = true; pidList.push(p); } }
    })(b.messages);
    for (i = 0; i < pidList.length; i++) {
      pid = pidList[i];
      var list = [], seen = {};
      var pushArr = function (arr) {
        if (!Array.isArray(arr)) { return; }
        for (var j = 0; j < arr.length; j++) {
          var m = arr[j];
          if (!m) { continue; }
          var key = (m.id != null && m.id !== "")
            ? ("i:" + m.id)
            : ("t:" + (m.time || 0) + "|" + (m.role || "") + "|" + String(m.text != null ? m.text : (m.content != null ? m.content : "")).slice(0, 60));
          if (seen[key]) { continue; }
          seen[key] = true;
          list.push(m);
        }
      };
      pushArr(a.messages && a.messages[pid]);
      pushArr(b.messages && b.messages[pid]);
      list.sort(function (x, y) { return (x && x.time ? x.time : 0) - (y && y.time ? y.time : 0); });
      if (list.length > MAX_MSG_PER_CHAT) { list.splice(0, list.length - MAX_MSG_PER_CHAT); }
      out.messages[pid] = list;
    }
    /* 按墓碑裁剪：早于删除时刻的消息属于「已删内容」，任何一侧残留都不许复活 */
    for (pid in out.tombs) {
      if (!Object.prototype.hasOwnProperty.call(out.tombs, pid)) { continue; }
      var tTs = out.tombs[pid] || 0;
      if (!tTs || !Array.isArray(out.messages[pid])) { continue; }
      out.messages[pid] = out.messages[pid].filter(function (m) {
        return m && (m.time || 0) > tTs;
      });
    }
    /* 其余顶层业务字段：以 b（较新）优先，缺则取 a */
    var kk2;
    for (kk2 in a) {
      if (Object.prototype.hasOwnProperty.call(a, kk2) && kk2 !== "chats" && kk2 !== "messages" && kk2 !== "starts" && kk2 !== "ver" && kk2 !== "tombs") { out[kk2] = a[kk2]; }
    }
    for (kk2 in b) {
      if (Object.prototype.hasOwnProperty.call(b, kk2) && kk2 !== "chats" && kk2 !== "messages" && kk2 !== "starts" && kk2 !== "ver" && kk2 !== "tombs") { out[kk2] = b[kk2]; }
    }
    return out;
  }
  function _mergeChatFromIdb(v) {
    if (!v || typeof v !== "object" || !chatMem || typeof chatMem !== "object") { return; }
    chatMem = _mergeChatObjects(chatMem, v);
  }
  /* [V31] 聊天数据就绪闸门：IDB 全量预载完成前，任何读写都不许落盘。
     旧实现的致命序列：首屏某处 loadChat() 读到空 → 得到空壳 → 一次 saveChat
     就把空壳作为「全量」写进 IDB，并把 meta.pids 改写成残缺列表，旧会话从此
     成为孤儿键永久读不出来（刷新后聊天全丢）。 */
  var chatReady = false;
  var chatDeferred = null;
  function markChatReady() {
    if (chatReady) { return; }
    chatReady = true;
    try {
      if (chatDeferred) {
        var base = chatIdbCache || chatMem || _chatEmpty();
        chatMem = _mergeChatObjects(base, chatDeferred);
        chatDeferred = null;
        _chatPending = chatMem;
        _chatDirty = true;
        flushChatSave();
      } else if (chatMem && chatIdbCache) {
        chatMem = _mergeChatObjects(chatIdbCache, chatMem);
      }
    } catch (e) { /* 忽略 */ }
    try { document.dispatchEvent(new CustomEvent("snowcrystal:chat-ready")); } catch (e2) { /* 忽略 */ }
  }
  function chatIdbPreload() {
    function finish(v, migrating) {
      if (v && typeof v === "object") {
        if (!Array.isArray(v.chats)) { v.chats = []; }
        if (!v.messages || typeof v.messages !== "object") { v.messages = {}; }
        if (!v.ver) { v.ver = 0; }
        if (!v.tombs || typeof v.tombs !== "object") { v.tombs = {}; }
        chatIdbCache = v;
        if (migrating && chatMem) { chatIdbWriteAll(chatMem); }
      }
      /* [V32] 已因超时兜底解闸：IDB 全量迟到时合并进内存并补写、重绘，而不是丢掉 */
      if (chatReady) {
        try {
          if (chatIdbCache && chatMem) {
            chatMem = _mergeChatObjects(chatMem, chatIdbCache);
            _chatPending = chatMem;
            _chatDirty = true;
            flushChatSave();
          }
          document.dispatchEvent(new CustomEvent("snowcrystal:chat-ready"));
        } catch (e0) { /* 忽略 */ }
        return;
      }
      markChatReady();
    }
    if (!window.indexedDB) { markChatReady(); return; }
    chatIdbReadAll().then(function (v) {
      if (v && typeof v === "object") { finish(v, false); return; }
      /* 旧格式迁移：早期版本把整个聊天对象存为单 key（CHAT_KEY） */
      chatIdbGet(CHAT_KEY).then(function (oldV) {
        finish((oldV && typeof oldV === "object") ? oldV : null, true);
      }).catch(function () { markChatReady(); });
    }).catch(function () { markChatReady(); });
  }
  /* [V32] 预载必须无条件发起：旧实现只在 window.indexedDB 存在时才调 chatIdbPreload，
     于是「没有 indexedDB」的环境（Safari 隐私模式、部分 WebView、被策略禁用的内嵌页）
     chatReady 永远停在 false —— loadChat 只返回临时视图、saveChat 全部堆进 chatDeferred
     不落盘，刷新后角色和聊天记录全灭。另加超时兜底，防 open() 长期挂起永不就绪。 */
  if (typeof window !== "undefined") {
    try { chatIdbPreload(); } catch (e) { try { markChatReady(); } catch (e1) { /* 忽略 */ } }
    try {
      setTimeout(function () { if (!chatReady) { markChatReady(); } }, 3000);
    } catch (e2) { /* 忽略 */ }
  }
  /* [V31] 就绪后重绘：首屏可能在 IDB 全量回来之前就渲染了一次空列表，
     不重绘用户会看到「刷新后聊天全没了」的假象。 */
  (function bindChatReadyRepaint() {
    function repaint() {
      try {
        if (document.querySelector('.page.is-active[data-page="chat-list"]') && typeof renderChatList === "function") { renderChatList(); }
        if (document.querySelector('.page.is-active[data-page="chat-room"]') && state && state.partnerId && typeof renderMessages === "function") {
          renderMessages(state.partnerId, false);
        }
      } catch (e) { /* 忽略 */ }
    }
    try {
      document.addEventListener("snowcrystal:chat-ready", repaint);
      window.addEventListener("snowcrystal:storage-ready", repaint);
      if (document.readyState !== "loading") { setTimeout(repaint, 0); }
      else { document.addEventListener("DOMContentLoaded", function () { setTimeout(repaint, 0); }); }
    } catch (e) { /* 忽略 */ }
  })();
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
  /* [V31] 数据源裁决：谁新听谁，另一侧只负责补「自己完全没有的会话」。
     既能救回「一侧写入失败」的新数据，也不会让残留的旧数据把已删内容带回来。 */
  function _resolveChat(lsC, idbC) {
    lsC = (lsC && typeof lsC === "object") ? lsC : null;
    idbC = (idbC && typeof idbC === "object") ? idbC : null;
    if (!lsC && !idbC) { return null; }
    if (!lsC) { return idbC; }
    if (!idbC) { return lsC; }
    var lv = lsC.ver || 0, iv = idbC.ver || 0;
    /* 版本化之前的旧数据：两侧都可能各自独占一部分内容，只能并集（宁可多不可少） */
    if (!lv && !iv) { return _mergeChatObjects(lsC, idbC); }
    var base = iv > lv ? idbC : lsC;
    var other = (base === idbC) ? lsC : idbC;
    var out = _mergeChatObjects(base, { chats: [], messages: {}, starts: {}, ver: 0, tombs: {} });
    var pid, i, k;
    /* 墓碑也要从另一侧补齐：它记录的是「删过什么」，属于只能累加的事实 */
    if (other.tombs && typeof other.tombs === "object") {
      for (k in other.tombs) {
        if (!Object.prototype.hasOwnProperty.call(other.tombs, k)) { continue; }
        var tts = other.tombs[k] || 0;
        if (!out.tombs[k] || tts > out.tombs[k]) { out.tombs[k] = tts; }
      }
    }
    if (other.messages && typeof other.messages === "object") {
      for (pid in other.messages) {
        if (!Object.prototype.hasOwnProperty.call(other.messages, pid)) { continue; }
        if (out.messages[pid]) { continue; }   /* base 已有该会话：以 base 为准，避免复活旧内容 */
        if (out.tombs[pid]) { continue; }      /* 已删会话不再补回 */
        var arr = other.messages[pid];
        if (Array.isArray(arr)) { out.messages[pid] = arr.slice(); }
      }
    }
    if (Array.isArray(other.chats)) {
      var have = {};
      for (i = 0; i < out.chats.length; i++) { if (out.chats[i] && out.chats[i].id) { have[out.chats[i].id] = true; } }
      for (i = 0; i < other.chats.length; i++) {
        var ch = other.chats[i];
        if (!ch || !ch.id || have[ch.id] || out.tombs[ch.id]) { continue; }
        out.chats.push(ch);
        have[ch.id] = true;
      }
    }
    if (other.starts && typeof other.starts === "object") {
      for (k in other.starts) {
        if (!Object.prototype.hasOwnProperty.call(other.starts, k)) { continue; }
        if (out.starts[k] == null) { out.starts[k] = other.starts[k]; }
      }
    }
    out.ver = Math.max(lv, iv);
    return out;
  }
  function loadChat() {
    var c;
    if (chatMem) { return chatMem; }
    if (!chatReady) {
      /* 预载未完成：只返回临时视图，绝不写成内存权威 —— 一旦成为权威，后续任何
         一次 saveChat 都会把「还没读出来的历史」当全量写回磁盘，历史就此消失 */
      var prov = lsGet(CHAT_KEY);
      if (!prov || typeof prov !== "object") { return _chatEmpty(); }
      if (!Array.isArray(prov.chats)) { prov.chats = []; }
      if (!prov.messages || typeof prov.messages !== "object") { prov.messages = {}; }
      return prov;
    }
    /* 就绪后：按版本戳择优 —— 写入成功的一侧必然更新；两侧都成功则内容一致。
       旧数据没有版本戳（ver 均为 0），只能退回并集，保证「一次都不丢」。 */
    var lsC = lsGet(CHAT_KEY), idbC = chatIdbCache;
    c = _resolveChat(lsC, idbC);
    if (!c || typeof c !== "object") { c = _chatEmpty(); }
    if (!Array.isArray(c.chats)) { c.chats = []; }
    if (!c.messages || typeof c.messages !== "object") { c.messages = {}; }
    chatMem = c;
    return c;
  }
  var _chatDirty = false;
  var _chatFlushTimer = null;
  var _chatPending = null;
  var _chatSnapLimit = 400000;   /* localStorage 快照上限：超过只信 IDB，避免挤占小键配额 */
  var _chatSnapHard = 3500000;   /* [V32] 没有 IDB 时 ls 是唯一持久层，快照上限必须放宽 */
  function _chatHasIdb() {
    try { return !!(window.XJ_STORE && window.XJ_STORE.status && window.XJ_STORE.status().idb); }
    catch (e) { return false; }
  }
  function flushChatSave() {
    if (!_chatDirty) { return; }
    _chatDirty = false;
    _chatFlushTimer = null;
    var c = _chatPending;
    _chatPending = null;
    if (!c || typeof c !== "object") { return; }
    /* [V34] 空壳快照不落盘：内存副本还没从 IDB 恢复之前，绝不让它变成 LS 上的「权威」 */
    if (_chatMsgCount(c) === 0 && !(c.chats && c.chats.length) &&
        chatIdbCache && _chatMsgCount(chatIdbCache) > 0) { return; }
    /* 双写：localStorage 快照（同步、扛得住异步落盘被打断）+ IndexedDB 全量（权威） */
    try {
      var snap = JSON.stringify(c);
      var hasIdb = _chatHasIdb();
      var limit = hasIdb ? _chatSnapLimit : _chatSnapHard;
      if (snap && snap.length <= limit) {
        if (window.XJ_STORE && window.XJ_STORE.lsSetOnly) { window.XJ_STORE.lsSetOnly(CHAT_KEY, snap); }
        else { window.localStorage.setItem(CHAT_KEY, snap); }
      } else if (hasIdb && window.XJ_STORE && window.XJ_STORE.lsRemoveOnly) {
        /* 超限且 IDB 可用：清掉旧快照，避免「旧快照 + 新全量」合并时把已删内容复活；
           没有 IDB 时绝不能删 —— 那是唯一的持久副本 */
        window.XJ_STORE.lsRemoveOnly(CHAT_KEY);
      }
    } catch (e0) { /* 配额/序列化失败：IDB 兜底 */ }
    if (typeof window !== "undefined" && window.indexedDB) {
      chatIdbWriteAll(c).then(function (ok) { if (ok) { chatIdbCache = c; } });
    } else {
      chatIdbCache = null;
    }
  }
  function saveChat(c) {
    if (!c || typeof c !== "object") { return false; }
    if (!chatReady) {
      /* 预载未完成：先挂起，就绪后与 IDB 全量合并再落盘，绝不抢跑覆盖 */
      chatDeferred = chatDeferred ? _mergeChatObjects(chatDeferred, c) : c;
      return true;
    }
    /* 每次落盘抬升版本戳：这是「哪份快照更新」的唯一依据 */
    c.ver = _chatNextVer(c);
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
      /* [V32] 预载没完成就卸载（IDB 打开很慢/被阻塞）：把 chatDeferred 直接落成 ls 快照，
         并抬版本戳，否则这一整次会话的聊天只活在内存里，重开即空 */
      if (!chatReady && chatDeferred) {
        try {
          var c = _mergeChatObjects(chatIdbCache || _chatEmpty(), chatDeferred);
          c.ver = _chatNextVer(c);
          var snap = JSON.stringify(c);
          if (snap) {
            if (window.XJ_STORE && window.XJ_STORE.lsSetOnly) { window.XJ_STORE.lsSetOnly(CHAT_KEY, snap); }
            else { window.localStorage.setItem(CHAT_KEY, snap); }
          }
        } catch (e0) { /* 忽略 */ }
      }
      flushChatSave();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", function () { if (document.hidden) { flush(); } });
  })();
  var CSET_MIG_KEY = "snowcrystal.chat.settings.mig.v17";
  /* 老用户已存过设置时，把本轮要求的新默认值补齐（只执行一次） */
  function migrateChatDefaults() {
    try {
      if (window.localStorage.getItem(CSET_MIG_KEY)) { return; }
      var old = lsGet(CSET_KEY);
      if (old && typeof old === "object") {
        old.callAllow = true;
        old.replyMin = 5;
        old.replyMax = 30;
        old.proactiveInterval = 30;
        lsSet(CSET_KEY, old);
      }
      window.localStorage.setItem(CSET_MIG_KEY, "1");
    } catch (e) { /* 忽略 */ }
  }
  function loadSettings() {
    migrateChatDefaults();
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

  /* 优先走 11-account.js 的统一账号接口：localStorage 受限（雨见等第三方浏览器隐私模式禁用存储） */
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
  function loadWcl() {
    /* v-FIX：优先复用字卡库的统一读取（XJ_STORE + v1 旧键抢救 + 结构规范化），
       否则聊天拼字卡会与字卡库页面看到的数据不一致（页面有条目、拼卡却 0 张） */
    try {
      if (window.SnowCrystal && typeof window.SnowCrystal.loadWcl === "function") {
        var d = window.SnowCrystal.loadWcl();
        if (d && typeof d === "object") { return d; }
      }
    } catch (e) { /* 回退本地读取 */ }
    var w = lsGet(WCL_KEY);
    return (w && typeof w === "object") ? w : null;
  }
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

  /* 表情包图片：dataURL / http(s) URL 直用；mediaKey（m_xxx）从雪晶媒体库 Indexed */
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
  /* 发热优化 P0-3：单会话消息上限，超出后保尾裁剪（丢弃最旧消息）， */
  var MAX_MSG_PER_CHAT = 20000; 
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
    if (msg.msgType === "letter") { return "[信件] " + String(msg.letterTitle || "无题"); }
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
    /* [FIX] 标记"正在进入会话"：即使同一会话已有虚拟列表，也要定位到最新消息 */
    _chatEntering = true;
    renderMessages(partnerId);
    /* [V29] 渲染完成后兜一次头像同步：若此刻存储仍在补数据，就绪事件里还会再同步一次 */
    try { syncChatAvatars(); } catch (eS) { /* 忽略 */ }
    lockChatDocScroll(true);
    setupChatKbCompat();
    /* 进入聊天室：清除本会话的顶栏弹窗与排队（消息已在聊天流中，弹窗无意义） */
    if (state.notifyTimer) { clearTimeout(state.notifyTimer); state.notifyTimer = null; }
    hideNotifyBar();
    state.notifyShowing = false;
    state.notifyQueue = state.notifyQueue.filter(function (it) { return it.partnerId !== partnerId; });
    if (state.notifyQueue.length) { notifyNext(); }
    /* 全局常驻消息引擎由页面加载/设置开关统一管理，进聊天室不再重启， */
    startSimulateCallTimer();
  }
  /* 底栏信息区：我方角色名 / 当前情绪 / 心动值（无存储时占位） */
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
    var nameEl = document.getElementById("chatRoomName");
    if (nameEl) {
      nameEl.textContent = (p && p.name && String(p.name).trim()) ? String(p.name).trim() : "对方";
    }
    refreshStreakDisplay();
  }
  /* 顶栏火苗 + 连续聊天天数（基于聊天记录持久化数据计算；心动数字已移除） */
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
  function computeStreak(partnerId) {
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
        refreshStreakDisplay();
        wcToast("已清除起始日期，天数恢复按聊天记录统计");
        return;
      }
      var d = parseStartDate(v);
      if (!d) { wcToast("没读懂这个日期，试试 2024-05-20 这样的写法"); return; }
      var mo = d.getMonth() + 1, day = d.getDate();
      var fmt = d.getFullYear() + "-" + (mo < 10 ? "0" + mo : mo) + "-" + (day < 10 ? "0" + day : day);
      c.starts[partnerId] = fmt;
      saveChat(c);
      refreshStreakDisplay();
      wcToast("已设置起始日期 " + fmt + "，连续天数自动更新");
    }, { hideLine: true });
  }
  function refreshStreakDisplay() {
    var wrap = document.getElementById("chatRoomStreak");
    var streakEl = document.getElementById("chatStreakNum");
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
    var f = computeStreak(state.partnerId);
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
    lockChatDocScroll(false);
  }
  function clearChatHistory(partnerId) {
    var c = loadChat(), i;
    if (c.messages[partnerId]) { c.messages[partnerId] = []; }
    /* [V31] 打墓碑：清空必须能在「另一侧快照残留旧消息」时依然生效 */
    _chatMarkTomb(c, partnerId);
    for (i = 0; i < c.chats.length; i++) { if (c.chats[i].id === partnerId) { c.chats[i].lastText = ""; c.chats[i].lastTime = 0; break; } }
    saveChat(c);
    /* 清理该会话待执行的撤回定时器，避免清空后回调误渲染 */
    var tk, keys = Object.keys(_recallTimers);
    for (i = 0; i < keys.length; i++) {
      tk = keys[i];
      if (tk.indexOf(String(partnerId) + "::") === 0) { clearTimeout(_recallTimers[tk]); delete _recallTimers[tk]; }
    }
    renderMessages(partnerId);
  }
  /* [V31] 删除角色时同步抹掉其会话：内存 / localStorage 快照 / IndexedDB 三处一起清，
     否则下次启动「快照 + IDB 取并集」会把已删角色的聊天复活。 */
  function purgePartnerChat(pid) {
    if (!pid) { return; }
    pid = String(pid);
    try {
      var c = loadChat();
      if (c.messages) { delete c.messages[pid]; }
      if (c.starts) { delete c.starts[pid]; }
      if (Array.isArray(c.chats)) { c.chats = c.chats.filter(function (x) { return !x || String(x.id) !== pid; }); }
      _chatMarkTomb(c, pid);
      /* [V34] 会话被删空时同样是「用户显式删除」，需要放行，否则最后一个会话删不掉 */
      if (!Object.keys(c.messages || {}).length && !(Array.isArray(c.chats) && c.chats.length)) {
        try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell('snowcrystal.chat.v1', 10000); } } catch (eNS) { /* 忽略 */ }
      }
      chatMem = c;
      _chatPending = c;
      _chatDirty = true;
      flushChatSave();
    } catch (e) { /* 忽略 */ }
    try { if (window.indexedDB) { chatIdbDropPids([pid]); } } catch (e2) { /* 忽略 */ }
    try { if (chatIdbCache) {
      if (chatIdbCache.messages) { delete chatIdbCache.messages[pid]; }
      if (Array.isArray(chatIdbCache.chats)) { chatIdbCache.chats = chatIdbCache.chats.filter(function (x) { return !x || String(x.id) !== pid; }); }
    } } catch (e3) { /* 忽略 */ }
  }

  /* 账号设置头像形状（circle/square）：跟随 snowcrystal.account.my.v1 / partn */
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

  /* ==================================================================
     [V29] 头像首屏就绪：刷新后历史消息头像不再「先错后对」
     根因：头像随对方角色数据存于统一存储层（localStorage 优先，超额/被清理
           时由 IndexedDB 兜底并异步回灌内存镜像）。首屏渲染发生在 IDB 回灌
           之前时，buildRenderCache 读到的是空角色数据，于是整列表按「无头像」
           渲染成首字占位（或旧的错误头像），而首屏渲染后没有任何就绪回调去
           重绘，只能退出会话再进来（重新 buildRenderCache）才恢复。
     做法：渲染照旧进行、不阻塞不加固定延时；监听存储层就绪事件，就绪后按
           最新数据重建 cache 并「原地替换」已挂载的头像节点；进入会话与账号
           资料变更时各补一次同步，任何时序下首屏头像都与真实数据一致。
     ================================================================== */
  function chatStoreReady() {
    try { if (window.__xjStorageReady) { return true; } } catch (e) { /* 忽略 */ }
    try {
      return !!(window.XJ_STORE && typeof window.XJ_STORE.idbReady === "function" && window.XJ_STORE.idbReady());
    } catch (e) { return false; }
  }
  function syncChatAvatars() {
    try {
      var pid = (_vl && _vl.pid) || state.partnerId;
      if (!pid) { return; }
      /* 0) 水合完成前首屏可能整段渲染成「还没开始聊天」：数据到位后补渲染一次 */
      var box0 = document.getElementById("chatMessages");
      if (box0) {
        var c0 = loadChat();
        var list0 = (c0 && c0.messages && c0.messages[pid]) ? c0.messages[pid] : [];
        if (list0.length && (!_vl || _vl.pid !== pid || !_vl.rows || !_vl.rows.length)) {
          if (box0.querySelector(".chat-msg-empty") || !box0.querySelector(".chat-msg")) {
            try { renderMessages(pid); } catch (e0) { /* 忽略 */ }
          }
        }
      }
      var fresh = buildRenderCache(pid);
      var old = (_vl && _vl.cache) || null;
      var changed = !old ||
        old.myAvatarHtml !== fresh.myAvatarHtml ||
        old.otherAvatarHtml !== fresh.otherAvatarHtml ||
        old.myShapeCls !== fresh.myShapeCls ||
        old.otherShapeCls !== fresh.otherShapeCls;
      if (_vl && _vl.pid) { _vl.cache = fresh; }
      if (!changed) { return; }
      /* 1) 已挂载的消息气泡头像：原地替换，不重建列表、不打断滚动与输入 */
      var nodes = document.querySelectorAll("#chatMessages .chat-msg"), i, isSelf, av, want, shape;
      for (i = 0; i < nodes.length; i++) {
        isSelf = nodes[i].classList.contains("is-self");
        av = nodes[i].querySelector(".chat-msg-avatar");
        if (!av) { continue; }
        want = isSelf ? fresh.myAvatarHtml : fresh.otherAvatarHtml;
        shape = "chat-msg-avatar" + (isSelf ? fresh.myShapeCls : fresh.otherShapeCls);
        if (av.className !== shape) { av.className = shape; }
        if (av.innerHTML !== want) { av.innerHTML = want; }
      }
      /* 2) 会话列表（若首屏渲染时角色未就绪，头像/昵称会缺）：有数据才重排 */
      var listWrap = document.getElementById("chatListWrap");
      if (listWrap && listWrap.children.length && fresh.partners && fresh.partners.length) {
        try { renderChatList(); } catch (e1) { /* 忽略 */ }
      }
      /* 3) 会话底栏「我的名字/情绪」同样依赖我方资料 */
      try { renderChatRoomInfo(); } catch (e2) { /* 忽略 */ }
    } catch (e) { /* 忽略 */ }
  }
  /* 存储层就绪 → 同步；已就绪则立即同步一次 */
  try {
    if (chatStoreReady()) { syncChatAvatars(); }
    else {
      (window.__xjStorageReadyFns = window.__xjStorageReadyFns || []).push(syncChatAvatars);
      document.addEventListener("snowcrystal:storage-ready", syncChatAvatars);
    }
  } catch (e) { /* 忽略 */ }
  /* 账号资料（头像/昵称/形状）变更后同样同步 */
  document.addEventListener("snowcrystal:account-updated", function () { syncChatAvatars(); });

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

  /* v-DUR-FIX：聊天语音时长兜底 —— 消息 voiceDur 缺失/为 0 时，按音频本体量真实时长并回写消息 */
  var CHAT_DUR_CACHE = {}, CHAT_DUR_TRIED = {};
  function chatDecodeDur(src) {
    return new Promise(function (resolve) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC || !src || src.indexOf("data:") !== 0 || src.length > 12 * 1024 * 1024) { resolve(0); return; }
        var bin = window.atob(String(src).split(",")[1] || ""), len = bin.length, buf = new Uint8Array(len), i;
        for (i = 0; i < len; i++) { buf[i] = bin.charCodeAt(i); }
        var ctx = new AC(), done = false;
        function fin(d) {
          if (done) { return; }
          done = true;
          try { ctx.close(); } catch (e) { /* ignore */ }
          d = Math.round(Number(d) || 0);
          resolve(isFinite(d) && d > 0 ? d : 0);
        }
        setTimeout(function () { fin(0); }, 4000);
        try { ctx.decodeAudioData(buf.buffer, function (ab) { fin(ab && ab.duration); }, function () { fin(0); }); } catch (e) { fin(0); }
      } catch (e2) { resolve(0); }
    });
  }
  function chatMeasureDur(src) {
    if (!src) { return Promise.resolve(0); }
    var ck = src.length + ":" + src.slice(0, 48) + ":" + src.slice(-48);
    if (CHAT_DUR_CACHE[ck] > 0) { return Promise.resolve(CHAT_DUR_CACHE[ck]); }
    return new Promise(function (resolve) {
      var settled = false, au = null;
      function fin(d) {
        if (settled) { return; }
        settled = true;
        d = Math.round(Number(d) || 0);
        if (au) { try { au.onloadedmetadata = null; au.onerror = null; au.pause(); au.removeAttribute("src"); } catch (e) { /* ignore */ } }
        if (isFinite(d) && d > 0) { CHAT_DUR_CACHE[ck] = d; resolve(d); return; }
        chatDecodeDur(src).then(function (d2) {
          if (d2 > 0) { CHAT_DUR_CACHE[ck] = d2; }
          resolve(d2 || 0);
        });
      }
      try {
        au = new Audio();
        au.preload = "metadata";
        au.muted = true;
        au.onloadedmetadata = function () { fin(au.duration); };
        au.onerror = function () { fin(0); };
        setTimeout(function () { fin(au ? au.duration : 0); }, 2500);
        au.src = src;
      } catch (e) { fin(0); }
    });
  }
  /* 把气泡上的时长文本改成真实值（同一条消息可能有多处渲染节点） */
  function chatRefreshVoiceDur(mid, d) {
    try {
      var nodes = document.querySelectorAll(".chat-voice-dur, .chat-fwd-card-preview-text"), i, host, txt, cls;
      for (i = 0; i < nodes.length; i++) {
        host = nodes[i].closest ? nodes[i].closest("[data-mid]") : null;
        if (!host || String(host.getAttribute("data-mid") || "") !== String(mid || "")) { continue; }
        cls = nodes[i].className || "";
        if (cls.indexOf("chat-voice-dur") >= 0) { nodes[i].textContent = fmtVoiceDur(d); continue; }
        /* 转发卡片预览：只在确认是语音摘要时替换，避免误改其它类型摘要 */
        txt = String(nodes[i].textContent || "");
        if (txt.indexOf("[语音]") === 0) { nodes[i].textContent = "[语音] " + fmtVoiceDur(d); }
      }
    } catch (e) { /* ignore */ }
  }
  /* 测量并回写单条语音消息的真实时长（每条只尝试一次，避免反复测量） */
  function chatFixVoiceDur(m) {
    if (!m || !m.voice) { return; }
    if (Math.round(Number(m.voiceDur) || 0) > 0) { return; }
    var key = String(m.id || (m.voice.length + ":" + m.voice.slice(-32)));
    if (CHAT_DUR_TRIED[key]) { return; }
    CHAT_DUR_TRIED[key] = 1;
    chatMeasureDur(m.voice).then(function (d) {
      d = Math.round(Number(d) || 0);
      if (!(d > 0)) { return; }
      m.voiceDur = d;
      try { saveChat(loadChat()); } catch (e) { /* ignore */ }
      chatRefreshVoiceDur(m.id, d);
    });
  }

 /* 语音气泡点击播放：按 data-mid 从消息记录取回音频，播放/再点停止 */
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
  var _msgMeta = { partnerId: "", count: 0, start: 0, total: 0 };
 var CHAT_INIT_RENDER = 100; /* 初次渲染最近消息条数（ DISPLAYED_MSG_COUNT） */
 var CHAT_HISTORY_BATCH = 60; /* 每次「加载更早消息」向前追加的条数（ HISTORY_BATCH_SIZE） */
  var _historyLoading = false;  /* 防止加载更早重入 */

  /* 撤回内容快照 / 标记 / 展示（全局撤回逻辑） */
  function recallSnapshot(m) {
    return {
      type: m.msgType || "",
      text: m.text || "",
      img: m.img || "",
      voice: m.voice || "",
      voiceDur: m.voiceDur || 0,
      amount: m.amount || 0,
      wish: m.wish || "",
      q: m.q || "",
      opts: (m.opts || []).slice(),
      multi: !!m.multi,
      quote: m.quote ? { text: m.quote.text || "", mid: m.quote.mid || "" } : null
    };
  }
  function markRecallMsg(m, recallText) {
    m.isRecall = true;
    m.recallText = recallText;
    m.recalled = recallSnapshot(m);
    m.text = ""; m.msgType = "recall"; m.voice = ""; m.img = "";
    m.amount = 0; m.wish = ""; m.q = ""; m.opts = []; m.multi = false;
    m.quote = null; m.innerType = ""; m.origType = "";
  }
  function recallBodyHtml(m) {
    var r = m.recalled;
    if (!r) { return ""; }
    var t = "";
    if (r.text) { t = String(r.text); }
    else if (r.type === "voice") { t = "[语音] " + fmtVoiceDur(r.voiceDur || 0); }
    else if (r.type === "sticker" || r.type === "image") { t = "[图片]"; }
    else if (r.type === "redpack") { t = "[红包] " + String(r.wish || ""); }
    else if (r.type === "qa") { t = "[问答] " + String(r.q || ""); }
    else if (r.type === "pat") { t = "[拍一拍] " + String(r.text || ""); }
    else if (r.type === "forward") { t = "[转发] " + String(r.text || ""); }
    if (!t) { return ""; }
    return '<div class="chat-bubble chat-bubble-recall' + (m.type === "self" ? " is-self" : " is-other") + '"><span class="chat-recall-tag">已撤回</span><span class="chat-recall-text">' + esc(t) + "</span></div>";
  }

 /* 撤回消息开启显示时，从 recalled 快照重建原消息对象， */
  function rebuildRecalledMsg(m) {
    var r = m.recalled;
    if (!r) return null;
    return {
      id: m.id,
      type: m.type,
      time: m.time,
      read: m.read,
      msgType: r.type || "text",
      text: r.text || "",
      img: r.img || "",
      voice: r.voice || "",
      voiceDur: r.voiceDur || 0,
      amount: r.amount || 0,
      wish: r.wish || "",
      q: r.q || "",
      opts: (r.opts || []).slice(),
      multi: !!r.multi,
      quote: r.quote || null,
      _recallTag: true
    };
  }

  function msgHtml(m, partnerId, set, isSelf, cache) {
    var html = "", fwdTag = "", quoteHtml = "";
    if (m.isRecall) {
 /* 撤回显示：开启时重建原消息 + 「已撤回」标签 + 下方居中提示（紧贴）； */
      var _rt = esc(m.recallText || (m.type === "self" ? "你撤回了一条消息" : "对方撤回了一条消息"));
      var _rbHtml = "";
      if (set.recallShow !== false) {
        var _rebuilt = rebuildRecalledMsg(m);
        if (_rebuilt) { _rbHtml = msgHtml(_rebuilt, partnerId, set, isSelf, cache); }
      }
      return _rbHtml + '<div class="chat-msg chat-msg-pat chat-msg-recall-near"><span class="chat-pat-text chat-recall-notice">' + _rt + "</span></div>";
    }
    if (m.msgType === "pat") {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + esc(m.text || "") + "</span></div>";
    }
    if (m.msgType === "call" || m.isCall) {
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text chat-msg-call">' + callNoticeIconHtml() + "<span>" + esc(m.text || "") + "</span></span></div>";
    }
    fwdTag = m.msgType === "forward" ? '<span class="chat-forward-tag">转发</span>' : "";
    if (m.quote && m.quote.text) {
      quoteHtml = '<div class="chat-msg-quote' + (isSelf ? " is-self" : " is-other") + '"><span class="msg-quote-ref" data-qmid="' + esc(m.quote.mid || "") + '"><span class="msg-quote-text">' + esc(m.quote.text) + "</span></span></div>";
    }
    html += '<div class="chat-msg ' + (isSelf ? "is-self" : "is-other") + '" data-mid="' + esc(m.id || "") + '">';
    html += '<span class="chat-msg-avatar' + avatarShapeCls(isSelf ? "my" : "other", partnerId, cache) + '">' + (isSelf ? avatarOfMy(cache) : avatarOf(partnerId, cache)) + "</span>";
    html += '<div class="chat-msg-col">';
    if (m.msgType === "voice") {
      html += '<div class="chat-bubble chat-voice-bubble' + (isSelf ? " is-self" : " is-other") + '" data-mid="' + esc(m.id || "") + '" role="button" tabindex="0" title="点击播放 / 停止" onclick="SnowCrystal.Chat.playVoiceMsg(this)">' + fwdTag + quoteHtml + voiceWaveHtml() + '<span class="chat-voice-dur">' + esc(fmtVoiceDur(m.voiceDur || 0)) + "</span></div>";
      /* v-DUR-FIX：voiceDur 为 0/缺失（历史消息或字卡时长未取到）时，异步量真实时长并回写 */
      try { chatFixVoiceDur(m); } catch (e) { /* ignore */ }
    } else if (m.msgType === "sticker" || (m.msgType === "forward" && m.img)) {
      var stkKey = stickerItemImg(m.img), stkUrl = mediaCacheGet(stkKey);
      html += '<div class="chat-bubble chat-bubble-sticker">' + fwdTag + quoteHtml + (stkUrl ? '<img class="chat-sticker-img" src="' + esc(stkUrl) + '" alt="表情包">' : '<img class="chat-sticker-img" data-src="' + esc(stkKey) + '" alt="表情包">') + '</div>';
    } else if (m.msgType === "image") {
      var imgKey = m.img || "", imgUrl = mediaCacheGet(imgKey);
      html += '<div class="chat-bubble chat-bubble-img' + (isSelf ? " is-self" : " is-other") + '">' + fwdTag + quoteHtml + (imgUrl ? '<img class="chat-img" src="' + esc(imgUrl) + '" alt="图片">' : '<img class="chat-img" data-src="' + esc(imgKey) + '" alt="图片">') + '</div>';
    } else if (m.msgType === "redpack") {
      html += redpackCardHtml(m, isSelf, partnerId, set);
    } else if (m.msgType === "qa") {
      html += '<div class="chat-bubble chat-bubble-qa' + (isSelf ? " is-self" : " is-other") + '">' + fwdTag + quoteHtml + qaCardHtml(m, isSelf, partnerId, set) + "</div>";
    } else if (m.msgType === "letter") {
      /* [V18] 真实信封：颜色只认这封信的信纸 tint，不跟随外观主题 */
      var envTint = /^#[0-9a-fA-F]{6}$/.test(String(m.letterTint || "")) ? m.letterTint : "#e7dcc6";
      html += '<div class="chat-bubble chat-bubble-letter' + (isSelf ? " is-self" : " is-other") + '" data-letter-id="' + esc(m.letterId || "") + '" role="button" tabindex="0" style="--env-tint:' + envTint + '">' +
              fwdTag + quoteHtml +
              '<span class="env-paper">' +
                '<span class="env-flap"></span>' +
                '<span class="env-stamp">笺</span>' +
                '<span class="env-seal">✦</span>' +
                '<span class="env-addr"></span>' +
                '<span class="env-title">' + esc(m.letterTitle || "无题") + '</span>' +
                '<span class="env-rule"></span>' +
                '<span class="env-hint">轻点拆信 <i>›</i></span>' +
              '</span></div>';
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
    if (m._recallTag) {
      html += '<div class="chat-recall-tags"><span class="msg-recalled-tag">已撤回</span></div>';
    }
    if (t || readHtml) {
      html += '<div class="chat-msg-meta">' + (t ? "<span class='chat-msg-time'>" + esc(t) + "</span>" : "") + readHtml + "</div>";
    }
    html += "</div></div>";
    return html;
  }
  function fwdCardPreviewText(m) {
    var ot = m.origType || "";
    if (ot === "qa" || m.innerType === "qa") { return "[问答] " + String(m.q || ""); }
    if (ot === "redpack") { return "[红包] " + String(m.wish || ""); }
    if (ot === "pat") { return "[拍一拍] " + String(m.text || ""); }
    if (ot === "call" || m.isCall) { return "[通知] " + String(m.text || ""); }
    if (m.isRecall) { return "[通知] " + String(m.text || m.recallText || ""); }
    if (m.img) { return "[图片]"; }
    if (m.voice) {
      /* v-DUR-FIX：转发语音摘要的时长缺失时，同样按音频本体补算真实时长 */
      if (Math.round(Number(m.voiceDur) || 0) <= 0) { try { chatFixVoiceDur(m); } catch (e) { /* ignore */ } }
      return "[语音] " + String(fmtVoiceDur(m.voiceDur || 0));
    }
    return String(m.text || "");
  }
  function fwdCardItemHtml(m) {
    var originName = m.fwdOriginName || (m.fwdOriginType === "self" ? "我" : "对方");
    return '<div class="chat-fwd-card-preview"><span class="chat-fwd-card-preview-name">' + esc(originName) + '：</span><span class="chat-fwd-card-preview-text">' + esc(fwdCardPreviewText(m)) + "</span></div>";
  }
  function fwdCardHtml(grp, partnerId, set, isSelf, cache) {
    var first = grp[0];
    var fromName = first.fwdFromName || fwdFallbackFromName(partnerId);
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
  var VL_PAD_TOP = 14, VL_PAD_BOTTOM = 14;  /* 消息区上下内边距（getComputedStyle 修正） */
  var _vl = null;                            /* 当前消息列表状态 */
  var VL_BUFFER = 6;                         /* 兼容保留：可视区缓冲行数 */
  var VL_ROW_GAP = 12;                       /* 行间距（兼容保留） */
  /* [FIX-RAINSEE-20261109] 聊天消息改为「流式布局 + 固定窗口」。
     旧实现用 position:absolute + 估算行高 + ResizeObserver/rAF 实测修正：
     雨见等国产 WebView 上实测常滞后或漏触发（键盘弹出、字体加载、图片解码后尤甚），
     相邻行 top 会算小 → 气泡重叠、时间戳错位；滚动时反复增删 DOM + 重排是闪花与发热主因。
     现在由浏览器原生流式排布，任何字体/图片/键盘变化都不会造成重叠，且省掉测量循环。 */
  var _vlHCache = {};
  var _vlHCacheW = 0;
  var _vlImgIO = null;
  function vlEstimateH(m) {
    /* 仅供锚点/滚动位置的粗略参考，不再决定元素定位 */
    if (!m) { return 0; }
    if (m.isRecall) { return 30; }
    if (m.msgType === "pat" || m.msgType === "call") { return 26; }
    if (m.msgType === "sticker") { return 200; }
    if (m.msgType === "image") { return 220; }
    if (m.msgType === "voice") { return 58; }
    if (m.msgType === "redpack") { return 100; }
    if (m.msgType === "qa") { return 150; }
    if (m.msgType === "letter") { return 96; }
    if (m.msgType === "forward") { return 84 + Math.min(6, (m.fwdIds || []).length) * 22; }
    var t = String(m.text || "");
    var ln = Math.max(1, Math.ceil(t.length / 18));
    return 42 + ln * 22;
  }
  function vlRowH(m) {
    var c = (m && m.id) ? _vlHCache[m.id] : 0;
    return (c && c > 0) ? c : vlEstimateH(m);
  }
  /* [FWDRULE] 连续转发聚合：仅「同一发送方向」的转发消息并入同一张卡片 */
  function sameFwdGroup(a, b) {
    if (!a || !b) { return false; }
    if (a.msgType !== "forward" || b.msgType !== "forward") { return false; }
    return String(a.type || "") === String(b.type || "");
  }
  /* [FWDRULE] 卡片标题来源兜底 */
  function fwdFallbackFromName(pid) {
    var ps = loadPartners(), pi;
    if (pid && ps) {
      for (pi = 0; pi < ps.length; pi++) { if (ps[pi] && ps[pi].id === pid) { return ps[pi].name || "聊天"; } }
    }
    return "聊天";
  }
  function vlBuildRows(list, start) {
    var rows = [], i, m, k;
    for (i = start; i < list.length; i++) {
      m = list[i];
      if (!m) { continue; }
      if (m.msgType === "forward") {
        var n = 1; k = i + 1;
        while (k < list.length && sameFwdGroup(m, list[k])) { n++; k++; }
        rows.push({ i: i, n: n, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
        i = k - 1;
        continue;
      }
      rows.push({ i: i, n: 1, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
    }
    return rows;
  }
  function vlRowHtml(r) {
    var pid = _vl.pid, set = _vl.set, list = _vl.list, m = list[r.i];
    if (!m) { return ""; }
    if (m.msgType === "forward") {
      var grp = [];
      for (var j = 0; j < r.n; j++) { grp.push(list[r.i + j]); }
      return fwdCardHtml(grp, pid, set, m.type === "self", _vl.cache);
    }
    return msgHtml(m, pid, set, m.type === "self", _vl.cache) || "";
  }
  /* 图片懒加载：只在行接近可视区时解析 data-src，避免一次解码上百条历史图片 */
  function vlInitImgIO() {
    if (_vlImgIO || typeof IntersectionObserver !== "function") { return; }
    try {
      _vlImgIO = new IntersectionObserver(function (entries, obs) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].isIntersecting) { continue; }
          var el = entries[i].target;
          obs.unobserve(el);
          var imgs = collectPendingImgs(el);
          if (imgs.length) { resolvePendingImgs(imgs); }
        }
      }, { root: document.getElementById("chatMessages"), rootMargin: "320px 0px", threshold: 0 });
    } catch (e) { _vlImgIO = null; }
  }
  /* 按索引顺序插入 DOM：向上加载历史时也能正确前插，保证消息顺序永不错乱 */
  function vlInsertRowEl(idx, el) {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var rows = _vl.rows, j, next = null;
    for (j = idx + 1; j < rows.length; j++) {
      if (rows[j].el && rows[j].el.parentNode === box) { next = rows[j].el; break; }
    }
    if (next) { box.insertBefore(el, next); } else { box.appendChild(el); }
  }

  /* ===== [FIX-RAINSEE-20261109b] 超长历史保护：离屏行占位化 =====
     流式布局杜绝了气泡重叠，但上一版把「滚动时回收 DOM」也一并去掉了：
     持续上翻历史时行 DOM 只增不减，翻到 12000 条约 5 万个节点，
     一次强制布局就要 680ms（无头 Chromium 390x844 实测），低端机必然卡顿。
     这里让「远离视口的行」只保留一个固定高度的空壳：行元素依旧留在文档流里，
     顺序 / 位置不变、不增删节点、不写 top，因此不重叠、不闪花；
     接近视口时再还原完整内容。折叠高度取该行实测值，还原时若高度有差
     且行位于视口上方则同量补偿 scrollTop，阅读位置零跳动。
     短会话（<260 行）完全不介入，保持原有简单行为。 */
  var VL_MIN_COLLAPSE = 260;   /* 行数阈值：低于此值不做占位化 */
  var VL_KEEP_NEAR = 26;       /* 视口上下各保留完整内容的行数 */
  var _vlWinLo = -1, _vlWinHi = -1, _vlWinRaf = 0;

  function vlPhHtml(h) {
    return '<div class="chat-vl-ph" style="display:block;height:' + h + 'px"></div>';
  }
  function vlRestorePicks(el) {
    var _mmenu = window.SnowCrystal && window.SnowCrystal.ChatMsgMenu;
    var _mpick = _mmenu && typeof _mmenu.getPicks === "function" ? _mmenu.getPicks() : null;
    if (!_mpick || !_mpick.active || !_mpick.picks) { return; }
    var q = el.querySelector(".chat-msg, .chat-fwd-card-item");
    if (!q) { return; }
    var gids = q.getAttribute("data-fwd-ids") || "";
    if (gids) {
      var arr = gids.split(","), any = false, gi;
      for (gi = 0; gi < arr.length; gi++) { if (arr[gi] && _mpick.picks[arr[gi]]) { any = true; break; } }
      if (any) { q.classList.add("is-picked"); }
    } else if (q.getAttribute("data-mid") && _mpick.picks[q.getAttribute("data-mid")]) {
      q.classList.add("is-picked");
    }
  }
  function vlCollapseRow(r, h) {
    if (!r || !r.el || r.collapsed || r.i < 0) { return; }
    var hh = h || r.el.offsetHeight || r.hReal || r.h || 60;
    r.hReal = hh;
    r.el.style.height = hh + "px";
    r.el.innerHTML = vlPhHtml(hh);
    r.collapsed = true;
    if (_vlImgIO) { try { _vlImgIO.unobserve(r.el); } catch (e) {} }
  }
  function vlExpandRow(r) {
    if (!r || !r.el || !r.collapsed) { return; }
    var box = document.getElementById("chatMessages");
    var wasAbove = box ? (r.el.offsetTop < box.scrollTop) : false;
    var oldH = r.el.offsetHeight;
    r.el.innerHTML = vlRowHtml(r);
    r.el.style.height = "";
    r.collapsed = false;
    vlRestorePicks(r.el);
    var imgs = collectPendingImgs(r.el);
    if (imgs.length) {
      if (_vlImgIO) { try { _vlImgIO.observe(r.el); } catch (e) { resolvePendingImgs(imgs); } }
      else { resolvePendingImgs(imgs); }
    }
    var newH = r.el.offsetHeight, d = newH - oldH;
    /* 占位估算与真实高度若有差：行在视口上方时同量补偿，阅读位置不跳动 */
    if (d && wasAbove && box) { box.scrollTop += d; }
    r.hReal = newH;
  }
  /* 二分定位：行在文档流里 offsetTop 单调递增，不再依赖估算高度 */
  function vlFindIdxAt(y) {
    var lo = 0, hi = _vl.rows.length - 1, ans = 0, mid, r, t;
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      r = _vl.rows[mid];
      t = r && r.el ? r.el.offsetTop : 0;
      if (t <= y) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }
  function vlSyncWindow() {
    if (!_vl || !_vl.rows || _vl.rows.length < VL_MIN_COLLAPSE) { return; }
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var st = box.scrollTop, vh = box.clientHeight || 600, i, r;
    var lo = Math.max(0, vlFindIdxAt(st - vh) - VL_KEEP_NEAR);
    var hi = Math.min(_vl.rows.length - 1, vlFindIdxAt(st + vh * 2) + VL_KEEP_NEAR);
    if (lo === _vlWinLo && hi === _vlWinHi) { return; }

    /* 1) 全量扫描（纯 JS 数组遍历，12000 行 <1ms），分类收集待折叠 / 待展开行 */
    var coll = [], exp = [];
    for (i = 0; i < _vl.rows.length; i++) {
      r = _vl.rows[i];
      if (!r || !r.el || r.i < 0) { continue; }
      if (i < lo || i > hi) { if (!r.collapsed) { coll.push(i); } }
      else { if (r.collapsed) { exp.push(i); } }
    }
    /* 2) 批量读高度 → 批量写，避免读写交替触发反复重排 */
    var hs = [], j;
    for (j = 0; j < coll.length; j++) { hs[j] = _vl.rows[coll[j]].el.offsetHeight; }
    for (j = 0; j < coll.length; j++) { vlCollapseRow(_vl.rows[coll[j]], hs[j]); }
    /* 3) 展开：先批量记录旧位置/旧高度，再写内容，最后统一补偿位移 */
    var expOld = [], expAbove = [];
    for (j = 0; j < exp.length; j++) {
      var e = _vl.rows[exp[j]].el;
      expOld[j] = e.offsetHeight;
      expAbove[j] = (e.offsetTop < st);
    }
    for (j = 0; j < exp.length; j++) { vlExpandRow(_vl.rows[exp[j]]); }
    var delta = 0;
    for (j = 0; j < exp.length; j++) {
      if (expAbove[j]) { delta += _vl.rows[exp[j]].el.offsetHeight - expOld[j]; }
    }
    if (delta && box) { box.scrollTop += delta; }
    _vlWinLo = lo; _vlWinHi = hi;
  }
  function vlScheduleWindow() {
    if (_vlWinRaf) { return; }
    _vlWinRaf = window.requestAnimationFrame(function () { _vlWinRaf = 0; vlSyncWindow(); });
  }

  function vlEnsureRow(idx) {
    var r = _vl.rows[idx];
    if (!r || r.el) { return; }
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var html = r.i < 0 ? historyLoaderHtml() : vlRowHtml(r);
    var el = document.createElement("div");
    el.className = "chat-vl-row";
    /* 流式布局：不写 top / 不写 height，由浏览器排布，天然杜绝重叠 */
    el.innerHTML = html;
    vlInsertRowEl(idx, el);
    r.el = el;
    var fresh = collectPendingImgs(el);
    if (fresh.length) {
      if (_vlImgIO) { try { _vlImgIO.observe(el); } catch (e) { resolvePendingImgs(fresh); } }
      else { resolvePendingImgs(fresh); }
    }
    vlRestorePicks(el);
    /* 不再 rAF 测量 / ResizeObserver：去掉测量→重排→再测量的循环，省电且不再闪动 */
  }
  function vlDisposeRow(idx) {
    var r = _vl.rows[idx];
    if (!r || !r.el) { return; }
    if (r.ro) { try { r.ro.disconnect(); } catch (e) {} r.ro = null; }
    if (_vlImgIO) { try { _vlImgIO.unobserve(r.el); } catch (e) {} }
    if (r.el.parentNode) { r.el.parentNode.removeChild(r.el); }
    r.el = null;
  }
  function vlMeasureRow(idx) {
    /* 只更新高度缓存供锚点参考；不再重排 DOM、不再补滚，避免抖动 */
    var r = _vl.rows[idx];
    if (!r || !r.el) { return; }
    var h = r.el.offsetHeight + VL_ROW_GAP;
    if (h > 0 && Math.abs(h - r.h) > 1) {
      r.h = h;
      if (r.mid) { _vlHCache[r.mid] = h; }
      var i, acc = r.top + r.h;
      for (i = idx + 1; i < _vl.rows.length; i++) { _vl.rows[i].top = acc; acc += _vl.rows[i].h; }
      _vl.totalH = acc;
    }
  }
  function vlReflowFrom(idx) {
    /* 仅维护元数据 top（供锚点/跳转参考），不再写 style.top、不再算 spacer 高度 */
    var acc = idx > 0 ? (_vl.rows[idx - 1].top + _vl.rows[idx - 1].h) : 0, i;
    for (i = idx; i < _vl.rows.length; i++) {
      _vl.rows[i].top = acc;
      acc += _vl.rows[i].h;
    }
    _vl.totalH = acc;
    _vl.gap = 0;
    _vl._allRowsMounted = false;
    if (_vl.spacer) { _vl.spacer.style.height = "0px"; }
  }
  function vlUpdateViewport() {
    if (!_vl) { return; }
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    /* 一次渲染窗口内全部行（约 100 条），窗口外不再回收 DOM：
       避免滚动时反复增删节点造成的闪花、跳动与持续 CPU 占用 */
    if (_vl._allRowsMounted) { return; }
    for (var i = 0; i < _vl.rows.length; i++) { vlEnsureRow(i); }
    _vl._allRowsMounted = true;
    _vlWinLo = -1;          /* 新行入 DOM 后重算离屏窗口 */
    vlSyncWindow();
  }
  function vlFirstVisible(x) {
    var lo = 0, hi = _vl.rows.length - 1, ans = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (_vl.rows[mid].top + _vl.rows[mid].h <= x) { lo = mid + 1; } else { ans = mid; hi = mid - 1; }
    }
    return ans;
  }
  function vlLastVisible(x) {
    var lo = 0, hi = _vl.rows.length - 1, ans = _vl.rows.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (_vl.rows[mid].top <= x) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }
  function vlScrollToMid(mid, center, flash) {
    if (!mid || !_vl) { return false; }
    var i, idx = -1;
    for (i = 0; i < _vl.list.length; i++) { if (_vl.list[i] && _vl.list[i].id === mid) { idx = i; break; } }
    if (idx < 0) { return false; }
    if (idx < _vl.start) { vlExpandTo(idx); }
    var rIdx = -1;
    for (i = 0; i < _vl.rows.length; i++) {
      var r = _vl.rows[i];
      if (r.i <= idx && idx < r.i + r.n) { rIdx = i; break; }
    }
    if (rIdx < 0) { return false; }
    vlEnsureRow(rIdx);
    var box = document.getElementById("chatMessages");
    var rowEl = _vl.rows[rIdx].el;
    /* 流式布局：用真实 DOM 位置定位，不再依赖估算高度 */
    var target = rowEl ? rowEl.offsetTop : (VL_PAD_TOP + _vl.gap + _vl.rows[rIdx].top);
    box.scrollTop = center ? Math.max(0, target - (box.clientHeight || 0) / 2) : Math.max(0, target);
    _chatUserIntent = true; _chatStickBottom = false;
    vlUpdateViewport();
    vlSyncWindow();          /* 跳转后立即展开目标附近内容，避免占位空壳闪现 */
    var el = _vl.rows[rIdx].el;
    if (el && flash) {
      var q = el.querySelector(".chat-msg, .chat-fwd-card-item") || el;
      q.classList.remove("chat-msg-flash");
      void q.offsetWidth;
      q.classList.add("chat-msg-flash");
      window.setTimeout(function () { q.classList.remove("chat-msg-flash"); }, 1800);
    }
    return true;
  }
  function vlExpandTo(targetIdx) {
    var list = _vl.list, newStart = targetIdx;
    while (newStart > 0 && sameFwdGroup(list[newStart], list[newStart - 1])) { newStart--; }
    if (newStart >= _vl.start) { return; }
    var head = [];
    if (newStart > 0) { head.push({ i: -1, n: 1, mid: "", top: 0, h: 40, el: null, ro: null }); }
    var i, m, k;
    for (i = newStart; i < _vl.start; i++) {
      m = list[i];
      if (!m) { continue; }
      if (m.msgType === "forward") {
        var n = 1; k = i + 1;
        while (k < _vl.start && sameFwdGroup(m, list[k])) { n++; k++; }
        head.push({ i: i, n: n, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
        i = k - 1;
        continue;
      }
      head.push({ i: i, n: 1, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
    }
    var oldRows = _vl.rows;
    if (oldRows[0] && oldRows[0].i < 0) { oldRows = oldRows.slice(1); }
    _vl.rows = head.concat(oldRows);
    _vl.start = newStart;
    _msgMeta.start = newStart;
    vlReflowFrom(0);
    vlUpdateViewport();   /* 前插的新行按索引插入 DOM 最前面 */
  }

  function renderMessages(partnerId, appendOnly) {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    var c = loadChat();
    var list = c.messages[partnerId] || [];
    var set = loadSettings();
    if (!list.length) {
      _msgMeta = { partnerId: partnerId, count: 0, start: 0, total: 0 };
      _vl = null;
      _chatStickBottom = true;
      box.innerHTML = '<div class="chat-msg-empty"><p>你们还没开始聊天<br>发一句试试吧</p></div>';
      return;
    }
    /* 增量追加：同一会话且尾部扩展（发送/自动回复等），只在虚拟列表尾部追加行元数据， */
    if (appendOnly && _vl && _msgMeta.partnerId === partnerId && list.length > _msgMeta.count) {
      var oldCount = _msgMeta.count;
      if (oldCount > 0 && sameFwdGroup(list[oldCount - 1], list[oldCount])) {
        renderMessages(partnerId, false);
        return;
      }
      var i, m, k, hasSelf = false;
      for (i = oldCount; i < list.length; i++) {
        m = list[i];
        if (!m) { continue; }
        if (m.type === "self") { hasSelf = true; }
        if (m.msgType === "forward") {
          var n = 1; k = i + 1;
          while (k < list.length && sameFwdGroup(m, list[k])) { n++; k++; }
          _vl.rows.push({ i: i, n: n, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
          i = k - 1;
          continue;
        }
        _vl.rows.push({ i: i, n: 1, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
      }
      _msgMeta.count = list.length;
      _msgMeta.total = list.length;
      _vl.list = list;
      vlReflowFrom(0);
      vlUpdateViewport();
      /* [FIX] 追加增量：我方发送强制到底；对方新消息仅在原本贴底时才跟随 */
      scrollChatBottom(hasSelf);
      return;
    }
    /* 全量重建：数据窗口取尾部最近 CHAT_INIT_RENDER 条，其余行元数据仅用于撑滚动条， */
    var start = 0;
    if (list.length > CHAT_INIT_RENDER) { start = list.length - CHAT_INIT_RENDER; }
    while (start > 0 && sameFwdGroup(list[start], list[start - 1])) { start--; }
    /* [FIX] 区分"新会话"与"同会话重渲染"：后者（已读回执、数据刷新）不得把用户拉回底部 */
    var _isNewCtx = (_chatEntering || !_vl || !_vl.rows || _vl.pid !== partnerId);
    _chatEntering = false;
    var _prevAnchorMid = null, _prevAnchorDelta = 0;
    if (!_isNewCtx) {
      /* [FIX-RAINSEE] 流式布局：锚点取真实 DOM 位置，不再用估算行高换算 */
      var _sbt = box.scrollTop, _pi;
      for (_pi = 0; _pi < _vl.rows.length; _pi++) {
        var _pr = _vl.rows[_pi];
        if (_pr.el && _pr.i >= 0 && (_pr.el.offsetTop + _pr.el.offsetHeight) > _sbt) {
          _prevAnchorMid = _pr.mid; _prevAnchorDelta = _sbt - _pr.el.offsetTop;
          break;
        }
      }
    }
    _msgMeta = { partnerId: partnerId, count: list.length, start: start, total: list.length };
    var cache = buildRenderCache(partnerId);
    var rows = vlBuildRows(list, start);
    if (start > 0) { rows.unshift({ i: -1, n: 1, mid: "", top: 0, h: 40, el: null, ro: null }); }
    _vl = { pid: partnerId, list: list, set: set, cache: cache, rows: rows, start: start, totalH: 0, gap: 0, spacer: null, _allRowsMounted: false };
    box.innerHTML = '<div class="chat-vl-spacer"></div>';
    _vl.spacer = box.firstChild;
    vlInitImgIO();
    var cs = getComputedStyle(box);
    VL_PAD_TOP = parseFloat(cs.paddingTop) || 14;
    VL_PAD_BOTTOM = parseFloat(cs.paddingBottom) || 14;
    vlReflowFrom(0);
    vlUpdateViewport();
    if (_isNewCtx) {
      _chatStickBottom = true;
      _chatUserIntent = false;
      scrollChatBottom(true);            /* 进入/切换会话：定位到最新消息 */
    } else if (!_chatStickBottom && _prevAnchorMid) {
      /* 同会话重渲染且用户在翻历史：按锚点复原阅读位置（行高实测后会再校正一次） */
      var _anchorFix = function () {
        if (_chatStickBottom || !_prevAnchorMid || !_vl) { return; }
        var _k;
        for (_k = 0; _k < _vl.rows.length; _k++) {
          if (_vl.rows[_k].mid === _prevAnchorMid && _vl.rows[_k].el) {
            box.scrollTop = _vl.rows[_k].el.offsetTop + _prevAnchorDelta;
            break;
          }
        }
        vlUpdateViewport();
      };
      _anchorFix();
      requestAnimationFrame(_anchorFix);
    } else {
      scrollChatBottom();
    }
    installHistoryLoaderScroll(box);
    return;
  }
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
  var _chatScrollScheduled = false;
  var _chatScrollForce = false;
  function scheduleChatBottom(force) {
    /* [FIX] force 语义透传：仅"我方发消息/进入会话"这类场景才允许强制吸底 */
    if (force) { _chatScrollForce = true; }
    if (_chatScrollScheduled) { return; }
    _chatScrollScheduled = true;
    requestAnimationFrame(function () {
      _chatScrollScheduled = false;
      var f = _chatScrollForce;
      _chatScrollForce = false;
      scrollChatBottom(f);
    });
  }
  function historyLoaderHtml() {
    return '<div class="chat-history-loader" id="chatHistoryLoader" role="button" tabindex="0" title="加载更早消息">加载更早消息</div>';
  }
  function hideHistoryLoader(box) {
    if (_vl && _vl.rows.length && _vl.rows[0].i < 0) {
      var r0 = _vl.rows[0];
      if (r0.el) {
        if (r0.ro) { try { r0.ro.disconnect(); } catch (e) {} r0.ro = null; }
        if (r0.el.parentNode) { r0.el.parentNode.removeChild(r0.el); }
        r0.el = null;
      }
      _vl.rows.shift();
      vlReflowFrom(0);
      vlUpdateViewport();
    }
    var loader = (box || document).querySelector("#chatHistoryLoader");
    if (loader) { loader.style.display = "none"; }
  }
  function installHistoryLoaderScroll(box) {
    if (!box || box._historyScrollBound) { return; }
    box._historyScrollBound = true;
    /* [FIX] 同步吸底状态：只有"用户手势"造成的离开底部才解除吸底；
       内容高度变化（图片解码、行高修正）不算用户上滑，不能因此丢失吸底 */
    box.addEventListener("scroll", function () {
      /* 真正滚到底（含拖到底被夹住）：立即恢复跟随，并消掉行高实测留下的残缝 */
      if ((box.scrollTop + box.clientHeight) >= (box.scrollHeight - 2)) {
        var wasStick = _chatStickBottom;
        _chatStickBottom = true;
        _chatUserIntent = false;
        if (!wasStick) { scheduleChatBottom(true); }
        return;
      }
      if (chatNearBottom(box)) { _chatStickBottom = true; _chatUserIntent = false; return; }
      if (_chatUserIntent) { _chatStickBottom = false; }
    });
    /* [FIX] 手势/滚轮向上立刻解除吸底，抢在待执行的 rAF 补滚之前生效 */
    box.addEventListener("wheel", function (ev) {
      if (ev.deltaY < 0) { _chatUserIntent = true; _chatStickBottom = false; }
    }, { passive: true });
    /* 任何按下/键盘翻页都视为"用户主动滚动"意图（兼容鼠标拖滚动条、PageUp 等） */
    box.addEventListener("pointerdown", function () { _chatUserIntent = true; }, { passive: true });
    box.addEventListener("keydown", function (ev) {
      var k = ev && ev.key;
      if (k === "PageUp" || k === "ArrowUp" || k === "Home") { _chatUserIntent = true; }
    });
    var _touchY = null;
    box.addEventListener("touchstart", function (ev) {
      _chatUserIntent = true;
      _touchY = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : null;
    }, { passive: true });
    box.addEventListener("touchmove", function (ev) {
      if (_touchY == null || !ev.touches || !ev.touches[0]) { return; }
      /* 手指下滑 = 内容上移 = 用户想查看更早消息 */
      if (ev.touches[0].clientY - _touchY > 6) { _chatUserIntent = true; _chatStickBottom = false; }
    }, { passive: true });
    var lastTrigger = 0;
    box.addEventListener("scroll", function () {
      if (_vl) {
        if (!_vl._raf) {
          _vl._raf = true;
          requestAnimationFrame(function () { _vl._raf = false; vlUpdateViewport(); vlScheduleWindow(); });
        }
      }
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
  function loadMoreHistory() {
    var box = document.getElementById("chatMessages");
    if (!box || _historyLoading || !_vl) { return; }
    var c = loadChat(), list = c.messages[_msgMeta.partnerId] || [];
    var start = _vl.start || 0;
    if (start <= 0) { hideHistoryLoader(box); return; }
    var newStart = Math.max(0, start - CHAT_HISTORY_BATCH);
    /* 连续转发聚合跨窗口边界：同样回退到连续段起点 */
    while (newStart > 0 && sameFwdGroup(list[newStart], list[newStart - 1])) { newStart--; }
    if (newStart >= start) { hideHistoryLoader(box); return; }
    _historyLoading = true;
    /* [FIX-RAINSEE] 锚点取真实 DOM 位置，避免估算高度误差造成加载历史后跳动 */
    var anchorId = null, anchorDelta = 0, i, _st = box.scrollTop;
    for (i = 0; i < _vl.rows.length; i++) {
      var rr = _vl.rows[i];
      if (rr.el && rr.i >= 0 && (rr.el.offsetTop + rr.el.offsetHeight) > _st) {
        anchorId = rr.mid; anchorDelta = _st - rr.el.offsetTop;
        break;
      }
    }
    /* 前插行元数据（不触碰 DOM、不阻塞）：loader 行 + newStart..start-1 的行 */
    var head = [];
    if (newStart > 0) { head.push({ i: -1, n: 1, mid: "", top: 0, h: 40, el: null, ro: null }); }
    var m, k;
    for (i = newStart; i < start; i++) {
      m = list[i];
      if (!m) { continue; }
      if (m.msgType === "forward") {
        var n = 1; k = i + 1;
        while (k < start && sameFwdGroup(m, list[k])) { n++; k++; }
        head.push({ i: i, n: n, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
        i = k - 1;
        continue;
      }
      head.push({ i: i, n: 1, mid: m.id, top: 0, h: vlRowH(m), el: null, ro: null });
    }
    var oldRows = _vl.rows;
    if (oldRows[0] && oldRows[0].i < 0) { oldRows = oldRows.slice(1); }
    _vl.rows = head.concat(oldRows);
    _vl.start = newStart;
    _msgMeta.start = newStart;
    vlReflowFrom(0);
    /* [FIX] 加载更早消息必然处于非底部状态：显式解除吸底 */
    _chatUserIntent = true; _chatStickBottom = false;
    if (newStart <= 0) { hideHistoryLoader(box); }
    vlUpdateViewport();   /* 先把前插的新行按索引插进 DOM */
    /* 锚点补偿：新行入 DOM 后按真实位置复原，保证可视内容不位移 */
    if (anchorId) {
      for (i = 0; i < _vl.rows.length; i++) {
        if (_vl.rows[i].mid === anchorId && _vl.rows[i].el) {
          box.scrollTop = _vl.rows[i].el.offsetTop + anchorDelta;
          break;
        }
      }
    }
    _historyLoading = false;
  }
  /* 滚到底部（增强版）：先强制同步布局并立即滚底；再扫描未完成图片 */
  /* [FIX-20261104] 吸底状态机：仅当用户停留在底部附近时才自动跟随最新消息 */
  var _chatStickBottom = true;   /* true=跟随最新消息；false=用户正在浏览历史，任何吸底都要放弃 */
  var _chatUserIntent = false;
  var _chatEntering = false;     /* true=本轮渲染由"进入会话"触发，必须定位到最新消息 */   /* true=用户刚做过向上滚动的手势（区分"用户上滑"与"内容变高"） */
  var CHAT_STICK_EDGE = 120;     /* 距底 <=120px 视为"在底部"，允许自动吸底 */
  function chatStickEdge(box) {
    /* 阈值随视口高度浮动：至少 120px，且不小于 1/5 屏，避免"差几十像素没到底"时误判为在翻历史 */
    var h = (box && box.clientHeight) ? box.clientHeight : 0;
    return Math.max(CHAT_STICK_EDGE, Math.round(h * 0.2));
  }
  function chatNearBottom(box, th) {
    if (!box) { return true; }
    var edge = typeof th === "number" ? th : chatStickEdge(box);
    return (box.scrollHeight - box.scrollTop - box.clientHeight) <= edge;
  }
  function scrollChatBottom(force) {
    var box = document.getElementById("chatMessages");
    if (!box) { return; }
    /* [FIX] 非强制且用户已上滑离开底部：不吸底、不打扰，保持当前位置 */
    if (!force && !_chatStickBottom) { return; }
    /* 1) 立即滚到底：设置 scrollTop 时读取 scrollHeight 已含一次必要布局， */
    box.scrollTop = box.scrollHeight;
    _chatStickBottom = true;
    /* 2) 扫描容器内未完成图片（data-src 异步加载 / 正在加载的 src）， */
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
        /* [FIX] 历史消息里的图片异步解码完成时，只有仍贴底才补滚，避免上滑时被拉回 */
        if (b && _chatStickBottom) { b.scrollTop = b.scrollHeight; }
      };
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });
    /* 3) 流式布局下高度由浏览器自己撑开，只需一次延迟补滚兜住异步图片解码 */
    var settle = function () {
      var b = document.getElementById("chatMessages");
      if (!b || !_chatStickBottom) { return; }
      b.scrollTop = b.scrollHeight;
    };
    requestAnimationFrame(settle);
    setTimeout(settle, 120);
  }

  /* [FIX-RAINSEE-20261109] 软键盘适配统一交给 xj-viewport-fit-js 的 CSS 变量 --xj-app-h。
     旧实现在 focus / blur / visualViewport resize·scroll 上反复写聊天页的 inline height+top、
     window.scrollTo(0,0)、多次 scrollChatBottom 并切换 body 的 overflow class，
     与后加的适配补丁互相打架，正是「点输入框页面飞上去」「界面闪来闪去」的元凶。
     现在容器高度纯 CSS 自适应，这里只保留函数签名（供旧调用点兼容），不注册任何重排监听。 */
  var _kbPage = null, _kbInput = null, _kbLocked = false;
  function lockChatDocScroll(on) { /* 废弃：body 的 overflow/height 由 CSS 统一钉死，不再切换 class */ }
  function chatKbOpen() {
    var vv = window.visualViewport;
    if (!vv) { return false; }
    return vv.height < (window.innerHeight - 40);
  }
  function fitChatViewport() { /* 废弃：不再写 inline height/top，避免键盘期间布局跳变 */ }
  function setupChatKbCompat() {
    if (_kbPage) { return; }
    _kbPage = document.querySelector('.page[data-page="chat-room"]');
    _kbInput = document.getElementById("chatInput");
  }

  /* 发送 / 已读 / 自动回复 */
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
    refreshStreakDisplay(); /* 发消息后立即刷新连续天数 */
    scheduleReadReceipt(msg.id);
    scheduleReply();
    maybeTriggerIncomingByKeyword(text);
    updateSendBtn(); /* 输入已清空：发送键收起，加号键恢复 */
    /* [FIX-RAINSEE] 发送后立刻把焦点还给输入框，软键盘不收起，界面不再闪一下 */
    if (inp && document.activeElement !== inp) {
      try { inp.focus({ preventScroll: true }); } catch (e) { try { inp.focus(); } catch (e2) {} }
    }
  }

  /* 图片 / 继续发送 / 屏幕常亮（v97 加号面板真实功能） */
  /* 写雪晶媒体库 IndexedDB：mediaKey -> dataURL，返回 Promise<mediaKey|nul */
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
          refreshStreakDisplay();
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
  /* 请求屏幕常亮（wakeLock）：成功持有后监听系统释放并自动重获； */
  function requestKeepScreenOn(silent) {
    if (state.wakeLockBusy) { return Promise.resolve(false); }
    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
      if (!silent) { wcToast("当前环境不支持屏幕常亮，需在 HTTPS 或本地部署下使用"); }
      return Promise.resolve(false);
    }
    state.wakeLockBusy = true;
    return navigator.wakeLock.request("screen").then(function (lock) {
      /* 核心修复①：监听 sentinel release —— 无论系统释放（页面 hidden / */
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
      /* 主动关闭：先置关闭意图并清句柄，再 release， */
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
  /* 核心修复②：页面重新可见且常亮开启但句柄已被释放（release 回调已置空） */
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

  /* 对方回复调度：改为全局常驻调度（不依赖聊天室激活态）， */
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

 /* 对方转发：低概率从历史消息（我方 + 对方）挑一条「转发」过来（ partnerForward） */
    if (r() < Number(set.forward) || 0) {
      /* [FWDRULE] 可转发范围：对方消息 + 我方消息（type="self"）；
         永久排除：转发消息本身（禁止嵌套）、红包、未作答问答卡、已撤回消息、无正文消息 */
      var hist = (loadChat().messages[partnerId] || []).filter(function (m) {
        if (!m) { return false; }
        if (m.type !== "self" && m.type !== "other") { return false; }              /* 系统通知等不参与转发 */
        if (m.msgType === "forward") { return false; }                              /* 禁止嵌套转发已有转发消息 */
        if (m.msgType === "redpack" || m.origType === "redpack") { return false; }  /* 红包永不转发 */
        if (m.msgType === "qa" && m.status !== "done") { return false; }            /* 未作答问答卡不转发 */
        if (m.isRecall) { return false; }                                           /* 已撤回无正文 */
        if (!m.text && !m.img && !m.voice && m.msgType !== "qa" && m.msgType !== "pat" && m.msgType !== "call") { return false; }
        return true;
      });
      var fm = pick(hist);
      if (fm) {
        /* [FWDRULE] 真实来源标注：fwdOriginType/fwdOriginName = 被转发消息的真实方向与发件人（我方=「我」/昵称）；
           fwdFrom/fwdFromName = 该消息所属会话（即当前会话），避免卡片标题回落成「其他对话的聊天记录」 */
        var fwdMsg = {
          msgType: "forward",
          text: fm.text || "",
          img: fm.img || "",
          voice: fm.voice || "",
          voiceDur: fm.voiceDur || 0,
          origType: fm.msgType || "",
          fwdOriginType: fm.type === "self" ? "self" : "other",
          fwdOriginName: fm.type === "self" ? (String(my.name || "").trim() || "我") : pName,
          fwdFrom: partnerId,
          fwdFromName: pName
        };
        if (fm.msgType === "qa" || fm.innerType === "qa") {
          fwdMsg.innerType = "qa";
          fwdMsg.q = fm.q || "";
          fwdMsg.opts = (fm.opts || []).slice();
          fwdMsg.multi = !!fm.multi;
          fwdMsg.picked = (fm.picked || []).slice();
          fwdMsg.pickedBy = fm.pickedBy || "";
          fwdMsg.status = fm.status || "done";
        } else if (fm.msgType === "pat") {
          fwdMsg.text = fm.text || "[拍一拍]";
        } else if (fm.msgType === "call" || fm.isCall) {
          fwdMsg.text = fm.text || "[通知]";
        } else if (fm.isRecall) {
          fwdMsg.text = fm.text || fm.recallText || "[通知]";
        }
        /* [FWDRULE] 空内容兜底：无正文则不发出空转发，落到下方正常回复流程 */
        var _fwdHasBody = fwdMsg.innerType === "qa"
          ? !!String(fwdMsg.q || fwdMsg.text || "").trim()
          : (!!String(fwdMsg.text || "").trim() || !!fwdMsg.img || !!fwdMsg.voice);
        if (_fwdHasBody) { pushOther(partnerId, fwdMsg); return; }
      }
    }
    /* 候选过滤后为空（或内容为空）：不 return，继续走正常回复流程 */

    if (mix.redpack !== false && (r() < Number(prob.redpack) || 0)) {
      try {
        var rpAmount = rpOtherAmount();
        var rpWish = pick(REDPACK_WISHES) || "小小心意";
        pushOther(partnerId, { msgType: "redpack", amount: rpAmount, wish: rpWish });
        return;
      } catch (e) { /* 红包分支异常：降级走下方基础回复 */ }
    }

    if (mix.qa && (r() < Number(prob.qa) || 0)) {
      try {
        var qaTpl = qaPickRandom();
        if (qaTpl && qaTpl.q && (qaTpl.opts || []).length >= 2) {
          pushOther(partnerId, { msgType: "qa", q: qaTpl.q, opts: qaTpl.opts.slice(), multi: !!qaTpl.multi });
          return;
        }
      } catch (e) { /* 问答分支异常：降级走下方基础回复 */ }
    }

    if (mix.voice && (r() < Number(prob.voice) || 0)) {
      try {
        var vc = voicePickRandom();
        if (vc) {
          soundGet(vc.audioKey).then(function (dataUrl) {
            if (dataUrl) {
              /* v-DUR-FIX：字卡 dur 为 0/缺失时先按音频本体量真实时长再发送，避免气泡恒显示 0′00″ */
              var sendVoice = function (dd) { pushOther(partnerId, { msgType: "voice", voice: dataUrl, voiceDur: Math.round(Number(dd) || 0), voiceText: vc.name }); };
              var d0 = Math.round(Number(vc.dur) || 0);
              if (d0 > 0) { sendVoice(d0); }
              else {
                chatMeasureDur(dataUrl).then(function (d) {
                  d = Math.round(Number(d) || 0);
                  if (d > 0) {
                    try { vc.dur = d; voiceSave(); renderVoiceEntry(); } catch (e) { /* ignore */ }
                  }
                  sendVoice(d);
                });
              }
            }
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

    /* 基础字卡：字卡库有字卡时取一条作为基础文案； */
    var mains = mainItems();
    var base = mains.length ? String(textOf(pick(mains)) || "") : "";
    var _subBase = false;

    /* 副字卡混入（角色专属）：开启且命中概率时，优先用当前角色的副字卡作为基础文案； */
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

    /* Emoji 混入：有基础文案时追加后缀；字卡库为空时可直接作为回复内容发送 */
    if (mix.emoji && (r() < Number(prob.emoji) || 0)) {
      var emArr = emojiItems();
      if (!emArr.length && WCL_DEFAULT.emoji) { emArr = flatten(WCL_DEFAULT.emoji); }
      var em = pick(emArr);
      if (em != null) { base = base ? base + " " + String(textOf(em)) : String(textOf(em)); }
    }

    /* 颜文字混入：有基础文案时追加后缀；字卡库为空时可直接作为回复内容发送 */
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
    /* 无任何可发送内容（字卡库为空且 Emoji / 颜文字混入均未命中）时 */
    if (!String(base || "").replace(/^\s+|\s+$/g, "")) {
      replyFallbackText(partnerId);
      return;
    }
    pushOther(partnerId, { msgType: "text", text: base, quote: quoteRef });
    } catch (e) {
      try { replyFallbackText(partnerId); } catch (e2) { /* 忽略 */ }
    }
  }

  function pushOther(partnerId, m) {
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "other", msgType: m.msgType, time: now() };
    if (m.msgType === "sticker") { msg.img = m.img || ""; msg.text = "[表情包]"; }
    else if (m.msgType === "forward") {
      msg.text = m.text || ""; msg.img = m.img || ""; msg.origType = m.origType || "";
      /* [FWDRULE] 透传真实来源：方向/发件人 + 所属会话，避免卡片标题与详情回落成「其他对话」「对方」 */
      msg.fwdOriginType = m.fwdOriginType || "";
      msg.fwdOriginName = m.fwdOriginName || "";
      msg.fwdFrom = m.fwdFrom || "";
      msg.fwdFromName = m.fwdFromName || "";
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
    /* vX：对方撤回概率 —— 对方发出的消息按概率稍后撤回（延迟 2~6 秒更真实）， */
    var _prob = loadProb();
    if ((Number(_prob.recall) || 0) > 0 && Math.random() * 100 < Number(_prob.recall)) {
      scheduleOtherRecall(partnerId, msg.id);
    }
    setLast(partnerId, msgText(msg), now());
    renderMessages(partnerId, true);
    chatPlayReceive();
    maybeNotifyIncoming(partnerId, msg);
    maybeAutoReplyKeyword(partnerId, msg); /* v102：命中自动回复关键词则由我方自动回一条 */
    /* 心动数字与旧火苗计数已移除：火苗点亮仅由自己当天发送消息决定 */
  }

  /* 对方撤回定时器：key = partnerId::mid；消息被删除/清空时回调自动跳过 */
  var _recallTimers = {};
  var RECALL_MIN_MS = 2000, RECALL_MAX_MS = 6000;
  function scheduleOtherRecall(partnerId, mid) {
    var delay = randInt(RECALL_MIN_MS, RECALL_MAX_MS);
    var key = String(partnerId) + "::" + String(mid);
    if (_recallTimers[key]) { clearTimeout(_recallTimers[key]); }
    _recallTimers[key] = setTimeout(function () {
      delete _recallTimers[key];
      var c = loadChat(), list = (c.messages[partnerId] || []), i, m = null;
      for (i = 0; i < list.length; i++) { if (String(list[i].id) === String(mid)) { m = list[i]; break; } }
      if (!m || m.isRecall) { return; }
      markRecallMsg(m, "对方撤回了一条消息");
      saveChat(c);
      setLast(partnerId, "对方撤回了一条消息", now());
      renderMessages(partnerId, false);
    }, delay);
  }

  /* 主动发送：全局常驻消息引擎（不依赖聊天室激活态） */
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
  /* 可见性联动 v12.4：隐藏期间不实际发送（tick 自行判断），无需清定时器； */
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
    /* 注意：全局常驻引擎（globalProactiveTimer / globalReplyTimers）不受聊天室开关影响 */
  }

  /* 后台保活：静音音频循环播放，防止页面被挂起 */
  function startKeepAlive() {
    stopKeepAlive();
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { return; }
    try {
      var ctx = new Ctx();
      var sr = ctx.sampleRate || 44100;
 var len = Math.max(1, Math.floor(sr * 0.25)); /* 250ms 静音 buffer（发热专项：，全 0 无需写样本） */
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
      /* 发热优化 P1-1：脉冲式保活 —— 播 250ms 静音后挂起整个 AudioContext */
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
  /* 发热专项：后台隐藏时停止保活音频，让浏览器可正常挂起页面（CSS 动画/定时器全停，后台零占用）； */
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

  /* 新消息顶部通知栏（任意页面可见） */
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

 /* 页面：聊天设置（分组入口，） */
  function openChatSettings() { switchPage("chat-settings"); renderChatSettings(); }
  /* 页面：顶栏底栏设置（栏背景显示 + 顶栏底栏配色），与聊天设置并列 */
  function openBarSettings() {
    switchPage("bar-settings");
    if (window.SnowCrystal && SnowCrystal.Chat && SnowCrystal.Chat.syncBarSettings) {
      SnowCrystal.Chat.syncBarSettings();
    }
  }
  function renderChatSettings() {
    var root = document.getElementById("chatSettingsWrap");
    if (!root) { return; }
    var set = loadSettings();
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatFeature()">' +
      '<span class="row-main"><span class="row-title">功能设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatAutoReply()">' +
      '<span class="row-main"><span class="row-title">自动回复</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatPace()">' +
      '<span class="row-main"><span class="row-title">节奏设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openLetterSettings()">' +
      '<span class="row-main"><span class="row-title">回信设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatSound()">' +
      '<span class="row-main"><span class="row-title">音效设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openProbSettings()">' +
      '<span class="row-main"><span class="row-title">概率设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openEffectSettings()">' +
      '<span class="row-main"><span class="row-title">特效设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      '<article class="row-card chat-entry-row" role="listitem" onclick="SnowCrystal.openChatBg()">' +
      '<span class="row-main"><span class="row-title">后台设置</span></span>' +
      '<span class="row-arrow">›</span></article>' +
      "</div>";
  }

  /* 页面：后台设置（后台保活 / 新消息通知 / 后台系统通知 收纳分组） */
  function openChatBg() { switchPage("chat-bg"); renderChatBg(); }
  function renderChatBg() {
    var set = loadSettings();
    var root = document.getElementById("chatBgWrap");
    if (!root) { return; }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">后台保活</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csKeepAlive"' + (set.keepAlive ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'keepAlive\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">新消息通知</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csNotifyBar"' + (set.notifyBar ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'notifyBar\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">后台系统通知</span>' +
      '<label class="wc-line-toggle"><input type="checkbox" id="csBgNotify"' + (set.bgNotify ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'bgNotify\',this.checked)"></label></article>' +
      "</div>";
  }

  /* 页面：特效设置（关键词触发 Emoji 满屏特效） */
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
      '<article class="row-card chat-set-row"><span class="row-title">关键词特效</span><label class="wc-line-toggle"><input type="checkbox" id="efEnabled"' + (set.effectEnabled ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'effectEnabled\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">掉落数量</span><input type="number" class="lf-input chat-text" id="efCount" min="10" max="120" value="' + (Number(set.effectCount) || 40) + '" onchange="SnowCrystal.chatSetEffectCount(this.value)"></article>' +
      "</div>" +
      '<div class="row-list">' + (rows || '<div class="chat-pat-empty">暂无规则，点击下方按钮添加</div>') + "</div>" +
      '<button class="ef-add-btn" type="button" onclick="SnowCrystal.addEffectRule()"><svg class="ef-add-ico" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM10.9 7.8h2.2v3.1h3.1v2.2h-3.1v3.1h-2.2v-3.1H7.8V9.9h3.1V7.8z"/></svg><span>添加关键词</span></button>';
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


  /* v102：自动回复 —— 规则增删改 + 对方消息命中关键词自动回一条 */
  function updateAutoReplyRule(i, field, val) {
    var set = loadSettings();
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules.slice() : [];
    if (i < 0 || i >= rules.length) { return; }
    if (!rules[i] || typeof rules[i] !== "object") { rules[i] = { kw: "", txt: "" }; }
    if (field === "kw") { rules[i].kw = String(val || "").slice(0, 16); }
    else if (field === "txt") { rules[i].txt = String(val || "").slice(0, 200); }
    set.autoReplyRules = rules;
    saveSettings(set);
    wcToast("已保存");
  }
  function delAutoReplyRule(i) {
    var set = loadSettings();
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules.slice() : [];
    if (i < 0 || i >= rules.length) { return; }
    rules.splice(i, 1);
    set.autoReplyRules = rules;
    saveSettings(set);
    renderAutoReplySettings();
    wcToast("已删除");
  }
  function addAutoReplyRule() {
    /* v49：不再直接生成空白规则，改为打开弹窗填写，确认后才落库 */
    openAutoReplyEditor(-1);
  }
  var _autoReplyTimers = {};
  /* 对方发来文字消息时调用：命中任一关键词则延迟 0.6~1.5s 自动回一条 */
  function maybeAutoReplyKeyword(partnerId, msg) {
    if (!partnerId || !msg) { return; }
    if (msg.type && msg.type !== "other") { return; }
    if (msg.msgType && msg.msgType !== "text") { return; }
    var text = String(msg.text || "");
    if (!text || text.charAt(0) === "[") { return; }
    var set = loadSettings();
    if (!set.autoReplyEnabled) { return; }
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules : [];
    var i, r, kw, hit = null;
    for (i = 0; i < rules.length; i++) {
      r = rules[i] || {};
      kw = String(r.kw || "");
      if (kw && text.indexOf(kw) >= 0) { hit = r; break; }
    }
    if (!hit) { return; }
    var replyTxt = String(hit.txt || "").replace(/^\s+|\s+$/g, "");
    if (!replyTxt) { return; }
    var key = String(partnerId);
    if (_autoReplyTimers[key]) { clearTimeout(_autoReplyTimers[key]); }
    _autoReplyTimers[key] = setTimeout(function () {
      delete _autoReplyTimers[key];
      sendAutoReplyText(partnerId, replyTxt);
    }, 600 + Math.floor(Math.random() * 900));
  }
  function sendAutoReplyText(partnerId, text) {
    if (!partnerId || !text) { return; }
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "text", text: text, time: now(), read: false };
    pushMsg(partnerId, msg);
    setLast(partnerId, text, now());
    if (state && state.partnerId === partnerId) { renderMessages(partnerId, true); }
    try { chatPlaySend(); } catch (e) { /* 忽略 */ }
    try { triggerEffectForText(text); } catch (e2) { /* 忽略 */ }
  }
  window.SnowCrystal = window.SnowCrystal || {};
  window.SnowCrystal.updateAutoReplyRule = updateAutoReplyRule;
  window.SnowCrystal.delAutoReplyRule = delAutoReplyRule;
  window.SnowCrystal.addAutoReplyRule = addAutoReplyRule;
  window.SnowCrystal.openAutoReplyEditor = openAutoReplyEditor;
  window.SnowCrystal.closeAutoReplyEditor = closeAutoReplyEditor;
  window.SnowCrystal.saveAutoReplyEditor = saveAutoReplyEditor;
  window.SnowCrystal.maybeAutoReplyKeyword = maybeAutoReplyKeyword; /* 供外部/测试触发同一条逻辑 */

  /* 特效执行：发送消息命中关键词触发 */
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

 /* 页面：功能设置（聊天行为 + 互动功能） */
  function openChatFeature() { switchPage("chat-feature"); renderChatFeature(); }
  function renderChatFeature() {
    var set = loadSettings();
    var root = document.getElementById("chatFeatureWrap");
    if (!root) { return; }
    var m = set.mixSwitch || {};
    function seg(key, val) { return set[key] === val ? " is-on" : ""; }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">已读显示</span><span class="chat-seg">' +
      '<button type="button" class="chat-seg-btn' + seg("readMode", "icon") + '" data-val="icon" onclick="SnowCrystal.chatSetSeg(\'readMode\',\'icon\',this)">双勾</button>' +
      '<button type="button" class="chat-seg-btn' + seg("readMode", "text") + '" data-val="text" onclick="SnowCrystal.chatSetSeg(\'readMode\',\'text\',this)">文字</button></span></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">回车发送</span><label class="wc-line-toggle"><input type="checkbox" id="csEnterSend"' + (set.enterSend ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'enterSend\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">撤回消息显示</span><label class="wc-line-toggle"><input type="checkbox" id="csRecallShow"' + (set.recallShow !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'recallShow\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">允许对方引用消息</span><label class="wc-line-toggle"><input type="checkbox" id="csAllowQuote"' + (set.allowQuote !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'allowQuote\',this.checked)"></label></article>' +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">允许对方拨打通话</span><label class="wc-line-toggle"><input type="checkbox" id="csCallAllow"' + (set.callAllow ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'callAllow\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">拼字卡</span><label class="wc-line-toggle"><input type="checkbox" id="csMixCard"' + (m.card ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'card\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">拼字卡条数</span><span class="chat-field">最少 <input type="number" class="lf-input chat-num" id="csCardMin" value="' + (set.cardMin != null ? set.cardMin : 2) + '" min="1" max="9" onchange="SnowCrystal.chatSetNum(\'cardMin\',this.value)"> 张，最多 <input type="number" class="lf-input chat-num" id="csCardMax" value="' + (set.cardMax != null ? set.cardMax : 3) + '" min="1" max="9" onchange="SnowCrystal.chatSetNum(\'cardMax\',this.value)"> 张</span></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">连接符号</span><span class="chat-field"><input type="text" class="lf-input chat-num" id="csCardSep" value="' + (set.cardSep || "，") + '" maxlength="6" onchange="SnowCrystal.chatSetNum(\'cardSep\',this.value)"> 拼接多张字卡（如 ， 、 空格）</span></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">表情包</span><label class="wc-line-toggle"><input type="checkbox" id="csMixSticker"' + (m.sticker ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'sticker\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">颜文字</span><label class="wc-line-toggle"><input type="checkbox" id="csMixKao"' + (m.kao ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'kao\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">Emoji</span><label class="wc-line-toggle"><input type="checkbox" id="csMixEmoji"' + (m.emoji ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'emoji\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">拍一拍</span><label class="wc-line-toggle"><input type="checkbox" id="csMixPat"' + (m.pat ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'pat\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">语音字卡</span><label class="wc-line-toggle"><input type="checkbox" id="csMixVoice"' + (m.voice ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'voice\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">引用消息</span><label class="wc-line-toggle"><input type="checkbox" id="csMixQuote"' + (m.quote ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'quote\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">红包</span><label class="wc-line-toggle"><input type="checkbox" id="csMixRedpack"' + (m.redpack !== false ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'redpack\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row"><span class="row-title">问答</span><label class="wc-line-toggle"><input type="checkbox" id="csMixQa"' + (m.qa ? " checked" : "") + ' onchange="SnowCrystal.chatSetMix(\'qa\',this.checked)"></label></article>' +
      "</div>";
  }

 /* 页面：自动回复（总开关 + 已设置规则的紧凑列表；新增/编辑统一走弹窗） */
  function openChatAutoReply() { switchPage("chat-autoreply"); renderAutoReplySettings(); }
  function renderAutoReplySettings() {
    var set = loadSettings();
    var root = document.getElementById("chatAutoReplyWrap");
    if (!root) { return; }
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules : [];
    var rows = "", i, r, kw, txt;
    for (i = 0; i < rules.length; i++) {
      r = rules[i] || {};
      kw = String(r.kw || "").replace(/^\s+|\s+$/g, "");
      txt = String(r.txt || "").replace(/\s*\n+\s*/g, " ").replace(/^\s+|\s+$/g, "");
      rows +=
        '<article class="row-card ar-item" role="listitem" onclick="SnowCrystal.openAutoReplyEditor(' + i + ')">' +
        '<div class="ar-item-main">' +
        '<span class="ar-item-kw">' + esc(kw || "未填关键词") + '</span>' +
        '<span class="ar-item-txt">' + esc(txt || "未填回复内容") + '</span>' +
        "</div>" +
        '<button class="ar-item-del" type="button" onclick="event.stopPropagation();SnowCrystal.delAutoReplyRule(' + i + ')" aria-label="删除该条自动回复">删除</button>' +
        "</article>";
    }
    if (!rows) { rows = '<div class="ar-empty">还没有自动回复，点右上角「+」新增</div>'; }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">自动回复</span><label class="wc-line-toggle"><input type="checkbox" id="csAutoReply"' + (set.autoReplyEnabled ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'autoReplyEnabled\',this.checked)"></label></article>' +
      "</div>" +
      '<p class="group-title">已设置（' + rules.length + '）</p>' +
      '<div class="row-list ar-list">' + rows + "</div>";
  }

 /* 自动回复：弹窗新增 / 编辑（-1 为新增，>=0 为该索引规则） */
  var _arEditIdx = -1;
  function openAutoReplyEditor(idx) {
    var set = loadSettings();
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules : [];
    var i = (typeof idx === "number" && idx >= 0 && idx < rules.length) ? idx : -1;
    if (i < 0 && rules.length >= 40) { wcToast("最多 40 条自动回复"); return; }
    var mask = document.getElementById("arModalMask");
    var modal = document.getElementById("arModal");
    var kwEl = document.getElementById("arModalKw");
    var txtEl = document.getElementById("arModalTxt");
    if (!mask || !modal || !kwEl || !txtEl) { return; }
    var titleEl = document.getElementById("arModalTitle");
    var r = i >= 0 ? (rules[i] || {}) : {};
    _arEditIdx = i;
    if (titleEl) { titleEl.textContent = i >= 0 ? "编辑自动回复" : "新增自动回复"; }
    kwEl.value = String(r.kw || "");
    txtEl.value = String(r.txt || "");
    mask.classList.add("is-open");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    /* [FIX-RAINSEE] 弹窗打开不自动调起输入法 */
  }
  function closeAutoReplyEditor() {
    var mask = document.getElementById("arModalMask");
    var modal = document.getElementById("arModal");
    if (mask) { mask.classList.remove("is-open"); }
    if (modal) { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }
    _arEditIdx = -1;
  }
  function saveAutoReplyEditor() {
    var kwEl = document.getElementById("arModalKw");
    var txtEl = document.getElementById("arModalTxt");
    if (!kwEl || !txtEl) { return; }
    var kw = String(kwEl.value || "").replace(/^\s+|\s+$/g, "").slice(0, 16);
    var txt = String(txtEl.value || "").replace(/^\s+|\s+$/g, "").slice(0, 200);
    if (!kw) { wcToast("请填写关键词"); try { kwEl.focus(); } catch (e0) { /* 忽略 */ } return; }
    if (!txt) { wcToast("请填写自动回复内容"); try { txtEl.focus(); } catch (e1) { /* 忽略 */ } return; }
    var set = loadSettings();
    var rules = Array.isArray(set.autoReplyRules) ? set.autoReplyRules.slice() : [];
    var editing = (_arEditIdx >= 0 && _arEditIdx < rules.length);
    if (editing) {
      rules[_arEditIdx] = { kw: kw, txt: txt };
    } else {
      if (rules.length >= 40) { wcToast("最多 40 条自动回复"); return; }
      rules.push({ kw: kw, txt: txt });
    }
    set.autoReplyRules = rules;
    set.autoReplyEnabled = true;
    saveSettings(set);
    closeAutoReplyEditor();
    renderAutoReplySettings();
    wcToast(editing ? "已保存" : "已添加");
  }

 /* 页面：节奏设置（回复速度 + 时间戳 + 主动发送） */
  function paceUnitFactor(u) { return u === "m" ? 60 : (u === "h" ? 3600 : 1); }
  function paceUnitDisp(sec, u) { var f = paceUnitFactor(u); return Math.round((sec / f) * 100) / 100; }
  function openChatPace() { switchPage("chat-pace"); renderChatPace(); }
  function renderChatPace() {
    var set = loadSettings();
    var root = document.getElementById("chatPaceWrap");
    if (!root) { return; }
    function seg(key, val) { return set[key] === val ? " is-on" : ""; }
    function paceInput(id, key, sec, minSec, maxSec, mini) {
      var unit = set[key + "Unit"] || "s";
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
      '<span class="chat-field">最短 ' + paceInput("csReplyMin", "replyMin", set.replyMin || 5, 1, null, true) + paceSeg("replyMin", set.replyMinUnit || "s") + "</span>" +
      '<span class="chat-field">最长 ' + paceInput("csReplyMax", "replyMax", set.replyMax || 30, 1, null, true) + paceSeg("replyMax", set.replyMaxUnit || "s") + "</span>" +
      "</span></article>" +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">时间戳</span><span class="chat-seg">' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "none") + '" data-val="none" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'none\',this)">不显示</button>' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "time") + '" data-val="time" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'time\',this)">时间</button>' +
      '<button type="button" class="chat-seg-btn' + seg("timestamp", "datetime") + '" data-val="datetime" onclick="SnowCrystal.chatSetSeg(\'timestamp\',\'datetime\',this)">日期</button></span></article>' +
      "</div>" +
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">主动发送</span><label class="wc-line-toggle"><input type="checkbox" id="csProactive"' + (set.proactive ? " checked" : "") + ' onchange="SnowCrystal.chatSetBool(\'proactive\',this.checked)"></label></article>' +
      '<article class="row-card chat-set-row chat-set-field"><span class="row-title">主动间隔</span><span class="chat-field">每 ' + paceInput("csProactiveInterval", "proactiveInterval", set.proactiveInterval || 30, 1, null) + paceSeg("proactiveInterval", set.proactiveIntervalUnit || "s") + " 主动发一条</span></article>" +
      "</div>";
  }

 /* 页面：音效设置（全局控制 + 接收 / 发送音效） */
  function openChatSound() { switchPage("chat-sound"); renderChatSound(); }
  function renderChatSound() {
    var snd = loadSound();
    var root = document.getElementById("chatSoundWrap");
    if (!root) { return; }
    var i, m, on;
    function optHtml(side) {
      var h = "", j, mm;
      for (j = 0; j < SOUND_META.length; j++) {
        mm = SOUND_META[j];
        h += '<button type="button" class="chat-sound-option' + (snd[side] === mm.key ? " is-on" : "") + '" data-sound="' + mm.key + '" ' +
          'onclick="SnowCrystal.chatSoundPick(\'' + side + '\',\'' + mm.key + '\',this)">' + mm.label +
          '<span class="chat-sound-play" title="预览" onclick="event.stopPropagation();SnowCrystal.chatSoundPreview(\'' + mm.key + '\')">▶</span></button>';
      }
      return h;
    }
 /* 自定义音效上传行：接收 / 发送各一行*/
    function uploadHtml(side) {
      var cur = snd[side] || "";
      var isCustom = cur.indexOf("custom_") === 0;
      var name = "", cs = Array.isArray(snd.customSounds) ? snd.customSounds : [], k;
      for (k = 0; k < cs.length; k++) { if (cs[k] && cs[k].id === cur) { name = cs[k].name || ""; break; } }
      var fid = side === "receive" ? "csReceiveSoundFile" : "csSendSoundFile";
      var rid = side === "receive" ? "csReceiveUploadName" : "csSendUploadName";
      var aid = side === "receive" ? "csReceiveUploadActions" : "csSendUploadActions";
      return '<div class="chat-sound-upload">' +
        '<label class="chat-upload-btn" for="' + fid + '">上传自定义音效</label>' +
        '<input type="file" id="' + fid + '" accept="audio/mpeg,.mp3" style="display:none" onchange="SnowCrystal.chatUploadSound(\'' + side + '\',this)">' +
        '<span class="chat-upload-name" id="' + rid + '">' + esc(name) + "</span>" +
        '<span class="chat-upload-actions"' + (isCustom ? "" : ' style="display:none"') + ' id="' + aid + '">' +
        '<button type="button" class="chat-upload-act-btn" title="预览音效" onclick="SnowCrystal.chatSoundPreview(\'' + cur + '\')">▶</button>' +
        '<button type="button" class="chat-upload-act-btn chat-upload-del" title="删除自定义音效" onclick="SnowCrystal.chatDeleteSound(\'' + side + '\')">×</button>' +
        "</span></div>";
    }
    root.innerHTML =
      '<div class="row-list">' +
      '<article class="row-card chat-set-row"><span class="row-title">音效开关</span><label class="wc-line-toggle"><input type="checkbox" id="csSoundEnabled"' + (snd.enabled ? " checked" : "") + ' onchange="SnowCrystal.chatSoundToggle(this.checked)"></label></article>' +
      '<article class="row-card chat-set-row chat-sound-slider"><span class="row-title">音量大小</span>' +
      '<span class="chat-slider-val" id="csSoundVolVal">' + (snd.volume || 0) + '%</span>' +
      '<input type="range" class="chat-range chat-sound-range" id="csSoundVol" min="0" max="100" step="5" value="' + (snd.volume || 0) + '" ' +
      'oninput="SnowCrystal.chatSoundVolume(this.value)">' +
      "</article>" +
      "</div>" +
      '<div class="chat-sound-sec">接收消息音效</div>' +
      '<div class="chat-sound-options">' + optHtml("receive") + "</div>" +
      uploadHtml("receive") +
      '<div class="chat-sound-sec">发送消息音效</div>' +
      '<div class="chat-sound-options">' + optHtml("send") + "</div>" +
      uploadHtml("send");
  }
  function chatSoundToggle(on) {
    var snd = loadSound();
    snd.enabled = !!on;
    saveSound(snd);
    wcToast("已保存");
  }
  /* 音量：oninput 即写盘（修复拖动后刷新回退默认值的 bug），并实时更新右侧百分比 */
  function chatSoundVolDisp(v) {
    var el = document.getElementById("csSoundVolVal");
    if (el) { el.textContent = v + "%"; }
  }
  function chatSoundVolume(v) {
    var snd = loadSound();
    snd.volume = Math.max(0, Math.min(100, Number(v) || 0));
    saveSound(snd);
    chatSoundVolDisp(snd.volume);
  }
  function chatSoundPick(side, key, btn) {
    var snd = loadSound();
    snd[side] = key;
    saveSound(snd);
    var bs = btn.parentNode.querySelectorAll(".chat-sound-option"), i;
    for (i = 0; i < bs.length; i++) { bs[i].classList.remove("is-on"); }
    btn.classList.add("is-on");
    _refreshSoundUploadUI(side);
    playSound(key, 1);
    wcToast("已保存");
  }
  function chatSoundPreview(key) { playSound(key, 1); }
  /* 上传自定义音效（仅 mp3）：音频本体写雪晶媒体库 IndexedDB，localStorage 只存元数据， */
  function chatUploadSound(side, input) {
    var file = input && input.files && input.files[0];
    if (!file) { return; }
    if (!/\.mp3$/i.test(file.name || "")) { wcToast("仅支持 MP3 格式"); input.value = ""; return; }
    if (file.size > 8 * 1024 * 1024) { wcToast("MP3 文件不能超过 8MB"); input.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () {
      var dataURL = String(reader.result || "");
      var soundId = "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      mediaWrite("snd_" + soundId, dataURL).then(function () {
        var snd = loadSound();
        if (!Array.isArray(snd.customSounds)) { snd.customSounds = []; }
        snd.customSounds = snd.customSounds.filter(function (s) { return s.id !== soundId; });
        snd.customSounds.push({ id: soundId, name: file.name, side: side });
        snd[side] = soundId;
        saveSound(snd);
        _refreshSoundUploadUI(side);
        wcToast("自定义音效已上传并永久保存");
      });
    };
    reader.readAsDataURL(file);
    input.value = "";
  }
  /* 删除自定义音效：移除媒体库音频 + 元数据，并恢复默认音效 */
  function chatDeleteSound(side) {
    var label = side === "receive" ? "接收消息音效" : "发送消息音效";
    wcConfirm("删除自定义音效", "确定删除当前" + label + "的自定义音效并恢复默认吗？", function () {
      var snd = loadSound();
      var cur = snd[side] || "";
      if (cur.indexOf("custom_") === 0) {
        mediaDeleteSound("snd_" + cur);
        snd.customSounds = (Array.isArray(snd.customSounds) ? snd.customSounds : []).filter(function (s) { return s.id !== cur; });
        snd[side] = "default";
        saveSound(snd);
      }
      _refreshSoundUploadUI(side);
      wcToast("已删除自定义音效，恢复默认");
    });
  }
  /* 媒体库删除（chat 模块内实现，避免依赖媒体模块暴露） */
  function mediaDeleteSound(key) {
    if (!window.indexedDB || !key) { return; }
    try {
      var req = window.indexedDB.open(MEDIA_DB, 1);
      req.onerror = function () { };
      req.onsuccess = function () {
        try {
          var db = req.result;
          var tx = db.transaction(MEDIA_STORE, "readwrite");
          tx.objectStore(MEDIA_STORE).delete(key);
        } catch (e) { }
      };
    } catch (e) { }
  }
  /* 上传行 UI 刷新：显示当前选中自定义音效的文件名，并显隐预览 / 删除按钮 */
  function _refreshSoundUploadUI(side) {
    var snd = loadSound();
    var cur = snd[side] || "";
    var isCustom = cur.indexOf("custom_") === 0;
    var nameEl = document.getElementById(side === "receive" ? "csReceiveUploadName" : "csSendUploadName");
    if (nameEl) {
      var name = "", cs = Array.isArray(snd.customSounds) ? snd.customSounds : [], k;
      for (k = 0; k < cs.length; k++) { if (cs[k] && cs[k].id === cur) { name = cs[k].name || ""; break; } }
      nameEl.textContent = name;
    }
    var actEl = document.getElementById(side === "receive" ? "csReceiveUploadActions" : "csSendUploadActions");
    if (actEl) { actEl.style.display = isCustom ? "inline-flex" : "none"; }
  }
  function playSound(key, forceVol) {
    try {
      var snd = loadSound();
      if (!forceVol && !snd.enabled) { return; }
      var vol = forceVol ? (Number(forceVol) || 1) : (Number(snd.volume) / 100);
      /* 自定义 mp3 音效：从媒体库 IndexedDB 读取后直接播放 */
      if (key && key.indexOf("custom_") === 0) {
        mediaRead("snd_" + key).then(function (dataURL) {
          if (!dataURL) { return; }
          try {
            var a = new Audio(dataURL);
            a.volume = Math.max(0, Math.min(1, vol));
            a.play().catch(function () { });
          } catch (e2) { }
        }).catch(function () { });
        return;
      }
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
    else { el.removeAttribute("max"); } 
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
    else { el.removeAttribute("max"); } 
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

  /* 让你选（v102）：月牙菜单「让你选」—— 问答抉择弹窗 / 消息气泡 / 问答库 */
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
    /* 问答弹窗默认嵌在聊天室页内，切到问答库等其它页面时父页 display:none 导致弹窗不可见； */
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
    /* [FIX-RAINSEE] 打开「让你选」不自动聚焦：点击对应输入框时才调起输入法 */
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
    /* [FIX-RAINSEE] 打开「新建问答模板」同样不自动聚焦 */
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
    /* [FIX-RAINSEE] 添加答案后不自动聚焦新输入框，由用户点击输入框再调起输入法 */
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
    if (!mid || !_vl) { return; }
    var i, rIdx = -1;
    for (i = 0; i < _vl.rows.length; i++) {
      if (_vl.rows[i].i >= 0 && _vl.rows[i].mid === mid) { rIdx = i; break; }
    }
    if (rIdx < 0) { return; }
    var r = _vl.rows[rIdx];
    if (!r.el) { return; }
    var box = document.getElementById("chatMessages");
    var html = r.i < 0 ? historyLoaderHtml() : vlRowHtml(r);
    if (html === "" ) { return; }
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var nrow = tmp.firstChild;
    if (!nrow) { return; }
    /* 替换该行内部内容，保留 .chat-vl-row 容器（位置/ResizeObserver 不受影响） */
    r.el.innerHTML = "";
    r.el.appendChild(nrow);
    var fresh = collectPendingImgs(r.el);
    if (fresh.length) { resolvePendingImgs(fresh); }
    vlMeasureRow(rIdx);
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

  /* 副字卡（角色专属字卡）：按账号设置中的对方角色分组， */
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
    if (!host || !node) { return -1; }
    /* v-FIX-interaction：事件委托拿到的是「×/发送」按钮本身，需先上溯到所属卡片 [data-copy]，
       否则 indexOf 恒为 -1，删除/发送静默失效 */
    var card = node;
    if (card.nodeType === 1 && !card.hasAttribute("data-copy")) {
      card = closestData(card, "data-copy", host);
    }
    if (!card) { return -1; }
    var nodes = host.querySelectorAll("[data-copy]");
    var i;
    for (i = 0; i < nodes.length; i++) { if (nodes[i] === card) { return i; } }
    /* 兜底：节点被替换（重渲染）时按内容匹配 */
    var want = card.getAttribute ? card.getAttribute("data-copy") : null;
    if (want !== null) {
      for (i = 0; i < nodes.length; i++) {
        if (nodes[i].getAttribute("data-copy") === want) { return i; }
      }
    }
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
    refreshStreakDisplay();
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

  /* 红包模块（v9）：发送红包 / 详情领取 / 皮肤自定义 */
  var RPSKIN_KEY = "snowcrystal.chat.redpack.skin.v1";
  var RPSKIN_KEY_OTHER = "snowcrystal.chat.redpack.skin.other.v1"; 
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
  function redpackBgFg(key) {
    var skin = loadRedpackSkin(key);
    var accent = "";
    try {
      var cs = getComputedStyle(document.documentElement);
      accent = String(cs.getPropertyValue("--accent")).replace(/^\s+|\s+$/g, "");
    } catch (e) { accent = ""; }
    if (!/^#[0-9a-fA-F]{3,8}$/.test(accent)) { accent = "#e86aa0"; }
    var isTimeGapTheme = false;
    try { isTimeGapTheme = (document.documentElement.getAttribute("data-theme-key") || "") === "default"; } catch (e) {}
    /* v102：时间缝隙主题下默认红包皮按极性取色 —— 阳模式用高明度中性灰（原 #DEDEE4 偏蓝调），阴模式保持原深色肤 */
    var isYinMode = false;
    try { isYinMode = (document.documentElement.getAttribute("data-polarity") || "") === "yin"; } catch (e2) {}
    var defBg = isTimeGapTheme ? (isYinMode ? "#DEDEE4" : "#E3E3E3") : lightenHex(accent, 0.44);
    var defFg = (isTimeGapTheme && !isYinMode) ? "#1F1F1F" : "#1b2233";
    return {
      bg: skin.bg || defBg,
      fg: skin.fg || defFg,
      img: skin.img,
      status: skin.status || "#000000"
    };
  }
  function rpIconSvg(size) {
    return '<svg class="chat-rp-ico" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="currentColor" aria-hidden="true"><path d="M5 4.5h14c1.1 0 2 .9 2 2v2H3v-2c0-1.1.9-2 2-2zm-2 6h18v7c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-7zm6.5 2.5a2 2 0 1 0 0 4h5a2 2 0 1 0 0-4h-5z"/></svg>';
  }
  /* 聊天列表里的红包卡片（点开详情弹窗；已领取叠加白色蒙层） */
  function redpackCardHtml(m, isSelf, partnerId, set) {
    var bf = isSelf ? redpackBgFg() : redpackBgFg(RPSKIN_KEY_OTHER);
    var opened = !!m.opened;
    var status = opened ? "已领取" : (isSelf ? "待领取" : "点开看看");
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
    if (body) {
      var bgs = body.querySelectorAll("img.rp-preview-bg[data-src]");
      for (var bi = 0; bi < bgs.length; bi++) {
        (function (el) {
          var src = el.getAttribute("data-src") || "";
          resolveImg(src, function (url) { if (url) { el.src = url; } });
        })(bgs[bi]);
      }
    }
    /* [FIX-RAINSEE] 红包弹窗打开不自动调起输入法 */
  }
  function closeRedpackModal() {
    var mask = document.getElementById("rpModalMask");
    if (mask) { mask.classList.remove("is-open"); }
  }
  /* 发送红包：加号面板「红包」按钮 */
  function openRedpackSend() {
    if (!state.partnerId) { return; }
    var bf = redpackBgFg();
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
    var bf = m.type === "self" ? redpackBgFg() : redpackBgFg(RPSKIN_KEY_OTHER);
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
    /* [FIX-RAINSEE] 查找聊天记录面板打开不自动调起输入法 */
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
    if (typeof vlScrollToMid === "function" && vlScrollToMid(mid, true, true)) { return; }
    wcToast("该消息不在当前会话");
  }
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
        /* 五档色阶：用专用变量而非主题主色。阴主题主色是灰阶，混出来与深底同色会完全看不见 */
        var lv = n <= 1 ? 1 : (n <= 3 ? 2 : (n <= 6 ? 3 : (n <= 12 ? 4 : 5)));
        cls += " is-heat is-heat-" + lv;
        bg = ' style="background:var(--xj-heat-' + lv + ')"';
      }
      grid += '<div class="' + cls + '"' + bg + '><span class="chat-stats-cal-day">' + i + "</span>" +
        (n > 0 ? '<span class="chat-stats-cal-count">' + n + "</span>" : "") + "</div>";
    }
    var totalCells = offset + days;
    while (totalCells % 7 !== 0) { grid += '<div class="chat-stats-cal-cell is-out"></div>'; totalCells++; }
    var legend = '<div class="chat-stats-legend"><span class="chat-stats-legend-label">少</span>' +
      '<span class="chat-stats-legend-bar">' +
      '<i style="background:var(--xj-heat-1)"></i>' +
      '<i style="background:var(--xj-heat-2)"></i>' +
      '<i style="background:var(--xj-heat-3)"></i>' +
      '<i style="background:var(--xj-heat-4)"></i>' +
      '<i style="background:var(--xj-heat-5)"></i>' +
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
      '<article class="row-card chat-set-row"><span class="row-title">跟随主题</span><label class="wc-line-toggle"><input type="checkbox" id="rpSkinTheme"' + (themeMode ? " checked" : "") + ' onchange="SnowCrystal.Chat.rpSkinToggleTheme(this.checked)"></label></article>' +
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
  /* vX：概率设置折叠 UI —— 拉条默认隐藏，点击对应功能行才展开，避免滑动页面误触 */
  function probFoldRow(key, title, tip, valHtml, rangeHtml) {
    return '<article class="row-card chat-set-row chat-prob-row chat-prob-fold" id="probRow_' + key + '">' +
      '<span class="chat-prob-hit" onclick="SnowCrystal.chatProbToggle(\'' + key + '\')">' +
      '<span class="chat-prob-main"><span class="row-title">' + title + '</span><span class="row-desc">' + tip + "</span></span>" +
      '<span class="chat-prob-val" id="probVal_' + key + '">' + valHtml + "</span>" +
      '<span class="chat-prob-arrow">▾</span>' +
      "</span>" +
      '<div class="chat-prob-bar-wrap">' + rangeHtml + "</div>" +
      "</article>";
  }
  function probRangeHtml(key, min, max, step, val, setExpr) {
    return '<input type="range" class="chat-range" id="prob_' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" ' +
      'oninput="SnowCrystal.chatProbDisp(\'' + key + '\',this.value)" onchange="SnowCrystal.' + setExpr + '">';
  }
  function renderProbSettings() {
    var prob = loadProb();
    var root = document.getElementById("probSettingsWrap");
    if (!root) { return; }
    var html = '<div class="row-list">', i, m, key;
    for (i = 0; i < PROB_META.length; i++) {
      m = PROB_META[i];
      key = m.key;
      html += probFoldRow(key, m.label, m.tip, (prob[key] || 0) + "%",
        probRangeHtml(key, 0, 100, 1, prob[key] || 0, "chatProbSet('" + key + "',this.value)"));
    }
    html += "</div>";
    var set = loadSettings();
    var fwdV = set.forward != null ? set.forward : 5;
    var callV = set.callProb != null ? set.callProb : 50;
    var accV = set.callAcceptProb != null ? set.callAcceptProb : 60;
    var rejV = set.callRejectProb != null ? set.callRejectProb : 20;
    var misV = set.callMissProb != null ? set.callMissProb : 20;
    html +=
      '<div class="row-list">' +
      probFoldRow("csForward", "对方转发", "对方回复时转发一条历史消息的概率", fwdV + "%",
        probRangeHtml("csForward", 0, 100, 1, fwdV, "chatSetNum('forward',this.value)")) +
      probFoldRow("csCallProb", "通话触发概率", "对方主动拨来语音 / 视频通话的概率", callV + "%",
        probRangeHtml("csCallProb", 0, 100, 5, callV, "chatSetNum('callProb',this.value)")) +
      probFoldRow("csCallAcceptProb", "对方接通电话概率", "我方拨打时对方接通电话的概率", accV + "%",
        probRangeHtml("csCallAcceptProb", 0, 100, 1, accV, "chatSetNum('callAcceptProb',this.value)")) +
      probFoldRow("csCallRejectProb", "对方拒接电话概率", "我方拨打时对方拒接电话的概率", rejV + "%",
        probRangeHtml("csCallRejectProb", 0, 100, 1, rejV, "chatSetNum('callRejectProb',this.value)")) +
      probFoldRow("csCallMissProb", "对方未接电话概率", "我方拨打时对方未接电话的概率", misV + "%",
        probRangeHtml("csCallMissProb", 0, 100, 1, misV, "chatSetNum('callMissProb',this.value)")) +
      "</div>";
    root.innerHTML = html;
  }
  function chatProbToggle(key) {
    var row = document.getElementById("probRow_" + key);
    if (row) { row.classList.toggle("is-open"); }
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

  /* 底栏：发送键/加号键 共用最右侧键位（有文字显示发送，无文字显示加号） */
  function onChatInput() { updateSendBtn(); }
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
  function onPlusSendTap() {
    var inp = document.getElementById("chatInput");
    var hasText = !!(inp && String(inp.value || "").replace(/^\s+|\s+$/g, ""));
    if (hasText) { sendMessage(); } else { togglePlusPanel(); }
  }

  /* 底栏：拍一拍（图一手掌键 → 拍一拍面板：拍一拍库 + 自定义输入） */
  function patPartner() {
    if (!state.partnerId) { return; }
    renderPatPanel();
    var panel = document.getElementById("chatPatPanel");
    var mask = document.getElementById("chatPatMask");
    if (panel) { panel.classList.add("is-open"); panel.setAttribute("aria-hidden", "false"); }
    if (mask) { mask.classList.add("is-open"); }
    /* [FIX-RAINSEE] 拍一拍面板打开不自动调起输入法 */
  }
  function closePatPanel() {
    var panel = document.getElementById("chatPatPanel");
    var mask = document.getElementById("chatPatMask");
    if (panel) { panel.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true"); }
    if (mask) { mask.classList.remove("is-open"); }
  }
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

  /* 底栏：表情面板（Emoji / 表情包 双 Tab） */
  var _emojiTab = "emoji";
  var _emojiGroupIdx = { emoji: 0, sticker: 0 };
  /* vXX：表情面板渲染序号 —— 用于丢弃过期异步渲染（快速连续切换分组时， */
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
    /* vXX：表情面板 sticker 分组「先解析后渲染」——渲染前把当前分组所有图片解析为 */
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
        /* vXX：异步取图期间不清空现有网格 —— 之前先 body.innerHTML=bar 会把当前分组 */
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
    resolveImg(img, function (url) { if (url) { _chatMediaPut(img, url); } });
    var msg = { id: "m" + now().toString(36) + Math.random().toString(36).slice(2, 7), type: "self", msgType: "sticker", img: img, text: "", time: now(), read: false };
    pushMsg(state.partnerId, msg);
    setLast(state.partnerId, "[表情包]", now());
    renderMessages(state.partnerId, true);
    chatPlaySend();
    scheduleReadReceipt(msg.id);
    scheduleReply();
  }

  /* 底栏：加号功能面板（独立底部菜单，与顶栏雪花键菜单互不绑定） */
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

  /* 更换聊天背景：内置背景面板（选中实时切换 .chat-room-body 并 localStorage 持久化） */
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
  /* 自定义背景持久化升级：IndexedDB 主存 + localStorage 同步兜底（双保险，刷新/重启不丢） */
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
    /* [FIX 2026-11-07] 新版壁纸模块接管：IndexedDB 异步回填时不得直接用图片覆盖当前模式
       （否则「固定白色 / 自定义颜色 / 跟随主题」会被残留的上传图顶掉） */
    if (window.SnowCrystal && SnowCrystal.Chat && SnowCrystal.Chat.applyStored) {
      SnowCrystal.Chat.applyStored();
      return;
    }
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

  var CALL_KEY = "snowcrystal.chat.calls.v1";
  var CALL_BG_KEY = "snowcrystal.chat.callBg.v1";
  var CALL_MINI_KEY = "snowcrystal.chat.callMiniPos.v1";
  var CALL_STATE_KEY = "snowcrystal.chat.callState.v1";
  /* 通话状态持久化恢复判定时限（毫秒）： */
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
  /* [2026-11-04 修复] 通话缩略气泡可见性兜底：
     历史坐标可能来自更大的窗口（如桌面 430 宽）或旧版本，直接套用到当前视口会让气泡落到屏幕外；
     统一在「读取坐标 → 创建气泡 → 拖拽结束 → 视口变化」四个时机做区域内夹取。 */
  var CALL_MINI_SIZE = 64;
  var CALL_MINI_EDGE = 8;
  function _miniMountBox() {
    var mount = document.querySelector(".phone") || document.body;
    var mw = (mount && mount.clientWidth) || window.innerWidth || 0;
    var mh = (mount && mount.clientHeight) || window.innerHeight || 0;
    return { mw: mw, mh: mh, mount: mount };
  }
  function _clampMiniValue(val, max, dft) {
    var n = (typeof val === "number" && isFinite(val)) ? val : dft;
    return Math.round(Math.min(Math.max(CALL_MINI_EDGE, n), Math.max(CALL_MINI_EDGE, max)));
  }
  function _clampMiniPos(pos) {
    var box = _miniMountBox();
    var right = pos && isFinite(pos.right) ? pos.right : 16;
    var top = pos && isFinite(pos.top) ? pos.top : (box.mh - 174);
    return {
      right: _clampMiniValue(right, box.mw - CALL_MINI_SIZE - CALL_MINI_EDGE, 16),
      top: _clampMiniValue(top, box.mh - CALL_MINI_SIZE - CALL_MINI_EDGE, box.mh - 174)
    };
  }
  /* 气泡的「视觉包围盒」：把顶部状态胶囊（top:-6px 居中，可能宽于气泡）与右下关闭按钮一起算进去，
     只按 64x64 本体夹取会让标签/按钮贴边溢出屏幕 */
  function _miniUnionRect(el) {
    var r = el.getBoundingClientRect();
    var l = r.left, t = r.top, ri = r.right, bo = r.bottom;
    var kids = el.querySelectorAll(".call-mini-status, .call-mini-close");
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i].getBoundingClientRect();
      if (!k.width || !k.height) { continue; }
      if (k.left < l) { l = k.left; }
      if (k.top < t) { t = k.top; }
      if (k.right > ri) { ri = k.right; }
      if (k.bottom > bo) { bo = k.bottom; }
    }
    return { left: l, top: t, right: ri, bottom: bo, width: ri - l, height: bo - t };
  }
  /* 把已存在的气泡拉回可视区；坐标写入后仍越界则强制回到默认右下角 */
  function _reflowMiniBubble(save) {
    var b = document.getElementById("call-mini-bubble");
    if (!b) { return; }
    var fixed = _clampMiniPos({ right: parseFloat(b.style.right), top: parseFloat(b.style.top) });
    b.style.right = fixed.right + "px";
    b.style.top = fixed.top + "px";
    var box = _miniMountBox();
    var br = b.getBoundingClientRect();
    var mr = box.mount.getBoundingClientRect();
    /* 二次校验：以视觉包围盒为准整体平移，保证状态胶囊与关闭按钮也完整落在可视区 */
    for (var pass = 0; pass < 2; pass++) {
      var u = _miniUnionRect(b);
      var dx = 0, dy = 0;
      if (u.left < mr.left + CALL_MINI_EDGE) { dx = (mr.left + CALL_MINI_EDGE) - u.left; }
      if (u.right > mr.right - CALL_MINI_EDGE) { dx = (mr.right - CALL_MINI_EDGE) - u.right; }
      if (u.top < mr.top + CALL_MINI_EDGE) { dy = (mr.top + CALL_MINI_EDGE) - u.top; }
      if (u.bottom > mr.bottom - CALL_MINI_EDGE) { dy = (mr.bottom - CALL_MINI_EDGE) - u.bottom; }
      if (!dx && !dy) { break; }
      var cr = parseFloat(b.style.right) || 16;
      var ct = parseFloat(b.style.top) || 100;
      fixed = _clampMiniPos({ right: cr - dx, top: ct + dy });
      b.style.right = fixed.right + "px";
      b.style.top = fixed.top + "px";
    }
    var visible = br.width > 0 && br.right > mr.left + 2 && br.left < mr.right - 2 &&
      br.bottom > mr.top + 2 && br.top < mr.bottom - 2;
    if (!visible) {
      var fb = _clampMiniPos({ right: 16, top: box.mh - 174 });
      b.style.position = "absolute";
      b.style.right = fb.right + "px";
      b.style.top = fb.top + "px";
      fixed = fb;
    }
    if (save !== false) { _saveMiniPos(fixed.right, fixed.top); }
  }
  var _miniReflowTimer = 0;
  function _onMiniViewportChange() {
    if (_miniReflowTimer) { clearTimeout(_miniReflowTimer); }
    _miniReflowTimer = setTimeout(function () { _miniReflowTimer = 0; _reflowMiniBubble(); }, 120);
  }
  window.addEventListener("resize", _onMiniViewportChange);
  window.addEventListener("orientationchange", _onMiniViewportChange);
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", _onMiniViewportChange); }
  var callState = {
    kind: "voice", connected: false, seconds: 0, timer: null,
    missTimer: null, simulateTimer: null, bg: _loadCallBgPref(), incomingKind: "voice",
    direction: "out", connectedAt: 0, partnerId: null, startedAt: 0
  };
  function callSvg(path, size, cls, vb) {
    var v = vb || 24;
    return '<svg viewBox="0 0 ' + v + ' ' + v + '" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="currentColor" class="' + (cls || "") + '" aria-hidden="true"><path d="' + path + '"/></svg>';
  }
  /* 通话功能发起按钮（加号面板「通话」）同款图标：Phosphor phone，现代听筒+右侧信号波纹，viewBox 25 */
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
    /* 回归修复 R2：通话记录纳入与聊天记录相同的 IDB 双写链路（ls 主通道 + IDB 全量备份）， */
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
  /* 账号设置更新头像后的实时同步：缩略气泡 + 通话大面板 + 来电面板 一并刷新， */
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
  /* [V29] 刷新后恢复的通话：首帧若角色数据尚未从 IDB 回灌，头像会是空/首字；
     存储层就绪后补写一次，无需等用户重进会话 */
  function _callAvatarsOnStoreReady() {
    try { _refreshCallAvatars(); } catch (e) { /* 忽略 */ }
  }
  try {
    if (window.__xjStorageReady) { _callAvatarsOnStoreReady(); }
    else {
      (window.__xjStorageReadyFns = window.__xjStorageReadyFns || []).push(_callAvatarsOnStoreReady);
      document.addEventListener("snowcrystal:storage-ready", _callAvatarsOnStoreReady);
    }
  } catch (e) { /* 忽略 */ }
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
      /* 时长以时间戳差为准：后台/切页被浏览器节流时 setInterval 可能延迟， */
      callState.seconds = Math.max(0, Math.floor((now() - callState.connectedAt) / 1000));
      var el = document.getElementById("call-active-timer");
      if (el) { el.textContent = formatCallDuration(callState.seconds); }
      var miniSt = document.getElementById("call-mini-status");
      if (miniSt) {
        var nextTxt = formatCallDuration(callState.seconds);
        if (miniSt.textContent !== nextTxt) {
          miniSt.textContent = nextTxt;
          /* 文案变长（如 00:00 → 01:00:00）可能让顶部胶囊在贴边时越界，重排一次（不覆盖用户拖拽存储） */
          _reflowMiniBubble(false);
        }
      }
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
    /* 关闭按钮区域不启动拖拽：避免 setPointerCapture 把点击合成事件重定向到气泡本体，导致关闭按钮的 cli */
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
      /* 发热优化 P1-3：拖拽样式写入合并到 rAF（读写分离）， */
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
      /* 拖拽结束：夹取到可视区内并持久化（避免保存出屏幕坐标） */
      _reflowMiniBubble();
    }
    _miniDrag.startX = 0;
    _miniDrag.startY = 0;
  }
  function minimizeCall() {
    var overlay = document.getElementById("call-active-overlay");
    /* [2026-11-04 修复] 面板已不存在时不再直接 return（旧逻辑会因取不到面板而完全不创建气泡，
       表现为「通话最小化后缩略气泡不显示」），改为容错继续创建气泡 */
    if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    if (document.getElementById("call-mini-bubble")) { return; }
    var pos = _clampMiniPos(_loadMiniPos());
    var right = pos.right;
    var top = pos.top;
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
    /* [2026-11-04 修复] 插入后按真实渲染位置再校验一次，保证首次出现即在屏幕可视区内 */
    _reflowMiniBubble();
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
      /* 回归修复 R3：partnerId 缺失或伙伴列表暂不可用时，不放弃恢复、不清除持久化状态； */
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

  /* 转发详情浮层（v100：点击转发消息查看内容 + 发送人 + 来源； */
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
      var _rt2 = esc(gm.text || gm.recallText || "消息已撤回");
      var _rb2 = recallBodyHtml(gm);
      return '<div class="chat-msg chat-msg-pat"><span class="chat-pat-text">' + _rt2 + "</span></div>" +
        (_rb2 ? '<div class="chat-msg chat-msg-recall-body' + (gm.type === "self" ? " is-self" : " is-other") + '"><div class="chat-msg-col">' + _rb2 + "</div></div>" : "");
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
    /* 聚合组扫描：前后连续且同发送方向的 forward 归入同一张卡片 */
    var grp = [m], j;
    for (j = i - 1; j >= 0 && sameFwdGroup(m, l[j]); j--) { grp.unshift(l[j]); }
    for (j = i + 1; j < l.length && sameFwdGroup(m, l[j]); j++) { grp.push(l[j]); }
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
    var gFromName = grp[0].fwdFromName || fwdFallbackFromName(state.partnerId);
    panel.innerHTML =
      '<div class="fwd-detail-head"><span class="fwd-detail-title">' + esc(gFromName) + "的聊天记录</span><button type=\"button\" class=\"fwd-detail-close\" onclick=\"SnowCrystal.Chat.closeForwardDetail()\" aria-label=\"关闭\">×</button></div>" +
      '<div class="fwd-detail-list">' + itemsHtml + "</div>";
    mask.appendChild(panel);
    document.body.appendChild(mask);
    mask.addEventListener("click", function (e) { if (e.target === mask) { closeForwardDetail(); } });
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
  S.Chat.purgePartnerChat = purgePartnerChat;
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
  S.Chat.refreshStreakDisplay = refreshStreakDisplay;
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
  S.Chat.openChatAutoReply = openChatAutoReply;
  S.Chat.renderAutoReplySettings = renderAutoReplySettings;
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
  S.Chat.chatUploadSound = chatUploadSound;
  S.Chat.chatDeleteSound = chatDeleteSound;
  S.Chat._refreshSoundUploadUI = _refreshSoundUploadUI;
  /* 音效选项 onclick 使用 SnowCrystal.chatSoundPick(...)（与 openChatSou */
  S.chatSoundPick = chatSoundPick;
  S.Chat.chatSoundPick = chatSoundPick;
  S.Chat.chatSoundPreview = chatSoundPreview;
  S.Chat.markRecallMsg = markRecallMsg;
  S.Chat.chatProbDisp = chatProbDisp;
  S.Chat.chatProbToggle = chatProbToggle;
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
  S.openBarSettings = openBarSettings;
  S.openChatBg = openChatBg;
  S.openProbSettings = openProbSettings;
  S.openEffectSettings = openEffectSettings;
  S.renderEffectSettings = renderEffectSettings;
  S.chatSetEffectCount = chatSetEffectCount;
  S.updateEffectRule = updateEffectRule;
  S.delEffectRule = delEffectRule;
  S.addEffectRule = addEffectRule;
  S.openChatFeature = openChatFeature;
  S.openChatAutoReply = openChatAutoReply;
  S.renderAutoReplySettings = renderAutoReplySettings;
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
  S.chatProbToggle = chatProbToggle;
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

  /* 核心修复③：页面加载完成后按持久化开关恢复「屏幕常亮」 */
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

  /* 初始化：全局常驻消息接收引擎 —— 页面加载即启动，不依赖聊天室激活； */
  var _msgEngineInit = function () {
    try { startProactive(); } catch (e) { /* 忽略 */ }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _msgEngineInit);
  } else {
    _msgEngineInit();
  }

  /* 初始化：移动端软键盘兼容（聊天室输入框聚焦/失焦 + visualViewport 兜底） */
  var _chatKbInit = function () {
    try { setupChatKbCompat(); } catch (e) { /* 忽略 */ }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _chatKbInit);
  } else {
    _chatKbInit();
  }
})();
