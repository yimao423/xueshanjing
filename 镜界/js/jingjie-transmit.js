/* ============================================================
 * jingjie-transmit.js —— 次元镜界传讯 · 镜界侧 RPC 桥接（重做版 2026-09-15）
 *
 * 职责：作为隐藏 iframe 被拾心界宿主页加载，通过 postMessage 跨文档
 *       提供「次元镜界传讯」所需的抽牌 RPC，不依赖任何 CDN 资源：
 *
 *   请求（宿主 → 镜界）  { mtx: { op, id, payload } }
 *   响应（镜界 → 宿主）  { mtx: { id, ok, result } }
 *
 *   op 列表：
 *     ping        就绪探测（hook 注册监听即视为就绪，与 CDN/load 无关）
 *     listDecks   列出真实存在的牌组（仅返回 deckListData 中的数据）
 *     listSpreads 列出牌阵
 *     draw        按牌组抽 N 张，渲染为 PNG dataURL（含正逆 / 牌阵位 / 牌名）
 *
 * 本文件只做桥接与卡面渲染，牌组数据 / 洗牌 / 渐变取色全部复用镜界
 * 站点正常功能（data.js / core.js / divination.js），不重复实现。
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 基础工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- RPC 响应（双通道兜底：ev.source 优先，parent 其次） ---------- */
  function respond(evSource, id, ok, result) {
    var msg = { mtx: { id: id, ok: ok, result: result } };
    try {
      if (evSource && evSource.postMessage) { evSource.postMessage(msg, '*'); return; }
    } catch (e) { /* 落到 parent 兜底 */ }
    try {
      if (window.parent && window.parent.postMessage) window.parent.postMessage(msg, '*');
    } catch (e2) { /* 双方均不可达则放弃（宿主有超时兜底） */ }
  }

  /* ---------- 元数据 ----------
   * 只返回镜界 deckListData 中真实存在的牌组（iching / lenormand / custom_ 前缀等）。
   * 镜界并无 'tarot' 内置牌组，绝不硬编码或兜底虚构牌组，避免传讯侧出现抽不到牌的选项。 */
  function listDecks() {
    var out = [];
    if (typeof deckListData === 'undefined' || !Array.isArray(deckListData)) return out;
    deckListData.forEach(function (d) {
      if (!d || !d.id || d.id === 'tarot') return;
      out.push({ id: d.id, name: d.name || d.id, nameEn: d.nameEn || '', type: d.type || '' });
    });
    return out;
  }

  function listSpreads() {
    var out = [];
    if (typeof spreadListData === 'undefined' || !Array.isArray(spreadListData)) return out;
    spreadListData.forEach(function (s) {
      if (!s || !s.id) return;
      out.push({
        id: s.id, name: s.name || s.id, nameEn: s.nameEn || '',
        cardCount: s.cardCount || 0,
        positions: (s.positions || []).map(function (p) { return (p && p.name) || p || ''; })
      });
    });
    return out;
  }

  /* ---------- 抽牌 ---------- */
  function drawCards(p) {
    var deckId = p.deckId;
    var count = Math.max(1, p.count || 1);
    var reversedEnabled = p.reversedEnabled !== false;
    var positions = p.positions || [];

    if (typeof getDeckCards !== 'function') return Promise.reject(new Error('镜界抽牌模块未就绪'));
    var cards = getDeckCards(deckId);
    if (!cards || !cards.length) return Promise.reject(new Error('该牌组暂无可用牌'));

    // 洗牌阶段一次性确定整副朝向（统一入口 buildShuffledDeck，默认逆位率 35%）；抽牌阶段不再掷币
    var built = (typeof buildShuffledDeck === 'function')
      ? buildShuffledDeck(deckId, { reversedEnabled: reversedEnabled })
      : { cards: ((typeof fisherYatesShuffle === 'function') ? fisherYatesShuffle(cards.slice()) : cards.slice()), orientations: [] };
    var shuffled = built.cards;
    var n = Math.min(count, shuffled.length);

    // 牌组名统一从 deckListData 取真实值
    var deckName = deckId;
    try {
      var dd = (typeof deckListData !== 'undefined' && deckListData.find)
        ? deckListData.find(function (x) { return x && x.id === deckId; }) : null;
      deckName = dd && dd.name ? dd.name : deckId;
    } catch (e) { /* 保持 deckId 兜底 */ }

    var jobs = [];
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var card = shuffled[idx];
        var reversed = reversedEnabled ? !!built.orientations[idx] : false;
        var pos = positions[idx] || '';
        jobs.push(renderCardPNG(card, reversed).then(function (dataURL) {
          return {
            name: card.name || card.nameEn || '',
            nameEn: card.nameEn || card.judgment || '',
            reversed: reversed,
            position: pos,
            deckName: deckName,
            deckType: card._deckType || '',
            image: dataURL
          };
        }));
      })(i);
    }
    return Promise.all(jobs);
  }

  /* ---------- 卡面渲染（与镜界占卜页视觉一致） ---------- */

  // 渐变取色：复用镜界 getCardGradient，取首尾两个色值
  function gradientColors(card) {
    var g = '';
    try {
      var deckId = card._deckType === 'iching' ? 'iching'
        : (card._deckType === 'lenormand' ? 'lenormand' : null);
      g = getCardGradient(card.isMajor, card.suitName, deckId, card.cardIndex);
    } catch (e) { g = ''; }
    var m = String(g).match(/#[0-9a-fA-F]{3,6}/g) || [];
    if (m.length >= 2) return [m[0], m[1]];
    if (m.length === 1) return [m[0], m[0]];
    return ['#7A6C9E', '#5A4C7E'];
  }

  // 卡面图标：优先按牌组类型取对应 SVG
  function svgIconFor(card) {
    var dt = card._deckType;
    try {
      if (dt === 'lenormand' && typeof getLenormandSVG === 'function') return getLenormandSVG(card.cardIndex) || '';
      if (dt === 'iching' && typeof getCardSVG === 'function') {
        var ic = getCardSVG(card.cardIndex, card.suitName, card.isMajor, 'iching') || '';
        // 爻线补白描边，避免黑色爻线在深色渐变底上不可见
        return ic.replace(/<line /g, '<line stroke="rgba(255,255,255,0.95)" ');
      }
      if (typeof getCardSVG === 'function') return getCardSVG(card.cardIndex, card.suitName, card.isMajor, 'tarot') || '';
    } catch (e) { /* 无图标时返回空 */ }
    return '';
  }

  // 矢量卡面：渐变全底(无白外框) + 左上编号 + 居中图标 + 分隔线 + 中文名 + 英文名
  function buildVectorCardSVG(card) {
    var W = 480, H = 672, cx = W / 2;
    var cols = gradientColors(card);
    var num = card.tarotNumber || (card.cardIndex !== undefined ? String(card.cardIndex + 1) : '');
    var name = card.name || '';
    var nameEn = card.nameEn || card.judgment || '';
    var icon = svgIconFor(card);
    // 周易牌组专用微调：文字放大 2 号并上移 2px，其他牌组保持原样
    var isIching = card._deckType === 'iching';
    var numFs = isIching ? 38 : 36, numY = isIching ? 52 : 54;
    var nameFs = isIching ? 54 : 52, nameY = isIching ? 514 : 516;
    var subFs = isIching ? 34 : 32, subY = isIching ? 572 : 574;

    var inner = '', vb = '0 0 100 100';
    if (icon) {
      var m = icon.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
      if (m && m[1]) inner = m[1];
      var mv = icon.match(/viewBox="([^"]+)"/i);
      if (mv) vb = mv[1];
    }
    var iconSize = 190, iconX = (W - iconSize) / 2, iconY = 208;
    var iconEl = inner
      ? '<svg x="' + iconX + '" y="' + iconY + '" width="' + iconSize + '" height="' + iconSize
        + '" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">' + inner + '</svg>'
      : '';

    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">');
    parts.push('<defs><linearGradient id="mtxbg" x1="0" y1="0" x2="0" y2="1">');
    parts.push('<stop offset="0" stop-color="' + cols[0] + '"/><stop offset="1" stop-color="' + cols[1] + '"/></linearGradient></defs>');
    parts.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="30" fill="url(#mtxbg)"/>');
    if (num) parts.push('<text x="36" y="54" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="36" font-weight="600" fill="rgba(255,255,255,0.9)" opacity="0.55" font-variant-numeric="tabular-nums">' + esc(num) + '</text>');
    parts.push(iconEl);
    parts.push('<line x1="' + (cx - 42) + '" y1="452" x2="' + (cx + 42) + '" y2="452" stroke="rgba(255,255,255,0.3)" stroke-width="5" stroke-linecap="round"/>');
    if (name) parts.push('<text x="' + cx + '" y="' + nameY + '" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="' + nameFs + '" font-weight="600" fill="rgba(255,255,255,0.97)">' + esc(name) + '</text>');
    if (nameEn) parts.push('<text x="' + cx + '" y="' + subY + '" text-anchor="middle" font-family="Georgia, serif" font-size="' + subFs + '" letter-spacing="1.2" fill="rgba(255,255,255,0.55)">' + esc(nameEn) + '</text>');
    parts.push('</svg>');
    return parts.join('');
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 图片型自定义牌：透明底 + 原图 contain（保留透明 PNG 与 reversed 旋转）。
  // 不填充浅灰底（#f1f5f9），四周留白为透明，由聊天区背景自然透出，避免"画中画"底框。
  function renderImageCard(card, reversed) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var W = 300, H = 420;
          var c = document.createElement('canvas');
          c.width = W; c.height = H;
          var ctx = c.getContext('2d');
          if (reversed) { ctx.translate(W, H); ctx.rotate(Math.PI); }
          roundRectPath(ctx, 0, 0, W, H, 14);
          ctx.save();
          ctx.clip();
          var iw = img.naturalWidth || img.width || W;
          var ih = img.naturalHeight || img.height || H;
          var scale = Math.min(W / iw, H / ih);
          var dw = iw * scale, dh = ih * scale;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          ctx.restore();
          resolve(c.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('自定义卡图加载失败')); };
      img.src = card.imageData;
    });
  }

  // SVG 栅格化：无白底直绘（内置牌组渐变全底，与占卜页一致）
  function rasterize(svgUrl, w, h, reversed) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var ctx = c.getContext('2d');
          if (reversed) { ctx.translate(w, h); ctx.rotate(Math.PI); }
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = svgUrl;
    });
  }

  // 兜底占位牌面（正常情况不应出现）
  function makePlainPNG(reversed) {
    var W = 300, H = 420;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    if (reversed) { ctx.translate(W, H); ctx.rotate(Math.PI); }
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#7A6C9E');
    g.addColorStop(1, '#5A4C7E');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 26px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('牌', W / 2, H / 2);
    return c.toDataURL('image/png');
  }

  function renderCardPNG(card, reversed) {
    if (card._deckType === 'custom' && card.imageData) {
      return renderImageCard(card, reversed);
    }
    var svg = buildVectorCardSVG(card);
    var url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    return rasterize(url, 480, 672, reversed).catch(function () {
      return makePlainPNG(reversed);
    });
  }

  /* ---------- 消息监听（本文件即插即用，不依赖 load / DOMContentLoaded） ---------- */
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || !d.mtx) return;
    var req = d.mtx;
    var id = req.id;
    if (!id) return;
    var source = ev.source;

    try {
      if (req.op === 'ping') { respond(source, id, true, { name: 'mtx-echo' }); return; }
      if (req.op === 'listDecks') { respond(source, id, true, listDecks()); return; }
      if (req.op === 'listSpreads') { respond(source, id, true, listSpreads()); return; }
      if (req.op === 'draw') {
        drawCards(req.payload || {}).then(
          function (cards) { respond(source, id, true, cards); },
          function (err) { respond(source, id, false, String((err && err.message) || err)); }
        );
        return;
      }
      respond(source, id, false, 'unknown op: ' + req.op);
    } catch (e) {
      respond(source, id, false, String((e && e.message) || e));
    }
  });
})();
