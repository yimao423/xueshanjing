/* 主题引擎与外观 */
"use strict";
  /* =========================================================
     主题引擎（外观设置）
     v37：内置 7 款 —— 灰色系（默认，#D0D0D0） / 蓝色系（#83A8EC） / 浅绿 / 浅紫 / 浅粉 / 浅红 / 浅橙
          （按需求移除「浅蓝 / 浅灰 / 浅黄 / 暗夜 / 黑白 / 黑红」六款内置主题）
     - 自定义：任意颜色，最多保存 6 个
     - 全部配色写入 :root 的 CSS 变量，localStorage 记忆（默认 = v11 浅色化蓝 #83A8EC）
     ========================================================= */
  var STORE_KEY = "snowcrystal.theme.v1";
  /* 自定义颜色上限动态跟随设备内存：原写死 6，现按 XJ_CAP.customMax() 分档（6/8/10/12） */
  var MAX_CUSTOM = (window.XJ_CAP ? XJ_CAP.customMax() : 6);
  /* v35：默认主题改为「灰色系」；原蓝色主题独立成「蓝色系」内置主题
     v36：灰色系主色由 #9E9E9E 调整为 #D0D0D0（其余图标 / 字体 / 雪花装饰色不变） */
  var DEFAULT_THEME = { key: "default", name: "灰色系", base: "#D0D0D0", mode: "light" };

  /* v11：9 个浅色内置主题的主色全部按「镜界」浅色系重定（饱和度 45~80%、明度 72~80%），
     原 #3D79FC / #66BB6A / #EF5350 等中深色主色整体提浅，换任何主题都不会再"偏沉"。 */
  var THEMES = [
    { key: "default", name: "灰色系", base: "#D0D0D0", mode: "light" },
    { key: "blue",    name: "蓝色系", base: "#B8DCF0", mode: "light" },   /* 对标拾心界 default 浅蓝 */
    { key: "green",   name: "浅绿", base: "#B0D8C0", mode: "light" },   /* 对标拾心界 light-green */
    { key: "purple",  name: "浅紫", base: "#D8C0E8", mode: "light" },   /* 对标拾心界 light-purple */
    { key: "pink",    name: "浅粉", base: "#F0C0D0", mode: "light" },   /* 对标拾心界 light-pink */
    { key: "red",     name: "浅红", base: "#F0B0B8", mode: "light" },   /* 对标拾心界 light-red */
    { key: "orange",  name: "浅橙", base: "#F5C898", mode: "light" }    /* 对标拾心界 light-orange */
  ];

  var state = {
    key: DEFAULT_THEME.key,
    name: DEFAULT_THEME.name,
    base: DEFAULT_THEME.base,
    mode: DEFAULT_THEME.mode,
    customs: []
  };

  /* ---------------- 颜色工具 ---------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function normHex(v) {
    var h = String(v == null ? "" : v).trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(h)) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) { return null; }
    return "#" + h.toUpperCase();
  }

  function hexToRgb(hex) {
    var h = normHex(hex);
    if (!h) { return null; }
    return {
      r: parseInt(h.slice(1, 3), 16),
      g: parseInt(h.slice(3, 5), 16),
      b: parseInt(h.slice(5, 7), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) { h = (g - b) / d + (g < b ? 6 : 0); }
      else if (max === g) { h = (b - r) / d + 2; }
      else { h = (r - g) / d + 4; }
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; }
    if (t < 1 / 2) { return q; }
    if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
    return p;
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  function toHex(c) {
    var out = "#", i, v, s;
    var arr = [c.r, c.g, c.b];
    for (i = 0; i < 3; i++) {
      v = Math.round(clamp(arr[i], 0, 255));
      s = v.toString(16).toUpperCase();
      out += s.length < 2 ? "0" + s : s;
    }
    return out;
  }

  function hsl(h, s, l) { return toHex(hslToRgb(h, s, l)); }
  function hsla(h, s, l, a) { return "hsla(" + Math.round(((h % 360) + 360) % 360) + ", " + Math.round(clamp(s, 0, 100)) + "%, " + Math.round(clamp(l, 0, 100)) + "%, " + a + ")"; }
  function rgbTriple(hex) { var c = hexToRgb(hex) || { r: 0, g: 0, b: 0 }; return c.r + "," + c.g + "," + c.b; }
  /* v29：HSL 直接取 rgb 三元组（暗色卡片底为 hsl 生成，无法走 hex 拆解） */
  function hslTriple(h, s, l) { var c = hslToRgb(h, s, l); return Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b); }

  /* ---------------- 主题调色板生成 ----------------
     原则：所选主题色本身即 --accent（默认主题 = v11 浅色化蓝 #83A8EC），
     其余色阶由它按 HSL 推导，保证任意主题（含自定义）都能自洽成一套配色。 */
  function luminance(hex) {
    var c = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  }

  /* 主色底上的前景色：亮底用深字、暗底用白字，避免浅黄/浅橙主题白字看不清 */
  function onColor(hex) {
    return luminance(hex) > 0.62 ? "#16181D" : "#FFFFFF";
  }

  function buildPalette(baseHex, mode, themeKey) {
    var c = hexToRgb(baseHex) || hexToRgb(DEFAULT_THEME.base);
    var base = rgbToHsl(c.r, c.g, c.b);
    var h = base.h, l = base.l;
    var sat = base.s;
    var v = {};

    if (mode === "dark") {
      var dAccL = (l >= 45) ? l : 58;          /* 暗色：主色直接沿用所选色（过暗时抬到 58%） */
      var dAccS = clamp(sat, 18, 92);
      v["--accent"]        = hsl(h, dAccS, dAccL);
      /* 对标拾心界 black --accent：主色色相 +40° 的低饱和辅助色（#5A5A6A 配 #707080 灰紫） */
      v["--accent-2"]      = hsl(((h + 40) % 360), clamp(dAccS * 0.45, 0, 26), Math.min(dAccL - 10, 68));
      v["--accent-deep"]   = hsl(h, dAccS, clamp(dAccL + 8, 0, 92));
      v["--accent-strong"] = hsl(h, dAccS, clamp(dAccL - 12, 20, 100));
      v["--leaf"]          = hsl(h, dAccS * 0.7, 38);
      v["--leaf-soft"]     = hsl(h, dAccS * 0.55, 28);
      v["--crystal-2"]     = hsl(h, dAccS * 0.6, 33);
      v["--crystal-3"]     = hsl(h, dAccS * 0.45, 43);
      v["--crystal-sky"]   = hsl(h, dAccS * 0.6, 46);

      v["--bg"]            = hsl(h, 14, 8);
      v["--bg-top"]        = hsl(h, 14, 11);
      v["--bg-deep"]       = hsl(h, 16, 6);
      v["--page-outside"]  = hsl(h, 14, 5);
      v["--tint-1"]        = hsl(h, 14, 13);
      v["--tint-2"]        = hsl(h, 14, 17);
      v["--hover-bg"]      = hsl(h, 14, 12);

/* v25：背景——暗色主题斜向渐变 + 低透明主题色光斑（静止不动） */
      v["--bg-grad-1"] = hsl(h, 15, 9);
      v["--bg-grad-2"] = hsl(h, 17, 12);
      v["--bg-grad-3"] = hsl(h, 15, 8);
      v["--bg-grad-4"] = hsl(h, 18, 11);
      v["--bg-pattern-1"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.16)";
      v["--bg-pattern-2"] = "rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.12)";
      v["--bg-pattern-3"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.08)";
      v["--bg-pattern-4"] = "rgba(" + rgbTriple(v["--accent-strong"]) + ", 0.10)";
      v["--bg-pattern-5"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.12)";

      v["--card"]          = hsl(h, 12, 13);
      /* 对标拾心界 black：暗色卡片描边 = 低亮半透明白（原深色描边在深底上不可见） */
      v["--card-border"]   = "rgba(255, 255, 255, 0.10)";
      v["--divider"]       = "rgba(255, 255, 255, 0.08)";
      v["--surface"]       = hsl(h, 12, 16.5);
      v["--surface-ghost"] = "rgba(255, 255, 255, 0.08)";
      v["--glass-nav"]     = "rgba(26, 28, 34, 0.62)";
      v["--glass-icon"]    = "rgba(255, 255, 255, 0.08)";
      v["--glass-border"]  = "rgba(255, 255, 255, 0.10)";
      v["--glass-card"]    = "rgba(255, 255, 255, 0.10)";
      v["--glass-card-border"] = "rgba(255, 255, 255, 0.16)";
      v["--glass-blur"]    = "blur(22px) saturate(160%)";
      /* v29：区域卡片通透度所需的「可分解颜色」（实底卡片 / 底栏玻璃底拆成 rgb + alpha 两段） */
      v["--card-rgb"]      = hslTriple(h, 12, 13);
      v["--surface-rgb"]   = hslTriple(h, 12, 16.5);
      v["--glass-nav-rgb"] = "26, 28, 34";
      v["--glass-nav-a"]   = "0.62";

      /* v25：暗色模式文字同样统一到「外观主题色相」——饱和度跟着主色走，不再出现纯白 / 纯灰 */
      v["--text"]          = hsl(h, dAccS * 0.30, 96);
      v["--text-1"]        = hsl(h, dAccS * 0.28, 91);
      v["--text-2"]        = hsl(h, dAccS * 0.26, 80);
      /* v79：暗色次级文字提亮 —— 副标题 / 说明 / 标签在深色卡片底上更可读 */
      v["--text-3"]        = hsl(h, dAccS * 0.24, 76);
      v["--text-4"]        = hsl(h, dAccS * 0.22, 68);
      v["--text-5"]        = hsl(h, dAccS * 0.20, 57);
      v["--text-title"]    = hsl(h, dAccS * 0.30, 96);
      v["--sub"]           = hsl(h, dAccS * 0.26, 79);

      v["--avatar-1"]      = hsl(h, dAccS, dAccL - 8);
      v["--avatar-2"]      = "#2A2F39";
      v["--shadow-card"]   = "0 2px 8px rgba(0, 0, 0, 0.30)";  /* 对齐拾心界暗色 --shadow-sm */
      /* v18：底栏阴影改用主题色系（原为黑色投影） */
      v["--shadow-nav"]    = "0 -2px 12px rgba(" + rgbTriple(v["--accent-strong"]) + ", 0.42)";
      /* v31：与亮色分支同为 0.66 —— 透出背后背景 + backdrop-filter 磨砂 */
      /* v87：100% 实心修复 —— 基色改不透明，通透度由 --wave-a 经 fill-opacity 线性控制 */
      v["--wave-fill"]     = "rgba(29, 31, 37, 1)";
      v["--wave-body"]     = "rgba(24, 26, 31, 0.66)";
      v["--wave-glow"]     = hsla(h, dAccS * 0.5, 34, 0.85);
    } else {
      var baseHex6 = normHex(baseHex) || DEFAULT_THEME.base;
      var accS = sat;                                   /* 明色模式：主色 = 所选色本身，不做偏移 */
      var accL = l;
      v["--accent"]        = baseHex6;
      /* 对标拾心界 --accent：主色色相 +40° 的淡辅助色（浅蓝主色配淡紫 #D0C8E8） */
      v["--accent-2"]      = hsl(((h + 40) % 360), Math.min(accS * 0.55, 30), Math.min(accL + 6, 90));
      v["--accent-deep"]   = hsl(h, accS, accL >= 24 ? accL - 9 : Math.min(accL + 10, 92));
      v["--accent-strong"] = hsl(h, accS, accL >= 32 ? accL - 18 : Math.min(accL + 22, 84));
      v["--leaf"]          = hsl(h, accS * 0.85, Math.min(accL + 16, 88));
      v["--leaf-soft"]     = hsl(h, accS * 0.8, Math.min(accL + 24, 93));
      v["--crystal-2"]     = hsl(h, accS * 0.8, Math.min(accL + 14, 86));
      v["--crystal-3"]     = hsl(h, accS * 0.7, Math.min(accL + 20, 92));
      v["--crystal-sky"]   = hsl(h, accS * 0.9, Math.min(accL + 12, 86));

      /* v15：页面底色改为「当前主题色的浅色系」——不再往白里收（旧版非默认主题把亮度收到
         98% 以上、饱和度再砍到两成，浅到看不出色相，整页发白）。现统一取同色相、中低饱和、
         高明度的浅调，让整页（含顶部 48px 那条原白条区域）都带上主题色倾向。 */
      /* v17：亮色模式整页改走「主题色浅调」，不再掺白 —— 顶部、内容区、桌面留白同一色相 */
      var whiten = 0;
      /* 对标拾心界：亮色背景 = 主色同色相浅色渐变（bg-main 近白带色相 + 三段浅调），
         不再是纯白；卡片半透明白叠在其上呈玻璃拟态，文字深蓝灰。 */
      var bgSat = Math.min(accS * 0.30, 22);
      var bgL   = 96.5;
      v["--bg"]            = hsl(h, bgSat, bgL);
      v["--bg-top"]        = hsl(h, bgSat, bgL);
      v["--bg-deep"]       = hsl(h, Math.min(accS * 0.45, 30), 94);
      v["--page-outside"]  = hsl(h, Math.min(accS * 0.40, 26), 90);
      v["--tint-1"]        = hsl(h, Math.min(accS * 0.28, 20), 97.5);
      v["--tint-2"]        = hsl(h, Math.min(accS * 0.35, 24), 93.5);
      v["--hover-bg"]      = hsla(h, Math.min(accS * 0.30, 20), 95, 0.9);

/* v25：背景——主题色浅调斜向渐变（多 stop）+ 多团低透明主题色光斑，
         光斑静止不流动，换主题整体变色；不再用大半径模糊的弥散层。 */
      /* 对标拾心界 --bg-gradient：160deg 三档浅调（主色浅亮 → 近白带色相 → 浅调） */
      v["--bg-grad-1"] = hsl(h, accS, Math.min(accL + 8, 93.5));
      v["--bg-grad-2"] = hsl(h, bgSat, bgL);
      v["--bg-grad-3"] = hsl(h, Math.min(accS * 0.55, 34), 94.5);
      v["--bg-grad-4"] = hsl(h, Math.min(accS * 0.35, 24), 96.5);
        /* v26：光斑加深 —— 原透明度太淡，叠在浅底上等于"没有背景" */
        /* v33：底改纯白后，光斑压到极淡（约原 1/4）—— 整页看上去就是白底，
           主题色只在卡片 / 图标 / 按键上体现，背景不再偏色。 */
        v["--bg-pattern-1"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.040)";
        v["--bg-pattern-2"] = "rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.030)";
        v["--bg-pattern-3"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.020)";
        v["--bg-pattern-4"] = "rgba(" + rgbTriple(v["--accent-strong"]) + ", 0.025)";
        v["--bg-pattern-5"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.030)";

      /* 对标拾心界：卡片 = 50% 半透明白 + 14% 主色叠加（--card-soft-bg 同构），
         无深色描边，边框改半透明白（--border-light）；分区卡片底 = 55% 半透明白（--bg-card）。 */
      v["--card"]          = "linear-gradient(rgba(255,255,255,0.50), rgba(255,255,255,0.50)), rgba(" + rgbTriple(v["--accent"]) + ", 0.14)";
      v["--card-border"]   = "rgba(255, 255, 255, 0.65)";
      v["--divider"]       = "rgba(190, 195, 210, 0.45)";
      v["--surface"]       = "rgba(255, 255, 255, 0.55)";
      v["--surface-ghost"] = "rgba(255, 255, 255, 0.70)";
      v["--glass-nav"]     = "rgba(255, 255, 255, 0.70)";
      v["--glass-icon"]    = "rgba(255, 255, 255, 0.55)";
      v["--glass-border"]  = "rgba(255, 255, 255, 0.60)";
      v["--glass-card"]    = "rgba(255, 255, 255, 0.50)";
      v["--glass-card-border"] = "rgba(255, 255, 255, 0.60)";
      v["--glass-blur"]    = "blur(22px) saturate(180%)";
      /* v29：区域卡片通透度所需的「可分解颜色」——卡片底已改渐变 / 半透明白，rgb 三元组固定为白 */
      v["--card-rgb"]      = "255, 255, 255";
      v["--surface-rgb"]   = "255, 255, 255";
      v["--glass-nav-rgb"] = "255, 255, 255";
      v["--glass-nav-a"]   = "0.70";

      /* 对标拾心界：文字 = 主色同色相深蓝灰系（--text-dark #3A4050 → --text-lighter #B0B5C0），
         不再纯黑；层级用同色相不同明度拉开。 */
      v["--text"]          = hsl(h, accS * 0.12, 27);
      v["--text-1"]        = hsl(h, accS * 0.10, 38);
      v["--text-2"]        = hsl(h, accS * 0.08, 55);
      v["--text-3"]        = hsl(h, accS * 0.07, 62);
      v["--text-4"]        = hsl(h, accS * 0.06, 70);
      v["--text-5"]        = hsl(h, accS * 0.05, 76);
      v["--text-title"]    = hsl(h, accS * 0.12, 24);
      v["--sub"]           = hsl(h, accS * 0.10, 33);

      v["--avatar-1"]      = hsl(h, accS, accL - 18);
      v["--avatar-2"]      = "#455A64";
      /* 对标拾心界 --shadow-sm：偏冷灰投影（原纯黑投影） */
      v["--shadow-card"]   = "0 2px 8px rgba(160, 170, 190, 0.06)";  /* 对齐拾心界 --shadow-sm */
      /* v18：底栏阴影改用主题色系（原为黑色投影） */
      v["--shadow-nav"]    = "0 -2px 10px rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.16)";
      /* v17：白色海浪块是「背景仍显白」的元凶 —— 改为带主题 hue 的低饱和浅色，
         比 --bg 再浅一档，既透出主题色又保留柔和的波浪层次 */
      /* v28：亮色主浪卡通透度对齐暗色 —— alpha 与暗色分支同为 0.85，
         亮色 / 暗色两套主题下浪卡"透"的程度完全一致。 */
      /* v31：通透度 0.85 → 0.66，对齐 .row-list / .wc-card 那层 0.66 白底，
         让 backdrop-filter 的 blur(22px) 真正透得出来（磨砂玻璃）。 */
      /* 对标拾心界：波浪沿用主题色浅调（同 --bg 色相，比 bg 稍亮），保持磨砂通透 */
      /* v87：100% 实心修复 —— 基色改不透明，通透度由 --wave-a 经 fill-opacity 线性控制 */
      v["--wave-fill"]     = hsla(h, Math.min(accS * 0.40, 26), 95.5, 1);
      v["--wave-body"]     = hsla(h, Math.min(accS * 0.40, 26), 95.5, 0.66);
      v["--wave-glow"]     = hsla(h, Math.min(accS * 0.50, 34), 78, 0.9);
    }

    /* 图标统一色 & 底栏选中底色
       --icon-ink    ：底栏未选中图标 + 字卡/课程/设置页条目图标，两处共用同一值，保证颜色一致；
                       不再把主色压深成实底；选中图标固定白色。 */
    v["--icon-ink"] = v["--accent-deep"];
    /* v20：按键配色 —— 按键卡片 = 主题色，按键 icon = 白色（此前是「浅底 + 主色 icon」，属于反的） */
    v["--key-card"]        = v["--accent-deep"];
    v["--key-card-strong"] = v["--accent-strong"];
    v["--key-grad"]        = "linear-gradient(150deg, " + v["--accent-deep"] + " 0%, " + v["--accent-strong"] + " 100%)";
    v["--key-ink"]         = "#FFFFFF";
    /* v18：当前主题的色相（度），供顶栏水晶装饰「随机不规则多色」取样 */
    v["--accent-h"] = String(Math.round(((h % 360) + 360) % 360));
    if (mode === "dark") {
      v["--nav-active-bg"] = "linear-gradient(135deg, " + v["--accent"] + " 0%, " + v["--accent-strong"] + " 100%)";
    } else {
/* v11：，
         观感浅、透、柔和；白图标叠在柔光底上，不再是"深色实底"的沉重感。 */
      v["--nav-active-bg"] = "linear-gradient(135deg, " +
        "rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.72) 0%, " +
        "rgba(" + rgbTriple(v["--accent"]) + ", 0.55) 100%)";
    }

/* v21：未选中按键 / 条目图标 = 深一档主题色（的浅底 + 深 icon）；
       选中态白色 icon 由 .nav-btn.active .badge-sym 单独覆盖，不依赖 --icon-ink。 */
    v["--icon-ink"] = v["--accent-deep"];
    v["--on-accent"]        = onColor(v["--accent"]);
    v["--on-accent-deep"]   = onColor(v["--accent-deep"]);
    v["--on-accent-strong"] = onColor(v["--accent-strong"]);
    v["--accent-rgb"]        = rgbTriple(v["--accent"]);
    v["--accent-2-rgb"]      = rgbTriple(v["--accent-2"]);
    v["--accent-deep-rgb"]   = rgbTriple(v["--accent-deep"]);
    v["--accent-strong-rgb"] = rgbTriple(v["--accent-strong"]);
    v["--leaf-rgb"]          = rgbTriple(v["--leaf"]);
    return v;
  }

  /* =========================================================
     v29：各区域自定义 —— ① 图标色 ② 字体色 ③ 卡片通透度 / 不透明度
       · 分组：主导航（底部导航） / 内容页（首页 · 字卡 · 课程 · 设置）
       · 图标 / 字体：未自定义不写变量，自动回落主题色（默认观感不变）
       · 卡片不透明度：按区域写 --zc-a-{key}（100% = 不写变量，观感与 v28 一致）；
         二级页由 zoneApplyPages 在页面根节点写 --zc-a，页内卡片统一读它
       · 变量：--zone-ico-{key} / --zone-txt-{key} / --zc-a-{key}
     ========================================================= */
  var ZONE_KEY = "snowcrystal.zones.v1";
  var CARD_MIN = 0, CARD_MAX = 100, CARD_DEF = 50;    /* v34/v78：卡片不透明度区间 0%~100%，0% = 完全透明，默认 50% = 半透明 */
  var ZONE_GROUPS = [
    { name: "主导航", zones: [
      { key: "tabbar", name: "底部导航", desc: "底栏雪花键与四键图标", cardDesc: "悬浮底栏玻璃底", ico: true, txt: false, card: true }
    ] },
    { name: "内容页", zones: [
      { key: "home", name: "首页", desc: "顶部信息区与功能列表", cardDesc: "海浪卡 · 消息卡 · 首屏其余卡片", ico: true, txt: true, card: true,
        /* v31：首页卡片下的两个细分项 —— 各自独立一行滑块，互不牵连 */
        subs: [
          { key: "home-list", name: "下方列表", cardDesc: "首页按键下的功能列表卡" },
          /* v60：该项只用于 --zc-a-frame 的默认下发（默认主题相框卡面回实心）；
             它的「颜色 / 不透明度」设置界面已挪到「美化设置 → 组件样式 → 组件样式各区域」 */
          { key: "frame", name: "相册卡片流", cardDesc: "三格相框卡片流" }
        ] },
      { key: "wordcard", name: "字卡", desc: "字卡入口与各分组库", cardDesc: "入口列表 · 词条卡 · 面板", ico: true, txt: true, card: true },
      { key: "discover", name: "课程", desc: "课程页条目", cardDesc: "横幅 · 课程条目", ico: true, txt: true, card: true },
      { key: "settings", name: "设置", desc: "设置页与外观主题", cardDesc: "设置分组 · 外观面板", ico: true, txt: true, card: true }
    ] }
  ];
  /* 页面 → 区域：卡片系数按区域下发到对应二级页根节点，CSS 里不必逐页写选择器 */
  var PAGE_ZONE = {
    "home": "home",
    "wordcard": "wordcard", "wc-lib": "wordcard", "wc-lib-group": "wordcard",
    "wordcard-face-lib": "wordcard",
    "wc-pat": "wordcard", "wc-sticker": "wordcard", "quotes": "wordcard",
    "discover": "discover",
    "settings": "settings", "appearance": "settings",
    "fontcolor": "settings", "iconcolor": "settings", "cardcolor": "settings",
    "beautify": "settings", "component": "settings", "data-manage": "settings",
    /* v83：顶部组件页沿用 settings 配色区域 */
    "top-components": "settings"
  };
  var zoneState = { ico: {}, txt: {}, card: {}, fc: {}, ic: {}, cc: {}, ca: {}, cp: {}, cpa: {}, cpt: {}, cpb: {} };
  var FONT_KEY = "global";
  var lastPalette = {};   /* applyState 写过的主题色板：字体色复位时用它还原默认 */

  /* ---------------- v32：字体颜色细分项（独立二级页「字体颜色」） ----------------
     kind = "fc"：颜色写入 zoneState.fc[key] → 下发 CSS 变量 --fc-{key}（见 applyFontColors）；
     每一项各自独立、互不牵连，未设置即 removeProperty，回落到该项原有默认色。
     第一组「全站文字」沿用旧的全站统一色（kind = "txt"，key = global）。 */
  var FC_GROUPS = [
    { name: "首页格言", items: [
      { key: "quote", name: "首页格言", desc: "首页每日一句（居中显示的那行小字）" }
    ] },
    { name: "三维十二纬", items: [
      { key: "latfoot", name: "三维十二纬短句", desc: "头像区下方「我在三维的…你在…纬的…」" },
      { key: "love", name: "跨越纬度的爱恋", desc: "时间相隔下方的竖排小字" }
    ] },
    { name: "时间相隔", items: [
      { key: "metric-label", name: "标签「时间相隔」", desc: "大数字左边的小标签" },
      { key: "metric-num", name: "相隔数字", desc: "中间放大的秒数" },
      { key: "metric-unit", name: "间隔单位", desc: "大数字右边的小单位（秒 / 分钟 / 小时）" }
    ] },
    { name: "日历", items: [
      { key: "cal-month", name: "月份", desc: "横条最左侧的月份" },
      { key: "cal-lunar", name: "农历", desc: "月份右侧的农历日期（如「农历八月十八」）" },
      { key: "cal-w", name: "星期 · 未选中", desc: "每格上方的星期（完整月历同用）" },
      { key: "cal-day", name: "日期 · 未选中", desc: "普通日期数字（含完整月历）" },
      { key: "cal-today", name: "日期 · 选中（今日）", desc: "今天 · 完整月历里选中的那天" },
      { key: "cal-out", name: "日期 · 非本月", desc: "完整月历里非本月的日期" }
    ] },
    { name: "昵称", items: [
      { key: "nickname", name: "昵称 · 已命名", desc: "头像下方已填写的昵称" },
      { key: "nickname-empty", name: "昵称 · 未命名", desc: "昵称留空时显示的占位文字" }
    ] },
    { name: "各区域按键", items: [
      { key: "tab-idle", name: "横排按键 · 未选中", desc: "首页相框下方四个文字按键（未选中态）" },
      { key: "tab-active", name: "横排按键 · 选中", desc: "当前选中的那个按键" }
    ] },
    { name: "标题", items: [
      { key: "page-title", name: "页面标题", desc: "各页顶部大标题（字卡 / 课程 / 设置…）" }
    ] },
    { name: "功能卡片字体", items: [
      { key: "fn-title", name: "功能卡片 · 标题", desc: "按键下方功能列表的主标题" },
      { key: "fn-desc", name: "功能卡片 · 说明", desc: "功能列表的副说明" },
      { key: "fn-arrow", name: "功能卡片 · 箭头", desc: "卡片右侧的「›」" },
      { key: "card-title", name: "条目卡片 · 标题", desc: "字卡 / 课程 / 设置页的条目主标题" },
      { key: "card-desc", name: "条目卡片 · 说明", desc: "条目卡片的副说明" }
    ] },
  ];
  function fcEach(fn) {
    for (var g = 0; g < FC_GROUPS.length; g++) {
      for (var i = 0; i < FC_GROUPS[g].items.length; i++) { fn(FC_GROUPS[g].items[i], FC_GROUPS[g]); }
    }
  }
  /* 把每个细项颜色下发为 --fc-{key}；未设置则移除变量 → CSS 回落默认 */
  function applyFontColors() {
    var root = document.documentElement;
    fcEach(function (it) {
      var v = zoneState.fc[it.key];
      if (v) { root.style.setProperty("--fc-" + it.key, v); }
      /* v38 ①：默认主题（灰色系）——「字体颜色」里的各分类，未自定义时一律纯黑；
         其它主题维持原样（移除变量 → CSS 各细项按主题色板回落）。 */
      else if (state.key === "default") { root.style.setProperty("--fc-" + it.key, SW_FONT_BLACK); }
      else { root.style.removeProperty("--fc-" + it.key); }
    });
  }

  /* =========================================================
     v38 ③：颜色设置页的「色块跟随主题」
       · 未自定义的色块，不再显示写死的默认色（浅绿 / #83A8EC / 白），
         而是显示「当前主题下该项真实渲染出来的颜色」——
         做法：把 CSS 里那串 var(...) 回退链交给浏览器解析（离屏探针 + getComputedStyle），
         解析结果即真实生效色；不必在 JS 里再写一份主题推导，也就不会与 CSS 走偏。
       · 一旦自定义，色块回到用户自己挑的颜色（换主题不再影响它）；点「复位」即回到跟随主题。
       · 覆盖面：字体颜色（--fc-*）、图标颜色（--fic-*）、卡片颜色（--cc-rgb-*）、
         区域图标（--zone-ico-*，若该面板存在）、全站文字（--text）。
     ========================================================= */
  var SW_FONT_BLACK = "#000000";
  /* 字体颜色各细项在 CSS 里的回退链（与 --fc-* 规则一一对应；未列出的按 --accent-deep 兜底） */
  var SW_FC = {
    quote: "var(--accent-deep)",
    latfoot: "var(--text-4)",
    nickname: "var(--accent-deep)",
    "nickname-empty": "var(--fc-nickname, rgba(var(--accent-deep-rgb), 0.66))",
    "metric-label": "var(--accent-deep)",
    "metric-num": "var(--fc-metric-label, var(--accent-deep))",
    "metric-unit": "var(--fc-metric-label, var(--accent-deep))",
    "cal-month": "var(--accent-deep)",
    "cal-lunar": "var(--accent-deep)",
    "cal-w": "var(--text-4)",
    "cal-day": "var(--text-2)",
    "cal-today": "var(--accent-deep)",
    "cal-out": "var(--text-5)",
    love: "var(--accent-deep)",
    "tab-idle": "var(--text-4)",
    "tab-active": "var(--accent-deep)",
    "page-title": "var(--text-title)",
    "fn-title": "var(--text-title)",
    "fn-desc": "var(--text-4)",
    "fn-arrow": "var(--text-5)",
    "card-title": "var(--text-1)",
    "card-desc": "var(--text-4)"
  };
  /* 图标颜色各细项在 CSS 里的回退链（与 --fic-* 规则一一对应） */
  var SW_IC = {
    "tab-bg": "rgba(var(--accent-rgb), 0.20)",
    "tab-ink": "var(--icon-ink, var(--accent-deep))",
    "tab-bg-on": "rgba(var(--accent-rgb), 0.40)",
    "tab-ink-on": "#FFFFFF",
    "snow": "var(--accent-deep)",
    "home-bg": "rgba(var(--accent-rgb), 0.20)",
    "home-ink": "var(--accent-deep)",
    "home-bg-on": "var(--fic-home-bg, rgba(var(--accent-rgb), 0.20))",
    "home-ink-on": "var(--fic-home-ink, var(--accent-deep))",
    "wc-bg": "rgba(var(--accent-rgb), 0.20)",
    "wc-ink": "var(--accent-deep)",
    "wc-bg-on": "var(--fic-wc-bg, rgba(var(--accent-rgb), 0.20))",
    "wc-ink-on": "var(--fic-wc-ink, var(--accent-deep))",
    "disc-bg": "rgba(var(--accent-rgb), 0.20)",
    "disc-ink": "var(--accent-deep)",
    "disc-bg-on": "var(--fic-disc-bg, rgba(var(--accent-rgb), 0.20))",
    "disc-ink-on": "var(--fic-disc-ink, var(--accent-deep))",
    "set-bg": "rgba(var(--accent-rgb), 0.20)",
    "set-ink": "var(--accent-deep)",
    "set-bg-on": "var(--fic-set-bg, rgba(var(--accent-rgb), 0.20))",
    "set-ink-on": "var(--fic-set-ink, var(--accent-deep))"
  };
  /* 卡片颜色各细项在 CSS 里的回退链（与 --cc-rgb-* 规则一一对应） */
  var SW_CC = {
    tabbar: "rgba(var(--cc-rgb-tabbar, var(--glass-nav-rgb, 255, 255, 255)), 1)",
    "home-list": "rgba(var(--cc-rgb-home-list, var(--surface-rgb, 255, 255, 255)), 1)",
    wordcard: "rgba(var(--cc-rgb-wordcard, 255, 255, 255), 1)",
    "wc-tool": "rgba(var(--cc-rgb-wc-tool, var(--accent-rgb)), 1)",
    discover: "rgba(var(--cc-rgb-discover, var(--card-rgb, 255, 255, 255)), 1)",
    settings: "rgba(var(--cc-rgb-settings, var(--card-rgb, 255, 255, 255)), 1)"
  };
  var _swWrap = null, _swEl = null;
  /* v61：未自定义时，色块预览取「当前主题下真实生效的主色」（不再写死 #83A8EC 蓝） */
  function themeSwatch() {
    var hex = swProbe("rgb(var(--accent-rgb))");
    return (hex && hex !== "#FFFFFF") ? hex : "#D0D0D0";
  }
  function swHex2(n) {
    var v = Math.round(n);
    if (!isFinite(v)) { return "00"; }
    v = Math.max(0, Math.min(255, v));
    var h = v.toString(16).toUpperCase();
    return (h.length < 2 ? "0" + h : h);
  }
  /* 离屏探针：把一条 CSS 颜色表达式交给浏览器解析，返回实际生效的 #RRGGBB（解析不出返回 ""） */
  function swProbe(expr) {
    if (!_swWrap) {
      _swWrap = document.createElement("span");
      _swWrap.setAttribute("aria-hidden", "true");
      _swWrap.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;color:rgb(1,2,3);";
      _swEl = document.createElement("span");
      _swWrap.appendChild(_swEl);
    }
    if (!_swWrap.parentNode) { (document.body || document.documentElement).appendChild(_swWrap); }
    _swEl.style.color = "";
    _swEl.style.color = expr;
    var c = window.getComputedStyle ? window.getComputedStyle(_swEl).color : "";
    if (!c) { return ""; }
    var lp = c.indexOf("("), rp = c.indexOf(")");
    if (lp < 0 || rp < 0) { return ""; }
    var p = c.slice(lp + 1, rp).split(",");
    if (p.length < 3) { return ""; }
    var r = parseFloat(p[0]), g = parseFloat(p[1]), b = parseFloat(p[2]);
    var a = (p.length > 3) ? parseFloat(p[3]) : 1;
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) { return ""; }
    if (r === 1 && g === 2 && b === 3 && a === 1) { return ""; }   /* 表达式非法 → 走调用方兜底 */
    if (!isFinite(a) || a < 1) {
      /* 半透明色：按自身透明度压到当前主题背景上，得到肉眼看到的实色 */
      var bgs = (lastPalette && lastPalette["--bg"]) ? lastPalette["--bg"] : "#FFFFFF";
      var bg = hexToRgb(bgs) || { r: 255, g: 255, b: 255 };
      var aa = isFinite(a) ? Math.max(0, a) : 1;
      r = r * aa + bg.r * (1 - aa);
      g = g * aa + bg.g * (1 - aa);
      b = b * aa + bg.b * (1 - aa);
    }
    return "#" + swHex2(r) + swHex2(g) + swHex2(b);
  }
  /* 某个颜色行「跟随主题」时应该显示的色值（已自定义 → 返回 ""，表示不用改） */
  function swThemeHex(kind, key) {
    if (kind === "txt") {
      if (zoneState.txt && zoneState.txt[key]) { return ""; }
      return swProbe("var(--text)") || "#000000";
    }
    if (zoneState[kind] && zoneState[kind][key]) { return ""; }
    if (kind === "fc") { return swProbe("var(--fc-" + key + ", " + (SW_FC[key] || "var(--accent-deep)") + ")"); }
    if (kind === "ic") { return swProbe("var(--fic-" + key + ", " + (SW_IC[key] || "var(--accent-deep)") + ")"); }
    if (kind === "ico") { return swProbe("var(--zone-ico-" + key + ", var(--accent-deep))"); }
    if (kind === "cc") { return swProbe(SW_CC[key] || "rgba(var(--card-rgb, 255, 255, 255), 1)"); }
    return "";
  }
  /* 面板重建 / 切换主题后调用：把所有「未自定义」的色块刷成当前主题下真实生效的颜色 */
  function refreshSwatchColors() {
    var inputs = document.querySelectorAll(".zone-row .zone-color[data-kind][data-zone]");
    if (!inputs || !inputs.length) { return; }
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      if (document.activeElement === inp) { continue; }   /* 正在改的那一行不动 */
      var hex = swThemeHex(inp.getAttribute("data-kind"), inp.getAttribute("data-zone"));
      if (hex) { inp.value = hex; }
    }
  }

  function zoneEach(fn) {
    for (var g = 0; g < ZONE_GROUPS.length; g++) {
      for (var i = 0; i < ZONE_GROUPS[g].zones.length; i++) { fn(ZONE_GROUPS[g].zones[i], ZONE_GROUPS[g]); }
    }
  }
  /* v31：区域下的细分项（如首页「下方列表」「相册卡片流」）—— 独立开关，不参与上面的区域循环 */
  function zoneEachSub(fn) {
    for (var g = 0; g < ZONE_GROUPS.length; g++) {
      for (var i = 0; i < ZONE_GROUPS[g].zones.length; i++) {
        if (!ZONE_GROUPS[g].zones[i].subs) { continue; }
        for (var s = 0; s < ZONE_GROUPS[g].zones[i].subs.length; s++) { fn(ZONE_GROUPS[g].zones[i].subs[s]); }
      }
    }
  }
  function zoneLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(ZONE_KEY) : null;
      if (!raw) { return; }
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") { return; }
      if (saved.ico && typeof saved.ico === "object") { zoneState.ico = saved.ico; }
      if (saved.txt && typeof saved.txt === "object") { zoneState.txt = saved.txt; }
      if (saved.card && typeof saved.card === "object") { zoneState.card = saved.card; }
    if (saved.cp && typeof saved.cp === "object") { zoneState.cp = saved.cp; }
    if (saved.cpa && typeof saved.cpa === "object") { zoneState.cpa = saved.cpa; }
    if (saved.cpt && typeof saved.cpt === "object") { zoneState.cpt = saved.cpt; }
    if (saved.cpb && typeof saved.cpb === "object") { zoneState.cpb = saved.cpb; }
      /* v32：字体颜色细项 */
      if (saved.fc && typeof saved.fc === "object") { zoneState.fc = saved.fc; }
      /* v33：图标颜色细项 + 卡片颜色 / 不透明度细项 */
      if (saved.ic && typeof saved.ic === "object") { zoneState.ic = saved.ic; }
      if (saved.cc && typeof saved.cc === "object") { zoneState.cc = saved.cc; }
      if (saved.ca && typeof saved.ca === "object") { zoneState.ca = saved.ca; }
      /* v30：字体颜色由「按区域」改成「全站统一」——
         旧数据里只要存过任意一个区域字体色，就迁移为全局字体色。 */
      if (zoneState.txt && !zoneState.txt[FONT_KEY]) {
        var legacy = ["home", "wordcard", "discover", "settings", "tabbar"], t;
        for (t = 0; t < legacy.length; t++) {
          if (zoneState.txt[legacy[t]]) { zoneState.txt = { global: zoneState.txt[legacy[t]] }; break; }
        }
        if (!zoneState.txt[FONT_KEY]) { zoneState.txt = {}; }
      }
    } catch (e) { /* 读不到就用默认 */ }
  }
  function zoneSave() {
    try { if (window.localStorage) { window.localStorage.setItem(ZONE_KEY, JSON.stringify(zoneState)); } } catch (e) { /* 忽略 */ }
  }
  /* 卡片不透明度（%）：v34 起区间 0%~100% —— 缺省 / 脏数据回落到「当前主题默认」；0 为有效值（完全透明）
     v35：默认主题 = 灰色系 —— 悬浮底栏 100%（不做额外压暗），其余各界面卡片 20%；其它主题一律 100%。 */
  function themeCardDefault(key) {
    if (state.key === "default") { return (key === "tabbar") ? CARD_DEF : 20; }
    return CARD_DEF;
  }
  function cardPct(key) {
    var n = parseInt(zoneState.card[key], 10);
    if (!isFinite(n)) { return themeCardDefault(key); }
    return Math.max(CARD_MIN, Math.min(CARD_MAX, n));
  }
  /* ---- v30：全局字体颜色 ----
     取一个颜色，按「层级 = 同一颜色的不同透明度」推导出全部文字变量
     （--text / --text-1 ~ --text-5 / --text-title / --sub），一次性整体下发。
     这样全站所有文字（标题 / 正文 / 说明 / 角标 / 时间 / 底栏……）一起生效，
     不再是旧版那样只改 .row-title / .fn-title 几处。 */
  /* 注意：本函数名不能叫 hexToRgb —— 上面调色板已有一个同名 hexToRgb（返回 {r,g,b}），
     函数声明会提升、同名后者覆盖前者，曾导致整套色板取到 undefined → 颜色变 NaN。 */
  function hexToRgbTriple(hex) {
    var s = String(hex || "").replace("#", "");
    if (s.length === 3) { s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]; }
    if (!/^[0-9a-fA-F]{6}$/.test(s)) { return null; }
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function fontTint(c, a) {
    return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")";
  }
  var TEXT_VARS = ["--text", "--text-1", "--text-2", "--text-3", "--text-4", "--text-5", "--text-title", "--sub"];
  function applyFontColor() {
    var root = document.documentElement, i, name;
    var c = hexToRgbTriple(zoneState.txt[FONT_KEY]);
    if (!c) {
      /* v35：默认主题（灰色系）—— 全局所有区域文字统一 #000000 纯黑 */
      if (state.key === "default") {
        for (i = 0; i < TEXT_VARS.length; i++) { root.style.setProperty(TEXT_VARS[i], "#000000"); }
        return;
      }
      /* 未自定义：回到主题色板默认 —— 亮色主题 = 黑色系，暗色 = 自适应亮色 */
      for (i = 0; i < TEXT_VARS.length; i++) {
        name = TEXT_VARS[i];
        if (lastPalette[name]) { root.style.setProperty(name, lastPalette[name]); }
        else { root.style.removeProperty(name); }
      }
      return;
    }
    root.style.setProperty("--text", fontTint(c, 1));
    root.style.setProperty("--text-1", fontTint(c, 1));
    root.style.setProperty("--text-2", fontTint(c, 0.88));
    root.style.setProperty("--text-3", fontTint(c, 0.74));
    root.style.setProperty("--text-4", fontTint(c, 0.60));
    root.style.setProperty("--text-5", fontTint(c, 0.44));
    root.style.setProperty("--text-title", fontTint(c, 1));
    root.style.setProperty("--sub", fontTint(c, 0.80));
  }
  function zoneApplyVars() {
    var root = document.documentElement;
    zoneEach(function (z) {
      var name = "--zone-ico-" + z.key, val = zoneState.ico[z.key], pct;
      if (val) { root.style.setProperty(name, val); } else { root.style.removeProperty(name); }
      /* 字体色已改为全站统一（见 applyFontColor），旧的区域字体变量一律清掉 */
      root.style.removeProperty("--zone-txt-" + z.key);
      pct = cardPct(z.key);
      if (pct === CARD_DEF) { root.style.removeProperty("--zc-a-" + z.key); }
      else { root.style.setProperty("--zc-a-" + z.key, (pct / 100).toFixed(3)); }
    });
    /* v31：细分项独立下发（100% = 不写变量 → CSS 回落到所属区域系数） */
    zoneEachSub(function (sub) {
      var spct = cardPct(sub.key);
      /* v37：默认（灰色系）主题 —— 「相册卡片流」未自定义时按 100% 实心白卡渲染。
         该主题此前把「各界面卡片」统一压到 20%，相框卡面被压成半透明空白
         （卡片颜色里挑的主题色几乎看不见）。仅对「相册卡片流」提回实心，
         其余区域保持主题原默认；用户在「区域通透度 / 卡片颜色」里的任意自定义仍然优先。 */
      var v37DefFrame = (state.key === "default" && sub.key === "frame"
                         && !isFinite(parseInt(zoneState.card["frame"], 10)));
      if (v37DefFrame) { root.style.setProperty("--zc-a-frame", "1"); }
      else if (spct === CARD_DEF) { root.style.removeProperty("--zc-a-" + sub.key); }
      else { root.style.setProperty("--zc-a-" + sub.key, (spct / 100).toFixed(3)); }
    });
    /* v60：组件样式各区域的 --cp-* 变量与 html 标记同步下发 */
    applyCompColors();
    applyFontColor();
    applyFontColors();   /* v32：字体颜色细项（--fc-*），逐项独立下发 */
    applyIconColors();   /* v33：图标颜色细项（--fic-*） */
    applyCardColors();   /* v33：卡片颜色 + 不透明度细项（--cc-rgb-* / --cc-a-*） */
    refreshSwatchColors();   /* v38：未自定义的色块跟随当前主题（字体 / 图标 / 卡片 / 区域图标） */
    zoneApplyPages();
  }
  /* 区域卡片系数 → 各二级页根节点（--zc-a），页内卡片统一读 var(--zc-a) */
  function zoneApplyPages() {
    var pages = document.querySelectorAll(".page"), i, key, zone, pct, off;
    if (pages && pages.length) {
      for (i = 0; i < pages.length; i++) {
        key = pages[i].getAttribute("data-page");
        zone = PAGE_ZONE[key];
        if (!zone) {
          pages[i].style.removeProperty("--zc-a");
          pages[i].removeAttribute("data-zc-off");
          continue;
        }
        pct = cardPct(zone);
        pages[i].style.setProperty("--zc-a", (pct / 100).toFixed(3));
        /* v34：卡片不透明度 0% = 完全透明 —— 背景 alpha 已归 0，页内磨砂一并关闭，
           否则模糊层还在，看着只是「透明玻璃」而非彻底消失（见 CSS [data-zc-off] 规则）。 */
        if (pct === 0) { pages[i].setAttribute("data-zc-off", "1"); }
        else { pages[i].removeAttribute("data-zc-off"); }
      }
    }
    /* v34：悬浮底栏不在 .page 内，单独处理 —— 区域系数或「卡片颜色」页的底栏项为 0% 时关闭其磨砂 */
    var navBar = document.querySelector(".bottom-nav");
    if (navBar) {
      off = (cardPct("tabbar") === 0) || (ccPct("tabbar") === 0);
      if (off) { navBar.setAttribute("data-zc-off", "1"); }
      else { navBar.removeAttribute("data-zc-off"); }
    }
  }
  /* v32：字体颜色细分页内容（全站文字 + 各细项，独立成一页） */
  function fcPanelHtml() {
    var html = "", g, i, it, v, name, desc;
    v = zoneState.txt[FONT_KEY] || "";
    html += '<p class="zone-group">全站文字</p>' +
      '<div class="zone-row" data-kind="txt" data-zone="' + FONT_KEY + '">' +
        '<div class="zone-info">' +
          '<span class="zone-name">全站正文颜色</span>' +
          '<span class="zone-desc">一处设置，全站文字（标题 · 正文 · 说明 · 角标 · 底栏）一起变；只想改某一处请用下面的细分项</span>' +
        '</div>' +
        '<input class="zone-color" type="color" value="' + (v || "#000000") + '" data-kind="txt" data-zone="' + FONT_KEY + '" aria-label="全站正文颜色">' +
        '<span class="zone-hex" data-hex="txt:' + FONT_KEY + '">' + (v ? v.toUpperCase() : "亮色默认黑") + '</span>' +
        '<button class="zone-reset" type="button" data-reset="txt:' + FONT_KEY + '" title="恢复默认（亮色黑 / 暗色自适应）">复位</button>' +
      '</div>';
    for (g = 0; g < FC_GROUPS.length; g++) {
      html += '<p class="zone-group">' + FC_GROUPS[g].name + "</p>";
      for (i = 0; i < FC_GROUPS[g].items.length; i++) {
        it = FC_GROUPS[g].items[i];
        name = it.name;
        desc = it.desc;
        v = zoneState.fc[it.key] || "";
        html += '<div class="zone-row" data-kind="fc" data-zone="' + it.key + '">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">' + name + "</span>" +
                    '<span class="zone-desc">' + desc + "</span>" +
                  "</div>" +
                  '<input class="zone-color" type="color" value="' + (v || themeSwatch()) + '" data-kind="fc" data-zone="' + it.key + '" aria-label="' + name + '">' +
                  '<span class="zone-hex" data-hex="fc:' + it.key + '">' + (v ? v.toUpperCase() : "跟随主题") + "</span>" +
                  '<button class="zone-reset" type="button" data-reset="fc:' + it.key + '" title="恢复为跟随主题">复位</button>' +
                "</div>";
      }
    }
    return html;
  }
  function zonePanelHtml(kind) {
    var html = "", g, i, z, v, pct;
    /* v32：字体颜色已独立成二级页（kind = "fc"），整体返回该页内容 */
    if (kind === "fc") { return fcPanelHtml(); }
    /* v30：字体颜色只有「全站统一」一项 —— 一处生效全站，不再按区域分列 */
    if (kind === "txt") {
      v = zoneState.txt[FONT_KEY] || "";
      return '<p class="zone-group">全站文字</p>' +
        '<div class="zone-row" data-kind="txt" data-zone="' + FONT_KEY + '">' +
          '<div class="zone-info">' +
            '<span class="zone-name">全局字体颜色</span>' +
            '<span class="zone-desc">一处设置，全站文字（标题 · 正文 · 说明 · 角标 · 底栏）一起变</span>' +
          '</div>' +
          '<input class="zone-color" type="color" value="' + (v || "#000000") + '" data-kind="txt" data-zone="' + FONT_KEY + '" aria-label="全局字体颜色">' +
          '<span class="zone-hex" data-hex="txt:' + FONT_KEY + '">' + (v ? v.toUpperCase() : "亮色默认黑") + '</span>' +
          '<button class="zone-reset" type="button" data-reset="txt:' + FONT_KEY + '" title="恢复默认（亮色黑 / 暗色自适应）">复位</button>' +
        '</div>';
    }
    for (g = 0; g < ZONE_GROUPS.length; g++) {
      html += '<p class="zone-group">' + ZONE_GROUPS[g].name + "</p>";
      for (i = 0; i < ZONE_GROUPS[g].zones.length; i++) {
        z = ZONE_GROUPS[g].zones[i];
        if (!z[kind]) { continue; }
        if (kind === "card") {
          pct = cardPct(z.key);
          html += '<div class="zone-row" data-kind="card" data-zone="' + z.key + '">' +
                    '<div class="zone-info">' +
                      '<span class="zone-name">' + z.name + '卡片</span>' +
                      '<span class="zone-desc">' + (z.cardDesc || z.desc) + "</span>" +
                    "</div>" +
                    '<input class="zone-range" type="range" min="' + CARD_MIN + '" max="' + CARD_MAX + '" step="5" value="' + pct + '" data-kind="card" data-zone="' + z.key + '" aria-label="' + z.name + '卡片不透明度">' +
                    '<span class="zone-hex" data-hex="card:' + z.key + '">' + pct + '%</span>' +
                    '<button class="zone-reset" type="button" data-reset="card:' + z.key + '" title="恢复为 100%">复位</button>' +
                  "</div>";
          /* v31：区域下的细分项（首页的「下方列表」「相册卡片流」）各占一行 */
          if (z.subs) {
            for (var s = 0; s < z.subs.length; s++) {
              var sub = z.subs[s], spct = cardPct(sub.key);
              html += '<div class="zone-row zone-row-sub" data-kind="card" data-zone="' + sub.key + '">' +
                        '<div class="zone-info">' +
                          '<span class="zone-name">' + sub.name + "</span>" +
                          '<span class="zone-desc">' + (sub.cardDesc || sub.desc || "") + "</span>" +
                        "</div>" +
                        '<input class="zone-range" type="range" min="' + CARD_MIN + '" max="' + CARD_MAX + '" step="5" value="' + spct + '" data-kind="card" data-zone="' + sub.key + '" aria-label="' + sub.name + '不透明度">' +
                        '<span class="zone-hex" data-hex="card:' + sub.key + '">' + spct + "%</span>" +
                        '<button class="zone-reset" type="button" data-reset="card:' + sub.key + '" title="恢复为 100%">复位</button>' +
                      "</div>";
            }
          }
          continue;
        }
        v = zoneState[kind][z.key] || "";
        html += '<div class="zone-row" data-kind="' + kind + '" data-zone="' + z.key + '">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">' + z.name + "</span>" +
                    '<span class="zone-desc">' + z.desc + "</span>" +
                  "</div>" +
                  '<input class="zone-color" type="color" value="' + (v || themeSwatch()) + '" data-kind="' + kind + '" data-zone="' + z.key + '" aria-label="' + z.name + '颜色">' +
                  '<span class="zone-hex" data-hex="' + kind + ':' + z.key + '">' + (v ? v.toUpperCase() : "跟随主题") + "</span>" +
                  '<button class="zone-reset" type="button" data-reset="' + kind + ':' + z.key + '" title="恢复为跟随主题">复位</button>' +
                "</div>";
      }
    }
    return html;
  }
  function renderZonePanels() {
    zoneLoad();
    var ids = ["zoneIconPanel", "zoneTextPanel", "zoneCardPanel", "fontColorPanel"], kinds = ["ico", "txt", "card", "fc"], i, host;
    for (i = 0; i < ids.length; i++) {
      host = document.getElementById(ids[i]);
      if (host) { host.innerHTML = zonePanelHtml(kinds[i]); }
    }
    /* v33：图标颜色 / 卡片颜色两个独立页 */
    host = document.getElementById("iconColorPanel");
    if (host) { host.innerHTML = iconColorPanelHtml(); }
    host = document.getElementById("cardColorPanel");
    if (host) { host.innerHTML = cardColorPanelHtml(); }
    /* v60：组件样式各区域面板（组件样式页） */
    host = document.getElementById("compColorPanel");
    if (host && typeof compColorPanelHtml === "function") { host.innerHTML = compColorPanelHtml(); }
    zoneApplyVars();
    /* v34：海浪卡滑块已挪进「卡片颜色」页 —— 面板每次重建后元素都是新的，
       这里重新同步数值并绑定（bindWavePanel 自带 data-bound 守卫，不会重复绑定）。 */
    syncWaveUi();
    bindWavePanel();
  }
  function zoneSyncRow(kind, key) {
    /* v32：txt 的全站文字行与 fc 细项行都在「字体颜色」独立页里，需要跨面板查找 */
    var ids = kind === "ico" ? ["zoneIconPanel"]
            : (kind === "fc" ? ["fontColorPanel"]
            : (kind === "ic" ? ["iconColorPanel"]
            : (kind === "cc" || kind === "ca" ? ["cardColorPanel"]
            : (kind === "cp" || kind === "cpa" || kind === "cpb" ? ["compColorPanel"]
            : (kind === "txt" ? ["zoneTextPanel", "fontColorPanel"] : ["zoneCardPanel"])))));
    var v = zoneState[kind] ? zoneState[kind][key] : undefined;
    for (var n = 0; n < ids.length; n++) {
      var panel = document.getElementById(ids[n]);
      if (!panel) { continue; }
      var rows = panel.querySelectorAll(".zone-row");
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute("data-zone") !== key) { continue; }
        var hex = rows[i].querySelector(".zone-hex");
        if (!hex) { continue; }
        /* v60：组件样式各区域的数值回显 */
        if (kind === "cpa") { hex.textContent = compPct(key) + "%"; }
        else if (kind === "cpb") { hex.textContent = (zoneState.cpb[key] === "0") ? "已关闭" : "开启"; }
        else if (kind === "cpt" || kind === "cp") { hex.textContent = v ? String(v).toUpperCase() : "跟随主题"; }
        else if (kind === "card") { hex.textContent = cardPct(key) + "%"; }
        else if (kind === "ca" || kind === "cc") {
          var ccv = zoneState.cc[key] || "";
          hex.textContent = (ccv ? String(ccv).toUpperCase() : "默认色") + " · " + ccPct(key) + "%";
        }
        else if (kind === "txt") { hex.textContent = v ? v.toUpperCase() : "亮色默认黑"; }
        else { hex.textContent = v ? v.toUpperCase() : "跟随主题"; }
      }
    }
  }
  function zoneSet(kind, key, value) {
    if (kind === "card" || kind === "ca") {
      var n = parseInt(value, 10);
      var box = (kind === "card") ? zoneState.card : zoneState.ca;
      if (isFinite(n)) { box[key] = Math.max(CARD_MIN, Math.min(CARD_MAX, n)); }
      else { delete box[key]; }
    } else if (value) { zoneState[kind][key] = value; }
    else { delete zoneState[kind][key]; }
    zoneSave();
    zoneApplyVars();
    zoneSyncRow(kind, key);
  }
  function resetZones() {
    zoneState = { ico: {}, txt: {}, card: {}, fc: {}, ic: {}, cc: {}, ca: {}, cb: {}, cp: {}, cpa: {}, cpt: {}, cpb: {} };
    zoneSave();
    renderZonePanels();
    tip("卡片颜色、字体颜色与卡片通透度已全部复位，回到默认观感。");
  }
  /* v32：只复位「字体颜色」独立页里的细分项 */
  function resetFontColors() {
    zoneState.fc = {};
    zoneSave();
    renderZonePanels();
    tip("字体颜色已全部复位为跟随主题。");
  }
  function resetZoneCards() {
    zoneState.card = {};
    zoneSave();
    renderZonePanels();
    tip(state.key === "default"
      ? "各区域卡片不透明度已复位为灰色系默认（悬浮底栏 100% · 其余卡片 20%）。"
      : "各区域卡片不透明度已复位为 100%。");
  }

  /* =========================================================
     v33：图标颜色细分（独立二级页「设置 → 图标颜色」）
       · 分组：底部导航 / 首页 / 字卡 / 课程 / 设置
       · 每项含：按键背景（未选中 / 激活）、按键图标（未选中 / 激活）
       · 变量：--fic-{key}；未设置即 removeProperty → CSS 回落默认，观感不变
     ========================================================= */
  var ICON_GROUPS = [
    { name: "底部导航（底栏四键）", items: [
      { key: "tab-bg",     name: "按键背景 · 未选中", desc: "底栏四个图标键的圆角底色（未激活态）" },
      { key: "tab-ink",    name: "按键图标 · 未选中", desc: "底栏四个按键的图标（未激活态）" },
      { key: "tab-bg-on",  name: "按键背景 · 激活态", desc: "当前所在页对应的那个按键（激活态）" },
      { key: "tab-ink-on", name: "按键图标 · 激活态", desc: "激活按键的图标（默认白色）" },
      { key: "snow",       name: "底栏雪花按键", desc: "右下角那枚雪花按键的图形（未激活 / 激活同色）" }
    ] },
    { name: "首页 · 功能列表按键", items: [
      { key: "home-bg",     name: "按键背景 · 未激活", desc: "功能列表左侧圆角图标底（未激活态）" },
      { key: "home-ink",    name: "按键图标 · 未激活", desc: "功能列表左侧图标（未激活态）" },
      { key: "home-bg-on",  name: "按键背景 · 激活", desc: "按下功能卡片时的图标底" },
      { key: "home-ink-on", name: "按键图标 · 激活", desc: "按下功能卡片时的图标" }
    ] },
    { name: "字卡 · 条目按键", items: [
      { key: "wc-bg",     name: "按键背景 · 未激活", desc: "字卡页条目卡左侧图标底（未激活态）" },
      { key: "wc-ink",    name: "按键图标 · 未激活", desc: "字卡页条目卡左侧图标（未激活态）" },
      { key: "wc-bg-on",  name: "按键背景 · 激活", desc: "按下条目卡时的图标底" },
      { key: "wc-ink-on", name: "按键图标 · 激活", desc: "按下条目卡时的图标" }
    ] },
    { name: "课程 · 条目按键", items: [
      { key: "disc-bg",     name: "按键背景 · 未激活", desc: "课程页条目卡左侧图标底（未激活态）" },
      { key: "disc-ink",    name: "按键图标 · 未激活", desc: "课程页条目卡左侧图标（未激活态）" },
      { key: "disc-bg-on",  name: "按键背景 · 激活", desc: "按下课程条目卡时的图标底" },
      { key: "disc-ink-on", name: "按键图标 · 激活", desc: "按下课程条目卡时的图标" }
    ] },
    { name: "设置 · 条目按键", items: [
      { key: "set-bg",     name: "按键背景 · 未激活", desc: "设置页条目卡左侧图标底（未激活态）" },
      { key: "set-ink",    name: "按键图标 · 未激活", desc: "设置页条目卡左侧图标（未激活态）" },
      { key: "set-bg-on",  name: "按键背景 · 激活", desc: "按下设置条目卡时的图标底" },
      { key: "set-ink-on", name: "按键图标 · 激活", desc: "按下设置条目卡时的图标" }
    ] }
  ];
  function icEach(fn) {
    for (var g = 0; g < ICON_GROUPS.length; g++) {
      for (var i = 0; i < ICON_GROUPS[g].items.length; i++) { fn(ICON_GROUPS[g].items[i], ICON_GROUPS[g]); }
    }
  }
  function applyIconColors() {
    var root = document.documentElement;
    icEach(function (it) {
      var v = zoneState.ic[it.key];
      if (v) { root.style.setProperty("--fic-" + it.key, v); }
      else { root.style.removeProperty("--fic-" + it.key); }
    });
  }
  function iconColorPanelHtml() {
    var html = "", g, i, it, v;
    for (g = 0; g < ICON_GROUPS.length; g++) {
      html += '<p class="zone-group">' + ICON_GROUPS[g].name + "</p>";
      for (i = 0; i < ICON_GROUPS[g].items.length; i++) {
        it = ICON_GROUPS[g].items[i];
        v = zoneState.ic[it.key] || "";
        html += '<div class="zone-row" data-kind="ic" data-zone="' + it.key + '">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">' + it.name + "</span>" +
                    '<span class="zone-desc">' + it.desc + "</span>" +
                  "</div>" +
                  '<input class="zone-color" type="color" value="' + (v || themeSwatch()) + '" data-kind="ic" data-zone="' + it.key + '" aria-label="' + it.name + '">' +
                  '<span class="zone-hex" data-hex="ic:' + it.key + '">' + (v ? v.toUpperCase() : "跟随主题") + "</span>" +
                  '<button class="zone-reset" type="button" data-reset="ic:' + it.key + '" title="恢复为跟随主题">复位</button>' +
                "</div>";
      }
    }
    return html;
  }
  function resetIconColors() {
    zoneState.ic = {};
    zoneSave();
    renderZonePanels();
    tip("图标颜色已全部复位为跟随主题。");
  }

  /* =========================================================
     v33：卡片颜色 + 不透明度细分（独立二级页「设置 → 卡片颜色」）
       · 每行 = 该区域卡片的「颜色」+「不透明度」两个独立控件
       · 变量：--cc-rgb-{key}（底色 rgb）/ --cc-a-{key}（不透明度系数）
         未设置时分别回落到原色 / 1（100%），默认观感与拆分前完全一致
     ========================================================= */
  var CARD_COLOR_GROUPS = [
    { name: "主导航", items: [
      { key: "tabbar", name: "悬浮底栏", desc: "底部导航玻璃底：颜色 + 不透明度" }
    ] },
    { name: "首页", items: [
      { key: "home-list", name: "下方列表", desc: "按键下方的功能列表卡底色" },
      /* v60：「相册卡片流」的颜色 / 不透明度设置已挪到「美化设置 → 组件样式 → 组件样式各区域」 */
    ] },
    { name: "字卡", items: [
      { key: "wordcard", name: "条目卡 / 面板", desc: "字卡页条目卡与面板底色" },
      { key: "wc-tool",  name: "工具与输入卡", desc: "字卡页底部工具条 / 输入框底色" }
    ] },
    { name: "课程", items: [
      { key: "discover", name: "横幅 / 课程条目", desc: "课程页横幅与条目卡底色" }
    ] },
    { name: "设置", items: [
      { key: "settings", name: "设置条目卡 / 面板", desc: "设置页分组与各设置面板底色" }
    ] },
  ];
  function ccEach(fn) {
    for (var g = 0; g < CARD_COLOR_GROUPS.length; g++) {
      for (var i = 0; i < CARD_COLOR_GROUPS[g].items.length; i++) { fn(CARD_COLOR_GROUPS[g].items[i], CARD_COLOR_GROUPS[g]); }
    }
  }
  function ccPct(key) {
    var n = parseInt(zoneState.ca[key], 10);
    if (!isFinite(n)) { return CARD_DEF; }
    return Math.max(CARD_MIN, Math.min(CARD_MAX, n));
  }
  /* v34：某张卡片的不透明度拖到 0% 时，把它自己的磨砂层一并关掉
     —— 背景 alpha 归 0 后若还留着 backdrop-filter，卡片位置会残留一片模糊；
     与 CSS html[data-cca-zero~="key"] 规则一一对应。 */
  var CC_BLUR_KEYS = ["tabbar", "home-list", "frame", "wordcard", "wc-tool", "discover", "settings"];
  function syncCcBlur() {
    var root = document.documentElement, off = [], i, k;
    for (i = 0; i < CC_BLUR_KEYS.length; i++) {
      k = CC_BLUR_KEYS[i];
      if (ccPct(k) === 0) { off.push(k); }
    }
    if (off.length) { root.setAttribute("data-cca-zero", off.join(" ")); }
    else { root.removeAttribute("data-cca-zero"); }
  }
  function applyCardColors() {
    var root = document.documentElement;
    ccEach(function (it) {
      var rgb = hexToRgbTriple(zoneState.cc[it.key]);
      if (rgb) { root.style.setProperty("--cc-rgb-" + it.key, rgb.join(", ")); }
      else { root.style.removeProperty("--cc-rgb-" + it.key); }
      var pct = ccPct(it.key);
      if (pct === CARD_DEF) { root.style.removeProperty("--cc-a-" + it.key); }
      else { root.style.setProperty("--cc-a-" + it.key, (pct / 100).toFixed(3)); }
    });
    syncCcBlur();
  }
  function cardColorPanelHtml() {
    var html = "", g, i, it, v, pct, wp;
    for (g = 0; g < CARD_COLOR_GROUPS.length; g++) {
      html += '<p class="zone-group">' + CARD_COLOR_GROUPS[g].name + "</p>";
      /* v34：原「外观设置 · 首页海浪卡」整组挪进「卡片颜色」页 —— 首页顶部那张海浪白卡（默认 65%） */
      if (CARD_COLOR_GROUPS[g].name === "首页") {
        wp = Math.round(waveValue() * 100);
        html += '<div class="zone-row zone-row-wave">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">首页海浪白卡</span>' +
                    '<span class="zone-desc">首页顶部那张海浪白卡的透明程度（默认 65%）</span>' +
                  "</div>" +
                  '<input class="zone-range" type="range" min="0" max="100" step="5" value="' + wp + '" id="waveRange" aria-label="首页海浪白卡不透明度">' +
                  '<span class="zone-hex" id="waveHex">' + wp + "%</span>" +
                  '<button class="zone-reset" type="button" id="waveReset" title="恢复为 65%">复位</button>' +
                "</div>";
      }
      for (i = 0; i < CARD_COLOR_GROUPS[g].items.length; i++) {
        it = CARD_COLOR_GROUPS[g].items[i];
        v = zoneState.cc[it.key] || "";
        pct = ccPct(it.key);
        html += '<div class="zone-row" data-zone="' + it.key + '">' +
                  '<div class="zone-info">' +
                    '<span class="zone-name">' + it.name + "</span>" +
                    '<span class="zone-desc">' + it.desc + "</span>" +
                  "</div>";
        if (it.color !== false) {
          html += '<input class="zone-color" type="color" value="' + (v || "#FFFFFF") + '" data-kind="cc" data-zone="' + it.key + '" aria-label="' + it.name + '颜色">';
        }
        html += '<input class="zone-range" type="range" min="' + CARD_MIN + '" max="' + CARD_MAX + '" step="5" value="' + pct + '" data-kind="ca" data-zone="' + it.key + '" aria-label="' + it.name + '不透明度">' +
                '<span class="zone-hex" data-hex="cc:' + it.key + '">' + (v ? String(v).toUpperCase() : "默认色") + " · " + pct + "%</span>" +
                '<button class="zone-reset" type="button" data-reset="cc:' + it.key + '" title="恢复默认（颜色跟随主题 · 不透明度 100%）">复位</button>' +
                "</div>";
      }
    }
    return html;
  }
  function resetCardColors() {
    zoneState.cc = {};
    zoneState.ca = {};
    zoneSave();
    renderZonePanels();
    tip("卡片颜色与不透明度已全部复位为默认。");
  }
  /* =====================================================================
     v60：组件样式各区域（组件样式页）—— 区域颜色 / 区域不透明度 /
     文字与图案颜色 / 磨砂模糊玻璃开关
     · 未设置时一律不接管，CSS 原始规则（跟随主题色）自然生效
     · 原「卡片颜色 → 首页 → 相册卡片流」的设置已挪到本页（走 --cp-* 变量，
       --cc-* 老变量保持兼容，不影响既有自定义）
     ===================================================================== */
  var COMP_ZONES = [
    { key: "frame",   name: "相册卡片流", desc: "首页五格相框卡片流" },
    { key: "album",   name: "相册卡片",   desc: "四格照片 + 右侧条形码" },
    { key: "anniv",   name: "纪念日",     desc: "三个日子 · 自动算天数" },
    { key: "ticket",  name: "飞机票",     desc: "登机牌式布局" },
    { key: "weather", name: "天气",       desc: "实时天气卡" },
    { key: "poster",  name: "渐变海报",   desc: "整张图片上传" }
  ];
  /* 不透明度：未设置 = 100%（跟随主题原样） */
  function compPct(key) {
    var n = parseInt(zoneState.cpa[key], 10);
    if (!isFinite(n)) { return 100; }
    return Math.max(0, Math.min(100, n));
  }
  function compColorPanelHtml() {
    var html = "", i, it, c, t, pct, off;
    /* v61：未自定义时色块预览直接取「当前主题下真实生效的颜色」，
       不再写死 #83A8EC（蓝）/ #172033（深蓝灰）—— 主题是灰色系时预览就是灰的 */
    var themeZone = swProbe("rgb(var(--accent-rgb))") || "#D0D0D0";
    var themeTxt = swProbe("var(--text)") || "#333333";
    for (i = 0; i < COMP_ZONES.length; i++) {
      it = COMP_ZONES[i];
      c = zoneState.cp[it.key] || "";
      t = zoneState.cpt[it.key] || "";
      pct = compPct(it.key);
      /* v61：磨砂模糊玻璃默认未开启（只有显式设为 "1" 才开启） */
      off = (zoneState.cpb[it.key] !== "1");
      html += '<p class="zone-group">' + it.name + "</p>";
      /* 区域颜色 */
      html += '<div class="zone-row" data-zone="' + it.key + '" data-col="cp">' +
                '<div class="zone-info"><span class="zone-name">区域颜色</span></div>' +
                '<input class="zone-color" type="color" value="' + (c || themeZone) + '" data-kind="cp" data-zone="' + it.key + '" aria-label="' + it.name + '区域颜色">' +
                '<span class="zone-hex">' + (c ? String(c).toUpperCase() : "跟随主题") + "</span>" +
                '<button class="zone-reset" type="button" data-reset="cp:' + it.key + '" title="恢复为跟随主题色">复位</button>' +
              "</div>";
      /* 区域不透明度 */
      html += '<div class="zone-row" data-zone="' + it.key + '" data-col="cpa">' +
                '<div class="zone-info"><span class="zone-name">区域不透明度</span></div>' +
                '<input class="zone-range" type="range" min="0" max="100" step="5" value="' + pct + '" data-kind="cpa" data-zone="' + it.key + '" aria-label="' + it.name + '区域不透明度">' +
                '<span class="zone-hex">' + pct + "%</span>" +
                '<button class="zone-reset" type="button" data-reset="cpa:' + it.key + '" title="恢复为 100%">复位</button>' +
              "</div>";
      /* 文字 / 图案颜色 —— v61：无文字图案的「相册卡片流」「渐变海报」不再提供该项 */
      if (it.key !== "frame" && it.key !== "poster") {
        html += '<div class="zone-row" data-zone="' + it.key + '" data-col="cpt">' +
                  '<div class="zone-info"><span class="zone-name">文字 / 图案颜色</span></div>' +
                  '<input class="zone-color" type="color" value="' + (t || themeTxt) + '" data-kind="cpt" data-zone="' + it.key + '" aria-label="' + it.name + '文字图案颜色">' +
                  '<span class="zone-hex">' + (t ? String(t).toUpperCase() : "跟随主题") + "</span>" +
                  '<button class="zone-reset" type="button" data-reset="cpt:' + it.key + '" title="恢复为跟随主题色">复位</button>' +
                "</div>";
      }
      /* 磨砂模糊玻璃 */
      html += '<div class="zone-row" data-zone="' + it.key + '" data-col="cpb">' +
                '<div class="zone-info"><span class="zone-name">磨砂模糊玻璃</span></div>' +
                '<label class="cp-switch"><input type="checkbox" ' + (off ? "" : "checked") + ' data-cpb="' + it.key + '" aria-label="' + it.name + '磨砂模糊玻璃"><i></i></label>' +
                '<span class="zone-hex">' + (off ? "未开启" : "已开启") + "</span>" +
                '<button class="zone-reset" type="button" data-reset="cpb:' + it.key + '" title="恢复为未开启">复位</button>' +
              "</div>";
    }
    return html;
  }
  function renderCompColorPanel() {
    var host = document.getElementById("compColorPanel");
    if (host) { host.innerHTML = compColorPanelHtml(); }
    refreshSwatchColors();   /* v61：未自定义的色块跟随当前主题刷新 */
  }
  /* 下发：颜色 → --cp-rgb-*；不透明度 → --cp-a-*；文字图案 → --cp-txt-*；
     磨砂关闭 → html[data-cp-blur-off]。未设置的一律 removeProperty，回落主题。 */
  function applyCompColors() {
    var root = document.documentElement, i, it, rgb, n, v, set = [], aOn = [], txt = [], off = [];
    for (i = 0; i < COMP_ZONES.length; i++) {
      it = COMP_ZONES[i];
      rgb = hexToRgbTriple(zoneState.cp[it.key]);
      if (rgb) { root.style.setProperty("--cp-rgb-" + it.key, rgb.join(", ")); set.push(it.key); }
      else { root.style.removeProperty("--cp-rgb-" + it.key); }

      n = parseInt(zoneState.cpa[it.key], 10);
      if (isFinite(n) && n !== 100) {
        root.style.setProperty("--cp-a-" + it.key, (Math.max(0, Math.min(100, n)) / 100).toFixed(3));
        aOn.push(it.key);
      } else { root.style.removeProperty("--cp-a-" + it.key); }

      /* v61：相册卡片流 / 渐变海报无文字图案，不再下发该项 */
      v = (it.key === "frame" || it.key === "poster") ? "" : zoneState.cpt[it.key];
      if (v) { root.style.setProperty("--cp-txt-" + it.key, v); txt.push(it.key); }
      else { root.style.removeProperty("--cp-txt-" + it.key); }

      /* v61：磨砂玻璃默认关闭 —— 仅显式设为 "1" 才开启 */
      if (zoneState.cpb[it.key] !== "1") { off.push(it.key); }
    }
    function mark(attr, list) {
      if (list.length) { root.setAttribute(attr, list.join(" ")); }
      else { root.removeAttribute(attr); }
    }
    mark("data-cp-set", set);
    mark("data-cp-a", aOn);
    mark("data-cp-txt", txt);
    mark("data-cp-blur-off", off);
  }
  function resetCompColors() {
    var i, it;
    for (i = 0; i < COMP_ZONES.length; i++) {
      it = COMP_ZONES[i];
      delete zoneState.cp[it.key];
      delete zoneState.cpa[it.key];
      delete zoneState.cpt[it.key];
      delete zoneState.cpb[it.key];
    }
    zoneSave();
    applyCompColors();
    renderCompColorPanel();
    tip("中心组件的区域颜色 / 不透明度 / 文字图案颜色 / 磨砂 已全部复位。");
  }
  function bindCompColorPanel() {
    var panel = document.getElementById("compColorPanel");
    if (!panel || panel.getAttribute("data-bound") === "1") { return; }
    panel.setAttribute("data-bound", "1");
    function onCpb(node) {
      var key = node.getAttribute("data-cpb");
      if (!key) { return; }
      zoneSet("cpb", key, node.checked ? "1" : "");
      applyCompColors();
      renderCompColorPanel();
    }
    panel.addEventListener("input", function (e) {
      var t = e.target || e.srcElement;
      if (!t) { return; }
      if (t.getAttribute("data-cpb") !== null && t.getAttribute("data-cpb") !== undefined) { onCpb(t); return; }
      var kind = t.getAttribute("data-kind"), key = t.getAttribute("data-zone");
      if (!kind || !key) { return; }
      if (kind === "cp" || kind === "cpa" || kind === "cpt") {
        zoneSet(kind, key, t.value);
        applyCompColors();
      }
    });
    panel.addEventListener("change", function (e) {
      var t = e.target || e.srcElement;
      if (!t) { return; }
      if (t.getAttribute("data-cpb") !== null && t.getAttribute("data-cpb") !== undefined) { onCpb(t); }
    });
    panel.addEventListener("click", function (e) {
      var btn = closestData(e.target || e.srcElement, "data-reset", panel);
      if (!btn) { return; }
      var parts = String(btn.getAttribute("data-reset") || "").split(":");
      if (parts.length !== 2) { return; }
      if (parts[0] !== "cp" && parts[0] !== "cpa" && parts[0] !== "cpt" && parts[0] !== "cpb") { return; }
      zoneSet(parts[0], parts[1], "");
      applyCompColors();
      renderCompColorPanel();
    });
  }
  /* 相册卡片：四个格子都没上传图片时才走「未上传默认样式」 */
  function syncAlbumEmpty() {
    var card = document.getElementById("hcAlbum");
    if (!card) { return; }
    var cells = card.querySelectorAll(".hc-album-cell");
    var empty = true, i;
    for (i = 0; i < cells.length; i++) {
      if (cells[i].classList.contains("has-photo")) { empty = false; }
    }
    if (empty) { card.classList.add("is-empty"); }
    else { card.classList.remove("is-empty"); }
  }

  function bindZonePanels() {
    var ids = ["zoneIconPanel", "zoneTextPanel", "zoneCardPanel", "fontColorPanel", "iconColorPanel", "cardColorPanel"], n;
    for (n = 0; n < ids.length; n++) {
      var panel = document.getElementById(ids[n]);
      if (!panel || panel.getAttribute("data-bound") === "1") { continue; }
      panel.setAttribute("data-bound", "1");
      panel.addEventListener("input", function (e) {
        var t = e.target || e.srcElement;
        if (!t || !t.getAttribute) { return; }
        var kind = t.getAttribute("data-kind");
        if (!kind || t.getAttribute("data-zone") === null) { return; }
        zoneSet(kind, t.getAttribute("data-zone"), t.value);
      });
      panel.addEventListener("click", function (e) {
        var t = e.target || e.srcElement;
        var btn = closestData(t, "data-reset", panel);
        if (!btn) { return; }
        var parts = String(btn.getAttribute("data-reset") || "").split(":");
        if (parts[0] === "cc") {
          zoneSet("cc", parts[1], "");
          zoneSet("ca", parts[1], "");
          tip("已复位：卡片颜色跟随主题、不透明度 100%。");
          return;
        }
        zoneSet(parts[0], parts[1], "");
        if (parts[0] === "card") { tip("已复位为 100%（与默认一致）。"); }
        else if (parts[0] === "txt") { tip("字体颜色已恢复默认：亮色主题黑色，暗色主题自适应。"); }
        else { tip("已复位为跟随主题色。"); }
      });
    }
  }

  function applyState() {
    var vars = buildPalette(state.base, state.mode, state.key);
    var root = document.documentElement;
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) { root.style.setProperty(k, vars[k]); }
    }
    /* v30：记下本次主题色板 —— 字体颜色复位时用它还原默认（亮色黑 / 暗色自适应） */
    lastPalette = vars;
    root.setAttribute("data-theme-mode", state.mode === "dark" ? "dark" : "light");
    /* v35：主题 key 落到 <html>，供「灰色系（默认主题）」的专属默认样式（图标底 / 顶栏雪花 / 水晶簇）使用 */
    root.setAttribute("data-theme-key", state.key);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && vars["--bg"]) { meta.setAttribute("content", vars["--bg"]); }
    /* v18：① 计算全站等比缩放系数（以 390px 手机端为基准）；
            ② 顶栏水晶装饰按当前主题色相重新随机赋色（每次换肤都重新随机一遍）。 */
    updateUiScale();
    randomizeCrystalStrip();
    /* v28：把各区域图标 / 字体颜色写回（未自定义的项自动跟随主题色） */
    zoneApplyVars();
  }

  /* ---------------- v18：全站等比缩放 ----------------
     基准 390px（手机端浏览器预览基准，iPhone 常见逻辑宽）：--ui = clamp(0.80, 视口宽 / 390, 1.16)。
     样式表里所有卡片尺寸 / 字号 / 间距 / 圆角均按 calc(原值 * var(--ui)) 换算 ——
     整页版式随之等比缩放，大小与位置同步自适应（顶栏波浪卡与顶栏装饰不参与缩放）。 */
  var UI_BASE_W = 390;
  var UI_FRAME_W = 430; /* v21： */
  var UI_EXTRA = 1;          /* v20：一屏自适应系数（仅当内容高于视口时 < 1） */
  function updateUiScale() {
    /* v21：以「实际应用列宽」为基准，而不是视口宽 —— PC / 平板 / 各类小窗都被收进居中列，
       列宽一致则版式一致，不会出现设备越宽、版式越放飞的情况。 */
    var vw = window.innerWidth || UI_BASE_W;
    /* v22：取消 430px 居中窄列，应用列宽即视口宽 —— 平板 / PC 不再被收成一条窄竖条 */
    var frameW = vw;
    var base = Math.max(0.80, Math.min(1.16, frameW / UI_BASE_W));
    /* v24：--ui-base 只随视口宽变化，不参与「一屏自适应」的收紧；
       底栏（雪花键 + 弹出四键）统一取它，保证首页 / 字卡 / 课程 / 设置各页大小一致。 */
    document.documentElement.style.setProperty("--ui-base", base.toFixed(4));
    var ui = base * UI_EXTRA;
    document.documentElement.style.setProperty("--ui", ui.toFixed(4));
  }

  /* ---------------- v20 / v21：一屏自适应 ----------------
     v21：不再只针对移动端 —— PC / 平板 / 手机 / 手机小窗 / 平板小窗一律生效。
     当前页内容比视口高时，按「缺口比例」收一档 --ui，逐步收紧
     （最多 8 轮，首页下限 0.62 / 其余页 0.70），确保一页内完整呈现。 */
  /* v63：除首页外，各页面统一固定缩放系数（不再一屏自适应压扁），
   保证字卡 / 课程 / 设置及各二级页尺寸完全一致、不随内容高度忽大忽小。 */
var UI_NONHOME = 0.70;
  /* ---------------- v100：全局页面大小（设置 → 页面大小） ----------------
     在 --ui 基准之上再乘一个用户自定义缩放系数（默认 100%，范围 70%~140%），
     【仅】作用于字卡 / 课程 / 设置 三大页面及其子页面，
     首页 / 聊天界面等其余页面完全保持原有缩放行为（系数恒为 1，零回归）。
     偏好记忆于 localStorage「snowcrystal.pageSize」。
     v100.2：三体系默认基准由「原 100% 尺寸」调整为「原 125% 尺寸」——
     即滑杆 100%（ps = 1）时三体系显示为改造前的 125% 大小。
     有效缩放公式（仅三体系）：UI_EXTRA ×= PAGE_SIZE_BASE × (scale / 100)，
     其中 PAGE_SIZE_BASE = 1.25（新基准倍率），scale 为滑杆值 70~140：
       · 滑杆 70%  → 原 87.5% 尺寸（0.875）
       · 滑杆 100% → 原 125% 尺寸（1.25，新默认基准）
       · 滑杆 140% → 原 175% 尺寸（1.75）
     首页走 homeSizeScale、聊天等其余页面系数恒为 1，均不受基准调整影响。
     localStorage「snowcrystal.pageSize」语义不变（仍存滑杆值），
     「恢复默认大小」置 100% 即回到新基准。 */
  var PAGE_SIZE_BASE = 1.25;
  function pageSizeScale() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem("snowcrystal.pageSize") : null;
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o.scale === "number" && o.scale >= 70 && o.scale <= 140) { return o.scale / 100; }
      }
    } catch (e) { /* 忽略损坏数据 */ }
    return 1;
  }

  /* ---------------- v100.1：页面大小作用范围限定 ----------------
     仅「字卡 / 课程 / 设置」三大页面体系（含各自全部子页）参与用户缩放，
     home / chat-list / chat-room 等其余页面一律不乘系数。 */
  var CORE_PAGE_SETS = {
    wordcard: ["wordcard", "wordcard-face-lib", "wc-lib", "wc-lib-group", "wc-hub", "sub-lib", "sub-group", "qa-lib", "voice-lib", "voice-lib-group", "wordcard-manage"],
    discover: ["discover", "course-list", "course-detail", "course-schedule", "course-teachers", "course-collection", "course-tips"],
    settings: ["settings", "account-settings", "beautify", "ai-palette", "appearance", "fontcolor", "iconcolor", "cardcolor", "component", "top-components", "size-settings", "data-manage", "chat-settings", "chat-feature", "chat-pace", "chat-sound", "prob-settings", "effect-settings", "bubble-settings", "bubble-mode-settings", "bubble-shop-settings", "redpack-skin"]
  };
  function isCoreScaledPage(dp) {
    if (!dp) { return false; }
    return CORE_PAGE_SETS.wordcard.indexOf(dp) !== -1 ||
           CORE_PAGE_SETS.discover.indexOf(dp) !== -1 ||
           CORE_PAGE_SETS.settings.indexOf(dp) !== -1;
  }
function fitOneScreen() {
    var page = document.querySelector(".page.is-active");
    if (!page) { return; }
    /* v86：首页也固定 --ui（= 基准 * 0.70），与其它页面完全一致 ——
       不再对首页做「一屏压缩」，避免首页各区域被压小、下方留白、
       整体尺寸看起来与其它界面不像同一个网站；内容超高交给页面滚动。 */
    /* v14：首页 --ui 再乘「首页设置」里的自定义缩放系数（80%~130%），
       其余页面保持固定缩放不受影响。 */
    /* v100.1：页面大小系数仅对「字卡 / 课程 / 设置」三体系生效；
       首页走原有 homeSizeScale，聊天等其余页面系数恒为 1（零回归）。
       v100.2：三体系再乘 PAGE_SIZE_BASE（新基准 125%），
       即滑杆 100% 时显示原 125% 尺寸；首页 / 聊天不乘、完全不变 */
    var ps = pageSizeScale();
    if (page.getAttribute && page.getAttribute("data-page") === "home") {
      UI_EXTRA = UI_NONHOME * homeSizeScale();
    } else {
      /* v88：字卡 / 课程 / 设置三页整体放大 6%（手机端偏小），其余页面保持原缩放 */
      var dp = page.getAttribute("data-page");
      UI_EXTRA = (dp === "wordcard" || dp === "discover" || dp === "settings") ? UI_NONHOME * 1.06 : UI_NONHOME;
      if (isCoreScaledPage(dp)) { UI_EXTRA *= PAGE_SIZE_BASE * ps; }
    }
    updateUiScale();
    return;
  }

  /* ---------------- v30：统一「重新适配版式」入口 ----------------
     fitOneScreen() 收放 --ui 会改变卡片实际宽度 —— 相框流（横向）和功能滚轮（竖向）
     的一个循环周期都随之变化。旧版只调 fitOneScreen，不重算卡流，
     于是窗口变小 / 切页 / 切标签后，卡流仍按旧尺寸算周期与居中，
     表现就是「正中间不是那张卡、点上去没反应、一滑一格一跳」。
     这里把「重排 + 重算卡流」绑成一个动作：先重排，等版式落定（90ms）再重算卡流。 */
  function refitAll() {
    fitOneScreen();
    /* v18：缩放 / 高度变化后复核首页滚动锁定 */
    if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    window.setTimeout(function () {
      if (window.__frameRefresh) { window.__frameRefresh(); }
      if (typeof updateHomeScrollLock === "function") { updateHomeScrollLock(); }
    }, 90);
  }

  /* ---------------- v18：顶栏水晶装饰「随机不规则多色」 ----------------
     第 9a 节那组全局 [fill="#xxx"] → 主题变量的规则，会把水晶带里所有宝石 / 星形
     统一压成同一主题色（观感即"纯色"）。这里在运行时给每个装饰单独随机赋色：
     色相取当前主题色相 ±26° 抖动、明度 / 饱和度随机、透明度 0.55~1，
     再叠加随机尺寸与微位移 / 微旋转 —— 恢复"随机、不规则、多色"的玻璃彩感。
     （用内联 style 赋值，优先级高于 CSS 属性选择器，不会被 9a 规则改写。） */
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function randomizeCrystalStrip() {
    var strip = document.querySelector(".crystal-strip");
    if (!strip) { return; }
    var rootEl = document.documentElement;
    /* 优先读内联变量（applyState 写入），读不到再退化为计算样式，最后兜底默认主题色相 */
    var hv = parseFloat(rootEl.style.getPropertyValue("--accent-h"));
    if (isNaN(hv)) { hv = parseFloat(getComputedStyle(rootEl).getPropertyValue("--accent-h")); }
    var h = isNaN(hv) ? 219 : hv;
    var kids = strip.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var hue = ((h + rnd(-34, 34)) % 360 + 360) % 360;
      var col = "hsla(" + hue.toFixed(1) + ", " + Math.round(rnd(56, 94)) + "%, " +
                Math.round(rnd(50, 84)) + "%, " + rnd(0.55, 1).toFixed(2) + ")";
      if (el.classList && el.classList.contains("cs-dot")) {
        el.style.background = col;
        var ds = rnd(3, 5.4).toFixed(2) + "px";
        el.style.width = ds;
        el.style.height = ds;
      } else if (el.tagName && el.tagName.toLowerCase() === "svg") {
        var hasFill = el.getAttribute("fill") && el.getAttribute("fill") !== "none";
        var hasStroke = el.getAttribute("stroke") && el.getAttribute("stroke") !== "none";
        if (hasFill) { el.style.fill = col; }
        if (hasStroke) { el.style.stroke = col; }
        if (!hasFill && !hasStroke) { el.style.fill = col; }
        var base = parseFloat(el.getAttribute("data-base-size") || el.getAttribute("width")) || 10;
        el.setAttribute("data-base-size", base);
        var k = rnd(0.8, 1.3);
        el.setAttribute("width", (base * k).toFixed(2));
        el.setAttribute("height", (base * k).toFixed(2));
      }
      el.style.transform = "translateY(" + rnd(-1.6, 1.6).toFixed(2) + "px) rotate(" +
                           rnd(-16, 16).toFixed(1) + "deg)";
      el.style.opacity = rnd(0.62, 1).toFixed(2);
    }
  }

  /* ---------------- v30：首页海浪卡不透明度（独立旋钮） ----------------
     海浪白卡是首页面积最大的「底色块」，旧版把它的不透明度绑在区域卡片通透度上，
     结果「调首页卡片通透度」会把顶部白浪一起压淡。现在拆出独立变量 --wave-a
     （默认 0.65 = 旧版观感）。v34：该滑块从「外观设置」挪到「设置 → 卡片颜色 · 首页」
     分组的「首页海浪白卡」一行，仍是它唯一的控制入口。 */
  var WAVE_KEY = "snow_crystal_wave_a_v30";
  var WAVE_DEF = 0.65;
  function waveValue() {
    try {
      var n = parseFloat(window.localStorage.getItem(WAVE_KEY));
      if (isFinite(n) && n >= 0 && n <= 1) { return n; }
    } catch (e) { /* 存储不可用则用默认 */ }
    return WAVE_DEF;
  }
  function waveApply() {
    var v = waveValue();
    document.documentElement.style.setProperty("--wave-a", v.toFixed(2));
    /* v35 修复：白浪不透明度归 0 时，同步关掉 .wave-card 容器自身的磨砂层。
       根因：--wave-a 只压 .wave-card > svg.wave-body（白浪绘制层），而磨砂是挂在
       .wave-card 容器上的 backdrop-filter，容器恒定生效且铺满整屏 —— 于是白浪已全透明，
       整片背景却仍被 22px 模糊糊住，上传的背景图糊而看不全。
       关掉后观感只由白浪块本身决定：0% = 海浪卡彻底消失，背景图完整清晰显示。 */
    var wc = document.querySelector(".wave-card");
    if (wc) {
      if (v <= 0.001) { wc.setAttribute("data-wave-off", "1"); }
      else { wc.removeAttribute("data-wave-off"); }
    }
    return v;
  }
  function syncWaveUi() {
    var p = Math.round(waveValue() * 100);
    var r = document.getElementById("waveRange"), hex = document.getElementById("waveHex");
    if (r) { r.value = String(p); }
    if (hex) { hex.textContent = p + "%"; }
  }
  function bindWavePanel() {
    var r = document.getElementById("waveRange");
    var btn = document.getElementById("waveReset");
    if (r && r.getAttribute("data-bound") !== "1") {
      r.setAttribute("data-bound", "1");
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        try { window.localStorage.setItem(WAVE_KEY, String(v)); } catch (e) {}
        waveApply();   /* v35：统一入口 —— 0% 时同步关闭容器磨砂 */
        var hex = document.getElementById("waveHex");
        if (hex) { hex.textContent = Math.round(v * 100) + "%"; }
      });
      r.addEventListener("change", function () { tip("首页海浪白卡不透明度 " + r.value + "%。"); });
    }
    if (btn && btn.getAttribute("data-bound") !== "1") {
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        try { window.localStorage.setItem(WAVE_KEY, String(WAVE_DEF)); } catch (e) {}
        waveApply();
        syncWaveUi();
        tip("首页海浪白卡不透明度已恢复为 65%。");
      });
    }
  }

  /* ---------------- v31：首页海浪卡装饰（水晶簇 / 底层大雪花） ----------------
     颜色与不透明度各自独立：
       · 拖「海浪卡不透明度」只压白浪块，装饰纹丝不动；
       · 这里两组开关只作用于装饰本身，与浪卡本体、区域卡片通透度都互不牵连。
     未设色 → 保持原本浅绿层次（跟随主题）；不透明度 100% → 不写变量，与旧版一致。 */
  var DECO_KEY = "snowcrystal.waveDeco.v1";
  var decoState = { heroColor: "", heroA: 100, glowColor: "" };
  var DECO_DEF = { heroColor: "#5B8CE6", glowColor: "#E8E8E8" };
  /* v37：未自定义时，色块显示的「当前主题装饰默认色」——
     默认主题（灰色系）：大雪花 #BDBDBD（与页面实际渲染一致）；
     v38：其它主题不再返回固定的浅蓝，而是直接读页面上那件装饰的真实渲染色（fill）——
         「换主题 → 色块立刻跟着走」，且与肉眼所见永远一致（默认主题同样走这条路，
          读到的就是 #BDBDBD）；只有读不到时才退回静态默认值。
     v62：阴影模糊颜色走 stroke（.wave-glow-line），读真实渲染色，未设色时跟随主题 --wave-glow。 */
  function decoSwatchColor(key) {
    var sel, prop;
    if (key === "heroColor") { sel = ".wave-crystal-hero [fill]:not([fill='none'])"; prop = "fill"; }
    else if (key === "glowColor") { sel = ".wave-glow-line"; prop = "stroke"; }
    var el = document.querySelector(sel);
    if (el && window.getComputedStyle) {
      var c = window.getComputedStyle(el)[prop] || "";
      var m = c.match(/rgba?\(([^)]+)\)/);
      if (m) {
        var p = m[1].split(",");
        if (p.length >= 3) {
          return "#" + swHex2(parseFloat(p[0])) + swHex2(parseFloat(p[1])) + swHex2(parseFloat(p[2]));
        }
      }
    }
    if (state.key === "default") {
      if (key === "heroColor") { return "#BDBDBD"; }
      if (key === "glowColor") { return "#E8E8E8"; }
    }
    return DECO_DEF[key];
  }

  function decoLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(DECO_KEY) : null;
      if (!raw) { return; }
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") { return; }
      if (typeof o.heroColor === "string") { decoState.heroColor = o.heroColor; }
      if (typeof o.glowColor === "string") { decoState.glowColor = o.glowColor; }
      var ha = parseInt(o.heroA, 10);
      if (isFinite(ha)) { decoState.heroA = Math.max(0, Math.min(100, ha)); }
    } catch (e) { /* 忽略 */ }
  }
  function decoSave() {
    try { if (window.localStorage) { window.localStorage.setItem(DECO_KEY, JSON.stringify(decoState)); } } catch (e) { /* 忽略 */ }
  }
  function decoApply() {
    var root = document.documentElement;
    var hero = document.querySelector(".wave-crystal-hero");
    if (decoState.heroColor) {
      root.style.setProperty("--hero-color", decoState.heroColor);
      if (hero) { hero.setAttribute("data-hero-color", "1"); }
    } else {
      root.style.removeProperty("--hero-color");
      if (hero) { hero.removeAttribute("data-hero-color"); }
    }
    if (decoState.heroA >= 100) { root.style.removeProperty("--hero-a"); }
    else { root.style.setProperty("--hero-a", (decoState.heroA / 100).toFixed(2)); }
    /* v62：海浪卡阴影模糊颜色 —— 自定义后写 --wave-glow 覆盖主题色板；
       未自定义则写回当前主题色板值（lastPalette），切主题后由 syncUi→decoApply 跟进新主题 */
    if (decoState.glowColor) { root.style.setProperty("--wave-glow", decoState.glowColor); }
    else {
      var tp = (lastPalette && lastPalette["--wave-glow"]) ? lastPalette["--wave-glow"] : "";
      if (tp) { root.style.setProperty("--wave-glow", tp); }
      else { root.style.removeProperty("--wave-glow"); }
    }
  }
  function syncDecoUi() {
    var h = document.getElementById("heroColor");
    if (h) { h.value = decoState.heroColor || decoSwatchColor("heroColor"); }
    var hh = document.getElementById("heroColorHex");
    if (hh) { hh.textContent = decoState.heroColor ? decoState.heroColor.toUpperCase() : "跟随主题"; }
    var hr = document.getElementById("heroRange");
    if (hr) { hr.value = String(decoState.heroA); }
    var hrh = document.getElementById("heroHex");
    if (hrh) { hrh.textContent = decoState.heroA + "%"; }
    var gc = document.getElementById("glowColor");
    if (gc) { gc.value = decoState.glowColor || decoSwatchColor("glowColor"); }
    var gch = document.getElementById("glowColorHex");
    if (gch) { gch.textContent = decoState.glowColor ? decoState.glowColor.toUpperCase() : "跟随主题"; }
  }
  function bindDecoPanel() {
    var ids = ["heroColor", "heroRange", "glowColor", "glowRange"];
    var keys = ["heroColor", "heroA", "glowColor", "glowA"];
    var i;
    for (i = 0; i < ids.length; i++) {
      (function (el, key) {
        if (!el || el.getAttribute("data-bound") === "1") { return; }
        el.setAttribute("data-bound", "1");
        el.addEventListener("input", function () {
          if (key === "heroA" || key === "glowA") {
            var n = parseInt(el.value, 10);
            decoState[key] = isFinite(n) ? Math.max(0, Math.min(100, n)) : 100;
          } else {
            decoState[key] = String(el.value || "");
          }
          decoSave();
          decoApply();
          syncDecoUi();
        });
      })(document.getElementById(ids[i]), keys[i]);
    }
    var rids = ["heroColorReset", "heroReset", "glowColorReset", "glowRangeReset"];
    var rkeys = ["heroColor", "heroA", "glowColor", "glowA"];
    var rdef = ["", 100, "", 100];
    for (i = 0; i < rids.length; i++) {
      (function (btn, key, def) {
        if (!btn || btn.getAttribute("data-bound") === "1") { return; }
        btn.setAttribute("data-bound", "1");
        btn.addEventListener("click", function () {
          decoState[key] = def;
          decoSave();
          decoApply();
          syncDecoUi();
          tip(def === "" ? "已恢复为跟随主题色。" : "已恢复为 100%。");
        });
      })(document.getElementById(rids[i]), rkeys[i], rdef[i]);
    }
  }

  /* 背景颗粒模块已移除（2026-10-19）：原 v88 grainLoad/Save/Apply/syncGrainUi/bindGrainPanel 及 GRAIN_KEY 全部删除 */

  /* ---------------- v79：全站弹窗样式（外观设置 → 弹窗样式） ----------------
     弹窗不透明度（0~100%，默认 100% = 不透明实底）+ 弹窗字体颜色（默认 #000000 黑色）。
     localStorage 持久化（snowcrystal.popup.v1）。
     只写 :root 上的 --popup-a / --popup-text 两个变量，由各 css 的弹窗面板统一消费；
     换主题 / 切暗色时自动重算默认字体色（亮色黑 / 暗色自适应亮色，保证深底可读）。 */
  var POPUP_KEY = "snowcrystal.popup.v1";
  var POPUP_A_DEFAULT = 1;
  var POPUP_TEXT_DEFAULT = "#000000";
  var POPUP_TEXT_DARK_DEFAULT = "#EDEDF2";
  var popupState = { a: POPUP_A_DEFAULT, text: "" };

  function popupLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(POPUP_KEY) : null;
      if (!raw) { return; }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") { return; }
      if (typeof obj.a === "number" && isFinite(obj.a)) {
        popupState.a = Math.max(0, Math.min(1, obj.a));
      }
      var t = normHex(obj.text);
      if (t) { popupState.text = t; }
    } catch (e) { /* 忽略 */ }
  }

  function popupStore() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(POPUP_KEY, JSON.stringify({ a: popupState.a, text: popupState.text }));
      }
    } catch (e) { /* 忽略 */ }
  }

  function popupApply() {
    var root = document.documentElement;
    var dark = state.mode === "dark";
    var text = popupState.text || (dark ? POPUP_TEXT_DARK_DEFAULT : POPUP_TEXT_DEFAULT);
    root.style.setProperty("--popup-a", popupState.a.toFixed(2));
    root.style.setProperty("--popup-text", text);
  }

  function syncPopupUi() {
    var r = document.getElementById("popupOpacity");
    if (r) { r.value = String(Math.round(popupState.a * 100)); }
    var hex = document.getElementById("popupOpacityHex");
    if (hex) { hex.textContent = Math.round(popupState.a * 100) + "%"; }
    var pick = document.getElementById("popupColor");
    if (pick) { pick.value = popupState.text || POPUP_TEXT_DEFAULT; }
    var lab = document.getElementById("popupColorHex");
    if (lab) { lab.textContent = popupState.text ? popupState.text.toUpperCase() : "亮色默认黑"; }
  }

  function bindPopupPanel() {
    var r = document.getElementById("popupOpacity");
    if (r) {
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        popupState.a = v;
        popupApply();
        popupStore();
        syncPopupUi();
      });
    }
    var rBtn = document.getElementById("popupOpacityReset");
    if (rBtn) {
      rBtn.addEventListener("click", function () {
        popupState.a = POPUP_A_DEFAULT;
        popupStore();
        popupApply();
        syncPopupUi();
        tip("弹窗不透明度已恢复为 100%。");
      });
    }
    var pick = document.getElementById("popupColor");
    if (pick) {
      pick.addEventListener("input", function () {
        popupState.text = normHex(pick.value) || "";
        popupApply();
        popupStore();
        syncPopupUi();
      });
      pick.addEventListener("change", function () {
        popupState.text = normHex(pick.value) || "";
        popupApply();
        popupStore();
        syncPopupUi();
      });
    }
    var cBtn = document.getElementById("popupColorReset");
    if (cBtn) {
      cBtn.addEventListener("click", function () {
        popupState.text = "";
        popupStore();
        popupApply();
        syncPopupUi();
        tip("弹窗字体颜色已恢复默认：亮色黑色 / 暗色自适应。");
      });
    }
    var reset = document.getElementById("popupReset");
    if (reset) {
      reset.addEventListener("click", function () {
        popupState.a = POPUP_A_DEFAULT;
        popupState.text = "";
        try { if (window.localStorage) { window.localStorage.removeItem(POPUP_KEY); } } catch (e) { /* 忽略 */ }
        popupApply();
        syncPopupUi();
        tip("弹窗样式已复位：100% 不透明实底 + 默认字体颜色。");
      });
    }
  }

  /* ---------------- v94：首页纹理（外观设置 → 首页纹理） ----------------
     三类控制项：
       ① 纹理类型（kind）：牛仔 denim / 磨砂 grain / 星光 starlight / 网格 grid / 水波 ripple，
          由 seg 按钮切换，写入 .denim-texture 的 data-kind 属性，home-overlay.css 按 kind 分派背景；
       ② 纹理大小（--denim-size，px，2~24，默认 2）：各纹理按自身语义消费（斜纹周期/颗粒间距等）；
       ③ 纹理不透明度（--denim-a，0~1，默认 0.20）：对所有纹理统一生效。
     v95：默认改为 网格(grid) + 2px + 20%；纹理颜色由 CSS 用 --accent-deep-rgb 跟随主题本色。
     localStorage 持久化（snowcrystal.denim.v1，兼容 v93 旧存档：无 kind 字段时回落 denim；
     v95 起旧默认存档 denim/6/0.45 视为未自定义，统一迁移覆盖为新默认 grid/2/0.20）。
     纹理层作为 .wave-card 子元素，天然仅首页显示、不受磨砂 backdrop-filter 糊没。 */
  var DENIM_KEY = "snowcrystal.denim.v1";
  var DENIM_KINDS = ["denim", "grain", "starlight", "grid", "ripple"];
  var DENIM_KIND_DEFAULT = "grid";
  var DENIM_SIZE_DEFAULT = 2;
  var DENIM_A_DEFAULT = 0.20;
  var denimState = { kind: DENIM_KIND_DEFAULT, size: DENIM_SIZE_DEFAULT, a: DENIM_A_DEFAULT };

  function denimLoad() {
    try {
      var raw = window.localStorage ? window.localStorage.getItem(DENIM_KEY) : null;
      if (!raw) { return; }
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") { return; }
      /* v95：旧默认存档迁移 —— v93（无 kind，size=6/a=0.45）与 v94 未自定义
         （kind=denim + size=6 + a=0.45）均视为「停留在旧默认」，覆盖为新默认并写回；
         用户手动调过任意一项（非旧默认组合）则保留其选择。 */
      var kd = o.kind;
      var legacyDefault =
        (!kd || kd === "denim") &&
        (o.size === undefined || o.size === 6) &&
        (o.a === undefined || o.a === 0.45);
      if (legacyDefault) {
        denimState.kind = DENIM_KIND_DEFAULT;
        denimState.size = DENIM_SIZE_DEFAULT;
        denimState.a = DENIM_A_DEFAULT;
        denimSave();
        return;
      }
      if (kd && DENIM_KINDS.indexOf(kd) !== -1) { denimState.kind = kd; }
      var sz = parseInt(o.size, 10);
      if (isFinite(sz)) { denimState.size = Math.max(2, Math.min(24, sz)); }
      var a = parseFloat(o.a);
      if (isFinite(a)) { denimState.a = Math.max(0, Math.min(1, a)); }
    } catch (e) { /* 忽略 */ }
  }
  function denimSave() {
    try { if (window.localStorage) { window.localStorage.setItem(DENIM_KEY, JSON.stringify(denimState)); } } catch (e) { /* 忽略 */ }
  }
  function denimApply() {
    var root = document.documentElement;
    root.style.setProperty("--denim-size", denimState.size + "px");
    root.style.setProperty("--denim-a", denimState.a.toFixed(2));
    var el = document.querySelector(".wave-card .denim-texture");
    if (el) { el.setAttribute("data-kind", denimState.kind); }
  }
  function syncDenimUi() {
    var r = document.getElementById("denimSize");
    if (r) { r.value = String(denimState.size); }
    var rh = document.getElementById("denimSizeHex");
    if (rh) { rh.textContent = denimState.size + "px"; }
    var a = document.getElementById("denimOpacity");
    if (a) { a.value = String(Math.round(denimState.a * 100)); }
    var ah = document.getElementById("denimOpacityHex");
    if (ah) { ah.textContent = Math.round(denimState.a * 100) + "%"; }
    var btns = document.querySelectorAll(".denim-kind-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("is-on", btns[i].getAttribute("data-kind") === denimState.kind);
    }
  }
  function bindDenimPanel() {
    var r = document.getElementById("denimSize");
    if (r && r.getAttribute("data-bound") !== "1") {
      r.setAttribute("data-bound", "1");
      r.addEventListener("input", function () {
        var n = parseInt(r.value, 10);
        denimState.size = isFinite(n) ? Math.max(2, Math.min(24, n)) : DENIM_SIZE_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
      });
    }
    var rs = document.getElementById("denimSizeReset");
    if (rs && rs.getAttribute("data-bound") !== "1") {
      rs.setAttribute("data-bound", "1");
      rs.addEventListener("click", function () {
        denimState.size = DENIM_SIZE_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理大小已恢复为 2px。");
      });
    }
    var a = document.getElementById("denimOpacity");
    if (a && a.getAttribute("data-bound") !== "1") {
      a.setAttribute("data-bound", "1");
      a.addEventListener("input", function () {
        var n = parseInt(a.value, 10);
        denimState.a = isFinite(n) ? Math.max(0, Math.min(100, n)) / 100 : DENIM_A_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
      });
    }
    var ra = document.getElementById("denimOpacityReset");
    if (ra && ra.getAttribute("data-bound") !== "1") {
      ra.setAttribute("data-bound", "1");
      ra.addEventListener("click", function () {
        denimState.a = DENIM_A_DEFAULT;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理不透明度已恢复为 20%。");
      });
    }
    var btns = document.querySelectorAll(".denim-kind-btn");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-bound") === "1") { continue; }
      btns[i].setAttribute("data-bound", "1");
      btns[i].addEventListener("click", function () {
        var kd = this.getAttribute("data-kind");
        if (DENIM_KINDS.indexOf(kd) === -1) { return; }
        denimState.kind = kd;
        denimSave();
        denimApply();
        syncDenimUi();
        tip("首页纹理已切换为" + (kd === "denim" ? "牛仔。" : kd === "grain" ? "磨砂颗粒。" : kd === "starlight" ? "星光闪烁。" : kd === "grid" ? "网格线。" : "水波纹。"));
      });
    }
  }

  /* ---------------- v30：网站自定义背景图片（本机永久保存） ----------------
     上传时先等比压缩（长边 ≤ 1440、JPEG 0.86）再存 localStorage，
     刷新 / 关掉重开浏览器都还在，不依赖任何外部服务。
     若本机存储写不进去（配额满 / 隐私模式），退化为「本次会话内存保留」
     并明确提示，不会出现「看着上传成功、一刷新就没了」的假象。 */
  var BG_KEY = "snow_crystal_bg_v30";
  var BG_OP_KEY = "snow_crystal_bg_op_v30";
  var SITE_BG_KEY = "snow_crystal_site_bg_v41";
  var BG_MAX = 1440, BG_Q = 0.86;
  var bgMem = "";                      /* 内存兜底 */

  function bgStore(key, val) { try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function bgRead(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function bgCurrent() { return bgRead(BG_KEY) || bgMem; }
  function bgOpacity() {
    var n = parseFloat(bgRead(BG_OP_KEY));
    return (isFinite(n) && n >= 0 && n <= 1) ? n : 1;
  }
  function updateBgLayer() {
    var data = bgCurrent();
    var el = document.getElementById("bgPhoto");
    if (el) {
      if (data) { el.style.setProperty("--bg-photo", 'url("' + data + '")'); el.setAttribute("data-on", "1"); }
      else { el.style.removeProperty("--bg-photo"); el.setAttribute("data-on", "0"); }
    }
    document.documentElement.style.setProperty("--bg-photo-a", bgOpacity().toFixed(2));
    var thumb = document.getElementById("bgThumb");
    if (thumb) { thumb.style.backgroundImage = data ? 'url("' + data + '")' : "none"; }
  }
  function syncBgUi() {
    var p = Math.round(bgOpacity() * 100);
    var r = document.getElementById("bgOpacity"), hex = document.getElementById("bgOpacityHex");
    if (r) { r.value = String(p); }
    if (hex) { hex.textContent = p + "%"; }
  }
  function bgSetImage(dataUrl) {
    bgMem = dataUrl || "";
    var ok = true;
    if (dataUrl) { ok = bgStore(BG_KEY, dataUrl); }
    else { try { window.localStorage.removeItem(BG_KEY); } catch (e) {} }
    updateBgLayer();
    return ok;
  }
  function bgCompress(file, done) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (!w || !h) { done(fr.result); return; }
        var k = Math.min(1, BG_MAX / Math.max(w, h));
        var cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(w * k));
        cv.height = Math.max(1, Math.round(h * k));
        var ctx = cv.getContext("2d");
        if (!ctx) { done(fr.result); return; }
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        var out = fr.result;
        try { out = cv.toDataURL("image/jpeg", BG_Q) || fr.result; } catch (e) { out = fr.result; }
        done(out);
      };
      img.onerror = function () { done(fr.result); };
      img.src = fr.result;
    };
    fr.onerror = function () { done(null); };
    fr.readAsDataURL(file);
  }
  function bindBgPanel() {
    var pick = document.getElementById("bgPick");
    var clr = document.getElementById("bgClear");
    var file = document.getElementById("bgFile");
    var r = document.getElementById("bgOpacity");
    var rBtn = document.getElementById("bgOpacityReset");
    if (pick && file) {
      pick.addEventListener("click", function () { file.value = ""; file.click(); });
    }
    if (file) {
      file.addEventListener("change", function () {
        var f = file.files && file.files[0];
        if (!f) { return; }
        tip("正在处理背景图片…");
        bgCompress(f, function (data) {
          if (!data) { tip("这张图片没能读取成功，换一张试试。"); return; }
          var ok = bgSetImage(data);
          syncBgUi();
          tip(ok ? "背景图片已设置，并永久保存在本机（刷新 / 重开都在）。"
                 : "背景图片已应用，但本机存储写不进去，只在本次会话保留。");
        });
      });
    }
    if (clr) {
      clr.addEventListener("click", function () { bgSetImage(""); tip("背景图片已清除。"); });
    }
    if (r) {
      r.addEventListener("input", function () {
        var v = Math.max(0, Math.min(1, (parseFloat(r.value) || 0) / 100));
        document.documentElement.style.setProperty("--bg-photo-a", v.toFixed(2));
        var hex = document.getElementById("bgOpacityHex");
        if (hex) { hex.textContent = Math.round(v * 100) + "%"; }
        bgStore(BG_OP_KEY, String(v));
      });
    }
    if (rBtn) {
      rBtn.addEventListener("click", function () {
        bgStore(BG_OP_KEY, "1");
        document.documentElement.style.setProperty("--bg-photo-a", "1.00");
        syncBgUi();
        tip("背景图不透明度已恢复为 100%。");
      });
    }
    /* v41：网站自定义背景颜色 —— 纯色底，可与背景图叠加；本机永久保存 */
    var colorPick = document.getElementById("bgColorPick");
    var colorReset = document.getElementById("bgColorReset");
    function applySiteBg(hex) {
      var root = document.documentElement;
      if (hex) {
        root.style.setProperty("--site-bg", hex);
        root.setAttribute("data-site-bg", "1");
      } else {
        root.style.removeProperty("--site-bg");
        root.removeAttribute("data-site-bg");
      }
      if (colorPick && hex) { colorPick.value = hex; }
      var lab = document.getElementById("bgColorHex");
      if (lab) { lab.textContent = hex ? hex.toUpperCase() : "跟随主题"; }
    }
    applySiteBg(bgRead(SITE_BG_KEY) || "");
    if (colorPick) {
      colorPick.addEventListener("input", function () {
        bgStore(SITE_BG_KEY, colorPick.value);
        applySiteBg(colorPick.value);
      });
      colorPick.addEventListener("change", function () {
        bgStore(SITE_BG_KEY, colorPick.value);
        applySiteBg(colorPick.value);
      });
    }
    if (colorReset) {
      colorReset.addEventListener("click", function () {
        try { window.localStorage.removeItem(SITE_BG_KEY); } catch (e) { /* 忽略 */ }
        applySiteBg("");
        tip("背景颜色已恢复为跟随主题。");
      });
    }
  }

  /* ---------------- v18：视口变化 → 重算缩放与两个卡片流 ---------------- */
  var resizeTimer = null;
  function bindGlobalResize() {
    window.addEventListener("resize", function () {
      updateUiScale();
      if (resizeTimer) { window.clearTimeout(resizeTimer); }
      resizeTimer = window.setTimeout(refitAll, 160);
    });
  }

  /* ---------------- 主题存取 ---------------- */
  function resolveKey(key) {
    var i;
    for (i = 0; i < THEMES.length; i++) {
      if (THEMES[i].key === key) { return THEMES[i]; }
    }
    if (typeof key === "string" && key.indexOf("custom:") === 0) {
      var idx = parseInt(key.slice(7), 10);
      if (state.customs[idx]) {
        return { key: key, name: customName(idx), base: state.customs[idx], mode: "light" };
      }
    }
    return null;
  }

  function customName(idx) {
    return "自定义" + (state.customs.length > 1 ? (idx + 1) : "");
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) { return; }
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") { return; }
      if (Array.isArray(obj.customs)) {
        state.customs = [];
        for (var i = 0; i < obj.customs.length && state.customs.length < MAX_CUSTOM; i++) {
          var hx = normHex(obj.customs[i]);
          if (hx) { state.customs.push(hx); }
        }
      }
      var spec = resolveKey(obj.key);
      if (spec) {
        state.key = spec.key; state.name = spec.name; state.base = spec.base; state.mode = spec.mode;
      }
      /* v101：识别配色（AiPalette）以「custom-preview」为 key 持久化主题状态，
         resolveKey 无法解析该 key（会返回 null 丢掉 base），这里单独恢复 base，
         保证刷新后主题主色 = 识别主色，不再退回默认主题。 */
      if (typeof obj.base === "string") {
        var bh = normHex(obj.base);
        if (bh) { state.base = bh; }
      }
    } catch (e) { /* 隐私模式 / file:// 下可能不可用，忽略 */ }
  }

  function persist() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ key: state.key, customs: state.customs, base: state.base }));
    } catch (e) { /* 忽略 */ }
  }

  function isBuiltin(key) {
    for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].key === key) { return true; } }
    return false;
  }

  /* ---------------- 主题列表渲染 ---------------- */
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="__C__" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.6 10.4 17 18 8.4"/></svg>';

  function swatchHtml(key, name, hex, mode, active, customIdx) {
    var c = hexToRgb(hex) || { r: 61, g: 121, b: 252 };
    var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    var tickColor = lum > 0.62 ? "#23262E" : "#FFFFFF";
    var bg;
    if (mode === "dark") { bg = "linear-gradient(160deg, #2C313B 0%, #12141A 100%)"; }
    else { bg = hex; }
    return '<button class="swatch' + (active ? " active" : "") + '" type="button" data-theme="' + key + '"' +
      (typeof customIdx === "number" ? ' data-custom="' + customIdx + '"' : "") +
      ' onclick="SnowCrystal.setTheme(\'' + key + '\')" title="' + name + " " + hex + '">' +
      '<span class="swatch-dot" style="background:' + bg + '">' + TICK.replace("__C__", tickColor) + "</span>" +
      '<span class="swatch-name">' + name + "</span>" +
      "</button>";
  }

  function renderSwatches() {
    var grid = document.getElementById("themeGrid");
    if (!grid) { return; }
    var html = "", i;
    for (i = 0; i < THEMES.length; i++) {
      html += swatchHtml(THEMES[i].key, THEMES[i].name, THEMES[i].base, THEMES[i].mode, THEMES[i].key === state.key);
    }
    for (i = 0; i < state.customs.length; i++) {
      var ck = "custom:" + i;
      html += swatchHtml(ck, customName(i), state.customs[i], "light", ck === state.key, i);
    }
    grid.innerHTML = html;
    /* v28：区域图标 / 字体颜色面板（主题切换后同步刷新） */
    renderZonePanels();
    bindZonePanels();
  }

  /* ---------------- 界面同步 ---------------- */
  var tipTimer = null;
  function tip(text) {
    var el = document.getElementById("customTip");
    if (!el) { return; }
    el.textContent = text;
    if (tipTimer) { window.clearTimeout(tipTimer); }
    tipTimer = window.setTimeout(function () {
      el.textContent = "选好颜色后点「保存」，主题立即生效并记忆在本机，最多 6 个；保存后双击色块即可删除该颜色。";
    }, 2200);
  }

  function syncUi() {
    var swatches = document.querySelectorAll("#themeGrid .swatch");
    for (var i = 0; i < swatches.length; i++) {
      if (swatches[i].getAttribute("data-theme") === state.key) { swatches[i].classList.add("active"); }
      else { swatches[i].classList.remove("active"); }
    }
    var meta = document.getElementById("themeMeta");
    if (meta) { meta.textContent = state.name; }
    var dot = document.getElementById("currentDot");
    if (dot) { dot.style.background = state.base; }
    var nameEl = document.getElementById("currentName");
    if (nameEl) { nameEl.textContent = state.name; }
    var hexEl = document.getElementById("currentHex");
    if (hexEl) { hexEl.textContent = state.base + (isBuiltin(state.key) ? " · 内置" : (state.key === "custom-preview" ? " · 预览中" : " · 自定义")); }

    var colorInput = document.getElementById("customColor");
    if (colorInput && document.activeElement !== colorInput) { colorInput.value = state.base; }
    var hexInput = document.getElementById("customHex");
    if (hexInput && document.activeElement !== hexInput) { hexInput.value = state.base; }
    /* v37：主题切换后同步「首页装饰」色块的默认回退色 */
    decoApply();
    syncDecoUi();
    /* v79：主题切换后同步「弹窗样式」滑条 / 取色器显示 */
    popupApply();
    syncPopupUi();
  }

  /* ---------------- 对外操作 ---------------- */
  function setTheme(key) {
    var spec = resolveKey(key);
    if (!spec) { return; }
    state.key = spec.key;
    state.name = spec.name;
    state.base = spec.base;
    state.mode = spec.mode;
    applyState();
    syncUi();
    persist();
  }

  function previewCustom(hex) {
    var hx = normHex(hex);
    if (!hx) { return false; }
    state.key = "custom-preview";
    state.name = "自定义";
    state.base = hx;
    state.mode = "light";
    applyState();
    syncUi();
    return true;
  }

  function saveCustom() {
    var hexInput = document.getElementById("customHex");
    var colorInput = document.getElementById("customColor");
    var raw = (hexInput && hexInput.value) || (colorInput && colorInput.value) || state.base;
    var hx = normHex(raw);
    if (!hx) { tip("色值格式不正确，示例：3D79FC 或 #3D79FC"); return; }

    var idx = state.customs.indexOf(hx);
    if (idx < 0) {
      if (state.customs.length >= MAX_CUSTOM) { state.customs.shift(); }
      state.customs.push(hx);
      idx = state.customs.length - 1;
    }
    state.key = "custom:" + idx;
    state.name = customName(idx);
    state.base = hx;
    state.mode = "light";
    applyState();
    renderSwatches();
    syncUi();
    persist();
    tip("已保存「" + state.name + "」：" + hx + "，主题已生效");
  }

  function resetTheme() {
    setTheme(DEFAULT_THEME.key);
    tip("已恢复默认主题（" + DEFAULT_THEME.base + "）");
  }

  /* ---------------- v100：全局页面大小重绘入口 ----------------
     供「设置 → 页面大小」滑杆实时调整 --ui 并重排（refitAll 内部含
     卡流重算与滚动复核，调整后立即生效）。仅导出，不改动原逻辑。 */
  window.fitOneScreen = fitOneScreen;
  window.refitAll = refitAll;

  /* ===== 识别颜色（美化设置 → 识别颜色）：上传图片提取配色 → 3 套渐变方案 =====
     流程：上传图片 → canvas 采样 → 主色相桶聚类 → 3 套配色方案（清浅同调 / 邻近三色 / 互补撞色）
     每套方案：主色 base（驱动主题引擎）+ 8 个渐变变量（背景/卡片/按键/强调），
     勾选应用后写入 :root + html[data-ai-palette]，全站背景/卡片/按键/选中态统一渐变。
     配色规则：饱和度收敛 34~62、明度收敛 54~76（鲜艳但不刺眼），背景浅调 l≥84，
     渐变两端明度差 ≤8~10（柔和过渡），保证方案不出现难看撞色。 */
  var AiPalette = (function () {
    var LS_KEY = "snowcrystal.aipalette.v1";
    var cur = null; /* { schemes, selected, applied, photo, prev } */

    function pickFile() {
      var inp = document.getElementById("aiFileInput");
      if (inp) { inp.click(); }
    }

    function bindFile() {
      var inp = document.getElementById("aiFileInput");
      if (inp && !inp._aiBound) {
        inp._aiBound = true;
        inp.addEventListener("change", function (ev) {
          var file = ev.target.files && ev.target.files[0];
          if (!file) { return; }
          var rd = new FileReader();
          rd.onload = function (e) {
            var img = new Image();
            img.onload = function () {
              try { buildSchemes(img, e.target.result); }
              catch (err) { tip("图片读取失败，请换一张试试"); }
            };
            img.onerror = function () { tip("图片读取失败，请换一张试试"); };
            img.src = e.target.result;
          };
          rd.readAsDataURL(file);
          ev.target.value = "";
        });
      }
    }

    function rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
      if (d > 0) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) { h = ((g - b) / d) % 6; }
        else if (mx === g) { h = (b - r) / d + 2; }
        else { h = (r - g) / d + 4; }
        h *= 60; if (h < 0) { h += 360; }
      }
      return { h: h, s: s, l: l };
    }

    function hslToHex(h, s, l) {
      h = ((h % 360) + 360) % 360;
      s = Math.max(0, Math.min(1, s / 100));
      l = Math.max(0, Math.min(1, l / 100));
      var c = (1 - Math.abs(2 * l - 1)) * s;
      var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      var m = l - c / 2;
      var r, g, b;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      function ch(v) {
        var n = Math.round((v + m) * 255).toString(16);
        return n.length === 1 ? "0" + n : n;
      }
      return ("#" + ch(r) + ch(g) + ch(b)).toUpperCase();
    }

    function hueDiff(a, b) {
      var d = ((b - a) % 360 + 360) % 360;
      return d > 180 ? d - 360 : d;
    }
    function clampV(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    /* v101：生成 96px 缩略图用于持久化（原图 dataURL 可能数 MB，超过 localStorage 配额时
       整个识别配色方案会写不进去 → 刷新后丢失；缩略图仅用于面板预览，不影响配色恢复）。 */
    function makeAiThumb(img) {
      try {
        var w = img.naturalWidth || img.width || 0;
        var h = img.naturalHeight || img.height || 0;
        if (!w || !h) { return null; }
        var maxW = 96;
        var scale = Math.min(1, maxW / w);
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.72);
      } catch (e) { return null; }
    }

    function buildSchemes(img, dataUrl) {
      var W = 48;
      var H = Math.max(1, Math.round(img.height * W / img.width));
      var canvas = document.getElementById("aiCanvas");
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      var px = ctx.getImageData(0, 0, W, H).data;

      var buckets = [];
      for (var b = 0; b < 12; b++) { buckets.push({ hist: {}, n: 0, topKey: null, topN: 0 }); }
      for (var i = 0; i < px.length; i += 4) {
        var hsl = rgbToHsl(px[i], px[i + 1], px[i + 2]);
        if (hsl.s < 0.10 || hsl.l < 0.08 || hsl.l > 0.96) { continue; }
        var idx = Math.min(11, Math.floor((hsl.h / 360) * 12));
        var bk = buckets[idx];
        var key = px[i] + "," + px[i + 1] + "," + px[i + 2];
        bk.n++;
        bk.hist[key] = (bk.hist[key] || 0) + 1;
        if (bk.hist[key] > bk.topN) { bk.topN = bk.hist[key]; bk.topKey = key; }
      }
      var ranked = [];
      for (var j = 0; j < 12; j++) { if (buckets[j].n > 0) { ranked.push(j); } }
      ranked.sort(function (a, b2) { return buckets[b2].n - buckets[a].n; });
      if (!ranked.length) { tip("图片颜色太素，换一张色彩丰富的试试"); return; }

      /* 真实取色：每个色相桶取「出现次数最多的像素色」，保证方案里的颜色
         都真实存在于原图，而不是根据图片推算出来的相近色 */
      function realColor(idx) {
        var bk = buckets[idx];
        var p = bk.topKey.split(",");
        var hsl = rgbToHsl(+p[0], +p[1], +p[2]);
        return { h: ((hsl.h % 360) + 360) % 360, s: hsl.s * 100, l: hsl.l * 100, rgb: [+p[0], +p[1], +p[2]] };
      }
      function realHex(c) {
        function ch(v) { var n = Math.round(v).toString(16).toUpperCase(); return n.length === 1 ? "0" + n : n; }
        return "#" + ch(c.rgb[0]) + ch(c.rgb[1]) + ch(c.rgb[2]);
      }
      var raws = [];
      for (var k = 0; k < ranked.length && k < 5; k++) { raws.push(realColor(ranked[k])); }

      /* 方案生成：颜色一律取自原图真实像素色（raws），仅对背景/卡片做
         同色相明度层次调整以保证可读性，不引入任何图片中不存在的色相 */
      function schemeReal(name, arr) {
        var n = arr.length;
        var c0 = arr[0];
        var c1 = arr[1] || c0;
        var c2 = arr[2] || c0;
        var c3 = arr[3] || c0;
        /* 角色分配：方案含 3 色及以上时，卡片 / 按键错开使用后序取色，
           让三色组合、全色板与双色方案的实际应用效果明显不同 */
        var bgA = c0, cardA = n >= 3 ? c1 : c0, btnA = n >= 3 ? c2 : c0;
        var bg1 = hslToHex(bgA.h, Math.max(14, bgA.s - 10), 88);
        var card1 = hslToHex(cardA.h, Math.max(16, cardA.s - 8), 84);
        /* 清透按键：明度提到 46~58、饱和度收敛到 40 以内，替代原 24~40 深色 */
        var btn1 = hslToHex(btnA.h, Math.min(40, btnA.s + 4), clampV(btnA.l * 0.8, 46, 58));
        /* v104：按键文字色根因修复 —— 按按键背景亮度自动决定：
           方案内颜色为白色/近白色（btnA 明度≥88，按键背景对应灰白）时文字固定黑色，
           其余情况文字固定白色，避免识别配色下同色系深字 + 浅底对比度不足看不清；
           luminance(btn1)>0.62 为最终背景高亮兜底（当前生成逻辑不会触发）。 */
        var btnText = (btnA.l >= 88 || luminance(btn1) > 0.62) ? "#111111" : "#FFFFFF";
        /* v74：各区域皆纯色 —— 背景/卡片/按键只取单色，不再生成渐变两端色，
           变量对（bg-2/card-2/btn-2）与主色相同，既有 CSS 渐变两端同色即视觉纯色 */
        var bg2 = bg1, card2 = card1, btn2 = btn1;
        var acc1 = realHex(c0);
        var acc2 = realHex(c1);
        var acc3 = realHex(c2);
        var acc4 = realHex(c3);
        /* 主题主色也随方案错开：双色及以下用首色，三色及以上用第二主色，
           让各方案应用后的整体观感差异明显 */
        var base = n >= 3 ? acc2 : acc1;
        return {
          name: name,
          base: base,
          /* 预览色块展示「应用后」的真实角色色：背景 / 卡片 / 按键（纯色） */
          grads: [bg1, card1, btn1],
          vars: {
            "--ai-bg-1": bg1, "--ai-bg-2": bg2,
            "--ai-card-1": card1, "--ai-card-2": card2,
            "--ai-btn-1": btn1, "--ai-btn-2": btn2,
            "--ai-btn-text": btnText,
            "--ai-accent-1": acc1, "--ai-accent-2": acc2
          }
        };
      }

      /* 方案清单：全部取自原图真实主色，颜色不经过任何色相偏移 */
      var schemes = [];
      if (raws.length >= 1) { schemes.push(schemeReal("图片原色·主色", [raws[0]])); }
      if (raws.length >= 2) {
        schemes.push(schemeReal("图片原色·第二色", [raws[1]]));
        schemes.push(schemeReal("图片原色·双色组合", [raws[0], raws[1]]));
      }
      if (raws.length >= 3) {
        schemes.push(schemeReal("图片原色·第三色", [raws[2]]));
        schemes.push(schemeReal("图片原色·三色组合", [raws[0], raws[1], raws[2]]));
      }
      if (raws.length >= 4) { schemes.push(schemeReal("图片原色·第四色", [raws[3]])); }
      if (raws.length >= 5) { schemes.push(schemeReal("图片原色·全色板", raws)); }

      cur = { schemes: schemes, selected: 0, applied: null, photo: dataUrl, thumb: makeAiThumb(img), prev: null };
      render();
      tip("已提取图片真实配色，勾选一套方案应用全局");
    }

    function render() {
      bindFile();
      var photo = document.getElementById("aiPhotoRow");
      if (cur && cur.photo) {
        photo.hidden = false;
        photo.innerHTML = '<img src="' + cur.photo + '" alt="识别原图">';
      } else { photo.hidden = true; photo.innerHTML = ""; }

      var wrap = document.getElementById("aiSchemes");
      var actions = document.getElementById("aiActions");
      if (!cur || !cur.schemes || !cur.schemes.length) {
        if (wrap) { wrap.innerHTML = ""; }
        if (actions) { actions.hidden = true; }
        return;
      }
      var html = "";
      for (var i = 0; i < cur.schemes.length; i++) {
        var s = cur.schemes[i];
        var cls = "ai-scheme";
        if (i === cur.selected) { cls += " is-sel"; }
        if (i === cur.applied) { cls += " is-applied"; }
        html += '<div class="' + cls + '" onclick="SnowCrystal.AiPalette.select(' + i + ')">' +
          '<span class="ai-scheme-radio"></span>' +
          '<span class="ai-scheme-name">' + s.name + '</span>' +
          '<span class="ai-scheme-grads">' +
            s.grads.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") +
          '</span>' +
          '<button class="ai-scheme-apply" type="button" onclick="event.stopPropagation();SnowCrystal.AiPalette.apply(' + i + ')">应用</button>' +
        '</div>';
      }
      if (wrap) { wrap.innerHTML = html; }
      if (actions) { actions.hidden = false; }
    }

    function select(i) {
      if (!cur) { return; }
      cur.selected = i;
      render();
    }

    function apply(i) {
      if (!cur || !cur.schemes[i]) { return; }
      var s = cur.schemes[i];
      if (!cur.prev) {
        cur.prev = { base: state.base, key: state.key, name: state.name, mode: state.mode };
      }
      cur.applied = i;
      previewCustom(s.base);
      persist();
      var root = document.documentElement;
      for (var k in s.vars) {
        if (Object.prototype.hasOwnProperty.call(s.vars, k)) { root.style.setProperty(k, s.vars[k]); }
      }
      root.style.setProperty("--key-grad", s.vars["--ai-btn-1"]);
      root.setAttribute("data-ai-palette", "1");
      /* v101：持久化只存缩略图（原图 dataURL 可能数 MB，超过 localStorage 5MB 配额时
         setItem 抛 QuotaExceededError 被 catch 吞掉 → 识别配色方案整体没存上 → 刷新后丢失。
         schemes 已含全部配色变量，缩略图仅用于面板预览。 */
      try { localStorage.setItem(LS_KEY, JSON.stringify({ selected: i, applied: i, photo: cur.thumb || null, schemes: cur.schemes, prev: cur.prev })); } catch (e) {}
      render();
      tip("已应用「" + s.name + "」配色，全站纯色生效");
      try { if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.applyStored) { window.SnowCrystal.Chat.applyStored(); } } catch (e) { /* ignore: 聊天室未打开时无需处理 */ }
    }

    function clear() {
      var root = document.documentElement;
      root.removeAttribute("data-ai-palette");
      root.style.removeProperty("--key-grad");
      var keys = ["--ai-bg-1","--ai-bg-2","--ai-card-1","--ai-card-2","--ai-btn-1","--ai-btn-2","--ai-accent-1","--ai-accent-2"];
      for (var i = 0; i < keys.length; i++) { root.style.removeProperty(keys[i]); }
      if (cur && cur.prev) {
        state.base = cur.prev.base; state.key = cur.prev.key; state.name = cur.prev.name; state.mode = cur.prev.mode;
        applyState(); syncUi(); persist();
      }
      cur = null;
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      render();
      tip("已清除识别配色，恢复原主题");
      try { if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.applyStored) { window.SnowCrystal.Chat.applyStored(); } } catch (e) { /* ignore: 聊天室未打开时无需处理 */ }
    }

    function init() {
      bindFile();
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) { return; }
        var o = JSON.parse(raw);
        if (!o || !o.schemes || !o.schemes.length || typeof o.selected !== "number") { return; }
        cur = { schemes: o.schemes, selected: o.selected, applied: (o.applied === undefined ? null : o.applied), photo: o.photo || null, prev: o.prev || null };
        var root = document.documentElement;
        if (cur.applied !== null && cur.schemes[cur.applied]) {
          var s = cur.schemes[cur.applied];
          /* 持久化修复：先恢复方案主色到主题引擎（state.base → :root 主题变量），
             再下发渐变变量，保证刷新后全站配色一致，不再部分退回默认主题 */
          if (typeof previewCustom === "function") { previewCustom(s.base); }
          for (var k in s.vars) {
            if (Object.prototype.hasOwnProperty.call(s.vars, k)) { root.style.setProperty(k, s.vars[k]); }
          }
          root.style.setProperty("--key-grad", s.vars["--ai-btn-1"]);
          root.setAttribute("data-ai-palette", "1");
          /* v101：把识别主色固化进主题引擎存档（key=custom-preview + base 字段），
             后续任何 applyState 重算都基于识别主色，不再退回默认主题；
             同时保证主题引擎存档与 AiPalette 存档一致。 */
          try { if (typeof persist === "function") { persist(); } } catch (e) {}
        }
        render();
        try { if (window.SnowCrystal && window.SnowCrystal.Chat && window.SnowCrystal.Chat.applyStored) { window.SnowCrystal.Chat.applyStored(); } } catch (e) { /* ignore: 聊天室未打开时无需处理 */ }
      } catch (e) {}
    }

    /* 持久化修复：等所有 DOMContentLoaded 初始化（含主题引擎 loadState+applyState）
       跑完后，再在 window load 时恢复识别配色，避免刷新后主题变量被默认主题覆盖 */
    function restoreOnLoad() {
      if (document.readyState === "complete") { init(); }
      else { window.addEventListener("load", init); }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", restoreOnLoad);
    } else { init(); }

    return { pickFile: pickFile, select: select, apply: apply, clear: clear, init: init };
  })();

  function openAiPalette() { switchPage("ai-palette"); AiPalette.init(); }

  (function () {
    var NS = window.SnowCrystal || (window.SnowCrystal = {});
    NS.openAiPalette = openAiPalette;
    NS.AiPalette = AiPalette;
  })();



