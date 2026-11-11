/* 雪山晶 · 13-home-widgets ｜ 源：雪山晶.html L8640-L8870 ｜ JS 模块 */
/* ②-3b 飞机票：纬度 / 航班编号可点击修改 + 水晶簇定位 */
  var TK_KEY = "snowcrystal.ticket.v1.";
  function tkGet(k, dft) {
    var v = null;
    try { v = window.localStorage ? window.localStorage.getItem(TK_KEY + k) : null; } catch (e) { v = null; }
    return (v === null || v === "") ? dft : v;
  }
  function tkSet(k, v) {
    try { if (window.localStorage) { window.localStorage.setItem(TK_KEY + k, String(v)); } } catch (e) { /* 本机不可写时忽略 */ }
  }
  /* 水晶簇：垂直居中于 39°N，水平左缘对齐「心之所向」 */
  var tkTries = 0;
  function layoutTicketCrystal() {
    var main = document.querySelector("#hcTicket .hc-tk-main");
    var cry = document.querySelector("#hcTicket .hc-tk-crystal");
    if (!cry) { return; } 
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

  function bindBgUpload(host, dataAttr) {
    if (!host || host.getAttribute("data-bg-bound") === "1") { return; }
    var bg = host.querySelector(".hc-bg");
    if (!bg) { return; }
    host.setAttribute("data-bg-bound", "1");
    host.addEventListener("click", function (e) {
      var t = e.target || e.srcElement;
      if (closestData(t, dataAttr, host)) { return; }
      if (t && t.getAttribute && t.getAttribute("data-slot")) { return; }
      pickImage(bg); /* 手势同步栈内直接弹选择器，Safari 也可靠 */
    });
    host.addEventListener("dblclick", function (e) {
      var t = e.target || e.srcElement;
      if (closestData(t, dataAttr, host)) { return; }
      if (t && t.getAttribute && t.getAttribute("data-slot")) { return; }
      pendingEl = null;
      pendingSlot = null;
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

  /* ②-6 纪念日：三个日子 · 点击可改 · 自动算天数 */
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
    wxTxt("homeDays", tog ? "在一起 " + (anDays(tog, anToday()) + 1) + " 天" : "点一下写下纪念日");
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

  /* 按当前选择，只显示一个组件（其余 hidden；相册卡片流改用行内 display 收放， */
  function applyHomeComponent() {
    var frame = document.getElementById("frameFlow");
    if (frame) { frame.removeAttribute("hidden"); frame.style.display = ""; }
    var slots = ["hcAlbum", "hcAnniv", "hcTicket", "hcWeather", "hcPoster"];
    for (var i = 0; i < slots.length; i++) {
      var el = document.getElementById(slots[i]);
      if (el) { el.removeAttribute("hidden"); }
    }
    anPaint();
    wxPaint();
    tkPaint();
  }
  function initHomeComp() {
    compLoad();
    applyHomeComponent();
    bindWeather();
    bindTicket();
    bindAnniv();
    tkPaint();
  }

  function openBeautify() { switchPage("beautify"); }
  function openAppearance() { switchPage("appearance"); }
  function back() { switchPage("settings"); }

  
  /* URL 参数（theme / page），便于分享与预览 */
  function applyDeepLink() {
    var q = String(window.location.search || "");
    var mt = /[?&]theme=([^&]+)/.exec(q);
    if (mt) {
      var v = window.decodeURIComponent(mt[1]);
      var spec = resolveKey(v);
      if (spec) { state.key = spec.key; state.name = spec.name; state.base = spec.base; state.mode = spec.mode; }

    }
    var mp = /[?&]page=([^&]+)/.exec(q);
    var page = mp ? window.decodeURIComponent(mp[1]) : String(window.location.hash || "").replace(/^#/, "");
    if (page) { switchPage(page); }
    applyState();
    syncUi();
  }

  
