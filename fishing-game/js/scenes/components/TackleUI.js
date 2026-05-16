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
    this._openPanel = null
    this._objects   = []
    this._scrollFns = []
  }

  build(W, H) {
    const MARGIN = 16
    const BTN_W  = 58
    const BTN_H  = 58
    const BTN_Y  = H - MARGIN - BTN_H / 2

    this._rodBtn  = this._buildBtn(W - MARGIN - BTN_W * 1.5 - 8, BTN_Y, ICONS.ROD,  '竿',   () => this._toggle('rod'))
    this._baitBtn = this._buildBtn(W - MARGIN - BTN_W / 2,        BTN_Y, ICONS.BAIT, 'エサ', () => this._toggle('bait'))

    this._rodPanel  = this._buildScrollPanel(W, H, 'rod',  ROD_LIST)
    this._baitPanel = this._buildScrollPanel(W, H, 'bait', BAIT_LIST)

    this._rodPanel.setVisible(false)
    this._baitPanel.setVisible(false)
  }

  _buildBtn(x, y, icon, label, onTap) {
    const g = this.scene.add.graphics().setDepth(45)
    this._drawBtnBg(g, x, y, 58, 58, false)

    const iconTxt = this.scene.add.text(x, y - 8, icon, {
      fontSize: '22px', resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(46)

    const lbl = this.scene.add.text(x, y + 14, label, {
      fontFamily: FONT, fontSize: '12px', fontWeight: '700',
      color: CS, resolution: TEXT_RES,
    }).setOrigin(0.5).setDepth(46)

    const hit = this.scene.add.rectangle(x, y, 58, 58)
      .setDepth(47)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (this._enabled) onTap() })
      .on('pointerover', () => this._drawBtnBg(g, x, y, 58, 58, true))
      .on('pointerout',  () => this._drawBtnBg(g, x, y, 58, 58, false))

    this._objects.push(g, iconTxt, lbl, hit)
    return { g, iconTxt, lbl, hit }
  }

  _drawBtnBg(g, x, y, w, h, hover) {
    g.clear()
    g.fillStyle(hover ? 0xd0f0ff : 0xffffff, 0.92)
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12)
    g.lineStyle(2.5, 0x1a2a3a, 1)
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12)
  }

  _buildScrollPanel(W, H, type, items) {
    const PANEL_W   = W * 0.85
    const PANEL_H   = 145
    const PANEL_X   = W / 2
    const PANEL_Y   = H - 90 - PANEL_H / 2
    const ITEM_W    = 90
    const ITEM_H    = 100
    const GAP       = 12
    const VISIBLE   = Math.floor(PANEL_W / (ITEM_W + GAP))
    const SCROLL_LEFT = PANEL_X - PANEL_W / 2 + GAP

    const container = this.scene.add.container(0, 0).setDepth(48)

    const bg = this.scene.add.graphics()
    bg.fillStyle(0x1a2a3a, 0.96)
    bg.fillRoundedRect(PANEL_X - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 14)
    bg.lineStyle(2, 0xffffff, 0.8)
    bg.strokeRoundedRect(PANEL_X - PANEL_W / 2, PANEL_Y - PANEL_H / 2, PANEL_W, PANEL_H, 14)
    container.add(bg)

    const label = type === 'rod' ? `${ICONS.ROD} 竿を選ぶ` : `${ICONS.BAIT} エサを選ぶ`
    const title = this.scene.add.text(PANEL_X, PANEL_Y - PANEL_H / 2 + 14, label, {
      fontFamily: FONT, fontSize: '14px', fontWeight: '800',
      color: '#ffffff', resolution: TEXT_RES,
    }).setOrigin(0.5, 0)
    container.add(title)

    const scrollContainer = this.scene.add.container(SCROLL_LEFT, 0).setDepth(49)

    const selectedId = type === 'rod'
      ? this.scene.env?.player?.rodType
      : this.scene.env?.player?.baitType

    items.forEach((item, i) => {
      const itemX = ITEM_W / 2 + i * (ITEM_W + GAP)
      const itemY = PANEL_Y + 10
      this._buildScrollItem(scrollContainer, itemX, itemY, ITEM_W, ITEM_H, item, type, selectedId)
    })

    container.add(scrollContainer)

    const maskShape = this.scene.make.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(
      PANEL_X - PANEL_W / 2 + GAP,
      PANEL_Y - PANEL_H / 2 + 34,
      PANEL_W - GAP * 2,
      PANEL_H - 44,
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

  _buildScrollItem(container, x, y, w, h, item, type, selectedId) {
    const inventory = this.scene.env?.player?.inventory
    const qty = type === 'rod'
      ? (inventory?.rods?.[item.id]  ?? 1)
      : (inventory?.baits?.[item.id] ?? 0)

    const isSelected = item.id === selectedId
    const isOwned    = qty > 0

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

    const iconStr = isOwned ? item.icon : ICONS.LOCK
    const iconTxt = this.scene.add.text(x, y - 18, iconStr, {
      fontSize: isOwned ? '28px' : '20px', resolution: TEXT_RES,
    }).setOrigin(0.5).setAlpha(isOwned ? 1 : 0.5)
    container.add(iconTxt)

    if (qty > 0) {
      const badge = this.scene.add.graphics()
      badge.fillStyle(0x1a2a3a, 0.85)
      badge.fillRoundedRect(x + w / 2 - 22, y - h / 2 + 4, 20, 16, 4)
      container.add(badge)

      const qtyText = this.scene.add.text(x + w / 2 - 12, y - h / 2 + 12, `×${qty}`, {
        fontFamily: FONT, fontSize: '10px', fontWeight: '800',
        color: '#ffffff', resolution: TEXT_RES,
      }).setOrigin(0.5)
      container.add(qtyText)
    }

    const name = this.scene.add.text(x, y + 10, item.name, {
      fontFamily: FONT, fontSize: '13px', fontWeight: '700',
      color: isOwned ? '#ffffff' : '#666666', resolution: TEXT_RES,
    }).setOrigin(0.5)
    container.add(name)

    const desc = this.scene.add.text(x, y + 28, item.description, {
      fontFamily: FONT, fontSize: '10px', color: '#aaccdd',
      wordWrap: { width: w - 8 }, align: 'center', resolution: TEXT_RES,
    }).setOrigin(0.5)
    container.add(desc)

    if (isOwned) {
      const hit = this.scene.add.rectangle(x, y, w, h)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (type === 'rod')  this.scene.env.player.rodType  = item.id
          if (type === 'bait') this.scene.env.player.baitType = item.id
          this._closePanel()
          this._updateBtnIcon(type, item.icon)
        })
      container.add(hit)
    }
  }

  _buildScrollIndicator(container, cx, y, total, visible) {
    const dotCount = Math.ceil(total / visible)
    const DOT_R = 3
    const DOT_GAP = 8
    const totalW = dotCount * DOT_R * 2 + (dotCount - 1) * DOT_GAP
    for (let i = 0; i < dotCount; i++) {
      const dot = this.scene.add.graphics()
      dot.fillStyle(i === 0 ? 0x1a2a3a : 0xcccccc, 1)
      dot.fillCircle(cx - totalW / 2 + DOT_R + i * (DOT_R * 2 + DOT_GAP), y, DOT_R)
      container.add(dot)
    }
  }

  _toggle(type) {
    if (this._openPanel === type) { this._closePanel(); return }
    this._closePanel()
    this._openPanel = type
    const panel = type === 'rod' ? this._rodPanel : this._baitPanel
    panel.setVisible(true).setAlpha(0).setY(30)
    this.scene.tweens.add({
      targets: panel, alpha: 1, y: 0,
      duration: 220, ease: 'Sine.easeOut',
    })
  }

  _closePanel() {
    this._rodPanel?.setVisible(false).setY(0)
    this._baitPanel?.setVisible(false).setY(0)
    this._openPanel = null
  }

  _updateBtnIcon(type, icon) {
    if (type === 'rod')  this._rodBtn?.iconTxt.setText(icon)
    if (type === 'bait') this._baitBtn?.iconTxt.setText(icon)
  }

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

  destroy() {
    this._scrollFns.forEach(fn => fn())
    this._scrollFns = []
    this._objects.forEach(o => o?.destroy())
    this._objects = []
  }
}
