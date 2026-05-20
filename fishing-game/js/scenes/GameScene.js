import Phaser from 'phaser'
import { FONT } from '../config/fontStyles.js'
import { CS } from '../config/palette.js'
import { DEFAULT_ROD, DEFAULT_BAIT, ROD_STATS, BAIT_STATS } from '../game/params.js'
import { TackleUI } from './components/TackleUI.js'
import { selectFish } from '../game/fish.js'
import { buildBiteConfig, randomWaitMs, calcAttractRadius, isInAttractRange } from '../game/bite.js'
import { getDefaultEnv } from '../config/defaults.js'
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
  getRageDuration,
} from '../game/battle.js'
import { BackgroundManager } from './components/BackgroundManager.js'
import { BobberManager } from './components/BobberManager.js'
import { CastUI } from './components/CastUI.js'
import { BattleUI } from './components/BattleUI.js'
import { ResultUI } from './components/ResultUI.js'
import { getEquipment, getInventory, getRankBonuses, getTownBonuses, markLicenseFlag, saveInventory } from '../game/progress.js'
const TEXT_RES = window.devicePixelRatio ?? 1

const RARITY_SIZE = {
  common: [18, 34],
  uncommon: [35, 68],
  rare: [45, 82],
  legendary: [80, 135],
}

export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }) }

  create(data = {}) {
    const { width: W, height: H } = this.scale

    // 環境パラメータ（Phase2 で MapScene からのデータで上書き）
    this.env = {
      ...getDefaultEnv(),
      ...data,
      player: {
        ...getEquipment(),
        skillLevel: getRankBonuses().skillLevel,
        inventory: getInventory(),
        ...data.player,
      },
    }

    this.fish = selectFish(this.env)
    this.rod  = DEFAULT_ROD
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
    this.bg = new BackgroundManager(this)
    this.bg.buildBackground(W, H, this.env.point)
    this.bg.spawnFish(W, H)
    this._buildFishSchoolChance(W, H)
    const anchor         = this.bg.buildPlayer(W, H)
    this.anchorX         = anchor.anchorX
    this.anchorY         = anchor.anchorY
    this.baseCastRangePx = anchor.castRangePx
    this.castRangePx     = anchor.castRangePx
    this.shaftDisplayPx  = anchor.shaftDisplayPx

    // ─── 動的 Graphics ───────────────────────────────────────────
    this.lineGfx   = this.add.graphics().setDepth(30)
    this.castGfx   = this.add.graphics().setDepth(35)
    this.powerGfx  = this.add.graphics().setDepth(36)
    this.castUI    = new CastUI(this)

    // ─── 浮き ────────────────────────────────────────────────────
    this.bobberMgr = new BobberManager(this)
    this.bobber = this.bobberMgr.create(W, H)

    // ─── 危険フラッシュ ──────────────────────────────────────────
    this.dangerFx = this.add
      .rectangle(W / 2, H / 2, W, H, 0xff1e1e, 0)
      .setDepth(92)

    // ─── バトル UI ───────────────────────────────────────────────
    this.battleUI = new BattleUI(this)
    this.battleUI.buildEscapeBar(W)
    this.battleUI.buildBattlePanel(W, H)
    this.battleUI.buildReelCTA(W, H)

    // ─── ヒット表示・暴れタグ ────────────────────────────────────
    this.battleUI.buildHitHUD(W, H)

    /** @type {Phaser.Tweens.Tween | null} */
    this.hitHintTween = null
    /** @type {Phaser.Tweens.Tween | null} */
    this.resultEmojiTween = null

    // ─── キャストHUD（hintText・powerLabel）────────────────────────
    this.castUI.buildHUD(W, H)

    // ─── スコアバー ──────────────────────────────────────────────
    this.battleUI.buildScoreBar(this.totalScore)
    this._buildLocationBadge(W)

    // ─── 結果オーバーレイ ────────────────────────────────────────
    this.resultUI = new ResultUI(this)
    this.resultUI.buildResultOverlay(W, H)

    // ─── ナビボタン ──────────────────────────────────────────────
    this.resultUI.buildBackBtn(W, H)

    // ─── 竿・エサ切り替えUI ─────────────────────────────────────
    this.tackleUI = new TackleUI(this)
    this.tackleUI.build(W, H)
    markLicenseFlag('ainan_touched_tackle')

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

  _buildFishSchoolChance(W, H) {
    this.schoolFx = this.add.container(W - 76, H * 0.245).setDepth(48)
    const g = this.add.graphics()
    g.fillStyle(0xffffff, 0.88)
    g.lineStyle(2, 0x1a2a3a, 0.35)
    g.fillRoundedRect(-56, -18, 112, 36, 15)
    g.strokeRoundedRect(-56, -18, 112, 36, 15)
    const txt = this.add.text(0, 0, '魚群チャンス', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontWeight: '900',
      color: '#e07800',
    }).setOrigin(0.5)
    this.schoolFx.add([g, txt])
    this.schoolFx.setAlpha(0)
    this.tweens.add({
      targets: this.schoolFx,
      alpha: 1,
      y: H * 0.235,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  _buildLocationBadge(W) {
    const pointName = {
      pointA: '汐風港',
      pointB: '蒼海湾',
      pointC: '黒潮崎',
    }[this.env.point] ?? '釣り場'

    const g = this.add.graphics().setDepth(54)
    g.fillStyle(0xffffff, 0.92)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.fillRoundedRect(14, 16, 112, 38, 12)
    g.strokeRoundedRect(14, 16, 112, 38, 12)
    g.fillStyle(0xffd900, 1)
    g.fillCircle(32, 35, 8)

    this.add.text(46, 35, pointName, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontWeight: '900',
      color: '#1a3a5a',
    }).setOrigin(0, 0.5).setDepth(55)
  }





  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _enterCast() {
    this._cleanupBattle()
    this.phase = 'cast'
    this.isCharging = false
    this._syncTackle()
    this.tackleUI?.enable()

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
    this.scoreBar.setY(16)
    this.hintText.setText('画面を長押し → 方向を狙って離す')

    // 魚を開始位置にリセットして Tween を再生成
    this._targetFishIndex = null
    this._targetFishGfx   = null
    this.bg?.startFishTweens()
  }

  _enterWait(landX, landY) {
    this.phase = 'wait'
    this.waitTapActive = false
    this.tackleUI?.disable()
    this._killWaitTimers()
    this.bobber.setPosition(landX, landY).setVisible(true)
    this._bobberBaseY = landY    // 浮きの基準Y（ドリフト防止・_onMiss でのリセット用）
    this.hitHint.setVisible(false)
    this.hintText.setText('食いつき待ち…')

    // 魚種をここで決定（魚影の種類と無関係に env 基準で選ぶ）
    this.fish = selectFish(this.env)

    // 着水後少し間を置いてから魚影が近づいてくる
    this._wt1 = this.time.delayedCall(400, () => {
      if (this.phase !== 'wait') return
      this._startFishApproach(landX, landY)
    })
  }

  // ─── 魚影を浮きへ近づかせる ────────────────────────────────────
  _startFishApproach(bobberX, bobberY) {
    if (!this.bg._fishGfx?.length) {
      this._scheduleNoFishMessage()
      return
    }

    // 誘引範囲内の魚影だけを候補に絞る
    const radius = calcAttractRadius({
      baitType:   this.bait.id,
      rodType:    this.rod.id,
      skillLevel: this.env?.player?.skillLevel ?? 1,
    }) * getTownBonuses().attractRadiusMod
    const candidates = this.bg._fishGfx
      .map((gfx, i) => ({ gfx, i }))
      .filter(({ gfx }) => isInAttractRange(gfx, { x: bobberX, y: bobberY }, radius))

    if (candidates.length === 0) {
      this._scheduleNoFishMessage()
      return
    }

    const chosen = Phaser.Utils.Array.GetRandom(candidates)
    this._targetFishIndex = chosen.i
    const gfx = chosen.gfx
    this._targetFishGfx = gfx

    // 通常泳ぎTweenを止める
    this.bg._fishTweens[this._targetFishIndex]?.stop()

    // 浮きの方向に向きを合わせる（rtl魚はもともと左向き描画なので逆転）
    const fd = this.bg._fishDefs[this._targetFishIndex]
    const goingRight = bobberX > gfx.x
    gfx.setScale(fd.rtl ? (goingRight ? -1 : 1) : (goingRight ? 1 : -1), 1)

    const dist = Phaser.Math.Distance.Between(gfx.x, gfx.y, bobberX, bobberY)
    const duration = Phaser.Math.Clamp(dist / 80 * 1000, 2000, 4000)

    this._approachTween = this.tweens.add({
      targets: gfx,
      x: bobberX,
      y: bobberY + 20,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.phase !== 'wait') return
        this._startBobberBiteSequence()
      },
    })
  }

  // ─── 魚影を通常の泳ぎ位置にリセット ──────────────────────────
  _resetFishToStart(index) {
    this.bg?.resetFishToStart(index)
  }

  // ─── 誘引範囲内に魚がいない時のメッセージ ────────────────────
  _scheduleNoFishMessage() {
    const t = this.time.delayedCall(2000, () => {
      if (this.phase !== 'wait') return
      const { width: W, height: H } = this.scale
      const msg = this.add.text(W / 2, H * 0.45, '魚がいない…　タップで引き上げ', {
        fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '700',
        color: '#4a7090', backgroundColor: 'rgba(255,255,255,0.85)',
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setDepth(60).setAlpha(0)
      this.tweens.add({ targets: msg, alpha: 1, duration: 400 })
      this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: msg, alpha: 0, duration: 400, onComplete: () => msg.destroy() })
      })
    })
    this._biteTimers.push(t)
  }

  // ─── ちょん×N → ぐんっ！ の動的バイトシーケンス ───────────────
  _startBobberBiteSequence() {
    if (this.phase !== 'wait') return
    this._biteConfig = buildBiteConfig(this.fish)
    this._biteTimers = []
    this._startChonSequence(0)
  }

  // ちょんを index 番目から再帰的に実行
  _startChonSequence(index) {
    if (this.phase !== 'wait') return
    const cfg = this._biteConfig

    // 全ちょんが終わったら → ぐんっ！へ
    if (index >= cfg.chonCount) {
      const t = this.time.delayedCall(randomWaitMs(cfg), () => {
        if (this.phase !== 'wait') return
        this._startGoon()
      })
      this._biteTimers.push(t)
      return
    }

    // このちょんの沈み量（回数を重ねるごとに深くなる）
    const depth = Math.round(cfg.chonDepthPx * Math.pow(cfg.chonDepthGrow, index))

    this._chonTween = this.tweens.add({
      targets: this.bobber,
      y: this._bobberBaseY + depth,
      duration: cfg.chonDurationMs,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        if (this.phase !== 'wait') return
        this.bobber.setY(this._bobberBaseY)
        const t = this.time.delayedCall(randomWaitMs(cfg), () => {
          this._startChonSequence(index + 1)
        })
        this._biteTimers.push(t)
      },
    })
  }

  // ぐんっ！（完全食いつき）
  _startGoon() {
    if (this.phase !== 'wait') return
    const cfg = this._biteConfig

    this._chonTween = this.tweens.add({
      targets: this.bobber,
      y: this._bobberBaseY + cfg.goonDepthPx,
      duration: cfg.goonDurationMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (this.phase !== 'wait') return
        this.bobberMgr.showSplash(this.bobber.x, this.bobber.y)
        if (navigator.vibrate) navigator.vibrate(80)
        this._openHitWindow(cfg.hitWindowMs)
      },
    })
  }

  _openHitWindow(hitWindowMs = 1200) {
    if (this.phase !== 'wait') return
    // this.fish は _enterWait で決定済み
    this.waitTapActive = true
    this.hitHint.setVisible(true)
    this.hintText.setText('今！タップでヒット')

    this.hitHint.setY(this._hitHintBaseY)  // ドリフト防止：毎回基準点に戻す
    this.hitHintTween?.destroy()
    this.hitHintTween = this.tweens.add({
      targets: this.hitHint, y: this._hitHintBaseY - 8,
      duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    })

    // hitWindowMs 以内にタップなし → 逃げた
    this._wt2 = this.time.delayedCall(hitWindowMs, () => {
      if (this.phase !== 'wait' || !this.waitTapActive) return
      this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
      this.waitTapActive = false
      this.hitHint.setVisible(false)
      this._onMiss()
    })
  }

  // ─── 任意タップによる引き上げ ────────────────────────────────
  _reelUp() {
    this._killWaitTimers()
    this.resultUI.toast('引き上げた')
    this.tweens.add({
      targets: this.bobber,
      x: this.anchorX,
      y: this.anchorY,
      duration: 600,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        this.lineGfx.clear()
        this.lineGfx.lineStyle(2, 0xffffff, 0.75)
        this.lineGfx.lineBetween(this.anchorX, this.anchorY, this.bobber.x, this.bobber.y)
      },
      onComplete: () => {
        this.bobber.setVisible(false)
        this.lineGfx.clear()
        if (this._targetFishIndex != null) {
          this._resetFishToStart(this._targetFishIndex)
          this._targetFishIndex = null
          this._targetFishGfx   = null
        }
        this._enterCast()
      },
    })
  }

  // タイムアウト・空振り共通の「逃げた」処理
  _onMiss() {
    this.resultUI.toast('タイミングを逃した…')
    // 浮きを基準位置に戻す（Bounce でぷかぷか感を出す）
    this.tweens.add({
      targets: this.bobber, y: this._bobberBaseY,
      duration: 400, ease: 'Bounce.easeOut',
    })
    // 接近していた魚影を通常の泳ぎに戻す
    this._resetFishToStart(this._targetFishIndex)
    this._targetFishIndex = null
    this._targetFishGfx   = null
    this.time.delayedCall(600, () => {
      if (this.phase === 'wait') this._enterCast()
    })
  }

  _enterBattle() {
    this.phase = 'battle'
    this.tackleUI?.disable()
    this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
    this.hitHint.setVisible(false)
    this.hintText.setText('')
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)
    this.scoreBar.setY(88)

    this.battleState = createBattleState(this.fish, this.rod)
    armFirstRage(this.battleState, this.fish, this.time.now)

    this.escapeBar.setVisible(true)
    this.battlePanel.setVisible(true)
    if (this.fish.rarity === 'rare' || this.fish.rarity === 'legendary') {
      this._showBigHitCutin(this.fish.rarity)
    }
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

  _showBigHitCutin(rarity) {
    const { width: W, height: H } = this.scale
    const danger = rarity === 'legendary'
    const c = this.add.container(W / 2, H * 0.30).setDepth(130)
    const bg = this.add.graphics()
    bg.fillStyle(danger ? 0x1a1020 : 0x102b42, 0.88)
    bg.lineStyle(3, danger ? 0xffd900 : 0x5ebcff, 1)
    bg.fillRoundedRect(-142, -36, 284, 72, 18)
    bg.strokeRoundedRect(-142, -36, 284, 72, 18)
    const label = this.add.text(0, -9, danger ? 'DANGER' : 'BIG HIT!', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: danger ? '30px' : '28px',
      fontWeight: '900',
      color: danger ? '#ffd900' : '#ffffff',
    }).setOrigin(0.5)
    const sub = this.add.text(0, 20, danger ? '伝説級の気配！' : '大物の引き！', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontWeight: '900',
      color: '#ffffff',
    }).setOrigin(0.5)
    c.add([bg, label, sub])
    this.cameras.main.shake(220, danger ? 0.012 : 0.006)
    this.time.delayedCall(650, () => {
      this.tweens.add({ targets: c, alpha: 0, y: '-=18', duration: 240, onComplete: () => c.destroy(true) })
    })
  }

  /**
   * スコア計算
   * @param {typeof import('../game/fish.js').SAMPLE_FISH[0]} fish
   * @param {number} sizeMultiplier
   */
  calcScore(fish, sizeMultiplier = 1.0) {
    const RARITY_MULT = { common: 1.0, uncommon: 1.5, rare: 2.5, legendary: 5.0 }
    return Math.round(fish.scoreBase * sizeMultiplier * (RARITY_MULT[fish.rarity] ?? 1.0) * getTownBonuses().scoreMod)
  }

  _finishBattle(outcome) {
    this._cleanupBattle()
    // バトル終了後、接近していた魚影を通常の泳ぎに戻す
    this._resetFishToStart(this._targetFishIndex)
    this._targetFishIndex = null
    this._targetFishGfx   = null
    this.phase = 'result'
    this.escapeBar.setVisible(false)
    this.battlePanel.setVisible(false)
    this.reelCTA.setVisible(false)
    this.rageTag.setVisible(false)
    this.dangerFx.setFillStyle(0xff0000, 0)
    this.hintText.setText('')
    this.scoreBar.setY(16)

    if (outcome === 'caught') {
      const score = this.calcScore(this.fish)
      const sizeCm = this._rollFishSize(this.fish)

      // 累積
      this.totalScore += score
      this.catches.push({ fishId: this.fish.id, score, sizeCm, timestamp: Date.now() })

      // 表示更新
      this.scoreValText?.setText(String(this.totalScore))

      this._saveProgress()

      this.resultUI.drawResultStripe('caught')
      this.resLabel.setText('✦ GET! ✦')
      this.resEmoji.setText(this.fish.emoji).setAngle(0)
      this.resName.setText(this.fish.name)
      this.resPts.setText(`${sizeCm}cm  +${score}pt`)
      this.resHint.setText('タップで続ける / 図鑑に記録')

      this.resultEmojiTween?.destroy()
      this.resultEmojiTween = this.tweens.add({
        targets: this.resEmoji, angle: 8,
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      })
    } else {
      this.resultUI.drawResultStripe('escaped')
      this.resLabel.setText('✕ ESCAPED ✕')
      this.resEmoji.setText('💨').setAngle(0)
      this.resName.setText('逃げられた…')
      this.resPts.setText('竿やエサを強化すると安定する')
      this.resHint.setText('タップで再挑戦')
      this.cameras.main.flash(400, 255, 0, 0)
    }
    this.resultOverlay.setVisible(true)
  }

  _rollFishSize(fish) {
    const [min, max] = RARITY_SIZE[fish.rarity] ?? [20, 50]
    return Math.round(Phaser.Math.FloatBetween(min, max) * 10) / 10
  }

  _syncBattleUI() {
    this.battleUI.sync(this.battleState, this._reel, this._ebarW)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAST EXECUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  _fireCast(angleDeg, power01) {
    this.castGfx.clear()
    this.powerGfx.clear()
    this.powerLabel.setVisible(false)

    if (!this._consumeBaitForCast()) return

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
      this.castUI.drawPreview(this._castAngle, p)
      this.castUI.drawPowerBar(p)
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
    if (this.tackleUI?._openPanel !== null) return   // タックルパネル開時はゲーム入力をブロック

    if (this.phase === 'result') {
      this.resultOverlay.setVisible(false)
      this._enterCast()
      return
    }

    if (this.phase === 'wait' && this.waitTapActive) {
      // ぐんっ！中 → HIT判定
      const prob = Math.min(1, this.fish.biteRate + this.bait.biteRateBonus)
      if (Math.random() > prob) {
        this.waitTapActive = false
        this.hitHint.setVisible(false)
        this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
        this._wt2?.remove(false); this._wt2 = undefined
        this.resultUI.toast('空振り！')
        this._onMiss()
        return
      }
      this._killWaitTimers()
      this._enterBattle()
      return
    }

    // 待機中・ちょんちょん中（ぐんっ！前）→ 引き上げ
    if (this.phase === 'wait' && !this.waitTapActive) {
      this._reelUp()
      return
    }

    if (this.phase === 'cast') {
      if (pointer.y > this.scale.height - 80) return  // タックルボタン領域を除外
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
    if (this.tackleUI?._openPanel !== null) return   // タックルパネル開時はキャストをブロック
    if (this.phase !== 'cast' || !this.isCharging) return
    this.isCharging = false
    const power = oscillatePower(this.time.now - this.chargeStartedAt)
    this._fireCast(this._castAngle, power)
  }

  _cleanupBattle() {
    this._battleTimer?.remove(false)
    this._battleTimer = undefined
  }

  _killWaitTimers() {
    this._wt1?.remove(false)
    this._wt2?.remove(false)
    this._biteTimers?.forEach(t => t.remove(false))
    this._biteTimers = []
    this._chonTween?.stop(); this._chonTween?.destroy()
    this._approachTween?.stop(); this._approachTween?.destroy()
    this.waitTapActive = false
    this._wt1 = this._wt2 = undefined
    this._chonTween = undefined
    this._approachTween = null
  }

  // env.player の選択を this.rod / this.bait に反映
  _syncTackle() {
    this.env.player.inventory = getInventory()
    const rodId  = this.env?.player?.rodType  ?? 'carbon'
    const baitId = this.env?.player?.baitType ?? 'worm'
    const rs = ROD_STATS[rodId]   ?? ROD_STATS.carbon
    const bs = BAIT_STATS[baitId] ?? BAIT_STATS.worm
    const rankBonus = getRankBonuses()
    this.env.player.skillLevel = rankBonus.skillLevel
    this.rod  = {
      id: rodId,
      pullPower: rs.pullPower * rankBonus.pullPowerMod,
      castRange: rs.castRange * rankBonus.castRangeMod,
      attractRadius: rs.attractRadius * rankBonus.attractRadiusMod,
    }
    this.bait = {
      id: baitId,
      biteRateBonus: bs.biteRateBonus + rankBonus.biteRateBonus,
      rareFishBonus: bs.rareFishBonus,
      attractRadius: bs.attractRadius,
    }
    this.castRangePx = Math.min(this.scale.height * 0.78, this.baseCastRangePx * this.rod.castRange)
  }

  _consumeBaitForCast() {
    const baitId = this.env?.player?.baitType ?? 'worm'
    const inventory = this.env?.player?.inventory ?? getInventory()
    const current = inventory.baits?.[baitId] ?? 0
    if (current <= 0) {
      this.resultUI?.toast('エサがありません')
      this.hintText?.setText('エサを選ぶか、交換所で補充しよう')
      return false
    }
    inventory.baits[baitId] = current - 1
    this.env.player.inventory = inventory
    saveInventory(inventory)
    return true
  }

  _saveProgress() {
    localStorage.setItem('ainan_score',   String(this.totalScore))
    localStorage.setItem('ainan_catches', JSON.stringify(this.catches))
  }

  _cleanup() {
    this.tackleUI?.destroy()
    this.battleUI?.destroy()
    this._cleanupBattle()
    this._killWaitTimers()
    this.hitHintTween?.stop(); this.hitHintTween?.destroy(); this.hitHintTween = null
    this.resultEmojiTween?.stop(); this.resultEmojiTween?.destroy(); this.resultEmojiTween = null
    this.bg?.destroy()
    if (this._beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this._beforeUnloadHandler)
      this._beforeUnloadHandler = null
    }
  }
}
