/* 首页组件 */
"use strict";
  /* =========================================================
     v40 ②：首页组件样式 —— 「相册卡片流」所在区域可切换 6 种组件（v42：邮票相册下线，新增相册卡片）
       · 容器：首页 .home-comp#homeComp，对应 id：
         frameFlow（相册卡片流 · 保持原样）/ hcAlbum（相册卡片 · v42 新增）/ hcAnniv（纪念日 · v43 新增）
         / hcTicket（飞机票）/ hcWeather（天气）/ hcPoster（渐变海报 · 整图上传）
       · 每个组件的占位尺寸与相册卡片流完全一致（见 CSS .hc-slot），
         所以换组件只换内容，不改首页版式高度、不影响一屏自适应（--ui）
       · 选择记忆在 localStorage（本机），入口：「美化设置 → 组件样式」
     ========================================================= */
  var COMP_KEY = "snowcrystal.homecomp.v1";
  /* 列表里的小预览图（24 栅格，线性小图，风格与站内图标一致） */
  var COMP_PREV = {
    frame: '<rect x="3.2" y="5.4" width="5.6" height="13.2" rx="1.8" fill="currentColor"/><rect x="9.6" y="3.2" width="5.6" height="17.6" rx="1.8" fill="currentColor"/><rect x="16" y="5.4" width="3.4" height="13.2" rx="1.7" fill="currentColor"/>',
    album: '<rect x="2.8" y="4.2" width="18.4" height="15.6" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.3 1.9"/><path d="M7.4 8.4v7.4M11.2 8.4v7.4M15 8.4v7.4" stroke="currentColor" stroke-width="1.3" opacity="0.65"/><path d="M18.4 8.4v7.4" stroke="currentColor" stroke-width="2.2"/>',
    anniv: '<rect x="3.4" y="5.2" width="17.2" height="15.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.4 9.6h17.2" stroke="currentColor" stroke-width="1.5"/><path d="M8 3.2v3.6M16 3.2v3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 17.9c-1.9-1.3-3.2-2.4-3.2-3.8a1.7 1.7 0 0 1 3.2-.9 1.7 1.7 0 0 1 3.2.9c0 1.4-1.3 2.5-3.2 3.8z" fill="currentColor"/>',
    ticket: '<path d="M3.6 8.6a2 2 0 0 1 2-2h12.8a2 2 0 0 1 2 2v1a2.2 2.2 0 0 0 0 4.8v1a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-1a2.2 2.2 0 0 0 0-4.8z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.8 6.8v10.4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.1 2"/>',
    weather: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.6v1.8M12 18.6v1.8M3.6 12h1.8M18.6 12h1.8M6.2 6.2l1.3 1.3M16.5 16.5l1.3 1.3M17.8 6.2l-1.3 1.3M7.5 16.5l-1.3 1.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    poster: '<rect x="3" y="5" width="18" height="14" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 16.4l5-4.6 3.2 2.9 3.5-4.2 5.1 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
  };
  var HOME_COMPS = [
    { key: "frame",   name: "相册卡片流", desc: "五格相框横向卡片流 · 单击上传图片、双击删除（保持不变）" },
    { key: "album",   name: "相册卡片",   desc: "四格照片 + 右侧条形码 · 单击上传、双击删除" },
    { key: "anniv",   name: "纪念日",     desc: "三个日子 · 点击可改 · 自动算天数" },
    { key: "ticket",  name: "飞机票",     desc: "登机牌式布局 · 跨纬度专线 · 无论多远我都会飞向你" },
    { key: "weather", name: "天气",       desc: "我这边填城市看实时天气 · 你那边点击可改 · 第三行随天气" },
    { key: "poster",  name: "渐变海报",   desc: "整张图片上传 · 单击上传、双击删除" }
  ];
  var homeComp = "ticket";   /* v82：首页中间未设置时的默认组件改为飞机票 */

  function homeCompName(key) {
    for (var i = 0; i < HOME_COMPS.length; i++) { if (HOME_COMPS[i].key === key) { return HOME_COMPS[i].name; } }
    return key;
  }
  function compLoad() {
    var raw = null;
    try { raw = window.localStorage ? window.localStorage.getItem(COMP_KEY) : null; } catch (e) { raw = null; }
    homeComp = "ticket";   /* v82：未设置（localStorage 无记录）时默认飞机票 */
    for (var i = 0; i < HOME_COMPS.length; i++) { if (HOME_COMPS[i].key === raw) { homeComp = raw; } }
  }
  function compSave() {
    try { if (window.localStorage) { window.localStorage.setItem(COMP_KEY, homeComp); } } catch (e) { /* 本机不可写时忽略 */ }
  }

  /* ②-1 相册卡片 / ②-5 渐变海报：图片交给统一上传器（data-slot）接管，
     单击上传、双击删除，上传即写本机记忆、下次打开自动恢复，无需额外脚本。
     v43：②-3 天气 / ②-2 飞机票 / ②-6 纪念日 的「整卡背景图」同样走 data-slot
     （bg-weather / bg-ticket / bg-anniv），由 bindBgUpload 在卡片空白处触发。 */

  /* ---------- ②-4 天气 ----------
     我这边：点城市名 → 填城市 → Open-Meteo 取实时天气（温度 / 天气 / 今日高低温 / 湿度 / 风力）
     你那边：点哪改哪（城市 / 温度 / 天气 / 一句话），手写即存本机
     取不到网时优雅降级成手写文案，不弹错、不白屏 */
  var WX_KEY = "snowcrystal.weather.v1.";
  var WX_MINE_DEFAULT = "长沙";
  /* v43：第三行文案按「天气」分类，每类多句，随机取一句（同一天内保持稳定） */
  var WX_POEMS = {
    clear: ["我这边天光正好，像有你的那天", "阳光落在窗沿，替我向你问早", "我这边晴得很，适合想你"],
    cloud: ["我这边云压得很低，像想你的样子", "云把天光滤成灰色，像没说完的话", "我这边多云转晴，等你一句话"],
    rain: ["我这边落了雨，替我盛了些心事", "雨敲着窗，像你名字的节拍", "我这边下着雨，出门记得带伞"],
    snow: ["我这边下雪了，落在没有你的街上", "雪落得很轻，像怕惊动想念", "我这边飘着雪，你要多穿一件"],
    fog: ["我这边起了雾，看不清远方只看清你", "雾散之前，先想你一会儿", "我这边雾很大，路要慢点走"],
    wind: ["我这边风很大，吹得思念都往你那边去", "风把云吹散，也把心思吹向你", "我这边起风了，记得添件外套"],
    thunder: ["我这边打着雷，像心跳漏了一拍", "雷声滚过屋顶，我在想你", "我这边雷雨交加，你别出门"]
  };
  /* v43：TA 那边专用（「你那边」口吻），左侧我这边用上面那套 */
  var WX_POEMS_YOU = {
    clear: ["你那边天光正好，替我晒晒心情", "你那边阳光很足，记得留一点给我", "你那边晴着，我这边也想放晴"],
    cloud: ["你那边云很厚，晚点记得早点回家", "你那边天色发灰，别把心事压着", "你那边云淡，我看着也安心"],
    rain: ["你那边下着雨，出门记得带伞", "你那边雨声很大，早点收工", "你那边有雨，别淋着"],
    snow: ["你那边落雪了，多穿一件", "你那边雪大，路上慢点走", "你那边下着雪，记得暖手"],
    fog: ["你那边起雾了，走路看清楚点", "你那边雾很大，别急着赶路", "你那边雾散得慢，我等你消息"],
    wind: ["你那边风大，把领口竖起来", "你那边起风了，记得添件外套", "你那边风大，把心事收紧一点"],
    thunder: ["你那边打雷了，别站在窗边", "你那边雷雨，早点回屋", "你那边雷声很大，我在电话这头"]
  };
  /* 用「日期 + 盐值」做种子，同一个日子里文案稳定，跨天自然换新 */
  function wxHash(str) {
    var h = 2166136261, i;
    str = String(str || "");
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function wxPick(seed, n, salt) {
    if (!(n > 0)) { return 0; }
    return wxHash(String(seed) + "#" + (salt || "")) % n;
  }
  function wxToday() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  /* 取一句与当前天气相配的话 */
  function wxPoemOf(kind, seed, pool) {
    var src = pool || WX_POEMS;
    var arr = src[kind] || src.cloud;
    if (!arr || !arr.length) { return ""; }
    if (seed === undefined || seed === null) { return arr[Math.floor(Math.random() * arr.length)] || ""; }
    return arr[wxPick(seed, arr.length, "poem")] || "";
  }
  /* 右侧（TA 那边）：不再手填，按「日期 + 城市」随机生成，同一天内稳定 */
  var WX_KIND_TXT = { clear: "晴", cloud: "多云", rain: "小雨", snow: "小雪", fog: "雾", wind: "大风", thunder: "雷阵雨" };
  var WX_KIND_ORDER = ["clear", "cloud", "rain", "snow", "fog", "wind", "thunder"];
  var WX_KIND_RANGE = {
    clear: [17, 29], cloud: [15, 26], rain: [13, 22], snow: [-4, 3],
    fog: [11, 20], wind: [10, 21], thunder: [19, 28]
  };
  var wxLastAt = 0, wxLastCity = "";

  function wxGet(k, dft) {
    var v = null;
    try { v = window.localStorage ? window.localStorage.getItem(WX_KEY + k) : null; } catch (e) { v = null; }
    return (v === null || v === "") ? dft : v;
  }
  function wxSet(k, v) {
    try { if (window.localStorage) { window.localStorage.setItem(WX_KEY + k, String(v)); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  function wxTxt(id, v) {
    var el = document.getElementById(id);
    if (el) { el.textContent = v; }
  }
  function wxIconSvg(kind) {
    var p = {
      clear: '<circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      cloud: '<path d="M7.4 18.2h8.9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6-1 3.6 3.6 0 0 0 .4 8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
      rain: '<path d="M7.6 14.6h8.7a3.4 3.4 0 0 0 .3-6.8 4.9 4.9 0 0 0-9.4-1 3.5 3.5 0 0 0 .4 7.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 17.4l-.9 2.4M12.4 17.4l-.9 2.4M15.8 17.4l-.9 2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      snow: '<path d="M7.6 14.4h8.7a3.4 3.4 0 0 0 .3-6.8 4.9 4.9 0 0 0-9.4-1 3.5 3.5 0 0 0 .4 7.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.4 17.6v2.6M8.2 18.9h2.4M14.6 17.6v2.6M13.4 18.9h2.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
      fog: '<path d="M6.6 9.8h11M5.2 13h13.6M7.4 16.2h9.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      wind: '<path d="M4.2 9.4h9.4a2.4 2.4 0 1 0-2.4-2.4M4.2 13.4h12a2.4 2.4 0 1 1-2.4 2.4M4.2 17.2h6.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      thunder: '<path d="M7.6 14.2h8.7a3.4 3.4 0 0 0 .3-6.8 4.9 4.9 0 0 0-9.4-1 3.5 3.5 0 0 0 .4 7.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.8 15.4l-2.2 3.6h3.6l-2.2 3.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (p[kind] || p.cloud) + "</svg>";
  }
  function wxKindByCode(c) {
    if (c === 0) { return "clear"; }
    if (c === 1 || c === 2 || c === 3) { return "cloud"; }
    if (c === 45 || c === 48) { return "fog"; }
    if (c >= 51 && c <= 67) { return "rain"; }
    if (c >= 71 && c <= 77) { return "snow"; }
    if (c >= 80 && c <= 82) { return "rain"; }
    if (c >= 85 && c <= 86) { return "snow"; }
    if (c >= 95) { return "thunder"; }
    return "cloud";
  }
  function wxKindByText(t) {
    t = String(t || "");
    if (/雷/.test(t)) { return "thunder"; }
    if (/雪|冰|霜/.test(t)) { return "snow"; }
    if (/雨/.test(t)) { return "rain"; }
    if (/雾|霾|沙|尘/.test(t)) { return "fog"; }
    if (/风/.test(t)) { return "wind"; }
    if (/晴/.test(t)) { return "clear"; }
    return "cloud";
  }
  var WX_CODE_TXT = {
    0: "晴", 1: "晴间多云", 2: "多云", 3: "阴", 45: "雾", 48: "雾凇",
    51: "细雨", 53: "小雨", 55: "中雨", 56: "冻雨", 57: "冻雨",
    61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "冻雨",
    71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
    80: "阵雨", 81: "阵雨", 82: "强阵雨", 85: "阵雪", 86: "阵雪",
    95: "雷阵雨", 96: "雷阵雨", 99: "强雷雨"
  };
  function wxBeaufort(kmh) {
    var v = Number(kmh) || 0;
    if (v < 1) { return "0 级"; }
    if (v < 6) { return "1 级"; }
    if (v < 12) { return "2 级"; }
    if (v < 20) { return "3 级"; }
    if (v < 29) { return "4 级"; }
    if (v < 39) { return "5 级"; }
    if (v < 50) { return "6 级"; }
    if (v < 62) { return "7 级"; }
    return "8 级+";
  }
  function wxFetchJson(url, cb) {
    if (window.fetch) {
      window.fetch(url).then(function (r) { return r.json(); }).then(function (d) { cb(d); }, function () { cb(null); });
      return;
    }
    var xhr = new XMLHttpRequest();
    try { xhr.open("GET", url, true); } catch (e) { cb(null); return; }
    xhr.onload = function () {
      var d = null;
      try { d = JSON.parse(xhr.responseText); } catch (e2) { d = null; }
      cb(d);
    };
    xhr.onerror = function () { cb(null); };
    xhr.send();
  }
  function wxMinePaint(kind, temp, cond, meta, poem) {
    var ico = document.getElementById("wxMyIco");
    if (ico) { ico.innerHTML = wxIconSvg(kind); }
    wxTxt("wxMyTemp", temp);
    wxTxt("wxMyCond", cond);
    wxTxt("wxMyMeta", meta);
    wxTxt("wxMyPoem", poem);
  }
  function wxLoadMine() {
    var city = wxGet("mineCity", "") || WX_MINE_DEFAULT;
    wxLastCity = city;
    wxLastAt = new Date().getTime();
    wxTxt("wxMyCity", city);
    wxMinePaint("cloud", "--", "正在读取…", "", "正在向天空问一句你那边");
    wxFetchJson("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=zh&format=json", function (g) {
      var r = g && g.results && g.results[0];
      if (!r) { wxMinePaint("fog", "--", "没找到这座城", "点上面的城市名换一个再试", wxPoemOf("fog")); return; }
      wxTxt("wxMyCity", r.name || city);
      var u = "https://api.open-meteo.com/v1/forecast?latitude=" + r.latitude + "&longitude=" + r.longitude +
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m" +
        "&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
      wxFetchJson(u, function (w) {
        if (!w || !w.current) { wxMinePaint("cloud", "--", "天气正在赶来", "点城市名可以重试", wxPoemOf("cloud")); return; }
        var cur = w.current, day = w.daily || {};
        var kind = wxKindByCode(cur.weather_code);
        var meta = "";
        if (day.temperature_2m_max && day.temperature_2m_min) {
          meta += Math.round(day.temperature_2m_max[0]) + "° / " + Math.round(day.temperature_2m_min[0]) + "° · ";
        }
        meta += "湿度 " + Math.round(cur.relative_humidity_2m) + "% · 风 " + wxBeaufort(cur.wind_speed_10m);
        wxMinePaint(kind, String(Math.round(cur.temperature_2m)), WX_CODE_TXT[cur.weather_code] || "天气", meta, wxPoemOf(kind, wxToday() + "|mine|" + (r.name || city)));
      });
    });
  }
  /* v43：TA 那边的城市 / 温度 / 天气 / 第二行小字（湿度、风等）都可点击自定义；
     只有第三行那句文字跟随「设置的天气」，按天气类型随机取句，天气一变就跟着换。 */
  function wxRenderYours() {
    var city = wxGet("yCity", "北京");
    var cond = wxGet("yCond", "晴");
    var kind = wxKindByText(cond);
    wxTxt("wxYourCity", city);
    wxTxt("wxYourTemp", wxGet("yTemp", "18"));
    wxTxt("wxYourCond", cond);
    wxTxt("wxYourMeta", wxGet("yMeta", "今天 18° / 8° · 微风"));
    wxTxt("wxYourPoem", wxPoemOf(kind, wxToday() + "|you|" + city + "|" + cond, WX_POEMS_YOU));
    var ico = document.getElementById("wxYourIco");
    if (ico) { ico.innerHTML = wxIconSvg(kind); }
  }
  function wxPaint() {
    wxRenderYours();
    var city = wxGet("mineCity", "") || WX_MINE_DEFAULT;
    if (city !== wxLastCity || new Date().getTime() - wxLastAt > 600000) { wxLoadMine(); }
  }
  function bindWeather() {
    var host = document.getElementById("hcWeather");
    if (!host || host.getAttribute("data-wx-bound") === "1") { return; }
    host.setAttribute("data-wx-bound", "1");
    host.addEventListener("click", function (e) {
      var node = closestData(e.target || e.srcElement, "data-wx", host);
      if (!node) { return; }
      var field = node.getAttribute("data-wx");
      /* v43：TA 那边的城市 / 温度 / 天气 / 第二行小字都可改；
         第三行那句文字不给改，跟随这里设置的「天气」自动变化。 */
      var cfg = {
        mineCity: ["我所在的城市", wxGet("mineCity", "") || WX_MINE_DEFAULT, "填城市名（如：长沙 / 上海 / 北京），自动取实时天气"],
        yCity: ["TA 所在的城市", wxGet("yCity", "北京"), "手写就好，随你怎么叫它"],
        yTemp: ["TA 那边的温度", wxGet("yTemp", "18"), "只填数字，如 18"],
        yCond: ["TA 那边的天气", wxGet("yCond", "晴"), "如：晴 / 多云 / 小雨 / 雪 —— 第三行那句话会跟着变"],
        yMeta: ["TA 那边的第二行小字", wxGet("yMeta", "今天 18° / 8° · 微风"), "如：今天 18° / 8° · 湿度 62% · 风 3 级"]
      }[field];
      if (!cfg) { return; }
      wcPrompt(cfg[0], cfg[1], cfg[2], function (v) {
        if (v === null || v === undefined || v === "") { return; }
        wxSet(field, v);
        if (field === "mineCity") {
          wxLastAt = 0;
          wxLastCity = "";
          wxLoadMine();
        } else {
          wxRenderYours();
        }
      });
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var node = closestData(e.target || e.srcElement, "data-wx", host);
      if (node) { e.preventDefault(); node.click(); }
    });
    bindBgUpload(host, "data-wx");
  }

  /* ---------- ②-3b 飞机票：纬度 / 航班编号可点击修改 + 水晶簇定位 ---------- */
  var TK_KEY = "snowcrystal.ticket.v1.";
  function tkGet(k, dft) {
    var v = null;
    try { v = window.localStorage ? window.localStorage.getItem(TK_KEY + k) : null; } catch (e) { v = null; }
    return (v === null || v === "") ? dft : v;
  }
  function tkSet(k, v) {
    try { if (window.localStorage) { window.localStorage.setItem(TK_KEY + k, String(v)); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  /* 水晶簇：垂直居中于 39°N，水平左缘对齐「心之所向」
     注意：切换组件时首页可能正处于隐藏态（从「组件样式」页切换），
     此时取到的都是 0 尺寸，故做有限次延迟重试，等页面真正显示后再量。 */
  var tkTries = 0;
  function layoutTicketCrystal() {
    var main = document.querySelector("#hcTicket .hc-tk-main");
    var cry = document.querySelector("#hcTicket .hc-tk-crystal");
    if (!cry) { return; } /* v43：水晶簇已删除 */
    var refLat = document.getElementById("tkTo");
    var refDoor = document.getElementById("tkDoor");
    if (!main || !cry || !refLat || !refDoor) { return; }
    var mb = main.getBoundingClientRect();
    var lb = refLat.getBoundingClientRect();
    var db = refDoor.getBoundingClientRect();
    if (!mb.width || !mb.height || !lb.height) {
      if (tkTries < 8) {
        tkTries++;
        window.setTimeout(layoutTicketCrystal, 150);
      }
      return;
    }
    tkTries = 0;
    cry.style.top = ((lb.top + lb.bottom) / 2 - mb.top) + "px";
    cry.style.left = (db.left - mb.left) + "px";
  }
  window.__tkCrystalLayout = layoutTicketCrystal;
  function tkPaint() {
    wxTxt("tkFrom", tkGet("from", "22°N"));
    wxTxt("tkTo", tkGet("to", "39°N"));
    wxTxt("tkFly", tkGet("fly", "FLY 1314"));
    tkTries = 0;
    layoutTicketCrystal();
  }
  function bindTicket() {
    var host = document.getElementById("hcTicket");
    if (!host || host.getAttribute("data-tk-bound") === "1") { return; }
    host.setAttribute("data-tk-bound", "1");
    host.addEventListener("click", function (e) {
      var node = closestData(e.target || e.srcElement, "data-tk", host);
      if (!node) { return; }
      var field = node.getAttribute("data-tk");
      var cfg = {
        from: ["出发地纬度", tkGet("from", "22°N"), "如：22°N / 31°N，随你写"],
        to: ["目的地纬度", tkGet("to", "39°N"), "如：39°N / 45°N，随你写"],
        fly: ["航班编号", tkGet("fly", "FLY 1314"), "如：FLY 1314 / SNOW 520"]
      }[field];
      if (!cfg) { return; }
      wcPrompt(cfg[0], cfg[1], cfg[2], function (v) {
        tkSet(field, v);
        tkPaint();
      });
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var node = closestData(e.target || e.srcElement, "data-tk", host);
      if (node) { e.preventDefault(); node.click(); }
    });
    window.addEventListener("resize", function () {
      window.setTimeout(function () { if (homeComp === "ticket") { layoutTicketCrystal(); } }, 220);
    });
    bindBgUpload(host, "data-tk");
  }

  /* ---------- v43：组件背景图 —— 点卡片空白处单击上传 / 双击删除 ----------
     复用统一上传器（data-slot + IMG_STORE），上传即写本机记忆、下次打开自动恢复；
     未上传时不添加 has-photo，卡片显示默认主题底。 */
  function bindBgUpload(host, dataAttr) {
    if (!host || host.getAttribute("data-bg-bound") === "1") { return; }
    var bg = host.querySelector(".hc-bg");
    if (!bg) { return; }
    host.setAttribute("data-bg-bound", "1");
    var timer = null;
    host.addEventListener("click", function (e) {
      var t = e.target || e.srcElement;
      if (closestData(t, dataAttr, host)) { return; }
      if (t && t.getAttribute && t.getAttribute("data-slot")) { return; }
      if (timer) { window.clearTimeout(timer); timer = null; return; }
      timer = window.setTimeout(function () { timer = null; pickImage(bg); }, 240);
    });
    host.addEventListener("dblclick", function (e) {
      var t = e.target || e.srcElement;
      if (closestData(t, dataAttr, host)) { return; }
      if (t && t.getAttribute && t.getAttribute("data-slot")) { return; }
      if (timer) { window.clearTimeout(timer); timer = null; }
      clearImage(bg);
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var t = e.target || e.srcElement;
      if (closestData(t, dataAttr, host)) { return; }
      e.preventDefault();
      pickImage(bg);
    });
  }

  /* ---------- ②-6 纪念日：三个日子 · 点击可改 · 自动算天数 ---------- */
  var AN_KEY = "snowcrystal.anniv.v1.";
  var AN_DEFAULT = { mine: "1999-08-20", together: "2022-05-20", you: "2000-02-14" };
  function anGet(k, dft) {
    var v = null;
    try { v = window.localStorage ? window.localStorage.getItem(AN_KEY + k) : null; } catch (e) { v = null; }
    return (v === null || v === "") ? dft : v;
  }
  function anSet(k, v) {
    try { if (window.localStorage) { window.localStorage.setItem(AN_KEY + k, String(v)); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  function anPad(n) { return (n < 10 ? "0" : "") + n; }
  function anParse(s) {
    var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(s || ""));
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) { return null; }
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) { return null; }
    return dt;
  }
  function anToday() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function anDays(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
  function anFmt(d) { return d.getFullYear() + "." + anPad(d.getMonth() + 1) + "." + anPad(d.getDate()); }
  /* 生日：距离下一次生日还有几天 */
  function anBirthSub(d) {
    var now = anToday();
    var next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (anDays(now, next) < 0) { next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate()); }
    var n = anDays(now, next);
    if (n === 0) { return "就是今天 · 生日快乐"; }
    if (n === 1) { return "明天就到"; }
    return "还有 " + n + " 天";
  }
  /* 纪念日：已经在一起多少天（含当天） */
  function anTogSub(d) {
    var n = anDays(d, anToday());
    if (n < 0) { return "还有 " + (-n) + " 天"; }
    return "已 " + (n + 1) + " 天";
  }
  function anPaint() {
    var mine = anParse(anGet("mine", AN_DEFAULT.mine));
    var tog = anParse(anGet("together", AN_DEFAULT.together));
    var you = anParse(anGet("you", AN_DEFAULT.you));
    wxTxt("anMineDate", mine ? anFmt(mine) : "--");
    wxTxt("anMineSub", mine ? anBirthSub(mine) : "点一下写下日期");
    wxTxt("anTogDate", tog ? anFmt(tog) : "--");
    wxTxt("anTogSub", tog ? anTogSub(tog) : "点一下写下日期");
    wxTxt("anYouDate", you ? anFmt(you) : "--");
    wxTxt("anYouSub", you ? anBirthSub(you) : "点一下写下日期");
  }
  function bindAnniv() {
    var host = document.getElementById("hcAnniv");
    if (!host || host.getAttribute("data-an-bound") === "1") { return; }
    host.setAttribute("data-an-bound", "1");
    var cfg = {
      mine: ["我方的生日", "如 1999-08-20 / 1999.8.20"],
      together: ["在一起的日子", "如 2022-05-20 / 2022.5.20"],
      you: ["对方的生日", "如 2000-02-14 / 2000.2.14"]
    };
    host.addEventListener("click", function (e) {
      var node = closestData(e.target || e.srcElement, "data-an", host);
      if (!node) { return; }
      var k = node.getAttribute("data-an");
      var it = cfg[k];
      if (!it) { return; }
      wcPrompt(it[0], anGet(k, AN_DEFAULT[k] || ""), it[1], function (v) {
        if (v === null || v === undefined || v === "") { return; }
        var d = anParse(v);
        if (!d) { tip("没读懂这个日期，试试 2022-05-20 这样的写法"); return; }
        anSet(k, anFmt(d));
        anPaint();
      });
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var node = closestData(e.target || e.srcElement, "data-an", host);
      if (node) { e.preventDefault(); node.click(); }
    });
    bindBgUpload(host, "data-an");
    anPaint();
  }

  /* 按当前选择，只显示一个组件（其余 hidden；相册卡片流改用行内 display 收放，
     因为 .tri-grid 是 flex 容器，hidden 属性单独压不住它）*/
  function applyHomeComponent() {
    var host = document.getElementById("homeComp");
    if (!host) { return; }
    var frame = document.getElementById("frameFlow");
    if (frame) {
      if (homeComp === "frame") { frame.removeAttribute("hidden"); frame.style.display = ""; }
      else { frame.setAttribute("hidden", "hidden"); frame.style.display = "none"; }
    }
    var slots = [["hcAlbum", "album"], ["hcAnniv", "anniv"], ["hcTicket", "ticket"], ["hcWeather", "weather"], ["hcPoster", "poster"]];
    for (var i = 0; i < slots.length; i++) {
      var el = document.getElementById(slots[i][0]);
      if (!el) { continue; }
      if (slots[i][1] === homeComp) { el.removeAttribute("hidden"); } else { el.setAttribute("hidden", "hidden"); }
    }
    host.setAttribute("data-comp", homeComp);
    if (homeComp === "anniv") { anPaint(); }
    if (homeComp === "weather") { wxPaint(); }
    if (homeComp === "ticket") { tkPaint(); }
  }
  /* 组件样式页：一个组件一张卡，选中即切换 */
  function compPanelHtml() {
    var html = "", i, it, on;
    for (i = 0; i < HOME_COMPS.length; i++) {
      it = HOME_COMPS[i];
      on = (it.key === homeComp);
      html += '<article class="row-card comp-card' + (on ? " is-on" : "") + '" data-comp-card="' + it.key +
                '" role="button" tabindex="0" aria-pressed="' + (on ? "true" : "false") + '">' +
                '<span class="comp-prev" aria-hidden="true"><svg viewBox="0 0 24 24">' + (COMP_PREV[it.key] || "") + "</svg></span>" +
                '<div class="row-main">' +
                  '<span class="row-title">' + it.name + "</span>" +
                  '<span class="row-desc">' + it.desc + "</span>" +
                "</div>" +
                '<span class="comp-check" aria-hidden="true">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.6l4.4 4.4L19 7.4"/></svg>' +
                "</span>" +
              "</article>";
    }
    return html;
  }
  function renderCompPanel() {
    var host = document.getElementById("compPanel");
    if (host) { host.innerHTML = compPanelHtml(); }
  }
  function setHomeComp(key) {
    if (!key) { return; }
    var ok = false;
    for (var i = 0; i < HOME_COMPS.length; i++) { if (HOME_COMPS[i].key === key) { ok = true; } }
    if (!ok || key === homeComp) { return; }
    homeComp = key;
    compSave();
    applyHomeComponent();
    renderCompPanel();
    tip("首页中心组件已切换为「" + homeCompName(key) + "」");
  }
  function bindCompPanel() {
    var host = document.getElementById("compPanel");
    if (!host || host.getAttribute("data-bound") === "1") { return; }
    host.setAttribute("data-bound", "1");
    host.addEventListener("click", function (e) {
      var card = closestData(e.target || e.srcElement, "data-comp-card", host);
      if (card) { setHomeComp(card.getAttribute("data-comp-card")); }
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var card = closestData(e.target || e.srcElement, "data-comp-card", host);
      if (card) { e.preventDefault(); setHomeComp(card.getAttribute("data-comp-card")); }
    });
  }
  function initHomeComp() {
    compLoad();
    applyHomeComponent();
    renderCompPanel();
    bindCompPanel();
    bindWeather();
    bindTicket();
    bindAnniv();
    tkPaint();
  }

  /* v37：美化设置（四个外观类入口的收纳页） */
  function openBeautify() { switchPage("beautify"); }
  function openAppearance() { switchPage("appearance"); }
  /* v32：字体颜色独立二级页入口（设置 → 字体颜色） */
  function openFontColor() { switchPage("fontcolor"); }
  /* v33：图标颜色 / 卡片颜色 独立二级页入口（设置 → 字体颜色下方） */
  function openIconColor() { switchPage("iconcolor"); }
  function openCardColor() { switchPage("cardcolor"); }
  /* v39：组件样式（首页组件切换）入口 —— 进页即按当前选择渲染列表 */
  function openComponent() {
    switchPage("component");
    renderCompPanel();
    renderCompColorPanel();
    bindCompColorPanel();
  }
  function back() { switchPage("settings"); }

  /* ---------------- v31 / v32：双击删除自定义主题颜色 ----------------
     v32：删除「当前主题」面板后，删除入口统一为「双击自定义颜色里的色块」——
     保存过的自定义色均可双击直接删除；内置主题不可删；
     若删的正是正在使用的那个自定义色，自动回到默认主题。 */
  function deleteCustom(idx) {
    if (!(idx >= 0) || idx >= state.customs.length) { return; }
    var removed = state.customs[idx];
    state.customs.splice(idx, 1);
    if (state.key.indexOf("custom:") === 0) {
      var cur = parseInt(state.key.split(":")[1], 10);
      if (cur === idx) { setTheme(DEFAULT_THEME.key); }
      else if (isFinite(cur) && cur > idx) { state.key = "custom:" + (cur - 1); }
    }
    renderSwatches();
    syncUi();
    persist();
    tip("已删除自定义颜色 " + String(removed).toUpperCase() + "（剩余 " + state.customs.length + " 个）");
  }
  function bindCustomDelete() {
    var grid = document.getElementById("themeGrid");
    if (grid && grid.getAttribute("data-del-bound") !== "1") {
      grid.setAttribute("data-del-bound", "1");
      grid.addEventListener("dblclick", function (e) {
        var t = e.target || e.srcElement;
        var btn = closestData(t, "data-custom", grid);
        if (!btn) { return; }
        var i = parseInt(btn.getAttribute("data-custom"), 10);
        if (!isFinite(i)) { return; }
        deleteCustom(i);
      });
    }
  }

  /* ---------------- 自定义颜色交互绑定 ---------------- */
  function bindCustomUi() {
    var colorInput = document.getElementById("customColor");
    var hexInput = document.getElementById("customHex");
    var saveBtn = document.getElementById("customSave");

    if (colorInput) {
      colorInput.addEventListener("input", function () {
        var hx = normHex(colorInput.value);
        if (!hx) { return; }
        if (hexInput) { hexInput.value = hx; }
        previewCustom(hx);
      });
    }
    if (hexInput) {
      hexInput.addEventListener("input", function () {
        var hx = normHex(hexInput.value);
        if (hx) {
          if (colorInput) { colorInput.value = hx; }
          previewCustom(hx);
        }
      });
      hexInput.addEventListener("blur", function () {
        var hx = normHex(hexInput.value);
        hexInput.value = hx || state.base;
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", saveCustom);
    }
  }

  /* ---------------- URL 参数（theme / page），便于分享与预览 ---------------- */
  function applyDeepLink() {
    var q = String(window.location.search || "");
    var mt = /[?&]theme=([^&]+)/.exec(q);
    if (mt) {
      var v = window.decodeURIComponent(mt[1]);
      var spec = resolveKey(v);
      if (spec) { state.key = spec.key; state.name = spec.name; state.base = spec.base; state.mode = spec.mode; }
      else { previewCustom(v); }
    }
    var mp = /[?&]page=([^&]+)/.exec(q);
    var page = mp ? window.decodeURIComponent(mp[1]) : String(window.location.hash || "").replace(/^#/, "");
    if (page) { switchPage(page); }
    applyState();
    syncUi();
  }


  /* ---------------- v83：顶部组件（首页顶部居中展示 · 头像 / 时间维度 / 链接状态） ----------------
     顶部组件条 #headComps 内三个 .head-comp：
       avatar（头像组件 = avatar-col）/ metric（时间维度组件 = avatar-side）/ link（链接状态组件 = link-state）
     设置页「美化设置 → 顶部组件」可启停、排序、配置链接状态（符号 / 颜色 / 进度 / 文艺文案）。
     最多同时显示三个（通用逻辑：取启用列表前三个，当前共三个组件，天然满足）。
     记忆在本机 localStorage。 */
  var TOP_COMP_KEY = "snowcrystal.topcomps.v1";
  var TOP_COMPS = [
    { key: "avatar", name: "头像组件", desc: "左侧双头像 + 昵称区（avatar-col）" },
    { key: "metric", name: "时间维度组件", desc: "右侧时间相隔 + 跨越纬度的爱恋（avatar-side）" },
    { key: "link",   name: "链接状态组件", desc: "状态符号条 + 第二行文艺文案（未链接/链接中/已链接 · 按状态联动）" }
  ];
  var TOP_LINK_DEFAULT = { deco: "❦", color: "#E86A92", pct: 88, desc: "我们的链接，隔着星辰也稳稳相牵" };
  var topState = { order: ["avatar", "metric", "link"], hidden: {}, link: {} };

  function mergeTopLink(l) {
    var d = TOP_LINK_DEFAULT;
    var c = (l && /^#[0-9a-fA-F]{6}$/.test(String(l.color))) ? String(l.color) : d.color;
    var pct = (l && l.pct !== undefined && isFinite(Number(l.pct))) ? clamp(parseInt(l.pct, 10) || 0, 0, 100) : d.pct;
    return {
      deco: (l && String(l.deco)) ? String(l.deco) : d.deco,
      color: c,
      pct: pct,
      desc: (l && String(l.desc)) ? String(l.desc) : d.desc
    };
  }
  function topLoad() {
    var o = { order: ["avatar", "metric", "link"], hidden: {}, quote: true, link: {} };
    try {
      var raw = window.localStorage ? window.localStorage.getItem(TOP_COMP_KEY) : null;
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.order) { o = s; }
      }
    } catch (e) { o = { order: ["avatar", "metric", "link"], hidden: {}, quote: true, link: {} }; }
    if (!o.hidden) { o.hidden = {}; }
    /* v92：旧数据无 quote 字段时默认显示跨纬度短句 */
    if (o.quote === undefined) { o.quote = true; }
    o.link = mergeTopLink(o.link);
    topState = o;
  }
  function topSave() {
    try { if (window.localStorage) { window.localStorage.setItem(TOP_COMP_KEY, JSON.stringify(topState)); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  function topName(key) {
    for (var i = 0; i < TOP_COMPS.length; i++) { if (TOP_COMPS[i].key === key) { return TOP_COMPS[i].name; } }
    if (key === "quote") { return "跨纬度短句"; }
    return key;
  }
  function topVisibleList() {
    var list = [];
    for (var i = 0; i < topState.order.length; i++) {
      var k = topState.order[i];
      if (!topState.hidden[k]) { list.push(k); }
    }
    return list.slice(0, 3);   /* 顶部最多三个 */
  }
  /* 把启停 / 顺序落到首页顶部组件条：order 决定从左到右，hidden 控制显隐 */
  function applyTopComps() {
    var host = document.getElementById("headComps");
    if (!host) { return; }
    var shown = topVisibleList();
    var comps = host.querySelectorAll(".head-comp");
    for (var i = 0; i < comps.length; i++) {
      var k = comps[i].getAttribute("data-top-comp");
      var idx = shown.indexOf(k);
      if (idx >= 0) {
        comps[i].removeAttribute("hidden");
        comps[i].classList.remove("is-hidden");
        comps[i].style.order = String(idx + 1);
      } else {
        comps[i].setAttribute("hidden", "hidden");
        comps[i].classList.add("is-hidden");
        comps[i].style.order = "";
      }
    }
    /* v92：跨纬度短句独立开关 —— 不占三个位置，关闭/开启时首页各区域随文档流自适应 */
    var lf = document.getElementById("latFoot");
    if (lf) {
      if (topState.quote !== false) {
        lf.removeAttribute("hidden");
        lf.classList.remove("is-hidden");
      } else {
        lf.setAttribute("hidden", "hidden");
        lf.classList.add("is-hidden");
      }
    }
    renderLinkState();
  }
  /* 链接状态组件：符号 / 彩色进度条 / 百分比 / 文艺文案（由设置页配置驱动） */
  function renderLinkState() {
    var st = topState.link;
    var deco = document.getElementById("linkDeco");
    var fill = document.getElementById("linkBarFill");
    var num = document.getElementById("linkNum");
    var desc = document.getElementById("linkDesc");
    var host = document.getElementById("headComps");
    if (deco) { deco.textContent = st.deco || ""; }
    if (fill) {
      fill.style.width = st.pct + "%";
      fill.style.background = st.color;
    }
    if (num) {
      num.textContent = st.pct + "%";
      num.style.color = st.color;
    }
    if (desc) { desc.textContent = st.desc; }
    var decoEl = document.querySelector(".link-deco");
    if (decoEl) { decoEl.style.color = st.color; }
    if (host) {
      host.style.setProperty("--link-c", st.color);
      host.style.setProperty("--link-pct", st.pct + "%");
    }
  }

  /* 顶部组件设置页：三张组件卡（启停开关 + 左/右移排序）+ 独立项「跨纬度短句」（仅启停，不占位置） */
  function topPanelHtml() {
    var html = "", i, it;
    for (i = 0; i < TOP_COMPS.length; i++) {
      it = TOP_COMPS[i];
      var on = !topState.hidden[it.key];
      var pos = topState.order.indexOf(it.key) + 1;
      html += '<article class="row-card top-card" data-top-card="' + it.key + '" role="button" tabindex="0" aria-pressed="' + (on ? "true" : "false") + '">' +
                '<div class="row-main">' +
                  '<span class="row-title">' + it.name + (on ? "" : "（已停用）") + '</span>' +
                  '<span class="row-desc">' + it.desc + '</span>' +
                '</div>' +
                '<div class="top-pos">' +
                  '<button type="button" class="top-pos-btn" data-top-act="left" title="左移一位" aria-label="左移一位">‹</button>' +
                  '<span class="top-pos-num">' + (on ? pos : "—") + '</span>' +
                  '<button type="button" class="top-pos-btn" data-top-act="right" title="右移一位" aria-label="右移一位">›</button>' +
                '</div>' +
                '<span class="top-toggle' + (on ? " is-on" : "") + '" data-top-act="toggle" role="switch" aria-checked="' + (on ? "true" : "false") + '" title="' + (on ? "点击停用" : "点击启用") + '"></span>' +
              '</article>';
    }
    /* v92：跨纬度短句独立开关卡 —— 无左右移按钮，仅启停 */
    var qon = topState.quote !== false;
    html += '<article class="row-card top-card top-card-quote" data-top-card="quote" role="button" tabindex="0" aria-pressed="' + (qon ? "true" : "false") + '">' +
              '<div class="row-main">' +
                '<span class="row-title">跨纬度短句' + (qon ? "" : "（已停用）") + '</span>' +
                '<span class="row-desc">在首页展示一行来自跨维度空间的短句</span>' +
              '</div>' +
              '<span class="top-toggle' + (qon ? " is-on" : "") + '" data-top-act="toggle" role="switch" aria-checked="' + (qon ? "true" : "false") + '" title="' + (qon ? "点击停用" : "点击启用") + '"></span>' +
            '</article>';
    return html;
  }
  function renderTopPanel() {
    var host = document.getElementById("topCompPanel");
    if (host) { host.innerHTML = topPanelHtml(); }
  }
  function topToggle(key) {
    if (!key) { return; }
    if (key === "quote") {
      topState.quote = !(topState.quote !== false);
      topSave();
      applyTopComps();
      renderTopPanel();
      tip((topState.quote !== false ? "已启用「" : "已停用「") + topName(key) + "」");
      return;
    }
    topState.hidden[key] = !topState.hidden[key];
    topSave();
    applyTopComps();
    renderTopPanel();
    tip((!topState.hidden[key] ? "已启用「" : "已停用「") + topName(key) + "」");
  }
  function topMove(key, dir) {
    var idx = topState.order.indexOf(key);
    if (idx < 0) { return; }
    var nidx = (dir === "left") ? idx - 1 : idx + 1;
    if (nidx < 0 || nidx >= topState.order.length) { return; }
    topState.order.splice(idx, 1);
    topState.order.splice(nidx, 0, key);
    topSave();
    applyTopComps();
    renderTopPanel();
    tip("已调整「" + topName(key) + "」顺序为第 " + (nidx + 1) + " 位");
  }
  function bindTopPanel() {
    var host = document.getElementById("topCompPanel");
    if (!host || host.getAttribute("data-bound") === "1") { return; }
    host.setAttribute("data-bound", "1");
    host.addEventListener("click", function (e) {
      var card = closestData(e.target || e.srcElement, "data-top-card", host);
      if (!card) { return; }
      var key = card.getAttribute("data-top-card");
      var actEl = closestData(e.target || e.srcElement, "data-top-act", host);
      if (!actEl) { topToggle(key); return; }
      var act = actEl.getAttribute("data-top-act");
      if (act === "toggle") { topToggle(key); }
      else if (act === "left" || act === "right") { topMove(key, act); }
    });
    host.addEventListener("keydown", function (e) {
      var k = e.key || "";
      if (k !== "Enter" && k !== " " && k !== "Spacebar") { return; }
      var card = closestData(e.target || e.srcElement, "data-top-card", host);
      if (card) { e.preventDefault(); topToggle(card.getAttribute("data-top-card")); }
    });
  }

  /* 链接状态配置面板回显 */
  function syncTopLinkUi() {
    var st = topState.link;
    var d = document.getElementById("linkDecoInput");
    var c = document.getElementById("linkColorInput");
    var hx = document.getElementById("linkColorHex");
    var p = document.getElementById("linkPctInput");
    var pt = document.getElementById("linkPctTxt");
    var de = document.getElementById("linkDescInput");
    if (d) { d.value = st.deco; }
    if (c) { c.value = st.color; }
    if (hx) { hx.textContent = st.color; }
    if (p) { p.value = String(st.pct); }
    if (pt) { pt.textContent = st.pct + "%"; }
    if (de) { de.value = st.desc; }
  }
  function bindTopLinkPanel() {
    var d = document.getElementById("linkDecoInput");
    var c = document.getElementById("linkColorInput");
    var hx = document.getElementById("linkColorHex");
    var p = document.getElementById("linkPctInput");
    var pt = document.getElementById("linkPctTxt");
    var de = document.getElementById("linkDescInput");
    var cr = document.getElementById("linkColorReset");
    var pr = document.getElementById("linkPctReset");
    function commit() {
      topState.link = mergeTopLink({
        deco: d ? d.value : topState.link.deco,
        color: c ? c.value : topState.link.color,
        pct: p ? parseInt(p.value, 10) : topState.link.pct,
        desc: de ? de.value : topState.link.desc
      });
      topSave();
      applyTopComps();
      syncTopLinkUi();
    }
    if (d && d.getAttribute("data-bound") !== "1") {
      d.setAttribute("data-bound", "1");
      d.addEventListener("change", commit);
    }
    if (de && de.getAttribute("data-bound") !== "1") {
      de.setAttribute("data-bound", "1");
      de.addEventListener("change", commit);
    }
    if (c && c.getAttribute("data-bound") !== "1") {
      c.setAttribute("data-bound", "1");
      c.addEventListener("input", function () {
        topState.link.color = c.value;
        if (hx) { hx.textContent = c.value; }
        applyTopComps();
      });
      c.addEventListener("change", commit);
    }
    if (p && p.getAttribute("data-bound") !== "1") {
      p.setAttribute("data-bound", "1");
      p.addEventListener("input", function () {
        topState.link.pct = clamp(parseInt(p.value, 10) || 0, 0, 100);
        if (pt) { pt.textContent = topState.link.pct + "%"; }
        applyTopComps();
      });
      p.addEventListener("change", commit);
    }
    if (cr && cr.getAttribute("data-bound") !== "1") {
      cr.setAttribute("data-bound", "1");
      cr.addEventListener("click", function () {
        topState.link.color = TOP_LINK_DEFAULT.color;
        applyTopComps();
        syncTopLinkUi();
        topSave();
        tip("链接状态颜色已恢复默认");
      });
    }
    if (pr && pr.getAttribute("data-bound") !== "1") {
      pr.setAttribute("data-bound", "1");
      pr.addEventListener("click", function () {
        topState.link.pct = TOP_LINK_DEFAULT.pct;
        applyTopComps();
        syncTopLinkUi();
        topSave();
        tip("链接进度已恢复默认 88%");
      });
    }
  }
  function openTopComponents() {
    switchPage("top-components");
    renderTopPanel();
    bindTopPanel();
    syncTopLinkUi();
    bindTopLinkPanel();
  }
  function resetTopComps() {
    topState = { order: ["avatar", "metric", "link"], hidden: {}, quote: true, link: mergeTopLink(null) };
    topSave();
    applyTopComps();
    renderTopPanel();
    syncTopLinkUi();
    tip("顶部组件已全部复位（三个组件全部启用 · 默认顺序 · 跨纬度短句显示 · 链接状态恢复默认）");
  }
  function initTopComps() {
    topLoad();
    applyTopComps();
  }

  /* ---------------- v84：链接状态组件（符号逐个填充 + ECG 波形 · 主题色绑定） ----------------
     v84 替代 v83 的单条进度条渲染：进度条 = 5 个自定义符号（实心=已激活 / 空心=未激活），
     实心数 = round(pct/100*5)；ECG 波形线为静态装饰 + CSS 缓慢流动动画；
     颜色统一跟随 --accent 主题色（不再使用独立 linkColor 配置，设置页已改为「跟随主题」只读提示）。 */
  var LINK_SYM_COUNT = 5;
  function escLinkSym(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function renderLinkState() {
    var st = topState.link;
    var symHost = document.getElementById("linkSymbols");
    var num = document.getElementById("linkNum");
    var desc = document.getElementById("linkDesc");
    var pct = (st && st.pct !== undefined) ? st.pct : 88;
    var k = Math.max(0, Math.min(LINK_SYM_COUNT, Math.round(pct / 100 * LINK_SYM_COUNT)));
    var deco = (st && st.deco) ? String(st.deco) : "❦";
    if (symHost) {
      var html = "";
      for (var i = 0; i < LINK_SYM_COUNT; i++) {
        html += '<span class="link-sym' + (i < k ? " is-on" : "") + '" aria-hidden="true">' + escLinkSym(deco) + '</span>';
      }
      symHost.innerHTML = html;
      symHost.setAttribute("aria-label", "链接状态 " + k + "/" + LINK_SYM_COUNT + " 已激活");
    }
    if (num) { num.textContent = pct + "%"; }
    if (desc) { desc.textContent = (st && st.desc) ? st.desc : "我们的链接，隔着星辰也稳稳相牵"; }
  }

  /* ---------------- v85：链接状态组件（状态驱动 · 未链接/链接中/已链接 三态） ----------------
     v85 在 v84 符号条 + ECG 波形基础上改为状态驱动：
     - 三种状态（off 未链接 / mid 链接中 / on 已链接），内核为「两个角色之间的距离感」；
     - 首页不再渲染百分比数字（#linkNum 已从 HTML 移除），符号实心数按状态联动：未链接=1/5、链接中=3/5、已链接=5/5；
     - 第二行文案按状态分别存储与编辑（descs.off / descs.mid / descs.on）；
     - 装饰符号默认改为 ❤（未设置/旧数据回退时）；
     - 设置页将进度滑杆（#linkPctInput）替换为「链接状态」三态单选 + 文案预览；
     - 旧数据（含 pct/desc）自动迁移：pct<=33→off、<=66→mid、否则 on，旧 desc 归入已链接文案。 */
  var LINK_STATES = {
    off: { name: "未链接", n: 1, desc: "隔着十二维的距离，我在等你的星火靠近" },
    mid: { name: "链接中", n: 3, desc: "信号正穿过星海，我们正在向彼此靠拢" },
    on:  { name: "已链接", n: 5, desc: "我们的链接，隔着星辰也稳稳相牵" }
  };
  var TOP_LINK_DEFAULT = {
    deco: "❤", color: "#E86A92", state: "on",
    descs: { off: LINK_STATES.off.desc, mid: LINK_STATES.mid.desc, on: LINK_STATES.on.desc }
  };

  function mergeTopLink(l) {
    var d = TOP_LINK_DEFAULT;
    var state = "on";
    if (l && l.state && LINK_STATES[l.state]) {
      state = l.state;
    } else if (l && l.pct !== undefined && isFinite(Number(l.pct))) {
      var p = Math.max(0, Math.min(100, parseInt(l.pct, 10) || 0));
      state = p <= 33 ? "off" : (p <= 66 ? "mid" : "on");
    }
    var ks = ["off", "mid", "on"], descs = {}, i, k, v;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      v = (l && l.descs && l.descs[k]) ? String(l.descs[k]) : LINK_STATES[k].desc;
      if (k === "on" && !(l && l.descs) && l && String(l.desc)) { v = String(l.desc); }
      descs[k] = v;
    }
    return {
      deco: (l && String(l.deco)) ? String(l.deco) : d.deco,
      color: (l && /^#[0-9a-fA-F]{6}$/.test(String(l.color))) ? String(l.color) : d.color,
      state: state,
      descs: descs
    };
  }
  function renderLinkState() {
    var st = topState.link;
    var symHost = document.getElementById("linkSymbols");
    var desc = document.getElementById("linkDesc");
    var state = (st && st.state && LINK_STATES[st.state]) ? st.state : "on";
    var k = LINK_STATES[state].n;
    var deco = (st && st.deco) ? String(st.deco) : "❤";
    if (symHost) {
      var html = "";
      for (var i = 0; i < LINK_SYM_COUNT; i++) {
        html += '<span class="link-sym' + (i < k ? " is-on" : "") + '" aria-hidden="true">' + escLinkSym(deco) + '</span>';
      }
      symHost.innerHTML = html;
      symHost.setAttribute("aria-label", "链接状态 " + LINK_STATES[state].name + " " + k + "/" + LINK_SYM_COUNT);
    }
    if (desc) { desc.textContent = st ? st.descs[state] : LINK_STATES[state].desc; }
  }
  function syncTopLinkUi() {
    var st = topState.link;
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkStateSeg");
    var prev = document.getElementById("linkStatePreview");
    var deOff = document.getElementById("linkDescOff");
    var deMid = document.getElementById("linkDescMid");
    var deOn = document.getElementById("linkDescOn");
    if (d) { d.value = st.deco; }
    if (seg) {
      var btns = seg.querySelectorAll(".seg-btn");
      for (var i = 0; i < btns.length; i++) {
        var is = btns[i].getAttribute("data-link-state") === st.state;
        btns[i].classList.toggle("is-on", is);
        btns[i].setAttribute("aria-checked", is ? "true" : "false");
      }
    }
    if (prev) {
      var s = LINK_STATES[st.state] || LINK_STATES.on;
      prev.textContent = "实心 " + s.n + "/" + LINK_SYM_COUNT + " · " + st.descs[st.state];
    }
    if (deOff) { deOff.value = st.descs.off; }
    if (deMid) { deMid.value = st.descs.mid; }
    if (deOn) { deOn.value = st.descs.on; }
  }
  function bindTopLinkPanel() {
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkStateSeg");
    var deOff = document.getElementById("linkDescOff");
    var deMid = document.getElementById("linkDescMid");
    var deOn = document.getElementById("linkDescOn");
    function saveUi() { topSave(); applyTopComps(); syncTopLinkUi(); }
    function commit() {
      topState.link = mergeTopLink({
        deco: d ? d.value : topState.link.deco,
        state: topState.link.state,
        descs: {
          off: deOff ? deOff.value : topState.link.descs.off,
          mid: deMid ? deMid.value : topState.link.descs.mid,
          on: deOn ? deOn.value : topState.link.descs.on
        }
      });
      saveUi();
    }
    if (d && d.getAttribute("data-bound") !== "1") {
      d.setAttribute("data-bound", "1");
      d.addEventListener("change", commit);
    }
    if (seg && seg.getAttribute("data-bound") !== "1") {
      seg.setAttribute("data-bound", "1");
      seg.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".seg-btn") : null;
        if (!btn || !btn.getAttribute("data-link-state")) { return; }
        topState.link.state = btn.getAttribute("data-link-state");
        saveUi();
      });
    }
    var arr = [["off", deOff], ["mid", deMid], ["on", deOn]];
    for (var i = 0; i < arr.length; i++) {
      (function (key, node) {
        if (node && node.getAttribute("data-bound") !== "1") {
          node.setAttribute("data-bound", "1");
          node.addEventListener("change", function () {
            topState.link.descs[key] = node.value;
            saveUi();
          });
        }
      })(arr[i][0], arr[i][1]);
    }
  }
  function resetTopComps() {
    topState = { order: ["avatar", "metric", "link"], hidden: {}, link: mergeTopLink(null) };
    topSave();
    applyTopComps();
    renderTopPanel();
    syncTopLinkUi();
    tip("顶部组件已全部复位（三个组件全部启用 · 默认顺序 · 链接状态恢复「已链接」）");
  }

  /* ---------------- v86：链接状态组件（状态自动变化 + 双文案 短词/长句 + 显示模式） ----------------
     v86 在 v85 三态单选基础上改为状态驱动 + 自动变化：
     - 首页状态自动循环：未链接 → 链接中 → 已链接 → 未链接（间隔 LINK_CYCLE_MS，默认 50 秒，集中可调）；
     - 每状态双文案：短词（words.*，4-5 字）+ 长句（descs.*，文艺描述），设置页 6 个输入框分别编辑；
     - 显示模式 mode：word（短词，默认）/ desc（长句），首页第二行按模式渲染；
     - 旧数据迁移：已有 words/descs 保留，缺失或为 "undefined"/空 的字段用默认值补全；旧单 desc 归入已链接长句。 */
  var LINK_STATES = {
    off: { name: "未链接", n: 1, word: "等你靠近", desc: "隔着十二维的距离，我在等你的星火靠近" },
    mid: { name: "链接中", n: 3, word: "信号靠近", desc: "信号正穿过星海，我们正在向彼此靠拢" },
    on:  { name: "已链接", n: 5, word: "稳稳相牵", desc: "我们的链接，隔着星辰也稳稳相牵" }
  };
  var TOP_LINK_DEFAULT = {
    deco: "❤", color: "#E86A92", state: "on", mode: "word",
    words: { off: LINK_STATES.off.word, mid: LINK_STATES.mid.word, on: LINK_STATES.on.word },
    descs: { off: LINK_STATES.off.desc, mid: LINK_STATES.mid.desc, on: LINK_STATES.on.desc }
  };
  var LINK_ORDER = ["off", "mid", "on"];
  var LINK_CYCLE_MS = 50000; /* 状态自动切换间隔（毫秒，40~60 秒区间建议值，集中可调） */
  var linkCycleTimer = null;

  function mergeTopLink(l) {
    var d = TOP_LINK_DEFAULT;
    function good(v) {
      if (!v || typeof v !== "string") { return false; }
      var t = String(v).trim();
      return t !== "" && t.toLowerCase() !== "undefined" && t !== "null";
    }
    var state = "on";
    if (l && l.state && LINK_STATES[l.state]) {
      state = l.state;
    } else if (l && l.pct !== undefined && isFinite(Number(l.pct))) {
      var p = Math.max(0, Math.min(100, parseInt(l.pct, 10) || 0));
      state = p <= 33 ? "off" : (p <= 66 ? "mid" : "on");
    }
    var ks = ["off", "mid", "on"], words = {}, descs = {}, i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      words[k] = (l && l.words && good(l.words[k])) ? String(l.words[k]).trim() : LINK_STATES[k].word;
      descs[k] = (l && l.descs && good(l.descs[k])) ? String(l.descs[k]).trim() : LINK_STATES[k].desc;
    }
    if (l && !(l && l.descs) && good(l.desc)) { descs.on = String(l.desc).trim(); }
    var mode = (l && (l.mode === "word" || l.mode === "desc")) ? l.mode : "word";
    return {
      deco: (l && good(l.deco)) ? String(l.deco).trim() : d.deco,
      color: (l && /^#[0-9a-fA-F]{6}$/.test(String(l.color))) ? String(l.color) : d.color,
      state: state,
      mode: mode,
      words: words,
      descs: descs
    };
  }
  function linkNextState(s) {
    var i = LINK_ORDER.indexOf(s);
    if (i < 0) { i = 0; }
    return LINK_ORDER[(i + 1) % LINK_ORDER.length];
  }
  function linkTick() {
    topState.link.state = linkNextState(topState.link.state || "off");
    applyTopComps();
    syncTopLinkUi();
  }
  function startLinkCycle() {
    if (linkCycleTimer) { clearInterval(linkCycleTimer); linkCycleTimer = null; }
    linkCycleTimer = setInterval(linkTick, LINK_CYCLE_MS);
  }
  function renderLinkState() {
    var st = topState.link;
    var symHost = document.getElementById("linkSymbols");
    var desc = document.getElementById("linkDesc");
    var state = (st && st.state && LINK_STATES[st.state]) ? st.state : "on";
    var k = LINK_STATES[state].n;
    var deco = (st && st.deco) ? String(st.deco) : "❤";
    if (symHost) {
      var html = "";
      for (var i = 0; i < LINK_SYM_COUNT; i++) {
        html += '<span class="link-sym' + (i < k ? " is-on" : "") + '" aria-hidden="true">' + escLinkSym(deco) + '</span>';
      }
      symHost.innerHTML = html;
      symHost.setAttribute("aria-label", "链接状态 " + LINK_STATES[state].name + " " + k + "/" + LINK_SYM_COUNT);
    }
    if (desc) {
      var mode = (st && st.mode === "desc") ? "desc" : "word";
      var txt = (st && st.words && st.descs)
        ? (mode === "desc" ? st.descs[state] : st.words[state])
        : LINK_STATES[state].word;
      desc.textContent = txt;
    }
  }
  function syncTopLinkUi() {
    var st = topState.link;
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkModeSeg");
    var now = document.getElementById("linkStateNow");
    var wOff = document.getElementById("linkWordOff"), wMid = document.getElementById("linkWordMid"), wOn = document.getElementById("linkWordOn");
    var deOff = document.getElementById("linkDescOff"), deMid = document.getElementById("linkDescMid"), deOn = document.getElementById("linkDescOn");
    if (d) { d.value = st.deco; }
    if (seg) {
      var btns = seg.querySelectorAll(".seg-btn");
      for (var i = 0; i < btns.length; i++) {
        var is = btns[i].getAttribute("data-link-mode") === st.mode;
        btns[i].classList.toggle("is-on", is);
        btns[i].setAttribute("aria-checked", is ? "true" : "false");
      }
    }
    if (now) {
      var s = LINK_STATES[st.state] || LINK_STATES.on;
      var preview = st.mode === "desc" ? st.descs[st.state] : st.words[st.state];
      now.textContent = "当前：" + s.name + " · " + preview;
    }
    if (wOff) { wOff.value = st.words.off; }
    if (wMid) { wMid.value = st.words.mid; }
    if (wOn) { wOn.value = st.words.on; }
    if (deOff) { deOff.value = st.descs.off; }
    if (deMid) { deMid.value = st.descs.mid; }
    if (deOn) { deOn.value = st.descs.on; }
  }
  function bindTopLinkPanel() {
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkModeSeg");
    var wOff = document.getElementById("linkWordOff"), wMid = document.getElementById("linkWordMid"), wOn = document.getElementById("linkWordOn");
    var deOff = document.getElementById("linkDescOff"), deMid = document.getElementById("linkDescMid"), deOn = document.getElementById("linkDescOn");
    function saveUi() { topSave(); applyTopComps(); syncTopLinkUi(); }
    function commit() {
      topState.link = mergeTopLink({
        deco: d ? d.value : topState.link.deco,
        state: topState.link.state,
        mode: topState.link.mode,
        words: {
          off: wOff ? wOff.value : topState.link.words.off,
          mid: wMid ? wMid.value : topState.link.words.mid,
          on: wOn ? wOn.value : topState.link.words.on
        },
        descs: {
          off: deOff ? deOff.value : topState.link.descs.off,
          mid: deMid ? deMid.value : topState.link.descs.mid,
          on: deOn ? deOn.value : topState.link.descs.on
        }
      });
      saveUi();
    }
    if (d && d.getAttribute("data-bound") !== "1") {
      d.setAttribute("data-bound", "1");
      d.addEventListener("change", commit);
    }
    if (seg && seg.getAttribute("data-bound") !== "1") {
      seg.setAttribute("data-bound", "1");
      seg.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".seg-btn") : null;
        if (!btn || !btn.getAttribute("data-link-mode")) { return; }
        topState.link.mode = btn.getAttribute("data-link-mode");
        saveUi();
      });
    }
    var pairs = [["off", wOff, deOff], ["mid", wMid, deMid], ["on", wOn, deOn]];
    for (var i = 0; i < pairs.length; i++) {
      (function (key, wEl, deEl) {
        if (wEl && wEl.getAttribute("data-bound") !== "1") {
          wEl.setAttribute("data-bound", "1");
          wEl.addEventListener("change", function () { topState.link.words[key] = wEl.value; saveUi(); });
        }
        if (deEl && deEl.getAttribute("data-bound") !== "1") {
          deEl.setAttribute("data-bound", "1");
          deEl.addEventListener("change", function () { topState.link.descs[key] = deEl.value; saveUi(); });
        }
      })(pairs[i][0], pairs[i][1], pairs[i][2]);
    }
  }
  function resetTopComps() {
    topState = { order: ["avatar", "metric", "link"], hidden: {}, link: mergeTopLink(null) };
    topSave();
    applyTopComps();
    renderTopPanel();
    syncTopLinkUi();
    tip("顶部组件已全部复位（三个组件全部启用 · 默认顺序 · 链接状态恢复自动变化默认值）");
  }

  /* ---------------- v87：链接状态组件（加权随机切换 · 已链接优先且停留更长） ----------------
     v87 在 v86 固定间隔顺序循环基础上改为「按概率随机切换」：
     - 每次切换按加权概率随机选态：已链接 on 50% / 链接中 mid 40% / 未链接 off 10%；
     - 停留时长按状态区分：已链接最长（on 约 65s）> 链接中（mid 约 42s）> 未链接（off 约 26s）；
     - v86 的 LINK_CYCLE_MS / LINK_ORDER / linkTick / startLinkCycle 固定循环实现保留在上方，本块同名函数覆盖生效；
     - 其余设置（显示模式 / 6 文案 / 装饰符号）行为不变。 */
  var LINK_WEIGHTS = { on: 0.50, mid: 0.40, off: 0.10 };
  var LINK_HOLD_MS = { on: 65000, mid: 42000, off: 26000 };
  function pickLinkStateV87() {
    var r = Math.random();
    if (r < LINK_WEIGHTS.on) { return "on"; }
    if (r < LINK_WEIGHTS.on + LINK_WEIGHTS.mid) { return "mid"; }
    return "off";
  }
  function linkTick() {
    topState.link.state = pickLinkStateV87();
    applyTopComps();
    syncTopLinkUi();
  }
  function startLinkCycle() {
    if (linkCycleTimer) { clearInterval(linkCycleTimer); linkCycleTimer = null; }
    function schedule() {
      var hold = LINK_HOLD_MS[topState.link.state] || LINK_CYCLE_MS;
      linkCycleTimer = setTimeout(function () {
        linkTick();
        schedule();
      }, hold);
    }
    schedule();
  }

  function initTopComps() {
    topLoad();
    applyTopComps();
    startLinkCycle();
  }

  /* ---------------- v90：链接状态组件（两级状态机 · 起始连接 + 已连接后三态） ----------------
     v90 在 v87 概率随机基础上扩展为「两级状态机」：
     - 阶段A「起始连接」= 原有三态（off 未链接 / mid 链接中 / on 已链接）：
         整体出现概率 30%（LINK_PHASE_A），作为"开始要连接上的进度"；
         阶段A内部保持 v87 相对权重（off:mid:on ≈ 1:4:5 = 10%:40%:50%），停留时长沿用 LINK_HOLD_MS；
     - 阶段B「已连接上后」= 新增三态（strong 链接很强 / weak 链接微弱 / drop 链接断断续续）：
         整体出现概率 70%（LINK_PHASE_B），三态完全等概率（各 1/3）；
         停留时长很长（strong 110s / weak 95s / drop 105s，均落在 90~120s 区间）；
     - 符号实心联动：strong=5/5 · weak=3/5 · drop=1/5；drop 态符号条附加缓慢闪烁（CSS .is-drop）；
     - 双文案（短词+长句）：新增三态并入 LINK_STATES / TOP_LINK_DEFAULT / mergeTopLink /
       syncTopLinkUi / bindTopLinkPanel，设置页新增 6 个输入框，存储 key 为 strong/weak/drop；
     - v87 及更早函数体完整保留在上方，本块同名函数覆盖生效。 */
  var LINK_PHASE_A = 0.30; /* 阶段A 起始连接 整体概率 */
  var LINK_PHASE_B = 0.70; /* 阶段B 已连接上后 整体概率 */
  var LINK_CONNECTED_HOLD_MS = { strong: 110000, weak: 95000, drop: 105000 }; /* 阶段B 停留时长（90~120s） */

  var LINK_STATES = {
    off:    { name: "未链接",       n: 1, word: "等你靠近", desc: "隔着十二维的距离，我在等你的星火靠近" },
    mid:    { name: "链接中",       n: 3, word: "信号靠近", desc: "信号正穿过星海，我们正在向彼此靠拢" },
    on:     { name: "已链接",       n: 5, word: "稳稳相牵", desc: "我们的链接，隔着星辰也稳稳相牵" },
    strong: { name: "链接很强",     n: 5, word: "信号满格", desc: "我们的信号穿过整片星海，满格到连时间都为它让路" },
    weak:   { name: "链接微弱",     n: 3, word: "信号微弱", desc: "隔着十二维的薄雾，你的声音微弱，却依然清晰入心" },
    drop:   { name: "链接断断续续", n: 1, word: "信号断续", desc: "星河偶尔拥堵，我们的信号断断续续，却从不断线" }
  };
  var LINK_PHASE_A_KEYS = ["off", "mid", "on"];
  var LINK_PHASE_B_KEYS = ["strong", "weak", "drop"];
  var TOP_LINK_DEFAULT = {
    deco: "❤", color: "#E86A92", state: "on", mode: "word",
    words: {
      off: LINK_STATES.off.word, mid: LINK_STATES.mid.word, on: LINK_STATES.on.word,
      strong: LINK_STATES.strong.word, weak: LINK_STATES.weak.word, drop: LINK_STATES.drop.word
    },
    descs: {
      off: LINK_STATES.off.desc, mid: LINK_STATES.mid.desc, on: LINK_STATES.on.desc,
      strong: LINK_STATES.strong.desc, weak: LINK_STATES.weak.desc, drop: LINK_STATES.drop.desc
    }
  };

  function mergeTopLink(l) {
    var d = TOP_LINK_DEFAULT;
    function good(v) {
      if (!v || typeof v !== "string") { return false; }
      var t = String(v).trim();
      return t !== "" && t.toLowerCase() !== "undefined" && t !== "null";
    }
    var state = "on";
    if (l && l.state && LINK_STATES[l.state]) {
      state = l.state;
    } else if (l && l.pct !== undefined && isFinite(Number(l.pct))) {
      var p = Math.max(0, Math.min(100, parseInt(l.pct, 10) || 0));
      state = p <= 33 ? "off" : (p <= 66 ? "mid" : "on");
    }
    var ks = ["off", "mid", "on", "strong", "weak", "drop"], words = {}, descs = {}, i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      words[k] = (l && l.words && good(l.words[k])) ? String(l.words[k]).trim() : LINK_STATES[k].word;
      descs[k] = (l && l.descs && good(l.descs[k])) ? String(l.descs[k]).trim() : LINK_STATES[k].desc;
    }
    if (l && !(l && l.descs) && good(l.desc)) { descs.on = String(l.desc).trim(); }
    var mode = (l && (l.mode === "word" || l.mode === "desc")) ? l.mode : "word";
    return {
      deco: (l && good(l.deco)) ? String(l.deco).trim() : d.deco,
      color: (l && /^#[0-9a-fA-F]{6}$/.test(String(l.color))) ? String(l.color) : d.color,
      state: state,
      mode: mode,
      words: words,
      descs: descs
    };
  }
  function pickPhaseAState() {
    var r = Math.random();
    if (r < LINK_WEIGHTS.on) { return "on"; }
    if (r < LINK_WEIGHTS.on + LINK_WEIGHTS.mid) { return "mid"; }
    return "off";
  }
  function pickPhaseBState() {
    var r = Math.random();
    if (r < 1 / 3) { return "strong"; }
    if (r < 2 / 3) { return "weak"; }
    return "drop";
  }
  function pickLinkStateV90() {
    return Math.random() < LINK_PHASE_A ? pickPhaseAState() : pickPhaseBState();
  }
  function linkTick() {
    topState.link.state = pickLinkStateV90();
    applyTopComps();
    syncTopLinkUi();
  }
  function startLinkCycle() {
    if (linkCycleTimer) { clearInterval(linkCycleTimer); linkCycleTimer = null; }
    function schedule() {
      var hold = LINK_CONNECTED_HOLD_MS[topState.link.state]
        || LINK_HOLD_MS[topState.link.state]
        || LINK_CYCLE_MS;
      linkCycleTimer = setTimeout(function () {
        linkTick();
        schedule();
      }, hold);
    }
    schedule();
    /* v79：页面隐藏时暂停轮播（链接状态重绘不再空转），恢复可见后立即续播，避免后台定时器空耗 */
    if (!document.__xjLinkVisBound) {
      document.__xjLinkVisBound = true;
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          if (linkCycleTimer) { clearTimeout(linkCycleTimer); linkCycleTimer = null; }
        } else if (!linkCycleTimer && homeComp === "link") {
          startLinkCycle();
        }
      });
    }
  }
  function renderLinkState() {
    var st = topState.link;
    var symHost = document.getElementById("linkSymbols");
    var desc = document.getElementById("linkDesc");
    var state = (st && st.state && LINK_STATES[st.state]) ? st.state : "on";
    var k = LINK_STATES[state].n;
    var deco = (st && st.deco) ? String(st.deco) : "❤";
    if (symHost) {
      var html = "";
      for (var i = 0; i < LINK_SYM_COUNT; i++) {
        html += '<span class="link-sym' + (i < k ? " is-on" : "") + '" aria-hidden="true">' + escLinkSym(deco) + '</span>';
      }
      symHost.innerHTML = html;
      symHost.classList.toggle("is-drop", state === "drop");
      symHost.setAttribute("aria-label", "链接状态 " + LINK_STATES[state].name + " " + k + "/" + LINK_SYM_COUNT);
    }
    if (desc) {
      var mode = (st && st.mode === "desc") ? "desc" : "word";
      var txt = (st && st.words && st.descs)
        ? (mode === "desc" ? st.descs[state] : st.words[state])
        : LINK_STATES[state].word;
      desc.textContent = txt;
    }
  }
  function syncTopLinkUi() {
    var st = topState.link;
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkModeSeg");
    var now = document.getElementById("linkStateNow");
    var wEls = {
      off: document.getElementById("linkWordOff"), mid: document.getElementById("linkWordMid"), on: document.getElementById("linkWordOn"),
      strong: document.getElementById("linkWordStrong"), weak: document.getElementById("linkWordWeak"), drop: document.getElementById("linkWordDrop")
    };
    var dEls = {
      off: document.getElementById("linkDescOff"), mid: document.getElementById("linkDescMid"), on: document.getElementById("linkDescOn"),
      strong: document.getElementById("linkDescStrong"), weak: document.getElementById("linkDescWeak"), drop: document.getElementById("linkDescDrop")
    };
    if (d) { d.value = st.deco; }
    if (seg) {
      var btns = seg.querySelectorAll(".seg-btn");
      for (var i = 0; i < btns.length; i++) {
        var is = btns[i].getAttribute("data-link-mode") === st.mode;
        btns[i].classList.toggle("is-on", is);
        btns[i].setAttribute("aria-checked", is ? "true" : "false");
      }
    }
    if (now) {
      var s = LINK_STATES[st.state] || LINK_STATES.on;
      var preview = st.mode === "desc" ? st.descs[st.state] : st.words[st.state];
      now.textContent = "当前：" + s.name + " · " + preview;
    }
    var keys = ["off", "mid", "on", "strong", "weak", "drop"], i, k;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (wEls[k]) { wEls[k].value = st.words[k]; }
      if (dEls[k]) { dEls[k].value = st.descs[k]; }
    }
  }
  function bindTopLinkPanel() {
    var d = document.getElementById("linkDecoInput");
    var seg = document.getElementById("linkModeSeg");
    var wEls = {
      off: document.getElementById("linkWordOff"), mid: document.getElementById("linkWordMid"), on: document.getElementById("linkWordOn"),
      strong: document.getElementById("linkWordStrong"), weak: document.getElementById("linkWordWeak"), drop: document.getElementById("linkWordDrop")
    };
    var dEls = {
      off: document.getElementById("linkDescOff"), mid: document.getElementById("linkDescMid"), on: document.getElementById("linkDescOn"),
      strong: document.getElementById("linkDescStrong"), weak: document.getElementById("linkDescWeak"), drop: document.getElementById("linkDescDrop")
    };
    function saveUi() { topSave(); applyTopComps(); syncTopLinkUi(); }
    function commit() {
      var words = {}, descs = {}, i, k;
      var keys = ["off", "mid", "on", "strong", "weak", "drop"];
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        words[k] = wEls[k] ? wEls[k].value : topState.link.words[k];
        descs[k] = dEls[k] ? dEls[k].value : topState.link.descs[k];
      }
      topState.link = mergeTopLink({
        deco: d ? d.value : topState.link.deco,
        state: topState.link.state,
        mode: topState.link.mode,
        words: words,
        descs: descs
      });
      saveUi();
    }
    if (d && d.getAttribute("data-bound") !== "1") {
      d.setAttribute("data-bound", "1");
      d.addEventListener("change", commit);
    }
    if (seg && seg.getAttribute("data-bound") !== "1") {
      seg.setAttribute("data-bound", "1");
      seg.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".seg-btn") : null;
        if (!btn || !btn.getAttribute("data-link-mode")) { return; }
        topState.link.mode = btn.getAttribute("data-link-mode");
        saveUi();
      });
    }
    var keys = ["off", "mid", "on", "strong", "weak", "drop"];
    for (i = 0; i < keys.length; i++) {
      (function (key, wEl, deEl) {
        if (wEl && wEl.getAttribute("data-bound") !== "1") {
          wEl.setAttribute("data-bound", "1");
          wEl.addEventListener("change", function () { topState.link.words[key] = wEl.value; saveUi(); });
        }
        if (deEl && deEl.getAttribute("data-bound") !== "1") {
          deEl.setAttribute("data-bound", "1");
          deEl.addEventListener("change", function () { topState.link.descs[key] = deEl.value; saveUi(); });
        }
      })(keys[i], wEls[keys[i]], dEls[keys[i]]);
    }
  }


