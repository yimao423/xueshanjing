/* 雪山晶 · 10-theme-panels ｜ 源：雪山晶.html L7866-L8231 ｜ JS 模块 */
/* 背景颗粒模块已移除（2026-10-19）：原 v88 grainLoad/Save/Apply/syncGrainUi */

  var POPUP_KEY = "snowcrystal.popup.v1";
  var POPUP_A_DEFAULT = 1;
  var POPUP_TEXT_DEFAULT = "#000000";
  var POPUP_TEXT_DARK_DEFAULT = "#EDEDF2";
  var popupState = { a: POPUP_A_DEFAULT, text: "" };

  function popupLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(POPUP_KEY) : null;
      if (!raw) { return; }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") { return; }
      if (typeof obj.a === "number" && isFinite(obj.a)) {
        popupState.a = Math.max(0, Math.min(1, obj.a));
      }
      var t = normHex(obj.text);
      if (t) { popupState.text = t; }
    } catch (e) { /* 忽略 */ }
  }

  function popupStore() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(POPUP_KEY, JSON.stringify({ a: popupState.a, text: popupState.text }));
      }
    } catch (e) { /* 忽略 */ }
  }

  function popupApply() {
    var root = document.documentElement;
    var dark = state.mode === "dark";
    var text = popupState.text || (dark ? POPUP_TEXT_DARK_DEFAULT : POPUP_TEXT_DEFAULT);
    root.style.setProperty("--popup-a", popupState.a.toFixed(2));
    root.style.setProperty("--popup-text", text);
  }

  function syncPopupUi() {
    var r = document.getElementById("popupOpacity");
    if (r) { r.value = String(Math.round(popupState.a * 100)); }
    var hex = document.getElementById("popupOpacityHex");
    if (hex) { hex.textContent = Math.round(popupState.a * 100) + "%"; }
    var pick = document.getElementById("popupColor");
    if (pick) { pick.value = popupState.text || POPUP_TEXT_DEFAULT; }
    var lab = document.getElementById("popupColorHex");
    if (lab) { lab.textContent = popupState.text ? popupState.text.toUpperCase() : "亮色默认黑"; }
  }

  function bindPopupPanel() {
    var r = document.getElementById("popupOpacity");
    if (r) {
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        popupState.a = v;
        popupApply();
        popupStore();
        syncPopupUi();
      });
    }
    var rBtn = document.getElementById("popupOpacityReset");
    if (rBtn) {
      rBtn.addEventListener("click", function () {
        popupState.a = POPUP_A_DEFAULT;
        popupStore();
        popupApply();
        syncPopupUi();
        tip("弹窗不透明度已恢复为 100%。");
      });
    }
    var pick = document.getElementById("popupColor");
    if (pick) {
      pick.addEventListener("input", function () {
        popupState.text = normHex(pick.value) || "";
        popupApply();
        popupStore();
        syncPopupUi();
      });
      pick.addEventListener("change", function () {
        popupState.text = normHex(pick.value) || "";
        popupApply();
        popupStore();
        syncPopupUi();
      });
    }
    var cBtn = document.getElementById("popupColorReset");
    if (cBtn) {
      cBtn.addEventListener("click", function () {
        popupState.text = "";
        popupStore();
        popupApply();
        syncPopupUi();
        tip("弹窗字体颜色已恢复默认：亮色黑色 / 暗色自适应。");
      });
    }
    var reset = document.getElementById("popupReset");
    if (reset) {
      reset.addEventListener("click", function () {
        popupState.a = POPUP_A_DEFAULT;
        popupState.text = "";
        try { if (window.localStorage) { window.localStorage.removeItem(POPUP_KEY); } } catch (e) { /* 忽略 */ }
        popupApply();
        syncPopupUi();
        tip("弹窗样式已复位：100% 不透明实底 + 默认字体颜色。");
      });
    }
  }

  var DENIM_KEY = "snowcrystal.denim.v1";
  var DENIM_KINDS = ["denim", "grain", "starlight", "grid", "ripple"];
  var DENIM_KIND_DEFAULT = "grid";
  var DENIM_SIZE_DEFAULT = 2;
  var DENIM_A_DEFAULT = 0.20;
  var denimState = { kind: DENIM_KIND_DEFAULT, size: DENIM_SIZE_DEFAULT, a: DENIM_A_DEFAULT };

  function denimLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(DENIM_KEY) : null;
      if (!raw) { return; }
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") { return; }
      var kd = o.kind;
      var legacyDefault =
        (!kd || kd === "denim") &&
        (o.size === undefined || o.size === 6) &&
        (o.a === undefined || o.a === 0.45);
      if (legacyDefault) {
        denimState.kind = DENIM_KIND_DEFAULT;
        denimState.size = DENIM_SIZE_DEFAULT;
        denimState.a = DENIM_A_DEFAULT;
        denimSave();
        return;
      }
      if (kd && DENIM_KINDS.indexOf(kd) !== -1) { denimState.kind = kd; }
      var sz = parseInt(o.size, 10);
      if (isFinite(sz)) { denimState.size = Math.max(2, Math.min(24, sz)); }
      var a = parseFloat(o.a);
      if (isFinite(a)) { denimState.a = Math.max(0, Math.min(1, a)); }
    } catch (e) { /* 忽略 */ }
  }
  function denimSave() {
    try { if (window.localStorage) { window.localStorage.setItem(DENIM_KEY, JSON.stringify(denimState)); } } catch (e) { /* 忽略 */ }
  }
  function denimApply() {
    var root = document.documentElement;
    root.style.setProperty("--denim-size", denimState.size + "px");
    root.style.setProperty("--denim-a", denimState.a.toFixed(2));
    var els = document.querySelectorAll(".wave-card .denim-texture, .page[data-page='home'] > .denim-texture");
    for (var i = 0; i < els.length; i++) { els[i].setAttribute("data-kind", denimState.kind); }
  }
  function syncDenimUi() {
    var r = document.getElementById("denimSize");
    if (r) { r.value = String(denimState.size); }
    var rh = document.getElementById("denimSizeHex");
    if (rh) { rh.textContent = denimState.size + "px"; }
    var a = document.getElementById("denimOpacity");
    if (a) { a.value = String(Math.round(denimState.a * 100)); }
    var ah = document.getElementById("denimOpacityHex");
    if (ah) { ah.textContent = Math.round(denimState.a * 100) + "%"; }
    var btns = document.querySelectorAll(".denim-kind-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("is-on", btns[i].getAttribute("data-kind") === denimState.kind);
    }
  }
  function bindDenimPanel() {
    var r = document.getElementById("denimSize");
    if (r && r.getAttribute("data-bound") !== "1") {
      r.setAttribute("data-bound", "1");
      r.addEventListener("input", function () {
        var n = parseInt(r.value, 10);
        denimState.size = isFinite(n) ? Math.max(2, Math.min(24, n)) : DENIM_SIZE_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
      });
    }
    var rs = document.getElementById("denimSizeReset");
    if (rs && rs.getAttribute("data-bound") !== "1") {
      rs.setAttribute("data-bound", "1");
      rs.addEventListener("click", function () {
        denimState.size = DENIM_SIZE_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理大小已恢复为 2px。");
      });
    }
    var a = document.getElementById("denimOpacity");
    if (a && a.getAttribute("data-bound") !== "1") {
      a.setAttribute("data-bound", "1");
      a.addEventListener("input", function () {
        var n = parseInt(a.value, 10);
        denimState.a = isFinite(n) ? Math.max(0, Math.min(100, n)) / 100 : DENIM_A_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
      });
    }
    var ra = document.getElementById("denimOpacityReset");
    if (ra && ra.getAttribute("data-bound") !== "1") {
      ra.setAttribute("data-bound", "1");
      ra.addEventListener("click", function () {
        denimState.a = DENIM_A_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理不透明度已恢复为 20%。");
      });
    }
    var btns = document.querySelectorAll(".denim-kind-btn");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-bound") === "1") { continue; }
      btns[i].setAttribute("data-bound", "1");
      btns[i].addEventListener("click", function () {
        var kd = this.getAttribute("data-kind");
        if (DENIM_KINDS.indexOf(kd) === -1) { return; }
        denimState.kind = kd;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理已切换为" + (kd === "denim" ? "牛仔。" : kd === "grain" ? "磨砂颗粒。" : kd === "starlight" ? "星光闪烁。" : kd === "grid" ? "网格线。" : "水波纹。"));
      });
    }
  }

  var BG_KEY = "snow_crystal_bg_v30";
  var BG_OP_KEY = "snow_crystal_bg_op_v30";
  var SITE_BG_KEY = "snow_crystal_site_bg_v41";
  var BG_MAX = 1440, BG_Q = 0.86;
  var bgMem = "";                      /* 内存兜底 */

  function bgStore(key, val) { try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function bgRead(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function bgCurrent() { return bgRead(BG_KEY) || bgMem; }
  function bgOpacity() {
    var n = parseFloat(bgRead(BG_OP_KEY));
    return (isFinite(n) && n >= 0 && n <= 1) ? n : 1;
  }
  function updateBgLayer() {
    var data = bgCurrent();
    var el = document.getElementById("bgPhoto");
    if (el) {
      if (data) { el.style.setProperty("--bg-photo", 'url("' + data + '")'); el.setAttribute("data-on", "1"); }
      else { el.style.removeProperty("--bg-photo"); el.setAttribute("data-on", "0"); }
    }
    document.documentElement.style.setProperty("--bg-photo-a", bgOpacity().toFixed(2));
    var thumb = document.getElementById("bgThumb");
    if (thumb) { thumb.style.backgroundImage = data ? 'url("' + data + '")' : "none"; }
  }
  function syncBgUi() {
    var p = Math.round(bgOpacity() * 100);
    var r = document.getElementById("bgOpacity"), hex = document.getElementById("bgOpacityHex");
    if (r) { r.value = String(p); }
    if (hex) { hex.textContent = p + "%"; }
  }
  function bgSetImage(dataUrl) {
    bgMem = dataUrl || "";
    var ok = true;
    if (dataUrl) { ok = bgStore(BG_KEY, dataUrl); }
    else { try { window.localStorage.removeItem(BG_KEY); } catch (e) {} }
    updateBgLayer();
    return ok;
  }
  function bgCompress(file, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { done(fr.result); return; }
        var k = Math.min(1, BG_MAX / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(w * k));
        cv.height = Math.max(1, Math.round(h * k));
        var ctx = cv.getContext("2d");
        if (!ctx) { done(fr.result); return; }
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        var out = fr.result;
        try { out = cv.toDataURL("image/jpeg", BG_Q) || fr.result; } catch (e) { out = fr.result; }
        done(out);
      };
      img.onerror = function () { done(fr.result); };
      img.src = fr.result;
    };
    fr.onerror = function () { done(null); };
    fr.readAsDataURL(file);
  }
  function bindBgPanel() {
    var pick = document.getElementById("bgPick");
    var clr = document.getElementById("bgClear");
    var file = document.getElementById("bgFile");
    var r = document.getElementById("bgOpacity");
    var rBtn = document.getElementById("bgOpacityReset");
    if (pick && file) {
      pick.addEventListener("click", function () { file.value = ""; file.click(); });
    }
    if (file) {
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        if (!f) { return; }
        tip("正在处理背景图片…");
        bgCompress(f, function (data) {
          if (!data) { tip("这张图片没能读取成功，换一张试试。"); return; }
          var ok = bgSetImage(data);
          syncBgUi();
          tip(ok ? "背景图片已设置，并永久保存在本机（刷新 / 重开都在）。"
                 : "背景图片已应用，但本机存储写不进去，只在本次会话保留。");
        });
      });
    }
    if (clr) {
      clr.addEventListener("click", function () { bgSetImage(""); tip("背景图片已清除。"); });
    }
    if (r) {
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        document.documentElement.style.setProperty("--bg-photo-a", v.toFixed(2));
        var hex = document.getElementById("bgOpacityHex");
        if (hex) { hex.textContent = Math.round(v * 100) + "%"; }
        bgStore(BG_OP_KEY, String(v));
      });
    }
    if (rBtn) {
      rBtn.addEventListener("click", function () {
        bgStore(BG_OP_KEY, "1");
        document.documentElement.style.setProperty("--bg-photo-a", "1.00");
        syncBgUi();
        tip("背景图不透明度已恢复为 100%。");
      });
    }
    var colorPick = document.getElementById("bgColorPick");
    var colorReset = document.getElementById("bgColorReset");
    function applySiteBg(hex) {
      var root = document.documentElement;
      if (hex) {
        root.style.setProperty("--site-bg", hex);
        root.setAttribute("data-site-bg", "1");
      } else {
        root.style.removeProperty("--site-bg");
        root.removeAttribute("data-site-bg");
      }
      if (colorPick && hex) { colorPick.value = hex; }
      var lab = document.getElementById("bgColorHex");
      if (lab) { lab.textContent = hex ? hex.toUpperCase() : "跟随主题"; }
    }
    applySiteBg(bgRead(SITE_BG_KEY) || "");
    if (colorPick) {
      colorPick.addEventListener("input", function () {
        bgStore(SITE_BG_KEY, colorPick.value);
        applySiteBg(colorPick.value);
      });
      colorPick.addEventListener("change", function () {
        bgStore(SITE_BG_KEY, colorPick.value);
        applySiteBg(colorPick.value);
      });
    }
    if (colorReset) {
      colorReset.addEventListener("click", function () {
        try { window.localStorage.removeItem(SITE_BG_KEY); } catch (e) { /* 忽略 */ }
        applySiteBg("");
        tip("背景颜色已恢复为跟随主题。");
      });
    }
  }

  
