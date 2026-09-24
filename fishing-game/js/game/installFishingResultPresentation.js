function clearResultHero(scene) {
  scene._resultHeroTween?.stop?.()
  scene._resultHeroTween?.destroy?.()
  scene._resultHeroTween = null
  scene._resultHeroFish?.destroy?.()
  scene._resultHeroFish = null
}

function buildResultHero(scene) {
  clearResultHero(scene)

  // Phaser can be unreliable when an Image is inserted into an already-built
  // Container after the result overlay becomes visible. Keep the caught fish
  // on its own fixed screen-space layer instead. The card remains UI; the fish
  // is the payoff sitting visually on top of it.
  const icon = scene.resIcon
  if (!icon?.active || !icon.texture?.key) return null

  icon.setVisible(false)
  scene.resEmoji?.setVisible?.(false)

  const { width: W, height: H } = scene.scale
  const hero = scene.add.image(W / 2, H / 2 - 92, icon.texture.key)
    .setDisplaySize(172, 172)
    .setDepth(132)
    .setScrollFactor(0)
    .setAlpha(0)

  scene._resultHeroFish = hero
  const baseScaleX = hero.scaleX
  const baseScaleY = hero.scaleY
  hero.setScale(baseScaleX * 0.78, baseScaleY * 0.78)

  scene.tweens.add({
    targets: hero,
    alpha: 1,
    scaleX: baseScaleX,
    scaleY: baseScaleY,
    duration: 360,
    ease: 'Back.easeOut',
  })

  scene._resultHeroTween = scene.tweens.add({
    targets: hero,
    angle: 3.5,
    y: hero.y - 3,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
  return hero
}

function polishCaughtResult(scene) {
  if (scene.phase !== 'result' || !scene.resultOverlay?.visible) return

  scene.resIcon?.setPosition?.(0, -116)
  scene.resEmoji?.setPosition?.(0, -116)
  scene.resEmoji?.setFontSize?.(108)
  scene.resName?.setY?.(8)
  scene.resPts?.setY?.(50)
  scene.resHint?.setY?.(88)

  scene.resultOverlay.setAlpha(0)
  scene.tweens.add({
    targets: scene.resultOverlay,
    alpha: 1,
    duration: 220,
    ease: 'Sine.easeOut',
  })

  const hero = buildResultHero(scene)
  if (!hero) {
    scene.resEmoji?.setVisible?.(true)
    const visual = scene.resEmoji
    if (visual?.active) {
      const sx = visual.scaleX
      const sy = visual.scaleY
      visual.setScale(sx * 0.88, sy * 0.88)
      scene.tweens.add({
        targets: visual,
        scaleX: sx,
        scaleY: sy,
        duration: 320,
        ease: 'Back.easeOut',
      })
    }
  }
}

/** Result remains one portrait screen, but the caught fish is the visual hero. */
export function installFishingResultPresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingResultPresentationInstalled) return
  GameScene.prototype.__ainanFishingResultPresentationInstalled = true

  GameScene.prototype._polishCaughtResultPresentation = function () {
    polishCaughtResult(this)
  }

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    clearResultHero(this)
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') polishCaughtResult(this)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    clearResultHero(this)
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    clearResultHero(this)
    return originalCleanup.apply(this, args)
  }
}
