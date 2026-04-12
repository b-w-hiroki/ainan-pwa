import { useCallback, useEffect, useRef, useState } from 'react'
import { type ExchangeItem, type OrderStatus, type ProcessingType } from './lib/demoApi'
import { useDemoCommerceState } from './hooks/useDemoCommerceState'
import { FishingGameCanvas } from './components/FishingGameCanvas'

const implementationStatus = [
  { label: 'PWA土台（Vite + React）', done: true },
  { label: 'キャストの長押し操作', done: true },
  { label: 'パワーゲージ表示', done: true },
  { label: '飛距離表示', done: true },
  { label: 'キャスト方向・狙い距離の操作', done: true },
  { label: 'ゲーム本編フロー（ヒット/リール/あばれ）', done: true },
  { label: 'バックエンドAPI連携', done: false },
  { label: '景品交換機能', done: true },
] as const

type FishRank = 'N' | 'R' | 'SR'
type FishDef = {
  name: string
  rank: FishRank
  baseHp: number
  biteWaitMinMs: number
  biteWaitMaxMs: number
  biteLenMs: number
  basePoint: number
}

const fishMaster: FishDef[] = [
  { name: 'アジ', rank: 'N', baseHp: 110, biteWaitMinMs: 1200, biteWaitMaxMs: 2500, biteLenMs: 700, basePoint: 18 },
  { name: 'イワシ', rank: 'N', baseHp: 95, biteWaitMinMs: 1000, biteWaitMaxMs: 2200, biteLenMs: 760, basePoint: 14 },
  { name: 'サバ', rank: 'N', baseHp: 120, biteWaitMinMs: 1200, biteWaitMaxMs: 2600, biteLenMs: 680, basePoint: 20 },
  { name: 'カマス', rank: 'N', baseHp: 125, biteWaitMinMs: 1300, biteWaitMaxMs: 2800, biteLenMs: 650, basePoint: 22 },
  { name: 'タイ', rank: 'R', baseHp: 150, biteWaitMinMs: 1500, biteWaitMaxMs: 3000, biteLenMs: 620, basePoint: 32 },
  { name: 'カンパチ', rank: 'R', baseHp: 165, biteWaitMinMs: 1600, biteWaitMaxMs: 3200, biteLenMs: 600, basePoint: 36 },
  { name: 'シマアジ', rank: 'R', baseHp: 170, biteWaitMinMs: 1700, biteWaitMaxMs: 3300, biteLenMs: 580, basePoint: 38 },
  { name: 'ブリ', rank: 'SR', baseHp: 190, biteWaitMinMs: 1700, biteWaitMaxMs: 3400, biteLenMs: 540, basePoint: 54 },
  { name: 'ヒラマサ', rank: 'SR', baseHp: 205, biteWaitMinMs: 1800, biteWaitMaxMs: 3500, biteLenMs: 520, basePoint: 58 },
  { name: 'クエ', rank: 'SR', baseHp: 220, biteWaitMinMs: 2000, biteWaitMaxMs: 3800, biteLenMs: 500, basePoint: 64 },
]

const rankMultiplier: Record<FishRank, number> = { N: 1.0, R: 1.3, SR: 1.8 }
const hookMultiplier: Record<'perfect' | 'good' | 'miss', number> = {
  perfect: 1.2,
  good: 1.0,
  miss: 0.7,
}

const config = {
  pointRateNumerator: 1,
  pointRateDenominator: 1,
  dailyPointUseLimit: 300,
  domesticOnly: true,
}

const prefectures = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '東京都',
  '神奈川県',
  '千葉県',
  '埼玉県',
  '愛媛県',
  '大阪府',
  '京都府',
  '福岡県',
] as const

const exchangeItems: ExchangeItem[] = [
  {
    id: 'ehime-gold',
    name: '愛南ゴールド 3kg',
    category: '柑橘',
    needPoint: 90,
    stock: 6,
    domesticOnly: true,
    supportsProcessing: false,
  },
  { id: 'hiougi', name: 'ヒオウギ貝 10枚', category: '貝', needPoint: 120, stock: 4, domesticOnly: true, supportsProcessing: false },
  { id: 'fresh-fish', name: '本日鮮魚セット', category: '鮮魚', needPoint: 160, stock: 3, domesticOnly: true, supportsProcessing: true },
  { id: 'dry-set', name: '干物セット', category: '加工品', needPoint: 75, stock: 8, domesticOnly: true, supportsProcessing: false },
]

const exchangeCategories = ['すべて', '鮮魚', '貝', '柑橘', '加工品'] as const
const orderStatusFilters = ['すべて', '進行中', '完了', 'キャンセル'] as const

const formatDomesticLabel = (domesticOnly: boolean) => (domesticOnly ? '国内配送のみ' : '海外配送可')

const initialStockMap = Object.fromEntries(exchangeItems.map((item) => [item.id, item.stock]))

const getItemById = (id: string) => exchangeItems.find((item) => item.id === id) ?? exchangeItems[0]

const processingLabel = (processing: ProcessingType) =>
  processing === 'whole' ? '丸' : processing === 'saku' ? 'サク' : '切り身'

const calcYen = (point: number) =>
  Math.floor((point * config.pointRateNumerator) / Math.max(1, config.pointRateDenominator))

const safeFirstItem = exchangeItems[0]
if (!safeFirstItem) {
  throw new Error('exchangeItems must not be empty')
}

function App() {
  type Phase = 'idle' | 'charging' | 'casted' | 'bite' | 'fight' | 'landing' | 'result'
  type Page = 'home' | 'fishing' | 'enhance' | 'exchange' | 'orders'
  type TownBuilding = 'port' | 'market' | 'office'
  type GachaRarity = 'N' | 'R' | 'SR' | 'SSR'
  const [activePage, setActivePage] = useState<Page>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [townModal, setTownModal] = useState<TownBuilding | null>(null)
  const [audioOn, setAudioOn] = useState(true)
  const [combo, setCombo] = useState(0)
  const [flashOn, setFlashOn] = useState(false)
  const [dailyMissionClaimed, setDailyMissionClaimed] = useState(false)
  const [gachaOpen, setGachaOpen] = useState(false)
  const [gachaRolling, setGachaRolling] = useState(false)
  const [freeGachaUsedDate, setFreeGachaUsedDate] = useState<string | null>(null)
  const [gachaResult, setGachaResult] = useState<{ rarity: GachaRarity; name: string; bonusPoint: number } | null>(null)
  const [timeOfDay] = useState<'morning' | 'noon' | 'evening' | 'night'>(() => {
    const h = new Date().getHours()
    if (h < 10) return 'morning'
    if (h < 16) return 'noon'
    if (h < 19) return 'evening'
    return 'night'
  })
  const [weather] = useState<'sunny' | 'cloudy' | 'rainy'>(() => {
    const r = Math.random()
    if (r < 0.2) return 'rainy'
    if (r < 0.5) return 'cloudy'
    return 'sunny'
  })
  const [power, setPower] = useState(0)
  const [lastDistance, setLastDistance] = useState<number | null>(null)
  const [status, setStatus] = useState<Phase>('idle')
  const [pressStart, setPressStart] = useState<number | null>(null)
  /** -1（左）〜 1（右） */
  const [aim, setAim] = useState(0)
  /** フルチャージ時の上限距離（m） */
  const [distanceCap, setDistanceCap] = useState(35)
  const [castBurst, setCastBurst] = useState(0)
  const [castFx, setCastFx] = useState(false)
  const [biteWindow, setBiteWindow] = useState<{ start: number; end: number } | null>(null)
  const [hookResult, setHookResult] = useState<'none' | 'perfect' | 'good' | 'miss'>('none')
  const [targetFish, setTargetFish] = useState<FishDef>(fishMaster[0])
  const [sizeMultiplier, setSizeMultiplier] = useState(1)
  const [earnedPoint, setEarnedPoint] = useState(0)
  const {
    totalPoint,
    setTotalPoint,
    dailyUsedPoint,
    setDailyUsedPoint,
    dailyUseDateKey,
    setDailyUseDateKey,
    exchangeMessage,
    setExchangeMessage,
    selectedItemId,
    setSelectedItemId,
    selectedProcessing,
    setSelectedProcessing,
    categoryFilter,
    setCategoryFilter,
    orderSearch,
    setOrderSearch,
    orderStatusFilter,
    setOrderStatusFilter,
    adminMode,
    setAdminMode,
    confirmOpen,
    expandedOrderId,
    setExpandedOrderId,
    itemStockMap,
    setItemStockMap,
    shippingPrefecture,
    setShippingPrefecture,
    shippingPostalCode,
    setShippingPostalCode,
    shippingCity,
    setShippingCity,
    orders,
    selectedItem,
    selectedStock,
    filteredExchangeItems,
    visibleOrders,
    dashboard,
    dailyRemain,
    resetAllDemoData,
    openConfirm,
    closeConfirm,
    executeExchangeFlow,
    advanceOrderStatus,
    cancelOrderById,
    adminRestock,
    adminAdvanceAll,
  } = useDemoCommerceState({
    safeFirstItemId: safeFirstItem.id,
    initialStockMap,
    defaultPrefecture: '愛媛県',
    exchangeItems,
    dailyLimit: config.dailyPointUseLimit,
  })
  const [fishHp, setFishHp] = useState(140)
  const [tension, setTension] = useState(35)
  const [fightTime, setFightTime] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [landHits, setLandHits] = useState(0)
  const [resultMessage, setResultMessage] = useState('まだ釣果はありません。')
  const [rippleOn, setRippleOn] = useState(false)
  const aimTrackRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new window.AudioContext()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  const playTone = useCallback(
    (frequency: number, duration = 0.09, type: OscillatorType = 'sine', gainValue = 0.04) => {
      if (!audioOn) return
      const ctx = ensureAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      gain.gain.value = 0.0001
      gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration + 0.01)
    },
    [audioOn, ensureAudioContext],
  )

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!('vibrate' in navigator)) return
    navigator.vibrate(pattern)
  }, [])

  useEffect(() => {
    if (castBurst === 0) return
    setCastFx(true)
    const t = window.setTimeout(() => setCastFx(false), 520)
    return () => window.clearTimeout(t)
  }, [castBurst])

  useEffect(() => {
    const todayKey = new Date().toDateString()
    if (todayKey !== dailyUseDateKey) {
      setDailyUseDateKey(todayKey)
      setDailyUsedPoint(0)
      setDailyMissionClaimed(false)
      setExchangeMessage('日付が変わったため、利用上限をリセットしました。')
    }
  }, [status, dailyUseDateKey])

  useEffect(() => {
    if (status !== 'casted') return
    setBiteWindow(null)
    const nextFish = fishMaster[Math.floor(Math.random() * fishMaster.length)]
    const waitMs =
      nextFish.biteWaitMinMs +
      Math.floor(Math.random() * Math.max(1, nextFish.biteWaitMaxMs - nextFish.biteWaitMinMs))
    const biteLen = nextFish.biteLenMs
    setTargetFish(nextFish)
    setSizeMultiplier(Number((0.8 + Math.random() * 0.6).toFixed(2)))
    setFishHp(nextFish.baseHp)
    const timer = window.setTimeout(() => {
      const now = performance.now()
      setBiteWindow({ start: now, end: now + biteLen })
      setRippleOn(true)
      window.setTimeout(() => setRippleOn(false), 700)
      setStatus('bite')
    }, waitMs)
    return () => window.clearTimeout(timer)
  }, [status, castBurst])

  useEffect(() => {
    if (status !== 'fight') return
    const timer = window.setInterval(() => {
      setFightTime((t) => t + 1)
      setTension((prev) => {
        const next = Math.min(100, prev + 3)
        return next
      })
      setFishHp((prev) => Math.max(0, prev - 4))
    }, 220)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => {
    if (status !== 'fight') return
    if (fishHp <= 0) {
      setStatus('landing')
      return
    }
    if (fightTime >= 275 || tension >= 100) {
      setStatus('result')
      setResultMessage('魚に逃げられました…（時間切れ or 糸切れ）')
    }
  }, [status, fishHp, fightTime, tension])

  useEffect(() => {
    if (status !== 'landing') return
    if (landHits >= 2) {
      const quality = hookResult === 'perfect' ? 'Perfect' : hookResult === 'good' ? 'Good' : 'Normal'
      const hook = hookResult === 'none' ? 'good' : hookResult
      const gained = Math.round(
        targetFish.basePoint * rankMultiplier[targetFish.rank] * sizeMultiplier * hookMultiplier[hook],
      )
      setEarnedPoint(gained)
      setTotalPoint((p) => p + gained)
      setStatus('result')
      setResultMessage(`釣り上げ成功！ Hook: ${quality} / +${gained}P`)
    }
  }, [status, landHits, hookResult, targetFish, sizeMultiplier])

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
    setHookResult('none')
    setFishHp(140)
    setTension(35)
    setFightTime(0)
    setLandHits(0)
    setEarnedPoint(0)
    setResultMessage('まだ釣果はありません。')
    playTone(380, 0.12, 'triangle', 0.06)
    vibrate(12)
  }

  const handleHook = () => {
    if (status !== 'bite' || !biteWindow) return
    const now = performance.now()
    const center = (biteWindow.start + biteWindow.end) / 2
    const delta = Math.abs(now - center)
    if (now < biteWindow.start || now > biteWindow.end) {
      setHookResult('miss')
      setStatus('result')
      setResultMessage('フッキング失敗…タイミングが合いませんでした。')
      playTone(180, 0.18, 'sawtooth', 0.05)
      vibrate([10, 24, 10])
      return
    }
    if (delta <= 80) {
      setHookResult('perfect')
      setFishHp(120)
      setTension(28)
      setCombo((c) => c + 1)
      setFlashOn(true)
      window.setTimeout(() => setFlashOn(false), 160)
      playTone(660, 0.08, 'square', 0.05)
      window.setTimeout(() => playTone(880, 0.1, 'square', 0.05), 60)
      vibrate(20)
    } else {
      setHookResult('good')
      setFishHp(140)
      setTension(35)
      setCombo((c) => c + 1)
      playTone(540, 0.1, 'triangle', 0.045)
      vibrate(14)
    }
    setStatus('fight')
  }

  const handleReelTap = () => {
    if (status !== 'fight') return
    setFishHp((hp) => Math.max(0, hp - 7))
    setTension((v) => Math.min(100, v + 4))
  }

  const handleDirection = (next: 'left' | 'right') => {
    if (status !== 'fight') return
    if (next === direction) {
      setTension((v) => Math.max(0, v - 12))
      setDirection((d) => (d === 'left' ? 'right' : 'left'))
    } else {
      setTension((v) => Math.min(100, v + 10))
    }
  }

  const handleLandingTap = () => {
    if (status !== 'landing') return
    setLandHits((v) => Math.min(2, v + 1))
  }

  const resetSession = () => {
    setStatus('idle')
    setPower(0)
    setLastDistance(null)
    setPressStart(null)
    setBiteWindow(null)
    setHookResult('none')
    setFishHp(140)
    setTension(35)
    setFightTime(0)
    setLandHits(0)
    setEarnedPoint(0)
    setResultMessage('まだ釣果はありません。')
  }

  const executeDemoExchange = () => {
    const selected = getItemById(selectedItemId)
    executeExchangeFlow({
      item: selected,
      dailyLimit: config.dailyPointUseLimit,
      domesticOnlyConfig: config.domesticOnly,
    })
    playTone(520, 0.08, 'triangle', 0.05)
  }

  const handleAdvanceOrderStatus = (id: string) => {
    advanceOrderStatus(id)
  }

  const handleCancelOrder = (id: string) => {
    cancelOrderById(id)
  }

  const handleAdminRestock = (itemId: string, amount: number) => {
    const item = getItemById(itemId)
    adminRestock(item, amount)
  }

  const handleAdminAdvanceAll = () => {
    adminAdvanceAll()
  }

  const handleResetDemoData = () => {
    resetAllDemoData()
  }

  const handleOpenConfirm = () => {
    openConfirm()
  }

  const handleClaimDailyMission = () => {
    if (dailyMissionClaimed) return
    if (todayOrderCount < 1 || combo < 2) return
    const reward = 50
    setTotalPoint((p) => p + reward)
    setDailyMissionClaimed(true)
    setExchangeMessage(`デイリーミッション達成！ +${reward}P`)
    playTone(700, 0.1, 'triangle', 0.06)
    window.setTimeout(() => playTone(980, 0.14, 'triangle', 0.06), 90)
    vibrate([18, 24, 18])
  }

  const todayKey = new Date().toDateString()
  const canFreeGacha = freeGachaUsedDate !== todayKey

  const handleRollGacha = () => {
    if (!canFreeGacha || gachaRolling) return
    setGachaRolling(true)
    setGachaResult(null)
    playTone(420, 0.09, 'triangle', 0.05)
    window.setTimeout(() => playTone(520, 0.09, 'triangle', 0.05), 100)
    window.setTimeout(() => playTone(640, 0.1, 'triangle', 0.06), 210)
    window.setTimeout(() => {
      const r = Math.random()
      const result =
        r < 0.6
          ? { rarity: 'N' as GachaRarity, name: '小型ルアー', bonusPoint: 15 }
          : r < 0.88
          ? { rarity: 'R' as GachaRarity, name: '強化リール', bonusPoint: 35 }
          : r < 0.98
          ? { rarity: 'SR' as GachaRarity, name: '希少エサセット', bonusPoint: 70 }
          : { rarity: 'SSR' as GachaRarity, name: '伝説の釣り竿', bonusPoint: 120 }
      setGachaResult(result)
      setTotalPoint((p) => p + result.bonusPoint)
      setFreeGachaUsedDate(todayKey)
      setGachaRolling(false)
      setExchangeMessage(`ガチャ獲得: ${result.name}（+${result.bonusPoint}P）`)
      if (result.rarity === 'SSR') {
        setFlashOn(true)
        window.setTimeout(() => setFlashOn(false), 260)
        vibrate([16, 24, 16, 32, 18])
      } else {
        vibrate(18)
      }
      playTone(result.rarity === 'SSR' ? 980 : result.rarity === 'SR' ? 840 : 700, 0.14, 'square', 0.06)
    }, 880)
  }

  const getStatusLabel = (status: OrderStatus) => {
    if (status === 'reserved') return '予約受付'
    if (status === 'preparing') return '出荷準備中'
    if (status === 'shipped') return '発送済み'
    if (status === 'cancelled') return 'キャンセル済み'
    return '配送完了'
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
  const fishHpPct = Math.max(0, Math.min(100, Math.round((fishHp / Math.max(1, targetFish.baseHp)) * 100)))
  const fightSec = (fightTime * 0.22).toFixed(1)
  const { deliveredCount, usedPointTotal, todayOrderCount, cancelRate } = dashboard
  const fishShadowLeft = 50 + Math.sin(fightTime / 9) * 28
  const townInfo = {
    port: { title: 'Lv.5 港', desc: '釣りでポイントを獲得', to: 'fishing' as Page },
    market: { title: 'Lv.3 特産市場', desc: 'ポイント交換を実行', to: 'exchange' as Page },
    office: { title: 'Lv.2 配送所', desc: '注文管理と進捗確認', to: 'orders' as Page },
  }

  return (
    <div className={`sg-app ${flashOn ? 'sg-app--flash' : ''}`}>
      <header className="sg-header">
        <button
          type="button"
          className="menu-button"
          aria-label="メニュー"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="menu-lines" aria-hidden="true" />
        </button>
        <div className="header-title">
          <p className="header-game">AINAN</p>
          <p className="header-sub">釣り×街おこし</p>
        </div>
        <div className="header-stats" aria-label="所持ポイント">
          <span className="stat-chip">{totalPoint}P</span>
        </div>
      </header>

      {menuOpen && (
        <div className="menu-overlay" role="dialog" aria-modal="true" onClick={() => setMenuOpen(false)}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <p className="menu-title">メニュー</p>
            <button type="button" className="menu-item" onClick={() => (setActivePage('home'), setMenuOpen(false))}>
              ホーム
            </button>
            <button type="button" className="menu-item" onClick={() => (setActivePage('fishing'), setMenuOpen(false))}>
              釣り
            </button>
            <button type="button" className="menu-item" onClick={() => (setActivePage('enhance'), setMenuOpen(false))}>
              強化
            </button>
            <button type="button" className="menu-item" onClick={() => (setActivePage('exchange'), setMenuOpen(false))}>
              交換
            </button>
            <button type="button" className="menu-item" onClick={() => (setActivePage('orders'), setMenuOpen(false))}>
              注文
            </button>
            <div className="menu-sep" />
            <button type="button" className="menu-item danger" onClick={() => (resetAllDemoData(), setMenuOpen(false))}>
              デモデータ初期化
            </button>
              <button type="button" className="menu-item" onClick={() => setAudioOn((v) => !v)}>
                音声: {audioOn ? 'ON' : 'OFF'}
              </button>
          </div>
        </div>
      )}

      <main className="sg-main">
        {activePage === 'home' && (
          <section className="home">
            <div className="rank-banner">
              <p className="rank-main">ランク: 人気急上昇中！</p>
              <p className="rank-sub">登録者: 12,500人</p>
              <div className="stamina-bar" aria-label="スタミナ">
                <div className="stamina-fill" style={{ width: '72%' }} />
              </div>
            </div>

            <div className="town-map" role="application" aria-label="街づくりマップ">
              <div className="town-sky" aria-hidden="true" />
              <div className="town-sea" aria-hidden="true" />
              <div className="town-land" aria-hidden="true" />
              <div className="town-road" aria-hidden="true" />
              <div className="town-grid" aria-hidden="true" />

              <button type="button" className="bldg bldg--port" onClick={() => setTownModal('port')}>
                <span className="bldg-emoji" aria-hidden="true">
                  🎣
                </span>
                <span className="bldg-name">港</span>
                <span className="bldg-desc">Lv.5</span>
              </button>

              <button type="button" className="bldg bldg--market" onClick={() => setTownModal('market')}>
                <span className="bldg-emoji" aria-hidden="true">
                  🏪
                </span>
                <span className="bldg-name">市場</span>
                <span className="bldg-desc">Lv.3</span>
              </button>

              <button type="button" className="bldg bldg--office" onClick={() => setTownModal('office')}>
                <span className="bldg-emoji" aria-hidden="true">
                  📦
                </span>
                <span className="bldg-name">配送所</span>
                <span className="bldg-desc">Lv.2</span>
              </button>

              <div className="town-coins" aria-hidden="true">
                <span className="coin c1" />
                <span className="coin c2" />
                <span className="coin c3" />
              </div>
            </div>

            <div className="town-hud" aria-label="ホーム情報">
              <div className="hud-row">
                <span className="hud-label">所持P</span>
                <span className="hud-value">{totalPoint}P</span>
              </div>
              <div className="hud-row">
                <span className="hud-label">本日残り</span>
                <span className="hud-value">{dailyRemain}P</span>
              </div>
              <div className="hud-row">
                <span className="hud-label">コンボ</span>
                <span className="hud-value">{combo} COMBO</span>
              </div>
            </div>
            <section className="progress-card" aria-label="デイリーミッション">
              <p className="progress-title">デイリーミッション</p>
              <p className="fight-meta">条件: 注文1件以上 + コンボ2以上</p>
              <p className="fight-meta">報酬: +50P</p>
              <button
                type="button"
                className="order-action"
                disabled={dailyMissionClaimed || todayOrderCount < 1 || combo < 2}
                onClick={handleClaimDailyMission}
              >
                {dailyMissionClaimed ? '受取済み' : '報酬を受け取る'}
              </button>
            </section>
            <div className="home-shortcuts">
              <button type="button" className="order-action" onClick={() => setActivePage('fishing')}>
                出撃する
              </button>
              <button type="button" className="order-action" onClick={() => setActivePage('enhance')}>
                強化する
              </button>
              <button type="button" className="order-action" onClick={() => setGachaOpen(true)}>
                ガチャ
              </button>
            </div>
          </section>
        )}

        {activePage === 'fishing' && (
          <>
            <section className="progress-card" aria-label="出撃情報">
              <p className="progress-title">出撃</p>
              <p className="fight-meta">目的: 釣ってポイントを稼ぐ</p>
              <p className="fight-meta">副目的: コンボを繋いで効率アップ</p>
            </section>
            <div className={`scene ${castFx ? 'scene--pulse' : ''}`}>
          <div className="scene-inner">
                <FishingGameCanvas
                  aim={aim}
                  floatRatio={floatRatio}
                  status={status}
                  castFx={castFx}
                  rippleOn={rippleOn}
                  fishShadowLeft={fishShadowLeft}
                  power={power}
                  tension={tension}
                  timeOfDay={timeOfDay}
                  weather={weather}
                />
            <section className="aim-panel aim-panel--overlay" aria-label="キャストの方向と距離">
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
                <p className="aim-readout aim-readout--compact">
                  {aimLabel}（{aimDeg >= 0 ? '+' : ''}
                  {aimDeg}°）
                </p>
              </div>
              <div className="aim-row aim-row--distance">
                <span className="aim-label">距離</span>
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
                <p className="aim-readout aim-readout--compact">上限 {distanceCap}m</p>
              </div>
            </section>
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
            {lastDistance != null
              ? `およそ ${lastDistance}m ／ 方向 ${aimLabel}`
              : 'まだキャストしていません。'}
          </p>

          <section className="fight-card" aria-label="ゲーム本編フロー">
            <div className="admin-toggle">
              <label htmlFor="admin-mode">管理モード</label>
              <input
                id="admin-mode"
                type="checkbox"
                checked={adminMode}
                onChange={(e) => setAdminMode(e.target.checked)}
              />
            </div>
            <p className="fight-title">ゲーム本編</p>
            <p className="fight-status">
              {status === 'bite' && 'アタリ！ タップでフッキング'}
              {status === 'fight' && 'ファイト中：連打 + 方向対応'}
              {status === 'landing' && 'ランディング：2回タップで確保'}
              {status === 'result' && resultMessage}
              {(status === 'idle' || status === 'charging' || status === 'casted') &&
                'まずはキャストして魚のアタリを待とう'}
            </p>

            <div className="fight-bars">
              <div className="mini-bar">
                <span>魚HP</span>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill mini-bar-fill--hp" style={{ width: `${fishHpPct}%` }} />
                </div>
              </div>
              <div className="mini-bar">
                <span>テンション</span>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill mini-bar-fill--tension" style={{ width: `${tension}%` }} />
                </div>
              </div>
            </div>

            <p className="fight-meta">経過 {fightSec}s / 目標方向: {direction === 'left' ? '左' : '右'}</p>
            <p className="fight-meta">Hook判定: {hookResult === 'none' ? '-' : hookResult}</p>
            <p className="fight-meta">
              環境: {timeOfDay} / {weather}
            </p>
            {combo > 1 && <p className="combo-text">{combo} COMBO!</p>}
            {hookResult === 'perfect' && <p className="hit-perfect">PERFECT HIT!</p>}
            <p className="fight-meta">
              対象魚: {targetFish.name}（{targetFish.rank}） / サイズ係数 {sizeMultiplier}
            </p>
            <p className="fight-meta">今回 +{earnedPoint}P / 累計 {totalPoint}P</p>
            <p className="fight-meta">
              レート {config.pointRateNumerator}:{config.pointRateDenominator} / 本日利用 {dailyUsedPoint}P / 残り {dailyRemain}P
            </p>
            <p className="fight-meta">参考換算: 1P={calcYen(1)}円（設定可変）</p>
            <p className="fight-meta">{exchangeMessage}</p>
            <div className="dashboard-grid">
              <p>本日交換件数: {todayOrderCount}</p>
              <p>累計消費P: {usedPointTotal}</p>
              <p>完了件数: {deliveredCount}</p>
              <p>キャンセル率: {cancelRate}%</p>
            </div>
            <div className="exchange-panel">
              <label htmlFor="exchange-category">カテゴリ</label>
              <div className="category-tabs" id="exchange-category">
                {exchangeCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={categoryFilter === cat ? 'active' : ''}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <label htmlFor="exchange-item">交換商品</label>
              <select
                id="exchange-item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                {filteredExchangeItems.map((item) => {
                  const stock = itemStockMap[item.id] ?? 0
                  return (
                    <option key={item.id} value={item.id}>
                      [{item.category}] {item.name} / {item.needPoint}P / 在庫{stock}
                    </option>
                  )
                })}
              </select>
              {filteredExchangeItems.length === 0 && <p className="fight-meta">該当カテゴリの商品がありません。</p>}
              <p className="fight-meta">
                選択中: [{selectedItem.category}] {selectedItem.name} / 必要 {selectedItem.needPoint}P / 在庫 {selectedStock} /{' '}
                {formatDomesticLabel(selectedItem.domesticOnly)}
              </p>
              {selectedItem.supportsProcessing && (
                <>
                  <label htmlFor="processing-type">加工指定</label>
                  <select
                    id="processing-type"
                    value={selectedProcessing}
                    onChange={(e) => setSelectedProcessing(e.target.value as ProcessingType)}
                  >
                    <option value="whole">丸</option>
                    <option value="saku">サク</option>
                    <option value="fillet">切り身</option>
                  </select>
                  <p className="fight-meta">加工: {processingLabel(selectedProcessing)}</p>
                </>
              )}
              <label htmlFor="shipping-prefecture">配送先（国内）</label>
              <select
                id="shipping-prefecture"
                value={shippingPrefecture}
                onChange={(e) => setShippingPrefecture(e.target.value as (typeof prefectures)[number])}
              >
                {prefectures.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                placeholder="郵便番号（7桁）"
                value={shippingPostalCode}
                onChange={(e) => setShippingPostalCode(e.target.value)}
              />
              <input
                type="text"
                placeholder="市区町村・番地（例: 愛南町城辺甲2420）"
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
              />
              {adminMode && (
                <>
                  <label htmlFor="admin-stock">管理: 在庫調整</label>
                  <div className="admin-actions" id="admin-stock">
                    <button type="button" onClick={() => handleAdminRestock(selectedItem.id, 1)}>
                      在庫+1
                    </button>
                    <button type="button" onClick={() => handleAdminRestock(selectedItem.id, -1)}>
                      在庫-1
                    </button>
                    <button type="button" onClick={handleAdminAdvanceAll}>
                      注文を一括進行
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="fight-actions">
              <button type="button" onClick={handleHook} disabled={status !== 'bite'}>
                フッキング
              </button>
              <button type="button" onClick={handleReelTap} disabled={status !== 'fight'}>
                リール連打
              </button>
              <button type="button" onClick={() => handleDirection('left')} disabled={status !== 'fight'}>
                左へ合わせる
              </button>
              <button type="button" onClick={() => handleDirection('right')} disabled={status !== 'fight'}>
                右へ合わせる
              </button>
              <button type="button" onClick={handleLandingTap} disabled={status !== 'landing'}>
                取り込み
              </button>
              <button type="button" className="subtle" onClick={resetSession}>
                リセット
              </button>
              <button type="button" className="subtle" onClick={handleOpenConfirm}>
                商品を交換（-{selectedItem.needPoint}P）
              </button>
            </div>
          </section>
        </div>
        </>
        )}

        {activePage === 'enhance' && (
          <section className="progress-card" aria-label="装備強化">
            <p className="progress-title">装備強化</p>
            <p className="fight-meta">釣具を育成して、釣り効率を高めよう。</p>
            <div className="enhance-grid">
              <article className="enhance-card">
                <p className="enhance-name">メインロッド</p>
                <p className="enhance-meta">Lv.5 to Lv.6</p>
                <p className="enhance-cost">費用: 150P</p>
                <button type="button" className="order-action" disabled={totalPoint < 150}>
                  強化する
                </button>
              </article>
              <article className="enhance-card">
                <p className="enhance-name">リール</p>
                <p className="enhance-meta">Lv.3 to Lv.4</p>
                <p className="enhance-cost">費用: 90P</p>
                <button type="button" className="order-action" disabled={totalPoint < 90}>
                  強化する
                </button>
              </article>
              <article className="enhance-card">
                <p className="enhance-name">ライン</p>
                <p className="enhance-meta">Lv.2 to Lv.3</p>
                <p className="enhance-cost">費用: 70P</p>
                <button type="button" className="order-action" disabled={totalPoint < 70}>
                  強化する
                </button>
              </article>
            </div>
          </section>
        )}

        {activePage === 'exchange' && (
          <section className="progress-card" aria-label="交換センター">
            <p className="progress-title">交換センター</p>
            <p className="progress-rate">主目的: 商品交換を完了する</p>
            <p className="fight-meta">所持 {totalPoint}P / 本日残り {dailyRemain}P</p>
            <section className="fight-card" aria-label="交換操作">
              <p className="fight-meta">{exchangeMessage}</p>
              <div className="exchange-panel">
                <label htmlFor="exchange-category">カテゴリ</label>
                <div className="category-tabs" id="exchange-category">
                  {exchangeCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={categoryFilter === cat ? 'active' : ''}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <label htmlFor="exchange-item">交換商品</label>
                <select id="exchange-item" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  {filteredExchangeItems.map((item) => {
                    const stock = itemStockMap[item.id] ?? 0
                    return (
                      <option key={item.id} value={item.id}>
                        [{item.category}] {item.name} / {item.needPoint}P / 在庫{stock}
                      </option>
                    )
                  })}
                </select>
                <p className="fight-meta">
                  選択中: [{selectedItem.category}] {selectedItem.name} / 必要 {selectedItem.needPoint}P / 在庫 {selectedStock}
                </p>
                {selectedItem.supportsProcessing && (
                  <>
                    <label htmlFor="processing-type">加工指定</label>
                    <select
                      id="processing-type"
                      value={selectedProcessing}
                      onChange={(e) => setSelectedProcessing(e.target.value as ProcessingType)}
                    >
                      <option value="whole">丸</option>
                      <option value="saku">サク</option>
                      <option value="fillet">切り身</option>
                    </select>
                  </>
                )}
                <label htmlFor="shipping-prefecture">配送先（国内）</label>
                <select
                  id="shipping-prefecture"
                  value={shippingPrefecture}
                  onChange={(e) => setShippingPrefecture(e.target.value as (typeof prefectures)[number])}
                >
                  {prefectures.map((pref) => (
                    <option key={pref} value={pref}>
                      {pref}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="郵便番号（7桁）"
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="市区町村・番地"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                />
              </div>
              <div className="fight-actions">
                <button type="button" className="subtle" onClick={handleOpenConfirm}>
                  商品を交換（-{selectedItem.needPoint}P）
                </button>
              </div>
            </section>
          </section>
        )}

        {activePage === 'orders' && (
          <>
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

        <section className="progress-card" aria-label="注文履歴">
          <p className="progress-title">交換注文の履歴（デモ）</p>
          <div className="status-filters">
            {orderStatusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={orderStatusFilter === filter ? 'active' : ''}
                onClick={() => setOrderStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <input
            className="order-search"
            type="text"
            placeholder="注文検索（注文ID / 商品名）"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
          />
          <div className="demo-actions">
            <button type="button" className="order-action order-action--danger" onClick={handleResetDemoData}>
              データ初期化
            </button>
          </div>
          {visibleOrders.length === 0 ? (
            <p className="progress-rate">まだ注文はありません。</p>
          ) : (
            <ul className="order-list">
              {visibleOrders.map((order) => (
                <li key={order.id} className="order-item">
                  <p className="order-main">
                    <span>{order.id}</span>
                    <span>{getStatusLabel(order.status)}</span>
                  </p>
                  <p className="order-sub">
                    {order.itemName} / -{order.usePoint}P / {order.createdAt}
                  </p>
                  <p className="order-sub">{order.shippingAddress}</p>
                  {order.processing && <p className="order-sub">加工指定: {processingLabel(order.processing)}</p>}
                  <button
                    type="button"
                    className="order-action"
                    onClick={() => handleAdvanceOrderStatus(order.id)}
                    disabled={order.status === 'delivered' || order.status === 'cancelled'}
                  >
                    ステータス進行
                  </button>
                  <button
                    type="button"
                    className="order-action order-action--danger"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={order.status !== 'reserved' && order.status !== 'preparing'}
                  >
                    キャンセル
                  </button>
                  {order.cancelledAt && <p className="order-sub">キャンセル日時: {order.cancelledAt}</p>}
                  <button
                    type="button"
                    className="order-action"
                    onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                  >
                    {expandedOrderId === order.id ? '詳細を閉じる' : '詳細を見る'}
                  </button>
                  {expandedOrderId === order.id && (
                    <div className="order-detail">
                      <p>ID: {order.id}</p>
                      <p>商品ID: {order.itemId}</p>
                      <p>状態: {getStatusLabel(order.status)}</p>
                      <p>配送先: {order.shippingAddress}</p>
                      <p>加工: {order.processing ? processingLabel(order.processing) : 'なし'}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        </>
        )}
      </main>

      <footer className="sg-footer" aria-label="フッターメニュー">
        <button type="button" className={activePage === 'home' ? 'active' : ''} onClick={() => setActivePage('home')}>
          ホーム
        </button>
        <button type="button" className={activePage === 'fishing' ? 'active' : ''} onClick={() => setActivePage('fishing')}>
          出撃
        </button>
        <button type="button" className={activePage === 'enhance' ? 'active' : ''} onClick={() => setActivePage('enhance')}>
          強化
        </button>
        <button type="button" className={activePage === 'exchange' ? 'active' : ''} onClick={() => setActivePage('exchange')}>
          ガチャ/交換
        </button>
        <button type="button" className={activePage === 'orders' ? 'active' : ''} onClick={() => setActivePage('orders')}>
          メニュー
        </button>
      </footer>
      {confirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <p className="progress-title">交換確認</p>
            <p className="fight-meta">商品: {selectedItem.name}</p>
            <p className="fight-meta">必要ポイント: {selectedItem.needPoint}P</p>
            <p className="fight-meta">配送先: {shippingPrefecture} / {shippingCity || '(未入力)'}</p>
            <div className="confirm-actions">
              <button type="button" onClick={executeDemoExchange}>
                交換を確定
              </button>
              <button type="button" className="subtle" onClick={closeConfirm}>
                戻る
              </button>
            </div>
          </div>
        </div>
      )}
      {townModal && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card town-card">
            <p className="progress-title">{townInfo[townModal].title}</p>
            <p className="fight-meta">{townInfo[townModal].desc}</p>
            <p className="fight-meta">収益: +50 / 費用: 5,000（デモ表現）</p>
            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setActivePage(townInfo[townModal].to)
                  setTownModal(null)
                }}
              >
                移動する
              </button>
              <button type="button" className="subtle" onClick={() => setTownModal(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      {gachaOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card gacha-card">
            <p className="progress-title">AINAN ガチャ</p>
            <p className="fight-meta">無料枠: {canFreeGacha ? '利用可能' : '本日利用済み'}</p>
            <div className="gacha-machine" aria-hidden="true">
              <div className={`gacha-core ${gachaRolling ? 'rolling' : ''}`} />
            </div>
            {gachaResult && (
              <p className={`gacha-result rarity-${gachaResult.rarity.toLowerCase()}`}>
                {gachaResult.rarity} / {gachaResult.name} / +{gachaResult.bonusPoint}P
              </p>
            )}
            <div className="confirm-actions">
              <button type="button" onClick={handleRollGacha} disabled={!canFreeGacha || gachaRolling}>
                {gachaRolling ? '抽選中…' : 'ガチャを引く'}
              </button>
              <button type="button" className="subtle" onClick={() => setGachaOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
