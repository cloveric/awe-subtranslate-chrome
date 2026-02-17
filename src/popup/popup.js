/**
 * Popup 逻辑
 */
(async function () {
  const btnTranslate = document.getElementById('btn-translate');
  const btnSettings = document.getElementById('btn-settings');
  const selTargetLang = document.getElementById('sel-target-lang');
  const selService = document.getElementById('sel-service');
  const selTheme = document.getElementById('sel-theme');
  const chkSubtitle = document.getElementById('chk-subtitle');
  const currentServiceName = document.getElementById('current-service-name');

  const SERVICE_NAMES = {
    google: 'Google 翻译', bing: '微软翻译', deepl: 'DeepL',
    openai: 'OpenAI', claude: 'Claude', gemini: 'Gemini', deepseek: 'DeepSeek',
  };

  // 加载设置
  const settings = await chrome.storage.local.get([
    'targetLanguage', 'translationService', 'translationTheme', 'enableSubtitle'
  ]);

  selTargetLang.value = settings.targetLanguage || 'zh-CN';
  selService.value = settings.translationService || 'google';
  selTheme.value = settings.translationTheme || 'underline';
  chkSubtitle.checked = settings.enableSubtitle === true;

  // 检查当前页面翻译状态
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'get-status' });
      if (response && response.isTranslated) {
        btnTranslate.classList.add('active');
        btnTranslate.querySelector('.btn-text').textContent = '显示原文';
      }
    }
  } catch (e) {
    // Content script 可能未加载
  }

  // 翻译按钮
  btnTranslate.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-translate' });
      const isActive = btnTranslate.classList.toggle('active');
      btnTranslate.querySelector('.btn-text').textContent = isActive ? '显示原文' : '翻译此页面';
    } catch (e) {
      // 如果 content script 未加载，先注入
      console.error('Failed to send message:', e);
    }
  });

  // 设置按钮
  btnSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 语言选择变化
  selTargetLang.addEventListener('change', () => {
    chrome.storage.local.set({ targetLanguage: selTargetLang.value });
  });

  // 更新服务指示器
  function updateServiceIndicator(serviceId) {
    currentServiceName.textContent = SERVICE_NAMES[serviceId] || serviceId;
  }
  updateServiceIndicator(selService.value);

  // 翻译服务变化
  selService.addEventListener('change', () => {
    chrome.storage.local.set({ translationService: selService.value });
    updateServiceIndicator(selService.value);
  });

  // 主题变化
  selTheme.addEventListener('change', async () => {
    const theme = selTheme.value;
    chrome.storage.local.set({ translationTheme: theme });
    // 通知当前页面更新主题
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'update-settings',
          settings: { translationTheme: theme },
        });
      }
    } catch (e) {}
  });

  // 字幕开关
  chkSubtitle.addEventListener('change', () => {
    chrome.storage.local.set({ enableSubtitle: chkSubtitle.checked });
  });
})();
