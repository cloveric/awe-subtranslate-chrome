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

  // 缓存设置
  let cachedService = 'google';
  let cachedTargetLang = 'zh-CN';

  const isYouTube = location.hostname.includes('youtube.com');

  function updateSubtitleToggleButton() {
    if (!subtitleToggleBtn) return;
    subtitleToggleBtn.classList.toggle('imt-active', subtitleEnabled);
    subtitleToggleBtn.classList.remove('imt-busy');
    subtitleToggleBtn.textContent = '译';
    subtitleToggleBtn.title = subtitleEnabled
      ? '视频字幕翻译已开启，点击关闭'
      : '视频字幕翻译已关闭，点击开启';
  }

  function initSubtitleToggleButton() {
    if (!isYouTube) return;
    if (subtitleToggleBtn && subtitleToggleBtn.isConnected) {
      updateSubtitleToggleButton();
      return;
    }

    subtitleToggleBtn = document.querySelector('.imt-float-btn.imt-subtitle-toggle');
    if (!subtitleToggleBtn) {
      subtitleToggleBtn = document.createElement('button');
      subtitleToggleBtn.className = 'imt-float-btn imt-subtitle-toggle';
      subtitleToggleBtn.type = 'button';
      subtitleToggleBtn.textContent = '译';
      document.body.appendChild(subtitleToggleBtn);
    }

    subtitleToggleBtn.addEventListener('click', function () {
      chrome.storage.local.set({ enableSubtitle: !subtitleEnabled });
    });

    updateSubtitleToggleButton();
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
  let ytTranslateInFlight = false;
  let ytStaticInFlight = 0;
  let ytPendingText = '';
  let ytLastRequestedText = '';
  let ytLastRequestAt = 0;
  let ytMode = 'static'; // static: 完整字幕, live: 实时生成滚动字幕
  let ytIncrementalHits = 0;
  let ytPrevCaptionText = '';
  let ytPrevCaptionAt = 0;

  const YT_DEBOUNCE_MS_STATIC = 90;
  const YT_DEBOUNCE_MS_LIVE = 320;
  const YT_MIN_REQUEST_INTERVAL_MS_STATIC = 140;
  const YT_MIN_REQUEST_INTERVAL_MS_LIVE = 700;
  const YT_MAX_IN_FLIGHT_STATIC = 2;
  const YT_REQUEST_RETRY_FALLBACK_MS = 800;
  const YT_LIVE_APPEND_WINDOW_MS = 900;
  const YT_LIVE_APPEND_MAX_GROWTH = 18;
  const YT_MODE_SWITCH_THRESHOLD = 3;

  function cleanupYouTube() {
    if (ytStartCheck) { clearInterval(ytStartCheck); ytStartCheck = null; }
    if (ytObserver) { ytObserver.disconnect(); ytObserver = null; }
    if (ytPositionRAF) { cancelAnimationFrame(ytPositionRAF); ytPositionRAF = null; }
    if (ytCheckInterval) { clearInterval(ytCheckInterval); ytCheckInterval = null; }
    if (ytRetryTimer) { clearTimeout(ytRetryTimer); ytRetryTimer = null; }
    clearTimeout(ytDebounceTimer);
    clearTimeout(ytHideTimer);
    if (ytTranslatedEl) { ytTranslatedEl.remove(); ytTranslatedEl = null; }
    ytObservedContainer = null;
    ytLastRenderedText = '';
    ytTranslateInFlight = false;
    ytStaticInFlight = 0;
    ytPendingText = '';
    ytLastRequestedText = '';
    ytLastRequestAt = 0;
    ytMode = 'static';
    ytIncrementalHits = 0;
    ytPrevCaptionText = '';
    ytPrevCaptionAt = 0;
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
      console.log('[IMT] YouTube subtitle mode:', ytMode);
    }

    ytPrevCaptionText = currentText;
    ytPrevCaptionAt = now;
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
      font-size: max(1.6vw, 20px);
      line-height: 1.4;
      color: #fff;
      background: rgba(8, 8, 8, 0.75);
      padding: 6px 16px;
      border-radius: 4px;
      font-family: "YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, sans-serif;
      font-weight: 400;
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.15s;
      display: none;
      max-width: 80vw;
    `;
    document.body.appendChild(ytTranslatedEl);

    // MutationObserver 观察字幕变化
    ytObserver = new MutationObserver(() => {
      clearTimeout(ytDebounceTimer);
      ytDebounceTimer = setTimeout(processYouTubeCaption, getYouTubeDebounceMs());
    });
    ytObserver.observe(container, { childList: true, subtree: true, characterData: true, characterDataOldValue: false });

    // rAF 持续跟随字幕位置
    startPositionTracking();

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
    function track() {
      if (!ytTranslatedEl) return;

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
          // 译文 top = 原字幕底部 + 4px 间距
          ytTranslatedEl.style.top = (rect.bottom + 4) + 'px';

          // 实时字幕（live）使用偏左布局；已有完整字幕（static）保持居中
          if (ytMode === 'live') {
            ytTranslatedEl.style.transform = 'none';
            ytTranslatedEl.style.textAlign = 'left';
            ytTranslatedEl.style.left = (rect.left + 10) + 'px';
            ytTranslatedEl.style.maxWidth = Math.max(260, rect.width - 20) + 'px';
          } else {
            ytTranslatedEl.style.transform = 'translateX(-50%)';
            ytTranslatedEl.style.textAlign = 'center';
            ytTranslatedEl.style.left = (rect.left + rect.width / 2) + 'px';
            ytTranslatedEl.style.maxWidth = '80vw';
          }
        }
      }

      ytPositionRAF = requestAnimationFrame(track);
    }

    ytPositionRAF = requestAnimationFrame(track);
  }

  async function processYouTubeCaption() {
    if (!subtitleEnabled || !ytTranslatedEl) return;

    const segments = document.querySelectorAll('.ytp-caption-segment');
    const currentText = Array.from(segments).map(function (s) { return s.textContent; }).join(' ').trim();

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
      ytTranslateInFlight = false;
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
      return;
    }

    clearTimeout(ytHideTimer);

    updateYouTubeCaptionMode(currentText);

    // 缓存命中 → 立即显示
    var cacheKey = currentText.trim();
    if (translatedCache.has(cacheKey)) {
      ytLastRenderedText = currentText;
      showYTTranslation(translatedCache.get(cacheKey));
      return;
    }

    const isLiveMode = ytMode === 'live';
    if (isLiveMode && ytTranslateInFlight) {
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
      ytTranslateInFlight = true;
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

      const isExactMatch = latestText === currentText;
      const isLiveAppendMatch = ytMode === 'live' && latestText.startsWith(currentText);
      if ((isExactMatch || isLiveAppendMatch) && result.text) {
        gotTranslation = true;
        ytLastRenderedText = currentText;
        showYTTranslation(result.text);
      }
    } catch (error) {
      console.error('[IMT] YouTube subtitle processing error:', error);
    } finally {
      if (isLiveMode) {
        ytTranslateInFlight = false;
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
        latestText === currentText
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

  function showYTTranslation(text) {
    if (!ytTranslatedEl || !text) return;
    ytTranslatedEl.textContent = text;
    ytTranslatedEl.style.display = 'block';
    requestAnimationFrame(() => {
      if (ytTranslatedEl) ytTranslatedEl.style.opacity = '1';
    });
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
