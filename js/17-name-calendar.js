/* 雪山晶 · 17-name-calendar ｜ 源：雪山晶.html L9512-L9840 ｜ JS 模块 */
/* 迭代 v14 新增：昵称 / 双击删除上传图 / 完整月历浮层 / 功能长条滚轮 */

  /* 昵称：点击可自定义修改 · 本机永久保存 */
  var NAME_STORE = "snowcrystal.name.v1.";
  var NAME_TIP = "点击命名";

  function applyName(el, name) {
    var text = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    el.textContent = text || NAME_TIP;
    if (text) { el.classList.remove("is-empty"); }
    else { el.classList.add("is-empty"); }
  }

  function restoreNames() {
    var els = document.querySelectorAll("[data-name-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-name-slot");
      var name = null;
      try { name = window.localStorage.getItem(NAME_STORE + slot); } catch (e) { name = null; }
      applyName(els[i], name);
    }
  }

  function bindNames() {
    var els = document.querySelectorAll("[data-name-slot]");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        function startEdit() {
          if (el.getAttribute("data-editing") === "1") { return; }
          el.setAttribute("data-editing", "1");
          var slot = el.getAttribute("data-name-slot");
          var saved = "";
          try { saved = window.localStorage.getItem(NAME_STORE + slot) || ""; } catch (e) { saved = ""; }
          var input = document.createElement("input");
          input.className = "avatar-name-input";
          input.type = "text";
          input.maxLength = 12;
          input.value = saved;
          input.placeholder = "输入昵称";
          el.style.display = "none";
          el.parentNode.insertBefore(input, el.nextSibling);
          try { input.focus(); input.select(); } catch (e) { /* 忽略 */ }

          var done = false;
          function finish(commit) {
            if (done) { return; }
            done = true;
            var val = saved;
            if (commit) {
              val = String(input.value || "").replace(/^\s+|\s+$/g, "").slice(0, 12);
              try {
                if (val) { window.localStorage.setItem(NAME_STORE + slot, val); }
                else { window.localStorage.removeItem(NAME_STORE + slot); }
              } catch (e) { /* 忽略 */ }
            }
            if (input.parentNode) { input.parentNode.removeChild(input); }
            el.style.display = "";
            el.removeAttribute("data-editing");
            applyName(el, val);
          }
          input.addEventListener("blur", function () { finish(true); });
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); finish(true); }
            else if (e.key === "Escape" || e.keyCode === 27) { e.preventDefault(); finish(false); }
          });
        }
        el.addEventListener("click", startEdit);
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
            e.preventDefault();
            startEdit();
          }
        });
      })(els[i]);
    }
  }

  /* 双击删除已上传图片（清除本机记忆，恢复默认样式） */
  function clearImage(el) {
    var slot = el && el.getAttribute("data-slot");
    if (!slot) { return; }
    try { window.localStorage.removeItem(IMG_STORE + slot); } catch (e) { /* 忽略 */ }
    el.style.backgroundImage = "";
    el.classList.remove("has-photo");
    if (window.__syncFrameClones) { window.__syncFrameClones(); }
  }

  /* ---------- 完整月历浮层 ---------- */
  var calView = null;

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function renderCalSheet() {
    if (!calView) { return; }
    var grid = document.getElementById("calGrid");
    var title = document.getElementById("calSheetTitle");
    if (!grid) { return; }
    var y = calView.y, m = calView.m;
    if (title) { title.textContent = y + "年" + (m + 1) + "月"; }
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));   /* 回退到该周周一 */
    var now = new Date();
    var html = "";
    for (var i = 0; i < 42; i++) {                                 /* 固定 6 行 × 7 天，避免高度抖动 */
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var cls = "cal-cell";
      if (d.getMonth() !== m) { cls += " is-out"; }
      if (sameDay(d, now)) { cls += " is-today"; }
      html += '<span class="' + cls + '" data-lunar="' + lunarText(d) + '">' + d.getDate() + "</span>";
    }
    grid.innerHTML = html;
  }

  function openCalendar() {
    var now = new Date();
    calView = { y: now.getFullYear(), m: now.getMonth() };
    renderCalSheet();
    var modal = document.getElementById("calModal");
    if (!modal) { return; }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeCalendar() {
    var modal = document.getElementById("calModal");
    if (!modal) { return; }
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function shiftMonth(step) {
    if (!calView) { return; }
    var d = new Date(calView.y, calView.m + step, 1);
    calView = { y: d.getFullYear(), m: d.getMonth() };
    renderCalSheet();
  }

  function bindCalendar() {
    var card = document.getElementById("calCard");
    var modal = document.getElementById("calModal");
    if (card) {
      card.addEventListener("click", openCalendar);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          openCalendar();
        }
      });
    }
    if (!modal) { return; }
    var closeBtn = document.getElementById("calClose");
    var prev = document.getElementById("calPrev");
    var next = document.getElementById("calNext");
    if (closeBtn) { closeBtn.addEventListener("click", closeCalendar); }
    if (prev) { prev.addEventListener("click", function () { shiftMonth(-1); }); }
    if (next) { next.addEventListener("click", function () { shiftMonth(1); }); }
    modal.addEventListener("click", function (e) { if (e.target === modal) { closeCalendar(); } });
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.keyCode === 27) && modal.classList.contains("is-open")) {
        closeCalendar();
      }
    });
  }

  function initFrameFlow() {
    var wrap = document.getElementById("frameFlow");
    if (!wrap) { return; }
    var originals = [].slice.call(wrap.querySelectorAll(".tri-card"));
    if (!originals.length) { return; }
    var N = originals.length;
    var ticking = false;
    var period = 0;          /* 一个循环周期的滚动距离 = 原始 N 张的整体宽度 */
    var snapTimer = null;

    function centerOf(el) {
      var r = el.getBoundingClientRect();
      return r.left + r.width / 2;      /* transform-origin:center，缩放不改变中心 */
    }
    function gapPx() { return parseFloat(getComputedStyle(wrap).columnGap) || 0; }
    function measure() {
      /* offsetWidth 不受 transform 缩放影响，用它量周期才稳定 */
      period = N * (originals[0].offsetWidth + gapPx());
    }

    function syncCloneImages() {
      var list = [].slice.call(wrap.querySelectorAll(".tri-card"));
      for (var i = 0; i < list.length; i++) {
        var sCover = originals[i % N].querySelector(".tri-cover");
        var dCover = list[i].querySelector(".tri-cover");
        if (!sCover || !dCover) { continue; }
        dCover.style.backgroundImage = sCover.style.backgroundImage;
        if (sCover.classList.contains("has-photo")) { dCover.classList.add("has-photo"); }
        else { dCover.classList.remove("has-photo"); }
      }
    }
    window.__syncFrameClones = syncCloneImages;

    var FRAME_COPIES = 2;
    var frag = document.createDocumentFragment();
    for (var rep = 0; rep < FRAME_COPIES; rep++) {
      for (var ci = 0; ci < N; ci++) {
        var clone = originals[ci].cloneNode(true);
        var slotNode = clone.querySelector("[data-slot]");
        if (slotNode) {
          slotNode.removeAttribute("data-slot");
          slotNode.removeAttribute("tabindex");
          slotNode.removeAttribute("role");
        }
        frag.appendChild(clone);
      }
    }
    wrap.appendChild(frag);
    syncCloneImages();
    measure();

    var all = [].slice.call(wrap.querySelectorAll(".tri-card"));

    /* 发热优化 P1-3：几何缓存 —— 卡片整行等距平移，一次性记录每张卡相对 */
    var cardOffsets = [];
    var baseCenter = centerOf(all[0]);
    for (var ci = 0; ci < all.length; ci++) { cardOffsets.push(centerOf(all[ci]) - baseCenter); }

    /* 克隆卡点击 → 转发给对应源卡的封面（上传 / 删除共用同一份本机记忆） */
    for (var ck = N; ck < all.length; ck++) {
      (function (cloneEl, srcEl) {
        var srcCover = srcEl.querySelector(".tri-cover");
        var dstCover = cloneEl.querySelector(".tri-cover");
        if (!srcCover || !dstCover) { return; }
        dstCover.style.cursor = "pointer";
        dstCover.addEventListener("click", function (e) {
          e.preventDefault();
          pickImage(srcCover); /* 手势同步栈内直接弹选择器，Safari 也可靠 */
        });
        dstCover.addEventListener("dblclick", function (e) {
          e.preventDefault();
          pendingEl = null;
          pendingSlot = null;
          clearImage(srcCover);
        });
      })(all[ck], originals[ck % N]);
    }

    function render() {
      ticking = false;
      var wr = wrap.getBoundingClientRect();
      var mid = wr.left + wr.width / 2;
      var span = period * 0.42 || (wr.width * 0.62 || 1);
      var c0 = centerOf(all[0]);
      for (var i = 0; i < all.length; i++) {
        var c = all[i];
        var center = c0 + cardOffsets[i];
        var d = Math.min(Math.abs(center - mid) / span, 1);
        c.style.transform = "scale(" + (1 - d * 0.34).toFixed(3) + ")";
        c.style.opacity = (1 - d * 0.55).toFixed(3);
        c.style.zIndex = String(20 - Math.round(d * 16));
        if (d < 0.03) { c.classList.add("is-center"); } else { c.classList.remove("is-center"); }
      }
    }
    function recenter(instant) {
      var wr = wrap.getBoundingClientRect();
      var mid = wr.left + wr.width / 2;
      var best = null, bestD = Infinity, i, d;
      /* 发热优化 P1-3：几何缓存推算卡片中心，替代逐卡 getBoundingClientRect */
      var c0 = centerOf(all[0]);
      for (i = 0; i < all.length; i++) {
        d = Math.abs(c0 + cardOffsets[i] - mid);
        if (d < bestD) { bestD = d; best = all[i]; }
      }
      if (!best) { return; }
      var delta = (c0 + cardOffsets[all.indexOf(best)]) - mid;
      if (Math.abs(delta) > 0.6) {
        if (!instant && wrap.scrollBy) { wrap.scrollBy({ left: delta, behavior: "smooth" }); }
        else { wrap.scrollLeft += delta; }
      }
    }
    function snap() {
      snapTimer = null;
      recenter(false);
    }
    function onScroll() {
      if (period > 0) {
        if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
        else if (wrap.scrollLeft < period * 0.5) { wrap.scrollLeft += period; }
      }
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(render);
      }
      if (snapTimer) { window.clearTimeout(snapTimer); }
      snapTimer = window.setTimeout(snap, 140);
    }
    wrap.addEventListener("scroll", onScroll, { passive: true });
    window.__frameRefresh = function () {
      measure();
      if (period > 0) {
        var guard = 0;
        while (guard++ < 4) {
          if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
          else if (wrap.scrollLeft < period * 0.5 &&
                   wrap.scrollLeft + period <= (wrap.scrollWidth - wrap.clientWidth)) { wrap.scrollLeft += period; }
          else { break; }
        }
      }
      render();
      recenter(true);
      render();
    };
    /* 首帧：把「视觉上的正中那张」滚到屏幕正中；再把位置归一化进 [0.5, 1.5] 周期窗口， */
    window.requestAnimationFrame(function () {
      var midIndex = Math.floor(N / 2);
      var target = all[N + midIndex] || all[midIndex] || originals[0];
      wrap.scrollLeft += centerOf(target) - (wrap.getBoundingClientRect().left + wrap.clientWidth / 2);
      if (period > 0) {
        if (wrap.scrollLeft > period * 1.5) { wrap.scrollLeft -= period; }
        else if (wrap.scrollLeft < period * 0.5 && wrap.scrollLeft + period <= (wrap.scrollWidth - wrap.clientWidth)) {
          wrap.scrollLeft += period;
        }
      }
      window.requestAnimationFrame(render);
    });
  }
