const KEY = 'ainan_diagnostics_v1'
const MAX_EVENTS = 120

function storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

function nowIso() {
  try { return new Date().toISOString() } catch { return '' }
}

function readState() {
  const s = storage()
  if (!s) return { version: 1, events: [], counters: {} }
  try {
    const parsed = JSON.parse(s.getItem(KEY) ?? 'null')
    if (!parsed || parsed.version !== 1) return { version: 1, events: [], counters: {} }
    return {
      version: 1,
      events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS) : [],
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
    }
  } catch {
    return { version: 1, events: [], counters: {} }
  }
}

function writeState(state) {
  const s = storage()
  if (!s) return false
  try {
    s.setItem(KEY, JSON.stringify({
      version: 1,
      events: (state.events ?? []).slice(-MAX_EVENTS),
      counters: state.counters ?? {},
    }))
    return true
  } catch {
    return false
  }
}

function sanitize(value) {
  if (value == null) return value
  if (typeof value === 'string') return value.slice(0, 240)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 12).map(sanitize)
  if (typeof value === 'object') {
    const out = {}
    Object.entries(value).slice(0, 16).forEach(([k, v]) => { out[k] = sanitize(v) })
    return out
  }
  return String(value).slice(0, 240)
}

export function diagRecord(type, detail = {}) {
  try {
    const state = readState()
    state.events.push({ t: nowIso(), type: String(type).slice(0, 64), detail: sanitize(detail) })
    return writeState(state)
  } catch {
    return false
  }
}

export function diagCount(name, amount = 1) {
  try {
    const state = readState()
    const key = String(name).slice(0, 64)
    state.counters[key] = Math.max(0, Number(state.counters[key] ?? 0) + Number(amount || 0))
    return writeState(state)
  } catch {
    return false
  }
}

export function getDiagnosticsSnapshot() {
  const state = readState()
  return {
    format: 'ainan-diagnostics',
    version: 1,
    createdAt: nowIso(),
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null,
    standalone: typeof window !== 'undefined'
      ? Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone)
      : false,
    ...state,
  }
}

export function exportDiagnostics() {
  try { return JSON.stringify(getDiagnosticsSnapshot(), null, 2) } catch { return '{"format":"ainan-diagnostics","version":1}' }
}

export function clearDiagnostics() {
  const s = storage()
  if (!s) return false
  try { s.removeItem(KEY); return true } catch { return false }
}

export function installGlobalDiagnostics() {
  if (typeof window === 'undefined' || window.__ainanDiagnosticsInstalled) return
  window.__ainanDiagnosticsInstalled = true

  diagRecord('startup', {
    standalone: Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone),
    path: window.location?.pathname ?? '',
  })

  window.addEventListener('error', event => {
    diagCount('window_error')
    diagRecord('window_error', {
      message: event?.message ?? 'error',
      source: event?.filename ? String(event.filename).split('/').slice(-2).join('/') : '',
      line: event?.lineno ?? 0,
      column: event?.colno ?? 0,
    })
  })

  window.addEventListener('unhandledrejection', event => {
    diagCount('unhandled_rejection')
    const reason = event?.reason
    diagRecord('unhandled_rejection', {
      message: reason?.message ?? String(reason ?? 'rejection'),
      name: reason?.name ?? '',
    })
  })

  document.addEventListener('visibilitychange', () => {
    diagRecord('visibility', { state: document.visibilityState })
  })
}

export function installFishingDiagnostics(GameScene) {
  if (!GameScene || GameScene.prototype.__ainanDiagnosticsInstalled) return
  GameScene.prototype.__ainanDiagnosticsInstalled = true

  const wrap = (name, eventName, detailFn = null) => {
    const original = GameScene.prototype[name]
    if (!original) return
    GameScene.prototype[name] = function (...args) {
      const result = original.apply(this, args)
      try {
        diagRecord(eventName, detailFn ? detailFn.call(this, args) : {
          phase: this.phase,
          fish: this.fish?.id ?? null,
          point: this.env?.point ?? null,
        })
      } catch {}
      return result
    }
  }

  wrap('_enterCast', 'fishing_cast')
  wrap('_enterRetrieve', 'fishing_retrieve')
  wrap('_openHitWindow', 'fishing_hit_window')
  wrap('_enterBattle', 'fishing_battle')
  wrap('_finishBattle', 'fishing_result', function (args) {
    return {
      outcome: args?.[0] ?? null,
      fish: this.fish?.id ?? null,
      rarity: this.fish?.rarity ?? null,
      point: this.env?.point ?? null,
    }
  })
}
