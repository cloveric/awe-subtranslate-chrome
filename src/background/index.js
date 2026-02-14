/**
 * Background Service Worker - 消息路由 + 翻译 API 调用
 */
import { getService, getAllServices } from '../services/index.js';

/**
 * 从存储获取服务配置
 */
function getServiceConfig() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(['serviceConfigs'], function (result) {
      resolve(result.serviceConfigs || {});
    });
  });
}

/**
 * 处理翻译请求
 */
async function handleTranslate(data) {
  const { texts, from, to, service: serviceId } = data;

  // 获取服务配置
  const configs = await getServiceConfig();
  const serviceConfig = configs[serviceId] || {};

  try {
    const service = getService(serviceId, serviceConfig);
    const results = await service.translate(texts, from, to);
    return { results };
  } catch (err) {
    console.error(`[IMT Background] Translation error (${serviceId}):`, err);
    return { error: err.message };
  }
}

/**
 * 消息监听
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'translate':
      handleTranslate(message)
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true; // async response

    case 'get-services':
      sendResponse({ services: getAllServices() });
      break;

    case 'get-service-config':
      getServiceConfig().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * 快捷键监听
 */
chrome.commands.onCommand.addListener(function (command) {
  if (command === 'toggle-translate') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-translate' });
      }
    });
  }
});

/**
 * 右键菜单
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'imt-translate-page',
    title: '翻译此页面',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'imt-translate-selection',
    title: '翻译选中文本',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'imt-translate-page') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-translate' });
  } else if (info.menuItemId === 'imt-translate-selection') {
    // 选中文本翻译 - 发送到 content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'translate-selection',
      text: info.selectionText,
    });
  }
});

console.log('[IMT] Background service worker started');
