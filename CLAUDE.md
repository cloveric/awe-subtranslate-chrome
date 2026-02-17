# Awe SubTranslate

## Project Overview

A Chrome extension that provides bilingual web page translation with text replacement display, multi-engine support, and video subtitle translation for YouTube.

## Technical Architecture

### Manifest V3 Chrome Extension

- **Zero build tools** — Pure vanilla JavaScript, no Webpack/Vite
- **Content Scripts** — IIFE pattern, sharing `window.IMT` namespace
- **Background** — ES Module service worker
- **Services** — ES Module, imported in background

### Module Structure

```
manifest.json
├── src/background/index.js      # Service Worker: message routing + API calls
├── src/content/
│   ├── dom-parser.js            # DOM traversal, collect translatable text blocks
│   ├── injector.js              # Replace text in DOM with translations (<font> tags)
│   ├── translator.js            # Translation coordinator (batching, caching)
│   ├── index.js                 # Entry point, page translation toggle, MutationObserver
│   └── subtitle/
│       ├── youtube.js           # [Legacy] MAIN world hook (disabled by default)
│       └── index.js             # [isolated] YouTube subtitle observer + translation display
├── src/services/                # Translation engines (ES Module)
│   ├── base.js → google.js, bing.js, deepl.js, openai.js, claude.js, gemini.js, deepseek.js
│   └── index.js                 # Service registry + factory
├── src/popup/                   # Quick action popup
├── src/options/                 # Settings page
└── src/styles/inject.css        # Injected translation styles
```

### Data Flow — Web Translation

```
User clicks translate → content/index.js
  → dom-parser.js collects text blocks
  → translator.js batches & groups
  → chrome.runtime.sendMessage → background/index.js
    → services/*.js calls translation API
  → Returns results → injector.js injects into DOM
```

### Data Flow — Subtitle Translation

```
subtitle/index.js (isolated world, MutationObserver on caption DOM)
  → track/live auto mode + cue prefetch + early render
  → chrome.runtime.sendMessage → background → Translation API
  → Display bilingual subtitles on video
```

## Translation Engines

| Engine | Requires Key | API Endpoint |
|--------|-------------|-------------|
| Google | No | translate.googleapis.com |
| Bing | No | edge.microsoft.com/translate/auth |
| DeepL | Yes | api-free.deepl.com / api.deepl.com |
| OpenAI | Yes | api.openai.com/v1/chat/completions |
| Claude | Yes | api.anthropic.com/v1/messages |
| Gemini | Yes | generativelanguage.googleapis.com |
| DeepSeek | Yes | api.deepseek.com |

## Development

### Install to Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `awe-subtranslate-chrome/` directory

### Debugging
- Background: `chrome://extensions/` → click service worker link
- Content Script: page DevTools → Console
- Popup: right-click popup → Inspect

### Key Notes
- Content scripts cannot use ES modules — use `window.IMT` namespace
- Subtitle translation runs in isolated world via MutationObserver on YouTube caption DOM
- Backup latency option (documented): track batch translation queue for adjacent cue groups, enabled only under high-miss/high-RTT conditions
- Google/Bing are free APIs, no configuration needed
- AI engines (OpenAI/Claude/Gemini/DeepSeek) require API Key in settings
