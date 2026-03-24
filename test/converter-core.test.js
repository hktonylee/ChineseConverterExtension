const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createTextConverter,
  shouldSkipElement,
  shouldApplyConvertedText,
} = require('../src/converter-core');

test('createTextConverter applies provided converter to text', () => {
  const converter = createTextConverter((input) => input.replace('汉语', '漢語'));
  assert.equal(converter('我会说汉语'), '我会说漢語');
});

test('createTextConverter skips conversion when text has no Han characters', () => {
  let calls = 0;
  const converter = createTextConverter((input) => {
    calls += 1;
    return input.toUpperCase();
  });

  const original = 'hello world 123';
  assert.equal(converter(original), original);
  assert.equal(calls, 0);
});

test('createTextConverter keeps original when fewer than 5% of Han chars changed', () => {
  const converter = createTextConverter((input) => input.replace('发', '發'));
  const original = `${'繁'.repeat(20)}发`; // 21 Han chars total; 1 changed => 4.76% (<5%)
  assert.equal(converter(original), original);
});

test('createTextConverter keeps original when fewer than 15% of Han chars changed', () => {
  const converter = createTextConverter((input) => input.replace('发', '發'));
  const original = `${'繁'.repeat(7)}发`; // 8 Han chars total; 1 changed => 12.5% (<15%)
  assert.equal(converter(original), original);
});

test('createTextConverter applies converted text when at least 15% of Han chars changed', () => {
  const converter = createTextConverter((input) => input.replace('发', '發'));
  assert.equal(converter('发出通知'), '發出通知');
});

test('shouldApplyConvertedText uses Han-only ratio', () => {
  assert.equal(shouldApplyConvertedText('A发B', 'A發B'), true);
  assert.equal(shouldApplyConvertedText('abc', 'abc'), false);
});

test('shouldSkipElement returns true for script-like nodes and editable areas', () => {
  const scriptLike = { nodeName: 'SCRIPT', isContentEditable: false, closest: () => null };
  const inputLike = { nodeName: 'INPUT', isContentEditable: false, closest: () => null };
  const editable = { nodeName: 'DIV', isContentEditable: true, closest: () => null };
  const ignored = { nodeName: 'DIV', isContentEditable: false, closest: (selector) => selector === '.ignore-opencc' ? {} : null };
  const normal = { nodeName: 'SPAN', isContentEditable: false, closest: () => null };

  assert.equal(shouldSkipElement(scriptLike), true);
  assert.equal(shouldSkipElement(inputLike), true);
  assert.equal(shouldSkipElement(editable), true);
  assert.equal(shouldSkipElement(ignored), true);
  assert.equal(shouldSkipElement(normal), false);
});
