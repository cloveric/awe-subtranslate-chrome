/**
 * 消息通信封装
 */
window.IMT = window.IMT || {};

window.IMT.Messaging = {
  /**
   * 发送消息到 background service worker
   */
  sendToBackground: function (action, data) {
    data = data || {};
    var msg = Object.assign({ action: action }, data);
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(msg, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * 请求翻译
   */
  requestTranslation: function (texts, from, to, service) {
    return this.sendToBackground('translate', { texts: texts, from: from, to: to, service: service });
  },

  /**
   * 监听来自 background 的消息
   */
  onMessage: function (callback) {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      var result = callback(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse).catch(function (err) { sendResponse({ error: err.message }); });
        return true;
      }
      if (result !== undefined) sendResponse(result);
    });
  }
};
