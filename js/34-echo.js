/* 雪山晶 · 34-echo ｜ 源：雪山晶.html L23444-L23621 ｜ JS 模块 */
/* 昨日回响（echo）v3 —— 今日絮语聊天情况日历 + 角色调换回顾 */
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
  var WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
  /* 与某人的连续聊天天数：取该 partner 全部消息日期，从最近一天往前连续计数 */
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
  /* 头像渲染（对齐「今日絮语」聊天室 12-chat.js 的头像逻辑） */
  var MY_KEY = "snowcrystal.account.my.v1";
  function loadMy() {
    try {
      var raw = window.localStorage.getItem(MY_KEY);
      var m = raw ? JSON.parse(raw) : null;
      return (m && typeof m === "object") ? m : { name: "", avatar: "", shape: "square" };
    } catch (e) { return { name: "", avatar: "", shape: "square" }; }
  }
  /* 生成一条消息的头像：有 avatar 用 <img class="chat-avatar-img">，无则用 <span */
  /* 可参与回顾的消息类型：普通文本 + 红包/问答/转发/语音/表情包/图片（同类型选项回顾）； */
  /* 聊天情况统计：dateKey -> { count, partnerIds:[], partnerCount } */

  /* ---------- 字卡库错误选项 ---------- */
  var _wordPoolCache = null;
  /* 字卡词条池：仅 main(自己说的话) —— 排除 quote(格言)/pat(拍一拍)/kao(颜文字)/emoji， */
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
  /* 语音时长：分′秒″ */
  /* 转发摘要（对齐聊天室 fwdCardPreviewText 的观感） */
  /* 两条消息是否同一内容（按类型关键字段对比） */
  /* 从该 partner 全部历史消息收集同类型候选（排除正确项），作为错误项池 */
  /* 兜底生成同类型干扰项（历史同类不足时使用，保证选项同类型） */
  /* 选项按钮文案 */
  /* 选项按钮 HTML：表情包/图片可内联缩略图，其余走纯文本 */
  /* 生成三选项：普通文本走 buildOptions（字卡+颜文字/emoji 混搭）， */

  /* ---------- 日历视图 ---------- */
  var calView = { y: 0, m: 0 };
  /* 进入回顾：复用 echo 页 page-head，标题改为回顾日期；返回键切为 exitReview 语义 */
  /* 退出回顾：恢复 page-head 标题为「昨日回响」、返回键回首页 */
  S.Echo = S.Echo || {};
  // 回声(Echo)模块已按需求移除，以下方法置为无操作占位避免初始化中断
  S.Echo.exitReview = function () {};
})();
