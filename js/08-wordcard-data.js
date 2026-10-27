/* 字卡库与数据管理 */
"use strict";
  /* =========================================================
       · 入口页 5 项：格言 / 字卡库 / 颜文字表情 / 表情包库 / 拍一拍（「行踪」已删除）
       · 每项两级：分组列表（菜单栏：新建分组 · 导入 · 导出 · 分组去重 · 搜索）+ 分组内容
       · 全部数据写本机 localStorage（v2 键；旧 v1 键自动迁移）
     ========================================================= */
  /* =====================================================================
     · 本机数据全部落在 localStorage 的 snowcrystal.* 键上，本页只读写这些键
     · 导出备份 / 恢复备份（保留本机更新的项）/ 清空字卡 / 清空图片 / 恢复出厂
     · 恢复备份对「字卡分组」按同名分组合并，确保本地数据能继承
     ===================================================================== */
  var DM_PREFIX = "snowcrystal.";
  /* 本机所有属于雪晶的键前缀：含历史命名 snow_crystal_*（背景 / 波浪装饰等外观数据） */
  var DM_PREFIXES = ["snowcrystal.", "snow_crystal_", "snowcrystal_"];
  function dmOwnKey(k) {
    var i;
    if (!k) { return false; }
    for (i = 0; i < DM_PREFIXES.length; i++) { if (k.indexOf(DM_PREFIXES[i]) === 0) { return true; } }
    return false;
  }
  function dmKeys() {
    var out = [], i, k;
    try {
      for (i = 0; i < window.localStorage.length; i++) {
        k = window.localStorage.key(i);
        if (dmOwnKey(k)) { out.push(k); }
      }
    } catch (e) { /* 隐私模式下读不到就按空处理 */ }
    return out;
  }
  function dmFmt(n) {
    n = Number(n) || 0;
    if (n < 1024) { return n + " B"; }
    if (n < 1024 * 1024) { return (n / 1024).toFixed(1) + " KB"; }
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }
  function dmCounts() {
    var ks = dmKeys(), i, k, v = "", bytes = 0, images = 0, settings = 0, groups = 0, items = 0, j, kk;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      v = "";
      try { v = String(window.localStorage.getItem(k) || ""); } catch (e) { v = ""; }
      bytes += (k.length + v.length) * 2;
      if (k.indexOf(IMG_STORE) === 0) { images++; }
      else if (k !== WCL_KEY && k !== WC_OLD_KEY) { settings++; }
    }
    for (kk in wcl) {
      if (!Object.prototype.hasOwnProperty.call(wcl, kk)) { continue; }
      groups += (wcl[kk] || []).length;
      for (j = 0; j < (wcl[kk] || []).length; j++) { items += ((wcl[kk][j].items || []).length); }
    }
    return { keys: ks.length, bytes: bytes, images: images, settings: settings, groups: groups, items: items };
  }
/* v61：数据页—— 三格用量 + 总占用 + 进度条 */
  var DM_ICO = {
    group: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2"/><path d="M7 9.4h10M7 12.8h10M7 16.2h6"/></svg>',
    item: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.6" y="3.8" width="14.8" height="16.4" rx="2.2"/><path d="M8.4 7.8h7.2M8.4 11.4h7.2M8.4 15h4.6"/></svg>',
    img: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2"/><circle cx="8.8" cy="9.6" r="1.6"/><path d="M5.2 16.8l4.4-4.6 2.9 3.1 2.4-2.7 4 4.2"/></svg>'
  };
  function renderDataManage() {
    loadWcl();
    var c = dmCounts();
    var host = document.getElementById("dmStats");
    if (host) {
      var pct = Math.min(100, Math.max(2, Math.round(c.bytes / ((window.XJ_CAP ? XJ_CAP.storeMB() : 5) * 1024 * 1024) * 100)));
      host.innerHTML =
        '<div class="dm-stats-grid">' +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.group + "</span>" +
            '<b class="dm-stat-val">' + c.groups + "</b>" +
            '<span class="dm-stat-key">字卡分组</span>' +
          "</div>" +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.item + "</span>" +
            '<b class="dm-stat-val">' + c.items + "</b>" +
            '<span class="dm-stat-key">字卡条目</span>' +
          "</div>" +
          '<div class="dm-stat-block">' +
            '<span class="dm-stat-ico">' + DM_ICO.img + "</span>" +
            '<b class="dm-stat-val">' + c.images + "</b>" +
            '<span class="dm-stat-key">本地图片</span>' +
          "</div>" +
        "</div>" +
        '<div class="dm-total">本机占用 ' + dmFmt(c.bytes) + " · 存储项 " + c.keys + " 个 · 设置项 " + c.settings + " 个</div>" +
        '<div class="dm-progress"><i style="width:' + pct + '%"></i></div>';
    }
    var foot = document.getElementById("dmFoot");
    if (foot) { foot.textContent = "仅统计本机浏览器内的数据 · 当前占用 " + dmFmt(c.bytes); }
  }
  function openDataManage() {
    switchPage("data-manage");
    renderDataManage();
    bindDataManage();
  }
  /* ---------- 导出：把全部本机数据打包成一个 JSON ---------- */
  function dmExport() {
    var data = { app: "雪晶·字卡", type: "snowcrystal-backup", version: "v60",
                 exportedAt: new Date().toISOString(), keys: {} };
    var ks = dmKeys(), i, k;
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      try { data.keys[k] = window.localStorage.getItem(k); } catch (e) { /* 忽略 */ }
    }
    /* v71：导出前把 IndexedDB 媒体库图片回填进 WCL_KEY 中的 mediaKey，保证备份含完整图片 */
    mediaResolveAll().then(function (map) {
      if (map && Object.keys(map).length && data.keys[WCL_KEY]) {
        try {
          var w = JSON.parse(data.keys[WCL_KEY]);
          if (w && typeof w === "object") { stickerFillBase64(w, map); data.keys[WCL_KEY] = JSON.stringify(w); }
        } catch (e) { /* 保持原样 */ }
      }
      var d = new Date();
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      var name = "雪晶-数据备份-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      tip("已导出本机全部数据 · " + name);
    });
  }
  /* ---------- 字卡数据合并（同名分组并入，其余保持本机不动） ---------- */
  function dmMergeWcl(jsonStr) {
    var inc = null, k, i, j, g, added = 0;
    try { inc = JSON.parse(String(jsonStr)); } catch (e) { inc = null; }
    if (!inc || typeof inc !== "object") { return 0; }
    for (k in inc) {
      if (!Object.prototype.hasOwnProperty.call(inc, k)) { continue; }
      if (!wcl[k]) { wcl[k] = []; }
      for (i = 0; i < (inc[k] || []).length; i++) {
        if (k === "pat") {
          /* v14：拍一拍导入统一归入「对方拍一拍库」 */
          g = null;
          for (j = 0; j < wcl[k].length; j++) { if (wcl[k][j].name === "对方拍一拍库") { g = wcl[k][j]; } }
          if (!g) { g = { name: "对方拍一拍库", items: [] }; wcl[k].push(g); }
          g.items = g.items.concat(inc[k][i].items || []);
          added += (inc[k][i].items || []).length;
          continue;
        }
        g = null;
        for (j = 0; j < wcl[k].length; j++) { if (wcl[k][j].name === inc[k][i].name) { g = wcl[k][j]; } }
        if (!g) { g = { name: String(inc[k][i].name || "导入分组"), items: [] }; wcl[k].push(g); }
        g.items = g.items.concat(inc[k][i].items || []);
        added += (inc[k][i].items || []).length;
      }
    }
    if (added) { saveWcl(); }
    return added;
  }
  function dmApplyBackup(text) {
    var data = null, ks, i, k, cur, next, applied = 0, kept = 0, cardAdded = 0, third = 0;
    try { data = JSON.parse(String(text)); } catch (e) { data = null; }
    if (!data || typeof data !== "object") { wcToast("这个文件读不出备份内容"); return; }

/* 没有 keys 字段 —— 不是雪晶备份，按「字卡 JSON」通用导入处理（ */
    if (!data.keys) {
      var parsed = wcParseImport(String(text), wclNav.lib || "quote");
      var added = 0, kk, gg, i2, j2;
      for (kk in parsed.byLib) {
        if (!Object.prototype.hasOwnProperty.call(parsed.byLib, kk)) { continue; }
        if (!wcl[kk]) { wcl[kk] = []; }
        for (i2 = 0; i2 < parsed.byLib[kk].length; i2++) {
          if (kk === "pat") {
            /* v14：拍一拍导入统一归入「对方拍一拍库」 */
            gg = null;
            for (j2 = 0; j2 < wcl[kk].length; j2++) { if (wcl[kk][j2].name === "对方拍一拍库") { gg = wcl[kk][j2]; } }
            if (!gg) { gg = { name: "对方拍一拍库", items: [] }; wcl[kk].push(gg); }
            gg.items = gg.items.concat(parsed.byLib[kk][i2].items || []);
            added += (parsed.byLib[kk][i2].items || []).length;
            continue;
          }
          gg = null;
          for (j2 = 0; j2 < wcl[kk].length; j2++) { if (wcl[kk][j2].name === parsed.byLib[kk][i2].name) { gg = wcl[kk][j2]; } }
          if (!gg) { gg = { name: String(parsed.byLib[kk][i2].name || "导入分组"), items: [] }; wcl[kk].push(gg); }
          gg.items = gg.items.concat(parsed.byLib[kk][i2].items || []);
          added += (parsed.byLib[kk][i2].items || []).length;
        }
      }
      if (added) { saveWcl(); loadWcl(); renderWclEntry(); }
      /* v71：导入的 base64 图片迁入 IndexedDB 媒体库 */
      mediaMigrateAll().then(function () {
        wcToast(added ? ("已按字卡格式导入 " + added + " 条") : "文件里没有可导入的内容");
      });
      return;
    }

    ks = [];
    for (k in data.keys) { if (Object.prototype.hasOwnProperty.call(data.keys, k)) { ks.push(k); } }
    for (i = 0; i < ks.length; i++) {
      k = ks[i];
      if (!dmOwnKey(k)) { continue; }   /* 只认本应用自己的键，避免污染别处 */
      next = data.keys[k];
      cur = null;
      try { cur = window.localStorage.getItem(k); } catch (e) { cur = null; }
      if (k === WCL_KEY) {
        cardAdded += dmMergeWcl(next);
        applied++;
        continue;
      }
      if (!cur) {
        try { window.localStorage.setItem(k, next); applied++; } catch (e) { /* 忽略 */ }
      } else if (cur === next) {
        kept++;
      } else {
        kept++;   /* 本机已有 —— 保留本机，不覆盖 */
      }
    }
    tip("已恢复 " + applied + " 项 · 保留本机 " + kept + " 项" + (cardAdded ? (" · 字卡新增 " + cardAdded + " 条") : ""));
    /* v71：恢复的备份若含 base64 表情包图片，先迁入 IndexedDB 媒体库再刷新 */
    mediaMigrateAll().then(function () {
      window.setTimeout(function () { try { window.location.reload(); } catch (e) { /* 忽略 */ } }, 600);
    });
  }
  function dmImportFile() {
    var inp = document.getElementById("dmImport");
    if (inp) { inp.click(); }
  }
  function bindDataManage() {
    var inp = document.getElementById("dmImport");
    if (inp && inp.getAttribute("data-bound") !== "1") {
      inp.setAttribute("data-bound", "1");
      inp.addEventListener("change", function () {
        var f = inp.files && inp.files[0];
        if (!f) { return; }
        var reader = new FileReader();
        reader.onload = function () {
          if (typeof reader.result === "string") { dmApplyBackup(reader.result); }
          inp.value = "";
        };
        reader.readAsText(f);
      });
    }
  }
  /* ---------- 清理 ---------- */
  function dmClearCards() {
    wcConfirm("清空全部字卡数据", "会删除本机所有字卡分组与条目（外观与图片不受影响），确定吗？", function () {
      try {
        window.localStorage.removeItem(WCL_KEY);
        window.localStorage.removeItem(WC_OLD_KEY);
      } catch (e) { /* 忽略 */ }
      /* v71：表情包分组随字卡一并清空，IDB 媒体库同步清空 */
      mediaDeleteAll();
      /* v91：语音字卡随字卡一并清空（音频 IDB 同步清空） */
      try { window.localStorage.removeItem(VOICE_KEY); } catch (e) { /* 忽略 */ }
      voiceData = null;
      soundDeleteAll();
      loadWcl();
      renderWclEntry();
      renderDataManage();
      tip("字卡数据已清空");
    });
  }
  function dmClearImages() {
    wcConfirm("清空全部上传图片", "本机上传的头像 / 相框 / 相册 / 海报 / 组件背景图都会被删除，确定吗？", function () {
      var ks = dmKeys(), i, k, els, el;
      for (i = 0; i < ks.length; i++) {
        k = ks[i];
        if (k.indexOf(IMG_STORE) === 0) { try { window.localStorage.removeItem(k); } catch (e) { /* 忽略 */ } }
      }
      els = document.querySelectorAll("[data-slot]");
      for (i = 0; i < els.length; i++) {
        el = els[i];
        el.style.backgroundImage = "";
        el.classList.remove("has-photo");
      }
      if (typeof syncAlbumEmpty === "function") { syncAlbumEmpty(); }
      if (window.__syncFrameClones) { window.__syncFrameClones(); }
      anPaint();
      wxPaint();
      tkPaint();
      renderDataManage();
      tip("本机上传的图片已全部清空");
    });
  }
  function dmResetAll() {
    wcConfirm("恢复出厂设置", "会删除本机全部雪晶数据（外观 / 字卡 / 图片 / 记忆 / 语音），并刷新页面，确定吗？", function () {
      var ks = dmKeys(), i;
      for (i = 0; i < ks.length; i++) { try { window.localStorage.removeItem(ks[i]); } catch (e) { /* 忽略 */ } }
      /* v71：IDB 媒体库一并清空；v91：语音音频库一并清空 */
      mediaDeleteAll();
      soundDeleteAll();
      try { window.location.reload(); } catch (e) { /* 忽略 */ }
    });
  }

  var WCL_KEY = "snowcrystal.wordcard.v2";
  var WC_OLD_KEY = "snowcrystal.wordcard.v1";

  var WCL_DEFAULT = {"quote":[{"name":"精选 1","items":["山有木兮木有枝，心悦君兮君不知。","愿得一心人，白头不相离。","只缘感君一回顾，使我思君朝与暮。","两情若是久长时，又岂在朝朝暮暮。","玲珑骰子安红豆，入骨相思知不知。","衣带渐宽终不悔，为伊消得人憔悴。","此情可待成追忆，只是当时已惘然。","人生若只如初见，何事秋风悲画扇。","十年生死两茫茫，不思量，自难忘。"]},{"name":"精选 2","items":["死生契阔，与子成说。执子之手，与子偕老。","红豆生南国，春来发几枝。愿君多采撷，此物最相思。","与君初相识，犹如故人归。","春风十里，不如你。","往后余生，风雪是你，平淡是你。","我见过春日夏风秋叶冬雪，也踏遍南水北山东麓西岭，可这四季春秋，都不及你冲我展眉一笑。","我明白你会来，所以我等。","想把日子过成诗，把诗写成你。","月亮很亮，亮也没用，没用也亮；我喜欢你，喜欢也没用，没用也喜欢。"]},{"name":"精选 3","items":["你要相信，世界上一定有人，正努力地走到你身边来。","想你的时候，风也温柔，雨也温柔。","所有的美好，都在向你赶来的路上。","世间万物，唯你不可辜负。","我喜欢你，像风走了八千里，不问归期。","你若安好，便是晴天。","愿你被这世界温柔以待，愿你所遇皆良人。","山水一程，三生有幸。"]}],"main":[],"kao":[{"name":"开心","items":["(◕‿◕)","(｡♥︎‿♥︎｡)","(◠‿◠✿)","(≧∇≦)/","ヽ(・∀・)ﾉ","(＾▽＾)","(●´∀｀●)","(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧","٩(◕‿◕｡)۶","(✿◠‿◠)","(*^▽^*)","♡＾▽＾♡","╰(▔∀▔)╯","(ᗒᗨᗕ)"]},{"name":"伤心","items":["(╥﹏╥)","(╯︵╰,)","(ノ﹏ヽ)","(｡•́︿•̀｡)","。・゜・(ノД`)・゜・。","(╥_╥)","(´；ω；`)","(╯_╰)","〒▽〒","(。_。)","ಥ_ಥ"]},{"name":"生气","items":["(╯°□°）╯︵ ┻━┻","(¬_¬)","(｀皿´＃)","(╬ Ò﹏Ó)","ヽ(≧Д≦)ノ","(｀Д´)","(`皿´)","(｀へ´)"]},{"name":"惊讶","items":["(°ロ°)","Σ(°△°|||)","(⊙_⊙)","w(°ｏ°)w","ヽ(°〇°)ﾉ","(＠_＠;)","(●__●)","∑(O_O;)"]},{"name":"尴尬/无奈","items":["ヽ(￣д￣;)ノ","┐(´д`)┌","(￣ω￣;)","(；一_一)","(´-ω-`)","(￣▽￣*)ゞ","(＾＾；)","（；￣д￣）"]},{"name":"爱心/喜欢","items":["(´∀｀)♡","♡(◡‿◡✿)","( ˘ ³˘)♥︎","(♥︎ω♥︎*)","(｡･ω･｡)ﾉ♡","♡＼(￣▽￣)／♡","(灬ºωº灬)♡"]},{"name":"搞怪/调皮","items":["( ͡° ͜ʖ ͡°)","(☞ﾟ∀ﾟ)☞","ᕕ(ᐛ)ᕗ","(づ｡◕‿‿◕｡)づ","( 　･ω･)☞"]},{"name":"加油/鼓励","items":["(ง •̀_•́)ง","(๑•̀ㅂ•́)و✧","╭( ･ㅂ･)و ̑̑ ","٩(ˊᗜˋ*)و","(;｀O´)o"]},{"name":"害羞/抱歉","items":["(〃ω〃)","(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)","(｡•́︿•̀｡)","m(_ _)m"]},{"name":"音乐","items":["♪(´ε｀ )","(〜￣▽￣)〜","♬♩♫♪☻(●´∀｀●）","♪(┌・。・)┌"]},{"name":"动物","items":["ʕ·ᴥ·ʔ","(=^･ω･^=)","(=V●ᴥ●V=)","ʕ̡̢̡ʘ̅͟͜͡ʘ̲̅ʔ̢̡̢"]}],"emoji":[{"name":"笑脸与表情","items":["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😜","😝","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😷","🤒","🤕","🤢","🤮","😵","🥴","🤧","🥸","😈","👿","💀","👻","👽","🤖","💩","😺","😸","😹","😻"]},{"name":"人物与手势","items":["👋","🤚","✋","🖐","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","🖕","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","💅","💪","🦵","🦶","👂","👃","👀","👁","👅","👄","👶","👧","👦","👩","👨","👵","👴","👮","👷","💂","🕵","👩‍⚕️","👨‍⚕️","👩‍🎓","👨‍🎓","👩‍🏫","👨‍🏫","👩‍💻","👨‍💻","👩‍🎤","👨‍🎤","🧑‍🎄","🤶","🎅","🧙","🧚","🧛","🧜","🧝","🙇","💁","🙅","🙆","🙋","🙎","🙍","💆","💇","🧖","💃","🕺","👯","🧑‍🤝‍🧑","👫","👬","👭","💏","👪","🗣","👤","👥"]},{"name":"动物与自然","items":["🐵","🐒","🦍","🐶","🐕","🐩","🐺","🦊","🦝","🐱","🐈","🦁","🐯","🐴","🐎","🦄","🐮","🐷","🐗","🐑","🐐","🐪","🐘","🐭","🐹","🐰","🐻","🐨","🐼","🐔","🐧","🐦","🦅","🦆","🦉","🐸","🐊","🐢","🦎","🐍","🐲","🐳","🐬","🐟","🐠","🐙","🦀","🦞","🐌","🦋","🐛","🐜","🐝","🐞","🦗","🕷","🦂","🌸","🌺","🌻","🌹","🌷","💐","🌼","🌾","🍀","🍁","🍂","🍃","🌿","🌵","🎄","🌲","🌳","🌴","🌱","🍄","🌰","🌍","🌙","⭐","🌟","✨","☀️","🌤","⛅","🌧","⛈","🌩","❄️","☃️","🌈","🔥","💧","🌊"]},{"name":"食物与饮料","items":["🍎","🍏","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🥭","🍍","🥝","🍅","🥑","🥒","🌶","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🍞","🥖","🥯","🧀","🥚","🍳","🥓","🥩","🍗","🍖","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🥗","🍝","🍜","🍲","🍣","🍤","🍙","🍚","🍘","🍥","🥮","🍡","🍧","🍨","🍦","🍰","🎂","🧁","🍪","🍩","🍫","🍬","🍭","🍿","🧂","☕","🍵","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🧊","🥤","🧃"]},{"name":"旅行与地点","items":["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚜","🛻","🚲","🛴","🏍","🚂","🚆","🚇","✈️","🛩","🚀","🛸","🚁","⛵","🚢","🛳","🏠","🏡","🏢","🏪","🏫","🏥","🏦","🏨","🏩","⛪","🕌","🕍","⛩","🗼","🗽","🌋","🏔","🏖","🏜","🏝","🏕","🌅","🌄","🏰","🎡","🎢"]},{"name":"活动与运动","items":["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥊","🥋","⛳","⛸","🎣","🤿","🎿","🏂","🪂","🏋","🤸","⛹","🤾","🏌","🏇","🏊","🚴","🚵","🏆","🥇","🥈","🥉","🎮","🎲","🎯","🎳","🎭","🎨","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻"]},{"name":"物品","items":["⌚","📱","💻","⌨️","🖥","🖨","🖱","🖲","📷","📸","📹","🎥","📽","☎️","📞","📟","📺","📻","⏰","🕰","⌛","⏳","🔋","🔌","💡","🔦","🕯","💰","💳","💎","🔨","🪓","⛏","🔧","🔩","⚙️","🗜","🔫","💣","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","📿","💈","📖","📚","📔","📓","📝","✏️","🖊","🖌","🖍","📌","📍","📎","🖇","📏","📐","✂️","📁","🗂","🗑","🔒","🔓","🔑","🗝","🎁","🎀","🎗","🛒","🛍","👑","🎩","👒","🎓","💍","💄","💋","👠","👟","🧣","🧤","🧥","👗","👔","👜","🎒","👝","🧳","☂️"]},{"name":"符号与爱心","items":["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","⛎","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","♨️","🉑","💯","🔞","🔰","⚠️","🚸","🔱","〽️","✅","❎","➿","©️","®️","™️","🎵","🔊","🔔","🎶","💬","🗯","💭","🗨","♠️","♣️","♥️","♦️","🃏","🀄","🕐"]},{"name":"旗帜","items":["🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🇨🇳","🇭🇰","🇲🇴","🇹🇼","🇯🇵","🇰🇷","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇮🇹","🇷🇺","🇨🇦","🇦🇺","🇸🇬","🇹🇭","🇻🇳","🇮🇳","🇧🇷","🇪🇸","🇳🇱","🇨🇭","🇸🇪"]}],"sticker":[],"pat":[{"name":"对方拍一拍库","items":[]},{"name":"我方拍一拍库","items":[]}]};
  var LIB_META = {"quote":{"title":"格言","sub":"恋爱向格言 / 诗词，点击复制","icon":"quote","noun":"格言","act":"add","search":true},"main":{"title":"字卡","sub":"自己说的话，点击复制","icon":"card","noun":"字卡","act":"add","search":true},"kao":{"title":"颜文字","sub":"按情绪分组，点一下即复制","icon":"face","noun":"颜文字","act":"add","search":true},"emoji":{"title":"Emoji","sub":"按输入法分组，点一下即复制","icon":"face","noun":"Emoji","act":"add","search":true},"sticker":{"title":"表情包","sub":"可分组管理，支持上传 / 链接 / JSON 导入","icon":"sticker","noun":"表情包","act":"upload","search":false},"pat":{"title":"拍一拍","sub":"分组管理恋爱向拍一拍","icon":"pat","noun":"拍一拍","act":"add","search":true}};
  var LIB_ICONS = {"quote": "<path d=\"M12 20.2C6.9 17.3 3.2 13.6 3.2 9.9c0-2.6 1.8-4.4 4.3-4.4 1.7 0 3.2.9 4.5 2.6 1.3-1.7 2.8-2.6 4.5-2.6 2.5 0 4.3 1.8 4.3 4.4 0 3.7-3.7 7.4-8.8 10.3z\"/>", "msg": "<path d=\"M4.6 4.8h14.8a2.4 2.4 0 0 1 2.4 2.4v7.6a2.4 2.4 0 0 1-2.4 2.4h-6.2L8 21.2v-4H4.6a2.4 2.4 0 0 1-2.4-2.4V7.2a2.4 2.4 0 0 1 2.4-2.4z\"/>", "card": "<path d=\"M6.4 3.4h11.2a3 3 0 0 1 3 3v11.2a3 3 0 0 1-3 3H6.4a3 3 0 0 1-3-3V6.4a3 3 0 0 1 3-3zm1.6 4.8h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2zm0 3.6h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2zm0 3.6h4.8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2z\"/>", "face": "<path d=\"M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 1 1 0-17.6zM9.3 8.9a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 1 1 0-2.7zm5.4 0a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 1 1 0-2.7zM7.6 13.4h8.8a4.4 4.4 0 0 1-8.8 0z\"/>", "sticker": "<path d=\"M14.9 2.4 21 8.5v9.2a3.4 3.4 0 0 1-3.4 3.4H6.4a3.4 3.4 0 0 1-3.4-3.4V6a3.4 3.4 0 0 1 3.4-3.4h8.5z\"/><path d=\"M14.9 2.4 21 8.5h-5.6a.5.5 0 0 1-.5-.5V2.4z\"/><path d=\"M12 14.6c-1.5-1.3-2.4-2.1-2.4-3a1.6 1.6 0 0 1 2.4-1.3 1.6 1.6 0 0 1 2.4 1.3c0 .9-.9 1.7-2.4 3z\"/>", "pat": "<rect x=\"9\" y=\"5\" width=\"3.2\" height=\"10.4\" rx=\"1.6\"/><rect x=\"12.6\" y=\"3.4\" width=\"3.2\" height=\"12\" rx=\"1.6\"/><rect x=\"16.1\" y=\"5.4\" width=\"3\" height=\"10\" rx=\"1.5\"/><path d=\"M7 12.2h12.1v3.8c0 3.6-2.7 5.9-6.2 5.9-2.7 0-4.8-1.5-5.7-3.9l-1.2-3.5c-.3-.9.1-2.3 1-2.3z\"/>"};
  var LIB_ORDER = ["quote", "main", "kao", "emoji", "sticker", "pat"];

  var wcl = null;
  /* v70：sel / selPicks 记录选择模式下已勾选条目的索引集合（多选，适用于所有字卡库） */
  var wclNav = { lib: null, page: null, group: 0, sel: false, selPicks: [] };

  function libMeta(k) { return LIB_META[k] || LIB_META.quote; }
  function libIconSvg(k) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">' + (LIB_ICONS[libMeta(k).icon] || "") + "</svg>";
  }
  function wclClone(o) { return JSON.parse(JSON.stringify(o)); }
  function wclNorm(data) {
    var out = {}, i, j, k, g;
    for (i = 0; i < LIB_ORDER.length; i++) {
      k = LIB_ORDER[i];
      if (!data || !data[k] || !data[k].length) { out[k] = wclClone(WCL_DEFAULT[k] || []); continue; }
      out[k] = [];
      for (j = 0; j < data[k].length; j++) {
        g = data[k][j] || {};
        /* v64：保留软删除标记 deleted（被删除的内置条目值），供「恢复」键还原
           v70：保留屏蔽标记 blocked（被屏蔽的条目原值），供「恢复已屏蔽」还原 */
        out[k].push({ name: String(g.name === undefined ? "分组" : g.name), items: (g.items || []).slice(), deleted: (g.deleted || []).slice(), blocked: (g.blocked || []).slice() });
      }
    }
    return out;
  }
  function loadWcl() {
    if (wcl) { return wcl; }
    var raw = null;
    try { if (window.localStorage) { raw = window.localStorage.getItem(WCL_KEY); } } catch (e) { raw = null; }
    if (!raw) { try { if (window.localStorage) { raw = window.localStorage.getItem(WC_OLD_KEY); } } catch (e2) { raw = null; } }
    if (!raw) { wcl = wclNorm(null); return wcl; }
    try { wcl = wclNorm(JSON.parse(raw)); } catch (e3) { wcl = wclNorm(null); }
    /* v61.1：启动清理 —— 移除字卡(main)库中导入产生的占位/错误分组「字卡」
       （默认数据 main 为空数组，该分组只可能来自 localStorage 残留） */
    if (wcl && wcl.main && wcl.main.length) {
      var wclClean = false, wclI;
      for (wclI = wcl.main.length - 1; wclI >= 0; wclI--) {
        if (wcl.main[wclI] && wcl.main[wclI].name === "字卡") { wcl.main.splice(wclI, 1); wclClean = true; }
      }
      if (wclClean) { saveWcl(); }
    }
    /* v14：拍一拍库迁移 —— 只保留「对方拍一拍库 / 我方拍一拍库」两个分组；
       旧内置分组「基础」整体删除；其余历史分组内容并入「对方拍一拍库」 */
    if (wcl && wcl.pat && wcl.pat.length) {
      var wclPatMig = false, wclPatO = null, wclPatS = null, wclPi, wclPg;
      for (wclPi = 0; wclPi < wcl.pat.length; wclPi++) {
        if (wcl.pat[wclPi] && wcl.pat[wclPi].name === "对方拍一拍库") { wclPatO = wcl.pat[wclPi]; }
        if (wcl.pat[wclPi] && wcl.pat[wclPi].name === "我方拍一拍库") { wclPatS = wcl.pat[wclPi]; }
      }
      if (!wclPatO) { wclPatO = { name: "对方拍一拍库", items: [], deleted: [], blocked: [] }; wcl.pat.push(wclPatO); wclPatMig = true; }
      if (!wclPatS) { wclPatS = { name: "我方拍一拍库", items: [], deleted: [], blocked: [] }; wcl.pat.push(wclPatS); wclPatMig = true; }
      for (wclPi = wcl.pat.length - 1; wclPi >= 0; wclPi--) {
        wclPg = wcl.pat[wclPi];
        if (!wclPg || wclPg === wclPatO || wclPg === wclPatS) { continue; }
        if (wclPg.name === "基础") { wcl.pat.splice(wclPi, 1); wclPatMig = true; continue; }
        wclPatO.items = wclPatO.items.concat(wclPg.items || []);
        wclPatO.deleted = (wclPatO.deleted || []).concat(wclPg.deleted || []);
        wclPatO.blocked = (wclPatO.blocked || []).concat(wclPg.blocked || []);
        wcl.pat.splice(wclPi, 1);
        wclPatMig = true;
      }
      if (wclPatMig) { saveWcl(); }
    }
    /* v71：老数据迁移 —— 加载后把 sticker 条目中的 data: 图片异步迁入 IDB 并替换为 mediaKey */
    mediaMigrateAll();
    return wcl;
  }
  function saveWcl() {
    try {
      if (window.localStorage) { window.localStorage.setItem(WCL_KEY, JSON.stringify(wcl)); }
      return true;
    } catch (e) {
      /* 本机写满时静默 —— 改为明确告警：静默丢数据会让「导入后刷新消失」无从排查 */
      try { if (window.console && console.warn) { console.warn("[雪晶] 字卡库保存失败：", e); } } catch (e2) { /* ignore */ }
      try { wcToast("字卡库保存失败：本地存储空间不足，请减少表情包数量或压缩图片后再试"); } catch (e3) { /* DOM 未就绪时忽略 */ }
      return false;
    }
  }

  /* =========================================================
     v71：表情包图片 IndexedDB 媒体库
     · localStorage 只存 mediaKey 引用（img:"m_xxx"），base64 图片存 IDB，突破 5MB 上限
     · 外链 http(s) 直连显示，不进 IDB；data:image 上传/导入写 IDB
     · 渲染异步取回 + 内存缓存；删除/清空/恢复出厂同步删 IDB
     ========================================================= */
  var MEDIA_DB = "snowcrystal.media.v1";
  var MEDIA_STORE = "media";
  var MEDIA_CACHE = {};           /* mediaKey -> dataURL 内存缓存 */
  var MEDIA_KEY_RE = /^m_[A-Za-z0-9_-]{6,}$/;

  function isDataUrl(s) { return typeof s === "string" && /^data:image\//i.test(s); }
  function isMediaKey(s) { return typeof s === "string" && MEDIA_KEY_RE.test(s); }
  function isExtUrl(s) { return typeof s === "string" && /^(https?:\/\/|\/\/)/i.test(s); }

  function mediaDbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no-idb")); return; }
      var req = window.indexedDB.open(MEDIA_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) { db.createObjectStore(MEDIA_STORE, { keyPath: "key" }); }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("idb-open")); };
    });
  }
  /* v74：补全缺失的媒体缓存写入函数 —— 此前 mediaGet 取回成功时调用未定义的
     mediaCachePut 抛 ReferenceError，导致 resolve 永不执行、表情包 img 永远无 src 挂起 */
  function mediaCachePut(key, dataURL) {
    if (!key || !dataURL) { return; }
    MEDIA_CACHE[key] = dataURL;
  }
  function mediaSave(key, dataURL) {
    if (!key || !dataURL) { return Promise.resolve(null); }
    MEDIA_CACHE[key] = dataURL;
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).put({ key: key, data: dataURL, ts: Date.now() });
        tx.oncomplete = function () { resolve(key); };
        tx.onerror = function () { reject(tx.error || new Error("idb-put")); };
        tx.onabort = function () { reject(tx.error || new Error("idb-abort")); };
      });
    })["catch"](function () { return null; });
  }
  function mediaGet(key) {
    if (!key) { return Promise.resolve(null); }
    if (MEDIA_CACHE[key]) { return Promise.resolve(MEDIA_CACHE[key]); }
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readonly");
        var req = tx.objectStore(MEDIA_STORE).get(key);
        req.onsuccess = function () {
          var row = req.result;
          if (row && row.data) { mediaCachePut(key, row.data); resolve(row.data); }
          else { resolve(null); }
        };
        req.onerror = function () { reject(req.error || new Error("idb-get")); };
      });
    })["catch"](function () { return null; });
  }
  function mediaDelete(key) {
    if (!key) { return Promise.resolve(); }
    delete MEDIA_CACHE[key];
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function mediaDeleteAll() {
    MEDIA_CACHE = {};
    return mediaDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function mediaNewKey() {
    return "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  /* 保存一张新图：写 IDB 返回 mediaKey；IDB 不可用时返回 null（调用方回退存 base64） */
  function mediaSaveNew(dataURL) {
    if (!isDataUrl(dataURL)) { return Promise.resolve(null); }
    return mediaSave(mediaNewKey(), dataURL).then(function (mk) { return mk || null; });
  }

  /* 遍历所有 sticker 分组条目（items/deleted/blocked 三数组），回调 (arr, idx, it) */
  function stickerWalk(cb) {
    var groups = (wcl && wcl.sticker) || [], gi, ai, arr, i;
    for (gi = 0; gi < groups.length; gi++) {
      arr = [(groups[gi] && groups[gi].items) || [], (groups[gi] && groups[gi].deleted) || [], (groups[gi] && groups[gi].blocked) || []];
      for (ai = 0; ai < arr.length; ai++) {
        for (i = 0; i < arr[ai].length; i++) { cb(arr[ai], i, arr[ai][i]); }
      }
    }
  }
  /* 收集全部被引用的 mediaKey（去重），用于删除判定与导出回填 */
  function stickerMediaKeys() {
    var out = [], i;
    stickerWalk(function (arr, idx, it) {
      if (typeof it === "string") { if (isMediaKey(it) && out.indexOf(it) < 0) { out.push(it); } }
      else if (it && typeof it === "object" && isMediaKey(it.img) && out.indexOf(it.img) < 0) { out.push(it.img); }
    });
    return out;
  }
  /* 取条目的 mediaKey（无则空串） */
  function grpItemImgKey(it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return isMediaKey(it) ? it : ""; }
    if (it && typeof it === "object") { return isMediaKey(it.img) ? it.img : ""; }
    return "";
  }
  /* 删除 mediaKey（若已无任何条目引用则真正删 IDB，避免重复引用误删） */
  function mediaDeleteIfUnused(mk) {
    if (!mk) { return Promise.resolve(); }
    if (stickerMediaKeys().indexOf(mk) < 0) { return mediaDelete(mk); }
    return Promise.resolve();
  }
  /* 收集全部 sticker 引用的 mediaKey -> base64 映射（导出前异步调用） */
  function mediaResolveAll() {
    var keys = stickerMediaKeys(), map = {}, i;
    function step(idx) {
      if (idx >= keys.length) { return Promise.resolve(map); }
      var mk = keys[idx];
      if (MEDIA_CACHE[mk]) { map[mk] = MEDIA_CACHE[mk]; return step(idx + 1); }
      return mediaGet(mk).then(function (d) { if (d) { map[mk] = d; } return step(idx + 1); });
    }
    return step(0);
  }
  /* 导出/备份用：把对象中的 sticker 条目 mediaKey 回填为 base64（查不到的保留原值） */
  function stickerFillBase64(obj, map) {
    var groups = (obj && obj.sticker) || [], gi, g, arr, ai, i, it;
    for (gi = 0; gi < groups.length; gi++) {
      g = groups[gi] || {};
      arr = [g.items, g.deleted, g.blocked];
      for (ai = 0; ai < arr.length; ai++) {
        if (!Array.isArray(arr[ai])) { continue; }
        for (i = 0; i < arr[ai].length; i++) {
          it = arr[ai][i];
          if (typeof it === "string") {
            if (isMediaKey(it)) {
              var _b64 = (map && map[it]) || null;
              /* v74：媒体库取不到数据的 mediaKey 一并打 __missing 标记，导入方据此提示缺失而非静默占位 */
              arr[ai][i] = { k: "🖼", t: "表情包", img: _b64 || it, __missing: _b64 ? undefined : true };
            }
          } else if (it && typeof it === "object" && isMediaKey(it.img)) {
            if (map && map[it.img]) { it.img = map[it.img]; }
            else { it.__missing = true; }
          }
        }
      }
    }
    return obj;
  }
  /* 老数据迁移 / 导入回填：把 wcl 中所有 data:image base64 写入 IDB 并替换为 mediaKey；
     有迁移则保存并返回 true。分批并发，避免同时开太多 IDB 事务。 */
  function mediaMigrateAll() {
    var pend = [], moved = false;
    stickerWalk(function (arr, idx, it) {
      var img = null;
      if (typeof it === "string") { if (isDataUrl(it)) { img = it; } }
      else if (it && typeof it === "object" && isDataUrl(it.img)) { img = it.img; }
      if (!img) { return; }
      pend.push({ arr: arr, idx: idx, img: img });
    });
    if (!pend.length) { return Promise.resolve(false); }
    function runChunk(start) {
      var chunk = pend.slice(start, start + 8), ps = [], i, ctx;
      for (i = 0; i < chunk.length; i++) {
        ctx = chunk[i];
        ps.push(mediaSaveNew(ctx.img).then(function (c, mk) {
          if (mk) {
            if (typeof c.arr[c.idx] === "string") { c.arr[c.idx] = mk; }
            else if (c.arr[c.idx] && typeof c.arr[c.idx] === "object") { c.arr[c.idx].img = mk; }
            moved = true;
          }
        }.bind(null, ctx)));
      }
      return Promise.all(ps).then(function () {
        if (start + 8 < pend.length) { return runChunk(start + 8); }
        return null;
      });
    }
    return runChunk(0).then(function () {
      if (moved) { saveWcl(); }
      return moved;
    });
  }
  /* 渲染辅助：sticker 条目 img 生成 <img> —— base64/外链直显，mediaKey 命中内存缓存直显，
     未命中走 data-mkey 异步从 IDB 取回（绑定完成前由 CSS 隐藏，不显示 alt「表情包」占位文字） */
  function stickerImgHtml(img, t) {
    var onerr = "this.classList.add('wc-img-fail');var fb=this.nextElementSibling;if(fb){fb.classList.add('wc-img-fallback-on')}";
    if (isDataUrl(img) || isExtUrl(img)) {
      return '<img src="' + esc(img) + '" alt="表情包" loading="lazy" onerror="' + onerr + '">';
    }
    if (isMediaKey(img) && MEDIA_CACHE[img]) { return '<img src="' + esc(MEDIA_CACHE[img]) + '" alt="表情包" loading="lazy" onerror="' + onerr + '">'; }
    return '<img data-mkey="' + esc(img) + '" alt="表情包" loading="lazy">';
  }
  /* 渲染辅助：为容器内所有 data-mkey 图片异步从 IDB 取回 base64 并设置 src */
  function stickerBindMedia(host) {
    if (!host || !host.querySelectorAll) { return; }
    var imgs = host.querySelectorAll("img[data-mkey]"), i, img, mk;
    for (i = 0; i < imgs.length; i++) {
      img = imgs[i];
      mk = img.getAttribute("data-mkey");
      if (!mk) { continue; }
      (function (el, key) {
        if (MEDIA_CACHE[key]) { el.setAttribute("src", MEDIA_CACHE[key]); return; }
        var tried = 0;
        function bindOnce() {
          mediaGet(key).then(function (d) {
            if (d) { el.setAttribute("src", d); return; }
            /* v74：首次取回失败延迟重试一次（防 IDB 偶发未就绪），仍失败则给明确缺失提示 */
            if (tried < 1) { tried = 1; window.setTimeout(bindOnce, 250); return; }
            el.classList.add("wc-img-fail");
            var fb = el.nextElementSibling;
            if (fb) {
              fb.classList.add("wc-img-fallback-on");
              if (!fb.getAttribute("data-missing")) {
                fb.setAttribute("data-missing", "1");
                fb.innerHTML = esc(fb.textContent || "") + '<span class="wc-img-missing-tip">图片缺失</span>';
              }
            }
          });
        }
        bindOnce();
      })(img, mk);
    }
  }

  /* 导入/上传表情包成功后，若聊天室表情面板正打开着（sticker Tab），主动重渲染，
     让新导入的表情包在聊天侧立即可见 —— 聊天模块的 stickerGroups() 实时读 localStorage，
     但面板不会自动刷新，需要此处推一把 */
  function syncChatStickerPanel() {
    try {
      if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.switchEmojiTab) {
        var pnl = document.getElementById("chatEmojiPanel");
        if (pnl && pnl.classList.contains("is-open")) { window.SnowCrystal.Chat.switchEmojiTab("sticker"); }
      }
    } catch (e) { /* 不影响主流程 */ }
  }

  /* ---------- 小工具：转义 / 提示 / 复制（本模块内自持） ---------- */
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
  var wcPromptNoEnter = false; /* v74：批量粘贴模式（URL 导入）下回车仅换行，不提交 */
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
    /* v74：批量粘贴场景（如 URL 导入）关闭「回车即提交」，允许自由换行 */
    wcPromptNoEnter = !!opts.noEnterSubmit;
    if (area) { area.classList.toggle("is-url-batch", !!opts.noEnterSubmit); }
    /* v75：批量粘贴模式放开 maxlength（textarea 默认 400 字符会截断第 14 条链接），真正无上限 */
    if (area) { area.maxLength = opts.noEnterSubmit ? 100000000 : 400; }
    if (tEl) { tEl.textContent = title || "添加"; }
    if (tipEl) { tipEl.textContent = tip || ""; }
    if (input) { input.value = value || ""; }
    if (area) { area.value = value || ""; }
    var groupMode = !!opts.groupMode;
    var multi = groupMode || !!opts.multiline;
    /* v70.2：noContent —— 仅需分组名/单行输入时整体隐藏内容输入区（新建表情包分组只填名字） */
    var noContent = !!opts.noContent;
    /* v69：内容输入框统一用宽多行 textarea——contentLabel（分组内添加）也走宽框，隐藏细窄单行 input */
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
    if (area) { area.classList.remove("is-url-batch"); area.maxLength = 400; } /* v75：退出批量模式恢复默认 400 上限 */
  }

  /* ---------- 确认弹窗（删除分组 / 清空上传） ---------- */
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

  /* ---------- 转组弹窗（选中模式勾选内容后，选择目标分组：跨库或同库其他分组） ---------- */
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
                  '<span class="discover-arrow">›</span>' +
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

  /* ---------- 入口页：每项右侧显示分组 / 条数 ---------- */
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
        kk = wcl[keys[x]] || [];
        groups += kk.length;
        for (j = 0; j < kk.length; j++) { n += (kk[j].items || []).length; }
      }
      nodes[i].textContent = groups + " 组 · " + n + " 条";
    }
  }

  /* =========================================================
     v91：语音字卡库（对标拾心界语音字卡）
     · 元数据存 localStorage「snowcrystal.voice.v1」，音频 base64 存 IndexedDB「snowcrystal.sound.v1」
     · 分组结构对齐字卡库：{ groups:[{name, items:[{id,name,dur,mime,audioKey}], deleted, blocked}] }
     · 聊天自动回复可随机发送语音字卡（开关+概率见聊天设置 / 概率设置）
     ========================================================= */
  var SOUND_DB = "snowcrystal.sound.v1";
  var SOUND_STORE = "sound";
  var SOUND_CACHE = {};            /* audioKey -> dataURL 内存缓存 */
  var VOICE_KEY = "snowcrystal.voice.v1";

  var voiceData = null;
  var voiceNav = { group: 0, sel: false, selPicks: [] };
  var voiceAudio = null;           /* 播放中的 Audio 单例 */
  var voiceAudioBtn = null;        /* 当前播放按钮元素 */
  var voiceAudioBubble = null;     /* 当前播放气泡元素 */

  function soundNewKey() { return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function soundDbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no-idb")); return; }
      var req = window.indexedDB.open(SOUND_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(SOUND_STORE)) { db.createObjectStore(SOUND_STORE, { keyPath: "key" }); }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("idb-open")); };
    });
  }
  function soundSave(key, dataURL) {
    if (!key || !dataURL) { return Promise.resolve(null); }
    SOUND_CACHE[key] = dataURL;
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).put({ key: key, data: dataURL, ts: Date.now() });
        tx.oncomplete = function () { resolve(key); };
        tx.onerror = function () { reject(tx.error || new Error("idb-put")); };
        tx.onabort = function () { reject(tx.error || new Error("idb-abort")); };
      });
    })["catch"](function () { return null; });
  }
  function soundGet(key) {
    if (!key) { return Promise.resolve(null); }
    if (SOUND_CACHE[key]) { return Promise.resolve(SOUND_CACHE[key]); }
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(SOUND_STORE, "readonly");
        var req = tx.objectStore(SOUND_STORE).get(key);
        req.onsuccess = function () {
          var row = req.result;
          if (row && row.data) { SOUND_CACHE[key] = row.data; resolve(row.data); }
          else { resolve(null); }
        };
        req.onerror = function () { reject(req.error || new Error("idb-get")); };
      });
    })["catch"](function () { return null; });
  }
  function soundDelete(key) {
    if (!key) { return Promise.resolve(); }
    delete SOUND_CACHE[key];
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }
  function soundDeleteAll() {
    SOUND_CACHE = {};
    return soundDbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(SOUND_STORE, "readwrite");
        tx.objectStore(SOUND_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
        tx.onabort = function () { resolve(); };
      });
    })["catch"](function () { /* ignore */ });
  }

  function voiceLoad() {
    if (voiceData) { return voiceData; }
    var raw = null;
    try { if (window.localStorage) { raw = window.localStorage.getItem(VOICE_KEY); } } catch (e) { raw = null; }
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.groups)) { voiceData = o; return voiceData; }
      } catch (e2) { /* 损坏则重建 */ }
    }
    voiceData = { groups: [] };
    return voiceData;
  }
  function voiceSave() {
    try { if (window.localStorage) { window.localStorage.setItem(VOICE_KEY, JSON.stringify(voiceData)); } } catch (e) { /* 本机写满时静默 */ }
  }
  function voiceGroups() { return (voiceLoad().groups || []); }
  function voiceAllItems() {
    var gs = voiceGroups(), out = [], i, j;
    for (i = 0; i < gs.length; i++) {
      for (j = 0; j < (gs[i].items || []).length; j++) { out.push(gs[i].items[j]); }
    }
    return out;
  }
  function voiceCounts() {
    var gs = voiceGroups(), n = 0, i;
    for (i = 0; i < gs.length; i++) { n += (gs[i].items || []).length; }
    return { groups: gs.length, items: n };
  }
  function voicePickRandom() {
    var all = voiceAllItems();
    if (!all.length) { return null; }
    return all[Math.floor(Math.random() * all.length)];
  }
  function renderVoiceEntry() {
    var el = document.getElementById("voiceMeta");
    if (!el) { return; }
    var c = voiceCounts();
    el.textContent = c.groups + " 组 · " + c.items + " 条";
  }
  function voiceStopPlay() {
    if (voiceAudio) { try { voiceAudio.pause(); } catch (e) { /* ignore */ } voiceAudio = null; }
    if (voiceAudioBtn) { voiceAudioBtn.classList.remove("is-playing"); voiceAudioBtn.textContent = "▶"; voiceAudioBtn = null; }
    if (voiceAudioBubble) { voiceAudioBubble.classList.remove("playing"); voiceAudioBubble = null; }
  }
  function voicePlaySrc(dataUrl, dur, btnEl, bubbleEl) {
    voiceStopPlay();
    if (!dataUrl) { return; }
    var a = new Audio(dataUrl);
    voiceAudio = a;
    if (btnEl) { btnEl.classList.add("is-playing"); btnEl.textContent = "⏸"; voiceAudioBtn = btnEl; }
    if (bubbleEl) { bubbleEl.classList.add("playing"); voiceAudioBubble = bubbleEl; }
    a.onended = function () { voiceStopPlay(); };
    a.onerror = function () { voiceStopPlay(); wcToast("语音播放失败"); };
    a.play()["catch"](function () { voiceStopPlay(); });
  }

  /* ---------- 语音字卡库 · 分组列表页 ---------- */
  function openVoiceLib() {
    voiceLoad();
    voiceNav.group = 0;
    voiceNav.sel = false;
    voiceNav.selPicks = [];
    switchPage("voice-lib");
    renderVoiceLib();
  }
  function renderVoiceLib() {
    voiceLoad();
    var tools = document.getElementById("voiceLibTools");
    if (tools) { tools.innerHTML = voiceLibToolbarHtml(); }
    var wrap = document.getElementById("voiceSearchWrap");
    if (wrap) { wrap.hidden = true; }
    var inp = document.getElementById("voiceSearchInput");
    if (inp) { inp.value = ""; }
    var res = document.getElementById("voiceSearchResults");
    if (res) { res.hidden = true; res.innerHTML = ""; }
    var list = document.getElementById("voiceGroups");
    if (list) { list.hidden = false; list.innerHTML = voiceLibGroupsHtml(); }
    var foot = document.getElementById("voiceLibFoot");
    if (foot) { foot.textContent = "共 " + voiceGroups().length + " 组 · 数据存在本机"; }
    renderVoiceEntry();
  }
  function voiceLibToolbarHtml() {
    var html = "";
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="新建分组" aria-label="新建分组" onclick="SnowCrystal.voiceAddGroup()">' + WC_ICO_ADD + "</button>";
    html += '<button class="wc-tool is-ico" type="button" title="导入 mp3（自动归入「导入的语音」分组）" aria-label="导入 mp3" onclick="SnowCrystal.voiceImportFiles()">' + WC_ICO_IMPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" title="搜索" aria-label="搜索" onclick="SnowCrystal.voiceToggleSearch()">' + WC_ICO_SEARCH + "</button>";
    return html;
  }
  function voiceLibGroupsHtml() {
    var gs = voiceGroups(), html = "", i;
    if (!gs.length) { return '<p class="grp-empty">还没有语音分组，点上方「＋」新建，或直接导入 mp3</p>'; }
    for (i = 0; i < gs.length; i++) {
      var n = (gs[i].items || []).length;
      html += '<div class="group-item-wrapper">' +
                '<div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + i + ')">' +
                  '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                  '<span class="discover-info">' +
                    '<span class="discover-title lib-row-name">' + esc(gs[i].name) + "</span>" +
                    '<span class="discover-desc">' + n + " 条 · 点进查看</span>" +
                  "</span>" +
                  '<span class="discover-arrow">›</span>' +
                  '<span class="group-item-actions">' +
                    '<button type="button" title="重命名" aria-label="重命名分组" onclick="event.stopPropagation();SnowCrystal.voiceRenameGroupAt(' + i + ')">' + WC_ICO_PEN + "</button>" +
                    '<button class="is-danger" type="button" title="删除" aria-label="删除分组" onclick="event.stopPropagation();SnowCrystal.voiceDeleteGroupAt(' + i + ')">' + WC_ICO_TRASH + "</button>" +
                  "</span>" +
                "</div>" +
                (i < gs.length - 1 ? '<div class="list-divider" aria-hidden="true"></div>' : "") +
              "</div>";
    }
    return html;
  }
  function voiceAddGroup() {
    var name = prompt("新建语音字卡分组", "语音 " + (voiceGroups().length + 1));
    if (!name) { return; }
    name = String(name).trim();
    if (!name) { return; }
    voiceData.groups.push({ name: name, items: [], deleted: [], blocked: [] });
    voiceSave();
    renderVoiceLib();
    wcToast("已新建分组");
  }
  function voiceRenameGroupAt(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    var name = prompt("重命名分组", gs[i].name);
    if (!name) { return; }
    name = String(name).trim();
    if (!name) { return; }
    gs[i].name = name;
    voiceSave();
    renderVoiceLib();
    wcToast("已重命名");
  }
  function voiceDeleteGroupAt(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    var g = gs[i];
    wcConfirm("删除分组", "删除「" + g.name + "」及其全部 " + (g.items || []).length + " 条语音（音频一并删除），确定吗？", function () {
      var k, keys = [];
      for (k = 0; k < (g.items || []).length; k++) { if (g.items[k] && g.items[k].audioKey) { keys.push(g.items[k].audioKey); } }
      for (k = 0; k < (g.blocked || []).length; k++) { if (g.blocked[k] && g.blocked[k].audioKey) { keys.push(g.blocked[k].audioKey); } }
      gs.splice(i, 1);
      voiceSave();
      keys.forEach(function (mk) { soundDelete(mk); });
      renderVoiceLib();
      wcToast("已删除分组");
    });
  }

  /* ---------- 语音字卡库 · mp3 导入 ---------- */
  var voicePickerMode = "lib";    /* lib=库页导入建组 | group=导入当前组 */
  function voiceImportFiles() { voicePickerMode = "lib"; document.getElementById("voiceFilePicker").click(); }
  function voiceAddItem() { voicePickerMode = "group"; document.getElementById("voiceFilePicker").click(); }
  function voiceHandleFiles(files) {
    if (!files || !files.length) { return; }
    var g = null, i;
    if (voicePickerMode === "lib") {
      var gs = voiceGroups();
      for (i = 0; i < gs.length; i++) { if (gs[i].name === "导入的语音") { g = gs[i]; break; } }
      if (!g) { g = { name: "导入的语音", items: [], deleted: [], blocked: [] }; gs.push(g); }
    } else {
      var gg = voiceGroups()[voiceNav.group];
      if (!gg) { return; }
      g = gg;
    }
    var todo = Array.prototype.slice.call(files, 0);
    var done = 0, added = 0;
    function step() {
      if (!todo.length) {
        voiceSave();
        if (voicePickerMode === "lib") { renderVoiceLib(); } else { renderVoiceGroup(); }
        renderVoiceEntry();
        wcToast("已导入 " + added + " 条语音");
        return;
      }
      var f = todo.shift();
      if (!f || (f.type && f.type.indexOf("audio") < 0 && f.name.indexOf(".mp3") < 0 && f.name.indexOf(".m4a") < 0 && f.name.indexOf(".wav") < 0 && f.name.indexOf(".ogg") < 0)) {
        done++; step(); return;
      }
      getAudioDuration(f).then(function (dur) {
        var reader = new FileReader();
        reader.onload = function () {
          if (typeof reader.result === "string") {
            var audioKey = soundNewKey();
            soundSave(audioKey, reader.result).then(function (mk) {
              var base = f.name.replace(/\.[^.]+$/, "") || "语音";
              g.items.push({ id: "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: base, dur: Math.round(dur || 0), mime: f.type || "audio/mpeg", audioKey: mk || audioKey });
              added++;
              done++; step();
            });
          } else { done++; step(); }
        };
        reader.onerror = function () { done++; step(); };
        reader.readAsDataURL(f);
      });
    }
    step();
  }
  function getAudioDuration(file) {
    return new Promise(function (resolve) {
      try {
        var url = URL.createObjectURL(file);
        var au = new Audio();
        au.preload = "metadata";
        au.onloadedmetadata = function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } resolve(au.duration); };
        au.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } resolve(0); };
        au.src = url;
      } catch (e) { resolve(0); }
    });
  }

  /* ---------- 语音字卡库 · 分组详情页 ---------- */
  function openVoiceGroup(i) {
    var gs = voiceGroups();
    if (i < 0 || i >= gs.length) { return; }
    voiceNav.group = i;
    voiceNav.sel = false;
    voiceNav.selPicks = [];
    switchPage("voice-lib-group");
    renderVoiceGroup();
  }
  function renderVoiceGroup() {
    voiceLoad();
    var gs = voiceGroups();
    if (!gs.length) { openVoiceLib(); return; }
    if (voiceNav.group < 0 || voiceNav.group >= gs.length) { voiceNav.group = 0; }
    var g = gs[voiceNav.group];
    var tEl = document.getElementById("voiceGrpTitle");
    if (tEl) { tEl.textContent = g.name; }
    var tools = document.getElementById("voiceGrpTools");
    if (tools) { tools.innerHTML = voiceGrpToolbarHtml(g); }
    var body = document.getElementById("voiceGrpBody");
    if (body) { body.innerHTML = voiceGrpBodyHtml(g); }
    var foot = document.getElementById("voiceGrpFoot");
    if (foot) {
      foot.textContent = voiceNav.sel
        ? "选择模式：点条目勾选/取消（可多选）· 可转移 / 批量删除或屏蔽 · 点「完成」退出"
        : "点语音播放 · 「×」删除 · 数据存在本机";
    }
    renderVoiceEntry();
  }
  function voiceGrpToolbarHtml(g) {
    var html = "";
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="添加语音（上传 mp3）" aria-label="添加语音" onclick="SnowCrystal.voiceAddItem()">' + WC_ICO_ADD + "</button>";
    var sel = !!voiceNav.sel;
    if (sel) {
      var picks = voiceNav.selPicks || [];
      html += '<button class="wc-tool is-ico" data-act="vselall" type="button" title="全选" aria-label="全选" onclick="SnowCrystal.voiceSelAll()">' + WC_ICO_ALL + "</button>";
      html += '<button class="wc-tool is-ico" data-act="move" type="button" title="转移已选 ' + picks.length + ' 条到其他分组" aria-label="转移已选到其他分组" onclick="SnowCrystal.voiceMovePicked()">' + WC_ICO_MOVE + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="del" type="button" title="删除已选 ' + picks.length + ' 条" aria-label="批量删除已选" onclick="SnowCrystal.voiceDeletePicked()">' + WC_ICO_TRASH + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="block" type="button" title="屏蔽已选 ' + picks.length + ' 条（聊天混入不再使用）" aria-label="屏蔽已选" onclick="SnowCrystal.voiceBlockPicked()">' + WC_ICO_BLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico' + (sel ? " is-on" : "") + '" type="button" title="' + (sel ? "完成：退出选择模式" : "选择：进入选择模式，勾选后可转移 / 批量删除或屏蔽") + '" aria-label="' + (sel ? "完成选择" : "选择模式") + '" onclick="SnowCrystal.voiceToggleSel()">' + WC_ICO_SELECT + "</button>";
    if (g.blocked && g.blocked.length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复已屏蔽 ' + g.blocked.length + ' 条" aria-label="恢复已屏蔽" onclick="SnowCrystal.voiceUnblockAll()">' + WC_ICO_UNBLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico" type="button" title="重命名分组" aria-label="重命名分组" onclick="SnowCrystal.voiceRenameGroupAt(' + voiceNav.group + ')">' + WC_ICO_PEN + "</button>";
    return html;
  }
  function voiceGrpBodyHtml(g) {
    var items = (g && g.items) || [];
    if (!items.length) { return '<p class="grp-empty">这一组还没有语音，点上方「＋」上传 mp3</p>'; }
    var sel = !!voiceNav.sel, picks = voiceNav.selPicks || [], html = '<div class="wc-list' + (sel ? " is-selecting" : "") + '" id="voiceGrpItems">', i, it;
    function pickCls(i) { return sel ? (picks.indexOf(i) >= 0 ? " is-selecting is-picked" : " is-selecting") : ""; }
    for (i = 0; i < items.length; i++) {
      it = items[i] || {};
      html += '<div class="wc-row voice-row' + pickCls(i) + '" role="button" tabindex="0" data-vidx="' + i + '">' +
                '<span class="voice-play-btn' + (sel ? " is-sel-mask" : "") + '" type="button" title="播放 / 停止" aria-label="播放">▶</span>' +
                '<span class="voice-row-main">' +
                  '<span class="wc-row-main">' + esc(it.name || "语音") + "</span>" +
                  '<span class="voice-row-sub">' + fmtVoiceDur(it.dur || 0) + (it.mime ? " · " + esc(it.mime.replace("audio/", "")) : "") + "</span>" +
                "</span>" +
                (sel ? "" : '<button class="wc-edit" type="button" data-vedit="1" title="编辑" aria-label="编辑">' + WC_ICO_PEN + "</button>" +
                '<button class="wc-del" type="button" data-vdel="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>") +
              "</div>";
    }
    return html + "</div>";
  }
  function voiceToggleSel() {
    voiceNav.sel = !voiceNav.sel;
    voiceNav.selPicks = [];
    renderVoiceGroup();
  }
  function voiceSelAll() {
    var g = voiceGroups()[voiceNav.group];
    var n = (g && g.items) ? g.items.length : 0;
    voiceNav.selPicks = [];
    for (var i = 0; i < n; i++) { voiceNav.selPicks.push(i); }
    renderVoiceGroup();
  }
  function voiceEditName(i) {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    var name = prompt("重命名语音", g.items[i].name || "");
    if (!name) { return; }
    g.items[i].name = String(name).trim() || g.items[i].name;
    voiceSave();
    renderVoiceGroup();
    wcToast("已重命名");
  }
  function voiceDeleteItem(i) {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    var it = g.items[i];
    wcConfirm("删除语音", "删除「" + (it.name || "语音") + "」？音频一并删除。", function () {
      g.items.splice(i, 1);
      voiceSave();
      if (it.audioKey) { soundDelete(it.audioKey); }
      renderVoiceGroup();
      wcToast("已删除");
    });
  }
  function voiceDeletePicked() {
    var g = voiceGroups()[voiceNav.group];
    var picks = (voiceNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !picks.length) { return; }
    wcConfirm("删除语音", "删除已选 " + picks.length + " 条语音？音频一并删除。", function () {
      var k;
      for (k = 0; k < picks.length; k++) {
        var it = g.items[picks[k]];
        if (it && it.audioKey) { soundDelete(it.audioKey); }
      }
      for (k = 0; k < picks.length; k++) { g.items.splice(picks[k], 1); }
      voiceNav.selPicks = [];
      voiceSave();
      renderVoiceGroup();
      wcToast("已删除 " + picks.length + " 条");
    });
  }
  function voiceBlockPicked() {
    var g = voiceGroups()[voiceNav.group];
    var picks = (voiceNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !picks.length) { return; }
    var k, arr = [];
    for (k = 0; k < picks.length; k++) {
      var it = g.items[picks[k]];
      if (it) { arr.push(it); }
    }
    for (k = 0; k < picks.length; k++) { g.items.splice(picks[k], 1); }
    g.blocked = g.blocked || [];
    Array.prototype.push.apply(g.blocked, arr);
    voiceNav.selPicks = [];
    voiceSave();
    renderVoiceGroup();
    wcToast("已屏蔽 " + arr.length + " 条");
  }
  function voiceUnblockAll() {
    var g = voiceGroups()[voiceNav.group];
    if (!g || !(g.blocked && g.blocked.length)) { return; }
    var n = g.blocked.length;
    g.items = (g.items || []).concat(g.blocked);
    g.blocked = [];
    voiceSave();
    renderVoiceGroup();
    wcToast("已恢复 " + n + " 条");
  }
  function voiceMovePicked() {
    var gs = voiceGroups();
    var picks = (voiceNav.selPicks || []).slice();
    var cur = voiceNav.group;
    if (!picks.length) { return; }
    var items = [], i;
    for (i = 0; i < picks.length; i++) { if (gs[cur] && gs[cur].items[picks[i]]) { items.push(gs[cur].items[picks[i]]); } }
    if (!items.length) { return; }
    var targets = [];
    for (i = 0; i < gs.length; i++) {
      if (i !== cur) { targets.push({ lib: "voice", gi: i, label: gs[i].name, n: (gs[i].items || []).length }); }
    }
    if (!targets.length) { wcToast("没有其他分组可转移"); return; }
    wcGroupPick("转移到…", "选择目标分组，将已选 " + items.length + " 条语音转移过去", targets, function (res) {
      var gi = res.gi;
      if (gi == null || gi === cur || gi < 0 || gi >= gs.length) { return; }
      picks.slice().sort(function (a, b) { return b - a; }).forEach(function (idx) {
        gs[cur].items.splice(idx, 1);
      });
      Array.prototype.push.apply(gs[gi].items, items);
      voiceNav.selPicks = [];
      voiceSave();
      renderVoiceGroup();
      wcToast("已转移 " + items.length + " 条");
    });
  }
  function voicePlayItem(i, btnEl) {
    if (voiceNav.sel) { return; }
    var g = voiceGroups()[voiceNav.group];
    if (!g || !g.items[i]) { return; }
    var it = g.items[i];
    if (voiceAudio && voiceAudioBtn === btnEl) { voiceStopPlay(); return; }
    soundGet(it.audioKey).then(function (dataUrl) {
      if (dataUrl) { voicePlaySrc(dataUrl, it.dur, btnEl, null); }
      else { wcToast("音频缺失，无法播放"); }
    });
  }
  function voiceDoSearch(q) {
    q = String(q || "").trim().toLowerCase();
    var wrap = document.getElementById("voiceSearchWrap");
    var res = document.getElementById("voiceSearchResults");
    var list = document.getElementById("voiceGroups");
    if (!wrap || !res || !list) { return; }
    if (!q) {
      res.hidden = true; res.innerHTML = "";
      list.hidden = false;
      return;
    }
    list.hidden = true;
    res.hidden = false;
    var gs = voiceGroups(), html = "", hit = 0, gi, j;
    for (gi = 0; gi < gs.length; gi++) {
      var g = gs[gi], gHit = false;
      if (String(g.name || "").toLowerCase().indexOf(q) >= 0) { gHit = true; hit++; }
      var its = (g.items || []).filter(function (it) { return String((it && it.name) || "").toLowerCase().indexOf(q) >= 0; });
      if (its.length) {
        gHit = true;
        for (j = 0; j < its.length; j++) {
          hit++;
          html += '<div class="group-item-wrapper"><div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + gi + ')">' +
                    '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                    '<span class="discover-info"><span class="discover-title lib-row-name">' + esc(g.name) + " / " + esc(its[j].name) + '</span><span class="discover-desc">' + fmtVoiceDur(its[j].dur || 0) + " · 点进播放</span></span>" +
                    '<span class="discover-arrow">›</span></div></div>';
        }
      }
      if (gHit && !its.length) {
        html += '<div class="group-item-wrapper"><div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.openVoiceGroup(' + gi + ')">' +
                  '<span class="discover-icon">' + WC_ICO_VOICE + "</span>" +
                  '<span class="discover-info"><span class="discover-title lib-row-name">' + esc(g.name) + '</span><span class="discover-desc">' + (g.items || []).length + " 条 · 点进查看</span></span>" +
                  '<span class="discover-arrow">›</span></div></div>';
      }
    }
    res.innerHTML = hit ? html : '<p class="grp-empty">没有找到「' + esc(q) + '」相关语音</p>';
  }
  function voiceToggleSearch() {
    var wrap = document.getElementById("voiceSearchWrap");
    var inp = document.getElementById("voiceSearchInput");
    var list = document.getElementById("voiceGroups");
    var res = document.getElementById("voiceSearchResults");
    if (!wrap || !inp) { return; }
    var open = !wrap.hidden;
    wrap.hidden = !open;
    if (!open) { inp.focus(); } else { inp.value = ""; voiceDoSearch(""); }
    if (list) { list.hidden = false; }
    if (res) { res.hidden = true; res.innerHTML = ""; }
  }
  function voiceClearSearch() {
    var inp = document.getElementById("voiceSearchInput");
    if (inp) { inp.value = ""; }
    voiceDoSearch("");
  }

  /* ---------- 聊天混入兜底：音频缺失时发一条基础字卡 ---------- */
  function sendFallbackText(partnerId) {
    var mains = mainItems();
    if (!mains.length) { return; }
    var base = String(textOf(pick(mains)) || "");
    if (!base) { return; }
    pushOther(partnerId, { msgType: "text", text: base });
  }

  /* ---------- 分组列表页（菜单栏 + 分组） ---------- */
  /* =====================================================================
     · 菜单栏只留图标（title/aria-label 提供文字提示）
     · 分组条目：图标 + 标题 + 描述 + 图标按钮（重命名 / 删除）+ 分隔线
     · 导入：兼容雪晶原生备份，以及拾心界常见的多种 JSON 结构
     ===================================================================== */
  var WC_ICO_ADD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.4v13.2M5.4 12h13.2"/></svg>';
  var WC_ICO_IMPORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.6v10.2M8.2 10.4 12 14.2l3.8-3.8M4.8 17.4v1.8a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-1.8"/></svg>';
  var WC_ICO_EXPORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.4V4.2M8.2 7.8 12 4l3.8 3.8M4.8 17.4v1.8a1.6 1.6 0 0 0 1.6 1.6h11.2a1.6 1.6 0 0 0 1.6-1.6v-1.8"/></svg>';
  var WC_ICO_DEDUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4.6 7.2h14.8M4.6 12h14.8M4.6 16.8h9.2"/></svg>';
  var WC_ICO_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.2"/><path d="M15.6 15.6 20 20"/></svg>';
  var WC_ICO_CLEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4"/></svg>';
  var WC_ICO_PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 19.4h3.2L18.4 8.8a1.6 1.6 0 0 0 0-2.3l-1-1a1.6 1.6 0 0 0-2.3 0L4.6 16.2v3.2z"/><path d="M13.8 7.2 16.8 10.2"/></svg>';
  var WC_ICO_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 7.4h13.2M9.2 7.4V5.6h5.6v1.8M7 7.4l.8 11.2a1.4 1.4 0 0 0 1.4 1.3h5.6a1.4 1.4 0 0 0 1.4-1.3L17 7.4"/></svg>';
  /* 分组条目用到的槽位图标（与菜单栏图标不冲突） */
  var WC_ICO_GRP_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 6.6a1.6 1.6 0 0 1 1.6-1.6h3.2l1.6 2h6.8a1.6 1.6 0 0 1 1.6 1.6v7.2a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6z"/></svg>';
  var WC_ICO_SELECT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="m8.2 12 2.6 2.6 5-5"/></svg>';
  /* v64：恢复内置内容图标（箭头回转） */
  var WC_ICO_RESTORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.6 8.4a8.2 8.2 0 1 1 1.6 8.9"/><path d="M5.6 3.8v4.8h4.8"/></svg>';
  /* v70：表情包链接导入图标 / 屏蔽（眼睛+斜线）/ 恢复屏蔽（眼睛） */
  var WC_ICO_URL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14.2 14.2 10"/><path d="M8.4 12.4l-2.1 2.1a3.2 3.2 0 0 0 4.5 4.5l2.1-2.1"/><path d="M15.6 11.6l2.1-2.1a3.2 3.2 0 0 0-4.5-4.5l-2.1 2.1"/></svg>';
  var WC_ICO_BLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.8 4.8l14.4 14.4"/><path d="M10.6 6.2A10 10 0 0 1 12 6c4.9 0 8.4 4.2 10 6-.7 1-1.6 2.1-2.7 3"/><path d="M6.7 8.5A12 12 0 0 0 2 12c1.6 1.8 5.1 6 10 6 1.2 0 2.3-.2 3.4-.5"/><path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/></svg>';
  var WC_ICO_UNBLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/></svg>';
  /* v88：转移到其他分组图标（选中模式勾选内容后一键转组） */
  var WC_ICO_MOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 12h13.2"/><path d="M14.6 8.2 18.4 12l-3.8 3.8"/><path d="M9 5.4 5.4 9l3.6 3.6"/></svg>';
  /* v91：语音字卡图标（麦克风）/ 全选图标 */
  var WC_ICO_VOICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9.2" y="4" width="5.6" height="9.6" rx="2.8"/><path d="M6.6 11.2a5.4 5.4 0 0 0 10.8 0"/><path d="M12 16.6v3.4"/></svg>';
  var WC_ICO_ALL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.6" y="5.6" width="12.8" height="12.8" rx="2"/><path d="m8.8 12 2.4 2.4 4-4"/></svg>';

/* ---------- 通用 JSON 导入（ ---------- */
  var WC_IMPORT_FIELDS = [
    { field: "quotes", lib: "quote", name: "导入 · 文案" },
    { field: "dailyQuotes", lib: "quote", name: "导入 · 每日文案" },
    { field: "texts", lib: "quote", name: "导入 · 文案" },
    { field: "cards", lib: "main", name: "导入 · 字卡" },
    { field: "kaomojis", lib: "kao", name: "导入 · 颜文字" },
    { field: "kaomoji", lib: "kao", name: "导入 · 颜文字" },
    { field: "emojis", lib: "emoji", name: "导入 · Emoji" },
    { field: "emoticons", lib: "emoji", name: "导入 · Emoji" },
    { field: "pats", lib: "pat", name: "导入 · 拍一拍" },
    { field: "stickers", lib: "sticker", name: "导入 · 表情包" }
  ];
  /* 拾心界等第三方备份里的 type 字段 → 本应用字卡库 */
  var WC_TYPE_LIB = { quotes: "quote", quote: "quote", texts: "quote", dailyquotes: "quote",
    cards: "main", card: "main",
    kaomojis: "kao", kaomoji: "kao", emojis: "emoji", emoji: "emoji", emoticons: "emoji",
    stickers: "sticker", sticker: "sticker", pats: "pat", pat: "pat" };
  function wcPickText(it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return it; }
    if (typeof it === "number") { return String(it); }
    if (typeof it === "object") {
      var keys = ["text", "content", "quote", "t", "title", "name", "value", "message", "reply", "word", "str", "label"], i, v;
      for (i = 0; i < keys.length; i++) {
        v = it[keys[i]];
        if (v !== undefined && v !== null && String(v) !== "" && typeof v !== "object") { return String(v); }
      }
    }
    return "";
  }
  /* v70：表情包条目规范化 —— 支持字符串（dataURL / http(s) 链接 → 图片型；纯文本 → 文本型）与对象（取 img/url/src 等字段） */
  function normStickerItem(it) {
    if (it == null) { return null; }
    if (typeof it === "string") {
      var s = String(it).replace(/^\s+|\s+$/g, "");
      if (!s) { return null; }
      /* v70.2：链接必须以图片协议开头（data:image / http(s) / 协议相对），协议相对自动补 https
         v71：mediaKey（m_xxx）为 IndexedDB 媒体库引用，原样保留 */
      if (/^(data:image\/|https?:\/\/|\/\/)/i.test(s)) { return { k: "🖼", t: "表情包", img: s.replace(/^\/\//, "https://") }; }
      if (isMediaKey(s)) { return { k: "🖼", t: "表情包", img: s }; }
      return { k: "📄", t: s };
    }
    if (typeof it === "object") {
      var img = it.img || it.url || it.src || it.data || it.base64 || null;
      if (img && (/^(data:image\/|https?:\/\/|\/\/)/i.test(String(img)) || isMediaKey(String(img)))) { return { k: it.k || "🖼", t: it.t || it.name || it.title || "表情包", img: String(img).replace(/^\/\//, "https://") }; }
      return { k: it.k || "📄", t: it.t || it.name || it.title || String(it.text || it.content || "") || "表情包" };
    }
    return null;
  }
  function wcNormItems(lib, arr) {
    var out = [], i, txt;
    for (i = 0; i < (arr || []).length; i++) {
      if (lib === "sticker") { if (arr[i]) { out.push(arr[i]); } continue; }
      txt = wcPickText(arr[i]);
      if (String(txt).replace(/^\s+|\s+$/g, "") !== "") { out.push(String(txt)); }
    }
    return out;
  }
  function wcParseImport(text, curLib) {
    var data = null, byLib = {}, prim, i, k, gi, gs, keys;
    prim = (curLib && LIB_META[curLib]) ? curLib : "quote";
    try { data = JSON.parse(String(text)); } catch (e) { data = null; }
    if (data === null || data === undefined) { return { lib: prim, groups: [], byLib: {} }; }

    function push(lib, name, items) {
      if (!LIB_META[lib]) { lib = prim; }
      items = wcNormItems(lib, items);
      if (!items.length) { return; }
      /* v73：sticker 库条目统一规范化 —— 把 {data/url/src/base64} 等备份字段映射为 img，
         避免原样保留 {data,...} 导致渲染空白、迁移失效、localStorage 超限 */
      if (lib === "sticker") {
        var _ni2 = [], _nj2, _nit;
        for (_nj2 = 0; _nj2 < items.length; _nj2++) {
          _nit = normStickerItem(items[_nj2]);
          if (_nit) { _ni2.push(_nit); }
        }
        items = _ni2;
        if (!items.length) { return; }
      }
      if (!byLib[lib]) { byLib[lib] = []; }
      byLib[lib].push({ name: String(name || ("导入 · " + ((LIB_META[lib] && LIB_META[lib].title) || "内容"))), items: items });
    }
    function pickArr(v) {
      var r = [], kk;
      if (Array.isArray(v)) { return v; }
      if (v && typeof v === "object") {
        for (kk in v) {
          if (!Object.prototype.hasOwnProperty.call(v, kk)) { continue; }
          r = r.concat(Array.isArray(v[kk]) ? v[kk] : [v[kk]]);
        }
        return r;
      }
      if (typeof v === "string" && v !== "") { return [v]; }
      return [];
    }

    /* ① 雪晶原生：{ lib, groups: [ {name, items} ] }（也吃 {groups:{名: items}}） */
    if (data.groups) {
      gs = data.groups;
      var sl = (data.lib && LIB_META[data.lib]) ? data.lib : (WC_TYPE_LIB[String(data.type || "").toLowerCase()] || prim);
      if (Array.isArray(gs)) {
        for (gi = 0; gi < gs.length; gi++) { push(sl, gs[gi] && gs[gi].name, (gs[gi] && gs[gi].items) || []); }
      } else if (typeof gs === "object") {
        for (k in gs) { if (Object.prototype.hasOwnProperty.call(gs, k)) { push(sl, k, pickArr(gs[k])); } }
      }
    }
    /* ② 单分组：{ name, items } */
    if (data.items && !data.groups) { push(prim, data.name, pickArr(data.items)); }
    /* ③ 纯数组 */
    if (Array.isArray(data)) { push(prim, "导入内容", data); }
    /* ④ 拾心界等常见字段名 */
    for (i = 0; i < WC_IMPORT_FIELDS.length; i++) {
      k = WC_IMPORT_FIELDS[i].field;
      if (data[k] === undefined || data[k] === null) { continue; }
      if (k === "cards" && data.groups) { continue; }
      push(WC_IMPORT_FIELDS[i].lib, WC_IMPORT_FIELDS[i].name, pickArr(data[k]));
    }
    /* ⑤ 关键词回复字典：{ 关键词: [回复…] }。
       v61.1：customReplies 在第三方字卡备份中是「字卡分组字典」，归入字卡(main)；
       replies / patReplies 仍是拍一拍关键词回复，保留 pat。 */
    var cr = data.customReplies || null;
    if (cr && typeof cr === "object" && !Array.isArray(cr)) {
      for (k in cr) { if (Object.prototype.hasOwnProperty.call(cr, k)) { push("main", k, pickArr(cr[k])); } }
    }
    var crPat = data.replies || data.patReplies || null;
    if (crPat && typeof crPat === "object" && !Array.isArray(crPat)) {
      for (k in crPat) { if (Object.prototype.hasOwnProperty.call(crPat, k)) { push("pat", k, pickArr(crPat[k])); } }
    }
    /* ⑥ mochi 等导出：{ data: {...} } / { data: [...] } */
    if (data.data && typeof data.data === "object") {
      if (Array.isArray(data.data)) { push(prim, "导入内容", data.data); }
      else {
        keys = [];
        for (k in data.data) { if (Object.prototype.hasOwnProperty.call(data.data, k)) { keys.push(k); } }
        for (i = 0; i < keys.length; i++) { push(prim, keys[i], pickArr(data.data[keys[i]])); }
      }
    }
    /* ⑦ mochi 等分组字典：{kaomoji:[[组名,[条目…]],…], emoji:[[…]], poke:[[…]]} */
    var pairKeys = [["kaomoji", "kao"], ["kaomojis", "kao"], ["emoji", "emoji"], ["emojis", "emoji"],
                    ["poke", "pat"], ["pats", "pat"]];
    var pi, pv, gn;
    for (pi = 0; pi < pairKeys.length; pi++) {
      pv = data[pairKeys[pi][0]];
      if (!Array.isArray(pv) || !pv.length || !Array.isArray(pv[0])) { continue; }
      for (gi = 0; gi < pv.length; gi++) {
        if (!Array.isArray(pv[gi])) { continue; }
        gn = (typeof pv[gi][0] === "string" && String(pv[gi][0]).replace(/^\s+|\s+$/g, "")) ? String(pv[gi][0]) : "未分类";
        push(pairKeys[pi][1], gn, Array.isArray(pv[gi][1]) ? pv[gi][1] : [pv[gi][1]]);
      }
    }
    /* ⑧ 字卡分组结构：[{name, items|texts:[{text}]}]；数组形式的 customReplies
       既可能是「分组对象」，也可能是「平铺条目」（如 [{text:"…"},{text:"…"}]），两种都吃下。
       v61.1：此类结构是第三方字卡备份的「字卡分组」，统一归入字卡(main)，不再误入拍一拍(pat)。 */
    var crg = data.customReplyGroups || (Array.isArray(data.customReplies) ? data.customReplies : null);
    if (Array.isArray(crg)) {
      for (gi = 0; gi < crg.length; gi++) {
        var cit = crg[gi], cin = null;
        if (!cit || typeof cit !== "object") {
          if (typeof cit === "string" && cit.replace(/^\s+|\s+$/g, "") !== "") { push("main", "导入 · 字卡", [cit]); }
          continue;
        }
        cin = cit.items || cit.texts || cit.replies || cit.list || null;
        if (Array.isArray(cin)) { push("main", cit.name, cin); }
        else { push("main", cit.name || "导入 · 字卡", [cit]); }
      }
    }
    /* ⑨ v61：常见第三方字卡备份的「库字段」——
       kaomojiLibrary / emojiLibrary / customEmojis / customPokes / customStatuses /
       customMottos / customIntros / moyuActivities 及其 *Groups 变体。
       既支持 [{name, items:[…]}] 分组数组，也支持 {组名: [条目…]} 字典与纯条目数组。 */
    var WC_LIB_FIELDS = [
      ["kaomojiLibrary", "kao"], ["kaomojiGroups", "kao"], ["kaomojisLibrary", "kao"],
      ["emojiLibrary", "emoji"], ["emojisLibrary", "emoji"], ["customEmojis", "emoji"], ["customEmojiGroups", "emoji"],
      ["customPokes", "pat"], ["customPokeGroups", "pat"], ["pokeLibrary", "pat"],
      ["customMottos", "quote"], ["customMottosGroups", "quote"], ["mottoLibrary", "quote"],
      ["customIntros", "quote"], ["customIntrosGroups", "quote"], ["introLibrary", "quote"],
      ["moyuActivities", "quote"], ["moyuActivityGroups", "quote"],
      /* v61.1：字卡(main)库字段映射补齐 —— customReplyGroups / customReplies
         已由 ⑧ 步专门处理，此处不重复列出，避免同一条内容被导入两次 */
      ["wordCards", "main"], ["wordCardGroups", "main"], ["cardGroups", "main"],
      ["customCards", "main"], ["customCardGroups", "main"], ["cardLibrary", "main"]
    ];
    var lfi, lfkey, lflib, lfv, lfkk;
    for (lfi = 0; lfi < WC_LIB_FIELDS.length; lfi++) {
      lfkey = WC_LIB_FIELDS[lfi][0];
      lflib = WC_LIB_FIELDS[lfi][1];
      lfv = data[lfkey];
      if (lfv === undefined || lfv === null) { continue; }
      if (Array.isArray(lfv)) {
        for (gi = 0; gi < lfv.length; gi++) {
          var lfe = lfv[gi];
          if (lfe && typeof lfe === "object" && !Array.isArray(lfe) && (lfe.items || lfe.list || lfe.texts || lfe.replies)) {
            push(lflib, lfe.name, lfe.items || lfe.list || lfe.texts || lfe.replies);
          } else {
            push(lflib, "导入 · " + ((LIB_META[lflib] && LIB_META[lflib].title) || "内容"), [lfe]);
          }
        }
      } else if (typeof lfv === "object") {
        for (lfkk in lfv) {
          if (!Object.prototype.hasOwnProperty.call(lfv, lfkk)) { continue; }
          push(lflib, lfkk, pickArr(lfv[lfkk]));
        }
      }
    }
    var groups = byLib[prim] || [];
    if (!groups.length) {
      for (k in byLib) { if (Object.prototype.hasOwnProperty.call(byLib, k)) { groups = groups.concat(byLib[k]); } }
    }
    return { lib: prim, groups: groups, byLib: byLib };
  }
/* 分组列表里按索引重命名 / 删除（ */
  function libRenameGroupAt(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    libRenameGroup();
  }
  function libDeleteGroupAt(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    libDeleteGroup();
  }

  function libToolbarHtml(k) {
    var m = libMeta(k), html = "";
/* v60：菜单栏只显示图标（，文字放进 title / aria-label */
    html += '<button class="wc-tool wc-tool--main is-ico" type="button" onclick="SnowCrystal.libAddGroup()" title="新建分组" aria-label="新建分组">' + WC_ICO_ADD + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libImport()" title="导入 JSON" aria-label="导入 JSON">' + WC_ICO_IMPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libExport()" title="导出 JSON" aria-label="导出 JSON">' + WC_ICO_EXPORT + "</button>";
    html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libDedup()" title="分组去重" aria-label="分组去重">' + WC_ICO_DEDUP + "</button>";
    if (m.search) { html += '<button class="wc-tool is-ico" type="button" onclick="SnowCrystal.libSearch()" title="搜索" aria-label="搜索">' + WC_ICO_SEARCH + "</button>"; }
    return html;
  }
  function libGroupsHtml(k) {
    var groups = wcl[k] || [], html = "", i, n;
    if (!groups.length) { return '<p class="grp-empty">还没有分组，点上方「＋」新建分组</p>'; }
/* v60：分组条目
       容器沿用页面级 row-list（等同拾心界的 discover-list 整组玻璃卡），此处不再嵌套内层卡，避免双层底 */
    for (i = 0; i < groups.length; i++) {
      n = (groups[i].items || []).length;
      html += '<div class="group-item-wrapper">' +
                '<div class="discover-item" role="button" tabindex="0" onclick="SnowCrystal.libOpenGroup(' + i + ')">' +
                  '<span class="discover-icon">' + WC_ICO_GRP_OPEN + "</span>" +
                  '<span class="discover-info">' +
                    '<span class="discover-title lib-row-name">' + esc(groups[i].name) + "</span>" +
                    '<span class="discover-desc">' + n + " 条 · 点进查看</span>" +
                  "</span>" +
                  '<span class="discover-arrow">›</span>' +
                  '<span class="group-item-actions">' +
                    '<button type="button" title="重命名" aria-label="重命名分组" onclick="event.stopPropagation();SnowCrystal.libRenameGroupAt(' + i + ')">' + WC_ICO_PEN + "</button>" +
                    '<button class="is-danger" type="button" title="删除" aria-label="删除分组" onclick="event.stopPropagation();SnowCrystal.libDeleteGroupAt(' + i + ')">' + WC_ICO_TRASH + "</button>" +
                  "</span>" +
                "</div>" +
                (i < groups.length - 1 ? '<div class="list-divider" aria-hidden="true"></div>' : "") +
              "</div>";
    }
    return html;
  }
  function renderLib() {
    loadWcl();
    var k = wclNav.lib;
    if (!k) { return; }
    var m = libMeta(k);
    var tEl = document.getElementById("libTitle");
    if (tEl) { tEl.textContent = m.title; }
    var tools = document.getElementById("libTools");
    if (tools) { tools.innerHTML = libToolbarHtml(k); }
    var wrap = document.getElementById("libSearchWrap");
    if (wrap) { wrap.hidden = true; }
    var res = document.getElementById("libSearchResults");
    if (res) { res.hidden = true; res.innerHTML = ""; }
    var list = document.getElementById("libGroups");
    if (list) { list.hidden = false; list.innerHTML = libGroupsHtml(k); }
    var foot = document.getElementById("libFoot");
    if (foot) { foot.textContent = "共 " + (wcl[k] || []).length + " 组 · 数据存在本机"; }
    renderWclEntry();
  }

  /* ---------- 分组内容页 ---------- */
  function grpBodyHtml(k, g) {
    var items = (g && g.items) || [], i, html = "", it;
    if (!items.length) { return '<p class="grp-empty">这一组还没有内容，点上方「＋」添加' + libMeta(k).noun + '</p>'; }
    /* v70：选择模式泛化 —— 所有字卡库统一支持勾选多选（selPicks 记录已选索引），
       选择模式下不渲染单条编辑/删除按钮，避免误触 */
    var sel = !!wclNav.sel;
    var picks = wclNav.selPicks || [];
    function pickCls(i) {
      return sel ? (picks.indexOf(i) >= 0 ? " is-selecting is-picked" : " is-selecting") : "";
    }
    if (k === "main") {
      html = '<div class="wc-grid is-card-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-card-text">' + esc(items[i]) + "</span>" +
                  (sel ? "" : '<button class="wc-edit" type="button" data-edit="1" title="编辑" aria-label="编辑">' + WC_ICO_PEN + "</button>" +
                  '<button class="wc-del" type="button" data-del="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>") +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "kao") {
      html = '<div class="wc-chip-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        html += '<div class="wc-chip' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-chip-text">' + esc(items[i]) + "</span>" +
                  (sel ? "" : '<button class="wc-del" type="button" data-del="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>") +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "emoji") {
      /* v62：Emoji 一排 8 个自适应；v70 起并入通用选择模式（wclNav.sel / selPicks） */
      html = '<div class="wc-chip-grid is-emoji-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        var picked = sel && picks.indexOf(i) >= 0;
        html += '<div class="wc-chip is-emoji' + (sel ? " is-selecting" : "") + (picked ? " is-picked" : "") + '" role="button" tabindex="0" data-copy="' + esc(items[i]) + '">' +
                  '<span class="wc-chip-text">' + esc(items[i]) + "</span>" +
                "</div>";
      }
      return html + "</div>";
    }
    if (k === "sticker") {
      /* v72：追加 is-sticker-grid 标记，由最后加载层 CSS 按 5 列正方形网格排版（对齐拾心界） */
      html = '<div class="wc-grid is-sticker-grid' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
      for (i = 0; i < items.length; i++) {
        it = items[i];
        /* v70：兼容纯字符串条目（JSON 导入或老数据），链接/data 字符串渲染为图片卡 */
        if (typeof it === "string") {
          var strIt = normStickerItem(it);
          if (strIt && strIt.img) {
            /* v70.2：外链/坏图加载失败时隐藏 img，显示名称兜底，避免破图图标 */
            html += '<div class="wc-card wc-card--pic' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(strIt.t) + '">' +
                      stickerImgHtml(strIt.img, strIt.t) +
                      '<span class="wc-img-fallback">图片加载失败</span>' +
                    "</div>";
          } else {
            html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(strIt ? strIt.t : it) + '">' +
                      '<span class="wc-sticker-emoji">' + esc(strIt ? strIt.k : "") + "</span>" +
                      '<span class="wc-card-text">' + esc(strIt ? strIt.t : it) + "</span>" +
                    "</div>";
          }
          continue;
        }
        it = it || {};
        if (it.img || it.data) {
          html += '<div class="wc-card wc-card--pic' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(it.t || "表情包") + '">' +
                    stickerImgHtml(it.img || it.data, it.t || it.k || "表情包") +
                    '<span class="wc-img-fallback">图片加载失败</span>' +
                  "</div>";
        } else {
          html += '<div class="wc-card' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(it.t || it.k || "") + '">' +
                    '<span class="wc-sticker-emoji">' + esc(it.k || "") + "</span>" +
                    '<span class="wc-card-text">' + esc(it.t || "") + "</span>" +
                  "</div>";
        }
      }
      return html + "</div>";
    }
    html = '<div class="wc-list' + (sel ? " is-selecting" : "") + '" id="grpItems" data-sel="' + (sel ? "1" : "") + '">';
    for (i = 0; i < items.length; i++) {
      html += '<div class="wc-row' + pickCls(i) + '" role="button" tabindex="0" data-copy="' + esc(items[i]) + '">' +
                '<span class="wc-row-main">' + esc(items[i]) + "</span>" +
                (sel ? "" : '<button class="wc-edit" type="button" data-edit="1" title="编辑" aria-label="编辑">' + WC_ICO_PEN + "</button>" +
                '<button class="wc-del" type="button" data-del="1" title="删除" aria-label="删除">' + WC_ICO_TRASH + "</button>") +
              "</div>";
    }
    return html + "</div>";
  }
  function grpToolbarHtml(k) {
/* v60：分组内容页菜单栏同步纯图标化（ */
    var m = libMeta(k), html = "";
    /* v70：sticker 分组内容页三入口 —— 上传图片 / 粘贴链接 / 导入 JSON */
    if (k === "sticker") {
      html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="上传图片" aria-label="上传图片" onclick="SnowCrystal.libUpload()">' + WC_ICO_ADD + "</button>";
      html += '<button class="wc-tool is-ico" type="button" title="粘贴图片链接导入" aria-label="粘贴图片链接导入" onclick="SnowCrystal.libAddStickerUrl()">' + WC_ICO_URL + "</button>";
      html += '<button class="wc-tool is-ico" type="button" title="导入表情包 JSON" aria-label="导入表情包 JSON" onclick="SnowCrystal.libImportStickerJson()">' + WC_ICO_IMPORT + "</button>";
    } else {
      html += '<button class="wc-tool wc-tool--main is-ico" type="button" title="添加' + m.noun + '" aria-label="添加' + m.noun + '" onclick="SnowCrystal.libAddItem()">' + WC_ICO_ADD + "</button>";
    }
    html += '<button class="wc-tool is-ico" type="button" title="重命名" aria-label="重命名分组" onclick="SnowCrystal.libRenameGroup()">' + WC_ICO_PEN + "</button>";
    if (k === "sticker") {
      html += '<button class="wc-tool is-ico is-danger" type="button" title="清空本组" aria-label="清空本组" onclick="SnowCrystal.libClearUpload()">' + WC_ICO_CLEAR + "</button>";
    }
    /* v70：选择模式泛化 —— 所有字卡库进入选择模式后可批量转移 / 删除 / 屏蔽 */
    var sel = !!wclNav.sel;
    if (sel) {
      var picks = wclNav.selPicks || [];
      /* v102：选择模式「全显」——一键全选当前分组全部条目（仿 voiceSelAll） */
      html += '<button class="wc-tool is-ico" data-act="selall" type="button" title="全显：全选当前分组全部条目" aria-label="全显：全选当前分组全部条目" onclick="SnowCrystal.libSelAll()">' + WC_ICO_ALL + "</button>";
      html += '<button class="wc-tool is-ico" data-act="move" type="button" title="转移已选 ' + picks.length + ' 条到其他分组" aria-label="转移已选到其他分组" onclick="SnowCrystal.libMovePicked()">' + WC_ICO_MOVE + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="del" type="button" title="删除已选 ' + picks.length + ' 条" aria-label="批量删除已选" onclick="SnowCrystal.libDeletePicked()">' + WC_ICO_TRASH + "</button>";
      html += '<button class="wc-tool is-ico is-danger" data-act="block" type="button" title="屏蔽已选 ' + picks.length + ' 条" aria-label="屏蔽已选" onclick="SnowCrystal.libBlockPicked()">' + WC_ICO_BLOCK + "</button>";
    }
    html += '<button class="wc-tool is-ico' + (sel ? " is-on" : "") + '" type="button" title="' + (sel ? "完成：退出选择模式" : "选择：进入选择模式，勾选后可转移 / 批量删除或屏蔽") + '" aria-label="' + (sel ? "完成选择" : "选择模式") + '" onclick="SnowCrystal.libToggleSel()">' + WC_ICO_SELECT + "</button>";
    /* v70：分组有被屏蔽条目时提供「恢复已屏蔽」入口 */
    var curG = (wcl[k] || [])[wclNav.group];
    if (curG && curG.blocked && curG.blocked.length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复已屏蔽 ' + curG.blocked.length + ' 条" aria-label="恢复已屏蔽" onclick="SnowCrystal.libRestoreBlocked()">' + WC_ICO_UNBLOCK + "</button>";
    }
    /* v64：有内置默认内容的模块提供「恢复」——还原本组被删除的内置条目 */
    if (WCL_DEFAULT[k] && WCL_DEFAULT[k].length) {
      html += '<button class="wc-tool is-ico" type="button" title="恢复本组内置内容（删除的内置条目可一键还原）" aria-label="恢复内置内容" onclick="SnowCrystal.libRestoreBuiltin()">' + WC_ICO_RESTORE + "</button>";
    }
    return html;
  }
  function renderGroup() {
    loadWcl();
    var k = wclNav.lib;
    if (!k) { return; }
    var groups = wcl[k] || [];
    if (!groups.length) { renderLib(); SnowCrystal.switchPage("wc-lib"); return; }
    if (wclNav.group < 0 || wclNav.group >= groups.length) { wclNav.group = 0; }
    var g = groups[wclNav.group], m = libMeta(k);
    var tEl = document.getElementById("grpTitle");
    if (tEl) { tEl.textContent = g.name; }
    var tools = document.getElementById("grpTools");
    if (tools) { tools.innerHTML = grpToolbarHtml(k); }
    var body = document.getElementById("grpBody");
    if (body) { body.innerHTML = grpBodyHtml(k, g); }
    /* v71：sticker 卡里 mediaKey 引用的图片异步从 IDB 取回 */
    if (k === "sticker" && body) { stickerBindMedia(body); }
    var foot = document.getElementById("grpFoot");
    if (foot) {
      /* v70：文案按选择模式 / 库类型泛化（v88：补充转移说明） */
      if (wclNav.sel) {
        foot.textContent = "选择模式：点条目勾选/取消（可多选）· 可转移 / 批量删除或屏蔽 · 点「完成」退出";
      } else if (k === "sticker") {
        foot.textContent = "点表情包复制名称 · 支持上传图片 / 粘贴链接 / 导入 JSON";
      } else if (k === "emoji") {
        foot.textContent = "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 回转箭头可恢复内置内容 · 数据存在本机";
      } else {
        foot.textContent = (WCL_DEFAULT[k] && WCL_DEFAULT[k].length
          ? "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 回转箭头可恢复内置内容 · 数据存在本机"
          : "点一下即复制 · 点「选择」进入多选转移/删除/屏蔽模式 · 数据存在本机");
      }
    }
  }
  function grpItemText(k, it) {
    if (k === "sticker") { return String((it && (it.t || it.k)) || "表情包"); }
    return String(it == null ? "" : it);
  }
  /* v64：内置内容辅助 —— 判断模块是否有内置默认清单 / 取当前分组的内置清单 / 值是否内置 */
  function builtinListOf(k, groupName) {
    var defs = WCL_DEFAULT[k];
    if (!defs || !defs.length) { return null; }
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].name === groupName) { return (defs[i].items || []).slice(); }
    }
    return null;
  }
  function isBuiltinValue(k, groupName, v) {
    var blist = builtinListOf(k, groupName);
    if (!blist) { return false; }
    for (var i = 0; i < blist.length; i++) { if (String(blist[i]) === String(v)) { return true; } }
    return false;
  }
  function grpItemIndex(el) {
    var host = document.getElementById("grpBody");
    /* v61.1：点击「×」删除时传入的是删除按钮节点（自身无 data-copy），
       需先向上找到所属卡片/条目节点，否则索引恒为 -1，导致删除无响应 */
    var node = closestData(el, "data-copy", host) || el;
    var nodes = host ? host.querySelectorAll("[data-copy]") : [];
    for (var i = 0; i < nodes.length; i++) { if (nodes[i] === node) { return i; } }
    return -1;
  }
  function onGroupBodyClick(e) {
    var t = e.target || e.srcElement;
    var host = document.getElementById("grpBody");
    if (!host || !host.contains(t)) { return; }
    /* v70：通用选择模式 —— 模式内点条目为勾选/取消（多选），不直接删除；
       批量删除 / 屏蔽由工具栏按钮触发 */
    if (wclNav.sel) {
      var sItem = closestData(t, "data-copy", host);
      if (sItem) { togglePick(sItem); }
      return;
    }
    var del = closestData(t, "data-del", host);
    if (del) { removeGrpItem(del); return; }
    var edit = closestData(t, "data-edit", host);
    if (edit) { editGrpItem(edit); return; }
    var item = closestData(t, "data-copy", host);
    if (item) { wcCopy(item.getAttribute("data-copy") || ""); }
  }
  function removeGrpItem(el) {
    var idx = grpItemIndex(el);
    var k = wclNav.lib, g = (wcl[k] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var soft = removeGrpItemAt(k, g, idx);
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast(soft ? "已删除（内置内容，可点「恢复」还原）" : "已删除");
  }
  /* v70：条目唯一键 —— 字符串用自身，对象用「名称 + 图片源」拼接，供屏蔽去重 / 恢复去重判断 */
  function grpItemKey(k, it) {
    if (it == null) { return ""; }
    if (typeof it === "string") { return it; }
    var t = it.t || it.name || it.title || it.k || "";
    var img = it.img || it.url || it.src || it.data || "";
    return t + "|" + img;
  }
  /* v64：单条删除核心 —— 内置条目走软删除（记录到分组 deleted 列表），
     用户自建内容物理删除；返回是否软删除 */
  function removeGrpItemAt(k, g, idx) {
    var v = grpItemText(k, g.items[idx]);
    if (isBuiltinValue(k, g.name, v)) {
      g.items.splice(idx, 1);
      if (!g.deleted) { g.deleted = []; }
      if (g.deleted.indexOf(v) < 0) { g.deleted.push(v); }
      return true;
    }
    /* v71：删除前记下 mediaKey，删除后若无其它条目引用则同步删 IDB */
    var mk = grpItemImgKey(g.items[idx]);
    g.items.splice(idx, 1);
    if (mk) { mediaDeleteIfUnused(mk); }
    return false;
  }
  /* v64→v70：通用选择模式 —— 点条目切换勾选态（多选），更新底部已选计数与工具栏按钮提示 */
  function togglePick(el) {
    var idx = grpItemIndex(el);
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var picks = wclNav.selPicks || (wclNav.selPicks = []);
    var p = picks.indexOf(idx);
    if (p >= 0) { picks.splice(p, 1); } else { picks.push(idx); }
    if (el.classList) { el.classList.toggle("is-picked", p < 0); }
    var foot = document.getElementById("grpFoot");
    if (foot) { foot.textContent = "选择模式：点条目勾选/取消 · 已选 " + picks.length + " 条 · 可转移 / 批量删除或屏蔽"; }
    var tools = document.getElementById("grpTools");
    if (tools) {
      var dbtns = tools.querySelectorAll(".wc-tool[data-act]");
      for (var bi = 0; bi < dbtns.length; bi++) {
        var act = dbtns[bi].getAttribute("data-act");
        dbtns[bi].setAttribute("title", (act === "move" ? "转移已选 " : (act === "del" ? "删除已选 " : "屏蔽已选 ")) + picks.length + " 条" + (act === "move" ? "到其他分组" : ""));
        dbtns[bi].setAttribute("aria-label", dbtns[bi].getAttribute("title"));
      }
    }
  }
  /* v64→v70：批量删除已勾选条目（内置条目软删除，其余物理删除；对所有字卡库生效） */
  function libDeletePicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    var removed = 0, soft = 0, i;
    for (i = 0; i < picks.length; i++) {
      var idx = picks[i];
      if (idx < 0 || idx >= g.items.length) { continue; }
      if (removeGrpItemAt(k, g, idx)) { soft++; }
      removed++;
    }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已删除 " + removed + " 条" + (soft ? "（内置内容可点「恢复」还原）" : ""));
  }
  /* v70：批量屏蔽已勾选条目 —— 条目原值存入分组 blocked 并从 items 移除；
     屏蔽后条目不再显示，点工具栏「恢复已屏蔽」（眼睛图标）可还原 */
  function libBlockPicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice().sort(function (a, b) { return b - a; });
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    if (!g.blocked) { g.blocked = []; }
    var blocked = 0, i, idx, key, b, dup;
    for (i = 0; i < picks.length; i++) {
      idx = picks[i];
      if (idx < 0 || idx >= g.items.length) { continue; }
      var it = g.items[idx];
      key = grpItemKey(k, it);
      dup = false;
      for (b = 0; b < g.blocked.length; b++) { if (grpItemKey(k, g.blocked[b]) === key) { dup = true; break; } }
      if (!dup) { g.blocked.push(it); }
      g.items.splice(idx, 1);
      blocked++;
    }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已屏蔽 " + blocked + " 条，可点「恢复已屏蔽」找回");
  }
  /* v88：条目转库适配 —— 目标为 sticker 时统一规范化为表情包条目（图片型保留图片、文本型转文本卡），
     目标为其他库时取文本（sticker 对象取 t/name/title 等字段），保证跨库转移后条目可正常展示 */
  function fitItemForLib(dstK, it) {
    if (it == null) { return null; }
    if (dstK === "sticker") {
      if (typeof it === "string") { return normStickerItem(it) || it; }
      return it;
    }
    if (typeof it === "string") { return it; }
    if (typeof it === "object") { return String(it.t || it.name || it.title || it.k || ""); }
    return String(it);
  }
  /* v88：选中模式 → 打开转组弹窗，选择目标分组（跨库或同库其他分组，自动排除当前分组） */
  function libMovePicked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    var picks = (wclNav.selPicks || []).slice();
    if (!g || !g.items || !picks.length) { wcToast("还没有勾选条目"); return; }
    var targets = [], li, gi, groups, lk;
    for (li = 0; li < LIB_ORDER.length; li++) {
      lk = LIB_ORDER[li];
      groups = wcl[lk] || [];
      for (gi = 0; gi < groups.length; gi++) {
        if (lk === k && gi === wclNav.group) { continue; }
        targets.push({
          lib: lk,
          gi: gi,
          label: ((LIB_META[lk] && LIB_META[lk].title) || lk) + " · " + groups[gi].name,
          n: (groups[gi].items || []).length
        });
      }
    }
    if (!targets.length) { wcToast("没有可转移的目标分组，请先新建分组"); return; }
    wcGroupPick("转移到…", "已选 " + picks.length + " 条 · 选择目标分组（跨库或同库其他分组）", targets, function (t) {
      movePickedTo(k, g, picks, t.lib, t.gi);
    });
  }
  /* v88：执行转移 —— 勾选条目从源组移动到目标组，刷新视图并同步 localStorage。
     顺序处理：按勾选顺序升序收集到目标组末尾（追加），再降序删除源组条目，保证索引与顺序都正确 */
  function movePickedTo(srcK, srcG, picks, dstK, dstGi) {
    var dstG = (wcl[dstK] || [])[dstGi];
    if (!dstG || !dstG.items) { wcToast("目标分组不存在"); return; }
    var idxs = picks.slice().sort(function (a, b) { return a - b; });
    var moved = 0, i, idx, it, fit, gone = [], mk, appendItems = [], validIdx = [];
    for (i = 0; i < idxs.length; i++) {
      idx = idxs[i];
      if (idx < 0 || idx >= srcG.items.length) { continue; }
      it = srcG.items[idx];
      fit = fitItemForLib(dstK, it);
      if (fit === null || fit === "") { continue; }
      mk = grpItemImgKey(it);
      appendItems.push(fit);
      validIdx.push(idx);
      if (mk && gone.indexOf(mk) < 0) { gone.push(mk); }
      moved++;
    }
    if (!moved) { wcToast("没有可转移的条目"); return; }
    dstG.items = dstG.items.concat(appendItems);
    for (i = validIdx.length - 1; i >= 0; i--) { srcG.items.splice(validIdx[i], 1); }
    /* v88：sticker 图片引用维护 —— 转移后若无任何条目引用该 mediaKey 则同步删 IDB */
    for (i = 0; i < gone.length; i++) { mediaDeleteIfUnused(gone[i]); }
    wclNav.selPicks = [];
    saveWcl();
    renderGroup();
    renderWclEntry();
    wcToast("已转移 " + moved + " 条到「" + dstG.name + "」");
  }
  /* v70：恢复已屏蔽 —— 按 blocked 原值还原到本组（与现有条目重复的跳过），清空屏蔽记录 */
  function libRestoreBlocked() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    if (!g || !g.blocked || !g.blocked.length) { wcToast("没有已屏蔽的条目"); return; }
    var existing = {}, i;
    for (i = 0; i < (g.items || []).length; i++) { existing[grpItemKey(k, g.items[i])] = 1; }
    if (!g.items) { g.items = []; }
    var restored = 0;
    for (i = 0; i < g.blocked.length; i++) {
      var it = g.blocked[i];
      var key = grpItemKey(k, it);
      if (existing[key]) { continue; }
      g.items.push(it);
      existing[key] = 1;
      restored++;
    }
    g.blocked = [];
    if (restored) {
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已恢复 " + restored + " 条屏蔽内容");
    } else {
      wcToast("屏蔽内容与现有条目重复，已清空屏蔽记录");
    }
  }
  /* v64：恢复内置内容 —— 按内置默认清单补齐当前分组缺失的条目，
     仅还原内置条目，用户自建内容不动；清理软删除记录 */
  function libRestoreBuiltin() {
    var k = wclNav.lib;
    var g = (wcl[k] || [])[wclNav.group];
    if (!g) { return; }
    var blist = builtinListOf(k, g.name);
    if (!blist) { wcToast("该分组不是内置分组，没有可恢复的内置内容"); return; }
    var existing = {}, i, v, restored = 0;
    for (i = 0; i < (g.items || []).length; i++) { existing[grpItemText(k, g.items[i])] = 1; }
    if (!g.items) { g.items = []; }
    for (i = 0; i < blist.length; i++) {
      v = String(blist[i]);
      if (existing[v]) { continue; }
      g.items.push(v);
      existing[v] = 1;
      restored++;
    }
    g.deleted = [];
    if (restored) {
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已恢复 " + restored + " 条内置内容");
    } else {
      wcToast("内置内容都还在，无需恢复");
    }
  }
  /* v63：单条编辑——格言/字卡条目点「编辑」弹窗修改文本并保存回本地 */
  function editGrpItem(el) {
    var idx = grpItemIndex(el);
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (idx < 0 || !g || !g.items || idx >= g.items.length) { return; }
    var m = libMeta(wclNav.lib);
    wcPrompt("编辑" + m.noun, grpItemText(wclNav.lib, g.items[idx]), "修改内容后点保存", function (v) {
      g.items[idx] = v;
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已保存修改");
    });
  }
  /* v70：通用选择模式开关（所有字卡库）——点工具栏勾选进入/退出，模式内点条目勾选（多选），可转移 / 批量删除或屏蔽 */
  function libToggleSel() {
    wclNav.sel = !wclNav.sel;
    wclNav.selPicks = []; /* 进出选择模式均清空勾选 */
    renderGroup();
    wcToast(wclNav.sel ? "已进入选择模式：点条目勾选，可转移 / 批量删除或屏蔽" : "已退出选择模式");
  }
  /* v102：选择模式「全显」——一键全选当前分组全部条目（仿 voiceSelAll） */
  function libSelAll() {
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    var n = (g && g.items) ? g.items.length : 0;
    wclNav.selPicks = [];
    for (var i = 0; i < n; i++) { wclNav.selPicks.push(i); }
    renderGroup();
  }

  /* ---------- 对外动作 ---------- */
  function libOpen(pageName) { SnowCrystal.switchPage(pageName); }
  function libOpenLib(k, from) {
    var active = document.querySelector(".page.is-active");
    wclNav.lib = k;
    /* from 由触发入口显式传入，返回时稳定回到来源页 */
    wclNav.page = from || (active && active.getAttribute("data-page")) || "wordcard";
    wclNav.group = 0;
    renderLib();
    SnowCrystal.switchPage("wc-lib");
  }
  function libOpenGroup(idx) {
    wclNav.group = parseInt(idx, 10) || 0;
    wclNav.sel = false; /* v70：切换分组自动退出选择模式 */
    wclNav.selPicks = []; /* v70：切换分组清空勾选 */
    renderGroup();
    SnowCrystal.switchPage("wc-lib-group");
  }
  function libBack() { SnowCrystal.switchPage(wclNav.page || "wordcard"); }
  function libGroupBack() { renderLib(); SnowCrystal.switchPage("wc-lib"); }

  function libAddGroup() {
    var k = wclNav.lib;
    wcPrompt("新建分组", "", "分组名称，如：晚安文案", function (res) {
      var name = String(res && res.name ? res.name : "").replace(/^\s+|\s+$/g, "");
      if (!name) { wcToast("分组名不能为空"); return; }
      var items = [];
      var content = String(res && res.content ? res.content : "");
      if (content) {
        var list = wcLineOn(k) ? content.split("\n") : [content];
        for (var i = 0; i < list.length; i++) {
          var t = String(list[i]).replace(/^\s+|\s+$/g, "");
          if (t) { items.push(t); }
        }
      }
      (wcl[k] || []).push({ name: name, items: items });
      saveWcl();
      renderLib();
      renderWclEntry();
      wcToast("已新建分组");
    }, { groupMode: true, multiline: true, lineKey: k, noContent: k === "sticker" });
  }
  function libRenameGroup() {
    var g = (wcl[wclNav.lib] || [])[wclNav.group];
    if (!g) { return; }
    wcPrompt("重命名分组", g.name, "", function (v) {
      g.name = v;
      saveWcl();
      renderGroup();
      wcToast("已重命名");
    });
  }
  function libDeleteGroup() {
    var groups = wcl[wclNav.lib] || [];
    var g = groups[wclNav.group];
    if (!g) { return; }
    var n = (g.items || []).length;
    wcConfirm("删除分组？", "「" + g.name + "」及其中 " + n + " 条内容将一并删除，删除后不可恢复。", function () {
      /* v71：记录本组全部 mediaKey（items / deleted / blocked），删除后若无引用则同步删 IDB */
      var gone = [], gi, ai, i2, mki;
      if (wclNav.lib === "sticker" && g) {
        var lists = [g.items, g.deleted, g.blocked];
        for (ai = 0; ai < lists.length; ai++) {
          for (i2 = 0; i2 < (lists[ai] || []).length; i2++) {
            mki = grpItemImgKey(lists[ai][i2]);
            if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
          }
        }
      }
      groups.splice(wclNav.group, 1);
      if (wclNav.group >= groups.length) { wclNav.group = Math.max(0, groups.length - 1); }
      for (gi = 0; gi < gone.length; gi++) { mediaDeleteIfUnused(gone[gi]); }
      saveWcl();
      renderWclEntry();
      /* 修复：删除分组后按当前所在页面重渲染对应视图（列表页刷新列表 / 内容页刷新条目），
         否则列表页删除后分组仍留在界面，必须刷新网页才消失 */
      var _libAct = document.querySelector(".page.is-active");
      var _libOnList = _libAct && _libAct.getAttribute("data-page") === "wc-lib";
      if (!groups.length) { renderLib(); SnowCrystal.switchPage("wc-lib"); }
      else if (_libOnList) { renderLib(); }
      else { renderGroup(); }
      wcToast("已删除分组");
    });
  }
  function libAddItem() {
    var k = wclNav.lib, m = libMeta(k);
    var g = (wcl[k] || [])[wclNav.group];
    if (!g) { return; }
    var tip = "";
    if (k === "emoji") { tip = "例如：🤗"; }
    else if (k === "kao") { tip = "例如：(＾▽＾)"; }
    else if (k === "pat") { tip = "完整句式，如：\"我方\"拍了拍\"对方\"：晚安"; }
    if (k === "sticker") {
      /* 表情包 sticker：保持原单条添加，不显示回车分行 */
      wcPrompt("添加" + m.noun, "", tip, function (v) {
        g.items.push(v);
        saveWcl();
        renderGroup();
        renderWclEntry();
        wcToast("已添加");
      }, { contentLabel: true });
      return;
    }
    /* 格言 quote / 字卡 main / 颜文字 kao / emoji / 拍一拍 pat：多行输入 + 回车分行开关 */
    wcPrompt("添加" + m.noun, "", tip, function (v) {
      var list = wcLineOn(k) ? String(v).split("\n") : [String(v)];
      var cnt = 0;
      for (var i = 0; i < list.length; i++) {
        var t = String(list[i]).replace(/^\s+|\s+$/g, "");
        if (t) { g.items.push(t); cnt++; }
      }
      if (cnt === 0) { wcToast("内容为空"); return; }
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast(cnt > 1 ? "已添加 " + cnt + " 条" : "已添加");
    }, { multiline: true, lineKey: k, contentLabel: true });
  }
  function libUpload() {
    var picker = document.getElementById("wcStickerPicker");
    if (picker) { picker.click(); }
  }
  function libClearUpload() {
    var g = (wcl.sticker || [])[wclNav.group];
    if (!g) { return; }
    var n = (g.items || []).length;
    if (!n) { wcToast("这一组还是空的"); return; }
    wcConfirm("清空本组？", "本组 " + n + " 条表情包将全部删除，删除后不可恢复。", function () {
      /* v71：记录本组图片 mediaKey，清空后若无引用则同步删 IDB */
      var gone = [], i2, mki;
      for (i2 = 0; i2 < (g.items || []).length; i2++) {
        mki = grpItemImgKey(g.items[i2]);
        if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
      }
      g.items = [];
      for (i2 = 0; i2 < gone.length; i2++) { mediaDeleteIfUnused(gone[i2]); }
      saveWcl();
      renderGroup();
      renderWclEntry();
      wcToast("已清空本组");
    });
  }
  /* v74：URL 批量导入 —— 多行粘贴、任意位置提取链接、数量不限、自动去重 */
  function libAddStickerUrl() {
    var g = (wcl.sticker || [])[wclNav.group];
    if (!g) { return; }
    if (!g.items) { g.items = []; }
    wcPrompt("粘贴图片链接", "", "可一次粘贴任意多条链接（数量不限），每条链接前/后有文字也能自动识别；仅支持 http(s):// 或 data:image/ 开头", function (v) {
      var raw = String(v || "");
      /* 从整段文本中提取全部链接：跳过前后文字与标点 */
      var re = /https?:\/\/[^\s"'<>，。；、（）()【】\[\]{}]+|data:image\/[a-zA-Z0-9+.\-]+;base64,[A-Za-z0-9+/=]+/g;
      var found = [], m;
      while ((m = re.exec(raw)) !== null) { found.push(m[0]); }
      if (!found.length) { wcToast("未识别到链接（需 http(s):// 或 data:image/ 开头）"); return; }
      var seen = {}, urls = [], i;
      for (i = 0; i < found.length; i++) {
        if (seen[found[i]]) { continue; }
        seen[found[i]] = 1;
        urls.push(found[i]);
      }
      var base = g.items.length;
      for (i = 0; i < urls.length; i++) { g.items.push({ k: "🔗", t: "链接表情包", img: urls[i] }); }
      /* data: 大图逐个迁入 IDB（链式避免事务冲突），外链直连 */
      var chain = Promise.resolve();
      for (i = 0; i < urls.length; i++) {
        if (!/^data:image\//i.test(urls[i])) { continue; }
        (function (idx) {
          chain = chain.then(function () {
            return mediaSaveNew(urls[idx]).then(function (mk) {
              if (mk) { g.items[base + idx].img = mk; }
            });
          });
        })(i);
      }
      chain.then(function () {
        var _saved = saveWcl();
        renderGroup();
        renderWclEntry();
        if (_saved) { syncChatStickerPanel(); } /* 聊天室表情包面板同步新导入 */
        wcToast("已导入 " + urls.length + " 条链接表情包");
      });
    }, { contentLabel: true, noEnterSubmit: true });
  }
  /* v70：表情包 JSON 导入 —— 解析 JSON 文件中的表情包数据并入对应分组 */
  function libImportStickerJson() {
    var inp = document.getElementById("wcStickerJsonInput");
    if (inp) { inp.click(); }
  }
  /* 从任意 JSON 里提取表情包分组列表 [{name, items}]：
     兼容本应用导出格式（{lib:"sticker", groups:[...]}）、
     第三方备份格式（{stickers:[...]} 或 {modules:{stickers:...}}）、
     裸数组/裸字符串数组（dataURL / 图片链接），以及带 mediaStore 的备份格式 */
  function parseStickerJson(raw) {
    var data = null;
    try { data = JSON.parse(String(raw).replace(/^\uFEFF/, "")); } catch (e) { data = null; }
    if (data === null || data === undefined || typeof data !== "object") { return []; }
    var out = [], i, groups = null, items = null, ms = null;

    function pushGroup(name, list) {
      var arr = wcNormItems("sticker", list), g = { name: name, items: [] }, j, it;
      for (j = 0; j < arr.length; j++) {
        it = arr[j];
        if (typeof it === "string") { g.items.push(normStickerItem(it)); continue; }
        if (it && typeof it === "object") {
          /* 备份格式：表情包条目可能只给 mediaKey / __mRef，需回填 mediaStore 的 base64 */
          var img = it.img || it.url || it.src || it.data || it.base64 || null;
          var mKey = it.mediaKey || it.__mRef || null;
          var imgKey = null, missing = false;
          /* v74：img 本身是 mediaKey（本应用导出但当时未回填）也要尝试从 mediaStore 取回；
             取不到则标记 __missing，渲染时给「图片缺失」提示而非静默占位 */
          if (isMediaKey(img)) { imgKey = img; }
          else if (!img && mKey && isMediaKey(mKey)) { imgKey = mKey; }
          if (imgKey) {
            if (ms && ms[imgKey]) { img = ms[imgKey]; imgKey = null; }
            else { missing = true; }
          }
          g.items.push({ k: it.k || "🖼", t: it.t || it.name || it.title || "表情包", img: img, __missing: missing || undefined });
        }
      }
      if (g.items.length) { out.push(g); }
    }

    if (data.mediaStore && typeof data.mediaStore === "object") { ms = data.mediaStore; }
    if (data.modules && data.modules.stickers !== undefined) { data = data.modules.stickers; }
    /* v70.1：兼容 ChatApp 备份的 localforage 结构 —— 取含当前 sessionId 的
       stickerLibrary / myStickerLibrary / customStickerGroups 数组合并为「表情包库」分组 */
    if (data.localforage && typeof data.localforage === "object") {
      var sid = String(data.sessionId || "");
      var lfKeys = Object.keys(data.localforage), lfPrefer = [], lfOther = [], li, lk, lv;
      for (li = 0; li < lfKeys.length; li++) {
        lk = lfKeys[li];
        if (!/Sticker/i.test(lk)) { continue; }
        lv = data.localforage[lk];
        if (!Array.isArray(lv) || !lv.length) { continue; }
        if (sid && lk.indexOf(sid) >= 0) { lfPrefer.push(lv); }
        else { lfOther.push(lv); }
      }
      var lfSrc = lfPrefer.length ? lfPrefer : lfOther, mergedArr = [], m2, n2;
      if (lfSrc.length) {
        for (li = 0; li < lfSrc.length; li++) { for (m2 = 0; m2 < lfSrc[li].length; m2++) { mergedArr.push(lfSrc[li][m2]); } }
        pushGroup("表情包库", mergedArr);
        if (out.length) { return out; }
      }
    }

    if (Array.isArray(data)) {
      pushGroup("导入分组", data);
      return out;
    }
    if (data && typeof data === "object") {
      groups = data.groups || data.libs || data.categories || null;
      if (Array.isArray(groups)) {
        for (i = 0; i < groups.length; i++) {
          if (groups[i] && Array.isArray(groups[i].items)) { pushGroup(groups[i].name || "导入分组", groups[i].items); }
          else if (groups[i] && typeof groups[i] === "object") {
            /* 形如 {分组名: [条目...]} 的对象 */
            var keys = Object.keys(groups[i]);
            for (var k2 = 0; k2 < keys.length; k2++) { pushGroup(keys[k2], groups[i][keys[k2]]); }
          }
        }
        if (out.length) { return out; }
      }
      items = data.items || data.list || data.stickers || null;
      if (Array.isArray(items)) { pushGroup("导入分组", items); }
      if (out.length) { return out; }
      /* 形如 {分组名: [条目...]} 或 {key: [条目...]} 的键值结构 */
      var keysAll = Object.keys(data), k3, val, pushed = false;
      for (k3 = 0; k3 < keysAll.length; k3++) {
        val = data[keysAll[k3]];
        if (Array.isArray(val)) { pushGroup(keysAll[k3], val); pushed = true; }
      }
      if (pushed && out.length) { return out; }
    }
    return out;
  }
  /* JSON 文件并入：按分组名合并（同名并入，新名新建）；单组无名字时并入当前分组 */
  function mergeStickerGroups(list) {
    var groups = wcl.sticker || (wcl.sticker = []);
    var cur = (wclNav.lib === "sticker" && groups[wclNav.group]) ? groups[wclNav.group] : null;
    var i, j, g, added = 0, created = 0;
    for (i = 0; i < list.length; i++) {
      var nm = String(list[i].name || "").replace(/^\s+|\s+$/g, "");
      var itArr = list[i].items || [];
      if (!itArr.length) { continue; }
      g = null;
      if (!nm) { g = cur; }
      else { for (j = 0; j < groups.length; j++) { if (groups[j].name === nm) { g = groups[j]; } } }
      if (!g) {
        g = { name: nm || (cur ? cur.name : "导入分组"), items: [] };
        if (!nm && cur) { g = cur; }
        else { groups.push(g); created++; }
      }
      g.items = g.items.concat(itArr);
      added += itArr.length;
    }
    return { added: added, created: created };
  }
  function libDedup() {
    var k = wclNav.lib, groups = wcl[k] || [], i, j, removed = 0, merged = 0;
    var gone = [];
    for (i = 0; i < groups.length; i++) {
      var items = groups[i].items || [], keep = [], seen = {};
      /* v92.1：去重范围限定在单个分组内（每组独立 seen）——
         仅清除本组内重复出现的条目，跨分组相同内容各自保留，完全无重复时零删除 */
      for (j = 0; j < items.length; j++) {
        /* v92：去重键修复 —— 表情包以图片源为准（对象取 img / 字符串自身即 mediaKey），
           其余库用条目唯一键（字符串自身 / 对象 = 名称|图片源）。
           原用 grpItemText 对表情包条目统一回退成「表情包」导致全部撞键，误删到只剩一条 */
        var key;
        if (k === "sticker") {
          key = grpItemImgKey(items[j]) || grpItemKey(k, items[j]);
        } else {
          key = grpItemKey(k, items[j]);
        }
        if (seen[key]) {
          /* v71：被去重丢弃的图片条目记录 mediaKey，去重后若无引用则同步删 IDB */
          if (k === "sticker") {
            var mki = grpItemImgKey(items[j]);
            if (mki && gone.indexOf(mki) < 0) { gone.push(mki); }
          }
          removed++; continue;
        }
        seen[key] = 1;
        keep.push(items[j]);
      }
      if (keep.length !== items.length) { groups[i].items = keep; }
    }
    var out = [], names = {};
    for (i = 0; i < groups.length; i++) {
      var nm = groups[i].name;
      if (names[nm] === undefined) { names[nm] = out.length; out.push(groups[i]); }
      else { out[names[nm]].items = out[names[nm]].items.concat(groups[i].items || []); merged++; }
    }
    wcl[k] = out;
    if (wclNav.group >= out.length) { wclNav.group = Math.max(0, out.length - 1); }
    for (i = 0; i < gone.length; i++) { mediaDeleteIfUnused(gone[i]); }
    saveWcl();
    renderLib();
    renderWclEntry();
    wcToast("去重完成：删掉 " + removed + " 条重复内容" + (merged ? "，合并 " + merged + " 组" : ""));
  }
  function libExport() {
    var k = wclNav.lib, m = libMeta(k);
    var groups = wclClone(wcl[k] || []);
    /* v71：导出前把 IndexedDB 媒体库图片回填为 base64，保证导出文件含完整图片 */
    mediaResolveAll().then(function (map) {
      var data = { lib: k, name: m.title, exportedAt: new Date().toISOString(), groups: stickerFillBase64({ sticker: groups }, map).sticker };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "雪晶-字卡-" + m.title + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      wcToast("已导出《" + m.title + "》");
    });
  }
  function libImport() {
    var inp = document.getElementById("wcLibImport");
    if (inp) { inp.click(); }
  }
  function libSearch() {
    var wrap = document.getElementById("libSearchWrap");
    var inp = document.getElementById("libSearchInput");
    if (!wrap) { return; }
    if (!wrap.hidden) {
      wrap.hidden = true;
      if (inp) { inp.value = ""; }
      libDoSearch("");
      return;
    }
    wrap.hidden = false;
    if (inp) { inp.value = ""; inp.focus(); }
    libDoSearch("");
  }
  function libDoSearch(q) {
    var k = wclNav.lib, groups = wcl[k] || [], host = document.getElementById("libSearchResults");
    var list = document.getElementById("libGroups");
    q = String(q == null ? "" : q).replace(/^\s+|\s+$/g, "");
    if (!q) {
      if (host) { host.hidden = true; host.innerHTML = ""; }
      if (list) { list.hidden = false; }
      return;
    }
    var html = '<p class="grp-empty">「' + esc(q) + '」的搜索结果</p><div class="row-list">', hit = 0, i, j, txt;
    for (i = 0; i < groups.length; i++) {
      for (j = 0; j < (groups[i].items || []).length; j++) {
        txt = grpItemText(k, groups[i].items[j]);
        if (txt.toLowerCase().indexOf(q.toLowerCase()) < 0) { continue; }
        hit++;
        html += '<article class="row-card" onclick="SnowCrystal.libCopyText(\'' + esc(txt).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + '\')">' +
                  '<span class="row-ico">' + libIconSvg(k) + "</span>" +
                  '<div class="row-main"><span class="row-title">' + esc(txt) + "</span>" +
                  '<span class="row-desc">' + esc(groups[i].name) + "</span></div>" +
                  '<span class="row-arrow">›</span>' +
                "</article>";
      }
    }
    html += "</div>";
    if (!hit) { html = '<p class="grp-empty">没有找到「' + esc(q) + '」</p>'; }
    if (host) { host.innerHTML = html; host.hidden = false; }
    if (list) { list.hidden = true; }
  }
  function libClearSearch() {
    var wrap = document.getElementById("libSearchWrap");
    var inp = document.getElementById("libSearchInput");
    if (inp) { inp.value = ""; }
    if (wrap) { wrap.hidden = true; }
    libDoSearch("");
  }
  function libCopyText(t) { wcCopy(t); }

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
          if (wcPromptNoEnter) { return; } /* v74：批量粘贴模式（URL 导入）回车仅换行，不提交 */
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

    /* v88：转组弹窗 —— 蒙层/取消关闭；列表点击目标分组执行转移 */
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
            /* v71：图片写 IndexedDB 媒体库，localStorage 只存 mediaKey；IDB 不可用时回退存 base64 */
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

    /* v91：语音字卡 —— mp3 文件选择 / 分组详情页点击（播放、编辑、删除、选择模式勾选） */
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
          /* v61：改按「文本」读取。原先用 readAsDataURL，reader.result 是
             "data:application/json;base64,……" 这样的 data URL，直接丢给 JSON.parse
             必然抛错，于是固定提示「文件里没有可导入的内容」—— 这就是导入一直失败的根因。
             另外剥掉 UTF-8 BOM，避免带 BOM 的 JSON 解析失败。 */
          var raw = String(reader.result || "").replace(/^\uFEFF/, "");
          var k = wclNav.lib || "quote";
          var parsed = wcParseImport(raw, k);
          /* v61：按 JSON 内容自身的库归属分别落到对应字卡库。第三方备份常把内容放在
             customReplies / kaomojiLibrary / customMottos / customStatuses… 等字段里，
             以前只会塞进「当前正打开的库」，导致看起来「导进去了却找不到」。 */
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
          /* v71：导入若含表情包 base64 图片，先迁入 IndexedDB 媒体库（缩体积）再保存，
             避免「迁移前先保存大图」超限静默失败导致刷新后导入内容消失 */
          mediaMigrateAll().then(function () {
            var _saved = saveWcl();
            /* v61.1：导入后按当前所在页面即时刷新 —— 分组内容页用 renderGroup()，
               分组列表页用 renderLib()，避免「确定后看不到新导入的字卡」 */
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

    /* v70：表情包 JSON 专用导入 —— 解析文件并入分组（同名合并/新建） */
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
          /* v74：统计备份里引用了 mediaKey 但拿不到图片数据的条数，导入后一并提示 */
          var miss = 0, li2, gi2, it2;
          for (li2 = 0; li2 < list.length; li2++) {
            var _g2 = list[li2] || {};
            for (gi2 = 0; gi2 < (_g2.items || []).length; gi2++) {
              it2 = _g2.items[gi2];
              if (it2 && it2.__missing) { miss++; }
            }
          }
          var r = mergeStickerGroups(list);
          /* v73：先迁移后保存 —— 大文件 base64 迁移进 IDB 后 localStorage 才能放下 */
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



