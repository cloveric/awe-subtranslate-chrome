/**
 * 翻译注入器 - 将译文替换到 DOM 中，并支持还原原文
 */
window.IMT = window.IMT || {};

window.IMT.Injector = {
  /** 原始子节点快照（用于还原） */
  _originalSnapshot: new WeakMap(),

  _captureOriginal(element) {
    if (!element || this._originalSnapshot.has(element)) return;
    const snapshot = Array.from(element.childNodes).map((node) => node.cloneNode(true));
    this._originalSnapshot.set(element, snapshot);
  },

  _restoreOriginal(element) {
    const snapshot = this._originalSnapshot.get(element);
    if (!snapshot) return false;
    const restored = snapshot.map((node) => node.cloneNode(true));
    element.replaceChildren(...restored);
    this._originalSnapshot.delete(element);
    return true;
  },

  /**
   * 将元素内容替换为译文
   * @param {Element} element - 原文所在的块级元素
   * @param {string} translatedText - 译文
   * @param {string} theme - 翻译主题样式
   */
  inject(element, translatedText, theme = 'underline') {
    if (!element || !translatedText) return;
    if (element.getAttribute('data-imt-translated') === 'true') return;

    this._captureOriginal(element);
    element.setAttribute('data-imt-translated', 'true');

    const target = document.createElement('font');
    target.className = `imt-target imt-theme-${theme}`;
    target.setAttribute('lang', 'zh-CN');
    target.textContent = translatedText;
    element.replaceChildren(target);
  },

  /**
   * 显示加载状态
   */
  showLoading(element) {
    if (element.hasAttribute('data-imt-translated')) return;
    this._captureOriginal(element);
    element.setAttribute('data-imt-translated', 'loading');

    const loading = document.createElement('font');
    loading.className = 'imt-target imt-loading';
    loading.textContent = '...';
    loading.setAttribute('data-imt-loading', 'true');
    element.replaceChildren(loading);
  },

  /**
   * 替换加载状态为实际译文
   */
  replaceLoading(element, translatedText, theme = 'underline') {
    this.inject(element, translatedText, theme);
  },

  /**
   * 恢复某个元素的原文
   */
  remove(element) {
    if (!element) return;
    const restored = this._restoreOriginal(element);
    if (!restored) {
      const targets = element.querySelectorAll('.imt-target');
      targets.forEach((t) => t.remove());
      const separators = element.querySelectorAll('.imt-separator');
      separators.forEach((s) => s.remove());
    }
    element.removeAttribute('data-imt-translated');
  },

  /**
   * 移除页面上所有翻译
   */
  removeAll() {
    document.querySelectorAll('[data-imt-translated]').forEach((el) => this.remove(el));
    document.querySelectorAll('.imt-target').forEach((el) => el.remove());
    document.querySelectorAll('.imt-separator').forEach((el) => el.remove());
  },

  /**
   * 更新翻译主题
   */
  updateTheme(newTheme) {
    document.querySelectorAll('.imt-target').forEach((el) => {
      // 移除旧主题 class
      const classes = [...el.classList].filter((c) => c.startsWith('imt-theme-'));
      classes.forEach((c) => el.classList.remove(c));
      // 添加新主题
      el.classList.add(`imt-theme-${newTheme}`);
    });
  },

  /**
   * 创建浮动翻译按钮
   */
  createFloatButton() {
    if (document.querySelector('.imt-float-btn')) return null;

    const btn = document.createElement('button');
    btn.className = 'imt-float-btn';
    btn.textContent = '译';
    btn.title = 'Awe SubTranslate';
    document.body.appendChild(btn);
    return btn;
  },

  /**
   * 移除浮动按钮
   */
  removeFloatButton() {
    const btn = document.querySelector('.imt-float-btn');
    if (btn) btn.remove();
  },

  /**
   * 显示 Toast 提示（显示当前使用的翻译服务）
   */
  showToast(text, duration = 3000) {
    // 移除旧 toast
    document.querySelectorAll('.imt-toast').forEach((el) => el.remove());

    const toast = document.createElement('div');
    toast.className = 'imt-toast';
    toast.innerHTML = `<span class="imt-toast-dot"></span><span>${text}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('imt-toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};
