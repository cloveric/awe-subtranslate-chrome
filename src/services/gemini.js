/**
 * Google Gemini 翻译（需要 API Key）
 */
import { TranslationService } from './base.js';

const LANG_NAMES = {
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
  'ja': '日本語', 'ko': '한국어', 'fr': 'Français',
  'de': 'Deutsch', 'es': 'Español', 'ru': 'Русский', 'pt': 'Português',
};

export class GeminiTranslate extends TranslationService {
  get id() { return 'gemini'; }
  get name() { return 'Gemini'; }
  get needsApiKey() { return true; }
  get apiKeyField() { return 'geminiApiKey'; }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const apiKey = this.config.geminiApiKey;
    if (!apiKey) throw new Error('Gemini API Key 未配置');

    const targetLang = LANG_NAMES[to] || to;
    const model = this.config.geminiModel || 'gemini-2.5-flash-preview-05-20';

    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const prompt = `You are a professional translator. Translate the following texts to ${targetLang}. Each text is prefixed with [number]. Return ONLY the translations in the same numbered format [number] translated_text, one per line. Keep the original meaning and tone. Do not add explanations.

${numberedTexts}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();
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
