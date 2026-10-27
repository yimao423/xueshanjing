/* =========================================================
   账号设置（对标拾心界账号设置，适配雪晶纯前端 SPA）
   · 我方资料 + 对方角色列表（添加 / 编辑 / 排序 / 删除）
   · 编辑模态框：头像上传压缩 / 圆方形状 / 昵称
   · 状态弹窗：随机 + 预设 + 自定义（空值 = 随机展示）
   · 数据存 localStorage（snowcrystal.account.*），并联动首页双头像昵称
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 状态常量（对齐拾心界 CHAT_ONLINE_STATUSES / CHAT_MOOD_STATUSES） ---------- */
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

  /* ---------- 存储键（雪晶前缀，纳入数据管理备份） ---------- */
  var MY_KEY = "snowcrystal.account.my.v1";
  var PARTNERS_KEY = "snowcrystal.account.partners.v1";
  /* 首页头像 / 昵称键（与 calendar.js 共用同一套本机存储） */
  var HOME_IMG_KEY = "snowcrystal.image.v1.";
  var HOME_NAME_KEY = "snowcrystal.name.v1.";

  /* 头像压缩参数（对齐雪晶全站 IMG_MAX / IMG_Q 习惯） */
  /* 头像压缩长边动态跟随设备内存：原写死 200，现按 XJ_CAP.avatarMax() 分档（200/240/280/320） */
  var AVATAR_MAX = (window.XJ_CAP ? XJ_CAP.avatarMax() : 200), AVATAR_Q = 0.8;
  /* 头像 base64 硬上限：正常压缩产物远小于此值；仅当压缩链路彻底失败回退原图时才可能触及。
     超过该值时拒绝保存并明确提示，避免大 base64 撑爆 localStorage 导致整个保存失败被静默吞掉 */
  var ACC_AVATAR_HARD_LIMIT = 400 * 1024;

  /* 编辑暂存 */
  var editing = null; /* { type: "my"|"partner", id, name, avatar, shape, online, mood } */
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
  /* 内存兜底存储：localStorage 不可用（第三方浏览器隐私模式 / 存储被禁用）时保证当前会话内
     账号数据仍可读写渲染，并向调用方返回写入状态，杜绝"提示成功但实际未写入"的假保存 */
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
    var v = null;
    try { if (!_memOnly && window.localStorage) { v = window.localStorage.getItem(key); } } catch (e) { v = null; }
    if (v == null && _memStore.hasOwnProperty(key)) { v = _memStore[key]; }
    return v;
  }
  /* 返回值： "ok"=localStorage 持久化成功；"mem"=localStorage 失败但已降级到内存（刷新后可能丢失）；"fail"=全部失败 */
  function lsSet(key, val) {
    var memOk = false;
    if (_memOnly) { _memStore[key] = val; return "mem"; }
    try { if (window.localStorage) { window.localStorage.setItem(key, val); return "ok"; } } catch (e) { /* 超配额 / 禁用 */ }
    try { if (!_lsProbe()) { _memOnly = true; } } catch (e) { _memOnly = true; }
    try { _memStore[key] = val; memOk = true; } catch (e) { memOk = false; }
    return memOk ? "mem" : "fail";
  }
  function lsRemove(key) {
    try { if (!_memOnly && window.localStorage) { window.localStorage.removeItem(key); } } catch (e) { /* 忽略 */ }
    if (_memStore.hasOwnProperty(key)) { delete _memStore[key]; }
  }

  /* 默认人形占位图标（与首页 user-avatar 默认一致） */
  function avatarPlaceholderHtml() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="8.3" r="3.5"/><path d="M4.9 20.1c1.6-3.5 4.3-5.3 7.1-5.3s5.5 1.8 7.1 5.3"/></svg>';
  }

  /* ---------- 数据读写（含首页头像昵称迁移） ---------- */
  function loadMy() {
    var raw = lsGet(MY_KEY);
    var my = null;
    if (raw) { try { my = JSON.parse(raw); } catch (e) { my = null; } }
    if (!my || typeof my !== "object") {
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
  function saveMy(my) {
    var st = lsSet(MY_KEY, JSON.stringify(normalizeProfile(my)));
    syncHomeMy(my);
    return st;
  }
  function loadPartners() {
    var raw = lsGet(PARTNERS_KEY);
    var list = [];
    if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
    if (!Array.isArray(list)) { list = []; }
    if (!list.length) {
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
  function savePartners(list) {
    if (!Array.isArray(list)) { list = []; }
    var st = lsSet(PARTNERS_KEY, JSON.stringify(list.map(normalizeProfile)));
    syncHomePartner(list[0] || null);
    return st;
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

  /* ---------- 与首页联动：我方 ↔ avatar-0，对方首位 ↔ avatar-1 ---------- */
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
    if (typeof wcConfirm === "function") {
      wcConfirm("删除角色", "确定删除这个角色吗？", function () {
        var partners = loadPartners();
        savePartners(partners.filter(function (p) { return p.id !== id; }));
        renderAccountSettings();
        toastSmart("角色已删除");
      });
    } else {
      var partners = loadPartners();
      savePartners(partners.filter(function (p) { return p.id !== id; }));
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
    window.setTimeout(function () { try { nameInput.focus(); } catch (e) { /* 忽略 */ } }, 60);
  }
  function closeAccountModal() {
    var overlay = document.getElementById("accModalOverlay");
    if (overlay) { overlay.classList.remove("is-open"); }
    editing = null;
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

    if (st === "ok") {
      closeAccountModal();
      renderAccountSettings();
      toastSmart("已保存");
    } else if (st === "mem") {
      closeAccountModal();
      renderAccountSettings();
      toastSmart("已保存（当前浏览器存储受限，刷新后可能丢失）");
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
  }

  /* ---------- 弹窗通用事件（遮罩点击关闭 / Esc） ---------- */
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

  /* ---------- 暴露到 SnowCrystal ---------- */
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


