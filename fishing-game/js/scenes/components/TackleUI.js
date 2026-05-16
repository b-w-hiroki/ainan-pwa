import { FONT } from '../../config/fontStyles.js'
import { CS, COLOR } from '../../config/palette.js'
import { ICONS } from '../../config/icons.js'
import { ROD_LIST, BAIT_LIST } from '../../game/params.js'

const TEXT_RES = window.devicePixelRatio ?? 1

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export class TackleUI {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene      = scene
    this._enabled   = true
    this._openPanel = null  // 'rod' | 'bait' | null
    this._objects   = []
    this._scrollFns = []
  }

  build(W, H) {
    const MARGIN = 16
    const PILL_H = 52
    const PILL_W = (W - MARGIN * 2 - 8) / 2
    const PILL_Y = H - MARGIN - PILL_H / 2

    this._rodBtn  = this._buildPill(MARGIN + PILL_W / 2,     PILL_Y, PILL_W, PILL_H, 'rod',  () => this._toggle('rod'))
    this._baitBtn = this._buildPill(W - MARGIN - PILL_W / 2, PILL_Y, PILL_W, PILL_H, 'bait', () => this._toggle('bait'))

    this._rodPanel  = this._buildScrollPanel(W, H, 'rod',  ROD_LIST)
    this._baitPanel = this._buildScrollPanel(W, H, 'bait', BAIT_LIST)

    this._rodPanel.setVisible(false)
    this._baitPanel.setVisible(false)

    this._syncPillsFromEnv()
  }

  // ===== 横長ピルボタン =====
  _buildPill(x, y, w, h, type, onTap) {
    const g = this.scene.add.graphics().setDepth(45)
    this._drawPillBg(g, x, y, w, h, false)

    const kindLabel = type === 'rod' ? '竿' : 'エサ'
    const icon      = type === 'rod' ? ICONS.ROD : ICONS.BAIT

    const iconTxt = this.scene.add.text(x - w / 2 + 18, y, icon, {
      fontSize: '24px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(46)

    const kindTxt = this.scene.add.text(x - w / 2 + 42, y - 10, kindLabel, {
      fontFamily: FONT, fontSize: '12px', fontStyle: '800',
      color: '#5a7090', resolution: TEXT_RES,
    }).setOrigin(0, 0.5).setDepth(46)

    const nameTxt = this.scene.add.text(x - w / 2 + 42, y + 9, '...', {
      fontFamily: FONT, fontSize: '15px', fontStyle: '800',
      color: '#1a3a5a', resolution: TEXT_RES,
    }).setOrigin(0, 0.5).setDepth(46)

    const chev = this.scene.add.text(x + w / 2 - 12, y, ICONS.ARROW_DN, {
      fontFamily: FONT, fontSize: '13px', fontStyle: '900',
      color: '#1a3a5a', resolution: TEXT_RES,
    }).setOrigin(1, 0.5).setDepth(46).setAlpha(0.55)

    const hit = this.scene.add.rectangle(x, y, w, h)
      .setDepth(47)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (this._enabled) onTap() })
      .on('pointerover', () => this._drawPillBg(g, x, y, w, h, true))
      .on('pointerout',  () => this._drawPillBg(g, x, y, w, h, false))

    this._objects.push(g, iconTxt, kindTxt, nameTxt, chev, hit)
    return { g, iconTxt, kindTxt, nameTxt, chev, hit, type }
  }

  _drawPillBg(g, x, y, w, h, hover) {
    g.clear()
    g.fillStyle(0x000000, 0.18)
    g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 2, w, h, 14)
    g.fillStyle(hover ? 0xfff4cc : 0xffffff, 0.96)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14)
  }

  _syncPillsFromEnv() {
    const rodId  = this.scene.env?.player?.rodType  ?? 'carbon'
    const baitId = this.scene.env?.player?.baitType ?? 'worm'
    const rod  = ROD_LIST.find(r => r.id === rodId)
    const bait = BAIT_LIST.find(b => b.id === baitId)
    this._rodBtn?.nameTxt.setText(rod?.name  ?? '—')
    this._baitBtn?.nameTxt.setText(bait?.name ?? '—')
  }

  // ===== スクロールパネル =====
  _buildScrollPanel(W, H, type, items) {
    const PANEL_W    = W * 0.88
    const PANEL_H    = 152
    const PANEL_X    = W / 2
    const PANEL_Y    = H - 92 - PANEL_H / 2
    const ITEM_W     = 92
    const ITEM_H     = 104
    const GAP        = 12
    const VISIBLE    = Math.floor(PANEL_W / (ITEM_W + GAP))
    const SCROLL_LEFT = PANEL_X - PANEL_W / 2 + GAP

    const container = this.scene.add.container(0, 0).setDepth(48)

    // パネル背景（ダーク）
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x1a2a3a, 0.97)
    bg.fillRoundedRect(PANEL_X - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 16)
    bg.lineStyle(2, 0xffffff, 0.85)
    bg.strokeRoundedRect(PANEL_X - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 16)
    container.add(bg)

    // タイトル
    const label = type === 'rod' ? `${ICONS.ROD} 竿を選ぶ` : `${ICONS.BAIT} エサを選ぶ`
    const title = this.scene.add.text(PANEL_X, PANEL_Y - PANEL_H / 2 + 16, label, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '800',
      color: '#ffffff', resolution: TEXT_RES,
    }).setOrigin(0.5, 0)
    container.add(title)

    const scrollContainer = this.scene.add.container(SCROLL_LEFT, 0).setDepth(49)

    const selectedId = type === 'rod'
      ? this.scene.env?.player?.rodType
      : this.scene.env?.player?.baitType

    items.forEach((item, i) => {
      const itemX = ITEM_W / 2 + i * (ITEM_W + GAP)
      const itemY = PANEL_Y + 14
      this._buildScrollItem(scrollContainer, itemX, itemY, ITEM_W, ITEM_H, item, type, selectedId)
    })

    container.add(scrollContainer)

    // マスク
    const maskShape = this.scene.make.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(
      PANEL_X - PANEL_W / 2 + GAP,
      PANEL_Y - PANEL_H / 2 + 38,
      PANEL_W - GAP * 2,
      PANEL_H - 48,
    )
    scrollContainer.setMask(maskShape.createGeometryMask())

    if (items.length > VISIBLE) {
      this._buildScrollIndicator(container, PANEL_X, PANEL_Y + PANEL_H / 2 - 10, items.length, VISIBLE)
    }

    const cleanup = this._setupScroll(scrollContainer, type, items.length, ITEM_W, GAP, SCROLL_LEFT, PANEL_W)
    this._scrollFns.push(cleanup)

    this._objects.push(container, scrollContainer, maskShape, bg, title)
    return container
  }

  // ===== スワイプスクロール =====
  _setupScroll(scrollContainer, type, itemCount, itemW, gap, baseX, panelW) {
    let startX        = 0
    let currentOffset = 0
    const maxOffset   = Math.max(0, itemCount * (itemW + gap) - panelW + gap * 2)

    const onDown = (p) => {
      if (this._openPanel !== type) return
      startX = p.x
    }

    const onMove = (p) => {
      if (!p.isDown || this._openPanel !== type) return
      const displayOffset = clamp(currentOffset - (p.x - startX), 0, maxOffset)
      scrollContainer.x = baseX - displayOffset
    }

    const onUp = (p) => {
      if (this._openPanel !== type) return
      currentOffset = clamp(currentOffset - (p.x - startX), 0, maxOffset)
      const snapIndex  = Math.round(currentOffset / (itemW + gap))
      const snapOffset = clamp(snapIndex * (itemW + gap), 0, maxOffset)
      this.scene.tweens.add({
        targets: scrollContainer,
        x: baseX - snapOffset,
        duration: 200,
        ease: 'Sine.easeOut',
        onComplete: () => { currentOffset = snapOffset },
      })
    }

    this.scene.input.on('pointerdown', onDown)
    this.scene.input.on('pointermove', onMove)
    this.scene.input.on('pointerup',   onUp)

    return () => {
      this.scene.input.off('pointerdown', onDown)
      this.scene.input.off('pointermove', onMove)
      this.scene.input.off('pointerup',   onUp)
    }
  }

  // ===== アイテムカード =====
  _buildScrollItem(container, x, y, w, h, item, type, selectedId) {
    const inventory = this.scene.env?.player?.inventory
    const qty = type === 'rod'
      ? (inventory?.rods?.[item.id]  ?? 1)
      : (inventory?.baits?.[item.id] ?? 0)

    const isSelected = item.id === selectedId
    const isOwned    = qty > 0

    // カード背景
    const bg = this.scene.add.graphics()
    bg.fillStyle(
      !isOwned   ? 0x111111 :
      isSelected ? 0x2a4a6a : 0x2c3e50,
      isOwned ? 1 : 0.5,
    )
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10)
    bg.lineStyle(
      isSelected ? 2.5 : 1,
      isSelected ? 0x55ccff : 0xffffff,
      isSelected ? 1 : 0.4,
    )
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10)
    container.add(bg)

    // アイコン
    const iconTxt = this.scene.add.text(x, y - 22, isOwned ? item.icon : ICONS.LOCK, {
      fontSize: isOwned ? '30px' : '22px', resolution: TEXT_RES,
    }).setOrigin(0.5).setAlpha(isOwned ? 1 : 0.5)
    container.add(iconTxt)

    // 個数バッジ
    if (qty > 0) {
      const badge = this.scene.add.graphics()
      badge.fillStyle(0x1a2a3a, 0.85)
      badge.fillRoundedRect(x + w / 2 - 24, y - h / 2 + 4, 22, 18, 5)
      container.add(badge)

      const qtyText = this.scene.add.text(x + w / 2 - 13, y - h / 2 + 13, `×${qty}`, {
        fontFamily: FONT, fontSize: '11px', fontStyle: '800',
        color: '#ffffff', resolution: TEXT_RES,
      }).setOrigin(0.5)
      container.add(qtyText)
    }

    // アイテム名
    const name = this.scene.add.text(x, y + 12, item.name, {
      fontFamily: FONT, fontSize: '13px', fontStyle: '800',
      color: isOwned ? '#ffffff' : '#666666', resolution: TEXT_RES,
    }).setOrigin(0.5)
    container.add(name)

    // 説明文
    const desc = this.scene.add.text(x, y + 29, item.description, {
      fontFamily: FONT, fontSize: '10px', color: '#aaccdd',
      wordWrap: { width: w - 8 }, align: 'center', resolution: TEXT_RES,
    }).setOrigin(0.5)
    container.add(desc)

    // タップ（所持のみ）
    if (isOwned) {
      const hit = this.scene.add.rectangle(x, y, w, h)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (type === 'rod')  this.scene.env.player.rodType  = item.id
          if (type === 'bait') this.scene.env.player.baitType = item.id
          this._closePanel()
          this._syncPillsFromEnv()
        })
      container.add(hit)
    }
  }

  // ===== ドットインジケーター =====
  _buildScrollIndicator(container, cx, y, total, visible) {
    const dotCount = Math.ceil(total / visible)
    const DOT_R = 3
    const DOT_GAP = 8
    const totalW = dotCount * DOT_R * 2 + (dotCount - 1) * DOT_GAP
    for (let i = 0; i < dotCount; i++) {
      const dot = this.scene.add.graphics()
      dot.fillStyle(i === 0 ? 0xffd900 : 0x4a6a8a, 1)
      dot.fillCircle(cx - totalW / 2 + DOT_R + i * (DOT_R * 2 + DOT_GAP), y, DOT_R)
      container.add(dot)
    }
  }

  // ===== パネル開閉 =====
  _toggle(type) {
    if (this._openPanel === type) { this._closePanel(); return }
    this._closePanel()
    this._openPanel = type
    if (type === 'rod')  this._rodPanel.setVisible(true)
    if (type === 'bait') this._baitPanel.setVisible(true)
  }

  _closePanel() {
    this._rodPanel?.setVisible(false)
    this._baitPanel?.setVisible(false)
    this._openPanel = null
  }

  // ===== キャスト干渉ガード =====
  /**
   * 指定ポインターがタックルUIの操作領域に当たっているかを返す。
   * ピルボタンエリア（下部 PILL_H + MARGIN）またはパネル開放中は true。
   * @param {{ y: number }} pointer
   */
  isBlockingPointer(pointer) {
    // パネルが開いている間は全体をブロック
    if (this._openPanel !== null) return true
    // ピルボタンエリア（画面下端 70px）へのタップをブロック
    const { height: H } = this.scene.scale
    return pointer.y > H - 70
  }

  // ===== フェーズ制御 =====
  enable() {
    this._enabled = true
    this._rodBtn?.hit.setAlpha(1)
    this._baitBtn?.hit.setAlpha(1)
  }

  disable() {
    this._enabled = false
    this._closePanel()
    this._rodBtn?.hit.setAlpha(0.4)
    this._baitBtn?.hit.setAlpha(0.4)
  }

  // ===== 破棄 =====
  destroy() {
    this._scrollFns.forEach(fn => fn())
    this._scrollFns = []
    this._objects.forEach(o => o?.destroy())
    this._objects = []
  }
}
