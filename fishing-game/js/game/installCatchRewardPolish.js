import { FISH_META } from './progress.js'
import { getBossMetaForScene } from './bossVisuals.js'
import { haptic, playSfx } from './feedback.js'

function clear(scene) {
  scene._catchRewardVisuals?.forEach(obj => obj?.destroy?.())
  scene._catchRewardVisuals = []
}

function previousBest(catches, fishId) {
  return catches
    .filter(item => item.fishId === fishId)
    .reduce((max, item) => Math.max(max, item.sizeCm ?? 0), 0)
}

function show(scene, rewards) {
  clear(scene)
  if (!rewards.length) return
  const { width: W, height: H } = scene.scale
  const rows = rewards.slice(0, 2)
  const objects = []
  rows.forEach((reward, i) => {
    const y = H / 2 - 184 + i * 30
    const c = scene.add.container(W / 2 - 132, y).setDepth(145).setScrollFactor(0).setAlpha(0)
    const bg = scene.add.graphics()
    bg.fillStyle(reward.bg, 0.96)
    bg.lineStyle(1.5, 0xffffff, 0.72)
    bg.fillRoundedRect(0, -11, 122, 23, 9)
    bg.strokeRoundedRect(0, -11, 122, 23, 9)
    const txt = scene.add.text(61, 0, reward.label, {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '9px', fontStyle: 'bold', color: reward.fg,
      letterSpacing: 0.5,
    }).setOrigin(0.5)
    c.add([bg, txt])
    objects.push(c)
    scene.tweens.add({ targets: c, x: c.x + 8, alpha: 1, duration: 220 + i * 60, ease: 'Back.easeOut' })
  })
  scene._catchRewardVisuals = objects
}

export function installCatchRewardPolish(GameScene) {
  if (GameScene.prototype.__ainanCatchRewardPolishInstalled) return
  GameScene.prototype.__ainanCatchRewardPolishInstalled = true

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const fish = this.fish
    const boss = getBossMetaForScene(this)
    const before = [...(this.catches ?? [])]
    const oldBest = fish ? previousBest(before, fish.id) : 0
    const first = fish ? !before.some(item => item.fishId === fish.id) : false
    const result = originalFinish.call(this, outcome, ...args)

    if (outcome === 'caught' && fish && !boss) {
      const latest = [...(this.catches ?? [])].reverse().find(item => item.fishId === fish.id)
      const newBest = (latest?.sizeCm ?? 0) > oldBest
      const rewards = []
      if (first) rewards.push({ label: '★ FIRST CATCH', bg: 0x5bb5d8, fg: '#ffffff' })
      else if (newBest) rewards.push({ label: '★ NEW RECORD', bg: 0xff765a, fg: '#ffffff' })
      if (fish.rarity === 'rare') rewards.push({ label: '✦ RARE CATCH', bg: 0x8f80e8, fg: '#ffffff' })
      if (fish.rarity === 'legendary') rewards.push({ label: '✦ LEGENDARY', bg: 0xffd95a, fg: '#173248' })
      this.time.delayedCall(20, () => show(this, rewards))
      if (rewards.length) {
        playSfx(fish.rarity === 'legendary' ? 'legend' : 'catch')
        haptic(fish.rarity === 'legendary' ? [30, 20, 60] : 25)
      }
    } else {
      clear(this)
    }
    return result
  }

  const originalCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clear(this)
    return originalCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clear(this)
    return originalCleanup.apply(this, args)
  }
}
