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

    if (castFragmentPrototypeEnabled()) {
      const approvedSceneFragments = scene.add.image(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2,
        ASSETS.ui.fishingApprovedCastSceneFragments.key,
      ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
      field.add(approvedSceneFragments)
    }

    const fishShadows = L.cast.fish.map((fish, index) => {
      const asset = ASSETS.fishingField.fishShadowMediumIdle
      if (asset?.key && scene.textures.exists(asset.key)) {
        return scene.add.image(fish.x, fish.y, asset.key)
          .setDisplaySize(fish.width, Math.round(fish.width * 0.5))
          .setAlpha(index === 0 ? 0.70 : 0.46)
      }
      const fallback = scene.add.ellipse(fish.x, fish.y, fish.width, Math.round(fish.width * 0.34), 0x08283a, index === 0 ? 0.70 : 0.46)
      return fallback
    })

    const target = scene.add.graphics()
    target.fillStyle(0xffd95a, 0.10)
    target.fillEllipse(L.cast.target.x, L.cast.target.y, 74, 34)
    target.lineStyle(3, 0xffe88a, 0.92)
    target.strokeEllipse(L.cast.target.x, L.cast.target.y, 74, 34)
    target.lineStyle(1.4, 0xffffff, 0.74)
    target.strokeEllipse(L.cast.target.x, L.cast.target.y, 42, 20)
    for (let i = 0; i < 5; i += 1) {
      const t = (i + 1) / 6
      const sx = L.cast.player.x + 34
      const sy = L.cast.player.y - 112
      const x = sx + (L.cast.target.x - sx) * t
      const y = sy + (L.cast.target.y - sy) * t - Math.sin(Math.PI * t) * 74
      target.fillStyle(0xffffff, 0.76 - i * 0.08)
      target.fillCircle(x, y, Math.max(2, 4 - i * 0.35))
    }

    const playerAsset = ASSETS.characters?.fishingCastHero
    const player = playerAsset?.key && scene.textures.exists(playerAsset.key)
      ? scene.add.image(L.cast.player.x + 10, L.cast.player.y + 8, playerAsset.key)
        .setOrigin(0.5, 1)
        .setDisplaySize(154, 220)
      : null
    field.add([...fishShadows, target, ...(player ? [player] : [])])

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
    dock.add([dockBase, dockInstruction, powerLabel, powerTrack, powerFill, buttonBase, buttonRing, castIcon, castLabel])

    const backHit = scene.add.rectangle(31, 40, 54, 52, 0x000000, 0).setInteractive({ useHandCursor: true })
    backHit.on('pointerdown', pointer => { pointer?.event?.stopPropagation?.(); this.adapter.back() })
    const castHit = scene.add.circle(DESIGN_WIDTH / 2, buttonY, 62, 0x000000, 0).setInteractive({ useHandCursor: true })
    const pressables = [buttonBase, buttonRing, castIcon, castLabel]
    const resetScale = () => pressables.forEach(item => item.setScale(1))
    castHit.on('pointerdown', pointer => {
      pointer?.event?.stopPropagation?.()
      if (this.adapter.beginCharge()) pressables.forEach(item => item.setScale(0.96))
    })
    castHit.on('pointerup', pointer => { pointer?.event?.stopPropagation?.(); resetScale(); this.adapter.releaseCharge() })
    castHit.on('pointerupoutside', () => { resetScale(); this.adapter.cancelCharge() })
    interaction.add([backHit, castHit])

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
    }
    this.layout()
    this.sync()
    return this
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
    const visible = view.phase === 'cast'
    this.root.setVisible(visible)
    if (!visible) return
    this.nodes.location.setText(view.locationLabel)
    this.nodes.distance.setText(view.distanceLabel)
    this.nodes.powerFill.clear()
    this.nodes.powerFill.fillStyle(0xffdc54, 1)
    this.nodes.powerFill.fillRoundedRect(67, DOCK_TOP + 52, 288 * view.charge01, 8, 4)
  }

  destroy() {
    this.root?.destroy?.(true)
    this.root = null
    this.nodes = null
  }
}
