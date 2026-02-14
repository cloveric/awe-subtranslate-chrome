/**
 * Google 翻译 - 免费 API（无需 Key）
 */
import { TranslationService } from './base.js';

export class GoogleTranslate extends TranslationService {
  get id() { return 'google'; }
  get name() { return 'Google 翻译'; }
  get needsApiKey() { return false; }

  mapLanguageCode(code) {
    const map = {
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'ru': 'ru',
      'pt': 'pt',
      'auto': 'auto',
    };
    return map[code] || code;
  }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const sl = this.mapLanguageCode(from);
    const tl = this.mapLanguageCode(to);
    const results = [];

    // Google 翻译 API 单次最多约 5000 字符，逐条翻译
    for (const text of texts) {
      if (!text.trim()) {
        results.push('');
        continue;
      }
      const params = new URLSearchParams({
        client: 'gtx',
        sl,
        tl,
        dt: 't',
        q: text,
      });

      const url = `https://translate.googleapis.com/translate_a/single?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`);
      }

      const data = await response.json();
      // 响应格式: [[["译文","原文",null,null,10]],null,"en"]
      let translated = '';
      if (data && data[0]) {
        for (const segment of data[0]) {
          if (segment[0]) translated += segment[0];
        }
      }
      results.push(translated);
    }

    return results;
  }
}
