/**
 * Bing/Microsoft 翻译 - 免费 API（无需 Key）
 */
import { TranslationService } from './base.js';

export class BingTranslate extends TranslationService {
  constructor(config) {
    super(config);
    this._token = null;
    this._tokenExpiry = 0;
  }

  get id() { return 'bing'; }
  get name() { return '微软翻译'; }
  get needsApiKey() { return false; }

  mapLanguageCode(code) {
    const map = {
      'zh-CN': 'zh-Hans',
      'zh-TW': 'zh-Hant',
      'auto': '',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'ru': 'ru',
      'pt': 'pt',
    };
    return map[code] || code;
  }

  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiry) {
      return this._token;
    }

    const response = await fetch('https://edge.microsoft.com/translate/auth', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Bing auth error: ${response.status}`);
    }

    this._token = await response.text();
    // Token 有效期约 10 分钟
    this._tokenExpiry = Date.now() + 8 * 60 * 1000;
    return this._token;
  }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const token = await this._getToken();
    const toLang = this.mapLanguageCode(to);
    const fromLang = this.mapLanguageCode(from);

    const params = new URLSearchParams({ 'api-version': '3.0', to: toLang });
    if (fromLang) params.set('from', fromLang);

    const body = texts.map((text) => ({ Text: text }));

    const response = await fetch(
      `https://api-edge.cognitive.microsofttranslator.com/translate?${params}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Bing Translate API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map((item) => item.translations[0].text);
  }
}
