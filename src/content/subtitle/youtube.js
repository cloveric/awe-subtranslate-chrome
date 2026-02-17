/**
 * YouTube 字幕拦截（MAIN world - 可访问页面 JS）
 *
 * 通过 hook XHR/fetch 拦截字幕请求，
 * 并通过 window.postMessage 将字幕数据发送给 content script。
 */
(function () {
  'use strict';

  const TIMEDTEXT_PATTERN = /\/api\/timedtext/;
  const CAPTION_TRACK_PATTERN = /playerCaptionsTracklistRenderer/;

  /**
   * Hook XMLHttpRequest 拦截字幕请求
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    this._imtUrl = url;
    return originalXHROpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._imtUrl && TIMEDTEXT_PATTERN.test(this._imtUrl)) {
      this.addEventListener('load', function () {
        try {
          const data = JSON.parse(this.responseText);
          if (data && data.events) {
            window.postMessage({
              type: 'imt-youtube-subtitle',
              url: this._imtUrl,
              events: data.events,
            }, '*');
          }
        } catch (e) {}
      });
    }
    return originalXHRSend.apply(this, args);
  };

  /**
   * Hook fetch 拦截字幕请求
   */
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const response = await originalFetch.apply(this, args);

    if (url && TIMEDTEXT_PATTERN.test(url)) {
      const clone = response.clone();
      clone.json().then((data) => {
        if (data && data.events) {
          window.postMessage({
            type: 'imt-youtube-subtitle',
            url: url,
            events: data.events,
          }, '*');
        }
      }).catch(() => {});
    }

    return response;
  };

  /**
   * 监听来自 content script 的消息
   */
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'imt-request-subtitle-url') {
      // 尝试从页面数据获取字幕 URL
      tryGetSubtitleUrl();
    }
  });

  /**
   * 尝试从 ytInitialPlayerResponse 获取字幕信息
   */
  function tryGetSubtitleUrl() {
    try {
      const player = document.querySelector('#movie_player');
      if (player && player.getPlayerResponse) {
        const response = player.getPlayerResponse();
        if (response?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
          const tracklist = response.captions.playerCaptionsTracklistRenderer;
          const tracks = tracklist.captionTracks;
          const translationLanguages = Array.isArray(tracklist.translationLanguages)
            ? tracklist.translationLanguages.map((lang) => ({
              languageCode: lang?.languageCode || '',
              languageName: lang?.languageName?.simpleText ||
                (Array.isArray(lang?.languageName?.runs) && lang.languageName.runs[0]?.text) ||
                lang?.languageCode ||
                '',
            })).filter((lang) => typeof lang.languageCode === 'string' && lang.languageCode)
            : [];
          window.postMessage({
            type: 'imt-youtube-caption-tracks',
            tracks: tracks.map((t) => ({
              languageCode: t.languageCode,
              name: t.name?.simpleText || t.languageCode,
              baseUrl: t.baseUrl,
              isTranslatable: t.isTranslatable,
            })),
            translationLanguages,
          }, '*');
        }
      }
    } catch (e) {}
  }

  console.log('[IMT] YouTube subtitle hook installed');
})();
