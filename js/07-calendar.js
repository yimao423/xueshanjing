/* 日历与卡片流 */
"use strict";
  /* =========================================================
     迭代 v13 新增：格言库 / 横排日历
     ========================================================= */

  /* ---------- 格言库：恋爱向格言 · 诗词短句 ---------- */
  var QUOTES = [
    "山有木兮木有枝，心悦君兮君不知。",
    "愿得一心人，白头不相离。",
    "只缘感君一回顾，使我思君朝与暮。",
    "两情若是久长时，又岂在朝朝暮暮。",
    "玲珑骰子安红豆，入骨相思知不知。",
    "衣带渐宽终不悔，为伊消得人憔悴。",
    "此情可待成追忆，只是当时已惘然。",
    "人生若只如初见，何事秋风悲画扇。",
    "十年生死两茫茫，不思量，自难忘。",
    "死生契阔，与子成说。执子之手，与子偕老。",
    "红豆生南国，春来发几枝。愿君多采撷，此物最相思。",
    "与君初相识，犹如故人归。",
    "春风十里，不如你。",
    "往后余生，风雪是你，平淡是你。",
    "我见过春日夏风秋叶冬雪，也踏遍南水北山东麓西岭，可这四季春秋，都不及你冲我展眉一笑。",
    "我明白你会来，所以我等。",
    "想把日子过成诗，把诗写成你。",
    "月亮很亮，亮也没用，没用也亮；我喜欢你，喜欢也没用，没用也喜欢。",
    "你要相信，世界上一定有人，正努力地走到你身边来。",
    "想你的时候，风也温柔，雨也温柔。",
    "所有的美好，都在向你赶来的路上。",
    "世间万物，唯你不可辜负。",
    "我喜欢你，像风走了八千里，不问归期。",
    "你若安好，便是晴天。",
    "愿你被这世界温柔以待，愿你所遇皆良人。",
    "山水一程，三生有幸。"
  ];

  /* v76：首页格言升级 —— 数据源并入「格言库」（含用户导入），支持点击文字弹出选择/自定义 */
  var HOME_QUOTE_KEY = "snowcrystal.homequote";

  function homeQuoteCustom() {
    try {
      var raw = window.localStorage.getItem(HOME_QUOTE_KEY);
      if (raw) { var d = JSON.parse(raw); if (d && d.custom) { return String(d.custom); } }
    } catch (e) { /* 忽略 */ }
    return "";
  }
  function saveHomeQuote(text) {
    try {
      window.localStorage.setItem(HOME_QUOTE_KEY, JSON.stringify({ custom: String(text || "").replace(/^\s+|\s+$/g, "") }));
    } catch (e) { /* 忽略 */ }
  }
  function clearHomeQuote() {
    try { window.localStorage.removeItem(HOME_QUOTE_KEY); } catch (e) { /* 忽略 */ }
  }

  /* 从「格言库」（wcl.quote，含用户导入）收集全部格言文本；不可用时返回空数组 */
  function wclQuoteItems() {
    var out = [], groups = null, i, j, g, it;
    try {
      if (typeof window.loadWcl === "function") { groups = window.loadWcl().quote; }
      else {
        var raw = window.localStorage.getItem("snowcrystal.wordcard.v2");
        if (raw) { groups = (JSON.parse(raw).quote || null); }
      }
    } catch (e) { groups = null; }
    if (groups && groups.length) {
      for (i = 0; i < groups.length; i++) {
        g = groups[i] || {};
        for (j = 0; j < (g.items || []).length; j++) {
          it = g.items[j];
          if (typeof it === "string") { out.push(it); }
          else if (it && typeof it.t === "string") { out.push(it.t); }
        }
      }
    }
    return out;
  }

  /* 全部候选：格言库在前，内置兜底，去重 */
  function allQuoteCandidates() {
    var arr = wclQuoteItems().concat(QUOTES), seen = {}, out = [], i, t;
    for (i = 0; i < arr.length; i++) {
      t = String(arr[i] || "").replace(/^\s+|\s+$/g, "");
      if (!t || seen[t]) { continue; }
      seen[t] = 1;
      out.push(t);
    }
    return out;
  }

  function quoteOfDay() {
    var custom = homeQuoteCustom();
    if (custom) { return custom; }
    var lib = wclQuoteItems();
    if (!lib.length) { lib = QUOTES; }
    if (!lib.length) { return ""; }
    var d = new Date();
    var seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    return lib[seed % lib.length];
  }

  /* 首页：每日一句（居中显示，每日自动变化） */
  function renderDailyQuote() {
    var el = document.getElementById("dailyQuote");
    if (el) { el.textContent = quoteOfDay(); }
  }

  /* ---------- v76：首页格言选择弹窗 ---------- */
  var hqListCache = [];

  function hqEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function hqRenderList() {
    var el = document.getElementById("hqList");
    if (!el) { return; }
    hqListCache = allQuoteCandidates();
    var cur = homeQuoteCustom(), html = "", i;
    for (i = 0; i < hqListCache.length; i++) {
      html += '<div class="hq-item' + (hqListCache[i] === cur ? " is-cur" : "") + '" data-i="' + i + '" role="button" tabindex="0">' + hqEsc(hqListCache[i]) + "</div>";
    }
    el.innerHTML = html;
  }

  function hqOpen() {
    var m = document.getElementById("hqMask"), s = document.getElementById("hqSheet");
    if (!m || !s) { return; }
    hqRenderList();
    var inp = document.getElementById("hqInput");
    if (inp) { inp.value = ""; }
    m.hidden = false;
    s.hidden = false;
  }
  function hqClose() {
    var m = document.getElementById("hqMask"), s = document.getElementById("hqSheet");
    if (m) { m.hidden = true; }
    if (s) { s.hidden = true; }
  }
  function hqPick(text) {
    var t = String(text || "").replace(/^\s+|\s+$/g, "");
    if (!t) { return; }
    saveHomeQuote(t);
    renderDailyQuote();
    hqClose();
    if (typeof window.wcToast === "function") { window.wcToast("已设为首页格言"); }
  }

  function bindHomeQuote() {
    var el = document.getElementById("dailyQuote");
    if (!el || el.getAttribute("data-hq-bound") === "1") { return; }
    el.setAttribute("data-hq-bound", "1");
    el.addEventListener("click", hqOpen);
    el.addEventListener("keydown", function (e) {
      if ((e.key || "") === "Enter" || (e.key || "") === " ") { e.preventDefault(); hqOpen(); }
    });

    var ok = document.getElementById("hqOk");
    if (ok && ok.getAttribute("data-hq-bound") !== "1") {
      ok.setAttribute("data-hq-bound", "1");
      ok.addEventListener("click", function () {
        var inp = document.getElementById("hqInput");
        hqPick(inp ? inp.value : "");
      });
    }

    var list = document.getElementById("hqList");
    if (list && list.getAttribute("data-hq-bound") !== "1") {
      list.setAttribute("data-hq-bound", "1");
      list.addEventListener("click", function (ev) {
        var it = ev.target;
        while (it && it !== list && !(it.getAttribute && it.getAttribute("data-i") !== null)) { it = it.parentNode; }
        if (it && it !== list) {
          var idx = parseInt(it.getAttribute("data-i"), 10);
          if (idx >= 0 && idx < hqListCache.length) { hqPick(hqListCache[idx]); }
        }
      });
      list.addEventListener("keydown", function (ev) {
        if ((ev.key || "") !== "Enter") { return; }
        var it = ev.target;
        if (it && it.getAttribute && it.getAttribute("data-i") !== null) {
          var idx = parseInt(it.getAttribute("data-i"), 10);
          if (idx >= 0 && idx < hqListCache.length) { hqPick(hqListCache[idx]); }
        }
      });
    }

    var rnd = document.getElementById("hqRandom");
    if (rnd && rnd.getAttribute("data-hq-bound") !== "1") {
      rnd.setAttribute("data-hq-bound", "1");
      rnd.addEventListener("click", function () {
        clearHomeQuote();
        renderDailyQuote();
        hqClose();
        if (typeof window.wcToast === "function") { window.wcToast("已恢复每日随机"); }
      });
    }

    var c = document.getElementById("hqCancel");
    if (c && c.getAttribute("data-hq-bound") !== "1") {
      c.setAttribute("data-hq-bound", "1");
      c.addEventListener("click", hqClose);
    }

    var m = document.getElementById("hqMask");
    if (m && m.getAttribute("data-hq-bound") !== "1") {
      m.setAttribute("data-hq-bound", "1");
      m.addEventListener("click", hqClose);
    }

    if (document.documentElement.getAttribute("data-hq-esc") !== "1") {
      document.documentElement.setAttribute("data-hq-esc", "1");
      document.addEventListener("keydown", function (e) {
        if ((e.key || "") === "Escape") {
          var s = document.getElementById("hqSheet");
          if (s && !s.hidden) { hqClose(); }
        }
      });
    }
  }

  function backPage(name) { switchPage(name); }

  /* ---------- v20：农历（Intl 中文日历，闰月 / 大小月自动处理；不支持时静默降级） ---------- */
  var LUNAR_MONTHS = ["正月", "二月", "三月", "四月", "五月", "六月",
                      "七月", "八月", "九月", "十月", "冬月", "腊月"];
  var LUNAR_DAYS = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
                    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
                    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  var lunarFmt = null;
  try {
    lunarFmt = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "numeric", day: "numeric" });
    var lunarProbe = lunarFmt.formatToParts(new Date());
    var lunarOk = false;
    for (var lp = 0; lp < lunarProbe.length; lp++) {
      if (lunarProbe[lp].type === "month" || lunarProbe[lp].type === "day") { lunarOk = true; }
    }
    if (!lunarOk) { lunarFmt = null; }
  } catch (e) { lunarFmt = null; }

  function cnNum(s) {
    if (!s) { return -1; }
    var map = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
                "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12 };
    if (map[s] !== undefined) { return map[s]; }
    var n = parseInt(s, 10);
    return isNaN(n) ? -1 : n;
  }

  /* 返回「八月十八」这样的农历文本；解析不出来时返回空串（不显示） */
  function lunarText(d) {
    if (!lunarFmt || !d) { return ""; }
    var mo = "", dy = "", leap = false;
    try {
      var parts = lunarFmt.formatToParts(d);
      for (var i = 0; i < parts.length; i++) {
        var t = parts[i].type, v = parts[i].value || "";
        if (t === "month") { mo = v; }
        else if (t === "day") { dy = v; }
        else if (v.indexOf("闰") >= 0) { leap = true; }
      }
    } catch (e) { return ""; }
    if (!mo || !dy) { return ""; }
    if (mo.indexOf("闰") >= 0 || dy.indexOf("闰") >= 0) { leap = true; }
    var mi = cnNum(String(mo).replace(/[\u6708\u65e5\s]/g, ""));
    var di = cnNum(String(dy).replace(/[\u6708\u65e5\s]/g, ""));
    if (mi < 1 || mi > 12 || di < 1 || di > 30) { return ""; }
    return (leap ? "闰" : "") + LUNAR_MONTHS[mi - 1] + LUNAR_DAYS[di - 1];
  }

  /* ---------- 横排日历：周一为首日 · 中心突出当日 · 左侧标注月份 · 底部农历 + 本月进度 ---------- */
  var WEEK_CN = ["一", "二", "三", "四", "五", "六", "日"];

  /* v14：当日固定居中 —— 以今天为第 4 个格子，左右各排 3 天（前 3 天 / 后 3 天）。 */
  function renderCalendar() {
    var week = document.getElementById("calWeek");
    var monthEl = document.getElementById("calMonth");
    if (!week) { return; }
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 3);                 /* 左移 3 天 = 最左侧格子 */
    var html = "", i, d, isToday;
    for (i = 0; i < 7; i++) {
      d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      isToday = (d.getFullYear() === now.getFullYear() &&
                 d.getMonth() === now.getMonth() &&
                 d.getDate() === now.getDate());
      html += '<span class="cal-day' + (isToday ? " today" : "") + '">' +
        '<span class="cal-w">' + WEEK_CN[(d.getDay() + 6) % 7] + "</span>" +
        '<span class="cal-d">' + d.getDate() + "</span></span>";
    }
    week.innerHTML = html;
    if (monthEl) { monthEl.textContent = (now.getMonth() + 1) + "月"; }

    /* v20：底部 —— 农历 + 本月进度条（已度过实线 / 未度过虚线） */
    var lunarEl = document.getElementById("calLunar");
    if (lunarEl) { lunarEl.textContent = lunarText(now) || "—"; }
    var days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var passed = now.getDate();
    var fillEl = document.getElementById("calProgFill");
    if (fillEl) { fillEl.style.width = Math.round(passed / days * 100) + "%"; }
    var pTxt = document.getElementById("calProgTxt");
    if (pTxt) { pTxt.textContent = passed + " / " + days; }
  }

  /* ---------- 图片上传：首页头像 / 三格相框共用（data-slot 标记，本机记忆） ---------- */
  var IMG_STORE = "snowcrystal.image.v1.";
  var pendingEl = null;
  var pendingSlot = null;

  function applyImage(el, url) {
    if (!el) { return; }
    el.style.backgroundImage = "url(" + url + ")";
    el.classList.add("has-photo");
  }
  /* v40：上传图片统一压缩（最长边动态跟随设备内存 · JPEG IMG_Q）
     首页现有头像 / 相框 / 相册 / 封面 / 海报等十多个图片位共用本机存储，
     原图直存很容易顶爆 localStorage 配额；压缩失败则原样使用原图，不影响上传。
     原写死 1280，现由 XJ_CAP.imgMax() 按设备内存分档（2GB→1280 / 4GB→1600 / 8GB→1920 / 12GB+→2240）。 */
  var IMG_MAX = (window.XJ_CAP ? XJ_CAP.imgMax() : 1280), IMG_Q = 0.8;
  function imgCompress(dataUrl, maxSide, q, done) {
    if (!dataUrl || !window.Image || !document.createElement) { done(null); return; }
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h || Math.max(w, h) <= maxSide) { done(null); return; }
      var k = maxSide / Math.max(w, h);
      var cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * k));
      cv.height = Math.max(1, Math.round(h * k));
      var ctx = cv.getContext("2d");
      if (!ctx) { done(null); return; }
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      var out = null;
      try { out = cv.toDataURL("image/jpeg", q); } catch (e) { out = null; }
      done(out && out.length < dataUrl.length ? out : null);
    };
    img.onerror = function () { done(null); };
    img.src = dataUrl;
  }

  function restoreImages() {
    var els = document.querySelectorAll("[data-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-slot");
      var url = null;
      try { url = window.localStorage.getItem(IMG_STORE + slot); } catch (e) { url = null; }
      if (url) { applyImage(els[i], url); }
    }
  }

  function pickImage(el) {
    var input = document.getElementById("imgPicker");
    if (!input || !el) { return; }
    pendingEl = el;
    pendingSlot = el.getAttribute("data-slot");
    input.value = "";
    input.click();
  }

  function bindImagePicker() {
    var input = document.getElementById("imgPicker");
    var els = document.querySelectorAll("[data-slot]");
    var i;
    function bind(node) {
      /* v14：同一元素上「单击上传 / 双击删除」共存 —— 单击延后 240ms 执行，
         期间若出现第二次点击（即双击）则取消上传，只执行删除，避免双击先弹出选择器。 */
      var tapTimer = null;
      node.addEventListener("click", function () {
        if (tapTimer) { window.clearTimeout(tapTimer); tapTimer = null; return; }
        tapTimer = window.setTimeout(function () { tapTimer = null; pickImage(node); }, 240);
      });
      node.addEventListener("dblclick", function (e) {
        e.preventDefault();
        if (tapTimer) { window.clearTimeout(tapTimer); tapTimer = null; }
        clearImage(node);
        if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
      });
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          pickImage(node);
        }
      });
    }
    for (i = 0; i < els.length; i++) { bind(els[i]); }
    if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
    if (!input) { return; }
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f || !pendingEl) { return; }
      var node = pendingEl, slot = pendingSlot;
      var reader = new FileReader();
      reader.onload = function () {
        imgCompress(reader.result, IMG_MAX, IMG_Q, function (out) {
          var url = out || reader.result;
          applyImage(node, url);
          try { window.localStorage.setItem(IMG_STORE + slot, url); } catch (e) { /* 忽略 */ }
          if (window.__syncFrameClones) { window.__syncFrameClones(); }
        });
        /* v19 修复「滑动后图片变回未上传的样子」：相框的克隆卡必须同步刷新，
           否则上传只落在源卡上，一滑到克隆卡就露出默认占位。 */
        if (window.__syncFrameClones) { window.__syncFrameClones(); }
        pendingEl = null;
        pendingSlot = null;
      };
      reader.readAsDataURL(f);
    });
  }

  /* =========================================================
     迭代 v14 新增：昵称 / 双击删除上传图 / 完整月历浮层 / 功能长条滚轮
     ========================================================= */

  /* ---------- 昵称：点击可自定义修改 · 本机永久保存 ---------- */
  var NAME_STORE = "snowcrystal.name.v1.";
  var NAME_TIP = "点击命名";

  function applyName(el, name) {
    var text = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    el.textContent = text || NAME_TIP;
    if (text) { el.classList.remove("is-empty"); }
    else { el.classList.add("is-empty"); }
  }

  function restoreNames() {
    var els = document.querySelectorAll("[data-name-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-name-slot");
      var name = null;
      try { name = window.localStorage.getItem(NAME_STORE + slot); } catch (e) { name = null; }
      applyName(els[i], name);
    }
  }

  function bindNames() {
    var els = document.querySelectorAll("[data-name-slot]");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        function startEdit() {
          if (el.getAttribute("data-editing") === "1") { return; }
          el.setAttribute("data-editing", "1");
          var slot = el.getAttribute("data-name-slot");
          var saved = "";
          try { saved = window.localStorage.getItem(NAME_STORE + slot) || ""; } catch (e) { saved = ""; }
          var input = document.createElement("input");
          input.className = "avatar-name-input";
          input.type = "text";
          input.maxLength = 12;
          input.value = saved;
          input.placeholder = "输入昵称";
          el.style.display = "none";
          el.parentNode.insertBefore(input, el.nextSibling);
          try { input.focus(); input.select(); } catch (e) { /* 忽略 */ }

          var done = false;
          function finish(commit) {
            if (done) { return; }
            done = true;
            var val = saved;
            if (commit) {
              val = String(input.value || "").replace(/^\s+|\s+$/g, "").slice(0, 12);
              try {
                if (val) { window.localStorage.setItem(NAME_STORE + slot, val); }
                else { window.localStorage.removeItem(NAME_STORE + slot); }
              } catch (e) { /* 忽略 */ }
            }
            if (input.parentNode) { input.parentNode.removeChild(input); }
            el.style.display = "";
            el.removeAttribute("data-editing");
            applyName(el, val);
          }
          input.addEventListener("blur", function () { finish(true); });
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); finish(true); }
            else if (e.key === "Escape" || e.keyCode === 27) { e.preventDefault(); finish(false); }
          });
        }
        el.addEventListener("click", startEdit);
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
            e.preventDefault();
            startEdit();
          }
        });
      })(els[i]);
    }
  }

  /* ---------- 双击删除已上传图片（清除本机记忆，恢复默认样式） ---------- */
  function clearImage(el) {
    var slot = el && el.getAttribute("data-slot");
    if (!slot) { return; }
    try { window.localStorage.removeItem(IMG_STORE + slot); } catch (e) { /* 忽略 */ }
    el.style.backgroundImage = "";
    el.classList.remove("has-photo");
    if (window.__syncFrameClones) { window.__syncFrameClones(); }
  }

  /* ---------- 完整月历浮层 ---------- */
  var calView = null;

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function renderCalSheet() {
    if (!calView) { return; }
    var grid = document.getElementById("calGrid");
    var title = document.getElementById("calSheetTitle");
    if (!grid) { return; }
    var y = calView.y, m = calView.m;
    if (title) { title.textContent = y + "年" + (m + 1) + "月"; }
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));   /* 回退到该周周一 */
    var now = new Date();
    var html = "";
    for (var i = 0; i < 42; i++) {                                 /* 固定 6 行 × 7 天，避免高度抖动 */
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var cls = "cal-cell";
      if (d.getMonth() !== m) { cls += " is-out"; }
      if (sameDay(d, now)) { cls += " is-today"; }
      html += '<span class="' + cls + '" data-lunar="' + lunarText(d) + '">' + d.getDate() + "</span>";
    }
    grid.innerHTML = html;
  }

  function openCalendar() {
    var now = new Date();
    calView = { y: now.getFullYear(), m: now.getMonth() };
    renderCalSheet();
    var modal = document.getElementById("calModal");
    if (!modal) { return; }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeCalendar() {
    var modal = document.getElementById("calModal");
    if (!modal) { return; }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function shiftMonth(step) {
    if (!calView) { return; }
    var d = new Date(calView.y, calView.m + step, 1);
    calView = { y: d.getFullYear(), m: d.getMonth() };
    renderCalSheet();
  }

  function bindCalendar() {
    var card = document.getElementById("calCard");
    var modal = document.getElementById("calModal");
    if (card) {
      card.addEventListener("click", openCalendar);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          openCalendar();
        }
      });
    }
    if (!modal) { return; }
    var closeBtn = document.getElementById("calClose");
    var prev = document.getElementById("calPrev");
    var next = document.getElementById("calNext");
    if (closeBtn) { closeBtn.addEventListener("click", closeCalendar); }
    if (prev) { prev.addEventListener("click", function () { shiftMonth(-1); }); }
    if (next) { next.addEventListener("click", function () { shiftMonth(1); }); }
    modal.addEventListener("click", function (e) { if (e.target === modal) { closeCalendar(); } });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.keyCode === 27) && modal.classList.contains("is-open")) {
        closeCalendar();
      }
    });
  }

  /* ---------- v17：三格相框 → 横向卡片流（中间大 · 两侧小 · 选中恒居中） ----------
     容器横向滚动 + scroll-snap 居中吸附；缩放 / 透明度按「卡片中心 ↔ 容器中心」的
     距离实时计算：正中的那张最大最清晰，两侧依次缩小、变淡，形成卡片流纵深。 */
  function initFrameFlow() {
    var wrap = document.getElementById("frameFlow");
    if (!wrap) { return; }
    var originals = [].slice.call(wrap.querySelectorAll(".tri-card"));
    if (!originals.length) { return; }
    var N = originals.length;
    var ticking = false;
    var period = 0;          /* 一个循环周期的滚动距离 = 原始 N 张的整体宽度 */
    var snapTimer = null;

    function centerOf(el) {
      var r = el.getBoundingClientRect();
      return r.left + r.width / 2;      /* transform-origin:center，缩放不改变中心 */
    }
    function gapPx() { return parseFloat(getComputedStyle(wrap).columnGap) || 0; }
    function measure() {
      /* offsetWidth 不受 transform 缩放影响，用它量周期才稳定 */
      period = N * (originals[0].offsetWidth + gapPx());
    }

    /* ---------- v18：首尾相接 · 无限循环 ----------
       ① 把原始 N 张整组复制一份接在末尾 —— 内容严格周期；
          克隆卡的封面与「已上传图片」状态跟随源卡同步，但剥离 data-slot，
          使其不参与本机图库记忆 / 上传绑定（避免与源卡抢同一份存储）；
       ② 滚动越过一个周期时整体平移一个周期，视觉上完全无缝；
       ③ 静止后就近吸附，把最近的一张卡滚到容器正中。 */
    function syncCloneImages() {
      var list = [].slice.call(wrap.querySelectorAll(".tri-card"));
      for (var i = 0; i < list.length; i++) {
        var sCover = originals[i % N].querySelector(".tri-cover");
        var dCover = list[i].querySelector(".tri-cover");
        if (!sCover || !dCover) { continue; }
        dCover.style.backgroundImage = sCover.style.backgroundImage;
        if (sCover.classList.contains("has-photo")) { dCover.classList.add("has-photo"); }
        else { dCover.classList.remove("has-photo"); }
      }
    }
    window.__syncFrameClones = syncCloneImages;

    /* v19 修复「首尾相接不正确」：原实现只复制 1 份（共 2 组），
       滚动余量勉强够、边界处容易被 scrollLeft 的上下限截断，接缝处会顿一下。
       现复制 2 份（共 3 组），左右各留一整个周期的缓冲，循环平移永不触顶。 */
    var FRAME_COPIES = 2;
    var frag = document.createDocumentFragment();
    for (var rep = 0; rep < FRAME_COPIES; rep++) {
      for (var ci = 0; ci < N; ci++) {
        var clone = originals[ci].cloneNode(true);
        var slotNode = clone.querySelector("[data-slot]");
        if (slotNode) {
          slotNode.removeAttribute("data-slot");
          slotNode.removeAttribute("tabindex");
          slotNode.removeAttribute("role");
        }
        frag.appendChild(clone);
      }
    }
    wrap.appendChild(frag);
    syncCloneImages();
    measure();

    var all = [].slice.call(wrap.querySelectorAll(".tri-card"));

    /* 克隆卡点击 → 转发给对应源卡的封面（上传 / 删除共用同一份本机记忆）
       v19 修复「点击上传没反应」：原实现克隆卡单击就立刻弹选择器，
       与源卡「单击延后 240ms、双击删除」不一致，双击会连弹两次且误删。
       现让克隆卡与源卡行为完全一致。 */
    for (var ck = N; ck < all.length; ck++) {
      (function (cloneEl, srcEl) {
        var srcCover = srcEl.querySelector(".tri-cover");
        var dstCover = cloneEl.querySelector(".tri-cover");
        if (!srcCover || !dstCover) { return; }
        dstCover.style.cursor = "pointer";
        var tapTimer = null;
        dstCover.addEventListener("click", function (e) {
          e.preventDefault();
          if (tapTimer) { window.clearTimeout(tapTimer); tapTimer = null; return; }
          tapTimer = window.setTimeout(function () {
            tapTimer = null;
            pickImage(srcCover);
          }, 240);
        });
        dstCover.addEventListener("dblclick", function (e) {
          e.preventDefault();
          if (tapTimer) { window.clearTimeout(tapTimer); tapTimer = null; }
          clearImage(srcCover);
        });
      })(all[ck], originals[ck % N]);
    }

    function render() {
      ticking = false;
      var wr = wrap.getBoundingClientRect();
      var mid = wr.left + wr.width / 2;
      var span = period * 0.42 || (wr.width * 0.62 || 1);
      for (var i = 0; i < all.length; i++) {
        var c = all[i];
        var center = centerOf(c);
        var d = Math.min(Math.abs(center - mid) / span, 1);
        c.style.transform = "scale(" + (1 - d * 0.34).toFixed(3) + ")";
        c.style.opacity = (1 - d * 0.55).toFixed(3);
        c.style.zIndex = String(20 - Math.round(d * 16));
        if (d < 0.03) { c.classList.add("is-center"); } else { c.classList.remove("is-center"); }
      }
    }
    /* v30：把「离容器中心最近的那张卡」精确对齐到正中。
       instant=true 用于窗口尺寸变化 / 切页后立即归位（不做平滑动画，
       避免动画期间点击落空）；instant=false 用于用户滑动松手后的就近吸附。 */
    function recenter(instant) {
      var wr = wrap.getBoundingClientRect();
      var mid = wr.left + wr.width / 2;
      var best = null, bestD = Infinity, i, r, d;
      for (i = 0; i < all.length; i++) {
        r = all[i].getBoundingClientRect();
        d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { bestD = d; best = all[i]; }
      }
      if (!best) { return; }
      r = best.getBoundingClientRect();
      var delta = (r.left + r.width / 2) - mid;
      if (Math.abs(delta) > 0.6) {
        if (!instant && wrap.scrollBy) { wrap.scrollBy({ left: delta, behavior: "smooth" }); }
        else { wrap.scrollLeft += delta; }
      }
    }
    function snap() {
      snapTimer = null;
      recenter(false);
    }
    function onScroll() {
      if (period > 0) {
        if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
        else if (wrap.scrollLeft < period * 0.5) { wrap.scrollLeft += period; }
      }
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(render);
      }
      if (snapTimer) { window.clearTimeout(snapTimer); }
      snapTimer = window.setTimeout(snap, 140);
    }
    wrap.addEventListener("scroll", onScroll, { passive: true });
    window.__frameRefresh = function () {
      measure();
      if (period > 0) {
        var guard = 0;
        while (guard++ < 4) {
          if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
          else if (wrap.scrollLeft < period * 0.5 &&
                   wrap.scrollLeft + period <= (wrap.scrollWidth - wrap.clientWidth)) { wrap.scrollLeft += period; }
          else { break; }
        }
      }
      render();
      /* v30：周期变了必须重新对齐正中 —— 小窗 / 切页 / 切标签后「点不中、一格一跳」的病根就在这 */
      recenter(true);
      render();
    };
    /* 首帧：把「视觉上的正中那张」滚到屏幕正中；再把位置归一化进 [0.5, 1.5] 周期窗口，
       给左右两个方向的无限循环都留出缓冲（内容严格周期，平移无视觉差异）。 */
    window.requestAnimationFrame(function () {
      var midIndex = Math.floor(N / 2);
      /* v19：首帧落在「第 2 组正中那张」（all[N + midIndex]），左右各留一整组缓冲 */
      var target = all[N + midIndex] || all[midIndex] || originals[0];
      wrap.scrollLeft += centerOf(target) - (wrap.getBoundingClientRect().left + wrap.clientWidth / 2);
      if (period > 0) {
        if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
        else if (wrap.scrollLeft < period * 0.5 && wrap.scrollLeft + period <= (wrap.scrollWidth - wrap.clientWidth)) {
          wrap.scrollLeft += period;
        }
      }
      window.requestAnimationFrame(render);
    });
  }




