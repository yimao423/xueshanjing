/* 雪山晶 · 43-home-haze ｜ 源：雪山晶.html L26355-L26390 ｜ JS 模块 */
/* v155 首页第一屏：深红/深橘色弥散晕染（#49281D 系）
   - 只插入 1 个 .home-haze 静态 div（z-index:-1，位于底板之上、星点/法盘/图标之下），再用 CSS 多层 radial-gradient 铺 7 斑 + 2 核心；
   - 坐标/尺寸/强度全部写死（一次性固定），无 rAF、无定时器、无动画，刷新与 resize 都不会重新随机，因此不会闪烁；
   - 仅根据底板上色判定是否浅底（inkColor 26,26,30）挂 .is-haze-light，把 --hz-a 降到 0.55，避免浅底发脏；主题切换时只同步一次 class。 */
(function(){
  var ap = document.querySelector('.page[data-page="home"] .app-pages .app-page');
  if(!ap) return;
  var phone = document.querySelector('.phone[data-page="home"]') || document.querySelector('.phone');
  var haze = ap.querySelector(':scope > .home-haze');
  if(!haze){
    haze = document.createElement('div');
    haze.className = 'home-haze';
    haze.setAttribute('aria-hidden', 'true');
    ap.insertBefore(haze, ap.firstChild);   /* 作为第一屏背景层插入，DOM 顺序最前，层级由 z-index:-1 保证 */
  }
  function syncLight(){
    var host = phone || document.body;
    var m = (getComputedStyle(host).backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    var onLight = false;
    if(m){
      var p = m[1].split(',').map(parseFloat);
      var lum = (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
      onLight = lum > 0.6;
    }
    ap.setAttribute('data-haze-ink', onLight ? '26,26,30' : '255,255,255');
    ap.classList.toggle('is-haze-light', onLight);
  }
  syncLight();
  window.addEventListener('load', syncLight);
  if(window.MutationObserver){
    try{ new MutationObserver(syncLight).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme-mode', 'class', 'style'] }); }catch(e){}
    if(phone){ try{ new MutationObserver(syncLight).observe(phone, { attributes: true, attributeFilter: ['class', 'style'] }); }catch(e){} }
  }
})();
