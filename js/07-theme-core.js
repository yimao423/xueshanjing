/* 雪山晶 · 07-theme-core ｜ 源：雪山晶.html L6697-L7259 ｜ JS 模块 */
;/* 主题引擎与外观 */
"use strict";
  /* 主题引擎（外观设置） */
  var STORE_KEY = "snowcrystal.theme.v1";
  /* 自定义颜色上限动态跟随设备内存：原写死 6，现按 XJ_CAP.customMax() 分档（6/8/10/12） */
  var DEFAULT_THEME = { key: "default", name: "时间缝隙主题", base: "#1A1A1A", mode: "light" };

  var THEMES = [
    { key: "default", name: "时间缝隙主题", base: "#1A1A1A", mode: "light" }
  ];

  var state = {
    key: DEFAULT_THEME.key,
    name: DEFAULT_THEME.name,
    base: DEFAULT_THEME.base,
    mode: DEFAULT_THEME.mode,
    polarity: "yang",
  };

  /* 颜色工具 */
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
  function hslTriple(h, s, l) { var c = hslToRgb(h, s, l); return Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b); }

  /* 主题调色板生成 */
  function luminance(hex) {
    var c = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  }

  /* 主色底上的前景色：亮底用深字、暗底用白字，避免浅色主题白字看不清 */
  function onColor(hex) {
    return luminance(hex) > 0.62 ? "#16181D" : "#FFFFFF";
  }

  function buildPalette(baseHex, mode, themeKey) {
    var c = hexToRgb(baseHex) || hexToRgb(DEFAULT_THEME.base);
    var base = rgbToHsl(c.r, c.g, c.b);
    var h = base.h, l = base.l;
    var sat = base.s;
    var v = {};

    /* 简约黑白风：默认主题（key === "default"）走专属单色配色，与彩色主题解耦 */
    if (mode !== "dark" && themeKey === "default") {
      v["--accent"]        = "#1A1A1A";
      v["--accent-2"]      = "#3A3A3A";
      v["--accent-deep"]   = "#333333";
      v["--accent-strong"] = "#555555";
      v["--leaf"]          = "#EDEDED";
      v["--leaf-soft"]     = "#F5F5F5";
      v["--crystal-2"]     = "#CFCFCF";
      v["--crystal-3"]     = "#E2E2E2";
      v["--crystal-sky"]   = "#D6D6D6";
      v["--accent-rgb"]        = "26,26,26";
      v["--accent-2-rgb"]      = "58,58,58";
      v["--accent-deep-rgb"]   = "51,51,51";
      v["--accent-strong-rgb"] = "85,85,85";
      v["--leaf-rgb"]          = "237,237,237";
      v["--bg"]            = "#FFFFFF";
      v["--bg-top"]        = "#FFFFFF";
      v["--bg-deep"]       = "#F2F2F2";
      v["--page-outside"]  = "#FFFFFF";
      v["--tint-1"]        = "#FAFAFA";
      v["--tint-2"]        = "#F0F0F0";
      v["--hover-bg"]      = "rgba(0,0,0,0.05)";
      v["--card"]          = "#FFFFFF";
      v["--card-border"]   = "rgba(0,0,0,0.10)";
      v["--divider"]       = "rgba(0,0,0,0.10)";
      v["--surface"]       = "rgba(255,255,255,0.72)";
      v["--surface-ghost"] = "rgba(255,255,255,0.85)";
      v["--glass-nav"]     = "rgba(255,255,255,0.72)";
      v["--glass-icon"]    = "rgba(255,255,255,0.55)";
      v["--glass-border"]  = "rgba(0,0,0,0.06)";
      v["--glass-card"]    = "rgba(255,255,255,0.60)";
      v["--glass-card-border"] = "rgba(0,0,0,0.10)";
      v["--glass-blur"]    = "none";
      v["--card-rgb"]      = "255,255,255";
      v["--surface-rgb"]   = "255,255,255";
      v["--glass-nav-rgb"] = "255,255,255";
      v["--glass-nav-a"]   = "0.72";
      v["--text"]          = "#1A1A1A";
      v["--text-1"]        = "#333333";
      v["--text-2"]        = "#666666";
      v["--text-3"]        = "#888888";
      v["--text-4"]        = "#AAAAAA";
      v["--text-5"]        = "#CCCCCC";
      v["--text-title"]    = "#111111";
      v["--sub"]           = "#555555";
      v["--avatar-1"]      = "#1A1A1A";
      v["--avatar-2"]      = "#455A64";
      v["--shadow-card"]   = "0 2px 8px rgba(0,0,0,0.06)";
      v["--shadow-nav"]    = "0 -2px 10px rgba(0,0,0,0.06)";
      v["--wave-fill"]     = "rgba(255,255,255,1)";
      v["--wave-body"]     = "rgba(245,245,245,0.66)";
      v["--wave-glow"]     = "rgba(0,0,0,0.05)";
      v["--icon-ink"]      = "#1A1A1A";
      v["--key-card"]        = "#1A1A1A";
      v["--key-card-strong"] = "#333333";
      v["--key-grad"]        = "linear-gradient(150deg, #1A1A1A 0%, #333333 100%)";
      v["--key-ink"]         = "#FFFFFF";
      v["--accent-h"]      = "0";
      v["--nav-active-bg"] = "linear-gradient(135deg, #1A1A1A 0%, #333333 100%)";
      v["--on-accent"]         = "#FFFFFF";
      v["--on-accent-deep"]    = "#FFFFFF";
      v["--on-accent-strong"]  = "#FFFFFF";
      return v;
    }

    if (mode === "dark") {
      var dAccL = (l >= 45) ? l : 58;          /* 暗色：主色直接沿用所选色（过暗时抬到 58%） */
      var dAccS = clamp(sat, 18, 92);
      v["--accent"]        = hsl(h, dAccS, dAccL);
 /* black 主色色相 +40° 的低饱和辅助色（#5A5A6A 配 #707080 灰紫） */
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
 /* black：暗色卡片描边 = 低亮半透明白（原深色描边在深底上不可见） */
      v["--card-border"]   = "rgba(255, 255, 255, 0.10)";
      v["--divider"]       = "rgba(255, 255, 255, 0.08)";
      v["--surface"]       = hsl(h, 12, 16.5);
      v["--surface-ghost"] = "rgba(255, 255, 255, 0.08)";
      v["--glass-nav"]     = "rgba(26, 28, 34, 0.62)";
      v["--glass-icon"]    = "rgba(255, 255, 255, 0.08)";
      v["--glass-border"]  = "rgba(255, 255, 255, 0.10)";
      v["--glass-card"]    = "rgba(255, 255, 255, 0.10)";
      v["--glass-card-border"] = "rgba(255, 255, 255, 0.16)";
      v["--glass-blur"]    = "none";
      v["--card-rgb"]      = hslTriple(h, 12, 13);
      v["--surface-rgb"]   = hslTriple(h, 12, 16.5);
      v["--glass-nav-rgb"] = "26, 28, 34";
      v["--glass-nav-a"]   = "0.62";

      v["--text"]          = hsl(h, dAccS * 0.30, 96);
      v["--text-1"]        = hsl(h, dAccS * 0.28, 91);
      v["--text-2"]        = hsl(h, dAccS * 0.26, 80);
      v["--text-3"]        = hsl(h, dAccS * 0.24, 76);
      v["--text-4"]        = hsl(h, dAccS * 0.22, 68);
      v["--text-5"]        = hsl(h, dAccS * 0.20, 57);
      v["--text-title"]    = hsl(h, dAccS * 0.30, 96);
      v["--sub"]           = hsl(h, dAccS * 0.26, 79);

      v["--avatar-1"]      = hsl(h, dAccS, dAccL - 8);
      v["--avatar-2"]      = "#2A2F39";
 v["--shadow-card"] = "0 2px 8px rgba(0, 0, 0, 0.30)"; /* 暗色 --shadow-sm */
      v["--shadow-nav"]    = "0 -2px 12px rgba(" + rgbTriple(v["--accent-strong"]) + ", 0.42)";
      v["--wave-fill"]     = "rgba(29, 31, 37, 1)";
      v["--wave-body"]     = "rgba(24, 26, 31, 0.66)";
      v["--wave-glow"]     = hsla(h, dAccS * 0.5, 34, 0.85);
    } else {
      var baseHex6 = normHex(baseHex) || DEFAULT_THEME.base;
      var accS = sat;                                   /* 明色模式：主色 = 所选色本身，不做偏移 */
      var accL = l;
      v["--accent"]        = baseHex6;
 /* 主色色相 +40° 的淡辅助色（浅蓝主色配淡紫 #D0C8E8） */
      v["--accent-2"]      = hsl(((h + 40) % 360), Math.min(accS * 0.55, 30), Math.min(accL + 6, 90));
      v["--accent-deep"]   = hsl(h, accS, accL >= 24 ? accL - 9 : Math.min(accL + 10, 92));
      v["--accent-strong"] = hsl(h, accS, accL >= 32 ? accL - 18 : Math.min(accL + 22, 84));
      v["--leaf"]          = hsl(h, accS * 0.85, Math.min(accL + 16, 88));
      v["--leaf-soft"]     = hsl(h, accS * 0.8, Math.min(accL + 24, 93));
      v["--crystal-2"]     = hsl(h, accS * 0.8, Math.min(accL + 14, 86));
      v["--crystal-3"]     = hsl(h, accS * 0.7, Math.min(accL + 20, 92));
      v["--crystal-sky"]   = hsl(h, accS * 0.9, Math.min(accL + 12, 86));

      var whiten = 0;
 /* 亮色背景 = 主色同色相浅色渐变（bg-main 近白带色相 + 三段浅调）， */
      var bgSat = Math.min(accS * 0.30, 22);
      var bgL   = 96.5;
      v["--bg"]            = hsl(h, bgSat, bgL);
      v["--bg-top"]        = hsl(h, bgSat, bgL);
      v["--bg-deep"]       = hsl(h, Math.min(accS * 0.45, 30), 94);
      v["--page-outside"]  = hsl(h, Math.min(accS * 0.40, 26), 90);
      v["--tint-1"]        = hsl(h, Math.min(accS * 0.28, 20), 97.5);
      v["--tint-2"]        = hsl(h, Math.min(accS * 0.35, 24), 93.5);
      v["--hover-bg"]      = hsla(h, Math.min(accS * 0.30, 20), 95, 0.9);

 /* 160deg 三档浅调（主色浅亮 → 近白带色相 → 浅调） */
      v["--bg-grad-1"] = hsl(h, accS, Math.min(accL + 8, 93.5));
      v["--bg-grad-2"] = hsl(h, bgSat, bgL);
      v["--bg-grad-3"] = hsl(h, Math.min(accS * 0.55, 34), 94.5);
      v["--bg-grad-4"] = hsl(h, Math.min(accS * 0.35, 24), 96.5);
        v["--bg-pattern-1"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.040)";
        v["--bg-pattern-2"] = "rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.030)";
        v["--bg-pattern-3"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.020)";
        v["--bg-pattern-4"] = "rgba(" + rgbTriple(v["--accent-strong"]) + ", 0.025)";
        v["--bg-pattern-5"] = "rgba(" + rgbTriple(v["--accent"]) + ", 0.030)";

 /* 卡片 = 50% 半透明白 + 14% 主色叠加（--card-soft-bg 同构）， */
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
      v["--glass-blur"]    = "none";
      v["--card-rgb"]      = "255, 255, 255";
      v["--surface-rgb"]   = "255, 255, 255";
      v["--glass-nav-rgb"] = "255, 255, 255";
      v["--glass-nav-a"]   = "0.70";

 /* 文字 = 主色同色相深蓝灰系（--text-dark #3A4050 → --text-lighter #B */
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
 /* 偏冷灰投影（原纯黑投影） */
 v["--shadow-card"] = "0 2px 8px rgba(160, 170, 190, 0.06)"; /* --shadow-sm */
      v["--shadow-nav"]    = "0 -2px 10px rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.16)";
 /* 波浪沿用主题色浅调（同 --bg 色相，比 bg 稍亮），保持磨砂通透 */
      v["--wave-fill"]     = hsla(h, Math.min(accS * 0.40, 26), 95.5, 1);
      v["--wave-body"]     = hsla(h, Math.min(accS * 0.40, 26), 95.5, 0.66);
      v["--wave-glow"]     = hsla(h, Math.min(accS * 0.50, 34), 78, 0.9);
    }

    /* 图标统一色 & 底栏选中底色 */
    v["--icon-ink"] = v["--accent-deep"];
    v["--key-card"]        = v["--accent-deep"];
    v["--key-card-strong"] = v["--accent-strong"];
    v["--key-grad"]        = "linear-gradient(150deg, " + v["--accent-deep"] + " 0%, " + v["--accent-strong"] + " 100%)";
    v["--key-ink"]         = "#FFFFFF";
    v["--accent-h"] = String(Math.round(((h % 360) + 360) % 360));
    if (mode === "dark") {
      v["--nav-active-bg"] = "linear-gradient(135deg, " + v["--accent"] + " 0%, " + v["--accent-strong"] + " 100%)";
    } else {
      v["--nav-active-bg"] = "linear-gradient(135deg, " +
        "rgba(" + rgbTriple(v["--accent-deep"]) + ", 0.72) 0%, " +
        "rgba(" + rgbTriple(v["--accent"]) + ", 0.55) 100%)";
    }

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

  var ZONE_KEY = "snowcrystal.zones.v1";
  var CARD_MIN = 0, CARD_MAX = 100, CARD_DEF = 50;    
  var ZONE_GROUPS = [
    { name: "主导航", zones: [
      { key: "tabbar", name: "底部导航", desc: "底栏雪花键与四键图标", cardDesc: "悬浮底栏玻璃底", ico: true, txt: false, card: true }
    ] },
    { name: "内容页", zones: [
      { key: "home", name: "首页", desc: "顶部信息区与功能列表", cardDesc: "海浪卡 · 消息卡 · 首屏其余卡片", ico: true, txt: true, card: true,
        subs: [
          { key: "home-list", name: "下方列表", cardDesc: "首页按键下的功能列表卡" },
          { key: "frame", name: "相册卡片流", cardDesc: "三格相框卡片流" }
        ] },
      { key: "wordcard", name: "字卡", desc: "字卡入口与各分组库", cardDesc: "入口列表 · 词条卡 · 面板", ico: true, txt: true, card: true },
      { key: "discover", name: "探索", desc: "探索页条目", cardDesc: "横幅 · 探索条目", ico: true, txt: true, card: true },
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
    "beautify": "settings", "data-manage": "settings",
    "top-components": "settings"
  };
  var zoneState = { ico: {}, txt: {}, card: {}, fc: {}, ic: {}, cc: {}, ca: {}, cp: {}, cpa: {}, cpt: {}, cpb: {} };
  var FONT_KEY = "global";
  var lastPalette = {};   /* applyState 写过的主题色板：字体色复位时用它还原默认 */

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
      else if (state.key === "default") { root.style.setProperty("--fc-" + it.key, SW_FONT_BLACK); }
      else { root.style.removeProperty("--fc-" + it.key); }
    });
  }

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

  
