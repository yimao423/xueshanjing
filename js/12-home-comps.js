/* 雪山晶 · 12-home-comps ｜ 源：雪山晶.html L8403-L8640 ｜ JS 模块 */
;/* 首页组件 */
"use strict";
  var COMP_KEY = "snowcrystal.homecomp.v1";
  /* 列表里的小预览图（24 栅格，线性小图，风格与站内图标一致） */
  var HOME_COMPS = [
    { key: "album",   name: "相册卡片",   desc: "四格照片 + 右侧条形码 · 单击上传、双击删除" },
    { key: "anniv",   name: "纪念日",     desc: "三个日子 · 点击可改 · 自动算天数" },
    { key: "ticket",  name: "飞机票",     desc: "登机牌式布局 · 跨纬度专线 · 无论多远我都会飞向你" },
    { key: "weather", name: "天气",       desc: "我这边填城市看实时天气 · 你那边点击可改 · 第三行随天气" },
    { key: "poster",  name: "渐变海报",   desc: "整张图片上传 · 单击上传、双击删除" }
  ];
  var homeComp = "ticket";   

  function compLoad() {
    var raw = null;
    try { raw = window.localStorage ? window.localStorage.getItem(COMP_KEY) : null; } catch (e) { raw = null; }
    homeComp = "ticket";   
    for (var i = 0; i < HOME_COMPS.length; i++) { if (HOME_COMPS[i].key === raw) { homeComp = raw; } }
  }

  /* ②-1 相册卡片 / ②-5 渐变海报：图片交给统一上传器（data-slot）接管， */

  /* ②-4 天气 */
  var WX_KEY = "snowcrystal.weather.v1.";
  var WX_MINE_DEFAULT = "长沙";
  var WX_POEMS = {
    clear: ["我这边天光正好，像有你的那天", "阳光落在窗沿，替我向你问早", "我这边晴得很，适合想你"],
    cloud: ["我这边云压得很低，像想你的样子", "云把天光滤成灰色，像没说完的话", "我这边多云转晴，等你一句话"],
    rain: ["我这边落了雨，替我盛了些心事", "雨敲着窗，像你名字的节拍", "我这边下着雨，出门记得带伞"],
    snow: ["我这边下雪了，落在没有你的街上", "雪落得很轻，像怕惊动想念", "我这边飘着雪，你要多穿一件"],
    fog: ["我这边起了雾，看不清远方只看清你", "雾散之前，先想你一会儿", "我这边雾很大，路要慢点走"],
    wind: ["我这边风很大，吹得思念都往你那边去", "风把云吹散，也把心思吹向你", "我这边起风了，记得添件外套"],
    thunder: ["我这边打着雷，像心跳漏了一拍", "雷声滚过屋顶，我在想你", "我这边雷雨交加，你别出门"]
  };
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

  
