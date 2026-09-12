import { TackleUI } from '../scenes/components/TackleUI.js'

export function installTackleSync(GameScene) {
  if (GameScene.prototype.__ainanTackleSyncInstalled) return
  GameScene.prototype.__ainanTackleSyncInstalled = true

  const originalUpdateBtnIcon = TackleUI.prototype._updateBtnIcon
  TackleUI.prototype._updateBtnIcon = function (type, icon) {
    const result = originalUpdateBtnIcon.call(this, type, icon)
    this.scene._syncTackle?.()
    this.scene.bobberMgr?.setBaitType?.(this.scene.env?.player?.baitType ?? 'worm')
    this.scene.bg?._fishRuntime?.forEach(runtime => {
      runtime.interest = 0
      runtime.stimulation = 0
      runtime.spooked = false
    })
    return result
  }

  const originalSyncTackle = GameScene.prototype._syncTackle
  GameScene.prototype._syncTackle = function (...args) {
    const result = originalSyncTackle.apply(this, args)
    this.bobberMgr?.setBaitType?.(this.bait?.id ?? this.env?.player?.baitType ?? 'worm')
    return result
  }
}
