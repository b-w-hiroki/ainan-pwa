const KNOWN_LEGACY_REFS = [
  'castHintBg','hintText','powerGfx','powerLabel','scoreBar','schoolFx',
  'escapeBar','battlePanel','reelCTA','rageTag','hitHint','dangerFx',
  'resultOverlay','_blueprintCastInstruction','_rcCastDock','_rcRetrieveDock',
  '_mobileFishingHud','_distanceBadge','_castDistanceBadge','_assetLureRipple',
  'battleHero','battleHeroGlow','_battleHeroFish','_battleScreenHero',
  '_resultHeroFish','_qaMockSubject',
]

function hideRef(scene, key) {
  scene[key]?.setVisible?.(false)
}

function visuallySuppressWorld(scene) {
  // Keep logical visibility/state intact: several gameplay methods use
  // bobber.visible and active fish actors as state checks.
  scene._playerSprite?.setAlpha?.(0)
  scene._playerShadow?.setAlpha?.(0)
  ;(scene.bg?._fishGfx ?? []).forEach(obj => obj?.setAlpha?.(0))
  scene.bobber?.setAlpha?.(0)
  scene.lineGfx?.setAlpha?.(0)
  scene.castGfx?.setAlpha?.(0)
}

export class FishingLegacyVisibilityGate {
  constructor(scene) {
    this.scene = scene
    this._suppressed = false
  }

  suppress() {
    this._suppressed = true
    for (const key of KNOWN_LEGACY_REFS) hideRef(this.scene, key)

    this.scene.retrieveUI?.hide?.()
    this.scene.playerActionInset?.setVisible?.(false)

    const tackle = this.scene.tackleUI
    if (tackle) {
      for (const btn of [tackle._rodBtn, tackle._baitBtn]) {
        if (!btn) continue
        Object.values(btn).forEach(obj => obj?.setVisible?.(false))
      }
      tackle._rodPanel?.setVisible?.(false)
      tackle._baitPanel?.setVisible?.(false)
    }

    this.scene._visualUpgradeAtmosphere?.objects?.forEach(obj => obj?.setVisible?.(false))
    this.scene._locationAtmosphereObjects?.forEach(obj => obj?.setVisible?.(false))
    this.scene._conditionPresentation?.overlay?.setVisible?.(false)
    this.scene._conditionPresentation?.badge?.setVisible?.(false)
    this.scene._visualUpgradeBattleFocus?.objects?.forEach(obj => obj?.setVisible?.(false))
    this.scene._visualUpgradeResultAccent?.objects?.forEach(obj => obj?.setVisible?.(false))

    visuallySuppressWorld(this.scene)
  }

  sync() {
    if (this._suppressed) this.suppress()
  }

  destroy() {
    this._suppressed = false
  }
}
