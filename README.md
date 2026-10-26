---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 9fbe45044c8469ef0a783d48f4969eea_8f2c47b1d0d811f1b37d525400248c00
    ReservedCode1: vHtnP3axQwsBGqwFaQd/snx9+kO3uf46WV4KfhZc5wMn7wXzg+uQw6pVtpZIJqtAEGZpBelTuR1lLR6QrtIgOSUjdS6LGE+CQ0zuoRCtXx9C71JkqM/E8zGKfN4cmaTRYYx2G2m6lbAdKEHCmqC7NPrxTE16y7UJc9sl9t5FpI+JY2jO1uBUUlDbkHA=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 9fbe45044c8469ef0a783d48f4969eea_8f2c47b1d0d811f1b37d525400248c00
    ReservedCode2: vHtnP3axQwsBGqwFaQd/snx9+kO3uf46WV4KfhZc5wMn7wXzg+uQw6pVtpZIJqtAEGZpBelTuR1lLR6QrtIgOSUjdS6LGE+CQ0zuoRCtXx9C71JkqM/E8zGKfN4cmaTRYYx2G2m6lbAdKEHCmqC7NPrxTE16y7UJc9sl9t5FpI+JY2jO1uBUUlDbkHA=
---

# 雪晶 · 模块化拆分说明

## 概述
- 源文件：`/Volumes/资料存储盘/雪晶.html`（单文件 35226 行，CSS/JS/HTML 混合）
- 拆分产物：`/Volumes/资料存储盘/雪晶/`（本目录）
- 入口：`index.html`（双击或浏览器打开即可，功能与原单文件完全一致）
- 拆分原则：按原文件内嵌块顺序提取，CSS 覆盖层顺序与 JS 加载顺序均与原文件一致，保证渲染与执行逻辑零变化。

## 目录结构

```
雪晶/
├── index.html                  # 主入口：页面结构 DOM + 外部 CSS/JS 引用
├── README.md                   # 本说明
├── css/                        # 12 个样式模块（按原覆盖层顺序编号）
│   ├── 01-theme-vars.css       # 主题色板与基础变量（:root）
│   ├── 02-layout.css           # 布局框架（手机壳/顶栏/底导/多页框架）
│   ├── 03-home-components.css  # 首页组件（横排日历/相框/格言库）
│   ├── 04-responsive.css       # 响应式适配
│   ├── 05-theme-system.css     # 主题系统与外观设置页
│   ├── 06-home-iter-overlay.css# 首页迭代覆盖层
│   ├── 07-chat.css             # 聊天模块样式（chat- 命名空间）
│   ├── 08-settings-overlay.css # 设置与组件覆盖层
│   ├── 09-components-overlay.css # 组件样式与字卡数据管理覆盖层
│   ├── 10-account-settings.css # 账号设置
│   ├── 11-subpages-size.css    # 字卡/课程/设置子页 + 页面大小
│   └── 12-chat-bar-final.css   # 聊天底栏最终覆盖段
└── js/                         # 16 个脚本模块（按原执行顺序编号）
    ├── 01-cap.js               # 设备内存动态上限配置（XJ_CAP）
    ├── 02-navigation.js        # 页面切换与底部导航（switchPage）
    ├── 03-snow-button.js       # 底栏雪花按键
    ├── 04-time-diff.js         # 时间相隔
    ├── 05-theme-engine.js      # 主题引擎与外观（7 款主题）
    ├── 06-home-components.js   # 首页组件（相册卡片流/纪念日等）
    ├── 07-calendar.js          # 日历与卡片流（格言库/横排日历）
    ├── 08-wordcard-data.js     # 字卡库与数据管理
    ├── 09-init-global.js       # 初始化与全局接口
    ├── 10-moon.js              # 月汐笺语（月经记录）
    ├── 11-account.js           # 账号设置
    ├── 12-chat.js              # 雪晶聊天（SnowCrystal.Chat）
    ├── 13-vfix-voice.js        # 语音字卡全局导出补齐
    ├── 14-msg-menu.js          # 消息点击菜单/多选/引用
    ├── 15-subpages.js          # 字卡/课程/设置三大子页
    └── 16-stickers.js          # 贴表情（聊天背景 emoji）
```

## 依赖与注意事项
- JS 模块之间有严格执行顺序依赖（编号即加载顺序），请勿调整引用顺序。
- CSS 模块之间为覆盖层关系（后面的覆盖前面的），请勿调整引用顺序。
- 数据全部存储于浏览器 localStorage（snowcrystal.* 键），拆分不影响任何已存数据。
- 页面无外部本地资源依赖（图标为 data URI，天气数据请求公网 open-meteo API）。
- 修改单一功能时，只需编辑对应 css/js 模块文件，无需改动其他模块。

## 功能完整性验证（2026-10-26）
1. 内容完整性：拆分后 CSS+JS+HTML 保留内容字符校验与原文件完全相等（1499421 字符，零丢失）。
2. JS 语法：16 个模块全部通过 esprima 语法解析。
3. CSS 结构：12 个模块花括号/圆括号全部平衡。
4. 引用完整性：index.html 引用的 12 个 CSS + 16 个 JS 文件全部存在。
5. 事件依赖：HTML 内 140 处内联事件引用的全局函数（SnowCrystal.* / SnowBubble.* / switchPage 等）全部可在 JS 模块中找到定义。
6. 运行时验证：Google Chrome 无头模式加载，原文件与拆分文件均无 JS 未捕获异常（onerror 探针 data-errs="[]"）；首页日历、主题网格、聊天列表、账号卡片等 JS 渲染区域均正常渲染。
*（内容由AI生成，仅供参考）*
