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
    { key: "green",   name: "浅绿", base: "#CCE8B5", mode: "light" },   /* 2026-10-30 浅绿改为 #CCE8B5 色系 */
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

/* ============================================================================
 * 首帧主题引导（00b-theme-core.js 尾部）
 * 用途：在 <head> 阶段同步恢复 localStorage 主题，将全部 CSS 变量写入 :root，
 *       并设置 data-theme-mode / data-theme-key 属性，杜绝首帧闪默认主题（FOUC）。
 * 与 05-theme-engine.js 的 loadState+applyState 幂等：后者在 DOM 就绪后重放相同值。
 * ========================================================================== */
function __xjThemeBoot(root) {
  try {
    var saved = null;
    try { var raw = window.localStorage.getItem(STORE_KEY); if (raw) { saved = JSON.parse(raw); } } catch (e) { saved = null; }
    var st = {
      key: DEFAULT_THEME.key,
      name: DEFAULT_THEME.name,
      base: DEFAULT_THEME.base,
      mode: DEFAULT_THEME.mode,
      customs: []
    };
    if (saved && typeof saved === "object") {
      if (Array.isArray(saved.customs)) {
        for (var ci = 0; ci < saved.customs.length && ci < MAX_CUSTOM; ci++) {
          var c = saved.customs[ci];
          if (c && typeof c === "object") {
            var hex = normHex(c.base);
            var nm = typeof c.name === "string" ? c.name : "";
            if (hex && nm) { st.customs.push({ base: hex, name: nm }); }
          }
        }
      }
      var wantKey = typeof saved.key === "string" ? saved.key : "";
      var matched = null;
      for (var ti = 0; ti < THEMES.length; ti++) {
        if (THEMES[ti].key === wantKey) { matched = THEMES[ti]; break; }
      }
      if (!matched && /^custom:\d+$/.test(wantKey)) {
        var cidx = parseInt(wantKey.split(":")[1], 10);
        if (cidx >= 0 && cidx < st.customs.length) {
          matched = { key: "custom:" + cidx, name: st.customs[cidx].name, base: st.customs[cidx].base, mode: "light" };
        }
      }
      if (matched) { st.key = matched.key; st.name = matched.name; st.base = matched.base; st.mode = matched.mode; }
      if (typeof saved.base === "string" && saved.base) {
        var bh = normHex(saved.base);
        if (bh) { st.base = bh; }
      }
    }
    var vars = buildPalette(st.base, st.mode, st.key);
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) { root.style.setProperty(k, vars[k]); }
    }
    root.setAttribute("data-theme-mode", st.mode === "dark" ? "dark" : "light");
    root.setAttribute("data-theme-key", st.key);
  } catch (e) {
    /* 首帧恢复失败：CSS 兜底变量继续生效，不阻塞渲染 */
  }
}
