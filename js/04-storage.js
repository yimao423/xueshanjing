/* 雪山晶 · 04-storage ｜ 源：雪山晶.html L5448-L6228 ｜ JS 模块 */
/* 00-storage.js — 雪晶统一持久化存储层（XJ_STORE v1） */
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

  /* localStorage 可用性实测 */
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

  /* IndexedDB 基础 */
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
    /* [V34] 最底层闸门。业务层有多条路径直接调 idbSet/idbSetOnly（信件 commitSave、
       LegacyMove 瘦身、聊天 chatIdbWriteAll …），它们绕过了 patchedSet，
       这里是唯一能兜住全部写入口的位置 —— 空壳一律不许落地。 */
    if (typeof _guardWrite === "function" && !_guardWrite(key, value)) {
      return Promise.resolve(false);
    }
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
  /* 恢复内存镜像用：跳过「按需正文」这类大键，正文只在打开某条时才读，
     不让整库正文在启动时全部搬进内存 */
  var IDB_LAZY_PREFIX = "snowcrystal.letter.v3.body.";
  function idbGetAllMeta() {
    return new Promise(function (resolve) {
      if (!idbDb) { resolve({}); return; }
      try {
        var tx = idbDb.transaction(DB_STORE, "readonly");
        var st = tx.objectStore(DB_STORE);
        var out = {}, req = st.openCursor();
        req.onsuccess = function () {
          var cur = req.result;
          if (!cur) { resolve(out); return; }
          var r = cur.value;
          if (r && r.key != null && String(r.key).indexOf(IDB_LAZY_PREFIX) !== 0) { out[r.key] = r.value; }
          cur["continue"]();
        };
        req.onerror = function () { resolve({}); };
      } catch (e) { resolve({}); }
    });
  }
  /* 按前缀枚举（数据管理备份大容量正文用） */
  function idbDumpPrefix(prefix) {
    return new Promise(function (resolve) {
      if (!idbDb) { resolve({}); return; }
      try {
        var tx = idbDb.transaction(DB_STORE, "readonly");
        var st = tx.objectStore(DB_STORE);
        var out = {}, req = st.openCursor();
        req.onsuccess = function () {
          var cur = req.result;
          if (!cur) { resolve(out); return; }
          var r = cur.value;
          if (r && r.key != null && String(r.key).indexOf(prefix) === 0) { out[r.key] = String(r.value); }
          cur["continue"]();
        };
        req.onerror = function () { resolve({}); };
      } catch (e) { resolve({}); }
    });
  }
  /* 按前缀清理（恢复出厂时连按需正文一起删干净，不留孤儿键） */
  function idbPurgePrefix(prefix) {
    return idbTx("readwrite", function (st) {
      var req = st.openCursor();
      req.onsuccess = function () {
        var cur = req.result;
        if (!cur) { return; }
        if (String(cur.key).indexOf(prefix) === 0) { cur["delete"](); }
        cur["continue"]();
      };
    });
  }
  /* 单键直读（给大容量数据用：云笺的信件 / 梦境等） */
  function idbGetOne(key) {
    return new Promise(function (resolve) {
      if (!idbDb) { resolve(null); return; }
      try {
        var tx = idbDb.transaction(DB_STORE, "readonly");
        var st = tx.objectStore(DB_STORE);
        var req = st.get(key);
        req.onsuccess = function () {
          var r = req.result;
          resolve(r && r.value != null ? String(r.value) : null);
        };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  /* IDB 初始化 + 全量恢复内存镜像（尽早执行，不阻塞页面） */
  function idbInit() {
    /* [V29] 首次水合状态：pending（尚未从 IDB 恢复完）/ ready / failed。
       头像、角色等业务数据在 pending 期间不能被误判为「不存在」。 */
    try { window.__xjStorageState = "pending"; } catch (e0) { /* 忽略 */ }
    idbOpen().then(function (db) {
      idbDb = db;
      idbOk = true;
      /* [V31] 先读 IDB 权威全量，再裁决水合期写入 —— 旧实现是「先补写
         pendingWrites 再合并」，等于用启动初期的默认值把真实数据原地覆盖掉。 */
      return idbGetAllMeta();
    }).then(function (all) {
      all = all || {};
      var k, i, keys, pk, pv, iv;
      /* 1) IDB 权威值先进内存镜像（不含按需正文与时间戳元键） */
      for (k in all) { if (all.hasOwnProperty(k) && k.indexOf("__xj_") !== 0 && !(k in mem)) { mem[k] = all[k]; } }
      /* [V33] 用水合到的真实数据建立「可信权重表」，重启后第一次空壳写入也拦得住 */
      for (k in all) {
        if (!all.hasOwnProperty(k)) { continue; }
        if (k.indexOf("__xj_") === 0) { continue; }
        if (_isGuardedKey(k) && !_isShellValue(all[k])) { _trustedW[k] = Math.max(_trustedW[k] || 0, _dataWeight(all[k])); _trustedNonShell[k] = 1; }
      }
      /* 反向：内存里已有更完整的值（LS 快照更新）时，同样记进可信表 */
      for (k in mem) {
        if (!Object.prototype.hasOwnProperty.call(mem, k)) { continue; }
        if (_isGuardedKey(k) && !_isShellValue(mem[k])) { _trustedW[k] = Math.max(_trustedW[k] || 0, _dataWeight(mem[k])); _trustedNonShell[k] = 1; }
      }
      /* 2) 水合期写入 vs IDB 权威：只让更完整的一方获胜，空壳一律丢弃 */
      keys = Object.keys(pendingWrites);
      for (i = 0; i < keys.length; i++) {
        pk = keys[i]; pv = pendingWrites[pk];
        iv = all.hasOwnProperty(pk) ? all[pk] : null;
        /* [V46] IDB 里没有该键时（Safari 下大量键只存在 LS），不能直接采信
           pendingWrites —— 那多半是启动早期「读不到就建档」的空壳。
           先看真实 localStorage 是否还有货，有货就以它为权威。 */
        if (iv == null && lsOk && origGet) {
          try { var lsv0 = origGet(pk); if (lsv0 != null && String(lsv0).length) { iv = lsv0; } } catch (els) { /* 忽略 */ }
        }
        if (iv == null || _dataWeight(pv) > _dataWeight(iv)) {
          mem[pk] = pv;
          persistBoth(pk, pv);
        } else { mem[pk] = iv; }
      }
      pendingWrites = {};
      /* 2.5) [V32] 时间戳裁决：ls 的最后写入比 IDB 更新，说明上一次 IDB 落盘被打断
             （页面关闭、事务中止），此时以 ls 为准；ls 侧已无该键即视为「删除」，同步抹掉 IDB。 */
      if (lsOk && lsRaw && origGet) {
        try {
          var sn = lsRaw.length, sk, bk2, lsTs, idbTs, lsv;
          for (i = 0; i < sn; i++) {
            sk = lsRaw.key(i);
            if (!sk || sk.indexOf(STAMP_PREFIX) !== 0) { continue; }
            bk2 = sk.slice(STAMP_PREFIX.length);
            if (!bk2 || bk2.indexOf("__xj_") === 0) { continue; }
            lsTs = Number(origGet(sk) || 0) || 0;
            idbTs = Number(all[sk] || 0) || 0;
            if (!lsTs || lsTs <= idbTs) { continue; }
            lsv = origGet(bk2);
            if (lsv == null) {
              if (Object.prototype.hasOwnProperty.call(mem, bk2)) { delete mem[bk2]; }
              idbDel(bk2);
            } else {
              mem[bk2] = lsv;
              idbPut(bk2, lsv);
            }
          }
        } catch (eStamp) { /* 忽略 */ }
      }
      /* 3) 反向补齐：真实 localStorage 有、IDB 没有的键（IDB 首次启用或曾被清空） */
      if (lsOk && lsRaw) {
        try {
          var n = lsRaw.length, tk, tv;
          for (i = 0; i < n; i++) {
            tk = lsRaw.key(i);
            if (!tk || /^__xj_/.test(tk) || all.hasOwnProperty(tk) || mem.hasOwnProperty(tk)) { continue; }
            tv = origGet ? origGet(tk) : null;
            if (tv != null) { mem[tk] = tv; idbPut(tk, tv); }
          }
        } catch (e2) { /* 忽略 */ }
      }
    }).then(function () { return vaultHealAll(); }).then(function () { notifyReady(); }).catch(function () { hydrateFallback(); });
    /* [V32] 超时兜底：indexedDB.open() 可能既不成功也不失败（另一标签页占着旧版本升级、
       iOS 低内存回收），此时状态会永远停在 pending —— 期间所有业务写入都压在
       pendingWrites 里不落盘，用户一刷新角色和聊天就全丢。等不到就按「IDB 不可用」处理。 */
    try { setTimeout(function () { hydrateFallback(); }, 8000); } catch (eT) { /* 忽略 */ }
  }
  var _hydrateFallbackDone = false;
  function hydrateFallback() {
    if (_hydrateFallbackDone) { return; }
    _hydrateFallbackDone = true;
    /* IDB 其实已经就绪（只是超时定时器晚于成功回调）：不重复兜底，也不要把状态改成 failed */
    if (idbOk || window.__xjStorageReady) { return; }
    /* IDB 不可用（隐私模式全禁用 / 打开挂起）：把水合期的写入落到真实 localStorage，
       否则本次会话的角色/聊天只活在内存里，一刷新就没。
       注意不把 idbOk 钉死为 false —— open 只是慢时它随后仍会成功，届时继续双写。 */
    var ks = Object.keys(pendingWrites), j;
    for (j = 0; j < ks.length; j++) {
      if (lsOk && origSet && pendingWrites[ks[j]] != null) { try { origSet(ks[j], pendingWrites[ks[j]]); } catch (e3) { /* 忽略 */ } }
      if (pendingWrites[ks[j]] != null) { mem[ks[j]] = pendingWrites[ks[j]]; }
    }
    pendingWrites = {};
    /* 降级标记：两种存储都不可用时，任何写入都留不住，必须让界面明说，而不是静默丢数据 */
    try { window.__xjStorageDegraded = !(lsOk || idbOk); } catch (e0) { /* 忽略 */ }
    notifyReady();
    try { window.__xjStorageState = "failed"; } catch (e1) { /* 忽略 */ }
    if (window.__xjStorageDegraded) {
      try { document.dispatchEvent(new CustomEvent("snowcrystal:storage-degraded")); } catch (e2) { /* 忽略 */ }
    }
  }

  /* [V32] 卸载兜底：水合还没完成就关页面时，把 pendingWrites 直接落到 localStorage（带时间戳），
     否则这一整次会话里新建的角色/聊天只活在内存里，重开即空。 */
  (function bindPendingFlushOnHide() {
    if (typeof window === "undefined" || window.__xjPendingFlushBound) { return; }
    window.__xjPendingFlushBound = true;
    var doFlush = function () {
      try {
        if (window.__xjStorageState !== "pending") { return; }
        if (!(lsOk && origSet)) { return; }
        var ks = Object.keys(pendingWrites), i2, ts = _stampOf();
        for (i2 = 0; i2 < ks.length; i2++) {
          var kk = ks[i2], vv = pendingWrites[kk];
          if (vv == null) { continue; }
          try { origSet(kk, vv); origSet(STAMP_PREFIX + kk, ts); } catch (e) { /* 单键失败忽略 */ }
        }
      } catch (e2) { /* 忽略 */ }
    };
    /* 放到微任务里：业务模块（角色/我方资料）的 pagehide 钩子会先把挂起写入推进
       pendingWrites，微任务在全部宏监听器跑完后才执行，才能一次写全 */
    var flush = function () { try { Promise.resolve().then(doFlush); } catch (e0) { doFlush(); } };
    try {
      window.addEventListener("pagehide", flush);
      window.addEventListener("beforeunload", flush);
      document.addEventListener("visibilitychange", function () { if (document.hidden) { flush(); } });
    } catch (e3) { /* 忽略 */ }
  })();

  /* 存储就绪通知 */
  function notifyReady() {
    try {
      window.__xjStorageReady = true;
      window.__xjStorageState = "ready";
      var fns = window.__xjStorageReadyFns || [];
      window.__xjStorageReadyFns = [];
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](); } catch (e) { /* 忽略单个订阅者异常 */ }
      }
      /* [V29] 广播就绪事件：任何后注册的模块（如头像同步）都能凭事件补一次重绘 */
      try { document.dispatchEvent(new CustomEvent("snowcrystal:storage-ready")); } catch (e2) { /* 忽略 */ }
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

  /* 包装读写（核心） */
  /* [V31] 数据权重：判断两份同键数据谁更完整。启动水合期各模块常用「默认值 /
     空数组」回写，若直接落盘就把角色、聊天记录等真实数据覆盖掉了（刷新后全部
     丢失的头号成因）。合并时只让更完整的一方获胜，空壳永远压不掉实数据。 */
  function _dataWeight(v) {
    if (v == null) { return 0; }
    var o = v, s = "";
    if (typeof v === "string") {
      s = v;
      try { o = JSON.parse(v); } catch (e) { return s.length; }
    }
    var w = 0, guard = 0;
    (function walk(x) {
      if (x == null || guard > 200000) { return; }
      guard++;
      if (Array.isArray(x)) { w += 1; for (var i = 0; i < x.length; i++) { walk(x[i]); } return; }
      if (typeof x === "object") {
        for (var k in x) { if (Object.prototype.hasOwnProperty.call(x, k)) { w += 1; walk(x[k]); } }
        return;
      }
      if (typeof x === "string") { w += x.length; return; }
      w += 1;
    })(o);
    return w;
  }
  function isHydrating() {
    try { return window.__xjStorageState === "pending"; } catch (e) { return false; }
  }
  /* 双写：真实 localStorage（轻量快照，重启秒读）+ IndexedDB（全量权威） */
  function persistBoth(key, value) {
    /* [V33] 同一道闸门：水合裁决、自愈回填都走这里，空壳一律不许落地 */
    if (!_guardWrite(key, value)) { return; }
    if (lsOk && origSet) { try { origSet(key, value); } catch (e) { /* 配额满交给 IDB */ } }
    if (idbOk && idbDb) { idbPut(key, value); vaultSave(key, value); } else { pendingWrites[key] = value; }
  }
  function patchedGet(key) {
    /* 水合完成后内存镜像就是本进程唯一权威（IDB 全量 + 本进程全部写入），
       优先返回它，避免读到遗留的旧 localStorage 快照而显示过期数据 */
    if (Object.prototype.hasOwnProperty.call(mem, key)) { return mem[key]; }
    if (lsOk && origGet) {
      try {
        var v = origGet(key);
        if (v != null) { return v; }
      } catch (e) { /* 忽略 */ }
    }
    return null;
  }
  /* [V32] 写入时间戳：每个业务键在 ls 与 IDB 两侧各记一枚「最后写入时刻」。
     水合时据此裁决谁更新 —— 只有「哪边新」，才不会出现「删了又被旧副本写回来」。 */
  var STAMP_PREFIX = "__xj_ts.";
  function _stampOf(key) { return String((window.Date && Date.now) ? Date.now() : 0); }
  function _writeStamp(key, ts) {
    try { if (lsOk && origSet) { origSet(STAMP_PREFIX + key, ts); } } catch (e) { /* 忽略 */ }
    try { if (idbOk && idbDb) { idbPut(STAMP_PREFIX + key, ts); } } catch (e2) { /* 忽略 */ }
  }
  function patchedSet(key, value) {
    try {
      if (value == null) { patchedRemove(key); return "ok"; }
      /* [V33] 空壳写保护：拒绝用空库/空数组覆盖已知有数据的域 */
      if (!_guardWrite(key, value)) { return "blocked"; }
      mem[key] = value;
      /* [V31] 水合期只进内存与待写队列，绝不落盘：此刻的写入几乎都是各模块
         「读不到就建档」的默认值，落盘即等于把磁盘上的真实数据抹掉。 */
      if (isHydrating()) { pendingWrites[key] = value; return "pending"; }
      var lsWrote = false;
      var stamp = _stampOf(key);
      if (lsOk && origSet) {
        try { origSet(key, value); lsWrote = true; } catch (e) { /* ls 写失败：交给 IDB 兜底 */ }
        try { origSet(STAMP_PREFIX + key, stamp); } catch (e2) { /* 时间戳写失败不影响主键 */ }
      }
      if (idbOk && idbDb) { idbPut(key, value); idbPut(STAMP_PREFIX + key, stamp); vaultSave(key, value); }
      else { pendingWrites[key] = value; }
      return lsWrote ? "ok" : (idbOk && idbDb ? "idb" : "pending");
    } catch (e) { return "fail"; }
  }
  function patchedRemove(key) {
    try {
      if (mem.hasOwnProperty(key)) { delete mem[key]; }
      /* 水合期删除同样不落盘：此刻的删除多是「没读到就当垃圾清掉」的误判，
         磁盘保留原值，水合完成后重新回到内存镜像。 */
      if (isHydrating()) { return true; }
      /* [V46] guarded 键的物理删除必须由业务显式声明（XJ_STORE.noticeShell）：
         否则任何「读不到就当垃圾清掉」的启动期逻辑都能直接抹掉角色、聊天、信件、
         字卡与表情包 —— 写入被拦住了、删除却漏网，等于白拦。 */
      if (_isGuardedKey(key) && !(_shellAllow[key] && _shellAllow[key] > Date.now())) {
        _guardLog.push({ t: Date.now(), key: key, reason: "remove-blocked" });
        if (_guardLog.length > 80) { _guardLog.shift(); }
        try { window.__xjGuardLog = _guardLog; } catch (e1) { /* 忽略 */ }
        return true;
      }
      var stamp = _stampOf(key);
      if (lsOk && origRemove) { try { origRemove(key); origSet(STAMP_PREFIX + key, stamp); } catch (e) { /* 忽略 */ } }
      if (idbOk && idbDb) { idbDel(key); idbPut(STAMP_PREFIX + key, stamp); }
      else if (pendingWrites.hasOwnProperty(key)) { delete pendingWrites[key]; }
      return true;
    } catch (e) { return false; }
  }
  /* [V46] 列全部业务键：真实 localStorage 的键 ∪ 内存镜像的键（不含 __xj_ 内部键）。
     Safari 下 window.localStorage 会被替换成代理对象，遍历必须仍然覆盖到真实存档键。 */
  function _lsAllKeys() {
    var out = [], seen = {}, i, k, j;
    try {
      if (lsOk && lsRaw) {
        for (i = 0; i < lsRaw.length; i++) {
          k = lsRaw.key(i);
          if (k && k.indexOf("__xj_") !== 0 && !seen[k]) { seen[k] = 1; out.push(k); }
        }
      }
    } catch (e) { /* 忽略 */ }
    var mk = Object.keys(mem);
    for (j = 0; j < mk.length; j++) {
      k = mk[j];
      if (!seen[k] && k.indexOf("__xj_") !== 0) { seen[k] = 1; out.push(k); }
    }
    return out;
  }
  function fakeLSFactory() {
    return {
      getItem: patchedGet,
      setItem: patchedSet,
      removeItem: patchedRemove,
      clear: function () {
        var ks = _lsAllKeys(), i;
        for (i = 0; i < ks.length; i++) { delete mem[ks[i]]; }
        pendingWrites = {};
        /* 水合期禁止清盘：此刻的清空多半来自「读不到就当空库」的误判 */
        if (isHydrating()) { return; }
        /* 真实 localStorage 侧同样要清干净，否则下次启动又被「反向补齐」救回来 */
        if (lsOk && origRemove) {
          for (i = 0; i < ks.length; i++) { try { origRemove(ks[i]); origRemove(STAMP_PREFIX + ks[i]); } catch (e1) { /* 忽略 */ } }
        }
        if (idbOk && idbDb) { idbTx("readwrite", function (st) { st.clear(); }); }
      },
      key: function (i) { return _lsAllKeys()[i] || null; },
      get length() { return _lsAllKeys().length; }
    };
  }

  /* 安装 */
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
      /* [V46] Safari 关键修复：WebKit 的 Storage 对象把 `localStorage.setItem = fn`
         当成「写入名为 setItem 的数据项」，方法补丁根本不生效 —— 所有直连
         localStorage.xxx 的模块完全绕过守卫，空壳照样覆盖真数据（这正是
         「每次改完刷新就丢一遍」的根因）。
         因此无论真实 localStorage 是否可用，一律用代理对象替换 window.localStorage：
         读写全部收敛到 patchedGet/patchedSet/patchedRemove（受 _guardWrite 保护），
         底层仍由 origGet/origSet/origRemove 操作真实存储。 */
      var patchedOk = false;
      var fake = fakeLSFactory();
      try {
        Object.defineProperty(window, "localStorage", { value: fake, writable: true, configurable: true });
        patchedOk = (window.localStorage === fake);
      } catch (e0) { patchedOk = false; }
      if (!patchedOk) {
        try { window.localStorage = fake; patchedOk = (window.localStorage === fake); } catch (e1) { patchedOk = false; }
      }
      if (!patchedOk && lsOk && lsRaw) {
        /* 最后退路：实例方法补丁（Chromium 下有效，Safari 下会退化成数据写入） */
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
      }
      /* [V46] 清掉历史遗留污染键：Safari 早期把函数当成数据存下的 getItem/setItem/removeItem */
      if (lsOk && origGet && origRemove) {
        var junk = ["getItem", "setItem", "removeItem", "clear", "key"];
        for (var jn = 0; jn < junk.length; jn++) {
          try {
            var jv = origGet(junk[jn]);
            if (jv != null && String(jv).length > 60 && String(jv).indexOf("function") >= 0) { origRemove(junk[jn]); }
          } catch (ej) { /* 忽略 */ }
        }
      }
    } catch (e) { /* 安装失败不影响页面 */ }
    /* 尽早从 IDB preload（不阻塞页面，DOMContentLoaded 前大概率完成） */
    idbInit();
  }
  /* ================= [V33] 数据保险层（空壳写保护 + 版本环 + 启动自愈） =================
     存储链路上的真实事故：启动早期各模块「读不到就建档」，把空库当成权威写回磁盘，
     而且版本号 / 时间戳还会单调递增，让空库在后续裁决里永远赢过真实数据。
     这一层不依赖任何业务代码自觉，从落盘入口直接拦：
       1) 受保护域的新值是空壳、而该域已知有非空数据 → 拒绝落盘；
          只有调用方显式声明「这次是真的要清空」(XJ_STORE.noticeShell) 才放行；
       2) 每次成功落盘一个非空值，同时压一份版本环副本 __xj_vault.<key>（只留最新一版）；
       3) 启动水合后对账：主副本变瘦/变空而版本环仍有货 → 自动回滚。 */
  var GUARD_PREFIXES = [
    "snowcrystal.account.", "snowcrystal.chat.v1", "snowcrystal.letter.",
    "snowcrystal.wordcard.", "snowcrystal.wcLine.", "snowcrystal.media.",
    "snowcrystal.name.v1.", "snowcrystal.image.v1.", "snowcrystal.zones.v1",
    "snowcrystal.topcomps.v1", "snowcrystal.theme.v1", "snowcrystal.homecomp.v1",
    "mirror_chats", "mirror_msg_", "mirror_partnerProfile", "mirror_partnerProfiles", "mirror_myProfile"
  ];
  var VAULT_PREFIX = "__xj_vault.";
  var _shellAllow = {};
  var _trustedW = {};        /* key → 已知非空数据的权重 */
  var _trustedNonShell = {}; /* [V46] key → 曾经存在过非空壳数据（与权重量级无关） */
  var _guardLog = [];
  function _isGuardedKey(k) {
    if (!k || k.indexOf("__xj_") === 0) { return false; }
    for (var i = 0; i < GUARD_PREFIXES.length; i++) {
      if (k.indexOf(GUARD_PREFIXES[i]) === 0) { return true; }
    }
    return false;
  }
  function _isShellValue(v) {
    if (v == null) { return true; }
    var s0;
    if (typeof v !== "string") { try { s0 = JSON.stringify(v); } catch (e) { return false; } }
    else { s0 = v; }
    if (typeof s0 !== "string") { return false; }
    var t = s0.replace(/^\s+|\s+$/g, "");
    if (!t || t === "null" || t === "undefined" || t === "[]" || t === "{}") { return true; }
    var o = null;
    try { o = JSON.parse(t); } catch (e2) { return false; }
    if (o == null) { return true; }
    if (Array.isArray(o)) { return o.length === 0; }
    if (typeof o === "object") {
      var arrKeys = ["notes", "messages", "chats", "items", "pids"], hasArr = false, k2;
      for (k2 in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k2)) { continue; }
        if (arrKeys.indexOf(k2) < 0) { continue; }
        hasArr = true;
        if (Array.isArray(o[k2]) && o[k2].length > 0) { return false; }
        if (o[k2] && typeof o[k2] === "object" && !Array.isArray(o[k2]) && Object.keys(o[k2]).length > 0) { return false; }
      }
      if (hasArr) { return true; }
      /* [V46] 兜底：任意结构（字卡库 quote/main/kao/emoji/sticker/pat、分组表、地区表…）
         只要每个字段都是空数组 / 空对象 / 空串 / 0，整体就等于空库。
         旧实现只认 notes/messages/chats/items/pids 五个键名，空字卡（6 个空数组，
         权重刚好 12）会被当成「非空壳」放行，正是字卡与表情包被清空的原因。 */
      var allEmpty = true, kk2, vv2;
      for (kk2 in o) {
        if (!Object.prototype.hasOwnProperty.call(o, kk2)) { continue; }
        vv2 = o[kk2];
        if (Array.isArray(vv2)) { if (vv2.length > 0) { allEmpty = false; break; } }
        else if (vv2 && typeof vv2 === "object") { if (Object.keys(vv2).length > 0) { allEmpty = false; break; } }
        else if (vv2 !== null && vv2 !== undefined && vv2 !== "" && vv2 !== 0 && vv2 !== false) { allEmpty = false; break; }
      }
      if (allEmpty && Object.keys(o).length > 0) { return true; }
      var w = _dataWeight(o);
      return w < 12;
    }
    return false;
  }
  /* 显式声明「这次是真的要清空」，窗口期内放行空壳写入（默认 8 秒） */
  function noticeShell(key, ms) {
    try {
      key = String(key);
      _shellAllow[key] = ((window.Date && Date.now) ? Date.now() : 0) + (ms || 8000);
      /* 关键：用户主动删除时，保险副本必须同步作废 —— 否则下次启动自愈会把它「救」回来，
         表现为「删掉的角色/信件刷新后复活」。 */
      if (idbOk && idbDb) {
        /* 写墓碑而不是依赖异步删除：删除可能与随后的写入竞争，墓碑是确定性事实 */
        idbPut(VAULT_PREFIX + key, JSON.stringify({ t: (window.Date && Date.now) ? Date.now() : 0, v: null, tomb: 1 }));
      }
      _trustedW[key] = 0;
      _trustedNonShell[key] = 0; /* [V46] 用户真清空：解除「曾有过数据」标记，下一次空壳才写不进去 */
      return true;
    } catch (e) { return false; }
  }
  function _guardWrite(key, nv) {
    try {
      if (!_isGuardedKey(key)) { return true; }
      if (!_isShellValue(nv)) {
        var w = _dataWeight(nv);
        if (w > (_trustedW[key] || 0)) { _trustedW[key] = w; }
        _trustedNonShell[key] = 1;
        return true;
      }
      if (_shellAllow[key] && _shellAllow[key] > Date.now()) { return true; }
      var known = _trustedW[key] || 0;
      /* [V46] 权重必须同时参考真实 localStorage 现值：IDB 里没有该键（Safari 常见）
         时 _trustedW 会是 0，空壳就能一路落盘把真数据覆盖掉。 */
      var wasReal = !!_trustedNonShell[key];
      if (lsOk && origGet) {
        try {
          var lv = origGet(key);
          if (lv != null && String(lv).length) {
            var lw = _dataWeight(lv);
            if (lw > known) { known = lw; _trustedW[key] = lw; }
            if (!wasReal && !_isShellValue(lv)) { wasReal = true; }
          }
        } catch (eg) { /* 忽略 */ }
      }
      /* [V46] 关键判据切换成「这个键以前有没有过真数据」，而不是「权重大于 12」：
         单个角色记录 [{"id":"p1","name":"A"}] 权重只有 7、账号对象也不足 12，
         旧阈值直接放行清空，这正是角色列表与账号被写成空壳的原因。 */
      if (wasReal) {
        _guardLog.push({ t: Date.now(), key: key, reason: "shell-overwrite", known: known });
        if (_guardLog.length > 80) { _guardLog.shift(); }
        try { window.__xjGuardLog = _guardLog; } catch (e1) { /* 忽略 */ }
        return false;
      }
      return true;
    } catch (e) { return true; }
  }
  /* 版本环：只保留每域最新一版「非空」数据，用于误覆盖后的回滚 */
  function vaultSave(key, value) {
    try {
      if (!key || key.indexOf("__xj_") === 0) { return; }
      if (!_isGuardedKey(key) || _isShellValue(value)) { return; }
      if (!(idbOk && idbDb)) { return; }
      var ts = (window.Date && Date.now) ? Date.now() : 0;
      idbPut(VAULT_PREFIX + key, JSON.stringify({ t: ts, v: value }));
    } catch (e) { /* 保险副本失败不影响主写入 */ }
  }
  /* 启动对账：主副本为空壳、或比版本环瘦太多 → 用版本环回滚 */
  function vaultHealAll() {
    if (!(idbOk && idbDb)) { return Promise.resolve(0); }
    return idbDumpPrefix(VAULT_PREFIX).then(function (all) {
      var healed = 0, vk, biz, rec, saved, cur;
      for (vk in all) {
        if (!Object.prototype.hasOwnProperty.call(all, vk)) { continue; }
        biz = vk.slice(VAULT_PREFIX.length);
        if (!biz) { continue; }
        try { rec = JSON.parse(all[vk]); } catch (e) { continue; }
        if (!rec || rec.v == null) { continue; }
        saved = rec.v;
        if (_isShellValue(saved)) { continue; }
        cur = mem.hasOwnProperty(biz) ? mem[biz] : null;
        var cw = _isShellValue(cur) ? 0 : _dataWeight(cur);
        var sw = _dataWeight(saved);
        if (cw >= sw * 0.6) { continue; }
        mem[biz] = saved;
        if (_isGuardedKey(biz)) { _trustedW[biz] = Math.max(_trustedW[biz] || 0, sw); }
        persistBoth(biz, saved);
        healed++;
        try {
          (window.__xjHealLog = window.__xjHealLog || []).push({ key: biz, from: rec.t, weight: sw, was: cw, has: Object.prototype.hasOwnProperty.call(mem, biz), raw: cur == null ? "null" : String(cur).slice(0, 48) });
        } catch (e2) { /* 忽略 */ }
      }
      return healed;
    })["catch"](function () { return 0; });
  }

  install();

  /* 对外 API */
  window.XJ_STORE = {
    /* [V33] 声明一次「真的清空」，窗口期内允许写空壳（8 秒） */
    noticeShell: noticeShell,
    /* 保险层健康度：谁被拦过、回滚过什么 */
    guardLog: function () { return _guardLog.slice(); },
    healLog: function () { return (window.__xjHealLog || []).slice(); },
    isShell: _isShellValue,
    trusted: function () { return JSON.parse(JSON.stringify(_trustedW)); },
    /* 与 localStorage.getItem 语义一致：返回字符串或 null */
    get: function (key) {
      return patchedGet(String(key));
    },
    /* 返回 "ok"(localStorage 持久化成功) / "idb"(IndexedDB 兜底持久化成功) / */
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
    /* 直连 IndexedDB 的读写：不占 localStorage 配额，供大容量数据（云笺信件 / 梦境）专用 */
    idbReady: function () { return !!(idbOk && idbDb); },
    idbGet: function (key) { return idbGetOne(String(key)); },
    idbSet: function (key, value) {
      var v = value;
      if (v == null) { return idbDel(String(key)); }
      if (typeof v === "object") { try { v = JSON.stringify(v); } catch (e) { v = String(v); } }
      return idbPut(String(key), String(v));
    },
    idbRemove: function (key) { return idbDel(String(key)); },
    /* 按前缀枚举 / 清理 IDB 键：给「按需正文」这类不进内存镜像的大容量数据做备份与清空 */
    idbDump: function (prefix) { return idbDumpPrefix(String(prefix)); },
    idbPurge: function (prefix) { return idbPurgePrefix(String(prefix)); },
    /* 只走 IDB，同时刷新内存镜像（数据管理导出 / 统计据内存镜像取值，保证取到最新） */
    idbSetOnly: function (key, value) {
      var k = String(key), v = value;
      if (v == null) { return idbDel(k); }
      if (typeof v === "object") { try { v = JSON.stringify(v); } catch (e) { v = String(v); } }
      mem[k] = String(v);
      return idbPut(k, String(v));
    },
    /* 只读 / 只写真实 localStorage（不落 IDB）：给"秒开快照"这类轻量副本用 */
    lsGetOnly: function (key) {
      if (!(lsOk && origGet)) { return null; }
      try { var v = origGet(String(key)); return v == null ? null : v; } catch (e) { return null; }
    },
    lsSetOnly: function (key, value) {
      if (!(lsOk && origSet)) { return false; }
      /* [V46] 直写通道同样过闸门：信件 writeSnap、聊天快照都从这里落 LS，
         旧实现绕过校验，空壳照样把真快照覆盖掉。 */
      try { if (typeof _guardWrite === "function" && !_guardWrite(String(key), String(value))) { return false; } } catch (eg) { /* 忽略 */ }
      try { origSet(String(key), String(value)); return true; } catch (e) { return false; }
    },
    lsRemoveOnly: function (key) {
      if (!(lsOk && origRemove)) { return false; }
      try { origRemove(String(key)); return true; } catch (e) { return false; }
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

(function () {
  var mem = (typeof navigator !== "undefined" && navigator.deviceMemory)
    ? navigator.deviceMemory : 0;

  function tier() {
    if (!mem) { return 0; }
    if (mem <= 2) { return 0; }
    if (mem <= 4) { return 1; }
    if (mem <= 8) { return 2; }
    return 3;
  }
  var t = tier();

  /* 档位表（列含义）： */
  var PROFILES = [
    { imgMax: 1280, chatImgMax: 1280, avatarMax: 200, bgMax: 1440, rrTplMax: 12, customMax: 6, effectMax: 80,  blurMax: 30, storeMB: 5,  cacheMax: 40 },
    { imgMax: 1600, chatImgMax: 1600, avatarMax: 240, bgMax: 1600, rrTplMax: 16, customMax: 8, effectMax: 120, blurMax: 40, storeMB: 8,  cacheMax: 80 },
    { imgMax: 1920, chatImgMax: 1920, avatarMax: 280, bgMax: 1920, rrTplMax: 20, customMax: 10, effectMax: 160, blurMax: 50, storeMB: 10, cacheMax: 120 },
    { imgMax: 2240, chatImgMax: 2240, avatarMax: 320, bgMax: 2240, rrTplMax: 24, customMax: 12, effectMax: 200, blurMax: 60, storeMB: 12, cacheMax: 160 }
  ];
  var P = PROFILES[t];

  window.XJ_CAP = {
    memGB: mem,
    tier: t,
    imgMax: function () { return P.imgMax; },
    chatImgMax: function () { return P.chatImgMax; },
    avatarMax: function () { return P.avatarMax; },
    bgMax: function () { return P.bgMax; },
    rrTplMax: function () { return P.rrTplMax; },
    customMax: function () { return P.customMax; },
    effectMax: function () { return P.effectMax; },
    blurMax: function () { return P.blurMax; },
    storeMB: function () { return P.storeMB; },
    cacheMax: function () { return P.cacheMax; }
  };
})();
