/* ============================================================
 * [2026-10-25] 贴表情：聊天背景 emoji 贴纸（月牙菜单 → 贴表情）
 * - 对标拾心界：壁纸式砖墙交错平铺（5列×7行，奇数行偏移半格且少一格），
 *   双字号交替（24/18px）+ 轻微交替旋转（-6/0/6/0）+ 60% 透明度 + 柔和投影，
 *   背景色随已贴表情主色淡变为偏白的对应色（深浅双套）
 * - 我方贴出后对方错峰回贴一枚，双方 emoji 交替平铺整面
 * - 按角色分别持久化，进入聊天室自动恢复
 * ============================================================ */
(function () {
  var S = window.SnowCrystal || (window.SnowCrystal = {});
  var Chat = S.Chat = S.Chat || {};
  var LS_KEY = "snowcrystal.chat.bgstickers.v3";
  var COLS = 5, ROWS = 7;      /* 5列×7行：壁纸式砖墙交错（奇数行偏移半格） */

  /* 按颜色分组的优美动物 emoji（每组 8-9 枚，配主色相 hue；全部为高兼容通用 emoji） */
  var GROUPS = [
    { name: "红粉", dot: "#f28ba8", items: [
      { e: "❤️", h: 355 }, { e: "💗", h: 340 }, { e: "🌹", h: 340 }, { e: "🌸", h: 335 },
      { e: "🌷", h: 338 }, { e: "🍓", h: 350 }, { e: "🐰", h: 330 }, { e: "🍒", h: 348 },
      { e: "🎀", h: 335 }, { e: "🦩", h: 340 }, { e: "🍉", h: 350 }, { e: "🐷", h: 345 }
    ]},
    { name: "暖橙", dot: "#f5a06a", items: [
      { e: "🧡", h: 28 }, { e: "🍊", h: 30 }, { e: "🍑", h: 25 }, { e: "🥕", h: 28 },
      { e: "🌻", h: 42 }, { e: "🦊", h: 28 }, { e: "🐱", h: 35 }, { e: "🐯", h: 32 },
      { e: "🦁", h: 30 }, { e: "🐹", h: 30 }, { e: "🥭", h: 35 }, { e: "🍁", h: 25 }
    ]},
    { name: "金黄", dot: "#f2c94c", items: [
      { e: "💛", h: 50 }, { e: "🌟", h: 48 }, { e: "🍋", h: 55 }, { e: "🌼", h: 48 },
      { e: "🐤", h: 50 }, { e: "🐥", h: 45 }, { e: "🌞", h: 44 }, { e: "🍯", h: 40 },
      { e: "🐝", h: 45 }, { e: "🍌", h: 50 }, { e: "🦆", h: 45 }, { e: "🧀", h: 48 }
    ]},
    { name: "青绿", dot: "#7ec98a", items: [
      { e: "💚", h: 120 }, { e: "🍀", h: 128 }, { e: "🥦", h: 95 }, { e: "🥝", h: 100 },
      { e: "🌱", h: 112 }, { e: "🐸", h: 105 }, { e: "🐢", h: 110 }, { e: "🌿", h: 115 },
      { e: "🦎", h: 110 }, { e: "🥬", h: 100 }, { e: "🌵", h: 115 }, { e: "🍐", h: 105 }
    ]},
    { name: "澄蓝", dot: "#7fb8e6", items: [
      { e: "💙", h: 215 }, { e: "💧", h: 205 }, { e: "🌊", h: 210 }, { e: "🐬", h: 205 },
      { e: "🐳", h: 210 }, { e: "🐟", h: 200 }, { e: "🐡", h: 215 }, { e: "🐠", h: 205 },
      { e: "🐋", h: 210 }, { e: "🐚", h: 205 }, { e: "🌀", h: 220 }, { e: "🦈", h: 205 }
    ]},
    { name: "星紫", dot: "#b39ae8", items: [
      { e: "💜", h: 275 }, { e: "🍇", h: 278 }, { e: "🦄", h: 275 }, { e: "🔮", h: 270 },
      { e: "💫", h: 282 }, { e: "✨", h: 265 }, { e: "⭐", h: 275 }, { e: "🪄", h: 270 },
      { e: "🪐", h: 275 }, { e: "🦋", h: 270 }, { e: "💠", h: 265 }, { e: "👾", h: 275 }
    ]},
    { name: "柔白", dot: "#cfd6e2", gray: 1, items: [
      { e: "🤍", h: 210 }, { e: "🕊️", h: 200 }, { e: "☁️", h: 210 }, { e: "❄️", h: 205 },
      { e: "⚪", h: 210 }, { e: "🐑", h: 200 }, { e: "🌨️", h: 210 }, { e: "🧊", h: 205 },
      { e: "🦢", h: 205, gray: 1 }, { e: "🍚", h: 205, gray: 1 }, { e: "🐇", h: 205, gray: 1 }, { e: "🌫️", h: 210, gray: 1 }
    ]},
    { name: "暖棕", dot: "#b98a5f", items: [
      { e: "🤎", h: 30 }, { e: "🐻", h: 30 }, { e: "🧸", h: 30 }, { e: "🐶", h: 35 },
      { e: "☕", h: 25 }, { e: "🍫", h: 25 }, { e: "🐿️", h: 28 }, { e: "🍂", h: 25 },
      { e: "🦌", h: 25 }, { e: "🦉", h: 25 }, { e: "🥜", h: 30 }, { e: "🍄", h: 30 }
    ]},
    { name: "墨黑", dot: "#8a8f9c", items: [
      { e: "🖤", h: 260 }, { e: "🌙", h: 240 }, { e: "🐧", h: 250 }, { e: "🕶️", h: 255 },
      { e: "🎩", h: 255 }, { e: "🔭", h: 240 }, { e: "🌑", h: 255 }, { e: "💤", h: 250 },
      { e: "🌚", h: 255 }, { e: "🐺", h: 255 }, { e: "🖋️", h: 255 }, { e: "⚫", h: 260 }
    ]}
  ];
  var ALL = [];
  GROUPS.forEach(function (g) { ALL = ALL.concat(g.items); });

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 存储满等静默 */ } }
  function pid() { return (Chat.getPartnerId && Chat.getPartnerId()) || ""; }
  function store() { var s = lsGet(LS_KEY); return (s && typeof s === "object") ? s : {}; }
  function partnerData() {
    var s = store(), p = pid();
    if (!s[p] || typeof s[p] !== "object" || !("mine" in s[p])) { s[p] = { mine: null, partner: null }; lsSet(LS_KEY, s); }
    return s[p];
  }
  function saveData(data) { var _s = store(); _s[pid()] = data; lsSet(LS_KEY, _s); }

  function hueDist(a, b) {
    var d = Math.abs(a - b);
    return d > 180 ? 360 - d : d;
  }
  function pickReplyEmoji(myH) {
    var near = ALL.filter(function (it) { return hueDist(it.h, myH) <= 28; });
    if (near.length && Math.random() < 0.72) { return near[Math.floor(Math.random() * near.length)]; }
    return ALL[Math.floor(Math.random() * ALL.length)];
  }

  /* ---- 渲染贴纸层：对标拾心界壁纸式砖墙交错平铺 ----
     5列×7行，奇数行偏移半格且少一格；双字号（24/18）交替、轻微旋转（-6/0/6/0）交替、
     60% 透明度、柔和投影；mine / partner 交替分布，间距一致、无重叠 */
  function renderLayer() {
    var layer = document.getElementById("chatBgStickerLayer");
    if (!layer) { return; }
    var data = partnerData();
    var all = [];
    if (data.mine) { all.push(data.mine); }
    if (data.partner) { all.push(data.partner); }
    if (!all.length) { layer.innerHTML = ""; return; }
    var cellW = 100 / COLS, cellH = 100 / ROWS;
    var padX = cellW * 0.24, padY = cellH * 0.18;
    var rotMap = [-6, 0, 6, 0];
    var html = "", idx = 0, row, col;
    for (row = 0; row < ROWS; row++) {
      var offset = (row % 2 === 1) ? cellW / 2 : 0;
      var perRow = (row % 2 === 1) ? COLS - 1 : COLS;
      for (col = 0; col < perRow; col++) {
        var it = all[idx % all.length];
        var left = col * cellW + offset + padX;
        var top = row * cellH + padY;
        var size = (idx % 2 === 0 ? 24 : 18);
        var rot = rotMap[(row + col) % rotMap.length];
        var w = cellW - padX * 2, h = cellH - padY * 2;
        html += '<span class="chat-bg-sticker' + (it.reply ? " is-reply" : "") + '" style="left:' +
          left.toFixed(2) + "%;top:" + top.toFixed(2) + "%;width:" + w.toFixed(2) + "%;height:" + h.toFixed(2) +
          "%;display:flex;align-items:center;justify-content:center;font-size:calc(" + size + "px * var(--ui, 1));" +
          "opacity:0.6;transform:rotate(" + rot + "deg);--sc-sticker-rot:" + rot + "deg;--sc-sticker-op:0.6\">" +
          esc(it.e) + "</span>";
        idx++;
      }
    }
    layer.innerHTML = html;
  }

  /* ---- 背景色：随已贴表情主色淡变为偏白对应色 ---- */
  function applyStickerBgColor(opts) {
    var room = document.querySelector('.page[data-page="chat-room"]');
    if (!room) { return; }
    var data = partnerData();
    var h = (data.mine && typeof data.mine.h === "number") ? data.mine.h : null;
    if (h === null) {
      if (opts && opts.clear) { room.style.removeProperty("--chat-bg"); }
      return;
    }
    var dark = document.documentElement.getAttribute("data-theme-mode") === "dark";
    var bg;
    if (data.mine && data.mine.gray) {
      /* 白色系：贴出后背景为偏浅灰（低饱和灰调，不带彩色色相） */
      bg = dark
        ? "linear-gradient(180deg, hsl(210, 10%, 30%), hsl(210, 8%, 22%))"
        : "linear-gradient(180deg, hsl(210, 6%, 96%), hsl(210, 5%, 89%))";
    } else {
      bg = dark
        ? "linear-gradient(180deg, hsl(" + Math.round(h) + ", 30%, 26%), hsl(" + Math.round(h) + ", 26%, 18%))"
        : "linear-gradient(180deg, hsl(" + Math.round(h) + ", 42%, 97%), hsl(" + Math.round(h) + ", 40%, 91%))";
    }
    room.style.setProperty("--chat-bg", bg);
  }

  /* ---- 点击表情：贴出 mine 并整面平铺，稍后对方错峰回贴 ---- */
  function stickEmoji(e, h, gray) {
    if (!e) { return; }
    var data = partnerData();
    data.mine = { e: e, h: Number(h) || 0, gray: gray ? 1 : 0 };
    data.partner = null;
    saveData(data);
    renderLayer();
    applyStickerBgColor();
    closeStickerBg();
    scheduleReply(Number(h) || 0);
  }
  function scheduleReply(myH) {
    var target = pid();
    window.setTimeout(function () {
      if (pid() !== target) { return; }
      var data = partnerData();
      if (!data.mine) { return; }
      var item = pickReplyEmoji(myH);
      data.partner = { e: item.e, h: item.h, reply: true };
      saveData(data);
      renderLayer();
      applyStickerBgColor();
    }, 1600 + Math.random() * 1400);
  }

  /* ---- 面板 ---- */
  function renderStickerPicker() {
    var body = document.getElementById("chatStickerBody");
    if (!body) { return; }
    var html = "", gi, ii;
    for (gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi];
      html += '<div class="chat-sticker-group"><div class="chat-sticker-group-title"><span class="chat-sticker-dot" style="background:' + g.dot + '"></span>' + esc(g.name) + "</div><div class=\"chat-sticker-grid\">";
      for (ii = 0; ii < g.items.length; ii++) {
        var it = g.items[ii];
        html += '<button class="chat-sticker-emoji" type="button" onclick="SnowCrystal.Chat.stickEmoji(\'' + it.e + "'," + it.h + (g.gray ? ",1" : "") + ')" title="贴满背景">' + esc(it.e) + "</button>";
      }
      html += "</div></div>";
    }
    body.innerHTML = html;
  }
  function openStickerBg() {
    var mask = document.getElementById("chatStickerMask"), panel = document.getElementById("chatStickerPanel");
    if (!mask || !panel) { return; }
    if (mask.parentNode && mask.parentNode !== document.body) { document.body.appendChild(mask); }
    if (panel.parentNode && panel.parentNode !== document.body) { document.body.appendChild(panel); }
    renderStickerPicker();
    mask.classList.add("is-open");
    panel.classList.add("is-open");
  }
  function closeStickerBg() {
    var mask = document.getElementById("chatStickerMask"), panel = document.getElementById("chatStickerPanel");
    if (mask) { mask.classList.remove("is-open"); }
    if (panel) { panel.classList.remove("is-open"); }
  }
  function clearBgStickers() {
    var s = store(), p = pid();
    if (s[p]) { delete s[p]; }
    lsSet(LS_KEY, s);
    renderLayer();
    applyStickerBgColor({ clear: true });
    closeStickerBg();
  }
  function restoreForCurrentPartner() {
    renderLayer();
    applyStickerBgColor();
  }

  /* ---- 挂载导出 ---- */
  Chat.openStickerBg = openStickerBg;
  Chat.closeStickerBg = closeStickerBg;
  Chat.stickEmoji = stickEmoji;
  Chat.clearBgStickers = clearBgStickers;
  Chat.restoreBgStickers = restoreForCurrentPartner;

  /* ---- 进入聊天室时恢复贴纸：包装 applyStored（openChatRoom 内动态调用） ---- */
  var _origApplyStored = Chat.applyStored;
  if (typeof _origApplyStored === "function") {
    Chat.applyStored = function () {
      var r = _origApplyStored.apply(this, arguments);
      try { restoreForCurrentPartner(); } catch (e) { /* 忽略 */ }
      return r;
    };
  }
})();
