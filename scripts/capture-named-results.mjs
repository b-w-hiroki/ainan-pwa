import assert from 'node:assert/strict'
import { existsSync, realpathSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { countGetHeaderPixels } from './result-screen-pixel-guard.mjs'

// CI installs Playwright temporarily; keep it out of the production bundle.
const executable = process.env.PATH.split(':').map(folder => join(folder, 'playwright')).find(existsSync)
assert.ok(executable, 'Playwright executable missing from npm exec PATH')
const { chromium } = await import(pathToFileURL(join(dirname(realpathSync(executable)), 'index.mjs')).href)

const cases = [
  ['bass', 'pointB', '50-bass-result.png'],
  ['saba', 'pointA', '51-saba-result.png'],
  ['isaki', 'pointB', '52-isaki-result.png'],
  ['hirame', 'pointB', '53-hirame-result.png'],
  ['kanpachi', 'pointC', '54-kanpachi-result.png'],
]
mkdirSync('artifacts/e2e', { recursive: true })
// A DOM-ready Result can still produce one compositor-only blank frame.
// Retry the *capture* (never the game's result action), validate decoded
// screenshot pixels on every attempt, and fail after a bounded deadline.
async function captureVisibleResult(page, filename, inspect = null) {
  let seenGold = 0
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (inspect) await inspect()
    await page.screenshot({
      path: join('artifacts/e2e', filename), animations: 'disabled',
    })
    seenGold = countGetHeaderPixels(filename)
    if (seenGold > 450) {
      console.log('Rendered Result confirmed:', filename, { attempt, goldPixels: seenGold })
      return
    }
    if (attempt < 4) await page.waitForTimeout(300)
  }
  assert.fail(filename + ': Result pixels absent after 4 captures (last gold=' + seenGold + ')')
}

const browser = await chromium.launch({ headless: true })
try {
  // Keep the original qaAction=caught fixture (without qaPlayer). The CLI
  // previously captured a blank compositor frame despite the DOM marker.
  const defaultResult = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await defaultResult.goto(
      'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught',
      { waitUntil: 'domcontentloaded' },
    )
    await defaultResult.waitForSelector('body[data-qa-result-ready="caught"]', { timeout: 20000 })
    await defaultResult.waitForTimeout(450)
    const assertDefaultResult = async () => {
      const state = await defaultResult.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const canvas = document.querySelector('#game-container canvas')
        return {
          phase: scene?.phase, outcome: scene?._castPresentationOutcome,
          fish: scene?.fish?.id,
          resultVisible: host?.nodes?.resultForeground?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          heroVisible: host?.nodes?.resultFish?.visible,
          heroWidth: host?.nodes?.resultFish?.displayWidth,
          canvasPresent: Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0),
        }
      })
      assert.equal(state.phase, 'result', '04-result.png: Result phase missing')
      assert.equal(state.outcome, 'caught', '04-result.png: catch outcome missing')
      assert.ok(state.fish, '04-result.png: no fish')
      assert.equal(state.resultVisible, true, '04-result.png: foreground hidden')
      assert.equal(state.battleVisible, false, '04-result.png: Battle foreground revived')
      assert.equal(state.heroVisible, true, '04-result.png: premium fish hidden')
      assert.ok(state.heroWidth >= 290, '04-result.png: premium fish too small')
      assert.equal(state.canvasPresent, true, '04-result.png: canvas missing')
    }
    await captureVisibleResult(defaultResult, '04-result.png', assertDefaultResult)
  } finally {
    await defaultResult.close()
  }

  // Restore the original non-fresh Kue boss Result fixture. Its delayed CLI
  // capture occasionally emitted a 2742-byte blank WebGL compositor frame.
  // Preserve the caught boss state, verify the host, then retry *only* pixels.
  const bossResult = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
  })
  try {
    await bossResult.goto(
      'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaBoss=kue',
      { waitUntil: 'domcontentloaded' },
    )
    await bossResult.waitForSelector('body[data-qa-result-ready="caught"]', { timeout: 20000 })
    await bossResult.waitForTimeout(450)
    const assertBossResult = async () => {
      const state = await bossResult.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const canvas = document.querySelector('#game-container canvas')
        return {
          phase: scene?.phase, outcome: scene?._castPresentationOutcome,
          fish: scene?.fish?.id,
          resultVisible: host?.nodes?.resultForeground?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          heroVisible: host?.nodes?.resultFish?.visible,
          heroWidth: host?.nodes?.resultFish?.displayWidth,
          canvasPresent: Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0),
        }
      })
      assert.equal(state.phase, 'result', '22-boss-kue-result.png: incorrect phase')
      assert.equal(state.outcome, 'caught', '22-boss-kue-result.png: missing catch outcome')
      assert.equal(state.fish, 'kue', '22-boss-kue-result.png: wrong boss')
      assert.equal(state.resultVisible, true, '22-boss-kue-result.png: Result foreground hidden')
      assert.equal(state.battleVisible, false, '22-boss-kue-result.png: Battle foreground revived')
      assert.equal(state.heroVisible, true, '22-boss-kue-result.png: hero absent')
      assert.ok(state.heroWidth >= 290, '22-boss-kue-result.png: hero too small')
      assert.equal(state.canvasPresent, true, '22-boss-kue-result.png: canvas missing')
    }
    await captureVisibleResult(bossResult, '22-boss-kue-result.png', assertBossResult)
  } finally {
    await bossResult.close()
  }

  // Preserve the original first Kue boss-catch fixture. A DOM-ready
  // Result is insufficient: the old CLI sometimes wrote a 2742-byte blank
  // WebGL compositor PNG. Require actual Result state and decoded gold pixels.
  const firstTrophy = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
  })
  try {
    await firstTrophy.goto(
      'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaBoss=kue&qaFreshBoss=1',
      { waitUntil: 'domcontentloaded' },
    )
    await firstTrophy.waitForSelector('body[data-qa-result-ready="caught"]', { timeout: 20000 })
    await firstTrophy.waitForFunction(() => {
      const scene=window.__game?.scene?.getScene('GameScene')
      const badge=scene?._bossRecordBadge
      return Boolean(badge?.active && badge.alpha>0.95)
    }, { timeout: 15000 })
    const assertFirstTrophy = async () => {
      const state = await firstTrophy.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const canvas = document.querySelector('#game-container canvas')
        const badge=scene?._bossRecordBadge
        return {
          trophyLabel:badge?.list?.find(item=>typeof item?.text==='string' && item.text.includes('TROPHY'))?.text??null,
          badgeInResultHost:Boolean(badge?.parentContainer===host?.root),
          badgeY:badge?.y,
          phase: scene?.phase, outcome: scene?._castPresentationOutcome,
          fish: scene?.fish?.id,
          resultVisible: host?.nodes?.resultForeground?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          heroVisible: host?.nodes?.resultFish?.visible,
          heroWidth: host?.nodes?.resultFish?.displayWidth,
          canvasPresent: Boolean(canvas?.isConnected && canvas.width>0 && canvas.height>0),
        }
      })
      assert.equal(state.phase,'result','27-kue-first-trophy.png: Result phase missing')
      assert.equal(state.outcome,'caught','27-kue-first-trophy.png: catch outcome missing')
      assert.equal(state.fish,'kue','27-kue-first-trophy.png: wrong boss fish')
      assert.equal(state.resultVisible,true,'27-kue-first-trophy.png: Result hidden')
      assert.equal(state.battleVisible,false,'27-kue-first-trophy.png: Battle still visible')
      assert.equal(state.heroVisible,true,'27-kue-first-trophy.png: hero hidden')
      assert.ok(state.heroWidth>=290,'27-kue-first-trophy.png: hero too small')
      assert.equal(state.canvasPresent,true,'27-kue-first-trophy.png: canvas missing')
      assert.equal(state.trophyLabel,'★ TROPHY UNLOCKED ★','27-kue-first-trophy.png: first trophy missing')
      assert.equal(state.badgeInResultHost,true,'27-kue-first-trophy.png: trophy behind the Result host')
      assert.ok(state.badgeY>=565 && state.badgeY<=620,
        '27-kue-first-trophy.png: trophy overlaps hero summary or Town CTA')
    }
    await captureVisibleResult(firstTrophy,'27-kue-first-trophy.png',assertFirstTrophy)
    const trophyGold = countGetHeaderPixels('27-kue-first-trophy.png',undefined,
      { left:88, right:302, top:575, bottom:615 })
    assert.ok(trophyGold>1500,
      '27-kue-first-trophy.png: badge active in Phaser but not visibly gold ('+trophyGold+' pixels)')
    console.log('Verified actual trophy banner pixels:',trophyGold)
  } finally {
    await firstTrophy.close()
  }

  // Match the previously flaky player/reward Result fixture exactly. A long
  // CLI delay after the DOM marker could capture a blank compositor frame.
  const playerResult = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await playerResult.goto(
      'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaReward=rare&qaPlayer=result',
      { waitUntil: 'domcontentloaded' },
    )
    await playerResult.waitForSelector('body[data-qa-result-ready="caught"]', { timeout: 20000 })
    await playerResult.waitForFunction(() => {
      const scene = window.__game?.scene?.getScene('GameScene')
      return scene?.phase === 'result' && Boolean(scene?._qaRewardBadge?.active)
    }, { timeout: 20000 })
    await playerResult.waitForTimeout(450)
    const state = await playerResult.evaluate(() => {
      const scene = window.__game?.scene?.getScene('GameScene')
      const host = scene?._castPresentationHost
      const canvas = document.querySelector('#game-container canvas')
      return {
        phase: scene?.phase,
        outcome: scene?._castPresentationOutcome,
        ready: document.body.dataset.qaResultReady,
        fish: scene?.fish?.id,
        resultVisible: host?.nodes?.resultForeground?.visible,
        battleVisible: host?.nodes?.battleForeground?.visible,
        heroVisible: host?.nodes?.resultFish?.visible,
        heroWidth: host?.nodes?.resultFish?.displayWidth,
        rewardBadgePresent: Boolean(scene?._qaRewardBadge?.active),
        canvasPresent: Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0),
      }
    })
    assert.equal(state.phase, 'result', '39-player-result.png: incorrect phase')
    assert.equal(state.outcome, 'caught', '39-player-result.png: missing catch')
    assert.equal(state.ready, 'caught', '39-player-result.png: readiness lost')
    assert.ok(state.fish, '39-player-result.png: no captured fish')
    assert.equal(state.resultVisible, true, '39-player-result.png: Result foreground hidden')
    assert.equal(state.battleVisible, false, '39-player-result.png: Battle foreground resurfaced')
    assert.equal(state.heroVisible, true, '39-player-result.png: premium Result hero hidden')
    assert.ok(state.heroWidth >= 290, '39-player-result.png: premium fish too small')
    assert.equal(state.rewardBadgePresent, true, '39-player-result.png: rare reward feedback missing')
    assert.equal(state.canvasPresent, true, '39-player-result.png: game canvas missing')
    await playerResult.screenshot({
      path: join('artifacts/e2e', '39-player-result.png'), animations: 'disabled',
    })
    console.log('Captured stable rare player Result:', JSON.stringify(state))
  } finally {
    await playerResult.close()
  }

  // Exercise real GameScene location state and foreground ownership for all
  // three fields. Existing 15–17 fixture screenshots remain unchanged.
  const battleCases = [
    ['aji', 'pointA', '58-aji-battle-harbor.png'],
    ['aji', 'pointB', '59-aji-battle-bay.png'],
    ['saba', 'pointC', '60-saba-battle-cape.png'],
  ]
  for (const [fishId, point, filename] of battleCases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      const query = new URLSearchParams({ qa: '1', scene: 'GameScene', qaAction: 'battle', qaLocation: point, qaFish: fishId })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + query.toString(), { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        return scene?.phase === 'battle' && scene?._castPresentationHost?.nodes?.battleForeground?.visible
      }, { timeout: 20000 })
      await page.waitForTimeout(450)
      const state = await page.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        const hero = host?.nodes?.battleFish
        const overlay = host?.nodes?.battleLocationOverlay
        return {
          phase: scene?.phase, point: scene?.env?.point, fish: scene?.fish?.id,
          heroTexture: hero?.texture?.key, heroWidth: hero?.displayWidth,
          // A rotated fish can clip its tail even when displayWidth fits.
          // Compute its actual axis-aligned projected extents in design coords.
          heroLeft: hero ? hero.x - (Math.abs(hero.displayWidth * Math.cos(hero.rotation)) + Math.abs(hero.displayHeight * Math.sin(hero.rotation))) / 2 : null,
          heroRight: hero ? hero.x + (Math.abs(hero.displayWidth * Math.cos(hero.rotation)) + Math.abs(hero.displayHeight * Math.sin(hero.rotation))) / 2 : null,
          heroInForeground: hero?.parentContainer === host?.nodes?.battleForeground,
          overlayTexture: overlay?.texture?.key, overlayVisible: overlay?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          resultVisible: host?.nodes?.resultForeground?.visible,
        }
      })
      assert.equal(state.phase, 'battle', filename + ': expected Battle')
      assert.equal(state.point, point, filename + ': QA location did not reach real GameScene')
      assert.equal(state.fish, fishId, filename + ': wrong Battle fish')
      assert.equal(state.heroTexture, 'fish_hero_' + fishId, filename + ': wrong premium fish')
      assert.ok(state.heroWidth >= 290 && state.heroInForeground, filename + ': premium fish hidden behind Battle base')
      assert.ok(state.heroLeft >= 16 && state.heroRight <= 380,
        filename + ': Battle hero must fit within safe horizontal margin (left=' + state.heroLeft + ', right=' + state.heroRight + ')')
      assert.equal(state.overlayVisible, point !== 'pointA', filename + ': incorrect location overlay visibility')
      assert.equal(state.overlayTexture, {
        pointA: 'ff_location_harbor', pointB: 'ff_location_bay', pointC: 'ff_location_cape',
      }[point], filename + ': wrong location artwork')
      assert.equal(state.battleVisible, true)
      assert.equal(state.resultVisible, false)
      await page.screenshot({ path: join('artifacts/e2e', filename), animations: 'disabled' })
      console.log('Captured verified Battle:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }

  // The generic Result clearance uses the same state-aware capture method as
  // named fish. The old CLI screenshot waited 3400ms *after* readiness and on
  // some Chromium runs captured only the page background.
  const clearance = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  try {
    await clearance.goto(
      'http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&qaAction=caught&qaPlayer=result',
      { waitUntil: 'domcontentloaded' },
    )
    await clearance.waitForSelector('body[data-qa-result-ready="caught"]', { timeout: 20000 })
    const inspectClearance = async () => clearance.evaluate(() => {
      const scene = window.__game?.scene?.getScene('GameScene')
      const host = scene?._castPresentationHost
      const canvas = document.querySelector('#game-container canvas')
      return {
        phase: scene?.phase,
        outcome: scene?._castPresentationOutcome,
        fish: scene?.fish?.id,
        resultVisible: host?.nodes?.resultForeground?.visible,
        battleVisible: host?.nodes?.battleForeground?.visible,
        heroVisible: host?.nodes?.resultFish?.visible,
        heroWidth: host?.nodes?.resultFish?.displayWidth,
        canvasPresent: Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0),
        readyMarker: document.body.dataset.qaResultReady,
      }
    })
    const assertClearance = (state, label, { expectReadyMarker = true } = {}) => {
      assert.equal(state.phase, 'result', label + ': Result phase lost')
      assert.equal(state.outcome, 'caught', label + ': catch outcome lost')
      assert.ok(state.fish, label + ': catch fish missing')
      assert.equal(state.resultVisible, true, label + ': Result foreground hidden')
      assert.equal(state.battleVisible, false, label + ': Battle foreground resurfaced')
      assert.equal(state.heroVisible, true, label + ': premium Result hero hidden')
      assert.ok(state.heroWidth >= 290, label + ': premium Result hero too small')
      assert.equal(state.canvasPresent, true, label + ': game canvas missing')
      if (expectReadyMarker) assert.equal(state.readyMarker, 'caught', label + ': readiness marker lost')
    }
    await clearance.waitForTimeout(850)
    const initial = await inspectClearance()
    assertClearance(initial, '45-clearance-result.png')
    await captureVisibleResult(clearance, '45-clearance-result.png',
      async () => assertClearance(await inspectClearance(), '45-clearance-result.png', { expectReadyMarker: false }))
    // A second late capture detects the failure mode that the former
    // 3400ms post-ready CLI screenshot exposed instead of concealing it.
    await clearance.waitForTimeout(2200)
    const stable = await inspectClearance()
    assertClearance(stable, '57-clearance-result-stable.png', { expectReadyMarker: false })
    await captureVisibleResult(clearance, '57-clearance-result-stable.png',
      async () => assertClearance(await inspectClearance(), '57-clearance-result-stable.png', { expectReadyMarker: false }))
    console.log('Captured and verified generic Result clearance:', JSON.stringify({ initial, stable }))
  } finally {
    await clearance.close()
  }

  for (const [fishId, point, filename] of cases) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    try {
      const query = new URLSearchParams({
        qa: '1', scene: 'GameScene', qaAction: 'caught',
        qaLocation: point, qaFish: fishId,
      })
      await page.goto('http://127.0.0.1:4173/fishing-game/?' + query.toString(), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(
        `body[data-qa-result-ready="caught"][data-qa-result-fish="${fishId}"]`,
        { timeout: 20000 },
      )
      // The readiness marker already waits for the catch flash/tween.
      // Long fixed post-marker waits can capture a later, unrelated phase.
      await page.waitForTimeout(850)
      const state = await page.evaluate(() => {
        const scene = window.__game?.scene?.getScene('GameScene')
        const host = scene?._castPresentationHost
        return {
          phase: scene?.phase, outcome: scene?._castPresentationOutcome,
          fish: scene?.fish?.id,
          resultVisible: host?.nodes?.resultForeground?.visible,
          battleVisible: host?.nodes?.battleForeground?.visible,
          heroTexture: host?.nodes?.resultFish?.texture?.key,
          heroVisible: host?.nodes?.resultFish?.visible,
          heroWidth: host?.nodes?.resultFish?.displayWidth,
          heldFishVisible: host?.nodes?.characterMotion?.fish?.visible,
        }
      })
      assert.equal(state.phase, 'result', fishId + ': phase changed before capture')
      assert.equal(state.outcome, 'caught', fishId + ': unexpected outcome')
      assert.equal(state.fish, fishId, fishId + ': wrong Result fish')
      assert.equal(state.resultVisible, true, fishId + ': Result layer not visible')
      assert.equal(state.battleVisible, false, fishId + ': Battle layer still visible')
      assert.equal(state.heroTexture, 'fish_hero_' + fishId, fishId + ': incorrect premium hero texture')
      assert.equal(state.heroVisible, true, fishId + ': premium fish hidden by celebration animation')
      assert.ok(state.heroWidth >= 290, fishId + ': Result premium fish too small')
      assert.equal(state.heldFishVisible, false, fishId + ': duplicate held fish competes with premium hero')
      await page.screenshot({ path: join('artifacts/e2e', filename), animations: 'disabled' })
      // Ensure the settled Result persists, not a transient QA frame.
      // The bass frame also receives a late rendered-pixel regression check.
      if (fishId === 'bass') {
        await page.waitForTimeout(2200)
        const phaseLater = await page.evaluate(() => window.__game?.scene?.getScene('GameScene')?.phase)
        assert.equal(phaseLater, 'result', fishId + ': late phase reverted to Battle')
        await captureVisibleResult(page, '56-bass-result-stable.png', async () => {
          const next = await page.evaluate(() => {
            const scene = window.__game?.scene?.getScene('GameScene')
            const host = scene?._castPresentationHost
            return {
              phase: scene?.phase,
              outcome: scene?._castPresentationOutcome,
              fish: scene?.fish?.id,
              resultVisible: host?.nodes?.resultForeground?.visible,
              battleVisible: host?.nodes?.battleForeground?.visible,
              heroVisible: host?.nodes?.resultFish?.visible,
            }
          })
          assert.equal(next.phase, 'result', '56-bass-result-stable.png: Result phase lost')
          assert.equal(next.outcome, 'caught', '56-bass-result-stable.png: catch outcome lost')
          assert.equal(next.fish, 'bass', '56-bass-result-stable.png: fish changed')
          assert.equal(next.resultVisible, true, '56-bass-result-stable.png: Result foreground hidden')
          assert.equal(next.battleVisible, false, '56-bass-result-stable.png: Battle reappeared')
          assert.equal(next.heroVisible, true, '56-bass-result-stable.png: fish art not visible')
        })
      }
      console.log('Captured named Result:', filename, JSON.stringify(state))
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
}
