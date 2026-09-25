const KNOWN_LEGACY_REFS = [
  'castHintBg','hintText','powerGfx','powerLabel','scoreBar','schoolFx',
  'escapeBar','battlePanel','reelCTA','rageTag','hitHint','dangerFx',
  'resultOverlay','_blueprintCastInstruction','_rcCastDock','_rcRetrieveDock',
  '_mobileFishingHud','_distanceBadge','_castDistanceBadge','_assetLureRipple',
  'battleHero','battleHeroGlow','_battleHeroFish','_battleScreenHero',
  '_resultHeroFish','_qaMockSubject',
]

function setRefVisible(scene, key, visible) {
  const obj = scene[key]
  obj?.setVisible?.(visible)
}

export class FishingLegacyVisibilityGate {
  constructor(scene) {
    this.scene = scene
    this._hidden = false
  }

  suppress() {
    this._hidden = true
    for (const key of KNOWN_LEGACY_REFS) setRefVisible(this.scene, key, false)

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

    // Keep world actors alive for game logic, but presentation owns their visuals.
    this.scene._playerSprite?.setVisible?.(false)
    this.scene._playerShadow?.setVisible?.(false)
    ;(this.scene.bg?._fishGfx ?? []).forEach(obj => obj?.setVisible?.(false))
    this.scene.bobber?.setVisible?.(false)
    this.scene.lineGfx?.setVisible?.(false)
    this.scene.castGfx?.setVisible?.(false)
  }

  sync() {
    if (!this._hidden) return
    this.suppress()
  }

  restoreWorldLogic() {
    this.scene.lineGfx?.setVisible?.(true)
    this.scene.castGfx?.setVisible?.(true)
  }

  destroy() {
    this._hidden = false
  }
}
