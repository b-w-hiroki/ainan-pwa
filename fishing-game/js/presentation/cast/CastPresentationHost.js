import { ASSETS } from '../../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from '../layouts/fishingMockLayout.js'
import { readCastViewModel } from './CastViewModel.js'
import { CastSceneAdapter } from './CastSceneAdapter.js'
import { CAST_LAYER_CONFIG, readCastLayerDevOptions } from './castLayerConfig.js'
import { applyCastLayerAdjustment, createLayeredCastScene } from './CastLayeredScene.js'
import { CharacterMotionController } from './CharacterMotionController.js'
import { getRetryJourneyCopy } from '../../game/fishingJourney.js'
import { drawStatusMeter } from '../../ui/UiPrimitives.js'

const DESIGN_WIDTH = CAST_LAYER_CONFIG.design.width
const DESIGN_HEIGHT = CAST_LAYER_CONFIG.design.height
const DOCK_TOP = CAST_LAYER_CONFIG.dockTop
const RESULT_FISH_BOUNDS = Object.freeze({ width: 350, height: 205 })

const FISH_ART = Object.freeze({
  aji: ASSETS.fishHeroes.aji,
  tai: ASSETS.ui.fishingApprovedMadaiLive,
  bass: ASSETS.fish.blackBassPartV1,
  buri: ASSETS.fishHeroes.buri,
  kue: ASSETS.fishHeroes.kue,
  saba: ASSETS.fish.sabaPartV1,
  isaki: ASSETS.fish.isakiPartV1,
  hirame: ASSETS.fish.hiramePartV1,
  kanpachi: ASSETS.fish.kanpachiPartV1,
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
    this._resultPointerAction = null
    this._resultInputLocked = false
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
    const battleTensionSkin = scene.textures.exists(ASSETS.ui.artGaugeTrackV2.key)
      ? scene.add.image(282, 39.5, ASSETS.ui.artGaugeTrackV2.key).setDisplaySize(164, 25)
      : null
    const battleTensionFill = scene.add.graphics()
    const battleTensionStatus = scene.textures.exists(ASSETS.gameplayFx.tensionSafe.key)
      ? scene.add.image(373, 39, ASSETS.gameplayFx.tensionSafe.key).setDisplaySize(31, 31)
      : null
    const battleReel = scene.add.text(DESIGN_WIDTH / 2, 574, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: 'rgba(3,29,46,0.78)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5)
    const battleRage = scene.add.text(DESIGN_WIDTH / 2, 104, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff3a5',
      backgroundColor: 'rgba(94,32,26,0.86)', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setVisible(false)
    battleField.add([battleBackground, battleSplash, battleLine, battleFish, battleBase, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, ...(battleTensionSkin ? [battleTensionSkin] : []), battleTensionFill, ...(battleTensionStatus ? [battleTensionStatus] : []), battleReel, battleRage])

    const resultBackground = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCleanHarbor.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    const resultTint = scene.add.rectangle(DESIGN_WIDTH / 2, 320, DESIGN_WIDTH, 510, 0x042a42, 0.58)
    const resultGlow = scene.add.graphics()
    resultGlow.fillStyle(0xffd95a, 0.18)
    resultGlow.fillCircle(DESIGN_WIDTH / 2, 302, 138)
    resultGlow.lineStyle(3, 0xffef9a, 0.58)
    resultGlow.strokeCircle(DESIGN_WIDTH / 2, 302, 122)
    const resultOutcomeFx = scene.textures.exists(ASSETS.gameplayFx.resultCaught.key)
      ? scene.add.image(DESIGN_WIDTH / 2, 304, ASSETS.gameplayFx.resultCaught.key).setDisplaySize(360, 360)
      : null
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
    const resultInfoSkin = scene.textures.exists(ASSETS.ui.artResultCardV2.key)
      ? scene.add.image(DESIGN_WIDTH / 2, 506, ASSETS.ui.artResultCardV2.key).setDisplaySize(340, 142)
      : null
    const resultName = scene.add.text(DESIGN_WIDTH / 2, 469, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '28px', fontStyle: 'bold', color: resultInfoSkin ? '#173248' : '#ffffff',
    }).setOrigin(0.5)
    const resultSize = scene.add.text(119, 526, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: '23px', fontStyle: 'bold', color: resultInfoSkin ? '#173248' : '#ffffff', align: 'center',
    }).setOrigin(0.5)
    const resultScore = scene.add.text(274, 526, '', {
      fontFamily: 'Nunito, sans-serif', fontSize: '27px', fontStyle: 'bold', color: resultInfoSkin ? '#9a6500' : '#ffdf5a',
    }).setOrigin(0.5)
    const resultTownMask = scene.add.graphics().setVisible(false)
    const resultTownMaskText = scene.add.text(DESIGN_WIDTH / 2, 655, 'もう一度釣る', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false)
    const resultRetryText = scene.add.text(DESIGN_WIDTH / 2, 746, 'もう一度釣る', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false)
    const resultFailureOptions = scene.add.graphics().setVisible(false)
    resultFailureOptions.fillStyle(0x031d2e, 0.24)
    resultFailureOptions.fillRoundedRect(12, 710, 182, 80, 22)
    resultFailureOptions.fillRoundedRect(200, 710, 182, 80, 22)
    resultFailureOptions.fillStyle(0x0b5c91, 0.98)
    resultFailureOptions.lineStyle(2, 0xdff5ff, 0.92)
    resultFailureOptions.fillRoundedRect(10, 706, 182, 80, 22)
    resultFailureOptions.strokeRoundedRect(10, 706, 182, 80, 22)
    resultFailureOptions.fillRoundedRect(198, 706, 182, 80, 22)
    resultFailureOptions.strokeRoundedRect(198, 706, 182, 80, 22)
    const resultFailureEquip = scene.add.text(101, 746, '装備を見直す', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false)
    const resultFailurePort = scene.add.text(289, 746, '港へ戻る', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setVisible(false)
    const resultPrimarySkin = scene.textures.exists(ASSETS.ui.artButtonPrimary.key)
      ? scene.add.image(DESIGN_WIDTH / 2, 655, ASSETS.ui.artButtonPrimary.key).setDisplaySize(382, 88)
      : null
    const resultSecondarySkin = scene.textures.exists(ASSETS.ui.artButtonSecondary.key)
      ? scene.add.image(DESIGN_WIDTH / 2, 746, ASSETS.ui.artButtonSecondary.key).setDisplaySize(382, 88)
      : null
    const resultFailureLeftSkin = scene.textures.exists(ASSETS.ui.artButtonSecondary.key)
      ? scene.add.image(101, 746, ASSETS.ui.artButtonSecondary.key).setDisplaySize(186, 88).setVisible(false)
      : null
    const resultFailureRightSkin = scene.textures.exists(ASSETS.ui.artButtonSecondary.key)
      ? scene.add.image(289, 746, ASSETS.ui.artButtonSecondary.key).setDisplaySize(186, 88).setVisible(false)
      : null
    resultField.add([resultBackground, resultTint, resultGlow, ...(resultOutcomeFx ? [resultOutcomeFx] : []), resultFish, resultBase, resultGet, resultCard, ...(resultInfoSkin ? [resultInfoSkin] : []), resultName, resultSize, resultScore, ...(resultPrimarySkin ? [resultPrimarySkin] : []), resultTownMask, resultTownMaskText, ...(resultSecondarySkin ? [resultSecondarySkin] : []), ...(resultFailureLeftSkin ? [resultFailureLeftSkin] : []), ...(resultFailureRightSkin ? [resultFailureRightSkin] : []), resultFailureOptions, resultRetryText, resultFailureEquip, resultFailurePort])

    const characterMotion = new CharacterMotionController(scene).mount(field)
    if (characterMotion.ready) {
      player?.setVisible(false)
      layeredScene?.nodes?.character?.setVisible(false)
      layeredScene?.nodes?.heldRod?.setVisible(false)
    }
    const battleForeground = scene.add.container(0, 0).setVisible(false)
    const battleUi = [battleBase, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, ...(battleTensionSkin ? [battleTensionSkin] : []), battleTensionFill, ...(battleTensionStatus ? [battleTensionStatus] : []), battleReel, battleRage]
    battleField.remove(battleUi)
    battleForeground.add(battleUi)
    const resultForeground = scene.add.container(0, 0).setVisible(false)
    const resultUi = [resultBase, resultGet, resultCard, ...(resultInfoSkin ? [resultInfoSkin] : []), resultName, resultSize, resultScore, ...(resultPrimarySkin ? [resultPrimarySkin] : []), resultTownMask, resultTownMaskText, ...(resultSecondarySkin ? [resultSecondarySkin] : []), ...(resultFailureLeftSkin ? [resultFailureLeftSkin] : []), ...(resultFailureRightSkin ? [resultFailureRightSkin] : []), resultFailureOptions, resultRetryText, resultFailureEquip, resultFailurePort]
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
    const dockSkin = scene.textures.exists(ASSETS.ui.artOperationDockV2.key)
      ? scene.add.image(DESIGN_WIDTH / 2, DOCK_TOP + (DESIGN_HEIGHT - DOCK_TOP) / 2, ASSETS.ui.artOperationDockV2.key)
        .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT - DOCK_TOP + 8)
      : null
    const dockInstruction = scene.add.text(DESIGN_WIDTH / 2, DOCK_TOP + 22, '長押し → 離して投げる', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2).setScale(1.25)
    const powerTrack = scene.add.graphics()
    powerTrack.fillStyle(0x082b45, 1)
    const gaugeConfig = CAST_LAYER_CONFIG.controls.gauge
    powerTrack.fillRoundedRect(gaugeConfig.x, gaugeConfig.y, gaugeConfig.width, gaugeConfig.height, gaugeConfig.height / 2)
    powerTrack.lineStyle(1.4, 0xb8eaff, 0.72)
    powerTrack.strokeRoundedRect(gaugeConfig.x, gaugeConfig.y, gaugeConfig.width, gaugeConfig.height, gaugeConfig.height / 2)
    const powerTrackSkin = scene.textures.exists(ASSETS.ui.artGaugeTrackV2.key)
      ? scene.add.image(gaugeConfig.x + gaugeConfig.width / 2, gaugeConfig.y + gaugeConfig.height / 2, ASSETS.ui.artGaugeTrackV2.key)
        .setDisplaySize(gaugeConfig.width + 12, gaugeConfig.height + 10)
      : null
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
    castDock.add([dockBase, ...(dockSkin ? [dockSkin] : []), dockInstruction, powerTrack, ...(powerTrackSkin ? [powerTrackSkin] : []), powerFill, buttonBase, buttonRing, castIcon, castLabel])

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
      battleTensionStatus,
      battleReel,
      battleRage,
      resultGlow,
      resultOutcomeFx,
      resultFish,
      resultGet,
      resultName,
      resultSize,
      resultScore,
      resultTownMask,
      resultTownMaskText,
      resultRetryText,
      resultFailureOptions,
      resultFailureEquip,
      resultFailurePort,
      resultPrimarySkin,
      resultSecondarySkin,
      resultFailureLeftSkin,
      resultFailureRightSkin,
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
    scene.input.keyboard?.on('keydown-ENTER', this._onResultKeyboard, this)
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
      this._resultPointerAction = null
      if (point.y >= 610 && point.y <= 696) {
        this._resultPointerAction = this.scene._castPresentationOutcome === 'caught' ? 'town' : 'retry'
      } else if (point.y >= 700 && point.y <= 790) {
        if (this.scene._castPresentationOutcome === 'caught') this._resultPointerAction = 'retry'
        else this._resultPointerAction = point.x < DESIGN_WIDTH / 2 ? 'prepare' : 'port'
      }
      if (this._resultPointerAction) {
        if (this.nodes.resultPrimarySkin) {
          this.nodes.resultPrimarySkin.setAlpha(0.84)
          this.nodes.resultSecondarySkin?.setAlpha?.(0.84)
          this.nodes.resultFailureLeftSkin?.setAlpha?.(0.84)
          this.nodes.resultFailureRightSkin?.setAlpha?.(0.84)
        } else {
          this.nodes.resultTownMask?.setAlpha?.(0.84)
          this.nodes.resultFailureOptions?.setAlpha?.(0.84)
        }
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
    if (this._resultPointerAction) {
      const action = this._resultPointerAction
      this._resultPointerAction = null
      this.nodes.resultTownMask?.setAlpha?.(this.nodes.resultPrimarySkin ? 0 : 1)
      this.nodes.resultFailureOptions?.setAlpha?.(this.nodes.resultPrimarySkin ? 0 : 1)
      this.nodes.resultPrimarySkin?.setAlpha?.(1)
      this.nodes.resultSecondarySkin?.setAlpha?.(1)
      this.nodes.resultFailureLeftSkin?.setAlpha?.(1)
      this.nodes.resultFailureRightSkin?.setAlpha?.(1)
      this._activateResultAction(action)
      return
    }
    if (!this._slowPointerHeld) return
    this._slowPointerHeld = false
    this.adapter.endSlowRetrieve()
  }

  _activateResultAction(action) {
    if (this._resultInputLocked || this.scene.phase !== 'result') return
    this._resultInputLocked = true
    if (action === 'town') this.adapter.resultTown()
    else if (action === 'retry') this.adapter.resultRetry()
    else if (action === 'prepare') this.adapter.resultPrepare()
    else if (action === 'port') this.adapter.resultPort()
    this.scene.time.delayedCall(220, () => { this._resultInputLocked = false })
  }

  _onResultKeyboard(event) {
    if (event?.repeat || this.scene.phase !== 'result') return
    event?.preventDefault?.()
    this._activateResultAction(this.scene._castPresentationOutcome === 'caught' ? 'town' : 'retry')
  }

  layout() {
    if (!this.root?.active) return
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
    this.root.setScale(scale)
    this.root.setPosition((width - DESIGN_WIDTH * scale) / 2, (height - DESIGN_HEIGHT * scale) / 2)
  }

  _syncFishImage(image, fishId, slot = 'battle') {
    const asset = FISH_ART[fishId] ?? FISH_ART.tai
    if (asset?.key && this.scene.textures.exists(asset.key) && image.texture.key !== asset.key) image.setTexture(asset.key)
    if (slot === 'result') {
      const source = image.texture?.getSourceImage?.()
      const width = source?.naturalWidth ?? source?.width ?? 1
      const height = source?.naturalHeight ?? source?.height ?? 1
      const scale = Math.min(RESULT_FISH_BOUNDS.width / width, RESULT_FISH_BOUNDS.height / height)
      image.setDisplaySize(Math.round(width * scale), Math.round(height * scale))
    }
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
      const gauge = CAST_LAYER_CONFIG.controls.gauge
      drawStatusMeter(this.nodes.powerFill, { x: gauge.x + 3, y: gauge.y + 3, w: gauge.width - 6, h: gauge.height - 6, value: view.charge01, max: 1, tone: 'sun' })
    }
    if (battleVisible) {
      const battle = view.battle
      this._syncFishImage(this.nodes.battleFish, battle.fishId)
      this.nodes.battleFishName.setText(battle.fishName)
      this.nodes.battleTensionFill.clear()
      drawStatusMeter(this.nodes.battleTensionFill, { x: 208, y: 34, w: 148, h: 11, value: battle.tension01, max: 1, tone: battle.tension01 >= 0.72 ? 'coral' : battle.tension01 >= 0.48 ? 'sun' : 'mint' })
      if (this.nodes.battleTensionStatus) {
        const statusAsset = battle.tension01 >= 0.72
          ? ASSETS.gameplayFx.tensionDanger
          : battle.tension01 >= 0.48
            ? ASSETS.gameplayFx.tensionWarning
            : ASSETS.gameplayFx.tensionSafe
        this.nodes.battleTensionStatus.setTexture(statusAsset.key)
      }
      this.nodes.battleReel.setText(`巻き進捗 ${Math.round(battle.reel01 * 100)}%`)
      this.nodes.battleRage.setText('暴れている… 待つ').setVisible(battle.isRaging)
    }
    if (resultVisible) {
      const result = view.result
      const caught = result.outcome === 'caught'
      const retry = getRetryJourneyCopy(this.scene.env?.point)
      this._syncFishImage(this.nodes.resultFish, result.fishId, 'result')
      this.nodes.characterMotion?.setFishTexture(FISH_ART[result.fishId] ?? FISH_ART.tai)
      this.nodes.resultGlow.setVisible(caught && !this.nodes.resultOutcomeFx)
      this.nodes.resultOutcomeFx?.setVisible(true)
        .setTexture(caught ? ASSETS.gameplayFx.resultCaught.key : ASSETS.gameplayFx.resultEscaped.key)
        .setAlpha(caught ? 0.9 : 0.78)
      this.nodes.resultFish.setVisible(caught && this.nodes.characterMotion?.currentAction !== 'joy')
      this.nodes.resultGet.setText(caught ? 'GET!' : 'ESCAPED').setFontSize(caught ? 68 : 44)
      this.nodes.resultName.setText(caught ? result.fishName : retry.cause).setFontSize(caught ? 28 : 19)
      this.nodes.resultSize.setPosition(caught ? 119 : DESIGN_WIDTH / 2, 526)
        .setFontSize(caught ? 23 : 13)
        .setWordWrapWidth(caught ? 0 : 284)
        .setText(caught ? `サイズ\n${result.sizeCm} cm` : retry.advice)
      this.nodes.resultScore.setText(caught ? `${result.score} pt\n獲得済み` : '').setFontSize(caught ? 22 : 27)
      this.nodes.resultTownMask.clear().setVisible(true)
      this.nodes.resultTownMask.fillStyle(0x031d2e, 0.24)
      this.nodes.resultTownMask.fillRoundedRect(11, 620, 372, 78, 22)
      this.nodes.resultTownMask.fillStyle(caught ? 0xffd95a : 0x0b62a0, 0.98)
      this.nodes.resultTownMask.lineStyle(2, caught ? 0xffef9a : 0xdff5ff, 0.92)
      this.nodes.resultTownMask.fillRoundedRect(9, 616, 372, 78, 22)
      this.nodes.resultTownMask.strokeRoundedRect(9, 616, 372, 78, 22)
      this.nodes.resultTownMask.fillStyle(0xffffff, 0.18)
      this.nodes.resultTownMask.fillRoundedRect(22, 625, 346, 9, 5)
      this.nodes.resultTownMaskText.setVisible(true)
        .setColor('#173248')
        .setFontSize(caught ? 16 : 18)
        .setText(caught ? '港の変化を見る（釣果登録済み）' : retry.primary)
      this.nodes.resultTownMaskText.setFontSize(caught ? 20 : 22).setText(caught ? '港の変化を見る（釣果登録済み）' : retry.primary)
      this.nodes.resultFailureOptions.clear().setVisible(true)
      this.nodes.resultFailureOptions.fillStyle(0x031d2e, 0.25)
      if (caught) {
        this.nodes.resultFailureOptions.fillRoundedRect(12, 710, 370, 80, 22)
        this.nodes.resultFailureOptions.fillStyle(0x0b78c5, 1)
        this.nodes.resultFailureOptions.lineStyle(2.5, 0xdff5ff, 0.96)
        this.nodes.resultFailureOptions.fillRoundedRect(10, 706, 370, 80, 22)
        this.nodes.resultFailureOptions.strokeRoundedRect(10, 706, 370, 80, 22)
      } else {
        this.nodes.resultFailureOptions.fillRoundedRect(12, 710, 182, 80, 22)
        this.nodes.resultFailureOptions.fillRoundedRect(200, 710, 182, 80, 22)
        this.nodes.resultFailureOptions.fillStyle(0x0b5c91, 1)
        this.nodes.resultFailureOptions.lineStyle(2, 0xdff5ff, 0.92)
        this.nodes.resultFailureOptions.fillRoundedRect(10, 706, 182, 80, 22)
        this.nodes.resultFailureOptions.strokeRoundedRect(10, 706, 182, 80, 22)
        this.nodes.resultFailureOptions.fillRoundedRect(198, 706, 182, 80, 22)
        this.nodes.resultFailureOptions.strokeRoundedRect(198, 706, 182, 80, 22)
      }
      this.nodes.resultRetryText.setVisible(caught)
      this.nodes.resultFailureEquip.setVisible(!caught).setFontSize(18).setText('装備を見直す')
      this.nodes.resultFailurePort.setVisible(!caught).setFontSize(18).setText('港へ戻る')
      if (this.nodes.resultPrimarySkin) {
        this.nodes.resultPrimarySkin.setVisible(true).setTexture(ASSETS.ui.artButtonPrimary.key)
        this.nodes.resultSecondarySkin?.setVisible(caught)
        this.nodes.resultFailureLeftSkin?.setVisible(!caught)
        this.nodes.resultFailureRightSkin?.setVisible(!caught)
        this.nodes.resultTownMask.setAlpha(0)
        this.nodes.resultFailureOptions.setAlpha(0)
      }
      this.scene._resultActionMetrics = Object.freeze({ primaryHit: [9, 616, 372, 78], secondaryHitHeight: 80, labelsAreLiveText: true })
    }
  }

  destroy() {
    this.scene.scale?.off?.('resize', this.layout, this)
    this.scene.input?.off?.('pointerdown', this._onHostPointerDown, this)
    this.scene.input?.off?.('pointerup', this._onHostPointerUp, this)
    this.scene.input.keyboard?.off('keydown-ENTER', this._onResultKeyboard, this)
    this._slowPointerHeld = false
    this.nodes?.characterMotion?.destroy?.()
    this.root?.destroy?.(true)
    this.root = null
    this.nodes = null
  }
}
