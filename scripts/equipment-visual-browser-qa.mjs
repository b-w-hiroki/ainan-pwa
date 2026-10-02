import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43217/fishing-game/index.html'
const output = path.resolve('qa-artifacts/equipment-visual-v2')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`))

async function waitScene(scene) {
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene, { timeout: 12000 })
}
async function click(x, y) {
  const box = await page.locator('canvas').last().boundingBox()
  if (!box) throw new Error('game canvas missing')
  await page.mouse.click(box.x + box.width * x / 390, box.y + box.height * y / 844)
}
async function startScene(scene, data = {}) {
  const sceneUrl = new URL(base)
  sceneUrl.searchParams.set('qa', '1')
  sceneUrl.searchParams.set('scene', scene)
  if (data.point) sceneUrl.searchParams.set('point', data.point)
  await page.goto(sceneUrl.href, { waitUntil: 'domcontentloaded' })
  await waitScene(scene)
  await page.waitForTimeout(250)
}

await page.goto(base, { waitUntil: 'domcontentloaded' })
await waitScene('TitleScene')
await page.evaluate(() => {
  localStorage.clear()
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'carbon', baitType: 'worm' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 0 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
  localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: false, bag: false }, equipped: { hat: null, bag: null } }))
})
await page.goto(`${base}?qa=1&scene=UpgradeScene`, { waitUntil: 'domcontentloaded' })
await waitScene('UpgradeScene')

// Real Upgrade UI purchase/equip for Premium rod.
await page.evaluate(() => window.__game.scene.getScene('UpgradeScene').input.once('pointerdown', pointer => { window.__equipmentQaPointer = { x: pointer.x, y: pointer.y } }))
await click(278, 498)
await page.waitForFunction(() => window.__game.scene.getScene('UpgradeScene')?._modal?.active)
await page.waitForTimeout(260)
await click(195, 464)
await page.waitForTimeout(500)
const rodEquipState = await page.evaluate(() => ({
  equipment: JSON.parse(localStorage.getItem('ainan_equipment') ?? '{}'),
  inventory: JSON.parse(localStorage.getItem('ainan_inventory') ?? '{}'),
  score: localStorage.getItem('ainan_score'),
  modal: Boolean(window.__game.scene.getScene('UpgradeScene')?._modal?.active),
  modalY: window.__game.scene.getScene('UpgradeScene')?._modal?.y,
  pointer: window.__equipmentQaPointer,
  texts: window.__game.scene.getScene('UpgradeScene')?._modal?.list?.filter(item => item.type === 'Text').map(item => ({ text: item.text, x: item.x, y: item.y })),
}))
if (rodEquipState.equipment.rodType !== 'premium') throw new Error(`Premium real equip missed: ${JSON.stringify(rodEquipState)}`)
let preview = await page.evaluate(() => window.__game.scene.getScene('UpgradeScene')._previewLoadout)
if (preview.rod.id !== 'premium' || preview.accessories.hat || preview.accessories.bag) throw new Error(`pre-accessory preview mismatch: ${JSON.stringify(preview)}`)
await page.screenshot({ path: path.join(output, '01-premium-before-accessories.png') })

// Existing Workshop accessory actions, operated through their real buttons.
await startScene('WorkshopScene')
await click(105, 561)
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_accessories') ?? '{}').equipped?.hat === 'cap')
await page.waitForTimeout(220)
await click(282, 561)
await page.waitForFunction(() => JSON.parse(localStorage.getItem('ainan_accessories') ?? '{}').equipped?.bag === 'bag')
await page.waitForTimeout(350)
await page.screenshot({ path: path.join(output, '02-workshop-equipped.png') })

await startScene('UpgradeScene')
preview = await page.evaluate(() => window.__game.scene.getScene('UpgradeScene')._previewLoadout)
if (preview.rod.id !== 'premium' || preview.accessories.hat !== 'cap' || preview.accessories.bag !== 'bag') throw new Error(`equipped preview mismatch: ${JSON.stringify(preview)}`)
await page.screenshot({ path: path.join(output, '03-premium-cap-bag-preview.png') })

// Save -> document reload -> visual preview persistence.
await page.reload({ waitUntil: 'domcontentloaded' })
await waitScene('UpgradeScene')
preview = await page.evaluate(() => window.__game.scene.getScene('UpgradeScene')._previewLoadout)
if (preview.rod.id !== 'premium' || preview.accessories.hat !== 'cap' || preview.accessories.bag !== 'bag') throw new Error(`reload lost loadout visual: ${JSON.stringify(preview)}`)

// The same persisted state must reach fishing and all 13 authored poses.
await startScene('GameScene', { point: 'pointA' })
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: path.join(output, '04-premium-cap-bag-cast.png') })
const poseMatrix = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('GameScene')
  const motion = scene._castPresentationHost.nodes.characterMotion
  const poseNames = ['idle', 'castWindup', 'castMid', 'castRelease', 'fightLeft', 'fightMid', 'fightRight', 'joyLift', 'joyMid', 'joyHold', 'sadDrop', 'sadMid', 'sadSlump']
  const textureByRod = { basic: 'ch_fishing_motion_rod_basic', carbon: 'ch_fishing_motion_rod_carbon', premium: 'ch_fishing_motion_rod_premium' }
  const rows = []
  for (const rod of Object.keys(textureByRod)) {
    motion._setRodVisual(rod, true)
    for (const pose of poseNames) {
      motion._applyPose(pose, true)
      rows.push({
        rod, pose,
        texture: motion.rod.texture.key,
        rodVisible: motion.rod.visible,
        tip: motion.root.getData('rodTip'),
        capVisible: motion.accessoryAccents.cap.visible,
        bagVisible: motion.accessoryAccents.bag.visible,
        capPosition: { x: motion.accessoryAccents.cap.x, y: motion.accessoryAccents.cap.y },
        bagPosition: { x: motion.accessoryAccents.bag.x, y: motion.accessoryAccents.bag.y },
      })
    }
  }
  return { rows, textureByRod }
})
if (poseMatrix.rows.length !== 39) throw new Error('3 rods x 13 pose matrix incomplete')
for (const row of poseMatrix.rows) {
  const expectsRod = !row.pose.startsWith('joy')
  if (row.texture !== poseMatrix.textureByRod[row.rod] || row.rodVisible !== expectsRod) throw new Error(`rod pose mismatch: ${JSON.stringify(row)}`)
  if (expectsRod && (!Number.isFinite(row.tip?.x) || !Number.isFinite(row.tip?.y))) throw new Error(`rod tip missing: ${JSON.stringify(row)}`)
  if (!row.capVisible || !row.bagVisible) throw new Error(`accessory anchor missing: ${JSON.stringify(row)}`)
  for (const point of [row.capPosition, row.bagPosition]) {
    if (!(point.x >= -20 && point.x <= 410 && point.y >= -20 && point.y <= 864)) throw new Error(`accessory outside safe frame: ${JSON.stringify(row)}`)
  }
}

// Persisted Premium visual also survives into the result pose.
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await page.waitForTimeout(600)
const resultVisual = await page.evaluate(() => {
  const motion = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion
  return { rodType: motion.root.getData('rodType'), texture: motion.rod.texture.key, accessories: motion.root.getData('accessories'), pose: motion.currentPose }
})
if (resultVisual.rodType !== 'premium' || resultVisual.texture !== 'ch_fishing_motion_rod_premium' || resultVisual.accessories.hat !== 'cap' || resultVisual.accessories.bag !== 'bag') throw new Error(`result loadout drift: ${JSON.stringify(resultVisual)}`)
await page.screenshot({ path: path.join(output, '05-premium-cap-bag-result.png') })

// Home does not show the fishing avatar, so its existing player chip reflects rod color and accessory badges.
await startScene('HomeScene')
const homeLoadout = await page.evaluate(() => window.__game.scene.getScene('HomeScene')._visualLoadout)
if (homeLoadout.rod.id !== 'premium' || homeLoadout.accessories.hat !== 'cap' || homeLoadout.accessories.bag !== 'bag') throw new Error(`Home loadout drift: ${JSON.stringify(homeLoadout)}`)
await page.screenshot({ path: path.join(output, '06-home-loadout-chip.png') })

// Tampered/unowned save values render a safe owned Basic rod and no unowned accessories, without rewriting the save.
await page.evaluate(() => {
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'tampered-rod', baitType: 'tampered-bait' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 0 }, baits: { worm: 12, shrimp: 5, special: 2 } }))
  localStorage.setItem('ainan_accessories', JSON.stringify({ owned: { cap: false, bag: true }, equipped: { hat: 'cap', bag: 'tampered-bag' } }))
  window.__game.scene.stop('HomeScene')
  window.__game.scene.start('GameScene', { point: 'pointA' })
})
await waitScene('GameScene')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?._castPresentationHost?.nodes?.characterMotion?.ready)
const safe = await page.evaluate(() => {
  const motion = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.characterMotion
  return {
    requested: motion.root.getData('rodRequestedType'), resolved: motion.root.getData('rodType'), stateFallback: motion.root.getData('rodStateFallback'),
    accessories: motion.root.getData('accessories'), capVisible: motion.accessoryAccents.cap.visible, bagVisible: motion.accessoryAccents.bag.visible,
    saved: JSON.parse(localStorage.getItem('ainan_equipment')),
  }
})
if (safe.requested !== 'tampered-rod' || safe.resolved !== 'basic' || !safe.stateFallback || safe.capVisible || safe.bagVisible || safe.saved.rodType !== 'tampered-rod') throw new Error(`unsafe tampered-state handling: ${JSON.stringify(safe)}`)

await browser.close()
const unexpected = errors.filter(message => !message.includes('ERR_NETWORK_ACCESS_DENIED') && message !== 'Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED')
if (unexpected.length) throw new Error(`browser errors: ${unexpected.join('; ')}`)
console.log('PASS: real rod/accessory UI actions, preview/reload/fishing/result/Home continuity, 3 rods x 13 poses, safe invalid/unowned fallbacks')
