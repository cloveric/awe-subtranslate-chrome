/**
 * Netflix 字幕拦截（MAIN world - 可访问页面 JS）
 *
 * 通过 hook JSON.parse 捕获 timedtexttracks 数据，
 * 并通过 window.postMessage 发送给 content script。
 */
(function () {
  'use strict';

  const originalJSONParse = JSON.parse;

  JSON.parse = function (...args) {
    const result = originalJSONParse.apply(this, args);

    try {
      // Netflix 的播放器数据中包含 timedtexttracks
      if (result && typeof result === 'object') {
        findSubtitleTracks(result);
      }
    } catch (e) {}

    return result;
  };

  /**
   * 递归搜索 timedtexttracks
   */
  function findSubtitleTracks(obj, depth = 0) {
    if (depth > 5 || !obj) return;

    if (obj.timedtexttracks) {
      const tracks = obj.timedtexttracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        const subtitleTracks = tracks
          .filter((t) => t.language && (t.ttDownloadable || t.downloadableUrls))
          .map((t) => ({
            language: t.language,
            languageDescription: t.languageDescription,
            isNoneTrack: t.isNoneTrack,
            isForcedNarrative: t.isForcedNarrative,
            urls: t.ttDownloadable?.downloadUrls || t.downloadableUrls || {},
            cdnUrls: extractCdnUrls(t),
          }));

        if (subtitleTracks.length > 0) {
          window.postMessage({
            type: 'imt-netflix-subtitle-tracks',
            tracks: subtitleTracks,
          }, '*');
        }
      }
    }

    // 递归搜索
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          findSubtitleTracks(obj[key], depth + 1);
        }
      }
    }
  }

  /**
   * 提取 CDN 字幕 URL
   */
  function extractCdnUrls(track) {
    if (track.ttDownloadable?.downloadUrls) {
      return Object.values(track.ttDownloadable.downloadUrls);
    }
    if (track.downloadableUrls) {
      return Object.values(track.downloadableUrls);
    }
    return [];
  }

  /**
   * Hook fetch 拦截 TTML/WebVTT 字幕文件
   */
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const response = await originalFetch.apply(this, args);

    // 检测字幕文件请求
    if (url && (url.includes('?o=') || url.includes('nflx'))) {
      const contentType = response.headers?.get('content-type') || '';
      if (contentType.includes('xml') || contentType.includes('text')) {
        const clone = response.clone();
        clone.text().then((text) => {
          if (text.includes('<tt') || text.includes('WEBVTT')) {
            window.postMessage({
              type: 'imt-netflix-subtitle-content',
              url: url,
              content: text,
            }, '*');
          }
        }).catch(() => {});
      }
    }

    return response;
  };

  console.log('[IMT] Netflix subtitle hook installed');
})();
