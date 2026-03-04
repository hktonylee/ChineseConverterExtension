const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ZIP_PATH = path.join(ROOT_DIR, 'ChineseConverterExtension.zip');
const CRX_PATH = path.join(ROOT_DIR, 'ChineseConverterExtension.crx');
const PACK_KEY_PATH = path.join(ROOT_DIR, 'ChineseConverterExtension.pem');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function findChromeBinary() {
  if (process.env.CHROME_BIN && process.env.CHROME_BIN.trim()) {
    return process.env.CHROME_BIN.trim();
  }

  const candidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ];

  for (const candidate of candidates) {
    const check = spawnSync('sh', ['-lc', `command -v ${candidate}`], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    if (check.status === 0) {
      return candidate;
    }
  }

  return null;
}

function main() {
  const chromeBinary = findChromeBinary();
  if (!chromeBinary) {
    console.error(
      'Could not find a Chrome/Chromium binary. Set CHROME_BIN or install google-chrome/chromium.'
    );
    process.exit(1);
  }

  run('node', [path.join(__dirname, 'build.js')]);

  if (fs.existsSync(ZIP_PATH)) {
    fs.rmSync(ZIP_PATH, { force: true });
  }
  if (fs.existsSync(CRX_PATH)) {
    fs.rmSync(CRX_PATH, { force: true });
  }

  run('zip', ['-r', ZIP_PATH, '.'], { cwd: DIST_DIR });

  const packArgs = [`--pack-extension=${DIST_DIR}`, '--no-message-box'];
  if (fs.existsSync(PACK_KEY_PATH)) {
    packArgs.push(`--pack-extension-key=${PACK_KEY_PATH}`);
  }

  run(chromeBinary, packArgs);

  const generatedCrx = path.join(ROOT_DIR, 'dist.crx');
  if (!fs.existsSync(generatedCrx)) {
    console.error('Chrome did not generate dist.crx as expected.');
    process.exit(1);
  }

  fs.renameSync(generatedCrx, CRX_PATH);
}

main();
