const test = require('node:test');
const assert = require('node:assert/strict');

function loadContentScript({ readyState = 'loading' } = {}) {
  const scriptPath = require.resolve('../extension/content.js');
  delete require.cache[scriptPath];

  const listeners = [];
  const sendMessageCalls = [];
  const documentElement = { style: {} };

  global.window = {
    location: { href: 'https://example.com/article' },
    OpenCC: {
      Converter() {
        return (text) => text;
      },
    },
  };
  global.document = {
    readyState,
    documentElement,
    addEventListener(type, listener, options) {
      listeners.push({ type, listener, options });
    },
    createTreeWalker() {
      return {
        nextNode() {
          return null;
        },
      };
    },
  };
  global.Node = { TEXT_NODE: 3 };
  global.NodeFilter = {
    SHOW_TEXT: 4,
    FILTER_REJECT: 2,
    FILTER_ACCEPT: 1,
  };
  global.MutationObserver = class MutationObserver {
    observe() {}

    disconnect() {}
  };
  global.chrome = {
    runtime: {
      lastError: null,
      onMessage: {
        addListener() {},
      },
      sendMessage(message, callback) {
        sendMessageCalls.push({ message, callback });
      },
    },
  };

  require('../extension/content.js');

  return {
    documentElement,
    listeners,
    sendMessageCalls,
    cleanup() {
      delete require.cache[scriptPath];
      delete global.window;
      delete global.document;
      delete global.Node;
      delete global.NodeFilter;
      delete global.MutationObserver;
      delete global.chrome;
    },
  };
}

test('content script requests enabled state immediately during document_start', () => {
  const { sendMessageCalls, listeners, cleanup } = loadContentScript({ readyState: 'loading' });

  assert.equal(sendMessageCalls.length, 1);
  assert.equal(sendMessageCalls[0].message.type, 'OPENCC_GET_ENABLED_STATE');
  assert.equal(listeners.length, 0);

  cleanup();
});

test('content script does not hide the page while waiting for state', () => {
  const { documentElement, cleanup } = loadContentScript({ readyState: 'loading' });

  assert.equal(documentElement.style.visibility, undefined);

  cleanup();
});
