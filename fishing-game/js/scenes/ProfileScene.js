import Phaser from 'phaser'
import { FONT, UI_COLORS } from '../config/fontStyles.js'
import { ASSETS } from '../config/assetManifest.js'
import { addCoverImage } from '../utils/imageLayout.js'
import { buildFooterNav } from '../ui/FooterNav.js'
import { FISH_META, getCatches, getPlayerRank, getScore, getTownSummary } from '../game/progress.js'
import { getAccessoryState, getBossStates, getMaterials, getRodLevels } from '../game/midgameProgression.js'
import { getAchievementStates, getSelectedTitle } from '../game/retentionProgress.js'

const TEXT_RES = window.devicePixelRatio ?? 1

export default class ProfileScene extends Phaser.Scene {
  constructor() { super({ key: 'ProfileScene' }) }

  preload() {
    const wanted = [ASSETS.backgrounds.townGrowing, ASSETS.characters.playerDefaultUi]
    wanted.forEach(asset => {
      if (asset?.status === 'ready' && !this.textures.exists(asset.key)) this.load.image(asset.key, asset.path)
    })
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    addCoverImage(this, ASSETS.backgrounds.townGrowing.key, W, H, 0)
    this.add.rectangle(W / 2, H / 2, W, H, 0xf7fcff, 0.91).setDepth(1)
    this._header(W)
    this._summary(W)
    this._records(W)
    this._loadout(W)
    buildFooterNav(this, W, H, 'menu')
  }

  _header(W) {
    const rank = getPlayerRank()
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(2, 0x9bcfe5, 0.9)
    g.fillRoundedRect(16, 12, W - 32, 88, 22); g.strokeRoundedRect(16, 12, W - 32, 88, 22)
    if (this.textures.exists(ASSETS.characters.playerDefaultUi.key)) {
      this.add.image(62, 58, ASSETS.characters.playerDefaultUi.key).setDisplaySize(44, 86).setDepth(5)
    }
    const selectedTitle = getSelectedTitle()
    this.add.text(98, 38, selectedTitle || rank.title, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '18px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(98, 66, 'RANK ' + rank.rank + '　' + getScore().toLocaleString() + ' pt', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
  }

  _summary(W) {
    const catches = getCatches()
    const town = getTownSummary()
    const species = new Set(catches.map(c => c.fishId)).size
    const bosses = Object.values(getBossStates()).filter(item => item.cleared).length
    const stats = [
      ['総釣果', catches.length + '匹'],
      ['発見魚', species + '/' + Object.keys(FISH_META).length],
      ['ボス', bosses + '/3'],
      ['町', town.rank],
    ]
    stats.forEach(([label, value], i) => {
      const x = 22 + (i % 2) * 177, y = 122 + Math.floor(i / 2) * 80, w = 166, h = 66
      const g = this.add.graphics().setDepth(4)
      g.fillStyle(0xffffff, 0.98); g.lineStyle(1.5, 0xb9d4df, 0.86)
      g.fillRoundedRect(x, y, w, h, 17); g.strokeRoundedRect(x, y, w, h, 17)
      this.add.text(x + 14, y + 18, label, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '9px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
      this.add.text(x + 14, y + 39, value, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '15px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    })
  }

  _records(W) {
    const catches = getCatches()
    const best = catches.reduce((current, item) => (item.sizeCm ?? 0) > (current?.sizeCm ?? 0) ? item : current, null)
    const rare = catches.filter(item => ['rare', 'legendary'].includes(FISH_META[item.fishId]?.rarity)).length
    const x = 22, y = 294, w = W - 44, h = 120
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.5, 0xffd48a, 0.88)
    g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
    this.add.text(x + 16, y + 20, '釣果記録', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    const bestFish = best ? FISH_META[best.fishId] : null
    this.add.text(x + 16, y + 52, bestFish ? '最大魚　' + bestFish.name + ' ' + best.sizeCm + 'cm' : '最大魚　--', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '12px', fontWeight: '900', color: UI_COLORS.warning }).setDepth(5)
    this.add.text(x + 16, y + 80, 'レア以上の釣果　' + rare + '匹', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '800', color: UI_COLORS.inkSoft }).setDepth(5)
  }

  _loadout(W) {
    const levels = getRodLevels()
    const accessories = getAccessoryState()
    const mats = getMaterials()
    const x = 22, y = 432, w = W - 44, h = 170
    const g = this.add.graphics().setDepth(4)
    g.fillStyle(0xffffff, 0.98); g.lineStyle(1.5, 0x9bcfe5, 0.86)
    g.fillRoundedRect(x, y, w, h, 18); g.strokeRoundedRect(x, y, w, h, 18)
    this.add.text(x + 16, y + 20, '育成状況', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '14px', fontWeight: '900', color: UI_COLORS.ink }).setDepth(5)
    this.add.text(x + 16, y + 50, '竿Lv　初心者 ' + levels.basic + ' / カーボン ' + levels.carbon + ' / 高級 ' + levels.premium, { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(x + 16, y + 78, '帽子　' + (accessories.equipped.hat ? '装備中' : 'なし') + '　　バッグ　' + (accessories.equipped.bag ? '装備中' : 'なし'), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.inkSoft }).setDepth(5)
    this.add.text(x + 16, y + 108, '素材　鱗' + (mats.scale ?? 0) + '　貝' + (mats.shell ?? 0) + '　券' + (mats.ticket ?? 0) + '　晶' + (mats.crystal ?? 0), { fontFamily: FONT, resolution: TEXT_RES, fontSize: '10px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setDepth(5)
    const achievements = getAchievementStates()
    const doneAchievements = achievements.filter(item => item.done).length
    const achievementLink = this.add.text(x + 16, y + 139, '実績 ' + doneAchievements + '/' + achievements.length + ' ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.oceanDeep }).setOrigin(0, 0.5).setDepth(6)
    achievementLink.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('AchievementScene'))
    const workshop = this.add.text(x + w - 16, y + 139, '工房へ ›', { fontFamily: FONT, resolution: TEXT_RES, fontSize: '11px', fontWeight: '900', color: UI_COLORS.warning }).setOrigin(1, 0.5).setDepth(6)
    workshop.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('WorkshopScene'))
  }
}
