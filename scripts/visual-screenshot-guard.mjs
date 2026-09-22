import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'artifacts/e2e'
const files = readdirSync(dir).filter(name => name.endsWith('.png')).sort()

assert.ok(files.length >= 40, 'expected at least 40 E2E screenshots, found ' + files.length)

function inspectPng(file) {
  const path = join(dir, file)
  const buf = readFileSync(path)
  assert.ok(buf.length >= 24, 'invalid PNG: ' + file)
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', 'invalid PNG signature: ' + file)
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length,
    hash: createHash('sha256').update(buf).digest('hex'),
  }
}

const metadata = new Map()
for (const file of files) {
  const info = inspectPng(file)
  metadata.set(file, info)
  assert.equal(info.width, 390, file + ': width must be 390')
  assert.equal(info.height, 844, file + ': height must be 844')
  assert.ok(info.bytes > 5000, file + ': suspiciously small/blank PNG (' + info.bytes + ' bytes)')
}

const keyFrames = [
  '03-battle.png',
  '15-field-harbor.png',
  '16-field-bay.png',
  '17-field-cape.png',
  '18-challenge.png',
  '19-boss-harbor.png',
  '20-boss-bay.png',
  '21-boss-kue.png',
  '22-boss-kue-result.png',
  '23-map-boss-pending.png',
  '28-rarity-common.png',
  '29-rarity-uncommon.png',
  '30-rarity-rare.png',
  '31-rarity-legendary.png',
  '32-reward-first.png',
  '33-reward-record.png',
  '34-reward-rare.png',
  '35-reward-legendary.png',
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

const uniqueGroups = [
  ['15-field-harbor.png', '16-field-bay.png', '17-field-cape.png'],
  ['19-boss-harbor.png', '20-boss-bay.png', '21-boss-kue.png'],
  ['28-rarity-common.png', '29-rarity-uncommon.png', '30-rarity-rare.png', '31-rarity-legendary.png'],
  ['32-reward-first.png', '33-reward-record.png', '34-reward-rare.png', '35-reward-legendary.png'],
  ['36-player-hit.png', '37-player-battle.png', '38-player-boss.png', '39-player-result.png'],
]

for (const group of uniqueGroups) {
  const hashes = group.map(file => metadata.get(file)?.hash)
  assert.equal(new Set(hashes).size, group.length, 'visual states unexpectedly produced duplicate screenshots: ' + group.join(', '))
}

console.log('Visual screenshot guard passed')
console.log('  screenshots:', files.length)
console.log('  viewport: 390x844')
console.log('  key non-blank frames:', keyFrames.length)
console.log('  unique visual groups:', uniqueGroups.length)
