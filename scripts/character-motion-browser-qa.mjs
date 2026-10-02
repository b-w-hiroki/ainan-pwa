import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '../../oh-edo-work/node_modules/playwright/index.mjs'

const base = process.env.AINAN_QA_URL ?? 'http://127.0.0.1:43192/fishing-game/index.html'
const output = path.resolve('qa-artifacts/character-motion-v1')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []

const sceneState = page => page.evaluate(() => {
  const scene = window.__game?.scene?.getScene?.('GameScene')
  const motion = scene?._castPresentationHost?.nodes?.characterMotion
  return {
    active: Boolean(scene?.sys?.isActive?.()),
    phase: scene?.phase,
    charging: scene?.isCharging,
    lock: scene?._castMotionInputLocked,
    pose: motion?.currentPose,
    action: motion?.currentAction,
    ready: motion?.ready,
    playerVisible: scene?._castPresentationHost?.nodes?.player?.visible,
    catches: scene?.catches?.length ?? 0,
    score: scene?.totalScore ?? 0,
    rootVisible: motion?.root?.visible,
  }
})

async function open(context, query) {
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`))
  await page.goto(`${base}?${query}&scene=GameScene`, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForFunction(() => {
      const scene = window.__game?.scene?.getScene?.('GameScene')
      return scene?.sys?.isActive?.() && scene?._castPresentationHost?.nodes?.characterMotion
    }, null, { timeout: 12000 })
  } catch (error) {
    const debug = await page.evaluate(() => ({ hasGame: Boolean(window.__game), active: window.__game?.scene?.getScenes?.(true)?.map(scene => scene.scene?.key), body: document.body.innerText.slice(0, 500) }))
    throw new Error(`GameScene startup timeout: ${JSON.stringify(debug)}; console=${errors.join(' | ')}; ${error.message}`)
  }
  return page
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
let page = await open(context, 'qa=1&qaMockPhase=cast')
let state = await sceneState(page)
if (!state.ready || state.pose !== 'idle') throw new Error(`cast idle unavailable: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '01-game-idle.png') })

const canvas = page.locator('canvas').last()
const box = await canvas.boundingBox()
if (!box) throw new Error('game canvas missing')
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.886)
await page.mouse.down()
await page.waitForTimeout(330)
state = await sceneState(page)
if (!state.charging || state.pose !== 'castWindup') throw new Error(`long-press did not wind up: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '02-game-cast-windup.png') })
await page.mouse.up()
await page.waitForTimeout(180)
state = await sceneState(page)
if (!['castMid', 'castRelease'].includes(state.pose) || !state.lock) throw new Error(`release not connected: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '03-game-cast-release.png') })

await page.mouse.down()
await page.waitForTimeout(70)
const duplicate = await sceneState(page)
await page.mouse.up()
if (duplicate.charging) throw new Error(`double input was accepted: ${JSON.stringify(duplicate)}`)
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'retrieve', null, { timeout: 4000 })
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(output, '04-game-retrieve-after-cast.png') })
await page.close()

page = await open(context, 'qa=1&qaMockPhase=cast')
const castBox = await page.locator('canvas').last().boundingBox()
await page.mouse.move(castBox.x + castBox.width * 0.5, castBox.y + castBox.height * 0.886)
await page.mouse.down()
await page.waitForTimeout(180)
await page.mouse.move(castBox.x + 30, castBox.y + 40)
await page.mouse.up()
await page.mouse.click(castBox.x + 30, castBox.y + 40)
await page.waitForFunction(() => window.__game.scene.isActive('MapScene'), null, { timeout: 3000 })
await page.close()

page = await open(context, 'qa=1&qaAction=battle')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle', null, { timeout: 5000 })
const fightPoses = []
for (let index = 0; index < 8; index += 1) {
  await page.waitForTimeout(120)
  fightPoses.push((await sceneState(page)).pose)
}
if (fightPoses.some(pose => !pose?.startsWith('fight')) || new Set(fightPoses).size < 2) throw new Error(`fight loop not advancing: ${fightPoses.join(', ')}`)
await page.screenshot({ path: path.join(output, '05-game-fight-loop.png') })
await page.setViewportSize({ width: 844, height: 390 })
await page.waitForTimeout(220)
state = await sceneState(page)
if (!state.rootVisible || !state.pose.startsWith('fight')) throw new Error(`landscape resize lost motion: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '06-game-fight-landscape.png') })
await page.setViewportSize({ width: 390, height: 844 })
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result')
await page.waitForTimeout(480)
state = await sceneState(page)
if (!state.pose.startsWith('sad')) throw new Error(`escape sadness missing: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '07-game-escaped-sad.png') })
await page.waitForTimeout(1500)
state = await sceneState(page)
if (state.pose !== 'idle' || state.action) throw new Error(`sadness did not return idle: ${JSON.stringify(state)}`)
const resultBox = await page.locator('canvas').last().boundingBox()
await page.mouse.click(resultBox.x + resultBox.width * 0.5, resultBox.y + resultBox.height * 0.88)
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'cast', null, { timeout: 4000 })
state = await sceneState(page)
if (state.pose !== 'idle') throw new Error(`retry did not reset idle: ${JSON.stringify(state)}`)
await page.close()

page = await open(context, 'qa=1&qaAction=battle&qaFish=tai')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle', null, { timeout: 6000 })
await page.waitForTimeout(900)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'result', null, { timeout: 6000 })
await page.waitForTimeout(440)
const committed = await sceneState(page)
state = committed
if (!state.pose.startsWith('joy')) throw new Error(`catch joy missing: ${JSON.stringify(state)}`)
await page.screenshot({ path: path.join(output, '08-game-caught-joy.png') })
await page.waitForTimeout(1700)
const settled = await sceneState(page)
if (settled.pose !== 'idle' || settled.action) throw new Error(`joy did not return idle: ${JSON.stringify(settled)}`)
if (settled.catches !== committed.catches || settled.score !== committed.score) throw new Error('animation changed committed catch/reward state')
await page.close()

const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
page = await open(reducedContext, 'qa=1&qaAction=battle')
await page.waitForFunction(() => window.__game.scene.getScene('GameScene')?.phase === 'battle', null, { timeout: 5000 })
await page.waitForTimeout(300)
const reducedA = await sceneState(page)
await page.waitForTimeout(350)
const reducedB = await sceneState(page)
if (reducedA.pose !== 'fightMid' || reducedB.pose !== 'fightMid') throw new Error(`reduced motion not static: ${JSON.stringify({ reducedA, reducedB })}`)
await reducedContext.close()

const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
await fallbackContext.route('**/animation-v1/idle.png', route => route.abort())
page = await open(fallbackContext, 'qa=1&qaMockPhase=cast')
state = await sceneState(page)
if (state.ready || state.playerVisible !== true) throw new Error(`asset-failure fallback missing: ${JSON.stringify(state)}`)
await fallbackContext.close()
await context.close()

const videoContext = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: output, size: { width: 390, height: 844 } } })
page = await open(videoContext, 'qa=1&qaMockPhase=cast')
let videoBox = await page.locator('canvas').last().boundingBox()
await page.mouse.move(videoBox.x + videoBox.width * 0.5, videoBox.y + videoBox.height * 0.886)
await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(1400)
await page.goto(`${base}?qa=1&qaAction=battle&scene=GameScene`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.phase === 'battle', null, { timeout: 6000 })
await page.waitForTimeout(1700)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('caught'))
await page.waitForTimeout(1800)
await page.goto(`${base}?qa=1&qaAction=battle&scene=GameScene`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => window.__game?.scene?.getScene?.('GameScene')?.phase === 'battle', null, { timeout: 6000 })
await page.waitForTimeout(1300)
await page.evaluate(() => window.__game.scene.getScene('GameScene')._finishBattle('escaped'))
await page.waitForTimeout(1900)
const video = page.video()
await videoContext.close()
await fs.copyFile(await video.path(), path.join(output, 'ainan-game-character-motion-v1.webm'))
await browser.close()

const unexpectedErrors = errors.filter(message => !message.includes('ERR_FAILED') && !message.includes('ERR_NETWORK_ACCESS_DENIED') && !message.includes('idle.png'))
if (unexpectedErrors.length) throw new Error(`browser errors: ${unexpectedErrors.join('; ')}`)
console.log('PASS: real game cast/fight/caught/escaped, double input, interrupt, retry, resize, reduced motion, asset fallback, video')
