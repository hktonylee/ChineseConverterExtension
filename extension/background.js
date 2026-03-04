const DISABLED_ORIGINS_KEY = 'disabledOrigins';

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

  chrome.tabs.sendMessage(tab.id, {
    type: 'OPENCC_SET_ENABLED',
    enabled: nextEnabled,
  });
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
