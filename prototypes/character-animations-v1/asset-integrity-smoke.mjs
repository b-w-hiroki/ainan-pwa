import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'animation-manifest.json'), 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const [name, pose] of Object.entries(manifest.poses)) {
  const bytes = await fs.readFile(path.join(root, pose.file));
  const metrics = await page.evaluate(async (src) => {
    const image = new Image(); image.src = src; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    let visible = 0, transparent = 0, minY = image.height, maxY = -1;
    for (let index = 3; index < data.length; index += 4) {
      const alpha = data[index]; const pixel = (index - 3) / 4; const y = Math.floor(pixel / image.width);
      if (alpha > 24) { visible += 1; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      if (alpha === 0) transparent += 1;
    }
    return { width: image.width, height: image.height, visible, transparent, minY, maxY };
  }, `data:image/png;base64,${bytes.toString('base64')}`);
  if (metrics.width !== 320 || metrics.height !== 420) throw new Error(`${name}: wrong frame ${metrics.width}x${metrics.height}`);
  if (metrics.visible < 15000 || metrics.transparent < 50000) throw new Error(`${name}: invalid alpha coverage ${JSON.stringify(metrics)}`);
  if (metrics.maxY < 395 || metrics.maxY > 400) throw new Error(`${name}: pivot drift ${JSON.stringify(metrics)}`);
  if (metrics.minY < 10) throw new Error(`${name}: clipped at top ${JSON.stringify(metrics)}`);
}
await browser.close();
console.log(`PASS: ${Object.keys(manifest.poses).length} transparent 320x420 poses; common lower pivot retained`);
