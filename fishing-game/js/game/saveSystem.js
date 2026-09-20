export const SAVE_VERSION = 2

const SAVE_KEYS = [
  'ainan_score', 'ainan_catches', 'ainan_inventory', 'ainan_equipment',
  'ainan_stamina', 'ainan_gems', 'ainan_rewards', 'ainan_town_facilities',
  'ainan_claimed_missions', 'ainan_claimed_mission_bonuses',
  'ainan_claimed_licenses', 'ainan_claimed_license_bonuses',
  'ainan_materials', 'ainan_rod_levels', 'ainan_accessories',
  'ainan_catch_stock', 'ainan_active_meal', 'ainan_boss_trophies',
  'ainan_collection_rewards',
]

export function createSaveSnapshot() {
  const data = {}
  SAVE_KEYS.forEach(key => {
    const value = localStorage.getItem(key)
    if (value != null) data[key] = value
  })
  return { version: SAVE_VERSION, createdAt: Date.now(), data }
}

export function backupSave() {
  try {
    localStorage.setItem('ainan_save_backup', JSON.stringify(createSaveSnapshot()))
    return true
  } catch {
    return false
  }
}

function initializeV2Defaults() {
  localStorage.setItem('ainan_materials', localStorage.getItem('ainan_materials') ?? JSON.stringify({ scale: 0, shell: 0, ticket: 0, crystal: 0 }))
  localStorage.setItem('ainan_rod_levels', localStorage.getItem('ainan_rod_levels') ?? JSON.stringify({ basic: 1, carbon: 1, premium: 1 }))
  localStorage.setItem('ainan_accessories', localStorage.getItem('ainan_accessories') ?? JSON.stringify({ owned: { cap: false, bag: false }, equipped: { hat: null, bag: null } }))
  localStorage.setItem('ainan_catch_stock', localStorage.getItem('ainan_catch_stock') ?? JSON.stringify({}))
  localStorage.setItem('ainan_boss_trophies', localStorage.getItem('ainan_boss_trophies') ?? JSON.stringify({}))
  localStorage.setItem('ainan_collection_rewards', localStorage.getItem('ainan_collection_rewards') ?? JSON.stringify({}))
}

export function restoreLatestBackup() {
  try {
    const backup = JSON.parse(localStorage.getItem('ainan_save_backup') ?? 'null')
    if (!backup?.data) return false
    Object.entries(backup.data).forEach(([key, value]) => localStorage.setItem(key, String(value)))
    initializeV2Defaults()
    localStorage.setItem('ainan_save_version', String(SAVE_VERSION))
    return true
  } catch {
    return false
  }
}

export function ensureSaveVersion() {
  const current = parseInt(localStorage.getItem('ainan_save_version') ?? '1', 10)
  if (!Number.isFinite(current) || current < SAVE_VERSION) backupSave()
  initializeV2Defaults()
  localStorage.setItem('ainan_save_version', String(SAVE_VERSION))
  return SAVE_VERSION
}
