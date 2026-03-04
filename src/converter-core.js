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

function createTextConverter(convert) {
  if (typeof convert !== 'function') {
    throw new TypeError('convert must be a function');
  }

  return function convertText(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return text;
    }

    return convert(text);
  };
}

module.exports = {
  createTextConverter,
  shouldSkipElement,
};
