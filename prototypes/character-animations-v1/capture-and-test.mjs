import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const previewDir = path.join(root, 'previews');
await fs.mkdir(previewDir, { recursive: true });
const base = 'http://127.0.0.1:43191/prototypes/character-animations-v1';
const browser = await chromium.launch({ headless: true });

async function open(viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/preview.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.animationPrototype));
  return { page, errors };
}

const { page, errors } = await open({ width: 390, height: 844 });
await page.screenshot({ path: path.join(previewDir, 'preview-portrait-390x844.png') });
for (const state of ['cast', 'joy', 'sad']) {
  await page.evaluate((value) => { window.animationPrototype.selectState(value); document.querySelector('#speed').value = '1.5'; }, state);
  await page.locator('#play').click();
  const duplicate = await page.evaluate(() => window.animationPrototype.play());
  if (duplicate !== false) throw new Error(`${state}: duplicate play was not rejected`);
  await page.waitForFunction(() => !window.animationPrototype.snapshot().running, null, { timeout: 5000 });
  const snapshot = await page.evaluate(() => window.animationPrototype.snapshot());
  if (snapshot.running || snapshot.pose !== 'idle') throw new Error(`${state}: did not return to idle: ${JSON.stringify(snapshot)}`);
}
await page.evaluate(() => { window.animationPrototype.selectState('fight'); document.querySelector('#speed').value = '1.5'; window.animationPrototype.play(); });
await page.waitForTimeout(900);
const fightA = await page.evaluate(() => window.animationPrototype.snapshot());
if (!fightA.running || !fightA.pose.startsWith('fight-')) throw new Error(`fight: loop not active: ${JSON.stringify(fightA)}`);
await page.evaluate(() => window.animationPrototype.selectState('cast'));
const interrupted = await page.evaluate(() => window.animationPrototype.snapshot());
if (interrupted.running || interrupted.pose !== 'idle') throw new Error(`interrupt: unsafe state: ${JSON.stringify(interrupted)}`);
await page.evaluate(() => { window.animationPrototype.selectState('joy'); window.animationPrototype.play(); });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(previewDir, 'preview-portrait-action.png') });
await page.close();

const landscape = await open({ width: 844, height: 390 });
const transportVisible = await landscape.page.locator('.transport').isVisible();
if (!transportVisible) throw new Error('landscape: transport controls hidden');
await landscape.page.evaluate(() => { window.animationPrototype.selectState('fight'); window.animationPrototype.play(); });
await landscape.page.waitForTimeout(650);
await landscape.page.screenshot({ path: path.join(previewDir, 'preview-landscape-844x390.png') });
await landscape.page.close();

const anchors = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
await anchors.goto(`${base}/anchor-sheet.html`, { waitUntil: 'networkidle' });
await anchors.screenshot({ path: path.join(previewDir, 'pose-anchor-comparison.png'), fullPage: true });
await anchors.close();
if (errors.length || landscape.errors.length) throw new Error(`browser errors: ${[...errors, ...landscape.errors].join('; ')}`);

const videoContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: previewDir, size: { width: 1280, height: 720 } } });
const videoPage = await videoContext.newPage();
await videoPage.goto(`${base}/preview.html`, { waitUntil: 'networkidle' });
await videoPage.waitForFunction(() => Boolean(window.animationPrototype));
for (const state of ['cast', 'fight', 'joy', 'sad']) {
  await videoPage.evaluate((value) => { window.animationPrototype.selectState(value); document.querySelector('#speed').value = '1'; window.animationPrototype.play(); }, state);
  await videoPage.waitForTimeout(state === 'fight' ? 2300 : 2300);
  if (state === 'fight') await videoPage.evaluate(() => window.animationPrototype.stop());
}
const video = videoPage.video();
await videoContext.close();
const generated = await video.path();
await fs.copyFile(generated, path.join(previewDir, 'ainan-four-state-animation.webm'));
await browser.close();
console.log('PASS: one-shot idle return, duplicate guard, loop, interruption, portrait, landscape, screenshots, video');
