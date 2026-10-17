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
  return ['釣り人の見た目', selected === 'classic' ? 'いつもの釣り人' : 'ポニーテール（港）', () => {
    if (!setCharacterAppearance(selected === 'classic' ? 'cute-b-01' : 'classic')) {
      scene._toast('見た目を保存できませんでした'); return
    }
    scene.scene.restart()
  }]
}

// Preview flags remain available for art inspection. Normal play uses the
// explicitly saved choice; camera-pan prototypes retain their own actor owner.
export function isCharacterAppearancePreview(search = globalThis.window?.location?.search ?? '') {
  const params = new URLSearchParams(search)
  return params.get('qa') === '1' && params.get('castLayers') === '1' && params.get('cameraPan') !== '1'
}
export function getActiveCharacterAppearance() {
  const params = new URLSearchParams(globalThis.window?.location?.search ?? '')
  if (params.get('cameraPan') === '1' || params.get('castPresentation') === 'legacy') return 'classic'
  return getCharacterAppearance()
}

export const CHARACTER_PREVIEW_BACKGROUND = Object.freeze({
  key: 'character_preview_harbor_morning',
  path: new URL('../../../docs/art-source/harbor-character-v2/harbor-morning.png', import.meta.url).href,
})
