// Guard a preview against accidental replacement of the approved Harbor Cast.
 // Comparing rendered pixels is stricter than merely checking texture IDs.
 // A matching screenshot is not proof of parallax/motion or gameplay quality.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { readRgbPixels } from './field-pixel-diff-guard.mjs'

const dir = process.argv[2] ?? 'artifacts/e2e'
const approved = readRgbPixels(join(dir, '64-approved-cast-original.png'))

function difference(name) {
  const other = readRgbPixels(join(dir, name))
  let changed = 0
  let total = 0
  // Stable field region: not the dynamic upper HUD or interactive footer.
  const region = { left: 30, right: 360, top: 145, bottom: 620 }
  let count = 0
  for (let y = region.top; y < region.bottom; y++) {
    for (let x = region.left; x < region.right; x++) {
      const i = (y * 390 + x) * 3
      const distance =
        Math.abs(approved[i] - other[i]) +
        Math.abs(approved[i + 1] - other[i + 1]) +
        Math.abs(approved[i + 2] - other[i + 2])
      total += distance
      if (distance > 36) changed++
      count++
    }
  }
  return {
    frame: name, pixels: count, changed, fraction: changed / count,
    mean_abs_rgb: total / (count * 3),
    threshold_rgb_sum: 36,
    region,
  }
}

const candidates = [
  '65-approved-cast-split-preview.png',
  '66-approved-foreground-preview.png',
]
for (const frame of candidates) {
  const r = difference(frame)
  assert.ok(r.fraction < 0.02, frame + ': extracted layers diverge from approved Cast too far (' + (r.fraction * 100).toFixed(2) + '%)')
  console.log('Approved Cast pixel parity:', JSON.stringify(r))
}
// Negative test against an authentic, unrelated gameplay phase. Deliberately
// demand mismatch instead of bypassing screenshots with a zero-sized PNG.
const wrong = difference('03-battle.png')
assert.ok(wrong.fraction > 0.2, 'negative control: Battle must differ from Cast in the real rendered field')
console.log('Negative control correctly rejected Battle as approved Cast:', JSON.stringify(wrong))
