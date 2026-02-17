/**
 * Options 页面逻辑
 */
(async function () {
  // =====================
  // Tab 导航
  // =====================
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.tab === tabId));
    tabContents.forEach((content) => content.classList.toggle('active', content.id === tabId));
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(item.dataset.tab);
      history.replaceState(null, '', `#${item.dataset.tab}`);
    });
  });

  // 从 URL hash 恢复 tab
  const hash = location.hash.slice(1);
  if (hash) switchTab(hash);

  // =====================
  // 加载设置
  // =====================
  const settings = await chrome.storage.local.get([
    'targetLanguage', 'translationService', 'translationTheme',
    'enableSubtitle', 'serviceConfigs',
  ]);

  const serviceConfigs = settings.serviceConfigs || {};

  // 通用设置
  document.getElementById('opt-target-lang').value = settings.targetLanguage || 'zh-CN';
  document.getElementById('opt-service').value = settings.translationService || 'google';
  document.getElementById('opt-theme').value = settings.translationTheme || 'underline';
  document.getElementById('opt-enable-subtitle').checked = settings.enableSubtitle === true;

  // 服务配置
  document.getElementById('cfg-deepl-key').value = serviceConfigs.deepl?.deeplApiKey || '';
  document.getElementById('cfg-openai-key').value = serviceConfigs.openai?.openaiApiKey || '';
  document.getElementById('cfg-openai-url').value = serviceConfigs.openai?.openaiBaseUrl || '';
  document.getElementById('cfg-openai-model').value = serviceConfigs.openai?.openaiModel || '';
  document.getElementById('cfg-claude-key').value = serviceConfigs.claude?.claudeApiKey || '';
  document.getElementById('cfg-claude-url').value = serviceConfigs.claude?.claudeBaseUrl || '';
  document.getElementById('cfg-claude-model').value = serviceConfigs.claude?.claudeModel || '';
  document.getElementById('cfg-deepseek-key').value = serviceConfigs.deepseek?.deepseekApiKey || '';
  document.getElementById('cfg-deepseek-url').value = serviceConfigs.deepseek?.deepseekBaseUrl || '';
  document.getElementById('cfg-deepseek-model').value = serviceConfigs.deepseek?.deepseekModel || 'deepseek-chat';
  document.getElementById('cfg-gemini-key').value = serviceConfigs.gemini?.geminiApiKey || '';
  document.getElementById('cfg-gemini-model').value = serviceConfigs.gemini?.geminiModel || 'gemini-2.5-flash-preview-05-20';

  // =====================
  // 通用设置变更
  // =====================
  document.getElementById('opt-target-lang').addEventListener('change', (e) => {
    chrome.storage.local.set({ targetLanguage: e.target.value });
  });

  document.getElementById('opt-service').addEventListener('change', (e) => {
    chrome.storage.local.set({ translationService: e.target.value });
  });

  document.getElementById('opt-theme').addEventListener('change', (e) => {
    chrome.storage.local.set({ translationTheme: e.target.value });
    updateThemePreview(e.target.value);
  });

  document.getElementById('opt-enable-subtitle').addEventListener('change', (e) => {
    chrome.storage.local.set({ enableSubtitle: e.target.checked });
  });

  // =====================
  // 主题预览
  // =====================
  function updateThemePreview(theme) {
    const preview = document.getElementById('theme-preview-text');
    if (!preview) return;
    // 移除所有主题 class
    [...preview.classList]
      .filter((c) => c.startsWith('imt-theme-'))
      .forEach((c) => preview.classList.remove(c));
    preview.classList.add(`imt-theme-${theme}`);
  }

  updateThemePreview(settings.translationTheme || 'underline');

  // =====================
  // 保存服务配置
  // =====================
  document.getElementById('btn-save-services').addEventListener('click', async () => {
    const configs = {
      deepl: {
        deeplApiKey: document.getElementById('cfg-deepl-key').value.trim(),
      },
      openai: {
        openaiApiKey: document.getElementById('cfg-openai-key').value.trim(),
        openaiBaseUrl: document.getElementById('cfg-openai-url').value.trim(),
        openaiModel: document.getElementById('cfg-openai-model').value.trim(),
      },
      claude: {
        claudeApiKey: document.getElementById('cfg-claude-key').value.trim(),
        claudeBaseUrl: document.getElementById('cfg-claude-url').value.trim(),
        claudeModel: document.getElementById('cfg-claude-model').value.trim(),
      },
      deepseek: {
        deepseekApiKey: document.getElementById('cfg-deepseek-key').value.trim(),
        deepseekBaseUrl: document.getElementById('cfg-deepseek-url').value.trim(),
        deepseekModel: document.getElementById('cfg-deepseek-model').value.trim(),
      },
      gemini: {
        geminiApiKey: document.getElementById('cfg-gemini-key').value.trim(),
        geminiModel: document.getElementById('cfg-gemini-model').value.trim(),
      },
    };

    await chrome.storage.local.set({ serviceConfigs: configs });

    const status = document.getElementById('save-status');
    status.textContent = '✓ 已保存';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });

  // =====================
  // 导入/导出
  // =====================
  document.getElementById('btn-export').addEventListener('click', async () => {
    const all = await chrome.storage.local.get(null);
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imt-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });

  document.getElementById('file-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await chrome.storage.local.set(data);
      location.reload();
    } catch (err) {
      alert('配置文件格式错误: ' + err.message);
    }
  });

  // =====================
  // 重置
  // =====================
  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (!confirm('确定要恢复默认设置吗？所有配置将被清除。')) return;
    await chrome.storage.local.clear();
    location.reload();
  });
})();
