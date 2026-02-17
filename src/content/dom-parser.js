/**
 * DOM 解析器 - 遍历页面收集可翻译文本
 */
window.IMT = window.IMT || {};

window.IMT.DOMParser = {
  /** 跳过的标签 */
  SKIP_TAGS: new Set([
    'SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
    'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG', 'MATH',
    'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CANVAS', 'AUDIO', 'VIDEO',
    'IMG', 'BR', 'HR',
  ]),

  /** 块级元素 - 文本在这些元素内被视为一个翻译单元 */
  BLOCK_TAGS: new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'NAV', 'HEADER', 'FOOTER',
    'LI', 'DD', 'DT', 'TD', 'TH', 'CAPTION', 'FIGCAPTION',
    'BLOCKQUOTE', 'ADDRESS', 'SUMMARY', 'DETAILS',
  ]),

  /** 内联元素 - 文本与父级合并 */
  INLINE_TAGS: new Set([
    'A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'INS',
    'MARK', 'SMALL', 'SUB', 'SUP', 'ABBR', 'CITE', 'Q',
    'FONT', 'LABEL', 'TIME',
  ]),

  /**
   * 收集页面中所有可翻译的文本块
   * @returns {Array<{element: Element, text: string}>} 翻译单元
   */
  collectTranslatableBlocks() {
    const blocks = [];
    this._walkElement(document.body, blocks);
    return blocks;
  },

  /**
   * 递归遍历 DOM 树
   */
  _walkElement(element, blocks) {
    if (!element || !element.childNodes) return;

    for (const child of element.childNodes) {
      // 跳过已翻译的元素
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList && (
          child.classList.contains('imt-target') ||
          child.classList.contains('imt-separator') ||
          child.hasAttribute('data-imt-translated')
        )) continue;

        // 跳过不翻译的标签
        if (this.SKIP_TAGS.has(child.tagName)) continue;

        // 跳过隐藏元素
        if (child.offsetParent === null && child.tagName !== 'BODY') continue;

        // 块级元素：收集其内部文本
        if (this.BLOCK_TAGS.has(child.tagName)) {
          const text = this._getBlockText(child);
          if (this._isTranslatable(text)) {
            blocks.push({ element: child, text });
          } else {
            // 某些站点（如 Google News）大量使用嵌套块级结构，
            // 父块提取不到文本时继续向下递归，避免整段内容被漏掉。
            this._walkElement(child, blocks);
          }
        } else {
          // 其他元素：递归处理
          this._walkElement(child, blocks);
        }
      }
    }

    // 如果 element 本身是块级且有直接文本子节点，也收集
    if (element !== document.body && !this.BLOCK_TAGS.has(element.tagName)) {
      const directText = this._getDirectText(element);
      if (this._isTranslatable(directText)) {
        blocks.push({ element, text: directText });
      }
    }
  },

  /**
   * 获取块级元素内的所有文本（包括内联子元素）
   */
  _getBlockText(element) {
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList && child.classList.contains('imt-target')) continue;
        if (child.classList && child.classList.contains('imt-separator')) continue;
        if (this.SKIP_TAGS.has(child.tagName)) continue;
        if (this.INLINE_TAGS.has(child.tagName) || !this.BLOCK_TAGS.has(child.tagName)) {
          text += this._getBlockText(child);
        }
      }
    }
    return text;
  },

  /**
   * 获取元素的直接文本节点内容
   */
  _getDirectText(element) {
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      }
    }
    return text;
  },

  /**
   * 判断文本是否值得翻译
   */
  _isTranslatable(text) {
    if (!text) return false;
    const trimmed = text.trim();
    // 太短的文本不翻译
    if (trimmed.length < 2) return false;
    // 纯数字/符号不翻译
    if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) return false;
    // 检查是否包含字母（任何语言）
    if (!/[\p{L}]/u.test(trimmed)) return false;
    return true;
  },

  /**
   * 检测文本是否已经是目标语言（简单启发式）
   */
  isTargetLanguage(text, targetLang) {
    if (!text.trim()) return true;
    if (targetLang.startsWith('zh')) {
      // 检查是否主要是中文字符
      const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const totalLetters = (text.match(/[\p{L}]/gu) || []).length;
      return totalLetters > 0 && chineseChars / totalLetters > 0.5;
    }
    return false;
  }
};
