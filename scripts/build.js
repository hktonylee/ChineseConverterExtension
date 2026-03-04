const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const ICONS_SRC_DIR = path.resolve(__dirname, '..', 'extension', 'icons');
const ICONS_DIST_DIR = path.join(DIST_DIR, 'icons');
const MANIFEST_SRC_PATH = path.resolve(__dirname, '..', 'extension', 'manifest.json');

function createBundledManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_SRC_PATH, 'utf8'));
  const firstContentScript = Array.isArray(manifest.content_scripts) ? manifest.content_scripts[0] : undefined;

  manifest.background = { service_worker: 'runtime.js' };
  manifest.content_scripts = [
    {
      matches: firstContentScript?.matches || ['<all_urls>'],
      js: ['runtime.js'],
      run_at: firstContentScript?.run_at || 'document_start',
    },
  ];
  manifest.icons = manifest.icons || {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  };
  manifest.action = manifest.action || {};
  manifest.action.default_icon = manifest.action.default_icon || {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
  };

  return manifest;
}

async function build() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(ICONS_DIST_DIR, { recursive: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '..', 'src', 'runtime.js')],
    outfile: path.join(DIST_DIR, 'runtime.js'),
    bundle: true,
    format: 'iife',
    target: ['chrome109', 'edge109'],
    minify: true,
    legalComments: 'none',
  });

  const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
  for (const iconFile of iconFiles) {
    fs.copyFileSync(path.join(ICONS_SRC_DIR, iconFile), path.join(ICONS_DIST_DIR, iconFile));
  }

  const manifest = createBundledManifest();

  fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
