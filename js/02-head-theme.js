/* 雪山晶 · 02-head-theme ｜ 源：雪山晶.html L3235-L3632 ｜ JS 模块 */
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

/* 首帧主题引导（00b-theme-core.js 尾部） */
function __xjThemeBoot(root) {
  try {
    var saved = null;
    try { var raw = window.localStorage.getItem(STORE_KEY); if (raw) { saved = JSON.parse(raw); } } catch (e) { saved = null; }
    var st = {
      key: DEFAULT_THEME.key,
      name: DEFAULT_THEME.name,
      base: DEFAULT_THEME.base,
      mode: DEFAULT_THEME.mode,
      };
    if (saved && typeof saved === "object") {
      var wantKey = typeof saved.key === "string" ? saved.key : "";
      var matched = null;
      for (var ti = 0; ti < THEMES.length; ti++) {
        if (THEMES[ti].key === wantKey) { matched = THEMES[ti]; break; }
      }
      if (matched) { st.key = matched.key; st.name = matched.name; st.base = matched.base; st.mode = matched.mode; }
      if (matched && typeof saved.base === "string" && saved.base) {
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
    /* [V30] 默认阳（浅色）；仅当存过 yin 才切深色；存储缺失时看 cookie 镜像 */
    var pol = "yang";
    if (saved && saved.polarity === "yin") { pol = "yin"; }
    else if (!saved || (saved.polarity !== "yang" && saved.polarity !== "yin")) {
      try {
        var ck4 = document.cookie ? String(document.cookie).match(/(?:^|;\s*)xj_theme_pol=(yang|yin)/) : null;
        if (ck4 && ck4[1] === "yin") { pol = "yin"; }
      } catch (eCk4) { /* 忽略 */ }
    }
    root.setAttribute("data-polarity", pol);
    root.style.setProperty("--xj-home-bg", pol === "yang" ? "#FFFFFF" : "#252525");
  } catch (e) {
    /* 首帧恢复失败：CSS 兜底变量继续生效，不阻塞渲染 */
  }
}

  (function () {
    if (window.__xjThemeBoot) {
      try { window.__xjThemeBoot(document.documentElement); } catch (e) { /* 走 CSS 兜底 */ }
    }
  })();
