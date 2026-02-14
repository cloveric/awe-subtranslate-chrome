<p align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="Awe SubTranslate" />
</p>

<h1 align="center">Awe SubTranslate</h1>

<p align="center">
  <strong>Bilingual Web Translation & Video Subtitle Translation for Chrome</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#installation">Installation</a> &bull;
  <a href="#supported-engines">Engines</a> &bull;
  <a href="#usage">Usage</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/engines-7-green?style=flat-square" alt="7 Engines" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/build-zero--config-orange?style=flat-square" alt="Zero Config" />
</p>

---

## What is Awe SubTranslate?

Awe SubTranslate is a Chrome extension that brings **real-time bilingual translation** to any web page — showing translations inline alongside the original text. It also provides **live subtitle translation** for YouTube and Netflix videos.

> Read any foreign language website with side-by-side bilingual display. Watch any video with dual-language subtitles.

---

## Features

### Web Page Translation

- **Bilingual side-by-side display** — Translations appear right next to the original text, preserving the page layout
- **Smart DOM parsing** — Intelligently groups text by paragraphs, skips code blocks, inputs, and already-translated content
- **Batch translation** — Groups text into efficient API batches (max 5000 chars) to minimize requests
- **9 translation themes** — Underline, dashed, highlight, blur (learning mode), paper, blockquote, italic, bold, weakening
- **One-click translate** — Floating button or keyboard shortcut (`Alt+A`)
- **Dynamic content support** — MutationObserver detects and translates dynamically loaded content

### Video Subtitle Translation

- **YouTube** — Real-time bilingual subtitle overlay for both manual and auto-generated captions
- **Netflix** — Bilingual subtitle overlay with position tracking
- **Smart debouncing** — Handles rollup-style auto-generated captions that build word-by-word
- **Position tracking** — Translation follows the original subtitle position using `requestAnimationFrame`
- **Error resilience** — Auto-pauses after repeated failures, shows user-friendly error messages

### Multi-Engine Support

Switch between **7 translation engines** on the fly — from free services to AI-powered translation:

| Engine | API Key Required | Best For |
|--------|:---:|---|
| **Google Translate** | No | General purpose, fast |
| **Microsoft Translator** | No | General purpose, free |
| **DeepL** | Yes | European languages, quality |
| **OpenAI (GPT)** | Yes | Context-aware, nuanced |
| **Anthropic Claude** | Yes | Long text, accuracy |
| **Google Gemini** | Yes | Multilingual, latest models |
| **DeepSeek** | Yes | Chinese-English, cost-effective |

### Settings & Configuration

- Full settings page with per-engine API key management
- Target language selection (10 languages)
- Translation theme preview
- Import/export configuration
- Right-click context menu integration

---

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/cloveric/awe-subtranslate-chrome.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right)

4. Click **Load unpacked** and select the `awe-subtranslate-chrome` folder

5. The extension icon will appear in your toolbar — you're ready to go!

### Configuration

- **Free engines** (Google, Microsoft) work out of the box
- **AI engines** require an API key — click the extension icon → Settings → Translation Services

---

## Usage

### Translate a Web Page

| Method | Action |
|--------|--------|
| Floating button | Click the **译** button on any page |
| Keyboard shortcut | Press `Alt + A` |
| Right-click menu | Right-click → "Translate This Page" |
| Popup | Click extension icon → "Translate This Page" |

### Translate Video Subtitles

1. Open a YouTube or Netflix video
2. Enable subtitles/CC on the video
3. Translations appear automatically below the original subtitles

### Switch Translation Engine

Click the extension icon → select a different engine from the dropdown. Changes take effect immediately.

---

## Architecture

```
awe-subtranslate-chrome/
├── manifest.json                    # Chrome Extension Manifest V3
├── _locales/                        # i18n (English + Chinese)
│   ├── en/messages.json
│   └── zh_CN/messages.json
├── icons/                           # Extension icons
├── src/
│   ├── background/
│   │   └── index.js                 # Service Worker: message routing + API dispatch
│   ├── content/
│   │   ├── index.js                 # Entry: floating button, toggle, MutationObserver
│   │   ├── dom-parser.js            # TreeWalker DOM traversal + text extraction
│   │   ├── translator.js            # Batch coordinator (grouping, caching, retry)
│   │   ├── injector.js              # Bilingual display injection (<font> tags)
│   │   └── subtitle/
│   │       ├── youtube.js           # [MAIN world] XHR/fetch hook for captions
│   │       ├── netflix.js           # [MAIN world] JSON.parse hook for timedtext
│   │       └── index.js             # [Isolated] MutationObserver + translation overlay
│   ├── services/                    # Translation engine adapters
│   │   ├── base.js                  # Abstract base class
│   │   ├── google.js                # Google Translate (free API)
│   │   ├── bing.js                  # Microsoft Translator (free, token-based)
│   │   ├── deepl.js                 # DeepL API
│   │   ├── openai.js                # OpenAI Chat Completions
│   │   ├── claude.js                # Anthropic Messages API
│   │   ├── gemini.js                # Google Gemini API
│   │   ├── deepseek.js              # DeepSeek API
│   │   └── index.js                 # Service registry + factory
│   ├── popup/                       # Extension popup UI
│   ├── options/                     # Full settings page
│   ├── styles/
│   │   └── inject.css               # 9 translation themes + subtitle styles
│   └── utils/
│       ├── storage.js               # chrome.storage.local wrapper
│       └── messaging.js             # chrome.runtime.sendMessage wrapper
└── README.md
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build tools | None (vanilla JS) | Zero config, instant reload during dev |
| UI framework | None | Lightweight, minimal footprint |
| Translation injection | `<font>` + CSS classes | Compatible with all page layouts |
| Messaging | `chrome.runtime.sendMessage` | Manifest V3 standard |
| Storage | `chrome.storage.local` | Persistent, sync-friendly |
| Subtitle tracking | `requestAnimationFrame` | Smooth position following |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + A` | Toggle page translation |

You can customize shortcuts at `chrome://extensions/shortcuts`.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test the extension locally (load unpacked in Chrome)
5. Commit: `git commit -m "feat: add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Tips

- No build step needed — edit files and reload the extension
- Background script: `chrome://extensions/` → click the service worker link to debug
- Content scripts: open DevTools on any page → Console tab
- Use `[IMT]` prefix in console.log for easy filtering

---

## License

[MIT](LICENSE) &copy; 2025 cloveric

---

<p align="center">
  <sub>If you find this project useful, please consider giving it a star!</sub>
</p>
