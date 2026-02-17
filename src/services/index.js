/**
 * 翻译服务注册表 + 工厂 (ES Module)
 */
import { GoogleTranslate } from './google.js';
import { BingTranslate } from './bing.js';
import { DeepLTranslate } from './deepl.js';
import { OpenAITranslate } from './openai.js';
import { ClaudeTranslate } from './claude.js';
import { GeminiTranslate } from './gemini.js';
import { DeepSeekTranslate } from './deepseek.js';

/** 所有可用服务 */
const SERVICE_CLASSES = {
  google: GoogleTranslate,
  bing: BingTranslate,
  deepl: DeepLTranslate,
  openai: OpenAITranslate,
  claude: ClaudeTranslate,
  gemini: GeminiTranslate,
  deepseek: DeepSeekTranslate,
};

/** 服务实例缓存 */
const instances = {};
const instanceConfigKeys = {};

/**
 * 获取翻译服务实例
 * @param {string} serviceId
 * @param {object} config - 服务配置（含 API Key 等）
 * @returns {TranslationService}
 */
export function getService(serviceId, config = {}) {
  const ServiceClass = SERVICE_CLASSES[serviceId];
  if (!ServiceClass) {
    throw new Error(`Unknown translation service: ${serviceId}`);
  }
  const configKey = JSON.stringify(config || {});
  if (!instances[serviceId] || instanceConfigKeys[serviceId] !== configKey) {
    instances[serviceId] = new ServiceClass(config);
    instanceConfigKeys[serviceId] = configKey;
  }
  return instances[serviceId];
}

/**
 * 获取所有可用服务的元信息
 */
export function getAllServices() {
  return Object.entries(SERVICE_CLASSES).map(([id, Cls]) => {
    const instance = new Cls();
    return {
      id,
      name: instance.name,
      needsApiKey: instance.needsApiKey,
      apiKeyField: instance.apiKeyField,
    };
  });
}
