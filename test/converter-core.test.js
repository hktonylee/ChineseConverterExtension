const test = require('node:test');
const assert = require('node:assert/strict');

const { createTextConverter, shouldSkipElement } = require('../src/converter-core');

test('createTextConverter applies provided converter to text', () => {
  const converter = createTextConverter((input) => input.replace('汉语', '漢語'));
  assert.equal(converter('我会说汉语'), '我会说漢語');
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
