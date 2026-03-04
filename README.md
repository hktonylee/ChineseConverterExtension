# Simplified to Traditional Chinese Converter Extension

A Manifest V3 browser extension (Chrome + Edge) that converts Simplified Chinese text to Traditional Chinese:
- On initial page load
- On dynamic DOM updates via `MutationObserver`
- Using OpenCC (`opencc-js`)
- Per-site toggle from the extension toolbar icon (applies immediately, no reload)
- Built as a single bundled `runtime.js` for both background and content script

## Build
1. Install dependencies: `npm install`
2. Build extension package: `npm run build`
3. Ready-to-load output is created in `dist/`

## Load in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder in this project

## Load in Edge
1. Open `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder in this project

## Notes
- Currently runs on all sites (`<all_urls>`)
- Click the extension icon to toggle current site:
  - `ON`: conversion active
  - `OFF`: conversion paused for this site
- Toggle state is stored per site origin in `chrome.storage.local`
- Turning `OFF` stops future conversion on that page; existing converted text is not reverted
