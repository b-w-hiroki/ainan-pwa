export const SAFE_UPDATE_SCENES = Object.freeze(['TitleScene', 'HomeScene'])

export function shouldApplyPwaUpdate(activeScenes = []) {
  return activeScenes.length > 0 && activeScenes.every(scene => SAFE_UPDATE_SCENES.includes(scene))
}

export function installPwaUpdateGuard(serviceWorker = globalThis.navigator?.serviceWorker) {
  const state = {
    controlledAtLoad: Boolean(serviceWorker?.controller),
    pending: false,
    refreshing: false,
  }
  if (!serviceWorker?.addEventListener) return state

  serviceWorker.addEventListener('controllerchange', () => {
    if (state.refreshing) return
    // First installation only grants control to the already-running build.
    // Reloading here can tear down a cast that began during font/startup work.
    if (!state.controlledAtLoad) {
      state.controlledAtLoad = true
      return
    }
    state.pending = true
    if (typeof globalThis.CustomEvent === 'function') {
      globalThis.dispatchEvent?.(new CustomEvent('ainan-pwa-update-ready'))
    }
  })
  return state
}
