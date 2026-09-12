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
    const g = this.scene.add.graphics().setDepth(30).setVisible(false)
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

    // 水面で見失わないための薄いハロー。
    g.fillStyle(0xffffff, 0.20)
    g.fillEllipse(0, 2, 30, 17)

    // ミノー型の小さな仕掛け。遠距離でも輪郭が読めるよう少し太め。
    g.fillStyle(style.body, 1)
    g.lineStyle(2, C.OUTLINE, 0.95)
    g.fillEllipse(0, 0, 20, 9)
    g.strokeEllipse(0, 0, 20, 9)
    g.fillStyle(style.top, 1)
    g.fillEllipse(-1, -2, 17, 4)
    g.fillStyle(style.accent, 1)
    g.fillTriangle(9, 0, 15, -6, 15, 6)

    g.fillStyle(C.OUTLINE, 1)
    g.fillCircle(-6, -1, 1.8)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(-6.5, -1.5, 0.7)

    // 針。小画面でも「仕掛けを巻いている」ことが伝わる程度に簡略化。
    g.lineStyle(1.6, 0x173248, 0.90)
    g.lineBetween(1, 4, 1, 10)
    g.beginPath()
    g.arc(4, 10, 3, Math.PI, Math.PI * 0.1, false)
    g.strokePath()

    if (baitType === 'special') {
      g.fillStyle(0xffffff, 0.88)
      g.fillCircle(-12, -8, 2)
      g.fillCircle(11, -10, 1.5)
    }
  }

  /** 水しぶきエフェクト（円を広げてフェードアウト） */
  showSplash(x, y) {
    const splash = this.scene.add.circle(x, y, 4, 0xffffff, 0.8).setDepth(45)
    this.scene.tweens.add({
      targets: splash, scaleX: 5, scaleY: 2.5, alpha: 0,
      duration: 300, ease: 'Sine.easeOut',
      onComplete: () => splash.destroy(),
    })
  }

  destroy() {
    this.gfx = null
  }
}
