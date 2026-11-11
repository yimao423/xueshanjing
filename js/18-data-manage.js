/* 雪山晶 · 18-data-manage ｜ 源：雪山晶.html L9840-L10161 ｜ JS 模块 */
;/* 字卡库与数据管理 */
"use strict";
  /* 入口页 5 项：格言 / 字卡库 / 颜文字表情 / 表情包库 / 拍一拍（「行踪」已删除） */
  /* 本机数据全部落在 localStorage 的 snowcrystal.* 键上，本页只读写这些键 */
  /* 本机所有属于雪晶的键前缀：含历史命名 snow_crystal_*（背景 / 波浪装饰等外观数据） */
  var DM_PREFIXES = ["snowcrystal.", "snow_crystal_", "snowcrystal_"];
  function dmOwnKey(k) {
    var i;
    if (!k) { return false; }
    for (i = 0; i < DM_PREFIXES.length; i++) { if (k.indexOf(DM_PREFIXES[i]) === 0) { return true; } }
    return false;
  }
  function dmKeys() {
    var out = [], i, k, seen = {};
    try {
      for (i = 0; i < window.localStorage.length; i++) {
        k = window.localStorage.key(i);
        if (dmOwnKey(k) && !seen[k]) { seen[k] = 1; out.push(k); }
      }
    } catch (e) { /* 隐私模式下读不到就按空处理 */ }
    /* 只存在 IndexedDB 里的键（云笺信件 / 梦境等大容量数据）同样纳入统计、导出与清空 */
    try {
      var mk = (window.XJ_STORE && window.XJ_STORE.memKeys) ? window.XJ_STORE.memKeys() : [], j;
      for (j = 0; j < mk.length; j++) {
        k = mk[j];
        if (dmOwnKey(k) && !seen[k]) { seen[k] = 1; out.push(k); }
      }
    } catch (e2) { /* 忽略 */ }
    return out;
  }
  function dmFmt(n) {
    n = Number(n) || 0;
    if (n < 1024) { return n + " B"; }
    if (n < 1024 * 1024) { return (n / 1024).toFixed(1) + " KB"; }
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }
  function dmCounts() {
    var ks = dmKeys(), i, k, v = "", bytes = 0, images = 0, settings = 0, groups = 0, items = 0, j, kk;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      v = "";
      try { v = String(window.localStorage.getItem(k) || ""); } catch (e) { v = ""; }
      /* 只在 IDB 里的大容量数据按真实 UTF-8 体积统计（localStorage 键沿用 UTF-16 估算口径） */
      var lsRaw = null;
      try { lsRaw = (window.XJ_STORE && window.XJ_STORE.lsGetOnly) ? window.XJ_STORE.lsGetOnly(k) : null; } catch (e2) { lsRaw = null; }
      if (lsRaw == null && v) {
        var u8 = v.length;
        try { u8 = new Blob([v]).size; } catch (e3) { u8 = v.length; }
        bytes += k.length * 2 + u8;
      } else {
        bytes += (k.length + v.length) * 2;
      }
      if (k.indexOf(IMG_STORE) === 0) { images++; }
      else if (k !== WCL_KEY && k !== WC_OLD_KEY) { settings++; }
    }
    for (kk in wcl) {
      if (!Object.prototype.hasOwnProperty.call(wcl, kk)) { continue; }
      groups += (wcl[kk] || []).length;
      for (j = 0; j < (wcl[kk] || []).length; j++) { items += ((wcl[kk][j].items || []).length); }
    }
    return { keys: ks.length, bytes: bytes, images: images, settings: settings, groups: groups, items: items };
  }
  var DM_ICO = {
    group: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2"/><path d="M7 9.4h10M7 12.8h10M7 16.2h6"/></svg>',
    item: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.6" y="3.8" width="14.8" height="16.4" rx="2.2"/><path d="M8.4 7.8h7.2M8.4 11.4h7.2M8.4 15h4.6"/></svg>',
    img: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2"/><circle cx="8.8" cy="9.6" r="1.6"/><path d="M5.2 16.8l4.4-4.6 2.9 3.1 2.4-2.7 4 4.2"/></svg>'
  };
  function renderDataManage() {
    loadWcl();
    var c = dmCounts();
    var host = document.getElementById("dmStats");
    if (host) {
      var pct = Math.min(100, Math.max(2, Math.round(c.bytes / ((window.XJ_CAP ? XJ_CAP.storeMB() : 5) * 1024 * 1024) * 100)));
      host.innerHTML =
        '<div class="dm-stats-grid">' +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.group + "</span>" +
            '<b class="dm-stat-val">' + c.groups + "</b>" +
            '<span class="dm-stat-key">字卡分组</span>' +
          "</div>" +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.item + "</span>" +
            '<b class="dm-stat-val">' + c.items + "</b>" +
            '<span class="dm-stat-key">字卡条目</span>' +
          "</div>" +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.img + "</span>" +
            '<b class="dm-stat-val">' + c.images + "</b>" +
            '<span class="dm-stat-key">本地图片</span>' +
          "</div>" +
        "</div>" +
        '<div class="dm-total">本机占用 ' + dmFmt(c.bytes) + " · 存储项 " + c.keys + " 个 · 设置项 " + c.settings + " 个</div>" +
        '<div class="dm-progress"><i style="width:' + pct + '%"></i></div>';
    }
    var foot = document.getElementById("dmFoot");
    if (foot) { foot.textContent = "仅统计本机浏览器内的数据 · 当前占用 " + dmFmt(c.bytes); }
  }
  function openDataManage() {
    switchPage("data-manage");
    renderDataManage();
    bindDataManage();
  }
  /* 导出：把全部本机数据打包成一个 JSON */
  function dmExport() {
    var data = { app: "雪晶·字卡", type: "snowcrystal-backup", version: "v60",
                 exportedAt: new Date().toISOString(), keys: {} };
    var ks = dmKeys(), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      try { data.keys[k] = window.localStorage.getItem(k); } catch (e) { /* 忽略 */ }
    }
    mediaResolveAll().then(function (map) {
      if (map && Object.keys(map).length && data.keys[WCL_KEY]) {
        try {
          var w = JSON.parse(data.keys[WCL_KEY]);
          if (w && typeof w === "object") { stickerFillBase64(w, map); data.keys[WCL_KEY] = JSON.stringify(w); }
        } catch (e) { /* 保持原样 */ }
      }
      /* 云笺正文按需存在 IDB、不进内存镜像：备份时单独按前缀打包，避免只备份到索引 */
      if (window.XJ_STORE && window.XJ_STORE.idbDump) {
        return window.XJ_STORE.idbDump("snowcrystal.letter.v3.body.");
      }
      return null;
    }).then(function (idbMap) {
      if (idbMap && typeof idbMap === "object" && Object.keys(idbMap).length) { data.idb = idbMap; }
      var d = new Date();
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      var name = "雪晶-数据备份-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      tip("已导出本机全部数据 · " + name);
    });
  }
  /* 字卡数据合并（同名分组并入，其余保持本机不动） */
  function dmMergeWcl(jsonStr) {
    var inc = null, k, i, j, g, added = 0;
    try { inc = JSON.parse(String(jsonStr)); } catch (e) { inc = null; }
    if (!inc || typeof inc !== "object") { return 0; }
    for (k in inc) {
      if (!Object.prototype.hasOwnProperty.call(inc, k)) { continue; }
      if (!wcl[k]) { wcl[k] = []; }
      for (i = 0; i < (inc[k] || []).length; i++) {
        if (k === "pat") {
          g = null;
          for (j = 0; j < wcl[k].length; j++) { if (wcl[k][j].name === "对方拍一拍库") { g = wcl[k][j]; } }
          if (!g) { g = { name: "对方拍一拍库", items: [] }; wcl[k].push(g); }
          g.items = g.items.concat(inc[k][i].items || []);
          added += (inc[k][i].items || []).length;
          continue;
        }
        g = null;
        for (j = 0; j < wcl[k].length; j++) { if (wcl[k][j].name === inc[k][i].name) { g = wcl[k][j]; } }
        if (!g) { g = { name: String(inc[k][i].name || "导入分组"), items: [] }; wcl[k].push(g); }
        g.items = g.items.concat(inc[k][i].items || []);
        added += (inc[k][i].items || []).length;
      }
    }
    if (added) { saveWcl(); }
    return added;
  }
  function dmApplyBackup(text) {
    var data = null, ks, i, k, cur, next, applied = 0, kept = 0, cardAdded = 0, third = 0;
    try { data = JSON.parse(String(text)); } catch (e) { data = null; }
    if (!data || typeof data !== "object") { wcToast("这个文件读不出备份内容"); return; }

/* 没有 keys 字段 —— 不是雪晶备份，按「字卡 JSON」通用导入处理（ */
    if (!data.keys) {
      var parsed = wcParseImport(String(text), wclNav.lib || "quote");
      var added = 0, kk, gg, i2, j2;
      for (kk in parsed.byLib) {
        if (!Object.prototype.hasOwnProperty.call(parsed.byLib, kk)) { continue; }
        if (!wcl[kk]) { wcl[kk] = []; }
        for (i2 = 0; i2 < parsed.byLib[kk].length; i2++) {
          if (kk === "pat") {
            gg = null;
            for (j2 = 0; j2 < wcl[kk].length; j2++) { if (wcl[kk][j2].name === "对方拍一拍库") { gg = wcl[kk][j2]; } }
            if (!gg) { gg = { name: "对方拍一拍库", items: [] }; wcl[kk].push(gg); }
            gg.items = gg.items.concat(parsed.byLib[kk][i2].items || []);
            added += (parsed.byLib[kk][i2].items || []).length;
            continue;
          }
          gg = null;
          for (j2 = 0; j2 < wcl[kk].length; j2++) { if (wcl[kk][j2].name === parsed.byLib[kk][i2].name) { gg = wcl[kk][j2]; } }
          if (!gg) { gg = { name: String(parsed.byLib[kk][i2].name || "导入分组"), items: [] }; wcl[kk].push(gg); }
          gg.items = gg.items.concat(parsed.byLib[kk][i2].items || []);
          added += (parsed.byLib[kk][i2].items || []).length;
        }
      }
      if (added) { saveWcl(); loadWcl(); renderWclEntry(); }
      mediaMigrateAll().then(function () {
        wcToast(added ? ("已按字卡格式导入 " + added + " 条") : "文件里没有可导入的内容");
      });
      return;
    }

    ks = [];
    for (k in data.keys) { if (Object.prototype.hasOwnProperty.call(data.keys, k)) { ks.push(k); } }
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      if (!dmOwnKey(k)) { continue; }   /* 只认本应用自己的键，避免污染别处 */
      next = data.keys[k];
      cur = null;
      try { cur = window.localStorage.getItem(k); } catch (e) { cur = null; }
      if (k === WCL_KEY) {
        cardAdded += dmMergeWcl(next);
        applied++;
        continue;
      }
      if (!cur) {
        try { window.localStorage.setItem(k, next); applied++; } catch (e) { /* 忽略 */ }
      } else if (cur === next) {
        kept++;
      } else {
        kept++;   /* 本机已有 —— 保留本机，不覆盖 */
      }
    }
    /* 云笺正文还原：直接写回 IDB（不进内存镜像），刷新后按需读取 */
    if (data.idb && typeof data.idb === "object" && window.XJ_STORE && window.XJ_STORE.idbSet) {
      for (k in data.idb) {
        if (Object.prototype.hasOwnProperty.call(data.idb, k)) {
          try { window.XJ_STORE.idbSet(k, data.idb[k]); } catch (e) { /* 单条失败不影响整体 */ }
        }
      }
    }
    tip("已恢复 " + applied + " 项 · 保留本机 " + kept + " 项" + (cardAdded ? (" · 字卡新增 " + cardAdded + " 条") : ""));
    mediaMigrateAll().then(function () {
      window.setTimeout(function () { try { window.location.reload(); } catch (e) { /* 忽略 */ } }, 600);
    });
  }
  function dmImportFile() {
    var inp = document.getElementById("dmImport");
    if (inp) { inp.click(); }
  }
  function bindDataManage() {
    var inp = document.getElementById("dmImport");
    if (inp && inp.getAttribute("data-bound") !== "1") {
      inp.setAttribute("data-bound", "1");
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          if (typeof reader.result === "string") { dmApplyBackup(reader.result); }
          inp.value = "";
        };
        reader.readAsText(f);
      });
    }
  }
  /* ---------- 清理 ---------- */
  function dmClearCards() {
    wcConfirm("清空全部字卡数据", "会删除本机所有字卡分组与条目（外观与图片不受影响），确定吗？", function () {
      /* [V34] 存储层默认拒绝「空数据覆盖非空」，用户显式清空必须先申明，否则点了没反应 */
try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell(WCL_KEY, 15000); window.XJ_STORE.noticeShell(WC_OLD_KEY, 15000); window.XJ_STORE.noticeShell(VOICE_KEY, 15000); } } catch (eNS) { /* 忽略 */ }
      try {
        window.localStorage.removeItem(WCL_KEY);
        window.localStorage.removeItem(WC_OLD_KEY);
        if (window.XJ_STORE && window.XJ_STORE.remove) { window.XJ_STORE.remove(WCL_KEY); window.XJ_STORE.remove(WC_OLD_KEY); }
      } catch (e) { /* 忽略 */ }
      wcl = null;   /* v-FIX：清空后必须失效内存缓存，否则仍旧显示清空前的数量 */
      mediaDeleteAll();
      try { window.localStorage.removeItem(VOICE_KEY); } catch (e) { /* 忽略 */ }
      voiceData = null;
      soundDeleteAll();
      loadWcl();
      renderWclEntry();
      renderDataManage();
      tip("字卡数据已清空");
    });
  }
  function dmClearImages() {
    wcConfirm("清空全部上传图片", "本机上传的头像 / 相框 / 相册 / 海报 / 组件背景图都会被删除，确定吗？", function () {
      var ks = dmKeys(), i, k, els, el;
      for (i = 0; i < ks.length; i++) {
        k = ks[i];
        if (k.indexOf(IMG_STORE) === 0) { try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell(k, 15000); } } catch (eNS) { /* 忽略 */ } try { window.localStorage.removeItem(k); } catch (e) { /* 忽略 */ } }
      }
      els = document.querySelectorAll("[data-slot]");
      for (i = 0; i < els.length; i++) {
        el = els[i];
        el.style.backgroundImage = "";
        el.classList.remove("has-photo");
      }
      if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
      if (window.__syncFrameClones) { window.__syncFrameClones(); }
      anPaint();
      wxPaint();
      tkPaint();
      renderDataManage();
      tip("本机上传的图片已全部清空");
    });
  }
  function dmResetAll() {
    wcConfirm("恢复出厂设置", "会删除本机全部雪晶数据（外观 / 字卡 / 图片 / 记忆 / 语音），并刷新页面，确定吗？", function () {
      var ks = dmKeys(), i;
      for (i = 0; i < ks.length; i++) {
        try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell(ks[i], 20000); } } catch (eNS) { /* 忽略 */ }
        try { window.localStorage.removeItem(ks[i]); } catch (e) { /* 忽略 */ }
      }
      /* 保险副本一并作废，否则刷新后会被自愈逻辑恢复回来 */
      try {
        if (window.XJ_STORE && window.XJ_STORE.idbPurge) { window.XJ_STORE.idbPurge("__xj_vault."); }
        if (window.XJ_STORE && window.XJ_STORE.idbPurge) { window.XJ_STORE.idbPurge("snowcrystal."); }
      } catch (eVS) { /* 忽略 */ }
      /* 云笺正文只存在 IDB、不在 dmKeys 里，按前缀一并清掉，不留孤儿数据 */
      try {
        if (window.XJ_STORE && window.XJ_STORE.idbPurge) { window.XJ_STORE.idbPurge("snowcrystal.letter."); }
      } catch (e) { /* 忽略 */ }
      mediaDeleteAll();
      soundDeleteAll();
      try { window.location.reload(); } catch (e) { /* 忽略 */ }
    });
  }

  
