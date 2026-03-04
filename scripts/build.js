const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const ICONS_SRC_DIR = path.resolve(__dirname, '..', 'extension', 'icons');
const ICONS_DIST_DIR = path.join(DIST_DIR, 'icons');

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

  const manifest = {
    manifest_version: 3,
    name: 'Simplified to Traditional Chinese Converter',
    version: '1.0.0',
    description: 'Converts Simplified Chinese to Traditional Chinese on page load and dynamic content updates.',
    permissions: ['storage', 'tabs'],
    background: {
      service_worker: 'runtime.js',
    },
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    action: {
      default_title: 'Toggle Simplified->Traditional Conversion',
      default_icon: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
      },
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['runtime.js'],
        run_at: 'document_start',
      },
    ],
  };

  fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
