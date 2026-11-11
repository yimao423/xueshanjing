---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 9fbe45044c8469ef0a783d48f4969eea_2117bd01ddbe11f19232525400248c00
    ReservedCode1: ie4Rtxv3MOYmYx291WexMkdjgIXq6nE9R5sD+we+ByvwiuN4SCqrK7KoHh0IzPcwc9cutTiDNac5m9ucBdnJd2PEV6aAJujPtFwaY91rk5fPiDeqKQCigmRDKUooMhTp9Umhg4Q7zSlaAMR2cwK6a2lLBvlJK7VLCDez6kFHD9F+ItE5tbrzLTuMNoo=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 9fbe45044c8469ef0a783d48f4969eea_2117bd01ddbe11f19232525400248c00
    ReservedCode2: ie4Rtxv3MOYmYx291WexMkdjgIXq6nE9R5sD+we+ByvwiuN4SCqrK7KoHh0IzPcwc9cutTiDNac5m9ucBdnJd2PEV6aAJujPtFwaY91rk5fPiDeqKQCigmRDKUooMhTp9Umhg4Q7zSlaAMR2cwK6a2lLBvlJK7VLCDez6kFHD9F+ItE5tbrzLTuMNoo=
---

# 雪山晶 · 模块化项目

由单文件 `雪山晶.html`（36437 行 / 2.10 MB，内嵌 42 个 `<style>` + 16 个 `<script>`）拆分而来。

## 拆分原则

1. **零改写**：所有模块内容与原文件对应片段逐字节相同（仅追加一行来源注释），不做重排、合并、美化。
2. **顺序即语义**：`index.html` 中 `<link>` / `<script>` 的出现顺序与原文件中 style / script 块的出现顺序完全一致 —— CSS 级联覆盖顺序、JS 执行时序因此不变。
3. **安全切点**：主样式块按"花括号自平衡的行"切分；主脚本块按 ES 语法树顶层语句边界切分（前置注释归入后一段）。
4. **可回滚**：原单文件未做任何修改，随时可对照或退回。

## 目录结构

```
雪山晶/
├── index.html      # 页面结构 + 83 条模块引用（按原序）
├── css/            # 31 个样式模块
└── js/             # 52 个脚本模块
```

## 模块清单

| 类型 | 文件 | 源行范围 | 体积 | 主要内容 |
|---|---|---|---|---|
| js | `01-theme-boot.js` | 7–66 | 3 KB | IIFE |
| css | `01-firstpaint.css` | 68–75 | 0 KB | - |
| css | `02-base.css` | 78–450 | 38 KB | :root、.cover-title |
| css | `03-shell-chat.css` | 450–1350 | 126 KB | .ms-row、to |
| css | `04-theme-settings.css` | 1350–1950 | 90 KB | .zone-panel .zone-group:first-child、.zone-row |
| css | `05-chat-home-skin.css` | 1950–2700 | 115 KB | html body .page[data-page="home"] .fn-title、50% |
| css | `06-misc-dark.css` | 2700–2900 | 42 KB | [data-theme-mode="dark"] .echo-cal-cell.is-out |
| css | `07-home-moon.css` | 2900–3234 | 54 KB | .phone[data-page="home"] .page、to |
| js | `02-head-theme.js` | 3235–3632 | 18 KB | STORE_KEY、DEFAULT_THEME、THEMES、state |
| css | `08-ui-backbtn-autoreply.css` | 3634–3796 | 14 KB | - |
| js | `03-viewport-fit.js` | 5355–5448 | 3 KB | IIFE |
| js | `04-storage.js` | 5448–6228 | 37 KB | IIFE |
| js | `05-nav.js` | 6228–6526 | 12 KB | placeholder、NAV_PARENT、HOME_SIZE_KEY、homeSizeState |
| js | `06-metric.js` | 6526–6697 | 7 KB | METRIC_TIMES_KEY、METRIC_TIMES_DEFAULT、metricTimes、metricSeconds |
| js | `07-theme-core.js` | 6697–7259 | 27 KB | STORE_KEY、DEFAULT_THEME、THEMES、state |
| js | `08-theme-zones.js` | 7259–7716 | 23 KB | zoneEach、zoneEachSub、zoneLoad、zoneSave |
| js | `09-theme-scale.js` | 7716–7866 | 7 KB | UI_BASE_W、UI_EXTRA、updateUiScale、UI_NONHOME |
| js | `10-theme-panels.js` | 7866–8231 | 14 KB | POPUP_KEY、POPUP_A_DEFAULT、POPUP_TEXT_DEFAULT、POPUP_TEXT_DARK_DEFAULT |
| js | `11-theme-store.js` | 8231–8403 | 7 KB | resizeTimer、bindGlobalResize、resolveKey、loadState |
| js | `12-home-comps.js` | 8403–8640 | 13 KB | COMP_KEY、HOME_COMPS、homeComp、compLoad |
| js | `13-home-widgets.js` | 8640–8870 | 9 KB | TK_KEY、tkGet、tkSet、tkTries |
| js | `14-top-comps.js` | 8870–9117 | 11 KB | TOP_COMP_KEY、TOP_LINK_DEFAULT、topState、topLoad |
| js | `15-quote-calendar.js` | 9117–9416 | 12 KB | QUOTES、HOME_QUOTE_KEY、homeQuoteCustom、saveHomeQuote |
| js | `16-image-upload.js` | 9416–9512 | 4 KB | IMG_STORE、pendingEl、pendingSlot、applyImage |
| js | `17-name-calendar.js` | 9512–9840 | 13 KB | NAME_STORE、NAME_TIP、applyName、restoreNames |
| js | `18-data-manage.js` | 9840–10161 | 16 KB | DM_PREFIXES、dmOwnKey、dmKeys、dmFmt |
| js | `19-wordcard-data.js` | 10161–10284 | 17 KB | WCL_KEY、WC_OLD_KEY、WCL_DEFAULT、LIB_META |
| js | `20-wordcard-media.js` | 10284–10522 | 10 KB | MEDIA_DB、MEDIA_STORE、MEDIA_CACHE、MEDIA_KEY_RE |
| js | `21-wordcard-ui.js` | 10522–10734 | 9 KB | esc、wcToastTimer、wcToast、wcCopy |
| js | `22-voice.js` | 10734–11502 | 35 KB | SUB_KEY_WC、wcExtCount、fmtVoiceDur、SOUND_DB |
| js | `23-wordcard-lib.js` | 11502–12597 | 55 KB | WC_ICO_ADD、WC_ICO_IMPORT、WC_ICO_EXPORT、WC_ICO_DEDUP |
| js | `24-wordcard-bind.js` | 12597–12862 | 12 KB | bindWordcard |
| js | `25-init-api.js` | 12862–12978 | 3 KB | init |
| js | `26-account.js` | 12978–13778 | 34 KB | IIFE |
| js | `27-chat-core.js` | 13778–20922 | 351 KB | IIFE |
| js | `28-chat-settings.js` | 20922–21919 | 41 KB | IIFE |
| js | `29-chat-extras.js` | 21919–22065 | 6 KB | IIFE |
| js | `30-chat-data.js` | 22065–22562 | 24 KB | IIFE |
| js | `31-shop.js` | 22562–23156 | 25 KB | IIFE |
| js | `32-shop-page.js` | 23156–23218 | 2 KB | IIFE |
| js | `33-chat-bg-sticker.js` | 23218–23444 | 11 KB | IIFE |
| js | `34-echo.js` | 23444–23621 | 8 KB | IIFE |
| js | `35-nav-multimode.js` | 23621–23789 | 6 KB | IIFE |
| js | `36-home-extras.js` | 23789–23959 | 7 KB | IIFE |
| js | `37-dial-avatar.js` | 23959–24158 | 7 KB | IIFE |
| js | `38-moon.js` | 24158–25115 | 42 KB | IIFE |
| js | `39-dial.js` | 25115–25305 | 10 KB | DIAL_TIME_KEY、DIAL_DAY_SEC、DIAL_HALF_SEC、DIAL_HOUR_NUM |
| css | `09-home-mobius-star.css` | 25383–25390 | 1 KB | html body .page[data-page="home"] .app-pages .app-page .mobius-star |
| js | `40-home-mobius.js` | 25391–25548 | 7 KB | IIFE |
| css | `10-home-star-keyframes.css` | 25551–25572 | 2 KB | 32%、58% |
| css | `11-chat-fwd-card.css` | 25584–25652 | 4 KB | - |
| js | `41-home-stars-canvas.js` | 25654–25917 | 11 KB | IIFE |
| css | `12-home-planet-stars.css` | 25926–25957 | 2 KB | html body .page[data-page="home"] .app-pages .app-page .planet-node |
| js | `42-home-star-field.js` | 25958–26325 | 18 KB | IIFE |
| css | `13-home-haze-a.css` | 26335–26353 | 3 KB | html body .page[data-page="home"] .app-pages .app-page .home-haze |
| js | `43-home-haze.js` | 26355–26390 | 2 KB | IIFE |
| css | `14-home-haze-b.css` | 26402–26414 | 2 KB | html body .page[data-page="home"] .app-pages .app-page .home-gold、30% |
| js | `44-home-gold-dust.js` | 26416–26789 | 14 KB | IIFE |
| css | `15-home-star-nav.css` | 26803–26815 | 1 KB | html body .page[data-page="home"] .app-pages .app-page .planet-node、40 |
| js | `45-home-star-nav.js` | 26817–26989 | 7 KB | IIFE |
| css | `16-dark-theme.css` | 26991–28026 | 48 KB | - |
| css | `17-wallpaper.css` | 28030–28347 | 20 KB | - |
| css | `18-viewport-fit.css` | 28359–28428 | 3 KB | - |
| js | `46-viewport-fit-patch.js` | 28429–28514 | 4 KB | IIFE |
| css | `19-color-fix.css` | 28526–28623 | 5 KB | - |
| css | `20-moon.css` | 28634–28852 | 10 KB | - |
| css | `21-ui-v7-v8.css` | 28855–28962 | 6 KB | - |
| js | `47-barinfo.js` | 28964–29031 | 3 KB | IIFE |
| css | `22-ui-v11-v15.css` | 29034–29162 | 6 KB | - |
| css | `23-letter-v16.css` | 29166–29904 | 41 KB | - |
| js | `48-letter-v16.js` | 30112–32234 | 111 KB | IIFE |
| css | `24-rainsee-compat.css` | 32239–32383 | 10 KB | - |
| js | `49-rainsee-compat.js` | 32384–32421 | 2 KB | IIFE |
| css | `25-letter-v17.css` | 32426–32942 | 37 KB | - |
| js | `50-letter-v17.js` | 32944–34237 | 67 KB | IIFE |
| css | `26-letter-ui-suite.css` | 34240–35454 | 78 KB | 50%,100% |
| css | `27-letter-settings.css` | 35457–35581 | 9 KB | - |
| css | `28-final-ui.css` | 35582–36097 | 27 KB | - |
| js | `51-letter-esc.js` | 36099–36117 | 1 KB | IIFE |
| css | `29-letter-ui-2.css` | 36120–36246 | 12 KB | - |
| js | `52-thermal-guard.js` | 36248–36293 | 2 KB | IIFE |
| css | `30-flat-cards.css` | 36295–36329 | 2 KB | - |
| css | `31-popup-solid.css` | 36330–36434 | 12 KB | - |
## 开发约定

- **不要调整 `index.html` 中引用的先后顺序**。多个模块是对前序模块的样式/行为覆盖（如 `26-letter-ui-suite.css` 覆盖 `22-letter-v16.css`），顺序变化会直接改变界面。
- **新增功能请新建模块**并按需插到合适位置：样式追加到需要覆盖的目标之后，脚本追加到依赖对象的定义之后。
- 全局对象 `window.SnowCrystal`（203 个成员）是模块间的主要通信面，聊天、字卡、账号、月亮、表盘等能力都挂在其上。
- 单个模块内的行号不再对应原文件，定位原实现请用模块头部的 `源：雪山晶.html L起-L止` 注释。
- 部分 CSS 段（如 `02-base.css`、`03-shell-chat.css`）内部存在"一行多规则"与历史覆盖块，属于原文件既有写法，未做整理。

## 校验记录（拆分后执行）

| 项目 | 结果 |
|---|---|
| 内联 `<style>` / `<script>` 残留 | 0 |
| 模块引用缺失 / 重复 | 0 / 0 |
| 引用顺序与原文块顺序 | 一致 |
| 内容可逆（CSS 31 / JS 52 逐文件比对） | 全部一致 |
| JS 语法解析（esprima 严格模式） | 52/52 通过 |
| CSS 花括号计数与原片段 | 31/31 一致 |
| Chromium 首屏渲染（430×932，控件树 / 尺寸 / 主题变量） | 与原版一致，像素差 1.41% ≈ 同文件两次加载的噪声基线 1.39% |
| 38 个页面逐页切换（class / 宽高 / display / 可见元素 / id 数 / 文本） | 38/38 一致 |
| 关键交互（聊天列表、月亮面板） | DOM 增量与原版相同 |
| localStorage 键集合与值长度 | 一致 |
| `window.SnowCrystal` 成员 | 203 / 203 一致 |
| 控制台与运行时错误 | 两侧均为 0 |
*（内容由AI生成，仅供参考）*
