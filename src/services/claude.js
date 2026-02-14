/**
 * Anthropic Claude 翻译（需要 API Key）
 */
import { TranslationService } from './base.js';

const LANG_NAMES = {
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
  'ja': '日本語', 'ko': '한국어', 'fr': 'Français',
  'de': 'Deutsch', 'es': 'Español', 'ru': 'Русский', 'pt': 'Português',
};

export class ClaudeTranslate extends TranslationService {
  get id() { return 'claude'; }
  get name() { return 'Claude'; }
  get needsApiKey() { return true; }
  get apiKeyField() { return 'claudeApiKey'; }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const apiKey = this.config.claudeApiKey;
    if (!apiKey) throw new Error('Claude API Key 未配置');

    const targetLang = LANG_NAMES[to] || to;
    const baseUrl = this.config.claudeBaseUrl || 'https://api.anthropic.com';
    const model = this.config.claudeModel || 'claude-sonnet-4-5-20250929';

    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const prompt = `You are a professional translator. Translate the following texts to ${targetLang}. Each text is prefixed with [number]. Return ONLY the translations in the same numbered format [number] translated_text, one per line. Keep the original meaning and tone. Do not add explanations.

${numberedTexts}`;

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = data.content[0].text.trim();
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
