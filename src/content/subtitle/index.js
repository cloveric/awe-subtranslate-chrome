/**
 * 字幕翻译 Content Script（isolated world）
 *
 * YouTube: MutationObserver 观察字幕 + rAF 持续跟随位置
 * Netflix: 同理
 */
window.IMT = window.IMT || {};

(function () {
  'use strict';

  let subtitleEnabled = true;
  let translatedCache = new Map();

  // 缓存设置
  let cachedService = 'google';
  let cachedTargetLang = 'zh-CN';

  const isYouTube = location.hostname.includes('youtube.com');
  const isNetflix = location.hostname.includes('netflix.com');

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
  let translateVersion = 0; // 版本计数器，替代单 key 守卫

  async function translateText(text) {
    if (!text || !text.trim()) return { text: '', version: -1 };
    const key = text.trim();
    if (translatedCache.has(key)) return { text: translatedCache.get(key), version: -1 };
    if (errorCount >= MAX_ERRORS) return { text: '', version: -1 };

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
      if (errorCount >= MAX_ERRORS) showErrorOnVideo('字幕翻译已暂停，请检查翻译服务配置');
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
  let ytLastText = '';
  let ytDebounceTimer = null;
  let ytHideTimer = null;
  let ytPositionRAF = null;
  let ytCheckInterval = null;
  let ytObservedContainer = null;
  let ytStartCheck = null;

  function cleanupYouTube() {
    if (ytStartCheck) { clearInterval(ytStartCheck); ytStartCheck = null; }
    if (ytObserver) { ytObserver.disconnect(); ytObserver = null; }
    if (ytPositionRAF) { cancelAnimationFrame(ytPositionRAF); ytPositionRAF = null; }
    if (ytCheckInterval) { clearInterval(ytCheckInterval); ytCheckInterval = null; }
    clearTimeout(ytDebounceTimer);
    clearTimeout(ytHideTimer);
    if (ytTranslatedEl) { ytTranslatedEl.remove(); ytTranslatedEl = null; }
    ytObservedContainer = null;
    ytLastText = '';
    translateVersion++; // 使进行中的翻译过期
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
      ytDebounceTimer = setTimeout(processYouTubeCaption, 300);
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
          ytTranslatedEl.style.left = (rect.left + rect.width / 2) + 'px';
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
      ytLastText = '';
      return;
    }

    clearTimeout(ytHideTimer);

    if (currentText === ytLastText) return;
    ytLastText = currentText;

    // 缓存命中 → 立即显示
    var cacheKey = currentText.trim();
    if (translatedCache.has(cacheKey)) {
      showYTTranslation(translatedCache.get(cacheKey));
      return;
    }

    // 不隐藏旧译文 — 保持显示上一条翻译直到新翻译完成
    var result = await translateText(currentText);
    // 检查版本：如果在翻译期间文本已变化，丢弃（但缓存已保存）
    if (ytLastText !== currentText) return;
    if (result.text) {
      showYTTranslation(result.text);
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
  // Netflix
  // ========================

  let nfTranslatedEl = null;
  let nfObserver = null;
  let nfLastText = '';
  let nfDebounceTimer = null;
  let nfHideTimer = null;
  let nfStartCheck = null;

  function cleanupNetflix() {
    if (nfStartCheck) { clearInterval(nfStartCheck); nfStartCheck = null; }
    if (nfObserver) { nfObserver.disconnect(); nfObserver = null; }
    clearTimeout(nfDebounceTimer);
    clearTimeout(nfHideTimer);
    if (nfTranslatedEl) { nfTranslatedEl.remove(); nfTranslatedEl = null; }
    nfLastText = '';
    translateVersion++; // 使进行中的翻译过期
  }

  function startNetflixObserver() {
    cleanupNetflix();

    nfStartCheck = setInterval(() => {
      const container =
        document.querySelector('.player-timedtext-text-container') ||
        document.querySelector('.player-timedtext');
      if (!container) return;
      clearInterval(nfStartCheck);
      nfStartCheck = null;
      setupNetflixObserver(container);
    }, 1000);
  }

  function setupNetflixObserver(container) {
    nfTranslatedEl = document.createElement('div');
    nfTranslatedEl.id = 'imt-nf-translated';
    nfTranslatedEl.style.cssText = `
      position: fixed;
      bottom: 60px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; text-align: center; pointer-events: none;
      max-width: 70%; font-size: 2vw; line-height: 1.4;
      color: #fff; background: rgba(8, 8, 8, 0.75);
      padding: 6px 16px; border-radius: 4px;
      font-family: Netflix Sans, Helvetica, Arial, sans-serif;
      font-weight: 400; white-space: pre-wrap;
      opacity: 0; transition: opacity 0.15s; display: none;
    `;
    document.body.appendChild(nfTranslatedEl);

    nfObserver = new MutationObserver(() => {
      clearTimeout(nfDebounceTimer);
      nfDebounceTimer = setTimeout(() => processNetflixCaption(container), 60);
    });
    nfObserver.observe(container, { childList: true, subtree: true, characterData: true });
    console.log('[IMT] Netflix caption observer started');
  }

  async function processNetflixCaption(container) {
    if (!subtitleEnabled || !nfTranslatedEl) return;

    var spans = container.querySelectorAll('span');
    var currentText = Array.from(spans).map(function (s) { return s.textContent; }).join(' ').trim();

    if (!currentText) {
      clearTimeout(nfHideTimer);
      nfHideTimer = setTimeout(function () {
        if (nfTranslatedEl) {
          nfTranslatedEl.style.opacity = '0';
          setTimeout(function () { if (nfTranslatedEl) nfTranslatedEl.style.display = 'none'; }, 150);
        }
      }, 300);
      nfLastText = '';
      return;
    }

    clearTimeout(nfHideTimer);
    if (currentText === nfLastText) return;
    nfLastText = currentText;

    if (translatedCache.has(currentText.trim())) {
      showNFTranslation(translatedCache.get(currentText.trim()));
      return;
    }

    var result = await translateText(currentText);
    if (nfLastText !== currentText) return;
    if (result.text) {
      showNFTranslation(result.text);
    }
  }

  function showNFTranslation(text) {
    if (!nfTranslatedEl || !text) return;
    nfTranslatedEl.textContent = text;
    nfTranslatedEl.style.display = 'block';
    requestAnimationFrame(() => { if (nfTranslatedEl) nfTranslatedEl.style.opacity = '1'; });
  }

  // ========================
  // 初始化
  // ========================

  chrome.storage.local.get(['enableSubtitle'], function (result) {
    subtitleEnabled = result.enableSubtitle !== false;
    if (!subtitleEnabled) return;

    if (isYouTube) {
      startYouTubeObserver();
      watchYouTubePlayerChanges();
    } else if (isNetflix) {
      startNetflixObserver();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enableSubtitle) {
      subtitleEnabled = changes.enableSubtitle.newValue !== false;
      if (!subtitleEnabled) {
        if (isYouTube) cleanupYouTube();
        if (isNetflix) cleanupNetflix();
      } else if (isYouTube && !ytObserver && !ytStartCheck) {
        // 重新启用时重启 observer
        startYouTubeObserver();
      } else if (isNetflix && !nfObserver && !nfStartCheck) {
        startNetflixObserver();
      }
    }
    if (changes.translationService) {
      cachedService = changes.translationService.newValue || 'google';
      errorCount = 0;
      translatedCache.clear();
    }
    if (changes.targetLanguage) {
      cachedTargetLang = changes.targetLanguage.newValue || 'zh-CN';
      translatedCache.clear();
    }
    if (changes.serviceConfigs) {
      errorCount = 0;
      translatedCache.clear();
    }
  });

  window.addEventListener('beforeunload', () => {
    cleanupYouTube();
    cleanupNetflix();
  });

  console.log('[IMT] Subtitle content script loaded');
})();
