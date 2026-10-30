/* ============================================================
   昨日回响（echo）v3 —— 今日絮语聊天情况日历 + 角色调换回顾
   - 进入昨日回响后展示「今日絮语」聊天情况日历（有聊天记录的日期高亮）
   - 选择某一天进入体验：按那天聊天顺序，角色调换一路回顾
     · 原对方发送的消息 → 我方在底部三选一（1 个当天正确内容 + 2 个
       随机从字卡库调取的错误选项），选对才发送，选错标注该选项错误
     · 原我方发送的消息 → 对方自动发送出原本那天我方发送的内容
   - 数据来源：SnowCrystal.Chat.loadChat()（snowcrystal.chat.v1）
     字卡库：window.loadWcl()（snowcrystal.wordcard.v2）
   - 不修改任何聊天原始数据，仅按日期读取回顾
   ============================================================ */
(function () {
  if (window.__echoLoaded) { return; }
  window.__echoLoaded = true;

  var S = window.SnowCrystal = window.SnowCrystal || {};

  /* ---------- 基础工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayKeyOf(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function fmtHM(ts) {
    var d = new Date(ts || Date.now());
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  var WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
  function fmtDayCN(dayKey) {
    var p = String(dayKey || "").split("-");
    if (p.length !== 3) { return dayKey || ""; }
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Number(p[1]) + "月" + Number(p[2]) + "日 · 周" + WEEK_CN[d.getDay()];
  }
  function monthDayCN(dayKey) {
    var p = String(dayKey || "").split("-");
    if (p.length !== 3) { return dayKey || ""; }
    return Number(p[1]) + "月" + Number(p[2]) + "日";
  }
  /* 与某人的连续聊天天数：取该 partner 全部消息日期，从最近一天往前连续计数 */
  function streakOf(partnerId) {
    var c = loadChatData();
    var msgs = (c.messages && c.messages[partnerId]) || [];
    var seen = {}, days = [], i, m, k, ds, u;
    for (i = 0; i < msgs.length; i++) {
      m = msgs[i];
      if (!m || !m.time) { continue; }
      k = dayKeyOf(m.time);
      if (seen[k]) { continue; }
      seen[k] = 1;
      ds = k.split("-");
      u = Date.UTC(Number(ds[0]), Number(ds[1]) - 1, Number(ds[2])) / 86400000;
      days.push(u);
    }
    if (!days.length) { return 0; }
    days.sort(function (a, b) { return a - b; });
    var last = days[days.length - 1], n = 1, j;
    for (j = days.length - 2; j >= 0; j--) {
      if (days[j] === last - n) { n++; } else { break; }
    }
    return n;
  }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function textOf(item) {
    if (item == null) { return ""; }
    return typeof item === "string" ? item : String(item.text || "");
  }

  /* ---------- 数据读取 ---------- */
  function loadChatData() {
    return (S.Chat && S.Chat.loadChat) ? S.Chat.loadChat() : { chats: [], messages: {} };
  }
  function partnerNameOf(pid) {
    var c = loadChatData();
    if (c.chats && Array.isArray(c.chats)) {
      for (var i = 0; i < c.chats.length; i++) {
        if (c.chats[i] && c.chats[i].id === pid) { return c.chats[i].name || "对方"; }
      }
    }
    return "对方";
  }
  /* ---------- 头像渲染（对齐「今日絮语」聊天室 12-chat.js 的头像逻辑） ---------- */
  var MY_KEY = "snowcrystal.account.my.v1";
  function loadMy() {
    try {
      var raw = window.localStorage.getItem(MY_KEY);
      var m = raw ? JSON.parse(raw) : null;
      return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
    } catch (e) { return { name: "", avatar: "", shape: "square" }; }
  }
  function partnerInfoOf(pid) {
    var c = loadChatData();
    if (c.chats && Array.isArray(c.chats)) {
      for (var i = 0; i < c.chats.length; i++) {
        var p = c.chats[i];
        if (p && p.id === pid) { return { name: p.name || "对方", avatar: p.avatar || "", shape: p.shape || "square" }; }
      }
    }
    return { name: "对方", avatar: "", shape: "square" };
  }
  /* 生成一条消息的头像：有 avatar 用 <img class="chat-avatar-img">，无则用 <span class="chat-avatar-ph">首字</span>；
     形状跟随账号设置：shape==="circle" → chat-avatar-circle，否则 chat-avatar-square */
  function avatarHtmlFor(kind, pid) {
    var info = kind === "me" ? loadMy() : partnerInfoOf(pid);
    var shapeCls = info.shape === "circle" ? " chat-avatar-circle" : " chat-avatar-square";
    var fallbackName = kind === "me" ? "我" : "对";
    var inner = info.avatar
      ? '<img class="chat-avatar-img" src="' + esc(info.avatar) + '" alt="">'
      : '<span class="chat-avatar-ph">' + esc(String(info.name || fallbackName).slice(0, 1)) + "</span>";
    return '<span class="chat-msg-avatar' + shapeCls + '">' + inner + "</span>";
  }
  /* 可参与回顾的消息类型：普通文本 + 红包/问答/转发/语音/表情包/图片（同类型选项回顾）；
     仍跳过：拍一拍/通话/撤回等系统消息 */
  var REVIEW_TYPES = { text: 1, redpack: 1, qa: 1, forward: 1, voice: 1, sticker: 1, image: 1 };
  function isReviewable(m) {
    if (!m || !m.time) { return false; }
    if (m.isRecall || m.isCall) { return false; }
    var t = m.msgType || "text";
    if (!REVIEW_TYPES[t]) { return false; }
    if (t === "text") { return String(m.text || "").trim().length > 0; }
    return true;
  }
  /* 聊天情况统计：dateKey -> { count, partnerIds:[], partnerCount } */
  function collectDayStats() {
    var c = loadChatData();
    var out = {}, pid, msgs, i, m, k, st;
    for (pid in c.messages) {
      if (!Object.prototype.hasOwnProperty.call(c.messages, pid)) { continue; }
      msgs = c.messages[pid] || [];
      for (i = 0; i < msgs.length; i++) {
        m = msgs[i];
        if (!m || !m.time) { continue; }
        k = dayKeyOf(m.time);
        st = out[k] = out[k] || { count: 0, partnerIds: [] };
        st.count++;
        if (st.partnerIds.indexOf(pid) < 0) { st.partnerIds.push(pid); }
      }
    }
    return out;
  }

  /* ---------- 字卡库错误选项 ---------- */
  var _wordPoolCache = null;
  /* 字卡词条池：仅 main(自己说的话) —— 排除 quote(格言)/pat(拍一拍)/kao(颜文字)/emoji，
     避免错误项混入格言等与真实聊天观感不符的内容 */
  function wordPool(force) {
    if (_wordPoolCache && !force) { return _wordPoolCache; }
    var w = (typeof window.loadWcl === "function") ? window.loadWcl() : null;
    var out = [], i, j, k, gs, items, t;
    if (w && typeof w === "object") {
      var keys = ["main"];
      for (i = 0; i < keys.length; i++) {
        gs = w[keys[i]];
        if (!Array.isArray(gs)) { continue; }
        for (j = 0; j < gs.length; j++) {
          items = (gs[j] && gs[j].items) || [];
          for (k = 0; k < items.length; k++) {
            t = textOf(items[k]).trim();
            if (t) { out.push(t); }
          }
        }
      }
    }
    _wordPoolCache = out;
    return out;
  }
  /* 颜文字池：优先取字卡库 kao 分组（开心/伤心/生气/惊讶/尴尬/爱心等），不足时用内置常见颜文字列表兜底 */
  var _kaoPoolCache = null;
  function kaoPool(force) {
    if (_kaoPoolCache && !force) { return _kaoPoolCache; }
    var w = (typeof window.loadWcl === "function") ? window.loadWcl() : null;
    var out = [], i, j, gs, items, t;
    if (w && typeof w === "object" && Array.isArray(w.kao)) {
      for (i = 0; i < w.kao.length; i++) {
        gs = w.kao[i];
        items = (gs && gs.items) || [];
        for (j = 0; j < items.length; j++) {
          t = textOf(items[j]).trim();
          if (t) { out.push(t); }
        }
      }
    }
    var fallback = ["(ω_;)", "(；一_一)", "(´･_･`)", "(・ω・)", "(￣▽￣*)", "(T_T)", "_(:з」∠)_", "ヽ(￣▽￣)ノ", "(=´ω`=)", "(｡•́︿•̀｡)", "(✿◡‿◡)", "(￣ω￣)", "(°▽°)", "(╥﹏╥)", "(→_→)", "(￣ヘ￣)", "(◠‿◠✿)", "┐(´д`)┌", "(；￣Д￣)", "(｡•́︵•̀｡)"];
    for (i = 0; i < fallback.length; i++) {
      if (out.indexOf(fallback[i]) < 0) { out.push(fallback[i]); }
    }
    _kaoPoolCache = out;
    return out;
  }
  /* emoji 池：取字卡库 emoji 分组（按输入法归类），与颜文字合成「字卡+颜文字/emoji 混搭」的错误项观感 */
  var _emojiPoolCache = null;
  function emojiPool(force) {
    if (_emojiPoolCache && !force) { return _emojiPoolCache; }
    var w = (typeof window.loadWcl === "function") ? window.loadWcl() : null;
    var out = [], i, j, gs, items, t;
    if (w && typeof w === "object" && Array.isArray(w.emoji)) {
      for (i = 0; i < w.emoji.length; i++) {
        gs = w.emoji[i];
        items = (gs && gs.items) || [];
        for (j = 0; j < items.length; j++) {
          t = textOf(items[j]).trim();
          if (t) { out.push(t); }
        }
      }
    }
    _emojiPoolCache = out;
    return out;
  }
  /* 颜文字 + emoji 混搭池：错误项尾部表情统一从该池抽取（颜文字优先，emoji 补充） */
  function faceMixPool(force) {
    var a = kaoPool(force), b = emojiPool(force), out = a.slice(), i;
    for (i = 0; i < b.length; i++) { if (out.indexOf(b[i]) < 0) { out.push(b[i]); } }
    return out;
  }
  /* 生成三选项：1 正确（当天原消息）+ 2 个「字卡词条 + 颜文字/emoji 混搭」组合错误项（洗牌打乱顺序） */
  function buildOptions(correct) {
    var pool = wordPool(), seen = {}, uniq = [], i, t;
    for (i = 0; i < pool.length; i++) {
      t = pool[i];
      if (!t || t === correct || seen[t]) { continue; }
      seen[t] = 1;
      uniq.push(t);
    }
    shuffle(uniq);
    var kaos = faceMixPool();
    var wrongs = [], k1, k2;
    for (i = 0; i < 2 && uniq.length; i++) {
      k1 = uniq[i];
      k2 = kaos[Math.floor(Math.random() * kaos.length)];
      wrongs.push(k1 + " " + k2);
    }
    /* 极端兜底：词条不足 2 个时用两个颜文字拼接 */
    var guard = 0;
    while (wrongs.length < 2 && kaos.length >= 2 && guard < 20) {
      var a = kaos[Math.floor(Math.random() * kaos.length)];
      var b = kaos[Math.floor(Math.random() * kaos.length)];
      var combo = a + " " + b;
      if (combo !== correct && wrongs.indexOf(combo) < 0) { wrongs.push(combo); }
      guard++;
    }
    var opts = [correct].concat(wrongs);
    shuffle(opts);
    return opts;
  }

  /* ---------- 同类型选项与消息展示辅助 ---------- */
  /* 金额显示：整数省略小数、保留两位小数点（与聊天室观感一致） */
  function fmtRp(v) {
    var n = Number(v || 0);
    if (isNaN(n) || n < 0) { n = 0; }
    return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }
  /* 语音时长：分′秒″ */
  function fmtDur(sec) {
    var n = Number(sec || 0);
    if (isNaN(n) || n < 0) { n = 0; }
    var mm = Math.floor(n / 60), ss = Math.round(n % 60);
    if (ss === 60) { mm++; ss = 0; }
    return mm + "′" + (ss < 10 ? "0" : "") + ss + "″";
  }
  /* 转发摘要（对齐聊天室 fwdCardPreviewText 的观感） */
  function fwdPreview(m) {
    var ot = m.origType || "";
    if (ot === "qa" || m.innerType === "qa") { return "[问答] " + String(m.q || ""); }
    if (ot === "redpack") { return "[红包] " + String(m.wish || ""); }
    if (ot === "pat") { return "[拍一拍] " + String(m.text || ""); }
    if (ot === "call" || m.isCall) { return "[通知] " + String(m.text || ""); }
    if (m.isRecall) { return "[通知] " + String(m.text || m.recallText || ""); }
    if (m.img) { return "[图片]"; }
    if (m.voice) { return "[语音] " + fmtDur(m.voiceDur || 0); }
    return String(m.text || "");
  }
  /* 两条消息是否同一内容（按类型关键字段对比） */
  function sameMsg(a, b) {
    if (!a || !b) { return false; }
    var ta = a.msgType || "text", tb = b.msgType || "text";
    if (ta !== tb) { return false; }
    switch (ta) {
      case "redpack": return String(a.amount || "") === String(b.amount || "") && String(a.wish || "") === String(b.wish || "");
      case "qa": return String(a.q || "") === String(b.q || "") && JSON.stringify(a.opts || []) === JSON.stringify(b.opts || []);
      case "voice": return String(a.voiceText || "") === String(b.voiceText || "") && Number(a.voiceDur || 0) === Number(b.voiceDur || 0);
      case "forward": return String(a.text || "") === String(b.text || "") && String(a.origType || "") === String(b.origType || "");
      case "sticker":
      case "image":
        if (a.__fakeTag || b.__fakeTag) { return !!a.__fakeTag && a.__fakeTag === b.__fakeTag; }
        return String(a.img || "") === String(b.img || "");
      default: return String(a.text || "") === String(b.text || "");
    }
  }
  /* 从该 partner 全部历史消息收集同类型候选（排除正确项），作为错误项池 */
  function typePool(partnerId, type, exclude) {
    var c = loadChatData();
    var msgs = (c.messages && c.messages[partnerId]) || [];
    var out = [], i, m;
    for (i = 0; i < msgs.length; i++) {
      m = msgs[i];
      if (!m || !m.time) { continue; }
      if ((m.msgType || "text") !== type) { continue; }
      if (sameMsg(m, exclude)) { continue; }
      out.push(m);
    }
    return out;
  }
  /* 兜底生成同类型干扰项（历史同类不足时使用，保证选项同类型） */
  var FALLBACK_REDPACK_WISH = ["小小心意", "给你的红包", "一直喜欢你", "要开心呀", "么么哒", "想你了"];
  var FALLBACK_QA = [
    { q: "周末想去哪里玩呀？", opts: ["逛街", "看电影", "在家躺"] },
    { q: "晚饭想吃什么？", opts: ["火锅", "烧烤", "面条"] },
    { q: "明天见吗？", opts: ["见", "不见", "看你"] },
    { q: "这首歌好听吗？", opts: ["好听", "一般", "没感觉"] }
  ];
  function genTypeFallback(type, base) {
    var t = type || "text", m = null;
    switch (t) {
      case "redpack":
        m = { msgType: "redpack", amount: 1 + Math.floor(Math.random() * 520), wish: FALLBACK_REDPACK_WISH[Math.floor(Math.random() * FALLBACK_REDPACK_WISH.length)] };
        break;
      case "qa":
        m = FALLBACK_QA[Math.floor(Math.random() * FALLBACK_QA.length)];
        m = { msgType: "qa", q: m.q, opts: m.opts.slice() };
        break;
      case "voice":
        m = { msgType: "voice", voiceText: "语音消息", voiceDur: 2 + Math.floor(Math.random() * 20) };
        break;
      case "forward":
        m = { msgType: "forward", text: "转发：" + (wordPool()[Math.floor(Math.random() * wordPool().length)] || "一条聊天记录"), origType: "text" };
        break;
      case "sticker":
        m = { msgType: "sticker", img: "", __fakeTag: "s" + Math.floor(Math.random() * 1e6) };
        break;
      case "image":
        m = { msgType: "image", img: "", __fakeTag: "i" + Math.floor(Math.random() * 1e6) };
        break;
      default:
        m = { msgType: "text", text: (wordPool()[Math.floor(Math.random() * wordPool().length)] || "") + " " + (faceMixPool()[Math.floor(Math.random() * faceMixPool().length)] || "") };
    }
    return m;
  }
  /* 选项按钮文案 */
  function typeItemLabel(m) {
    var t = (m && m.msgType) || "text";
    switch (t) {
      case "redpack": return "红包 ¥" + fmtRp(m.amount) + " · " + (m.wish || "");
      case "qa": return "[问答] " + (m.q || "");
      case "forward": return "[转发] " + fwdPreview(m);
      case "voice": return "[语音] " + (m.voiceText || "语音") + " · " + fmtDur(m.voiceDur);
      case "sticker": return "[表情包]";
      case "image": return "[图片]";
      default: return m.text || "";
    }
  }
  /* 选项按钮 HTML：表情包/图片可内联缩略图，其余走纯文本 */
  function typeItemHtml(m) {
    var t = (m && m.msgType) || "text";
    if (t === "sticker" || t === "image") {
      var img = m.img || "";
      if (/^(data:|https?:|\/)/i.test(img)) {
        return '<span class="echo-opt-type">' + (t === "sticker" ? "[表情包]" : "[图片]") + '</span><img class="echo-opt-img" src="' + esc(img) + '" alt="">';
      }
    }
    return esc(typeItemLabel(m));
  }
  /* 生成三选项：普通文本走 buildOptions（字卡+颜文字/emoji 混搭），
     红包/问答/转发/语音/表情包/图片走「同类型选项」：1 个当天正确项 + 2 个同类型干扰项（历史同类优先，不足兜底生成） */
  function buildTypedOptions(m, partnerId) {
    var type = (m && m.msgType) || "text";
    var i, j, out = [];
    if (type === "text") {
      var optsTxt = buildOptions(m.text);
      for (i = 0; i < optsTxt.length; i++) {
        out.push({ m: (optsTxt[i] === m.text ? m : { msgType: "text", text: optsTxt[i] }), label: optsTxt[i], html: "" });
      }
      return out;
    }
    var pool = typePool(partnerId, type, m);
    shuffle(pool);
    var wrongs = [], w;
    for (j = 0; j < pool.length && wrongs.length < 2; j++) {
      w = pool[j];
      if (sameMsg(w, m)) { continue; }
      wrongs.push(w);
    }
    var guard = 0;
    while (wrongs.length < 2 && guard < 30) {
      var fb = genTypeFallback(type, m);
      if (!sameMsg(fb, m) && !sameMsg(fb, wrongs[0]) && !sameMsg(fb, wrongs[1])) { wrongs.push(fb); }
      guard++;
    }
    var opts = [m].concat(wrongs);
    shuffle(opts);
    for (i = 0; i < opts.length; i++) {
      out.push({ m: opts[i], label: typeItemLabel(opts[i]), html: typeItemHtml(opts[i]) });
    }
    return out;
  }

  /* ---------- 日历视图 ---------- */
  var calView = { y: 0, m: 0 };
  /* 进入回顾：复用 echo 页 page-head，标题改为回顾日期；返回键切为 exitReview 语义 */
  function setEchoHeadForReview(dayKey) {
    var head = document.querySelector('html body .page[data-page="echo"] .page-head');
    if (!head) { return; }
    var t = head.querySelector(".page-title");
    if (t) { t.textContent = monthDayCN(dayKey); }
    var b = head.querySelector(".back-btn");
    if (b) {
      b.setAttribute("onclick", "SnowCrystal.Echo.exitReview()");
      b.setAttribute("title", "返回列表");
      b.setAttribute("aria-label", "返回列表");
    }
    document.body.classList.add("echo-reviewing");
  }
  /* 退出回顾：恢复 page-head 标题为「昨日回响」、返回键回首页 */
  function resetEchoHead() {
    var head = document.querySelector('html body .page[data-page="echo"] .page-head');
    if (!head) { return; }
    var t = head.querySelector(".page-title");
    if (t) { t.textContent = "昨日回响"; }
    var b = head.querySelector(".back-btn");
    if (b) {
      b.setAttribute("onclick", "SnowCrystal.backPage('home')");
      b.setAttribute("title", "返回首页");
      b.setAttribute("aria-label", "返回首页");
    }
    document.body.classList.remove("echo-reviewing");
  }
  function openEcho() {
    if (S.switchPage) { S.switchPage("echo"); }
    var now = new Date();
    calView = { y: now.getFullYear(), m: now.getMonth() };
    renderEcho();
  }
  function renderEcho() {
    resetEchoHead();
    var wrap = document.getElementById("echoWrap");
    if (!wrap) { return; }
    var stats = collectDayStats();
    var hasAny = false, k;
    for (k in stats) { if (Object.prototype.hasOwnProperty.call(stats, k)) { hasAny = true; break; } }
    var html =
      '<div class="echo-cal echo-fade">' +
      '<div class="echo-cal-note">' +
      (hasAny
        ? '按日期查看「今日絮语」的聊天记录，点击进入角色调换回顾'
        : '「今日絮语」还没有聊天记录，先去聊一聊，明天再来回顾') +
      "</div>" +
      '<div class="echo-cal-list-title">' + (hasAny ? "可回顾日期" : "") + "</div>" +
      '<div class="echo-cal-list" id="echoCalList"></div>' +
      "</div>";
    wrap.innerHTML = html;
    renderDayList();
  }
  function renderCalSheet() {
    var grid = document.getElementById("echoCalGrid");
    var title = document.getElementById("echoCalTitle");
    if (!grid) { return; }
    var y = calView.y, m = calView.m;
    if (title) { title.textContent = y + "年" + (m + 1) + "月"; }
    var stats = collectDayStats();
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
    var now = new Date();
    var html = "", i, d, cls, k;
    for (i = 0; i < 42; i++) {
      d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      k = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
      cls = "echo-cal-cell";
      if (d.getMonth() !== m) { cls += " is-out"; }
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) { cls += " is-today"; }
      if (stats[k]) {
        cls += " has-msg";
        html += '<button type="button" class="' + cls + '" onclick="SnowCrystal.Echo.pickDay(\'' + k + '\')">' +
          d.getDate() + '<span class="echo-cal-dot">' + Math.min(stats[k].count, 99) + "</span></button>";
      } else {
        html += '<span class="' + cls + '">' + d.getDate() + "</span>";
      }
    }
    grid.innerHTML = html;
  }
  function calShift(step) {
    var d = new Date(calView.y, calView.m + step, 1);
    calView = { y: d.getFullYear(), m: d.getMonth() };
    renderCalSheet();
  }
  function renderDayList() {
    var listEl = document.getElementById("echoCalList");
    if (!listEl) { return; }
    var stats = collectDayStats();
    var keys = Object.keys(stats).sort().reverse();
    if (!keys.length) {
      listEl.innerHTML = "";
      return;
    }
    var html = "", i, st, names, j;
    for (i = 0; i < keys.length; i++) {
      st = stats[keys[i]];
      names = [];
      for (j = 0; j < st.partnerIds.length; j++) { names.push(partnerNameOf(st.partnerIds[j])); }
      html +=
        '<button type="button" class="echo-cal-item" onclick="SnowCrystal.Echo.pickDay(\'' + keys[i] + '\')">' +
        '<span class="echo-cal-item-date">' + esc(fmtDayCN(keys[i])) + "</span>" +
        '<span class="echo-cal-item-info">与 ' + esc(names.join("、")) + " · " + st.count + " 条消息</span>" +
        '<span class="echo-cal-item-go">›</span>' +
        "</button>";
    }
    listEl.innerHTML = html;
  }
  /* 选择某一天：单对象直接进入，多对象先选对象（partnerId 存在时直接进入该对象回顾） */
  function pickDay(dayKey, partnerId) {
    var stats = collectDayStats();
    var st = stats[dayKey];
    if (!st || !st.partnerIds.length) { return; }
    if (partnerId) {
      if (st.partnerIds.indexOf(partnerId) >= 0) { openReview(dayKey, partnerId); }
      return;
    }
    if (st.partnerIds.length === 1) { openReview(dayKey, st.partnerIds[0]); return; }
    /* 多对象：渲染对象选择卡 */
    var wrap = document.getElementById("echoWrap");
    if (!wrap) { return; }
    var html =
      '<div class="echo-cal echo-fade">' +
      '<div class="echo-cal-note">这一天有多个聊天对象，选择要回顾的对方</div>' +
      '<div class="echo-cal-list">';
    for (var i = 0; i < st.partnerIds.length; i++) {
      var pid = st.partnerIds[i];
      var cnt = 0, c = loadChatData(), msgs = (c.messages && c.messages[pid]) || [];
      for (var j = 0; j < msgs.length; j++) { if (msgs[j] && msgs[j].time && dayKeyOf(msgs[j].time) === dayKey) { cnt++; } }
      html +=
        '<button type="button" class="echo-cal-item" onclick="SnowCrystal.Echo.pickDay(\'' + dayKey + '\',\'' + pid + '\')">' +
        '<span class="echo-cal-item-date">' + esc(partnerNameOf(pid)) + "</span>" +
        '<span class="echo-cal-item-info">' + cnt + " 条消息</span>" +
        '<span class="echo-cal-item-go">›</span>' +
        "</button>";
    }
    html += "</div></div>";
    wrap.innerHTML = html;
    setEchoHeadForReview(dayKey);
  }

  /* ---------- 回顾体验 ---------- */
  var review = null; /* { dayKey, partnerId, partnerName, msgs:[{type,text,time}], idx, skipped } */
  function openReview(dayKey, partnerId) {
    var c = loadChatData();
    var all = (c.messages && c.messages[partnerId]) || [];
    var msgs = [], skipped = 0, i, m;
    for (i = 0; i < all.length; i++) {
      m = all[i];
      if (!m || !m.time || dayKeyOf(m.time) !== dayKey) { continue; }
      if (!isReviewable(m)) { skipped++; continue; }
      msgs.push({ type: (m.type === "self" ? "self" : "other"), msgType: m.msgType || "text", text: String(m.text || "").trim(), time: m.time, raw: m });
    }
    review = {
      dayKey: dayKey,
      partnerId: partnerId,
      partnerName: partnerNameOf(partnerId),
      msgs: msgs,
      idx: 0,
      skipped: skipped
    };
    setEchoHeadForReview(review.dayKey);
    renderReviewView();
  }
  function renderReviewView() {
    var wrap = document.getElementById("echoWrap");
    if (!wrap || !review) { return; }
    var html =
      '<div class="echo-review echo-fade">' +
      (review.skipped > 0
        ? '<div class="echo-review-skip">已跳过 ' + review.skipped + ' 条系统消息（拍一拍/通话/撤回）</div>'
        : "") +
      '<div class="chat-room-body echo-review-body" id="echoReviewBody"></div>' +
      '<div class="chat-room-input echo-review-bar" id="echoReviewAsk">' +
      '<div class="chat-input-wrap echo-review-input">' +
      '<textarea class="echo-review-trigger" id="echoReviewTrigger" readonly rows="1" placeholder="点击选择回复" aria-label="点击选择回复" onclick="SnowCrystal.Echo.openOpts()"></textarea>' +
      "</div>" +
      "</div>" +
      '<div class="echo-opt-mask" id="echoOptMask" onclick="SnowCrystal.Echo.closeOpts()"></div>' +
      '<div class="echo-opt-panel" id="echoOptPanel" role="dialog" aria-label="选择回复">' +
      '<div class="echo-opt-head"><span class="echo-opt-title">选择回复</span>' +
      '<button class="echo-opt-close" type="button" aria-label="关闭" onclick="SnowCrystal.Echo.closeOpts()">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button></div>" +
      '<div class="echo-opt-list" id="echoOptList"></div>' +
      "</div>" +
      "</div>";
    wrap.innerHTML = html;
    if (!review.msgs.length) {
      finishReview("这一天没有可回顾的消息，换一天试试吧");
      return;
    }
    updateProgress();
    advance();
  }
  function updateProgress() {
    var el = document.getElementById("echoReviewProg");
    if (el) { el.textContent = review.idx + " / " + review.msgs.length; }
  }
  function advance() {
    if (!review) { return; }
    if (review.idx >= review.msgs.length) {
      finishReview("这一天回顾完成，与 " + review.partnerName + " 的聊天已全部角色调换回顾一遍");
      return;
    }
    var m = review.msgs[review.idx];
    if (m.type === "self") {
      /* 原我方消息 → 对方自动发送（按原消息类型渲染） */
      setTriggerPlaceholder("等待对方回复…");
      appendMsgFor("them", m.raw, m.time);
      review.idx++;
      updateProgress();
      window.setTimeout(advance, 700);
    } else {
      /* 原对方消息 → 我方选择题发送 */
      renderOptions(m);
    }
  }
  /* 追加一条回顾消息：对齐「今日絮语」聊天室 chat-msg 结构（头像 + 气泡 + 时间）；
     text 走旧 appendMsg，特殊类型走 bubbleHtmlFor 按同类型渲染 */
  function appendMsg(side, text, time) {
    return appendMsgFor(side, { msgType: "text", text: text }, time);
  }
  function appendMsgFor(side, m, time) {
    var body = document.getElementById("echoReviewBody");
    if (!body) { return null; }
    var isMe = side === "me";
    var who = isMe ? "我" : (review ? review.partnerName : "对方");
    var div = document.createElement("div");
    div.className = "chat-msg " + (isMe ? "is-self" : "is-other");
    div.innerHTML =
      avatarHtmlFor(isMe ? "other" : "me", review ? review.partnerId : "") +
      '<div class="chat-msg-col">' +
      bubbleHtmlFor(m, isMe) +
      '<div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtHM(time)) + " · " + esc(who) + "</span></div>" +
      "</div>";
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }
  /* 回顾气泡 HTML：按消息类型渲染同类型卡片（红包/问答/转发/语音/表情包/图片），普通文本走基础气泡 */
  function bubbleHtmlFor(m, isMe) {
    var t = (m && m.msgType) || "text";
    var cls = "chat-bubble" + (isMe ? " is-self" : " is-other");
    if (t === "redpack") {
      return '<div class="' + cls + ' echo-rp-card">' +
        '<span class="echo-rp-ico">¥</span>' +
        '<span class="echo-rp-body"><span class="echo-rp-amount">¥' + esc(fmtRp(m.amount)) + '</span><span class="echo-rp-wish">' + esc(m.wish || "") + "</span></span>" +
        '<span class="echo-rp-status">' + (isMe ? "待领取" : "点开看看") + "</span></div>";
    }
    if (t === "qa") {
      var q = m.q || "", oarr = m.opts || [], oh = "", oi;
      for (oi = 0; oi < oarr.length; oi++) {
        oh += '<div class="echo-qa-opt"><span class="echo-qa-opt-tag">&#9675;</span><span class="echo-qa-opt-text">' + esc(oarr[oi]) + "</span></div>";
      }
      return '<div class="' + cls + ' echo-qa-card"><div class="echo-qa-head">抉择一下</div><div class="echo-qa-q">' + esc(q) + '</div><div class="echo-qa-opts">' + oh + "</div></div>";
    }
    if (t === "forward") {
      return '<div class="' + cls + ' echo-fwd-card"><span class="chat-forward-tag">转发</span><div class="echo-fwd-preview">' + esc(fwdPreview(m)) + "</div></div>";
    }
    if (t === "voice") {
      return '<div class="' + cls + ' echo-voice-bubble"><span class="echo-voice-wave"></span><span class="echo-voice-dur">' + esc(fmtDur(m.voiceDur || 0)) + "</span></div>";
    }
    if (t === "sticker") {
      var img = m.img || "";
      var inner = /^(data:|https?:|\/)/i.test(img)
        ? '<img class="echo-sticker-img" src="' + esc(img) + '" alt="表情包">'
        : '<span class="echo-sticker-ph">[表情包]</span>';
      return '<div class="' + cls + ' echo-sticker-bubble">' + inner + "</div>";
    }
    if (t === "image") {
      var img2 = m.img || "";
      var inner2 = /^(data:|https?:|\/)/i.test(img2)
        ? '<img class="echo-img" src="' + esc(img2) + '" alt="图片">'
        : '<span class="echo-img-ph">[图片]</span>';
      return '<div class="' + cls + ' echo-img-bubble">' + inner2 + "</div>";
    }
    return '<div class="' + cls + '">' + esc(m.text || "") + "</div>";
  }
  function renderOptions(m) {
    var list = document.getElementById("echoOptList");
    if (!list) { return; }
    var opts = buildTypedOptions(m, review.partnerId);
    review.opts = opts;
    setTriggerPlaceholder("点击选择回复");
    var html = "", i;
    for (i = 0; i < opts.length; i++) {
      html += '<button type="button" class="echo-opt-btn" data-i="' + i + '" onclick="SnowCrystal.Echo.pickOption(' + i + ')">' + (opts[i].html || esc(opts[i].label)) + "</button>";
    }
    list.innerHTML = html;
    openOpts();
  }
  function setTriggerPlaceholder(t) {
    var el = document.getElementById("echoReviewTrigger");
    if (el) { el.placeholder = t || "点击选择回复"; }
  }
  function openOpts() {
    if (!review) { return; }
    var m = review.msgs[review.idx];
    if (!m || m.type !== "other") { return; }
    var mask = document.getElementById("echoOptMask");
    var panel = document.getElementById("echoOptPanel");
    if (!mask || !panel) { return; }
    mask.classList.add("is-open");
    panel.classList.add("is-open");
  }
  function closeOpts() {
    var mask = document.getElementById("echoOptMask");
    var panel = document.getElementById("echoOptPanel");
    if (mask) { mask.classList.remove("is-open"); }
    if (panel) { panel.classList.remove("is-open"); }
  }
  /* 用户点击选项 */
  function pickOption(i) {
    if (!review) { return; }
    var m = review.msgs[review.idx];
    if (!m || m.type !== "other") { return; }
    var btns = document.querySelectorAll(".echo-opt-btn");
    if (!btns[i] || btns[i].disabled) { return; }
    var opts = review.opts || [];
    if (sameMsg(opts[i].m, m.raw)) {
      /* 选对：标注正确 → 关闭弹窗 → 我方发出同类型消息 → 推进 */
      btns[i].classList.add("is-correct");
      btns[i].disabled = true;
      var j;
      for (j = 0; j < btns.length; j++) { if (j !== i) { btns[j].disabled = true; } }
      closeOpts();
      window.setTimeout(function () {
        if (!review) { return; }
        appendMsgFor("me", m.raw, m.time);
        review.idx++;
        updateProgress();
        window.setTimeout(advance, 650);
      }, 420);
    } else {
      /* 选错：标注该选项错误，不发送（弹窗保留可继续选择） */
      btns[i].classList.add("is-wrong");
      btns[i].disabled = true;
    }
  }
  function finishReview(msg) {
    var wrap = document.getElementById("echoWrap");
    if (!wrap) { return; }
    var html =
      '<div class="echo-review echo-fade">' +
      '<div class="echo-review-done">' +
      '<div class="echo-review-done-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5"/></svg></div>' +
      '<p class="echo-review-done-title">回顾完成</p>' +
      '<p class="echo-review-done-desc">' + esc(msg || "") + "</p>" +
      '<button class="echo-review-done-btn" type="button" onclick="SnowCrystal.Echo.exitReview()">返回列表</button>' +
      "</div>" +
      "</div>";
    wrap.innerHTML = html;
  }
  function exitReview() {
    review = null;
    renderEcho();
  }

  /* ---------- 导出 ---------- */
  S.openEcho = openEcho;
  S.Echo = S.Echo || {};
  S.Echo.renderEcho = renderEcho;
  S.Echo.calShift = calShift;
  S.Echo.pickDay = pickDay;
  S.Echo.pickOption = pickOption;
  S.Echo.openOpts = openOpts;
  S.Echo.closeOpts = closeOpts;
  S.Echo.exitReview = exitReview;
})();
