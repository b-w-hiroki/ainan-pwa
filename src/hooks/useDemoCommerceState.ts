import { useEffect, useState } from 'react'
import {
  type DemoOrder,
  type ExchangeItem,
  type ProcessingType,
  calcDashboard,
  type ExchangeRequest,
} from '../lib/demoApi'
import { apiClient } from '../api/client'

const STORAGE_KEY = 'ainan-demo-v1'

export const useDemoCommerceState = (params: {
  safeFirstItemId: string
  initialStockMap: Record<string, number>
  defaultPrefecture: string
  exchangeItems: ExchangeItem[]
  dailyLimit: number
}) => {
  const { safeFirstItemId, initialStockMap, defaultPrefecture, exchangeItems, dailyLimit } = params

  const [totalPoint, setTotalPoint] = useState(0)
  const [dailyUsedPoint, setDailyUsedPoint] = useState(0)
  const [dailyUseDateKey, setDailyUseDateKey] = useState(new Date().toDateString())
  const [exchangeMessage, setExchangeMessage] = useState('交換はまだ行っていません。')
  const [selectedItemId, setSelectedItemId] = useState(safeFirstItemId)
  const [selectedProcessing, setSelectedProcessing] = useState<ProcessingType>('whole')
  const [categoryFilter, setCategoryFilter] = useState<'すべて' | '鮮魚' | '貝' | '柑橘' | '加工品'>('すべて')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'すべて' | '進行中' | '完了' | 'キャンセル'>('すべて')
  const [adminMode, setAdminMode] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [itemStockMap, setItemStockMap] = useState<Record<string, number>>(initialStockMap)
  const [shippingPrefecture, setShippingPrefecture] = useState(defaultPrefecture)
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [orders, setOrders] = useState<DemoOrder[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as {
        totalPoint?: number
        dailyUsedPoint?: number
        dailyUseDateKey?: string
        itemStockMap?: Record<string, number>
        orders?: DemoOrder[]
      }
      if (typeof saved.totalPoint === 'number') setTotalPoint(saved.totalPoint)
      if (typeof saved.dailyUsedPoint === 'number') setDailyUsedPoint(saved.dailyUsedPoint)
      if (typeof saved.dailyUseDateKey === 'string') setDailyUseDateKey(saved.dailyUseDateKey)
      if (saved.itemStockMap && typeof saved.itemStockMap === 'object') setItemStockMap(saved.itemStockMap)
      if (Array.isArray(saved.orders)) setOrders(saved.orders.slice(0, 20))
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    const payload = {
      totalPoint,
      dailyUsedPoint,
      dailyUseDateKey,
      itemStockMap,
      orders,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [totalPoint, dailyUsedPoint, dailyUseDateKey, itemStockMap, orders])

  const resetAllDemoData = () => {
    setTotalPoint(0)
    setDailyUsedPoint(0)
    setDailyUseDateKey(new Date().toDateString())
    setItemStockMap(initialStockMap)
    setOrders([])
    setOrderSearch('')
    setOrderStatusFilter('すべて')
    setExchangeMessage('デモデータを初期化しました。')
    window.localStorage.removeItem(STORAGE_KEY)
  }

  const selectedItem = exchangeItems.find((item) => item.id === selectedItemId) ?? exchangeItems[0]
  const selectedStock = selectedItem ? itemStockMap[selectedItem.id] ?? 0 : 0
  const filteredExchangeItems = exchangeItems.filter((item) =>
    categoryFilter === 'すべて' ? true : item.category === categoryFilter,
  )

  const normalizedSearch = orderSearch.trim().toLowerCase()
  const visibleOrders = orders.filter((order) => {
    const statusMatched =
      orderStatusFilter === 'すべて'
        ? true
        : orderStatusFilter === '進行中'
        ? order.status === 'reserved' || order.status === 'preparing' || order.status === 'shipped'
        : orderStatusFilter === '完了'
        ? order.status === 'delivered'
        : order.status === 'cancelled'
    if (!statusMatched) return false
    if (!normalizedSearch) return true
    return order.id.toLowerCase().includes(normalizedSearch) || order.itemName.toLowerCase().includes(normalizedSearch)
  })

  const dashboard = calcDashboard(orders)
  const dailyRemain = Math.max(0, dailyLimit - dailyUsedPoint)

  const openConfirm = () => setConfirmOpen(true)
  const closeConfirm = () => setConfirmOpen(false)

  const executeExchangeFlow = async (params: {
    item: ExchangeItem
    dailyLimit: number
    domesticOnlyConfig: boolean
  }) => {
    const { item, dailyLimit, domesticOnlyConfig } = params
    const stock = itemStockMap[item.id] ?? 0
    const req: ExchangeRequest = {
      item,
      totalPoint,
      dailyUsedPoint,
      dailyLimit,
      stock,
      domesticOnlyConfig,
      shippingPrefecture,
      shippingPostalCode,
      shippingCity,
      selectedProcessing,
    }
    const validation = await apiClient.validateExchange(req)
    if (!validation.ok) {
      setExchangeMessage(validation.message)
      return
    }
    const order = await apiClient.createExchangeOrder(req)
    setTotalPoint((p) => p - item.needPoint)
    setDailyUsedPoint((p) => p + item.needPoint)
    setItemStockMap((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1) }))
    setOrders((prev) => [order, ...prev].slice(0, 8))
    setExchangeMessage(`${item.name} の交換予約を受け付けました（-${item.needPoint}P）`)
    setConfirmOpen(false)
  }

  const advanceOrderStatus = async (id: string) => {
    const current = orders.find((order) => order.id === id)
    if (!current) return
    const next = await apiClient.advanceOrderStatus(current)
    setOrders((prev) => prev.map((order) => (order.id === id ? next : order)))
  }

  const cancelOrderById = async (id: string) => {
    const current = orders.find((order) => order.id === id)
    if (!current) return
    const target = await apiClient.cancelOrder(current)
    if (!target) {
      setExchangeMessage('この注文はキャンセルできません。')
      return
    }
    setOrders((prev) => prev.map((order) => (order.id === id ? target : order)))
    setTotalPoint((p) => p + target.usePoint)
    setDailyUsedPoint((p) => Math.max(0, p - target.usePoint))
    setItemStockMap((prev) => ({ ...prev, [target.itemId]: (prev[target.itemId] ?? 0) + 1 }))
    setExchangeMessage(`注文 ${target.id} をキャンセルしました（${target.usePoint}P返却）。`)
  }

  const adminRestock = (item: ExchangeItem, amount: number) => {
    if (!adminMode) return
    setItemStockMap((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 0) + amount) }))
    setExchangeMessage(`管理: ${item.name} の在庫を ${amount > 0 ? '+' : ''}${amount} しました。`)
  }

  const adminAdvanceAll = async () => {
    if (!adminMode) return
    const nextOrders = await Promise.all(orders.map((order) => apiClient.advanceOrderStatus(order)))
    setOrders(nextOrders)
    setExchangeMessage('管理: 注文ステータスを一括で1段階進めました。')
  }

  return {
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
    setConfirmOpen,
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
    setOrders,
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
  }
}
