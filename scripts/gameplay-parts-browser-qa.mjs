import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43357/fishing-game/index.html'
const output = path.resolve('qa-artifacts/gameplay-parts-v1/after')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })

const seed = () => {
  localStorage.setItem('ainan_sound_enabled', '0')
  localStorage.setItem('ainan_reduced_motion', '1')
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_equipment', JSON.stringify({ rodType: 'premium', baitType: 'special' }))
  localStorage.setItem('ainan_inventory', JSON.stringify({ rods: { basic: 1, carbon: 1, premium: 1 }, baits: { worm: 12, shrimp: 12, special: 12 } }))
  window.__ainanDailyBonusDismissed = true
}

async function openScene(page, scene, suffix = '') {
  await page.goto(`${base}?qa=1&scene=${scene}${suffix}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(key => window.__game?.scene?.getScene?.(key)?.sys?.isActive?.(), scene)
  await page.waitForTimeout(650)
}

async function forceFish(page, fishId) {
  await page.evaluate(({ id, name }) => {
    const scene = window.__game.scene.getScene('GameScene')
    const subject = scene.bg?._fishRuntime?.find(item => item?.fishDef?.id === id)?.fishDef
    scene.fish = subject ?? { ...scene.fish, id, name }
    scene._castPresentationHost.sync()
  }, { id: fishId, name: { kanpachi: 'カンパチ', saba: 'サバ' }[fishId] ?? fishId })
}

for (const viewport of [{ id: 'portrait', width: 390, height: 844 }, { id: 'small', width: 375, height: 667 }, { id: 'landscape', width: 844, height: 390 }]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(seed)

  await openScene(page, 'UpgradeScene')
  const canvas = await page.locator('canvas').last().boundingBox()
  if (!canvas || canvas.x < -0.5 || canvas.y < -0.5 || canvas.x + canvas.width > viewport.width + 0.5 || canvas.y + canvas.height > viewport.height + 0.5) throw new Error(`${viewport.id}: canvas outside viewport`)
  const equipmentTextures = await page.evaluate(() => [
    'equip_part_v1_rod_basic', 'equip_part_v1_rod_carbon', 'equip_part_v1_rod_premium',
    'equip_part_v1_bait_worm', 'equip_part_v1_bait_shrimp', 'equip_part_v1_bait_special',
  ].every(key => window.__game.textures.exists(key)))
  if (!equipmentTextures) throw new Error(`${viewport.id}: equipment part texture missing`)
  await page.screenshot({ path: path.join(output, `equipment-${viewport.id}.png`) })

  await openScene(page, 'GameScene', '&qaAction=battle&qaFish=kanpachi')
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
  await forceFish(page, 'kanpachi')
  const fishKey = await page.evaluate(() => window.__game.scene.getScene('GameScene')._castPresentationHost.nodes.battleFish.texture.key)
  if (fishKey !== 'fish_part_v1_kanpachi') throw new Error(`${viewport.id}: wrong fish texture ${fishKey}`)
  const stateKeys = []
  for (const [escape, expected] of [[30, 'gameplay_part_v1_tension_safe'], [60, 'gameplay_part_v1_tension_warning'], [85, 'gameplay_part_v1_tension_danger']]) {
    const key = await page.evaluate(value => {
      const scene = window.__game.scene.getScene('GameScene')
      scene.battleState.escape = value
      scene._castPresentationHost.sync()
      return scene._castPresentationHost.nodes.battleTensionStatus.texture.key
    }, escape)
    stateKeys.push(key)
    if (key !== expected) throw new Error(`${viewport.id}: expected ${expected}, got ${key}`)
  }
  await page.screenshot({ path: path.join(output, `battle-danger-${viewport.id}.png`) })

  if (viewport.id === 'portrait') {
    await openScene(page, 'GameScene', '&qaAction=battle&qaFish=kanpachi')
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
    await page.waitForTimeout(900)
    await forceFish(page, 'kanpachi')
    await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
    await page.waitForTimeout(500)
    const caught = await page.evaluate(() => {
      const nodes = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes
      return { fx: nodes.resultOutcomeFx.texture.key, fish: nodes.resultFish.texture.key, visible: nodes.resultOutcomeFx.visible }
    })
    if (!caught.visible || caught.fx !== 'gameplay_part_v1_result_caught' || caught.fish !== 'fish_part_v1_kanpachi') throw new Error(`caught integration failed: ${JSON.stringify(caught)}`)
    await page.screenshot({ path: path.join(output, 'result-caught-kanpachi-portrait.png') })

    await openScene(page, 'GameScene', '&qaAction=battle&qaFish=saba')
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle')
    await page.waitForTimeout(900)
    await forceFish(page, 'saba')
    await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
    await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
    await page.waitForTimeout(500)
    const escaped = await page.evaluate(() => {
      const nodes = window.__game.scene.getScene('GameScene')._castPresentationHost.nodes
      return { fx: nodes.resultOutcomeFx.texture.key, visible: nodes.resultOutcomeFx.visible }
    })
    if (!escaped.visible || escaped.fx !== 'gameplay_part_v1_result_escaped') throw new Error(`escaped integration failed: ${JSON.stringify(escaped)}`)
    await page.screenshot({ path: path.join(output, 'result-escaped-saba-portrait.png') })
  }

  if (errors.length) throw new Error(`${viewport.id}: ${errors.join(' | ')}`)
  await context.close()
}

await browser.close()
console.log('PASS: 16 gameplay parts in real scenes; 3 tension states and 3 viewports verified')
