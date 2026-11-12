/* 雪山晶 · 23-wordcard-lib ｜ 源：雪山晶.html L11502-L12597 ｜ JS 模块 */
/* 聊天混入兜底：音频缺失时发一条基础字卡 */

  /* 分组列表页（菜单栏 + 分组） */
  /* 菜单栏只留图标（title/aria-label 提供文字提示） */
  var WC_ICO_ADD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.4v13.2M5.4 12h13.2"/></svg>';
  var WC_ICO_IMPORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6v10.2M8.2 10.4 12 14.2l3.8-3.8M4.8 17.4v1.8a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-1.8"/></svg>';
  var WC_ICO_EXPORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.4V4.2M8.2 7.8 12 4l3.8 3.8M4.8 17.4v1.8a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-1.8"/></svg>';
  var WC_ICO_DEDUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4.6 7.2h14.8M4.6 12h14.8M4.6 16.8h9.2"/></svg>';
  var WC_ICO_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.2"/><path d="M15.6 15.6 20 20"/></svg>';
  var WC_ICO_CLEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4"/></svg>';
  var WC_ICO_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 19.4h3.2L18.4 8.8a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.6 16.2v3.2z"/><path d="M13.8 7.2 16.8 10.2"/></svg>';
  var WC_ICO_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 7.4h13.2M9.2 7.4V5.6h5.6v1.8M7 7.4l.8 11.2a1.4 1.4 0 0 0 1.4 1.3h5.6a1.4 1.4 0 0 0 1.4-1.3L17 7.4"/></svg>';
  /* 分组条目用到的槽位图标（与菜单栏图标不冲突） */
  var WC_ICO_GRP_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 6.6a1.6 1.6 0 0 1 1.6-1.6h3.2l1.6 2h6.8a1.6 1.6 0 0 1 1.6 1.6v7.2a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6z"/></svg>';
  var WC_ICO_SELECT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="m8.2 12 2.6 2.6 5-5"/></svg>';
  var WC_ICO_RESTORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.6 8.4a8.2 8.2 0 1 1 1.6 8.9"/><path d="M5.6 3.8v4.8h4.8"/></svg>';
  var WC_ICO_URL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14.2 14.2 10"/><path d="M8.4 12.4l-2.1 2.1a3.2 3.2 0 0 0 4.5 4.5l2.1-2.1"/><path d="M15.6 11.6l2.1-2.1a3.2 3.2 0 0 0-4.5-4.5l-2.1 2.1"/></svg>';
  var WC_ICO_BLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.8 4.8l14.4 14.4"/><path d="M10.6 6.2A10 10 0 0 1 12 6c4.9 0 8.4 4.2 10 6-.7 1-1.6 2.1-2.7 3"/><path d="M6.7 8.5A12 12 0 0 0 2 12c1.6 1.8 5.1 6 10 6 1.2 0 2.3-.2 3.4-.5"/><path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/></svg>';
  var WC_ICO_UNBLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/></svg>';
  var WC_ICO_MOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 12h13.2"/><path d="M14.6 8.2 18.4 12l-3.8 3.8"/><path d="M9 5.4 5.4 9l3.6 3.6"/></svg>';
  var WC_ICO_VOICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9.2" y="4" width="5.6" height="9.6" rx="2.8"/><path d="M6.6 11.2a5.4 5.4 0 0 0 10.8 0"/><path d="M12 16.6v3.4"/></svg>';
  var WC_ICO_ALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="2"/><path d="m8.8 12 2.4 2.4 4-4"/></svg>';

/* ---------- 通用 JSON 导入（ ---------- */
  var WC_IMPORT_FIELDS = [
    { field: "quotes", lib: "quote", name: "导入 · 文案" },
    { field: "dailyQuotes", lib: "quote", name: "导入 · 每日文案" },
    { field: "texts", lib: "quote", name: "导入 · 文案" },
    { field: "cards", lib: "main", name: "导入 · 字卡" },
    { field: "kaomojis", lib: "kao", name: "导入 · 颜文字" },
    { field: "kaomoji", lib: "kao", name: "导入 · 颜文字" },
    { field: "emojis", lib: "emoji", name: "导入 · Emoji" },
    { field: "emoticons", lib: "emoji", name: "导入 · Emoji" },
    { field: "pats", lib: "pat", name: "导入 · 拍一拍" },
    { field: "stickers", lib: "sticker", name: "导入 · 表情包" }
  ];
 /* 等第三方备份里的 type 字段 → 本应用字卡库 */
  var WC_TYPE_LIB = { quotes: "quote", quote: "quote", texts: "quote", dailyquotes: "quote",
    cards: "main", card: "main",
    kaomojis: "kao", kaomoji: "kao", emojis: "emoji", emoji: "emoji", emoticons: "emoji",
    stickers: "sticker", sticker: "sticker", pats: "pat", pat: "pat" };
  function wcPickText(it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return it; }
    if (typeof it === "number") { return String(it); }
    if (typeof it === "object") {
      var keys = ["text", "content", "quote", "t", "title", "name", "value", "message", "reply", "word", "str", "label"], i, v;
      for (i = 0; i < keys.length; i++) {
        v = it[keys[i]];
        if (v !== undefined && v !== null && String(v) !== "" && typeof v !== "object") { return String(v); }
      }
    }
    return "";
  }
  function normStickerItem(it) {
    if (it == null) { return null; }
    if (typeof it === "string") {
      var s = String(it).replace(/^\s+|\s+$/g, "");
      if (!s) { return null; }
      if (/^(data:image\/|https?:\/\/|\/\/)/i.test(s)) { return { k: "🖼", t: "表情包", img: s.replace(/^\/\//, "https://") }; }
      if (isMediaKey(s)) { return { k: "🖼", t: "表情包", img: s }; }
      return { k: "📄", t: s };
    }
    if (typeof it === "object") {
      var img = it.img || it.url || it.src || it.data || it.base64 || null;
      if (img && (/^(data:image\/|https?:\/\/|\/\/)/i.test(String(img)) || isMediaKey(String(img)))) { return { k: it.k || "🖼", t: it.t || it.name || it.title || "表情包", img: String(img).replace(/^\/\//, "https://") }; }
      return { k: it.k || "📄", t: it.t || it.name || it.title || String(it.text || it.content || "") || "表情包" };
    }
    return null;
  }
  function wcNormItems(lib, arr) {
    var out = [], i, txt;
    for (i = 0; i < (arr || []).length; i++) {
      if (lib === "sticker") { if (arr[i]) { out.push(arr[i]); } continue; }
      txt = wcPickText(arr[i]);
      if (String(txt).replace(/^\s+|\s+$/g, "") !== "") { out.push(String(txt)); }
    }
    return out;
  }
  function wcParseImport(text, curLib) {
    var data = null, byLib = {}, prim, i, k, gi, gs, keys;
    prim = (curLib && LIB_META[curLib]) ? curLib : "quote";
    try { data = JSON.parse(String(text)); } catch (e) { data = null; }
    if (data === null || data === undefined) { return { lib: prim, groups: [], byLib: {} }; }

    function push(lib, name, items) {
      if (!LIB_META[lib]) { lib = prim; }
      items = wcNormItems(lib, items);
      if (!items.length) { return; }
      if (lib === "sticker") {
        var _ni2 = [], _nj2, _nit;
        for (_nj2 = 0; _nj2 < items.length; _nj2++) {
          _nit = normStickerItem(items[_nj2]);
          if (_nit) { _ni2.push(_nit); }
        }
        items = _ni2;
        if (!items.length) { return; }
      }
      if (!byLib[lib]) { byLib[lib] = []; }
      byLib[lib].push({ name: String(name || ("导入 · " + ((LIB_META[lib] && LIB_META[lib].title) || "内容"))), items: items });
    }
    function pickArr(v) {
      var r = [], kk;
      if (Array.isArray(v)) { return v; }
      if (v && typeof v === "object") {
        for (kk in v) {
          if (!Object.prototype.hasOwnProperty.call(v, kk)) { continue; }
          r = r.concat(Array.isArray(v[kk]) ? v[kk] : [v[kk]]);
        }
        return r;
      }
      if (typeof v === "string" && v !== "") { return [v]; }
      return [];
    }

    /* ① 雪晶原生：{ lib, groups: [ {name, items} ] }（也吃 {groups:{名: ite */
    if (data.groups) {
      gs = data.groups;
      var sl = (data.lib && LIB_META[data.lib]) ? data.lib : (WC_TYPE_LIB[String(data.type || "").toLowerCase()] || prim);
      if (Array.isArray(gs)) {
        for (gi = 0; gi < gs.length; gi++) { push(sl, gs[gi] && gs[gi].name, (gs[gi] && gs[gi].items) || []); }
      } else if (typeof gs === "object") {
        for (k in gs) { if (Object.prototype.hasOwnProperty.call(gs, k)) { push(sl, k, pickArr(gs[k])); } }
      }
    }
    /* ② 单分组：{ name, items } */
    if (data.items && !data.groups) { push(prim, data.name, pickArr(data.items)); }
    /* ③ 纯数组 */
    if (Array.isArray(data)) { push(prim, "导入内容", data); }
 /* ④ 等常见字段名 */
    for (i = 0; i < WC_IMPORT_FIELDS.length; i++) {
      k = WC_IMPORT_FIELDS[i].field;
      if (data[k] === undefined || data[k] === null) { continue; }
      if (k === "cards" && data.groups) { continue; }
      push(WC_IMPORT_FIELDS[i].lib, WC_IMPORT_FIELDS[i].name, pickArr(data[k]));
    }
    /* ⑤ 关键词回复字典：{ 关键词: [回复…] } */
    var cr = data.customReplies || null;
    if (cr && typeof cr === "object" && !Array.isArray(cr)) {
      for (k in cr) { if (Object.prototype.hasOwnProperty.call(cr, k)) { push("main", k, pickArr(cr[k])); } }
    }
    var crPat = data.replies || data.patReplies || null;
    if (crPat && typeof crPat === "object" && !Array.isArray(crPat)) {
      for (k in crPat) { if (Object.prototype.hasOwnProperty.call(crPat, k)) { push("pat", k, pickArr(crPat[k])); } }
    }
    /* ⑥ mochi 等导出：{ data: {...} } / { data: [...] } */
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data)) { push(prim, "导入内容", data.data); }
      else {
        keys = [];
        for (k in data.data) { if (Object.prototype.hasOwnProperty.call(data.data, k)) { keys.push(k); } }
        for (i = 0; i < keys.length; i++) { push(prim, keys[i], pickArr(data.data[keys[i]])); }
      }
    }
    /* ⑦ mochi 等分组字典：{kaomoji:[[组名,[条目…]],…], emoji:[[…]], poke:[[… */
    var pairKeys = [["kaomoji", "kao"], ["kaomojis", "kao"], ["emoji", "emoji"], ["emojis", "emoji"],
                    ["poke", "pat"], ["pats", "pat"]];
    var pi, pv, gn;
    for (pi = 0; pi < pairKeys.length; pi++) {
      pv = data[pairKeys[pi][0]];
      if (!Array.isArray(pv) || !pv.length || !Array.isArray(pv[0])) { continue; }
      for (gi = 0; gi < pv.length; gi++) {
        if (!Array.isArray(pv[gi])) { continue; }
        gn = (typeof pv[gi][0] === "string" && String(pv[gi][0]).replace(/^\s+|\s+$/g, "")) ? String(pv[gi][0]) : "未分类";
        push(pairKeys[pi][1], gn, Array.isArray(pv[gi][1]) ? pv[gi][1] : [pv[gi][1]]);
      }
    }
    /* ⑧ 字卡分组结构：[{name, items|texts:[{text}]}]；数组形式的 customReplies */
    var crg = data.customReplyGroups || (Array.isArray(data.customReplies) ? data.customReplies : null);
    if (Array.isArray(crg)) {
      for (gi = 0; gi < crg.length; gi++) {
        var cit = crg[gi], cin = null;
        if (!cit || typeof cit !== "object") {
          if (typeof cit === "string" && cit.replace(/^\s+|\s+$/g, "") !== "") { push("main", "导入 · 字卡", [cit]); }
          continue;
        }
        cin = cit.items || cit.texts || cit.replies || cit.list || null;
        if (Array.isArray(cin)) { push("main", cit.name, cin); }
        else { push("main", cit.name || "导入 · 字卡", [cit]); }
      }
    }
    /* ⑨ v61：常见第三方字卡备份的「库字段」 */
    var WC_LIB_FIELDS = [
      ["kaomojiLibrary", "kao"], ["kaomojiGroups", "kao"], ["kaomojisLibrary", "kao"],
      ["emojiLibrary", "emoji"], ["emojisLibrary", "emoji"], ["customEmojis", "emoji"], ["customEmojiGroups", "emoji"],
      ["customPokes", "pat"], ["customPokeGroups", "pat"], ["pokeLibrary", "pat"],
      ["customMottos", "quote"], ["customMottosGroups", "quote"], ["mottoLibrary", "quote"],
      ["customIntros", "quote"], ["customIntrosGroups", "quote"], ["introLibrary", "quote"],
      ["moyuActivities", "quote"], ["moyuActivityGroups", "quote"],
      ["wordCards", "main"], ["wordCardGroups", "main"], ["cardGroups", "main"],
      ["customCards", "main"], ["customCardGroups", "main"], ["cardLibrary", "main"]
    ];
    var lfi, lfkey, lflib, lfv, lfkk;
    for (lfi = 0; lfi < WC_LIB_FIELDS.length; lfi++) {
      lfkey = WC_LIB_FIELDS[lfi][0];
      lflib = WC_LIB_FIELDS[lfi][1];
      lfv = data[lfkey];
      if (lfv === undefined || lfv === null) { continue; }
      if (Array.isArray(lfv)) {
        for (gi = 0; gi < lfv.length; gi++) {
          var lfe = lfv[gi];
          if (lfe && typeof lfe === "object" && !Array.isArray(lfe) && (lfe.items || lfe.list || lfe.texts || lfe.replies)) {
            push(lflib, lfe.name, lfe.items || lfe.list || lfe.texts || lfe.replies);
          } else {
            push(lflib, "导入 · " + ((LIB_META[lflib] && LIB_META[lflib].title) || "内容"), [lfe]);
          }
        }
      } else if (typeof lfv === "object") {
        for (lfkk in lfv) {
          if (!Object.prototype.hasOwnProperty.call(lfv, lfkk)) { continue; }
          push(lflib, lfkk, pickArr(lfv[lfkk]));
        }
      }
    }
    var groups = byLib[prim] || [];
    if (!groups.length) {
      for (k in byLib) { if (Object.prototype.hasOwnProperty.call(byLib, k)) { groups = groups.concat(byLib[k]); } }
    }
    return { lib: prim, groups: groups, byLib: byLib };
  }
/* 分组列表里按索引重命名 / 删除（ */
  function libRenameGroupAt(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    libRenameGroup();
  }
  function libDeleteGroupAt(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    libDeleteGroup();
  }

  function libToolbarHtml(k) {
    var m = libMeta(k), html = "";
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" onclick="SnowCrystal.libAddGroup()" title="新建分组" aria-label="新建分组">' + WC_ICO_ADD + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libImport()" title="导入 JSON" aria-label="导入 JSON">' + WC_ICO_IMPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libExport()" title="导出 JSON" aria-label="导出 JSON">' + WC_ICO_EXPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libDedup()" title="分组去重" aria-label="分组去重">' + WC_ICO_DEDUP + "</button>";
    if (m.search) { html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libSearch()" title="搜索" aria-label="搜索">' + WC_ICO_SEARCH + "</button>"; }
    return html;
  }
  function libGroupsHtml(k) {
    var groups = wcl[k] || [], html = "", i, n;
    if (!groups.length) { return '<p class="grp-empty">还没有分组，点上方「＋」新建分组</p>'; }
    for (i = 0; i < groups.length; i++) {
      n = (groups[i].items || []).length;
      html += '<div class="group-item-wrapper">' +
                '<div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.libOpenGroup(' + i + ')">' +
                  '<span class="discover-icon">' + WC_ICO_GRP_OPEN + "</span>" +
                  '<span class="discover-info">' +
                    '<span class="discover-title lib-row-name">' + esc(groups[i].name) + "</span>" +
                    '<span class="discover-desc">' + n + " 条 · 点进查看</span>" +
                  "</span>" +
                  '<span class="discover-arrow">›</span>' +
                  '<span class="group-item-actions">' +
                    '<button type="button" title="重命名" aria-label="重命名分组" onclick="event.stopPropagation();SnowCrystal.libRenameGroupAt(' + i + ')">' + WC_ICO_PEN + "</button>" +
                    '<button class="is-danger" type="button" title="删除" aria-label="删除分组" onclick="event.stopPropagation();SnowCrystal.libDeleteGroupAt(' + i + ')">' + WC_ICO_TRASH + "</button>" +
                  "</span>" +
                "</div>" +
                (i < groups.length - 1 ? '<div class="list-divider" aria-hidden="true"></div>' : "") +
              "</div>";
    }
    return html;
  }
  function renderLib() {
    loadWcl();
    var k = wclNav.lib;
    if (!k) { return; }
    var m = libMeta(k);
    var tEl = document.getElementById("libTitle");
    if (tEl) { tEl.textContent = m.title; }
    var tools = document.getElementById("libTools");
    if (tools) { tools.innerHTML = libToolbarHtml(k); }
    var wrap = document.getElementById("libSearchWrap");
    if (wrap) { wrap.hidden = true; }
    var res = document.getElementById("libSearchResults");
    if (res) { res.hidden = true; res.innerHTML = ""; }
    var list = document.getElementById("libGroups");
    if (list) { list.hidden = false; list.innerHTML = libGroupsHtml(k); }
    var foot = document.getElementById("libFoot");
    if (foot) { foot.textContent = "共 " + (wcl[k] || []).length + " 组 · 数据存在本机"; }
    renderWclEntry();
  }

  /* ---------- 分组内容页 ---------- */
  function grpBodyHtml(k, g) {
    var items = (g && g.items) || [], i, html = "", it;
    if (!items.length) { return '<p class="grp-empty">这一组还没有内容，点上方「＋」添加' + libMeta(k).noun + '</p>'; }
    var sel = !!wclNav.sel;
    var picks = wclNav.selPicks || [];
    function pickCls(i) {
      return sel ? (picks.indexOf(i) >= 0 ? " is-selecting is-picked" : " is-selecting") : "";
    }
    if (k === "main") {
      html = '<div class="wc-grid is-card-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-card-text">' + esc(items[i]) + "</span>" +
                  (sel ? "" : '<span class="wc-acts">' + wcActBtn("edit", i, "编辑", WC_ICO_PEN) +
                  wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "kao") {
      html = '<div class="wc-chip-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        html += '<div class="wc-chip' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-chip-text">' + esc(items[i]) + "</span>" +
                  (sel ? "" : '<span class="wc-acts">' + wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "emoji") {
      html = '<div class="wc-chip-grid is-emoji-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        var picked = sel && picks.indexOf(i) >= 0;
        html += '<div class="wc-chip is-emoji' + (sel ? " is-selecting" : "") + (picked ? " is-picked" : "") + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-chip-text">' + esc(items[i]) + "</span>" +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "sticker") {
      html = '<div class="wc-grid is-sticker-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        it = items[i];
        if (typeof it === "string") {
          var strIt = normStickerItem(it);
          if (strIt && strIt.img) {
            html += '<div class="wc-card wc-card--pic' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(strIt.t) + '">' +
                      stickerImgHtml(strIt.img, strIt.t) +
                      '<span class="wc-img-fallback">图片加载失败</span>' +
                      (sel ? "" : '<span class="wc-acts">' + wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                    "</div>";
          } else {
            html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(strIt ? strIt.t : it) + '">' +
                      '<span class="wc-sticker-emoji">' + esc(strIt ? strIt.k : "") + "</span>" +
                      '<span class="wc-card-text">' + esc(strIt ? strIt.t : it) + "</span>" +
                      (sel ? "" : '<span class="wc-acts">' + wcActBtn("edit", i, "编辑", WC_ICO_PEN) + wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                    "</div>";
          }
          continue;
        }
        it = it || {};
        if (it.img || it.data) {
          html += '<div class="wc-card wc-card--pic' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(it.t || "表情包") + '">' +
                    stickerImgHtml(it.img || it.data, it.t || it.k || "表情包") +
                    '<span class="wc-img-fallback">图片加载失败</span>' +
                    (sel ? "" : '<span class="wc-acts">' + wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                  "</div>";
        } else {
          html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(it.t || it.k || "") + '">' +
                    '<span class="wc-sticker-emoji">' + esc(it.k || "") + "</span>" +
                    '<span class="wc-card-text">' + esc(it.t || "") + "</span>" +
                    (sel ? "" : '<span class="wc-acts">' + wcActBtn("edit", i, "编辑", WC_ICO_PEN) + wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
                  "</div>";
        }
      }
      return html + "</div>";
    }
    html = '<div class="wc-list' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
    for (i = 0; i < items.length; i++) {
      html += '<div class="wc-row' + pickCls(i) + '" role="button" tabindex="0" data-idx="' + i + '" data-copy="' + esc(items[i]) + '">' +
                '<span class="wc-row-main">' + esc(items[i]) + "</span>" +
                (sel ? "" : '<span class="wc-acts">' + wcActBtn("edit", i, "编辑", WC_ICO_PEN) +
                wcActBtn("del", i, "删除", WC_ICO_TRASH) + "</span>") +
              "</div>";
    }
    return html + "</div>";
  }
  function grpToolbarHtml(k) {
    var m = libMeta(k), html = "";
    if (k === "sticker") {
      html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="上传图片" aria-label="上传图片" onclick="SnowCrystal.libUpload()">' + WC_ICO_ADD + "</button>";
      html += '<button class="wc-tool is-ico" type="button" title="粘贴图片链接导入" aria-label="粘贴图片链接导入" onclick="SnowCrystal.libAddStickerUrl()">' + WC_ICO_URL + "</button>";
      html += '<button class="wc-tool is-ico" type="button" title="导入表情包 JSON" aria-label="导入表情包 JSON" onclick="SnowCrystal.libImportStickerJson()">' + WC_ICO_IMPORT + "</button>";
    } else {
      html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="添加' + m.noun + '" aria-label="添加' + m.noun + '" onclick="SnowCrystal.libAddItem()">' + WC_ICO_ADD + "</button>";
    }
    html += '<button class="wc-tool is-ico" type="button" title="重命名" aria-label="重命名分组" onclick="SnowCrystal.libRenameGroup()">' + WC_ICO_PEN + "</button>";
    if (k === "sticker") {
      html += '<button class="wc-tool is-ico is-danger" type="button" title="清空本组" aria-label="清空本组" onclick="SnowCrystal.libClearUpload()">' + WC_ICO_CLEAR + "</button>";
    }
    var sel = !!wclNav.sel;
    if (sel) {
      var picks = wclNav.selPicks || [];
      html += '<button class="wc-tool is-ico" data-act="selall" type="button" title="全显：全选当前分组全部条目" aria-label="全显：全选当前分组全部条目" onclick="SnowCrystal.libSelAll()">' + WC_ICO_ALL + "</button>";
      html += '<button class="wc-tool is-ico" data-act="move" type="button" title="转移已选 ' + picks.length + ' 条到其他分组" aria-label="转移已选到其他分组" onclick="SnowCrystal.libMovePicked()">' + WC_ICO_MOVE + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="del" type="button" title="删除已选 ' + picks.length + ' 条" aria-label="批量删除已选" onclick="SnowCrystal.libDeletePicked()">' + WC_ICO_TRASH + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="block" type="button" title="屏蔽已选 ' + picks.length + ' 条" aria-label="屏蔽已选" onclick="SnowCrystal.libBlockPicked()">' + WC_ICO_BLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico' + (sel ? " is-on" : "") + '" type="button" title="' + (sel ? "完成：退出选择模式" : "选择：进入选择模式，勾选后可转移 / 批量删除或屏蔽") + '" aria-label="' + (sel ? "完成选择" : "选择模式") + '" onclick="SnowCrystal.libToggleSel()">' + WC_ICO_SELECT + "</button>";
    var curG = (wcl[k] || [])[wclNav.group];
    if (curG && curG.blocked && curG.blocked.length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复已屏蔽 ' + curG.blocked.length + ' 条" aria-label="恢复已屏蔽" onclick="SnowCrystal.libRestoreBlocked()">' + WC_ICO_UNBLOCK + "</button>";
    }
    if (WCL_DEFAULT[k] && WCL_DEFAULT[k].length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复本组内置内容（删除的内置条目可一键还原）" aria-label="恢复内置内容" onclick="SnowCrystal.libRestoreBuiltin()">' + WC_ICO_RESTORE + "</button>";
    }
    return html;
  }
  function renderGroup() {
    loadWcl();
    var k = wclNav.lib;
    if (!k) { return; }
    var groups = wcl[k] || [];
    if (!groups.length) { renderLib(); SnowCrystal.switchPage("wc-lib"); return; }
    if (wclNav.group < 0 || wclNav.group >= groups.length) { wclNav.group = 0; }
    var g = groups[wclNav.group], m = libMeta(k);
    var tEl = document.getElementById("grpTitle");
    if (tEl) { tEl.textContent = g.name; }
    var tools = document.getElementById("grpTools");
    if (tools) { tools.innerHTML = grpToolbarHtml(k); }
    var body = document.getElementById("grpBody");
    if (body) { body.innerHTML = grpBodyHtml(k, g); }
    if (k === "sticker" && body) { stickerBindMedia(body); }
    var foot = document.getElementById("grpFoot");
    if (foot) {
      if (wclNav.sel) {
        foot.textContent = "选择模式：点条目勾选/取消（可多选）· 可转移 / 批量删除或屏蔽 · 点「完成」退出";
      } else if (k === "sticker") {
        foot.textContent = "点表情包复制名称 · 支持上传图片 / 粘贴链接 / 导入 JSON";
      } else if (k === "emoji") {
        foot.textContent = "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 回转箭头可恢复内置内容 · 数据存在本机";
      } else {
        foot.textContent = (WCL_DEFAULT[k] && WCL_DEFAULT[k].length
          ? "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 回转箭头可恢复内置内容 · 数据存在本机"
          : "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 数据存在本机");
      }
    }
  }
  function grpItemText(k, it) {
    if (k === "sticker") { return String((it && (it.t || it.k)) || "表情包"); }
    return String(it == null ? "" : it);
  }
  function builtinListOf(k, groupName) {
    var defs = WCL_DEFAULT[k];
    if (!defs || !defs.length) { return null; }
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].name === groupName) { return (defs[i].items || []).slice(); }
    }
    return null;
  }
  function isBuiltinValue(k, groupName, v) {
    var blist = builtinListOf(k, groupName);
    if (!blist) { return false; }
    for (var i = 0; i < blist.length; i++) { if (String(blist[i]) === String(v)) { return true; } }
    return false;
  }
  function grpItemIndex(el) {
    var host = document.getElementById("grpBody");
    /* v-fix-actions：优先取渲染时写入的 data-idx（与数组下标一一对应） */
    var idxEl = closestData(el, "data-idx", host);
    if (idxEl && idxEl.getAttribute) {
      var nIdx = parseInt(idxEl.getAttribute("data-idx"), 10);
      if (!isNaN(nIdx) && nIdx >= 0) { return nIdx; }
    }
    var node = closestData(el, "data-copy", host) || el;
    var nodes = host ? host.querySelectorAll("[data-copy]") : [];
    for (var i = 0; i < nodes.length; i++) { if (nodes[i] === node) { return i; } }
    return -1;
  }
  /* 条目操作按钮统一契约（v-fix-actions）：
     - data-act 明确动作，data-idx 直接指向条目下标 —— 不再靠 DOM 顺序推断，重渲染/乱序都不会删错；
     - 所有按钮包在 .wc-acts 容器里，与文字列并排，从结构上消除"长文案压住按钮"。 */
  function wcActBtn(act, idx, label, ico) {
    var legacy = act === "edit" ? ' data-edit="1"' : (act === "del" ? ' data-del="1"' : "");
    return '<button class="wc-' + act + '" type="button" data-act="' + act + '"' + legacy +
      ' data-idx="' + idx + '" title="' + label + '" aria-label="' + label + '">' + ico + "</button>";
  }
  var _wcActTs = 0;
  function wcActHandled() { return (new Date().getTime() - _wcActTs) < 500; }
  function wcItemAction(e) {
    var host = document.getElementById("grpBody");
    var t = e.target || e.srcElement;
    if (!host || !host.contains(t)) { return null; }
    var el = closestData(t, "data-act", host);
    if (!el) {
      el = closestData(t, "data-del", host) || closestData(t, "data-edit", host);
    }
    if (!el) { return null; }
    var act = el.getAttribute("data-act");
    if (!act) { act = closestData(t, "data-del", host) ? "del" : "edit"; }
    return { el: el, act: act };
  }
  function wcRunAction(hit) {
    if (!hit) { return false; }
    _wcActTs = new Date().getTime();
    if (hit.act === "del") { removeGrpItem(hit.el); return true; }
    if (hit.act === "edit") { editGrpItem(hit.el); return true; }
    return false;
  }
  /* 按下即执行：移动端 click 常被滚动判定、:active 变换、300ms 延迟吞掉，
     这里在捕获阶段直接命中按钮，比等 click 可靠 */
  function onGroupBodyPointerDown(e) {
    var t = e.target || e.srcElement;
    var host = document.getElementById("grpBody");
    if (!host || !host.contains(t)) { return; }
    if (wclNav.sel) { return; }
    if (e.button != null && e.button > 0) { return; }
    var hit = wcItemAction(e);
    if (!hit) { return; }
    /* 只有「删除」在按下即执行；「编辑」要弹面板，交给 click，否则同一手势的后续事件会点掉刚弹出的遮罩 */
    if (hit.act !== "del") { return; }
    if (e.cancelable) { e.preventDefault(); }
    e.stopPropagation();
    wcRunAction(hit);
  }
  function onGroupBodyClick(e) {
    var t = e.target || e.srcElement;
    var host = document.getElementById("grpBody");
    if (!host || !host.contains(t)) { return; }
    if (wclNav.sel) {
      var sItem = closestData(t, "data-copy", host);
      if (sItem) { togglePick(sItem); }
      return;
    }
    /* pointerdown 已经执行过同一个按钮时，冒泡上来的 click 不再重复处理 */
    if (wcActHandled()) { return; }
    var hit = wcItemAction(e);
    if (hit && wcRunAction(hit)) { return; }
    var item = closestData(t, "data-copy", host);
    if (item) { wcCopy(item.getAttribute("data-copy") || ""); }
  }
  function removeGrpItem(el) {
    var idx = grpItemIndex(el);
    var k = wclNav.lib, g = (wcl[k] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var soft = removeGrpItemAt(k, g, idx);
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast(soft ? "已删除（内置内容，可点「恢复」还原）" : "已删除");
  }
  function grpItemKey(k, it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return it; }
    var t = it.t || it.name || it.title || it.k || "";
    var img = it.img || it.url || it.src || it.data || "";
    return t + "|" + img;
  }
  function removeGrpItemAt(k, g, idx) {
    var v = grpItemText(k, g.items[idx]);
    if (isBuiltinValue(k, g.name, v)) {
      g.items.splice(idx, 1);
      if (!g.deleted) { g.deleted = []; }
      if (g.deleted.indexOf(v) < 0) { g.deleted.push(v); }
      return true;
    }
    var mk = grpItemImgKey(g.items[idx]);
    g.items.splice(idx, 1);
    if (mk) { mediaDeleteIfUnused(mk); }
    return false;
  }
  function togglePick(el) {
    var idx = grpItemIndex(el);
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var picks = wclNav.selPicks || (wclNav.selPicks = []);
    var p = picks.indexOf(idx);
    if (p >= 0) { picks.splice(p, 1); } else { picks.push(idx); }
    if (el.classList) { el.classList.toggle("is-picked", p < 0); }
    var foot = document.getElementById("grpFoot");
    if (foot) { foot.textContent = "选择模式：点条目勾选/取消 · 已选 " + picks.length + " 条 · 可转移 / 批量删除或屏蔽"; }
    var tools = document.getElementById("grpTools");
    if (tools) {
      var dbtns = tools.querySelectorAll(".wc-tool[data-act]");
      for (var bi = 0; bi < dbtns.length; bi++) {
        var act = dbtns[bi].getAttribute("data-act");
        dbtns[bi].setAttribute("title", (act === "move" ? "转移已选 " : (act === "del" ? "删除已选 " : "屏蔽已选 ")) + picks.length + " 条" + (act === "move" ? "到其他分组" : ""));
        dbtns[bi].setAttribute("aria-label", dbtns[bi].getAttribute("title"));
      }
    }
  }
  function libDeletePicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    var removed = 0, soft = 0, i;
    for (i = 0; i < picks.length; i++) {
      var idx = picks[i];
      if (idx < 0 || idx >= g.items.length) { continue; }
      if (removeGrpItemAt(k, g, idx)) { soft++; }
      removed++;
    }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已删除 " + removed + " 条" + (soft ? "（内置内容可点「恢复」还原）" : ""));
  }
  function libBlockPicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    if (!g.blocked) { g.blocked = []; }
    var blocked = 0, i, idx, key, b, dup;
    for (i = 0; i < picks.length; i++) {
      idx = picks[i];
      if (idx < 0 || idx >= g.items.length) { continue; }
      var it = g.items[idx];
      key = grpItemKey(k, it);
      dup = false;
      for (b = 0; b < g.blocked.length; b++) { if (grpItemKey(k, g.blocked[b]) === key) { dup = true; break; } }
      if (!dup) { g.blocked.push(it); }
      g.items.splice(idx, 1);
      blocked++;
    }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已屏蔽 " + blocked + " 条，可点「恢复已屏蔽」找回");
  }
  function fitItemForLib(dstK, it) {
    if (it == null) { return null; }
    if (dstK === "sticker") {
      if (typeof it === "string") { return normStickerItem(it) || it; }
      return it;
    }
    if (typeof it === "string") { return it; }
    if (typeof it === "object") { return String(it.t || it.name || it.title || it.k || ""); }
    return String(it);
  }
  function libMovePicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice();
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    var targets = [], li, gi, groups, lk;
    for (li = 0; li < LIB_ORDER.length; li++) {
      lk = LIB_ORDER[li];
      groups = wcl[lk] || [];
      for (gi = 0; gi < groups.length; gi++) {
        if (lk === k && gi === wclNav.group) { continue; }
        targets.push({
          lib: lk,
          gi: gi,
          label: ((LIB_META[lk] && LIB_META[lk].title) || lk) + " · " + groups[gi].name,
          n: (groups[gi].items || []).length
        });
      }
    }
    if (!targets.length) { wcToast("没有可转移的目标分组，请先新建分组"); return; }
    wcGroupPick("转移到…", "已选 " + picks.length + " 条 · 选择目标分组（跨库或同库其他分组）", targets, function (t) {
      movePickedTo(k, g, picks, t.lib, t.gi);
    });
  }
  function movePickedTo(srcK, srcG, picks, dstK, dstGi) {
    var dstG = (wcl[dstK] || [])[dstGi];
    if (!dstG || !dstG.items) { wcToast("目标分组不存在"); return; }
    var idxs = picks.slice().sort(function (a, b) { return a - b; });
    var moved = 0, i, idx, it, fit, gone = [], mk, appendItems = [], validIdx = [];
    for (i = 0; i < idxs.length; i++) {
      idx = idxs[i];
      if (idx < 0 || idx >= srcG.items.length) { continue; }
      it = srcG.items[idx];
      fit = fitItemForLib(dstK, it);
      if (fit === null || fit === "") { continue; }
      mk = grpItemImgKey(it);
      appendItems.push(fit);
      validIdx.push(idx);
      if (mk && gone.indexOf(mk) < 0) { gone.push(mk); }
      moved++;
    }
    if (!moved) { wcToast("没有可转移的条目"); return; }
    dstG.items = dstG.items.concat(appendItems);
    for (i = validIdx.length - 1; i >= 0; i--) { srcG.items.splice(validIdx[i], 1); }
    for (i = 0; i < gone.length; i++) { mediaDeleteIfUnused(gone[i]); }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已转移 " + moved + " 条到「" + dstG.name + "」");
  }
  function libRestoreBlocked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    if (!g || !g.blocked || !g.blocked.length) { wcToast("没有已屏蔽的条目"); return; }
    var existing = {}, i;
    for (i = 0; i < (g.items || []).length; i++) { existing[grpItemKey(k, g.items[i])] = 1; }
    if (!g.items) { g.items = []; }
    var restored = 0;
    for (i = 0; i < g.blocked.length; i++) {
      var it = g.blocked[i];
      var key = grpItemKey(k, it);
      if (existing[key]) { continue; }
      g.items.push(it);
      existing[key] = 1;
      restored++;
    }
    g.blocked = [];
    if (restored) {
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已恢复 " + restored + " 条屏蔽内容");
    } else {
      wcToast("屏蔽内容与现有条目重复，已清空屏蔽记录");
    }
  }
  function libRestoreBuiltin() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    if (!g) { return; }
    var blist = builtinListOf(k, g.name);
    if (!blist) { wcToast("该分组不是内置分组，没有可恢复的内置内容"); return; }
    var existing = {}, i, v, restored = 0;
    for (i = 0; i < (g.items || []).length; i++) { existing[grpItemText(k, g.items[i])] = 1; }
    if (!g.items) { g.items = []; }
    for (i = 0; i < blist.length; i++) {
      v = String(blist[i]);
      if (existing[v]) { continue; }
      g.items.push(v);
      existing[v] = 1;
      restored++;
    }
    g.deleted = [];
    if (restored) {
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已恢复 " + restored + " 条内置内容");
    } else {
      wcToast("内置内容都还在，无需恢复");
    }
  }
  function editGrpItem(el) {
    var idx = grpItemIndex(el);
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var m = libMeta(wclNav.lib);
    wcPrompt("编辑" + m.noun, grpItemText(wclNav.lib, g.items[idx]), "修改内容后点保存", function (v) {
      g.items[idx] = v;
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已保存修改");
    });
  }
  function libToggleSel() {
    wclNav.sel = !wclNav.sel;
    wclNav.selPicks = []; /* 进出选择模式均清空勾选 */
    renderGroup();
    wcToast(wclNav.sel ? "已进入选择模式：点条目勾选，可转移 / 批量删除或屏蔽" : "已退出选择模式");
  }
  function libSelAll() {
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    var n = (g && g.items) ? g.items.length : 0;
    wclNav.selPicks = [];
    for (var i = 0; i < n; i++) { wclNav.selPicks.push(i); }
    renderGroup();
  }

  /* ---------- 对外动作 ---------- */
  function libOpen(pageName) { SnowCrystal.switchPage(pageName); }
  function libOpenLib(k, from) {
    var active = document.querySelector(".page.is-active");
    wclNav.lib = k;
    /* from 由触发入口显式传入，返回时稳定回到来源页 */
    wclNav.page = from || (active && active.getAttribute("data-page")) || "wordcard";
    wclNav.group = 0;
    renderLib();
    SnowCrystal.switchPage("wc-lib");
  }
  function libOpenGroup(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    wclNav.sel = false; 
    wclNav.selPicks = []; 
    renderGroup();
    SnowCrystal.switchPage("wc-lib-group");
  }
  function libBack() { SnowCrystal.switchPage(wclNav.page || "wordcard"); }
  function libGroupBack() { renderLib(); SnowCrystal.switchPage("wc-lib"); }

  function libAddGroup() {
    var k = wclNav.lib;
    wcPrompt("新建分组", "", "分组名称，如：晚安文案", function (res) {
      var name = String(res && res.name ? res.name : "").replace(/^\s+|\s+$/g, "");
      if (!name) { wcToast("分组名不能为空"); return; }
      var items = [];
      var content = String(res && res.content ? res.content : "");
      if (content) {
        var list = wcLineOn(k) ? content.split("\n") : [content];
        for (var i = 0; i < list.length; i++) {
          var t = String(list[i]).replace(/^\s+|\s+$/g, "");
          if (t) { items.push(t); }
        }
      }
      (wcl[k] || []).push({ name: name, items: items });
      saveWcl();
      renderLib();
      renderWclEntry();
      wcToast("已新建分组");
    }, { groupMode: true, multiline: true, lineKey: k, noContent: k === "sticker" });
  }
  function libRenameGroup() {
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (!g) { return; }
    wcPrompt("重命名分组", g.name, "", function (v) {
      g.name = v;
      saveWcl();
      renderGroup();
      wcToast("已重命名");
    });
  }
  function libDeleteGroup() {
    var groups = wcl[wclNav.lib] || [];
    var g = groups[wclNav.group];
    if (!g) { return; }
    var n = (g.items || []).length;
    wcConfirm("删除分组？", "「" + g.name + "」及其中 " + n + " 条内容将一并删除，删除后不可恢复。", function () {
      var gone = [], gi, ai, i2, mki;
      if (wclNav.lib === "sticker" && g) {
        var lists = [g.items, g.deleted, g.blocked];
        for (ai = 0; ai < lists.length; ai++) {
          for (i2 = 0; i2 < (lists[ai] || []).length; i2++) {
            mki = grpItemImgKey(lists[ai][i2]);
            if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
          }
        }
      }
      groups.splice(wclNav.group, 1);
      if (wclNav.group >= groups.length) { wclNav.group = Math.max(0, groups.length - 1); }
      for (gi = 0; gi < gone.length; gi++) { mediaDeleteIfUnused(gone[gi]); }
      saveWcl();
      renderWclEntry();
      /* 修复：删除分组后按当前所在页面重渲染对应视图（列表页刷新列表 / 内容页刷新条目）， */
      var _libAct = document.querySelector(".page.is-active");
      var _libOnList = _libAct && _libAct.getAttribute("data-page") === "wc-lib";
      if (!groups.length) { renderLib(); SnowCrystal.switchPage("wc-lib"); }
      else if (_libOnList) { renderLib(); }
      else { renderGroup(); }
      wcToast("已删除分组");
    });
  }
  function libAddItem() {
    var k = wclNav.lib, m = libMeta(k);
    var g = (wcl[k] || [])[wclNav.group];
    if (!g) { return; }
    var tip = "";
    if (k === "emoji") { tip = "例如：🤗"; }
    else if (k === "kao") { tip = "例如：(＾▽＾)"; }
    else if (k === "pat") { tip = "完整句式，如：\"我方\"拍了拍\"对方\"：晚安"; }
    if (k === "sticker") {
      /* 表情包 sticker：保持原单条添加，不显示回车分行 */
      wcPrompt("添加" + m.noun, "", tip, function (v) {
        g.items.push(v);
        saveWcl();
        renderGroup();
        renderWclEntry();
        wcToast("已添加");
      }, { contentLabel: true });
      return;
    }
    /* 格言 quote / 字卡 main / 颜文字 kao / emoji / 拍一拍 pat：多行输入 + 回车分行开关 */
    wcPrompt("添加" + m.noun, "", tip, function (v) {
      var list = wcLineOn(k) ? String(v).split("\n") : [String(v)];
      var cnt = 0;
      for (var i = 0; i < list.length; i++) {
        var t = String(list[i]).replace(/^\s+|\s+$/g, "");
        if (t) { g.items.push(t); cnt++; }
      }
      if (cnt === 0) { wcToast("内容为空"); return; }
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast(cnt > 1 ? "已添加 " + cnt + " 条" : "已添加");
    }, { multiline: true, lineKey: k, contentLabel: true });
  }
  function libUpload() {
    var picker = document.getElementById("wcStickerPicker");
    if (picker) { picker.click(); }
  }
  function libClearUpload() {
    var g = (wcl.sticker || [])[wclNav.group];
    if (!g) { return; }
    var n = (g.items || []).length;
    if (!n) { wcToast("这一组还是空的"); return; }
    wcConfirm("清空本组？", "本组 " + n + " 条表情包将全部删除，删除后不可恢复。", function () {
      var gone = [], i2, mki;
      for (i2 = 0; i2 < (g.items || []).length; i2++) {
        mki = grpItemImgKey(g.items[i2]);
        if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
      }
      g.items = [];
      for (i2 = 0; i2 < gone.length; i2++) { mediaDeleteIfUnused(gone[i2]); }
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已清空本组");
    });
  }
  function libAddStickerUrl() {
    var g = (wcl.sticker || [])[wclNav.group];
    if (!g) { return; }
    if (!g.items) { g.items = []; }
    wcPrompt("粘贴图片链接", "", "可一次粘贴任意多条链接（数量不限），每条链接前/后有文字也能自动识别；仅支持 http(s):// 或 data:image/ 开头", function (v) {
      var raw = String(v || "");
      /* 从整段文本中提取全部链接：跳过前后文字与标点 */
      var re = /https?:\/\/[^\s"'<>，。；、（）()【】\[\]{}]+|data:image\/[a-zA-Z0-9+.\-]+;base64,[A-Za-z0-9+/=]+/g;
      var found = [], m;
      while ((m = re.exec(raw)) !== null) { found.push(m[0]); }
      if (!found.length) { wcToast("未识别到链接（需 http(s):// 或 data:image/ 开头）"); return; }
      var seen = {}, urls = [], i;
      for (i = 0; i < found.length; i++) {
        if (seen[found[i]]) { continue; }
        seen[found[i]] = 1;
        urls.push(found[i]);
      }
      var base = g.items.length;
      for (i = 0; i < urls.length; i++) { g.items.push({ k: "🔗", t: "链接表情包", img: urls[i] }); }
      /* data: 大图逐个迁入 IDB（链式避免事务冲突），外链直连 */
      var chain = Promise.resolve();
      for (i = 0; i < urls.length; i++) {
        if (!/^data:image\//i.test(urls[i])) { continue; }
        (function (idx) {
          chain = chain.then(function () {
            return mediaSaveNew(urls[idx]).then(function (mk) {
              if (mk) { g.items[base + idx].img = mk; }
            });
          });
        })(i);
      }
      chain.then(function () {
        var _saved = saveWcl();
        renderGroup();
        renderWclEntry();
        if (_saved) { syncChatStickerPanel(); } /* 聊天室表情包面板同步新导入 */
        wcToast("已导入 " + urls.length + " 条链接表情包");
      });
    }, { contentLabel: true, noEnterSubmit: true });
  }
  function libImportStickerJson() {
    var inp = document.getElementById("wcStickerJsonInput");
    if (inp) { inp.click(); }
  }
  /* 从任意 JSON 里提取表情包分组列表 [{name, items}]： */
  function parseStickerJson(raw) {
    var data = null;
    try { data = JSON.parse(String(raw).replace(/^\uFEFF/, "")); } catch (e) { data = null; }
    if (data === null || data === undefined || typeof data !== "object") { return []; }
    var out = [], i, groups = null, items = null, ms = null;

    function pushGroup(name, list) {
      var arr = wcNormItems("sticker", list), g = { name: name, items: [] }, j, it;
      for (j = 0; j < arr.length; j++) {
        it = arr[j];
        if (typeof it === "string") { g.items.push(normStickerItem(it)); continue; }
        if (it && typeof it === "object") {
          /* 备份格式：表情包条目可能只给 mediaKey / __mRef，需回填 mediaStore 的 base64 */
          var img = it.img || it.url || it.src || it.data || it.base64 || null;
          var mKey = it.mediaKey || it.__mRef || null;
          var imgKey = null, missing = false;
          if (isMediaKey(img)) { imgKey = img; }
          else if (!img && mKey && isMediaKey(mKey)) { imgKey = mKey; }
          if (imgKey) {
            if (ms && ms[imgKey]) { img = ms[imgKey]; imgKey = null; }
            else { missing = true; }
          }
          g.items.push({ k: it.k || "🖼", t: it.t || it.name || it.title || "表情包", img: img, __missing: missing || undefined });
        }
      }
      if (g.items.length) { out.push(g); }
    }

    if (data.mediaStore && typeof data.mediaStore === "object") { ms = data.mediaStore; }
    if (data.modules && data.modules.stickers !== undefined) { data = data.modules.stickers; }
    if (data.localforage && typeof data.localforage === "object") {
      var sid = String(data.sessionId || "");
      var lfKeys = Object.keys(data.localforage), lfPrefer = [], lfOther = [], li, lk, lv;
      for (li = 0; li < lfKeys.length; li++) {
        lk = lfKeys[li];
        if (!/Sticker/i.test(lk)) { continue; }
        lv = data.localforage[lk];
        if (!Array.isArray(lv) || !lv.length) { continue; }
        if (sid && lk.indexOf(sid) >= 0) { lfPrefer.push(lv); }
        else { lfOther.push(lv); }
      }
      var lfSrc = lfPrefer.length ? lfPrefer : lfOther, mergedArr = [], m2, n2;
      if (lfSrc.length) {
        for (li = 0; li < lfSrc.length; li++) { for (m2 = 0; m2 < lfSrc[li].length; m2++) { mergedArr.push(lfSrc[li][m2]); } }
        pushGroup("表情包库", mergedArr);
        if (out.length) { return out; }
      }
    }

    if (Array.isArray(data)) {
      pushGroup("导入分组", data);
      return out;
    }
    if (data && typeof data === "object") {
      groups = data.groups || data.libs || data.categories || null;
      if (Array.isArray(groups)) {
        for (i = 0; i < groups.length; i++) {
          if (groups[i] && Array.isArray(groups[i].items)) { pushGroup(groups[i].name || "导入分组", groups[i].items); }
          else if (groups[i] && typeof groups[i] === "object") {
            /* 形如 {分组名: [条目...]} 的对象 */
            var keys = Object.keys(groups[i]);
            for (var k2 = 0; k2 < keys.length; k2++) { pushGroup(keys[k2], groups[i][keys[k2]]); }
          }
        }
        if (out.length) { return out; }
      }
      items = data.items || data.list || data.stickers || null;
      if (Array.isArray(items)) { pushGroup("导入分组", items); }
      if (out.length) { return out; }
      /* 形如 {分组名: [条目...]} 或 {key: [条目...]} 的键值结构 */
      var keysAll = Object.keys(data), k3, val, pushed = false;
      for (k3 = 0; k3 < keysAll.length; k3++) {
        val = data[keysAll[k3]];
        if (Array.isArray(val)) { pushGroup(keysAll[k3], val); pushed = true; }
      }
      if (pushed && out.length) { return out; }
    }
    return out;
  }
  /* JSON 文件并入：按分组名合并（同名并入，新名新建）；单组无名字时并入当前分组 */
  function mergeStickerGroups(list) {
    var groups = wcl.sticker || (wcl.sticker = []);
    var cur = (wclNav.lib === "sticker" && groups[wclNav.group]) ? groups[wclNav.group] : null;
    var i, j, g, added = 0, created = 0;
    for (i = 0; i < list.length; i++) {
      var nm = String(list[i].name || "").replace(/^\s+|\s+$/g, "");
      var itArr = list[i].items || [];
      if (!itArr.length) { continue; }
      g = null;
      if (!nm) { g = cur; }
      else { for (j = 0; j < groups.length; j++) { if (groups[j].name === nm) { g = groups[j]; } } }
      if (!g) {
        g = { name: nm || (cur ? cur.name : "导入分组"), items: [] };
        if (!nm && cur) { g = cur; }
        else { groups.push(g); created++; }
      }
      g.items = g.items.concat(itArr);
      added += itArr.length;
    }
    return { added: added, created: created };
  }
  function libDedup() {
    var k = wclNav.lib, groups = wcl[k] || [], i, j, removed = 0, merged = 0;
    var gone = [];
    for (i = 0; i < groups.length; i++) {
      var items = groups[i].items || [], keep = [], seen = {};
      for (j = 0; j < items.length; j++) {
        var key;
        if (k === "sticker") {
          key = grpItemImgKey(items[j]) || grpItemKey(k, items[j]);
        } else {
          key = grpItemKey(k, items[j]);
        }
        if (seen[key]) {
          if (k === "sticker") {
            var mki = grpItemImgKey(items[j]);
            if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
          }
          removed++; continue;
        }
        seen[key] = 1;
        keep.push(items[j]);
      }
      if (keep.length !== items.length) { groups[i].items = keep; }
    }
    var out = [], names = {};
    for (i = 0; i < groups.length; i++) {
      var nm = groups[i].name;
      if (names[nm] === undefined) { names[nm] = out.length; out.push(groups[i]); }
      else { out[names[nm]].items = out[names[nm]].items.concat(groups[i].items || []); merged++; }
    }
    wcl[k] = out;
    if (wclNav.group >= out.length) { wclNav.group = Math.max(0, out.length - 1); }
    for (i = 0; i < gone.length; i++) { mediaDeleteIfUnused(gone[i]); }
    saveWcl();
    renderLib();
    renderWclEntry();
    wcToast("去重完成：删掉 " + removed + " 条重复内容" + (merged ? "，合并 " + merged + " 组" : ""));
  }
  function libExport() {
    var k = wclNav.lib, m = libMeta(k);
    var groups = wclClone(wcl[k] || []);
    mediaResolveAll().then(function (map) {
      var data = { lib: k, name: m.title, exportedAt: new Date().toISOString(), groups: stickerFillBase64({ sticker: groups }, map).sticker };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "雪晶-字卡-" + m.title + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      wcToast("已导出《" + m.title + "》");
    });
  }
  function libImport() {
    var inp = document.getElementById("wcLibImport");
    if (inp) { inp.click(); }
  }
  function libSearch() {
    var wrap = document.getElementById("libSearchWrap");
    var inp = document.getElementById("libSearchInput");
    if (!wrap) { return; }
    if (!wrap.hidden) {
      wrap.hidden = true;
      if (inp) { inp.value = ""; }
      libDoSearch("");
      return;
    }
    wrap.hidden = false;
    if (inp) { inp.value = ""; inp.focus(); }
    libDoSearch("");
  }
  function libDoSearch(q) {
    var k = wclNav.lib, groups = wcl[k] || [], host = document.getElementById("libSearchResults");
    var list = document.getElementById("libGroups");
    q = String(q == null ? "" : q).replace(/^\s+|\s+$/g, "");
    if (!q) {
      if (host) { host.hidden = true; host.innerHTML = ""; }
      if (list) { list.hidden = false; }
      return;
    }
    var html = '<p class="grp-empty">「' + esc(q) + '」的搜索结果</p><div class="row-list">', hit = 0, i, j, txt;
    for (i = 0; i < groups.length; i++) {
      for (j = 0; j < (groups[i].items || []).length; j++) {
        txt = grpItemText(k, groups[i].items[j]);
        if (txt.toLowerCase().indexOf(q.toLowerCase()) < 0) { continue; }
        hit++;
        html += '<article class="row-card" onclick="SnowCrystal.libCopyText(\'' + esc(txt).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + '\')">' +
                  '<span class="row-ico">' + libIconSvg(k) + "</span>" +
                  '<div class="row-main"><span class="row-title">' + esc(txt) + "</span>" +
                  '<span class="row-desc">' + esc(groups[i].name) + "</span></div>" +
                  '<span class="row-arrow">›</span>' +
                "</article>";
      }
    }
    html += "</div>";
    if (!hit) { html = '<p class="grp-empty">没有找到「' + esc(q) + '」</p>'; }
    if (host) { host.innerHTML = html; host.hidden = false; }
    if (list) { list.hidden = true; }
  }
  function libClearSearch() {
    var wrap = document.getElementById("libSearchWrap");
    var inp = document.getElementById("libSearchInput");
    if (inp) { inp.value = ""; }
    if (wrap) { wrap.hidden = true; }
    libDoSearch("");
  }
  function libCopyText(t) { wcCopy(t); }

  
