function polishCaughtResult(scene) {
  if (scene.phase !== 'result' || !scene.resultOverlay?.visible) return

  scene.resIcon?.setPosition?.(0, -116)
  scene.resIcon?.setDisplaySize?.(136, 136)
  scene.resEmoji?.setPosition?.(0, -116)
  scene.resEmoji?.setFontSize?.(108)
  scene.resName?.setY?.(-28)
  scene.resPts?.setY?.(24)
  scene.resHint?.setY?.(72)

  scene.resultOverlay.setAlpha(0)
  scene.tweens.add({
    targets: scene.resultOverlay,
    alpha: 1,
    duration: 220,
    ease: 'Sine.easeOut',
  })

  const visual = scene.resIcon ?? scene.resEmoji
  if (visual?.active) {
    visual.setScale(visual.scaleX * 0.88, visual.scaleY * 0.88)
    scene.tweens.add({
      targets: visual,
      scaleX: visual.scaleX / 0.88,
      scaleY: visual.scaleY / 0.88,
      duration: 320,
      ease: 'Back.easeOut',
    })
  }
}

/** Result remains one portrait screen, but the caught fish is the visual hero. */
export function installFishingResultPresentation(GameScene) {
  if (GameScene.prototype.__ainanFishingResultPresentationInstalled) return
  GameScene.prototype.__ainanFishingResultPresentationInstalled = true

  const originalFinishBattle = GameScene.prototype._finishBattle
  GameScene.prototype._finishBattle = function (outcome, ...args) {
    const result = originalFinishBattle.call(this, outcome, ...args)
    if (outcome === 'caught') polishCaughtResult(this)
    return result
  }
}
