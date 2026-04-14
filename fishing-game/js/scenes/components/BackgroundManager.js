import { C } from '../../config/palette.js'

/**
 * 背景・プレイヤー・魚影の描画とTween管理を担当するマネージャー。
 * GameScene から new BackgroundManager(this) で生成して使う。
 */
export class BackgroundManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
    /** @type {Array<{t:string, y:number, dur:number, delay:number, sc:number, rtl:boolean}>} */
    this._fishDefs = []
    /** @type {Phaser.GameObjects.Graphics[]} */
    this._fishGfx = []
    /** @type {Phaser.Tweens.Tween[]} */
    this._fishTweens = []
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BACKGROUND
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  buildBackground(W, H) {
    const g = this.scene.add.graphics().setDepth(0)

    // 空 (0 〜 15%)
    g.fillGradientStyle(C.SKY_T, C.SKY_T, C.SKY_B, C.SKY_B, 1)
    g.fillRect(0, 0, W, H * 0.15)

    // 太陽
    g.fillStyle(C.SUN, 1)
    g.fillCircle(W * 0.86, H * 0.04, 18)
    g.fillStyle(0xfffbe0, 0.3)
    g.fillCircle(W * 0.86, H * 0.04, 26)

    // 雲
    this._cloud(g, W * 0.08, H * 0.04, 1.0)
    this._cloud(g, W * 0.50, H * 0.07, 0.75)
    this._cloud(g, W * 0.76, H * 0.03, 0.60)

    // 島背景レイヤー (13〜22%)
    g.fillGradientStyle(0xc8eeff, 0xc8eeff, 0xa8ddf0, 0xa8ddf0, 1)
    g.fillRect(0, H * 0.13, W, H * 0.09)

    // 島シルエット
    g.fillStyle(C.ISLAND, 1)
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.fillEllipse(W * 0.12, H * 0.213, W * 0.19, H * 0.066)
    g.strokeEllipse(W * 0.12, H * 0.213, W * 0.19, H * 0.066)
    g.fillEllipse(W * 0.88, H * 0.213, W * 0.12, H * 0.044)
    g.strokeEllipse(W * 0.88, H * 0.213, W * 0.12, H * 0.044)
    g.fillStyle(0x66cc44, 0.75)
    g.fillEllipse(W * 0.57, H * 0.218, W * 0.09, H * 0.032)

    // ホリゾンライン
    g.fillStyle(0xffffff, 0.65)
    g.fillRect(0, H * 0.209, W, 3)

    // 海 (22〜84%)
    g.fillGradientStyle(C.SEA_T, C.SEA_T, C.SEA_B, C.SEA_B, 1)
    g.fillRect(0, H * 0.22, W, H * 0.62)

    // 海上部の丸みウェーブ
    g.fillStyle(C.SEA_T, 1)
    g.fillEllipse(W * 0.5, H * 0.213, W * 1.12, H * 0.024)

    // セルシェーディングストライプ
    ;[0.12, 0.28, 0.50, 0.72].forEach((frac, i) => {
      g.fillStyle(0xffffff, 0.12 - i * 0.02)
      g.fillRect(0, H * 0.22 + H * 0.62 * frac, W, 3)
    })

    // 岸 (84〜100%)
    // 草
    g.fillGradientStyle(C.GRASS_T, C.GRASS_T, C.GRASS_B, C.GRASS_B, 1)
    g.fillRect(0, H * 0.84, W, H * 0.048)
    g.lineStyle(3, 0x3aaa20, 1)
    g.strokeRect(0, H * 0.84, W, H * 0.048)

    // 草の葉
    ;[0.14, 0.24, 0.40, 0.60, 0.72, 0.85].forEach(fx => {
      const tx = W * fx, ty = H * 0.84 + H * 0.048
      g.fillStyle(C.GRASS_B, 1)
      g.fillTriangle(tx, ty, tx - 5, ty + 10, tx + 5, ty + 10)
    })

    // 岸水際ライン
    g.fillStyle(0xffffff, 0.7)
    g.fillRect(0, H * 0.84 + H * 0.046, W, 5)

    // 砂
    g.fillGradientStyle(C.SAND_T, C.SAND_T, C.SAND_B, C.SAND_B, 1)
    g.fillRect(0, H * 0.888, W, H * 0.112)
    g.lineStyle(3, 0xe8c060, 1)
    g.strokeRect(0, H * 0.888, W, H * 0.112)

    // 砂利
    ;[
      { x: 0.22, y: 0.925, w: 8, h: 5 },
      { x: 0.38, y: 0.945, w: 5, h: 4 },
      { x: 0.72, y: 0.932, w: 10, h: 6 },
      { x: 0.84, y: 0.952, w: 6, h: 4 },
    ].forEach(p => {
      g.fillStyle(0xc09828, 1)
      g.fillEllipse(W * p.x, H * p.y, p.w, p.h)
    })

    // 岩
    ;[
      { x: 0.22, y: 0.936, w: 28, h: 16 },
      { x: 0.295, y: 0.930, w: 16, h: 10 },
      { x: 0.80, y: 0.934, w: 22, h: 13 },
    ].forEach(r => {
      g.fillStyle(C.ROCK, 1)
      g.lineStyle(2.5, C.OUTLINE, 1)
      g.fillEllipse(W * r.x, H * r.y, r.w, r.h)
      g.strokeEllipse(W * r.x, H * r.y, r.w, r.h)
    })
  }

  _cloud(g, cx, cy, sc) {
    const w = 80 * sc, h = 18 * sc
    g.fillStyle(0xffffff, 1)
    g.lineStyle(2.5, 0xc8e8f8, 1)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.fillCircle(cx - w * 0.2, cy - h * 0.75, h * 0.95)
    g.fillCircle(cx + w * 0.08, cy - h * 0.55, h * 0.75)
    g.fillCircle(cx + w * 0.34, cy - h * 0.38, h * 0.55)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PLAYER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /** プレイヤーを描画し、{ anchorX, anchorY, castRangePx, shaftDisplayPx } を返す */
  buildPlayer(W, H) {
    const scene = this.scene
    const g = scene.add.graphics().setDepth(40)
    const cx = W * 0.50
    const by = H * 0.84

    // 影
    g.fillStyle(0x000000, 0.10)
    g.fillEllipse(cx, by + 2, 38, 10)

    // 胴体
    g.fillStyle(C.PLAYER_BODY, 1)
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.fillRoundedRect(cx - 16, by - 22, 32, 22, 4)
    g.strokeRoundedRect(cx - 16, by - 22, 32, 22, 4)
    g.fillStyle(0xffffff, 0.22)
    g.fillRoundedRect(cx - 12, by - 19, 24, 3, 2)

    // 頭
    g.fillStyle(C.PLAYER_SKIN, 1)
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.fillEllipse(cx, by - 34, 28, 24)
    g.strokeEllipse(cx, by - 34, 28, 24)

    // 帽子 (つば)
    g.fillStyle(C.PLAYER_HAT, 1)
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.fillRoundedRect(cx - 19, by - 44, 38, 12, 4)
    g.strokeRoundedRect(cx - 19, by - 44, 38, 12, 4)
    // 帽子 (天)
    g.fillRoundedRect(cx - 13, by - 54, 26, 12, 5)
    g.strokeRoundedRect(cx - 13, by - 54, 26, 12, 5)
    g.fillStyle(0xffffff, 0.45)
    g.fillRoundedRect(cx - 10, by - 52, 8, 4, 2)

    // 目
    g.fillStyle(0x1a2a3a, 1)
    g.fillCircle(cx - 6, by - 35, 3)
    g.fillCircle(cx + 6, by - 35, 3)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(cx - 5, by - 36, 1)
    g.fillCircle(cx + 7, by - 36, 1)

    // 赤み
    g.fillStyle(0xff9090, 0.7)
    g.fillEllipse(cx - 9, by - 32, 7, 4)
    g.fillEllipse(cx + 9, by - 32, 7, 4)

    // 竿（腕から先端）
    const rodBase = { x: cx + 12, y: by - 12 }
    const rodTip  = { x: cx + 30, y: by - 54 }
    g.lineStyle(4, 0xe8c040, 1)
    g.lineBetween(rodBase.x, rodBase.y, rodTip.x, rodTip.y)
    g.lineStyle(1.5, 0x5a4000, 1)
    g.lineBetween(rodBase.x, rodBase.y, rodTip.x, rodTip.y)

    return {
      anchorX:        rodTip.x,
      anchorY:        rodTip.y,
      castRangePx:    H * 0.65,
      shaftDisplayPx: Math.min(H * 0.17, 120),
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FISH SHADOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  spawnFish(W, H) {
    this._fishDefs = [
      { t: 'common',   y: 0.30, dur: 8000,  delay: 0,    sc: 1.0,  rtl: false },
      { t: 'common',   y: 0.42, dur: 10000, delay: 1500, sc: 0.85, rtl: true },
      { t: 'common',   y: 0.58, dur: 9000,  delay: 3000, sc: 0.70, rtl: false },
      { t: 'uncommon', y: 0.28, dur: 7000,  delay: 2000, sc: 1.6,  rtl: false },
      { t: 'uncommon', y: 0.50, dur: 12000, delay: 4000, sc: 1.35, rtl: true },
      { t: 'rare',     y: 0.38, dur: 14000, delay: 4000, sc: 2.2,  rtl: false },
    ]
    this._fishGfx = []
    this._fishTweens = []

    this._fishDefs.forEach(fd => {
      const gfx = this.scene.add.graphics().setDepth(22)
      this._drawFish(gfx, fd.t, fd.sc)
      if (fd.rtl) gfx.setScale(-1, 1)
      this._fishGfx.push(gfx)
    })

    this.startFishTweens()
  }

  /** 全魚を開始座標へリセットし Tween を再生成する。キャストフェーズ開始ごとに呼ぶ。 */
  startFishTweens() {
    const { width: w, height: h } = this.scene.scale

    this._fishTweens.forEach(tw => { tw.stop(); tw.destroy() })
    this._fishTweens = []

    this._fishDefs.forEach((fd, i) => {
      const gfx = this._fishGfx[i]
      const sx = fd.rtl ? w + 80 : -80
      const ex = fd.rtl ? -80 : w + 80
      gfx.setPosition(sx, h * fd.y)

      const tw = this.scene.tweens.add({
        targets: gfx, x: ex,
        duration: fd.dur, delay: fd.delay,
        repeat: -1,
      })
      this._fishTweens.push(tw)
    })
  }

  _drawFish(g, type, sc) {
    const alpha = type === 'rare' ? 0.70 : type === 'uncommon' ? 0.55 : 0.45
    const shadowCol = 0x082030

    g.clear()

    if (type === 'rare') {
      g.fillStyle(0x6688aa, 0.18)
      g.fillEllipse(0, 0, 40 * sc, 22 * sc)
    }

    g.fillStyle(shadowCol, alpha)
    g.fillEllipse(0, 0, 24 * sc, 12 * sc)
    g.fillTriangle(12 * sc, 0, 17 * sc, -7 * sc, 17 * sc, 7 * sc)

    g.fillStyle(shadowCol, alpha * 0.8)
    g.fillTriangle(-2 * sc, -6 * sc, 4 * sc, -6 * sc, 1 * sc, -11 * sc)
  }

  /** 指定インデックスの魚を通常の泳ぎ開始位置にリセットして Tween を再生成する */
  resetFishToStart(index) {
    if (index == null || !this._fishDefs[index]) return
    const fd  = this._fishDefs[index]
    const gfx = this._fishGfx[index]
    const { width: w, height: h } = this.scene.scale
    const sx = fd.rtl ? w + 80 : -80
    const ex = fd.rtl ? -80 : w + 80

    gfx.setPosition(sx, h * fd.y)
    gfx.setScale(fd.rtl ? -1 : 1, 1)

    this._fishTweens[index]?.stop()
    this._fishTweens[index]?.destroy()
    this._fishTweens[index] = this.scene.tweens.add({
      targets: gfx, x: ex,
      duration: fd.dur, repeat: -1,
    })
  }

  destroy() {
    this._fishTweens.forEach(tw => { tw.stop(); tw.destroy() })
    this._fishTweens = []
  }
}
