/**
 * 翻译服务基类 (ES Module - background 使用)
 */
export class TranslationService {
  constructor(config = {}) {
    this.config = config;
  }

  /** 服务 ID */
  get id() { return ''; }

  /** 显示名称 */
  get name() { return ''; }

  /** 是否需要 API Key */
  get needsApiKey() { return false; }

  /** API Key 配置字段名 */
  get apiKeyField() { return 'apiKey'; }

  /**
   * 翻译文本
   * @param {string[]} texts - 待翻译文本数组
   * @param {string} from - 源语言代码 (auto 自动检测)
   * @param {string} to - 目标语言代码
   * @returns {Promise<string[]>} 翻译结果数组
   */
  async translate(texts, from = 'auto', to = 'zh-CN') {
    throw new Error('translate() not implemented');
  }

  /**
   * 将语言代码转换为当前服务支持的格式
   */
  mapLanguageCode(code) {
    return code;
  }
}
