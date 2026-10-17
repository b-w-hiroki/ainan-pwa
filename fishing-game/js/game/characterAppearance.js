// Device preference, like sound/motion settings; never changes the game save.
const KEY = 'ainan_character_appearance'
export function getCharacterAppearance() {
  try { return globalThis.localStorage?.getItem(KEY) === 'cute-b-01' ? 'cute-b-01' : 'classic' }
  catch { return 'classic' }
}
export function setCharacterAppearance(id) {
  if (!['classic', 'cute-b-01'].includes(id)) return false
  try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(KEY, id); return true }
  catch { return false }
}
export function characterAppearanceCard(scene) {
  const selected = getCharacterAppearance()
  return ['釣り人の見た目', selected === 'classic' ? 'いつもの釣り人' : 'ポニーテール', () => {
    if (!setCharacterAppearance(selected === 'classic' ? 'cute-b-01' : 'classic')) {
      scene._toast('見た目を保存できませんでした'); return
    }
    scene.scene.restart()
  }]
}

// Normal approved composite contains a painted character. Until its clean
// background is approved, use this preference only in the separated QA host.
export function isCharacterAppearancePreview(search = globalThis.window?.location?.search ?? '') {
  const params = new URLSearchParams(search)
  return params.get('qa') === '1' && params.get('castLayers') === '1' && params.get('cameraPan') !== '1'
}
export function getActiveCharacterAppearance() {
  return isCharacterAppearancePreview() ? getCharacterAppearance() : 'classic'
}
