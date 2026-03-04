const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

async function build() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '..', 'src', 'runtime.js')],
    outfile: path.join(DIST_DIR, 'runtime.js'),
    bundle: true,
    format: 'iife',
    target: ['chrome109', 'edge109'],
    minify: true,
    legalComments: 'none',
  });

  const manifest = {
    manifest_version: 3,
    name: 'Simplified to Traditional Chinese Converter',
    version: '1.0.0',
    description: 'Converts Simplified Chinese to Traditional Chinese on page load and dynamic content updates.',
    permissions: ['storage', 'tabs'],
    background: {
      service_worker: 'runtime.js',
    },
    action: {
      default_title: 'Toggle Simplified->Traditional Conversion',
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
