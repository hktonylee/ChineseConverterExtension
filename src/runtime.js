const OpenCC = require('opencc-js');
const { createTextConverter } = require('./converter-core');

const DISABLED_ORIGINS_KEY = 'disabledOrigins';
const EXCLUDED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'CODE',
  'PRE',
]);

function getOriginFromUrl(url) {
  if (typeof url !== 'string' || !url) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed.origin;
}

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

function initBackground() {
  if (
    typeof chrome === 'undefined' ||
    !chrome.storage ||
    !chrome.action ||
    !chrome.tabs ||
    !chrome.runtime
  ) {
    return;
  }

  function getDisabledOrigins() {
    return new Promise((resolve) => {
      chrome.storage.local.get(DISABLED_ORIGINS_KEY, (result) => {
        resolve(result[DISABLED_ORIGINS_KEY] || {});
      });
    });
  }

  function setDisabledOrigins(disabledOrigins) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [DISABLED_ORIGINS_KEY]: disabledOrigins }, resolve);
    });
  }

  function setBadgeForTab(tabId, enabled) {
    chrome.action.setBadgeBackgroundColor({ color: enabled ? '#0A7A0A' : '#A10F0F', tabId });
    chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF', tabId });
  }

  async function getEnabledForUrl(url) {
    const origin = getOriginFromUrl(url);
    if (!origin) {
      return null;
    }

    const disabledOrigins = await getDisabledOrigins();
    return disabledOrigins[origin] !== true;
  }

  chrome.action.onClicked.addListener(async (tab) => {
    const origin = getOriginFromUrl(tab.url);
    if (!origin || typeof tab.id !== 'number') {
      return;
    }

    const disabledOrigins = await getDisabledOrigins();
    const currentlyEnabled = disabledOrigins[origin] !== true;
    const nextEnabled = !currentlyEnabled;

    if (nextEnabled) {
      delete disabledOrigins[origin];
    } else {
      disabledOrigins[origin] = true;
    }

    await setDisabledOrigins(disabledOrigins);
    setBadgeForTab(tab.id, nextEnabled);

    chrome.tabs.sendMessage(
      tab.id,
      {
        type: 'OPENCC_SET_ENABLED',
        enabled: nextEnabled,
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });

  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    const enabled = await getEnabledForUrl(tab.url);
    if (enabled === null) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    setBadgeForTab(tabId, enabled);
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
      return;
    }

    const enabled = await getEnabledForUrl(tab.url);
    if (enabled === null) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }
    setBadgeForTab(tabId, enabled);
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'OPENCC_GET_ENABLED_STATE') {
      return;
    }

    const sourceUrl = message.url || sender.url;
    getEnabledForUrl(sourceUrl).then((enabled) => {
      sendResponse({ enabled: enabled !== false });
    });

    return true;
  });
}

function initContentScript() {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof chrome === 'undefined' ||
    !chrome.runtime
  ) {
    return;
  }

  if (window.__openccRuntimeLoaded) {
    return;
  }
  window.__openccRuntimeLoaded = true;

  if (typeof OpenCC.Converter !== 'function') {
    console.error('[OpenCC Extension] OpenCC library not available.');
    return;
  }

  const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
  const convertText = createTextConverter(converter);

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

    const converted = convertText(original);
    if (converted !== original) {
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

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipElement(node.parentElement)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    });

    let current;
    while ((current = walker.nextNode())) {
      convertTextNode(current);
    }
  }

  function startObserver() {
    if (observer) {
      return;
    }

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

    const root = document.documentElement || document;
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

    const root = document.documentElement || document.body || document;
    convertSubtree(root);
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

        applyEnabledState(response && response.enabled !== false);
      }
    );
  }

  init();
}

initBackground();
initContentScript();
