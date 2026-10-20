import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { loadGameTexture } from '../utils/loadGameTexture.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { Button } from '../ui/Button.js'
import { FISH_META, getScore, getTownFacilities } from '../game/progress.js'
import { MEAL_META, cookMeal, getActiveMeal, getCatchStock, sellAllCatches, sellCatch } from '../game/midgameProgression.js'
import { markServicesSeen } from '../game/retentionProgress.js'

const TEXT_RES = Math.min(2, window.devicePixelRatio ?? 1)

export default class HarborServicesScene extends Phaser.Scene {
  constructor() { super({ key: 'HarborServicesScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) loadGameTexture(this, asset)
    })
  }

  create() {
    markServicesSeen()
    const W = this.scale.width, H = this.scale.height
    this._facilities = getTownFacilities()
    this._serviceButtons = []
    this._serviceTab = this._serviceTab === 'diner' ? 'diner' : 'fish'
    const bounds = this.game.canvas.getBoundingClientRect()
    this._cssScale = Math.max(0.1, Math.min(bounds.width / W, bounds.height / H))
    this._actionHeight = Math.max(44, Math.ceil(46 / this._cssScale))
    this._panelTop = 128 + this._actionHeight
    this._panelBottom = H - 108
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.90).setDepth(1)
    this._header(W)
    for (const [index, id, label] of [[0, 'fish', '魚屋'], [1, 'diner', '港食堂']]) {
      this._button(24 + (W - 48) / 4 + index * (W - 48) / 2, 108 + this._actionHeight / 2,
        (W - 72) / 2, label, `tab-${id}`, () => {
          if (this._serviceTab === id) return
          this._serviceTab = id
          this.scene.restart()
        }, false, this._serviceTab === id ? 'primary' : 'ghost')
    }
    if (this._serviceTab === 'fish') this._fishShop(W)
    else this._diner(W)
    buildFooterNav(this, W, H, 'shop')
    const reflow = () => { if (this.sys.isActive()) this.scene.restart() }
    this.scale.on('resize', reflow)
    this.events.once('shutdown', () => this.scale.off('resize', reflow))
  }

  _text(x, y, copy, size = 12, color = UI_COLORS.ink, width) {
    return this.add.text(x, y, copy, { fontFamily: FONT, resolution: TEXT_RES,
      fontSize: `${Math.ceil(size / this._cssScale)}px`, fontStyle: 'bold', color,
      ...(width ? { wordWrap: { width, useAdvancedWrap: true } } : {}),
    }).setDepth(5)
  }

  _button(x, y, w, label, action, onClick, disabled = false, variant = 'secondary') {
    const button = new Button(this, { x, y, w, h: this._actionHeight, label,
      fontSize: Math.ceil(12 / this._cssScale), depth: 6, artKeys: {}, variant, disabled, onClick })
    button.container.setData('serviceAction', action)
    this._serviceButtons.push(button)
    return button
  }

  _header(W) {
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(16, 12, W - 32, 78, 22); g.strokeRoundedRect(16, 12, W - 32, 78, 22)
    this._text(30, 25, '港のお店', 20)
    this._text(30, 62, '釣果を売る・料理で次の釣りに備える', 10, UI_COLORS.inkSoft, W - 60)
    this._text(W - 30, 31, getScore().toLocaleString() + ' pt', 13, UI_COLORS.warning).setOrigin(1, 0)
  }

  _panel(W, title, unlocked, requirement) {
    const y = this._panelTop, h = this._panelBottom - y
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(20, y, W - 40, h, 20); g.strokeRoundedRect(20, y, W - 40, h, 20)
    this._text(38, y + 20, title, 16)
    this._text(W - 38, y + 24, unlocked ? '営業中' : '準備中', 11,
      unlocked ? UI_COLORS.success : UI_COLORS.muted).setOrigin(1, 0)
    if (!unlocked) {
      this._text(W / 2, y + h / 2 - 24, requirement, 13, UI_COLORS.inkSoft, W - 96).setOrigin(0.5)
      this._button(W / 2, y + h / 2 + this._actionHeight, W - 96, 'まちで施設を育てる', 'develop', () => this.scene.start('TownScene'))
    }
    return unlocked
  }

  _fishShop(W) {
    if (!this._panel(W, '魚屋', (this._facilities.market ?? 0) >= 2, '魚市場をLv.2にすると開業します')) return
    const stock = getCatchStock()
    const rows = Object.entries(stock).filter(([, count]) => (count ?? 0) > 0)
    const h = this._actionHeight, pagerY = this._panelBottom - 1.5 * h - 28
    const firstY = this._panelTop + 106, pitch = h + 14
    const pageSize = Math.max(1, Math.min(4, Math.floor((pagerY - h - 16 - firstY) / pitch) + 1))
    const pages = Math.max(1, Math.ceil(rows.length / pageSize))
    this._stockPage = Phaser.Math.Clamp(this._stockPage ?? 0, 0, pages - 1)
    const actionW = Math.min(W * 0.46, Math.max(112, Math.ceil(80 / this._cssScale)))
    if (!rows.length) this._text(W / 2, firstY + h, '売れる釣果がありません\n魚を釣って町へ持ち帰ろう', 13,
      UI_COLORS.inkSoft, W - 96).setOrigin(0.5)
    rows.slice(this._stockPage * pageSize, (this._stockPage + 1) * pageSize).forEach(([id, count], index) => {
      const y = firstY + index * pitch, meta = FISH_META[id] ?? { name: id, score: 80 }
      this._text(40, y, `${meta.name} ×${count}`, 12, UI_COLORS.ink, W - actionW - 100).setOrigin(0, 0.5)
      const value = Math.max(30, Math.round((meta.score ?? 80) * 0.55))
      this._button(W - 38 - actionW / 2, y, actionW, `${value}pt\n売る`, `sell-${id}`, () => {
        if (sellCatch(id, 1).ok) this.scene.restart()
      })
    })
    if (pages > 1) {
      const move = delta => { this._stockPage += delta; this.scene.restart() }
      this._button(90, pagerY, 110, '前へ', 'page-prev', () => move(-1), this._stockPage === 0, 'ghost')
      this._text(W / 2, pagerY, `${this._stockPage + 1}/${pages}`, 12).setOrigin(0.5)
      this._button(W - 90, pagerY, 110, '次へ', 'page-next', () => move(1), this._stockPage === pages - 1, 'ghost')
    }
    const total = Object.values(stock).reduce((sum, n) => sum + (n ?? 0), 0)
    this._button(W / 2, this._panelBottom - h / 2 - 12, W - 88,
      total ? '在庫をまとめて売る' : '釣果在庫 0', 'sell-all', () => {
        if (sellAllCatches().ok) this.scene.restart()
      }, total <= 0, 'primary')
  }

  _diner(W) {
    if (!this._panel(W, '港食堂', (this._facilities.festival ?? 0) >= 2, '港まつり広場をLv.2にすると開業します')) return
    const active = getActiveMeal(), y = this._panelTop
    this._text(38, y + 59, active ? `食事効果：${active.meta.name}　残り${active.usesLeft}回` : '食事効果：なし',
      11, UI_COLORS.inkSoft, W - 76)
    const stockTotal = Object.values(getCatchStock()).reduce((sum, n) => sum + (n ?? 0), 0)
    const actionW = Math.min(W * 0.46, Math.max(112, Math.ceil(80 / this._cssScale)))
    const pitch = (this._panelBottom - y - 136) / Object.keys(MEAL_META).length
    Object.entries(MEAL_META).forEach(([id, meal], index) => {
      const cy = y + 148 + index * pitch
      const ready = stockTotal >= meal.stockCost && getScore() >= meal.scoreCost
      this._text(40, cy - 38, meal.name, 13, UI_COLORS.ink, W - actionW - 100)
      this._text(40, cy - 10, meal.desc, 10, UI_COLORS.inkSoft, W - actionW - 100)
      const detail = stockTotal < meal.stockCost ? `魚が${meal.stockCost - stockTotal}尾足りません`
        : getScore() < meal.scoreCost ? `あと${meal.scoreCost - getScore()}pt必要` : `魚${meal.stockCost}尾を使う`
      this._text(40, cy + 38, detail, 10, ready ? UI_COLORS.success : UI_COLORS.warning, W - 90)
      this._button(W - 38 - actionW / 2, cy + 5, actionW, `${meal.scoreCost}pt\n注文`, `meal-${id}`, () => {
        const result = cookMeal(id)
        if (result.ok) this.scene.restart()
      }, !ready, 'primary')
    })
  }
}
