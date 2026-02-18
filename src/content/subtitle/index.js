/**
 * 字幕翻译 Content Script（isolated world）
 *
 * YouTube: MutationObserver 观察字幕 + rAF 持续跟随位置
 */
window.IMT = window.IMT || {};

(function () {
  'use strict';

  let subtitleEnabled = false;
  let translatedCache = new Map();
  let subtitleToggleBtn = null;
  let ytControlBtnCheckTimer = null;
  let ytEnsureCaptionTimer = null;

  // 缓存设置
  let cachedService = 'google';
  let cachedTargetLang = 'zh-CN';

  const isYouTube = location.hostname.includes('youtube.com');

  function ensureYouTubeToggleButtonStyle() {
    if (document.getElementById('imt-yt-toggle-style')) return;
    const style = document.createElement('style');
    style.id = 'imt-yt-toggle-style';
    style.textContent = `
      #imt-yt-subtitle-toggle.ytp-button {
        width: 36px;
        min-width: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0.92;
      }
      #imt-yt-subtitle-toggle .imt-yt-toggle-label {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #fff;
        line-height: 1;
      }
      #imt-yt-subtitle-toggle.imt-active .imt-yt-toggle-label {
        color: #34d399;
      }
      #imt-yt-subtitle-toggle.imt-busy .imt-yt-toggle-label {
        color: #f59e0b;
      }
      html.imt-yt-caption-replace .ytp-caption-window-container {
        opacity: 0 !important;
      }
      #imt-yt-translated .imt-yt-caption-wrap {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        max-width: min(92vw, 92ch);
      }
      #imt-yt-translated .imt-yt-caption-line {
        display: inline-block;
        max-width: 100%;
        padding: 1px 6px;
        border-radius: 2px;
        background: rgba(8, 8, 8, 0.86);
        color: #fff;
        text-shadow: 0 0 2px rgba(0, 0, 0, 0.98), 0 0 6px rgba(0, 0, 0, 0.9);
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        line-break: auto;
        line-height: 1.24;
        font-family: "YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, sans-serif;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
      #imt-yt-translated .imt-yt-caption-line.imt-yt-nowrap {
        white-space: nowrap;
        overflow-wrap: normal;
        word-break: normal;
      }
      #imt-yt-translated .imt-yt-caption-zh {
        font-size: 0.94em;
        font-weight: 500;
      }
      #imt-yt-translated .imt-yt-caption-en {
        font-size: 0.76em;
        font-weight: 500;
        opacity: 0.96;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: min(92vw, 92ch);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isYouTubeNativeCaptionOn() {
    const ccBtn = document.querySelector('.ytp-subtitles-button');
    if (!ccBtn) return null;
    const pressed = ccBtn.getAttribute('aria-pressed');
    if (pressed === 'true') return true;
    if (pressed === 'false') return false;
    return ccBtn.classList.contains('ytp-button-active');
  }

  function ensureYouTubeNativeCaptionEnabled() {
    if (!isYouTube || !subtitleEnabled) return;

    const tryEnable = function () {
      if (!subtitleEnabled) return true;
      const ccBtn = document.querySelector('.ytp-subtitles-button');
      if (!ccBtn || typeof ccBtn.click !== 'function') return false;

      const isOn = isYouTubeNativeCaptionOn();
      if (isOn === true) return true;
      ccBtn.click();
      return true;
    };

    if (tryEnable()) return;
    if (ytEnsureCaptionTimer) return;

    ytEnsureCaptionTimer = setInterval(function () {
      if (!subtitleEnabled) {
        clearInterval(ytEnsureCaptionTimer);
        ytEnsureCaptionTimer = null;
        return;
      }
      if (tryEnable()) {
        clearInterval(ytEnsureCaptionTimer);
        ytEnsureCaptionTimer = null;
      }
    }, 600);
  }

  function stopEnsureYouTubeNativeCaptionEnabled() {
    if (!ytEnsureCaptionTimer) return;
    clearInterval(ytEnsureCaptionTimer);
    ytEnsureCaptionTimer = null;
  }

  function toggleYouTubeNativeCaptionVisibility(showNative) {
    document.documentElement.classList.toggle('imt-yt-caption-replace', !showNative);
  }

  function mountYouTubeSubtitleToggleButton() {
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) return false;

    let btn = document.getElementById('imt-yt-subtitle-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'imt-yt-subtitle-toggle';
      btn.className = 'ytp-button imt-subtitle-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-keyshortcuts', 'a');
      btn.innerHTML = '<span class="imt-yt-toggle-label">译</span>';
      btn.addEventListener('click', function () {
        chrome.storage.local.set({ enableSubtitle: !subtitleEnabled });
      });
    }

    const ccBtn = controls.querySelector('.ytp-subtitles-button');
    if (!btn.isConnected) {
      if (ccBtn) {
        ccBtn.insertAdjacentElement('afterend', btn);
      } else {
        controls.appendChild(btn);
      }
    } else if (ccBtn && btn.previousElementSibling !== ccBtn) {
      ccBtn.insertAdjacentElement('afterend', btn);
    }

    subtitleToggleBtn = btn;
    return true;
  }

  function updateSubtitleToggleButton() {
    if (isYouTube && (!subtitleToggleBtn || !subtitleToggleBtn.isConnected)) {
      initSubtitleToggleButton();
    }
    if (isYouTube) {
      toggleYouTubeNativeCaptionVisibility(!subtitleEnabled);
    }
    if (!subtitleToggleBtn) return;
    subtitleToggleBtn.classList.toggle('imt-active', subtitleEnabled);
    subtitleToggleBtn.classList.remove('imt-busy');
    subtitleToggleBtn.setAttribute('aria-pressed', subtitleEnabled ? 'true' : 'false');
    subtitleToggleBtn.title = subtitleEnabled
      ? '视频字幕翻译已开启，点击关闭'
      : '视频字幕翻译已关闭，点击开启';
    if (subtitleEnabled) {
      ensureYouTubeNativeCaptionEnabled();
    } else {
      stopEnsureYouTubeNativeCaptionEnabled();
    }
  }

  function initSubtitleToggleButton() {
    if (!isYouTube) return;
    ensureYouTubeToggleButtonStyle();
    if (mountYouTubeSubtitleToggleButton()) {
      if (ytControlBtnCheckTimer) {
        clearInterval(ytControlBtnCheckTimer);
        ytControlBtnCheckTimer = null;
      }
      updateSubtitleToggleButton();
      return;
    }

    if (!ytControlBtnCheckTimer) {
      ytControlBtnCheckTimer = setInterval(function () {
        if (mountYouTubeSubtitleToggleButton()) {
          clearInterval(ytControlBtnCheckTimer);
          ytControlBtnCheckTimer = null;
          updateSubtitleToggleButton();
        }
      }, 800);
    }
  }

  function loadSettings() {
    chrome.storage.local.get(['translationService', 'targetLanguage'], function (result) {
      cachedService = result.translationService || 'google';
      cachedTargetLang = result.targetLanguage || 'zh-CN';
    });
  }
  loadSettings();

  // ========================
  // 通用翻译
  // ========================

  let errorCount = 0;
  const MAX_ERRORS = 3;
  const ERROR_COOLDOWN_MS = 15000;
  let errorPausedUntil = 0;
  let translateVersion = 0; // 版本计数器，替代单 key 守卫

  async function translateText(text) {
    if (!text || !text.trim()) return { text: '', version: -1 };
    const key = text.trim();
    if (translatedCache.has(key)) return { text: translatedCache.get(key), version: -1 };

    if (errorCount >= MAX_ERRORS) {
      if (Date.now() < errorPausedUntil) {
        return { text: '', version: -1 };
      }
      // 冷却结束后自动恢复
      errorCount = 0;
      errorPausedUntil = 0;
    }

    var version = ++translateVersion;

    try {
      const resp = await IMT.Messaging.requestTranslation(
        [key], 'auto', cachedTargetLang, cachedService
      );

      // 如果版本已过期，丢弃结果但仍缓存
      if (resp?.results?.[0]) {
        errorCount = 0;
        translatedCache.set(key, resp.results[0]);
        return { text: resp.results[0], version: version };
      }
      if (resp?.error) throw new Error(resp.error);
      return { text: '', version: version };
    } catch (e) {
      errorCount++;
      const msg = e?.message || String(e);
      console.error('[IMT Subtitle] 翻译失败 (' + errorCount + '/' + MAX_ERRORS + '):', msg);
      if (errorCount === 1) showErrorOnVideo('字幕翻译失败: ' + msg.slice(0, 60));
      if (errorCount >= MAX_ERRORS) {
        errorPausedUntil = Date.now() + ERROR_COOLDOWN_MS;
        showErrorOnVideo('字幕翻译已暂停，15 秒后自动重试');
      }
      return { text: '', version: version };
    }
  }

  function showErrorOnVideo(msg) {
    document.querySelectorAll('.imt-subtitle-error').forEach((el) => el.remove());
    const el = document.createElement('div');
    el.className = 'imt-subtitle-error';
    el.textContent = msg;
    el.style.cssText = `
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; background: rgba(220,38,38,0.9); color: #fff;
      padding: 12px 24px; border-radius: 8px; font-size: 16px;
      font-family: -apple-system, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  // ========================
  // YouTube
  // ========================

  let ytObserver = null;
  let ytTranslatedEl = null;
  let ytLastRenderedText = '';
  let ytDebounceTimer = null;
  let ytHideTimer = null;
  let ytPositionRAF = null;
  let ytCheckInterval = null;
  let ytObservedContainer = null;
  let ytStartCheck = null;
  let ytRetryTimer = null;
  let ytLiveInFlight = 0;
  let ytStaticInFlight = 0;
  let ytPendingText = '';
  let ytLastRequestedText = '';
  let ytLastRequestAt = 0;
  let ytLastImmediateProcessAt = 0;
  let ytMode = 'static'; // static: 完整字幕, live: 实时生成滚动字幕
  let ytIncrementalHits = 0;
  let ytPrevCaptionText = '';
  let ytPrevCaptionAt = 0;
  let ytLastTrackAt = 0;
  let ytLiveAnchorLeft = null;
  let ytLiveAnchorTop = null;
  let ytLiveAnchorWidth = null;
  let ytStaticAnchorLeft = null;
  let ytStaticAnchorBottom = null;
  let ytStaticAnchorWidth = null;
  let ytAppliedMode = '';
  let ytAppliedTop = null;
  let ytAppliedBottom = null;
  let ytAppliedLeft = null;
  let ytAppliedMaxWidth = '';
  let ytHookInjected = false;
  let ytWindowMessageListening = false;
  let ytTrackCues = [];
  let ytTrackCursor = 0;
  let ytTrackLastActiveIndex = -1;
  let ytTrackTimer = null;
  let ytTrackInFlightMap = new Map();
  let ytTrackLastCueKey = '';
  let ytTrackLastPrefetchAt = 0;
  let ytTrackPrefetchQueue = [];
  let ytTrackPrefetchPos = 0;
  let ytTrackPrefetchTimer = null;
  let ytTrackSourceUrl = '';
  let ytTrackTranslatedCues = [];
  let ytTrackTranslatedCursor = 0;
  let ytTrackTranslatedUrl = '';
  let ytTrackTranslatedLang = '';
  let ytTrackCatalogTracks = [];
  let ytTrackCatalogTranslationLanguages = [];
  let ytTrackPrimaryTrack = null;
  let ytTrackSentenceGroups = [];
  let ytTrackCueToSentence = [];
  let ytLastRenderedOriginal = '';
  let ytLastRenderedTranslated = '';

  const YT_DEBOUNCE_MS_STATIC = 28;
  const YT_DEBOUNCE_MS_LIVE = 16;
  const YT_MIN_REQUEST_INTERVAL_MS_STATIC = 65;
  const YT_MIN_REQUEST_INTERVAL_MS_LIVE = 55;
  const YT_MAX_IN_FLIGHT_LIVE = 3;
  const YT_MAX_IN_FLIGHT_STATIC = 3;
  const YT_REQUEST_RETRY_FALLBACK_MS = 160;
  const YT_LIVE_IMMEDIATE_MIN_INTERVAL_MS = 38;
  const YT_LIVE_APPEND_WINDOW_MS = 900;
  const YT_LIVE_APPEND_MAX_GROWTH = 18;
  const YT_MODE_SWITCH_THRESHOLD = 3;
  const YT_LIVE_TOP_REANCHOR_DELTA = 18;
  const YT_LIVE_LEFT_REANCHOR_DELTA = 48;
  const YT_LIVE_WIDTH_REANCHOR_DELTA = 64;
  const YT_STATIC_BOTTOM_REANCHOR_DELTA = 20;
  const YT_STATIC_LEFT_REANCHOR_DELTA = 48;
  const YT_STATIC_WIDTH_REANCHOR_DELTA = 96;
  const YT_POSITION_TRACK_INTERVAL_MS = 50;
  const YT_TRACK_TICK_MS = 33;
  const YT_TRACK_MIN_CUES = 3;
  const YT_TRACK_TRANSLATED_MIN_CUES = 3;
  const YT_TRACK_PREFETCH_COUNT = 14;
  const YT_TRACK_PREFETCH_INTERVAL_MS = 60;
  const YT_TRACK_WARMUP_COUNT = 14;
  const YT_TRACK_TRANSLATED_MAX_START_DELTA_MS = 1400;
  const YT_TRACK_EARLY_RENDER_MS = 520;
  const YT_TRACK_SENTENCE_MAX_CUES = 2;
  const YT_TRACK_SENTENCE_MAX_CHARS = 82;
  const YT_TRACK_SENTENCE_MAX_GAP_MS = 520;
  const YT_TRACK_PREFETCH_CONCURRENCY = 8;
  const YT_TRACK_PREFETCH_BATCH_SIZE = 4;
  const YT_TRACK_PREFETCH_TIMER_MS = 35;

  function resetYouTubeLiveAnchor() {
    ytLiveAnchorLeft = null;
    ytLiveAnchorTop = null;
    ytLiveAnchorWidth = null;
  }

  function resetYouTubeStaticAnchor() {
    ytStaticAnchorLeft = null;
    ytStaticAnchorBottom = null;
    ytStaticAnchorWidth = null;
  }

  function resetYouTubeAppliedPosition() {
    ytAppliedMode = '';
    ytAppliedTop = null;
    ytAppliedBottom = null;
    ytAppliedLeft = null;
    ytAppliedMaxWidth = '';
    ytLastRenderedOriginal = '';
    ytLastRenderedTranslated = '';
    resetYouTubeStaticAnchor();
  }

  function resetYouTubeTrackState() {
    if (ytTrackTimer) {
      clearInterval(ytTrackTimer);
      ytTrackTimer = null;
    }
    if (ytTrackPrefetchTimer) {
      clearInterval(ytTrackPrefetchTimer);
      ytTrackPrefetchTimer = null;
    }
    ytTrackCues = [];
    ytTrackCursor = 0;
    ytTrackLastActiveIndex = -1;
    ytTrackInFlightMap.clear();
    ytTrackLastCueKey = '';
    ytTrackLastPrefetchAt = 0;
    ytTrackPrefetchQueue = [];
    ytTrackPrefetchPos = 0;
    ytTrackSourceUrl = '';
    ytTrackTranslatedCues = [];
    ytTrackTranslatedCursor = 0;
    ytTrackTranslatedUrl = '';
    ytTrackTranslatedLang = '';
    ytTrackCatalogTracks = [];
    ytTrackCatalogTranslationLanguages = [];
    ytTrackPrimaryTrack = null;
    ytTrackSentenceGroups = [];
    ytTrackCueToSentence = [];
  }

  function cleanupYouTube() {
    if (ytStartCheck) { clearInterval(ytStartCheck); ytStartCheck = null; }
    if (ytControlBtnCheckTimer) { clearInterval(ytControlBtnCheckTimer); ytControlBtnCheckTimer = null; }
    stopEnsureYouTubeNativeCaptionEnabled();
    if (ytObserver) { ytObserver.disconnect(); ytObserver = null; }
    if (ytPositionRAF) { cancelAnimationFrame(ytPositionRAF); ytPositionRAF = null; }
    if (ytCheckInterval) { clearInterval(ytCheckInterval); ytCheckInterval = null; }
    if (ytRetryTimer) { clearTimeout(ytRetryTimer); ytRetryTimer = null; }
    clearTimeout(ytDebounceTimer);
    clearTimeout(ytHideTimer);
    if (ytTranslatedEl) { ytTranslatedEl.remove(); ytTranslatedEl = null; }
    ytObservedContainer = null;
    ytLastRenderedText = '';
    ytLiveInFlight = 0;
    ytStaticInFlight = 0;
    ytPendingText = '';
    ytLastRequestedText = '';
    ytLastRequestAt = 0;
    ytLastImmediateProcessAt = 0;
    ytMode = 'static';
    ytIncrementalHits = 0;
    ytPrevCaptionText = '';
    ytPrevCaptionAt = 0;
    ytLastTrackAt = 0;
    resetYouTubeLiveAnchor();
    resetYouTubeAppliedPosition();
    resetYouTubeTrackState();
    toggleYouTubeNativeCaptionVisibility(true);
    translateVersion++; // 使进行中的翻译过期
  }

  function getYouTubeDebounceMs() {
    return ytMode === 'live' ? YT_DEBOUNCE_MS_LIVE : YT_DEBOUNCE_MS_STATIC;
  }

  function updateYouTubeCaptionMode(currentText) {
    const now = Date.now();
    const prevText = ytPrevCaptionText;
    const elapsed = now - ytPrevCaptionAt;

    const isIncrementalAppend = !!prevText &&
      currentText.startsWith(prevText) &&
      currentText.length > prevText.length &&
      (currentText.length - prevText.length) <= YT_LIVE_APPEND_MAX_GROWTH &&
      elapsed <= YT_LIVE_APPEND_WINDOW_MS;

    if (isIncrementalAppend) {
      ytIncrementalHits = Math.min(ytIncrementalHits + 1, YT_MODE_SWITCH_THRESHOLD + 2);
    } else if (currentText !== prevText) {
      ytIncrementalHits = Math.max(ytIncrementalHits - 1, 0);
    }

    const nextMode = ytIncrementalHits >= YT_MODE_SWITCH_THRESHOLD ? 'live' : 'static';
    if (nextMode !== ytMode) {
      ytMode = nextMode;
      resetYouTubeLiveAnchor();
      resetYouTubeStaticAnchor();
      console.log('[IMT] YouTube subtitle mode:', ytMode);
    }

    ytPrevCaptionText = currentText;
    ytPrevCaptionAt = now;
  }

  function ensureYouTubeHookInjected() {
    if (ytHookInjected) return;
    const existing = document.getElementById('imt-yt-main-hook');
    if (existing) {
      ytHookInjected = true;
      return;
    }

    try {
      const script = document.createElement('script');
      script.id = 'imt-yt-main-hook';
      script.src = chrome.runtime.getURL('src/content/subtitle/youtube.js');
      script.onload = function () {
        script.remove();
      };
      script.onerror = function () {
        console.warn('[IMT] Failed to inject YouTube main-world hook');
      };
      (document.head || document.documentElement).appendChild(script);
      ytHookInjected = true;
    } catch (error) {
      console.warn('[IMT] Inject YouTube hook failed:', error);
    }
  }

  function ensureYouTubeMessageListener() {
    if (ytWindowMessageListening) return;
    window.addEventListener('message', handleYouTubeMainWorldMessage);
    ytWindowMessageListening = true;
  }

  function requestYouTubeCaptionTracks() {
    window.postMessage({ type: 'imt-request-subtitle-url' }, '*');
  }

  function normalizeYouTubeCaptionText(text) {
    return String(text || '')
      .replace(/\u200b/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildYouTubeTrackCues(events) {
    const cues = [];
    let lastCue = null;

    for (const event of events) {
      const startMs = Number(event && event.tStartMs);
      if (!Number.isFinite(startMs)) continue;

      const segs = Array.isArray(event && event.segs) ? event.segs : [];
      const rawText = segs.map((seg) => (seg && seg.utf8) || '').join('');
      const text = normalizeYouTubeCaptionText(rawText);
      if (!text) continue;

      const durationMs = Number(event && event.dDurationMs);
      const endMs = startMs + Math.max(350, Number.isFinite(durationMs) ? durationMs : 1800);
      const cue = { startMs, endMs, text };

      if (
        lastCue &&
        cue.startMs <= lastCue.endMs + 120 &&
        cue.text === lastCue.text
      ) {
        lastCue.endMs = Math.max(lastCue.endMs, cue.endMs);
        continue;
      }

      cues.push(cue);
      lastCue = cue;
    }

    return cues;
  }

  function isYouTubeSentenceTerminated(text) {
    return /[.!?。！？…][\"')\]]*$/.test(String(text || '').trim());
  }

  function buildYouTubeSentenceGroupsFromCues(cues) {
    const groups = [];
    const cueToGroup = [];
    if (!Array.isArray(cues) || cues.length === 0) {
      return { groups, cueToGroup };
    }

    let current = null;
    const finalizeCurrent = function () {
      if (!current) return;
      const groupIndex = groups.length;
      groups.push(current);
      for (let idx = current.startIndex; idx <= current.endIndex; idx++) {
        cueToGroup[idx] = groupIndex;
      }
      current = null;
    };

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      if (!cue || !cue.text) continue;

      if (!current) {
        current = {
          startIndex: i,
          endIndex: i,
          startMs: cue.startMs,
          endMs: cue.endMs,
          text: cue.text,
        };
      } else {
        const prevCue = cues[i - 1];
        const gapMs = prevCue ? Math.max(0, cue.startMs - prevCue.endMs) : 0;
        const mergedText = current.text + ' ' + cue.text;
        const nextCueCount = i - current.startIndex + 1;
        const exceedsGap = gapMs > YT_TRACK_SENTENCE_MAX_GAP_MS;
        const exceedsCueCount = nextCueCount > YT_TRACK_SENTENCE_MAX_CUES;
        const exceedsChars = mergedText.length > YT_TRACK_SENTENCE_MAX_CHARS;

        if (exceedsGap || exceedsCueCount || exceedsChars) {
          finalizeCurrent();
          current = {
            startIndex: i,
            endIndex: i,
            startMs: cue.startMs,
            endMs: cue.endMs,
            text: cue.text,
          };
        } else {
          current.endIndex = i;
          current.endMs = cue.endMs;
          current.text = mergedText;
        }
      }

      const softBoundary = /[,;，；]\s*$/.test(current.text) && current.text.length >= 56;
      if (current && (isYouTubeSentenceTerminated(current.text) || softBoundary)) {
        finalizeCurrent();
      }
    }

    finalizeCurrent();
    return { groups, cueToGroup };
  }

  function normalizeYouTubeLanguageCode(code) {
    return String(code || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
  }

  function getYouTubeLanguageCandidates(targetLang) {
    const normalized = normalizeYouTubeLanguageCode(targetLang);
    if (!normalized) return [];
    const map = {
      'zh-cn': ['zh-hans', 'zh-cn', 'zh'],
      'zh-sg': ['zh-hans', 'zh-cn', 'zh'],
      'zh-hans': ['zh-hans', 'zh-cn', 'zh'],
      'zh-tw': ['zh-hant', 'zh-tw', 'zh'],
      'zh-hk': ['zh-hant', 'zh-hk', 'zh'],
      'zh-mo': ['zh-hant', 'zh-mo', 'zh'],
      'zh-hant': ['zh-hant', 'zh-tw', 'zh'],
      'pt-br': ['pt-br', 'pt'],
      'pt-pt': ['pt-pt', 'pt'],
      'en-us': ['en-us', 'en'],
      'en-gb': ['en-gb', 'en'],
      'ja-jp': ['ja-jp', 'ja'],
      'ko-kr': ['ko-kr', 'ko'],
    };
    const candidates = map[normalized] ? map[normalized].slice() : [normalized];
    const base = normalized.split('-')[0];
    if (base && !candidates.includes(base)) {
      candidates.push(base);
    }
    return candidates.filter(Boolean);
  }

  function getYouTubeUrlParam(url, key) {
    const rawUrl = String(url || '');
    const pattern = new RegExp('[?&]' + key + '=([^&#]*)', 'i');
    const match = rawUrl.match(pattern);
    if (!match || !match[1]) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, '%20'));
    } catch (_) {
      return match[1];
    }
  }

  function setYouTubeUrlParam(url, key, value) {
    const rawUrl = String(url || '');
    const encodedValue = encodeURIComponent(String(value || ''));
    const pattern = new RegExp('([?&])' + key + '=[^&#]*', 'i');
    if (pattern.test(rawUrl)) {
      return rawUrl.replace(pattern, '$1' + key + '=' + encodedValue);
    }
    const hasQuery = rawUrl.includes('?');
    return rawUrl + (hasQuery ? '&' : '?') + key + '=' + encodedValue;
  }

  function buildYouTubeTimedtextUrl(baseUrl, options = {}) {
    if (!baseUrl || typeof baseUrl !== 'string') return '';
    let url = baseUrl;
    if (!/[?&]fmt=/.test(url)) {
      url = setYouTubeUrlParam(url, 'fmt', 'json3');
    } else {
      url = setYouTubeUrlParam(url, 'fmt', 'json3');
    }
    if (options.tlang) {
      url = setYouTubeUrlParam(url, 'tlang', options.tlang);
    }
    return url;
  }

  function isSameYouTubeLanguage(a, b) {
    const x = normalizeYouTubeLanguageCode(a);
    const y = normalizeYouTubeLanguageCode(b);
    if (!x || !y) return false;
    if (x === y) return true;
    return x.split('-')[0] === y.split('-')[0];
  }

  function pickYouTubeTranslatedLanguageCode(targetLang, translationLanguages) {
    const candidates = getYouTubeLanguageCandidates(targetLang);
    if (candidates.length === 0) return '';

    if (!Array.isArray(translationLanguages) || translationLanguages.length === 0) {
      return candidates[0];
    }

    const available = translationLanguages
      .map((lang) => {
        const rawCode = String((lang && lang.languageCode) || '');
        return {
          rawCode,
          normalizedCode: normalizeYouTubeLanguageCode(rawCode),
        };
      })
      .filter((lang) => !!lang.rawCode);

    for (const candidate of candidates) {
      const hit = available.find((lang) => lang.normalizedCode === candidate);
      if (hit) return hit.rawCode;
    }

    for (const candidate of candidates) {
      const hit = available.find((lang) => {
        return lang.normalizedCode.startsWith(candidate) || candidate.startsWith(lang.normalizedCode);
      });
      if (hit) return hit.rawCode;
    }

    return candidates[0];
  }

  function selectYouTubePrimaryTrack(tracks) {
    const validTracks = Array.isArray(tracks)
      ? tracks.filter((track) => track && typeof track.baseUrl === 'string' && track.baseUrl)
      : [];
    if (validTracks.length === 0) return null;

    const preferEnTranslatable = validTracks.find((track) => {
      const code = normalizeYouTubeLanguageCode(track.languageCode);
      return code.startsWith('en') && track.isTranslatable === true;
    });
    if (preferEnTranslatable) return preferEnTranslatable;

    const preferEn = validTracks.find((track) => {
      const code = normalizeYouTubeLanguageCode(track.languageCode);
      return code.startsWith('en');
    });
    if (preferEn) return preferEn;

    const preferTranslatable = validTracks.find((track) => track.isTranslatable === true);
    if (preferTranslatable) return preferTranslatable;

    return validTracks[0];
  }

  function findCueIndexAtMsWithCursor(cues, ms, cursor) {
    if (!Number.isFinite(ms) || !Array.isArray(cues) || cues.length === 0) {
      return { index: -1, cursor: 0 };
    }

    const maxIdx = cues.length - 1;
    let idx = Math.min(Math.max(Number(cursor) || 0, 0), maxIdx);

    if (ms < cues[idx].startMs) {
      while (idx > 0 && ms < cues[idx].startMs) idx--;
    } else {
      while (idx < maxIdx && ms >= cues[idx].endMs) idx++;
    }

    if (idx >= 0 && idx <= maxIdx) {
      const cue = cues[idx];
      if (ms >= cue.startMs && ms < cue.endMs) {
        return { index: idx, cursor: idx };
      }
    }

    let lo = 0;
    let hi = maxIdx;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const cue = cues[mid];
      if (ms < cue.startMs) {
        hi = mid - 1;
      } else if (ms >= cue.endMs) {
        lo = mid + 1;
      } else {
        return { index: mid, cursor: mid };
      }
    }

    return { index: -1, cursor: idx };
  }

  function findNearestCueByStartMs(cues, targetStartMs) {
    if (!Array.isArray(cues) || cues.length === 0 || !Number.isFinite(targetStartMs)) return null;

    let lo = 0;
    let hi = cues.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const value = cues[mid].startMs;
      if (value < targetStartMs) {
        lo = mid + 1;
      } else if (value > targetStartMs) {
        hi = mid - 1;
      } else {
        return cues[mid];
      }
    }

    const right = lo < cues.length ? cues[lo] : null;
    const left = lo - 1 >= 0 ? cues[lo - 1] : null;
    if (!left) return right;
    if (!right) return left;
    return Math.abs(left.startMs - targetStartMs) <= Math.abs(right.startMs - targetStartMs)
      ? left
      : right;
  }

  function findYouTubeCueIndexAtMs(ms) {
    const result = findCueIndexAtMsWithCursor(ytTrackCues, ms, ytTrackCursor);
    ytTrackCursor = result.cursor;
    return result.index;
  }

  function findYouTubeTranslatedCueIndexAtMs(ms) {
    const result = findCueIndexAtMsWithCursor(ytTrackTranslatedCues, ms, ytTrackTranslatedCursor);
    ytTrackTranslatedCursor = result.cursor;
    return result.index;
  }

  function findYouTubeUpcomingCueIndexAtMs(ms) {
    if (!Number.isFinite(ms) || !Array.isArray(ytTrackCues) || ytTrackCues.length === 0) return -1;
    const maxIdx = ytTrackCues.length - 1;
    let idx = Math.min(Math.max(Number(ytTrackCursor) || 0, 0), maxIdx);

    if (ytTrackCues[idx].startMs < ms) {
      while (idx < maxIdx && ytTrackCues[idx].startMs < ms) idx++;
    } else {
      while (idx > 0 && ytTrackCues[idx - 1].startMs >= ms) idx--;
    }

    const cue = ytTrackCues[idx];
    if (!cue) return -1;
    const deltaMs = cue.startMs - ms;
    if (deltaMs >= 0 && deltaMs <= YT_TRACK_EARLY_RENDER_MS) return idx;
    return -1;
  }

  function canYouTubeRenderTrackPayloadFast(payload, nowMs) {
    if (!payload || !payload.textKey) return false;
    if (translatedCache.has(payload.textKey)) return true;
    if (ytTrackInFlightMap.has(payload.textKey)) return true;
    const nativeText = getYouTubeNativeTranslatedText(payload.cue, nowMs);
    return !!(nativeText && nativeText.trim());
  }

  function maybePickYouTubeEarlyNextCueIndex(activeCueIndex, nowMs) {
    if (!Number.isFinite(activeCueIndex) || activeCueIndex < 0) return activeCueIndex;
    const nextIndex = activeCueIndex + 1;
    if (nextIndex >= ytTrackCues.length) return activeCueIndex;

    const nextCue = ytTrackCues[nextIndex];
    if (!nextCue) return activeCueIndex;
    const deltaToNextMs = nextCue.startMs - nowMs;
    if (deltaToNextMs < 0 || deltaToNextMs > YT_TRACK_EARLY_RENDER_MS) return activeCueIndex;

    const nextPayload = getYouTubeTrackRenderPayload(nextIndex);
    if (!canYouTubeRenderTrackPayloadFast(nextPayload, nextCue.startMs + 80)) {
      return activeCueIndex;
    }

    return nextIndex;
  }

  function getYouTubeSentenceGroupByCueIndex(cueIndex) {
    const idx = Number(cueIndex);
    if (!Number.isFinite(idx) || idx < 0) return null;
    const groupIndex = ytTrackCueToSentence[idx];
    if (!Number.isFinite(groupIndex) || groupIndex < 0) return null;
    return ytTrackSentenceGroups[groupIndex] || null;
  }

  function getYouTubeTrackRenderPayload(cueIndex) {
    const cue = ytTrackCues[cueIndex];
    if (!cue || !cue.text) return null;

    const cueText = (cue.text || '').trim();
    if (!cueText) return null;

    // 原生翻译轨存在时使用逐 cue 对齐，减少错位
    if (hasYouTubeNativeTranslatedTrack()) {
      return {
        cue,
        textKey: cueText,
        originalText: cueText,
        cueKey: cue.startMs + '|' + cueText,
        prefetchAnchor: cueIndex,
      };
    }

    const group = getYouTubeSentenceGroupByCueIndex(cueIndex);
    if (!group || !group.text) {
      return {
        cue,
        textKey: cueText,
        originalText: cueText,
        cueKey: cue.startMs + '|' + cueText,
        prefetchAnchor: cueIndex,
      };
    }

    const mergedText = (group.text || '').trim() || cueText;
    return {
      cue,
      textKey: mergedText,
      originalText: mergedText,
      cueKey: group.startMs + '|' + mergedText,
      prefetchAnchor: group.endIndex,
    };
  }

  function hasYouTubeNativeTranslatedTrack() {
    return ytTrackTranslatedCues.length >= YT_TRACK_TRANSLATED_MIN_CUES;
  }

  function getYouTubeNativeTranslatedText(sourceCue, nowMs) {
    if (!hasYouTubeNativeTranslatedTrack()) return '';

    if (sourceCue) {
      // 重叠字幕场景下，按 startMs 做最近邻对齐比“按当前时间命中 active cue”更稳定
      const nearestCue = findNearestCueByStartMs(ytTrackTranslatedCues, sourceCue.startMs);
      if (!nearestCue) return '';
      if (Math.abs(nearestCue.startMs - sourceCue.startMs) > YT_TRACK_TRANSLATED_MAX_START_DELTA_MS) {
        return '';
      }
      return nearestCue.text || '';
    }

    const directIndex = findYouTubeTranslatedCueIndexAtMs(nowMs);
    if (directIndex >= 0) {
      return (ytTrackTranslatedCues[directIndex] && ytTrackTranslatedCues[directIndex].text) || '';
    }
    return '';
  }

  function shouldUseYouTubeTrackMode() {
    return ytTrackCues.length >= YT_TRACK_MIN_CUES;
  }

  function refreshYouTubeTrackCatalogSelection() {
    const preferredTrack = selectYouTubePrimaryTrack(ytTrackCatalogTracks);
    ytTrackPrimaryTrack = preferredTrack;
    if (!preferredTrack || !preferredTrack.baseUrl) return;

    fetchYouTubeTrackByUrl(preferredTrack.baseUrl, { kind: 'source' });

    const translatedLang = pickYouTubeTranslatedLanguageCode(
      cachedTargetLang,
      ytTrackCatalogTranslationLanguages
    );
    const canUseNativeTranslatedTrack =
      preferredTrack.isTranslatable === true &&
      !!translatedLang &&
      !isSameYouTubeLanguage(preferredTrack.languageCode, translatedLang);

    if (canUseNativeTranslatedTrack) {
      fetchYouTubeTrackByUrl(preferredTrack.baseUrl, {
        kind: 'translated',
        tlang: translatedLang,
      });
      return;
    }

    ytTrackTranslatedCues = [];
    ytTrackTranslatedCursor = 0;
    ytTrackTranslatedUrl = '';
    ytTrackTranslatedLang = '';
  }

  function requestYouTubeTrackTranslation(textKey) {
    const key = (textKey || '').trim();
    if (!key) return Promise.resolve({ text: '', version: -1 });
    if (translatedCache.has(key)) {
      return Promise.resolve({ text: translatedCache.get(key), version: -1 });
    }

    const pending = ytTrackInFlightMap.get(key);
    if (pending) return pending;

    const request = translateText(key)
      .finally(() => {
        if (ytTrackInFlightMap.get(key) === request) {
          ytTrackInFlightMap.delete(key);
        }
        if (ytTrackPrefetchTimer && ytTrackPrefetchPos < ytTrackPrefetchQueue.length) {
          pumpYouTubeTrackPrefetchQueue();
        }
      });
    ytTrackInFlightMap.set(key, request);
    return request;
  }

  function stopYouTubeTrackPrefetchQueue() {
    if (ytTrackPrefetchTimer) {
      clearInterval(ytTrackPrefetchTimer);
      ytTrackPrefetchTimer = null;
    }
    ytTrackPrefetchQueue = [];
    ytTrackPrefetchPos = 0;
  }

  function buildYouTubeTrackPrefetchKeys(startIndex) {
    const begin = Math.max(0, Number(startIndex) || 0);
    const keys = [];
    const seen = new Set();

    const pushKey = function (rawText) {
      const key = (rawText || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      keys.push(key);
    };

    if (ytTrackSentenceGroups.length && ytTrackCueToSentence.length) {
      const groupStartRaw = Number(ytTrackCueToSentence[begin]);
      const groupStart = Number.isFinite(groupStartRaw) ? Math.max(0, groupStartRaw) : 0;
      if (groupStart > 0) {
        pushKey(ytTrackSentenceGroups[groupStart - 1] && ytTrackSentenceGroups[groupStart - 1].text);
      }
      for (let i = groupStart; i < ytTrackSentenceGroups.length; i++) {
        pushKey(ytTrackSentenceGroups[i] && ytTrackSentenceGroups[i].text);
      }
      return keys;
    }

    for (let i = begin; i < ytTrackCues.length; i++) {
      pushKey(ytTrackCues[i] && ytTrackCues[i].text);
    }
    return keys;
  }

  function pumpYouTubeTrackPrefetchQueue() {
    if (!subtitleEnabled || !shouldUseYouTubeTrackMode() || hasYouTubeNativeTranslatedTrack()) {
      stopYouTubeTrackPrefetchQueue();
      return;
    }
    if (!ytTrackPrefetchQueue.length) return;

    let dispatched = 0;
    while (
      dispatched < YT_TRACK_PREFETCH_BATCH_SIZE &&
      ytTrackPrefetchPos < ytTrackPrefetchQueue.length
    ) {
      if (ytTrackInFlightMap.size >= YT_TRACK_PREFETCH_CONCURRENCY) break;
      const key = ytTrackPrefetchQueue[ytTrackPrefetchPos++];
      if (!key || translatedCache.has(key) || ytTrackInFlightMap.has(key)) continue;
      dispatched++;
      requestYouTubeTrackTranslation(key).catch(() => {});
    }

    if (ytTrackPrefetchPos >= ytTrackPrefetchQueue.length && ytTrackInFlightMap.size === 0) {
      stopYouTubeTrackPrefetchQueue();
    }
  }

  function startYouTubeTrackPrefetchQueue(startIndex) {
    if (!shouldUseYouTubeTrackMode() || hasYouTubeNativeTranslatedTrack()) {
      stopYouTubeTrackPrefetchQueue();
      return;
    }
    ytTrackPrefetchQueue = buildYouTubeTrackPrefetchKeys(startIndex);
    ytTrackPrefetchPos = 0;
    if (!ytTrackPrefetchQueue.length) return;

    if (ytTrackPrefetchTimer) {
      clearInterval(ytTrackPrefetchTimer);
      ytTrackPrefetchTimer = null;
    }

    pumpYouTubeTrackPrefetchQueue();
    if (ytTrackPrefetchPos < ytTrackPrefetchQueue.length) {
      ytTrackPrefetchTimer = setInterval(
        pumpYouTubeTrackPrefetchQueue,
        YT_TRACK_PREFETCH_TIMER_MS
      );
    }
  }

  function warmupYouTubeTrackAround(startIndex) {
    if (!shouldUseYouTubeTrackMode()) return;
    if (hasYouTubeNativeTranslatedTrack()) return;
    const begin = Math.max(0, Number(startIndex) || 0);

    if (ytTrackSentenceGroups.length && ytTrackCueToSentence.length) {
      const groupStart = Number(ytTrackCueToSentence[begin]);
      const startGroup = Number.isFinite(groupStart) ? Math.max(0, groupStart) : 0;
      const endGroup = Math.min(
        ytTrackSentenceGroups.length - 1,
        startGroup + YT_TRACK_WARMUP_COUNT - 1
      );
      for (let i = startGroup; i <= endGroup; i++) {
        const textKey = (ytTrackSentenceGroups[i] && ytTrackSentenceGroups[i].text || '').trim();
        if (!textKey || translatedCache.has(textKey)) continue;
        requestYouTubeTrackTranslation(textKey).catch(() => {});
      }
      return;
    }

    const endCue = Math.min(ytTrackCues.length - 1, begin + YT_TRACK_WARMUP_COUNT - 1);
    for (let i = begin; i <= endCue; i++) {
      const textKey = (ytTrackCues[i] && ytTrackCues[i].text || '').trim();
      if (!textKey || translatedCache.has(textKey)) continue;
      requestYouTubeTrackTranslation(textKey).catch(() => {});
    }
  }

  function maybePrefetchYouTubeTrack(cueIndex, prefetchAnchorIndex) {
    if (!shouldUseYouTubeTrackMode()) return;
    if (hasYouTubeNativeTranslatedTrack()) return;
    const now = Date.now();
    if (now - ytTrackLastPrefetchAt < YT_TRACK_PREFETCH_INTERVAL_MS) return;
    ytTrackLastPrefetchAt = now;

    if (ytTrackSentenceGroups.length && ytTrackCueToSentence.length) {
      const safeAnchor = Math.max(0, Number(prefetchAnchorIndex));
      const groupIndexRaw = Number(
        ytTrackCueToSentence[Number.isFinite(safeAnchor) ? safeAnchor : cueIndex]
      );
      const startGroup = Number.isFinite(groupIndexRaw) ? groupIndexRaw : 0;
      let prefetchedGroups = 0;
      for (let i = startGroup + 1; i < ytTrackSentenceGroups.length; i++) {
        if (prefetchedGroups >= YT_TRACK_PREFETCH_COUNT) break;
        const textKey = (ytTrackSentenceGroups[i].text || '').trim();
        if (!textKey) continue;
        if (translatedCache.has(textKey) || ytTrackInFlightMap.has(textKey)) continue;
        prefetchedGroups++;
        requestYouTubeTrackTranslation(textKey).catch(() => {});
      }
      return;
    }

    let prefetched = 0;
    for (let i = cueIndex + 1; i < ytTrackCues.length; i++) {
      if (prefetched >= YT_TRACK_PREFETCH_COUNT) break;
      const textKey = (ytTrackCues[i].text || '').trim();
      if (!textKey) continue;
      if (translatedCache.has(textKey) || ytTrackInFlightMap.has(textKey)) continue;

      prefetched++;
      requestYouTubeTrackTranslation(textKey).catch(() => {});
    }
  }

  function renderYouTubeTrackCue(payload, nowMs) {
    const cue = payload && payload.cue;
    const cueKey = (payload && payload.cueKey) || '';
    const textKey = (payload && payload.textKey || '').trim();
    const originalText = (payload && payload.originalText || textKey).trim();
    if (!textKey) return;

    const nativeTranslatedText = getYouTubeNativeTranslatedText(cue, nowMs);
    if (nativeTranslatedText) {
      ytLastRenderedText = textKey;
      showYTTranslation(nativeTranslatedText, originalText);
      return;
    }

    if (translatedCache.has(textKey)) {
      ytLastRenderedText = textKey;
      showYTTranslation(translatedCache.get(textKey), originalText);
      return;
    }

    requestYouTubeTrackTranslation(textKey)
      .then((result) => {
        const translatedText = (result && result.text) || translatedCache.get(textKey) || '';
        if (!translatedText) return;
        const video = document.querySelector('video');
        if (!video || !Number.isFinite(video.currentTime)) return;

        const activeIndex = findYouTubeCueIndexAtMs(video.currentTime * 1000);
        if (activeIndex < 0) return;
        const activePayload = getYouTubeTrackRenderPayload(activeIndex);
        if (!activePayload) return;
        const stillRelevant =
          activePayload.cueKey === cueKey ||
          activePayload.textKey === textKey ||
          activePayload.originalText === originalText;
        if (!stillRelevant) return;

        ytLastRenderedText = textKey;
        showYTTranslation(translatedText, originalText);
      })
      .catch((error) => {
        console.error('[IMT] YouTube track translation error:', error);
      });
  }

  function tickYouTubeTrackLoop() {
    if (!subtitleEnabled || !ytTranslatedEl) return;
    if (!shouldUseYouTubeTrackMode()) return;

    const video = document.querySelector('video');
    if (!video || !Number.isFinite(video.currentTime)) return;

    const nowMs = video.currentTime * 1000;
    let cueIndex = findYouTubeCueIndexAtMs(nowMs);
    if (cueIndex >= 0) {
      cueIndex = maybePickYouTubeEarlyNextCueIndex(cueIndex, nowMs);
    } else {
      cueIndex = findYouTubeUpcomingCueIndexAtMs(nowMs);
    }
    if (cueIndex < 0) {
      if (ytTrackLastCueKey) {
        ytTrackLastCueKey = '';
        if (ytTranslatedEl) {
          ytTranslatedEl.style.opacity = '0';
          setTimeout(function () {
            if (ytTranslatedEl) ytTranslatedEl.style.display = 'none';
          }, 120);
        }
      }
      ytLastRenderedOriginal = '';
      ytLastRenderedTranslated = '';
      ytTrackLastActiveIndex = -1;
      return;
    }

    if (
      ytTrackLastActiveIndex >= 0 &&
      Math.abs(cueIndex - ytTrackLastActiveIndex) > 6
    ) {
      warmupYouTubeTrackAround(cueIndex);
      startYouTubeTrackPrefetchQueue(cueIndex);
    }
    ytTrackLastActiveIndex = cueIndex;
    ytTrackCursor = cueIndex;
    ytMode = 'static';

    const payload = getYouTubeTrackRenderPayload(cueIndex);
    if (!payload || !payload.textKey) return;

    const cueKey = payload.cueKey;
    const cueTextKey = payload.textKey;
    if (cueKey !== ytTrackLastCueKey) {
      ytTrackLastCueKey = cueKey;
      renderYouTubeTrackCue(payload, nowMs);
    } else if (cueTextKey && ytLastRenderedText !== cueTextKey) {
      renderYouTubeTrackCue(payload, nowMs);
    }
    maybePrefetchYouTubeTrack(cueIndex, payload.prefetchAnchor);
  }

  function startYouTubeTrackLoop() {
    if (ytTrackTimer) return;
    ytTrackTimer = setInterval(tickYouTubeTrackLoop, YT_TRACK_TICK_MS);
  }

  function handleYouTubeTrackEvents(url, events, options = {}) {
    const hintedLang = String(options.tlang || '');
    const kind = options.kind === 'translated' || getYouTubeUrlParam(url, 'tlang')
      ? 'translated'
      : 'source';
    const cues = buildYouTubeTrackCues(events);
    const minCues = kind === 'translated' ? YT_TRACK_TRANSLATED_MIN_CUES : YT_TRACK_MIN_CUES;
    if (cues.length < minCues) return;

    if (kind === 'translated') {
      const prevLast = ytTrackTranslatedCues.length
        ? ytTrackTranslatedCues[ytTrackTranslatedCues.length - 1]
        : null;
      const nextLast = cues[cues.length - 1];
      const sameSource = !!url && url === ytTrackTranslatedUrl;
      if (
        sameSource &&
        ytTrackTranslatedCues.length === cues.length &&
        prevLast &&
        nextLast &&
        prevLast.startMs === nextLast.startMs &&
        prevLast.text === nextLast.text
      ) {
        return;
      }

      ytTrackTranslatedCues = cues;
      ytTrackTranslatedCursor = 0;
      ytTrackTranslatedUrl = typeof url === 'string' ? url : ytTrackTranslatedUrl;
      ytTrackTranslatedLang = hintedLang || getYouTubeUrlParam(url, 'tlang') || ytTrackTranslatedLang;
      ytTrackLastCueKey = '';
      stopYouTubeTrackPrefetchQueue();
      return;
    }

    const prevLast = ytTrackCues.length ? ytTrackCues[ytTrackCues.length - 1] : null;
    const nextLast = cues[cues.length - 1];
    const sameSource = !!url && url === ytTrackSourceUrl;
    if (
      sameSource &&
      ytTrackCues.length === cues.length &&
      prevLast &&
      nextLast &&
      prevLast.startMs === nextLast.startMs &&
      prevLast.text === nextLast.text
    ) {
      return;
    }

    ytTrackCues = cues;
    ytTrackCursor = 0;
    ytTrackLastCueKey = '';
    ytTrackSourceUrl = typeof url === 'string' ? url : ytTrackSourceUrl;
    const sentenceData = buildYouTubeSentenceGroupsFromCues(cues);
    ytTrackSentenceGroups = sentenceData.groups;
    ytTrackCueToSentence = sentenceData.cueToGroup;

    const video = document.querySelector('video');
    if (video && Number.isFinite(video.currentTime)) {
      const active = findYouTubeCueIndexAtMs(video.currentTime * 1000);
      if (active >= 0) ytTrackCursor = active;
    }

    warmupYouTubeTrackAround(ytTrackCursor);
    startYouTubeTrackPrefetchQueue(ytTrackCursor);
    startYouTubeTrackLoop();
  }

  async function fetchYouTubeTrackByUrl(baseUrl, options = {}) {
    if (!baseUrl || typeof baseUrl !== 'string') return;
    const kind = options.kind === 'translated' ? 'translated' : 'source';
    const url = buildYouTubeTimedtextUrl(baseUrl, {
      tlang: kind === 'translated' ? options.tlang : '',
    });
    if (!url) return;

    if (kind === 'source' && ytTrackSourceUrl === url && ytTrackCues.length >= YT_TRACK_MIN_CUES) return;
    if (
      kind === 'translated' &&
      ytTrackTranslatedUrl === url &&
      ytTrackTranslatedCues.length >= YT_TRACK_TRANSLATED_MIN_CUES
    ) {
      return;
    }

    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      if (data && Array.isArray(data.events)) {
        handleYouTubeTrackEvents(url, data.events, {
          kind,
          tlang: options.tlang || getYouTubeUrlParam(url, 'tlang'),
        });
      }
    } catch (error) {
      console.warn('[IMT] Fetch YouTube track failed:', error);
    }
  }

  function handleYouTubeMainWorldMessage(event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'imt-youtube-subtitle' && Array.isArray(data.events)) {
      const msgUrl = String(data.url || '');
      const tlang = getYouTubeUrlParam(msgUrl, 'tlang');
      handleYouTubeTrackEvents(msgUrl, data.events, {
        kind: tlang ? 'translated' : 'source',
        tlang,
      });
      return;
    }

    if (data.type === 'imt-youtube-caption-tracks' && Array.isArray(data.tracks)) {
      ytTrackCatalogTracks = data.tracks;
      ytTrackCatalogTranslationLanguages = Array.isArray(data.translationLanguages)
        ? data.translationLanguages
        : [];
      refreshYouTubeTrackCatalogSelection();
    }
  }

  function startYouTubeObserver() {
    // 彻底清理旧状态（包括之前的 startCheck）
    cleanupYouTube();

    ytStartCheck = setInterval(() => {
      const container = document.querySelector('.ytp-caption-window-container');
      if (!container) return;
      clearInterval(ytStartCheck);
      ytStartCheck = null;
      setupYouTubeObserver(container);
    }, 500);
  }

  function setupYouTubeObserver(container) {
    const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (!player) return;

    ytObservedContainer = container;

    // 译文元素 — fixed 定位，完全独立于字幕容器
    ytTranslatedEl = document.createElement('div');
    ytTranslatedEl.id = 'imt-yt-translated';
    ytTranslatedEl.style.cssText = `
      position: fixed;
      top: 80%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      text-align: center;
      pointer-events: none;
      font-size: max(1.35vw, 16px);
      line-height: 1.34;
      color: #fff;
      text-shadow: 0 0 2px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.88);
      background: transparent;
      padding: 0;
      border-radius: 0;
      font-family: "YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, sans-serif;
      font-weight: 500;
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.15s;
      display: none;
      max-width: 90vw;
    `;
    document.body.appendChild(ytTranslatedEl);

    // MutationObserver 观察字幕变化
    ytObserver = new MutationObserver(() => {
      clearTimeout(ytDebounceTimer);
      ytDebounceTimer = setTimeout(processYouTubeCaption, getYouTubeDebounceMs());
      if (ytMode === 'live') {
        const now = Date.now();
        if (now - ytLastImmediateProcessAt >= YT_LIVE_IMMEDIATE_MIN_INTERVAL_MS) {
          ytLastImmediateProcessAt = now;
          processYouTubeCaption();
        }
      }
    });
    ytObserver.observe(container, { childList: true, subtree: true, characterData: true, characterDataOldValue: false });

    // rAF 持续跟随字幕位置
    startPositionTracking();
    initSubtitleToggleButton();
    ensureYouTubeHookInjected();
    ensureYouTubeMessageListener();
    setTimeout(requestYouTubeCaptionTracks, 120);

    // 健康检查：每 3 秒验证 observer 仍连接到活跃的 DOM
    ytCheckInterval = setInterval(() => {
      if (!ytObservedContainer || !ytObservedContainer.isConnected) {
        console.log('[IMT] Caption container disconnected, restarting...');
        startYouTubeObserver();
      }
    }, 3000);

    console.log('[IMT] YouTube caption observer started');
  }

  /**
   * 用 requestAnimationFrame 持续追踪原生字幕位置
   * 这样不管字幕怎么移动（进度条弹出、全屏切换等），译文都紧贴其下方
   */
  function startPositionTracking() {
    function track(ts) {
      if (!ytTranslatedEl) return;
      if (ytLastTrackAt && ts - ytLastTrackAt < YT_POSITION_TRACK_INTERVAL_MS) {
        ytPositionRAF = requestAnimationFrame(track);
        return;
      }
      ytLastTrackAt = ts;

      // 找到实际可见的字幕窗口
      const captionWindows = document.querySelectorAll('.caption-window');
      let captionEl = null;
      for (const w of captionWindows) {
        if (w.offsetHeight > 0 && w.offsetWidth > 0) {
          captionEl = w;
        }
      }
      if (!captionEl) {
        captionEl = document.querySelector('.ytp-caption-window-bottom');
      }

      // 始终追踪位置（不管是否可见），这样显示时位置已经就位
      if (captionEl) {
        const rect = captionEl.getBoundingClientRect();
        if (rect.height > 0) {
          const playerEl = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
          const playerRect = playerEl ? playerEl.getBoundingClientRect() : null;
          const hasPlayerRect = !!playerRect && playerRect.width > 0 && playerRect.height > 0;
          const playerLeftBound = hasPlayerRect ? Math.round(playerRect.left) : 8;
          const playerRightBound = hasPlayerRect ? Math.round(playerRect.right) : Math.round(window.innerWidth - 8);
          const playerInnerWidth = Math.max(260, playerRightBound - playerLeftBound - 16);

          // 默认 static 居中替换；仅在保留原字幕时 live 使用偏左布局
          if (ytMode === 'live' && !document.documentElement.classList.contains('imt-yt-caption-replace')) {
            resetYouTubeStaticAnchor();
            const viewportMaxWidth = Math.max(
              260,
              Math.min(Math.round(window.innerWidth * 0.9), playerInnerWidth)
            );
            const targetTop = rect.top;
            const targetLeft = Math.max(playerLeftBound + 8, rect.left + 10);
            const targetWidth = Math.max(260, Math.min(viewportMaxWidth, Math.round(rect.width * 1.0)));

            if (
              ytLiveAnchorTop == null ||
              Math.abs(targetTop - ytLiveAnchorTop) >= YT_LIVE_TOP_REANCHOR_DELTA
            ) {
              ytLiveAnchorTop = targetTop;
            }
            if (
              ytLiveAnchorLeft == null ||
              Math.abs(targetLeft - ytLiveAnchorLeft) >= YT_LIVE_LEFT_REANCHOR_DELTA
            ) {
              ytLiveAnchorLeft = targetLeft;
            }
            if (
              ytLiveAnchorWidth == null ||
              Math.abs(targetWidth - ytLiveAnchorWidth) >= YT_LIVE_WIDTH_REANCHOR_DELTA
            ) {
              ytLiveAnchorWidth = targetWidth;
            }

            const nextTop = Math.round(ytLiveAnchorTop);
            const nextWidth = Math.max(260, Math.min(viewportMaxWidth, Math.round(ytLiveAnchorWidth)));
            const minLeft = playerLeftBound + 8;
            const maxLeft = Math.max(minLeft, playerRightBound - nextWidth - 8);
            const nextLeft = Math.max(minLeft, Math.min(Math.round(ytLiveAnchorLeft), maxLeft));
            const nextMaxWidth = nextWidth + 'px';
            if (ytAppliedMode !== 'live') {
              ytTranslatedEl.style.transform = 'none';
              ytTranslatedEl.style.textAlign = 'left';
              ytAppliedMode = 'live';
            }
            if (ytAppliedBottom !== null) {
              ytTranslatedEl.style.bottom = 'auto';
              ytAppliedBottom = null;
            }
            if (ytAppliedTop !== nextTop) {
              ytTranslatedEl.style.top = nextTop + 'px';
              ytAppliedTop = nextTop;
            }
            if (ytAppliedLeft !== nextLeft) {
              ytTranslatedEl.style.left = nextLeft + 'px';
              ytAppliedLeft = nextLeft;
            }
            if (ytAppliedMaxWidth !== nextMaxWidth) {
              ytTranslatedEl.style.maxWidth = nextMaxWidth;
              ytAppliedMaxWidth = nextMaxWidth;
            }
          } else {
            resetYouTubeLiveAnchor();
            const viewportMaxWidth = Math.max(
              260,
              Math.min(Math.round(window.innerWidth * 0.9), playerInnerWidth)
            );
            const targetBottom = Math.round(window.innerHeight - rect.bottom);
            const targetLeft = Math.round(rect.left + rect.width / 2);
            const targetWidth = Math.max(260, Math.min(viewportMaxWidth, Math.round(rect.width * 1.0)));
            if (
              ytStaticAnchorBottom == null ||
              Math.abs(targetBottom - ytStaticAnchorBottom) >= YT_STATIC_BOTTOM_REANCHOR_DELTA
            ) {
              ytStaticAnchorBottom = targetBottom;
            }
            if (
              ytStaticAnchorLeft == null ||
              Math.abs(targetLeft - ytStaticAnchorLeft) >= YT_STATIC_LEFT_REANCHOR_DELTA
            ) {
              ytStaticAnchorLeft = targetLeft;
            }
            if (
              ytStaticAnchorWidth == null ||
              Math.abs(targetWidth - ytStaticAnchorWidth) >= YT_STATIC_WIDTH_REANCHOR_DELTA
            ) {
              ytStaticAnchorWidth = targetWidth;
            }
            const nextBottom = ytStaticAnchorBottom;
            const nextWidth = Math.max(260, Math.min(viewportMaxWidth, Math.round(ytStaticAnchorWidth)));
            const half = Math.round(nextWidth / 2);
            const minCenter = playerLeftBound + half + 8;
            const maxCenter = playerRightBound - half - 8;
            const nextLeft = Math.max(minCenter, Math.min(Math.round(ytStaticAnchorLeft), maxCenter));
            const nextMaxWidth = nextWidth + 'px';
            // 译文与原字幕同位置（替换显示）
            if (ytAppliedMode !== 'static') {
              ytTranslatedEl.style.transform = 'translateX(-50%)';
              ytTranslatedEl.style.textAlign = 'center';
              ytAppliedMode = 'static';
            }
            if (ytAppliedTop !== null) {
              ytTranslatedEl.style.top = 'auto';
              ytAppliedTop = null;
            }
            if (ytAppliedBottom !== nextBottom) {
              ytTranslatedEl.style.bottom = nextBottom + 'px';
              ytAppliedBottom = nextBottom;
            }
            if (ytAppliedLeft !== nextLeft) {
              ytTranslatedEl.style.left = nextLeft + 'px';
              ytAppliedLeft = nextLeft;
            }
            if (ytAppliedMaxWidth !== nextMaxWidth) {
              ytTranslatedEl.style.maxWidth = nextMaxWidth;
              ytAppliedMaxWidth = nextMaxWidth;
            }
          }
        }
      }

      ytPositionRAF = requestAnimationFrame(track);
    }

    ytPositionRAF = requestAnimationFrame(track);
  }

  function normalizeYouTubeCaptionCompareText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[.,!?;:，。！？；：“”"'`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isYouTubeLiveTextStillRelevant(requestText, latestText, isLiveMode) {
    const requested = normalizeYouTubeCaptionText(requestText);
    const latest = normalizeYouTubeCaptionText(latestText);
    if (!requested || !latest) return false;
    if (requested === latest) return true;
    if (latest.startsWith(requested) || requested.startsWith(latest)) return true;

    if (isLiveMode) {
      const reqWords = requested.split(' ');
      const latestWords = latest.split(' ');
      const reqTail = reqWords.slice(-6).join(' ');
      const latestTail = latestWords.slice(-6).join(' ');
      if (reqTail && latest.includes(reqTail)) return true;
      if (latestTail && requested.includes(latestTail)) return true;
    }

    const compactRequested = normalizeYouTubeCaptionCompareText(requested);
    const compactLatest = normalizeYouTubeCaptionCompareText(latest);
    if (!compactRequested || !compactLatest) return false;
    if (compactRequested === compactLatest) return true;
    if (compactLatest.startsWith(compactRequested) || compactRequested.startsWith(compactLatest)) {
      return true;
    }
    return false;
  }

  function shouldKeepYouTubeCaptionSingleLine(text, lang) {
    const normalized = normalizeYouTubeCaptionText(text);
    if (!normalized) return false;
    const code = String(lang || '').toLowerCase();

    if (code === 'en') {
      if (normalized.length <= 68) return true;
      const words = normalized.split(' ').filter(Boolean);
      return words.length <= 11 && normalized.length <= 86;
    }

    return normalized.length <= 42;
  }

  async function processYouTubeCaption() {
    if (!subtitleEnabled || !ytTranslatedEl) return;

    const segments = document.querySelectorAll('.ytp-caption-segment');
    const currentText = Array.from(segments).map(function (s) { return s.textContent; }).join(' ').trim();

    if (currentText) {
      updateYouTubeCaptionMode(currentText);
    }
    if (shouldUseYouTubeTrackMode()) {
      ytMode = 'static';
      return;
    }

    if (!currentText) {
      // 延迟隐藏，避免字幕切换间隙闪烁
      clearTimeout(ytHideTimer);
      ytHideTimer = setTimeout(function () {
        if (ytTranslatedEl) {
          ytTranslatedEl.style.opacity = '0';
          setTimeout(function () {
            if (ytTranslatedEl) ytTranslatedEl.style.display = 'none';
          }, 150);
        }
      }, 300);
      ytLastRenderedText = '';
      ytLiveInFlight = 0;
      ytStaticInFlight = 0;
      ytPendingText = '';
      ytLastRequestedText = '';
      ytLastRequestAt = 0;
      if (ytRetryTimer) {
        clearTimeout(ytRetryTimer);
        ytRetryTimer = null;
      }
      ytMode = 'static';
      ytIncrementalHits = 0;
      ytPrevCaptionText = '';
      ytPrevCaptionAt = 0;
      resetYouTubeLiveAnchor();
      resetYouTubeAppliedPosition();
      return;
    }

    clearTimeout(ytHideTimer);

    // 缓存命中 → 立即显示
    var cacheKey = currentText.trim();
    if (translatedCache.has(cacheKey)) {
      ytLastRenderedText = currentText;
      showYTTranslation(translatedCache.get(cacheKey), currentText);
      return;
    }

    const isLiveMode = ytMode === 'live';
    if (isLiveMode && ytLiveInFlight >= YT_MAX_IN_FLIGHT_LIVE) {
      ytPendingText = currentText;
      return;
    }
    if (!isLiveMode && ytStaticInFlight >= YT_MAX_IN_FLIGHT_STATIC) {
      ytPendingText = currentText;
      return;
    }

    const minInterval = isLiveMode
      ? YT_MIN_REQUEST_INTERVAL_MS_LIVE
      : YT_MIN_REQUEST_INTERVAL_MS_STATIC;
    const sinceLastRequest = Date.now() - ytLastRequestAt;

    if (currentText === ytLastRenderedText) return;
    if (currentText === ytLastRequestedText && sinceLastRequest < minInterval) return;

    if (isLiveMode) {
      ytLiveInFlight++;
    } else {
      ytStaticInFlight++;
    }
    ytLastRequestedText = currentText;
    ytLastRequestAt = Date.now();
    if (ytRetryTimer) {
      clearTimeout(ytRetryTimer);
      ytRetryTimer = null;
    }

    // 不隐藏旧译文 — 保持显示上一条翻译直到新翻译完成
    let latestText = '';
    let gotTranslation = false;
    try {
      var result = await translateText(currentText);
      latestText = Array.from(document.querySelectorAll('.ytp-caption-segment'))
        .map(function (s) { return s.textContent; })
        .join(' ')
        .trim();

      const stillRelevant = isYouTubeLiveTextStillRelevant(currentText, latestText, ytMode === 'live');
      if (stillRelevant && result.text) {
        gotTranslation = true;
        ytLastRenderedText = currentText;
        showYTTranslation(result.text, currentText);
      }
    } catch (error) {
      console.error('[IMT] YouTube subtitle processing error:', error);
    } finally {
      if (isLiveMode) {
        ytLiveInFlight = Math.max(0, ytLiveInFlight - 1);
      } else {
        ytStaticInFlight = Math.max(0, ytStaticInFlight - 1);
      }
      if (ytPendingText) {
        const pending = ytPendingText;
        ytPendingText = '';
        if (pending !== ytLastRequestedText) {
          setTimeout(processYouTubeCaption, 0);
        }
      } else if (
        !gotTranslation &&
        latestText &&
        isYouTubeLiveTextStillRelevant(currentText, latestText, ytMode === 'live')
      ) {
        const cooldownDelay = Math.max(0, errorPausedUntil - Date.now());
        const retryDelay = cooldownDelay > 0
          ? cooldownDelay + 80
          : Math.max(minInterval, YT_REQUEST_RETRY_FALLBACK_MS);
        ytRetryTimer = setTimeout(function () {
          ytRetryTimer = null;
          processYouTubeCaption();
        }, retryDelay);
      }
    }
  }

  function showYTTranslation(translatedText, originalText) {
    if (!ytTranslatedEl || !translatedText) return;

    const zhText = normalizeYouTubeCaptionText(translatedText);
    if (!zhText) return;
    const enText = normalizeYouTubeCaptionText(originalText || '');

    if (ytLastRenderedTranslated !== zhText || ytLastRenderedOriginal !== enText) {
      ytTranslatedEl.textContent = '';
      const wrap = document.createElement('div');
      wrap.className = 'imt-yt-caption-wrap';

      const zhLine = document.createElement('div');
      zhLine.className = 'imt-yt-caption-line imt-yt-caption-zh';
      zhLine.textContent = zhText;
      if (shouldKeepYouTubeCaptionSingleLine(zhText, 'zh')) {
        zhLine.classList.add('imt-yt-nowrap');
      }
      wrap.appendChild(zhLine);

      if (enText && enText !== zhText) {
        const enLine = document.createElement('div');
        enLine.className = 'imt-yt-caption-line imt-yt-caption-en';
        enLine.textContent = enText;
        wrap.appendChild(enLine);
      }

      ytTranslatedEl.appendChild(wrap);
      ytLastRenderedTranslated = zhText;
      ytLastRenderedOriginal = enText;
    }

    ytTranslatedEl.style.display = 'block';
    ytTranslatedEl.style.opacity = '1';
  }

  function watchYouTubePlayerChanges() {
    // 监听 YouTube SPA 导航事件（视频切换时触发）
    document.addEventListener('yt-navigate-finish', () => {
      console.log('[IMT] YouTube SPA navigation detected, restarting observer...');
      errorCount = 0;
      errorPausedUntil = 0;
      startYouTubeObserver();
    });

    // 备用：监听 URL 变化（popstate）
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        console.log('[IMT] popstate detected, restarting observer...');
        startYouTubeObserver();
      }, 1000);
    });
  }

  // ========================
  // 初始化
  // ========================

  chrome.storage.local.get(['enableSubtitle'], function (result) {
    subtitleEnabled = result.enableSubtitle === true;
    initSubtitleToggleButton();
    if (!subtitleEnabled) return;

    if (isYouTube) {
      startYouTubeObserver();
      watchYouTubePlayerChanges();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enableSubtitle) {
      subtitleEnabled = changes.enableSubtitle.newValue === true;
      updateSubtitleToggleButton();
      if (!subtitleEnabled) {
        if (isYouTube) cleanupYouTube();
      } else if (isYouTube && !ytObserver && !ytStartCheck) {
        // 重新启用时重启 observer
        startYouTubeObserver();
      }
    }
    if (changes.translationService) {
      cachedService = changes.translationService.newValue || 'google';
      errorCount = 0;
      errorPausedUntil = 0;
      translatedCache.clear();
    }
    if (changes.targetLanguage) {
      cachedTargetLang = changes.targetLanguage.newValue || 'zh-CN';
      translatedCache.clear();
      ytTrackTranslatedCues = [];
      ytTrackTranslatedCursor = 0;
      ytTrackTranslatedUrl = '';
      ytTrackTranslatedLang = '';
      ytTrackLastCueKey = '';
      if (isYouTube && subtitleEnabled) {
        if (ytTrackCatalogTracks.length) {
          refreshYouTubeTrackCatalogSelection();
        } else {
          requestYouTubeCaptionTracks();
        }
      }
    }
    if (changes.serviceConfigs) {
      errorCount = 0;
      errorPausedUntil = 0;
      translatedCache.clear();
    }
  });

  window.addEventListener('beforeunload', () => {
    cleanupYouTube();
  });

  console.log('[IMT] Subtitle content script loaded');
})();
