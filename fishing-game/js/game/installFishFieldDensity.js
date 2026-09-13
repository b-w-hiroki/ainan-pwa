import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { FISH_LIST } from './fish.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

function zoneForWorldY(y) {
  const distanceM = Math.max(0, (FISHING_WORLD.player.y - y) / FISHING_WORLD.pxPerMeter)
  if (distanceM < 23) return 'near'
  if (distanceM < 35) return 'mid'
  return 'far'
}

function pickFish(scene, zone) {
  const baitType = scene.env?.player?.baitType ?? 'worm'
  const candidates = FISH_LIST.filter(fish => {
    if (!fish.habitat.includes(scene.env?.point)) return false
    if (!(fish.castZones ?? ['near', 'mid', 'far']).includes(zone)) return false
    if (fish.id === 'kue' && baitType !== 'special') return false
    return true
  })
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function installFishFieldDensity() {
  if (BackgroundManager.prototype.__ainanFishFieldDensityInstalled) return
  BackgroundManager.prototype.__ainanFishFieldDensityInstalled = true

  const originalSpawnFish = BackgroundManager.prototype.spawnFish
  BackgroundManager.prototype.spawnFish = function (...args) {
    const result = originalSpawnFish.apply(this, args)

    // 既存6影は中〜遠距離に厚いため、近場と中距離へ各1影だけ追加する。
    // 画面を魚だらけにせず、キャスト先を探す余白は残す。
    const extras = [
      { t: 'common', y: 0.64, dur: 10800, delay: 700, sc: 0.82, rtl: true },
      { t: 'uncommon', y: 0.47, dur: 9800, delay: 2300, sc: 1.08, rtl: false },
    ]

    extras.forEach(fd => {
      const index = this._fishDefs.length
      const gfx = this.scene.add.graphics().setDepth(22)
      const zone = zoneForWorldY(FISHING_WORLD.height * fd.y)
      const fish = pickFish(this.scene, zone)
      const visualType = fish?.rarity === 'legendary' ? 'rare' : (fish?.rarity ?? fd.t)
      const sizeBoost = fish ? 0.88 + Math.min(3, fish.size ?? 1) * 0.12 : 1

      this._fishDefs.push(fd)
      this._drawFish(gfx, visualType, fd.sc * sizeBoost)
      gfx.setScale(fd.rtl ? -1 : 1, 1)
      this._fishGfx.push(gfx)

      if (!this._fishRuntime) this._fishRuntime = []
      this._fishRuntime.push({
        index,
        gfx,
        fishDef: fish ?? FISH_LIST[0],
        castZone: zone,
        state: 'cruise',
        interest: 0,
        stimulation: 0,
        spooked: false,
        lastDistance: Infinity,
        reaction: null,
      })
    })

    this.startFishTweens?.()
    return result
  }
}
