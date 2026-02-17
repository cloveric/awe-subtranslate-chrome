/**
 * Content Script 入口 - 初始化翻译引擎
 */
window.IMT = window.IMT || {};

(function () {
  let isTranslated = false;
  let isTranslating = false;
  let translateBusyStartedAt = 0;
  const MIN_BUSY_VISIBLE_MS = 450;
  let activeTranslateSession = 0;
  let settings = {
    targetLanguage: 'zh-CN',
    translationService: 'google',
    translationTheme: 'underline',
  };

  const SERVICE_NAMES = {
    google: 'Google 翻译', bing: '微软翻译', deepl: 'DeepL',
    openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', deepseek: 'DeepSeek',
  };

  function createTranslateGuard(sessionId) {
    return () => isTranslated && sessionId === activeTranslateSession;
  }

  async function clearBusyWithMinimumDelay(sessionId) {
    const elapsed = Date.now() - translateBusyStartedAt;
    const remaining = Math.max(0, MIN_BUSY_VISIBLE_MS - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    if (sessionId !== undefined && sessionId !== activeTranslateSession) return;
    isTranslating = false;
    updateFloatButton();
  }

  async function translateSelection(text) {
    const selectedText = (text || '').trim();
    if (!selectedText) {
      return { error: '未选中文本' };
    }

    const stored = await IMT.Storage.getAll();
    Object.assign(settings, stored);

    const serviceName = SERVICE_NAMES[settings.translationService] || settings.translationService;
    IMT.Injector.showToast(`正在使用 ${serviceName} 翻译选中文本...`, 1500);

    try {
      const translated = await IMT.Messaging.requestTranslation(
        [selectedText],
        'auto',
        settings.targetLanguage,
        settings.translationService
      );
      const result = translated?.results?.[0];
      if (!result) {
        return { error: '翻译失败' };
      }
      IMT.Injector.showToast(`译文：${result}`, 5000);
      return { success: true, result };
    } catch (err) {
      console.error('[IMT] Selection translation failed:', err);
      return { error: err.message || '翻译失败' };
    }
  }

  /**
   * 翻译当前页面
   */
  async function translatePage() {
    if (isTranslated) {
      // 取消翻译
      activeTranslateSession += 1;
      IMT.Injector.removeAll();
      isTranslated = false;
      isTranslating = false;
      updateFloatButton();
      return;
    }

    // 点击后立即进入工作态，覆盖“DOM 收集阶段无反馈”的空窗
    isTranslating = true;
    translateBusyStartedAt = Date.now();
    updateFloatButton();

    // 加载设置
    const stored = await IMT.Storage.getAll();
    Object.assign(settings, stored);

    // 收集可翻译文本
    const blocks = IMT.DOMParser.collectTranslatableBlocks();
    if (blocks.length === 0) {
      await clearBusyWithMinimumDelay();
      return;
    }

    isTranslated = true;
    const sessionId = ++activeTranslateSession;
    updateFloatButton();

    // Toast 提示正在使用的翻译服务
    const serviceName = SERVICE_NAMES[settings.translationService] || settings.translationService;
    IMT.Injector.showToast(`正在使用 ${serviceName} 翻译...`);

    // 执行翻译
    try {
      await IMT.Translator.translateBlocks(
        blocks,
        settings.targetLanguage,
        settings.translationService,
        settings.translationTheme,
        { shouldContinue: createTranslateGuard(sessionId) }
      );
    } catch (err) {
      console.error('[IMT] Page translation failed:', err);
      if (createTranslateGuard(sessionId)()) {
        IMT.Injector.showToast(`翻译失败：${err.message || '未知错误'}`);
      }
    } finally {
      if (sessionId === activeTranslateSession) {
        await clearBusyWithMinimumDelay(sessionId);
      }
    }
  }

  /**
   * 更新浮动按钮状态
   */
  function updateFloatButton() {
    const btn = document.querySelector('.imt-float-btn');
    if (btn) {
      const showBusy = isTranslated || isTranslating;
      btn.classList.toggle('imt-active', isTranslated);
      btn.classList.toggle('imt-busy', showBusy);
      btn.textContent = showBusy ? '…' : '译';
      if (!isTranslated) {
        btn.title = isTranslating ? '正在准备翻译...' : '翻译此页面';
      } else if (isTranslating) {
        btn.title = '正在翻译...';
      } else {
        btn.title = '翻译已开启，点击显示原文';
      }
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
        translatePage().catch((err) => {
          console.error('[IMT] Toggle translate failed:', err);
        });
        return { success: true };

      case 'get-status':
        return { isTranslated };

      case 'translate-selection':
        return translateSelection(message.text);

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
        const sessionId = activeTranslateSession;
        clearTimeout(setupMutationObserver._timer);
        setupMutationObserver._timer = setTimeout(async () => {
          if (!isTranslated || sessionId !== activeTranslateSession) return;
          const blocks = IMT.DOMParser.collectTranslatableBlocks();
          if (blocks.length > 0) {
            isTranslating = true;
            translateBusyStartedAt = Date.now();
            updateFloatButton();
            try {
              await IMT.Translator.translateBlocks(
                blocks,
                settings.targetLanguage,
                settings.translationService,
                settings.translationTheme,
                { shouldContinue: createTranslateGuard(sessionId) }
              );
            } catch (err) {
              console.error('[IMT] Dynamic content translation failed:', err);
            } finally {
              if (isTranslated && sessionId === activeTranslateSession) {
                await clearBusyWithMinimumDelay(sessionId);
              }
            }
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
