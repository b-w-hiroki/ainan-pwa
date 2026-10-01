import { ASSETS } from '../../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from '../layouts/fishingMockLayout.js'
import { readCastViewModel } from './CastViewModel.js'
import { CastSceneAdapter } from './CastSceneAdapter.js'

const DESIGN_WIDTH = 390
const DESIGN_HEIGHT = 844
const DOCK_TOP = 620

export function castPresentationMode() {
  if (typeof window === 'undefined') return 'host'
  return new URLSearchParams(window.location.search).get('castPresentation') === 'legacy'
    ? 'legacy'
    : 'host'
}

function castFragmentPrototypeEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('castFragments') === '1'
}

function castPlayerCutoutPrototypeEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('castPlayerCutout') === '1'
}

function castCompositePrototypeEnabled() {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get('castComposite') !== '0'
}

export class CastPresentationHost {
  constructor(scene) {
    this.scene = scene
    this.adapter = new CastSceneAdapter(scene)
    this.root = null
    this.nodes = null
  }

  mount() {
    if (this.root?.active) return this
    const scene = this.scene
    const root = scene.add.container(0, 0).setDepth(6000).setScrollFactor(0)
    root.name = 'cast-presentation-host'

    const field = scene.add.container(0, 0)
    const chrome = scene.add.container(0, 0)
    const dock = scene.add.container(0, 0)
    const interaction = scene.add.container(0, 0)
    root.add([field, chrome, dock, interaction])
    const castField = scene.add.container(0, 0)
    const retrieveField = scene.add.container(0, 0)
    const castDock = scene.add.container(0, 0)
    const retrieveDock = scene.add.container(0, 0)
    const castInteraction = scene.add.container(0, 0)
    const retrieveInteraction = scene.add.container(0, 0)
    field.add([castField, retrieveField])
    dock.add([castDock, retrieveDock])
    interaction.add([castInteraction, retrieveInteraction])

    const useApprovedComposite = castCompositePrototypeEnabled()
    if (useApprovedComposite) {
      castField.add(scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCastHarborBase.key)
        .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT))
    }

    if (!useApprovedComposite && castFragmentPrototypeEnabled()) {
      const approvedSceneFragments = scene.add.image(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2,
        ASSETS.ui.fishingApprovedCastSceneFragments.key,
      ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
      castField.add(approvedSceneFragments)
    }

    const fishLayout = useApprovedComposite
      ? [
          { x: 133, y: 193, width: 88 },
          { x: 98, y: 318, width: 78 },
          { x: 309, y: 368, width: 72 },
        ]
      : L.cast.fish
    const fishShadows = fishLayout.map((fish, index) => {
      const asset = ASSETS.fishingField.fishShadowMediumIdle
      if (asset?.key && scene.textures.exists(asset.key)) {
        return scene.add.image(fish.x, fish.y, asset.key)
          .setDisplaySize(fish.width, Math.round(fish.width * 0.5))
          .setAlpha(index === 0 ? 0.70 : 0.46)
      }
      const fallback = scene.add.ellipse(fish.x, fish.y, fish.width, Math.round(fish.width * 0.34), 0x08283a, index === 0 ? 0.70 : 0.46)
      return fallback
    })

    const targetX = useApprovedComposite ? 310 : L.cast.target.x
    const targetY = useApprovedComposite ? 235 : L.cast.target.y
    const target = scene.add.graphics()
    target.fillStyle(0xffd95a, 0.10)
    target.fillEllipse(targetX, targetY, 74, 34)
    target.lineStyle(3, 0xffe88a, 0.92)
    target.strokeEllipse(targetX, targetY, 74, 34)
    target.lineStyle(1.4, 0xffffff, 0.74)
    target.strokeEllipse(targetX, targetY, 42, 20)
    const castStartX = useApprovedComposite ? 169 : L.cast.player.x + 34
    const castStartY = useApprovedComposite ? 379 : L.cast.player.y - 112
    for (let i = 0; i < 5; i += 1) {
      const t = (i + 1) / 6
      const x = castStartX + (targetX - castStartX) * t
      const y = castStartY + (targetY - castStartY) * t - Math.sin(Math.PI * t) * (useApprovedComposite ? 26 : 74)
      target.fillStyle(0xffffff, 0.76 - i * 0.08)
      target.fillCircle(x, y, Math.max(2, 4 - i * 0.35))
    }

    if (useApprovedComposite) {
      target.lineStyle(5, 0x122434, 0.98)
      target.beginPath()
      target.moveTo(130, 486)
      target.lineTo(151, 429)
      target.lineTo(169, 379)
      target.strokePath()
      target.lineStyle(1.5, 0xef8c37, 1)
      target.beginPath()
      target.moveTo(130, 486)
      target.lineTo(151, 429)
      target.lineTo(169, 379)
      target.strokePath()
    }

    const useApprovedPlayerCutout = useApprovedComposite || castPlayerCutoutPrototypeEnabled()
    const playerAsset = useApprovedPlayerCutout
      ? ASSETS.ui.fishingApprovedCastPlayerVisible
      : ASSETS.characters?.fishingCastHero
    const player = playerAsset?.key && scene.textures.exists(playerAsset.key)
      ? useApprovedPlayerCutout
        ? scene.add.image(90 * (390 / 391), 465 * (844 / 783), playerAsset.key)
          .setDisplaySize(180 * (390 / 391), 230 * (844 / 783))
        : scene.add.image(L.cast.player.x + 10, L.cast.player.y + 8, playerAsset.key)
          .setOrigin(0.5, 1)
          .setDisplaySize(154, 220)
      : null
    castField.add([...fishShadows, target, ...(player ? [player] : [])])

    const retrieveBase = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedRetrievePanel.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    retrieveField.add(retrieveBase)

    const hudBase = scene.add.graphics()
    hudBase.fillStyle(0xffffff, 0.96)
    hudBase.fillRoundedRect(10, 14, DESIGN_WIDTH - 20, 52, 15)
    const hudSkin = scene.add.image(10, 14, ASSETS.ui.fishingApprovedTopHud.key)
      .setOrigin(0, 0)
      .setDisplaySize(DESIGN_WIDTH - 20, 52)
    const back = scene.add.text(31, 40, '‹', {
      fontFamily: 'Nunito, sans-serif', fontSize: '38px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0.5)
    const pin = scene.add.text(68, 40, '●', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#176499',
    }).setOrigin(0.5)
    const location = scene.add.text(82, 40, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5)
    const rod = scene.add.text(200, 40, '⌇', {
      fontFamily: 'Nunito, sans-serif', fontSize: '25px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0.5).setRotation(-0.55)
    const distance = scene.add.text(221, 40, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5)
    const tackle = scene.add.text(338, 40, '▣', {
      fontFamily: 'sans-serif', fontSize: '21px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0.5)

    const instruction = scene.add.container(DESIGN_WIDTH / 2, 92)
    const instructionBase = scene.add.graphics()
    instructionBase.fillStyle(0x092b43, 0.86)
    instructionBase.fillRoundedRect(-76, -13, 152, 26, 13)
    const instructionSkin = scene.add.image(0, 0, ASSETS.ui.fishingApprovedInstruction.key).setDisplaySize(152, 26)
    const instructionText = scene.add.text(0, 0, '狙う場所を決める', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    instruction.add([instructionBase, instructionSkin, instructionText])
    chrome.add([hudBase, hudSkin, back, pin, location, rod, distance, tackle, instruction])

    const dockBase = scene.add.graphics()
    dockBase.fillStyle(0x031d2e, 0.94)
    dockBase.fillRect(0, DOCK_TOP, DESIGN_WIDTH, DESIGN_HEIGHT - DOCK_TOP)
    dockBase.lineStyle(1.5, 0xc9f4ff, 0.34)
    dockBase.lineBetween(0, DOCK_TOP, DESIGN_WIDTH, DOCK_TOP)
    const dockInstruction = scene.add.text(DESIGN_WIDTH / 2, DOCK_TOP + 22, '長押し → 離して投げる', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    const powerLabel = scene.add.text(22, DOCK_TOP + 55, 'パワー', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5)
    const powerTrack = scene.add.graphics()
    powerTrack.fillStyle(0x082b45, 1)
    powerTrack.fillRoundedRect(64, DOCK_TOP + 49, 294, 14, 7)
    powerTrack.lineStyle(1.4, 0xb8eaff, 0.72)
    powerTrack.strokeRoundedRect(64, DOCK_TOP + 49, 294, 14, 7)
    const powerFill = scene.add.graphics()

    const buttonY = DOCK_TOP + 128
    const buttonBase = scene.add.circle(DESIGN_WIDTH / 2, buttonY, 55, 0xffd957, 1)
      .setStrokeStyle(3, 0xfff1a1, 1)
    const buttonRing = scene.add.image(DESIGN_WIDTH / 2, buttonY, ASSETS.ui.fishingApprovedCastRing.key)
      .setDisplaySize(130, 130)
    const castIcon = scene.add.graphics().setPosition(DESIGN_WIDTH / 2, buttonY - 18)
    castIcon.lineStyle(3, 0x102b43, 1)
    castIcon.beginPath()
    castIcon.moveTo(-22, 12)
    castIcon.lineTo(-14, -4)
    castIcon.lineTo(-3, -14)
    castIcon.lineTo(9, -19)
    castIcon.lineTo(21, -16)
    castIcon.lineTo(27, -10)
    castIcon.strokePath()
    castIcon.strokeCircle(-13, 7, 7)
    const castLabel = scene.add.text(DESIGN_WIDTH / 2, buttonY + 25, '投げる', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#102335',
    }).setOrigin(0.5)
    castDock.add([dockBase, dockInstruction, powerLabel, powerTrack, powerFill, buttonBase, buttonRing, castIcon, castLabel])

    const backHit = scene.add.rectangle(31, 40, 54, 52, 0x000000, 0.001).setInteractive({ useHandCursor: true })
    const castHit = scene.add.circle(DESIGN_WIDTH / 2, buttonY, 62, 0x000000, 0.001).setInteractive({ useHandCursor: true })
    const pressables = [buttonBase, buttonRing, castIcon, castLabel]
    const resetScale = () => pressables.forEach(item => item.setScale(1))
    castHit.on('pointerdown', pointer => {
      pointer?.event?.stopPropagation?.()
      if (this.adapter.beginCharge()) pressables.forEach(item => item.setScale(0.96))
    })
    castHit.on('pointerup', pointer => { pointer?.event?.stopPropagation?.(); resetScale(); this.adapter.releaseCharge() })
    castHit.on('pointerupoutside', () => { resetScale(); this.adapter.cancelCharge() })
    castInteraction.add(castHit)
    interaction.add(backHit)

    this.root = root
    this.nodes = {
      location,
      distance,
      powerFill,
      hudSkin,
      instruction,
      instructionSkin,
      buttonRing,
      castHit,
      backHit,
      castField,
      retrieveField,
      castDock,
      retrieveDock,
      castInteraction,
      retrieveInteraction,
      chrome,
    }
    this.layout()
    this.sync()
    scene.scale.on('resize', this.layout, this)
    scene.input.on('pointerdown', this._onHostPointerDown, this)
    scene.input.on('pointerup', this._onHostPointerUp, this)
    return this
  }

  _designPoint(pointer) {
    const scale = this.root?.scaleX || 1
    return { x: (pointer.x - this.root.x) / scale, y: (pointer.y - this.root.y) / scale }
  }

  _onHostPointerDown(pointer) {
    if (!['cast', 'retrieve'].includes(this.scene.phase) || !this.root?.visible) return
    const point = this._designPoint(pointer)
    if (point.x <= 58 && point.y <= 68) {
      this.adapter.back()
      return
    }
    if (this.scene.phase !== 'retrieve') return
    if (Math.hypot(point.x - 72, point.y - (DOCK_TOP + 126)) <= 48) this.adapter.retrieveWait()
    else if (Math.hypot(point.x - 195, point.y - (DOCK_TOP + 126)) <= 48) this.adapter.retrieveTwitch()
    else if (Math.hypot(point.x - 318, point.y - (DOCK_TOP + 126)) <= 48) {
      this._slowPointerHeld = this.adapter.beginSlowRetrieve()
    }
  }

  _onHostPointerUp() {
    if (!this._slowPointerHeld) return
    this._slowPointerHeld = false
    this.adapter.endSlowRetrieve()
  }

  layout() {
    if (!this.root?.active) return
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
    this.root.setScale(scale)
    this.root.setPosition((width - DESIGN_WIDTH * scale) / 2, (height - DESIGN_HEIGHT * scale) / 2)
  }

  sync() {
    if (!this.root?.active) return
    const view = readCastViewModel(this.scene)
    const castVisible = view.phase === 'cast'
    const retrieveVisible = view.phase === 'retrieve'
    const visible = castVisible || retrieveVisible
    this.root.setVisible(visible)
    if (!visible) return
    this.nodes.castField.setVisible(castVisible)
    this.nodes.retrieveField.setVisible(retrieveVisible)
    this.nodes.castDock.setVisible(castVisible)
    this.nodes.retrieveDock.setVisible(false)
    this.nodes.castInteraction.setVisible(castVisible)
    this.nodes.retrieveInteraction.setVisible(retrieveVisible)
    this.nodes.chrome.setVisible(castVisible)
    this.nodes.instruction.setVisible(castVisible)
    this.nodes.location.setText(view.locationLabel)
    this.nodes.distance.setText(view.distanceLabel)
    if (castVisible) {
      this.nodes.powerFill.clear()
      this.nodes.powerFill.fillStyle(0xffdc54, 1)
      this.nodes.powerFill.fillRoundedRect(67, DOCK_TOP + 52, 288 * view.charge01, 8, 4)
    }
  }

  destroy() {
    this.scene.scale?.off?.('resize', this.layout, this)
    this.scene.input?.off?.('pointerdown', this._onHostPointerDown, this)
    this.scene.input?.off?.('pointerup', this._onHostPointerUp, this)
    this._slowPointerHeld = false
    this.root?.destroy?.(true)
    this.root = null
    this.nodes = null
  }
}
