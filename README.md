<div align="center">

<img src="icons/icon128.png" width="100" height="100" alt="Awe SubTranslate" />

# Awe SubTranslate

### _Read any website and watch subtitles in two languages, instantly._

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/cloveric/awe-subtranslate-chrome)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-0F9D58?style=for-the-badge&logo=google&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-F4B400?style=for-the-badge)](LICENSE)
[![Engines](https://img.shields.io/badge/Engines-7-DB4437?style=for-the-badge)](https://github.com/cloveric/awe-subtranslate-chrome)

**[Features](#-features)** · **[Installation](#-installation)** · **[Engines](#-supported-engines)** · **[Usage](#-usage)** · **[Architecture](#-architecture)** · **[Privacy](PRIVACY_POLICY.md)** · **[Contributing](#-contributing)**

[**中文文档**](README.zh-CN.md)

---

<br/>

> _Turn foreign websites into readable translated pages in one click._
> _Watch YouTube with low-latency bilingual subtitles on top._

<br/>

</div>

## 🌟 Why Awe SubTranslate

<table>
<tr>
<td width="50%">

### 🌐 Built for Bilingual Reading

- **Side-by-side reading experience** — translated text appears where you read, not in a separate page
- **Smart page parsing** — groups content by meaningful blocks and skips code/inputs automatically
- **Fast batch pipeline** — efficient translation batching (up to 4000 chars per request batch)
- **9 built-in visual themes** — underline, highlight, blur-learning mode, paper style, and more
- **One-click flow** — floating button, popup action, or `Alt+A` keyboard shortcut
- **Dynamic page support** — newly loaded content is detected and translated automatically

</td>
<td width="50%">

### 🎬 Real-Time Subtitle Companion

- **YouTube ready** — click player-side `译` button to start subtitle translation
- **Auto CC assist** — subtitle translation can auto-enable YouTube CC when needed
- **Latency-first subtitle path** — native translated track first, then cached engine fallback
- **Overlap-cue alignment** — picks latest active cue to reduce half-beat lag in rollup streams
- **Smooth subtitle syncing** — tracks subtitle position in real time
- **Resilient fallback behavior** — pauses on repeated failures and shows clear feedback

</td>
</tr>
</table>

### 🎨 Translation Themes

> Pick the style that fits your reading flow — 9 themes included:

| Theme | Style | Theme | Style |
|:---:|:---:|:---:|:---:|
| `underline` | Blue underline | `dashed` | Dashed border |
| `highlight` | Yellow highlight | `weakening` | Subtle opacity |
| `italic` | Italic text | `bold` | Bold text |
| `mask` | Blur (hover to reveal) | `paper` | Paper card |
| `blockquote` | Left border accent | | |

---

## 🚀 Get Started in 60 Seconds

### Step 1 — Clone the repository

```bash
git clone https://github.com/cloveric/awe-subtranslate-chrome.git
```

### Step 2 — Load it as an unpacked extension

```
1. Open chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the awe-subtranslate-chrome folder
```

### Step 3 — Start translating

> **Free engines** (Google, Microsoft) work out of the box.
>
> **AI engines** need an API key — extension icon → ⚙ Settings → Translation Services.

---

## 🔮 Engine Lineup

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

## 📖 Daily Usage

### Translate any web page

| Method | How |
|:---|:---|
| ⌨️ Keyboard shortcut | Press `Alt + A` |
| 🖱️ Right-click menu | Right-click → "Translate This Page" |
| ✍ Selection translate | Select text → right-click → "Translate selected text" |
| 📌 Popup | Click extension icon → "Translate This Page" |

> Page translation only affects page body text, and does not toggle video subtitle translation.

### Translate video subtitles

| Step | Action |
|:---:|:---|
| **1** | Open a YouTube video |
| **2** | Click the player-side `译` button (next to CC) |
| **3** | Extension renders bilingual subtitle overlay and keeps it synced with player subtitles |

### Switch engine anytime

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
│   │   ├── injector.js                  # Display — replace original text with translation (<font> tags)
│   │   └── 🎬 subtitle/
│   │       ├── youtube.js               # MAIN-world hook for timedtext + caption track catalog
│   │       └── index.js                 # Isolated subtitle controller + low-latency overlay render
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
subtitle/youtube.js (MAIN-world hook captures timedtext + track catalog)
  → subtitle/index.js selects source/translated tracks and runs track/live auto mode
  → latest-active-cue alignment + cue prefetch + early render
  → fallback: chrome.runtime.sendMessage → background → translation API
  → bilingual subtitle overlay rendered on video
```

</details>

### Subtitle Latency Fallback Plan (Backup Option)

If additional speed is needed in difficult videos, the next fallback option is:

- **Track batch translation queue** — send multiple adjacent subtitle groups in one request, then map results back by order.
- **When to activate** — only when cache miss ratio is high or translation RTT becomes unstable.
- **Safety guardrails** — strict punctuation/length boundaries, bounded batch size, and automatic fallback to single-group translation on mismatch.

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

## 📦 Chrome Web Store Release

For API-based upload and publish (v2), see:

- `docs/chrome-web-store-api-v2.zh-CN.md`
- `docs/playwright-cws-workflow.zh-CN.md`

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
