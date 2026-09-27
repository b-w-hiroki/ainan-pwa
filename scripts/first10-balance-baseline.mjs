import { FISH_LIST, calcFishWeight } from '../fishing-game/js/game/fish.js'

const rarityScoreMod = { common: 1, uncommon: 1.5, rare: 2.5, legendary: 5 }
const points = ['pointA','pointB','pointC']
const envBase = { season:'autumn', timeOfDay:'noon', weather:'sunny', player:{ baitType:'worm' } }

function expectedForPoint(point) {
  const env = { ...envBase, point }
  const fish = FISH_LIST.filter(f => f.habitat.includes(point) && f.id !== 'kue')
  const rows = fish.map(f => {
    const weight = calcFishWeight(f, env)
    return {
      id:f.id,
      rarity:f.rarity,
      weight,
      score:f.scoreBase * (rarityScoreMod[f.rarity] ?? 1),
    }
  })
  const total = rows.reduce((s,r)=>s+r.weight,0)
  const expectedScore = rows.reduce((s,r)=>s+r.weight*r.score,0) / total
  const rareRate = rows.filter(r=>['rare','legendary'].includes(r.rarity)).reduce((s,r)=>s+r.weight,0) / total
  return { point, expectedScore, rareRate }
}

const pointStats = points.map(expectedForPoint)
const meanScore = pointStats.reduce((s,r)=>s+r.expectedScore,0)/pointStats.length
const meanRare = pointStats.reduce((s,r)=>s+r.rareRate,0)/pointStats.length

const baseline = {
  windowMinutes: 10,
  catchesTarget: [2,4],
  castsTarget: [4,8],
  hookSuccessTarget: [0.55,0.85],
  battleCatchTarget: [0.60,0.90],
  rareEncounterTarget: [0.08,0.25],
  staminaSpendTarget: [4,8],
  scoreTarget: [Math.round(meanScore*2), Math.round(meanScore*4)],
  expectedScorePerCatch: Math.round(meanScore),
  expectedRareEncounterRate: Number(meanRare.toFixed(3)),
  pointStats: pointStats.map(x=>({point:x.point,score:Math.round(x.expectedScore),rareRate:Number(x.rareRate.toFixed(3))})),
}
console.log(JSON.stringify(baseline,null,2))
