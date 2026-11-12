/* 雪山晶 · 36-home-extras ｜ 源：雪山晶.html L23789-L23959 ｜ JS 模块 */
(function(){
  "use strict";
  var KEY = "scAlbumV1";
  var stack = document.getElementById("albumStack");
  if(!stack){ return; }
  var cards = [].slice.call(stack.querySelectorAll(".album-card"));
  var dots  = document.getElementById("albumDots");
  var input = document.getElementById("albumInput");
  var photos = [], front = 0;
  try{ photos = JSON.parse(localStorage.getItem(KEY) || "[]") || []; }catch(e){ photos = []; }
  if(!Array.isArray(photos)){ photos = []; }

  var EMPTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="3" y="4.5" width="18" height="15" rx="3"/>'
    + '<circle cx="9" cy="10" r="1.8"/>'
    + '<path d="M3.5 17.5 9 12.6l3.4 3 3.2-2.9 4.9 4.4"/></svg>';
  var EMPTY_FRONT = '<div class="album-inner album-inner-empty">' + EMPTY_ICON
    + '<span class="ae-t">相册</span><span class="ae-s">轻触添加照片</span></div>';

  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(photos)); }catch(e){} }

  function render(){
    var n = photos.length;
    /* 卡片顺序（DOM）：背 ac-b / 中 ac-m / 前 ac-f —— 前张显示 front，后两张顺延 */
    var idx = n ? [ (front+2)%n, (front+1)%n, front ] : [-1,-1,-1];
    for(var k=0;k<cards.length;k++){
      var inner = cards[k].querySelector(".album-inner");
      if(!inner){ continue; }
      var i = idx[k];
      if(i >= 0 && photos[i]){
        inner.className = "album-inner";
        inner.style.backgroundImage = 'url("' + photos[i] + '")';
        inner.innerHTML = "";
      }else{
        inner.className = "album-inner album-inner-empty";
        inner.style.backgroundImage = "";
        inner.innerHTML = (k === 2) ? EMPTY_ICON + '<span class="ae-t">相册</span><span class="ae-s">轻触添加照片</span>' : "";
      }
    }
    /* 指示点 */
    dots.innerHTML = "";
    if(n > 1){
      for(var d=0; d<n; d++){
        var s = document.createElement("span");
        s.className = "album-dot" + (d === front ? " on" : "");
        dots.appendChild(s);
      }
    }
  }

  /* 上传（点击相册）：多选，压缩后本机永久保存 */
  function compress(src, cb){
    var img = new Image();
    img.onload = function(){
      try{
        var max = 900, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", .82));
      }catch(e){ cb(src); }
    };
    img.onerror = function(){ cb(src); };
    img.src = src;
  }
  input.addEventListener("change", function(){
    var fs = [].slice.call(input.files || []);
    input.value = "";
    if(!fs.length){ return; }
    var pending = fs.length;
    fs.forEach(function(f){
      var r = new FileReader();
      r.onload = function(){
        compress(r.result, function(d){
          photos.push(d);
          if(--pending === 0){ front = photos.length - 1; save(); render(); }
        });
      };
      r.readAsDataURL(f);
    });
  });

  /* 原地滑动切换：左右滑动更换最前一张，样式不变 */
  var sx = 0, dx = 0, dragging = false;
  stack.addEventListener("pointerdown", function(e){ sx = e.clientX; dx = 0; dragging = true; });
  window.addEventListener("pointermove", function(e){ if(dragging){ dx = e.clientX - sx; } });
  window.addEventListener("pointerup", function(){
    if(!dragging){ return; }
    dragging = false;
    if(photos.length > 1 && Math.abs(dx) > 30){
      front = (front + (dx < 0 ? 1 : -1) + photos.length) % photos.length;
      render();
    }else if(Math.abs(dx) <= 8){
      input.click(); /* 轻触 = 添加照片 */
    }
  });

  render();
})();

(function(){
  "use strict";
  var AN_KEY = (window.AN_KEY || "snowcrystal.anniv.v1.") + "";
  function anGet(k, d){ try{ var v = window.localStorage ? window.localStorage.getItem(AN_KEY + k) : null; return (v === null || v === "") ? d : v; }catch(e){ return d; } }
  function anSet(k, v){ try{ if(window.localStorage){ window.localStorage.setItem(AN_KEY + k, String(v)); } }catch(e){} }
  function anParse(s){ var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(s || "")); if(!m){ return null; } var y=+m[1], mo=+m[2], d=+m[3]; if(mo<1||mo>12||d<1||d>31){ return null; } var dt=new Date(y, mo-1, d); if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d){ return null; } return dt; }
  function anToday(){ var d=new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var days = document.getElementById("homeDays");
  if(!days){ return; }
  days.style.cursor = "pointer";

  /* 把数字部分包成可点击样式（anPaint 会重写文本，用观察器保持） */
  function wrapNum(){
    if(days.querySelector(".days-num")){ return; }
    var t = days.textContent, m = t.match(/\d+/);
    if(m){ days.innerHTML = t.replace(m[0], '<span class="days-num">' + m[0] + "</span>"); }
  }
  wrapNum();
  new MutationObserver(wrapNum).observe(days, { childList: true, subtree: true, characterData: true });

  var host = document.querySelector(".phone") || document.body;
  var mv = document.createElement("div");
  mv.className = "days-modal-veil";
  mv.innerHTML =
    '<div class="days-modal">' +
    '<div class="days-modal-title">在一起的日子</div>' +
    '<div class="days-modal-sub">选择这一天，自动计算已相伴多久</div>' +
    '<input type="date" class="days-modal-input" max="' + anToday().toISOString().slice(0,10) + '">' +
    '<div class="days-modal-actions">' +
    '<button type="button" class="days-cancel">取消</button>' +
    '<button type="button" class="days-save">保存</button>' +
    '</div></div>';
  host.appendChild(mv);
  var input = mv.querySelector(".days-modal-input");

  function openModal(){
    var cur = anGet("together", "");
    input.value = anParse(cur) ? cur : "";
    input.classList.remove("err");
    mv.classList.add("on");
  }
  function closeModal(){ mv.classList.remove("on"); }

  days.addEventListener("click", openModal);
  mv.addEventListener("click", function(e){ if(e.target === mv){ closeModal(); } });
  mv.querySelector(".days-cancel").addEventListener("click", closeModal);
  mv.querySelector(".days-save").addEventListener("click", function(){
    var v = input.value;
    if(!v){ return; }
    if(!anParse(v)){ input.classList.add("err"); return; }
    anSet("together", v);
    if(window.anPaint){ window.anPaint(); }
    closeModal();
  });
})();

(function(){
  "use strict";
  var phone = document.querySelector(".phone");
  if(!phone){ return; }
  var pages = [];
  for(var i=0;i<document.body.children.length;i++){
    var el = document.body.children[i];
    if(el.tagName === "SECTION" && el.classList.contains("page")){ pages.push(el); }
  }
  for(var j=0;j<pages.length;j++){ phone.appendChild(pages[j]); }
})();
