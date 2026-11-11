/* 雪山晶 · 22-voice ｜ 源：雪山晶.html L10734-L11502 ｜ JS 模块 */
/* 字卡库扩展库计数：专属字卡（按对方角色分库）/ 语音字卡 */
  var SUB_KEY_WC = "snowcrystal.wordcard.sub.v1";
  function wcExtCount(kind) {
    if (kind === "voice") {
      try {
        var vc = voiceCounts();
        return { groups: vc.groups || 0, items: vc.items || 0 };
      } catch (e) { return { groups: 0, items: 0 }; }
    }
    if (kind === "sub") {
      var d = null;
      try { var rawSub = wclStoreGet(SUB_KEY_WC); d = rawSub ? JSON.parse(rawSub) : null; } catch (e2) { d = null; }
      if (!d || typeof d !== "object") { return { groups: 0, items: 0 }; }
      var g = 0, n = 0, pid;
      for (pid in d) {
        if (!Object.prototype.hasOwnProperty.call(d, pid)) { continue; }
        if (!Array.isArray(d[pid])) { continue; }
        if (d[pid].length) { g += 1; n += d[pid].length; }
      }
      return { groups: g, items: n };
    }
    return { groups: 0, items: 0 };
  }

  /* 页面进入钩子：以前只有「点进某个库」后才刷新统计，直接切页/返回都显示旧值（0） */
  window.__wcPageRefresh = function (page) {
    try {
      if (page === "wordcard" || page === "wordcard-face-lib" || page === "wc-hub" || page === "sub-lib") {
        renderWclEntry();
      }
    } catch (e) { /* 忽略 */ }
  };

  /* 统一存储层从 IndexedDB 恢复到内存镜像后：字卡库重新读盘并重绘，
     修「刷新后先渲染默认空数据 → 页面显示 0」的时序问题 */
  if (window.XJ_STORE && typeof window.XJ_STORE.onReady === "function") {
    window.XJ_STORE.onReady(function () {
      try {
        wclReload();
        voiceData = null;   /* 语音字卡同样重新读盘，避免先渲染成 0 条 */
        renderWclEntry();
      } catch (e) { /* 忽略 */ }
    });
  }

  /* 语音时长格式化：m′ss″ */
  function fmtVoiceDur(d) {
    d = Math.max(0, Math.round(Number(d) || 0));
    var m = Math.floor(d / 60), s = d % 60;
    return m + "\u2032" + (s < 10 ? "0" : "") + s + "\u2033";
  }

  var SOUND_DB = "snowcrystal.sound.v1";
  var SOUND_STORE = "sound";
  var SOUND_CACHE = {};            /* audioKey -> dataURL 内存缓存 */
  var VOICE_KEY = "snowcrystal.voice.v1";

  var voiceData = null;
  var voiceNav = { group: 0, sel: false, selPicks: [] };
  var voiceAudio = null;           /* 播放中的 Audio 单例 */
  var voiceAudioBtn = null;        /* 当前播放按钮元素 */
  var voiceAudioBubble = null;     /* 当前播放气泡元素 */

  function soundNewKey() { return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function soundDbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no-idb")); return; }
      var req = window.indexedDB.open(SOUND_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(SOUND_STORE)) { db.createObjectStore(SOUND_STORE, { keyPath: "key" }); }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("idb-open")); };
    });
  }
  function soundSave(key, dataURL) {
    if (!key || !dataURL) { return Promise.resolve(null); }
    SOUND_CACHE[key] = dataURL;
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).put({ key: key, data: dataURL, ts: Date.now() });
        tx.oncomplete = function () { resolve(key); };
        tx.onerror = function () { reject(tx.error || new Error("idb-put")); };
        tx.onabort = function () { reject(tx.error || new Error("idb-abort")); };
      });
    })["catch"](function () { return null; });
  }
  function soundGet(key) {
    if (!key) { return Promise.resolve(null); }
    if (SOUND_CACHE[key]) { return Promise.resolve(SOUND_CACHE[key]); }
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(SOUND_STORE, "readonly");
        var req = tx.objectStore(SOUND_STORE).get(key);
        req.onsuccess = function () {
          var row = req.result;
          if (row && row.data) { SOUND_CACHE[key] = row.data; resolve(row.data); }
          else { resolve(null); }
        };
        req.onerror = function () { reject(req.error || new Error("idb-get")); };
      });
    })["catch"](function () { return null; });
  }
  function soundDelete(key) {
    if (!key) { return Promise.resolve(); }
    delete SOUND_CACHE[key];
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function soundDeleteAll() {
    SOUND_CACHE = {};
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }

  function voiceLoad() {
    if (voiceData) {
      /* 结构规范化：历史/半写入数据中 items 可能缺失或非数组， */
      var i, vg;
      for (i = 0; i < voiceData.groups.length; i++) {
        vg = voiceData.groups[i];
        if (!vg || typeof vg !== "object") { continue; }
        if (!Array.isArray(vg.items)) { vg.items = []; }
        if (!Array.isArray(vg.deleted)) { vg.deleted = []; }
        if (!Array.isArray(vg.blocked)) { vg.blocked = []; }
      }
      return voiceData;
    }
    var raw = null;
    /* v-FIX：与字卡库一致走 XJ_STORE（localStorage 写满/被隔离时数据在 IndexedDB 兜底通道，
       只读原生 localStorage 会让语音字卡库显示 0 条） */
    try { raw = wclStoreGet(VOICE_KEY); } catch (e) { raw = null; }
    if (!raw) { try { if (window.localStorage) { raw = window.localStorage.getItem(VOICE_KEY); } } catch (e0) { raw = null; } }
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.groups)) {
          voiceData = o;
          var j, g2;
          for (j = 0; j < voiceData.groups.length; j++) {
            g2 = voiceData.groups[j];
            if (!g2 || typeof g2 !== "object") { continue; }
            if (!Array.isArray(g2.items)) { g2.items = []; }
            if (!Array.isArray(g2.deleted)) { g2.deleted = []; }
            if (!Array.isArray(g2.blocked)) { g2.blocked = []; }
          }
          return voiceData;
        }
      } catch (e2) { /* 损坏则重建 */ }
    }
    voiceData = { groups: [] };
    return voiceData;
  }
  function voiceSave() {
    try { if (window.localStorage) { window.localStorage.setItem(VOICE_KEY, JSON.stringify(voiceData)); } } catch (e) { /* 本机写满时静默 */ }
  }
  function voiceGroups() { return (voiceLoad().groups || []); }
  function voiceAllItems() {
    var gs = voiceGroups(), out = [], i, j;
    for (i = 0; i < gs.length; i++) {
      for (j = 0; j < (gs[i].items || []).length; j++) { out.push(gs[i].items[j]); }
    }
    return out;
  }
  function voiceCounts() {
    var gs = voiceGroups(), n = 0, i;
    for (i = 0; i < gs.length; i++) { n += (gs[i].items || []).length; }
    return { groups: gs.length, items: n };
  }
  function voicePickRandom() {
    var all = voiceAllItems();
    if (!all.length) { return null; }
    return all[Math.floor(Math.random() * all.length)];
  }
  function renderVoiceEntry() {
    var el = document.getElementById("voiceMeta");
    if (!el) { return; }
    var c = voiceCounts();
    el.textContent = c.groups + " 组 · " + c.items + " 条";
  }
  function voiceStopPlay() {
    if (voiceAudio) { try { voiceAudio.pause(); } catch (e) { /* ignore */ } voiceAudio = null; }
    if (voiceAudioBtn) { voiceAudioBtn.classList.remove("is-playing"); voiceAudioBtn.textContent = "▶"; voiceAudioBtn = null; }
    if (voiceAudioBubble) { voiceAudioBubble.classList.remove("playing"); voiceAudioBubble = null; }
  }
  function voicePlaySrc(dataUrl, dur, btnEl, bubbleEl) {
    voiceStopPlay();
    if (!dataUrl) { return; }
    var a = new Audio(dataUrl);
    voiceAudio = a;
    if (btnEl) { btnEl.classList.add("is-playing"); btnEl.textContent = "⏸"; voiceAudioBtn = btnEl; }
    if (bubbleEl) { bubbleEl.classList.add("playing"); voiceAudioBubble = bubbleEl; }
    a.onerror = function () { voiceStopPlay(); wcToast("语音播放失败"); };
    a.play()["catch"](function () { voiceStopPlay(); });
  }

  /* 语音字卡库 · 分组列表页 */
  function openVoiceLib() {
    voiceLoad();
    voiceNav.group = 0;
    voiceNav.sel = false;
    voiceNav.selPicks = [];
    switchPage("voice-lib");
    renderVoiceLib();
  }
  function renderVoiceLib() {
    voiceLoad();
    var tools = document.getElementById("voiceLibTools");
    if (tools) { tools.innerHTML = voiceLibToolbarHtml(); }
    var wrap = document.getElementById("voiceSearchWrap");
    if (wrap) { wrap.hidden = true; }
    var inp = document.getElementById("voiceSearchInput");
    if (inp) { inp.value = ""; }
    var res = document.getElementById("voiceSearchResults");
    if (res) { res.hidden = true; res.innerHTML = ""; }
    var list = document.getElementById("voiceGroups");
    if (list) { list.hidden = false; list.innerHTML = voiceLibGroupsHtml(); }
    var foot = document.getElementById("voiceLibFoot");
    if (foot) { foot.textContent = "共 " + voiceGroups().length + " 组 · 数据存在本机"; }
    renderVoiceEntry();
    /* v-DUR-FIX：进入库页时补算历史条目缺失的时长 */
    try { voiceDurFixAll(); } catch (e) { /* ignore */ }
  }
  function voiceLibToolbarHtml() {
    var html = "";
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="新建分组" aria-label="新建分组" onclick="SnowCrystal.voiceAddGroup()">' + WC_ICO_ADD + "</button>";
    html += '<button class="wc-tool is-ico" type="button" title="导入 mp3（自动归入「导入的语音」分组）" aria-label="导入 mp3" onclick="SnowCrystal.voiceImportFiles()">' + WC_ICO_IMPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" title="搜索" aria-label="搜索" onclick="SnowCrystal.voiceToggleSearch()">' + WC_ICO_SEARCH + "</button>";
    return html;
  }
  function voiceLibGroupsHtml() {
    var gs = voiceGroups(), html = "", i;
    if (!gs.length) { return '<p class="grp-empty">还没有语音分组，点上方「＋」新建，或直接导入 mp3</p>'; }
    for (i = 0; i < gs.length; i++) {
      var n = (gs[i].items || []).length;
      html += '<div class="group-item-wrapper">' +
                '<div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + i + ')">' +
                  '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                  '<span class="discover-info">' +
                    '<span class="discover-title lib-row-name">' + esc(gs[i].name) + "</span>" +
                    '<span class="discover-desc">' + n + " 条 · 点进查看</span>" +
                  "</span>" +
                  '<span class="discover-arrow">›</span>' +
                  '<span class="group-item-actions">' +
                    '<button type="button" title="重命名" aria-label="重命名分组" onclick="event.stopPropagation();SnowCrystal.voiceRenameGroupAt(' + i + ')">' + WC_ICO_PEN + "</button>" +
                    '<button class="is-danger" type="button" title="删除" aria-label="删除分组" onclick="event.stopPropagation();SnowCrystal.voiceDeleteGroupAt(' + i + ')">' + WC_ICO_TRASH + "</button>" +
                  "</span>" +
                "</div>" +
                (i < gs.length - 1 ? '<div class="list-divider" aria-hidden="true"></div>' : "") +
              "</div>";
    }
    return html;
  }
  function voiceAddGroup() {
    /* v-FIX-interaction：原生 prompt 在部分内嵌 WebView 被禁用（静默返回 null），统一改用站内 wcPrompt */
    wcPrompt("新建语音字卡分组", "语音 " + (voiceGroups().length + 1), "", function (v) {
      var name = String(v || "").trim();
      if (!name) { return; }
      voiceData.groups.push({ name: name, items: [], deleted: [], blocked: [] });
      voiceSave();
      renderVoiceLib();
      wcToast("已新建分组");
    });
  }
  function voiceRenameGroupAt(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    /* v-FIX-interaction：改用站内 wcPrompt，避免 WebView 禁用原生 prompt 导致「重命名」无反应 */
    wcPrompt("重命名分组", gs[i].name, "", function (v) {
      var name = String(v || "").trim();
      if (!name) { return; }
      var gs2 = voiceGroups();
      if (!gs2[i]) { return; }
      gs2[i].name = name;
      voiceSave();
      renderVoiceLib();
      wcToast("已重命名");
    });
  }
  function voiceDeleteGroupAt(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    var g = gs[i];
    wcConfirm("删除分组", "删除「" + g.name + "」及其全部 " + (g.items || []).length + " 条语音（音频一并删除），确定吗？", function () {
      var k, keys = [];
      for (k = 0; k < (g.items || []).length; k++) { if (g.items[k] && g.items[k].audioKey) { keys.push(g.items[k].audioKey); } }
      for (k = 0; k < (g.blocked || []).length; k++) { if (g.blocked[k] && g.blocked[k].audioKey) { keys.push(g.blocked[k].audioKey); } }
      gs.splice(i, 1);
      voiceSave();
      keys.forEach(function (mk) { soundDelete(mk); });
      renderVoiceLib();
      wcToast("已删除分组");
    });
  }

  /* 语音字卡库 · mp3 导入 */
  var voicePickerMode = "lib";    /* lib=库页导入建组 | group=导入当前组 */
  function voiceImportFiles() { voicePickerMode = "lib"; document.getElementById("voiceFilePicker").click(); }
  function voiceAddItem() { voicePickerMode = "group"; document.getElementById("voiceFilePicker").click(); }
  function voiceHandleFiles(files) {
    if (!files || !files.length) { return; }
    var g = null, i;
    if (voicePickerMode === "lib") {
      var gs = voiceGroups();
      for (i = 0; i < gs.length; i++) { if (gs[i].name === "导入的语音") { g = gs[i]; break; } }
      if (!g) { g = { name: "导入的语音", items: [], deleted: [], blocked: [] }; gs.push(g); }
    } else {
      var gg = voiceGroups()[voiceNav.group];
      if (!gg) { return; }
      g = gg;
    }
    var todo = Array.prototype.slice.call(files, 0);
    var done = 0, added = 0;
    function finish() {
      try {
        voiceSave();
        if (voicePickerMode === "lib") { renderVoiceLib(); } else { renderVoiceGroup(); }
        renderVoiceEntry();
      } catch (e) { /* 渲染异常不阻断 toast */ }
      try { wcToast("已导入 " + added + " 条语音"); } catch (e2) { /* ignore */ }
    }
    function step() {
      if (!todo.length) { finish(); return; }
      var f = todo.shift();
      /* 过滤：type 为空（移动端常见）时按扩展名判断 */
      if (!f || (f.type && f.type.indexOf("audio") < 0 && !/\.(mp3|m4a|wav|ogg|aac|flac|wma)$/i.test(f.name))) {
        done++; step(); return;
      }
      var audioKey = soundNewKey();
      var base = String(f.name || "").replace(/\.[^.]+$/, "") || "语音";
      /* v-DUR-FIX：先建条目再取时长 —— 旧逻辑在 FileReader.onload 里才创建 item，
         而 getAudioDuration 常先回调，此时 item 为 null，时长被丢弃 → 永久显示 0′00″ */
      var item = { id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: base, dur: 0, mime: f.type || "audio/mpeg", audioKey: audioKey };
      g.items.push(item);
      added++; done++;
      /* 时长写入：拿到正数立刻落盘 + 局部刷新，避免只改内存、重进页面又变回 0′00″ */
      var dataStr = "", decoding = false;
      function applyDur(raw) {
        var d = Math.round(Number(raw) || 0);
        if (!(d > 0) || !item || g.items.indexOf(item) < 0) { return false; }
        if (Math.round(Number(item.dur) || 0) === d) { return true; }
        item.dur = d;
        try { voiceSave(); } catch (e) { /* ignore */ }
        try { if (voicePickerMode === "lib") { renderVoiceLib(); } else { renderVoiceGroup(); } } catch (e2) { /* ignore */ }
        try { renderVoiceEntry(); } catch (e3) { /* ignore */ }
        return true;
      }
      /* 二级兜底：<audio> metadata 拿不到时（部分内核超时）改用数据 URL 解码实测 */
      function durFallback() {
        if (decoding || !dataStr || !item || Math.round(Number(item.dur) || 0) > 0) { return; }
        decoding = true;
        measureAudioDur(dataStr).then(function (d) {
          decoding = false;
          applyDur(d);
        })["catch"](function () { decoding = false; });
      }
      getAudioDuration(f).then(function (dur) {
        if (!applyDur(dur)) { durFallback(); }
      });
      var reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result === "string") {
          dataStr = reader.result;
          /* 音频写 IndexedDB 异步进行，不阻塞界面反馈；写成功则改用正式 key，失败保留内存缓存 key */
          soundSave(audioKey, reader.result).then(function (mk) {
            if (mk && item && g.items.indexOf(item) >= 0) { item.audioKey = mk; }
          });
          if (Math.round(Number(item.dur) || 0) <= 0) { durFallback(); }
        }
        step();
      };
      reader.onerror = function () {
        /* 读取失败：移除刚建的占位条目，避免留下永远 0 时长的空壳 */
        var ix = g.items.indexOf(item);
        if (ix >= 0) { g.items.splice(ix, 1); added--; }
        step();
      };
      try { reader.readAsDataURL(f); } catch (e) {
        var ix2 = g.items.indexOf(item);
        if (ix2 >= 0) { g.items.splice(ix2, 1); added--; }
        step();
      }
    }
    step();
  }
  function getAudioDuration(file) {
    return new Promise(function (resolve) {
      var url = null, settled = false;
      function ok(d) {
        if (settled) { return; }
        settled = true;
        if (url) { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }
        resolve(d);
      }
      try {
        url = URL.createObjectURL(file);
        var au = new Audio();
        au.preload = "metadata";
        au.onloadedmetadata = function () { ok(au.duration); };
        au.onerror = function () { ok(0); };
        /* 硬超时：部分移动内核（雨见/WebKit）对特殊编码 mp3 的 metadata 加载可能永久挂起 */
        setTimeout(function () { ok(0); }, 2500);
        au.src = url;
      } catch (e) { ok(0); }
    });
  }

  /* v-DUR-FIX：从音频数据 URL 量真实时长（两级兜底：<audio> metadata → AudioContext 解码） */
  var AUDIO_DUR_CACHE = {};
  function decodeAudioDur(src) {
    return new Promise(function (resolve) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC || !src || src.indexOf("data:") !== 0 || src.length > 12 * 1024 * 1024) { resolve(0); return; }
        var b64 = String(src).split(",")[1] || "";
        var bin = window.atob(b64), len = bin.length, buf = new Uint8Array(len), i;
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
        try {
          ctx.decodeAudioData(buf.buffer, function (ab) { fin(ab && ab.duration); }, function () { fin(0); });
        } catch (e) { fin(0); }
      } catch (e2) { resolve(0); }
    });
  }
  function measureAudioDur(src) {
    if (!src) { return Promise.resolve(0); }
    var ck = src.length + ":" + src.slice(0, 48) + ":" + src.slice(-48);
    if (AUDIO_DUR_CACHE[ck] > 0) { return Promise.resolve(AUDIO_DUR_CACHE[ck]); }
    return new Promise(function (resolve) {
      var settled = false, au = null;
      function fin(d) {
        if (settled) { return; }
        settled = true;
        d = Math.round(Number(d) || 0);
        if (au) { try { au.onloadedmetadata = null; au.onerror = null; au.pause(); au.removeAttribute("src"); } catch (e) { /* ignore */ } }
        if (isFinite(d) && d > 0) { AUDIO_DUR_CACHE[ck] = d; resolve(d); return; }
        decodeAudioDur(src).then(function (d2) {
          if (d2 > 0) { AUDIO_DUR_CACHE[ck] = d2; }
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
  /* 历史脏数据修复：库里 dur 缺失/为 0 的条目，按音频本体补算真实时长并落盘 */
  var VOICE_DUR_TRIED = {};
  var VOICE_DUR_FIXING = false;
  function voiceDurFixAll() {
    if (VOICE_DUR_FIXING) { return; }
    var gs = voiceGroups(), jobs = [], changed = false, k, j, it;
    for (k = 0; k < gs.length; k++) {
      var arr = (gs[k] && gs[k].items) || [];
      for (j = 0; j < arr.length; j++) {
        it = arr[j];
        if (!it || !it.audioKey) { continue; }
        if (Math.round(Number(it.dur) || 0) > 0) { continue; }
        if (VOICE_DUR_TRIED[it.audioKey]) { continue; }
        VOICE_DUR_TRIED[it.audioKey] = 1;
        (function (target, key) {
          jobs.push(soundGet(key).then(function (src) {
            return src ? measureAudioDur(src) : 0;
          }).then(function (d) {
            d = Math.round(Number(d) || 0);
            if (d > 0) { target.dur = d; changed = true; }
          }));
        })(it, it.audioKey);
      }
    }
    if (!jobs.length) { return; }
    VOICE_DUR_FIXING = true;
    Promise.all(jobs).then(function () {
      VOICE_DUR_FIXING = false;
      if (!changed) { return; }
      try { voiceSave(); } catch (e) { /* ignore */ }
      try {
        var body = document.getElementById("voiceGrpBody");
        if (body && body.querySelector(".voice-row")) { renderVoiceGroup(); }
      } catch (e2) { /* ignore */ }
      try {
        var list = document.getElementById("voiceGroups");
        if (list && list.querySelector(".discover-item")) { renderVoiceLib(); }
      } catch (e3) { /* ignore */ }
    })["catch"](function () { VOICE_DUR_FIXING = false; });
  }

  /* 语音字卡库 · 分组详情页 */
  function openVoiceGroup(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    voiceNav.group = i;
    voiceNav.sel = false;
    voiceNav.selPicks = [];
    switchPage("voice-lib-group");
    renderVoiceGroup();
  }
  function renderVoiceGroup() {
    voiceLoad();
    var gs = voiceGroups();
    if (!gs.length) { openVoiceLib(); return; }
    if (voiceNav.group < 0 || voiceNav.group >= gs.length) { voiceNav.group = 0; }
    var g = gs[voiceNav.group];
    var tEl = document.getElementById("voiceGrpTitle");
    if (tEl) { tEl.textContent = g.name; }
    var tools = document.getElementById("voiceGrpTools");
    if (tools) { tools.innerHTML = voiceGrpToolbarHtml(g); }
    var body = document.getElementById("voiceGrpBody");
    if (body) {
      try {
        body.innerHTML = voiceGrpBodyHtml(g);
      } catch (err) {
        /* 渲染异常兜底：不再滞留上一次的旧内容（如空态文案），给出明确提示 */
        body.innerHTML = '<p class="grp-empty">语音渲染出错（' + esc(String((err && err.message) || err)) + '），请重试或刷新</p>';
      }
    }
    var foot = document.getElementById("voiceGrpFoot");
    if (foot) {
      foot.textContent = voiceNav.sel
        ? "选择模式：点条目勾选/取消（可多选）· 可转移 / 批量删除或屏蔽 · 点「完成」退出"
        : "点语音播放 · 「×」删除 · 数据存在本机";
    }
    renderVoiceEntry();
    /* v-DUR-FIX：详情页进入时补算历史条目缺失的时长 */
    try { voiceDurFixAll(); } catch (e) { /* ignore */ }
  }
  function voiceGrpToolbarHtml(g) {
    var html = "";
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="添加语音（上传 mp3）" aria-label="添加语音" onclick="SnowCrystal.voiceAddItem()">' + WC_ICO_ADD + "</button>";
    var sel = !!voiceNav.sel;
    if (sel) {
      var picks = voiceNav.selPicks || [];
      html += '<button class="wc-tool is-ico" data-act="vselall" type="button" title="全选" aria-label="全选" onclick="SnowCrystal.voiceSelAll()">' + WC_ICO_ALL + "</button>";
      html += '<button class="wc-tool is-ico" data-act="move" type="button" title="转移已选 ' + picks.length + ' 条到其他分组" aria-label="转移已选到其他分组" onclick="SnowCrystal.voiceMovePicked()">' + WC_ICO_MOVE + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="del" type="button" title="删除已选 ' + picks.length + ' 条" aria-label="批量删除已选" onclick="SnowCrystal.voiceDeletePicked()">' + WC_ICO_TRASH + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="block" type="button" title="屏蔽已选 ' + picks.length + ' 条（聊天混入不再使用）" aria-label="屏蔽已选" onclick="SnowCrystal.voiceBlockPicked()">' + WC_ICO_BLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico' + (sel ? " is-on" : "") + '" type="button" title="' + (sel ? "完成：退出选择模式" : "选择：进入选择模式，勾选后可转移 / 批量删除或屏蔽") + '" aria-label="' + (sel ? "完成选择" : "选择模式") + '" onclick="SnowCrystal.voiceToggleSel()">' + WC_ICO_SELECT + "</button>";
    if (g.blocked && g.blocked.length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复已屏蔽 ' + g.blocked.length + ' 条" aria-label="恢复已屏蔽" onclick="SnowCrystal.voiceUnblockAll()">' + WC_ICO_UNBLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico" type="button" title="重命名分组" aria-label="重命名分组" onclick="SnowCrystal.voiceRenameGroupAt(' + voiceNav.group + ')">' + WC_ICO_PEN + "</button>";
    return html;
  }
  function voiceGrpBodyHtml(g) {
    var items = (g && g.items) || [];
    if (!items.length) { return '<p class="grp-empty">这一组还没有语音，点上方「＋」上传 mp3</p>'; }
    var sel = !!voiceNav.sel, picks = voiceNav.selPicks || [], html = '<div class="wc-list' + (sel ? " is-selecting" : "") + '" id="voiceGrpItems">', i, it;
    function pickCls(i) { return sel ? (picks.indexOf(i) >= 0 ? " is-selecting is-picked" : " is-selecting") : ""; }
    for (i = 0; i < items.length; i++) {
      it = items[i] || {};
      html += '<div class="wc-row voice-row' + pickCls(i) + '" role="button" tabindex="0" data-vidx="' + i + '">' +
                '<span class="voice-play-btn' + (sel ? " is-sel-mask" : "") + '" type="button" title="播放 / 停止" aria-label="播放">▶</span>' +
                '<span class="voice-row-main">' +
                  '<span class="wc-row-main">' + esc(it.name || "语音") + "</span>" +
                  '<span class="voice-row-sub">' + fmtVoiceDur(it.dur || 0) + (it.mime ? " · " + esc(it.mime.replace("audio/", "")) : "") + "</span>" +
                "</span>" +
                (sel ? "" : '<button class="wc-edit" type="button" data-vedit="1" title="编辑" aria-label="编辑">' + WC_ICO_PEN + "</button>" +
                '<button class="wc-del" type="button" data-vdel="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>") +
              "</div>";
    }
    return html + "</div>";
  }
  function voiceToggleSel() {
    voiceNav.sel = !voiceNav.sel;
    voiceNav.selPicks = [];
    renderVoiceGroup();
  }
  function voiceSelAll() {
    var g = voiceGroups()[voiceNav.group];
    var n = (g && g.items) ? g.items.length : 0;
    voiceNav.selPicks = [];
    for (var i = 0; i < n; i++) { voiceNav.selPicks.push(i); }
    renderVoiceGroup();
  }
  function voiceEditName(i) {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    /* v-FIX-interaction：改用站内 wcPrompt，避免 WebView 禁用原生 prompt 导致「编辑」无反应 */
    wcPrompt("重命名语音", g.items[i].name || "", "", function (v) {
      var g2 = voiceGroups()[voiceNav.group];
      if (!g2 || !g2.items[i]) { return; }
      var nm = String(v || "").trim();
      if (!nm) { return; }
      g2.items[i].name = nm;
      voiceSave();
      renderVoiceGroup();
      wcToast("已重命名");
    });
  }
  function voiceDeleteItem(i) {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    var it = g.items[i];
    wcConfirm("删除语音", "删除「" + (it.name || "语音") + "」？音频一并删除。", function () {
      g.items.splice(i, 1);
      voiceSave();
      if (it.audioKey) { soundDelete(it.audioKey); }
      renderVoiceGroup();
      wcToast("已删除");
    });
  }
  function voiceDeletePicked() {
    var g = voiceGroups()[voiceNav.group];
    var picks = (voiceNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !picks.length) { return; }
    wcConfirm("删除语音", "删除已选 " + picks.length + " 条语音？音频一并删除。", function () {
      var k;
      for (k = 0; k < picks.length; k++) {
        var it = g.items[picks[k]];
        if (it && it.audioKey) { soundDelete(it.audioKey); }
      }
      for (k = 0; k < picks.length; k++) { g.items.splice(picks[k], 1); }
      voiceNav.selPicks = [];
      voiceSave();
      renderVoiceGroup();
      wcToast("已删除 " + picks.length + " 条");
    });
  }
  function voiceBlockPicked() {
    var g = voiceGroups()[voiceNav.group];
    var picks = (voiceNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !picks.length) { return; }
    var k, arr = [];
    for (k = 0; k < picks.length; k++) {
      var it = g.items[picks[k]];
      if (it) { arr.push(it); }
    }
    for (k = 0; k < picks.length; k++) { g.items.splice(picks[k], 1); }
    g.blocked = g.blocked || [];
    Array.prototype.push.apply(g.blocked, arr);
    voiceNav.selPicks = [];
    voiceSave();
    renderVoiceGroup();
    wcToast("已屏蔽 " + arr.length + " 条");
  }
  function voiceUnblockAll() {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !(g.blocked && g.blocked.length)) { return; }
    var n = g.blocked.length;
    g.items = (g.items || []).concat(g.blocked);
    g.blocked = [];
    voiceSave();
    renderVoiceGroup();
    wcToast("已恢复 " + n + " 条");
  }
  function voiceMovePicked() {
    var gs = voiceGroups();
    var picks = (voiceNav.selPicks || []).slice();
    var cur = voiceNav.group;
    if (!picks.length) { return; }
    var items = [], i;
    for (i = 0; i < picks.length; i++) { if (gs[cur] && gs[cur].items[picks[i]]) { items.push(gs[cur].items[picks[i]]); } }
    if (!items.length) { return; }
    var targets = [];
    for (i = 0; i < gs.length; i++) {
      if (i !== cur) { targets.push({ lib: "voice", gi: i, label: gs[i].name, n: (gs[i].items || []).length }); }
    }
    if (!targets.length) { wcToast("没有其他分组可转移"); return; }
    wcGroupPick("转移到…", "选择目标分组，将已选 " + items.length + " 条语音转移过去", targets, function (res) {
      var gi = res.gi;
      if (gi == null || gi === cur || gi < 0 || gi >= gs.length) { return; }
      picks.slice().sort(function (a, b) { return b - a; }).forEach(function (idx) {
        gs[cur].items.splice(idx, 1);
      });
      Array.prototype.push.apply(gs[gi].items, items);
      voiceNav.selPicks = [];
      voiceSave();
      renderVoiceGroup();
      wcToast("已转移 " + items.length + " 条");
    });
  }
  function voicePlayItem(i, btnEl) {
    if (voiceNav.sel) { return; }
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    var it = g.items[i];
    if (voiceAudio && voiceAudioBtn === btnEl) { voiceStopPlay(); return; }
    soundGet(it.audioKey).then(function (dataUrl) {
      if (dataUrl) { voicePlaySrc(dataUrl, it.dur, btnEl, null); }
      else { wcToast("音频缺失，无法播放"); }
    });
  }
  function voiceDoSearch(q) {
    q = String(q || "").trim().toLowerCase();
    var wrap = document.getElementById("voiceSearchWrap");
    var res = document.getElementById("voiceSearchResults");
    var list = document.getElementById("voiceGroups");
    if (!wrap || !res || !list) { return; }
    if (!q) {
      res.hidden = true; res.innerHTML = "";
      list.hidden = false;
      return;
    }
    list.hidden = true;
    res.hidden = false;
    var gs = voiceGroups(), html = "", hit = 0, gi, j;
    for (gi = 0; gi < gs.length; gi++) {
      var g = gs[gi], gHit = false;
      if (String(g.name || "").toLowerCase().indexOf(q) >= 0) { gHit = true; hit++; }
      var its = (g.items || []).filter(function (it) { return String((it && it.name) || "").toLowerCase().indexOf(q) >= 0; });
      if (its.length) {
        gHit = true;
        for (j = 0; j < its.length; j++) {
          hit++;
          html += '<div class="group-item-wrapper"><div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + gi + ')">' +
                    '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                    '<span class="discover-info"><span class="discover-title lib-row-name">' + esc(g.name) + " / " + esc(its[j].name) + '</span><span class="discover-desc">' + fmtVoiceDur(its[j].dur || 0) + " · 点进播放</span></span>" +
                    '<span class="discover-arrow">›</span></div></div>';
        }
      }
      if (gHit && !its.length) {
        html += '<div class="group-item-wrapper"><div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + gi + ')">' +
                  '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                  '<span class="discover-info"><span class="discover-title lib-row-name">' + esc(g.name) + '</span><span class="discover-desc">' + (g.items || []).length + " 条 · 点进查看</span></span>" +
                  '<span class="discover-arrow">›</span></div></div>';
      }
    }
    res.innerHTML = hit ? html : '<p class="grp-empty">没有找到「' + esc(q) + '」相关语音</p>';
  }
  function voiceToggleSearch() {
    var wrap = document.getElementById("voiceSearchWrap");
    var inp = document.getElementById("voiceSearchInput");
    var list = document.getElementById("voiceGroups");
    var res = document.getElementById("voiceSearchResults");
    if (!wrap || !inp) { return; }
    var open = !wrap.hidden;
    wrap.hidden = !open;
    if (!open) { inp.focus(); } else { inp.value = ""; voiceDoSearch(""); }
    if (list) { list.hidden = false; }
    if (res) { res.hidden = true; res.innerHTML = ""; }
  }
  function voiceClearSearch() {
    var inp = document.getElementById("voiceSearchInput");
    if (inp) { inp.value = ""; }
    voiceDoSearch("");
  }

  
