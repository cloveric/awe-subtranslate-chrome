/**
 * Chrome Storage 封装
 */
window.IMT = window.IMT || {};

window.IMT.Storage = {
  defaults: {
    targetLanguage: 'zh-CN',
    translationService: 'google',
    translationTheme: 'underline',
    enableSubtitle: true,
    serviceConfigs: {},
  },

  get: function (keys) {
    var self = this;
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (result) {
        if (Array.isArray(keys)) {
          var merged = {};
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            merged[key] = result[key] !== undefined ? result[key] : self.defaults[key];
          }
          resolve(merged);
        } else if (typeof keys === 'string') {
          resolve(result[keys] !== undefined ? result[keys] : self.defaults[keys]);
        } else {
          resolve(result);
        }
      });
    });
  },

  set: function (data) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(data, function () {
        resolve();
      });
    });
  },

  getAll: function () {
    return this.get(Object.keys(this.defaults));
  },

  onChanged: function (callback) {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local') callback(changes);
    });
  }
};
