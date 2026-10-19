const TUTORIAL_KEY = 'ainan_retrieve_tutorial_v2'

// Tutorial progress is optional. A blocked/full browser store must never
// prevent fishing from starting or the HIT transition from completing.
export function readRetrieveTutorialDone() {
  try {
    return globalThis.localStorage?.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return false
  }
}

export function writeRetrieveTutorialDone() {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    storage.setItem(TUTORIAL_KEY, '1')
    return true
  } catch {
    return false
  }
}
