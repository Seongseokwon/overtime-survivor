import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const PRE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const opts = { args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] };
if (existsSync(PRE)) opts.executablePath = PRE;

const browser = await chromium.launch(opts);
const errors = [];

async function shot(name, viewport, waitMs, action) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  await page.goto('http://localhost:3111/play', { waitUntil: 'networkidle' });
  await page.waitForTimeout(waitMs);
  if (action) await action(page);
  await page.screenshot({ path: `/home/claude/shots/${name}.png` });
  await page.close();
}

await shot('field-desktop', { width: 1280, height: 720 }, 6000);
await shot('field-mobile', { width: 393, height: 695 }, 6000);
// 레벨업 카드가 뜰 때까지 기다렸다가 촬영
await shot('cards-desktop', { width: 1280, height: 720 }, 1500, async (p) => {
  await p.waitForSelector('.os-cards', { timeout: 30000 });
  await p.waitForTimeout(400);
});
await shot('cards-mobile', { width: 393, height: 695 }, 1500, async (p) => {
  await p.waitForSelector('.os-cards', { timeout: 30000 });
  await p.waitForTimeout(400);
});

console.log(errors.length ? errors : 'no page errors');
await browser.close();
