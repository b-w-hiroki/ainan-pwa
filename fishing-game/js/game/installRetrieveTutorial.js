import { RetrieveCoach } from '../scenes/components/RetrieveCoach.js'
import { FISH_INTEREST_STATE } from './fishInterest.js'

const TUTORIAL_KEY = 'ainan_retrieve_tutorial_v1'

export function installRetrieveTutorial(GameScene) {
  if (GameScene.prototype.__ainanRetrieveTutorialInstalled) return
  GameScene.prototype.__ainanRetrieveTutorialInstalled = true

  const originalCreate = GameScene.prototype.create
  GameScene.prototype.create = function (...args) {
    const result = originalCreate.apply(this, args)
    this.retrieveCoach = new RetrieveCoach(this)
    this.retrieveCoach.build(this.scale.width, this.scale.height)
    this._retrieveTutorialDone = localStorage.getItem(TUTORIAL_KEY) === '1'
    this._retrieveTutorialStep = this._retrieveTutorialDone ? 99 : 1
    return result
  }

  const originalEnterRetrieve = GameScene.prototype._enterRetrieve
  GameScene.prototype._enterRetrieve = function (...args) {
    const result = originalEnterRetrieve.apply(this, args)
    if (!this._retrieveTutorialDone) {
      this._retrieveTutorialStep = Math.max(1, Math.min(this._retrieveTutorialStep ?? 1, 3))
      if (this._retrieveTutorialStep === 1) {
        this.retrieveCoach?.show(1, 'まず「ちょい巻き」でルアーを少し動かそう')
      } else if (this._retrieveTutorialStep === 2) {
        this.retrieveCoach?.show(2, '魚影の向きが変わるまで、少しずつ探ろう')
      } else {
        this.retrieveCoach?.show(3, '追ってきたら巻きすぎない。「待つ」も有効')
      }
    }
    return result
  }

  const originalTwitchRetrieve = GameScene.prototype._twitchRetrieve
  GameScene.prototype._twitchRetrieve = function (...args) {
    const result = originalTwitchRetrieve.apply(this, args)
    if (!this._retrieveTutorialDone && this._retrieveTutorialStep === 1) {
      this._retrieveTutorialStep = 2
      this.retrieveCoach?.show(2, 'いい感じ。魚影の向きが変わるか見てみよう')
      this.retrieveCoach?.pulse()
    }
    return result
  }

  const originalTickFishInterest = GameScene.prototype._tickFishInterest
  GameScene.prototype._tickFishInterest = function (...args) {
    const result = originalTickFishInterest.apply(this, args)
    if (this._retrieveTutorialDone || this.phase !== 'retrieve') return result

    const runtimes = this.bg?._fishRuntime ?? []
    const active = runtimes
      .filter(runtime => runtime.state !== FISH_INTEREST_STATE.CRUISE)
      .sort((a, b) => (b.interest ?? 0) - (a.interest ?? 0))[0]

    if (active && this._retrieveTutorialStep < 3) {
      this._retrieveTutorialStep = 3
      this.retrieveCoach?.show(3, '気づいた！ 追ってきたら巻きすぎず「待つ」も使おう')
      this.retrieveCoach?.pulse()
    }

    if (runtimes.some(runtime => runtime.spooked)) {
      this.retrieveCoach?.show(3, '動かしすぎたかも。「待つ」で一度落ち着かせよう')
    }
    return result
  }

  const originalSetRetrieveIdle = GameScene.prototype._setRetrieveIdle
  GameScene.prototype._setRetrieveIdle = function (...args) {
    const result = originalSetRetrieveIdle.apply(this, args)
    if (!this._retrieveTutorialDone && this._retrieveTutorialStep === 3) {
      this.retrieveCoach?.pulse('その調子。魚の気配を見ながら次の動きを決めよう')
    }
    return result
  }

  const originalBeginRetrieveBite = GameScene.prototype._beginRetrieveBite
  GameScene.prototype._beginRetrieveBite = function (...args) {
    if (!this._retrieveTutorialDone) {
      this._retrieveTutorialDone = true
      localStorage.setItem(TUTORIAL_KEY, '1')
      this.retrieveCoach?.hide()
    }
    return originalBeginRetrieveBite.apply(this, args)
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    this.retrieveCoach?.hide()
    return originalEnterCast.apply(this, args)
  }

  const originalCleanup = GameScene.prototype._cleanup
  GameScene.prototype._cleanup = function (...args) {
    this.retrieveCoach?.destroy()
    this.retrieveCoach = null
    return originalCleanup.apply(this, args)
  }
}
