import { BackgroundManager } from '../scenes/components/BackgroundManager.js'
import { FISH_LIST, calcFishWeight } from './fish.js'
import { FISHING_WORLD } from '../scenes/components/FishingCameraController.js'

function zoneForWorldY(y) {
  const distanceM = Math.max(0, (FISHING_WORLD.player.y - y) / FISHING_WORLD.pxPerMeter)
  if (distanceM < 23) return 'near'
  if (distanceM < 35) return 'mid'
  return 'far'
}

function eligibleForScene(scene) {
  const baitType = scene.env?.player?.baitType ?? 'worm'
  return FISH_LIST.filter(fish => {
    if (!fish.habitat.includes(scene.env?.point)) return false
    if (fish.id === 'kue' && baitType !== 'special') return false
    return true
  })
}

function weightedPick(candidates, scene) {
  if (!candidates.length) return null
  const weights = candidates.map(fish => Math.max(0.01, calcFishWeight(fish, scene.env)))
  const total = weights.reduce((sum, value) => sum + value, 0)
  let roll = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

function assignCastZoneFish(scene) {
  const manager = scene.bg
  if (!manager?._fishRuntime?.length) return
  const eligible = eligibleForScene(scene)

  manager._fishRuntime.forEach((runtime, index) => {
    const fd = manager._fishDefs[index]
    const gfx = runtime.gfx
    if (!fd || !gfx) return

    const y = FISHING_WORLD.height * fd.y
    const zone = zoneForWorldY(y)
    let candidates = eligible.filter(fish => (fish.castZones ?? ['near', 'mid', 'far']).includes(zone))

    // 釣り場にその層の魚がいない場合だけ、隣接層まで候補を広げる。
    if (!candidates.length) {
      const fallbackZones = zone === 'near' ? ['near', 'mid'] : zone === 'far' ? ['mid', 'far'] : ['near', 'mid', 'far']
      candidates = eligible.filter(fish => (fish.castZones ?? ['near', 'mid', 'far']).some(z => fallbackZones.includes(z)))
    }

    const fish = weightedPick(candidates, scene)
    if (!fish) return
    runtime.fishDef = fish
    runtime.castZone = zone
    runtime.interest = 0
    runtime.stimulation = 0
    runtime.spooked = false

    const visualType = fish.rarity === 'legendary' ? 'rare' : fish.rarity
    const sizeBoost = 0.88 + Math.min(3, fish.size ?? 1) * 0.12
    manager._drawFish(gfx, visualType, fd.sc * sizeBoost)
    gfx.setScale(fd.rtl ? -1 : 1, 1)
  })
}

export function installCastZoneFish(GameScene) {
  if (GameScene.prototype.__ainanCastZoneFishInstalled) return
  GameScene.prototype.__ainanCastZoneFishInstalled = true

  const originalSpawnFish = BackgroundManager.prototype.spawnFish
  BackgroundManager.prototype.spawnFish = function (...args) {
    const result = originalSpawnFish.apply(this, args)
    assignCastZoneFish(this.scene)
    return result
  }

  const originalEnterCast = GameScene.prototype._enterCast
  GameScene.prototype._enterCast = function (...args) {
    const result = originalEnterCast.apply(this, args)
    assignCastZoneFish(this)
    return result
  }
}
