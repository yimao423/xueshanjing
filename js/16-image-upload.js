/* 雪山晶 · 16-image-upload ｜ 源：雪山晶.html L9416-L9512 ｜ JS 模块 */
/* 图片上传：首页头像 / 三格相框共用（data-slot 标记，本机记忆） */
  var IMG_STORE = "snowcrystal.image.v1.";
  var pendingEl = null;
  var pendingSlot = null;

  function applyImage(el, url) {
    if (!el) { return; }
    el.style.backgroundImage = "url(" + url + ")";
    el.classList.add("has-photo");
  }
  var IMG_MAX = (window.XJ_CAP ? XJ_CAP.imgMax() : 1280), IMG_Q = 0.8;
  function imgCompress(dataUrl, maxSide, q, done) {
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

  function restoreImages() {
    var els = document.querySelectorAll("[data-slot]");
    for (var i = 0; i < els.length; i++) {
      var slot = els[i].getAttribute("data-slot");
      var url = null;
      try { url = window.localStorage.getItem(IMG_STORE + slot); } catch (e) { url = null; }
      if (url) { applyImage(els[i], url); }
    }
  }

  function pickImage(el) {
    var input = document.getElementById("imgPicker");
    if (!input || !el) { return; }
    pendingEl = el;
    pendingSlot = el.getAttribute("data-slot");
    input.value = "";
    input.click();
  }

  function bindImagePicker() {
    var input = document.getElementById("imgPicker");
    var els = document.querySelectorAll("[data-slot]");
    var i;
    function bind(node) {
      node.addEventListener("click", function () {
        pickImage(node); /* 手势同步栈内直接弹选择器，Safari 也可靠 */
      });
      node.addEventListener("dblclick", function (e) {
        e.preventDefault();
        pendingEl = null;
        pendingSlot = null;
        clearImage(node);
        if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
      });
      node.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.keyCode === 13 || e.keyCode === 32) {
          e.preventDefault();
          pickImage(node);
        }
      });
    }
    for (i = 0; i < els.length; i++) { bind(els[i]); }
    if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
    if (!input) { return; }
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (!f || !pendingEl) { return; }
      var node = pendingEl, slot = pendingSlot;
      var reader = new FileReader();
      reader.onload = function () {
        imgCompress(reader.result, IMG_MAX, IMG_Q, function (out) {
          var url = out || reader.result;
          applyImage(node, url);
          try { window.localStorage.setItem(IMG_STORE + slot, url); } catch (e) { /* 忽略 */ }
          if (window.__syncFrameClones) { window.__syncFrameClones(); }
        });
        if (window.__syncFrameClones) { window.__syncFrameClones(); }
        pendingEl = null;
        pendingSlot = null;
      };
      reader.readAsDataURL(f);
    });
  }

  
