import assert from 'node:assert/strict'
import { pngInfo } from './audit-player-source.mjs'

const source = pngInfo('fishing-game/assets/approved-mock/cast-player-visible.png')
const candidate = pngInfo('fishing-game/assets/generated/harbor-aji-master-v2/cast-player-silhouette-candidate.png')
assert.equal(candidate.width, source.width, 'silhouette source width changed')
assert.equal(candidate.height, source.height, 'silhouette source height changed')
const total = source.width * source.height
let fore = 0
let partial = 0
let leakage = 0
let rgbMismatch = 0
let boundaryCoverage = 0
for (let p = 0; p < total; p++) {
  const i = p * 4
  const alpha = candidate.rgba[i + 3]
  if (alpha > source.rgba[i + 3]) leakage++
  if (alpha > 127) fore++
  if (alpha > 0 && alpha < 255) partial++
  for (let c = 0; c < 3; c++) {
    if (candidate.rgba[i + c] !== source.rgba[i + c]) rgbMismatch++
  }
  const x = p % source.width, y = Math.floor(p/source.width)
  if ((x === 0 || x === source.width - 1 || y === 0 || y === source.height - 1)
      && alpha > 127) boundaryCoverage++
}
assert.equal(leakage, 0, 'silhouette invented pixels beyond original player alpha')
assert.equal(rgbMismatch, 0, 'silhouette recolored the approved art')
assert.ok(fore > 9000 && fore < 17000, 'mask over/under coverage: '+fore)
assert.ok(partial > 400, 'silhouette anti-aliasing edge missing')
assert.equal(boundaryCoverage, 0, 'silhouette touches texture edge; moving it could drag square borders')
console.log('Source-derived approved player silhouette binary passed pixel fidelity gate',
  JSON.stringify({
    size: [source.width, source.height], foreground: fore, partial,
    outsideReferenceAlpha: leakage, rgbMismatch, boundaryCoverage,
    gameIntegrated: false, productionPromoted: false, motionReady: false,
  }))
