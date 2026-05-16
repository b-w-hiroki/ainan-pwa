import { FONT, SHADOW } from '../config/fontStyles.js'
import { ICONS } from '../config/icons.js'
import { Button } from '../ui/Button.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' })
  }

  create() {
    const { width: W, height: H } = this.scale

    this._buildBackground(W, H)
    this._buildHeader(W, H)
    this._buildStatsCard(W, H)
    this._buildMainCTA(W, H)
    this._buildSubMenu(W, H)
    this._buildFooter(W, H)
  }

  // ─── 背景：空→海のグラデ + 波のシルエット ─────────────────
  _buildBackground(W, H) {
    const bg = this.add.graphics().setDepth(0)
    bg.fillGradientStyle(0xfdf5d6, 0xfdf5d6, 0xcfe9fa, 0xcfe9fa, 1)
    bg.fillRect(0, 0, W, H * 0.55)
    bg.fillGradientStyle(0x7fc8e8, 0x7fc8e8, 0x4ba3cf, 0x4ba3cf, 1)
    bg.fillRect(0, H * 0.55, W, H * 0.45)

    // 太陽
    bg.fillStyle(0xffe066, 1)
    bg.fillCircle(W * 0.78, H * 0.18, 32)
    bg.fillStyle(0xfff3b0, 0.45)
    bg.fillCircle(W * 0.78, H * 0.18, 48)

    // 雲（静的・装飾）
    this._drawCloud(bg, W * 0.18, H * 0.10, 0.9)
    this._drawCloud(bg, W * 0.5, H * 0.06, 0.65)

    // 海の上の波シルエット（白ライン）
    bg.fillStyle(0xffffff, 0.7)
    bg.fillRect(0, H * 0.55, W, 3)
    bg.fillStyle(0xffffff, 0.35)
    ;[0.62, 0.70, 0.78, 0.86].forEach(f => {
      bg.fillRect(0, H * f, W, 2)
    })

    // 水面に泳ぐ魚影アニメ
    this._spawnHomeFishShadows(W, H)
  }

  _drawCloud(g, cx, cy, sc) {
    const w = 90 * sc, h = 22 * sc
    g.fillStyle(0xffffff, 1)
    g.lineStyle(2, 0xc8e8f8, 1)
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2)
    g.fillCircle(cx - w * 0.2, cy - h * 0.7, h * 0.95)
    g.fillCircle(cx + w * 0.1, cy - h * 0.55, h * 0.75)
  }

  _spawnHomeFishShadows(W, H) {
    const defs = [
      { y: H * 0.72, dur: 14000, delay: 0,    rtl: false, sc: 1.0 },
      { y: H * 0.82, dur: 18000, delay: 4000, rtl: true,  sc: 0.75 },
    ]
    defs.forEach(d => {
      const gfx = this.add.graphics().setDepth(1)
      const sc = d.sc
      gfx.fillStyle(0x082030, 0.30)
      gfx.fillEllipse(0, 0, 28 * sc, 14 * sc)
      gfx.fillTriangle(14 * sc, 0, 19 * sc, -8 * sc, 19 * sc, 8 * sc)
      if (d.rtl) gfx.setScale(-1, 1)

      const sx = d.rtl ? W + 60 : -60
      const ex = d.rtl ? -60 : W + 60
      gfx.setPosition(sx, d.y)
      this.tweens.add({
        targets: gfx, x: ex,
        duration: d.dur, delay: d.delay, repeat: -1,
      })
    })
  }

  // ─── ヘッダー：ロゴ + サブコピー ─────────────────────────
  _buildHeader(W, H) {
    const logoGroup = this.add.container(W / 2, H * 0.115).setDepth(5)

    const logo = this.add.text(0, 0, '釣りゲーム', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '44px', fontStyle: '900',
      color: '#ffffff',
      shadow: SHADOW.strong,
    }).setOrigin(0.5)

    const kariW = 50, kariH = 22
    const kariBg = this.add.graphics()
    kariBg.fillStyle(0xff6a3d, 1)
    kariBg.fillRoundedRect(-kariW / 2, -kariH / 2, kariW, kariH, 7)
    kariBg.y = -36
    const kariTxt = this.add.text(0, -36, '（仮）', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5)

    logoGroup.add([logo, kariBg, kariTxt])

    this.add.text(W / 2, H * 0.185, '港町の海で釣りを楽しもう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '15px', fontStyle: '700',
      color: '#1a3a5a',
      shadow: SHADOW.soft,
    }).setOrigin(0.5).setDepth(5)
  }

  // ─── 実績カード（プレイヤーの記録）─────────────────────
  _buildStatsCard(W, H) {
    const totalScore = parseInt(localStorage.getItem('ainan_score') ?? '0', 10)
    const catches    = JSON.parse(localStorage.getItem('ainan_catches') ?? '[]')
    const catchCount = catches.length
    const uniqueFish = new Set(catches.map(c => c.fishId)).size

    const cardW = W * 0.84
    const cardH = 116
    const cardX = W / 2
    const cardY = H * 0.30

    // 影
    const sh = this.add.graphics().setDepth(2)
    sh.fillStyle(0x000000, 0.18)
    sh.fillRoundedRect(cardX - cardW / 2 + 3, cardY - cardH / 2 + 4, cardW, cardH, 16)

    // 本体
    const g = this.add.graphics().setDepth(3)
    g.fillStyle(0xffffff, 0.97)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.fillRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 16)
    g.strokeRoundedRect(cardX - cardW / 2, cardY - cardH / 2, cardW, cardH, 16)

    // MY釣果ラベルバー
    g.fillStyle(0xffd900, 1)
    g.fillRoundedRect(cardX - cardW / 2 + 12, cardY - cardH / 2 + 10, 64, 20, 6)
    this.add.text(cardX - cardW / 2 + 44, cardY - cardH / 2 + 20, 'MY釣果', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '11px', fontStyle: '800', color: '#1a2a3a',
    }).setOrigin(0.5).setDepth(4)

    // 3カラム：スコア / 釣果数 / 図鑑進捗
    const colY = cardY + 20
    const cols = [
      { x: cardX - cardW * 0.30, icon: ICONS.SCORE, val: totalScore.toLocaleString(), label: 'スコア', color: '#e07800' },
      { x: cardX,                icon: ICONS.FISH,  val: `${catchCount}`,             label: '釣果',   color: '#0077cc' },
      { x: cardX + cardW * 0.30, icon: ICONS.BOOK,  val: `${uniqueFish}/5`,           label: '図鑑',   color: '#00aa66' },
    ]
    cols.forEach(c => {
      this.add.text(c.x, colY - 18, c.icon, { fontSize: '24px', resolution: TEXT_RES })
        .setOrigin(0.5).setDepth(4)
      this.add.text(c.x, colY + 10, c.val, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '22px', fontStyle: '800', color: c.color,
      }).setOrigin(0.5).setDepth(4)
      this.add.text(c.x, colY + 30, c.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '13px', fontStyle: '700', color: '#4a7090',
      }).setOrigin(0.5).setDepth(4)
    })
  }

  // ─── メインCTA ───────────────────────────────────────────
  _buildMainCTA(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.54,
      w: 300, h: 70,
      label: '釣りに行く',
      icon:  ICONS.ROD,
      variant: 'primary',
      fontSize: 24,
      depth: 10,
      onClick: () => this.scene.start('MapScene'),
    })
    this.add.text(W / 2, H * 0.54 + 52, 'ポイントを選んで出発しよう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontStyle: '700', color: '#1a3a5a',
      shadow: SHADOW.soft,
    }).setOrigin(0.5).setAlpha(0.85).setDepth(10)
  }

  // ─── 今後実装する機能の予告セクション ──────────────────
  _buildSubMenu(W, H) {
    this.add.text(W / 2, H * 0.67, '今後追加される機能', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontStyle: '800', color: '#1a3a5a',
    }).setOrigin(0.5).setDepth(4).setAlpha(0.85)

    const sep = this.add.graphics().setDepth(3)
    sep.lineStyle(1.5, 0x1a2a3a, 0.25)
    sep.lineBetween(W * 0.18, H * 0.705, W * 0.82, H * 0.705)

    const items = [
      { icon: ICONS.BOOK, label: '図鑑',     caption: '釣った魚を集める' },
      { icon: ICONS.GEAR, label: 'タックル', caption: '竿・エサを強化' },
      { icon: ICONS.GIFT, label: '景品交換', caption: 'ポイントで交換' },
    ]
    const ITEM_W = 96
    const ITEM_H = 104
    const GAP    = 10
    const totalW = items.length * ITEM_W + (items.length - 1) * GAP
    const startX = W / 2 - totalW / 2 + ITEM_W / 2
    const cy     = H * 0.79

    items.forEach((it, i) => {
      const cx = startX + i * (ITEM_W + GAP)

      const sh = this.add.graphics().setDepth(2)
      sh.fillStyle(0x000000, 0.10)
      sh.fillRoundedRect(cx - ITEM_W / 2 + 2, cy - ITEM_H / 2 + 3, ITEM_W, ITEM_H, 12)

      const g = this.add.graphics().setDepth(3)
      g.fillStyle(0xeef2f6, 0.92)
      g.fillRoundedRect(cx - ITEM_W / 2, cy - ITEM_H / 2, ITEM_W, ITEM_H, 12)
      this._drawDashedRoundedRect(g, cx - ITEM_W / 2, cy - ITEM_H / 2, ITEM_W, ITEM_H, 12, 0x1a2a3a, 0.65)

      this.add.text(cx, cy - 26, it.icon, {
        fontSize: '30px', resolution: TEXT_RES,
      }).setOrigin(0.5).setDepth(4).setAlpha(0.7)

      this.add.text(cx, cy + 4, it.label, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '14px', fontStyle: '800', color: '#1a3a5a',
      }).setOrigin(0.5).setDepth(4)

      this.add.text(cx, cy + 21, it.caption, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '11px', fontStyle: '700', color: '#5a7090',
      }).setOrigin(0.5).setDepth(4)

      // 「実装予定」バッジ
      const bg = this.add.graphics().setDepth(5)
      bg.fillStyle(0xff6a3d, 1)
      bg.fillRoundedRect(cx - ITEM_W / 2 + 6, cy + ITEM_H / 2 - 22, ITEM_W - 12, 16, 4)
      this.add.text(cx, cy + ITEM_H / 2 - 14, `${ICONS.COMING} 実装予定`, {
        fontFamily: FONT, resolution: TEXT_RES,
        fontSize: '10px', fontStyle: '900', color: '#ffffff',
      }).setOrigin(0.5).setDepth(6)
    })
  }

  _drawDashedRoundedRect(g, x, y, w, h, r, color, alpha) {
    g.lineStyle(2, color, alpha)
    const dash = 5, gap = 4
    const drawSeg = (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1
      const len = Math.hypot(dx, dy)
      const step = dash + gap
      const ux = dx / len, uy = dy / len
      for (let d = 0; d < len; d += step) {
        const d2 = Math.min(d + dash, len)
        g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * d2, y1 + uy * d2)
      }
    }
    drawSeg(x + r, y, x + w - r, y)
    drawSeg(x + w, y + r, x + w, y + h - r)
    drawSeg(x + w - r, y + h, x + r, y + h)
    drawSeg(x, y + h - r, x, y + r)
  }

  // ─── フッター ─────────────────────────────────────────
  _buildFooter(W, H) {
    new Button(this, {
      x: W / 2, y: H * 0.94,
      w: 180, h: 42,
      label: 'タイトルへ戻る',
      variant: 'ghost',
      fontSize: 14,
      depth: 10,
      onClick: () => this.scene.start('TitleScene'),
    })
  }
}
