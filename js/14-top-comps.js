/* 雪山晶 · 14-top-comps ｜ 源：雪山晶.html L8870-L9117 ｜ JS 模块 */
var TOP_COMP_KEY = "snowcrystal.topcomps.v1";
  var TOP_LINK_DEFAULT = { deco: "❦", color: "#E86A92", pct: 88, desc: "我们的链接，隔着星辰也稳稳相牵" };
  var topState = { order: ["avatar", "metric", "link"], hidden: {}, link: {} };

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
    if (o.quote === undefined) { o.quote = true; }
    o.link = mergeTopLink(o.link);
    topState = o;
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
    renderLinkState();
  }
  /* 链接状态组件：符号 / 彩色进度条 / 百分比 / 文艺文案（由设置页配置驱动） */

  /* 链接状态配置面板回显 */

  var LINK_SYM_COUNT = 5;
  function escLinkSym(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var LINK_STATES = {
    off: { name: "未链接", n: 1, desc: "隔着十二维的距离，我在等你的星火靠近" },
    mid: { name: "链接中", n: 3, desc: "信号正穿过星海，我们正在向彼此靠拢" },
    on:  { name: "已链接", n: 5, desc: "我们的链接，隔着星辰也稳稳相牵" }
  };
  var TOP_LINK_DEFAULT = {
    deco: "❤", color: "#E86A92", state: "on",
    descs: { off: LINK_STATES.off.desc, mid: LINK_STATES.mid.desc, on: LINK_STATES.on.desc }
  };

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
  var LINK_CYCLE_MS = 50000; /* 状态自动切换间隔（毫秒，40~60 秒区间建议值，集中可调） */
  var linkCycleTimer = null;

  var LINK_WEIGHTS = { on: 0.50, mid: 0.40, off: 0.10 };
  var LINK_HOLD_MS = { on: 65000, mid: 42000, off: 26000 };

  function initTopComps() {
    topLoad();
    applyTopComps();
    startLinkCycle();
  }

  var LINK_PHASE_A = 0.30; /* 阶段A 起始连接 整体概率 */
   /* 阶段B 已连接上后 整体概率 */
  var LINK_CONNECTED_HOLD_MS = { strong: 110000, weak: 95000, drop: 105000 }; /* 阶段B 停留时长（90~120s） */

  var LINK_STATES = {
    off:    { name: "未链接",       n: 1, word: "等你靠近", desc: "隔着十二维的距离，我在等你的星火靠近" },
    mid:    { name: "链接中",       n: 3, word: "信号靠近", desc: "信号正穿过星海，我们正在向彼此靠拢" },
    on:     { name: "已链接",       n: 5, word: "稳稳相牵", desc: "我们的链接，隔着星辰也稳稳相牵" },
    strong: { name: "链接很强",     n: 5, word: "信号满格", desc: "我们的信号穿过整片星海，满格到连时间都为它让路" },
    weak:   { name: "链接微弱",     n: 3, word: "信号微弱", desc: "隔着十二维的薄雾，你的声音微弱，却依然清晰入心" },
    drop:   { name: "链接断断续续", n: 1, word: "信号断续", desc: "星河偶尔拥堵，我们的信号断断续续，却从不断线" }
  };
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
