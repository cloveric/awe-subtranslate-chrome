/**
 * 翻译协调器 - 批量翻译 + 缓存
 */
window.IMT = window.IMT || {};

window.IMT.Translator = {
  /** 翻译缓存 */
  _cache: new Map(),

  /** 每批最大字符数 */
  BATCH_SIZE: 4000,

  /** 最大并发批次 */
  MAX_CONCURRENT: 3,

  /**
   * 翻译页面中收集到的文本块
   * @param {Array<{element: Element, text: string}>} blocks
   * @param {string} targetLang
   * @param {string} service
   * @param {string} theme
   */
  async translateBlocks(blocks, targetLang, service, theme) {
    // 过滤已翻译和已是目标语言的
    const toTranslate = blocks.filter((block) => {
      if (block.element.hasAttribute('data-imt-translated')) return false;
      if (IMT.DOMParser.isTargetLanguage(block.text, targetLang)) return false;
      return true;
    });

    if (toTranslate.length === 0) return;

    // 先显示加载状态
    toTranslate.forEach((block) => {
      IMT.Injector.showLoading(block.element);
    });

    // 分批翻译
    const batches = this._createBatches(toTranslate);

    // 并发执行批次（限制并发数）
    for (let i = 0; i < batches.length; i += this.MAX_CONCURRENT) {
      const chunk = batches.slice(i, i + this.MAX_CONCURRENT);
      await Promise.all(
        chunk.map((batch) => this._translateBatch(batch, targetLang, service, theme))
      );
    }
  },

  /**
   * 将文本块分组为批次
   */
  _createBatches(blocks) {
    const batches = [];
    let currentBatch = [];
    let currentSize = 0;

    for (const block of blocks) {
      if (currentSize + block.text.length > this.BATCH_SIZE && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentSize = 0;
      }
      currentBatch.push(block);
      currentSize += block.text.length;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  },

  /**
   * 翻译一个批次
   */
  async _translateBatch(batch, targetLang, service, theme) {
    const texts = batch.map((b) => b.text);
    const cacheKeys = texts.map((t) => `${service}:${targetLang}:${t}`);

    // 检查缓存
    const uncachedIndices = [];
    const results = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
      const cached = this._cache.get(cacheKeys[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
    }

    // 翻译未缓存的
    if (uncachedIndices.length > 0) {
      const uncachedTexts = uncachedIndices.map((i) => texts[i]);
      try {
        const translated = await IMT.Messaging.requestTranslation(
          uncachedTexts, 'auto', targetLang, service
        );

        if (translated && translated.results) {
          for (let j = 0; j < uncachedIndices.length; j++) {
            const idx = uncachedIndices[j];
            results[idx] = translated.results[j];
            this._cache.set(cacheKeys[idx], translated.results[j]);
          }
        }
      } catch (err) {
        console.error('[IMT] Translation error:', err);
        // 标记错误
        for (const idx of uncachedIndices) {
          results[idx] = null;
        }
      }
    }

    // 注入结果
    for (let i = 0; i < batch.length; i++) {
      const block = batch[i];
      if (results[i]) {
        IMT.Injector.replaceLoading(block.element, results[i], theme);
      } else {
        // 移除加载状态，显示错误
        const loading = block.element.querySelector('[data-imt-loading]');
        if (loading) {
          loading.classList.remove('imt-loading');
          loading.classList.add('imt-error');
          loading.textContent = '翻译失败';
        }
      }
    }
  },

  /**
   * 清除缓存
   */
  clearCache() {
    this._cache.clear();
  }
};
