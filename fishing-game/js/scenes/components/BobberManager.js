import { C } from '../../config/palette.js'

const LURE_STYLE = {
  worm: { top: 0x2f9ed4, body: 0xf8fdff, accent: 0x71d6a2 },
  shrimp: { top: 0xff765a, body: 0xffd9c7, accent: 0xffd95a },
  special: { top: 0xffc83d, body: 0xfff3ad, accent: 0x71d6a2 },
}

/**
 * 仕掛け（旧 bobber）の描画と水面エフェクトを管理する。
 * 内部名は互換性のため bobber のまま維持するが、表示はルアー/エサ付き仕掛けとして扱う。
 */
export class BobberManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
    /** @type {Phaser.GameObjects.Graphics} */
    this.gfx = null
    this.baitType = 'worm'
  }

  create(W, H) {
    const g = this.scene.add.graphics().setDepth(33).setVisible(false)
    this.gfx = g
    this.setBaitType(this.scene.env?.player?.baitType ?? 'worm')
    return g
  }

  setBaitType(baitType = 'worm') {
    this.baitType = baitType
    if (!this.gfx) return
    const g = this.gfx
    const style = LURE_STYLE[baitType] ?? LURE_STYLE.worm
    g.clear()

    // The lure is a core gameplay cursor. Give it a strong halo/ring so it
    // remains readable against moving water and nearby fish shadows.
    g.fillStyle(0xffffff, 0.14)
    g.fillEllipse(0, 2, 42, 24)
    g.lineStyle(1.5, 0xdff8ff, 0.64)
    g.strokeEllipse(0, 2, 34, 18)

    // Slightly larger minnow body than the legacy version. This is still small
    // enough to read as tackle rather than a UI icon.
    g.fillStyle(style.body, 1)
    g.lineStyle(2.4, C.OUTLINE, 0.98)
    g.fillEllipse(0, 0, 25, 11)
    g.strokeEllipse(0, 0, 25, 11)
    g.fillStyle(style.top, 1)
    g.fillEllipse(-1, -2.5, 21, 5)
    g.fillStyle(style.accent, 1)
    g.fillTriangle(11, 0, 18, -7, 18, 7)

    g.fillStyle(C.OUTLINE, 1)
    g.fillCircle(-7, -1, 2.1)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(-7.5, -1.5, 0.8)

    // Hook and tiny connection point make line → lure continuity clear.
    g.lineStyle(1.8, 0x173248, 0.94)
    g.lineBetween(2, 5, 2, 12)
    g.beginPath()
    g.arc(5, 12, 3.5, Math.PI, Math.PI * 0.1, false)
    g.strokePath()
    g.fillStyle(0xffffff, 0.92)
    g.fillCircle(-13, 0, 2.2)

    if (baitType === 'special') {
      g.fillStyle(0xffffff, 0.92)
      g.fillCircle(-14, -10, 2.2)
      g.fillCircle(13, -12, 1.8)
    }
  }

  /** 水しぶきエフェクト（円を広げてフェードアウト） */
  showSplash(x, y) {
    const ring = this.scene.add.ellipse(x, y, 20, 9, 0xffffff, 0)
      .setStrokeStyle(2.2, 0xffffff, 0.90)
      .setDepth(45)
    const inner = this.scene.add.ellipse(x, y, 10, 5, 0xffffff, 0)
      .setStrokeStyle(1.5, 0xbfefff, 0.72)
      .setDepth(45)

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.2,
      scaleY: 2.6,
      alpha: 0,
      duration: 430,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy(),
    })
    this.scene.tweens.add({
      targets: inner,
      scaleX: 2.2,
      scaleY: 2,
      alpha: 0,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => inner.destroy(),
    })
  }

  destroy() {
    this.gfx = null
  }
}
