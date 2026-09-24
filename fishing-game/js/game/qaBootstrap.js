function enabled() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1'
}

export function prepareQaState() {
  if (!enabled()) return
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_gems', '12')
  localStorage.setItem('ainan_stamina', JSON.stringify({ value: 10, updatedAt: Date.now() }))
  const params = new URLSearchParams(window.location.search)
  const townTier = Math.max(1, Math.min(5, parseInt(params.get('townTier') ?? '5', 10) || 5))
  localStorage.setItem('ainan_town_facilities', JSON.stringify({ market: townTier, pier: townTier, guide: townTier, festival: townTier }))
  localStorage.setItem('ainan_materials', JSON.stringify({ scale: 30, shell: 20, ticket: 10, crystal: 5 }))
  localStorage.setItem('ainan_rod_levels', JSON.stringify({ basic: 5, carbon: 4, premium: 3 }))
  localStorage.setItem('ainan_seen_town', '1')
  localStorage.setItem('ainan_seen_services', '1')
  localStorage.setItem('ainan_seen_workshop', '1')
  localStorage.setItem('ainan_seen_open_pointB', '1')
  localStorage.setItem('ainan_seen_open_pointC', '1')
  const now = new Date()
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  localStorage.setItem('ainan_daily_bonus_date', today)
  localStorage.setItem('ainan_daily_bonus_streak', '4')
  const pendingBosses = params.get('bossState') === 'pending'
  const freshBoss = params.get('qaFreshBoss') === '1' ? params.get('qaBoss') : null
  const bossFishId = { harborRunner: 'buri', bayHunter: 'bass', kue: 'kue' }[freshBoss] ?? null
  const rows = [
    ['aji', 28, 'pointA'], ['tai', 58, 'pointA'], ['saba', 42, 'pointA'],
    ['bass', pendingBosses ? 42 : 61, 'pointB'], ['isaki', 46, 'pointB'], ['hirame', 70, 'pointB'],
    ['buri', pendingBosses ? 44 : 72, 'pointA'], ['kanpachi', 78, 'pointC'], ['kue', pendingBosses ? 82 : 112, 'pointC'],
  ].filter(row => row[0] !== bossFishId)
  const catches = rows.map((row, index) => ({
    fishId: row[0], sizeCm: row[1], point: row[2], score: 300 + index * 80,
    season: 'autumn', timeOfDay: 'noon', weather: 'sunny',
    timestamp: Date.now() - index * 1000,
  }))
  localStorage.setItem('ainan_catches', JSON.stringify(catches))
  localStorage.setItem('ainan_boss_trophies', JSON.stringify({}))
}

export function routeQaScene(game) {
  if (!enabled()) return
  const params = new URLSearchParams(window.location.search)
  const scene = params.get('scene')
  if (!scene) return
  window.setTimeout(() => {
    try {
      const data = {}
      if (scene === 'GameScene') {
        const point = params.get('qaLocation')
        if (['pointA', 'pointB', 'pointC'].includes(point)) data.point = point
      }
      game.scene.start(scene, data)
    } catch (error) {
      console.error('QA scene route failed', scene, error)
    }
  }, 500)
}