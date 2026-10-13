// Positive-control evidence for studio-playbook ainan-result-render-01.
// Uses existing Phaser scene/Result assertions in capture-named-results.mjs;
// this audit independently decodes real screenshot PNG pixels.
import assert from 'node:assert/strict'
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { countGetHeaderPixels } from './result-screen-pixel-guard.mjs'

const files = [
  '04-result.png',
  '22-boss-kue-result.png',
  '27-kue-first-trophy.png',
  '39-player-result.png',
  '45-clearance-result.png',
  '57-clearance-result-stable.png',
  '56-bass-result-stable.png',
]
const base = 'artifacts/e2e'
const evidence = []
for (const name of files) {
  const bytes = statSync(join(base, name)).size
  assert.ok(bytes > 15000, name + ': suspiciously blank WebGL screenshot (' + bytes + ' bytes)')
  const actual = countGetHeaderPixels(name, base)
  assert.ok(actual > 450, name + ': screenshot has no visible Result heading pixels (' + actual + ')')
  const buffer = readFileSync(join(base, name))
  evidence.push({
    file: name, width: 390, height: 844, png_bytes: bytes,
    result_gold_pixels: actual,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  })
}
mkdirSync('artifacts/benchmark', { recursive: true })
writeFileSync('artifacts/benchmark/ainan-result-positive-control.json',
  JSON.stringify({
    task_id: 'ainan-result-render-01',
    status: 'fixed-version-positive-control',
    historical_failure_reproduced: false,
    ai_agent_trials_executed: 0,
    browser: 'chromium',
    images: evidence,
    limitations: [
      'Chromium screenshot audit only; historical SHA was not executed',
      'No WebKit or physical iPhone proof from this dedicated workflow',
      'No human gameplay quality or AI model comparison asserted',
    ],
  }, null, 2) + '\n')
console.log('Result positive-control decoded image pixels:', evidence.map(x=>({file:x.file,gold:x.result_gold_pixels,bytes:x.png_bytes})))
