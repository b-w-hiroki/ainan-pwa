function enabled() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('qa') === '1'
}

export function prepareQaState() {
  if (!enabled()) return
  localStorage.setItem('ainan_score', '25000')
  localStorage.setItem('ainan_gems', '12')
  localStorage.setItem('ainan_stamina', JSON.stringify({ value: 10, updatedAt: Date.now() }))
  localStorage.setItem('ainan_town_facilities', JSON.stringify({ market: 5, pier: 5, guide: 5, festival: 5 }))
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
  const catches = [
    ['aji', 28, 'pointA'], ['tai', 58, 'pointA'], ['saba', 42, 'pointA'],
    ['bass', 61, 'pointB'], ['isaki', 46, 'pointB'], ['hirame', 70, 'pointB'],
    ['buri', 72, 'pointA'], ['kanpachi', 78, 'pointC'], ['kue', 112, 'pointC'],
  ].map((row, index) => ({ fishId: row[0], sizeCm: row[1], point: row[2], score: 300 + index * 80, season: 'autumn', timeOfDay: 'noon', weather: 'sunny', timestamp: Date.now() - index * 1000 }))
  localStorage.setItem('ainan_catches', JSON.stringify(catches))
}

export function routeQaScene(game) {
  if (!enabled()) return
  const params = new URLSearchParams(window.location.search)
  const scene = params.get('scene')
  if (!scene) return
  window.setTimeout(() => {
    try { game.scene.start(scene) } catch (error) { console.error('QA scene route failed', scene, error) }
  }, 500)
}