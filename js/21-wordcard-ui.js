/* 雪山晶 · 21-wordcard-ui ｜ 源：雪山晶.html L10522-L10734 ｜ JS 模块 */
/* 小工具：转义 / 提示 / 复制（本模块内自持） */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var wcToastTimer = null;
  function wcToast(text) {
    var el = document.getElementById("wcToast");
    if (!el) { return; }
    el.textContent = text;
    el.classList.add("is-on");
    if (wcToastTimer) { window.clearTimeout(wcToastTimer); }
    wcToastTimer = window.setTimeout(function () { el.classList.remove("is-on"); }, 1500);
  }
  function wcCopy(text) {
    var s = String(text == null ? "" : text);
    if (!s) { return; }
    var tip = "已复制：" + (s.length > 12 ? s.slice(0, 12) + "…" : s);
    var done = function () { wcToast(tip); };
    try {
      if (window.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(done, function () { wcCopyFallback(s); done(); });
        return;
      }
    } catch (e) { /* 降级 */ }
    wcCopyFallback(s);
    done();
  }
  function wcCopyFallback(text) {
    var ta = document.createElement("textarea");
    ta.value = String(text);
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }
  function closestData(el, attr, root) {
    while (el && el !== root) {
      if (el.getAttribute && el.getAttribute(attr) !== null) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  /* ---------- 通用输入弹窗 ---------- */
  var wcPromptCb = null;
  var wcPromptLineKey = "main";
  var wcPromptNoEnter = false; 
  function wcLineOn(k) {
    try { return window.localStorage.getItem("snowcrystal.wcLine." + k) === "1"; } catch (e) { return false; }
  }
  function wcPrompt(title, value, tip, cb, opts) {
    var mask = document.getElementById("wcPromptMask");
    var sheet = document.getElementById("wcPromptSheet");
    var tEl = document.getElementById("wcPromptTitle");
    var tipEl = document.getElementById("wcPromptTip");
    var input = document.getElementById("wcPromptInput");
    var area = document.getElementById("wcPromptArea");
    var wrap = document.getElementById("wcLineToggleWrap");
    var toggle = document.getElementById("wcLineToggle");
    var gInput = document.getElementById("wcPromptGroupInput");
    var gLabel = document.getElementById("wcPromptGroupLabel");
    var cLabel = document.getElementById("wcPromptContentLabel");
    if (!sheet) { return; }
    wcPromptCb = cb || null;
    opts = opts || {};
    wcPromptLineKey = opts.lineKey || "main";
    wcPromptNoEnter = !!opts.noEnterSubmit;
    if (area) { area.classList.toggle("is-url-batch", !!opts.noEnterSubmit); }
    if (area) { area.maxLength = opts.noEnterSubmit ? 100000000 : 400; }
    if (tEl) { tEl.textContent = title || "添加"; }
    if (tipEl) { tipEl.textContent = tip || ""; }
    if (input) { input.value = value || ""; }
    if (area) { area.value = value || ""; }
    var groupMode = !!opts.groupMode;
    var multi = groupMode || !!opts.multiline;
    var noContent = !!opts.noContent;
    var useWide = (groupMode || !!opts.multiline || !!opts.contentLabel) && !noContent;
    /* 分组名输入框：仅 groupMode（新建分组）显示，置于内容输入框上方 */
    if (gLabel) { gLabel.hidden = !groupMode; }
    if (gInput) { gInput.hidden = !groupMode; gInput.value = ""; }
    /* 内容标注：groupMode 或显式 contentLabel 时显示 */
    if (cLabel) { cLabel.hidden = noContent || !(groupMode || !!opts.contentLabel); }
    if (input) { input.hidden = noContent || useWide; }
    if (area) { area.hidden = noContent || !useWide; }
    if (wrap) { wrap.hidden = noContent || !multi || !!opts.hideLine; }
    if (toggle) { toggle.checked = wcLineOn(wcPromptLineKey); }
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
    window.setTimeout(function () {
      if (gInput && !gInput.hidden) { gInput.focus(); return; }
      if (useWide && area) { area.focus(); }
      else if (input && !input.hidden) { input.focus(); }
    }, 60);
  }
  function closeWcPrompt() {
    var mask = document.getElementById("wcPromptMask");
    var sheet = document.getElementById("wcPromptSheet");
    var input = document.getElementById("wcPromptInput");
    var area = document.getElementById("wcPromptArea");
    var wrap = document.getElementById("wcLineToggleWrap");
    var gInput = document.getElementById("wcPromptGroupInput");
    var gLabel = document.getElementById("wcPromptGroupLabel");
    var cLabel = document.getElementById("wcPromptContentLabel");
    if (sheet) { sheet.hidden = true; }
    if (mask) { mask.hidden = true; }
    if (input) { input.hidden = false; }
    if (area) { area.hidden = true; }
    if (wrap) { wrap.hidden = true; }
    if (gInput) { gInput.hidden = true; }
    if (gLabel) { gLabel.hidden = true; }
    if (cLabel) { cLabel.hidden = true; }
    wcPromptCb = null;
    wcPromptNoEnter = false;
    if (area) { area.classList.remove("is-url-batch"); area.maxLength = 400; } 
  }

  /* 确认弹窗（删除分组 / 清空上传） */
  var wcConfirmCb = null;
  function wcConfirm(title, tip, cb) {
    var mask = document.getElementById("wcConfirmMask");
    var sheet = document.getElementById("wcConfirmSheet");
    var tEl = document.getElementById("wcConfirmTitle");
    var tipEl = document.getElementById("wcConfirmTip");
    if (!sheet) { return; }
    wcConfirmCb = cb || null;
    if (tEl) { tEl.textContent = title || "确认"; }
    if (tipEl) { tipEl.textContent = tip || ""; }
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
  }
  function closeWcConfirm() {
    var mask = document.getElementById("wcConfirmMask");
    var sheet = document.getElementById("wcConfirmSheet");
    if (sheet) { sheet.hidden = true; }
    if (mask) { mask.hidden = true; }
    wcConfirmCb = null;
  }

  /* 转组弹窗（选中模式勾选内容后，选择目标分组：跨库或同库其他分组） */
  var wcGroupPickCb = null;
  function wcGroupPick(title, tip, items, cb) {
    var mask = document.getElementById("wcGroupPickMask");
    var sheet = document.getElementById("wcGroupPickSheet");
    var tEl = document.getElementById("wcGroupPickTitle");
    var tipEl = document.getElementById("wcGroupPickTip");
    var list = document.getElementById("wcGroupPickList");
    if (!sheet) { return; }
    wcGroupPickCb = cb || null;
    if (tEl) { tEl.textContent = title || "转移到…"; }
    if (tipEl) { tipEl.textContent = tip || ""; }
    if (list) {
      var html = "", i, it;
      for (i = 0; i < items.length; i++) {
        it = items[i];
        html += '<div class="wc-group-pick-item" role="button" tabindex="0" data-lib="' + esc(it.lib) + '" data-gi="' + (it.gi || 0) + '">' +
                  '<span class="wc-group-pick-ico">' + libIconSvg(it.lib) + "</span>" +
                  '<span class="wc-group-pick-main">' +
                    '<span class="wc-group-pick-name">' + esc(it.label) + "</span>" +
                    '<span class="wc-group-pick-desc">' + (it.n || 0) + " 条 · 点击转移" + "</span>" +
                  "</span>" +
                "</div>";
      }
      list.innerHTML = html;
    }
    if (mask) { mask.hidden = false; }
    sheet.hidden = false;
  }
  function closeWcGroupPick() {
    var mask = document.getElementById("wcGroupPickMask");
    var sheet = document.getElementById("wcGroupPickSheet");
    if (sheet) { sheet.hidden = true; }
    if (mask) { mask.hidden = true; }
    wcGroupPickCb = null;
  }

  /* 入口页：每项右侧显示分组 / 条数 */
  function renderWclEntry() {
    renderVoiceEntry();
    loadWcl();
    var nodes = document.querySelectorAll("[data-wmeta]");
    for (var i = 0; i < nodes.length; i++) {
      var raw = nodes[i].getAttribute("data-wmeta");
      if (!raw) { continue; }
      /* 聚合入口支持 "quote+msg" 这类多库合计 */
      var keys = raw.split("+"), groups = 0, n = 0, x, j, kk;
      for (x = 0; x < keys.length; x++) {
        /* v-FIX：字卡库真实构成 = 通用字卡(main) + 专属字卡(sub) + 语音字卡(voice)，
           入口统计改为聚合口径；此前只统计 main，而 main 内置为空 → 恒显示 0 组 · 0 条 */
        if (keys[x] === "sub" || keys[x] === "voice") {
          var ext = wcExtCount(keys[x]);
          groups += ext.groups; n += ext.items;
          continue;
        }
        kk = wcl[keys[x]] || [];
        groups += kk.length;
        for (j = 0; j < kk.length; j++) { n += (kk[j].items || []).length; }
      }
      nodes[i].textContent = groups + " 组 · " + n + " 条";
    }
    /* 专属字卡入口（id=subMeta）不在 data-wmeta 体系内，顺带同步，避免空白 */
    var subNode = document.getElementById("subMeta");
    if (subNode) {
      var sc = wcExtCount("sub");
      subNode.textContent = sc.items ? (sc.items + " 条") : "";
    }
  }

  
