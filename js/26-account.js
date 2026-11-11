/* 雪山晶 · 26-account ｜ 源：雪山晶.html L12978-L13778 ｜ JS 模块 */
/* 账号设置（账号设置，适配雪晶纯前端 SPA） */
(function () {
  "use strict";

 /* 状态常量（ CHAT_ONLINE_STATUSES / CHAT_MOOD_STATUSES） */
  var ONLINE_STATUSES = [
    { text: "在线", dot: "#58C878" },
    { text: "离线", dot: "#B0B0B0" },
    { text: "离开", dot: "#E0A84C" },
    { text: "忙碌", dot: "#E86858" },
    { text: "勿扰", dot: "#D068A0" },
    { text: "隐身", dot: "#A8A0C8" }
  ];
  var MOOD_STATUSES = [
    "开心", "想你", "元气满满", "安静", "温柔", "有点困", "发呆中",
    "傲娇", "小确幸", "期待见面", "心情不错", "专心摸鱼", "懒洋洋", "美滋滋"
  ];

  /* 存储键（雪晶前缀，纳入数据管理备份） */
  var MY_KEY = "snowcrystal.account.my.v1";
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  /* 首页头像 / 昵称键（与 calendar.js 共用同一套本机存储） */
  var HOME_IMG_KEY = "snowcrystal.image.v1.";
  var HOME_NAME_KEY = "snowcrystal.name.v1.";

  /* 头像压缩参数（对齐雪晶全站 IMG_MAX / IMG_Q 习惯） */
  /* 头像压缩长边动态跟随设备内存：原写死 200，现按 XJ_CAP.avatarMax() 分档（200/240/280/ */
  var AVATAR_MAX = (window.XJ_CAP ? XJ_CAP.avatarMax() : 200), AVATAR_Q = 0.8;
  /* 头像 base64 硬上限：正常压缩产物远小于此值；仅当压缩链路彻底失败回退原图时才可能触及 */
  var ACC_AVATAR_HARD_LIMIT = 400 * 1024;

  /* 编辑暂存 */
  var editing = null; /* { type: "my"|"partner", id, name, avatar, shape, online, moo */
  var statusPickerKind = "";

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var _toastTimer = null;
  function toastSmart(text) {
    var el = document.getElementById("accToast");
    if (!el) { return; }
    el.textContent = text;
    el.classList.add("is-on");
    if (_toastTimer) { window.clearTimeout(_toastTimer); }
    _toastTimer = window.setTimeout(function () { el.classList.remove("is-on"); }, 1600);
  }
  /* 内存兜底存储：localStorage 不可用（第三方浏览器隐私模式 / 存储被禁用）时保证当前会话内 */
  var _memStore = {};
  var _memOnly = false; /* localStorage 完全不可用后置 true，读写全部走内存 */
  function _lsProbe() {
    try {
      if (!window.localStorage) { return false; }
      var t = "__snowcrystal_ls_probe__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  }
  function lsGet(key) {
    /* 优先统一存储层 XJ_STORE（localStorage 主通道 + IndexedDB 兜底 + 内存镜像， */
    if (window.XJ_STORE && typeof window.XJ_STORE.get === "function") {
      return window.XJ_STORE.get(key);
    }
    var v = null;
    try { if (!_memOnly && window.localStorage) { v = window.localStorage.getItem(key); } } catch (e) { v = null; }
    if (v == null && _memStore.hasOwnProperty(key)) { v = _memStore[key]; }
    return v;
  }
  /* 返回值： "ok"=localStorage 持久化成功；"idb"=localStorage 失败但 IndexedD */
  function lsSet(key, val) {
    if (window.XJ_STORE && typeof window.XJ_STORE.set === "function") {
      return window.XJ_STORE.set(key, val);
    }
    var memOk = false;
    if (_memOnly) { _memStore[key] = val; return "mem"; }
    try { if (window.localStorage) { window.localStorage.setItem(key, val); return "ok"; } } catch (e) { /* 超配额 / 禁用 */ }
    try { if (!_lsProbe()) { _memOnly = true; } } catch (e) { _memOnly = true; }
    try { _memStore[key] = val; memOk = true; } catch (e) { memOk = false; }
    return memOk ? "mem" : "fail";
  }
  function lsRemove(key) {
    if (window.XJ_STORE && typeof window.XJ_STORE.remove === "function") {
      return window.XJ_STORE.remove(key);
    }
    try { if (!_memOnly && window.localStorage) { window.localStorage.removeItem(key); } } catch (e) { /* 忽略 */ }
    if (_memStore.hasOwnProperty(key)) { delete _memStore[key]; }
  }

  /* [V29] 首次水合是否仍在进行中：此期间「读不到」不等于「没有数据」，
     所有基于空读的自动建档 / 迁移 / 回写都必须跳过，否则会把真实角色与
     头像覆盖成新的空记录（刷新后头像错图、需重进才恢复的根因之一）。 */
  function storeHydrating() {
    try { return window.__xjStorageState === "pending"; } catch (e) { return false; }
  }

  /* 默认人形占位图标（与首页 user-avatar 默认一致） */
  function avatarPlaceholderHtml() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="8.3" r="3.5"/><path d="M4.9 20.1c1.6-3.5 4.3-5.3 7.1-5.3s5.5 1.8 7.1 5.3"/></svg>';
  }

  /* 数据读写（含首页头像昵称迁移） */
  function loadMy() {
    var raw = lsGet(MY_KEY);
    var my = null;
    if (raw) { try { my = JSON.parse(raw); } catch (e) { my = null; } }
    if (!my || typeof my !== "object") {
      /* [V29] 水合中：先返回空档案给首屏用，绝不回写，避免覆盖真实资料 */
      if (storeHydrating()) { return normalizeProfile({}); }
      my = { name: "", avatar: "", shape: "square", online: "", mood: "" };
      /* 首页 avatar-0 已有头像 / 昵称时迁移为默认值 */
      var img = lsGet(HOME_IMG_KEY + "avatar-0");
      var name = lsGet(HOME_NAME_KEY + "avatar-0");
      if (img) { my.avatar = img; }
      if (name) { my.name = name; }
      saveMy(my);
    }
    return normalizeProfile(my);
  }
  /* [V31] 写闸门：水合未完成时「读不到」不等于「没有」，任何整体覆盖式写入都必须
     先挂起、等权威数据回来后合并再落盘。旧逻辑下「新增一个角色」会用空列表 + 新角色
     整体覆盖，历史角色因此全部消失。 */
  var _pendingPartnersSave = null;
  var _pendingMySave = null;
  var _partnerDelIds = {};
  function storageReady() {
    try {
      if (window.__xjStorageReady === true) { return true; }
      return window.__xjStorageState === "ready" || window.__xjStorageState === "failed";
    } catch (e) { return true; }
  }
  function markPartnerDeleted(id) { if (id != null) { _partnerDelIds[String(id)] = 1; } }
  function _authPartnersList() {
    var raw = null, list = [];
    try { raw = lsGet(PARTNERS_KEY); } catch (e) { raw = null; }
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    return Array.isArray(list) ? list : [];
  }
  /* [V33] 本会话是否已经读到过磁盘上的权威角色列表。读到过 = 调用方传进来的就是全量，
     此时绝不能再与磁盘并集，否则「删除角色」永远删不掉（刷新后又被合回来）。 */
  var _partnersLoadedFromDisk = false;
  function _reconcilePartners(list) {
    var auth = _authPartnersList(), i, out = [], byId = {};
    for (i = 0; i < list.length; i++) { byId[list[i].id] = 1; out.push(list[i]); }
    var allowUnion = !_partnersLoadedFromDisk || out.length === 0;
    if (!allowUnion) {
      /* 权威已读全量：仅剔除本次会话标记删除的 id，不做任何并集 */
      return out.filter(function (p) { return p && !_partnerDelIds[String(p.id)]; });
    }
    for (i = 0; i < auth.length; i++) {
      var a = auth[i];
      if (!a || !a.id) { continue; }
      if (byId[a.id] || _partnerDelIds[String(a.id)]) { continue; }
      out.push(normalizeProfile(a));
    }
    return out;
  }
  function _doSavePartners(list) {
    var merged = _reconcilePartners(list);
    /* [V34] 删到 0 个角色必须能删掉；只有存在显式删除标记时才申明，避免启动期误调空列表把角色清空 */
    if (merged.length === 0 && Object.keys(_partnerDelIds).length > 0) {
      try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell(PARTNERS_KEY, 10000); } } catch (eNS) { /* 忽略 */ }
    }
    var st = lsSet(PARTNERS_KEY, JSON.stringify(merged));
    syncHomePartner(merged[0] || null);
    return st;
  }
  function _mergePartnerLists(a, b) {
    var out = [], i, map = {};
    a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : [];
    for (i = 0; i < a.length; i++) { if (a[i] && !map[a[i].id]) { map[a[i].id] = out.length; out.push(a[i]); } }
    for (i = 0; i < b.length; i++) {
      if (!b[i]) { continue; }
      if (map[b[i].id] != null) { out[map[b[i].id]] = b[i]; }
      else { map[b[i].id] = out.length; out.push(b[i]); }
    }
    return out;
  }
  function savePartners(list) {
    if (!Array.isArray(list)) { list = []; }
    list = list.map(normalizeProfile);
    if (!storageReady()) {
      /* 多次挂起要累加，不能后一次直接覆盖前一次（连续添加两个角色会丢一个） */
      _pendingPartnersSave = _mergePartnerLists(_pendingPartnersSave, list);
      return "pending";
    }
    if (_pendingPartnersSave) { list = _mergePartnerLists(_pendingPartnersSave, list); _pendingPartnersSave = null; }
    return _doSavePartners(list);
  }
  function _flushPendingPartners() {
    if (!_pendingPartnersSave) { return; }
    var list = _pendingPartnersSave;
    _pendingPartnersSave = null;
    try {
      /* 水合期挂起的写入天然是「增量」：落盘前先与磁盘上的权威列表并集，
         否则「卸载前兜底落盘」会把原有角色整批覆盖掉 */
      var auth = _authPartnersList();
      if (auth.length) { list = _mergePartnerLists(auth, list); }
      _doSavePartners(list);
    } catch (e) { /* 忽略 */ }
    try { renderAccountSettings(); } catch (e2) { /* 页面可能未挂载 */ }
    try { if (typeof notifyAccountUpdated === "function") { notifyAccountUpdated(); } } catch (e3) { /* 忽略 */ }
  }
  function saveMy(my) {
    if (!my || typeof my !== "object") { return "fail"; }
    if (!storageReady()) { _pendingMySave = normalizeProfile(my); return "pending"; }
    var st = lsSet(MY_KEY, JSON.stringify(normalizeProfile(my)));
    syncHomeMy(my);
    return st;
  }
  function _flushPendingMy() {
    if (!_pendingMySave) { return; }
    var my = _pendingMySave;
    _pendingMySave = null;
    var auth = null;
    try { var raw = lsGet(MY_KEY); if (raw) { auth = JSON.parse(raw); } } catch (e) { auth = null; }
    /* 就绪前读到的可能是空壳：磁盘上已有真实资料时，绝不用空壳覆盖 */
    if (auth && auth.name && !my.name) { return; }
    try {
      lsSet(MY_KEY, JSON.stringify(normalizeProfile(my)));
      syncHomeMy(my);
    } catch (e2) { /* 忽略 */ }
  }
  function _bindFlushOnReady() {
    var run = function () {
      try { _flushPendingPartners(); } catch (e) { /* 忽略 */ }
      try { _flushPendingMy(); } catch (e2) { /* 忽略 */ }
    };
    try {
      if (window.XJ_STORE && typeof window.XJ_STORE.onReady === "function") {
        /* onReady 在已就绪时会立即执行，避免「事件已发过、监听注册晚」导致挂起写入永久丢失 */
        window.XJ_STORE.onReady(run);
        return;
      }
    } catch (e) { /* 忽略 */ }
    try {
      document.addEventListener("snowcrystal:storage-ready", run);
      window.addEventListener("snowcrystal:storage-ready", run);
    } catch (e2) { /* 忽略 */ }
  }
  _bindFlushOnReady();
  /* [V32] 卸载/切后台时把挂起的角色与我方资料推入存储层，配合存储层的微任务兜底落盘，
     避免「水合没完成就关页面」导致本次新建的角色丢失 */
  (function bindAccountFlushOnHide() {
    if (typeof window === "undefined" || window.__xjAcctFlushBound) { return; }
    window.__xjAcctFlushBound = true;
    var run = function () {
      try { _flushPendingPartners(); } catch (e) { /* 忽略 */ }
      try { _flushPendingMy(); } catch (e2) { /* 忽略 */ }
    };
    try {
      window.addEventListener("pagehide", run);
      window.addEventListener("beforeunload", run);
      document.addEventListener("visibilitychange", function () { if (document.hidden) { run(); } });
    } catch (e3) { /* 忽略 */ }
  })();
  /* [V32] 存储彻底不可用时明确告知，避免用户以为「保存成功」而刷新后全空 */
  (function bindStorageDegradedTip() {
    var tip = function () {
      try { if (window.__xjStorageDegradedTipShown) { return; } window.__xjStorageDegradedTipShown = true; } catch (e) { /* 忽略 */ }
      try { if (typeof toastSmart === "function") { toastSmart("浏览器不允许保存本地数据，刷新后角色和聊天会丢失，建议改用 Chrome 打开本文件"); } } catch (e2) { /* 忽略 */ }
    };
    try {
      document.addEventListener("snowcrystal:storage-degraded", tip);
      window.addEventListener("snowcrystal:storage-degraded", tip);
      if (window.__xjStorageDegraded) { setTimeout(tip, 900); }
    } catch (e3) { /* 忽略 */ }
  })();
  function loadPartners() {
    var raw = lsGet(PARTNERS_KEY);
    var list = [];
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    if (!Array.isArray(list)) { list = []; }
    if (raw) { _partnersLoadedFromDisk = true; }
    if (!list.length) {
      /* [V29] 水合中：真实角色可能还在 IDB 里，不能新建记录覆盖 */
      if (storeHydrating()) { return []; }
      /* 首页 avatar-1 已有头像 / 昵称时迁移为首个角色 */
      var img = lsGet(HOME_IMG_KEY + "avatar-1");
      var name = lsGet(HOME_NAME_KEY + "avatar-1");
      if (img || name) {
        list.push({ id: "partner_" + Date.now(), name: name || "", avatar: img || "", shape: "square", online: "", mood: "" });
        savePartners(list);
      }
    }
    return list.map(normalizeProfile);
  }
  function normalizeProfile(p) {
    if (!p || typeof p !== "object") { p = {}; }
    return {
      id: String(p.id || ("partner_" + Date.now() + "_" + Math.floor(Math.random() * 1e6))),
      name: String(p.name == null ? "" : p.name).replace(/^\s+|\s+$/g, ""),
      avatar: String(p.avatar || ""),
      shape: p.shape === "circle" ? "circle" : "square",
      online: String(p.online || ""),
      mood: String(p.mood || "")
    };
  }

  /* 与首页联动：我方 ↔ avatar-0，对方首位 ↔ avatar-1 */
  function syncHomeMy(my) {
    if (!my) { return; }
    if (my.name) { lsSet(HOME_NAME_KEY + "avatar-0", my.name); }
    else { lsRemove(HOME_NAME_KEY + "avatar-0"); }
    if (my.avatar) { lsSet(HOME_IMG_KEY + "avatar-0", my.avatar); }
    else { lsRemove(HOME_IMG_KEY + "avatar-0"); }
    refreshHomeNames();
    refreshHomeImages();
  }
  function syncHomePartner(partner) {
    if (partner && partner.name) { lsSet(HOME_NAME_KEY + "avatar-1", partner.name); }
    else { lsRemove(HOME_NAME_KEY + "avatar-1"); }
    if (partner && partner.avatar) { lsSet(HOME_IMG_KEY + "avatar-1", partner.avatar); }
    else { lsRemove(HOME_IMG_KEY + "avatar-1"); }
    refreshHomeNames();
    refreshHomeImages();
  }
  function refreshHomeNames() {
    var els = document.querySelectorAll("[data-name-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-name-slot");
      var v = lsGet(HOME_NAME_KEY + slot) || "";
      var txt = String(v).replace(/^\s+|\s+$/g, "");
      els[i].textContent = txt || "点击命名";
      if (txt) { els[i].classList.remove("is-empty"); }
      else { els[i].classList.add("is-empty"); }
    }
  }
  function refreshHomeImages() {
    var els = document.querySelectorAll("[data-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-slot");
      var url = lsGet(HOME_IMG_KEY + slot);
      if (url) {
        els[i].style.backgroundImage = "url(" + url + ")";
        els[i].classList.add("has-photo");
      } else {
        els[i].style.backgroundImage = "";
        els[i].classList.remove("has-photo");
      }
    }
  }

  /* ---------- 页面渲染 ---------- */
  function openAccountSettings() {
    if (typeof SnowCrystal !== "undefined" && SnowCrystal.switchPage) {
      SnowCrystal.switchPage("account-settings");
    }
    renderAccountSettings();
  }
  function renderAccountSettings() {
    renderMyCard();
    renderPartnerList();
  }
  function renderMyCard() {
    var my = loadMy();
    var card = document.getElementById("accMyCard");
    if (!card) { return; }
    var avatarHtml = my.avatar
      ? '<span class="acc-avatar-thumb" style="background-image:url(' + esc(my.avatar) + ')" data-shape="' + my.shape + '"></span>'
      : '<span class="acc-avatar-thumb is-empty" data-shape="' + my.shape + '">' + avatarPlaceholderHtml() + "</span>";
    card.innerHTML = avatarHtml
      + '<div class="row-main">'
      + '<span class="row-title">' + esc(my.name || "我") + "</span>"
      + '<span class="row-desc">点击编辑资料</span>'
      + "</div>"
      + '<div class="acc-partner-actions">'
      + '<button type="button" class="acc-act-btn" title="编辑" onclick="SnowCrystal.editMyAccount()">✎</button>'
      + "</div>";
  }
  function renderPartnerList() {
    var list = document.getElementById("accPartnerList");
    if (!list) { return; }
    var partners = loadPartners();
    if (!partners.length) {
      list.innerHTML = '<div class="acc-empty">暂无角色，点击下方按钮添加</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < partners.length; i++) {
      var p = partners[i];
      var avatarHtml = p.avatar
        ? '<span class="acc-avatar-thumb" style="background-image:url(' + esc(p.avatar) + ')" data-shape="' + p.shape + '"></span>'
        : '<span class="acc-avatar-thumb is-empty" data-shape="' + p.shape + '">' + avatarPlaceholderHtml() + "</span>";
      html += '<div class="acc-partner-row">'
        + avatarHtml
        + '<div class="row-main">'
        + '<span class="row-title">' + esc(p.name || "未命名角色") + "</span>"
        + '<span class="row-desc">点击编辑角色</span>'
        + "</div>"
        + '<div class="acc-partner-actions">'
        + '<button type="button" class="acc-act-btn" title="上移" onclick="SnowCrystal.movePartnerAccount(' + i + ',-1)">↑</button>'
        + '<button type="button" class="acc-act-btn" title="下移" onclick="SnowCrystal.movePartnerAccount(' + i + ',1)">↓</button>'
        + '<button type="button" class="acc-act-btn" title="编辑" onclick="SnowCrystal.editPartnerAccount(\'' + esc(p.id) + '\')">✎</button>'
        + '<button type="button" class="acc-act-btn acc-act-danger" title="删除" onclick="SnowCrystal.deletePartnerAccount(\'' + esc(p.id) + '\')">×</button>'
        + "</div></div>";
    }
    list.innerHTML = html;
  }

  /* ---------- 角色增删改排序 ---------- */
  function editMyAccount() {
    editing = { type: "my", id: null };
    var my = loadMy();
    openAccountModal("编辑我的信息", my);
  }
  function editPartnerAccount(id) {
    var partners = loadPartners();
    var p = null;
    for (var i = 0; i < partners.length; i++) { if (partners[i].id === id) { p = partners[i]; break; } }
    if (!p) { return; }
    editing = { type: "partner", id: id };
    openAccountModal("编辑角色信息", p);
  }
  function addPartnerAccount() {
    editing = { type: "partner", id: "partner_" + Date.now() };
    openAccountModal("添加角色", { id: editing.id, name: "", avatar: "", shape: "square", online: "", mood: "" });
  }
  function deletePartnerAccount(id) {
    /* [V31] 显式删除要留痕：写入时据此把该角色从权威数据里剔除（否则删除会被「补回」） */
    markPartnerDeleted(id);
    function purgeRelated() {
      try {
        if (window.SnowCrystal && SnowCrystal.Chat && typeof SnowCrystal.Chat.purgePartnerChat === "function") {
          SnowCrystal.Chat.purgePartnerChat(id);
        }
      } catch (e) { /* 忽略 */ }
    }
    if (typeof wcConfirm === "function") {
      wcConfirm("删除角色", "确定删除这个角色吗？", function () {
        var partners = loadPartners();
        savePartners(partners.filter(function (p) { return p.id !== id; }));
        purgeRelated();
        renderAccountSettings();
        toastSmart("角色已删除");
      });
    } else {
      var partners = loadPartners();
      savePartners(partners.filter(function (p) { return p.id !== id; }));
      purgeRelated();
      renderAccountSettings();
      toastSmart("角色已删除");
    }
  }
  function movePartnerAccount(index, dir) {
    var partners = loadPartners();
    var target = index + dir;
    if (target < 0 || target >= partners.length) { return; }
    var tmp = partners[index];
    partners[index] = partners[target];
    partners[target] = tmp;
    savePartners(partners);
    renderAccountSettings();
  }

  /* ---------- 编辑模态框 ---------- */
  function openAccountModal(title, profile) {
    var overlay = document.getElementById("accModalOverlay");
    var titleEl = document.getElementById("accModalTitle");
    var nameInput = document.getElementById("accNameInput");
    var onlineTextEl = document.getElementById("accOnlineText");
    var moodTextEl = document.getElementById("accMoodText");
    var picker = document.getElementById("accAvatarPicker");
    if (!overlay || !titleEl || !nameInput) { return; }

    titleEl.textContent = title || "编辑";
    nameInput.value = profile.name || "";
    editing._image = profile.avatar || "";
    editing._shape = profile.shape || "square";
    editing._online = profile.online || "";
    editing._mood = profile.mood || "";

    if (onlineTextEl) { onlineTextEl.textContent = editing._online || "随机"; }
    if (moodTextEl) { moodTextEl.textContent = editing._mood || "随机"; }
    updateAvatarPreview();
    updateStatusDots();
    syncShapeButtons();
    if (picker) { picker.value = ""; }
    overlay.classList.add("is-open");
    /* [FIX-RAINSEE] 弹窗打开不自动调起输入法 */
  }
  function closeAccountModal() {
    var overlay = document.getElementById("accModalOverlay");
    if (overlay) { overlay.classList.remove("is-open"); }
    editing = null;
    releaseSoftKeyboard();
  }
  /* 移动端输入法防护：.acc-overlay 关闭态为 visibility:hidden（非 display:none） */
  function releaseSoftKeyboard() {
    try {
      var ae = document.activeElement;
      if (ae && ae !== document.body && typeof ae.blur === "function") { ae.blur(); }
    } catch (e) { /* 忽略 */ }
    try { if (window.scrollTo) { window.scrollTo(0, 0); } } catch (e) { /* 忽略 */ }
  }
  /* 账号数据变更通知：聊天侧监听后实时刷新视频通话头像（缩略气泡 / 通话面板）， */
  function notifyAccountUpdated() {
    try { document.dispatchEvent(new CustomEvent("snowcrystal:account-updated", { detail: { source: "account-settings" } })); } catch (e) { /* 忽略 */ }
  }
  function updateAvatarPreview() {
    var preview = document.getElementById("accAvatarPreview");
    if (!preview || !editing) { return; }
    preview.setAttribute("data-shape", editing._shape);
    if (editing._image) {
      preview.style.backgroundImage = "url(" + editing._image + ")";
      preview.classList.add("has-photo");
      preview.innerHTML = "";
    } else {
      preview.style.backgroundImage = "";
      preview.classList.remove("has-photo");
      preview.innerHTML = avatarPlaceholderHtml();
    }
  }
  function syncShapeButtons() {
    var c = document.getElementById("accShapeCircle");
    var s = document.getElementById("accShapeSquare");
    if (!editing) { return; }
    if (c) { c.classList.toggle("is-on", editing._shape === "circle"); }
    if (s) { s.classList.toggle("is-on", editing._shape === "square"); }
  }
  function updateStatusDots() {
    var onlineDot = document.getElementById("accOnlineDot");
    if (onlineDot) {
      var dot = "";
      for (var i = 0; i < ONLINE_STATUSES.length; i++) {
        if (ONLINE_STATUSES[i].text === (editing ? editing._online : "")) { dot = ONLINE_STATUSES[i].dot; break; }
      }
      if (dot) { onlineDot.style.background = dot; onlineDot.classList.remove("is-empty"); }
      else { onlineDot.style.background = ""; onlineDot.classList.add("is-empty"); }
    }
    var moodDot = document.getElementById("accMoodDot");
    if (moodDot) {
      if (editing && editing._mood) { moodDot.style.background = "var(--accent-deep)"; moodDot.classList.remove("is-empty"); }
      else { moodDot.style.background = ""; moodDot.classList.add("is-empty"); }
    }
  }
  function toggleAvatarShape(shape) {
    if (!editing) { return; }
    editing._shape = shape === "square" ? "square" : "circle";
    updateAvatarPreview();
    syncShapeButtons();
  }
  function pickAccountAvatar() {
    var picker = document.getElementById("accAvatarPicker");
    if (picker) { picker.value = ""; picker.click(); }
  }
  function removeAccountAvatar() {
    if (!editing) { return; }
    editing._image = "";
    updateAvatarPreview();
    toastSmart("已移除头像，保存后生效");
  }
  function bindAvatarPicker() {
    var picker = document.getElementById("accAvatarPicker");
    if (!picker || picker.getAttribute("data-bound") === "1") { return; }
    picker.setAttribute("data-bound", "1");
    picker.addEventListener("change", function () {
      var f = picker.files && picker.files[0];
      if (!f || !editing) { return; }
      var reader = new FileReader();
      reader.onload = function () {
        var raw = reader.result;
        compressAvatar(raw, AVATAR_MAX, AVATAR_Q, function (out) {
          if (!editing) { return; }
          if (out) { editing._image = out; updateAvatarPreview(); return; }
          if (raw.length <= ACC_AVATAR_HARD_LIMIT) { editing._image = raw; updateAvatarPreview(); return; }
          /* 原图过大且首次压缩失败（移动端内存紧张时 canvas 可能失败）：换更小尺寸再试一次 */
          compressAvatar(raw, 128, 0.7, function (out2) {
            if (!editing) { return; }
            editing._image = out2 || raw;
            updateAvatarPreview();
            if (!out2) { toastSmart("图片较大且压缩失败，保存时可能受限"); }
          });
        });
      };
      reader.readAsDataURL(f);
    });
  }
  function compressAvatar(dataUrl, maxSide, q, done) {
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

  /* ---------- 保存 ---------- */
  function saveAccount() {
    if (!editing) { return; }
    var nameInput = document.getElementById("accNameInput");
    var name = nameInput ? String(nameInput.value || "").replace(/^\s+|\s+$/g, "").slice(0, 12) : "";
    if (!name) { toastSmart("昵称不能为空"); return; }

    var profile = {
      name: name,
      avatar: editing._image || "",
      shape: editing._shape || "square",
      online: editing._online || "",
      mood: editing._mood || ""
    };

    /* 头像超限保护：大 base64 会撑爆 localStorage 导致整条保存失败，宁可明确拒绝也不假成功 */
    if (profile.avatar.length > ACC_AVATAR_HARD_LIMIT) {
      toastSmart("头像文件过大无法保存，请重新上传");
      return;
    }

    var st = "";
    if (editing.type === "my") {
      st = saveMy(profile);
    } else if (editing.type === "partner") {
      var partners = loadPartners();
      var found = false;
      for (var i = 0; i < partners.length; i++) {
        if (partners[i].id === editing.id) {
          profile.id = editing.id;
          partners[i] = normalizeProfile(profile);
          found = true;
          break;
        }
      }
      if (!found) {
        profile.id = editing.id;
        partners.push(profile);
      }
      st = savePartners(partners);
    }

    if (st === "ok" || st === "idb") {
      closeAccountModal();
      renderAccountSettings();
      toastSmart(st === "idb" ? "已保存（浏览器存储受限，已用备用存储保存，刷新后仍可保留）" : "已保存");
      notifyAccountUpdated();
    } else if (st === "mem" || st === "pending") {
      closeAccountModal();
      renderAccountSettings();
      toastSmart("已保存（当前浏览器存储受限，刷新后可能丢失）");
      notifyAccountUpdated();
    } else {
      toastSmart("保存失败：浏览器存储不可用，请重试");
    }
  }

  /* ---------- 状态选择弹窗 ---------- */
  function openStatusPicker(kind) {
    var overlay = document.getElementById("accStatusOverlay");
    var listEl = document.getElementById("accStatusList");
    var titleEl = document.getElementById("accStatusTitle");
    if (!overlay || !listEl || !titleEl) { return; }
    statusPickerKind = kind === "online" ? "online" : "mood";
    var isOnline = statusPickerKind === "online";
    titleEl.textContent = isOnline ? "选择在线状态" : "选择情绪状态";

    var preset = isOnline
      ? ONLINE_STATUSES.map(function (s) { return { text: s.text, dot: s.dot }; })
      : MOOD_STATUSES.map(function (m) { return { text: m }; });
    var presetTexts = preset.map(function (p) { return p.text; });
    var currentVal = editing ? (isOnline ? editing._online : editing._mood) : "";

    var html = '<div class="acc-status-sec-title">预设</div>'
      + '<div class="acc-status-list">'
      + '<div class="acc-status-option' + (currentVal === "" ? " is-on" : "") + '" data-value="" onclick="SnowCrystal.selectStatusOption(this)">'
      + '<span class="acc-status-dot" style="background:transparent;border:1px dashed var(--text-4)"></span>'
      + "<span>随机</span></div>";
    preset.forEach(function (item) {
      html += '<div class="acc-status-option' + (item.text === currentVal ? " is-on" : "") + '" data-value="' + esc(item.text) + '" onclick="SnowCrystal.selectStatusOption(this)">'
        + '<span class="acc-status-dot" style="background:' + (item.dot || "var(--accent-deep)") + '"></span>'
        + "<span>" + esc(item.text) + "</span></div>";
    });
    html += "</div>";

    var customValue = (currentVal && presetTexts.indexOf(currentVal) === -1) ? currentVal : "";
    html += '<div class="acc-status-sec-title is-custom">自定义</div>'
      + '<div class="acc-status-custom">'
      + '<input type="text" id="accStatusCustomInput" class="acc-status-input" placeholder="自定义状态…" maxlength="12" value="' + esc(customValue) + '">'
      + '<button type="button" class="ghost-btn acc-status-apply" onclick="SnowCrystal.applyCustomStatus()">应用</button>'
      + "</div>"
      + '<div class="acc-status-hint">选择「随机」则每次随机展示，也可以输入自定义内容</div>';

    listEl.innerHTML = html;
    overlay.classList.add("is-open");

    var customInput = document.getElementById("accStatusCustomInput");
    if (customInput && customValue) {
      customInput.focus();
      try { customInput.setSelectionRange(customInput.value.length, customInput.value.length); } catch (e) { /* 忽略 */ }
    }
  }
  function selectStatusOption(el) {
    if (!el) { return; }
    applyStatusValue(el.getAttribute("data-value") || "");
  }
  function applyCustomStatus() {
    var input = document.getElementById("accStatusCustomInput");
    var value = input ? String(input.value || "").replace(/^\s+|\s+$/g, "") : "";
    applyStatusValue(value ? value.slice(0, 12) : "");
  }
  function applyStatusValue(value) {
    if (!editing) { return; }
    if (statusPickerKind === "online") {
      editing._online = value;
      var ot = document.getElementById("accOnlineText");
      if (ot) { ot.textContent = value || "随机"; }
    } else {
      editing._mood = value;
      var mt = document.getElementById("accMoodText");
      if (mt) { mt.textContent = value || "随机"; }
    }
    updateStatusDots();
    closeStatusPicker();
  }
  function closeStatusPicker() {
    var overlay = document.getElementById("accStatusOverlay");
    if (overlay) { overlay.classList.remove("is-open"); }
    releaseSoftKeyboard();
  }

  /* 弹窗通用事件（遮罩点击关闭 / Esc） */
  function bindOverlays() {
    var modal = document.getElementById("accModalOverlay");
    if (modal && modal.getAttribute("data-bound") !== "1") {
      modal.setAttribute("data-bound", "1");
      modal.addEventListener("click", function (e) {
        if (e.target === modal) { closeAccountModal(); }
      });
    }
    var status = document.getElementById("accStatusOverlay");
    if (status && status.getAttribute("data-bound") !== "1") {
      status.setAttribute("data-bound", "1");
      status.addEventListener("click", function (e) {
        if (e.target === status) { closeStatusPicker(); }
      });
    }
    if (document.documentElement.getAttribute("data-acc-esc") !== "1") {
      document.documentElement.setAttribute("data-acc-esc", "1");
      document.addEventListener("keydown", function (e) {
        if ((e.key || "") !== "Escape") { return; }
        var st = document.getElementById("accStatusOverlay");
        if (st && st.classList.contains("is-open")) { closeStatusPicker(); return; }
        var md = document.getElementById("accModalOverlay");
        if (md && md.classList.contains("is-open")) { closeAccountModal(); }
      });
    }
    bindAvatarPicker();
  }

  /* 暴露到 SnowCrystal */
  var S = window.SnowCrystal = window.SnowCrystal || {};
  S.openAccountSettings = openAccountSettings;
  S.editMyAccount = editMyAccount;
  S.editPartnerAccount = editPartnerAccount;
  S.addPartnerAccount = addPartnerAccount;
  S.deletePartnerAccount = deletePartnerAccount;
  S.movePartnerAccount = movePartnerAccount;
  S.closeAccountModal = closeAccountModal;
  S.saveAccount = saveAccount;
  S.pickAccountAvatar = pickAccountAvatar;
  S.removeAccountAvatar = removeAccountAvatar;
  S.toggleAvatarShape = toggleAvatarShape;
  S.openStatusPicker = openStatusPicker;
  S.closeStatusPicker = closeStatusPicker;
  S.selectStatusOption = selectStatusOption;
  S.applyCustomStatus = applyCustomStatus;
  /* 统一账号数据接口：12-chat.js（聊天列表 / 视频通话头像）读取账号时优先走此接口， */
  S.AccountData = {
    loadMy: loadMy,
    loadPartners: loadPartners,
    saveMy: saveMy,
    savePartners: savePartners,
    lsGet: lsGet,
    lsSet: lsSet
  };

  /* 初始化：绑定事件（DOMContentLoaded 后） */
  function init() {
    bindOverlays();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
