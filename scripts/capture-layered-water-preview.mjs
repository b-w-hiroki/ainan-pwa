import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Use the temporary Playwright installation already provided by mobile-e2e.
const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from npm exec PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)
mkdirSync('artifacts/e2e', { recursive: true })

const cases = [
  { file: '62-layered-water-previous.png', candidate: false, expectedTexture: 'ui_fishing_layer_sea' },
  { file: '63-layered-water-v2-preview.png', candidate: true, expectedTexture: 'ui_fishing_layer_sea_v2' },
]
const browser = await chromium.launch({ headless: true })
try {
  // The approved default must not load or render this unapproved candidate.
  const control = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await control.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene', { waitUntil: 'domcontentloaded' })
    await control.waitForFunction(() => window.__game?.scene?.getScene('GameScene')?._castPresentationHost?.root?.visible, { timeout: 20000 })
    const state = await control.evaluate(() => {
      const scene = window.__game.scene.getScene('GameScene')
      return {
        mode: scene._castPresentationMode,
        prototypeTextureLoaded: scene.textures.exists('ui_fishing_layer_sea_v2'),
        usesApprovedComposite: scene._castPresentationHost?.nodes?.layeredScene === null,
      }
    })
    assert.equal(state.mode, 'host', 'production must use canonical presentation host')
    assert.equal(state.prototypeTextureLoaded, false, 'candidate must not even preload during normal fishing')
    assert.equal(state.usesApprovedComposite, true, 'production Cast must keep approved full-quality scene')
    console.log('Standard Cast unchanged by optional water candidate:', JSON.stringify(state))
  } finally {
    await control.close()
  }

  for (const test of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      const params = new URLSearchParams({
        qa: '1', scene: 'GameScene', castLayers: '1',
        ...(test.candidate ? { castWaterV2: '1' } : {}),
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + params.toString(), { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const sea = host?.nodes?.layeredScene?.nodes?.sea
        return scene?.phase === 'cast' && host?.root?.visible && sea?.visible && sea.list?.[0]?.texture?.key
      }, { timeout: 20000 })
      await page.waitForTimeout(750)
      const state = await page.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const sea = host?.nodes?.layeredScene?.nodes?.sea
        return {
          phase: scene?.phase, owner: host?.root?.name,
          texture: sea?.list?.[0]?.texture?.key,
          imageVisible: sea?.list?.[0]?.visible,
          layered: Boolean(host?.nodes?.layeredScene),
          legacyOverlay: Boolean(scene?._finalCastOverlay?.visible),
          inputOwner: host?.nodes?.castInteraction?.visible,
        }
      })
      assert.equal(state.phase, 'cast', test.file + ': wrong phase')
      assert.equal(state.owner, 'cast-presentation-host', test.file + ': wrong owner')
      assert.equal(state.texture, test.expectedTexture, test.file + ': wrong candidate image')
      assert.equal(state.imageVisible, true, test.file + ': sea layer image hidden')
      assert.equal(state.layered, true, test.file + ': independent layers are not in use')
      assert.equal(state.inputOwner, true, test.file + ': slingshot input owner is hidden')
      assert.equal(state.legacyOverlay, false, test.file + ': legacy dock revived')
      await page.screenshot({ path: join('artifacts/e2e', test.file), animations: 'disabled' })
      console.log('Harbor water prototype, QA-only:', test.file, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
