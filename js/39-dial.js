/* 雪山晶 · 39-dial ｜ 源：雪山晶.html L25115-L25305 ｜ JS 模块 */
/* ================== v102：首页双法盘 —— 点击「链」「接」设时间 + 指针随真实时间持续走动 ==================
     v107：标准 12 小时钟面 —— 盘面 1~12 数字刻度（12 点在正上，顺时针递增，即 3 正右、6 正下、9 正左）；
          时针一圈 12 小时，角 = ((h%12) + m/60 + s/3600) / 12 * 360，分针 6°/分、秒针 6°/秒，与真实时间同步；
          未设置过时间 → 跟随系统真实时间；设置过 → 从该时刻起继续行走；输入 0~23 小时按 12 小时制映射到盘面。 */
  var DIAL_TIME_KEY = "snowcrystal.dial.time.v1";
  var DIAL_DAY_SEC = 86400;                 /* 一天的秒数（时间累计/取模用，时针一圈为半天 43200s） */
  var DIAL_HALF_SEC = 43200;                /* 时针一圈 = 12h = 43200s */
  var DIAL_HOUR_NUM = 12;                   /* 盘面小时刻度个数：标准 12 小时制 */
  var DIAL_NUM_R = 0.5205;                  /* 普通数字刻度半径（占盘面尺寸比例，落在盘面最外环与虚线环之间的空白带） */
  var DIAL_NUM_R_MAJOR = 0.5155;            /* 12/3/6/9 主刻度略内收，与普通刻度形成层级 */
  var DIAL_TICK_NUM = 60;                  /* 一圈刻度格数：60 格（对应 60 分 / 60 秒），每格 6° */
  var DIAL_TICK_MAJOR_STEP = 5;            /* 每 5 格 = 30° 一个整点主刻度 → 一圈 12 个（12/3/6/9 等） */
  var DIAL_TICK_R_MINOR_IN = 176;          /* 次刻度内端半径（SVG 用户单位，圆心 200 / 盘径 400） */
  var DIAL_TICK_R_MINOR_OUT = 191;         /* 次刻度外端半径 */
  var DIAL_TICK_R_MAJOR_IN = 166;          /* 主刻度内端半径（更长） */
  var DIAL_TICK_R_MAJOR_OUT = 192.5;       /* 主刻度外端半径 */
  var DIAL_TICK_W_MINOR = 2.9;             /* 次刻度线宽（用户单位，随盘面尺寸缩放） */
  var DIAL_TICK_W_MAJOR = 5.6;             /* 主刻度线宽（更粗/更亮） */
  var _dialTickTimer = null;
  function dialLoadTimes() {
    var raw = null;
    try { raw = JSON.parse(window.localStorage.getItem(DIAL_TIME_KEY) || "{}"); } catch (e) { raw = {}; }
    if (!raw || typeof raw !== "object") { raw = {}; }
    return raw;
  }
  function dialSaveTimes(obj) {
    try { window.localStorage.setItem(DIAL_TIME_KEY, JSON.stringify(obj || {})); } catch (e) { /* 忽略 */ }
  }
  /* 返回法盘当天秒数（0~86399.999）：未设置过 → 跟随系统真实时间；设置过 → 自设置时刻起继续走 */
  function dialCurTotal(role) {
    var all = dialLoadTimes(), d = all[role];
    if (!d || typeof d.h !== "number") {
      var now = new Date();
      return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
    }
    var elapsed = (Date.now() - (Number(d.setAt) || Date.now())) / 1000;
    var total = (Number(d.h) || 0) * 3600 + (Number(d.m) || 0) * 60 + (Number(d.s) || 0) + elapsed;
    return ((total % DIAL_DAY_SEC) + DIAL_DAY_SEC) % DIAL_DAY_SEC;
  }
  function dialFmtHM(total) {
    total = ((total % DIAL_DAY_SEC) + DIAL_DAY_SEC) % DIAL_DAY_SEC;
    var h = Math.floor(total / 3600), mi = Math.floor((total % 3600) / 60);
    return (h < 10 ? "0" : "") + h + ":" + (mi < 10 ? "0" : "") + mi;
  }
  /* 12h 制下三针角度（deg）：与盘面数字刻度严格对齐 —— 数字 n（1~12，12 视为 0 点刻度）位于 (n%12)/12*360° 处 */
  function dialAngles(total) {
    total = ((total % DIAL_DAY_SEC) + DIAL_DAY_SEC) % DIAL_DAY_SEC;
    var half = total % DIAL_HALF_SEC;         /* 时针只看半天内的秒数，一圈 12 小时 */
    return {
      h: half / DIAL_HALF_SEC * 360,          /* = ((h%12) + m/60 + s/3600) / 12 * 360 */
      m: (total % 3600) / 3600 * 360,         /* = m*6 + s*0.1 */
      s: Math.floor(total % 60) * (360 / DIAL_TICK_NUM)   /* v15：跳秒量化，严格对准 60 格刻度竖线，不落在两线中间 */
    };
  }
  function dialApply(role) {
    /* V18 降温：后台不可见时不更新表盘指针，避免隐藏页持续触发合成 */
    if (document.hidden) { return; }
    var host = document.querySelector(".time-dial-" + role);
    if (!host) { return; }
    var a = dialAngles(dialCurTotal(role));
    var hEl = host.querySelector(".td-h"), mEl = host.querySelector(".td-m"), sEl = host.querySelector(".td-s");
    if (hEl) { hEl.style.transform = "rotate(" + a.h.toFixed(3) + "deg)"; }
    if (mEl) { mEl.style.transform = "rotate(" + a.m.toFixed(3) + "deg)"; }
    if (sEl) { sEl.style.transform = "rotate(" + a.s.toFixed(3) + "deg)"; }
  }
  function dialReset(role) {
    var host = document.querySelector(".time-dial-" + role);
    if (!host) { return; }
    var sels = [".td-h", ".td-m", ".td-s"];
    for (var i = 0; i < sels.length; i++) {
      var el = host.querySelector(sels[i]);
      if (el) { el.style.transform = ""; }
    }
    dialApply(role);
  }
  /* 12 格数字刻度：12 点正上方起顺时针 1~12（3 正右、6 正下、9 正左）；3/6/9/12 为主刻度（加粗加大） */
  function dialBuildNumerals(host) {
    if (!host || host.getAttribute("data-numerals") === String(DIAL_HOUR_NUM)) { return; }
    host.setAttribute("data-numerals", String(DIAL_HOUR_NUM));
    /* 兼容旧版：清掉可能残留的 24 格刻度 */
    var old = host.querySelectorAll(".td-n");
    for (var k = 0; k < old.length; k++) {
      if (old[k].parentNode) { old[k].parentNode.removeChild(old[k]); }
    }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < DIAL_HOUR_NUM; i++) {
      var ang = i / DIAL_HOUR_NUM * Math.PI * 2;
      var major = (i % 3 === 0);
      var r = (major ? DIAL_NUM_R_MAJOR : DIAL_NUM_R) * 100;
      var num = (i === 0 ? DIAL_HOUR_NUM : i);      /* 正上方是 12，其余顺时针 1~11 */
      var el = document.createElement("span");
      el.className = major ? "td-n td-n-major" : "td-n";
      el.setAttribute("data-num", String(num));
      el.setAttribute("aria-hidden", "true");
      el.textContent = String(num);
      el.style.left = (50 + r * Math.sin(ang)).toFixed(3) + "%";
      el.style.top = (50 - r * Math.cos(ang)).toFixed(3) + "%";
      frag.appendChild(el);
    }
    host.appendChild(frag);
  }
  /* 60 格标准时钟刻度：0° 对准 12 点方向，顺时针每格 6°；每 5 格（30°）为主刻度，更长/更粗/更亮 */
  function dialBuildTicks(host) {
    if (!host) { return; }
    var svg = host.querySelector(".td-svg");
    if (!svg) { return; }
    /* 先清掉旧刻度（72 根短线 / 60 段虚线 / 上一次生成的刻度），避免叠加残留 */
    var stale = svg.querySelectorAll(".mc-ticks, .td-tick-scale");
    for (var s2 = 0; s2 < stale.length; s2++) {
      if (stale[s2].parentNode) { stale[s2].parentNode.removeChild(stale[s2]); }
    }
    var NS = "http://www.w3.org/2000/svg";
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", "td-tick-scale");
    g.setAttribute("data-tick-num", String(DIAL_TICK_NUM));
    g.setAttribute("data-tick-major-step", String(DIAL_TICK_MAJOR_STEP));
    g.setAttribute("aria-hidden", "true");
    for (var i = 0; i < DIAL_TICK_NUM; i++) {
      var isMajor = (i % DIAL_TICK_MAJOR_STEP === 0);
      var ang = i / DIAL_TICK_NUM * Math.PI * 2;      /* i=0 → 正上方 12 点，顺时针递增 */
      var r0 = isMajor ? DIAL_TICK_R_MAJOR_IN : DIAL_TICK_R_MINOR_IN;
      var r1 = isMajor ? DIAL_TICK_R_MAJOR_OUT : DIAL_TICK_R_MINOR_OUT;
      var ln = document.createElementNS(NS, "line");
      ln.setAttribute("class", isMajor ? "td-tk td-tk-major" : "td-tk");
      ln.setAttribute("data-tick-index", String(i));
      ln.setAttribute("x1", (200 + r0 * Math.sin(ang)).toFixed(3));
      ln.setAttribute("y1", (200 - r0 * Math.cos(ang)).toFixed(3));
      ln.setAttribute("x2", (200 + r1 * Math.sin(ang)).toFixed(3));
      ln.setAttribute("y2", (200 - r1 * Math.cos(ang)).toFixed(3));
      ln.setAttribute("stroke-width", String(isMajor ? DIAL_TICK_W_MAJOR : DIAL_TICK_W_MINOR));
      g.appendChild(ln);
    }
    svg.appendChild(g);
  }
  function dialBuildAll() {
    dialBuildNumerals(document.querySelector(".time-dial-tr"));
    dialBuildTicks(document.querySelector(".time-dial-tr"));
    dialBuildNumerals(document.querySelector(".time-dial-bl"));
    dialBuildTicks(document.querySelector(".time-dial-bl"));
  }
  function dialTickAll() {
    dialApply("tr");
    dialApply("bl");
  }
  function dialStartTick() {
    dialTickAll();
    if (_dialTickTimer) { return; }
    _dialTickTimer = window.setInterval(dialTickAll, 1000);
  }
  function dialPickTime(role) {
    var label = role === "tr" ? "链盘" : "接盘";
    var total = dialCurTotal(role);
    var cur = dialFmtHM(total);
    wcPrompt("设置" + label + "时间", cur, "填 09:30 或 21:15:20 这样的时间（24 小时制），盘面按 12 小时钟面对应显示，指针会从这一刻继续走；填 - 改回跟随真实时间", function (v) {
      var str = String(v == null ? "" : v).replace(/\s+/g, "").replace(/[：点]/g, ":").replace(/分/g, ":");
      str = str.replace(/:+$/, "");
      var all = dialLoadTimes();
      if (str === "-" || str === "－" || str === "—") {
        try { delete all[role]; } catch (e) { /* 忽略 */ }
        dialSaveTimes(all);
        dialReset(role);
        wcToast("已改回跟随真实时间");
        return;
      }
      var mt = str.match(/^(\d{1,2})?:?(\d{1,2})(?::(\d{1,2}))?$/);
      if (!mt) { wcToast("格式不对，试试 09:30 这样写"); return; }
      var hh = parseInt(mt[1] || "0", 10), mm = parseInt(mt[2] || "0", 10), ss = parseInt(mt[3] || "0", 10);
      if (!(hh >= 0 && hh <= 23) || !(mm >= 0 && mm <= 59) || !(ss >= 0 && ss <= 59)) { wcToast("时间超出范围，请填 00:00 ~ 23:59"); return; }
      all[role] = { h: hh, m: mm, s: ss, setAt: Date.now() };
      dialSaveTimes(all);
      dialApply(role);
      dialStartTick();
      wcToast(label + "已设为 " + (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm);
    });
  }
  window.SnowCrystal = window.SnowCrystal || {};
  window.SnowCrystal.dialPickTime = dialPickTime;
  window.SnowCrystal.dialResetTime = function (role) {
    var all = dialLoadTimes();
    try { delete all[role]; } catch (e) { }
    dialSaveTimes(all);
    dialReset(role);
    dialTickAll();
    wcToast("已改回跟随真实时间");
  };
  try { dialBuildAll(); dialStartTick(); } catch (e3) { /* 忽略 */ }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { try { dialTickAll(); } catch (e4) { /* 忽略 */ } }
  });
