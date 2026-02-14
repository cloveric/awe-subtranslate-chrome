/**
 * DeepSeek 翻译（兼容 OpenAI API 格式，需要 API Key）
 */
import { TranslationService } from './base.js';

const LANG_NAMES = {
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
  'ja': '日本語', 'ko': '한국어', 'fr': 'Français',
  'de': 'Deutsch', 'es': 'Español', 'ru': 'Русский', 'pt': 'Português',
};

export class DeepSeekTranslate extends TranslationService {
  get id() { return 'deepseek'; }
  get name() { return 'DeepSeek'; }
  get needsApiKey() { return true; }
  get apiKeyField() { return 'deepseekApiKey'; }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const apiKey = this.config.deepseekApiKey;
    if (!apiKey) throw new Error('DeepSeek API Key 未配置');

    const targetLang = LANG_NAMES[to] || to;
    const baseUrl = this.config.deepseekBaseUrl || 'https://api.deepseek.com';
    const model = this.config.deepseekModel || 'deepseek-chat';

    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const systemPrompt = `You are a professional translator. Translate the following texts to ${targetLang}. Each text is prefixed with [number]. Return ONLY the translations in the same numbered format [number] translated_text, one per line. Keep the original meaning and tone. Do not add explanations.`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: numberedTexts },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    return this._parseNumberedResponse(content, texts.length);
  }

  _parseNumberedResponse(content, expectedCount) {
    const lines = content.split('\n').filter((l) => l.trim());
    const results = new Array(expectedCount).fill('');

    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx < expectedCount) results[idx] = match[2].trim();
      }
    }

    if (results.every((r) => r === '') && lines.length > 0) {
      for (let i = 0; i < Math.min(lines.length, expectedCount); i++) {
        results[i] = lines[i].replace(/^\[\d+\]\s*/, '').trim();
      }
    }

    return results;
  }
}
