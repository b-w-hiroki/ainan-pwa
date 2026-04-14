import Phaser from 'phaser'
import { FONT, TITLE_SHADOW } from '../config/fontStyles.js'
import { C, CS, COLOR } from '../config/palette.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const FISHING_POINTS = [
  {
    id:          'pointA',
    name:        '愛南港',
    description: 'アジ・マダイが狙える定番ポイント',
    difficulty:  '★☆☆',
    fish:        ['アジ', 'マダイ', 'ブリ'],
    x: 0.3, y: 0.45,
  },
  {
    id:          'pointB',
    name:        '内海湾',
    description: 'バスが潜む穴場スポット',
    difficulty:  '★★☆',
    fish:        ['アジ', 'ブラックバス'],
    x: 0.6, y: 0.35,
  },
  {
    id:          'pointC',
    name:        '深海岬',
    description: '伝説のクエが眠る激難ポイント',
    difficulty:  '★★★',
    fish:        ['マダイ', 'ブリ', 'クエ'],
    x: 0.75, y: 0.6,
  },
]

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' })
  }

  create() {
    const { width: W, height: H } = this.scale

    // 背景
    const bg = this.add.graphics().setDepth(0)
    bg.fillGradientStyle(0xd8f4ff, 0xd8f4ff, 0xa8ddf0, 0xa8ddf0, 1)
    bg.fillRect(0, 0, W, H)

    // タイトル
    this.add.text(W / 2, 44, '釣り場を選ぼう', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '32px', fontStyle: '700',
      color: COLOR.TEXT1,
      shadow: TITLE_SHADOW,
    }).setOrigin(0.5).setDepth(1)

    // 釣り場カードを縦に並べる
    FISHING_POINTS.forEach((point, i) => {
      this._buildPointCard(point, W, 130 + i * 160)
    })

    // ホームへ戻るボタン
    this._buildBackBtn(W, H)
  }

  _buildPointCard(point, W, cy) {
    const cardX = W * 0.1
    const cardW = W * 0.8
    const cardH = 130
    const cardY = cy - cardH / 2

    const card = this.add.graphics().setDepth(1)
    const drawCard = (fillColor, fillAlpha) => {
      card.clear()
      card.fillStyle(fillColor, fillAlpha)
      card.lineStyle(2.5, C.OUTLINE, 1)
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 16)
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 16)
    }
    drawCard(0xffffff, 0.95)

    // 難易度バッジ（右上）
    this.add.text(cardX + cardW - 14, cardY + 14, point.difficulty, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '14px', fontStyle: '700', color: COLOR.GOLD,
    }).setOrigin(1, 0).setDepth(2)

    // ポイント名
    this.add.text(cardX + 18, cy - 32, point.name, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '22px', fontStyle: '700', color: COLOR.TEXT1,
    }).setOrigin(0, 0.5).setDepth(2)

    // 説明
    this.add.text(cardX + 18, cy, point.description, {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontStyle: '700', color: COLOR.TEXT2,
    }).setOrigin(0, 0.5).setDepth(2)

    // 出現魚リスト
    this.add.text(cardX + 18, cy + 28, '🐟 ' + point.fish.join('・'), {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '12px', fontStyle: '700', color: COLOR.BLUE,
    }).setOrigin(0, 0.5).setDepth(2)

    // 「→ 釣りへ」ラベル
    this.add.text(cardX + cardW - 14, cy + 28, '釣りへ →', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '13px', fontStyle: '700', color: COLOR.WARN,
    }).setOrigin(1, 0.5).setDepth(2)

    // 透明ヒットエリア（カード全体をインタラクティブに）
    this.add.rectangle(W / 2, cy, cardW, cardH)
      .setDepth(3)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._goToFishing(point.id))
      .on('pointerover', () => drawCard(0xd0f0ff, 0.98))
      .on('pointerout',  () => drawCard(0xffffff, 0.95))
  }

  _buildBackBtn(W, H) {
    const backW = Math.floor(W * 0.55)
    const backH = 52
    const back  = this.add.container(W / 2, H - 56).setDepth(5)
    back.setSize(backW, backH)

    const g = this.add.graphics()
    const drawBack = (fill) => {
      g.clear()
      g.fillStyle(fill, 1)
      g.lineStyle(2.5, C.OUTLINE, 1)
      g.fillRoundedRect(-backW / 2, -backH / 2, backW, backH, 14)
      g.strokeRoundedRect(-backW / 2, -backH / 2, backW, backH, 14)
    }
    drawBack(0xd0f0ff)

    const lbl = this.add.text(0, 0, 'ホームへ戻る', {
      fontFamily: FONT, resolution: TEXT_RES,
      fontSize: '20px', fontStyle: '700', color: COLOR.TEXT1,
    }).setOrigin(0.5)

    back.add([g, lbl])
    back.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('HomeScene'))
      .on('pointerover', () => drawBack(0xa8ddf0))
      .on('pointerout',  () => drawBack(0xd0f0ff))
  }

  _goToFishing(pointId) {
    this.scene.start('GameScene', {
      point:     pointId,
      season:    this._getCurrentSeason(),
      weather:   'sunny',
      timeOfDay: this._getCurrentTimeOfDay(),
    })
  }

  _getCurrentSeason() {
    const m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5)  return 'spring'
    if (m >= 6 && m <= 8)  return 'summer'
    if (m >= 9 && m <= 11) return 'autumn'
    return 'winter'
  }

  _getCurrentTimeOfDay() {
    const h = new Date().getHours()
    if (h >= 5  && h < 10) return 'morning'
    if (h >= 10 && h < 16) return 'noon'
    if (h >= 16 && h < 19) return 'evening'
    return 'night'
  }
}
