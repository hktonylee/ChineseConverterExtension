(() => {
  if (window.__openccS2TLoaded) {
    return;
  }
  window.__openccS2TLoaded = true;

  const EXCLUDED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEXTAREA',
    'INPUT',
    'CODE',
    'PRE',
  ]);

  function shouldSkipElement(element) {
    if (!element) {
      return true;
    }

    if (EXCLUDED_TAGS.has(element.nodeName)) {
      return true;
    }

    if (element.isContentEditable) {
      return true;
    }

    if (typeof element.closest === 'function' && element.closest('.ignore-opencc')) {
      return true;
    }

    return false;
  }

  const HAN_CHAR_PATTERN = /\p{Script=Han}/u;
  const MIN_CHANGED_HAN_RATIO = 0.1;

  function hasHanCharacters(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return false;
    }

    for (const char of text) {
      if (HAN_CHAR_PATTERN.test(char)) {
        return true;
      }
    }

    return false;
  }

  function shouldApplyConvertedText(original, converted) {
    if (typeof original !== 'string' || typeof converted !== 'string' || original === converted) {
      return false;
    }

    let hanCount = 0;
    let changedHanCount = 0;

    for (let index = 0; index < original.length; index += 1) {
      const originalChar = original[index];
      const convertedChar = converted[index];

      if (HAN_CHAR_PATTERN.test(originalChar)) {
        hanCount += 1;
        if (originalChar !== convertedChar) {
          changedHanCount += 1;
        }
      }
    }

    if (hanCount === 0) {
      return false;
    }

    return changedHanCount / hanCount >= MIN_CHANGED_HAN_RATIO;
  }

  if (!window.OpenCC || typeof window.OpenCC.Converter !== 'function') {
    console.error('[OpenCC Extension] OpenCC library not available.');
    return;
  }

  const converter = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
  let observer = null;
  let isEnabled = true;

  function convertTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const parent = textNode.parentElement;
    if (shouldSkipElement(parent)) {
      return;
    }

    const original = textNode.nodeValue;
    if (!original || !original.trim()) {
      return;
    }

    if (!hasHanCharacters(original)) {
      return;
    }

    const converted = converter(original);
    if (shouldApplyConvertedText(original, converted)) {
      textNode.nodeValue = converted;
    }
  }

  function convertSubtree(root) {
    if (!root) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      convertTextNode(root);
      return;
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return shouldSkipElement(node.parentElement)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let current;
    while ((current = walker.nextNode())) {
      convertTextNode(current);
    }
  }

  function startObserver() {
    if (observer) {
      return;
    }

    const root = document.documentElement;

    observer = new MutationObserver((mutations) => {
      if (!isEnabled) {
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          convertTextNode(mutation.target);
          continue;
        }

        for (const node of mutation.addedNodes) {
          convertSubtree(node);
        }
      }
    });

    MutationObserver.prototype.observe.call(observer, root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function stopObserver() {
    if (!observer) {
      return;
    }
    observer.disconnect();
    observer = null;
  }

  function applyEnabledState(enabled) {
    isEnabled = enabled === true;
    if (!isEnabled) {
      stopObserver();
      return;
    }

    convertSubtree(document.documentElement);
    startObserver();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'OPENCC_SET_ENABLED') {
      return;
    }

    applyEnabledState(message.enabled === true);
    sendResponse({ ok: true });
  });

  function init() {
    chrome.runtime.sendMessage(
      {
        type: 'OPENCC_GET_ENABLED_STATE',
        url: window.location.href,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          applyEnabledState(true);
          return;
        }
        applyEnabledState(response?.enabled !== false);
      }
    );
  }

  init();
})();
