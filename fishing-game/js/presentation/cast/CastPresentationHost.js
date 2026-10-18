import { getActiveCharacterAppearance, CHARACTER_PREVIEW_BACKGROUND } from '../../game/characterAppearance.js'
import { isNativeLandscapeQaResize } from '../landscape/nativeLandscapeQaFlags.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FISHING_MOCK_LAYOUT as L } from '../layouts/fishingMockLayout.js'
import { readCastViewModel } from './CastViewModel.js'
import { CastSceneAdapter } from './CastSceneAdapter.js'
import { CAST_LAYER_CONFIG, readCastLayerDevOptions } from './castLayerConfig.js'
import { applyCastLayerAdjustment, createLayeredCastScene } from './CastLayeredScene.js'
import { CharacterMotionController } from './CharacterMotionController.js'
import { getRetryJourneyCopy } from '../../game/fishingJourney.js'
import { drawStatusMeter } from '../../ui/UiPrimitives.js'
import { isReducedMotion } from '../../game/feedback.js'
import { battleJumpFrame } from './battleJumpMotion.js'

const DESIGN_WIDTH = CAST_LAYER_CONFIG.design.width
const DESIGN_HEIGHT = CAST_LAYER_CONFIG.design.height
const DOCK_TOP = CAST_LAYER_CONFIG.dockTop
const RESULT_FISH_BOUNDS = Object.freeze({ width: 350, height: 205 })
// Reserve horizontal breathing room for the angled tail inside 390px.
const BATTLE_FISH_BOUNDS = Object.freeze({ width: 310, height: 194 })
const BATTLE_LOCATION_ART = Object.freeze({
  pointA: ASSETS.fishingField.locationHarbor,
  pointB: ASSETS.fishingField.locationBay,
  pointC: ASSETS.fishingField.locationCape,
})

const FISH_ART = Object.freeze({
  aji: ASSETS.fishHeroes.aji,
  tai: ASSETS.ui.fishingApprovedMadaiLive,
  bass: ASSETS.fishHeroes.bass,
  buri: ASSETS.fishHeroes.buri,
  kue: ASSETS.fishHeroes.kue,
  saba: ASSETS.fishHeroes.saba,
  isaki: ASSETS.fishHeroes.isaki,
  hirame: ASSETS.fishHeroes.hirame,
  kanpachi: ASSETS.fishHeroes.kanpachi,
})

// Dedicated pilot art: show the distinct leaping pose only during actual
// Battle rage. Species without accepted art retain existing hero and motion.
const FISH_JUMP_ART = Object.freeze({
  aji: ASSETS.fishJump.aji,
  saba: ASSETS.fishJump.saba,
  kue: ASSETS.fishJump.kue,
  tai: ASSETS.fishJump.tai,
  buri: ASSETS.fishJump.buri,
  bass: ASSETS.fishJump.bass,
  isaki: ASSETS.fishJump.isaki,
  hirame: ASSETS.fishJump.hirame,
  kanpachi: ASSETS.fishJump.kanpachi,
})
const FISH_JUMP_FX = Object.freeze({
  aji: ASSETS.fishJump.fxAji,
  saba: ASSETS.fishJump.fxSaba,
  kue: ASSETS.fishJump.fxKue,
  tai: ASSETS.fishJump.fxTai,
  buri: ASSETS.fishJump.fxBuri,
  bass: ASSETS.fishJump.fxBass,
  isaki: ASSETS.fishJump.fxIsaki,
  hirame: ASSETS.fishJump.fxHirame,
  kanpachi: ASSETS.fishJump.fxKanpachi,
})

export function castPresentationMode() {
  if (typeof window === 'undefined') return 'host'
  const params = new URLSearchParams(window.location.search)
  if (params.get('cameraPan') === '1' || isNativeLandscapeQaResize(window.location.search)) return 'legacy'
  return params.get('castPresentation') === 'legacy'
    ? 'legacy'
    : 'host'
}

// Location art preview is QA-gated until the three-location Cast/Retrieve
// screenshots prove that the approved water and player's silhouette stay clear.
function castLocationPreviewEnabled() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('qa') === '1' && params.get('castLocationPreview') === '1'
}

function castFragmentPrototypeEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('castFragments') === '1'
}

function castPlayerCutoutPrototypeEnabled() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('castPlayerCutout') === '1'
}

function castApprovedForegroundPreviewEnabled() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('qa') === '1' && params.get('castApprovedForeground') === '1'
}

function castApprovedSplitPreviewEnabled() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('qa') === '1' && params.get('castApprovedSplit') === '1'
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
    this._jumpRageStartedAt = null
    this._jumpRageFishId = null
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
    const useCuteHarbor = ['cute-a-01', 'cute-b-01'].includes(getActiveCharacterAppearance()) && (scene.env?.point ?? 'pointA') === 'pointA' && scene.textures.exists(CHARACTER_PREVIEW_BACKGROUND.key)
    const useLayeredScene = layerOptions.enabled || useCuteHarbor
    let layeredScene = null
    let approvedSplit = null
    if (useLayeredScene) {
      layeredScene = createLayeredCastScene(scene)
      castField.add(layeredScene.root)
    } else if (useApprovedComposite) {
      if (castApprovedForegroundPreviewEnabled()) {
        // Keep the high-fidelity approved source unchanged in normal Cast.
        // Extraction yields independent RGBA slots, NOT inpainted backgrounds:
        // position/motion remains frozen until the occluded pixels are restored.
        const slot = asset => scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, asset.key)
          .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
        const background = slot(ASSETS.ui.fishingApprovedSplitBackgroundV3)
        const water = slot(ASSETS.ui.fishingApprovedSplitWaterV2)
        const pier = slot(ASSETS.ui.fishingApprovedSplitPierV3)
        const playerRegion = slot(ASSETS.ui.fishingApprovedSplitPlayerV3)
        castField.add([background, water, pier, playerRegion])
        approvedSplit = { background, water, pier, playerRegion }
      } else if (castApprovedSplitPreviewEnabled()) {
        // Source-faithful PNG components; the active CastPresentationHost is
        // still the one and only owner. Regular production Cast is unchanged.
        const background = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2,
          ASSETS.ui.fishingApprovedSplitBaseV2.key).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
        const water = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2,
          ASSETS.ui.fishingApprovedSplitWaterV2.key).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
        castField.add([background, water])
        approvedSplit = { background, water }
      } else {
        castField.add(scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCastHarborBase.key)
          .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT))
      }
    }

    if (!useApprovedComposite && castFragmentPrototypeEnabled()) {
      const approvedSceneFragments = scene.add.image(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT / 2,
        ASSETS.ui.fishingApprovedCastSceneFragments.key,
      ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
      castField.add(approvedSceneFragments)
    }

    // Reuse the same perspective assets as Battle. Insert beneath moving fish
    // and the separate player, never above the HUD/interaction owner.
    const castLocationOverlay = scene.add.image(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, BATTLE_LOCATION_ART.pointA.key,
    ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT).setVisible(false)
    if (castLocationPreviewEnabled() && !useLayeredScene) castField.add(castLocationOverlay)

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
    const retrieveLocationOverlay = scene.add.image(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, BATTLE_LOCATION_ART.pointA.key,
    ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT).setVisible(false)
    retrieveField.add(retrieveBase)
    if (castLocationPreviewEnabled()) retrieveField.add(retrieveLocationOverlay)

    const battleBackground = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ASSETS.ui.fishingApprovedCleanHarbor.key)
      .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    if (useCuteHarbor) {
      // Zoom toward the near quay. Keep the mooring post below the control dock and both feet on
      // the flat quay, while the fish remains over water.
      battleBackground.setTexture(CHARACTER_PREVIEW_BACKGROUND.key)
        .setOrigin(0).setPosition(0, -150).setScale(1).setCrop(0, 150, 390, 874)
    }
    const battleSplash = scene.add.graphics()
    battleSplash.lineStyle(6, 0xeafcff, 0.90)
    battleSplash.strokeEllipse(214, 360, 340, 112)
    battleSplash.lineStyle(3, 0x8edfff, 0.74)
    battleSplash.strokeEllipse(214, 364, 372, 142)
    const battleLine = scene.add.graphics()
    battleLine.lineStyle(2, 0xffffff, 0.92)
    battleLine.lineBetween(0, 480, 164, 348)
    // The selected actor already draws its own line from the rod tip.
    battleLine.setVisible(!useCuteHarbor)
    // Independent environment part, reused from the existing world asset manifest.
    // Place over the approved composite, but beneath the real battle fish and HUD.
    const battleLocationOverlay = scene.add.image(
      DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, BATTLE_LOCATION_ART.pointA.key,
    ).setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT).setVisible(false)
    const battleJumpFx = scene.add.image(210, 349, ASSETS.fishJump.fxAji.key)
      .setDisplaySize(310, 174).setVisible(false)
    const battleFish = scene.add.image(210, 326, FISH_ART.tai.key).setDisplaySize(306, 190).setAngle(-8)
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
    const battleOpeningMeter = scene.add.graphics().setVisible(false)
    const battleReel = scene.add.text(DESIGN_WIDTH / 2, 574, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: 'rgba(3,29,46,0.78)', padding: { x: 10, y: 4 },
    }).setOrigin(0.5)
    const battleRage = scene.add.text(DESIGN_WIDTH / 2, 104, '', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff3a5',
      backgroundColor: 'rgba(94,32,26,0.86)', padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setVisible(false)
    const battleInstructionBacking = scene.add.graphics()
    battleInstructionBacking.fillStyle(0x052b43, 1)
      .fillRoundedRect(20, 631, DESIGN_WIDTH - 40, 34, 14)
    battleInstructionBacking.lineStyle(1, 0x8edfff, 0.25)
      .strokeRoundedRect(20, 631, DESIGN_WIDTH - 40, 34, 14)
    const battleInstruction = scene.add.text(DESIGN_WIDTH / 2, 648, 'タップ / 下へスワイプで巻く', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    battleField.add([battleBackground, battleSplash, battleLine, battleBase, battleInstructionBacking, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, ...(battleTensionSkin ? [battleTensionSkin] : []), battleTensionFill, ...(battleTensionStatus ? [battleTensionStatus] : []), battleOpeningMeter, battleReel, battleRage, battleInstruction, battleFish])

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
    }).setOrigin(0.5).setResolution(2)
    const resultSize = scene.add.text(119, 526, '', {
      fontFamily: 'Nunito, M PLUS Rounded 1c, sans-serif', fontSize: '23px', fontStyle: 'bold', color: resultInfoSkin ? '#173248' : '#ffffff', align: 'center',
    }).setOrigin(0.5).setResolution(2)
    const resultScore = scene.add.text(274, 526, '', {
      fontFamily: 'Nunito, sans-serif', fontSize: '27px', fontStyle: 'bold', color: resultInfoSkin ? '#9a6500' : '#ffdf5a',
    }).setOrigin(0.5).setResolution(2)
    const resultTownMask = scene.add.graphics().setVisible(false)
    const resultTownMaskText = scene.add.text(DESIGN_WIDTH / 2, 655, 'もう一度釣る', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2).setVisible(false)
    const resultRetryText = scene.add.text(DESIGN_WIDTH / 2, 746, 'もう一投', {
      fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setResolution(2).setVisible(false)
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
      // Remove superseded transparent cutouts instead of merely hiding them.
      // Affected Edge/iPhone compositor paths could still rasterize hidden
      // texture-backed objects as opaque rectangles.
      player?.destroy()
      layeredScene?.nodes?.character?.destroy()
      layeredScene?.nodes?.heldRod?.destroy()
      // Legacy animation hooks still read/update this sprite for retrieve
      // feedback. Detach it from the display list so those hooks keep their
      // data source without leaving a hidden transparent texture to composite.
      scene._playerSprite?.removeFromDisplayList?.()
      scene._playerShadow?.removeFromDisplayList?.()
    }
    const battleForeground = scene.add.container(0, 0).setVisible(false)
    const battleUi = [battleBase, battleInstructionBacking, battleHeaderBg, battleFishName, battlePhase, battleTensionTrack, ...(battleTensionSkin ? [battleTensionSkin] : []), battleTensionFill, ...(battleTensionStatus ? [battleTensionStatus] : []), battleOpeningMeter, battleReel, battleRage, battleInstruction]
    battleField.remove(battleUi)
    battleForeground.add(battleUi)
    // The approved Battle base is a full-screen composite. Drawing a separate
    // fish under it hides the species art. Battle foreground is its sole owner.
    battleField.remove([battleLocationOverlay, battleFish])
    battleForeground.addAt(battleLocationOverlay, 1)
    battleForeground.addAt(battleJumpFx, 2)
    battleForeground.addAt(battleFish, 3)
    const resultForeground = scene.add.container(0, 0).setVisible(false)
    const resultUi = [resultBase, resultGet, resultCard, ...(resultInfoSkin ? [resultInfoSkin] : []), resultName, resultSize, resultScore, ...(resultPrimarySkin ? [resultPrimarySkin] : []), resultTownMask, resultTownMaskText, ...(resultSecondarySkin ? [resultSecondarySkin] : []), ...(resultFailureLeftSkin ? [resultFailureLeftSkin] : []), ...(resultFailureRightSkin ? [resultFailureRightSkin] : []), resultFailureOptions, resultRetryText, resultFailureEquip, resultFailurePort]
    resultField.remove(resultUi)
    resultForeground.add(resultUi)
    // The approved full-screen Result skin must remain behind the actual fish.
    // Host owns the hero layer; keep fish above the skin and below GET/card.
    resultField.remove(resultFish)
    resultForeground.addAt(resultFish, 1)
    field.add([battleForeground, resultForeground])

    // The Retrieve master bitmap has Harbor's label painted in its HUD.
    // A fully opaque Bay/Cape underlay is needed: the normal HUD's 0.96
    // alpha still leaves the old text visibly ghosting through.
    const retrieveHudCover = scene.add.graphics().setVisible(false)
    retrieveHudCover.fillStyle(0xffffff, 1)
    retrieveHudCover.fillRoundedRect(10, 14, DESIGN_WIDTH - 20, 52, 15)
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
    chrome.add([retrieveHudCover, hudBase, hudSkin, back, pin, location, rod, distance, tackle, instruction])

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
      retrieveHudCover,
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
      approvedSplit,
      chrome,
      battleFish,
      battleJumpFx,
      battleLocationOverlay,
      castLocationOverlay,
      retrieveLocationOverlay,
      battleFishName,
      battleTensionFill,
      battleTensionStatus,
      battleOpeningMeter,
      battleReel,
      battleRage,
      battleInstruction,
      battleInstructionBacking,
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

  _syncFishImage(image, fishId, slot = 'battle', leaping = false) {
    const asset = leaping
      ? FISH_JUMP_ART[fishId] ?? FISH_ART[fishId] ?? FISH_ART.tai
      : FISH_ART[fishId] ?? FISH_ART.tai
    if (asset?.key && this.scene.textures.exists(asset.key) && image.texture.key !== asset.key) image.setTexture(asset.key)
    if (slot === 'result' || slot === 'battle') {
      // Texture replacement retains the previous image scale; a 768px Madai
      // texture and 640px species heroes would display at different sizes.
      // Fit the current texture inside its phase's visual bounds every time.
      const bounds = slot === 'result' ? RESULT_FISH_BOUNDS : BATTLE_FISH_BOUNDS
      const source = image.texture?.getSourceImage?.()
      const width = source?.naturalWidth ?? source?.width ?? 1
      const height = source?.naturalHeight ?? source?.height ?? 1
      const scale = Math.min(bounds.width / width, bounds.height / height)
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
    // Bay/Cape Retrieve needs a native location label above its Harbor-based
    // approved bitmap. Shield the baked lettering with an opaque backing.
    // Leave Cast and Harbor Retrieve untouched, including their pixel QA.
    const nonHarborRetrieveHud = retrieveVisible
      && (this.scene.env?.point === 'pointB' || this.scene.env?.point === 'pointC')
    this.nodes.chrome.setVisible(castVisible || nonHarborRetrieveHud)
    this.nodes.retrieveHudCover.setVisible(nonHarborRetrieveHud)
    this.nodes.instruction.setVisible(castVisible)
    this.nodes.location.setText(view.locationLabel)
    this.nodes.distance.setText(view.distanceLabel)
    if (!battleVisible) {
      this._jumpRageStartedAt = null
      this._jumpRageFishId = null
    }
    const locPoint = this.scene.env?.point ?? 'pointA'
    const locAsset = BATTLE_LOCATION_ART[locPoint] ?? BATTLE_LOCATION_ART.pointA
    for (const overlay of [this.nodes.castLocationOverlay, this.nodes.retrieveLocationOverlay]) {
      if (!overlay) continue
      const enabled = castLocationPreviewEnabled() && locPoint !== 'pointA'
      overlay.setVisible(enabled)
      if (enabled) {
        overlay.setTexture(locAsset.key)
          .setAlpha(locPoint === 'pointC' ? 0.19 : 0.22)
      }
    }
    if (castVisible) {
      this.nodes.powerFill.clear()
      const gauge = CAST_LAYER_CONFIG.controls.gauge
      drawStatusMeter(this.nodes.powerFill, { x: gauge.x + 3, y: gauge.y + 3, w: gauge.width - 6, h: gauge.height - 6, value: view.charge01, max: 1, tone: 'sun' })
    }
    if (battleVisible) {
      const battle = view.battle
      const leap = battle.isRaging && Object.hasOwn(FISH_JUMP_ART, battle.fishId)
      if (leap && (this._jumpRageStartedAt === null || this._jumpRageFishId !== battle.fishId)) {
        this._jumpRageStartedAt = this.scene.time.now
        this._jumpRageFishId = battle.fishId
      } else if (!leap) {
        this._jumpRageStartedAt = null
        this._jumpRageFishId = null
      }
      const jump = leap
        ? battleJumpFrame(battle.fishId, this.scene.time.now - this._jumpRageStartedAt, isReducedMotion())
        : null
      this._syncFishImage(this.nodes.battleFish, battle.fishId, 'battle', leap)
      // Motion is presentation-only. Its peak stays within the approved
      // foreground bounds; the same fish, input and Battle owner are retained.
      this.nodes.battleFish.setPosition(210 + (jump?.driftX ?? 0), 326 + (jump?.liftY ?? 0))
        .setAngle(jump?.angleDeg ?? -8)
      this.nodes.battleJumpFx.setVisible(leap).setAlpha(jump?.splashAlpha ?? 1)
      if (leap) this.nodes.battleJumpFx.setTexture(FISH_JUMP_FX[battle.fishId].key)
      const point = this.scene.env?.point ?? 'pointA'
      const overlay = this.nodes.battleLocationOverlay
      const art = BATTLE_LOCATION_ART[point] ?? BATTLE_LOCATION_ART.pointA
      overlay.setTexture(art.key).setVisible(point !== 'pointA')
        .setAlpha(point === 'pointC' ? 0.32 : 0.28)
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
      const openingMeter = this.nodes.battleOpeningMeter
      openingMeter.clear().setVisible(battle.rageOpeningAvailable)
      if (battle.rageOpeningAvailable) {
        const meterX = 60, meterY = 615, meterW = 270, meterH = 7
        const fillW = Math.max(3, meterW * battle.rageOpening01)
        openingMeter.fillStyle(0x062c44, 0.86)
          .fillRoundedRect(meterX, meterY, meterW, meterH, 3.5)
        openingMeter.fillStyle(0x71d6a2, 1)
          .fillRoundedRect(meterX, meterY, fillW, meterH, 3.5)
        openingMeter.lineStyle(1, 0xeafff3, 0.72)
          .strokeRoundedRect(meterX, meterY, meterW, meterH, 3.5)
      }
      const rageMode = battle.isRaging ? 'rage'
        : battle.openingSwipeHit ? 'opening-hit'
          : battle.rageOpeningAvailable ? 'opening'
            : battle.rageTelegraph ? 'telegraph' : 'calm'
      if (this._battleRageMode !== rageMode) {
        this._battleRageMode = rageMode
        if (rageMode === 'telegraph') {
          this.nodes.battleRage.setText('引きが強まる… 次は待とう')
            .setStyle({ color: '#173248', backgroundColor: 'rgba(255,217,90,0.96)' })
        } else if (rageMode === 'opening') {
          this.nodes.battleRage.setText(`${battle.fishName}が疲れた！ 今が巻きどき`)
            .setStyle({ color: '#073754', backgroundColor: 'rgba(113,214,162,0.96)' })
        } else if (rageMode === 'opening-hit') {
          this.nodes.battleRage.setText('好機をつかんだ！ +8%')
            .setStyle({ color: '#073754', backgroundColor: 'rgba(113,214,162,0.96)' })
        } else if (rageMode === 'rage') {
          this.nodes.battleRage.setText('暴れている… 待つ')
            .setStyle({ color: '#fff3a5', backgroundColor: 'rgba(94,32,26,0.86)' })
        }
      }
      this.nodes.battleRage.setVisible(rageMode !== 'calm')
        .setAlpha(battle.rageTelegraph ? 0.72 + (Math.sin(this.scene.time.now * 0.018) + 1) * 0.14 : 1)
      const instructionMode = battle.isRaging ? 'rage'
        : battle.openingSwipeHit ? 'opening-hit'
          : battle.rageOpeningAvailable ? 'opening'
            : battle.rageTelegraph ? 'telegraph' : 'reel'
      const instruction = {
        reel: ['タップ / 下へスワイプで巻く', 0x052b43, 0x8edfff],
        telegraph: ['そろそろ暴れる！次は待つ', 0x483a17, 0xffd95a],
        rage: ['暴れてる！巻かずに待つ', 0x542b26, 0xff9a70],
        opening: ['巻きどき！タップ / 下へスワイプ', 0x0b624f, 0x8dffd1],
        'opening-hit': ['成功！落ち着いて巻き続けよう', 0x0b624f, 0x8dffd1],
      }[instructionMode]
      if (this._battleInstructionMode !== instructionMode) {
        this._battleInstructionMode = instructionMode
        this.nodes.battleInstruction.setText(instruction[0])
        this.nodes.battleInstructionBacking.clear()
          .fillStyle(instruction[1], 1)
          .fillRoundedRect(20, 631, DESIGN_WIDTH - 40, 34, 14)
          .lineStyle(1, instruction[2], 0.48)
          .strokeRoundedRect(20, 631, DESIGN_WIDTH - 40, 34, 14)
      }
    }
    if (resultVisible) {
      const result = view.result
      const caught = result.outcome === 'caught'
      const retry = getRetryJourneyCopy(this.scene.env?.point)
      this._syncFishImage(this.nodes.resultFish, result.fishId, 'result')
      if (this.nodes.characterMotion?.cute) {
        // Leave the left side for the complete celebration pose, above the card.
        const hero = this.nodes.resultFish
        const ratio = 230 / hero.displayWidth
        hero.setDisplaySize(230, hero.displayHeight * ratio).setX(250)
      }
      this.nodes.characterMotion?.setFishTexture(FISH_ART[result.fishId] ?? FISH_ART.tai)
      this.nodes.resultGlow.setVisible(caught && !this.nodes.resultOutcomeFx)
      this.nodes.resultOutcomeFx?.setVisible(true)
        .setTexture(caught ? ASSETS.gameplayFx.resultCaught.key : ASSETS.gameplayFx.resultEscaped.key)
        .setAlpha(caught ? 0.9 : 0.78)
      // Keep the full premium fish visible during the entire catch celebration.
      // The character pose may hold a tiny duplicate fish; the premium hero is
      // the single visual owner in Result.
      this.nodes.resultFish.setVisible(caught)
      if (caught) this.nodes.characterMotion?.fish?.setVisible(false)
      this.nodes.resultGet.setText(caught ? 'GET!' : 'ESCAPED').setFontSize(caught ? 68 : 44)
      // The Result card must read at phone size without changing its layout.
      // Clamp name/score width so long Japanese labels stay within their columns.
      const name = this.nodes.resultName
      name.setText(caught ? result.fishName : retry.cause).setFontSize(caught ? 28 : 19)
      name.setScale(Math.min(caught ? 1.5 : 1.15, 294 / Math.max(1, name.width)))
      const size = this.nodes.resultSize
      size.setPosition(caught ? 119 : DESIGN_WIDTH / 2, 526)
        .setFontSize(caught ? 23 : 13)
        .setWordWrapWidth(caught ? 0 : 284)
        .setText(caught ? `サイズ\n${result.sizeCm} cm` : retry.advice)
      size.setScale(caught ? Math.min(1.3, 132 / Math.max(1, size.width)) : 1)
      const score = this.nodes.resultScore
      score.setText(caught ? `${result.score} pt\n獲得済み` : '').setFontSize(caught ? 22 : 27)
      score.setScale(caught ? Math.min(1.22, 143 / Math.max(1, score.width)) : 1)
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
      this.nodes.resultTownMaskText.setFontSize(caught ? 23 : 22)
        .setText(caught ? '町へ持ち帰る' : retry.primary)
        .setScale(caught ? 1.25 : 1)
      this.nodes.resultRetryText.setText('もう一投').setFontSize(25).setScale(caught ? 1.3 : 1)
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
