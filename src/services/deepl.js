/**
 * DeepL 翻译 API（需要 API Key）
 */
import { TranslationService } from './base.js';

export class DeepLTranslate extends TranslationService {
  get id() { return 'deepl'; }
  get name() { return 'DeepL'; }
  get needsApiKey() { return true; }
  get apiKeyField() { return 'deeplApiKey'; }

  mapLanguageCode(code) {
    const map = {
      'zh-CN': 'ZH',
      'zh-TW': 'ZH',
      'en': 'EN',
      'ja': 'JA',
      'ko': 'KO',
      'fr': 'FR',
      'de': 'DE',
      'es': 'ES',
      'ru': 'RU',
      'pt': 'PT',
      'auto': '',
    };
    return map[code] || code.toUpperCase();
  }

  _getBaseUrl() {
    const key = this.config.deeplApiKey || '';
    // Free API keys end with ':fx'
    if (key.endsWith(':fx')) {
      return 'https://api-free.deepl.com/v2/translate';
    }
    return 'https://api.deepl.com/v2/translate';
  }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const apiKey = this.config.deeplApiKey;
    if (!apiKey) throw new Error('DeepL API Key 未配置');

    const targetLang = this.mapLanguageCode(to);
    const sourceLang = this.mapLanguageCode(from);

    const params = new URLSearchParams();
    for (const text of texts) {
      params.append('text', text);
    }
    params.set('target_lang', targetLang);
    if (sourceLang) params.set('source_lang', sourceLang);

    const response = await fetch(this._getBaseUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translations.map((t) => t.text);
  }
}
