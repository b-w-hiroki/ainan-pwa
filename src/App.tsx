import { useState } from 'react'

const implementationStatus = [
  { label: 'PWA土台（Vite + React）', done: true },
  { label: 'キャストの長押し操作', done: true },
  { label: 'パワーゲージ表示', done: true },
  { label: '飛距離表示', done: true },
  { label: 'ゲーム本編フロー（ヒット/リール/あばれ）', done: false },
  { label: 'バックエンドAPI連携', done: false },
  { label: '景品交換機能', done: false },
] as const

function App() {
  const [power, setPower] = useState(0)
  const [lastDistance, setLastDistance] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'charging' | 'casted'>('idle')
  const [pressStart, setPressStart] = useState<number | null>(null)

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

    // 簡易な距離計算（メートル）
    const distance = Math.round(5 + (nextPower / 100) * 45) // 5〜50m
    setLastDistance(distance)
    setStatus('casted')
    setPressStart(null)
  }

  const powerLabel =
    status === 'charging'
      ? 'パワーを溜めています…'
      : status === 'casted'
      ? 'キャスト完了！'
      : '長押しでキャスト！'

  const floatRatio = (() => {
    if (lastDistance == null) return 0.1
    const r = (lastDistance - 5) / 45 // 5〜50m を 0〜1 に
    return Math.min(1, Math.max(0, r))
  })()
  const doneCount = implementationStatus.filter((item) => item.done).length
  const progressPercent = Math.round((doneCount / implementationStatus.length) * 100)

  return (
    <div className="app">
      <header className="header">
        <h1>AINAN</h1>
        <p className="tagline">釣り×街おこし</p>
      </header>
      <main className="main">
        <div className="scene">
          <div className="scene-inner">
            <div className="sea">
              <div className="sea-wave" />
              <div
                className="float"
                aria-hidden="true"
                style={{ left: `${10 + floatRatio * 70}%` }}
              >
                <div className="float-top" />
                <div className="float-body" />
              </div>
            </div>
          </div>
        </div>

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
            {lastDistance != null ? `およそ ${lastDistance}m 飛んだ！` : 'まだキャストしていません。'}
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
