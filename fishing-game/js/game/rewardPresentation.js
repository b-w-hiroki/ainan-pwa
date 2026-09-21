import { haptic, isReducedMotion, playSfx } from './feedback.js'

export const REWARD_THEME = {
  first: { label: '★ FIRST CATCH', color: 0x5bb5d8, text: '#ffffff', sfx: 'catch', haptic: 25 },
  record: { label: '★ NEW RECORD', color: 0xff765a, text: '#ffffff', sfx: 'catch', haptic: [25, 20, 45] },
  rare: { label: '✦ RARE CATCH', color: 0x8f80e8, text: '#ffffff', sfx: 'catch', haptic: [25, 20, 45] },
  legendary: { label: '✦ LEGENDARY', color: 0xffd95a, text: '#173248', sfx: 'legend', haptic: [30, 20, 60] },
  trophy: { label: '★ TROPHY UNLOCKED ★', color: 0xffd95a, text: '#173248', sfx: 'legend', haptic: [35, 30, 70, 30, 90] },
  achievement: { label: '★ ACHIEVEMENT', color: 0x71d6a2, text: '#173248', sfx: 'catch', haptic: [20, 20, 35] },
  growth: { label: 'TOWN GROWTH', color: 0xffb45d, text: '#173248', sfx: 'townUp', haptic: [25, 25, 45] },
}

export function rewardToken(kind, overrides = {}) {
  const base = REWARD_THEME[kind] ?? REWARD_THEME.first
  return { kind, ...base, ...overrides }
}

export function playRewardFeedback(kind) {
  const token = rewardToken(kind)
  if (token.sfx) playSfx(token.sfx)
  if (token.haptic) haptic(token.haptic)
}

export function showRewardBanner(scene, {
  kind = 'achievement',
  label = null,
  detail = '',
  x = null,
  y = 118,
  width = 260,
  depth = 190,
  duration = 900,
  persistent = false,
  feedback = false,
  onComplete = null,
} = {}) {
  if (!scene?.add) return null
  const token = rewardToken(kind)
  const W = scene.scale?.width ?? 390
  const cx = x ?? W / 2
  const c = scene.add.container(cx, y).setDepth(depth).setScrollFactor(0).setAlpha(0)

  const bg = scene.add.graphics()
  bg.fillStyle(0x071a28, 0.16)
  bg.fillRoundedRect(-width / 2 + 2, -26 + 4, width, detail ? 54 : 44, 16)
  bg.fillStyle(token.color, 0.97)
  bg.lineStyle(2, 0xffffff, 0.70)
  bg.fillRoundedRect(-width / 2, -26, width, detail ? 54 : 44, 16)
  bg.strokeRoundedRect(-width / 2, -26, width, detail ? 54 : 44, 16)

  const top = scene.add.text(0, detail ? -9 : -4, label ?? token.label, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    color: token.text,
    letterSpacing: 0.8,
  }).setOrigin(0.5)

  c.add([bg, top])

  if (detail) {
    const sub = scene.add.text(0, 11, detail, {
      fontFamily: 'M PLUS Rounded 1c, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: token.text,
      align: 'center',
      wordWrap: { width: width - 26 },
    }).setOrigin(0.5)
    c.add(sub)
  }

  if (feedback) playRewardFeedback(kind)

  if (isReducedMotion()) {
    c.setAlpha(1)
  } else {
    c.setY(y + 8)
    scene.tweens.add({
      targets: c,
      y,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    })
  }

  if (!persistent) {
    const finish = () => {
      if (!c?.active) return
      const done = () => {
        c.destroy(true)
        onComplete?.()
      }
      if (isReducedMotion()) done()
      else scene.tweens.add({ targets: c, alpha: 0, y: c.y - 10, duration: 180, onComplete: done })
    }
    if (scene.time?.delayedCall) scene.time.delayedCall(duration, finish)
    else if (typeof window !== 'undefined') window.setTimeout(finish, duration)
  }

  return c
}
