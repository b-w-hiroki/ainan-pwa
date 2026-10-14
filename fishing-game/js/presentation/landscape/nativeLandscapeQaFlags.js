// Single QA-only scene opt-in. Explicit per-scene flags remain supported
// for visual comparisons; 'nativeLandscapeAll' stages an unbroken journey.
// Production must NOT use this flag as an orientation readiness signal.
export function isNativeLandscapeQaEnabled(search = '', sceneFlag) {
  const params = new URLSearchParams(search)
  if (params.get('qa') !== '1') return false
  return params.get('nativeLandscapeAll') === '1' ||
    (typeof sceneFlag === 'string' && params.get(sceneFlag) === '1')
}

export function isNativeLandscapeQaResize(search = '') {
  const params = new URLSearchParams(search)
  return params.get('qa') === '1' && params.get('nativeLandscapeAll') === '1'
}
