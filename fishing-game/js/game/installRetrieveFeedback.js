import { FISH_INTEREST_STATE } from './fishInterest.js'

export function installRetrieveFeedback(GameScene) {
  if (GameScene.prototype.__ainanRetrieveFeedbackInstalled) return
  GameScene.prototype.__ainanRetrieveFeedbackInstalled = true

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    this.retrieveUI?.syncFishSense('cruise', false)
    return result
  }

  const originalTickFishInterest = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const result = originalTickFishInterest.apply(this, args)
    if (this.phase !== 'retrieve') return result

    const runtimes = this.bg?._fishRuntime ?? []
    const spooked = runtimes.find(runtime => runtime.spooked)
    const active = runtimes
      .filter(runtime => runtime.state !== FISH_INTEREST_STATE.CRUISE)
      .sort((a, b) => (b.interest ?? 0) - (a.interest ?? 0))[0]

    this.retrieveUI?.syncFishSense(active?.state ?? 'cruise', Boolean(spooked))

    if (spooked) {
      this.retrieveUI?.setHint('動かしすぎたかも。少し止めて様子を見よう')
      return result
    }

    const hints = {
      noticed: '魚影が向きを変えた。今の動きを少し続けよう',
      follow: '追ってきている…巻きすぎず距離を保とう',
      inspect: 'すぐ近く。巻くか止めるか見極めよう',
      biteReady: '食いそう…！　動きを変えすぎない',
    }
    if (active && hints[active.state]) this.retrieveUI?.setHint(hints[active.state])
    return result
  }

  // 実キャラがプレイフィールド内で十分見えている間は小窓を出さない。
  GameScene.prototype._syncPlayerActionInset = function () {
    if (!this.playerActionInset || !this._playerSprite || this.phase !== 'retrieve') {
      this.playerActionInset?.setVisible(false)
      return
    }

    const cam = this.cameras.main
    const sx = this._playerSprite.x - cam.scrollX
    const sy = this._playerSprite.y - cam.scrollY
    const W = this.scale.width
    const H = this.scale.height
    const comfortablyVisible = sx > 8 && sx < W - 8 && sy > 105 && sy < H - 170

    let action = this.retrieveState?.action ?? 'idle'
    const targetState = this._retrieveTargetFish?.state
    if (targetState === FISH_INTEREST_STATE.BITE_READY || targetState === FISH_INTEREST_STATE.INSPECT) action = 'biteReady'
    else if (targetState === FISH_INTEREST_STATE.FOLLOW) action = 'follow'

    this.playerActionInset.syncFromPlayer(this._playerSprite, action)
    this.playerActionInset.setVisible(!comfortablyVisible)
  }
}
