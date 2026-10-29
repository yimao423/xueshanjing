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
  /* 是否可参与文字回顾：普通文本消息（图片/语音/表情/红包/问答/通知等特殊类型跳过） */
  function isReviewable(m) {
    if (!m || !m.text) { return false; }
    if (m.isRecall || m.isCall) { return false; }
    if (m.msgType && m.msgType !== "text") { return false; }
    return String(m.text || "").trim().length > 0;
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
  /* 字卡词条池：main(自己说的话) / quote(格言) / pat，剔除 kao 颜文字与 emoji 单条，避免错误项直接是纯颜文字 */
  function wordPool(force) {
    if (_wordPoolCache && !force) { return _wordPoolCache; }
    var w = (typeof window.loadWcl === "function") ? window.loadWcl() : null;
    var out = [], i, j, k, gs, items, t;
    if (w && typeof w === "object") {
      var keys = ["main", "quote", "pat"];
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
  /* 生成三选项：1 正确（当天原消息）+ 2 个「字卡词条 + 随机颜文字」组合错误项（洗牌打乱顺序） */
  function buildOptions(correct) {
    var pool = wordPool(), seen = {}, uniq = [], i, t;
    for (i = 0; i < pool.length; i++) {
      t = pool[i];
      if (!t || t === correct || seen[t]) { continue; }
      seen[t] = 1;
      uniq.push(t);
    }
    shuffle(uniq);
    var kaos = kaoPool();
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
      b.setAttribute("title", "返回日历");
      b.setAttribute("aria-label", "返回日历");
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
      '<div class="echo-cal-head">' +
      '<button class="echo-cal-nav" type="button" onclick="SnowCrystal.Echo.calShift(-1)" aria-label="上一月" title="上一月">‹</button>' +
      '<div class="echo-cal-title" id="echoCalTitle"></div>' +
      '<button class="echo-cal-nav" type="button" onclick="SnowCrystal.Echo.calShift(1)" aria-label="下一月" title="下一月">›</button>' +
      "</div>" +
      '<div class="echo-cal-grid-head"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>' +
      '<div class="echo-cal-grid" id="echoCalGrid"></div>' +
      '<div class="echo-cal-note">' +
      (hasAny
        ? '高亮日期为「今日絮语」有聊天记录的日子，点击进入角色调换回顾'
        : '「今日絮语」还没有聊天记录，先去聊一聊，明天再来回顾') +
      "</div>" +
      '<div class="echo-cal-list-title">' + (hasAny ? "可回顾日期" : "") + "</div>" +
      '<div class="echo-cal-list" id="echoCalList"></div>' +
      "</div>";
    wrap.innerHTML = html;
    renderCalSheet();
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
      msgs.push({ type: (m.type === "self" ? "self" : "other"), text: String(m.text || "").trim(), time: m.time });
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
        ? '<div class="echo-review-skip">已跳过 ' + review.skipped + ' 条图片/语音等非文字消息</div>'
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
      finishReview("这一天没有可回顾的文字消息，换一天试试吧");
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
      /* 原我方消息 → 对方自动发送 */
      setTriggerPlaceholder("等待对方回复…");
      appendMsg("them", m.text, m.time);
      review.idx++;
      updateProgress();
      window.setTimeout(advance, 700);
    } else {
      /* 原对方消息 → 我方选择题发送 */
      renderOptions(m);
    }
  }
  /* 追加一条回顾消息：对齐「今日絮语」聊天室 chat-msg 结构（头像 + 气泡 + 时间） */
  function appendMsg(side, text, time) {
    var body = document.getElementById("echoReviewBody");
    if (!body) { return null; }
    var isMe = side === "me";
    var who = isMe ? "我" : (review ? review.partnerName : "对方");
    var div = document.createElement("div");
    div.className = "chat-msg " + (isMe ? "is-self" : "is-other");
    div.innerHTML =
      avatarHtmlFor(isMe ? "other" : "me", review ? review.partnerId : "") +
      '<div class="chat-msg-col">' +
      '<div class="chat-bubble' + (isMe ? " is-self" : " is-other") + '">' + esc(text) + "</div>" +
      '<div class="chat-msg-meta"><span class="chat-msg-time">' + esc(fmtHM(time)) + " · " + esc(who) + "</span></div>" +
      "</div>";
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }
  function renderOptions(m) {
    var list = document.getElementById("echoOptList");
    if (!list) { return; }
    var opts = buildOptions(m.text);
    review.opts = opts;
    setTriggerPlaceholder("点击选择回复");
    var html = "", i;
    for (i = 0; i < opts.length; i++) {
      html += '<button type="button" class="echo-opt-btn" data-i="' + i + '" onclick="SnowCrystal.Echo.pickOption(' + i + ')">' + esc(opts[i]) + "</button>";
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
    if (opts[i] === m.text) {
      /* 选对：标注正确 → 关闭弹窗 → 我方发送 → 推进 */
      btns[i].classList.add("is-correct");
      btns[i].disabled = true;
      var j;
      for (j = 0; j < btns.length; j++) { if (j !== i) { btns[j].disabled = true; } }
      closeOpts();
      window.setTimeout(function () {
        if (!review) { return; }
        appendMsg("me", m.text, m.time);
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
      '<button class="echo-review-done-btn" type="button" onclick="SnowCrystal.Echo.exitReview()">返回日历</button>' +
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
