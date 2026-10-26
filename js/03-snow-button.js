/* 底栏雪花按键 */
"use strict";
  /* =========================================================
     v22：底栏整体汇总为一个右侧雪花按键
     —— 默认只有雪花按键；点击雪花 → 四个按键自下上滑展开；
        点击按键切页（switchPage 内自动收起）；点击遮罩 / 再点雪花 → 收起。
     ========================================================= */
  function navEls() {
    return {
      nav: document.getElementById("bottomNav"),
      fab: document.getElementById("snowFab"),
      mask: document.getElementById("navMask")
    };
  }

  function setNavOpen(open) {
    var els = navEls();
    if (els.nav) {
      if (open) { els.nav.classList.add("is-open"); } else { els.nav.classList.remove("is-open"); }
    }
    if (els.mask) {
      if (open) { els.mask.classList.add("is-open"); } else { els.mask.classList.remove("is-open"); }
    }
    if (els.fab) {
      els.fab.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { els.fab.classList.add("is-open"); } else { els.fab.classList.remove("is-open"); }
    }
    /* 展开时给手机壳补足底部占位（防内容被悬浮导航遮挡），收起时收回 */
    var phone = document.querySelector(".phone");
    if (phone) {
      if (open) { phone.classList.add("nav-open-pad"); } else { phone.classList.remove("nav-open-pad"); }
    }
  }

  function toggleNav() {
    var els = navEls();
    var open = !(els.nav && els.nav.classList.contains("is-open"));
    setNavOpen(open);
  }

  function closeNav() { setNavOpen(false); }



