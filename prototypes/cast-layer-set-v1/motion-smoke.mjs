import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '../../../oh-edo-work/node_modules/playwright/index.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 620, height: 960 }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(path.join(here, 'motion-preview.html')).href)
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))
  const before = await page.evaluate(() => ({
    clouds: getComputedStyle(document.querySelector('.clouds')).transform,
    rod: getComputedStyle(document.querySelector('.rod')).transform,
  }))
  await page.screenshot({ path: path.join(here, 'previews', 'motion-00.png') })
  await page.waitForTimeout(900)
  const after = await page.evaluate(() => ({
    clouds: getComputedStyle(document.querySelector('.clouds')).transform,
    rod: getComputedStyle(document.querySelector('.rod')).transform,
  }))
  await page.screenshot({ path: path.join(here, 'previews', 'motion-09.png') })
  assert.notEqual(after.clouds, before.clouds, 'cloud layer did not move independently')
  assert.notEqual(after.rod, before.rod, 'held rod did not move independently')
  console.log('Motion smoke passed')
  console.log(`  clouds: ${before.clouds} -> ${after.clouds}`)
  console.log(`  held rod: ${before.rod} -> ${after.rod}`)
} finally {
  await browser.close()
}
