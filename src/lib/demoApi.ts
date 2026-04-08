export type OrderStatus = 'reserved' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
export type ProcessingType = 'whole' | 'saku' | 'fillet'

export type ExchangeItem = {
  id: string
  name: string
  category: '鮮魚' | '貝' | '柑橘' | '加工品'
  needPoint: number
  stock: number
  domesticOnly: boolean
  supportsProcessing: boolean
}

export type DemoOrder = {
  id: string
  itemId: string
  itemName: string
  usePoint: number
  status: OrderStatus
  createdAt: string
  processing?: ProcessingType
  shippingAddress: string
  cancelledAt?: string
}

export type ExchangeRequest = {
  item: ExchangeItem
  totalPoint: number
  dailyUsedPoint: number
  dailyLimit: number
  stock: number
  domesticOnlyConfig: boolean
  shippingPrefecture: string
  shippingPostalCode: string
  shippingCity: string
  selectedProcessing: ProcessingType
}

const canExchangeByConfig = (item: ExchangeItem, domesticOnlyConfig: boolean) =>
  !domesticOnlyConfig || item.domesticOnly

const createOrderId = (now: Date) =>
  `ORD-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`

export const validateExchangeRequest = (req: ExchangeRequest): string | null => {
  const normalizedPostal = req.shippingPostalCode.replace('-', '')
  const isPostalValid = /^\d{7}$/.test(normalizedPostal)
  const remainingDaily = req.dailyLimit - req.dailyUsedPoint

  if (!req.shippingPrefecture || !req.shippingCity.trim()) return '配送先を入力してください（都道府県・市区町村）'
  if (!isPostalValid) return '郵便番号は7桁で入力してください（例: 7984131）'
  if (!canExchangeByConfig(req.item, req.domesticOnlyConfig)) return '配送条件によりこの商品は交換できません。'
  if (req.stock <= 0) return '在庫切れのため交換できません。'
  if (req.totalPoint < req.item.needPoint) return `ポイント不足（必要 ${req.item.needPoint}P / 所持 ${req.totalPoint}P）`
  if (remainingDaily < req.item.needPoint) return `本日の利用上限を超えます（残り利用可能 ${remainingDaily}P）`
  return null
}

export const executeExchange = (req: ExchangeRequest) => {
  const now = new Date()
  const normalizedPostal = req.shippingPostalCode.replace('-', '')
  const order: DemoOrder = {
    id: createOrderId(now),
    itemId: req.item.id,
    itemName: req.item.name,
    usePoint: req.item.needPoint,
    status: 'reserved',
    createdAt: now.toLocaleString('ja-JP'),
    processing: req.item.supportsProcessing ? req.selectedProcessing : undefined,
    shippingAddress: `〒${normalizedPostal} ${req.shippingPrefecture}${req.shippingCity.trim()}`,
  }
  return order
}

export const advanceOrder = (order: DemoOrder): DemoOrder => {
  const nextStatus: Record<OrderStatus, OrderStatus> = {
    reserved: 'preparing',
    preparing: 'shipped',
    shipped: 'delivered',
    delivered: 'delivered',
    cancelled: 'cancelled',
  }
  return { ...order, status: nextStatus[order.status] }
}

export const cancelOrder = (order: DemoOrder): DemoOrder | null => {
  if (order.status !== 'reserved' && order.status !== 'preparing') return null
  return { ...order, status: 'cancelled', cancelledAt: new Date().toLocaleString('ja-JP') }
}

export const calcDashboard = (orders: DemoOrder[]) => {
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length
  const usedPointTotal = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.usePoint, 0)
  const todayOrderCount = orders.filter((o) => o.createdAt.startsWith(new Date().toLocaleDateString('ja-JP'))).length
  const cancelRate = orders.length === 0 ? 0 : Math.round((cancelledCount / orders.length) * 100)
  return { deliveredCount, cancelledCount, usedPointTotal, todayOrderCount, cancelRate }
}
