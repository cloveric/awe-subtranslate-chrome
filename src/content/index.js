/**
 * Content Script 入口 - 初始化翻译引擎
 */
window.IMT = window.IMT || {};

(function () {
  let isTranslated = false;
  let settings = {
    targetLanguage: 'zh-CN',
    translationService: 'google',
    translationTheme: 'underline',
  };

  const SERVICE_NAMES = {
    google: 'Google 翻译', bing: '微软翻译', deepl: 'DeepL',
    openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', deepseek: 'DeepSeek',
  };

  /**
   * 翻译当前页面
   */
  async function translatePage() {
    if (isTranslated) {
      // 取消翻译
      IMT.Injector.removeAll();
      isTranslated = false;
      updateFloatButton();
      return;
    }

    // 加载设置
    const stored = await IMT.Storage.getAll();
    Object.assign(settings, stored);

    // 收集可翻译文本
    const blocks = IMT.DOMParser.collectTranslatableBlocks();
    if (blocks.length === 0) return;

    isTranslated = true;
    updateFloatButton();

    // Toast 提示正在使用的翻译服务
    const serviceName = SERVICE_NAMES[settings.translationService] || settings.translationService;
    IMT.Injector.showToast(`正在使用 ${serviceName} 翻译...`);

    // 执行翻译
    await IMT.Translator.translateBlocks(
      blocks,
      settings.targetLanguage,
      settings.translationService,
      settings.translationTheme
    );
  }

  /**
   * 更新浮动按钮状态
   */
  function updateFloatButton() {
    const btn = document.querySelector('.imt-float-btn');
    if (btn) {
      btn.classList.toggle('imt-active', isTranslated);
      btn.title = isTranslated ? '显示原文' : '翻译此页面';
    }
  }

  /**
   * 初始化浮动按钮
   */
  function initFloatButton() {
    const btn = IMT.Injector.createFloatButton();
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        translatePage();
      });
    }
  }

  /**
   * 监听来自 popup / background 的消息
   */
  IMT.Messaging.onMessage((message) => {
    switch (message.action) {
      case 'toggle-translate':
        translatePage();
        return { success: true };

      case 'get-status':
        return { isTranslated };

      case 'update-settings':
        Object.assign(settings, message.settings);
        if (isTranslated && message.settings.translationTheme) {
          IMT.Injector.updateTheme(message.settings.translationTheme);
        }
        return { success: true };
    }
  });

  /**
   * 监听快捷键
   */
  if (chrome.commands) {
    // 通过 background 中继
  }

  /**
   * 监听设置变更
   */
  IMT.Storage.onChanged((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) {
        settings[key] = newValue;
      }
    }
    if (changes.translationTheme && isTranslated) {
      IMT.Injector.updateTheme(changes.translationTheme.newValue);
    }
  });

  /**
   * 动态内容观察器 - 翻译新加载的内容
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!isTranslated) return;

      let hasNewContent = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
            !node.classList?.contains('imt-target') &&
            !node.classList?.contains('imt-separator')) {
            hasNewContent = true;
            break;
          }
        }
        if (hasNewContent) break;
      }

      if (hasNewContent) {
        // 延迟处理，等 DOM 稳定
        clearTimeout(setupMutationObserver._timer);
        setupMutationObserver._timer = setTimeout(async () => {
          const blocks = IMT.DOMParser.collectTranslatableBlocks();
          if (blocks.length > 0) {
            await IMT.Translator.translateBlocks(
              blocks,
              settings.targetLanguage,
              settings.translationService,
              settings.translationTheme
            );
          }
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 初始化
  function init() {
    initFloatButton();
    setupMutationObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
