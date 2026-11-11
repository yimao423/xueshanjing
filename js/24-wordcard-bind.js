/* 雪山晶 · 24-wordcard-bind ｜ 源：雪山晶.html L12597-L12862 ｜ JS 模块 */
/* ---------- 绑定 ---------- */
  function bindWordcard() {
    loadWcl();
    renderWclEntry();

    /* 通用输入弹窗 */
    var mask = document.getElementById("wcPromptMask");
    if (mask && mask.getAttribute("data-bound") !== "1") { mask.setAttribute("data-bound", "1"); mask.addEventListener("click", closeWcPrompt); }
    var cancel = document.getElementById("wcPromptCancel");
    if (cancel && cancel.getAttribute("data-bound") !== "1") { cancel.setAttribute("data-bound", "1"); cancel.addEventListener("click", closeWcPrompt); }
    var ok = document.getElementById("wcPromptOk");
    if (ok && ok.getAttribute("data-bound") !== "1") {
      ok.setAttribute("data-bound", "1");
      ok.addEventListener("click", function () {
        var input = document.getElementById("wcPromptInput");
        var area = document.getElementById("wcPromptArea");
        var gInput = document.getElementById("wcPromptGroupInput");
        var useGroup = gInput && !gInput.hidden;
        var useArea = area && !area.hidden;
        var v = useArea ? String(area.value) : String(input ? input.value : "");
        v = v.replace(/^\s+|\s+$/g, "");
        if (useGroup) {
          var gname = String(gInput.value).replace(/^\s+|\s+$/g, "");
          if (!gname) { wcToast("还没填分组名"); return; }
          var cb = wcPromptCb;
          closeWcPrompt();
          if (cb) { cb({ name: gname, content: v }); }
          return;
        }
        if (!v) { wcToast("还没填内容"); return; }
        var cb = wcPromptCb;
        closeWcPrompt();
        if (cb) { cb(v); }
      });
    }
    var input = document.getElementById("wcPromptInput");
    if (input && input.getAttribute("data-bound") !== "1") {
      input.setAttribute("data-bound", "1");
      input.addEventListener("keydown", function (e) {
        if ((e.key || "") === "Enter") { e.preventDefault(); if (ok) { ok.click(); } }
      });
    }
    var area = document.getElementById("wcPromptArea");
    if (area && area.getAttribute("data-bound") !== "1") {
      area.setAttribute("data-bound", "1");
      area.addEventListener("keydown", function (e) {
        if ((e.key || "") === "Enter") {
          if (wcPromptNoEnter) { return; } 
          var wrap = document.getElementById("wcLineToggleWrap");
          var tg = document.getElementById("wcLineToggle");
          if (wrap && !wrap.hidden && tg && tg.checked) { return; } /* 仅当分行开关可见且开启时才允许换行（contentLabel 模式下 wrap 隐藏，回车始终提交单条） */
          e.preventDefault(); if (ok) { ok.click(); } /* 关闭/不可见：回车提交一条，不换行 */
        }
      });
    }
    var wtoggle = document.getElementById("wcLineToggle");
    if (wtoggle && wtoggle.getAttribute("data-bound") !== "1") {
      wtoggle.setAttribute("data-bound", "1");
      wtoggle.addEventListener("change", function () {
        try {
          window.localStorage.setItem("snowcrystal.wcLine." + wcPromptLineKey, wtoggle.checked ? "1" : "0");
        } catch (e) { /* 本机写满时静默 */ }
      });
    }

    /* 确认弹窗 */
    var cmask = document.getElementById("wcConfirmMask");
    if (cmask && cmask.getAttribute("data-bound") !== "1") { cmask.setAttribute("data-bound", "1"); cmask.addEventListener("click", closeWcConfirm); }
    var ccancel = document.getElementById("wcConfirmCancel");
    if (ccancel && ccancel.getAttribute("data-bound") !== "1") { ccancel.setAttribute("data-bound", "1"); ccancel.addEventListener("click", closeWcConfirm); }
    var cok = document.getElementById("wcConfirmOk");
    if (cok && cok.getAttribute("data-bound") !== "1") {
      cok.setAttribute("data-bound", "1");
      cok.addEventListener("click", function () {
        var cb = wcConfirmCb;
        closeWcConfirm();
        if (cb) { cb(); }
      });
    }

    var gmask = document.getElementById("wcGroupPickMask");
    if (gmask && gmask.getAttribute("data-bound") !== "1") { gmask.setAttribute("data-bound", "1"); gmask.addEventListener("click", closeWcGroupPick); }
    var gcancel = document.getElementById("wcGroupPickCancel");
    if (gcancel && gcancel.getAttribute("data-bound") !== "1") { gcancel.setAttribute("data-bound", "1"); gcancel.addEventListener("click", closeWcGroupPick); }
    var glist = document.getElementById("wcGroupPickList");
    if (glist && glist.getAttribute("data-bound") !== "1") {
      glist.setAttribute("data-bound", "1");
      glist.addEventListener("click", function (e) {
        var t = e.target || e.srcElement;
        var item = closestData(t, "data-lib", glist) || closestData(t, "data-gi", glist);
        if (!item) { return; }
        var cb = wcGroupPickCb;
        closeWcGroupPick();
        if (cb) {
          cb({ lib: item.getAttribute("data-lib"), gi: parseInt(item.getAttribute("data-gi"), 10) || 0 });
        }
      });
    }

    /* 分组内容：点复制 / 点 × 删除 */
    var body = document.getElementById("grpBody");
    if (body && body.getAttribute("data-bound") !== "1") { body.setAttribute("data-bound", "1"); body.addEventListener("click", onGroupBodyClick); }

    /* 表情包上传：本地读成 dataURL，落到当前打开的 sticker 分组（v70 起支持分组管理） */
    var picker = document.getElementById("wcStickerPicker");
    if (picker && picker.getAttribute("data-bound") !== "1") {
      picker.setAttribute("data-bound", "1");
      picker.addEventListener("change", function () {
        var f = picker.files && picker.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          if (typeof reader.result === "string") {
            var groups = wcl.sticker || (wcl.sticker = []);
            var gi = wclNav.lib === "sticker" ? wclNav.group : -1;
            var g = (gi >= 0 && groups[gi]) ? groups[gi] : null;
            if (!g) { /* 未在分组内容页（如从列表页直接上传）时落入「我的上传」，无分组则自动新建 */
              for (var i = 0; i < groups.length; i++) { if (groups[i].name === "我的上传") { g = groups[i]; } }
              if (!g) { g = { name: "我的上传", items: [] }; groups.push(g); }
            }
            mediaSaveNew(reader.result).then(function (mk) {
              g.items.push({ k: "🖼", t: f.name || "上传表情包", img: mk || reader.result });
              saveWcl();
              renderGroup();
              renderWclEntry();
              wcToast("已上传到「" + g.name + "」");
            });
          }
          picker.value = "";
        };
        reader.readAsDataURL(f);
      });
    }

    var vpick = document.getElementById("voiceFilePicker");
    if (vpick && vpick.getAttribute("data-bound") !== "1") {
      vpick.setAttribute("data-bound", "1");
      vpick.addEventListener("change", function () {
        SnowCrystal.voiceHandleFiles(vpick.files);
        vpick.value = "";
      });
    }
    var vbody = document.getElementById("voiceGrpBody");
    if (vbody && vbody.getAttribute("data-bound") !== "1") {
      vbody.setAttribute("data-bound", "1");
      vbody.addEventListener("click", function (e) {
        var t = e.target || e.srcElement;
        var row = closestData(t, "data-vidx", vbody);
        if (!row) { return; }
        var idx = parseInt(row.getAttribute("data-vidx"), 10) || 0;
        var g = SnowCrystal.voiceGroups()[SnowCrystal.voiceNav.group];
        if (!g || !g.items[idx]) { return; }
        if (SnowCrystal.voiceNav.sel) {
          var picks = SnowCrystal.voiceNav.selPicks;
          var at = picks.indexOf(idx);
          if (at >= 0) { picks.splice(at, 1); } else { picks.push(idx); }
          SnowCrystal.renderVoiceGroup();
          return;
        }
        if (t.closest && t.closest("[data-vedit]")) { SnowCrystal.voiceEditName(idx); return; }
        if (t.closest && t.closest("[data-vdel]")) { SnowCrystal.voiceDeleteItem(idx); return; }
        var btn = t.closest && t.closest(".voice-play-btn");
        SnowCrystal.voicePlayItem(idx, btn || row);
      });
    }

    /* 导入：合并分组（同名并入） */
    var imp = document.getElementById("wcLibImport");
    if (imp && imp.getAttribute("data-bound") !== "1") {
      imp.setAttribute("data-bound", "1");
      imp.addEventListener("change", function () {
        var f = imp.files && imp.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          var raw = String(reader.result || "").replace(/^\uFEFF/, "");
          var k = wclNav.lib || "quote";
          var parsed = wcParseImport(raw, k);
          var byLib = parsed.byLib || {}, added = 0, libs = 0, lk = "", i = 0, j = 0, g = null, list = null, libNames = [];
          for (lk in byLib) {
            if (!Object.prototype.hasOwnProperty.call(byLib, lk)) { continue; }
            list = byLib[lk] || [];
            if (!list.length) { continue; }
            if (!wcl[lk]) { wcl[lk] = []; }
            libs++;
            libNames.push((LIB_META[lk] && LIB_META[lk].title) || lk);
            for (i = 0; i < list.length; i++) {
              g = null;
              for (j = 0; j < wcl[lk].length; j++) { if (wcl[lk][j].name === list[i].name) { g = wcl[lk][j]; } }
              if (!g) { g = { name: String(list[i].name || "导入分组"), items: [] }; wcl[lk].push(g); }
              g.items = g.items.concat(list[i].items || []);
              added += (list[i].items || []).length;
            }
          }
          mediaMigrateAll().then(function () {
            var _saved = saveWcl();
            var _wcAct = document.querySelector(".page.is-active");
            var _wcPg = _wcAct ? _wcAct.getAttribute("data-page") : "";
            if (_wcPg === "wc-lib-group") { renderGroup(); } else { renderLib(); }
            renderWclEntry();
            if (_saved) { syncChatStickerPanel(); } /* 聊天室表情包面板同步新导入 */
            if (added) {
              wcToast("已导入 " + added + " 条 → " + (libNames.length > 2 ? (libNames[0] + " 等 " + libs + " 个库") : libNames.join(" / ")));
            } else {
              wcToast("文件里没有可导入的内容");
            }
            imp.value = "";
          });
          imp.value = "";
        };
        reader.readAsText(f);
      });
    }

    var sj = document.getElementById("wcStickerJsonInput");
    if (sj && sj.getAttribute("data-bound") !== "1") {
      sj.setAttribute("data-bound", "1");
      sj.addEventListener("change", function () {
        var f = sj.files && sj.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          var list = parseStickerJson(String(reader.result || ""));
          if (!list.length) { wcToast("文件里没有可导入的表情包"); sj.value = ""; return; }
          var miss = 0, li2, gi2, it2;
          for (li2 = 0; li2 < list.length; li2++) {
            var _g2 = list[li2] || {};
            for (gi2 = 0; gi2 < (_g2.items || []).length; gi2++) {
              it2 = _g2.items[gi2];
              if (it2 && it2.__missing) { miss++; }
            }
          }
          var r = mergeStickerGroups(list);
          mediaMigrateAll().then(function () {
            var _saved = saveWcl();
            renderGroup();
            renderWclEntry();
            if (_saved) { syncChatStickerPanel(); } /* 聊天室表情包面板同步新导入 */
            if (r.added) {
              wcToast("已导入 " + r.added + " 条表情包" + (r.created ? "，新建分组 " + r.created + " 个" : "") + (miss ? "，其中 " + miss + " 条缺图片数据" : ""));
            } else {
              wcToast("文件里没有可导入的表情包");
            }
          });
          sj.value = "";
        };
        reader.readAsText(f);
      });
    }

    /* Esc 关闭弹窗 */
    if (document.documentElement.getAttribute("data-wc-esc") !== "1") {
      document.documentElement.setAttribute("data-wc-esc", "1");
      document.addEventListener("keydown", function (e) {
        if ((e.key || "") !== "Escape") { return; }
        var s1 = document.getElementById("wcPromptSheet");
        var s2 = document.getElementById("wcConfirmSheet");
        var s3 = document.getElementById("wcGroupPickSheet");
        if (s1 && !s1.hidden) { closeWcPrompt(); }
        else if (s2 && !s2.hidden) { closeWcConfirm(); }
        else if (s3 && !s3.hidden) { closeWcGroupPick(); }
      });
    }
  }
