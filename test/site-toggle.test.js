const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getOriginFromUrl,
  isOriginEnabled,
  toggleOriginState,
} = require('../src/site-toggle');

test('getOriginFromUrl returns normalized origin for http(s)', () => {
  assert.equal(getOriginFromUrl('https://example.com/a?b=1'), 'https://example.com');
  assert.equal(getOriginFromUrl('http://localhost:3000/test'), 'http://localhost:3000');
});

test('getOriginFromUrl returns null for unsupported schemes', () => {
  assert.equal(getOriginFromUrl('chrome://extensions'), null);
  assert.equal(getOriginFromUrl('edge://extensions'), null);
  assert.equal(getOriginFromUrl('about:blank'), null);
});

test('isOriginEnabled defaults to true and respects disabled map', () => {
  const disabledOrigins = { 'https://example.com': true };
  assert.equal(isOriginEnabled(disabledOrigins, 'https://example.com'), false);
  assert.equal(isOriginEnabled(disabledOrigins, 'https://other.com'), true);
  assert.equal(isOriginEnabled(undefined, 'https://other.com'), true);
});

test('toggleOriginState flips current state', () => {
  const disabledOrigins = { 'https://example.com': true };

  const enabledUpdate = toggleOriginState(disabledOrigins, 'https://example.com');
  assert.equal(enabledUpdate.enabled, true);
  assert.deepEqual(enabledUpdate.disabledOrigins, {});

  const disabledUpdate = toggleOriginState(enabledUpdate.disabledOrigins, 'https://example.com');
  assert.equal(disabledUpdate.enabled, false);
  assert.deepEqual(disabledUpdate.disabledOrigins, { 'https://example.com': true });
});
