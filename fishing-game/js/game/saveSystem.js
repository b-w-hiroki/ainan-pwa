export const SAVE_VERSION = 3

const SAVE_KEYS = [
  'ainan_score', 'ainan_catches', 'ainan_inventory', 'ainan_equipment',
  'ainan_stamina', 'ainan_gems', 'ainan_rewards', 'ainan_town_facilities',
  'ainan_claimed_missions', 'ainan_claimed_mission_bonuses',
  'ainan_claimed_licenses', 'ainan_claimed_license_bonuses',
  'ainan_materials', 'ainan_rod_levels', 'ainan_accessories',
  'ainan_catch_stock', 'ainan_active_meal', 'ainan_boss_trophies',
  'ainan_collection_rewards', 'ainan_daily_challenge_claimed',
  'ainan_achievement_claimed', 'ainan_unlocked_titles', 'ainan_selected_title',
  'ainan_onboarding_skipped', 'ainan_seen_services', 'ainan_seen_workshop',
  'ainan_sound_enabled', 'ainan_haptics_enabled', 'ainan_reduced_motion',
]

const BACKUP_KEYS = ['ainan_save_backup_1', 'ainan_save_backup_2', 'ainan_save_backup_3']

function checksumData(data) {
  const source = JSON.stringify(data)
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function createSaveSnapshot() {
  const data = {}
  SAVE_KEYS.forEach(key => {
    const value = localStorage.getItem(key)
    if (value != null) data[key] = value
  })
  return { version: SAVE_VERSION, createdAt: Date.now(), data, checksum: checksumData(data) }
}

export function validateSnapshot(snapshot) {
  if (!snapshot?.data || typeof snapshot.data !== 'object') return false
  if (!snapshot.checksum) return true
  return snapshot.checksum === checksumData(snapshot.data)
}

export function backupSave() {
  try {
    for (let i = BACKUP_KEYS.length - 1; i > 0; i--) {
      const previous = localStorage.getItem(BACKUP_KEYS[i - 1])
      if (previous != null) localStorage.setItem(BACKUP_KEYS[i], previous)
    }
    const snapshot = createSaveSnapshot()
    const encoded = JSON.stringify(snapshot)
    localStorage.setItem(BACKUP_KEYS[0], encoded)
    localStorage.setItem('ainan_save_backup', encoded)
    return true
  } catch {
    return false
  }
}

function initializeDefaults() {
  localStorage.setItem('ainan_materials', localStorage.getItem('ainan_materials') ?? JSON.stringify({ scale: 0, shell: 0, ticket: 0, crystal: 0 }))
  localStorage.setItem('ainan_rod_levels', localStorage.getItem('ainan_rod_levels') ?? JSON.stringify({ basic: 1, carbon: 1, premium: 1 }))
  localStorage.setItem('ainan_accessories', localStorage.getItem('ainan_accessories') ?? JSON.stringify({ owned: { cap: false, bag: false }, equipped: { hat: null, bag: null } }))
  localStorage.setItem('ainan_catch_stock', localStorage.getItem('ainan_catch_stock') ?? JSON.stringify({}))
  localStorage.setItem('ainan_boss_trophies', localStorage.getItem('ainan_boss_trophies') ?? JSON.stringify({}))
  localStorage.setItem('ainan_collection_rewards', localStorage.getItem('ainan_collection_rewards') ?? JSON.stringify({}))
  localStorage.setItem('ainan_daily_challenge_claimed', localStorage.getItem('ainan_daily_challenge_claimed') ?? JSON.stringify({}))
  localStorage.setItem('ainan_achievement_claimed', localStorage.getItem('ainan_achievement_claimed') ?? JSON.stringify({}))
  localStorage.setItem('ainan_unlocked_titles', localStorage.getItem('ainan_unlocked_titles') ?? JSON.stringify([]))
}

function applySnapshot(snapshot) {
  if (!validateSnapshot(snapshot)) return false
  Object.entries(snapshot.data).forEach(([key, value]) => localStorage.setItem(key, String(value)))
  initializeDefaults()
  localStorage.setItem('ainan_save_version', String(SAVE_VERSION))
  return true
}

export function getBackupSummaries() {
  return BACKUP_KEYS.map((key, index) => {
    try {
      const value = localStorage.getItem(key)
      if (!value) return { slot: index + 1, exists: false, valid: false, createdAt: 0 }
      const snapshot = JSON.parse(value)
      return { slot: index + 1, exists: true, valid: validateSnapshot(snapshot), createdAt: snapshot.createdAt ?? 0 }
    } catch {
      return { slot: index + 1, exists: true, valid: false, createdAt: 0 }
    }
  })
}

export function restoreBackup(slot = 1) {
  try {
    const index = Math.max(1, Math.min(3, slot)) - 1
    const raw = localStorage.getItem(BACKUP_KEYS[index])
    if (!raw) return false
    return applySnapshot(JSON.parse(raw))
  } catch {
    return false
  }
}

export function restoreLatestBackup() {
  if (restoreBackup(1)) return true
  try {
    const legacy = JSON.parse(localStorage.getItem('ainan_save_backup') ?? 'null')
    return applySnapshot(legacy)
  } catch {
    return false
  }
}

export function exportSaveData() {
  const snapshot = createSaveSnapshot()
  return JSON.stringify({ format: 'ainan-save', ...snapshot })
}

export function importSaveData(text) {
  try {
    const snapshot = JSON.parse(String(text ?? '').trim())
    if (snapshot.format !== 'ainan-save') return false
    if (!validateSnapshot(snapshot)) return false
    backupSave()
    return applySnapshot(snapshot)
  } catch {
    return false
  }
}

export function ensureSaveVersion() {
  const current = parseInt(localStorage.getItem('ainan_save_version') ?? '1', 10)
  if (!Number.isFinite(current) || current < SAVE_VERSION) backupSave()
  initializeDefaults()
  localStorage.setItem('ainan_save_version', String(SAVE_VERSION))
  return SAVE_VERSION
}
