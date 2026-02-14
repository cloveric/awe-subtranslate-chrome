/**
 * 翻译注入器 - 将译文插入到 DOM 中
 */
window.IMT = window.IMT || {};

window.IMT.Injector = {
  /**
   * 在原文元素后注入译文
   * @param {Element} element - 原文所在的块级元素
   * @param {string} translatedText - 译文
   * @param {string} theme - 翻译主题样式
   */
  inject(element, translatedText, theme = 'underline') {
    if (!element || !translatedText) return;
    if (element.hasAttribute('data-imt-translated')) return;

    // 标记已翻译
    element.setAttribute('data-imt-translated', 'true');

    // 创建译文元素
    const target = document.createElement('font');
    target.className = `imt-target imt-theme-${theme}`;
    target.setAttribute('lang', 'zh-CN');
    target.textContent = translatedText;

    // 添加到元素末尾
    element.appendChild(target);
  },

  /**
   * 显示加载状态
   */
  showLoading(element) {
    if (element.hasAttribute('data-imt-translated')) return;
    element.setAttribute('data-imt-translated', 'loading');

    const loading = document.createElement('font');
    loading.className = 'imt-target imt-loading';
    loading.textContent = '...';
    loading.setAttribute('data-imt-loading', 'true');
    element.appendChild(loading);
  },

  /**
   * 替换加载状态为实际译文
   */
  replaceLoading(element, translatedText, theme = 'underline') {
    const loading = element.querySelector('[data-imt-loading]');
    if (loading) {
      loading.remove();
    }
    element.removeAttribute('data-imt-translated');
    this.inject(element, translatedText, theme);
  },

  /**
   * 移除某个元素的翻译
   */
  remove(element) {
    const targets = element.querySelectorAll('.imt-target');
    targets.forEach((t) => t.remove());
    const separators = element.querySelectorAll('.imt-separator');
    separators.forEach((s) => s.remove());
    element.removeAttribute('data-imt-translated');
  },

  /**
   * 移除页面上所有翻译
   */
  removeAll() {
    document.querySelectorAll('.imt-target').forEach((el) => el.remove());
    document.querySelectorAll('.imt-separator').forEach((el) => el.remove());
    document.querySelectorAll('[data-imt-translated]').forEach((el) => {
      el.removeAttribute('data-imt-translated');
    });
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
    btn.innerHTML = '译';
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
