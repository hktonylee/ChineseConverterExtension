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
const MIN_CHANGED_HAN_RATIO = 0.05;

function countHanCharacters(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return 0;
  }

  let count = 0;
  for (const char of text) {
    if (HAN_CHAR_PATTERN.test(char)) {
      count += 1;
    }
  }

  return count;
}

function countChangedHanCharacters(original, converted) {
  if (typeof original !== 'string' || typeof converted !== 'string') {
    return 0;
  }

  const length = Math.min(original.length, converted.length);
  let changed = 0;

  for (let i = 0; i < length; i += 1) {
    const originalChar = original[i];
    const convertedChar = converted[i];

    if (originalChar === convertedChar) {
      continue;
    }

    if (HAN_CHAR_PATTERN.test(originalChar)) {
      changed += 1;
    }
  }

  return changed;
}

function shouldApplyConvertedText(original, converted, minChangedHanRatio = MIN_CHANGED_HAN_RATIO) {
  if (typeof original !== 'string' || typeof converted !== 'string') {
    return false;
  }

  if (original === converted) {
    return false;
  }

  const hanCount = countHanCharacters(original);
  if (hanCount === 0) {
    return false;
  }

  const changedHanCount = countChangedHanCharacters(original, converted);
  return changedHanCount / hanCount >= minChangedHanRatio;
}

function createTextConverter(convert) {
  if (typeof convert !== 'function') {
    throw new TypeError('convert must be a function');
  }

  return function convertText(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return text;
    }

    const converted = convert(text);
    return shouldApplyConvertedText(text, converted) ? converted : text;
  };
}

module.exports = {
  createTextConverter,
  shouldApplyConvertedText,
  shouldSkipElement,
};
