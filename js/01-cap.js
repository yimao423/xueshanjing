/* =========================================================
   v1：设备内存动态上限配置（全局优化模块）
   · 依据 navigator.deviceMemory 判定设备内存档位：
       tier0 = <=2GB  / tier1 = 4GB / tier2 = 8GB / tier3 = >=12GB
   · API 不可用时走 tier0（保守默认值，与原写死值一致或更低）
   · 各功能模块通过 XJ_CAP.xxx() 读取动态上限，替换原写死常量
   ========================================================= */
(function () {
  var mem = (typeof navigator !== "undefined" && navigator.deviceMemory)
    ? navigator.deviceMemory : 0;

  function tier() {
    if (!mem) { return 0; }
    if (mem <= 2) { return 0; }
    if (mem <= 4) { return 1; }
    if (mem <= 8) { return 2; }
    return 3;
  }
  var t = tier();

  /* 档位表（列含义）：
     imgMax      通用图片压缩长边（calendar IMG_MAX 原 1280）
     chatImgMax  聊天图片压缩长边（chat.js 原 1280）
     avatarMax   头像压缩长边（account AVATAR_MAX 原 200）
     bgMax       背景图压缩长边（theme-engine BG_MAX 原 1440）
     rrTplMax    弥散模板保留数（chat.js 原 12）
     customMax   自定义颜色上限（theme-engine MAX_CUSTOM 原 6）
     effectMax   特效掉落数量上限（chat.js 原 120）
     blurMax     壁纸模糊上限 px（chat.js 原 30，低档保持原收敛值）
     storeMB     数据页存储配额基准 MB（data-manager 原 5MB）
     cacheMax    媒体库内存缓存条数（原无上限） */
  var PROFILES = [
    { imgMax: 1280, chatImgMax: 1280, avatarMax: 200, bgMax: 1440, rrTplMax: 12, customMax: 6, effectMax: 80,  blurMax: 30, storeMB: 5,  cacheMax: 40 },
    { imgMax: 1600, chatImgMax: 1600, avatarMax: 240, bgMax: 1600, rrTplMax: 16, customMax: 8, effectMax: 120, blurMax: 40, storeMB: 8,  cacheMax: 80 },
    { imgMax: 1920, chatImgMax: 1920, avatarMax: 280, bgMax: 1920, rrTplMax: 20, customMax: 10, effectMax: 160, blurMax: 50, storeMB: 10, cacheMax: 120 },
    { imgMax: 2240, chatImgMax: 2240, avatarMax: 320, bgMax: 2240, rrTplMax: 24, customMax: 12, effectMax: 200, blurMax: 60, storeMB: 12, cacheMax: 160 }
  ];
  var P = PROFILES[t];

  window.XJ_CAP = {
    memGB: mem,
    tier: t,
    imgMax: function () { return P.imgMax; },
    chatImgMax: function () { return P.chatImgMax; },
    avatarMax: function () { return P.avatarMax; },
    bgMax: function () { return P.bgMax; },
    rrTplMax: function () { return P.rrTplMax; },
    customMax: function () { return P.customMax; },
    effectMax: function () { return P.effectMax; },
    blurMax: function () { return P.blurMax; },
    storeMB: function () { return P.storeMB; },
    cacheMax: function () { return P.cacheMax; }
  };
})();

