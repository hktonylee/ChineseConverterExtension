const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_SCRIPT = path.join(ROOT_DIR, 'scripts', 'build.js');
const SOURCE_MANIFEST_PATH = path.join(ROOT_DIR, 'extension', 'manifest.json');
const DIST_MANIFEST_PATH = path.join(ROOT_DIR, 'dist', 'manifest.json');

test('build output manifest keeps user-facing metadata from extension manifest', () => {
  const build = spawnSync('node', [BUILD_SCRIPT], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(build.status, 0, build.stderr || build.stdout);

  const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, 'utf8'));
  const distManifest = JSON.parse(fs.readFileSync(DIST_MANIFEST_PATH, 'utf8'));

  assert.equal(distManifest.name, sourceManifest.name);
  assert.equal(distManifest.description, sourceManifest.description);
  assert.deepEqual(distManifest.permissions, sourceManifest.permissions);
  assert.equal(distManifest.action?.default_title, sourceManifest.action?.default_title);
});
