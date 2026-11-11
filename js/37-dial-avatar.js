/* 雪山晶 · 37-dial-avatar ｜ 源：雪山晶.html L23959-L24158 ｜ JS 模块 */
(function () {
  var KEY = "snowcrystal.dialAvatar.v1.";
  var DEFAULT = '<svg viewBox="0 0 96 96" width="100%" height="100%" aria-hidden="true"><circle cx="48" cy="48" r="48" fill="rgba(0,0,0,0.06)"/><circle cx="48" cy="37" r="16" fill="rgba(0,0,0,0.30)"/><path d="M17 86c2.5-17 13-26 31-26s28.5 9 31 26z" fill="rgba(0,0,0,0.30)"/></svg>';
  var pendingRole = null;

  /* 统一持久化通道：优先 XJ_STORE（localStorage 主通道 + IndexedDB 镜像兜底），回退原生 */
  function storeGet(k) {
    try {
      if (window.XJ_STORE && window.XJ_STORE.get) { return window.XJ_STORE.get(k); }
      return window.localStorage.getItem(k);
    } catch (e) { return null; }
  }
  function storeSet(k, v) {
    try {
      if (window.XJ_STORE && window.XJ_STORE.set) { window.XJ_STORE.set(k, v); }
      else { window.localStorage.setItem(k, v); }
    } catch (e) { /* 忽略 */ }
  }
  function storeRemove(k) {
    try {
      if (window.XJ_STORE && window.XJ_STORE.remove) { window.XJ_STORE.remove(k); }
      else { window.localStorage.removeItem(k); }
    } catch (e) { /* 忽略 */ }
  }

  function apply(role, dataUrl) {
    var el = document.getElementById("dialAvatar-" + role);
    if (!el) { return; }
    if (dataUrl) {
      el.style.backgroundImage = 'url("' + dataUrl + '")';
      el.innerHTML = "";
      el.classList.add("has-photo");
    } else {
      el.style.backgroundImage = "";
      el.innerHTML = DEFAULT;
      el.classList.remove("has-photo");
    }
  }
  function restore() {
    ["tr", "bl"].forEach(function (r) {
      apply(r, storeGet(KEY + r));
    });
  }
  function compress(dataUrl, max, q, done) {
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) { done(null); return; }
      var k = Math.min(1, max / Math.max(w, h));
      var cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * k));
      cv.height = Math.max(1, Math.round(h * k));
      var ctx = cv.getContext("2d");
      if (!ctx) { done(null); return; }
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      var out = null;
      try { out = cv.toDataURL("image/jpeg", q); } catch (e) { out = null; }
      done(out);
    };
    img.onerror = function () { done(null); };
    img.src = dataUrl;
  }
  function onFile(e) {
    var input = e.target;
    var f = input.files && input.files[0];
    var role = pendingRole;
    pendingRole = null;
    if (!f || !role) { return; }
    var fr = new FileReader();
    fr.onload = function () {
      compress(fr.result, 256, 0.85, function (out) {
        var url = out || fr.result;
        apply(role, url);
        storeSet(KEY + role, url);
      });
    };
    fr.onerror = function () {};
    fr.readAsDataURL(f);
  }

  /* 单击调度 / 双击判定 */
  var singleTimer = null;
  var singleRole = null;
  var lastClickAt = 0;
  var DBL_WINDOW = 380;   /* 双击判定窗口（ms） */
  var OPEN_DELAY = 350;   /* 单击调度延迟（ms） */

  function cancelSingle() {
    if (singleTimer) { clearTimeout(singleTimer); singleTimer = null; }
    singleRole = null;
  }
  function pick(role) {
    var now = Date.now();
    if (singleTimer) { clearTimeout(singleTimer); singleTimer = null; }
    if (now - lastClickAt < DBL_WINDOW) {
      /* 双击第二击：不打开面板、不弹选择器，静默等待 dblclick 执行清除 */
      lastClickAt = now;
      return;
    }
    lastClickAt = now;
    singleRole = role;
    singleTimer = setTimeout(function () {
      singleTimer = null;
      openPanel(role);
    }, OPEN_DELAY);
  }

  /* 头像操作面板（页面内浮层，避免系统模态选择器吞掉双击事件） */
  var panelEl = null;
  var panelRole = null;
  var panelBuilt = false;

  function buildPanel() {
    if (panelBuilt) { return; }
    panelBuilt = true;
    panelEl = document.createElement("div");
    panelEl.className = "dial-avatar-panel";
    panelEl.setAttribute("role", "dialog");
    panelEl.setAttribute("aria-label", "头像操作");
    panelEl.innerHTML =
      '<div class="dap-card">' +
        '<div class="dap-title">头像设置</div>' +
        '<button type="button" class="dap-btn dap-upload">上传头像</button>' +
        '<button type="button" class="dap-btn dap-clear" hidden>清除头像</button>' +
        '<div class="dap-hint">双击头像可直接清除</div>' +
      '</div>';
    document.body.appendChild(panelEl);
    panelEl.addEventListener("click", function (e) { e.stopPropagation(); });
    panelEl.querySelector(".dap-upload").addEventListener("click", function () {
      var role = panelRole;
      closePanel();
      if (role) { startPick(role); }  /* 手势同步栈内弹选择器，跨浏览器可靠 */
    });
    panelEl.querySelector(".dap-clear").addEventListener("click", function () {
      var role = panelRole;
      closePanel();
      if (role) { window.SnowCrystal.removeDialAvatar(role); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.keyCode === 27) { closePanel(); }
    });
    /* 点击面板外部任意区域关闭（面板内部点击已 stopPropagation） */
    document.addEventListener("click", function (e) {
      if (panelEl && panelEl.style.display !== "none" && !panelEl.contains(e.target)) { closePanel(); }
    }, true);
  }
  function openPanel(role) {
    buildPanel();
    panelRole = role;
    var el = document.getElementById("dialAvatar-" + role);
    var has = el && el.classList.contains("has-photo");
    var clearBtn = panelEl.querySelector(".dap-clear");
    if (clearBtn) { clearBtn.hidden = !has; }
    panelEl.style.display = "block";
  }
  function closePanel() {
    if (panelEl) { panelEl.style.display = "none"; }
    panelRole = null;
  }

  function startPick(role) {
    var input = document.getElementById("dialAvatarPicker");
    if (!input) { return; }
    input.value = "";
    pendingRole = role;
    input.click(); /* 用户手势同步栈内调用，任何浏览器均可靠弹出选择器 */
  }

  var S = window.SnowCrystal = window.SnowCrystal || {};
  S.pickDialAvatar = pick;
  S.removeDialAvatar = function (role) {
    apply(role, null);
    storeRemove(KEY + role);
  };
  S.clearDialAvatar = function (role) {
    cancelSingle();
    pendingRole = null;
    var input = document.getElementById("dialAvatarPicker");
    if (input) { input.value = ""; }
    closePanel();
    S.removeDialAvatar(role);
  };

  function init() {
    var input = document.getElementById("dialAvatarPicker");
    if (input && input.getAttribute("data-bound") !== "1") {
      input.setAttribute("data-bound", "1");
      input.addEventListener("change", onFile);
    }
    restore();
    /* 跨会话持久化：XJ_STORE 的 IndexedDB 存档恢复完成后重新应用头像 */
    if (window.XJ_STORE && window.XJ_STORE.onReady) {
      window.XJ_STORE.onReady(function () { restore(); });
    }
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); }
  else { init(); }
})();
