/* 雪山晶 · 20-wordcard-media ｜ 源：雪山晶.html L10284-L10522 ｜ JS 模块 */
var MEDIA_DB = "snowcrystal.media.v1";
  var MEDIA_STORE = "media";
  var MEDIA_CACHE = {};           /* mediaKey -> dataURL 内存缓存 */
  var MEDIA_KEY_RE = /^m_[A-Za-z0-9_-]{6,}$/;

  function isDataUrl(s) { return typeof s === "string" && /^data:image\//i.test(s); }
  function isMediaKey(s) { return typeof s === "string" && MEDIA_KEY_RE.test(s); }
  function isExtUrl(s) { return typeof s === "string" && /^(https?:\/\/|\/\/)/i.test(s); }

  function mediaDbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no-idb")); return; }
      var req = window.indexedDB.open(MEDIA_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) { db.createObjectStore(MEDIA_STORE, { keyPath: "key" }); }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("idb-open")); };
    });
  }
  function mediaCachePut(key, dataURL) {
    if (!key || !dataURL) { return; }
    MEDIA_CACHE[key] = dataURL;
  }
  function mediaSave(key, dataURL) {
    if (!key || !dataURL) { return Promise.resolve(null); }
    MEDIA_CACHE[key] = dataURL;
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).put({ key: key, data: dataURL, ts: Date.now() });
        tx.oncomplete = function () { resolve(key); };
        tx.onerror = function () { reject(tx.error || new Error("idb-put")); };
        tx.onabort = function () { reject(tx.error || new Error("idb-abort")); };
      });
    })["catch"](function () { return null; });
  }
  function mediaGet(key) {
    if (!key) { return Promise.resolve(null); }
    if (MEDIA_CACHE[key]) { return Promise.resolve(MEDIA_CACHE[key]); }
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readonly");
        var req = tx.objectStore(MEDIA_STORE).get(key);
        req.onsuccess = function () {
          var row = req.result;
          if (row && row.data) { mediaCachePut(key, row.data); resolve(row.data); }
          else { resolve(null); }
        };
        req.onerror = function () { reject(req.error || new Error("idb-get")); };
      });
    })["catch"](function () { return null; });
  }
  function mediaDelete(key) {
    if (!key) { return Promise.resolve(); }
    delete MEDIA_CACHE[key];
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function mediaDeleteAll() {
    MEDIA_CACHE = {};
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function mediaNewKey() {
    return "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  /* 保存一张新图：写 IDB 返回 mediaKey；IDB 不可用时返回 null（调用方回退存 base64） */
  function mediaSaveNew(dataURL) {
    if (!isDataUrl(dataURL)) { return Promise.resolve(null); }
    return mediaSave(mediaNewKey(), dataURL).then(function (mk) { return mk || null; });
  }

  /* 遍历所有 sticker 分组条目（items/deleted/blocked 三数组），回调 (arr, idx, i */
  function stickerWalk(cb) {
    var groups = (wcl && wcl.sticker) || [], gi, ai, arr, i;
    for (gi = 0; gi < groups.length; gi++) {
      arr = [(groups[gi] && groups[gi].items) || [], (groups[gi] && groups[gi].deleted) || [], (groups[gi] && groups[gi].blocked) || []];
      for (ai = 0; ai < arr.length; ai++) {
        for (i = 0; i < arr[ai].length; i++) { cb(arr[ai], i, arr[ai][i]); }
      }
    }
  }
  /* 收集全部被引用的 mediaKey（去重），用于删除判定与导出回填 */
  function stickerMediaKeys() {
    var out = [], i;
    stickerWalk(function (arr, idx, it) {
      if (typeof it === "string") { if (isMediaKey(it) && out.indexOf(it) < 0) { out.push(it); } }
      else if (it && typeof it === "object" && isMediaKey(it.img) && out.indexOf(it.img) < 0) { out.push(it.img); }
    });
    return out;
  }
  /* 取条目的 mediaKey（无则空串） */
  function grpItemImgKey(it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return isMediaKey(it) ? it : ""; }
    if (it && typeof it === "object") { return isMediaKey(it.img) ? it.img : ""; }
    return "";
  }
  /* 删除 mediaKey（若已无任何条目引用则真正删 IDB，避免重复引用误删） */
  function mediaDeleteIfUnused(mk) {
    if (!mk) { return Promise.resolve(); }
    if (stickerMediaKeys().indexOf(mk) < 0) { return mediaDelete(mk); }
    return Promise.resolve();
  }
  /* 收集全部 sticker 引用的 mediaKey -> base64 映射（导出前异步调用） */
  function mediaResolveAll() {
    var keys = stickerMediaKeys(), map = {}, i;
    function step(idx) {
      if (idx >= keys.length) { return Promise.resolve(map); }
      var mk = keys[idx];
      if (MEDIA_CACHE[mk]) { map[mk] = MEDIA_CACHE[mk]; return step(idx + 1); }
      return mediaGet(mk).then(function (d) { if (d) { map[mk] = d; } return step(idx + 1); });
    }
    return step(0);
  }
  /* 导出/备份用：把对象中的 sticker 条目 mediaKey 回填为 base64（查不到的保留原值） */
  function stickerFillBase64(obj, map) {
    var groups = (obj && obj.sticker) || [], gi, g, arr, ai, i, it;
    for (gi = 0; gi < groups.length; gi++) {
      g = groups[gi] || {};
      arr = [g.items, g.deleted, g.blocked];
      for (ai = 0; ai < arr.length; ai++) {
        if (!Array.isArray(arr[ai])) { continue; }
        for (i = 0; i < arr[ai].length; i++) {
          it = arr[ai][i];
          if (typeof it === "string") {
            if (isMediaKey(it)) {
              var _b64 = (map && map[it]) || null;
              arr[ai][i] = { k: "🖼", t: "表情包", img: _b64 || it, __missing: _b64 ? undefined : true };
            }
          } else if (it && typeof it === "object" && isMediaKey(it.img)) {
            if (map && map[it.img]) { it.img = map[it.img]; }
            else { it.__missing = true; }
          }
        }
      }
    }
    return obj;
  }
  /* 老数据迁移 / 导入回填：把 wcl 中所有 data:image base64 写入 IDB 并替换为 mediaKe */
  function mediaMigrateAll() {
    var pend = [], moved = false;
    stickerWalk(function (arr, idx, it) {
      var img = null;
      if (typeof it === "string") { if (isDataUrl(it)) { img = it; } }
      else if (it && typeof it === "object" && isDataUrl(it.img)) { img = it.img; }
      if (!img) { return; }
      pend.push({ arr: arr, idx: idx, img: img });
    });
    if (!pend.length) { return Promise.resolve(false); }
    function runChunk(start) {
      var chunk = pend.slice(start, start + 8), ps = [], i, ctx;
      for (i = 0; i < chunk.length; i++) {
        ctx = chunk[i];
        ps.push(mediaSaveNew(ctx.img).then(function (c, mk) {
          if (mk) {
            if (typeof c.arr[c.idx] === "string") { c.arr[c.idx] = mk; }
            else if (c.arr[c.idx] && typeof c.arr[c.idx] === "object") { c.arr[c.idx].img = mk; }
            moved = true;
          }
        }.bind(null, ctx)));
      }
      return Promise.all(ps).then(function () {
        if (start + 8 < pend.length) { return runChunk(start + 8); }
        return null;
      });
    }
    return runChunk(0).then(function () {
      if (moved) { saveWcl(); }
      return moved;
    });
  }
  /* 渲染辅助：sticker 条目 img 生成 <img> —— base64/外链直显，mediaKey 命中内存缓存直 */
  function stickerImgHtml(img, t) {
    var onerr = "this.classList.add('wc-img-fail');var fb=this.nextElementSibling;if(fb){fb.classList.add('wc-img-fallback-on')}";
    if (isDataUrl(img) || isExtUrl(img)) {
      return '<img src="' + esc(img) + '" alt="表情包" loading="lazy" onerror="' + onerr + '">';
    }
    if (isMediaKey(img) && MEDIA_CACHE[img]) { return '<img src="' + esc(MEDIA_CACHE[img]) + '" alt="表情包" loading="lazy" onerror="' + onerr + '">'; }
    return '<img data-mkey="' + esc(img) + '" alt="表情包" loading="lazy">';
  }
  /* 渲染辅助：为容器内所有 data-mkey 图片异步从 IDB 取回 base64 并设置 src */
  function stickerBindMedia(host) {
    if (!host || !host.querySelectorAll) { return; }
    var imgs = host.querySelectorAll("img[data-mkey]"), i, img, mk;
    for (i = 0; i < imgs.length; i++) {
      img = imgs[i];
      mk = img.getAttribute("data-mkey");
      if (!mk) { continue; }
      (function (el, key) {
        if (MEDIA_CACHE[key]) { el.setAttribute("src", MEDIA_CACHE[key]); return; }
        var tried = 0;
        function bindOnce() {
          mediaGet(key).then(function (d) {
            if (d) { el.setAttribute("src", d); return; }
            if (tried < 1) { tried = 1; window.setTimeout(bindOnce, 250); return; }
            el.classList.add("wc-img-fail");
            var fb = el.nextElementSibling;
            if (fb) {
              fb.classList.add("wc-img-fallback-on");
              if (!fb.getAttribute("data-missing")) {
                fb.setAttribute("data-missing", "1");
                fb.innerHTML = esc(fb.textContent || "") + '<span class="wc-img-missing-tip">图片缺失</span>';
              }
            }
          });
        }
        bindOnce();
      })(img, mk);
    }
  }

  /* 导入/上传表情包成功后，若聊天室表情面板正打开着（sticker Tab），主动重渲染， */
  function syncChatStickerPanel() {
    try {
      if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.switchEmojiTab) {
        var pnl = document.getElementById("chatEmojiPanel");
        if (pnl && pnl.classList.contains("is-open")) { window.SnowCrystal.Chat.switchEmojiTab("sticker"); }
      }
    } catch (e) { /* 不影响主流程 */ }
  }

  
