import { isReducedMotion } from './feedback.js'
const TEXT_RES = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1

const LABEL = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
  morning: '朝', noon: '昼', evening: '夕', night: '夜',
  sunny: '晴れ', cloudy: 'くもり', rainy: '雨',
}

function buildConditionPresentation(scene) {
  const { width: W, height: H } = scene.scale
  const env = scene.env ?? {}
  const overlay = scene.add.graphics().setDepth(4).setScrollFactor(0)

  if (env.timeOfDay === 'night') {
    overlay.fillStyle(0x061b3b, 0.28)
    overlay.fillRect(0, 0, W, H)
  } else if (env.timeOfDay === 'evening') {
    overlay.fillStyle(0xffa45a, 0.08)
    overlay.fillRect(0, 0, W, H)
  } else if (env.timeOfDay === 'morning') {
    overlay.fillStyle(0xfff1bd, 0.06)
    overlay.fillRect(0, 0, W, H)
  }

  if (env.weather === 'cloudy') {
    overlay.fillStyle(0x8ea9b5, 0.10)
    overlay.fillRect(0, 0, W, H)
  }

  if (env.weather === 'rainy') {
    overlay.fillStyle(0x3e6680, 0.11)
    overlay.fillRect(0, 0, W, H)
    const reduced = isReducedMotion()
    for (let i = 0; i < (reduced ? 8 : 18); i++) {
      const x = (i * 29) % W
      const y = 90 + ((i * 47) % Math.max(120, H - 180))
      const drop = scene.add.line(0, 0, x, y, x - 8, y + 22, 0xd9f4ff, reduced ? 0.24 : 0.34).setOrigin(0).setDepth(18).setScrollFactor(0)
      if (!reduced) scene.tweens.add({ targets: drop, y: 30, x: -10, duration: 620 + (i % 4) * 90, repeat: -1, ease: 'Linear' })
    }
  }

  const text = `${LABEL[env.season] ?? env.season}・${LABEL[env.timeOfDay] ?? env.timeOfDay}・${LABEL[env.weather] ?? env.weather}`
  const badge = scene.add.text(W - 14, 18, text, {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
    resolution: TEXT_RES,
    fontSize: '9px',
    fontStyle: 'bold',
    color: '#ffffff',
    backgroundColor: 'rgba(6,44,68,0.72)',
    padding: { x: 8, y: 5 },
  }).setOrigin(1, 0).setDepth(96).setScrollFactor(0)
  scene._conditionPresentation = { overlay, badge }
}

export function installEnvironmentPresentation(GameScene) {
  if (GameScene.prototype.__ainanEnvironmentPresentationInstalled) return
  GameScene.prototype.__ainanEnvironmentPresentationInstalled = true
  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    buildConditionPresentation(this)
    return result
  }
}
