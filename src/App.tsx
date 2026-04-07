import { useCallback, useEffect, useRef, useState } from 'react'

const implementationStatus = [
  { label: 'PWA土台（Vite + React）', done: true },
  { label: 'キャストの長押し操作', done: true },
  { label: 'パワーゲージ表示', done: true },
  { label: '飛距離表示', done: true },
  { label: 'キャスト方向・狙い距離の操作', done: true },
  { label: 'ゲーム本編フロー（ヒット/リール/あばれ）', done: false },
  { label: 'バックエンドAPI連携', done: false },
  { label: '景品交換機能', done: false },
] as const

function App() {
  const [power, setPower] = useState(0)
  const [lastDistance, setLastDistance] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'charging' | 'casted'>('idle')
  const [pressStart, setPressStart] = useState<number | null>(null)
  /** -1（左）〜 1（右） */
  const [aim, setAim] = useState(0)
  /** フルチャージ時の上限距離（m） */
  const [distanceCap, setDistanceCap] = useState(35)
  const [castBurst, setCastBurst] = useState(0)
  const [castFx, setCastFx] = useState(false)
  const aimTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (castBurst === 0) return
    setCastFx(true)
    const t = window.setTimeout(() => setCastFx(false), 520)
    return () => window.clearTimeout(t)
  }, [castBurst])

  const controlsLocked = status === 'charging'

  const setAimFromClientX = useCallback((clientX: number) => {
    const el = aimTrackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const t = (clientX - rect.left) / rect.width
    const next = (Math.min(1, Math.max(0, t)) - 0.5) * 2
    setAim(next)
  }, [])

  const onAimPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (controlsLocked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setAimFromClientX(e.clientX)
  }

  const onAimPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (controlsLocked || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    setAimFromClientX(e.clientX)
  }

  const onAimPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handlePressStart = () => {
    const now = performance.now()
    setPressStart(now)
    setStatus('charging')
  }

  const handlePressEnd = () => {
    if (pressStart == null) return

    const durationMs = performance.now() - pressStart
    // 0〜1500ms を 0〜100% に正規化（それ以上は頭打ち）
    const clamped = Math.min(durationMs, 1500)
    const ratio = clamped / 1500
    const nextPower = Math.round(ratio * 100)
    setPower(nextPower)

    // 狙い距離（上限）と溜め量で距離を決定（最低 5m）
    const span = Math.max(0, distanceCap - 5)
    const distance = Math.round(5 + (nextPower / 100) * span)
    setLastDistance(distance)
    setStatus('casted')
    setPressStart(null)
    setCastBurst((k) => k + 1)
  }

  const powerLabel =
    status === 'charging'
      ? 'パワーを溜めています…'
      : status === 'casted'
      ? 'キャスト完了！'
      : '長押しでキャスト！'

  const floatRatio = (() => {
    if (lastDistance == null) return 0
    const span = Math.max(1e-6, distanceCap - 5)
    const r = (lastDistance - 5) / span
    return Math.min(1, Math.max(0, r))
  })()

  const aimDeg = Math.round(aim * 55)
  const aimLabel =
    aim < -0.25 ? '左寄り' : aim > 0.25 ? '右寄り' : '正面'

  const floatLeft =
    lastDistance == null ? 50 + aim * 22 : 50 + aim * (34 + floatRatio * 6)
  const floatTop =
    lastDistance == null ? 26 : 22 - floatRatio * 11

  const castLineAngle = aim * 28
  const castLineReach = 28 + floatRatio * 52

  const doneCount = implementationStatus.filter((item) => item.done).length
  const progressPercent = Math.round((doneCount / implementationStatus.length) * 100)

  return (
    <div className="app">
      <header className="header">
        <h1>AINAN</h1>
        <p className="tagline">釣り×街おこし</p>
      </header>
      <main className="main">
        <div className={`scene ${castFx ? 'scene--pulse' : ''}`}>
          <div className="scene-inner">
            <div className="sea">
              <div className="sea-wave" />
              {castFx && (
                <div
                  className="cast-line-wrap"
                  key={castBurst}
                  style={
                    {
                      '--cast-angle': `${castLineAngle}deg`,
                      '--cast-reach': `${castLineReach}%`,
                    } as React.CSSProperties
                  }
                >
                  <div className="cast-line-core" />
                </div>
              )}
              <div
                className={`float ${lastDistance != null ? 'float--placed' : 'float--preview'}`}
                aria-hidden="true"
                style={{ left: `${floatLeft}%`, top: `${floatTop}%` }}
              >
                <div className="float-top" />
                <div className="float-body" />
              </div>
            </div>
          </div>
        </div>

        <section className="aim-panel" aria-label="キャストの方向と距離">
          <p className="aim-panel-title">狙いを決める</p>
          <div className="aim-row">
            <span className="aim-label">方向</span>
            <div
              ref={aimTrackRef}
              className={`aim-track ${controlsLocked ? 'aim-track--locked' : ''}`}
              onPointerDown={onAimPointerDown}
              onPointerMove={onAimPointerMove}
              onPointerUp={onAimPointerUp}
              onPointerCancel={onAimPointerUp}
            >
              <div className="aim-track-inner">
                <div className="aim-ticks" aria-hidden="true" />
                <div
                  className="aim-knob"
                  style={{ left: `${50 + aim * 50}%` }}
                />
              </div>
            </div>
            <p className="aim-readout">
              {aimLabel}（{aimDeg >= 0 ? '+' : ''}
              {aimDeg}°）
            </p>
          </div>
          <div className="aim-row aim-row--distance">
            <label className="aim-label" htmlFor="distance-cap">
              狙いの距離
            </label>
            <div className="distance-slider-wrap">
              <input
                id="distance-cap"
                type="range"
                min={5}
                max={50}
                step={1}
                value={distanceCap}
                disabled={controlsLocked}
                onChange={(e) => setDistanceCap(Number(e.target.value))}
              />
              <div className="distance-slider-hint">
                <span>近い</span>
                <span>遠い</span>
              </div>
            </div>
            <p className="aim-readout">上限 {distanceCap}m（フルチャージ時）</p>
          </div>
        </section>

        <div className="cast-area">
          <div className="gauge">
            <div className="gauge-fill" style={{ width: `${power}%` }} />
          </div>
          <p className="gauge-label">{powerLabel}</p>

          <button
            className="cast-button"
            type="button"
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={status === 'charging' ? handlePressEnd : undefined}
            onTouchStart={(e) => {
              e.preventDefault()
              handlePressStart()
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              handlePressEnd()
            }}
          >
            キャスト
          </button>

          <p className="distance">
            {lastDistance != null
              ? `およそ ${lastDistance}m ／ 方向 ${aimLabel}`
              : 'まだキャストしていません。'}
          </p>
        </div>

        <section className="progress-card" aria-label="実装進捗">
          <p className="progress-title">今の出来具合</p>
          <p className="progress-rate">
            {doneCount}/{implementationStatus.length}（{progressPercent}%）
          </p>
          <ul className="progress-list">
            {implementationStatus.map((item) => (
              <li key={item.label} className={item.done ? 'done' : 'todo'}>
                {item.done ? '完了' : '未着手'}: {item.label}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
