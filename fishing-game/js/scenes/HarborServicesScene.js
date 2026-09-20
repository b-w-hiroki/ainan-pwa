
import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META, getScore, getTownFacilities } from '../game/progress.js'
import { MEAL_META, cookMeal, getActiveMeal, getCatchStock, sellAllCatches, sellCatch } from '../game/midgameProgression.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class HarborServicesScene extends Phaser.Scene {
  constructor() { super({ key: 'HarborServicesScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing, ASSETS.facilities.fishShop, ASSETS.facilities.diner, ASSETS.characters.dinerOwner, ASSETS.ui.panelHarbor]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    this._facilities = getTownFacilities()
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.90).setDepth(1)
    this._header(W)
    this._fishShop(W)
    this._diner(W)
    buildFooterNav(this, W, H, 'shop')
  }

  _header(W) {
    if (this.textures.exists(ASSETS.ui.panelHarbor.key)) {
      this.add.image(W / 2, 53, ASSETS.ui.panelHarbor.key).setDisplaySize(W - 32, 88).setDepth(3)
    }
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, this.textures.exists(ASSETS.ui.panelHarbor.key) ? 0.72 : 0.97); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(16, 12, W - 32, 78, 22); g.strokeRoundedRect(16, 12, W - 32, 78, 22)
    this.add.text(30, 39, '港のお店', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '25px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(30, 67, '釣果を売る・料理で次の釣りに備える', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(W - 30, 49, getScore().toLocaleString() + ' pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(5)
  }

  _fishShop(W) {
    const unlocked = (this._facilities.market ?? 0) >= 2
    const x = 20, y = 108, w = W - 40, h = 232
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, unlocked ? 0x5bb5d8 : 0xb7cbd5, 0.88)
    g.fillRoundedRect(x, y, w, h, 20); g.strokeRoundedRect(x, y, w, h, 20)
    this.add.text(x + 18, y + 22, unlocked ? '魚屋　営業中' : '魚屋　準備中', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + w - 18, y + 23, unlocked ? '魚市場 Lv.2' : '魚市場 Lv.2で開業', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: unlocked ? UI_COLORS.success : UI_COLORS.muted }).setOrigin(1, 0).setDepth(5)
    if (this.textures.exists(ASSETS.facilities.fishShop.key)) {
      const art = this.add.image(x + w - 52, y + 72, ASSETS.facilities.fishShop.key).setDisplaySize(82, 62).setDepth(5)
      if (!unlocked) art.setTint(0x9aaab3).setAlpha(0.35)
      else art.setAlpha(0.82)
    }
    if (!unlocked) return

    const stock = getCatchStock()
    const rows = Object.entries(stock).filter(([, count]) => (count ?? 0) > 0).slice(0, 4)
    if (!rows.length) {
      this.add.text(W / 2, y + 105, '売れる釣果がありません\n魚を釣って町へ持ち帰ろう', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '800', color: UI_COLORS.inkSoft, align: 'center' }).setOrigin(0.5).setDepth(5)
    } else {
      rows.forEach(([id, count], i) => {
        const ry = y + 58 + i * 34, meta = FISH_META[id] ?? { name: id, icon: '魚', score: 80 }
        this.add.text(x + 24, ry, meta.icon, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(0, 0.5).setDepth(5)
        this.add.text(x + 48, ry, meta.name + '  x' + count, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink }).setOrigin(0, 0.5).setDepth(5)
        const value = Math.max(30, Math.round((meta.score ?? 80) * 0.55))
        const sell = this.add.text(x + w - 22, ry, value + 'ptで売る', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: '#9a6500', backgroundColor: '#fff0b8', padding: { x: 7, y: 4 } }).setOrigin(1, 0.5).setDepth(6)
        sell.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (sellCatch(id, 1).ok) this.scene.restart() })
      })
    }
    const total = Object.values(stock).reduce((sum, n) => sum + (n ?? 0), 0)
    const all = this.add.text(W / 2, y + h - 22, total > 0 ? '在庫をまとめて売る' : '釣果在庫 0', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: total > 0 ? UI_COLORS.oceanDeep : UI_COLORS.muted }).setOrigin(0.5).setDepth(6)
    if (total > 0) all.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (sellAllCatches().ok) this.scene.restart() })
  }

  _diner(W) {
    const unlocked = (this._facilities.festival ?? 0) >= 2
    const x = 20, y = 356, w = W - 40, h = 290
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.97); g.lineStyle(2, unlocked ? 0xffb45d : 0xb7cbd5, 0.88)
    g.fillRoundedRect(x, y, w, h, 20); g.strokeRoundedRect(x, y, w, h, 20)
    this.add.text(x + 18, y + 22, unlocked ? '港食堂　営業中' : '港食堂　準備中', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '16px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + w - 18, y + 23, unlocked ? '広場 Lv.2' : '港まつり広場 Lv.2で開業', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: unlocked ? UI_COLORS.success : UI_COLORS.muted }).setOrigin(1, 0).setDepth(5)
    if (this.textures.exists(ASSETS.facilities.diner.key)) {
      const art = this.add.image(x + w - 57, y + 70, ASSETS.facilities.diner.key).setDisplaySize(84, 63).setDepth(5)
      if (!unlocked) art.setTint(0x9aaab3).setAlpha(0.35)
      else art.setAlpha(0.76)
    }
    if (unlocked && this.textures.exists(ASSETS.characters.dinerOwner.key)) {
      this.add.image(x + 34, y + 72, ASSETS.characters.dinerOwner.key).setDisplaySize(34, 52).setDepth(6)
    }
    if (!unlocked) return

    const active = getActiveMeal()
    this.add.text(x + 18, y + 50, active ? '食事効果: ' + active.meta.name + '　残り' + active.usesLeft + '回' : '食事効果: なし', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: active ? UI_COLORS.warning : UI_COLORS.inkSoft }).setDepth(5)
    Object.entries(MEAL_META).forEach(([id, meal], i) => {
      const cy = y + 92 + i * 58
      g.fillStyle(0xfffbec, 1); g.lineStyle(1.3, 0xffd48a, 0.8)
      g.fillRoundedRect(x + 14, cy - 20, w - 28, 48, 13); g.strokeRoundedRect(x + 14, cy - 20, w - 28, 48, 13)
      this.add.text(x + 31, cy + 4, meal.mark, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '13px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(0.5).setDepth(5)
      this.add.text(x + 55, cy - 5, meal.name, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
      this.add.text(x + 55, cy + 12, meal.desc, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '8px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
      const btn = this.add.text(x + w - 22, cy + 4, meal.scoreCost + 'pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.ink, backgroundColor: '#ffd95a', padding: { x: 8, y: 5 } }).setOrigin(1, 0.5).setDepth(6)
      btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        const result = cookMeal(id)
        if (result.ok) this.scene.restart()
        else this._toast(result.reason === 'stock' ? '料理に使える魚がありません' : 'ポイントが足りません')
      })
    })
  }

  _toast(message) {
    const W = this.scale.width, H = this.scale.height
    const bg = this.add.graphics().setDepth(120); bg.fillStyle(0x173248, 0.94); bg.fillRoundedRect(W / 2 - 120, H - 145, 240, 38, 14)
    const t = this.add.text(W / 2, H - 126, message, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: '#ffffff' }).setOrigin(0.5).setDepth(121)
    this.tweens.add({ targets: [bg, t], alpha: 0, delay: 650, duration: 400, onComplete: () => { bg.destroy(); t.destroy() } })
  }
}
