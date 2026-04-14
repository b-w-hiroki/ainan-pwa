import Phaser from 'phaser'
import { DEFAULT_ROD, DEFAULT_BAIT } from '../game/params.js'
import { selectFish } from '../game/fish.js'
import { DEFAULT_ENV } from '../config/defaults.js'
import { computeCastAngle, oscillatePower, buildTrajectory, clampLanding } from '../game/cast.js'
import {
  BATTLE_TICK_MS,
  createBattleState,
  armFirstRage,
  tickBattle,
  tryEnterRage,
  tryExitRage,
  applySwipe,
  battleOutcome,
  dangerBand,
} from '../game/battle.js'

// ─── パレット（HTML プロトタイプに合わせた色） ───────────────────
const C = {
  OUTLINE: 0x1a2a3a,
  SKY_T: 0x87ceeb, SKY_B: 0xd8f4ff,
  SEA_T: 0x5ad8ff, SEA_B: 0x082848,
  GRASS_T: 0x78e040, GRASS_B: 0x50c030,
  SAND_T: 0xf0d878, SAND_B: 0xc0a040,
  ISLAND: 0x78d040,
  SUN: 0xffe844,
  ROCK: 0x585868,
  PLAYER_HAT: 0xe84040,
  PLAYER_SKIN: 0xffd0a0,
  PLAYER_BODY: 0x4060e0,
  FISH_C: 0x2288cc, FISH_CS: 0x1a5a8a,
  FISH_U: 0x22aa66, FISH_US: 0x156644,
  FISH_R: 0xcc44ff, FISH_RS: 0x8800cc,
}
const CS = '#1a2a3a'   // OUTLINE as string
const FONT = 'Nunito, "M PLUS Rounded 1c", system-ui, sans-serif'

export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }) }

  create(data = {}) {
    const { width: W, height: H } = this.scale

    // 環境パラメータ（Phase2 で MapScene からのデータで上書き）
    this.env = { ...DEFAULT_ENV, ...data }

    this.fish = selectFish(this.env)
    this.rod = DEFAULT_ROD
    this.bait = DEFAULT_BAIT

    // スコア・釣果（localStorage から復元、シーン再起動時は引き継ぐ）
    this.totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    /** @type {Array<{fishId: string, score: number, timestamp: number}>} */
    this.catches = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')

    /** @type {'cast'|'wait'|'battle'|'result'} */
    this.phase = 'cast'
    this.isCharging = false
    this.chargeStartedAt = 0
    this._castAngle = -45
    this._swipeBaseY = 0

    // ─── レイヤー描画 ────────────────────────────────────────────
    this._buildBackground(W, H)
    this._spawnFish(W, H)
    this._buildPlayer(W, H)

    // ─── 動的 Graphics ───────────────────────────────────────────
    this.lineGfx   = this.add.graphics().setDepth(30)
    this.castGfx   = this.add.graphics().setDepth(35)
    this.powerGfx  = this.add.graphics().setDepth(36)

    // ─── 浮き ────────────────────────────────────────────────────
    this.bobber = this._makeBobber(W, H)

    // ─── 危険フラッシュ ──────────────────────────────────────────
    this.dangerFx = this.add
      .rectangle(W / 2, H / 2, W, H, 0xff1e1e, 0)
      .setDepth(92)

    // ─── バトル UI ───────────────────────────────────────────────
    this._buildEscapeBar(W, H)
    this._buildBattlePanel(W, H)
    this._buildReelCTA(W, H)

    this.rageTag = this.add
      .text(W / 2, 50, '⚡ 暴れてる！', {
        fontFamily: FONT, fontSize: '11px', fontStyle: '900',
        color: CS, backgroundColor: '#ffee00',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5).setDepth(68).setVisible(false)

    // ─── ヒット表示 ──────────────────────────────────────────────
    this.hitHint = this.add
      .text(W / 2, H * 0.36, '🎣 タップ！', {
        fontFamily: FONT, fontSize: '30px', fontStyle: '900',
        color: '#ff6600', stroke: CS, strokeThickness: 5,
      })
      .setOrigin(0.5).setDepth(50).setVisible(false)

    // hitHint の基準Y座標を保持（Tween 再生成時のドリフト防止）
    this._hitHintBaseY = this.hitHint.y

    // Tween は各フェーズ開始時に生成し、終了時に破棄する（常時動作させない）
    /** @type {Phaser.Tweens.Tween | null} */
    this.hitHintTween = null
    /** @type {Phaser.Tweens.Tween | null} */
    this.resultEmojiTween = null

    // ─── ヒントテキスト ──────────────────────────────────────────
    this.hintText = this.add
      .text(W / 2, H * 0.19, '', {
        fontFamily: FONT, fontSize: '13px', fontStyle: '800',
        color: '#082848', backgroundColor: 'rgba(255,255,255,0.80)',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5).setDepth(55)

    // ─── スコアバー ──────────────────────────────────────────────
    this._buildScoreBar(W)

    // ─── 結果オーバーレイ ────────────────────────────────────────
    this._buildResultOverlay(W, H)

    // ─── パワーラベル ────────────────────────────────────────────
    this.powerLabel = this.add
      .text(W / 2, H * 0.74, 'CAST POWER', {
        fontFamily: FONT, fontSize: '11px', fontStyle: '900',
        color: CS, stroke: '#ffffff', strokeThickness: 3,
        letterSpacing: 2,
      })
      .setOrigin(0.5).setDepth(37).setVisible(false)

    // ─── ナビボタン（左下配置） ───────────────────────────────────
    const backBtn = this.add
      .text(16, H - 16, '← マップへ', {
        fontFamily: FONT, fontSize: '14px', fontStyle: '800',
        color: '#1a2a3a', backgroundColor: '#ffffff',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 1)
      .setDepth(200)
      .setStroke('#1a2a3a', 3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p) => {
        p.event.stopPropagation()
        this._cleanup()
        this.scene.start('MapScene')
      })
      .on('pointerover', () => backBtn.setStyle({ backgroundColor: '#d0f0ff' }))
      .on('pointerout',  () => backBtn.setStyle({ backgroundColor: '#ffffff' }))

    // ─── 入力 ────────────────────────────────────────────────────
    this.input.on('pointerdown', this._onDown, this)
    this.input.on('pointermove', this._onMove, this)
    this.input.on('pointerup',   this._onUp,   this)
    this.events.once('shutdown', this._cleanup, this)

    // 対処3: カメラのピクセルを整数に丸めてテキストのにじみを軽減
    this.cameras.main.setRoundPixels(true)

    // ブラウザ終了時にスコアを保存（クラッシュ対策）
    this._beforeUnloadHandler = () => this._saveProgress()
    window.addEventListener('beforeunload', this._beforeUnloadHandler)

    this._enterCast()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BACKGROUND
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildBackground(W, H) {
    const g = this.add.graphics().setDepth(0)

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
  // FISH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _spawnFish(W, H) {
    /** @type {Array<{t:string, y:number, dur:number, delay:number, sc:number, rtl:boolean}>} */
    this._fishDefs = [
      { t: 'common',   y: 0.30, dur: 8000,  delay: 0,    sc: 1.0,  rtl: false },
      { t: 'common',   y: 0.42, dur: 10000, delay: 1500, sc: 0.85, rtl: true },
      { t: 'common',   y: 0.58, dur: 9000,  delay: 3000, sc: 0.70, rtl: false },
      { t: 'uncommon', y: 0.28, dur: 7000,  delay: 2000, sc: 1.6,  rtl: false },
      { t: 'uncommon', y: 0.50, dur: 12000, delay: 4000, sc: 1.35, rtl: true },
      { t: 'rare',     y: 0.38, dur: 14000, delay: 4000, sc: 2.2,  rtl: false },
    ]
    /** @type {Phaser.GameObjects.Graphics[]} */
    this._fishGfx = []
    /** @type {Phaser.Tweens.Tween[]} */
    this._fishTweens = []

    this._fishDefs.forEach(fd => {
      const gfx = this.add.graphics().setDepth(22)
      this._drawFish(gfx, fd.t, fd.sc)
      if (fd.rtl) gfx.setScale(-1, 1)
      this._fishGfx.push(gfx)
    })

    this._startFishTweens()
  }

  /**
   * 全魚を開始座標へリセットし Tween を再生成する。
   * キャストフェーズ開始ごとに呼び出すことで毎回同じ位置から泳ぎ始める。
   */
  _startFishTweens() {
    const { width: w, height: h } = this.scale

    // 既存 Tween を破棄
    this._fishTweens.forEach(tw => { tw.stop(); tw.destroy() })
    this._fishTweens = []

    this._fishDefs.forEach((fd, i) => {
      const gfx = this._fishGfx[i]
      const sx = fd.rtl ? w + 80 : -80
      const ex = fd.rtl ? -80 : w + 80
      gfx.setPosition(sx, h * fd.y)

      const tw = this.tweens.add({
        targets: gfx, x: ex,
        duration: fd.dur, delay: fd.delay,
        repeat: -1,
      })
      this._fishTweens.push(tw)
    })
  }

  _drawFish(g, type, sc) {
    // 全魚種シルエット（水中の影）
    // rare だけ少し明るいグロー付き
    const alpha = type === 'rare' ? 0.70 : type === 'uncommon' ? 0.55 : 0.45
    const shadowCol = 0x082030

    g.clear()

    if (type === 'rare') {
      // 淡い光彩
      g.fillStyle(0x6688aa, 0.18)
      g.fillEllipse(0, 0, 40 * sc, 22 * sc)
    }

    g.fillStyle(shadowCol, alpha)
    g.fillEllipse(0, 0, 24 * sc, 12 * sc)
    g.fillTriangle(12 * sc, 0, 17 * sc, -7 * sc, 17 * sc, 7 * sc)

    // 背びれ（シルエットのアクセント）
    g.fillStyle(shadowCol, alpha * 0.8)
    g.fillTriangle(-2 * sc, -6 * sc, 4 * sc, -6 * sc, 1 * sc, -11 * sc)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PLAYER（HTML プロトの CSS スプライトを Graphics で再現）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildPlayer(W, H) {
    const g = this.add.graphics().setDepth(40)
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

    // 糸の始点 = ロッド先端 ＝ アンカー
    this.anchorX = rodTip.x
    this.anchorY = rodTip.y
    // 飛距離スケール（画面高さ × 0.65）& 矢印シャフト表示用の短い長さ
    this.castRangePx = H * 0.65
    this.shaftDisplayPx = Math.min(H * 0.17, 120)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BOBBER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _makeBobber(W, H) {
    const g = this.add.graphics().setDepth(30).setVisible(false)
    // 白い上半分
    g.fillStyle(0xffffff, 1)
    g.fillCircle(0, -3, 9)
    // 赤い下半分
    g.fillStyle(0xff2222, 1)
    g.fillCircle(0, 3, 9)
    // 縁
    g.lineStyle(2.5, C.OUTLINE, 1)
    g.strokeCircle(0, 0, 9)
    // 上の軸
    g.lineStyle(2, 0xffffff, 0.8)
    g.lineBetween(0, -9, 0, -18)
    return g
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCORE BAR
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildScoreBar(W) {
    this.scoreBar = this.add.container(W / 2, 0).setDepth(70)

    // 戻り値に値テキストの参照を含める
    const chip = (offsetX, icon, val, lbl) => {
      const bg = this.add.graphics()
      bg.fillStyle(0xffffff, 1)
      bg.lineStyle(2.5, C.OUTLINE, 1)
      bg.fillRoundedRect(offsetX - 44, 6, 88, 28, 14)
      bg.strokeRoundedRect(offsetX - 44, 6, 88, 28, 14)
      const i = this.add.text(offsetX - 16, 20, icon, { fontSize: '12px' }).setOrigin(0.5)
      const v = this.add.text(offsetX + 4, 20, val, {
        fontFamily: FONT, fontSize: '12px', fontStyle: '900', color: '#e07800',
      }).setOrigin(0, 0.5)
      const l = this.add.text(offsetX + 4, 30, lbl, {
        fontFamily: FONT, fontSize: '7px', fontStyle: '700', color: '#4a7090',
      }).setOrigin(0, 0.5)
      return { els: [bg, i, v, l], valText: v }
    }

    const sc = chip(-100, '🏆', String(this.totalScore), 'SCORE')
    const ca = chip(0, '🐟', `${this.catches.length}/20`, 'CATCH')
    const ti = chip(100, '⏱', '00:00', 'TIME')

    this.scoreValText = sc.valText   // 累積スコア表示用
    this.catchValText = ca.valText   // 釣果カウント表示用

    this.scoreBar.add([...sc.els, ...ca.els, ...ti.els])
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ESCAPE BAR（バトル中 画面最上部）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildEscapeBar(W) {
    this.escapeBar = this.add.container(0, 0).setDepth(65).setVisible(false)

    const bg = this.add.graphics()
    bg.fillGradientStyle(0xff283c, 0xff283c, 0xc81428, 0xc81428, 0.95)
    bg.fillRect(0, 0, W, 72)
    bg.lineStyle(4, C.OUTLINE, 1)
    bg.strokeRect(2, 2, W - 4, 68)

    const title = this.add.text(14, 18, '逃走ゲージ', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '900',
      color: '#ffffff', stroke: CS, strokeThickness: 3,
    }).setOrigin(0, 0.5)

    this.ebarFill = this.add.graphics()
    this.ebarNum  = this.add.text(W - 12, 18, '0', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900',
      color: '#ffffff', stroke: CS, strokeThickness: 3,
    }).setOrigin(1, 0.5)

    this.escapeBar.add([bg, title, this.ebarFill, this.ebarNum])
    this._ebarW = W - 28  // track幅
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BATTLE PANEL（巻き取りゲージ、画面下部）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildBattlePanel(W, H) {
    this.battlePanel = this.add.container(0, 0).setDepth(60).setVisible(false)

    const panW = Math.min(340, W * 0.9)
    const px   = (W - panW) / 2
    const py   = H * 0.79

    const bg = this.add.graphics()
    bg.fillStyle(0xffffff, 0.92)
    bg.lineStyle(3, C.OUTLINE, 1)
    bg.fillRoundedRect(px, py, panW, 60, 16)
    bg.strokeRoundedRect(px, py, panW, 60, 16)

    const lbl = this.add.text(px + 14, py + 14, '🌀 巻き取り', {
      fontFamily: FONT, fontSize: '11px', fontStyle: '800', color: '#4a7090',
    })

    this.reelFill    = this.add.graphics()
    this.reelValText = this.add.text(px + panW - 12, py + 30, '0', {
      fontFamily: FONT, fontSize: '11px', fontStyle: '800', color: '#1a3a5a',
    }).setOrigin(1, 0.5)

    this.battlePanel.add([bg, lbl, this.reelFill, this.reelValText])

    this._reel = { x: px + 76, y: py + 22, w: panW - 96, h: 18 }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REEL CTA（「釣り上げろ！」）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildReelCTA(W, H) {
    this.reelCTA = this.add.container(W / 2, H * 0.69).setDepth(67).setVisible(false)

    const t1 = this.add.text(0, -28, '釣り上げろ！', {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900',
      color: '#ff6600', stroke: CS, strokeThickness: 5,
    }).setOrigin(0.5)

    const t2 = this.add.text(0, 10, '👇', { fontSize: '26px' }).setOrigin(0.5)

    const t3 = this.add.text(0, 40, '下にスワイプ！', {
      fontFamily: FONT, fontSize: '12px', fontStyle: '800',
      color: CS, backgroundColor: '#ffee00',
      padding: { x: 10, y: 3 },
    }).setOrigin(0.5)

    this.reelCTA.add([t1, t2, t3])

    this.tweens.add({ targets: t1, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    this.tweens.add({ targets: t2, y: '+=8', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESULT OVERLAY（キャッチ／逃げた）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _buildResultOverlay(W, H) {
    this.resultOverlay = this.add
      .container(W / 2, H * 0.42)
      .setDepth(120)
      .setVisible(false)

    const card = this.add.graphics()
    card.fillStyle(0xffffff, 1)
    card.lineStyle(4, C.OUTLINE, 1)
    card.fillRoundedRect(-150, -100, 300, 200, 18)
    card.strokeRoundedRect(-150, -100, 300, 200, 18)

    this.resLabel = this.add.text(0, -72, '', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ff6600',
    }).setOrigin(0.5)

    this.resEmoji = this.add.text(0, -28, '', { fontSize: '52px' }).setOrigin(0.5)

    this.resName = this.add.text(0, 30, '', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#1a3a5a',
    }).setOrigin(0.5)

    this.resPts = this.add.text(0, 62, '', {
      fontFamily: FONT, fontSize: '14px', fontStyle: '800', color: '#00aa44',
    }).setOrigin(0.5)

    this.resHint = this.add.text(0, 84, 'タップで続ける', {
      fontFamily: FONT, fontSize: '11px', fontStyle: '700', color: '#4a7090',
    }).setOrigin(0.5)

    this.resultOverlay.add([card, this.resLabel, this.resEmoji, this.resName, this.resPts, this.resHint])
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _enterCast() {
    this._cleanupBattle()
    this.phase = 'cast'
    this.isCharging = false

    this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
    this.resultEmojiTween?.stop(); this.resultEmojiTween?.destroy(); this.resultEmojiTween = null

    this.escapeBar.setVisible(false)
    this.battlePanel.setVisible(false)
    this.reelCTA.setVisible(false)
    this.rageTag.setVisible(false)
    this.hitHint.setVisible(false)
    this.resultOverlay.setVisible(false)
    this.dangerFx.setFillStyle(0xff1e1e, 0)
    this.bobber.setVisible(false)
    this.lineGfx.clear()
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)
    this.scoreBar.setY(0)
    this.hintText.setText('画面を長押し → 方向を狙って離す')

    // 魚を開始位置にリセットして Tween を再生成
    if (this._fishDefs) this._startFishTweens()
  }

  _enterWait(landX, landY) {
    this.phase = 'wait'
    this.waitTapActive = false
    this._killWaitTimers()
    this.bobber.setPosition(landX, landY).setVisible(true)
    this._bobberBaseY = landY    // 浮きの基準Y（ドリフト防止・_onMiss でのリセット用）
    this.hitHint.setVisible(false)
    this.hintText.setText('食いつき待ち…（ちょんちょん中はタップ無効）')

    // 少し落ち着いてから「ちょんちょんぐんっ！」シーケンス開始
    this._wt1 = this.time.delayedCall(600, () => {
      if (this.phase !== 'wait') return
      this._startBobberBiteSequence()
    })
  }

  // ─── ちょん → ちょん → ぐんっ！ の3段階バイトシーケンス ──────
  _startBobberBiteSequence() {
    if (this.phase !== 'wait') return
    const baseY = this._bobberBaseY

    // ちょん①（小さく沈む）
    this._chonTween = this.tweens.add({
      targets: this.bobber, y: baseY + 8,
      duration: 200, ease: 'Sine.easeOut', yoyo: true,
      onComplete: () => {
        if (this.phase !== 'wait') return
        this.bobber.setY(baseY)
        const wait1 = Phaser.Math.Between(800, 1200)
        this._biteSeqTimer1 = this.time.delayedCall(wait1, () => {
          if (this.phase !== 'wait') return

          // ちょん②（少し深く沈む）
          this._chonTween = this.tweens.add({
            targets: this.bobber, y: baseY + 12,
            duration: 200, ease: 'Sine.easeOut', yoyo: true,
            onComplete: () => {
              if (this.phase !== 'wait') return
              this.bobber.setY(baseY)
              const wait2 = Phaser.Math.Between(600, 1000)
              this._biteSeqTimer2 = this.time.delayedCall(wait2, () => {
                if (this.phase !== 'wait') return

                // ぐんっ！（完全食いつき ＝ ヒット受付開始）
                this._chonTween = this.tweens.add({
                  targets: this.bobber, y: baseY + 30,
                  duration: 150, ease: 'Quad.easeIn',
                  onComplete: () => {
                    if (this.phase !== 'wait') return
                    this._showSplashEffect(this.bobber.x, this.bobber.y)
                    if (navigator.vibrate) navigator.vibrate(80)
                    this._openHitWindow()
                  },
                })
              })
            },
          })
        })
      },
    })
  }

  // 水しぶきエフェクト（円を広げてフェードアウト）
  _showSplashEffect(x, y) {
    const splash = this.add.circle(x, y, 4, 0xffffff, 0.8).setDepth(45)
    this.tweens.add({
      targets: splash, scaleX: 5, scaleY: 2.5, alpha: 0,
      duration: 300, ease: 'Sine.easeOut',
      onComplete: () => splash.destroy(),
    })
  }

  _openHitWindow() {
    if (this.phase !== 'wait') return
    // ヒット時に釣れる魚を env に基づいて決定する
    this.fish = selectFish(this.env)
    this.waitTapActive = true
    this.hitHint.setVisible(true)
    this.hintText.setText('今！タップでヒット')

    this.hitHint.setY(this._hitHintBaseY)  // ドリフト防止：毎回基準点に戻す
    this.hitHintTween?.destroy()
    this.hitHintTween = this.tweens.add({
      targets: this.hitHint, y: this._hitHintBaseY - 8,
      duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })

    // 1200ms 以内にタップなし → 逃げた
    this._wt2 = this.time.delayedCall(1200, () => {
      if (this.phase !== 'wait' || !this.waitTapActive) return
      this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
      this.waitTapActive = false
      this.hitHint.setVisible(false)
      this._onMiss()
    })
  }

  // タイムアウト・空振り共通の「逃げた」処理
  _onMiss() {
    this._toast('タイミングを逃した…')
    // 浮きを基準位置に戻す（Bounce でぷかぷか感を出す）
    this.tweens.add({
      targets: this.bobber, y: this._bobberBaseY,
      duration: 400, ease: 'Bounce.easeOut',
    })
    this.time.delayedCall(600, () => {
      if (this.phase === 'wait') this._enterCast()
    })
  }

  _enterBattle() {
    this.phase = 'battle'
    this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
    this.hitHint.setVisible(false)
    this.hintText.setText('')
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)
    this.scoreBar.setY(72)

    this.battleState = createBattleState(this.fish, this.rod)
    armFirstRage(this.battleState, this.fish, this.time.now)

    this.escapeBar.setVisible(true)
    this.battlePanel.setVisible(true)
    this._syncBattleUI()

    this._battleTimer = this.time.addEvent({
      delay: BATTLE_TICK_MS, loop: true,
      callback: () => {
        if (this.phase !== 'battle') return
        tickBattle(this.battleState, this.fish)
        this._syncBattleUI()
        const out = battleOutcome(this.battleState)
        if (out) this._finishBattle(out)
      },
    })
  }

  /**
   * スコア計算
   * @param {typeof import('../game/fish.js').SAMPLE_FISH[0]} fish
   * @param {number} sizeMultiplier
   */
  calcScore(fish, sizeMultiplier = 1.0) {
    const RARITY_MULT = { common: 1.0, uncommon: 1.5, rare: 2.5, legendary: 5.0 }
    return Math.round(fish.scoreBase * sizeMultiplier * (RARITY_MULT[fish.rarity] ?? 1.0))
  }

  _finishBattle(outcome) {
    this._cleanupBattle()
    this.phase = 'result'
    this.escapeBar.setVisible(false)
    this.battlePanel.setVisible(false)
    this.reelCTA.setVisible(false)
    this.rageTag.setVisible(false)
    this.dangerFx.setFillStyle(0xff0000, 0)
    this.hintText.setText('')
    this.scoreBar.setY(0)

    if (outcome === 'caught') {
      const score = this.calcScore(this.fish)

      // 累積
      this.totalScore += score
      this.catches.push({ fishId: this.fish.id, score, timestamp: Date.now() })

      // 表示更新
      this.scoreValText?.setText(String(this.totalScore))
      this.catchValText?.setText(`${this.catches.length}/20`)

      this._saveProgress()

      this.resLabel.setText('✦ CATCH ✦')
      this.resEmoji.setText(this.fish.emoji).setAngle(0)
      this.resName.setText(this.fish.name)
      this.resPts.setText(`+${score} pts 🎉`)
      this.resHint.setText('タップで続ける')

      this.resultEmojiTween?.destroy()
      this.resultEmojiTween = this.tweens.add({
        targets: this.resEmoji, angle: 8,
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      })
    } else {
      this.resLabel.setText('')
      this.resEmoji.setText('💨').setAngle(0)
      this.resName.setText('逃げられた…')
      this.resPts.setText('')
      this.resHint.setText('タップで再挑戦')
      this.cameras.main.flash(400, 255, 0, 0)
    }
    this.resultOverlay.setVisible(true)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BATTLE UI SYNC
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _syncBattleUI() {
    const st = this.battleState
    if (!st) return
    const { width: W } = this.scale
    const tw = this._ebarW

    // 逃走バー
    this.ebarFill.clear()
    this.ebarFill.fillGradientStyle(0x88ff44, 0x88ff44, 0xff0000, 0xff0000, 1)
    this.ebarFill.fillRoundedRect(14, 38, tw * (st.escape / 100), 22, 10)
    // 70% 危険マーク
    this.ebarFill.fillStyle(0xffffff, 0.45)
    this.ebarFill.fillRect(14 + tw * 0.70, 36, 3, 26)
    this.ebarNum.setText(String(Math.round(st.escape)))

    // 巻き取りバー
    const rw = Math.max(4, this._reel.w * (st.reel / 100))
    this.reelFill.clear()
    this.reelFill.fillStyle(0x0088dd, 1)
    this.reelFill.lineStyle(2.5, C.OUTLINE, 1)
    this.reelFill.fillRoundedRect(this._reel.x, this._reel.y, rw, this._reel.h, 8)
    this.reelFill.strokeRoundedRect(this._reel.x, this._reel.y, this._reel.w, this._reel.h, 8)
    // 光沢
    this.reelFill.fillStyle(0xffffff, 0.3)
    this.reelFill.fillRoundedRect(this._reel.x + 4, this._reel.y + 2, Math.max(0, rw - 8), 4, 3)
    this.reelValText.setText(String(Math.round(st.reel)))

    this.rageTag.setVisible(st.isRaging)
    this.reelCTA.setVisible(!st.isRaging)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAST DRAWING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _drawCastPreview(angleDeg, power01) {
    const pts = buildTrajectory(this.anchorX, this.anchorY, angleDeg, power01, this.castRangePx)
    const rad  = (angleDeg * Math.PI) / 180
    // シャフト表示は近距離（pts[0]→pts[7] の方向に shaftDisplayPx だけ伸ばす）
    const tip  = {
      x: this.anchorX + Math.sin(rad) * this.shaftDisplayPx,
      y: this.anchorY - Math.cos(rad) * this.shaftDisplayPx,
    }

    this.castGfx.clear()

    // 矢印シャフト（太い黄金色）
    this.castGfx.lineStyle(20, 0xff5500, 1)
    this.castGfx.lineBetween(this.anchorX, this.anchorY, tip.x, tip.y)
    this.castGfx.lineStyle(3, C.OUTLINE, 1)
    this.castGfx.lineBetween(this.anchorX, this.anchorY, tip.x, tip.y)

    // 矢尻（シャフト先端から少し先）
    const headTip = {
      x: this.anchorX + Math.sin(rad) * (this.shaftDisplayPx + 14),
      y: this.anchorY - Math.cos(rad) * (this.shaftDisplayPx + 14),
    }
    const perpX   = -Math.sin(rad) * 12
    const perpY   =  Math.cos(rad) * 12
    this.castGfx.fillStyle(0xffcc00, 1)
    this.castGfx.lineStyle(3, C.OUTLINE, 1)
    this.castGfx.fillTriangle(
      headTip.x + Math.sin(rad) * 16, headTip.y - Math.cos(rad) * 16,
      headTip.x + perpX, headTip.y + perpY,
      headTip.x - perpX, headTip.y - perpY,
    )

    // 軌跡ドット
    for (let i = 14; i < pts.length; i += 5) {
      const p = pts[i]
      const r = Math.max(2, 6 - Math.floor((i - 14) / 7))
      this.castGfx.fillStyle(0xffee00, 1)
      this.castGfx.lineStyle(2, 0xcc8800, 1)
      this.castGfx.fillCircle(p.x, p.y, r)
      this.castGfx.strokeCircle(p.x, p.y, r)
    }
  }

  _drawPowerBar(power01) {
    const { width: W, height: H } = this.scale
    const bx = W / 2 - 95
    const by = H * 0.77

    this.powerGfx.clear()
    // トラック
    this.powerGfx.fillStyle(0xffffff, 0.45)
    this.powerGfx.lineStyle(3, C.OUTLINE, 1)
    this.powerGfx.fillRoundedRect(bx, by, 190, 24, 12)
    this.powerGfx.strokeRoundedRect(bx, by, 190, 24, 12)
    // 塗り（緑→黄→赤のグラデーション）
    const fw = 184 * power01
    const g1 = fw * 0.55, g2 = fw * 0.80
    if (fw > 0) {
      this.powerGfx.fillStyle(0x44ff66, 1)
      this.powerGfx.fillRoundedRect(bx + 3, by + 3, g1, 18, 9)
    }
    if (fw > g1) {
      this.powerGfx.fillStyle(0xffee00, 1)
      this.powerGfx.fillRect(bx + 3 + g1, by + 3, g2 - g1, 18)
    }
    if (fw > g2) {
      this.powerGfx.fillStyle(0xff3300, 1)
      this.powerGfx.fillRoundedRect(bx + 3 + g2, by + 3, fw - g2, 18, 0)
    }

    this.powerLabel.setVisible(true)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAST EXECUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _fireCast(angleDeg, power01) {
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)

    const { width: W, height: H } = this.scale
    const MARGIN = 40
    // 海エリア：上端 22%、下端（砂浜上端）84%
    const SEA_TOP    = H * 0.22
    const SEA_BOTTOM = H * 0.84

    const pts = buildTrajectory(this.anchorX, this.anchorY, angleDeg, power01, this.castRangePx)
    clampLanding(pts, {
      minX: MARGIN,
      maxX: W - MARGIN,
      minY: SEA_TOP    + MARGIN,
      maxY: SEA_BOTTOM - MARGIN,
    })

    this.bobber.setPosition(this.anchorX, this.anchorY).setVisible(true)

    const path = { u: 0 }
    this.tweens.add({
      targets: path, u: pts.length - 1, duration: 700, ease: 'Quad.out',
      onUpdate: () => {
        const i = Math.min(Math.floor(path.u), pts.length - 2)
        const f = path.u - i
        const a = pts[i], b = pts[i + 1]
        const x = a.x + (b.x - a.x) * f
        const y = a.y + (b.y - a.y) * f
        this.bobber.setPosition(x, y)
        this.lineGfx.clear()
        this.lineGfx.lineStyle(2, 0xffffff, 0.75)
        this.lineGfx.lineBetween(this.anchorX, this.anchorY, x, y)
      },
      onComplete: () => {
        const end = pts[pts.length - 1]
        this.lineGfx.clear()
        this._enterWait(end.x, end.y)
      },
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // UPDATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  update() {
    if (this.phase === 'cast' && this.isCharging) {
      const p = oscillatePower(this.time.now - this.chargeStartedAt)
      this._drawCastPreview(this._castAngle, p)
      this._drawPowerBar(p)
    }

    if (this.phase === 'battle' && this.battleState) {
      const now = this.time.now
      const ch1 = tryExitRage(this.battleState, this.fish, now)
      const ch2 = tryEnterRage(this.battleState, this.fish, now)
      if (ch1 || ch2) this._syncBattleUI()

      const st   = this.battleState
      const band = dangerBand(st.escape)
      if (band === 'flash') {
        this.dangerFx.setFillStyle(0xff1e1e, 0.12 + Math.sin(now * 0.006) * 0.10)
      } else if (band === 'critical') {
        this.dangerFx.setFillStyle(0xff0000, 0.28 + Math.sin(now * 0.022) * 0.18)
      } else {
        this.dangerFx.setFillStyle(0xff1e1e, st.isRaging ? 0.06 : 0)
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INPUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _onDown(pointer) {
    if (pointer.y < 50 && pointer.x < 130) return   // ナビ領域を除外

    if (this.phase === 'result') {
      this.resultOverlay.setVisible(false)
      this._enterCast()
      return
    }

    if (this.phase === 'wait' && this.waitTapActive) {
      const prob = Math.min(1, this.fish.biteRate + this.bait.biteRateBonus)
      if (Math.random() > prob) {
        // ヒット判定は通ったがbiteRateで空振り
        this.waitTapActive = false
        this.hitHint.setVisible(false)
        this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
        this._wt2?.remove(false); this._wt2 = undefined
        this._toast('空振り！')
        this._onMiss()
        return
      }
      this._killWaitTimers()
      this._enterBattle()
      return
    }

    if (this.phase === 'cast') {
      if (!this.isCharging) {
        this.isCharging = true
        this.chargeStartedAt = this.time.now
      }
      this._castAngle = computeCastAngle(this.anchorX, this.anchorY, pointer.x, pointer.y)
    }

    if (this.phase === 'battle') {
      this._swipeBaseY = pointer.y
    }
  }

  _onMove(pointer) {
    if (!pointer.isDown) return

    if (this.phase === 'cast' && this.isCharging) {
      this._castAngle = computeCastAngle(this.anchorX, this.anchorY, pointer.x, pointer.y)
    }

    if (this.phase === 'battle') {
      const dy = pointer.y - this._swipeBaseY
      if (dy > 28) {
        applySwipe(this.battleState, this.battleState.isRaging)
        this._swipeBaseY = pointer.y
        this._syncBattleUI()
        const out = battleOutcome(this.battleState)
        if (out) this._finishBattle(out)
      }
    }
  }

  _onUp() {
    if (this.phase !== 'cast' || !this.isCharging) return
    this.isCharging = false
    const power = oscillatePower(this.time.now - this.chargeStartedAt)
    this._fireCast(this._castAngle, power)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _toast(msg) {
    const { width: W, height: H } = this.scale
    const t = this.add.text(W / 2, H * 0.38, msg, {
      fontFamily: FONT, fontSize: '20px', fontStyle: '900',
      color: '#ffffff', stroke: CS, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100)
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, duration: 700, onComplete: () => t.destroy() })
  }

  _cleanupBattle() {
    this._battleTimer?.remove(false)
    this._battleTimer = undefined
  }

  _killWaitTimers() {
    this._wt1?.remove(false)
    this._wt2?.remove(false)
    this._biteSeqTimer1?.remove(false)
    this._biteSeqTimer2?.remove(false)
    this._chonTween?.stop(); this._chonTween?.destroy()
    this.waitTapActive = false
    this._wt1 = this._wt2 = this._biteSeqTimer1 = this._biteSeqTimer2 = undefined
    this._chonTween = undefined
  }

  _saveProgress() {
    localStorage.setItem('ainan_score',   String(this.totalScore))
    localStorage.setItem('ainan_catches', JSON.stringify(this.catches))
  }

  _cleanup() {
    this._cleanupBattle()
    this._killWaitTimers()
    this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
    this.resultEmojiTween?.stop(); this.resultEmojiTween?.destroy(); this.resultEmojiTween = null
    this._fishTweens?.forEach(tw => { tw.stop(); tw.destroy() })
    this._fishTweens = []
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }
  }
}
