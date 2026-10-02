import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const outputDir = path.join(root, 'assets');
await fs.mkdir(outputDir, { recursive: true });

const inputs = [
  ['cast-windup', 'sources/cast-poses-sheet.png', 0, 2],
  ['cast-mid', 'sources/inbetween-poses-sheet.png', 0, 4],
  ['cast-release', 'sources/cast-poses-sheet.png', 1, 2],
  ['fight-left', 'sources/fight-poses-sheet.png', 0, 2],
  ['fight-mid', 'sources/inbetween-poses-sheet.png', 1, 4],
  ['fight-right', 'sources/fight-poses-sheet.png', 1, 2],
  ['joy-lift', 'sources/joy-poses-sheet.png', 0, 2],
  ['joy-mid', 'sources/inbetween-poses-sheet.png', 2, 4],
  ['joy-hold', 'sources/joy-poses-sheet.png', 1, 2],
  ['sad-drop', 'sources/sad-poses-sheet.png', 0, 2],
  ['sad-mid', 'sources/inbetween-poses-sheet.png', 3, 4],
  ['sad-slump', 'sources/sad-poses-sheet.png', 1, 2],
  ['idle', '../cast-layer-set-v2/assets/character-390x844.png', null, 1],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const [name, relativeFile, half, segments] of inputs) {
  const data = await fs.readFile(path.join(root, relativeFile));
  const result = await page.evaluate(async ({ uri, half, name, relativeFile, segments }) => {
    const image = new Image();
    image.src = uri;
    await image.decode();
    const source = document.createElement('canvas');
    source.width = half === null ? image.naturalWidth : Math.floor(image.naturalWidth / segments);
    source.height = image.naturalHeight;
    const sourceContext = source.getContext('2d', { willReadFrequently: true });
    const sx = half === null ? 0 : half * source.width;
    sourceContext.drawImage(image, sx, 0, source.width, source.height, 0, 0, source.width, source.height);
    const frame = sourceContext.getImageData(0, 0, source.width, source.height);
    const pixels = frame.data;
    let minX = source.width;
    let minY = source.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const index = (y * source.width + x) * 4;
        let alpha = pixels[index + 3];
        if (name === 'sad-drop' && x > source.width * 0.72 && y > source.height * 0.2 && y < source.height * 0.56) alpha = 0;
        if (name === 'fight-right' && x < source.width * 0.14 && y > source.height * 0.55) alpha = 0;
        alpha = alpha <= 72 ? 0 : Math.round(Math.min(255, ((alpha - 72) / 150) * 255));
        pixels[index + 3] = alpha;
        if (alpha > 24) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (name === 'fight-right') {
      const count = source.width * source.height;
      const seen = new Uint8Array(count);
      let largest = [];
      for (let start = 0; start < count; start += 1) {
        if (seen[start] || pixels[start * 4 + 3] <= 24) continue;
        const component = [];
        const queue = [start];
        seen[start] = 1;
        for (let head = 0; head < queue.length; head += 1) {
          const current = queue[head];
          component.push(current);
          const x = current % source.width;
          const candidates = [current - source.width, current + source.width];
          if (x > 0) candidates.push(current - 1);
          if (x + 1 < source.width) candidates.push(current + 1);
          for (const next of candidates) {
            if (next >= 0 && next < count && !seen[next] && pixels[next * 4 + 3] > 24) { seen[next] = 1; queue.push(next); }
          }
        }
        if (component.length > largest.length) largest = component;
      }
      const keep = new Uint8Array(count);
      for (const pixel of largest) keep[pixel] = 1;
      minX = source.width; minY = source.height; maxX = -1; maxY = -1;
      for (let index = 0; index < count; index += 1) {
        if (!keep[index]) pixels[index * 4 + 3] = 0;
        else {
          const x = index % source.width; const y = Math.floor(index / source.width);
          minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    sourceContext.putImageData(frame, 0, 0);
    const target = document.createElement('canvas');
    target.width = 320;
    target.height = 420;
    const targetContext = target.getContext('2d');
    targetContext.imageSmoothingEnabled = true;
    targetContext.imageSmoothingQuality = 'high';
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const desiredHeight = name === 'idle' ? 320 : 350;
    const scale = Math.min(285 / width, desiredHeight / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    const dx = (target.width - drawWidth) / 2;
    const dy = 400 - drawHeight;
    targetContext.drawImage(source, minX, minY, width, height, dx, dy, drawWidth, drawHeight);
    return {
      data: target.toDataURL('image/png').split(',')[1],
      ledger: { source: relativeFile, half, sourceBounds: [minX, minY, maxX, maxY], frame: [320, 420], pivot: [160, 400], renderedBounds: [Math.round(dx), Math.round(dy), Math.round(dx + drawWidth), 400] },
    };
  }, { uri: `data:image/png;base64,${data.toString('base64')}`, half, name, relativeFile, segments });
  await fs.writeFile(path.join(outputDir, `${name}.png`), Buffer.from(result.data, 'base64'));
  console.log(name, JSON.stringify(result.ledger));
}
await browser.close();
