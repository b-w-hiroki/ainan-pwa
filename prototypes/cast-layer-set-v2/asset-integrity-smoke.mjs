import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(await readFile(path.join(here, 'asset-manifest.json'), 'utf8'))
const files = {
  ...Object.fromEntries(Object.entries(manifest.layers).map(([key, layer]) => [key, path.join(here, layer.normalized)])),
  composite: path.join(here, 'previews', 'composite-complete-clean-390x844.png'),
}
const dataUris = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [
  key,
  `data:image/png;base64,${(await readFile(file)).toString('base64')}`,
])))

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const stats = await page.evaluate(async ({ dataUris }) => {
    const load = src => new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
    const inspect = async src => {
      const image = await load(src)
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const alphaAt = (x, y) => imageData.data[(y * canvas.width + x) * 4 + 3]
      const count = (x, y, width, height, threshold = 8) => {
        let pixels = 0
        for (let py = y; py < y + height; py += 1) {
          for (let px = x; px < x + width; px += 1) if (alphaAt(px, py) > threshold) pixels += 1
        }
        return pixels
      }
      return {
        width: canvas.width,
        height: canvas.height,
        transparent: count(0, 0, canvas.width, canvas.height, -1) - count(0, 0, canvas.width, canvas.height, 0),
        handNeighborhood: count(116, 500, 34, 44),
        centerHarbor: count(140, 160, 110, 150),
        leftHarbor: count(0, 160, 120, 150),
        rightHarbor: count(270, 160, 120, 150),
      }
    }
    return Object.fromEntries(await Promise.all(Object.entries(dataUris).map(async ([key, src]) => [key, await inspect(src)])))
  }, { dataUris })

  for (const [key, value] of Object.entries(stats)) {
    assert.equal(value.width, 390, `${key} width drifted`)
    assert.equal(value.height, 844, `${key} height drifted`)
  }
  assert.ok(stats.character.handNeighborhood > 20, 'character glove no longer reaches the hand anchor neighborhood')
  assert.ok(stats.heldRod.handNeighborhood > 5, 'held rod no longer reaches the grip anchor neighborhood')
  assert.ok(stats.distantHarbor.leftHarbor > 200, 'left harbor cluster missing')
  assert.ok(stats.distantHarbor.rightHarbor > 200, 'right harbor cluster missing')
  assert.ok(stats.distantHarbor.centerHarbor < Math.min(stats.distantHarbor.leftHarbor, stats.distantHarbor.rightHarbor), 'center harbor opening is blocked')
  assert.equal(stats.composite.transparent, 0, 'final composite has transparent holes')

  const hand = manifest.anchors.character.hand
  const tip = manifest.anchors.heldRod.tip
  const angle = -8 * Math.PI / 180
  const dx = tip.x - hand.x
  const dy = tip.y - hand.y
  const rotatedTip = {
    x: hand.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: hand.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  }
  assert.deepEqual(hand, manifest.anchors.heldRod.grip, 'character hand and rod grip diverged')
  assert.ok(Math.abs(rotatedTip.x - 150) < 1 && Math.abs(rotatedTip.y - 375) < 1, 'rod-only line start was not recalculated from the rotated tip')

  console.log('Asset integrity smoke passed')
  console.log('  normalized canvases: 390x844')
  console.log('  glove -> grip -> rod tip: connected')
  console.log('  distant harbor: left/right clusters with open center')
  console.log('  final composite alpha holes: none')
} finally {
  await browser.close()
}
