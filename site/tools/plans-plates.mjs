// Renders the home page's "plans → 3D" plates: a line drawing and a render of the tower from one camera,
// for a wide (desktop) and a tall (phone) frame, saved as WebP in public/media/.
// Re-run after changing the tower model. Needs Playwright with Chromium (npx playwright install chromium).
// Usage: node site/tools/plans-plates.mjs
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
/* global window, document, Image -- the page.evaluate callbacks run in the browser */

// require() so a global Playwright install (NODE_PATH) works as well as a local one.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = fileURLToPath(new URL('../../public/', import.meta.url));
const HARNESS = fileURLToPath(new URL('./plans-plates.html', import.meta.url));
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2'};
// The camera matches engine.drive(PROGRESS): early in the film, between morning and sunset light.
const PROGRESS = .3;
const FRAMES = [['wide', 2000, 1125], ['tall', 900, 1125]];

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    const body = readFileSync(path === '/_plates.html' ? HARNESS : join(ROOT, path));
    res.writeHead(200, {'Content-Type': TYPES[extname(path)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const {port} = server.address();
const browser = await chromium.launch({args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']});
try {
  for (const [name, w, h] of FRAMES) {
    const page = await browser.newPage({viewport: {width: w, height: h * 2 + 10}, deviceScaleFactor: 1});
    await page.goto(`http://127.0.0.1:${port}/_plates.html?w=${w}&h=${h}&k=${PROGRESS}&noline=wood`);
    await page.waitForFunction(() => window.renderReady && window.drawReady, null, {timeout: 240000});
    await page.waitForTimeout(6000);
    for (const [kind, selector, quality] of [['draw', '#comp', .88], ['render', '#render', .82]]) {
      const png = await page.locator(selector).screenshot({timeout: 300000});
      // Chromium encodes WebP from a canvas, so no image library is needed.
      const webp = await page.evaluate(async ([data, q]) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', q).split(',')[1];
      }, [png.toString('base64'), quality]);
      writeFileSync(join(ROOT, `media/plans-${name}-${kind}.webp`), Buffer.from(webp, 'base64'));
      console.log(`media/plans-${name}-${kind}.webp`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
