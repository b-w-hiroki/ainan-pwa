import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { HARBOR_WIDE_H02, previewWorldCameraPath } from '../fishing-game/js/presentation/harborWideWorldH02.js'
import { auditHarborH02Fan } from '../fishing-game/js/presentation/harborH02CastFanAudit.js'

const root = new URL('../', import.meta.url)
const path = name => new URL(name, root)
const manifest = JSON.parse(readFileSync(path('fishing-game/assets/candidates/w02-harbor-v1/manifest.json'), 'utf8'))
const W01 = JSON.parse(readFileSync(path('docs/pipeline/art-rebuild-v2-contract.json'), 'utf8'))
const bridge = readFileSync(path('fishing-game/js/game/installHarborPlayableQa.js'), 'utf8')
const productionManifest = readFileSync(path('fishing-game/js/config/assetManifest.js'), 'utf8')
assert.equal(W01.acceptance.artisticApprovalAutomatic, false)
assert.equal(manifest.artApproval, false)
assert.equal(manifest.production, false)
assert.equal(manifest.status, 'review')
assert.equal(manifest.humanArtReview, 'pending')
assert.equal(manifest.assets.length, 3)
assert.deepEqual(manifest.assets.map(a => a.layer), ['far','sea','quay'])
assert.deepEqual(manifest.worldSizePx, HARBOR_WIDE_H02.size)
assert.match(bridge, /qaArtCandidate/)
assert.match(bridge, /isHarborPlayableQaEnabled\(getSearch\(\)\)/)
assert.doesNotMatch(productionManifest, /w02-harbor-v1|qa_art_w02_v1_/,
  'Never register unapproved W02 source in production manifest')
const evidence = []
for (const asset of manifest.assets) {
  assert.ok(existsSync(path(asset.sourcePath)), asset.sourcePath)
  const bytes = readFileSync(path(asset.sourcePath))
  const s = bytes.toString('utf8')
  assert.match(s, /^<svg [^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  assert.match(s, /viewBox="0 0 2160 1800"/)
  assert.ok(!/<image\b|<foreignObject\b|<script\b|<text\b/i.test(s),
    'Candidate must be independent vector painting without embedded photos or UI text')
  assert.ok(s.includes('W02'), 'The candidate must carry an explicit QA/review origin')
  assert.equal(asset.artApproval, false)
  assert.equal(asset.browserQa, null, 'W02 has not obtained browser signoff before this PR')
  assert.equal(asset.sha256, null, 'Actual measured SHA must come from this checkout, not hand entered')
  assert.deepEqual(asset.canvasPx, [2160,1800])
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  evidence.push({assetId:asset.assetId,path:asset.sourcePath,sha256,bytes:bytes.length})
}
const sea = readFileSync(path(manifest.assets[1].sourcePath), 'utf8')
const quay = readFileSync(path(manifest.assets[2].sourcePath), 'utf8')
assert.ok((sea.match(/<path/g)||[]).length>750, 'Insufficient actual visual detail for W02 sea review candidate')
assert.ok((quay.match(/<path/g)||[]).length>300, 'Quay planes must be authored, not a single pasted flat rectangle')
assert.ok(!/bollard|rope|<image\b/.test(quay), 'Do not copy cast-lane obstacles into world-only quay')
const fan = auditHarborH02Fan()
assert.equal(fan.allClear,true,'Existing 90 QA casts are invalid with baseline geometry')
for (const viewport of HARBOR_WIDE_H02.viewports) {
  const p=previewWorldCameraPath(HARBOR_WIDE_H02,viewport)
  assert.ok(p.coversEveryFrame && p.realWorldCameraTravel)
}
console.log(JSON.stringify({workUnit:218, candidate:manifest.candidateId, sourceHashEvidence:evidence,
  artApproved:false, gameIntegrated:false, qaFanSamples:fan.checked,
  limitation:'90 QA casts do not represent the full authored gameplay fan'},null,2))
