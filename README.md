<div align="center">

<img src="icons/icon128.png" width="100" height="100" alt="Awe SubTranslate" />

# Awe SubTranslate

### _Bilingual Web Translation & Video Subtitle Translation for Chrome_

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/cloveric/awe-subtranslate-chrome)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0F9D58?style=for-the-badge&logo=google&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-F4B400?style=for-the-badge)](LICENSE)
[![Engines](https://img.shields.io/badge/Engines-7-DB4437?style=for-the-badge)](https://github.com/cloveric/awe-subtranslate-chrome)

**[Features](#-features)** · **[Installation](#-installation)** · **[Engines](#-supported-engines)** · **[Usage](#-usage)** · **[Architecture](#-architecture)** · **[Contributing](#-contributing)**

[**中文文档**](README.zh-CN.md)

---

<br/>

> _Read any foreign language website with side-by-side bilingual display._
> _Watch any video with dual-language subtitles._

<br/>

</div>

## 🌟 Features

<table>
<tr>
<td width="50%">

### 🌐 Web Page Translation

- **Bilingual side-by-side display** — translations appear right next to the original text
- **Smart DOM parsing** — intelligently groups text by paragraphs, skips code/inputs
- **Batch translation** — efficient API batching (max 4000 chars per batch)
- **9 translation themes** — underline, highlight, blur, paper, and more
- **One-click translate** — floating button or `Alt+A` shortcut
- **Dynamic content** — auto-detects and translates lazy-loaded content

</td>
<td width="50%">

### 🎬 Video Subtitle Translation

- **YouTube** — real-time bilingual overlay for manual & auto-generated captions
- **Netflix** — bilingual subtitle overlay with smart positioning
- **Smart debouncing** — handles rollup-style captions that build word-by-word
- **Position tracking** — translations follow subtitle position via `requestAnimationFrame`
- **Error resilience** — auto-pauses after failures with friendly error messages

</td>
</tr>
</table>

### 🎨 Translation Themes

> Choose how your translations look — 9 beautiful themes built in:

| Theme | Style | Theme | Style |
|:---:|:---:|:---:|:---:|
| `underline` | Blue underline | `dashed` | Dashed border |
| `highlight` | Yellow highlight | `weakening` | Subtle opacity |
| `italic` | Italic text | `bold` | Bold text |
| `mask` | Blur (hover to reveal) | `paper` | Paper card |
| `blockquote` | Left border accent | | |

---

## 🚀 Installation

### Step 1 — Clone

```bash
git clone https://github.com/cloveric/awe-subtranslate-chrome.git
```

### Step 2 — Load into Chrome

```
1. Open chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the awe-subtranslate-chrome folder
```

### Step 3 — Start translating!

> **Free engines** (Google, Microsoft) work immediately — no setup needed.
>
> **AI engines** need an API key — click extension icon → ⚙ Settings → Translation Services.

---

## 🔮 Supported Engines

<table>
<tr>
<th align="center">Engine</th>
<th align="center">API Key</th>
<th align="center">Type</th>
<th>Best For</th>
</tr>

<tr>
<td align="center"><strong>Google Translate</strong></td>
<td align="center">🟢 Free</td>
<td align="center">Traditional</td>
<td>General purpose, fast, reliable</td>
</tr>

<tr>
<td align="center"><strong>Microsoft Translator</strong></td>
<td align="center">🟢 Free</td>
<td align="center">Traditional</td>
<td>General purpose, good quality</td>
</tr>

<tr>
<td align="center"><strong>DeepL</strong></td>
<td align="center">🔑 Required</td>
<td align="center">Neural MT</td>
<td>European languages, natural phrasing</td>
</tr>

<tr>
<td align="center"><strong>OpenAI GPT</strong></td>
<td align="center">🔑 Required</td>
<td align="center">LLM</td>
<td>Context-aware, nuanced translation</td>
</tr>

<tr>
<td align="center"><strong>Anthropic Claude</strong></td>
<td align="center">🔑 Required</td>
<td align="center">LLM</td>
<td>Long text, high accuracy</td>
</tr>

<tr>
<td align="center"><strong>Google Gemini</strong></td>
<td align="center">🔑 Required</td>
<td align="center">LLM</td>
<td>Multilingual, latest generation</td>
</tr>

<tr>
<td align="center"><strong>DeepSeek</strong></td>
<td align="center">🔑 Required</td>
<td align="center">LLM</td>
<td>Chinese ↔ English, cost-effective</td>
</tr>

</table>

---

## 📖 Usage

### Translate a Web Page

| Method | How |
|:---|:---|
| 🔘 Floating button | Click the **译** button (bottom-right of any page) |
| ⌨️ Keyboard shortcut | Press `Alt + A` |
| 🖱️ Right-click menu | Right-click → "Translate This Page" |
| 📌 Popup | Click extension icon → "Translate This Page" |

### Translate Video Subtitles

| Step | Action |
|:---:|:---|
| **1** | Open a YouTube or Netflix video |
| **2** | Enable subtitles / CC on the video player |
| **3** | Translations appear automatically below original subtitles |

### Switch Engine

> Click extension icon → select engine from dropdown → changes take effect immediately.

---

## 🏗️ Architecture

```
awe-subtranslate-chrome/
│
├── 📄 manifest.json                     # Chrome Extension Manifest V3
├── 🌍 _locales/                         # i18n (English + Chinese)
├── 🎨 icons/                            # Extension icons (16/32/48/128)
│
├── 📂 src/
│   ├── ⚙️ background/
│   │   └── index.js                     # Service Worker — message routing + API dispatch
│   │
│   ├── 📝 content/
│   │   ├── index.js                     # Entry — floating button, toggle, observer
│   │   ├── dom-parser.js                # TreeWalker — DOM traversal + text extraction
│   │   ├── translator.js                # Coordinator — batching, caching, retry
│   │   ├── injector.js                  # Display — bilingual injection (<font> tags)
│   │   └── 🎬 subtitle/
│   │       ├── youtube.js               # [Legacy] MAIN-world subtitle hook (disabled by default)
│   │       ├── netflix.js               # [Legacy] MAIN-world subtitle hook (disabled by default)
│   │       └── index.js                 # [Isolated] Observer + translation overlay
│   │
│   ├── 🔌 services/                     # Translation engine adapters
│   │   ├── base.js                      # Abstract base class
│   │   ├── google.js                    # Google Translate
│   │   ├── bing.js                      # Microsoft Translator
│   │   ├── deepl.js                     # DeepL
│   │   ├── openai.js                    # OpenAI GPT
│   │   ├── claude.js                    # Anthropic Claude
│   │   ├── gemini.js                    # Google Gemini
│   │   ├── deepseek.js                  # DeepSeek
│   │   └── index.js                     # Registry + factory
│   │
│   ├── 🪟 popup/                        # Quick-action popup UI
│   ├── ⚙️ options/                      # Full settings page
│   ├── 🎨 styles/inject.css             # 9 themes + subtitle styles
│   └── 🛠️ utils/                        # Storage + messaging wrappers
│
├── 📄 README.md
├── 📄 README.zh-CN.md
└── 📄 LICENSE
```

<details>
<summary><strong>Data Flow — Web Translation</strong></summary>

```
User clicks translate
  → content/index.js dispatches
    → dom-parser.js collects text blocks (TreeWalker)
    → translator.js batches & groups (max 4000 chars)
    → chrome.runtime.sendMessage → background/index.js
      → services/*.js calls translation API
    → results returned → injector.js injects bilingual <font> tags
```

</details>

<details>
<summary><strong>Data Flow — Subtitle Translation</strong></summary>

```
 subtitle/index.js (MutationObserver watches caption DOM)
  → chrome.runtime.sendMessage → background → translation API
  → bilingual subtitle overlay displayed on video
```

</details>

<details>
<summary><strong>Design Decisions</strong></summary>

| Decision | Choice | Rationale |
|:---|:---|:---|
| Build tools | None (vanilla JS) | Zero config, instant reload |
| UI framework | None | Lightweight, ~0 overhead |
| Translation injection | `<font>` + CSS classes | Works with any page layout |
| Messaging | `chrome.runtime.sendMessage` | Manifest V3 standard |
| Storage | `chrome.storage.local` | Persistent, cross-session |
| Subtitle tracking | `requestAnimationFrame` | Smooth 60fps position sync |

</details>

---

## ⌨️ Shortcuts

| Shortcut | Action |
|:---:|:---|
| `Alt + A` | Toggle page translation |

> Customize at `chrome://extensions/shortcuts`

---

## 🤝 Contributing

Contributions are welcome! Here's how:

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/awe-subtranslate-chrome.git

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Make changes & test (load unpacked in Chrome)

# 4. Commit & push
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

<details>
<summary><strong>Development Tips</strong></summary>

- **No build step** — edit files, reload extension, done
- **Background debug** — `chrome://extensions/` → click service worker link
- **Content debug** — page DevTools → Console → filter by `[IMT]`
- **Popup debug** — right-click popup → Inspect

</details>

---

## 📄 License

[MIT](LICENSE) © 2025 [cloveric](https://github.com/cloveric)

---

<div align="center">

<br/>

**If you find this useful, a ⭐ would be greatly appreciated!**

<br/>

Made with ❤️ by [cloveric](https://github.com/cloveric)

</div>
