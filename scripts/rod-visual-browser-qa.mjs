import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43193/fishing-game/index.html'
const output = path.resolve('qa-artifacts/rod-visual-v1')
await fs.mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const errors = []
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`))

async function route(scene, query = '') {
  await page.goto(`${base}?qa=1&scene=${scene}${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
}

async function clickDesign(x, y) {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('game canvas missing')
  await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844)
}

async function pointerDesign(x, y, action = 'click') {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('game canvas missing')
  await page.mouse.move(box.x + box.width * x / 390, box.y + box.height * y / 844)
  if (action === 'down') await page.mouse.down()
  else if (action === 'up') await page.mouse.up()
  else await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844)
}

async function equipRod(id) {
  const tileX = { basic: 78, carbon: 178, premium: 278 }[id]
  await route('UpgradeScene')
  await page.evaluate(() => window.__game.scene.getScene('UpgradeScene').input.once('pointerdown', pointer => { window.__lastQaPointer = { x: pointer.x, y: pointer.y } }))
  await clickDesign(tileX, 498)
  await page.waitForFunction(() => window.__game.scene.getScene('UpgradeScene')?._modal?.active, null, { timeout: 3000 })
  await page.waitForTimeout(260)
  await clickDesign(195, 464)
  try {
    await page.waitForFunction(expected => {
      try { return JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}').rodType === expected } catch { return false }
    }, id, { timeout: 4000 })
  } catch (error) {
    const debug = await page.evaluate(() => ({
      equipment: localStorage.getItem('ainan_equipment'),
      modal: Boolean(window.__game.scene.getScene('UpgradeScene')?._modal?.active),
      pointer: window.__lastQaPointer,
      modalTexts: window.__game.scene.getScene('UpgradeScene')?._modal?.list?.filter(obj => obj.type === 'Text').map(obj => ({ text: obj.text, x: obj.x, y: obj.y })),
      input: window.__game.scene.getScene('UpgradeScene')?.input?._list?.filter(obj => obj?.input?.enabled).map(obj => ({ type: obj.type, x: obj.x, y: obj.y, width: obj.width, height: obj.height, parent: obj.parentContainer?.type }))?.slice(-20),
    }))
    throw new Error(`${id}: equip click timeout ${JSON.stringify(debug)}; ${error.message}`)
  }
  return page.evaluate(() => ({
    equipment: JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}'),
    inventory: JSON.parse(localStorage.getItem('ainan_inventory') ?? '{}'),
  }))
}

const motionState = () => page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  const motion = scene?._castPresentationHost?.nodes?.characterMotion
  return {
    phase: scene?.phase,
    pose: motion?.currentPose,
    rodType: motion?.root?.getData('rodType'),
    rodTexture: motion?.root?.getData('rodTexture'),
    fallback: motion?.root?.getData('rodTextureFallback'),
    rodVisible: motion?.rod?.visible,
    rodTip: motion?.root?.getData('rodTip'),
    savedRod: JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}').rodType,
  }
})

const expectedTexture = {
  basic: 'ch_fishing_motion_rod_basic',
  carbon: 'ch_fishing_motion_rod_carbon',
  premium: 'ch_fishing_motion_rod_premium',
}

for (const id of ['basic', 'carbon', 'premium']) {
  const saved = await equipRod(id)
  if (saved.equipment.rodType !== id || (saved.inventory.rods?.[id] ?? 0) < 1) throw new Error(`${id}: real equipment action did not persist`)
  await route('GameScene', 'qaMockPhase=cast')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
  await pointerDesign(195, 748, 'down')
  await page.waitForTimeout(330)
  const state = await motionState()
  if (state.rodType !== id || state.savedRod !== id || state.rodTexture !== expectedTexture[id] || state.fallback || !state.rodVisible) {
    throw new Error(`${id}: equipped visual mismatch ${JSON.stringify(state)}`)
  }
  await page.screenshot({ path: path.join(output, `cast-${id}.png`) })
  await pointerDesign(195, 748, 'up')
  await page.waitForTimeout(250)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready, null, { timeout: 12000 })
  const reloaded = await motionState()
  if (reloaded.rodType !== id || reloaded.savedRod !== id || reloaded.rodTexture !== expectedTexture[id]) {
    throw new Error(`${id}: reload lost equipped visual ${JSON.stringify(reloaded)}`)
  }
}

await route('GameScene', 'qaAction=battle')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle', null, { timeout: 6000 })
await page.waitForTimeout(500)
let state = await motionState()
if (state.rodType !== 'premium' || !state.pose?.startsWith('fight') || !state.rodVisible) throw new Error(`fight rod mismatch ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, 'premium-fight-portrait.png') })
await page.setViewportSize({ width: 844, height: 390 })
await page.waitForTimeout(250)
state = await motionState()
if (state.rodType !== 'premium' || !state.pose?.startsWith('fight') || !state.rodVisible) throw new Error(`landscape rod mismatch ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, 'premium-fight-landscape.png') })
await page.setViewportSize({ width: 390, height: 844 })

await context.close()

const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
await fallbackContext.addInitScript(() => {
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
})
await fallbackContext.route('**/held-rod-premium.svg', route => route.abort())
const fallbackPage = await fallbackContext.newPage()
await fallbackPage.goto(`${base}?qa=1&scene=GameScene&qaMockPhase=cast`, { waitUntil: 'domcontentloaded' })
await fallbackPage.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready, null, { timeout: 12000 })
const fallback = await fallbackPage.evaluate(() => {
  const motion = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion
  return { rodType: motion.root.getData('rodType'), rodTexture: motion.root.getData('rodTexture'), fallback: motion.root.getData('rodTextureFallback') }
})
if (fallback.rodType !== 'premium' || fallback.rodTexture !== 'ch_fishing_motion_held_rod' || !fallback.fallback) throw new Error(`safe rod fallback missing ${JSON.stringify(fallback)}`)
await fallbackContext.close()

await browser.close()
const unexpected = errors.filter(message => !message.includes('held-rod-premium.svg')
  && !message.includes('ERR_FAILED')
  && !message.includes('ERR_NETWORK_ACCESS_DENIED')
  && message !== 'Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED')
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
console.log('PASS: real equip taps, Basic/Carbon/Premium cast visuals, reload persistence, fight portrait/landscape, safe fallback')
