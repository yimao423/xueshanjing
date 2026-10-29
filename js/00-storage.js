/* =========================================================
   00-storage.js — 雪晶统一持久化存储层（XJ_STORE v1）
   ---------------------------------------------------------
   · 背景：项目部署到 GitHub Pages 后，移动端雨见浏览器
     （蓝雨见 Gecko 隐私内核 / Rains 系统 WebView）会禁用或隔离
     localStorage：写入静默失败、每次会话独立或直接抛 SecurityError。
     导致仅依赖 localStorage 单通道的数据（账号/主题/字卡/首页组件/
     月汐/课程/贴表情/时空回响/昨日回响等）刷新后全部恢复初始状态。
   · 方案：localStorage（主通道·同步快） + IndexedDB（全量镜像·异步兜底）
           + 内存镜像（同步兜底，兼作 IDB 恢复后的读取缓存）。
   · 读优先级：真实 localStorage → 内存镜像（IDB preload 已恢复
              / 写入时已同步）→ null
   · 写路径：内存镜像同步更新 → 真实 localStorage 尽力写（失败静默）
           → IndexedDB 异步写（IDB 未就绪时暂存，就绪后补写）。
   · 安装：包装 window.localStorage 的 getItem/setItem/removeItem，
           使现有模块的直连调用自动获得兜底，无需逐个改造调用点；
           同时暴露 XJ_STORE 供集中式存储函数（如 11-account）委托。
   · 顺序：本文件必须在 01-cap.js 之前加载（index.html 首位）。
   ========================================================= */
(function () {
  if (window.__xjStoreLoaded) { return; }
  window.__xjStoreLoaded = true;

  var DB_NAME = "snowcrystal.kv.v1";
  var DB_STORE = "kv";

  var mem = {};            /* 内存镜像：key -> string */
  var lsOk = false;        /* 真实 localStorage 是否可用（写入后可读回） */
  var lsRaw = null;        /* 真实 localStorage 引用 */
  var origGet = null, origSet = null, origRemove = null;
  var idbOk = false;       /* IndexedDB 是否打开成功 */
  var idbDb = null;
  var pendingWrites = {};  /* IDB 未就绪时暂存的写队列 */

  /* ================= localStorage 可用性实测 =================
     不能用 feature detection（对象存在 ≠ 可用）：必须写入测试键并读回，
     隐私模式静默失败 / Safari 旧版抛 SecurityError 均能被识别。 */
  function probeLS() {
    try {
      if (!window.localStorage) { return false; }
      var t = "__xj_store_probe__";
      window.localStorage.setItem(t, "1");
      var v = window.localStorage.getItem(t);
      window.localStorage.removeItem(t);
      return v === "1";
    } catch (e) { return false; }
  }

  /* ================= IndexedDB 基础 ================= */
  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (typeof window === "undefined" || !window.indexedDB) { reject(new Error("no-idb")); return; }
      var req;
      try { req = window.indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      req.onerror = function () { reject(req.error || new Error("idb-error")); };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) { db.createObjectStore(DB_STORE, { keyPath: "key" }); }
      };
      req.onsuccess = function () { resolve(req.result); };
    });
  }
  function idbTx(mode, fn) {
    return new Promise(function (resolve) {
      if (!idbDb) { resolve(false); return; }
      try {
        var tx = idbDb.transaction(DB_STORE, mode);
        var st = tx.objectStore(DB_STORE);
        fn(st);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
        tx.onabort = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }
  function idbPut(key, value) {
    return idbTx("readwrite", function (st) { st.put({ key: key, value: value }); });
  }
  function idbDel(key) {
    return idbTx("readwrite", function (st) { st.delete(key); });
  }
  function idbGetAll() {
    return new Promise(function (resolve) {
      if (!idbDb) { resolve({}); return; }
      try {
        var tx = idbDb.transaction(DB_STORE, "readonly");
        var st = tx.objectStore(DB_STORE);
        var req = st.getAll();
        req.onsuccess = function () {
          var out = {}, i, r;
          for (i = 0; i < req.result.length; i++) {
            r = req.result[i];
            if (r && r.key != null) { out[r.key] = r.value; }
          }
          resolve(out);
        };
        req.onerror = function () { resolve({}); };
      } catch (e) { resolve({}); }
    });
  }
  /* IDB 初始化 + 全量恢复内存镜像（尽早执行，不阻塞页面） */
  function idbInit() {
    idbOpen().then(function (db) {
      idbDb = db;
      idbOk = true;
      /* 补写 IDB 未就绪期间的暂存队列 */
      var keys = Object.keys(pendingWrites), i;
      for (i = 0; i < keys.length; i++) { idbPut(keys[i], pendingWrites[keys[i]]); }
      pendingWrites = {};
      return idbGetAll();
    }).then(function (all) {
      /* 合并恢复：IDB 里有、内存镜像没有的键（刷新后跨会话恢复） */
      for (var k in all) {
        if (all.hasOwnProperty(k) && !(k in mem)) { mem[k] = all[k]; }
      }
    }).then(notifyReady).catch(function () {
      /* IDB 不可用（隐私模式全禁用）：仅内存兜底，刷新后丢失，与现状持平 */
      idbOk = false;
    });
  }

  /* ================= 存储就绪通知 =================
     IndexedDB 恢复完成（内存镜像已含跨会话存档）后执行订阅回调。
     背景：localStorage 被隔离（GitHub Pages 移动端雨见浏览器 / 隐私模式 /
     file:// 受限环境）时，真实通道读空，模块在 DOMContentLoaded 同步读取
     会早于本异步恢复而拿到 null。就绪通知让依赖持久化的模块（主题引擎等）
     在恢复完成后重新读取存档并重放状态，刷新后不再恢复初始值。 */
  function notifyReady() {
    try {
      window.__xjStorageReady = true;
      var fns = window.__xjStorageReadyFns || [];
      window.__xjStorageReadyFns = [];
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](); } catch (e) { /* 忽略单个订阅者异常 */ }
      }
    } catch (e) { /* 忽略 */ }
  }
  function onStorageReady(fn) {
    if (typeof fn !== "function") { return; }
    try {
      /* 已就绪则立即执行（避免订阅晚于恢复完成） */
      if (window.__xjStorageReady) { fn(); return; }
      (window.__xjStorageReadyFns = window.__xjStorageReadyFns || []).push(fn);
    } catch (e) { /* 忽略 */ }
  }

  /* ================= 包装读写（核心） ================= */
  function patchedGet(key) {
    if (lsOk && origGet) {
      try {
        var v = origGet(key);
        if (v != null) { return v; }
        /* 真实通道读空：可能被隔离/清空，回退内存镜像（含 IDB 恢复值） */
        return (key in mem) ? mem[key] : null;
      } catch (e) {
        return (key in mem) ? mem[key] : null;
      }
    }
    return (key in mem) ? mem[key] : null;
  }
  function patchedSet(key, value) {
    try {
      if (value == null) { patchedRemove(key); return "ok"; }
      mem[key] = value;
      var lsWrote = false;
      if (lsOk && origSet) {
        try { origSet(key, value); lsWrote = true; } catch (e) { /* ls 写失败：交给 IDB 兜底 */ }
      }
      if (idbOk && idbDb) { idbPut(key, value); }
      else { pendingWrites[key] = value; }
      return lsWrote ? "ok" : (idbOk && idbDb ? "idb" : "pending");
    } catch (e) { return "fail"; }
  }
  function patchedRemove(key) {
    try {
      if (mem.hasOwnProperty(key)) { delete mem[key]; }
      if (lsOk && origRemove) { try { origRemove(key); } catch (e) { /* 忽略 */ } }
      if (idbOk && idbDb) { idbDel(key); }
      else if (pendingWrites.hasOwnProperty(key)) { delete pendingWrites[key]; }
      return true;
    } catch (e) { return false; }
  }
  function fakeLSFactory() {
    return {
      getItem: patchedGet,
      setItem: patchedSet,
      removeItem: patchedRemove,
      clear: function () {
        var ks = Object.keys(mem), i;
        for (i = 0; i < ks.length; i++) { delete mem[ks[i]]; }
        pendingWrites = {};
        if (idbOk && idbDb) { idbTx("readwrite", function (st) { st.clear(); }); }
      },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
  }

  /* ================= 安装 ================= */
  function install() {
    lsOk = probeLS();
    if (lsOk) {
      try {
        lsRaw = window.localStorage;
        origGet = lsRaw.getItem.bind(lsRaw);
        origSet = lsRaw.setItem.bind(lsRaw);
        origRemove = lsRaw.removeItem.bind(lsRaw);
      } catch (e) { lsOk = false; lsRaw = null; }
    }
    try {
      if (lsOk && lsRaw) {
        /* 方法补丁：现有模块直连 window.localStorage.xxx 自动获得兜底 */
        try {
          var d = Object.getOwnPropertyDescriptor(lsRaw, "setItem");
          if (!d || d.writable || typeof d.set === "function") { lsRaw.setItem = patchedSet; }
        } catch (e) { /* 保持原方法 */ }
        try {
          var d2 = Object.getOwnPropertyDescriptor(lsRaw, "getItem");
          if (!d2 || d2.writable || typeof d2.set === "function") { lsRaw.getItem = patchedGet; }
        } catch (e) { /* 保持原方法 */ }
        try {
          var d3 = Object.getOwnPropertyDescriptor(lsRaw, "removeItem");
          if (!d3 || d3.writable || typeof d3.set === "function") { lsRaw.removeItem = patchedRemove; }
        } catch (e) { /* 保持原方法 */ }
      } else {
        /* 真实 localStorage 不可用：用内存镜像 + IDB 的实现替换属性 */
        var fake = fakeLSFactory();
        try {
          Object.defineProperty(window, "localStorage", { value: fake, writable: true, configurable: true });
        } catch (e) {
          try { window.localStorage = fake; } catch (e2) { /* 替换失败：集中式模块可走 XJ_STORE */ }
        }
      }
    } catch (e) { /* 安装失败不影响页面 */ }
    /* 尽早从 IDB preload（不阻塞页面，DOMContentLoaded 前大概率完成） */
    idbInit();
  }
  install();

  /* ================= 对外 API ================= */
  window.XJ_STORE = {
    /* 与 localStorage.getItem 语义一致：返回字符串或 null */
    get: function (key) {
      return patchedGet(String(key));
    },
    /* 返回 "ok"(localStorage 持久化成功) / "idb"(IndexedDB 兜底持久化成功) /
       "pending"(localStorage 失败、暂存待 IDB 就绪后补写，通常即刻补写成功) / "fail"(全部失败) */
    set: function (key, value) {
      var v = value;
      if (typeof v === "object" && v !== null) {
        try { v = JSON.stringify(v); } catch (e) { v = String(v); }
      }
      return patchedSet(String(key), String(v));
    },
    remove: function (key) {
      return patchedRemove(String(key));
    },
    /* 能力状态（调试用） */
    status: function () {
      return { ls: lsOk, idb: idbOk };
    },
    memKeys: function () {
      return Object.keys(mem);
    },
    /* 存储就绪订阅：IndexedDB 跨会话存档恢复完成后触发（含"已就绪立即执行"） */
    onReady: onStorageReady
  };
})();
