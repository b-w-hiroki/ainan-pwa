import { C } from '../../config/palette.js'

/**
 * 浮き（bobber）の生成と水しぶきエフェクトを管理するマネージャー。
 */
export class BobberManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
    /** @type {Phaser.GameObjects.Graphics} */
    this.gfx = null
  }

  /** 浮き Graphics を生成して返す。scene.bobber に代入して使う。 */
  create(W, H) {
    const g = this.scene.add.graphics().setDepth(30).setVisible(false)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(0, -3, 9)
    g.fillStyle(0xff2222, 1)
    g.fillCircle(0, 3, 9)
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.strokeCircle(0, 0, 9)
    g.lineStyle(2, 0xffffff, 0.8)
    g.lineBetween(0, -9, 0, -18)
    this.gfx = g
    return g
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
