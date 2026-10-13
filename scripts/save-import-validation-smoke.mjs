import assert from 'node:assert/strict'

class MemoryStorage {
  map = new Map()
  fail = new Set()
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) {
    if (this.fail.has(key)) throw new Error('quota blocked for '+key)
    this.map.set(key, String(value))
  }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear(); this.fail.clear() }
}
globalThis.localStorage = new MemoryStorage()
const {
  SAVE_VERSION, createSaveSnapshot, validateSnapshot, exportSaveData,
  importSaveData, restoreBackup, restoreLatestBackup, getBackupSummaries,
} = await import('../fishing-game/js/game/saveSystem.js')

// FNV-1a exactly matches historical on-disk checksum, for creating hostile
// but checksum-consistent fixtures. The checksum isn't an authenticity proof.
function checksum(data) {
  let hash = 2166136261
  const source = JSON.stringify(data)
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
const payload = (data, version = SAVE_VERSION) => JSON.stringify({
  format: 'ainan-save', version, createdAt: 5,
  data, checksum: checksum(data),
})
const checkScore = expected => assert.equal(localStorage.getItem('ainan_score'), expected)
localStorage.setItem('ainan_score', '123')
localStorage.setItem('ainan_catches', '[{"fishId":"aji","score":10}]')
const validExport = exportSaveData()
assert.equal(validateSnapshot(JSON.parse(validExport)), true)
localStorage.setItem('ainan_score', '987')
assert.equal(importSaveData(validExport), true, 'own v3 exported file must import')
checkScore('123')
assert.equal(JSON.parse(localStorage.getItem('ainan_save_backup_1')).data.ainan_score, '987',
  'import must back up existing progress before replacement')
assert.deepEqual(JSON.parse(localStorage.getItem('ainan_catches')),
  [{fishId:'aji',score:10}])

const invalidCases = [
  ['current v3 missing checksum', JSON.stringify({
    format:'ainan-save',version:3,data:{ainan_score:'456'},
  })],
  ['unknown storage key', payload({ainan_score:'456',ainan_save_backup_1:'poison'})],
  ['unrelated local storage', payload({ainan_score:'456',third_party_token:'poison'})],
  ['prototype key', payload(JSON.parse('{"__proto__":"pollution","ainan_score":"456"}'))],
  ['non-string value', payload({ainan_score:456})],
  ['array data', JSON.stringify({format:'ainan-save',version:3,
    data:[],checksum:checksum([])})],
  ['future format version', payload({ainan_score:'456'}, 4)],
  ['missing version', JSON.stringify({format:'ainan-save',data:{ainan_score:'456'}})],
  ['bad checksum', payload({ainan_score:'456'}).replace('"checksum":"', '"checksum":"f')],
  ['oversized import', 'X'.repeat(2_000_001)],
]
for(const [label, text] of invalidCases) {
  const before = localStorage.getItem('ainan_save_backup_1')
  assert.equal(importSaveData(text),false,label+' must reject')
  checkScore('123')
  assert.equal(localStorage.getItem('ainan_save_backup_1'),before,
    label+': rejected import cannot rotate backups')
}
assert.equal(localStorage.getItem('third_party_token'),null)
assert.equal(localStorage.getItem('poison'),null)

// Legacy local backups may have retired keys and lack the v3 checksum.
// Restore known save values while refusing to write foreign storage keys.
localStorage.setItem('ainan_save_backup_2',JSON.stringify({
  version:2,createdAt:10,data:{ainan_score:'55',deprecated_ainan_field:'ignored'},
}))
assert.equal(restoreBackup(2),true,'v2 backup must remain readable')
checkScore('55')
assert.equal(localStorage.getItem('deprecated_ainan_field'),null)
assert.equal(getBackupSummaries()[1].valid,true)
assert.equal(validateSnapshot({version:3,data:{ainan_score:'12'}}),false,
  'missing v3 checksum is never a valid backup')

// Rolling backup recovery must scan all three slots before relying on
// the legacy copy. Do not let a corrupt newest checksum hide a valid history.
localStorage.clear()
localStorage.setItem('ainan_score','555')
localStorage.setItem('ainan_save_backup_1','{broken')
localStorage.setItem('ainan_save_backup_2',JSON.stringify({
  version:3,data:{ainan_score:'222'},checksum:checksum({ainan_score:'222'}),
}))
localStorage.setItem('ainan_save_backup_3',JSON.stringify({
  version:3,data:{ainan_score:'111'},checksum:checksum({ainan_score:'111'}),
}))
assert.equal(restoreLatestBackup(),true)
checkScore('222')
localStorage.setItem('ainan_save_backup_2','{also-broken')
localStorage.setItem('ainan_score','555')
assert.equal(restoreLatestBackup(),true)
checkScore('111')
localStorage.setItem('ainan_save_backup_3','{broken-third')
localStorage.setItem('ainan_save_backup',JSON.stringify({
  version:2,data:{ainan_score:'77'},
}))
localStorage.setItem('ainan_score','555')
assert.equal(restoreLatestBackup(),true,'legacy fallback must survive three damaged current slots')
checkScore('77')
localStorage.setItem('ainan_save_backup','{broken-legacy')
assert.equal(restoreLatestBackup(),false,'must reject every corrupt slot')
checkScore('77')

// Import must fail closed when backing up the existing save hits quota.
localStorage.clear()
localStorage.setItem('ainan_score','333')
localStorage.fail.add('ainan_save_backup_1')
assert.equal(importSaveData(payload({ainan_score:'444'})),false)
checkScore('333')
localStorage.fail.clear()

console.log('AINAN save import validation smoke passed: v3 checksum, allowed keys, three-slot/legacy recovery, quota')
