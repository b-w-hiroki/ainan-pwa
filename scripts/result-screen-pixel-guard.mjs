import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const targets = ['39-player-result.png', '45-clearance-result.png', '57-clearance-result-stable.png', '50-bass-result.png', '51-saba-result.png', '52-isaki-result.png', '53-hirame-result.png', '54-kanpachi-result.png', '56-bass-result-stable.png']

export function countGetHeaderPixels(file, dir = 'artifacts/e2e') {
  const png = readFileSync(join(dir, file))
  assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'invalid PNG: ' + file)
  let at = 8, width = 0, height = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (at + 12 <= png.length) {
    const len = png.readUInt32BE(at)
    const kind = png.toString('ascii', at + 4, at + 8)
    const from = at + 8
    assert.ok(from + len + 4 <= png.length, 'PNG chunk overflow: ' + file)
    if (kind === 'IHDR') {
      width = png.readUInt32BE(from)
      height = png.readUInt32BE(from + 4)
      bitDepth = png[from + 8]
      colorType = png[from + 9]
      assert.equal(png[from + 12], 0, 'interlaced PNG unsupported: ' + file)
    } else if (kind === 'IDAT') idat.push(png.subarray(from, from + len))
    at = from + len + 4
    if (kind === 'IEND') break
  }
  assert.equal(width, 390, 'wrong screenshot width: ' + file)
  assert.equal(height, 844, 'wrong screenshot height: ' + file)
  assert.equal(bitDepth, 8, 'unexpected PNG bit depth: ' + file)
  assert.ok([2, 6].includes(colorType), 'RGB/RGBA screenshot required: ' + file)
  const bpp = colorType === 2 ? 3 : 4, stride = width * bpp
  const inflated = inflateSync(Buffer.concat(idat))
  assert.ok(inflated.length >= (stride + 1) * height, 'incomplete PNG pixels: ' + file)
  let before = Buffer.alloc(stride), row = Buffer.alloc(stride), ptr = 0, gold = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[ptr++]
    row.fill(0)
    for (let i = 0; i < stride; i++) {
      const left = i < bpp ? 0 : row[i - bpp], up = before[i], corner = i < bpp ? 0 : before[i - bpp]
      let pred = 0
      if (filter === 1) pred = left
      else if (filter === 2) pred = up
      else if (filter === 3) pred = (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - corner
        const dl = Math.abs(p - left), du = Math.abs(p - up), dc = Math.abs(p - corner)
        pred = dl <= du && dl <= dc ? left : du <= dc ? up : corner
      } else assert.equal(filter, 0, 'invalid PNG row filter: ' + file)
      row[i] = (inflated[ptr++] + pred) & 255
    }
    // Gold GET! is above the fish in the approved Result screen. Battle shows
    // blue water in this exact upper-center region, even when QA DOM says caught.
    if (y >= 115 && y < 202) for (let x = 82; x < 308; x++) {
      const i = x * bpp
      const r = row[i], g = row[i + 1], b = row[i + 2]
      if (r > 165 && g > 98 && b < 125 && r > b * 1.5 && g > b * 1.15) gold++
    }
    ;[before, row] = [row, before]
  }
  return gold
}

// Imported by state-aware Playwright capture to inspect *actual* screenshot
// pixels. Standalone CI usage retains exactly the same regression assertions.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? 'artifacts/e2e'
  for (const file of targets) {
    const gold = countGetHeaderPixels(file, dir)
    assert.ok(gold > 450, file + ': expected visible golden Result GET! heading; found ' + gold + ' matching pixels (probably Battle)')
    console.log(file + ': rendered Result gold header detected (' + gold + ' pixels)')
  }
  console.log('All Result screenshots contain the actual Result heading')
}
