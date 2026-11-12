/* 雪山晶 · 48-letter-v16 ｜ 源：雪山晶.html L30112-L32234 ｜ JS 模块 */
/* ============================================================
   云笺 v16 · 单文件模块（IIFE，挂到 SnowCrystal）
   - 数据：snowcrystal.letter.v2（自动纳入站内数据管理备份/清空）
   - 配色：全部取网站 --bg/--card/--text/--accent 等主题变量，随外观主题与阴阳切换
   - 列表：寄远书 / 枕梦录；分组只认账号设置里创建的对方角色，无角色时不预置信
   - 统计：年度笺记（累计 / 热力 / 月时长 / 月字数 / 落笔偏好）
   - 编辑器：默认不弹键盘，仅点「键盘」按钮才调出，便于长按选字设字式
   ============================================================ */
(function () {
  'use strict';
  if (window.__xjLetterV16) { return; }
  window.__xjLetterV16 = true;

  var $ = function (id) { return document.getElementById(id); };
  var app, S = window.SnowCrystal = window.SnowCrystal || {};
  var KEY = 'snowcrystal.letter.v2';
  var PALETTE = ['#e79aa2', '#e8b177', '#d9b3d8', '#a6bfe4', '#a8cdbb', '#cdb9e0', '#e3c07e', '#96c4ce'];
  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /* ---------------- 基础工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { if (window.XJ_STORE) { try { window.XJ_STORE.set(k, v); } catch (e2) {} } } }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function uid() { return 'l' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36); }
  function hash(s) { var h = 0, i; s = String(s); for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
  function colorOf(s) { return PALETTE[hash(s) % PALETTE.length]; }
  function ui() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1; }

  var toastTimer = null;
  function toast(msg) {
    var t = $('xjlToast'); if (!t) { return; }
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 1700);
  }
  var confirmCb = null;
  function confirmBox(text, cb) {
    $('xjlConfirmText').textContent = text; confirmCb = cb;
    $('xjlConfirmMask').classList.add('is-on');
  }
  function closeConfirm() { $('xjlConfirmMask').classList.remove('is-on'); confirmCb = null; }

  /* ---------------- 信纸（中国色系晕染 / 纸张纹理） ---------------- */
  function svgUri(svg) { return "url('data:image/svg+xml," + encodeURIComponent(svg) + "')"; }
  var BAMBOO = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="220"><g fill="none" stroke="rgba(60,100,80,.28)" stroke-width="1.2"><path d="M18 220C24 150 30 90 44 18"/><path d="M44 18c14-10 26-9 34-6-12 8-24 11-34 6zM40 52c14-10 27-9 35-5-12 8-25 11-35 5zM34 96c14-10 28-8 36-4-12 8-26 10-36 4zM28 146c15-9 28-7 36-3-12 8-26 9-36 3z"/><path d="M120 220c-8-60-16-104-28-158"/><path d="M94 64c-13-9-25-8-33-5 12 8 24 10 33 5zM102 112c-13-9-25-8-33-4 12 7 24 9 33 4z"/></g></svg>');
  var PETAL = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><g fill="rgba(255,255,255,.55)"><ellipse cx="24" cy="30" rx="9" ry="5" transform="rotate(-28 24 30)"/><ellipse cx="88" cy="62" rx="8" ry="4.5" transform="rotate(22 88 62)"/><ellipse cx="42" cy="104" rx="7" ry="4" transform="rotate(-16 42 104)"/><ellipse cx="100" cy="140" rx="9" ry="5" transform="rotate(35 100 140)"/><ellipse cx="16" cy="158" rx="6" ry="3.5" transform="rotate(-40 16 158)"/></g></svg>');
  var INK = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><g fill="none" stroke="rgba(90,110,140,.14)" stroke-width="1"><circle cx="40" cy="46" r="26"/><circle cx="40" cy="46" r="17"/><circle cx="112" cy="118" r="34"/><circle cx="112" cy="118" r="22"/></g></svg>');
  /* 国画笔触素材（远岫 / 墨竹 / 寒梅 / 幽兰 / 松风 / 朱印） */
  function pic(uri, pos) { return uri + ' ' + (pos || 'center bottom/84% auto no-repeat'); }
  var GH_MOUNT = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><g fill="none" stroke="rgba(70,82,94,.50)" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"><path d="M2 120c17-31 27-47 39-49 10-2 16 8 24 20 9 13 17 23 31 25"/><path d="M4 143c14-12 27-18 39-15 11 3 19 11 30 13 11 2 23-2 35-8"/><path d="M60 74c8 5 17 6 25 3"/></g><circle cx="94" cy="32" r="9" fill="rgba(176,116,104,.20)"/><g fill="none" stroke="rgba(70,82,94,.42)" stroke-width=".9" stroke-linecap="round"><path d="M26 46c4-3 8-3 11-1"/><path d="M42 56c3-2 6-2 9 0"/></g></svg>');
  var GH_BAMBOO = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="190"><g fill="none" stroke="rgba(50,70,60,.52)" stroke-width="1.25" stroke-linecap="round"><path d="M28 188C33 132 38 80 45 20"/><path d="M29 152h7M32 114h7M36 76h7"/><path d="M45 20c12-8 22-8 30-4-11 7-21 9-30 4z"/><path d="M41 54c12-8 22-7 30-3-11 7-21 8-30 3z"/><path d="M38 92c12-8 23-7 31-3-11 7-22 8-31 3z"/><path d="M34 132c12-7 22-6 30-2-11 7-21 7-30 2z"/></g></svg>');
  var GH_PLUM = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="180"><g fill="none" stroke="rgba(92,58,60,.55)" stroke-width="1.25" stroke-linecap="round"><path d="M12 178C33 142 52 110 64 60"/><path d="M38 130c9-11 19-17 30-19"/><path d="M54 96c-7-11-9-21-7-29"/></g><g fill="rgba(152,82,90,.55)"><circle cx="70" cy="106" r="3.1"/><circle cx="66" cy="119" r="2.5"/><circle cx="48" cy="72" r="2.7"/><circle cx="44" cy="59" r="2.1"/><circle cx="80" cy="96" r="2.2"/></g></svg>');
  var GH_ORCHID = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="110" height="180"><g fill="none" stroke="rgba(56,80,62,.50)" stroke-width="1.25" stroke-linecap="round"><path d="M16 178c26-32 44-64 53-100"/><path d="M23 178c22-27 40-50 63-63"/><path d="M31 178c18-8 40-12 63-8"/><path d="M56 122c9-4 17-4 25 0"/></g></svg>');
  var GH_PINE = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><g fill="none" stroke="rgba(58,70,56,.50)" stroke-width="1.25" stroke-linecap="round"><path d="M16 178C33 120 48 74 63 28"/><path d="M47 94c14-10 26-14 41-14"/><path d="M42 118c-12-8-20-14-27-22"/></g><g fill="none" stroke="rgba(58,70,56,.44)" stroke-width=".95" stroke-linecap="round"><path d="M57 60l-6-11M57 60l6-12M57 60l0-13M72 72l-5-10M72 72l6-9M85 81l-4-8M85 81l6-7M28 138l-6-9M28 138l6-9"/></g></svg>');
  var GH_SEAL = svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect x="9" y="9" width="42" height="42" rx="4" fill="none" stroke="rgba(176,64,56,.80)" stroke-width="2.2"/><path d="M20 20h20v5H20zM20 33h9v9h-9zM35 33h5v9h-5z" fill="rgba(176,64,56,.62)"/></svg>');
  function wash(c1, c2, c3, base) {
    return 'radial-gradient(78% 46% at 18% 12%,' + c1 + ',transparent 68%),' +
           'radial-gradient(66% 42% at 86% 34%,' + c2 + ',transparent 70%),' +
           'radial-gradient(88% 58% at 26% 88%,' + c3 + ',transparent 72%),' +
           'linear-gradient(165deg,' + base + ',' + base + ')';
  }
  function solid(a, b) { return a; }
  function paperTex(base, line) {
    return 'repeating-linear-gradient(0deg,transparent 0 5px,' + line + ' 5px 6px),' +
           'repeating-linear-gradient(90deg,transparent 0 22px,' + line + ' 22px 23px),' +
           'linear-gradient(160deg,' + base + ',' + base + ')';
  }
  /* [V17] 信纸体系重构：删除素笺/月白/烟雨/霜华与旧「纸」系列，
     其余全部归入「纯色」；新增绘画软件常用纸纹（细颗粒 / 冷压 / 画布 / 和纸等），
     另设「自定义」支持上传图片保存为信纸。 */
  function grain(base, dark, light, period) {
    return 'radial-gradient(' + dark + ' 0 .65px,transparent 1.15px),' +
           'radial-gradient(' + light + ' 0 .6px,transparent 1.15px),' +
           'linear-gradient(160deg,' + base + ',' + base + ')';
  }
  var GRAIN_SIZE = '4px 4px, 6px 6px, auto';
  /* [V18] 浅色纯色 + 花色信纸。
     纯色只留浅色系（原鸦青/红豆/群青/青岚/暮霞/黛蓝/赭石等深底白字全部移除）；
     「纸纹」整类删除，改为「花色」：色系晕染 / 大片墨迹 / 细密方格 /
     格裙式磨砂格纹 / 磨砂颗粒 / 细密线条，一律浅色系为主。
     tint = 该信纸对应的信封主色（聊天里真实信封用它上色，不随外观主题）。 */
  function hzTartan(a, b, base) {
    return 'repeating-linear-gradient(0deg,transparent 0 9px,' + a + ' 9px 13px,transparent 13px 26px,' + b + ' 26px 28px,transparent 28px 40px),' +
           'repeating-linear-gradient(90deg,transparent 0 9px,' + a + ' 9px 13px,transparent 13px 26px,' + b + ' 26px 28px,transparent 28px 40px),' +
           'linear-gradient(160deg,' + base + ',' + base + ')';
  }
  var PAPERS = [
    /* ---------- 纯色（浅色系） ---------- */
    { id: 'bai',   name: '雪白', cat: '纯色', ink: '#4b5566', ph: '#b6bec9', tint: '#e9eff6', bg: solid('#ffffff', '#f4f6f9') },
    { id: 'mi',    name: '米白', cat: '纯色', ink: '#5b5145', ph: '#c6b9a4', tint: '#f1e9d8', bg: solid('#fdf9f0', '#f2e8d5') },
    { id: 'fen',   name: '樱粉', cat: '纯色', ink: '#78505c', ph: '#d9b5bd', tint: '#f8e1e6', bg: solid('#fdf0f2', '#f9dfe5') },
    { id: 'xing',  name: '杏黄', cat: '纯色', ink: '#6d5533', ph: '#cbb58c', tint: '#f5e4bd', bg: solid('#fbf1dc', '#f4e4bf') },
    { id: 'shui',  name: '水红', cat: '纯色', ink: '#784b56', ph: '#d3aab3', tint: '#f3d9de', bg: solid('#fbeaed', '#f6dade') },
    { id: 'xiang', name: '缃色', cat: '纯色', ink: '#6b532c', ph: '#c2ac83', tint: '#f0e0ba', bg: wash('rgba(255,255,255,.66)','rgba(230,190,110,.30)','rgba(214,168,86,.26)','#f6ead0') },
    { id: 'song',  name: '松花', cat: '纯色', ink: '#4b5a38', ph: '#a9b894', tint: '#e6efc9', bg: wash('rgba(255,255,255,.70)','rgba(190,206,140,.32)','rgba(166,186,116,.28)','#eef3d9') },
    { id: 'cong',  name: '浅葱', cat: '纯色', ink: '#3f5d58', ph: '#9bbdb6', tint: '#d9ebe5', bg: solid('#e6f3f0', '#d4e9e4') },
    { id: 'he',    name: '荷绿', cat: '纯色', ink: '#48604a', ph: '#adc4a9', tint: '#e0ecdc', bg: solid('#eef6ec', '#dcebdb') },
    { id: 'qing',  name: '晴蓝', cat: '纯色', ink: '#42586e', ph: '#aabfd4', tint: '#dceaf8', bg: solid('#eaf3fc', '#d8e8f7') },
    { id: 'teng',  name: '淡藤', cat: '纯色', ink: '#5c506e', ph: '#b9adcb', tint: '#e6ddf2', bg: solid('#efe9f7', '#e2d9f0') },
    { id: 'ou',    name: '藕荷', cat: '纯色', ink: '#5f4a68', ph: '#bda7c5', tint: '#ecdeef', bg: wash('rgba(255,255,255,.70)','rgba(196,166,208,.30)','rgba(176,146,196,.26)','#f3e9f4') },
    { id: 'bing',  name: '冰裂', cat: '纯色', ink: '#45566a', ph: '#a9bacb', tint: '#e2edf7', bg: 'repeating-linear-gradient(58deg,transparent 0 21px,rgba(110,145,180,.10) 21px 22px),repeating-linear-gradient(-58deg,transparent 0 27px,rgba(110,145,180,.08) 27px 28px),linear-gradient(160deg,#f4f9fc,#e7f0f8)' },
    { id: 'xue',   name: '雪晶', cat: '纯色', ink: '#46556b', ph: '#aebccc', tint: '#e4eef9', bg: 'radial-gradient(60% 40% at 22% 16%,rgba(255,255,255,.95),transparent 70%),radial-gradient(70% 46% at 84% 30%,rgba(186,208,234,.42),transparent 70%),radial-gradient(90% 60% at 24% 90%,rgba(204,220,240,.48),transparent 72%),linear-gradient(165deg,#f8fbfe,#e9f1fa)' },

    /* ---------- 花色：色系晕染 ---------- */
    { id: 'yun_tao', name: '桃晕', cat: '花色', ink: '#75505e', ph: '#c9a7b2', tint: '#f6dfe3',
      bg: wash('rgba(255,236,240,.92)','rgba(244,190,205,.46)','rgba(232,168,192,.34)','#fdf5f6') },
    { id: 'yun_lan', name: '云水', cat: '花色', ink: '#445c70', ph: '#a9bccd', tint: '#dceaf4',
      bg: wash('rgba(240,248,255,.92)','rgba(176,208,236,.46)','rgba(160,196,230,.34)','#f3f9fd') },
    { id: 'yun_he',  name: '荷烟', cat: '花色', ink: '#4a6150', ph: '#aec3ae', tint: '#e0eddf',
      bg: wash('rgba(246,252,246,.92)','rgba(188,220,190,.46)','rgba(172,210,182,.34)','#f5faf5') },
    { id: 'yun_zi',  name: '暮紫', cat: '花色', ink: '#5b4d70', ph: '#b9abc9', tint: '#e8e1f2',
      bg: wash('rgba(250,246,255,.92)','rgba(206,188,232,.44)','rgba(190,172,224,.32)','#f8f5fd') },

    /* ---------- 花色：大片墨迹 ---------- */
    { id: 'mo_qing', name: '淡墨', cat: '花色', ink: '#45525e', ph: '#a8b3bd', tint: '#e3e9ec',
      bg: 'radial-gradient(46% 34% at 22% 20%,rgba(96,116,132,.20),transparent 72%),radial-gradient(38% 30% at 78% 66%,rgba(80,100,118,.16),transparent 74%),radial-gradient(60% 42% at 62% 92%,rgba(120,138,152,.12),transparent 76%),linear-gradient(162deg,#f7f9f9,#eef2f2)' },
    { id: 'mo_yan',  name: '烟墨', cat: '花色', ink: '#5a504c', ph: '#b8ada6', tint: '#eee7e1',
      bg: 'radial-gradient(52% 36% at 76% 18%,rgba(126,110,100,.19),transparent 72%),radial-gradient(40% 32% at 20% 70%,rgba(110,96,88,.15),transparent 74%),linear-gradient(160deg,#faf7f3,#f1ebe4)' },

    /* ---------- 花色：细密方格 ---------- */
    { id: 'ge_lan', name: '细方格', cat: '花色', ink: '#4b5c6c', ph: '#a9b9c6', tint: '#e2ecf3',
      bg: 'repeating-linear-gradient(0deg,transparent 0 11px,rgba(112,148,180,.16) 11px 12px),repeating-linear-gradient(90deg,transparent 0 11px,rgba(112,148,180,.13) 11px 12px),linear-gradient(160deg,#f7fbfd,#eef5fa)', size: '12px 12px, 12px 12px, auto' },
    { id: 'ge_fen', name: '粉方格', cat: '花色', ink: '#75545e', ph: '#c9abb4', tint: '#f6e7ea',
      bg: 'repeating-linear-gradient(0deg,transparent 0 11px,rgba(198,140,158,.15) 11px 12px),repeating-linear-gradient(90deg,transparent 0 11px,rgba(198,140,158,.12) 11px 12px),linear-gradient(160deg,#fdf8f9,#f9eef1)', size: '12px 12px, 12px 12px, auto' },

    /* ---------- 花色：格裙式磨砂格纹 ---------- */
    { id: 'qun_fen', name: '格裙·粉', cat: '花色', ink: '#6f4a58', ph: '#c2a2ae', tint: '#f5e2e7',
      bg: hzTartan('rgba(206,146,166,.22)','rgba(168,108,132,.20)','#fdf6f8'), size: '40px 40px, 40px 40px, auto' },
    { id: 'qun_lv',  name: '格裙·苔', cat: '花色', ink: '#4a5c4c', ph: '#a9bba9', tint: '#e3ecdf',
      bg: hzTartan('rgba(140,172,142,.22)','rgba(96,132,104,.18)','#f6faf5'), size: '40px 40px, 40px 40px, auto' },

    /* ---------- 花色：磨砂颗粒 ---------- */
    { id: 'sha_li', name: '磨砂', cat: '花色', ink: '#525b66', ph: '#b0b8c0', tint: '#e9edf1',
      bg: 'radial-gradient(rgba(90,102,116,.10) 0 .6px,transparent 1.1px),radial-gradient(rgba(255,255,255,.72) 0 .6px,transparent 1.1px),radial-gradient(70% 50% at 24% 16%,rgba(255,255,255,.85),transparent 72%),linear-gradient(160deg,#f6f8fa,#eceff3)', size: '3px 3px, 5px 5px, auto, auto' },

    /* ---------- 花色：细密线条 ---------- */
    { id: 'xian_mi', name: '细线笺', cat: '花色', ink: '#5c5348', ph: '#bfb5a6', tint: '#eee9de',
      bg: 'repeating-linear-gradient(0deg,transparent 0 8px,rgba(140,124,104,.15) 8px 9px),linear-gradient(160deg,#fbf8f1,#f4eee2)', size: '9px 9px, auto' },
    { id: 'xian_qing', name: '细线·青', cat: '花色', ink: '#465a66', ph: '#a9bcc6', tint: '#e2edf0',
      bg: 'repeating-linear-gradient(0deg,transparent 0 8px,rgba(104,140,152,.14) 8px 9px),linear-gradient(160deg,#f6fafb,#eaf3f5)', size: '9px 9px, auto' }
  ];
  var CATS = ['纯色', '花色', '自定义'];
  /* [V18] 只作旧笺兼容：把已删除的深色纯色、整类删除的纸纹 id 映射到新的浅色/花色笺 */
  var LEGACY_PAPER = { su: 'bai', yue: 'bai', yan: 'bai', hua: 'bai',
    luo: 'shui', mei: 'fen', lian: 'cong', zhuy: 'yun_lan',
    xuan: 'xian_mi', zhuzhi: 'yun_he', ma: 'sha_li', mianzhi: 'sha_li',
    maobian: 'mo_qing', niupi: 'mi', zhuL: 'ge_lan', ge: 'ge_lan',
    ya: 'bai', hong: 'shui', qun: 'qing', lan: 'cong', xia: 'fen', dai: 'qing', zhe: 'mi',
    wcp: 'yun_tao', wcr: 'mo_qing', sketch: 'sha_li', canvas: 'ge_lan', washi: 'yun_he',
    parch: 'mi', kraft: 'mi', xuanfine: 'xian_mi', gridfine: 'ge_lan', noise: 'sha_li' };

  /* ---------- 自定义信纸：图片压缩后存本机 ---------- */
  var CP_KEY = 'snowcrystal.letter.custompapers.v1';
  function customPapers() {
    try {
      var a = JSON.parse(localStorage.getItem(CP_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveCustomPapers(a) {
    try { localStorage.setItem(CP_KEY, JSON.stringify(a)); return true; }
    catch (e) { toast('存储空间不足，请先删掉几张自定义信纸'); return false; }
  }
  function syncCustomPapers() {
    for (var i = PAPERS.length - 1; i >= 0; i--) { if (PAPERS[i].custom) { PAPERS.splice(i, 1); } }
    var a = customPapers(), j;
    for (j = 0; j < a.length; j++) {
      PAPERS.push({ id: a[j].id, name: a[j].name, cat: '自定义', custom: true,
        ink: '#3d4654', ph: '#9aa4b2', tint: a[j].tint || '#eadfce', bg: "url('" + a[j].src + "') center center / cover no-repeat" });
    }
  }
  function addCustomPaper(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var max = 900, w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        try { cv.getContext('2d').drawImage(img, 0, 0, w, h); } catch (e) { toast('图片读取失败'); return; }
        var src;
        try { src = cv.toDataURL('image/jpeg', 0.72); } catch (e2) { src = String(ev.target.result || ''); }
        var a = customPapers();
        if (a.length >= 12) { toast('最多保存 12 张自定义信纸'); return; }
        var id = 'cp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        /* [V18] 吸取图片主色作为信封颜色：缩到 1x1 求均值，再往白里混一点保证信封可读 */
        var tint = '#eadfce';
        try {
          var tc = document.createElement('canvas'); tc.width = 1; tc.height = 1;
          var tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, 1, 1);
          var d = tx.getImageData(0, 0, 1, 1).data;
          function hx(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
          tint = '#' + hx(d[0] * .72 + 255 * .28) + hx(d[1] * .72 + 255 * .28) + hx(d[2] * .72 + 255 * .28);
        } catch (e3) {}
        a.push({ id: id, name: String(file.name || '自定义').replace(/\.[^.]+$/, '').slice(0, 8), src: src, tint: tint });
        if (!saveCustomPapers(a)) { return; }
        syncCustomPapers();
        ST.paperTab = '自定义';
        renderPaperList();
        applyPaper(id);
        toast('信纸已保存');
      };
      img.onerror = function () { toast('图片读取失败'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function delCustomPaper(id) {
    var a = customPapers().filter(function (x) { return x.id !== id; });
    if (!saveCustomPapers(a)) { return; }
    syncCustomPapers();
    var n = noteById(ST.editId);
    if (n && n.paper === id) { n.paper = 'bai'; save(); applyPaper('bai'); }
    renderPaperList();
    toast('已删除');
  }
  syncCustomPapers();

  function inkShadow(hex) {
    var v = String(hex || '').replace('#', '');
    if (v.length === 3) { v = v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2); }
    if (v.length < 6) { return 'none'; }
    var r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) { return 'none'; }
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? '0 1px 3px rgba(0,0,0,.42)' : 'none';
  }
  function paperById(id) {
    var i, key = LEGACY_PAPER[id] || id;
    for (i = 0; i < PAPERS.length; i++) { if (PAPERS[i].id === key) { return PAPERS[i]; } }
    for (i = 0; i < PAPERS.length; i++) { if (PAPERS[i].id === id) { return PAPERS[i]; } }
    return PAPERS[0];
  }

  /* ---------------- 数据层 ---------------- */
  var DB = null;
  function nowISO(d) { var x = d || new Date(); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  /* 不再预置任何内置信：未创建对方角色时云笺为空，
     角色分组只读站内「账号设置」里真实创建的对方角色。 */
  function emptyDB() { return { v: 3, rev: 0, notes: [] }; }
  /* ---------------- 存储层：IndexedDB 为主，正文分条 ----------------
     「寄远书（信件）」与「枕梦录（梦境记录）」同属本 DB 的两个 kind。
     数据分两层落库，信笺再多也不会一次性把全部正文读进内存：
       · 索引层 K_IDX：只放列表/统计要用的轻量元数据（标题、日期、字数、摘要 ex…），
         每笺约两百字节，进页面解析一次就够；
       · 正文层 K_BODY(id)：每笺一条独立记录，只在打开编辑器、或需要缩略图时按需读取，
         保存时也只重写这一条，不再对整库几十 MB 反复 stringify + 写盘。
     旧版整包（KEY = snowcrystal.letter.v2）保留只读兼容：读到后自动拆成两层，
     正文在后台空闲时分批搬迁，不阻塞界面、不长时间占用主线程。 */
  var K_IDX = 'snowcrystal.letter.v3.index';
  var K_BODY_PREFIX = 'snowcrystal.letter.v3.body.';
  var BAK_KEY = K_IDX + '.bak';
  var SNAP_MAX = 384 * 1024;    /* 快照上限：超过就只认 IDB，配额与主线程时间都留给别的模块 */
  var idbLoaded = false;
  /* 首读保护：索引还没从 IDB 回读确认前，绝不用内存里的（可能是快照/空）库覆盖 IDB，
     否则刚打开页面就刷新，会把真数据冲成空库 */
  var idxChecked = false;
  var idbWriteHold = false;
  var BODY = {};                /* id → { h: 标题HTML, b: 正文HTML, t: 缩略图 } 已载入的正文 */
  var BODY_ORDER = [];          /* 正文缓存的使用顺序（超出上限就丢掉最久没碰的） */
  var LEGACY = {};              /* 旧版整包里的正文，供尚未搬迁的笺按需回落 */
  var THUMB = {};               /* id → 缩略图（列表卡片用，取到就缓存） */
  var dirtyBody = {};           /* 待写盘的正文 id */
  var bodyWait = {};            /* 同一条正文并发读取时的回调队列 */
  var legacyMoveOn = false;
  function bodyKey(id) { return K_BODY_PREFIX + id; }

  function storeApi() { return window.XJ_STORE || null; }
  function lsGetRaw(k) {
    var api = storeApi();
    if (api && typeof api.lsGetOnly === 'function') { return api.lsGetOnly(k) || ''; }
    return get(k, '');
  }
  function lsSetRaw(k, v) {
    var api = storeApi();
    if (api && typeof api.lsSetOnly === 'function') { return api.lsSetOnly(k, v); }
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function lsDrop(k) {
    var api = storeApi();
    if (api && typeof api.lsRemoveOnly === 'function') { api.lsRemoveOnly(k); return; }
    try { localStorage.removeItem(k); } catch (e) {}
  }
  function parseDB(s) {
    if (!s) { return null; }
    try {
      var o = JSON.parse(s);
      if (o && Array.isArray(o.notes)) {
        o.rev = typeof o.rev === 'number' ? o.rev : 0;
        return o;
      }
    } catch (e) {}
    return null;
  }
  function dbRev(d) { return d && typeof d.rev === 'number' ? d.rev : 0; }
  function dbStamp(d) {
    var m = 0, i, t;
    for (i = 0; i < d.notes.length; i++) {
      t = Date.parse(String(d.notes[i].updated || '')) || 0;
      if (t > m) { m = t; }
    }
    return m;
  }
  /* a 是否应该覆盖 b：先比版本号，再比条数，最后比最后修改时间 */
  function preferA(a, b) {
    if (!a) { return false; }
    if (!b) { return true; }
    if (dbRev(a) !== dbRev(b)) { return dbRev(a) > dbRev(b); }
    if (a.notes.length !== b.notes.length) { return a.notes.length > b.notes.length; }
    return dbStamp(a) > dbStamp(b);
  }
  /* 首读闸门：IndexedDB 读完之前不写库、不接受改数据，避免覆盖旧笺 */
  var bootSettled = false, bootWait = [], bootPendingSave = false;
  function settle() {
    if (bootSettled) { return; }
    bootSettled = true;
    var q = bootWait, i;
    bootWait = [];
    for (i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
    if (bootPendingSave) { bootPendingSave = false; save(); }
  }
  function whenLoaded(cb) {
    if (typeof cb !== 'function') { return; }
    if (bootSettled) { cb(); return; }
    bootWait.push(cb);
  }
  /* 元数据：列表 / 统计只需要这些字段，正文另存 */
  function metaOf(n) {
    return {
      id: n.id, kind: n.kind || 'letter', to: n.to || '未署名',
      title: n.title || '', paper: n.paper || 'su',
      created: n.created || n.updated || nowISO(), updated: n.updated || n.created || nowISO(),
      words: n.words || 0, seconds: n.seconds || 0,
      thumb: !!n.thumb,
      ex: (typeof n.ex === 'string' ? n.ex : excerptOf(n.bodyHtml))
    };
  }
  /* 旧版整包 → 新结构：元数据进 DB，正文先放 LEGACY，等空闲时再分条搬进 IDB */
  function adoptLegacy(old) {
    var m = { v: 3, rev: dbRev(old), notes: [] }, i, n;
    for (i = 0; i < old.notes.length; i++) {
      n = old.notes[i];
      if (!n || !n.id) { continue; }
      LEGACY[n.id] = { h: n.titleHtml || '', b: n.bodyHtml || '', t: n.thumbSrc || '' };
      m.notes.push(metaOf(n));
    }
    /* 该条正文已随旧包读过，不必再回读 */
    return m;
  }
  /* [V34] 一旦见过非空索引，空库就永久失去落盘资格（除显式清空） */
  var hadLettersOnce = false;
  function load() {
    /* 1) 先用 localStorage 快照同步渲染首屏（没有就空库） */
    var snapV3 = parseDB(lsGetRaw(K_IDX));
    if (snapV3) { DB = snapV3; if (snapV3.notes.length) { hadLettersOnce = true; } }
    else {
      var oldPack = parseDB(lsGetRaw(KEY)) || parseDB(lsGetRaw(BAK_KEY));
      DB = oldPack ? adoptLegacy(oldPack) : emptyDB();
    }
    /* 2) 等 IndexedDB 就绪后以 IDB 为准（含旧数据迁移 / 正文搬迁） */
    loadFromIdb();
    /* 兜底：IDB 不可用 / 长时间没就绪时不永久卡住交互 */
    setTimeout(settle, 1500);
  }
  function loadFromIdb() {
    var api = storeApi();
    if (!api || typeof api.idbGet !== 'function') { return; }
    /* 索引确认放行：此前被 hold 的写盘在这里补上，正文也跟着落库 */
    function pass() {
      idxChecked = true;
      if (idbWriteHold) { idbWriteHold = false; save(); }
    }
    var run = function () {
      Promise.all([api.idbGet(K_IDX), api.idbGet(BAK_KEY), api.idbGet(KEY)]).then(function (r) {
        var idxOk = !!parseDB(r[0]);
        var fromIdb = parseDB(r[0]) || parseDB(r[1]);
        /* 旧版本把 .bak 也塞进了 IDB：主键正常时清掉它，免得旧数据复活、白占空间 */
        if (idxOk && typeof api.idbRemove === 'function') { try { api.idbRemove(BAK_KEY); } catch (e) {} }
        if (!fromIdb) {
          var oldPack = parseDB(r[2]);
          if (oldPack) {
            /* 旧版整包迁移：索引立刻可用，正文交给后台分批搬，界面零等待 */
            DB = adoptLegacy(oldPack);
            if (DB.notes.length) { hadLettersOnce = true; }
            bootSettled = true;
            pass();
            save();
            settle();
            scheduleLegacyMove();
            return;
          }
          /* [V34] IDB 索引缺失：先从本机保险副本回滚，绝不再拿空库去做「首次迁移」——
             旧实现在这一步无条件 save()，会把刚丢的索引用空壳钉死在 IDB 里，从此再无翻身机会。 */
          var vGet = (typeof api.idbGet === 'function')
            ? api.idbGet('__xj_vault.' + K_IDX)
            : Promise.resolve(null);
          vGet.then(function (vraw) {
            var vDB = null;
            if (vraw) {
              try {
                var vrec = JSON.parse(vraw);
                var inner = vrec && vrec.v;
                vDB = parseDB(typeof inner === 'string' ? inner : (inner ? JSON.stringify(inner) : ''));
              } catch (eV) { vDB = null; }
            }
            if (vDB && vDB.notes.length && !DB.notes.length) {
              DB = vDB;
              hadLettersOnce = true;
              try { refreshView(); } catch (eR) { /* 忽略 */ }
              try { toast('信件索引已从本机保险副本恢复'); } catch (eT2) { /* 忽略 */ }
            }
            bootSettled = true;
            pass();
            if (DB.notes.length > 0) { save(); }
            settle();
            scheduleLegacyMove();
          })['catch'](function () {
            bootSettled = true;
            pass();
            settle();
          });
          return;
        }
        idbLoaded = true;
        if (fromIdb.notes.length) { hadLettersOnce = true; }
        if (ST.editId) { pass(); settle(); return; }   /* 正在撰写：不打断 */
        if (preferA(fromIdb, DB)) {
          DB = fromIdb;
          refreshView();
        }
        writeSnap();
        pass();
        settle();
        scheduleLegacyMove();
      })['catch'](function () { settle(); });
    };
    if (typeof api.onReady === 'function') { api.onReady(run); } else { run(); }
  }
  /* 正文搬迁：只在浏览器空闲时小批量写，切后台进一步降速，避免长时间占线程发热 */
  function scheduleLegacyMove() {
    if (legacyMoveOn) { return; }
    var ids = [], k;
    for (k in LEGACY) { if (Object.prototype.hasOwnProperty.call(LEGACY, k) && !BODY[k]) { ids.push(k); } }
    if (!ids.length) { return; }
    var api = storeApi();
    if (!api || typeof api.idbSet !== 'function') { return; }
    legacyMoveOn = true;
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 300); };
    var i = 0, BATCH = 12, allOk = true;
    function step() {
      if (document.hidden) { setTimeout(step, 1500); return; }
      var c = 0;
      while (i < ids.length && c < BATCH) {
        var id = ids[i++], b = LEGACY[id];
        if (b && !BODY[id]) { try { api.idbSet(bodyKey(id), JSON.stringify(b)); } catch (e) { allOk = false; } }
        c++;
      }
      if (i < ids.length) { idle(step); return; }
      /* 全部搬完：旧整包瘦身成纯索引（正文不再存两份，也不长期占内存） */
      if (allOk) {
        try {
          var slim = { v: 2, rev: dbRev(DB), notes: [] }, j;
          for (j = 0; j < DB.notes.length; j++) { slim.notes.push(metaOf(DB.notes[j])); }
          api.idbSet(KEY, JSON.stringify(slim));
          LEGACY = {};
        } catch (e) {}
      }
    }
    idle(step);
  }
  function refreshView() {
    try {
      if (ST.editId) { return; }
      if (ST.view === 'stats') { setView('list'); return; }
      renderList();
    } catch (e) {}
  }
  /* 秒开快照：只写轻量索引副本；force=true 用于切后台时尽最大努力同步落盘 */
  function writeSnap(s, force) {
    var csv = s;
    if (typeof csv !== 'string') { try { csv = JSON.stringify(DB); } catch (e) { return false; } }
    if (csv.length > SNAP_MAX) {
      /* 快照只是秒开加速，库太大就只留 IDB：旧快照一并清掉，免得首屏读到过期数据；
         也避免每次切后台都同步写一份上兆的字符串把主线程卡住 */
      lsDrop(K_IDX); lsDrop(BAK_KEY);
      return false;
    }
    var ok = lsSetRaw(K_IDX, csv);
    /* .bak 只在切后台 / 关页时补一份：日常编辑不把同一份大字符串写两遍，减少主线程同步写 */
    if (ok && force) { lsSetRaw(BAK_KEY, csv); }
    return ok;
  }
  var saveFailShown = false;
  var savePending = false, saveIdleOn = false;
  /* 落盘：索引写 K_IDX（进内存镜像，数据管理可统计），正文只写改动过的那一条 */
  function save(force) {
    /* [V34] 空库写保护。真实事故链：IDB 读抖动 → fromIdb=null → 空库 save() →
       空库带着更大的 rev 落盘 → 之后每次裁决都是空库赢 → 信件永久消失（rev 还会一路涨）。
       这里从落盘入口直接掐断，宁可这次不存，也不能把真库冲掉。 */
    if (DB.notes.length === 0 && hadLettersOnce) {
      try { toast('信件库读取异常（当前为空），已阻止写入以免覆盖原有信件'); } catch (eB) { /* 忽略 */ }
      return false;
    }
    /* [V34] 首读闸门：IDB 里的权威索引还没回读确认（idxChecked=false）时，
       绝不允许把「当前这个可能来自旧快照/空库的 DB」写进 IDB —— 旧实现在
       fromIdb=null 时无条件 save()，一次读取抖动就能把真索引换成空壳。 */
    if (!idxChecked && !force) {
      if (DB.notes.length === 0) { return false; }
      return writeSnap(JSON.stringify(DB), false);
    }
    DB.v = 3;
    DB.rev = dbRev(DB) + 1;
    if (force) { return commitSave(true); }
    /* 撰写过程中合并写盘：只保留最新一次，并挑空闲时做，避免每个字都 stringify 整库索引 */
    savePending = true;
    if (!saveIdleOn) {
      saveIdleOn = true;
      var idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 150); };
      try { idle(function () { saveIdleOn = false; if (savePending) { savePending = false; commitSave(false); } }, { timeout: 700 }); }
      catch (e) { saveIdleOn = false; return commitSave(false); }
    }
    return true;
  }
  function commitSave(force) {
    savePending = false;
    var s;
    try { s = JSON.stringify(DB); } catch (e) { return false; }
    var snapOk = writeSnap(s, force);
    flushBodies();
    if (!bootSettled) { bootPendingSave = true; return snapOk; }
    if (!idxChecked) { idbWriteHold = true; return snapOk; }
    var api = storeApi();
    var putFn = (api && typeof api.idbSetOnly === 'function') ? api.idbSetOnly : (api ? api.idbSet : null);
    if (api && typeof putFn === 'function') {
      putFn.call(api, K_IDX, s).then(function (ok) {
        if (!ok) {
          /* IDB 写失败：至少把索引压进 localStorage（尽力而为），正文另有单条通道 */
          if (!snapOk) { snapOk = lsSetRaw(K_IDX, s); }
          onSaveFail(snapOk);
        } else { saveFailShown = false; }
      })['catch'](function () { onSaveFail(snapOk); });
      return true;
    }
    onSaveFail(snapOk);
    return snapOk;
  }
  /* 正文写盘：一条一写，绝不整库重写 */
  function flushBodies() {
    var api = storeApi(), id;
    if (!api || typeof api.idbSet !== 'function') { return; }
    if (!idxChecked) { return; }   /* 索引未确认前不写正文，等首读收尾后统一补写 */
    for (id in dirtyBody) {
      if (!Object.prototype.hasOwnProperty.call(dirtyBody, id)) { continue; }
      delete dirtyBody[id];
      var b = BODY[id];
      if (!b) { continue; }
      try { api.idbSet(bodyKey(id), JSON.stringify(b)); } catch (e) {}
    }
  }
  function markBody(id) { if (id) { dirtyBody[id] = 1; } }
  /* 正文缓存：上限 24 条，超出丢最久没碰的，避免翻很多封信后内存越吃越多 */
  function keepBody(id) {
    var at = BODY_ORDER.indexOf(id);
    if (at >= 0) { BODY_ORDER.splice(at, 1); }
    BODY_ORDER.push(id);
    while (BODY_ORDER.length > 24) {
      var old = BODY_ORDER.shift();
      if (old === ST.editId) { BODY_ORDER.push(old); break; }
      if (dirtyBody[old]) { continue; }
      delete BODY[old];
    }
  }
  /* 按需取正文：内存 → 旧版包回落 → IDB 单条，全程异步不阻塞 */
  function ensureBody(id, cb, force) {
    if (!id) { cb({ h: '', b: '', t: '' }); return; }
    if (!force && BODY[id]) { keepBody(id); cb(BODY[id]); return; }
    if (!force && LEGACY[id] && !BODY[id]) { BODY[id] = LEGACY[id]; keepBody(id); cb(BODY[id]); return; }
    var wait = bodyWait[id];
    if (wait) { wait.push(cb); return; }
    bodyWait[id] = [cb];
    var done = function (v) {
      var list = bodyWait[id] || [];
      delete bodyWait[id];
      if (v) { BODY[id] = v; keepBody(id); }
      for (var i = 0; i < list.length; i++) { try { list[i](v || { h: '', b: '', t: '' }); } catch (e) {} }
    };
    var api = storeApi();
    if (!api || typeof api.idbGet !== 'function') { done(LEGACY[id] || null); return; }
    api.idbGet(bodyKey(id)).then(function (s) {
      var o = null;
      if (s) { try { o = JSON.parse(s); } catch (e) { o = null; } }
      if (!o) { o = LEGACY[id] || null; }
      done(o);
    })['catch'](function () { done(LEGACY[id] || null); });
  }
  /* 列表卡片的缩略图同样按需取，取到后由渲染层补上 */
  function ensureThumb(id, cb) {
    if (THUMB[id] !== undefined) { cb(THUMB[id]); return; }
    ensureBody(id, function (b) { THUMB[id] = b.t || ''; cb(THUMB[id]); });
  }
  function onSaveFail(ok) {
    if (ok) { saveFailShown = false; return; }
    if (!saveFailShown) { saveFailShown = true; toast('未能写入本机存储 · 请允许本站使用本地存储'); }
  }
  function noteById(id) { for (var i = 0; i < DB.notes.length; i++) { if (DB.notes[i].id === id) { return DB.notes[i]; } } return null; }

  /* 对方角色：只认账号设置里创建的角色，不再从信件反推幽灵分组 */
  function roles() {
    var out = [], raw = get('snowcrystal.account.partners.v1', ''), i;
    if (!raw) { return out; }
    try {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].name) {
            var nm = '给' + String(arr[i].name).trim();
            if (out.indexOf(nm) < 0) { out.push(nm); }
          }
        }
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- 状态 ---------------- */
  var ST = {
    view: 'list',            // list | stats
    box: 'all',              // all | letter | dream  （两个列表 + 全部）
    group: 'all',            // all | 角色名 | 未署名 | 梦境记录
    paperTab: '纯色',
    tool: '',                // font | paper | ''（键盘为瞬时）
    kbOn: false,
    editId: null,
    editStart: 0,
    sessionSec: 0,
    hist: [], histIdx: -1,
    lastRange: null,
    activeField: null,
    pendingFont: null
  };

  /* ---------------- 列表渲染 ---------------- */
  var fCache = null, fKey = '';
  function filteredNotes() {
    /* 过滤 + 排序结果按「版本号 + 条数 + 当前分组」缓存：滚动续页、反复重绘都不用重排全库 */
    /* 来信存在云笺自己的 letters 键里（与 DB 索引库不同源），这里直接取，避免跨作用域依赖 */
    var ldb = null, larr = [], letN = 0, lsig = '', li;
    try { ldb = JSON.parse(localStorage.getItem('snowcrystal.letters.v1') || 'null'); } catch (e) { ldb = null; }
    larr = (ldb && ldb.letters) || []; letN = larr.length;
    for (li = 0; li < letN; li++) { lsig += (larr[li].id || '') + (larr[li].read ? '1' : '0') + ','; }
    var key = dbRev(DB) + '|' + DB.notes.length + '|' + letN + '|' + lsig + '|' + ST.box + '|' + ST.group;
    if (fCache && fKey === key) { return fCache; }
    var arr = DB.notes.filter(function (n) {
      /* 「梦境记录」是跨笺匣的独立分组：只收枕梦录的梦笺 */
      if (ST.group === '梦境记录') { return n.kind === 'dream'; }
      if (ST.box === 'letter' && n.kind !== 'letter') { return false; }
      if (ST.box === 'dream' && n.kind !== 'dream') { return false; }
      if (ST.group === 'all') { return true; }
      /* 按对方角色的分组只属于寄远书，梦笺无收笺人，不进人分组 */
      if (n.kind === 'dream') { return false; }
      if (ST.group === '未署名') { return n.to === '未署名'; }
      return n.to === ST.group;
    }).sort(function (a, b) { return a.updated < b.updated ? 1 : (a.updated > b.updated ? -1 : 0); });
    /* [V36] 「全部云笺」也收对方角色写给我方的信：来信存在 DB.letters（dir:'in'），
       原先只在分组页「我方角色」里可见；这里合成只读卡片并入列表，点开仍是信件弹层。 */
    if (ST.group === 'all' && ST.box !== 'dream' && letN) {
      var i2, L2, ps2;
      for (i2 = 0; i2 < larr.length; i2++) {
        L2 = larr[i2];
        if (!L2 || L2.dir !== 'in') { continue; }
        ps2 = letterCardOf(L2);
        arr.push(ps2);
      }
      arr.sort(function (a, b) { return noteTs(b) - noteTs(a); });
    }
    fCache = arr; fKey = key;
    return arr;
  }
  /* 来信 → 列表卡片用的只读条目（id 加 L: 前缀，避免与笔记 id 撞车） */
  function letterCardOf(L) {
    var txt = String(L.text || '').replace(/\s+/g, ' ').trim();
    return {
      id: 'L:' + L.id, lid: L.id, letter: true, kind: 'letter',
      to: L.sign || '对方', title: L.title || ('来自' + (L.sign || '对方') + '的信'),
      ex: txt.length > 180 ? txt.slice(0, 180) : txt,
      created: L.created, updated: L.created,
      words: String(L.text || '').replace(/\s/g, '').length
    };
  }
  /* 混排时间基准：笔记 created 是 'YYYY-MM-DD' 字符串，来信 created 是毫秒数 */
  function noteTs(o) {
    var c = o && o.created;
    if (typeof c === 'number') { return c; }
    var t = Date.parse(String(c || '').slice(0, 10).replace(/-/g, '/'));
    return isNaN(t) ? 0 : t;
  }
  function dateLabel(s) {
    var p = String(s).split('-'); if (p.length < 3) { return s; }
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return (+p[1]) + '/' + (+p[2]) + ' · ' + WEEK[d.getDay()];
  }
  function excerpt(html) {
    return excerptOf(html);
  }
  /* 取纯文本摘要：走正则剥标签，比建临时 div 走 innerHTML 快一个量级，
     长列表反复算摘要时这点差别很关键；摘要随元数据入库，列表渲染不再碰正文 */
  function excerptOf(html) {
    if (!html) { return ''; }
    var t = String(html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    t = t.replace(/\s+/g, ' ').trim();
    return t.length > 180 ? t.slice(0, 180) : t;
  }
  function boxLabel() {
    if (ST.group !== 'all') { return ST.group; }
    return ST.box === 'letter' ? '寄远书' : (ST.box === 'dream' ? '枕梦录' : '全部云笺');
  }
  /* ---------------- 列表：分页加载 + 虚拟列表 ----------------
     分页：一次只把最近 60 条铺进可滚动区域，滚到底再续 60 条（50～100 区间内）；
     虚拟：DOM 里始终只有可视区上下各一屏的卡片（约 10～16 个），
           信笺再多也不会有上千节点参与排版、重绘与合成，滚动自然不卡、不烫。
     卡片结构 / 类名 / data-id / 事件委托全部沿用原样，视觉与交互不变。 */
  var PAGE = 60;
  var VL = {
    key: '', list: [], off: [], h: [], limit: 0, gap: 14,
    from: -1, to: -1, total: 0, raf: 0, ro: null, bound: false, cardsTop: 0,
    hEst: [0, 0], settle: 0
  };

  function vlScale() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui'));
    return (v > 0 ? v : 1);
  }
  /* 行高先估算，渲染出来之后由 ResizeObserver 按实测值校正；
     hEst 记住「有图 / 无图」两档实测高度，未渲染过的条目直接套用，滚动时总高不再忽长忽短 */
  function vlEstH(n) {
    var k = n.thumb ? 1 : 0;
    if (VL.hEst[k]) { return VL.hEst[k]; }
    var u = vlScale();
    return Math.round((n.thumb ? 140 : 116) * u);
  }
  /* 重算前缀偏移与容器高度：只算到「已加载」为止，条数再多也是线性小开销 */
  function vlReflow() {
    var i, acc = 0, off = VL.off, h = VL.h;
    for (i = 0; i < VL.limit; i++) {
      off[i] = acc;
      acc += (h[i] || vlEstH(VL.list[i] || {})) + VL.gap;
    }
    VL.total = acc > 0 ? acc - VL.gap : 0;
    var cards = $('xjlCards');
    if (cards) { cards.style.height = VL.total + 'px'; }
    vlPlace();
  }
  /* 二分：找纵坐标 y 落在哪一行 */
  function vlFind(y) {
    var lo = 0, hi = VL.limit - 1, mid, hh;
    if (hi < 0) { return 0; }
    while (lo <= hi) {
      mid = (lo + hi) >> 1;
      hh = VL.h[mid] || vlEstH(VL.list[mid] || {});
      if (VL.off[mid] + hh < y) { lo = mid + 1; }
      else if (VL.off[mid] > y) { hi = mid - 1; }
      else { return mid; }
    }
    return Math.max(0, Math.min(VL.limit - 1, lo));
  }
  /* 来信卡片时间戳是毫秒数，就地格式化，不跨作用域借写信模块的 fmtDate */
  function vlDate(t) {
    if (typeof t === 'number') { var d = new Date(t); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
    return String(t || '');
  }
  /* [V44] 左滑操作层：只保留「删除」（「打开」键与相关分支已移除）；卡片内容统一包进 .xjl-card-in 以便整体位移 */
  var SW_ACTS = '<div class="xjl-sw-acts">' +
      '<button type="button" class="xjl-sw-btn is-del" data-sw="del" aria-label="删除">' +
        '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>' +
      '</button></div>';
  function vlCardHTML(n, idx) {
    var top = ' data-vl="' + idx + '" style="top:' + VL.off[idx] + 'px">';
    /* [V36] 对方来信：只读卡片，点开走信件弹层 */
    if (n.letter) {
      return '<article class="xjl-card is-letter" data-lid="' + esc(n.lid) + '"' + top + SW_ACTS + '<div class="xjl-card-in">' +
               '<div class="xjl-card-top"><span class="xjl-card-title">' + esc(n.title || n.ex || '无题') + '</span>' +
               '<span class="xjl-card-date">' + esc(vlDate(n.created)) + '</span></div>' +
               '<div class="xjl-card-body"><div class="xjl-card-excerpt">' + esc(n.ex || '（空白信）') + '</div></div>' +
               '<div class="xjl-card-meta"><span class="xjl-chip is-in">来信</span>' +
               '<span>来自 ' + esc(n.to) + '</span><span>·</span><span>' + (n.words || 0) + ' 字</span></div>' +
             '</div></article>';
    }
    var thumb = '';
    if (n.thumb) {
      var src = THUMB[n.id];
      thumb = src
        ? '<div class="xjl-card-thumb"><img src="' + esc(src) + '" alt=""></div>'
        : '<div class="xjl-card-thumb" data-thumb="' + esc(n.id) + '"><div class="xjl-thumb-paper"><i></i><i></i><i></i><i></i></div></div>';
    }
    return '<article class="xjl-card" data-id="' + esc(n.id) + '"' + top + SW_ACTS + '<div class="xjl-card-in">' +
             '<div class="xjl-card-top"><span class="xjl-card-title">' + esc(n.title || n.ex || '无题') + '</span>' +
             '<span class="xjl-card-date">' + esc(dateLabel(n.created)) + '</span></div>' +
             '<div class="xjl-card-body"><div class="xjl-card-excerpt">' + esc(n.ex || '（空白笺）') + '</div>' + thumb + '</div>' +
             '<div class="xjl-card-meta"><span class="xjl-chip">' + esc(n.kind === 'dream' ? '枕梦录' : '寄远书') + '</span>' +
             '<span>' + (n.kind === 'dream' ? '夜记' : '致 ' + esc(n.to)) + '</span><span>·</span><span>' + (n.words || 0) + ' 字</span></div>' +
           '</div></article>';
  }
  /* 缩略图按需补：先摆同尺寸纸纹占位，取到再换上，卡片高度不会跳 */
  function vlThumb(box) {
    var id = box.getAttribute('data-thumb');
    ensureThumb(id, function (src) {
      if (!src || !box || !box.isConnected) { return; }
      box.removeAttribute('data-thumb');
      box.innerHTML = '<img src="' + esc(src) + '" alt="">';
    });
  }
  function vlObserve(cards) {
    var els = cards.querySelectorAll('.xjl-card[data-vl]'), i;
    if (!VL.ro && typeof ResizeObserver !== 'undefined') {
      VL.ro = new ResizeObserver(function (ents) {
        var dirty = false, j;
        for (j = 0; j < ents.length; j++) {
          var el = ents[j].target;
          var idx = parseInt(el.getAttribute('data-vl'), 10);
          if (!(idx >= 0) || idx >= VL.limit) { continue; }
          var hh = Math.round(el.offsetHeight || 0);
          if (hh && Math.abs(hh - VL.h[idx]) >= 1) { VL.h[idx] = hh; dirty = true; }
          /* 同档（有图 / 无图）的首个实测量作为该档标准行高，未渲染过的条目照它排 */
          var nk = (VL.list[idx] && VL.list[idx].thumb) ? 1 : 0;
          if (hh && !VL.hEst[nk]) { VL.hEst[nk] = hh; dirty = true; }
        }
        if (dirty) { vlRemeasure(); vlPaint(true); requestAnimationFrame(vlEnsureView); }
      });
    }
    if (VL.ro) {
      VL.ro.disconnect();
      for (i = 0; i < els.length; i++) { VL.ro.observe(els[i]); }
    }
  }
  /* 把已渲染卡片的 top 对回最新前缀偏移（行高实测修正后调用） */
  function vlPlace() {
    var cards = $('xjlCards'), i, el, idx;
    if (!cards) { return; }
    for (i = 0; i < cards.children.length; i++) {
      el = cards.children[i];
      idx = parseInt(el.getAttribute('data-vl'), 10);
      if (idx >= 0 && idx < VL.limit) { el.style.top = VL.off[idx] + 'px'; }
    }
  }
  /* 行高实测修正后重排：以当前已渲染的首卡为锚，用它的屏幕位置差补偿 scrollTop，内容不跳 */
  function vlRemeasure() {
    var sc = $('xjlListScroll'), cards = $('xjlCards'), anchor = null, i, idx;
    if (!sc || !cards || !VL.limit) { vlReflow(); return; }
    for (i = 0; i < cards.children.length; i++) {
      idx = parseInt(cards.children[i].getAttribute('data-vl'), 10);
      if (idx >= 0) { anchor = cards.children[i]; break; }
    }
    var before = anchor ? anchor.getBoundingClientRect().top : 0;
    vlReflow();
    if (anchor) {
      var after = anchor.getBoundingClientRect().top;
      if (after !== before) { sc.scrollTop = Math.max(0, sc.scrollTop + (after - before)); }
    }
  }
  /* 画可视窗口：只增删边缘卡片，已渲染的节点原样复用（缩略图不会重新解码，滚动更稳） */
  function vlPaint(force) {
    var sc = $('xjlListScroll'), cards = $('xjlCards');
    if (!sc || !cards || !VL.limit) { return; }
    var st = sc.scrollTop, vh = sc.clientHeight || 600;
    var cardsTop = cards.getBoundingClientRect().top - sc.getBoundingClientRect().top + st;
    VL.cardsTop = cardsTop;
    var viewTop = st - cardsTop;
    var from = vlFind(Math.max(0, viewTop - vh * 0.6));
    var to = vlFind(viewTop + vh * 1.6) + 1;
    /* 快滚到已加载尾部：续下一页（在当前帧之后做，滚动本身不掉帧） */
    if (viewTop + vh > VL.off[VL.limit - 1] - vh * 0.6 && VL.limit < VL.list.length) {
      setTimeout(vlMore, 0);
    }
    from = Math.max(0, from - 2);
    to = Math.min(VL.limit, to + 2);
    if (!force && from === VL.from && to === VL.to) { return; }
    VL.from = from; VL.to = to;
    var i, el, idx, k, kids = cards.children;
    /* 1) 先摘掉窗口外的卡片（正常滚动一次只动一两张） */
    for (k = kids.length - 1; k >= 0; k--) {
      el = kids[k];
      idx = parseInt(el.getAttribute('data-vl'), 10);
      if (!(idx >= from && idx < to)) { cards.removeChild(el); }
    }
    /* 2) 再补上缺的：按位置插入，DOM 顺序与滚动顺序保持一致 */
    var have = {};
    for (k = 0; k < cards.children.length; k++) {
      have[cards.children[k].getAttribute('data-vl')] = 1;
    }
    for (i = from; i < to; i++) {
      if (have[i]) { continue; }
      var tmp = document.createElement('div');
      tmp.innerHTML = vlCardHTML(VL.list[i], i);
      el = tmp.firstChild;
      var after = null, j, ci;
      for (j = 0; j < cards.children.length; j++) {
        ci = parseInt(cards.children[j].getAttribute('data-vl'), 10);
        if (ci > i) { after = cards.children[j]; break; }
      }
      cards.insertBefore(el, after);
    }
    vlObserve(cards);
    var ths = cards.querySelectorAll('[data-thumb]');
    for (i = 0; i < ths.length; i++) { vlThumb(ths[i]); }
  }
  /* 续下一页：只加高度与待渲染清单，正文早已在元数据里，不会去读 IDB */
  function vlMore() {
    if (VL.limit >= VL.list.length) { return; }
    VL.limit = Math.min(VL.list.length, VL.limit + PAGE);
    vlReflow();
    vlPaint(false);
  }
  /* 保险：快滚 / 行高重排后若可视区里一张卡都没有，按当前滚动位置强制重画一次 */
  function vlEnsureView() {
    var sc = $('xjlListScroll'), cards = $('xjlCards');
    if (!sc || !cards || !VL.limit || !cards.children.length) { return; }
    var st = sc.scrollTop;
    var cardsTop = cards.getBoundingClientRect().top - sc.getBoundingClientRect().top + st;
    var top = st - cardsTop, bot = top + (sc.clientHeight || 600), ok = false, i, el;
    for (i = 0; i < cards.children.length; i++) {
      el = cards.children[i];
      if (el.offsetTop + el.offsetHeight > top && el.offsetTop < bot) { ok = true; break; }
    }
    if (!ok) { vlPaint(true); }
  }
  function vlBind() {
    if (VL.bound) { return; }
    VL.bound = true;
    var sc = $('xjlListScroll');
    if (!sc) { return; }
    sc.addEventListener('scroll', function () {
      if (VL.raf) { return; }
      VL.raf = requestAnimationFrame(function () { VL.raf = 0; vlPaint(false); vlEnsureView(); });
      /* 甩动停下来后再校一次，保证绝不出现空白帧 */
      clearTimeout(VL.settle);
      VL.settle = setTimeout(function () { vlPaint(false); vlEnsureView(); }, 140);
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (!VL.limit) { return; }
      /* 宽度变了，行高缓存与标准档全部作废，按新宽度重新实测 */
      VL.h = []; VL.hEst = [0, 0];
      vlRemeasure(); vlPaint(true);
    });
  }
  function vlReset(list) {
    var cards = $('xjlCards'), sc = $('xjlListScroll');
    var key = ST.box + '|' + ST.group + '|' + ST.view;
    /* 同一分组内重排（删除 / 改完返回）保留原滚动位置，切分组才回顶 */
    var keep = (VL.key === key && VL.list.length > 0);
    var st = (keep && sc) ? sc.scrollTop : 0;
    VL.key = key;
    VL.list = list;
    VL.off = [];
    VL.h = [];
    VL.limit = Math.min(list.length, PAGE);
    VL.from = -1; VL.to = -1;
    if (cards) {
      var g = parseFloat(getComputedStyle(cards).rowGap);
      VL.gap = (g > 0 ? g : 14);
      cards.classList.add('is-vl');
      /* 重排是一次性重建，先清掉旧节点，避免 diff 复用过期内容 */
      cards.innerHTML = '';
    }
    for (var i = 0; i < VL.limit; i++) { VL.h[i] = 0; }
    vlReflow();
    if (sc) { sc.scrollTop = st; }
    vlPaint(true);
  }
  function renderList() {
    var rs = roles();
    /* 角色在账号设置里被删掉时，自动回到「全部云笺」，不留幽灵分组 */
    if (ST.group !== 'all' && ST.group !== '未署名' && ST.group !== '梦境记录' && rs.indexOf(ST.group) < 0) { ST.group = 'all'; }
    $('xjlTitleText').textContent = boxLabel();
    var list = filteredNotes();
    var cards = $('xjlCards');
    if (!list.length) {
      /* [V39] 首页空态白卡与提示文案已移除：空列表时保持空白纸面 */
      if (cards) {
        cards.classList.remove('is-vl');
        cards.style.height = '';
        if (VL.ro) { VL.ro.disconnect(); }
        cards.innerHTML = '';
      }
      VL.key = ''; VL.list = []; VL.limit = 0; VL.from = -1; VL.to = -1;
    } else {
      vlBind();
      vlReset(list);
    }
    $('xjlBoxBtn').classList.toggle('is-on', ST.view === 'list');
    $('xjlStatsBtn').classList.toggle('is-on', ST.view === 'stats');
  }

  /* ---------------- 图标：与全站一致的实心圆润风格 ---------------- */
  var ICO = {
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6 14.2 9.4 21 11.6 14.2 13.8 12 20.6 9.8 13.8 3 11.6 9.8 9.4z"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.4a4.5 4.5 0 1 1 0-9 4.5 4.5 0 1 1 0 9zm0 2.2c4.3 0 7.2 2.3 7.2 5.4 0 .8-.6 1.4-1.4 1.4H6.2c-.8 0-1.4-.6-1.4-1.4 0-3.1 2.9-5.4 7.2-5.4z"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/><circle cx="18.4" cy="4.4" r="1.6"/></svg>',
    dream: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',
    ring: '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 1 1 0-17.6zm0 2.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>',
    letter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>'
  };

  /* ---------------- 分组菜单（按对方角色） ---------------- */
  function renderMenu() {
    function item(key, label, icon, on) {
      return '<button type="button" class="xjl-menu-item' + (on ? ' is-on' : '') + '" data-group="' + esc(key) + '">' +
             '<span class="xjl-mi-ico">' + icon + '</span>' + esc(label) + '</button>';
    }
    var rs = roles(), h = '<div class="xjl-menu-cap">' + (rs.length ? '按对方角色' : '云笺') + '</div>';
    h += item('all', '全部云笺', ICO.star, ST.group === 'all');
    for (var i = 0; i < rs.length; i++) {
      h += item(rs[i], rs[i], ICO.person, ST.group === rs[i]);
    }
    if (!rs.length) {
      h += '<div class="xjl-menu-hint">在「账号设置」里添加对方角色后，<br>这里会出现按角色的分组。</div>';
    }
    h += item('梦境记录', '梦境记录', ICO.moon, ST.group === '梦境记录');
    h += item('未署名', '未署名', ICO.ring, ST.group === '未署名');
    h += '<div class="xjl-menu-sep"></div><div class="xjl-menu-cap">笺匣</div>';
    h += '<button type="button" class="xjl-menu-item' + (ST.box === 'all' ? ' is-on' : '') + '" data-box="all"><span class="xjl-mi-ico">' + ICO.box + '</span>全部笺匣</button>';
    h += '<button type="button" class="xjl-menu-item' + (ST.box === 'letter' ? ' is-on' : '') + '" data-box="letter"><span class="xjl-mi-ico">' + ICO.letter + '</span>寄远书</button>';
    h += '<button type="button" class="xjl-menu-item' + (ST.box === 'dream' ? ' is-on' : '') + '" data-box="dream"><span class="xjl-mi-ico">' + ICO.dream + '</span>枕梦录</button>';
    $('xjlMenu').innerHTML = h;
  }
  function toggleMenu(on) {
    var m = $('xjlMenu'), k = $('xjlMenuMask');
    if (on) { renderMenu(); }
    m.classList.toggle('is-on', !!on); k.classList.toggle('is-on', !!on);
    $('xjlTitleBtn').classList.toggle('is-open', !!on);
  }
  function toggleBox(on, mode) {
    var b = $('xjlBox'), k = $('xjlBoxMask');
    if (mode === 'role') {
      var h = '<div class="xjl-box-cap">致 · 选择对方角色</div>';
      var opts = ['未署名'].concat(roles());
      for (var i = 0; i < opts.length; i++) {
        h += '<button type="button" class="xjl-role-item' + (ST.rolePick === opts[i] ? ' is-on' : '') + '" data-role="' + esc(opts[i]) + '">' +
             '<i style="--xjl-pf-c:' + colorOf(opts[i]) + '"></i>' + esc(opts[i]) + '</button>';
      }
      if (opts.length === 1) { h += '<div class="xjl-menu-hint">还没有对方角色，<br>可到「账号设置」里添加。</div>'; }
      h += '<div class="xjl-menu-sep"></div><button type="button" class="xjl-role-item" data-role="__home"><i style="--xjl-pf-c:var(--accent)"></i>返回雪晶首页</button>';
      b.innerHTML = h;
    } else {
      b.innerHTML = '<div class="xjl-box-cap">笺匣</div>' +
        '<button type="button" class="xjl-box-item' + (ST.box === 'all' ? ' is-on' : '') + '" data-box="all"><span class="xjl-box-ico"><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path fill-rule="evenodd" d="M6.4 3.2h11.2a3.2 3.2 0 0 1 3.2 3.2v11.2a3.2 3.2 0 0 1-3.2 3.2H6.4a3.2 3.2 0 0 1-3.2-3.2V6.4a3.2 3.2 0 0 1 3.2-3.2zm1 4.6a1.2 1.2 0 0 0 0 2.4h9.2a1.2 1.2 0 0 0 0-2.4H7.4zm0 4.2a1.2 1.2 0 0 0 0 2.4h6a1.2 1.2 0 0 0 0-2.4h-6z"/></svg></span><span class="xjl-box-txt"><span class="xjl-box-name">全部云笺</span><span class="xjl-box-desc">寄远书与枕梦录</span></span></button>' +
        '<button type="button" class="xjl-box-item' + (ST.box === 'letter' ? ' is-on' : '') + '" data-box="letter"><span class="xjl-box-ico"><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg></span><span class="xjl-box-txt"><span class="xjl-box-name">寄远书</span><span class="xjl-box-desc">写给对方角色的信</span></span></button>' +
        '<button type="button" class="xjl-box-item' + (ST.box === 'dream' ? ' is-on' : '') + '" data-box="dream"><span class="xjl-box-ico"><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/><circle cx="18.4" cy="4.4" r="1.6"/></svg></span><span class="xjl-box-txt"><span class="xjl-box-name">枕梦录</span><span class="xjl-box-desc">夜里记下的梦</span></span></button>' +
        '<div class="xjl-menu-sep"></div><button type="button" class="xjl-role-item" data-role="__home"><i style="--xjl-pf-c:#a6bfe4"></i>返回雪晶首页</button>';
    }
    b.classList.toggle('is-on', !!on); k.classList.toggle('is-on', !!on);
    b.setAttribute('data-mode', mode || 'box');
    if (!on) { app.setAttribute('data-boxmode', ''); }
  }
  function setBox(v) {
    ST.box = v; ST.group = 'all';
    toggleBox(false); setView('list'); renderList();
  }

  /* ---------------- 视图切换 ---------------- */
  function setView(v) {
    ST.view = v;
    var vs = app.querySelectorAll('.xjl-view');
    for (var i = 0; i < vs.length; i++) { vs[i].classList.toggle('is-on', vs[i].getAttribute('data-view') === v); }
    $('xjlDock').style.display = (v === 'stats' || v === 'list') ? '' : 'none';
    $('xjlBoxBtn').classList.toggle('is-on', v === 'list');
    $('xjlStatsBtn').classList.toggle('is-on', v === 'stats');
    if (v === 'stats') { renderStats(); }
    else { renderList(); }
    var sc = $(v === 'stats' ? 'xjlStatsScroll' : 'xjlListScroll');
    if (sc) { sc.scrollTop = 0; }
  }

  /* ---------------- 年度笺记（图二） ---------------- */
  /* [V36] 原 themeColor()（按站内外观 accent 取色写死进 SVG）已随渐变一起删除：
     统计页图形改用 --xjs-st-* 纯色变量，跟随写信主题即时变色。 */
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) { return h + ' 小时 ' + m + ' 分钟'; }
    return m + ' 分钟 ' + (sec % 60) + ' 秒';
  }
  function fmtShort(sec) {
    sec = Math.max(0, sec || 0);
    if (sec >= 3600) { return (sec / 3600).toFixed(2) + '时'; }
    if (sec >= 60) { return (sec / 60).toFixed(2) + '分'; }
    return Math.round(sec) + '秒';
  }
  function renderStats() {
    var y = new Date().getFullYear();
    /* [V36] 不再取站内外观色 / 不写内联色值：图形颜色全部交给 CSS 变量（--xjs-st-*），
       写信主题一换就立即变色，不会残留上一个主题的颜色；同时取消全部渐变，只留纯色 */
    var cMain = 'var(--xjs-st-main)', cSoft = 'var(--xjs-st-soft)', cLine = 'var(--xjs-st-line)';
    $('xjlStatsTitle').textContent = y + ' 年度笺记';
    var notes = DB.notes, totalS = 0, totalW = 0, i, j;
    var mDur = [], mWords = [], dayMap = {};
    for (i = 0; i < 12; i++) { mDur.push(0); mWords.push(0); }
    for (i = 0; i < notes.length; i++) {
      var n = notes[i], mo = parseInt(String(n.created).split('-')[1], 10) - 1;
      if (!(mo >= 0 && mo < 12)) { continue; }
      totalS += n.seconds || 0; totalW += n.words || 0;
      mDur[mo] += n.seconds || 0; mWords[mo] += n.words || 0;
      var d = parseInt(String(n.created).split('-')[2], 10) || 1;
      var wk = Math.min(4, Math.floor((d - 1) / 7));
      var k = mo + '-' + wk;
      dayMap[k] = (dayMap[k] || 0) + (n.words || 0);
    }
    $('xjlKpi').innerHTML = esc(fmtDur(totalS)) + ' <em>/</em> ' + totalW + ' 字';
    $('xjlKpiSub').textContent = '共 ' + notes.length + ' 笺 · 落笔于笺上的时间与字迹';

    /* 热力图：12 月 × 5 格（周） */
    var hh = '';
    var maxDay = 1;
    for (var kk in dayMap) { if (dayMap[kk] > maxDay) { maxDay = dayMap[kk]; } }
    for (i = 0; i < 12; i++) {
      hh += '<div class="xjl-heat-col"><div class="xjl-heat-lab">' + pad(i + 1) + '月</div>';
      for (j = 0; j < 5; j++) {
        var v = dayMap[i + '-' + j] || 0, lv = 0;
        if (v > 0) { lv = Math.min(4, 1 + Math.floor(v / maxDay * 3.4)); }
        hh += '<div class="xjl-heat-cell' + (lv ? ' lv' + lv : '') + '"></div>';
      }
      hh += '</div>';
    }
    $('xjlHeat').innerHTML = hh;

    /* 平均 */
    var activeM = 0;
    for (i = 0; i < 12; i++) { if (mDur[i] > 0 || mWords[i] > 0) { activeM++; } }
    var avgS = activeM ? totalS / activeM : 0, avgW = activeM ? totalW / activeM : 0;
    $('xjlAvgDur').innerHTML = '平均 <b>' + Math.floor(avgS / 60) + '</b> 分钟 <b>' + Math.round(avgS % 60) + '</b> 秒';
    $('xjlAvgWords').innerHTML = '平均 <b>' + Math.round(avgW) + '</b> 字';

    /* 时长：尖峰波形 */
    var maxS = Math.max.apply(null, mDur.concat([1]));
    var pts = [], W = 320, H = 92, step = W / 12;
    for (i = 0; i < 12; i++) {
      var val = mDur[i] / maxS;
      pts.push({ x: step * i + step / 2, y: H - 6 - val * (H - 20) });
    }
    var dPath = 'M0 ' + H + ' L0 ' + H;
    for (i = 0; i < 12; i++) {
      var p = pts[i], half = step * .40;
      dPath += ' L' + (p.x - half) + ' ' + (H - 4);
      dPath += ' Q' + (p.x - half * .18) + ' ' + p.y + ' ' + p.x + ' ' + p.y;
      dPath += ' Q' + (p.x + half * .18) + ' ' + p.y + ' ' + (p.x + half) + ' ' + (H - 4);
    }
    dPath += ' L' + W + ' ' + H + ' Z';
    $('xjlDurChart').innerHTML =
      '<path d="' + dPath + '" fill="' + cSoft + '" stroke="' + cLine + '" stroke-width="1.4" stroke-linejoin="round"/>';
    var ax = '';
    for (i = 1; i <= 12; i++) { ax += '<span>' + i + '</span>'; }
    $('xjlDurAxis').innerHTML = ax;

    /* 字数：柱状（底槽 + 实柱，均为纯色） */
    var maxW = Math.max.apply(null, mWords.concat([1]));
    var bars = '';
    for (i = 0; i < 12; i++) {
      var bh = mWords[i] / maxW * (H - 16), x = step * i + step * .22, bw = step * .56;
      bars += '<rect x="' + x + '" y="4" width="' + bw + '" height="' + (H - 8) + '" rx="' + bw / 2 + '" fill="var(--xjs-st-slot)"/>';
      if (bh > 1) {
        bars += '<rect x="' + x + '" y="' + (H - 4 - bh) + '" width="' + bw + '" height="' + bh + '" rx="' + bw / 2 + '" fill="' + cMain + '"/>';
      }
    }
    $('xjlWordsChart').innerHTML = bars;
    $('xjlWordsAxis').innerHTML = ax;

    renderPref();
  }
  /* 落笔偏好：统一口径，字数与时长同列展示，不再按键切换 */
  function renderPref() {
    var map = {}, i, arr = [];
    for (i = 0; i < DB.notes.length; i++) {
      var n = DB.notes[i], k = n.kind === 'dream' ? '枕梦录' : (n.to || '未署名');
      if (!map[k]) { map[k] = { name: k, words: 0, seconds: 0 }; }
      map[k].words += n.words || 0; map[k].seconds += n.seconds || 0;
    }
    for (var k2 in map) { if (map.hasOwnProperty(k2)) { arr.push(map[k2]); } }
    arr.sort(function (a, b) { return b.words - a.words; });
    var max = 0;
    for (i = 0; i < arr.length; i++) { max = Math.max(max, arr[i].words); }
    if (!max) { max = 1; }
    var h = '';
    for (i = 0; i < arr.length; i++) {
      var o = arr[i], val = o.words;
      var main = o.words + '字';
      var sub = fmtShort(o.seconds);
      h += '<div class="xjl-pref-row">' +
             '<i class="xjl-pref-bar" style="--xjl-pf-c:' + colorOf(o.name) + '"></i>' +
             '<span class="xjl-pref-name">' + esc(o.name) + '</span>' +
             '<span class="xjl-pref-track"><i class="xjl-pref-fill" style="width:' + Math.max(3, val / max * 100) + '%"></i></span>' +
             '<span class="xjl-pref-val"><b>' + esc(main) + '</b>' + esc(sub) + '</span>' +
           '</div>';
    }
    $('xjlPrefList').innerHTML = h || '<div class="xjl-empty" style="margin:18px 0">还没有落笔记录</div>';
    $('xjlPrefTip').textContent = '给对方角色的信 · 写信时长与字数累计';
  }

  /* ---------------- 编辑器（图三） ---------------- */
  function wordCount() {
    var t = $('xjlFTitle').textContent || '', b = $('xjlFBody').textContent || '';
    return (t + b).replace(/\s/g, '').length;
  }
  function updateCount() { $('xjlEdCount').textContent = wordCount() + '字'; }
  /* 正文占位：contenteditable 常被浏览器塞入 <div><br></div>，:empty 失效，
     故用 is-empty 类兜底；normalize=true 时在非输入态清掉残留空标签以显示占位。 */
  function isVisuallyEmpty(el) {
    if (!el) { return true; }
    if (el.querySelector('img,hr')) { return false; }
    return (el.textContent || '').replace(/[\s\u00a0\u200b]/g, '') === '';
  }
  function syncPh(normalize) {
    var t = $('xjlFTitle'), b = $('xjlFBody');
    if (normalize) {
      if (isVisuallyEmpty(t)) { t.innerHTML = ''; }
      if (isVisuallyEmpty(b)) { b.innerHTML = ''; }
    }
    t.classList.toggle('is-empty', isVisuallyEmpty(t));
    b.classList.toggle('is-empty', isVisuallyEmpty(b));
  }
  function snapshot() {
    return { t: $('xjlFTitle').innerHTML, b: $('xjlFBody').innerHTML };
  }
  function pushHist() {
    var s = snapshot();
    ST.hist = ST.hist.slice(0, ST.histIdx + 1);
    ST.hist.push(s);
    if (ST.hist.length > 40) { ST.hist.shift(); }
    ST.histIdx = ST.hist.length - 1;
    updateHistBtns();
  }
  function updateHistBtns() {
    $('xjlUndoBtn').classList.toggle('is-off', ST.histIdx <= 0);
    $('xjlRedoBtn').classList.toggle('is-off', ST.histIdx >= ST.hist.length - 1);
  }
  function restore(s) {
    $('xjlFTitle').innerHTML = s.t; $('xjlFBody').innerHTML = s.b;
    updateCount(); saveEdit();
  }
  function undo() { if (ST.histIdx > 0) { ST.histIdx--; restore(ST.hist[ST.histIdx]); updateHistBtns(); } }
  function redo() { if (ST.histIdx < ST.hist.length - 1) { ST.histIdx++; restore(ST.hist[ST.histIdx]); updateHistBtns(); } }

  var saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveEdit, 300); }
  /* 立即落盘：切后台 / 关闭页面 / 来电中断前调用，确保正在写的内容不丢 */
  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (ST.editId) { saveEdit(true); }
    /* 切后台 / 关页面前尽力同步落一份快照，IDB 事务来不及完成时兜底 */
    else { save(true); }
  }
  function saveEdit(force) {
    var n = noteById(ST.editId); if (!n) { return; }
    /* [V45] 标题栏恢复：写信与枕梦录都写标题（空标题由列表回落正文摘要） */
    n.title = ($('xjlFTitle').textContent || '').trim();
    n.words = wordCount();
    n.updated = nowISO();
    var h = $('xjlFTitle').innerHTML, b = $('xjlFBody').innerHTML;
    var body = BODY[n.id] || (BODY[n.id] = { h: '', b: '', t: '' });
    body.h = h;
    body.b = b;
    var firstImg = $('xjlFBody').querySelector('img.xjl-inline-img');
    if (firstImg) { n.thumb = true; body.t = firstImg.getAttribute('src') || ''; }
    n.ex = excerptOf(b);
    markBody(n.id);
    save(force === true);
  }
  function applyPaper(id) {
    var p = paperById(id), n = noteById(ST.editId);
    app.style.setProperty('--xjl-paper-bg', p.bg);
    app.style.setProperty('--xjl-paper-ink', p.ink);
    app.style.setProperty('--xjl-paper-ph', p.ph);
    app.style.setProperty('--xjl-paper-tint', p.tint || '#eadfce');
    if (p.size) { app.style.setProperty('--xjl-paper-size', p.size); }
    else { app.style.removeProperty('--xjl-paper-size'); }
    if (n) { n.paper = p.id; save(); }
    renderPaperList();
  }
  /* [V43] 回信引用块：折叠时按内容高度显示「展开原文」，展开后给「收起原文」 */
  function syncReplyMore() {
    var q = $('xjlReplyQuote'), b = $('xjlReplyBody'), more = $('xjlReplyMore');
    if (!q || !b || !more || q.hidden) { return; }
    if (q.classList.contains('is-open')) { q.classList.add('has-more'); more.textContent = '收起原文'; return; }
    more.textContent = '展开原文';
    q.classList.toggle('has-more', b.scrollHeight > b.clientHeight + 2);
  }
  function toggleReplyQuote() {
    var q = $('xjlReplyQuote');
    if (!q || q.hidden) { return; }
    q.classList.toggle('is-open');
    syncReplyMore();
  }
  function renderReplyQuote(opt) {
    var q = $('xjlReplyQuote'), b = $('xjlReplyBody'), cap = $('xjlReplyCap');
    if (!q || !b || !cap) { return; }
    var body = (opt && opt.quote) ? String(opt.quote) : '';
    if (!body) {
      q.hidden = true;
      q.classList.remove('is-open', 'has-more');
      b.innerHTML = '';
      return;
    }
    cap.textContent = (opt && opt.quoteCap) ? String(opt.quoteCap) : '对方来信';
    b.innerHTML = body;
    q.classList.remove('is-open');
    q.hidden = false;
    setTimeout(syncReplyMore, 0);
  }
  function openEditor(id, opt) {
    if (!bootSettled) { whenLoaded(function () { openEditor(id, opt); }); return; }
    var n = noteById(id); if (!n) { return; }
    /* 正文按需读取：内存没有就异步回 IDB 取这一条，取到再开，避免一次把全库正文塞进内存 */
    ST.openingId = id;
    ensureBody(id, function (body) {
      if (ST.openingId !== id || !noteById(id)) { return; }
      ST.editId = id;
      ST.kbOn = false; ST.tool = ''; ST.sessionSec = 0; ST.editStart = Date.now();
      ST.hist = []; ST.histIdx = -1; ST.lastRange = null; ST.pendingFont = null;
      /* [V45] 撤回 V44「写信无标题」：写信与枕梦录都显示标题栏 */
      var xjlDream = (n.kind === 'dream');
      $('xjlFTitle').classList.remove('is-hide');
      $('xjlFBody').classList.remove('no-title');
      $('xjlFTitle').innerHTML = body.h || '';
      $('xjlFBody').innerHTML = body.b || '';
      $('xjlRecipient').textContent = n.kind === 'dream' ? '枕梦录 · 今夜记梦' : '致 · ' + n.to;
      renderReplyQuote(opt);
      app.classList.add('editing');
      $('xjlEditor').classList.add('is-on');
      $('xjlDrawer').classList.remove('has-panel');
      app.style.setProperty('--xjl-drawer-h', '72px');
      /* [V44] 去掉底栏「键盘」键：进写信界即可直接点正文唤出输入法 */
      setContentEditable(true);
      ST.kbOn = true;
      syncPh(true);
      applyPaper(n.paper || 'bai');
      updateCount(); pushHist();
      syncToolUI();
    });
  }
  function closeEditor() {
    saveEdit();
    var n = noteById(ST.editId);
    if (n) {
      n.seconds = (n.seconds || 0) + ST.sessionSec;
      var body = BODY[n.id] || { h: '', b: '', t: '' };
      if (!n.title && !excerptOf(body.b) && !body.t) {
        DB.notes = DB.notes.filter(function (x) { return x.id !== n.id; });
        dropBody(n.id);
      }
      save();
    }
    setContentEditable(false);
    app.classList.remove('editing');
    $('xjlEditor').classList.remove('is-on');
    ST.editId = null; ST.kbOn = false; ST.tool = '';
    app.style.removeProperty('--xjl-paper-bg');
    app.style.removeProperty('--xjl-paper-ink');
    app.style.removeProperty('--xjl-paper-ph');
    app.style.removeProperty('--xjl-paper-size');
    setView('list');
  }
  /* 删掉一条正文：内存缓存 + IDB 单条一起清 */
  function dropBody(id) {
    if (!id) { return; }
    delete BODY[id]; delete LEGACY[id]; delete THUMB[id]; delete dirtyBody[id];
    for (var i = BODY_ORDER.length - 1; i >= 0; i--) { if (BODY_ORDER[i] === id) { BODY_ORDER.splice(i, 1); } }
    var api = storeApi();
    if (api && typeof api.idbSet === 'function') { try { api.idbSet(bodyKey(id), null); } catch (e) {} }
  }
  /* 删除一笺：列表卡片左滑删除；正在编辑的笺删完直接回列表 */
  function deleteNote(id) {
    if (!id) { return; }
    var editing = ST.editId === id;
    DB.notes = DB.notes.filter(function (x) { return x.id !== id; });
    dropBody(id);
    /* [V46] 删到一封不剩时，索引会变成 notes:[]（空壳）—— 这是用户主动删除，
       必须显式放行，否则空壳写保护会把这封信「保」回来（表现为删除后刷新复活）。 */
    if (!DB.notes.length) {
      try { if (window.XJ_STORE && window.XJ_STORE.noticeShell) { window.XJ_STORE.noticeShell(K_IDX, 10000); window.XJ_STORE.noticeShell(K_IDX + '.bak', 10000); } } catch (eNS) { /* 忽略 */ }
    }
    save();
    if (editing) { closeEditor(); } else { renderList(); }
    toast('已删除');
  }
  function newNote(opt) {
    opt = opt || {};
    if (!bootSettled) { whenLoaded(function () { newNote(opt); }); return; }
    var n = {
      id: uid(), kind: opt.kind || ((ST.box === 'dream' || ST.group === '梦境记录') ? 'dream' : 'letter'),
      to: opt.to || ((ST.group !== 'all' && ST.group !== '梦境记录') ? ST.group : '未署名'),
      title: '', paper: 'bai', created: nowISO(), updated: nowISO(),
      words: 0, seconds: 0, thumb: false, ex: ''
    };
    BODY[n.id] = { h: '', b: '', t: '' };
    markBody(n.id);
    DB.notes.unshift(n);
    save();
    openEditor(n.id, opt);
  }
  function setContentEditable(on) {
    var t = $('xjlFTitle'), b = $('xjlFBody');
    t.setAttribute('contenteditable', on ? 'true' : 'false');
    b.setAttribute('contenteditable', on ? 'true' : 'false');
    if (!on) {
      try { t.blur(); b.blur(); } catch (e) {}
      syncPh(true);
    }
  }

  /* ---------------- 底栏工具与面板 ---------------- */
  function closePanel() {
    ST.tool = '';
    $('xjlFontPanel').classList.remove('is-on');
    $('xjlPaperPanel').classList.remove('is-on');
    $('xjlPanelHome').style.display = '';
    $('xjlDrawer').classList.remove('has-panel');
    app.style.setProperty('--xjl-drawer-h', '72px');
    syncToolUI();
  }
  function openPanel(name) {
    /* [V44] 打开面板只收起软键盘，正文始终保持可编辑 */
    try { var xjlAf0 = ST.activeField || $('xjlFBody'); if (xjlAf0 && xjlAf0.blur) { xjlAf0.blur(); } } catch (eKb0) { }
    if (ST.tool === name) { closePanel(); return; }
    ST.tool = name;
    $('xjlFontPanel').classList.toggle('is-on', name === 'font');
    $('xjlPaperPanel').classList.toggle('is-on', name === 'paper');
    $('xjlPanelHome').style.display = 'none';
    $('xjlDrawer').classList.add('has-panel');
    app.style.setProperty('--xjl-drawer-h', '340px');
    if (name === 'paper') { renderPaperList(); }
    syncToolUI();
  }
  function syncToolUI() {
    var bs = $('xjlTools').querySelectorAll('.xjl-tool');
    for (var i = 0; i < bs.length; i++) {
      var k = bs[i].getAttribute('data-tool');
      bs[i].classList.toggle('is-on', ST.tool === k);
    }
  }

  /* ---------------- 字式面板（图四） ---------------- */
  var SIZES = [12, 13, 14, 15, 16, 17, 18];
  var CUSTOM_COLOR_KEY = 'snowcrystal.letter.customcolor.v18';
  var COLORS = [
    { id: 'auto', val: '', label: 'A' }, { id: 'k', val: '#33383f', label: '' },
    { id: 'w', val: '#ffffff', label: '' }, { id: 'r', val: '#e35d6a', label: '' },
    { id: 'y', val: '#e8b23c', label: '' }, { id: 'b', val: '#3e8fe0', label: '' },
    { id: 'g', val: '#5e9c72', label: '' }
  ];
  function renderFontPanel() {
    var h = '', i;
    for (i = 0; i < SIZES.length; i++) {
      h += '<button type="button" class="xjl-fbtn xjl-size-btn' + (SIZES[i] === 16 ? ' is-on' : '') + '" data-size="' + SIZES[i] + '">' + SIZES[i] + '</button>';
    }
    $('xjlSizeOps').innerHTML = h;
    h = '';
    for (i = 0; i < COLORS.length; i++) {
      var c = COLORS[i];
      h += '<button type="button" class="xjl-color-dot' + (c.id === 'auto' ? ' auto is-on' : '') + '" data-color="' + c.val + '"' +
           (c.val ? ' style="background:' + c.val + '"' : '') + ' aria-label="颜色"><span class="xjl-cd-tick">✓</span>' + (c.label || '') + '</button>';
    }
    var cc = '';
    try { cc = localStorage.getItem(CUSTOM_COLOR_KEY) || ''; } catch (e5) {}
    h += '<button type="button" class="xjl-color-dot xjl-color-custom" data-fn="customColor" aria-label="自定义颜色"' +
         (cc ? ' style="--xjl-cc:' + cc + '"' : '') + '><span class="xjl-cc-plus">＋</span><span class="xjl-cd-tick">✓</span></button>';
    $('xjlColorOps').innerHTML = h;
    var ci = $('xjlCustomColor'); if (ci && cc) { ci.value = cc; }
  }
  /* 选区范围（用于长按选择文字后设字式，contenteditable=false 下同样可用） */
  function fieldOf(node) {
    var t = $('xjlFTitle'), b = $('xjlFBody');
    while (node) { if (node === t) { return t; } if (node === b) { return b; } node = node.parentNode; }
    return null;
  }
  function currentRange() {
    var sel = window.getSelection(), r = null;
    if (sel && sel.rangeCount) {
      var rr = sel.getRangeAt(0);
      if (!rr.collapsed && fieldOf(rr.commonAncestorContainer)) { r = rr; }
    }
    return r || ST.lastRange;
  }
  /* [V18] 智能 toggle：同一选区再点同一效果即取消，不再层层套 span 无法去除。
     返回 'on'（应用/改值）或 'off'（已取消）或 null（无有效选区）。 */
  function wrapSelection(style) {
    var r = currentRange();
    var prop = null, val = null, k;
    for (k in style) { if (style.hasOwnProperty(k)) { prop = k; val = style[k]; break; } }
    if (!prop) { return null; }
    /* [V44] 没选中文字时也能设字式：改为整篇默认，之后输入的字同样生效；同值再点即取消 */
    if (!r || r.collapsed || !fieldOf(r.commonAncestorContainer)) {
      var fW = ST.activeField || $('xjlFBody');
      if (!fW) { return null; }
      var kMark = 'data-xjl-w-' + prop;
      if (fW.getAttribute(kMark) === String(val)) {
        fW.style[prop] = ''; fW.removeAttribute(kMark);
        pushHist(); scheduleSave(); return 'off';
      }
      fW.style[prop] = val; fW.setAttribute(kMark, String(val));
      pushHist(); scheduleSave(); return 'on';
    }
    /* 沿选区起点向上找最内层带该样式属性的 span */
    var node = r.startContainer;
    if (node && node.nodeType === 3) { node = node.parentNode; }
    var host = null;
    while (node && fieldOf(node)) {
      if (node.nodeType === 1 && node.tagName === 'SPAN' && node.style && node.style[prop]) { host = node; break; }
      node = node.parentNode;
    }
    if (host) {
      /* [V18] 浏览器会把 hex 规范化成 rgb()，直接比 style 值会误判；
         用 span 上记录的原始值比较，保证同色再点能正确取消。 */
      var saved = null;
      try { saved = JSON.parse(host.getAttribute('data-xjl-val') || 'null'); } catch (ej) {}
      var same = saved ? (saved[prop] === val) :
                 (String(host.style[prop]).replace(/\s/g, '') === String(val).replace(/\s/g, ''));
      if (same) {
        /* 取消该效果：去掉属性；span 已无其它内联样式则整层拆掉 */
        host.style[prop] = '';
        if (!host.getAttribute('style')) {
          var p = host.parentNode;
          try {
            var nr0 = document.createRange();
            nr0.setStartBefore(host); nr0.setEndAfter(host);
            while (host.firstChild) { p.insertBefore(host.firstChild, host); }
            p.removeChild(host);
            var sel0 = window.getSelection(); sel0.removeAllRanges(); sel0.addRange(nr0);
            ST.lastRange = nr0;
          } catch (eu) { /* 结构异常时保留空 span */ }
        }
        pushHist(); updateCount(); scheduleSave();
        return 'off';
      }
      /* 同属性不同值（换字号 / 换颜色）：就地改值，不再叠层 */
      host.style[prop] = val;
      var sv2 = {}; try { sv2 = JSON.parse(host.getAttribute('data-xjl-val') || '{}') || {}; } catch (ej2) {}
      sv2[prop] = val; host.setAttribute('data-xjl-val', JSON.stringify(sv2));
      pushHist(); updateCount(); scheduleSave();
      return 'on';
    }
    var sp = document.createElement('span');
    sp.setAttribute('data-xjl-fmt', '1');
    sp.setAttribute('data-xjl-val', JSON.stringify(style));
    for (k in style) { if (style.hasOwnProperty(k)) { sp.style[k] = style[k]; } }
    var frag;
    try { frag = r.extractContents(); sp.appendChild(frag); r.insertNode(sp); }
    catch (e) { toast('选区跨行，请分小段选择'); return null; }
    try {
      var sel = window.getSelection(); sel.removeAllRanges();
      var nr = document.createRange(); nr.selectNodeContents(sp); sel.addRange(nr);
      ST.lastRange = nr;
    } catch (e2) {}
    pushHist(); updateCount(); scheduleSave();
    return 'on';
  }
  function paraStyle(prop, val) {
    var r = currentRange(), target = null;
    if (r && fieldOf(r.commonAncestorContainer)) {
      var node = r.startContainer;
      if (node && node.nodeType === 3) { node = node.parentNode; }
      while (node && node !== $('xjlFBody') && node !== $('xjlFTitle')) {
        if (node.nodeType === 1 && (node.tagName === 'DIV' || node.tagName === 'P' || node.tagName === 'LI')) { target = node; break; }
        node = node.parentNode;
      }
    }
    if (!target) { target = ST.activeField || $('xjlFBody'); }
    target.style[prop] = val;
    pushHist(); scheduleSave();
  }
  function insertAtSelection(html) {
    var r = currentRange(), f = ST.activeField || $('xjlFBody');
    var wrap = document.createElement('div'); wrap.innerHTML = html;
    var frag = document.createDocumentFragment();
    while (wrap.firstChild) { frag.appendChild(wrap.firstChild); }
    if (r && !r.collapsed && fieldOf(r.commonAncestorContainer)) {
      try { r.deleteContents(); r.insertNode(frag); } catch (e) { f.appendChild(frag); }
    } else { f.appendChild(frag); }
    pushHist(); updateCount(); scheduleSave();
  }
  function clearFormat() {
    var r = currentRange();
    if (!r || r.collapsed || !fieldOf(r.commonAncestorContainer)) {
      /* [V44] 未选字时清除整篇字式 */
      var fC = ST.activeField || $('xjlFBody');
      if (!fC) { return; }
      var spC = fC.querySelectorAll('span[data-xjl-fmt]'), iC;
      for (iC = 0; iC < spC.length; iC++) {
        var sC = spC[iC];
        while (sC.firstChild) { sC.parentNode.insertBefore(sC.firstChild, sC); }
        if (sC.parentNode) { sC.parentNode.removeChild(sC); }
      }
      fC.removeAttribute('style');
      pushHist(); scheduleSave(); toast('已清除整篇字式'); return;
    }
    var frag;
    try { frag = r.extractContents(); } catch (e) { return; }
    var box = document.createElement('div'); box.appendChild(frag);
    var spans = box.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      while (s.firstChild) { s.parentNode.insertBefore(s.firstChild, s); }
      s.parentNode.removeChild(s);
    }
    while (box.firstChild) { r.insertNode(box.firstChild); }
    pushHist(); updateCount(); scheduleSave();
    toast('已清除字式');
  }
  function markBtn(btn, group) {
    if (group === 'para') {
      var ps = btn.parentNode.querySelectorAll('.xjl-fbtn');
      for (var i = 0; i < ps.length; i++) { ps[i].classList.remove('is-on'); }
    } else if (group === 'size' || group === 'color') {
      var os = btn.parentNode.querySelectorAll('.xjl-fbtn, .xjl-color-dot');
      for (var j = 0; j < os.length; j++) { os[j].classList.remove('is-on'); }
    }
    btn.classList.add('is-on');
  }

  /* ---------------- 笺纸面板（图五） ---------------- */
  function renderPaperTabs() {
    var h = '', i;
    for (i = 0; i < CATS.length; i++) {
      h += '<button type="button" class="xjl-paper-tab' + (CATS[i] === ST.paperTab ? ' is-on' : '') + '" data-cat="' + CATS[i] + '">' + CATS[i] + '</button>';
    }
    var tabs = $('xjlPaperTabs');
    tabs.innerHTML = h;
    syncPaperTabsMask();
    if (!tabs.__xjlMaskBound) {
      tabs.__xjlMaskBound = 1;
      tabs.addEventListener('scroll', syncPaperTabsMask, { passive: true });
    }
    var on = tabs.querySelector('.xjl-paper-tab.is-on');
    if (on && on.scrollIntoView) { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    setTimeout(syncPaperTabsMask, 60);
  }
  function syncPaperTabsMask() {
    var t = $('xjlPaperTabs');
    if (!t) { return; }
    var more = t.scrollWidth - t.clientWidth - t.scrollLeft > 4;
    var prev = t.scrollLeft > 4;
    t.classList.toggle('can-more', more);
    t.classList.toggle('can-prev', prev);
  }
  function renderPaperList() {
    if (CATS.indexOf(ST.paperTab) < 0) { ST.paperTab = '纯色'; }
    renderPaperTabs();
    var cur = ST.editId ? (noteById(ST.editId) || {}).paper : 'bai';
    var h = '', i, list = PAPERS.filter(function (p) { return p.cat === ST.paperTab; });
    if (!list.length && ST.paperTab !== '自定义') {
      ST.paperTab = '纯色'; renderPaperTabs();
      list = PAPERS.filter(function (p) { return p.cat === ST.paperTab; });
    }
    if (ST.paperTab === '自定义') {
      h += '<div class="xjl-paper-card xjl-paper-upload" data-upload="1"><span class="xjl-pu-plus">＋</span><span class="xjl-pc-name">上传信纸</span></div>';
    }
    for (i = 0; i < list.length; i++) {
      var p = list[i];
      h += '<div class="xjl-paper-card' + (p.id === cur ? ' is-on' : '') + '" data-paper="' + p.id + '"' +
           (p.size ? ' data-size="' + esc(p.size) + '"' : '') + ' style="background:' + p.bg + (p.size ? ';background-size:' + esc(p.size) : '') + '">' +
           '<span class="xjl-pc-name" style="color:' + p.ink + ' !important;text-shadow:' + inkShadow(p.ink) + '">' + esc(p.name) + '</span>' +
           (p.custom ? '<button type="button" class="xjl-paper-del" data-del="' + p.id + '" aria-label="删除">×</button>' : '') + '</div>';
    }
    $('xjlPaperList').innerHTML = h;
  }

  /* ---------------- 插图（调设备相册） ---------------- */
  function insertImageFile(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var max = 1000, w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        try { cv.getContext('2d').drawImage(img, 0, 0, w, h); } catch (e) { return; }
        var src;
        try { src = cv.toDataURL('image/jpeg', 0.74); } catch (e2) { src = ev.target.result; }
        insertAtSelection('<img class="xjl-inline-img" src="' + src + '" alt="插图"><div><br></div>');
        toast('已插入插图');
      };
      img.onerror = function () { toast('图片读取失败'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- 分享 ---------------- */
  function shareStats() {
    var y = new Date().getFullYear(), s = 0, w = 0, i;
    for (i = 0; i < DB.notes.length; i++) { s += DB.notes[i].seconds || 0; w += DB.notes[i].words || 0; }
    var text = '【' + y + ' 年度笺记 · 雪晶云笺】\n累计落笔 ' + fmtDur(s) + ' / ' + w + ' 字\n共 ' + DB.notes.length + ' 笺';
    if (navigator.share) { navigator.share({ title: y + ' 年度笺记', text: text }).catch(function () {}); return; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); toast('年度笺记已复制'); return; }
    } catch (e) {}
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('年度笺记已复制'); } catch (e2) { toast(text); }
    document.body.removeChild(ta);
  }

  /* [V18] 写信独立主题：内置 5 套浅色 + 1 套暗色，不再跟随网站外观主题/阴阳/明暗。
     切换只改云笺根节点 data-xjl-theme，配色由 xj-v18-style 里的固定变量提供。 */
  var XJL_THEME_KEY = 'snowcrystal.letter.theme.v18';
  /* [V19] 清淡纯色小清新：去掉三段渐变，主题底色与菜单色块取同一低饱和淡彩纯色 */
  var XJL_THEMES = [
    { k: 'snow',    n: '素月', c: '#F2F4F6' },
    { k: 'apricot', n: '茶烟', c: '#F4EFE6' },
    { k: 'lotus',   n: '绯纨', c: '#F7E9E8' },
    { k: 'moss',    n: '竹露', c: '#E9F2E8' },
    { k: 'mist',    n: '霁青', c: '#E8EDF3' },
    { k: 'night',   n: '玄墨', c: '#232629' }
  ];
  function xjlThemeGet() {
    var k = '';
    try { k = localStorage.getItem(XJL_THEME_KEY) || ''; } catch (e1) {}
    for (var i = 0; i < XJL_THEMES.length; i++) { if (XJL_THEMES[i].k === k) { return k; } }
    return 'snow';
  }
  function xjlThemeSet(k) {
    if (app) { app.setAttribute('data-xjl-theme', k); }
    try { localStorage.setItem(XJL_THEME_KEY, k); } catch (e2) {}
    renderThemeMenu();
    /* [V36] 主题一换就让「年度笺记」按新主题重算重绘，避免残留上一个主题的颜色 */
    try {
      var st = document.querySelector('.xjl-view[data-view="stats"]');
      if (st && st.classList.contains('is-on') && typeof renderStats === 'function') { renderStats(); }
    } catch (e3) { /* 忽略 */ }
  }
  function renderThemeMenu() {
    var m = $('xjlThemeMenu'); if (!m) { return; }
    var cur = xjlThemeGet(), h = '<div class="xjl-theme-cap">笺色 · 写信主题</div>', i, t;
    for (i = 0; i < XJL_THEMES.length; i++) {
      t = XJL_THEMES[i];
      h += '<button type="button" class="xjl-theme-item' + (t.k === cur ? ' is-on' : '') + '" data-theme="' + t.k + '">' +
           '<span class="xjl-theme-swatch" style="background:' + t.c + '"></span>' +
           '<span class="xjl-theme-name">' + t.n + '</span>' +
           '<span class="xjl-theme-check">✓</span></button>';
    }
    m.innerHTML = h;
    var dot = $('xjlThemeDot');
    if (dot) { for (i = 0; i < XJL_THEMES.length; i++) { if (XJL_THEMES[i].k === cur) { dot.style.background = XJL_THEMES[i].c; } } }
  }
  function toggleThemeMenu(on) {
    var m = $('xjlThemeMenu'), w = $('xjlThemeWrap'); if (!m || !w) { return; }
    w.classList.toggle('is-open', !!on);
  }

  /* ---------------- 打开 / 关闭模块 ---------------- */
  function show() {
    app.classList.add('is-open');
    app.setAttribute('aria-hidden', 'false');
    toggleMenu(false); toggleBox(false);
    setView('list');
    renderList();
    try { history.pushState({ xjlLetter: 1 }, ''); } catch (e) {}
  }
  function hide() {
    if (ST.editId) { closeEditor(); }
    app.classList.remove('is-open');
    app.setAttribute('aria-hidden', 'true');
    app.classList.remove('editing');
    toggleMenu(false); toggleBox(false);
  }
  /* [V17] 供书架分组页复用：视图切换 / 列表重绘 / 状态 / 信纸 */
  S.xjl = { setView: setView, renderList: renderList, state: ST, paperById: paperById, dismiss: hide,
    papers: function () { return PAPERS.slice(); },
    /* 对方来信随机抽一张信纸（含自定义），返回 {id,name,bg,size,tint} */
    randomPaper: function () {
      var pool = PAPERS.filter(function (p) { return p.cat === '纯色' || p.cat === '花色' || p.custom; });
      if (!pool.length) { pool = PAPERS; }
      var p = pool[Math.floor(Math.random() * pool.length)];
      return { id: p.id, name: p.name, bg: p.bg, size: p.size || '', tint: p.tint || '#eadfce' };
    },
    paperTint: function (id) { var p = paperById(id); return (p && p.tint) || '#eadfce'; },
    /* [V43] 回信：直接进写信界面，顶部回显对方来信原文，抬头改成「致 · 对方」 */
    replyTo: function (L) {
      if (!L) { return; }
      var quote = String(L.html || '');
      if (!quote) { quote = esc(String(L.text || '')).replace(/\n/g, '<br>'); }
      if (!app) { return; }
      if (!app.classList.contains('is-open')) { show(); }
      var who = String(L.sign || L.roleName || '').trim() || '对方';
      var cap = String(L.title || '').trim() || ('✦ ' + who + '的来信');
      if (cap && cap.indexOf('✦') !== 0) { cap = '✦ ' + cap; }
      newNote({ kind: 'letter', to: who,
                quote: quote, quoteCap: cap });
    } };
  S.openLetter = function () {
    if (!app) { return; }
    if (!app.classList.contains('is-open')) { show(); }
  };
  S.closeLetter = function () {
    if (history.state && history.state.xjlLetter) { try { history.back(); return; } catch (e) {} }
    hide();
  };
  /* 关闭云笺并回到网站首页：先切回列表，避免 popstate 的「统计→列表」分支把关闭吞掉 */
  function backHome() {
    if (ST.editId) { closeEditor(); }
    setView('list');
    S.closeLetter();
    if (S.switchPage) { try { S.switchPage('home'); } catch (e) {} }
  }
  window.addEventListener('popstate', function () {
    if (app && app.classList.contains('is-open')) {
      if (ST.editId) { closeEditor(); }
      else if (ST.view === 'stats') { setView('list'); }
      else { hide(); }
    }
  });

  /* ---------------- 事件绑定 ---------------- */
  function bind() {
    app = $('xjLetterApp');
    if (!app) { return; }
    app.setAttribute('data-xjl-theme', xjlThemeGet());
    renderThemeMenu();

    /* 顶部左侧：返回网站首页 */
    $('xjlHomeBtn').addEventListener('click', function (e) { e.stopPropagation(); backHome(); });
    /* [V43] 回信引用块：展开 / 收起对方来信原文 */
    var rqMore = $('xjlReplyMore');
    if (rqMore) { rqMore.addEventListener('click', function (e) { e.stopPropagation(); toggleReplyQuote(); }); }

    /* 顶部右侧：全部云笺 + 小三角分组 */
    $('xjlTitleBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      /* [V17] 小三角改为进入独立书架分组页 */
      if (window.XJShelf && window.XJShelf.openShelf) { window.XJShelf.openShelf(); return; }
      toggleMenu(!$('xjlMenu').classList.contains('is-on'));
      toggleBox(false);
    });
    $('xjlMenuMask').addEventListener('click', function () { toggleMenu(false); });
    $('xjlMenu').addEventListener('click', function (e) {
      var g = e.target.closest('[data-group]'), b = e.target.closest('[data-box]');
      if (g) {
        ST.group = g.getAttribute('data-group');
        if (ST.group === '梦境记录') { ST.box = 'all'; }
        toggleMenu(false); renderList();
      }
      else if (b) { setBox(b.getAttribute('data-box')); toggleMenu(false); }
    });

    /* 左下：列表页弹笺匣；统计页则切回列表。右下：年度笺记 */
    $('xjlBoxBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu(false);
      if (ST.editId) { return; }
      if (ST.view === 'stats') { setView('list'); return; }
      toggleBox(!$('xjlBox').classList.contains('is-on'), 'box');
    });
    $('xjlBoxMask').addEventListener('click', function () { toggleBox(false); });
    $('xjlBox').addEventListener('click', function (e) {
      var b = e.target.closest('[data-box]'), r = e.target.closest('[data-role]');
      if (b) { setBox(b.getAttribute('data-box')); return; }
      if (r) {
        var v = r.getAttribute('data-role'); toggleBox(false);
        if (v === '__home') { backHome(); return; }
        if ($('xjlBox').getAttribute('data-mode') === 'role' || $('xjlEditor').classList.contains('is-on')) {
          var n = noteById(ST.editId);
          if (n) { n.to = v; save(); $('xjlRecipient').textContent = '致 · ' + v; toast('收笺人：' + v); }
        } else { ST.group = v; renderList(); }
      }
    });
    $('xjlStatsBtn').addEventListener('click', function () {
      toggleMenu(false); toggleBox(false);
      if (ST.editId) { return; }
      setView(ST.view === 'stats' ? 'list' : 'stats');
    });
    $('xjlAddBtn').addEventListener('click', function () {
      toggleMenu(false); toggleBox(false);
      newNote();
    });
    $('xjlThemeBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var w = $('xjlThemeWrap');
      toggleThemeMenu(!(w && w.classList.contains('is-open')));
    });
    $('xjlThemeMenu').addEventListener('click', function (e) {
      var b = e.target.closest('[data-theme]'); if (!b) { return; }
      xjlThemeSet(b.getAttribute('data-theme'));
      toggleThemeMenu(false);
      toast('已换「' + (b.querySelector('.xjl-theme-name') ? b.querySelector('.xjl-theme-name').textContent : '') + '」笺色');
    });
    $('xjlStatsScroll').addEventListener('click', function () { toggleThemeMenu(false); }, false);

    /* [V40] 卡片左滑露出「打开 / 删除」；点击卡片编辑；不再长按删除、编辑器也不放删除键 */
    var SWW = 152, swCard = null, swFrom = null, swX = 0, swY = 0, swOn = false, swMoved = false, swSuppress = false;
    function swCardOf(t) { return t && t.closest ? t.closest('.xjl-card') : null; }
    function swClose() { if (swCard) { swCard.classList.remove('is-sw'); } swCard = null; }
    var cardsEl = $('xjlCards');
    cardsEl.addEventListener('pointerdown', function (e) {
      var c = swCardOf(e.target);
      swOn = !!c; swFrom = c; swMoved = false;
      swX = e.clientX || 0; swY = e.clientY || 0;
    }, true);
    cardsEl.addEventListener('pointermove', function (e) {
      if (!swOn) { return; }
      var dx = (e.clientX || 0) - swX, dy = (e.clientY || 0) - swY;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { swMoved = true; }
    }, true);
    cardsEl.addEventListener('pointerup', function (e) {
      if (!swOn) { return; }
      swOn = false;
      var dx = (e.clientX || 0) - swX;
      if (!swMoved) { return; }
      swSuppress = true;
      setTimeout(function () { swSuppress = false; }, 300);
      var c = swFrom;
      if (dx < -36) {
        if (swCard && swCard !== c) { swClose(); }
        swCard = c;
        if (swCard) { swCard.classList.add('is-sw'); }
      } else if (dx > 36) {
        swClose();
      }
    }, true);
    cardsEl.addEventListener('pointercancel', function () { swOn = false; }, true);
    document.addEventListener('pointerdown', function (e) {
      if (swCard && !swCardOf(e.target)) { swClose(); }
    }, true);
    cardsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sw]');
      if (btn) {
        e.preventDefault(); e.stopPropagation();
        var c = swCardOf(btn);
        var id = c && c.getAttribute('data-id'), lid = c && c.getAttribute('data-lid');
        var kind = btn.getAttribute('data-sw');
        swClose();
        if (kind === 'del') {
          if (lid) {
            if (window.XJShelf && window.XJShelf.deleteLetter) {
              confirmBox('删除这封信？删除后不可恢复。', function () { window.XJShelf.deleteLetter(lid); });
            } else { toast('信件组件还没准备好'); }
          } else if (id) {
            confirmBox('确定删除这张笺？删除后不可恢复。', function () { deleteNote(id); });
          }
        }
        return;
      }
      if (swSuppress) { swSuppress = false; return; }
      var card = swCardOf(e.target); if (!card) { return; }
      if (swCard) { swClose(); return; }   /* 有滑开的卡片：先收起，不打开 */
      var lid2 = card.getAttribute('data-lid');
      if (lid2) {
        if (window.XJShelf && window.XJShelf.openLetter) { window.XJShelf.openLetter(lid2); }
        else { toast('信件组件还没准备好'); }
        return;
      }
      openEditor(card.getAttribute('data-id'));
    }, true);
    /* 信件模块删掉来信后刷新云笺列表 */
    document.addEventListener('xj:letters-changed', function () { try { renderList(); } catch (e0) {} });
    $('xjlConfirmNo').addEventListener('click', closeConfirm);
    $('xjlConfirmMask').addEventListener('click', function (e) { if (e.target === this) { closeConfirm(); } });
    $('xjlConfirmYes').addEventListener('click', function () { var cb = confirmCb; closeConfirm(); if (cb) { cb(); } });

    /* 编辑器顶部 */
    $('xjlEdBack').addEventListener('click', closeEditor);
    $('xjlUndoBtn').addEventListener('click', undo);
    $('xjlRedoBtn').addEventListener('click', redo);
    /* 设备本地持久化兜底：切后台、锁屏、关页面时立即落盘 */
    window.addEventListener('pagehide', flushSave);
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { flushSave(); }
    });
    $('xjlRecipient').addEventListener('click', function (e) {
      e.stopPropagation();
      var cur = noteById(ST.editId);
      if (cur && cur.kind === 'dream') { toast('枕梦录不设收笺人 · 只记给自己听'); return; }
      ST.rolePick = (noteById(ST.editId) || {}).to;
      app.setAttribute('data-boxmode', 'role');
      toggleBox(true, 'role');
    });
    ['xjlFTitle', 'xjlFBody'].forEach(function (id) {
      var el = $(id);
      el.addEventListener('focus', function () { ST.activeField = el; });
      el.addEventListener('input', function () { updateCount(); syncPh(false); pushHist(); scheduleSave(); });
      el.addEventListener('keyup', function () { ST.lastRange = null; });
    });
    document.addEventListener('selectionchange', function () {
      if (!app.classList.contains('is-open')) { return; }
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var r = sel.getRangeAt(0);
        if (!r.collapsed && fieldOf(r.commonAncestorContainer)) { ST.lastRange = r.cloneRange(); }
      }
    });

    /* 底栏四按键 */
    $('xjlTools').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]'); if (!b) { return; }
      var k = b.getAttribute('data-tool');
      if (k === 'font') { openPanel('font'); }
      else if (k === 'paper') { openPanel('paper'); }
      else if (k === 'image') { $('xjlImagePicker').click(); }
    });
    $('xjlImagePicker').addEventListener('change', function (e) {
      var fs = e.target.files || [], i;
      for (i = 0; i < fs.length; i++) { if (fs[i].type.indexOf('image/') === 0) { insertImageFile(fs[i]); } }
      e.target.value = '';
    });

    /* 字式面板 */
    $('xjlFontPanel').addEventListener('pointerdown', function () {
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var r = sel.getRangeAt(0);
        if (!r.collapsed && fieldOf(r.commonAncestorContainer)) { ST.lastRange = r.cloneRange(); }
      }
    });
    $('xjlFontPanel').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) { return; }
      var fn = b.getAttribute('data-fn'), sz = b.getAttribute('data-size'), cl = b.getAttribute('data-color');
      if (fn) {
        if (fn === 'alignLeft' || fn === 'alignCenter' || fn === 'alignRight') {
          paraStyle('textAlign', fn === 'alignLeft' ? 'left' : (fn === 'alignCenter' ? 'center' : 'right'));
          markBtn(b, 'para'); toast('已设为' + (fn === 'alignLeft' ? '左对齐' : fn === 'alignCenter' ? '居中' : '右对齐'));
        } else if (fn === 'indent') { paraStyle('paddingLeft', '2em'); toast('已缩进'); }
        else if (fn === 'todo') { insertAtSelection('<div>☐ &nbsp;</div>'); toast('已插入待办'); }
        else if (fn === 'olist') { insertAtSelection('<div>1. &nbsp;</div>'); toast('已插入有序列'); }
        else if (fn === 'ulist') { insertAtSelection('<div>• &nbsp;</div>'); toast('已插入无序列'); }
        else if (fn === 'clear') { clearFormat(); }
        else if (fn === 'customColor') {
          /* 打开系统取色器；选色后由 change 事件应用 */
          var ci = $('xjlCustomColor'); if (ci) { ci.click(); }
        }
        else if (fn === 'bold' || fn === 'italic' || fn === 'underline' || fn === 'strike') {
          var st = fn === 'bold' ? { fontWeight: '700' } : fn === 'italic' ? { fontStyle: 'italic' } :
                   fn === 'underline' ? { textDecoration: 'underline' } : { textDecoration: 'line-through' };
          var lab = fn === 'bold' ? '加粗' : fn === 'italic' ? '倾斜' : fn === 'underline' ? '下划线' : '删除线';
          var res = wrapSelection(st);
          if (res === 'off') { b.classList.remove('is-on'); toast('已取消' + lab); }
          else if (res === 'on') { b.classList.add('is-on'); toast('已' + lab); }
        }
      } else if (sz) {
        var rs = wrapSelection({ fontSize: sz + 'px' });
        if (rs === 'off') { b.classList.remove('is-on'); toast('已恢复字号'); }
        else if (rs === 'on') { markBtn(b, 'size'); toast('字号 ' + sz); }
      } else if (cl !== null && cl !== undefined) {
        var rc = wrapSelection({ color: cl || 'var(--xjl-paper-ink)' });
        if (rc === 'off') { b.classList.remove('is-on'); $('xjlColorOps').querySelector('.auto').classList.add('is-on'); toast('已恢复纸墨色'); }
        else if (rc === 'on') { markBtn(b, 'color'); toast(cl ? '已换字色' : '已恢复纸墨色'); }
      }
    });

    /* 笺纸面板 */
    $('xjlPaperTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) { return; }
      ST.paperTab = b.getAttribute('data-cat'); renderPaperList();
    });
    $('xjlPaperList').addEventListener('click', function (e) {
      var d = e.target.closest('[data-del]');
      if (d) { e.stopPropagation(); delCustomPaper(d.getAttribute('data-del')); return; }
      var u = e.target.closest('[data-upload]');
      if (u) { $('xjlPaperPicker').click(); return; }
      var c = e.target.closest('[data-paper]'); if (!c) { return; }
      applyPaper(c.getAttribute('data-paper'));
      toast('已铺「' + paperById(c.getAttribute('data-paper')).name + '」笺');
    });
    $('xjlPaperPicker').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) { if (f.type.indexOf('image/') === 0) { addCustomPaper(f); } else { toast('请选择图片'); } }
      e.target.value = '';
    });

    /* 软键盘：可视视口变化时把工具条顶上去 */
    function syncKb() {
      var vv = window.visualViewport, kb = 0;
      if (vv) { kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0)); }
      app.style.setProperty('--xjl-kb', kb + 'px');
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncKb);
      window.visualViewport.addEventListener('scroll', syncKb);
    }
    window.addEventListener('resize', syncKb);

    /* 写信时长：仅前台可见时累计 */
    setInterval(function () {
      if (!ST.editId || document.hidden) { return; }
      ST.sessionSec += 1;
      if (ST.sessionSec % 20 === 0) { saveEdit(); var n = noteById(ST.editId); if (n) { n.seconds = (n.seconds || 0) + 20; ST.sessionSec = 0; save(); } }
    }, 1000);

    $('xjlCustomColor').addEventListener('input', function (e) {
      var v = e.target.value; if (!v) { return; }
      try { localStorage.setItem(CUSTOM_COLOR_KEY, v); } catch (e6) {}
      var cb = $('xjlColorOps').querySelector('.xjl-color-custom');
      if (cb) { cb.style.setProperty('--xjl-cc', v); }
      var rr = wrapSelection({ color: v });
      if (rr === 'on' && cb) { markBtn(cb, 'color'); toast('已用自定义字色'); }
      else if (rr === 'off' && cb) { cb.classList.remove('is-on'); toast('已取消自定义字色'); }
    });

    renderFontPanel(); renderPaperList(); load();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); }
  else { bind(); }
})();
