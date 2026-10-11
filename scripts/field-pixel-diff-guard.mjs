import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'

// Read rendered pixels rather than a PNG file hash: nondeterministic chunks,
// filters, or encoding can change the file without changing the on-screen art.
function readRgbPixels(filename) {
  const bytes = readFileSync(filename)
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), filename + ': PNG signature missing')
  let pos = 8
  let width = 0, height = 0, depth = 0, color = 0
  const chunks = []
  while (pos + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(pos)
    const kind = bytes.toString('ascii', pos + 4, pos + 8)
    const start = pos + 8
    assert.ok(start + size + 4 <= bytes.length, filename + ': truncated chunk')
    if (kind === 'IHDR') {
      width = bytes.readUInt32BE(start)
      height = bytes.readUInt32BE(start + 4)
      depth = bytes[start + 8]
      color = bytes[start + 9]
      assert.equal(bytes[start + 12], 0, filename + ': unsupported interlaced PNG')
    }
    if (kind === 'IDAT') chunks.push(bytes.subarray(start, start + size))
    pos = start + size + 4
    if (kind === 'IEND') break
  }
  assert.equal(width, 390, filename + ': wrong viewport width')
  assert.equal(height, 844, filename + ': wrong viewport height')
  assert.equal(depth, 8, filename + ': unsupported bit depth')
  assert.ok(color === 2 || color === 6, filename + ': RGB/RGBA required')
  const channels = color === 6 ? 4 : 3
  const stride = width * channels
  const inflated = inflateSync(Buffer.concat(chunks))
  assert.ok(inflated.length >= height * (stride + 1), filename + ': incomplete pixels')
  const rgb = Buffer.alloc(width * height * 3)
  let previous = Buffer.alloc(stride)
  let row = Buffer.alloc(stride)
  let pointer = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[pointer++]
    row.fill(0)
    for (let i = 0; i < stride; i++) {
      const left = i < channels ? 0 : row[i - channels]
      const up = previous[i]
      const upperLeft = i < channels ? 0 : previous[i - channels]
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = up
      else if (filter === 3) predictor = (left + up) >> 1
      else if (filter === 4) {
        const p = left + up - upperLeft
        const da = Math.abs(p - left), db = Math.abs(p - up), dc = Math.abs(p - upperLeft)
        predictor = da <= db && da <= dc ? left : db <= dc ? up : upperLeft
      } else assert.equal(filter, 0, filename + ': unsupported PNG filter')
      row[i] = (inflated[pointer++] + predictor) & 255
    }
    for (let x = 0; x < width; x++) {
      const from = x * channels, to = (y * width + x) * 3
      rgb[to] = row[from]
      rgb[to + 1] = row[from + 1]
      rgb[to + 2] = row[from + 2]
    }
    ;[previous, row] = [row, previous]
  }
  return rgb
}

export function fieldPixelDifference(dir, a, b) {
  const first = readRgbPixels(join(dir, a))
  const second = readRgbPixels(join(dir, b))
  let changed = 0
  // Crop to active water: HUD text and footer differences must not
  // masquerade as differences in the fishing field itself.
  for (let y = 120; y < 565; y++) {
    for (let x = 30; x < 360; x++) {
      const i = (y * 390 + x) * 3
      const rgbDistance = Math.abs(first[i] - second[i])
        + Math.abs(first[i + 1] - second[i + 1])
        + Math.abs(first[i + 2] - second[i + 2])
      if (rgbDistance >= 24) changed++
    }
  }
  return changed
}

export function assertFieldPixelDifference(dir) {
  const examples = [
    ['15-field-harbor.png', '16-field-bay.png'],
    ['16-field-bay.png', '17-field-cape.png'],
    ['58-aji-battle-harbor.png', '59-aji-battle-bay.png'],
  ]
  for (const [a, b] of examples) {
    const changed = fieldPixelDifference(dir, a, b)
    assert.ok(changed >= 4500, a + ' vs ' + b + ': field is visually indistinguishable (' + changed + ' significant pixels)')
    console.log(a + ' vs ' + b + ': ' + changed + ' significant field pixels')
  }
}
