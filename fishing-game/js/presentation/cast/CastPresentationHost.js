import { ASSETS } from '../../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from '../layouts/fishingMockLayout.js'
import { readCastViewModel } from './CastViewModel.js'
import { CastSceneAdapter } from './CastSceneAdapter.js'
import { CAST_LAYER_CONFIG, readCastLayerDevOptions } from './castLayerConfig.js'
import { applyCastLayerAdjustment, createLayeredCastScene } from './CastLayeredScene.js'
import { CharacterMotionController } from './CharacterMotionController.js'

const DESIGN_WIDTH = CAST_LAYER_CONFIG.design.width
const DESIGN_HEIGHT = CAST_LAYER_CONFIG.design.height
const DOCK_TOP = CAST_LAYER_CONFIG.dockTop

const FISH_ART = Object.freeze({
  aji: ASSETS.fishHeroes.aji,
  tai: ASSETS.ui.fishingApprovedMadaiLive,
  bass: ASSETS.fish.blackBassIcon,
  buri: ASSETS.fishHeroes.buri,
  kue: ASSETS.fishHeroes.kue,
  saba: ASSETS.fish.sabaIcon,
  isaki: ASSETS.fish.isakiIcon,
  hirame: ASSETS.fish.hirameIcon,
  kanpachi: ASSETS.fish.kanpachiIcon,
})

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
    const battleField = scene.add.container(0, 0)
    const resultField = scene.add.container(0, 0)
    const castDock = scene.add.container(0, 0)
    const retrieveDock = scene.add.container(0, 0)
    const castInteraction = scene.add.container(0, 0)
    const retrieveInteraction = scene.add.container(0, 0)
    field.add([castField, retrieveField, battleField, resultField])
    dock.add([castDock, retrieveDock])
    interaction.add([castInteraction, retrieveInteraction])

    const useApprovedComposite = castCompositePrototypeEnabled()
    const layerOptions = readCastLayerDevOptions(typeof window === 'undefined' ? '' : window.location.search)
    const useLayeredScene = layerOptions.enabled
    let layeredScene = null
    if (useLayeredScene) {
      layeredScene = createLayeredCastScene(scene)
      castField.add(layeredScene.root)
    } else if (useApprovedComposite) {
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

    const fishLayout = useApprovedComposite || useLayeredScene
      ? CAST_LAYER_CONFIG.fish
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

    const targetX = useApprovedComposite || useLayeredScene ? CAST_LAYER_CONFIG.target.x : L.cast.target.x
    const targetY = useApprovedComposite || useLayeredScene ? CAST_LAYER_CONFIG.target.y : L.cast.target.y
    const target = scene.add.graphics()
    target.fillStyle(0xffd95a, 0.10)
    target.fillEllipse(targetX, targetY, 74, 34)
    target.lineStyle(3, 0xffe88a, 0.92)
    target.strokeEllipse(targetX, targetY, 74, 34)
    target.lineStyle(1.4, 0xffffff, 0.74)
    target.strokeEllipse(targetX, targetY, 42, 20)
    const castStartX = useApprovedComposite || useLayeredScene ? CAST_LAYER_CONFIG.rod.lineStart.x : L.cast.player.x + 34
    const castStartY = useApprovedComposite || useLayeredScene ? CAST_LAYER_CONFIG.rod.lineStart.y : L.cast.player.y - 112
    for (let i = 0; i < 5; i += 1) {
      const t = (i + 1) / 6
      const x = castStartX + (targetX - castStartX) * t
      const y = castStartY + (targetY - castStartY) * t - Math.sin(Math.PI * t) * (useApprovedComposite || useLayeredScene ? 26 : 74)
      target.fillStyle(0xffffff, 0.76 - i * 0.08)
      target.fillCircle(x, y, Math.max(2, 4 - i * 0.35))
    }

    if (useApprovedComposite && !useLayeredScene) {
      const rod = CAST_LAYER_CONFIG.rod
      target.lineStyle(rod.shaftWidth, rod.shaftColor, 0.98)
      target.beginPath()
      target.moveTo(rod.joints[0].x, rod.joints[0].y)
      rod.joints.slice(1).forEach(point => target.lineTo(point.x, point.y))
      target.strokePath()
      target.lineStyle(rod.accentWidth, rod.accentColor, 1)
      target.beginPath()
      target.moveTo(rod.joints[0].x, rod.joints[0].y)
      rod.joints.slice(1).forEach(point => target.lineTo(point.x, point.y))
      target.strokePath()
    }

    const useApprovedPlayerCutout = !useLayeredScene && (useApprovedComposite || castPlayerCutoutPrototypeEnabled())
    const playerAsset = useApprovedPlayerCutout
      ? ASSETS.ui.fishingApprovedCastPlayerVisible
      : ASSETS.characters?.fishingCastHero
    const player = !useLayeredScene && playerAsset?.key && scene.textures.exists(playerAsset.key)
      ? useApprovedPlayerCutout
        ? scene.add.image(90 * (390 / 391), 465 * (844 / 783), playerAsset.key)
          .setDisplaySize(180 * (390 / 391), 230 * (844 / 783))
        : scene.add.image(L.cast.player.x + 10, L.cast.player.y + 8, playerAsset.key)
          .setOrigin(0.5, 1)
          .setDisplaySize(154, 220)
      : null
    if (useLayeredScene) {
      layeredScene.nodes.fish.add(fishShadows)
      layeredScene.nodes.target.add(target)
    } else {
      castField.add([...fishShadows, target, ...(player ? [player] : [])])
    }

    const retrieveBase = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedRetrievePanel.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    retrieveField.add(retrieveBase)

    const battleBackground = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCleanHarbor.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    const battleSplash = scene.add.graphics()
    battleSplash.lineStyle(6, 0xeafcff, 0.90)
    battleSplash.strokeEllipse(214, 360, 340, 112)
    battleSplash.lineStyle(3, 0x8edfff, 0.74)
    battleSplash.strokeEllipse(214, 364, 372, 142)
    const battleLine = scene.add.graphics()
    battleLine.lineStyle(2, 0xffffff, 0.92)
    battleLine.lineBetween(0, 480, 164, 348)
    const battleFish = scene.add.image(224, 326, FISH_ART.tai.key).setDisplaySize(306, 190).setAngle(-8)
    const battleBase = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedBattleBase.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    const battleHeaderBg = scene.add.graphics()
    battleHeaderBg.fillStyle(0xffffff, 0.98)
    battleHeaderBg.fillRoundedRect(18, 19, 354, 40, 16)
    const battleFishName = scene.add.text(54, 39, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5)
    const battlePhase = scene.add.text(146, 39, 'BATTLE', {
      fontFamily: 'Nunito, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5)
    const battleTensionTrack = scene.add.graphics()
    battleTensionTrack.fillStyle(0x092b43, 1)
    battleTensionTrack.fillRoundedRect(205, 31, 154, 17, 9)
    const battleTensionFill = scene.add.graphics()
    const battleReel = scene.add.text(DESIGN_WIDTH / 2, 574, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: 'rgba(3,29,46,0.78)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5)
    const battleRage = scene.add.text(DESIGN_WIDTH / 2, 104, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff3a5',
      backgroundColor: 'rgba(94,32,26,0.86)', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setVisible(false)
    battleField.add([battleBackground, battleSplash, battleLine, battleFish, battleBase, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, battleTensionFill, battleReel, battleRage])

    const resultBackground = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCleanHarbor.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    const resultTint = scene.add.rectangle(DESIGN_WIDTH / 2, 320, DESIGN_WIDTH, 510, 0x042a42, 0.58)
    const resultGlow = scene.add.graphics()
    resultGlow.fillStyle(0xffd95a, 0.18)
    resultGlow.fillCircle(DESIGN_WIDTH / 2, 302, 138)
    resultGlow.lineStyle(3, 0xffef9a, 0.58)
    resultGlow.strokeCircle(DESIGN_WIDTH / 2, 302, 122)
    const resultFish = scene.add.image(DESIGN_WIDTH / 2, 304, FISH_ART.tai.key).setDisplaySize(292, 184).setAngle(-4)
    const resultBase = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedResultBase.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    const resultGet = scene.add.text(DESIGN_WIDTH / 2, 150, 'GET!', {
      fontFamily: 'Nunito, sans-serif', fontSize: '68px', fontStyle: 'bold', color: '#ffdf5a',
      stroke: '#824400', strokeThickness: 6,
    }).setOrigin(0.5)
    const resultCard = scene.add.graphics()
    resultCard.fillStyle(0x062c44, 0.94)
    resultCard.lineStyle(2, 0xdff5ff, 0.92)
    resultCard.fillRoundedRect(31, 440, 328, 132, 24)
    resultCard.strokeRoundedRect(31, 440, 328, 132, 24)
    resultCard.lineStyle(1, 0xffffff, 0.62)
    resultCard.lineBetween(53, 492, 337, 492)
    resultCard.lineBetween(195, 504, 195, 554)
    const resultName = scene.add.text(DESIGN_WIDTH / 2, 469, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    const resultSize = scene.add.text(119, 526, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#ffffff', align: 'center',
    }).setOrigin(0.5)
    const resultScore = scene.add.text(274, 526, '', {
      fontFamily: 'Nunito, sans-serif', fontSize: '27px', fontStyle: 'bold', color: '#ffdf5a',
    }).setOrigin(0.5)
    const resultTownMask = scene.add.rectangle(DESIGN_WIDTH / 2, 655, 372, 78, 0x031d2e, 0.97).setVisible(false)
    const resultTownMaskText = scene.add.text(DESIGN_WIDTH / 2, 655, 'もう一度釣る', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false)
    resultField.add([resultBackground, resultTint, resultGlow, resultFish, resultBase, resultGet, resultCard, resultName, resultSize, resultScore, resultTownMask, resultTownMaskText])

    const characterMotion = new CharacterMotionController(scene).mount(field)
    if (characterMotion.ready) {
      player?.setVisible(false)
      layeredScene?.nodes?.character?.setVisible(false)
      layeredScene?.nodes?.heldRod?.setVisible(false)
    }
    const battleForeground = scene.add.container(0, 0).setVisible(false)
    const battleUi = [battleBase, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, battleTensionFill, battleReel, battleRage]
    battleField.remove(battleUi)
    battleForeground.add(battleUi)
    const resultForeground = scene.add.container(0, 0).setVisible(false)
    const resultUi = [resultBase, resultGet, resultCard, resultName, resultSize, resultScore, resultTownMask, resultTownMaskText]
    resultField.remove(resultUi)
    resultForeground.add(resultUi)
    field.add([battleForeground, resultForeground])

    const hudBase = scene.add.graphics()
    hudBase.fillStyle(0xffffff, 0.96)
    hudBase.fillRoundedRect(10, 14, DESIGN_WIDTH - 20, 52, 15)
    const hudSkin = scene.add.image(10, 14, ASSETS.ui.fishingApprovedTopHud.key)
      .setOrigin(0, 0)
      .setDisplaySize(DESIGN_WIDTH - 20, 52)
    const back = scene.add.text(31, 40, '‹', {
      fontFamily: 'Nunito, sans-serif', fontSize: '38px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0.5)
    const pin = scene.add.graphics().setPosition(68, 40)
    pin.fillStyle(0x176499, 1)
    pin.fillCircle(0, -3, 6)
    pin.fillTriangle(-4, 1, 4, 1, 0, 9)
    pin.fillStyle(0xffffff, 1)
    pin.fillCircle(0, -3, 2)
    const location = scene.add.text(82, 40, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5).setResolution(2).setScale(1.25)
    const rod = scene.add.graphics().setPosition(199, 40)
    rod.lineStyle(3, 0x173e61, 1)
    rod.beginPath()
    rod.moveTo(-8, 10)
    rod.lineTo(5, -10)
    rod.strokePath()
    rod.lineStyle(2, 0x173e61, 1)
    rod.beginPath()
    rod.moveTo(5, -10)
    rod.lineTo(11, -6)
    rod.lineTo(12, 0)
    rod.lineTo(8, 5)
    rod.strokePath()
    rod.strokeCircle(-8, 10, 3)
    const distance = scene.add.text(221, 40, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#173e61',
    }).setOrigin(0, 0.5).setResolution(2).setScale(1.25)
    const tackle = scene.add.graphics().setPosition(338, 40)
    tackle.fillStyle(0x173e61, 1)
    tackle.fillRoundedRect(-10, -7, 20, 15, 3)
    tackle.fillRect(-5, -11, 10, 5)
    tackle.lineStyle(1.5, 0xffffff, 0.9)
    tackle.lineBetween(-8, -1, 8, -1)
    tackle.lineBetween(0, -1, 0, 4)

    const instruction = scene.add.container(DESIGN_WIDTH / 2, 92)
    const instructionBase = scene.add.graphics()
    instructionBase.fillStyle(0x092b43, 0.86)
    instructionBase.fillRoundedRect(-76, -13, 152, 26, 13)
    const instructionSkin = scene.add.image(0, 0, ASSETS.ui.fishingApprovedInstruction.key).setDisplaySize(152, 26)
    const instructionText = scene.add.text(0, 0, '狙う場所を決める', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2).setScale(1.25)
    instruction.add([instructionBase, instructionSkin, instructionText])
    chrome.add([hudBase, hudSkin, back, pin, location, rod, distance, tackle, instruction])

    const dockBase = scene.add.graphics()
    dockBase.fillStyle(0x031d2e, 0.94)
    dockBase.fillRect(0, DOCK_TOP, DESIGN_WIDTH, DESIGN_HEIGHT - DOCK_TOP)
    dockBase.lineStyle(1.5, 0xc9f4ff, 0.34)
    dockBase.lineBetween(0, DOCK_TOP, DESIGN_WIDTH, DOCK_TOP)
    const dockInstruction = scene.add.text(DESIGN_WIDTH / 2, DOCK_TOP + 22, '長押し → 離して投げる', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2).setScale(1.25)
    const powerTrack = scene.add.graphics()
    powerTrack.fillStyle(0x082b45, 1)
    const gaugeConfig = CAST_LAYER_CONFIG.controls.gauge
    powerTrack.fillRoundedRect(gaugeConfig.x, gaugeConfig.y, gaugeConfig.width, gaugeConfig.height, gaugeConfig.height / 2)
    powerTrack.lineStyle(1.4, 0xb8eaff, 0.72)
    powerTrack.strokeRoundedRect(gaugeConfig.x, gaugeConfig.y, gaugeConfig.width, gaugeConfig.height, gaugeConfig.height / 2)
    const powerFill = scene.add.graphics()

    const buttonY = CAST_LAYER_CONFIG.controls.castButton.y
    const buttonBase = scene.add.circle(CAST_LAYER_CONFIG.controls.castButton.x, buttonY, 55, 0xffd957, 1)
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
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#102335',
    }).setOrigin(0.5).setResolution(2).setScale(1.6)
    castDock.add([dockBase, dockInstruction, powerTrack, powerFill, buttonBase, buttonRing, castIcon, castLabel])

    const backConfig = CAST_LAYER_CONFIG.controls.back
    const castButtonConfig = CAST_LAYER_CONFIG.controls.castButton
    const backHit = scene.add.rectangle(backConfig.x, backConfig.y, backConfig.width, backConfig.height, 0x000000, 0.001).setInteractive({ useHandCursor: true })
    const castHit = scene.add.circle(castButtonConfig.x, castButtonConfig.y, castButtonConfig.radius, 0x000000, 0.001).setInteractive({ useHandCursor: true })
    const pressables = [
      { item: buttonBase, scale: 1 },
      { item: buttonRing, scale: 1 },
      { item: castIcon, scale: 1 },
      { item: castLabel, scale: 1.6 },
    ]
    const resetScale = () => pressables.forEach(({ item, scale }) => item.setScale(scale))
    castHit.on('pointerdown', pointer => {
      pointer?.event?.stopPropagation?.()
      if (this.adapter.beginCharge()) {
        pressables.forEach(({ item, scale }) => item.setScale(scale * 0.96))
      }
    })
    castHit.on('pointerup', pointer => { pointer?.event?.stopPropagation?.(); resetScale(); this.adapter.releaseCharge() })
    castHit.on('pointerupoutside', () => { resetScale(); this.adapter.cancelCharge() })
    castInteraction.add(castHit)
    interaction.add(backHit)
    if (useLayeredScene) {
      applyCastLayerAdjustment(chrome, 'hud', layerOptions)
      applyCastLayerAdjustment(castDock, 'controls', layerOptions)
      applyCastLayerAdjustment(castInteraction, 'controls', layerOptions)
    }

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
      battleField,
      resultField,
      castDock,
      retrieveDock,
      castInteraction,
      retrieveInteraction,
      layeredScene,
      chrome,
      battleFish,
      battleFishName,
      battleTensionFill,
      battleReel,
      battleRage,
      resultGlow,
      resultFish,
      resultGet,
      resultName,
      resultSize,
      resultScore,
      resultTownMask,
      resultTownMaskText,
      player,
      characterMotion,
      battleForeground,
      resultForeground,
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
    if (!['cast', 'retrieve', 'battle', 'result'].includes(this.scene.phase) || !this.root?.visible) return
    const point = this._designPoint(pointer)
    if (['cast', 'retrieve', 'result'].includes(this.scene.phase) && point.x <= 58 && point.y <= 68) {
      this.adapter.back()
      return
    }
    if (this.scene.phase === 'result') {
      if (point.y >= 610 && point.y <= 696) {
        if (this.scene._castPresentationOutcome === 'caught') this.adapter.resultTown()
        else this.adapter.resultRetry()
      } else if (point.y >= 700 && point.y <= 790) {
        this.adapter.resultRetry()
      }
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

  _syncFishImage(image, fishId) {
    const asset = FISH_ART[fishId] ?? FISH_ART.tai
    if (asset?.key && this.scene.textures.exists(asset.key) && image.texture.key !== asset.key) image.setTexture(asset.key)
  }

  sync() {
    if (!this.root?.active) return
    const view = readCastViewModel(this.scene)
    this.nodes.characterMotion?.sync(view)
    const castVisible = view.phase === 'cast'
    const retrieveVisible = view.phase === 'retrieve'
    const battleVisible = view.phase === 'battle'
    const resultVisible = view.phase === 'result'
    const visible = castVisible || retrieveVisible || battleVisible || resultVisible
    this.root.setVisible(visible)
    if (!visible) return
    this.nodes.castField.setVisible(castVisible)
    this.nodes.retrieveField.setVisible(retrieveVisible)
    this.nodes.battleField.setVisible(battleVisible)
    this.nodes.resultField.setVisible(resultVisible)
    this.nodes.battleForeground.setVisible(battleVisible)
    this.nodes.resultForeground.setVisible(resultVisible)
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
      const gauge = CAST_LAYER_CONFIG.controls.gauge
      this.nodes.powerFill.fillRoundedRect(gauge.x + 3, gauge.y + 3, (gauge.width - 6) * view.charge01, gauge.height - 6, (gauge.height - 6) / 2)
    }
    if (battleVisible) {
      const battle = view.battle
      this._syncFishImage(this.nodes.battleFish, battle.fishId)
      this.nodes.battleFishName.setText(battle.fishName)
      this.nodes.battleTensionFill.clear()
      this.nodes.battleTensionFill.fillStyle(battle.tension01 >= 0.72 ? 0xff564b : 0xffa62e, 1)
      this.nodes.battleTensionFill.fillRoundedRect(208, 34, Math.max(7, 148 * battle.tension01), 11, 6)
      this.nodes.battleReel.setText(`巻き進捗 ${Math.round(battle.reel01 * 100)}%`)
      this.nodes.battleRage.setText('暴れている… 待つ').setVisible(battle.isRaging)
    }
    if (resultVisible) {
      const result = view.result
      const caught = result.outcome === 'caught'
      this._syncFishImage(this.nodes.resultFish, result.fishId)
      this.nodes.characterMotion?.setFishTexture(FISH_ART[result.fishId] ?? FISH_ART.tai)
      this.nodes.resultGlow.setVisible(caught)
      this.nodes.resultFish.setVisible(caught && this.nodes.characterMotion?.currentAction !== 'joy')
      this.nodes.resultGet.setText(caught ? 'GET!' : 'ESCAPED').setFontSize(caught ? 68 : 44)
      this.nodes.resultName.setText(caught ? result.fishName : '逃げられた…')
      this.nodes.resultSize.setText(caught ? `サイズ\n${result.sizeCm} cm` : 'タイミングを\n整えよう')
      this.nodes.resultScore.setText(caught ? `${result.score} pt` : '')
      this.nodes.resultTownMask.setVisible(!caught)
      this.nodes.resultTownMaskText.setVisible(!caught)
    }
  }

  destroy() {
    this.scene.scale?.off?.('resize', this.layout, this)
    this.scene.input?.off?.('pointerdown', this._onHostPointerDown, this)
    this.scene.input?.off?.('pointerup', this._onHostPointerUp, this)
    this._slowPointerHeld = false
    this.nodes?.characterMotion?.destroy?.()
    this.root?.destroy?.(true)
    this.root = null
    this.nodes = null
  }
}
