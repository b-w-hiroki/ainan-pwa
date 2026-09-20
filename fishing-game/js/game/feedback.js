let audioContext = null
let ambientNodes = []

export function isSoundEnabled() { return localStorage.getItem('ainan_sound_enabled') !== '0' }
export function setSoundEnabled(enabled) {
  localStorage.setItem('ainan_sound_enabled', enabled ? '1' : '0')
  if (!enabled) stopAmbient()
  return enabled
}

export function isHapticsEnabled() { return localStorage.getItem('ainan_haptics_enabled') !== '0' }
export function setHapticsEnabled(enabled) {
  localStorage.setItem('ainan_haptics_enabled', enabled ? '1' : '0')
  return enabled
}

export function isReducedMotion() {
  if (localStorage.getItem('ainan_reduced_motion') === '1') return true
  if (localStorage.getItem('ainan_reduced_motion') === '0') return false
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
}
export function setReducedMotion(enabled) {
  localStorage.setItem('ainan_reduced_motion', enabled ? '1' : '0')
  return enabled
}

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!audioContext) audioContext = new AudioCtx()
  if (audioContext.state === 'suspended') audioContext.resume?.()
  return audioContext
}

function tone(freq, duration = 0.12, type = 'sine', gainValue = 0.035, delay = 0) {
  const ctx = getContext()
  if (!ctx) return
  const start = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playSfx(kind) {
  if (!isSoundEnabled()) return
  if (kind === 'hit') {
    tone(520, 0.09, 'triangle', 0.035)
    tone(820, 0.10, 'triangle', 0.028, 0.06)
  } else if (kind === 'boss') {
    tone(130, 0.22, 'sawtooth', 0.035)
    tone(196, 0.25, 'triangle', 0.03, 0.10)
  } else if (kind === 'catch') {
    tone(523, 0.12, 'triangle', 0.03)
    tone(659, 0.12, 'triangle', 0.03, 0.09)
    tone(784, 0.20, 'triangle', 0.035, 0.18)
  } else if (kind === 'legend') {
    tone(392, 0.16, 'triangle', 0.035)
    tone(523, 0.16, 'triangle', 0.035, 0.10)
    tone(659, 0.22, 'triangle', 0.04, 0.20)
    tone(1046, 0.26, 'sine', 0.025, 0.31)
  } else if (kind === 'escape') {
    tone(280, 0.14, 'sawtooth', 0.022)
    tone(190, 0.20, 'triangle', 0.022, 0.10)
  } else if (kind === 'townUp') {
    tone(440, 0.12, 'triangle', 0.025)
    tone(660, 0.12, 'triangle', 0.03, 0.10)
    tone(880, 0.18, 'sine', 0.03, 0.20)
  } else if (kind === 'select') {
    tone(640, 0.07, 'sine', 0.018)
  }
}

export function haptic(pattern = 20) {
  if (!isHapticsEnabled()) return
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
}

export function stopAmbient() {
  ambientNodes.forEach(node => {
    try { node.stop?.() } catch {}
    try { node.disconnect?.() } catch {}
  })
  ambientNodes = []
}

export function startAmbient(kind = 'harbor') {
  if (!isSoundEnabled()) return
  const ctx = getContext()
  if (!ctx || ambientNodes.length) return
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.012, ctx.currentTime)
  master.connect(ctx.destination)
  const frequencies = kind === 'sea' ? [110, 164.8] : [130.8, 196]
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = i ? 'sine' : 'triangle'
    osc.frequency.value = freq
    gain.gain.value = i ? 0.32 : 0.20
    osc.connect(gain)
    gain.connect(master)
    osc.start()
    ambientNodes.push(osc, gain)
  })
  ambientNodes.push(master)
}
