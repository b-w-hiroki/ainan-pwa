import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'artifacts/e2e'
const files = readdirSync(dir).filter(name => name.endsWith('.png')).sort()

assert.ok(files.length >= 40, 'expected at least 40 E2E screenshots, found ' + files.length)

function pngSize(path) {
  const buf = readFileSync(path)
  assert.ok(buf.length >= 24, 'invalid PNG: ' + path)
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', 'invalid PNG signature: ' + path)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length,
  }
}

for (const file of files) {
  const path = join(dir, file)
  const { width, height, bytes } = pngSize(path)
  assert.equal(width, 390, file + ': width must be 390')
  assert.equal(height, 844, file + ': height must be 844')
  assert.ok(bytes > 5000, file + ': suspiciously small/blank PNG (' + bytes + ' bytes)')
}

const keyFrames = [
  '03-battle.png',
  '15-field-harbor.png',
  '16-field-bay.png',
  '17-field-cape.png',
  '19-boss-harbor.png',
  '20-boss-bay.png',
  '21-boss-kue.png',
  '28-rarity-common.png',
  '29-rarity-uncommon.png',
  '30-rarity-rare.png',
  '31-rarity-legendary.png',
  '36-player-hit.png',
  '37-player-battle.png',
  '38-player-boss.png',
  '39-player-result.png',
  '40-achievement-reward-banner.png',
]

for (const file of keyFrames) {
  assert.ok(files.includes(file), 'missing key visual frame: ' + file)
  const bytes = statSync(join(dir, file)).size
  assert.ok(bytes > 15000, file + ': key frame looks visually empty (' + bytes + ' bytes)')
}

console.log('Visual screenshot guard passed')
console.log('  screenshots:', files.length)
console.log('  viewport: 390x844')
console.log('  key non-blank frames:', keyFrames.length)
