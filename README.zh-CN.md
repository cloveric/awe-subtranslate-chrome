<div align="center">

<img src="icons/icon128.png" width="100" height="100" alt="Awe SubTranslate" />

# Awe SubTranslate

### _双语网页翻译 & 视频字幕翻译 Chrome 扩展_

[![Chrome](https://img.shields.io/badge/Chrome-扩展程序-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/cloveric/awe-subtranslate-chrome)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0F9D58?style=for-the-badge&logo=google&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/许可证-MIT-F4B400?style=for-the-badge)](LICENSE)
[![Engines](https://img.shields.io/badge/翻译引擎-7个-DB4437?style=for-the-badge)](https://github.com/cloveric/awe-subtranslate-chrome)

**[功能特性](#-功能特性)** · **[安装指南](#-安装指南)** · **[翻译引擎](#-翻译引擎)** · **[使用方法](#-使用方法)** · **[技术架构](#-技术架构)** · **[参与贡献](#-参与贡献)**

[**English**](README.md)

---

<br/>

> _阅读任何外语网页，原文译文双语对照。_
> _观看任何视频，实时双语字幕翻译。_

<br/>

</div>

## 🌟 功能特性

<table>
<tr>
<td width="50%">

### 🌐 网页翻译

- **双语对照显示** — 译文紧贴原文旁边，保持页面原有排版
- **智能 DOM 解析** — 按段落智能分组文本，自动跳过代码块、输入框
- **批量翻译** — 高效 API 批量请求（每批最大 4000 字符）
- **9 种译文主题** — 下划线、高亮、模糊、纸张、引用等样式
- **一键翻译** — 浮动按钮或快捷键 `Alt+A`
- **动态内容支持** — 自动检测并翻译懒加载的新内容

</td>
<td width="50%">

### 🎬 视频字幕翻译

- **YouTube** — 支持手动字幕和自动生成字幕的实时双语叠加
- **Netflix** — 双语字幕叠加显示，智能跟踪字幕位置
- **智能防抖** — 完美处理逐词构建的自动字幕（rollup 模式）
- **位置追踪** — 使用 `requestAnimationFrame` 60fps 平滑跟随原始字幕
- **容错机制** — 连续失败后自动暂停，友好的错误提示

</td>
</tr>
</table>

### 🎨 译文主题

> 9 种精心设计的译文显示样式，自由切换：

| 主题 | 效果 | 主题 | 效果 |
|:---:|:---:|:---:|:---:|
| `下划线` | 蓝色下划线标注 | `虚线` | 虚线边框 |
| `高亮` | 黄色荧光笔 | `弱化` | 柔和透明度 |
| `斜体` | 斜体文字 | `加粗` | 加粗文字 |
| `模糊` | 模糊遮罩（悬停显示） | `纸张` | 卡片效果 |
| `引用` | 左侧蓝色边框 | | |

---

## 🚀 安装指南

### 第一步 — 克隆仓库

```bash
git clone https://github.com/cloveric/awe-subtranslate-chrome.git
```

### 第二步 — 加载到 Chrome

```
1. 打开 chrome://extensions/
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 awe-subtranslate-chrome 文件夹
```

### 第三步 — 开始翻译！

> **免费引擎**（Google、微软）开箱即用，无需任何配置。
>
> **AI 引擎**需要 API Key — 点击扩展图标 → ⚙ 设置 → 翻译服务，填入对应的 Key。

---

## 🔮 翻译引擎

<table>
<tr>
<th align="center">引擎</th>
<th align="center">API Key</th>
<th align="center">类型</th>
<th>特点</th>
</tr>

<tr>
<td align="center"><strong>Google 翻译</strong></td>
<td align="center">🟢 免费</td>
<td align="center">传统翻译</td>
<td>通用、速度快、稳定可靠</td>
</tr>

<tr>
<td align="center"><strong>微软翻译</strong></td>
<td align="center">🟢 免费</td>
<td align="center">传统翻译</td>
<td>通用、质量好、免费无限制</td>
</tr>

<tr>
<td align="center"><strong>DeepL</strong></td>
<td align="center">🔑 需要</td>
<td align="center">神经网络</td>
<td>欧洲语言强、表达自然流畅</td>
</tr>

<tr>
<td align="center"><strong>OpenAI GPT</strong></td>
<td align="center">🔑 需要</td>
<td align="center">大模型</td>
<td>上下文感知、翻译细腻</td>
</tr>

<tr>
<td align="center"><strong>Anthropic Claude</strong></td>
<td align="center">🔑 需要</td>
<td align="center">大模型</td>
<td>长文本、高准确性</td>
</tr>

<tr>
<td align="center"><strong>Google Gemini</strong></td>
<td align="center">🔑 需要</td>
<td align="center">大模型</td>
<td>多语言、最新模型</td>
</tr>

<tr>
<td align="center"><strong>DeepSeek</strong></td>
<td align="center">🔑 需要</td>
<td align="center">大模型</td>
<td>中英翻译佳、性价比高</td>
</tr>

</table>

---

## 📖 使用方法

### 翻译网页

| 方式 | 操作 |
|:---|:---|
| 🔘 浮动按钮 | 点击页面右下角的 **译** 按钮 |
| ⌨️ 快捷键 | 按 `Alt + A` |
| 🖱️ 右键菜单 | 右键点击页面 → 「翻译此页面」 |
| 📌 弹出窗口 | 点击扩展图标 → 「翻译此页面」 |

### 翻译视频字幕

| 步骤 | 操作 |
|:---:|:---|
| **1** | 打开 YouTube 或 Netflix 视频 |
| **2** | 在播放器上开启字幕 / CC |
| **3** | 翻译会自动显示在原始字幕下方 |

### 切换翻译引擎

> 点击扩展图标 → 在下拉菜单中选择引擎 → 立即生效，无需刷新。

---

## 🏗️ 技术架构

```
awe-subtranslate-chrome/
│
├── 📄 manifest.json                     # Chrome Extension Manifest V3 配置
├── 🌍 _locales/                         # 国际化（中英双语）
├── 🎨 icons/                            # 扩展图标 (16/32/48/128px)
│
├── 📂 src/
│   ├── ⚙️ background/
│   │   └── index.js                     # Service Worker — 消息路由 + API 调度
│   │
│   ├── 📝 content/
│   │   ├── index.js                     # 入口 — 浮动按钮、翻译开关、观察器
│   │   ├── dom-parser.js                # DOM 遍历 — TreeWalker 提取文本
│   │   ├── translator.js                # 翻译协调器 — 批量分组、缓存、重试
│   │   ├── injector.js                  # 双语注入 — 在原文旁插入 <font> 译文
│   │   └── 🎬 subtitle/
│   │       ├── youtube.js               # [Legacy] MAIN world 字幕 Hook（默认不启用）
│   │       ├── netflix.js               # [Legacy] MAIN world 字幕 Hook（默认不启用）
│   │       └── index.js                 # [Isolated] MutationObserver + 译文覆盖层
│   │
│   ├── 🔌 services/                     # 翻译引擎适配器
│   │   ├── base.js                      # 抽象基类
│   │   ├── google.js                    # Google 翻译（免费 API）
│   │   ├── bing.js                      # 微软翻译（免费，需 token）
│   │   ├── deepl.js                     # DeepL API
│   │   ├── openai.js                    # OpenAI Chat Completions
│   │   ├── claude.js                    # Anthropic Messages API
│   │   ├── gemini.js                    # Google Gemini API
│   │   ├── deepseek.js                  # DeepSeek API
│   │   └── index.js                     # 服务注册表 + 工厂模式
│   │
│   ├── 🪟 popup/                        # 快捷操作弹窗
│   ├── ⚙️ options/                      # 完整设置页面
│   ├── 🎨 styles/inject.css             # 9 种主题 + 字幕样式
│   └── 🛠️ utils/                        # Storage + Messaging 封装
│
├── 📄 README.md                         # English documentation
├── 📄 README.zh-CN.md                   # 中文文档
└── 📄 LICENSE                           # MIT 许可证
```

<details>
<summary><strong>数据流 — 网页翻译</strong></summary>

```
用户点击翻译
  → content/index.js 调度
    → dom-parser.js 收集文本块（TreeWalker 遍历）
    → translator.js 批量分组（每批最大 4000 字符）
    → chrome.runtime.sendMessage → background/index.js
      → services/*.js 调用翻译 API
    → 结果返回 → injector.js 注入双语 <font> 标签
```

</details>

<details>
<summary><strong>数据流 — 字幕翻译</strong></summary>

```
subtitle/index.js（MutationObserver 监听字幕 DOM 变化）
  → chrome.runtime.sendMessage → background → 翻译 API
  → 在视频上显示双语字幕覆盖层
```

</details>

<details>
<summary><strong>设计决策</strong></summary>

| 决策 | 选择 | 理由 |
|:---|:---|:---|
| 构建工具 | 无（原生 JS） | 零配置、修改即生效 |
| UI 框架 | 无 | 轻量级、零运行时开销 |
| 翻译注入方式 | `<font>` + CSS class | 兼容所有页面布局 |
| 消息通信 | `chrome.runtime.sendMessage` | Manifest V3 标准方案 |
| 存储 | `chrome.storage.local` | 持久化、跨会话保持 |
| 字幕位置追踪 | `requestAnimationFrame` | 60fps 平滑同步 |

</details>

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|:---:|:---|
| `Alt + A` | 开启/关闭页面翻译 |

> 可在 `chrome://extensions/shortcuts` 自定义快捷键

---

## 🤝 参与贡献

欢迎贡献代码！以下是参与方式：

```bash
# 1. Fork 并克隆
git clone https://github.com/YOUR_USERNAME/awe-subtranslate-chrome.git

# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 开发 & 测试（在 Chrome 中加载已解压的扩展程序）

# 4. 提交 & 推送
git commit -m "feat: 添加新功能"
git push origin feature/amazing-feature

# 5. 发起 Pull Request
```

<details>
<summary><strong>开发小贴士</strong></summary>

- **无需构建** — 修改代码后直接刷新扩展即可
- **调试 Background** — `chrome://extensions/` → 点击 Service Worker 链接
- **调试 Content Script** — 网页 DevTools → Console → 搜索 `[IMT]`
- **调试 Popup** — 右键点击弹窗 → 检查

</details>

---

## 📄 许可证

[MIT](LICENSE) © 2025 [cloveric](https://github.com/cloveric)

---

<div align="center">

<br/>

**觉得有用的话，请给个 ⭐ 支持一下！**

<br/>

由 [cloveric](https://github.com/cloveric) 用 ❤️ 打造

</div>
