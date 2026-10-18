import assert from 'node:assert/strict'
import { delimiter, join } from 'node:path'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const bin = process.env.PATH.split(delimiter).find(dir => existsSync(join(dir, 'playwright')) || existsSync(join(dir, 'playwright.cmd')))
assert.ok(bin, 'Run via npm exec --package=playwright')
const { chromium } = await import(pathToFileURL(join(bin, '..', 'playwright', 'index.mjs')).href)
const base = (process.env.PWA_OFFLINE_QA_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '')
const harbor = readdirSync('dist/assets').find(name => /^harbor-morning-.*\.png$/.test(name))
assert.ok(harbor, 'Built harbor background missing')
const files = ['fishing-game/assets/characters/ch_guide_default.png', 'fishing-game/assets/backgrounds/bg_map_town.png', `assets/${harbor}`]
const expected = files.map(file => ({ file, sha256: createHash('sha256').update(readFileSync(join('dist', file))).digest('hex') }))
const output = 'artifacts/e2e/pwa-offline-art'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  // Ordinary URL: QA deliberately disables service workers.
  await page.goto(`${base}/fishing-game/`)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 })
  const missing = await page.evaluate(async urls => {
    const result = []
    for (const url of urls) if (!await caches.match(url, { ignoreSearch: true })) result.push(url)
    return result
  }, files.map(file => `${base}/${file}`))
  assert.deepEqual(missing, [], 'Core artwork must be cached at first installation, before visiting each screen')
  await context.setOffline(true)
  const actual = await page.evaluate(async urls => {
    const result = []
    for (const url of urls) {
      const response = await fetch(url, { cache: 'reload' })
      if (!response.ok) throw Error(`${url}: ${response.status}`)
      const bytes = await response.arrayBuffer()
      const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
      result.push({ sha256, width: image.width, height: image.height })
      image.close()
    }
    return result
  }, files.map(file => `${base}/${file}`))
  for (let i = 0; i < files.length; i++) {
    assert.equal(actual[i].sha256, expected[i].sha256, files[i])
    assert.ok(actual[i].width > 0 && actual[i].height > 0, `${files[i]} offline image decode`)
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene.isActive('TitleScene'), null, { timeout: 20000 })
  await page.evaluate(() => window.__game.scene.getScene('TitleScene').scene.start('HomeScene'))
  await page.waitForFunction(() => window.__game.scene.isActive('HomeScene'))
  await page.evaluate(() => {
    window.__game.scene.getScene('HomeScene')._dismissDailyBonus()
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await page.screenshot({ path: `${output}/home-offline.png` })
  console.log('PASS first-install core art precache, offline SHA/decode, ordinary offline reload and Home render')
} finally { await browser.close() }
