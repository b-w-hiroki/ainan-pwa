import { ASSETS } from '../config/assetManifest.js'
import { FISH_LIST } from './fish.js'
import { getBossMetaForScene } from './bossVisuals.js'
import { haptic, playSfx } from './feedback.js'
import { rewardToken } from './rewardPresentation.js'

const QA_REWARD_FISH = {
  first: 'tai',
  record: 'hirame',
  rare: 'kanpachi',
  legendary: 'kue',
}

function qaReward() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('qa') !== '1') return null
  const kind = params.get('qaReward')
  return QA_REWARD_FISH[kind] ? kind : null
}

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
  const objects = []

  rewards.slice(0, 2).forEach((reward, i) => {
    const y = H / 2 - 184 + i * 34
    const c = scene.add.container(W / 2 - 132, y).setDepth(145).setScrollFactor(0).setAlpha(0)

    if (reward.kind === 'record' && scene.textures.exists(ASSETS.ui.resultNewRecord.key)) {
      const art = scene.add.image(74, 0, ASSETS.ui.resultNewRecord.key).setDisplaySize(148, 53)
      c.add(art)
    } else {
      const bg = scene.add.graphics()
      bg.fillStyle(reward.bg, 0.97)
      bg.lineStyle(1.5, 0xffffff, 0.76)
      bg.fillRoundedRect(0, -11, 122, 23, 9)
      bg.strokeRoundedRect(0, -11, 122, 23, 9)
      const txt = scene.add.text(61, 0, reward.label, {
        fontFamily: 'M PLUS Rounded 1c, sans-serif',
        fontSize: '9px', fontStyle: 'bold', color: reward.fg,
        letterSpacing: 0.5,
      }).setOrigin(0.5)
      c.add([bg, txt])
    }

    objects.push(c)
    scene.tweens.add({ targets: c, x: c.x + 8, alpha: 1, duration: 220 + i * 60, ease: 'Back.easeOut' })
  })
  scene._catchRewardVisuals = objects
}

function prepareQaReward(scene) {
  const kind = qaReward()
  if (!kind) return
  const fish = FISH_LIST.find(item => item.id === QA_REWARD_FISH[kind])
  if (!fish) return
  scene.fish = fish
  if (kind === 'legendary') scene.env.point = 'pointA'

  const other = (scene.catches ?? []).filter(item => item.fishId !== fish.id)
  if (kind === 'first' || kind === 'rare' || kind === 'legendary') {
    scene.catches = other
  } else if (kind === 'record') {
    scene.catches = [...other, {
      fishId: fish.id, sizeCm: 30, point: scene.env.point ?? 'pointB',
      score: 100, timestamp: Date.now() - 1000,
    }]
  }
  localStorage.setItem('ainan_catches', JSON.stringify(scene.catches))
}

export function installCatchRewardPolish(GameScene) {
  if (GameScene.prototype.__ainanCatchRewardPolishInstalled) return
  GameScene.prototype.__ainanCatchRewardPolishInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    prepareQaReward(this)
    return result
  }

  const originalRoll = GameScene.prototype._rollFishSize
  GameScene.prototype._rollFishSize = function (fish, ...args) {
    const kind = qaReward()
    if (kind && fish?.id === QA_REWARD_FISH[kind]) {
      if (kind === 'record') return 88
      if (kind === 'legendary') return 124
      if (kind === 'rare') return 82
      return 56
    }
    return originalRoll.call(this, fish, ...args)
  }

  const originalFinish = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const rewardKind = qaReward()
    if (rewardKind === 'legendary') this.env.point = 'pointA'
    const fish = this.fish
    const boss = getBossMetaForScene(this)
    const before = [...(this.catches ?? [])]
    const oldBest = fish ? previousBest(before, fish.id) : 0
    const first = fish ? !before.some(item => item.fishId === fish.id) : false
    const result = originalFinish.call(this, outcome, ...args)

    if (outcome === 'caught' && fish && (!boss || rewardKind)) {
      const latest = [...(this.catches ?? [])].reverse().find(item => item.fishId === fish.id)
      const newBest = (latest?.sizeCm ?? 0) > oldBest
      let rewards = []
      if (rewardKind) {
        // QA screenshots must isolate the requested reward language. Deriving
        // rewards from catch history made FIRST/RARE/LEGENDARY collapse into
        // identical visual states when multiple conditions were true.
        const token = rewardToken(rewardKind)
        rewards = [{ kind: rewardKind, label: token.label, bg: token.color, fg: token.text }]
      } else {
        if (first) {
          const token = rewardToken('first')
          rewards.push({ kind: 'first', label: token.label, bg: token.color, fg: token.text })
        } else if (newBest) {
          const token = rewardToken('record')
          rewards.push({ kind: 'record', label: token.label, bg: token.color, fg: token.text })
        }
        if (fish.rarity === 'rare') {
          const token = rewardToken('rare')
          rewards.push({ kind: 'rare', label: token.label, bg: token.color, fg: token.text })
        }
        if (fish.rarity === 'legendary') {
          const token = rewardToken('legendary')
          rewards.push({ kind: 'legendary', label: token.label, bg: token.color, fg: token.text })
        }
      }
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
