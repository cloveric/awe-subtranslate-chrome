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
const DEFAULT_RETRY_DELAYS_MS = [900, 1800];
const DEFAULT_MIN_INTERVAL_MS = 380;

let zhipuRequestQueue = Promise.resolve();
let zhipuLastRequestAt = 0;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enqueueZhipuRequest(task, minIntervalMs) {
  const run = async () => {
    const elapsed = Date.now() - zhipuLastRequestAt;
    const waitMs = Math.max(0, minIntervalMs - elapsed);
    if (waitMs > 0) await sleep(waitMs);
    try {
      return await task();
    } finally {
      zhipuLastRequestAt = Date.now();
    }
  };

  const next = zhipuRequestQueue.then(run, run);
  zhipuRequestQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function parseError(response) {
  const raw = await response.text();
  let code = '';
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    code = String(parsed?.error?.code || '');
    message = parsed?.error?.message || raw;
  } catch (error) {}
  return { code, message, raw };
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
    const retryDelays = Array.isArray(this.config.zhipuRetryDelaysMs) &&
      this.config.zhipuRetryDelaysMs.length > 0
      ? this.config.zhipuRetryDelaysMs
      : DEFAULT_RETRY_DELAYS_MS;
    const minIntervalMs = Number.isFinite(Number(this.config.zhipuMinIntervalMs))
      ? Math.max(0, Number(this.config.zhipuMinIntervalMs))
      : DEFAULT_MIN_INTERVAL_MS;
    const numberedTexts = texts.map((t, i) => `[${i}] ${t}`).join('\n');
    const systemPrompt = `You are a professional translator. Translate the following texts to ${targetLang}. Each text is prefixed with [number]. Return ONLY the translations in the same numbered format [number] translated_text, one per line. Keep the original meaning and tone. Do not add explanations.`;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      const response = await enqueueZhipuRequest(() => fetch(endpoint, {
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
      }), minIntervalMs);

      if (response.ok) {
        const data = await response.json();
        const content = parseTextContent(data?.choices?.[0]?.message?.content);
        if (!content) {
          throw new Error('Zhipu API 返回为空');
        }
        return this._parseNumberedResponse(content, texts.length);
      }

      const err = await parseError(response);
      const isRateLimit = response.status === 429 || err.code === '1302';
      if (isRateLimit && attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
        continue;
      }

      if (isRateLimit) {
        throw new Error('智谱请求触发限流（429/1302），请稍后重试或降低请求频率');
      }

      throw new Error(`Zhipu API error: ${response.status} ${err.raw}`);
    }

    throw new Error('Zhipu API 请求失败');
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
