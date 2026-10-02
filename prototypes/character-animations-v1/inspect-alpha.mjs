import fs from 'node:fs/promises';
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs';

const files = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const file of files) {
  const data = await fs.readFile(file);
  const uri = `data:image/png;base64,${data.toString('base64')}`;
  const result = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    let opaque = 0;
    let partial = 0;
    let minAlpha = 255;
    let maxAlpha = 0;
    const bins = Array(8).fill(0);
    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = pixels[i];
      minAlpha = Math.min(minAlpha, alpha);
      maxAlpha = Math.max(maxAlpha, alpha);
      bins[Math.min(7, Math.floor(alpha / 32))] += 1;
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else partial += 1;
    }
    return { width: canvas.width, height: canvas.height, transparent, partial, opaque, minAlpha, maxAlpha, bins };
  }, uri);
  console.log(file, JSON.stringify(result));
}
await browser.close();
