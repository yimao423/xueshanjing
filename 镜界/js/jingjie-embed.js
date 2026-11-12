/* ============================================================================
 * 镜界嵌入桥接（镜界侧）
 * 检测是否被 iframe 嵌入（window.self !== window.top）
 * 嵌入时套用拾心界皮肤与紧凑布局；返回能力由 backToShixinjie() 提供
 * （postMessage 通知父级 + 父级 __shxjBackJingJie__ 兜底）
 * [2026-11-12] 首页左上角「返回拾心界」按钮已删除，返回统一由宿主顶栏承担
 * ==========================================================================*/
(function () {
  'use strict';

  var BTN_ID = 'btn-back-shxj';
  var btnNode = null;

  function getButton() {
    if (btnNode && document.body && document.body.contains(btnNode)) return btnNode;
    btnNode = document.getElementById(BTN_ID);
    return btnNode;
  }

  function isEmbedded() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return false;
    }
  }

  function backToShixinjie() {
    // 主通道：postMessage 通知父窗口
    try {
      if (window.parent) {
        window.parent.postMessage({ type: 'back-to-shixinjie' }, '*');
      }
    } catch (e) { /* 忽略 */ }

    // 兜底：父级暴露的全局回退函数
    try {
      var p = (typeof window.parent !== 'undefined' && window.parent) ? window.parent : (window.top || null);
      if (p && typeof p['__shxjBackJingJie__'] === 'function') {
        p['__shxjBackJingJie__']();
      }
    } catch (e) { /* 忽略 */ }
  }

  // 嵌入态整体布局优化（仅被拾心界嵌入时生效）：
  // 1) 返回按钮改为左上角小圆形箭头钮，与镜界内部返回钮风格统一、不突兀；
  // 2) 首页首屏顶部空白压缩，让「今日卦运」等内容上移；
  // 3) 牌意/设置等各页面顶栏顶部空白统一压缩，整体更和谐。
  function applyCompactLayout() {
    // [2026-11-12] 首页左上角返回按钮已删除（返回统一由宿主顶栏承担），此处仅保留布局压缩
    var header = document.querySelector('#page-home .pt-12');
    if (header) {
      header.style.position = 'relative';
      header.style.paddingTop = '24px';
      header.style.paddingBottom = '6px';
    }

    // —— 首页首屏模块间距收紧 ——
    var fortune = document.querySelector('#page-home > .px-5.mt-4');
    if (fortune) fortune.style.marginTop = '14px';

    // —— 统一压缩各页面顶栏顶部空白（牌意/设置/我的牌组等 pt-8 顶栏）——
    var headers = document.querySelectorAll('#app .page > .px-5.pt-8');
    for (var i = 0; i < headers.length; i++) {
      headers[i].style.paddingTop = '6px';
      headers[i].style.paddingBottom = '4px';
    }
  }

  // 嵌入态「拾心界皮肤」（仅被拾心界嵌入时生效）：
  // 1) 除欢迎页（#splash-screen 有独立 .splash-bg 背景）外，整个界面背景改为与镜界欢迎页
  //    同款的渐变（--theme-bg-splash，跟随当前主题），并隐藏自带径向光斑，视觉更显层次；
  // 2) 背景改为「独立 position:fixed 背景层」承载渐变（替代 background-attachment:fixed）：
  //    背景层固定铺满视口、静止不动，滚动时由 GPU 合成平移即可，避免安卓 WebView 对
  //    fixed 背景逐帧重绘导致的卡顿，且随主题 CSS 变量自动联动，视觉与原方案完全一致；
  // 3) 各区域顶栏 / 底栏遵循拾心界主界面的沉浸式规则：顶栏透明融于背景、去掉下描边与硬阴影，
  //    底栏改为与背景层同源（--theme-bg-splash）的「不透明渐变实底」（background-attachment:fixed 
  //    与 fixed 背景层像素级重合），去掉毛玻璃 / 半透明 / 透明露出方案，滚动时内容不透出融合、边界清晰；
  // 4) 功能卡片 / 面板统一去掉描边。
  // 所有覆盖仅在嵌入态注入，独立打开镜界时保持原有玻璃拟态风格。
  function applyShixinjieSkin() {
    if (document.getElementById('shxj-skin-style')) return;
    // 背景直接用欢迎页渐变变量，随主题自动联动
    var splashGradient = 'var(--theme-bg-splash)';

    // 独立固定背景层：以 position:fixed 图层替代 background-attachment:fixed，
    // 滚动时背景静止（GPU 合成平移），避免移动端 fixed 背景逐帧重绘；
    // z-index:-1 置于所有内容之下，body 设为透明后即可露出，视觉与「渐变 fixed」一致。
    if (!document.getElementById('shxj-bg-layer')) {
      var bgLayer = document.createElement('div');
      bgLayer.id = 'shxj-bg-layer';
      bgLayer.setAttribute('aria-hidden', 'true');
      bgLayer.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;' +
        'background:' + splashGradient + ';';
      document.body.appendChild(bgLayer);
    }

    var style = document.createElement('style');
    style.id = 'shxj-skin-style';
    style.textContent =
      '/* ===== 嵌入态拾心界皮肤：背景 / 顶底栏沉浸 / 去描边 ===== */' +
      /* html 兜底铺满同款渐变（背景层加载前不闪白）；body 透明露出下方固定背景层 */
      'html {' +
      '  background: ' + splashGradient + ';' +
      '}' +
      'body { background: transparent !important; }' +
      '.bg-pattern { background-image: none !important; }' +
      /* 页面容器去掉自带纯色底（bg-bg-main），避免浅色底板盖住渐变造成颜色分层 */
      '.bg-bg-main { background-color: transparent !important; }' +
      /* 各区域顶栏：与背景层同源（--theme-bg-splash）的【不透明渐变实底】，对齐底栏 .nav-bottom 方案。
         background-attachment:fixed 使顶栏渐变与 fixed 背景层在视口坐标系像素级重合，沉浸无缝；
         实底不透明 + 无 backdrop-filter / 无半透明，无描边无阴影，仅靠实底渐变自然分界；
         纯色主题（纯白 --theme-bg-splash:#ffffff）时由 background-color 承接同源实底。 */
      '.page-header-solid, .divine-top-bar, .deck-detail-header {' +
      '  background-color: var(--theme-bg-splash) !important;' +
      '  background-image: var(--theme-bg-splash) !important;' +
      '  background-attachment: fixed !important;' +
      '  background-repeat: no-repeat !important;' +
      '  -webkit-backdrop-filter: none !important;' +
      '  backdrop-filter: none !important;' +
      '  box-shadow: none !important;' +
      '}' +
      /* 标题行/小头部（今日卦运标题行、占卜结果头部、记录项头部）：
         不铺渐变背景，保持透明融入所在卡片，去掉加深横向色带 */
      '.daily-fortune-header, .rd-header, .divine-record-header {' +
      '  background: transparent !important;' +
      '  -webkit-backdrop-filter: none !important;' +
      '  backdrop-filter: none !important;' +
      '  border-bottom: none !important;' +
      '  box-shadow: none !important;' +
      '}' +
      /* 底栏：与背景层同源（--theme-bg-splash）的【不透明渐变实底】，对齐拾心界 .bottom-nav。
         background-attachment:fixed 使底栏渐变与 fixed 背景层在视口坐标系像素级重合，滚动无缝；
         实底不透明 + 无 backdrop-filter / 无半透明，滚动内容不透出融合，边界清晰独立渐变带；
         去上描边、去阴影，仅靠实底渐变自然分界。 */
      '.nav-bottom {' +
      '  border-top: none !important;' +
      '  background-color: var(--theme-bg-splash) !important;' +
      '  background-image: var(--theme-bg-splash) !important;' +
      '  background-attachment: fixed !important;' +
      '  background-repeat: no-repeat !important;' +
      '  -webkit-backdrop-filter: none !important;' +
      '  backdrop-filter: none !important;' +
      '  box-shadow: none !important;' +
      '}' +
      /* 功能卡片 / 面板：去掉描边 */
      '.glass-card, .glass-section, .divine-config-panel,' +
      '.random-divine-panel, .divine-record-item, .spread-detail-section {' +
      '  border: none !important;' +
      '}' +
      /* 首页「最近占卜记录」列表项：去掉浅灰玻璃条底与阴影，纯文字融入渐变背景
         （只在首页生效，不影响占卜记录详情页的条目卡片） */
      '#page-home .divine-record-item {' +
      '  background: transparent !important;' +
      '  -webkit-backdrop-filter: none !important;' +
      '  backdrop-filter: none !important;' +
      '  box-shadow: none !important;' +
      '  padding: 10px 2px;' +
      '}' +
      '#page-home .divine-record-item:hover {' +
      '  background: rgba(255,255,255,0.16) !important;' +
      '  box-shadow: none !important;' +
      '  transform: none !important;' +
      '}' +
      /* 创建牌组/创建牌阵底部的「确认创建」按钮：贴近宿主底栏上方（比原先 7.5rem 更贴边），
         避免与 nav 视觉相连；对应表单底部留白同步加大，防止内容被悬浮按钮遮挡 */
      '#page-create > .fixed.bottom-20,' +
      '#page-create-spread > .fixed.bottom-20 {' +
      '  bottom: 6rem !important;' +
      '}' +
      '#page-create > .px-5.mt-2.pb-20,' +
      '#page-create-spread > .px-5.mt-2.pb-20 {' +
      '  padding-bottom: 10rem !important;' +
      '}';

    document.head.appendChild(style);
  }

  function init() {
    // [2026-11-12] 已删除首页左上角「返回拾心界」按钮，init 不再依赖按钮存在；
    // 返回能力保留在窗口暴露的 backToShixinjie()（供 postMessage / 宿主兜底调用）。
    if (!isEmbedded()) return;
    applyCompactLayout();
    applyShixinjieSkin();
  }

  window.backToShixinjie = backToShixinjie;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
