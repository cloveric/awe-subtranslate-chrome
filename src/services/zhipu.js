/**
 * Zhipu 翻译（GLM，兼容 Chat Completions，需要 API Key）
 */
import { TranslationService } from './base.js';

const LANG_NAMES = {
  'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
  'ja': '日本語', 'ko': '한국어', 'fr': 'Français',
  'de': 'Deutsch', 'es': 'Español', 'ru': 'Русский', 'pt': 'Português',
};

const DEFAULT_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

function buildEndpoint(baseUrl) {
  const raw = String(baseUrl || '').trim();
  if (!raw) return DEFAULT_ENDPOINT;

  const normalized = raw.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  if (/^https?:\/\/open\.bigmodel\.cn$/i.test(normalized)) {
    return `${normalized}/api/paas/v4/chat/completions`;
  }
  if (/\/api\/paas$/i.test(normalized)) return `${normalized}/v4/chat/completions`;
  if (/\/api\/paas\/v4$/i.test(normalized)) return `${normalized}/chat/completions`;
  if (/\/v4$/i.test(normalized)) return `${normalized}/chat/completions`;
  return `${normalized}/chat/completions`;
}

function parseTextContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim();
  }
  return '';
}

export class ZhipuTranslate extends TranslationService {
  get id() { return 'zhipu'; }
  get name() { return 'Zhipu GLM'; }
  get needsApiKey() { return true; }
  get apiKeyField() { return 'zhipuApiKey'; }

  async translate(texts, from = 'auto', to = 'zh-CN') {
    const apiKey = this.config.zhipuApiKey;
    if (!apiKey) throw new Error('智谱 API Key 未配置');

    const targetLang = LANG_NAMES[to] || to;
    const endpoint = buildEndpoint(this.config.zhipuBaseUrl);
    const model = this.config.zhipuModel || 'glm-4.7-flash';
    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const systemPrompt = `You are a professional translator. Translate the following texts to ${targetLang}. Each text is prefixed with [number]. Return ONLY the translations in the same numbered format [number] translated_text, one per line. Keep the original meaning and tone. Do not add explanations.`;

    const response = await fetch(endpoint, {
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
      throw new Error(`Zhipu API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = parseTextContent(data?.choices?.[0]?.message?.content);
    if (!content) {
      throw new Error('Zhipu API 返回为空');
    }
    return this._parseNumberedResponse(content, texts.length);
  }

  _parseNumberedResponse(content, expectedCount) {
    const lines = String(content || '').split('\n').filter((l) => l.trim());
    const results = new Array(expectedCount).fill('');

    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s*(.+)/);
      if (match) {
        const idx = parseInt(match[1], 10);
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
